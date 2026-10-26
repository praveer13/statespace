// GEN-call-it's formulas, as plain JSON: linear integer relations joined by and, or and not, for the three-way verdict
// (t1), and the readings of theorem restatements (t4), which quantify over a small ledger box and read the transfer's
// result through an interpretation. Pure.

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

/** A linear term c1·v1 + … + k, or SP-1.7's power term x ** y, which only t1's unknown construction uses. */
export type Term = { readonly lin: readonly { readonly v: string; readonly c: number }[]; readonly k: number } | { readonly pow: readonly [string, string] }

export type Formula =
  | { readonly f: 'rel'; readonly lhs: Term; readonly op: Rel; readonly rhs: Term }
  | { readonly f: 'and'; readonly args: readonly Formula[] }
  | { readonly f: 'or'; readonly args: readonly Formula[] }
  | { readonly f: 'not'; readonly arg: Formula }
  | { readonly f: 'implies'; readonly lhs: Formula; readonly rhs: Formula }
  | { readonly f: 'all' | 'some'; readonly v: string; readonly body: Formula }

export type State = Readonly<Record<string, number>>

export const v = (name: string, c = 1): Term => ({ lin: [{ v: name, c }], k: 0 })
export const n = (k: number): Term => ({ lin: [], k })
export const plus = (a: string, b: string): Term => ({ lin: [{ v: a, c: 1 }, { v: b, c: 1 }], k: 0 })
export const minus = (a: string, b: string): Term => ({ lin: [{ v: a, c: 1 }, { v: b, c: -1 }], k: 0 })
export const off = (name: string, k: number): Term => ({ lin: [{ v: name, c: 1 }], k })
export const pow = (x: string, y: string): Term => ({ pow: [x, y] })
export const rel = (lhs: Term, op: Rel, rhs: Term): Formula => ({ f: 'rel', lhs, op, rhs })
export const and = (...args: Formula[]): Formula => ({ f: 'and', args })
export const or = (...args: Formula[]): Formula => ({ f: 'or', args })
export const not = (arg: Formula): Formula => ({ f: 'not', arg })
export const implies = (lhs: Formula, rhs: Formula): Formula => ({ f: 'implies', lhs, rhs })
export const all = (name: string, body: Formula): Formula => ({ f: 'all', v: name, body })
export const some = (name: string, body: Formula): Formula => ({ f: 'some', v: name, body })

export const hasPow = (f: Formula): boolean => {
  switch (f.f) {
    case 'rel':
      return 'pow' in f.lhs || 'pow' in f.rhs
    case 'and':
    case 'or':
      return f.args.some(hasPow)
    case 'not':
      return hasPow(f.arg)
    case 'implies':
      return hasPow(f.lhs) || hasPow(f.rhs)
    default:
      return hasPow(f.body)
  }
}

/** A term's value; `read` resolves a variable (a primed variable through the interpretation, in t4). */
function value(t: Term, read: (name: string) => number): number {
  if ('pow' in t) {
    // Repeated multiplication for a non-negative exponent: exact, and no ** (the determinism lint bans it).
    const base = read(t.pow[0])
    const e = read(t.pow[1])
    let r = 1
    for (let i = 0; i < e; i++) r *= base
    return e < 0 ? Number.NaN : r
  }
  let s = t.k
  for (const x of t.lin) s += x.c * read(x.v)
  return s
}

function holds(a: number, op: Rel, b: number): boolean {
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

/** Evaluate a formula; quantifiers range over `over`, and `read` resolves free and bound variables. */
export function evaluate(f: Formula, env: State, over: readonly number[] = [], prime?: (env: State, name: string) => number): boolean {
  const read = (name: string): number => {
    if (name.endsWith("'") && prime !== undefined) return prime(env, name)
    const x = env[name]
    if (x === undefined) throw new Error(`unbound variable ${name}`)
    return x
  }
  switch (f.f) {
    case 'rel':
      return holds(value(f.lhs, read), f.op, value(f.rhs, read))
    case 'and':
      return f.args.every((g) => evaluate(g, env, over, prime))
    case 'or':
      return f.args.some((g) => evaluate(g, env, over, prime))
    case 'not':
      return !evaluate(f.arg, env, over, prime)
    case 'implies':
      return !evaluate(f.lhs, env, over, prime) || evaluate(f.rhs, env, over, prime)
    case 'all':
      return over.every((x) => evaluate(f.body, { ...env, [f.v]: x }, over, prime))
    case 'some':
      return over.some((x) => evaluate(f.body, { ...env, [f.v]: x }, over, prime))
  }
}

const OPS: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }
const show = (name: string): string => name.replace(/'/g, '′')

export function renderTerm(t: Term): string {
  if ('pow' in t) return `${t.pow[0]} ** ${t.pow[1]}`
  const parts: string[] = []
  t.lin.forEach((x, i) => {
    const name = show(x.v)
    const mag = x.c < 0 ? -x.c : x.c
    const body = mag === 1 ? name : `${mag}·${name}`
    parts.push(i === 0 ? (x.c < 0 ? `−${body}` : body) : x.c < 0 ? `− ${body}` : `+ ${body}`)
  })
  if (t.k !== 0 || parts.length === 0) parts.push(parts.length === 0 ? (t.k < 0 ? `−${-t.k}` : `${t.k}`) : t.k < 0 ? `− ${-t.k}` : `+ ${t.k}`)
  return parts.join(' ')
}

export function render(f: Formula, top = true): string {
  const wrap = (s: string): string => (top ? s : `(${s})`)
  switch (f.f) {
    case 'rel':
      return `${renderTerm(f.lhs)} ${OPS[f.op]} ${renderTerm(f.rhs)}`
    case 'and':
      return wrap(f.args.map((g) => render(g, false)).join(' ∧ '))
    case 'or':
      return wrap(f.args.map((g) => render(g, false)).join(' ∨ '))
    case 'not':
      return f.arg.f === 'rel' ? `¬(${render(f.arg, true)})` : `¬${render(f.arg, false)}`
    case 'implies':
      return wrap(`${render(f.lhs, false)} → ${render(f.rhs, false)}`)
    case 'all':
      return wrap(`∀${f.v}. ${render(f.body, true)}`)
    case 'some':
      return wrap(`∃${f.v}. ${render(f.body, true)}`)
  }
}

/** The number of relations in a formula. */
export const atomsOf = (f: Formula): number => {
  switch (f.f) {
    case 'rel':
      return 1
    case 'and':
    case 'or':
      return f.args.reduce((s, g) => s + atomsOf(g), 0)
    case 'not':
      return atomsOf(f.arg)
    case 'implies':
      return atomsOf(f.lhs) + atomsOf(f.rhs)
    default:
      return atomsOf(f.body)
  }
}

/** The formula's shape with every literal erased. */
export const shapeOf = (f: Formula): string => {
  switch (f.f) {
    case 'rel':
      return 'pow' in f.lhs || 'pow' in f.rhs ? 'pow' : 'r'
    case 'and':
    case 'or':
      return `${f.f}(${f.args.map(shapeOf).join(',')})`
    case 'not':
      return `not(${shapeOf(f.arg)})`
    case 'implies':
      return `imp(${shapeOf(f.lhs)},${shapeOf(f.rhs)})`
    default:
      return `${f.f}(${shapeOf(f.body)})`
  }
}
