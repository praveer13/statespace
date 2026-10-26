// The W1-T03 acceptance's property tests on the pure log: a double import, a merge and a stale tab give
// identical logs. The IndexedDB adapter runs the same properties in test/storage/.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canonicalJson,
  compareCodePoints,
  decodeLog,
  encodeLog,
  EMPTY_LOG,
  eventSetDigest,
  foldLog,
  governingDraw,
  logDigest,
  logFrom,
  mergeDraws,
  mergeLogs,
  orderedEvents,
  previewMerge,
  resolveConflict,
  sameLog,
  snapshotOf,
  supersededDraws,
} from '../src/index.ts'
import type { ExpSeedDraw, LedgerEvent, Log } from '../src/index.ts'
import { genDraw, genEvent, genEvents, int, pick, rng, SEEDS, shuffled, variantOf } from './helpers.ts'

/** Split a list into k random parts (some may be empty), keeping no particular order. */
function partition<T>(r: () => number, list: readonly T[], k: number): T[][] {
  const parts: T[][] = Array.from({ length: k }, () => [])
  for (const x of list) (parts[int(r, 0, k - 1)] as T[]).push(x)
  return parts
}

/** The reference answer: for each id, the record with the smallest canonical JSON. */
function reference(events: readonly LedgerEvent[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const e of events) {
    const c = canonicalJson(e)
    const held = out.get(e.id)
    if (held === undefined || compareCodePoints(c, held) < 0) out.set(e.id, c)
  }
  return out
}

const asCanonical = (log: Log): Map<string, string> => new Map([...log.events].map(([id, e]) => [id, canonicalJson(e)]))

test('merge equals the reference: the smallest canonical record per id', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    const events = genEvents(r, 80, 0.3)
    assert.deepEqual(asCanonical(logFrom(events)), reference(events))
  }
})

test('a double import gives the identical log (idempotence)', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    const local = logFrom(genEvents(r, 60))
    const bundle = { events: genEvents(r, 40), expSeeds: [genDraw(r)] }
    const once = mergeLogs(local, bundle)
    const twice = mergeLogs(once, bundle)
    assert.ok(sameLog(once, twice))
    assert.ok(sameLog(mergeLogs(once, once), once))
    // Through the codec, as an export file would travel.
    const exported = decodeLog(encodeLog(once)).log
    assert.ok(sameLog(mergeLogs(once, exported), once))
  }
})

test('merges converge whatever the order, grouping or partition of the inputs (commutative and associative)', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    const events = genEvents(r, 90, 0.35)
    const draws = Array.from({ length: int(r, 0, 3) }, () => genDraw(r))
    const whole = logFrom(events, draws)
    const [a = [], b = [], c = []] = partition(r, events, 3)
    const [da = [], db = [], dc = []] = partition(r, draws, 3)
    const A = logFrom(a, da)
    const B = logFrom(b, db)
    const C = logFrom(c, dc)
    assert.ok(sameLog(mergeLogs(A, B), mergeLogs(B, A)))
    assert.ok(sameLog(mergeLogs(mergeLogs(A, B), C), mergeLogs(A, mergeLogs(B, C))))
    assert.ok(sameLog(mergeLogs(C, A, B), whole))
    assert.ok(sameLog(logFrom(shuffled(r, events), shuffled(r, draws)), whole))
    assert.equal(eventSetDigest(shuffled(r, events)), eventSetDigest(whole))
  }
})

test('a stale tab gives the identical log: interleaved writes from tabs that never saw each other converge', () => {
  // Two tabs start from the same log. Each keeps a view that it refreshes only sometimes (stale), and writes
  // appends, merges of imported bundles and conflicting re-imports into the shared log in a random
  // interleaving. Whatever the interleaving and however stale the views, the final log is the merge of
  // everything written, and both tabs read the same log afterwards.
  for (const seed of SEEDS) {
    const r = rng(seed)
    const start = genEvents(r, 30)
    let shared: Log = logFrom(start)
    const written: LedgerEvent[] = [...start]
    const writtenDraws: ExpSeedDraw[] = []
    const views: Log[] = [shared, shared]
    for (let step = 0; step < 40; step++) {
      const tab = int(r, 0, 1)
      const op = pick(r, ['append', 'merge', 'conflict', 'refresh', 'draw'] as const)
      if (op === 'refresh') {
        views[tab] = shared
        continue
      }
      let batch: LedgerEvent[] = []
      let draws: ExpSeedDraw[] = []
      if (op === 'append') batch = [genEvent(r)]
      if (op === 'merge') batch = genEvents(r, int(r, 1, 8))
      if (op === 'conflict') {
        const seen = [...(views[tab] as Log).events.values()] // the stale view decides what to re-import
        batch = seen.length === 0 ? [genEvent(r)] : [variantOf(r, pick(r, seen))]
      }
      if (op === 'draw') draws = [genDraw(r)]
      // The write lands in the shared log as a set union under the conflict rule, never as a replace of
      // the tab's stale view.
      shared = mergeLogs(shared, { events: batch, expSeeds: draws })
      written.push(...batch)
      writtenDraws.push(...draws)
    }
    const expected = logFrom(written, writtenDraws)
    assert.ok(sameLog(shared, expected), `seed ${seed}`)
    // Replaying the same writes in another interleaving reaches the same log.
    assert.ok(sameLog(logFrom(shuffled(r, written), shuffled(r, writtenDraws)), expected))
  }
})

test('the conflict rule is a total order: either argument order picks the same winner', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    const e = genEvent(r)
    const f = variantOf(r, e)
    const w1 = resolveConflict(e, f)
    const w2 = resolveConflict(f, e)
    assert.equal(canonicalJson(w1), canonicalJson(w2))
    assert.ok(compareCodePoints(canonicalJson(w1), canonicalJson(w1 === e ? f : e)) <= 0)
  }
})

test('the fold order is by instant, then id, whatever the offsets', () => {
  const ev = (id: string, at: string): LedgerEvent => ({ id, v: 1, kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen', at, tz: 0, day: at.slice(0, 10), dev: 'd' })
  const log = logFrom([ev('b', '2026-10-24T05:00:00+01:00'), ev('a', '2026-10-24T04:00:00Z'), ev('c', '2026-10-24T03:59:59.999Z'), ev('d', '2026-10-24T00:00:00-05:00')])
  assert.deepEqual(orderedEvents(log).map((e) => e.id), ['c', 'a', 'b', 'd'])
  assert.deepEqual(foldLog(log, [] as string[], (s, e) => [...s, e.id]), ['c', 'a', 'b', 'd'])
})

test('the merge preview classifies added, duplicate and conflicting records, and a changed governing draw', () => {
  const r = rng(7)
  const held = genEvents(r, 20, 0)
  const base = logFrom(held, [genDraw(r, { drawnAt: '2026-10-21T00:00:00.000Z', expSeed: 5 })])
  const dup = held[0] as LedgerEvent
  const changed = variantOf(r, held[1] as LedgerEvent)
  const fresh = genEvent(r)
  const earlier = genDraw(r, { drawnAt: '2026-10-20T00:00:00.000Z', expSeed: 9 })
  const p = previewMerge(base, { events: [dup, changed, fresh], expSeeds: [earlier] })
  assert.deepEqual(p.added, [fresh.id])
  assert.deepEqual(p.duplicates, [dup.id])
  assert.equal(p.conflicts.length, 1)
  assert.equal(p.conflicts[0]?.id, changed.id)
  assert.equal(p.conflicts[0]?.kept, resolveConflict(held[1] as LedgerEvent, changed) === changed ? 'incoming' : 'existing')
  assert.deepEqual(p.addedDraws, [earlier])
  assert.equal(p.governingChanges, true)
  assert.equal(previewMerge(EMPTY_LOG, { events: [] }).governingChanges, false)
})

test('the earliest draw governs, on equal instants the smaller value, and superseded draws are kept', () => {
  const at = '2026-10-21T08:00:00.000+00:00'
  const d1 = { expSeed: 50, drawnAt: at, rulesSha256: '0'.repeat(64), dev: 'a' }
  const d2 = { expSeed: 40, drawnAt: '2026-10-21T09:00:00.000+01:00', rulesSha256: '0'.repeat(64), dev: 'b' } // the same instant
  const d3 = { expSeed: 1, drawnAt: '2026-10-21T08:00:00.001Z', rulesSha256: '0'.repeat(64), dev: 'c' }
  assert.equal(governingDraw([d1, d2, d3])?.expSeed, 40)
  assert.equal(governingDraw([d3, d1])?.expSeed, 50)
  assert.deepEqual(supersededDraws([d1, d2, d3]).map((d) => d.expSeed), [50, 1])
  assert.deepEqual(mergeDraws([d1, d1, d2]).length, 2)
  for (const seed of SEEDS) {
    const r = rng(seed)
    const draws = Array.from({ length: 5 }, () => genDraw(r))
    assert.equal(canonicalJson(governingDraw(shuffled(r, draws))), canonicalJson(governingDraw(draws)))
  }
})

test('the expSeed draw travels in the export and survives a merge-import, the earliest draw governing', () => {
  const r = rng(11)
  const device1 = logFrom(genEvents(r, 10), [genDraw(r, { drawnAt: '2026-10-22T07:00:00.000+00:00', expSeed: 777 })])
  const device2 = logFrom(genEvents(r, 10), [genDraw(r, { drawnAt: '2026-10-23T07:00:00.000+00:00', expSeed: 123 })])
  const exported = JSON.parse(encodeLog(device1)) as unknown
  const imported = mergeLogs(device2, decodeLog(exported).log)
  assert.equal(governingDraw(imported.expSeeds)?.expSeed, 777)
  assert.deepEqual(supersededDraws(imported.expSeeds).map((d) => d.expSeed), [123])
  assert.ok(sameLog(mergeLogs(device1, device2), imported))
  assert.deepEqual(snapshotOf(imported).expSeeds.map((d) => d.expSeed), [777, 123])
})

test('digests: equal sets agree, and any change to an event or a draw changes the log digest', () => {
  const r = rng(3)
  const events = genEvents(r, 15, 0)
  const log = logFrom(events, [genDraw(r)])
  assert.equal(logDigest(log), logDigest(logFrom(shuffled(r, events), log.expSeeds)))
  assert.notEqual(logDigest(log), logDigest(logFrom(events)))
  assert.notEqual(eventSetDigest(log), eventSetDigest(logFrom([...events.slice(1), variantOf(r, events[0] as LedgerEvent)])))
  assert.match(eventSetDigest(EMPTY_LOG), /^sha256:[0-9a-f]{64}$/)
})

test('decodeLog reports refused records and keeps the rest', () => {
  const r = rng(5)
  const good = genEvent(r)
  const decoded = decodeLog({ events: [good, { ...good, id: 'bad id' }, { ...good, kind: 'status' }], expSeeds: [{ expSeed: -1 }] })
  assert.equal(decoded.log.events.size, 1)
  assert.deepEqual(decoded.problems.map((p) => p.where), ['/events/1', '/events/2', '/expSeeds/0'])
  assert.throws(() => decodeLog('[]'))
  assert.throws(() => decodeLog({ events: 'x' }))
})
