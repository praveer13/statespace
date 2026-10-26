import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { codeText, stampText } from '@statespace/stamps'
import { BANDS, drawInstance, isDiscard } from '../../src/core/index.ts'
import type { ChoicePart } from '../../src/core/index.ts'
import { deriveView, generator, ports, RECORDED, segmentOf } from '../../src/which-stamp/index.ts'
import { rawOf } from '../../src/which-stamp/deriver.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]
const fixtures = JSON.parse(readFileSync(new URL('../../../../content/generators/GEN-which-stamp/fixtures.json', import.meta.url), 'utf8')) as { fixtures: { id: string; run: string; lines: string[]; key: string }[] }

test('every recorded output quotes its fixture exactly, and the deriver gives the fixture key GATE-stamps checks', () => {
  assert.equal(RECORDED.length, fixtures.fixtures.length)
  for (const o of RECORDED) {
    const f = fixtures.fixtures.find((x) => x.id === `t1-${o.id}`)
    assert.ok(f, o.id)
    assert.deepEqual(o.lines, f?.lines)
    assert.equal(o.run, f?.run)
    const v = deriveView(o)
    const key = f?.key ?? ''
    if (v.kind === 'stamp') assert.ok(key.endsWith(v.text.slice(4)) && (key === v.text || key.includes(v.code)), `${o.id}: ${key} vs ${v.text}`)
    else if (v.kind === 'modulo') assert.equal(key, v.text)
    else assert.equal(key, `none (${v.reason})`)
  }
})

test('hand-worked derivations: the DoubleSpend deadlock stop is [?] at 10 distinct states, the RTW3 trace 6 actions, the guard unsat [P] uncertified', () => {
  const by = (id: string) => deriveView(RECORDED.find((o) => o.id === id)!)
  assert.deepEqual(by('tlc-doublespend-deadlock'), { kind: 'stamp', code: '[?]', qualifier: ['stopped at deadlock, 10 distinct states'], text: '[?] · stopped at deadlock, 10 distinct states', raw: 'tlc-deadlock', segment: 'proposition' })
  assert.equal(by('tlc-rtw3-violation').kind === 'stamp' && by('tlc-rtw3-violation').text, '[R] · 6 actions (7 states)')
  assert.equal(by('z3-guard-unsat').kind === 'stamp' && by('z3-guard-unsat').text, '[P] · Z3 5.3.1 unsat · uncertified')
  assert.equal(by('lean-sorry').text, 'PROVED modulo 1 assumed lemma')
  assert.equal(segmentOf(rawOf(RECORDED.find((o) => o.id === 'trace-validation-safety')!).kind), 'correspondence')
  assert.equal(typeof stampText, 'function')
  assert.equal(typeof codeText, 'function')
})

test('every template and band: the deriver keys the reference, and each wrong stamp misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 15; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 65537, band, template: t.id })
        assert.equal(out.status, 'drawn')
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
          assert.equal(g.ok, o.origin.kind === 'reference', `${t.id} b${band}: ${o.text}`)
          if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
        }
      }
    }
  }
})
