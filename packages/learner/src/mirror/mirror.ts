// The Mirror (M-mirror, SCR-mirror; spine section 8.5; ASSESSMENT.md section 5.6): private calibration, derived from the
// event log at read time (I2) and never stored. It reads calls that are the first on their question, own, unseen,
// graded and made after instruction, and leads with bias (the mean stated probability, imputed from each tap, minus
// accuracy) and the hit rate per band with Wilson intervals. A band gets a sentence only when it holds at least
// MIN_CALLS_PER_BAND calls and its interval lies wholly outside the printed band. Assisted calls are tallied apart and
// never pooled, because help inflates self-assessment (ASSESSMENT.md section 5.6); a multiple true/false set has its own
// bin (spine section 8.5).
//
// Pure: no DOM, storage or network, and no clock: callers pass `now`.

import type { LedgerEvent } from '@statespace/ledger'
import { compareInstants } from '@statespace/ledger'
import { firstLearning } from '@statespace/ledger/keepkill'
import type { KeepKillContent } from '@statespace/ledger/keepkill'
import { BANDS, CONFIDENCES, imputedConfidence, MIN_CALLS_PER_BAND } from './bands.ts'
import type { Band, Confidence } from './bands.ts'
import { callKey, foldedEvents, identityOf, isCall, readCallData } from './calls.ts'
import { binOf, BINS, chanceOf } from './shape.ts'
import type { Bin, CallShape } from './shape.ts'
import { rateOf } from './stats.ts'
import type { Rate } from './stats.ts'

/**
 * What the Mirror needs from the course's content: which knowledge component a call was about, and whether an event is the
 * attempt at the exit item of a KC's first lesson (first learning, ASSESSMENT.md section 3.2). KC tags live in content,
 * never in events (ARCHITECTURE.md section 7.2), so both are injected. This is a part of what the keep/kill reads take
 * (`KeepKillContent`), so one adapter can serve both.
 */
export interface MirrorContent {
  /** The event's primary KC, or undefined when content cannot resolve it (the call's own record is read then). */
  primaryKc(event: LedgerEvent): string | undefined
  /** True when the event is an attempt at the exit item of the KC's first lesson or step briefing. */
  isFirstLessonExit(event: LedgerEvent, kc: string): boolean
  /**
   * True for a first-contact call: recorded and scheduled, counted toward no KC state and never in the Mirror whenever it
   * is made (spine section 12 item 33: Boot's call).
   */
  isFirstContact?(event: LedgerEvent): boolean
}

/** Why a call is not in the Mirror. The learner-facing text is the screen's; the reasons are the rules'. */
export type Exclusion = 'repeat' | 'ungraded' | 'agent' | 'seen' | 'no-kc' | 'no-shape' | 'before-instruction'
export const EXCLUSIONS: readonly Exclusion[] = ['repeat', 'ungraded', 'agent', 'seen', 'no-kc', 'no-shape', 'before-instruction']

/** The primary KC an event's writer recorded in `data.kc`, for an event that is not a call. */
export function recordedKc(e: Pick<LedgerEvent, 'data'>): string | undefined {
  const kc = (e.data as { kc?: unknown } | undefined)?.kc
  return typeof kc === 'string' && kc !== '' ? kc : undefined
}

/** The knowledge component of an event: content's reading, else the one the event's own record carries. */
export function kcOfEvent(e: LedgerEvent, content: Pick<MirrorContent, 'primaryKc'>): string | undefined {
  return content.primaryKc(e) ?? readCallData(e)?.kc ?? recordedKc(e)
}

/** The part of a Mirror content that `firstLearning` reads, as the keep/kill content type asks for it. */
export function asKeepKill(content: MirrorContent): KeepKillContent {
  return { primaryKc: content.primaryKc, isFirstLessonExit: content.isFirstLessonExit, template: () => undefined, treatment: () => undefined }
}

export interface BandView {
  readonly band: Band
  /** n and hits, with the rate and its interval; null when the band holds no call. */
  readonly rate: Rate | null
  readonly calls: number
  /**
   * The mean chance level of the band's calls (1/k for k options, 1 in 2^m for a set, 0 with no guessing floor), or null with
   * no call: where the hit rate would sit if every call were a blind guess. The screen draws the guess band's range from here
   * to its upper edge (DESIGN.md section 6.12: "guess: chance to 67%"); no sentence reads it.
   */
  readonly chance: number | null
  /** At least MIN_CALLS_PER_BAND calls: the band may be diagnosed. */
  readonly enough: boolean
  /**
   * Set only when the band is `enough` and its interval lies wholly outside the printed band: below it (the calls hit less
   * often than the tap says) or above it. Touching the band's edge is reaching it, so nothing is said [D].
   */
  readonly diagnosis: 'below' | 'above' | null
}

export interface BinView {
  readonly bin: Bin
  readonly calls: number
  readonly hits: number
  /** Accuracy with its Wilson interval; null with no call. */
  readonly accuracy: Rate | null
  /** The mean of the imputed stated probabilities; null with no call. */
  readonly meanConfidence: number | null
  /**
   * Mean stated probability minus accuracy, with its interval (the mean minus accuracy's interval, because the imputed mean
   * is fixed by the taps). Null below MIN_CALLS_PER_BAND calls: nothing is shown from a handful.
   */
  readonly bias: { readonly value: number; readonly low: number; readonly high: number } | null
  /** One row per tap, guess, think so and sure, even when empty. */
  readonly bands: readonly BandView[]
  /**
   * The hit rate at sure minus the hit rate at guess (ASSESSMENT.md section 5.6, "resolution"), shown beside the two rows'
   * own intervals; null unless both bands are `enough`.
   */
  readonly resolution: number | null
}

export interface MirrorView {
  /** The instant the view is as of: only events before it are read. */
  readonly asOf: string
  readonly minCalls: number
  /** The calls that count: own, unseen, graded, first on their question, after instruction. */
  readonly own: readonly BinView[]
  /** Calls with the same filters whose learner said they had help: apart, and never pooled with `own`. */
  readonly assisted: readonly BinView[]
  /** The calls that count, own and assisted: `ownCalls` + `assistedCalls`. */
  readonly counted: number
  /** Calls of the learner's own group, which a sentence about "your calls" is about. */
  readonly ownCalls: number
  /** Calls made with help, shown apart. */
  readonly assistedCalls: number
  /** Calls read and left out, by the first reason that applies. */
  readonly excluded: Readonly<Record<Exclusion, number>>
}

export interface MirrorInput {
  readonly events: Iterable<LedgerEvent>
  readonly content: MirrorContent
  /** The instant to read as of; events at or after it are left out. */
  readonly now: string
}

interface Counted {
  readonly conf: Confidence
  readonly ok: boolean
  readonly shape: CallShape
}

/**
 * Where an interval lies against a band: wholly below it, wholly above it, or reaching it, which includes touching its edge
 * [D]. Only a band with enough calls is asked (binView).
 */
export function outsideBand(r: Rate, band: Band): 'below' | 'above' | null {
  if (r.high < band.lo) return 'below'
  if (r.low > band.hi) return 'above'
  return null
}

function binView(bin: Bin, calls: readonly Counted[]): BinView {
  const n = calls.length
  const hits = calls.filter((c) => c.ok).length
  const accuracy = rateOf(hits, n)
  const meanConfidence = n === 0 ? null : calls.reduce((s, c) => s + imputedConfidence(c.conf, chanceOf(c.shape)), 0) / n
  const bias =
    accuracy !== null && meanConfidence !== null && n >= MIN_CALLS_PER_BAND
      ? { value: meanConfidence - accuracy.rate, low: meanConfidence - accuracy.high, high: meanConfidence - accuracy.low }
      : null
  const bands: BandView[] = CONFIDENCES.map((conf) => {
    const inBand = calls.filter((c) => c.conf === conf)
    const rate = rateOf(inBand.filter((c) => c.ok).length, inBand.length)
    const enough = inBand.length >= MIN_CALLS_PER_BAND
    const chance = inBand.length === 0 ? null : inBand.reduce((s, c) => s + chanceOf(c.shape), 0) / inBand.length
    return { band: BANDS[conf], rate, calls: inBand.length, chance, enough, diagnosis: enough && rate !== null ? outsideBand(rate, BANDS[conf]) : null }
  })
  const guess = bands[0] as BandView
  const sure = bands[2] as BandView
  const resolution = guess.enough && sure.enough && guess.rate !== null && sure.rate !== null ? sure.rate.rate - guess.rate.rate : null
  return { bin, calls: n, hits, accuracy, meanConfidence, bias, bands, resolution }
}

/**
 * The Mirror as of `now`. Reads events in fold order, so the result depends only on the set of events, never on the order
 * they arrive in: a merge, a double import and a stale tab give the same Mirror.
 */
export function deriveMirror({ events, content, now }: MirrorInput): MirrorView {
  const ordered = foldedEvents(events).filter((e) => compareInstants(e.at, now) < 0)
  const kk = asKeepKill(content)
  const learned = new Map<string, string | undefined>()
  const firstLearned = (kc: string): string | undefined => {
    if (!learned.has(kc)) learned.set(kc, firstLearning(kc, ordered, kk)?.at)
    return learned.get(kc)
  }
  const excluded = Object.fromEntries(EXCLUSIONS.map((x) => [x, 0])) as Record<Exclusion, number>
  const own = new Map<Bin, Counted[]>(BINS.map((b) => [b, []]))
  const assisted = new Map<Bin, Counted[]>(BINS.map((b) => [b, []]))
  const asked = new Set<string>()
  for (const e of ordered) {
    if (!isCall(e)) continue
    // The first call on a question is the call, whatever happens to it next: it uses the question up.
    const key = callKey(identityOf(e))
    if (asked.has(key)) {
      excluded.repeat += 1
      continue
    }
    asked.add(key)
    if (typeof e.ok !== 'boolean') excluded.ungraded += 1
    else if (e.provenance === 'agent') excluded.agent += 1
    else if (e.exposure !== 'unseen') excluded.seen += 1
    else {
      const kc = kcOfEvent(e, content)
      const shape = readCallData(e)?.shape
      if (kc === undefined) excluded['no-kc'] += 1
      else if (shape === undefined) excluded['no-shape'] += 1
      else {
        const learnedAt = content.isFirstContact?.(e) === true ? undefined : firstLearned(kc)
        if (learnedAt === undefined || compareInstants(e.at, learnedAt) < 0) excluded['before-instruction'] += 1
        else (e.provenance === 'assisted' ? assisted : own).get(binOf(shape))?.push({ conf: e.conf as Confidence, ok: e.ok, shape })
      }
    }
  }
  const views = (m: Map<Bin, Counted[]>): BinView[] => BINS.map((b) => binView(b, m.get(b) as Counted[]))
  const total = (m: Map<Bin, Counted[]>): number => [...m.values()].reduce((s, l) => s + l.length, 0)
  const ownCalls = total(own)
  const assistedCalls = total(assisted)
  return { asOf: now, minCalls: MIN_CALLS_PER_BAND, own: views(own), assisted: views(assisted), counted: ownCalls + assistedCalls, ownCalls, assistedCalls, excluded }
}
