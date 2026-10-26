import assert from 'node:assert/strict'
import { test } from 'node:test'
import { armOf, kcComparison } from '@statespace/ledger/keepkill'
import { armRecord, CLASS_COMPARISON, NOTE_COMPARISON, readArm } from '../../src/core/index.ts'
import type { ArmReading } from '../../src/core/index.ts'
import { DAY, draw, ev, stubContent, T0 } from './helpers.ts'

const KC = 'KC-1.only-if-direction' // a unit of comparisons 1 and 3
const content = stubContent()
const item = (at: number, family = 'GEN-negate-it', kc = KC) => ev({ at, kc, family, template: 1, seed: 7, ok: true })

test('no draw, or a draw under other rules, means no arm', () => {
  const events = [item(T0)]
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events, draws: [], content }), { applies: false, why: 'off' })
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events, draws: [draw(5, T0 - 7 * DAY, 'f'.repeat(64))], content }), { applies: false, why: 'rules-changed' })
})

test('arms act only on practice items, and comparison 3 only on the families it lists', () => {
  const ctx = { events: [item(T0)], draws: [draw(5)], content }
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: false }, ctx), { applies: false, why: 'not-practice' })
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-call-it', practice: true }, ctx), { applies: false, why: 'family-not-listed' })
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: 'KC-1.three-answers', family: 'GEN-negate-it', practice: true }, { ...ctx, events: [item(T0, 'GEN-negate-it', 'KC-1.three-answers')] }), { applies: false, why: 'not-a-unit' })
})

test('comparison 3: a unit enters on its first practice item, the item itself included, under the allocated arm', () => {
  for (const expSeed of [1, 2, 3, 2654435769]) {
    const current = item(T0)
    const before = readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events: [], draws: [draw(expSeed)], content })
    assert.deepEqual(before, { applies: false, why: 'waiting' })
    const r = readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true, event: current }, { events: [], draws: [draw(expSeed)], content })
    assert.deepEqual(r, { applies: true, comparison: CLASS_COMPARISON, arm: armOf(kcComparison(CLASS_COMPARISON), KC, expSeed), expSeed })
    // Already in the log: the same reading, and the event is not counted twice.
    assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true, event: current }, { events: [current], draws: [draw(expSeed)], content }), r)
  }
})

test('the exclusions hold: an entry before the draw, or a KC credited at placement, never enters', () => {
  const early = readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events: [item(T0)], draws: [draw(9, T0 + DAY)], content })
  assert.deepEqual(early, { applies: false, why: 'before-draw' })
  const placed = ev({ at: T0 - DAY, ref: 'placement:step-1', kc: KC, ok: true })
  assert.deepEqual(readArm(CLASS_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events: [placed, item(T0)], draws: [draw(9)], content }), { applies: false, why: 'placement' })
})

test('comparison 1: an expert KC enters at first learning; a novice KC waits until it is solid', () => {
  const expert = stubContent({ [KC]: 'expert' })
  const exit = ev({ at: T0, kc: KC, family: 'GEN-negate-it', template: 4, seed: 3, ok: false, exit: KC })
  const r = readArm(NOTE_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events: [exit], draws: [draw(11)], content: expert })
  assert.deepEqual(r, { applies: true, comparison: NOTE_COMPARISON, arm: armOf(kcComparison(NOTE_COMPARISON), KC, 11), expSeed: 11 })
  assert.deepEqual(readArm(NOTE_COMPARISON, { kc: KC, family: 'GEN-negate-it', practice: true }, { events: [exit], draws: [draw(11)], content }), { applies: false, why: 'waiting' })
})

test('the record an item carries names the comparison, the arm, the seed and any fallback', () => {
  const reading = { applies: true, comparison: CLASS_COMPARISON, arm: 'contrast-then-class', expSeed: 4 } as Extract<ArmReading, { applies: true }>
  assert.deepEqual(armRecord(reading), { comparison: CLASS_COMPARISON, arm: 'contrast-then-class', expSeed: 4 })
  assert.deepEqual(armRecord(reading, 'no witness'), { comparison: CLASS_COMPARISON, arm: 'contrast-then-class', expSeed: 4, fallback: 'no witness' })
})
