#!/usr/bin/env node
// Import the executed runs of spine section 9.5 ("Executed (37)") from research/ into runs/ (W0-S11).
//
//   node scripts/runs/import-research.mjs            write runs/RUN-<id>.json for every imported run
//   node scripts/runs/import-research.mjs --check    write nothing; fail if a record on disk differs from a
//                                                    fresh import (recorded_at aside)
//   node scripts/runs/import-research.mjs RUN-a ...  only these
//
// Nothing here is typed from memory. Every verdict line is selected from a log on disk and copied verbatim
// (the script stops if a selector matches no line), every value is parsed from those lines, and every file
// is hashed as it is now. What a log does not record is null, with the reason in `unrecorded`. Runs that
// W0-S11 re-ran (rerun-*.mjs in this folder) are written by their re-run script, which imports the record
// built here as the configuration that holds the original execution.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, fileRecord, hostEnvironment } from './registry.mjs';

const E = (p) => `research/evidence/${p}`;
const RESULTS = 'research/spikes/RESULTS.md';
const NOW = new Date().toISOString();

// ------------------------------------------------------------------ helpers
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8').replaceAll('\r\n', '\n');

/**
 * Lines of a file, picked by selectors and copied verbatim. A selector is an exact line, {prefix}, {re},
 * or {from, to} (the lines from the first that starts with `from` through the first after it that starts
 * with `to`). Every selector must match.
 */
export function pick(rel, ...selectors) {
  const lines = read(rel).split('\n');
  const out = [];
  for (const s of selectors) {
    let hit;
    if (typeof s === 'string') hit = lines.filter((l) => l === s).slice(0, 1);
    else if (s.prefix !== undefined) hit = lines.filter((l) => l.startsWith(s.prefix)).slice(0, s.all ? undefined : 1);
    else if (s.re !== undefined) hit = lines.filter((l) => s.re.test(l)).slice(0, s.all ? undefined : 1);
    else if (s.from !== undefined) {
      const a = lines.findIndex((l) => l.startsWith(s.from));
      const b = a < 0 ? -1 : lines.findIndex((l, i) => i > a && l.startsWith(s.to));
      hit = a < 0 || b < 0 ? [] : lines.slice(a, b + 1);
    }
    if (!hit || hit.length === 0) throw new Error(`${rel}: no line matches ${JSON.stringify(s, (k, v) => (v instanceof RegExp ? String(v) : v))}`);
    out.push(...hit);
  }
  return out;
}

const firstNumber = (line, re) => {
  const m = re.exec(line);
  if (!m) throw new Error(`no match for ${re} in ${JSON.stringify(line)}`);
  return Number(m[1].replace(/,/g, ''));
};

/** The spine's runs table: id -> the Records cell, verbatim. */
function spineRecords() {
  const text = read('docs/spine/SPINE.md');
  const start = text.indexOf('**Executed (');
  const end = text.indexOf('**To record**');
  const map = new Map();
  for (const line of text.slice(start, end).split('\n')) {
    const m = /^\| (RUN-[a-z0-9-]+) \| (.*) \| (.*) \|$/.exec(line);
    if (m) map.set(m[1], { records: m[2], source: m[3] });
  }
  return map;
}

const DEFAULT_REASONS = {
  argv: 'the log holds the output, not the command line',
  binary: 'the log does not name the file that ran',
  binary_sha256: 'the log does not hash the binary, jar or wheel',
  image: 'the log names no container image',
  started_at: 'the log is undated',
  duration_s: 'the log does not time the run',
  exit_code: 'the log does not record the exit code',
  'environment.os': 'the log does not describe the host',
  'environment.cpu_count': 'the log does not describe the host',
};

/** Build an imported record from a spec. */
export function build(spec, spine = spineRecords()) {
  const row = spine.get(spec.id);
  if (!row) throw new Error(`${spec.id} is not in the spine's Executed table`);
  const environment = { os: null, cpu_count: null, ...spec.environment };
  const record = {
    id: spec.id,
    title: spec.title,
    task: 'W0-S11',
    origin: 'imported',
    records: row.records,
    engine: spec.engine,
    version: spec.version,
    ...(spec.version_string ? { version_string: spec.version_string } : {}),
    binary: spec.binary ?? null,
    binary_sha256: spec.binary_sha256 ?? null,
    image: spec.image ?? null,
    recorded_at: NOW,
    started_at: spec.started_at ?? null,
    duration_s: spec.duration_s ?? null,
    argv: spec.argv ?? null,
    inputs: (spec.inputs ?? []).map(([p, role]) => fileRecord(REPO, p, role ? { role } : {})),
    budget: spec.budget ?? {},
    exit_code: spec.exit_code ?? null,
    verdict_lines: spec.verdict_lines,
    outputs: spec.outputs.map((p) => fileRecord(REPO, p, { kind: p.endsWith('RESULTS.md') ? 'results record' : p.endsWith('.json') ? 'trace' : 'log' })),
    ...(spec.values ? { values: spec.values } : {}),
    environment,
    ...(spec.configs ? { configs: spec.configs.map((c) => ({ id: c.id, origin: c.origin ?? 'imported', ...c })) } : {}),
    ...(spec.primary_config ? { primary_config: spec.primary_config } : {}),
  };
  const unrecorded = [];
  const reasons = { ...DEFAULT_REASONS, ...(spec.unrecorded ?? {}) };
  for (const f of ['binary', 'binary_sha256', 'image', 'started_at', 'duration_s', 'argv', 'exit_code']) {
    if (record[f] === null) unrecorded.push({ field: f, reason: reasons[f] });
  }
  for (const f of ['os', 'cpu_count']) if (environment[f] === null) unrecorded.push({ field: `environment.${f}`, reason: reasons[`environment.${f}`] });
  record.unrecorded = unrecorded;
  record.notes = [`Imported by W0-S11 from ${row.source.replace(/`/g, '')} (spine section 9.5). The verdict lines are copied verbatim from the outputs listed here; every file is hashed as it is on disk now.`, ...(spec.notes ?? [])];
  return record;
}

// ------------------------------------------------------------------ the shared facts of the logs
const Z3LOG = E('a2r3/out/z3_5.3.1.txt');
const Z3_WHEEL = 'z3-solver 5.3.1.0 from PyPI, installed by uv';
const Z3_UNRECORDED = {
  argv: "the log holds the output; the script's usage line reads `uv run --with z3-solver==<v> python -I z3_claims.py`",
  binary_sha256: 'uv did not log the wheel it installed; PyPI publishes z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl with SHA-256 3e2e00bc80e776849d917daa194f33759ffa61d6528a859cfc4923ee3277a386 (research/evidence/A5v2/z3pypi.json), the wheel uv selects on x86_64 Linux',
  image: "no container is recorded: the script's usage line runs it under uv on the host",
  started_at: 'the log is undated; RESULTS.md, dated 2026-10-20, records the starter from an earlier execution',
};
const PYODIDE_WHEEL_REASON = 'the log does not hash the wheel; PyPI publishes z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl with SHA-256 62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90 (research/evidence/A5v2/z3pypi.json)';
const BROWSER_LOG = E('A5r3/browser-runs.log');
const PYO_LOG = E('A5r3/z3-pyodide.log');
const TLC_RUNS = E('a2r3/out/tlc_runs.txt');
const TLC180_SHA = '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2';
const TLC174_SHA = '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88';
const TLC_A2R3_BINARY = 'the 1.8.0 tla2tools.jar; its SHA-256 is the one the same log prints at its end (sha256sum of dl/tla180/tla2tools.jar), the build its banner names';
const TLC_BANNER_ENV = { os: 'Linux 6.12.63', cpu_count: 20, cpu_architecture: 'amd64' };
const LEAN_MEASURE = E('lean-measure/run.out');

// ------------------------------------------------------------------ the 37 runs
export const SPECS = [
  // ---------------------------------------------------------------- Z3
  {
    id: 'RUN-z3-starter',
    title: "The roadmap's starter on Z3 5.3.1: an overdraft witness, then unsat once the guard is added",
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG, RESULTS],
    verdict_lines: pick(Z3LOG, 'z3 version: 5.3.1', { prefix: '[1.2 starter: overdraft search]' }, { prefix: '[1.3 guard added]' }),
    values: { version: '5.3.1', starter: 'sat', model: '[b = 0, amount = 1, a = 0]', guarded: 'unsat' },
    unrecorded: Z3_UNRECORDED,
    configs: [
      {
        id: 'results-2026-10-20',
        purpose: 'the earlier execution RESULTS.md records; its script and log are not on disk',
        started_at: '2026-10-20',
        argv: null,
        verdict_lines: pick(RESULTS, { prefix: '- `z3.get_version_string()` = **5.3.1**' }, { prefix: '- Roadmap starter code reproduces exactly' }),
      },
    ],
  },
  {
    id: 'RUN-z3-starter-pyodide',
    title: 'The starter on Z3 5.3.1 in Pyodide 314.0.7 in three browser engines, without cross-origin isolation',
    engine: 'z3',
    version: '5.3.1',
    binary: 'z3_solver-5.3.1.0 pyemscripten wheel on Pyodide 314.0.7',
    image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
    started_at: '2026-10-21',
    outputs: [BROWSER_LOG],
    verdict_lines: pick(BROWSER_LOG, { prefix: '# Browser runs, 2026-10-21' }, { prefix: 'chromium 153.0.8010.12 {"coi":false' }, { prefix: 'firefox 155.0 {"coi":false' }, { prefix: 'webkit 26.6 {"coi":false' }),
    values: {
      ready_ms: { chromium: firstNumber(pick(BROWSER_LOG, { prefix: 'chromium 153.0.8010.12 {"coi":false' })[0], /"readyMs":(\d+)/), firefox: firstNumber(pick(BROWSER_LOG, { prefix: 'firefox 155.0 {"coi":false' })[0], /"readyMs":(\d+)/), webkit: firstNumber(pick(BROWSER_LOG, { prefix: 'webkit 26.6 {"coi":false' })[0], /"readyMs":(\d+)/) },
      cross_origin_isolated: false,
      browsers: { chromium: '153.0.8010.12', firefox: '155.0', webkit: '26.6' },
      pyodide: '314.0.7',
    },
    unrecorded: {
      argv: 'the harness (pw/test.mjs) and the site it served are not on disk; the log names them',
      binary_sha256: PYODIDE_WHEEL_REASON,
      'environment.os': 'the log names the container image, not the host',
      'environment.cpu_count': 'the log names the container image, not the host',
    },
    notes: ['The image is named as the log names it; its digest was not recorded.'],
  },
  {
    id: 'RUN-z3-optimize-min',
    title: 'Under an Optimize objective the minimal overdraft amount is 1',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG],
    verdict_lines: pick(Z3LOG, 'z3 version: 5.3.1', { prefix: '[S1.2 minimal amount via Optimize]' }),
    values: { verdict: 'sat', model: '[amount = 1, b = 0, a = 0]', minimal_amount: 1 },
    unrecorded: Z3_UNRECORDED,
    notes: ['The same execution and log as RUN-z3-starter.'],
  },
  {
    id: 'RUN-z3-conservation-noguard',
    title: 'Conservation over Int is proved with no guard at all',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG],
    verdict_lines: pick(Z3LOG, 'z3 version: 5.3.1', { prefix: '[conservation without any guard, Int]' }),
    values: { verdict: 'proved' },
    unrecorded: Z3_UNRECORDED,
    notes: ['The same execution and log as RUN-z3-starter.'],
  },
  {
    id: 'RUN-z3-bv64',
    title: 'Under signed 64-bit bit-vectors the guard protects the sender and the recipient wraps',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG, RESULTS],
    verdict_lines: pick(
      Z3LOG,
      'z3 version: 5.3.1',
      { prefix: '[1.5 BitVec64 signed: guarded SOURCE overdraft]' },
      { from: '[1.5 BitVec64 signed: guarded DESTINATION wrap]', to: ' X = 4194304]' },
      { prefix: '[1.5 BitVec64 conservation mod 2^64]' },
      { prefix: '[1.5 BitVec64 unsigned guard, signed check]' },
    ),
    values: { sender: 'unsat', recipient: 'sat', recipient_witness: { A: '9223372036854775806', B: '9223372036850581504', X: '4194304' }, conservation_mod_2_64: 'proved', unsigned_guard_signed_check: 'sat' },
    unrecorded: Z3_UNRECORDED,
    configs: [
      {
        id: 'results-2026-10-20',
        purpose: 'the earlier execution RESULTS.md records, which names the amount M; its script and log are not on disk',
        started_at: '2026-10-20',
        argv: null,
        verdict_lines: pick(RESULTS, { prefix: '- 64-bit bit-vector re-encoding' }),
      },
    ],
    notes: ['Witness values are strings: they exceed the integers JSON readers keep exact.'],
  },
  {
    id: 'RUN-z3-bv64-pyodide',
    title: 'Under Pyodide in a Node harness, a recipient-wrap witness for B >= 0, M > 0, B + M < 0',
    engine: 'z3',
    version: '5.3.1',
    binary: 'z3_solver-5.3.1.0 pyemscripten wheel on Pyodide 314.0.7',
    started_at: '2026-10-21T16:12:38Z',
    inputs: [[E('A5r3/scripts/z3unk.mjs'), 'script']],
    outputs: [PYO_LOG],
    verdict_lines: pick(PYO_LOG, { prefix: '# z3py in pyodide 314.0.7 under node v22.22.2' }, { prefix: 'recipient-wrap sat' }),
    values: { verdict: 'sat', witness: { M: '9223372036854775803', B: '9223336852482686975' } },
    environment: { node: 'v22.22.2' },
    unrecorded: {
      argv: "the log holds the output; the script's usage line reads `node z3unk.mjs <pyodide dir> <z3 wheel>`",
      binary_sha256: PYODIDE_WHEEL_REASON,
      image: 'the log names Node v22.22.2 and no container',
    },
    notes: ['A different query from RUN-z3-bv64: no sender guard and two variables, so no same-query comparison exists (spine section 9.5).'],
  },
  {
    id: 'RUN-z3-unknown-pow',
    title: 'x**y == 8, y > 1 gives unknown, incomplete (theory arithmetic), natively on 5.3.1 and 4.15.4 and under Pyodide',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_unknown.py'), 'script'], [E('A5r3/scripts/z3unk.mjs'), 'script']],
    outputs: [E('a2r3/out/z3_unknown.txt'), PYO_LOG],
    verdict_lines: pick(E('a2r3/out/z3_unknown.txt'), '=== z3-solver 5.3.1.0', { prefix: '[Int x**y == 8, y>1]' }, { prefix: '[Quantified: forall k. f(k) > f(k+1), f(0)=0]' }, { prefix: '[Quantified: forall k. k*k != y]' }),
    values: { verdict: 'unknown', reason_unknown: 'smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))', quantifier_reason: 'incomplete quantifiers', k_squared_witness: '[y = 2]' },
    unrecorded: { ...Z3_UNRECORDED, argv: "the log holds the output; the script's docstring gives no usage line, and the log's sections name the wheel versions it ran" },
    configs: [
      { id: 'native-4.15.4', purpose: 'the same script on z3-solver 4.15.4.0', version: '4.15.4', verdict_lines: (() => { const all = read(E('a2r3/out/z3_unknown.txt')).split('\n'); const i = all.indexOf('=== z3-solver 4.15.4.0'); return [all[i], ...all.slice(i).filter((l) => l.startsWith('[Int x**y == 8, y>1]') || l.startsWith('[Quantified: forall k. f(k)'))]; })() },
      { id: 'pyodide', purpose: 'the same query under Pyodide 314.0.7 in a Node harness (RUN-z3-bv64-pyodide session)', started_at: '2026-10-21T16:12:38Z', verdict_lines: pick(PYO_LOG, { prefix: 'pow-unknown unknown' }) },
    ],
  },
  {
    id: 'RUN-z3-budget-pyodide',
    title: "Under Pyodide in a Node harness, Z3's timeout never returned, while an rlimit of 5e6 gave unknown (canceled)",
    engine: 'z3',
    version: '5.3.1',
    binary: 'z3_solver-5.3.1.0 pyemscripten wheel on Pyodide 314.0.7',
    started_at: '2026-10-21T16:12:38Z',
    inputs: [[E('A5r3/scripts/z3py.mjs'), 'script']],
    outputs: [PYO_LOG],
    budget: { rlimit: 5000000 },
    verdict_lines: pick(PYO_LOG, { prefix: '# z3py in pyodide 314.0.7 under node v22.22.2' }, { prefix: '2806ms py: rlimit-case unknown canceled' }, { prefix: "timeout-case (s.set('timeout',2000)): exit=124 after 25s" }),
    values: { rlimit: 5000000, rlimit_verdict: 'unknown', rlimit_reason: 'canceled', rlimit_seconds: 1.1, timeout_ms: 2000, timeout_returned: false, external_kill_s: 25, external_kill_exit: 124 },
    environment: { node: 'v22.22.2' },
    primary_config: 'rlimit',
    configs: [
      { id: 'rlimit', purpose: "`s.set('rlimit', 5000000)` on the Fermat cubic (the script's rlimit case)", budget: { rlimit: 5000000 }, verdict_lines: pick(PYO_LOG, { prefix: '2806ms py: rlimit-case unknown canceled' }) },
      { id: 'timeout', purpose: "`s.set('timeout', 2000)` on the same query (the script's timeout case), killed by an external 25 s timeout", budget: { timeout_ms: 2000, timeout_s: 25 }, exit_code: 124, verdict_lines: pick(PYO_LOG, { prefix: "timeout-case (s.set('timeout',2000))" }) },
    ],
    unrecorded: {
      argv: "the log holds the output; the script's usage line reads `node z3py.mjs <pyodide dir> <z3 wheel> <case>`",
      binary_sha256: PYODIDE_WHEEL_REASON,
      image: 'the log names Node v22.22.2 and no container',
    },
  },
  {
    id: 'RUN-z3-11179',
    title: 'Z3 issue #11179: 5.3.0 answers unsat on two satisfiable inputs where 5.3.1 answers unknown',
    engine: 'z3',
    version: '5.3.1',
    binary: 'z3-solver wheels 5.3.1, 5.3.0, 5.1.0 and 4.15.4 from PyPI, installed by uv',
    inputs: [[E('a2r3/scripts/z3_11179_cli.py'), 'script'], [E('a2r3/scripts/z3_11179.py'), 'script']],
    outputs: [E('a2r3/out/z3_11179_cli.txt'), E('a2r3/out/z3_11179.txt')],
    verdict_lines: pick(E('a2r3/out/z3_11179_cli.txt'), 'z3 5.3.1', '[issue input 1 (truth: sat, y=2)] -> unknown', '[issue input 2 (truth: sat, y=1/2)] -> unknown'),
    values: { cli: { '5.3.1': ['unknown', 'unknown'], '5.3.0': ['unsat', 'unsat'], '5.1.0': ['unsat', 'unknown'], '4.15.4': ['unsat', 'unknown'] }, api: { '5.3.1': ['unknown', 'unknown'], '5.3.0': ['unknown', 'unknown'], '5.1.0': ['unknown', 'unknown'], '4.15.4': ['unknown', 'unknown'] } },
    primary_config: 'cli-5.3.1',
    configs: ['5.3.1', '5.3.0', '5.1.0', '4.15.4'].flatMap((v) => {
      const cli = read(E('a2r3/out/z3_11179_cli.txt')).split('\n');
      const api = read(E('a2r3/out/z3_11179.txt')).split('\n');
      const i = cli.indexOf(`z3 ${v}`);
      const j = api.indexOf(`z3 ${v}`);
      if (i < 0 || j < 0) throw new Error(`z3 ${v} missing from the #11179 logs`);
      return [
        { id: `cli-${v}`, purpose: `the issue's two SMT-LIB scripts through Z3's SMT-LIB2 command interpreter (Z3_eval_smtlib2_string), z3-solver ${v}`, version: v, verdict_lines: cli.slice(i, i + 3) },
        { id: `api-${v}`, purpose: `the same inputs through the Python API (Solver.from_string, timeout 10000 ms), z3-solver ${v}`, version: v, budget: { timeout_ms: 10000 }, verdict_lines: api.slice(j, j + 4) },
      ];
    }),
    unrecorded: { ...Z3_UNRECORDED, argv: 'the logs hold the output; the scripts give no usage line', binary_sha256: 'uv did not log the wheels it installed' },
    notes: ['"Through the command line" in the spine means the SMT-LIB2 command interpreter called through the API (Z3_eval_smtlib2_string), as z3_11179_cli.py does, not the z3 executable.'],
  },
  {
    id: 'RUN-z3-refund-a21',
    title: 'The refund theorem (customer >= 0) is unsat with a modify-style update and sat with a value update; the merchant can go negative',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG],
    verdict_lines: pick(Z3LOG, 'z3 version: 5.3.1', { prefix: '[A2.1 stated theorem (customer >= 0), modify-update]' }, { prefix: '[A2.1 stated theorem (customer >= 0), value-update]' }, { from: '[A2.1 the gap: merchant >= 0 after refund]', to: ' r = 40651]' }),
    values: { modify_update: 'unsat', value_update: 'sat', merchant_after_refund: 'sat' },
    unrecorded: Z3_UNRECORDED,
    notes: ['The same execution and log as RUN-z3-starter.'],
  },
  {
    id: 'RUN-z3-selftransfer',
    title: 'The buggy-update self-transfer changes the balance: sat [n = 1, t = 0, f = 0]',
    engine: 'z3',
    version: '5.3.1',
    binary: Z3_WHEEL,
    inputs: [[E('a2r3/scripts/z3_claims.py'), 'script']],
    outputs: [Z3LOG],
    verdict_lines: pick(Z3LOG, 'z3 version: 5.3.1', { prefix: '[S2.1 self-transfer changes balance (buggy update)]' }),
    values: { verdict: 'sat', model: '[n = 1, t = 0, f = 0]' },
    unrecorded: Z3_UNRECORDED,
    notes: ['The same execution and log as RUN-z3-starter.'],
  },
  {
    id: 'RUN-z3-fixedpoint',
    title: 'Under Pyodide in a Node harness, Z3 Fixedpoint with stratified negation: canread(1,3) sat, revoked canread(1,4) unsat',
    engine: 'z3',
    version: '5.3.1',
    binary: 'z3_solver-5.3.1.0 pyemscripten wheel on Pyodide 314.0.7',
    started_at: '2026-10-21T16:12:38Z',
    inputs: [[E('A5r3/scripts/z3unk.mjs'), 'script']],
    outputs: [PYO_LOG],
    verdict_lines: pick(PYO_LOG, { prefix: '# z3py in pyodide 314.0.7 under node v22.22.2' }, 'datalog canread(1,3) sat canread(1,4) unsat'),
    values: { 'canread(1,3)': 'sat', 'canread(1,4)': 'unsat', engine_setting: 'datalog' },
    environment: { node: 'v22.22.2' },
    unrecorded: {
      argv: "the log holds the output; the script's usage line reads `node z3unk.mjs <pyodide dir> <z3 wheel>`",
      binary_sha256: PYODIDE_WHEEL_REASON,
      image: 'the log names Node v22.22.2 and no container',
    },
  },
  // ---------------------------------------------------------------- cvc5
  {
    id: 'RUN-cvc5-alethe',
    title: 'cvc5 from the pip wheel answers unsat on the guard query and emits a 19-line Alethe proof with a hole step',
    engine: 'cvc5',
    version: '1.4.2-modified',
    binary: 'the cvc5 pip wheel',
    inputs: [[E('a2r3/scripts/cvc5_alethe.py'), 'script']],
    outputs: [E('a2r3/out/cvc5_alethe.txt')],
    verdict_lines: pick(E('a2r3/out/cvc5_alethe.txt'), "cvc5 b'1.4.2-modified' -> unsat", 'Alethe proof: 19 lines; first lines:', { prefix: '(step t1 (cl @p_10) :rule hole' }),
    values: { verdict: 'unsat', version_string: '1.4.2-modified', proof_lines: 19, hole_step_seen: true },
    unrecorded: {
      argv: 'the log holds the output; the script gives no usage line',
      binary_sha256: 'the log does not hash the wheel',
      image: 'no container is recorded',
    },
    notes: [
      'The log holds the first eight lines of the proof, and lacks the step and hole counts the script on disk prints, so an earlier version of the script produced it. The full proof was not kept.',
    ],
  },
  // ---------------------------------------------------------------- Lean
  {
    id: 'RUN-lean-ledger',
    title: 'Core Lean 4.35.0 proves the four ledger theorems; conservation uses [propext, Quot.sound]',
    engine: 'lean',
    version: '4.35.0',
    binary: 'the Lean 4.35.0 toolchain in the ss-lean:4.35.0 image',
        started_at: '2026-10-20',
    inputs: [['research/spikes/lean/Ledger.lean', 'source']],
    outputs: [RESULTS],
    verdict_lines: pick(RESULTS, { prefix: '- `spikes/lean/Ledger.lean` compiles on **core Lean 4.35.0 with no Mathlib**' }),
    values: { axioms: ['propext', 'Quot.sound'], theorems: ['transfer_conserves', 'transfer_nonneg', 'transfer_rejected', 'run_conserves'] },
    unrecorded: { argv: "RESULTS.md records the result, not the command line; it gives the usage `docker run --rm -v <dir>:/work ss-lean:4.35.0 lake build`", exit_code: 'RESULTS.md records the result, not the exit code', binary_sha256: 'RESULTS.md does not hash the toolchain', image: 'RESULTS.md describes the ss-lean:4.35.0 image beside this result but does not say this run used it', 'environment.os': 'RESULTS.md does not describe the host', 'environment.cpu_count': 'RESULTS.md does not describe the host' },
    notes: ['RESULTS.md is the record (spine precedence item 2); no log of this execution is on disk.'],
  },
  {
    id: 'RUN-lean-selftransfer',
    title: 'xferBuggy (fun _ => 10) 0 0 5 0 = 15 is proved by decide; the fixed version gives 10',
    engine: 'lean',
    version: '4.35.0',
    binary: 'the Lean 4.35.0 toolchain in the ss-lean:4.35.0 image',
        started_at: '2026-10-20',
    inputs: [['research/spikes/lean/Ledger.lean', 'source']],
    outputs: [RESULTS],
    verdict_lines: pick(RESULTS, { prefix: '- Finite-map generalisation as `Acct → Int`' }),
    values: { buggy: 15, fixed: 10, tactic: 'decide' },
    unrecorded: { argv: 'RESULTS.md records the result, not the command line', exit_code: 'RESULTS.md records the result, not the exit code', binary_sha256: 'RESULTS.md does not hash the toolchain', image: 'RESULTS.md describes the ss-lean:4.35.0 image beside this result but does not say this run used it', 'environment.os': 'RESULTS.md does not describe the host', 'environment.cpu_count': 'RESULTS.md does not describe the host' },
  },
  {
    id: 'RUN-lean-axioms',
    title: 'Axiom probe: grind adds Classical.choice and omega does not; lake check errors while logging that the kernel accepts; a sorry file exits 0',
    engine: 'lean',
    version: '4.35.0',
    version_string: 'Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)',
    binary: 'the Lean 4.35.0 toolchain installed by elan',
    inputs: [[E('lean-measure/proj/ledger/Ledger/Basic.lean'), 'source'], [E('lean-measure/proj/ledger/Ledger/Bad.lean'), 'source'], [E('a2r3/lean/proj/Probe/Trust.lean'), 'source'], [E('a2r3/lean/proj/Probe/Conserve.lean'), 'source'], [E('lean-measure/scripts/measure-local.sh'), 'script']],
    outputs: [E('lean-measure/proj/check-bad.out'), LEAN_MEASURE, E('a2r3/out/lean_trust.txt')],
    verdict_lines: [
      ...pick(
        E('lean-measure/proj/check-bad.out'),
        'WARNING: Sandbox disabled, this run is not trustworthy.',
        { prefix: "info: Ledger/Basic.lean:27:0: 'transfer_conserves' depends on axioms" },
        { prefix: "info: Ledger/Basic.lean:28:0: 'transfer_conserves_grind' depends on axioms" },
        'warning: Ledger/Bad.lean:4:8: declaration uses `sorry`',
        { prefix: "info: Ledger/Bad.lean:7:0: 'big_native' depends on axioms" },
        { prefix: "info: Ledger/Bad.lean:9:0: 'with_sorry' depends on axioms" },
        { prefix: "info: Ledger/Bad.lean:10:0: 'with_axiom' depends on axioms" },
        { prefix: "error: Axiom 'big_native._native.native_decide.ax_1_1' is not permitted" },
        'Lean default kernel accepts the solution',
      ),
      ...pick(LEAN_MEASURE, { prefix: '[01:23:24] lean Ledger/Bad.lean rc=0' }),
      ...pick(E('a2r3/out/lean_trust.txt'), "'by_bv' depends on axioms: [propext, Classical.choice, Quot.sound]", "'by_omega' depends on axioms: [propext, Quot.sound]"),
    ],
    values: { grind_axioms: ['propext', 'Classical.choice', 'Quot.sound'], omega_axioms: ['propext', 'Quot.sound'], sorry_file_exit: 0, lake_check_kernel_line: 'Lean default kernel accepts the solution' },
    configs: [
      { id: 'check-bad', purpose: 'lake check with the sandbox disabled on the project with Bad.lean (lean-measure/proj/check-bad.out)', verdict_lines: pick(E('lean-measure/proj/check-bad.out'), { prefix: 'error: Axiom' }, 'Lean default kernel accepts the solution') },
      { id: 'lean-bad', purpose: 'lean Ledger/Bad.lean, which uses sorry, a native axiom and a custom axiom (lean-measure/run.out)', exit_code: 0, environment: { os: 'Linux 6.12.63', cpu_count: 20, ram_gib: 31 }, verdict_lines: pick(LEAN_MEASURE, '[01:23:08] host: 20 cpus; 31 GiB RAM; Linux 6.12.63', { prefix: '[01:23:24] lean Ledger/Bad.lean rc=0' }) },
      { id: 'trust-probe', purpose: 'lake build and #print axioms on the a2r3 probe project (a2r3/out/lean_trust.txt)', verdict_lines: pick(E('a2r3/out/lean_trust.txt'), 'lake exit=0', { prefix: "'by_native' depends on axioms" }, "'by_bv' depends on axioms: [propext, Classical.choice, Quot.sound]", "'by_omega' depends on axioms: [propext, Quot.sound]") },
    ],
    unrecorded: {
      argv: "the logs hold the output; lean-measure's log is written by measure-local.sh, whose command lines are in the script, and the check-bad run's command line is not recorded",
      binary_sha256: 'the logs do not hash the toolchain',
      image: 'lean-measure ran on the host with elan (measure-local.sh); the a2r3 probe paths do not name an image',
      started_at: 'the lean-measure log stamps times of day ([01:23:08]) without a date',
      exit_code: 'one exit code per configuration; there is no single one',
      'environment.os': 'the logs come from separate sessions: lean-measure/run.out describes its own host (the lean-bad configuration), the other two describe none',
      'environment.cpu_count': 'the logs come from separate sessions: lean-measure/run.out describes its own host (the lean-bad configuration), the other two describe none',
    },
  },
  {
    id: 'RUN-lean-skipkernel',
    title: 'A debug.skipKernelTC proof of False builds with exit 0; leanchecker rejects it',
    engine: 'lean',
    version: '4.35.0',
    binary: 'the Lean 4.35.0 toolchain',
    inputs: [[E('a2r3/lean/proj/Probe/Bypass.lean'), 'source'], [E('a2r3/lean/proj/lakefile.toml'), 'config']],
    outputs: [E('a2r3/out/lean_trust.txt')],
    exit_code: 0,
    verdict_lines: pick(E('a2r3/out/lean_trust.txt'), { prefix: '✔ [4/6] Built Probe.Bypass' }, 'lake exit=0', "'oops' does not depend on any axioms", '--- leanchecker Probe', 'leanchecker found a problem in Probe.Bypass', "uncaught exception: while replaying declaration 'oops':", { prefix: "(kernel) declaration type mismatch, 'oops' has type" }),
    values: { build_exit: 0, leanchecker: 'rejects', declaration: 'oops' },
    unrecorded: { argv: 'the log holds the output, not the command lines', binary_sha256: 'the log does not hash the toolchain', started_at: 'the log is undated' },
    notes: ['exit_code is the build\'s, as the log prints it (lake exit=0); leanchecker\'s exit code is not printed.'],
  },
  {
    id: 'RUN-lean-comparator',
    title: 'lake comparator accepts an honest solution and rejects a weakened statement and a redefined transfer; --paranoid runs six checkers',
    engine: 'lean',
    version: '4.35.0',
    binary: 'lake comparator of the Lean 4.35.0 toolchain',
    inputs: [
      [E('A5r3/comp/good/Challenge.lean'), 'challenge'], [E('A5r3/comp/good/Solution.lean'), 'solution'], [E('A5r3/comp/good/comparator.json'), 'config'],
      [E('A5r3/comp/weak/Solution.lean'), 'solution'], [E('A5r3/comp/redef/Solution.lean'), 'solution'],
      [E('lean-measure/proj/judge/Challenge.lean'), 'challenge'], [E('lean-measure/proj/judge/Solution.lean'), 'solution'], [E('lean-measure/proj/judge/comparator.json'), 'config'],
    ],
    outputs: [E('A5r3/comp-run2.log'), E('A5r3/comp-run5.log'), E('lean-measure/proj/judge/cmp-honest.out'), E('lean-measure/proj/judge/cmp-weak.out'), E('lean-measure/proj/judge/cmp-drift.out')],
    verdict_lines: [
      ...pick(E('A5r3/comp-run2.log'), { prefix: '== good comparator(no-sandbox) rc=0' }, { prefix: '== weak comparator(no-sandbox) rc=1' }, { prefix: '== redef comparator(no-sandbox) rc=1' }),
      ...pick(E('A5r3/comp-run5.log'), { from: '== good --paranoid rc=0 secs=3', to: 'Lean default kernel accepts the solution' }),
    ],
    values: { honest: { exit: 0, line: 'Your solution is okay!' }, weakened: { exit: 1 }, redefined: { exit: 1 }, paranoid_checkers: 6, paranoid_seconds: 3 },
    primary_config: 'no-sandbox',
    configs: [
      { id: 'no-sandbox', purpose: 'good, weak and redef judged with the sandbox off (A5r3/comp-run2.log)', verdict_lines: pick(E('A5r3/comp-run2.log'), { prefix: '== good comparator(no-sandbox)' }, { prefix: '== weak comparator(no-sandbox)' }, { prefix: '== redef comparator(no-sandbox)' }) },
      { id: 'sandboxed', purpose: 'the same three inside bubblewrap, in a container with the relaxed options (A5r3/comp-run5.log)', verdict_lines: pick(E('A5r3/comp-run5.log'), { prefix: '== good sandboxed rc=0' }, { prefix: '== weak sandboxed rc=1' }, { prefix: '== redef sandboxed rc=1' }) },
      { id: 'paranoid', purpose: 'the honest solution under --paranoid (A5r3/comp-run5.log)', exit_code: 0, verdict_lines: pick(E('A5r3/comp-run5.log'), { from: '== good --paranoid rc=0 secs=3', to: 'Lean default kernel accepts the solution' }) },
      { id: 'judge', purpose: 'honest, weakened and redefined judged on the lean-measure judge project with the sandbox off', verdict_lines: [...pick(E('lean-measure/proj/judge/cmp-honest.out'), 'Your solution is okay!'), ...pick(E('lean-measure/proj/judge/cmp-weak.out'), { prefix: 'error: Challenge and solution theorem statement do not match' }), ...pick(E('lean-measure/proj/judge/cmp-drift.out'), { prefix: 'error: Const does not match' })] },
    ],
    unrecorded: {
      argv: 'the logs print a label and the exit code per case, not the command line',
      binary_sha256: 'the logs do not hash the toolchain',
      image: 'the logs do not name the container image',
      started_at: 'the logs are undated',
      exit_code: 'one exit code per case is in the configurations; there is no single one',
    },
  },
  {
    id: 'RUN-lean-bwrap-docker',
    title: 'Without bubblewrap lake comparator exits 2; bubblewrap under default Docker exits 1, the code of a rejection',
    engine: 'lean',
    version: '4.35.0',
    binary: 'lake comparator of the Lean 4.35.0 toolchain',
    inputs: [[E('A5r3/comp/good/Challenge.lean'), 'challenge'], [E('A5r3/comp/good/Solution.lean'), 'solution'], [E('A5r3/comp/good/comparator.json'), 'config']],
    outputs: [E('A5r3/comp-run2.log')],
    verdict_lines: pick(E('A5r3/comp-run2.log'), '== good sandboxed(no bwrap) rc=2', 'bwrap: /usr/bin/bwrap', { prefix: '== good sandboxed(bwrap, default docker) rc=1' }),
    values: { no_bwrap_exit: 2, default_docker_exit: 1, default_docker_line: 'bwrap: No permissions to create new namespace, likely because the kernel does not allow non-privileged user namespaces.' },
    configs: [
      { id: 'no-bwrap', purpose: 'the sandboxed comparator with no bubblewrap installed', exit_code: 2, verdict_lines: pick(E('A5r3/comp-run2.log'), '== good sandboxed(no bwrap) rc=2') },
      { id: 'default-docker', purpose: 'bubblewrap installed, under default Docker options', exit_code: 1, verdict_lines: pick(E('A5r3/comp-run2.log'), { prefix: '== good sandboxed(bwrap, default docker) rc=1' }) },
    ],
    unrecorded: {
      argv: "the log prints a label and the exit code, not the command line; RUN-bwrap-lanes records the lanes' docker run argv",
      binary_sha256: 'the log does not hash the toolchain',
      image: 'the log does not name the container image',
      exit_code: 'one exit code per case is in the configurations; there is no single one',
    },
  },
  {
    id: 'RUN-lean-mathlib',
    title: "A Mathlib Finmap project's packages take 7.3 GB",
    engine: 'mathlib',
    version: 'v4.35.0',
    version_string: 'mathlib4 rev v4.35.0, commit 56a005855ea17e0b0958f73ec801ae140b0a1679 (lake-manifest.json)',
    binary: 'the Mathlib packages from lake update, with the cache from lake exe cache get',
    inputs: [[E('A5v2/mathlib-measure/run.sh'), 'script'], [E('A5v2/mathlib-measure/proj/lakefile.toml'), 'config'], [E('A5v2/mathlib-measure/proj/lake-manifest.json'), 'manifest'], [E('A5v2/mathlib-measure/proj/Mm.lean'), 'source']],
    outputs: [E('A5v2/mathlib-measure/measure.out'), E('A5v2/mathlib-measure/proj/build.log'), E('A5v2/mathlib-measure/proj/cache.log')],
    exit_code: 0,
    verdict_lines: pick(E('A5v2/mathlib-measure/measure.out'), 'update rc=0 secs=49', 'cache rc=0 secs=3', '7.3G\t.lake/packages', '6.9G\t.lake/packages/mathlib', '453M\t/root/.cache/mathlib', 'build rc=0 secs=2', 'Build completed successfully (744 jobs).', 'docker exit=0'),
    values: { packages: '7.3G', mathlib: '6.9G', cache: '453M', jobs: 744 },
    unrecorded: {
      argv: 'the log is the output of run.sh inside a container; the docker command line is not recorded',
      binary_sha256: 'the log does not hash lake or the toolchain',
      image: "the log says docker exit=0 but not the image",
      started_at: 'the log is undated',
      duration_s: "the log times each step (49, 3 and 2 s), not the whole run",
    },
    notes: ["The version is Mathlib's: the lakefile requires rev v4.35.0 and the manifest pins its commit. The log does not print Lean's or lake's version; update.log says the toolchain was already up to date."],
  },
  {
    id: 'RUN-lean-toolchain',
    title: 'The Lean 4.35.0 toolchain unpacks to 3.0 GB and bundles the extra checkers; lake check and lake comparator help texts; lake check fails at the sandbox on the measuring host',
    engine: 'lean',
    version: '4.35.0',
    version_string: 'Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)',
    binary: 'leanprover/lean4:v4.35.0, installed by elan 4.2.4 from releases.lean-lang.org',
    inputs: [[E('lean-measure/scripts/measure-local.sh'), 'script']],
    outputs: [LEAN_MEASURE, E('lean-measure/measure.log')],
    verdict_lines: [
      ...pick(
        LEAN_MEASURE,
        '[01:23:08] host: 20 cpus; 31 GiB RAM; Linux 6.12.63',
        '[01:23:08] elan v4.2.4 install: 0.8 s',
        '[01:23:23] toolchain v4.35.0 download+unpack: 15.0 s',
        { prefix: '3.0G\t' },
        '[01:23:23] lake --version: Lake version 5.0.0-src+eb6cafb (Lean version 4.35.0)',
        { prefix: '[01:23:23] lean --version: Lean (version 4.35.0' },
        { prefix: '[01:23:24] lake check (clean) rc=1' },
        { prefix: '[01:23:25] lake check --paranoid (clean) rc=1' },
        '244K\t.lake',
      ),
      ...pick(E('lean-measure/measure.log'), { prefix: 'info: downloading https://releases.lean-lang.org/lean4/v4.35.0/' }, { from: 'EXIT CODES:', to: '  2   ' }),
    ],
    values: { unpacked: '3.0G', elan_install_s: 0.8, toolchain_install_s: 15.0, lake_version: '5.0.0-src+eb6cafb', project_lake_dir: '244K', checkers_bundled: ['leanchecker', 'leanchecker-paranoid', 'lean4lean', 'nanoda_bin', 'con-leche', 'con-ron'] },
    environment: { os: 'Linux 6.12.63', cpu_count: 20, ram_gib: 31 },
    unrecorded: {
      argv: "the log is written by measure-local.sh (its lines have the script's format, and the script's commands are in it), but the invocation of the script is not recorded",
      binary_sha256: 'the log does not hash the toolchain archive; its release-asset hash and byte count are RUN-lean-asset (W0-S11)',
      image: 'measure-local.sh ran on the host, with ELAN_HOME redirected into its own directory',
      started_at: 'the log stamps times of day (UTC, by the script) without a date',
      duration_s: 'the log times each step, not the whole script',
      exit_code: 'the script does not record its own exit code',
    },
    notes: ['lake check fails at the sandbox here (a nix-ld panic inside bubblewrap, exit 134 in the child), so its exit code 1 is not a verdict on the project.'],
  },
  {
    id: 'RUN-lean-refund-a21',
    title: 'Lean renderings of AUD-2.1: the update chain does not elaborate, the shown proof fails in omega, the repaired proofs and a false statement under a value update',
    engine: 'lean',
    version: '4.35.0',
    binary: 'the Lean 4.35.0 toolchain',
    inputs: ['A', 'B', 'C', 'D', 'E'].map((x) => [E(`a2r3/lean/Audit${x}.lean`), 'source']),
    outputs: [E('a2r3/out/lean_audit.txt')],
    verdict_lines: pick(E('a2r3/out/lean_audit.txt'), '===== AuditA', { prefix: '/work/AuditA.lean:18:39: error: Application type mismatch' }, '===== AuditC', { prefix: '/work/AuditC.lean:22:55: error: omega could not prove the goal' }, '===== AuditD', "'refund_nonneg' depends on axioms: [propext, Quot.sound]", "'refund_breaks_inv' depends on axioms: [propext]", '===== AuditE', "'refund_nonneg_false' depends on axioms: [propext]"),
    values: { as_written: 'does not elaborate', shown_proof: 'omega fails', refund_nonneg_axioms: ['propext', 'Quot.sound'], refund_breaks_inv_axioms: ['propext'], refund_nonneg_false_axioms: ['propext'] },
    unrecorded: { argv: 'the log holds the output; the /work paths show a container mount, not the command line', binary_sha256: 'the log does not hash the toolchain', image: 'the /work paths show a container, not its image' },
  },
  // ---------------------------------------------------------------- TLC
  {
    id: 'RUN-tlc-doublespend',
    title: 'DoubleSpend (Init 100, Amount 80, two workers): default flags stop at Deadlock reached after 10 distinct states; -deadlock finds the violation at 11 with a 5-state trace; 1.7.4 rejects -dumpTrace',
    engine: 'tlc',
    version: '2026.10.20.183001',
    version_string: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
    binary: 'tla2tools.jar 1.8.0 (the log prints its banner, not its hash)',
    started_at: '2026-10-21',
    inputs: [[E('A5r3/tla/DoubleSpend.tla'), 'spec'], [E('A5r3/tla/DoubleSpend.cfg'), 'config'], [E('A5spike/tla174/DoubleSpend.tla'), 'spec'], [E('A5spike/tla174/DoubleSpend.cfg'), 'config']],
    outputs: [E('A5r3/tla/run.log'), E('A5r3/tla/t1.8.0.json'), E('A5spike/tla174/run174.log'), E('A5spike/tla174/run180.log'), E('A5spike/tla174/tool174.log'), E('A5spike/tla174/dl-1.7.4.log'), E('A5spike/tla174/dl-1.8.0.log'), E('A5spike/tla174/dlw4.log'), E('A5spike/tla174/trace180.json'), RESULTS],
    verdict_lines: pick(E('A5spike/tla174/run180.log'), 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)', { prefix: 'Running breadth-first search Model-Checking with fp 123' }, 'Error: Deadlock reached.', '"CounterExample written: trace180.json"', '11 states generated, 10 distinct states found, 3 states left on queue.', 'The depth of the complete state graph search is 4.'),
    values: { default: { result: 'deadlock', distinct_states: 10, states_generated: 11, depth: 4 }, deadlock_off: { result: 'violated', invariant: 'NoOverspend', distinct_states: 11, states_generated: 12, depth: 5, trace_states: 5, trace_actions: 4 }, tlc174_dumptrace: 'unrecognized option', tlc180_json_trace: 'written' },
    environment: { ...TLC_BANNER_ENV, java: 'Eclipse Adoptium 21.0.12.1' },
    budget: { workers: 1 },
    primary_config: 'a5spike-1.8.0-default',
    configs: [
      { id: 'a5spike-1.8.0-default', purpose: 'the A5 spike session: default flags on the 1.8.0 jar, one TLC worker, with the counterexample written as JSON', budget: { workers: 1 }, verdict_lines: pick(E('A5spike/tla174/run180.log'), 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)', { prefix: 'Running breadth-first search Model-Checking with fp 123' }, 'Error: Deadlock reached.', '"CounterExample written: trace180.json"', '11 states generated, 10 distinct states found, 3 states left on queue.'), outputs: [E('A5spike/tla174/run180.log'), E('A5spike/tla174/trace180.json')] },
      { id: 'a5spike-1.7.4-dumptrace', purpose: 'the 1.7.4 jar rejects -dumpTrace', version: '2.19 of 08 August 2024', verdict_lines: pick(E('A5spike/tla174/run174.log'), 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)', 'Error: Error: unrecognized option: -dumpTrace') },
      { id: '1.8.0-default', purpose: 'default flags, deadlock checking on', verdict_lines: pick(E('A5r3/tla/run.log'), { from: '##### 1.8.0 default', to: 'exit=0' }) },
      { id: '1.8.0-deadlock', purpose: '-deadlock turns deadlock checking off; the invariant is violated', verdict_lines: pick(E('A5r3/tla/run.log'), { from: '##### 1.8.0 -deadlock', to: 'The depth of the complete state graph search is 5.' }) },
      { id: '1.8.0-dumptrace', purpose: '-dumpTrace json writes the counterexample as JSON', verdict_lines: pick(E('A5r3/tla/run.log'), { from: '##### 1.8.0 -dumpTrace json', to: '-rw-r--r-- 1 root root 1786' }), outputs: [E('A5r3/tla/t1.8.0.json')] },
      { id: '1.7.4-default', purpose: 'the fallback jar, default flags', version: '2.19 of 08 August 2024', verdict_lines: pick(E('A5r3/tla/run.log'), { from: '##### 1.7.4 default', to: 'exit=0' }) },
      { id: '1.7.4-deadlock', purpose: 'the fallback jar with -deadlock', version: '2.19 of 08 August 2024', verdict_lines: pick(E('A5r3/tla/run.log'), { from: '##### 1.7.4 -deadlock', to: 'The depth of the complete state graph search is 5.' }) },
      { id: '1.7.4-dumptrace', purpose: 'the fallback jar rejects -dumpTrace', version: '2.19 of 08 August 2024', verdict_lines: pick(E('A5r3/tla/run.log'), '##### 1.7.4 -dumpTrace json', 'Error: Error: unrecognized option: -dumpTrace') },
      { id: 'a5spike-1.8.0-deadlock-off', purpose: 'the earlier A5 spike session, with its banner: -deadlock on the 1.8.0 jar, one TLC worker', budget: { workers: 1 }, verdict_lines: pick(E('A5spike/tla174/dl-1.8.0.log'), 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)', { prefix: 'Running breadth-first search Model-Checking with fp 69' }, 'Error: Invariant NoOverspend is violated.', '12 states generated, 11 distinct states found, 2 states left on queue.', 'The depth of the complete state graph search is 5.') },
      { id: 'a5spike-1.7.4-deadlock-off', purpose: 'the same on the 1.7.4 jar', version: '2.19 of 08 August 2024', budget: { workers: 1 }, verdict_lines: pick(E('A5spike/tla174/dl-1.7.4.log'), 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)', 'Error: Invariant NoOverspend is violated.', '12 states generated, 11 distinct states found, 2 states left on queue.') },
      { id: 'a5spike-1.8.0-four-workers', purpose: 'the same with four TLC workers: the count of generated states changes, the distinct count does not', budget: { workers: 4 }, verdict_lines: pick(E('A5spike/tla174/dlw4.log'), { prefix: 'Running breadth-first search Model-Checking with fp 66' }, '13 states generated, 11 distinct states found, 0 states left on queue.') },
    ],
    unrecorded: {
      argv: 'the logs print the TLC output, not the java command line (W0-S11 re-runs TLC with argv for RUN-tlc-atomic, RUN-tlc-unsafe-3w and RUN-tlc-full)',
      binary_sha256: 'the logs print the build banner, not the jar hash; RUN-tlc-jars hashes the jar of that build (5bd7b64d...)',
      image: 'the banner shows TLC as process 1 in a container on Eclipse Adoptium 21.0.12.1, not the image name; RESULTS.md names eclipse-temurin:21-jre for the 2026-10-20 session',
      exit_code: "one per configuration; run.log's exit=0 lines are not TLC's own codes for the sections they close",
    },
    notes: [
      "'Two workers' in the spine is the spec's constant Workers = {w1, w2}; TLC itself ran with one worker thread, as the banners of the A5 spike session say.",
      'Two sessions on 2026-10-21 agree: the A5 spike session (the top level and the a5spike configurations, whose banners name the host and the worker count) and the later A5r3 session (run.log, filtered to the verdicts).',
      'The logs give local times (2026-10-21 05:50 and 15:51) without a zone, so started_at holds the date.',
    ],
  },
  {
    id: 'RUN-tlc-atomic',
    title: 'The atomic variant: no error, 4 distinct states; three workers at Amount 40: 8 distinct',
    engine: 'tlc',
    version: '1.8.0 nightly of 2026-10-20',
    binary: 'tla2tools.jar 1.8.0 nightly of 2026-10-20 (RESULTS.md)',
    image: 'eclipse-temurin:21-jre',
    started_at: '2026-10-20',
    inputs: [['research/spikes/tla/DoubleSpendAtomic.tla', 'spec'], ['research/spikes/tla/DoubleSpendAtomic.cfg', 'config'], ['research/spikes/tla/A3.cfg', 'config']],
    outputs: [RESULTS],
    verdict_lines: pick(RESULTS, { prefix: '- `DoubleSpendAtomic.tla` (guard + write in one action)' }),
    values: { two_workers: { result: 'no error', distinct_states: 4, states_generated: 5, depth: 3 }, three_workers_amount_40: { result: 'no error', distinct_states: 8, depth: 4 } },
    unrecorded: { argv: 'RESULTS.md records the counts, not the command line', binary_sha256: 'RESULTS.md does not hash the jar', exit_code: 'RESULTS.md does not record it' },
  },
  {
    id: 'RUN-tlc-full',
    title: 'The full reachable space of the unsafe spec for 2 to 5 workers: 11, 45, 191 and 813 distinct states',
    engine: 'tlc',
    version: '2.19 of 08 August 2024',
    binary: 'tla2tools.jar 1.7.4, per browser-runs.log',
    started_at: '2026-10-21',
    inputs: [[E('A5r3/tla/DoubleSpend.tla'), 'spec'], [E('A5r3/tla/Full3.cfg'), 'config'], [E('A5r3/tla/Full4.cfg'), 'config'], [E('A5r3/tla/Full5.cfg'), 'config'], ['research/spikes/tla/DoubleSpendFull.cfg', 'config']],
    outputs: [E('A5r3/tla/run-full.log'), BROWSER_LOG, RESULTS],
    verdict_lines: pick(E('A5r3/tla/run-full.log'), '## workers=3', '67 states generated, 45 distinct states found, 0 states left on queue.', '## workers=4', '361 states generated, 191 distinct states found, 0 states left on queue.', '## workers=5', '1911 states generated, 813 distinct states found, 0 states left on queue.'),
    values: { distinct_states: { 2: 11, 3: 45, 4: 191, 5: 813 }, depth: { 2: 5, 3: 7, 4: 9, 5: 11 } },
    configs: [
      { id: 'w3-w5', purpose: 'three to five workers, invariant off (Full3.cfg to Full5.cfg); browser-runs.log names the jar 1.7.4', verdict_lines: pick(E('A5r3/tla/run-full.log'), { from: '## workers=3', to: 'The depth of the complete state graph search is 11.' }) },
      { id: 'w2-results', purpose: 'two workers, invariant off (DoubleSpendFull.cfg), as RESULTS.md records it on the 1.8.0 nightly', version: '1.8.0 nightly of 2026-10-20', started_at: '2026-10-20', verdict_lines: pick(RESULTS, { prefix: '- `DoubleSpend.tla` (read step and write step separate' }) },
    ],
    unrecorded: { argv: "the log prints a label per worker count, not the command line", binary_sha256: 'the log does not hash the jar', image: 'the log does not name the container image', exit_code: 'the log does not record it', 'environment.os': 'the log is filtered to the counts', 'environment.cpu_count': 'the log is filtered to the counts' },
    notes: ['Spectacle at 5827c22 found the same four counts (RUN-spectacle).'],
  },
  {
    id: 'RUN-tlc-unsafe-3w',
    title: 'The unsafe spec with three workers at Amount 40: violated, 69 distinct states when found',
    engine: 'tlc',
    version: '1.8.0 nightly of 2026-10-20',
    binary: 'tla2tools.jar 1.8.0 nightly of 2026-10-20 (RESULTS.md)',
    image: 'eclipse-temurin:21-jre',
    started_at: '2026-10-20',
    inputs: [['research/spikes/tla/DoubleSpend.tla', 'spec'], ['research/spikes/tla/U3.cfg', 'config']],
    outputs: [RESULTS],
    verdict_lines: pick(RESULTS, '- Unsafe with 3 workers, Amount=40: violated; 89 generated, 69 distinct when found, depth 7.'),
    values: { result: 'violated', distinct_states: 69, states_generated: 89, depth: 7 },
    unrecorded: { argv: 'RESULTS.md records the counts, not the command line', binary_sha256: 'RESULTS.md does not hash the jar', exit_code: 'RESULTS.md does not record it' },
  },
  {
    id: 'RUN-tlc-rtw3',
    title: 'The read, check and write split: a 7-state, 6-action trace; 20 distinct states',
    engine: 'tlc',
    version: '2026.10.20.183001',
    version_string: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
    binary: TLC_A2R3_BINARY,
    binary_sha256: TLC180_SHA,
    started_at: '2026-10-21',
    budget: { workers: 1 },
    inputs: [[E('a2r3/tla/rtw3/RTW3.tla'), 'spec'], [E('a2r3/tla/rtw3/RTW3.cfg'), 'config']],
    outputs: [TLC_RUNS, E('a2r3/tla/rtw3/RTW3.trace.json')],
    verdict_lines: pick(TLC_RUNS, { from: '===== RTW3 stop-at-first-violation', to: 'The depth of the complete state graph search is 7.' }),
    values: { result: 'violated', invariant: 'NoOverspend', trace_states: 7, trace_actions: 6, distinct_states: 20, states_generated: 26, depth: 7, continue_states_generated: 27 },
    primary_config: 'stop-at-first-violation',
    configs: [
      { id: 'stop-at-first-violation', purpose: 'default stop at the first violation, -workers 1', budget: { workers: 1 }, verdict_lines: pick(TLC_RUNS, { from: '===== RTW3 stop-at-first-violation', to: 'The depth of the complete state graph search is 7.' }) },
      { id: 'continue', purpose: '-continue explores everything: the same 20 distinct states', budget: { workers: 1 }, verdict_lines: pick(TLC_RUNS, '===== RTW3 -continue (TLC 1.8.0 build 2026.10.20.183001, -workers 1)', '27 states generated, 20 distinct states found, 0 states left on queue.') },
    ],
    unrecorded: { argv: "the log's section headers name the flags (-workers 1, -continue), not the whole command line", image: 'the log does not name the container image', exit_code: 'the log does not record it', 'environment.os': 'the log is filtered to the verdicts', 'environment.cpu_count': 'the log is filtered to the verdicts' },
  },
  {
    id: 'RUN-tlc-hold-lasso',
    title: 'The Hold spec with fairness on Try and Busy only: EventuallyResolves is violated by a lasso that closes back to state 1',
    engine: 'tlc',
    version: '2026.10.20.183001',
    binary: TLC_A2R3_BINARY,
    binary_sha256: TLC180_SHA,
    started_at: '2026-10-21',
    inputs: [[E('a2r3/tla/live/Hold.tla'), 'spec'], [E('a2r3/tla/live/Hold.cfg'), 'config']],
    outputs: [TLC_RUNS, E('a2r3/tla/live/Hold.trace.json')],
    verdict_lines: pick(TLC_RUNS, { from: '===== Hold (liveness lasso)', to: '9 states generated, 8 distinct states found, 0 states left on queue.' }),
    values: { result: 'violated', property: 'EventuallyResolves', back_to_state: 1, closing_action: 'Busy', distinct_states: 8, states_generated: 9 },
    unrecorded: { argv: 'the log holds the output, not the command line', image: 'the log does not name the container image', exit_code: 'the log does not record it', 'environment.os': 'the log is filtered to the verdicts', 'environment.cpu_count': 'the log is filtered to the verdicts' },
    notes: ['W0-S05 documents the 1.8.0 JSON lasso format from a fresh run (RUN-tlc-lasso-json).'],
  },
  {
    id: 'RUN-tlc-sym-liveness',
    title: 'With SYMMETRY and a liveness PROPERTY, TLC warns that it might miss violations of the liveness properties',
    engine: 'tlc',
    version: '2026.10.20.183001',
    binary: TLC_A2R3_BINARY,
    binary_sha256: TLC180_SHA,
    started_at: '2026-10-21',
    inputs: [[E('a2r3/tla/sym/Sym.tla'), 'spec'], [E('a2r3/tla/sym/Sym.cfg'), 'config']],
    outputs: [TLC_RUNS],
    verdict_lines: pick(TLC_RUNS, '===== Sym (symmetry + liveness)', { prefix: 'Warning: Declaring symmetry during liveness checking is dangerous.' }),
    values: { warning: 'Declaring symmetry during liveness checking is dangerous. It might cause TLC to miss violations of the stated liveness properties. Please check liveness without symmetry defined.' },
    unrecorded: { argv: 'the log holds the output, not the command line', image: 'the log does not name the container image', exit_code: 'the log does not record it', 'environment.os': 'the log is filtered to the verdicts', 'environment.cpu_count': 'the log is filtered to the verdicts' },
  },
  {
    id: 'RUN-tlc-fingerprint',
    title: 'TLC 1.8.0 prints fingerprint-collision estimates on a complete run',
    engine: 'tlc',
    version: '2026.10.20.183001',
    version_string: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
    binary: 'tla2tools.jar 1.8.0 (the log prints its banner, not its hash)',
    started_at: '2026-10-21',
    budget: { workers: 1 },
    inputs: [[E('exp/tla/Inc.tla'), 'spec'], [E('exp/tla/Inc.cfg'), 'config']],
    outputs: [E('exp/tla/inc-native.log'), E('exp/tla/inc-n.log')],
    verdict_lines: pick(E('exp/tla/inc-native.log'), 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)', 'Model checking completed. No error has been found.', '  Estimates of the probability that TLC did not check all reachable states', '  because two distinct states had the same fingerprint:', '  calculated (optimistic):  val = 8.3E-7', '  based on the actual fingerprints:  val = 2.1E-9', '8106621 states generated, 2986377 distinct states found, 0 states left on queue.'),
    values: { calculated: '8.3E-7', actual: '2.1E-9', distinct_states: 2986377, states_generated: 8106621, depth: 25 },
    environment: { os: 'Linux 6.12.63', cpu_count: 20, cpu_architecture: 'amd64', java: 'Eclipse Adoptium 21.0.12.1' },
    configs: [{ id: 'inc-n', purpose: 'a smaller instance of the same spec in the same session: only the calculated estimate is printed', verdict_lines: pick(E('exp/tla/inc-n.log'), 'Model checking completed. No error has been found.', '  calculated (optimistic):  val = 3.9E-11', '53704 states generated, 26260 distinct states found, 0 states left on queue.') }],
    unrecorded: { argv: 'the log holds the output, not the command line', binary_sha256: 'the log prints the build banner, not the jar hash', image: 'the banner shows a container (pid 1), not its image', exit_code: 'the log does not record it' },
    notes: ['The log gives local times (2026-10-21 01:33) without a zone, so started_at holds the date. It reports Finished in 07s.'],
  },
  {
    id: 'RUN-tlc-jars',
    title: 'The SHA-256 of the 1.8.0 and 1.7.4 tla2tools jars; the 1.8.0 build that ran is 2026.10.20.183001 (rev d2e1472)',
    engine: 'tlc',
    version: '2026.10.20.183001',
    version_string: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
    binary: 'tla2tools.jar 1.8.0 (and 1.7.4, under configs)',
    binary_sha256: TLC180_SHA,
    started_at: '2026-10-21',
    outputs: [TLC_RUNS],
    verdict_lines: pick(TLC_RUNS, 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)', 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)', 'sha256:', `${TLC180_SHA}  dl/tla180/tla2tools.jar`, `${TLC174_SHA}  dl/tla174/tla2tools.jar`),
    values: { 'tla2tools-1.8.0.jar': TLC180_SHA, 'tla2tools-1.7.4.jar': TLC174_SHA, build_1_8_0: '2026.10.20.183001 (rev: d2e1472)', build_1_7_4: '2.19 of 08 August 2024 (rev: 5a47802)' },
    configs: [{ id: '1.7.4', purpose: 'the fallback jar', version: '2.19 of 08 August 2024', binary_sha256: TLC174_SHA, verdict_lines: pick(TLC_RUNS, 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)', `${TLC174_SHA}  dl/tla174/tla2tools.jar`) }],
    unrecorded: { argv: "the log shows sha256sum's output lines, not the command", image: 'the hashes were taken outside any container', exit_code: 'the log does not record it', duration_s: 'not timed', 'environment.os': 'the log does not describe the host', 'environment.cpu_count': 'the log does not describe the host' },
    notes: ["The run's subject is the jars: binary_sha256 is the 1.8.0 jar's hash as sha256sum printed it, and the 1.7.4 jar's is under configs. The banners are the first lines each jar printed in the same log."],
  },
  {
    id: 'RUN-tlc-help',
    title: "The 1.8.0 and 1.7.4 help text: -deadlock means do not check for deadlock; -workers defaults to 1",
    engine: 'tlc',
    version: '2026.10.20.183001',
    binary: 'tla2tools.jar 1.8.0 and 1.7.4',
    outputs: [E('a2r3/out/tlc-help-tla180.txt'), E('a2r3/out/tlc-help-tla174.txt')],
    verdict_lines: pick(E('a2r3/out/tlc-help-tla180.txt'), { prefix: '\tTLC - provides model checking and simulation of TLA+ specifications - Version 2026.10.20.183001' }, '\t-deadlock', '\t\tif specified DO NOT CHECK FOR DEADLOCK. Setting the flag is', '\t-workers num', "\t\tthe number of TLC worker threads; defaults to 1. Use 'auto'", { prefix: '\t-dumpTrace format file' }),
    values: { deadlock_flag: 'if specified DO NOT CHECK FOR DEADLOCK', workers_default: 1, dumptrace_in_1_8_0: true, dumptrace_in_1_7_4: false },
    configs: [{ id: '1.7.4', purpose: 'the fallback jar: the same -deadlock and -workers text, and no -dumpTrace', version: '2.19 of 08 August 2024', verdict_lines: pick(E('a2r3/out/tlc-help-tla174.txt'), { prefix: '\tTLC - provides model checking and simulation of TLA+ specifications - Version 2.19 of 08 August 2024' }, '\t-deadlock', '\t\tif specified DO NOT CHECK FOR DEADLOCK. Setting the flag is', "\t\tthe number of TLC worker threads; defaults to 1. Use 'auto'") }],
    unrecorded: { argv: 'the files hold the help text, not the command that printed it', binary_sha256: 'the files do not hash the jars; RUN-tlc-jars does', image: 'the files do not name a container', started_at: 'the files are undated', exit_code: 'not recorded', duration_s: 'not timed', 'environment.os': 'not recorded', 'environment.cpu_count': 'not recorded' },
    notes: ['The 1.7.4 help text has no -dumpTrace line; GATE-numbers takes its list of TLC flags from these two files.'],
  },
  // ---------------------------------------------------------------- Spectacle, PostgreSQL, PGlite, browsers
  {
    id: 'RUN-spectacle',
    title: "Spectacle at 5827c22 matches TLC's 11, 45, 191 and 813 distinct states in three engines at 524 to 1,125 states/s",
    engine: 'spectacle',
    version: '5827c22',
    binary: 'Spectacle at commit 5827c22, served from research/evidence/A5v2/spectacle-run/site',
    image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
    started_at: '2026-10-21',
    inputs: [[E('A5r3/spec/test.mjs'), 'harness'], [E('A5r3/spec/server.mjs'), 'server'], [E('A5v2/spectacle-run/site/spectacle/js/eval.js'), 'engine'], [E('A5v2/spectacle-run/site/spectacle/js/worker.js'), 'engine']],
    outputs: [BROWSER_LOG],
    verdict_lines: pick(BROWSER_LOG, { prefix: '## 4. Spectacle @ 5827c22 (MIT)' }, { prefix: 'chromium {"w2":{"distinct":11' }, { prefix: 'firefox  {"w2":{"distinct":11' }, { prefix: 'webkit   {"w2":{"distinct":11' }, { prefix: '# TLC 1.7.4 full reachable (tla/run-full.log)' }),
    values: { distinct_states: { w2: 11, w3: 45, w4: 191, w5: 813 }, states_per_s: { chromium: [550, 1125, 1055, 902], firefox: [524, 763, 758, 650], webkit: [524, 1023, 1011, 946] }, trace_length_w2: 5 },
    unrecorded: { argv: "the log names the harness (spec/test.mjs) and the site; the command line is not recorded", binary_sha256: 'the log does not hash the Spectacle files', exit_code: 'the log does not record it', duration_s: 'the log times each exploration, not the run', 'environment.os': 'the log names the container image, not the host', 'environment.cpu_count': 'the log names the container image, not the host' },
  },
  {
    id: 'RUN-pg-anomalies',
    title: 'PostgreSQL 18.6: the isolation table of RESULTS.md (conditional UPDATE, read-modify-write, write skew, NULL, 22003)',
    engine: 'postgres',
    version: '18.6',
    binary: 'PostgreSQL 18.6 in the postgres:18 image',
    image: 'postgres:18',
    started_at: '2026-10-20',
    inputs: [['research/spikes/pg_anomalies.py', 'script']],
    outputs: [RESULTS],
    verdict_lines: pick(RESULTS, '## PostgreSQL 18.6 (docker `postgres:18`), script: `spikes/pg_anomalies.py` (psycopg 3)', { prefix: '| Two concurrent `UPDATE acct SET bal = bal - 80' }, { prefix: '| App-level read-modify-write' }, { prefix: '| Same read-modify-write | REPEATABLE READ' }, { prefix: '| Write skew:' }, { prefix: '| Same write skew | SERIALIZABLE' }, { prefix: '| `CHECK (bal >= 0)` with' }, { prefix: '| `UPDATE … SET bal = bal - 10 WHERE bal >= 10`' }, { prefix: '| `9223372036854775807::bigint + 1`' }),
    values: { conditional_update_rc_final_bal: 20, rmw_rc_spent: 160, rmw_rr_sqlstate: '40001', write_skew_rr_team_total: -100, write_skew_serializable_sqlstate: '40001', overflow_sqlstate: '22003' },
    unrecorded: { argv: "RESULTS.md records the table, not the command line; the script reads its DSN from PG_DSN", binary_sha256: 'RESULTS.md does not hash the server binary', exit_code: 'RESULTS.md does not record it', 'environment.os': 'RESULTS.md does not describe the host', 'environment.cpu_count': 'RESULTS.md does not describe the host' },
    notes: ['RESULTS.md is the record (spine precedence item 2); the script is on disk, its output log is not. RUN-pg-claims repeats these experiments with a log.'],
  },
  {
    id: 'RUN-pg-claims',
    title: 'PostgreSQL 18.6 and 17.11: the isolation experiments plus holds write skew, 40P01, NULL amount, unknown account, sum(bigint) as numeric and the CASE self-transfer',
    engine: 'postgres',
    version: '18.6',
    version_string: 'PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)',
    binary: 'PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2), with psycopg-binary from uv',
    inputs: [[E('a2r3/scripts/pg_claims.py'), 'script']],
    outputs: [E('a2r3/out/pg_claims.txt')],
    verdict_lines: (() => { const all = read(E('a2r3/out/pg_claims.txt')).split('\n'); const i = all.indexOf('server: PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)'); const j = all.indexOf('server: PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)'); return all.slice(i, j).filter((l) => l !== ''); })(),
    values: { e3_holds_write_skew_rr: 'both commit; total held 160 vs bal 100', e4_sqlstate: '40P01', e6_overflow_sqlstate: '22003', e6_sum_type: 'numeric', e7_case_self_transfer_final: 70, e7_two_updates_final: 100 },
    primary_config: '18.6',
    configs: [
      { id: '18.6', purpose: 'the experiments on PostgreSQL 18.6', version: '18.6', verdict_lines: pick(E('a2r3/out/pg_claims.txt'), 'server: PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)') },
      { id: '17.11', purpose: 'the same experiments on PostgreSQL 17.11: the same outcomes', version: '17.11', verdict_lines: (() => { const all = read(E('a2r3/out/pg_claims.txt')).split('\n'); const j = all.indexOf('server: PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)'); return all.slice(j).filter((l) => l !== ''); })() },
    ],
    unrecorded: { argv: 'the log holds the output; the script gives no usage line', binary_sha256: 'the log does not hash the server binaries', image: 'the log names the servers, not their images', started_at: 'the log is undated', exit_code: 'the log does not record it', 'environment.os': 'the log does not describe the host', 'environment.cpu_count': 'the log does not describe the host' },
  },
  {
    id: 'RUN-pglite',
    title: 'Under Node, PGlite 0.5.10 reports PostgreSQL 18.6; overflow is 22003; a NULL-amount update affects 0 rows; two workers serialize',
    engine: 'pglite',
    version: '0.5.10',
    version_string: 'PostgreSQL 18.6 (PGlite 0.5.10) on wasm32-unknown-emscripten, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.5 (1db513782be24469589d7cb8a1f1834e9a33f271), 32-bit',
    binary: '@electric-sql/pglite 0.5.10 from npm',
    started_at: '2026-10-21T16:13:09Z',
    inputs: [[E('A5r3/scripts/pglite.mjs'), 'script'], [E('A5r3/scripts/pglite-tx.mjs'), 'script'], [E('a2r3/scripts/pglite_check.mjs'), 'script'], [E('a2r3/node/pglite/package.json'), 'manifest'], [E('a2r3/node/pglite/package-lock.json'), 'lockfile']],
    outputs: [E('A5r3/pglite.log'), E('a2r3/out/pglite.txt')],
    verdict_lines: pick(E('A5r3/pglite.log'), '# pglite 0.5.10 under node, 2026-10-21T16:13:09Z', { prefix: '1003ms PostgreSQL 18.6 (PGlite 0.5.10)' }, 'overflow error 22003 bigint out of range', 'NULL-amount guarded update rowCount 0 rows []', 'default isolation read committed', '1ms W1 read 100', '303ms W1 wrote 20', '304ms W2 read 20', '306ms final bal 20'),
    values: { server_version: 'PostgreSQL 18.6', overflow_sqlstate: '22003', null_amount_rows: 0, default_isolation: 'read committed', serialized_final_bal: 20 },
    configs: [{ id: 'a2r3-check', purpose: 'pglite_check.mjs: a second transaction issued while the first is open only starts after it', verdict_lines: pick(E('a2r3/out/pglite.txt'), { prefix: 'T1 begin | T1 read 100 | (T2 started while T1 open? false)' }, 'final bal -60', 'overflow: 22003 bigint out of range') }],
    unrecorded: { argv: 'the logs hold the output; the scripts give usage lines with a package directory argument', binary_sha256: 'the log does not hash the package', image: 'the log names Node, not a container', exit_code: 'the log does not record it', 'environment.os': 'the log does not describe the host', 'environment.cpu_count': 'the log does not describe the host' },
  },
  {
    id: 'RUN-browser-origin',
    title: 'An opaque-origin sandbox fails in Chromium; a separate origin with a module worker runs Z3 in three engines and cannot read the parent storage',
    engine: 'chromium',
    version: '153.0.8010.12',
    binary: 'Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6 in the Playwright image',
    image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
    started_at: '2026-10-21',
    inputs: [[E('A5r3/sbx/test.mjs'), 'harness'], [E('A5r3/sbx/server.mjs'), 'server'], [E('A5r3/xorigin/test.mjs'), 'harness'], [E('A5r3/xorigin/server.mjs'), 'server'], [E('A5r3/xorigin/inst/worker.mjs'), 'worker']],
    outputs: [BROWSER_LOG],
    verdict_lines: pick(BROWSER_LOG, { prefix: '## 2. Opaque-origin sandbox' }, { prefix: 'module chromium {"frame":{"ls":"blocked:SecurityError","origin":"null","kind":"module"},"err":"worker error' }, { prefix: '## 3. Separate instrument origin' }, { prefix: 'chromium {"frame":{"origin":"http://localhost:8081","parentLedger":"blocked:SecurityError"}' }, { prefix: 'firefox  {"frame":{"origin":"http://localhost:8081","parentLedger":"blocked:SecurityError"}' }, { prefix: 'webkit   {"frame":{"origin":"http://localhost:8081","parentLedger":"blocked:SecurityError"}' }),
    values: { opaque_origin_chromium: 'worker error', separate_origin: { chromium: 'z3 5.3.1 sat', firefox: 'z3 5.3.1 sat', webkit: 'z3 5.3.1 sat' }, parent_storage: 'blocked:SecurityError', cache_api: true },
    unrecorded: { argv: 'the log names the harnesses, not the command lines', binary_sha256: 'the log does not hash the browsers', exit_code: 'the log does not record it', duration_s: 'the log times the engines, not the run', 'environment.os': 'the log names the container image, not the host', 'environment.cpu_count': 'the log names the container image, not the host' },
    notes: ['The log also records that CDP throttling did not reach the cross-origin worker; it was discarded as a phone proxy.'],
  },
];

/** The runs whose records the re-run scripts write (they import the record built here as a configuration). */
export const RERUN_IDS = new Set(['RUN-tlc-atomic', 'RUN-tlc-unsafe-3w', 'RUN-tlc-full', 'RUN-lean-selftransfer', 'RUN-lean-ledger', 'RUN-cvc5-alethe']);

export function importedRecord(id) {
  const spec = SPECS.find((s) => s.id === id);
  if (!spec) throw new Error(`no import spec for ${id}`);
  return build(spec);
}

// ------------------------------------------------------------------ main
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = new Set(args.filter((a) => a.startsWith('RUN-')));
  const spine = spineRecords();
  const executed = [...spine.keys()];
  const missing = executed.filter((id) => !SPECS.some((s) => s.id === id));
  if (missing.length > 0) {
    console.error(`no import spec for ${missing.join(', ')}`);
    process.exit(1);
  }
  let written = 0;
  let differ = 0;
  for (const spec of SPECS) {
    if (only.size > 0 && !only.has(spec.id)) continue;
    if (RERUN_IDS.has(spec.id) && !only.has(spec.id)) continue;
    const record = build(spec, spine);
    const file = path.join(REPO, 'runs', `${spec.id}.json`);
    if (check) {
      const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      const strip = (r) => JSON.stringify({ ...r, recorded_at: null });
      if (!old || strip(old) !== strip(record)) {
        differ += 1;
        console.log(`differs: ${spec.id}`);
      }
      continue;
    }
    fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    written += 1;
  }
  if (check) {
    console.log(differ === 0 ? 'import-research: every imported record equals a fresh import' : `import-research: ${differ} records differ`);
    process.exit(differ === 0 ? 0 : 1);
  }
  console.log(`import-research: wrote ${written} records (${executed.length} executed runs in the spine; ${RERUN_IDS.size} written by the re-run scripts); host ${JSON.stringify(hostEnvironment())}`);
}
