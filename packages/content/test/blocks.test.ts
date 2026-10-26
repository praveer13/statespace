import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BLOCK_TYPES, CARD_VARIANTS, DRAFT_BANNER, DRAFT_LABEL, ITEM_ROLES, MAX_BLOCK_TYPES, RUN_PENDING, TIERS, blocksOf, copyOf, countBlockTypes, unknownBlockTypes } from '../src/index.ts'
import { compile, fixture } from './helpers.ts'

test('there are six block types and the limit is six (V2-18)', () => {
  assert.deepEqual([...BLOCK_TYPES], ['prose', 'instrument', 'item', 'claim', 'specimen', 'card'])
  assert.equal(MAX_BLOCK_TYPES, 6)
  assert.equal(BLOCK_TYPES.length, MAX_BLOCK_TYPES)
  assert.deepEqual([...ITEM_ROLES], ['prequestion', 'segment', 'exit'])
  assert.deepEqual([...CARD_VARIANTS], ['build-this', 'twin', 'dated-incident', 'feels-harder', 'reading'])
  assert.deepEqual([...TIERS], ['boot', 'core', 'bridge', 'step'])
})

test('the draft label is the spine\'s, and the banner is that label with a capital', () => {
  assert.equal(DRAFT_LABEL, 'draft: first-learner pass pending')
  assert.equal(DRAFT_BANNER, 'Draft: first-learner pass pending')
  assert.equal(RUN_PENDING, 'run not yet recorded')
})

test('blocks are counted by type, and a type outside the six is found', () => {
  const page = compile(fixture('lessons/S1.L1.md')).compiled?.page
  assert.ok(page)
  assert.deepEqual(countBlockTypes(page), { item: 2, prose: 1, instrument: 1, specimen: 1, claim: 1, card: 1 })
  assert.equal(blocksOf(page).length, 7)
  assert.deepEqual(unknownBlockTypes(page), [])
  assert.deepEqual(unknownBlockTypes({ segments: [{ blocks: [{ type: 'prose' }, { type: 'figure' }, { type: 'table' }] }] }), ['figure', 'table'])
})

test('copyOf lists every string a learner reads, with its path, and leaves code out unless asked', () => {
  const page = compile(fixture('lessons/S1.L1.md')).compiled?.page
  assert.ok(page)
  const copy = copyOf(page)
  assert.equal(copy[0]?.path, '/title')
  assert.ok(copy.some((c) => c.path === '/segments/0/blocks/0/choice/options/1/why' && c.kind === 'why'))
  assert.ok(copy.some((c) => c.path === '/segments/0/blocks/2/tap/property' && c.kind === 'tap'))
  assert.ok(copy.every((c) => c.kind !== 'code'))
  assert.ok(copyOf(page, { code: true }).some((c) => c.kind === 'code' && c.text.startsWith('from z3 import')))
  assert.ok(new Set(copy.map((c) => c.path)).size === copy.length, 'each path once')
})
