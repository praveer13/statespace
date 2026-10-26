// The fixture family's formulas: linear relations over a few integer variables, combined with not, and, or and
// implies. Plain JSON, so instances that hold them stay plain data. Evaluation is exact integer arithmetic.
//
// Pure: no DOM, storage or network.

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

/** A linear term: the sum of coefficient times variable, plus a constant. */
export interface Lin {
  readonly coefs: readonly { readonly v: string; readonly c: number }[]
  readonly k: number
}

export type Formula =
  | { readonly f: 'rel'; readonly op: Rel; readonly lin: Lin; readonly rhs: number }
  | { readonly f: 'not'; readonly arg: Formula }
  | { readonly f: 'and'; readonly args: readonly Formula[] }
  | { readonly f: 'or'; readonly args: readonly Formula[] }
  | { readonly f: 'implies'; readonly lhs: Formula; readonly rhs: Formula }

export type State = Readonly<Record<string, number>>

const NEGATED: Readonly<Record<Rel, Rel>> = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '=': '!=', '!=': '=' }
const SYMBOL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }

export const rel = (op: Rel, lin: Lin, rhs: number): Formula => ({ f: 'rel', op, lin, rhs })
export const not = (arg: Formula): Formula => ({ f: 'not', arg })
export const and = (...args: Formula[]): Formula => ({ f: 'and', args })
export const or = (...args: Formula[]): Formula => ({ f: 'or', args })
export const implies = (lhs: Formula, rhs: Formula): Formula => ({ f: 'implies', lhs, rhs })
/** a XOR b: a state on which exactly one of them holds. */
export const xor = (a: Formula, b: Formula): Formula => or(and(a, not(b)), and(not(a), b))

export function linValue(lin: Lin, s: State): number {
  let total = lin.k
  for (const { v, c } of lin.coefs) {
    const x = s[v]
    if (x === undefined) throw new Error(`no value for ${v}`)
    total += c * x
  }
  return total
}

export function evaluate(f: Formula, s: State): boolean {
  switch (f.f) {
    case 'rel': {
      const x = linValue(f.lin, s)
      switch (f.op) {
        case '<':
          return x < f.rhs
        case '<=':
          return x <= f.rhs
        case '>':
          return x > f.rhs
        case '>=':
          return x >= f.rhs
        case '=':
          return x === f.rhs
        case '!=':
          return x !== f.rhs
      }
      throw new Error('unreachable relation')
    }
    case 'not':
      return !evaluate(f.arg, s)
    case 'and':
      return f.args.every((a) => evaluate(a, s))
    case 'or':
      return f.args.some((a) => evaluate(a, s))
    case 'implies':
      return !evaluate(f.lhs, s) || evaluate(f.rhs, s)
  }
}

/** The negation pushed down to the relations (De Morgan, and not (a -> b) as a and not b). */
export function negate(f: Formula): Formula {
  switch (f.f) {
    case 'rel':
      return rel(NEGATED[f.op], f.lin, f.rhs)
    case 'not':
      return f.arg
    case 'and':
      return or(...f.args.map(negate))
    case 'or':
      return and(...f.args.map(negate))
    case 'implies':
      return and(f.lhs, negate(f.rhs))
  }
}

/** The relation with its boundary moved by one: < becomes <=, > becomes >=, and back. */
export function shiftBoundary(f: Formula): Formula | null {
  if (f.f !== 'rel') return null
  const shifted: Partial<Record<Rel, Rel>> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' }
  const op = shifted[f.op]
  return op === undefined ? null : rel(op, f.lin, f.rhs)
}

/** The relation compared the other way: < becomes >, <= becomes >=. */
export function flipDirection(f: Formula): Formula | null {
  if (f.f !== 'rel') return null
  const flipped: Partial<Record<Rel, Rel>> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' }
  const op = flipped[f.op]
  return op === undefined ? null : rel(op, f.lin, f.rhs)
}

/** Every variable a formula mentions, in first-mention order. */
export function varsOf(f: Formula, out: string[] = []): string[] {
  const visit = (g: Formula): void => {
    if (g.f === 'rel') {
      for (const { v } of g.lin.coefs) if (!out.includes(v)) out.push(v)
    } else if (g.f === 'not') visit(g.arg)
    else if (g.f === 'implies') {
      visit(g.lhs)
      visit(g.rhs)
    } else g.args.forEach(visit)
  }
  visit(f)
  return out
}

/** The number of relations. */
export function atomsOf(f: Formula): number {
  switch (f.f) {
    case 'rel':
      return 1
    case 'not':
      return atomsOf(f.arg)
    case 'implies':
      return atomsOf(f.lhs) + atomsOf(f.rhs)
    default:
      return f.args.reduce((n, a) => n + atomsOf(a), 0)
  }
}

/** The largest absolute coefficient. */
export function maxCoefOf(f: Formula): number {
  switch (f.f) {
    case 'rel':
      return f.lin.coefs.reduce((m, { c }) => Math.max(m, Math.abs(c)), 0)
    case 'not':
      return maxCoefOf(f.arg)
    case 'implies':
      return Math.max(maxCoefOf(f.lhs), maxCoefOf(f.rhs))
    default:
      return f.args.reduce((m, a) => Math.max(m, maxCoefOf(a)), 0)
  }
}

/** The formula's shape with every variable, number and relation erased. */
export function shapeOf(f: Formula): string {
  switch (f.f) {
    case 'rel':
      return 'rel'
    case 'not':
      return `not(${shapeOf(f.arg)})`
    case 'implies':
      return `implies(${shapeOf(f.lhs)},${shapeOf(f.rhs)})`
    default:
      return `${f.f}(${f.args.map(shapeOf).join(',')})`
  }
}

function renderLin(lin: Lin): string {
  let out = ''
  lin.coefs.forEach(({ v, c }, i) => {
    const mag = Math.abs(c)
    const term = mag === 1 ? v : `${mag}·${v}`
    if (i === 0) out = c < 0 ? `−${term}` : term
    else out += c < 0 ? ` − ${term}` : ` + ${term}`
  })
  if (lin.k !== 0 || out === '') out += out === '' ? `${lin.k}` : lin.k < 0 ? ` − ${Math.abs(lin.k)}` : ` + ${lin.k}`
  return out
}

/** The formula as the options show it, in the course's logic glyphs. */
export function render(f: Formula): string {
  const inner = (g: Formula): string => (g.f === 'rel' || g.f === 'not' ? render(g) : `(${render(g)})`)
  switch (f.f) {
    case 'rel':
      return `${renderLin(f.lin)} ${SYMBOL[f.op]} ${f.rhs < 0 ? `−${Math.abs(f.rhs)}` : f.rhs}`
    case 'not':
      return `¬${inner(f.arg)}`
    case 'and':
      return f.args.map(inner).join(' ∧ ')
    case 'or':
      return f.args.map(inner).join(' ∨ ')
    case 'implies':
      return `${inner(f.lhs)} → ${inner(f.rhs)}`
  }
}
