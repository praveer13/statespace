// Transfer's weakest precondition (S4.L3, cell 1), pushed back one command at a time, and the same command run forward
// on one start state. Pure and small: the page derives each line, evaluates it, runs the command, and searches a small
// grid for a state where the assume reading and Mini-Plinth's reading disagree.
//
//   Transfer:  requires amount ≤ a;  a := a − amount;  b := b + amount
//   post       Inv = a ≥ 0 ∧ b ≥ 0

/** How a failing guard reads (the lesson's table: Dijkstra's `if` and `assert` share one formula). */
export type Reading = 'requires' | 'assume' | 'assert'

export interface State {
  readonly a: number
  readonly b: number
  readonly amount: number
}

/** A formula as printed: plain text runs, and the runs that the last rule just wrote in. */
export type Piece = { readonly text: string; readonly fresh?: boolean }

export interface Line {
  /** The formula at this program point, as pieces. */
  readonly pieces: readonly Piece[]
  /** The rule that produced it. */
  readonly rule: string
  /** Whether the formula holds in a state at this point. */
  readonly holds: (s: { a: number; b: number; amount: number }) => boolean
}

const inv = (s: { a: number; b: number }): boolean => s.a >= 0 && s.b >= 0
const guard = (s: State): boolean => s.amount <= s.a

/** Line 0 is the postcondition, after `b := b + amount`. */
export const POST: Line = {
  pieces: [{ text: 'a ≥ 0 ∧ b ≥ 0' }],
  rule: 'the postcondition, Inv',
  holds: inv,
}

/** Line 1 sits between `a := a − amount` and `b := b + amount`. */
export const AFTER_DEBIT: Line = {
  pieces: [{ text: 'a ≥ 0 ∧ ' }, { text: 'b + amount', fresh: true }, { text: ' ≥ 0' }],
  rule: 'assignment: b + amount written in place of b',
  holds: (s) => s.a >= 0 && s.b + s.amount >= 0,
}

/** Line 2 sits between the guard and `a := a − amount`. */
export const AFTER_GUARD: Line = {
  pieces: [{ text: 'a − amount', fresh: true }, { text: ' ≥ 0 ∧ b + amount ≥ 0' }],
  rule: 'sequence, then assignment: a − amount written in place of a',
  holds: (s) => s.a - s.amount >= 0 && s.b + s.amount >= 0,
}

const body = (s: State): boolean => AFTER_GUARD.holds(s)

/** Line 3 is the weakest precondition of the whole command, and it depends on the reading. */
export function top(r: Reading): Line {
  switch (r) {
    case 'requires':
      return {
        pieces: [
          { text: '(amount ≤ a → ', fresh: true },
          { text: 'a − amount ≥ 0 ∧ b + amount ≥ 0' },
          { text: ') ∧ (¬(amount ≤ a) → a ≥ 0 ∧ b ≥ 0)', fresh: true },
        ],
        rule: 'guard, reject reading: a rejected Transfer leaves the state, so Inv must hold already',
        holds: (s) => (guard(s) ? body(s) : true) && (!guard(s) ? inv(s) : true),
      }
    case 'assume':
      return {
        pieces: [{ text: 'amount ≤ a → ', fresh: true }, { text: 'a − amount ≥ 0 ∧ b + amount ≥ 0' }],
        rule: 'guard, assume reading: a run whose guard fails is ignored',
        holds: (s) => !guard(s) || body(s),
      }
    case 'assert':
      return {
        pieces: [{ text: 'amount ≤ a ∧ ', fresh: true }, { text: 'a − amount ≥ 0 ∧ b + amount ≥ 0' }],
        rule: 'guard, assert reading: a failing guard is an error to rule out',
        holds: (s) => guard(s) && body(s),
      }
  }
}

/** The lines from the bottom up: index 0 is Inv, index 3 the weakest precondition. */
export const linesFor = (r: Reading): readonly Line[] => [POST, AFTER_DEBIT, AFTER_GUARD, top(r)]

/** The program points, from the top: before the guard, after it, after the debit, after the credit. */
export type Point = { readonly reached: false } | { readonly reached: true; readonly a: number; readonly b: number }

export type Outcome =
  /** The guard held and the body ran. */
  | { readonly kind: 'ran'; readonly a: number; readonly b: number }
  /** Mini-Plinth: Err, state unchanged. */
  | { readonly kind: 'err'; readonly a: number; readonly b: number }
  /** Assume: the run does not count. */
  | { readonly kind: 'ignored' }
  /** Assert or Dijkstra's `if`: the run is an error. */
  | { readonly kind: 'error' }

export interface Run {
  /** The state at each point, top to bottom: before the guard, after it, after the debit, after the credit. */
  readonly points: readonly [Point, Point, Point, Point]
  readonly outcome: Outcome
  /** Whether the run ends in a state that satisfies Inv, as the reading counts it. */
  readonly endsInInv: boolean
}

/** Run Transfer forward from a start state under a reading. */
export function run(r: Reading, s: State): Run {
  const p0: Point = { reached: true, a: s.a, b: s.b }
  if (guard(s)) {
    const a1 = s.a - s.amount
    const b1 = s.b + s.amount
    return {
      points: [p0, p0, { reached: true, a: a1, b: s.b }, { reached: true, a: a1, b: b1 }],
      outcome: { kind: 'ran', a: a1, b: b1 },
      endsInInv: inv({ a: a1, b: b1 }),
    }
  }
  const no: Point = { reached: false }
  if (r === 'requires') {
    return { points: [p0, no, no, p0], outcome: { kind: 'err', a: s.a, b: s.b }, endsInInv: inv(s) }
  }
  if (r === 'assume') return { points: [p0, no, no, no], outcome: { kind: 'ignored' }, endsInInv: true }
  return { points: [p0, no, no, no], outcome: { kind: 'error' }, endsInInv: false }
}

/** The grid the page searches: a and b from LO to HI, amount from 0 to HI. */
export const LO = -3
export const HI = 5

export function grid(): State[] {
  const out: State[] = []
  for (let amount = 0; amount <= HI; amount++)
    for (let a = LO; a <= HI; a++) for (let b = LO; b <= HI; b++) out.push({ a, b, amount })
  return out
}

/** Where the assume-reading candidate and Mini-Plinth's weakest precondition disagree. */
export const disagree = (s: State): boolean => top('assume').holds(s) !== top('requires').holds(s)

/**
 * The plainest state where the two disagree: the smallest positive amount first, then a and b nearest zero, with
 * non-negative before negative.
 */
export function plainestDisagreement(): State | null {
  const near = (n: number): number => Math.abs(n) * 2 + (n < 0 ? 1 : 0)
  const amountOrder = (n: number): number => (n === 0 ? HI + 1 : n)
  const all = grid()
    .filter(disagree)
    .sort((x, y) => amountOrder(x.amount) - amountOrder(y.amount) || near(x.a) + near(x.b) - (near(y.a) + near(y.b)) || near(x.a) - near(y.a))
  return all[0] ?? null
}

export const guardHolds = guard
export const invHolds = inv
