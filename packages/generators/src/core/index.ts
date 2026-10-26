// @statespace/generators/core: the generator framework (W1-T21). See README.md beside this file.
//
// Pure: no DOM, storage or network.

export type {
  Band,
  BandSpec,
  ChoiceKey,
  ChoiceOption,
  ChoicePart,
  ConstructedPart,
  Discard,
  Distinction,
  GenId,
  Generator,
  Grade,
  InstanceBase,
  ItemAnswer,
  ItemPart,
  ItemView,
  Json,
  KcId,
  KcTags,
  KeyBase,
  Measure,
  MisconceptionKey,
  Mode,
  Origin,
  PendingEngine,
  SampleAnswer,
  TemplateId,
  TemplateSpec,
  TrueFalseKey,
  TrueFalsePart,
  TrueFalseStatement,
  Ungraded,
  WitnessClass,
} from './types.ts'
export { BANDS, TEMPLATE_IDS } from './types.ts'

export type { Answer, Budget, BusEngineId, EngineName, EnginePort, InstrumentReply, InstrumentRequest, RawVerdict } from './port.ts'
export { ask, BUDGET_STOPS, engineAtVersion, errorCodeOf } from './port.ts'

export type { SeedHalf } from './seed.ts'
export { callRef, DISPLAY_BIT, formatSeed, gradedSeed, halfOf, inHalf, instanceEventFields, instanceRef, itemRef, parseInstanceRef, parseSeed, seedSequence, successor } from './seed.ts'

export type { DiscardCause, DiscardOf, PendingTemplate } from './define.ts'
export {
  defineGenerator,
  definitionProblems,
  discard,
  discardCause,
  ENGINE_NAME,
  GEN_ID,
  GeneratorDefinitionError,
  isBand,
  isDiscard,
  isPending,
  KC_ID,
  liveTemplateOf,
  liveTemplates,
  MAX_TEMPLATES,
  MIN_TEMPLATES,
  MISCONCEPTION_KEY,
  PendingTemplateError,
  pendingTemplates,
  TASK_ID,
  templateOf,
} from './define.ts'

export type { DiscardRecord, DrawOutcome, DrawRequest } from './draw.ts'
export { assertInstance, DEFAULT_MAX_DRAWS, drawInstance } from './draw.ts'

export type { AssembledOptions, ConfirmResult, DistinguishResult, Mutant } from './distractors.ts'
export { assembleOptions, categoricalDistinctions, certifyChoice, distinctionOf, matchMisconception, optionLetters } from './distractors.ts'

export type { GradeContext, PartGrade } from './grade.ts'
export { chanceOf, combineParts, gradeChoicePart, gradeItem, gradeTrueFalsePart, ungradedGrade, ungradedPart } from './grade.ts'

export { COPY } from './copy.ts'

export type { ArmContext, ArmItem, ArmReading, ArmRecord, KeepKillContent, MechanicComparison, NoArm } from './keepkill.ts'
export { armRecord, CLASS_COMPARISON, NOTE_COMPARISON, readArm } from './keepkill.ts'

export type { FeedbackContext, Layer1, Layer2, Layer2Reason, Layer3, LayeredFeedback, Treatment } from './feedback.ts'
export { layeredFeedback } from './feedback.ts'

export type { ClassHintInput, ClassHintPlan, ClassHintStep } from './class-hint.ts'
export { CLASS_ARMS, classHintPlan, fixKillsClass } from './class-hint.ts'

export type { WhichIsItInput, WhichIsItItem, WhichIsItPlan, WhichIsItSet } from './which-is-it.ts'
export { checkWhichIsIt, eligibleSets, planWhichIsIt, templatesByPrimaryKc, WHICH_IS_IT_MAX_SHARE, WHICH_IS_IT_MIN_ITEMS, whichIsItCap } from './which-is-it.ts'

export type { DeterminismRecord, EngineDigest, FamilyDigest, SampleSpec } from './digest.ts'
export { BROWSER_ENGINES, cellOf, CORE_REV, DEFAULT_SAMPLE, DETERMINISM_SCHEMA, determinismProblems, familyDigest, sampleSeeds } from './digest.ts'

export type { CheckId, CheckOptions, FamilyReport, FamilyStats, Finding, PendingNote, RegistryView } from './checks.ts'
export { budgetPort, CHECK_IDS, checkFamily, DEFAULT_KEY_SEEDS, genericSamples, unknownPort } from './checks.ts'
