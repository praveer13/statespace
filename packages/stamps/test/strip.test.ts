// M-assurance-strip: three segments with one primary stamp each; requirement fit is never [P]; an agent's claim
// gets no strip (I8); the spoken name reads all three segments.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildStrip, deriveStamp, provedInRequirement, stripSpokenName, type Derivation, type StampContext } from '../src/index.ts'

const ctx: StampContext = { lane: 'reported', source: 'receipts/LAB-1.3/r.json' }
const z3 = { name: 'Z3', version: '5.3.1' }
const proved = deriveStamp({ kind: 'smt-unsat', solver: z3, rlimit: 5000000 }, ctx)
const assumed = (why: string): Derivation => deriveStamp({ kind: 'assumption', why }, ctx)
const stampOf = (d: Derivation) => {
  if (d.kind !== 'stamp') throw new Error('expected a stamp')
  return d.stamp
}

test("CL-1.1's strip: [P] with its defeater, an assumed correspondence, an assumed requirement with a not-covered support", () => {
  const notCovered = stampOf(deriveStamp({ kind: 'not-covered', what: 'the recipient' }, ctx))
  const r = buildStrip({
    claim: 'CL-1.1',
    title: 'the guarded transfer never overdraws the sender',
    proposition: { primary: proved, assumptions: [{ seam: 'SEAM-1', text: 'balances are unbounded integers' }] },
    correspondence: { primary: assumed('the code computes a − amount without overflow') },
    requirement: { primary: assumed('your statement'), supporting: [notCovered] },
  })
  assert.ok(r.ok)
  assert.equal(r.strip.cells.proposition.defeaters[0]?.text, 'encoding unverified')
  assert.equal(r.strip.cells.requirement.supporting[0]?.code, '[N]')
  assert.equal(r.strip.cells.proposition.assumptions[0]?.seam, 'SEAM-1')
  assert.equal(
    stripSpokenName(r.strip),
    'Claim CL-1.1, the guarded transfer never overdraws the sender. Proposition of the model: Proved, code P: Z3 5.3.1 unsat, uncertified, rlimit 5e6. Correspondence: Assumed, code A: the code computes a − amount without overflow. Requirement fit: Assumed, code A: your statement.',
  )
})

test('requirement fit is never [P], as primary or as support', () => {
  const asPrimary = buildStrip({ claim: 'CL-1.1', title: 't', proposition: { primary: proved }, requirement: { primary: proved } })
  assert.equal(asPrimary.ok, false)
  assert.match(!asPrimary.ok ? asPrimary.problems.join() : '', /Requirement fit is never \[P\]/)
  const asSupport = buildStrip({ claim: 'CL-1.1', title: 't', requirement: { primary: assumed('mine'), supporting: [stampOf(proved)] } })
  assert.equal(asSupport.ok, false)
})

test("an agent's claim is never stamped, and a derivation without a stamp cannot fill a segment", () => {
  const agent = buildStrip({ claim: 'local-1', title: 't', agent: true, proposition: { primary: proved } })
  assert.equal(agent.ok, false)
  assert.match(!agent.ok ? agent.problems.join() : '', /I8/)
  const quoted = deriveStamp({ kind: 'agent-assertion', text: 'proved' }, ctx)
  const r = buildStrip({ claim: 'local-1', title: 't', proposition: { primary: quoted } })
  assert.equal(r.ok, false)
})

test('a Lean result with sorry fills the segment with its "modulo" reading and the assumed lemmas as support', () => {
  const modulo = deriveStamp({ kind: 'lean-sorry', lean: { name: 'Lean', version: '4.35.0' }, lemmas: ['step_case'], count: 1 }, ctx)
  const r = buildStrip({ claim: 'CL-9.2', title: 'semantic preservation', proposition: { primary: modulo } })
  assert.ok(r.ok)
  assert.equal(r.strip.cells.proposition.primary, null)
  assert.equal(r.strip.cells.proposition.modulo, 'PROVED modulo 1 assumed lemma')
  assert.equal(r.strip.cells.proposition.supporting[0]?.code, '[A]')
  assert.match(stripSpokenName(r.strip), /Proposition of the model: PROVED modulo 1 assumed lemma\. Correspondence: pending\. Requirement fit: pending\./)
})

test('requirement fit is never PROVED in any form: a Lean result read "PROVED modulo k assumed lemmas" is refused there too', () => {
  const lean = { name: 'Lean', version: '4.35.0' }
  for (const modulo of [
    deriveStamp({ kind: 'lean-sorry', lean, lemmas: ['req_holds'], count: 1 }, ctx),
    deriveStamp({ kind: 'lean-custom-axiom', lean, axioms: ['cheat'] }, ctx),
  ]) {
    assert.equal(modulo.kind, 'modulo')
    const r = buildStrip({ claim: 'CL-1.1', title: 't', requirement: { primary: modulo } })
    assert.equal(r.ok, false)
    assert.match(!r.ok ? r.problems.join() : '', /Requirement fit is never PROVED/)
    // the same reading stays allowed where a checker's proof belongs
    assert.ok(buildStrip({ claim: 'CL-1.1', title: 't', proposition: { primary: modulo } }).ok)
  }
  // the component's question, for a strip built by hand
  const cell = { primary: null, modulo: 'PROVED modulo 1 assumed lemma', supporting: [], defeaters: [], assumptions: [] }
  assert.equal(provedInRequirement(cell), true)
  assert.equal(provedInRequirement({ ...cell, modulo: undefined }), false)
})
