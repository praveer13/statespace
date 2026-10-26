// The transfer of S1.L5, "The encoding is the claim", run in three encodings: mathematical integers (`Int`), signed
// 8-bit integers (the lesson's exit item) and signed 64-bit integers (`BitVec(64)` read with signed operators). Pure and
// small: the page evaluates one pick in BigInt, and searches the whole 8-bit space the premises allow in plain numbers.
//
//   premises  A >= 0, B >= 0, and (when kept) X > 0
//   guard     X <= A                       (signed, as in the lesson's cells)
//   sender    A - X, recipient B + X       (each wraps at 2^n in a bit-vector encoding)

export type Encoding = 'int' | 'bv8' | 'bv64'

export const ENCODINGS: readonly Encoding[] = ['int', 'bv8', 'bv64']

/** The width in bits, or null for `Int`. */
export const widthOf = (e: Encoding): 8 | 64 | null => (e === 'bv8' ? 8 : e === 'bv64' ? 64 : null)

/** The signed range of a width: from -2^(n-1) to 2^(n-1) - 1. */
export function rangeOf(e: Encoding): { readonly min: bigint; readonly max: bigint } | null {
  const n = widthOf(e)
  if (n === null) return null
  const half = 1n << BigInt(n - 1)
  return { min: -half, max: half - 1n }
}

/** The bits of a value at width n, as an unsigned number from 0 to 2^n - 1. */
export function unsignedOf(v: bigint, n: number): bigint {
  const m = 1n << BigInt(n)
  return ((v % m) + m) % m
}

/** The signed reading of the low n bits of a value. */
export function signedOf(v: bigint, n: number): bigint {
  const u = unsignedOf(v, n)
  return u >= 1n << BigInt(n - 1) ? u - (1n << BigInt(n)) : u
}

/** The value an operation leaves in the encoding: itself over `Int`, its signed reading at a width. */
export function stored(e: Encoding, v: bigint): bigint {
  const n = widthOf(e)
  return n === null ? v : signedOf(v, n)
}

/** The bits, grouped: binary in fours at 8 bits, hexadecimal in fours at 64 bits. */
export function bitsOf(v: bigint, n: number): string {
  const u = unsignedOf(v, n)
  const s = n <= 16 ? u.toString(2).padStart(n, '0') : u.toString(16).toUpperCase().padStart(n / 4, '0')
  return s.replace(/(.{4})(?=.)/g, '$1 ')
}

export interface Pick {
  /** The sender's balance. */
  readonly a: bigint
  /** The recipient's balance. */
  readonly b: bigint
  /** The amount. */
  readonly x: bigint
}

export interface Line {
  readonly before: bigint
  /** The result in exact arithmetic. */
  readonly exact: bigint
  /** The result the encoding stores. */
  readonly after: bigint
  /** True when the stored result differs from the exact one. */
  readonly wrapped: boolean
}

export type Outcome =
  /** A premise fails, so this pick is not an input the claim is about. */
  | { readonly kind: 'premise'; readonly which: 'a' | 'b' | 'x' }
  /** The guard rejects: X > A. */
  | { readonly kind: 'rejected' }
  /** Through, and both balances end at zero or above. */
  | { readonly kind: 'fine' }
  /** Through, and somebody ends below zero: a witness. */
  | { readonly kind: 'witness'; readonly who: 'sender' | 'recipient' | 'both' }

export interface Run {
  readonly outcome: Outcome
  readonly sender: Line
  readonly recipient: Line
  /** The total before and after, as the encoding stores each. */
  readonly totalBefore: bigint
  readonly totalAfter: bigint
  readonly conserved: boolean
}

function line(e: Encoding, before: bigint, exact: bigint): Line {
  const after = stored(e, exact)
  return { before, exact, after, wrapped: after !== exact }
}

/** Run the transfer on one pick. The pick's values must fit the encoding (see `fits`). */
export function run(e: Encoding, positive: boolean, p: Pick): Run {
  const sender = line(e, p.a, p.a - p.x)
  const recipient = line(e, p.b, p.b + p.x)
  const totalBefore = stored(e, p.a + p.b)
  const totalAfter = stored(e, sender.after + recipient.after)
  const conserved = totalBefore === totalAfter
  let outcome: Outcome
  if (p.a < 0n) outcome = { kind: 'premise', which: 'a' }
  else if (p.b < 0n) outcome = { kind: 'premise', which: 'b' }
  else if (positive && p.x <= 0n) outcome = { kind: 'premise', which: 'x' }
  else if (p.x > p.a) outcome = { kind: 'rejected' }
  else {
    const s = sender.after < 0n
    const r = recipient.after < 0n
    outcome = s && r ? { kind: 'witness', who: 'both' } : s ? { kind: 'witness', who: 'sender' } : r ? { kind: 'witness', who: 'recipient' } : { kind: 'fine' }
  }
  return { outcome, sender, recipient, totalBefore, totalAfter, conserved }
}

/** Whether a value fits the encoding. */
export function fits(e: Encoding, v: bigint): boolean {
  const r = rangeOf(e)
  return r === null || (v >= r.min && v <= r.max)
}

/** Parse a whole number as typed: an optional minus sign and up to 30 digits. */
export function parseWhole(text: string): bigint | null {
  const t = text.trim().replace(/^−/, '-')
  if (!/^-?\d{1,30}$/.test(t)) return null
  return BigInt(t)
}

// ------------------------------------------------------------------ the 8-bit search

export interface Search {
  /** How many picks the premises allow (A and B from 0 to 127, X over its allowed range). */
  readonly picks: number
  /** How many of those the guard lets through. */
  readonly through: number
  readonly sender: number
  readonly recipient: number
  readonly both: number
  /** One witness of each kind, if any: the smallest |X| (0, then positive before negative), then the smallest A, then the largest B. */
  readonly example: { readonly sender: Pick | null; readonly recipient: Pick | null; readonly both: Pick | null }
}

const wrap8 = (v: number): number => ((((v + 128) % 256) + 256) % 256) - 128

/**
 * Every pick over A, B from 0 to 127 and X from -128 (or 1) to 127, run in signed 8-bit or, over the same box, in `Int`.
 * At 8 bits that box is the whole space the premises allow; over `Int` it is only a sample.
 */
export function search(e: 'int' | 'bv8', positive: boolean): Search {
  const xs: number[] = positive ? [] : [0]
  for (let k = 1; k <= 128; k++) {
    if (k <= 127) xs.push(k)
    if (!positive) xs.push(-k)
  }
  const wr = e === 'bv8' ? wrap8 : (v: number): number => v
  let picks = 0
  let through = 0
  let sender = 0
  let recipient = 0
  let both = 0
  const ex: { sender: Pick | null; recipient: Pick | null; both: Pick | null } = { sender: null, recipient: null, both: null }
  for (const x of xs) {
    for (let a = 0; a <= 127; a++) {
      for (let b = 127; b >= 0; b--) {
        picks++
        if (x > a) continue
        through++
        const s = wr(a - x) < 0
        const r = wr(b + x) < 0
        if (!s && !r) continue
        const who = s && r ? 'both' : s ? 'sender' : 'recipient'
        if (who === 'both') both++
        else if (who === 'sender') sender++
        else recipient++
        if (ex[who] === null) ex[who] = { a: BigInt(a), b: BigInt(b), x: BigInt(x) }
      }
    }
  }
  return { picks, through, sender, recipient, both, example: ex }
}

/**
 * Witnesses at 64 bits, built by hand rather than searched: the 64-bit space is too large to walk, so the page shows
 * one pick of each kind it can construct and checks it with `run`.
 */
export function built64(positive: boolean): { readonly sender: Pick | null; readonly recipient: Pick } {
  const top = (1n << 63n) - 1n
  return {
    recipient: { a: 1n, b: top, x: 1n },
    sender: positive ? null : { a: top, b: top, x: -1n },
  }
}
