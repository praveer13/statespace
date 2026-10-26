// Comparison 4's units: consecutive windows of 12 counted weeks (keep/kill rules, comparison reserve-weeks).
// Window 1 begins with the week of the first learner-zero event; a week with any day inside a declared break
// is not counted and does not advance the window; a window still open at a read is incomplete. Weeks are
// counted as M-set-your-week counts them; until W1-T08 publishes its week rule, a week starts on Monday
// [D], and the caller may pass another start day.
//
// Pure: no DOM, storage or network.

import { addDays, compareInstants, dayNumber, localDayOf, weekday } from '../time.ts'
import { PARAMETERS } from './rules.ts'

/** A declared break, local dates inclusive. */
export interface DeclaredBreak {
  readonly from: string
  readonly to: string
}

export interface WindowInput {
  /** The first learner-zero event's at; window 1 enters then. */
  readonly firstEventAt: string
  /** That event's frozen local day (its day field); defaults to the date its at carries. */
  readonly firstEventDay?: string
  /** The local day of the read: weeks that end before it are complete. */
  readonly readDay: string
  readonly breaks?: readonly DeclaredBreak[]
  /** 0 Sunday ... 6 Saturday; default 1, Monday [D]. */
  readonly weekStartsOn?: number
  /** Weeks per window; the rules' window_weeks. */
  readonly windowWeeks?: number
}

export interface Window {
  /** From 1, in time order. */
  readonly index: number
  /** The start day of each counted week, in order. */
  readonly weeks: readonly string[]
  /** True when all of its weeks have ended before the read day. */
  readonly complete: boolean
  /** When the unit enters: window 1 at the first event's at; a later window at the start of its first week (a local date). */
  readonly entersAt: string
}

/** The start day of the week holding a day. */
export function weekStartOf(day: string, weekStartsOn = 1): string {
  return addDays(day, -((weekday(day) - weekStartsOn + 7) % 7))
}

const inBreak = (day: number, breaks: readonly DeclaredBreak[]): boolean => breaks.some((b) => dayNumber(b.from) <= day && day <= dayNumber(b.to))

/** The counted weeks from the first event's week up to the week holding the read day. */
export function countedWeeks(input: WindowInput): string[] {
  const breaks = input.breaks ?? []
  const firstDay = input.firstEventDay ?? localDayOf(input.firstEventAt)
  const out: string[] = []
  for (let start = weekStartOf(firstDay, input.weekStartsOn ?? 1); dayNumber(start) <= dayNumber(input.readDay); start = addDays(start, 7)) {
    const s = dayNumber(start)
    let broken = false
    for (let d = s; d < s + 7 && !broken; d++) broken = inBreak(d, breaks)
    if (!broken) out.push(start)
  }
  return out
}

/** The windows up to the read, each with its counted weeks; the last may be incomplete. */
export function windowsOf(input: WindowInput): Window[] {
  const size = input.windowWeeks ?? PARAMETERS.window_weeks
  const weeks = countedWeeks(input)
  const read = dayNumber(input.readDay)
  const out: Window[] = []
  for (let i = 0; i < weeks.length; i += size) {
    const chunk = weeks.slice(i, i + size)
    const last = chunk[chunk.length - 1] as string
    const complete = chunk.length === size && dayNumber(last) + 6 < read
    const index = out.length + 1
    out.push({ index, weeks: chunk, complete, entersAt: index === 1 ? input.firstEventAt : (chunk[0] as string) })
  }
  return out
}

/** True when a window's entry would precede the draw, so it never enters (common.entry). */
export function windowBeforeDraw(window: Window, drawnAt: string): boolean {
  if (window.index === 1) return compareInstants(window.entersAt, drawnAt) < 0
  return dayNumber(window.entersAt) < dayNumber(localDayOf(drawnAt))
}

/** The local days a window's counted weeks cover. */
export function daysOf(window: Window): Set<string> {
  const days = new Set<string>()
  for (const start of window.weeks) for (let i = 0; i < 7; i++) days.add(addDays(start, i))
  return days
}
