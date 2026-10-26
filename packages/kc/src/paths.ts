// The published paths (spine section 3.0) as ordered lists of lessons and lab stages. The order comes from
// content/stages/budget.yaml, which GATE-budget holds equal to the spine: each stage's `sequence` orders its work
// (from the stage specs' "Build this" cards) and each path's `blocks` order the stages, a block taking a stage
// whole, a list of its units, or the rest. Tokens that are neither lessons nor lab stages (DEFENCE, NOTE, NNG,
// REENTRY, CARDS) are planning extras and are left out. Pure.

import { EXACT } from '@statespace/ids/grammar'
import type { LabStage, Problem } from './types.ts'

export const BUDGET_PATH = 'content/stages/budget.yaml'

export interface PathUnit {
  readonly id: string
  readonly kind: 'lesson' | 'lab-stage'
  readonly stage: string
  readonly block: string
  /** Position on the path, from 0. A [stretch] stage placed after a unit shares its anchor's integer part. */
  readonly index: number
}

export interface PublishedPath {
  readonly id: string
  readonly label: string
  readonly units: readonly PathUnit[]
  /** Unit ID → position. */
  readonly position: ReadonlyMap<string, number>
}

export interface LessonRow {
  readonly id: string
  readonly stage: string
  readonly tier: string
}

export interface LabStageRow {
  readonly id: string
  readonly lab: string
  readonly stretch: boolean
}

type Obj = { readonly [key: string]: unknown }
const isObj = (x: unknown): x is Obj => x !== null && typeof x === 'object' && !Array.isArray(x)

const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)

/** "S5.L1–S5.L8" or "LAB-5.1–LAB-5.6" as the IDs between; another token as itself; null for a malformed range. */
export function expandSelector(sel: string): string[] | null {
  let m = /^(S[0-9]+\.L)([0-9]+)–(S[0-9]+\.L)([0-9]+)$/.exec(sel)
  if (m && m[1] === m[3]) return range(Number(m[2]), Number(m[4])).map((n) => `${m?.[1]}${n}`)
  m = /^(LAB-[0-9]+\.)([0-9]+)–(LAB-[0-9]+\.)([0-9]+)$/.exec(sel)
  if (m && m[1] === m[3]) return range(Number(m[2]), Number(m[4])).map((n) => `${m?.[1]}${n}`)
  return sel.includes('–') ? null : [sel]
}

const isUnitToken = (t: string): boolean => EXACT.lesson.test(t) || EXACT['lab-stage'].test(t)

/**
 * Resolve every path of the budget document into its units. Stretch stages (absent from the sequences) are
 * placed after the unit their graph entry names, so the path checks can read them too.
 */
export function resolvePaths(
  budget: unknown,
  lessons: readonly LessonRow[],
  labStages: readonly LabStageRow[],
  stretchPlacement: readonly Pick<LabStage, 'id' | 'after'>[] = [],
): { paths: PublishedPath[]; problems: Problem[] } {
  const problems: Problem[] = []
  const fail = (message: string): void => {
    problems.push({ message, where: BUDGET_PATH })
  }
  if (!isObj(budget) || !isObj(budget.stages) || !isObj(budget.paths)) {
    fail('needs `stages` and `paths` mappings')
    return { paths: [], problems }
  }
  const lessonIds = new Map(lessons.map((l) => [l.id, l]))
  const labIds = new Map(labStages.map((s) => [s.id, s]))
  const stagesDoc = budget.stages
  const pathsDoc = budget.paths

  // Each stage's units in its sequence order.
  const seqOf = new Map<string, string[]>()
  for (const [sid, plan] of Object.entries(stagesDoc)) {
    if (!isObj(plan) || typeof plan.sequence !== 'string') {
      fail(`stages.${sid} has no sequence`)
      continue
    }
    const units: string[] = []
    for (const tok of plan.sequence.split(/\s+/).filter(Boolean)) {
      if (!isUnitToken(tok)) continue
      const known = lessonIds.get(tok)?.stage === sid || labIds.get(tok)?.lab === `LAB-${sid.slice(1)}`
      if (!known) fail(`stages.${sid}.sequence names ${tok}, which is no lesson or lab stage of ${sid}`)
      else if (units.includes(tok)) fail(`stages.${sid}.sequence names ${tok} twice`)
      else units.push(tok)
    }
    seqOf.set(sid, units)
  }

  const paths: PublishedPath[] = []
  for (const [pid, def] of Object.entries(pathsDoc)) {
    if (!isObj(def) || !Array.isArray(def.blocks)) {
      fail(`paths.${pid} has no blocks`)
      continue
    }
    const taken = new Map<string, Set<string>>()
    const order: { id: string; stage: string; block: string }[] = []
    for (const raw of def.blocks) {
      const b = typeof raw === 'string' ? { id: raw, stage: raw, take: undefined } : isObj(raw) ? { id: String(raw.id), stage: String(raw.stage), take: raw.take } : null
      if (b === null || !seqOf.has(b.stage)) {
        fail(`paths.${pid}: a block needs an id and a stage that has a sequence: ${JSON.stringify(raw)}`)
        continue
      }
      const seq = seqOf.get(b.stage) ?? []
      const mine = taken.get(b.stage) ?? new Set<string>()
      taken.set(b.stage, mine)
      let want: Set<string>
      if (b.take === undefined) want = new Set(seq)
      else if (b.take === 'rest') want = new Set(seq.filter((u) => !mine.has(u)))
      else if (Array.isArray(b.take)) {
        want = new Set()
        for (const sel of b.take) {
          const list = typeof sel === 'string' ? expandSelector(sel) : null
          if (list === null) fail(`paths.${pid} block ${b.id}: "${String(sel)}" is no unit and no range of units`)
          else for (const t of list) if (isUnitToken(t)) want.add(t)
        }
      } else {
        fail(`paths.${pid} block ${b.id}: take must be a list or "rest"`)
        want = new Set()
      }
      for (const t of want) if (!seq.includes(t)) fail(`paths.${pid} block ${b.id} takes ${t}, which is not in the sequence of ${b.stage}`)
      for (const u of seq) {
        if (!want.has(u)) continue
        if (mine.has(u)) fail(`paths.${pid}: ${u} is taken twice (block ${b.id})`)
        mine.add(u)
        order.push({ id: u, stage: b.stage, block: b.id })
      }
    }
    for (const [sid, seq] of seqOf) for (const u of seq) if (!taken.get(sid)?.has(u)) fail(`paths.${pid}: ${u} of ${sid} is on no block`)

    // Stretch stages follow their anchors; several after one anchor keep the graph's order.
    const units: PathUnit[] = []
    const position = new Map<string, number>()
    const after = new Map<string, string[]>()
    for (const s of stretchPlacement) if (s.after !== null) after.set(s.after, [...(after.get(s.after) ?? []), s.id])
    const push = (id: string, stage: string, block: string): void => {
      const kind = EXACT.lesson.test(id) ? 'lesson' : 'lab-stage'
      position.set(id, units.length)
      units.push({ id, kind, stage, block, index: units.length })
      for (const next of after.get(id) ?? []) push(next, stage, block)
    }
    for (const u of order) push(u.id, u.stage, u.block)
    for (const s of stretchPlacement) if (s.after !== null && !position.has(s.id)) fail(`paths.${pid}: the [stretch] stage ${s.id} follows ${s.after}, which is on no block of the path`)
    paths.push({ id: pid, label: isObj(def) && typeof def.label === 'string' ? def.label : pid, units, position })
  }
  return { paths, problems }
}
