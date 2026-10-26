import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDraw, deriveSeed, fmix32, isUint32, SeededDraw, splitmix32u, toUint32, UINT32_RANGE } from '../src/index.ts'

// The golden values below were computed by an independent Python implementation of splitmix32, FNV-1a over
// UTF-16 code units and MurmurHash3's finalizer (none of this package's code), so they pin the algorithms, not
// whatever this code happens to return. Changing any of them changes every generated instance in the course:
// GATE-generators' committed digests would fail too.

test('fmix32 is MurmurHash3\'s 32-bit finalizer', () => {
  assert.deepEqual([0, 1, 0xdeadbeef, 0xffffffff].map(fmix32), [0x0, 0x514e28b7, 0x0de5c6a9, 0x81f16f39])
})

test('deriveSeed matches the independent implementation, labels with non-ASCII code units included', () => {
  const cases: [number, string, number][] = [
    [0, '', 0xe8835c7d],
    [1, 'options', 0x83d7d2b7],
    [0x7c1e09a4, 'width', 0xedc0101b],
    [0xffffffff, 'GEN-negate-it/t4', 0xec84c7a6],
    [42, 'é→∀', 0x76e93e84],
  ]
  for (const [seed, label, want] of cases) assert.equal(deriveSeed(seed, label), want, `deriveSeed(${seed}, ${JSON.stringify(label)})`)
})

test('below(n) is rejection sampling over splitmix32u: the independent implementation\'s sequences', () => {
  const run = (seed: number, n: number, count: number) => {
    const d = createDraw(seed)
    return Array.from({ length: count }, () => d.below(n))
  }
  assert.deepEqual(run(0x5eed, 7, 12), [3, 4, 3, 2, 5, 3, 2, 5, 4, 2, 0, 5])
  assert.deepEqual(run(1, 3, 10), [0, 1, 2, 0, 0, 1, 1, 2, 1, 2])
  assert.deepEqual(run(0xffffffff, 1000, 5), [170, 868, 678, 221, 63])
})

test('below(2^32) is the raw stream, and below(1) is always 0 while still consuming a draw', () => {
  const a = createDraw(99)
  const raw = splitmix32u(99)
  for (let i = 0; i < 20; i++) assert.equal(a.below(UINT32_RANGE), raw())
  const b = createDraw(7)
  const c = createDraw(7)
  assert.equal(b.below(1), 0)
  c.u32()
  assert.equal(b.u32(), c.u32())
})

test('below(n) stays in range and is close to uniform (chi-square, 6 cells, 60,000 draws)', () => {
  const d = createDraw(20261025)
  const counts = new Array<number>(6).fill(0)
  const n = 60000
  for (let i = 0; i < n; i++) {
    const v = d.below(6)
    assert.ok(Number.isInteger(v) && v >= 0 && v < 6)
    counts[v] = (counts[v] as number) + 1
  }
  const expected = n / 6
  const chi2 = counts.reduce((s, c) => s + ((c - expected) * (c - expected)) / expected, 0)
  // 5 degrees of freedom: the 0.999 quantile is about 20.5, so a fair stream fails this one time in a thousand.
  assert.ok(chi2 < 20.5, `chi-square ${chi2.toFixed(2)} with counts ${counts.join(', ')}`)
})

test('int, bool and chance stay in their ranges and refuse bad arguments', () => {
  const d = createDraw(3)
  for (let i = 0; i < 500; i++) {
    const v = d.int(-5, 5)
    assert.ok(v >= -5 && v <= 5)
    assert.equal(typeof d.bool(), 'boolean')
  }
  assert.equal(d.int(4, 4), 4)
  for (let i = 0; i < 50; i++) {
    assert.equal(d.chance(0, 10), false)
    assert.equal(d.chance(10, 10), true)
  }
  assert.throws(() => d.int(5, 4), RangeError)
  assert.throws(() => d.int(0.5, 4), RangeError)
  assert.throws(() => d.below(0), RangeError)
  assert.throws(() => d.below(UINT32_RANGE + 1), RangeError)
  assert.throws(() => d.below(2.5), RangeError)
  assert.throws(() => d.chance(3, 2), RangeError)
  assert.throws(() => d.pick([]), RangeError)
})

test('shuffle returns a permutation, leaves its input alone, and reaches every order of three about equally', () => {
  const input = Object.freeze([0, 1, 2])
  const seen = new Map<string, number>()
  for (let seed = 0; seed < 6000; seed++) {
    const out = createDraw(seed).shuffle(input)
    assert.deepEqual([...out].sort(), [0, 1, 2])
    seen.set(out.join(''), (seen.get(out.join('')) ?? 0) + 1)
  }
  assert.deepEqual(input, [0, 1, 2])
  assert.equal(seen.size, 6)
  for (const [order, count] of seen) assert.ok(count > 850 && count < 1150, `order ${order}: ${count} of 6000`)
})

test('sample draws k distinct elements; weighted never picks a zero weight', () => {
  const items = ['a', 'b', 'c', 'd', 'e']
  for (let seed = 0; seed < 200; seed++) {
    const d = createDraw(seed)
    const s = d.sample(items, 3)
    assert.equal(s.length, 3)
    assert.equal(new Set(s).size, 3)
    assert.ok(s.every((x) => items.includes(x)))
    assert.notEqual(d.weighted([['never', 0], ['always', 5]]), 'never')
  }
  assert.deepEqual(createDraw(1).sample(items, 0), [])
  assert.throws(() => createDraw(1).sample(items, 6), RangeError)
  assert.throws(() => createDraw(1).weighted([['x', 0]]), RangeError)
  assert.throws(() => createDraw(1).weighted([['x', -1]]), RangeError)
})

test('the same seed gives the same sequence of mixed calls; fork ignores what was drawn before it', () => {
  const script = (d: SeededDraw) => [d.int(0, 9), d.pick(['x', 'y', 'z']), d.shuffle([1, 2, 3, 4]).join(''), d.bool(), d.weighted([['p', 1], ['q', 3]])]
  assert.deepEqual(script(createDraw(0xabcdef)), script(createDraw(0xabcdef)))
  const fresh = createDraw(17).fork('options')
  const used = createDraw(17)
  used.u32()
  used.below(10)
  const late = used.fork('options')
  assert.equal(late.seed, fresh.seed)
  assert.equal(late.seed, deriveSeed(17, 'options'))
  assert.deepEqual([late.u32(), late.u32()], [fresh.u32(), fresh.u32()])
  assert.notEqual(createDraw(17).fork('a').seed, createDraw(17).fork('b').seed)
})

test('seeds are uint32: negative integers wrap, fractions and NaN are refused', () => {
  assert.equal(toUint32(-1), 0xffffffff)
  assert.equal(new SeededDraw(-1).seed, 0xffffffff)
  assert.throws(() => toUint32(1.5), RangeError)
  assert.throws(() => toUint32(Number.NaN), RangeError)
  assert.equal(isUint32(0), true)
  assert.equal(isUint32(0xffffffff), true)
  assert.equal(isUint32(UINT32_RANGE), false)
  assert.equal(isUint32(-1), false)
})
