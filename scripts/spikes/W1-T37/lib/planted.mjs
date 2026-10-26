// GATE-calls' planted fixtures (W1-T37). Every run of the gate runs them beside the content, through the same
// discovery, the same content reader, the same two engines, the same cvc5 and the same judge, and fails unless each
// case trips exactly the checks it is built to trip and every control trips none. So a weakened rule cannot pass:
// it stops one of these cases from tripping, or makes a control trip.
//
// Four kinds of case:
//   controls      the S1 authored cells of curriculum/S01-counterexample.md section 2, written as lesson pages in
//                 fixtures/s1/ (the cells W1-T27, W1-T28 and W1-T09 are to author), and clean cells of each kind of key
//                 (value keys in each number form the gate reads, a maximum among them), quantified queries and SMT-LIB
//                 scripts with error lines, print commands, quoting and an (exit) among them: no finding, and every
//                 unsat they make (and every witness and optimum, where a case asks) confirmed by cvc5. Some hold only
//                 while the harness keeps its budget rule: a Python Solver, an Optimize and an SMT-LIB cell that set no
//                 rlimit (only other options) stop at unknown under the gate's, and an own rlimit of 100, set each way a
//                 cell can set it (s.set, o.set, set_param, by position or by keyword), stops at unknown what the gate's
//                 rlimit decides
//   real faults   pages in the content format with a planted fault the real engines expose: a key that claims the
//                 wrong verdict or value (an S1 cell's key among them, a decided query keyed unknown, a decimal key with
//                 its sign dropped, a value key on an Optimize that reaches no optimum), a key nothing can read, a value
//                 key without an optimum (two objectives, a minimize beside a maximize, or one beside a soft
//                 constraint), a cell that makes no check, raises, has no code, or sits on an instrument with no engine,
//                 an SMT-LIB text the gate cannot split, a page file that cannot be read, a check the gate really cannot
//                 record, a formula Z3 cannot evaluate under the model, and cells that set a budget on Pyodide alone
//                 (sys.platform), so that the two engines really disagree on a verdict and on a reason for unknown
//   lies          a real cell whose engine reply or cvc5 answer is replaced before the judge sees it, for the faults
//                 that the pinned engines never produce: native and Pyodide disagreeing (each verdict on each side,
//                 unknown among them, and an SMT-LIB unknown's reason lost), a witness that fails its property or that
//                 nothing settles, cvc5 refuting, not settling or not reading an unsat (or answering it with an error
//                 line, or with two verdicts), an optimum cvc5 does not confirm or has no queries for, the watchdog, a
//                 crash, a reply that holds no checks, an engine off its pin, a check the gate could not record. Some
//                 lies rewrite the harness's real export and leave the rest to real cvc5: the value an equality pins (a
//                 model's, an optimum's), so a weakened export cannot pass (a case whose export holds no such equality
//                 fails untold), and a command put before the check, so that real cvc5 prints an error line or a second
//                 verdict beside its unsat and cvc5's own output is read as the gate reads it. And some cells hand the
//                 harness a model that is not their query's (s.model = other.model), or their query through
//                 s.assertions(), with cvc5's answer to the witness replaced, so that only the harness's own evaluation
//                 of the model can trip them.
//   setup         cvc5's own setup beside a fake binary that prints the recorded version line: named by STATESPACE_CVC5
//                 it must be refused, and first on PATH it must be passed over (SETUP_CASES)
// The pages are written to a scratch tree and read back by the gate's own discovery.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PINS } from './engines.mjs';
import { CHECKS } from './judge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** The S1 authored cells as lesson pages: the controls every run reproduces. */
export const S1_FIXTURES = path.resolve(HERE, '..', 'fixtures', 's1');

const CODE = {
  sat: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\nprint(s.check())",
  unsat: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, amount <= a, a - amount < 0)\nprint(s.check())",
  unknown: "from z3 import *\nx, y = Ints('x y')\ns = Solver()\ns.add(x**y == 8, y > 1)\nprint(s.check())",
  optimize: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\nprint(o.check())",
  twoObjectives: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\no.minimize(b)\nprint(o.check())",
  twoChecks: "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.add(a >= 0, amount > 0, a - amount < 0)\nprint(s.check())\ns.add(amount <= a)\nprint(s.check())",
  printOnly: "print('no solver here')",
  raises: "from z3 import *\nprint(undefined_balance)",
  tracked: "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.assert_and_track(amount > 0, 'positive')\ns.assert_and_track(amount <= 0, Bool('max_transfer_zero'))\ns.add(a >= 0)\nprint(s.check(), s.unsat_core())",
  // no rlimit of its own, only other options, globally and on the solver: the gate's rlimit stops the cubes query
  cubesNoBudget: "from z3 import *\nset_param('smt.random_seed', 7)\nx, y, z = Ints('x y z')\ns = Solver()\ns.set('random_seed', 7)\ns.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)\nprint(s.check())",
  smt2Unsat: '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)',
  smt2Sat: '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(assert (>= a 0))\n(assert (< (- a amount) 0))\n(check-sat)',
  // D-13's starter checked, then checked again once the guard is asserted: sat, then unsat
  smt2TwoChecks: '(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0)))\n(assert (< (- a amount) 0))\n(check-sat)\n(assert (<= amount a))\n(check-sat)',
  // the same queries in push and pop scopes, then the guard alone: sat, unsat, sat
  smt2PushPop: '(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0)))\n(push 1)\n(assert (< (- a amount) 0))\n(check-sat)\n(assert (<= amount a))\n(check-sat)\n(pop 1)\n(assert (<= amount a))\n(check-sat)',
  // a bit-vector objective, whose optimum Z3 reports as an Int numeral (its unsigned value): 6
  bvOptimize: "from z3 import *\nX = BitVec('X', 8)\no = Optimize()\no.add(UGT(X, 5))\no.minimize(X)\nprint(o.check(), o.model())",
  // sets a global parameter, as an SMT-LIB cell may; the cell after it must not see it
  smt2SetsRlimit: '(set-option :rlimit 100)\n(declare-const q Int)\n(assert (> q 2))',
  readsParams: "from z3 import *\na, amount = Ints('a amount')\ns = Solver()\ns.add(amount > 0, a - amount < 0)\nif get_param('rlimit') != '0':  # an option an earlier cell set has reached this one\n    s.add(False)\nprint(s.check())",
  // unsat only under the assumption that the guard holds
  assumed: "from z3 import *\na, amount = Ints('a amount')\nguard = Bool('guard')\ns = Solver()\ns.add(Implies(guard, amount <= a), a >= 0, amount > 0, a - amount < 0)\nprint(s.check(guard))",
  // the harness reads a model that is not the query's: a = -1 for a > 0 (the first verification round's probe)
  badModel: "from z3 import *\na = Int('a')\nother = Solver()\nother.add(a < 0)\nother.check()\nbad = other.model()\ns = Solver()\ns.add(a > 0)\ns.model = lambda: bad\nprint(s.check())",
  // the same, a = 0 and amount = 0 for the violation query
  badModelStarter: "from z3 import *\na, amount = Ints('a amount')\nother = Solver()\nother.add(a == 0, amount == 0)\nother.check()\ns = Solver()\ns.add(amount > 0, a - amount < 0)\ns.model = other.model\nprint(s.check())",
  // a soft constraint beside the one objective: the optimum is no longer the objective's alone
  optimizeSoft: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.add_soft(b == 0)\no.minimize(amount)\nprint(o.check())",
  // D-03 section D: some y that is no perfect square, sat with y = 2 [X RUN-z3-unknown-pow]; Z3's evaluator leaves the
  // quantifier unreduced under the model
  quantForall: "from z3 import *\nk, y = Ints('k y')\ns = Solver()\ns.add(ForAll([k], k * k != y), y > 0)\nprint(s.check())",
  // D-03's moves: a guard on the wrong balance, the property negated as a quantifier
  quantNotForall: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, Not(ForAll([amount], Implies(And(amount > 0, amount <= b), a - amount >= 0))))\nprint(s.check())",
  // a violation quantified over accounts: some account goes below zero after a transfer
  quantAccounts: "from z3 import *\nAcct, (A1, A2) = EnumSort('Acct', ['A1', 'A2'])\nk = Const('k', Acct)\na1, a2, amount = Ints('a1 a2 amount')\nbal = lambda x: If(x == A1, a1, a2)\nafter = lambda x: If(x == A1, a1 - amount, a2 + amount)\ns = Solver()\ns.add(ForAll([k], bal(k) >= 0), amount > 0, Exists([k], after(k) < 0))\nprint(s.check())",
  // D-03's query read under a model that is not its own: y = 4 is a perfect square
  badQuantModel: "from z3 import *\nk, y = Ints('k y')\nother = Solver()\nother.add(y == 4)\nother.check()\ns = Solver()\ns.add(ForAll([k], k * k != y), y > 0)\ns.model = other.model\nprint(s.check())",
  // error lines before an unsat and between two: Z3 goes on past each, and the rejected command has no effect
  smt2ErrorLines: '(declare-const a Int)\n(declare-const amount Int)\n(assert (> balance 0))        ; balance was never declared: an error line\n(assert (> amount 0))\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-model)                   ; no model after unsat: an error line\n(check-sat)',
  // commands that only print, an echo of a verdict word among them, around two queries: sat, then unsat
  smt2PrintCommands: '(echo "unsat")\n(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0)))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-model)\n(get-info :reason-unknown)\n(assert (<= amount a))\n(check-sat)',
  // the harness reads D-03's query through s.assertions() under a check whose rlimit, 100, is enough for y == 2 and too
  // little to settle the quantifier under the model (y = 2): Z3's evaluation leaves it unsettled, and cvc5 must settle it
  unsettledPinned: "from z3 import *\nk, y = Ints('k y')\ns = Solver()\ns.set('rlimit', 100)\ns.add(y == 2)\nquery = [ForAll([k], k * k != y), y == 2]\ns.assertions = lambda: query\nprint(s.check())",
  // the same, the quantifier over g too, a constant the model does not pin, so cvc5's sat on the witness query (which
  // leaves g free) cannot settle it
  unsettledUnpinned: "from z3 import *\nk, y, g = Ints('k y g')\ns = Solver()\ns.set('rlimit', 100)\ns.add(y == 2)\nquery = [ForAll([k], k * k != y + g), y == 2]\ns.assertions = lambda: query\nprint(s.check())",
  // Z3's model leaves out y, which does not matter; the harness's evaluation with model completion must not add it to
  // the model the cell reads
  ownModel: "from z3 import *\nx, y = Ints('x y')\ns = Solver()\ns.add(x > 0, Or(x > 0, y == 5))\nprint(s.check())\nassert s.model()[y] is None, 'the model the cell reads holds y, which Z3 left out of it'",
  // a ) that closes nothing: Z3 reports it and goes on to unsat, and the text cannot be split into commands
  smt2Unsplittable: '(declare-const a Int)\n(assert (> a 0)))\n(assert (< a 0))\n(check-sat)',
  // the cubes query with no rlimit of its own, as SMT-LIB (D-13's unknown_canceled.smt2 without its set-option line)
  // and on an Optimize: only the gate's rlimit stops either, at unknown (canceled); without it each runs into the watchdog
  smt2NoBudget: '(declare-const x Int)\n(declare-const y Int)\n(declare-const z Int)\n(assert (> x 2))\n(assert (> y 2))\n(assert (> z 2))\n(assert (= (+ (* x x x) (* y y y)) (* z z z)))\n(check-sat)\n(get-info :reason-unknown)',
  optimizeNoBudget: "from z3 import *\nx, y, z = Ints('x y z')\no = Optimize()\no.set('maxsat_engine', 'maxres')\no.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)\no.minimize(x)\nprint(o.check())",
  // a cell's own rlimit of 100, set each way a cell can set it, stops at unknown a query the gate's rlimit decides at
  // once (a guard on the wrong balance, sat; the starter minimized, optimum 1): the cell's own budget wins
  setParamBudget: "from z3 import *\nset_param('rlimit', 100)\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, amount <= b, a - amount < 0)\nprint(s.check())",
  setParamBudgetByKeyword: "from z3 import *\nset_param(rlimit=100)\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, amount <= b, a - amount < 0)\nprint(s.check())",
  solverBudgetByKeyword: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.set(rlimit=100)\ns.add(a >= 0, b >= 0, amount > 0, amount <= b, a - amount < 0)\nprint(s.check())",
  optimizeBudget: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.set('rlimit', 100)\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\nprint(o.check())",
  optimizeBudgetByKeyword: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.set(rlimit=100)\no.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\no.minimize(amount)\nprint(o.check())",
  // optima that a value key may write in each number form the gate reads: -3/2, which Z3 prints as a fraction, and 1000
  realOptimum: "from z3 import *\nx = Real('x')\no = Optimize()\no.add(x >= Q(-3, 2))\no.minimize(x)\nprint(o.check())",
  thousandOptimum: "from z3 import *\nn = Int('n')\no = Optimize()\no.add(n >= 1000)\no.minimize(n)\nprint(o.check())",
  // D-03's quantifier again, beside two constants of an uninterpreted sort that the model gives values no equality can
  // pin (S!val!0, S!val!1); the check's rlimit, 150, decides the query and leaves the quantifier unsettled
  unsettledSort: "from z3 import *\nS = DeclareSort('S')\ne, d = Consts('e d', S)\nk, y = Ints('k y')\ns = Solver()\ns.set('rlimit', 150)\ns.add(y == 2, e != d)\nquery = [ForAll([k], Or(k * k != y, e == d)), y == 2, e != d]\ns.assertions = lambda: query\nprint(s.check())",
  // a budget Pyodide alone runs under (sys.platform is emscripten there), so the two engines really disagree: a decided
  // query is unsat on native and unknown on Pyodide, and x**y == 8 is unknown on both, for different reasons
  platformUnsat: "import sys\nfrom z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\nif sys.platform == 'emscripten':\n    s.set('rlimit', 1)\ns.add(a >= 0, b >= 0, amount > 0, amount <= a, a - amount < 0)\nprint(s.check())",
  platformReason: "import sys\nfrom z3 import *\nx, y = Ints('x y')\ns = Solver()\nif sys.platform == 'emscripten':\n    s.set('rlimit', 1)\ns.add(x**y == 8, y > 1)\nprint(s.check())",
  // a query the harness reads through s.assertions() with a Python True among its formulas, which Z3 cannot evaluate
  // under a model: the witness fails closed rather than pass that formula unread
  unevaluable: "from z3 import *\nx = Int('x')\ns = Solver()\ns.add(x > 0)\nquery = [x > 0, True]\ns.assertions = lambda: query\nprint(s.check())",
  // a solver whose assertions cannot be listed, so the gate really cannot record its check; the cell catches whatever
  // its check raises, so a record that raised into the cell would hide the check
  unrecordable: "from z3 import *\ns = Solver()\ns.add(Int('x') > 0)\ndef boom():\n    raise RuntimeError('boom')\ns.assertions = boom\ntry:\n    print(s.check())\nexcept Exception:\n    print('the check raised')",
  // an SMT-LIB script whose string, comment and quoted symbol hold ( ) ; and "", which the gate must split as Z3 reads it
  smt2Quoting: '(echo "a ""quoted"" word; a ) in a string")\n(declare-const |a;b(| Int)\n(assert (> |a;b(| 0))   ; a comment with a ( in it\n(assert (< |a;b(| 0))\n(check-sat)',
  // an SMT-LIB unknown whose reason the script asks for, split into commands and, with a ) that closes nothing, run whole
  smt2Reason: '(set-option :rlimit 100)\n(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0) (<= amount b)))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-info :reason-unknown)',
  smt2ReasonUnsplit: '(set-option :rlimit 100)\n(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0) (<= amount b))))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-info :reason-unknown)',
  // nothing runs after (exit): one check, sat
  smt2Exit: '(declare-const a Int)\n(assert (> a 0))\n(check-sat)\n(exit)\n(assert (< a 0))\n(check-sat)',
  // a maximize objective (optimum 5), and a minimize beside a maximize, which is two objectives
  maximize: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.add(a >= 0, b >= 0, amount > 0, amount <= 5, a - amount < 0)\no.maximize(amount)\nprint(o.check())",
  minMax: "from z3 import *\na, b, amount = Ints('a b amount')\no = Optimize()\no.add(a >= 0, b >= 0, b <= 3, amount > 0, a - amount < 0)\no.minimize(amount)\no.maximize(b)\nprint(o.check())",
};

const VERDICTS = [
  ['A', '`sat`'],
  ['B', '`unsat`'],
  ['C', '`unknown`'],
];
const VALUES = [
  ['A', '`1`'],
  ['B', '`0`'],
  ['C', '`3`'],
];
const BV_VALUES = [
  ['A', '`6`'],
  ['B', '`5`'],
  ['C', '`250`'],
];
const NEG_DECIMAL = [
  ['A', '`-1.5`'],
  ['B', '`1.5`'],
  ['C', '`0`'],
];
const NEG_FRACTION = [
  ['A', '`-3/2`'],
  ['B', '`3/2`'],
  ['C', '`0`'],
];
const THOUSANDS = [
  ['A', '`1,000`'],
  ['B', '`100`'],
  ['C', '`0`'],
];
const MAX_VALUES = [
  ['A', '`5`'],
  ['B', '`4`'],
  ['C', '`6`'],
];

function cellMd({ n, ins = 'INS-z3', lang = 'python', code = null, key = null, options = VERDICTS }) {
  const lines = [`:::instrument ins=${ins} cell=${n} recorded=RUN-z3-starter`];
  if (code !== null) lines.push('```' + lang, code, '```', '');
  if (key !== null) {
    lines.push(`@call key=${key} run=RUN-z3-starter`, 'What will the solver return?', '');
    for (const [id, text] of options) {
      lines.push(`- ${id}. ${text}`, '  - why: a planted fixture of GATE-calls.');
      if (id !== key) lines.push('  - mis: dp:Z1');
    }
  }
  lines.push(':::', '');
  return lines.join('\n');
}

const page = (id, cells) =>
  [`---`, `id: ${id}`, `tier: core`, `title: Planted fixtures of GATE-calls`, `draft: true`, `kcs: []`, `---`, ``, `## Planted cells {minutes=10}`, ``, ...cells.map(cellMd)].join('\n');

/** The planted lesson pages: cell n of S9.L1 is case n's own cell, so a lie told to one case reaches no other. */
const PLANTED_CELLS = [
  { n: 1, code: CODE.sat, key: 'A' }, // control: sat keyed sat
  { n: 2, code: CODE.sat, key: 'B' }, // a sat query keyed unsat
  { n: 3, code: CODE.unsat, key: 'B' }, // control: unsat keyed unsat
  { n: 4, code: CODE.unsat, key: 'A' }, // an unsat query keyed sat
  { n: 5, code: CODE.unknown, key: 'A' }, // an unknown keyed sat
  { n: 6, code: CODE.unknown, key: 'C' }, // control: unknown keyed unknown
  { n: 7, code: CODE.optimize, key: 'B', options: VALUES }, // optimum 1 keyed 0
  { n: 8, code: CODE.optimize, key: 'A', options: VALUES }, // control: optimum 1 keyed 1
  { n: 9, code: CODE.sat, key: 'C', options: VALUES }, // a value key on a plain solver query
  { n: 10, code: CODE.twoObjectives, key: 'A', options: VALUES }, // a value key on two objectives
  { n: 11, code: CODE.sat, key: 'B', options: [['A', '`sat`'], ['B', 'a balance that covers it'], ['C', '`unknown`']] }, // a key that reads as nothing
  { n: 12, code: CODE.sat, key: 'B', options: [['A', '`unknown`'], ['B', '`sat`, then `unsat`'], ['C', '`unsat`']] }, // a key with two verdicts
  { n: 13, code: CODE.printOnly, key: 'A' }, // no solver check
  { n: 14, code: CODE.raises, key: 'A' }, // the cell raises
  { n: 15, code: null, key: 'A' }, // no code
  { n: 16, code: 'a is at least zero', lang: 'text', key: 'A' }, // code Z3 does not run
  { n: 17, ins: 'INS-spectacle', code: 'VARIABLE x', lang: 'tla', key: 'A' }, // an instrument whose engine has not landed
  { n: 18, ins: 'INS-goal-replay', code: 'theorem t : True := trivial', lang: 'lean', key: 'A' }, // a Lean call, fast lane
  { n: 19, ins: 'INS-goal-replay', code: 'theorem t : True := trivial', lang: 'lean', key: 'A' }, // a Lean call, nightly lane
  { n: 20, ins: 'INS-unheard-of', code: 'x', lang: 'text', key: 'A' }, // an instrument GATE-calls has never heard of
  { n: 21, code: CODE.unsat }, // free runs below: each case's own cell for a lie
  { n: 22, code: CODE.unknown },
  { n: 23, code: CODE.twoChecks },
  { n: 24, code: CODE.optimize },
  { n: 25, code: CODE.sat },
  { n: 26, code: CODE.sat },
  { n: 27, code: CODE.unsat },
  { n: 28, code: CODE.unsat },
  { n: 29, code: CODE.unsat },
  { n: 30, code: CODE.unsat },
  { n: 31, code: CODE.optimize, key: 'A', options: VALUES },
  { n: 32, code: CODE.optimize, key: 'A', options: VALUES },
  { n: 33, code: CODE.optimize, key: 'A', options: VALUES },
  { n: 34, code: CODE.sat },
  { n: 35, code: CODE.sat },
  { n: 36, code: CODE.sat },
  { n: 37, code: CODE.smt2Unsat, lang: 'smt2' },
  { n: 38, code: CODE.smt2Unsat, lang: 'smt2' },
  { n: 39, code: CODE.smt2Sat, lang: 'smt2' },
  { n: 40, code: CODE.smt2Unsat, lang: 'smt2', key: 'A' }, // an SMT-LIB call keyed sat on an unsat script
  { n: 41, code: CODE.smt2Unsat, lang: 'smt2', key: 'B' }, // control: an SMT-LIB call keyed unsat
  { n: 42, code: CODE.smt2Sat, lang: 'smt2' }, // control: an SMT-LIB free run whose sat cvc5 confirms
  { n: 43, code: CODE.cubesNoBudget, key: 'C' }, // control: no rlimit of its own, so the gate's stops it at unknown
  { n: 44, code: CODE.tracked, key: 'B' }, // control: tracked assertions (an unsat core), the unsat confirmed by cvc5
  { n: 45, code: CODE.smt2TwoChecks, lang: 'smt2', key: 'A' }, // control: an SMT-LIB call with two queries, keyed by the first
  { n: 46, code: CODE.smt2TwoChecks, lang: 'smt2' }, // cvc5 answering its second query sat
  { n: 47, code: CODE.smt2PushPop, lang: 'smt2' }, // control: push and pop, three queries
  { n: 48, code: CODE.bvOptimize, key: 'A', options: BV_VALUES }, // control: a bit-vector optimum keyed 6
  { n: 49, code: CODE.sat }, // its witness export rewritten
  { n: 50, code: CODE.optimize, key: 'A', options: VALUES }, // its attained-optimum export rewritten
  { n: 51, code: CODE.smt2SetsRlimit, lang: 'smt2' }, // control, with 52: a global option set by one cell
  { n: 52, code: CODE.readsParams, key: 'A' }, // is not seen by the next
  { n: 53, code: CODE.assumed, key: 'B' }, // control: unsat under an assumption, which joins the export
  { n: 54, code: CODE.unsat, lang: 'py' }, // a free run on INS-z3 in a language Z3 does not run
  { n: 55, code: CODE.sat }, // a check the gate could not record
  { n: 56, code: CODE.badModel }, // a model that fails its query, by the harness's own evaluation
  { n: 57, code: CODE.badModelStarter }, // the same, cvc5 lying that the witness holds
  { n: 58, code: CODE.sat }, // Pyodide's witness lied to
  { n: 59, code: CODE.sat }, // Pyodide's record lied to
  { n: 60, code: CODE.optimize, key: 'A', options: VALUES }, // its bound unread by cvc5
  { n: 61, code: CODE.optimizeSoft, key: 'A', options: VALUES }, // a value key beside a soft constraint
  { n: 62, code: CODE.quantForall, key: 'A' }, // control: D-03's quantified query keyed sat
  { n: 63, code: CODE.quantForall }, // control: the same, settled by Z3 alone
  { n: 64, code: CODE.quantNotForall, key: 'A' }, // control: a negated quantifier keyed sat
  { n: 65, code: CODE.quantAccounts, key: 'A' }, // control: a violation quantified over accounts keyed sat
  { n: 66, code: CODE.badQuantModel }, // a model that fails a quantified query
  { n: 67, code: CODE.unsettledPinned }, // an unsettled witness cvc5 does not settle
  { n: 68, code: CODE.unsettledUnpinned }, // an unsettled witness over a constant the model does not pin
  { n: 69, code: CODE.unsettledPinned }, // control: an unsettled witness cvc5 settles
  { n: 70, code: CODE.smt2ErrorLines, lang: 'smt2' }, // control: error lines before and between two unsats
  { n: 71, code: CODE.smt2PrintCommands, lang: 'smt2', key: 'A' }, // control: print commands around two queries
  { n: 72, code: CODE.smt2Unsplittable, lang: 'smt2' }, // an SMT-LIB text that cannot be split
  { n: 73, code: CODE.unsat }, // cvc5's unsat after an error line
  { n: 74, code: CODE.unsat }, // cvc5's two verdicts for one query
  { n: 75, code: CODE.ownModel }, // control: the cell's own model is left as Z3 gave it
  { n: 76, code: CODE.unsat }, // native unsat, Pyodide told unknown
  { n: 77, code: CODE.sat }, // native told unknown, Pyodide sat
  { n: 78, code: CODE.sat }, // native sat, Pyodide told unsat
  { n: 79, code: CODE.unsat, key: 'C' }, // a decided unsat query keyed unknown (dp:Z6)
  { n: 80, code: CODE.sat, key: 'C' }, // a sat query keyed unknown
  { n: 81, code: CODE.smt2NoBudget, lang: 'smt2', key: 'C' }, // control: an SMT-LIB cell under the gate's rlimit
  { n: 82, code: CODE.optimizeNoBudget, key: 'C' }, // control: an Optimize under the gate's rlimit
  { n: 83, code: CODE.setParamBudget, key: 'C' }, // control: set_param('rlimit', 100)
  { n: 84, code: CODE.optimizeBudget, key: 'C' }, // control: o.set('rlimit', 100)
  { n: 85, code: CODE.solverBudgetByKeyword, key: 'C' }, // control, with 86 and 87: an own rlimit given by keyword
  { n: 86, code: CODE.optimizeBudgetByKeyword, key: 'C' },
  { n: 87, code: CODE.setParamBudgetByKeyword, key: 'C' },
  { n: 88, code: CODE.optimizeBudget, key: 'A', options: VALUES }, // an Optimize its own rlimit stops, keyed 1
  { n: 89, code: CODE.optimize, key: 'A', options: VALUES }, // its optimum's queries lost
  { n: 90, code: CODE.unsat }, // its export rewritten so that real cvc5 prints an error line before its unsat
  { n: 91, code: CODE.unsat }, // its export rewritten so that real cvc5 prints two verdicts
  { n: 92, code: CODE.sat }, // native sat, Pyodide told unknown
  { n: 93, code: CODE.unsat }, // native told unknown, Pyodide unsat
  { n: 94, code: CODE.sat }, // a reply that says the cell ran and holds no checks
  { n: 95, code: CODE.realOptimum, key: 'A', options: NEG_DECIMAL }, // control: -3/2 keyed -1.5
  { n: 96, code: CODE.realOptimum, key: 'B', options: NEG_DECIMAL }, // -3/2 keyed 1.5, the sign dropped
  { n: 97, code: CODE.realOptimum, key: 'A', options: NEG_FRACTION }, // control: -3/2 keyed -3/2
  { n: 98, code: CODE.thousandOptimum, key: 'A', options: THOUSANDS }, // control: 1000 keyed 1,000
  { n: 99, code: CODE.maximize, key: 'A', options: MAX_VALUES }, // control: a maximum of 5 keyed 5
  { n: 100, code: CODE.minMax, key: 'A', options: VALUES }, // a value key on a minimize beside a maximize
  { n: 101, code: CODE.unsettledSort }, // an unsettled witness over constants of an uninterpreted sort
  { n: 102, code: CODE.platformUnsat }, // a real divergence: unsat on native, unknown on Pyodide
  { n: 103, code: CODE.platformReason }, // a real divergence of the reasons for unknown
  { n: 104, code: CODE.unevaluable }, // a formula Z3 cannot evaluate under the model
  { n: 105, code: CODE.unrecordable }, // a check the gate really cannot record
  { n: 106, code: CODE.smt2Quoting, lang: 'smt2' }, // control: strings, comments and quoted symbols split as Z3 reads them
  { n: 107, code: CODE.smt2Reason, lang: 'smt2' }, // Pyodide's reason for unknown lost
  { n: 108, code: CODE.smt2ReasonUnsplit, lang: 'smt2' }, // the same, in a script run whole
  { n: 109, code: CODE.smt2Exit, lang: 'smt2' }, // control: nothing runs after (exit)
];

/** A page where two cells share a number: a sat query keyed unsat, and an unsat query, both numbered 1. */
const DUPLICATE_PAGE = (id) => page(id, [{ n: 1, code: CODE.sat, key: 'B' }, { n: 1, code: CODE.unsat, key: 'B' }]);

/** Each S1 page whose first cell is copied with a wrong key: the acceptance's planted wrong expected verdict on an authored S1 cell. */
const S1_MUTANTS = [
  { from: 'content/stages/S1/S1.L1.md', id: 'S9.L3', key: ['@call key=B', '@call key=A'], note: "S1.L1's mis-negation, unsat, keyed `sat`" },
  { from: 'content/stages/S1/S1.L5.md', id: 'S9.L4', key: ['@call key=A run=RUN-z3-bv64-negamt', '@call key=B run=RUN-z3-bv64-negamt'], note: "S1.L5's sender at 64 bits, sat, keyed `unsat`" },
  { from: 'content/stages/S1/S1.L2.md', id: 'S9.L5', key: ['@call key=C', '@call key=B'], note: "S1.L2's x**y == 8, unknown, keyed `unsat`" },
];

const ref = (p, n) => `planted:cell:${p}#${n}`;
const L1 = (n) => ref('S9.L1', n);
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const firstCheck = (fn) => (r) => {
  if (r?.checks?.[0]) fn(r.checks[0], r);
  return r;
};

/**
 * SMT-LIB text with the last equality that pins `name` to a number made to pin it to `to`: Z3 prints the equalities a
 * model or an optimum adds as (= 1 amount) or (= amount 1). Throws when the text pins no value of `name`, so a case
 * built on the harness's export fails when the export has lost its equalities, rather than passing with nothing told.
 */
export function repin(text, name, to) {
  const num = String.raw`(?:\d+|\(-\s*\d+\))`;
  const re = new RegExp(String.raw`\(=\s+(?:${name}\s+${num}|${num}\s+${name})\s*\)`, 'g');
  const found = typeof text === 'string' ? [...text.matchAll(re)] : [];
  if (found.length === 0) throw new Error(`the export pins no value of ${name} to rewrite`);
  const last = found.at(-1);
  return `${text.slice(0, last.index)}(= ${name} ${to})${text.slice(last.index + last[0].length)}`;
}

/**
 * SMT-LIB text with `command` put on a line of its own before its last (check-sat), for real cvc5 to answer. Throws when
 * the text has no (check-sat), so a case built on the harness's export fails rather than pass with nothing told.
 */
export function beforeCheck(text, command) {
  const at = typeof text === 'string' ? text.lastIndexOf('(check-sat)') : -1;
  if (at < 0) throw new Error('the export has no (check-sat) to put a command before');
  return `${text.slice(0, at)}${command}\n${text.slice(at)}`;
}

/**
 * The cases: `refs` the cells it judges, `expect` the checks it must trip (exactly), and the lies it tells: `native`
 * or `pyodide` rewrites that engine's reply, `cvc5(task)` answers a cvc5 task in place of cvc5, `probes` stands in for
 * the engines' version lines, `lane` judges it as that lane, `pages` names unreadable pages it covers. `unsat`,
 * `optima` and `witnesses` are the least numbers of each that cvc5 must confirm; `unsettled` asks that the harness
 * leave an assertion of a witness unsettled on both engines, which is what the case is about; `checks` is the exact
 * number of checks each of its cells must make on each engine.
 */
export const CASES = [
  { name: 'control: a sat query keyed sat', refs: [L1(1)], expect: [] },
  { name: 'a sat query keyed unsat (a planted wrong expected verdict)', refs: [L1(2)], expect: ['key'] },
  { name: 'control: an unsat query keyed unsat, its unsat confirmed by cvc5', refs: [L1(3)], expect: [], unsat: 1 },
  { name: 'an unsat query keyed sat (a planted wrong expected verdict)', refs: [L1(4)], expect: ['key'] },
  { name: 'an unknown query keyed sat (a planted wrong expected verdict)', refs: [L1(5)], expect: ['key'] },
  { name: 'control: an unknown query keyed unknown', refs: [L1(6)], expect: [] },
  { name: 'an optimum of 1 keyed 0 (a planted wrong expected value)', refs: [L1(7)], expect: ['key'] },
  { name: 'control: an optimum of 1 keyed 1, confirmed by cvc5', refs: [L1(8)], expect: [], optima: 1 },
  { name: 'a value key on a plain solver query, whose model values are not canonical', refs: [L1(9)], expect: ['value-query'] },
  { name: 'a value key on an Optimize with two objectives', refs: [L1(10)], expect: ['value-query'] },
  { name: 'a key option that names no verdict and is no number', refs: [L1(11)], expect: ['key-read'] },
  { name: 'a key option that names two verdicts', refs: [L1(12)], expect: ['key-read'] },
  { name: 'a call whose cell makes no solver check', refs: [L1(13)], expect: ['no-check'] },
  { name: 'a call whose cell raises', refs: [L1(14)], expect: ['run'] },
  { name: 'a call whose cell has no code', refs: [L1(15)], expect: ['cell-code'] },
  { name: 'a call whose code is in a language Z3 does not run', refs: [L1(16)], expect: ['cell-code'] },
  { name: 'a call on an instrument whose engine has not landed (Spectacle)', refs: [L1(17)], expect: ['instrument'] },
  { name: 'control: a Lean call in the fast lane is deferred to the nightly lane', refs: [L1(18)], expect: [] },
  { name: 'a Lean call in the nightly lane, with no Lean engine yet', refs: [L1(19)], expect: ['instrument'], lane: 'nightly' },
  { name: 'a call on an instrument GATE-calls does not know', refs: [L1(20)], expect: ['instrument'] },
  { name: 'native and Pyodide disagree on a verdict', refs: [L1(21)], expect: ['divergence'], pyodide: firstCheck((c) => (c.verdict = 'sat')) },
  { name: 'native and Pyodide disagree on the reason of an unknown', refs: [L1(22)], expect: ['divergence'], pyodide: firstCheck((c) => (c.reason = 'canceled')) },
  { name: 'a cell that sets a budget on Pyodide alone (sys.platform), so the engines really disagree: unsat on native, unknown on Pyodide', refs: [L1(102)], expect: ['divergence'] },
  { name: 'a cell that sets a budget on Pyodide alone, so both engines really answer unknown, for different reasons', refs: [L1(103)], expect: ['divergence'] },
  { name: 'native and Pyodide make different numbers of checks', refs: [L1(23)], expect: ['divergence'], pyodide: (r) => (r?.checks && (r.checks = r.checks.slice(0, 1)), r) },
  { name: 'native and Pyodide disagree on an optimum', refs: [L1(24)], expect: ['divergence'], pyodide: firstCheck((c) => c.objectives?.[0] && (c.objectives[0].value = '2')) },
  { name: "a witness that fails its query by Z3's own evaluation", refs: [L1(25)], expect: ['witness'], native: firstCheck((c) => (c.witness = { holds: false, failed: ['a - amount < 0'], free: [] })) },
  { name: 'a witness that cvc5 refutes', refs: [L1(26)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' && t.engine === 'pyodide' ? { verdicts: ['unsat'], errors: [] } : undefined) },
  { name: 'an unsat that cvc5 contradicts', refs: [L1(27)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: 'an unsat that cvc5 does not settle', refs: [L1(28)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: ['unknown'], errors: [] } : undefined) },
  { name: 'an unsat that cvc5 cannot read', refs: [L1(29)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: [], errors: ['(error "planted")'], detail: '(error "planted")' } : undefined) },
  { name: 'an unsat with no SMT-LIB export', refs: [L1(30)], expect: ['cvc5'], native: firstCheck((c) => ((c.smt2 = null), (c.smt2_error = 'planted: the export failed'))) },
  { name: 'an optimum that cvc5 finds a value beyond', refs: [L1(31)], expect: ['optimum'], cvc5: (t) => (t.kind === 'beyond' ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: 'an optimum that cvc5 finds unattainable', refs: [L1(32)], expect: ['optimum'], cvc5: (t) => (t.kind === 'at' ? { verdicts: ['unsat'], errors: [] } : undefined) },
  { name: 'an optimum whose bound cvc5 does not settle', refs: [L1(33)], expect: ['optimum'], cvc5: (t) => (t.kind === 'beyond' ? { verdicts: ['unknown'], errors: [] } : undefined) },
  { name: 'a cell the watchdog stopped', refs: [L1(34)], expect: ['run'], native: () => ({ terminated: true, detail: 'planted: no reply within 30 s' }) },
  { name: 'a cell whose engine died', refs: [L1(35)], expect: ['run'], pyodide: () => ({ crashed: true, detail: 'planted: the engine exited' }) },
  { name: 'a cell the engine refused', refs: [L1(36)], expect: ['run'], native: () => ({ ok: false, code: 'invalid-input', detail: 'planted' }) },
  { name: 'an SMT-LIB unsat that cvc5 contradicts', refs: [L1(37)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: 'an SMT-LIB unsat that cvc5 cannot read', refs: [L1(38)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: [], errors: ['(error "planted")'], detail: '(error "planted")' } : undefined) },
  { name: 'an SMT-LIB sat that cvc5 refutes', refs: [L1(39)], expect: ['witness'], cvc5: (t) => (t.kind === 'query' ? { verdicts: ['unsat'], errors: [] } : undefined) },
  { name: 'an SMT-LIB call keyed sat on an unsat script (a planted wrong expected verdict)', refs: [L1(40)], expect: ['key'] },
  { name: 'control: an SMT-LIB call keyed unsat, its unsat confirmed by cvc5', refs: [L1(41)], expect: [], unsat: 1 },
  { name: 'control: an SMT-LIB free run whose sat cvc5 confirms', refs: [L1(42)], expect: [], witnesses: 1 },
  { name: "control: a cell that sets no rlimit, only other options (set_param('smt.random_seed', 7), s.set('random_seed', 7)), runs under the gate's: the cubes query stops at unknown (canceled)", refs: [L1(43)], expect: [] },
  { name: 'control: a cell that tracks its assertions for an unsat core, its unsat confirmed by cvc5', refs: [L1(44)], expect: [], unsat: 1 },
  { name: 'control: an SMT-LIB call with two queries (sat, then unsat once the guard is asserted), keyed by the first; cvc5 answers each query by itself', refs: [L1(45)], expect: [], unsat: 1 },
  { name: 'an SMT-LIB unsat at the second query that cvc5 contradicts', refs: [L1(46)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' && t.check === 2 ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: 'control: an SMT-LIB free run with push and pop (sat, unsat, sat), its unsat confirmed by cvc5', refs: [L1(47)], expect: [], unsat: 1 },
  { name: 'control: a bit-vector objective keyed 6 (Z3 reports its optimum as an Int numeral), cvc5 confirming nothing below it and that it is attained', refs: [L1(48)], expect: [], optima: 1 },
  { name: "a witness export rewritten to pin amount at 0, which real cvc5 refutes", refs: [L1(49)], expect: ['witness'], native: firstCheck((c) => (c.witness_smt2 = repin(c.witness_smt2, 'amount', '0'))) },
  {
    name: 'an attained-optimum export rewritten to pin amount at 0, which real cvc5 finds unsatisfiable',
    refs: [L1(50)],
    expect: ['optimum'],
    native: firstCheck((c) => {
      if (!c.optimum_smt2) throw new Error('the check carries no optimum queries to rewrite');
      c.optimum_smt2.at = repin(c.optimum_smt2.at, 'amount', '0');
    }),
  },
  { name: "control: a cell sees Z3's global parameters at their defaults, though the SMT-LIB cell before it set (set-option :rlimit 100)", refs: [L1(51), L1(52)], expect: [] },
  { name: 'control: an unsat under an assumption (s.check(guard)), the assumption asserted in the export, confirmed by cvc5', refs: [L1(53)], expect: [], unsat: 1 },
  { name: 'a free run on INS-z3 in a language Z3 does not run (py), which would never be reproduced', refs: [L1(54)], expect: ['cell-code'] },
  { name: 'a check the gate could not record', refs: [L1(55)], expect: ['run'], native: firstCheck((c) => (c.record_error = 'planted: KeyError')) },
  { name: "a model that fails its query by the harness's own evaluation (a = -1 for a > 0), cvc5 not settling the witness", refs: [L1(56)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['unknown'], errors: [] } : undefined) },
  { name: "a model that fails its query by the harness's own evaluation (amount = 0 for amount > 0), cvc5 lying that the witness holds", refs: [L1(57)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: "a witness that fails its query by Z3's own evaluation on Pyodide", refs: [L1(58)], expect: ['witness'], pyodide: firstCheck((c) => (c.witness = { holds: false, failed: ['a - amount < 0'], free: [] })) },
  { name: 'a check the gate could not record on Pyodide', refs: [L1(59)], expect: ['run'], pyodide: firstCheck((c) => (c.record_error = 'planted: KeyError')) },
  { name: "a check the gate really cannot record (its solver's assertions() raises) in a cell that catches what its check raises: the record says so, and the bookkeeping never raises into the cell", refs: [L1(105)], expect: ['run'] },
  { name: 'an optimum whose bound cvc5 cannot read', refs: [L1(60)], expect: ['optimum'], cvc5: (t) => (t.kind === 'beyond' ? { verdicts: [], errors: ['(error "planted")'], detail: '(error "planted")' } : undefined) },
  { name: 'a value key on an Optimize with one objective and a soft constraint', refs: [L1(61)], expect: ['value-query'] },
  { name: "control: D-03's query, some y that is no perfect square, keyed sat: the quantifier Z3's evaluator leaves is settled, and cvc5 confirms both witnesses", refs: [L1(62)], expect: [], witnesses: 2 },
  { name: "control: D-03's quantified query with cvc5 not settling its witnesses: the harness settles the quantifier itself", refs: [L1(63)], expect: [], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['unknown'], errors: [] } : undefined) },
  { name: 'control: a negated quantifier (a guard on the wrong balance) keyed sat, both witnesses confirmed by cvc5', refs: [L1(64)], expect: [], witnesses: 2 },
  { name: 'control: a violation quantified over an enumeration of accounts keyed sat, both witnesses confirmed by cvc5', refs: [L1(65)], expect: [], witnesses: 2 },
  { name: 'a query with a formula Z3 cannot evaluate under the model (a Python True, handed over by s.assertions()): the witness fails rather than pass the formula unread', refs: [L1(104)], expect: ['witness'] },
  { name: "a model that fails a quantified query (y = 4 for some y that is no perfect square), cvc5 lying that the witness holds", refs: [L1(66)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['sat'], errors: [] } : undefined) },
  { name: "a witness Z3's evaluation leaves unsettled (a quantifier under a budget too small to settle it) and cvc5 does not settle", refs: [L1(67)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['unknown'], errors: [] } : undefined), unsettled: true },
  { name: "a witness Z3's evaluation leaves unsettled over a constant the model does not pin, which cvc5's sat on the witness query cannot settle", refs: [L1(68)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['sat'], errors: [] } : undefined), unsettled: true },
  { name: "control: a witness Z3's evaluation leaves unsettled, which cvc5 settles on the witness query, the model pinning every constant", refs: [L1(69)], expect: [], witnesses: 2, unsettled: true },
  { name: "a witness Z3's evaluation leaves unsettled over constants of an uninterpreted sort, whose model values pin nothing, so cvc5's sat cannot settle it", refs: [L1(101)], expect: ['witness'], cvc5: (t) => (t.kind === 'witness' ? { verdicts: ['sat'], errors: [] } : undefined), unsettled: true },
  { name: 'control: an SMT-LIB free run with error lines before and between its two unsats (an undeclared symbol, a get-model after unsat), both confirmed by cvc5 on the commands Z3 ran', refs: [L1(70)], expect: [], unsat: 2 },
  { name: 'control: an SMT-LIB call keyed sat around which the script prints (an echo of "unsat" first, get-model and get-info between its queries), its later unsat confirmed by cvc5', refs: [L1(71)], expect: [], unsat: 1 },
  { name: 'an SMT-LIB unsat in a text the gate cannot split into commands, so it has no query for cvc5', refs: [L1(72)], expect: ['cvc5'] },
  { name: 'control: an SMT-LIB free run whose string, comment and quoted symbol hold ( ) ; and "", split into commands as Z3 reads it, its unsat confirmed by cvc5', refs: [L1(106)], expect: [], unsat: 1 },
  { name: 'native and Pyodide disagree on the reason of an SMT-LIB unknown, which the script asks for with get-info (Pyodide\'s lost)', refs: [L1(107)], expect: ['divergence'], pyodide: firstCheck((c) => (c.reason = null)) },
  { name: 'the same in an SMT-LIB script the gate runs whole, since a ) closes nothing', refs: [L1(108)], expect: ['divergence'], pyodide: firstCheck((c) => (c.reason = null)) },
  { name: 'control: an SMT-LIB free run with a check after (exit), which never runs: one check on each engine, its sat confirmed by cvc5', refs: [L1(109)], expect: [], checks: 1, witnesses: 1 },
  { name: 'an unsat that cvc5 answers after an error line', refs: [L1(73)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: ['unsat'], errors: ['(error "planted")'] } : undefined) },
  { name: 'an unsat that cvc5 answers with two verdicts', refs: [L1(74)], expect: ['cvc5'], cvc5: (t) => (t.kind === 'unsat' ? { verdicts: ['unsat', 'unsat'], errors: [] } : undefined) },
  { name: "control: the model a cell reads after its check is the one Z3 gave, though the harness evaluated its query under that model with model completion", refs: [L1(75)], expect: [] },
  // a divergence on every ordered pair of verdicts, unknown among them (with case 21, native unsat and Pyodide sat)
  { name: 'native and Pyodide disagree when one of them answers unknown (unsat on native)', refs: [L1(76)], expect: ['divergence'], pyodide: firstCheck((c) => ((c.verdict = 'unknown'), (c.reason = 'canceled'))) },
  { name: 'native and Pyodide disagree, native unknown and Pyodide sat', refs: [L1(77)], expect: ['divergence'], native: firstCheck((c) => ((c.verdict = 'unknown'), (c.reason = 'canceled'))) },
  { name: 'native and Pyodide disagree, native sat and Pyodide unsat', refs: [L1(78)], expect: ['divergence'], pyodide: firstCheck((c) => (c.verdict = 'unsat')) },
  { name: 'native and Pyodide disagree, native sat and Pyodide unknown', refs: [L1(92)], expect: ['divergence'], pyodide: firstCheck((c) => ((c.verdict = 'unknown'), (c.reason = 'canceled'))) },
  { name: 'native and Pyodide disagree, native unknown and Pyodide unsat', refs: [L1(93)], expect: ['divergence'], native: firstCheck((c) => ((c.verdict = 'unknown'), (c.reason = 'canceled'))) },
  // a key that claims unknown on a query Z3 decides, each way
  { name: 'a decided unsat query keyed unknown (dp:Z6; a planted wrong expected verdict)', refs: [L1(79)], expect: ['key'] },
  { name: 'a sat query keyed unknown (a planted wrong expected verdict)', refs: [L1(80)], expect: ['key'] },
  // the budget of every kind of check: the gate's when the cell sets none, else the cell's own, however it sets it
  { name: "control: an SMT-LIB cell that sets no rlimit runs under the gate's: the cubes query stops at unknown (canceled)", refs: [L1(81)], expect: [] },
  { name: "control: an Optimize that sets no rlimit, only another option (o.set('maxsat_engine', 'maxres')), runs under the gate's: the cubes query, minimized, stops at unknown (canceled)", refs: [L1(82)], expect: [] },
  { name: "control: a cell's own set_param('rlimit', 100) wins over the gate's rlimit: a guard on the wrong balance, sat under the gate's, stops at unknown", refs: [L1(83)], expect: [] },
  { name: "control: an Optimize's own o.set('rlimit', 100) wins over the gate's rlimit: the starter, minimized, stops at unknown", refs: [L1(84)], expect: [] },
  { name: "control: a cell's own rlimit given by keyword (s.set(rlimit=100), o.set(rlimit=100), set_param(rlimit=100)) wins over the gate's: each check stops at unknown", refs: [L1(85), L1(86), L1(87)], expect: [] },
  { name: 'a value key on an Optimize that its own rlimit stops at unknown, so no optimum is reached (a planted wrong expected value)', refs: [L1(88)], expect: ['key'] },
  { name: "a value key whose optimum has no queries for cvc5", refs: [L1(89)], expect: ['optimum'], native: firstCheck((c) => ((c.optimum_smt2 = null), (c.optimum_smt2_error = 'planted: the queries could not be written'))) },
  // cvc5's own output read: the export rewritten so that real cvc5 prints an error line, or a second verdict, beside its unsat
  { name: 'an unsat whose query, rewritten with a get-model before its check, makes real cvc5 print an error line before its unsat', refs: [L1(90)], expect: ['cvc5'], native: firstCheck((c) => (c.smt2 = beforeCheck(c.smt2, '(get-model)'))) },
  { name: 'an unsat whose query, rewritten with a second check, makes real cvc5 print two verdicts', refs: [L1(91)], expect: ['cvc5'], native: firstCheck((c) => (c.smt2 = beforeCheck(c.smt2, '(check-sat)'))) },
  { name: 'a reply that says the cell ran and holds no checks', refs: [L1(94)], expect: ['run'], native: () => ({ ok: true, error: null, stdout: '' }) },
  // a value key in each number form the gate reads, against an optimum Z3 prints as a fraction or as a plain integer
  { name: 'control: a negative decimal key (`-1.5`) on an optimum Z3 prints as -3/2, confirmed by cvc5', refs: [L1(95)], expect: [], optima: 1 },
  { name: 'a decimal key with its sign dropped (`1.5`) on an optimum of -3/2 (a planted wrong expected value)', refs: [L1(96)], expect: ['key'] },
  { name: 'control: a fraction key (`-3/2`) on an optimum of -3/2, confirmed by cvc5', refs: [L1(97)], expect: [], optima: 1 },
  { name: 'control: a key with a thousands separator (`1,000`) on an optimum of 1000, confirmed by cvc5', refs: [L1(98)], expect: [], optima: 1 },
  { name: 'control: a maximum of 5 keyed 5, cvc5 confirming nothing above it and that it is attained', refs: [L1(99)], expect: [], optima: 1 },
  { name: 'a value key on an Optimize that minimizes one term and maximizes another', refs: [L1(100)], expect: ['value-query'] },
  { name: 'an engine off its pin', refs: [], expect: ['pin'], probes: { native: { z3: '5.3.0', python: '3.13', platform: 'linux' } } },
  { name: 'Pyodide off its own pin, its z3 at the pin', refs: [], expect: ['pin'], probes: { pyodide: { z3: PINS.z3.versionString, pyodide: '0.27.0', python: '3.13', platform: 'emscripten' } } },
  { name: "Pyodide's z3 off its pin, Pyodide at its own", refs: [], expect: ['pin'], probes: { pyodide: { z3: '5.3.0', pyodide: PINS.pyodide.version, python: '3.13', platform: 'emscripten' } } },
  { name: 'a page with no front matter, whose cells cannot be seen', refs: [], expect: ['page'], pages: ['planted:content/stages/S9/S9.L2.md'] },
  { name: 'a page where two cells share a number (a sat query keyed unsat among them), which cannot be told apart', refs: [], expect: ['page'], pages: ['planted:content/stages/S9/S9.L6.md'] },
  { name: 'a page file that cannot be read (a folder where the page should be), whose cells cannot be seen', refs: [], expect: ['page'], pages: ['planted:content/stages/S9/S9.L7.md'] },
  ...S1_MUTANTS.map((m) => ({ name: `an S1 authored cell with a wrong key: ${m.note} (a planted wrong expected verdict)`, refs: [ref(m.id, 1)], expect: ['key'] })),
];

/**
 * A cvc5 that is not the pinned binary but prints the recorded version line, in a scratch folder of its own: only the
 * SHA-256 can tell it from the pinned one. Returns its path; the caller removes its folder.
 */
function fakeCvc5(versionLine) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-fake-cvc5-'));
  const bin = path.join(dir, 'cvc5');
  fs.writeFileSync(bin, `#!/bin/sh\necho '${String(versionLine).replace(/'/g, '')}'\n`, { mode: 0o755 });
  return bin;
}

/**
 * Cases on how cvc5 is set up. cvc5's pin is checked when it is set up, not by the judge (whose `pin` check reads the
 * Z3 engines' probes), so a binary that is not the pinned one must be refused there, however it is named. Each runs
 * the gate's own prepareCvc5 and returns the findings it saw: a refusal is a `pin` finding, and so is a fake chosen.
 */
export const SETUP_CASES = [
  {
    name: 'a cvc5 that is not the pinned binary, named by STATESPACE_CVC5, is refused, though it prints the recorded version line',
    expect: ['pin'],
    async run({ prepareCvc5, cvc5 }) {
      const fake = fakeCvc5(cvc5.pin.versionLine);
      try {
        await prepareCvc5({ env: { ...process.env, STATESPACE_CVC5: fake } });
        return []; // set up without a refusal: the fake was not refused
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e);
        // refused for its SHA-256, the only thing that tells the fake from the pinned binary
        if (/SHA-256/.test(why)) return [{ check: 'pin', ref: 'cvc5', file: null, detail: why }];
        throw new Error(`prepareCvc5 failed beside the fake for another reason: ${why}`);
      } finally {
        fs.rmSync(path.dirname(fake), { recursive: true, force: true });
      }
    },
  },
  {
    name: 'control: a cvc5 on PATH that is not the pinned binary is passed over for the pinned one, though it prints the recorded version line',
    expect: [],
    async run({ prepareCvc5, cachedBinary, cvc5 }) {
      const fake = fakeCvc5(cvc5.pin.versionLine);
      // a scratch engine cache that holds the pinned binary (a link to the one this run set up), so nothing is fetched
      const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-cache-'));
      const pinned = cachedBinary(cacheDir, cvc5.pin);
      fs.mkdirSync(path.dirname(pinned), { recursive: true });
      fs.symlinkSync(path.resolve(cvc5.path), pinned);
      const { STATESPACE_CVC5: _named, ...env } = process.env;
      try {
        const got = await prepareCvc5({ cacheDir, env: { ...env, PATH: `${path.dirname(fake)}${path.delimiter}${env.PATH ?? ''}` } });
        return got.path === pinned ? [] : [{ check: 'pin', ref: 'cvc5', file: null, detail: got.path === fake ? 'the cvc5 on PATH was used, though it is not the pinned binary' : 'a cvc5 other than the pinned one in the engine cache was used' }];
      } catch (e) {
        return [{ check: 'pin', ref: 'cvc5', file: null, detail: `the pinned cvc5 could not be set up beside a fake on PATH: ${e instanceof Error ? e.message : String(e)}` }];
      } finally {
        fs.rmSync(path.dirname(fake), { recursive: true, force: true });
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }
    },
  },
];

/** The checks a planted case covers: every check of the judge must be tripped by at least one case. */
export function uncoveredChecks() {
  const covered = new Set(CASES.flatMap((c) => c.expect));
  return Object.keys(CHECKS).filter((c) => !covered.has(c));
}

/** Write the planted pages to a fresh scratch tree and return its root (the caller removes it). */
export function writePlantedTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-planted-'));
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  write('content/stages/S9/S9.L1.md', page('S9.L1', PLANTED_CELLS));
  write('content/stages/S9/S9.L2.md', '## A page with no front matter {minutes=5}\n\nIts cells cannot be read.\n');
  write('content/stages/S9/S9.L6.md', DUPLICATE_PAGE('S9.L6'));
  fs.mkdirSync(path.join(root, 'content', 'stages', 'S9', 'S9.L7.md')); // a page name that is no file
  for (const m of S1_MUTANTS) {
    const text = fs.readFileSync(path.join(S1_FIXTURES, m.from), 'utf8');
    const [from, to] = m.key;
    if (!text.includes(from)) throw new Error(`the S1 fixture ${m.from} no longer has "${from}" to plant a wrong key in`);
    write(`content/stages/S9/${m.id}.md`, text.replace(/^id: S1\.L\d+$/m, `id: ${m.id}`).replace(from, to));
  }
  return root;
}

/** Apply a case's lies to copies of the replies of its cells; `problems` holds each lie that could not be told. */
export function liedReplies(kase, replies) {
  const out = { native: new Map(), pyodide: new Map(), problems: [] };
  for (const r of kase.refs) {
    for (const e of ['native', 'pyodide']) {
      const reply = clone(replies[e].get(r));
      let told = reply;
      if (kase[e]) {
        try {
          told = kase[e](reply);
        } catch (err) {
          out.problems.push(`the lie to ${e}'s reply to ${r} could not be told: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      out[e].set(r, told);
    }
  }
  return out;
}

/** The S1 authored cells as one control: no finding, all twelve calls present, every unsat confirmed by cvc5. */
export const S1_CONTROL = Object.freeze({ name: 'control: the S1 authored cells of curriculum/S01-counterexample.md section 2, as lesson pages (fixtures/s1)', calls: 12 });

/** The cells the planted cases judge: only these planted cells are run. */
export const plantedRefs = () => new Set(CASES.flatMap((c) => c.refs));

/**
 * Judge every case on what the engines printed: each must trip exactly its expected checks. `cells` holds the planted
 * and the fixture cells (with their prefixes), `replies` the engines' replies to them, `problems` the planted pages
 * that could not be read. Real cvc5 answers every task a case does not answer itself. Then the setup cases run the
 * gate's own `prepareCvc5` beside fakes (`setup` holds lib/cvc5.mjs's prepareCvc5 and cachedBinary).
 */
export async function evaluateCases({ cells, fixtureCells, replies, problems, cvc5, judge, runCvc5Tasks, setup }) {
  const { judgeCells, planCvc5, judgeEngines, pageFindings } = judge;
  const byRef = new Map(cells.map((c) => [c.ref, c]));
  const control = { ...S1_CONTROL, refs: fixtureCells.map((c) => c.ref), expect: [], allUnsatConfirmed: true };
  const results = [];
  for (const kase of [control, ...CASES]) {
    const caseCells = kase.refs.map((r) => byRef.get(r));
    const missing = kase.refs.filter((r, i) => !caseCells[i]);
    if (missing.length) {
      results.push({ name: kase.name, expect: kase.expect, got: [], pass: false, detail: `the planted cell ${missing.join(', ')} was not found by discovery`, findings: [] });
      continue;
    }
    const lied = liedReplies(kase, replies);
    const tasks = planCvc5(caseCells, lied);
    const answers = await runCvc5Tasks({ cvc5, tasks, override: kase.cvc5 ?? (() => undefined) });
    const judged = judgeCells({ cells: caseCells, replies: lied, cvc5: answers, lane: kase.lane ?? 'fast' });
    const findings = [...judged.findings];
    if (kase.probes) findings.push(...judgeEngines(kase.probes));
    if (kase.pages) findings.push(...pageFindings(problems.filter((p) => kase.pages.includes(p.file))));
    const got = [...new Set(findings.map((f) => f.check))].sort();
    const want = [...new Set(kase.expect)].sort();
    const problemsOf = [...lied.problems];
    if (got.join(',') !== want.join(',')) problemsOf.push(`tripped [${got.join(', ') || 'nothing'}], built to trip [${want.join(', ') || 'nothing'}]`);
    if (kase.unsat && judged.counts.unsatConfirmed < kase.unsat) problemsOf.push(`cvc5 confirmed ${judged.counts.unsatConfirmed} unsat answer(s), at least ${kase.unsat} expected`);
    if (kase.optima && judged.counts.optimaConfirmed < kase.optima) problemsOf.push(`cvc5 confirmed ${judged.counts.optimaConfirmed} optimum (nothing beyond it, and it attained), at least ${kase.optima} expected`);
    if (kase.witnesses && judged.counts.witnessesConfirmed < kase.witnesses) problemsOf.push(`cvc5 confirmed ${judged.counts.witnessesConfirmed} witness(es), at least ${kase.witnesses} expected`);
    if (kase.unsettled && !kase.refs.every((r) => ['native', 'pyodide'].every((e) => lied[e].get(r)?.checks?.some((c) => c.witness?.unsettled?.length)))) {
      problemsOf.push("the harness settled every assertion of the witness, so the case no longer shows an unsettled one");
    }
    if (kase.allUnsatConfirmed && (judged.counts.unsatChecked === 0 || judged.counts.unsatConfirmed !== judged.counts.unsatChecked)) {
      problemsOf.push(`cvc5 confirmed ${judged.counts.unsatConfirmed} of ${judged.counts.unsatChecked} unsat answers`);
    }
    if (kase.calls !== undefined && judged.counts.calls !== kase.calls) problemsOf.push(`${judged.counts.calls} calls judged, ${kase.calls} expected`);
    if (kase.checks !== undefined) {
      for (const r of kase.refs) {
        for (const e of ['native', 'pyodide']) {
          const n = lied[e].get(r)?.checks?.length;
          if (n !== kase.checks) problemsOf.push(`${e} made ${n ?? 'no'} check(s) in ${r}, ${kase.checks} expected`);
        }
      }
    }
    results.push({
      name: kase.name,
      expect: want,
      got,
      pass: problemsOf.length === 0,
      detail: problemsOf.join('; ') || (findings.length ? findings.map((f) => `${f.check}: ${f.detail}`).join(' | ') : 'no finding'),
      counts: judged.counts,
      findings,
    });
  }
  for (const kase of SETUP_CASES) {
    let findings = [];
    const problemsOf = [];
    try {
      findings = await kase.run({ ...setup, cvc5 });
    } catch (e) {
      problemsOf.push(`the case could not run: ${e instanceof Error ? e.message : String(e)}`);
    }
    const got = [...new Set(findings.map((f) => f.check))].sort();
    if (got.join(',') !== kase.expect.join(',')) problemsOf.push(`tripped [${got.join(', ') || 'nothing'}], built to trip [${kase.expect.join(', ') || 'nothing'}]`);
    results.push({
      name: kase.name,
      expect: kase.expect,
      got,
      pass: problemsOf.length === 0,
      detail: problemsOf.join('; ') || (findings.length ? findings.map((f) => `${f.check}: ${f.detail}`).join(' | ') : 'no finding'),
      findings,
    });
  }
  return results;
}

