// M-which-is-it (spine sections 4 and 7; ASSESSMENT.md section 3.1): interleaved practice that asks the learner
// to tell confusable ideas apart. Three rules (spine section 4.1, "Interleaving", grade A [brunmair19]):
//
//   confusable sets only   every item of a mixed block comes from one confusable set of the KC graph (sets A-H),
//                          never across sets, even when a KC belongs to two sets;
//   after the exit item    a KC joins only once its first lesson's exit item has been attempted;
//   at most half a session the block holds at most half of the session's graded items.
//
// The planner is pure and deterministic in its session seed, and it reads no keep/kill arm: it is scheduling, and
// the scheduler never reads an arm (spine section 12 item 58). Today (W1-T08) asks it for a block and places it.
//
// Pure: no DOM, storage or network.

import type { ConfusableSet } from '@statespace/kc'
import { createDraw } from '@statespace/rng'
import { liveTemplates } from './define.ts'
import type { GenId, Generator, KcId, TemplateId } from './types.ts'

/** The largest share of a session's graded items a mixed block may take. */
export const WHICH_IS_IT_MAX_SHARE = 0.5

/** A mixed block needs at least two items from at least two KCs. */
export const WHICH_IS_IT_MIN_ITEMS = 2

export type WhichIsItSet = Pick<ConfusableSet, 'id' | 'kcs' | 'opens'>

export interface WhichIsItItem {
  readonly kc: KcId
  readonly family: GenId
  readonly template: TemplateId
}

export interface WhichIsItPlan {
  /** The confusable set every item comes from. */
  readonly set: string
  readonly items: readonly WhichIsItItem[]
  /** The most items the session allowed. */
  readonly cap: number
}

export interface WhichIsItInput {
  /** The session's planned graded items; the block takes at most half. */
  readonly sessionItems: number
  readonly sets: readonly WhichIsItSet[]
  /** True once the KC's first exit item has been attempted (first learning, ASSESSMENT.md section 3.2). */
  readonly pastExit: (kc: KcId) => boolean
  /** True once the learner has reached the stage a set opens in (spine section 4, the Opens column). */
  readonly stageOpen: (stage: string) => boolean
  /** The generator templates whose instances carry the KC as their primary KC. */
  readonly itemsFor: (kc: KcId) => readonly { readonly family: GenId; readonly template: TemplateId }[]
  /** The session's seed: which set, the KC order and the templates follow from it. */
  readonly seed: number
  /** How many items the caller wants, at most the cap; the cap when absent. */
  readonly want?: number
}

/**
 * The live templates whose instances carry each KC as their primary KC, from the families' definitions: what
 * Today passes as `itemsFor` (`(kc) => map.get(kc) ?? []`). A pending template is never drawn, so it is left out.
 * Families and templates keep the order they are given in.
 */
export function templatesByPrimaryKc(gens: readonly Pick<Generator, 'id' | 'templates'>[]): ReadonlyMap<KcId, readonly { readonly family: GenId; readonly template: TemplateId }[]> {
  const out = new Map<KcId, { family: GenId; template: TemplateId }[]>()
  for (const g of gens) {
    for (const t of liveTemplates(g)) {
      const list = out.get(t.kcs.primary) ?? []
      list.push({ family: g.id, template: t.id })
      out.set(t.kcs.primary, list)
    }
  }
  return out
}

/** The most items a mixed block may take in a session of n graded items: floor(n / 2). */
export function whichIsItCap(sessionItems: number): number {
  if (!Number.isInteger(sessionItems) || sessionItems < 0) throw new RangeError(`a session has a whole number of items, not ${String(sessionItems)}`)
  return Math.floor(sessionItems / 2)
}

/** The sets a block could come from now, each with its members that may join (past their exit item, with an item). */
export function eligibleSets(input: Pick<WhichIsItInput, 'sets' | 'pastExit' | 'stageOpen' | 'itemsFor'>): { readonly set: string; readonly kcs: readonly KcId[] }[] {
  const out: { set: string; kcs: KcId[] }[] = []
  for (const s of [...input.sets].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (!input.stageOpen(s.opens)) continue
    const kcs = s.kcs.filter((k) => input.pastExit(k) && input.itemsFor(k).length > 0)
    if (kcs.length >= 2) out.push({ set: s.id, kcs })
  }
  return out
}

/**
 * A mixed block for a session, or null when no set qualifies or the session is too short for one. KCs take
 * turns in a seeded order, so consecutive items never share a KC, and each KC's templates rotate in a seeded order.
 */
export function planWhichIsIt(input: WhichIsItInput): WhichIsItPlan | null {
  const cap = whichIsItCap(input.sessionItems)
  const count = Math.min(input.want ?? cap, cap)
  if (count < WHICH_IS_IT_MIN_ITEMS) return null
  const candidates = eligibleSets(input)
  if (candidates.length === 0) return null
  const draw = createDraw(input.seed)
  const chosen = draw.pick(candidates)
  const order = draw.shuffle(chosen.kcs)
  const rotations = new Map<KcId, { readonly family: GenId; readonly template: TemplateId }[]>()
  for (const kc of order) rotations.set(kc, draw.shuffle(input.itemsFor(kc)))
  const items: WhichIsItItem[] = []
  for (let i = 0; i < count; i++) {
    const kc = order[i % order.length] as KcId
    const rotation = rotations.get(kc) ?? []
    const turn = Math.floor(i / order.length)
    const t = rotation[turn % rotation.length] as { readonly family: GenId; readonly template: TemplateId }
    items.push({ kc, family: t.family, template: t.template })
  }
  return { set: chosen.set, items, cap }
}

/** Every way a block breaks M-which-is-it's rules; empty when it holds (GATE-items can run it on Today's plans). */
export function checkWhichIsIt(plan: WhichIsItPlan, ctx: Pick<WhichIsItInput, 'sessionItems' | 'sets' | 'pastExit' | 'stageOpen'>): string[] {
  const problems: string[] = []
  const set = ctx.sets.find((s) => s.id === plan.set)
  if (set === undefined) return [`set ${plan.set} is not a confusable set`]
  if (!ctx.stageOpen(set.opens)) problems.push(`set ${set.id} opens in ${set.opens}, which the learner has not reached`)
  const cap = whichIsItCap(ctx.sessionItems)
  if (plan.items.length > cap) problems.push(`${plan.items.length} items exceed half of a ${ctx.sessionItems}-item session (${cap})`)
  if (plan.items.length < WHICH_IS_IT_MIN_ITEMS) problems.push(`a mixed block has at least ${WHICH_IS_IT_MIN_ITEMS} items, this one ${plan.items.length}`)
  const kcs = new Set(plan.items.map((i) => i.kc))
  if (kcs.size < 2) problems.push('a mixed block mixes at least two KCs')
  for (const kc of kcs) {
    if (!set.kcs.includes(kc)) problems.push(`${kc} is not in set ${set.id}: a block never crosses sets`)
    if (!ctx.pastExit(kc)) problems.push(`${kc} has not met its exit item yet`)
  }
  return problems
}
