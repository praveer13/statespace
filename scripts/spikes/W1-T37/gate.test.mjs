// W1-T37: GATE-calls end to end, as the lane runs it: real engines, real cvc5, content trees on disk.
//   node --test scripts/spikes/W1-T37/gate.test.mjs        (a few minutes: each run starts both engines, and cvc5 spends
//                                                          its 20 s limit on one quantified probe it cannot settle)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPO } from './lib/engines.mjs';
import { S1_FIXTURES } from './lib/planted.mjs';

const GATE = path.join(REPO, 'scripts', 'verify-calls.mjs');
/** The cells the first two verification rounds used to show faults (fixtures/probes/), all fixed. */
const PROBES = path.join(path.dirname(S1_FIXTURES), 'probes');

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [GATE, ...args], { cwd: REPO, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

/** A copy of the S1 fixtures to edit, removed when the test ends. */
function scratchTree(t, edit = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-gate-'));
  fs.cpSync(path.join(S1_FIXTURES, 'content'), path.join(root, 'content'), { recursive: true });
  edit(root);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const replaceIn = (root, rel, from, to) => {
  const file = path.join(root, rel);
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes(from), `${rel} holds "${from}"`);
  fs.writeFileSync(file, text.replace(from, to));
};

test('green on the S1 authored cells, with every unsat cross-checked by cvc5', async () => {
  const r = await run(['--root', S1_FIXTURES, '--json']);
  assert.equal(r.status, 0, r.stderr || r.stdout.slice(-2000));
  const report = JSON.parse(r.stdout);
  assert.equal(report.exit, 0);
  assert.equal(report.content.cells, 15);
  assert.equal(report.content.counts.calls, 12);
  assert.equal(report.content.counts.ran, 15);
  assert.equal(report.content.counts.unsatChecked, 9);
  assert.equal(report.content.counts.unsatConfirmed, 9);
  assert.deepEqual(report.content.findings, []);
  assert.ok(report.planted.cases.every((c) => c.pass));
  assert.deepEqual(report.planted.uncovered, []);
  assert.match(report.engines.cvc5, /^cvc5 1\.4\.2 \[git 282d5e0 on branch HEAD\] \(SHA-256 6aecddf46655/);
  assert.match(report.engines.native, /^native z3 5\.3\.1 /);
  assert.match(report.engines.pyodide, /^pyodide 314\.0\.7 with z3 5\.3\.1 /);
});

test('trips on a planted wrong expected verdict in a content page, and names the cell', async (t) => {
  const root = scratchTree(t, (r) => replaceIn(r, 'content/stages/S1/S1.L4.md', '@call key=A run=RUN-z3-conservation-noguard', '@call key=B run=RUN-z3-conservation-noguard'));
  const r = await run(['--root', root, '--json']);
  assert.equal(r.status, 1);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.content.findings.map((f) => [f.check, f.ref]), [['key', 'cell:S1.L4#1']]);
  assert.match(report.content.findings[0].detail, /unsat on both engines; key B \("counterexample"\) claims sat/);
  assert.ok(report.planted.cases.every((c) => c.pass), 'the planted fixtures still hold');
});

test('trips on a cell whose code changes its verdict, the key unchanged', async (t) => {
  // S1.L5's 64-bit conservation gains a + 1: the query turns sat while the key still says proved. And S1.L3's premise
  // query gains a premise that empties it, so the cell's print(s.model()) raises after its unsat: both are reported.
  const root = scratchTree(t, (r) => {
    replaceIn(r, 'content/stages/S1/S1.L5.md', 's.add(Not((A - X) + (B + X) == A + B))', 's.add(Not((A - X) + (B + X) == A + B + 1))');
    replaceIn(r, 'content/stages/S1/S1.L3.md', 's.add(a >= 0, b >= 0, amount > 0, amount <= a)', 's.add(a >= 0, b >= 0, amount > 0, amount <= a, a < 0)');
  });
  const r = await run(['--root', root]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL key +cell:S1\.L5#2: the called check is sat on both engines; key A \("proved"\) claims unsat/);
  assert.match(r.stdout, /FAIL run +cell:S1\.L3#1: native: the cell raised Z3Exception: model is not available \(line 7 of the cell\)/);
  assert.match(r.stdout, /FAIL key +cell:S1\.L3#1: the called check is unsat on both engines; key A \("`sat`"\) claims sat/);
  assert.match(r.stdout, /GATE-calls: FAIL$/m);
});

test("the verification rounds' probes are green: several queries in an SMT-LIB cell, bit-vector optima, quantified witnesses, error lines before an unsat", async () => {
  const r = await run(['--root', PROBES, '--json']);
  assert.equal(r.status, 0, r.stderr || r.stdout.slice(-3000));
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.content.findings, []);
  const rows = new Map(report.content.rows.map((row) => [row.ref, row]));
  assert.deepEqual([...rows.keys()].sort(), [
    ...['D-03#1', 'D-03#2', 'D-03#3', 'D-03#4', 'D-03#5', 'D-03#6', 'D-13#1', 'D-13#2', 'D-13#3', 'S1.L1#1', 'S1.L1#2', 'S1.L1#3'],
    ...['S2.L1#1', 'S2.L1#2', 'S2.L1#3', 'S2.L1#4', 'S2.L1#5'],
  ].map((x) => `cell:${x}`).sort());
  // the first round: every unsat at a second query confirmed by cvc5, and the 8-bit optimum from both sides
  assert.deepEqual(['S2.L1#1', 'S2.L1#2', 'S2.L1#3'].map((x) => rows.get(`cell:${x}`).cvc5.join('; ')), Array(3).fill('check 1 sat: confirmed; check 2 unsat: confirmed'));
  assert.match(rows.get('cell:S2.L1#5').cvc5.join('; '), /nothing below the optimum: confirmed; the optimum attained: confirmed/);
  // the second: quantified models hold on both engines (cvc5 confirming them), and an error line before an unsat
  // leaves its cross-check on the commands Z3 ran
  for (const x of ['D-03#1', 'D-03#2', 'D-03#3', 'D-03#4', 'D-03#5', 'D-03#6', 'S1.L1#1', 'S1.L1#3']) {
    assert.equal(rows.get(`cell:${x}`).cvc5.join('; '), 'check 1 native witness: confirmed; check 1 pyodide witness: confirmed', x);
  }
  assert.deepEqual(['D-13#1', 'D-13#2', 'D-13#3'].map((x) => [rows.get(`cell:${x}`).native, rows.get(`cell:${x}`).cvc5.join('; ')]), [
    ['unsat', 'check 1 unsat: confirmed'],
    ['unsat, unsat', 'check 1 unsat: confirmed; check 2 unsat: confirmed'],
    ['sat, unsat', 'check 1 sat: confirmed; check 2 unsat: confirmed'],
  ]);
  const c = report.content.counts;
  assert.deepEqual([c.calls, c.ran, c.unsatChecked, c.unsatConfirmed, c.optimaConfirmed], [4, 17, 7, 7, 1]);
});

test("a model that is not its query's fails witness on both engines, by Z3's own evaluation", async (t) => {
  // the second verification round's probe: the gate reads s's model through s.model(), and gets other's
  const root = scratchTree(t, (r) => {
    fs.mkdirSync(path.join(r, 'content', 'stages', 'S2'), { recursive: true });
    const code = "from z3 import *\na, amount = Ints('a amount')\nother = Solver()\nother.add(a == 0, amount == 0)\nother.check()\ns = Solver()\ns.add(amount > 0, a - amount < 0)\ns.model = other.model\nprint(s.check())";
    fs.writeFileSync(path.join(r, 'content', 'stages', 'S2', 'S2.L2.md'), ['---', 'id: S2.L2', 'tier: core', 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', '', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter call=false', '```python', code, '```', ':::', ''].join('\n'));
  });
  const r = await run(['--root', root, '--only', 'S2.L2', '--json']);
  assert.equal(r.status, 1, r.stdout.slice(-2000));
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.content.findings.map((f) => [f.check, f.detail]), [
    ['witness', 'check 2 on native: the model does not satisfy amount > 0'],
    ['witness', 'check 2 on pyodide: the model does not satisfy amount > 0'],
  ]);
});

test("the third verification round's probes: unknown in a divergence and in a key, and a budget each kind of check keeps", async (t) => {
  const front = (id) => ['---', `id: ${id}`, ...(id.startsWith('D-') ? [] : ['tier: core']), 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', ''];
  const options = (kind) => (kind === 'value' ? [['A', '`1`'], ['B', '`0`']] : [['A', '`sat`'], ['B', '`unsat`'], ['C', '`unknown`']]);
  const cellOf = (n, code, { lang = 'python', key = null, kind = 'verdict' } = {}) => [
    `:::instrument ins=INS-z3 cell=${n} recorded=RUN-z3-starter${key ? '' : ' call=false'}`,
    '```' + lang,
    code,
    '```',
    '',
    ...(key ? [`@call key=${key}`, 'Q?', '', ...options(kind).flatMap(([id, text]) => [`- ${id}. ${text}`, '  - why: w', ...(id === key ? [] : ['  - mis: dp:Z1'])])] : []),
    ':::',
    '',
  ];
  // a budget that Pyodide alone runs under (sys.platform), so native decides and Pyodide says unknown: a real divergence
  const platform = (guard) => `import sys\nfrom z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\nif sys.platform == 'emscripten':\n    s.set('rlimit', 1)\ns.add(a >= 0, b >= 0, amount > 0${guard}, a - amount < 0)\nprint(s.check())`;
  const starter = "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\nprint(s.check())";
  // two 18-bit primes whose product the query asks for: sat, which Z3 finds with no budget and not within the gate's
  const factoring = '(declare-const p (_ BitVec 36))\n(declare-const q (_ BitVec 36))\n(assert (bvugt p #x000000001))\n(assert (bvugt q #x000000001))\n(assert (bvult p #x000040000))\n(assert (bvult q #x000040000))\n(assert (= (bvmul p q) (_ bv10002200057 36)))\n(check-sat)';
  const setParam = "from z3 import *\nset_param('rlimit', 100)\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, amount <= b, a - amount < 0)\nprint(s.check())";
  const optSet = "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.set('rlimit', 100)\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\nprint(o.check())";
  const root = scratchTree(t, (r) => {
    const write = (rel, lines) => {
      fs.mkdirSync(path.dirname(path.join(r, rel)), { recursive: true });
      fs.writeFileSync(path.join(r, rel), lines.join('\n'));
    };
    write('content/drawers/D-02.md', [...front('D-02'), ...cellOf(1, platform(', amount <= a')), ...cellOf(2, platform(''))]);
    write('content/stages/S2/S2.L2.md', [...front('S2.L2'), ...cellOf(1, "from z3 import *\nx = Int('x')\ns = Solver()\ns.add(x * x == 2)\nprint(s.check())", { key: 'C' }), ...cellOf(2, starter, { key: 'C' })]);
    write('content/drawers/D-13.md', [...front('D-13'), ...cellOf(1, factoring, { lang: 'smt2', key: 'A' })]);
    write('content/stages/S2/S2.L3.md', [...front('S2.L3'), ...cellOf(1, setParam, { key: 'A' }), ...cellOf(2, optSet, { key: 'A', kind: 'value' })]);
  });
  const r = await run(['--root', root, '--only', 'D-02,S2.L2,D-13,S2.L3', '--json']);
  assert.equal(r.status, 1, r.stderr || r.stdout.slice(-2000));
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.content.findings.map((f) => [f.check, f.ref, f.detail]).sort(), [
    ['divergence', 'cell:D-02#1', 'check 1: native says unsat, Pyodide says unknown'],
    ['divergence', 'cell:D-02#2', 'check 1: native says sat, Pyodide says unknown'],
    ['key', 'cell:D-13#1', 'the called check is unknown on both engines; key A ("`sat`") claims sat'],
    ['key', 'cell:S2.L2#1', 'the called check is unsat on both engines; key C ("`unknown`") claims unknown'],
    ['key', 'cell:S2.L2#2', 'the called check is sat on both engines; key C ("`unknown`") claims unknown'],
    ['key', 'cell:S2.L3#1', 'the called check is unknown on both engines; key A ("`sat`") claims sat'],
    ['key', 'cell:S2.L3#2', 'the optimum is unknown (no optimum) on both engines; key A ("`1`") claims 1'],
  ]);
  assert.ok(report.planted.cases.every((c) => c.pass), 'the planted fixtures still hold');
});

test('two cells with one number fail their page, and neither is judged against the other\'s result', async (t) => {
  // a sat query keyed unsat, and an unsat query, both numbered 1: one reply for two cells would let the wrong key pass
  const cell1 = (code, key) => [':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter', '```python', code, '```', '', `@call key=${key}`, 'Q?', '', '- A. `sat`', '  - why: w', '  - mis: dp:Z1', '- B. `unsat`', '  - why: w', '  - mis: dp:Z1', ':::', ''];
  const sat = "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.add(a >= 0, amount > 0, a - amount < 0)\nprint(s.check())";
  const unsat = "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.add(a >= 0, amount > 0, amount <= a, a - amount < 0)\nprint(s.check())";
  const root = scratchTree(t, (r) => {
    fs.mkdirSync(path.join(r, 'content', 'stages', 'S2'), { recursive: true });
    fs.writeFileSync(path.join(r, 'content', 'stages', 'S2', 'S2.L2.md'), ['---', 'id: S2.L2', 'tier: core', 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', '', ...cell1(sat, 'B'), ...cell1(unsat, 'B')].join('\n'));
  });
  const r = await run(['--root', root, '--json']);
  assert.equal(r.status, 1, r.stdout.slice(-2000));
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.content.findings.map((f) => [f.check, f.ref]), [['page', 'content/stages/S2/S2.L2.md']]);
  assert.match(report.content.findings[0].detail, /more than one cell is numbered 1/);
});

test('a call on an instrument with no engine fails; a Lean call waits for the nightly lane', async (t) => {
  const page = (cells) => ['---', 'id: S2.L1', 'tier: core', 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', '', ...cells, ''].join('\n');
  const call = (n, ins, lang) => [`:::instrument ins=${ins} cell=${n} recorded=RUN-z3-starter`, '```' + lang, 'x', '```', '', '@call key=A', 'Q?', '', '- A. `sat`', '  - why: w', '- B. `unsat`', '  - why: w', '  - mis: dp:Z1', ':::', ''].join('\n');
  const root = scratchTree(t, (r) => {
    fs.mkdirSync(path.join(r, 'content', 'stages', 'S2'), { recursive: true });
    fs.writeFileSync(path.join(r, 'content', 'stages', 'S2', 'S2.L1.md'), page([call(1, 'INS-spectacle', 'tla'), call(2, 'INS-goal-replay', 'lean')]));
  });
  const [fast, nightly] = await Promise.all([run(['--root', root, '--json', '--only', 'S2.L1']), run(['--root', root, '--json', '--only', 'S2.L1', '--lane', 'nightly'])]);
  assert.equal(fast.status, 1);
  const f = JSON.parse(fast.stdout);
  assert.deepEqual(f.content.findings.map((x) => [x.check, x.ref]), [['instrument', 'cell:S2.L1#1']]);
  assert.equal(f.content.counts.deferred, 1);
  assert.equal(nightly.status, 1);
  const n = JSON.parse(nightly.stdout);
  assert.deepEqual(n.content.findings.map((x) => [x.check, x.ref]), [['instrument', 'cell:S2.L1#1'], ['instrument', 'cell:S2.L1#2']]);
});

test('--only narrows the content, never the planted fixtures; --self-check shows every case', async () => {
  const [only, self] = await Promise.all([run(['--root', S1_FIXTURES, '--only', 'S1.L3,cell:S1.L5#2', '--json']), run(['--self-check'])]);
  assert.equal(only.status, 0);
  const o = JSON.parse(only.stdout);
  assert.deepEqual(o.content.rows.map((r) => r.ref), ['cell:S1.L3#1', 'cell:S1.L3#2', 'cell:S1.L5#2']);
  assert.ok(o.planted.cases.length >= 49);
  assert.equal(self.status, 0, self.stdout.slice(-1500));
  const held = self.stdout.split('\n').filter((l) => /^ {2}held /.test(l));
  assert.equal(held.length, o.planted.cases.length);
  assert.match(self.stdout, /planted wrong expected verdict/);
});

test('an engine or cvc5 that cannot be set up stops the gate with exit 2, never a pass', async () => {
  const [z3, cvc5, usage, nothing, noRoot, noContent] = await Promise.all([
    run(['--root', S1_FIXTURES], { STATESPACE_Z3_PYTHON: path.join(os.tmpdir(), 'no-such-python-w1t37') }),
    run(['--root', S1_FIXTURES], { STATESPACE_CVC5: path.join(os.tmpdir(), 'no-such-cvc5-w1t37') }),
    run(['--lane', 'release']),
    run(['--root', S1_FIXTURES, '--only', 'S1.L9']),
    run(['--root', path.join(os.tmpdir(), 'no-such-tree-w1t37')]),
    run(['--root', path.dirname(S1_FIXTURES)]),
  ]);
  assert.equal(noRoot.status, 2, 'a --root that names no directory is a usage error, not a tree with no cells');
  assert.match(noRoot.stderr, /--root names no directory/);
  assert.equal(noRoot.stdout, '');
  assert.equal(noContent.status, 2, 'nor is a directory with no content/ in it, such as the fixtures one level up');
  assert.match(noContent.stderr, /--root names a directory with no content\/ in it/);
  assert.equal(nothing.status, 2, 'an --only that matches no cell is a usage error, not a green run');
  assert.match(nothing.stderr, /--only S1\.L9 matches no authored cell/);
  assert.equal(z3.status, 2);
  assert.match(z3.stderr, /an engine could not be set up.*STATESPACE_Z3_PYTHON/);
  assert.equal(cvc5.status, 2);
  assert.match(cvc5.stderr, /STATESPACE_CVC5 .* does not exist/);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /--lane is fast or nightly/);
});
