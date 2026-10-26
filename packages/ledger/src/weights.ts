// Provenance and exposure weights, applied at read time and never stored (spine section 8.2; ARCHITECTURE.md
// section 7.3; ASSESSMENT.md section 2.4).
//
// | Provenance and exposure                          | Weight | Counts toward                         |
// | own · unseen · generated (fresh)                 | 1.0    | sign-off, settled, VRK30, Judgment    |
// | own · unseen, authored (first exposure)          | 1.0    | Judgment; scheduling                  |
// | own · seen (practice)                            | 0.3    | scheduling only                       |
// | assisted (past rung R2, or a context packet)     | 0.3    | scheduling only                       |
// | agent                                            | 0      | never evidence                        |
//
// automated is not a provenance (a flag on receipts and claims only), so it never weighs an event. Kinds
// that are not evidence (lab checks, receipt imports, explain-backs, notes, drawer views) weigh nothing.
// Which derivation reads which kind (a probe settles, an audit feeds Judgment) is the derivation's business;
// this module answers only how much an event may weigh and toward what.
//
// Pure: no DOM, storage or network.

import type { LedgerEvent } from './event.ts'
import { EVIDENCE_KINDS, UNCREDITED_KINDS } from './event.ts'

export type EvidenceTier = 'fresh' | 'authored' | 'practice' | 'assisted' | 'agent' | 'uncredited'
export type CountsToward = 'sign-off' | 'settled' | 'vrk30' | 'judgment' | 'scheduling'

export interface Weighing {
  readonly tier: EvidenceTier
  readonly weight: number
  readonly counts: readonly CountsToward[]
}

/** The spine's weights, as constants: one place, read by every derivation. */
export const WEIGHTS = {
  fresh: 1.0,
  authored: 1.0,
  practice: 0.3,
  assisted: 0.3,
  agent: 0,
  uncredited: 0,
} as const satisfies Record<EvidenceTier, number>

const COUNTS: Record<EvidenceTier, readonly CountsToward[]> = {
  // Fresh events also schedule (ASSESSMENT.md section 3.10 rates them Good, Hard or Again).
  fresh: ['sign-off', 'settled', 'vrk30', 'judgment', 'scheduling'],
  authored: ['judgment', 'scheduling'],
  practice: ['scheduling'],
  assisted: ['scheduling'],
  agent: [],
  uncredited: [],
}

/** True for a generated instance: a seed was drawn at grade time (absent for authored cells and audit anchors). */
export function isGenerated(e: Pick<LedgerEvent, 'kind' | 'seed'>): boolean {
  return EVIDENCE_KINDS.has(e.kind) && e.seed !== undefined
}

/** Fresh: own, unseen and generated (ASSESSMENT.md section 2.3). Only fresh events move sign-off, settled and VRK30. */
export function isFresh(e: Pick<LedgerEvent, 'kind' | 'seed' | 'provenance' | 'exposure'>): boolean {
  return e.provenance === 'own' && e.exposure === 'unseen' && isGenerated(e)
}

/** The tier, weight and uses of one event. */
export function weigh(e: Pick<LedgerEvent, 'kind' | 'seed' | 'provenance' | 'exposure'>): Weighing {
  const tier = tierOf(e)
  return { tier, weight: WEIGHTS[tier], counts: COUNTS[tier] }
}

function tierOf(e: Pick<LedgerEvent, 'kind' | 'seed' | 'provenance' | 'exposure'>): EvidenceTier {
  if (UNCREDITED_KINDS.has(e.kind)) return 'uncredited'
  if (e.provenance === 'agent') return 'agent'
  if (e.provenance === 'assisted') return 'assisted'
  if (e.exposure === 'seen') return 'practice'
  return isGenerated(e) ? 'fresh' : 'authored'
}
