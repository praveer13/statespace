import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDraw } from '@statespace/rng'
import { assembleOptions, categoricalDistinctions, certifyChoice, discardCause, distinctionOf, isDiscard, matchMisconception, optionLetters } from '../../src/core/index.ts'
import type { ChoiceKey, ChoiceOption, Mutant } from '../../src/core/index.ts'

// A toy reference: an integer threshold. Mutants shift it, negate it, or do not apply.
const mutants: Mutant<number>[] = [
  { tag: 'dp:O1', operator: 'off by one', why: (r) => `shifts ${r} by one`, apply: (r) => r + 1 },
  { tag: 'dp:Z1', operator: 'negate', why: () => 'negates it', apply: (r) => -r },
  { tag: 'dp:G5', operator: 'never applies', why: () => 'n/a', apply: () => null },
  { tag: 'dp:Z5', operator: 'repeat the reference', why: () => 'same text', apply: (r) => r },
]

test('options: the reference and the mutants that apply, labeled A, B, C in a seeded order', () => {
  const a = assembleOptions({ reference: 5, referenceWhy: 'the threshold', mutants, distractors: 2, draw: createDraw(1), render: String })
  assert.equal(a.options.length, 3)
  assert.deepEqual(a.options.map((o) => o.id), ['A', 'B', 'C'])
  assert.equal(a.options.filter((o) => o.origin.kind === 'reference').length, 1)
  assert.deepEqual(new Set(a.options.map((o) => o.text)), new Set(['5', '6', '-5']))
  for (const o of a.options) assert.equal(String(a.values[o.id]), o.text)
  const tags = a.options.flatMap((o) => (o.origin.kind === 'mutant' ? [o.origin.tag] : []))
  assert.deepEqual(new Set(tags), new Set(['dp:O1', 'dp:Z1']))
  // Deterministic in the draw; another seed may order them differently, never differently in content.
  assert.deepEqual(assembleOptions({ reference: 5, referenceWhy: 'x', mutants, distractors: 2, draw: createDraw(1), render: String }).options.map((o) => o.text), a.options.map((o) => o.text))
  const orders = new Set(Array.from({ length: 40 }, (_, s) => assembleOptions({ reference: 5, referenceWhy: 'x', mutants, distractors: 2, draw: createDraw(s), render: String }).options.map((o) => o.text).join()))
  assert.ok(orders.size > 1, 'the order depends on the seed')
})

test('a part that cannot get its distractors throws, so its chance level never changes with the seed', () => {
  assert.throws(() => assembleOptions({ reference: 5, referenceWhy: 'x', mutants, distractors: 3, draw: createDraw(1), render: String }), /only 2 mutant/)
  const fewer = assembleOptions({ reference: 5, referenceWhy: 'x', mutants, distractors: 3, minDistractors: 2, draw: createDraw(1), render: String })
  assert.equal(fewer.options.length, 3)
  assert.deepEqual(optionLetters(4), ['A', 'B', 'C', 'D'])
  assert.throws(() => optionLetters(27), RangeError)
})

const opts = (): { options: ChoiceOption[]; values: Record<string, number> } => {
  const a = assembleOptions({ reference: 5, referenceWhy: 'x', mutants, distractors: 2, draw: createDraw(7), render: String })
  return { options: [...a.options], values: { ...a.values } }
}

test('certifyChoice: the reference confirmed and every pair told apart, with the witnesses kept', async () => {
  const { options, values } = opts()
  const key = await certifyChoice({
    part: 'p',
    options,
    values,
    confirm: async (r) => (r === 5 ? { confirmed: true } : { rejected: 'not 5' }),
    distinguish: async (a, b) => (a === b ? { same: true } : { differ: { x: Math.max(a, b) } }),
  })
  assert.ok(!isDiscard(key))
  const k = key as ChoiceKey
  assert.equal(options.find((o) => o.id === k.answer)?.origin.kind, 'reference')
  assert.equal(k.distinctions.length, 3)
  for (const [x, y] of [['A', 'B'], ['B', 'C'], ['C', 'A']] as const) assert.ok(distinctionOf(k, x, y), `${x}-${y}`)
})

test('certifyChoice discards on an undecided checker, an equivalent pair or a rejected reference, each with its cause', async () => {
  const { options, values } = opts()
  const run = (confirm: Parameters<typeof certifyChoice<number>>[0]['confirm'], distinguish: Parameters<typeof certifyChoice<number>>[0]['distinguish']) =>
    certifyChoice({ part: 'p', options, values, confirm, distinguish })
  const differ = async () => ({ differ: { x: 1 } })
  assert.equal(discardCause((await run(async () => ({ unknown: 'incomplete', budget: false }), differ)) as never), 'unknown')
  assert.equal(discardCause((await run(async () => ({ unknown: 'canceled', budget: true }), differ)) as never), 'budget')
  assert.equal(discardCause((await run(async () => ({ rejected: 'differs on x = 1' }), differ)) as never), 'reference-rejected')
  assert.equal(discardCause((await run(async () => ({ confirmed: true }), async () => ({ same: true }))) as never), 'equivalent')
  assert.equal(discardCause((await run(async () => ({ confirmed: true }), async () => ({ unknown: 'canceled', budget: true }))) as never), 'budget')
  await assert.rejects(certifyChoice({ part: 'p', options: options.map((o) => ({ ...o, origin: { kind: 'reference' } as const })), values, confirm: async () => ({ confirmed: true }), distinguish: differ }), /3 reference options/)
})

test('categorical options differ by value; a misconception is matched by equivalence, never on undecided', async () => {
  const opt = (id: string, text: string): ChoiceOption => ({ id, text, why: 'w', origin: { kind: 'reference' } })
  assert.equal(categoricalDistinctions([opt('A', 'sat'), opt('B', 'unsat'), opt('C', 'unknown')]).length, 3)
  assert.throws(() => categoricalDistinctions([opt('A', 'sat'), opt('B', 'sat')]), /share the text/)
  const candidates = [
    { tag: 'dp:Z1' as const, value: 1 },
    { tag: 'dp:O1' as const, value: 2 },
  ]
  assert.equal(await matchMisconception(2, candidates, async (a, b) => a === b), 'dp:O1')
  assert.equal(await matchMisconception(3, candidates, async (a, b) => a === b), undefined)
  assert.equal(await matchMisconception(1, candidates, async () => 'unknown'), undefined)
})
