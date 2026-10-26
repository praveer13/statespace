import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CLASS_ARMS, classHintPlan, fixKillsClass } from '../../src/core/index.ts'
import type { ArmReading, WitnessClass } from '../../src/core/index.ts'

const cls: WitnessClass = { id: 'overdraft', text: 'every transfer with amount > a' }
const witness = { a: 0, amount: 1, b: 0 }
const contrast: ArmReading = { applies: true, comparison: 'witness-generalization', arm: 'contrast-then-class', expSeed: 7 }
const named: ArmReading = { applies: true, comparison: 'witness-generalization', arm: 'class-named', expSeed: 7 }

test('the arms are the rules\' two, the default first', () => {
  assert.deepEqual(CLASS_ARMS, ['class-named', 'contrast-then-class'])
})

test('practice shows the witness and its class at once; a probe shows nothing until it is submitted', async () => {
  assert.deepEqual(await classHintPlan({ mode: 'practice', final: false, witness, class: cls }), {
    shown: true,
    steps: [
      { kind: 'witness', witness },
      { kind: 'class', class: cls, after: 'at-once' },
    ],
    armRecord: null,
  })
  assert.deepEqual(await classHintPlan({ mode: 'probe', final: false, witness, class: cls }), { shown: false, steps: [], armRecord: null })
  assert.equal((await classHintPlan({ mode: 'probe', final: true, witness, class: cls })).steps.length, 2)
})

test('the contrast arm: a second witness, an ungraded prompt, then the class after an answer or a skip', async () => {
  const second = { a: 3, amount: 7, b: 2 }
  const plan = await classHintPlan({ mode: 'practice', final: true, witness, class: cls, arm: contrast, second: async () => second })
  assert.deepEqual(
    plan.steps.map((s) => s.kind),
    ['witness', 'second-witness', 'compare', 'class'],
  )
  const compare = plan.steps[2]
  assert.ok(compare?.kind === 'compare' && compare.graded === false)
  const last = plan.steps[3]
  assert.ok(last?.kind === 'class' && last.after === 'answer-or-skip', 'neither arm is counterexample-only: the class always comes')
  assert.deepEqual(plan.armRecord, { comparison: 'witness-generalization', arm: 'contrast-then-class', expSeed: 7 })
})

test('when the second witness cannot be built, the default shows and the record says why', async () => {
  const plan = await classHintPlan({ mode: 'practice', final: true, witness, class: cls, arm: contrast, second: async () => null })
  assert.deepEqual(plan.steps.map((s) => s.kind), ['witness', 'class'])
  assert.match(plan.armRecord?.fallback ?? '', /no certified second witness/)
  const missing = await classHintPlan({ mode: 'practice', final: true, witness, class: cls, arm: contrast })
  assert.ok(missing.armRecord?.fallback)
})

test('the default arm records itself; probes keep one shot and the default in both arms', async () => {
  const plan = await classHintPlan({ mode: 'practice', final: true, witness, class: cls, arm: named })
  assert.equal(plan.steps.length, 2)
  assert.equal(plan.armRecord?.arm, 'class-named')
  let asked = false
  const probe = await classHintPlan({ mode: 'probe', final: true, witness, class: cls, arm: contrast, second: async () => ((asked = true), { a: 1 }) })
  assert.deepEqual(probe.steps.map((s) => s.kind), ['witness', 'class'])
  assert.equal(probe.armRecord, null)
  assert.equal(asked, false, 'a probe never builds the alternative')
  const note: ArmReading = { applies: true, comparison: 'misconception-note', arm: 'open', expSeed: 7 }
  assert.equal((await classHintPlan({ mode: 'practice', final: true, witness, class: cls, arm: note })).armRecord, null)
})

test('a fix must kill the witness shown and a non-minimal witness of its class', async () => {
  const killsBoth = await fixKillsClass({ kills: async () => true, shown: witness, nonMinimal: { a: 5, amount: 9, b: 1 } })
  assert.deepEqual(killsBoth, { ok: true, survivors: [] })
  const special = await fixKillsClass({ kills: async (w) => (w as { amount: number }).amount === 1, shown: witness, nonMinimal: { a: 5, amount: 9, b: 1 } })
  assert.deepEqual(special, { ok: false, survivors: [{ a: 5, amount: 9, b: 1 }] })
  assert.equal((await fixKillsClass({ kills: async () => 'unknown', shown: witness, nonMinimal: witness })).ok, null)
})
