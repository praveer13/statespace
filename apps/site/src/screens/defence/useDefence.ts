// A stage's Defence view, derived from the tab's record at read time (I2), and the small formatters the screens share.

import { useMemo } from 'react'
import { GRAPH, kcsOfStage } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import { stampTime } from '@statespace/ledger'
import type { DefenceView, Rate } from '@statespace/learner/signoff'
import { deriveDefence } from '@statespace/learner/signoff'

export const stageKcs = (stage: string): string[] => kcsOfStage(GRAPH, stage as Parameters<typeof kcsOfStage>[1]).map((k) => k.id)

export function useDefence(stage: string, events: readonly LedgerEvent[] | null): DefenceView | null {
  return useMemo(() => (events === null ? null : deriveDefence(stage, events, { kcs: stageKcs(stage) })), [stage, events])
}

/** Today's local date in this browser. */
export function today(): string {
  const now = Date.now()
  return stampTime(now, -new Date(now).getTimezoneOffset()).day
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 2026-10-29 → "29 October 2026". */
export function dayText(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${d} ${MONTHS[(m ?? 1) - 1] ?? ''} ${y}`
}

/** 0.6123 → "0.61". */
export const two = (x: number): string => x.toFixed(2)

/** "0.55–0.95". */
export const intervalText = (r: Rate): string => `${two(r.low)}–${two(r.high)}`
