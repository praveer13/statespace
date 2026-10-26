// IR@1 (schemas/ir.schema.json): the JSON that `lake exe export-ir` writes and the goldens pool holds. Every sum
// type is an object with a `tag`; every integer that can be a balance or an amount is a decimal string, because a
// JSON number loses precision above 2^53 and the goldens reach ±(2^63 - 1).

export type Acct =
  | { readonly tag: 'mint' }
  | { readonly tag: 'sink' }
  | { readonly tag: 'user'; readonly name: string }
  | { readonly tag: 'escrow'; readonly hold: number }

export type Ty = 'account' | 'amount' | 'hold' | 'int' | 'bool'

export type Val =
  | { readonly tag: 'acct'; readonly acct: Acct }
  | { readonly tag: 'int'; readonly value: string }
  | { readonly tag: 'bool'; readonly value: boolean }
  | { readonly tag: 'hold'; readonly hold: number }

export type Expr =
  | { readonly tag: 'lit'; readonly value: string }
  | { readonly tag: 'var'; readonly name: string }
  | { readonly tag: 'balance' | 'frozen'; readonly e: Expr }
  | { readonly tag: 'add' | 'sub' | 'ge' | 'eq' | 'and'; readonly a: Expr; readonly b: Expr }
  | { readonly tag: 'not'; readonly a: Expr }

export type ResourceOp =
  | { readonly tag: 'deposit'; readonly amount: Expr; readonly to: Expr }
  | { readonly tag: 'move'; readonly amount: Expr; readonly from: Expr; readonly to: Expr }
  | { readonly tag: 'hold'; readonly amount: Expr; readonly on: Expr }
  | { readonly tag: 'capture'; readonly hold: Expr; readonly to: Expr }
  | { readonly tag: 'release'; readonly hold: Expr }

export type Stmt =
  | { readonly tag: 'op'; readonly op: ResourceOp }
  | { readonly tag: 'set'; readonly field: string; readonly target: Expr; readonly value: Expr }
  | { readonly tag: 'forceMove'; readonly amount: Expr; readonly from: Expr; readonly to: Expr }

export interface Param {
  readonly name: string
  readonly ty: Ty
}

export interface Cmd {
  readonly name: string
  readonly params: readonly Param[]
  readonly guard: Expr
  readonly body: Stmt
}

export interface Program {
  readonly id?: string
  readonly commands: readonly Cmd[]
}

export type HoldStatus = 'held' | 'captured' | 'released'

export interface Hold {
  readonly id: number
  readonly owner: Acct
  readonly amount: string
  readonly status: HoldStatus
}

export interface State {
  readonly bals: readonly { readonly acct: Acct; readonly bal: string }[]
  readonly holds: readonly Hold[]
  readonly nextHold: number
  readonly frozen: readonly Acct[]
}

export interface Call {
  readonly name: string
  readonly args: readonly Val[]
}

export interface Policy {
  readonly zero: 'reject' | 'noop'
  readonly self: 'allow' | 'reject'
  readonly guard: 'error' | 'silent'
  readonly overflow: { readonly mode: 'unbounded' } | { readonly mode: 'bounded'; readonly maxBal: string }
}

export type Err =
  | { readonly tag: 'unknownCommand' | 'guardFailed'; readonly name: string }
  | { readonly tag: 'badArgument'; readonly param: string }
  | { readonly tag: 'unknownAccount' | 'overflow'; readonly acct: Acct }
  | { readonly tag: 'unknownHold' | 'holdNotOpen'; readonly hold: number }
  | { readonly tag: 'selfTransfer' | 'typeError' | 'outOfFuel' }

export interface Effect {
  readonly tag: 'notify'
  readonly acct: Acct
}

export type Outcome =
  | { readonly ok: { readonly state: State; readonly output: readonly number[]; readonly effects: readonly Effect[] } }
  | { readonly error: Err }

export type TypeErr = 'dupParam' | 'unknownParam' | 'wrongType' | 'nonPositive' | 'unguardedDebit' | 'assignsResource'

export type TypeOutcome = { readonly ok: true } | { readonly error: TypeErr }

export const REFERENCE_POLICY: Policy = { zero: 'reject', self: 'allow', guard: 'error', overflow: { mode: 'unbounded' } }

export const MAX_BAL = 9223372036854775807n

/** Canonical JSON: keys sorted by code point, no white space. The form Lean's `Json.compress` writes. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
}
