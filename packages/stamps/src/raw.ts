// Raw outputs: what a checker said, in structured form, before any stamp. Each kind is one row of spine section
// 8.8 (or one rule outside it, `rows.ts`). A raw output holds only what a receipt, an engine reply or a recorded
// run states; nothing here is a stamp. `parse.ts` builds raw outputs from verdict lines, `receipt.ts` from a
// receipt@1, and `reply.ts` from an instrument reply.

/** A checker as it reported itself: its name in learner words and its version verbatim (z3 5.3.1 is "Z3 5.3.1"). */
export interface Checker {
  readonly name: string
  readonly version: string
}

/** A witness's length, in the unit its engine counts (spine section 8.7: actions, steps or rows). */
export interface WitnessLength {
  readonly length: number
  readonly unit: 'actions' | 'steps' | 'rows' | 'lines' | 'calls'
  /** For a TLC trace, the number of states: "4 actions (5 states)". */
  readonly states?: number
}

/** TLC constants as the configuration assigns them, in order, verbatim: `[['Init', '100'], ['Amount', '80']]`. */
export type Constants = readonly (readonly [string, string])[]

export type Replay = 'replayed' | 'failed' | 'pending'

export type RawOutput =
  /** `unsat` of ¬P on the learner's encoding: a violation query found no state. */
  | {
      readonly kind: 'smt-unsat'
      readonly solver: Checker
      /** The query's verb in the qualifier: "unsat" (the default), "equivalence" (CL-4.1), "unsat by self-composition" (CL-7.3). */
      readonly method?: string
      readonly rlimit?: number
      /** A second solver on the same input; agreement adds "agree" and keeps "uncertified" (D-32). */
      readonly crossCheck?: { readonly solver: Checker; readonly verdict: 'sat' | 'unsat' | 'unknown'; readonly sameInput: boolean }
      /** The premise query beside it: `sat` is the premise witness; `unsat` means the claim holds vacuously. */
      readonly premise?: 'sat' | 'unsat' | 'not-run'
    }
  /** `sat` of a violation query, with its model; [R] only once the witness replays. */
  | { readonly kind: 'smt-sat'; readonly solver: Checker; readonly model: string; readonly replay: Replay; readonly witness: WitnessLength }
  /** `unknown`, a timeout or an `rlimit` stop, with the solver's reason verbatim. */
  | { readonly kind: 'smt-unknown'; readonly solver: Checker; readonly reason: string; readonly rlimit?: number; readonly guardsEnforcement?: boolean }
  /** A premise query (the premises alone, without the negated property). */
  | { readonly kind: 'smt-premise'; readonly solver: Checker; readonly verdict: 'sat' | 'unsat' }
  /** A `sat` or `unsat` whose query direction the source does not state: it cannot be read either way. */
  | { readonly kind: 'smt-direction-unknown'; readonly solver: Checker; readonly verdict: 'sat' | 'unsat' }
  /** TLC: "No error has been found" after a complete exploration. */
  | { readonly kind: 'tlc-complete'; readonly engine: Checker; readonly constants: Constants; readonly distinctStates: number }
  /** TLC reports an invariant or property violated, with its counterexample trace. */
  | { readonly kind: 'tlc-violation'; readonly engine: Checker; readonly property: string; readonly witness: WitnessLength }
  /** TLC or Spectacle stopped by a bound or a state constraint. */
  | { readonly kind: 'model-check-bounded'; readonly engine: Checker; readonly bound: string; readonly constants?: Constants; readonly distinctStates?: number }
  /** TLC's `-simulate` mode, or a random-subset inductive check. */
  | { readonly kind: 'tlc-simulate'; readonly engine: Checker; readonly n: number; readonly unit: 'traces' | 'sampled states'; readonly constants: Constants }
  /** TLC stopped at "Deadlock reached" before exploring every reachable state. */
  | { readonly kind: 'tlc-deadlock'; readonly engine: Checker; readonly distinctStates: number; readonly deadlockFreedom: boolean; readonly witness?: WitnessLength }
  /** A TLC or Apalache inductive check at fixed constants. */
  | { readonly kind: 'inductive-bounded'; readonly engine: Checker; readonly constants: Constants; readonly at: string }
  /** Z3 `unsat` of `Init ⇒ Inv` and of the inductive step, the parameter an uninterpreted sort. */
  | { readonly kind: 'smt-inductive-param'; readonly solver: Checker; readonly parameter: string; readonly premise: 'sat' | 'unsat' | 'not-run'; readonly rlimit?: number }
  /** Lean: the comparator accepts and every axiom is standard. `checkers` is the count under `--paranoid`. */
  | { readonly kind: 'lean-accepted'; readonly lean: Checker; readonly axioms: readonly string[]; readonly checkers?: number }
  /** Lean: `sorryAx` among the axioms. */
  | { readonly kind: 'lean-sorry'; readonly lean: Checker; readonly lemmas: readonly string[]; readonly count: number }
  /** Lean: a custom axiom among the axioms. */
  | { readonly kind: 'lean-custom-axiom'; readonly lean: Checker; readonly axioms: readonly string[] }
  /** Lean: a `_native` axiom (native_decide or bv_decide). */
  | { readonly kind: 'lean-native'; readonly lean: Checker; readonly nativeAxioms: readonly string[] }
  /** Lean: the comparator reports a statement or a constant mismatch; `line` is the comparator's line verbatim. */
  | { readonly kind: 'lean-mismatch'; readonly lean: Checker; readonly mismatch: 'statement' | 'constant'; readonly line: string }
  /** Lean: the sandbox failed (a `bwrap:` line) or a checker was killed (exit 137 or 143). */
  | { readonly kind: 'lean-tool-error'; readonly lean: Checker; readonly line?: string; readonly exitCode?: number }
  /** Lean: a checker rejects the solution, by a line of the closed list (an axiom that is not permitted among them). */
  | { readonly kind: 'lean-rejected'; readonly lean: Checker; readonly line: string }
  /**
   * Lean: neither an acceptance nor a rejection (spine section 9.6: "an acceptance needs exit 0 with an accept line and
   * no error line, and anything else is no verdict"): an error line outside the closed list, or a non-zero exit.
   */
  | { readonly kind: 'lean-no-verdict'; readonly lean: Checker; readonly line?: string; readonly exitCode?: number }
  /** Differential testing with no divergence. */
  | { readonly kind: 'differential'; readonly n: number; readonly statistics: string; readonly engines: readonly Checker[] }
  /** A shadow or gold mismatch. */
  | { readonly kind: 'shadow-mismatch'; readonly sides: readonly [string, string]; readonly detail: string }
  /** "Results match" on one database. */
  | { readonly kind: 'one-database'; readonly engine: Checker }
  /** Trace validation: accepted traces count; rejected ones are witnesses; partial and error count for nothing. */
  | {
      readonly kind: 'trace-validation'
      readonly engine: Checker
      readonly accepted: number
      readonly rejected: readonly { readonly trace: string; readonly firstNonConformingLine: number }[]
      readonly partial: number
      readonly error: number
      /** Finite traces cannot test eventuality: a liveness claim keeps its correspondence [A]. */
      readonly property: 'safety' | 'liveness'
    }
  /** A setting read back from the system. */
  | { readonly kind: 'setting-read-back'; readonly setting: string; readonly source: string; readonly at: string }
  /** A runtime check or constraint in place. */
  | { readonly kind: 'runtime-check'; readonly where: string }
  /** A language model says "equivalent" or "proved". */
  | { readonly kind: 'model-assertion'; readonly text: string; readonly by: string }
  /** A Clearinghouse rule stays quiet over n world calls. */
  | { readonly kind: 'clearinghouse-quiet'; readonly rule: string; readonly calls: number }
  /** A Clearinghouse rule fires. */
  | { readonly kind: 'clearinghouse-fires'; readonly rule: string; readonly witness: WitnessLength; readonly replay: Replay }
  /** A course-authored claim under audit in the Clearinghouse. */
  | { readonly kind: 'course-claim-under-audit'; readonly text: string }
  /** I7: a pinned statement's hash no longer matches. */
  | { readonly kind: 'statement-hash-changed'; readonly path: string }
  /** I8: an agent's assertion. */
  | { readonly kind: 'agent-assertion'; readonly text: string; readonly by?: string }
  /** I10: one of the course's own graders: n items, how many passed, and the interval it prints. */
  | { readonly kind: 'grader'; readonly n: number; readonly passed?: number; readonly unit: string; readonly interval?: readonly [number, number] }
  /** A self-grade. */
  | { readonly kind: 'self-grade'; readonly what?: string }
  /** An assumption the learner states, or a seam it plants. */
  | { readonly kind: 'assumption'; readonly why: string }
  /** What is outside the model. */
  | { readonly kind: 'not-covered'; readonly what: string }
  /** Requirement scenarios: n held, or one the theorem permits and the requirement forbids. */
  | { readonly kind: 'requirement-scenarios'; readonly n: number; readonly counterexample?: string }
