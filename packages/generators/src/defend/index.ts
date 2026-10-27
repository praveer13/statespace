// GEN-defend (ASSESSMENT.md section 4.15): predict what a seeded mutation does to an artifact, before running it:
// "passes `statespace check`", "builds, and `statespace check` rejects it" (band 2 and up: at which check), or "does
// not build". Four templates, the spine's four operator groups: t1 a hypothesis or the statement, t2 a guard or
// check, t3 the encoding, t4 concurrency or the environment. Band 1 asks for the verdict, band 2 adds the locus, band
// 3 applies two interacting mutations.
//
// In the course the artifact is the learner's own and `statespace defend` grades the predictions from a Bench
// receipt. This page cannot read the learner's files, so it seeds the mutation into a model artifact shaped like
// the lab's (artifact.ts) and builds and checks that one itself, and the item says so.
//
// Keys are never stored. key() applies the instance's mutations to the model artifact and asks the family's
// checker, the defend box (engine.ts), to build it and run its checks; the outcome must be the generator's
// intended prediction, and GATE-generators fails a family whose checker rejects one.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard } from '../core/define.ts'
import type { DiscardOf } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import { chooseDistractors } from './choose.ts'
import type { Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { atom, baseLedger, baseSpec, ledgerBound, n, renderLedger, renderSpec, specBound, v } from './artifact.ts'
import type { Artifact, Ledger, LedgerLocus, Spec, SpecLocus } from './artifact.ts'
import { DEFEND_BOX, DEFEND_BOX_VERSION, defendBoxPort } from './engine.ts'
import type { DefendQuery } from './engine.ts'

export { DEFEND_BOX, DEFEND_BOX_VERSION, defendBoxPort } from './engine.ts'
export { baseLedger, baseSpec, check, checkLedger, checkSpec } from './artifact.ts'
export type { Artifact, Ledger, Spec } from './artifact.ts'

export const DEFEND_ID = 'GEN-defend' as const
const PART = 'main'

export const DEFEND_BASIS =
  'this page, over this instance: the defend box builds this model artifact and runs its checks in order over the printed bound; keys computed at grade time. Your own lab artifact is graded by `statespace defend` on the Bench, from its receipt'

type Locus = LedgerLocus | SpecLocus

/** A prediction: the verdict, and the check it stops at when it rejects. Plain strings, so options stay plain data. */
export type Prediction = 'passes' | 'no-build' | 'rejects' | `rejects:${Locus}`

export interface DefendData {
  /** The artifact before the mutations, as the item shows it. */
  readonly base: Artifact
  /** The operators applied, in order. */
  readonly ops: readonly string[]
  /** The artifact after them: what the checker builds and checks. */
  readonly mutant: Artifact
  /** 1 when the item asks for the locus. */
  readonly locus: number
  readonly values: Readonly<Record<string, Prediction>>
}

export interface DefendInstance extends InstanceBase {
  readonly data: DefendData
}

export interface DefendKey extends KeyBase {
  readonly prediction: Prediction
}

const BANDS = {
  1: { locus: [0, 0], mutations: [1, 1] },
  2: { locus: [1, 1], mutations: [1, 1] },
  3: { locus: [1, 1], mutations: [2, 2] },
} as const

const TEMPLATES: readonly TemplateSpec[] = [
  { id: 't1', name: 'change a hypothesis or the statement', kcs: { primary: 'KC-1.violation-as-sat', secondary: ['KC-1.non-vacuity-check'] }, bands: BANDS },
  { id: 't2', name: 'change a guard or check', kcs: { primary: 'KC-1.non-vacuity-check', secondary: ['KC-1.violation-as-sat'] }, bands: BANDS },
  { id: 't3', name: 'change the encoding or the trusted base', kcs: { primary: 'KC-1.encoding-is-the-claim', secondary: [] }, bands: BANDS },
  { id: 't4', name: 'change concurrency, the environment or the observer', kcs: { primary: 'KC-5.interleaving-granularity', secondary: ['KC-5.hostile-environment'] }, bands: BANDS },
]

/** The misconception a wrong prediction on each template carries (ASSESSMENT.md section 4.15, Distractor mutants). */
const TAG: Readonly<Record<string, MisconceptionKey>> = { t1: 'dp:O2', t2: 'dp:Z5', t3: 'dp:Z4', t4: 'dp:C1' }

// ---------------------------------------------------------------- operators

interface Operator {
  /** What the mutation does, as the item states it. */
  readonly says: string
  readonly apply: (a: Artifact) => Artifact
}

const ledger = (f: (l: Ledger) => Ledger) => (a: Artifact): Artifact => (a.kind === 'ledger' ? f(a) : a)
const spec = (f: (s: Spec) => Spec) => (a: Artifact): Artifact => (a.kind === 'spec' ? f(a) : a)
const isAtom = (x: { op: string; l: { e: string; v?: string; n?: number }; r: { e: string; v?: string; n?: number } }, l: string, op: string, r: string): boolean =>
  x.op === op && (x.l.e === 'var' ? x.l.v : String(x.l.n)) === l && (x.r.e === 'var' ? x.r.v : String(x.r.n)) === r
const setProp = (l: Ledger, name: string, f: (p: Ledger['props'][number]) => Ledger['props'][number]): Ledger => ({ ...l, props: l.props.map((p) => (p.name === name ? f(p) : p)) })
const mapGuard = (l: Ledger, from: [string, string, string], to: Ledger['guard'][number]): Ledger => ({ ...l, guard: l.guard.map((g) => (isAtom(g, ...from) ? to : g)) })
const sorts = (l: Ledger, f: (name: string) => Ledger['decls'][number]['sort'] | null): Ledger => ({ ...l, decls: l.decls.map((d) => ({ v: d.v, sort: f(d.v) ?? d.sort })) })

const OPS: Readonly<Record<string, Operator>> = {
  // t1: a hypothesis or the statement
  'drop-assume-b': { says: 'drop the assumption `b ≥ 0`', apply: ledger((l) => ({ ...l, assume: l.assume.filter((x) => !isAtom(x, 'b', '>=', '0')) })) },
  'drop-assume-a': { says: 'drop the assumption `a ≥ 0`', apply: ledger((l) => ({ ...l, assume: l.assume.filter((x) => !isAtom(x, 'a', '>=', '0')) })) },
  'weaken-no-overdraft': { says: 'weaken the no-overdraft statement, under the same name, to `a′ ≥ −1`', apply: ledger((l) => setProp(l, 'no-overdraft', (p) => ({ ...p, atom: atom(v('a′'), '>=', n(-1)) }))) },
  'strengthen-no-overdraft': { says: 'strengthen the no-overdraft statement to `a′ > 0`', apply: ledger((l) => setProp(l, 'no-overdraft', (p) => ({ ...p, atom: atom(v('a′'), '>', n(0)) }))) },
  'rename-in-statement': { says: 'write the no-overdraft statement over `a2` instead of `a′`', apply: ledger((l) => setProp(l, 'no-overdraft', (p) => ({ ...p, atom: atom(v('a2'), '>=', n(0)) }))) },
  'drop-cap': { says: 'drop the hypothesis `amount ≤ a` from the guard', apply: ledger((l) => ({ ...l, guard: l.guard.filter((x) => !isAtom(x, 'amount', '<=', 'a')) })) },
  // t2: a guard or check
  'le-to-lt': { says: 'tighten the guard\'s `amount ≤ a` to `amount < a`', apply: ledger((l) => mapGuard(l, ['amount', '<=', 'a'], atom(v('amount'), '<', v('a')))) },
  'drop-pos': { says: 'drop the guard\'s conjunct `0 < amount`', apply: ledger((l) => ({ ...l, guard: l.guard.filter((x) => !isAtom(x, '0', '<', 'amount')) })) },
  reverse: { says: 'reverse the guard\'s `amount ≤ a` to `amount ≥ a`', apply: ledger((l) => mapGuard(l, ['amount', '<=', 'a'], atom(v('amount'), '>=', v('a')))) },
  'plus-one': { says: 'weaken the guard\'s `amount ≤ a` to `amount ≤ a + 1`', apply: ledger((l) => mapGuard(l, ['amount', '<=', 'a'], { op: '<=', l: v('amount'), r: { e: 'add', l: v('a'), r: n(1) } })) },
  contradiction: { says: 'add the conjunct `amount > a` to the guard', apply: ledger((l) => ({ ...l, guard: [...l.guard, atom(v('amount'), '>', v('a'))] })) },
  swap: { says: 'swap the order of the guard\'s two conjuncts', apply: ledger((l) => ({ ...l, guard: [...l.guard].reverse() })) },
  'rename-guard': { says: 'write the guard\'s `amount ≤ a` as `amt ≤ a`', apply: ledger((l) => mapGuard(l, ['amount', '<=', 'a'], atom(v('amt'), '<=', v('a')))) },
  // t3: the encoding
  'to-bv4': { says: 'switch every variable from `Int` to signed `BitVec 4`', apply: ledger((l) => sorts(l, () => 'bv4')) },
  'to-nat': { says: 'switch every variable from `Int` to `Nat`, whose subtraction stops at 0', apply: ledger((l) => sorts(l, () => 'nat')) },
  'bv4-b': { says: 'declare `b` as `BitVec 4` and leave the others `Int`', apply: ledger((l) => sorts(l, (x) => (x === 'b' ? 'bv4' : null))) },
  'bv4-amount': { says: 'declare `amount` as `BitVec 4` and leave the others `Int`', apply: ledger((l) => sorts(l, (x) => (x === 'amount' ? 'bv4' : null))) },
  // t4: concurrency and the environment
  split: { says: 'split `Withdraw` into `Read` and `Write`; `Write` tests the value `Read` saw', apply: spec((s) => ({ ...s, atomic: false, recheck: false })) },
  'split-recheck': { says: 'split `Withdraw` into `Read` and `Write`; `Write` tests the balance again', apply: spec((s) => ({ ...s, atomic: false, recheck: true })) },
  retry: { says: 'add a `Retry` action that applies a finished withdrawal again (a duplicated reply)', apply: spec((s) => ({ ...s, retry: true })) },
  unguarded: { says: 'drop the test `bal ≥ Amount` from the withdrawal', apply: spec((s) => ({ ...s, guarded: false })) },
  'split-undeclared': { says: 'split `Withdraw` into `Read` and `Write`, and leave `tmp` out of `VARIABLES`', apply: spec((s) => ({ ...s, atomic: false, recheck: false, declaresTmp: false })) },
  'weaken-overspend': { says: 'weaken `NoOverspend` to `spent ≤ Init + Amount`', apply: spec((s) => ({ ...s, slack: s.amount })) },
}

interface Design {
  readonly ops: readonly string[]
  readonly expect: { readonly verdict: 'passes' } | { readonly verdict: 'no-build' } | { readonly verdict: 'rejects'; readonly locus: Locus }
  /** Why the expected prediction is right: the reference option's why. */
  readonly explain: string
}

const passes = { verdict: 'passes' } as const
const noBuild = { verdict: 'no-build' } as const
const rejects = (locus: Locus) => ({ verdict: 'rejects', locus }) as const

/** Single mutations (bands 1 and 2) and interacting pairs (band 3), each with its prediction worked out by hand; the tests replay every one. */
const DESIGNS: Readonly<Record<string, { readonly single: readonly Design[]; readonly pairs: readonly Design[] }>> = {
  t1: {
    single: [
      { ops: ['drop-assume-b'], expect: rejects('recipient-nonneg'), explain: 'Without `b ≥ 0` the recipient may start negative, and a small credit leaves it negative: recipient-nonneg fails. The sender\'s checks never read `b`, so they still hold.' },
      { ops: ['drop-assume-a'], expect: passes, explain: 'The guard already forces `a ≥ amount > 0`, so the assumption was redundant: every check still holds.' },
      { ops: ['weaken-no-overdraft'], expect: passes, explain: 'A weaker statement is easier to satisfy: `a′ ≥ 0` held, so `a′ ≥ −1` holds too. The check passes and now claims less, under the same name.' },
      { ops: ['strengthen-no-overdraft'], expect: rejects('no-overdraft'), explain: 'The guard admits `amount = a`, which leaves `a′ = 0`: the stronger statement `a′ > 0` fails there.' },
      { ops: ['rename-in-statement'], expect: noBuild, explain: '`a2` is not declared anywhere, so the script is refused before any check runs.' },
      { ops: ['drop-cap'], expect: rejects('no-overdraft'), explain: 'Without `amount ≤ a` the guard admits a debit larger than the balance, which leaves `a′` negative: no-overdraft fails first.' },
    ],
    pairs: [
      { ops: ['drop-assume-a', 'strengthen-no-overdraft'], expect: rejects('no-overdraft'), explain: 'Dropping `a ≥ 0` changes nothing (the guard implies it), and `a′ > 0` fails at `amount = a`: no-overdraft fails.' },
      { ops: ['drop-assume-b', 'weaken-no-overdraft'], expect: rejects('recipient-nonneg'), explain: 'The weaker sender statement still holds, but without `b ≥ 0` the recipient can end negative: recipient-nonneg fails.' },
      { ops: ['drop-assume-a', 'weaken-no-overdraft'], expect: passes, explain: 'Both changes only remove obligations the guard already met: every check holds.' },
      { ops: ['drop-cap', 'weaken-no-overdraft'], expect: rejects('no-overdraft'), explain: 'Without `amount ≤ a` a debit can exceed the balance by more than one, so even `a′ ≥ −1` fails.' },
      { ops: ['rename-in-statement', 'drop-assume-a'], expect: noBuild, explain: '`a2` is not declared, so nothing is checked.' },
    ],
  },
  t2: {
    single: [
      { ops: ['le-to-lt'], expect: rejects('exact-guard'), explain: 'Tightening refuses `amount = a`, so no step can overdraw and the safety checks hold; but the guard no longer admits every transfer with sufficient funds, so exact-guard fails.' },
      { ops: ['drop-pos'], expect: rejects('recipient-nonneg'), explain: 'A negative amount now passes the guard. It raises the sender\'s balance, so no-overdraft holds, and it lowers the recipient\'s: recipient-nonneg fails first.' },
      { ops: ['reverse'], expect: rejects('no-overdraft'), explain: '`amount ≥ a` admits debits larger than the balance: no-overdraft fails.' },
      { ops: ['plus-one'], expect: rejects('no-overdraft'), explain: '`amount ≤ a + 1` admits a debit one more than the balance, which leaves `a′ = −1`: no-overdraft fails.' },
      { ops: ['contradiction'], expect: rejects('premises-sat'), explain: '`amount ≤ a ∧ amount > a` admits nothing, so the premises are unsat. Every violation query would be unsat too, which proves nothing: the non-vacuity check fails first.' },
      { ops: ['swap'], expect: passes, explain: 'A conjunction does not depend on its order: the mutant is the same artifact, and every check holds.' },
      { ops: ['rename-guard'], expect: noBuild, explain: '`amt` is not declared, so the script is refused before any check runs.' },
    ],
    pairs: [
      { ops: ['le-to-lt', 'swap'], expect: rejects('exact-guard'), explain: 'The swap changes nothing; the tightened guard refuses `amount = a`: exact-guard fails.' },
      { ops: ['drop-pos', 'reverse'], expect: rejects('no-overdraft'), explain: 'The guard is now `amount ≥ a` alone, which admits debits larger than the balance: no-overdraft fails first.' },
      { ops: ['drop-pos', 'contradiction'], expect: rejects('premises-sat'), explain: '`amount ≤ a ∧ amount > a` still admits nothing: the premises are unsat and the non-vacuity check fails first.' },
      { ops: ['swap', 'plus-one'], expect: rejects('no-overdraft'), explain: 'The swap changes nothing; `amount ≤ a + 1` admits an overdraft of one: no-overdraft fails.' },
      { ops: ['rename-guard', 'swap'], expect: noBuild, explain: '`amt` is not declared, so nothing is checked.' },
    ],
  },
  t3: {
    single: [
      { ops: ['to-bv4'], expect: rejects('recipient-nonneg'), explain: 'The guard bounds the debit, not the credit: a recipient near the top of the range plus a small amount wraps to a negative number. Integers covered that case; 4-bit values do not.' },
      { ops: ['to-nat'], expect: passes, explain: 'The guard keeps `amount ≤ a`, so the subtraction never reaches the point where `Nat` stops at 0, and `Nat` adds without wrapping: every check holds. This change happens to be harmless here.' },
      { ops: ['bv4-b'], expect: noBuild, explain: '`b + amount` mixes `BitVec 4` and `Int`, which the solver refuses as a sort mismatch: nothing is checked.' },
      { ops: ['bv4-amount'], expect: noBuild, explain: '`a − amount` mixes `Int` and `BitVec 4`, a sort mismatch: nothing is checked.' },
    ],
    pairs: [
      { ops: ['to-bv4', 'drop-pos'], expect: rejects('no-overdraft'), explain: 'A negative amount passes the guard, and `a − amount` overflows past 7 into the negative range: no-overdraft fails first.' },
      { ops: ['to-nat', 'drop-pos'], expect: rejects('exact-guard'), explain: 'Under `Nat` an amount cannot be negative, so the safety checks hold, but `amount = 0` now passes a guard the requirement says refuses it: exact-guard fails.' },
      { ops: ['to-nat', 'bv4-b'], expect: noBuild, explain: '`b` is `BitVec 4` while the others are `Nat`: a sort mismatch, so nothing is checked.' },
      { ops: ['to-bv4', 'swap'], expect: rejects('recipient-nonneg'), explain: 'The swap changes nothing; under `BitVec 4` the credit can wrap the recipient negative.' },
    ],
  },
  t4: {
    single: [
      { ops: ['split'], expect: rejects('NoOverspend'), explain: 'Both workers can read the balance before either writes, and each then pays from the stale value: the balance stays non-negative, but both are paid and `spent` exceeds `Init`.' },
      { ops: ['split-recheck'], expect: passes, explain: '`Write` tests the balance it is about to debit, so the second worker sees the first\'s debit and pays nothing: every reachable state keeps both invariants.' },
      { ops: ['retry'], expect: rejects('NonNegative'), explain: 'A duplicated reply debits a second time with no test, and `Amount ≤ Init < 2 · Amount` means the second debit takes the balance below 0: NonNegative fails first.' },
      { ops: ['unguarded'], expect: rejects('NonNegative'), explain: 'Without the test, the second worker is debited from a balance smaller than `Amount`: the balance goes negative.' },
      { ops: ['split-undeclared'], expect: noBuild, explain: '`tmp` is used but never declared, so the spec does not parse and TLC never runs.' },
      { ops: ['weaken-overspend'], expect: passes, explain: 'The atomic spec never overspends, so a weaker NoOverspend still holds: the check passes and claims less.' },
    ],
    pairs: [
      { ops: ['split', 'weaken-overspend'], expect: passes, explain: 'The lost update pays both workers, `spent = 2 · Amount`, and the weakened `spent ≤ Init + Amount` allows exactly that: the check passes, and the bug is no longer reported.' },
      { ops: ['split', 'retry'], expect: rejects('NonNegative'), explain: 'One worker can read, write and retry before the other moves: the retry debits a balance below `Amount`, which goes negative after 3 actions, before the lost update needs its 4.' },
      { ops: ['unguarded', 'weaken-overspend'], expect: rejects('NonNegative'), explain: 'The weaker NoOverspend does not touch the balance, which still goes negative on the second debit.' },
      { ops: ['split-undeclared', 'weaken-overspend'], expect: noBuild, explain: '`tmp` is not declared, so nothing is checked.' },
      { ops: ['split-recheck', 'retry'], expect: rejects('NonNegative'), explain: 'The re-read protects `Write`, but `Retry` debits with no test at all: the balance goes negative.' },
    ],
  },
}

// ---------------------------------------------------------------- copy

// Every prediction reads alike [D]: what happens to the build, a comma, then what the check does, in six words and
// about as many letters, so no outcome stands out by its length or punctuation.
const TEXT: Readonly<Record<'passes' | 'no-build' | 'rejects', string>> = {
  passes: 'Builds, and `statespace check` accepts it',
  'no-build': "Won't build, and `statespace check` stops",
  rejects: 'Builds, and `statespace check` rejects it',
}

export function predictionText(p: Prediction): string {
  if (p === 'passes' || p === 'no-build' || p === 'rejects') return TEXT[p]
  // The wording takes up the slack of a short or long check name, so every stop reads about as long [D].
  const at = p.slice('rejects:'.length)
  const lead = at.length >= 15 ? 'Builds, then fails at' : at.length <= 10 ? 'Builds, and the check stops at' : 'Builds, and check stops at'
  return `${lead} \`${at}\``
}

const expected = (d: Design, locus: number): Prediction => (d.expect.verdict === 'rejects' ? (locus === 1 ? `rejects:${d.expect.locus}` : 'rejects') : d.expect.verdict)

function wrongWhy(p: Prediction, d: Design): string {
  const lead =
    p === 'passes'
      ? d.expect.verdict === 'no-build'
        ? 'It never gets that far.'
        : 'A build is not a passing check.'
      : p === 'no-build'
        ? 'It still builds: every name is declared and every sort agrees.'
        : d.expect.verdict === 'passes'
          ? 'Every check still holds.'
          : d.expect.verdict === 'no-build'
            ? 'No check runs.'
            : `The first check to fail is \`${d.expect.locus}\`.`
  return `${lead} ${d.explain}`
}

function stemOf(t: TemplateId, base: Artifact, d: Design, locus: number): string {
  const listing = base.kind === 'ledger' ? renderLedger(base) : renderSpec(base)
  const shape =
    base.kind === 'ledger'
      ? "This page cannot read your lab files, so it seeds the mutation into a model of LAB-1's transfer check and checks that model here. `statespace check` builds the artifact, then runs its checks in order and stops at the first that fails."
      : 'This page cannot read your lab files, so it seeds the mutation into a model of a two-worker withdrawal spec and checks that model here. `statespace check` parses the spec, then explores every reachable state breadth-first (TLC with one worker) and stops at the first state that breaks an invariant, checking the invariants in order.'
  const ops = d.ops.map((id) => OPS[id]?.says ?? id)
  const mutation = ops.length === 1 ? `**Mutation:** ${ops[0]}.` : `**Mutations, both applied:** ${ops.map((o, i) => `(${i + 1}) ${o}`).join('; ')}.`
  const ask = locus === 1 ? 'Predict before you run it: what does `statespace check` say about the mutant, and where does it stop?' : 'Predict before you run it: what does `statespace check` say about the mutant?'
  return `${shape}\n\n\`\`\`\n${listing}\n\`\`\`\n\n${mutation}\n\n${ask}${t === 't3' ? ' (`BitVec 4` stands in for `BitVec 64`, so this page can try every value.)' : ''}`
}

// ---------------------------------------------------------------- make, key, grade

export function applyOps(base: Artifact, ops: readonly string[]): Artifact {
  return ops.reduce((a, id) => {
    const op = OPS[id]
    if (op === undefined) throw new RangeError(`${DEFEND_ID} has no operator ${id}`)
    return op.apply(a)
  }, base)
}

function baseFor(t: TemplateId, draw: SeededDraw): Artifact {
  if (t !== 't4') return baseLedger()
  const init = draw.int(3, 5)
  const amounts = [2, 3, 4, 5].filter((a) => a <= init && init < 2 * a)
  return baseSpec(init, draw.pick(amounts))
}

function make(seed: number, band: Band, template: TemplateId): DefendInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const designs = DESIGNS[template]
  const tag = TAG[template]
  if (spec === undefined || designs === undefined || tag === undefined) throw new RangeError(`${DEFEND_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${DEFEND_ID}/${template}/b${band}`))
  const base = baseFor(template, draw)
  const d = draw.pick(band === 3 ? designs.pairs : designs.single)
  const locus = band === 1 ? 0 : 1
  const reference = expected(d, locus)
  const loci: readonly Locus[] = base.kind === 'ledger' ? ['premises-sat', 'no-overdraft', 'recipient-nonneg', 'conserves', 'exact-guard'] : ['NonNegative', 'NoOverspend']
  const candidates: Prediction[] = locus === 1 ? ['passes', 'no-build', ...loci.map((l): Prediction => `rejects:${l}`)] : ['passes', 'no-build', 'rejects']
  const mutants: Mutant<Prediction>[] = candidates
    .filter((p) => p !== reference)
    .map((p) => ({
      // Calling a vacuous check a pass is the non-vacuity slip itself.
      tag: p === 'passes' && d.expect.verdict === 'rejects' && d.expect.locus === 'premises-sat' ? 'dp:Z1' : tag,
      operator: `predict ${p}`,
      why: () => wrongWhy(p, d),
      apply: () => p,
    }))
  // The distractors shown, chosen among the other predictions so the key does not stand out (choose.ts).
  const n = locus === 1 ? 3 : 2
  const chosen = chooseDistractors({ reference, candidates: mutants, n, draw: draw.fork('choose'), render: predictionText })
  const { options, values } = assembleOptions({ reference, referenceWhy: d.explain, mutants: chosen, distractors: n, draw: draw.fork('options'), render: predictionText })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: locus === 1 ? 'Your prediction, with the check it stops at:' : 'Your prediction:', options }
  const mutant = applyOps(base, d.ops)
  return {
    family: DEFEND_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: stemOf(template, base, d, locus), parts: [part] },
    bound: mutant.kind === 'ledger' ? ledgerBound(mutant) : specBound(mutant),
    data: { base, ops: d.ops, mutant, locus, values },
  }
}

async function key(inst: DefendInstance, port: EnginePort): Promise<DefendKey | DiscardOf> {
  // Rebuild the mutant from the shown artifact and the operators, so the key never rests on a stored copy.
  const artifact = applyOps(inst.data.base, inst.data.ops)
  const r = await ask<DefendQuery, Json>(port, { engine: DEFEND_BOX, version: DEFEND_BOX_VERSION, input: { op: 'check', artifact }, budget: { wallMs: 2000 } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the defend box could not decide: ${r.reason}`)
  const verdict = r.reply.verdict
  let found: Prediction
  if (verdict.kind === 'rejected') found = 'no-build'
  else if (verdict.kind === 'no-error') found = 'passes'
  else if (verdict.kind === 'violated') found = inst.data.locus === 1 ? (`rejects:${verdict.property}` as Prediction) : 'rejects'
  else return discard('unknown', `the defend box answered ${verdict.kind}`)
  const witness: Json = r.reply.witness ?? { checks: 'every check holds over the bound' }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice<Prediction>({
    part: PART,
    options: part.options,
    values: inst.data.values,
    confirm: async (ref) => (ref === found ? { confirmed: true } : { rejected: `the checker found ${found}` }),
    distinguish: async (a, b) => (a === b ? { same: true } : { differ: a === found || b === found ? witness : { value: 'distinct' } }),
  })
  if ('discard' in choice) return choice
  return { engine: engineAtVersion(r.reply), choices: [choice], statements: [], prediction: found, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
}

export const defendGenerator: Generator<DefendInstance, DefendKey> = defineGenerator<DefendInstance, DefendKey>({
  id: DEFEND_ID,
  fixture: false,
  title: 'Defend: predict what a seeded mutation does, before running it',
  templates: TEMPLATES,
  engines: [DEFEND_BOX],
  misconceptions: ['dp:O2', 'dp:Z5', 'dp:Z4', 'dp:C1', 'dp:Z1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: DEFEND_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure: (inst): Measure => ({ locus: inst.data.locus, mutations: inst.data.ops.length }),
  // The operator group each template draws from, the artifact's shape, and how many operators apply.
  structure: (inst) => `${inst.template === 't1' ? 'statement' : inst.template === 't2' ? 'guard' : inst.template === 't3' ? 'encoding' : 'concurrency'}|${inst.data.base.kind}|ops ${inst.data.ops.length}|locus ${inst.data.locus}`,
})

export const generator = defendGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [DEFEND_BOX]: defendBoxPort }

/** Every design of every template, for the tests: the operators, the band they serve and the prediction worked by hand. */
export function designsOf(template: TemplateId): readonly (Design & { readonly band: 'single' | 'pair' })[] {
  const d = DESIGNS[template]
  return d === undefined ? [] : [...d.single.map((x) => ({ ...x, band: 'single' as const })), ...d.pairs.map((x) => ({ ...x, band: 'pair' as const }))]
}
