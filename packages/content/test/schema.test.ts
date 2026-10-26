import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compileSchema } from '@statespace/schema'
import type { Lesson } from '../src/index.ts'
import { REPO, checker, compile, fixture } from './helpers.ts'

const built = (): Lesson => {
  const r = compile(fixture('lessons/S1.L1.md'))
  assert.ok(r.compiled)
  return structuredClone(r.compiled.page)
}

test('a fault inside a block is reported at the field, not as a failed oneOf', () => {
  const page = built()
  const cell = page.segments[0]?.blocks[2]
  assert.equal(cell?.type, 'instrument')
  delete (cell as { call: { options: Array<{ why?: string }> } }).call.options[1]?.why
  const issues = checker.page(page)
  assert.deepEqual(issues.map((i) => [i.path, i.keyword]), [['/segments/0/blocks/2/call/options/1', 'required']])
  assert.match(issues[0]?.message ?? '', /is missing why/)
})

test('a block of another type is reported as one of the six', () => {
  const page = built()
  ;(page.segments[0]?.blocks as unknown[])[1] = { type: 'figure', md: 'x' }
  const issues = checker.page(page)
  assert.deepEqual(issues.map((i) => [i.path, i.keyword]), [['/segments/0/blocks/1', 'oneOf']])
  assert.match(issues[0]?.message ?? '', /is not one of the six block types/)
})

test('a fault at the top of the page keeps its own path', () => {
  const page = built() as unknown as Record<string, unknown>
  page.draft = 'yes'
  assert.deepEqual(checker.page(page).map((i) => [i.path, i.keyword]), [['/draft', 'type']])
})

const FIXTURES = `${REPO}schemas/fixtures/lesson/`
const kindOf = (record: { id?: unknown }): 'page' | 'stage' | 'lab' => (typeof record.id === 'string' && /^S[1-9][0-9]*$/.test(record.id) ? 'stage' : typeof record.id === 'string' && /^LAB-[0-9]+$/.test(record.id) ? 'lab' : 'page')

test("the schema's own fixtures behave through the checker: every valid one passes and every invalid one fails where its index says", () => {
  const valid = readdirSync(`${FIXTURES}valid`)
  const kinds = new Set<string>()
  for (const f of valid) {
    const record = JSON.parse(readFileSync(`${FIXTURES}valid/${f}`, 'utf8')) as { id?: unknown }
    kinds.add(kindOf(record))
    assert.deepEqual(checker.record(record), [], f)
    assert.deepEqual(checker[kindOf(record)](record), [], f)
  }
  assert.deepEqual([...kinds].sort(), ['lab', 'page', 'stage'], 'the valid fixtures hold a page, a stage and a lab')
  const index = JSON.parse(readFileSync(`${FIXTURES}invalid/index.json`, 'utf8')) as Array<{ file: string; instancePath: string; keyword: string }>
  assert.ok(index.length >= 90)
  const raw = compileSchema('lesson')
  for (const e of index) {
    const record = JSON.parse(readFileSync(`${FIXTURES}invalid/${e.file}`, 'utf8')) as { id?: unknown }
    // the verdict GATE-schema's TypeScript half reaches: some issue at the path and keyword the index names
    const found = raw(record)
    assert.ok(
      found.some((i) => i.instancePath === e.instancePath && i.keyword === e.keyword),
      `${e.file}: wanted ${e.keyword} at ${e.instancePath || '/'}, got ${found.map((i) => `${i.keyword} at ${i.instancePath || '/'}`).join(', ') || 'nothing'}`,
    )
    // the checker, which names the field a failed block is wrong at, and the definition of the record's own kind agree it is invalid
    assert.ok(checker.record(record).length > 0, e.file)
    assert.ok(checker[kindOf(record)](record).length > 0, e.file)
  }
})

test("the root picks the definition by the id, and a record of the wrong kind fails at its id", () => {
  const stage = JSON.parse(readFileSync(`${FIXTURES}valid/stage-full.json`, 'utf8')) as Record<string, unknown>
  assert.deepEqual(checker.record(stage), [])
  assert.deepEqual(checker.stage(stage), [])
  assert.deepEqual(checker.page(stage).map((i) => [i.path, i.keyword]).filter(([p]) => p === '/id'), [['/id', 'pattern']])
  const lab = JSON.parse(readFileSync(`${FIXTURES}valid/lab-full.json`, 'utf8')) as Record<string, unknown>
  assert.deepEqual(checker.record({ ...lab, id: 'S2' }).map((i) => i.keyword).includes('additionalProperties'), true, 'a lab body under a stage id is judged as a stage')
  assert.ok(checker.record({ ...stage, id: 'S0' }).some((i) => i.path === '/id' && i.keyword === 'pattern'), 'an id that is none of the three is judged as a page, and its id fails')
  assert.ok(checker.record({}).some((i) => i.path === '' && i.keyword === 'required'))
  assert.ok(checker.record(null).length > 0)
})

test('the six block types are the six of the schema', () => {
  const schema = JSON.parse(readFileSync(`${REPO}schemas/lesson.schema.json`, 'utf8')) as { $defs: { block: { oneOf: Array<{ $ref: string }> } } }
  assert.deepEqual(
    schema.$defs.block.oneOf.map((m) => m.$ref.replace('#/$defs/', '')),
    ['proseBlock', 'instrumentBlock', 'itemBlock', 'claimBlock', 'specimenBlock', 'cardBlock'],
  )
})
