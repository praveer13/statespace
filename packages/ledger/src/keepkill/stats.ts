// The keep/kill estimates and decisions (keep/kill rules, common.estimate and common.decisions): Wilson and
// Newcombe intervals in IEEE 754 doubles with only + - * / and sqrt (z^2 is z * z), the rules' own z
// literal, integer tests for point differences, and the decision tables of comparisons 1 to 4. Ported from
// the reference implementation, scripts/spikes/W0-T07/keepkill.mjs, operation for operation, so the bounds
// reproduce runs/RUN-keepkill-rules/interval-vectors.json and the decisions match it exactly.
//
// Pure: no DOM, storage or network, and no random number generator.

import { PARAMETERS } from './rules.ts'

/** parameters.z: the double nearest to the 0.975 quantile of the standard normal distribution. */
export const Z: number = PARAMETERS.z

export type Phase = 'interim' | 'final'

/** Wilson score interval for x of n (common.estimate.wilson), clamped to [0, 1]. */
export function wilson(x: number, n: number, z: number = Z): [number, number] {
  if (!Number.isInteger(x) || !Number.isInteger(n) || n <= 0 || x < 0 || x > n) throw new RangeError(`wilson needs 0 <= x <= n, n > 0; got ${x} of ${n}`)
  const z2 = z * z
  const c = (x + z2 / 2) / (n + z2)
  const h = (z / (n + z2)) * Math.sqrt((x * (n - x)) / n + z2 / 4)
  return [Math.max(0, c - h), Math.min(1, c + h)]
}

export interface Interval {
  readonly p1: number
  readonly p2: number
  readonly l1: number
  readonly u1: number
  readonly l2: number
  readonly u2: number
  readonly d: number
  readonly L: number
  readonly U: number
}

/** Newcombe's hybrid score interval (method 10) for p1 - p2 (common.estimate.interval). */
export function newcombe(x1: number, n1: number, x2: number, n2: number, z: number = Z): Interval {
  const p1 = x1 / n1
  const p2 = x2 / n2
  const [l1, u1] = wilson(x1, n1, z)
  const [l2, u2] = wilson(x2, n2, z)
  const d = p1 - p2
  const a = p1 - l1
  const b = u2 - p2
  const c = u1 - p1
  const e = p2 - l2
  return { p1, p2, l1, u1, l2, u2, d, L: d - Math.sqrt(a * a + b * b), U: d + Math.sqrt(c * c + e * e) }
}

/** common.estimate.exact_tests: x1/n1 - x2/n2 >= k points, compared in integers. */
export function leadsByAtLeast(x1: number, n1: number, x2: number, n2: number, k: number): boolean {
  return 100 * (x1 * n2 - x2 * n1) >= k * n1 * n2
}

export interface DecisionParameters {
  readonly min_outcomes_per_arm: number
  readonly harm_read_outcomes_per_arm: number
  readonly switch_min_points: number
  readonly non_inferiority_margin_points: number
}

export interface WindowParameters {
  readonly window_margin_weeks: number
  readonly min_windows_per_arm: number
  readonly harm_read_windows_per_arm: number
}

export interface CommonInput {
  /** The alternative arm: correct and units with an outcome. */
  readonly xb: number
  readonly nb: number
  /** The default arm. */
  readonly xa: number
  readonly na: number
  readonly phase: Phase
  readonly cheaperAlternative: boolean
  readonly alternativeCheaperInTime?: boolean
}

export type CommonDecision = 'not enough data' | 'harm stop' | 'continue' | 'switch' | 'inconclusive'

/** The common decisions (comparisons 2 and 3); the estimate is the alternative minus the default. */
export function decideCommon(input: CommonInput, p: DecisionParameters = PARAMETERS): { decision: CommonDecision; rule: string; interval: Interval | null } {
  const { xb, nb, xa, na, phase, cheaperAlternative, alternativeCheaperInTime = false } = input
  if (na < p.harm_read_outcomes_per_arm || nb < p.harm_read_outcomes_per_arm) return { decision: 'not enough data', rule: 'below the harm-read count; no read', interval: null }
  const iv = newcombe(xb, nb, xa, na)
  if (iv.U < 0) return { decision: 'harm stop', rule: 'U < 0: the alternative is withdrawn and the default stands', interval: iv }
  if (phase === 'interim') return { decision: 'continue', rule: 'interim reads judge harm only', interval: iv }
  if (na < p.min_outcomes_per_arm || nb < p.min_outcomes_per_arm) return { decision: 'not enough data', rule: 'below the minimum; the default stands', interval: iv }
  if (iv.L > 0 && leadsByAtLeast(xb, nb, xa, na, p.switch_min_points)) return { decision: 'switch', rule: 'L > 0 and the alternative leads by at least the switch points', interval: iv }
  if (cheaperAlternative && alternativeCheaperInTime && iv.L > -p.non_inferiority_margin_points / 100) return { decision: 'switch', rule: 'non-inferior (L above minus the margin) and cheaper in time', interval: iv }
  return { decision: 'inconclusive', rule: 'the default stands', interval: iv }
}

export interface NoteInput {
  readonly xo: number
  readonly no: number
  readonly xc: number
  readonly nc: number
  readonly phase: Phase
}

/** Comparison 1, read in either direction; the estimate is open minus collapsed. */
export function decideNote(input: NoteInput, p: DecisionParameters = PARAMETERS): { decision: string; withdrawn: string[]; interval: Interval | null } {
  const { xo, no, xc, nc, phase } = input
  if (no < p.harm_read_outcomes_per_arm || nc < p.harm_read_outcomes_per_arm) return { decision: 'not enough data', withdrawn: [], interval: null }
  const iv = newcombe(xo, no, xc, nc)
  const withdrawn: string[] = []
  if (iv.U < 0) withdrawn.push('open, from expert-treatment units')
  if (iv.L > 0) withdrawn.push('collapsed, from novice-treatment units')
  if (phase === 'interim') return { decision: withdrawn.length > 0 ? 'harm stop' : 'continue', withdrawn, interval: iv }
  if (no < p.min_outcomes_per_arm || nc < p.min_outcomes_per_arm) return { decision: 'not enough data', withdrawn, interval: iv }
  if (iv.L > 0 && leadsByAtLeast(xo, no, xc, nc, p.switch_min_points)) return { decision: 'open in every eligible KC', withdrawn, interval: iv }
  if (iv.U < 0 && leadsByAtLeast(xc, nc, xo, no, p.switch_min_points)) return { decision: 'collapsed in every eligible KC', withdrawn, interval: iv }
  return { decision: 'inconclusive: the shipped defaults stand', withdrawn, interval: iv }
}

export interface WindowsInput {
  /** Counted weeks with graded or Bench work, one entry per complete window of each arm. */
  readonly reserve: readonly number[]
  readonly noReserve: readonly number[]
  /** KCs first learned in the arm's windows: correct and with an outcome. */
  readonly accReserve: { readonly x: number; readonly n: number }
  readonly accNoReserve: { readonly x: number; readonly n: number }
  /** Time on task per complete window. */
  readonly msReserve: readonly number[]
  readonly msNoReserve: readonly number[]
  readonly phase: Phase
}

/** Comparison 4. */
export function decideWindows(input: WindowsInput, p: WindowParameters = PARAMETERS): { decision: string; rule: string } {
  const { reserve, noReserve, accReserve, accNoReserve, msReserve, msNoReserve, phase } = input
  const m = p.window_margin_weeks
  const harmReady = reserve.length >= p.harm_read_windows_per_arm && noReserve.length >= p.harm_read_windows_per_arm
  if (harmReady && Math.max(...noReserve) <= Math.min(...reserve) - m) return { decision: 'harm stop', rule: 'every no-reserve window counts at least the margin fewer weeks than every reserve window' }
  if (phase === 'interim') return { decision: harmReady ? 'continue' : 'no read yet', rule: 'window ends judge harm only' }
  if (reserve.length < p.min_windows_per_arm || noReserve.length < p.min_windows_per_arm) return { decision: 'not enough data', rule: 'below the minimum; the default stands' }
  const ordered = Math.min(...noReserve) >= Math.max(...reserve) + m
  const accOk = accReserve.n > 0 && accNoReserve.n > 0 && accNoReserve.x * accReserve.n >= accReserve.x * accNoReserve.n
  const sum = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0)
  const msOk = sum(msNoReserve) * msReserve.length >= sum(msReserve) * msNoReserve.length
  if (ordered && accOk && msOk) return { decision: 'switch', rule: 'ordered with the margin, and both secondary outcomes no worse' }
  return { decision: 'default stands', rule: `ordered with the margin: ${ordered}; accuracy no worse: ${accOk}; time no worse: ${msOk}` }
}

/** The chance that a no-reserve windows all outrank d reserve windows, exchangeable and without ties: 1 / C(a + d, a). */
export function orderingChance(a: number, d: number): { a: number; d: number; oneIn: number } {
  let c = 1
  for (let i = 1; i <= a; i++) c = (c * (d + i)) / i
  return { a, d, oneIn: Math.round(c) }
}
