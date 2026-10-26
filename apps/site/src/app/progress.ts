// Where a learner is, derived from the practice record at read time and never stored (I2). A page's questions are the
// ones this build can answer: an instrument cell's Call It on a lesson, and an item with a fixed choice. A page is
// finished once each of them has an event in the log. Pure.

import type { LedgerEvent } from '@statespace/ledger'
import type { Lesson } from '@statespace/content'

const LESSON = /^S[0-9]+\.L[0-9]+$/
const DRAWER = /^D-[0-9]{2}$/

export const isLessonId = (id: string): boolean => LESSON.test(id)
export const isDrawerId = (id: string): boolean => DRAWER.test(id)

/** The ref a cell's call is written under: call:S1.L2/c1. */
export const callRef = (lesson: string, cell: number): string => `call:${lesson}/c${cell}`

/**
 * The ref an item's answer is written under (ARCHITECTURE.md section 7.2): item:GEN-{family}/{template} in a lesson, with
 * the page and the item's place in it in `data`; drawer:D-03/i2 in a drawer, which numbers its items in order.
 */
export const itemRef = (page: string, family: string, template: string, n: number): string =>
  isDrawerId(page) ? `drawer:${page}/i${n}` : `item:${family}/${template}`

/** The key of one question in a page: the call's ref, or item:{page}/i{n}. */
const itemKey = (page: string, n: number): string => `item:${page}/i${n}`

/** What an item's answer carries in `data`: the page and the item's place in it (i1, i2, ...). */
export interface ItemData {
  readonly page: string
  readonly item: string
}

const dataOf = (e: LedgerEvent): { page?: string | undefined; item?: string | undefined } => {
  const d = (e.data ?? {}) as Record<string, unknown>
  return { page: typeof d.page === 'string' ? d.page : undefined, item: typeof d.item === 'string' ? d.item : undefined }
}

/** The question an event answers, as the key questionsOf uses, or undefined. */
export function questionOf(e: LedgerEvent): string | undefined {
  if (e.kind === 'call') return e.ref
  if (e.kind !== 'item') return undefined
  const drawer = /^drawer:(D-[0-9]{2})\/(i[0-9]+)$/.exec(e.ref)
  if (drawer !== null) return `item:${drawer[1]}/${drawer[2]}`
  const d = dataOf(e)
  return d.page !== undefined && d.item !== undefined ? `item:${d.page}/${d.item}` : undefined
}

/** The lesson or drawer an event belongs to, or undefined. */
export function pageOf(e: LedgerEvent): string | undefined {
  const call = /^call:(S[0-9]+\.L[0-9]+)\//.exec(e.ref)
  if (e.kind === 'call') return call?.[1]
  if (e.kind === 'item') {
    const drawer = /^drawer:(D-[0-9]{2})\//.exec(e.ref)
    return drawer?.[1] ?? dataOf(e).page
  }
  return undefined
}

/** The first event that answers each question, by key. */
export function answers(events: readonly LedgerEvent[]): Map<string, LedgerEvent> {
  const out = new Map<string, LedgerEvent>()
  for (const e of events) {
    const q = questionOf(e)
    if (q !== undefined && !out.has(q)) out.set(q, e)
  }
  return out
}

/** The questions of a page this build can answer, by key, in page order. */
export function questionsOf(page: Lesson): string[] {
  const out: string[] = []
  const lesson = isLessonId(page.id)
  let n = 0
  for (const s of page.segments) {
    for (const b of s.blocks) {
      if (b.type === 'instrument' && lesson && b.callOnFirstRun && b.call !== undefined) out.push(callRef(page.id, b.cell))
      if (b.type === 'item') {
        n++
        if (b.choice !== undefined) out.push(itemKey(page.id, n))
      }
    }
  }
  return out
}

export interface PageProgress {
  readonly total: number
  readonly answered: number
  /** Every question answered; a page with no question this build can answer is never finished by the record. */
  readonly finished: boolean
}

export function progressOf(page: Lesson, done: ReadonlyMap<string, LedgerEvent>): PageProgress {
  const qs = questionsOf(page)
  const answered = qs.filter((q) => done.has(q)).length
  return { total: qs.length, answered, finished: qs.length > 0 && answered === qs.length }
}

/** The lesson of the most recent event that belongs to one, or undefined when the record holds none. */
export function lastLesson(events: readonly LedgerEvent[]): string | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const p = pageOf(events[i] as LedgerEvent)
    if (p !== undefined && isLessonId(p)) return p
  }
  return undefined
}

/** Every lesson or drawer the record mentions, in the order first met. */
export function pagesTouched(events: readonly LedgerEvent[]): string[] {
  const out: string[] = []
  for (const e of events) {
    const p = pageOf(e)
    if (p !== undefined && !out.includes(p)) out.push(p)
  }
  return out
}
