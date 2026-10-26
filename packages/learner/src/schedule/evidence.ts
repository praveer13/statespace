// What the scheduler reads from an event (ASSESSMENT.md sections 2.4, 3.2 and 3.10). Pure: no DOM, storage, network or
// clock. Everything here is derived from the log at read time and stores nothing (I2).

import type { LedgerEvent } from '@statespace/ledger'
import { compareInstants, instantMs } from '@statespace/ledger'
import type { Rating } from './kernelspace-types.ts'

/** The kinds that carry graded evidence or a graded call: what can move a KC's schedule. */
const GRADED_KINDS = new Set(['item', 'probe', 'prove-it', 'audit', 'call'])
/** Bench work: what the rhythm counts beside graded work (spine section 4.1, "graded or Bench work only"). */
const BENCH_KINDS = new Set(['lab-check', 'receipt-import'])

/** The fold order of the ledger: by instant, compared exactly whatever offset each carries, then by id. */
export const foldOrder = (a: LedgerEvent, b: LedgerEvent): number => compareInstants(a.at, b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const record = (x: unknown): Record<string, unknown> | undefined => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined)

/**
 * The primary KC an event is about, or undefined: `data.kc` (a generated item writes it), else `data.call.kc` (a Call It
 * sheet writes it). An authored lesson item names none; its lesson introduces its KCs instead (introductionsOf).
 */
export function kcOfEvent(e: Pick<LedgerEvent, 'data'>): string | undefined {
  const d = record(e.data)
  if (d === undefined) return undefined
  if (typeof d.kc === 'string') return d.kc
  const call = record(d.call)
  return typeof call?.kc === 'string' ? call.kc : undefined
}

/** True for an event that is graded (ok is true or false) and of a kind that schedules. An ungraded event never counts as a miss. */
export function isGraded(e: Pick<LedgerEvent, 'kind' | 'ok'>): boolean {
  return GRADED_KINDS.has(e.kind) && typeof e.ok === 'boolean'
}

/** Graded or Bench work by the learner (not an agent's): what a session and the weekly rhythm are made of. */
export function isWork(e: Pick<LedgerEvent, 'kind' | 'ok' | 'provenance'>): boolean {
  if (e.provenance === 'agent') return false
  return isGraded(e) || BENCH_KINDS.has(e.kind)
}

/** Weight 1.0 for scheduling: own and unseen (fresh, or a first exposure to an authored cell). */
export const isFullWeight = (e: Pick<LedgerEvent, 'provenance' | 'exposure'>): boolean => e.provenance === 'own' && e.exposure === 'unseen'

/**
 * The FSRS rating of an event (ASSESSMENT.md section 3.10), or null for no update:
 *   fresh, ok, guess            Hard
 *   fresh, ok, think/sure/none  Good
 *   fresh, miss                 Again
 *   seen or assisted, ok        Hard at most (a low-weight event can bring a review closer, never push it later)
 *   seen or assisted, miss      Again
 *   ungraded, or an agent's     no update (weight 0)
 * A first exposure to an authored cell, own and unseen, weighs 1.0 for scheduling (section 2.4) and is rated as a fresh one [D].
 */
export function ratingOf(e: Pick<LedgerEvent, 'kind' | 'ok' | 'conf' | 'provenance' | 'exposure'>): Rating | null {
  if (!isGraded(e) || e.provenance === 'agent') return null
  if (e.ok === false) return 1
  if (!isFullWeight(e)) return 2
  return e.conf === 'guess' ? 2 : 3
}

/** A session: a maximal run of work events less than 30 minutes apart (ASSESSMENT.md section 3.2). */
export interface Session {
  readonly day: string
  readonly start: string
  readonly end: string
  readonly events: number
  /** Time on task over the session's events that logged it, in ms. */
  readonly ms: number
}

export const SESSION_GAP_MS = 30 * 60 * 1000

/** The sessions of a log, oldest first. */
export function sessionsOf(events: readonly LedgerEvent[]): Session[] {
  const work = events.filter(isWork).sort(foldOrder)
  const out: Session[] = []
  let cur: { day: string; start: string; end: string; endMs: number; events: number; ms: number } | undefined
  for (const e of work) {
    const t = instantMs(e.at)
    if (cur !== undefined && t - cur.endMs < SESSION_GAP_MS) {
      cur.end = e.at
      cur.endMs = t
      cur.events += 1
      cur.ms += e.ms ?? 0
      continue
    }
    if (cur !== undefined) out.push({ day: cur.day, start: cur.start, end: cur.end, events: cur.events, ms: cur.ms })
    cur = { day: e.day, start: e.at, end: e.at, endMs: t, events: 1, ms: e.ms ?? 0 }
  }
  if (cur !== undefined) out.push({ day: cur.day, start: cur.start, end: cur.end, events: cur.events, ms: cur.ms })
  return out
}

/** The latest local day that holds the learner's work, or undefined for an empty record. */
export function lastWorkDay(events: readonly LedgerEvent[]): string | undefined {
  let best: LedgerEvent | undefined
  for (const e of events) if (isWork(e) && (best === undefined || foldOrder(e, best) > 0)) best = e
  return best?.day
}

/** The median of logged item times in minutes, from own generated items with a time on task, or undefined with none. */
export function medianItemMinutes(events: readonly LedgerEvent[]): number | undefined {
  const ms = events
    .filter((e) => e.kind === 'item' && e.seed !== undefined && e.provenance === 'own' && typeof e.ms === 'number' && e.ms > 0 && e.ms < 30 * 60 * 1000)
    .map((e) => e.ms as number)
    .sort((a, b) => a - b)
  if (ms.length < 5) return undefined
  const mid = ms.length >> 1
  const m = ms.length % 2 === 1 ? (ms[mid] as number) : ((ms[mid - 1] as number) + (ms[mid] as number)) / 2
  return m / 60000
}
