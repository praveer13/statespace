// @statespace/learner/mirror: private calibration and VRK30 (M-call-it's record, M-mirror; spine section 8.5; ASSESSMENT.md
// section 5.6). Everything here is derived from the event log at read time and stores nothing (I2). See README.md.
//
// Pure: no DOM, storage or network.

export { ACTIVE_MONTH_DAYS, BANDS, CONFIDENCES, GUESS_CEILING, IMPUTED_SURE, IMPUTED_THINK, imputedConfidence, isConfidence, MIN_CALLS_PER_BAND, MIRROR_Z, payoffOf, signed, VRK30_DAYS } from './bands.ts'
export type { Band, Confidence } from './bands.ts'
export { binOf, BINS, chanceLine, chanceOf, isCallShape, MAX_OPTIONS, MAX_STATEMENTS, MIN_OFFERED, oneIn } from './shape.ts'
export type { Bin, CallShape } from './shape.ts'
export { callDataOf, callKey, firstCallOf, firstCalls, foldedEvents, identityOf, isCall, readCallData, refBody } from './calls.ts'
export type { CallData, CallIdentity } from './calls.ts'
export { planCall } from './plan.ts'
export type { CallDraft, CallPlan } from './plan.ts'
export { rateOf } from './stats.ts'
export type { Rate } from './stats.ts'
export { asKeepKill, deriveMirror, EXCLUSIONS, kcOfEvent, recordedKc } from './mirror.ts'
export type { BandView, BinView, Exclusion, MirrorContent, MirrorInput, MirrorView } from './mirror.ts'
export { activeMonthsOf, deriveVrk30 } from './vrk30.ts'
export type { Vrk30Input, Vrk30Kc, Vrk30View } from './vrk30.ts'
