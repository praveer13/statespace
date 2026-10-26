// S2.L7's sequence theorem, unrolled over one concrete run. Pure and small: the page runs `runPos` on a starting ledger
// and a list of amounts, then lays out, step by step, which state each goal starts from and which state the induction
// hypothesis is about, with and without `generalizing s`.
//
//   def transferPos (s : Ledger) (n : Int) : Ledger :=
//     if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s
//   def runPos (s : Ledger) : List Int → Ledger
//     | [] => s
//     | n :: ns => runPos (transferPos s n) ns
//
//   theorem runPos_conserves (s : Ledger) (ns : List Int) : total (runPos s ns) = total s := by
//     induction ns generalizing s with
//     | nil => rfl
//     | cons n ns ih => simp [runPos, ih, transferPos_conserves]

export interface Ledger {
  readonly a: number
  readonly b: number
}

export type Mode = 'generalizing' | 'fixed'

export const total = (s: Ledger): number => s.a + s.b

export const allowed = (s: Ledger, n: number): boolean => 0 < n && n <= s.a

export const transferPos = (s: Ledger, n: number): Ledger => (allowed(s, n) ? { a: s.a - n, b: s.b + n } : s)

/** The states a run passes through: s0, then the state after each amount. */
export function trace(s0: Ledger, ns: readonly number[]): Ledger[] {
  const out: Ledger[] = [s0]
  for (const n of ns) out.push(transferPos(out[out.length - 1] as Ledger, n))
  return out
}

export const runPos = (s0: Ledger, ns: readonly number[]): Ledger => trace(s0, ns)[ns.length] as Ledger

/** A list as Lean prints it. */
export const showList = (ns: readonly number[]): string => `[${ns.join(', ')}]`

/** A ledger as the page prints it: (a, b). */
export const showLedger = (s: Ledger): string => `(${s.a}, ${s.b})`.replace(/-/g, '−')

export type Step =
  /** The theorem, instantiated at the start state and the whole list. */
  | { readonly kind: 'statement' }
  /**
   * A `cons` case: the goal starts from state `at` with the list from index `at` on. With generalizing, ih is used at
   * state at + 1; without, ih is about state 0 while the goal has moved to state 1, and the proof stops.
   */
  | { readonly kind: 'cons'; readonly at: number; readonly ihAt: number; readonly goalAt: number; readonly closes: boolean }
  /** The `nil` case at the end of the list: rfl. */
  | { readonly kind: 'nil'; readonly at: number }

/** The steps the page walks through for a list of this length. */
export function steps(mode: Mode, len: number): Step[] {
  const out: Step[] = [{ kind: 'statement' }]
  if (mode === 'fixed') {
    if (len === 0) out.push({ kind: 'nil', at: 0 })
    else out.push({ kind: 'cons', at: 0, ihAt: 0, goalAt: 1, closes: false })
    return out
  }
  for (let k = 0; k < len; k++) out.push({ kind: 'cons', at: k, ihAt: k + 1, goalAt: k + 1, closes: true })
  out.push({ kind: 'nil', at: len })
  return out
}

/** Parse the amounts field: whole numbers from -99 to 99, comma or space separated, at most MAX_LEN of them. */
export const MAX_LEN = 6

export function parseAmounts(text: string): number[] | null {
  const t = text.trim()
  if (t === '') return []
  const parts = t.split(/[\s,]+/).filter((p) => p !== '')
  if (parts.length > MAX_LEN) return null
  const out: number[] = []
  for (const p of parts) {
    const q = p.replace(/−/g, '-')
    if (!/^-?\d{1,2}$/.test(q)) return null
    out.push(Number(q))
  }
  return out
}

export function parseBalance(text: string): number | null {
  const q = text.trim().replace(/−/g, '-')
  return /^-?\d{1,2}$/.test(q) ? Number(q) : null
}
