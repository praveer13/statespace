// GEN-lasso-or-not's spec and validator in the tab. The spec is Hold (runs/RUN-tlc-hold-fairness/inputs/r1/Hold.tla,
// the spec RUN-tlc-hold-lasso and RUN-tlc-hold-fairness ran): a hold a worker keeps trying to capture while the
// provider may keep answering "busy". Two variants the recorded rows use: Timeout from `held` only (r1 to r5), or
// from `held` and `pending` (r6's HoldLive); and `tries` counted modulo 2 (the recorded spec) or 1 (always 0).
//
// The validator is INS-lasso's rule set (ASSESSMENT.md section 4.9) over the finite graph, with stuttering allowed in
// every state as `[][Next]_vars` allows it:
//   - a lasso is a stem of actions from the initial state, then a cycle of actions back to the state the stem ends in,
//     or "stutter forever" there;
//   - it violates `<>Resolved` when no state on it is resolved;
//   - it is fair when, for WF(A), A occurs in the cycle if A is enabled in every cycle state, and, for SF(A), A occurs
//     in the cycle if A is enabled in some cycle state.
// "None" is decided exactly: a fair violating lasso exists if and only if some strongly connected set of unresolved
// states reachable through unresolved states admits a fair cycle (fairCycle below). The tests check both against the
// six recorded TLC rows.
//
// Pure: no DOM, storage or network.

export type HoldAction = 'Try' | 'Busy' | 'Capture' | 'Timeout'
export const HOLD_ACTIONS: readonly HoldAction[] = ['Try', 'Busy', 'Capture', 'Timeout']

export type St = 'held' | 'pending' | 'captured' | 'released'

export interface HoldModel {
  /** `tries` is counted modulo this: 2 in the recorded spec, 1 when it stays 0. */
  readonly modulus: 1 | 2
  /** Timeout from `held` and `pending` (HoldLive), or from `held` only. */
  readonly widened: boolean
}

export interface Fairness {
  readonly kind: 'WF' | 'SF'
  readonly action: HoldAction
}

export interface HState {
  readonly st: St
  readonly tries: number
}

/** A stem from the initial state, then a cycle back to where the stem ends; an empty cycle is stuttering forever. */
export interface Lasso {
  readonly stem: readonly string[]
  readonly cycle: readonly string[]
}

export const RECORDED: HoldModel = { modulus: 2, widened: false }

export const hkey = (s: HState): string => `${s.st}/${s.tries}`
export const resolved = (s: HState): boolean => s.st === 'captured' || s.st === 'released'

export function holdInitial(): HState {
  return { st: 'held', tries: 0 }
}

/** The successor of a state by an action, or null when the action is not enabled there. */
export function act(m: HoldModel, s: HState, a: string): HState | null {
  switch (a) {
    case 'Try':
      return s.st === 'held' ? { st: 'pending', tries: (s.tries + 1) % m.modulus } : null
    case 'Busy':
      return s.st === 'pending' ? { st: 'held', tries: s.tries } : null
    case 'Capture':
      return s.st === 'pending' ? { st: 'captured', tries: s.tries } : null
    case 'Timeout':
      return s.st === 'held' || (m.widened && s.st === 'pending') ? { st: 'released', tries: s.tries } : null
    default:
      return null
  }
}

export const enabled = (m: HoldModel, s: HState, a: HoldAction): boolean => act(m, s, a) !== null

export interface HoldGraph {
  readonly states: readonly HState[]
  readonly edges: readonly { readonly from: number; readonly action: HoldAction; readonly to: number }[]
  readonly distinct: number
  readonly generated: number
}

/** The complete reachable graph, breadth first, counted as TLC prints it. */
export function holdGraph(m: HoldModel): HoldGraph {
  const states: HState[] = [holdInitial()]
  const index = new Map([[hkey(states[0] as HState), 0]])
  const edges: { from: number; action: HoldAction; to: number }[] = []
  let generated = 1
  for (let i = 0; i < states.length; i++) {
    for (const a of HOLD_ACTIONS) {
      const to = act(m, states[i] as HState, a)
      if (to === null) continue
      generated++
      let j = index.get(hkey(to))
      if (j === undefined) {
        j = states.length
        states.push(to)
        index.set(hkey(to), j)
      }
      edges.push({ from: i, action: a, to: j })
    }
  }
  return { states, edges, distinct: states.length, generated }
}

export type LassoJudgment =
  | { readonly ok: true }
  | { readonly ok: false; readonly why: 'not-a-behavior'; readonly at: number }
  | { readonly ok: false; readonly why: 'no-close' }
  | { readonly ok: false; readonly why: 'resolves'; readonly state: string }
  | { readonly ok: false; readonly why: 'unfair'; readonly condition: Fairness }

/** The states a lasso's cycle visits (the entry state alone for stuttering forever), or a judgment against it. */
export function judgeLasso(m: HoldModel, fair: readonly Fairness[], l: Lasso): LassoJudgment {
  let s = holdInitial()
  const seen: HState[] = [s]
  for (let i = 0; i < l.stem.length; i++) {
    const t = act(m, s, l.stem[i] as string)
    if (t === null) return { ok: false, why: 'not-a-behavior', at: i + 1 }
    s = t
    seen.push(s)
  }
  const entry = s
  const cycleStates: HState[] = [entry]
  for (let i = 0; i < l.cycle.length; i++) {
    const t = act(m, s, l.cycle[i] as string)
    if (t === null) return { ok: false, why: 'not-a-behavior', at: l.stem.length + i + 1 }
    s = t
    if (i < l.cycle.length - 1) cycleStates.push(s)
    seen.push(s)
  }
  if (hkey(s) !== hkey(entry)) return { ok: false, why: 'no-close' }
  const done = seen.find(resolved)
  if (done !== undefined) return { ok: false, why: 'resolves', state: done.st }
  const taken = new Set(l.cycle)
  for (const f of fair) {
    if (taken.has(f.action)) continue
    const on = cycleStates.filter((c) => enabled(m, c, f.action)).length
    if (f.kind === 'WF' && on === cycleStates.length) return { ok: false, why: 'unfair', condition: f }
    if (f.kind === 'SF' && on > 0) return { ok: false, why: 'unfair', condition: f }
  }
  return { ok: true }
}

/** Strongly connected components of the subgraph on `nodes` (Tarjan's algorithm, iterative over a tiny graph). */
function sccs(nodes: readonly number[], succ: (n: number) => number[]): number[][] {
  const inSet = new Set(nodes)
  const index = new Map<number, number>()
  const low = new Map<number, number>()
  const onStack = new Set<number>()
  const stack: number[] = []
  const out: number[][] = []
  let counter = 0
  const visit = (v: number): void => {
    index.set(v, counter)
    low.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)
    for (const w of succ(v)) {
      if (!inSet.has(w)) continue
      if (!index.has(w)) {
        visit(w)
        low.set(v, Math.min(low.get(v) as number, low.get(w) as number))
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v) as number, index.get(w) as number))
    }
    if (low.get(v) === index.get(v)) {
      const comp: number[] = []
      let w: number
      do {
        w = stack.pop() as number
        onStack.delete(w)
        comp.push(w)
      } while (w !== v)
      out.push(comp.sort((a, b) => a - b))
    }
  }
  for (const n of nodes) if (!index.has(n)) visit(n)
  return out
}

/**
 * A set of states that carries a fair cycle, or null: the exact decision behind "none". Every state may stutter, so
 * every strongly connected set is a cycle; WF(A) fails on a set (and on every subset) when A is enabled everywhere in
 * it and no A-step stays inside it; SF(A) without an A-step inside forces the cycle off the states where A is enabled.
 */
export function fairCycle(m: HoldModel, g: HoldGraph, fair: readonly Fairness[], set: readonly number[]): number[] | null {
  const inSet = new Set(set)
  const inside = g.edges.filter((e) => inSet.has(e.from) && inSet.has(e.to))
  for (const f of fair) {
    if (f.kind !== 'WF' || inside.some((e) => e.action === f.action)) continue
    if (set.every((n) => enabled(m, g.states[n] as HState, f.action))) return null
  }
  for (const f of fair) {
    if (f.kind !== 'SF' || inside.some((e) => e.action === f.action)) continue
    const rest = set.filter((n) => !enabled(m, g.states[n] as HState, f.action))
    if (rest.length === set.length) continue
    const succ = (n: number): number[] => g.edges.filter((e) => e.from === n).map((e) => e.to)
    for (const c of sccs(rest, succ)) {
      const found = fairCycle(m, g, fair, c)
      if (found !== null) return found
    }
    return null
  }
  return set.length > 0 ? [...set] : null
}

/** The unresolved states reachable from the initial state through unresolved states. */
function unresolvedReach(g: HoldGraph): number[] {
  if (resolved(g.states[0] as HState)) return []
  const seen = new Set([0])
  const queue = [0]
  while (queue.length > 0) {
    const n = queue.shift() as number
    for (const e of g.edges) if (e.from === n && !seen.has(e.to) && !resolved(g.states[e.to] as HState)) {
      seen.add(e.to)
      queue.push(e.to)
    }
  }
  return [...seen].sort((a, b) => a - b)
}

/** A path of actions from the initial state to `to` through the given states, breadth first. */
function pathTo(g: HoldGraph, allowed: ReadonlySet<number>, from: number, to: number): string[] | null {
  const prev = new Map<number, { n: number; a: string }>()
  const seen = new Set([from])
  const queue = [from]
  while (queue.length > 0) {
    const n = queue.shift() as number
    if (n === to) break
    for (const e of g.edges) if (e.from === n && allowed.has(e.to) && !seen.has(e.to)) {
      seen.add(e.to)
      prev.set(e.to, { n, a: e.action })
      queue.push(e.to)
    }
  }
  if (!seen.has(to)) return null
  const out: string[] = []
  let cur = to
  while (cur !== from) {
    const p = prev.get(cur) as { n: number; a: string }
    out.unshift(p.a)
    cur = p.n
  }
  return out
}

/**
 * A fair violating lasso, or null when none exists. The cycle walks every step inside the fair set found, so it is
 * fair whenever the set is; a set of one state is stuttering forever there.
 */
export function findLasso(m: HoldModel, fair: readonly Fairness[]): Lasso | null {
  const g = holdGraph(m)
  const nodes = unresolvedReach(g)
  const succ = (n: number): number[] => g.edges.filter((e) => e.from === n).map((e) => e.to)
  for (const c of sccs(nodes, succ)) {
    const set = fairCycle(m, g, fair, c)
    if (set === null) continue
    const allowed = new Set(nodes)
    const entry = set[0] as number
    const stem = pathTo(g, allowed, 0, entry) as string[]
    const inSet = new Set(set)
    const inside = g.edges.filter((e) => inSet.has(e.from) && inSet.has(e.to))
    const cycle: string[] = []
    let cur = entry
    for (const e of inside) {
      cycle.push(...(pathTo(g, inSet, cur, e.from) as string[]), e.action)
      cur = e.to
    }
    cycle.push(...(pathTo(g, inSet, cur, entry) as string[]))
    return { stem, cycle }
  }
  return null
}

export const showFair = (f: Fairness): string => `${f.kind}_vars(${f.action})`
export const showFairness = (fair: readonly Fairness[]): string => (fair.length === 0 ? 'TRUE' : fair.map(showFair).join(' ∧ '))

export function renderLasso(l: Lasso): string {
  if (l.cycle.length === 0) return l.stem.length === 0 ? 'Stutter forever in the initial state' : `${l.stem.join(', ')}, then stutter forever`
  return l.stem.length === 0 ? `From the initial state, repeat ${l.cycle.join(', ')} forever` : `${l.stem.join(', ')}, then repeat ${l.cycle.join(', ')} forever`
}

/** The spec as the stem prints it, in TLA+. */
export function specText(m: HoldModel, fair: readonly Fairness[]): string {
  const tries = m.modulus === 2 ? `tries' = (tries + 1) % 2` : `UNCHANGED tries`
  const timeout = m.widened ? `st \\in {"held", "pending"}` : `st = "held"   `
  return [
    'VARIABLES st, tries',
    'vars == <<st, tries>>',
    'Init    == st = "held" /\\ tries = 0',
    `Try     == st = "held"    /\\ st' = "pending"  /\\ ${tries}`,
    `Busy    == st = "pending" /\\ st' = "held"     /\\ UNCHANGED tries`,
    `Capture == st = "pending" /\\ st' = "captured" /\\ UNCHANGED tries`,
    `Timeout == ${timeout} /\\ st' = "released" /\\ UNCHANGED tries`,
    'Next == Try \\/ Busy \\/ Capture \\/ Timeout',
    `Fair == ${fair.length === 0 ? 'TRUE' : fair.map((f) => `${f.kind}_vars(${f.action})`).join(' /\\ ')}`,
    'Spec == Init /\\ [][Next]_vars /\\ Fair',
    'Resolved == st \\in {"captured", "released"}',
    'EventuallyResolves == <>Resolved',
  ].join('\n')
}
