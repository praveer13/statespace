// S2.L10's pinned statements, evaluated as properties of a transfer over a small grid of states. Pure and small: the
// page takes one of six transfers, checks each statement on every state in the grid, and reads R, the lesson's
// requirement, the same way. It covers only this grid and these six transfers; nothing here is a proof.
//
//   def transfer (s : Ledger) (n : Int) : Ledger :=
//     if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

export interface Ledger {
  readonly a: number
  readonly b: number
}

export type Impl = 'pinned' | 'idle' | 'short' | 'no-guard' | 'backwards' | 'mints'

export const IMPLS: readonly Impl[] = ['pinned', 'idle', 'short', 'no-guard', 'backwards', 'mints']

export const allowed = (s: Ledger, n: number): boolean => 0 <= n && n <= s.a

export function transfer(impl: Impl, s: Ledger, n: number): Ledger {
  const ok = allowed(s, n)
  switch (impl) {
    case 'pinned':
      return ok ? { a: s.a - n, b: s.b + n } : s
    case 'idle':
      return s
    case 'short': {
      const m = Math.max(n - 1, 0)
      return ok ? { a: s.a - m, b: s.b + m } : s
    }
    case 'no-guard':
      return { a: s.a - n, b: s.b + n }
    case 'backwards':
      return ok ? { a: s.a + n, b: s.b - n } : s
    case 'mints':
      return ok ? { a: s.a - n, b: s.b + n + 1 } : s
  }
}

export const total = (s: Ledger): number => s.a + s.b

export function run(impl: Impl, s: Ledger, ns: readonly number[]): Ledger {
  let t = s
  for (const n of ns) t = transfer(impl, t, n)
  return t
}

export type Prop = 'conserves' | 'rejected' | 'nonneg' | 'sequence' | 'moves'

export const PROPS: readonly Prop[] = ['conserves', 'rejected', 'nonneg', 'sequence', 'moves']

/** The four pinned in the lesson's challenge; `moves` is the one the lesson adds. */
export const FOUR: readonly Prop[] = ['conserves', 'rejected', 'nonneg', 'sequence']

export const THEOREM: Record<Prop, string> = {
  conserves: 'transfer_conserves',
  rejected: 'transfer_rejected',
  nonneg: 'transfer_nonneg',
  sequence: 'run_conserves',
  moves: 'transfer_moves',
}

const eq = (x: Ledger, y: Ledger): boolean => x.a === y.a && x.b === y.b

/** The grid: non-negative states first, so a witness reads naturally, then the negative ones the statements also cover. */
export const BAL_LO = -2
export const BAL_HI = 6
export const AMT: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, -1, -2]
export const SEQ_AMT: readonly number[] = [0, 1, 3, 7, -1]
export const SEQ_MAX = 3

function balances(): number[] {
  const out: number[] = []
  for (let v = 0; v <= BAL_HI; v++) out.push(v)
  for (let v = -1; v >= BAL_LO; v--) out.push(v)
  return out
}

export function states(): Ledger[] {
  const bs = balances()
  const out: Ledger[] = []
  for (const a of bs) for (const b of bs) out.push({ a, b })
  // non-negative pairs first
  return out.sort((x, y) => Number(x.a < 0 || x.b < 0) - Number(y.a < 0 || y.b < 0))
}

export function lists(): number[][] {
  let level: number[][] = [[]]
  const out: number[][] = [[]]
  for (let len = 1; len <= SEQ_MAX; len++) {
    level = level.flatMap((l) => SEQ_AMT.map((n) => [...l, n]))
    out.push(...level)
  }
  return out
}

export interface Witness {
  readonly s: Ledger
  /** The amount, or the list for `sequence`. */
  readonly n: number | readonly number[]
  readonly after: Ledger
}

/** Whether a statement holds for one instance (vacuously when its hypothesis fails). */
export function holdsAt(p: Prop, impl: Impl, s: Ledger, n: number): boolean {
  const t = transfer(impl, s, n)
  switch (p) {
    case 'conserves':
      return total(t) === total(s)
    case 'rejected':
      return allowed(s, n) || eq(t, s)
    case 'nonneg':
      return !(s.a >= 0 && s.b >= 0) || (t.a >= 0 && t.b >= 0)
    case 'moves':
      return !allowed(s, n) || eq(t, { a: s.a - n, b: s.b + n })
    case 'sequence':
      return total(run(impl, s, [n])) === total(s)
  }
}

/** The first state in the grid where the statement fails, or null when it holds on every one. */
export function firstFailure(p: Prop, impl: Impl): Witness | null {
  for (const s of states()) {
    if (p === 'sequence') {
      for (const ns of lists()) {
        const after = run(impl, s, ns)
        if (total(after) !== total(s)) return { s, n: ns, after }
      }
      continue
    }
    for (const n of AMT) if (!holdsAt(p, impl, s, n)) return { s, n, after: transfer(impl, s, n) }
  }
  return null
}

/**
 * R as this page reads it: an allowed transfer debits exactly n and credits exactly n, a disallowed one changes
 * nothing, no balance goes negative, and money is never created or destroyed. The first failing instance, or null.
 */
export function requirementFailure(impl: Impl): { readonly w: Witness; readonly why: string } | null {
  for (const s of states()) {
    for (const n of AMT) {
      const t = transfer(impl, s, n)
      if (allowed(s, n) && !eq(t, { a: s.a - n, b: s.b + n }))
        return { w: { s, n, after: t }, why: `an allowed transfer must debit exactly ${n} and credit exactly ${n}` }
      if (!allowed(s, n) && !eq(t, s)) return { w: { s, n, after: t }, why: 'a disallowed transfer must change nothing' }
      if (s.a >= 0 && s.b >= 0 && (t.a < 0 || t.b < 0)) return { w: { s, n, after: t }, why: 'no balance may go negative' }
      if (total(t) !== total(s)) return { w: { s, n, after: t }, why: 'money is never created or destroyed' }
    }
  }
  return null
}

export interface Verdict {
  readonly failing: readonly { readonly p: Prop; readonly w: Witness }[]
  readonly r: ReturnType<typeof requirementFailure>
  /** Every pinned statement holds on the grid and R fails: the transfer fools the pin. */
  readonly fooled: boolean
}

export function verdict(impl: Impl, pinned: readonly Prop[]): Verdict {
  const failing = pinned.flatMap((p) => {
    const w = firstFailure(p, impl)
    return w === null ? [] : [{ p, w }]
  })
  const r = requirementFailure(impl)
  return { failing, r, fooled: failing.length === 0 && r !== null }
}

/** The transfers among the six that fool this set of pins, in list order. */
export const foolers = (pinned: readonly Prop[]): Impl[] => IMPLS.filter((i) => verdict(i, pinned).fooled)

/** The lesson's own instance: amount 5 from (10, 0), segment "Several checkers and one requirement". */
export const EXAMPLE = { s: { a: 10, b: 0 }, n: 5 } as const

/** The exit item's instance: amount 3 from (8, 2), where R requires (5, 5). */
export const EXIT = { s: { a: 8, b: 2 }, n: 3 } as const

export const GRID_STATES = (BAL_HI - BAL_LO + 1) ** 2
