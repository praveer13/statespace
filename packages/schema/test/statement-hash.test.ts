import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { StatementHashError, statementHashOfBytes, statementHashOfText, statementPreimage, trimRight } from '../src/index.ts'

interface Vector {
  id: string
  text?: string
  bytesHex?: string
  canonicalHex?: string
  sha256?: string
  sameAs?: string
  error?: 'invalid-utf8' | 'ill-formed-text'
}

const file = new URL('../../../schemas/vectors/statement-hash.json', import.meta.url)
const vectors = (JSON.parse(readFileSync(file, 'utf8')) as { vectors: Vector[] }).vectors
const valid = vectors.filter((v) => !v.error)
const invalid = vectors.filter((v) => v.error)
const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex')

test('every shared vector hashes to its expected SHA-256 through the text and bytes entry points', async () => {
  for (const v of valid) {
    assert.equal(await statementHashOfText(v.text as string), v.sha256, `${v.id} (text)`)
    assert.equal(await statementHashOfBytes(Buffer.from(v.bytesHex as string, 'hex')), v.sha256, `${v.id} (bytes)`)
    assert.equal(hex(statementPreimage(v.text as string)), v.canonicalHex, `${v.id} (preimage)`)
  }
  assert.ok(valid.length >= 80)
})

test('every error vector is rejected with its code', async () => {
  for (const v of invalid) {
    const run = v.error === 'invalid-utf8' ? () => statementHashOfBytes(Buffer.from(v.bytesHex as string, 'hex')) : () => statementHashOfText(v.text as string)
    await assert.rejects(run, (e: unknown) => e instanceof StatementHashError && e.code === v.error, v.id)
  }
  assert.ok(invalid.length >= 10)
})

test('vectors that name sameAs hash like the vector they name', () => {
  const byId = new Map(vectors.map((v) => [v.id, v]))
  const named = vectors.filter((v) => v.sameAs)
  assert.ok(named.length > 20)
  for (const v of named) assert.equal(v.sha256, byId.get(v.sameAs as string)?.sha256, v.id)
})

test('trimRight removes exactly what the engine trimEnd removes, for every UTF-16 code unit', () => {
  for (let unit = 0; unit <= 0xffff; unit++) {
    if (unit >= 0xd800 && unit <= 0xdfff) continue // lone surrogates are rejected before hashing
    const tail = String.fromCharCode(unit)
    assert.equal(trimRight(`x${tail}`), `x${tail}`.trimEnd(), `U+${unit.toString(16).padStart(4, '0')}`)
  }
})

test('trimRight leaves the start and the middle alone and is idempotent', () => {
  assert.equal(trimRight('  a \u00a0 b \t\n'), '  a \u00a0 b')
  assert.equal(trimRight(trimRight('a \n')), 'a')
  assert.equal(trimRight(''), '')
  assert.equal(trimRight(' \t\r\n'), '')
})
