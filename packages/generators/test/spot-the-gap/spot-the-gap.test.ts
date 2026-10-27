import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, TemplateId } from '../../src/core/index.ts'
import { AND, B, decide, fairLasso, GAP_CHECK_MAX_STATES, holds, IMP, K, M, NOT, R, V, wrap } from '../../src/spot-the-gap/engine.ts'
import type { FairCase, Finding, GapCase } from '../../src/spot-the-gap/engine.ts'
import { CLASSES, generator, ports } from '../../src/spot-the-gap/index.ts'
import type { SpotTheGapInstance, SpotTheGapKey } from '../../src/spot-the-gap/index.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]
const audit = (c: GapCase): Finding => decide({ op: 'audit', case: c }, GAP_CHECK_MAX_STATES).witness as Finding

const a = V('a')
const x = V('x')
const doms = [
  { v: 'a', lo: -2, hi: 6 },
  { v: 'x', lo: -2, hi: 6 },
]

test('AUD-1.1, the worked example: a contradictory hypothesis is G2, anchored to the two lines that cannot hold together', () => {
  const premises = [R(a, '>=', K(0)), R(x, '>', K(0)), R(x, '<=', a), R(a, '<', x)].map((f, i) => ({ n: i + 1, x: f }))
  const f = audit({ kind: 'query', doms, premises, violation: R(M(a, x), '<', K(0)) })
  assert.deepEqual(f.classes, ['G2'])
  assert.equal(f.evidence['conflicting lines'], '3 and 4')
  // The sound pair member: the same claim without the contradictory line, with a premise witness.
  const sound = audit({ kind: 'query', doms, premises: premises.slice(0, 3), violation: R(M(a, x), '<', K(0)) })
  assert.deepEqual(sound.classes, ['none'])
  assert.ok(sound.premise !== undefined && premises.slice(0, 3).every((p) => holds(p.x, sound.premise as Record<string, number>)))
})

test('AUD-2.1 and AUD-7.2: the direction of the scenario decides between G1 and G12', () => {
  const c = V('c')
  const m = V('m')
  const r = V('r')
  const box = [
    { v: 'c', lo: 0, hi: 3 },
    { v: 'm', lo: 0, hi: 3 },
    { v: 'r', lo: 0, hi: 3 },
  ]
  const both = AND(R(c, '>=', K(0)), R(M(m, r), '>=', K(0)))
  const weak = audit({ kind: 'scenario', doms: box, system: R(r, '>=', K(0)), statement: R(c, '>=', K(0)), requirement: both })
  assert.deepEqual(weak.classes, ['G1'])
  assert.match(Object.values(weak.evidence)[0] as string, /m = 0, r = 1/, 'a refund larger than the merchant balance')
  const flags = [
    { v: 'cross', flag: true as const },
    { v: 'shared', flag: true as const },
    { v: 'sees', flag: true as const },
  ]
  const allowed = IMP(AND(B('sees'), B('cross')), B('shared'))
  const blanket = audit({ kind: 'scenario', doms: flags, system: allowed, statement: NOT(AND(B('sees'), B('cross'))), requirement: allowed })
  assert.deepEqual(blanket.classes, ['G12'])
  assert.match(Object.values(blanket.evidence)[0] as string, /cross = true, shared = true, sees = true/)
})

test('AUD-1.2: 8-bit wrap-around is G4 under an Int model and sound under the code\'s own width with a guard', () => {
  assert.equal(wrap(127 + 1, 8), -128)
  assert.equal(wrap(-129, 8), 127)
  assert.equal(wrap(5, 8), 5)
  const bad = audit({ kind: 'width', bits: 8, guard: R(x, '>', K(0)), model: 'int' })
  assert.deepEqual(bad.classes, ['G4'])
  const b = V('b')
  const good = audit({ kind: 'width', bits: 8, guard: AND(R(x, '>', K(0)), R(b, '<=', M(K(127), x))), model: 'bits' })
  assert.deepEqual(good.classes, ['none'])
})

test('AUD-5.2: fairness on the environment\'s action hides a cycle that never releases (G7)', () => {
  const actions: FairCase['actions'] = [
    { name: 'Hold', owner: 'system', from: { hold: false, paid: false }, to: { hold: true, paid: false } },
    { name: 'Pay', owner: 'environment', from: { hold: true, paid: false }, to: { hold: true, paid: true } },
    { name: 'Release', owner: 'system', from: { hold: true, paid: true }, to: { hold: false, paid: false } },
  ]
  const c: FairCase = { kind: 'fair', actions, fair: ['Pay', 'Release'], names: { hold: 'hold', paid: 'payment' } }
  assert.equal(fairLasso(c, ['Pay', 'Release']), null, 'under the claim\'s fairness, every hold is released')
  assert.match(fairLasso(c, ['Release']) ?? '', /hold held, payment no, then nothing happens, forever/)
  assert.deepEqual(audit(c).classes, ['G7'])
  const expire = { name: 'Expire', owner: 'system' as const, from: { hold: true, paid: false }, to: { hold: false, paid: false } }
  assert.deepEqual(audit({ ...c, actions: [...actions, expire], fair: ['Release', 'Expire'] }).classes, ['none'])
})

test('AUD-2.4, AUD-7.1, AUD-4.3: mismatched identifiers, a weak observer, and a CTI answered by code', () => {
  const pinned = 'theorem t (s : Ledger) : total (transfer s) = total s'
  const drift = audit({ kind: 'idents', pinned, proved: "theorem t (s : Ledger) : total (transfer' s) = total s" })
  assert.deepEqual(drift.classes, ['G8'])
  assert.equal(drift.evidence['pinned / proved'], "transfer / transfer'")
  assert.deepEqual(audit({ kind: 'idents', pinned, proved: pinned.replace(' :', '\n  :') }).classes, ['none'])

  const leak = audit({ kind: 'observer', fields: [{ name: 'body', secret: false }, { name: 'X-Total-Count', secret: true }], observer: ['body'], max: 2 })
  assert.deepEqual(leak.classes, ['G10'])
  assert.equal(leak.evidence['state 1'], 'a = 0, s = 0')
  assert.equal(leak.evidence['state 2'], 'a = 0, s = 1')

  const cti = { kind: 'cti' as const, doms: [{ v: 'x', lo: -2, hi: 6 }, { v: 'y', lo: -2, hi: 2 }], init: { x: 0, y: 1 }, property: R(V('x'), '>=', K(0)), cti: { x: 0, y: -1 }, strengthen: R(V('y'), '>=', K(0)) }
  assert.deepEqual(audit({ ...cti, change: 'code' }).classes, ['G13'])
  assert.deepEqual(audit({ ...cti, change: 'invariant' }).classes, ['none'])
  assert.deepEqual(audit({ ...cti, init: { x: 0, y: -1 }, change: 'code' }).classes, ['none'], 'a reachable violation makes the code change the fix')
})

test('every class is offered in the taxonomy\'s order, read cyclically, and every cell keys to the generator\'s reference', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 1; seed <= 6; seed++) {
        const inst = generator.make(seed * 6151, band as Band, t.id as TemplateId) as SpotTheGapInstance
        assert.deepEqual(generator.make(seed * 6151, band as Band, t.id as TemplateId), inst)
        const part = inst.item.parts[0] as ChoicePart
        // The taxonomy's order from some class on, wrapping around: a rotation of the list.
        const shown = part.options.map((o) => inst.data.values[o.id])
        const start = CLASSES.findIndex((c) => c.id === shown[0])
        assert.deepEqual(shown, [...CLASSES.slice(start), ...CLASSES.slice(0, start)].map((c) => c.id))
        const k = await generator.key(inst, port)
        assert.ok(!isDiscard(k), `${t.id} b${band} seed ${seed} keys`)
        const key = k as SpotTheGapKey
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal(key.choices[0]?.answer, ref?.id)
        assert.equal(inst.data.values[key.choices[0]?.answer as string] === 'none', t.id === 't4', 't4 is the sound template')
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, key, port)
          assert.equal(g.ok, o.id === ref?.id)
          if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
          assert.ok(g.bound !== undefined)
        }
      }
    }
  }
})
