// KC tags in content: the page reader (lesson@1) and the record reader.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readPage, tagsOf, unitsOfRecord } from '../src/content.ts'
import { CASE_A, CASE_B, parsePageSource, read } from './helpers.ts'

test('tagsOf reads lists, comma lists, primary and secondary, and flags what is not a KC ID', () => {
  assert.deepEqual(tagsOf({ kcs: ['KC-1.violation-as-sat', 'KC-1.three-answers'] }), { kcs: ['KC-1.violation-as-sat', 'KC-1.three-answers'], bad: [] })
  assert.deepEqual(tagsOf({ kcs: 'KC-1.violation-as-sat, KC-1.three-answers' }).kcs, ['KC-1.violation-as-sat', 'KC-1.three-answers'])
  assert.deepEqual(tagsOf({ kcs: { primary: 'KC-4.cti-or-bug', secondary: ['KC-1.witness-class'] } }).kcs, ['KC-4.cti-or-bug', 'KC-1.witness-class'])
  assert.deepEqual(tagsOf({ primary_kc: 'KC-4.cti-or-bug', kc: 'KC-4.cti-or-bug' }).kcs, ['KC-4.cti-or-bug'])
  assert.deepEqual(tagsOf({ kcs: ['KC-1.Bad', 'violation'] }).bad, ['KC-1.Bad', 'violation'])
  assert.deepEqual(tagsOf({ title: 'KC-1.violation-as-sat' }).kcs, [])
})

const item = (role: string, family: string, kcs: string[]) => ({ type: 'item', role, family, template: 't1', kcs })
const cell = (n: number) => ({ type: 'instrument', ins: 'INS-z3', cell: n, callOnFirstRun: true, recorded: 'RUN-z3-starter' })

test('readPage: a segment that declares no kcs lends its graded items\' tags to its calls (then its prequestions\')', () => {
  const record = {
    id: 'S1.L2',
    kcs: ['KC-1.three-answers', 'KC-1.unknown-fails-closed'],
    segments: [
      { id: 's1', title: 'Three answers', blocks: [item('prequestion', 'GEN-call-it', ['KC-1.three-answers', 'KC-1.unknown-fails-closed']), cell(1), { type: 'prose', md: 'x' }, item('segment', 'GEN-call-it', ['KC-1.three-answers'])] },
      { id: 's2', title: 'Fail closed', blocks: [cell(2), item('segment', 'GEN-call-it', ['KC-1.unknown-fails-closed']), item('exit', 'GEN-which-stamp', ['KC-1.unknown-fails-closed', 'KC-1.three-answers'])] },
      { id: 's3', title: 'Only a prequestion', blocks: [item('prequestion', 'GEN-call-it', ['KC-1.three-answers']), cell(3)] },
      { id: 's4', title: 'Nothing tagged', blocks: [{ type: 'prose', md: 'y' }] },
    ],
  }
  const { page, problems } = readPage(record, 'content/stages/S1/S1.L2.md')
  assert.deepEqual(problems, [])
  assert.ok(page !== null)
  assert.equal(page.kind, 'lesson')
  assert.deepEqual(page.items.map((i) => `${i.segment}:${i.role}`), ['s1:prequestion', 's1:segment', 's2:segment', 's2:exit', 's3:prequestion'])
  // no segment declares kcs, so the graded item, not the prequestion, decides what segment 1's call counts toward
  assert.deepEqual(page.segments.map((s) => s.declared), [[], [], [], []])
  assert.deepEqual(page.segments.map((s) => s.kcs), [['KC-1.three-answers'], ['KC-1.unknown-fails-closed', 'KC-1.three-answers'], ['KC-1.three-answers'], []])
  // three cells and two GEN-call-it segment items are calls; each GEN-call-it item counts toward its own tags
  assert.deepEqual(page.calls.map((c) => `${c.ref}:${c.kcs.join('+')}`), [
    's1 block 2:KC-1.three-answers',
    's1 block 4:KC-1.three-answers',
    's2 block 1:KC-1.unknown-fails-closed+KC-1.three-answers',
    's2 block 2:KC-1.unknown-fails-closed',
    's3 block 2:KC-1.three-answers',
  ])
})

test('readPage: a segment\'s own kcs (lesson@1) decide what its cells\' calls count toward; a GEN-call-it item keeps its own', () => {
  const record = {
    id: 'S1.L2',
    kcs: ['KC-1.three-answers', 'KC-1.unknown-fails-closed'],
    segments: [
      // declares both: the cell's call counts toward both, though the graded item carries one
      { id: 's1', title: 'Three answers', kcs: ['KC-1.three-answers', 'KC-1.unknown-fails-closed'], blocks: [cell(1), item('segment', 'GEN-call-it', ['KC-1.three-answers'])] },
      // declares one: the cell's call counts toward that one, though the graded item carries both
      { id: 's2', title: 'Fail closed', kcs: ['KC-1.three-answers'], blocks: [cell(2), item('segment', 'GEN-which-stamp', ['KC-1.three-answers', 'KC-1.unknown-fails-closed'])] },
    ],
  }
  const { page, problems } = readPage(record, 'content/stages/S1/S1.L2.md')
  assert.deepEqual(problems, [])
  assert.ok(page !== null)
  assert.deepEqual(page.segments.map((s) => `${s.id}:${s.declared.join('+')}|${s.kcs.join('+')}`), [
    's1:KC-1.three-answers+KC-1.unknown-fails-closed|KC-1.three-answers+KC-1.unknown-fails-closed',
    's2:KC-1.three-answers|KC-1.three-answers',
  ])
  assert.deepEqual(page.calls.map((c) => `${c.ref}:${c.kcs.join('+')}`), [
    's1 block 1:KC-1.three-answers+KC-1.unknown-fails-closed',
    's1 block 2:KC-1.three-answers',
    's2 block 1:KC-1.three-answers',
  ])
})

test('readPage reports what would hide tags: no ID, a bad role, an item or segment tag that is not a KC ID', () => {
  assert.equal(readPage({ segments: [] }, 'x.md').page, null)
  assert.equal(readPage([], 'x.md').page, null)
  const { problems } = readPage({ id: 'D-03', kcs: [], segments: [{ id: 's1', blocks: [{ type: 'item', role: 'warmup', family: 'GEN-call-it', template: 't1', kcs: ['KC-1.Oops'] }] }] }, 'x.md')
  assert.ok(problems.some((p) => /role is prequestion, segment or exit/.test(p.message)))
  assert.ok(problems.some((p) => /KC-1\.Oops, which is not a KC ID/.test(p.message)))
  const seg = readPage({ id: 'S1.L2', kcs: [], segments: [{ id: 's1', kcs: ['three-answers', 'KC-1.three-answers'], blocks: [cell(1)] }] }, 'x.md')
  assert.deepEqual(seg.problems.map((p) => p.message), ["S1.L2 s1: the segment's kcs holds three-answers, which is not a KC ID"])
  assert.deepEqual(seg.page?.segments[0]?.declared, ['KC-1.three-answers'])
  assert.equal(readPage({ id: 'D-03', kcs: [], segments: [] }, 'x.md').page?.kind, 'drawer')
})

test('readPage reads what packages/content\'s parsePageSource builds from a Markdown source, segment kcs included', async () => {
  const { record, problems } = await parsePageSource(read('packages/content/test/fixtures/lessons/S1.L1.md'))
  assert.deepEqual(problems.filter((p) => p.severity === 'error'), [])
  const { page } = readPage(record, 'S1.L1.md')
  assert.ok(page !== null)
  assert.deepEqual(page.items.map((i) => `${i.role}:${i.kcs.join('+')}`), ['prequestion:KC-1.violation-as-sat+KC-1.quantifier-negation', 'exit:KC-1.violation-as-sat'])
  // "## Negating English {minutes=13 kcs=KC-1.quantifier-negation,KC-1.only-if-direction}": the one call is for those
  assert.deepEqual(page.segments.map((s) => `${s.id}:${s.declared.join('+')}`), ['s1:KC-1.quantifier-negation+KC-1.only-if-direction', 's2:KC-1.violation-as-sat'])
  assert.deepEqual(page.calls.map((c) => `${c.segment}:${c.kcs.join('+')}`), ['s1:KC-1.quantifier-negation+KC-1.only-if-direction'])
})

test('through parsePageSource: case (a) credits the call to both declared KCs; case (b) to the declared one only', async () => {
  const a = await parsePageSource(CASE_A)
  const b = await parsePageSource(CASE_B)
  for (const r of [a, b]) assert.deepEqual(r.problems.filter((p) => p.severity === 'error'), [])
  const pa = readPage(a.record, 'S1.L2.md').page
  const pb = readPage(b.record, 'S1.L2.md').page
  assert.ok(pa !== null && pb !== null)
  // (a) the cell's call, then the GEN-call-it segment item with its own tag
  assert.deepEqual(pa.calls.map((c) => c.kcs.join('+')), ['KC-1.three-answers+KC-1.unknown-fails-closed', 'KC-1.three-answers'])
  // (b) the only call is the cell's, for the segment's one declared KC; the GEN-which-stamp item is no call
  assert.deepEqual(pb.calls.map((c) => c.kcs.join('+')), ['KC-1.three-answers'])
  // the exit segment declares nothing, so it carries its exit item's tags
  assert.deepEqual(pb.segments.map((s) => `${s.declared.length}:${s.kcs.join('+')}`), ['1:KC-1.three-answers', '0:KC-1.unknown-fails-closed+KC-1.three-answers'])
})

test('unitsOfRecord finds anchors, specimens, templates, lab checks and placement items, with inherited tags', () => {
  const audit = unitsOfRecord({ id: 'AUD-1.1', class: 'G2', kcs: ['KC-1.implication-vacuity'], pair: { sound: {}, flawed: {} } }, 'content/audit/AUD-1.1.yaml', 'audit')
  assert.deepEqual(audit.units.map((u) => `${u.ref}:${u.kcs.join('+')}`), ['AUD-1.1:KC-1.implication-vacuity'])
  const bare = unitsOfRecord({ class: 'G4' }, 'content/audit/AUD-1.2.yaml', 'audit')
  assert.deepEqual(bare.units.map((u) => `${u.ref}:${u.kcs.length}`), ['AUD-1.2:0'])
  const specimens = unitsOfRecord({ specimens: [{ id: 'SP-1.1', kcs: ['KC-1.violation-as-sat'] }, { id: 'SP-1.2' }] }, 'content/specimens/S1.yaml', 'specimen')
  assert.deepEqual(specimens.units.map((u) => `${u.ref}:${u.kcs.join('+')}`), ['SP-1.1:KC-1.violation-as-sat', 'SP-1.2:'])
  const keyed = unitsOfRecord({ 'SP-1.4': { kcs: 'KC-1.encoding-is-the-claim' } }, 'content/specimens/more.yaml', 'specimen')
  assert.deepEqual(keyed.units.map((u) => u.ref), ['SP-1.4'])
  const gen = unitsOfRecord({ id: 'GEN-negate-it', kcs: ['KC-1.violation-as-sat'], templates: [{ id: 't1' }, { id: 't2', kcs: ['KC-1.two-state-property'] }] }, 'content/generators/GEN-negate-it/family.yaml', 'generator')
  assert.deepEqual(gen.units.map((u) => u.kcs.join('+')), ['KC-1.violation-as-sat', 'KC-1.two-state-property'])
  const lab = unitsOfRecord({ id: 'LAB-1', stages: [{ id: 'LAB-1.1', checks: [{ id: 'LAB-1.c1', label: 'x' }] }] }, 'content/stages/S1/lab.yaml', 'lab')
  assert.deepEqual(lab.units.map((u) => `${u.ref}:${u.graphTagged}`), ['LAB-1.c1:true'])
  const placement = unitsOfRecord({ steps: [{ id: 'step-1', kcs: ['KC-1.violation-as-sat'], items: [{ family: 'GEN-call-it', template: 't1' }] }] }, 'content/stages/S1/placement.yaml', 'placement')
  assert.deepEqual(placement.units.map((u) => u.kcs.join('+')), ['KC-1.violation-as-sat'])
  const badTag = unitsOfRecord({ id: 'SP-1.3', kcs: ['refund'] }, 'content/specimens/SP-1.3.yaml', 'specimen')
  assert.ok(badTag.problems.some((p) => /refund under a KC tag key is not a KC ID/.test(p.message)))
})

test('an anchor or a specimen with no tags of its own takes the tags its members carry', () => {
  const nested = unitsOfRecord({ id: 'AUD-1.3', members: [{ role: 'sound', kcs: ['KC-1.three-answers'] }, { role: 'flawed', kcs: ['KC-1.unknown-fails-closed'] }] }, 'content/audit/AUD-1.3.yaml', 'audit')
  assert.deepEqual(nested.units.map((u) => u.kcs.join('+')), ['KC-1.three-answers+KC-1.unknown-fails-closed'])
  const file = unitsOfRecord({ cures: [{ kcs: ['KC-1.encoding-is-the-claim'] }] }, 'content/specimens/SP-1.5.json', 'specimen')
  assert.deepEqual(file.units.map((u) => `${u.ref}:${u.kcs.join('+')}`), ['SP-1.5:KC-1.encoding-is-the-claim'])
})
