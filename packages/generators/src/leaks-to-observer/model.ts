// GEN-leaks-to-observer's paired-state evaluator (INS-pairs' rules, ASSESSMENT.md section 4.11), as plain code over a
// small declarative world.
//
// A world is a set of cells, each with the finite list of values the item's scope allows, each marked low (the
// observer may know it: its own tenant's data, the declassified fields, which documents it can see) or high. A view
// is a set of channels the request produces (response fields, a size header, an abort), each an expression over the
// cells; the observer sees some of the channels. Two states are a leak witness when they are low-equivalent (equal
// on every low cell) and the observer's channels differ. "None" is decided by trying every state of the scope, grouped
// by its low cells: exact inside the printed scope, and nothing outside it.
//
// Pure: no DOM, storage or network.

export type Val = string | number | boolean

export interface Cell {
  readonly name: string
  readonly values: readonly Val[]
  readonly low: boolean
}

export type Expr =
  | { readonly c: string }
  | { readonly len: string }
  | { readonly count: readonly string[] }
  | { readonly ifc: string; readonly then: Expr; readonly else: Expr }
  | { readonly k: Val }
  /** The ids whose cell is true, joined by commas, in order. */
  | { readonly ids: readonly { readonly cell: string; readonly id: string }[] }
  /** The sum of the lengths of string cells, plus a constant. */
  | { readonly lens: readonly string[]; readonly plus: number }

export interface Channel {
  readonly name: string
  readonly expr: Expr
  /** Whether the item's observer sees this channel. */
  readonly seen: boolean
}

export interface World {
  readonly cells: readonly Cell[]
  readonly channels: readonly Channel[]
}

export type State = Readonly<Record<string, Val>>

/** A pair: a base state and the cells on which the two states differ, with each state's value. */
export interface Pair {
  readonly base: State
  readonly diff: Readonly<Record<string, readonly [Val, Val]>>
}

export function evalExpr(e: Expr, s: State): Val {
  if ('c' in e) return s[e.c] as Val
  if ('len' in e) return String(s[e.len]).length
  if ('count' in e) return e.count.filter((n) => s[n] === true).length
  if ('ifc' in e) return s[e.ifc] === true ? evalExpr(e.then, s) : evalExpr(e.else, s)
  if ('ids' in e) return e.ids.filter((x) => s[x.cell] === true).map((x) => x.id).join(',')
  if ('lens' in e) {
    let n = e.plus
    for (const c of e.lens) n += String(s[c]).length
    return n
  }
  return e.k
}

/** What the observer sees, channel by channel, as one comparable string. */
export function observe(w: World, s: State): string {
  return JSON.stringify(w.channels.filter((c) => c.seen).map((c) => [c.name, evalExpr(c.expr, s)]))
}

export const lowEq = (w: World, a: State, b: State): boolean => w.cells.every((c) => !c.low || a[c.name] === b[c.name])

export function defaultState(w: World): State {
  return Object.fromEntries(w.cells.map((c) => [c.name, c.values[0] as Val]))
}

export function pairStates(p: Pair): [State, State] {
  const a: Record<string, Val> = { ...p.base }
  const b: Record<string, Val> = { ...p.base }
  for (const [n, [x, y]] of Object.entries(p.diff)) {
    a[n] = x
    b[n] = y
  }
  return [a, b]
}

export type PairJudgment =
  | { readonly ok: true; readonly channel: string }
  | { readonly ok: false; readonly why: 'not-low-equivalent'; readonly cell: string }
  | { readonly ok: false; readonly why: 'indistinguishable' }
  | { readonly ok: false; readonly why: 'outside-scope'; readonly cell: string }

export function judgePair(w: World, p: Pair): PairJudgment {
  const [a, b] = pairStates(p)
  for (const c of w.cells) {
    if (!c.values.includes(a[c.name] as Val)) return { ok: false, why: 'outside-scope', cell: c.name }
    if (!c.values.includes(b[c.name] as Val)) return { ok: false, why: 'outside-scope', cell: c.name }
  }
  const lowDiff = w.cells.find((c) => c.low && a[c.name] !== b[c.name])
  if (lowDiff !== undefined) return { ok: false, why: 'not-low-equivalent', cell: lowDiff.name }
  const ch = w.channels.find((c) => c.seen && evalExpr(c.expr, a) !== evalExpr(c.expr, b))
  return ch === undefined ? { ok: false, why: 'indistinguishable' } : { ok: true, channel: ch.name }
}

/** The number of states in the scope, by repeated multiplication. */
export function scopeSize(w: World): number {
  let n = 1
  for (const c of w.cells) n *= c.values.length
  return n
}

/** Every state of the scope, the last cell fastest. */
export function states(w: World): State[] {
  let out: Record<string, Val>[] = [{}]
  for (const c of w.cells) {
    const next: Record<string, Val>[] = []
    for (const s of out) for (const v of c.values) next.push({ ...s, [c.name]: v })
    out = next
  }
  return out
}

/** A leak witness inside the scope, or null when every low-equivalent pair looks the same to the observer. */
export function findLeak(w: World): Pair | null {
  const groups = new Map<string, State>()
  for (const s of states(w)) {
    const low = JSON.stringify(w.cells.filter((c) => c.low).map((c) => s[c.name]))
    const first = groups.get(low)
    if (first === undefined) {
      groups.set(low, s)
      continue
    }
    if (observe(w, first) !== observe(w, s)) {
      const diff: Record<string, readonly [Val, Val]> = {}
      for (const c of w.cells) if (first[c.name] !== s[c.name]) diff[c.name] = [first[c.name] as Val, s[c.name] as Val]
      return { base: first, diff }
    }
  }
  return null
}

const showVal = (v: Val): string => (typeof v === 'string' ? `"${v}"` : String(v))

export function renderPair(p: Pair): string {
  const parts = Object.entries(p.diff).map(([n, [x, y]]) => `\`${n}\` is ${showVal(x)} in s1 and ${showVal(y)} in s2`)
  return `s1 and s2 are identical except that ${parts.join(', and ')}`
}

export function scopeText(w: World): string {
  return w.cells.map((c) => `\`${c.name}\` ∈ {${c.values.map(showVal).join(', ')}}`).join(', ')
}
