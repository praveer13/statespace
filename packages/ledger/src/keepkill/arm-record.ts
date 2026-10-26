// How an event records the arm it was shown under (keep/kill rules, common.exposure and common.deviations):
// a mechanic that applies a comparison's arm to an item (W1-T05's feedback layers and class hints, W2-T18's
// Proof Blocks, W1-T08's SCR-week) writes, in the event's data, under the key "keepkill", one entry per
// comparison that governed the item's display, whichever arm it showed:
//
//   data: { keepkill: [{ comparison: "witness-generalization", arm: "class-named", expSeed: 2654435769 }] }
//
// with fallback set to the reason when the allocated variant could not be built and the default was shown.
// A read counts deviations from these entries: an item shown with the other arm's variant, a fallback, or an
// exposure under a superseded expSeed.
//
// Pure: no DOM, storage or network.

import type { LedgerEvent } from '../event.ts'
import { isUint32 } from './allocate.ts'

export const ARM_DATA_KEY = 'keepkill'

export interface ArmRecord {
  /** The comparison's id, such as witness-generalization. */
  readonly comparison: string
  /** The arm the item was shown under. */
  readonly arm: string
  /** The expSeed the arm was allocated under. */
  readonly expSeed: number
  /** Why the allocated variant could not be built, when the default was shown instead. */
  readonly fallback?: string
}

const isArmRecord = (v: unknown): v is ArmRecord => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const r = v as Record<string, unknown>
  const keys = Object.keys(r)
  return (
    typeof r.comparison === 'string' &&
    typeof r.arm === 'string' &&
    isUint32(r.expSeed) &&
    (r.fallback === undefined || (typeof r.fallback === 'string' && r.fallback.length > 0)) &&
    keys.every((k) => k === 'comparison' || k === 'arm' || k === 'expSeed' || k === 'fallback')
  )
}

/** The arm records an event carries; malformed entries are reported, never trusted. */
export function armRecordsOf(event: LedgerEvent): { records: ArmRecord[]; malformed: number } {
  const raw = event.data?.[ARM_DATA_KEY]
  if (raw === undefined) return { records: [], malformed: 0 }
  const list = Array.isArray(raw) ? (raw as unknown[]) : [raw]
  const records = list.filter(isArmRecord)
  return { records, malformed: list.length - records.length }
}

/** The arm record of one comparison on an event, if any. */
export function armRecordFor(event: LedgerEvent, comparison: string): ArmRecord | undefined {
  return armRecordsOf(event).records.find((r) => r.comparison === comparison)
}

/** The data entry a mechanic writes: { keepkill: [...records] }. */
export function armData(...records: ArmRecord[]): { [ARM_DATA_KEY]: ArmRecord[] } {
  for (const r of records) if (!isArmRecord(r)) throw new RangeError(`not an arm record: ${JSON.stringify(r)}`)
  return { [ARM_DATA_KEY]: records.map((r) => ({ ...r })) }
}
