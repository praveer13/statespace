// One schedule card per KC (M-today; ASSESSMENT.md sections 3.1 and 3.10; EVIDENCE.md section 5). FSRS-6 through the
// vendored kernelspace module at a target retention inside the spine's 0.85 to 0.90, fed by graded events as section 3.10
// rates them, with the dose floor of section 3.1 overriding FSRS whenever FSRS would wait longer: in its first 60 days a
// KC is offered at about 1-3, 7, 21 and 45-60 days after first learning, and at least 8 graded opportunities in all.
//
// A card is never "late". Its `due` is the first local day it is offered; from then on it is simply available, and a
// window the learner was away for is not carried forward as debt (DESIGN.md section 6.11; EVIDENCE.md section 4, rows 6
// and 7). Pure: the caller passes the day.

import type { LedgerEvent } from '@statespace/ledger'
import { addDays, daysBetween } from '@statespace/ledger'
import { intervalDays, nextMemory, retrievability } from '../../../../vendor/kernelspace/src/lib/learner/fsrs.ts'
import type { MemoryState } from './kernelspace-types.ts'
import { foldOrder, isFullWeight, kcOfEvent, ratingOf } from './evidence.ts'

/** The retention Today schedules for: inside the spine's 0.85 to 0.90 (section 4.1) [D]. */
export const TARGET_RETENTION = 0.88

/** The dose-floor windows, in days after first learning: about 1-3, 7, 21 and 45-60 (EVIDENCE.md section 5) [D for the edges]. */
export const DOSE_WINDOWS: readonly (readonly [number, number])[] = [
  [1, 3],
  [6, 10],
  [19, 26],
  [45, 60],
]

/** The dose floor's horizon and count: at least 8 graded opportunities in the first 60 days. */
export const DOSE_DAYS = 60
export const DOSE_OPPORTUNITIES = 8
/** While a KC is short of its 8 opportunities inside the 60 days, no gap is longer than this [D]. */
export const DOSE_MAX_GAP = 7

export interface KcCard {
  readonly kc: string
  /** The local day of first learning. */
  readonly introduced: string
  /** FSRS memory after the last graded event, or null before any. */
  readonly memory: MemoryState | null
  /** The local day of the last graded event on the KC, or null. */
  readonly last: string | null
  /** The first local day the KC is offered. */
  readonly due: string
  /** What set `due`: the first offer after learning, the dose floor, or FSRS maintenance. */
  readonly why: 'first' | 'dose' | 'fsrs'
  /** Graded opportunities in the first 60 days so far. */
  readonly opportunities: number
  /** All graded events on the KC. */
  readonly reviews: number
  /** Whether the last graded event was right, or null before any. */
  readonly lastOk: boolean | null
}

export interface CardsInput {
  readonly events: readonly LedgerEvent[]
  /** The local day each KC was first learned (its first lesson touched); a KC with graded events and none uses its first. */
  readonly introduced: ReadonlyMap<string, string>
  readonly retention?: number
}

/** The schedule cards of every introduced KC, by KC. */
export function deriveCards(input: CardsInput): Map<string, KcCard> {
  const retention = input.retention ?? TARGET_RETENTION
  const byKc = new Map<string, LedgerEvent[]>()
  for (const e of [...input.events].sort(foldOrder)) {
    const kc = kcOfEvent(e)
    if (kc === undefined || ratingOf(e) === null) continue
    const list = byKc.get(kc)
    if (list === undefined) byKc.set(kc, [e])
    else list.push(e)
  }
  const kcs = new Set<string>([...input.introduced.keys(), ...byKc.keys()])
  const out = new Map<string, KcCard>()
  for (const kc of kcs) {
    const graded = byKc.get(kc) ?? []
    const introduced = minDay(input.introduced.get(kc), graded[0]?.day)
    if (introduced === undefined) continue
    out.set(kc, cardOf(kc, introduced, graded, retention))
  }
  return out
}

const minDay = (a: string | undefined, b: string | undefined): string | undefined => (a === undefined ? b : b === undefined ? a : a < b ? a : b)

function cardOf(kc: string, introduced: string, graded: readonly LedgerEvent[], retention: number): KcCard {
  let memory: MemoryState | null = null
  let last: string | null = null
  let fsrsDue: string | null = null
  let lastOk: boolean | null = null
  let opportunities = 0
  for (const e of graded) {
    const g = ratingOf(e)
    if (g === null) continue
    const t = last === null ? 0 : Math.max(0, daysBetween(last, e.day))
    const m: MemoryState = nextMemory(memory, t, g)
    memory = m
    const next = addDays(e.day, intervalDays(m.stability, retention))
    const prev = fsrsDue as string | null
    // A low-weight event can bring a review closer and never push it later (section 3.10).
    fsrsDue = !isFullWeight(e) && prev !== null && prev < next && g !== 1 ? prev : next
    last = e.day
    lastOk = e.ok === true
    if (daysBetween(introduced, e.day) <= DOSE_DAYS) opportunities += 1
  }
  const dose = doseDue(introduced, graded, opportunities, last)
  let due: string
  let why: KcCard['why']
  if (fsrsDue === null) {
    due = addDays(introduced, DOSE_WINDOWS[0]![0])
    why = 'first'
  } else if (dose !== null && dose < fsrsDue) {
    due = dose
    why = 'dose'
  } else {
    due = fsrsDue
    why = 'fsrs'
  }
  // One offer a day: a KC answered on a day is next offered the day after at the soonest.
  if (last !== null && due <= last) due = addDays(last, 1)
  return { kc, introduced, memory, last, due, why, opportunities, reviews: graded.length, lastOk }
}

/**
 * The dose floor's next day, or null once it no longer applies: the start of the first window not yet served whose end
 * is still ahead of the last review (a window the learner was away for is passed over, never owed); while the KC is short
 * of 8 opportunities inside its first 60 days, no later than DOSE_MAX_GAP days after the last review.
 */
function doseDue(introduced: string, graded: readonly LedgerEvent[], opportunities: number, last: string | null): string | null {
  const offsets = graded.map((e) => daysBetween(introduced, e.day))
  const lastOffset = last === null ? 0 : daysBetween(introduced, last)
  let next: number | null = null
  for (const [lo, hi] of DOSE_WINDOWS) {
    const served = offsets.some((o) => o >= lo && o <= hi)
    if (served || hi <= lastOffset) continue
    next = Math.max(lo, lastOffset + 1)
    break
  }
  if (opportunities < DOSE_OPPORTUNITIES && lastOffset < DOSE_DAYS) {
    const cap = Math.min(lastOffset + DOSE_MAX_GAP, DOSE_DAYS)
    next = next === null ? cap : Math.min(next, cap)
  }
  return next === null ? null : addDays(introduced, next)
}

/** The probability of recall today, from the card's memory: 1 before any review (nothing to forget yet). */
export function recallOf(card: KcCard, today: string): number {
  if (card.memory === null || card.last === null) return 1
  return retrievability(Math.max(0, daysBetween(card.last, today)), card.memory.stability)
}

/** True when the card is offered on `today`. */
export const isDue = (card: KcCard, today: string): boolean => card.due <= today
