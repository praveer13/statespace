// GATE-kc on the real repository, and each planted fault: the gate must fail on the right check, beside whatever
// the unplanted tree already reports, so the gate cannot weaken silently.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkKc } from '../src/check.ts'
import type { KcInputs } from '../src/check.ts'
import { generateModule } from '../src/generate.ts'
import { loadGraph } from '../src/load.ts'
import { PLANTS, selfCheck } from '../../../scripts/verify-kc.mjs'
import { CASE_A, CASE_B, graphDoc, parsePageSource, read, realInputs } from './helpers.ts'

const base = checkKc(realInputs)
const fails = (r: ReturnType<typeof checkKc>, check?: string) => r.findings.filter((f) => f.level === 'fail' && (check === undefined || f.check === check))
const warns = (r: ReturnType<typeof checkKc>) => r.findings.filter((f) => f.level === 'warn')
/** The failures a change adds to the unplanted tree's, so a test holds while other tasks' content lands. */
const baseFails = new Set(fails(base).map((f) => `${f.check}\u0000${f.message}`))
const fresh = (r: ReturnType<typeof checkKc>, check?: string) => fails(r, check).filter((f) => !baseFails.has(`${f.check}\u0000${f.message}`))
/** The real inputs with another graph document and the module it generates, so only the planted change shows. */
const withGraph = (g: unknown): KcInputs => {
  const { graph } = loadGraph(g)
  return { ...realInputs, graphDoc: g, generated: graph === null ? realInputs.generated : generateModule(graph) }
}

test('GATE-kc is green on the repository, with its order and path checks', () => {
  assert.deepEqual(fails(base).map((f) => `${f.check}: ${f.message}`), [])
  const ran = base.summaries.map(([c]) => c)
  for (const c of ['graph', 'generated', 'spine', 'counts', 'dag', 'sources', 'first-taught', 'order', 'labs', 'paths default', 'paths builder', 'tags', 'dose']) assert.ok(ran.includes(c), `${c} ran`)
  assert.equal(base.paths.length, 2)
})

test('the builder path crosses the three crossings spine section 3.0 substitutes, plus S6.L2 before LAB-3.7, labeled pending', () => {
  const builder = base.summaries.find(([c]) => c === 'paths builder')?.[1] ?? ''
  assert.match(builder, /4 crossings: 3 with their substitutes \(D-23, reference-compiler, reference-compiler\) and 1 with none yet, waiting on an owner decision \(S6\.L2 before LAB-3\.7\)/)
  // the summary never claims that every crossing is substituted while one waits
  assert.doesNotMatch(builder, /each with its substitute/)
  const dflt = base.summaries.find(([c]) => c === 'paths default')?.[1] ?? ''
  assert.match(dflt, /nothing crossed/)
  assert.match(dflt, /10 lesson artifact uses are checked/)
})

test('S6.L2 applying the LAB-3.7 decision record before S3 is a warning naming the pending owner decision, at section 3.0', () => {
  const w = warns(base).filter((f) => f.check === 'paths' && /S6\.L2 comes before LAB-3\.7/.test(f.message))
  assert.equal(w.length, 1, warns(base).map((f) => f.message).join('\n'))
  assert.equal(w[0]?.scope, 'builder')
  assert.match(w[0]?.message ?? '', /whose artifact it applies \(the self-transfer decision record its compile plan applies\), and spine section 3\.0's table names no substitute, so the crossing waits on an owner decision \(pending_crossings\): what stands in for the LAB-3\.7 self-transfer decision record/)
  assert.match(w[0]?.where ?? '', /^docs\/spine\/SPINE\.md:[0-9]+$/)
})

test('a lesson artifact use: without its pending entry it fails; a reference module the table does not name fails too', () => {
  const unlabeled = graphDoc()
  unlabeled.pending_crossings = []
  const r1 = checkKc(withGraph(unlabeled))
  assert.deepEqual(fresh(r1).map((f) => f.message), [
    'on the builder path S6.L2 comes before LAB-3.7, whose artifact it applies (the self-transfer decision record its compile plan applies), and names no substitute (substitutes) and no pending owner decision (pending_crossings)',
  ])
  const substituted = graphDoc()
  substituted.pending_crossings = []
  substituted.substitutes = [...substituted.substitutes, { path: 'builder', artifact: ['S6.L2', 'LAB-3.7'], substitute: 'reference-compiler' }]
  const r2 = checkKc(withGraph(substituted))
  assert.deepEqual(fresh(r2).map((f) => f.message), ['section 3.0\'s table of jumps does not name the reference compiler ("reference module, earns nothing") for S6.L2'])
  // a use the default path reaches first fails there too: S1.L1 before LAB-1.3
  const early = graphDoc()
  early.lesson_uses = { ...early.lesson_uses, 'S1.L1': { 'LAB-1.3': 'the guarded encoding' } }
  const r3 = checkKc(withGraph(early))
  assert.ok(fresh(r3).some((f) => f.scope === 'default' && /on the default path S1\.L1 comes before LAB-1\.3, whose artifact it applies \(the guarded encoding\)/.test(f.message)))
  // a lesson no path places (an S10 step built inside earlier labs) cannot carry uses
  const step = graphDoc()
  step.lesson_uses = { ...step.lesson_uses, 'S10.L1': { 'LAB-3.8': 'the parser' } }
  assert.ok(fresh(checkKc(withGraph(step))).some((f) => /S10\.L1 applies lab artifacts \(lesson_uses\) but is not on the default path/.test(f.message)))
})

test('a pending entry that no path needs, or on an unpublished path, fails', () => {
  const stale = graphDoc()
  stale.pending_crossings = [...stale.pending_crossings, { path: 'default', artifact: ['S6.L2', 'LAB-3.7'], decision: 'none needed' }]
  assert.ok(fresh(checkKc(withGraph(stale))).some((f) => /the pending crossing S6\.L2 → LAB-3\.7 is declared for the default path, which does not cross it/.test(f.message)))
  const nowhere = graphDoc()
  nowhere.pending_crossings = [...nowhere.pending_crossings, { path: 'scenic', artifact: ['S6.L2', 'LAB-3.7'], decision: 'x' }]
  assert.ok(fresh(checkKc(withGraph(nowhere))).some((f) => /a pending crossing names the path "scenic"/.test(f.message)))
})

test('a soft edge crossed with a pending entry instead of its substitute is a warning, not a failure', () => {
  const g = graphDoc()
  g.substitutes = g.substitutes.filter((s: { soft_edge?: unknown }) => s.soft_edge === undefined)
  g.pending_crossings = [...g.pending_crossings, { path: 'builder', soft_edge: ['KC-6.rowcount-as-guard', 'KC-3.big-step-errors'], decision: 'which drawer stands in' }]
  const r = checkKc(withGraph(g))
  // the D-23 substitute is gone and the pending entry names the decision instead: labeled, not failed
  assert.deepEqual(fresh(r).map((f) => f.message), [])
  assert.ok(warns(r).some((f) => /crosses the soft edge KC-6\.rowcount-as-guard → KC-3\.big-step-errors .* waits on an owner decision \(pending_crossings\): which drawer stands in/.test(f.message)))
})

test('the spine\'s claim that LAB-8.4 is the first Lane A work on the builder\'s path is reported, not hidden', () => {
  const w = base.findings.filter((f) => f.level === 'warn')
  assert.ok(w.some((f) => f.check === 'paths' && /LAB-8\.4 .* LAB-6\.6 comes earlier/.test(f.message)), w.map((f) => f.message).join('\n'))
})

test('the committed generated module is what content/kc/graph.yaml generates', () => {
  const { graph } = loadGraph(realInputs.graphDoc)
  assert.ok(graph !== null)
  assert.equal(read('packages/kc/src/graph.generated.ts'), generateModule(graph))
})

test('every planted fault fails its check', () => {
  const results = selfCheck(realInputs)
  assert.equal(results.length, PLANTS.length)
  for (const r of results) assert.ok(r.ok, `${r.name}: ${r.detail}`)
})

test('an unreadable content file fails, because its tags cannot be seen', () => {
  const r = checkKc({ ...realInputs, unreadable: [{ file: 'content/audit/AUD-1.1.yaml', message: 'not valid YAML' }] })
  assert.ok(fails(r, 'tags').some((f) => /AUD-1\.1\.yaml: not valid YAML; GATE-kc cannot read its KC tags/.test(f.message)))
})

test('a lesson segment that declares no kcs and holds no tagged item fails; Boot\'s and a drawer\'s are not held to it', () => {
  const prose = { type: 'prose', md: 'Set your week.' }
  const seg = (id: string, blocks: unknown[], kcs?: string[]) => ({ id, title: id, minutes: 2, ...(kcs === undefined ? {} : { kcs }), blocks })
  const tagged = { type: 'item', role: 'prequestion', family: 'GEN-call-it', template: 't1', kcs: ['KC-1.violation-as-sat'] }
  const pages = [
    { file: 'content/stages/S1/S1.L0.md', record: { id: 'S1.L0', tier: 'boot', kcs: [], segments: [seg('s1', [tagged]), seg('s2', [prose])] } },
    { file: 'content/drawers/D-03.md', record: { id: 'D-03', kcs: [], segments: [seg('s1', [prose])] } },
    // s2 declares its KC, so a prose-only segment is tagged
    { file: 'content/stages/S1/S1.L3.md', record: { id: 'S1.L3', tier: 'bridge', kcs: [], segments: [seg('s1', [prose]), seg('s2', [prose], ['KC-1.implication-vacuity'])] } },
  ]
  const r = checkKc({ ...realInputs, pages })
  const msgs = fails(r, 'tags').map((f) => f.message).filter((m) => /^(S1\.L0|D-03|S1\.L3) /.test(m))
  assert.deepEqual(msgs, ['S1.L3 s1 ("s1"): the segment carries no KC tags (it declares no kcs and holds no tagged item)'])
})

test('a segment\'s declared kcs must be KCs of the graph, on any page', () => {
  const pages = [{ file: 'content/drawers/D-03.md', record: { id: 'D-03', kcs: [], segments: [{ id: 's1', title: 'Negation', minutes: 3, kcs: ['KC-1.no-such-kc'], blocks: [{ type: 'prose', md: 'x' }] }] } }]
  assert.deepEqual(fresh(checkKc({ ...realInputs, pages }), 'tags').map((f) => f.message), ['D-03 s1 (segment kcs) is tagged KC-1.no-such-kc, which is not a KC of the graph'])
})

test('a missing or unparsable graph stops the gate with one failure', () => {
  const r = checkKc({ ...realInputs, graphError: 'content/kc/graph.yaml is missing' })
  assert.deepEqual(r.findings.map((f) => f.check), ['graph'])
  assert.equal(r.graph, null)
})

// A lesson source in packages/content's syntax (packages/content/README.md), read by the content pipeline's own
// reader, the way the gate reads authored lessons.
const lessonSource = (exit: boolean): string => `---
id: S1.L2
tier: bridge
title: "Three answers: sat, unsat, unknown"
draft: true
kcs: [KC-1.three-answers, KC-1.unknown-fails-closed]
---

## Three answers {minutes=20}

::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.three-answers,KC-1.unknown-fails-closed

:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow
A query Z3 cannot decide.

\`\`\`python
from z3 import *
\`\`\`

@call key=C
What will Z3 return?

- A. \`sat\`
  - why: a solution exists, but the verdict reports this run.
  - mis: dp:Z6
- B. \`unsat\`
  - why: the constraint has a solution.
  - mis: dp:Z5
- C. \`unknown\`
  - why: the reason names the gap.
:::

::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers,KC-1.unknown-fails-closed
${exit ? '\n::item role=exit family=GEN-which-stamp template=t1 kcs=KC-1.unknown-fails-closed,KC-1.three-answers\n' : ''}`

const withPage = async (text: string): Promise<KcInputs> => {
  const { record } = await parsePageSource(text)
  assert.ok(record !== null)
  return { ...realInputs, pages: [...realInputs.pages.filter((p) => !p.file.endsWith('/S1.L2.md')), { file: 'content/stages/S1/S1.L2.md', record }] }
}

test('a first lesson written in the content syntax with a prequestion, a call and an exit item per KC passes the dose check', async () => {
  const r = checkKc(await withPage(lessonSource(true)))
  const mine = fails(r).filter((f) => /S1\.L2|KC-1\.three-answers|KC-1\.unknown-fails-closed/.test(f.message))
  assert.deepEqual(mine.map((f) => `${f.check}: ${f.message}`), [])
  assert.equal(r.pending.includes('KC-1.three-answers'), false)
  assert.equal(r.pending.includes('KC-1.unknown-fails-closed'), false)
})

test('the same lesson without its exit item fails the dose check for both of its KCs', async () => {
  const r = checkKc(await withPage(lessonSource(false)))
  const dose = fails(r, 'dose').map((f) => f.message).filter((m) => /S1\.L2/.test(m))
  assert.equal(dose.length, 2)
  assert.ok(dose.every((m) => /has no exit item tagged with it/.test(m)))
})

test('case (a): a segment that declares both KCs credits its cell\'s call to both, though its graded item carries one', async () => {
  const r = checkKc(await withPage(CASE_A))
  assert.deepEqual(fresh(r).map((f) => `${f.check}: ${f.message}`), [])
  assert.equal(r.pending.includes('KC-1.three-answers'), false)
  assert.equal(r.pending.includes('KC-1.unknown-fails-closed'), false)
})

test('case (b): a segment that declares one KC credits its cell\'s call to that one only, whatever its items carry', async () => {
  const r = checkKc(await withPage(CASE_B))
  assert.deepEqual(fresh(r).map((f) => `${f.check}: ${f.message}`), ['dose: KC-1.unknown-fails-closed: its first lesson, S1.L2, has no call tagged with it'])
})
