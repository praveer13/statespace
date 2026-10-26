// VRK30, the north star (spine section 2.3; ASSESSMENT.md section 3.6): the number of knowledge components the learner can
// still reason about 30 days or more after first learning them. A KC counts while its latest qualifying event is correct,
// where a qualifying event is a fresh one (own, unseen, generated) on the KC, graded, at least 30 days after first learning.
// The Mirror shows the count, its rate per active study-month, the accuracy over every qualifying event with its Wilson
// interval, and which KCs count. There is no target and no comparison with anyone (spine section 2.3).
//
// Pure: no DOM, storage or network, and no clock: callers pass `now`.

import type { LedgerEvent } from '@statespace/ledger'
import { compareInstants, compareKeys, instantKey, isFresh, SECONDS_PER_DAY, shiftKey } from '@statespace/ledger'
import { firstLearning, isGraded } from '@statespace/ledger/keepkill'
import { ACTIVE_MONTH_DAYS, VRK30_DAYS } from './bands.ts'
import { foldedEvents } from './calls.ts'
import { asKeepKill, kcOfEvent } from './mirror.ts'
import type { MirrorContent } from './mirror.ts'
import { rateOf } from './stats.ts'
import type { Rate } from './stats.ts'

export interface Vrk30Kc {
  readonly kc: string
  /** First learning of the KC: the instant 30 days are counted from. */
  readonly firstLearning: string
  /** The latest qualifying event, which is correct (that is why the KC counts). */
  readonly at: string
  /** The KC is settled (ASSESSMENT.md section 3.5): known only to the caller, which owns sign-off. */
  readonly settled: boolean
}

export interface Vrk30View {
  readonly asOf: string
  /** The KCs whose latest qualifying event is correct. */
  readonly count: number
  readonly kcs: readonly Vrk30Kc[]
  /** Qualifying events over every KC, hits among them, and their rate with its interval (null with none). */
  readonly qualifying: number
  readonly accuracy: Rate | null
  /** Calendar months (YYYY-MM, in each event's own local date) with graded own work on at least ACTIVE_MONTH_DAYS distinct local days. */
  readonly activeMonths: readonly string[]
  /** `count` per active study-month; null while no month is active, so a declared break never dilutes it. */
  readonly perMonth: number | null
}

export interface Vrk30Input {
  readonly events: Iterable<LedgerEvent>
  readonly content: MirrorContent
  readonly now: string
  /** The KCs the caller knows to be settled (ASSESSMENT.md section 3.5); none by default. */
  readonly settled?: ReadonlySet<string>
}

/** The active study-months of a log: graded own work on at least `days` distinct local days of the month [D]. */
export function activeMonthsOf(events: readonly LedgerEvent[], days: number = ACTIVE_MONTH_DAYS): string[] {
  const byMonth = new Map<string, Set<string>>()
  for (const e of events) {
    if (e.provenance !== 'own' || !isGraded(e)) continue
    const month = e.day.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? new Set()).add(e.day))
  }
  return [...byMonth].filter(([, d]) => d.size >= days).map(([m]) => m).sort()
}

export function deriveVrk30({ events, content, now, settled = new Set() }: Vrk30Input): Vrk30View {
  const ordered = foldedEvents(events).filter((e) => compareInstants(e.at, now) < 0)
  const kk = asKeepKill(content)
  const learned = new Map<string, { at: string; floor: ReturnType<typeof instantKey> } | undefined>()
  const learnedAt = (kc: string) => {
    if (!learned.has(kc)) {
      const f = firstLearning(kc, ordered, kk)
      learned.set(kc, f === undefined ? undefined : { at: f.at, floor: shiftKey(instantKey(f.at), VRK30_DAYS * SECONDS_PER_DAY) })
    }
    return learned.get(kc)
  }
  const latest = new Map<string, LedgerEvent>()
  let qualifying = 0
  let hits = 0
  for (const e of ordered) {
    if (!isFresh(e) || typeof e.ok !== 'boolean') continue
    const kc = kcOfEvent(e, content)
    if (kc === undefined) continue
    const f = learnedAt(kc)
    if (f === undefined || compareKeys(instantKey(e.at), f.floor) < 0) continue
    qualifying += 1
    if (e.ok) hits += 1
    latest.set(kc, e)
  }
  const kcs: Vrk30Kc[] = []
  for (const [kc, e] of latest) {
    if (e.ok !== true) continue
    kcs.push({ kc, firstLearning: (learnedAt(kc) as { at: string }).at, at: e.at, settled: settled.has(kc) })
  }
  kcs.sort((a, b) => compareInstants(a.at, b.at) || (a.kc < b.kc ? -1 : a.kc > b.kc ? 1 : 0))
  const activeMonths = activeMonthsOf(ordered)
  return {
    asOf: now,
    count: kcs.length,
    kcs,
    qualifying,
    accuracy: rateOf(hits, qualifying),
    activeMonths,
    perMonth: activeMonths.length === 0 ? null : kcs.length / activeMonths.length,
  }
}
