import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  civilFromDays,
  compareInstants,
  dayFromNumber,
  dayNumber,
  daysBetween,
  daysFromCivil,
  instantKey,
  instantMs,
  localDayOf,
  localTimeOf,
  stampTime,
  weekday,
} from '../src/index.ts'
import { int, rng, SEEDS } from './helpers.ts'

test('civil days match Date.UTC over four centuries and round-trip', () => {
  for (let d = -150_000; d <= 150_000; d += 37) {
    const { year, month, day } = civilFromDays(d)
    assert.equal(daysFromCivil(year, month, day), d)
    if (year >= 100) assert.equal(Date.UTC(year, month - 1, day) / 86_400_000, d)
  }
  assert.equal(dayFromNumber(0), '1970-01-01')
  assert.equal(dayNumber('2000-02-29'), Date.UTC(2000, 1, 29) / 86_400_000)
  assert.equal(dayFromNumber(dayNumber('0004-02-29')), '0004-02-29', 'years below 100 are not read as 19xx')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(weekday('2026-10-26'), 1, '2026-10-26 is a Monday')
  assert.equal(weekday('1970-01-01'), 4, 'a Thursday')
})

test('instants compare exactly, whatever offset each carries', () => {
  assert.equal(compareInstants('2026-10-24T05:20:00+01:00', '2026-10-24T04:20:00Z'), 0)
  assert.equal(compareInstants('2026-10-24T04:20:00.5Z', '2026-10-24T04:20:00.50Z'), 0)
  assert.ok(compareInstants('2026-10-24T04:20:00.0001Z', '2026-10-24T04:20:00Z') > 0)
  assert.ok(compareInstants('2026-10-24T00:30:00+05:45', '2026-10-23T18:46:00Z') < 0)
  assert.ok(compareInstants('2026-10-24T23:59:59-12:00', '2026-10-25T11:59:58Z') > 0)
  assert.deepEqual(instantKey('1970-01-01T00:00:01.250Z'), { s: 1, f: '25' })
  assert.equal(instantMs('1970-01-01T00:00:01.2509Z'), 1250)
  assert.throws(() => instantKey('2026-10-24 05:20:00Z'), RangeError)
  assert.throws(() => instantKey('2026-10-24T05:20:00'), RangeError)
  assert.equal(localDayOf('2026-10-24T23:30:00-07:00'), '2026-10-24')
  assert.equal(localTimeOf('2026-10-24T23:30:05.125-07:00'), '23:30:05', 'the time as written, in its own offset, without the fraction')
  assert.equal(localTimeOf('2026-10-24T04:20:00Z'), '04:20:00')
  assert.throws(() => localTimeOf('2026-10-24T05:20'), RangeError)
})

test('stampTime writes the local time with its offset and freezes the local day', () => {
  for (const seed of SEEDS) {
    const r = rng(seed)
    const ms = Date.UTC(2026, 0, 1) + int(r, 0, 3_000) * 86_400_000 + int(r, 0, 86_399_999)
    const tz = int(r, -720, 840)
    const { at, day, tz: written } = stampTime(ms, tz)
    assert.equal(written, tz)
    assert.equal(instantMs(at), ms, 'the instant is the clock reading')
    const local = new Date(ms + tz * 60_000)
    assert.equal(day, local.toISOString().slice(0, 10), 'day is the local date')
    assert.equal(at.slice(0, 23), local.toISOString().slice(0, 23))
  }
  assert.equal(stampTime(0, 0).at, '1970-01-01T00:00:00.000+00:00')
  assert.equal(stampTime(0, -0).tz, 0)
  assert.ok(!Object.is(stampTime(0, -0).tz, -0))
  assert.equal(stampTime(Date.UTC(2026, 9, 25, 3, 0), 345).at, '2026-10-25T08:45:00.000+05:45')
  assert.throws(() => stampTime(0, 841), RangeError)
  assert.throws(() => stampTime(Number.NaN, 0), RangeError)
})
