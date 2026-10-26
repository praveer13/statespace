// The allocation of units to arms (keep/kill rules, common.allocation): a pure function of expSeed and the
// rules file (I2, I3), computed the same way on every device, and checked against the vectors the reference
// implementation wrote (scripts/spikes/W0-T07/keepkill.mjs; runs/RUN-keepkill-rules/allocation-vectors.json).
//
// Pure: no DOM, storage or network.

import { hash32 } from '@statespace/rng'
import type { KcComparison, WindowComparison } from './rules.ts'

export { hash32 }

/** MurmurHash3's 32-bit finalizer (common.allocation.fmix32). */
export function fmix32(h0: number): number {
  let h = h0 >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return h
}

/** True for an unsigned 32-bit integer. */
export const isUint32 = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff

/** common.allocation.key: "<comparison id>:<unit id>:<expSeed in decimal, without leading zeros>". */
export function allocationKey(comparisonId: string, unitId: string, expSeed: number): string {
  if (!isUint32(expSeed)) throw new RangeError(`expSeed must be an unsigned 32-bit integer, got ${String(expSeed)}`)
  return `${comparisonId}:${unitId}:${expSeed.toString(10)}`
}

/** v(u) = fmix32(hash32(key(u))). */
export const allocationValue = (key: string): number => fmix32(hash32(key))

export interface UnitAllocation {
  readonly unit: string
  readonly stratum: string
  readonly key: string
  readonly v: number
  /** The unit's place along the whole order, from 0. */
  readonly position: number
  readonly arm: string
}

const stageNumber = (stratum: string): number => {
  const m = /^S([1-9][0-9]*)$/.exec(stratum)
  if (!m) throw new Error(`a stratum must be a stage S<n>, got ${stratum}`)
  return Number(m[1])
}

const codeUnitCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * The arms of a KC comparison's units: units ordered stratum by stratum in stage-number order, within a
 * stratum by v ascending (a tie by unit ID in UTF-16 code-unit order), and the two arms given alternately
 * along the whole order, the first unit taking the first-listed arm when the lowest bit of its v is 0.
 */
export function allocate(comparison: KcComparison, expSeed: number): UnitAllocation[] {
  const strata = Object.keys(comparison.units).sort((a, b) => stageNumber(a) - stageNumber(b))
  const order: Omit<UnitAllocation, 'position' | 'arm'>[] = []
  for (const stratum of strata) {
    const rows = (comparison.units[stratum] ?? []).map((unit) => {
      const key = allocationKey(comparison.id, unit, expSeed)
      return { unit, stratum, key, v: allocationValue(key) }
    })
    rows.sort((a, b) => a.v - b.v || codeUnitCompare(a.unit, b.unit))
    order.push(...rows)
  }
  const first = order[0]
  if (first === undefined) return []
  const lowBit = first.v & 1
  return order.map((row, position) => ({ ...row, position, arm: comparison.arms[(lowBit + position) % 2] as string }))
}

/** The arm of one unit, or undefined when the KC is not a unit of the comparison. */
export function armOf(comparison: KcComparison, unit: string, expSeed: number): string | undefined {
  return allocate(comparison, expSeed).find((a) => a.unit === unit)?.arm
}

/** Comparison 4: window 1's arm, from the lowest bit of v("reserve-weeks:window-1:<expSeed>"). */
export function firstWindowArm(comparison: WindowComparison, expSeed: number): { key: string; v: number; arm: string } {
  const key = allocationKey(comparison.id, 'window-1', expSeed)
  const v = allocationValue(key)
  return { key, v, arm: comparison.arms[v & 1] as string }
}

/** Comparison 4 before any harm stop: windows alternate between the arms in time order from window 1's arm. */
export function windowArm(comparison: WindowComparison, expSeed: number, index: number): string {
  if (!Number.isInteger(index) || index < 1) throw new RangeError(`windows are numbered from 1, got ${index}`)
  const first = firstWindowArm(comparison, expSeed).arm
  const other = comparison.arms[0] === first ? comparison.arms[1] : comparison.arms[0]
  return index % 2 === 1 ? first : other
}
