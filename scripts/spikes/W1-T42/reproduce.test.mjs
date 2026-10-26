// Tests of how a run is re-executed and compared (lib/reproduce.mjs).
// Run: node --test scripts/spikes/W1-T42/reproduce.test.mjs
//
// Two tests start the real engines (see engines.test.mjs for the cache and W1T42_NO_ENGINES).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REPO, createEngines } from './lib/engines.mjs';
import { echoEngine, inDirectory, readOnlyScratchDir, scratchDir, specimenTree, writeTree } from './lib/fixtures.mjs';
import { NOT_RE_EXECUTABLE, RECIPES, extractHarnessPython, isAnnotation, matchInOrder, normalizeLine, reproduceRun } from './lib/reproduce.mjs';
import { readSpineSpecimens } from './lib/specimens.mjs';

const skipEngines = process.env.W1T42_NO_ENGINES === '1' ? 'W1T42_NO_ENGINES=1' : false;
const readRun = (id) => JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${id}.json`), 'utf8'));
const echoEngines = () => ({ cacheDir: '/nonexistent', native: async () => echoEngine('native'), pyodide: async () => echoEngine('pyodide') });

test('times are masked and a harness log prefix is removed; nothing else changes', () => {
  assert.equal(normalizeLine('[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]'), '[1.2 starter: overdraft search] sat (<t>) [b = 0, amount = 1, a = 0]');
  assert.equal(normalizeLine('2806ms py: rlimit-case unknown canceled 1.1 s'), 'rlimit-case unknown canceled <t>');
  assert.equal(normalizeLine('pow-unknown unknown smt tactic failed 0.014 s'), 'pow-unknown unknown smt tactic failed <t>');
  assert.equal(normalizeLine('# z3py in pyodide 314.0.7 under node v22.22.2, 2026-10-21T16:12:38Z'), '# z3py in pyodide 314.0.7 under node v22.22.2, <ts>');
  assert.equal(normalizeLine('[1.3 guard added] unsat (0.00s) '), '[1.3 guard added] unsat (<t>)');
  // Numbers that are values stay: a model, a bit width, a section number, a word that ends in s.
  assert.equal(normalizeLine('[A = 9223372036854775806, X = 4194304] BitVec64 mod 2^64 [A2.1 stated theorem] x**y == 8'), '[A = 9223372036854775806, X = 4194304] BitVec64 mod 2^64 [A2.1 stated theorem] x**y == 8');
});

test('a harness banner or header is an annotation; a verdict line is not', () => {
  assert.ok(isAnnotation('=== z3-solver 5.3.1.0'));
  assert.ok(isAnnotation('# z3py in pyodide 314.0.7'));
  assert.ok(!isAnnotation('[1.2 starter] sat'));
  assert.ok(!isAnnotation('rlimit-case unknown canceled 1.1 s'));
});

test('every recorded line must come back, in order; extra lines in the fresh run are fine', () => {
  const recorded = ['=== banner', '[a] sat (0.01s) [x = 1]', '[b] unsat'];
  assert.deepEqual(matchInOrder(recorded, ['noise', '[a] sat (0.00s) [x = 1]', 'more noise', '[b] unsat', 'tail']), { ok: true, expected: 2, matched: 2, missing: null });
  const wrongOrder = matchInOrder(recorded, ['[b] unsat', '[a] sat (0.00s) [x = 1]']);
  assert.equal(wrongOrder.ok, false);
  assert.equal(wrongOrder.missing.line, '[b] unsat');
  const other = matchInOrder(recorded, ['[a] sat (0.00s) [x = 2]', '[b] unsat']);
  assert.equal(other.ok, false, 'a witness that is not the recorded one is not a reproduction (this is the same engine, not the cross-engine rule)');
  assert.equal(other.matched, 0);
});

test('a line whose tail depends on the machine is compared up to its verdict only', () => {
  const fuzzy = RECIPES[0].fuzzy;
  const recorded = ['[Quantified: forall k. f(k) > f(k+1), f(0)=0] unknown (4.44s) smt tactic failed to show goal to be sat/unsat (incomplete quantifiers)'];
  assert.ok(matchInOrder(recorded, ['[Quantified: forall k. f(k) > f(k+1), f(0)=0] unknown (5.00s) timeout'], fuzzy).ok, 'a slower machine reaches the 5 s limit first');
  assert.ok(!matchInOrder(recorded, ['[Quantified: forall k. f(k) > f(k+1), f(0)=0] sat (0.10s) [f = 1]'], fuzzy).ok, 'but the verdict itself must be unknown');
  assert.ok(!matchInOrder(['[Int x**y == 8, y>1] unknown (0.00s) incomplete (theory arithmetic)'], ['[Int x**y == 8, y>1] unknown (0.00s) timeout'], fuzzy).ok, 'no other line is fuzzy');
});

test('the Python inside the two imported Node harnesses is read out of the scripts themselves', () => {
  const dir = path.join(REPO, 'research', 'evidence', 'A5r3', 'scripts');
  const whole = extractHarnessPython('z3unk.mjs', fs.readFileSync(path.join(dir, 'z3unk.mjs'), 'utf8'));
  assert.match(whole.whole, /recipient-wrap/);
  assert.match(whole.whole, /pow-unknown/);
  const cases = extractHarnessPython('z3py.mjs', fs.readFileSync(path.join(dir, 'z3py.mjs'), 'utf8'));
  assert.deepEqual(Object.keys(cases.cases), ['starter', 'bv', 'timeout', 'rlimit']);
  assert.match(cases.cases.timeout, /s\.set\('timeout', 2000\)/);
  assert.match(cases.cases.rlimit, /s\.set\('rlimit', 5000000\)/);
  assert.equal(extractHarnessPython('other.mjs', 'anything'), null);
});

test('the seven runs on disk behind SP-1.1 to SP-1.10 are each re-executed by a recipe or excused with a reason', () => {
  // These are the executed runs that spine 5.1 names for S1 at W0. Runs that W1-T12 records later join the spine's cells;
  // a run that no recipe covers is then recorded only in the gate, and this test does not list it.
  const sevenRuns = ['RUN-phone-pyodide', 'RUN-z3-bv64', 'RUN-z3-bv64-pyodide', 'RUN-z3-budget-pyodide', 'RUN-z3-optimize-min', 'RUN-z3-starter', 'RUN-z3-unknown-pow'];
  const { specimens } = readSpineSpecimens(REPO);
  const behindS1 = new Set(specimens.filter((s) => s.stage === 'S1').flatMap((s) => [...s.executed, ...s.pending]));
  for (const id of sevenRuns) {
    assert.ok(behindS1.has(id), `${id} is behind an S1 specimen`);
    const run = readRun(id);
    const recipe = RECIPES.find((r) => r.applies(run));
    assert.ok(recipe || NOT_RE_EXECUTABLE[id], `${id} has neither a recipe nor a reason`);
    assert.ok(!(recipe && NOT_RE_EXECUTABLE[id]), `${id} is both re-executed and excused`);
  }
  assert.deepEqual(sevenRuns.filter((id) => NOT_RE_EXECUTABLE[id]), ['RUN-phone-pyodide']);
});

test('a run in a fixture tree reproduces, diverges, drifts, or is recorded only, as it should', async () => {
  const root = writeTree(scratchDir('reproduce-'), specimenTree());
  const ctx = { root, engines: echoEngines(), memo: new Map() };
  const a = JSON.parse(fs.readFileSync(path.join(root, 'runs/RUN-fx-a.json'), 'utf8'));
  const ok = await reproduceRun('RUN-fx-a', a, ctx);
  assert.equal(ok.state, 'reproduced');
  assert.equal(ok.recipe, 'z3-inputs');
  assert.deepEqual([ok.matched, ok.expected], [2, 2]);

  const tampered = await reproduceRun('RUN-fx-a', { ...a, verdict_lines: ['[q1] unsat (0.00s) [x = 1]'] }, ctx);
  assert.equal(tampered.state, 'diverged');
  assert.match(tampered.detail, /\[q1\] unsat/);
  assert.match(tampered.detail, /the run printed "\[q1\] sat \(<t>\) \[x = 1\]"/);

  const drifted = await reproduceRun('RUN-fx-a', { ...a, version: '5.2.0' }, ctx);
  assert.equal(drifted.state, 'diverged');
  assert.match(drifted.detail, /re-record the run on the new pin/);

  const lean = await reproduceRun('RUN-fx-a', { ...a, engine: 'lean' }, ctx);
  assert.equal(lean.state, 'recorded-only');
  assert.match(lean.detail, /no recipe re-executes engine lean/);

  const empty = await reproduceRun('RUN-fx-a', { ...a, verdict_lines: ['# only a header'] }, ctx);
  assert.equal(empty.state, 'recorded-only');

  const gone = await reproduceRun('RUN-fx-a', { ...a, inputs: [{ ...a.inputs[0], path: 'runs/inputs/fx/nope.py' }] }, ctx);
  assert.equal(gone.state, 'error');
  assert.match(gone.detail, /is not in the repository/);

  const phone = await reproduceRun('RUN-phone-pyodide', readRun('RUN-phone-pyodide'), ctx);
  assert.equal(phone.state, 'recorded-only');
  assert.match(phone.detail, /browser matrix/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('one execution serves every run that uses the same script', async () => {
  const root = writeTree(scratchDir('reproduce-memo-'), specimenTree());
  let calls = 0;
  const counting = { ...echoEngine('native'), run: async (job) => { calls += 1; return echoEngine('native').run(job); } };
  const ctx = { root, engines: { cacheDir: '/x', native: async () => counting, pyodide: async () => echoEngine('pyodide') }, memo: new Map() };
  const a = JSON.parse(fs.readFileSync(path.join(root, 'runs/RUN-fx-a.json'), 'utf8'));
  await reproduceRun('RUN-fx-a', a, ctx);
  await reproduceRun('RUN-fx-a-again', a, ctx);
  assert.equal(calls, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

// Where a script runs. The records quote `python -I <script>` and the W1-T12 scripts write smt2/<query>.smt2 beside
// themselves: run in the directory the gate was started in, they fill the tree being checked and fail on a read-only
// checkout. Each run gets a scratch directory of its own instead.
test('each script runs in a scratch directory made for that one run: empty at its start, gone at its end, never the tree being checked', async () => {
  const root = writeTree(scratchDir('reproduce-cwd-'), specimenTree());
  const started = scratchDir('reproduce-started-');
  const seen = [];
  const spy = (id) => ({
    ...echoEngine(id),
    run: async (job) => {
      assert.ok(job.cwd, `the ${id} run is given a working directory`);
      for (const other of [process.cwd(), root, started]) assert.notEqual(fs.realpathSync(job.cwd), fs.realpathSync(other), 'it is not a directory the gate stands in or checks');
      assert.deepEqual(fs.readdirSync(job.cwd), [], 'it starts empty');
      fs.mkdirSync(path.join(job.cwd, 'smt2'));
      fs.writeFileSync(path.join(job.cwd, 'smt2', 'q.smt2'), 'what the script saved');
      seen.push({ engine: id, cwd: job.cwd });
      return echoEngine(id).run(job);
    },
  });
  const ctx = { root, engines: { cacheDir: '/x', native: async () => spy('native'), pyodide: async () => spy('pyodide') }, memo: new Map() };
  const a = JSON.parse(fs.readFileSync(path.join(root, 'runs/RUN-fx-a.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(root, 'runs/RUN-fx-b.json'), 'utf8'));
  // A record with a pyodide-node configuration re-runs its script on Pyodide as well, which is a second run with a directory of its own.
  const both = { ...a, configs: [{ id: 'pyodide-node', verdict_lines: a.verdict_lines }] };
  const results = await inDirectory(started, async () => [await reproduceRun('RUN-fx-a', both, ctx), await reproduceRun('RUN-fx-b', b, ctx)]);
  assert.deepEqual(results.map((r) => r.state), ['reproduced', 'reproduced']);
  assert.deepEqual(seen.map((s) => s.engine), ['native', 'pyodide', 'native']);
  assert.equal(new Set(seen.map((s) => s.cwd)).size, 3, 'every run has a directory of its own');
  for (const { cwd } of seen) assert.ok(!fs.existsSync(cwd), 'and it is removed afterwards');
  assert.deepEqual(fs.readdirSync(started), [], 'nothing reached the directory the gate was started in');
  assert.ok(!fs.existsSync(path.join(root, 'smt2')), 'nor the tree being checked');
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(started, { recursive: true, force: true });
});

test('the scratch directory of a run is removed when the engine throws', async () => {
  const root = writeTree(scratchDir('reproduce-throw-'), specimenTree());
  let cwd = null;
  const boom = { ...echoEngine('native'), run: async (job) => { cwd = job.cwd; fs.writeFileSync(path.join(cwd, 'half-written'), 'x'); throw new Error('the engine fell over'); } };
  const ctx = { root, engines: { cacheDir: '/x', native: async () => boom, pyodide: async () => echoEngine('pyodide') }, memo: new Map() };
  const a = JSON.parse(fs.readFileSync(path.join(root, 'runs/RUN-fx-a.json'), 'utf8'));
  await assert.rejects(reproduceRun('RUN-fx-a', a, ctx), /the engine fell over/);
  assert.ok(cwd && !fs.existsSync(cwd));
  fs.rmSync(root, { recursive: true, force: true });
});

test('a re-execution on the real engines leaves the directory it was started in empty: RUN-z3-double-capture saves smt2/ beside itself', { skip: skipEngines }, async () => {
  const started = scratchDir('reproduce-empty-cwd-');
  try {
    const ctx = { root: REPO, engines: createEngines(), memo: new Map() };
    // The record has a native and a pyodide-node configuration: both engines run the script.
    const r = await inDirectory(started, () => reproduceRun('RUN-z3-double-capture', readRun('RUN-z3-double-capture'), ctx));
    assert.equal(r.state, 'reproduced', r.detail);
    assert.ok(r.expected > 0 && r.matched === r.expected);
    assert.deepEqual(fs.readdirSync(started), [], 'no smt2/ folder, and nothing else');
  } finally {
    fs.rmSync(started, { recursive: true, force: true });
  }
});

test('a re-execution from a read-only working directory still reproduces, as it must on a read-only checkout', { skip: skipEngines }, async (t) => {
  const ro = readOnlyScratchDir('reproduce-ro-cwd-');
  if (!ro) return t.skip('this user can write to a mode 0555 directory (root can), so no directory is read-only for it');
  try {
    const ctx = { root: REPO, engines: createEngines(), memo: new Map() };
    const r = await inDirectory(ro.dir, () => reproduceRun('RUN-z3-double-capture', readRun('RUN-z3-double-capture'), ctx));
    assert.equal(r.state, 'reproduced', r.detail);
  } finally {
    ro.dispose();
  }
});

test('RUN-z3-optimize-min reproduces on the real native engine', { skip: skipEngines }, async () => {
  const ctx = { root: REPO, engines: createEngines(), memo: new Map() };
  const r = await reproduceRun('RUN-z3-optimize-min', readRun('RUN-z3-optimize-min'), ctx);
  assert.equal(r.state, 'reproduced', r.detail);
  assert.deepEqual([r.matched, r.expected], [2, 2]);
});

test('RUN-z3-bv64-pyodide reproduces on the real Pyodide engine, and a changed line does not', { skip: skipEngines }, async () => {
  const ctx = { root: REPO, engines: createEngines(), memo: new Map() };
  const run = readRun('RUN-z3-bv64-pyodide');
  const r = await reproduceRun('RUN-z3-bv64-pyodide', run, ctx);
  assert.equal(r.state, 'reproduced', r.detail);
  const planted = await reproduceRun('RUN-z3-bv64-pyodide', { ...run, verdict_lines: ['recipient-wrap unsat'] }, ctx);
  assert.equal(planted.state, 'diverged');
});
