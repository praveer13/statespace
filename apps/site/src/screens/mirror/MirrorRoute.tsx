// The route of SCR-mirror: it reads the practice record and the clock and hands the two derivations to the screen. The record is the
// event log in IndexedDB (apps/site/src/storage), read when the page opens and again whenever this tab or another writes to it, so
// a call made in another tab appears here without a reload. Nothing is stored: the Mirror and VRK30 are derived from the events each
// time (I2). The shell (W1-T02) may later provide one store to every screen; until then this route opens its own, as the storage
// README says a screen may, and closes it when the page is left.

import { useEffect, useMemo, useState } from 'react'
import { deriveMirror, deriveVrk30 } from '@statespace/learner/mirror'
import { sureWrongReturns } from '@statespace/learner/schedule'
import type { MirrorContent } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'
import { stampTime } from '@statespace/ledger'
import { openLedgerStore, systemClock } from '../../storage/index.ts'
import { ideaName, siteContent } from './content.ts'
import { MirrorScreen } from './MirrorScreen.tsx'
import type { SureWrongRow } from './MirrorScreen.tsx'

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
    () =>
      state.record === 'ready'
        ? {
            mirror: deriveMirror({ events: state.events, content, now: state.now }),
            vrk: deriveVrk30({ events: state.events, content, now: state.now }),
            sureWrong: sureWrongOf(state.events, state.now.slice(0, 10)),
          }
        : null,
    [state, content],
  )
  return <MirrorScreen record={state.record} mirror={views?.mirror ?? null} vrk={views?.vrk ?? null} ideaName={ideaName} sureWrong={views?.sureWrong ?? []} />
}

/** Every own "sure" miss with the days its fresh variants return in Today (ASSESSMENT.md section 5.7), newest first. */
function sureWrongOf(events: readonly LedgerEvent[], today: string): SureWrongRow[] {
  const { all } = sureWrongReturns(events, today)
  const rows = new Map<string, SureWrongRow>()
  for (const e of events) {
    if (e.conf !== 'sure' || e.ok !== false || e.provenance !== 'own' || e.exposure !== 'unseen') continue
    const d = e.data as { kc?: unknown; call?: { kc?: unknown } } | undefined
    const kc = typeof d?.kc === 'string' ? d.kc : typeof d?.call?.kc === 'string' ? d.call.kc : undefined
    if (kc === undefined) continue
    const open = all.filter((r) => r.ref === e.ref && r.missDay === e.day && r.kc === kc).map((r) => r.from)
    rows.set(e.id, { id: e.id, kc, day: e.day, returns: open })
  }
  return [...rows.values()].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}
