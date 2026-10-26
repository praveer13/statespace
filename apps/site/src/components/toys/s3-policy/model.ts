// S3.L7's decision panel, small enough to compute in the page. Pure and dependency-free. Balances are bigints so that
// the lesson's 2^63 - 1 is exact.
//
// `exec` checks in the fixed order of S3.L3, and the first check that fails decides the outcome:
//   1 the command exists · 2 the arguments decode (a positive amount; under zero = noop a zero returns the unchanged
//   state here) · 3 every account exists · 4 a self-transfer is allowed or rejected · 5 the guard holds (under
//   guard = silent a failed guard returns the unchanged state) · 6 a hold's checks (no hold here) · 7 the postings run,
//   and under bounded a balance above maxBal is an overflow.

export interface Policy {
  readonly zero: 'reject' | 'noop'
  readonly self: 'allow' | 'reject'
  readonly guard: 'error' | 'silent'
  readonly overflow: 'unbounded' | 'bounded'
}

export const DEFAULT: Policy = { zero: 'reject', self: 'allow', guard: 'error', overflow: 'unbounded' }

/** PostgreSQL's bigint top, the lesson's 2^63 - 1. */
export const MAX_BAL = 2n ** 63n - 1n

export type State = Readonly<Record<string, bigint>>

export type Call =
  | { readonly cmd: 'Transfer'; readonly x: string; readonly y: string; readonly n: bigint }
  | { readonly cmd: 'Deposit'; readonly a: string; readonly n: bigint }

export interface Case {
  readonly id: string
  readonly call: Call
  readonly start: State
}

export const SMALL: State = { mint: -100n, a: 100n, b: 0n }
export const BIG: State = { mint: -MAX_BAL, a: MAX_BAL, b: 0n }

/** The cell's four calls, and the segment question's call on an unknown account with a zero amount. */
export const CASES: readonly Case[] = [
  { id: 'zero', call: { cmd: 'Transfer', x: 'a', y: 'b', n: 0n }, start: SMALL },
  { id: 'self', call: { cmd: 'Transfer', x: 'a', y: 'a', n: 15n }, start: SMALL },
  { id: 'short', call: { cmd: 'Transfer', x: 'a', y: 'b', n: 130n }, start: SMALL },
  { id: 'ghost', call: { cmd: 'Transfer', x: 'a', y: 'ghost', n: 0n }, start: SMALL },
  { id: 'top', call: { cmd: 'Deposit', a: 'a', n: 1n }, start: BIG },
]

export type Outcome =
  | { readonly kind: 'error'; readonly err: string; readonly step: number }
  | {
      readonly kind: 'commit'
      readonly state: State
      readonly changed: boolean
      readonly effects: readonly string[]
      readonly step: number
      /** Why the call committed where it did. */
      readonly how: 'noop-zero' | 'silent-guard' | 'postings'
    }

const balOf = (s: State, a: string): bigint => s[a] ?? 0n

function post(s: State, x: string, y: string, n: bigint): State {
  const s1 = { ...s, [x]: balOf(s, x) - n }
  return { ...s1, [y]: balOf(s1, y) + n }
}

export function exec(p: Policy, call: Call, s: State): Outcome {
  // 1: both commands exist. 2: the amount decodes.
  if (call.n <= 0n) {
    if (p.zero === 'noop' && call.n === 0n) return { kind: 'commit', state: s, changed: false, effects: [], step: 2, how: 'noop-zero' }
    return { kind: 'error', err: 'badArgument "amount"', step: 2 }
  }
  // 3: accounts.
  const accts = call.cmd === 'Transfer' ? [call.x, call.y] : [call.a]
  const missing = accts.find((a) => !(a in s))
  if (missing !== undefined) return { kind: 'error', err: `unknownAccount ${missing}`, step: 3 }
  let after: State
  let effects: string[]
  if (call.cmd === 'Transfer') {
    // 4: self-transfer.
    if (call.x === call.y && p.self === 'reject') return { kind: 'error', err: 'selfTransfer', step: 4 }
    // 5: the guard.
    if (balOf(s, call.x) < call.n) {
      if (p.guard === 'silent') return { kind: 'commit', state: s, changed: false, effects: [], step: 5, how: 'silent-guard' }
      return { kind: 'error', err: 'guardFailed "Transfer"', step: 5 }
    }
    after = post(s, call.x, call.y, call.n)
    effects = call.x === call.y ? [`notify ${call.x}`] : [`notify ${call.x}`, `notify ${call.y}`]
  } else {
    after = post(s, 'mint', call.a, call.n)
    effects = [`notify ${call.a}`]
  }
  // 7: the postings, and the bound.
  if (p.overflow === 'bounded') {
    const over = Object.keys(after).find((k) => balOf(after, k) > MAX_BAL)
    if (over !== undefined) return { kind: 'error', err: `overflow ${over}`, step: 7 }
  }
  const changed = Object.keys(after).some((k) => balOf(after, k) !== balOf(s, k))
  return { kind: 'commit', state: after, changed, effects, step: 7, how: 'postings' }
}

/** `Inv`: the total of all balances is 0, and every account but the mint is at or above zero. */
export function inv(s: State): boolean {
  let total = 0n
  for (const [k, v] of Object.entries(s)) {
    total += v
    if (k !== 'mint' && v < 0n) return false
  }
  return total === 0n
}

/** What the outcome tells a caller: refused, with a named error, or a success. A success that changed nothing looks
 *  like any other success; only the balances, read afterwards, tell them apart. */
export function seen(o: Outcome): string {
  return o.kind === 'error' ? `refused: ${o.err}` : 'success'
}

/** True when two outcomes differ in anything a caller could see. */
export function moved(a: Outcome, b: Outcome): boolean {
  if (a.kind !== b.kind) return true
  if (a.kind === 'error' && b.kind === 'error') return a.err !== b.err || a.step !== b.step
  if (a.kind === 'commit' && b.kind === 'commit') return a.changed !== b.changed || a.step !== b.step || a.effects.join() !== b.effects.join()
  return false
}

export const STEP_NAMES: Readonly<Record<number, string>> = {
  1: 'the command exists',
  2: 'the arguments decode',
  3: 'the accounts exist',
  4: 'self-transfer',
  5: 'the guard',
  6: 'the hold checks',
  7: 'the postings',
}

// ------------------------------------------------------------------ printing

/** A bigint as the lesson prints it near the top: 2^63 - 1 and its neighbours by name, others in full. */
export function showN(n: bigint): string {
  const neg = n < 0n
  const m = neg ? -n : n
  const d = m - MAX_BAL
  const body = d === 0n ? '2^63 − 1' : d > 0n && d < 10n ? (d === 1n ? '2^63' : `2^63 + ${d - 1n}`) : m.toString()
  return neg ? (d === 0n || (d > 0n && d < 10n) ? `−(${body})` : `−${body}`) : body
}

export const showCall = (c: Call): string =>
  c.cmd === 'Transfer' ? `Transfer(${c.x}, ${c.y}, ${c.n})` : `Deposit(${c.a}, ${c.n})`

export const showState = (s: State): string =>
  Object.entries(s)
    .map(([k, v]) => `${k} ${showN(v)}`)
    .join(' · ')

export const showPolicy = (p: Policy): string =>
  `zero = ${p.zero} · self = ${p.self} · guard = ${p.guard} · overflow = ${p.overflow === 'bounded' ? 'bounded maxBal' : 'unbounded'}`
