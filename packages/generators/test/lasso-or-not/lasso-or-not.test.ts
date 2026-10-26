import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawInstance, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, EnginePort, KeyBase, TemplateId } from '../../src/core/index.ts'
import { findLasso, generator, holdGraph, judgeLasso, ports, RECORDED } from '../../src/lasso-or-not/index.ts'
import type { Fairness, LassoInstance } from '../../src/lasso-or-not/index.ts'

const port: EnginePort = { run: (req) => (ports[req.engine] as EnginePort).run(req) }
const WF = (action: Fairness['action']): Fairness => ({ kind: 'WF', action })
const SF = (action: Fairness['action']): Fairness => ({ kind: 'SF', action })

test('the Hold graph has the states TLC counted (RUN-tlc-hold-fairness)', () => {
  // 8 distinct states and 9 generated for Hold; 11 generated for HoldLive's widened Timeout (row r6).
  assert.deepEqual([holdGraph(RECORDED).distinct, holdGraph(RECORDED).generated], [8, 9])
  assert.deepEqual([holdGraph({ modulus: 2, widened: true }).distinct, holdGraph({ modulus: 2, widened: true }).generated], [8, 11])
})

test('"none" agrees with TLC on the six recorded fairness lines', () => {
  // RUN-tlc-hold-lasso: WF(Try) /\ WF(Busy) is violated by Try, Busy, Try, Busy back to state 1.
  assert.notEqual(findLasso(RECORDED, [WF('Try'), WF('Busy')]), null)
  assert.deepEqual(judgeLasso(RECORDED, [WF('Try'), WF('Busy')], { stem: [], cycle: ['Try', 'Busy', 'Try', 'Busy'] }), { ok: true })
  // RUN-tlc-hold-fairness rows: r1 no fairness (violated), r3 + WF(Capture) (violated), r4 + SF(Capture) (no error),
  // r5 WF(Try) /\ SF(Timeout) (violated by Try, then stuttering), r6 HoldLive with WF(Timeout) (no error).
  assert.notEqual(findLasso(RECORDED, []), null)
  assert.notEqual(findLasso(RECORDED, [WF('Try'), WF('Busy'), WF('Capture')]), null)
  assert.equal(findLasso(RECORDED, [WF('Try'), WF('Busy'), SF('Capture')]), null)
  assert.deepEqual(findLasso(RECORDED, [WF('Try'), SF('Timeout')]), { stem: ['Try'], cycle: [] })
  assert.equal(findLasso({ modulus: 2, widened: true }, [WF('Timeout')]), null)
})

test('the validator, worked by hand', () => {
  const lasso = { stem: [], cycle: ['Try', 'Busy', 'Try', 'Busy'] }
  // SF(Capture): Capture is enabled in pending, in the cycle, and never taken.
  assert.deepEqual(judgeLasso(RECORDED, [SF('Capture')], lasso), { ok: false, why: 'unfair', condition: SF('Capture') })
  // WF(Capture): Capture is not enabled in held, so the cycle escapes weak fairness.
  assert.deepEqual(judgeLasso(RECORDED, [WF('Capture')], lasso), { ok: true })
  // Stuttering in held under WF(Try): Try is enabled throughout and never taken.
  assert.deepEqual(judgeLasso(RECORDED, [WF('Try')], { stem: [], cycle: [] }), { ok: false, why: 'unfair', condition: WF('Try') })
  assert.deepEqual(judgeLasso(RECORDED, [], { stem: ['Try', 'Capture'], cycle: [] }), { ok: false, why: 'resolves', state: 'captured' })
  assert.deepEqual(judgeLasso(RECORDED, [], { stem: ['Busy'], cycle: [] }), { ok: false, why: 'not-a-behavior', at: 1 })
  assert.deepEqual(judgeLasso(RECORDED, [], { stem: [], cycle: ['Try', 'Busy'] }), { ok: false, why: 'no-close' }, 'tries is 1 after one Try')
})

test('every template and band: the checker confirms the reference and every distractor misses with its tag', async () => {
  for (const t of ['t1', 't2'] as TemplateId[]) {
    for (const band of [1, 2, 3] as Band[]) {
      for (let seed = 1; seed <= 15; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 104729, band, template: t })
        assert.equal(out.status, 'drawn', `${t} b${band} seed ${seed}`)
        if (out.status !== 'drawn') continue
        const inst = out.instance as LassoInstance
        assert.deepEqual(generator.make(inst.seed, band, t), inst)
        const k = await generator.key(inst, port)
        assert.ok(!isDiscard(k))
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal((k as KeyBase).choices[0]?.answer, ref?.id)
        // t1's key is a lasso, t2's is "none", decided independently of the instance's reference.
        assert.equal(findLasso(inst.data.model, inst.data.fairness) === null, t === 't2')
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, k as never, port)
          assert.equal(g.ok, o.origin.kind === 'reference')
          if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
        }
      }
    }
  }
})
