import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COPY, layeredFeedback } from '../../src/core/index.ts'
import type { ArmReading, Grade } from '../../src/core/index.ts'

const miss: Grade = {
  ok: false,
  why: 'Your answer missed. The witness below tells option B from option A.',
  misconception: 'dp:G1',
  note: 'This violates the converse.',
  witness: { ok: true, a: 0, x: 1 },
  bound: 'every state with a, x in [−4, 4]',
  basis: 'Z3 5.3.1, equivalence over QF_LIA',
  engine: 'z3@5.3.1',
}
const match: Grade = { ok: true, why: COPY.matched, note: 'the violation of ok → a ≥ x', basis: 'Z3 5.3.1, equivalence over QF_LIA' }
const noteArm = (arm: 'open' | 'collapsed'): ArmReading => ({ applies: true, comparison: 'misconception-note', arm, expSeed: 2654435769 })

test('a probe shows nothing before its final submission, and everything after it', () => {
  const before = layeredFeedback(miss, { mode: 'probe', final: false })
  assert.deepEqual(before, { shown: false, layer1: null, layer2: null, layer3: null, armRecord: null })
  const after = layeredFeedback(miss, { mode: 'probe', final: true })
  assert.equal(after.shown, true)
  assert.equal(after.layer1?.verdict, 'missed')
  assert.equal(after.layer2?.open, true)
})

test('layer 1 always carries the witness, the bound and the basis, with a dash where there is none', () => {
  const f = layeredFeedback(miss, { mode: 'practice', final: true })
  assert.deepEqual(f.layer1, { verdict: 'missed', text: miss.why, witness: miss.witness, class: null, bound: miss.bound, basis: miss.basis, explanation: null })
  const exact = layeredFeedback(match, { mode: 'practice', final: true })
  assert.deepEqual({ witness: exact.layer1?.witness, bound: exact.layer1?.bound, explanation: exact.layer1?.explanation }, { witness: null, bound: COPY.none, explanation: match.note })
  assert.equal(exact.layer2, null, 'a match has no misconception note')
  const ungraded = layeredFeedback({ ok: null, ungraded: 'unknown', why: COPY.ungradedUnknown, basis: 'b' }, { mode: 'practice', final: true })
  assert.equal(ungraded.layer1?.verdict, 'not graded')
  assert.equal(ungraded.layer2, null)
})

test('layer 2 opens by default only in novice KCs; a KC that declares no treatment is novice', () => {
  assert.deepEqual(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'novice' }).layer2, { tag: 'dp:G1', note: miss.note, open: true, reason: 'novice' })
  assert.equal(layeredFeedback(miss, { mode: 'practice', final: true }).layer2?.open, true)
  assert.deepEqual(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert' }).layer2, { tag: 'dp:G1', note: miss.note, open: false, reason: 'expert' })
})

test('a sure miss opens the note whatever the treatment (ASSESSMENT.md section 5.7)', () => {
  assert.deepEqual(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', confidence: 'sure' }).layer2, { tag: 'dp:G1', note: miss.note, open: true, reason: 'sure-miss' })
  assert.equal(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', confidence: 'think' }).layer2?.open, false)
})

test('comparison 1: the arm sets the note\'s default for an entered unit, and the item records it', () => {
  const open = layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', arm: noteArm('open') })
  assert.deepEqual({ open: open.layer2?.open, reason: open.layer2?.reason }, { open: true, reason: 'arm' })
  assert.deepEqual(open.armRecord, { comparison: 'misconception-note', arm: 'open', expSeed: 2654435769 })
  const collapsed = layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'novice', solid: true, arm: noteArm('collapsed') })
  assert.deepEqual({ open: collapsed.layer2?.open, reason: collapsed.layer2?.reason }, { open: false, reason: 'arm' })
  assert.equal(collapsed.armRecord?.arm, 'collapsed')
})

test('comparison 1\'s safeguard: a novice KC that is not solid keeps its note open in both arms', () => {
  const f = layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'novice', solid: false, arm: noteArm('collapsed') })
  assert.deepEqual({ open: f.layer2?.open, reason: f.layer2?.reason, arm: f.armRecord?.arm, fallback: f.armRecord?.fallback }, { open: true, reason: 'safeguard', arm: 'collapsed', fallback: undefined })
})

test('a sure miss under the collapsed arm opens the note and records a fallback, so the read counts the deviation', () => {
  const f = layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', confidence: 'sure', arm: noteArm('collapsed') })
  assert.equal(f.layer2?.open, true)
  assert.equal(f.layer2?.reason, 'sure-miss')
  assert.match(f.armRecord?.fallback ?? '', /sure-miss/)
})

test('an arm never touches a probe, a match, or another comparison\'s reading', () => {
  assert.equal(layeredFeedback(miss, { mode: 'probe', final: true, treatment: 'expert', arm: noteArm('open') }).armRecord, null)
  assert.equal(layeredFeedback(miss, { mode: 'probe', final: true, treatment: 'expert', arm: noteArm('open') }).layer2?.open, false)
  assert.equal(layeredFeedback(match, { mode: 'practice', final: true, arm: noteArm('open') }).armRecord, null)
  const other: ArmReading = { applies: true, comparison: 'witness-generalization', arm: 'contrast-then-class', expSeed: 1 }
  assert.equal(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', arm: other }).armRecord, null)
  assert.equal(layeredFeedback(miss, { mode: 'practice', final: true, treatment: 'expert', arm: { applies: false, why: 'waiting' } }).layer2?.reason, 'expert')
})

test('layer 3: the second miss on one tag calls for its refutation card', () => {
  assert.equal(layeredFeedback(miss, { mode: 'practice', final: true }).layer3, null)
  assert.deepEqual(layeredFeedback(miss, { mode: 'practice', final: true, priorMissesOnTag: 1 }).layer3, { tag: 'dp:G1', misses: 2 })
  assert.equal(layeredFeedback(match, { mode: 'practice', final: true, priorMissesOnTag: 5 }).layer3, null)
})
