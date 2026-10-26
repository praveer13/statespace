// One ledger store per tab, shared by every screen that reads or writes the practice record (apps/site/src/storage). It
// opens on first use and stays open for the tab's life; screens derive their views from its events at read time (I2).

import { useEffect, useState } from 'react'
import type { LedgerEvent } from '@statespace/ledger'
import { openLedgerStore } from '../storage/index.ts'
import type { LedgerStore } from '../storage/index.ts'

let opening: Promise<LedgerStore | null> | undefined

/** The tab's store, or null when this browser cannot keep one (no IndexedDB, a blocked profile). */
export function sharedStore(): Promise<LedgerStore | null> {
  opening ??= openLedgerStore().catch(() => null)
  return opening
}

/** The tab's store: undefined while it opens, null when the browser cannot keep one. */
export function useStore(): LedgerStore | null | undefined {
  const [store, setStore] = useState<LedgerStore | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    void sharedStore().then((s) => {
      if (live) setStore(s)
    })
    return () => {
      live = false
    }
  }, [])
  return store
}

export type EventsState = { readonly status: 'loading' } | { readonly status: 'unavailable' } | { readonly status: 'ready'; readonly events: readonly LedgerEvent[] }

/** The events in fold order, read again whenever this tab or another writes. */
export function useEvents(store: LedgerStore | null | undefined): EventsState {
  const [state, setState] = useState<EventsState>({ status: 'loading' })
  useEffect(() => {
    if (store === undefined) return
    if (store === null) {
      setState({ status: 'unavailable' })
      return
    }
    let live = true
    let issued = 0
    const read = async (): Promise<void> => {
      const mine = ++issued
      try {
        const events = await store.events()
        if (live && mine === issued) setState({ status: 'ready', events })
      } catch {
        if (live) setState({ status: 'unavailable' })
      }
    }
    void read()
    const stop = store.subscribe(() => void read())
    return () => {
      live = false
      stop()
    }
  }, [store])
  return store === null ? { status: 'unavailable' } : state
}

// ---- the read-only lab mirror and receipt import (ARCHITECTURE.md sections 3.4 and 8.3; labs/README.md section 8)

/** A file of the read-only mirror: a disposable copy of the lab repository, never the record. */
export type MirrorFile = Awaited<ReturnType<LedgerStore['listMirror']>>[number]

export type MirrorState = { readonly status: 'loading' } | { readonly status: 'unavailable' } | { readonly status: 'ready'; readonly files: readonly MirrorFile[] }

/** The mirror's files, read again whenever this tab or another changes the store. */
export function useMirror(store: LedgerStore | null | undefined): MirrorState {
  const [state, setState] = useState<MirrorState>({ status: 'loading' })
  useEffect(() => {
    if (store === undefined) return
    if (store === null) {
      setState({ status: 'unavailable' })
      return
    }
    let live = true
    const read = async (): Promise<void> => {
      try {
        const files = await store.listMirror()
        if (live) setState({ status: 'ready', files })
      } catch {
        if (live) setState({ status: 'unavailable' })
      }
    }
    void read()
    const stop = store.subscribe(() => void read())
    return () => {
      live = false
      stop()
    }
  }, [store])
  return store === null ? { status: 'unavailable' } : state
}

/** What receipt import writes: one receipt-import event, and the file's text into the mirror at its path. */
export interface ReceiptWrite {
  readonly sha256: string
  readonly path: string
  readonly text: string
  readonly provenance: LedgerEvent['provenance']
  readonly data: Record<string, unknown>
}

/**
 * Keep an imported receipt: the file joins the mirror (a receipt overlays it until the next lab bundle replaces it
 * whole), and the log gains one receipt-import event, unless it already holds one for these bytes. Returns whether
 * the event is new.
 */
export async function keepReceipt(store: LedgerStore, w: ReceiptWrite): Promise<boolean> {
  const files = await store.listMirror()
  const kept = files.filter((f) => f.path !== w.path)
  await store.replaceMirror([...kept, { path: w.path, kind: 'receipt', sha256: w.sha256, text: w.text }])
  const ref = `receipt-import:${w.sha256}`
  const events = await store.events()
  if (events.some((e) => e.kind === 'receipt-import' && e.ref === ref)) return false
  await store.record({ kind: 'receipt-import', ref, provenance: w.provenance, exposure: 'unseen', data: w.data })
  return true
}
