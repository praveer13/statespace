import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { BANDS, SEEDS, generatedOptions, optionTexts } from './lib/generators.mjs'
import { FIXTURE_TREE, REPO } from './helpers.mjs'

function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lessons-gen-'))
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), text)
  }
  return dir
}
const gen = (slug, body) => ({ [`packages/generators/src/${slug}/index.ts`]: body })

test('the texts of an instance are its choices and its statements, and nothing else', () => {
  const instance = {
    item: {
      stem: 'A stem that is no option',
      parts: [
        { kind: 'choice', id: 'a', prompt: 'p', options: [{ id: 'A', text: 'sat' }, { id: 'B', text: '  ' }, { id: 'C', text: 3 }] },
        { kind: 'multi-tf', id: 'b', prompt: 'p', statements: [{ id: 'S1', text: 'a statement' }] },
        { kind: 'constructed', id: 'c', prompt: 'p', language: { name: 'model', summary: 'values' } },
      ],
    },
  }
  assert.deepEqual(optionTexts(instance), ['sat', 'a statement'])
  assert.deepEqual(optionTexts({}), [])
  assert.deepEqual(optionTexts(null), [])
  assert.deepEqual(optionTexts({ item: { parts: 'no' } }), [])
})

test('the sample is the same for every family: small seeds, the edges of the space, and three bands', () => {
  assert.equal(new Set(SEEDS).size, SEEDS.length)
  for (const edge of [0, 1, 0x7fffffff, 0x80000000, 0xffffffff]) assert.ok(SEEDS.includes(edge), String(edge))
  assert.deepEqual(BANDS, [1, 2, 3])
})

test('a family\'s options are read from its maker over the sample, in the tree first and then the repository', async () => {
  const generated = generatedOptions([FIXTURE_TREE])
  const verdicts = await generated('GEN-call-it', 't1', undefined)
  assert.deepEqual([...verdicts.texts].sort(), ['sat', 'unknown', 'unsat'])
  const statements = await generated('GEN-call-it', 't4', undefined)
  assert.equal(statements.texts.length, 7 + 1) // seed % 7 gives 7 variants of the first statement, and the second never changes
  assert.ok(statements.texts.includes('this answer means the property holds'))
  const formulas = await generated('GEN-negate-it', 't1', undefined)
  assert.equal(formulas.texts.length, 9)
  assert.ok(formulas.texts.includes('allowed ∧ bal′ < 0') && formulas.texts.includes('¬settled ∧ bal′ < 0'))
  assert.deepEqual((await generated('GEN-find-the-witness', 't1', undefined)).texts, [])
})

test('the options of the framework\'s own fixture family are read the way the contract writes them', async () => {
  const { generator } = await import('../../../packages/generators/src/core/fixture/index.ts')
  assert.equal(generator.fixture, true)
  for (const t of generator.templates) {
    for (const band of BANDS) {
      const texts = optionTexts(generator.make(SEEDS[3], band, t.id))
      assert.ok(texts.length >= 3, `${t.id} band ${band}: ${texts.length} options`)
      assert.equal(new Set(texts).size, texts.length, 'the options of one instance are distinct')
    }
  }
})

test('a band narrows the sample to that band', async () => {
  const dir = tree(gen('banded', "export const generator = { make(seed, band) { return { item: { parts: [{ kind: 'choice', options: [{ text: `band ${band}` }] }] } } } }\n"))
  try {
    const generated = generatedOptions([dir])
    assert.deepEqual([...(await generated('GEN-banded', 't1', undefined)).texts].sort(), ['band 1', 'band 2', 'band 3'])
    assert.deepEqual((await generated('GEN-banded', 't1', 2)).texts, ['band 2'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a family with no module is missing, and the first tree that holds one wins', async () => {
  const mine = tree(gen('call-it', "export const generator = { make() { return { item: { parts: [{ kind: 'choice', options: [{ text: 'only mine' }] }] } } } }\n"))
  try {
    assert.deepEqual(await generatedOptions([FIXTURE_TREE])('GEN-no-such-family', 't1', undefined), { missing: true })
    assert.deepEqual((await generatedOptions([mine, FIXTURE_TREE])('GEN-call-it', 't1', undefined)).texts, ['only mine'])
    assert.deepEqual(await generatedOptions([mine])('GEN-negate-it', 't1', undefined), { missing: true })
    assert.deepEqual(await generatedOptions([FIXTURE_TREE])('GEN-../../etc', 't1', undefined), { missing: true })
  } finally {
    fs.rmSync(mine, { recursive: true, force: true })
  }
})

test('a module that will not load, or has no maker, is an error and not a skipped family', async () => {
  const dir = tree({
    ...gen('boom', "throw new Error('boom at import')\n"),
    ...gen('empty', 'export const other = 1\n'),
    ...gen('default-export', "export default { make() { return { item: { parts: [{ kind: 'choice', options: [{ text: 'from default' }] }] } } } }\n"),
  })
  try {
    const generated = generatedOptions([dir])
    assert.match((await generated('GEN-boom', 't1', undefined)).error, /boom at import/)
    assert.match((await generated('GEN-empty', 't1', undefined)).error, /exports no generator with a make function/)
    assert.deepEqual((await generated('GEN-default-export', 't1', undefined)).texts, ['from default'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a seed the maker cannot make is skipped; the others still count', async () => {
  const dir = tree(gen('picky', "export const generator = { make(seed) { if (seed % 2 === 0) throw new Error('no'); return { item: { parts: [{ kind: 'choice', options: [{ text: 'odd' }] }] } } } }\n"))
  try {
    assert.deepEqual((await generatedOptions([dir])('GEN-picky', 't1', undefined)).texts, ['odd'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('every family the repository builds can be read, or says why not', async () => {
  const src = path.join(REPO, 'packages/generators/src')
  const slugs = fs.existsSync(src) ? fs.readdirSync(src).filter((d) => d !== 'core' && fs.existsSync(path.join(src, d, 'index.ts'))) : []
  const generated = generatedOptions([REPO])
  for (const slug of slugs) {
    const r = await generated(`GEN-${slug}`, 't1', undefined)
    assert.ok(Array.isArray(r.texts) || typeof r.error === 'string', `GEN-${slug}: ${JSON.stringify(r)}`)
  }
})
