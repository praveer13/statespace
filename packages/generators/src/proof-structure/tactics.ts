// GEN-proof-structure's checker in the tab: the tactic model. A small, first-order model of a few Lean 4 tactics over
// the definitions an item shows: `induction … generalizing … with` and `cases … with` with their alternatives,
// `simp only [...]`, `rw [...]`, `exact`, `omega` and `rfl`. It runs a proof script line by line and reports the open
// goals after any line, or the first error, so a key (the goal after a tactic, whether an order of blocks elaborates,
// which hypothesis a step needs) is computed from the script and the definitions when the learner submits.
//
// ASSESSMENT.md section 4.14 keys this family by Goal Replay strips recorded on Lean 4.35.0 at build time. Those strips
// are not recorded for this family yet, so this build runs its own model instead [D] and every item says so: the goals
// printed are this model's, written in Lean's notation, not Lean's own output. The model is exact for the proofs of
// the family's corpus (corpus.ts), which use only the tactics above over equations between first-order terms.
//
// Pure: no DOM, storage or network.

// ---------------------------------------------------------------- terms

export type Term = { readonly k: 'v'; readonly n: string } | { readonly k: 'n'; readonly n: number } | { readonly k: 'c'; readonly f: string; readonly args: readonly Term[] }

export interface Eq {
  readonly l: Term
  readonly r: Term
}

export const tv = (n: string): Term => ({ k: 'v', n })
export const tn = (n: number): Term => ({ k: 'n', n })
export const tc = (f: string, ...args: Term[]): Term => ({ k: 'c', f, args })
export const nil = (): Term => tc('nil')
export const cons = (h: Term, t: Term): Term => tc('cons', h, t)
export const plus = (a: Term, b: Term): Term => tc('+', a, b)
export const minus = (a: Term, b: Term): Term => tc('-', a, b)

export function same(a: Term, b: Term): boolean {
  if (a.k !== b.k) return false
  if (a.k === 'v') return a.n === (b as typeof a).n
  if (a.k === 'n') return a.n === (b as typeof a).n
  const c = b as typeof a
  return a.f === c.f && a.args.length === c.args.length && a.args.every((x, i) => same(x, c.args[i] as Term))
}

export type Subst = Readonly<Record<string, Term>>

export function substitute(t: Term, s: Subst): Term {
  if (t.k === 'v') return s[t.n] ?? t
  if (t.k === 'n') return t
  return { k: 'c', f: t.f, args: t.args.map((a) => substitute(a, s)) }
}

const substEq = (e: Eq, s: Subst): Eq => ({ l: substitute(e.l, s), r: substitute(e.r, s) })

/** Matches a pattern against a term; pattern variables are those in `vars`. */
function match(p: Term, t: Term, vars: readonly string[], s: Record<string, Term>): boolean {
  if (p.k === 'v' && vars.includes(p.n)) {
    const bound = s[p.n]
    if (bound !== undefined) return same(bound, t)
    s[p.n] = t
    return true
  }
  if (p.k !== t.k) return false
  if (p.k === 'v' || p.k === 'n') return same(p, t)
  const c = t as Extract<Term, { k: 'c' }>
  if (p.f !== c.f || p.args.length !== c.args.length) return false
  return p.args.every((a, i) => match(a, c.args[i] as Term, vars, s))
}

/** The first subterm, outermost then left to right, that matches; with its substitution. */
function findInstance(t: Term, p: Term, vars: readonly string[]): Term | null {
  const s: Record<string, Term> = {}
  if (match(p, t, vars, s)) return substitute(p, s)
  if (t.k === 'c') {
    for (const a of t.args) {
      const found = findInstance(a, p, vars)
      if (found !== null) return found
    }
  }
  return null
}

/** Every occurrence of `from` replaced by `to`. */
function replaceAll(t: Term, from: Term, to: Term): Term {
  if (same(t, from)) return to
  if (t.k !== 'c') return t
  return { k: 'c', f: t.f, args: t.args.map((a) => replaceAll(a, from, to)) }
}

function occurs(t: Term, name: string): boolean {
  if (t.k === 'v') return t.n === name
  if (t.k === 'n') return false
  return t.args.some((a) => occurs(a, name))
}

// ---------------------------------------------------------------- rendering

/** Constructors printed with a leading dot, as Lean prints an inductive's constructor. */
const DOT_CTORS = new Set(['dep', 'wd'])

export function showTerm(t: Term, top = true): string {
  const paren = (s: string): string => (top ? s : `(${s})`)
  if (t.k === 'v') return t.n
  if (t.k === 'n') return t.n < 0 ? paren(`-${-t.n}`) : String(t.n)
  if (t.f === 'nil') return '[]'
  if (t.f === 'cons') return paren(`${showTerm(t.args[0] as Term, false)} :: ${showTerm(t.args[1] as Term, true)}`)
  if (t.f === 'mk') return `⟨${t.args.map((a) => showTerm(a, true)).join(', ')}⟩`
  if (t.f === '+' || t.f === '-') {
    const [a, b] = t.args as [Term, Term]
    // Application binds tighter than + and −, so only a sum on the right (or a list on either side) needs parentheses.
    const left = a.k === 'c' && a.f === 'cons' ? `(${showTerm(a, true)})` : showTerm(a, true)
    const right = b.k === 'c' && (b.f === '+' || b.f === '-' || b.f === 'cons') ? `(${showTerm(b, true)})` : showTerm(b, true)
    return paren(`${left} ${t.f} ${right}`)
  }
  const head = DOT_CTORS.has(t.f) ? `.${t.f}` : t.f
  if (t.args.length === 0) return head
  return paren(`${head} ${t.args.map((a) => showTerm(a, false)).join(' ')}`)
}

export const showEq = (e: Eq): string => `${showTerm(e.l)} = ${showTerm(e.r)}`

// ---------------------------------------------------------------- the theory an item shows

export interface Binder {
  readonly n: string
  readonly ty: string
}

/** A definition's equations, a lemma, or a theorem: an equation under binders. */
export interface Law {
  readonly name: string
  readonly binders: readonly Binder[]
  readonly eq: Eq
}

export interface Def {
  readonly name: string
  /** Each equation's pattern variables are its binders. */
  readonly eqs: readonly Law[]
}

/** An inductive type's constructors, with each argument's type (`self` for the type itself). */
export interface Ctor {
  readonly name: string
  readonly args: readonly string[]
}

export interface Theory {
  readonly defs: readonly Def[]
  readonly lemmas: readonly Law[]
  /** The theorem being proved: its name is not in scope inside its own proof. */
  readonly theorem: Law
  /** Inductive types by name: `List Int` and `Op`. */
  readonly types: Readonly<Record<string, readonly Ctor[]>>
}

// ---------------------------------------------------------------- scripts

export type Tac =
  | {
      readonly t: 'simp'
      readonly rules: readonly string[]
      /** Rewrite the left side only: never shown or offered, only used to build the "left side only" distractor. */
      readonly side?: 'l'
    }
  | { readonly t: 'rw'; readonly rules: readonly string[] }
  | { readonly t: 'exact'; readonly name: string; readonly args: readonly string[] }
  | { readonly t: 'omega' }
  | { readonly t: 'rfl' }

export type Line =
  | { readonly k: 'induction'; readonly x: string; readonly gen: readonly string[] }
  | { readonly k: 'cases'; readonly x: string }
  | { readonly k: 'case'; readonly ctor: string; readonly names: readonly string[]; readonly tacs: readonly Tac[] }
  | { readonly k: 'tacs'; readonly tacs: readonly Tac[] }

export type Script = readonly Line[]

export function showTac(t: Tac): string {
  switch (t.t) {
    case 'simp':
      return `simp only [${t.rules.join(', ')}]`
    case 'rw':
      return `rw [${t.rules.join(', ')}]`
    case 'exact':
      return `exact ${[t.name, ...t.args].join(' ')}`
    case 'omega':
      return 'omega'
    case 'rfl':
      return 'rfl'
  }
}

export function showLine(l: Line): string {
  switch (l.k) {
    case 'induction':
      return `induction ${l.x}${l.gen.length > 0 ? ` generalizing ${l.gen.join(' ')}` : ''} with`
    case 'cases':
      return `cases ${l.x} with`
    case 'case':
      return `| ${[l.ctor, ...l.names].join(' ')} =>${l.tacs.length > 0 ? ` ${l.tacs.map(showTac).join('; ')}` : ''}`
    case 'tacs':
      return l.tacs.map(showTac).join('; ')
  }
}

/** The script as Lean text, indented by its case structure. */
export function showScript(s: Script): string[] {
  const out: string[] = []
  let depth = 0
  let caseDepth: number[] = []
  for (const l of s) {
    if (l.k === 'case') {
      const d = caseDepth[caseDepth.length - 1] ?? 0
      out.push(`${'  '.repeat(d)}${showLine(l)}`)
      depth = d + 1
    } else {
      out.push(`${'  '.repeat(depth)}${showLine(l)}`)
      if (l.k === 'induction' || l.k === 'cases') caseDepth = [...caseDepth, depth]
    }
  }
  return out
}

/** Tactic steps in the script: each tactic, each induction or cases, and each alternative that opens a case. */
export function stepsOf(s: Script): number {
  return s.reduce((n, l) => n + (l.k === 'induction' || l.k === 'cases' ? 1 : l.k === 'case' ? l.tacs.length : l.tacs.length), 0)
}

export const splitsOf = (s: Script): number => s.filter((l) => l.k === 'induction' || l.k === 'cases').length

// ---------------------------------------------------------------- goals

export interface Hyp {
  readonly name: string
  readonly binders: readonly Binder[]
  readonly eq: Eq
}

/** A context entry: a variable with its type, or a hypothesis. */
export type Entry = { readonly kind: 'var'; readonly b: Binder } | { readonly kind: 'hyp'; readonly h: Hyp }

export interface Goal {
  readonly ctx: readonly Entry[]
  readonly target: Eq
}

/** A case an induction or cases opened, waiting for its alternative to name its variables. */
interface Pending {
  readonly pending: true
  readonly ctor: Ctor
  readonly from: Goal
  readonly x: Binder
  readonly gen: readonly string[]
  readonly induction: boolean
}

type Open = Goal | Pending

const isPending = (g: Open): g is Pending => (g as Pending).pending === true

export function showGoal(g: Goal): string {
  const parts: string[] = []
  // Consecutive variables of one type print together, as Lean prints them: `a b n : Int`.
  let run: { names: string[]; ty: string } | null = null
  const flush = (): void => {
    if (run !== null) parts.push(`${run.names.join(' ')} : ${run.ty}`)
    run = null
  }
  for (const e of g.ctx) {
    if (e.kind === 'var') {
      if (run !== null && (run as { ty: string }).ty === e.b.ty) (run as { names: string[] }).names.push(e.b.n)
      else {
        flush()
        run = { names: [e.b.n], ty: e.b.ty }
      }
    } else {
      flush()
      const bs = e.h.binders.map((b) => `(${b.n} : ${b.ty})`).join(' ')
      parts.push(`${e.h.name} : ${bs === '' ? '' : `∀ ${bs}, `}${showEq(e.h.eq)}`)
    }
  }
  flush()
  return [...parts, `⊢ ${showEq(g.target)}`].join('\n')
}

/** One goal on one line: its context, then ⊢ and the target. */
export function showGoalLine(g: Goal): string {
  const lines = showGoal(g).split('\n')
  const target = lines.pop() as string
  return lines.length === 0 ? target : `${lines.join(', ')} ${target}`
}

/** The open goals as one line each, the first one the focus; "no goals" when none is open. */
export function showGoals(goals: readonly Goal[]): string {
  return goals.length === 0 ? 'no goals' : goals.map(showGoalLine).join('   |   ')
}

// ---------------------------------------------------------------- running

export interface RunResult {
  /** True when every line ran and no goal is left. */
  readonly ok: boolean
  /** The line (1-based) of the first error, when there is one. */
  readonly line?: number
  readonly error?: string
  /** The open goals after the last line run (after line `upto` when it is given), with names for open cases. */
  readonly goals: readonly Goal[]
  /** Rewrites spent; past the budget the run stops and says so. */
  readonly rewrites: number
  readonly budget?: true
}

class TacticError extends Error {}
class BudgetError extends Error {}

/** The equations a rule name stands for: a definition's, a lemma, a hypothesis; the theorem itself is not in scope. */
function lawsOf(name: string, th: Theory, goal: Goal): Law[] {
  const def = th.defs.find((d) => d.name === name)
  if (def !== undefined) return [...def.eqs]
  const lemma = th.lemmas.find((l) => l.name === name)
  if (lemma !== undefined) return [lemma]
  for (let i = goal.ctx.length - 1; i >= 0; i--) {
    const e = goal.ctx[i] as Entry
    if (e.kind === 'hyp' && e.h.name === name) return [{ name, binders: e.h.binders, eq: e.h.eq }]
  }
  throw new TacticError(`unknown identifier '${name}'`)
}

/** Rewrites the first instance of a law's left side, every occurrence of that instance; null when none occurs. */
function rewriteWith(t: Term, law: Law): Term | null {
  const vars = law.binders.map((b) => b.n)
  const inst = findInstance(t, law.eq.l, vars)
  if (inst === null) return null
  const s: Record<string, Term> = {}
  match(law.eq.l, inst, vars, s)
  return replaceAll(t, inst, substitute(law.eq.r, s))
}

/** Linear form for omega: atoms by their printed form. */
function linear(t: Term, sign: number, acc: Map<string, number>): void {
  if (t.k === 'n') {
    acc.set('', (acc.get('') ?? 0) + sign * t.n)
    return
  }
  if (t.k === 'c' && (t.f === '+' || t.f === '-')) {
    linear(t.args[0] as Term, sign, acc)
    linear(t.args[1] as Term, t.f === '+' ? sign : -sign, acc)
    return
  }
  const key = showTerm(t)
  acc.set(key, (acc.get(key) ?? 0) + sign)
}

function omegaCloses(e: Eq): boolean {
  const acc = new Map<string, number>()
  linear(e.l, 1, acc)
  linear(e.r, -1, acc)
  for (const n of acc.values()) if (n !== 0) return false
  return true
}

/** Runs a script; with `upto`, stops after that many lines and reports the goals then. */
export function runScript(theory: Theory, script: Script, opts: { readonly upto?: number; readonly maxRewrites?: number } = {}): RunResult {
  const max = opts.maxRewrites ?? 2000
  let rewrites = 0
  const spend = (): void => {
    rewrites += 1
    if (rewrites > max) throw new BudgetError(`more than ${max} rewrites`)
  }
  const th = theory
  const start: Goal = { ctx: th.theorem.binders.map((b) => ({ kind: 'var', b })), target: th.theorem.eq }
  let open: Open[] = [start]
  const focus = (): Goal => {
    const g = open[0]
    if (g === undefined) throw new TacticError('no goals to be proved')
    if (isPending(g)) throw new TacticError(`the case '${g.ctor.name}' must be opened with its alternative \`| ${g.ctor.name} …\` first`)
    return g
  }
  const replaceFocus = (next: Goal | null): void => {
    open = next === null ? open.slice(1) : [next, ...open.slice(1)]
  }
  const normalize = (t: Term, laws: readonly Law[]): { t: Term; changed: boolean } => {
    let cur = t
    let changed = false
    for (let guard = 0; guard < 64; guard++) {
      let step: Term | null = null
      for (const law of laws) {
        step = rewriteWith(cur, law)
        if (step !== null) break
      }
      if (step === null) return { t: cur, changed }
      spend()
      cur = step
      changed = true
    }
    return { t: cur, changed }
  }
  const tactic = (tac: Tac): void => {
    const g = focus()
    switch (tac.t) {
      case 'simp': {
        const laws = tac.rules.flatMap((r) => lawsOf(r, th, g))
        const l = normalize(g.target.l, laws)
        const r = tac.side === 'l' ? { t: g.target.r, changed: false } : normalize(g.target.r, laws)
        if (!l.changed && !r.changed) throw new TacticError('simp made no progress')
        const target = { l: l.t, r: r.t }
        replaceFocus(same(target.l, target.r) ? null : { ...g, target })
        return
      }
      case 'rw': {
        let target = g.target
        for (const name of tac.rules) {
          const laws = lawsOf(name, th, g)
          let done = false
          for (const law of laws) {
            // rw rewrites the first instance it finds, reading the equation left to right, and then every
            // occurrence of that instance.
            const vars = law.binders.map((x) => x.n)
            const inst = findInstance(target.l, law.eq.l, vars) ?? findInstance(target.r, law.eq.l, vars)
            if (inst === null) continue
            const sub: Record<string, Term> = {}
            match(law.eq.l, inst, vars, sub)
            const to = substitute(law.eq.r, sub)
            target = { l: replaceAll(target.l, inst, to), r: replaceAll(target.r, inst, to) }
            done = true
            break
          }
          spend()
          if (!done) {
            const law = laws[0] as Law
            throw new TacticError(`rewrite failed: the pattern ${showTerm(law.eq.l)} does not occur in the goal ${showEq(target)}`)
          }
        }
        replaceFocus(same(target.l, target.r) ? null : { ...g, target })
        return
      }
      case 'exact': {
        const law = lawsOf(tac.name, th, g)[0] as Law
        if (tac.args.length !== law.binders.length) throw new TacticError(`'${tac.name}' takes ${law.binders.length} arguments, not ${tac.args.length}`)
        const s: Record<string, Term> = {}
        law.binders.forEach((b, i) => {
          s[b.n] = tv(tac.args[i] as string)
        })
        const e = substEq(law.eq, s)
        if (!(same(e.l, g.target.l) && same(e.r, g.target.r))) throw new TacticError(`type mismatch: ${tac.name} ${tac.args.join(' ')} proves ${showEq(e)}, but the goal is ${showEq(g.target)}`)
        replaceFocus(null)
        return
      }
      case 'omega':
        if (!omegaCloses(g.target)) throw new TacticError(`omega could not prove the goal ${showEq(g.target)}`)
        replaceFocus(null)
        return
      case 'rfl': {
        const laws = th.defs.flatMap((d) => d.eqs)
        const l = normalize(g.target.l, laws).t
        const r = normalize(g.target.r, laws).t
        if (!same(l, r)) throw new TacticError(`rfl failed: ${showTerm(l)} and ${showTerm(r)} differ`)
        replaceFocus(null)
        return
      }
    }
  }
  const split = (x: string, gen: readonly string[], induction: boolean): void => {
    const g = focus()
    const entry = g.ctx.find((e): e is Extract<Entry, { kind: 'var' }> => e.kind === 'var' && e.b.n === x)
    if (entry === undefined) throw new TacticError(`unknown identifier '${x}'`)
    const ctors = th.types[entry.b.ty]
    if (ctors === undefined) throw new TacticError(`${x} : ${entry.b.ty} is not an inductive type this model knows`)
    for (const y of gen) if (!g.ctx.some((e) => e.kind === 'var' && e.b.n === y)) throw new TacticError(`unknown identifier '${y}'`)
    open = [...ctors.map((ctor): Pending => ({ pending: true, ctor, from: g, x: entry.b, gen, induction })), ...open.slice(1)]
  }
  const openCase = (ctor: string, names: readonly string[]): void => {
    const first = open[0]
    if (first !== undefined && !isPending(first)) throw new TacticError(`unsolved goals before the alternative '${ctor}': ${showGoals([first])}`)
    const i = open.findIndex((g) => isPending(g) && g.ctor.name === ctor)
    if (i < 0) throw new TacticError(`invalid alternative name '${ctor}'`)
    const p = open[i] as Pending
    const want = p.ctor.args.length + (p.induction && p.ctor.args.includes('self') ? 1 : 0)
    if (names.length !== want) throw new TacticError(`the alternative '${ctor}' names ${want} variables, not ${names.length}`)
    open = [buildCase(p, names), ...open.filter((_, k) => k !== i)]
  }
  const lines = opts.upto === undefined ? script.length : Math.min(opts.upto, script.length)
  try {
    for (let n = 0; n < lines; n++) {
      const l = script[n] as Line
      try {
        if (l.k === 'induction') split(l.x, l.gen, true)
        else if (l.k === 'cases') split(l.x, [], false)
        else if (l.k === 'case') {
          openCase(l.ctor, l.names)
          for (const t of l.tacs) tactic(t)
        } else for (const t of l.tacs) tactic(t)
      } catch (e) {
        if (e instanceof TacticError) return { ok: false, line: n + 1, error: e.message, goals: open.filter((g): g is Goal => !isPending(g)), rewrites }
        throw e
      }
    }
  } catch (e) {
    if (e instanceof BudgetError) return { ok: false, error: e.message, goals: [], rewrites, budget: true }
    throw e
  }
  const goals = open.filter((g): g is Goal => !isPending(g))
  if (opts.upto !== undefined && opts.upto < script.length) return { ok: false, goals, rewrites }
  const left = open[0]
  if (left !== undefined) {
    if (isPending(left)) return { ok: false, line: script.length, error: `alternative '${left.ctor.name}' has not been provided`, goals, rewrites }
    return { ok: false, line: script.length, error: `unsolved goals: ${showGoals([left])}`, goals, rewrites }
  }
  return { ok: true, goals: [], rewrites }
}

/** The goal an alternative opens: the constructor applied to its named variables, and the hypothesis for induction. */
function buildCase(p: Pending, names: readonly string[]): Goal {
  const elem = p.x.ty.startsWith('List ') ? p.x.ty.slice('List '.length) : 'Int'
  const argTypes = p.ctor.args.map((a) => (a === 'self' ? p.x.ty : a === 'elem' ? elem : a))
  const vars: Binder[] = argTypes.map((ty, i) => ({ n: names[i] as string, ty }))
  const value = tc(p.ctor.name, ...vars.map((b) => tv(b.n)))
  const keep = p.from.ctx.filter((e) => !(e.kind === 'var' && (e.b.n === p.x.n || p.gen.includes(e.b.n))))
  const genBinders = p.gen.map((y) => {
    const e = p.from.ctx.find((x) => x.kind === 'var' && x.b.n === y) as Extract<Entry, { kind: 'var' }>
    return e.b
  })
  const ctx: Entry[] = [...keep, ...vars.map((b): Entry => ({ kind: 'var', b }))]
  if (p.induction) {
    const selfIx = p.ctor.args.indexOf('self')
    if (selfIx >= 0) {
      const tail = vars[selfIx] as Binder
      const ihName = names[names.length - 1] as string
      ctx.push({ kind: 'hyp', h: { name: ihName, binders: genBinders, eq: substEq(p.from.target, { [p.x.n]: tv(tail.n) }) } })
    }
  }
  for (const b of genBinders) ctx.push({ kind: 'var', b })
  return { ctx, target: substEq(p.from.target, { [p.x.n]: value }) }
}

/** Whether a name occurs in an equation (for the corpus's own checks). */
export const mentions = (e: Eq, name: string): boolean => occurs(e.l, name) || occurs(e.r, name)
