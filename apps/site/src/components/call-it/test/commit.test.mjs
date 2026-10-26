// commitCall against the real ledger store (apps/site/src/storage) on fake-indexeddb: the first call is final at the write, two
// tabs and a stale view never leave more than one call that counts, the call is durable before the promise settles, and the
// Mirror reads what the sheet wrote.

import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { IDBFactory } from 'fake-indexeddb'
import { firstCallOf } from '../../../../../../packages/learner/src/mirror/index.ts'
import { deriveMirror } from '../../../../../../packages/learner/src/mirror/index.ts'
import { openLedgerStore } from '../../../storage/index.ts'
import { commitCall } from '../commit.ts'
import { EMPTY_DRAFT, callDraftOf, recordedFrom } from '../model.ts'
import { SEEDS, authoredItems, event, generatedItems, pick, rng } from './helpers.mjs'

class MemoryStorage {
  map = new Map()
  get length() { return this.map.size }
  key(i) { return [...this.map.keys()][i] ?? null }
  getItem(k) { return this.map.get(k) ?? null }
  setItem(k, v) { this.map.set(k, String(v)) }
  removeItem(k) { this.map.delete(k) }
  clear() { this.map.clear() }
  keys() { return [...this.map.keys()] }
}

const opened = []
after(() => { for (const s of opened) s.close() })

let origins = 0
/** A fresh origin: its own IndexedDB and localStorage, no channel (tabs read each other's writes by re-reading the log). */
function origin() {
  origins += 1
  const indexedDB = new IDBFactory()
  const storage = new MemoryStorage()
  let ids = 0
  let clock = Date.UTC(2026, 10, 2, 9, 0)
  const open = async (extra = {}) => {
    const s = await openLedgerStore({ indexedDB, storage, channel: null, randomId: () => `id-${origins}-${++ids}`, clock: { nowMs: () => (clock += 1000), tzAt: () => 0 }, ...extra })
    opened.push(s)
    return s
  }
  return { open, storage, indexedDB, setClock: (ms) => { clock = ms } }
}

const draftFor = (item, picked, conf, help = false) => callDraftOf(item, { ...EMPTY_DRAFT, picked, conf, help }, 1500)
const callsOn = async (store, ref) => (await store.events()).filter((e) => e.kind === 'call' && e.ref === ref)

test('a call is written once: the first commit records it, a second commit on the question writes nothing and shows the first', async () => {
  const [item] = await authoredItems()
  const store = await origin().open()
  const first = await commitCall(store, draftFor(item, 'A', 'sure'))
  assert.equal(first.status, 'recorded')
  assert.equal(first.call.ref, 'call:S1.L1/c1')
  assert.equal(first.call.conf, 'sure')
  assert.equal(first.call.ok, false)
  assert.equal(first.call.mis, 'dp:Z5')
  assert.deepEqual(first.call.resp, { picked: 'A' })
  assert.equal(first.call.exposure, 'unseen')
  assert.equal(first.call.provenance, 'own')
  assert.deepEqual(first.call.data.call, { form: 'choice', options: 3, kc: 'KC-1.quantifier-negation' })
  // the learner changes their mind: every other answer and confidence is refused, and the log still holds the first call
  for (const [picked, conf] of [['B', 'guess'], ['B', 'sure'], ['A', 'guess'], ['C', 'think']]) {
    const again = await commitCall(store, draftFor(item, picked, conf))
    assert.equal(again.status, 'already')
    assert.equal(again.wrote, false)
    assert.equal(again.call.id, first.call.id)
  }
  const calls = await callsOn(store, 'call:S1.L1/c1')
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], first.call)
})

test('the call is in the log before the promise settles, and still there when the page is opened again', async () => {
  const [item] = await authoredItems()
  const o = origin()
  const store = await o.open()
  const result = await commitCall(store, draftFor(item, 'B', 'think'))
  assert.equal(result.status, 'recorded')
  assert.equal((await callsOn(store, 'call:S1.L1/c1')).length, 1)
  const reopened = await o.open()
  const found = firstCallOf(await reopened.events(), item.identity)
  assert.equal(found.id, result.call.id)
  assert.equal(recordedFrom(found).conf, 'think')
  assert.equal((await commitCall(reopened, draftFor(item, 'A', 'sure'))).status, 'already')
  assert.equal((await callsOn(reopened, 'call:S1.L1/c1')).length, 1)
})

test('a stale tab: a tab that read the log before another tab called the question cannot call it again', async () => {
  const [item] = await authoredItems()
  const o = origin()
  const tabA = await o.open()
  const tabB = await o.open()
  const seenByB = await tabB.events()
  assert.equal(seenByB.length, 0)
  assert.equal((await commitCall(tabA, draftFor(item, 'B', 'sure'))).status, 'recorded')
  // B still shows an open sheet, chose something else and commits: it reads the log at the write, so nothing is written
  const lost = await commitCall(tabB, draftFor(item, 'A', 'guess'))
  assert.equal(lost.status, 'already')
  assert.equal(lost.wrote, false)
  assert.equal(lost.call.conf, 'sure')
  assert.equal((await callsOn(tabB, 'call:S1.L1/c1')).length, 1)
})

test('PROPERTY: tabs that commit at the same moment may each write, and still one call counts, the same one everywhere', async () => {
  const [item] = await authoredItems()
  for (const seed of SEEDS.slice(0, 12)) {
    const r = rng(seed)
    const o = origin()
    const tabs = await Promise.all(Array.from({ length: 2 + Math.floor(r() * 3) }, () => o.open()))
    const results = await Promise.all(tabs.map((t) => commitCall(t, draftFor(item, pick(r, ['A', 'B', 'C']), pick(r, ['guess', 'think', 'sure'])))))
    const winner = firstCallOf(await tabs[0].events(), item.identity)
    for (const t of tabs) assert.equal(firstCallOf(await t.events(), item.identity).id, winner.id, `seed ${seed}: the same call in every tab`)
    // whoever wrote the winner is told so; everyone else is told which call stands
    const recorded = results.filter((x) => x.status === 'recorded')
    assert.equal(recorded.length, 1, `seed ${seed}: one commit is told its call is the one`)
    assert.equal(recorded[0].call.id, winner.id)
    for (const x of results) assert.equal(x.call.id, winner.id, `seed ${seed}: every commit answers with the call that stands`)
    // the Mirror counts exactly one call for the question, whatever got written
    const events = await tabs[0].events()
    const exit = event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1, ok: true, at: '2026-11-02T08:00:00Z', data: { exit: 'KC-1.quantifier-negation' } })
    const view = deriveMirror({ events: [exit, ...events], content: { primaryKc: () => undefined, isFirstLessonExit: (e, kc) => e.data?.exit === kc }, now: '2027-01-01T00:00:00Z' })
    assert.equal(view.counted, 1, `seed ${seed}`)
  }
})

test('a read-only store refuses and writes nothing; a store that fails reports why and writes nothing', async () => {
  const [item] = await authoredItems()
  const store = await origin().open()
  const through = (over) => ({ events: () => store.events(), record: (x) => store.record(x), subscribe: (f) => store.subscribe(f), status: () => store.status(), ...over })
  const readOnly = through({ status: () => ({ ...store.status(), mode: 'read-only', reason: 'newer-schema' }) })
  const refused = await commitCall(readOnly, draftFor(item, 'B', 'think'))
  assert.equal(refused.status, 'refused')
  assert.match(refused.message, /read-only/)
  assert.equal((await store.events()).length, 0)
  const failing = through({ record: async () => { throw new Error('QuotaExceededError') } })
  const failed = await commitCall(failing, draftFor(item, 'B', 'think'))
  assert.equal(failed.status, 'refused')
  assert.match(failed.message, /QuotaExceededError/)
  assert.equal((await store.events()).length, 0)
})

test('a generated item is the same question for the same seed and another question for another: its call is final per seed', async () => {
  const t1 = generatedItems()[0]
  const other = { ...t1, identity: { ...t1.identity, seed: t1.identity.seed + 1 } }
  const store = await origin().open()
  assert.equal((await commitCall(store, draftFor(t1, 'B', 'sure'))).status, 'recorded')
  assert.equal((await commitCall(store, draftFor(t1, 'C', 'guess'))).status, 'already')
  assert.equal((await commitCall(store, draftFor(other, 'C', 'guess'))).status, 'recorded')
  assert.equal((await store.events()).filter((e) => e.kind === 'call').length, 2)
})

test('a set is written with the key of the misconception it matched, whichever statement is wrong first, and the log keeps every mark', async () => {
  // s1 true, s2 false (dp:Z1), s3 false (dp:Z2), s4 true, s5 false (dp:Z4)
  const set = generatedItems().find((i) => i.form === 'set' && i.extra.instance.ref === 'gen:GEN-call-it:t4:b2:0x0000d001')
  const store = await origin().open()
  // s1 (a true statement, so no key) and s2 (dp:Z1) are marked the wrong way round: the key is s2's, not nothing
  const answers = { s1: false, s2: true, s3: false, s4: true, s5: false }
  const r = await commitCall(store, callDraftOf(set, { ...EMPTY_DRAFT, answers, conf: 'sure' }, 900))
  assert.equal(r.status, 'recorded')
  assert.equal(r.call.ok, false)
  assert.equal(r.call.mis, 'dp:Z1')
  assert.deepEqual(r.call.resp, { answers })
  const [stored] = await callsOn(store, 'call:GEN-call-it/t4')
  assert.equal(stored.mis, 'dp:Z1')
  assert.deepEqual(stored.data.call, { form: 'set', statements: 5, kc: set.kc })
})

test('the Mirror reads what the sheet wrote: calls after first learning are counted, with their shape, KC and help', async () => {
  const items = await authoredItems()
  const store = await origin().open()
  const kcOf = (i) => i.kc
  // first learning of every KC the fixtures name: the attempt at the exit item, before the calls
  const kcs = [...new Set(items.map(kcOf))]
  await store.append(kcs.map((kc, i) => event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 100 + i, ok: true, at: '2026-11-02T08:00:00Z', data: { exit: kc } })))
  let asked = 0
  for (let round = 0; round < 4; round++) {
    for (const item of items) {
      const i = { ...item, identity: { ref: `${item.identity.ref}-r${round}` } }
      const r = await commitCall(store, callDraftOf(i, { ...EMPTY_DRAFT, picked: item.key, conf: round % 2 ? 'sure' : 'think', help: round === 3 }, 900))
      assert.equal(r.status, 'recorded')
      asked += 1
    }
  }
  assert.equal(asked, 28)
  const content = { primaryKc: () => undefined, isFirstLessonExit: (e, kc) => e.data?.exit === kc }
  const view = deriveMirror({ events: await store.events(), content, now: '2100-01-01T00:00:00Z' })
  // the fixed clock puts the calls after first learning; round 3 was made with help and is shown apart
  assert.equal(view.counted, 28)
  assert.equal(view.assisted.find((b) => b.bin === 'answer').calls, 7)
  assert.equal(view.own.find((b) => b.bin === 'answer').calls, 21)
  assert.equal(view.own.find((b) => b.bin === 'answer').hits, 21)
})
