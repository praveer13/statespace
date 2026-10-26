// The decision to write a call: a call is final, so a question that has been called is never written again. The sheet
// asks planCall with the log as it is at that moment, and writes what it returns (or shows the call that is already
// there). The event it plans is the call's whole record: verdict, confidence, whether it matched, the item's shape and
// the knowledge component, so the Mirror needs nothing else to place it.
//
// Pure: no DOM, storage or network.

import type { EventInput, LedgerEvent } from '@statespace/ledger'
import type { Confidence } from './bands.ts'
import { callDataOf, firstCallOf } from './calls.ts'
import type { CallIdentity } from './calls.ts'
import type { CallShape } from './shape.ts'

/** What the learner committed, with what the item says about it. */
export interface CallDraft {
  readonly identity: CallIdentity
  readonly conf: Confidence
  /** The response in canonical form: { picked: 'B' } for a choice, { answers: { s1: true, ... } } for a set. */
  readonly resp: unknown
  /** Whether the call matched the key. A set is right only when every statement is (spine section 8.5). */
  readonly ok: boolean
  /**
   * The misconception key the response matched, which M-refutation-card reads: for a choice, the picked option's key; for a
   * set, the key of the first wrong statement that carries one. The event holds one key; `resp` keeps every mark.
   */
  readonly mis?: string
  /** `assisted` when the learner said they had help (OD-8); otherwise `own`. */
  readonly provenance: 'own' | 'assisted'
  readonly shape: CallShape
  /** The knowledge component the call was about: the item's primary tag, resolved from content when the call is written. */
  readonly kc?: string
  /** Time on task in milliseconds. */
  readonly ms?: number
  /** The item's revision, as content builds it. */
  readonly itemRev?: string
  /** The engine that keyed the item, name@version. */
  readonly engine?: string
  /** More kind-specific data to keep beside the call (a generated instance's `instance`, a re-find's mark). `call` is reserved. */
  readonly extra?: Readonly<Record<string, unknown>>
}

export type CallPlan = { readonly action: 'write'; readonly input: EventInput } | { readonly action: 'already'; readonly recorded: LedgerEvent }

/**
 * Write the call, or say which call is already there. `already` whenever the log holds a call on the question, whatever it
 * said and whoever wrote it: the first call is the only one that counts and it cannot be edited.
 */
export function planCall(events: Iterable<LedgerEvent>, draft: CallDraft): CallPlan {
  const recorded = firstCallOf(events, draft.identity)
  if (recorded !== undefined) return { action: 'already', recorded }
  const input: EventInput = {
    kind: 'call',
    ref: draft.identity.ref,
    ...(draft.itemRev === undefined ? {} : { itemRev: draft.itemRev }),
    ...(draft.engine === undefined ? {} : { engine: draft.engine }),
    ...(draft.identity.seed === undefined ? {} : { seed: draft.identity.seed }),
    ok: draft.ok,
    conf: draft.conf,
    resp: draft.resp,
    ...(draft.mis === undefined ? {} : { mis: draft.mis }),
    provenance: draft.provenance,
    exposure: 'unseen',
    ...(draft.ms === undefined ? {} : { ms: Math.max(0, Math.round(draft.ms)) }),
    data: { ...draft.extra, ...callDataOf(draft.shape, draft.kc) },
  }
  return { action: 'write', input }
}
