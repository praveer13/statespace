// The IndexedDB adapter (apps/site/src/storage) against fake-indexeddb: the outbox makes a write durable
// before the commit, a later tab drains what a closed tab left, two tabs with stale views (their conflicting
// imports, appends and leftover outboxes included) and a double import give identical logs, undo restores the
// log, the experiment seed survives export and merge-import, a newer schema makes the store read-only, and
// every keep/kill read keeps a record of its own.

import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type { RunRecord } from '@statespace/schema'
import { IDBFactory } from 'fake-indexeddb'
import type { ChannelFactory, ChannelLike, LedgerChange, LedgerStore, LedgerStoreOptions } from '../../../../apps/site/src/storage/index.ts'
import { KEEPKILL_READ_PREFIX, OUTBOX_PREFIX, openLedgerStore, STORE } from '../../../../apps/site/src/storage/index.ts'
import type { LedgerEvent } from '../../src/index.ts'
import { encodeLog, eventSetDigest, governingDraw, LedgerError, logDigest, logFrom, mergeLogs, sameLog, snapshotOf, stampTime } from '../../src/index.ts'
import { readComparison } from '../../src/keepkill/index.ts'
import { genDraw, genEvent, genEvents, int, pick, rng, SEEDS, variantOf } from '../helpers.ts'
import { draw as kkDraw, ev, stubContent } from '../kk-helpers.ts'

/** localStorage for tests: one per origin, shared by the tabs of a test. */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()
  failWrites = false
  get length(): number {
    return this.map.size
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.map.set(k, String(v))
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
  clear(): void {
    this.map.clear()
  }
  keys(): string[] {
    return [...this.map.keys()]
  }
}

/** Every store a test opens is closed at the end, so no channel keeps the process alive. */
const opened: LedgerStore[] = []
after(() => {
  for (const s of opened) s.close()
})

let origins = 0
/** A fresh origin: its own IndexedDB, localStorage and channel namespace. */
function origin() {
  origins += 1
  const indexedDB = new IDBFactory()
  const storage = new MemoryStorage()
  const prefix = `test-origin-${origins}-${process.pid}`
  const channel: ChannelFactory = (name) => new BroadcastChannel(`${prefix}:${name}`) as unknown as ChannelLike
  let ids = 0
  let clockMs = Date.UTC(2026, 10, 2, 9, 0)
  const opts = (extra: Partial<LedgerStoreOptions> = {}): LedgerStoreOptions => ({
    indexedDB,
    storage,
    channel,
    randomId: () => `id-${origins}-${++ids}`,
    randomUint32: () => 2654435769,
    clock: { nowMs: () => (clockMs += 1000), tzAt: () => 60 },
    ...extra,
  })
  const open = async (extra?: Partial<LedgerStoreOptions>): Promise<LedgerStore> => {
    const s = await openLedgerStore(opts(extra))
    opened.push(s)
    return s
  }
  return { indexedDB, storage, open }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20))

const input = (r: () => number) => {
  const e = genEvent(r)
  const { id: _id, v: _v, at: _at, tz: _tz, day: _day, dev: _dev, ...rest } = e
  return rest
}

test('a recorded event is in the outbox before record() returns, and leaves it once committed', async () => {
  const o = origin()
  const tab = await o.open()
  try {
    assert.deepEqual(tab.status(), { mode: 'ready', outboxDurable: true, crossTab: true, drained: 0, problems: [] })
    const pending = tab.record({ kind: 'call', ref: 'call:S1.L3/c1', provenance: 'own', exposure: 'unseen', conf: 'sure' })
    const keys = o.storage.keys().filter((k) => k.startsWith(OUTBOX_PREFIX))
    assert.equal(keys.length, 1, 'the call is durable before its run is sent (M-call-it)')
    assert.match(o.storage.getItem(keys[0] as string) ?? '', /call:S1\.L3\/c1/)
    const event = await pending
    assert.equal(event.dev, tab.dev)
    assert.equal(o.storage.keys().filter((k) => k.startsWith(OUTBOX_PREFIX)).length, 0)
    assert.deepEqual((await tab.events()).map((e) => e.id), [event.id])
  } finally {
    tab.close()
  }
})

test('a tab that closes before its commit loses nothing: the next tab drains its outbox; refused entries are reported', async () => {
  const o = origin()
  const first = await o.open()
  const dev = first.dev
  const r = rng(1)
  const e1 = genEvent(r)
  const e2 = genEvent(r)
  first.close() // the database is gone before the commit: the append fails after the outbox write
  await assert.rejects(first.append([e1, e2]))
  assert.equal(o.storage.keys().filter((k) => k.startsWith(OUTBOX_PREFIX)).length, 1)
  // Another (crashed) tab's outbox with one valid and one tampered entry.
  o.storage.setItem(`${OUTBOX_PREFIX}dead-tab`, JSON.stringify({ v: 1, entries: [{ seq: 1, events: [genEvent(r)], draws: [] }, { seq: 2, events: [{ id: 'bad' }], draws: [] }] }))
  const next = await o.open()
  try {
    assert.equal(next.dev, dev, 'the device id persists in the profile')
    assert.equal(next.status().drained, 3)
    assert.equal(next.status().problems.length, 1)
    const ids = new Set((await next.events()).map((e) => e.id))
    assert.ok(ids.has(e1.id) && ids.has(e2.id))
    assert.equal(ids.size, 3)
    assert.equal(o.storage.keys().filter((k) => k.startsWith(OUTBOX_PREFIX)).length, 0)
  } finally {
    next.close()
  }
})

test('without localStorage the outbox reports that it is not durable, and writes still commit', async () => {
  const o = origin()
  o.storage.failWrites = true
  const tab = await o.open()
  try {
    const e = await tab.record({ kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen' })
    assert.equal(tab.status().outboxDurable, false)
    assert.equal((await tab.events())[0]?.id, e.id)
  } finally {
    tab.close()
  }
  const none = await origin().open({ storage: null, channel: null })
  try {
    assert.equal(none.status().outboxDurable, false)
    assert.equal(none.status().crossTab, false)
    await none.record({ kind: 'note', ref: 'note:2', provenance: 'own', exposure: 'seen' })
    assert.equal((await none.events()).length, 1)
  } finally {
    none.close()
  }
})

test('property: two tabs with stale views, interleaved appends, merges, conflicting re-imports and appends, and drained outboxes give identical logs', async () => {
  // A conflict reaches the database by two paths, and both are exercised: merge() (an import) and commit(), the
  // write path of every append and of every drained outbox. The conflicting writes are decided from the tab's
  // view, which for b is the one it read long ago, so a stale tab's leftover outbox entry can land after another
  // tab imported a different record under the same id.
  const kinds = ['record', 'append', 'merge', 'conflict', 'append-conflict', 'drain-conflict'] as const
  const exercised = new Map<(typeof kinds)[number], number>(kinds.map((k) => [k, 0]))
  for (const seed of SEEDS.slice(0, 12)) {
    const r = rng(seed)
    const o = origin()
    const a = await o.open()
    const b = await o.open({ channel: null }) // b hears nothing: its view goes stale between its own reads
    const drainers: LedgerStore[] = []
    try {
      const written: LedgerEvent[] = []
      const start = genEvents(r, 15)
      await a.merge({ events: start })
      written.push(...start)
      const staleB = await b.log()
      /** A different record under an id the tab has seen: b decides from the view it read long ago. */
      const conflicting = (tab: LedgerStore): LedgerEvent => {
        const seen = [...(tab === b ? staleB : logFrom(written)).events.values()]
        const v = variantOf(r, pick(r, seen))
        written.push(v)
        return v
      }
      const ops: Promise<unknown>[] = []
      for (let i = 0; i < 25; i++) {
        const tab = pick(r, [a, b])
        const op = pick(r, kinds)
        exercised.set(op, (exercised.get(op) ?? 0) + 1)
        if (op === 'record') {
          const p = tab.record(input(r))
          ops.push(p.then((e) => written.push(e)))
        } else if (op === 'append') {
          const e = genEvent(r)
          written.push(e)
          ops.push(tab.append([e]))
        } else if (op === 'merge') {
          const batch = genEvents(r, int(r, 1, 6))
          written.push(...batch)
          ops.push(tab.merge({ events: batch }))
        } else if (op === 'conflict') {
          ops.push(tab.merge({ events: [conflicting(tab)] })) // a re-import: merge()
        } else if (op === 'append-conflict') {
          ops.push(tab.append([conflicting(tab)])) // an action's write: the outbox, then commit()
        } else {
          // The tab wrote the record to its outbox and closed before its commit. A tab that opens later drains the
          // outbox through commit(): half the time one opens now, while other writes are in flight; the rest wait
          // for the tab opened at the end.
          const v = conflicting(tab)
          o.storage.setItem(`${OUTBOX_PREFIX}closed-${seed}-${i}`, JSON.stringify({ v: 1, entries: [{ seq: 1, events: [v], draws: [] }] }))
          if (r() < 0.5) ops.push(o.open().then((t) => drainers.push(t)))
        }
        if (r() < 0.3) await Promise.all(ops.splice(0))
      }
      await Promise.all(ops)
      const c = await o.open() // drains every outbox still in storage
      drainers.push(c)
      assert.deepEqual(o.storage.keys().filter((k) => k.startsWith(OUTBOX_PREFIX)), [], `seed ${seed}: every outbox is drained and removed`)
      const expected = eventSetDigest(logFrom(written))
      assert.equal(eventSetDigest(await a.log()), expected, `seed ${seed}: tab a`)
      assert.equal(eventSetDigest(await b.log()), expected, `seed ${seed}: tab b, without any cross-tab message`)
      assert.equal(eventSetDigest(await c.log()), expected, `seed ${seed}: tab c, which drained the closed tabs' outboxes`)
    } finally {
      a.close()
      b.close()
      for (const t of drainers) t.close()
    }
  }
  for (const [op, n] of exercised) assert.ok(n >= 5, `the seeds exercise ${op} at least five times (${n})`)
})

test('a double import gives the identical log, and the second preview finds only duplicates', async () => {
  const o = origin()
  const tab = await o.open()
  try {
    const r = rng(2)
    await tab.merge({ events: genEvents(r, 20) })
    const bundle = JSON.parse(encodeLog(logFrom(genEvents(r, 30), [genDraw(r)]))) as { events: LedgerEvent[]; expSeeds: [] }
    await tab.merge(bundle)
    const once = await tab.log()
    const preview = await tab.merge(bundle)
    assert.deepEqual(preview.added, [])
    assert.deepEqual(preview.conflicts, [])
    assert.equal(preview.duplicates.length, logFrom(bundle.events).events.size)
    assert.ok(sameLog(await tab.log(), once))
  } finally {
    tab.close()
  }
})

test('undo restores the log exactly, keeps events appended since, and a second undo redoes', async () => {
  const o = origin()
  const tab = await o.open()
  try {
    const r = rng(3)
    await tab.merge({ events: genEvents(r, 10) })
    const before = logDigest(await tab.log())
    const imported = genEvents(r, 12, 0.5)
    await tab.merge({ events: [...imported, variantOf(r, (await tab.events())[0] as LedgerEvent)] })
    const afterMerge = logDigest(await tab.log())
    assert.notEqual(afterMerge, before)
    assert.equal(await tab.undo(), true)
    assert.equal(logDigest(await tab.log()), before, 'undo restores the log exactly')
    assert.equal(await tab.undo(), true)
    assert.equal(logDigest(await tab.log()), afterMerge, 'undoing the undo redoes the merge')
    // An event appended after a replace survives its undo.
    const replaced = genEvents(r, 5, 0)
    const beforeReplace = await tab.log()
    await tab.replace({ events: replaced })
    assert.equal((await tab.events()).length, 5)
    const later = await tab.record(input(r))
    await tab.undo()
    assert.ok(sameLog(await tab.log(), mergeLogs(beforeReplace, { events: [later] })))
    // Reset keeps nothing but the draw, and its undo brings everything back.
    const beforeReset = logDigest(await tab.log())
    await tab.reset()
    assert.equal((await tab.events()).length, 0)
    await tab.undo()
    assert.equal(logDigest(await tab.log()), beforeReset)
    assert.ok((await tab.checkpoints()).length <= 5, 'checkpoints are capped')
    assert.equal((await tab.checkpoints())[0]?.reason, 'undo')
    assert.equal(await (await origin().open()).undo(), false, 'nothing to undo in a fresh profile')
  } finally {
    tab.close()
  }
})

test('the experiment seed: drawn once before the first event, never redrawn, and it survives export and merge-import', async () => {
  const o = origin()
  const tab = await o.open()
  const other = origin()
  const device2 = await other.open({ randomUint32: () => 123, clock: { nowMs: () => Date.UTC(2026, 10, 9), tzAt: () => 0 } })
  try {
    const draw = await tab.drawExpSeed()
    assert.equal(draw.expSeed, 2654435769)
    assert.equal(draw.dev, tab.dev)
    await assert.rejects(tab.drawExpSeed(), /never redrawn/)
    await tab.record({ kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen' })
    // The second device drew later; after merging the first device's export, the earliest draw governs.
    const draw2 = await device2.drawExpSeed()
    assert.equal(draw2.expSeed, 123)
    await device2.record({ kind: 'note', ref: 'note:2', provenance: 'own', exposure: 'seen' })
    await assert.rejects(device2.drawExpSeed())
    const exported = JSON.parse(JSON.stringify(await tab.snapshot())) as { events: LedgerEvent[]; expSeeds: [] }
    await device2.merge(exported)
    const merged = await device2.log()
    assert.deepEqual(governingDraw(merged.expSeeds), draw, 'the first device drew a week earlier')
    assert.equal(merged.expSeeds.length, 2, 'the superseded draw is kept, so its exposures count as deviations')
    // Replace-import keeps every draw too, and undo restores the draws exactly.
    await device2.replace({ events: [], expSeeds: [] })
    assert.equal((await device2.log()).expSeeds.length, 2)
    await device2.undo()
    assert.ok(sameLog(await device2.log(), merged))
    // A fresh profile with events refuses the draw.
    const late = await origin().open()
    await late.record({ kind: 'note', ref: 'note:3', provenance: 'own', exposure: 'seen' })
    await assert.rejects(late.drawExpSeed(), /before the first event/)
    late.close()
  } finally {
    tab.close()
    device2.close()
  }
})

test('other tabs hear every change and re-read the log', async () => {
  const o = origin()
  const a = await o.open()
  const b = await o.open()
  try {
    const heard: LedgerChange[] = []
    b.subscribe((c) => heard.push(c))
    const before = await b.events()
    const e = await a.record({ kind: 'view', ref: 'view:D-03', provenance: 'own', exposure: 'seen' })
    await tick()
    assert.deepEqual(heard, [{ reason: 'append', local: false }])
    assert.deepEqual((await b.events()).map((x) => x.id), [...before.map((x) => x.id), e.id])
    const mine: LedgerChange[] = []
    const off = a.subscribe((c) => mine.push(c))
    await a.setWorking('tab', 'today')
    off()
    assert.deepEqual(mine, [{ reason: 'working', local: true }])
  } finally {
    a.close()
    b.close()
  }
})

test('a profile holding a newer schema opens read-only and refuses writes; an upgrade by another tab makes this one read-only', async () => {
  const o = origin()
  await new Promise<void>((resolve, reject) => {
    const req = o.indexedDB.open('statespace', 2)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE.events, { keyPath: 'id' })
      req.result.createObjectStore(STORE.meta, { keyPath: 'key' })
    }
    req.onsuccess = () => {
      req.result.close()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
  const tab = await o.open()
  try {
    assert.equal(tab.status().mode, 'read-only')
    assert.equal(tab.status().reason, 'newer-schema')
    await assert.rejects(tab.record({ kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen' }), /read-only/)
    await assert.rejects(tab.readKeepKill({ comparison: 'witness-generalization', phase: 'interim', content: stubContent() }), /read-only/, 'a read whose record cannot be kept is not taken')
  } finally {
    tab.close()
  }
  // A newer schema that dropped the meta store still opens, read-only.
  const bare = origin()
  await new Promise<void>((resolve, reject) => {
    const req = bare.indexedDB.open('statespace', 3)
    req.onupgradeneeded = () => req.result.createObjectStore('elsewhere')
    req.onsuccess = () => {
      req.result.close()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
  const bareTab = await bare.open()
  assert.deepEqual([bareTab.status().mode, bareTab.dev], ['read-only', 'read-only'])
  bareTab.close()
  // A newer data version recorded in meta does the same.
  const p = origin()
  const first = await p.open()
  first.close()
  await new Promise<void>((resolve, reject) => {
    const req = p.indexedDB.open('statespace', 1)
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE.meta, 'readwrite')
      tx.objectStore(STORE.meta).put({ key: 'ledger', schemaVersion: 2 })
      tx.oncomplete = () => {
        req.result.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
  const second = await p.open()
  assert.equal(second.status().reason, 'newer-schema')
  second.close()
  // Another tab upgrading the database closes this one's connection and makes it read-only.
  const q = origin()
  const live = await q.open()
  const changes: LedgerChange[] = []
  live.subscribe((c) => changes.push(c))
  await new Promise<void>((resolve, reject) => {
    const req = q.indexedDB.open('statespace', 2)
    req.onsuccess = () => {
      req.result.close()
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
  assert.equal(live.status().reason, 'version-change')
  assert.deepEqual(changes, [{ reason: 'read-only', local: false }])
  live.close()
})

test('working state is last-writer-wins, the mirror is replaced whole, and keep/kill reads are kept with the working state', async () => {
  const o = origin()
  const tab = await o.open()
  try {
    await tab.setWorking('settings', { keepkill: true, nudge: undefined })
    assert.deepEqual(await tab.getWorking('settings'), { keepkill: true })
    await tab.importWorking([
      { key: 'settings', value: { keepkill: false }, updatedAt: '2020-01-01T00:00:00Z', dev: 'old' },
      { key: 'draft', value: 'x', updatedAt: '2030-01-01T00:00:00+05:00', dev: 'new' },
      { key: 'bad', value: 1, updatedAt: 'yesterday', dev: 'x' },
    ])
    assert.deepEqual(await tab.getWorking('settings'), { keepkill: true }, 'an older record never replaces a newer one')
    assert.equal(await tab.getWorking('draft'), 'x')
    await tab.importWorking([{ key: 'draft', value: 'y', updatedAt: '2030-01-01T00:00:01+05:00', dev: 'newer' }])
    assert.equal(await tab.getWorking('draft'), 'y')
    await tab.replaceMirror([{ path: 'claims/a.yaml', text: 'a' }, { path: 'receipts/r.json', text: 'r' }])
    await tab.replaceMirror([{ path: 'claims/b.yaml', text: 'b' }])
    assert.deepEqual((await tab.listMirror()).map((m) => m.path), ['claims/b.yaml'])
    assert.equal((await tab.getMirror('claims/b.yaml'))?.text, 'b')
    // A read of a log with a draw, persisted on the device until it is exported.
    const r = rng(9)
    const events = genEvents(r, 10, 0)
    const draw = { expSeed: 1, drawnAt: stampTime(Date.UTC(2026, 9, 1), 0).at, rulesSha256: '67d1cba9cdab3247ca8425f7bfa5e1821c6823ac8ea613648cde73211f94e589', dev: 'd' }
    const { record } = readComparison({
      comparison: 'witness-generalization',
      phase: 'interim',
      at: stampTime(Date.UTC(2027, 0, 1), 0).at,
      log: logFrom(events, [draw]),
      content: { primaryKc: () => undefined, template: () => undefined, treatment: () => undefined, isFirstLessonExit: () => false },
    })
    await tab.recordKeepKillRead(record)
    assert.deepEqual(await tab.keepKillReads(), [record])
    assert.ok((await tab.listWorking()).some((w) => w.key === `keepkill-read:${record.id}`))
  } finally {
    tab.close()
  }
})

const byId = (records: readonly RunRecord[]): Map<string, RunRecord> => new Map(records.map((r) => [r.id, r]))

test('each keep/kill read keeps a record of its own: two reads of one comparison and phase on one local day both survive, and a kept record is never replaced', async () => {
  const o = origin()
  const tab = await o.open()
  try {
    const events = [0, 1, 2, 3].map((i) => ev({ at: Date.UTC(2026, 11, 1, 9, i), family: 'GEN-negate-it', kc: 'KC-1.witness-class', seed: 600 + i, ok: true }))
    const extra = ev({ at: Date.UTC(2026, 11, 12, 10, 0), kind: 'probe', kc: 'KC-1.witness-class', seed: 700, ok: false }) // 11:00 at +01:00
    const read = (at: string, list: LedgerEvent[]): RunRecord =>
      readComparison({ comparison: 'witness-generalization', phase: 'interim', at, log: logFrom(list, [kkDraw(1)]), content: stubContent() }).record
    const morning = read('2026-12-12T10:00:00.000+01:00', events)
    const afternoon = read('2026-12-12T13:00:00.000+01:00', [...events, extra])
    assert.notEqual(morning.inputs[0]?.sha256, afternoon.inputs[0]?.sha256, 'the two reads used different event sets')
    assert.notEqual(morning.id, afternoon.id)
    await tab.recordKeepKillRead(morning)
    await tab.recordKeepKillRead(afternoon)
    await tab.recordKeepKillRead(morning) // the same record again changes nothing
    let kept = byId(await tab.keepKillReads())
    assert.equal(kept.size, 2, 'both reads keep their records')
    assert.deepEqual(kept.get(morning.id), morning)
    assert.deepEqual(kept.get(afternoon.id), afternoon)
    // A different record under a kept id is refused, and the kept one stays; the generic working-state write is no way round.
    const refused = (e: unknown): boolean => e instanceof LedgerError && e.code === 'refused'
    await assert.rejects(tab.recordKeepKillRead({ ...morning, title: 'another read' }), refused)
    await assert.rejects(tab.setWorking(`${KEEPKILL_READ_PREFIX}${morning.id}`, { ...morning, title: 'another read' }), refused)
    // An import never replaces a kept read record either, however late its updatedAt; a new one is added.
    await tab.importWorking([
      { key: `${KEEPKILL_READ_PREFIX}${morning.id}`, value: { ...morning, title: 'another read' }, updatedAt: '2030-01-01T00:00:00Z', dev: 'other' },
      { key: `${KEEPKILL_READ_PREFIX}${afternoon.id}`, value: afternoon, updatedAt: '2030-01-01T00:00:00Z', dev: 'other' },
    ])
    kept = byId(await tab.keepKillReads())
    assert.equal(kept.size, 2)
    assert.deepEqual(kept.get(morning.id), morning)
    assert.deepEqual(kept.get(afternoon.id), afternoon)
    assert.equal(tab.status().problems.filter((p) => p.includes(morning.id)).length, 1, 'the refused import is reported')
    assert.ok(!tab.status().problems.some((p) => p.includes(afternoon.id)), 'the same record imported again is no problem')
  } finally {
    tab.close()
  }
})

test("readKeepKill reads the store's own log and keeps the read's record in the same call, so every read leaves its record", async () => {
  const o = origin()
  const tab = await o.open()
  try {
    await tab.drawExpSeed()
    const r = rng(14)
    for (let i = 0; i < 6; i++) await tab.record(input(r))
    const ask = { comparison: 'witness-generalization', phase: 'interim', content: stubContent() } as const
    const first = await tab.readKeepKill(ask)
    const second = await tab.readKeepKill(ask)
    assert.equal(first.result.eventCount, 6)
    assert.equal(first.result.eventDigest, eventSetDigest(await tab.log()))
    assert.equal(first.record.recorded_at, first.result.at, 'a read is recorded when it is taken')
    assert.notEqual(first.record.id, second.record.id, 'a later read is another read')
    // A read at a given instant uses only the events before it.
    const past = await tab.readKeepKill({ ...ask, at: '2026-11-01T00:00:00.000+01:00' })
    assert.equal(past.result.eventCount, 0)
    assert.deepEqual(byId(await tab.keepKillReads()), byId([first.record, second.record, past.record]))
    // Without a draw the read refuses, and nothing is kept.
    const off = await origin().open()
    await assert.rejects(off.readKeepKill(ask), /no expSeed draw/)
    assert.deepEqual(await off.keepKillReads(), [])
    off.close()
  } finally {
    tab.close()
  }
})

test('a snapshot carries the device, the events in fold order and the draws, and replays into another profile unchanged', async () => {
  const o = origin()
  const tab = await o.open()
  const copy = await origin().open()
  try {
    await tab.drawExpSeed()
    const r = rng(12)
    for (let i = 0; i < 8; i++) await tab.record(input(r))
    const snap = await tab.snapshot()
    assert.equal(snap.dev, tab.dev)
    assert.deepEqual(snap, { dev: tab.dev, ...snapshotOf(await tab.log()) })
    await copy.replace(JSON.parse(JSON.stringify(snap)) as typeof snap)
    assert.ok(sameLog(await copy.log(), await tab.log()))
    assert.equal(await copy.digest(), await tab.digest())
  } finally {
    tab.close()
    copy.close()
  }
})
