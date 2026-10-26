import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as rng from '../src/index.ts'
import { hash32, shuffledOrder, splitmix32, splitmix32u } from '../src/index.ts'

// An independent splitmix32 written with BigInt, so no step shares a line with the vendored code.
const MASK = 0xffffffffn
const mul = (a: bigint, b: bigint): bigint => (a * b) & MASK
function oracle(seed: number): () => number {
  let a = BigInt(seed | 0) & MASK
  return () => {
    a = (a + 0x9e3779b9n) & MASK
    let t = a ^ (a >> 16n)
    t = mul(t, 0x21f0aaadn)
    t = t ^ (t >> 15n)
    t = mul(t, 0x735a2d97n)
    t = t ^ (t >> 15n)
    return Number(t)
  }
}

const SEEDS = [0, 1, 2, 42, 0x5eed, 0x6b657231, 0x7fffffff, 0x80000000, 0xffffffff, -1, -123456789]

test('splitmix32u equals an independent BigInt implementation over 11 seeds x 200 draws', () => {
  for (const seed of SEEDS) {
    const mine = splitmix32u(seed)
    const other = oracle(seed)
    for (let i = 0; i < 200; i++) assert.equal(mine(), other(), `seed ${seed}, draw ${i}`)
  }
})

test('splitmix32 is splitmix32u over 2^32, in [0, 1)', () => {
  for (const seed of SEEDS) {
    const f = splitmix32(seed)
    const u = splitmix32u(seed)
    for (let i = 0; i < 100; i++) {
      const x = f()
      assert.equal(x, u() / 4294967296)
      assert.ok(x >= 0 && x < 1)
    }
  }
})

test('the same seed gives the same sequence twice, and different seeds differ', () => {
  const run = (seed: number) => Array.from({ length: 8 }, ((f) => () => f())(splitmix32u(seed)))
  assert.deepEqual(run(7), run(7))
  assert.notDeepEqual(run(7), run(8))
})

test('shuffledOrder is a deterministic permutation of [0, n)', () => {
  for (const n of [0, 1, 2, 5, 26]) {
    for (const seed of [1, 2, 3, 0xffffffff]) {
      const order = shuffledOrder(n, seed)
      assert.deepEqual(order, shuffledOrder(n, seed))
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i))
    }
  }
  assert.notDeepEqual(shuffledOrder(26, 1), shuffledOrder(26, 2))
})

test('hash32 is FNV-1a over 32 bits: the published test vectors', () => {
  // https://www.isthe.com/chongo/src/fnv/test_fnv.c (FNV-1a, 32 bit): "", "a", "foobar".
  assert.equal(hash32(''), 0x811c9dc5)
  assert.equal(hash32('a'), 0xe40c292c)
  assert.equal(hash32('foobar'), 0xbf9cf968)
})

test('the package does not re-export the entropy source or the quiz-export order', () => {
  assert.deepEqual(Object.keys(rng).sort(), [
    'SeededDraw',
    'UINT32_RANGE',
    'createDraw',
    'deriveSeed',
    'fmix32',
    'hash32',
    'isUint32',
    'shuffledOrder',
    'splitmix32',
    'splitmix32u',
    'toUint32',
  ])
  assert.equal('freshSeed' in rng, false)
  assert.equal('exportOrder' in rng, false)
})
