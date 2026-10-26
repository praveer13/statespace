import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { canonicalJson, fingerprint, sha256Hex, utf8 } from '../src/index.ts'

const reference = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex')

test('sha256Hex equals node:crypto on strings of every length around a block boundary', () => {
  for (let n = 0; n <= 200; n++) {
    const s = 'a'.repeat(n)
    assert.equal(sha256Hex(s), reference(s), `length ${n}`)
  }
})

test('sha256Hex equals node:crypto on known vectors and on Unicode', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  for (const s of ['∀ x. ¬P(x) ⇒ ∃ y', 'a′ ≥ 0', '𝔸𝔹ℂ — emoji 🙂', 'line\r\nbreak', 'é']) assert.equal(sha256Hex(s), reference(s), s)
})

test('sha256Hex equals node:crypto on random bytes', () => {
  for (const n of [1, 55, 56, 57, 63, 64, 65, 119, 120, 1000, 4096]) {
    const bytes = randomBytes(n)
    assert.equal(sha256Hex(bytes), reference(bytes), `${n} bytes`)
  }
})

test('utf8 matches TextEncoder, and writes a lone surrogate as U+FFFD', () => {
  for (const s of ['plain', 'é', '€', '𝄞', '∀ ∃ ⇒']) assert.deepEqual([...utf8(s)], [...new TextEncoder().encode(s)], s)
  assert.deepEqual([...utf8('a\ud800b')], [...new TextEncoder().encode('a\ud800b')])
})

test('canonicalJson sorts keys, keeps arrays in order and drops undefined properties', () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }], z: undefined }), '{"a":[2,{"c":2,"d":1}],"b":1}')
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }))
  assert.equal(canonicalJson('é"\n'), JSON.stringify('é"\n'))
  assert.throws(() => canonicalJson(Number.NaN))
  assert.throws(() => canonicalJson(() => 1))
})

test('fingerprint is a prefix of the hash of the canonical text', () => {
  assert.equal(fingerprint({ a: 1 }), reference('{"a":1}').slice(0, 16))
  assert.equal(fingerprint({ a: 1 }, 8), reference('{"a":1}').slice(0, 8))
})
