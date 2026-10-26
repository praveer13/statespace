import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { LedgerEvent } from '@statespace/ledger'
import { activeMonthsOf, deriveVrk30 } from '../src/mirror/index.ts'
import { DAY0, SEEDS, content, event, exitItem, minutesAfter, pick, rng, shuffled } from './mirror-helpers.ts'

const NOW = '2027-06-01T00:00:00Z'
const DAY = 24 * 60

let seeds = 0

/** A fresh item event on a KC: own, unseen, generated (its own seed), graded, `days` after DAY0 and `extra` minutes. */
function fresh(kc: string, days: number, ok: boolean | undefined, f: Partial<LedgerEvent> = {}, extraMinutes = 0): LedgerEvent {
  const at = minutesAfter(DAY0, days * DAY + extraMinutes)
  seeds += 1
  return event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1000 + seeds, at, ...(ok === undefined ? {} : { ok }), data: { kc }, ...f })
}

/** The first attempt at the exit item of the KC's first lesson, on DAY0. */
const learn = (kc: string, at = DAY0): LedgerEvent => exitItem(kc, at)

describe('VRK30: KCs whose latest qualifying event, 30 days or more after first learning, is correct (ASSESSMENT.md section 3.6)', () => {
  test('a fresh correct answer 30 days after first learning counts; one 29 days after does not', () => {
    const a = deriveVrk30({ events: [learn('KC-1.a'), fresh('KC-1.a', 29, true)], content, now: NOW })
    assert.equal(a.count, 0)
    assert.equal(a.qualifying, 0)
    const b = deriveVrk30({ events: [learn('KC-1.a'), fresh('KC-1.a', 31, true)], content, now: NOW })
    assert.equal(b.count, 1)
    assert.deepEqual(b.kcs.map((k) => k.kc), ['KC-1.a'])
    assert.equal(b.kcs[0]!.firstLearning, DAY0)
  })

  test('the 30 days are exact elapsed time from the first-learning instant, whatever offset either carries', () => {
    const l = learn('KC-1.a', '2026-11-02T08:00:00Z')
    const exactly = fresh('KC-1.a', 0, true, { at: '2026-12-02T08:00:00Z' })
    const oneSecondShort = fresh('KC-1.b', 0, true, { at: '2026-12-02T07:59:59Z' })
    const lb = learn('KC-1.b', '2026-11-02T08:00:00Z')
    assert.equal(deriveVrk30({ events: [l, exactly], content, now: NOW }).count, 1)
    assert.equal(deriveVrk30({ events: [lb, oneSecondShort], content, now: NOW }).count, 0)
    // 10:00 at +02:00 is 08:00Z: the same instant as the first-learning event above
    const sameInstantElsewhere = fresh('KC-1.a', 0, true, { at: '2026-12-02T10:00:00+02:00', tz: 120 })
    assert.equal(deriveVrk30({ events: [l, sameInstantElsewhere], content, now: NOW }).count, 1)
  })

  test('a KC counts while its latest qualifying event is correct: a later miss removes it, a later match restores it', () => {
    const e = [
      learn('KC-1.a'),
      learn('KC-1.b'),
      learn('KC-1.c'),
      fresh('KC-1.a', 40, true),
      fresh('KC-1.b', 40, true),
      fresh('KC-1.b', 50, false),
      fresh('KC-1.c', 40, true),
      fresh('KC-1.c', 50, false),
      fresh('KC-1.c', 60, true),
    ]
    const v = deriveVrk30({ events: e, content, now: NOW })
    assert.deepEqual(v.kcs.map((k) => k.kc).sort(), ['KC-1.a', 'KC-1.c'])
    assert.equal(v.count, 2)
    // every qualifying event is counted for the accuracy: 4 right of 6
    assert.equal(v.qualifying, 6)
    assert.equal(v.accuracy!.hits, 4)
    assert.equal(v.kcs.find((k) => k.kc === 'KC-1.c')!.at, minutesAfter(DAY0, 60 * DAY))
  })

  test('only fresh events qualify: not an assisted, agent or seen one, an ungraded one, a call, an authored cell, or a KC never learned', () => {
    const e = [
      learn('KC-1.a'),
      fresh('KC-1.a', 40, true, { provenance: 'assisted' }),
      fresh('KC-1.a', 41, true, { provenance: 'agent' }),
      fresh('KC-1.a', 42, true, { exposure: 'seen' }),
      fresh('KC-1.a', 43, undefined),
      event({ kind: 'call', ref: 'call:S1.L2/c1', conf: 'sure', ok: true, at: minutesAfter(DAY0, 44 * DAY), data: { kc: 'KC-1.a' } }),
      event({ kind: 'item', ref: 'drawer:D-03/i1', ok: true, at: minutesAfter(DAY0, 45 * DAY), data: { kc: 'KC-1.a' } }),
      fresh('KC-1.never', 50, true),
    ]
    const v = deriveVrk30({ events: e, content, now: NOW })
    assert.equal(v.count, 0)
    assert.equal(v.qualifying, 0)
    assert.equal(v.accuracy, null)
  })

  test('a probe, a Prove-it prediction and a generated audit variant are fresh too', () => {
    const e = [
      learn('KC-1.a'),
      learn('KC-1.b'),
      learn('KC-1.c'),
      event({ kind: 'probe', ref: 'probe:S1/A/1/1', seed: 5, ok: true, at: minutesAfter(DAY0, 40 * DAY), data: { kc: 'KC-1.a' } }),
      event({ kind: 'prove-it', ref: 'prove-it:LAB-1/m1', seed: 6, ok: true, at: minutesAfter(DAY0, 40 * DAY), data: { kc: 'KC-1.b' } }),
      event({ kind: 'audit', ref: 'audit:AUD-1.1/v1', seed: 7, ok: true, at: minutesAfter(DAY0, 40 * DAY), data: { kc: 'KC-1.c' } }),
    ]
    assert.equal(deriveVrk30({ events: e, content, now: NOW }).count, 3)
  })

  test('the accuracy over all qualifying events: 41 of 52 shows as 0.79 with Wilson 0.66-0.88 (ASSESSMENT.md section 3.6)', () => {
    const e: LedgerEvent[] = []
    // 26 KCs, two qualifying events each, 41 of the 52 right
    const oks = [...Array.from({ length: 41 }, () => true), ...Array.from({ length: 11 }, () => false)]
    for (let i = 0; i < 26; i++) {
      e.push(learn(`KC-1.k${i}`))
      e.push(fresh(`KC-1.k${i}`, 35, oks[2 * i]))
      e.push(fresh(`KC-1.k${i}`, 70, oks[2 * i + 1]))
    }
    const v = deriveVrk30({ events: e, content, now: NOW })
    assert.equal(v.qualifying, 52)
    assert.equal(v.accuracy!.hits, 41)
    assert.equal(v.accuracy!.n, 52)
    assert.deepEqual([v.accuracy!.rate, v.accuracy!.low, v.accuracy!.high].map((x) => x.toFixed(2)), ['0.79', '0.66', '0.88'])
    // the count is by latest event: KCs whose second event is right
    assert.equal(v.count, oks.filter((_, i) => i % 2 === 1 && oks[i]).length)
  })

  test('events at or after `now` are not read, and a KC learned after the event it would qualify is not learned yet', () => {
    const e = [learn('KC-1.a'), fresh('KC-1.a', 40, true)]
    assert.equal(deriveVrk30({ events: e, content, now: minutesAfter(DAY0, 40 * DAY) }).count, 0)
    assert.equal(deriveVrk30({ events: e, content, now: minutesAfter(DAY0, 40 * DAY + 1) }).count, 1)
    assert.equal(deriveVrk30({ events: [learn('KC-1.a', minutesAfter(DAY0, 20 * DAY)), fresh('KC-1.a', 40, true)], content, now: NOW }).count, 0)
  })

  test('settled KCs are marked from the caller\'s set and never decided here', () => {
    const e = [learn('KC-1.a'), learn('KC-1.b'), fresh('KC-1.a', 40, true), fresh('KC-1.b', 40, true)]
    const v = deriveVrk30({ events: e, content, now: NOW, settled: new Set(['KC-1.b', 'KC-1.zzz']) })
    assert.deepEqual(v.kcs.map((k) => [k.kc, k.settled]), [['KC-1.a', false], ['KC-1.b', true]])
  })

  test('a test-out confirmation is first learning, so 30 days run from it', () => {
    const e = [event({ kind: 'item', ref: 'confirm:KC-1.a', seed: 3, ok: true, at: minutesAfter(DAY0, 10 * DAY) }), fresh('KC-1.a', 39, true), fresh('KC-1.a', 41, true)]
    const v = deriveVrk30({ events: e, content, now: NOW })
    assert.equal(v.qualifying, 1)
    assert.equal(v.count, 1)
  })
})

describe('the rate per active study-month (spine section 2.3; ASSESSMENT.md section 3.6)', () => {
  const work = (day: string, f: Partial<LedgerEvent> = {}): LedgerEvent => event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1, ok: true, at: `${day}T09:00:00Z`, ...f })

  test('a month is active with graded own work on at least 4 distinct local days, and three days are not enough', () => {
    const days = (m: string, n: number) => Array.from({ length: n }, (_, i) => work(`${m}-${String(i + 1).padStart(2, '0')}`))
    assert.deepEqual(activeMonthsOf([...days('2026-11', 4), ...days('2026-12', 3), ...days('2027-01', 6)]), ['2026-11', '2027-01'])
    // many events on one day are one day
    assert.deepEqual(activeMonthsOf(Array.from({ length: 30 }, () => work('2026-11-05'))), [])
  })

  test('only graded own work counts: not help, an agent, an ungraded event or an uncredited one', () => {
    const days = ['01', '02', '03', '04']
    assert.deepEqual(activeMonthsOf(days.map((d) => work(`2026-11-${d}`, { provenance: 'assisted' }))), [])
    assert.deepEqual(activeMonthsOf(days.map((d) => work(`2026-11-${d}`, { provenance: 'agent' }))), [])
    assert.deepEqual(activeMonthsOf(days.map((d) => event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1, at: `2026-11-${d}T09:00:00Z` }))), [])
    assert.deepEqual(activeMonthsOf(days.map((d) => event({ kind: 'note', ref: 'note:1', at: `2026-11-${d}T09:00:00Z` }))), [])
    assert.deepEqual(activeMonthsOf(days.map((d) => work(`2026-11-${d}`, { exposure: 'seen' }))), ['2026-11'])
    assert.deepEqual(activeMonthsOf(days.map((d) => event({ kind: 'call', ref: `call:S1.L1/c${d}`, conf: 'think', ok: true, at: `2026-11-${d}T09:00:00Z` }))), ['2026-11'])
  })

  test('a month is the local date the event froze, so travel never moves it', () => {
    // 23:30 on 30 November in UTC-5 is 04:30 on 1 December UTC: it stays a November day
    const late = work('2026-11-30', { at: '2026-11-30T23:30:00-05:00', tz: -300 })
    assert.equal(late.day, '2026-11-30')
    assert.deepEqual(activeMonthsOf([late, work('2026-11-01'), work('2026-11-02'), work('2026-11-03')]), ['2026-11'])
  })

  test('the rate is the count over the active months, null while none is active (a declared break dilutes nothing)', () => {
    const e: LedgerEvent[] = [learn('KC-1.a'), learn('KC-1.b'), fresh('KC-1.a', 40, true), fresh('KC-1.b', 41, true)]
    assert.equal(deriveVrk30({ events: e, content, now: NOW }).perMonth, null)
    const days = Array.from({ length: 4 }, (_, i) => work(`2026-11-${String(i + 5).padStart(2, '0')}`))
    const march = Array.from({ length: 5 }, (_, i) => work(`2027-03-${String(i + 1).padStart(2, '0')}`))
    const v = deriveVrk30({ events: [...e, ...days, ...march], content, now: NOW })
    assert.deepEqual(v.activeMonths, ['2026-11', '2027-03'])
    assert.equal(v.count, 2)
    assert.equal(v.perMonth, 1)
    const idle = deriveVrk30({ events: [...e, ...days], content, now: NOW })
    assert.equal(idle.perMonth, 2)
  })
})

describe('VRK30 is a function of the set of events', () => {
  test('order and duplicates change nothing', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const e: LedgerEvent[] = []
      for (let k = 0; k < 8; k++) {
        e.push(learn(`KC-1.k${k}`, minutesAfter(DAY0, k * 60)))
        for (let j = 0; j < 4; j++) e.push(fresh(`KC-1.k${k}`, 20 + Math.floor(r() * 80), r() < 0.6, { provenance: pick(r, ['own', 'own', 'assisted']) }))
      }
      const base = deriveVrk30({ events: e, content, now: NOW })
      assert.deepEqual(deriveVrk30({ events: shuffled(r, e), content, now: NOW }), base, `seed ${seed}`)
      assert.deepEqual(deriveVrk30({ events: [...e, ...shuffled(r, e)], content, now: NOW }), base, `seed ${seed}`)
    }
  })
})
