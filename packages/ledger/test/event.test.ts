import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import {
  createEvent,
  decodeEvent,
  encodeEvent,
  EVENT_KINDS,
  genOfRef,
  isFresh,
  isLedgerEvent,
  itemContext,
  kcOfContext,
  LedgerError,
  normalizeEvent,
  validateEvent,
  validateExpSeedDraw,
  weigh,
  WEIGHTS,
} from '../src/index.ts'
import type { EventInput, LedgerEvent } from '../src/index.ts'
import { genEvent, RULES_SHA, ROOT, rng, SEEDS } from './helpers.ts'

const FIXTURES = path.join(ROOT, 'schemas', 'fixtures', 'event')
const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, 'utf8'))

test('every event@1 fixture is read by the ledger as the schema reads it', () => {
  for (const f of fs.readdirSync(path.join(FIXTURES, 'valid'))) assert.deepEqual(validateEvent(readJson(path.join(FIXTURES, 'valid', f))), [], f)
  const index = readJson(path.join(FIXTURES, 'invalid', 'index.json')) as { file: string; instancePath: string; keyword: string }[]
  for (const { file, instancePath, keyword } of index) {
    const issues = validateEvent(readJson(path.join(FIXTURES, 'invalid', file)))
    assert.ok(issues.some((i) => i.instancePath === instancePath && i.keyword === keyword), `${file}: ${JSON.stringify(issues)}`)
  }
})

test('the spine section 8.2 reconciliation: no automated provenance, a view kind and the item contexts', () => {
  assert.deepEqual([...EVENT_KINDS].sort(), ['audit', 'call', 'explain-back', 'item', 'lab-check', 'note', 'probe', 'prove-it', 'receipt-import', 'view'])
  const base = { id: 'e1', v: 1, provenance: 'own', exposure: 'seen', at: '2026-10-24T05:20:00+01:00', tz: 60, day: '2026-10-24', dev: 'd' }
  assert.ok(isLedgerEvent({ ...base, kind: 'view', ref: 'view:D-13' }))
  assert.ok(!isLedgerEvent({ ...base, kind: 'view', ref: 'view:D-130' }))
  assert.ok(!isLedgerEvent({ ...base, kind: 'item', ref: 'item:GEN-negate-it/t1', provenance: 'automated' }))
  for (const ref of ['item:GEN-negate-it/t4', 'drawer:D-03/i2', 'placement:step-4', 'testout:KC-1.violation-as-sat', 'confirm:KC-4.cti-or-bug']) {
    assert.ok(isLedgerEvent({ ...base, kind: 'item', ref }), ref)
  }
  for (const ref of ['drawer:D-3/i2', 'testout:KC-1', 'confirm:S1.L2', 'view:D-03', 'placement:', 'item:GEN-x']) {
    assert.ok(!isLedgerEvent({ ...base, kind: 'item', ref }), ref)
  }
  assert.equal(itemContext({ kind: 'item', ref: 'drawer:D-03/i2' }), 'drawer')
  assert.equal(itemContext({ kind: 'call', ref: 'call:S1.L3/c1' }), undefined)
  assert.deepEqual(genOfRef('item:GEN-negate-it/t4'), { family: 'GEN-negate-it', template: 't4' })
  assert.deepEqual(genOfRef('call:GEN-call-it/t1'), { family: 'GEN-call-it', template: 't1' })
  assert.equal(genOfRef('drawer:D-03/i2'), undefined)
  assert.equal(kcOfContext('confirm:KC-1.violation-as-sat'), 'KC-1.violation-as-sat')
  assert.equal(kcOfContext('placement:step-4'), undefined)
})

test('validation refuses a value with no canonical form, such as the infinity JSON.parse makes of 1e400', () => {
  const e = JSON.parse('{"id":"e","v":1,"kind":"note","ref":"note:1","provenance":"own","exposure":"seen","at":"2026-10-24T05:20:00Z","tz":0,"day":"2026-10-24","dev":"d","ms":1e400}')
  assert.equal(e.ms, Number.POSITIVE_INFINITY)
  assert.ok(validateEvent(e).some((i) => i.keyword === 'canonical'))
  assert.throws(() => normalizeEvent(e), (x: unknown) => x instanceof LedgerError && x.code === 'invalid-event')
})

test('createEvent stamps id, v, at, tz, day and dev from the injected clock and stores the canonical form', () => {
  // apps/site compiles without exactOptionalPropertyTypes, so an input may carry an explicit undefined.
  const loose = { kind: 'call', ref: 'call:S1.L3/c1', provenance: 'own', exposure: 'unseen', conf: 'sure', resp: { picked: 'B', extra: undefined }, ok: undefined }
  const e = createEvent(loose as unknown as EventInput, { id: 'id-1', nowMs: Date.UTC(2026, 9, 25, 22, 30), tz: 120, dev: 'dev-x' })
  assert.deepEqual(e, {
    id: 'id-1',
    v: 1,
    kind: 'call',
    ref: 'call:S1.L3/c1',
    provenance: 'own',
    exposure: 'unseen',
    conf: 'sure',
    resp: { picked: 'B' },
    at: '2026-10-26T00:30:00.000+02:00',
    tz: 120,
    day: '2026-10-26',
    dev: 'dev-x',
  })
  assert.throws(
    () => createEvent({ kind: 'item', ref: 'call:S1.L3/c1', provenance: 'own', exposure: 'unseen' }, { id: 'x', nowMs: 0, tz: 0, dev: 'd' }),
    LedgerError,
  )
  // A stored status is refused: the schema is closed (I2).
  assert.throws(() => normalizeEvent({ ...e, status: 'learned' }), LedgerError)
})

test('encode and decode round-trip every generated event, and decode refuses outside bytes that are not event@1', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    for (let i = 0; i < 25; i++) {
      const e = genEvent(r)
      const text = encodeEvent(e)
      const back = decodeEvent(text)
      assert.ok(back.ok, JSON.stringify(back))
      assert.deepEqual(back.ok ? back.event : null, normalizeEvent(e))
      assert.equal(encodeEvent(back.ok ? back.event : e), text, 'canonical text is stable')
    }
  }
  assert.equal(decodeEvent('{"__proto__":{"x":1}}').ok, false)
  assert.equal(decodeEvent('[]').ok, false)
  assert.equal(decodeEvent('not json').ok, false)
})

test('experiment-seed draws validate against event@1 $defs/expSeedDraw', () => {
  const good = { expSeed: 4294967295, drawnAt: '2026-10-25T10:00:00.000+01:00', rulesSha256: RULES_SHA, dev: 'dev-a' }
  assert.deepEqual(validateExpSeedDraw(good), [])
  for (const bad of [
    { ...good, expSeed: 4294967296 },
    { ...good, expSeed: -1 },
    { ...good, expSeed: 1.5 },
    { ...good, drawnAt: '2026-10-25' },
    { ...good, rulesSha256: 'ABC' },
    { ...good, dev: 'has space' },
    { ...good, extra: 1 },
    { expSeed: 1, drawnAt: good.drawnAt, rulesSha256: RULES_SHA },
  ]) {
    assert.notDeepEqual(validateExpSeedDraw(bad), [], JSON.stringify(bad))
  }
})

test('weights are the spine section 8.2 table, applied at read time', () => {
  const ev = (o: Partial<LedgerEvent>): LedgerEvent => ({ id: 'e', v: 1, kind: 'item', ref: 'item:GEN-negate-it/t1', provenance: 'own', exposure: 'unseen', at: '2026-10-24T05:20:00Z', tz: 0, day: '2026-10-24', dev: 'd', ...o })
  assert.deepEqual(weigh(ev({ seed: 7 })), { tier: 'fresh', weight: 1, counts: ['sign-off', 'settled', 'vrk30', 'judgment', 'scheduling'] })
  assert.ok(isFresh(ev({ seed: 7 })))
  assert.equal(weigh(ev({})).tier, 'authored', 'no seed: an authored cell or anchor on first exposure')
  assert.deepEqual(weigh(ev({ kind: 'audit', ref: 'audit:AUD-1.1/anchor' })).counts, ['judgment', 'scheduling'])
  assert.deepEqual(weigh(ev({ seed: 7, exposure: 'seen' })), { tier: 'practice', weight: 0.3, counts: ['scheduling'] })
  assert.deepEqual(weigh(ev({ seed: 7, provenance: 'assisted' })), { tier: 'assisted', weight: 0.3, counts: ['scheduling'] })
  assert.deepEqual(weigh(ev({ seed: 7, provenance: 'agent' })), { tier: 'agent', weight: 0, counts: [] })
  for (const kind of ['view', 'note', 'explain-back', 'lab-check', 'receipt-import'] as const) {
    const ref = { view: 'view:D-03', note: 'note:1', 'explain-back': 'explain-back:S1', 'lab-check': 'lab-check:LAB-1.c1', 'receipt-import': `receipt-import:${'ab'.repeat(32)}` }[kind]
    assert.deepEqual(weigh(ev({ kind, ref, seed: 1 })), { tier: 'uncredited', weight: 0, counts: [] }, kind)
  }
  assert.ok(!isFresh(ev({ kind: 'call', ref: 'call:GEN-negate-it/t1', seed: 1 })), 'a call is calibration, never fresh evidence')
  assert.equal(weigh(ev({ kind: 'call', ref: 'call:S1.L3/c1' })).tier, 'authored')
  assert.deepEqual(WEIGHTS, { fresh: 1, authored: 1, practice: 0.3, assisted: 0.3, agent: 0, uncredited: 0 })
})
