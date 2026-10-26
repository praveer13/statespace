// A specimen moves from mounted to kept after a re-find on a fresh variant at least 7 days later (spine section 5.1), and
// the re-find schedule says from which day. These tests hold the rule at its edges: the sixth and the seventh day, local
// days across a month end and across a time zone, what is fresh, what is a re-find, and that the order the events arrive in
// changes nothing.

import assert from 'node:assert/strict'
import test from 'node:test'
import { REFIND_AFTER_DAYS, callLessonOf, keepEvent, mountEvent, refindData, refindOf, refindSchedule, stateOf, statesOf } from '../model/status.ts'
import { call, event, refind, shuffled } from './helpers.mjs'

const RULE = { lessons: ['S1.L0', 'S1.L1'] }
const ID = 'SP-1.1'

test('the rule is seven days', () => assert.equal(REFIND_AFTER_DAYS, 7))

test('a specimen the learner has not met is unmet, whatever else the log holds', () => {
  assert.deepEqual(stateOf([], ID, RULE), { status: 'unmet' })
  const others = [call('S1.L2', '2026-11-02T08:00:00Z'), event({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 5 }), refind(ID, '2026-11-20T08:00:00Z')]
  assert.deepEqual(stateOf(others, ID, RULE), { status: 'unmet' })
})

test('the first call on a cell of a lesson that mounts it mounts it, on the day that call was written', () => {
  const first = call('S1.L0', '2026-11-02T08:10:00Z')
  const later = call('S1.L1', '2026-11-03T08:00:00Z')
  assert.equal(mountEvent([later, first], RULE).id, first.id)
  assert.deepEqual(stateOf([later, first], ID, RULE), { status: 'mounted', mountedAt: '2026-11-02T08:10:00Z', mountedDay: '2026-11-02', refindFrom: '2026-11-09' })
  // a lesson the record does not name mounts nothing, and neither does anything but a call
  assert.equal(mountEvent([call('S1.L4', '2026-11-02T08:00:00Z')], RULE), undefined)
  assert.equal(mountEvent([event({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 5 }), event({ kind: 'lab-check', ref: 'lab-check:LAB-1.c1' })], RULE), undefined)
  // a generated call and a forecast are not a call on a cell of a lesson
  assert.equal(callLessonOf(event({ kind: 'call', ref: 'call:GEN-call-it/t1' })), null)
  assert.equal(callLessonOf(event({ kind: 'call', ref: 'call:ER-1/forecast' })), null)
  assert.equal(callLessonOf(event({ kind: 'call', ref: 'call:S10.L5/cell-2' })), 'S10.L5')
})

test('an agent never mounts a specimen; an assisted learner does', () => {
  const agent = call('S1.L0', '2026-11-02T08:00:00Z', { provenance: 'agent' })
  const assisted = call('S1.L0', '2026-11-04T08:00:00Z', { provenance: 'assisted' })
  assert.deepEqual(stateOf([agent], ID, RULE), { status: 'unmet' })
  assert.equal(stateOf([agent, assisted], ID, RULE).mountedDay, '2026-11-04')
  // a seen call (the learner met the cell before) still mounts: a first run can come after a look
  assert.equal(stateOf([call('S1.L0', '2026-11-02T08:00:00Z', { exposure: 'seen' })], ID, RULE).status, 'mounted')
})

test('a re-find on the sixth day does not keep it, on the seventh day it does, and a re-find on the same day as the mount does not', () => {
  const mount = call('S1.L0', '2026-11-02T08:10:00Z')
  const keptAfter = (days, extra = {}) => stateOf([mount, refind(ID, `2026-11-${String(2 + days).padStart(2, '0')}T08:00:00Z`, extra)], ID, RULE)
  assert.equal(keptAfter(0).status, 'mounted')
  assert.equal(keptAfter(6).status, 'mounted')
  assert.deepEqual(keptAfter(7), { status: 'kept', mountedAt: '2026-11-02T08:10:00Z', mountedDay: '2026-11-02', refindFrom: '2026-11-09', keptAt: '2026-11-09T08:00:00Z', keptDay: '2026-11-09' })
  assert.equal(keptAfter(8).status, 'kept')
  assert.equal(keptAfter(27).status, 'kept')
})

test('the days are the local days the events were written on, so a re-find on the date the cabinet prints keeps it', () => {
  // mounted late on a Monday, re-found early on the Monday after: 6 days and 9 hours apart, and 7 calendar days
  const mount = call('S1.L0', '2026-11-02T23:00:00Z')
  const early = refind(ID, '2026-11-09T08:00:00Z')
  assert.equal(stateOf([mount, early], ID, RULE).status, 'kept')
  // a month end: mounted on 30 October, re-found on 6 November (7 days), not on 5 November
  const oct = call('S1.L1', '2026-10-30T09:00:00Z')
  assert.equal(stateOf([oct, refind(ID, '2026-11-05T09:00:00Z')], ID, RULE).status, 'mounted')
  assert.deepEqual([stateOf([oct], ID, RULE).refindFrom, stateOf([oct, refind(ID, '2026-11-06T09:00:00Z')], ID, RULE).status], ['2026-11-06', 'kept'])
  // a year end and a leap day
  assert.equal(stateOf([call('S1.L1', '2027-12-28T09:00:00Z')], ID, RULE).refindFrom, '2028-01-04')
  assert.equal(stateOf([call('S1.L1', '2028-02-26T09:00:00Z')], ID, RULE).refindFrom, '2028-03-04')
  // the day is the one the event froze when it was written: a call at 23:30 in UTC-05:00 is on the 2nd, and its re-find's own day counts
  const west = event({ kind: 'call', ref: 'call:S1.L0/c1', at: '2026-11-02T23:30:00-05:00', tz: -300 })
  assert.equal(west.day, '2026-11-02')
  assert.equal(stateOf([west], ID, RULE).refindFrom, '2026-11-09')
  const eastRefind = refind(ID, '2026-11-10T01:00:00+09:00', { tz: 540 })
  assert.equal(eastRefind.day, '2026-11-10')
  assert.equal(stateOf([west, eastRefind], ID, RULE).status, 'kept')
  // an event at 2026-11-09T01:00+09:00 is on the 9th by its own offset, though it is the 8th in UTC
  assert.equal(stateOf([west, refind(ID, '2026-11-09T01:00:00+09:00', { tz: 540 })], ID, RULE).status, 'kept')
})

test('only a fresh re-find of this specimen, answered correctly, keeps it', () => {
  const mount = call('S1.L0', '2026-11-02T08:10:00Z')
  const at = '2026-11-20T08:00:00Z'
  const status = (...events) => stateOf([mount, ...events], ID, RULE).status
  assert.equal(status(refind(ID, at)), 'kept')
  // a miss, an ungraded item and an item that only looks like one
  assert.equal(status(refind(ID, at, { ok: false })), 'mounted')
  const ungraded = event({ kind: 'item', ref: 'item:GEN-find-the-witness/t1', at, seed: 9, data: { refind: { specimen: ID } } })
  assert.equal(ungraded.ok, undefined)
  assert.equal(status(ungraded), 'mounted')
  // not fresh: seen, assisted, an agent's, or authored (no seed)
  assert.equal(status(refind(ID, at, { exposure: 'seen' })), 'mounted')
  assert.equal(status(refind(ID, at, { provenance: 'assisted' })), 'mounted')
  assert.equal(status(refind(ID, at, { provenance: 'agent' })), 'mounted')
  const noSeed = event({ kind: 'item', ref: 'item:GEN-find-the-witness/t1', at, ok: true, data: { refind: { specimen: ID } } })
  assert.equal(status(noSeed), 'mounted')
  // another specimen's re-find, a bare item on the same family, and the tag on an event of another kind
  assert.equal(status(refind('SP-1.2', at)), 'mounted')
  assert.equal(status(event({ kind: 'item', ref: 'item:GEN-find-the-witness/t1', at, seed: 9, ok: true })), 'mounted')
  assert.equal(status(event({ kind: 'probe', ref: 'probe:S1/A/1/1', at, seed: 9, ok: true, data: { refind: { specimen: ID } } })), 'mounted')
  assert.equal(status(event({ kind: 'call', ref: 'call:GEN-find-the-witness/t1', at, ok: true, data: { refind: { specimen: ID } } })), 'mounted')
  // a tag that is not a specimen's ID, or not a tag
  assert.equal(status(refind('SP-1.1; DROP', at, {})), 'mounted')
  assert.equal(status(event({ kind: 'item', ref: 'item:GEN-find-the-witness/t1', at, seed: 9, ok: true, data: { refind: 'SP-1.1' } })), 'mounted')
})

test('a miss is followed by a find, the first correct re-find keeps it, and a later miss never undoes the keep', () => {
  const mount = call('S1.L0', '2026-11-02T08:10:00Z')
  const miss = refind(ID, '2026-11-09T08:00:00Z', { ok: false })
  const found = refind(ID, '2026-11-12T08:00:00Z')
  const second = refind(ID, '2026-11-30T08:00:00Z')
  const later = refind(ID, '2026-12-20T08:00:00Z', { ok: false })
  const kept = stateOf([mount, miss, found, second, later], ID, RULE)
  assert.equal(kept.status, 'kept')
  assert.equal(kept.keptDay, '2026-11-12')
  assert.equal(keepEvent([mount, miss, found, second], ID, mount).id, found.id)
  // before the mount a re-find means nothing, and the tag alone does not mount
  assert.equal(stateOf([refind(ID, '2026-11-20T08:00:00Z')], ID, RULE).status, 'unmet')
  assert.equal(stateOf([refind(ID, '2026-10-20T08:00:00Z'), mount], ID, RULE).status, 'mounted')
})

test('the order the events arrive in changes nothing', () => {
  const events = [
    call('S1.L1', '2026-11-03T08:00:00Z'),
    call('S1.L0', '2026-11-02T08:10:00Z'),
    call('S1.L0', '2026-11-02T08:10:00Z', { ref: 'call:S1.L0/c2' }),
    refind(ID, '2026-11-09T08:00:00Z', { ok: false }),
    refind(ID, '2026-11-10T08:00:00Z'),
    refind(ID, '2026-11-10T08:00:00Z', { ref: 'item:GEN-negate-it/t2' }),
    event({ kind: 'item', ref: 'item:GEN-call-it/t1', at: '2026-11-11T08:00:00Z', seed: 4, ok: true }),
  ]
  const expected = stateOf(events, ID, RULE)
  assert.equal(expected.status, 'kept')
  for (let seed = 1; seed <= 25; seed += 1) assert.deepEqual(stateOf(shuffled(events, seed), ID, RULE), expected, `shuffle ${seed}`)
  // two events at the same instant are told apart by id, the ledger's own fold order
  const twin = [call('S1.L0', '2026-11-02T08:10:00Z'), call('S1.L1', '2026-11-02T08:10:00Z')]
  assert.deepEqual(stateOf(twin, ID, RULE), stateOf([...twin].reverse(), ID, RULE))
})

test('the re-find tag is one contract: refindData writes what refindOf reads, and neither accepts anything else', () => {
  const data = refindData('SP-4.1')
  assert.deepEqual(data, { refind: { specimen: 'SP-4.1' } })
  assert.equal(refindOf({ kind: 'item', data }), 'SP-4.1')
  assert.equal(refindOf({ kind: 'item', data: {} }), null)
  assert.equal(refindOf({ kind: 'item' }), null)
  assert.equal(refindOf({ kind: 'item', data: { refind: null } }), null)
  assert.equal(refindOf({ kind: 'item', data: { refind: { specimen: 7 } } }), null)
  assert.equal(refindOf({ kind: 'probe', data }), null)
  assert.throws(() => refindData('SP-1'), /not a specimen ID/)
  assert.throws(() => refindData('sp-1.1'), /not a specimen ID/)
  assert.throws(() => refindData('SP-1.1\n'), /not a specimen ID/)
})

test('the schedule lists what is mounted and not yet kept, soonest first, and says from which day', () => {
  const events = [
    call('S1.L5', '2026-11-04T08:00:00Z'), // SP-1.10 and SP-1.9 mount here
    call('S1.L4', '2026-11-02T08:00:00Z'), // SP-1.2 mounts here
    call('S1.L3', '2026-11-02T09:00:00Z'), // SP-1.6 mounts here
    call('S1.L0', '2026-10-20T08:00:00Z'), // SP-1.1 mounts here, and is kept below
    refind('SP-1.1', '2026-10-28T08:00:00Z'),
  ]
  const specimens = [
    { id: 'SP-1.10', mount: { lessons: ['S1.L5'] } },
    { id: 'SP-1.9', mount: { lessons: ['S1.L5'] } },
    { id: 'SP-1.2', mount: { lessons: ['S1.L4'] } },
    { id: 'SP-1.6', mount: { lessons: ['S1.L3'] } },
    { id: 'SP-1.1', mount: { lessons: ['S1.L0'] } },
    { id: 'SP-1.7', mount: { lessons: ['S1.L2'] } },
    { id: 'SP-1.8' },
  ]
  const states = statesOf(events, specimens)
  assert.equal(states.get('SP-1.1').status, 'kept')
  assert.equal(states.get('SP-1.7').status, 'unmet')
  assert.equal(states.get('SP-1.8').status, 'unmet')
  const schedule = refindSchedule(states, '2026-11-09')
  assert.deepEqual(
    schedule.map((s) => [s.specimen, s.from, s.ready]),
    [
      ['SP-1.2', '2026-11-09', true],
      ['SP-1.6', '2026-11-09', true],
      ['SP-1.9', '2026-11-11', false],
      ['SP-1.10', '2026-11-11', false],
    ],
  )
  assert.deepEqual(schedule[0], { specimen: 'SP-1.2', from: '2026-11-09', mountedDay: '2026-11-02', ready: true })
  // the day before a specimen's day, it is not ready; the day after, it still is, and there is nothing that counts days late
  assert.equal(refindSchedule(states, '2026-11-08').find((s) => s.specimen === 'SP-1.2').ready, false)
  assert.equal(refindSchedule(states, '2027-03-01').find((s) => s.specimen === 'SP-1.2').ready, true)
  assert.deepEqual(Object.keys(refindSchedule(states, '2027-03-01')[0]).sort(), ['from', 'mountedDay', 'ready', 'specimen'])
  assert.deepEqual(refindSchedule(new Map(), '2026-11-09'), [])
})
