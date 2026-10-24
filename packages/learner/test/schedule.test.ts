import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { DEFAULT_RETENTION, MAX_INTERVAL, W, intervalDays, nextMemory, retrievability } from '../src/schedule/index.ts'
import type { MemoryState, Rating } from '../src/schedule/index.ts'

// A port of the assertions of the vendored vendor/kernelspace/tests/learner/fsrs.test.ts to Node's test runner
// (the original runs under bun). The vectors are the vendored ones: what ts-fsrs 5.4.2 produced, recorded once.
const TOL = 1e-8

interface Vectors {
  generator: { tool: string; version: string }
  w: number[]
  curve: { t: number; s: number; r: number }[]
  intervals: { s: number; retention: number; days: number }[]
  sequences: { retention: number; steps: [number, Rating, number | null, number, number, number][] }[]
}

const vectors = JSON.parse(
  readFileSync(new URL('../../../vendor/kernelspace/tests/fixtures/fsrs/reference-vectors.json', import.meta.url), 'utf8'),
) as Vectors

const near = (actual: number, expected: number) => Math.abs(actual - expected) <= TOL

describe('the recorded reference', () => {
  test('is ts-fsrs 5.4.2 with 2000 replays of 1 to 12 steps', () => {
    assert.equal(vectors.generator.tool, 'ts-fsrs')
    assert.equal(vectors.generator.version, '5.4.2')
    assert.equal(vectors.sequences.length, 2000)
    for (const { steps } of vectors.sequences) assert.ok(steps.length >= 1 && steps.length <= 12)
  })

  test('the weights are the 21 FSRS-6 defaults of the reference', () => {
    assert.equal(W.length, 21)
    assert.deepEqual([...W], vectors.w)
  })

  test('every replayed step matches {R, S, D, interval} to 1e-8', () => {
    let worst = 0
    let steps = 0
    for (const [i, { retention, steps: seq }] of vectors.sequences.entries()) {
      let memory: MemoryState | null = null
      for (const [k, [t, g, r, s, d, interval]] of seq.entries()) {
        if (r !== null) {
          const got = retrievability(t, memory!.stability)
          worst = Math.max(worst, Math.abs(got - r))
          assert.ok(near(got, r), `sequence ${i} step ${k}: R ${got} vs ${r}`)
        }
        memory = nextMemory(memory, t, g)
        worst = Math.max(worst, Math.abs(memory.stability - s), Math.abs(memory.difficulty - d))
        assert.ok(near(memory.stability, s), `sequence ${i} step ${k}: S ${memory.stability} vs ${s}`)
        assert.ok(near(memory.difficulty, d), `sequence ${i} step ${k}: D ${memory.difficulty} vs ${d}`)
        assert.equal(intervalDays(memory.stability, retention), interval, `sequence ${i} step ${k}: interval`)
        steps++
      }
    }
    assert.ok(worst <= TOL)
    assert.ok(steps > 2000)
  })

  test('R(t, S) matches over the grid, including t = 0 and the S ends', () => {
    for (const { t, s, r } of vectors.curve) assert.ok(near(retrievability(t, s), r), `R(${t}, ${s})`)
  })

  test('intervals match exactly over S x desired retention in [0.5, 1]', () => {
    for (const { s, retention, days } of vectors.intervals) assert.equal(intervalDays(s, retention), days)
  })
})

describe('model properties', () => {
  test('R is 0.9 at t = S, 1 at t = 0, and falls with t', () => {
    assert.equal(retrievability(0, 5), 1)
    assert.ok(Math.abs(retrievability(5, 5) - 0.9) < 1e-6)
    assert.ok(retrievability(10, 5) < retrievability(5, 5))
  })

  test('first review: S0 is w[G-1] floored at 0.1, D0 is clamped to [1, 10]', () => {
    for (const g of [1, 2, 3, 4] as const) {
      const m = nextMemory(null, 0, g)
      assert.equal(m.stability, Math.max(W[g - 1]!, 0.1))
      assert.ok(m.difficulty >= 1 && m.difficulty <= 10)
    }
    assert.ok(nextMemory(null, 0, 1).difficulty > nextMemory(null, 0, 4).difficulty)
  })

  test('a lapse never leaves a card more stable than before', () => {
    let m = nextMemory(nextMemory(null, 0, 3), 5, 3)
    for (const t of [1, 10, 100]) {
      const lapsed = nextMemory(m, t, 1)
      assert.ok(lapsed.stability <= m.stability)
      assert.ok(lapsed.difficulty >= m.difficulty)
      m = nextMemory(m, t, 3)
    }
  })

  test('Easy grows stability more than Good, and Good more than Hard', () => {
    const base = nextMemory(nextMemory(null, 0, 3), 3, 3)
    const [hard, good, easy] = ([2, 3, 4] as const).map((g) => nextMemory(base, 4, g).stability) as [number, number, number]
    assert.ok(hard < good && good < easy)
  })

  test('difficulty stays within [1, 10] under any run of ratings', () => {
    for (const g of [1, 4] as const) {
      let m = nextMemory(null, 0, g)
      for (let i = 0; i < 60; i++) {
        m = nextMemory(m, 2, g)
        assert.ok(m.difficulty >= 1 && m.difficulty <= 10)
      }
    }
  })

  test('intervals are whole days in [1, MAX_INTERVAL]; a retention outside (0, 1] throws', () => {
    assert.equal(intervalDays(0.001), 1)
    assert.equal(intervalDays(1e9), MAX_INTERVAL)
    assert.ok(intervalDays(10, 0.8) > intervalDays(10, 0.9))
    assert.equal(intervalDays(10), intervalDays(10, DEFAULT_RETENTION))
    assert.throws(() => intervalDays(10, 0), RangeError)
    assert.throws(() => intervalDays(10, 1.01), RangeError)
  })

  test('the same replay twice gives identical bits', () => {
    const run = () => {
      let m: MemoryState | null = null
      for (const [t, g] of [[0, 3], [1, 3], [4, 1], [0, 2], [9, 4]] as [number, Rating][]) m = nextMemory(m, t, g)
      return m
    }
    assert.deepEqual(run(), run())
  })
})
