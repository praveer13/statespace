// @statespace/ledger: the browser's evidence log as pure code (ARCHITECTURE.md section 7; spine section 8.2).
// event@1 records and their validation, the canonical conflict rule, merge, fold and digest, the codec, the
// read-time provenance weights and the keep/kill experiment seed. The IndexedDB adapter with its outbox and
// cross-tab sync is apps/site/src/storage. The keep/kill allocation, entry and read functions are exported
// from @statespace/ledger/keepkill. Nothing here stores a status: learner state is derived at read time (I2).

export { canonicalClone, canonicalJson, checkStructure, compareCodePoints, JSON_LIMITS, LedgerError, parseJsonSafely } from './canonical.ts'
export type { Json, LedgerErrorCode } from './canonical.ts'
export { decodeEvent, decodeLog, encodeEvent, encodeLog, snapshotOf } from './codec.ts'
export type { DecodedLog, DecodeProblem, LogSnapshot } from './codec.ts'
export {
  createEvent,
  CURRENT_KIND_VERSION,
  EVENT_KINDS,
  EVIDENCE_KINDS,
  genOfRef,
  isLedgerEvent,
  itemContext,
  kcOfContext,
  normalizeEvent,
  normalizeExpSeedDraw,
  refPrefix,
  UNCREDITED_KINDS,
  validateEvent,
  validateExpSeedDraw,
} from './event.ts'
export type { EventEnv, EventInput, EventKind, Exposure, ExpSeedDraw, ItemContext, LedgerEvent, Provenance, ValidationIssue } from './event.ts'
export { canDrawExpSeed, createExpSeedDraw, drawFor, RULES_SHA256 } from './expseed.ts'
export type { DrawInput, DrawRefusal } from './expseed.ts'
export {
  compareDraws,
  compareFoldOrder,
  EMPTY_LOG,
  eventSetDigest,
  foldLog,
  governingDraw,
  logDigest,
  logFrom,
  mergeDraws,
  mergeLogs,
  orderedEvents,
  previewMerge,
  resolveConflict,
  sameLog,
  supersededDraws,
} from './log.ts'
export type { Log, LogInput, MergePreview } from './log.ts'
export { sha256Hex, utf8 } from './sha256.ts'
export {
  addDays,
  civilFromDays,
  compareInstants,
  compareKeys,
  dayFromNumber,
  dayNumber,
  daysBetween,
  daysFromCivil,
  instantKey,
  instantMs,
  localDayOf,
  localTimeOf,
  SECONDS_PER_DAY,
  shiftKey,
  stampTime,
  TZ_MAX,
  TZ_MIN,
  weekday,
} from './time.ts'
export type { InstantKey } from './time.ts'
export { isFresh, isGenerated, weigh, WEIGHTS } from './weights.ts'
export type { CountsToward, EvidenceTier, Weighing } from './weights.ts'
export { CRACK_SEGMENTS, FORECAST_OPTIONS, forecastRef, readErosions } from './erosion.ts'
export type { CrackSegment, ErosionReading, ErosionSpec, ErosionState, ErosionStatus, ForecastAnswer, SeamSpec, SeamState } from './erosion.ts'
