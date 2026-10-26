// W1-T37: the harness both Z3 engines run (lib/harness.py), on native Z3 and on Pyodide's Z3 alike: what it records
// for a check, and that a cell never sees what an earlier cell left behind.
//   node --test scripts/spikes/W1-T37/harness.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { createZ3Engines } from './lib/engines.mjs';

const engines = createZ3Engines();
test.after(() => engines.close());

const STARTER_GUARDED = "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, amount <= a, a - amount < 0)\nprint(s.check())";
const CUBES = "from z3 import *\nx, y, z = Ints('x y z')\ns = Solver()\ns.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)\nprint(s.check())";

async function both(request, opts) {
  const [n, p] = await Promise.all([engines.native(), engines.pyodide()]);
  return Promise.all([n.server.call(request, opts), p.server.call(request, opts)]);
}
const cell = (code, rlimit = 5000000, lang = 'python') => ({ op: 'cell', lang, code, rlimit });
/** SMT-LIB text with its line breaks and indentation folded, so a test reads it the way a parser does. */
const flat = (text) => String(text).replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

test("a check records its verdict, the rlimit it ran under and where that came from, and the query as SMT-LIB", async () => {
  for (const r of await both(cell(STARTER_GUARDED))) {
    assert.equal(r.ok, true);
    assert.equal(r.error, null);
    assert.equal(r.stdout, 'unsat\n');
    const [c] = r.checks;
    assert.deepEqual([c.kind, c.verdict, c.rlimit, c.rlimit_from], ['solver', 'unsat', 5000000, 'gate']);
    assert.match(c.smt2, /\(declare-fun amount \(\) Int\)/);
    assert.match(c.smt2, /\(check-sat\)/);
  }
  const own = "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.set('rlimit', 100)\ns.add(a >= 0, b >= 0, amount > 0, amount <= a, a - amount < 0)\nprint(s.check())";
  for (const r of await both(cell(own))) {
    assert.deepEqual([r.checks[0].verdict, r.checks[0].rlimit, r.checks[0].rlimit_from], ['unknown', 100, 'cell'], "the cell's own rlimit wins over the gate's");
  }
});

test("the gate's rlimit stops a query no other budget bounds", async () => {
  for (const r of await both(cell(CUBES))) assert.deepEqual([r.checks[0].verdict, r.checks[0].reason, r.checks[0].rlimit_from], ['unknown', 'canceled', 'gate']);
});

test("every kind of check runs under the cell's own rlimit, however the cell sets it, else under the gate's", async () => {
  // the cubes query with no budget of its own, on an Optimize and as SMT-LIB: the gate's rlimit stops each
  const optimizeCubes = "from z3 import *\nx, y, z = Ints('x y z')\no = Optimize()\no.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)\no.minimize(x)\nprint(o.check())";
  const smt2Cubes = '(declare-const x Int)\n(declare-const y Int)\n(declare-const z Int)\n(assert (> x 2))\n(assert (> y 2))\n(assert (> z 2))\n(assert (= (+ (* x x x) (* y y y)) (* z z z)))\n(check-sat)\n(get-info :reason-unknown)';
  for (const [code, lang] of [[optimizeCubes, 'python'], [smt2Cubes, 'smt2']]) {
    for (const r of await both(cell(code, 5000000, lang))) {
      assert.deepEqual([r.error, r.checks[0].verdict, r.checks[0].reason, r.checks[0].rlimit, r.checks[0].rlimit_from], [null, 'unknown', 'canceled', 5000000, 'gate'], code);
    }
  }
  // an own rlimit of 100, too little for queries the gate's rlimit decides at once: each way of setting it wins
  const guard = "a, b, amount = Ints('a b amount')\ns = Solver()\n#SET\ns.add(a >= 0, b >= 0, amount > 0, amount <= b, a - amount < 0)\nprint(s.check())";
  const minimized = "a, b, amount = Ints('a b amount')\no = Optimize()\n#SET\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\nprint(o.check())";
  const ways = [
    [guard, "s.set('rlimit', 100)"],
    [guard, 's.set(rlimit=100)'],
    [guard, "set_param('rlimit', 100)"],
    [guard, 'set_param(rlimit=100)'],
    [minimized, "o.set('rlimit', 100)"],
    [minimized, 'o.set(rlimit=100)'],
  ];
  for (const [query, set] of ways) {
    const code = `from z3 import *\n${query.replace('#SET', set)}`;
    for (const r of await both(cell(code))) assert.deepEqual([r.error, r.checks[0].verdict, r.checks[0].rlimit, r.checks[0].rlimit_from], [null, 'unknown', 100, 'cell'], set);
    // and under the gate's rlimit alone the same query is decided: sat
    for (const r of await both(cell(`from z3 import *\n${query.replace('#SET', '')}`))) assert.deepEqual([r.checks[0].verdict, r.checks[0].rlimit_from], ['sat', 'gate'], set);
  }
});

test('a sat check records its model, that it satisfies the query, and the query with the model asserted', async () => {
  const code = "from z3 import *\nA, X = BitVecs('A X', 64)\ns = Solver()\ns.add(UGT(X, 0), ULE(X, A), A - X < 0)\ns.check()";
  for (const r of await both(cell(code))) {
    const [c] = r.checks;
    assert.equal(c.verdict, 'sat');
    assert.deepEqual(Object.keys(c.model).sort(), ['A', 'X']);
    assert.deepEqual(c.witness, { holds: true, failed: [], free: [], unsettled: [], unsettled_pinned: true });
    const A = BigInt(c.model.A);
    const X = BigInt(c.model.X);
    assert.ok(X > 0n && X <= A && BigInt.asIntN(64, A - X) < 0n, 'checked again here, in two\'s complement');
    assert.ok(flat(c.witness_smt2).includes(`(assert (= (_ bv${c.model.A} 64) A))`), 'the model is asserted');
  }
});

test('an Optimize records its objectives, their optimum and the two queries that settle it; assumptions join the export', async () => {
  const code = "from z3 import *\na, amount = Ints('a amount')\no = Optimize()\no.add(a >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\no.check()\np = Bool('p')\ns = Solver()\ns.add(Implies(p, a < 0), a > 0)\ns.check(p)";
  for (const r of await both(cell(code))) {
    const [o, s] = r.checks;
    assert.deepEqual([o.kind, o.verdict, o.objectives, o.soft], ['optimize', 'sat', [{ expr: 'amount', dir: 'min', value: '1' }], 0]);
    const beyond = flat(o.optimum_smt2.beyond);
    const at = flat(o.optimum_smt2.at);
    assert.ok(beyond.includes('(assert (< amount 1))') || beyond.includes('(assert (> 1 amount))'), beyond);
    assert.ok(at.includes('(assert (= amount 1))') || at.includes('(assert (= 1 amount))'), at);
    assert.deepEqual([s.verdict, s.assumptions], ['unsat', 1]);
    assert.ok(flat(s.smt2).includes('(assert p)'), 'the assumption is asserted in the export');
  }
});

test("a bit-vector objective's optimum, which Z3 reports as an Int numeral, is compared as a bit-vector of the objective's width", async () => {
  const cases = [
    { code: "from z3 import *\nX = BitVec('X', 8)\no = Optimize()\no.add(UGT(X, 5))\no.minimize(X)\nprint(o.check(), o.model())", value: '6', beyond: '(bvult X (_ bv6 8))', at: '(= (_ bv6 8) X)' },
    { code: "from z3 import *\nW = BitVec('W', 8)\no = Optimize()\no.add(ULT(W, 200))\no.maximize(W)\nprint(o.check())", value: '199', beyond: '(bvugt W (_ bv199 8))', at: '(= (_ bv199 8) W)' },
    // a signed overflow, minimized: the 64-bit probe of the first verification round
    { code: "from z3 import *\nB, X = BitVecs('B X', 64)\no = Optimize()\no.add(B >= 0, X > 0, B + X < 0)\no.minimize(X)\nprint(o.check())", value: '1', beyond: '(bvult X (_ bv1 64))', at: '(= (_ bv1 64) X)' },
  ];
  for (const k of cases) {
    for (const r of await both(cell(k.code))) {
      assert.equal(r.error, null, `the cell runs to its end: ${r.error}`);
      const [c] = r.checks;
      assert.deepEqual([c.verdict, c.objectives.map((o) => o.value), c.optimum_smt2_error ?? null], ['sat', [k.value], null]);
      assert.ok(flat(c.optimum_smt2.beyond).includes(`(assert ${k.beyond})`), flat(c.optimum_smt2.beyond));
      assert.ok(flat(c.optimum_smt2.at).includes(`(assert ${k.at})`), flat(c.optimum_smt2.at));
    }
  }
});

test("the gate's bookkeeping never raises into the cell: what it cannot record, it says it could not", async () => {
  // a solver whose assertions cannot be listed: the check keeps its verdict and says why the rest is missing
  const shadowed = "from z3 import *\ns = Solver()\ns.add(Int('x') > 0)\ndef boom():\n    raise RuntimeError('boom')\ns.assertions = boom\nprint(s.check())";
  for (const r of await both(cell(shadowed))) {
    assert.equal(r.error, null, 'the cell itself runs to its end');
    assert.equal(r.stdout, 'sat\n');
    const [c] = r.checks;
    assert.deepEqual([c.verdict, c.smt2, c.witness], ['sat', null, null]);
    assert.match(c.record_error, /^RuntimeError: boom/);
    assert.match(c.smt2_error, /the gate could not record this check/);
  }
  // an objective whose value cannot be read: the optimum's queries are missing, and say why
  const objective = "from z3 import *\na = Int('a')\no = Optimize()\no.add(a > 2)\nh = o.minimize(a)\ndef boom():\n    raise RuntimeError('no value')\nh.value = boom\nprint(o.check())";
  for (const r of await both(cell(objective))) {
    assert.equal(r.error, null);
    const [c] = r.checks;
    assert.deepEqual([c.verdict, c.optimum_smt2, c.record_error ?? null], ['sat', null, null]);
    assert.match(c.optimum_smt2_error, /RuntimeError: no value/);
    assert.ok(c.witness.holds, 'the rest of the record is intact');
  }
});

test('tracked assertions are exported with their tracking literals, so a second solver reads the same query', async () => {
  const code = "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.assert_and_track(amount > 0, 'positive')\ns.assert_and_track(amount <= 0, Bool('max0'))\ns.add(a >= 0)\nprint(s.check(), s.unsat_core())";
  for (const r of await both(cell(code))) {
    assert.equal(r.checks[0].verdict, 'unsat');
    const text = flat(r.checks[0].smt2);
    assert.ok(text.includes('(assert positive)') && text.includes('(assert max0)'), text);
  }
});

test('a cell never sees what an earlier cell left: its names, its context, its global options', async () => {
  await both(cell("secret = 42\nfrom z3 import *\nset_param('rlimit', 100)"));
  for (const r of await both(cell('print(secret)'))) assert.match(r.error, /^NameError: name 'secret' is not defined/);
  // A global option an SMT-LIB cell sets must not reach the next cell, even one that runs with no budget of its own.
  await both(cell('(set-option :rlimit 100)\n(declare-const q Int)\n(assert (> q 2))\n(check-sat)', 5000000, 'smt2'));
  for (const r of await both({ op: 'cell', lang: 'python', code: STARTER_GUARDED, rlimit: null })) {
    assert.deepEqual([r.checks[0].verdict, r.checks[0].rlimit], ['unsat', null], 'no rlimit leaked from the earlier cell');
  }
});

test("an SMT-LIB cell's verdict lines are its checks, and an error line is output, not a failure", async () => {
  const text = '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-model)';
  for (const r of await both(cell(text, 5000000, 'smt2'))) {
    assert.equal(r.error, null);
    assert.deepEqual(r.checks.map((c) => c.verdict), ['unsat']);
    assert.equal(r.smt2_errors.length, 1);
    assert.match(r.smt2_errors[0], /model is not available/);
  }
  // Z3 goes on past an error line (the pinned cvc5 stops at some: cvc5.test.mjs), and the command it rejected has no effect
  for (const r of await both(cell(`${text}\n(check-sat)`, 5000000, 'smt2'))) {
    assert.deepEqual([r.checks.map((c) => c.verdict), r.smt2_errors.length, r.error], [['unsat', 'unsat'], 1, null]);
  }
  const undeclared = '(declare-const a Int)\n(assert (> b 0))\n(assert (> a 0))\n(assert (< a 0))\n(check-sat)';
  for (const r of await both(cell(undeclared, 5000000, 'smt2'))) {
    assert.deepEqual([r.checks.map((c) => c.verdict), r.error], [['unsat'], null]);
    assert.match(r.smt2_errors[0], /unknown constant b/);
  }
  // the rejected command has no effect: a term that is no Boolean asserts nothing (sat), a pop past the stack pops
  // nothing (unsat, where one pop would leave a < 0 alone, sat)
  const noEffect = '(declare-const a Int)\n(assert (+ a 1))\n(check-sat)\n(push 1)\n(assert (> a 0))\n(pop 3)\n(assert (< a 0))\n(check-sat)';
  for (const r of await both(cell(noEffect, 5000000, 'smt2'))) {
    assert.deepEqual([r.checks.map((c) => c.verdict), r.smt2_errors.length], [['sat', 'unsat'], 2]);
    assert.equal(r.checks[1].smt2, '(declare-const a Int)\n(push 1)\n(assert (> a 0))\n(assert (< a 0))\n(check-sat)\n', 'the query cvc5 reads leaves both out');
  }
  const unknown = '(set-option :rlimit 5000000)\n(declare-const x Int)\n(declare-const y Int)\n(declare-const z Int)\n(assert (> x 2))\n(assert (> y 2))\n(assert (> z 2))\n(assert (= (+ (* x x x) (* y y y)) (* z z z)))\n(check-sat)\n(get-info :reason-unknown)';
  for (const r of await both(cell(unknown, 5000000, 'smt2'))) assert.deepEqual([r.checks[0].verdict, r.checks[0].reason, r.checks[0].rlimit_from], ['unknown', 'canceled', 'cell']);
});

test("a cell's output is captured, and a cell in a language Z3 does not run is refused", async () => {
  for (const r of await both(cell('print("{not json}")\nprint(1)'))) assert.equal(r.stdout, '{not json}\n1\n');
  for (const r of await both(cell('x', 5000000, 'tla'))) assert.deepEqual([r.ok, r.code], [false, 'invalid-input']);
});

/** A Python cell that prints what Z3's command interpreter prints for the whole script at once, in a context of its own. */
const wholeScript = (text) =>
  `import z3\nctx = z3.Context()\ntry:\n    out = z3.Z3_eval_smtlib2_string(ctx.ref(), ${JSON.stringify(`(set-option :rlimit 5000000)\n${text}`)})\nexcept z3.Z3Exception as e:\n    out = e.args[0].decode()\nprint(out, end='')`;
/** Error lines name a position, which differs between a command run alone and the script run whole. */
const unplaced = (out) => String(out).replace(/line \d+ column \d+: /g, '');

test('an SMT-LIB cell runs one command at a time and prints what the whole script prints', async () => {
  const scripts = [
    '(declare-const a Int)\n(declare-const amount Int)\n(assert (> balance 0))        ; never declared\n(assert (> amount 0))\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-model)                   ; no model after unsat\n(check-sat)',
    '(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0)))\n(push 1)\n(assert (< (- a amount) 0))\n(check-sat)\n(assert (<= amount a))\n(check-sat)\n(pop 1)\n(assert (<= amount a))\n(check-sat)\n(get-model)',
    '(declare-const x Int)\n(declare-const y Int)\n(declare-const z Int)\n(assert (> x 2))\n(assert (> y 2))\n(assert (> z 2))\n(assert (= (+ (* x x x) (* y y y)) (* z z z)))\n(check-sat)\n(get-info :reason-unknown)',
    '(echo "a ""quoted"" (word); not a comment")\n(declare-const |a;b(| Int) ; a ( in a comment\n(assert (> |a;b(| 0))\n(check-sat)\n(exit)\n(check-sat)',
    '(declare-const a Int)\n(assert (+ a 1))\n(declare-const a Int)\n(assert (> a 0))\n(pop 3)\n(check-sat)\n(get-value (a))',
  ];
  for (const text of scripts) {
    const [cells, wholes] = await Promise.all([both(cell(text, 5000000, 'smt2')), both(cell(wholeScript(text)))]);
    for (let i = 0; i < 2; i++) {
      assert.equal(wholes[i].error, null, wholes[i].error);
      assert.equal(unplaced(cells[i].stdout), unplaced(wholes[i].stdout), text);
    }
  }
});

test("each SMT-LIB check carries its own query for cvc5: the commands Z3 ran without an error before it, then the check", async () => {
  const text = '(echo "unsat")\n(set-option :rlimit 5000000)\n(declare-const a Int)\n(declare-const amount Int)\n(assert (> balance 0))   ; an error line\n(assert (> amount 0))\n(check-sat)\n(get-model)\n(get-info :reason-unknown)\n(push 1)\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n(exit)\n(check-sat)';
  for (const r of await both(cell(text, 5000000, 'smt2'))) {
    assert.equal(r.error, null);
    // the echo prints a verdict word and is no check; nothing runs after (exit)
    assert.deepEqual(r.checks.map((c) => [c.verdict, c.rlimit_from]), [['sat', 'cell'], ['unsat', 'cell']]);
    assert.equal(r.checks[0].smt2, '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(check-sat)\n', 'no echo, no rlimit option, no rejected assert');
    assert.equal(r.checks[1].smt2, '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(push 1)\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n', 'no earlier check, no command that only prints');
  }
  // a script that cannot be split into commands runs whole, and its checks carry no query, saying why
  for (const r of await both(cell('(declare-const a Int)\n(assert (> a 0)))\n(assert (< a 0))\n(check-sat)', 5000000, 'smt2'))) {
    assert.deepEqual(r.checks.map((c) => [c.verdict, c.smt2]), [['unsat', null]]);
    assert.match(r.checks[0].smt2_error, /could not split the SMT-LIB text into commands.*a \) on line 2 closes nothing/);
  }
});

test("a model the harness reads that is not its query's fails by Z3's own evaluation", async () => {
  const code = "from z3 import *\na, amount = Ints('a amount')\nother = Solver()\nother.add(a == 0, amount == 0)\nother.check()\ns = Solver()\ns.add(amount > 0, a - amount < 0)\ns.model = other.model\nprint(s.check())";
  for (const r of await both(cell(code))) {
    assert.equal(r.error, null);
    assert.deepEqual(r.checks.map((c) => c.witness.holds), [true, false]);
    assert.deepEqual(r.checks[1].witness.failed, ['amount > 0', 'a - amount < 0'], 'with a = 0 and amount = 0 both fail');
  }
});

test("a quantifier Z3's evaluator leaves unreduced is settled under the model: D-03's y that is no perfect square holds, y = 4 does not", async () => {
  const good = "from z3 import *\nk, y = Ints('k y')\ns = Solver()\ns.add(ForAll([k], k * k != y), y > 0)\nprint(s.check())";
  for (const r of await both(cell(good))) assert.deepEqual(r.checks[0].witness, { holds: true, failed: [], free: [], unsettled: [], unsettled_pinned: true });
  const bad = "from z3 import *\nk, y = Ints('k y')\nother = Solver()\nother.add(y == 4)\nother.check()\ns = Solver()\ns.add(ForAll([k], k * k != y), y > 0)\ns.model = other.model\nprint(s.check())";
  for (const r of await both(cell(bad))) assert.deepEqual([r.checks[1].witness.holds, r.checks[1].witness.failed], [false, ['ForAll(k, k*k != y)']]);
  const exists = "from z3 import *\nAcct, (A1, A2) = EnumSort('Acct', ['A1', 'A2'])\nk = Const('k', Acct)\na1, a2, amount = Ints('a1 a2 amount')\ns = Solver()\ns.add(ForAll([k], If(k == A1, a1, a2) >= 0), amount > 0, Exists([k], If(k == A1, a1 - amount, a2 + amount) < 0))\nprint(s.check())";
  for (const r of await both(cell(exists))) assert.equal(r.checks[0].witness.holds, true);
});

test("what Z3 cannot settle within the check's rlimit is recorded unsettled, with whether the model pins its symbols", async () => {
  // rlimit 100 decides y == 2 and cannot settle the quantifier under the model; the harness reads the query through s.assertions()
  const code = (q) => `from z3 import *\nk, y, g = Ints('k y g')\ns = Solver()\ns.set('rlimit', 100)\ns.add(y == 2)\nquery = [${q}, y == 2]\ns.assertions = lambda: query\nprint(s.check())`;
  for (const r of await both(cell(code('ForAll([k], k * k != y)')))) {
    assert.deepEqual(r.checks[0].witness, { holds: null, failed: [], free: [], unsettled: ['ForAll(k, k*k != y)'], unsettled_pinned: true });
  }
  for (const r of await both(cell(code('ForAll([k], k * k != y + g)')))) {
    assert.deepEqual([r.checks[0].witness.holds, r.checks[0].witness.unsettled_pinned], [null, false], 'g is in no equality of the witness query');
  }
});

test('the model a cell reads after its check is the one Z3 gave: the evaluation completes a copy', async () => {
  const code = "from z3 import *\nx, y = Ints('x y')\ns = Solver()\ns.add(x > 0, Or(x > 0, y == 5))\ns.check()\nprint(s.model()[y])";
  for (const r of await both(cell(code))) assert.deepEqual([r.stdout, r.checks[0].witness.holds], ['None\n', true]);
});

test("the engine port's witness: a quantified request's model holds, and a model that fails is said to", async () => {
  const req = (input) => ({ op: 'request', input, rlimit: 5000000 });
  for (const r of await both(req({ smtlib: '(declare-const y Int)\n(assert (forall ((k Int)) (not (= (* k k) y))))\n(assert (> y 0))' }))) {
    assert.deepEqual([r.ok, r.verdict, r.witness_holds], [true, 'sat', true]);
  }
  const accounts = '(declare-datatypes ((Acct 0)) (((A1) (A2))))\n(declare-const amt Int)\n(define-fun bal2 ((k Acct)) Int (ite (= k A1) (- 0 amt) 0))\n(assert (> amt 0))\n(assert (exists ((k Acct)) (< (bal2 k) 0)))';
  for (const r of await both(req({ smtlib: accounts }))) assert.deepEqual([r.verdict, r.witness_holds], ['sat', true]);
  // the port's python input answers with its first check, here one whose model (a = -1, built by hand) fails a > 0
  const badModel = "from z3 import *\na = Int('a')\nbad = Model()\nbad.update_value(a, IntVal(-1))\ns = Solver()\ns.add(a > 0)\ns.model = lambda: bad\ns.check()";
  for (const r of await both(req({ python: badModel }))) assert.deepEqual([r.ok, r.verdict, r.witness_holds], [true, 'sat', false]);
});
