// The rows of spine section 8.8 ("Verdict → stamp"), each with the raw-output kinds that implement it, and the
// rules outside the table that also decide a stamp. GATE-stamps parses the spine's table and fails unless every
// row here carries the spine's "Raw output" cell verbatim and every spine row appears here, so a revised spine
// row cannot pass silently. Pure data.

import type { RawOutput } from './raw.ts'

export type RawKind = RawOutput['kind']

export interface VerdictRow {
  /** A stable key, used in derivations and fixtures. */
  readonly key: string
  /** The spine's "Raw output" cell, verbatim, for a row of section 8.8; absent for a rule outside the table. */
  readonly spine?: string
  /** For a rule outside the table: where the rule is written. */
  readonly rule?: string
  /** The spine's "Stamp" cell in short, for reports. */
  readonly stamp: string
  /** The raw-output kinds that this row covers. */
  readonly kinds: readonly RawKind[]
}

/** Spine section 8.8, in the spine's order. */
export const SPINE_ROWS: readonly VerdictRow[] = [
  { key: 'smt-unsat', spine: "`unsat` of ¬P on the learner's encoding", stamp: '[P] of the encoding · uncertified; open defeater "encoding unverified"', kinds: ['smt-unsat'] },
  { key: 'smt-sat', spine: '`sat` plus a model', stamp: '[R], after the witness replays', kinds: ['smt-sat'] },
  { key: 'smt-sat-no-replay', spine: '`sat` plus a model that does not replay in the interpreter', stamp: 'no stamp; a defeater against the VC generator', kinds: ['smt-sat'] },
  { key: 'smt-unknown', spine: '`unknown`, a timeout or an `rlimit` stop', stamp: '[?] with its reason; fails closed when it guards enforcement', kinds: ['smt-unknown'] },
  { key: 'tlc-complete', spine: 'TLC "no error", complete exploration', stamp: '[M] · constants · complete', kinds: ['tlc-complete'] },
  { key: 'model-check-bounded', spine: 'TLC or Spectacle stopped by a bound or state constraint', stamp: '[M] · bound · partial', kinds: ['model-check-bounded'] },
  { key: 'tlc-simulate', spine: "TLC's `-simulate` mode [X RUN-tlc-help], or Lamport's random-subset inductive check", stamp: '[T] · n traces (or n sampled states) · constants', kinds: ['tlc-simulate'] },
  { key: 'tlc-deadlock', spine: 'TLC stopped at "Deadlock reached" before exploring all reachable states (the invariant was checked only on the states explored)', stamp: '[?] · stopped at deadlock, n distinct states (or [R] if the property was deadlock freedom)', kinds: ['tlc-deadlock'] },
  { key: 'inductive-bounded', spine: "TLC's inductive check (`Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` over the states `TypeOK` enumerates) at fixed constants, and Apalache's, treated as bounded the same way until a run shows otherwise [D]", stamp: '[M] · constants · "inductive at N = k"; never [P]', kinds: ['inductive-bounded'] },
  { key: 'smt-inductive-param', spine: 'Z3 `unsat` of `Init ⇒ Inv` and of the inductive step with the parameter as an uninterpreted sort', stamp: '[P] · Z3 unsat · uncertified, for every N, with a premise witness; open defeater "encoding unverified"', kinds: ['smt-inductive-param'] },
  { key: 'lean-accepted', spine: 'Lean: comparator accepts, axioms standard', stamp: '[P] · Lean kernel · axioms listed (+ "6 checkers" after --paranoid)', kinds: ['lean-accepted'] },
  { key: 'lean-sorry', spine: 'Lean: `sorryAx` present', stamp: 'no [P]; "PROVED modulo k assumed lemmas", each lemma [A]', kinds: ['lean-sorry'] },
  { key: 'lean-custom-axiom', spine: 'Lean: a custom axiom present', stamp: 'no [P]; treated like sorryAx, the axiom carried as [A]', kinds: ['lean-custom-axiom'] },
  { key: 'lean-native', spine: 'Lean: a `_native` axiom', stamp: '[P] · kernel + compiler', kinds: ['lean-native'] },
  { key: 'lean-mismatch', spine: 'Lean: comparator reports a statement or constant mismatch', stamp: 'the claim voids to [?] · statement mismatch', kinds: ['lean-mismatch'] },
  { key: 'lean-tool-error', spine: 'Lean: the sandbox failed (a `bwrap:` line) or a checker was killed (exit 137 or 143)', stamp: 'no verdict and no stamp', kinds: ['lean-tool-error'] },
  { key: 'differential', spine: 'Differential testing, no divergence', stamp: '[T] · n, generator statistics', kinds: ['differential'] },
  { key: 'shadow-mismatch', spine: 'Shadow or gold mismatch', stamp: 'no stamp; a defeater against both sides', kinds: ['shadow-mismatch'] },
  { key: 'one-database', spine: '"Results match" on one database', stamp: '[T] · 1 instance', kinds: ['one-database'] },
  { key: 'trace-validation', spine: 'Trace validation over n seeds', stamp: '[T] · n seeds, accepted traces only; safety-shaped claims only', kinds: ['trace-validation'] },
  { key: 'setting-read-back', spine: 'A setting read back from the system', stamp: '[C] · source', kinds: ['setting-read-back'] },
  { key: 'runtime-check', spine: 'A runtime check or constraint in place', stamp: '[E] · where', kinds: ['runtime-check'] },
  { key: 'model-assertion', spine: 'A language model says "equivalent" or "proved"', stamp: 'no stamp; quoted UNREVIEWED text', kinds: ['model-assertion'] },
  { key: 'clearinghouse-quiet', spine: 'A Clearinghouse rule stays quiet over n world calls', stamp: 'at most [T] · n calls; never [P] or [M]', kinds: ['clearinghouse-quiet'] },
  { key: 'clearinghouse-fires', spine: 'A Clearinghouse rule fires', stamp: '[R] · witness length, once the witness replays', kinds: ['clearinghouse-fires'] },
  { key: 'course-claim-under-audit', spine: 'A course-authored claim under audit in the Clearinghouse', stamp: 'quoted text, no stamp', kinds: ['course-claim-under-audit'] },
]

/** Rules outside the table that also decide a stamp, each with the place it is written. */
export const OTHER_RULES: readonly VerdictRow[] = [
  { key: 'smt-premise', rule: 'DESIGN.md section 5.4: premise witnesses and vacuity checks are sats that are good news; spine section 8.8 row 1 needs the query direction', stamp: 'no stamp of its own; it supports or defeats the [P] beside it', kinds: ['smt-premise', 'smt-direction-unknown'] },
  { key: 'tlc-violation', rule: "spine section 8.7: [R] is a replayed witness, its length in actions; DESIGN.md section 5.2 (SP-5.1) and ASSESSMENT.md section 4.13 stamp TLC's violation trace [R] · 4 actions, though section 8.8 has no row for it", stamp: '[R] · n actions (n + 1 states)', kinds: ['tlc-violation'] },
  { key: 'statement-hash-changed', rule: 'I7: a changed hash voids the claim to [?] (spine section 1.1; DESIGN.md section 6.13)', stamp: '[?] · statement hash changed', kinds: ['statement-hash-changed'] },
  { key: 'lean-rejected', rule: "spine section 8.8: only an accepted comparator earns [P]; a checker that rejects leaves no stamp (RUN-lean-skipkernel), and so does an axiom that is not permitted (spine section 3.2's Defence B and section 15's M8, RUN-lean-axioms)", stamp: 'no stamp', kinds: ['lean-rejected'] },
  { key: 'lean-no-verdict', rule: 'spine section 9.6: every Lean verdict is read by one rule; a rejection needs a line of a closed list, an acceptance needs exit 0 with an accept line and no error line, and anything else (an error line outside the closed list, a non-zero exit) is no verdict', stamp: 'no verdict and no stamp', kinds: ['lean-no-verdict'] },
  { key: 'agent-assertion', rule: 'I8: an agent assertion renders as quoted UNREVIEWED text (spine sections 1.1 and 8.1)', stamp: 'no stamp; quoted UNREVIEWED text', kinds: ['agent-assertion'] },
  { key: 'grader', rule: "I10 and ASSESSMENT.md section 8.2: the course's own graders are [T] with n and an interval", stamp: '[T] · k of n · interval', kinds: ['grader'] },
  { key: 'self-grade', rule: 'spine section 8.1: a self-grade is [A] (DESIGN.md section 5.4)', stamp: '[A] · self-assessed', kinds: ['self-grade'] },
  { key: 'assumption', rule: 'DESIGN.md section 5.6: a seam or assumption the learner states is [A] with why', stamp: '[A] · why', kinds: ['assumption'] },
  { key: 'not-covered', rule: 'DESIGN.md section 5.6: what is outside the model is [N] with what', stamp: '[N] · what is outside', kinds: ['not-covered'] },
  { key: 'requirement-scenarios', rule: 'DESIGN.md section 5.6: requirement fit is [T] over n requirement scenarios, or [R] for a scenario the theorem permits and the requirement forbids', stamp: '[T] · n requirement scenarios, or [R]', kinds: ['requirement-scenarios'] },
]

export const ALL_ROWS: readonly VerdictRow[] = [...SPINE_ROWS, ...OTHER_RULES]

const BY_KEY = new Map(ALL_ROWS.map((r) => [r.key, r]))

export function rowOf(key: string): VerdictRow {
  const row = BY_KEY.get(key)
  if (!row) throw new Error(`no verdict row ${key}`)
  return row
}
