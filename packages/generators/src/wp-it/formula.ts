// GEN-wp-it's formulas and commands. Formulas are linear relations between integer terms, Boolean flags, index
// comparisons and a bounded ∀ over accounts, combined with not, and, or and implies. Commands are loop-free: integer
// and Boolean assignments, an assignment to one account's balance, sequences, `assume`, `requires` and if-then-else.
// Plain JSON throughout, so an instance that holds them stays plain data.
//
// Two readings of one command live here, kept apart on purpose:
//   wp(c, Q)      the reference VC generator: backward substitution, one rule per guard reading (ASSESSMENT.md 4.5);
//   run(c, s)     the interpreter: what the command does from a state.
// The family's checker (engine.ts) never trusts wp(): it runs the command from every state of the box and compares
// the outcome with each option, so the key comes from the interpreter, not from the generator's substitution.
//
// An account balance is written `bal[i]`. The index is filled from the quantifier that binds it, and failing that
// from the state (the command's parameter `k`), so `∀k. bal[k] ≥ 0` reads its own `k` and not the parameter's:
// exactly the capture the band-3 assignment items are about.
//
// Pure: no DOM, storage or network.

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

/** A linear term: the sum of coefficient times variable, plus a constant. */
export interface Lin {
  readonly coefs: readonly { readonly v: string; readonly c: number }[]
  readonly k: number
}

export type Formula =
  | { readonly f: 'rel'; readonly op: Rel; readonly lhs: Lin; readonly rhs: Lin }
  | { readonly f: 'flag'; readonly v: string }
  /** Two account indices compared; each is a bound index or the state's parameter. */
  | { readonly f: 'idx'; readonly op: '=' | '!='; readonly a: string; readonly b: string }
  | { readonly f: 'not'; readonly arg: Formula }
  | { readonly f: 'and'; readonly args: readonly Formula[] }
  | { readonly f: 'or'; readonly args: readonly Formula[] }
  | { readonly f: 'implies'; readonly lhs: Formula; readonly rhs: Formula }
  | { readonly f: 'all'; readonly ix: string; readonly over: readonly number[]; readonly body: Formula }

export type Cmd =
  | { readonly c: 'skip' }
  | { readonly c: 'set'; readonly v: string; readonly e: Lin }
  | { readonly c: 'setb'; readonly v: string; readonly e: Formula }
  /** bal[ix] := e, where ix names the state's parameter. */
  | { readonly c: 'seta'; readonly arr: string; readonly ix: string; readonly e: Lin }
  | { readonly c: 'seq'; readonly cmds: readonly Cmd[] }
  | { readonly c: 'assume'; readonly g: Formula }
  | { readonly c: 'require'; readonly g: Formula }
  | { readonly c: 'if'; readonly g: Formula; readonly then: Cmd; readonly else: Cmd }

export type State = Readonly<Record<string, number | boolean>>

const NEGATED: Readonly<Record<Rel, Rel>> = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '=': '!=', '!=': '=' }
const SYMBOL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }

/** A linear term with like variables merged and zero coefficients dropped, in first-mention order. */
export function lin(coefs: readonly { readonly v: string; readonly c: number }[], k = 0): Lin {
  const out: { v: string; c: number }[] = []
  for (const { v, c } of coefs) {
    const at = out.find((x) => x.v === v)
    if (at === undefined) out.push({ v, c })
    else at.c += c
  }
  return { coefs: out.filter((x) => x.c !== 0), k }
}
export const term = (v: string, k = 0): Lin => lin([{ v, c: 1 }], k)
export const num = (k: number): Lin => ({ coefs: [], k })
/** l1 + s·l2 */
export const addLin = (l1: Lin, l2: Lin, s = 1): Lin => lin([...l1.coefs, ...l2.coefs.map(({ v, c }) => ({ v, c: c * s }))], l1.k + s * l2.k)
export const rel = (lhs: Lin, op: Rel, rhs: Lin): Formula => ({ f: 'rel', op, lhs, rhs })
export const flag = (v: string): Formula => ({ f: 'flag', v })
export const idx = (a: string, op: '=' | '!=', b: string): Formula => ({ f: 'idx', op, a, b })
export const not = (arg: Formula): Formula => ({ f: 'not', arg })
/** A conjunction, nested conjunctions flattened (one reading, one rendering). */
export const and = (...args: Formula[]): Formula => {
  const flat = args.flatMap((a) => (a.f === 'and' ? a.args : [a]))
  return flat.length === 1 ? (flat[0] as Formula) : { f: 'and', args: flat }
}
export const or = (...args: Formula[]): Formula => (args.length === 1 ? (args[0] as Formula) : { f: 'or', args })
export const implies = (lhs: Formula, rhs: Formula): Formula => ({ f: 'implies', lhs, rhs })
export const all = (ix: string, over: readonly number[], body: Formula): Formula => ({ f: 'all', ix, over, body })

export const set = (v: string, e: Lin): Cmd => ({ c: 'set', v, e })
export const setb = (v: string, e: Formula): Cmd => ({ c: 'setb', v, e })
export const seq = (...cmds: Cmd[]): Cmd => ({ c: 'seq', cmds })

type Env = Readonly<Record<string, number>>

function indexValue(name: string, s: State, env: Env): number {
  const bound = env[name]
  if (bound !== undefined) return bound
  const x = s[name]
  if (typeof x !== 'number') throw new Error(`no index value for ${name}`)
  return x
}

/** The state's name for a variable: bal[k] under k = 2 (bound, or the parameter) is bal[2]. */
function resolve(v: string, s: State, env: Env): string {
  return v.replace(/\[([a-z]+)\]/g, (_whole, ix: string) => `[${indexValue(ix, s, env)}]`)
}

function valueOf(s: State, v: string, env: Env): number {
  const name = resolve(v, s, env)
  const x = s[name]
  if (x === undefined) throw new Error(`no value for ${name}`)
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
      const a = indexValue(f.a, s, env)
      const b = indexValue(f.b, s, env)
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
  }
}

/** The negation pushed to the atoms (De Morgan; ¬(a → b) as a ∧ ¬b). */
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
      throw new Error('negate: a ∀ is never negated in this family')
  }
}

// ---------------------------------------------------------------- substitution

/** l with every occurrence of the integer variable v replaced by e. */
export function substLin(l: Lin, v: string, e: Lin): Lin {
  const c = l.coefs.find((x) => x.v === v)?.c ?? 0
  if (c === 0) return l
  return addLin(lin(l.coefs.filter((x) => x.v !== v), l.k), e, c)
}

/** Q[e/v] for an integer variable. A variable bound by a ∀ is never replaced (it is a different variable). */
export function subst(f: Formula, v: string, e: Lin): Formula {
  switch (f.f) {
    case 'rel':
      return rel(substLin(f.lhs, v, e), f.op, substLin(f.rhs, v, e))
    case 'flag':
    case 'idx':
      return f
    case 'not':
      return not(subst(f.arg, v, e))
    case 'and':
      return and(...f.args.map((a) => subst(a, v, e)))
    case 'or':
      return or(...f.args.map((a) => subst(a, v, e)))
    case 'implies':
      return implies(subst(f.lhs, v, e), subst(f.rhs, v, e))
    case 'all':
      return f.ix === v ? f : all(f.ix, f.over, subst(f.body, v, e))
  }
}

/** Q[e/v] for a Boolean variable: every occurrence of the flag v becomes the formula e. */
export function substFlag(f: Formula, v: string, e: Formula): Formula {
  switch (f.f) {
    case 'flag':
      return f.v === v ? e : f
    case 'rel':
    case 'idx':
      return f
    case 'not':
      return not(substFlag(f.arg, v, e))
    case 'and':
      return and(...f.args.map((a) => substFlag(a, v, e)))
    case 'or':
      return or(...f.args.map((a) => substFlag(a, v, e)))
    case 'implies':
      return implies(substFlag(f.lhs, v, e), substFlag(f.rhs, v, e))
    case 'all':
      return all(f.ix, f.over, substFlag(f.body, v, e))
  }
}

/**
 * The reference VC generator (ASSESSMENT.md section 4.5): wp(x := e, Q) = Q[e/x]; wp(c1; c2, Q) = wp(c1, wp(c2, Q));
 * assume G: G → wp; requires G (the reject reading): G ∧ wp; if-then-else: (G → wp1) ∧ (¬G → wp2). An assignment
 * to an account is built by the template that uses it, never here.
 */
export function wp(c: Cmd, q: Formula): Formula {
  switch (c.c) {
    case 'skip':
      return q
    case 'set':
      return subst(q, c.v, c.e)
    case 'setb':
      return substFlag(q, c.v, c.e)
    case 'seta':
      throw new Error('wp: an account assignment is substituted by its template')
    case 'seq':
      return c.cmds.reduceRight((acc, x) => wp(x, acc), q)
    case 'assume':
      return implies(c.g, q)
    case 'require':
      return and(c.g, q)
    case 'if':
      return and(implies(c.g, wp(c.then, q)), implies(negate(c.g), wp(c.else, q)))
  }
}

// ---------------------------------------------------------------- the interpreter

/** Where a run ends: in a state, blocked by a false `assume`, or rejected by a false `requires`. */
export type Outcome = { readonly kind: 'ok'; readonly state: State } | { readonly kind: 'blocked' } | { readonly kind: 'rejected' }

export function run(c: Cmd, s: State): Outcome {
  switch (c.c) {
    case 'skip':
      return { kind: 'ok', state: s }
    case 'set':
      return { kind: 'ok', state: { ...s, [c.v]: linValue(c.e, s) } }
    case 'setb':
      return { kind: 'ok', state: { ...s, [c.v]: evaluate(c.e, s) } }
    case 'seta': {
      const i = indexValue(c.ix, s, {})
      const name = `${c.arr}[${i}]`
      if (!(name in s)) throw new Error(`no account ${name}`)
      return { kind: 'ok', state: { ...s, [name]: linValue(c.e, s) } }
    }
    case 'seq': {
      let cur: State = s
      for (const x of c.cmds) {
        const o = run(x, cur)
        if (o.kind !== 'ok') return o
        cur = o.state
      }
      return { kind: 'ok', state: cur }
    }
    case 'assume':
      return evaluate(c.g, s) ? { kind: 'ok', state: s } : { kind: 'blocked' }
    case 'require':
      return evaluate(c.g, s) ? { kind: 'ok', state: s } : { kind: 'rejected' }
    case 'if':
      return run(evaluate(c.g, s) ? c.then : c.else, s)
  }
}

/**
 * Whether the state is in the weakest precondition, read off a run: the run ends in a state where Q holds, or an
 * `assume` blocks it (nothing to show from there); a `requires` that rejects the state excludes it.
 */
export function inWp(c: Cmd, q: Formula, s: State): boolean {
  const o = run(c, s)
  return o.kind === 'blocked' ? true : o.kind === 'rejected' ? false : evaluate(q, o.state)
}

// ---------------------------------------------------------------- shape and size

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
      return atomsOf(f.body)
    default:
      return f.args.reduce((n, a) => n + atomsOf(a), 0)
  }
}

function linVars(l: Lin): string[] {
  return l.coefs.map((x) => x.v)
}

/** Variables a formula reads (account names as written). */
export function readsOf(f: Formula, out: Set<string> = new Set()): Set<string> {
  switch (f.f) {
    case 'rel':
      for (const v of [...linVars(f.lhs), ...linVars(f.rhs)]) out.add(v)
      break
    case 'flag':
      out.add(f.v)
      break
    case 'idx':
      break
    case 'not':
      readsOf(f.arg, out)
      break
    case 'implies':
      readsOf(f.lhs, out)
      readsOf(f.rhs, out)
      break
    case 'all':
      readsOf(f.body, out)
      break
    default:
      f.args.forEach((a) => readsOf(a, out))
  }
  return out
}

/** What an assignment reads and writes. */
export function effectOf(c: Cmd): { reads: Set<string>; writes: Set<string> } {
  switch (c.c) {
    case 'set':
      return { reads: new Set(linVars(c.e)), writes: new Set([c.v]) }
    case 'setb':
      return { reads: readsOf(c.e), writes: new Set([c.v]) }
    case 'seta':
      return { reads: new Set([...linVars(c.e), c.ix]), writes: new Set([`${c.arr}[${c.ix}]`]) }
    default:
      return { reads: new Set(), writes: new Set() }
  }
}

/** Pairs of assignments in a sequence that do not commute: one writes what the other reads or writes. */
export function nonCommutingPairs(cmds: readonly Cmd[]): number {
  let n = 0
  for (let i = 0; i < cmds.length; i++) {
    for (let j = i + 1; j < cmds.length; j++) {
      const a = effectOf(cmds[i] as Cmd)
      const b = effectOf(cmds[j] as Cmd)
      const clash = [...a.writes].some((w) => b.reads.has(w) || b.writes.has(w)) || [...b.writes].some((w) => a.reads.has(w))
      if (clash) n += 1
    }
  }
  return n
}

/** The command's shape with every name and number erased. */
export function cmdShape(c: Cmd): string {
  switch (c.c) {
    case 'seq':
      return `seq(${c.cmds.map(cmdShape).join(',')})`
    case 'if':
      return `if(${cmdShape(c.then)},${cmdShape(c.else)})`
    default:
      return c.c
  }
}

// ---------------------------------------------------------------- rendering

/** A variable as the item prints it. */
export const showVar = (v: string): string => v

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
      return `∀${f.ix}. ${f.body.f === 'implies' ? render(f.body) : inner(f.body)}`
  }
}

export function renderCmd(c: Cmd, indent = ''): string {
  switch (c.c) {
    case 'skip':
      return `${indent}skip`
    case 'set':
      return `${indent}${c.v} := ${renderLin(c.e)}`
    case 'setb':
      return `${indent}${c.v} := (${render(c.e)})`
    case 'seta':
      return `${indent}${c.arr}[${c.ix}] := ${renderLin(c.e)}`
    case 'seq':
      return c.cmds.map((x) => renderCmd(x, indent)).join(';\n')
    case 'assume':
      return `${indent}assume ${render(c.g)}`
    case 'require':
      return `${indent}requires ${render(c.g)}`
    case 'if':
      return `${indent}if ${render(c.g)} then\n${renderCmd(c.then, `${indent}  `)}\n${indent}else\n${renderCmd(c.else, `${indent}  `)}\n${indent}end`
  }
}
