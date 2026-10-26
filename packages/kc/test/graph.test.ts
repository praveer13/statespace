// The graph queries, on the course's own graph and on small graphs built for the edge cases.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  blockingRequirements,
  canCredit,
  confusableSetsOf,
  creditOrder,
  fadingFamilyOf,
  findCycle,
  firstContactIn,
  GRAPH,
  isThreshold,
  kcById,
  kcsFirstTaughtIn,
  kcsOfStage,
  labStageById,
  prerequisitesOf,
  requirementsOf,
  topologicalOrder,
} from '../src/index.ts'
import type { Kc, KcGraph, KcId } from '../src/index.ts'

test('the course graph: 105 KCs, 26 threshold, 8 confusable sets, 6 fading families, 91 lab stages', () => {
  assert.equal(GRAPH.kcs.length, 105)
  assert.equal(GRAPH.kcs.filter((k) => k.threshold).length, 26)
  assert.deepEqual(GRAPH.confusableSets.map((s) => s.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  assert.deepEqual(GRAPH.fadingFamilies.map((f) => `${f.id}:${f.kc}`), [
    'F1:KC-2.generalized-ih',
    'F2:KC-3.step-invariant',
    'F3:KC-4.wp-assignment',
    'F4:KC-4.cti-or-bug',
    'F5:KC-5.fairness',
    'F6:KC-9.forward-simulation',
  ])
  assert.equal(GRAPH.labStages.length, 91)
  assert.equal(GRAPH.labStages.filter((s) => s.stretch).length, 8)
})

test('the requires edges form a DAG, and the topological order puts every requirement first', () => {
  assert.equal(findCycle(GRAPH), null)
  const order = topologicalOrder(GRAPH)
  assert.ok(order !== null)
  const at = new Map(order.map((id, i) => [id, i]))
  for (const k of GRAPH.kcs) for (const r of [...k.requires, ...k.requiresSoft]) assert.ok((at.get(r) ?? -1) < (at.get(k.id) ?? -1), `${r} before ${k.id}`)
})

test('lookups', () => {
  assert.equal(kcById(GRAPH, 'KC-4.cti-or-bug')?.stage, 'S4')
  assert.equal(kcById(GRAPH, 'KC-4.no-such'), undefined)
  assert.equal(isThreshold(GRAPH, 'KC-1.violation-as-sat'), true)
  assert.equal(isThreshold(GRAPH, 'KC-1.witness-class'), false)
  assert.deepEqual(kcsOfStage(GRAPH, 'S10').map((k) => k.id), ['KC-10.claim-graph-report', 'KC-10.defeater-log', 'KC-10.agent-proposal-triage', 'KC-10.publish-limitations'])
  assert.deepEqual(kcsFirstTaughtIn(GRAPH, 'S1.L1').map((k) => k.id).sort(), ['KC-1.only-if-direction', 'KC-1.quantifier-negation', 'KC-1.violation-as-sat', 'KC-1.witness-class'])
  assert.deepEqual(kcsFirstTaughtIn(GRAPH, 'S10.L6').map((k) => k.id), ['KC-10.agent-proposal-triage'])
  assert.deepEqual(firstContactIn(GRAPH, 'S1.L0'), ['KC-1.violation-as-sat'])
  assert.deepEqual(firstContactIn(GRAPH, 'S1.L1'), [])
  assert.deepEqual(confusableSetsOf(GRAPH, 'KC-6.differential-testing').map((s) => s.id), ['A', 'G'])
  assert.equal(confusableSetsOf(GRAPH, 'KC-10.agent-proposal-triage')[0]?.auditFamilies, true)
  assert.equal(fadingFamilyOf(GRAPH, 'KC-4.cti-or-bug')?.id, 'F4')
  assert.equal(fadingFamilyOf(GRAPH, 'KC-1.witness-class'), null)
  assert.deepEqual(labStageById(GRAPH, 'LAB-6.6')?.uses.map((u) => u.stage), ['LAB-6.2'])
  assert.equal(labStageById(GRAPH, 'LAB-5.7')?.after, 'S5.L9')
})

test('requirements and prerequisites: soft edges only when asked', () => {
  assert.deepEqual(requirementsOf(GRAPH, 'KC-6.rowcount-as-guard'), ['KC-6.null-guards'])
  assert.deepEqual(requirementsOf(GRAPH, 'KC-6.rowcount-as-guard', { soft: true }), ['KC-6.null-guards', 'KC-3.big-step-errors'])
  const pre = prerequisitesOf(GRAPH, 'KC-1.non-vacuity-check')
  assert.deepEqual([...pre].sort(), ['KC-1.implication-vacuity', 'KC-1.only-if-direction', 'KC-1.quantifier-negation', 'KC-1.three-answers', 'KC-1.violation-as-sat'])
  assert.equal(prerequisitesOf(GRAPH, 'KC-6.rowcount-as-guard').includes('KC-3.big-step-errors'), false)
  assert.equal(prerequisitesOf(GRAPH, 'KC-6.rowcount-as-guard', { soft: true }).includes('KC-3.big-step-errors'), true)
})

test('credit waits for every hard requirement and never for a soft one (spine section 8.6)', () => {
  assert.equal(canCredit(GRAPH, 'KC-1.three-answers', new Set()), false)
  assert.equal(canCredit(GRAPH, 'KC-1.three-answers', new Set(['KC-1.violation-as-sat'])), true)
  assert.deepEqual(blockingRequirements(GRAPH, 'KC-1.non-vacuity-check', new Set(['KC-1.three-answers'])), ['KC-1.implication-vacuity'])
  // the builder's path crosses KC-6.rowcount-as-guard → KC-3.big-step-errors, which is soft
  assert.equal(canCredit(GRAPH, 'KC-6.rowcount-as-guard', new Set(['KC-6.null-guards'])), true)
  assert.equal(canCredit(GRAPH, 'KC-9.no-such', new Set()), false)
  // KC-5.inductive-invariant-tla waits for KC-4.invariant-vs-inductive on any path (curriculum/D-drawers.md 6.6)
  assert.equal(canCredit(GRAPH, 'KC-5.inductive-invariant-tla', new Set(['KC-5.bounded-scope'])), false)
})

test('creditOrder credits passes as their requirements are met, and keeps the rest waiting', () => {
  const all = creditOrder(GRAPH, ['KC-1.three-answers', 'KC-1.violation-as-sat', 'KC-1.quantifier-negation'])
  assert.deepEqual(all.credits, ['KC-1.quantifier-negation', 'KC-1.violation-as-sat', 'KC-1.three-answers'])
  assert.deepEqual(all.waiting, [])
  const some = creditOrder(GRAPH, ['KC-1.three-answers', 'KC-1.only-if-direction'])
  assert.deepEqual(some.credits, ['KC-1.only-if-direction'])
  assert.deepEqual(some.waiting, ['KC-1.three-answers'])
  const later = creditOrder(GRAPH, ['KC-1.three-answers'], new Set(['KC-1.violation-as-sat']))
  assert.deepEqual(later.credits, ['KC-1.three-answers'])
})

const kc = (id: string, requires: string[] = [], requiresSoft: string[] = []): Kc => ({
  id: id as KcId,
  name: id,
  stage: 'S1',
  threshold: false,
  requires: requires as KcId[],
  requiresSoft: requiresSoft as KcId[],
  confusable: [],
  firstTaught: 'S1.L1',
  families: [],
  bank: null,
})
const small = (kcs: Kc[]): KcGraph => ({
  schema: 'statespace/kc-graph@1',
  firstContact: {},
  kcs,
  confusableSets: [],
  fadingFamilies: [],
  labStages: [],
  lessonUses: {},
  tools: [],
  referenceModules: [],
  substitutes: { softEdges: [], artifacts: [] },
  pendingCrossings: [],
})

test('findCycle reports a cycle through hard and soft edges; topologicalOrder is null then', () => {
  const g = small([kc('KC-1.a', ['KC-1.c']), kc('KC-1.b', ['KC-1.a']), kc('KC-1.c', [], ['KC-1.b'])])
  const c = findCycle(g)
  assert.ok(c !== null)
  assert.deepEqual([...c].sort(), ['KC-1.a', 'KC-1.b', 'KC-1.c'])
  assert.equal(topologicalOrder(g), null)
  assert.equal(findCycle(small([kc('KC-1.a'), kc('KC-1.b', ['KC-1.a'])])), null)
})
