// The loader of content/kc/graph.yaml: the real file loads cleanly, and each kind of malformed document is a
// problem that names where it is, never a silently shorter graph.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadGraph } from '../src/load.ts'
import { graphDoc, yaml } from './helpers.ts'

const problemsOf = (doc: unknown): string[] => loadGraph(doc).problems.map((p) => p.message)
const some = (doc: unknown, re: RegExp): void => {
  const ps = problemsOf(doc)
  assert.ok(ps.some((m) => re.test(m)), `expected a problem matching ${re}, got:\n${ps.join('\n')}`)
}

test('content/kc/graph.yaml loads with no problem', () => {
  const r = loadGraph(yaml('content/kc/graph.yaml'))
  assert.deepEqual(r.problems, [])
  assert.equal(r.graph?.kcs.length, 105)
})

test('the top level: not a mapping, a wrong schema, an unknown key, no kcs list', () => {
  assert.equal(loadGraph([]).graph, null)
  const d = graphDoc()
  d.schema = 'statespace/kc-graph@2'
  some(d, /schema: must be "statespace\/kc-graph@1"/)
  const e = graphDoc()
  e.kc_list = []
  some(e, /unknown key "kc_list"/)
  const f = graphDoc()
  delete f.kcs
  assert.equal(loadGraph(f).graph, null)
})

test('a KC: its ID, stage, references and edges', () => {
  const d = graphDoc()
  d.kcs[0].id = 'KC-1.Bad_Slug'
  some(d, /is not a KC ID/)
  const e = graphDoc()
  e.kcs[0].stage = 'S2'
  some(e, /S2 differs from the stage in the ID \(S1\)/)
  const f = graphDoc()
  f.kcs[0].requires = ['KC-9.no-such-kc']
  some(f, /requires: KC-9\.no-such-kc is not a KC of the graph/)
  const g = graphDoc()
  g.kcs[0].requires = [g.kcs[0].id]
  some(g, /requires itself/)
  const h = graphDoc()
  const rowcount = h.kcs.find((k: { id: string }) => k.id === 'KC-6.rowcount-as-guard')
  rowcount.requires = [...rowcount.requires, 'KC-3.big-step-errors']
  some(h, /KC-3\.big-step-errors is both a hard and a soft requirement/)
  const i = graphDoc()
  i.kcs[1] = { ...i.kcs[1], id: i.kcs[0].id }
  some(i, /is listed twice/)
  const j = graphDoc()
  j.kcs[0].confusable = ['KC-1.only-if-direction']
  some(j, /a KC is not confusable with itself/)
  const k = graphDoc()
  k.kcs[0].colour = 'red'
  some(k, /unknown key "colour"/)
  const l = graphDoc()
  l.kcs[0].families = ['GEN-negate-it', 'GEN-negate-it']
  some(l, /GEN-negate-it is listed twice/)
  const m = graphDoc()
  m.kcs[0].bank = { isomorphs: 0, source: 'content/banks/x.yaml' }
  some(m, /isomorphs: must be a positive integer/)
})

test('sets and families name KCs of the graph', () => {
  const d = graphDoc()
  d.confusable_sets[0].kcs = ['KC-1.no-such-kc']
  some(d, /confusable_sets › A › kcs: KC-1\.no-such-kc is not a KC of the graph/)
  const e = graphDoc()
  e.confusable_sets[1].id = 'A'
  some(e, /confusable_sets › A: is listed twice/)
  const f = graphDoc()
  f.fading_families[0].kc = 'KC-2.no-such-kc'
  some(f, /fading_families › F1 › kc: KC-2\.no-such-kc is not a KC of the graph/)
})

test('lab stages: IDs, uses, tools and the stretch placement', () => {
  const d = graphDoc()
  d.lab_stages['LAB-1.3'].uses = { 'LAB-1.99': 'nothing' }
  some(d, /LAB-1\.99 is not a lab stage of the graph/)
  const e = graphDoc()
  e.lab_stages['LAB-1.3'].tools = ['jetpack']
  some(e, /jetpack is not a tool of the graph/)
  const f = graphDoc()
  delete f.lab_stages['LAB-5.7'].after
  some(f, /a \[stretch\] stage names the unit it follows/)
  const g = graphDoc()
  g.lab_stages['LAB-1.3'].after = 'S1.L3'
  some(g, /only a \[stretch\] stage names the unit it follows/)
  const h = graphDoc()
  h.lab_stages['LAB-1.3'].uses = { 'LAB-1.3': 'itself' }
  some(h, /a stage cannot use its own artifact/)
  const i = graphDoc()
  i.lab_stages['LAB-1.c3'] = { kcs: [] }
  some(i, /LAB-1\.c3: is not a lab stage ID/)
})

test('substitutes: a soft edge of the graph with a drawer, an artifact use with a reference module', () => {
  const d = graphDoc()
  d.substitutes[0].soft_edge = ['KC-6.rowcount-as-guard', 'KC-6.null-guards']
  some(d, /KC-6\.rowcount-as-guard → KC-6\.null-guards is not a soft edge of the graph/)
  const e = graphDoc()
  e.substitutes[0].substitute = 'reference-compiler'
  some(e, /a soft edge is stood in for by a drawer/)
  const f = graphDoc()
  f.substitutes[1].substitute = 'reference-interpreter'
  some(f, /"reference-interpreter" is not a reference module of the graph/)
  const g = graphDoc()
  g.substitutes[1].artifact = ['LAB-6.6', 'LAB-6.3']
  some(g, /LAB-6\.6 does not use LAB-6\.3/)
  const h = graphDoc()
  h.substitutes[0] = { path: 'builder', substitute: 'D-23' }
  some(h, /names exactly one of soft_edge/)
  // an artifact use may be a lesson's (lesson_uses), and must be one it declares
  const i = graphDoc()
  i.substitutes[1].artifact = ['S6.L2', 'LAB-3.6']
  some(i, /S6\.L2 does not use LAB-3\.6 \(lesson_uses › S6\.L2\)/)
  const j = graphDoc()
  j.substitutes[1].artifact = ['S6.L2', 'LAB-3.7']
  assert.deepEqual(problemsOf(j).filter((m) => /substitutes/.test(m)), [])
  assert.deepEqual(loadGraph(j).graph?.substitutes.artifacts[0], { path: 'builder', unit: 'S6.L2', uses: 'LAB-3.7', substitute: 'reference-compiler' })
})

test('lesson_uses: a lesson ID mapped to lab stages of the graph, each with what it applies', () => {
  const r = loadGraph(yaml('content/kc/graph.yaml'))
  assert.deepEqual(r.graph?.lessonUses['S6.L2'], [{ stage: 'LAB-3.7', artifact: 'the self-transfer decision record its compile plan applies' }])
  const d = graphDoc()
  d.lesson_uses = { 'LAB-6.2': { 'LAB-3.7': 'x' } }
  some(d, /lesson_uses › LAB-6\.2: is not a lesson ID/)
  const e = graphDoc()
  e.lesson_uses = { 'S6.L2': { 'LAB-3.99': 'x' } }
  some(e, /lesson_uses › S6\.L2: LAB-3\.99 is not a lab stage of the graph/)
  const f = graphDoc()
  f.lesson_uses = { 'S6.L2': {} }
  some(f, /lesson_uses › S6\.L2: must map each lab stage it uses to the artifact it applies/)
  const g = graphDoc()
  g.lesson_uses = { 'S6.L2': { 'LAB-3.7': '' } }
  some(g, /lesson_uses › S6\.L2 › LAB-3\.7: must be a non-empty string/)
})

test('pending_crossings: a crossing of the graph, the decision it waits on, and never one that has a substitute', () => {
  const r = loadGraph(yaml('content/kc/graph.yaml'))
  assert.equal(r.graph?.pendingCrossings.length, 1)
  assert.deepEqual({ ...r.graph?.pendingCrossings[0], decision: undefined }, { path: 'builder', kind: 'artifact', from: 'S6.L2', to: 'LAB-3.7', decision: undefined })
  const d = graphDoc()
  delete d.pending_crossings[0].decision
  some(d, /pending_crossings\[0\] › decision: is missing/)
  const e = graphDoc()
  e.pending_crossings[0].artifact = ['S6.L2', 'LAB-3.6']
  some(e, /S6\.L2 does not use LAB-3\.6/)
  const f = graphDoc()
  f.pending_crossings = [...f.pending_crossings, { path: 'builder', artifact: ['LAB-6.6', 'LAB-6.2'], decision: 'x' }]
  some(f, /LAB-6\.6 → LAB-6\.2 on the builder path has a substitute already/)
  const g = graphDoc()
  g.pending_crossings = [...g.pending_crossings, structuredClone(g.pending_crossings[0])]
  some(g, /S6\.L2 → LAB-3\.7 on the builder path is listed twice/)
  const h = graphDoc()
  h.pending_crossings[0].substitute = 'reference-compiler'
  some(h, /unknown key "substitute"/)
})
