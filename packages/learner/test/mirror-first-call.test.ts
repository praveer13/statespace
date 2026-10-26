// The first call is final (M-call-it, spine section 8.5): only the first call on a question counts and it cannot be edited.
// The log is append-only, so "cannot be edited" has three parts, each held here as a property over seeded random logs:
//   - the sheet never plans a second call on a question that has one (planCall);
//   - when a second call is written anyway (a stale tab, a replayed import, a merged device), every reader still counts the
//     first one, whichever order the events arrive in (firstCallOf, firstCalls, deriveMirror);
//   - a later call changes nothing the Mirror shows, whatever it says.
// The sheet's own read-only state, and the same property in three browsers, are the component's tests.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { canonicalJson, createEvent, compareFoldOrder, mergeLogs, orderedEvents, validateEvent } from '@statespace/ledger'
import type { EventEnv, LedgerEvent } from '@statespace/ledger'
import { callKey, deriveMirror, firstCallOf, firstCalls, foldedEvents, identityOf, isCall, planCall } from '../src/mirror/index.ts'
import type { CallDraft, CallIdentity, Confidence } from '../src/mirror/index.ts'
import { DAY0, KC, SEEDS, SET_OF_FIVE, THREE_WAY, call, content, exitItem, int, minutesAfter, pick, rng, shuffled } from './mirror-helpers.ts'

const NOW = '2027-01-01T00:00:00Z'
const LEARNED = minutesAfter(DAY0, 30)
const CONFS: readonly Confidence[] = ['guess', 'think', 'sure']

/** A log of calls on `questions` distinct questions, each called once after first learning, plus the exit item. */
function log(r: () => number, questions: number): LedgerEvent[] {
  const out: LedgerEvent[] = [exitItem(KC, LEARNED)]
  for (let i = 0; i < questions; i++) {
    out.push(call({ ref: `call:S1.L2/c${i + 1}`, at: minutesAfter(LEARNED, 10 + i), conf: pick(r, CONFS), ok: r() < 0.5, shape: pick(r, [THREE_WAY, SET_OF_FIVE]) }))
  }
  return out
}

/** The reference: sort by (instant, id), keep the first call on each question. Written apart from the code under test. */
function naiveFirst(events: LedgerEvent[], id: CallIdentity): LedgerEvent | undefined {
  const k = callKey(id)
  return [...events].sort(compareFoldOrder).find((e) => e.conf !== undefined && callKey(identityOf(e)) === k)
}

const stable = (v: ReturnType<typeof deriveMirror>) => ({ own: v.own, assisted: v.assisted, counted: v.counted })
const withoutRepeats = (v: ReturnType<typeof deriveMirror>) => ({ ...v.excluded, repeat: 0 })

describe('the first call on a question is the one every reader finds', () => {
  test('firstCallOf and firstCalls give the earliest call in fold order, whatever order the events arrive in and however often', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const events = log(r, 12)
      // second and third calls on some of the questions, some earlier than the first, some at its instant (ties go to the smaller id)
      const extra: LedgerEvent[] = []
      for (const e of events.filter(isCall)) {
        const n = int(r, 0, 2)
        for (let i = 0; i < n; i++) {
          const delta = pick(r, [-50, -1, 0, 1, 70])
          extra.push(call({ ref: e.ref, at: minutesAfter(e.at, delta), conf: pick(r, CONFS), ok: r() < 0.5 }))
        }
      }
      const all = [...events, ...extra]
      const shuffledAll = [...shuffled(r, all), ...shuffled(r, all).slice(0, 5)]
      const winners = firstCalls(shuffledAll)
      for (const e of events.filter(isCall)) {
        const want = naiveFirst(all, identityOf(e))
        assert.equal(firstCallOf(shuffledAll, identityOf(e))?.id, want?.id, `seed ${seed} ${e.ref}`)
        assert.equal(winners.get(callKey(identityOf(e)))?.id, want?.id, `seed ${seed} ${e.ref} (firstCalls)`)
      }
      assert.equal(winners.size, events.filter(isCall).length)
    }
  })

  test('a question called from two devices has one call in either merge order', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const a = log(r, 6)
      const b = a.filter(isCall).map((e) => call({ ref: e.ref, at: minutesAfter(e.at, int(r, -5, 5)), conf: pick(r, CONFS), ok: r() < 0.5 }))
      const ab = [...mergeLogs({ events: a }, { events: b }).events.values()]
      const ba = [...mergeLogs({ events: b }, { events: a }).events.values()]
      for (const e of a.filter(isCall)) assert.equal(firstCallOf(ab, identityOf(e))?.id, firstCallOf(ba, identityOf(e))?.id)
      assert.deepEqual(deriveMirror({ events: ab, content, now: NOW }), deriveMirror({ events: ba, content, now: NOW }))
    }
  })

  test('the generated instance is its ref and its seed: another seed is another question, the same seed is the same one', () => {
    const a = call({ ref: 'call:GEN-call-it/t1', seed: 11, at: minutesAfter(LEARNED, 5) })
    const b = call({ ref: 'call:GEN-call-it/t1', seed: 12, at: minutesAfter(LEARNED, 6) })
    const again = call({ ref: 'call:GEN-call-it/t1', seed: 11, at: minutesAfter(LEARNED, 7), ok: false })
    assert.equal(firstCallOf([a, b, again], identityOf(b))?.id, b.id)
    assert.equal(firstCallOf([a, b, again], identityOf(a))?.id, a.id)
    // the same question named by the item's ref counts once: a call and a called item are one question
    const item = call({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 11, at: minutesAfter(LEARNED, 8) })
    assert.equal(firstCallOf([a, item], identityOf(item))?.id, a.id)
  })
})

describe('the log is a set by id: an event twice is one, and two records of one id are decided by the canonical rule', () => {
  test('a double import counts once, in any order', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const r = rng(seed)
      const events = log(r, 8)
      const once = foldedEvents(events).map((e) => e.id)
      assert.deepEqual(foldedEvents([...events, ...shuffled(r, events), ...events]).map((e) => e.id), once, `seed ${seed}`)
      assert.equal(once.length, events.length)
    }
  })

  test('two records that share an id and differ: the one whose canonical JSON is smaller, whichever arrives first', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const r = rng(seed)
      const a = call({ ref: 'call:S1.L2/c70', at: minutesAfter(LEARNED, 10), conf: pick(r, CONFS), ok: r() < 0.5 })
      const b: LedgerEvent = { ...a, conf: pick(r, CONFS.filter((c) => c !== a.conf)), ok: !a.ok }
      const want = canonicalJson(a) < canonicalJson(b) ? a : b
      assert.deepEqual(foldedEvents([a, b]), [want], `seed ${seed}: a then b`)
      assert.deepEqual(foldedEvents([b, a]), [want], `seed ${seed}: b then a`)
      // and the call that counts, and the Mirror, are the winner's
      assert.equal(firstCallOf([b, a], identityOf(a))?.conf, want.conf)
    }
  })
})

describe('a later call changes nothing the Mirror shows', () => {
  test('whatever it says and whoever writes it, a second call on a called question is left out', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const events = log(r, 30)
      const before = deriveMirror({ events, content, now: NOW })
      const later = events.filter(isCall).flatMap((e) =>
        Array.from({ length: int(r, 1, 3) }, () =>
          call({
            ref: e.ref,
            at: minutesAfter(e.at, int(r, 1, 500)),
            conf: pick(r, CONFS),
            ok: r() < 0.5,
            shape: pick(r, [THREE_WAY, SET_OF_FIVE]),
            provenance: pick(r, ['own', 'own', 'assisted']),
            exposure: pick(r, ['unseen', 'seen']),
          }),
        ),
      )
      const after = deriveMirror({ events: shuffled(r, [...events, ...later]), content, now: NOW })
      assert.deepEqual(stable(after), stable(before), `seed ${seed}`)
      assert.deepEqual(withoutRepeats(after), withoutRepeats(before), `seed ${seed}`)
      assert.equal(after.excluded.repeat, before.excluded.repeat + later.length, `seed ${seed}`)
    }
  })

  test('a first call that was left out uses the question up: a later call never counts in its place', () => {
    // called before the exit item (before instruction), then called again after it: the first call stands, and it does not count
    const first = call({ ref: 'call:S1.L1/c9', at: minutesAfter(DAY0, 5), ok: true })
    const second = call({ ref: 'call:S1.L1/c9', at: minutesAfter(DAY0, 120), ok: false })
    const v = deriveMirror({ events: [exitItem(KC, LEARNED), first, second], content, now: NOW })
    assert.equal(v.counted, 0)
    assert.equal(v.excluded['before-instruction'], 1)
    assert.equal(v.excluded.repeat, 1)
    // an assisted first call is the call: the learner cannot redo it unassisted
    const helped = call({ ref: 'call:S1.L1/c10', at: minutesAfter(LEARNED, 1), provenance: 'assisted', ok: false })
    const redo = call({ ref: 'call:S1.L1/c10', at: minutesAfter(LEARNED, 2), provenance: 'own', ok: true })
    const w = deriveMirror({ events: [exitItem(KC, LEARNED), helped, redo], content, now: NOW })
    assert.equal(w.own.reduce((s, b) => s + b.calls, 0), 0)
    assert.equal(w.assisted.reduce((s, b) => s + b.calls, 0), 1)
  })

  test('the call that counts is the earliest in fold order even when a later-written one carries an earlier instant', () => {
    const written1 = call({ ref: 'call:S1.L2/c5', at: minutesAfter(LEARNED, 20), conf: 'sure', ok: false })
    const written2 = call({ ref: 'call:S1.L2/c5', at: minutesAfter(LEARNED, 10), conf: 'guess', ok: true })
    for (const order of [[written1, written2], [written2, written1]]) {
      const v = deriveMirror({ events: [exitItem(KC, LEARNED), ...order], content, now: NOW })
      const bin = v.own.find((b) => b.bin === 'answer')!
      assert.equal(bin.calls, 1)
      assert.equal(bin.bands[0]!.calls, 1)
      assert.equal(bin.bands[2]!.calls, 0)
    }
  })
})

describe('planCall: the sheet never plans a second call', () => {
  const draftFor = (id: CallIdentity, r: () => number): CallDraft => ({
    identity: id,
    conf: pick(r, CONFS),
    resp: { picked: pick(r, ['A', 'B', 'C']) },
    ok: r() < 0.5,
    provenance: pick(r, ['own', 'assisted']),
    shape: pick(r, [THREE_WAY, SET_OF_FIVE]),
    kc: KC,
    ms: int(r, 0, 90_000),
  })
  const env = (n: number): EventEnv => ({ id: `planned-${n}`, nowMs: Date.parse(LEARNED) + n * 1000, tz: 0, dev: 'dev-test' })

  test('it plans a write exactly when the log holds no call on the question, and says which call is there otherwise', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const events = log(r, 10)
      for (let q = 1; q <= 14; q++) {
        const id: CallIdentity = { ref: `call:S1.L2/c${q}` }
        const plan = planCall(shuffled(r, events), draftFor(id, r))
        const there = events.some((e) => isCall(e) && e.ref === id.ref)
        assert.equal(plan.action, there ? 'already' : 'write', `seed ${seed} q ${q}`)
        if (plan.action === 'already') assert.equal(plan.recorded.id, naiveFirst(events, id)!.id)
      }
    }
  })

  test('what it plans is a valid call event, and planning again after it is written finds that event', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      let events = log(r, 3)
      for (let n = 0; n < 8; n++) {
        const id: CallIdentity = r() < 0.5 ? { ref: `call:S1.L3/c${n}` } : { ref: 'call:GEN-call-it/t1', seed: int(r, 1, 6) }
        const draft = draftFor(id, r)
        const plan = planCall(events, draft)
        if (plan.action === 'already') continue
        const written = createEvent(plan.input, env(n))
        assert.deepEqual(validateEvent(written), [], `seed ${seed}`)
        assert.equal(written.kind, 'call')
        assert.equal(written.exposure, 'unseen')
        assert.equal(written.provenance, draft.provenance)
        assert.equal(written.conf, draft.conf)
        assert.equal(written.ok, draft.ok)
        assert.equal(written.seed, id.seed)
        events = [...events, written]
        const again = planCall(events, draftFor(id, r))
        assert.equal(again.action, 'already')
        if (again.action === 'already') assert.equal(again.recorded.id, written.id)
      }
    }
  })

  test('stale tabs: however many plan a write from an old view, one call counts, the same one in every tab', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const base = [exitItem(KC, LEARNED)]
      const id: CallIdentity = { ref: 'call:S1.L2/c1' }
      const tabs = int(r, 2, 5)
      const views: LedgerEvent[][] = Array.from({ length: tabs }, () => [...base])
      const written: LedgerEvent[] = []
      // every tab commits from the view it has, in a random order, and sees the others only when it re-reads the shared log
      for (const tab of shuffled(r, [...views.keys()])) {
        if (r() < 0.5) views[tab] = [...base, ...written]
        const plan = planCall(views[tab]!, draftFor(id, r))
        if (plan.action === 'write') written.push(createEvent(plan.input, { ...env(written.length), id: `tab${tab}-${written.length}`, nowMs: Date.parse(LEARNED) + int(r, 1, 5) * 1000 }))
      }
      assert.ok(written.length >= 1, `seed ${seed}: someone wrote`)
      const shared = [...base, ...written]
      const winner = firstCallOf(shared, id)!
      assert.equal(winner.id, orderedEvents(written)[0]!.id, `seed ${seed}`)
      const v = deriveMirror({ events: shared, content, now: NOW })
      assert.equal(v.counted, 1, `seed ${seed}: exactly one call counts`)
      assert.equal(v.excluded.repeat, written.length - 1, `seed ${seed}`)
      // every tab that re-reads now plans nothing
      for (const t of views.keys()) assert.equal(planCall(shared, draftFor(id, r)).action, 'already', `seed ${seed} tab ${t}`)
    }
  })

  test('a call is written with everything the Mirror reads: its shape and KC travel in data.call, and extra data is kept beside them', () => {
    const plan = planCall([], {
      identity: { ref: 'call:GEN-call-it/t4', seed: 99 },
      conf: 'sure',
      resp: { answers: { s1: true, s2: false } },
      ok: false,
      mis: 'dp:Z2',
      provenance: 'assisted',
      shape: SET_OF_FIVE,
      kc: 'KC-1.three-answers',
      ms: 4321.6,
      itemRev: 'rev1',
      engine: 'z3@5.3.1',
      extra: { instance: { ref: 'gen:GEN-call-it:t4:b2:0x00000063', band: 2 }, call: { form: 'choice', options: 2 } },
    })
    assert.equal(plan.action, 'write')
    if (plan.action !== 'write') return
    const i = plan.input
    assert.deepEqual(
      { kind: i.kind, ref: i.ref, seed: i.seed, ok: i.ok, conf: i.conf, mis: i.mis, provenance: i.provenance, exposure: i.exposure, ms: i.ms, itemRev: i.itemRev, engine: i.engine },
      { kind: 'call', ref: 'call:GEN-call-it/t4', seed: 99, ok: false, conf: 'sure', mis: 'dp:Z2', provenance: 'assisted', exposure: 'unseen', ms: 4322, itemRev: 'rev1', engine: 'z3@5.3.1' },
    )
    // `call` is reserved: the writer's own cannot replace the shape
    assert.deepEqual(i.data, { instance: { ref: 'gen:GEN-call-it:t4:b2:0x00000063', band: 2 }, call: { form: 'set', statements: 5, kc: 'KC-1.three-answers' } })
  })
})
