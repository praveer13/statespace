// The KC graph's types (spine section 4; ARCHITECTURE.md section 17.3). The source of the data is
// content/kc/graph.yaml; load.ts validates it into these shapes and graph.generated.ts holds the result.

export type KcId = `KC-${number}.${string}`
export type StageId = `S${number}`
export type LessonId = `S${number}.L${number}`
export type LabStageId = `LAB-${number}.${number}`
export type GenId = `GEN-${string}`
export type DrawerId = `D-${string}`

/** A knowledge component: one row of the spine's section 4 table, plus what GATE-kc needs beside it. */
export interface Kc {
  readonly id: KcId
  /** The spine's Name cell, verbatim. */
  readonly name: string
  readonly stage: StageId
  readonly threshold: boolean
  /** Hard `requires` edges: each target must be first taught no later than this KC on every published path. */
  readonly requires: readonly KcId[]
  /** Soft `requires` edges ("(soft)" in the spine): a published path may cross one if it names a substitute. */
  readonly requiresSoft: readonly KcId[]
  /** The spine's "Confusable with" cell. */
  readonly confusable: readonly KcId[]
  /** The first lesson or step briefing, in roadmap order, whose spine row lists this KC (first-contact tags exempt). */
  readonly firstTaught: LessonId
  /** The generator families whose items are tagged with this KC (its item sources). */
  readonly families: readonly GenId[]
  /** A bank of authored isomorphs, the alternative item source for a KC no generator serves. */
  readonly bank: Bank | null
}

export interface Bank {
  /** How many authored isomorphs the bank holds; a threshold KC needs at least four. */
  readonly isomorphs: number
  /** Where the isomorphs live. */
  readonly source: string
}

/** A confusable set for interleaving (M-which-is-it): spine section 4, "Confusable sets for interleaving". */
export interface ConfusableSet {
  /** A to H. */
  readonly id: string
  /** The short name after the letter ("which stamp"). */
  readonly name: string
  /** The "Discriminate between" cell. */
  readonly discriminate: string
  readonly kcs: readonly KcId[]
  /** Set C also interleaves the audit families (the gap classes), which are not KCs. */
  readonly auditFamilies: boolean
  /** The stage in which the set opens. */
  readonly opens: StageId
  /** The rest of the Opens cell, when it says more than the stage. */
  readonly opensNote: string | null
}

/** A fading family (spine section 4, "Fading families"): worked examples to transfer on one KC. */
export interface FadingFamily {
  /** F1 to F6. */
  readonly id: string
  readonly name: string
  readonly kc: KcId
}

/** A lab stage and the dependencies GATE-kc's path checks read. */
export interface LabStage {
  readonly id: LabStageId
  /** The KCs the stage's checks exercise: their KC tags. Each must be taught before the stage on every path,
   *  unless the stage is first contact. */
  readonly kcs: readonly KcId[]
  /** A two-minute win that runs the course's reference before the lesson that teaches its KCs: exposure, so its
   *  tags are exempt from the order rule (as Boot's call is). */
  readonly firstContact: boolean
  /** The earlier lab stages whose artifacts this stage consumes (the lab-artifact dependencies). */
  readonly uses: readonly ArtifactUse[]
  /** The tools whose first use on a path needs their drawer (spine section 3.0's D-14 and D-15). */
  readonly tools: readonly string[]
  readonly stretch: boolean
  /** A [stretch] stage only: the unit it follows on every path (stretch stages are in no budget sequence). */
  readonly after: string | null
}

/** An artifact a lab stage or a lesson consumes: what the named lab stage builds. */
export interface ArtifactUse {
  readonly stage: LabStageId
  /** What is consumed, in a few words. */
  readonly artifact: string
}

/** A tool a lab stage needs set up: Lane A's kit or the Bench devcontainer. */
export interface Tool {
  readonly id: string
  readonly what: string
  /** The drawer read at the tool's first use on any path. */
  readonly drawer: DrawerId
}

/** A course module that stands in for a learner artifact on a path that reaches a stage before the artifact. */
export interface ReferenceModule {
  readonly id: string
  readonly what: string
  /** The label the module carries wherever it stands in. */
  readonly label: string
}

/** A soft edge that a published path crosses, and the drawer that stands in for the missing lesson. */
export interface SoftEdgeSubstitute {
  readonly path: string
  readonly from: KcId
  readonly to: KcId
  readonly substitute: DrawerId
}

/** A lab-artifact dependency that a published path crosses, and the reference module that stands in. */
export interface ArtifactSubstitute {
  readonly path: string
  /** The lab stage (its `uses`) or the lesson (its `lessonUses`) that consumes the artifact. */
  readonly unit: LabStageId | LessonId
  readonly uses: LabStageId
  readonly substitute: string
}

/**
 * A crossing that spine section 3.0's table does not substitute yet: GATE-kc reports it as a warning that names the
 * owner decision it waits on, instead of failing the path, so the gap stays plain until the decision lands.
 */
export interface PendingCrossing {
  readonly path: string
  /** A soft edge (`from` is the dependent KC, `to` the required one) or an artifact use (`from` is the lab stage or
   *  lesson that consumes it, `to` the lab stage that builds it). */
  readonly kind: 'soft-edge' | 'artifact'
  readonly from: string
  readonly to: string
  /** The owner decision the crossing waits on, in words. */
  readonly decision: string
}

export interface KcGraph {
  readonly schema: 'statespace/kc-graph@1'
  /** Lessons whose tag on a KC is first contact (spine section 12 item 33): Boot's call. */
  readonly firstContact: Readonly<Record<string, readonly KcId[]>>
  readonly kcs: readonly Kc[]
  readonly confusableSets: readonly ConfusableSet[]
  readonly fadingFamilies: readonly FadingFamily[]
  readonly labStages: readonly LabStage[]
  /** The lab artifacts a lesson applies (the stage specs), by lesson: each lab stage comes before the lesson on every
   *  published path, unless a substitute stands in or the crossing is pending. */
  readonly lessonUses: Readonly<Record<string, readonly ArtifactUse[]>>
  readonly tools: readonly Tool[]
  readonly referenceModules: readonly ReferenceModule[]
  readonly substitutes: {
    readonly softEdges: readonly SoftEdgeSubstitute[]
    readonly artifacts: readonly ArtifactSubstitute[]
  }
  readonly pendingCrossings: readonly PendingCrossing[]
}

/** One problem a loader or a check found. `where` is a file, optionally with a line (`path:12`). */
export interface Problem {
  readonly message: string
  readonly where: string | null
}
