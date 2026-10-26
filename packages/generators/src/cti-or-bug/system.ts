// GEN-cti-or-bug's transition systems: two to four integer variables, a concrete initial state, one to three guarded
// commands (a command may take an integer parameter from a printed range), and a candidate invariant. Formulas are
// conjunctions and disjunctions of linear relations. Plain JSON throughout.
//
// The checks the CTI workbench runs (M-cti-workbench; ASSESSMENT.md section 4.7) live here as plain code:
//   initiation    Init ⇒ Inv: evaluate Inv at the initial state;
//   consecution   Inv ∧ Next ⇒ Inv′: try every state of the box, every command and parameter;
//   reachability  breadth-first search from Init, to the printed depth N or until no new state appears.
//
// Pure: no DOM, storage or network.

export type Rel = '<' | '<=' | '>' | '>=' | '=' | '!='

export interface Lin {
  readonly coefs: readonly { readonly v: string; readonly c: number }[]
  readonly k: number
}

export type Formula =
  | { readonly f: 'rel'; readonly op: Rel; readonly lhs: Lin; readonly rhs: Lin }
  | { readonly f: 'and'; readonly args: readonly Formula[] }

export type State = Readonly<Record<string, number>>

export interface Command {
  readonly name: string
  /** The parameter, when the command takes one: an integer from lo to hi. */
  readonly param?: { readonly v: string; readonly lo: number; readonly hi: number }
  readonly guard: Formula
  /** Simultaneous updates; every variable not named is unchanged. */
  readonly updates: readonly { readonly v: string; readonly e: Lin }[]
}

export interface System {
  readonly vars: readonly string[]
  readonly init: State
  readonly commands: readonly Command[]
}

const SYMBOL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }

export function lin(coefs: readonly { readonly v: string; readonly c: number }[], k = 0): Lin {
  const out: { v: string; c: number }[] = []
  for (const { v, c } of coefs) {
    const at = out.find((x) => x.v === v)
    if (at === undefined) out.push({ v, c })
    else at.c += c
  }
  return { coefs: out.filter((x) => x.c !== 0), k }
}
/** The sum of the named variables, plus k. */
export const sum = (vars: readonly string[], k = 0): Lin => lin(vars.map((v) => ({ v, c: 1 })), k)
export const term = (v: string, k = 0): Lin => lin([{ v, c: 1 }], k)
export const num = (k: number): Lin => ({ coefs: [], k })
export const rel = (lhs: Lin, op: Rel, rhs: Lin): Formula => ({ f: 'rel', op, lhs, rhs })
export const and = (...args: Formula[]): Formula => {
  const flat = args.flatMap((a) => (a.f === 'and' ? a.args : [a]))
  return flat.length === 1 ? (flat[0] as Formula) : { f: 'and', args: flat }
}

export function linValue(l: Lin, s: State): number {
  let total = l.k
  for (const { v, c } of l.coefs) {
    const x = s[v]
    if (x === undefined) throw new Error(`no value for ${v}`)
    total += c * x
  }
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

export function evaluate(f: Formula, s: State): boolean {
  return f.f === 'rel' ? compare(f.op, linValue(f.lhs, s), linValue(f.rhs, s)) : f.args.every((a) => evaluate(a, s))
}

export function conjuncts(f: Formula): readonly Formula[] {
  return f.f === 'and' ? f.args : [f]
}

function renderLin(l: Lin): string {
  let out = ''
  l.coefs.forEach(({ v, c }, i) => {
    const mag = Math.abs(c)
    const t = mag === 1 ? v : `${mag}·${v}`
    if (i === 0) out = c < 0 ? `−${t}` : t
    else out += c < 0 ? ` − ${t}` : ` + ${t}`
  })
  if (out === '') return l.k < 0 ? `−${Math.abs(l.k)}` : `${l.k}`
  if (l.k !== 0) out += l.k < 0 ? ` − ${Math.abs(l.k)}` : ` + ${l.k}`
  return out
}

export function render(f: Formula): string {
  return f.f === 'rel' ? `${renderLin(f.lhs)} ${SYMBOL[f.op]} ${renderLin(f.rhs)}` : f.args.map(render).join(' ∧ ')
}

const prime = (v: string): string => `${v}′`

/** "Debit(x): guard p = 0 ∧ 0 < x ∧ x ≤ a; a′ = a − x, p′ = x" */
export function renderCommand(c: Command): string {
  const head =
    c.param === undefined ? c.name : c.param.lo === c.param.hi ? `${c.name}(${c.param.v}), ${c.param.v} = ${c.param.lo}` : `${c.name}(${c.param.v}), ${c.param.v} from ${c.param.lo} to ${c.param.hi}`
  return `${head}: guard \`${render(c.guard)}\`; ${c.updates.map((u) => `\`${prime(u.v)} = ${renderLin(u.e)}\``).join(', ')}`
}

export const renderState = (vars: readonly string[], s: State): string => `(${vars.join(', ')}) = (${vars.map((v) => minus(s[v] ?? 0)).join(', ')})`
const minus = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`)

// ---------------------------------------------------------------- steps

/** One step: the command taken, its parameter, and the state it reaches. */
export interface Step {
  readonly command: string
  readonly param?: number
  readonly to: State
}

/** Every step a command allows from a state. */
export function stepsFrom(sys: System, s: State): Step[] {
  const out: Step[] = []
  for (const c of sys.commands) {
    const values = c.param === undefined ? [undefined] : range(c.param.lo, c.param.hi)
    for (const x of values) {
      const env: Record<string, number> = { ...s }
      if (c.param !== undefined && x !== undefined) env[c.param.v] = x
      if (!evaluate(c.guard, env)) continue
      const to: Record<string, number> = {}
      for (const v of sys.vars) to[v] = s[v] as number
      for (const u of c.updates) to[u.v] = linValue(u.e, env)
      out.push({ command: c.name, ...(x === undefined ? {} : { param: x }), to })
    }
  }
  return out
}

function range(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let i = lo; i <= hi; i++) out.push(i)
  return out
}

const keyOf = (vars: readonly string[], s: State): string => vars.map((v) => s[v]).join(',')

/** What a reachability search from Init found. */
export type Reach =
  /** A shortest run from Init to a state that breaks the invariant. */
  | { readonly kind: 'violated'; readonly trace: readonly Step[]; readonly state: State }
  /** Every reachable state was visited (`states` of them) and each satisfies the invariant. */
  | { readonly kind: 'exhausted'; readonly states: number }
  /** The search stopped at depth N or at the state cap with no violation: no verdict. */
  | { readonly kind: 'stopped'; readonly states: number; readonly depth: number }

/** Breadth-first search from Init for a state that breaks inv, to depth maxDepth, visiting at most maxStates states. */
export function reach(sys: System, inv: Formula, maxDepth: number, maxStates: number): Reach {
  if (!evaluate(inv, sys.init)) return { kind: 'violated', trace: [], state: sys.init }
  const seen = new Map<string, { from: string | null; step: Step | null }>()
  const k0 = keyOf(sys.vars, sys.init)
  seen.set(k0, { from: null, step: null })
  let frontier: { key: string; state: State }[] = [{ key: k0, state: sys.init }]
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: { key: string; state: State }[] = []
    for (const { key, state } of frontier) {
      for (const step of stepsFrom(sys, state)) {
        const k = keyOf(sys.vars, step.to)
        if (seen.has(k)) continue
        seen.set(k, { from: key, step })
        if (!evaluate(inv, step.to)) {
          const trace: Step[] = []
          let at: string | null = k
          while (at !== null) {
            const node = seen.get(at)
            if (node === undefined || node.step === null) break
            trace.unshift(node.step)
            at = node.from
          }
          return { kind: 'violated', trace, state: step.to }
        }
        if (seen.size > maxStates) return { kind: 'stopped', states: seen.size, depth }
        next.push({ key: k, state: step.to })
      }
    }
    if (next.length === 0) return { kind: 'exhausted', states: seen.size }
    frontier = next
  }
  return { kind: 'stopped', states: seen.size, depth: maxDepth }
}

/** A box: every variable from lo to hi. */
export interface Box {
  readonly lo: number
  readonly hi: number
}

/** A state of the box that satisfies inv, with a step that breaks it: a counterexample to induction. */
export interface Cti {
  readonly state: State
  readonly step: Step
}

export function boxSize(sys: System, box: Box): number {
  let n = 1
  for (let i = 0; i < sys.vars.length; i++) n *= box.hi - box.lo + 1
  return n
}

/** The first state of the box (lexicographic) that satisfies inv and has a step out of inv, or null. */
export function consecution(sys: System, inv: Formula, box: Box): Cti | null {
  const values = sys.vars.map(() => box.lo)
  const total = boxSize(sys, box)
  for (let n = 0; n < total; n++) {
    const s: Record<string, number> = {}
    sys.vars.forEach((v, i) => {
      s[v] = values[i] as number
    })
    if (evaluate(inv, s)) {
      for (const step of stepsFrom(sys, s)) if (!evaluate(inv, step.to)) return { state: s, step }
    }
    for (let i = values.length - 1; i >= 0; i--) {
      if ((values[i] as number) < box.hi) {
        values[i] = (values[i] as number) + 1
        break
      }
      values[i] = box.lo
    }
  }
  return null
}

/** True when every state of the box that satisfies a also satisfies b. */
export function impliesInBox(sys: System, a: Formula, b: Formula, box: Box): boolean {
  const values = sys.vars.map(() => box.lo)
  const total = boxSize(sys, box)
  for (let n = 0; n < total; n++) {
    const s: Record<string, number> = {}
    sys.vars.forEach((v, i) => {
      s[v] = values[i] as number
    })
    if (evaluate(a, s) && !evaluate(b, s)) return false
    for (let i = values.length - 1; i >= 0; i--) {
      if ((values[i] as number) < box.hi) {
        values[i] = (values[i] as number) + 1
        break
      }
      values[i] = box.lo
    }
  }
  return true
}

/** "Debit(1)" or "Credit" */
export const showStep = (s: Step): string => (s.param === undefined ? s.command : `${s.command}(${s.param})`)
