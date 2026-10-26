// The verdict-to-stamp table (spine section 8.8) row by row, the grammar every derived stamp obeys, and the
// invariants it serves: derived, never typed (I2); agents never stamped (I8); bounds printed (I10).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ALL_ROWS,
  SPINE_ROWS,
  STAMPS,
  STAMP_CODES,
  StampGrammarError,
  deriveStamp,
  grammarProblems,
  stampText,
  type Derivation,
  type RawOutput,
  type StampContext,
} from '../src/index.ts'

const ctx: StampContext = { lane: 'reported', source: 'receipts/LAB-1.3/r.json · runs[0]' }
const z3 = { name: 'Z3', version: '5.3.1' }
const tlc = { name: 'TLC', version: '1.8.0' }
const lean = { name: 'Lean', version: '4.35.0' }

const text = (d: Derivation): string => {
  if (d.kind === 'stamp') return stampText(d.stamp)
  if (d.kind === 'modulo') return `${d.text} | ${d.assumed.map(stampText).join(' | ')}`
  return `none:${d.reason}`
}
const derive = (raw: RawOutput): string => text(deriveStamp(raw, ctx))

test('every raw-output kind belongs to exactly one row, and every row names kinds', () => {
  const seen = new Map<string, string>()
  for (const row of ALL_ROWS) {
    assert.ok(row.kinds.length > 0, `${row.key} names no kind`)
    for (const k of row.kinds) {
      if (row.key === 'smt-sat-no-replay' || row.key === 'shadow-mismatch') continue // these share a kind with another row
      assert.ok(!seen.has(k) || seen.get(k) === row.key, `${k} is in ${seen.get(k)} and ${row.key}`)
      seen.set(k, row.key)
    }
  }
  assert.equal(SPINE_ROWS.length, 26)
})

test('the nine codes and words are spine section 8.7, each with its own class', () => {
  assert.deepEqual([...STAMP_CODES], ['[P]', '[M]', '[T]', '[E]', '[C]', '[A]', '[?]', '[N]', '[R]'])
  assert.equal(new Set(STAMPS.map((s) => s.className)).size, 9)
  assert.deepEqual(STAMPS.filter((s) => s.boundFirst).map((s) => s.code), ['[M]', '[T]'])
})

test('solver unsat is [P] of the encoding, uncertified, with the open defeater', () => {
  const d = deriveStamp({ kind: 'smt-unsat', solver: z3, rlimit: 5000000 }, ctx)
  assert.equal(text(d), 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6')
  assert.equal(d.kind === 'stamp' && d.stamp.defeaters[0]?.text, 'encoding unverified')
  assert.equal(d.kind === 'stamp' && d.stamp.lane, 'reported')
})

test('a cvc5 cross-check on the same input says "agree" and keeps "uncertified"; a disagreement stamps neither side', () => {
  const cvc5 = { name: 'cvc5', version: '1.4.2' }
  assert.equal(derive({ kind: 'smt-unsat', solver: z3, crossCheck: { solver: cvc5, verdict: 'unsat', sameInput: true } }), 'PROVED [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified')
  assert.equal(derive({ kind: 'smt-unsat', solver: z3, crossCheck: { solver: cvc5, verdict: 'unsat', sameInput: false } }), 'PROVED [P] · Z3 5.3.1 unsat · uncertified')
  assert.equal(derive({ kind: 'smt-unsat', solver: z3, crossCheck: { solver: cvc5, verdict: 'unknown', sameInput: true } }), 'PROVED [P] · Z3 5.3.1 unsat · uncertified', 'an inconclusive second solver neither agrees nor contradicts')
  const d = deriveStamp({ kind: 'smt-unsat', solver: z3, crossCheck: { solver: cvc5, verdict: 'sat', sameInput: true } }, ctx)
  assert.equal(text(d), 'none:shadow-mismatch')
  assert.equal(d.kind === 'none' && d.defeater?.against, 'both-sides')
})

test('a vacuous premise adds a defeater to the [P]; a premise witness earns no stamp of its own', () => {
  const d = deriveStamp({ kind: 'smt-unsat', solver: z3, premise: 'unsat' }, ctx)
  assert.ok(d.kind === 'stamp' && d.stamp.defeaters.some((x) => /vacuously/.test(x.text)))
  assert.equal(derive({ kind: 'smt-premise', solver: z3, verdict: 'sat' }), 'none:premise-witness')
  assert.equal(derive({ kind: 'smt-direction-unknown', solver: z3, verdict: 'sat' }), 'none:direction-unknown')
  assert.equal(derive({ kind: 'smt-direction-unknown', solver: z3, verdict: 'unsat' }), 'none:direction-unknown')
})

test('sat is [R] only after its witness replays', () => {
  const sat = (replay: 'replayed' | 'failed' | 'pending'): RawOutput => ({ kind: 'smt-sat', solver: z3, model: '[b = 0, amount = 1, a = 0]', replay, witness: { length: 1, unit: 'steps' } })
  assert.equal(derive(sat('replayed')), 'REFUTED [R] · 1 step')
  assert.equal(derive(sat('pending')), 'none:replay-pending')
  const failed = deriveStamp(sat('failed'), ctx)
  assert.equal(text(failed), 'none:no-replay')
  assert.equal(failed.kind === 'none' && failed.defeater?.against, 'vc-generator')
})

test('unknown is [?] with its reason, and fails closed when it guards enforcement', () => {
  assert.equal(derive({ kind: 'smt-unknown', solver: z3, reason: 'incomplete (theory arithmetic)' }), 'UNKNOWN [?] · incomplete (theory arithmetic)')
  const d = deriveStamp({ kind: 'smt-unknown', solver: z3, reason: 'canceled', rlimit: 5000000, guardsEnforcement: true }, ctx)
  assert.equal(text(d), 'UNKNOWN [?] · canceled at rlimit 5e6')
  assert.equal(d.kind === 'stamp' && d.enforcement, 'fail-closed')
  assert.equal(derive({ kind: 'smt-unknown', solver: z3, reason: '' }), 'UNKNOWN [?] · no reason given')
})

test('TLC: complete is [M] with constants first; a deadlock stop is [?]; a violation is [R] in actions', () => {
  const constants = [['Init', '100'], ['Amount', '80'], ['Workers', '{w1, w2}']] as const
  assert.equal(derive({ kind: 'tlc-complete', engine: tlc, constants, distinctStates: 4 }), 'MODEL-CHECKED [M] · Init = 100, Amount = 80, Workers = {w1, w2} · complete · 4 distinct states')
  assert.equal(derive({ kind: 'tlc-deadlock', engine: tlc, distinctStates: 10, deadlockFreedom: false }), 'UNKNOWN [?] · stopped at deadlock, 10 distinct states')
  assert.equal(derive({ kind: 'tlc-deadlock', engine: tlc, distinctStates: 10, deadlockFreedom: true, witness: { length: 3, unit: 'actions', states: 4 } }), 'REFUTED [R] · 3 actions (4 states)')
  assert.throws(() => deriveStamp({ kind: 'tlc-deadlock', engine: tlc, distinctStates: 10, deadlockFreedom: true }, ctx), StampGrammarError)
  assert.equal(derive({ kind: 'tlc-violation', engine: tlc, property: 'NoOverspend', witness: { length: 4, unit: 'actions', states: 5 } }), 'REFUTED [R] · 4 actions (5 states)')
  assert.equal(derive({ kind: 'model-check-bounded', engine: tlc, bound: 'depth 20', distinctStates: 191 }), 'MODEL-CHECKED [M] · depth 20 · partial · 191 distinct states')
  assert.equal(derive({ kind: 'inductive-bounded', engine: tlc, constants: [['N', '3']], at: 'N = 3' }), 'MODEL-CHECKED [M] · N = 3 · inductive at N = 3 · TLC 1.8.0')
  assert.equal(derive({ kind: 'tlc-simulate', engine: tlc, n: 1, unit: 'traces', constants: [] }), 'TESTED [T] · 1 trace · no constants · TLC 1.8.0')
})

test('an inductive check at fixed constants is never [P]; the parametric Z3 proof is, with its defeater', () => {
  const d = deriveStamp({ kind: 'inductive-bounded', engine: tlc, constants: [['N', '3']], at: 'N = 3' }, ctx)
  assert.equal(d.kind === 'stamp' && d.stamp.code, '[M]')
  const p = deriveStamp({ kind: 'smt-inductive-param', solver: z3, parameter: 'N', premise: 'not-run' }, ctx)
  assert.equal(text(p), 'PROVED [P] · Z3 5.3.1 unsat · uncertified · for every N')
  assert.deepEqual(p.kind === 'stamp' && p.stamp.defeaters.map((x) => x.text), ['encoding unverified (the SMT translation of the spec)', 'no premise witness'])
})

test('Lean: accepted is [P] with the kernel and version; sorry and custom axioms read "modulo"; native is kernel + compiler', () => {
  assert.equal(derive({ kind: 'lean-accepted', lean, axioms: ['propext', 'Quot.sound'] }), 'PROVED [P] · Lean 4.35.0 kernel · axioms listed')
  assert.equal(derive({ kind: 'lean-accepted', lean, axioms: [], checkers: 6 }), 'PROVED [P] · Lean 4.35.0 kernel · axioms listed · 6 checkers')
  assert.equal(derive({ kind: 'lean-sorry', lean, lemmas: ['a', 'b'], count: 2 }), 'PROVED modulo 2 assumed lemmas | ASSUMED [A] · a is left as sorry | ASSUMED [A] · b is left as sorry')
  assert.equal(derive({ kind: 'lean-sorry', lean, lemmas: [], count: 3 }), 'PROVED modulo 3 assumed lemmas | ASSUMED [A] · 3 declarations use sorry')
  assert.equal(derive({ kind: 'lean-custom-axiom', lean, axioms: ['cheat'] }), 'PROVED modulo 1 assumed axiom | ASSUMED [A] · axiom cheat is assumed')
  assert.equal(derive({ kind: 'lean-native', lean, nativeAxioms: ['x._native.native_decide.ax_1_1'] }), 'PROVED [P] · Lean 4.35.0 kernel + compiler · axioms listed')
  assert.equal(derive({ kind: 'lean-mismatch', lean, mismatch: 'statement', line: 'x' }), 'UNKNOWN [?] · statement mismatch')
  assert.equal(derive({ kind: 'lean-tool-error', lean, line: 'bwrap: No permissions' }), 'none:tool-error')
  assert.equal(derive({ kind: 'lean-tool-error', lean, exitCode: 137 }), 'none:tool-error')
  assert.equal(derive({ kind: 'lean-rejected', lean, line: 'leanchecker found a problem in X' }), 'none:checker-rejected')
})

test('trace validation counts accepted traces only, keeps rejected ones as witnesses, and never stamps a liveness claim', () => {
  const tv = (accepted: number, property: 'safety' | 'liveness'): Derivation =>
    deriveStamp({ kind: 'trace-validation', engine: tlc, accepted, rejected: [{ trace: 'mutant.ndjson', firstNonConformingLine: 8 }], partial: 2, error: 1, property }, ctx)
  const d = tv(12, 'safety')
  assert.equal(text(d), 'TESTED [T] · 12 seeds · TLC 1.8.0 trace validation')
  assert.deepEqual(d.kind === 'stamp' && d.witnesses, [{ trace: 'mutant.ndjson', firstNonConformingLine: 8 }])
  assert.equal(text(tv(0, 'safety')), 'none:trace-unearned')
  assert.equal(text(tv(12, 'liveness')), 'none:liveness-untestable')
})

test('the remaining rows: differential, one database, read-back, runtime check, the Clearinghouse, I7, graders, claim-card sources', () => {
  assert.equal(derive({ kind: 'differential', n: 200, statistics: 'outcome classes', engines: [{ name: 'PGlite', version: '0.5.11' }] }), 'TESTED [T] · n = 200 · outcome classes · PGlite 0.5.11')
  assert.equal(derive({ kind: 'one-database', engine: { name: 'PostgreSQL', version: '18.6' } }), 'TESTED [T] · 1 instance · PostgreSQL 18.6')
  assert.equal(derive({ kind: 'setting-read-back', setting: 'relrowsecurity', source: 'pg_class', at: '2026-10-24' }), 'CONFIGURED [C] · relrowsecurity read back from pg_class · at 2026-10-24')
  assert.equal(derive({ kind: 'runtime-check', where: 'deferred check over postings, at commit' }), 'ENFORCED [E] · deferred check over postings, at commit')
  assert.equal(derive({ kind: 'clearinghouse-quiet', rule: 'R', calls: 1 }), 'TESTED [T] · 1 world call · R stayed quiet')
  assert.equal(derive({ kind: 'clearinghouse-fires', rule: 'R', witness: { length: 2, unit: 'calls' }, replay: 'replayed' }), 'REFUTED [R] · 2 calls')
  assert.equal(derive({ kind: 'clearinghouse-fires', rule: 'R', witness: { length: 2, unit: 'calls' }, replay: 'pending' }), 'none:replay-pending')
  assert.equal(derive({ kind: 'statement-hash-changed', path: 'claims/a.smt2' }), 'UNKNOWN [?] · statement hash changed')
  assert.equal(derive({ kind: 'grader', n: 12, passed: 10, unit: 'unseen items', interval: [0.55, 0.95] }), 'TESTED [T] · 10 of 12 unseen items · Wilson 0.55–0.95')
  assert.equal(derive({ kind: 'grader', n: 40, unit: 'goldens' }), 'TESTED [T] · 40 goldens')
  const self = deriveStamp({ kind: 'self-grade' }, ctx)
  assert.equal(text(self), 'ASSUMED [A] · self-assessed')
  assert.equal(self.kind === 'stamp' && self.stamp.lane, 'self-assessed')
  assert.equal(derive({ kind: 'assumption', why: 'balances are unbounded integers' }), 'ASSUMED [A] · balances are unbounded integers')
  assert.equal(derive({ kind: 'not-covered', what: "the recipient's balance" }), "NOT COVERED [N] · the recipient's balance")
  assert.equal(derive({ kind: 'requirement-scenarios', n: 5 }), 'TESTED [T] · 5 requirement scenarios')
  assert.equal(derive({ kind: 'requirement-scenarios', n: 5, counterexample: 'a refund above the charge' }), 'REFUTED [R] · 1 scenario · a refund above the charge')
})

test('I8: an agent or a model asserting "proved" gets quoted UNREVIEWED text, never a stamp', () => {
  for (const raw of [
    { kind: 'agent-assertion', text: 'Proved. 200 tests green.' },
    { kind: 'model-assertion', text: 'These are equivalent.', by: 'a language model' },
    { kind: 'course-claim-under-audit', text: 'The compiler is correct.' },
  ] as const) {
    const d = deriveStamp(raw, ctx)
    assert.equal(d.kind, 'none')
    assert.equal(d.kind === 'none' && d.quote?.label, raw.kind === 'course-claim-under-audit' ? 'UNDER AUDIT' : 'UNREVIEWED')
    assert.equal(d.kind === 'none' && d.quote?.quote, raw.text)
  }
})

test('stamps are frozen and carry their row and source; nothing outside the package can build one', () => {
  const d = deriveStamp({ kind: 'runtime-check', where: 'at commit' }, ctx)
  assert.ok(d.kind === 'stamp')
  assert.ok(Object.isFrozen(d.stamp) && Object.isFrozen(d.stamp.qualifier))
  assert.equal(d.stamp.row, 'runtime-check')
  assert.equal(d.stamp.source, ctx.source)
})

test('the grammar: a qualifier is required, [M] and [T] lead with their bound, [P] names checker and version', () => {
  assert.deepEqual(grammarProblems('[A]', ['why']), [])
  assert.match(grammarProblems('[A]', []).join(), /needs a qualifier/)
  assert.match(grammarProblems('[M]', ['complete', 'Init = 1']).join(), /bound first/)
  assert.match(grammarProblems('[T]', ['generator statistics', 'n = 4']).join(), /bound first/)
  assert.match(grammarProblems('[P]', ['kernel + compiler']).join(), /checker and version/)
  assert.deepEqual(grammarProblems('[P]', ['Lean 4.35.0 kernel + compiler']), [])
  assert.match(grammarProblems('[?]', ['a · b']).join(), /separator/)
  assert.throws(() => deriveStamp({ kind: 'runtime-check', where: '' }, ctx), StampGrammarError)
  assert.throws(() => deriveStamp({ kind: 'model-check-bounded', engine: tlc, bound: 'partial run' }, ctx), StampGrammarError)
})
