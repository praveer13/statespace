// @statespace/stamps: stamps derived, never typed (spine sections 8.7 and 8.8; ARCHITECTURE.md section 8.5).
//
//   raw output ──parse.ts / receipt.ts / reply.ts──▶ RawOutput ──deriveStamp (§8.8)──▶ Derivation
//   Derivation ×3 ──buildStrip──▶ the three-segment claim strip (requirement-fit never [P])
//
// GATE-stamps (scripts/verify-stamps.mjs) runs the deriver on verdict lines drawn from executed runs, checks
// that the row table matches the spine, and lints the apps for stamps typed by hand, hue scope and line styles.

export { STAMP_CODES, STAMP_WORDS, STAMPS, TAG_CODES, LEARNER_STATES, BARE_STATUS_WORDS, specOf, wordOf, codeOf, isStampCode, isStampWord } from './vocabulary.ts'
export type { StampCode, StampWord, StampSpec, TagCode } from './vocabulary.ts'
export { LANE_BADGES, RECORDED_RUN_LABELS } from './types.ts'
export type { Lane, Stamp, Defeater, Derivation, NoStampReason, UnreviewedQuote, Witness, RowKey } from './types.ts'
export type { RawOutput, Checker, Constants, WitnessLength, Replay } from './raw.ts'
export { SPINE_ROWS, OTHER_RULES, ALL_ROWS, rowOf } from './rows.ts'
export type { VerdictRow, RawKind } from './rows.ts'
export { deriveStamp, stampOf, grammarProblems, looksLikeBound, namesCheckerAndVersion, StampGrammarError, ENCODING_UNVERIFIED } from './derive.ts'
export type { StampContext } from './derive.ts'
export { SEP, stampText, codeText, qualifierText, spokenName, parseStampText, fmtCount, fmtRlimit, constantsText, witnessText } from './format.ts'
export type { ParsedStamp } from './format.ts'
export {
  ParseError,
  isErrorLine,
  parseTlcConstants,
  parseTlcReport,
  rawFromTlc,
  traceWitness,
  parseSolverLines,
  rawFromSolver,
  parseLeanReport,
  rawFromLean,
  parseTraceRecord,
  rawFromTraces,
  STANDARD_AXIOMS,
} from './parse.ts'
export type { TlcReport, TlcContext, SolverLine, SolverLineOptions, SolverContext, LeanReport, LeanContext, TraceRecord, TraceInput } from './parse.ts'
export { deriveReceipt, checkerOf, directionOf, engineFamily } from './receipt.ts'
export type { ReceiptItem, ReceiptStamps, ReceiptOptions, EngineFamily } from './receipt.ts'
export { rawFromReply } from './reply.ts'
export type { EngineVerdict, ReplyLike, ReplyContext } from './reply.ts'
export { STRIP_SEGMENTS, SEGMENT_LABELS, buildStrip, stripSpokenName, provedInRequirement } from './strip.ts'
export type { Strip, StripCell, StripSegment, StripAssumption, StripInput, SegmentInput, StripResult } from './strip.ts'
