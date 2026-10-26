// GEN-negate-it's formulas: linear relations between integer terms, Boolean flags, index comparisons and
// quantifiers over a finite set of accounts, combined with not, and, or and implies. Plain JSON, so an instance that
// holds them stays plain data. Evaluation is exact integer arithmetic; a quantifier ranges over the accounts it lists,
// so a quantified formula is grounded as it is evaluated (ASSESSMENT.md section 4.3, Fragment).
//
// A variable name may carry an index placeholder, `bal[i]`, which evaluation fills from the quantifier that binds
// `i`: `bal[i]` under i = 2 reads the state's `bal[2]`. A primed name, `a'`, is the value after a step and renders
// as a′.
//
// Pure: no DOM, storage or network.

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

/** A linear term: the sum of coefficient times variable, plus a constant. */
export interface Lin {
  readonly coefs: readonly { readonly v: string; readonly c: number }[]
  readonly k: number
}

export type Formula =
  /** lhs op rhs over integers. */
  | { readonly f: 'rel'; readonly op: Rel; readonly lhs: Lin; readonly rhs: Lin }
  /** A Boolean flag: true when the variable is true. */
  | { readonly f: 'flag'; readonly v: string }
  /** Two account indices compared: i = j or i ≠ j. */
  | { readonly f: 'idx'; readonly op: '=' | '!='; readonly a: string; readonly b: string }
  | { readonly f: 'not'; readonly arg: Formula }
  | { readonly f: 'and'; readonly args: readonly Formula[] }
  | { readonly f: 'or'; readonly args: readonly Formula[] }
  | { readonly f: 'implies'; readonly lhs: Formula; readonly rhs: Formula }
  /** ∀ or ∃ over the listed accounts. */
  | { readonly f: 'all' | 'some'; readonly ix: string; readonly over: readonly number[]; readonly body: Formula }

/** A state: integer values, and true or false for flags. */
export type State = Readonly<Record<string, number | boolean>>

const NEGATED: Readonly<Record<Rel, Rel>> = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '=': '!=', '!=': '=' }
const SYMBOL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }

export const lin = (coefs: readonly { readonly v: string; readonly c: number }[], k = 0): Lin => ({ coefs, k })
/** A single variable as a term. */
export const term = (v: string, k = 0): Lin => ({ coefs: [{ v, c: 1 }], k })
/** A constant as a term. */
export const num = (k: number): Lin => ({ coefs: [], k })
export const rel = (lhs: Lin, op: Rel, rhs: Lin): Formula => ({ f: 'rel', op, lhs, rhs })
export const flag = (v: string): Formula => ({ f: 'flag', v })
export const idx = (a: string, op: '=' | '!=', b: string): Formula => ({ f: 'idx', op, a, b })
export const not = (arg: Formula): Formula => ({ f: 'not', arg })
export const and = (...args: Formula[]): Formula => (args.length === 1 ? (args[0] as Formula) : { f: 'and', args })
export const or = (...args: Formula[]): Formula => (args.length === 1 ? (args[0] as Formula) : { f: 'or', args })
export const implies = (lhs: Formula, rhs: Formula): Formula => ({ f: 'implies', lhs, rhs })
export const all = (ix: string, over: readonly number[], body: Formula): Formula => ({ f: 'all', ix, over, body })
export const some = (ix: string, over: readonly number[], body: Formula): Formula => ({ f: 'some', ix, over, body })
/** a XOR b: a state on which exactly one of them holds. */
export const xor = (a: Formula, b: Formula): Formula => or(and(a, not(b)), and(not(a), b))

type Env = Readonly<Record<string, number>>

/** The state's name for a variable under the bound indices: bal[i] with i = 2 is bal[2]. */
function resolve(v: string, env: Env): string {
  return v.replace(/\[([a-z])\]/g, (whole, ix: string) => (env[ix] === undefined ? whole : `[${env[ix]}]`))
}

function valueOf(s: State, v: string, env: Env): number {
  const x = s[resolve(v, env)]
  if (x === undefined) throw new Error(`no value for ${resolve(v, env)}`)
  return typeof x === 'boolean' ? (x ? 1 : 0) : x
}

export function linValue(l: Lin, s: State, env: Env = {}): number {
  let total = l.k
  for (const { v, c } of l.coefs) total += c * valueOf(s, v, env)
  return total
}

function compare(op: Rel, x: number, y: number): boolean {
  switch (op) {
    case '<':
      return x < y
    case '<=':
      return x <= y
    case '>':
      return x > y
    case '>=':
      return x >= y
    case '=':
      return x === y
    case '!=':
      return x !== y
  }
}

export function evaluate(f: Formula, s: State, env: Env = {}): boolean {
  switch (f.f) {
    case 'rel':
      return compare(f.op, linValue(f.lhs, s, env), linValue(f.rhs, s, env))
    case 'flag':
      return valueOf(s, f.v, env) !== 0
    case 'idx': {
      const a = env[f.a]
      const b = env[f.b]
      if (a === undefined || b === undefined) throw new Error(`unbound index in ${f.a} ${f.op} ${f.b}`)
      return f.op === '=' ? a === b : a !== b
    }
    case 'not':
      return !evaluate(f.arg, s, env)
    case 'and':
      return f.args.every((a) => evaluate(a, s, env))
    case 'or':
      return f.args.some((a) => evaluate(a, s, env))
    case 'implies':
      return !evaluate(f.lhs, s, env) || evaluate(f.rhs, s, env)
    case 'all':
      return f.over.every((n) => evaluate(f.body, s, { ...env, [f.ix]: n }))
    case 'some':
      return f.over.some((n) => evaluate(f.body, s, { ...env, [f.ix]: n }))
  }
}

/** The negation pushed down to the atoms (De Morgan; ¬(a → b) as a ∧ ¬b; ¬∀ as ∃¬). */
export function negate(f: Formula): Formula {
  switch (f.f) {
    case 'rel':
      return rel(f.lhs, NEGATED[f.op], f.rhs)
    case 'flag':
      return not(f)
    case 'idx':
      return idx(f.a, f.op === '=' ? '!=' : '=', f.b)
    case 'not':
      return f.arg
    case 'and':
      return or(...f.args.map(negate))
    case 'or':
      return and(...f.args.map(negate))
    case 'implies':
      return and(f.lhs, negate(f.rhs))
    case 'all':
      return some(f.ix, f.over, negate(f.body))
    case 'some':
      return all(f.ix, f.over, negate(f.body))
  }
}

/** The first relation (in reading order) with its boundary moved by one: < and ≤ trade places, as do > and ≥. */
export function shiftFirstBoundary(f: Formula): Formula | null {
  const shifted: Partial<Record<Rel, Rel>> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' }
  let done = false
  const visit = (g: Formula): Formula => {
    if (done) return g
    switch (g.f) {
      case 'rel': {
        const op = shifted[g.op]
        if (op === undefined) return g
        done = true
        return rel(g.lhs, op, g.rhs)
      }
      case 'flag':
      case 'idx':
        return g
      case 'not':
        return not(visit(g.arg))
      case 'and':
        return { f: 'and', args: g.args.map(visit) }
      case 'or':
        return { f: 'or', args: g.args.map(visit) }
      case 'implies': {
        const lhs = visit(g.lhs)
        return implies(lhs, visit(g.rhs))
      }
      case 'all':
      case 'some':
        return { ...g, body: visit(g.body) }
    }
  }
  const out = visit(f)
  return done ? out : null
}

/** A relation compared the other way instead of negated: ≥ becomes ≤, < becomes >. */
export function flipDirection(f: Formula): Formula | null {
  if (f.f !== 'rel') return null
  const flipped: Partial<Record<Rel, Rel>> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' }
  const op = flipped[f.op]
  return op === undefined ? null : rel(f.lhs, op, f.rhs)
}

/** Every state variable a formula mentions (with index placeholders as written), in first-mention order. */
export function varsOf(f: Formula, out: string[] = []): string[] {
  const add = (v: string): void => {
    if (!out.includes(v)) out.push(v)
  }
  const visit = (g: Formula): void => {
    switch (g.f) {
      case 'rel':
        for (const { v } of [...g.lhs.coefs, ...g.rhs.coefs]) add(v)
        return
      case 'flag':
        add(g.v)
        return
      case 'idx':
        return
      case 'not':
        visit(g.arg)
        return
      case 'implies':
        visit(g.lhs)
        visit(g.rhs)
        return
      case 'all':
      case 'some':
        visit(g.body)
        return
      default:
        g.args.forEach(visit)
    }
  }
  visit(f)
  return out
}

/** The number of relations and flags. */
export function atomsOf(f: Formula): number {
  switch (f.f) {
    case 'rel':
    case 'flag':
      return 1
    case 'idx':
      return 0
    case 'not':
      return atomsOf(f.arg)
    case 'implies':
      return atomsOf(f.lhs) + atomsOf(f.rhs)
    case 'all':
    case 'some':
      return atomsOf(f.body)
    default:
      return f.args.reduce((n, a) => n + atomsOf(a), 0)
  }
}

/** The nesting depth of and, or and implies (an atom is 0). */
export function depthOf(f: Formula): number {
  switch (f.f) {
    case 'rel':
    case 'flag':
    case 'idx':
      return 0
    case 'not':
      return depthOf(f.arg)
    case 'implies':
      return 1 + Math.max(depthOf(f.lhs), depthOf(f.rhs))
    case 'all':
    case 'some':
      return depthOf(f.body)
    default:
      return 1 + f.args.reduce((m, a) => Math.max(m, depthOf(a)), 0)
  }
}

/** Quantifier alternations along the prefix: ∀∃ is 1, ∀∃∀ is 2. */
export function alternationsOf(f: Formula): number {
  let n = 0
  let last: 'all' | 'some' | undefined
  let g = f
  while (g.f === 'all' || g.f === 'some') {
    if (last !== undefined && g.f !== last) n += 1
    last = g.f
    g = g.body
  }
  return n
}

const isPrimed = (v: string): boolean => v.endsWith("'")

/** The formula's shape with every variable, number and relation erased; a relation over primed variables shows as rel′. */
export function shapeOf(f: Formula): string {
  switch (f.f) {
    case 'rel':
      return [...f.lhs.coefs, ...f.rhs.coefs].some(({ v }) => isPrimed(v)) ? 'rel′' : 'rel'
    case 'flag':
      return 'flag'
    case 'idx':
      return 'idx'
    case 'not':
      return `not(${shapeOf(f.arg)})`
    case 'implies':
      return `implies(${shapeOf(f.lhs)},${shapeOf(f.rhs)})`
    case 'all':
    case 'some':
      return `${f.f}(${shapeOf(f.body)})`
    default:
      return `${f.f}(${f.args.map(shapeOf).join(',')})`
  }
}

/** A variable as the item prints it: a′ for a', and bal[i] as it is. */
export const showVar = (v: string): string => v.replace(/'/g, '′')

function renderLin(l: Lin): string {
  let out = ''
  l.coefs.forEach(({ v, c }, i) => {
    const mag = Math.abs(c)
    const t = mag === 1 ? showVar(v) : `${mag}·${showVar(v)}`
    if (i === 0) out = c < 0 ? `−${t}` : t
    else out += c < 0 ? ` − ${t}` : ` + ${t}`
  })
  if (out === '') return l.k < 0 ? `−${Math.abs(l.k)}` : `${l.k}`
  if (l.k !== 0) out += l.k < 0 ? ` − ${Math.abs(l.k)}` : ` + ${l.k}`
  return out
}

/** The formula in the course's logic glyphs. */
export function render(f: Formula): string {
  const inner = (g: Formula): string => (g.f === 'rel' || g.f === 'flag' || g.f === 'idx' || g.f === 'not' ? render(g) : `(${render(g)})`)
  switch (f.f) {
    case 'rel':
      return `${renderLin(f.lhs)} ${SYMBOL[f.op]} ${renderLin(f.rhs)}`
    case 'flag':
      return showVar(f.v)
    case 'idx':
      return `${f.a} ${f.op === '=' ? '=' : '≠'} ${f.b}`
    case 'not':
      return `¬${inner(f.arg)}`
    case 'and':
      return f.args.map(inner).join(' ∧ ')
    case 'or':
      return f.args.map(inner).join(' ∨ ')
    case 'implies':
      return `${inner(f.lhs)} → ${inner(f.rhs)}`
    case 'all':
    case 'some': {
      const q = `${f.f === 'all' ? '∀' : '∃'}${f.ix}.`
      const b = f.body
      return `${q} ${b.f === 'all' || b.f === 'some' ? render(b) : inner(b)}`
    }
  }
}
