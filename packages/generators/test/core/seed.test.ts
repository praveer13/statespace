import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEvent, genOfRef, validateEvent } from '@statespace/ledger'
import {
  callRef,
  DISPLAY_BIT,
  formatSeed,
  gradedSeed,
  halfOf,
  inHalf,
  instanceEventFields,
  instanceRef,
  itemRef,
  parseInstanceRef,
  parseSeed,
  seedSequence,
  successor,
} from '../../src/core/index.ts'

test('the halves split on the top bit, and ASSESSMENT.md\'s worked-example seeds are all graded', () => {
  assert.equal(halfOf(0), 'graded')
  assert.equal(halfOf(0x7fffffff), 'graded')
  assert.equal(halfOf(DISPLAY_BIT), 'display')
  assert.equal(halfOf(0xffffffff), 'display')
  for (const s of [0x7c1e09a4, 0x3d8a5c21, 0x0009b21f, 0x44c3a8f2, 0x2b9d0c11, 0x19e4b7d0, 0x0b77f312]) assert.equal(halfOf(s), 'graded', formatSeed(s))
  assert.equal(inHalf(0xdeadbeef, 'graded'), 0x5eadbeef)
  assert.equal(inHalf(0x5eadbeef, 'display'), 0xdeadbeef)
})

test('the successor stays in its half, and the redraw sequence is deterministic and repeats no seed', () => {
  for (const start of [0, 1, 0x7c1e09a4, DISPLAY_BIT, 0xffffffff]) {
    const seq = seedSequence(start, 64)
    assert.equal(seq[0], start)
    assert.equal(new Set(seq).size, 64)
    assert.ok(seq.every((s) => halfOf(s) === halfOf(start)))
    assert.deepEqual(seq, seedSequence(start, 64))
    assert.equal(seq[1], successor(start))
  }
  assert.throws(() => seedSequence(1, -1), RangeError)
})

test('a graded seed comes from the entropy draw, stepping past seeds already taken', () => {
  const raw = 0x9234abcd
  const first = gradedSeed(raw)
  assert.equal(first, inHalf(raw, 'graded'))
  const taken = new Set([first, successor(first)])
  assert.equal(gradedSeed(raw, (s) => taken.has(s)), successor(successor(first)))
  assert.throws(() => gradedSeed(raw, () => true, 3), /no untaken graded seed/)
})

test('seeds print as ASSESSMENT.md writes them and parse back', () => {
  assert.equal(formatSeed(0x0009b21f), '0x0009b21f')
  assert.equal(formatSeed(-1), '0xffffffff')
  assert.equal(parseSeed('0x7C1E09A4'), 0x7c1e09a4)
  assert.equal(parseSeed('42'), 42)
  for (const bad of ['', '0x', '0x123456789', '-1', '4294967296', '1.5', 'seed']) assert.throws(() => parseSeed(bad), RangeError, bad)
})

test('instance references: ASSESSMENT.md section 2.7\'s identity, and event@1\'s item and call refs', () => {
  const ref = instanceRef('GEN-negate-it', 't4', 2, 0x7c1e09a4)
  assert.equal(ref, 'gen:GEN-negate-it:t4:b2:0x7c1e09a4')
  assert.deepEqual(parseInstanceRef(ref), { family: 'GEN-negate-it', template: 't4', band: 2, seed: 0x7c1e09a4 })
  assert.equal(parseInstanceRef('gen:GEN-negate-it:t5:b2:0x7c1e09a4'), undefined)
  assert.equal(parseInstanceRef('item:GEN-negate-it/t4'), undefined)
  assert.equal(itemRef('GEN-negate-it', 't4'), 'item:GEN-negate-it/t4')
  assert.deepEqual(genOfRef(itemRef('GEN-call-it', 't1')), { family: 'GEN-call-it', template: 't1' })
  assert.deepEqual(genOfRef(callRef('GEN-call-it', 't1')), { family: 'GEN-call-it', template: 't1' })
})

test('an item event built from instanceEventFields is a valid event@1 record that carries the band', () => {
  const fields = instanceEventFields({ family: 'GEN-negate-it', template: 't4', band: 2, seed: 0x7c1e09a4 })
  const e = createEvent(
    { kind: 'item', ref: fields.ref, seed: fields.seed, ok: true, provenance: 'own', exposure: 'unseen', data: fields.data },
    { id: 'evt-1', nowMs: Date.UTC(2026, 9, 25, 12), tz: 60, dev: 'dev-a' },
  )
  assert.deepEqual(validateEvent(e), [])
  assert.equal((e.data as { instance: { band: number } }).instance.band, 2)
  assert.equal(parseInstanceRef((e.data as { instance: { ref: string } }).instance.ref)?.seed, e.seed)
})
