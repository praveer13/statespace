import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawInstance, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, EnginePort, KeyBase, TemplateId } from '../../src/core/index.ts'
import { findLeak, generator, judgePair, lowEq, observe, ports } from '../../src/leaks-to-observer/index.ts'
import type { LeaksInstance, World } from '../../src/leaks-to-observer/index.ts'

const port: EnginePort = { run: (req) => (ports[req.engine] as EnginePort).run(req) }

/** ASSESSMENT.md 4.11's worked example: d of B shared with u of A; title and body released, note private to B. */
function shared(view: readonly string[]): World {
  return {
    cells: [
      { name: 'd.title', values: ['t1', 't2'], low: true },
      { name: 'd.body', values: ['b1', 'b2'], low: true },
      { name: 'd.note', values: ['n1', 'n2'], low: false },
    ],
    channels: view.map((f) => ({ name: f, expr: { c: `d.${f}` }, seen: true })),
  }
}

const base = { 'd.title': 't1', 'd.body': 'b1', 'd.note': 'n1' }

test('the worked example: {title, body, note} leaks note; the projection {title, body} leaks nothing in the scope', () => {
  const leaky = shared(['title', 'body', 'note'])
  assert.deepEqual(judgePair(leaky, { base, diff: { 'd.note': ['n1', 'n2'] } }), { ok: true, channel: 'note' })
  assert.notEqual(findLeak(leaky), null)
  const fixed = shared(['title', 'body'])
  assert.equal(findLeak(fixed), null)
  assert.deepEqual(judgePair(fixed, { base, diff: { 'd.note': ['n1', 'n2'] } }), { ok: false, why: 'indistinguishable' })
  // A pair in a released field is not low-equivalent, whatever the view shows.
  assert.deepEqual(judgePair(leaky, { base, diff: { 'd.title': ['t1', 't2'] } }), { ok: false, why: 'not-low-equivalent', cell: 'd.title' })
})

test('a count channel: a total over every document tells u whether a document it cannot see exists', () => {
  const w = (counted: readonly string[]): World => ({
    cells: [
      { name: 'a1.exists', values: [true, false], low: true },
      { name: 'b1.exists', values: [true, false], low: false },
    ],
    channels: [
      { name: 'hits', expr: { ids: [{ cell: 'a1.exists', id: 'a1' }] }, seen: true },
      { name: 'total', expr: { count: counted }, seen: true },
    ],
  })
  const all = w(['a1.exists', 'b1.exists'])
  const s1 = { 'a1.exists': true, 'b1.exists': true }
  const s2 = { 'a1.exists': true, 'b1.exists': false }
  assert.equal(lowEq(all, s1, s2), true)
  assert.notEqual(observe(all, s1), observe(all, s2), 'total is 2 in s1 and 1 in s2')
  assert.equal(findLeak(w(['a1.exists'])), null, 'counting only what u can see leaks nothing')
})

test('an observer that sees aborts tells apart what a body-only observer cannot', () => {
  const w = (seen: boolean): World => ({
    cells: [{ name: 'b.plan.exists', values: [true, false], low: false }],
    channels: [
      { name: 'body', expr: { k: 'ok' }, seen: true },
      { name: 'insert outcome', expr: { ifc: 'b.plan.exists', then: { k: 'unique-constraint error' }, else: { k: 'ok' } }, seen },
    ],
  })
  assert.notEqual(findLeak(w(true)), null)
  assert.equal(findLeak(w(false)), null)
})

test('every template and band: the checker confirms the reference and every distractor misses with its tag', async () => {
  let none = 0
  let pairs = 0
  for (const t of ['t1', 't2', 't3'] as TemplateId[]) {
    for (const band of [1, 2, 3] as Band[]) {
      for (let seed = 1; seed <= 12; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 7368787, band, template: t })
        assert.equal(out.status, 'drawn')
        if (out.status !== 'drawn') continue
        const inst = out.instance as LeaksInstance
        assert.deepEqual(generator.make(inst.seed, band, t), inst)
        const k = await generator.key(inst, port)
        assert.ok(!isDiscard(k))
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal((k as KeyBase).choices[0]?.answer, ref?.id)
        if (ref !== undefined && inst.data.values[ref.id]?.kind === 'none') none++
        else pairs++
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, k as never, port)
          assert.equal(g.ok, o.origin.kind === 'reference')
          if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
          assert.match(g.bound ?? '', /every state of the printed scope/)
        }
      }
    }
  }
  assert.ok(none > 20 && pairs > 20, `both keys occur: ${none} none, ${pairs} pairs`)
})
