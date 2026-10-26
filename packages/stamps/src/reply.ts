// From an instrument reply (the bus's `{verdict, witness, stats, provenance}`, ARCHITECTURE.md section 17.3) to a
// raw output. The shapes below are structural, matching that sketch, so this package does not import the bus;
// a reply from packages/bus fits them as it is. The engine prints its raw answer neutrally; the main origin
// derives the stamp from the answer and the query's direction (DESIGN.md section 5.4). Pure.

import type { Constants, RawOutput, Replay, WitnessLength } from './raw.ts'
import { checkerOf } from './receipt.ts'

export type EngineVerdict =
  | { readonly kind: 'sat' }
  | { readonly kind: 'unsat' }
  | { readonly kind: 'unknown'; readonly reason: string }
  | { readonly kind: 'no-error'; readonly complete: boolean }
  | { readonly kind: 'violated'; readonly property: string; readonly length: number; readonly unit: 'actions' | 'steps' | 'rows' }
  | { readonly kind: 'stopped'; readonly by: 'deadlock' | 'bound'; readonly distinct?: number }
  | { readonly kind: string; readonly [k: string]: unknown }

export interface ReplyLike {
  readonly verdict: EngineVerdict
  readonly stats: { readonly distinct?: number; readonly n?: number; readonly bound?: string }
  readonly provenance: { readonly engine: string; readonly version: string; readonly budget: { readonly rlimit?: number } }
}

export interface ReplyContext {
  /** What the query asserts; a solver verdict without it is read neither way. */
  readonly direction?: 'violation' | 'premise'
  /** For a `sat`: the model as text, whether it replayed, and the witness's length. */
  readonly model?: string
  readonly replay?: Replay
  readonly witness?: WitnessLength
  readonly guardsEnforcement?: boolean
  /** For a model checker: the constants the cell ran with, and whether deadlock freedom is the property. */
  readonly constants?: Constants
  readonly deadlockFreedom?: boolean
}

/** An instrument reply as a raw output, or a string saying why it has none. */
export function rawFromReply(reply: ReplyLike, ctx: ReplyContext = {}): RawOutput | string {
  const engine = checkerOf(reply.provenance.engine, reply.provenance.version)
  const rlimit = reply.provenance.budget.rlimit
  const v = reply.verdict
  switch (v.kind) {
    case 'unknown':
      return { kind: 'smt-unknown', solver: engine, reason: typeof v['reason'] === 'string' ? v['reason'] : '', ...(rlimit !== undefined ? { rlimit } : {}), ...(ctx.guardsEnforcement ? { guardsEnforcement: true } : {}) }
    case 'sat':
    case 'unsat': {
      const verdict = v.kind
      if (ctx.direction === undefined) return { kind: 'smt-direction-unknown', solver: engine, verdict }
      if (ctx.direction === 'premise') return { kind: 'smt-premise', solver: engine, verdict }
      if (verdict === 'unsat') return { kind: 'smt-unsat', solver: engine, ...(rlimit !== undefined ? { rlimit } : {}) }
      return { kind: 'smt-sat', solver: engine, model: ctx.model ?? '', replay: ctx.replay ?? 'pending', witness: ctx.witness ?? { length: 1, unit: 'steps' } }
    }
    case 'no-error': {
      const constants = ctx.constants ?? []
      if (v['complete'] === true && reply.stats.distinct !== undefined) return { kind: 'tlc-complete', engine, constants, distinctStates: reply.stats.distinct }
      if (reply.stats.bound !== undefined) return { kind: 'model-check-bounded', engine, bound: reply.stats.bound, constants, ...(reply.stats.distinct !== undefined ? { distinctStates: reply.stats.distinct } : {}) }
      return 'a model check that is not complete names no bound'
    }
    case 'violated': {
      const length = typeof v['length'] === 'number' ? v['length'] : NaN
      const unit = v['unit'] === 'steps' || v['unit'] === 'rows' ? v['unit'] : 'actions'
      if (!Number.isInteger(length)) return 'a violation without its witness length'
      return { kind: 'tlc-violation', engine, property: typeof v['property'] === 'string' ? v['property'] : 'the property', witness: unit === 'actions' ? { length, unit, states: length + 1 } : { length, unit } }
    }
    case 'stopped': {
      const distinct = typeof v['distinct'] === 'number' ? v['distinct'] : reply.stats.distinct
      if (v['by'] === 'deadlock') {
        if (distinct === undefined) return 'a deadlock stop without its distinct-state count'
        // a deadlock that violates deadlock freedom is [R], which prints its witness's length
        if (ctx.deadlockFreedom === true && ctx.witness === undefined) return 'a deadlock that violates deadlock freedom, without its witness length'
        return { kind: 'tlc-deadlock', engine, distinctStates: distinct, deadlockFreedom: ctx.deadlockFreedom === true, ...(ctx.witness ? { witness: ctx.witness } : {}) }
      }
      if (reply.stats.bound === undefined) return 'a stop at a bound that names no bound'
      return { kind: 'model-check-bounded', engine, bound: reply.stats.bound, constants: ctx.constants ?? [], ...(distinct !== undefined ? { distinctStates: distinct } : {}) }
    }
    default:
      return `the ${engine.name} verdict "${v.kind}" has no row in spine section 8.8`
  }
}
