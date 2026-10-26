// GEN-lasso-or-not (ASSESSMENT.md section 4.9): a lasso that violates a liveness property under the stated fairness,
// or "none". This build serves pick mode over the Hold spec (model.ts) with seeded fairness lines and two spec
// variants. Two templates: t1 "starving", whose fairness admits a fair violating lasso, and t2 "fair cycle", whose
// fairness rules every one out, so the key is "none". Both ask the same question, so the stem never gives the key away.
//
// Keys are never stored: key() asks the lasso check (engine.ts) to validate every lasso option and to decide "none"
// exactly over the finite graph, in this page, and every grade prints the graph as its bound.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { Answer, EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { LASSO_CHECK, LASSO_CHECK_VERSION, lassoBound, lassoCheckPort } from './engine.ts'
import type { LassoQuery } from './engine.ts'
import { act, findLasso, HOLD_ACTIONS, holdGraph, holdInitial, hkey, judgeLasso, renderLasso, resolved, showFair, specText } from './model.ts'
import type { Fairness, HoldModel, HState, Lasso, LassoJudgment } from './model.ts'

export { LASSO_CHECK, LASSO_CHECK_VERSION, lassoCheckPort } from './engine.ts'
export { fairCycle, findLasso, holdGraph, judgeLasso, RECORDED } from './model.ts'
export type { Fairness, HoldModel, Lasso } from './model.ts'

export const LASSO_OR_NOT_ID = 'GEN-lasso-or-not' as const
const PART = 'main'

export const LASSO_OR_NOT_BASIS =
  "the lasso check in this page: every lasso replayed on the Hold spec's complete state graph, and \"none\" decided exactly over that graph by its strongly connected sets under the stated fairness (checked by this page over this instance, not a TLC run)"

export type LassoValue = { readonly kind: 'lasso'; readonly lasso: Lasso } | { readonly kind: 'none'; readonly says: string }

export interface LassoData {
  readonly model: HoldModel
  readonly fairness: readonly Fairness[]
  readonly values: Readonly<Record<string, LassoValue>>
  /** The reference's cycle length in actions (stuttering forever counts 1); 0 for "none". */
  readonly cycle: number
}

export interface LassoInstance extends InstanceBase {
  readonly data: LassoData
}

export interface LassoKey extends KeyBase {
  readonly distinct: number
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'starving (a fair violating lasso exists)',
    kcs: { primary: 'KC-5.lasso-reading', secondary: ['KC-5.fairness'] },
    bands: {
      1: { fairness: [0, 0], strong: [0, 0], cycle: [1, 2] },
      2: { fairness: [1, 3], strong: [0, 0], cycle: [2, 4] },
      3: { fairness: [2, 4], strong: [1, 2], cycle: [4, 4] },
    },
  },
  {
    id: 't2',
    name: 'fair cycle (key "none")',
    kcs: { primary: 'KC-5.fairness', secondary: ['KC-5.lasso-reading'] },
    bands: {
      1: { fairness: [1, 3], strong: [0, 1] },
      2: { fairness: [2, 4], strong: [0, 2] },
      3: { fairness: [3, 4], strong: [1, 2] },
    },
  },
]

const lowerFirst = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1)

export const renderValue = (v: LassoValue): string => (v.kind === 'lasso' ? renderLasso(v.lasso) : v.says)

// ---------------------------------------------------------------- candidates (pure, from the spec)

const cycleLength = (l: Lasso): number => (l.cycle.length === 0 ? 1 : l.cycle.length)

/** Lassos with a shortest stem to each unresolved state and every closed walk of up to 4 actions back to it. */
export function candidateLassos(m: HoldModel): Lasso[] {
  const g = holdGraph(m)
  const out: Lasso[] = []
  // Shortest stems, breadth first through unresolved states.
  const stems = new Map<string, string[]>([[hkey(holdInitial()), []]])
  const queue: HState[] = [holdInitial()]
  while (queue.length > 0) {
    const s = queue.shift() as HState
    for (const a of HOLD_ACTIONS) {
      const t = act(m, s, a)
      if (t === null || resolved(t) || stems.has(hkey(t))) continue
      stems.set(hkey(t), [...(stems.get(hkey(s)) as string[]), a])
      queue.push(t)
    }
  }
  for (const s of g.states) {
    const stem = stems.get(hkey(s))
    if (stem === undefined) continue
    out.push({ stem, cycle: [] })
    const go = (cur: HState, path: string[]): void => {
      if (path.length > 0 && hkey(cur) === hkey(s)) {
        out.push({ stem, cycle: path })
        return
      }
      if (path.length === 4) return
      for (const a of HOLD_ACTIONS) {
        const t = act(m, cur, a)
        if (t !== null && !resolved(t)) go(t, [...path, a])
      }
    }
    go(s, [])
  }
  return out
}

/** Behaviors that reach a resolved state and stutter there: Try, Capture or Timeout. */
function resolvingLassos(m: HoldModel): Lasso[] {
  const out: Lasso[] = []
  for (const stem of [['Timeout'], ['Try', 'Capture'], ['Try', 'Timeout']]) {
    let s: HState | null = holdInitial()
    for (const a of stem) s = s === null ? null : act(m, s, a)
    if (s !== null && resolved(s)) out.push({ stem, cycle: [] })
  }
  return out
}

// ---------------------------------------------------------------- copy

const describeFair = (f: Fairness): string => `\`${showFair(f)}\``

function judgmentText(j: LassoJudgment): string {
  if (j.ok) return 'a fair behavior of Spec that never resolves'
  switch (j.why) {
    case 'not-a-behavior':
      return `not a behavior: action ${j.at} is not enabled where it is taken`
    case 'no-close':
      return 'not a lasso: the cycle does not return to the state it starts from'
    case 'resolves':
      return `reaches ${j.state}, so EventuallyResolves holds on it`
    case 'unfair':
      return j.condition.kind === 'WF'
        ? `unfair: ${j.condition.action} is enabled in every state of the cycle and never taken, which ${showFair(j.condition)} forbids`
        : `unfair: ${j.condition.action} is enabled in some state of the cycle, again and again, and never taken, which ${showFair(j.condition)} forbids`
  }
}

const WHY = {
  noneTimeout:
    'Timeout being enabled in `held` does not make it happen. Without a fairness condition on it, a behavior may stay away from Timeout forever, so existing is not happening.',
  noneWeak: (f: Fairness): string =>
    `${describeFair(f)} forces ${f.action} only in a behavior where ${f.action} stays enabled from some point on. A cycle that keeps leaving the states where ${f.action} is enabled escapes it; forcing an action that is enabled again and again needs strong fairness.`,
  resolving:
    'This behavior reaches a resolved state, so `<>Resolved` holds on it. Reading `<>Resolved` as "always resolved" makes it look like a violation, because it starts unresolved; a violation of `<>` must never reach Resolved.',
  unfair: (j: LassoJudgment): string =>
    `This lasso never resolves, but it is not a behavior Fair allows: it is ${judgmentText(j).replace(/^unfair: /, 'unfair, because ')}. A counterexample to a liveness property must itself satisfy the fairness conditions.`,
} as const

// ---------------------------------------------------------------- make

interface Built {
  readonly model: HoldModel
  readonly fairness: readonly Fairness[]
  readonly reference: LassoValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<LassoValue>[]
}

const fixed = (tag: Mutant<LassoValue>['tag'], operator: string, why: string, value: LassoValue | null): Mutant<LassoValue> => ({ tag, operator, why: () => why, apply: () => value })

function drawModel(draw: SeededDraw): HoldModel {
  return { modulus: draw.pick([1, 2] as const), widened: draw.chance(1, 3) }
}

/** A fairness line of `n` conditions on distinct actions, `strong` of them SF. */
function drawFairness(draw: SeededDraw, n: number, strong: number): Fairness[] {
  const acts = draw.sample(HOLD_ACTIONS, n)
  const sf = new Set(draw.sample(acts, strong))
  return acts.map((action) => ({ kind: sf.has(action) ? 'SF' : 'WF', action }))
}

/** A lasso, valid or not, chosen by the draw among the candidates whose judgment fits. */
function pickLasso(draw: SeededDraw, m: HoldModel, fair: readonly Fairness[], want: (j: LassoJudgment, l: Lasso) => boolean): Lasso | null {
  const fits = candidateLassos(m).filter((l) => want(judgeLasso(m, fair, l), l))
  return fits.length === 0 ? null : draw.pick(fits)
}

function t1(band: Band, draw: SeededDraw): Built {
  const [clo, chi] = band === 1 ? [1, 2] : band === 2 ? [2, 4] : [4, 4]
  for (let attempt = 0; attempt < 200; attempt++) {
    const model = drawModel(draw)
    const fairness = band === 1 ? [] : band === 2 ? drawFairness(draw, draw.int(1, 3), 0) : drawFairness(draw, draw.int(2, 4), draw.int(1, 2))
    if (band === 3 && fairness.every((f) => f.kind === 'SF')) continue
    const ref = pickLasso(draw, model, fairness, (j, l) => j.ok && cycleLength(l) >= clo && cycleLength(l) <= chi)
    if (ref === null) continue
    const weak = fairness.filter((f) => f.kind === 'WF')
    const noneWeak = weak.length > 0 ? draw.pick(weak) : null
    const unfair = fairness.length === 0 ? null : pickLasso(draw, model, fairness, (j) => !j.ok && j.why === 'unfair')
    const resolving = draw.pick(resolvingLassos(model))
    const mutants: Mutant<LassoValue>[] = [
      noneWeak === null
        ? fixed('dp:T10', 'enabled read as happening', WHY.noneTimeout, { kind: 'none', says: 'None: Timeout is enabled in held, so the hold eventually resolves' })
        : fixed('dp:T14', 'weak fairness read as strong', WHY.noneWeak(noneWeak), { kind: 'none', says: `None: ${showFair(noneWeak)} forces ${noneWeak.action}, so the hold resolves` }),
      fixed('dp:T1', 'eventually read as always', WHY.resolving, { kind: 'lasso', lasso: resolving }),
      fixed('dp:T14', 'fairness ignored', unfair === null ? '' : WHY.unfair(judgeLasso(model, fairness, unfair)), unfair === null ? null : { kind: 'lasso', lasso: unfair }),
    ]
    return {
      model,
      fairness,
      reference: { kind: 'lasso', lasso: ref },
      referenceWhy: `This lasso starts in the initial state, takes only enabled actions, closes its cycle, and never reaches a resolved state. ${
        fairness.length === 0 ? 'With no fairness condition, any such behavior is allowed, stuttering included.' : 'It is fair: every action under a fairness condition is either taken in the cycle or, for WF, disabled somewhere on it, and, for SF, disabled everywhere on it.'
      }`,
      mutants,
    }
  }
  throw new RangeError(`${LASSO_OR_NOT_ID} t1 b${band}: no fairness line with a fair lasso of the band's cycle length`)
}

function t2(band: Band, draw: SeededDraw): Built {
  const [flo, fhi] = band === 1 ? [1, 3] : band === 2 ? [2, 4] : [3, 4]
  const [slo, shi] = band === 1 ? [0, 1] : band === 2 ? [0, 2] : [1, 2]
  for (let attempt = 0; attempt < 400; attempt++) {
    const model = drawModel(draw)
    const n = draw.int(flo, fhi)
    const fairness = drawFairness(draw, n, draw.int(slo, Math.min(shi, n)))
    if (findLasso(model, fairness) !== null) continue
    // Distractors: a lasso that cycles without resolving but breaks a fairness condition, preferring a real cycle over
    // stuttering; stuttering forever in the initial state, which some condition rules out; and a resolving behavior.
    const unfairCycle = pickLasso(draw, model, fairness, (j, l) => !j.ok && j.why === 'unfair' && l.cycle.length > 0)
    const stutter: Lasso = { stem: [], cycle: [] }
    const resolving = draw.pick(resolvingLassos(model))
    const mutants: Mutant<LassoValue>[] = [
      fixed('dp:T14', 'fairness ignored', unfairCycle === null ? '' : WHY.unfair(judgeLasso(model, fairness, unfairCycle)), unfairCycle === null ? null : { kind: 'lasso', lasso: unfairCycle }),
      fixed('dp:T14', 'stuttering read as always allowed', WHY.unfair(judgeLasso(model, fairness, stutter)), { kind: 'lasso', lasso: stutter }),
      fixed('dp:T1', 'eventually read as always', WHY.resolving, { kind: 'lasso', lasso: resolving }),
    ]
    return {
      model,
      fairness,
      reference: { kind: 'none', says: 'None: every behavior that satisfies Fair eventually resolves' },
      referenceWhy:
        'Every cycle of unresolved states breaks some fairness condition: either an action under WF is enabled throughout it and never taken, or an action under SF is enabled in it and never taken. So no fair behavior stays unresolved forever.',
      mutants,
    }
  }
  throw new RangeError(`${LASSO_OR_NOT_ID} t2 b${band}: no fairness line that rules out every lasso`)
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2 }

function make(seed: number, band: Band, template: TemplateId): LassoInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${LASSO_OR_NOT_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${LASSO_OR_NOT_ID}/${template}/b${band}`))
  const b = build(band, draw)
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: b.mutants, distractors: 2, draw: draw.fork('options'), render: renderValue })
  const stem = [
    '*Spec:* a hold that a worker keeps trying to capture, while the provider may keep answering "busy". `Fair` is the fairness line of this item.',
    '',
    '```tla',
    specText(b.model, b.fairness),
    '```',
    '',
    'Does `Spec` allow a behavior that never resolves? Pick a lasso (a stem from the initial state, then a cycle repeated forever) that violates `EventuallyResolves` and satisfies `Fair`, or "none".',
    '',
    'This page builds the spec\'s state graph and checks your pick over this instance.',
  ].join('\n')
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Pick the lasso, or "none".', options }
  return {
    family: LASSO_OR_NOT_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem, parts: [part] },
    bound: lassoBound(b.model),
    data: { model: b.model, fairness: b.fairness, values, cycle: b.reference.kind === 'lasso' ? cycleLength(b.reference.lasso) : 0 },
  }
}

// ---------------------------------------------------------------- key and grade

function query<W>(port: EnginePort, input: LassoQuery): Promise<Answer<W>> {
  return ask<LassoQuery, W>(port, { engine: LASSO_CHECK, version: LASSO_CHECK_VERSION, input, budget: { wallMs: 2000 } })
}

async function key(inst: LassoInstance, port: EnginePort) {
  const { model, fairness } = inst.data
  const none = await query<Lasso>(port, { op: 'none', model, fairness })
  if (none.kind === 'unknown') return discard(none.budget ? 'budget' : 'unknown', `the lasso check could not decide "none": ${none.reason}`)
  const found = none.reply.verdict.kind === 'sat' ? (none.reply.witness ?? null) : null
  const engine = engineAtVersion(none.reply)
  const facts = new Map<LassoValue, { ok: boolean; text: string }>()
  const judge = async (v: LassoValue): Promise<{ ok: boolean; text: string } | { unknown: string; budget: boolean }> => {
    const cached = facts.get(v)
    if (cached !== undefined) return cached
    let fact: { ok: boolean; text: string }
    if (v.kind === 'none') fact = found === null ? { ok: true, text: 'right: no fair lasso of unresolved states exists in the graph' } : { ok: false, text: `wrong: the check finds one: ${lowerFirst(renderLasso(found))}` }
    else {
      const r = await query<LassoJudgment>(port, { op: 'validate', model, fairness, lasso: v.lasso })
      if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
      const j = r.reply.witness
      if (j === undefined) return { unknown: 'no judgment', budget: false }
      fact = { ok: j.ok, text: judgmentText(j) }
    }
    facts.set(v, fact)
    return fact
  }
  const confirm = async (ref: LassoValue): Promise<ConfirmResult> => {
    const f = await judge(ref)
    if ('unknown' in f) return f
    return f.ok ? { confirmed: true } : { rejected: f.text }
  }
  const labelOf = (v: LassoValue): string => Object.keys(inst.data.values).find((id) => inst.data.values[id] === v) ?? '?'
  const distinguish = async (a: LassoValue, b: LassoValue): Promise<DistinguishResult> => {
    const fa = await judge(a)
    const fb = await judge(b)
    if ('unknown' in fa) return fa
    if ('unknown' in fb) return fb
    if (renderValue(a) === renderValue(b) || (fa.ok && fb.ok)) return { same: true }
    return { differ: { [labelOf(a)]: fa.text, [labelOf(b)]: fb.text } }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: LassoKey = { engine, choices: [choice], statements: [], distinct: none.reply.stats.distinct ?? 0, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

function measure(inst: LassoInstance): Measure {
  const fairness = inst.data.fairness.length
  const strong = inst.data.fairness.filter((f) => f.kind === 'SF').length
  return inst.template === 't1' ? { fairness, strong, cycle: inst.data.cycle } : { fairness, strong }
}

export const lassoOrNotGenerator: Generator<LassoInstance, LassoKey> = defineGenerator<LassoInstance, LassoKey>({
  id: LASSO_OR_NOT_ID,
  fixture: false,
  title: 'Lasso or not: a fair behavior that never resolves, or none',
  templates: TEMPLATES,
  engines: [LASSO_CHECK],
  misconceptions: ['dp:T10', 'dp:T14', 'dp:T1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: LASSO_OR_NOT_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  // The key's kind is the structure: t1's reference is a lasso, t2's is "none".
  structure: (inst) => {
    const ref = (inst.item.parts[0] as ChoicePart).options.find((o) => o.origin.kind === 'reference')
    const v = ref === undefined ? undefined : inst.data.values[ref.id]
    return `hold|key:${v?.kind ?? '?'}|options:${Object.values(inst.data.values).map((x) => x.kind).sort().join(',')}`
  },
  replay: (inst, part, a, b, witness) => {
    if (part !== PART || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
    const va = inst.data.values[a]
    const vb = inst.data.values[b]
    if (va === undefined || vb === undefined) return false
    const okOf = (v: LassoValue): boolean => (v.kind === 'none' ? findLasso(inst.data.model, inst.data.fairness) === null : judgeLasso(inst.data.model, inst.data.fairness, v.lasso).ok)
    const w = witness as Record<string, Json>
    return typeof w[a] === 'string' && typeof w[b] === 'string' && !(okOf(va) && okOf(vb))
  },
})

export const generator = lassoOrNotGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [LASSO_CHECK]: lassoCheckPort }
