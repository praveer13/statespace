// @statespace/runs: the runs registry and the facts registry as data (ARCHITECTURE.md section 17.1: the
// registry loader, the {{run:}} resolver and the run-sheet data). Pure TypeScript: the site, the instrument
// origin and the gates (scripts/verify-facts.mjs, GATE-facts) run the same code.

import { factStaleness, runStaleness } from './facts.ts'
import type { Fact, Staleness } from './facts.ts'

export { ARCHITECTURE_VALUE_PREFIX, codeSpans, FACT_ID, isArchitectureSpelling, isPlaceholder, maskReferences, PLACEHOLDER_IDS, referencesIn, RUN_ID } from './refs.ts'
export type { Reference, ReferenceForm } from './refs.ts'
export { describe, findValue, isPrintable, renderings, renderValue, resolvePath } from './values.ts'
export type { Printable } from './values.ts'
export {
  addDays,
  checkErrata,
  checkFacts,
  DATED_KINDS,
  dateOf,
  daysBetween,
  ERRATA_FORMAT,
  FACT_KINDS,
  factStaleness,
  FACTS_FORMAT,
  isPartialDate,
  isRealDate,
  recheckFlags,
  runAnchor,
  runStaleness,
  staleness,
  staleSince,
  TTL_DAYS,
} from './facts.ts'
export type { Erratum, ErrataFile, Fact, FactEvidence, FactKind, FactsFile, FactSource, Issue, RecheckFlag, RegistryContext, Staleness } from './facts.ts'
export { runChip, runSheet } from './sheet.ts'
export type { RunChip, RunLike, RunSheet } from './sheet.ts'
export { checkUnit, emptyCounts, OUTPUT_KINDS } from './check.ts'
export type { CheckContext, Finding, FindingCheck, Token, Unit, UnitCounts, UnitResult } from './check.ts'

/** A TTL that has passed: a registry fact, or a run that describes a moving upstream. */
export interface Expired {
  kind: 'fact' | 'run'
  id: string
  staleness: Staleness
  /** for a twin fact: the run whose clock it follows */
  via?: string
}

/**
 * Every TTL that has passed on today: tool facts on their own clocks, twin facts on their run's clock, and
 * runs that carry ttl_days (RUN-twin-pins, RUN-lean-asset). GATE-facts warns on each and never fails.
 */
export function expiredTtls(facts: readonly Fact[], runs: ReadonlyMap<string, unknown>, today: string): Expired[] {
  const out: Expired[] = []
  for (const f of facts) {
    const s = factStaleness(f, runs, today)
    if (s !== null && s.stale) out.push({ kind: 'fact', id: f.id, staleness: s, ...(f.kind === 'twin' && typeof f.run === 'string' ? { via: f.run } : {}) })
  }
  for (const [id, record] of [...runs].sort(([a], [b]) => a.localeCompare(b))) {
    const s = runStaleness(record, today)
    if (s !== null && s.stale) out.push({ kind: 'run', id, staleness: s })
  }
  return out
}
