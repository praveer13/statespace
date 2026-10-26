// The harness page. Query parameters pick what it shows:
//   ?mode=screen   the screen over a learner's events held in the page (the default)
//   ?mode=route    the route as the app mounts it: it opens the real IndexedDB adapter, reads the events and subscribes; the page
//                  first writes the learner's events through the adapter, and `?mode=route&seed=0` leaves the log as it is
//   ?learner=none | some | all   which events: none, Boot and S1.L1 (SP-1.1 mounted), or every S1 lesson with SP-1.1 and SP-1.2 kept
//   ?theme=night   the night theme   ?open=all   every label open (below 900 px)   ?hash=SP-1.4   a fragment to follow
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { openLedgerStore } from '../../../../apps/site/src/storage/index.ts'
import cabinetData from '../../../../apps/site/src/screens/specimens/data/cabinet.generated.json'
import type { Cabinet } from '../../../../apps/site/src/screens/specimens/model/types.ts'
import { SpecimensRoute } from '../../../../apps/site/src/screens/specimens/SpecimensRoute.tsx'
import { SpecimensScreen } from '../../../../apps/site/src/screens/specimens/SpecimensScreen.tsx'

const q = new URLSearchParams(location.search)
const theme = q.get('theme')
if (theme) document.documentElement.dataset.theme = theme
const cabinet = cabinetData as unknown as Cabinet

let n = 0
const at = (day: string, time = '08:10:00'): { at: string; tz: number; day: string } => ({ at: `${day}T${time}Z`, tz: 0, day })
function call(lesson: string, day: string, time?: string): LedgerEvent {
  n += 1
  return { id: `h-call-${n}`, v: 1, kind: 'call', ref: `call:${lesson}/c1`, provenance: 'own', exposure: 'unseen', dev: 'dev-harness', ...at(day, time) } as LedgerEvent
}
function refind(specimen: string, day: string): LedgerEvent {
  n += 1
  return { id: `h-refind-${n}`, v: 1, kind: 'item', ref: 'item:GEN-find-the-witness/t1', provenance: 'own', exposure: 'unseen', seed: 1000 + n, ok: true, data: { refind: { specimen } }, dev: 'dev-harness', ...at(day) } as LedgerEvent
}

/** A learner as GATE-a11y's fixture has one on the 9th of November, then more. The harness fixes today at the 12th. */
const LEARNERS: Record<string, LedgerEvent[]> = {
  none: [],
  some: [call('S1.L0', '2026-11-02'), call('S1.L1', '2026-11-03')],
  all: [
    call('S1.L0', '2026-11-02'),
    call('S1.L1', '2026-11-02', '08:50:00'),
    call('S1.L2', '2026-11-03'),
    call('S1.L3', '2026-11-04'),
    call('S1.L4', '2026-11-05'),
    call('S1.L5', '2026-11-06'),
    refind('SP-1.1', '2026-11-10'),
    refind('SP-1.2', '2026-11-12'),
  ],
}
const events = LEARNERS[q.get('learner') ?? 'all'] ?? LEARNERS.all!
const open = q.get('open') === 'all' ? cabinet.specimens.map((s) => s.record.id) : []
const hash = q.get('hash')

async function seed(): Promise<void> {
  const store = await openLedgerStore()
  await store.append(events)
  store.close()
}

function Page() {
  return (
    <main style={{ padding: '0 var(--gutter) var(--space-7)' }}>
      <MemoryRouter initialEntries={[`/specimens${hash ? `#${hash}` : ''}`]}>
        {q.get('mode') === 'route' ? <SpecimensRoute /> : <SpecimensScreen cabinet={cabinet} events={events} today="2026-11-12" record="ready" initialOpen={open} />}
      </MemoryRouter>
    </main>
  )
}

/** What a second tab does in the cross-tab check: write one call through the adapter, as a lesson's cell would. */
;(window as unknown as { harness: unknown }).harness = {
  append: async (lesson: string, day: string): Promise<void> => {
    const store = await openLedgerStore()
    await store.append([call(lesson, day)])
    store.close()
  },
}

;(async () => {
  if (q.get('mode') === 'route' && q.get('seed') !== '0') await seed()
  createRoot(document.getElementById('root') as HTMLElement).render(<Page />)
  document.documentElement.dataset.harness = 'ready'
})()
