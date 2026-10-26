// The route of SCR-specimens: it reads the practice record and the local date, and hands them to the screen. The record
// is the event log in IndexedDB (apps/site/src/storage), read when the page opens and again whenever this tab or another
// writes to it, so a call made in another tab mounts its specimen here without a reload. Nothing is stored: the status of
// every specimen is derived from the events each time (I2).
//
// The shell (W1-T02) may later provide one store to every screen; until it does, this route opens its own, as the storage
// README says a screen may, and closes it when the page is left.

import { useEffect, useState } from 'react'
import type { LedgerEvent } from '@statespace/ledger'
import { stampTime } from '@statespace/ledger'
import { openLedgerStore, systemClock } from '../../storage/index.ts'
import cabinetData from './data/cabinet.generated.json'
import type { Cabinet } from './model/types.ts'
import { SpecimensScreen } from './SpecimensScreen.tsx'

/** The cabinet the build wrote (scripts/spikes/W1-T16/build-cabinet.mjs); a test fails when it is not what the records and runs build. */
const CABINET = cabinetData as unknown as Cabinet

const localToday = (): string => {
  const now = systemClock.nowMs()
  return stampTime(now, systemClock.tzAt(now)).day
}

interface RecordState {
  readonly record: 'loading' | 'ready' | 'unavailable'
  readonly events: readonly LedgerEvent[]
  readonly today: string
}

export function SpecimensRoute() {
  const [state, setState] = useState<RecordState>({ record: 'loading', events: [], today: localToday() })
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
          if (!closed) setState({ record: 'ready', events, today: localToday() })
        }
        await read()
        stop = store.subscribe(() => {
          void read()
        })
      } catch {
        if (!closed) setState({ record: 'unavailable', events: [], today: localToday() })
      }
    })()
    return () => {
      closed = true
      stop?.()
      close?.()
    }
  }, [])
  return <SpecimensScreen cabinet={CABINET} events={state.events} today={state.today} record={state.record} />
}
