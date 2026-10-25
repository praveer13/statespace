// The reference pieces of `statespace trace validate` that W0-S13 tested (docs/spikes/W0-S13.md),
// for W5-T14 to port to bench/statespace/trace.py. Dependency-free; record.mjs uses them.
//
//   lintTrace(bytes)        checks the NDJSON before TLC reads it, and names the line of a problem
//   cfgText(opts)           writes the TLC config for one trace (the log's path is a constant)
//   parseTlc(stdout)        reads the verdict line TraceValidation.tla prints, and TLC's statistics
//   tlcProblem(stdout)      the message to quote when TLC stops without a verdict line
//   toolLine(path, ...)     the line the command prints for one trace

/** The event every complete log ends with (TraceValidation.tla, EndRecord). */
export const END_EVENT = 'End';

/**
 * Lint an NDJSON trace: every line one JSON object with a string `event`, no blank line inside the file.
 * Returns { lines, endRecord, problems: [{ line, message }] } with 1-based line numbers.
 */
export function lintTrace(bytes) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const rows = text.split('\n');
  if (rows.length > 0 && rows[rows.length - 1] === '') rows.pop(); // the newline that ends the last line
  const problems = [];
  let last = null;
  rows.forEach((row, i) => {
    const line = i + 1;
    if (row.trim() === '') {
      problems.push({ line, message: 'blank line' });
      return;
    }
    let value;
    try {
      value = JSON.parse(row);
    } catch (e) {
      problems.push({ line, message: `not JSON (${e.message})` });
      return;
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      problems.push({ line, message: 'not a JSON object' });
      return;
    }
    if (typeof value.event !== 'string') problems.push({ line, message: 'no string field "event"' });
    if (line === rows.length) last = value;
  });
  return { lines: rows.length, endRecord: last?.event === END_EVENT, problems };
}

/**
 * The TLC config for one trace. mode: 'verdict' (the method), 'witness' (the invariant whose violation
 * is a matching behavior) or 'possible' (TLC's _POSSIBLE check). deadlock: true keeps TLC's deadlock check.
 */
export function cfgText({ constants, traceFile, mode = 'verdict', deadlock = false }) {
  const lines = [`CONSTANTS ${constants}  TraceFile = ${JSON.stringify(traceFile)}`, 'SPECIFICATION TraceSpec'];
  if (mode === 'verdict') lines.push('CONSTRAINT TraceReach', 'POSTCONDITION TraceVerdict');
  else if (mode === 'witness') lines.push('INVARIANT TraceUnconsumed');
  else if (mode === 'possible') lines.push('_POSSIBLE TraceConsumed');
  else throw new Error(`unknown mode ${mode}`);
  if (!deadlock) lines.push('CHECK_DEADLOCK FALSE');
  return lines.join('\n') + '\n';
}

const FIELD = /(\w+) \|-> ("(?:[^"\\]|\\.)*"|TRUE|FALSE|-?\d+)/g;
const scalar = (v) => (v === 'TRUE' ? true : v === 'FALSE' ? false : v.startsWith('"') ? JSON.parse(v) : Number(v));

/** SANY's and TLC's way of naming a place in a module. */
const LOCATION = /^line \d+, col \d+ to line \d+, col \d+ of module \S+$/;

/**
 * The message to quote when TLC stops without a verdict line. For a syntax or semantic error TLC's first
 * `Error:` line is "Parsing or semantic analysis failed.", and for an exception it is "TLC threw an
 * unexpected exception."; neither names the cause, so the message comes from the lines around it:
 *   a syntax error      SANY's `Encountered ...` line, and the module it could not parse
 *   a semantic error    SANY's first message, with its location when it has one (a missing module has none)
 *   an exception        its message, up to TLC's next `Error:` line, with its location; for a Java override
 *                       (the JSON reader), the error the override produced
 *   anything else       TLC's first `Error:` line, joined to the next line when it ends with a colon
 */
export function tlcProblem(stdout) {
  const rows = stdout.split('\n').map((r) => r.trimEnd());
  const find = (re, from = 0) => rows.findIndex((r, i) => i >= from && re.test(r));
  const nextText = (i) => find(/\S/, i + 1);
  const located = (message, where) => (where && LOCATION.test(where) ? `${message} (${where})` : message);

  if (find(/^Error: Parsing or semantic analysis failed\.$/) >= 0) {
    const parse = find(/^\*\*\*Parse Error\*\*\*$/);
    const encountered = parse >= 0 ? find(/^Encountered /, parse) : -1;
    if (encountered >= 0) {
      const module = stdout.match(/^Could not parse module (\S+) from file /m)?.[1];
      return module ? `${rows[encountered]} (module ${module})` : rows[encountered];
    }
    // "*** Errors: n" or "*** Abort messages: n", then a location, "In module M" or "Unknown location",
    // then the first message.
    const header = find(/^\*\*\* (Errors|Abort messages): \d+$/);
    const where = header >= 0 ? nextText(header) : -1;
    const message = where >= 0 ? nextText(where) : -1;
    if (message >= 0) return located(rows[message], rows[where]);
  }
  const exception = find(/^The exception was a /);
  if (exception >= 0 && rows[exception + 1]?.startsWith(': ')) {
    const block = [];
    for (let i = exception + 1; i < rows.length && rows[i] !== '' && !rows[i].startsWith('Error: '); i++) block.push(rows[i]);
    const produced = block.indexOf('but it produced the following error:');
    if (produced >= 0 && block[produced + 1]) return block[produced + 1];
    block[0] = block[0].slice(2);
    const where = block.length > 1 && LOCATION.test(block[block.length - 1]) ? block.pop() : null;
    return located(block.join(' '), where);
  }
  const first = find(/^Error: /);
  if (first < 0) return 'TLC printed no verdict';
  const message = rows[first].slice('Error: '.length);
  return message.endsWith(':') && rows[first + 1] ? `${message} ${rows[first + 1]}` : message;
}

/** Read TLC's stdout: the trace-validation verdict (or null), statistics, the queue, errors. */
export function parseTlc(stdout) {
  const verdictRow = stdout.match(/^<<"trace-validation", \[(.*)\]>>$/m);
  let verdict = null;
  if (verdictRow) {
    verdict = {};
    for (const m of verdictRow[1].matchAll(FIELD)) verdict[m[1]] = scalar(m[2]);
  }
  const stats = stdout.match(/^(\d+) states? generated, (\d+) distinct states? found, (\d+) states? left on queue\./m);
  const depth = stdout.match(/^The depth of the complete state graph search is (\d+)\./m);
  const queue = stdout.match(/^Running .*, (\w+)\)\.$/m); // the banner ends with the state queue's class
  return {
    banner: stdout.split('\n').find((l) => l.startsWith('TLC2 Version ')) ?? null,
    verdict,
    generated: stats ? Number(stats[1]) : null,
    distinct: stats ? Number(stats[2]) : null,
    leftOnQueue: stats ? Number(stats[3]) : null,
    depth: depth ? Number(depth[1]) : null,
    queue: queue ? queue[1] : null,
    finished: stdout.match(/^Finished in (\S+) at/m)?.[1] ?? null,
    noError: /^Model checking completed\. No error has been found\.$/m.test(stdout),
    errors: stdout.split('\n').filter((l) => l.startsWith('Error: ')),
    problem: verdict ? null : tlcProblem(stdout),
  };
}

/**
 * The line `statespace trace validate` prints for one trace: a lint problem, TLC's verdict, or TLC
 * stopping without one (quoting tlcProblem). rawLines are the trace's lines, so a rejection quotes the
 * line it names.
 */
export function toolLine(path, lint, parsed, rawLines) {
  if (lint.problems.length > 0) {
    const p = lint.problems[0];
    return `trace ${path}: error at line ${p.line}: ${p.message}`;
  }
  const v = parsed?.verdict;
  if (!v) return `trace ${path}: error: ${parsed?.problem ?? 'TLC printed no verdict'}`;
  if (v.verdict === 'accepted') return `trace ${path}: accepted (${v.matched} of ${v.lines} lines)`;
  if (v.verdict === 'rejected') {
    const range = v.matched > 0 ? `lines 1-${v.matched} match` : 'no line matches';
    return `trace ${path}: rejected at line ${v.first_unmatched} of ${v.lines}: ${rawLines[v.first_unmatched - 1]} (${range})`;
  }
  return `trace ${path}: partial (${v.matched} of ${v.lines} lines conform; no ${END_EVENT} record, so the log may be cut short)`;
}
