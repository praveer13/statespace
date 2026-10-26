// GATE-kc (spine section 11.2): the pure checks. scripts/verify-kc.mjs reads the files and prints the report.
//
//   graph        content/kc/graph.yaml loads: known keys, ID formats, references inside the graph
//   generated    packages/kc/src/graph.generated.ts is what the graph generates
//   spine        the graph equals spine section 4: KCs, names, stages, threshold flags, requires (hard and soft),
//                confusable edges, the confusable sets and the fading families; first-contact tags match the
//                lesson rows
//   counts       80 to 110 KCs
//   dag          the requires edges form a DAG
//   sources      every KC has an item source; every threshold KC a generator or at least four isomorphs; every
//                family is registered and used in the KC's stage
//   first-taught each KC's declared first lesson is the first lesson or step briefing, in roadmap order, whose row
//                lists it (first-contact tags exempt)
//   order        every requires edge's target is first taught no later than its dependent in roadmap order
//   labs         every lab stage of the spine is in the graph; every stage with a check has KC tags; uses resolve;
//                every lesson that applies a lab artifact (lesson_uses) is a lesson of the spine
//   paths        each published path is a linear extension of the hard edges and of the lab-artifact
//                dependencies, a lab stage's (lab_stages › uses) and a lesson's (lesson_uses); every soft edge or
//                artifact it crosses names its substitute (spine section 3.0's table) or, where the table names
//                none yet, the owner decision it waits on (pending_crossings: a warning, never silent); every
//                substitute and pending entry is used; each tool's first use is covered by its drawer
//   tags         every item, segment, lab check, audit case, specimen, generator template and placement item in
//                content carries KC tags, all of them KCs of the graph (a segment's own kcs included); a lesson
//                item's primary KC is taught at or before the lesson on every path (ASSESSMENT.md section 7.4)
//   dose         every KC's first lesson or step briefing, once authored, holds a prequestion, a call and an exit
//                item tagged with it, a cell's call counting toward its segment's kcs; KCs whose first lesson is
//                not authored yet are listed as pending

import { EXACT } from '@statespace/ids/grammar'
import { readPage, unitsOfRecord } from './content.ts'
import type { Page, RecordKind } from './content.ts'
import { generateModule } from './generate.ts'
import { findCycle } from './graph.ts'
import { GRAPH_PATH, loadGraph } from './load.ts'
import { BUDGET_PATH, expandSelector, resolvePaths } from './paths.ts'
import type { PublishedPath } from './paths.ts'
import { readSpineFacts, SPINE_PATH } from './spine.ts'
import type { MdBlock, SpineFacts } from './spine.ts'
import type { ArtifactUse, Kc, KcGraph, LabStage, Problem } from './types.ts'

export const KC_MIN = 80
export const KC_MAX = 110
/** A threshold KC with no generator needs a bank of at least this many authored isomorphs. */
export const MIN_ISOMORPHS = 4

/** The fields of packages/ids/src/registry.json entries that GATE-kc reads. */
export interface RegistryEntry {
  readonly id: string
  readonly kind: string
  readonly stage?: string
  readonly tier?: string
  readonly kcs?: readonly string[]
  readonly lab?: string
  readonly stretch?: boolean
  readonly usedIn?: string | null
}

export interface KcInputs {
  /** The parsed graph document; ignored when graphError is set. */
  readonly graphDoc: unknown
  readonly graphError: string | null
  readonly spineBlocks: readonly MdBlock[]
  readonly registry: readonly RegistryEntry[]
  readonly budgetDoc: unknown
  readonly budgetError: string | null
  /** Lesson and drawer pages in the shape of lesson@1. */
  readonly pages: readonly { readonly file: string; readonly record: unknown }[]
  readonly records: readonly { readonly file: string; readonly kind: RecordKind; readonly doc: unknown }[]
  /** Content files that could not be read or parsed; GATE-kc cannot see their tags, so each one fails. */
  readonly unreadable: readonly { readonly file: string; readonly message: string }[]
  /** The committed text of packages/kc/src/graph.generated.ts, or null when it is missing. */
  readonly generated: string | null
}

export type Level = 'fail' | 'warn' | 'note'

export interface Finding {
  readonly check: string
  readonly level: Level
  readonly message: string
  readonly where: string | null
  /** A path's id, for path checks. */
  readonly scope: string | null
}

export interface KcReport {
  readonly findings: Finding[]
  /** One line per check that ran, in order: what it covered. */
  readonly summaries: [string, string][]
  readonly graph: KcGraph | null
  readonly paths: PublishedPath[]
  /** KCs whose first lesson is not authored yet, so the dose check could not run on them. */
  readonly pending: string[]
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
const list = (xs: readonly string[], max = 8): string => (xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} and ${xs.length - max} more`)
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x))
const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)

/** The stages a §8.3 Stages cell names: "S1–S9" expanded, "all" as every stage. */
export function stagesOfCell(cell: string | null | undefined): Set<string> | 'all' {
  const t = (cell ?? '').trim()
  if (t === 'all') return 'all'
  const out = new Set<string>()
  for (const m of t.matchAll(/\bS([0-9]+)–S([0-9]+)\b/g)) for (const n of range(Number(m[1]), Number(m[2]))) out.add(`S${n}`)
  for (const m of t.matchAll(/\bS([0-9]+)\b/g)) out.add(`S${m[1]}`)
  return out
}

/** Whether a drawer's "Used in" text names a unit: its own ID, its lab (LAB-3 for LAB-3.8) or its stage (S2). */
export function usedInNames(usedIn: string, unit: string): boolean {
  const tokens = new Set<string>()
  for (const m of usedIn.matchAll(/\b(LAB-[0-9]+)\.([0-9]+)–LAB-[0-9]+\.([0-9]+)\b/g)) for (const n of range(Number(m[2]), Number(m[3]))) tokens.add(`${m[1]}.${n}`)
  for (const m of usedIn.matchAll(/\b(?:LAB-[0-9]+(?:\.[0-9]+)?|S[0-9]+(?:\.L[0-9]+)?)\b/g)) tokens.add(m[0])
  const lab = /^(LAB-[0-9]+)\./.exec(unit)?.[1]
  const stage = /^LAB-([0-9]+)\./.exec(unit)?.[1] ?? /^S([0-9]+)\./.exec(unit)?.[1]
  return tokens.has(unit) || (lab !== undefined && tokens.has(lab)) || (stage !== undefined && tokens.has(`S${stage}`))
}

export function checkKc(inputs: KcInputs): KcReport {
  const findings: Finding[] = []
  const summaries: [string, string][] = []
  const add = (check: string, level: Level, message: string, where: string | null = null, scope: string | null = null): void => {
    findings.push({ check, level, message, where, scope })
  }
  const fromProblems = (check: string, ps: readonly Problem[], level: Level = 'fail'): void => {
    for (const p of ps) add(check, level, p.message, p.where)
  }
  const failsOf = (check: string, scope: string | null = null): number => findings.filter((f) => f.check === check && f.level === 'fail' && (scope === null || f.scope === scope)).length

  // ------------------------------------------------------------------ the graph
  if (inputs.graphError !== null) {
    add('graph', 'fail', inputs.graphError, GRAPH_PATH)
    return { findings, summaries, graph: null, paths: [], pending: [] }
  }
  const loaded = loadGraph(inputs.graphDoc)
  fromProblems('graph', loaded.problems)
  const graph = loaded.graph
  if (graph === null) return { findings, summaries, graph: null, paths: [], pending: [] }
  summaries.push(['graph', `${GRAPH_PATH} loads: ${plural(graph.kcs.length, 'KC')} (${graph.kcs.filter((k) => k.threshold).length} threshold), ${plural(graph.confusableSets.length, 'confusable set')}, ${plural(graph.fadingFamilies.length, 'fading family', 'fading families')}, ${plural(graph.labStages.length, 'lab stage')}, ${plural(Object.keys(graph.lessonUses).length, 'lesson')} applying lab artifacts, ${plural(graph.substitutes.softEdges.length + graph.substitutes.artifacts.length, 'substitute')}, ${plural(graph.pendingCrossings.length, 'pending crossing')}`])

  const kcOf = new Map<string, Kc>(graph.kcs.map((k) => [k.id, k]))

  // ------------------------------------------------------------------ the generated module
  const want = generateModule(graph)
  if (inputs.generated === null) add('generated', 'fail', 'packages/kc/src/graph.generated.ts is missing; run `node scripts/verify-kc.mjs --write`', 'packages/kc/src/graph.generated.ts')
  else if (inputs.generated !== want) add('generated', 'fail', 'packages/kc/src/graph.generated.ts is out of date; run `node scripts/verify-kc.mjs --write`', 'packages/kc/src/graph.generated.ts')
  else summaries.push(['generated', 'packages/kc/src/graph.generated.ts is what the graph generates'])

  // ------------------------------------------------------------------ the spine
  const spineRead = readSpineFacts(inputs.spineBlocks)
  fromProblems('spine', spineRead.problems)
  const spine: SpineFacts = spineRead.facts
  {
    const sIds = spine.kcs.map((k) => k.id)
    const gIds = graph.kcs.map((k) => k.id)
    const missing = sIds.filter((id) => !kcOf.has(id))
    const extra = gIds.filter((id) => !sIds.includes(id))
    if (missing.length > 0) add('spine', 'fail', `the graph lacks ${plural(missing.length, 'KC')} of spine section 4: ${list(missing)}`, GRAPH_PATH)
    if (extra.length > 0) add('spine', 'fail', `the graph has ${plural(extra.length, 'KC')} that spine section 4 does not: ${list(extra)}`, GRAPH_PATH)
    if (missing.length === 0 && extra.length === 0) {
      const at = gIds.findIndex((id, i) => id !== sIds[i])
      if (at >= 0) add('spine', 'fail', `the graph lists the KCs in another order than spine section 4, first at ${gIds[at]} (the spine has ${sIds[at]})`, GRAPH_PATH)
    }
    for (const s of spine.kcs) {
      const g = kcOf.get(s.id)
      if (g === undefined) continue
      const where = `${SPINE_PATH}:${s.line}`
      const diff = (what: string, a: string, b: string): void => add('spine', 'fail', `${s.id}: ${what} differs: the spine has ${a}, the graph ${b}`, where)
      if (g.name !== s.name) diff('the name', JSON.stringify(s.name), JSON.stringify(g.name))
      if (g.stage !== s.stage) diff('the stage', s.stage, g.stage)
      if (g.threshold !== s.threshold) diff('the threshold flag', String(s.threshold), String(g.threshold))
      if (!sameSet(g.requires, s.requires)) diff('requires', list(s.requires) || '—', list(g.requires) || '—')
      if (!sameSet(g.requiresSoft, s.requiresSoft)) diff('the soft requires', list(s.requiresSoft) || '—', list(g.requiresSoft) || '—')
      if (!sameSet(g.confusable, s.confusable)) diff('confusable', list(s.confusable) || '—', list(g.confusable) || '—')
    }
    const setIds = spine.sets.map((s) => s.id)
    if (setIds.join(' ') !== graph.confusableSets.map((s) => s.id).join(' ')) add('spine', 'fail', `the confusable sets are ${graph.confusableSets.map((s) => s.id).join(', ')} in the graph and ${setIds.join(', ')} in the spine`, GRAPH_PATH)
    for (const s of spine.sets) {
      const g = graph.confusableSets.find((x) => x.id === s.id)
      if (g === undefined) continue
      const where = `${SPINE_PATH}:${s.line}`
      if (g.name !== s.name) add('spine', 'fail', `set ${s.id}: the name is "${s.name}" in the spine, "${g.name}" in the graph`, where)
      if (g.discriminate !== s.discriminate) add('spine', 'fail', `set ${s.id}: "Discriminate between" differs from the spine`, where)
      if (!sameSet(g.kcs, s.kcs)) add('spine', 'fail', `set ${s.id}: the KCs are ${list(s.kcs)} in the spine, ${list(g.kcs)} in the graph`, where)
      if (g.auditFamilies !== s.auditFamilies) add('spine', 'fail', `set ${s.id}: the spine ${s.auditFamilies ? 'includes' : 'does not include'} the audit families`, where)
      if (g.opens !== s.opens || (g.opensNote ?? null) !== (s.opensNote ?? null)) add('spine', 'fail', `set ${s.id}: opens "${s.opens}${s.opensNote === null ? '' : ` (${s.opensNote})`}" in the spine, "${g.opens}${g.opensNote === null ? '' : ` (${g.opensNote})`}" in the graph`, where)
    }
    const famIds = spine.families.map((f) => f.id)
    if (famIds.join(' ') !== graph.fadingFamilies.map((f) => f.id).join(' ')) add('spine', 'fail', `the fading families are ${graph.fadingFamilies.map((f) => f.id).join(', ')} in the graph and ${famIds.join(', ')} in the spine`, GRAPH_PATH)
    for (const f of spine.families) {
      const g = graph.fadingFamilies.find((x) => x.id === f.id)
      if (g === undefined) continue
      if (g.kc !== f.kc || g.name !== f.name) add('spine', 'fail', `${f.id}: the spine has "${f.name}" on ${f.kc}, the graph "${g.name}" on ${g.kc}`, `${SPINE_PATH}:${f.line}`)
    }
    const fcSpine = [...spine.firstContact.entries()].map(([l, ks]) => `${[...ks].sort().join(', ')} in ${l}`).sort()
    const fcGraph = Object.entries(graph.firstContact).map(([l, ks]) => `${[...ks].sort().join(', ')} in ${l}`).sort()
    if (fcSpine.join(' ') !== fcGraph.join(' ')) add('spine', 'fail', `first contact: the lesson rows mark ${fcSpine.join('; ') || 'none'}, the graph declares ${fcGraph.join('; ') || 'none'}`, GRAPH_PATH)
    if (failsOf('spine') === 0) summaries.push(['spine', `the graph equals spine section 4: ${plural(spine.kcs.length, 'KC')} with names, stages, threshold flags, ${spine.kcs.reduce((a, k) => a + k.requires.length, 0)} hard and ${spine.kcs.reduce((a, k) => a + k.requiresSoft.length, 0)} soft requires edges and ${spine.kcs.reduce((a, k) => a + k.confusable.length, 0)} confusable edges; sets ${setIds.join(', ')}; families ${famIds.join(', ')}; first contact: ${fcSpine.join('; ') || 'none'}`])
  }

  // ------------------------------------------------------------------ counts and the DAG
  const n = graph.kcs.length
  if (n < KC_MIN || n > KC_MAX) add('counts', 'fail', `the graph holds ${n} KCs; spine section 11.2 allows ${KC_MIN} to ${KC_MAX}`, GRAPH_PATH)
  else summaries.push(['counts', `${n} KCs, inside ${KC_MIN}–${KC_MAX}; ${graph.kcs.filter((k) => k.threshold).length} threshold`])
  const cycle = findCycle(graph)
  if (cycle !== null) add('dag', 'fail', `the requires edges have a cycle: ${[...cycle, cycle[0]].join(' requires ')}`, GRAPH_PATH)
  else summaries.push(['dag', `${graph.kcs.reduce((a, k) => a + k.requires.length + k.requiresSoft.length, 0)} requires edges form a DAG`])

  // ------------------------------------------------------------------ item sources
  const generators = new Map(inputs.registry.filter((e) => e.kind === 'generator').map((e) => [e.id, e]))
  for (const k of graph.kcs) {
    const where = `${GRAPH_PATH} kcs › ${k.id}`
    if (k.families.length === 0 && k.bank === null) add('sources', 'fail', `${k.id} has no item source: no generator family and no bank of isomorphs`, where)
    if (k.threshold && k.families.length === 0 && (k.bank?.isomorphs ?? 0) < MIN_ISOMORPHS) add('sources', 'fail', `${k.id} is a threshold KC with no generator and ${k.bank?.isomorphs ?? 0} authored isomorphs; it needs a generator or at least ${MIN_ISOMORPHS}`, where)
    for (const f of k.families) {
      const g = generators.get(f)
      if (g === undefined) {
        add('sources', 'fail', `${k.id}: ${f} is not a registered generator family (spine section 8.3)`, where)
        continue
      }
      const st = stagesOfCell(g.usedIn)
      if (st !== 'all' && !st.has(k.stage)) add('sources', 'fail', `${k.id}: ${f} is not used in ${k.stage} (spine section 8.3 Stages: ${g.usedIn ?? '—'}), so it cannot serve this KC's items`, where)
    }
  }
  if (failsOf('sources') === 0) summaries.push(['sources', `every KC has an item source; the ${graph.kcs.filter((k) => k.threshold).length} threshold KCs each have a generator family, and every family is registered and used in its KC's stage`])

  // ------------------------------------------------------------------ first taught, in roadmap order
  const lessons = inputs.registry.filter((e) => e.kind === 'lesson')
  const lessonOrder = new Map(lessons.map((l, i) => [l.id, i]))
  const isFirstContact = (lesson: string, kc: string): boolean => (graph.firstContact[lesson] ?? []).includes(kc as never)
  const teaches = (lessonId: string, kc: string): boolean => (lessons.find((l) => l.id === lessonId)?.kcs ?? []).includes(kc) && !isFirstContact(lessonId, kc)
  const firstIn = (order: readonly string[], kc: string): string | null => order.find((l) => teaches(l, kc)) ?? null
  const roadmap = lessons.map((l) => l.id)
  for (const k of graph.kcs) {
    const computed = firstIn(roadmap, k.id)
    if (computed === null) add('first-taught', 'fail', `${k.id} is taught by no lesson or step briefing (no spine lesson row lists it, first contact aside)`, GRAPH_PATH)
    else if (computed !== k.firstTaught) add('first-taught', 'fail', `${k.id}: the graph says it is first taught in ${k.firstTaught}, but the first lesson whose row lists it is ${computed}`, `${GRAPH_PATH} kcs › ${k.id}`)
  }
  if (failsOf('first-taught') === 0) summaries.push(['first-taught', `every KC's first lesson or step briefing is the one the spine's lesson rows give, first-contact tags exempt (${Object.entries(graph.firstContact).map(([l, ks]) => `${ks.join(', ')} in ${l}`).join('; ')})`])

  // ------------------------------------------------------------------ order: requires targets first, in roadmap order
  let edgesChecked = 0
  for (const k of graph.kcs) {
    for (const r of [...k.requires, ...k.requiresSoft]) {
      const t = kcOf.get(r)
      if (t === undefined) continue
      edgesChecked++
      const a = lessonOrder.get(k.firstTaught)
      const b = lessonOrder.get(t.firstTaught)
      if (a === undefined || b === undefined) continue
      if (b > a) add('order', 'fail', `${k.id} (first taught in ${k.firstTaught}) requires ${r}${k.requiresSoft.includes(r) ? ' (soft)' : ''}, which is first taught later, in ${t.firstTaught}`, `${GRAPH_PATH} kcs › ${k.id}`)
    }
  }
  if (failsOf('order') === 0) summaries.push(['order', `${edgesChecked} requires edges: each target is first taught no later than its dependent in roadmap order`])

  // ------------------------------------------------------------------ lab stages
  const regStages = inputs.registry.filter((e) => e.kind === 'lab-stage')
  const regChecks = inputs.registry.filter((e) => e.kind === 'lab-check')
  const stageOf = new Map<string, LabStage>(graph.labStages.map((s) => [s.id, s]))
  for (const r of regStages) {
    const s = stageOf.get(r.id)
    if (s === undefined) add('labs', 'fail', `${r.id} (a lab stage of the spine) is not in the graph's lab_stages`, GRAPH_PATH)
    else if (s.stretch !== (r.stretch === true)) add('labs', 'fail', `${r.id}: the spine ${r.stretch === true ? 'marks it [stretch]' : 'plans it'}, the graph says stretch: ${s.stretch}`, `${GRAPH_PATH} lab_stages › ${r.id}`)
  }
  for (const s of graph.labStages) {
    if (!regStages.some((r) => r.id === s.id)) add('labs', 'fail', `${s.id} is not a lab stage of the spine`, `${GRAPH_PATH} lab_stages › ${s.id}`)
    const checks = regChecks.filter((c) => c.stage === s.id).map((c) => c.id)
    if (checks.length > 0 && s.kcs.length === 0) add('labs', 'fail', `${s.id} has ${list(checks)} but no KC tags (every lab check carries KC tags)`, `${GRAPH_PATH} lab_stages › ${s.id}`)
    if (s.after !== null && !lessonOrder.has(s.after) && !regStages.some((r) => r.id === s.after)) add('labs', 'fail', `${s.id} follows ${s.after}, which is no lesson or lab stage of the spine`, `${GRAPH_PATH} lab_stages › ${s.id}`)
  }
  {
    // the artifact dependencies themselves must be acyclic, or no path can extend them
    const state = new Map<string, 'open' | 'done'>()
    const stack: string[] = []
    let loop: string[] | null = null
    const visit = (id: string): void => {
      if (loop !== null) return
      state.set(id, 'open')
      stack.push(id)
      for (const u of stageOf.get(id)?.uses ?? []) {
        if (state.get(u.stage) === 'open') loop = [...stack.slice(stack.indexOf(u.stage)), u.stage]
        else if (!state.has(u.stage)) visit(u.stage)
      }
      stack.pop()
      state.set(id, 'done')
    }
    for (const s of graph.labStages) if (!state.has(s.id)) visit(s.id)
    if (loop !== null) add('labs', 'fail', `the lab-artifact dependencies have a cycle: ${(loop as string[]).join(' uses ')}`, GRAPH_PATH)
  }
  for (const lesson of Object.keys(graph.lessonUses)) {
    if (!lessonOrder.has(lesson)) add('labs', 'fail', `lesson_uses names ${lesson}, which is no lesson of the spine`, `${GRAPH_PATH} lesson_uses › ${lesson}`)
  }
  const lessonUseCount = Object.values(graph.lessonUses).reduce((a, us) => a + us.length, 0)
  if (failsOf('labs') === 0) summaries.push(['labs', `${plural(graph.labStages.length, 'lab stage')} (${graph.labStages.filter((s) => s.stretch).length} [stretch]) as the spine lists them; every stage with a check has KC tags; ${graph.labStages.reduce((a, s) => a + s.uses.length, 0)} artifact dependencies, acyclic; ${plural(lessonUseCount, 'lab artifact')} applied by ${plural(Object.keys(graph.lessonUses).length, 'lesson')} of the spine`])

  // ------------------------------------------------------------------ the published paths
  let paths: PublishedPath[] = []
  if (inputs.budgetError !== null) add('paths', 'fail', inputs.budgetError, BUDGET_PATH)
  else {
    const resolved = resolvePaths(
      inputs.budgetDoc,
      lessons.map((l) => ({ id: l.id, stage: l.stage ?? '', tier: l.tier ?? '' })),
      regStages.map((s) => ({ id: s.id, lab: s.lab ?? '', stretch: s.stretch === true })),
      graph.labStages.filter((s) => s.stretch),
    )
    fromProblems('paths', resolved.problems)
    paths = resolved.paths
    for (const id of ['default', 'builder']) if (!paths.some((p) => p.id === id)) add('paths', 'fail', `${BUDGET_PATH} has no "${id}" path`, BUDGET_PATH)
    for (const sub of [...graph.substitutes.softEdges, ...graph.substitutes.artifacts]) {
      if (!paths.some((p) => p.id === sub.path)) add('paths', 'fail', `a substitute names the path "${sub.path}", which ${BUDGET_PATH} does not publish`, GRAPH_PATH)
    }
    for (const x of graph.pendingCrossings) {
      if (!paths.some((p) => p.id === x.path)) add('paths', 'fail', `a pending crossing names the path "${x.path}", which ${BUDGET_PATH} does not publish`, GRAPH_PATH)
    }
  }
  const drawers = new Map(inputs.registry.filter((e) => e.kind === 'drawer').map((e) => [e.id, e]))
  const jumpText = (j: SpineFacts['jumps'][number]): string => `${j.jump} | ${j.crossed} | ${j.substitute}`
  for (const p of paths) {
    const before = findings.length
    const scope = p.id
    const where = `${BUDGET_PATH} paths.${p.id}`
    const order = p.units.filter((u) => u.kind === 'lesson').map((u) => u.id)
    const fpos = new Map<string, number>()
    for (const k of graph.kcs) {
      const l = firstIn(order, k.id)
      if (l === null) add('paths', 'fail', `${k.id} is taught by no lesson on the ${p.id} path`, where, scope)
      else fpos.set(k.id, p.position.get(l) ?? -1)
    }
    const firstLesson = (kc: string): string => p.units[fpos.get(kc) ?? -1]?.id ?? '?'

    // the lessons the spine prints for the path
    const lessonsOf = (stage: string): string[] => lessons.filter((l) => l.stage === stage && l.tier !== 'step').map((l) => l.id)
    const nonStep = order.filter((l) => lessons.find((x) => x.id === l)?.tier !== 'step')
    let spineOrder: string[] | null = null
    if (p.id === 'default') spineOrder = lessons.filter((l) => l.tier !== 'step').map((l) => l.id)
    else if (p.id === 'builder' && spine.builderPath !== null) {
      spineOrder = []
      for (const tok of spine.builderPath.tokens) {
        if (EXACT.stage.test(tok)) spineOrder.push(...lessonsOf(tok))
        else spineOrder.push(...(expandSelector(tok) ?? [tok]))
      }
    }
    if (spineOrder !== null && spineOrder.join(' ') !== nonStep.join(' ')) {
      const at = spineOrder.findIndex((l, i) => l !== nonStep[i])
      add('paths', 'fail', `the lessons of the ${p.id} path differ from spine section 3.0 at lesson ${Math.max(at, 0) + 1}: the spine has ${spineOrder[at] ?? 'none'}, ${BUDGET_PATH} has ${nonStep[at] ?? 'none'}`, p.id === 'builder' && spine.builderPath !== null ? `${SPINE_PATH}:${spine.builderPath.line}` : where, scope)
    }

    // Every crossing has a substitute that section 3.0's table names, or a pending entry naming the owner decision
    // it waits on, which is reported as a warning so the gap stays plain; a crossing with neither fails.
    let crossed = 0
    const substitutedHere: string[] = []
    const pendingHere: string[] = []
    const pendingFor = (kind: 'soft-edge' | 'artifact', from: string, to: string) => graph.pendingCrossings.find((x) => x.path === p.id && x.kind === kind && x.from === from && x.to === to)
    const jumpTable = spine.jumps[0] === undefined ? SPINE_PATH : `${SPINE_PATH}:${spine.jumps[0].line}`
    const unlabeled = '(substitutes) and no pending owner decision (pending_crossings)'

    // hard and soft requires edges
    for (const k of graph.kcs) {
      const a = fpos.get(k.id)
      if (a === undefined) continue
      for (const r of k.requires) {
        const b = fpos.get(r)
        if (b !== undefined && b > a) add('paths', 'fail', `${k.id} (first taught in ${firstLesson(k.id)}) requires ${r} through a hard edge, but ${r} is first taught later on the ${p.id} path, in ${firstLesson(r)}`, where, scope)
      }
      for (const r of k.requiresSoft) {
        const b = fpos.get(r)
        if (b === undefined || b <= a) continue
        crossed++
        const sub = graph.substitutes.softEdges.find((s) => s.path === p.id && s.from === k.id && s.to === r)
        if (sub === undefined) {
          const pend = pendingFor('soft-edge', k.id, r)
          if (pend === undefined) add('paths', 'fail', `the ${p.id} path crosses the soft edge ${k.id} → ${r} (${firstLesson(k.id)} before ${firstLesson(r)}) and names no substitute ${unlabeled}`, where, scope)
          else {
            pendingHere.push(`${k.id} → ${r}`)
            add('paths', 'warn', `the ${p.id} path crosses the soft edge ${k.id} → ${r} (${firstLesson(k.id)} before ${firstLesson(r)}), and spine section 3.0's table names no substitute, so the crossing waits on an owner decision (pending_crossings): ${pend.decision}`, jumpTable, scope)
          }
          continue
        }
        substitutedHere.push(sub.substitute)
        const d = drawers.get(sub.substitute)
        if (d === undefined) add('paths', 'fail', `the substitute ${sub.substitute} for ${k.id} → ${r} is not a drawer of spine section 3.12`, GRAPH_PATH, scope)
        else if (!usedInNames(d.usedIn ?? '', firstLesson(k.id))) add('paths', 'fail', `${sub.substitute}'s "Used in" (${d.usedIn ?? '—'}) does not name ${firstLesson(k.id)}, where the ${p.id} path crosses ${k.id} → ${r}`, SPINE_PATH, scope)
        const row = spine.jumps.find((j) => jumpText(j).includes(sub.substitute) && jumpText(j).includes(k.id) && jumpText(j).includes(r))
        if (row === undefined) add('paths', 'fail', `section 3.0's table of jumps names no substitute ${sub.substitute} for ${k.id} → ${r}`, SPINE_PATH, scope)
      }
    }
    for (const s of graph.substitutes.softEdges.filter((x) => x.path === p.id)) {
      const a = fpos.get(s.from)
      const b = fpos.get(s.to)
      if (a !== undefined && b !== undefined && b <= a) add('paths', 'fail', `the substitute ${s.substitute} for ${s.from} → ${s.to} is declared for the ${p.id} path, which does not cross that edge`, GRAPH_PATH, scope)
    }

    // An artifact use that the path reaches before the lab stage that builds the artifact: a lab stage's (verb
    // "uses") or a lesson's (verb "applies").
    const artifactCrossing = (unit: string, use: ArtifactUse, verb: string): void => {
      crossed++
      const sub = graph.substitutes.artifacts.find((x) => x.path === p.id && x.unit === unit && x.uses === use.stage)
      if (sub === undefined) {
        const pend = pendingFor('artifact', unit, use.stage)
        if (pend === undefined) add('paths', 'fail', `on the ${p.id} path ${unit} comes before ${use.stage}, whose artifact it ${verb} (${use.artifact}), and names no substitute ${unlabeled}`, where, scope)
        else {
          pendingHere.push(`${unit} before ${use.stage}`)
          add('paths', 'warn', `on the ${p.id} path ${unit} comes before ${use.stage}, whose artifact it ${verb} (${use.artifact}), and spine section 3.0's table names no substitute, so the crossing waits on an owner decision (pending_crossings): ${pend.decision}`, jumpTable, scope)
        }
        return
      }
      substitutedHere.push(sub.substitute)
      const mod = graph.referenceModules.find((m) => m.id === sub.substitute)
      const row = mod === undefined ? undefined : spine.jumps.find((j) => jumpText(j).includes(unit) && jumpText(j).includes(mod.what) && spine.jumps.some((x) => jumpText(x).includes(mod.label)))
      if (mod !== undefined && row === undefined) add('paths', 'fail', `section 3.0's table of jumps does not name the ${mod.what} ("${mod.label}") for ${unit}`, SPINE_PATH, scope)
    }

    // lab stages: their KC tags and the artifacts they use
    let deps = 0
    for (const u of p.units.filter((x) => x.kind === 'lab-stage')) {
      const s = stageOf.get(u.id)
      if (s === undefined) continue
      if (!s.firstContact) {
        for (const k of s.kcs) {
          const b = fpos.get(k)
          deps++
          if (b !== undefined && b > u.index) add('paths', 'fail', `${s.id} exercises ${k}, which the ${p.id} path first teaches later, in ${firstLesson(k)}`, where, scope)
        }
      }
      for (const use of s.uses) {
        deps++
        const b = p.position.get(use.stage)
        if (b === undefined) {
          add('paths', 'fail', `${s.id} uses ${use.stage} (${use.artifact}), which is not on the ${p.id} path`, where, scope)
          continue
        }
        if (b > u.index) artifactCrossing(s.id, use, 'uses')
      }
    }

    // lessons: the lab artifacts they apply
    let lessonDeps = 0
    for (const [lesson, uses] of Object.entries(graph.lessonUses)) {
      const at = p.position.get(lesson)
      if (at === undefined) {
        if (lessonOrder.has(lesson)) add('paths', 'fail', `${lesson} applies lab artifacts (lesson_uses) but is not on the ${p.id} path, so the order cannot be checked`, where, scope)
        continue
      }
      for (const use of uses) {
        lessonDeps++
        const b = p.position.get(use.stage)
        if (b === undefined) {
          add('paths', 'fail', `${lesson} applies the artifact of ${use.stage} (${use.artifact}), which is not on the ${p.id} path`, where, scope)
          continue
        }
        if (b > at) artifactCrossing(lesson, use, 'applies')
      }
    }

    // every substitute and pending entry declared for the path is for a crossing the path makes
    for (const s of graph.substitutes.artifacts.filter((x) => x.path === p.id)) {
      const a = p.position.get(s.unit)
      const b = p.position.get(s.uses)
      if (a !== undefined && b !== undefined && b < a) add('paths', 'fail', `the substitute ${s.substitute} for ${s.unit} using ${s.uses} is declared for the ${p.id} path, which builds ${s.uses} first`, GRAPH_PATH, scope)
    }
    for (const x of graph.pendingCrossings.filter((y) => y.path === p.id)) {
      const a = x.kind === 'soft-edge' ? fpos.get(x.from) : p.position.get(x.from)
      const b = x.kind === 'soft-edge' ? fpos.get(x.to) : p.position.get(x.to)
      if (a !== undefined && b !== undefined && b <= a) add('paths', 'fail', `the pending crossing ${x.from} → ${x.to} is declared for the ${p.id} path, which does not cross it; remove it from pending_crossings`, GRAPH_PATH, scope)
    }

    // tools: the first stage that uses each must be one its drawer covers
    for (const t of graph.tools) {
      const first = p.units.find((u) => u.kind === 'lab-stage' && (stageOf.get(u.id)?.tools ?? []).includes(t.id))
      if (first === undefined) continue
      const d = drawers.get(t.drawer)
      if (d === undefined) {
        add('paths', 'fail', `the tool ${t.id} names ${t.drawer}, which is not a drawer of spine section 3.12`, GRAPH_PATH, scope)
        continue
      }
      const usedIn = d.usedIn ?? ''
      if (!usedInNames(usedIn, first.id)) add('paths', 'fail', `on the ${p.id} path the first stage that needs ${t.what} is ${first.id}, which ${t.drawer}'s "Used in" (${usedIn}) does not name`, SPINE_PATH, scope)
      if (p.id === 'builder') {
        const claim = /(LAB-[0-9]+(?:\.[0-9]+)?) \(first on the builder's path\)/.exec(usedIn)?.[1] ?? /on the builder's path, [^;]*?\((LAB-[0-9]+(?:\.[0-9]+)?)\) first/.exec(usedIn)?.[1]
        if (claim !== undefined && claim !== first.id && !first.id.startsWith(`${claim}.`)) {
          const claimed = p.position.get(claim)
          const why = claimed !== undefined && claimed < first.index
            ? `but the graph does not list ${t.id} among ${claim}'s tools (lab_stages › ${claim} › tools), so the first stage that needs it is ${first.id}`
            : `but ${first.id} comes earlier on that path and needs it too (lab_stages › ${first.id} › tools)`
          add('paths', 'warn', `${t.drawer}'s "Used in" names ${claim} as the first stage on the builder's path that needs ${t.what}, ${why}; ${t.drawer} still covers ${first.id}, so the path holds`, SPINE_PATH, scope)
        }
      }
    }
    if (findings.slice(before).every((f) => f.level !== 'fail')) {
      const crossings =
        crossed === 0
          ? 'nothing crossed'
          : pendingHere.length === 0
            ? `${plural(crossed, 'crossing')}, each with its substitute (${substitutedHere.join(', ')})`
            : `${plural(crossed, 'crossing')}: ${substitutedHere.length} with ${substitutedHere.length === 1 ? 'its substitute' : 'their substitutes'}${substitutedHere.length === 0 ? '' : ` (${substitutedHere.join(', ')})`} and ${pendingHere.length} with none yet, waiting on an owner decision (${pendingHere.join('; ')})`
      summaries.push([`paths ${p.id}`, `${p.label}: ${plural(p.units.length, 'unit')}; the hard requires edges and ${deps} lab dependencies hold, and ${plural(lessonDeps, 'lesson artifact use')} ${lessonDeps === 1 ? 'is' : 'are'} checked; ${crossings}; tools first used where their drawers say`])
    }
  }

  // ------------------------------------------------------------------ tags in content
  const pages: Page[] = []
  for (const pg of inputs.pages) {
    const r = readPage(pg.record, pg.file)
    fromProblems('tags', r.problems)
    if (r.page !== null) pages.push(r.page)
  }
  for (const u of inputs.unreadable) add('tags', 'fail', `${u.file}: ${u.message}; GATE-kc cannot read its KC tags`, u.file)
  const unknownTag = (tags: readonly string[], ref: string, file: string): void => {
    for (const t of tags) if (!kcOf.has(t)) add('tags', 'fail', `${ref} is tagged ${t}, which is not a KC of the graph`, file)
  }
  let units = 0
  for (const pg of pages) {
    unknownTag(pg.kcs, `${pg.id} (page kcs)`, pg.file)
    for (const s of pg.segments) unknownTag(s.declared, `${pg.id} ${s.id} (segment kcs)`, pg.file)
    for (const it of pg.items) {
      units++
      if (it.kcs.length === 0) add('tags', 'fail', `${pg.id} ${it.ref}: the item carries no KC tags`, pg.file)
      unknownTag(it.kcs, `${pg.id} ${it.ref}`, pg.file)
      const primary = it.kcs[0]
      if (pg.kind === 'lesson' && primary !== undefined && kcOf.has(primary) && !isFirstContact(pg.id, primary)) {
        for (const p of paths) {
          const lp = p.position.get(pg.id)
          const fl = (() => {
            const l = firstIn(p.units.filter((u) => u.kind === 'lesson').map((u) => u.id), primary)
            return l === null ? undefined : p.position.get(l)
          })()
          if (lp !== undefined && fl !== undefined && fl > lp) add('tags', 'fail', `${pg.id} ${it.ref}: its primary KC ${primary} is first taught after ${pg.id} on the ${p.id} path (in ${p.units[fl]?.id ?? '?'})`, pg.file)
        }
      }
    }
    // A lesson segment carries KC tags (spine section 4): the ones it declares (lesson@1's segment kcs, written
    // `## Title {minutes=N kcs=...}`), else those of the graded items it holds, else its prequestions'. Boot is held
    // to its own anatomy (a call, a reveal, cards; spine section 3.1) and a drawer to none (curriculum/D-drawers.md
    // section 1.7), so the rule reads core and bridge lessons and step briefings.
    const tier = lessons.find((l) => l.id === pg.id)?.tier
    if (pg.kind === 'lesson' && (tier === 'core' || tier === 'bridge' || tier === 'step')) {
      for (const s of pg.segments) {
        units++
        if (s.kcs.length === 0) add('tags', 'fail', `${pg.id} ${s.id}${s.title === '' ? '' : ` ("${s.title}")`}: the segment carries no KC tags (it declares no kcs and holds no tagged item)`, pg.file)
      }
    }
  }
  const byKind = new Map<string, number>()
  for (const rec of inputs.records) {
    const r = unitsOfRecord(rec.doc, rec.file, rec.kind)
    fromProblems('tags', r.problems)
    for (const u of r.units) {
      units++
      byKind.set(u.kind, (byKind.get(u.kind) ?? 0) + 1)
      let tags = u.kcs
      if (tags.length === 0 && u.graphTagged) {
        const stage = regChecks.find((c) => c.id === u.ref)?.stage
        tags = (stage === undefined ? undefined : stageOf.get(stage)?.kcs) ?? []
      }
      if (tags.length === 0) add('tags', 'fail', `${u.ref} (${u.kind}) carries no KC tags`, u.file)
      unknownTag(u.kcs, `${u.ref} (${u.kind})`, u.file)
    }
  }
  if (failsOf('tags') === 0) {
    const kinds = [...byKind.entries()].map(([k, c]) => plural(c, k)).join(', ')
    const segs = pages.flatMap((p) => p.segments)
    summaries.push(['tags', `${plural(units, 'content unit')} tagged with KCs of the graph: ${plural(pages.reduce((a, p) => a + p.items.length, 0), 'item')} and ${plural(segs.length, 'segment')} (${segs.filter((s) => s.declared.length > 0).length} declaring their own kcs) on ${plural(pages.length, 'page')}${kinds === '' ? '' : `, ${kinds}`}; every lesson item's primary KC is taught at or before its lesson on every path`])
  }

  // ------------------------------------------------------------------ the in-lesson dose
  const pending: string[] = []
  let dosed = 0
  for (const k of graph.kcs) {
    const pg = pages.find((x) => x.id === k.firstTaught)
    if (pg === undefined) {
      pending.push(k.id)
      continue
    }
    dosed++
    const missing: string[] = []
    if (!pg.items.some((i) => i.role === 'prequestion' && i.kcs.includes(k.id))) missing.push('prequestion')
    if (!pg.calls.some((c) => c.kcs.includes(k.id))) missing.push('call')
    if (!pg.items.some((i) => i.role === 'exit' && i.kcs.includes(k.id))) missing.push('exit item')
    if (missing.length > 0) add('dose', 'fail', `${k.id}: its first ${lessons.find((l) => l.id === pg.id)?.tier === 'step' ? 'step briefing' : 'lesson'}, ${pg.id}, has no ${missing.join(', no ')} tagged with it`, pg.file)
  }
  if (pending.length > 0) {
    const byLesson = new Map<string, number>()
    for (const id of pending) {
      const l = kcOf.get(id)?.firstTaught ?? '?'
      byLesson.set(l, (byLesson.get(l) ?? 0) + 1)
    }
    const waiting = [...byLesson.keys()].sort((a, b) => (lessonOrder.get(a) ?? 0) - (lessonOrder.get(b) ?? 0))
    add('dose', 'note', `${plural(pending.length, 'KC')} wait for their first lesson or step briefing to be authored (${plural(byLesson.size, 'page')}: ${list(waiting, 6)}); the check runs on each once its page exists`)
  }
  if (failsOf('dose') === 0) summaries.push(['dose', dosed === 0 ? 'no KC\'s first lesson is authored yet' : `${plural(dosed, 'KC')} whose first lesson or step briefing is authored: each has a prequestion, a call and an exit item tagged with it`])

  return { findings, summaries, graph, paths, pending }
}
