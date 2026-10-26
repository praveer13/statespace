// The keep/kill rules as typed data (content/governance/keepkill-rules.yaml, W0-T07, hashed in
// RUN-keepkill-rules), from the snapshot scripts/build-rules.ts generates.
//
// Pure: no DOM, storage or network.

import { KC_COMPARISONS, PARAMETERS, RULES_PATH, RULES_SHA256, RULES_VERSION, WINDOW_COMPARISON } from './rules.generated.ts'

export { PARAMETERS, RULES_PATH, RULES_SHA256, RULES_VERSION }

export type Parameters = typeof PARAMETERS

/** A comparison whose units are KCs (comparisons 1 to 3), listed by stage. */
export interface KcComparison {
  readonly number: number
  readonly id: string
  /** The two arms in the rules' order. For comparisons 2 and 3 the first is the default; comparison 1's default is per KC. */
  readonly arms: readonly [string, string]
  readonly cheaperAlternative: boolean
  readonly contributingStages: readonly string[]
  /** Units by stratum: the stage the KC's ID names. */
  readonly units: Readonly<Record<string, readonly string[]>>
  /** Comparison 3: the families whose practice items carry the manipulated generalization step. */
  readonly families?: readonly string[]
}

/** The comparison whose units are 12-week windows (comparison 4). */
export interface WindowComparison {
  readonly number: number
  readonly id: string
  /** reserve first: the default. */
  readonly arms: readonly [string, string]
  readonly cheaperAlternative: boolean
  readonly contributingStages: readonly string[]
}

export const KC_COMPARISON_LIST: readonly KcComparison[] = KC_COMPARISONS as unknown as readonly KcComparison[]
export const WINDOWS: WindowComparison = WINDOW_COMPARISON as unknown as WindowComparison

export type ComparisonId = (typeof KC_COMPARISONS)[number]['id'] | (typeof WINDOW_COMPARISON)['id']

/** A KC comparison by id or number; throws on anything else. */
export function kcComparison(idOrNumber: string | number): KcComparison {
  const c = KC_COMPARISON_LIST.find((x) => x.id === idOrNumber || x.number === idOrNumber)
  if (!c) throw new RangeError(`no KC comparison ${JSON.stringify(idOrNumber)} in ${RULES_PATH}`)
  return c
}

/** Every unit of a KC comparison, with its stratum. */
export function unitsOf(comparison: KcComparison): { unit: string; stratum: string }[] {
  return Object.entries(comparison.units).flatMap(([stratum, list]) => list.map((unit) => ({ unit, stratum })))
}

/** True when a KC is a listed unit of the comparison. KCs the graph gained after the rules file are not units. */
export function isUnit(comparison: KcComparison, kc: string): boolean {
  return Object.values(comparison.units).some((list) => list.includes(kc))
}

/** The comparison 2 item form an arm changes: GEN-proof-structure template 2, Proof Blocks. */
export const PROOF_BLOCKS = { family: 'GEN-proof-structure', template: 2 } as const
