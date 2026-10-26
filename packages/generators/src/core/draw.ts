// Drawing an instance to serve: make it from the drawn seed, ask the checker for its key, and on a discard redraw
// from the next seed of the deterministic sequence (ASSESSMENT.md section 4.1: "an unknown while generating
// discards the seed and redraws deterministically"). The served instance's seed is the one its event records,
// so make(seed, band, template) regenerates it anywhere.
//
// Pure: no DOM, storage or network.

import { discardCause, isDiscard, liveTemplateOf } from './define.ts'
import type { DiscardCause } from './define.ts'
import type { EnginePort } from './port.ts'
import { formatSeed, seedSequence } from './seed.ts'
import type { Band, Generator, InstanceBase, KeyBase, TemplateId } from './types.ts'

/** How many seeds a draw tries before it gives up [D]: generous next to the families' discard rates. */
export const DEFAULT_MAX_DRAWS = 8

export interface DrawRequest {
  readonly seed: number
  readonly band: Band
  readonly template: TemplateId
  readonly maxDraws?: number
  /** Seeds to step over without trying them: an identity already in the log (ASSESSMENT.md section 2.3). */
  readonly skip?: (seed: number) => boolean
}

export interface DiscardRecord {
  readonly seed: number
  readonly reason: string
  readonly cause?: DiscardCause
}

export type DrawOutcome<I, K> =
  | { readonly status: 'drawn'; readonly seed: number; readonly instance: I; readonly key: K; readonly discarded: readonly DiscardRecord[] }
  | { readonly status: 'exhausted'; readonly discarded: readonly DiscardRecord[] }

/** Throws when make() returned an instance that does not carry the family, template, band and seed it was asked for. */
export function assertInstance(gen: Pick<Generator, 'id'>, inst: InstanceBase, seed: number, band: Band, template: TemplateId): void {
  const problems: string[] = []
  if (inst.family !== gen.id) problems.push(`family ${String(inst.family)}`)
  if (inst.template !== template) problems.push(`template ${String(inst.template)}`)
  if (inst.band !== band) problems.push(`band ${String(inst.band)}`)
  if (inst.seed !== seed) problems.push(`seed ${typeof inst.seed === 'number' ? formatSeed(inst.seed) : String(inst.seed)}`)
  if (problems.length > 0) throw new Error(`${gen.id}.make(${formatSeed(seed)}, ${band}, ${template}) returned an instance with ${problems.join(', ')}`)
}

/**
 * Draw a keyed instance from a seed, redrawing deterministically on a discard. Rejects with a RangeError for a
 * template the family does not have, and with a PendingTemplateError for a pending one, before any seed is tried.
 */
export async function drawInstance<I extends InstanceBase, K extends KeyBase>(gen: Generator<I, K>, port: EnginePort, req: DrawRequest): Promise<DrawOutcome<I, K>> {
  liveTemplateOf(gen, req.template)
  const maxDraws = req.maxDraws ?? DEFAULT_MAX_DRAWS
  if (!Number.isInteger(maxDraws) || maxDraws < 1) throw new RangeError(`maxDraws must be a positive integer, got ${String(maxDraws)}`)
  const discarded: DiscardRecord[] = []
  let tried = 0
  // Skipped seeds do not count as tries, but the walk is bounded all the same.
  for (const seed of seedSequence(req.seed, maxDraws * 8)) {
    if (tried >= maxDraws) break
    if (req.skip?.(seed) === true) continue
    tried += 1
    const instance = gen.make(seed, req.band, req.template)
    assertInstance(gen, instance, seed, req.band, req.template)
    const key = await gen.key(instance, port)
    if (isDiscard(key)) {
      const cause = discardCause(key)
      discarded.push({ seed, reason: key.discard, ...(cause === undefined ? {} : { cause }) })
      continue
    }
    return { status: 'drawn', seed, instance, key, discarded }
  }
  return { status: 'exhausted', discarded }
}
