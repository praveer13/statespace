#!/usr/bin/env node
// GATE-calls (spine section 11.2; ARCHITECTURE.md section 13.2; V2-12; W1-T37). Fast lane; Lean calls in the nightly lane.
//
// Every authored Call It answer reproduces on its engine. For a Z3 cell (INS-z3) that is two engines, native Z3 and
// Pyodide's Z3 under Node (the tab's engine), both z3 5.3.1, running the cell's own code in a fresh namespace and a
// fresh context; and a second solver, the Bench's cvc5 1.4.2 pinned by RUN-scaffold, on every unsat the cell shows.
// For every authored cell, lessons and drawers alike, with or without a call:
//   run          the cell runs to its end on both engines (no exception, no watchdog, no crash), and every check it
//                makes is recorded
//   divergence   native = Pyodide: the same checks, the same verdicts, the same reasons for unknown, the same optima;
//                a model's values are never compared, because they are not canonical
//   witness      every sat model satisfies its query: on each engine no assertion that Z3's own evaluation finds
//                false, or that a fresh solver finds false under the model where the evaluation leaves a quantifier
//                unreduced; cvc5 does not refute the query with that model's values asserted (an SMT-LIB check, which
//                shows no model: cvc5 does not find its query unsatisfiable); and an assertion Z3 cannot settle under
//                the model, cvc5 settles
//   cvc5         every unsat both engines agree on is unsat on cvc5 too, its one verdict with no error line: a sat, an
//                unknown, an error or a timeout fails (an SMT-LIB check: on its own query, the commands Z3 ran without
//                an error before it, since cvc5 stops at a parse error where Z3 goes on)
//   cell-code    a Z3 cell's code is python or smt2, so that it can be reproduced at all
//   page         every page can be read in full: front matter, and no two cells with one number
// and for every cell with a call:
//   key          the call's first solver check gives what the key option claims: a verdict (`sat`, `unsat`, `unknown`,
//                or proved, holds, counterexample, no verdict, read as GATE-items reads them) or a value (the optimum
//                of the cell's one Optimize objective, which cvc5 confirms: nothing beyond it, and it attained)
//   key-read, value-query, no-check, cell-code, instrument
//                a key nothing can read, a value key on a query with no single optimum, a cell that makes no check or
//                has no code at all, a call on an instrument with no engine here (Spectacle and the interpreter
//                land with W3-T08 and W2-T08; a Lean call, INS-goal-replay, is deferred to the nightly lane, where it
//                fails until W2-T03 brings its engine)
// scripts/spikes/W1-T37/README.md says how a cell is written so that the gate can read it.
//
// Planted fixtures run on every invocation, through the same discovery, reader, engines, cvc5 and judge: the S1
// authored cells of curriculum/S01-counterexample.md section 2 as lesson pages (scripts/spikes/W1-T37/fixtures/s1/),
// which must be green with every unsat confirmed by cvc5; planted cases for every check, wrong expected verdicts on S1
// cells among them, each of which must trip exactly its check, and controls that hold the harness to its own rules
// (the budget of each kind of check among them); and cvc5's setup beside a fake binary, which it must refuse
// (scripts/spikes/W1-T37/lib/planted.mjs). The gate fails when one does not, so a weakened rule cannot pass:
// scripts/spikes/W1-T37/weakenings.mjs builds a copy of the gate with one rule weakened, rule by rule, and the
// self-check of each copy must fail.
//
//   node scripts/verify-calls.mjs                 the fast lane: every authored cell, then the planted fixtures
//   node scripts/verify-calls.mjs --lane nightly  the nightly lane: Lean calls must reproduce too
//   node scripts/verify-calls.mjs --only S1.L3    only these pages or cell refs (comma-separated); the fixtures still run
//   node scripts/verify-calls.mjs --self-check    only the planted fixtures, each with what it tripped
//   --json, --verbose (every cell's verdicts), --root DIR (check the tree under DIR)
//
// Engines come from scripts/spikes/W1-T42/lib/engines.mjs's pinned cache (.cache/statespace-engines, fetched once and
// checked by SHA-256; STATESPACE_ENGINE_CACHE, STATESPACE_Z3_PYTHON, STATESPACE_PYODIDE_DIR, STATESPACE_Z3_WASM_WHEEL)
// and cvc5 from STATESPACE_CVC5, PATH or the same cache (scripts/spikes/W1-T37/lib/cvc5.mjs).
//
// Exit status: 0 green, 1 findings (or a planted fixture that did not trip), 2 the gate could not run (an engine or
// cvc5 that cannot be set up, a usage error such as a --root that names no directory or one with no content/ in it, or
// an --only that matches nothing).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The content reader is TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

// The gate's own modules, and through them GATE-items' reader and W1-T42's engines. One that does not load means the
// gate cannot run: exit 2, never 1, which would read as findings.
let modules;
try {
  modules = await Promise.all(['cells.mjs', 'engines.mjs', 'cvc5.mjs', 'judge.mjs', 'run.mjs', 'planted.mjs'].map((m) => import(`./spikes/W1-T37/lib/${m}`)));
} catch (e) {
  process.stderr.write(`verify-calls: the gate could not load its modules: ${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(2);
}
const [{ collectCells }, { createZ3Engines, DEFAULT_RLIMIT, DEFAULT_WALL_MS, EngineUnavailable, REPO }, { prepareCvc5, cachedBinary }, judge, { runCells, runCvc5Tasks }, planted] = modules;

const GATE = 'GATE-calls';
const USAGE = 'usage: verify-calls.mjs [--lane fast|nightly] [--only PAGE,REF] [--self-check] [--json] [--verbose] [--root DIR]';

export function parseArgs(argv) {
  const o = { root: REPO, lane: 'fast', only: null, selfCheck: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--root') {
      o.root = path.resolve(value());
      // a tree that is not there, or holds no content, would read as a tree with no cells, and pass
      if (!fs.statSync(o.root, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`--root names no directory: ${argv[i]}`);
      if (!fs.statSync(path.join(o.root, 'content'), { throwIfNoEntry: false })?.isDirectory()) throw new Error(`--root names a directory with no content/ in it, so no page to check: ${argv[i]}`);
    } else if (a === '--lane') {
      o.lane = value();
      if (!['fast', 'nightly'].includes(o.lane)) throw new Error(`--lane is fast or nightly, not ${o.lane}`);
    } else if (a === '--only') o.only = value().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--self-check') o.selfCheck = true;
    else if (a === '--json') o.json = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

const onlyMatches = (only, cell) => only.some((x) => x === cell.page || x === cell.ref);

/** The tree checked, as a repository path; a tree elsewhere (a test's scratch copy) is not named, so no machine path is printed. */
function relRoot(root) {
  const rel = path.relative(REPO, root);
  if (rel === '') return '.';
  return rel.startsWith('..') || path.isAbsolute(rel) ? '<a tree outside the repository>' : rel.split(path.sep).join('/');
}

/** Run the gate. Returns {exit, report}, or {exit: 2, error} when an engine cannot be set up or --only matches nothing. */
export async function runGate(o) {
  const content = o.selfCheck ? { cells: [], problems: [], pages: [] } : await collectCells(o.root);
  let contentCells = content.cells;
  if (o.only) {
    contentCells = contentCells.filter((c) => onlyMatches(o.only, c));
    if (contentCells.length === 0) return { exit: 2, error: `--only ${o.only.join(',')} matches no authored cell (name pages such as S1.L3, or refs such as cell:S1.L3#2)` };
  }
  const tree = planted.writePlantedTree();
  const engines = createZ3Engines();
  try {
    const fixtures = await collectCells(planted.S1_FIXTURES, { prefix: 'fixture:' });
    const plantedTree = await collectCells(tree, { prefix: 'planted:' });
    const wanted = planted.plantedRefs();
    const plantedCells = plantedTree.cells.filter((c) => wanted.has(c.ref));
    const all = [...contentCells, ...fixtures.cells, ...plantedCells];

    let cvc5;
    let run;
    try {
      [run, cvc5] = await Promise.all([runCells({ engines, cells: all }), prepareCvc5()]);
    } catch (e) {
      if (e instanceof EngineUnavailable) return { exit: 2, error: e.message };
      throw e;
    }

    // the content
    const tasks = judge.planCvc5(contentCells, run.replies);
    const answers = await runCvc5Tasks({ cvc5, tasks });
    const judged = judge.judgeCells({ cells: contentCells, replies: run.replies, cvc5: answers, lane: o.lane });
    const findings = [...judge.pageFindings(content.problems), ...judge.judgeEngines(run.probes), ...judged.findings];

    // the planted fixtures
    const cases = await planted.evaluateCases({
      cells: [...fixtures.cells, ...plantedCells],
      fixtureCells: fixtures.cells,
      replies: run.replies,
      problems: plantedTree.problems,
      cvc5,
      judge,
      runCvc5Tasks,
      setup: { prepareCvc5, cachedBinary },
    });
    const uncovered = planted.uncoveredChecks();
    const plantedOk = cases.every((c) => c.pass) && uncovered.length === 0 && fixtures.problems.length === 0;

    const report = {
      gate: GATE,
      lane: o.lane,
      root: relRoot(o.root),
      engines: { native: run.describe.native, pyodide: run.describe.pyodide, cvc5: cvc5.describe, notes: cvc5.notes ?? [], rlimit: DEFAULT_RLIMIT, wallMs: DEFAULT_WALL_MS },
      content: { pages: content.pages.length, cells: contentCells.length, counts: judged.counts, rows: judged.rows, findings },
      planted: { cases, uncovered, fixtureProblems: fixtures.problems },
      timing: run.timing,
    };
    const exit = (o.selfCheck ? true : findings.length === 0) && plantedOk ? 0 : 1;
    return { exit, report };
  } finally {
    await engines.close();
    fs.rmSync(tree, { recursive: true, force: true });
  }
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function formatReport({ exit, report: r }, o) {
  const lines = [];
  const c = r.content.counts;
  const s1 = r.planted.cases[0];
  const held = r.planted.cases.filter((k) => k.pass).length;
  if (!o.selfCheck) {
    lines.push(`${GATE} (${r.lane} lane): ${plural(r.content.cells, 'authored cell')} in ${plural(r.content.pages, 'page')}${r.root === '.' ? '' : ` under ${r.root}`}, ${plural(c.calls, 'call')}: ${plural(r.content.findings.length, 'finding')}`);
    lines.push(`  cvc5 confirmed ${c.unsatConfirmed} of ${c.unsatChecked} unsat answers and ${plural(c.witnessesConfirmed, 'witness', 'witnesses')}${c.optimaConfirmed ? `, and ${plural(c.optimaConfirmed, 'optimum', 'optima')} from both sides` : ''}${c.deferred ? `; ${plural(c.deferred, 'Lean call')} deferred to the nightly lane` : ''}${c.notRun ? `; ${plural(c.notRun, 'free run')} with nothing to run` : ''}`);
  }
  lines.push(`  engines: ${r.engines.native}; ${r.engines.pyodide}; ${r.engines.cvc5}; every check under the cell's rlimit, else ${r.engines.rlimit}; a watchdog of ${r.engines.wallMs / 1000} s per cell`);
  for (const n of r.engines.notes) lines.push(`  note: ${n}`);
  if (!o.selfCheck) {
    for (const f of r.content.findings) lines.push(`  FAIL ${f.check.padEnd(11)} ${f.ref}: ${f.detail}`);
    if (o.verbose) {
      for (const row of r.content.rows) {
        lines.push(`  ${row.status.padEnd(8)} ${row.ref} ${row.ins} ${row.lang ?? '-'}${row.call ? ` key ${row.call.key} (${row.call.expect.kind === 'unreadable' ? 'unreadable' : row.call.expect.verdict ?? row.call.expect.value})` : ' free run'} | native: ${row.native ?? '-'} | pyodide: ${row.pyodide ?? '-'}${row.cvc5.length ? ` | cvc5: ${row.cvc5.join('; ')}` : ''}${row.notes.length ? ` | ${row.notes.join('; ')}` : ''}`);
      }
    }
  }
  if (s1) lines.push(`  ${s1.pass ? 'held' : 'FAIL'} ${s1.name}: ${s1.counts ? `${plural(s1.counts.calls, 'call')} in ${plural(s1.counts.cells, 'cell')}, cvc5 confirmed ${s1.counts.unsatConfirmed} of ${s1.counts.unsatChecked} unsat answers and ${s1.counts.witnessesConfirmed} witnesses; ` : ''}${s1.pass ? 'green' : s1.detail}`);
  for (const k of r.planted.cases.slice(1)) {
    if (o.selfCheck || o.verbose || !k.pass) lines.push(`  ${k.pass ? 'held' : 'FAIL'} [${k.expect.join(', ') || 'control'}] ${k.name}${k.pass && !o.verbose && !o.selfCheck ? '' : `: ${k.detail}`}`);
  }
  for (const u of r.planted.uncovered) lines.push(`  FAIL no planted case trips the check ${u}`);
  for (const p of r.planted.fixtureProblems) lines.push(`  FAIL the S1 fixture ${p.file}: ${p.detail}`);
  lines.push(`  planted fixtures: ${held} of ${r.planted.cases.length} cases held (every check of the judge tripped by its case, the controls green)`);
  lines.push(`${GATE}: ${exit === 0 ? 'green' : 'FAIL'}`);
  return lines;
}

export async function main(argv, io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) }) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    io.err(`verify-calls: ${e.message}\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  let result;
  try {
    result = await runGate(o);
  } catch (e) {
    io.err(`verify-calls: the gate could not run: ${e instanceof Error ? e.stack : String(e)}`);
    return 2;
  }
  if (result.exit === 2) {
    io.err(result.error.startsWith('--only') ? `verify-calls: ${result.error}` : `verify-calls: an engine could not be set up, so nothing was reproduced: ${result.error}`);
    return 2;
  }
  if (o.json) io.out(JSON.stringify({ exit: result.exit, ...result.report }, null, 2));
  else for (const l of formatReport(result, o)) io.out(l);
  return result.exit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // A reader that stops early (| head) closes the pipe; the gate still finishes and exits with its own status.
  process.stdout.on('error', (e) => {
    if (e.code !== 'EPIPE') throw e;
  });
  process.exitCode = await main(process.argv.slice(2));
}
