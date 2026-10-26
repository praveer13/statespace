// The start page's cover figure: the state space of Boot's transfer, explored breadth-first by this page. Three
// accounts hold 6 between them and start at (2, 2, 2); a step moves 1 to 3 from one account to another if the guard
// allows it. The guard is either the one in Boot's pull request (it reads the recipient, `dst`) or the fix (it reads
// the sender, `src`). A state with a balance below zero is an overdraft: a violation, and not expanded further.
// Everything here is computed in the browser from this small model; no solver or model checker runs. Pure.

export type Guard = 'as-written' | 'fixed'

export type State = readonly [number, number, number]

export const TOTAL = 6
export const START: State = [2, 2, 2]
export const AMOUNTS = [1, 2, 3] as const
export const MAX_DEPTH = 4

export const key = (s: State): string => s.join(',')
export const isOverdraft = (s: State): boolean => s.some((v) => v < 0)

/** Every state one step from `s` under the guard: (successor, the transfer that reaches it). */
export function steps(s: State, guard: Guard): Array<{ readonly to: State; readonly src: number; readonly dst: number; readonly amount: number }> {
  const out: Array<{ to: State; src: number; dst: number; amount: number }> = []
  for (let src = 0; src < 3; src++)
    for (let dst = 0; dst < 3; dst++) {
      if (src === dst) continue
      for (const amount of AMOUNTS) {
        const checked = guard === 'as-written' ? s[dst]! : s[src]!
        if (amount > checked) continue
        const to = [...s] as [number, number, number]
        to[src] -= amount
        to[dst] += amount
        out.push({ to, src, dst, amount })
      }
    }
  return out
}

export interface Exploration {
  /** Each reached state's depth: the fewest steps from the start. */
  readonly depth: ReadonlyMap<string, number>
  /** The state each reached state was first reached from (breadth-first parent). */
  readonly parent: ReadonlyMap<string, string>
  readonly states: ReadonlyMap<string, State>
  /** The deepest level that added a state, or the bound if the search was still growing there. */
  readonly bound: number
  /** True when no state is left to explore: every reachable state of the model is in `depth`. */
  readonly exhausted: boolean
  /** The first overdraft reached, in breadth-first order, or null. */
  readonly witness: State | null
}

/** Breadth-first exploration to depth `k` (0 is the start alone). */
export function explore(guard: Guard, k: number): Exploration {
  const depth = new Map<string, number>([[key(START), 0]])
  const parent = new Map<string, string>()
  const states = new Map<string, State>([[key(START), START]])
  let frontier: State[] = [START]
  let witness: State | null = null
  let level = 0
  while (level < k && frontier.length > 0) {
    const next: State[] = []
    for (const s of frontier) {
      if (isOverdraft(s)) continue
      for (const { to } of steps(s, guard)) {
        const id = key(to)
        if (depth.has(id)) continue
        depth.set(id, level + 1)
        parent.set(id, key(s))
        states.set(id, to)
        next.push(to)
        if (witness === null && isOverdraft(to)) witness = to
      }
    }
    frontier = next
    level += 1
  }
  const exhausted = frontier.every((s) => isOverdraft(s) || steps(s, guard).every(({ to }) => depth.has(key(to))))
  return { depth, parent, states, bound: level, exhausted, witness }
}

/** The path from the start to `s`, as state keys, following breadth-first parents. */
export function pathTo(e: Exploration, s: State): string[] {
  const out = [key(s)]
  let at = key(s)
  for (let guard = 0; guard < 64; guard++) {
    const p = e.parent.get(at)
    if (p === undefined) break
    out.unshift(p)
    at = p
  }
  return out
}

/** Every state of the model with no balance below zero: the triangle the cover draws. */
export function lattice(): State[] {
  const out: State[] = []
  for (let a = 0; a <= TOTAL; a++) for (let b = 0; a + b <= TOTAL; b++) out.push([a, b, TOTAL - a - b])
  return out
}

/** Barycentric layout: (a, b, c) to a point, with the three zero-balance edges forming the triangle. */
export function place(s: State, unit: number, ox: number, oy: number): readonly [number, number] {
  const [, b, c] = s
  return [ox + unit * (c + b / 2), oy - unit * b * 0.8660254]
}

/** "(−1, 5, 2)" with true minus signs. */
export const label = (s: State): string => `(${s.map((v) => (v < 0 ? `−${-v}` : String(v))).join(', ')})`
