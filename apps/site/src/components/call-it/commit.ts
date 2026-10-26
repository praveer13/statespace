// Committing a call: the one place that writes it. The sheet reads the log as it is at that moment, asks planCall
// (packages/learner) whether the question has been called, and writes the call only if it has not; the log is append-only, so
// "final" is this check at the write and the Mirror's own rule (the first call in fold order is the call that counts) after it.
// The call is in the outbox before the promise returns and committed before it settles, so no run can follow a call that was
// not recorded (M-call-it; ARCHITECTURE.md section 7.5).

import type { CallDraft } from '@statespace/learner/mirror'
import { firstCallOf, planCall } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'
import type { LedgerStore } from '../../storage/index.ts'

/** The part of the ledger store the sheet uses; the real store satisfies it, and so can a test's. */
export type CallStore = Pick<LedgerStore, 'events' | 'record' | 'subscribe' | 'status'>

export type CommitResult =
  /** This call was written, and it is the one that counts. */
  | { readonly status: 'recorded'; readonly call: LedgerEvent }
  /** A call on the question was there already (or came first from another tab): that one stands, and nothing was written, or what was written does not count. */
  | { readonly status: 'already'; readonly call: LedgerEvent; readonly wrote: boolean }
  /** Nothing was written and the call is not recorded: the store is read-only, or it failed. */
  | { readonly status: 'refused'; readonly message: string }

export async function commitCall(store: CallStore, draft: CallDraft): Promise<CommitResult> {
  const st = store.status()
  if (st.mode === 'read-only') return { status: 'refused', message: 'this browser holds a newer version of the record, so it is read-only until the page is reloaded' }
  try {
    const plan = planCall(await store.events(), draft)
    if (plan.action === 'already') return { status: 'already', call: plan.recorded, wrote: false }
    const written = await store.record(plan.input)
    // Another tab may have written an earlier call between the read and the write: the one that counts is the first in fold order.
    const counted = firstCallOf(await store.events(), draft.identity) ?? written
    return counted.id === written.id ? { status: 'recorded', call: written } : { status: 'already', call: counted, wrote: true }
  } catch (e) {
    return { status: 'refused', message: e instanceof Error ? e.message : String(e) }
  }
}
