// What the Mirror needs from the course's content, built from the KC graph and from what a call records about itself (see
// packages/learner/src/mirror/README.md for the contract). KC tags live in content, not in events (ARCHITECTURE.md section 7.2):
// the first lesson of a KC is the graph's `firstTaught`, a first-contact lesson is the graph's `firstContact`, and a call carries
// the KC it was asked about in `data.call.kc` (the sheet writes it from the item's tag). An exit item's event carries
// `data.exit = { lesson }`, the lesson whose exit item it attempted: first learning of a KC is the first such attempt on the
// lesson that first teaches it (ASSESSMENT.md section 3.2).

import { GRAPH, kcById } from '@statespace/kc'
import type { MirrorContent } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'

const CALL_LESSON = /^call:(S[0-9]+\.L[0-9]+)\//

/** The lesson an authored cell's call names in its ref, or undefined for any other ref. */
export const lessonOfCallRef = (ref: string): string | undefined => CALL_LESSON.exec(ref)?.[1]

/** The lesson whose exit item an event attempted, from `data.exit.lesson`. */
export function exitLessonOf(e: Pick<LedgerEvent, 'data'>): string | undefined {
  const exit = (e.data as { exit?: { lesson?: unknown } } | undefined)?.exit
  return typeof exit?.lesson === 'string' ? exit.lesson : undefined
}

export const siteContent: MirrorContent = {
  // Read-time resolution is the graph's to give for an item whose writer recorded nothing; a call's own record is read otherwise.
  primaryKc: () => undefined,
  isFirstLessonExit(e, kc) {
    if (e.kind !== 'item') return false
    const lesson = exitLessonOf(e)
    return lesson !== undefined && kcById(GRAPH, kc)?.firstTaught === lesson
  },
  isFirstContact(e) {
    const lesson = lessonOfCallRef(e.ref)
    return lesson !== undefined && Object.hasOwn(GRAPH.firstContact, lesson)
  },
}

/** A KC's name for a learner: the idea in words. Undefined for an ID the graph does not hold. */
export const ideaName = (kc: string): string | undefined => kcById(GRAPH, kc)?.name
