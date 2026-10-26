import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, drawInstance, isDiscard, liveTemplates } from '../../src/core/index.ts'
import type { ChoicePart, TrueFalsePart } from '../../src/core/index.ts'
import { explore, generator, judge, ports, POW_REASON, predict, THEOREMS } from '../../src/call-it/index.ts'
import { and, minus, n, not, pow, rel, v } from '../../src/call-it/logic.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]
const box = (...vars: string[]) => vars.map((x) => ({ v: x, lo: 0, hi: 4 }))
const P = rel(minus('a', 'x'), '>=', n(0))

test('three-way verdicts, hand-worked: the guard x ≤ a makes the violation unsat; no guard is sat at a = 0, x = 1; the power query is unknown', () => {
  assert.deepEqual(predict(and(rel(v('x'), '<=', v('a')), not(P)), box('a', 'x')), { answer: 'unsat' })
  assert.deepEqual(predict(and(not(P)), box('a', 'x')), { answer: 'sat', witness: { a: 0, x: 1 } })
  // x ≤ a + 1 lets x = a + 1 through: the first state in order is a = 0, x = 1.
  assert.deepEqual(predict(and(rel(v('x'), '<=', { lin: [{ v: 'a', c: 1 }], k: 1 }), not(P)), box('a', 'x')), { answer: 'sat', witness: { a: 0, x: 1 } })
  // SP-1.7: Z3 5.3.1 answers unknown, incomplete (theory arithmetic) [X RUN-z3-unknown-pow].
  assert.deepEqual(predict(and(rel(pow('x', 'y'), '=', n(8)), rel(v('y'), '>', n(1))), []), { answer: 'unknown', reason: POW_REASON })
})

test('trace length: two workers with read, check, debit overspend in 6 actions; with check, debit in 4', () => {
  assert.equal(explore({ init: 100, amount: 80, workers: 2, steps: 3 }, 10000)?.shortest?.length, 6)
  assert.equal(explore({ init: 100, amount: 80, workers: 2, steps: 2 }, 10000)?.shortest?.length, 4)
  assert.equal(explore({ init: 100, amount: 40, workers: 3, steps: 3 }, 10000)?.shortest?.length, 9)
})

test('the readings agree with ASSESSMENT.md section 4.12 worked example: two restatements true, three sentences false', () => {
  const th = THEOREMS.find((t) => t.id === 'transfer_nonneg')
  assert.ok(th)
  const truth = Object.fromEntries((th?.statements ?? []).map((s) => [s.id, 'same' in judge(th!.reading, s.reading)]))
  assert.deepEqual(truth, { 'nn-t1': true, 'nn-t2': true, 'nn-t3': true, 'nn-f1': false, 'nn-f2': false, 'nn-f3': false, 'nn-f4': false, 'nn-f5': false })
  // Dropping ha and hb fails under the definition itself (a = −1 is refused and stays −1).
  const f1 = judge(th!.reading, th!.statements.find((s) => s.id === 'nn-f1')!.reading)
  assert.ok(!('same' in f1) && f1.differs.id === 'definition')
  // ∃ for ∀ agrees with the theorem under the definition; it takes a transfer with no guard to tell them apart.
  const f3 = judge(th!.reading, th!.statements.find((s) => s.id === 'nn-f3')!.reading)
  assert.ok(!('same' in f3) && f3.differs.id === 'unguarded')
  for (const t of THEOREMS) for (const s of t.statements) assert.equal('same' in judge(t.reading, s.reading), s.meant === true, s.id)
})

test('every live template and band: the key is the reference, distractors miss with their tag, a true/false set counts only when every mark matches', async () => {
  assert.deepEqual(
    generator.templates.filter((t) => t.pending !== undefined).map((t) => t.id),
    ['t3'],
  )
  for (const t of liveTemplates(generator)) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 10; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 104729, band, template: t.id })
        assert.equal(out.status, 'drawn')
        if (out.status !== 'drawn') continue
        const inst = out.instance
        const key = await generator.key(inst, port)
        assert.ok(!isDiscard(key))
        if (isDiscard(key)) continue
        const part = inst.item.parts[0]
        if (part?.kind === 'choice') {
          const ref = (part as ChoicePart).options.find((o) => o.origin.kind === 'reference')
          assert.equal(key.choices[0]?.answer, ref?.id)
          for (const o of (part as ChoicePart).options) {
            const g = await generator.grade(inst, { main: o.id }, key, port)
            assert.equal(g.ok, o.origin.kind === 'reference')
            if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
          }
        } else {
          const tf = part as TrueFalsePart
          const truth = key.statements[0]?.truth ?? {}
          const trues = tf.statements.filter((s) => truth[s.id]).length
          assert.ok(trues >= 1 && trues <= tf.statements.length - 1, 'between 1 and m − 1 true statements')
          assert.equal((await generator.grade(inst, { main: { ...truth } }, key, port)).ok, true)
          const first = tf.statements[0]!
          const g = await generator.grade(inst, { main: { ...truth, [first.id]: !truth[first.id] } }, key, port)
          assert.equal(g.ok, false)
          if (band === 3) assert.equal(inst.data.readings?.swaps, 2)
        }
      }
    }
  }
})
