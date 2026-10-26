import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  ACTIVE_MONTH_DAYS,
  BANDS,
  CONFIDENCES,
  GUESS_CEILING,
  IMPUTED_SURE,
  IMPUTED_THINK,
  MIN_CALLS_PER_BAND,
  MIRROR_Z,
  VRK30_DAYS,
  binOf,
  callDataOf,
  chanceLine,
  chanceOf,
  imputedConfidence,
  isCallShape,
  isConfidence,
  oneIn,
  payoffOf,
  readCallData,
  signed,
} from '../src/mirror/index.ts'
import type { CallShape } from '../src/mirror/index.ts'

describe('the three taps (spine section 8.5; ASSESSMENT.md section 5.2)', () => {
  test('guess is below 67%, think so 67 to 80%, sure above 80%', () => {
    assert.deepEqual(CONFIDENCES, ['guess', 'think', 'sure'])
    assert.deepEqual(
      CONFIDENCES.map((c) => [BANDS[c].tap, BANDS[c].printed]),
      [
        ['guess', 'below 67%'],
        ['think so', '67–80%'],
        ['sure', 'above 80%'],
      ],
    )
    assert.deepEqual(
      CONFIDENCES.map((c) => [BANDS[c].lo, BANDS[c].hi]),
      [
        [0, 0.67],
        [0.67, 0.8],
        [0.8, 1],
      ],
    )
  })

  test('the payoffs are +1/0, +2/-2 and +3/-6, and an honest report maximizes the expected payoff', () => {
    assert.deepEqual(
      CONFIDENCES.map((c) => BANDS[c].payoff),
      [
        { right: 1, wrong: 0 },
        { right: 2, wrong: -2 },
        { right: 3, wrong: -6 },
      ],
    )
    // ASSESSMENT.md section 5.2: with probability p of being right, the expected payoffs are p, 4p - 2 and 9p - 6, and each tap is
    // best exactly in its band: guess below 2/3, think so between 2/3 and 4/5, sure above 4/5.
    const expected = (c: (typeof CONFIDENCES)[number], p: number): number => p * BANDS[c].payoff.right + (1 - p) * BANDS[c].payoff.wrong
    for (let i = 1; i < 100; i++) {
      const p = i / 100
      const best = [...CONFIDENCES].sort((a, b) => expected(b, p) - expected(a, p))[0]
      const want = p < 2 / 3 ? 'guess' : p < 0.8 ? 'think' : 'sure'
      if (Math.abs(p - 2 / 3) > 1e-9 && Math.abs(p - 0.8) > 1e-9) assert.equal(best, want, `p = ${p}`)
    }
  })

  test('payoffOf and signed write the earned payoff with its sign', () => {
    assert.equal(payoffOf('guess', true), 1)
    assert.equal(payoffOf('guess', false), 0)
    assert.equal(payoffOf('think', false), -2)
    assert.equal(payoffOf('sure', true), 3)
    assert.equal(payoffOf('sure', false), -6)
    assert.deepEqual([signed(3), signed(0), signed(-6)], ['+3', '0', '−6'])
  })

  test('isConfidence accepts the three categories and nothing else', () => {
    for (const c of CONFIDENCES) assert.equal(isConfidence(c), true)
    for (const x of ['think so', 'Sure', '', null, undefined, 3, {}]) assert.equal(isConfidence(x), false)
  })
})

describe('the constants of the Mirror, each in one place', () => {
  test('the minimum calls per band is 20 (spine section 8.5), z is 1.96 (ASSESSMENT.md section 6.4)', () => {
    assert.equal(MIN_CALLS_PER_BAND, 20)
    assert.equal(MIRROR_Z, 1.96)
  })
  test('an active study-month needs 4 distinct local days, and VRK30 counts from 30 days (spine section 2.3)', () => {
    assert.equal(ACTIVE_MONTH_DAYS, 4)
    assert.equal(VRK30_DAYS, 30)
  })
  test('stated confidence is imputed from the band: midway between chance and 2/3, 0.73, 0.90 (ASSESSMENT.md section 5.6)', () => {
    assert.equal(IMPUTED_THINK, 0.73)
    assert.equal(IMPUTED_SURE, 0.9)
    assert.equal(GUESS_CEILING, 2 / 3)
    // "0.50 for a three-way verdict, 0.33 for a constructed answer"
    assert.ok(Math.abs(imputedConfidence('guess', chanceOf({ form: 'choice', options: 3 })) - 0.5) < 1e-12)
    assert.equal(imputedConfidence('guess', chanceOf({ form: 'constructed' })).toFixed(2), '0.33')
    assert.equal(imputedConfidence('think', 0.5), 0.73)
    assert.equal(imputedConfidence('sure', 0.5), 0.9)
    // the tap's own imputation never depends on chance except for guess
    for (const chance of [0, 1 / 12, 1 / 32, 0.5]) {
      assert.equal(imputedConfidence('think', chance), 0.73)
      assert.equal(imputedConfidence('sure', chance), 0.9)
    }
    // a two-way item: midway between 1/2 and 2/3
    assert.ok(Math.abs(imputedConfidence('guess', 0.5) - (0.5 + 2 / 3) / 2) < 1e-12)
  })
})

describe('the shape of a called item: its chance and its bin (spine section 8.5)', () => {
  test('k options print "1 in k"; a set of m statements prints 1 in 2^m; a constructed answer has no guessing floor', () => {
    assert.equal(oneIn({ form: 'choice', options: 3 }), 3)
    assert.equal(oneIn({ form: 'set', statements: 5 }), 32)
    assert.equal(oneIn({ form: 'set', statements: 4 }), 16)
    assert.equal(oneIn({ form: 'set', statements: 6 }), 64)
    assert.equal(oneIn({ form: 'constructed' }), null)
    assert.equal(chanceLine({ form: 'choice', options: 3 }), '3 options · chance 1 in 3')
    assert.equal(chanceLine({ form: 'choice', options: 4 }), '4 options · chance 1 in 4')
    assert.equal(chanceLine({ form: 'set', statements: 5 }), 'all 5 by guessing: 1 in 32')
    assert.equal(chanceLine({ form: 'constructed' }), 'no guessing floor')
    assert.equal(chanceOf({ form: 'choice', options: 3 }), 1 / 3)
    assert.equal(chanceOf({ form: 'set', statements: 5 }), 1 / 32)
    assert.equal(chanceOf({ form: 'constructed' }), 0)
  })

  test('only a set sits in its own bin', () => {
    assert.equal(binOf({ form: 'set', statements: 5 }), 'set')
    assert.equal(binOf({ form: 'choice', options: 3 }), 'answer')
    assert.equal(binOf({ form: 'constructed' }), 'answer')
  })

  test('isCallShape holds the counts to what a cell or a set can carry', () => {
    const good: CallShape[] = [{ form: 'choice', options: 2 }, { form: 'choice', options: 12 }, { form: 'set', statements: 2 }, { form: 'set', statements: 20 }, { form: 'constructed' }]
    for (const s of good) assert.equal(isCallShape(s), true, JSON.stringify(s))
    const bad = [
      { form: 'choice', options: 1 },
      { form: 'choice', options: 13 },
      { form: 'choice', options: 2.5 },
      { form: 'choice' },
      { form: 'set', statements: 1 },
      { form: 'set', statements: 21 },
      { form: 'other' },
      null,
      'choice',
    ]
    for (const s of bad) assert.equal(isCallShape(s), false, JSON.stringify(s))
  })

  test('the shape and KC a call carries in data.call read back, and a malformed record reads as nothing', () => {
    for (const s of [{ form: 'choice', options: 3 }, { form: 'set', statements: 5 }, { form: 'constructed' }] as CallShape[]) {
      assert.deepEqual(readCallData({ data: callDataOf(s, 'KC-1.three-answers') }), { shape: s, kc: 'KC-1.three-answers' })
      assert.deepEqual(readCallData({ data: callDataOf(s) }), { shape: s })
    }
    assert.equal(readCallData({}), undefined)
    assert.equal(readCallData({ data: {} }), undefined)
    assert.equal(readCallData({ data: { call: 'x' } }), undefined)
    assert.equal(readCallData({ data: { call: { form: 'choice', options: 99 } } }), undefined)
    assert.equal(readCallData({ data: { call: { form: 'set', statements: 'five' } } }), undefined)
  })
})
