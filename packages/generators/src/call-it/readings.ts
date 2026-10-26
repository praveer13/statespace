// GEN-call-it t4's theorems and their restatements, each with a formal reading (ASSESSMENT.md section 4.12). The
// theorems are the S2 ledger's, proved on core Lean 4.35.0 (research/spikes/lean/Ledger.lean; recorded run
// RUN-lean-ledger). A sentence "says exactly what the theorem proves" when its reading and the theorem's agree, as
// closed statements, under the transfer as defined and under every altered transfer below: a restatement must hold
// whatever `transfer` turns out to be, because the theorem's statement does not depend on its proof. The page checks
// that over a box of ledgers and amounts [D]; ASSESSMENT.md names Z3 and Lean for these readings, which the tab does
// not run yet.
//
// Pure data and evaluation.

import { all, and, evaluate, implies, n, not, or, plus, rel, some, v } from './logic.ts'
import type { Formula, State } from './logic.ts'
import type { MisconceptionKey } from '../core/types.ts'

/** The values a, b and n range over when a reading is checked [D]. */
export const LEDGER_BOX: readonly number[] = [-3, -2, -1, 0, 1, 2, 3]

/** A transfer: what a′ and b′ are for a ledger (a, b) and an amount n. */
export interface Interpretation {
  readonly id: string
  /** How a witness names it. */
  readonly says: string
  readonly apply: (a: number, b: number, amount: number) => readonly [number, number]
}

const guarded = (a: number, amount: number): boolean => 0 <= amount && amount <= a

export const INTERPRETATIONS: readonly Interpretation[] = [
  { id: 'definition', says: 'transfer as Ledger.lean defines it', apply: (a, b, x) => (guarded(a, x) ? [a - x, b + x] : [a, b]) },
  { id: 'unguarded', says: 'a transfer with no guard', apply: (a, b, x) => [a - x, b + x] },
  { id: 'refuse-all', says: 'a transfer that refuses every amount', apply: (a, b) => [a, b] },
  { id: 'half-guard', says: 'a transfer guarded by 0 ≤ n alone', apply: (a, b, x) => (0 <= x ? [a - x, b + x] : [a, b]) },
  { id: 'leak-on-refusal', says: 'a transfer that credits the recipient even when it refuses', apply: (a, b, x) => (guarded(a, x) ? [a - x, b + x] : [a, b + x]) },
  { id: 'drain', says: 'a transfer that debits the sender and credits no one', apply: (a, b, x) => [a - x, b] },
]

/** Evaluate a closed reading under an interpretation: a′ and b′ are the transfer of the bound a, b and n. */
export function holdsUnder(reading: Formula, interp: Interpretation): boolean {
  const prime = (env: State, name: string): number => {
    const [a2, b2] = interp.apply(env.a as number, env.b as number, env.n as number)
    return name === "a'" ? a2 : b2
  }
  return evaluateClosed(reading, prime)
}

const evaluateClosed = (f: Formula, prime: (env: State, name: string) => number): boolean => evaluate(f, {}, LEDGER_BOX, prime)

export interface Statement {
  readonly id: string
  readonly text: string
  readonly reading: Formula
  /** Meant true (a restatement), or the misconception a false one applies. */
  readonly meant: true | { readonly tag: MisconceptionKey; readonly operator: string }
  /** A quantifier swap (∀ for ∃, or the order of quantifiers), which band 3 serves two of. */
  readonly swap?: boolean
  readonly why: string
}

export interface Theorem {
  readonly id: string
  /** The Lean statement, verbatim from Ledger.lean. */
  readonly lean: string
  /** What `transfer` does, in words. */
  readonly gloss: string
  readonly reading: Formula
  readonly statements: readonly Statement[]
}

const H = and(rel(n(0), '<=', v('a')), rel(n(0), '<=', v('b')))
const C = and(rel(n(0), '<=', v("a'")), rel(n(0), '<=', v("b'")))
const G = and(rel(n(0), '<=', v('n')), rel(v('n'), '<=', v('a')))
const SAME = and(rel(v("a'"), '=', v('a')), rel(v("b'"), '=', v('b')))
const TOTAL = rel(plus("a'", "b'"), '=', plus('a', 'b'))
const forAll = (vars: readonly string[], body: Formula): Formula => vars.reduceRight((acc, x) => all(x, acc), body)

const GLOSS = '`transfer s n` moves `n` from `a` to `b`, and leaves the ledger unchanged unless `0 ≤ n ≤ a`.'

export const THEOREMS: readonly Theorem[] = [
  {
    id: 'transfer_nonneg',
    lean: 'theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :\n    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b',
    gloss: GLOSS,
    reading: forAll(['a', 'b', 'n'], implies(H, C)),
    statements: [
      { id: 'nn-t1', text: 'If both balances start non-negative, then for any amount both are non-negative after the transfer.', reading: forAll(['a', 'b'], implies(H, all('n', C))), meant: true, why: 'It names both hypotheses and both conclusions, for every amount.' },
      { id: 'nn-t2', text: 'For every amount, a ledger whose balances are at least zero still has both at least zero after transferring that amount.', reading: forAll(['n', 'a', 'b'], implies(H, C)), meant: true, why: 'A paraphrase with the same hypotheses and conclusions; the order of the ∀s does not matter.' },
      { id: 'nn-t3', text: 'Whatever the amount, when a ≥ 0 and b ≥ 0 the transferred ledger has a ≥ 0 and b ≥ 0.', reading: forAll(['a', 'b', 'n'], implies(H, C)), meant: true, why: 'The same statement in symbols: two hypotheses, two conclusions, any amount.' },
      { id: 'nn-f1', text: 'Both balances are non-negative after any transfer.', reading: forAll(['a', 'b', 'n'], C), meant: { tag: 'dp:L4', operator: 'drop the hypotheses' }, why: 'It drops `ha` and `hb`: from a = −1, the transfer is refused and `a` stays −1.' },
      { id: 'nn-f2', text: 'If both balances are non-negative after a transfer, they were non-negative before.', reading: forAll(['a', 'b', 'n'], implies(C, H)), meant: { tag: 'dp:G1', operator: 'state the converse' }, why: 'The converse is not the theorem, and it is false: a = 1, b = −1, n = 1 ends at 0 and 0.' },
      { id: 'nn-f3', text: 'If both balances start non-negative, there is some amount after whose transfer both are non-negative.', reading: forAll(['a', 'b'], implies(H, some('n', C))), meant: { tag: 'dp:G6', operator: '∃ for ∀' }, swap: true, why: '∃ for ∀: true of this `transfer` (an amount of 0 qualifies) but much weaker than the theorem; with no guard at all it would still hold.' },
      { id: 'nn-f4', text: 'There is one amount that leaves both balances non-negative for every ledger whose balances start non-negative.', reading: some('n', forAll(['a', 'b'], implies(H, C))), meant: { tag: 'dp:G6', operator: 'swap the quantifier order' }, swap: true, why: 'It says one amount works (0 does), not that every amount does: a quantifier moved and turned into ∃.' },
      { id: 'nn-f5', text: "If both balances start non-negative, the sender's balance is non-negative after any transfer.", reading: forAll(['a', 'b', 'n'], implies(H, rel(n(0), '<=', v("a'")))), meant: { tag: 'dp:L4', operator: 'drop a conclusion' }, why: 'It keeps only half of the conclusion: the theorem also says the recipient stays non-negative.' },
    ],
  },
  {
    id: 'transfer_conserves',
    lean: 'theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s',
    gloss: `${GLOSS} \`total s\` is \`s.a + s.b\`.`,
    reading: forAll(['a', 'b', 'n'], TOTAL),
    statements: [
      { id: 'cv-t1', text: 'For every ledger and every amount, the total after the transfer equals the total before.', reading: forAll(['a', 'b', 'n'], TOTAL), meant: true, why: 'No hypothesis, every ledger, every amount: exactly the theorem.' },
      { id: 'cv-t2', text: 'Whatever amount is transferred, a + b does not change.', reading: forAll(['n', 'a', 'b'], TOTAL), meant: true, why: 'A paraphrase: the total is a + b, and "whatever amount" is ∀n.' },
      { id: 'cv-f1', text: 'Every accepted transfer (0 ≤ n ≤ a) keeps the total.', reading: forAll(['a', 'b', 'n'], implies(G, TOTAL)), meant: { tag: 'dp:L4', operator: 'add a hypothesis' }, why: 'It adds a hypothesis the theorem does not have: the theorem covers refused transfers too.' },
      { id: 'cv-f2', text: 'A transfer changes neither balance.', reading: forAll(['a', 'b', 'n'], SAME), meant: { tag: 'dp:L4', operator: 'strengthen the conclusion' }, why: 'Far stronger than the theorem, and false: a = 2, n = 1 moves 1 to `b`.' },
      { id: 'cv-f3', text: 'For every ledger there is some amount whose transfer keeps the total.', reading: forAll(['a', 'b'], some('n', TOTAL)), meant: { tag: 'dp:G6', operator: '∃ for ∀' }, swap: true, why: '∃ for ∀: an amount of 0 keeps any total, so this says almost nothing.' },
      { id: 'cv-f4', text: 'If a transfer leaves the total unchanged, its amount was between 0 and a.', reading: forAll(['a', 'b', 'n'], implies(TOTAL, G)), meant: { tag: 'dp:G1', operator: 'read conservation as acceptance' }, why: 'A refused transfer also keeps the total: n = −1 is refused and the total is unchanged.' },
      { id: 'cv-f5', text: 'There is an amount whose transfer keeps the total of every ledger.', reading: some('n', forAll(['a', 'b'], TOTAL)), meant: { tag: 'dp:G6', operator: 'swap the quantifier order' }, swap: true, why: 'One amount (0) for every ledger, not every amount: the ∃ moved to the front.' },
    ],
  },
  {
    id: 'transfer_rejected',
    lean: 'theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :\n    transfer s n = s',
    gloss: GLOSS,
    reading: forAll(['a', 'b', 'n'], implies(not(G), SAME)),
    statements: [
      { id: 'rj-t1', text: 'A transfer whose amount is not between 0 and a leaves the ledger as it was.', reading: forAll(['a', 'b', 'n'], implies(not(G), SAME)), meant: true, why: 'The hypothesis `h` and the conclusion, in words.' },
      { id: 'rj-t2', text: 'If n < 0 or n > a, both balances are unchanged by the transfer.', reading: forAll(['a', 'b', 'n'], implies(or(rel(v('n'), '<', n(0)), rel(v('n'), '>', v('a'))), SAME)), meant: true, why: '¬(0 ≤ n ∧ n ≤ a) is n < 0 ∨ n > a, by De Morgan.' },
      { id: 'rj-f1', text: 'If a transfer leaves the ledger unchanged, its amount was not between 0 and a.', reading: forAll(['a', 'b', 'n'], implies(SAME, not(G))), meant: { tag: 'dp:G1', operator: 'state the converse' }, why: 'The converse, and false: an amount of 0 is accepted and changes nothing.' },
      { id: 'rj-f2', text: 'Every transfer leaves the ledger unchanged.', reading: forAll(['a', 'b', 'n'], SAME), meant: { tag: 'dp:L4', operator: 'drop the hypothesis' }, why: 'It drops `h`: a = 2, n = 1 is accepted and moves 1.' },
      { id: 'rj-f3', text: 'For every ledger, some amount outside 0 to a leaves it unchanged.', reading: forAll(['a', 'b'], some('n', and(not(G), SAME))), meant: { tag: 'dp:G6', operator: '∃ for ∀' }, swap: true, why: '∃ for ∀: one refused amount (−1) is enough for this, so it says little about the others.' },
      { id: 'rj-f4', text: 'If n < 0 and n > a, the ledger is unchanged.', reading: forAll(['a', 'b', 'n'], implies(and(rel(v('n'), '<', n(0)), rel(v('n'), '>', v('a'))), SAME)), meant: { tag: 'dp:G5', operator: 'negate the guard by halves' }, why: '¬(P ∧ Q) is ¬P ∨ ¬Q, not ¬P ∧ ¬Q: this covers only amounts below 0 and above a at once, which needs a < n < 0.' },
      { id: 'rj-f5', text: 'Some single amount outside 0 to a leaves every ledger unchanged.', reading: some('n', forAll(['a', 'b'], implies(not(G), SAME))), meant: { tag: 'dp:G6', operator: 'swap the quantifier order' }, swap: true, why: 'It claims one amount, not every refused amount: the ∃ moved to the front.' },
    ],
  },
]

/** A statement's truth as a restatement: its reading agrees with the theorem's under every interpretation. */
export function judge(theorem: Formula, reading: Formula): { readonly same: true } | { readonly differs: Interpretation; readonly theorem: boolean; readonly statement: boolean } {
  for (const i of INTERPRETATIONS) {
    const t = holdsUnder(theorem, i)
    const s = holdsUnder(reading, i)
    if (t !== s) return { differs: i, theorem: t, statement: s }
  }
  return { same: true }
}
