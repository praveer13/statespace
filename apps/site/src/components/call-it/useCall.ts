// The call that counts for a question, read from the ledger store and kept current: the log is read when the sheet mounts and
// again whenever this tab or another writes to it, so a call made in another tab appears here without a reload. The call is
// found by the same function the Mirror uses (firstCallOf), so the sheet and the Mirror cannot disagree about which call it is.

import { useCallback, useEffect, useState } from 'react'
import type { CallDraft, CallIdentity } from '@statespace/learner/mirror'
import { firstCallOf } from '@statespace/learner/mirror'
import { commitCall } from './commit.ts'
import type { CallStore } from './commit.ts'
import { recordedFrom } from './model.ts'
import type { CommitOutcome } from './CallIt.tsx'
import type { RecordedCall } from './types.ts'

export type CallLog =
  /** The log has not been read yet. */
  | { readonly status: 'loading' }
  /** No store: this browser cannot keep a record. */
  | { readonly status: 'unavailable' }
  | { readonly status: 'ready'; readonly recorded: RecordedCall | undefined }

/**
 * `store` is the tab's ledger store; null when the browser cannot open one; undefined while the host is still opening it (the sheet
 * says it is looking, and never says that the record is not kept).
 */
export function useCall(store: CallStore | null | undefined, identity: CallIdentity): { readonly log: CallLog; readonly commit: (draft: CallDraft) => Promise<CommitOutcome> } {
  const ref = identity.ref
  const seed = identity.seed
  const key = `${ref}#${seed ?? ''}`
  const idle: CallLog = store === null ? { status: 'unavailable' } : { status: 'loading' }
  // What the log said is kept with the store and the question it was read for: a host that gives the same mounted cell another
  // question, or another store, never sees the earlier question's call for a moment, or for good.
  const [held, setHeld] = useState<{ readonly store: CallStore | null | undefined; readonly key: string; readonly log: CallLog }>({ store, key, log: idle })
  const log = held.store === store && held.key === key ? held.log : idle
  useEffect(() => {
    const loading: CallLog = store === null ? { status: 'unavailable' } : { status: 'loading' }
    const apply = (update: (prev: CallLog) => CallLog): void =>
      setHeld((h) => {
        const same = h.store === store && h.key === key
        const prev = same ? h.log : loading
        const next = update(prev)
        return same && next === prev ? h : { store, key, log: next }
      })
    if (store === null) {
      apply(() => ({ status: 'unavailable' }))
      return
    }
    if (store === undefined) {
      apply(() => loading)
      return
    }
    const id: CallIdentity = seed === undefined ? { ref } : { ref, seed }
    let closed = false
    let issued = 0
    let applied = 0
    const read = async (): Promise<void> => {
      // Reads can finish out of order: only the newest one that has finished is applied, so an old snapshot never replaces a newer one.
      const mine = ++issued
      const events = await store.events()
      if (closed || mine < applied) return
      applied = mine
      const e = firstCallOf(events, id)
      const recorded = e === undefined ? undefined : recordedFrom(e)
      // The same call read again is no change: a write by another tab to another question does not redraw this sheet.
      apply((prev) => (prev.status === 'ready' && prev.recorded?.id === recorded?.id && recorded?.conf === prev.recorded?.conf ? prev : { status: 'ready', recorded }))
    }
    void read().catch(() => {
      if (!closed) apply(() => ({ status: 'unavailable' }))
    })
    const stop = store.subscribe(() => {
      void read().catch(() => undefined)
    })
    return () => {
      closed = true
      stop()
    }
  }, [store, key, ref, seed])

  const commit = useCallback(
    async (draft: CallDraft): Promise<CommitOutcome> => {
      if (store === null || store === undefined) return { status: 'refused', message: 'this browser is not keeping your record' }
      const r = await commitCall(store, draft)
      if (r.status === 'refused') return r
      const call = recordedFrom(r.call)
      if (call === undefined) return { status: 'refused', message: 'the call that stands could not be read' }
      return { status: r.status === 'recorded' ? 'recorded' : 'already', call }
    },
    [store],
  )
  return { log, commit }
}
