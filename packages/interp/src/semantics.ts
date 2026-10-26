// The Mini-Plinth reference semantics, ported from labs/LAB-3/reference/MiniPlinthRef (Typing.lean, Eval.lean)
// line for line: the same rule order in the type checker, the same outcome order in the evaluator, and the same
// lists in the same order in the state. GATE-interp compares it with every kernel-checked golden.

import type { Acct, Call, Cmd, Effect, Err, Expr, Hold, Outcome, Policy, Program, ResourceOp, State, Stmt, Ty, TypeErr, TypeOutcome, Val } from './ir.ts'
import { MAX_BAL } from './ir.ts'

// ------------------------------------------------------------------------------------------------ values

export const acctEq = (a: Acct, b: Acct): boolean => {
  if (a.tag !== b.tag) return false
  if (a.tag === 'user' && b.tag === 'user') return a.name === b.name
  if (a.tag === 'escrow' && b.tag === 'escrow') return a.hold === b.hold
  return true
}

export const valEq = (a: Val, b: Val): boolean => {
  if (a.tag !== b.tag) return false
  switch (a.tag) {
    case 'acct':
      return acctEq(a.acct, (b as typeof a).acct)
    case 'int':
      return BigInt(a.value) === BigInt((b as typeof a).value)
    case 'bool':
      return a.value === (b as typeof a).value
    case 'hold':
      return a.hold === (b as typeof a).hold
  }
}

export const exprEq = (a: Expr, b: Expr): boolean => {
  if (a.tag !== b.tag) return false
  switch (a.tag) {
    case 'lit':
      return BigInt(a.value) === BigInt((b as typeof a).value)
    case 'var':
      return a.name === (b as typeof a).name
    case 'balance':
    case 'frozen':
      return exprEq(a.e, (b as typeof a).e)
    case 'not':
      return exprEq(a.a, (b as typeof a).a)
    default: {
      const bb = b as typeof a
      return exprEq(a.a, bb.a) && exprEq(a.b, bb.b)
    }
  }
}

// ------------------------------------------------------------------------------------------------ the state

/** The state as the evaluator works on it: the same lists, with bigint balances. */
interface S {
  readonly bals: readonly (readonly [Acct, bigint])[]
  readonly holds: readonly (readonly [number, Acct, bigint, Hold['status']])[]
  readonly nextHold: number
  readonly frozen: readonly Acct[]
}

const toS = (s: State): S => ({
  bals: s.bals.map((b) => [b.acct, BigInt(b.bal)] as const),
  holds: s.holds.map((h) => [h.id, h.owner, BigInt(h.amount), h.status] as const),
  nextHold: s.nextHold,
  frozen: s.frozen,
})

const fromS = (s: S): State => ({
  bals: s.bals.map(([acct, v]) => ({ acct, bal: v.toString() })),
  holds: s.holds.map(([id, owner, amount, status]) => ({ id, owner, amount: amount.toString(), status })),
  nextHold: s.nextHold,
  frozen: s.frozen,
})

const lookupBal = (s: S, a: Acct): bigint | undefined => s.bals.find(([b]) => acctEq(b, a))?.[1]
const bal = (s: S, a: Acct): bigint => lookupBal(s, a) ?? 0n
const hasAcct = (s: S, a: Acct): boolean => lookupBal(s, a) !== undefined

/** Replace the value stored for `a`, or add `a` at the end when it is absent (`setIn`). */
const setBal = (s: S, a: Acct, v: bigint): S => {
  const i = s.bals.findIndex(([b]) => acctEq(b, a))
  const bals = i < 0 ? [...s.bals, [a, v] as const] : s.bals.map((p, j) => (j === i ? ([a, v] as const) : p))
  return { ...s, bals }
}

const holdOf = (s: S, h: number) => s.holds.find(([i]) => i === h)

const setHold = (s: S, h: number, owner: Acct, amount: bigint, status: Hold['status']): S => {
  const i = s.holds.findIndex(([j]) => j === h)
  const row = [h, owner, amount, status] as const
  const holds = i < 0 ? [...s.holds, row] : s.holds.map((p, j) => (j === i ? row : p))
  return { ...s, holds }
}

const isFrozen = (s: S, a: Acct): boolean => s.frozen.some((b) => acctEq(b, a))

const setFrozen = (s: S, a: Acct, on: boolean): S => ({
  ...s,
  frozen: on ? (isFrozen(s, a) ? s.frozen : [...s.frozen, a]) : s.frozen.filter((b) => !acctEq(b, a)),
})

// ------------------------------------------------------------------------------------------------ expressions

export type Env = readonly (readonly [string, Val])[]

const envGet = (env: Env, x: string): Val | undefined => env.find(([y]) => y === x)?.[1]

type V = { tag: 'acct'; acct: Acct } | { tag: 'int'; n: bigint } | { tag: 'bool'; b: boolean } | { tag: 'hold'; hold: number }

const vOf = (v: Val): V => {
  switch (v.tag) {
    case 'acct':
      return { tag: 'acct', acct: v.acct }
    case 'int':
      return { tag: 'int', n: BigInt(v.value) }
    case 'bool':
      return { tag: 'bool', b: v.value }
    case 'hold':
      return { tag: 'hold', hold: v.hold }
  }
}

const vEq = (a: V, b: V): boolean => {
  if (a.tag !== b.tag) return false
  switch (a.tag) {
    case 'acct':
      return acctEq(a.acct, (b as typeof a).acct)
    case 'int':
      return a.n === (b as typeof a).n
    case 'bool':
      return a.b === (b as typeof a).b
    case 'hold':
      return a.hold === (b as typeof a).hold
  }
}

/** Big-step evaluation of an expression; undefined where the reference's `evalExpr` gives `none`. */
export function evalExpr(env: Env, s: S, e: Expr): V | undefined {
  switch (e.tag) {
    case 'lit':
      return { tag: 'int', n: BigInt(e.value) }
    case 'var': {
      const v = envGet(env, e.name)
      return v === undefined ? undefined : vOf(v)
    }
    case 'balance': {
      const v = evalExpr(env, s, e.e)
      return v?.tag === 'acct' ? { tag: 'int', n: bal(s, v.acct) } : undefined
    }
    case 'frozen': {
      const v = evalExpr(env, s, e.e)
      return v?.tag === 'acct' ? { tag: 'bool', b: isFrozen(s, v.acct) } : undefined
    }
    case 'add':
    case 'sub':
    case 'ge': {
      const x = evalExpr(env, s, e.a)
      const y = evalExpr(env, s, e.b)
      if (x?.tag !== 'int' || y?.tag !== 'int') return undefined
      if (e.tag === 'add') return { tag: 'int', n: x.n + y.n }
      if (e.tag === 'sub') return { tag: 'int', n: x.n - y.n }
      return { tag: 'bool', b: y.n <= x.n }
    }
    case 'eq': {
      const x = evalExpr(env, s, e.a)
      const y = evalExpr(env, s, e.b)
      return x === undefined || y === undefined ? undefined : { tag: 'bool', b: vEq(x, y) }
    }
    case 'and': {
      const x = evalExpr(env, s, e.a)
      const y = evalExpr(env, s, e.b)
      return x?.tag === 'bool' && y?.tag === 'bool' ? { tag: 'bool', b: x.b && y.b } : undefined
    }
    case 'not': {
      const x = evalExpr(env, s, e.a)
      return x?.tag === 'bool' ? { tag: 'bool', b: !x.b } : undefined
    }
  }
}

const evalInt = (env: Env, s: S, e: Expr): bigint | undefined => {
  const v = evalExpr(env, s, e)
  return v?.tag === 'int' ? v.n : undefined
}
const evalAcct = (env: Env, s: S, e: Expr): Acct | undefined => {
  const v = evalExpr(env, s, e)
  return v?.tag === 'acct' ? v.acct : undefined
}
const evalHold = (env: Env, s: S, e: Expr): number | undefined => {
  const v = evalExpr(env, s, e)
  return v?.tag === 'hold' ? v.hold : undefined
}

// ------------------------------------------------------------------------------------------------ typing

/** `covers g x n`: some top-level conjunct of `g` is `balance(x) >= n`. */
export function covers(g: Expr, x: Expr, n: Expr): boolean {
  if (g.tag === 'ge' && g.a.tag === 'balance') return exprEq(g.a.e, x) && exprEq(g.b, n)
  if (g.tag === 'and') return covers(g.a, x, n) || covers(g.b, x, n)
  return false
}

type TyEnv = readonly Param[]
interface Param {
  readonly name: string
  readonly ty: Ty
}

class TypeError_ {
  readonly err: TypeErr
  constructor(err: TypeErr) {
    this.err = err
  }
}
const fail = (err: TypeErr): never => {
  throw new TypeError_(err)
}

const tyGet = (g: TyEnv, x: string): Ty | undefined => g.find((p) => p.name === x)?.ty
const numeric = (t: Ty): boolean => t === 'int' || t === 'amount'

export function inferTy(g: TyEnv, e: Expr): Ty {
  switch (e.tag) {
    case 'lit':
      return 'int'
    case 'var':
      return tyGet(g, e.name) ?? fail('unknownParam')
    case 'balance':
      return inferTy(g, e.e) === 'account' ? 'int' : fail('wrongType')
    case 'frozen':
      return inferTy(g, e.e) === 'account' ? 'bool' : fail('wrongType')
    case 'add':
    case 'sub': {
      const a = inferTy(g, e.a)
      const b = inferTy(g, e.b)
      return numeric(a) && numeric(b) ? 'int' : fail('wrongType')
    }
    case 'ge': {
      const a = inferTy(g, e.a)
      const b = inferTy(g, e.b)
      return numeric(a) && numeric(b) ? 'bool' : fail('wrongType')
    }
    case 'eq': {
      const a = inferTy(g, e.a)
      const b = inferTy(g, e.b)
      return a === b || (numeric(a) && numeric(b)) ? 'bool' : fail('wrongType')
    }
    case 'and': {
      const a = inferTy(g, e.a)
      const b = inferTy(g, e.b)
      return a === 'bool' && b === 'bool' ? 'bool' : fail('wrongType')
    }
    case 'not':
      return inferTy(g, e.a) === 'bool' ? 'bool' : fail('wrongType')
  }
}

const expect = (g: TyEnv, e: Expr, t: Ty): void => {
  if (inferTy(g, e) !== t) fail('wrongType')
}

const checkAmount = (g: TyEnv, e: Expr): void => {
  if (e.tag === 'var') {
    const t = tyGet(g, e.name)
    if (t === undefined) fail('unknownParam')
    if (t !== 'amount') fail('nonPositive')
    return
  }
  if (e.tag === 'lit') {
    if (BigInt(e.value) <= 0n) fail('nonPositive')
    return
  }
  fail('nonPositive')
}

const checkCover = (guard: Expr, x: Expr, n: Expr): void => {
  if (!covers(guard, x, n)) fail('unguardedDebit')
}

const checkOp = (g: TyEnv, guard: Expr, r: ResourceOp): void => {
  switch (r.tag) {
    case 'deposit':
      checkAmount(g, r.amount)
      expect(g, r.to, 'account')
      return
    case 'move':
      checkAmount(g, r.amount)
      expect(g, r.from, 'account')
      expect(g, r.to, 'account')
      checkCover(guard, r.from, r.amount)
      return
    case 'hold':
      checkAmount(g, r.amount)
      expect(g, r.on, 'account')
      checkCover(guard, r.on, r.amount)
      return
    case 'capture':
      expect(g, r.hold, 'hold')
      expect(g, r.to, 'account')
      return
    case 'release':
      expect(g, r.hold, 'hold')
      return
  }
}

const checkStmt = (g: TyEnv, guard: Expr, st: Stmt): void => {
  if (st.tag === 'op') return checkOp(g, guard, st.op)
  if (st.tag === 'set') {
    if (st.field === 'balance') fail('assignsResource')
    if (st.field !== 'frozen') fail('wrongType')
    expect(g, st.target, 'account')
    expect(g, st.value, 'bool')
    return
  }
  // `force move`, LAB-3.6's unsafe command: typed like a move with no cover.
  checkAmount(g, st.amount)
  expect(g, st.from, 'account')
  expect(g, st.to, 'account')
}

const distinct = (names: readonly string[]): boolean => names.every((n, i) => !names.slice(i + 1).includes(n))

/** The reference type checker: `HasType c` is `typecheck c = .ok ()`, and a rejection names its rule. */
export function typecheck(c: Cmd): TypeOutcome {
  try {
    if (!distinct(c.params.map((p) => p.name))) fail('dupParam')
    expect(c.params, c.guard, 'bool')
    checkStmt(c.params, c.guard, c.body)
    return { ok: true }
  } catch (e) {
    if (e instanceof TypeError_) return { error: e.err }
    throw e
  }
}

// ------------------------------------------------------------------------------------------------ evaluation

type Op =
  | { tag: 'deposit'; n: bigint; a: Acct }
  | { tag: 'move'; n: bigint; x: Acct; y: Acct }
  | { tag: 'hold'; n: bigint; x: Acct }
  | { tag: 'capture'; h: number; y: Acct }
  | { tag: 'release'; h: number }

/** Debit `x` by `n`, then credit `y` by `n`, reading the state the debit left. */
export const post = (s: S, x: Acct, y: Acct, n: bigint): S => {
  const s1 = setBal(s, x, bal(s, x) - n)
  return setBal(s1, y, bal(s1, y) + n)
}

const escrow = (h: number): Acct => ({ tag: 'escrow', hold: h })

type Res<T> = { ok: T } | { error: Err }

function applyOp(op: Op, s: S): Res<S> {
  switch (op.tag) {
    case 'deposit':
      return { ok: post(s, { tag: 'mint' }, op.a, op.n) }
    case 'move':
      return { ok: post(s, op.x, op.y, op.n) }
    case 'hold': {
      const s1 = post(s, op.x, escrow(s.nextHold), op.n)
      return { ok: { ...setHold(s1, s.nextHold, op.x, op.n, 'held'), nextHold: s.nextHold + 1 } }
    }
    case 'capture':
    case 'release': {
      const r = holdOf(s, op.h)
      if (r === undefined) return { error: { tag: 'unknownHold', hold: op.h } }
      const [, owner, amount, status] = r
      if (!(status === 'held' && amount <= bal(s, escrow(op.h)))) return { error: { tag: 'holdNotOpen', hold: op.h } }
      const to = op.tag === 'capture' ? op.y : owner
      return { ok: setHold(post(s, escrow(op.h), to, amount), op.h, owner, amount, op.tag === 'capture' ? 'captured' : 'released') }
    }
  }
}

const resolveAmount = (env: Env, s: S, e: Expr): bigint | undefined => {
  const k = evalInt(env, s, e)
  return k !== undefined && k > 0n ? k : undefined
}

function resolve(env: Env, s: S, r: ResourceOp): Op | undefined {
  switch (r.tag) {
    case 'deposit': {
      const n = resolveAmount(env, s, r.amount)
      const a = evalAcct(env, s, r.to)
      return n !== undefined && a !== undefined ? { tag: 'deposit', n, a } : undefined
    }
    case 'move': {
      const n = resolveAmount(env, s, r.amount)
      const x = evalAcct(env, s, r.from)
      const y = evalAcct(env, s, r.to)
      return n !== undefined && x !== undefined && y !== undefined ? { tag: 'move', n, x, y } : undefined
    }
    case 'hold': {
      const n = resolveAmount(env, s, r.amount)
      const x = evalAcct(env, s, r.on)
      return n !== undefined && x !== undefined ? { tag: 'hold', n, x } : undefined
    }
    case 'capture': {
      const h = evalHold(env, s, r.hold)
      const y = evalAcct(env, s, r.to)
      return h !== undefined && y !== undefined ? { tag: 'capture', h, y } : undefined
    }
    case 'release': {
      const h = evalHold(env, s, r.hold)
      return h !== undefined ? { tag: 'release', h } : undefined
    }
  }
}

const notifyIf = (a: Acct): Effect[] => (a.tag === 'user' ? [{ tag: 'notify', acct: a }] : [])

function opEffects(op: Op, s: S): Effect[] {
  switch (op.tag) {
    case 'deposit':
      return notifyIf(op.a)
    case 'move':
      return notifyIf(op.y)
    case 'hold':
      return []
    case 'capture':
      return notifyIf(op.y)
    case 'release': {
      const r = holdOf(s, op.h)
      return r === undefined ? [] : notifyIf(r[1])
    }
  }
}

const opOutput = (op: Op, s: S): number[] => (op.tag === 'hold' ? [s.nextHold] : [])

/** The accounts an operation posts to, credited first. */
function opTouched(op: Op, s: S): Acct[] {
  switch (op.tag) {
    case 'deposit':
      return [op.a, { tag: 'mint' }]
    case 'move':
      return [op.y, op.x]
    case 'hold':
      return [escrow(s.nextHold), op.x]
    case 'capture':
      return [op.y, escrow(op.h)]
    case 'release': {
      const r = holdOf(s, op.h)
      return r === undefined ? [escrow(op.h)] : [r[1], escrow(op.h)]
    }
  }
}

const firstOutOfRange = (s: S, accts: readonly Acct[], max: bigint): Acct | undefined =>
  accts.find((a) => bal(s, a) < -max || max < bal(s, a))

/** Step 2: decode the arguments. `null` is the zero no-op. */
function bindArgs(pol: Policy, params: readonly Param[], args: readonly Val[]): Res<Env | null> {
  const env: (readonly [string, Val])[] = []
  for (let i = 0; ; i++) {
    const p = params[i]
    const v = args[i]
    if (p === undefined && v === undefined) return { ok: env }
    if (p === undefined) return { error: { tag: 'badArgument', param: 'arity' } }
    if (v === undefined) return { error: { tag: 'badArgument', param: p.name } }
    const ok =
      (p.ty === 'account' && v.tag === 'acct') ||
      (p.ty === 'hold' && v.tag === 'hold') ||
      (p.ty === 'int' && v.tag === 'int') ||
      (p.ty === 'bool' && v.tag === 'bool')
    if (p.ty === 'amount' && v.tag === 'int') {
      const k = BigInt(v.value)
      if (k <= 0n) {
        if (k === 0n && pol.zero === 'noop') return { ok: null }
        return { error: { tag: 'badArgument', param: p.name } }
      }
    } else if (!ok) {
      return { error: { tag: 'badArgument', param: p.name } }
    }
    env.push([p.name, v])
  }
}

const firstMissing = (s: S, env: Env): Acct | undefined => {
  for (const [, v] of env) if (v.tag === 'acct' && !hasAcct(s, v.acct)) return v.acct
  return undefined
}

const isSelf = (env: Env, s: S, st: Stmt): boolean => {
  if (st.tag !== 'op' || st.op.tag !== 'move') return false
  const a = evalAcct(env, s, st.op.from)
  const b = evalAcct(env, s, st.op.to)
  return a !== undefined && b !== undefined && acctEq(a, b)
}

const ok = (s: S, output: number[], effects: Effect[]): Outcome => ({ ok: { state: fromS(s), output, effects } })

function runStmt(pol: Policy, env: Env, s: S, st: Stmt): Outcome {
  if (st.tag === 'set') {
    if (st.field !== 'frozen') return { error: { tag: 'typeError' } }
    const a = evalAcct(env, s, st.target)
    const v = evalExpr(env, s, st.value)
    return a !== undefined && v?.tag === 'bool' ? ok(setFrozen(s, a, v.b), [], []) : { error: { tag: 'typeError' } }
  }
  const r: ResourceOp = st.tag === 'op' ? st.op : { tag: 'move', amount: st.amount, from: st.from, to: st.to }
  const op = resolve(env, s, r)
  if (op === undefined) return { error: { tag: 'typeError' } }
  const done = applyOp(op, s)
  if ('error' in done) return done
  if (pol.overflow.mode === 'bounded') {
    const a = firstOutOfRange(done.ok, opTouched(op, s), BigInt(pol.overflow.maxBal ?? MAX_BAL))
    if (a !== undefined) return { error: { tag: 'overflow', acct: a } }
  }
  return ok(done.ok, opOutput(op, s), opEffects(op, s))
}

/** Which of the reference's eight outcome-order steps decided a call (curriculum/S03-semantics.md section 2.4). */
export type DecidedAt = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Traced {
  readonly outcome: Outcome
  readonly step: DecidedAt
}

/** The reference evaluator under a policy, with the step of the outcome order that decided the call. */
export function execTraced(pol: Policy, p: Program, c: Call, state: State): Traced {
  const s = toS(state)
  const cmd = p.commands.find((k) => k.name === c.name)
  if (cmd === undefined) return { outcome: { error: { tag: 'unknownCommand', name: c.name } }, step: 1 }
  const bound = bindArgs(pol, cmd.params, c.args)
  if ('error' in bound) return { outcome: bound, step: 2 }
  if (bound.ok === null) return { outcome: ok(s, [], []), step: 2 }
  const env = bound.ok
  const missing = firstMissing(s, env)
  if (missing !== undefined) return { outcome: { error: { tag: 'unknownAccount', acct: missing } }, step: 3 }
  if (pol.self === 'reject' && isSelf(env, s, cmd.body)) return { outcome: { error: { tag: 'selfTransfer' } }, step: 4 }
  const g = evalExpr(env, s, cmd.guard)
  if (g?.tag !== 'bool') return { outcome: { error: { tag: 'typeError' } }, step: 5 }
  if (!g.b) return { outcome: pol.guard === 'error' ? { error: { tag: 'guardFailed', name: cmd.name } } : ok(s, [], []), step: 5 }
  const outcome = runStmt(pol, env, s, cmd.body)
  const step: DecidedAt = 'ok' in outcome ? 8 : outcome.error.tag === 'overflow' ? 7 : 6
  return { outcome, step }
}

export const execWith = (pol: Policy, p: Program, c: Call, s: State): Outcome => execTraced(pol, p, c, s).outcome

// ------------------------------------------------------------------------------------------------ the invariant

/** `Inv s`: unique keys, a total of 0, and no account but the mint below zero. */
export function inv(state: State): { readonly wf: boolean; readonly total: bigint; readonly nonneg: boolean } {
  const s = toS(state)
  const keys = s.bals.map(([a]) => a)
  const wf = keys.every((a, i) => keys.findIndex((b) => acctEq(a, b)) === i)
  const total = s.bals.reduce((t, [, v]) => t + v, 0n)
  const nonneg = s.bals.every(([a, v]) => a.tag === 'mint' || v >= 0n)
  return { wf, total, nonneg }
}
