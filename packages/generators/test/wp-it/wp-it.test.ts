import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { ChoicePart } from '../../src/core/index.ts'
import { generator, ports, replaySentence, WP_BOX, WP_BOX_VERSION, wpBoxPort } from '../../src/wp-it/index.ts'
import type { WpItInstance } from '../../src/wp-it/index.ts'
import { decide } from '../../src/wp-it/engine.ts'
import type { Domain } from '../../src/wp-it/engine.ts'
import { addLin, all, and, evaluate, flag, idx, implies, inWp, num, rel, render, run, seq, set, setb, term, wp } from '../../src/wp-it/formula.ts'
import type { Cmd, Formula } from '../../src/wp-it/formula.ts'

const port = ports[WP_BOX] as typeof wpBoxPort
const ints = (vs: string[], lo: number, hi: number): Domain[] => vs.map((v) => ({ v, kind: 'int', lo, hi }))

/** The interpreter's verdict agrees with the formula on every state of the box. */
function agrees(cmd: Cmd, post: Formula, f: Formula, domains: Domain[]): boolean {
  return decide({ op: 'wp', cmd, post, formula: f, domains }, 100_000).verdict.kind === 'unsat'
}

test('hand-worked: wp(fee := fee + 2, fee ≤ 10) is fee + 2 ≤ 10, and the interpreter agrees', () => {
  const cmd = set('fee', term('fee', 2))
  const post = rel(term('fee'), '<=', num(10))
  const w = wp(cmd, post)
  assert.equal(render(w), 'fee + 2 ≤ 10')
  assert.equal(inWp(cmd, post, { fee: 8 }), true)
  assert.equal(inWp(cmd, post, { fee: 9 }), false)
  assert.ok(agrees(cmd, post, w, ints(['fee'], -5, 15)))
  // The copied postcondition is not the weakest precondition: fee = 9 tells them apart.
  assert.equal(agrees(cmd, post, post, ints(['fee'], -5, 15)), false)
})

test("ASSESSMENT.md 4.5's worked example: a := a − x; b := b + x; ok := (a ≥ 0), postcondition ok", () => {
  const cmds = [set('a', addLin(term('a'), term('x'), -1)), set('b', addLin(term('b'), term('x'))), setb('ok', rel(term('a'), '>=', num(0)))]
  const cmd = seq(...cmds)
  const post = flag('ok')
  const key = wp(cmd, post)
  assert.equal(render(key), 'a − x ≥ 0')
  const domains: Domain[] = [...ints(['a', 'x', 'b'], -10, 10), { v: 'ok', kind: 'flag' }]
  assert.ok(agrees(cmd, post, key, ints(['a', 'x', 'b'], -3, 3).concat([{ v: 'ok', kind: 'flag' }])))
  // Execution order gives a ≥ 0: at a = 0, x = 1 the postcondition fails, yet that option admits the state.
  const executionOrder = cmds.reduce((acc, c) => wp(c, acc), post as Formula)
  assert.equal(render(executionOrder), 'a ≥ 0')
  const s = { a: 0, x: 1, b: 0, ok: false }
  assert.equal(evaluate(executionOrder, s), true)
  assert.equal(inWp(cmd, post, s), false)
  // Stronger than needed: a = 5, x = 1, b = −10 ends with ok true, yet a − x ≥ 0 ∧ b + x ≥ 0 excludes it.
  const stronger = and(key, rel(addLin(term('b'), term('x')), '>=', num(0)))
  const t = { a: 5, x: 1, b: -10, ok: false }
  assert.equal(inWp(cmd, post, t), true)
  assert.equal(evaluate(stronger, t), false)
  assert.equal(domains.length, 4)
})

test('hand-worked capture: ∀k. bal[k] ≥ 0 after bal[k] := bal[k] − amt', () => {
  const over = [1, 2]
  const cmd: Cmd = { c: 'seta', arr: 'bal', ix: 'k', e: addLin(term('bal[k]'), term('amt'), -1) }
  const post = all('k', over, rel(term('bal[k]'), '>=', num(0)))
  const reference = and(rel(addLin(term('bal[k]'), term('amt'), -1), '>=', num(0)), all('j', over, implies(idx('j', '!=', 'k'), rel(term('bal[j]'), '>=', num(0)))))
  const captured = all('k', over, rel(addLin(term('bal[k]'), term('amt'), -1), '>=', num(0)))
  // Account 1 holds 0 and account 2 is debited 1 from 3: the debit is fine, and the captured formula still says no.
  const s = { 'bal[1]': 0, 'bal[2]': 3, k: 2, amt: 1 }
  assert.equal(inWp(cmd, post, s), true)
  assert.equal(evaluate(reference, s), true)
  assert.equal(evaluate(captured, s), false)
  const after = run(cmd, s)
  assert.deepEqual(after, { kind: 'ok', state: { 'bal[1]': 0, 'bal[2]': 2, k: 2, amt: 1 } })
  assert.ok(agrees(cmd, post, reference, [...ints(['bal[1]', 'bal[2]'], 0, 3), { v: 'k', kind: 'int', lo: 1, hi: 2 }, { v: 'amt', kind: 'int', lo: 0, hi: 3 }]))
})

test('guard readings: an assume that fails blocks (in wp), a requires that fails rejects (not in wp)', () => {
  const g = rel(term('x'), '<=', term('l'))
  const post = rel(term('a'), '>=', num(0))
  const debit = set('a', addLin(term('a'), term('x'), -1))
  const s = { a: 0, x: 3, l: 1 }
  assert.equal(inWp(seq({ c: 'assume', g }, debit), post, s), true)
  assert.equal(inWp(seq({ c: 'require', g }, debit), post, s), false)
  assert.equal(render(wp(seq({ c: 'assume', g }, debit), post)), 'x ≤ l → a − x ≥ 0')
  assert.equal(render(wp(seq({ c: 'require', g }, debit), post)), 'x ≤ l ∧ a − x ≥ 0')
})

test('the wp box port refuses what it does not run', async () => {
  const q = { op: 'differ', a: flag('ok'), b: flag('ok'), domains: [{ v: 'ok', kind: 'flag' }] }
  await assert.rejects(port.run({ engine: 'z3', version: WP_BOX_VERSION, input: q, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'unknown-engine')
  await assert.rejects(port.run({ engine: WP_BOX, version: '2', input: q, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'version-mismatch')
  const big = await port.run({ engine: WP_BOX, version: WP_BOX_VERSION, input: { ...q, domains: ints(['a', 'b', 'c', 'd'], 0, 99) }, budget: { wallMs: 1, maxStates: 10 } })
  assert.equal(big.verdict.kind, 'unknown')
})

test('every template and band: the checker confirms the reference, the measure is in band, and each distractor misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      let keyed = 0
      for (let seed = 1; seed <= 25; seed++) {
        const inst = generator.make(seed * 104_729, band, t.id) as WpItInstance
        const part = inst.item.parts[0] as ChoicePart
        assert.equal(part.options.length, 4)
        const m = generator.measure(inst)
        for (const [axis, [lo, hi]] of Object.entries(t.bands[band])) assert.ok((m[axis] as number) >= lo && (m[axis] as number) <= hi, `${t.id} b${band} ${axis} ${m[axis]}`)
        const key = await generator.key(inst, port)
        if (isDiscard(key)) {
          assert.match(key.discard, /equivalent/, `${t.id} b${band} seed ${seed}: ${key.discard}`)
          continue
        }
        keyed += 1
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal(key.choices[0]?.answer, ref?.id)
        // The reference is the generator's substitution, and the interpreter agrees with it on the whole box.
        assert.ok(agrees(inst.data.cmd, inst.data.post, inst.data.values[ref?.id ?? ''] as Formula, [...inst.data.domains]))
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, key, port)
          if (o.origin.kind === 'reference') assert.equal(g.ok, true)
          else {
            assert.equal(g.ok, false)
            assert.equal(g.misconception, o.origin.tag)
            assert.match(g.why, /Replayed from /)
            assert.match(g.bound ?? '', /^every state with /)
          }
        }
      }
      assert.ok(keyed >= 15, `${t.id} b${band}: only ${keyed} of 25 seeds keyed`)
    }
  }
})

test('a replay names the way an option is wrong', async () => {
  const inst = generator.make(7, 2, 't3') as WpItInstance
  const part = inst.item.parts[0] as ChoicePart
  const key = await generator.key(inst, port)
  assert.ok(!isDiscard(key))
  const assumeReading = part.options.find((o) => o.origin.kind === 'mutant' && o.origin.operator === 'the assume reading')
  assert.ok(assumeReading)
  // The assume reading admits a state the requires rejects.
  const d = key.choices[0]?.distinctions.find((x) => (x.a === assumeReading.id || x.b === assumeReading.id) && (x.a === key.choices[0]?.answer || x.b === key.choices[0]?.answer))
  assert.ok(d)
  assert.match(replaySentence(inst, assumeReading.id, d.witness as Record<string, number>) ?? '', /`requires` rejects it, yet your option admits the state/)
})
