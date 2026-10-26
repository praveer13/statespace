// The loader of content/kc/graph.yaml: a parsed document in, a KcGraph or a list of problems out. Pure: the
// caller parses the YAML (scripts/verify-kc.mjs uses the repository's dependency-free YAML subset). The loader is
// strict, so a misspelled key or a dangling reference is a problem, never a silently shorter graph.

import { EXACT } from '@statespace/ids/grammar'
import type {
  ArtifactSubstitute,
  ArtifactUse,
  Bank,
  ConfusableSet,
  DrawerId,
  FadingFamily,
  GenId,
  Kc,
  KcGraph,
  KcId,
  LabStage,
  LabStageId,
  LessonId,
  PendingCrossing,
  Problem,
  ReferenceModule,
  SoftEdgeSubstitute,
  StageId,
  Tool,
} from './types.ts'

export const GRAPH_PATH = 'content/kc/graph.yaml'
export const GRAPH_SCHEMA = 'statespace/kc-graph@1'

type Obj = { readonly [key: string]: unknown }

const isObj = (x: unknown): x is Obj => x !== null && typeof x === 'object' && !Array.isArray(x)

export const isKcId = (s: unknown): s is KcId => typeof s === 'string' && EXACT.kc.test(s)
export const isLessonId = (s: unknown): s is LessonId => typeof s === 'string' && EXACT.lesson.test(s)
export const isStageId = (s: unknown): s is StageId => typeof s === 'string' && EXACT.stage.test(s)
export const isLabStageId = (s: unknown): s is LabStageId => typeof s === 'string' && EXACT['lab-stage'].test(s)
export const isGenId = (s: unknown): s is GenId => typeof s === 'string' && EXACT.generator.test(s)
export const isDrawerId = (s: unknown): s is DrawerId => typeof s === 'string' && EXACT.drawer.test(s)

/** The stage a KC belongs to by its number: KC-4.cti-or-bug is S4. */
export const stageOfKc = (id: string): StageId => `S${id.slice(3, id.indexOf('.'))}` as StageId

/** The stage of a lesson or lab stage ID: S4.L6 and LAB-4.6 are S4. */
export function stageOfUnit(id: string): StageId | null {
  const lab = /^LAB-([0-9]+)\./.exec(id)
  if (lab) return `S${lab[1]}` as StageId
  const les = /^(S[0-9]+)\.L/.exec(id)
  return les ? (les[1] as StageId) : null
}

interface Ctx {
  problems: Problem[]
  where: string
}

function problem(ctx: Ctx, path: string, message: string): void {
  ctx.problems.push({ message: `${path}: ${message}`, where: ctx.where })
}

function onlyKeys(ctx: Ctx, path: string, o: Obj, allowed: readonly string[]): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) problem(ctx, path, `unknown key "${k}" (allowed: ${allowed.join(', ')})`)
}

function str(ctx: Ctx, path: string, v: unknown, { optional = false } = {}): string | null {
  if (v === undefined || v === null) {
    if (!optional) problem(ctx, path, 'is missing')
    return null
  }
  if (typeof v !== 'string' || v.trim() === '') {
    problem(ctx, path, `must be a non-empty string, not ${JSON.stringify(v)}`)
    return null
  }
  return v
}

function bool(ctx: Ctx, path: string, v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v !== 'boolean') {
    problem(ctx, path, `must be true or false, not ${JSON.stringify(v)}`)
    return false
  }
  return v
}

/** A list of IDs that pass `test`, without duplicates. Absent means empty. */
function idList<T extends string>(ctx: Ctx, path: string, v: unknown, test: (s: unknown) => s is T, kind: string): T[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) {
    problem(ctx, path, `must be a list of ${kind} IDs`)
    return []
  }
  const out: T[] = []
  for (const x of v) {
    if (!test(x)) problem(ctx, path, `${JSON.stringify(x)} is not a ${kind} ID`)
    else if (out.includes(x)) problem(ctx, path, `${x} is listed twice`)
    else out.push(x)
  }
  return out
}

function readKc(ctx: Ctx, raw: unknown, i: number): Kc | null {
  const at = `kcs[${i}]`
  if (!isObj(raw)) {
    problem(ctx, at, 'must be a mapping')
    return null
  }
  const path = typeof raw.id === 'string' ? `kcs › ${raw.id}` : at
  onlyKeys(ctx, path, raw, ['id', 'name', 'stage', 'threshold', 'requires', 'requires_soft', 'confusable', 'first_taught', 'families', 'bank'])
  if (!isKcId(raw.id)) {
    problem(ctx, path, `id ${JSON.stringify(raw.id)} is not a KC ID (KC-{n}.{kebab-slug})`)
    return null
  }
  const name = str(ctx, `${path} › name`, raw.name)
  if (!isStageId(raw.stage)) problem(ctx, `${path} › stage`, `${JSON.stringify(raw.stage)} is not a stage ID`)
  else if (raw.stage !== stageOfKc(raw.id)) problem(ctx, `${path} › stage`, `${raw.stage} differs from the stage in the ID (${stageOfKc(raw.id)})`)
  if (!isLessonId(raw.first_taught)) problem(ctx, `${path} › first_taught`, `${JSON.stringify(raw.first_taught)} is not a lesson ID`)
  let bank: Bank | null = null
  if (raw.bank !== undefined && raw.bank !== null) {
    if (!isObj(raw.bank)) problem(ctx, `${path} › bank`, 'must be a mapping with isomorphs and source')
    else {
      onlyKeys(ctx, `${path} › bank`, raw.bank, ['isomorphs', 'source'])
      const n = raw.bank.isomorphs
      const source = str(ctx, `${path} › bank › source`, raw.bank.source)
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) problem(ctx, `${path} › bank › isomorphs`, 'must be a positive integer')
      else if (source !== null) bank = { isomorphs: n, source }
    }
  }
  return {
    id: raw.id,
    name: name ?? '',
    stage: (isStageId(raw.stage) ? raw.stage : stageOfKc(raw.id)),
    threshold: bool(ctx, `${path} › threshold`, raw.threshold),
    requires: idList(ctx, `${path} › requires`, raw.requires, isKcId, 'KC'),
    requiresSoft: idList(ctx, `${path} › requires_soft`, raw.requires_soft, isKcId, 'KC'),
    confusable: idList(ctx, `${path} › confusable`, raw.confusable, isKcId, 'KC'),
    firstTaught: (isLessonId(raw.first_taught) ? raw.first_taught : 'S0.L0') as LessonId,
    families: idList(ctx, `${path} › families`, raw.families, isGenId, 'generator'),
    bank,
  }
}

function readSet(ctx: Ctx, raw: unknown, i: number): ConfusableSet | null {
  const at = `confusable_sets[${i}]`
  if (!isObj(raw)) {
    problem(ctx, at, 'must be a mapping')
    return null
  }
  const path = typeof raw.id === 'string' ? `confusable_sets › ${raw.id}` : at
  onlyKeys(ctx, path, raw, ['id', 'name', 'discriminate', 'kcs', 'audit_families', 'opens', 'opens_note'])
  if (typeof raw.id !== 'string' || !/^[A-Z]$/.test(raw.id)) {
    problem(ctx, path, `id ${JSON.stringify(raw.id)} must be one capital letter`)
    return null
  }
  if (!isStageId(raw.opens)) problem(ctx, `${path} › opens`, `${JSON.stringify(raw.opens)} is not a stage ID`)
  return {
    id: raw.id,
    name: str(ctx, `${path} › name`, raw.name) ?? '',
    discriminate: str(ctx, `${path} › discriminate`, raw.discriminate) ?? '',
    kcs: idList(ctx, `${path} › kcs`, raw.kcs, isKcId, 'KC'),
    auditFamilies: bool(ctx, `${path} › audit_families`, raw.audit_families),
    opens: (isStageId(raw.opens) ? raw.opens : 'S0') as StageId,
    opensNote: str(ctx, `${path} › opens_note`, raw.opens_note, { optional: true }),
  }
}

function readFamily(ctx: Ctx, raw: unknown, i: number): FadingFamily | null {
  const at = `fading_families[${i}]`
  if (!isObj(raw)) {
    problem(ctx, at, 'must be a mapping')
    return null
  }
  const path = typeof raw.id === 'string' ? `fading_families › ${raw.id}` : at
  onlyKeys(ctx, path, raw, ['id', 'name', 'kc'])
  if (typeof raw.id !== 'string' || !/^F[1-9][0-9]*$/.test(raw.id)) {
    problem(ctx, path, `id ${JSON.stringify(raw.id)} must be F1, F2, ...`)
    return null
  }
  if (!isKcId(raw.kc)) {
    problem(ctx, `${path} › kc`, `${JSON.stringify(raw.kc)} is not a KC ID`)
    return null
  }
  return { id: raw.id, name: str(ctx, `${path} › name`, raw.name) ?? '', kc: raw.kc }
}

function readLabStage(ctx: Ctx, id: string, raw: unknown): LabStage | null {
  const path = `lab_stages › ${id}`
  if (!isLabStageId(id)) {
    problem(ctx, path, 'is not a lab stage ID (LAB-{n}.{k})')
    return null
  }
  const o: Obj = raw === null || raw === undefined ? {} : isObj(raw) ? raw : {}
  if (raw !== null && raw !== undefined && !isObj(raw)) problem(ctx, path, 'must be a mapping')
  onlyKeys(ctx, path, o, ['kcs', 'first_contact', 'uses', 'tools', 'stretch', 'after'])
  const uses: ArtifactUse[] = []
  if (o.uses !== undefined && o.uses !== null) {
    if (!isObj(o.uses)) problem(ctx, `${path} › uses`, 'must map each lab stage it uses to the artifact it consumes')
    else {
      for (const [stage, artifact] of Object.entries(o.uses)) {
        if (!isLabStageId(stage)) problem(ctx, `${path} › uses`, `${stage} is not a lab stage ID`)
        else if (stage === id) problem(ctx, `${path} › uses`, 'a stage cannot use its own artifact')
        else {
          const a = str(ctx, `${path} › uses › ${stage}`, artifact)
          if (a !== null) uses.push({ stage, artifact: a })
        }
      }
    }
  }
  const tools: string[] = []
  if (o.tools !== undefined && o.tools !== null) {
    if (!Array.isArray(o.tools)) problem(ctx, `${path} › tools`, 'must be a list of tool names')
    else for (const t of o.tools) {
      if (typeof t !== 'string' || !/^[a-z][a-z0-9-]*$/.test(t)) problem(ctx, `${path} › tools`, `${JSON.stringify(t)} is not a tool name`)
      else if (tools.includes(t)) problem(ctx, `${path} › tools`, `${t} is listed twice`)
      else tools.push(t)
    }
  }
  const stretch = bool(ctx, `${path} › stretch`, o.stretch)
  const after = str(ctx, `${path} › after`, o.after, { optional: true })
  if (stretch && after === null) problem(ctx, path, 'a [stretch] stage names the unit it follows (after), because no budget sequence places it')
  if (!stretch && after !== null) problem(ctx, `${path} › after`, 'only a [stretch] stage names the unit it follows; a planned stage is placed by content/stages/budget.yaml')
  if (after !== null && !isLessonId(after) && !isLabStageId(after)) problem(ctx, `${path} › after`, `${after} is not a lesson or lab stage ID`)
  return {
    id,
    kcs: idList(ctx, `${path} › kcs`, o.kcs, isKcId, 'KC'),
    firstContact: bool(ctx, `${path} › first_contact`, o.first_contact),
    uses,
    tools,
    stretch,
    after,
  }
}

function readNamed<T>(ctx: Ctx, key: string, raw: unknown, read: (path: string, id: string, o: Obj) => T | null): T[] {
  if (raw === undefined || raw === null) return []
  if (!isObj(raw)) {
    problem(ctx, key, 'must be a mapping from names to entries')
    return []
  }
  const out: T[] = []
  for (const [id, v] of Object.entries(raw)) {
    const path = `${key} › ${id}`
    if (!/^[a-z][a-z0-9-]*$/.test(id)) problem(ctx, path, 'a name is lowercase kebab-case')
    else if (!isObj(v)) problem(ctx, path, 'must be a mapping')
    else {
      const r = read(path, id, v)
      if (r !== null) out.push(r)
    }
  }
  return out
}

/**
 * Validate a parsed graph document. Returns the graph whenever the document's shape can be read at all, with
 * every problem listed; `graph` is null only when the top level is unusable.
 */
export function loadGraph(doc: unknown, where: string = GRAPH_PATH): { graph: KcGraph | null; problems: Problem[] } {
  const ctx: Ctx = { problems: [], where }
  if (!isObj(doc)) {
    problem(ctx, 'the document', 'must be a mapping')
    return { graph: null, problems: ctx.problems }
  }
  onlyKeys(ctx, 'the document', doc, ['schema', 'first_contact', 'kcs', 'confusable_sets', 'fading_families', 'lab_stages', 'lesson_uses', 'tools', 'reference_modules', 'substitutes', 'pending_crossings'])
  if (doc.schema !== GRAPH_SCHEMA) problem(ctx, 'schema', `must be "${GRAPH_SCHEMA}", not ${JSON.stringify(doc.schema)}`)
  if (!Array.isArray(doc.kcs)) {
    problem(ctx, 'kcs', 'must be a list')
    return { graph: null, problems: ctx.problems }
  }

  const kcs = doc.kcs.map((k, i) => readKc(ctx, k, i)).filter((k): k is Kc => k !== null)
  const ids = new Set<string>()
  for (const k of kcs) {
    if (ids.has(k.id)) problem(ctx, `kcs › ${k.id}`, 'is listed twice')
    ids.add(k.id)
  }
  const known = (path: string, list: readonly string[]): void => {
    for (const id of list) if (!ids.has(id)) problem(ctx, path, `${id} is not a KC of the graph`)
  }
  for (const k of kcs) {
    known(`kcs › ${k.id} › requires`, k.requires)
    known(`kcs › ${k.id} › requires_soft`, k.requiresSoft)
    known(`kcs › ${k.id} › confusable`, k.confusable)
    for (const t of k.requires) if (k.requiresSoft.includes(t)) problem(ctx, `kcs › ${k.id}`, `${t} is both a hard and a soft requirement`)
    if (k.requires.includes(k.id) || k.requiresSoft.includes(k.id)) problem(ctx, `kcs › ${k.id}`, 'requires itself')
    if (k.confusable.includes(k.id)) problem(ctx, `kcs › ${k.id} › confusable`, 'a KC is not confusable with itself')
  }

  const firstContact: Record<string, KcId[]> = {}
  if (doc.first_contact !== undefined && doc.first_contact !== null) {
    if (!isObj(doc.first_contact)) problem(ctx, 'first_contact', 'must map lessons to the KCs their first-contact calls touch')
    else for (const [lesson, list] of Object.entries(doc.first_contact)) {
      if (!isLessonId(lesson)) problem(ctx, 'first_contact', `${lesson} is not a lesson ID`)
      else {
        const kl = idList(ctx, `first_contact › ${lesson}`, list, isKcId, 'KC')
        known(`first_contact › ${lesson}`, kl)
        firstContact[lesson] = kl
      }
    }
  }

  const confusableSets = (Array.isArray(doc.confusable_sets) ? doc.confusable_sets : []).map((s, i) => readSet(ctx, s, i)).filter((s): s is ConfusableSet => s !== null)
  if (!Array.isArray(doc.confusable_sets)) problem(ctx, 'confusable_sets', 'must be a list')
  const setIds = new Set<string>()
  for (const s of confusableSets) {
    if (setIds.has(s.id)) problem(ctx, `confusable_sets › ${s.id}`, 'is listed twice')
    setIds.add(s.id)
    known(`confusable_sets › ${s.id} › kcs`, s.kcs)
  }

  const fadingFamilies = (Array.isArray(doc.fading_families) ? doc.fading_families : []).map((f, i) => readFamily(ctx, f, i)).filter((f): f is FadingFamily => f !== null)
  if (!Array.isArray(doc.fading_families)) problem(ctx, 'fading_families', 'must be a list')
  const famIds = new Set<string>()
  for (const f of fadingFamilies) {
    if (famIds.has(f.id)) problem(ctx, `fading_families › ${f.id}`, 'is listed twice')
    famIds.add(f.id)
    known(`fading_families › ${f.id} › kc`, [f.kc])
  }

  const tools = readNamed<Tool>(ctx, 'tools', doc.tools, (path, id, o) => {
    onlyKeys(ctx, path, o, ['what', 'drawer'])
    if (!isDrawerId(o.drawer)) {
      problem(ctx, `${path} › drawer`, `${JSON.stringify(o.drawer)} is not a drawer ID`)
      return null
    }
    return { id, what: str(ctx, `${path} › what`, o.what) ?? '', drawer: o.drawer }
  })
  const referenceModules = readNamed<ReferenceModule>(ctx, 'reference_modules', doc.reference_modules, (path, id, o) => {
    onlyKeys(ctx, path, o, ['what', 'label'])
    return { id, what: str(ctx, `${path} › what`, o.what) ?? '', label: str(ctx, `${path} › label`, o.label) ?? '' }
  })

  const labStages: LabStage[] = []
  if (!isObj(doc.lab_stages)) problem(ctx, 'lab_stages', 'must map lab stage IDs to their dependencies')
  else for (const [id, raw] of Object.entries(doc.lab_stages)) {
    const s = readLabStage(ctx, id, raw)
    if (s === null) continue
    known(`lab_stages › ${id} › kcs`, s.kcs)
    for (const t of s.tools) if (!tools.some((x) => x.id === t)) problem(ctx, `lab_stages › ${id} › tools`, `${t} is not a tool of the graph (tools)`)
    labStages.push(s)
  }
  const stageIds = new Set(labStages.map((s) => s.id))
  for (const s of labStages) for (const u of s.uses) if (!stageIds.has(u.stage)) problem(ctx, `lab_stages › ${s.id} › uses`, `${u.stage} is not a lab stage of the graph`)

  // The lab artifacts a lesson applies: lesson → { lab stage: what it applies }.
  const lessonUses: Record<string, ArtifactUse[]> = {}
  if (doc.lesson_uses !== undefined && doc.lesson_uses !== null) {
    if (!isObj(doc.lesson_uses)) problem(ctx, 'lesson_uses', 'must map lessons to the lab stages whose artifacts they apply')
    else for (const [lesson, raw] of Object.entries(doc.lesson_uses)) {
      const path = `lesson_uses › ${lesson}`
      if (!isLessonId(lesson)) {
        problem(ctx, path, 'is not a lesson ID (S{n}.L{k})')
        continue
      }
      if (!isObj(raw) || Object.keys(raw).length === 0) {
        problem(ctx, path, 'must map each lab stage it uses to the artifact it applies')
        continue
      }
      const uses: ArtifactUse[] = []
      for (const [stage, artifact] of Object.entries(raw)) {
        if (!isLabStageId(stage)) problem(ctx, path, `${stage} is not a lab stage ID`)
        else if (!stageIds.has(stage)) problem(ctx, path, `${stage} is not a lab stage of the graph`)
        else {
          const a = str(ctx, `${path} › ${stage}`, artifact)
          if (a !== null) uses.push({ stage, artifact: a })
        }
      }
      lessonUses[lesson] = uses
    }
  }

  // A crossing named by a substitutes or pending_crossings entry: a soft edge of the graph, or an artifact use that a
  // lab stage (lab_stages › uses) or a lesson (lesson_uses) declares. A reference outside the graph is a problem, and
  // the entry is still read, so the path checks report what it would have covered.
  type Crossing = { readonly kind: 'soft-edge'; readonly from: KcId; readonly to: KcId } | { readonly kind: 'artifact'; readonly from: LabStageId | LessonId; readonly to: LabStageId }
  const readCrossing = (path: string, raw: Obj): Crossing | null => {
    if ((raw.soft_edge === undefined) === (raw.artifact === undefined)) {
      problem(ctx, path, 'names exactly one of soft_edge [dependent, requirement] or artifact [lab stage or lesson, used stage]')
      return null
    }
    if (raw.soft_edge !== undefined) {
      const e = raw.soft_edge
      if (!Array.isArray(e) || e.length !== 2 || !isKcId(e[0]) || !isKcId(e[1])) {
        problem(ctx, `${path} › soft_edge`, 'must be [dependent KC, required KC]')
        return null
      }
      const from = kcs.find((k) => k.id === e[0])
      if (from === undefined || !from.requiresSoft.includes(e[1])) problem(ctx, `${path} › soft_edge`, `${e[0]} → ${e[1]} is not a soft edge of the graph`)
      return { kind: 'soft-edge', from: e[0], to: e[1] }
    }
    const e = raw.artifact
    if (!Array.isArray(e) || e.length !== 2 || !(isLabStageId(e[0]) || isLessonId(e[0])) || !isLabStageId(e[1])) {
      problem(ctx, `${path} › artifact`, 'must be [lab stage or lesson, the lab stage whose artifact it uses]')
      return null
    }
    const declared = isLabStageId(e[0]) ? labStages.find((s) => s.id === e[0])?.uses : lessonUses[e[0]]
    if (declared === undefined || !declared.some((u) => u.stage === e[1])) problem(ctx, `${path} › artifact`, `${e[0]} does not use ${e[1]} (${isLabStageId(e[0]) ? `lab_stages › ${e[0]} › uses` : `lesson_uses › ${e[0]}`})`)
    return { kind: 'artifact', from: e[0], to: e[1] }
  }
  type CrossingKey = { readonly path: string; readonly kind: string; readonly from: string; readonly to: string }
  const sameCrossing = (a: CrossingKey, b: CrossingKey): boolean => a.path === b.path && a.kind === b.kind && a.from === b.from && a.to === b.to

  const softEdges: SoftEdgeSubstitute[] = []
  const artifacts: ArtifactSubstitute[] = []
  if (doc.substitutes !== undefined && doc.substitutes !== null) {
    if (!Array.isArray(doc.substitutes)) problem(ctx, 'substitutes', 'must be a list')
    else doc.substitutes.forEach((raw: unknown, i: number) => {
      const path = `substitutes[${i}]`
      if (!isObj(raw)) {
        problem(ctx, path, 'must be a mapping')
        return
      }
      onlyKeys(ctx, path, raw, ['path', 'soft_edge', 'artifact', 'substitute'])
      const pathId = str(ctx, `${path} › path`, raw.path)
      const c = readCrossing(path, raw)
      if (c === null) return
      if (c.kind === 'soft-edge') {
        if (!isDrawerId(raw.substitute)) {
          problem(ctx, `${path} › substitute`, 'a soft edge is stood in for by a drawer (D-{nn})')
          return
        }
        if (pathId !== null) softEdges.push({ path: pathId, from: c.from, to: c.to, substitute: raw.substitute })
      } else {
        if (typeof raw.substitute !== 'string' || !referenceModules.some((m) => m.id === raw.substitute)) {
          problem(ctx, `${path} › substitute`, `${JSON.stringify(raw.substitute)} is not a reference module of the graph (reference_modules)`)
          return
        }
        if (pathId !== null) artifacts.push({ path: pathId, unit: c.from, uses: c.to, substitute: raw.substitute })
      }
    })
  }
  const substituted: CrossingKey[] = [
    ...softEdges.map((s) => ({ path: s.path, kind: 'soft-edge', from: s.from, to: s.to })),
    ...artifacts.map((s) => ({ path: s.path, kind: 'artifact', from: s.unit, to: s.uses })),
  ]

  // Crossings that spine section 3.0 does not substitute yet, each with the owner decision it waits on.
  const pendingCrossings: PendingCrossing[] = []
  if (doc.pending_crossings !== undefined && doc.pending_crossings !== null) {
    if (!Array.isArray(doc.pending_crossings)) problem(ctx, 'pending_crossings', 'must be a list')
    else doc.pending_crossings.forEach((raw: unknown, i: number) => {
      const path = `pending_crossings[${i}]`
      if (!isObj(raw)) {
        problem(ctx, path, 'must be a mapping')
        return
      }
      onlyKeys(ctx, path, raw, ['path', 'soft_edge', 'artifact', 'decision'])
      const pathId = str(ctx, `${path} › path`, raw.path)
      const decision = str(ctx, `${path} › decision`, raw.decision)
      const c = readCrossing(path, raw)
      if (c === null || pathId === null || decision === null) return
      const entry: PendingCrossing = { path: pathId, kind: c.kind, from: c.from, to: c.to, decision }
      if (substituted.some((s) => sameCrossing(s, entry))) problem(ctx, path, `${c.from} → ${c.to} on the ${pathId} path has a substitute already; a pending entry is for a crossing that has none yet`)
      else if (pendingCrossings.some((p) => sameCrossing(p, entry))) problem(ctx, path, `${c.from} → ${c.to} on the ${pathId} path is listed twice`)
      else pendingCrossings.push(entry)
    })
  }

  const graph: KcGraph = {
    schema: GRAPH_SCHEMA,
    firstContact,
    kcs,
    confusableSets,
    fadingFamilies,
    labStages,
    lessonUses,
    tools,
    referenceModules,
    substitutes: { softEdges, artifacts },
    pendingCrossings,
  }
  return { graph, problems: ctx.problems }
}
