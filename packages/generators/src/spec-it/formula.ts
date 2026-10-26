// GEN-spec-it's formulas: properties over scalar variables and per-account arrays, and postconditions over a state
// before and after a command (a primed name is the value after it). Quantifiers range over the accounts 1..n of the
// point being evaluated. Plain JSON data, so an instance carries its options' formulas unchanged.
//
// Pure: no DOM, storage or network.

/** An account index: a bound index variable or a parameter (i, j, x, y), or a literal account number. */
export type Ix = string | number

export type Term =
  | { readonly t: 'num'; readonly n: number }
  | { readonly t: 'var'; readonly v: string }
  | { readonly t: 'arr'; readonly a: string; readonly ix: Ix }
  | { readonly t: 'add'; readonly l: Term; readonly r: Term }
  | { readonly t: 'sub'; readonly l: Term; readonly r: Term }

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

export type Formula =
  | { readonly f: 'true' }
  | { readonly f: 'rel'; readonly op: Rel; readonly l: Term; readonly r: Term }
  | { readonly f: 'ix'; readonly op: '=' | '!='; readonly a: Ix; readonly b: Ix }
  | { readonly f: 'flag'; readonly v: string }
  | { readonly f: 'not'; readonly a: Formula }
  | { readonly f: 'and'; readonly args: readonly Formula[] }
  | { readonly f: 'or'; readonly args: readonly Formula[] }
  | { readonly f: 'implies'; readonly l: Formula; readonly r: Formula }
  | { readonly f: 'iff'; readonly l: Formula; readonly r: Formula }
  | { readonly f: 'all'; readonly ix: string; readonly body: Formula }
  | { readonly f: 'some'; readonly ix: string; readonly body: Formula }

/** A point: scalars, flags, arrays (index 0 is account 1), index parameters, and the number of accounts. */
export interface Point {
  readonly scalars: Readonly<Record<string, number>>
  readonly flags: Readonly<Record<string, boolean>>
  readonly arrays: Readonly<Record<string, readonly number[]>>
  readonly ix: Readonly<Record<string, number>>
  readonly accounts: number
}

// ---------------------------------------------------------------- builders

export const num = (n: number): Term => ({ t: 'num', n })
export const v = (name: string): Term => ({ t: 'var', v: name })
export const arr = (a: string, ix: Ix): Term => ({ t: 'arr', a, ix })
export const add = (l: Term, r: Term): Term => ({ t: 'add', l, r })
export const sub = (l: Term, r: Term): Term => ({ t: 'sub', l, r })
export const rel = (l: Term, op: Rel, r: Term): Formula => ({ f: 'rel', op, l, r })
export const ixEq = (a: Ix, b: Ix): Formula => ({ f: 'ix', op: '=', a, b })
export const ixNe = (a: Ix, b: Ix): Formula => ({ f: 'ix', op: '!=', a, b })
export const flag = (name: string): Formula => ({ f: 'flag', v: name })
export const not = (a: Formula): Formula => ({ f: 'not', a })
/** A conjunction, nested conjunctions flattened so they print without extra parentheses. */
export const and = (...args: Formula[]): Formula => {
  const flat = args.flatMap((a) => (a.f === 'and' ? a.args : [a]))
  return flat.length === 1 ? (flat[0] as Formula) : { f: 'and', args: flat }
}
export const or = (...args: Formula[]): Formula => (args.length === 1 ? (args[0] as Formula) : { f: 'or', args })
export const implies = (l: Formula, r: Formula): Formula => ({ f: 'implies', l, r })
export const iff = (l: Formula, r: Formula): Formula => ({ f: 'iff', l, r })
export const all = (ix: string, body: Formula): Formula => ({ f: 'all', ix, body })
export const some = (ix: string, body: Formula): Formula => ({ f: 'some', ix, body })

// ---------------------------------------------------------------- evaluation

function ixValue(i: Ix, env: Readonly<Record<string, number>>): number {
  if (typeof i === 'number') return i
  const n = env[i]
  if (n === undefined) throw new Error(`unbound account index ${i}`)
  return n
}

function term(t: Term, p: Point, env: Readonly<Record<string, number>>): number {
  switch (t.t) {
    case 'num':
      return t.n
    case 'var': {
      const n = p.scalars[t.v]
      if (n === undefined) throw new Error(`unbound variable ${t.v}`)
      return n
    }
    case 'arr': {
      const a = p.arrays[t.a]
      if (a === undefined) throw new Error(`unbound array ${t.a}`)
      const k = ixValue(t.ix, env)
      const n = a[k - 1]
      if (n === undefined) throw new Error(`account ${k} is outside ${t.a}`)
      return n
    }
    case 'add':
      return term(t.l, p, env) + term(t.r, p, env)
    case 'sub':
      return term(t.l, p, env) - term(t.r, p, env)
  }
}

function compare(op: Rel, a: number, b: number): boolean {
  switch (op) {
    case '<':
      return a < b
    case '<=':
      return a <= b
    case '>':
      return a > b
    case '>=':
      return a >= b
    case '=':
      return a === b
    case '!=':
      return a !== b
  }
}

function go(f: Formula, p: Point, env: Readonly<Record<string, number>>): boolean {
  switch (f.f) {
    case 'true':
      return true
    case 'rel':
      return compare(f.op, term(f.l, p, env), term(f.r, p, env))
    case 'ix': {
      const same = ixValue(f.a, env) === ixValue(f.b, env)
      return f.op === '=' ? same : !same
    }
    case 'flag': {
      const b = p.flags[f.v]
      if (b === undefined) throw new Error(`unbound flag ${f.v}`)
      return b
    }
    case 'not':
      return !go(f.a, p, env)
    case 'and':
      return f.args.every((a) => go(a, p, env))
    case 'or':
      return f.args.some((a) => go(a, p, env))
    case 'implies':
      return !go(f.l, p, env) || go(f.r, p, env)
    case 'iff':
      return go(f.l, p, env) === go(f.r, p, env)
    case 'all':
    case 'some': {
      for (let k = 1; k <= p.accounts; k++) {
        const holds = go(f.body, p, { ...env, [f.ix]: k })
        if (f.f === 'all' && !holds) return false
        if (f.f === 'some' && holds) return true
      }
      return f.f === 'all'
    }
  }
}

/** The formula's truth at a point. */
export function evaluate(f: Formula, p: Point): boolean {
  return go(f, p, p.ix)
}

// ---------------------------------------------------------------- rendering

const prime = (s: string): string => s.replace(/'/g, '′')
const REL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }

export function renderTerm(t: Term): string {
  switch (t.t) {
    case 'num':
      return t.n < 0 ? `−${-t.n}` : String(t.n)
    case 'var':
      return prime(t.v)
    case 'arr':
      return `${prime(t.a)}(${String(t.ix)})`
    case 'add':
      return `${renderTerm(t.l)} + ${renderTerm(t.r)}`
    case 'sub':
      return `${renderTerm(t.l)} − ${t.r.t === 'add' || t.r.t === 'sub' ? `(${renderTerm(t.r)})` : renderTerm(t.r)}`
  }
}

/** Binding strength: higher binds tighter. */
function prec(f: Formula): number {
  switch (f.f) {
    case 'iff':
      return 1
    case 'implies':
      return 2
    case 'or':
      return 3
    case 'and':
      return 4
    case 'all':
    case 'some':
      return 0
    default:
      return 6
  }
}

function wrap(f: Formula, min: number): string {
  const s = render(f)
  return prec(f) < min ? `(${s})` : s
}

export function render(f: Formula): string {
  switch (f.f) {
    case 'true':
      return 'true'
    case 'rel':
      return `${renderTerm(f.l)} ${REL[f.op]} ${renderTerm(f.r)}`
    case 'ix':
      return `${String(f.a)} ${f.op === '=' ? '=' : '≠'} ${String(f.b)}`
    case 'flag':
      return prime(f.v)
    case 'not':
      return `¬${wrap(f.a, 6)}`
    case 'and':
      return f.args.map((a) => wrap(a, 5)).join(' ∧ ')
    case 'or':
      return f.args.map((a) => wrap(a, 4)).join(' ∨ ')
    case 'implies':
      return `${wrap(f.l, 3)} → ${wrap(f.r, 2)}`
    case 'iff':
      return `${wrap(f.l, 2)} ↔ ${wrap(f.r, 2)}`
    case 'all':
      return `∀${f.ix}. ${render(f.body)}`
    case 'some':
      return `∃${f.ix}. ${render(f.body)}`
  }
}

// ---------------------------------------------------------------- measures

/** Atoms: relations, index comparisons and flags. */
export function atomsOf(f: Formula): number {
  switch (f.f) {
    case 'true':
      return 0
    case 'rel':
    case 'ix':
    case 'flag':
      return 1
    case 'not':
      return atomsOf(f.a)
    case 'and':
    case 'or':
      return f.args.reduce((n, a) => n + atomsOf(a), 0)
    case 'implies':
    case 'iff':
      return atomsOf(f.l) + atomsOf(f.r)
    case 'all':
    case 'some':
      return atomsOf(f.body)
  }
}

/** Quantifiers on the formula. */
export function quantifiersOf(f: Formula): number {
  switch (f.f) {
    case 'not':
      return quantifiersOf(f.a)
    case 'and':
    case 'or':
      return f.args.reduce((n, a) => n + quantifiersOf(a), 0)
    case 'implies':
    case 'iff':
      return quantifiersOf(f.l) + quantifiersOf(f.r)
    case 'all':
    case 'some':
      return 1 + quantifiersOf(f.body)
    default:
      return 0
  }
}

/** Alternations between ∀ and ∃ along the deepest nesting. */
export function alternationsOf(f: Formula, outer: 'all' | 'some' | null = null): number {
  switch (f.f) {
    case 'not':
      return alternationsOf(f.a, outer)
    case 'and':
    case 'or':
      return f.args.reduce((n, a) => Math.max(n, alternationsOf(a, outer)), 0)
    case 'implies':
    case 'iff':
      return Math.max(alternationsOf(f.l, outer), alternationsOf(f.r, outer))
    case 'all':
    case 'some':
      return (outer !== null && outer !== f.f ? 1 : 0) + alternationsOf(f.body, f.f)
    default:
      return 0
  }
}

/** The formula's shape with every literal and name erased. */
export function shapeOf(f: Formula): string {
  switch (f.f) {
    case 'true':
      return 'T'
    case 'rel':
      return 'r'
    case 'ix':
      return 'i'
    case 'flag':
      return 'b'
    case 'not':
      return `¬${shapeOf(f.a)}`
    case 'and':
      return `∧(${f.args.map(shapeOf).join(',')})`
    case 'or':
      return `∨(${f.args.map(shapeOf).join(',')})`
    case 'implies':
      return `→(${shapeOf(f.l)},${shapeOf(f.r)})`
    case 'iff':
      return `↔(${shapeOf(f.l)},${shapeOf(f.r)})`
    case 'all':
      return `∀(${shapeOf(f.body)})`
    case 'some':
      return `∃(${shapeOf(f.body)})`
  }
}
