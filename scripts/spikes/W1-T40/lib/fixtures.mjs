// Fixtures for the two gates' self-checks and tests (W1-T40): a pool shaped like W1's (the three S1 anchors with
// variants, the five later anchors keyed by executed runs with their variants pending), a stand-in keying battery
// that runs the generator framework's box engine, and the faults the self-checks plant.
//
// The anchors reuse the real anchor IDs and classes, because the gate checks them against the spine, and their key
// lines quote real verdict lines of runs on disk. Their texts are short stand-ins, not the shipped cases: W1-T33 and
// W1-T34 author those in content/audit/.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO } from './pool.mjs';

const fx = await import(pathToFileURL(join(REPO, 'packages', 'generators', 'src', 'core', 'fixture', 'index.ts')).href);
const formula = await import(pathToFileURL(join(REPO, 'packages', 'generators', 'src', 'core', 'fixture', 'formula.ts')).href);
const { createDraw } = await import(pathToFileURL(join(REPO, 'packages', 'rng', 'src', 'index.ts')).href);
export const { BOX_ENGINE, BOX_VERSION, boxPort } = fx;

// ------------------------------------------------------------------ formulas over a, b, amount

const lin = (coefs, k = 0) => ({ coefs: Object.entries(coefs).map(([v, c]) => ({ v, c })), k });
const R = formula.rel;
export const F = {
  aNonNeg: R('>=', lin({ a: 1 }), 0),
  bNonNeg: R('>=', lin({ b: 1 }), 0),
  amountPos: R('>', lin({ amount: 1 }), 0),
  amountLeA: R('<=', lin({ amount: 1, a: -1 }), 0),
  aLtAmount: R('<', lin({ a: 1, amount: -1 }), 0),
  aNeg: R('<', lin({ a: 1 }), 0),
  amountGtA1: R('>', lin({ amount: 1, a: -1 }), 1),
  aGeMinus1: R('>=', lin({ a: 1 }), -1),
  bGeMinus2: R('>=', lin({ b: 1 }), -2),
  amountLe3: R('<=', lin({ amount: 1 }), 3),
  amountZero: R('<=', lin({ amount: 1 }), 0),
  bNeg: R('<', lin({ b: 1 }), 0),
  abNeg: R('<', lin({ a: 1, b: 1 }), 0),
  amountGtAB: R('>', lin({ amount: 1, a: -1, b: -1 }), 0),
  amountNonNeg: R('>=', lin({ amount: 1 }), 0),
  aPos: R('>', lin({ a: 1 }), 0),
  abNonNeg: R('>=', lin({ a: 1, b: 1 }), 0),
  amountLeAB: R('<=', lin({ amount: 1, a: -1, b: -1 }), 0),
  violation: R('<', lin({ a: 1, amount: -1 }), 0),
};
const VARS = ['a', 'b', 'amount'];

// ------------------------------------------------------------------ the pool

const scenarios = (n = 4) => [...Array(n).keys()].map((i) => ({ text: `scenario ${i + 1}: a transfer the restatement is checked against` }));

/** One Z3Py-shaped case over premises (each premise is one statement line), the violation and its verdict line. */
function boxCase({ id, key, premises, extra = [], diff, receipt, evidence, keyRun, keyLines, operator, pair, artifact, generator }) {
  const lines = ["a, b, amount = Ints('a b amount')", 's = Solver()', ...premises.map((p) => `s.add(${p.text})`), ...extra, 's.add(a - amount < 0)   # the violation', 'print(s.check())'];
  const premiseLines = premises.map((_, i) => `statement:${i + 3}`);
  const out = {
    id,
    key,
    statement: `${lines.join('\n')}\n`,
    diff,
    receipt,
    evidence,
    check: { vars: VARS, span: 3, premises: premises.map((p) => p.f), premiseLines, violation: F.violation },
  };
  if (keyRun) Object.assign(out, { key_run: keyRun, key_lines: keyLines });
  if (operator) out.operator = operator;
  if (pair) out.pair = pair;
  if (artifact) out.artifact = artifact;
  if (generator) out.generator = generator;
  return out;
}

const P = {
  aNonNeg: { text: 'a >= 0', f: F.aNonNeg },
  bNonNeg: { text: 'b >= 0', f: F.bNonNeg },
  amountPos: { text: 'amount > 0', f: F.amountPos },
  amountLeA: { text: 'amount <= a', f: F.amountLeA },
  aLtAmount: { text: 'a < amount', f: F.aLtAmount },
  aNeg: { text: 'a < 0', f: F.aNeg },
  amountGtA1: { text: 'amount > a + 1', f: F.amountGtA1 },
  aGeMinus1: { text: 'a >= -1', f: F.aGeMinus1 },
  bGeMinus2: { text: 'b >= -2', f: F.bGeMinus2 },
  amountLe3: { text: 'amount <= 3', f: F.amountLe3 },
  amountZero: { text: 'amount <= 0', f: F.amountZero },
  bNeg: { text: 'b < 0', f: F.bNeg },
  abNeg: { text: 'a + b < 0', f: F.abNeg },
  amountGtAB: { text: 'amount > a + b', f: F.amountGtAB },
  amountNonNeg: { text: 'amount >= 0', f: F.amountNonNeg },
  aPos: { text: 'a > 0', f: F.aPos },
  abNonNeg: { text: 'a + b >= 0', f: F.abNonNeg },
  amountLeAB: { text: 'amount <= a + b', f: F.amountLeAB },
};
const guarded = [P.aNonNeg, P.bNonNeg, P.amountPos, P.amountLeA];

function aud11({ variantPairs = 6 } = {}) {
  // Six structurally distinct flawed forms (AUDIT-DESK 4): each adds another contradictory hypothesis, so each has
  // its own unsat core among the premises (the hypothesis and the guarded premises it conflicts with), and none is
  // the pair member's `a < amount`. Each matched sound form adds a different hypothesis the others imply.
  const contradictions = [
    [P.aNeg, [P.aNonNeg]],
    [P.amountGtA1, [P.amountLeA]],
    [P.amountZero, [P.amountPos]],
    [P.bNeg, [P.bNonNeg]],
    [P.abNeg, [P.aNonNeg, P.bNonNeg]],
    [P.amountGtAB, [P.bNonNeg, P.amountLeA]],
  ];
  const implied = [P.aGeMinus1, P.bGeMinus2, P.amountNonNeg, P.aPos, P.abNonNeg, P.amountLeAB];
  const receipts = ['[guarded_violation] unsat', '[violation, receiver guarded] unsat', '[debit_violation] unsat'];
  const variants = [];
  for (let v = 0; v < variantPairs; v++) {
    const [c, partners] = contradictions[v];
    const r = implied[v];
    const artifact = `guarded-transfer-${v + 1}`;
    const premises = v % 2 === 0 ? [...guarded, c] : [c, ...guarded];
    const lineOf = (p) => `statement:${premises.indexOf(p) + 3}`;
    variants.push(
      boxCase({
        id: `v${v + 1}-flawed`,
        key: { class: 'G2', also: ['G1'] },
        premises,
        diff: `+s.add(${c.text})`,
        receipt: receipts[v % receipts.length],
        evidence: { type: 'declaration', load_bearing: [...partners, c].map(lineOf).sort() },
        operator: 'add-contradictory-hypothesis',
        pair: `v${v + 1}`,
        artifact,
        generator: { template: 't1', band: 1, seed: 0x1000 + v },
      }),
      boxCase({
        id: `v${v + 1}-sound`,
        key: 'none',
        premises: v % 2 === 0 ? [...guarded, r] : [r, ...guarded],
        diff: `+s.add(${r.text})`,
        receipt: receipts[v % receipts.length],
        evidence: { type: 'restatement', scenarios: scenarios() },
        operator: 'add-contradictory-hypothesis',
        pair: `v${v + 1}`,
        artifact,
        generator: { template: 't4', band: 2, seed: 0x2000 + v },
      }),
    );
  }
  return {
    id: 'AUD-1.1',
    stage: 'S1',
    class: 'G2',
    medium: 'z3py',
    artifact: 'guarded-transfer',
    claim: 'unsat, therefore safe.',
    scheduled_after: ['LAB-1.3'],
    kcs: ['KC-1.non-vacuity-check', 'KC-1.implication-vacuity'],
    based_on: {
      incident: 'PutnamBench issue #361: a readability refactor lost parentheses and the hypotheses became inconsistent',
      date: '2026-10-12',
      date_marks: 'the issue was opened',
      source: 'https://github.com/trishullab/PutnamBench/issues/361',
    },
    cases: [
      boxCase({
        id: 'sound',
        key: 'none',
        premises: guarded,
        diff: '+s.add(amount <= a)',
        receipt: '[cl11_violation] unsat',
        evidence: { type: 'restatement', scenarios: scenarios() },
        keyRun: 'RUN-z3-vacuous-unsat',
        keyLines: ['[cl11_premises] sat'],
      }),
      boxCase({
        id: 'flawed',
        key: { class: 'G2', also: ['G1'] },
        premises: [...guarded, P.aLtAmount],
        diff: '+s.add(a < amount)',
        receipt: '[max0_guarded_violation] unsat',
        evidence: { type: 'declaration', load_bearing: ['statement:6', 'statement:7'] },
        keyRun: 'RUN-z3-vacuous-unsat',
        keyLines: ['[max0_guarded_premises] unsat'],
      }),
    ],
    variants,
  };
}

/** A case whose class a recorded verdict carries: the stand-in battery reads it back (W1-T25 writes the real parsers). */
function recordedCase({ id, key, recorded, statement, diff, receipt, evidence, keyRun, keyLines, operator, pair, artifact, rekey }) {
  const out = { id, key, statement, diff, receipt, evidence, check: { recorded } };
  if (keyRun) Object.assign(out, { key_run: keyRun, key_lines: keyLines });
  if (operator) out.operator = operator;
  if (pair) out.pair = pair;
  if (artifact) out.artifact = artifact;
  if (rekey) out.rekey = { pending: rekey };
  return out;
}

const bvStatement = (signed, claimLine) =>
  `A, B, X = BitVecs('A B X', 64)\ns = Solver()\ns.add(${signed ? 'X > 0' : 'UGT(X, 0)'})\ns.add(${signed ? 'X <= A' : 'ULE(X, A)'})\ns.add(${claimLine})\nprint(s.check())\n`;

/**
 * AUD-1.2's six variant pairs: each a different arithmetic slip under the "ℤ → ℕ or BitVec 64" operator, so each
 * flawed form differs structurally from the others and from the pair member (AUDIT-DESK 4). A matched sound form
 * makes the same change under the guard its claim states (AUDIT-DESK 4.1), with a diff of the same size.
 */
const BV_SLIPS = [
  {
    artifact: 'recipient-wrap-unsigned',
    decl: "A, B, X = BitVecs('A B X', 64)",
    ints: "A, B, X = Ints('A B X')",
    flawed: ['s.add(UGT(X, 0), ULE(X, A))', "s.add(ULT(B + X, B))   # the recipient's balance wraps"],
    sound: ['s.add(UGT(X, 0), ULE(X, A), ULE(B, 0xFFFFFFFFFFFFFFFF - X))   # the guard the claim states', 's.add(ULT(B + X, B))'],
    receipts: ['[unsigned recipient wrap] sat', '[unsigned recipient wrap, guarded] unsat'],
    load: 'statement:4',
    reference: { A: 1, B: '0xFFFFFFFFFFFFFFFF', X: 1 },
  },
  {
    artifact: 'sender-underflow',
    decl: "A, X = BitVecs('A X', 64)",
    ints: "A, X = Ints('A X')",
    flawed: ['s.add(UGT(X, 0))', "s.add(UGT(A - X, A))   # the sender's balance wraps below zero"],
    sound: ['s.add(UGT(X, 0), ULE(X, A))   # no debit beyond the balance, as the claim states', 's.add(UGT(A - X, A))'],
    receipts: ['[sender underflow] sat', '[sender underflow, guarded] unsat'],
    load: 'statement:4',
    reference: { A: 0, X: 1 },
  },
  {
    artifact: 'fee-overflow',
    decl: "X, FEE = BitVecs('X FEE', 64)",
    ints: "X, FEE = Ints('X FEE')",
    flawed: ['s.add(X > 0, FEE == 30)', 's.add(X * FEE / 10000 < 0)   # the fee turns negative once X * FEE overflows'],
    sound: ['s.add(X > 0, FEE == 30, X <= 307445734561825860)   # the range the claim states', 's.add(X * FEE / 10000 < 0)'],
    receipts: ['[fee overflow] sat', '[fee overflow, in range] unsat'],
    load: 'statement:4',
    reference: { X: '307445734561825861', FEE: 30 },
  },
  {
    artifact: 'output-sum-wrap',
    decl: "IN, O1, O2 = BitVecs('IN O1 O2', 64)",
    ints: "IN, O1, O2 = Ints('IN O1 O2')",
    flawed: ['s.add(UGT(O1, IN))   # one output alone exceeds the input', 's.add(ULE(O1 + O2, IN))   # the sum check passes after wrapping'],
    sound: ['s.add(ULE(O1, IN), ULE(O2, IN - O1))   # each output checked before the sum', 's.add(UGT(O1 + O2, IN))'],
    receipts: ['[output sum wrap] sat', '[output sum, checked per output] unsat'],
    load: 'statement:4',
    reference: { IN: 50, O1: '0x8000000000000000', O2: '0x8000000000000032' },
  },
  {
    artifact: 'negated-minimum',
    decl: "X = BitVec('X', 64)",
    ints: "X = Int('X')",
    flawed: ['s.add(X < 0)   # a debit, stored negative', 's.add(-X < 0)   # its refund, negated, is still negative'],
    sound: ['s.add(X < 0, X != -9223372036854775808)   # the minimum excluded, as the claim states', 's.add(-X < 0)'],
    receipts: ['[negated minimum] sat', '[negated minimum, excluded] unsat'],
    load: 'statement:4',
    reference: { X: '-9223372036854775808' },
  },
  {
    artifact: 'signedness-mismatch',
    decl: "A, X = BitVecs('A X', 64)",
    ints: "A, X = Ints('A X')",
    flawed: ['s.add(X <= A)   # the check compares signed', 's.add(UGT(X, A))   # the ledger subtracts unsigned'],
    sound: ['s.add(ULE(X, A))   # the check compares unsigned, as the ledger does', 's.add(UGT(X, A))'],
    receipts: ['[signedness mismatch] sat', '[signedness matched] unsat'],
    load: 'statement:3',
    reference: { A: 5, X: -1 },
  },
];

function aud12({ variantPairs = 6 } = {}) {
  const variants = [];
  for (let v = 0; v < variantPairs; v++) {
    const slip = BV_SLIPS[v];
    const artifact = slip.artifact;
    const text = (lines) => `${[slip.decl, 's = Solver()', ...lines, 'print(s.check())'].join('\n')}\n`;
    const diff = `-${slip.ints}\n+${slip.decl}`;
    variants.push(
      recordedCase({
        id: `v${v + 1}-flawed`,
        key: { class: 'G4', also: ['G8'] },
        recorded: { class: 'G4', also: ['G8'], evidence: { type: 'witness', load_bearing: [slip.load] } },
        statement: text(slip.flawed),
        diff,
        receipt: slip.receipts[0],
        evidence: { type: 'witness', load_bearing: [slip.load], reference: slip.reference },
        operator: 'change-arithmetic',
        pair: `v${v + 1}`,
        artifact,
      }),
      recordedCase({
        id: `v${v + 1}-sound`,
        key: 'none',
        recorded: { class: 'none' },
        statement: text(slip.sound),
        diff,
        receipt: slip.receipts[1],
        evidence: { type: 'restatement', scenarios: scenarios() },
        operator: 'change-arithmetic',
        pair: `v${v + 1}`,
        artifact,
      }),
    );
  }
  return {
    id: 'AUD-1.2',
    stage: 'S1',
    class: 'G4',
    medium: 'z3py',
    artifact: 'bv64-transfer',
    claim: 'No balance can go negative; the transfer is safe.',
    scheduled_after: ['LAB-1', 'S1.L5'],
    kcs: ['KC-1.encoding-is-the-claim'],
    based_on: { incident: 'Bitcoin CVE-2010-5139: transaction outputs overflowed when summed', date: '2010-08-15', date_marks: 'the overflowing transaction was mined', source: 'https://en.bitcoin.it/wiki/CVE-2010-5139' },
    cases: [
      recordedCase({
        id: 'sound',
        key: 'none',
        recorded: { class: 'none' },
        statement: bvStatement(true, 'A - X < 0   # the sender, signed'),
        diff: '-Ints\n+BitVecs',
        receipt: '[guarded SOURCE overdraft] unsat',
        evidence: { type: 'restatement', scenarios: scenarios() },
        keyRun: 'RUN-z3-bv64',
        keyLines: ['[1.5 BitVec64 signed: guarded SOURCE overdraft] unsat'],
      }),
      recordedCase({
        id: 'flawed',
        key: { class: 'G4', also: ['G8'] },
        recorded: { class: 'G4', also: ['G8'], evidence: { type: 'witness', load_bearing: ['statement:5'] } },
        statement: bvStatement(true, 'B + X < B   # the recipient wraps'),
        diff: '-Ints\n+BitVecs',
        receipt: '[guarded DESTINATION wrap] sat',
        evidence: { type: 'witness', load_bearing: ['statement:5'], reference: { A: 9223372036854775806, B: 9223372036850581504, X: 4194304 } },
        keyRun: 'RUN-z3-bv64',
        keyLines: ['[1.5 BitVec64 signed: guarded DESTINATION wrap] sat'],
      }),
    ],
    variants,
  };
}

const budgetStatement = (verdict) => `s = Solver()\ns.set('rlimit', 5000000)\ns.add(premises)\ns.add(violation)\nr = s.check()   # ${verdict}\nprint(r, s.reason_unknown())\n`;

/**
 * AUD-1.3's six variant pairs: each a different way an inconclusive or bounded result is reported as a verdict, so
 * each flawed form differs structurally from the others and from the pair member (AUDIT-DESK 4). The matched sound
 * form is the same check honestly stamped (AUDIT-DESK 4.1 and 4.2), with a diff of the same size.
 */
const G5_SLIPS = [
  {
    artifact: 'timeout-query',
    operator: 'report-inconclusive-as-verdict',
    statement: { flawed: ['s = Solver()', "s.set('timeout', 2000)", 's.add(premises, violation)', 'r = s.check()', 'print(r, s.reason_unknown())'] },
    diff: { flawed: "-s.set('timeout', 60000)\n+s.set('timeout', 2000)" },
    receipt: { flawed: 'unknown timeout\nreported: verified, no violation', sound: 'unknown timeout\nstamped [?] inconclusive: the query timed out' },
    load: ['receipt:1'],
  },
  {
    artifact: 'nonlinear-fee',
    operator: 'report-inconclusive-as-verdict',
    statement: { flawed: ["x, y, z = Ints('x y z')", 's = Solver()', 's.add(x > 1, y > 1, z > 1)', 's.add(x * y * z == 1000003)', 'print(s.check(), s.reason_unknown())'] },
    diff: { flawed: '-s.add(x + y + z == 1000003)\n+s.add(x * y * z == 1000003)' },
    receipt: { flawed: 'unknown (incomplete (theory arithmetic))\nreported: no counterexample, so the fee rule holds', sound: 'unknown (incomplete (theory arithmetic))\nstamped [?] inconclusive: nonlinear arithmetic' },
    load: ['receipt:1'],
  },
  {
    artifact: 'quantified-balance',
    operator: 'report-inconclusive-as-verdict',
    statement: { flawed: ["t = Int('t')", "bal = Function('bal', IntSort(), IntSort())", 's = Solver()', 's.add(ForAll([t], Implies(t >= 0, bal(t + 1) >= bal(t))))', 's.add(bal(10) < bal(0))', 'print(s.check())'] },
    diff: { flawed: '-s.add(bal(1) >= bal(0))\n+s.add(ForAll([t], Implies(t >= 0, bal(t + 1) >= bal(t))))' },
    receipt: { flawed: 'unknown (incomplete quantifiers)\nreported: the balance never decreases', sound: 'unknown (incomplete quantifiers)\nstamped [?] inconclusive: quantifiers' },
    load: ['receipt:1'],
  },
  {
    artifact: 'unrolled-ledger',
    operator: 'stamp-bounded-inductive-as-proof',
    statement: { flawed: ["bal = [Int(f'bal_{i}') for i in range(11)]", 's = Solver()', 's.add(bal[0] >= 0)', 's.add([step(bal[i], bal[i + 1]) for i in range(10)])', 's.add(Or([b < 0 for b in bal]))', 'print(s.check())'] },
    diff: { flawed: "-stamp = 'M: bounded, 10 steps'\n+stamp = 'P: proved'", sound: "-stamp = 'T: one run'\n+stamp = 'M: bounded, 10 steps'" },
    receipt: { flawed: 'unsat (unrolled 10 steps)\nstamped [P] proved for every run', sound: 'unsat (unrolled 10 steps)\nstamped [M] bounded at 10 steps' },
    load: ['receipt:1', 'receipt:2'],
  },
  {
    artifact: 'nonsat-branch',
    operator: 'report-inconclusive-as-verdict',
    statement: { flawed: ['s = Solver()', 's.add(premises, violation)', 'r = s.check()', 'if r != sat:', "    print('safe: no counterexample')"], sound: ['s = Solver()', 's.add(premises, violation)', 'r = s.check()', 'if r == unsat:', "    print('safe: no counterexample')"] },
    diff: { flawed: '-if r == unsat:\n+if r != sat:', sound: '-if r != sat:\n+if r == unsat:' },
    receipt: { flawed: 'unknown\nsafe: no counterexample', sound: 'unknown\nreported: inconclusive, nothing claimed' },
    load: ['receipt:1'],
  },
  {
    artifact: 'query-batch',
    operator: 'report-inconclusive-as-verdict',
    statement: {
      flawed: ['results = [check(q) for q in queries]', 'failed = [q for q, r in zip(queries, results) if r == sat]', "print(len(results), 'queries,', len(failed), 'counterexamples')", "print('all transfers safe' if not failed else 'unsafe')"],
      sound: ['results = [check(q) for q in queries]', 'failed = [q for q, r in zip(queries, results) if r != unsat]', "print(len(results), 'queries,', len(failed), 'not proved')", "print('all transfers safe' if not failed else 'unsafe')"],
    },
    diff: { flawed: '-failed = [q for q, r in zip(queries, results) if r != unsat]\n+failed = [q for q, r in zip(queries, results) if r == sat]', sound: '-failed = [q for q, r in zip(queries, results) if r == sat]\n+failed = [q for q, r in zip(queries, results) if r != unsat]' },
    receipt: { flawed: 'sat 0, unsat 11, unknown 1\nall transfers safe', sound: 'sat 0, unsat 11, unknown 1\nunsafe: 1 query not proved' },
    load: ['receipt:1'],
  },
];

function aud13({ variantPairs = 6 } = {}) {
  const variants = [];
  for (let v = 0; v < variantPairs; v++) {
    const slip = G5_SLIPS[v];
    const lines = (form) => `${(slip.statement[form] ?? slip.statement.flawed).join('\n')}\n`;
    variants.push(
      recordedCase({
        id: `v${v + 1}-flawed`,
        key: 'G5',
        recorded: { class: 'G5', evidence: { type: 'verdict-line', load_bearing: slip.load } },
        statement: lines('flawed'),
        diff: slip.diff.flawed,
        receipt: slip.receipt.flawed,
        evidence: { type: 'verdict-line', load_bearing: slip.load },
        operator: slip.operator,
        pair: `v${v + 1}`,
        artifact: slip.artifact,
      }),
      recordedCase({
        id: `v${v + 1}-sound`,
        key: 'none',
        recorded: { class: 'none' },
        statement: lines('sound'),
        diff: slip.diff.sound ?? slip.diff.flawed,
        receipt: slip.receipt.sound,
        evidence: { type: 'restatement', scenarios: scenarios() },
        operator: slip.operator,
        pair: `v${v + 1}`,
        artifact: slip.artifact,
      }),
    );
  }
  return {
    id: 'AUD-1.3',
    stage: 'S1',
    class: 'G5',
    medium: 'z3py',
    artifact: 'budgeted-query',
    claim: 'Z3 found no counterexample, so the property holds.',
    scheduled_after: ['LAB-1', 'S1.L2'],
    kcs: ['KC-1.three-answers', 'KC-1.unknown-fails-closed'],
    based_on: { incident: 'S3 Block Public Access: an unknown from a time-out means the policy is not Trust Safe', date: '2020-11', date_marks: 'the paper appeared at ESEC/FSE 2020', source: 'https://doi.org/10.1145/3368089.3409728' },
    cases: [
      recordedCase({
        id: 'sound',
        key: 'none',
        recorded: { class: 'none' },
        statement: budgetStatement('unsat'),
        diff: "+s.set('rlimit', 5000000)",
        receipt: 'unsat\nstamped with its budget: rlimit 5000000',
        evidence: { type: 'restatement', scenarios: scenarios() },
        keyRun: 'RUN-z3-starter',
        keyLines: ['[1.3 guard added] unsat'],
      }),
      recordedCase({
        id: 'flawed',
        key: 'G5',
        recorded: { class: 'G5', evidence: { type: 'verdict-line', load_bearing: ['receipt:1'] } },
        statement: budgetStatement('unknown'),
        diff: "+s.set('rlimit', 5000000)",
        receipt: 'unknown canceled\nreported: no counterexample found',
        evidence: { type: 'verdict-line', load_bearing: ['receipt:1'] },
        keyRun: 'RUN-z3-budget-pyodide',
        keyLines: ['rlimit-case unknown canceled'],
      }),
    ],
    variants,
  };
}

/** A later anchor keyed only by executed runs, with its variants and its re-keying pending (spine section 6). */
function runKeyed({ id, stage, klass, also = [], medium, artifact, claim, scheduledAfter, kcs, basedOn, sound, flawed, variantsLand, rekey }) {
  const mk = (m, truth) =>
    recordedCase({
      id: truth,
      key: truth === 'sound' ? 'none' : { class: klass, also },
      recorded: truth === 'sound' ? { class: 'none' } : { class: klass, also, evidence: { type: m.evidence.type, load_bearing: m.evidence.load_bearing } },
      statement: m.statement,
      diff: m.diff,
      receipt: m.receipt,
      evidence: m.evidence,
      keyRun: m.keyRun,
      keyLines: m.keyLines,
      rekey,
    });
  return {
    id,
    stage,
    class: klass,
    medium,
    artifact,
    claim,
    scheduled_after: scheduledAfter,
    kcs,
    based_on: basedOn,
    cases: [mk(sound, 'sound'), mk(flawed, 'flawed')],
    variants: { pending: { lands: variantsLand } },
  };
}

const leanStatement = (proofLine) => `theorem conserves (a b amt : Int) :\n    (transfer a b amt).1 + (transfer a b amt).2 = a + b := by\n  ${proofLine}\n#print axioms conserves\n`;
const sr = scenarios();

export function laterAnchors() {
  const lean = { engine: 'lean', lands: 'W2-T01' };
  return [
    runKeyed({
      id: 'AUD-2.1', stage: 'S2', klass: 'G1', also: ['G12'], medium: 'smtlib', artifact: 'refund', claim: 'Refunds never overdraw anyone; proved.',
      scheduledAfter: ['LAB-2'], kcs: ['KC-2.theorem-statement-reading', 'KC-2.kernel-not-requirement'],
      basedOn: { incident: 'Spec-Harness: 22.7% of verifier-accepted specifications had no postcondition', date: '2026-03-31', date_marks: 'the first arXiv version was posted', source: 'https://arxiv.org/abs/2604.00280' },
      sound: { statement: '(assert (>= (select Bal c) 0))\n(assert refund)\n(assert (< (select Bal1 c) 0))\n(check-sat)\n', diff: '+(assert refund)', receipt: 'unsat', evidence: { type: 'restatement', scenarios: sr }, keyRun: 'RUN-z3-refund-a21', keyLines: ['[A2.1 stated theorem (customer >= 0), modify-update] unsat'] },
      flawed: { statement: '(assert (>= (select Bal c) 0))\n(assert refund)\n(assert (< (select Bal1 m) 0))\n(check-sat)\n', diff: '+(assert refund)', receipt: 'sat', evidence: { type: 'scenario', load_bearing: ['statement:3'], reference: { merchant: -1 } }, keyRun: 'RUN-z3-refund-a21', keyLines: ['[A2.1 the gap: merchant >= 0 after refund] sat'] },
      variantsLand: 'W2-T13',
    }),
    runKeyed({
      id: 'AUD-2.2', stage: 'S2', klass: 'G6a', also: [], medium: 'lean', artifact: 'conserves', claim: 'Proved; the build is green.',
      scheduledAfter: ['LAB-2', 'S2.L9'], kcs: ['KC-2.axioms-and-trust', 'KC-2.automation-scope'],
      basedOn: { incident: 'AlphaVerus: without critique models, its agent closed obligations with assume(false)', date: '2024-12', date_marks: 'the arXiv paper was posted', source: 'https://arxiv.org/abs/2412.06176' },
      sound: { statement: leanStatement('omega'), diff: '+  omega', receipt: "'transfer_conserves' depends on axioms: [propext, Quot.sound]", evidence: { type: 'restatement', scenarios: sr }, keyRun: 'RUN-lean-axioms', keyLines: ["'transfer_conserves' depends on axioms: [propext, Quot.sound]"] },
      flawed: { statement: leanStatement('sorry'), diff: '+  sorry', receipt: "'with_sorry' depends on axioms: [sorryAx]", evidence: { type: 'declaration', load_bearing: ['statement:3', 'receipt:1'] }, keyRun: 'RUN-lean-axioms', keyLines: ["'with_sorry' depends on axioms: [sorryAx]"] },
      variantsLand: 'W2-T13',
      rekey: lean,
    }),
    runKeyed({
      id: 'AUD-2.3', stage: 'S2', klass: 'G6c', also: ['G6d'], medium: 'lean-receipt', artifact: 'conserves', claim: 'Proved; the build is green and uses no axioms.',
      scheduledAfter: ['LAB-2', 'S2.L9'], kcs: ['KC-2.axioms-and-trust'],
      basedOn: { incident: 'an older Lean REPL did not use the verification kernel, so 12 incorrect miniF2F proofs passed', date: '2025-07', date_marks: 'the arXiv paper was posted', source: 'https://arxiv.org/abs/2507.14722' },
      sound: { statement: 'lake build Probe\nleanchecker Probe\n#print axioms oops\n(no option set)\n', diff: '+lake build Probe', receipt: 'lake exit=0\nleanchecker: no problem', evidence: { type: 'restatement', scenarios: sr }, keyRun: 'RUN-lean-skipkernel', keyLines: ['lake exit=0'] },
      flawed: { statement: 'set_option debug.skipKernelTC true\nlake build Probe\nleanchecker Probe\n#print axioms oops\n', diff: '+set_option debug.skipKernelTC true', receipt: 'lake exit=0\nleanchecker found a problem in Probe.Bypass', evidence: { type: 'declaration', load_bearing: ['statement:1', 'receipt:2'] }, keyRun: 'RUN-lean-skipkernel', keyLines: ['leanchecker found a problem in Probe.Bypass'] },
      variantsLand: 'W2-T13',
      rekey: lean,
    }),
    runKeyed({
      id: 'AUD-2.4', stage: 'S2', klass: 'G8a', also: ['G8c'], medium: 'lean', artifact: 'comparator-challenge', claim: 'Comparator-ready; proved.',
      scheduledAfter: ['LAB-2', 'S2.L10'], kcs: ['KC-2.statement-pinning', 'KC-2.kernel-not-requirement'],
      basedOn: { incident: 'FormalQualBench: an out-of-band statement check caught what the build accepted', date: '2026-03-19', date_marks: 'the last benchmark runs were evaluated', source: 'https://math.inc/formalqualbench' },
      sound: { statement: leanStatement('simp [transfer]; split <;> omega'), diff: '-  omega\n+  simp [transfer]; split <;> omega', receipt: 'Your solution is okay!', evidence: { type: 'restatement', scenarios: sr }, keyRun: 'RUN-lean-comparator', keyLines: ['Your solution is okay!'] },
      flawed: { statement: 'theorem conserves (a b amt : Int) :\n    (transfer a b amt).1 = (transfer a b amt).1 := by\n  rfl\n#print axioms conserves\n', diff: '-    (transfer a b amt).1 + (transfer a b amt).2 = a + b\n+    (transfer a b amt).1 = (transfer a b amt).1', receipt: "error: Challenge and solution theorem statement do not match: 'transfer_conserves'", evidence: { type: 'identifiers', load_bearing: ['statement:2', 'receipt:1'] }, keyRun: 'RUN-lean-comparator', keyLines: ['theorem statement do not match'] },
      variantsLand: 'W2-T13',
      rekey: lean,
    }),
    runKeyed({
      id: 'AUD-5.3', stage: 'S5', klass: 'G5', also: [], medium: 'tla', artifact: 'doublespend', claim: 'TLC found no invariant violation.',
      scheduledAfter: ['LAB-5.1'], kcs: ['KC-5.tlc-flags-matter', 'KC-5.bounded-scope'],
      basedOn: { incident: "this course's own v1 mock-ups printed TLC numbers that no run had produced", date: '2026-10-20', date_marks: 'the mock-ups were written; the executed run replaced them on 2026-10-21', source: ['docs/history/v1/', 'research/evidence/A5r3/tla/run.log'] },
      sound: { statement: 'java -jar tla2tools.jar -deadlock -workers 1 DoubleSpend\nINVARIANT NoOverspend\nCONSTANTS Init = 100, Amount = 80\n2 workers\n', diff: '+-deadlock', receipt: 'Error: Invariant NoOverspend is violated.', evidence: { type: 'restatement', scenarios: sr }, keyRun: 'RUN-tlc-doublespend', keyLines: [{ config: '1.8.0-deadlock', line: 'Error: Invariant NoOverspend is violated.' }] },
      flawed: { statement: 'java -jar tla2tools.jar -workers 1 DoubleSpend\nINVARIANT NoOverspend\nCONSTANTS Init = 100, Amount = 80\n2 workers\n', diff: '--deadlock', receipt: 'Error: Deadlock reached.\nreported: no invariant violation', evidence: { type: 'verdict-line', load_bearing: ['statement:1', 'receipt:1'] }, keyRun: 'RUN-tlc-doublespend', keyLines: [{ config: '1.8.0-default', line: 'Error: Deadlock reached.' }] },
      variantsLand: 'W3-T13',
      rekey: { engine: 'tlc', lands: 'W3-T05' },
    }),
  ];
}

/**
 * The W1-shaped fixture pool: AUD-1.1-AUD-1.3 with `variantPairs` variant pairs each (at most six: each anchor has
 * six structurally distinct ones), and the five run-keyed anchors.
 */
export function w1Pool({ variantPairs = 6 } = {}) {
  if (!Number.isInteger(variantPairs) || variantPairs < 0 || variantPairs > 6) throw new Error('w1Pool: variantPairs is 0 to 6, the structurally distinct variant pairs each S1 anchor has');
  return [aud11({ variantPairs }), aud12({ variantPairs }), aud13({ variantPairs }), ...laterAnchors()];
}

// ------------------------------------------------------------------ the stand-in battery

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/**
 * A stand-in for GEN-spot-the-gap's battery (W1-T25), with the contract GATE-audit calls (../README.md section 4):
 * `key(case, port)` returns { primary, also, evidence: { type, load_bearing } } or a discard. A case over box
 * premises is keyed by running the box engine: the premises alone (step 4, non-vacuity; the load-bearing lines are
 * the smallest unsat subset of the premises, recomputed), then the violation query. Any other case carries the
 * class its recorded verdict implies (`check.recorded`), which stands in for the parsers of steps 1-3 and 5.
 */
export function fixtureBattery({ engine = BOX_ENGINE } = {}) {
  const ask = async (port, f, vars, span) => {
    const reply = await port.run({ engine, version: BOX_VERSION, input: { op: 'sat', formula: f, vars, span }, budget: { wallMs: 1000, maxStates: 20000 } });
    return reply.verdict.kind;
  };
  return {
    engines: [engine],
    async key(c, port) {
      const chk = c.raw?.check;
      if (!isObj(chk)) return { discard: 'the case carries no check the battery reads', cause: 'unknown' };
      if (isObj(chk.recorded)) {
        const r = chk.recorded;
        return r.class === 'none' ? { primary: 'none', also: [], evidence: { type: 'restatement', load_bearing: [] } } : { primary: r.class, also: r.also ?? [], evidence: r.evidence };
      }
      const { vars, span, premises, premiseLines, violation } = chk;
      const premisesVerdict = await ask(port, formula.and(...premises), vars, span);
      if (premisesVerdict === 'unknown') return { discard: 'the premise query returned unknown', cause: 'unknown' };
      if (premisesVerdict === 'unsat') {
        // The smallest unsat subset of the premises: its lines are the load-bearing ones (AUDIT-DESK 6.3).
        const n = premises.length;
        let best = null;
        for (let size = 1; size <= n && best === null; size++) {
          for (let mask = 1; mask < 1 << n; mask++) {
            if (popcount(mask) !== size) continue;
            const subset = premises.filter((_, i) => (mask >> i) & 1);
            if ((await ask(port, formula.and(...subset), vars, span)) === 'unsat') {
              best = premiseLines.filter((_, i) => (mask >> i) & 1);
              break;
            }
          }
        }
        return { primary: 'G2', also: ['G1'], evidence: { type: 'declaration', load_bearing: best ?? premiseLines } };
      }
      const v = await ask(port, formula.and(...premises, violation), vars, span);
      if (v === 'unknown') return { discard: 'the violation query returned unknown', cause: 'unknown' };
      if (v === 'unsat') return { primary: 'none', also: [], evidence: { type: 'restatement', load_bearing: [] } };
      return { primary: 'G12', also: [], evidence: { type: 'scenario', load_bearing: [] } };
    },
  };
}

const popcount = (m) => {
  let c = 0;
  for (let x = m; x; x &= x - 1) c++;
  return c;
};

/** A port that answers unknown to every request: a battery behind it must discard (GATE-audit's `unknown` check). */
export const unknownBoxPort = {
  async run(req) {
    return { verdict: { kind: 'unknown', reason: 'planted: the engine gave up' }, stats: { ms: 0 }, provenance: { engine: req.engine, version: req.version, build: 'planted', budget: req.budget } };
  },
};

// ------------------------------------------------------------------ the Desk's scorer stand-in (W1-T32)

/**
 * A stand-in for the Desk's own scorer (W1-T32's `auditFigures`, ../README.md section 5), computed from the decision
 * objects alone: the reference scorer's figures, by id, each with its kind and n, and a null value where the Desk
 * would not show the figure. `kinds` overrides an id's kind (the self-check files part-c-pass with the decision
 * figures, as AUDIT-DESK 7.4 lists it); `extra` adds figures [{ id, kind, of(decisions) }]; `drop(id)` leaves a
 * figure out (the self-check plants a scorer that drops `ba`, or every per-class figure).
 */
export function fixtureAuditFigures(classes, { kinds = {}, extra = [], drop = () => false } = {}) {
  const K = classes.length;
  const ci = new Map(classes.map((c, i) => [c, i]));
  const kindOf = (id, dflt) => kinds[id] ?? dflt;
  const all = (decisions) => {
    let F = 0;
    let Sd = 0;
    let found = 0;
    let accepted = 0;
    let acceptedAll = 0;
    let correct = 0;
    const nK = new Int32Array(K);
    const correctK = new Int32Array(K);
    const namedK = new Int32Array(K);
    const correctNamedK = new Int32Array(K);
    const hits = new Map(); // Part C: sitting -> hits
    for (const d of decisions) {
      const gap = d.pick === 'gap';
      const ok = gap && d.named !== null && d.acceptable.includes(d.named) && d.evidenceValid;
      if (d.truth === 'flawed') {
        F++;
        if (gap) found++;
        nK[ci.get(d.primary)]++;
        if (ok) {
          correct++;
          correctK[ci.get(d.primary)]++;
        }
      } else {
        Sd++;
        if (!gap) accepted++;
      }
      if (!gap) acceptedAll++;
      if (gap && d.named !== null) {
        namedK[ci.get(d.named)]++;
        if (ok) correctNamedK[ci.get(d.named)]++;
      }
      if (d.surface === 'part-c') hits.set(d.sitting, (hits.get(d.sitting) ?? 0) + ((d.truth === 'sound' ? !gap : ok) ? 1 : 0));
    }
    const tpr = F > 0 ? found / F : null;
    const tnr = Sd > 0 ? accepted / Sd : null;
    const tprc = F > 0 ? correct / F : null;
    const out = [
      { id: 'tpr', kind: kindOf('tpr', 'decision'), value: tpr, n: F },
      { id: 'tnr', kind: kindOf('tnr', 'decision'), value: tnr, n: Sd },
      { id: 'ba', kind: kindOf('ba', 'decision'), value: tpr !== null && tnr !== null ? (tpr + tnr) / 2 : null, n: F + Sd },
      { id: 'precision:none', kind: kindOf('precision:none', 'decision'), value: acceptedAll >= 10 ? accepted / acceptedAll : null, n: acceptedAll },
      { id: 'part-c-pass', kind: kindOf('part-c-pass', 'class'), value: hits.size > 0 ? [...hits.values()].filter((h) => h >= 3).length / hits.size : null, n: hits.size },
      { id: 'tpr-correct', kind: kindOf('tpr-correct', 'class'), value: tprc, n: F },
      { id: 'ba-correct', kind: kindOf('ba-correct', 'class'), value: tprc !== null && tnr !== null ? (tprc + tnr) / 2 : null, n: F + Sd },
    ];
    let macro = 0;
    let macroN = 0;
    classes.forEach((c, k) => {
      const recall = nK[k] >= 10 ? correctK[k] / nK[k] : null;
      if (recall !== null) {
        macro += recall;
        macroN++;
      }
      out.push({ id: `recall:${c}`, kind: kindOf(`recall:${c}`, 'class'), value: recall, n: nK[k] });
      out.push({ id: `precision:${c}`, kind: kindOf(`precision:${c}`, 'class'), value: namedK[k] >= 10 ? correctNamedK[k] / namedK[k] : null, n: namedK[k] });
    });
    out.push({ id: 'recall-macro', kind: kindOf('recall-macro', 'class'), value: macroN > 0 ? macro / macroN : null, n: macroN });
    for (const e of extra) out.push({ id: e.id, kind: e.kind, value: e.of(decisions), n: decisions.length });
    return out;
  };
  return (decisions) => all(decisions).filter((f) => !drop(f.id));
}

/**
 * v1's "balanced accuracy" (AUDIT-DESK 1.4), from the decision objects: the mean of the flawed cases found and the
 * share of flags that were flawed. always-reject scores well above 0.5 on it, which is the defect the Desk's BA fixes.
 */
export const v1BalancedAccuracy = (decisions) => {
  let flawed = 0;
  let found = 0;
  let flagged = 0;
  let flaggedFlawed = 0;
  for (const d of decisions) {
    const gap = d.pick === 'gap';
    if (d.truth === 'flawed') {
      flawed++;
      if (gap) found++;
    }
    if (gap) {
      flagged++;
      if (d.truth === 'flawed') flaggedFlawed++;
    }
  }
  return ((flawed > 0 ? found / flawed : 0) + (flagged > 0 ? flaggedFlawed / flagged : 0)) / 2;
};

// ------------------------------------------------------------------ the Clearinghouse stand-ins (W3-T14)

/**
 * A stand-in Clearinghouse family (GATE-audit's contract, ../README.md section 6): a bar and two baselines whose
 * scores are pure functions of the seed. `naive` and `reference` set each baseline's mean score.
 */
export function fixtureFamily({ id = 'CH-fixture-overdraft', bar = 0.7, naive = 0.4, reference = 0.9, seeds = [1, 2, 3, 4] } = {}) {
  const jitter = (seed) => ((seed * 2654435761) >>> 0) % 7 / 100 - 0.03;
  return { id, bar, seeds, score: (policy, seed) => Math.max(0, Math.min(1, (policy === 'naive' ? naive : reference) + jitter(seed))) };
}

/**
 * Stand-in Clearinghouse incident blocks for GATE-audit-blind: each block holds `serves` incidents drawn from the
 * given blind cases, sound with probability p per block (0.30-0.60). `leak` plants a position cue: the block's last
 * incident is always sound.
 */
export async function fixtureIncidentBlocks(cases, { seed, blocks, serves = 10, leak = false }) {
  const d = createDraw(seed);
  const sound = cases.filter((c) => c.truth === 'sound');
  const flawed = cases.filter((c) => c.truth === 'flawed');
  const out = [];
  for (let b = 0; b < blocks; b++) {
    const permille = d.int(300, 600);
    const block = [];
    for (let s = 0; s < serves; s++) {
      const isSound = (leak && s === serves - 1) || d.below(1000) < permille;
      block.push(d.pick(isSound ? sound : flawed));
    }
    out.push(block);
  }
  return out;
}

/**
 * A stand-in for the Clearinghouse world's own incidents (W3-T14's `auditIncidentBlocks(seed, blocks)`, ../README.md
 * section 6): `blocks` blocks of `serves` incidents in the pool's case form, each sound with probability p per block
 * (0.30-0.60) and otherwise keyed `klass`, all at `stage`, with no cue in position or text. The default, G7 at S1, is a
 * class the W1 pool does not hold at a stage it does: the incidents' base rates differ from the pool's, so a gate that
 * let them into a path stream's base rates would move its verdicts. `evidence` is the flawed incidents' evidence type:
 * a witness by default, which never validates blind; a line-anchored type (a declaration, say) lets a blind flag that
 * names the incidents' class be correct when its line choice hits.
 */
export function fixtureWorldIncidents(seed, blocks, { klass = 'G7', stage = 'S1', serves = 10, evidence = 'witness' } = {}) {
  const d = createDraw(seed);
  const statement = 'the provider confirms each charge once\nthe ledger posts every confirmed charge\nthe agent retries a charge that timed out\ninvariant NoDoublePost: no charge is posted twice\n';
  const out = [];
  for (let b = 0; b < blocks; b++) {
    const permille = d.int(300, 600);
    const block = [];
    for (let s = 0; s < serves; s++) {
      const sound = d.below(1000) < permille;
      const id = `w${seed}-${b}-${s}`;
      block.push({
        id,
        family: 'CH-fixture-retry',
        stage,
        pair: id,
        key: sound ? 'none' : { class: klass, also: [] },
        evidence: sound ? { type: 'restatement', scenarios: scenarios() } : evidence === 'witness' ? { type: 'witness', load_bearing: ['statement:3'], reference: { trace: ['charge', 'timeout', 'retry', 'post', 'post'] } } : { type: evidence, load_bearing: ['statement:3'] },
        statement,
        diff: sound ? '+ASSUME ProviderIdempotent' : '-ASSUME ProviderIdempotent',
        receipt: sound ? 'no violation of NoDoublePost' : 'invariant NoDoublePost is violated',
      });
    }
    out.push(block);
  }
  return out;
}
