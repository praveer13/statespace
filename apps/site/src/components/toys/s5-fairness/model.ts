// The retrying hold of S5.L7 (module Hold, and HoldLive when Timeout also applies while pending), read against a Fair
// line. Pure and small. The states are (st, tries) with tries toggled mod 2 by Try:
//
//   Try     == st = "held"    /\ st' = "pending"
//   Busy    == st = "pending" /\ st' = "held"
//   Capture == st = "pending" /\ st' = "captured"
//   Timeout == st = "held"  (or, in HoldLive, st \in {"held", "pending"})  /\ st' = "released"
//
// A behavior that never resolves stays inside the four unresolved states. Since a cycle through Try and Busy has to
// pass all four (tries must return to its value), every such behavior ends in one of three ways: stuttering forever in
// a held state, stuttering forever in a pending state, or the retry cycle held, pending, held, pending. Those three
// lassos are therefore all of this model's unresolved endings, and EventuallyResolves holds under a Fair line exactly
// when each of them breaks some conjunct of it.

export type ActionName = 'Try' | 'Busy' | 'Capture' | 'Timeout'
export const ACTIONS: readonly ActionName[] = ['Try', 'Busy', 'Capture', 'Timeout']

/** Whose action it is: your system runs Try and Timeout; Busy and Capture are the provider answering. */
export const OWNER: Readonly<Record<ActionName, 'system' | 'provider'>> = {
  Try: 'system',
  Busy: 'provider',
  Capture: 'provider',
  Timeout: 'system',
}

export type Fairness = 'none' | 'WF' | 'SF'
export type Fair = Readonly<Record<ActionName, Fairness>>
/** Where Timeout applies: only while held (Hold), or while held or pending (HoldLive). */
export type TimeoutScope = 'held' | 'unresolved'

export type St = 'held' | 'pending' | 'captured' | 'released'

export function isEnabled(a: ActionName, st: St, scope: TimeoutScope): boolean {
  switch (a) {
    case 'Try':
      return st === 'held'
    case 'Busy':
    case 'Capture':
      return st === 'pending'
    case 'Timeout':
      return st === 'held' || (scope === 'unresolved' && st === 'pending')
  }
}

export interface Lasso {
  readonly id: 'retry' | 'stutter-held' | 'stutter-pending'
  /** How the lesson writes it. */
  readonly name: string
  /** The kinds of state the cycle passes through. */
  readonly cycle: readonly St[]
  /** The actions taken on the cycle. */
  readonly taken: readonly ActionName[]
}

export const LASSOS: readonly Lasso[] = [
  { id: 'retry', name: 'Try, Busy, Try, Busy, then back to the first state, forever', cycle: ['held', 'pending'], taken: ['Try', 'Busy'] },
  { id: 'stutter-held', name: 'Stuttering forever in held', cycle: ['held'], taken: [] },
  { id: 'stutter-pending', name: 'Try, then stuttering forever in pending', cycle: ['pending'], taken: [] },
]

export type Reading =
  /** The action is taken on the cycle, so the conjunct holds. */
  | { readonly holds: true; readonly why: 'taken' }
  /** WF: disabled at some state of the cycle. SF: disabled at every state. */
  | { readonly holds: true; readonly why: 'disabled-somewhere' | 'disabled-everywhere' }
  /** WF: enabled at every state and never taken. SF: enabled at some state and never taken. */
  | { readonly holds: false; readonly why: 'enabled-everywhere' | 'enabled-somewhere' }

/** The lesson's reading rule for one conjunct on one lasso. */
export function read(f: 'WF' | 'SF', a: ActionName, l: Lasso, scope: TimeoutScope): Reading {
  if (l.taken.includes(a)) return { holds: true, why: 'taken' }
  const on = l.cycle.map((st) => isEnabled(a, st, scope))
  if (f === 'WF') return on.every(Boolean) ? { holds: false, why: 'enabled-everywhere' } : { holds: true, why: 'disabled-somewhere' }
  return on.some(Boolean) ? { holds: false, why: 'enabled-somewhere' } : { holds: true, why: 'disabled-everywhere' }
}

export interface Judged {
  readonly lasso: Lasso
  readonly readings: ReadonlyArray<{ readonly action: ActionName; readonly f: 'WF' | 'SF'; readonly r: Reading }>
  /** Every conjunct holds on it: a fair behavior that never resolves. */
  readonly fair: boolean
}

export function conjuncts(fair: Fair): Array<{ action: ActionName; f: 'WF' | 'SF' }> {
  return ACTIONS.flatMap((a) => (fair[a] === 'none' ? [] : [{ action: a, f: fair[a] as 'WF' | 'SF' }]))
}

export function judge(fair: Fair, scope: TimeoutScope): Judged[] {
  return LASSOS.map((lasso) => {
    const readings = conjuncts(fair).map(({ action, f }) => ({ action, f, r: read(f, action, lasso, scope) }))
    return { lasso, readings, fair: readings.every((x) => x.r.holds) }
  })
}

/** EventuallyResolves holds on this model exactly when no unresolved ending is fair. */
export const resolves = (fair: Fair, scope: TimeoutScope): boolean => judge(fair, scope).every((j) => !j.fair)

/** The Fair line as TLA+. */
export function fairLine(fair: Fair): string {
  const cs = conjuncts(fair)
  return cs.length === 0 ? 'Fair == TRUE' : `Fair == ${cs.map(({ action, f }) => `${f}_vars(${action})`).join(' /\\ ')}`
}

/** The provider's actions that carry fairness: promises about someone else's system. */
export const providerPromises = (fair: Fair): ActionName[] => ACTIONS.filter((a) => OWNER[a] === 'provider' && fair[a] !== 'none')

export const NONE: Fair = { Try: 'none', Busy: 'none', Capture: 'none', Timeout: 'none' }
export const fairOf = (parts: Partial<Record<ActionName, Fairness>>): Fair => ({ ...NONE, ...parts })

/** The Fair lines the lesson tries, in its order. */
export const PRESETS: ReadonlyArray<{ readonly label: string; readonly fair: Fair; readonly scope: TimeoutScope }> = [
  { label: 'Hold, as checked first', fair: fairOf({ Try: 'WF', Busy: 'WF' }), scope: 'held' },
  { label: 'Add weak fairness on Capture', fair: fairOf({ Try: 'WF', Busy: 'WF', Capture: 'WF' }), scope: 'held' },
  { label: 'Strong fairness on Capture instead', fair: fairOf({ Try: 'WF', Busy: 'WF', Capture: 'SF' }), scope: 'held' },
  { label: 'Strong fairness on Timeout', fair: fairOf({ Try: 'WF', Timeout: 'SF' }), scope: 'held' },
  { label: 'HoldLive, the worked example', fair: fairOf({ Timeout: 'WF' }), scope: 'unresolved' },
]
