import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canDrawExpSeed, createExpSeedDraw, drawFor, EMPTY_LOG, LedgerError, logFrom, RULES_SHA256 } from '../src/index.ts'
import { genDraw, genEvent, rng } from './helpers.ts'

test('a draw is allowed only before the first event and only once (never redrawn)', () => {
  const r = rng(1)
  assert.deepEqual(canDrawExpSeed(EMPTY_LOG), { ok: true })
  assert.deepEqual(canDrawExpSeed(logFrom([genEvent(r)])), { ok: false, reason: 'events-exist' })
  assert.deepEqual(canDrawExpSeed(logFrom([], [genDraw(r)])), { ok: false, reason: 'already-drawn' })
  assert.throws(() => drawFor(logFrom([], [genDraw(r)]), { expSeed: 1, nowMs: 0, tz: 0, dev: 'd' }), (e: unknown) => e instanceof LedgerError && e.code === 'refused')
  assert.throws(() => drawFor(logFrom([genEvent(r)]), { expSeed: 1, nowMs: 0, tz: 0, dev: 'd' }), LedgerError)
})

test('a draw stores the seed, the instant from the injected clock, the rules hash and the device', () => {
  const d = drawFor(EMPTY_LOG, { expSeed: 2654435769, nowMs: Date.UTC(2026, 9, 25, 9, 0), tz: 60, dev: 'dev-a' })
  assert.deepEqual(d, { expSeed: 2654435769, drawnAt: '2026-10-25T10:00:00.000+01:00', rulesSha256: RULES_SHA256, dev: 'dev-a' })
  assert.throws(() => createExpSeedDraw({ expSeed: 2 ** 32, nowMs: 0, tz: 0, dev: 'd' }), (e: unknown) => e instanceof LedgerError && e.code === 'invalid-draw')
  assert.throws(() => createExpSeedDraw({ expSeed: 1.5, nowMs: 0, tz: 0, dev: 'd' }), LedgerError)
})
