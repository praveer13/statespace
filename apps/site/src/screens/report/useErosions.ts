// The learner's seams and erosions, read from the practice record at read time (I2) through @statespace/ledger's
// firing rule. Today can mount the same reading to show the next forecast card.

import { useMemo } from 'react'
import { readErosions, type ErosionReading, type LedgerEvent } from '@statespace/ledger'
import { pageOf } from '../../app/progress.ts'
import { EROSIONS, SEAMS } from './data.ts'

export function erosionsOf(events: readonly LedgerEvent[]): ErosionReading {
  return readErosions(SEAMS, EROSIONS, events, pageOf)
}

export function useErosionReading(events: readonly LedgerEvent[] | null): ErosionReading | null {
  return useMemo(() => (events === null ? null : erosionsOf(events)), [events])
}
