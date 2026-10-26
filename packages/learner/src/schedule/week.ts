// The weekly rhythm (M-set-your-week; spine sections 3.0, 3.11 and 7; EVIDENCE.md section 5; DESIGN.md SCR-week). The plan
// is a range of hours, planned at the pessimistic end (x1.6), with two Bench blocks and the Keep block; the rhythm reads
// "met in k of the last 12 weeks" (target 8 or more), counting graded or Bench work only, with a 7-day repair and two
// reserve weeks in every 12; declared breaks pause the window. There is no daily view, no streak and no "behind".
//
// Pure: the caller passes the day and the plan. The plan is the learner's settings; nothing here reads a keep/kill arm
// (spine section 12 item 58: the scheduler never does).

import type { LedgerEvent } from '@statespace/ledger'
import { addDays, daysBetween } from '@statespace/ledger'
import type { KcCard } from './cards.ts'
import { sessionsOf } from './evidence.ts'
import { weekOf } from './today.ts'

/** The pessimistic planning factor [buehler94] (spine section 3.11). */
export const PESSIMISM = 1.6
/** Reserve weeks built into every 12 (spine section 3.11). */
export const RESERVE_WEEKS = 2
export const WINDOW_WEEKS = 12
/** The rhythm's target: met in 8 or more of the last 12 weeks (spine section 7, M-set-your-week). */
export const RHYTHM_TARGET = 8
/** A week is met when it holds this many sessions of graded or Bench work [D]. */
export const MEET_SESSIONS = 2
/** In the two weeks after a landmark restart (6 weeks or more away), one session meets a week [D] (DESIGN.md SCR-today). */
export const LANDMARK_LIGHT_WEEKS = 2
/** A missed week can be made up within this many days of its end (spine section 7). */
export const REPAIR_DAYS = 7

export interface Break {
  readonly from: string
  readonly to: string
}

export interface WeekPlan {
  /** The learner's range of hours a week. */
  readonly hours: readonly [number, number]
  /** The days of the two Bench blocks, 0 Sunday to 6 Saturday; 2 or 3 of them. */
  readonly benchDays: readonly number[]
  readonly breaks: readonly Break[]
  /** One or two if-then plans (M-monthly-retro). */
  readonly ifThen: readonly string[]
}

export const DEFAULT_PLAN: WeekPlan = { hours: [6, 8], benchDays: [2, 6], breaks: [], ifThen: [] }

export type WeekStatus = 'met' | 'made-up' | 'reserve' | 'open' | 'paused'

export interface WeekRow {
  /** The Monday that starts the week. */
  readonly start: string
  readonly sessions: number
  readonly status: WeekStatus
  /** Sessions that meet this week (1 in the light weeks after a landmark restart). */
  readonly needs: number
}

export interface Rhythm {
  /** The counted weeks, oldest first: at most the last 12 completed weeks, paused weeks left out and passed over. */
  readonly weeks: readonly WeekRow[]
  readonly met: number
  /** How many weeks the window holds so far (fewer than 12 in the first months). */
  readonly of: number
  readonly current: WeekRow
  /** True while no completed week has work in it yet: "starts counting this week". */
  readonly starting: boolean
  /** The break that holds `today`, if any. */
  readonly onBreak: Break | undefined
}

const inBreak = (day: string, breaks: readonly Break[]): Break | undefined => breaks.find((b) => b.from <= day && day <= b.to)

/** A week is paused when a declared break covers 4 or more of its days [D]. */
function paused(start: string, breaks: readonly Break[]): boolean {
  let n = 0
  for (let i = 0; i < 7; i++) if (inBreak(addDays(start, i), breaks) !== undefined) n++
  return n >= 4
}

export function deriveRhythm(events: readonly LedgerEvent[], today: string, plan: WeekPlan = DEFAULT_PLAN): Rhythm {
  const sessions = sessionsOf(events)
  const perWeek = new Map<string, number>()
  for (const s of sessions) perWeek.set(weekOf(s.day), (perWeek.get(weekOf(s.day)) ?? 0) + 1)
  const first = sessions[0]?.day
  const thisWeek = weekOf(today)
  // Light weeks: the two weeks that start with a return after 6 weeks or more away.
  const light = new Set<string>()
  for (let i = 1; i < sessions.length; i++) {
    const gap = daysBetween((sessions[i - 1] as { day: string }).day, (sessions[i] as { day: string }).day)
    if (gap >= 42) for (let w = 0; w < LANDMARK_LIGHT_WEEKS; w++) light.add(addDays(weekOf((sessions[i] as { day: string }).day), 7 * w))
  }
  const needsOf = (start: string): number => (light.has(start) ? 1 : MEET_SESSIONS)
  const sessionsIn = (start: string): number => perWeek.get(start) ?? 0
  const statusOf = (start: string, complete: boolean): WeekStatus => {
    if (paused(start, plan.breaks)) return 'paused'
    const n = sessionsIn(start)
    const need = needsOf(start)
    if (n >= need) return 'met'
    // The 7-day repair: the 7 days after the week hold its shortfall on top of what they need themselves.
    const next = addDays(start, 7)
    if (next <= today) {
      const shortfall = need - n
      const nextHas = sessionsIn(next)
      if (nextHas >= needsOf(next) + shortfall) return 'made-up'
    }
    return complete ? 'reserve' : 'open'
  }

  const weeks: WeekRow[] = []
  if (first !== undefined) {
    const firstWeek = weekOf(first)
    for (let start = addDays(thisWeek, -7); start >= firstWeek && weeks.length < WINDOW_WEEKS; start = addDays(start, -7)) {
      const status = statusOf(start, true)
      if (status === 'paused') continue
      weeks.unshift({ start, sessions: sessionsIn(start), status, needs: needsOf(start) })
    }
  }
  // Unmet weeks beyond the two reserve weeks read as open weeks, never as losses: the copy names none of them.
  let reserves = 0
  const counted = weeks.map((w) => {
    if (w.status !== 'reserve') return w
    reserves += 1
    return reserves <= RESERVE_WEEKS ? w : { ...w, status: 'open' as const }
  })
  const met = counted.filter((w) => w.status === 'met' || w.status === 'made-up').length
  const current: WeekRow = { start: thisWeek, sessions: sessionsIn(thisWeek), status: statusOf(thisWeek, false), needs: needsOf(thisWeek) }
  return { weeks: counted, met, of: counted.length, current, starting: counted.length === 0, onBreak: inBreak(today, plan.breaks) }
}

// ---- the Keep block (spine section 3.0) -------------------------------------------------------------------------------

/** The planned Keep block in minutes a week at 6 and 10 h/week [D] (spine section 3.0; content/stages/budget.yaml). */
export const KEEP_PLANNED: Readonly<Record<6 | 10, readonly [number, number]>> = { 6: [45, 75], 10: [60, 105] }

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const at = (h: number): number => Math.min(1, Math.max(0, (h - 6) / 4))

/** The planned Keep block at h hours a week, interpolated between the spine's two figures [D]. */
export function plannedKeep(h: number): readonly [number, number] {
  const t = at(h)
  return [Math.round(lerp(KEEP_PLANNED[6][0], KEEP_PLANNED[10][0], t)), Math.round(lerp(KEEP_PLANNED[6][1], KEEP_PLANNED[10][1], t))]
}

export interface KeepTerm {
  readonly what: string
  readonly minutes: readonly [number, number]
}

export interface KeepBlock {
  readonly terms: readonly KeepTerm[]
  readonly minutes: readonly [number, number]
  readonly planned: readonly [number, number]
  /** Reviews the schedule offers in the next 7 days. */
  readonly reviews: number
  readonly itemMinutes: number
  /** When the computed block runs past the planned upper figure, the week's stage work is lowered, not the Keep block. */
  readonly over: boolean
}

/**
 * The Keep block, computed rather than a constant (spine section 3.0): the larger of the week's review minutes (the
 * reviews the schedule offers in the next 7 days times the minutes per item) and its Today sessions (3 at 6 h/week, 4 at
 * 10 h/week, 10-12 minutes each), plus the 5-minute weekly review, the monthly retro spread over the month, and the
 * Clearinghouse's incidents once it has opened (from S3; 1 at 6 h/week, 2 at 10 h/week, 10-15 minutes each).
 */
export function keepBlock(args: { cards: ReadonlyMap<string, KcCard>; today: string; hours: number; itemMinutes: number; clearinghouse: boolean }): KeepBlock {
  const { cards, today, hours, itemMinutes } = args
  const horizon = addDays(today, 7)
  let reviews = 0
  for (const c of cards.values()) if (c.due < horizon) reviews += 1
  const sessions = hours >= 8 ? 4 : 3
  const reviewMin = reviews * itemMinutes
  const today_: readonly [number, number] = [Math.max(reviewMin, sessions * 10), Math.max(reviewMin, sessions * 12)]
  const terms: KeepTerm[] = [
    { what: reviews > 0 && reviewMin > sessions * 12 ? `${reviews} reviews at about ${itemMinutes} minutes each` : `${sessions} Today sessions of 10 to 12 minutes`, minutes: today_ },
    { what: 'the weekly review', minutes: [5, 5] },
    { what: 'the monthly retro, spread over its weeks', minutes: [4, 4] },
  ]
  if (args.clearinghouse) {
    const n = hours >= 8 ? 2 : 1
    terms.push({ what: `${n} Clearinghouse ${n === 1 ? 'incident' : 'incidents'}`, minutes: [n * 10, n * 15] })
  }
  const minutes: readonly [number, number] = [terms.reduce((s, t) => s + t.minutes[0], 0), terms.reduce((s, t) => s + t.minutes[1], 0)]
  const planned = plannedKeep(hours)
  return { terms, minutes, planned, reviews, itemMinutes, over: minutes[1] > planned[1] }
}

/** Stage work a week at h hours: what is left after the Keep block at its upper figure (4.75 h at 6, 8.25 h at 10). */
export function stageWorkHours(h: number, keep: readonly [number, number] = plannedKeep(h)): number {
  return Math.max(0.5, h - Math.max(keep[1], plannedKeep(h)[1]) / 60)
}

/** A stage's weeks at a pace: its planned hours over the week's stage work, as the budget's rows compute them. */
export function stageWeeks(planned: readonly [number, number], hoursLow: number, hoursHigh: number): readonly [number, number] {
  return [planned[0] / stageWorkHours(hoursHigh), planned[1] / stageWorkHours(hoursLow)]
}

/** The arc in weeks, planned at the pessimistic end (x1.6) with two reserve weeks in every 12 (spine section 3.11). */
export function arcWeeks(planned: readonly [number, number], hoursLow: number, hoursHigh: number): readonly [number, number] {
  const reserve = WINDOW_WEEKS / (WINDOW_WEEKS - RESERVE_WEEKS)
  return [(planned[0] * PESSIMISM * reserve) / stageWorkHours(hoursHigh), (planned[1] * PESSIMISM * reserve) / stageWorkHours(hoursLow)]
}

/** A plan read back from working state: anything malformed falls back to the default, field by field. */
export function readPlan(x: unknown): WeekPlan {
  const o = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {}
  const h = Array.isArray(o.hours) && o.hours.length === 2 && o.hours.every((n) => typeof n === 'number' && n > 0 && n <= 40) ? (o.hours as [number, number]) : DEFAULT_PLAN.hours
  const hours: [number, number] = h[0] <= h[1] ? [h[0], h[1]] : [h[1], h[0]]
  const benchDays = Array.isArray(o.benchDays) && o.benchDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ? [...new Set(o.benchDays as number[])].sort() : DEFAULT_PLAN.benchDays
  const day = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
  const breaks = Array.isArray(o.breaks)
    ? (o.breaks as unknown[]).filter((b): b is Break => typeof b === 'object' && b !== null && day.test(String((b as Break).from)) && day.test(String((b as Break).to)))
    : []
  const ifThen = Array.isArray(o.ifThen) ? (o.ifThen as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 2) : []
  return { hours, benchDays, breaks, ifThen }
}
