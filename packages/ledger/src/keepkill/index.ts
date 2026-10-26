// @statespace/ledger/keepkill: the keep/kill machinery the event log carries (spine section 12, item 58;
// content/governance/keepkill-rules.yaml, hashed in RUN-keepkill-rules): the allocation, entry and read
// functions, the arm records mechanics write, and the estimates and decisions. Pure TypeScript.

export { allocate, allocationKey, allocationValue, armOf, firstWindowArm, fmix32, hash32, isUint32, windowArm } from './allocate.ts'
export type { UnitAllocation } from './allocate.ts'
export { ARM_DATA_KEY, armData, armRecordFor, armRecordsOf } from './arm-record.ts'
export type { ArmRecord } from './arm-record.ts'
export { entriesOf, entryOf } from './entry.ts'
export type { Entry, EntryContext, NeverReason } from './entry.ts'
export { firstLearning, firstSolid, isGraded, isPracticeItem, outcomeEvent, placementCredited, sessionsOf } from './facts.ts'
export type { KeepKillContent, Session } from './facts.ts'
export { READ_ENGINE, READ_ID_DIGEST_HEX, READ_VERSION, readComparison, readRecordId, recordOf } from './read.ts'
export type { ArmFigures, ReadInput, ReadOutcome, ReadResult, UnitRow, WindowRow } from './read.ts'
export { isUnit, KC_COMPARISON_LIST, kcComparison, PARAMETERS, PROOF_BLOCKS, RULES_PATH, RULES_SHA256, RULES_VERSION, unitsOf, WINDOWS } from './rules.ts'
export type { ComparisonId, KcComparison, Parameters, WindowComparison } from './rules.ts'
export { decideCommon, decideNote, decideWindows, leadsByAtLeast, newcombe, orderingChance, wilson, Z } from './stats.ts'
export type { CommonDecision, CommonInput, DecisionParameters, Interval, NoteInput, Phase, WindowParameters, WindowsInput } from './stats.ts'
export { countedWeeks, daysOf, weekStartOf, windowBeforeDraw, windowsOf } from './windows.ts'
export type { DeclaredBreak, Window, WindowInput } from './windows.ts'
