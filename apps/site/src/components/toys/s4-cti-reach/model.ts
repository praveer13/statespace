// The holds model of S4.L4 and S4.L6, with the good Hold and its twin, as a small machine the learner drives by hand,
// plus the bounded search from Init that the lesson's cell 1 runs. Pure and small.
//
//   Hold(n)     good: n ≤ bal − held     twin: n ≤ bal       held := held + n
//   Capture(n)  n ≤ held                                     held := held − n, bal := bal − n
//   Release(n)  n ≤ held                                     held := held − n
//   every n > 0;  Init: bal ≥ 0, held = 0;  the invariant: bal ≥ 0

export type Model = 'twin' | 'good'
export type Op = 'Hold' | 'Capture' | 'Release'

export interface State {
  readonly bal: number
  readonly held: number
}

export interface Step {
  readonly op: Op
  readonly n: number
}

/** The guard's text for an op on a model, as the lesson writes it. */
export function guardText(m: Model, op: Op): string {
  if (op === 'Hold') return m === 'good' ? 'n ≤ bal − held' : 'n ≤ bal'
  return 'n ≤ held'
}

/** The right-hand side of the guard in a state: the most n may be. */
export function limit(m: Model, op: Op, s: State): number {
  if (op === 'Hold') return m === 'good' ? s.bal - s.held : s.bal
  return s.held
}

export const enabled = (m: Model, op: Op, s: State, n: number): boolean => n > 0 && n <= limit(m, op, s)

/** One step. Null when the guard rejects it. */
export function apply(m: Model, s: State, st: Step): State | null {
  if (!enabled(m, st.op, s, st.n)) return null
  switch (st.op) {
    case 'Hold':
      return { bal: s.bal, held: s.held + st.n }
    case 'Capture':
      return { bal: s.bal - st.n, held: s.held - st.n }
    case 'Release':
      return { bal: s.bal, held: s.held - st.n }
  }
}

export const inv = (s: State): boolean => s.bal >= 0
/** The region the inductive step's counterexample lives in: Inv holds, and holds exceed the balance. */
export const pastBalance = (s: State): boolean => s.bal >= 0 && s.held > s.bal

/** The CTI the step query hands back on both models (S4.L6, the prequestion): bal = 0, held = 1, then Capture(1). */
export const STEP_CTI: State = { bal: 0, held: 1 }
export const STEP_CTI_MOVE: Step = { op: 'Capture', n: 1 }

/** The search's bound and its starting balances: every run of up to BOUND steps from Init with bal from 0 to MAX_INIT. */
export const BOUND = 6
export const MAX_INIT = 4

export interface Search {
  /** The shortest run from Init that ends with bal < 0, if one is within the bound. */
  readonly trace: { readonly init: State; readonly steps: readonly Step[] } | null
  /** Every state reached within the bound, from the given starting balances. */
  readonly reached: ReadonlyMap<string, State>
  /** Whether any reached state has held above bal with bal ≥ 0. */
  readonly anyPastBalance: boolean
}

const key = (s: State): string => `${s.bal},${s.held}`
const OPS: readonly Op[] = ['Hold', 'Capture', 'Release']

/**
 * Breadth-first search from Init, every amount the guards allow, to depth `bound`. With `initBal` it starts from that
 * balance only; without it, from every balance 0..MAX_INIT. Violating states are reached but not stepped from, and the
 * search goes on to the bound after it finds a trace, so `reached` is everything within the bound.
 */
export function search(m: Model, bound = BOUND, initBal?: number): Search {
  const inits: State[] = (initBal === undefined ? Array.from({ length: MAX_INIT + 1 }, (_, i) => i) : [initBal]).map((bal) => ({ bal, held: 0 }))
  type Node = { s: State; init: State; steps: Step[] }
  const reached = new Map<string, State>()
  let frontier: Node[] = []
  for (const i of inits) {
    if (!reached.has(key(i))) {
      reached.set(key(i), i)
      frontier.push({ s: i, init: i, steps: [] })
    }
  }
  let trace: Search['trace'] = null
  for (let depth = 0; depth <= bound; depth++) {
    for (const node of frontier) {
      if (!inv(node.s) && trace === null) trace = { init: node.init, steps: node.steps }
    }
    if (depth === bound) break
    const next: Node[] = []
    for (const node of frontier) {
      if (!inv(node.s)) continue
      for (const op of OPS) {
        const top = limit(m, op, node.s)
        for (let n = 1; n <= top; n++) {
          const t = apply(m, node.s, { op, n })
          if (t === null || reached.has(key(t))) continue
          reached.set(key(t), t)
          next.push({ s: t, init: node.init, steps: [...node.steps, { op, n }] })
        }
      }
    }
    frontier = next
  }
  let anyPastBalance = false
  for (const s of reached.values()) if (pastBalance(s)) anyPastBalance = true
  return { trace, reached, anyPastBalance }
}

/** Replay a run from a start state; null if a guard rejects a step. */
export function replay(m: Model, init: State, steps: readonly Step[]): State[] | null {
  const out = [init]
  let s = init
  for (const st of steps) {
    const t = apply(m, s, st)
    if (t === null) return null
    out.push(t)
    s = t
  }
  return out
}
