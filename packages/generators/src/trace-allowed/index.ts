// GEN-trace-allowed (ASSESSMENT.md section 4.8): judge behaviors of a TLA+ spec against its state graph. This build
// serves pick mode, three templates, structurally different: t1 asks for the prefix that is a behavior of the spec
// and violates the safety property, with its length in actions; t2 for the set of actions enabled after a prefix;
// t3 whether a sequence of states, some of them repeated, is a behavior of `Init ∧ [][Next]_vars`.
//
// The spec is DoubleSpend (model.ts), at constants each seed draws (Amount <= Init < 2 * Amount, so two stale writes
// overspend, as at the recorded Init 100, Amount 80). Keys are never stored: key() asks the trace graph (engine.ts)
// for the complete reachable graph and replays every option on it. The graph is built by this page over this
// instance's constants, so every grade prints the constants as its bound.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import { chooseDistractors } from './choose.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { graphBound, TRACE_GRAPH, TRACE_GRAPH_MAX_STATES, TRACE_GRAPH_VERSION, traceGraphPort } from './engine.ts'
import type { GraphQuery } from './engine.ts'
import { actionsOf, describeModel, enabledAt, explore, initial, noOverspend, showState, stateKey, step, successors, workerOf } from './model.ts'
import type { Graph, WorkerModel, WState } from './model.ts'

export { TRACE_GRAPH, TRACE_GRAPH_MAX_STATES, TRACE_GRAPH_VERSION, traceGraphPort } from './engine.ts'
export { explore } from './model.ts'
export type { Graph, WorkerModel, WState } from './model.ts'

export const TRACE_ALLOWED_ID = 'GEN-trace-allowed' as const
const PART = 'main'

export const TRACE_ALLOWED_BASIS =
  "the trace graph in this page: the spec's complete reachable state graph at this item's constants, built and replayed by this page over this instance (not a TLC run)"

// ---------------------------------------------------------------- the options' values

/** t1: a prefix as a list of steps (a step with two actions is not a step of Next), and the length it claims. */
export interface TraceValue {
  readonly kind: 'trace'
  readonly steps: readonly (readonly string[])[]
  readonly claim: number
}

/** t2: a set of actions; `together` adds "or two of them as one step". */
export interface EnabledValue {
  readonly kind: 'enabled'
  readonly actions: readonly string[]
  readonly together?: boolean
}

/** t3: a judgment on a sequence of states. */
export type Verdict =
  | { readonly kind: 'verdict'; readonly yes: true }
  | { readonly kind: 'verdict'; readonly yes: false; readonly reason: 'jump'; readonly at: number }
  | { readonly kind: 'verdict'; readonly yes: false; readonly reason: 'repeat'; readonly at: number; readonly short?: true }
  | { readonly kind: 'verdict'; readonly yes: false; readonly reason: 'end'; readonly at?: number; readonly short?: true }
  | { readonly kind: 'verdict'; readonly yes: false; readonly reason: 'order'; readonly short?: true }
  | { readonly kind: 'verdict'; readonly yes: 'flag'; readonly short?: true }

export type OptionValue = TraceValue | EnabledValue | Verdict

export interface TraceAllowedData {
  readonly model: WorkerModel
  /** t2: the prefix after which the enabled set is asked. */
  readonly prefix?: readonly string[]
  /** t3: the sequence of states judged. */
  readonly sequence?: readonly WState[]
  /** t3: how many states repeat their predecessor, and whether the last one does. */
  readonly repeats?: number
  readonly endRepeat?: number
  readonly values: Readonly<Record<string, OptionValue>>
}

export interface TraceAllowedInstance extends InstanceBase {
  readonly data: TraceAllowedData
}

export interface TraceAllowedKey extends KeyBase {
  /** The graph's size, as the feedback prints it. */
  readonly distinct: number
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'safety prefix',
    kcs: { primary: 'KC-5.interleaving-granularity', secondary: ['KC-5.safety-vs-liveness'] },
    bands: {
      1: { processes: [2, 2], actions: [4, 4] },
      2: { processes: [2, 2], actions: [5, 6] },
      3: { processes: [3, 3], actions: [7, 8] },
    },
  },
  {
    id: 't2',
    name: 'enabled actions',
    kcs: { primary: 'KC-5.behaviors-stuttering', secondary: ['KC-5.interleaving-granularity'] },
    bands: {
      1: { processes: [2, 2], guarded: [0, 0] },
      2: { processes: [3, 3], guarded: [0, 0] },
      3: { processes: [3, 3], guarded: [1, 1] },
    },
  },
  {
    id: 't3',
    name: 'stuttering',
    kcs: { primary: 'KC-5.behaviors-stuttering', secondary: ['KC-5.holds-lifecycle'] },
    bands: {
      1: { repeats: [0, 0], endRepeat: [0, 0] },
      2: { repeats: [1, 1], endRepeat: [0, 0] },
      3: { repeats: [2, 2], endRepeat: [1, 1] },
    },
  },
]

// ---------------------------------------------------------------- rendering

const renderStep = (s: readonly string[]): string => s.join(' and ')
// Steps are joined by arrows, not commas [D], so a longer trace is not also the one with the most punctuation.
const renderTrace = (v: TraceValue): string => `${v.steps.map(renderStep).join(' → ')} · ${v.claim} action${v.claim === 1 ? '' : 's'}`
const renderEnabled = (v: EnabledValue): string =>
  v.actions.length === 0 ? 'none: only stuttering steps are possible' : `${v.actions.join(', ')}${v.together === true ? ', or two of them together as one step' : ''}`

// Every verdict reads alike [D]: a capitalized answer, one comma, Next named, and no absolute word, so none of them
// stands out by its punctuation, capitals or wording. A wrong verdict comes in a shorter and a longer wording, so its
// length says nothing either.
function renderVerdict(v: Verdict): string {
  if (v.yes === true) return 'Yes: each step is a step of Next, or a stuttering step that changes nothing'
  const short = 'short' in v && v.short === true
  if (v.yes === 'flag') return short ? 'It depends on whether TLC checks this sequence, run with -deadlock' : 'It depends on TLC: run with -deadlock, a state with no step of Next is not reported to you'
  switch (v.reason) {
    case 'jump':
      return `No: state ${v.at} to state ${v.at + 1} is neither a step of Next, nor a stuttering step`
    case 'repeat':
      return short ? `No: state ${v.at + 1} repeats state ${v.at}, and a step of Next changes it` : `No: state ${v.at + 1} repeats state ${v.at}, and each step of Next must change at least something`
    case 'end': {
      const where = v.at === undefined ? 'the last state' : `state ${v.at}`
      return short ? `No: ${where} still enables Next, so this behavior is not at its end` : `No: ${where} still enables Next, and a behavior goes on as long as an action is enabled`
    }
    case 'order':
      return short ? "No: a worker steps before the other is done, out of Next's order" : 'No: a worker takes a step of Next before the other is done, out of program order'
  }
}

export function renderValue(v: OptionValue): string {
  return v.kind === 'trace' ? renderTrace(v) : v.kind === 'enabled' ? renderEnabled(v) : renderVerdict(v)
}

const sameValue = (a: OptionValue, b: OptionValue): boolean => renderValue(a) === renderValue(b)

// ---------------------------------------------------------------- the checker's judgments (pure, over a graph)

/** What replaying a prefix on the graph shows. */
export interface TraceReplay {
  readonly allowed: boolean
  /** The first step that is not a step of Next, 1-based, when not allowed. */
  readonly badStep?: number
  readonly actions: number
  /** The action count after which NoOverspend first fails, or null. */
  readonly violatesAt: number | null
  readonly end?: WState
}

export function replayTrace(m: WorkerModel, g: Graph, v: TraceValue): TraceReplay {
  let cur = g.init
  let actions = 0
  let violatesAt: number | null = null
  for (let i = 0; i < v.steps.length; i++) {
    const s = v.steps[i] as readonly string[]
    if (s.length !== 1) return { allowed: false, badStep: i + 1, actions: actions + s.length, violatesAt }
    const to = step(g, cur, s[0] as string)
    if (to === undefined) return { allowed: false, badStep: i + 1, actions: actions + 1, violatesAt }
    cur = to
    actions++
    if (violatesAt === null && !noOverspend(m, g.states[cur] as WState)) violatesAt = actions
  }
  return { allowed: true, actions, violatesAt, end: g.states[cur] as WState }
}

/** True when a t1 option answers the question: a behavior's prefix that violates NoOverspend, its length right. */
export function traceAnswers(m: WorkerModel, g: Graph, v: TraceValue): boolean {
  const r = replayTrace(m, g, v)
  return r.allowed && r.violatesAt !== null && v.claim === r.actions
}

function describeTrace(m: WorkerModel, g: Graph, v: TraceValue): string {
  const r = replayTrace(m, g, v)
  if (!r.allowed) return `not a behavior: step ${r.badStep as number} (${renderStep(v.steps[(r.badStep as number) - 1] as readonly string[])}) is not one step of Next`
  const len = v.claim === r.actions ? `${r.actions} actions, as claimed` : `${r.actions} actions, not ${v.claim} (${r.actions + 1} states)`
  return r.violatesAt === null ? `a behavior; never violates NoOverspend (spent = ${(r.end as WState).spent}); ${len}` : `a behavior; violates NoOverspend after action ${r.violatesAt} (spent = ${(r.end as WState).spent}); ${len}`
}

/** The state a prefix of single actions reaches, or undefined when it is not a behavior. */
export function reach(g: Graph, prefix: readonly string[]): number | undefined {
  let cur: number | undefined = g.init
  for (const a of prefix) {
    if (cur === undefined) return undefined
    cur = step(g, cur, a)
  }
  return cur
}

/** The sorted set of actions enabled after a prefix, or undefined when the prefix is not a behavior. */
export function enabledAfter(g: Graph, prefix: readonly string[]): string[] | undefined {
  const at = reach(g, prefix)
  return at === undefined ? undefined : enabledAt(g, at).sort()
}

export const enabledAnswers = (g: Graph, prefix: readonly string[], v: EnabledValue): boolean => {
  const truth = enabledAfter(g, prefix)
  return truth !== undefined && v.together !== true && truth.join(',') === [...v.actions].sort().join(',')
}

/** The truth about a sequence of states: a behavior's prefix, or the first pair that is not a step. */
export function judgeSequence(g: Graph, seq: readonly WState[]): Verdict {
  const first = seq[0]
  if (first === undefined || stateKey(first) !== stateKey(g.states[g.init] as WState)) return { kind: 'verdict', yes: false, reason: 'jump', at: 0 }
  const idx = new Map(g.states.map((s, i) => [stateKey(s), i]))
  for (let i = 0; i + 1 < seq.length; i++) {
    const a = idx.get(stateKey(seq[i] as WState))
    const b = idx.get(stateKey(seq[i + 1] as WState))
    if (a === undefined || b === undefined) return { kind: 'verdict', yes: false, reason: 'jump', at: i + 1 }
    if (a === b) continue
    if (!g.edges.some((e) => e.from === a && e.to === b)) return { kind: 'verdict', yes: false, reason: 'jump', at: i + 1 }
  }
  return { kind: 'verdict', yes: true }
}

const describeVerdict = (v: Verdict): string => renderVerdict(v).replace(/^Yes: /, 'a behavior: ').replace(/^No: /, 'not a behavior: ')

// ---------------------------------------------------------------- copy

const WHY = {
  states: (n: number): string =>
    `This counts states, not actions: a prefix of ${n} actions passes through ${n + 1} states. Lengths are given in actions, the steps taken, as TLC's own trace of the double spend is 4 actions over 5 states.`,
  order:
    'This runs each worker to the end before the next starts: steps in program order, as if the workers took turns. That is one behavior of the spec, but it never overspends, because each read sees the last write.',
  together:
    'Two actions in one step is not a step of this spec: every step of Next is one worker taking one action. Interleaving means the actions alternate, one per step; it never fuses them.',
  past: (n: number): string => `This runs one action past the violation and still claims ${n} actions: it has ${n + 1}. The length in actions counts every step taken.`,
  leftOut: (a: string): string => `This leaves out ${a}. Its worker's guard holds in this state, so ${a} can take the next step, whichever worker moved last.`,
  enabledOrder: 'This lets only the first unfinished worker move, as if steps followed program order across workers. Any worker whose own next action is enabled can take the next step.',
  enabledExists: 'This lists every action of a worker that has not finished, guards ignored. An action is enabled only where its guard holds: a worker at `read` can Read, not Write.',
  enabledBehind: (n: number): string =>
    `This is the set enabled one state earlier, after ${n - 1} action${n - 1 === 1 ? '' : 's'}. After ${n} actions the system is in the state the last action produced, which is state ${n + 1} counting the initial state as state 1.`,
  enabledTogether: 'Every step of Next is one worker taking one action; two actions never happen as one step, even when both are enabled.',
  yesMissed: 'One pair of neighbouring states is not linked by any action: the sequence skips a state, so two actions happened between them. Count the changes between each pair.',
  repeat: 'A repeated state is a stuttering step. `[][Next]_vars` allows every step that is a Next step or leaves `vars` unchanged, so a behavior may stay put for any number of steps.',
  end: 'Behaviors are infinite and may stop changing anywhere: after any prefix, stuttering forever is allowed, whether or not an action is enabled. Forcing progress is what fairness adds.',
  flag: "TLC's flags decide what TLC reports, not which behaviors a spec allows. `-deadlock` turns off the check for states with no Next successor; the set of behaviors is the same.",
  orderVerdict: 'The spec lets any enabled worker take the next step, so workers interleave. Program order holds within one worker, not across workers.',
} as const

// ---------------------------------------------------------------- make

interface Built {
  readonly stem: string
  readonly reference: OptionValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<OptionValue>[]
  readonly distractors: number
  readonly model: WorkerModel
  readonly extra: Partial<TraceAllowedData>
}

const fixed = (tag: Mutant<OptionValue>['tag'], operator: string, why: string, value: OptionValue | null): Mutant<OptionValue> => ({ tag, operator, why: () => why, apply: () => value })

/** Constants with Amount <= Init < 2 * Amount (two stale writes overspend), on a lattice of 10. */
function drawConstants(draw: SeededDraw): { init: number; amount: number } {
  const amount = draw.pick([60, 70, 80, 90])
  const init = draw.pick(Array.from({ length: amount / 10 }, (_, i) => amount + i * 10))
  return { init, amount }
}

/** Every prefix that ends at NoOverspend's first violation (actions only), depth first in worker order. */
function violatingPrefixes(m: WorkerModel, g: Graph): string[][] {
  const out: string[][] = []
  const go = (at: number, path: string[]): void => {
    if (!noOverspend(m, g.states[at] as WState)) {
      out.push(path)
      return
    }
    for (const e of g.edges) if (e.from === at) go(e.to, [...path, e.action])
  }
  go(g.init, [])
  return out
}

/** The program-order prefix: every worker to the end, one after another. */
function programOrder(m: WorkerModel, g: Graph): string[] {
  const out: string[] = []
  let cur = g.init
  for (let w = 0; w < m.workers; w++) {
    for (const a of actionsOf(m, w)) {
      const to = step(g, cur, a)
      if (to === undefined) break
      out.push(a)
      cur = to
    }
  }
  return out
}

function mustGraph(m: WorkerModel): Graph {
  const g = explore(m, TRACE_GRAPH_MAX_STATES)
  if (g === null) throw new RangeError(`${TRACE_ALLOWED_ID}: the graph at ${JSON.stringify(m)} is over the budget`)
  return g
}

function t1(band: Band, draw: SeededDraw): Built {
  const { init, amount } = drawConstants(draw)
  const m: WorkerModel = { init, amount, workers: band === 3 ? 3 : 2, steps: band === 1 ? 2 : 3 }
  const g = mustGraph(m)
  const [lo, hi] = band === 1 ? [4, 4] : band === 2 ? [5, 6] : [7, 8]
  const all = violatingPrefixes(m, g).filter((p) => p.length >= lo && p.length <= hi)
  if (all.length === 0) throw new RangeError(`${TRACE_ALLOWED_ID} t1: no violating prefix of ${lo}-${hi} actions at ${JSON.stringify(m)}`)
  const prefix = draw.pick(all)
  const n = prefix.length
  const reference: TraceValue = { kind: 'trace', steps: prefix.map((a) => [a]), claim: n }
  // Fuse the first two neighbouring actions of different workers into one step.
  let fuse = -1
  for (let i = 0; i + 1 < n; i++) if (workerOf(prefix[i] as string) !== workerOf(prefix[i + 1] as string)) {
    fuse = i
    break
  }
  const fused: TraceValue | null =
    fuse < 0 ? null : { kind: 'trace', steps: [...prefix.slice(0, fuse).map((a) => [a]), [prefix[fuse] as string, prefix[fuse + 1] as string], ...prefix.slice(fuse + 2).map((a) => [a])], claim: n - 1 }
  const order = programOrder(m, g)
  const at = reach(g, prefix)
  const past = at === undefined ? null : (enabledAt(g, at).sort()[0] ?? null)
  // The single mistakes and each with the states counted [D]; choose.ts shows three of them.
  const two = (a: string, b: string): string => `Two mistakes at once. ${a} ${b.replace(/^This /, 'It also ')}`
  const mutants: Mutant<OptionValue>[] = [
    fixed('dp:T6', 'count states', WHY.states(n), { ...reference, claim: n + 1 }),
    fixed('dp:C1', 'program order', WHY.order, { kind: 'trace', steps: order.map((a) => [a]), claim: order.length }),
    fixed('dp:T16', 'two actions in one step', WHY.together, fused),
    fixed('dp:C1', 'program order, and count states', two(WHY.order, WHY.states(order.length)), { kind: 'trace', steps: order.map((a) => [a]), claim: order.length + 1 }),
    fixed('dp:T16', 'two actions in one step, and count states', two(WHY.together, WHY.states(n)), fused === null ? null : { ...fused, claim: n + 1 }),
    fixed('dp:T16', 'two actions in one step, counted as two', WHY.together, fused === null ? null : { ...fused, claim: n }),
    fixed('dp:T6', 'one action past the violation, counted short', WHY.past(n), past === null ? null : { kind: 'trace', steps: [...prefix, past].map((a) => [a]), claim: n }),
  ]
  return {
    stem: `${describeModel(m)}\n\nWhich of these is a prefix of a behavior of the spec that violates NoOverspend, with its length given correctly in actions?`,
    reference,
    referenceWhy: `Each step is one worker taking one enabled action, starting from the initial state, and after action ${n} \`spent\` exceeds Init: ${n} actions, ${n + 1} states. Two workers read before either writes, so both write a stale \`seen - Amount\`.`,
    mutants,
    distractors: 3,
    model: m,
    extra: {},
  }
}

/** A seeded walk of `len` actions from the initial state (stopping early where nothing is enabled). */
function walk(m: WorkerModel, draw: SeededDraw, len: number): { actions: string[]; states: WState[] } {
  let s = initial(m)
  const states = [s]
  const actions: string[] = []
  for (let i = 0; i < len; i++) {
    const next = successors(m, s)
    if (next.length === 0) break
    const pick = draw.pick(next)
    actions.push(pick.action)
    s = pick.to
    states.push(s)
  }
  return { actions, states }
}

function t2(band: Band, draw: SeededDraw): Built {
  const { init, amount } = drawConstants(draw)
  const m: WorkerModel = { init, amount, workers: band === 1 ? 2 : 3, steps: band === 3 ? 3 : 2 }
  const g = mustGraph(m)
  // A prefix after which at least two actions are enabled and the state one step earlier enables a different set.
  for (let attempt = 0; attempt < 64; attempt++) {
    const len = draw.int(2, m.workers * m.steps - 2)
    const { actions } = walk(m, draw, len)
    if (actions.length < 2) continue
    const truth = enabledAfter(g, actions)
    const before = enabledAfter(g, actions.slice(0, -1))
    if (truth === undefined || before === undefined || truth.length < 2 || truth.join(',') === before.join(',')) continue
    // Band 3 asks for a worker whose guard reads its local `seen`: one at Check, or one that Check stopped.
    if (band === 3) {
      const s = g.states[reach(g, actions) as number] as WState
      if (!s.pc.some((pc, w) => pc === 'check' || (pc === 'done' && (s.seen[w] as number) < m.amount))) continue
    }
    const s = g.states[reach(g, actions) as number] as WState
    const live = s.pc.map((pc, w) => (pc === 'done' ? -1 : w)).filter((w) => w >= 0)
    const firstLive = live[0] as number
    const orderSet = truth.filter((a) => workerOf(a) === firstLive)
    const exists: string[] = []
    for (const w of live) for (const a of actionsOf(m, w)) exists.push(a)
    const n = actions.length
    const reference: EnabledValue = { kind: 'enabled', actions: truth }
    const mutants: Mutant<OptionValue>[] = [
      fixed('dp:C1', 'program order across workers', WHY.enabledOrder, orderSet.length > 0 && orderSet.length < truth.length ? { kind: 'enabled', actions: orderSet } : null),
      fixed('dp:T10', 'guards ignored', WHY.enabledExists, { kind: 'enabled', actions: exists.sort() }),
      fixed('dp:T6', 'one state behind', WHY.enabledBehind(n), { kind: 'enabled', actions: before }),
      fixed('dp:T16', 'two actions in one step', WHY.enabledTogether, { kind: 'enabled', actions: truth, together: true }),
      // Two mistakes at once [D]; choose.ts shows three of the candidates.
      fixed('dp:T6', 'one state behind, and two actions in one step', `Two mistakes at once. ${WHY.enabledBehind(n)} ${WHY.enabledTogether}`, before.length >= 2 ? { kind: 'enabled', actions: before, together: true } : null),
      fixed('dp:T10', 'guards ignored, and two actions in one step', `Two mistakes at once. ${WHY.enabledExists} ${WHY.enabledTogether}`, { kind: 'enabled', actions: [...exists].sort(), together: true }),
      fixed('dp:C1', 'program order, and two actions in one step', `Two mistakes at once. ${WHY.enabledOrder} ${WHY.enabledTogether}`, orderSet.length >= 2 && orderSet.length < truth.length ? { kind: 'enabled', actions: orderSet, together: true } : null),
      ...truth.map((a) => fixed('dp:C1', 'an enabled action left out', WHY.leftOut(a), { kind: 'enabled', actions: truth.filter((x) => x !== a) })),
    ]
    return {
      stem: `${describeModel(m)}\n\nFrom the initial state the system takes these ${n} actions: ${actions.join(', ')}. The state it reaches is \`${showState(s)}\`. Which actions are enabled there?`,
      reference,
      referenceWhy: `In the state reached, an action is enabled when its guard holds: each unfinished worker can take the action its \`pc\` names${m.steps === 3 ? ', and Check reads only the worker\'s own `seen`' : ''}. That gives ${truth.join(', ')}.`,
      mutants,
      distractors: 3,
      model: m,
      extra: { prefix: actions },
    }
  }
  throw new RangeError(`${TRACE_ALLOWED_ID} t2: no prefix with a changing enabled set at ${JSON.stringify(m)}`)
}

function t3(band: Band, draw: SeededDraw): Built {
  const { init, amount } = drawConstants(draw)
  const m: WorkerModel = { init, amount, workers: 2, steps: 2 }
  const g = mustGraph(m)
  for (let attempt = 0; attempt < 64; attempt++) {
    const { actions, states } = walk(m, draw, draw.int(3, 3))
    if (actions.length < 3) continue
    // Interleaved: some worker acts while another has started and not finished.
    if (workerOf(actions[0] as string) === workerOf(actions[1] as string) && workerOf(actions[1] as string) === workerOf(actions[2] as string)) continue
    if (workerOf(actions[0] as string) === workerOf(actions[1] as string)) continue
    const last = states[states.length - 1] as WState
    if (successors(m, last).length === 0) continue
    // Half the items skip a middle state, so the key is "no" as often as "yes".
    let seq: WState[] = [...states]
    if (draw.bool()) {
      const at = draw.int(1, seq.length - 2)
      seq = [...seq.slice(0, at), ...seq.slice(at + 1)]
    }
    // Repeats: band 2 one inside, band 3 one inside and one at the end.
    const repeats = band === 1 ? 0 : band === 2 ? 1 : 2
    if (repeats >= 1) {
      const at = draw.int(1, seq.length - 1)
      seq = [...seq.slice(0, at + 1), seq[at] as WState, ...seq.slice(at + 1)]
    }
    if (repeats === 2) seq = [...seq, seq[seq.length - 1] as WState]
    const truth = judgeSequence(g, seq)
    let repeatAt = -1
    for (let i = 1; i < seq.length; i++) if (stateKey(seq[i] as WState) === stateKey(seq[i - 1] as WState)) {
      repeatAt = i
      break
    }
    // Each wrong verdict in both wordings; choose.ts shows one wording of three of them.
    const mutants: Mutant<OptionValue>[] = [
      ...[undefined, true as const].flatMap((short) => [
        fixed('dp:T7', 'stuttering is not a step', WHY.repeat, repeatAt > 0 ? { kind: 'verdict', yes: false, reason: 'repeat', at: repeatAt, ...(short ? { short } : {}) } : null),
        fixed('dp:T8', 'behaviors end when nothing is enabled', WHY.end, { kind: 'verdict', yes: false, reason: 'end', at: seq.length, ...(short ? { short } : {}) }),
        fixed('dp:T9', 'TLC flags as the meaning', WHY.flag, { kind: 'verdict', yes: 'flag', ...(short ? { short } : {}) }),
        fixed('dp:C1', 'program order across workers', WHY.orderVerdict, { kind: 'verdict', yes: false, reason: 'order', ...(short ? { short } : {}) }),
      ]),
      fixed('dp:T6', 'miss a skipped state', WHY.yesMissed, truth.yes === true ? null : { kind: 'verdict', yes: true }),
    ]
    const rows = seq.map((s, i) => `| ${i + 1} | \`${showState(s)}\` |`).join('\n')
    return {
      stem: `${describeModel(m)}\n\nIs this sequence of states the start of a behavior of \`Spec\`?\n\n| State | Values |\n|---|---|\n${rows}`,
      reference: truth,
      referenceWhy:
        truth.yes === true
          ? 'The first state is the initial state, and each next state is either one Next step away or the same state again: a stuttering step, which `[][Next]_vars` allows. So the sequence starts a behavior.'
          : `States ${(truth as { at: number }).at} and ${(truth as { at: number }).at + 1} differ by two actions, with the state between them skipped: no single step of Next, and no stuttering step, links them.`,
      mutants,
      distractors: 3,
      model: m,
      extra: { sequence: seq, repeats, endRepeat: repeats === 2 ? 1 : 0 },
    }
  }
  throw new RangeError(`${TRACE_ALLOWED_ID} t3: no interleaved walk at ${JSON.stringify(m)}`)
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

function make(seed: number, band: Band, template: TemplateId): TraceAllowedInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${TRACE_ALLOWED_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${TRACE_ALLOWED_ID}/${template}/b${band}`))
  const b = build(band, draw)
  // The distractors shown, chosen among the mistakes so the key does not stand out (choose.ts).
  const chosen = chooseDistractors({ reference: b.reference, candidates: b.mutants, n: b.distractors, draw: draw.fork('choose'), render: renderValue })
  const { options, values } = assembleOptions({
    reference: b.reference,
    referenceWhy: b.referenceWhy,
    mutants: chosen,
    distractors: b.distractors,
    draw: draw.fork('options'),
    render: renderValue,
  })
  const m = b.model
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Pick the answer the state graph bears out.', options }
  return {
    family: TRACE_ALLOWED_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: `${b.stem}\n\nThis page builds the spec's state graph at these constants and checks your pick over this instance.`, parts: [part] },
    bound: graphBound(m),
    data: { model: m, values, ...b.extra },
  }
}

// ---------------------------------------------------------------- key and grade

async function key(inst: TraceAllowedInstance, port: EnginePort) {
  const input: GraphQuery = { op: 'graph', model: inst.data.model }
  const r = await ask<GraphQuery, Graph>(port, { engine: TRACE_GRAPH, version: TRACE_GRAPH_VERSION, input, budget: { wallMs: 2000, maxStates: TRACE_GRAPH_MAX_STATES } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the trace graph could not be built: ${r.reason}`)
  const g = r.reply.witness
  if (g === undefined) return discard('unknown', 'the trace graph returned no graph')
  const m = inst.data.model
  const prefix = inst.data.prefix ?? []
  const seq = inst.data.sequence ?? []
  const answers = (v: OptionValue): boolean => {
    if (v.kind === 'trace') return traceAnswers(m, g, v)
    if (v.kind === 'enabled') return enabledAnswers(g, prefix, v)
    return sameValue(v, judgeSequence(g, seq))
  }
  const describe = (v: OptionValue): string => {
    if (v.kind === 'trace') return describeTrace(m, g, v)
    if (v.kind === 'enabled') {
      const truth = enabledAfter(g, prefix) ?? []
      return answers(v) ? 'exactly the enabled set' : `the enabled set is ${truth.length === 0 ? 'empty' : truth.join(', ')}`
    }
    return answers(v) ? `matches the replay: ${describeVerdict(judgeSequence(g, seq))}` : `the replay finds ${describeVerdict(judgeSequence(g, seq))}`
  }
  const confirm = async (ref: OptionValue): Promise<ConfirmResult> => (answers(ref) ? { confirmed: true } : { rejected: describe(ref) })
  const labelOf = (v: OptionValue): string => Object.keys(inst.data.values).find((id) => inst.data.values[id] === v) ?? '?'
  const distinguish = async (a: OptionValue, b: OptionValue): Promise<DistinguishResult> => {
    if (sameValue(a, b)) return { same: true }
    return { differ: { [labelOf(a)]: describe(a), [labelOf(b)]: describe(b) } }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: TraceAllowedKey = { engine: engineAtVersion(r.reply), choices: [choice], statements: [], distinct: g.distinct, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

function measure(inst: TraceAllowedInstance): Measure {
  const m = inst.data.model
  switch (inst.template) {
    case 't1': {
      const refId = (inst.item.parts[0] as ChoicePart).options.find((o) => o.origin.kind === 'reference')?.id ?? ''
      const v = inst.data.values[refId]
      return { processes: m.workers, actions: v?.kind === 'trace' ? v.claim : 0 }
    }
    case 't2':
      return { processes: m.workers, guarded: m.steps === 3 ? 1 : 0 }
    default:
      return { repeats: inst.data.repeats ?? 0, endRepeat: inst.data.endRepeat ?? 0 }
  }
}

export const traceAllowedGenerator: Generator<TraceAllowedInstance, TraceAllowedKey> = defineGenerator<TraceAllowedInstance, TraceAllowedKey>({
  id: TRACE_ALLOWED_ID,
  fixture: false,
  title: 'Trace allowed: behaviors of a spec, replayed on its state graph',
  templates: TEMPLATES,
  engines: [TRACE_GRAPH],
  misconceptions: ['dp:T6', 'dp:C1', 'dp:T16', 'dp:T10', 'dp:T7', 'dp:T8', 'dp:T9'],
  make,
  key,
  grade: (inst, answer, k) =>
    gradeItem(inst, answer, k, { basis: `${TRACE_ALLOWED_BASIS}; ${k.distinct} distinct states`, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  structure: (inst) => {
    const v = Object.values(inst.data.values)[0]
    return `${v?.kind ?? '?'}|workers:${inst.data.model.workers}|steps:${inst.data.model.steps}|${inst.data.sequence === undefined ? '' : 'sequence'}${inst.data.prefix === undefined ? '' : 'prefix'}`
  },
  replay: (inst, part, a, b, witness) => {
    if (part !== PART || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
    const va = inst.data.values[a]
    const vb = inst.data.values[b]
    if (va === undefined || vb === undefined) return false
    const g = explore(inst.data.model, TRACE_GRAPH_MAX_STATES)
    if (g === null) return false
    const w = witness as Record<string, Json>
    return !sameValue(va, vb) && typeof w[a] === 'string' && typeof w[b] === 'string'
  },
})

export const generator = traceAllowedGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [TRACE_GRAPH]: traceGraphPort }
