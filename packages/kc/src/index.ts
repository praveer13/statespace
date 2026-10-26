// @statespace/kc: the KC graph v0 (spine section 4) as data and code. GRAPH is the course's graph, generated from
// content/kc/graph.yaml; the queries take a graph explicitly, so tests and tools can pass another. The checks of
// GATE-kc (check.ts) are pure too; scripts/verify-kc.mjs reads the files and prints the report.

export { GRAPH } from './graph.generated.ts'
export type {
  ArtifactSubstitute,
  ArtifactUse,
  Bank,
  ConfusableSet,
  DrawerId,
  FadingFamily,
  GenId,
  Kc,
  KcGraph,
  KcId,
  LabStage,
  LabStageId,
  LessonId,
  PendingCrossing,
  Problem,
  ReferenceModule,
  SoftEdgeSubstitute,
  StageId,
  Tool,
} from './types.ts'
export { GRAPH_PATH, GRAPH_SCHEMA, isKcId, loadGraph, stageOfKc, stageOfUnit } from './load.ts'
export {
  blockingRequirements,
  canCredit,
  confusableSetsOf,
  creditOrder,
  fadingFamilyOf,
  findCycle,
  firstContactIn,
  indexGraph,
  isThreshold,
  kcById,
  kcsFirstTaughtIn,
  kcsOfStage,
  labStageById,
  prerequisitesOf,
  requirementsOf,
  topologicalOrder,
} from './graph.ts'
export type { KcIndex } from './graph.ts'
export { BUDGET_PATH, expandSelector, resolvePaths } from './paths.ts'
export type { LabStageRow, LessonRow, PathUnit, PublishedPath } from './paths.ts'
export { readPage, TAG_KEYS, tagsOf, unitsOfRecord } from './content.ts'
export type { Page, PageCall, PageItem, PageSegment, RecordKind, Role, TaggedUnit } from './content.ts'
export { readSpineFacts, SPINE_PATH } from './spine.ts'
export type { MdBlock, MdHeading, MdRow, MdTable, MdText, SpineFacts, SpineFamily, SpineJump, SpineKc, SpineSet } from './spine.ts'
export { GENERATED_PATH, generateModule } from './generate.ts'
export { checkKc, KC_MAX, KC_MIN, MIN_ISOMORPHS, stagesOfCell, usedInNames } from './check.ts'
export type { Finding, KcInputs, KcReport, Level, RegistryEntry } from './check.ts'
