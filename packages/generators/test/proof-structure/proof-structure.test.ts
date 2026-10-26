import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, KeyBase, TemplateId } from '../../src/core/index.ts'
import { generator, ports } from '../../src/proof-structure/index.ts'
import type { ProofStructureInstance } from '../../src/proof-structure/index.ts'
import { cons, nil, plus, runScript, showGoals, tc, tn, tv } from '../../src/proof-structure/tactics.ts'
import type { Law, Line, Script, Theory } from '../../src/proof-structure/tactics.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]

const LIST = [
  { name: 'nil', args: [] },
  { name: 'cons', args: ['elem', 'self'] },
]
const law = (name: string, binders: { n: string; ty: string }[], l: Law['eq']['l'], r: Law['eq']['r']): Law => ({ name, binders, eq: { l, r } })
const s = tv('s')

/** The course's run-conserves shape, written out by hand. */
const RUN: Theory = {
  defs: [
    {
      name: 'run',
      eqs: [
        law('run', [{ n: 's', ty: 'Ledger' }], tc('run', s, nil()), s),
        law('run', [{ n: 's', ty: 'Ledger' }, { n: 'n', ty: 'Int' }, { n: 'ns', ty: 'List Int' }], tc('run', s, cons(tv('n'), tv('ns'))), tc('run', tc('step', s, tv('n')), tv('ns'))),
      ],
    },
  ],
  lemmas: [law('step_total', [{ n: 's', ty: 'Ledger' }, { n: 'n', ty: 'Int' }], tc('total', tc('step', s, tv('n'))), tc('total', s))],
  theorem: law('run_total', [{ n: 's', ty: 'Ledger' }, { n: 'ns', ty: 'List Int' }], tc('total', tc('run', s, tv('ns'))), tc('total', s)),
  types: { 'List Int': LIST },
}

const proof = (gen: string[], rule = 'ih'): Script => [
  { k: 'induction', x: 'ns', gen },
  { k: 'case', ctor: 'nil', names: [], tacs: [{ t: 'simp', rules: ['run'] }] },
  { k: 'case', ctor: 'cons', names: ['n', 'ns', 'ih'], tacs: [] },
  { k: 'tacs', tacs: [{ t: 'simp', rules: ['run'] }] },
  { k: 'tacs', tacs: [{ t: 'rw', rules: [rule] }] },
  { k: 'tacs', tacs: [{ t: 'exact', name: 'step_total', args: ['s', 'n'] }] },
]

test('the model closes run_total with generalizing s, and states each goal as worked by hand', () => {
  const p = proof(['s'])
  assert.equal(runScript(RUN, p).ok, true)
  assert.equal(showGoals(runScript(RUN, p, { upto: 3 }).goals), 'n : Int, ns : List Int, ih : ∀ (s : Ledger), total (run s ns) = total s, s : Ledger ⊢ total (run s (n :: ns)) = total s')
  assert.equal(showGoals(runScript(RUN, p, { upto: 4 }).goals), 'n : Int, ns : List Int, ih : ∀ (s : Ledger), total (run s ns) = total s, s : Ledger ⊢ total (run (step s n) ns) = total s')
  assert.equal(showGoals(runScript(RUN, p, { upto: 5 }).goals), 'n : Int, ns : List Int, ih : ∀ (s : Ledger), total (run s ns) = total s, s : Ledger ⊢ total (step s n) = total s')
})

test('without generalizing s, rw [ih] finds no instance: the ungeneralized hypothesis (dp:L5)', () => {
  const r = runScript(RUN, proof([]))
  assert.equal(r.ok, false)
  assert.equal(r.line, 5)
  assert.match(r.error ?? '', /the pattern total \(run s ns\) does not occur in the goal total \(run \(step s n\) ns\) = total s/)
})

test('the theorem is not in scope inside its own proof (dp:L6), and a missing base case is reported', () => {
  const circ = runScript(RUN, proof(['s'], 'run_total'))
  assert.equal(circ.ok, false)
  assert.equal(circ.error, "unknown identifier 'run_total'")
  const noNil = runScript(RUN, proof(['s']).filter((l: Line) => !(l.k === 'case' && l.ctor === 'nil')))
  assert.equal(noNil.ok, false)
  assert.match(noNil.error ?? '', /alternative 'nil' has not been provided/)
})

test('omega closes linear identities and refuses goals with an unrewritten call', () => {
  const sum = (x: ReturnType<typeof tv>) => tc('sum', x)
  const th: Theory = { defs: [], lemmas: [], theorem: law('t', [{ n: 'acc', ty: 'Int' }, { n: 'n', ty: 'Int' }, { n: 'ns', ty: 'List Int' }], plus(plus(tv('acc'), tv('n')), sum(tv('ns'))), plus(tv('acc'), plus(tv('n'), sum(tv('ns'))))), types: {} }
  assert.equal(runScript(th, [{ k: 'tacs', tacs: [{ t: 'omega' }] }]).ok, true)
  const stuck: Theory = { ...th, theorem: law('u', [{ n: 'xs', ty: 'List Int' }], plus(tn(1), tc('len', tc('app', tv('xs'), tv('ys')))), plus(tn(1), tc('len', tv('xs')))) }
  assert.equal(runScript(stuck, [{ k: 'tacs', tacs: [{ t: 'omega' }] }]).ok, false)
})

test('every cell keys, the key is the reference, it grades ok, and each distractor misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      let keyed = 0
      for (let seed = 1; seed <= 6; seed++) {
        const inst = generator.make(seed * 7907, band as Band, t.id as TemplateId) as ProofStructureInstance
        assert.deepEqual(generator.make(seed * 7907, band as Band, t.id as TemplateId), inst, 'make is deterministic')
        const k = await generator.key(inst, port)
        if (isDiscard(k)) continue
        keyed += 1
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal((k as KeyBase).choices[0]?.answer, ref?.id)
        assert.equal((await generator.grade(inst, { main: ref?.id as string }, k as KeyBase, port)).ok, true)
        for (const o of part.options) {
          if (o.origin.kind !== 'mutant') continue
          const g = await generator.grade(inst, { main: o.id }, k as KeyBase, port)
          assert.equal(g.ok, false)
          assert.equal(g.misconception, o.origin.tag)
        }
        assert.match(inst.item.stem, /not Lean's own output/, 'every item says its goals are the model\'s')
      }
      assert.ok(keyed > 0, `${t.id} band ${band} keys some seed`)
    }
  }
})
