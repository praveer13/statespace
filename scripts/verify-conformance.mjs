#!/usr/bin/env node
// GATE-conformance (spine section 11.2; ARCHITECTURE.md sections 13.2 to 13.4; W1-T42). Nightly.
//
// A second semantics agrees with the engine it stands in for: the engine pairs of ARCHITECTURE.md section 13.3, one row
// each. A bump of any tool waits until its pair is green. A red night marks the claims this gate backs "unverified
// since <date>" (content/assurance/gate-claims.json: GATE-conformance backs SEAM-13, whose Tested-by cell names the
// pocket-checker differential).
//
//   node scripts/verify-conformance.mjs                the nightly lane: every pair whose script exists
//   node scripts/verify-conformance.mjs --list         the pairs, what each compares, and whether its script exists
//   node scripts/verify-conformance.mjs --only a,b     run only these pairs (ids from --list)
//   node scripts/verify-conformance.mjs --require a,b  a pair named here fails the gate while it is absent (default: none;
//                                                      an absent pair is reported with the task that builds it, never counted as a pass)
//   node scripts/verify-conformance.mjs --require-all  every pair must exist: what a release asks of the nightly (GATE-release, W5-T09)
//   node scripts/verify-conformance.mjs --json         print the report as JSON
//   node scripts/verify-conformance.mjs --root DIR     check the tree under DIR (the fixtures use this)
//   node scripts/verify-conformance.mjs --self-check   plant faults; the gate must fail on each and pass the controls
//
// Rows. The first is built in and runs now: Pyodide Z3 = native Z3 on the same queries (the recipient wrap included),
// scripts/spikes/W1-T42/lib/z3-corpus.mjs. Every other row is a pair script, scripts/conformance/<pair>.mjs, which the
// task named in the table builds; creating the script at that path puts the row in the gate (no edit here), the way a
// gate script joins its lane. The protocol, so that a script and the runner agree:
//
//   node scripts/conformance/<pair>.mjs --json      run from the root of the tree, with the environment of the gate
//   stdout   one JSON object: { "pair": "<id>", "ok": true|false, "compared": n, "equal": n,
//            "differences": [ { "fixture": "...", "expected": "...", "got": "...", "detail": "..." } ], "notes": ["..."] }
//            (a script that ignores --json and prints text is judged by its exit status and its last line)
//   exit     0 the pair holds, 1 it differs, 2 it could not run (a tool is missing): the gate then exits 2, never 0
//
// Equality (section 13.3) is the pair's own: verdicts exact and witnesses never compared by value for Z3; verdict and
// distinct-state count for Spectacle = TLC; rows, row counts, SQLSTATE, message and detail for PGlite = PostgreSQL.
//
// Findings (the gate exits 1): a verdict, reason or witness that differs or fails its property, a query an engine did
// not answer, an engine at another version than its pin, an authored answer that no engine reproduces, a pair script
// that exits 1 or whose report disagrees with its exit status, a required pair that is absent, and a bad claims map
// (scripts/spikes/W1-T42/lib/gate-claims.mjs). Exit 2: an engine or a pair script could not run.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EngineUnavailable, REPO, createEngines } from './spikes/W1-T42/lib/engines.mjs';
import { loadGateClaims } from './spikes/W1-T42/lib/gate-claims.mjs';
import { compareZ3Pair } from './spikes/W1-T42/lib/pair.mjs';
import { QUERIES, programFor } from './spikes/W1-T42/lib/z3-corpus.mjs';

const GATE = 'GATE-conformance';
const SCRIPT = fileURLToPath(import.meta.url);

/**
 * The pairs of ARCHITECTURE.md section 13.3, and the one row of spine 11.2 that section lists apart. `script` is the pair
 * script's path under the root; `builtin` marks the row that runs here. `builtBy` is the task that builds the pair.
 */
export const PAIRS = Object.freeze([
  {
    id: 'z3-same-query',
    label: 'Pyodide Z3 = native Z3, on the same queries (the recipient wrap included)',
    compared: 'verdict per query; the reason of an unknown; witness validity by property',
    fixtures: "the recorded S1 specimens' queries (scripts/spikes/W1-T42/lib/z3-corpus.mjs)",
    equality: 'verdicts exact; witnesses never compared by value [X RUN-z3-bv64-pyodide]',
    builtin: true,
    builtBy: 'W1-T42',
  },
  {
    id: 'z3-pyodide-native',
    label: 'Pyodide Z3 = native Z3, on every authored cell and generator template',
    compared: 'verdict per authored call; witness validity by property',
    fixtures: 'every authored Z3 cell and generator template',
    equality: 'verdicts exact; witnesses never compared by value',
    script: 'scripts/conformance/z3-pyodide-native.mjs',
    builtBy: 'W1-T37',
  },
  {
    id: 'pocket-z3',
    label: 'Pocket checkers = Z3',
    compared: "the predicate's verdict on random witnesses",
    fixtures: 'property tests per pocket predicate',
    equality: 'exact',
    script: 'scripts/conformance/pocket-z3.mjs',
    builtBy: 'W1-T19',
  },
  {
    id: 'spectacle-tlc',
    label: 'Spectacle = TLC',
    compared: 'verdict and distinct-state count per authored spec (TLC with -workers 1 and an explicit deadlock flag)',
    fixtures: 'every authored spec',
    equality: 'exact; the double-spend family is already recorded [X RUN-spectacle, RUN-tlc-full]',
    script: 'scripts/conformance/spectacle-tlc.mjs',
    builtBy: 'W3-T08',
  },
  {
    id: 'lasso-tlc',
    label: 'Lasso validator = TLC',
    compared: 'lasso accepted or rejected',
    fixtures: 'TLC liveness fixtures',
    equality: 'exact',
    script: 'scripts/conformance/lasso-tlc.mjs',
    builtBy: 'W3-T09',
  },
  {
    id: 'pglite-pg',
    label: 'PGlite = PostgreSQL 18.6',
    compared: 'rows, row counts, SQLSTATE, message and detail per statement',
    fixtures: 'single-session specimens and the RLS specimens',
    equality: 'exact, with RESET SESSION AUTHORIZATION the one documented difference [X RUN-pglite-rls]',
    script: 'scripts/conformance/pglite-pg.mjs',
    builtBy: 'W4-T04',
  },
  {
    id: 'datalog-souffle',
    label: 'Tab Datalog = Soufflé',
    compared: 'computed relations and derivation heights',
    fixtures: 'the S7 fixtures',
    equality: 'equal relations and heights [X RUN-fixedpoint-equal]',
    script: 'scripts/conformance/datalog-souffle.mjs',
    builtBy: 'W4-T07',
  },
  {
    id: 'provider-tlc',
    label: "The Clearinghouse provider simulator's traces validate against S8's reference spec, with TLC",
    compared: 'each trace accepted or rejected by TLC trace validation',
    fixtures: "the simulator's seeded NDJSON traces",
    equality: 'exact',
    script: 'scripts/conformance/provider-tlc.mjs',
    builtBy: 'W5-T35',
  },
]);

// ------------------------------------------------------------------ running a row
/** Paths of this machine never enter the output: the tree is <repo>, the engine cache <cache>. */
const scrubber = (root, cacheDir) => (text) => {
  let t = String(text);
  for (const [from, to] of [[cacheDir, '<cache>'], [root, '<repo>'], [REPO, '<repo>']]) if (from && from.length > 1) t = t.split(from).join(to);
  return t.replace(/(?<![\w.~-])\/(?:home|Users)\/[A-Za-z0-9._-]+/g, '<home>').replace(/(?<![\w.~-])\/tmp\/claude-[\w.-]*/g, '<tmp>');
};

/** The built-in row: the corpus on both engines, compared. Throws EngineUnavailable when an engine cannot be set up. */
async function runZ3SameQuery({ engines, queries = QUERIES }) {
  const program = programFor(queries);
  const outcomes = {};
  for (const id of ['native', 'pyodide']) {
    const engine = await engines[id]();
    const run = await engine.run({ source: program, timeoutS: 300 });
    outcomes[id] = { id, describe: engine.describe, probe: engine.probe, run };
  }
  const cmp = compareZ3Pair({ queries, native: outcomes.native, pyodide: outcomes.pyodide });
  return { ...cmp, engines: [outcomes.native.describe, outcomes.pyodide.describe], seconds: (outcomes.native.run.durationMs + outcomes.pyodide.run.durationMs) / 1000 };
}

function runScript(abs, root, env, timeoutS) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let child;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child?.kill('SIGKILL');
      }
    }, timeoutS * 1000);
    try {
      child = spawn(process.execPath, [abs, '--json'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    } catch (e) {
      clearTimeout(timer);
      resolve({ exitCode: null, timedOut, stdout, stderr: String(e.message), durationMs: 0 });
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (s) => (stdout += s));
    child.stderr.on('data', (s) => (stderr += s));
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ exitCode: null, timedOut, stdout, stderr: `${stderr}${e.message}`, durationMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, timedOut, stdout, stderr, durationMs: Date.now() - started });
    });
  });
}

/** What a pair script printed and exited with, as one answer. */
export function judgeScript(pair, r) {
  const lastLine = (t) => String(t).trim().split('\n').filter(Boolean).at(-1) ?? '';
  let report = null;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    /* a script that prints text is judged by its exit status */
  }
  const base = { report, seconds: r.durationMs / 1000 };
  if (r.timedOut) return { ...base, state: 'error', detail: 'it did not finish within its time limit' };
  if (r.exitCode === null) return { ...base, state: 'error', detail: `it did not start: ${lastLine(r.stderr)}` };
  if (r.exitCode === 0 || r.exitCode === 1) {
    if (report && typeof report.ok === 'boolean' && report.ok !== (r.exitCode === 0)) return { ...base, state: 'differs', detail: `its report says ok = ${report.ok} but it exited ${r.exitCode}: a pair that cannot agree with itself does not hold` };
    const held = r.exitCode === 0;
    const diffs = Array.isArray(report?.differences) ? report.differences : [];
    const detail = held
      ? report && Number.isFinite(report.compared) ? `${report.equal ?? report.compared} of ${report.compared} equal` : lastLine(r.stdout) || 'exit 0'
      : diffs.length > 0 ? `${diffs.length} difference${diffs.length === 1 ? '' : 's'}; the first: ${JSON.stringify(diffs[0]).slice(0, 240)}` : lastLine(r.stdout) || lastLine(r.stderr) || 'exit 1';
    return { ...base, state: held ? 'held' : 'differs', detail, differences: diffs };
  }
  return { ...base, state: 'error', detail: `it exited ${r.exitCode}: ${lastLine(r.stderr) || lastLine(r.stdout) || 'no message'}` };
}

/**
 * The gate. `deps` replaces the engines, the output and the environment (tests and the self-check).
 * @returns {Promise<number>} the exit status
 */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const say = (s) => (deps.out ?? ((x) => process.stdout.write(`${x}\n`)))(s);
  const opts = { flags: new Set(), values: {} };
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (['--list', '--json', '--self-check', '--help', '-h', '--require-all'].includes(a)) opts.flags.add(a === '-h' ? '--help' : a);
      else if (['--only', '--require', '--root', '--timeout-s'].includes(a)) {
        if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
        opts.values[a] = argv[++i];
      } else throw new Error(`unknown argument ${a}`);
    }
  } catch (e) {
    process.stderr.write(`${GATE}: ${e.message}\n`);
    return 2;
  }
  if (opts.flags.has('--help')) {
    for (const l of fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1)) {
      if (!l.startsWith('//')) break;
      say(l.replace(/^\/\/ ?/, ''));
    }
    return 0;
  }
  if (opts.flags.has('--self-check')) {
    const { selfCheckConformance } = await import(pathToFileURL(path.join(path.dirname(SCRIPT), 'spikes', 'W1-T42', 'lib', 'self-check.mjs')).href);
    return selfCheckConformance({ say });
  }

  const started = Date.now();
  const root = path.resolve(opts.values['--root'] ?? REPO);
  const asJson = opts.flags.has('--json');
  const timeoutS = Number(opts.values['--timeout-s'] ?? 1500);
  const csv = (name) => (opts.values[name] ? opts.values[name].split(',').map((s) => s.trim()).filter(Boolean) : []);
  const only = csv('--only');
  const required = new Set(opts.flags.has('--require-all') ? PAIRS.map((p) => p.id) : csv('--require'));
  const known = new Set(PAIRS.map((p) => p.id));
  const bad = [...only, ...csv('--require')].filter((id) => !known.has(id));
  if (bad.length > 0) {
    process.stderr.write(`${GATE}: no such pair: ${bad.join(', ')} (see --list)\n`);
    return 2;
  }
  const rows = PAIRS.filter((p) => only.length === 0 || only.includes(p.id)).map((p) => ({ ...p, present: p.builtin || fs.existsSync(path.join(root, p.script)) }));

  if (opts.flags.has('--list')) {
    for (const p of rows) say(`${p.present ? 'present' : 'absent '}  ${p.id.padEnd(18)} ${p.label}  [${p.builtin ? 'built in' : p.script}${p.present ? '' : `; built by ${p.builtBy}`}]`);
    return 0;
  }

  const engines = deps.engines ?? createEngines({ env });
  const scrub = scrubber(root, engines.cacheDir);
  const findings = [];
  const fail = (check, where, detail) => findings.push({ check, where, detail: scrub(detail) });
  const claims = loadGateClaims(root);
  for (const p of claims.problems) fail('claims', claims.file, p);

  if (!asJson) say(GATE);
  const results = [];
  let errored = 0;
  for (const p of rows) {
    if (!p.present) {
      results.push({ id: p.id, label: p.label, state: 'absent', builtBy: p.builtBy, detail: `${p.script} does not exist yet (built by ${p.builtBy})` });
      if (required.has(p.id)) fail('required', p.id, `${p.script} does not exist, and this run requires the pair (built by ${p.builtBy})`);
      continue;
    }
    if (p.builtin) {
      try {
        const r = await runZ3SameQuery({ engines, queries: deps.queries });
        results.push({ id: p.id, label: p.label, state: r.findings.length === 0 ? 'held' : 'differs', compared: r.compared, equal: r.equal, rows: r.rows, engines: r.engines.map(scrub), witnessesEqual: r.witnessesEqual, seconds: r.seconds, detail: `${r.equal} of ${r.compared} queries equal` });
        for (const f of r.findings) fail(f.check, `${p.id} ${f.where}`, f.detail);
      } catch (e) {
        if (!(e instanceof EngineUnavailable)) throw e;
        errored += 1;
        results.push({ id: p.id, label: p.label, state: 'error', detail: scrub(e.message) });
      }
      continue;
    }
    const r = judgeScript(p, await runScript(path.join(root, p.script), root, env, timeoutS));
    results.push({ id: p.id, label: p.label, state: r.state, script: p.script, detail: scrub(r.detail), seconds: r.seconds, differences: r.differences });
    if (r.state === 'differs') fail('pair', p.id, `${p.script}: ${r.detail}`);
    else if (r.state === 'error') errored += 1;
  }

  const count = (state) => results.filter((r) => r.state === state).length;
  const compared = results.filter((r) => r.state === 'held' || r.state === 'differs').reduce((n, r) => n + (r.compared ?? 0), 0);
  const seconds = Number(((Date.now() - started) / 1000).toFixed(1));
  const ok = findings.length === 0 && errored === 0;
  const exit = findings.length > 0 ? 1 : errored > 0 ? 2 : 0;

  if (asJson) {
    say(JSON.stringify({ gate: GATE, result: ok ? 'pass' : 'fail', seconds, claims: claims.map?.[GATE] ?? [], pairs: results, findings }, null, 2));
    return exit;
  }
  for (const r of results) {
    const mark = { held: 'held', differs: 'DIFFERS', error: 'ERROR', absent: 'absent' }[r.state];
    say(`  ${mark.padEnd(8)} ${r.id.padEnd(18)} ${r.label}`);
    if (r.state === 'held' || r.state === 'differs') say(`           ${r.detail}${Number.isFinite(r.seconds) ? ` (${r.seconds.toFixed(1)} s)` : ''}`);
    if (r.state === 'error') say(`           ${r.detail}`);
    for (const e of r.engines ?? []) say(`           ${e}`);
    if (r.rows) {
      const w = Math.max(...r.rows.map((x) => x.id.length));
      say(`           ${'query'.padEnd(w)}  ${'specimen'.padEnd(8)} ${'native'.padEnd(8)} ${'pyodide'.padEnd(8)} witness`);
      for (const x of r.rows) say(`           ${x.id.padEnd(w)}  ${(x.specimen || '-').padEnd(8)} ${String(x.native).padEnd(8)} ${String(x.pyodide).padEnd(8)} ${x.ok ? (x.witness ?? (x.reason ? `reason: ${x.reason}` : '-')) : 'FAILS (see below)'}`);
    }
  }
  say(`  claims   ${GATE} backs ${(claims.map?.[GATE] ?? []).join(', ') || 'no course claim'} (${claims.file}): a red night marks ${(claims.map?.[GATE] ?? []).length === 1 ? 'it' : 'them'} unverified since the date it turned red`);
  for (const f of findings) say(`  FAIL     ${f.check}  ${f.where}: ${f.detail}`);
  const absent = results.filter((r) => r.state === 'absent');
  if (absent.length > 0) say(`  absent   not built yet (${absent.length}): ${absent.map((r) => `${r.id} (${r.builtBy})`).join(', ')}`);
  const tail = `${count('held')} pair${count('held') === 1 ? '' : 's'} held${compared > 0 ? `, ${compared} comparisons` : ''}, ${count('differs')} differ${count('differs') === 1 ? 's' : ''}${errored > 0 ? `, ${errored} could not run` : ''}; ${absent.length} not built yet; ${seconds} s`;
  if (ok) say(`${GATE}: PASS (${tail})`);
  else say(`${GATE}: ${exit === 2 ? 'ERROR' : 'FAIL'} (${findings.length > 0 ? `${findings.length} finding${findings.length === 1 ? '' : 's'}; ` : ''}${tail})`);
  return exit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  // `| head` closes the pipe early: that is not a failure of the gate.
  process.stdout.on('error', (e) => {
    if (e.code === 'EPIPE') process.exit(process.exitCode ?? 0);
    throw e;
  });
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      process.stderr.write(`${GATE}: ${e instanceof Error ? e.stack : e}\n`);
      process.exitCode = 2;
    },
  );
}
