import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { ChoicePart, TemplateId } from '../../src/core/index.ts'
import { applyOps, baseLedger, baseSpec, check, DEFEND_BOX, DEFEND_BOX_VERSION, defendBoxPort, designsOf, generator, ports } from '../../src/defend/index.ts'
import type { DefendInstance } from '../../src/defend/index.ts'

const port = ports[DEFEND_BOX] as typeof defendBoxPort

test('the unmutated artifacts pass', () => {
  assert.deepEqual(check(baseLedger()), { verdict: 'passes' })
  for (const [init, amount] of [
    [3, 2],
    [3, 3],
    [4, 3],
    [5, 3],
    [5, 5],
  ] as const)
    assert.deepEqual(check(baseSpec(init, amount)), { verdict: 'passes' })
})

test("hand-worked (S1 Prove-it, revision 3's note 8): tightening ≤ to < cannot overdraw, and fails the sufficient-funds check", () => {
  const out = check(applyOps(baseLedger(), ['le-to-lt']))
  assert.equal(out.verdict, 'rejects')
  if (out.verdict !== 'rejects') return
  assert.equal(out.locus, 'exact-guard')
  // The witness is a transfer of the whole balance, which the requirement admits and the tightened guard refuses.
  assert.equal(out.witness.amount, out.witness.a)
})

test('hand-worked: BitVec 4 wraps the recipient (7 + 1 reads as −8)', () => {
  const out = check(applyOps(baseLedger(), ['to-bv4']))
  assert.equal(out.verdict, 'rejects')
  if (out.verdict !== 'rejects') return
  assert.equal(out.locus, 'recipient-nonneg')
  assert.ok((out.witness.b as number) + (out.witness.amount as number) > 7)
  assert.ok((out.witness["b'"] as number) < 0)
})

test('hand-worked: the split withdrawal overspends after Read, Read, Write, Write', () => {
  const out = check(applyOps(baseSpec(5, 3), ['split']))
  assert.equal(out.verdict, 'rejects')
  if (out.verdict !== 'rejects') return
  assert.equal(out.locus, 'NoOverspend')
  assert.equal(out.witness.spent, 6)
  assert.equal(out.witness.bal, 2)
  assert.equal(String(out.witness.run).split(' → ').length, 4)
})

test('every design: the checker agrees with the prediction worked out by hand', () => {
  for (const t of ['t1', 't2', 't3', 't4'] as TemplateId[]) {
    const designs = designsOf(t)
    assert.ok(designs.length >= 4, t)
    const bases = t === 't4' ? [baseSpec(3, 2), baseSpec(3, 3), baseSpec(4, 3), baseSpec(4, 4), baseSpec(5, 3), baseSpec(5, 4), baseSpec(5, 5)] : [baseLedger()]
    for (const d of designs) {
      for (const base of bases) {
        const out = check(applyOps(base, d.ops))
        const label = `${t} ${d.ops.join('+')} on ${JSON.stringify(base.kind === 'spec' ? [base.init, base.amount] : 'ledger')}`
        assert.equal(out.verdict, d.expect.verdict, label)
        if (out.verdict === 'rejects' && d.expect.verdict === 'rejects') assert.equal(out.locus, d.expect.locus, label)
      }
    }
  }
})

test('the defend box port refuses what it does not run', async () => {
  await assert.rejects(port.run({ engine: 'tlc', version: DEFEND_BOX_VERSION, input: { op: 'check', artifact: baseLedger() }, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'unknown-engine')
  await assert.rejects(port.run({ engine: DEFEND_BOX, version: DEFEND_BOX_VERSION, input: { op: 'check', artifact: { kind: 'lean' } }, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'invalid-input')
})

test('every template and band: keyed at grade time, in band, the reference matches and each wrong prediction misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 25; seed++) {
        const inst = generator.make(seed * 6_151, band, t.id) as DefendInstance
        const m = generator.measure(inst)
        for (const [axis, [lo, hi]] of Object.entries(t.bands[band])) assert.ok((m[axis] as number) >= lo && (m[axis] as number) <= hi, `${t.id} b${band} ${axis}`)
        const part = inst.item.parts[0] as ChoicePart
        assert.equal(part.options.length, band === 1 ? 3 : 4)
        assert.match(inst.item.stem, /This page cannot read your lab files/)
        const key = await generator.key(inst, port)
        assert.ok(!isDiscard(key), `${t.id} b${band} seed ${seed}`)
        if (isDiscard(key)) continue
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, key, port)
          if (o.origin.kind === 'reference') assert.equal(g.ok, true)
          else {
            assert.equal(g.ok, false)
            assert.equal(g.misconception, o.origin.tag)
          }
        }
      }
    }
  }
})
