// The harness page. Query parameters pick what it shows:
//   ?view=sheet   the sheet over a call held in the page: item=…, rec=B.think.ok (a recorded call), revealed=1, layout=sheet, help=0
//   ?view=cell    the sheet bound to the real IndexedDB adapter inside a mock lesson cell: item=…, layout=sheet, skip=1, commit=fail,
//                 channel=off (a tab that hears no other tab)
//   ?view=switch  one mounted cell that is given the next question by a button, as a host that steps through questions does
//   ?view=mirror  the screen over a learner's log held in the page: learner=none | few | many
//   ?view=route   the Mirror's route as the app mounts it, over the real adapter; the page first writes the learner's log
//                 (learner=…), and seed=0 leaves the log as it is
// and for every view ?theme=night. `window.harness` is what the browser tests call: events(), append(), reset().
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { deriveMirror, deriveVrk30, callDataOf } from '@statespace/learner/mirror'
import type { CallShape } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'
import { parsePageSource } from '../../../../packages/content/src/build/index.ts'
import { CallIt, CallItCell, itemFromCell, itemFromInstance } from '../../../../apps/site/src/components/call-it/index.ts'
import type { CallItem, RecordedCall } from '../../../../apps/site/src/components/call-it/index.ts'
type CallItItem = CallItem
import instancesJson from '../../../../apps/site/src/components/call-it/fixtures/generated/instances.json'
import l1 from '../../../../apps/site/src/components/call-it/fixtures/tree/content/stages/S1/S1.L1.md?raw'
import l2 from '../../../../apps/site/src/components/call-it/fixtures/tree/content/stages/S1/S1.L2.md?raw'
import l3 from '../../../../apps/site/src/components/call-it/fixtures/tree/content/stages/S1/S1.L3.md?raw'
import { ideaName, siteContent } from '../../../../apps/site/src/screens/mirror/content.ts'
import { MirrorRoute } from '../../../../apps/site/src/screens/mirror/MirrorRoute.tsx'
import { MirrorScreen } from '../../../../apps/site/src/screens/mirror/MirrorScreen.tsx'
import { openLedgerStore } from '../../../../apps/site/src/storage/index.ts'
import type { LedgerStore } from '../../../../apps/site/src/storage/index.ts'
import '../../../../apps/site/src/styles/tokens.css'

const q = new URLSearchParams(location.search)
const theme = q.get('theme')
if (theme) document.documentElement.dataset.theme = theme

// ---- the fixtures, as the app reads them

function authored(): CallItem[] {
  const out: CallItem[] = []
  for (const text of [l1, l2, l3]) {
    const { record } = parsePageSource(text)
    if (!record) continue
    for (const seg of (record as { segments: { kcs?: string[]; blocks: { type: string; cell: number }[] }[] }).segments) {
      for (const block of seg.blocks) {
        if (block.type !== 'instrument') continue
        const item = itemFromCell(block as never, { lesson: (record as { id: string }).id, ...(seg.kcs?.[0] ? { kc: seg.kcs[0] } : {}) })
        if (item) out.push(item)
      }
    }
  }
  return out
}
const AUTHORED = authored()
const GENERATED = (instancesJson as { entries: { instance: never; key: never; instanceRef: string }[] }).entries.map((e) => itemFromInstance(e.instance, e.key, e.instanceRef)).filter((x): x is CallItem => x !== undefined)
const ITEMS: Record<string, CallItem> = {
  verdict: AUTHORED[0] as CallItem,
  value: AUTHORED[1] as CallItem,
  unknown: AUTHORED[2] as CallItem,
  budget: AUTHORED[3] as CallItem,
  gverdict: GENERATED[0] as CallItem,
  interval: GENERATED[3] as CallItem,
  anomaly: GENERATED[4] as CallItem,
  set: GENERATED[6] as CallItem,
  set2: GENERATED[7] as CallItem,
}
const item = ITEMS[q.get('item') ?? 'verdict'] as CallItem

// ---- a learner's log

let n = 0
const minutes = (m: number): string => new Date(Date.UTC(2026, 10, 2, 8, 0) + m * 60_000).toISOString().replace('.000Z', 'Z')
function ev(f: Partial<LedgerEvent> & { at: string }): LedgerEvent {
  n += 1
  return { id: `h-${String(n).padStart(5, '0')}`, v: 1, kind: 'call', ref: 'call:S1.L2/c1', provenance: 'own', exposure: 'unseen', tz: 0, day: f.at.slice(0, 10), dev: 'dev-harness', ...f } as LedgerEvent
}
const exit = (lesson: string, at: string): LedgerEvent => ev({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 700 + n, ok: true, at, data: { exit: { lesson } } })
function calls(count: number, hits: number, conf: 'guess' | 'think' | 'sure', extra: Partial<LedgerEvent> = {}, shape: CallShape = { form: 'choice', options: 3 }, kc = 'KC-1.three-answers'): LedgerEvent[] {
  return Array.from({ length: count }, (_, i) =>
    ev({ kind: 'call', ref: `call:S1.L2/c${n + 1}`, conf, ok: i < hits, at: minutes(20 + n), resp: { picked: 'B' }, data: callDataOf(shape, kc), ...extra }),
  )
}
function fresh(kc: string, days: number, ok: boolean, at?: string): LedgerEvent {
  return ev({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 9000 + n, ok, at: at ?? minutes(10 + days * 24 * 60), data: { kc } })
}
const LEARNERS: Record<string, () => LedgerEvent[]> = {
  none: () => [],
  few: () => [exit('S1.L2', minutes(10)), ...calls(7, 4, 'think')],
  many: () => [
    exit('S1.L1', minutes(5)),
    exit('S1.L2', minutes(10)),
    ...calls(30, 18, 'sure'),
    ...calls(24, 17, 'think'),
    ...calls(21, 8, 'guess'),
    ...calls(22, 9, 'think', {}, { form: 'set', statements: 5 }),
    ...calls(25, 25, 'sure', { provenance: 'assisted' }),
    ...calls(2, 1, 'guess', { exposure: 'seen' }),
    ...calls(1, 1, 'think', { provenance: 'agent' }),
    ...['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08'].map((d) => fresh('KC-1.three-answers', 0, true, `${d}T09:00:00Z`)),
    fresh('KC-1.violation-as-sat', 40, true),
    fresh('KC-1.three-answers', 41, true),
  ],
}
const events = (LEARNERS[q.get('learner') ?? 'many'] ?? LEARNERS.many!)()
const NOW = '2027-06-01T00:00:00Z'

// ---- the pages

function recordedOf(spec: string | null): RecordedCall | undefined {
  if (!spec) return undefined
  const [picked, conf, result] = spec.split('.')
  return { id: 'rec', conf: conf as RecordedCall['conf'], ok: result === 'ok', picked: picked ?? null, answers: null, provenance: 'own' }
}

const never = (): Promise<never> => Promise.reject(new Error('the harness page has no store'))

function SheetPage() {
  const rec = q.get('rec')
  const setRec = item.form === 'set' && rec ? { id: 'rec', conf: 'think' as const, ok: false, picked: null, answers: Object.fromEntries((item as { statements: { id: string; truth: boolean }[] }).statements.map((s, i) => [s.id, i % 2 === 0 ? s.truth : !s.truth])), provenance: 'own' as const } : undefined
  return (
    <MockCell>
      <CallIt item={item} recorded={item.form === 'set' ? setRec : recordedOf(rec)} onCommit={never} revealed={q.get('revealed') === '1'} layout={q.get('layout') === 'sheet' ? 'sheet' : 'inline'} helpToggle={q.get('help') !== '0'} {...(q.get('skip') === '1' ? { skip: { onSkip: () => document.documentElement.setAttribute('data-skipped', 'yes') } } : {})} />
    </MockCell>
  )
}

/** A lesson cell around the sheet: a heading, scrolling code, a direction, and a recorded-result button before the sheet. */
function MockCell({ children, started }: { children: React.ReactNode; started?: { callsInLog: number[] } | null }) {
  return (
    <main className="h-main">
      <h1>Lesson cell</h1>
      <article className="h-cell" aria-label="An instrument cell">
        <p>Query asserts: both balances end below zero. <code>sat</code> means such a transfer exists.</p>
        <pre tabIndex={0} aria-label="Code, scrolls sideways">{`from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, a - amount < 0, b + amount > 1000000000000000000, a + b + amount > 1000000000000)\nprint(s.check())`}</pre>
        <p>
          <button type="button" className="h-button">Show the recorded result</button>
        </p>
        {children}
        {started ? (
          <p className="h-run" data-run-started="yes" data-calls-in-log={started.callsInLog.join(',')}>Run started</p>
        ) : null}
        <p>Text after the cell, which the docked sheet must never cover.</p>
        <p>
          <a href="#end">A link after the sheet</a>
        </p>
      </article>
      <style>{`
        .h-main { box-sizing: border-box; padding: 0 var(--gutter) var(--space-7); max-width: 40rem; margin: 0 auto; font-family: var(--font-structure); }
        .h-cell { padding: var(--space-3) 0; }
        .h-cell pre { border: 1px solid var(--rule); background: var(--paper); padding: var(--space-3); }
        .h-button { min-height: 44px; padding: 0 var(--space-4); background: var(--sheet); color: var(--ink); border: 1px solid var(--ink); font: inherit; font-weight: 600; }
      `}</style>
    </main>
  )
}

let storePromise: Promise<LedgerStore> | undefined
// channel=off opens a store that hears no other tab: a stale tab, which reads the log only when it writes
const getStore = (): Promise<LedgerStore> => (storePromise ??= openLedgerStore(q.get('channel') === 'off' ? { channel: null } : {}))

function CellPage() {
  const [store, setStore] = useState<LedgerStore | null | undefined>(undefined)
  // every time the host's run starts, with the number of calls on this question the log held at that moment
  const [started, setStarted] = useState<{ callsInLog: number[] } | null>(null)
  const [revealed, setRevealed] = useState(false)
  if (store === undefined) {
    void getStore().then((s) => setStore(q.get('commit') === 'fail' ? ({ events: () => s.events(), subscribe: (f: never) => s.subscribe(f), status: () => s.status(), record: () => Promise.reject(new Error('QuotaExceededError')) } as unknown as LedgerStore) : s))
    return null
  }
  return (
    <MockCell started={started}>
      <CallItCell
        store={store}
        item={item}
        actionLabel="Run Z3 here"
        layout={q.get('layout') === 'sheet' ? 'sheet' : 'inline'}
        revealed={revealed}
        {...(q.get('skip') === '1' ? { skip: { onSkip: () => document.documentElement.setAttribute('data-skipped', 'yes') } } : {})}
        onCommitted={() => {
          // the host's run starts here: the call must already be in the log
          void (store as LedgerStore).events().then((all) => {
            const held = all.filter((e) => e.kind === 'call' && e.ref === item.identity.ref).length
            setStarted((s) => ({ callsInLog: [...(s?.callsInLog ?? []), held] }))
            setRevealed(true)
          })
        }}
      />
    </MockCell>
  )
}

/**
 * One mounted sheet, given another question each time the button is pressed: the same two questions, over and over. `mode=direct`
 * is the sheet on its own, as a host that keeps its own record uses it (the calls are kept in the page); otherwise it is the cell
 * bound to the real adapter.
 */
function SwitchPage() {
  const direct = q.get('mode') === 'direct'
  const [store, setStore] = useState<LedgerStore | null | undefined>(direct ? null : undefined)
  const [n, setN] = useState(0)
  const [kept] = useState(() => new Map<string, RecordedCall>())
  if (store === undefined) {
    void getStore().then(setStore)
    return null
  }
  const which = (n % 2 === 0 ? ITEMS.verdict : ITEMS.unknown) as CallItItem
  const key = `${which.identity.ref}#${which.identity.seed ?? ''}`
  return (
    <MockCell>
      <p>
        <button type="button" className="h-button" data-next onClick={() => setN((x) => x + 1)}>
          Next question
        </button>{' '}
        <span data-question>{which.identity.ref}</span>
      </p>
      {direct ? (
        <CallIt
          item={which}
          recorded={kept.get(key)}
          onCommit={async (draft) => {
            const call: RecordedCall = { id: `kept-${kept.size}`, conf: draft.conf, ok: draft.ok, picked: (draft.resp as { picked?: string }).picked ?? null, answers: null, provenance: draft.provenance }
            kept.set(key, call)
            return { status: 'recorded', call }
          }}
        />
      ) : (
        <CallItCell store={store} item={which} actionLabel="Run Z3 here" />
      )}
    </MockCell>
  )
}

function MirrorPage() {
  const mirror = deriveMirror({ events, content: siteContent, now: NOW })
  const vrk = deriveVrk30({ events, content: siteContent, now: NOW })
  return (
    <main className="h-main">
      <MemoryRouter initialEntries={['/mirror']}>
        <MirrorScreen record="ready" mirror={mirror} vrk={vrk} ideaName={ideaName} />
      </MemoryRouter>
      <style>{`.h-main { box-sizing: border-box; padding: 0 var(--gutter) var(--space-7); }`}</style>
    </main>
  )
}

function RoutePage() {
  return (
    <main className="h-main">
      <MemoryRouter initialEntries={['/mirror']}>
        <MirrorRoute />
      </MemoryRouter>
      <style>{`.h-main { box-sizing: border-box; padding: 0 var(--gutter) var(--space-7); }`}</style>
    </main>
  )
}

;(window as unknown as { harness: unknown }).harness = {
  events: async (): Promise<LedgerEvent[]> => (await getStore()).events(),
  append: async (list: LedgerEvent[]): Promise<void> => (await getStore()).append(list),
  reset: async (): Promise<void> => (await getStore()).reset(),
  learner: (name: string): LedgerEvent[] => (LEARNERS[name] ?? LEARNERS.many!)(),
  items: Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.identity])),
}

;(async () => {
  if (q.get('view') === 'route' && q.get('seed') !== '0') {
    const store = await getStore()
    await store.append(events)
  }
  const view = q.get('view') ?? 'sheet'
  createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode>{view === 'cell' ? <CellPage /> : view === 'switch' ? <SwitchPage /> : view === 'mirror' ? <MirrorPage /> : view === 'route' ? <RoutePage /> : <SheetPage />}</StrictMode>)
  document.documentElement.dataset.harness = 'ready'
})()
