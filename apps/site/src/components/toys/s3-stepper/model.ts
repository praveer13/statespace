// S3.L4's small-step relation, small enough to step by hand. Pure and dependency-free: the page builds a call's first
// configuration, takes one step at a time, and says which rule fired, or that none applies.
//
// The expression rules are the lesson's own (`Step s : E → E → Prop`): bal_acct, bal_cong, ge_left, ge_right and
// ge_num, left to right. The phase steps that carry a call through bind, checked, guard and run are named here for the
// page; the lesson describes them in words. Two relations are offered: the reference, which has a rule from a false
// guard to `err (guardFailed ...)`, and the lesson's first draft, which has none.

export type E =
  | { readonly k: 'num'; readonly n: number }
  | { readonly k: 'acct'; readonly a: string }
  | { readonly k: 'var'; readonly x: string }
  | { readonly k: 'bal'; readonly e: E }
  | { readonly k: 'ge'; readonly l: E; readonly r: E }
  | { readonly k: 'tt' }
  | { readonly k: 'ff' }

export type State = Readonly<Record<string, number>>

export type Relation = 'reference' | 'draft'

export interface Call {
  readonly id: string
  /** The command's name as the lesson writes it. */
  readonly cmd: string
  readonly from: string
  readonly to: string
  readonly amount: number
  /** The guard as written, over the parameters `from`, `to` and `amount`. */
  readonly guard: E
  /** True when typing is bypassed for this call (the lesson's `Odd`). */
  readonly bypassed: boolean
}

export type Cfg =
  | { readonly k: 'bind'; readonly call: Call }
  | { readonly k: 'checked'; readonly call: Call; readonly guard: E }
  | { readonly k: 'guard'; readonly call: Call; readonly e: E }
  | { readonly k: 'run'; readonly call: Call }
  | { readonly k: 'done'; readonly s: State }
  | { readonly k: 'err'; readonly name: string }

/** Where in the guard's tree a step happens: l and r for the sides of `>=`, e for the inside of `balance`. */
export type Path = readonly ('l' | 'r' | 'e')[]

export interface Stepped {
  readonly next: Cfg
  /** The rules that fired, outermost first, such as ["ge_left", "bal_acct"]. */
  readonly rules: readonly string[]
  /** For an expression step, where the redex sat in the guard's tree. */
  readonly at: Path | null
}

// ------------------------------------------------------------------ the lesson's examples

export const num = (n: number): E => ({ k: 'num', n })
export const acct = (a: string): E => ({ k: 'acct', a })
export const v = (x: string): E => ({ k: 'var', x })
export const bal = (e: E): E => ({ k: 'bal', e })
export const ge = (l: E, r: E): E => ({ k: 'ge', l, r })

/** `start    mint -100 · a 100 · b 0` */
export const START: State = { mint: -100, a: 100, b: 0 }

const TRANSFER_GUARD = ge(bal(v('from')), v('amount'))
const ODD_GUARD = ge(bal(v('amount')), v('amount'))

export const CALLS: readonly Call[] = [
  { id: 'ok', cmd: 'Transfer', from: 'a', to: 'b', amount: 30, guard: TRANSFER_GUARD, bypassed: false },
  { id: 'over', cmd: 'Transfer', from: 'a', to: 'b', amount: 130, guard: TRANSFER_GUARD, bypassed: false },
  { id: 'ghost', cmd: 'Transfer', from: 'a', to: 'ghost', amount: 30, guard: TRANSFER_GUARD, bypassed: false },
  { id: 'odd', cmd: 'Odd', from: 'a', to: 'b', amount: 30, guard: ODD_GUARD, bypassed: true },
]

// ------------------------------------------------------------------ the relation

const balOf = (s: State, a: string): number => s[a] ?? 0

/** Arguments meet parameters: accounts become account values, the amount a number. */
export function bind(c: Call, e: E): E {
  switch (e.k) {
    case 'var':
      return e.x === 'amount' ? num(c.amount) : acct(e.x === 'from' ? c.from : c.to)
    case 'bal':
      return bal(bind(c, e.e))
    case 'ge':
      return ge(bind(c, e.l), bind(c, e.r))
    default:
      return e
  }
}

const isNum = (e: E): e is { k: 'num'; n: number } => e.k === 'num'

/** One expression step under the lesson's five rules, or null when none applies. */
export function stepExpr(s: State, e: E): { e: E; rules: string[]; at: Path } | null {
  if (e.k === 'bal') {
    if (e.e.k === 'acct') return { e: num(balOf(s, e.e.a)), rules: ['bal_acct'], at: [] }
    const inner = stepExpr(s, e.e)
    return inner === null ? null : { e: bal(inner.e), rules: ['bal_cong', ...inner.rules], at: ['e', ...inner.at] }
  }
  if (e.k === 'ge') {
    if (!isNum(e.l)) {
      const inner = stepExpr(s, e.l)
      return inner === null ? null : { e: ge(inner.e, e.r), rules: ['ge_left', ...inner.rules], at: ['l', ...inner.at] }
    }
    if (!isNum(e.r)) {
      const inner = stepExpr(s, e.r)
      return inner === null ? null : { e: ge(e.l, inner.e), rules: ['ge_right', ...inner.rules], at: ['r', ...inner.at] }
    }
    return { e: e.r.n <= e.l.n ? { k: 'tt' } : { k: 'ff' }, rules: ['ge_num'], at: [] }
  }
  return null
}

/**
 * Where the next expression step would happen, or where evaluation stops with no rule. Null for a value (a number,
 * true or false) that has nothing left to evaluate.
 */
export function focus(e: E): { at: Path; kind: 'redex' | 'stuck' } | null {
  const go = (x: E, at: Path): { at: Path; kind: 'redex' | 'stuck' } | null => {
    if (x.k === 'bal') {
      if (x.e.k === 'acct') return { at, kind: 'redex' }
      if (x.e.k === 'bal' || x.e.k === 'ge') return go(x.e, [...at, 'e'])
      return { at, kind: 'stuck' }
    }
    if (x.k === 'ge') {
      if (!isNum(x.l)) return x.l.k === 'bal' || x.l.k === 'ge' ? go(x.l, [...at, 'l']) : { at, kind: 'stuck' }
      if (!isNum(x.r)) return x.r.k === 'bal' || x.r.k === 'ge' ? go(x.r, [...at, 'r']) : { at, kind: 'stuck' }
      return { at, kind: 'redex' }
    }
    if (x.k === 'var') return { at, kind: 'stuck' }
    return null
  }
  return go(e, [])
}

/** Debit, then credit, reading the updated state. */
export function post(s: State, x: string, y: string, n: number): State {
  const s1 = { ...s, [x]: balOf(s, x) - n }
  return { ...s1, [y]: balOf(s1, y) + n }
}

export const isFinal = (c: Cfg): boolean => c.k === 'done' || c.k === 'err'

/** One step of a configuration, or null when there is none (a final configuration, or a stuck one). */
export function step(rel: Relation, s: State, c: Cfg): Stepped | null {
  switch (c.k) {
    case 'bind':
      return { next: { k: 'checked', call: c.call, guard: bind(c.call, c.call.guard) }, rules: ['bind'], at: null }
    case 'checked': {
      const missing = [c.call.from, c.call.to].find((a) => !(a in s))
      if (missing !== undefined) return { next: { k: 'err', name: `unknownAccount ${missing}` }, rules: ['check_account'], at: null }
      return { next: { k: 'guard', call: c.call, e: c.guard }, rules: ['checked'], at: null }
    }
    case 'guard': {
      if (c.e.k === 'tt') return { next: { k: 'run', call: c.call }, rules: ['guard_true'], at: null }
      if (c.e.k === 'ff')
        return rel === 'reference' ? { next: { k: 'err', name: `guardFailed "${c.call.cmd}"` }, rules: ['guard_false'], at: null } : null
      const r = stepExpr(s, c.e)
      return r === null ? null : { next: { k: 'guard', call: c.call, e: r.e }, rules: r.rules, at: r.at }
    }
    case 'run':
      return { next: { k: 'done', s: post(s, c.call.from, c.call.to, c.call.amount) }, rules: ['run'], at: null }
    case 'done':
    case 'err':
      return null
  }
}

export const first = (call: Call): Cfg => ({ k: 'bind', call })

export interface Trace {
  readonly cfgs: readonly Cfg[]
  readonly steps: readonly Stepped[]
  /** How the run ended. */
  readonly end: 'done' | 'err' | 'stuck'
}

/** Every configuration from the first to the last, with the step that led to each. */
export function trace(rel: Relation, s: State, call: Call): Trace {
  const cfgs: Cfg[] = [first(call)]
  const steps: Stepped[] = []
  for (let i = 0; i < 20; i++) {
    const cur = cfgs[cfgs.length - 1] as Cfg
    const st = step(rel, s, cur)
    if (st === null) break
    steps.push(st)
    cfgs.push(st.next)
  }
  const last = cfgs[cfgs.length - 1] as Cfg
  return { cfgs, steps, end: last.k === 'done' ? 'done' : last.k === 'err' ? 'err' : 'stuck' }
}

// ------------------------------------------------------------------ printing

export function show(e: E): string {
  switch (e.k) {
    case 'num':
      return String(e.n)
    case 'acct':
      return `acct ${e.a}`
    case 'var':
      return e.x
    case 'bal':
      return `balance(${show(e.e)})`
    case 'ge':
      return `${show(e.l)} >= ${show(e.r)}`
    case 'tt':
      return 'true'
    case 'ff':
      return 'false'
  }
}

export const showState = (s: State): string =>
  Object.entries(s)
    .map(([k, n]) => `${k} ${n < 0 ? `−${-n}` : n}`)
    .join(' · ')

export const showCall = (c: Call): string => `${c.cmd}(${c.from}, ${c.to}, ${c.amount})`

export function showCfg(c: Cfg): string {
  switch (c.k) {
    case 'bind':
      return `bind ${showCall(c.call)}`
    case 'checked':
      return `checked, guard ${show(c.guard)}`
    case 'guard':
      return `guard (${show(c.e)})`
    case 'run':
      return 'run'
    case 'done':
      return `done, ${showState(c.s)}`
    case 'err':
      return `err (${c.name})`
  }
}

/** The phase a configuration is in, for the phase track. */
export const PHASES = ['bind', 'checked', 'guard', 'run', 'done'] as const
export type Phase = (typeof PHASES)[number] | 'err'
export const phaseOf = (c: Cfg): Phase => c.k
