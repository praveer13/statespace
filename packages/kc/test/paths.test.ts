// The published paths as unit lists, from content/stages/budget.yaml.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { expandSelector, GRAPH, resolvePaths } from '../src/index.ts'
import { registry, yaml } from './helpers.ts'

const lessons = registry.filter((e) => e.kind === 'lesson').map((e) => ({ id: e.id, stage: e.stage ?? '', tier: e.tier ?? '' }))
const labStages = registry.filter((e) => e.kind === 'lab-stage').map((e) => ({ id: e.id, lab: e.lab ?? '', stretch: e.stretch === true }))
const stretch = GRAPH.labStages.filter((s) => s.stretch)
const budget = yaml('content/stages/budget.yaml') as Record<string, any>

test('both published paths resolve, each with every lesson that has a place and every lab stage once', () => {
  const r = resolvePaths(budget, lessons, labStages, stretch)
  assert.deepEqual(r.problems, [])
  assert.deepEqual(r.paths.map((p) => p.id), ['default', 'builder'])
  for (const p of r.paths) {
    assert.equal(p.units.length, 170, p.id)
    assert.equal(new Set(p.units.map((u) => u.id)).size, 170, p.id)
    for (const s of labStages) assert.ok(p.position.has(s.id), `${s.id} on ${p.id}`)
    for (const [i, u] of p.units.entries()) assert.equal(p.position.get(u.id), i)
  }
})

test('the default path keeps each stage whole and in order; the builder path runs the spine\'s early blocks', () => {
  const r = resolvePaths(budget, lessons, labStages, stretch)
  const [dflt, builder] = r.paths
  assert.deepEqual(dflt?.units.slice(0, 4).map((u) => u.id), ['S1.L0', 'LAB-1.1', 'S1.L1', 'LAB-1.2'])
  const early = builder?.units.filter((u) => u.block === 'S6-early').map((u) => u.id)
  assert.deepEqual(early, ['S6.L1', 'LAB-6.1', 'S6.L2', 'S6.L6', 'LAB-6.5', 'S6.L7', 'LAB-6.6'])
  const early8 = builder?.units.filter((u) => u.block === 'S8-early').map((u) => u.id)
  assert.deepEqual(early8, ['S8.L1', 'LAB-8.1', 'S8.L2', 'LAB-8.2', 'S8.L3', 'LAB-8.4', 'S8.L4', 'LAB-8.5'])
  // S5.L9 moves after S4 on the builder's path, and its stretch stage follows it on both
  for (const p of r.paths) assert.equal((p.position.get('LAB-5.7') ?? 0) - (p.position.get('S5.L9') ?? 0), 1, p.id)
  assert.ok((builder?.position.get('S5.L9') ?? 0) > (builder?.position.get('S4.L9') ?? 0))
})

test('expandSelector reads the budget file\'s ranges', () => {
  assert.deepEqual(expandSelector('S5.L1–S5.L3'), ['S5.L1', 'S5.L2', 'S5.L3'])
  assert.deepEqual(expandSelector('LAB-6.2–LAB-6.4'), ['LAB-6.2', 'LAB-6.3', 'LAB-6.4'])
  assert.deepEqual(expandSelector('DEFENCE'), ['DEFENCE'])
  assert.equal(expandSelector('S5.L1–S6.L2'), null)
})

test('a malformed budget is a problem: a bad range, a unit taken twice, a unit on no block, an unknown unit', () => {
  const bad = structuredClone(budget)
  bad.paths.builder.blocks.find((b: { id: string }) => b.id === 'S5-early').take = ['S5.L1–S6.L8']
  const r1 = resolvePaths(bad, lessons, labStages, stretch)
  assert.ok(r1.problems.some((p) => /is no unit and no range of units/.test(p.message)))
  const dropped = structuredClone(budget)
  dropped.paths.builder.blocks = dropped.paths.builder.blocks.filter((b: { id: string }) => b.id !== 'S5-late')
  const r0 = resolvePaths(dropped, lessons, labStages, stretch)
  assert.ok(r0.problems.some((p) => /S5\.L9 of S5 is on no block/.test(p.message)))
  assert.ok(r0.problems.some((p) => /LAB-5\.7 follows S5\.L9, which is on no block/.test(p.message)))
  const twice = structuredClone(budget)
  twice.paths.builder.blocks.find((b: { id: string }) => b.id === 'S6-late').take = ['S6.L1']
  const r2 = resolvePaths(twice, lessons, labStages, stretch)
  assert.ok(r2.problems.some((p) => /S6\.L1 is taken twice/.test(p.message)))
  const unknown = structuredClone(budget)
  unknown.stages.S1.sequence = `${unknown.stages.S1.sequence} S1.L9`
  const r3 = resolvePaths(unknown, lessons, labStages, stretch)
  assert.ok(r3.problems.some((p) => /names S1\.L9, which is no lesson or lab stage of S1/.test(p.message)))
  assert.ok(resolvePaths(null, lessons, labStages).problems.length > 0)
})
