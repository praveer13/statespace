// GEN-which-stamp's distractor mutants: wrong stamps on purpose, each one cataloged misconception applied to the stamp
// the deriver gives a recorded output (ASSESSMENT.md section 4.13). This is the one file of the generator where stamp
// text is written by hand (GATE-stamps' hand check exempts it); every key comes from the deriver (deriver.ts), never
// from here. The numbers a mutant prints come from the run's own derivation, changed only the way its misconception
// changes them (a trace's states counted as actions), and its why says so.
//
// Pure: no DOM, storage or network.

import { SEP } from '@statespace/stamps'
import type { MisconceptionKey } from '../core/types.ts'
import type { DerivedView } from './deriver.ts'
import type { RecordedOutput } from './recorded.ts'

/** An option's value: the text shown, and for the reference what the deriver gave and the output it read. */
export interface StampValue {
  readonly text: string
  readonly view?: DerivedView
  readonly output?: RecordedOutput
}

export interface StampMutantRule {
  readonly tag: MisconceptionKey
  readonly operator: string
  readonly why: string
  readonly text: (view: DerivedView, output: RecordedOutput) => string | null
}

const stamp = (code: string, ...parts: string[]): string => [code, ...parts].join(SEP)
const checker = (o: RecordedOutput): string => `${o.checker.name} ${o.checker.version}`
const firstInt = (s: string, re: RegExp): number | null => {
  const m = re.exec(s)
  return m && m[1] !== undefined ? Number(m[1]) : null
}
const part = (v: DerivedView, i: number): string => (v.kind === 'stamp' ? (v.qualifier[i] ?? '') : '')

const FOUND_BY_SAT =
  'sat of a violation query is a state that breaks the property: a refutation once its model replays, never a proof. Reading sat as "holds" turns the answer around.'
const TRUST_SOLVER = "Nothing checked the solver's answer independently, so the deriver keeps \"uncertified\" on every solver [P]; a solver's say-so is authority, not a certificate."
const ENCODING_ONLY = 'A [P] from a solver is about the encoding the query states, and it keeps the open defeater "encoding unverified": it says nothing yet about the requirement.'
const UNKNOWN_IS_NO_ANSWER = 'unknown is no answer: the solver gave up (an incomplete theory, or its rlimit). Reading it as "no bug" is the misconception the [?] stamp exists to stop; on a gate it fails closed.'
const MODEL_NOT_PROOF = 'A model-checking run is never [P]: it explored the states at the constants it was given, and says nothing about other sizes.'
const ONE_WITNESS = 'The model or trace is one witness of a class of violations, not the bug itself; fixing only this instance leaves the others.'
const COUNT_ACTIONS = 'A trace or a step is counted in actions (steps), not states: n actions pass through n + 1 states.'
const DEADLOCK_STOP = 'Under default flags TLC stops at "Deadlock reached" before exploring every reachable state, so the invariant was checked only on the states it explored: neither a finished check nor, unless the property was deadlock freedom, a refutation.'
const KERNEL_NOT_REQUIREMENT = "The kernel checked a proof of the statement as written. Whether that statement is the requirement is the strip's other segments, never [P]."
const AXIOM_NOT_UNSOUND = 'Standard axioms (propext, Quot.sound, Classical.choice) are listed, not unsound: the stamp names them so the reader knows what is trusted.'
const NO_AXIOMS_NOT_NOTHING = 'Listing no custom axiom does not mean nothing is trusted: the kernel, the standard axioms and the statement itself still are.'
const EXIT_ZERO = 'The file builds with exit code 0, but an axiom or sorryAx is listed: a lemma is assumed, not proved, so the reading is "PROVED modulo", each assumption [A].'
const ACCEPT_LINE = 'A line says a kernel accepts, but another checker or an error line rejects it. An acceptance needs exit 0, an accept line and no error line, so this earns no stamp.'
const TEST_NOT_PROOF = 'Trace validation is a test: it shows the recorded traces conform, for the seeds run. It is never [P] or [M].'
const ONLY_ACCEPTED = 'Only the accepted traces count toward [T]; a rejected trace is a witness against conformance, and a partial one counts for nothing.'
const LIVENESS = 'A finite trace cannot test an "eventually": a liveness claim gets no [T] from trace validation, and its correspondence stays assumed.'
const REPLAY_FIRST = 'A sat earns [R] only once its model replays in the interpreter; a model that does not replay points at the encoding, not the program.'
const MISMATCH = 'The comparator found that the statement (or a constant it uses) differs from the challenge, so the proof is of something else: the claim voids to [?].'

/** t1: the stamp a raw output earns. Each rule applies one misconception; a rule that returns null does not apply. */
export const T1_RULES: Readonly<Record<string, readonly StampMutantRule[]>> = {
  'smt-unsat': [
    { tag: 'dp:Z1', operator: 'unsat read as a refutation', why: 'unsat of a violation query means no state breaks the property: it is the [P] side, never [R], which needs a sat whose model replays.', text: (_v, o) => stamp('[R]', `${checker(o)} unsat`) },
    { tag: 'dp:G8', operator: 'solver trusted as a certificate', why: TRUST_SOLVER, text: (v) => stamp('[P]', part(v, 0), 'certified') },
    { tag: 'dp:L3', operator: 'encoding read as the requirement', why: ENCODING_ONLY, text: (v) => stamp('[P]', part(v, 0), 'requirement met') },
  ],
  'smt-sat': [
    { tag: 'dp:Z1', operator: 'sat read as holds', why: FOUND_BY_SAT, text: (_v, o) => stamp('[P]', `${checker(o)} sat`) },
    { tag: 'dp:T6', operator: 'states counted for steps', why: COUNT_ACTIONS, text: (v) => (v.kind === 'stamp' && firstInt(part(v, 0), /^(\d+) steps?$/) !== null ? stamp('[R]', `${(firstInt(part(v, 0), /^(\d+)/) as number) + 1} steps`) : null) },
    { tag: 'dp:Z3', operator: 'the model taken as the bug', why: ONE_WITNESS, text: (_v, o) => stamp('[R]', `only ${/\[([^\]]+)\]\s*$/.exec(o.lines[0] ?? '')?.[1] ?? 'the model shown'}`) },
    { tag: 'dp:Z3', operator: 'stamped before the replay', why: REPLAY_FIRST, text: (v, o) => (v.kind === 'none' ? stamp('[R]', `${checker(o)} sat, not replayed`) : null) },
    { tag: 'dp:Z1', operator: 'sat read as no violation', why: FOUND_BY_SAT, text: (v, o) => (v.kind === 'none' ? stamp('[P]', `${checker(o)} unsat`, 'uncertified') : null) },
  ],
  'smt-unknown': [
    { tag: 'dp:Z2', operator: 'unknown read as unsat', why: UNKNOWN_IS_NO_ANSWER, text: (_v, o) => stamp('[P]', `${checker(o)} unsat`, 'uncertified') },
    { tag: 'dp:Z2', operator: 'unknown read as no counterexample', why: UNKNOWN_IS_NO_ANSWER, text: (v) => stamp('[T]', `no counterexample (${part(v, 0)})`) },
    { tag: 'dp:Z1', operator: 'unknown read as a refutation', why: 'unknown found no model, so there is nothing to replay: it is neither a violation nor a proof.', text: (_v, o) => stamp('[R]', `${checker(o)} unknown`) },
  ],
  'tlc-complete': [
    { tag: 'dp:X1', operator: 'a model check stamped PROVED', why: MODEL_NOT_PROOF, text: (v) => stamp('[P]', 'TLC no error', part(v, 2)) },
    { tag: 'dp:T5', operator: '"no error" read as every size', why: 'TLC found no error at these constants. "No error" holds at the constants checked, so the bound stays first in the qualifier; it is not a result for every size.', text: (v) => stamp('[M]', 'for all sizes', 'complete', part(v, 2)) },
    { tag: 'dp:T6', operator: 'a finished run read as a deadlock stop', why: 'This run finished: "Model checking completed. No error has been found." with no states left on the queue. A deadlock stop prints "Deadlock reached".', text: (v) => stamp('[?]', `stopped at deadlock, ${part(v, 2)}`) },
  ],
  'tlc-deadlock': [
    { tag: 'dp:T5', operator: '"no error found" read as complete', why: 'The run did not complete: states were left on the queue when TLC stopped. [M] · complete needs every reachable state explored.', text: (_v, o) => stamp('[M]', (o.constants ?? []).map(([k, val]) => `${k} = ${val}`).join(', '), 'complete') },
    { tag: 'dp:T6', operator: 'a deadlock stop read as a declared bound', why: 'A deadlock stop is not a declared bound or state constraint, so it is not [M] · partial either.', text: () => stamp('[M]', 'bound', 'partial') },
    { tag: 'dp:T6', operator: 'a deadlock read as the violation', why: DEADLOCK_STOP, text: () => stamp('[R]', 'deadlock reached') },
    { tag: 'dp:X1', operator: 'a model check stamped PROVED', why: MODEL_NOT_PROOF, text: (_v, o) => stamp('[P]', o.checker.name) },
  ],
  'tlc-violation': [
    { tag: 'dp:T6', operator: 'states counted for actions', why: COUNT_ACTIONS, text: (v) => {
      const states = firstInt(part(v, 0), /\((\d+) states\)/)
      return states === null ? null : stamp('[R]', `${states} actions`)
    } },
    { tag: 'dp:Z3', operator: 'the trace taken as the bug', why: ONE_WITNESS, text: () => stamp('[R]', 'only the interleaving shown') },
    { tag: 'dp:X1', operator: 'a refutation read as a failing test', why: 'TLC explored the state graph and printed a trace that violates the invariant: a replayable refutation, [R], not a test result.', text: () => stamp('[T]', '1 failing trace') },
  ],
  'lean-accepted': [
    { tag: 'dp:L3', operator: 'kernel acceptance read as the requirement met', why: KERNEL_NOT_REQUIREMENT, text: (v) => stamp('[P]', part(v, 0), 'requirement met') },
    { tag: 'dp:L8', operator: 'a listed axiom read as unsound', why: AXIOM_NOT_UNSOUND, text: () => stamp('[?]', 'axioms present, unsound') },
    { tag: 'dp:L8', operator: 'no custom axiom read as nothing trusted', why: NO_AXIOMS_NOT_NOTHING, text: (v) => stamp('[P]', part(v, 0), 'nothing trusted') },
  ],
  'lean-sorry': [
    { tag: 'dp:G8', operator: 'exit code 0 read as proved', why: EXIT_ZERO, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel`, 'axioms listed') },
    { tag: 'dp:L8', operator: 'an assumed lemma read as unsound', why: 'sorryAx marks a lemma as assumed: the rest is checked, and the claim reads "PROVED modulo 1 assumed lemma", not unsound.', text: () => stamp('[?]', 'unsound') },
    { tag: 'dp:L8', operator: 'an assumed lemma read as the whole claim assumed', why: 'Only the sorry lemma is assumed; the kernel checked the rest. One [A] per assumed lemma, under "PROVED modulo".', text: () => stamp('[A]', 'the whole theorem is assumed') },
  ],
  'lean-custom-axiom': [
    { tag: 'dp:G8', operator: 'exit code 0 read as proved', why: EXIT_ZERO, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel`, 'axioms listed') },
    { tag: 'dp:L8', operator: 'any axiom read as unsound', why: 'A custom axiom is carried as [A] beside the proof: "PROVED modulo 1 assumed axiom". It is an assumption to review, not proof of unsoundness.', text: () => stamp('[?]', 'unsound axiom') },
    { tag: 'dp:L3', operator: 'kernel acceptance read as the requirement met', why: KERNEL_NOT_REQUIREMENT, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel`, 'requirement met') },
  ],
  'lean-mismatch': [
    { tag: 'dp:L3', operator: 'a checked proof of another statement read as the claim', why: MISMATCH, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel`, 'axioms listed') },
    { tag: 'dp:Z1', operator: 'a mismatch read as a refutation', why: 'A mismatch refutes nothing about the program: the proof is of another statement, so the claim is unknown again, [?].', text: () => stamp('[R]', 'statement mismatch') },
    { tag: 'dp:G8', operator: 'the comparator run read as acceptance', why: MISMATCH, text: () => stamp('[P]', 'comparator ran') },
  ],
  'lean-rejected': [
    { tag: 'dp:G8', operator: 'an accept line trusted over a rejection', why: ACCEPT_LINE, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel`, 'axioms listed') },
    { tag: 'dp:X1', operator: 'a rejected native proof stamped PROVED', why: ACCEPT_LINE, text: (_v, o) => stamp('[P]', `Lean ${o.checker.version} kernel + compiler`) },
    { tag: 'dp:Z1', operator: 'a rejection read as a refutation', why: 'A checker that rejects a proof refutes the proof, not the claim: there is no witness against the program, so no [R].', text: () => stamp('[R]', 'checker rejected') },
  ],
  'trace-validation': [
    { tag: 'dp:X1', operator: 'a test stamped PROVED', why: TEST_NOT_PROOF, text: () => stamp('[P]', 'trace validation') },
    { tag: 'dp:G8', operator: 'every trace counted', why: ONLY_ACCEPTED, text: (_v, o) => ((o.traces ?? []).length > 1 ? stamp('[T]', `${(o.traces ?? []).length} seeds`, `${checker(o)} trace validation`) : null) },
    { tag: 'dp:T5', operator: 'conforming traces read as a complete check', why: TEST_NOT_PROOF, text: (_v, o) => stamp('[M]', `${(o.traces ?? []).length} ${(o.traces ?? []).length === 1 ? 'trace' : 'traces'}`, 'complete') },
    { tag: 'dp:T1', operator: 'a finite trace read as testing eventually', why: LIVENESS, text: (v, o) => (v.kind === 'none' ? stamp('[T]', '1 seed', `${checker(o)} trace validation`) : null) },
  ],
}

// ------------------------------------------------------------------ t2: complete the qualifier

/** A field's wrong values, each one misconception applied to that field alone. */
interface FieldRule {
  readonly match: RegExp
  readonly wrong: readonly { readonly tag: MisconceptionKey; readonly operator: string; readonly why: string; readonly value: (m: RegExpExecArray) => string }[]
}

export const FIELD_RULES: readonly FieldRule[] = [
  { match: /^(\S+) (\S+) unsat$/, wrong: [
    { tag: 'dp:Z1', operator: 'unsat written as sat', why: FOUND_BY_SAT, value: (m) => `${m[1]} ${m[2]} sat` },
    { tag: 'dp:G8', operator: 'the version dropped', why: 'A [P] names its checker and version (I10): the stamp is only as good as the solver that gave it.', value: (m) => `${m[1]} unsat` },
  ] },
  { match: /^uncertified$/, wrong: [
    { tag: 'dp:G8', operator: 'solver trusted as a certificate', why: TRUST_SOLVER, value: () => 'certified' },
    { tag: 'dp:L3', operator: 'encoding read as the requirement', why: ENCODING_ONLY, value: () => 'requirement met' },
  ] },
  // A wrong field names what the right one names, so it is about as long [D].
  { match: /=/, wrong: [
    { tag: 'dp:T5', operator: 'the constants dropped', why: 'An [M] leads with the constants it ran at (I10): "no error" at these constants is not a result for every size.', value: (m) => `for all sizes of ${constantNames(m.input)}` },
    { tag: 'dp:T5', operator: 'the constants read as any', why: 'The constants are the bound of the check, printed first; they are the configuration TLC ran, not a sample of every value.', value: (m) => `any value of ${constantNames(m.input)}` },
  ] },
  { match: /^complete$/, wrong: [
    { tag: 'dp:T6', operator: 'a finished run read as partial', why: 'This run left no state on the queue: the exploration at these constants was complete.', value: () => 'partial' },
    { tag: 'dp:X1', operator: 'complete read as proved', why: MODEL_NOT_PROOF, value: () => 'proved' },
  ] },
  { match: /^(\d+) distinct states$/, wrong: [
    { tag: 'dp:T5', operator: 'the state count read as every state', why: 'The count is the distinct states at these constants, the size of what was explored; it is not "every state" of every size.', value: () => 'every state' },
    { tag: 'dp:T6', operator: 'distinct states read as generated states', why: 'TLC prints states generated and distinct states found; the stamp counts the distinct ones.', value: (m) => `${Number(m[1]) + 1} states generated` },
  ] },
  { match: /^Lean (\S+) kernel$/, wrong: [
    { tag: 'dp:L3', operator: 'kernel acceptance read as the requirement met', why: KERNEL_NOT_REQUIREMENT, value: (m) => `Lean ${m[1]} kernel, requirement met` },
    { tag: 'dp:G8', operator: 'the build read as the check', why: 'The kernel checks the proof; a build that exits 0 is not that check (a sorry file builds with exit 0).', value: (m) => `Lean ${m[1]} build, exit 0` },
  ] },
  { match: /^axioms listed$/, wrong: [
    { tag: 'dp:L8', operator: 'no custom axiom read as nothing trusted', why: NO_AXIOMS_NOT_NOTHING, value: () => 'nothing trusted' },
    { tag: 'dp:L8', operator: 'a listed axiom read as unsound', why: AXIOM_NOT_UNSOUND, value: () => 'unsound axioms' },
  ] },
  { match: /^(\d+) checkers$/, wrong: [
    { tag: 'dp:G8', operator: 'checkers read as independent proofs', why: '--paranoid re-checks one proof with several kernels; it is one proof checked six ways, not six proofs.', value: (m) => `${m[1]} proofs` },
    { tag: 'dp:X1', operator: 'the checkers dropped', why: 'The count of accepting checkers is part of the qualifier after --paranoid; dropping it hides what was run.', value: () => 'one kernel' },
  ] },
  { match: /^(\d+) seeds?$/, wrong: [
    { tag: 'dp:G8', operator: 'every trace counted', why: ONLY_ACCEPTED, value: () => 'every seed' },
    { tag: 'dp:X1', operator: 'seeds read as a proof', why: TEST_NOT_PROOF, value: () => 'all behaviours' },
  ] },
  { match: /^(\S+) (\S+) trace validation$/, wrong: [
    { tag: 'dp:X1', operator: 'a test read as a model check', why: TEST_NOT_PROOF, value: (m) => `${m[1]} ${m[2]} model check` },
    { tag: 'dp:X1', operator: 'a test read as a proof', why: TEST_NOT_PROOF, value: (m) => `${m[1]} ${m[2]} proof` },
  ] },
  { match: /^(\d+) actions? \((\d+) states\)$/, wrong: [
    { tag: 'dp:T6', operator: 'states counted for actions', why: COUNT_ACTIONS, value: (m) => `${m[2]} actions` },
    { tag: 'dp:Z3', operator: 'the trace taken as the bug', why: ONE_WITNESS, value: () => 'only this interleaving' },
  ] },
  { match: /^(\d+) steps?$/, wrong: [
    { tag: 'dp:T6', operator: 'states counted for steps', why: COUNT_ACTIONS, value: (m) => `${Number(m[1]) + 1} steps` },
    { tag: 'dp:Z3', operator: 'the model taken as the bug', why: ONE_WITNESS, value: () => 'only this model' },
  ] },
  { match: /^stopped at deadlock, (\d+) distinct states$/, wrong: [
    { tag: 'dp:T6', operator: 'a deadlock stop read as finished', why: DEADLOCK_STOP, value: (m) => `complete, ${m[1]} distinct states` },
    { tag: 'dp:T5', operator: '"no error" read as proof', why: DEADLOCK_STOP, value: (m) => `no error found, ${m[1]} distinct states` },
  ] },
  { match: /^canceled at rlimit (\S+)$/, wrong: [
    { tag: 'dp:Z2', operator: 'a budget stop read as no bug', why: UNKNOWN_IS_NO_ANSWER, value: (m) => `no counterexample within rlimit ${m[1]}` },
    { tag: 'dp:Z2', operator: 'a budget stop read as unsat', why: UNKNOWN_IS_NO_ANSWER, value: (m) => `unsat at rlimit ${m[1]}` },
  ] },
  { match: /^incomplete \((.+)\)$/, wrong: [
    { tag: 'dp:Z2', operator: 'unknown read as no bug', why: UNKNOWN_IS_NO_ANSWER, value: (m) => `no counterexample (${m[1]})` },
    { tag: 'dp:Z2', operator: 'unknown read as unsat', why: UNKNOWN_IS_NO_ANSWER, value: (m) => `unsat (${m[1]})` },
  ] },
  { match: /^statement mismatch/, wrong: [
    { tag: 'dp:L3', operator: 'a mismatch read as acceptance', why: MISMATCH, value: () => 'kernel accepts the stated theorem' },
    { tag: 'dp:G8', operator: 'the comparator run read as the check', why: MISMATCH, value: () => 'comparator ran, no difference found' },
  ] },
]

/** The names of a constants field, "Init = 100, Amount = 80" giving "Init, Amount". */
function constantNames(field: string): string {
  const names = [...field.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].map((m) => m[1] as string)
  return names.length <= 1 ? (names[0] ?? 'the constants') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] as string}`
}

/** The wrong values a field can take, or none when no rule reads it. */
export function fieldMutants(field: string): readonly { readonly tag: MisconceptionKey; readonly operator: string; readonly why: string; readonly value: string }[] {
  for (const r of FIELD_RULES) {
    const m = r.match.exec(field)
    if (m) return r.wrong.map((w) => ({ tag: w.tag, operator: w.operator, why: w.why, value: w.value(m) }))
  }
  return []
}

export const BLANK = '____'

/** A stamp written code first with the given fields of its qualifier blanked. */
export function blankedText(code: string, qualifier: readonly string[], blanks: readonly number[]): string {
  return stamp(code, ...qualifier.map((q, i) => (blanks.includes(i) ? BLANK : q)))
}

/** A stamp written code first with one field replaced. */
export function withField(code: string, qualifier: readonly string[], index: number, value: string): string {
  return stamp(code, ...qualifier.map((q, i) => (i === index ? value : q)))
}

// ------------------------------------------------------------------ t3: which strip segment

export const SEGMENT_WHY = {
  proposition:
    'A check of the model itself: Z3, TLC and Lean check that the model (the encoding, the spec, the Lean definitions) has the property stated. It says nothing yet about the running system or the requirement.',
  correspondence: 'A check that the model matches the running system: trace validation and differential testing compare what the code did with what the model allows.',
  requirement: 'A check that the property stated is the one the requirement needs: requirement scenarios, never a proof.',
} as const

export const SEGMENT_MUTANT = {
  /** A model-level check read as reaching the requirement. */
  toRequirement: { tag: 'dp:L3' as MisconceptionKey, operator: 'a model check read as the requirement met', why: 'This output checks the model; a [P] or [M] there never reaches requirement fit, which only requirement scenarios address (requirement fit is never [P]).' },
  /** A model-level check read as checking the code. */
  toCorrespondence: { tag: 'dp:X1' as MisconceptionKey, operator: 'a model check read as checking the code', why: 'This output checks the model, not the running system: correspondence needs traces or differential runs of the code.' },
  /** A correspondence test read as a check of the model. */
  toProposition: { tag: 'dp:X1' as MisconceptionKey, operator: 'a conformance test read as a model check', why: 'Trace validation tests that recorded runs of the code fit the spec: it bears on correspondence, not on whether the spec has its property.' },
  /** A correspondence test read as requirement fit. */
  testToRequirement: { tag: 'dp:G8' as MisconceptionKey, operator: 'passing runs read as the requirement met', why: 'Conforming traces show the code follows the spec on those runs; they do not show the spec is the requirement.' },
} as const
