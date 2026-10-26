// Which call counts. A call is an event that carries a confidence tap: a `call` on an authored cell or on a generated item,
// or any graded item the learner called (ASSESSMENT.md section 2.2 and section 5.6, "calls and called items"). Only the
// first call on a question counts and it cannot be edited (M-call-it, spine section 8.5): the log is append-only, so a
// second call can be written (a stale tab, a replayed import), and every reader decides by this module that it counts
// for nothing. The Call It sheet decides "already called?" here too, so the sheet and the Mirror cannot disagree.
//
// Pure: no DOM, storage or network.

import type { LedgerEvent } from '@statespace/ledger'
import { orderedEvents, resolveConflict } from '@statespace/ledger'
import { isConfidence } from './bands.ts'
import type { CallShape } from './shape.ts'
import { isCallShape } from './shape.ts'

/**
 * What a question is: its ref and, for a generated instance, its seed (ASSESSMENT.md section 2.3: an instance is its ref
 * and its seed, since generators are pure). The item's revision is not part of it: an erratum flags the call "re-check" and
 * never gives the learner a second first call.
 */
export interface CallIdentity {
  readonly ref: string
  readonly seed?: number
}

/** The ref without its kind: `call:S1.L1/c1`, `item:S1.L1/c1` and `drawer:S1.L1/c1` are one question. */
export function refBody(ref: string): string {
  const i = ref.indexOf(':')
  return i < 0 ? ref : ref.slice(i + 1)
}

/** The key two events share when they are about the same question. */
export function callKey(id: CallIdentity): string {
  return `${refBody(id.ref)}|${id.seed === undefined ? '' : id.seed}`
}

export const identityOf = (e: Pick<LedgerEvent, 'ref' | 'seed'>): CallIdentity => (e.seed === undefined ? { ref: e.ref } : { ref: e.ref, seed: e.seed })

/** True when a confidence was asked and tapped: the only events the Mirror and the sheet read as calls. */
export const isCall = (e: Pick<LedgerEvent, 'conf'>): boolean => isConfidence(e.conf)

/**
 * The events of a collection in fold order, each id once: the log is a set keyed by id (ASSESSMENT.md section 2.6), so a
 * double import, or two exports joined end to end, is the same set. Two records that share an id and differ are decided
 * by the canonical conflict rule. Every derivation reads the log through this, so none counts an event twice.
 */
export function foldedEvents(events: Iterable<LedgerEvent>): LedgerEvent[] {
  const byId = new Map<string, LedgerEvent>()
  for (const e of events) {
    const held = byId.get(e.id)
    byId.set(e.id, held === undefined ? e : resolveConflict(held, e))
  }
  return orderedEvents(byId.values())
}

/**
 * The first call on each question, in fold order (ASSESSMENT.md section 2.6): by instant, compared exactly whatever
 * offset each event carries, then by id. The input may be in any order and may hold the same event twice.
 */
export function firstCalls(events: Iterable<LedgerEvent>): Map<string, LedgerEvent> {
  const out = new Map<string, LedgerEvent>()
  for (const e of foldedEvents(events)) {
    if (!isCall(e)) continue
    const k = callKey(identityOf(e))
    if (!out.has(k)) out.set(k, e)
  }
  return out
}

/** The call that counts for a question, or undefined while it has not been called. */
export function firstCallOf(events: Iterable<LedgerEvent>, id: CallIdentity): LedgerEvent | undefined {
  const want = callKey(id)
  return foldedEvents(events).find((e) => isCall(e) && callKey(identityOf(e)) === want)
}

/**
 * What a call event says about its item, read back from `data.call`: the item's shape (so its chance level, which the
 * guess band's imputation needs, and its bin) and the knowledge component it was asked about. The writer records them
 * because the event has no other field for them (event@1); the Mirror takes the KC from content when content can
 * resolve it, and from here otherwise.
 */
export interface CallData {
  readonly shape: CallShape
  readonly kc?: string
}

/** The shape and KC a call event carries, or undefined when `data.call` is absent or malformed. */
export function readCallData(e: Pick<LedgerEvent, 'data'>): CallData | undefined {
  const raw = (e.data as { call?: unknown } | undefined)?.call
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as { form?: unknown; options?: unknown; statements?: unknown; kc?: unknown }
  const shape = r.form === 'choice' ? { form: r.form, options: r.options } : r.form === 'set' ? { form: r.form, statements: r.statements } : { form: r.form }
  if (!isCallShape(shape)) return undefined
  return typeof r.kc === 'string' && r.kc !== '' ? { shape, kc: r.kc } : { shape }
}

/** `data.call` for a call event: the inverse of readCallData. */
export function callDataOf(shape: CallShape, kc?: string): { call: Record<string, unknown> } {
  const base: Record<string, unknown> = shape.form === 'choice' ? { form: 'choice', options: shape.options } : shape.form === 'set' ? { form: 'set', statements: shape.statements } : { form: 'constructed' }
  if (kc !== undefined) base['kc'] = kc
  return { call: base }
}
