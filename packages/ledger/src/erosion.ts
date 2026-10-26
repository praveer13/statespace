// M-seam-erosion's firing rule, read from the practice log at read time (spine sections 5.3 and 5.4; I2: nothing is
// stored but the events). A seam is planted when the learner's record first touches one of its planting lessons. An
// erosion fires when both endpoints exist: the seam is planted and the cracking lesson has been met. On the builder's
// path the specimen came first, so the erosion fires the moment the seam is planted and its forecast asks which
// segment the specimen hits. A fired erosion stays fired until its forecast is answered (call:ER-k/forecast), and
// then the seam is cracked. Held seams (fate "held") never crack and never block. "Oldest open erodible seam" is the
// planted, unheld, uncracked seam whose first planting event came earliest, ties broken by seam number; a
// Clearinghouse erosion (no cracking lesson) fires only when its seam is that seam and the learner has met the stage
// it waits for. The next erosion to show is the fired one on the oldest seam. Pure: no DOM, storage or clock.

import type { LedgerEvent } from '@statespace/schema'
import { instantMs } from './time.ts'

/** Where an erosion cracks: a strip segment, or the assumption record under one (spine section 5.4). */
export type CrackSegment = 'proposition' | 'correspondence' | 'requirement' | 'assumption'

export const CRACK_SEGMENTS: readonly CrackSegment[] = ['proposition', 'correspondence', 'requirement', 'assumption']

/** A forecast's options are lettered in CRACK_SEGMENTS order, so a Call It response { picked: 'B' } reads as correspondence. */
export const FORECAST_OPTIONS: readonly string[] = ['A', 'B', 'C', 'D']

export interface SeamSpec {
  readonly id: string
  /** The lessons whose events plant the seam. */
  readonly plantedIn: readonly string[]
  readonly fate: 'erodes' | 'held'
}

export interface ErosionSpec {
  readonly id: string
  readonly seam: string
  /** The lesson whose events bring the cracking specimen; null for a Clearinghouse erosion (ER-12). */
  readonly cashedIn: string | null
  /** For a Clearinghouse erosion: the stage the learner must have met first, such as S9. */
  readonly clearinghouseAfter?: string
  /** The segment spine section 5.4 says cracks: the forecast's key. */
  readonly segment: CrackSegment
}

export type ErosionStatus = 'dormant' | 'fired' | 'cracked'

export interface ForecastAnswer {
  readonly event: LedgerEvent
  readonly segment: CrackSegment | undefined
  /** Whether the call matched the key, as written when it was answered. */
  readonly matched: boolean | undefined
  readonly conf: LedgerEvent['conf']
}

export interface SeamState {
  readonly id: string
  readonly held: boolean
  /** When the record first touched a planting lesson, in ms; undefined while unplanted. */
  readonly plantedAt: number | undefined
  /** The erosion that cracked it, once its forecast is answered. */
  readonly crackedBy: string | undefined
  /** Planted, erodible and not cracked. */
  readonly open: boolean
}

export interface ErosionState {
  readonly id: string
  readonly seam: string
  readonly status: ErosionStatus
  readonly plantedAt: number | undefined
  /** When the second endpoint arrived, in ms. */
  readonly cashedAt: number | undefined
  /** The specimen came before the seam was planted (the builder's path). */
  readonly builders: boolean
  readonly forecast: ForecastAnswer | undefined
}

export interface ErosionReading {
  readonly seams: readonly SeamState[]
  readonly erosions: readonly ErosionState[]
  /** The oldest open erodible seam, if any. */
  readonly oldestOpen: string | undefined
  /** The fired erosion to show first: the one on the oldest seam. */
  readonly next: ErosionState | undefined
}

/** The ref an erosion's forecast is written under (schemas/event.schema.json). */
export const forecastRef = (erosion: string): string => `call:${erosion}/forecast`

const seamNumber = (id: string): number => Number(/(\d+)$/.exec(id)?.[1] ?? Number.MAX_SAFE_INTEGER)

const isSegment = (x: unknown): x is CrackSegment => typeof x === 'string' && (CRACK_SEGMENTS as readonly string[]).includes(x)

/** The first answer to an erosion's forecast; only the first call counts. */
function forecastOf(events: readonly LedgerEvent[], erosion: string): ForecastAnswer | undefined {
  const ref = forecastRef(erosion)
  const e = events.find((x) => x.kind === 'call' && x.ref === ref)
  if (e === undefined) return undefined
  const resp = (e.resp ?? {}) as Record<string, unknown>
  const picked = typeof resp.picked === 'string' ? FORECAST_OPTIONS.indexOf(resp.picked) : -1
  const segment = isSegment(resp.segment) ? resp.segment : picked >= 0 ? CRACK_SEGMENTS[picked] : undefined
  return { event: e, segment, matched: e.ok, conf: e.conf }
}

/**
 * Read the seams and erosions out of a log. `pageOf` names the lesson an event belongs to (S1.L3), or undefined;
 * the site passes its own reading of refs and item data.
 */
export function readErosions(
  seams: readonly SeamSpec[],
  erosions: readonly ErosionSpec[],
  events: readonly LedgerEvent[],
  pageOf: (e: LedgerEvent) => string | undefined,
): ErosionReading {
  const first = new Map<string, number>()
  for (const e of events) {
    const page = pageOf(e)
    if (page === undefined) continue
    const at = instantMs(e.at)
    const held = first.get(page)
    if (held === undefined || at < held) first.set(page, at)
  }
  const earliest = (pages: readonly string[]): number | undefined => {
    let out: number | undefined
    for (const p of pages) {
      const at = first.get(p)
      if (at !== undefined && (out === undefined || at < out)) out = at
    }
    return out
  }
  const stageMet = (stage: string): number | undefined => {
    let out: number | undefined
    for (const [p, at] of first) if (p.startsWith(`${stage}.`) && (out === undefined || at < out)) out = at
    return out
  }

  const forecasts = new Map(erosions.map((er) => [er.id, forecastOf(events, er.id)] as const))
  const crackedBy = new Map<string, string>()
  for (const er of erosions) if (forecasts.get(er.id) !== undefined && !crackedBy.has(er.seam)) crackedBy.set(er.seam, er.id)

  const seamStates: SeamState[] = seams.map((s) => {
    const plantedAt = earliest(s.plantedIn)
    const held = s.fate === 'held'
    const cracked = held ? undefined : crackedBy.get(s.id)
    return { id: s.id, held, plantedAt, crackedBy: cracked, open: !held && plantedAt !== undefined && cracked === undefined }
  })
  const bySeam = new Map(seamStates.map((s) => [s.id, s] as const))
  const age = (a: SeamState, b: SeamState): number => (a.plantedAt ?? Infinity) - (b.plantedAt ?? Infinity) || seamNumber(a.id) - seamNumber(b.id)
  const openSeams = seamStates.filter((s) => s.open).sort(age)
  const oldestOpen = openSeams[0]?.id

  const states: ErosionState[] = erosions.map((er) => {
    const seam = bySeam.get(er.seam)
    const plantedAt = seam?.plantedAt
    const forecast = forecasts.get(er.id)
    let cashedAt: number | undefined
    if (er.cashedIn !== null) cashedAt = first.get(er.cashedIn)
    else if (er.clearinghouseAfter !== undefined) {
      // the Clearinghouse week opens on demand: it hosts this erosion only once its seam is the oldest open one
      const met = stageMet(er.clearinghouseAfter)
      const eligible = forecast !== undefined || oldestOpen === er.seam
      cashedAt = met !== undefined && plantedAt !== undefined && eligible ? Math.max(met, plantedAt) : undefined
    }
    const both = plantedAt !== undefined && cashedAt !== undefined
    const status: ErosionStatus = forecast !== undefined ? 'cracked' : both && seam?.held !== true ? 'fired' : 'dormant'
    const builders = both && (cashedAt as number) < (plantedAt as number)
    return { id: er.id, seam: er.seam, status, plantedAt, cashedAt, builders, forecast }
  })

  const fired = states.filter((s) => s.status === 'fired')
  fired.sort((a, b) => {
    const sa = bySeam.get(a.seam)
    const sb = bySeam.get(b.seam)
    return sa !== undefined && sb !== undefined ? age(sa, sb) : 0
  })
  return { seams: seamStates, erosions: states, oldestOpen, next: fired[0] }
}
