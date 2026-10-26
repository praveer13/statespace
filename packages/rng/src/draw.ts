// Seeded draws for generators, pocket checkers and the Clearinghouse world (invariant I3). Everything here is
// integer arithmetic on the vendored splitmix32u stream (vendor/kernelspace/src/lib/rng.ts), so one seed gives
// one sequence of draws in Node, Chromium, Firefox and WebKit. No draw reads a clock or the entropy pool: a
// seed arrives as a parameter (ARCHITECTURE.md section 6.6).
//
// Integer draws use rejection sampling, so `below(n)` is exactly uniform over [0, n); the vendored
// `shuffledOrder` scales a double instead, which is deterministic but slightly biased, and stays as it is for
// the callers that already use it.

import { hash32, splitmix32u } from '../../../vendor/kernelspace/src/lib/rng.ts'

/** 2^32, the number of distinct uint32 values. Exact as a double. */
export const UINT32_RANGE = 4294967296

/** True for an integer in [0, 2^32). */
export const isUint32 = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < UINT32_RANGE

/** Coerce a seed to uint32, refusing anything that is not an integer (a fractional or NaN seed is a bug, never a seed). */
export function toUint32(seed: number): number {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) throw new RangeError(`a seed must be an integer, got ${String(seed)}`)
  return seed >>> 0
}

/** MurmurHash3's 32-bit finalizer: a bijection on uint32 that spreads every input bit over every output bit. */
export function fmix32(h0: number): number {
  let h = h0 >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return h
}

/**
 * A seed derived from a parent seed and a label: the first output of the stream seeded by
 * fmix32(seed) XOR hash32(label). Distinct labels give unrelated streams, so a part of a generator that draws
 * from its own derived seed keeps its values when another part adds or removes a draw.
 */
export function deriveSeed(seed: number, label: string): number {
  return splitmix32u((fmix32(toUint32(seed)) ^ hash32(label)) >>> 0)()
}

/**
 * A stream of integer draws from one seed. Every method consumes draws from the same underlying sequence in
 * call order, so a generator that makes the same calls in the same order gets the same values everywhere.
 * `fork(label)` starts an independent stream from the construction seed and the label, whatever has been drawn.
 */
export class SeededDraw {
  readonly seed: number
  readonly #next: () => number

  constructor(seed: number) {
    this.seed = toUint32(seed)
    this.#next = splitmix32u(this.seed)
  }

  /** The next raw uint32 of the stream. */
  u32(): number {
    return this.#next()
  }

  /** An integer in [0, n), exactly uniform, for an integer n in [1, 2^32]. */
  below(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) throw new RangeError(`below(n) needs an integer n in [1, 2^32], got ${String(n)}`)
    // The largest multiple of n that fits: draws at or above it are rejected, so every residue is equally likely.
    const limit = UINT32_RANGE - (UINT32_RANGE % n)
    for (;;) {
      const u = this.#next()
      if (u < limit) return u % n
    }
  }

  /** An integer in [lo, hi], both inclusive and both safe integers, with at most 2^32 values between them. */
  int(lo: number, hi: number): number {
    if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || hi < lo) throw new RangeError(`int(lo, hi) needs safe integers lo <= hi, got ${String(lo)}, ${String(hi)}`)
    return lo + this.below(hi - lo + 1)
  }

  /** true or false, each with probability 1/2. */
  bool(): boolean {
    return this.below(2) === 1
  }

  /** true with probability numerator/denominator, for integers 0 <= numerator <= denominator, denominator in [1, 2^32]. */
  chance(numerator: number, denominator: number): boolean {
    if (!Number.isInteger(numerator) || numerator < 0 || numerator > denominator) throw new RangeError(`chance needs 0 <= numerator <= denominator, got ${String(numerator)}/${String(denominator)}`)
    return this.below(denominator) < numerator
  }

  /** One element of a non-empty list, each equally likely. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('pick() needs a non-empty list')
    return items[this.below(items.length)] as T
  }

  /** A new array with the elements in a uniformly random order (Fisher–Yates, from the last position down). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.below(i + 1)
      const tmp = out[i] as T
      out[i] = out[j] as T
      out[j] = tmp
    }
    return out
  }

  /** k distinct elements in a uniformly random order, for 0 <= k <= items.length. */
  sample<T>(items: readonly T[], k: number): T[] {
    if (!Number.isInteger(k) || k < 0 || k > items.length) throw new RangeError(`sample(items, k) needs 0 <= k <= ${items.length}, got ${String(k)}`)
    const out = items.slice()
    // A partial Fisher–Yates from the front: positions 0..k-1 end up holding the sample.
    for (let i = 0; i < k; i++) {
      const j = i + this.below(out.length - i)
      const tmp = out[i] as T
      out[i] = out[j] as T
      out[j] = tmp
    }
    return out.slice(0, k)
  }

  /** One value, chosen with probability proportional to its non-negative integer weight; the weights must not all be zero. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    let total = 0
    for (const [, w] of entries) {
      if (!Number.isSafeInteger(w) || w < 0) throw new RangeError(`weights must be non-negative safe integers, got ${String(w)}`)
      total += w
    }
    if (total < 1 || total > UINT32_RANGE) throw new RangeError(`the weights must sum to between 1 and 2^32, got ${total}`)
    let r = this.below(total)
    for (const [value, w] of entries) {
      if (r < w) return value
      r -= w
    }
    throw new Error('unreachable: the weights sum to the total')
  }

  /** An independent stream for one part of a generator, from the construction seed and a label. */
  fork(label: string): SeededDraw {
    return new SeededDraw(deriveSeed(this.seed, label))
  }
}

/** A draw stream for a seed. */
export function createDraw(seed: number): SeededDraw {
  return new SeededDraw(seed)
}
