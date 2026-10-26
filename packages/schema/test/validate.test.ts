import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SCHEMA_DOCUMENTS, SCHEMA_NAMES, compileSchema, createRegistry, isRecord, validate, validateRecord } from '../src/index.ts'
import type { Claim, SchemaDocument } from '../src/index.ts'

const fixtures = new URL('../../../schemas/fixtures/', import.meta.url)
const read = (...parts: string[]): unknown => JSON.parse(readFileSync(new URL(parts.join('/'), fixtures), 'utf8'))
const jsonFiles = (dir: string): string[] => readdirSync(new URL(`${dir}/`, fixtures)).filter((f) => f.endsWith('.json') && f !== 'index.json').sort()

const RECORDS = ['claim', 'event', 'ir']

test('the package embeds every published schema', () => {
  // Every schemas/<name>.schema.json is published (drafts/ is not); W1 tasks add more, so the list is read from schemas/.
  const published = readdirSync(new URL('../../../schemas/', import.meta.url))
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) => f.slice(0, -'.schema.json'.length))
    .sort()
  for (const name of ['claim', 'defs', 'event', 'ir', 'lesson', 'receipt', 'run']) assert.ok(published.includes(name), `schemas/${name}.schema.json is published`)
  assert.deepEqual([...SCHEMA_NAMES].sort(), published)
  for (const doc of SCHEMA_DOCUMENTS) assert.match(doc.id, /^urn:statespace:[a-z]+@1$/)
})

for (const name of RECORDS) {
  test(`${name}: every valid fixture validates`, () => {
    const files = jsonFiles(`${name}/valid`)
    assert.ok(files.length > 0)
    for (const f of files) {
      const result = validate(name, read(name, 'valid', f))
      assert.deepEqual(result, { ok: true }, `${name}/valid/${f}`)
    }
  })

  test(`${name}: every invalid fixture fails on the keyword and path its index names`, () => {
    const index = read(name, 'invalid', 'index.json') as { file: string; instancePath: string; keyword: string }[]
    assert.ok(index.length > 0)
    for (const entry of index.filter((e) => e.file.endsWith('.json'))) {
      const issues = compileSchema(name)(read(name, 'invalid', entry.file))
      assert.ok(
        issues.some((i) => i.instancePath === entry.instancePath && i.keyword === entry.keyword),
        `${name}/invalid/${entry.file}: wanted ${entry.keyword} at ${entry.instancePath || '/'}, got ${issues.map((i) => `${i.keyword} at ${i.instancePath || '/'}`).join(', ') || 'no issue'}`,
      )
    }
  })
}

test('shared definitions accept their valid values and reject their invalid ones, including a trailing newline', () => {
  const defs = read('defs.json') as Record<string, { valid: unknown[]; invalid: unknown[] }>
  const wrappers: SchemaDocument[] = Object.keys(defs).map((name) => ({
    name: `check-${name}`,
    id: `urn:statespace:check-${name}@1`,
    schema: null,
    json: { $ref: `urn:statespace:defs@1#/$defs/${name}` },
  }))
  const registry = createRegistry([...SCHEMA_DOCUMENTS, ...wrappers])
  for (const [name, { valid, invalid }] of Object.entries(defs)) {
    for (const v of valid) assert.equal(registry.validate(`check-${name}`, v).ok, true, `${name}: ${JSON.stringify(v)}`)
    for (const v of invalid) assert.equal(registry.validate(`check-${name}`, v).ok, false, `${name}: ${JSON.stringify(v)}`)
  }
})

test('validateRecord dispatches on the schema field', () => {
  const claim = read('claim', 'valid', 'transfer-conserves.json')
  assert.deepEqual(validateRecord(claim), { ok: true })
  assert.equal(validateRecord({ schema: 'statespace/receipt@1' }).ok, false)
  assert.equal(validateRecord({ id: 'x' }).ok, false)
  assert.equal(validateRecord(null).ok, false)
  assert.equal(validateRecord([]).ok, false)
})

test('isRecord narrows a value to its record type', () => {
  const value: unknown = read('claim', 'valid', 'transfer-conserves.json')
  if (isRecord('statespace/claim@1', value)) {
    const claim: Claim = value
    assert.equal(claim.template, 'CL-2.1')
  } else assert.fail('the fixture is a valid claim')
  assert.equal(isRecord('statespace/claim@1', { schema: 'statespace/claim@1' }), false)
})

test('a recursive $ref, oneOf, not, if/then and uniqueItems behave as JSON Schema says', () => {
  const tree: SchemaDocument = {
    name: 'tree',
    id: 'urn:statespace:tree@1',
    schema: null,
    json: {
      $id: 'urn:statespace:tree@1',
      type: 'object',
      required: ['value'],
      additionalProperties: false,
      properties: {
        value: { type: 'integer' },
        children: { type: 'array', uniqueItems: true, items: { $ref: '#' } },
        mode: { oneOf: [{ const: 'a' }, { const: 'b' }] },
        tag: { not: { const: 'forbidden' } },
      },
      if: { required: ['mode'] },
      then: { required: ['tag'] },
    },
  }
  const v = createRegistry([tree]).compileSchema('tree')
  assert.deepEqual(v({ value: 1, children: [{ value: 2, children: [{ value: 3 }] }] }), [])
  assert.equal(v({ value: 1, children: [{ value: 2 }, { value: 2 }] })[0]?.keyword, 'uniqueItems')
  assert.equal(v({ value: 1, children: [{ value: 'x' }] })[0]?.instancePath, '/children/0/value')
  assert.equal(v({ value: 1, mode: 'c', tag: 't' })[0]?.keyword, 'oneOf')
  assert.equal(v({ value: 1, mode: 'a' })[0]?.keyword, 'required')
  assert.equal(v({ value: 1, tag: 'forbidden' })[0]?.keyword, 'not')
  assert.equal(v({ value: 1.5 })[0]?.keyword, 'type')
  assert.equal(v({ value: 1, extra: true })[0]?.keyword, 'additionalProperties')
})

test('minLength counts code points, not UTF-16 units', () => {
  const doc: SchemaDocument = { name: 'len', id: 'urn:statespace:len@1', schema: null, json: { $id: 'urn:statespace:len@1', type: 'string', minLength: 2, maxLength: 2 } }
  const v = createRegistry([doc]).compileSchema('len')
  assert.deepEqual(v('\u{1f600}\u{1f600}'), [])
  assert.equal(v('\u{1f600}')[0]?.keyword, 'minLength')
})
