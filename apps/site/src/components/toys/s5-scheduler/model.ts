// The double spend of S5.L3 (M1 DoubleSpend) as a small model the page runs itself. Each worker reads the balance into
// `seen` and branches on `bal >= Amount`, then writes `seen - Amount`; `NoOverspend == spent <= Init`. The atomic grain
// is the lesson's repair, `Spend(w)`: the guard and the write in one action. Pure and small, with no dependencies.

export type Grain = 'split' | 'atomic'

export interface Config {
  readonly id: string
  readonly workers: number
  readonly init: number
  readonly amount: number
}

/** The two configurations the lesson uses: the Theater's, and the exit question's three workers. */
export const CONFIGS: readonly Config[] = [
  { id: 'w2', workers: 2, init: 100, amount: 80 },
  { id: 'w3', workers: 3, init: 100, amount: 40 },
]

export type Pc = 'read' | 'write' | 'go' | 'done'

export interface State {
  readonly bal: number
  readonly spent: number
  readonly pc: readonly Pc[]
  readonly seen: readonly number[]
}

export type ActionKind = 'Read' | 'Write' | 'Spend'

export interface Action {
  readonly kind: ActionKind
  /** 0-based worker index; the page prints w1, w2, ... */
  readonly w: number
}

export const initial = (c: Config, g: Grain): State => ({
  bal: c.init,
  spent: 0,
  pc: Array.from({ length: c.workers }, () => (g === 'split' ? 'read' : 'go')),
  seen: Array.from({ length: c.workers }, () => 0),
})

export const key = (s: State): string => `${s.bal}|${s.spent}|${s.pc.join(',')}|${s.seen.join(',')}`

/** Short name, as the lesson writes it: R1, W2, S3. */
export const short = (a: Action): string => `${a.kind === 'Read' ? 'R' : a.kind === 'Write' ? 'W' : 'S'}${a.w + 1}`

/** Long name, as TLC prints it: Read(w1). */
export const long = (a: Action): string => `${a.kind}(w${a.w + 1})`

/** The actions enabled in a state, in TLC's order: by worker, read before write. */
export function enabled(s: State): Action[] {
  const out: Action[] = []
  s.pc.forEach((p, w) => {
    if (p === 'read') out.push({ kind: 'Read', w })
    else if (p === 'write') out.push({ kind: 'Write', w })
    else if (p === 'go') out.push({ kind: 'Spend', w })
  })
  return out
}

const set = <T,>(xs: readonly T[], i: number, v: T): T[] => xs.map((x, j) => (j === i ? v : x))

export function step(c: Config, s: State, a: Action): State {
  switch (a.kind) {
    case 'Read':
      return { ...s, seen: set(s.seen, a.w, s.bal), pc: set(s.pc, a.w, s.bal >= c.amount ? 'write' : 'done') }
    case 'Write':
      return { ...s, bal: s.seen[a.w]! - c.amount, spent: s.spent + c.amount, pc: set(s.pc, a.w, 'done') }
    case 'Spend':
      return s.bal >= c.amount
        ? { ...s, bal: s.bal - c.amount, spent: s.spent + c.amount, pc: set(s.pc, a.w, 'done') }
        : { ...s, pc: set(s.pc, a.w, 'done') }
  }
}

/** NoOverspend fails: more has been paid out than the account held. */
export const violated = (c: Config, s: State): boolean => s.spent > c.init

/** A write is stale when the copy it writes from is no longer the balance: another write landed in between. */
export const staleWrite = (s: State, a: Action): boolean => a.kind === 'Write' && s.seen[a.w] !== s.bal

export interface Node {
  readonly id: string
  readonly state: State
  readonly depth: number
}

export interface Edge {
  readonly from: string
  readonly to: string
  readonly action: Action
}

export interface Graph {
  readonly nodes: readonly Node[]
  readonly edges: readonly Edge[]
  /** States per depth, the split the lesson counts by. */
  readonly layers: readonly number[]
}

/** Every reachable state, breadth first, as TLC explores it (no invariant stops it). */
export function explore(c: Config, g: Grain): Graph {
  const s0 = initial(c, g)
  const nodes = new Map<string, Node>([[key(s0), { id: key(s0), state: s0, depth: 0 }]])
  const edges: Edge[] = []
  let frontier = [s0]
  let depth = 0
  while (frontier.length > 0) {
    const next: State[] = []
    depth++
    for (const s of frontier)
      for (const a of enabled(s)) {
        const t = step(c, s, a)
        const k = key(t)
        edges.push({ from: key(s), to: k, action: a })
        if (!nodes.has(k)) {
          nodes.set(k, { id: k, state: t, depth })
          next.push(t)
        }
      }
    frontier = next
  }
  const all = [...nodes.values()]
  const max = Math.max(...all.map((n) => n.depth))
  const layers = Array.from({ length: max + 1 }, (_, d) => all.filter((n) => n.depth === d).length)
  return { nodes: all, edges, layers }
}

export interface Schedule {
  readonly actions: readonly Action[]
  readonly final: State
  readonly violates: boolean
  readonly stale: boolean
}

/** Every complete schedule: each runs until no action is enabled. */
export function schedules(c: Config, g: Grain): Schedule[] {
  const out: Schedule[] = []
  const go = (s: State, path: Action[], stale: boolean): void => {
    const en = enabled(s)
    if (en.length === 0) {
      out.push({ actions: path, final: s, violates: violated(c, s), stale })
      return
    }
    for (const a of en) go(step(c, s, a), [...path, a], stale || staleWrite(s, a))
  }
  go(initial(c, g), [], false)
  return out
}

/** The first violation breadth-first search meets, with the path to it (TLC's counterexample at one worker). */
export function firstViolation(c: Config, g: Grain): Action[] | null {
  const s0 = initial(c, g)
  const seen = new Set([key(s0)])
  let frontier: Array<{ s: State; path: Action[] }> = [{ s: s0, path: [] }]
  while (frontier.length > 0) {
    const next: typeof frontier = []
    for (const { s, path } of frontier)
      for (const a of enabled(s)) {
        const t = step(c, s, a)
        const p = [...path, a]
        if (violated(c, t)) return p
        const k = key(t)
        if (!seen.has(k)) {
          seen.add(k)
          next.push({ s: t, path: p })
        }
      }
    frontier = next
  }
  return null
}

/** Both reads before both writes: the class of schedules S5.L3 names for two workers. */
export function readsFirst(actions: readonly Action[]): boolean {
  const lastRead = Math.max(...actions.map((a, i) => (a.kind === 'Read' ? i : -1)))
  const firstWrite = actions.findIndex((a) => a.kind === 'Write')
  return firstWrite === -1 || lastRead < firstWrite
}

/** Replay a list of actions from the start, or null if one is not enabled where it is taken. */
export function replay(c: Config, g: Grain, actions: readonly Action[]): State[] | null {
  const out = [initial(c, g)]
  for (const a of actions) {
    const s = out[out.length - 1]!
    if (!enabled(s).some((b) => b.kind === a.kind && b.w === a.w)) return null
    out.push(step(c, s, a))
  }
  return out
}
