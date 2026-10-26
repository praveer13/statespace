// GEN-defend's artifacts, as this page models them. The learner's own lab files live on their machine and are graded
// there by `statespace defend` on the Bench; this page cannot read them, so it seeds each mutation into a small
// artifact shaped like the lab's and builds and checks that one itself. Two shapes:
//
//   ledger  LAB-1's transfer check: declared sorts, assumptions, a guard, a step and five checks run in order
//           (premises-sat, no-overdraft, recipient-nonneg, conserves, exact-guard). Build fails on an undeclared
//           name or mixed sorts, as Z3 refuses them; each check is decided over a printed box (every value of
//           BitVec 4, which stands in for BitVec 64 because this page can try all of them).
//   spec    a two-worker withdrawal spec in the style of LAB-5: an atomic Withdraw or a split Read/Write, an
//           optional Retry, and two invariants (NonNegative, NoOverspend). Build fails on an undeclared variable,
//           as SANY does; the check explores every reachable state breadth-first, as TLC with one worker does.
//
// Pure: no DOM, storage or network.

export type Sort = 'int' | 'bv4' | 'nat'
export type Rel = '<' | '<=' | '>' | '>=' | '='

export type Expr = { readonly e: 'var'; readonly v: string } | { readonly e: 'num'; readonly n: number } | { readonly e: 'add' | 'sub'; readonly l: Expr; readonly r: Expr }

export interface Atom {
  readonly op: Rel
  readonly l: Expr
  readonly r: Expr
}

export type LedgerLocus = 'premises-sat' | 'no-overdraft' | 'recipient-nonneg' | 'conserves' | 'exact-guard'
export const LEDGER_LOCI: readonly LedgerLocus[] = ['premises-sat', 'no-overdraft', 'recipient-nonneg', 'conserves', 'exact-guard']

export interface Ledger {
  readonly kind: 'ledger'
  readonly decls: readonly { readonly v: string; readonly sort: Sort }[]
  readonly assume: readonly Atom[]
  readonly guard: readonly Atom[]
  /** a′ and b′, by their expressions. */
  readonly step: readonly { readonly v: string; readonly e: Expr }[]
  /** The three properties after the step, in check order. */
  readonly props: readonly { readonly name: 'no-overdraft' | 'recipient-nonneg' | 'conserves'; readonly atom: Atom }[]
  /** The requirement exact-guard compares the guard with: 0 < amount ∧ amount ≤ a. */
  readonly requirement: readonly Atom[]
}

export type SpecLocus = 'NonNegative' | 'NoOverspend'
export const SPEC_LOCI: readonly SpecLocus[] = ['NonNegative', 'NoOverspend']

export interface Spec {
  readonly kind: 'spec'
  /** Init and Amount, with Amount ≤ Init < 2 · Amount. */
  readonly init: number
  readonly amount: number
  /** Withdraw as one action, or as Read then Write. */
  readonly atomic: boolean
  /** A split Write tests the balance it re-reads (true) or the value it read earlier (false). */
  readonly recheck: boolean
  /** Withdraw tests the balance before it debits. */
  readonly guarded: boolean
  /** A Retry action that applies a finished withdrawal a second time (a duplicated reply). */
  readonly retry: boolean
  /** The split's `tmp` is declared in VARIABLES. */
  readonly declaresTmp: boolean
  /** NoOverspend reads spent ≤ Init + slack. */
  readonly slack: number
}

export type Artifact = Ledger | Spec

// ---------------------------------------------------------------- building blocks

export const v = (name: string): Expr => ({ e: 'var', v: name })
export const n = (k: number): Expr => ({ e: 'num', n: k })
export const add = (l: Expr, r: Expr): Expr => ({ e: 'add', l, r })
export const sub = (l: Expr, r: Expr): Expr => ({ e: 'sub', l, r })
export const atom = (l: Expr, op: Rel, r: Expr): Atom => ({ op, l, r })

const prime = (name: string): string => `${name}′`

/** LAB-1's transfer check, as this page models it. */
export function baseLedger(): Ledger {
  return {
    kind: 'ledger',
    decls: [
      { v: 'a', sort: 'int' },
      { v: 'b', sort: 'int' },
      { v: 'amount', sort: 'int' },
    ],
    assume: [atom(v('a'), '>=', n(0)), atom(v('b'), '>=', n(0))],
    guard: [atom(n(0), '<', v('amount')), atom(v('amount'), '<=', v('a'))],
    step: [
      { v: prime('a'), e: sub(v('a'), v('amount')) },
      { v: prime('b'), e: add(v('b'), v('amount')) },
    ],
    props: [
      { name: 'no-overdraft', atom: atom(v(prime('a')), '>=', n(0)) },
      { name: 'recipient-nonneg', atom: atom(v(prime('b')), '>=', n(0)) },
      { name: 'conserves', atom: atom(add(v(prime('a')), v(prime('b'))), '=', add(v('a'), v('b'))) },
    ],
    requirement: [atom(n(0), '<', v('amount')), atom(v('amount'), '<=', v('a'))],
  }
}

export function baseSpec(init: number, amount: number): Spec {
  return { kind: 'spec', init, amount, atomic: true, recheck: false, guarded: true, retry: false, declaresTmp: true, slack: 0 }
}

// ---------------------------------------------------------------- rendering

const SYMBOL: Readonly<Record<Rel, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=' }
const SORT_NAME: Readonly<Record<Sort, string>> = { int: 'Int', bv4: 'BitVec 4', nat: 'Nat' }
export const sortName = (s: Sort): string => SORT_NAME[s]

export function renderExpr(e: Expr): string {
  switch (e.e) {
    case 'var':
      return e.v
    case 'num':
      return e.n < 0 ? `−${Math.abs(e.n)}` : `${e.n}`
    case 'add':
      return `${renderExpr(e.l)} + ${renderExpr(e.r)}`
    case 'sub':
      return `${renderExpr(e.l)} − ${e.r.e === 'var' || e.r.e === 'num' ? renderExpr(e.r) : `(${renderExpr(e.r)})`}`
  }
}

export const renderAtom = (a: Atom): string => `${renderExpr(a.l)} ${SYMBOL[a.op]} ${renderExpr(a.r)}`

export function renderLedger(l: Ledger): string {
  const bySort = new Map<Sort, string[]>()
  for (const d of l.decls) bySort.set(d.sort, [...(bySort.get(d.sort) ?? []), d.v])
  const decls = [...bySort.entries()].map(([s, vs]) => `declare  ${vs.join(', ')} : ${SORT_NAME[s]}`)
  const prop = (name: string): string => {
    const p = l.props.find((x) => x.name === name)
    return p === undefined ? '(missing)' : renderAtom(p.atom)
  }
  return [
    ...decls,
    `assume   ${l.assume.map(renderAtom).join(', ') || '(none)'}`,
    `guard    ${l.guard.map(renderAtom).join(', ') || '(none)'}`,
    `step     ${l.step.map((s) => `${s.v} = ${renderExpr(s.e)}`).join(', ')}`,
    'checks, in order:',
    '  premises-sat      assume ∧ guard is sat',
    `  no-overdraft      ${prop('no-overdraft')} after every guarded step`,
    `  recipient-nonneg  ${prop('recipient-nonneg')} after every guarded step`,
    `  conserves         ${prop('conserves')} after every guarded step`,
    `  exact-guard       guard ⇔ ${l.requirement.map(renderAtom).join(' ∧ ')}`,
  ].join('\n')
}

export function renderSpec(s: Spec): string {
  const vars = s.atomic ? 'bal, spent, pc' : s.declaresTmp ? 'bal, spent, pc, tmp' : 'bal, spent, pc'
  const debit = (from: string): string => `bal′ = ${from} − Amount ∧ spent′ = spent + Amount`
  const lines = [`CONSTANTS Init = ${s.init}, Amount = ${s.amount}, Workers = {w1, w2}`, `VARIABLES ${s.retry ? `${vars}, paid, retried` : vars}`]
  if (s.atomic) {
    lines.push(s.guarded ? `Withdraw(w) == pc[w] = "idle" ∧ (IF bal ≥ Amount THEN ${debit('bal')} ELSE UNCHANGED ⟨bal, spent⟩) ∧ pc′[w] = "done"` : `Withdraw(w) == pc[w] = "idle" ∧ ${debit('bal')} ∧ pc′[w] = "done"`)
  } else {
    lines.push('Read(w)  == pc[w] = "idle" ∧ tmp′[w] = bal ∧ pc′[w] = "read"')
    const test = s.recheck ? 'bal' : 'tmp[w]'
    lines.push(
      s.guarded
        ? `Write(w) == pc[w] = "read" ∧ (IF ${test} ≥ Amount THEN ${debit(test)} ELSE UNCHANGED ⟨bal, spent⟩) ∧ pc′[w] = "done"`
        : `Write(w) == pc[w] = "read" ∧ ${debit(test)} ∧ pc′[w] = "done"`,
    )
  }
  if (s.retry) lines.push(`Retry(w)  == pc[w] = "done" ∧ paid[w] ∧ ¬retried[w] ∧ ${debit('bal')} ∧ retried′[w] = TRUE`)
  lines.push('Invariants, in order:')
  lines.push('  NonNegative == bal ≥ 0')
  lines.push(`  NoOverspend == spent ≤ ${s.slack === 0 ? 'Init' : `Init + ${s.slack}`}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------- build

/** Why an artifact does not build, or null when it builds. */
export function buildError(a: Artifact): string | null {
  return a.kind === 'ledger' ? ledgerBuildError(a) : !a.atomic && !a.declaresTmp ? '`tmp` is not declared in VARIABLES: Unknown operator tmp' : null
}

function ledgerBuildError(l: Ledger): string | null {
  const sorts = new Map<string, Sort>(l.decls.map((d) => [d.v, d.sort]))
  for (const s of l.step) {
    const base = s.v.replace(/′$/, '')
    const sort = sorts.get(base)
    if (sort !== undefined) sorts.set(s.v, sort)
  }
  const sortOf = (e: Expr, where: string): Sort | null | string => {
    if (e.e === 'num') return null
    if (e.e === 'var') {
      const s = sorts.get(e.v)
      return s === undefined ? `\`${e.v}\` is not declared (in ${where})` : s
    }
    const ls = sortOf(e.l, where)
    if (typeof ls === 'string' && !(ls in SORT_NAME)) return ls
    const rs = sortOf(e.r, where)
    if (typeof rs === 'string' && !(rs in SORT_NAME)) return rs
    if (ls !== null && rs !== null && ls !== rs) return `sort mismatch in \`${renderExpr(e)}\`: ${SORT_NAME[ls as Sort]} and ${SORT_NAME[rs as Sort]}`
    return ls ?? rs
  }
  const checkAtom = (x: Atom, where: string): string | null => {
    const ls = sortOf(x.l, where)
    if (typeof ls === 'string' && !(ls in SORT_NAME)) return ls
    const rs = sortOf(x.r, where)
    if (typeof rs === 'string' && !(rs in SORT_NAME)) return rs
    if (ls !== null && rs !== null && ls !== rs) return `sort mismatch in \`${renderAtom(x)}\`: ${SORT_NAME[ls as Sort]} and ${SORT_NAME[rs as Sort]}`
    return null
  }
  for (const s of l.step) {
    const e = sortOf(s.e, 'step')
    if (typeof e === 'string' && !(e in SORT_NAME)) return e
  }
  for (const [where, atoms] of [
    ['assume', l.assume],
    ['guard', l.guard],
    ['requirement', l.requirement],
  ] as const) {
    for (const x of atoms) {
      const e = checkAtom(x, where)
      if (e !== null) return e
    }
  }
  for (const p of l.props) {
    const e = checkAtom(p.atom, p.name)
    if (e !== null) return e
  }
  return null
}

// ---------------------------------------------------------------- the ledger check

/** A value in its sort: BitVec 4 wraps to −8..7 (signed), Nat subtraction stops at 0. */
function wrap(sort: Sort, x: number): number {
  if (sort === 'bv4') return ((((x + 8) % 16) + 16) % 16) - 8
  return x
}

type Env = Readonly<Record<string, number>>

function evalExpr(e: Expr, env: Env, sort: Sort): number {
  switch (e.e) {
    case 'num':
      return wrap(sort, e.n)
    case 'var': {
      const x = env[e.v]
      if (x === undefined) throw new Error(`no value for ${e.v}`)
      return x
    }
    case 'add':
      return wrap(sort, evalExpr(e.l, env, sort) + evalExpr(e.r, env, sort))
    case 'sub': {
      const d = evalExpr(e.l, env, sort) - evalExpr(e.r, env, sort)
      return sort === 'nat' ? Math.max(0, d) : wrap(sort, d)
    }
  }
}

function sortOfExpr(e: Expr, sorts: ReadonlyMap<string, Sort>): Sort | null {
  if (e.e === 'num') return null
  if (e.e === 'var') return sorts.get(e.v) ?? null
  return sortOfExpr(e.l, sorts) ?? sortOfExpr(e.r, sorts)
}

function holds(x: Atom, env: Env, sorts: ReadonlyMap<string, Sort>): boolean {
  const sort = sortOfExpr(x.l, sorts) ?? sortOfExpr(x.r, sorts) ?? 'int'
  const l = evalExpr(x.l, env, sort)
  const r = evalExpr(x.r, env, sort)
  switch (x.op) {
    case '<':
      return l < r
    case '<=':
      return l <= r
    case '>':
      return l > r
    case '>=':
      return l >= r
    case '=':
      return l === r
  }
}

/** The values the box tries for a sort. */
export const SORT_RANGE: Readonly<Record<Sort, readonly [number, number]>> = { int: [-3, 4], bv4: [-8, 7], nat: [0, 7] }

export function ledgerBound(l: Ledger): string {
  const parts = l.decls.map((d) => {
    const [lo, hi] = SORT_RANGE[d.sort]
    return `${d.v} from ${lo < 0 ? `−${Math.abs(lo)}` : lo} to ${hi} (${SORT_NAME[d.sort]}${d.sort === 'bv4' ? ', every value' : ''})`
  })
  return `every state with ${parts.join(', ')}`
}

/** The outcome of `statespace check` on a model artifact. */
export type CheckOutcome =
  | { readonly verdict: 'no-build'; readonly error: string }
  | { readonly verdict: 'passes' }
  | { readonly verdict: 'rejects'; readonly locus: LedgerLocus | SpecLocus; readonly witness: Readonly<Record<string, number | string>> }

function* ledgerStates(l: Ledger): Generator<Record<string, number>> {
  const ranges = l.decls.map((d) => SORT_RANGE[d.sort])
  const values = ranges.map((r) => r[0])
  let total = 1
  for (const [lo, hi] of ranges) total *= hi - lo + 1
  for (let i = 0; i < total; i++) {
    const s: Record<string, number> = {}
    l.decls.forEach((d, j) => {
      s[d.v] = values[j] as number
    })
    yield s
    for (let j = values.length - 1; j >= 0; j--) {
      const [lo, hi] = ranges[j] as readonly [number, number]
      if ((values[j] as number) < hi) {
        values[j] = (values[j] as number) + 1
        break
      }
      values[j] = lo
    }
  }
}

export function checkLedger(l: Ledger): CheckOutcome {
  const error = ledgerBuildError(l)
  if (error !== null) return { verdict: 'no-build', error }
  const sorts = new Map<string, Sort>(l.decls.map((d) => [d.v, d.sort]))
  for (const s of l.step) sorts.set(s.v, sorts.get(s.v.replace(/′$/, '')) ?? 'int')
  const withStep = (s: Record<string, number>): Record<string, number> => {
    const env: Record<string, number> = { ...s }
    for (const st of l.step) env[st.v] = evalExpr(st.e, s, sorts.get(st.v) ?? 'int')
    return env
  }
  const all = (atoms: readonly Atom[], env: Env): boolean => atoms.every((x) => holds(x, env, sorts))
  // premises-sat: some state satisfies the assumptions and the guard together.
  let premise = false
  for (const s of ledgerStates(l)) {
    if (all(l.assume, s) && all(l.guard, s)) {
      premise = true
      break
    }
  }
  if (!premise) return { verdict: 'rejects', locus: 'premises-sat', witness: { premises: 'unsat: no state of the box satisfies the assumptions and the guard together' } }
  for (const p of l.props) {
    for (const s of ledgerStates(l)) {
      if (!all(l.assume, s) || !all(l.guard, s)) continue
      const env = withStep(s)
      if (!holds(p.atom, env, sorts)) return { verdict: 'rejects', locus: p.name, witness: { ...s, ...Object.fromEntries(l.step.map((st) => [st.v.replace(/′$/, "'"), env[st.v] as number])) } }
    }
  }
  for (const s of ledgerStates(l)) {
    if (!all(l.assume, s)) continue
    if (all(l.guard, s) !== all(l.requirement, s)) return { verdict: 'rejects', locus: 'exact-guard', witness: { ...s, guard: all(l.guard, s) ? 'admits' : 'refuses', requirement: all(l.requirement, s) ? 'admits' : 'refuses' } }
  }
  return { verdict: 'passes' }
}

// ---------------------------------------------------------------- the spec check

interface SpecState {
  readonly bal: number
  readonly spent: number
  readonly pc: readonly ('idle' | 'read' | 'done')[]
  readonly tmp: readonly number[]
  readonly paid: readonly boolean[]
  readonly retried: readonly boolean[]
}

const keyOf = (s: SpecState): string => JSON.stringify(s)

function nextStates(spec: Spec, s: SpecState): { action: string; to: SpecState }[] {
  const out: { action: string; to: SpecState }[] = []
  const set = <T>(xs: readonly T[], i: number, x: T): T[] => xs.map((y, j) => (j === i ? x : y))
  for (let w = 0; w < 2; w++) {
    const name = `w${w + 1}`
    if (spec.atomic && s.pc[w] === 'idle') {
      const pay = !spec.guarded || s.bal >= spec.amount
      out.push({
        action: `Withdraw(${name})`,
        to: { ...s, bal: pay ? s.bal - spec.amount : s.bal, spent: pay ? s.spent + spec.amount : s.spent, pc: set(s.pc, w, 'done'), paid: set(s.paid, w, pay) },
      })
    }
    if (!spec.atomic && s.pc[w] === 'idle') out.push({ action: `Read(${name})`, to: { ...s, tmp: set(s.tmp, w, s.bal), pc: set(s.pc, w, 'read') } })
    if (!spec.atomic && s.pc[w] === 'read') {
      const from = spec.recheck ? s.bal : (s.tmp[w] as number)
      const pay = !spec.guarded || from >= spec.amount
      out.push({
        action: `Write(${name})`,
        to: { ...s, bal: pay ? from - spec.amount : s.bal, spent: pay ? s.spent + spec.amount : s.spent, pc: set(s.pc, w, 'done'), paid: set(s.paid, w, pay) },
      })
    }
    if (spec.retry && s.pc[w] === 'done' && s.paid[w] === true && s.retried[w] === false) {
      out.push({ action: `Retry(${name})`, to: { ...s, bal: s.bal - spec.amount, spent: s.spent + spec.amount, retried: set(s.retried, w, true) } })
    }
  }
  return out
}

function violated(spec: Spec, s: SpecState): SpecLocus | null {
  if (s.bal < 0) return 'NonNegative'
  if (s.spent > spec.init + spec.slack) return 'NoOverspend'
  return null
}

export function specBound(spec: Spec): string {
  return `every state reachable from Init with Init = ${spec.init}, Amount = ${spec.amount} and two workers, explored breadth-first to the end`
}

export function checkSpec(spec: Spec): CheckOutcome {
  const error = buildError(spec)
  if (error !== null) return { verdict: 'no-build', error }
  const init: SpecState = { bal: spec.init, spent: 0, pc: ['idle', 'idle'], tmp: [0, 0], paid: [false, false], retried: [false, false] }
  const seen = new Map<string, { from: string | null; action: string | null }>([[keyOf(init), { from: null, action: null }]])
  let frontier: SpecState[] = [init]
  while (frontier.length > 0) {
    const next: SpecState[] = []
    for (const s of frontier) {
      for (const { action, to } of nextStates(spec, s)) {
        const k = keyOf(to)
        if (seen.has(k)) continue
        seen.set(k, { from: keyOf(s), action })
        const bad = violated(spec, to)
        if (bad !== null) {
          const trace: string[] = []
          let at: string | null = k
          while (at !== null) {
            const node = seen.get(at)
            if (node === undefined || node.action === null) break
            trace.unshift(node.action)
            at = node.from
          }
          return { verdict: 'rejects', locus: bad, witness: { bal: to.bal, spent: to.spent, run: trace.join(' → ') } }
        }
        next.push(to)
      }
    }
    frontier = next
  }
  return { verdict: 'passes' }
}

export function check(a: Artifact): CheckOutcome {
  return a.kind === 'ledger' ? checkLedger(a) : checkSpec(a)
}
