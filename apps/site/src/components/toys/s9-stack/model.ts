// The stack machine of S9.L1, as the page runs it: `AExp` over constants, balances and `plus`, `aval`, `comp`, and `exec1`
// one instruction at a time. Pure and small. Besides the run, it records for every subexpression the stack its code
// started on, which is the stack its hypothesis in `exec_comp` has to speak about.

export type AExp =
  | { readonly k: 'n'; readonly v: number }
  | { readonly k: 'bal'; readonly a: number }
  | { readonly k: 'plus'; readonly e1: AExp; readonly e2: AExp }

export type Instr = { readonly op: 'loadi'; readonly v: number } | { readonly op: 'load'; readonly a: number } | { readonly op: 'add' }

/** A store: account number to balance. */
export type Store = readonly number[]

export const n = (v: number): AExp => ({ k: 'n', v })
export const bal = (a: number): AExp => ({ k: 'bal', a })
export const plus = (e1: AExp, e2: AExp): AExp => ({ k: 'plus', e1, e2 })

export function aval(e: AExp, s: Store): number {
  switch (e.k) {
    case 'n':
      return e.v
    case 'bal':
      return s[e.a] ?? 0
    case 'plus':
      return aval(e.e1, s) + aval(e.e2, s)
  }
}

export function comp(e: AExp): Instr[] {
  switch (e.k) {
    case 'n':
      return [{ op: 'loadi', v: e.v }]
    case 'bal':
      return [{ op: 'load', a: e.a }]
    case 'plus':
      return [...comp(e.e1), ...comp(e.e2), { op: 'add' }]
  }
}

/** A stack, top first, as Lean's `List Int` reads: `v :: stk`. */
export type Stack = readonly number[]

export function exec1(s: Store, i: Instr, stk: Stack): Stack {
  switch (i.op) {
    case 'loadi':
      return [i.v, ...stk]
    case 'load':
      return [s[i.a] ?? 0, ...stk]
    case 'add': {
      if (stk.length < 2) return stk // the junk case compiled code never reaches
      const [j, i2, ...rest] = stk
      return [i2 + j, ...rest]
    }
  }
}

/** A subexpression, by its path from the root: '' is the whole expression, '1' its first operand, '12' that one's second. */
export interface Node {
  readonly path: string
  readonly e: AExp
  /** The instruction indices [from, to) of its code inside `comp` of the whole expression. */
  readonly from: number
  readonly to: number
}

export function nodes(e: AExp): Node[] {
  const out: Node[] = []
  const go = (x: AExp, path: string, at: number): number => {
    if (x.k !== 'plus') {
      out.push({ path, e: x, from: at, to: at + 1 })
      return at + 1
    }
    const mid = go(x.e1, `${path}1`, at)
    const end = go(x.e2, `${path}2`, mid)
    out.push({ path, e: x, from: at, to: end + 1 })
    return end + 1
  }
  go(e, '', 0)
  return out.sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path))
}

/** Every stack of the run: stacks[k] is the stack after k instructions. */
export function run(s: Store, e: AExp, stk: Stack): Stack[] {
  const out: Stack[] = [stk]
  for (const i of comp(e)) out.push(exec1(s, i, out[out.length - 1]))
  return out
}

/** The stack a subexpression's code started on, in a run of the whole expression from `stk`. */
export const startedOn = (s: Store, e: AExp, stk: Stack, node: Node): Stack => run(s, e, stk)[node.from]

/** True when, for every subexpression, its code pushed its value onto the stack it started on: `exec_comp` at that stack. */
export function everyCaseHolds(s: Store, e: AExp, stk: Stack): boolean {
  const r = run(s, e, stk)
  return nodes(e).every((nd) => same(r[nd.to], [aval(nd.e, s), ...r[nd.from]]))
}

export const same = (x: Stack, y: Stack): boolean => x.length === y.length && x.every((v, i) => v === y[i])

export function show(e: AExp): string {
  switch (e.k) {
    case 'n':
      return `n ${e.v}`
    case 'bal':
      return `bal a${e.a}`
    case 'plus':
      return `plus (${show(e.e1)}) (${show(e.e2)})`
  }
}

export const showInstr = (i: Instr): string => (i.op === 'loadi' ? `loadi ${i.v}` : i.op === 'load' ? `load a${i.a}` : 'add')

/** A stack as Lean prints a list, top first. */
export const showStack = (stk: Stack): string => `[${stk.join(', ')}]`
