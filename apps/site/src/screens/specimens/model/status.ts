// A specimen's status for one learner: unmet, mounted, or kept; and the re-find schedule (M-specimen-cabinet and
// M-re-find; spine sections 5.1 and 8.3; DESIGN.md section 6.5; ASSESSMENT.md section 2.5). Derived from the learner's
// events and from nothing else, at read time: no store holds a status (I2), so two tabs and an import always agree, and
// the functions take the clock as an argument.
//
// MOUNTED. A course specimen is mounted at the learner's first call on a cell of one of the lessons its record names
// (`mount.lessons`): the earliest event of kind `call` whose ref is `call:S{n}.L{k}/{cell}` for such a lesson, by an
// own or assisted learner, never an agent's (an agent's call is not the learner's find). The first call is the signal
// because it is the first run of an authored cell, where the witness appears (DESIGN.md section 6.2: "Mount as
// specimen" comes after the first [R]), and because event@1 carries no lesson-completion mark to wait for [D].
//
// KEPT. A mounted specimen is kept after a re-find: a fresh item (own, unseen, generated: `isFresh`) that the learner
// answered correctly, whose `data.refind.specimen` names the specimen, on a local day at least 7 days after the day it
// was mounted (the events' own `day`, frozen when written, so travel never moves it). Calendar days, not 168 hours,
// because the cabinet prints the dates: a re-find on the date the cabinet gives is a re-find at least 7 days later [D].
// An ungraded item (the checker was undecided) and a miss never keep a specimen; a miss never undoes a keep.
//
// THE TAG. event@1's `data` is open and checked by the module that reads it, so this module owns the contract of a
// re-find's data: `{ refind: { specimen: "SP-1.1" } }` (`refindData`). The Today card that serves a re-find (W1-T08)
// writes it on the item's event, and the cabinet reads it. A re-find has no other mark, because an exit item met in a
// lesson on the same generator family is not a re-find of a specimen it never named.

import type { LedgerEvent } from '@statespace/ledger'
import { addDays, compareInstants, daysBetween, isFresh } from '@statespace/ledger'

/** "At least 7 days later" (spine section 5.1). */
export const REFIND_AFTER_DAYS = 7

const SPECIMEN_ID = /^SP-[1-9][0-9]*\.[1-9][0-9]*$/
const CALL_LESSON = /^call:(S[1-9][0-9]*\.L[0-9]+)\//

export interface MountRule {
  /** The lessons whose first call mounts the specimen. */
  readonly lessons: readonly string[]
}

export type SpecimenState =
  | { readonly status: 'unmet' }
  | {
      readonly status: 'mounted'
      readonly mountedAt: string
      /** The local day the mount event was written on. */
      readonly mountedDay: string
      /** The first local day a re-find keeps it. */
      readonly refindFrom: string
    }
  | {
      readonly status: 'kept'
      readonly mountedAt: string
      readonly mountedDay: string
      readonly refindFrom: string
      readonly keptAt: string
      readonly keptDay: string
    }

/** The `data` of the item event of a re-find: what Today writes, and what the cabinet reads. */
export function refindData(specimen: string): { refind: { specimen: string } } {
  if (!SPECIMEN_ID.test(specimen)) throw new RangeError(`not a specimen ID: ${JSON.stringify(specimen)}`)
  return { refind: { specimen } }
}

/** The specimen an event is a re-find of, or null: a fresh-or-not item whose data names one. Reads the data and nothing more. */
export function refindOf(event: Pick<LedgerEvent, 'kind' | 'data'>): string | null {
  if (event.kind !== 'item') return null
  const refind = (event.data as { refind?: unknown } | undefined)?.refind
  const specimen = (refind as { specimen?: unknown } | undefined)?.specimen
  return typeof specimen === 'string' && SPECIMEN_ID.test(specimen) ? specimen : null
}

/** The lesson of a call event's ref, for a call on an authored cell: S1.L0 of call:S1.L0/c1. Null for any other ref. */
export function callLessonOf(event: Pick<LedgerEvent, 'kind' | 'ref'>): string | null {
  return event.kind === 'call' ? (CALL_LESSON.exec(event.ref)?.[1] ?? null) : null
}

/** The fold order of the ledger: by instant, compared exactly whatever offset each carries, then by id. */
const earlier = (a: LedgerEvent, b: LedgerEvent): number => compareInstants(a.at, b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** The event that mounted a specimen: the earliest call on a cell of one of its lessons that is not an agent's. */
export function mountEvent(events: readonly LedgerEvent[], rule: MountRule): LedgerEvent | undefined {
  let best: LedgerEvent | undefined
  for (const e of events) {
    const lesson = callLessonOf(e)
    if (lesson === null || !rule.lessons.includes(lesson) || e.provenance === 'agent') continue
    if (best === undefined || earlier(e, best) < 0) best = e
  }
  return best
}

/** The event that kept a specimen mounted on `mounted`: the earliest correct fresh re-find at least 7 days later. */
export function keepEvent(events: readonly LedgerEvent[], specimen: string, mounted: LedgerEvent): LedgerEvent | undefined {
  let best: LedgerEvent | undefined
  for (const e of events) {
    if (refindOf(e) !== specimen || !isFresh(e) || e.ok !== true) continue
    if (daysBetween(mounted.day, e.day) < REFIND_AFTER_DAYS || compareInstants(e.at, mounted.at) <= 0) continue
    if (best === undefined || earlier(e, best) < 0) best = e
  }
  return best
}

/** One specimen's state. Independent of the order of the events. */
export function stateOf(events: readonly LedgerEvent[], specimen: string, rule: MountRule): SpecimenState {
  const mounted = mountEvent(events, rule)
  if (mounted === undefined) return { status: 'unmet' }
  const base = { mountedAt: mounted.at, mountedDay: mounted.day, refindFrom: addDays(mounted.day, REFIND_AFTER_DAYS) }
  const kept = keepEvent(events, specimen, mounted)
  return kept === undefined ? { status: 'mounted', ...base } : { status: 'kept', ...base, keptAt: kept.at, keptDay: kept.day }
}

export interface Mountable {
  readonly id: string
  readonly mount?: MountRule
}

/** Every specimen's state, by ID. A specimen with no mount rule is never mounted by a call (a learner's own is mounted by its lab check). */
export function statesOf(events: readonly LedgerEvent[], specimens: readonly Mountable[]): Map<string, SpecimenState> {
  const out = new Map<string, SpecimenState>()
  for (const s of specimens) out.set(s.id, s.mount === undefined ? { status: 'unmet' } : stateOf(events, s.id, s.mount))
  return out
}

export interface ScheduledRefind {
  readonly specimen: string
  /** The first local day a re-find keeps it. */
  readonly from: string
  /** The day it was mounted. */
  readonly mountedDay: string
  /** Whether `today` is on or after `from`: a re-find can be done now. Never "late": nothing here is overdue. */
  readonly ready: boolean
}

/**
 * The re-find schedule: every mounted specimen that is not yet kept, with the first day a re-find keeps it, soonest first
 * (ties by ID). `today` is the learner's local date; a specimen is ready from its day on and stays ready, with no count of
 * days late and nothing red (DESIGN.md section 6.11: no overdue counts, streaks or deadlines).
 */
export function refindSchedule(states: ReadonlyMap<string, SpecimenState>, today: string): ScheduledRefind[] {
  const out: ScheduledRefind[] = []
  for (const [specimen, s] of states) {
    if (s.status !== 'mounted') continue
    out.push({ specimen, from: s.refindFrom, mountedDay: s.mountedDay, ready: daysBetween(s.refindFrom, today) >= 0 })
  }
  const byNumber = (id: string): number[] => id.replace('SP-', '').split('.').map(Number)
  return out.sort((a, b) => daysBetween(b.from, a.from) || (byNumber(a.specimen)[0] as number) - (byNumber(b.specimen)[0] as number) || (byNumber(a.specimen)[1] as number) - (byNumber(b.specimen)[1] as number))
}
