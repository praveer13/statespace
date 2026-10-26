import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'
import { canonicalClone, canonicalJson, checkStructure, compareCodePoints, LedgerError, parseJsonSafely, sha256Hex, utf8 } from '../src/index.ts'
import { int, rng, SEEDS } from './helpers.ts'

test('canonical JSON sorts keys by UTF-16 code units, drops undefined properties and writes ECMAScript numbers', () => {
  assert.equal(canonicalJson({ b: 1, a: [true, null, 'x'], c: undefined }), '{"a":[true,null,"x"],"b":1}')
  assert.equal(canonicalJson({ é: 1, z: 2, Z: 3, '10': 4, '9': 5 }), '{"10":4,"9":5,"Z":3,"z":2,"é":1}')
  assert.equal(canonicalJson(-0), '0')
  assert.equal(canonicalJson(1e21), '1e+21')
  assert.equal(canonicalJson(0.1 + 0.2), '0.30000000000000004')
  assert.equal(canonicalJson(' "\\'), '" \\"\\\\"')
  assert.equal(canonicalJson('\ud800'), '"\\ud800"', 'a lone surrogate is escaped, as JSON.stringify writes it')
  assert.equal(canonicalJson({ n: { m: [] } }), '{"n":{"m":[]}}')
})

test('canonical JSON refuses what JSON cannot hold exactly', () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, [1, undefined], () => 1, new Date(0), new Map(), 10n, Symbol('s')]) {
    assert.throws(() => canonicalJson(bad), LedgerError)
  }
  let deep: unknown = 0
  for (let i = 0; i < 70; i++) deep = [deep]
  assert.throws(() => canonicalJson(deep), (e: unknown) => e instanceof LedgerError && e.code === 'too-deep')
})

test('the canonical clone is the parse of the canonical form', () => {
  assert.deepEqual(canonicalClone({ b: -0, a: undefined, c: [1.5] }), { b: 0, c: [1.5] })
})

test('code-point order equals UTF-8 byte order, unlike UTF-16 code-unit order', () => {
  const pool = ['a', 'z', 'é', '￿', '', '𝔽', '😀', '\u0000', '~', '"', '\\u']
  for (const seed of SEEDS) {
    const r = rng(seed)
    for (let k = 0; k < 50; k++) {
      const s1 = Array.from({ length: int(r, 0, 4) }, () => pool[int(r, 0, pool.length - 1)]).join('')
      const s2 = Array.from({ length: int(r, 0, 4) }, () => pool[int(r, 0, pool.length - 1)]).join('')
      const bytes = Buffer.compare(Buffer.from(s1, 'utf8'), Buffer.from(s2, 'utf8'))
      assert.equal(Math.sign(compareCodePoints(s1, s2)), bytes, `${JSON.stringify(s1)} vs ${JSON.stringify(s2)}`)
    }
  }
  assert.ok('￿' > '😀', 'code units put U+FFFF after a surrogate pair')
  assert.ok(compareCodePoints('￿', '😀') < 0, 'code points put it before')
})

test('the structural limits of ARCHITECTURE.md section 5.6 hold on parsed JSON', () => {
  assert.deepEqual(checkStructure({ a: [1, { b: 2 }] }), [])
  assert.match(checkStructure(JSON.parse('{"a":{"__proto__":1}}'))[0] ?? '', /__proto__/)
  assert.match(checkStructure({ constructor: 1 })[0] ?? '', /constructor/)
  assert.match(checkStructure(Array.from({ length: 100_001 }, () => 0))[0] ?? '', /100000 values/)
  assert.throws(() => parseJsonSafely('[' + '['.repeat(70) + ']'.repeat(70) + ']'), (e: unknown) => e instanceof LedgerError && e.code === 'too-deep')
  assert.throws(() => parseJsonSafely('{"prototype":{}}'), (e: unknown) => e instanceof LedgerError && e.code === 'forbidden-key')
  assert.throws(() => parseJsonSafely('{'), (e: unknown) => e instanceof LedgerError && e.code === 'not-json')
  assert.deepEqual(parseJsonSafely('{"a":[1,2]}'), { a: [1, 2] })
})

test('SHA-256 and UTF-8 agree with node:crypto and Buffer on every block boundary and random input', () => {
  for (let n = 0; n <= 200; n++) {
    const bytes = crypto.randomBytes(n)
    assert.equal(sha256Hex(new Uint8Array(bytes)), crypto.createHash('sha256').update(bytes).digest('hex'), `length ${n}`)
  }
  for (const n of [1000, 4096, 100_003]) {
    const bytes = crypto.randomBytes(n)
    assert.equal(sha256Hex(new Uint8Array(bytes)), crypto.createHash('sha256').update(bytes).digest('hex'))
  }
  for (const s of ['', 'abc', 'Ünïcødé 𝔽 😀', '\ud800 lone', 'tail \udc00', 'x'.repeat(70_000)]) {
    assert.deepEqual(Buffer.from(utf8(s)), Buffer.from(s, 'utf8'))
    assert.equal(sha256Hex(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'))
  }
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
