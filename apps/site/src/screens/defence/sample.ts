// Drawing a Defence attempt (ASSESSMENT.md section 6.2). Each attempt's draw is fixed by the stage, the part and the
// attempt number, so a reload shows the same sample; a retake is a new attempt and so a fresh draw. Instance seeds
// are drawn fresh when an item is shown, past every seed the record already holds. Pure apart from the family loads.

import { GRAPH, isThreshold, kcById } from '@statespace/kc'
import type { LabPage } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import { isLiveTemplate, loadFamily } from '../../components/generated/registry.ts'
import type { AuditAnchor, AuditCase, AuditPool } from '../audit/pool.ts'
import type { AuthoredMutant, StagePlan } from './plan.ts'

/** FNV-1a, 32-bit. */
export function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A stable shuffle keyed by a string. */
export function shuffled<T>(xs: readonly T[], key: string, id: (x: T) => string): T[] {
  return [...xs].sort((a, b) => hash32(`${key}|${id(a)}`) - hash32(`${key}|${id(b)}`))
}

const stageNum = (s: string): number => Number(s.slice(1))

// ------------------------------------------------------------------------------------------------ Part A

export interface Slot {
  readonly index: number
  readonly family: string
  readonly template: string
  readonly kc: string
  /** A spiral item on an earlier stage's threshold KC. */
  readonly spiral: boolean
}

/**
 * Part A's slots: aSize items across the plan's families that this build can draw at band 2, at least three of them,
 * templates tagged with the stage's KCs first; one slot is a spiral item on an earlier stage's threshold KC when a
 * live template carries one.
 */
export async function planPartA(plan: StagePlan, attempt: number): Promise<{ slots: Slot[]; families: string[] }> {
  const key = `${plan.stage}/A/${attempt}`
  const pools: Array<{ family: string; templates: Array<{ id: string; kc: string }> }> = []
  const spirals: Array<{ family: string; id: string; kc: string }> = []
  const kcsOfStage = GRAPH.kcs.filter((k) => k.stage === plan.stage).map((k) => k.id)
  const extra = [...new Set(GRAPH.kcs.filter((k) => k.stage === plan.stage).flatMap((k) => k.families))].filter((f) => !plan.families.includes(f) && f !== 'GEN-spot-the-gap' && f !== 'GEN-defend')
  for (const family of [...plan.families, ...extra]) {
    const load = loadFamily(family)
    if (load === null) continue
    let mod
    try {
      mod = await load
    } catch {
      continue
    }
    const live = mod.generator.templates.filter((t) => isLiveTemplate(mod, t.id))
    const mine = live.filter((t) => kcsOfStage.includes(t.kcs.primary))
    const chosen = (mine.length > 0 ? mine : plan.families.includes(family) ? live : []).map((t) => ({ id: t.id, kc: t.kcs.primary }))
    if (chosen.length > 0) pools.push({ family, templates: shuffled(chosen, key, (t) => t.id) })
    for (const t of live) {
      const k = kcById(GRAPH, t.kcs.primary)
      if (k !== undefined && stageNum(k.stage) < stageNum(plan.stage) && isThreshold(GRAPH, k.id)) spirals.push({ family, id: t.id, kc: k.id })
    }
    // the plan's own families come first; extra ones only fill to three
    if (!plan.families.includes(family) && pools.length >= 3) break
  }
  const slots: Slot[] = []
  const order = shuffled(pools, key, (p) => p.family)
  const used = new Map<string, number>()
  for (let i = 0; slots.length < plan.aSize && order.length > 0; i++) {
    const p = order[i % order.length] as (typeof order)[number]
    const n = used.get(p.family) ?? 0
    used.set(p.family, n + 1)
    const t = p.templates[n % p.templates.length] as { id: string; kc: string }
    slots.push({ index: slots.length + 1, family: p.family, template: t.id, kc: t.kc, spiral: false })
  }
  const spiral = shuffled(spirals, key, (s) => `${s.family}/${s.id}`)[0]
  if (spiral !== undefined && slots.length === plan.aSize) {
    slots[slots.length - 1] = { index: plan.aSize, family: spiral.family, template: spiral.id, kc: spiral.kc, spiral: true }
  }
  return { slots, families: [...new Set(slots.map((s) => s.family))] }
}

/** Every seed the record holds, so a drawn instance is one the learner has not met. */
export const takenSeeds = (events: readonly LedgerEvent[]): Set<number> => new Set(events.filter((e) => typeof e.seed === 'number').map((e) => e.seed as number))

// ------------------------------------------------------------------------------------------------ Part B

export interface Mutant {
  readonly id: string
  /** The mutation, as the lab's content writes it. */
  readonly what: string
  /** What to predict. */
  readonly question: string
  /** The lab stage it applies after. */
  readonly stage?: string | undefined
  /** What the reference solution did under it: shown only once the learner's own run is in. */
  readonly reference?: string | undefined
}

const DEFAULT_QUESTION = 'What happens when the checker runs your mutated artifact?'
const str = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined)
const SAFE_ID = /^[A-Za-z0-9._-]+$/

/**
 * The lab's Prove-it mutants, whatever shape its content writes them in (a list, or `{ mutations: [...] }`), else the
 * plan's. A prediction field that is a question is the question; one that states an outcome is the reference key,
 * which stays hidden until the learner's own run arrives.
 */
export function mutantsOf(lab: LabPage | undefined, plan: StagePlan): Mutant[] {
  const extra = (lab?.extra ?? {}) as Record<string, unknown>
  const raw = extra.proveIt
  const list: unknown[] = Array.isArray(raw) ? raw : raw !== null && typeof raw === 'object' && Array.isArray((raw as { mutations?: unknown }).mutations) ? ((raw as { mutations: unknown[] }).mutations) : []
  const out: Mutant[] = []
  list.forEach((m, i) => {
    const r = (m ?? {}) as Record<string, unknown>
    const what = str(r.mutant) ?? str(r.operator) ?? str(r.mutation)
    if (what === undefined) return
    const said = str(r.prediction) ?? str(r.predict)
    const asks = said !== undefined && said.endsWith('?')
    const id = str(r.id) ?? `m${i + 1}`
    out.push({
      id: SAFE_ID.test(id) ? id : `m${i + 1}`,
      what,
      question: asks ? said : DEFAULT_QUESTION,
      stage: str(r.appliedTo) ?? str(r.after),
      reference: str(r.key) ?? (asks ? undefined : said),
    })
  })
  if (out.length > 0) return out
  return (plan.mutants ?? []).map((m: AuthoredMutant) => ({ id: m.id, what: m.what, question: m.question ?? DEFAULT_QUESTION, stage: m.stage }))
}

/** Part B's sample for an attempt: bSize of the lab's mutants (all of them when it has fewer), in a seeded order. */
export function samplePartB(all: readonly Mutant[], plan: StagePlan, attempt: number): Mutant[] {
  const n = Math.min(all.length, Math.max(4, Math.min(6, plan.bSize)))
  return shuffled(all, `${plan.stage}/B/${attempt}`, (m) => m.id).slice(0, n)
}

// ------------------------------------------------------------------------------------------------ Part C

export interface DrawnCase {
  readonly anchor: AuditAnchor
  readonly c: AuditCase
}

/** Whether the record already holds a filing on this case, at the Desk or in a Defence. */
export function caseSeen(events: readonly LedgerEvent[], ref: string): boolean {
  return events.some((e) => e.kind === 'audit' && (e.ref === `audit:${ref}` || (e.data as Record<string, unknown> | undefined)?.case === ref))
}

/**
 * Part C's four cases: from the stage's anchors (every stage's, for a stage with none), one or two sound, never two of
 * one pair, and never a case the learner has filed when an unseen one is left. `keep` holds cases already filed in
 * this attempt, which stay in place.
 */
export function samplePartC(pool: AuditPool, stage: string, attempt: number, events: readonly LedgerEvent[]): DrawnCase[] {
  const key = `${stage}/C/${attempt}`
  const mine = pool.anchors.filter((a) => a.stage === stage)
  const anchors = mine.length > 0 ? mine : pool.anchors
  const all = anchors.flatMap((anchor) => anchor.cases.map((c) => ({ anchor, c })))
  const fresh = (xs: DrawnCase[]) => {
    const unseen = xs.filter((x) => !caseSeen(events, x.c.ref))
    return unseen.length > 0 ? unseen : xs
  }
  const sounds = shuffled(fresh(all.filter((x) => x.c.key.truth === 'sound')), key, (x) => x.c.ref)
  const flawed = shuffled(fresh(all.filter((x) => x.c.key.truth !== 'sound')), key, (x) => x.c.ref)
  const nSound = 1 + (hash32(key) % 2)
  const out: DrawnCase[] = []
  const pairs = new Set<string>()
  const take = (xs: DrawnCase[], n: number) => {
    for (const x of xs) {
      if (out.length >= 4 || n <= 0) break
      const pair = `${x.anchor.id}/${x.c.pair}`
      if (pairs.has(pair)) continue
      pairs.add(pair)
      out.push(x)
      n--
    }
  }
  take(sounds, nSound)
  take(flawed, 4 - out.length)
  if (out.length < 4) take([...sounds, ...flawed], 4 - out.length)
  return shuffled(out, `${key}/order`, (x) => x.c.ref)
}
