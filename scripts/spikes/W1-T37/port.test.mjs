// W1-T37: the Z3 engine port that GATE-generators borrows (scripts/conformance/z3-pyodide-native.mjs createPorts),
// its contract on fakes, and on Pyodide's Z3 through GATE-generators' own provider loader and the framework's ask().
//   node --test scripts/spikes/W1-T37/port.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { admit, enginePort, pairPort, PortError, toReply } from './lib/port.mjs';
import { REPO } from './lib/engines.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAIR_SCRIPT = path.join(REPO, 'scripts', 'conformance', 'z3-pyodide-native.mjs');
const req = (input, budget = { wallMs: 30000, rlimit: 5000000 }, extra = {}) => ({ engine: 'z3', version: '5.3.1', input, budget, ...extra });
const fakeEngine = (answer) => ({ describe: 'fake', server: { call: async (r) => (typeof answer === 'function' ? answer(r) : answer) } });

test('a request outside the contract is refused with a bus error code', () => {
  const code = (fn) => {
    try {
      fn();
    } catch (e) {
      return e.code;
    }
    return null;
  };
  assert.equal(code(() => admit(req({ smtlib: '' }, undefined, { engine: 'spectacle' }))), 'unknown-engine');
  assert.equal(code(() => admit(req({ smtlib: '' }, undefined, { version: '4.15.4' }))), 'version-mismatch');
  assert.equal(code(() => admit(req('(check-sat)'))), 'invalid-input');
  assert.equal(code(() => admit(req({ smtlib: '' }, { wallMs: 1000, rlimit: -1 }))), 'invalid-input');
  assert.deepEqual(admit(req({ python: 'pass' }, { wallMs: 5 })), { rlimit: 5000000, wallMs: 5 });
});

test("the harness's replies become InstrumentReplies, or the error they stand for", () => {
  const r = req({ smtlib: 'x' });
  const ok = toReply({ ok: true, verdict: 'sat', model: { a: '1' }, rlimit: 5000000, ms: 3, witness_holds: true }, r, { rlimit: 5000000, build: 'b' });
  assert.deepEqual(ok.reply, { verdict: { kind: 'sat' }, witness: { a: '1' }, stats: { ms: 3, bound: 'rlimit 5000000' }, provenance: { engine: 'z3', version: '5.3.1', build: 'b', budget: { wallMs: 30000, rlimit: 5000000 } } });
  assert.equal(ok.witnessHolds, true);
  assert.deepEqual(toReply({ ok: true, verdict: 'unknown', reason: 'canceled', rlimit: 7 }, r, { rlimit: 7, build: 'b' }).reply.verdict, { kind: 'unknown', reason: 'canceled' });
  assert.equal(toReply({ terminated: true }, r, { rlimit: 1, build: 'b' }).code, 'terminated');
  assert.equal(toReply({ crashed: true }, r, { rlimit: 1, build: 'b' }).code, 'engine-crashed');
  assert.equal(toReply({ ok: false, code: 'invalid-input', detail: 'x' }, r, { rlimit: 1, build: 'b' }).code, 'invalid-input');
  assert.ok(toReply({ ok: true, verdict: 'maybe' }, r, { rlimit: 1, build: 'b' }) instanceof PortError);
});

test('the pair port records every disagreement and answers with Pyodide, the tab', async () => {
  const native = fakeEngine({ ok: true, verdict: 'sat', model: { a: '1' }, witness_holds: true });
  const sameP = fakeEngine({ ok: true, verdict: 'sat', model: { a: '9' }, witness_holds: true });
  const port = pairPort(async () => native, async () => sameP, () => 'same');
  assert.deepEqual((await port.run(req({ smtlib: 'x' }))).witness, { a: '9' });
  assert.deepEqual(port.differences, [], 'different models are not a difference');
  const unsatP = fakeEngine({ ok: true, verdict: 'unsat' });
  const p2 = pairPort(async () => native, async () => unsatP, () => 'verdict');
  await p2.run(req({ smtlib: 'x' }));
  assert.equal(p2.differences.length, 1);
  const badWitness = fakeEngine({ ok: true, verdict: 'sat', model: { a: '9' }, witness_holds: false });
  const p3 = pairPort(async () => native, async () => badWitness, () => 'witness');
  await p3.run(req({ smtlib: 'x' }));
  assert.equal(p3.differences.length, 1);
  const dead = fakeEngine({ crashed: true, detail: 'x' });
  const p4 = pairPort(async () => native, async () => dead, () => 'crash');
  await assert.rejects(p4.run(req({ smtlib: 'x' })), /engine-crashed/);
  assert.equal(p4.differences.length, 1);
  assert.equal(p4.compared, 1);
});

test('the pair port on both engines: a quantified request whose model holds is no difference', async () => {
  const { createZ3Engines } = await import('./lib/engines.mjs');
  const engines = createZ3Engines();
  try {
    const port = pairPort(() => engines.native(), () => engines.pyodide(), (r) => r.input.smtlib.slice(0, 40));
    // D-03's y that is no perfect square, and a violation quantified over an enumeration of accounts: Z3's evaluator
    // leaves each quantifier unreduced under the model, which the pair once read as a witness that fails
    const forall = await port.run(req({ smtlib: '(declare-const y Int)\n(assert (forall ((k Int)) (not (= (* k k) y))))\n(assert (> y 0))' }));
    const accounts = await port.run(req({ smtlib: '(declare-datatypes ((Acct 0)) (((A1) (A2))))\n(declare-const amt Int)\n(define-fun bal2 ((k Acct)) Int (ite (= k A1) (- 0 amt) 0))\n(assert (> amt 0))\n(assert (exists ((k Acct)) (< (bal2 k) 0)))' }));
    assert.deepEqual([forall.verdict.kind, accounts.verdict.kind], ['sat', 'sat']);
    assert.deepEqual(port.differences, []);
    assert.equal(port.compared, 2);
  } finally {
    await engines.close();
  }
});

test("GATE-generators' provider loader finds the port, and the framework's ask() reads its replies (Pyodide's Z3)", async () => {
  const gate = await import(pathToFileURL(path.join(REPO, 'scripts', 'verify-generators.mjs')).href);
  const core = await import(pathToFileURL(path.join(REPO, 'packages', 'generators', 'src', 'core', 'index.ts')).href);
  const { map, problems } = await gate.loadProviders([PAIR_SCRIPT]);
  assert.deepEqual(problems, []);
  const port = map.get('z3');
  assert.ok(port, 'the provider exports a z3 port');
  const sat = await core.ask(port, req({ smtlib: '(declare-const a Int)\n(declare-const amount Int)\n(assert (>= a 0))\n(assert (> amount 0))\n(assert (< (- a amount) 0))\n(check-sat)' }));
  assert.equal(sat.kind, 'verdict');
  assert.equal(sat.reply.verdict.kind, 'sat');
  const w = sat.reply.witness;
  assert.ok(BigInt(w.a) >= 0n && BigInt(w.amount) > 0n && BigInt(w.a) - BigInt(w.amount) < 0n, 'the witness satisfies the query');
  assert.equal(sat.reply.stats.bound, 'rlimit 5000000');
  assert.match(sat.reply.provenance.build, /pyodide 314\.0\.7 with z3 5\.3\.1/);
  const unsat = await core.ask(port, req({ python: "from z3 import *\na = Int('a')\ns = Solver()\ns.add(a > 0, a < 0)\ns.check()" }));
  assert.equal(unsat.reply.verdict.kind, 'unsat');
  // a bit-vector objective, whose optimum Z3 reports as an Int numeral: the harness once raised on it
  const bvopt = await core.ask(port, req({ python: "from z3 import *\nX = BitVec('X', 8)\no = Optimize()\no.add(UGT(X, 5))\no.minimize(X)\no.check()" }));
  assert.deepEqual([bvopt.kind, bvopt.reply.verdict.kind, bvopt.reply.witness], ['verdict', 'sat', { X: '6' }]);
  const canceled = await core.ask(port, req({ smtlib: '(declare-const x Int)(declare-const y Int)(declare-const z Int)(assert (> x 2))(assert (> y 2))(assert (> z 2))(assert (= (+ (* x x x) (* y y y)) (* z z z)))' }, { wallMs: 30000, rlimit: 200000 }));
  assert.deepEqual([canceled.kind, canceled.budget, canceled.reason], ['unknown', true, 'canceled'], 'an rlimit stop is unknown, a budget stop');
  const stopped = await core.ask(port, req({ python: 'while True:\n    pass' }, { wallMs: 1500 }));
  assert.deepEqual([stopped.kind, stopped.budget, stopped.reason], ['unknown', true, 'terminated'], 'the watchdog is a budget stop');
  await assert.rejects(core.ask(port, req({ smtlib: '(assert (> undeclared 1))' })), (e) => e.code === 'invalid-input');
  await assert.rejects(core.ask(port, req({ smtlib: '(set-option :rlimit 1)' })), (e) => e.code === 'invalid-input');
  await assert.rejects(core.ask(port, req({ smtlib: '' }, undefined, { version: '5.3.0' })), (e) => e.code === 'version-mismatch');
});

test('a process that borrowed the port exits when its own work is done', () => {
  const script = `const m = await import(${JSON.stringify(pathToFileURL(PAIR_SCRIPT).href)}); const { z3 } = await m.createPorts(); const r = await z3.run({ engine: 'z3', version: '5.3.1', input: { smtlib: '(declare-const a Int)(assert (> a 1))' }, budget: { wallMs: 30000 } }); console.log(r.verdict.kind);`;
  const started = Date.now();
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 60000, cwd: HERE });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'sat');
  assert.ok(Date.now() - started < 60000, 'it did not hang on the idle engine');
});

test('the framework can key an instance through the port, as GATE-generators will for a Z3 family', async () => {
  const core = await import(pathToFileURL(path.join(REPO, 'packages', 'generators', 'src', 'core', 'index.ts')).href);
  const { createPorts } = await import(pathToFileURL(PAIR_SCRIPT).href);
  const { z3 } = await createPorts();
  // A minimal Z3-keyed family: is there an x above the seed's bound and below twice it? (discard when unknown)
  const gen = {
    id: 'GEN-port-test',
    templates: [{ id: 't1', name: 'bound', kcs: { primary: 'KC-1.violation-as-sat' }, bands: { 1: {}, 2: {}, 3: {} } }],
    engines: ['z3'],
    make: (seed, band, template) => ({ family: 'GEN-port-test', template, band, seed, kcs: { primary: 'KC-1.violation-as-sat' }, item: { stem: '', parts: [] }, data: { k: seed % 7 } }),
    key: async (inst, port) => {
      const a = await core.ask(port, { engine: 'z3', version: '5.3.1', input: { smtlib: `(declare-const x Int)(assert (> x ${inst.data.k}))(assert (< x ${2 * inst.data.k}))` }, budget: { wallMs: 30000, rlimit: 5000000 } });
      return a.kind === 'unknown' ? core.discard('unknown', a.reason) : { verdict: a.reply.verdict.kind };
    },
  };
  const drawn = await core.drawInstance(gen, z3, { seed: 3, band: 1, template: 't1' });
  assert.equal(drawn.status, 'drawn');
  assert.equal(drawn.key.verdict, 'sat');
  const empty = await core.drawInstance(gen, z3, { seed: 1, band: 1, template: 't1' });
  assert.equal(empty.key.verdict, 'unsat', 'k = 1 leaves no integer between 1 and 2');
});

test('enginePort refuses before it starts an engine', async () => {
  let started = false;
  const port = enginePort(async () => {
    started = true;
    return fakeEngine({ ok: true, verdict: 'sat' });
  });
  await assert.rejects(port.run(req({ smtlib: '' }, undefined, { engine: 'pglite' })), /unknown-engine/);
  assert.equal(started, false);
});
