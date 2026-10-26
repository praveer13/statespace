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
