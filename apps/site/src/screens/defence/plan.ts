// Each stage's Defence as the spine's Defence lines set it (spine sections 3.1 to 3.10; ASSESSMENT.md section 6):
// Part A's families and size, Part B's size and, for a lab whose content carries no Prove-it list, the mutations the
// line names; Part D's prompt and the three ideas of its self-check, each tied to the KC Part A compares it with.
// The authored Defence content (content/stages/S{n}/defence.yaml, W2-T13 and its siblings) replaces this file's data
// when it lands.

export interface AuthoredMutant {
  readonly id: string
  readonly what: string
  readonly question?: string
  readonly stage?: string
}

export interface Idea {
  readonly text: string
  readonly kc: string
}

export interface StagePlan {
  readonly stage: string
  /** Part A's families, in the order the spine's line names them. */
  readonly families: readonly string[]
  /** Part A's item count: 10 or 12. */
  readonly aSize: number
  /** Part B's mutant count: 4 to 6. */
  readonly bSize: number
  /** Mutations for a lab whose content holds no Prove-it list. */
  readonly mutants?: readonly AuthoredMutant[]
  /** Part D: what to explain back, aloud. */
  readonly explain: string
  readonly ideas: readonly [Idea, Idea, Idea]
}

const P = (stage: string, p: Omit<StagePlan, 'stage'>): StagePlan => ({ stage, ...p })

export const PLANS: Readonly<Record<string, StagePlan>> = {
  S1: P('S1', {
    families: ['GEN-negate-it', 'GEN-find-the-witness', 'GEN-call-it', 'GEN-which-stamp'],
    aSize: 10,
    bSize: 4,
    explain: 'Why searching for a violation means asserting the negation.',
    ideas: [
      { text: 'A model of the negated property is a violation, and no model means none exists in this encoding.', kc: 'KC-1.violation-as-sat' },
      { text: '`sat`, `unsat` and `unknown` are three different answers, and `unknown` is no verdict.', kc: 'KC-1.three-answers' },
      { text: 'The answer is about the encoding: change the arithmetic or a premise and the claim changes with it.', kc: 'KC-1.encoding-is-the-claim' },
    ],
  }),
  S2: P('S2', {
    families: ['GEN-proof-structure', 'GEN-which-stamp', 'GEN-call-it'],
    aSize: 12,
    bSize: 5,
    explain: 'The induction in `run_conserves`, without reciting tactics.',
    ideas: [
      { text: 'Induction on the list of transfers: the base case is the empty run, the step adds one transfer.', kc: 'KC-2.induction-principle' },
      { text: 'The hypothesis has to hold for every starting state, which is why the proof generalizes `s`.', kc: 'KC-2.generalized-ih' },
      { text: 'Kernel acceptance says the proof checks against the statement; it does not say the statement is the requirement.', kc: 'KC-2.kernel-not-requirement' },
    ],
  }),
  S3: P('S3', {
    families: ['GEN-find-the-witness', 'GEN-proof-structure', 'GEN-call-it'],
    aSize: 12,
    bSize: 5,
    mutants: [
      { id: 'amounts-nat', what: 'Amounts become `Nat` instead of `Int`.', stage: 'LAB-3.3' },
      { id: 'drop-resource-rule', what: 'Drop the resource-assignment rule from the typing judgment.', stage: 'LAB-3.5' },
      { id: 'reverse-guard', what: 'Reverse one guard in the evaluator.', stage: 'LAB-3.3' },
      { id: 'force-move-typechecks', what: 'Let `force move` type-check.', stage: 'LAB-3.5' },
      { id: 'stricter-typecheck', what: 'A stricter typecheck under which the statement still holds.', stage: 'LAB-3.5' },
    ],
    explain: 'What progress and preservation buy, and what they do not.',
    ideas: [
      { text: 'Progress: a well-typed program is done, steps, or ends in an explicit error; it is never stuck.', kc: 'KC-3.small-step-stuck' },
      { text: 'Preservation: a step keeps the program well typed, so the guarantee lasts the whole run.', kc: 'KC-3.progress-preservation-scope' },
      { text: 'Neither says the semantics is the right one: the edge cases are decisions you made.', kc: 'KC-3.edge-cases-as-decisions' },
    ],
  }),
  S4: P('S4', {
    families: ['GEN-wp-it', 'GEN-negate-it', 'GEN-cti-or-bug', 'GEN-which-stamp'],
    aSize: 12,
    bSize: 4,
    explain: 'Why a satisfiable inductive step is not yet a bug.',
    ideas: [
      { text: 'A model of the step is a state the invariant admits; it may be unreachable from Init.', kc: 'KC-4.invariant-vs-inductive' },
      { text: 'An unreachable one is a counterexample to induction: strengthen the invariant, not the code.', kc: 'KC-4.cti-or-bug' },
      { text: 'A reachable one is a bug, and its witness replays from Init.', kc: 'KC-4.trust-stack' },
    ],
  }),
  S5: P('S5', {
    families: ['GEN-trace-allowed', 'GEN-lasso-or-not', 'GEN-call-it', 'GEN-which-stamp'],
    aSize: 12,
    bSize: 4,
    explain: 'Safety versus liveness for holds.',
    ideas: [
      { text: '"A hold never resolves twice" is safety: a finite prefix shows a violation.', kc: 'KC-5.safety-vs-liveness' },
      { text: '"A hold eventually resolves" is liveness: only a lasso shows a violation, and fairness decides which lassos count.', kc: 'KC-5.fairness' },
      { text: 'A bounded exploration is a model check of those constants, not a proof for every state space.', kc: 'KC-5.bounded-scope' },
    ],
  }),
  S6: P('S6', {
    families: ['GEN-anomaly-id', 'GEN-call-it', 'GEN-which-stamp', 'GEN-find-the-witness'],
    aSize: 12,
    bSize: 4,
    explain: 'R(S, D) and what one simulation step checks.',
    ideas: [
      { text: 'R relates a semantic state to a database state, and each command must preserve it.', kc: 'KC-6.refinement-relation' },
      { text: 'Differential tests sample commands; they establish agreement on those runs only.', kc: 'KC-6.differential-testing' },
      { text: 'Isolation anomalies are outside one step: the database is an assumption with a level.', kc: 'KC-6.anomaly-isolation' },
    ],
  }),
  S7: P('S7', {
    families: ['GEN-spec-it', 'GEN-leaks-to-observer', 'GEN-call-it'],
    aSize: 12,
    bSize: 4,
    explain: 'Enforcement versus noninterference.',
    ideas: [
      { text: 'Enforcement says each query is allowed; it is a property of single runs.', kc: 'KC-7.enforcement-vs-ni' },
      { text: 'Noninterference compares two runs the observer cannot tell apart, so it needs an observer and a relation.', kc: 'KC-7.observer-equivalence' },
      { text: 'What is declassified on purpose is named, and the blanket claim is false without it.', kc: 'KC-7.declassification' },
    ],
  }),
  S8: P('S8', {
    families: ['GEN-find-the-witness', 'GEN-trace-allowed', 'GEN-lasso-or-not', 'GEN-which-stamp'],
    aSize: 12,
    bSize: 4,
    explain: 'Every crash window.',
    ideas: [
      { text: 'A commit is not a send: between them a crash leaves an intent no one has acted on.', kc: 'KC-8.commit-not-send' },
      { text: 'Retries make delivery at least once, so a call can happen twice.', kc: 'KC-8.at-least-once' },
      { text: "A stable key makes the duplicate harmless only while the provider honors it, which is an assumption.", kc: 'KC-8.idempotency-keys' },
    ],
  }),
  S9: P('S9', {
    families: ['GEN-proof-structure', 'GEN-find-the-witness', 'GEN-which-stamp', 'GEN-leaks-to-observer'],
    aSize: 10,
    bSize: 4,
    explain: 'The refinement relation, its abstraction boundaries, and what in the executable system stays unverified.',
    ideas: [
      { text: 'Forward simulation: each source step is matched by target steps that keep the relation.', kc: 'KC-9.forward-simulation' },
      { text: 'Translation validation checks this compilation, not the compiler.', kc: 'KC-9.translation-validation' },
      { text: 'The trusted base is what the proof assumes: the kernel, the runtime, the database.', kc: 'KC-9.tcb' },
    ],
  }),
  S10: P('S10', {
    families: ['GEN-negate-it', 'GEN-proof-structure', 'GEN-trace-allowed', 'GEN-anomaly-id', 'GEN-leaks-to-observer', 'GEN-which-stamp', 'GEN-call-it'],
    aSize: 12,
    bSize: 6,
    explain: 'What your report establishes, and what it does not.',
    ideas: [
      { text: 'Each claim in the report carries its method, tool and version, and its stamp says no more than the run did.', kc: 'KC-10.claim-graph-report' },
      { text: 'The defeater log keeps the doubts that are open beside the claims they attack.', kc: 'KC-10.defeater-log' },
      { text: 'The limitations section names what no check covers.', kc: 'KC-10.publish-limitations' },
    ],
  }),
}

export const planOf = (stage: string): StagePlan | undefined => PLANS[stage]

/** The stage's volume ink. */
export const stageInk = (stage: string): string => `var(--vol-${stage.slice(1)})`
