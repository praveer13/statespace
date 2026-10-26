// Queries over a KC graph: prerequisites, credit order, cycles, confusable sets and fading families. Pure.
// Every function takes the graph explicitly; index.ts binds the course's own graph (GRAPH) for convenience.

import type { ConfusableSet, FadingFamily, Kc, KcGraph, KcId, LabStage, LessonId, StageId } from './types.ts'

/** Lookup tables over one graph, built once per graph object. */
export interface KcIndex {
  readonly graph: KcGraph
  readonly byId: ReadonlyMap<string, Kc>
  /** KC → the KCs that require it (hard edges). */
  readonly dependents: ReadonlyMap<string, readonly KcId[]>
  readonly labStages: ReadonlyMap<string, LabStage>
}

const cache = new WeakMap<KcGraph, KcIndex>()

export function indexGraph(graph: KcGraph): KcIndex {
  const hit = cache.get(graph)
  if (hit !== undefined) return hit
  const byId = new Map<string, Kc>(graph.kcs.map((k) => [k.id, k]))
  const dependents = new Map<string, KcId[]>()
  for (const k of graph.kcs) for (const r of k.requires) dependents.set(r, [...(dependents.get(r) ?? []), k.id])
  const idx: KcIndex = { graph, byId, dependents, labStages: new Map(graph.labStages.map((s) => [s.id, s])) }
  cache.set(graph, idx)
  return idx
}

/** The KC with this ID, or undefined. */
export function kcById(graph: KcGraph, id: string): Kc | undefined {
  return indexGraph(graph).byId.get(id)
}

export function isThreshold(graph: KcGraph, id: string): boolean {
  return kcById(graph, id)?.threshold === true
}

/** The KCs of one stage, in the graph's (the spine's) order. */
export function kcsOfStage(graph: KcGraph, stage: StageId): readonly Kc[] {
  return graph.kcs.filter((k) => k.stage === stage)
}

/** The KCs whose first lesson (or step briefing) is this one. */
export function kcsFirstTaughtIn(graph: KcGraph, lesson: LessonId): readonly Kc[] {
  return graph.kcs.filter((k) => k.firstTaught === lesson)
}

/** The direct requirements of a KC; soft edges only when asked. */
export function requirementsOf(graph: KcGraph, id: string, { soft = false } = {}): readonly KcId[] {
  const k = kcById(graph, id)
  if (k === undefined) return []
  return soft ? [...k.requires, ...k.requiresSoft] : k.requires
}

/** Every KC a KC depends on, directly or not, through hard edges (and soft ones when asked); closest first. */
export function prerequisitesOf(graph: KcGraph, id: string, { soft = false } = {}): readonly KcId[] {
  const seen = new Set<string>([id])
  const out: KcId[] = []
  let frontier: readonly KcId[] = requirementsOf(graph, id, { soft })
  while (frontier.length > 0) {
    const next: KcId[] = []
    for (const r of frontier) {
      if (seen.has(r)) continue
      seen.add(r)
      out.push(r)
      next.push(...requirementsOf(graph, r, { soft }))
    }
    frontier = next
  }
  return out
}

/**
 * Whether a placement walk, a test-out or a sibling import may credit a KC now: every KC it requires through a
 * hard edge is already credited, by teaching, placement or an earlier test-out (spine section 8.6;
 * curriculum/D-drawers.md section 6.4). Soft edges do not wait.
 */
export function canCredit(graph: KcGraph, id: string, credited: ReadonlySet<string>): boolean {
  return kcById(graph, id) !== undefined && requirementsOf(graph, id).every((r) => credited.has(r))
}

/** The hard requirements that still block crediting a KC, in the graph's order. */
export function blockingRequirements(graph: KcGraph, id: string, credited: ReadonlySet<string>): readonly KcId[] {
  return requirementsOf(graph, id).filter((r) => !credited.has(r))
}

/**
 * The order in which a set of passes credits: each KC as soon as its hard requirements are credited, starting
 * from `credited`. Returns the KCs that credit, in order, and those still waiting.
 */
export function creditOrder(
  graph: KcGraph,
  passed: readonly string[],
  credited: ReadonlySet<string> = new Set(),
): { credits: readonly KcId[]; waiting: readonly KcId[] } {
  const have = new Set(credited)
  const pending = passed.filter((id, i) => passed.indexOf(id) === i && !have.has(id) && kcById(graph, id) !== undefined)
  const credits: KcId[] = []
  let progress = true
  while (progress) {
    progress = false
    for (const id of graph.kcs.map((k) => k.id)) {
      if (!pending.includes(id) || have.has(id)) continue
      if (canCredit(graph, id, have)) {
        have.add(id)
        credits.push(id)
        progress = true
      }
    }
  }
  return { credits, waiting: pending.filter((id) => !have.has(id)) as KcId[] }
}

/** A cycle of `requires` edges (hard and soft) as a list of KCs whose last requires the first, or null. */
export function findCycle(graph: KcGraph): readonly KcId[] | null {
  const idx = indexGraph(graph)
  const state = new Map<string, 'open' | 'done'>()
  const stack: KcId[] = []
  const visit = (id: KcId): KcId[] | null => {
    state.set(id, 'open')
    stack.push(id)
    const k = idx.byId.get(id)
    for (const r of k === undefined ? [] : [...k.requires, ...k.requiresSoft]) {
      if (!idx.byId.has(r)) continue
      const s = state.get(r)
      if (s === 'open') return stack.slice(stack.indexOf(r))
      if (s === undefined) {
        const c = visit(r)
        if (c !== null) return c
      }
    }
    stack.pop()
    state.set(id, 'done')
    return null
  }
  for (const k of graph.kcs) {
    if (state.has(k.id)) continue
    const c = visit(k.id)
    if (c !== null) return c
  }
  return null
}

/** The KCs in an order where every KC comes after everything it requires (hard and soft); null on a cycle. */
export function topologicalOrder(graph: KcGraph): readonly KcId[] | null {
  if (findCycle(graph) !== null) return null
  const out: KcId[] = []
  const done = new Set<string>()
  const idx = indexGraph(graph)
  const visit = (id: KcId): void => {
    if (done.has(id)) return
    done.add(id)
    const k = idx.byId.get(id)
    for (const r of k === undefined ? [] : [...k.requires, ...k.requiresSoft]) if (idx.byId.has(r)) visit(r)
    out.push(id)
  }
  for (const k of graph.kcs) visit(k.id)
  return out
}

/** The confusable sets a KC belongs to (M-which-is-it interleaves only within one set). */
export function confusableSetsOf(graph: KcGraph, id: string): readonly ConfusableSet[] {
  return graph.confusableSets.filter((s) => s.kcs.includes(id as KcId))
}

/** The fading family that runs on a KC, or null (only six KCs have one). */
export function fadingFamilyOf(graph: KcGraph, id: string): FadingFamily | null {
  return graph.fadingFamilies.find((f) => f.kc === id) ?? null
}

/** The KCs a lesson's call on them is first contact for (Boot's call), which count toward no KC state. */
export function firstContactIn(graph: KcGraph, lesson: string): readonly KcId[] {
  return graph.firstContact[lesson] ?? []
}

/** The lab stage with this ID, or undefined. */
export function labStageById(graph: KcGraph, id: string): LabStage | undefined {
  return indexGraph(graph).labStages.get(id)
}
