// GEN-find-the-witness t1's models: a guarded transfer over integers or signed bit-vectors, and the ground evaluation
// that checks a candidate witness (ASSESSMENT.md section 4.6, Model or state). Values travel as decimal strings, so a
// 64-bit balance stays exact in plain JSON; evaluation uses BigInt, with two's-complement wrapping at the model's
// width. Ground evaluation is decidable, so a verdict on a given state is exact. Pure.

export type Rel = '<' | '<=' | '>' | '>=' | '='

/** A term: a variable, a constant, or the sum of two terms (wrapping at the model's width). */
export type Term = { readonly v: string } | { readonly k: string } | { readonly add: readonly [Term, Term] } | { readonly sub: readonly [Term, Term] }

export interface Atom {
  readonly lhs: Term
  readonly op: Rel
  readonly rhs: Term
}

export interface Model {
  /** 0 for unbounded integers, else the signed bit-vector width. */
  readonly width: 0 | 16 | 32 | 64
  /** The variables a witness assigns, in order. */
  readonly vars: readonly string[]
  /** The guard: every atom must hold for the step to run. */
  readonly guard: readonly Atom[]
  /** The step's assignments: primed variable to term over the unprimed ones. */
  readonly step: Readonly<Record<string, Term>>
  /** The property after the step, over primed and unprimed variables; a witness breaks it. */
  readonly property: Atom
}

/** A candidate witness: each variable's value as a decimal string. */
export type Assignment = Readonly<Record<string, string>>

export const vr = (name: string): Term => ({ v: name })
export const k = (x: number | bigint): Term => ({ k: String(x) })
export const add = (a: Term, b: Term): Term => ({ add: [a, b] })
export const sub = (a: Term, b: Term): Term => ({ sub: [a, b] })
export const at = (lhs: Term, op: Rel, rhs: Term): Atom => ({ lhs, op, rhs })

/** The largest signed value at a width, 2^(w−1) − 1, by doubling (no ** in seeded code). */
export function maxOf(width: number): bigint {
  let p = 1n
  for (let i = 1; i < width; i++) p *= 2n
  return p - 1n
}

/** Two's-complement wrap of an integer into a signed width (width 0: unchanged). */
export function wrap(x: bigint, width: number): bigint {
  if (width === 0) return x
  const max = maxOf(width)
  const span = (max + 1n) * 2n
  let r = (x - (-max - 1n)) % span
  if (r < 0n) r += span
  return r + (-max - 1n)
}

function value(t: Term, env: Readonly<Record<string, bigint>>, width: number): bigint {
  if ('v' in t) {
    const x = env[t.v]
    if (x === undefined) throw new Error(`unbound variable ${t.v}`)
    return x
  }
  if ('k' in t) return BigInt(t.k)
  if ('add' in t) return wrap(value(t.add[0], env, width) + value(t.add[1], env, width), width)
  return wrap(value(t.sub[0], env, width) - value(t.sub[1], env, width), width)
}

function holds(a: bigint, op: Rel, b: bigint): boolean {
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
  }
}

export interface Evaluation {
  /** Every value parses and lies inside the width. */
  readonly inRange: boolean
  readonly guard: boolean
  readonly violates: boolean
  /** The state after the step, as decimal strings (primed names). */
  readonly after: Assignment
}

const DECIMAL = /^-?[0-9]+$/

/** Evaluate a candidate witness: does the guard hold, and does the state after the step break the property? */
export function evaluateModel(m: Model, s: Assignment): Evaluation {
  const env: Record<string, bigint> = {}
  let inRange = true
  for (const name of m.vars) {
    const raw = s[name]
    if (raw === undefined || !DECIMAL.test(raw)) return { inRange: false, guard: false, violates: false, after: {} }
    const x = BigInt(raw)
    if (m.width > 0 && (x > maxOf(m.width) || x < -maxOf(m.width) - 1n)) inRange = false
    env[name] = x
  }
  if (!inRange) return { inRange, guard: false, violates: false, after: {} }
  const guard = m.guard.every((g) => holds(value(g.lhs, env, m.width), g.op, value(g.rhs, env, m.width)))
  const post: Record<string, bigint> = { ...env }
  const after: Record<string, string> = {}
  for (const [name, t] of Object.entries(m.step)) {
    post[name] = value(t, env, m.width)
    after[name] = String(post[name])
  }
  for (const name of m.vars) if (!(`${name}'` in post)) post[`${name}'`] = env[name] as bigint
  const p = m.property
  const violates = !holds(value(p.lhs, post, m.width), p.op, value(p.rhs, post, m.width))
  return { inRange, guard, violates, after }
}

const OPS: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=' }
const showVar = (name: string): string => name.replace(/'/g, '′')
const showNum = (s: string): string => (s.startsWith('-') ? `−${s.slice(1)}` : s)

export function renderTerm(t: Term): string {
  if ('v' in t) return showVar(t.v)
  if ('k' in t) return showNum(t.k)
  if ('add' in t) return `${renderTerm(t.add[0])} + ${renderTerm(t.add[1])}`
  return `${renderTerm(t.sub[0])} − ${renderTerm(t.sub[1])}`
}

export const renderAtom = (a: Atom): string => `${renderTerm(a.lhs)} ${OPS[a.op]} ${renderTerm(a.rhs)}`

export const renderAssignment = (vars: readonly string[], s: Assignment): string => vars.map((name) => `${name} = ${showNum(s[name] ?? '?')}`).join(', ')
