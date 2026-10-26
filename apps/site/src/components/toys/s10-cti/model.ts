// The hold-capture proposal of S10.L6, "Witness, then decide", over a small grid of whole numbers. Pure and small: the
// page takes one step, finds every counterexample to induction (CTI) on the grid, and searches from Init to the bound
// N, the same three questions the lesson's Z3 cell asks, here by enumeration over this grid only.
//
//   Hold(n):    n > 0, n <= bal - held        held' = held + n        (the twin's guard: n <= bal)
//   Capture(n): n > 0, n <= held              held' = held - n, bal' = bal - n
//   Release(n): n > 0, n <= held              held' = held - n
//   Init:       bal >= 0, held = 0

export type Guard = 'proposed' | 'twin'
export type Inv = 'weak' | 'strong'
export type Command = 'Hold' | 'Capture' | 'Release'

export const COMMANDS: readonly Command[] = ['Hold', 'Capture', 'Release']

/** The grid this page draws and searches: balances, held funds and amounts in these ranges only. */
export const BAL_MIN = -3
export const BAL_MAX = 6
export const HELD_MAX = 6
export const N_MAX = 3
/** The search bound, as the lesson's cell prints it. */
export const N = 6

export interface State {
  readonly bal: number
  readonly held: number
}

export const key = (s: State): string => `${s.bal},${s.held}`
export const inGrid = (s: State): boolean => s.bal >= BAL_MIN && s.bal <= BAL_MAX && s.held >= 0 && s.held <= HELD_MAX

/** The invariant being checked: the agent's `bal >= 0`, or the strengthened `0 <= held <= bal`. */
export const holds = (inv: Inv, s: State): boolean => (inv === 'weak' ? s.bal >= 0 : s.held >= 0 && s.held <= s.bal)

/** The property the proposal must keep, whichever invariant is being tried: `bal >= 0`. */
export const overdrawn = (s: State): boolean => s.bal < 0

export const isInit = (s: State): boolean => s.bal >= 0 && s.held === 0

export type Step =
  | { readonly ok: true; readonly to: State }
  | { readonly ok: false; readonly why: string }

/** One step of a command from a state, or the guard that refuses it. */
export function step(g: Guard, c: Command, n: number, s: State): Step {
  if (n <= 0) return { ok: false, why: 'every command needs n > 0' }
  switch (c) {
    case 'Hold':
      if (g === 'proposed' && n > s.bal - s.held) return { ok: false, why: `Hold's guard needs n <= bal - held, here ${s.bal - s.held}` }
      if (g === 'twin' && n > s.bal) return { ok: false, why: `Hold's guard needs n <= bal, here ${s.bal}` }
      return { ok: true, to: { bal: s.bal, held: s.held + n } }
    case 'Capture':
      if (n > s.held) return { ok: false, why: `Capture's guard needs n <= held, here ${s.held}` }
      return { ok: true, to: { bal: s.bal - n, held: s.held - n } }
    case 'Release':
      if (n > s.held) return { ok: false, why: `Release's guard needs n <= held, here ${s.held}` }
      return { ok: true, to: { bal: s.bal, held: s.held - n } }
  }
}

/** Every state of the grid, balance from high to low, held from low to high. */
export function gridStates(): State[] {
  const out: State[] = []
  for (let bal = BAL_MAX; bal >= BAL_MIN; bal--) for (let held = 0; held <= HELD_MAX; held++) out.push({ bal, held })
  return out
}

export interface Move {
  readonly c: Command
  readonly n: number
  readonly from: State
  readonly to: State
}

/** Every counterexample to induction on the grid: a state that meets the invariant and one step that leaves it. */
export function ctis(g: Guard, inv: Inv): Move[] {
  const out: Move[] = []
  for (const s of gridStates()) {
    if (!holds(inv, s)) continue
    for (const c of COMMANDS)
      for (let n = 1; n <= N_MAX; n++) {
        const r = step(g, c, n, s)
        if (r.ok && !holds(inv, r.to)) out.push({ c, n, from: s, to: r.to })
      }
  }
  return out
}

export interface Search {
  /** The depth, 0 to N, at which each grid state is first reached from Init. */
  readonly depth: ReadonlyMap<string, number>
  /** How each state was first reached, for replaying a run back to Init. */
  readonly parent: ReadonlyMap<string, Move>
}

/**
 * Breadth-first search from every Init state of the grid, smallest balance first, to the bound N. States off the grid
 * are not explored.
 */
export function search(g: Guard): Search {
  const depth = new Map<string, number>()
  const parent = new Map<string, Move>()
  let frontier: State[] = gridStates().filter(isInit).sort((x, y) => x.bal - y.bal)
  for (const s of frontier) depth.set(key(s), 0)
  for (let d = 1; d <= N; d++) {
    const next: State[] = []
    for (const s of frontier)
      for (const c of COMMANDS)
        for (let n = 1; n <= N_MAX; n++) {
          const r = step(g, c, n, s)
          if (!r.ok || !inGrid(r.to) || depth.has(key(r.to))) continue
          depth.set(key(r.to), d)
          parent.set(key(r.to), { c, n, from: s, to: r.to })
          next.push(r.to)
        }
    frontier = next
  }
  return { depth, parent }
}

/** The run from Init that first reaches a state, step by step, or null when the search did not reach it. */
export function runTo(sr: Search, s: State): Move[] | null {
  if (!sr.depth.has(key(s))) return null
  const out: Move[] = []
  let at = s
  for (let m = sr.parent.get(key(at)); m !== undefined; m = sr.parent.get(key(at))) {
    out.unshift(m)
    at = m.from
  }
  return out
}

/** The shortest run from Init that overdraws, within N and the grid: smallest depth, then highest balance first. */
export function shortestOverdraft(g: Guard): Move[] | null {
  const sr = search(g)
  let best: State | null = null
  let bestD = Infinity
  for (const s of gridStates()) {
    const d = sr.depth.get(key(s))
    if (d !== undefined && overdrawn(s) && d < bestD) {
      best = s
      bestD = d
    }
  }
  return best === null ? null : runTo(sr, best)
}

/** The CTI the page shows first: the one whose pre-state has the smallest balance, then the smallest held, then n. */
export function firstCti(g: Guard, inv: Inv): Move | null {
  const all = ctis(g, inv).sort((x, y) => x.from.bal - y.from.bal || x.from.held - y.from.held || x.n - y.n)
  return all[0] ?? null
}

export const sayMove = (m: { readonly c: Command; readonly n: number }): string => `${m.c}(${m.n})`
