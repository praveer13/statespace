import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chanceOf, combineParts, COPY, gradeChoicePart, gradeItem, gradeTrueFalsePart, ungradedGrade, ungradedPart } from '../../src/core/index.ts'
import type { ChoiceKey, ChoicePart, InstanceBase, KeyBase, TrueFalseKey, TrueFalsePart } from '../../src/core/index.ts'

const choice: ChoicePart = {
  kind: 'choice',
  id: 'main',
  prompt: 'Pick one.',
  options: [
    { id: 'A', text: 'ok ∧ a < x', why: 'the violation of ok → a ≥ x', origin: { kind: 'reference' } },
    { id: 'B', text: 'a ≥ x ∧ ¬ok', why: 'violates the converse', origin: { kind: 'mutant', tag: 'dp:G1', operator: 'converse' } },
    { id: 'C', text: 'ok → a ≥ x', why: 'the requirement itself', origin: { kind: 'mutant', tag: 'dp:Z1', operator: 'assert' } },
  ],
}
const choiceKey: ChoiceKey = {
  part: 'main',
  answer: 'A',
  distinctions: [
    { a: 'A', b: 'B', witness: { ok: true, a: 0, x: 1 } },
    { a: 'A', b: 'C', witness: { ok: true, a: 5, x: 1 } },
    { a: 'B', b: 'C', witness: { ok: false, a: 5, x: 1 } },
  ],
}

const tf: TrueFalsePart = {
  kind: 'multi-tf',
  id: 'set',
  prompt: 'True or false?',
  statements: [
    { id: 's1', text: 'covers every input of this encoding', why: 'unsat is about the encoding', origin: { kind: 'reference' } },
    { id: 's2', text: 'sat means the property holds', why: 'sat shows a violation', origin: { kind: 'mutant', tag: 'dp:Z1', operator: 'sat as holds' } },
    { id: 's3', text: 'unknown means no counterexample', why: 'unknown decides nothing', origin: { kind: 'mutant', tag: 'dp:Z2', operator: 'unknown as safe' } },
  ],
}
const tfKey: TrueFalseKey = { part: 'set', truth: { s1: true, s2: false, s3: false }, refutations: { s2: { x: 1 }, s3: { reason: 'canceled' } } }

test('a choice: the key matches; a mutant misses with its tag, its note and the witness that tells it from the key', () => {
  assert.deepEqual(gradeChoicePart(choice, choiceKey, 'A'), { part: 'main', ok: true, why: COPY.matched, note: 'the violation of ok → a ≥ x' })
  const miss = gradeChoicePart(choice, choiceKey, 'B')
  assert.equal(miss.ok, false)
  assert.equal(miss.misconception, 'dp:G1')
  assert.equal(miss.note, 'violates the converse')
  assert.deepEqual(miss.witness, { ok: true, a: 0, x: 1 })
  assert.match(miss.why, /option B from option A/)
  for (const bad of ['D', 3, null, undefined, { id: 'A' }]) assert.equal(gradeChoicePart(choice, choiceKey, bad as never).ungraded, 'outside-language')
})

test('a true/false set counts only when every statement matches; the first miss gives the tag and the refutation', () => {
  assert.equal(gradeTrueFalsePart(tf, tfKey, { s1: true, s2: false, s3: false }).ok, true)
  const miss = gradeTrueFalsePart(tf, tfKey, { s1: true, s2: true, s3: true })
  assert.equal(miss.ok, false)
  assert.equal(miss.misconception, 'dp:Z1')
  assert.deepEqual(miss.witness, { x: 1 })
  assert.match(miss.why, /Statements s2, s3 missed/)
  const restatement = gradeTrueFalsePart(tf, tfKey, { s1: false, s2: false, s3: false })
  assert.equal(restatement.ok, false)
  assert.equal(restatement.misconception, undefined, 'a missed restatement carries no misconception tag')
  for (const bad of [{ s1: true }, { s1: true, s2: false, s3: 'no' }, ['s1'], 'true', { s1: true, s2: false, s3: false, s4: true }]) {
    assert.equal(gradeTrueFalsePart(tf, tfKey, bad as never).ungraded, 'outside-language', JSON.stringify(bad))
  }
})

test('combining parts: an ungraded part leaves the item ungraded; otherwise the first miss decides', () => {
  const ctx = { basis: 'Z3 5.3.1, equivalence over QF_LIA', engine: 'z3@5.3.1', bound: 'every state with a, x in [−4, 4]' }
  const ok = combineParts([gradeChoicePart(choice, choiceKey, 'A')], ctx)
  assert.deepEqual({ ok: ok.ok, basis: ok.basis, bound: ok.bound, engine: ok.engine }, { ok: true, ...ctx })
  const missed = combineParts([gradeChoicePart(choice, choiceKey, 'A'), gradeTrueFalsePart(tf, tfKey, { s1: true, s2: false, s3: true })], ctx)
  assert.equal(missed.ok, false)
  assert.equal(missed.misconception, 'dp:Z2')
  const ungraded = combineParts([gradeChoicePart(choice, choiceKey, 'B'), gradeChoicePart(choice, choiceKey, 'Z')], ctx)
  assert.equal(ungraded.ok, null)
  assert.equal(ungraded.ungraded, 'outside-language')
  assert.throws(() => combineParts([], ctx), /at least one part/)
})

test('ungraded grades say why, and count neither way', () => {
  assert.deepEqual(ungradedPart('w', { reason: 'incomplete', budget: false }), { part: 'w', ok: null, ungraded: 'unknown', why: COPY.ungradedUnknown })
  assert.equal(ungradedPart('w', { reason: 'canceled', budget: true }).ungraded, 'budget')
  assert.equal(ungradedGrade('unknown', { basis: 'b' }).why, COPY.ungradedUnknown)
  assert.equal(ungradedGrade('budget', { basis: 'b' }).why, COPY.ungradedBudget)
  assert.match(ungradedGrade('outside-language', { basis: 'b', summary: 'a query in QF_LIA' }).why, /a query in QF_LIA/)
  assert.equal(ungradedGrade('budget', { basis: 'b' }).ok, null)
})

const inst = (parts: InstanceBase['item']['parts']): InstanceBase => ({
  family: 'GEN-call-it',
  template: 't4',
  band: 2,
  seed: 1,
  kcs: { primary: 'KC-1.three-answers', secondary: [] },
  item: { stem: 'stem', parts },
})
const key: KeyBase = { engine: 'z3@5.3.1', choices: [choiceKey], statements: [tfKey] }

test('gradeItem grades choices and sets, hands constructed parts to the family, and refuses answers to parts it lacks', async () => {
  const both = inst([choice, tf])
  assert.equal((await gradeItem(both, { main: 'A', set: { s1: true, s2: false, s3: false } }, key, { basis: 'b' })).ok, true)
  assert.equal((await gradeItem(both, { main: 'A', set: { s1: true, s2: false, s3: false }, extra: 1 }, key, { basis: 'b' })).ungraded, 'outside-language')
  for (const bad of [null, 'A', ['A']]) assert.equal((await gradeItem(both, bad as never, key, { basis: 'b' })).ungraded, 'outside-language', JSON.stringify(bad))
  const g = await gradeItem(both, { main: 'C', set: { s1: true, s2: false, s3: false } }, key, { basis: 'b' })
  assert.deepEqual({ ok: g.ok, tag: g.misconception, response: g.response }, { ok: false, tag: 'dp:Z1', response: { main: 'C', set: { s1: true, s2: false, s3: false } } })
  const constructed = inst([{ kind: 'constructed', id: 'w', prompt: 'A witness.', language: { name: 'state', summary: 'integer values for a and x' } }])
  await assert.rejects(gradeItem(constructed, { w: 'a = 1' }, key, { basis: 'b' }), /constructed/)
  const graded = await gradeItem(constructed, { w: 'a = 1' }, key, { basis: 'b', constructed: async (part) => ({ part, ok: true, why: COPY.matched, witness: { a: 1 } }), class: { id: 'c', text: 'every overdraft' } })
  assert.deepEqual({ ok: graded.ok, witness: graded.witness, cls: graded.class?.id }, { ok: true, witness: { a: 1 }, cls: 'c' })
})

test('chance: 1 in k per choice, 1 in 2^m per true/false set, none with a constructed part', () => {
  assert.deepEqual(chanceOf(inst([choice]).item), { oneIn: 3 })
  assert.deepEqual(chanceOf(inst([tf]).item), { oneIn: 8 })
  assert.deepEqual(chanceOf(inst([choice, tf]).item), { oneIn: 24 })
  assert.equal(chanceOf(inst([choice, { kind: 'constructed', id: 'w', prompt: 'p', language: { name: 'n', summary: 's' } }]).item), 'none')
})
