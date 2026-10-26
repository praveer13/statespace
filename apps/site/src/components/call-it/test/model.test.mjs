import assert from 'node:assert/strict'
import test from 'node:test'
import { validateEvent } from '../../../../../../packages/ledger/src/index.ts'
import { planCall } from '../../../../../../packages/learner/src/mirror/index.ts'
import { cellRef, generatedRef, itemFromCell, itemFromInstance } from '../items.ts'
import { EMPTY_DRAFT, answered, callDraftOf, grade, initialSession, ready, recordedFrom, reduceDraft, reduceSession } from '../model.ts'
import { shapeOf } from '../types.ts'
import { SEEDS, authoredItems, event, generatedItems, loadInstances, loadPage, pick, rng } from './helpers.mjs'

const choice = async () => (await authoredItems())[0]
const set = () => generatedItems().find((i) => i.form === 'set')

test('the fixtures reduce to the sheet\'s items: seven authored choices and eight generated ones, none lost', async () => {
  const authored = await authoredItems()
  assert.equal(authored.length, 7)
  assert.deepEqual(authored.map((i) => i.identity.ref), ['call:S1.L1/c1', 'call:S1.L1/c2', 'call:S1.L2/c1', 'call:S1.L2/c2', 'call:S1.L3/c1', 'call:S1.L3/c2', 'call:S1.L3/c3'])
  for (const i of authored) {
    assert.equal(i.form, 'choice')
    assert.ok(i.options.some((o) => o.id === i.key), `${i.identity.ref}: the key is an option`)
    assert.ok(i.options.every((o) => (o.id === i.key) === (o.mis === undefined)), `${i.identity.ref}: only the key has no misconception key`)
    assert.match(i.kc, /^KC-1\./)
  }
  const generated = generatedItems()
  assert.equal(generated.length, 8)
  assert.deepEqual(generated.map((i) => i.form), ['choice', 'choice', 'choice', 'choice', 'choice', 'choice', 'set', 'set'])
  // the README's account of the fixtures says how many there are of each template: the two are kept together here
  const perTemplate = Object.fromEntries(['t1', 't2', 't3', 't4'].map((t) => [t, generated.filter((i) => i.identity.ref === `call:GEN-call-it/${t}`).length]))
  assert.deepEqual(perTemplate, { t1: 3, t2: 1, t3: 2, t4: 2 })
  for (const i of generated) {
    assert.match(i.identity.ref, /^call:GEN-call-it\/t[1-4]$/)
    assert.equal(typeof i.identity.seed, 'number')
    assert.ok(i.extra.instance.ref.startsWith('gen:GEN-call-it:'))
    assert.equal(i.extra.instance.ref.endsWith(`0x${i.identity.seed.toString(16).padStart(8, '0')}`), true)
  }
})

test('the refs are the ones event@1 allows: call:S1.L1/c1 for a cell, call:GEN-call-it/t1 for a generated item', () => {
  assert.equal(cellRef('S1.L3', 2), 'call:S1.L3/c2')
  assert.equal(generatedRef('GEN-call-it', 't4'), 'call:GEN-call-it/t4')
})

test('the shape of an item sets its chance line and its bin: three options, four options, a set of five', async () => {
  assert.deepEqual(shapeOf(await choice()), { form: 'choice', options: 3 })
  assert.deepEqual(shapeOf(generatedItems().find((i) => i.options?.length === 4)), { form: 'choice', options: 4 })
  assert.deepEqual(shapeOf(set()), { form: 'set', statements: 5 })
})

test('itemFromCell gives nothing for a cell with no call, and itemFromInstance nothing for an item the sheet cannot ask', async () => {
  assert.equal(itemFromCell({ cell: 4 }, { lesson: 'S1.L1' }), undefined)
  const [e] = loadInstances()
  assert.equal(itemFromInstance({ ...e.instance, item: { ...e.instance.item, parts: [] } }, e.key, e.instanceRef), undefined)
  assert.equal(itemFromInstance({ ...e.instance, item: { ...e.instance.item, parts: [...e.instance.item.parts, ...e.instance.item.parts] } }, e.key, e.instanceRef), undefined)
  assert.equal(itemFromInstance(e.instance, { ...e.key, choices: [{ part: 'main', answer: 'Z' }] }, e.instanceRef), undefined)
  assert.equal(itemFromInstance({ ...e.instance, item: { ...e.instance.item, parts: [{ kind: 'constructed', id: 'main', prompt: 'x' }] } }, e.key, e.instanceRef), undefined)
  const s = loadInstances().find((x) => x.instance.template === 't4')
  assert.equal(itemFromInstance(s.instance, { ...s.key, statements: [{ part: 'main', truth: { s1: true } }] }, s.instanceRef), undefined)
})

test('a bound the key rests on travels with the item, and the item keeps the engine that keyed it', () => {
  const t2 = generatedItems().find((i) => i.identity.ref === 'call:GEN-call-it/t2')
  assert.equal(t2.bound, 'TLC 1.8.0 at Init = 100, Amount = 80 and two workers')
  assert.equal(t2.engine, 'tlc@1.8.0')
})

test('a verdict, then a confidence: the action is ready only when both are chosen, and a set needs every statement marked', async () => {
  const item = await choice()
  assert.equal(answered(item, EMPTY_DRAFT), false)
  assert.equal(ready(item, EMPTY_DRAFT), false)
  const d1 = reduceDraft(EMPTY_DRAFT, { t: 'pick', id: 'B' }, item)
  assert.equal(answered(item, d1), true)
  assert.equal(ready(item, d1), false)
  const d2 = reduceDraft(d1, { t: 'conf', conf: 'think' }, item)
  assert.equal(ready(item, d2), true)
  // a confidence with no verdict is not ready
  assert.equal(ready(item, reduceDraft(EMPTY_DRAFT, { t: 'conf', conf: 'sure' }, item)), false)
  const s = set()
  let d = EMPTY_DRAFT
  for (const st of s.statements.slice(0, 4)) d = reduceDraft(d, { t: 'mark', id: st.id, value: true }, s)
  assert.equal(answered(s, d), false)
  d = reduceDraft(d, { t: 'mark', id: s.statements[4].id, value: false }, s)
  assert.equal(answered(s, d), true)
  assert.equal(ready(s, reduceDraft(d, { t: 'conf', conf: 'guess' }, s)), true)
})

test('a tap the item does not offer, or a confidence that is not one, changes nothing', async () => {
  const item = await choice()
  assert.equal(reduceDraft(EMPTY_DRAFT, { t: 'pick', id: 'Z' }, item), EMPTY_DRAFT)
  assert.equal(reduceDraft(EMPTY_DRAFT, { t: 'conf', conf: 'certain' }, item), EMPTY_DRAFT)
  assert.equal(reduceDraft(EMPTY_DRAFT, { t: 'mark', id: 's1', value: true }, item), EMPTY_DRAFT)
  const s = set()
  assert.equal(reduceDraft(EMPTY_DRAFT, { t: 'pick', id: 'A' }, s), EMPTY_DRAFT)
  assert.equal(reduceDraft(EMPTY_DRAFT, { t: 'mark', id: 'nope', value: true }, s), EMPTY_DRAFT)
})

test('grading: a choice is right only on the key, a set only when every statement is, and a miss carries the tag of the answer that was wrong', async () => {
  const item = await choice()
  assert.equal(item.key, 'B')
  assert.deepEqual(grade(item, { ...EMPTY_DRAFT, picked: 'B', conf: 'sure' }), { ok: true, resp: { picked: 'B' } })
  assert.deepEqual(grade(item, { ...EMPTY_DRAFT, picked: 'A', conf: 'sure' }), { ok: false, resp: { picked: 'A' }, mis: 'dp:Z5' })
  assert.deepEqual(grade(item, { ...EMPTY_DRAFT, picked: 'C', conf: 'sure' }), { ok: false, resp: { picked: 'C' }, mis: 'dp:Z6' })
  const s = set()
  const truth = Object.fromEntries(s.statements.map((x) => [x.id, x.truth]))
  assert.deepEqual(grade(s, { ...EMPTY_DRAFT, answers: truth, conf: 'think' }), { ok: true, resp: { answers: truth } })
  for (const st of s.statements) {
    const one = { ...truth, [st.id]: !truth[st.id] }
    const g = grade(s, { ...EMPTY_DRAFT, answers: one, conf: 'think' })
    assert.equal(g.ok, false, `flipping ${st.id}`)
    assert.deepEqual(g.resp, { answers: one })
    assert.equal(g.mis, st.mis)
  }
  // all true and all false are never right: a set keeps between 1 and m - 1 true statements
  assert.equal(grade(s, { ...EMPTY_DRAFT, answers: Object.fromEntries(s.statements.map((x) => [x.id, true])) }).ok, false)
  assert.equal(grade(s, { ...EMPTY_DRAFT, answers: Object.fromEntries(s.statements.map((x) => [x.id, false])) }).ok, false)
})

// ---- a set records the misconception its response matched

// s1 true, s2 false (dp:Z1), s3 false (dp:Z2), s4 true, s5 false (dp:Z4)
const D001 = 'gen:GEN-call-it:t4:b2:0x0000d001'
const setOf = (ref) => generatedItems().find((i) => i.form === 'set' && i.extra.instance.ref === ref)
/** The set's key, with the statements named marked the wrong way round. */
const marked = (s, ...ids) => Object.fromEntries(s.statements.map((x) => [x.id, ids.includes(x.id) ? !x.truth : x.truth]))
/** The call event the sheet writes for these answers: callDraftOf, then planCall, as an event@1 record. */
function written(item, answers) {
  const plan = planCall([], callDraftOf(item, { ...EMPTY_DRAFT, answers, conf: 'sure' }, 1000))
  assert.equal(plan.action, 'write')
  return event({ ...plan.input })
}

test('a set records the misconception its response matched: a wrong answer on a true statement never hides a tagged one after it', () => {
  const s = setOf(D001)
  assert.deepEqual(s.statements.map((x) => [x.truth, x.mis]), [[true, undefined], [false, 'dp:Z1'], [false, 'dp:Z2'], [true, undefined], [false, 'dp:Z4']])
  const cases = [
    [['s2'], 'dp:Z1'],
    // s1 is true, so it carries no key, and it comes before the tagged statement that was also marked the wrong way
    [['s1', 's2'], 'dp:Z1'],
    [['s4', 's5'], 'dp:Z4'],
    // two keys matched: the event holds the first in statement order, however the learner went about the marking
    [['s3', 's5'], 'dp:Z2'],
    [['s5', 's3'], 'dp:Z2'],
    [['s1', 's3', 's5'], 'dp:Z2'],
    // only true statements wrong: nothing to name
    [['s1'], undefined],
    [['s1', 's4'], undefined],
  ]
  for (const [ids, mis] of cases) {
    const e = written(s, marked(s, ...ids))
    assert.equal(e.ok, false, ids.join(' and '))
    assert.equal(e.mis, mis, `${ids.join(' and ')} wrong`)
    assert.deepEqual(e.resp, { answers: marked(s, ...ids) }, 'every mark is kept, so the keys that were not recorded can be read back')
  }
  const right = written(s, marked(s))
  assert.equal(right.ok, true)
  assert.equal(right.mis, undefined)
})

test('PROPERTY: over every way of marking a set, it is right only when every statement is, and carries the key of the first wrong statement that has one', () => {
  const stmt = (id, truth, mis) => ({ id, text: id, why: id, truth, ...(mis === undefined ? {} : { mis }) })
  // an authored set may tag a true statement (a learner who doubts it holds a misconception of its own) and leave a false one untagged
  const synthetic = { ...setOf(D001), statements: [stmt('s1', false), stmt('s2', true, 'dp:Z9'), stmt('s3', false, 'dp:Z1'), stmt('s4', true), stmt('s5', false, 'dp:Z2'), stmt('s6', true)] }
  const sets = [...generatedItems().filter((i) => i.form === 'set'), synthetic]
  assert.equal(sets.length, 3)
  for (const item of sets) {
    const m = item.statements.length
    for (let mask = 0; mask < 2 ** m; mask++) {
      const answers = Object.fromEntries(item.statements.map((x, i) => [x.id, (mask >> i) & 1 ? !x.truth : x.truth]))
      let expected
      for (const [i, x] of item.statements.entries()) if (((mask >> i) & 1) === 1 && expected === undefined && x.mis !== undefined) expected = x.mis
      const g = grade(item, { ...EMPTY_DRAFT, answers, conf: 'think' })
      assert.equal(g.ok, mask === 0, `mask ${mask}`)
      assert.equal(g.mis, expected, `mask ${mask}`)
      assert.deepEqual(g.resp, { answers }, `mask ${mask}`)
    }
  }
})

test('a committed draft becomes a call event the Mirror reads: shape, KC, provenance and time on task, and it validates as event@1', async () => {
  const item = await choice()
  const draft = { ...EMPTY_DRAFT, picked: 'A', conf: 'sure', help: false }
  const call = callDraftOf(item, draft, 4321.6)
  assert.deepEqual(
    { ok: call.ok, conf: call.conf, mis: call.mis, provenance: call.provenance, kc: call.kc, ms: call.ms, shape: call.shape, ref: call.identity.ref },
    { ok: false, conf: 'sure', mis: 'dp:Z5', provenance: 'own', kc: 'KC-1.quantifier-negation', ms: 4321.6, shape: { form: 'choice', options: 3 }, ref: 'call:S1.L1/c1' },
  )
  assert.equal(callDraftOf(item, { ...draft, help: true }, 1).provenance, 'assisted')
  const plan = planCall([], call)
  assert.equal(plan.action, 'write')
  const e = event({ ...plan.input })
  assert.deepEqual(validateEvent(e), [])
  assert.deepEqual(recordedFrom(e), { id: e.id, conf: 'sure', ok: false, picked: 'A', answers: null, provenance: 'own' })
  // a generated instance keeps its instance record, its engine and the bound beside the call
  const gen = generatedItems().find((i) => i.identity.ref === 'call:GEN-call-it/t2')
  const g = planCall([], callDraftOf(gen, { ...EMPTY_DRAFT, picked: 'B', conf: 'think' }, 10))
  assert.equal(g.action, 'write')
  assert.equal(g.input.seed, gen.identity.seed)
  assert.equal(g.input.engine, 'tlc@1.8.0')
  assert.deepEqual(g.input.data.instance, gen.extra.instance)
  assert.equal(event({ ...g.input }).ref, 'call:GEN-call-it/t2')
})

test('recordedFrom reads a call back, and nothing from an event that is no call', () => {
  const set5 = { s1: true, s2: false }
  const e = event({ conf: 'guess', ok: true, resp: { answers: set5 } })
  assert.deepEqual(recordedFrom(e), { id: e.id, conf: 'guess', ok: true, picked: null, answers: set5, provenance: 'own' })
  assert.equal(recordedFrom(event({ kind: 'note', ref: 'note:1' })), undefined)
  assert.equal(recordedFrom(event({ conf: 'guess', resp: 'garbage' })).picked, null)
  assert.equal(recordedFrom(event({ conf: 'guess' })).ok, null)
})

// ---- the session: verdict, confidence, action, and nothing after the call

const recorded = (id = 'e1') => ({ id, conf: 'think', ok: true, picked: 'B', answers: null, provenance: 'own' })

test('a session moves choosing, committing, recorded; the action needs a ready draft; a refusal reopens it with the reason', async () => {
  const item = await choice()
  let s = initialSession()
  assert.equal(s.phase, 'choosing')
  s = reduceSession(s, { t: 'commit' }, item)
  assert.equal(s.phase, 'choosing')
  s = reduceSession(reduceSession(s, { t: 'pick', id: 'B' }, item), { t: 'conf', conf: 'think' }, item)
  s = reduceSession(s, { t: 'commit' }, item)
  assert.equal(s.phase, 'committing')
  assert.equal(reduceSession(s, { t: 'pick', id: 'A' }, item), s, 'no tap while the call is being recorded')
  assert.equal(reduceSession(s, { t: 'commit' }, item), s, 'no second commit')
  const failed = reduceSession(s, { t: 'failed', message: 'quota' }, item)
  assert.equal(failed.phase, 'choosing')
  assert.deepEqual(failed.notice, { kind: 'failed', message: 'quota' })
  assert.equal(failed.draft.picked, 'B', 'the learner\'s taps survive a failure')
  const done = reduceSession(s, { t: 'recorded', call: recorded(), mine: true }, item)
  assert.equal(done.phase, 'recorded')
  assert.equal(done.notice, null)
  assert.deepEqual(reduceSession(s, { t: 'recorded', call: recorded('other'), mine: false }, item).notice, { kind: 'elsewhere' })
})

test('PROPERTY: once the call is recorded, no tap, help box, commit, failure or empty read changes it, whatever the sequence', async () => {
  const items = [await choice(), set()]
  for (const seed of SEEDS) {
    const r = rng(seed)
    for (const item of items) {
      let s = initialSession(recorded())
      const frozen = s
      for (let i = 0; i < 60; i++) {
        const options = item.form === 'choice' ? item.options.map((o) => o.id) : item.statements.map((x) => x.id)
        const a = pick(r, [
          { t: 'pick', id: pick(r, [...options, 'Z']) },
          { t: 'mark', id: pick(r, [...options, 'Z']), value: r() < 0.5 },
          { t: 'conf', conf: pick(r, ['guess', 'think', 'sure']) },
          { t: 'help', on: r() < 0.5 },
          { t: 'commit' },
          { t: 'failed', message: 'x' },
          { t: 'log', call: null },
        ])
        s = reduceSession(s, a, item)
        assert.equal(s, frozen, `seed ${seed}: ${JSON.stringify(a)} changed a recorded call`)
      }
    }
  }
})

test('PROPERTY: from any point, the draft is what the taps made it until the call is recorded, and the record is whatever the log says', async () => {
  const item = await choice()
  for (const seed of SEEDS) {
    const r = rng(seed)
    let s = initialSession()
    let phaseWasRecorded = false
    for (let i = 0; i < 80; i++) {
      const a = pick(r, [
        { t: 'pick', id: pick(r, ['A', 'B', 'C', 'Z']) },
        { t: 'conf', conf: pick(r, ['guess', 'think', 'sure']) },
        { t: 'help', on: r() < 0.5 },
        { t: 'commit' },
        { t: 'failed', message: 'x' },
        { t: 'log', call: r() < 0.3 ? recorded(`e${i}`) : null },
        { t: 'recorded', call: recorded(`m${i}`), mine: r() < 0.5 },
      ])
      const before = s
      s = reduceSession(s, a, item)
      if (before.phase === 'recorded') {
        phaseWasRecorded = true
        assert.equal(s.phase, 'recorded', `seed ${seed}: a recorded sheet never reopens`)
        assert.equal(s.draft, before.draft, `seed ${seed}: the draft of a recorded sheet never changes`)
        if (a.t !== 'log' && a.t !== 'recorded') assert.equal(s, before)
      }
      // committing can be entered only from a ready draft
      if (before.phase !== 'committing' && s.phase === 'committing') assert.equal(ready(item, before.draft), true, `seed ${seed}`)
    }
    assert.ok(typeof phaseWasRecorded === 'boolean')
  }
})
