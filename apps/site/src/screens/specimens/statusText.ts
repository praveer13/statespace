// A specimen's status in the learner's words (DESIGN.md section 6.5 and 11.6): Mounted and Kept are states, written as
// words and never drawn as a stamp (spine section 8.6). A re-find is "from" a date and "ready" from then on; there is no
// count of days late, nothing overdue and nothing red (DESIGN.md section 6.11).

import { daysBetween } from '@statespace/ledger'
import { COPY } from './copy.ts'
import type { Held } from './model/cabinet.ts'

export interface StatusText {
  /** One line for the list: "Mounted 2026-11-02 · Re-find from 2026-11-09", or "Kept 2026-11-10". */
  readonly summary: string
  /** The status row's first sentence. */
  readonly lead: string
  /** Its second sentence: what is left to do, or when it was mounted. */
  readonly rest: string
  /** A re-find can be done now. */
  readonly ready: boolean
}

export function statusText(state: Held, today: string): StatusText {
  if (state.status === 'kept') {
    return { summary: `Kept ${state.keptDay}`, lead: COPY.status.kept(state.keptDay), rest: COPY.status.mounted(state.mountedDay), ready: false }
  }
  const ready = daysBetween(state.refindFrom, today) >= 0
  return {
    summary: `Mounted ${state.mountedDay} · Re-find from ${state.refindFrom}`,
    lead: COPY.status.mounted(state.mountedDay),
    rest: ready ? COPY.status.ready : COPY.status.waiting(state.refindFrom),
    ready,
  }
}
