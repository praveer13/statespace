// The bad optimization (S9.L7), as a small model the page runs: the source command `transfer amt src dst`, the IR of
// S9.L3 (registers, `ldi`, `read`, `add`, `sub`, `write`, `assertGe`), the reference compile and four edits an agent might
// make to it, and two abort semantics. Pure and small: the page runs both sides of the square from one start, steps the
// target one instruction at a time, and sweeps a small grid of starts itself.
//
// Source:  require amt ≤ bal src (else insufficient); then bal src -= amt; bal dst += amt, the credit reading the
//          debited store, so a self-transfer nets to zero. The positivity check is unchanged by every edit here and,
//          as in the lesson's listing, is left out: amounts run from 1.

export type Acct = 'a1' | 'a2'
export type Reg = 'r0' | 'r1' | 'r2'

export type Instr =
  | { readonly op: 'ldi'; readonly r: Reg; readonly v: number }
  | { readonly op: 'read'; readonly r: Reg; readonly a: Acct }
  | { readonly op: 'add' | 'sub'; readonly r: Reg; readonly x: Reg; readonly y: Reg }
  | { readonly op: 'write'; readonly a: Acct; readonly r: Reg }
  | { readonly op: 'assertGe'; readonly x: Reg; readonly y: Reg; readonly err: string }

/** One line of a listing: the instruction and what it is for. */
export interface Line {
  readonly ins: Instr
  readonly part: 'guard' | 'debit' | 'credit'
  /** True for the lines the edit moved or changed. */
  readonly moved?: boolean
}

export type Variant = 'compiled' | 'read-first' | 'hoisted' | 'rewritten' | 'credit'
export type Aborts = 'rollback' | 'keep'

export const VARIANTS: readonly Variant[] = ['compiled', 'read-first', 'hoisted', 'rewritten', 'credit']

export interface Start {
  /** The sender's balance. */
  readonly bal1: number
  /** The other account's balance (ignored for a self-transfer). */
  readonly bal2: number
  readonly amt: number
  /** True for `transfer amt a1 a1`. */
  readonly self: boolean
}

export type Store = Readonly<Record<Acct, number>>

export type Outcome =
  | { readonly kind: 'committed'; readonly store: Store }
  | { readonly kind: 'aborted'; readonly err: string; readonly store: Store }

const ldi = (r: Reg, v: number): Instr => ({ op: 'ldi', r, v })
const read = (r: Reg, a: Acct): Instr => ({ op: 'read', r, a })
const sub = (r: Reg, x: Reg, y: Reg): Instr => ({ op: 'sub', r, x, y })
const add = (r: Reg, x: Reg, y: Reg): Instr => ({ op: 'add', r, x, y })
const write = (a: Acct, r: Reg): Instr => ({ op: 'write', a, r })
const assertGe = (x: Reg, y: Reg): Instr => ({ op: 'assertGe', x, y, err: 'insufficient' })

/** The program each variant compiles `transfer amt src dst` to. */
export function program(v: Variant, amt: number, src: Acct, dst: Acct): Line[] {
  const g = (ins: Instr, moved = false): Line => ({ ins, part: 'guard', moved })
  const d = (ins: Instr, moved = false): Line => ({ ins, part: 'debit', moved })
  const c = (ins: Instr, moved = false): Line => ({ ins, part: 'credit', moved })
  const debit = (moved = false): Line[] => [d(ldi('r0', amt), moved), d(read('r1', src), moved), d(sub('r1', 'r1', 'r0'), moved), d(write(src, 'r1'), moved)]
  const credit = (moved = false): Line[] => [c(ldi('r0', amt), moved), c(read('r1', dst), moved), c(add('r1', 'r1', 'r0'), moved), c(write(dst, 'r1'), moved)]
  switch (v) {
    // S9.L3's scheme: the guard, then the debit, then the credit, which reads the debited store.
    case 'compiled':
      return [g(read('r0', src)), g(ldi('r1', amt)), g(assertGe('r0', 'r1')), ...debit(), ...credit().slice(1)]
    // The debit moved between the guard's read and its assert: the guard read its operand first.
    case 'read-first':
      return [g(read('r2', src)), ...debit(true), g(ldi('r1', amt)), g(assertGe('r2', 'r1')), ...credit().slice(1)]
    // The agent's edit in S9.L7: the debit moved above the guard's read, so the guard reads the debited balance.
    case 'hoisted':
      return [...debit(true), g(read('r0', src)), g(ldi('r1', amt)), g(assertGe('r0', 'r1')), ...credit()]
    // The sound hoist: the debit moved up and the guard rewritten by substitution, `amt ≤ src` becoming `src ≥ 0`.
    case 'rewritten':
      return [...debit(true), g(read('r0', src)), g(ldi('r1', 0), true), g(assertGe('r0', 'r1')), ...credit()]
    // The other agent's edit in S9.L7's exit: the credit moved above the guard.
    case 'credit':
      return [...credit(true), g(read('r0', src)), g(ldi('r1', amt)), g(assertGe('r0', 'r1')), ...debit()]
  }
}

export interface Machine {
  readonly pc: number
  readonly regs: Readonly<Record<Reg, number | null>>
  readonly store: Store
  /** The run's end, once it has one. */
  readonly done: Outcome | null
}

export const startStore = (s: Start): Store => ({ a1: s.bal1, a2: s.self ? 0 : s.bal2 })

export const accounts = (s: Start): { readonly src: Acct; readonly dst: Acct } => ({ src: 'a1', dst: s.self ? 'a1' : 'a2' })

export function boot(s: Start): Machine {
  return { pc: 0, regs: { r0: null, r1: null, r2: null }, store: startStore(s), done: null }
}

/** One instruction. An abort ends the run with the start store (roll back) or the store as it stands (keep). */
export function step(prog: readonly Line[], m: Machine, aborts: Aborts, initial: Store): Machine {
  if (m.done !== null) return m
  const line = prog[m.pc]
  if (line === undefined) return { ...m, done: { kind: 'committed', store: m.store } }
  const ins = line.ins
  const val = (r: Reg): number => m.regs[r] ?? 0
  const next = (patch: Partial<Machine>): Machine => {
    const n: Machine = { ...m, ...patch, pc: m.pc + 1 }
    return n.pc >= prog.length && n.done === null ? { ...n, done: { kind: 'committed', store: n.store } } : n
  }
  switch (ins.op) {
    case 'ldi':
      return next({ regs: { ...m.regs, [ins.r]: ins.v } })
    case 'read':
      return next({ regs: { ...m.regs, [ins.r]: m.store[ins.a] } })
    case 'add':
      return next({ regs: { ...m.regs, [ins.r]: val(ins.x) + val(ins.y) } })
    case 'sub':
      return next({ regs: { ...m.regs, [ins.r]: val(ins.x) - val(ins.y) } })
    case 'write':
      return next({ store: { ...m.store, [ins.a]: val(ins.r) } })
    case 'assertGe':
      if (val(ins.x) >= val(ins.y)) return next({})
      return { ...m, pc: m.pc + 1, done: { kind: 'aborted', err: ins.err, store: aborts === 'rollback' ? initial : m.store } }
  }
}

/** Every machine state of the run, from boot to its end. */
export function trace(v: Variant, s: Start, aborts: Aborts): Machine[] {
  const { src, dst } = accounts(s)
  const prog = program(v, s.amt, src, dst)
  const initial = startStore(s)
  const out: Machine[] = [boot(s)]
  let m = out[0]
  for (let i = 0; i <= prog.length && m.done === null; i++) {
    m = step(prog, m, aborts, initial)
    out.push(m)
  }
  return out
}

export function runTarget(v: Variant, s: Start, aborts: Aborts): Outcome {
  const t = trace(v, s, aborts)
  const end = t[t.length - 1].done
  if (end === null) throw new Error('run did not end')
  return end
}

/** The source command's outcome. It has no write before its guard, so the abort semantics does not change it. */
export function runSource(s: Start): Outcome {
  const st = startStore(s)
  const { src, dst } = accounts(s)
  if (s.amt > st[src]) return { kind: 'aborted', err: 'insufficient', store: st }
  const debited = { ...st, [src]: st[src] - s.amt }
  return { kind: 'committed', store: { ...debited, [dst]: debited[dst] + s.amt } }
}

/** What a client observes: committed or aborted, the error, and the balances it can see. */
export function same(x: Outcome, y: Outcome, self: boolean): boolean {
  if (x.kind !== y.kind) return false
  if (x.kind === 'aborted' && y.kind === 'aborted' && x.err !== y.err) return false
  return x.store.a1 === y.store.a1 && (self || x.store.a2 === y.store.a2)
}

export const agrees = (v: Variant, s: Start, aborts: Aborts): boolean => same(runSource(s), runTarget(v, s, aborts), s.self)

/** The grid the page sweeps: sender balance 0 to MAX_BAL, amount 1 to MAX_AMT. */
export const MAX_BAL = 9
export const MAX_AMT = 9
export const GRID = (MAX_BAL + 1) * MAX_AMT

export interface Cell {
  readonly bal1: number
  readonly amt: number
  readonly source: Outcome
  readonly target: Outcome
  readonly agree: boolean
}

/** The grid for one variant, abort semantics and recipient. */
export function sweep(v: Variant, aborts: Aborts, bal2: number, self: boolean): Cell[] {
  const out: Cell[] = []
  for (let bal1 = 0; bal1 <= MAX_BAL; bal1++)
    for (let amt = 1; amt <= MAX_AMT; amt++) {
      const s: Start = { bal1, bal2, amt, self }
      const source = runSource(s)
      const target = runTarget(v, s, aborts)
      out.push({ bal1, amt, source, target, agree: same(source, target, self) })
    }
  return out
}

/** The smallest separating start: the smallest amount, then the smallest balance. */
export function smallestSplit(v: Variant, aborts: Aborts, bal2: number, self: boolean): Cell | null {
  const cells = sweep(v, aborts, bal2, self).sort((x, y) => x.amt - y.amt || x.bal1 - y.bal1)
  return cells.find((c) => !c.agree) ?? null
}

export function render(ins: Instr): string {
  const pad = (s: string): string => s.padEnd(9, ' ')
  switch (ins.op) {
    case 'ldi':
      return `${pad('ldi')}${ins.r} ${ins.v}`
    case 'read':
      return `${pad('read')}${ins.r} ${ins.a}`
    case 'add':
    case 'sub':
      return `${pad(ins.op)}${ins.r} ${ins.x} ${ins.y}`
    case 'write':
      return `${pad('write')}${ins.a} ${ins.r}`
    case 'assertGe':
      return `${pad('assertGe')}${ins.x} ${ins.y} ${ins.err}`
  }
}
