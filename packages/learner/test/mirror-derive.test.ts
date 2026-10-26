import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mergeLogs } from '@statespace/ledger'
import type { LedgerEvent } from '@statespace/ledger'
import { BANDS, MIN_CALLS_PER_BAND, deriveMirror, imputedConfidence } from '../src/mirror/index.ts'
import type { BandView, BinView, Confidence, MirrorContent, MirrorView, Rate } from '../src/mirror/index.ts'
import { outsideBand } from '../src/mirror/mirror.ts'
import { DAY0, KC, SEEDS, SET_OF_FIVE, THREE_WAY, call, content, event, exitItem, minutesAfter, pick, rng, shuffled } from './mirror-helpers.ts'

const NOW = '2026-12-31T00:00:00Z'
const LEARNED = minutesAfter(DAY0, 30)

/** n calls in one band with `hits` of them matching, all first calls after first learning of the KC. */
function inBand(conf: Confidence, n: number, hits: number, extra: Parameters<typeof call>[0] = {}): LedgerEvent[] {
  return Array.from({ length: n }, (_, i) => call({ conf, ok: i < hits, ...extra }))
}

const mirror = (events: LedgerEvent[], c: MirrorContent = content, now = NOW): MirrorView => deriveMirror({ events: [exitItem(KC, LEARNED), ...events], content: c, now })
const answer = (v: MirrorView): BinView => v.own.find((b) => b.bin === 'answer') as BinView
const setBin = (v: MirrorView): BinView => v.own.find((b) => b.bin === 'set') as BinView
const band = (b: BinView, conf: Confidence): BandView => b.bands.find((x) => x.band.conf === conf) as BandView
const two = (x: number): string => x.toFixed(2)

describe('the diagnosis rule: at least 20 calls and an interval wholly outside the printed band (ASSESSMENT.md section 5.6)', () => {
  test('sure, 18 of 30 right: 0.42-0.75, below the band, so a sentence', () => {
    const b = band(answer(mirror(inBand('sure', 30, 18))), 'sure')
    assert.equal(b.calls, 30)
    assert.equal(b.enough, true)
    assert.deepEqual([two(b.rate!.low), two(b.rate!.high)], ['0.42', '0.75'])
    assert.equal(b.diagnosis, 'below')
  })

  test('sure, 21 of 30 right: 0.52-0.83, the interval reaches the band, so nothing', () => {
    const b = band(answer(mirror(inBand('sure', 30, 21))), 'sure')
    assert.deepEqual([two(b.rate!.low), two(b.rate!.high)], ['0.52', '0.83'])
    assert.equal(b.enough, true)
    assert.equal(b.diagnosis, null)
  })

  test('sure, 18 of 20 right: 0.70-0.97, the interval overlaps the band, so nothing', () => {
    const b = band(answer(mirror(inBand('sure', 20, 18))), 'sure')
    assert.deepEqual([two(b.rate!.low), two(b.rate!.high)], ['0.70', '0.97'])
    assert.equal(b.diagnosis, null)
  })

  test('think so, 7 of 12 right: 0.32-0.81, fewer than 20 calls, so nothing (v1 said "at 80% right only 58%" from about this many)', () => {
    const b = band(answer(mirror(inBand('think', 12, 7))), 'think')
    assert.deepEqual([two(b.rate!.low), two(b.rate!.high)], ['0.32', '0.81'])
    assert.equal(b.enough, false)
    assert.equal(b.diagnosis, null)
  })

  test('19 calls are too few however far outside the band they fall; 20 are enough', () => {
    const none = band(answer(mirror(inBand('sure', 19, 0))), 'sure')
    assert.equal(none.enough, false)
    assert.equal(none.diagnosis, null)
    const some = band(answer(mirror(inBand('sure', 20, 0))), 'sure')
    assert.equal(some.enough, true)
    assert.equal(some.diagnosis, 'below')
    assert.equal(MIN_CALLS_PER_BAND, 20)
  })

  test('a band whose interval lies wholly above its printed band is also diagnosed (guess hits more often than 67%)', () => {
    const b = band(answer(mirror(inBand('guess', 40, 40))), 'guess')
    assert.ok(b.rate!.low > 0.67)
    assert.equal(b.diagnosis, 'above')
    // think so, all right: the interval's lower end is above 80%
    const t = band(answer(mirror(inBand('think', 60, 60))), 'think')
    assert.ok(t.rate!.low > 0.8)
    assert.equal(t.diagnosis, 'above')
  })

  test('think so can be diagnosed below its band too, and an interval inside the band says nothing', () => {
    const low = band(answer(mirror(inBand('think', 30, 12))), 'think')
    assert.ok(low.rate!.high < 0.67)
    assert.equal(low.diagnosis, 'below')
    const inside = band(answer(mirror(inBand('think', 200, 148))), 'think')
    assert.ok(inside.rate!.low >= 0.67 && inside.rate!.high <= 0.8, `${inside.rate!.low} ${inside.rate!.high}`)
    assert.equal(inside.diagnosis, null)
  })

  test('guess cannot be below its band, and sure cannot be above it', () => {
    assert.equal(band(answer(mirror(inBand('guess', 30, 0))), 'guess').diagnosis, null)
    assert.equal(band(answer(mirror(inBand('sure', 30, 30))), 'sure').diagnosis, null)
  })

  test('a band carries the mean chance of its calls: where a blind guess would sit, which the screen draws the guess band from', () => {
    const v = answer(mirror([...inBand('guess', 6, 2, { shape: { form: 'choice', options: 2 } }), ...inBand('guess', 2, 0, { shape: { form: 'choice', options: 4 } }), ...inBand('sure', 3, 3, { shape: { form: 'constructed' } }), ...inBand('think', 2, 1)]))
    assert.ok(Math.abs(band(v, 'guess').chance! - (6 * 0.5 + 2 * 0.25) / 8) < 1e-12)
    assert.equal(band(v, 'sure').chance, 0)
    assert.ok(Math.abs(band(v, 'think').chance! - 1 / 3) < 1e-12)
    assert.equal(band(answer(mirror([])), 'guess').chance, null)
    const s = setBin(mirror(inBand('guess', 3, 0, { shape: SET_OF_FIVE })))
    assert.ok(Math.abs(band(s, 'guess').chance! - 1 / 32) < 1e-12)
  })

  test('every band has a row, empty or not, with no rate when it holds no call', () => {
    const v = answer(mirror([]))
    assert.deepEqual(v.bands.map((b) => b.band.conf), ['guess', 'think', 'sure'])
    for (const b of v.bands) {
      assert.equal(b.calls, 0)
      assert.equal(b.rate, null)
      assert.equal(b.chance, null)
      assert.equal(b.diagnosis, null)
    }
    assert.equal(v.accuracy, null)
    assert.equal(v.meanConfidence, null)
    assert.equal(v.bias, null)
  })
})

describe('an interval against its band: touching the edge is reaching the band (a decision [D]: nothing is said)', () => {
  const interval = (low: number, high: number): Rate => ({ hits: 0, n: 0, rate: (low + high) / 2, low, high })

  test('wholly below, wholly above, and reaching, at the three printed bands', () => {
    assert.equal(outsideBand(interval(0.5, 0.79), BANDS.sure), 'below')
    assert.equal(outsideBand(interval(0.5, 0.8), BANDS.sure), null, 'ending exactly at the band reaches it')
    assert.equal(outsideBand(interval(0.5, 0.9), BANDS.sure), null)
    assert.equal(outsideBand(interval(0.9, 1), BANDS.sure), null)
    assert.equal(outsideBand(interval(0.81, 0.9), BANDS.think), 'above')
    assert.equal(outsideBand(interval(0.8, 0.9), BANDS.think), null, 'starting exactly at the band reaches it')
    assert.equal(outsideBand(interval(0.3, 0.66), BANDS.think), 'below')
    assert.equal(outsideBand(interval(0.3, 0.67), BANDS.think), null, 'ending exactly at 67% reaches the band')
    assert.equal(outsideBand(interval(0.68, 0.7), BANDS.guess), 'above')
    assert.equal(outsideBand(interval(0.67, 0.8), BANDS.guess), null, 'starting exactly at 67% reaches the band')
    assert.equal(outsideBand(interval(0, 0.1), BANDS.guess), null, 'a guess cannot lie below its band')
  })
})

describe('resolution: the hit rate at sure minus the hit rate at guess, shown apart and only when both bands hold enough calls', () => {
  test('both bands at the minimum: 0.80 at sure minus 0.40 at guess', () => {
    const b = answer(mirror([...inBand('guess', 20, 8), ...inBand('sure', 25, 20)]))
    assert.ok(Math.abs(b.resolution! - 0.4) < 1e-12)
    assert.ok(Math.abs(answer(mirror([...inBand('guess', 20, 20), ...inBand('sure', 20, 10)])).resolution! - -0.5) < 1e-12, 'it can be negative')
  })

  test('a band under the minimum on either side shows none, and the band between takes no part', () => {
    assert.equal(answer(mirror([...inBand('guess', 19, 8), ...inBand('sure', 25, 20)])).resolution, null)
    assert.equal(answer(mirror([...inBand('guess', 20, 8), ...inBand('sure', 19, 15)])).resolution, null)
    assert.equal(answer(mirror([...inBand('guess', 20, 8), ...inBand('think', 40, 30)])).resolution, null)
    assert.equal(answer(mirror([...inBand('guess', 20, 8), ...inBand('think', 40, 30), ...inBand('sure', 20, 18)])).resolution !== null, true)
  })
})

describe('bias: the imputed mean stated probability minus accuracy, with accuracy\'s Wilson interval', () => {
  test('20 sure calls with 15 right: bias 0.90 - 0.75, its interval 0.90 minus accuracy\'s interval', () => {
    const b = answer(mirror(inBand('sure', 20, 15)))
    assert.equal(b.calls, 20)
    assert.equal(b.hits, 15)
    assert.equal(b.meanConfidence, 0.9)
    assert.ok(Math.abs(b.accuracy!.rate - 0.75) < 1e-12)
    assert.ok(Math.abs(b.bias!.value - 0.15) < 1e-12)
    assert.ok(Math.abs(b.bias!.low - (0.9 - b.accuracy!.high)) < 1e-12)
    assert.ok(Math.abs(b.bias!.high - (0.9 - b.accuracy!.low)) < 1e-12)
    assert.ok(b.bias!.low < b.bias!.value && b.bias!.value < b.bias!.high)
  })

  test('the mean is imputed per tap and per item: guess is midway between the item\'s chance and 2/3', () => {
    const events = [...inBand('guess', 8, 3), ...inBand('think', 6, 4), ...inBand('sure', 6, 5)]
    const b = answer(mirror(events))
    const want = (8 * imputedConfidence('guess', 1 / 3) + 6 * 0.73 + 6 * 0.9) / 20
    assert.ok(Math.abs(b.meanConfidence! - want) < 1e-12)
    assert.ok(Math.abs(b.meanConfidence! - (8 * 0.5 + 6 * 0.73 + 6 * 0.9) / 20) < 1e-12)
    assert.ok(Math.abs(b.bias!.value - (want - 12 / 20)) < 1e-12)
  })

  test('guess on a two-way item and on a constructed answer use that item\'s own chance', () => {
    const two1 = inBand('guess', 10, 5, { shape: { form: 'choice', options: 2 } })
    const built = inBand('guess', 10, 4, { shape: { form: 'constructed' } })
    const b = answer(mirror([...two1, ...built]))
    assert.ok(Math.abs(b.meanConfidence! - (10 * ((0.5 + 2 / 3) / 2) + 10 * (1 / 3)) / 20) < 1e-12)
  })

  test('bias is shown from 20 calls and not before', () => {
    assert.equal(answer(mirror(inBand('sure', 19, 10))).bias, null)
    assert.notEqual(answer(mirror(inBand('sure', 20, 10))).bias, null)
  })

  test('twenty calls spread over the bands show the bias although no band holds twenty (the two thresholds are separate)', () => {
    const v = answer(mirror([...inBand('guess', 7, 2), ...inBand('think', 7, 4), ...inBand('sure', 6, 4)]))
    assert.notEqual(v.bias, null)
    for (const b of v.bands) assert.equal(b.enough, false)
  })
})

describe('a multiple true/false set sits in its own bin, with its own chance (spine section 8.5)', () => {
  test('sets and single answers are never pooled', () => {
    const sets = inBand('sure', 25, 10, { shape: SET_OF_FIVE })
    const singles = inBand('sure', 22, 21)
    const v = mirror([...sets, ...singles])
    assert.equal(setBin(v).calls, 25)
    assert.equal(answer(v).calls, 22)
    assert.equal(setBin(v).hits, 10)
    assert.equal(answer(v).hits, 21)
    assert.equal(band(setBin(v), 'sure').diagnosis, 'below')
    assert.equal(band(answer(v), 'sure').diagnosis, null)
  })

  test('a set\'s guess is imputed from 1 in 32: midway between 1/32 and 2/3', () => {
    const b = setBin(mirror(inBand('guess', 20, 1, { shape: SET_OF_FIVE })))
    assert.ok(Math.abs(b.meanConfidence! - (1 / 32 + 2 / 3) / 2) < 1e-12)
  })
})

describe('only post-instruction, unassisted calls count (ASSESSMENT.md sections 2.5, 3.2 and 5.6)', () => {
  test('a call before first learning is left out, and one at or after it counts', () => {
    const before = call({ at: minutesAfter(DAY0, 10) })
    const at = call({ at: LEARNED })
    const after = call({ at: minutesAfter(DAY0, 31) })
    const v = mirror([before, at, after])
    assert.equal(answer(v).calls, 2)
    assert.equal(v.excluded['before-instruction'], 1)
    assert.equal(v.counted, 2)
  })

  test('a call is before instruction while its KC has no first learning at all', () => {
    const v = deriveMirror({ events: [call(), call()], content, now: NOW })
    assert.equal(v.counted, 0)
    assert.equal(v.excluded['before-instruction'], 2)
  })

  test('first learning is the first attempt at the exit item; a later attempt does not move it', () => {
    const early = exitItem(KC, minutesAfter(DAY0, 10))
    const late = exitItem(KC, minutesAfter(DAY0, 500))
    const c = call({ at: minutesAfter(DAY0, 20) })
    assert.equal(deriveMirror({ events: [early, late, c], content, now: NOW }).counted, 1)
    assert.equal(deriveMirror({ events: [late, c], content, now: NOW }).counted, 0)
  })

  test('a KC credited by a test-out is learned at its confirmation (ASSESSMENT.md section 3.2)', () => {
    const confirm = event({ kind: 'item', ref: `confirm:${KC}`, ok: true, seed: 5, at: LEARNED })
    const c = call({ at: minutesAfter(DAY0, 90) })
    const earlier = call({ at: minutesAfter(DAY0, 5) })
    const v = deriveMirror({ events: [confirm, c, earlier], content, now: NOW })
    assert.equal(v.counted, 1)
    assert.equal(v.excluded['before-instruction'], 1)
  })

  test('a first-contact call (Boot\'s) never counts, even after the KC is learned (spine section 12 item 33)', () => {
    const boot = call({ ref: 'call:S1.L0/c1', at: minutesAfter(DAY0, 100) })
    const c: MirrorContent = { ...content, isFirstContact: (e) => e.ref === 'call:S1.L0/c1' }
    const v = deriveMirror({ events: [exitItem(KC, LEARNED), boot, call()], content: c, now: NOW })
    assert.equal(v.counted, 1)
    assert.equal(v.excluded['before-instruction'], 1)
  })

  test('assisted calls are tallied apart and never pooled with the learner\'s own', () => {
    const v = mirror([...inBand('sure', 22, 12), ...inBand('sure', 22, 22, { provenance: 'assisted' })])
    assert.equal(answer(v).calls, 22)
    assert.equal(answer(v).hits, 12)
    const apart = v.assisted.find((b) => b.bin === 'answer') as BinView
    assert.equal(apart.calls, 22)
    assert.equal(apart.hits, 22)
    assert.equal(v.counted, 44)
    assert.equal(v.ownCalls, 22)
    assert.equal(v.assistedCalls, 22)
  })

  test('an agent\'s call, a seen one and a call without a KC, a shape or first learning are left out, each by its own reason', () => {
    const noConf = event({ kind: 'call', ref: 'call:S1.L2/c901', ok: true, at: minutesAfter(DAY0, 98), data: { call: { form: 'choice', options: 3, kc: KC } } })
    const v = mirror([
      call({ provenance: 'agent' }),
      call({ exposure: 'seen' }),
      call({ kc: null, noData: true }),
      call({ noData: true, data: { kc: KC, call: { form: 'choice', options: 99 } } }),
      call({ kc: 'KC-1.never-learned' }),
      noConf,
      call(),
    ])
    assert.equal(v.excluded.agent, 1)
    assert.equal(v.excluded.seen, 1)
    assert.equal(v.excluded['no-kc'], 1)
    assert.equal(v.excluded['no-shape'], 1)
    assert.equal(v.excluded['before-instruction'], 1)
    // a call with no confidence tapped is not a call at all: it is read by nothing and counted nowhere
    assert.equal(Object.values(v.excluded).reduce((a, b) => a + b, 0), 5)
    assert.equal(v.counted, 1)
  })

  test('an ungraded call (no ok) is no miss and no hit: it is left out', () => {
    const e = event({ kind: 'call', ref: 'call:S1.L2/c900', conf: 'sure', at: minutesAfter(DAY0, 99), data: { call: { form: 'choice', options: 3, kc: KC } } })
    const v = mirror([e])
    assert.equal(v.counted, 0)
    assert.equal(v.excluded.ungraded, 1)
  })

  test('a graded item the learner called counts like a call, when it says its shape and KC (a "called item")', () => {
    const item = call({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 77 })
    const v = mirror([item])
    assert.equal(answer(v).calls, 1)
  })

  test('events at or after `now` are not read', () => {
    const c = call({ at: '2026-11-10T10:00:00Z' })
    assert.equal(mirror([c], content, '2026-11-10T10:00:00Z').counted, 0)
    assert.equal(mirror([c], content, '2026-11-10T10:00:01Z').counted, 1)
  })

  test('a call is read by its own instant, whatever offset it carries', () => {
    // 09:00 at +02:00 is 07:00Z: before first learning at 08:30Z; 11:00 at -03:00 is 14:00Z: after it
    const before = call({ at: '2026-11-02T09:00:00+02:00', tz: 120 })
    const after = call({ at: '2026-11-02T11:00:00-03:00', tz: -180 })
    const v = mirror([before, after])
    assert.equal(v.counted, 1)
    assert.equal(v.excluded['before-instruction'], 1)
  })
})

describe('the Mirror is a function of the set of events', () => {
  const build = (r: () => number): LedgerEvent[] => {
    const out: LedgerEvent[] = [exitItem(KC, LEARNED)]
    for (let i = 0; i < 60; i++) {
      out.push(
        call({
          conf: pick(r, ['guess', 'think', 'sure'] as const),
          ok: r() < 0.6,
          shape: pick(r, [THREE_WAY, SET_OF_FIVE, { form: 'choice', options: 4 }, { form: 'constructed' }] as const),
          provenance: pick(r, ['own', 'own', 'own', 'assisted', 'agent'] as const),
          exposure: pick(r, ['unseen', 'unseen', 'unseen', 'seen'] as const),
        }),
      )
    }
    return out
  }

  test('order, duplicates and merges give the same Mirror (a double import, a merge and a stale tab)', () => {
    for (const seed of SEEDS) {
      const r = rng(seed)
      const events = build(r)
      const base = deriveMirror({ events, content, now: NOW })
      assert.deepEqual(deriveMirror({ events: shuffled(r, events), content, now: NOW }), base, `seed ${seed}: shuffled`)
      assert.deepEqual(deriveMirror({ events: [...events, ...shuffled(r, events)], content, now: NOW }), base, `seed ${seed}: twice`)
      const half = Math.floor(events.length / 2)
      const a = shuffled(r, events).slice(0, half)
      const b = shuffled(r, events).slice(half - 5)
      const merged = [...mergeLogs({ events: a }, { events: b }).events.values()]
      const reversed = [...mergeLogs({ events: b }, { events: a }).events.values()]
      assert.deepEqual(deriveMirror({ events: merged, content, now: NOW }), deriveMirror({ events: reversed, content, now: NOW }), `seed ${seed}: merge order`)
    }
  })
})
