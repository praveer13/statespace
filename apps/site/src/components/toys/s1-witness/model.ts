// Boot's transfer (S1.L0), as the pull request wrote it and as the lesson fixes it, over a small grid of whole numbers.
// Pure and small: the page judges one pick, draws the map for one amount, and finds the smallest witness itself.
//
//   def transfer(src, dst, amount):
//       if amount <= 0 or amount > dst.balance:   # the pull request's guard
//           raise Rejected
//       src.balance -= amount
//       dst.balance += amount
//
// The fixed guard reads the sender: `amount > src.balance`.

export type Guard = 'as-written' | 'fixed'

/** The grid this page covers: balances and amounts from 0 to MAX. */
export const MAX = 9

export interface Pick {
  /** The sender's balance, src. */
  readonly a: number
  /** The recipient's balance, dst. */
  readonly b: number
  readonly amount: number
}

export type Verdict =
  /** `amount <= 0` raises Rejected. */
  | { readonly kind: 'not-positive' }
  /** The guard's balance does not cover the amount, so the transfer raises Rejected. */
  | { readonly kind: 'guard-rejects'; readonly checked: number }
  /** The transfer goes through and nobody ends below zero. */
  | { readonly kind: 'fine'; readonly checked: number; readonly after: number }
  /** The transfer goes through and the sender ends below zero: a witness. */
  | { readonly kind: 'witness'; readonly checked: number; readonly after: number }

/** The balance the guard compares the amount with. */
export const guarded = (g: Guard, p: Pick): number => (g === 'as-written' ? p.b : p.a)

export function judge(g: Guard, p: Pick): Verdict {
  if (p.amount <= 0) return { kind: 'not-positive' }
  const checked = guarded(g, p)
  if (p.amount > checked) return { kind: 'guard-rejects', checked }
  const after = p.a - p.amount
  return after < 0 ? { kind: 'witness', checked, after } : { kind: 'fine', checked, after }
}

/** Every pick in the grid with this amount, sender varying fastest. */
export function picksFor(amount: number): Pick[] {
  const out: Pick[] = []
  for (let b = 0; b <= MAX; b++) for (let a = 0; a <= MAX; a++) out.push({ a, b, amount })
  return out
}

/** How many of the grid's (MAX + 1)³ picks are witnesses under a guard. */
export function witnessCount(g: Guard): number {
  let n = 0
  for (let amount = 0; amount <= MAX; amount++) for (const p of picksFor(amount)) if (judge(g, p).kind === 'witness') n++
  return n
}

/**
 * The smallest witness in the grid: the smallest amount, then the smallest recipient, then the smallest sender. With
 * `amount` it looks at that amount only. Null when the grid holds none.
 */
export function smallestWitness(g: Guard, amount?: number): Pick | null {
  const amounts = amount === undefined ? Array.from({ length: MAX + 1 }, (_, i) => i) : [amount]
  for (const m of amounts) {
    const ps = picksFor(m).sort((x, y) => x.b - y.b || x.a - y.a)
    const w = ps.find((p) => judge(g, p).kind === 'witness')
    if (w !== undefined) return w
  }
  return null
}

export const GRID_PICKS = (MAX + 1) ** 3
