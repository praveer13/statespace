// The route of SCR-mirror: it reads the practice record and the clock and hands the two derivations to the screen. The record is the
// event log in IndexedDB (apps/site/src/storage), read when the page opens and again whenever this tab or another writes to it, so
// a call made in another tab appears here without a reload. Nothing is stored: the Mirror and VRK30 are derived from the events each
// time (I2). The shell (W1-T02) may later provide one store to every screen; until then this route opens its own, as the storage
// README says a screen may, and closes it when the page is left.

import { useEffect, useMemo, useState } from 'react'
import { deriveMirror, deriveVrk30 } from '@statespace/learner/mirror'
import type { MirrorContent } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'
import { stampTime } from '@statespace/ledger'
import { openLedgerStore, systemClock } from '../../storage/index.ts'
import { ideaName, siteContent } from './content.ts'
import { MirrorScreen } from './MirrorScreen.tsx'

const nowOf = (): string => {
  const ms = systemClock.nowMs()
  return stampTime(ms, systemClock.tzAt(ms)).at
}

interface RecordState {
  readonly record: 'loading' | 'ready' | 'unavailable'
  readonly events: readonly LedgerEvent[]
  readonly now: string
}

export function MirrorRoute({ content = siteContent }: { readonly content?: MirrorContent }) {
  const [state, setState] = useState<RecordState>({ record: 'loading', events: [], now: nowOf() })
  useEffect(() => {
    let closed = false
    let stop: (() => void) | undefined
    let close: (() => void) | undefined
    ;(async () => {
      try {
        const store = await openLedgerStore()
        if (closed) {
          store.close()
          return
        }
        close = () => store.close()
        const read = async (): Promise<void> => {
          const events = await store.events()
          if (!closed) setState({ record: 'ready', events, now: nowOf() })
        }
        await read()
        stop = store.subscribe(() => {
          void read()
        })
      } catch {
        if (!closed) setState({ record: 'unavailable', events: [], now: nowOf() })
      }
    })()
    return () => {
      closed = true
      stop?.()
      close?.()
    }
  }, [])
  const views = useMemo(
    () => (state.record === 'ready' ? { mirror: deriveMirror({ events: state.events, content, now: state.now }), vrk: deriveVrk30({ events: state.events, content, now: state.now }) } : null),
    [state, content],
  )
  return <MirrorScreen record={state.record} mirror={views?.mirror ?? null} vrk={views?.vrk ?? null} ideaName={ideaName} />
}
