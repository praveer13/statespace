// Wilson's score interval at the Mirror's z (ASSESSMENT.md section 6.4). One implementation: the keep/kill reads' `wilson`
// (packages/ledger), ported operation for operation from the rules' reference and given z here, so the Mirror and the
// reads cannot disagree about an interval.
//
// Pure: no DOM, storage or network.

import { wilson as wilsonAt } from '@statespace/ledger/keepkill'
import { MIRROR_Z } from './bands.ts'

/** A rate with its Wilson interval. */
export interface Rate {
  readonly hits: number
  readonly n: number
  readonly rate: number
  readonly low: number
  readonly high: number
}

/** `hits` of `n` with the 95% Wilson interval (z = 1.96); null for n = 0, which has no rate. */
export function rateOf(hits: number, n: number, z: number = MIRROR_Z): Rate | null {
  if (n <= 0) return null
  const [low, high] = wilsonAt(hits, n, z)
  return { hits, n, rate: hits / n, low, high }
}
