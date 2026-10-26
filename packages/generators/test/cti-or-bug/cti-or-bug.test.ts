import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { ChoicePart } from '../../src/core/index.ts'
import { classify, CTI_BOX, CTI_BOX_VERSION, ctiBoxPort, generator, ports } from '../../src/cti-or-bug/index.ts'
import type { CtiOrBugInstance } from '../../src/cti-or-bug/index.ts'
import { and, consecution, evaluate, num, reach, rel, stepsFrom, sum, term } from '../../src/cti-or-bug/system.ts'
import type { Command, System } from '../../src/cti-or-bug/system.ts'

const port = ports[CTI_BOX] as typeof ctiBoxPort

/** ASSESSMENT.md 4.7's worked example, with Debit's amount from 1 to xMax. */
function pendingSystem(t: number, xMax: number, clear: boolean): System {
  const debit: Command = {
    name: 'Debit',
    param: { v: 'x', lo: 1, hi: xMax },
    guard: and(rel(term('p'), '=', num(0)), rel(num(0), '<', term('x')), rel(term('x'), '<=', term('a'))),
    updates: [
      { v: 'a', e: { coefs: [{ v: 'a', c: 1 }, { v: 'x', c: -1 }], k: 0 } },
      { v: 'p', e: term('x') },
    ],
  }
  const credit: Command = { name: 'Credit', guard: rel(term('p'), '>', num(0)), updates: [{ v: 'b', e: sum(['b', 'p']) }, ...(clear ? [{ v: 'p', e: num(0) }] : [])] }
  return { vars: ['a', 'b', 'p'], init: { a: t, b: 0, p: 0 }, commands: [debit, credit] }
}

test('hand-worked (T = 100): (100, 0, 1) is a CTI of a + b ≤ 100, unreachable, and the strengthening is inductive', () => {
  const sys = pendingSystem(100, 100, true)
  const inv = rel(sum(['a', 'b']), '<=', num(100))
  // Credit from (100, 0, 1) reaches (100, 1, 0), where a + b = 101.
  const pre = { a: 100, b: 0, p: 1 }
  assert.equal(evaluate(inv, pre), true)
  const credit = stepsFrom(sys, pre).find((s) => s.command === 'Credit')
  assert.deepEqual(credit?.to, { a: 100, b: 1, p: 0 })
  assert.equal(evaluate(inv, credit?.to ?? pre), false)
  // Every reachable state satisfies Inv (the search runs to the end), so the counterexample is unreachable.
  const r = reach(sys, inv, 1000, 100_000)
  assert.equal(r.kind, 'exhausted')
  // The certificate: Inv ∧ a + b + p ≤ 100 has no counterexample to induction, near the reachable states at least.
  const small = pendingSystem(6, 6, true)
  const star = and(rel(sum(['a', 'b']), '<=', num(6)), rel(sum(['a', 'b', 'p']), '<=', num(6)))
  assert.equal(consecution(small, star, { lo: -1, hi: 7 }), null)
  assert.notEqual(consecution(small, rel(sum(['a', 'b']), '<=', num(6)), { lo: -1, hi: 7 }), null)
})

test('hand-worked pair member: Credit that leaves p uncleared breaks a + b ≤ T in 3 actions', () => {
  const sys = pendingSystem(100, 1, false)
  const r = reach(sys, rel(sum(['a', 'b']), '<=', num(100)), 8, 100_000)
  assert.equal(r.kind, 'violated')
  if (r.kind !== 'violated') return
  assert.deepEqual(
    r.trace.map((s) => s.command),
    ['Debit', 'Credit', 'Credit'],
  )
  assert.deepEqual(r.state, { a: 99, b: 2, p: 1 })
})

test('the CTI box port refuses what it does not run', async () => {
  const sys = pendingSystem(3, 1, true)
  await assert.rejects(port.run({ engine: 'z3', version: CTI_BOX_VERSION, input: { op: 'reach', sys, inv: rel(term('a'), '>=', num(0)), depth: 1 }, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'unknown-engine')
  await assert.rejects(port.run({ engine: CTI_BOX, version: CTI_BOX_VERSION, input: { op: 'prove' }, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'invalid-input')
  const r = await port.run({ engine: CTI_BOX, version: CTI_BOX_VERSION, input: { op: 'consecution', sys, inv: rel(term('a'), '>=', num(0)), box: { lo: 0, hi: 99 } }, budget: { wallMs: 1, maxStates: 100 } })
  assert.equal(r.verdict.kind, 'unknown')
})

test('every template and band: the checker reaches the template verdict, t3 at its designed depth, t2 with its strengthening', async () => {
  const want = { t1: 'inductive', t2: 'cti', t3: 'reachable' } as const
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 30; seed++) {
        const inst = generator.make(seed * 7_919, band, t.id) as CtiOrBugInstance
        const m = generator.measure(inst)
        for (const [axis, [lo, hi]] of Object.entries(t.bands[band])) assert.ok((m[axis] as number) >= lo && (m[axis] as number) <= hi, `${t.id} b${band} ${axis} ${m[axis]}`)
        const found = await classify(inst, port)
        assert.ok(!('discard' in found), `${t.id} b${band} seed ${seed}: ${'discard' in found ? found.discard : ''}`)
        if ('discard' in found) continue
        assert.equal(found.verdict, want[t.id as keyof typeof want], `${t.id} b${band} seed ${seed}`)
        const { sys, inv } = inst.data
        if (t.id === 't3') {
          const r = reach(sys, inv, 8, 20_000)
          assert.equal(r.kind, 'violated')
          if (r.kind === 'violated') assert.equal(r.trace.length, inst.data.depth, `${t.id} b${band} seed ${seed}: designed depth`)
        } else {
          assert.equal(reach(sys, inv, 64, 20_000).kind, 'exhausted')
        }
        if (t.id === 't2') {
          const star = and(inv, ...(inst.data.strengthen ?? []))
          assert.equal(evaluate(star, sys.init), true)
          assert.equal(consecution(sys, star, inst.data.box), null)
          assert.notEqual(consecution(sys, inv, inst.data.box), null)
        }
        const key = await generator.key(inst, port)
        assert.ok(!isDiscard(key))
        if (isDiscard(key)) continue
        const part = inst.item.parts[0] as ChoicePart
        assert.equal(part.options.length, 3)
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, key, port)
          if (o.origin.kind === 'reference') assert.equal(g.ok, true)
          else {
            assert.equal(g.ok, false)
            assert.equal(g.misconception, o.origin.tag)
            // The witness on a miss is the key's certificate: a CTI state, a run, or the two checks that held.
            assert.equal(typeof g.witness, 'object')
            assert.ok(!('value' in (g.witness as object)))
          }
        }
      }
    }
  }
})
