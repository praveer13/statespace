import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, drawInstance, isDiscard } from '../../src/core/index.ts'
import type { ChoicePart } from '../../src/core/index.ts'
import { anyLeak, evaluateModel, explainingOrders, generator, leaks, maxOf, minimalAmount, ports, simulate, wrap } from '../../src/find-the-witness/index.ts'
import type { Observer } from '../../src/find-the-witness/engine.ts'
import { add, at, k, sub, vr } from '../../src/find-the-witness/model.ts'
import type { Model } from '../../src/find-the-witness/model.ts'
import { explore, replay } from '../../src/find-the-witness/workers.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]

/** ASSESSMENT.md section 4.6's worked example: signed 16-bit balances, guard 0 < x ∧ x ≤ a, transfer to b. */
const SP14: Model = {
  width: 16,
  vars: ['a', 'b', 'x'],
  guard: [at(k(0), '<', vr('x')), at(vr('x'), '<=', vr('a'))],
  step: { "a'": sub(vr('a'), vr('x')), "b'": add(vr('b'), vr('x')) },
  property: at(vr("b'"), '>=', k(0)),
}

test('ground evaluation agrees with the worked example: a = 1, b = 32767, x = 1 wraps the recipient to −32768', () => {
  assert.equal(maxOf(16), 32767n)
  assert.equal(wrap(32768n, 16), -32768n)
  assert.equal(wrap(-32769n, 16), 32767n)
  const e = evaluateModel(SP14, { a: '1', b: '32767', x: '1' })
  assert.deepEqual([e.inRange, e.guard, e.violates], [true, true, true])
  assert.equal(e.after["b'"], '-32768')
  // b + x lands exactly on the largest value: no wrap, the property holds.
  assert.equal(evaluateModel(SP14, { a: '1', b: '32766', x: '1' }).violates, false)
  // The guard refuses an amount over the sender's balance, wrap or not.
  assert.equal(evaluateModel(SP14, { a: '0', b: '32767', x: '1' }).guard, false)
  // A value outside the width is not a state of the model.
  assert.equal(evaluateModel(SP14, { a: '1', b: '32768', x: '1' }).inRange, false)
})

test('the smallest wrapping amount is 1, as SP-1.1 defines minimality', () => {
  assert.equal(minimalAmount(SP14, 'x'), 1n)
  assert.equal(minimalAmount({ ...SP14, width: 64 }, 'x'), 1n)
})

test('the workers graph: a read, check, debit split overspends in 6 actions; an atomic withdrawal never does', () => {
  const rtw = explore({ init: 100, amount: 80, workers: 2, steps: 3 }, 10000)
  assert.equal(rtw?.shortest?.length, 6)
  const atomic = explore({ init: 100, amount: 80, workers: 2, steps: 1 }, 10000)
  assert.equal(atomic?.shortest, null)
  // Hand-worked: both read and check 100 before either debits; 100 − 80 − 80 = −60.
  const trace = [
    { step: 'Read', worker: 1 },
    { step: 'Check', worker: 1 },
    { step: 'Read', worker: 2 },
    { step: 'Check', worker: 2 },
    { step: 'Debit', worker: 1 },
    { step: 'Debit', worker: 2 },
  ]
  const r = replay({ init: 100, amount: 80, workers: 2, steps: 3 }, trace)
  assert.ok(r.ok)
  assert.equal(r.ok ? r.states.at(-1)?.bal : 0, -60)
  // A debit before its check is not a step of the system.
  const bad = replay({ init: 100, amount: 80, workers: 2, steps: 3 }, [{ step: 'Read', worker: 1 }, { step: 'Debit', worker: 1 }])
  assert.deepEqual(bad, { ok: false, at: 1 })
})

test('the serial-order search: write skew has no serial order; a read of a committed write orders the two', () => {
  // T1 reads y, writes x; T2 reads x, writes y; both start before either commits: each reads 0.
  const skew = simulate(['x', 'y'], 0, [{ id: 'T1', reads: ['y'], writes: [{ key: 'x', value: 11 }] }, { id: 'T2', reads: ['x'], writes: [{ key: 'y', value: 21 }] }], [0, 1], [2, 3])
  assert.ok(skew)
  assert.deepEqual(explainingOrders(skew), [])
  // T2 starts after T1 commits, so it reads T1's write: only T1 → T2 explains it.
  const seq = simulate(['x', 'y'], 0, [{ id: 'T1', reads: ['y'], writes: [{ key: 'x', value: 11 }] }, { id: 'T2', reads: ['x'], writes: [{ key: 'y', value: 21 }] }], [0, 2], [1, 3])
  assert.ok(seq)
  assert.deepEqual(explainingOrders(seq), [['T1', 'T2']])
  // Two overlapping writers of one key are not drawn.
  assert.equal(simulate(['x'], 0, [{ id: 'T1', reads: [], writes: [{ key: 'x', value: 1 }] }, { id: 'T2', reads: [], writes: [{ key: 'x', value: 2 }] }], [0, 1], [2, 3]), null)
})

test('the paired-state evaluator: a status that reads the secret leaks; a pair that differs in public data is no witness', () => {
  const o: Observer = { publics: ['user'], secret: 's', body: ['user'], threshold: 1, domain: 2 }
  assert.deepEqual(leaks(o, { user: 0, s: 0 }, { user: 0, s: 1 }), { lowEquivalent: true, differ: true })
  assert.deepEqual(leaks(o, { user: 0, s: 0 }, { user: 1, s: 1 }), { lowEquivalent: false, differ: true })
  assert.equal(anyLeak(o), true)
  // A threshold no secret reaches: the status never changes, so nothing leaks.
  assert.equal(anyLeak({ ...o, threshold: 5 }), false)
})

test('every template and band: the pocket accepts exactly the reference, and each distractor misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 12; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 7919, band, template: t.id })
        assert.equal(out.status, 'drawn', `${t.id} b${band} ${seed}`)
        if (out.status !== 'drawn') continue
        const inst = out.instance
        const key = await generator.key(inst, port)
        assert.ok(!isDiscard(key))
        if (isDiscard(key)) continue
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal(key.choices[0]?.answer, ref?.id)
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, key, port)
          assert.equal(g.ok, o.origin.kind === 'reference')
          if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
          assert.ok(g.bound !== undefined && g.basis.includes('this page'))
        }
        const m = generator.measure(inst)
        for (const [axis, [lo, hi]] of Object.entries(t.bands[band])) assert.ok((m[axis] as number) >= lo && (m[axis] as number) <= hi, `${t.id} b${band} ${axis} ${m[axis]}`)
      }
    }
  }
})

test('make is deterministic and plain JSON', () => {
  for (const t of generator.templates) {
    const a = generator.make(42, 2, t.id)
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a)
    assert.deepEqual(generator.make(42, 2, t.id), a)
  }
})
