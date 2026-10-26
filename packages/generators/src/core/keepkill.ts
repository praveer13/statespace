// Each mechanic reads its own keep/kill arm (spine section 12 item 58; content/governance/keepkill-rules.yaml):
// M-layered-feedback reads comparison 1 (misconception-note) and M-class-hint reads comparison 3
// (witness-generalization). The allocation, the entry rules and the arm records are W1-T03's
// (@statespace/ledger/keepkill); this module only asks them, for one item, whether an arm governs its display.
//
// An arm applies only when the comparisons are on (a governing expSeed draw exists, under the rules this build
// carries), the item is a practice item (an arm never touches probes, test-outs, placement or audit cases), its
// primary KC is a unit of the comparison, the unit has entered, and, for comparison 3, the item's family is one
// the comparison lists. Otherwise the shipped default holds and nothing is recorded. The scheduler never calls
// this (M-which-is-it imports nothing from here).
//
// Pure: no DOM, storage or network.

import { governingDraw, orderedEvents, RULES_SHA256 } from '@statespace/ledger'
import type { ExpSeedDraw, LedgerEvent } from '@statespace/ledger'
import { armOf, entryOf, kcComparison } from '@statespace/ledger/keepkill'
import type { ArmRecord, KeepKillContent } from '@statespace/ledger/keepkill'
import type { GenId, KcId } from './types.ts'

export type { ArmRecord, KeepKillContent }

/** Comparison 1, read by M-layered-feedback. */
export const NOTE_COMPARISON = 'misconception-note'
/** Comparison 3, read by M-class-hint. */
export const CLASS_COMPARISON = 'witness-generalization'

export type MechanicComparison = typeof NOTE_COMPARISON | typeof CLASS_COMPARISON

/** Why no arm governs an item. */
export type NoArm = 'off' | 'rules-changed' | 'not-practice' | 'family-not-listed' | 'not-a-unit' | 'waiting' | 'placement' | 'test-out' | 'before-draw'

export type ArmReading =
  | { readonly applies: false; readonly why: NoArm }
  | { readonly applies: true; readonly comparison: MechanicComparison; readonly arm: string; readonly expSeed: number }

export interface ArmContext {
  /** The log's events. */
  readonly events: Iterable<LedgerEvent>
  /** The log's experiment-seed draws. */
  readonly draws: Iterable<ExpSeedDraw>
  /** The course content that resolves an event to its KC and template (KC tags live in content, not events). */
  readonly content: KeepKillContent
}

export interface ArmItem {
  /** The item's primary KC. */
  readonly kc: KcId
  readonly family: GenId
  /** A practice item: met in practice or a drawer, never a probe, test-out, confirmation or placement step. */
  readonly practice: boolean
  /** The item's own event, when it is written already: comparison 3's unit enters on its first practice item. */
  readonly event?: LedgerEvent
}

/** Whether, and under which arm, a comparison governs this item's display. */
export function readArm(comparison: MechanicComparison, item: ArmItem, ctx: ArmContext): ArmReading {
  const draw = governingDraw(ctx.draws)
  if (draw === undefined) return { applies: false, why: 'off' }
  if (draw.rulesSha256 !== RULES_SHA256) return { applies: false, why: 'rules-changed' }
  if (!item.practice) return { applies: false, why: 'not-practice' }
  const c = kcComparison(comparison)
  if (comparison === CLASS_COMPARISON && !(c.families ?? []).includes(item.family)) return { applies: false, why: 'family-not-listed' }
  const events = [...ctx.events]
  if (item.event !== undefined && !events.some((e) => e.id === item.event?.id)) events.push(item.event)
  const entry = entryOf(c, item.kc, { ordered: orderedEvents(events), content: ctx.content, draw })
  if (entry.status === 'waiting') return { applies: false, why: 'waiting' }
  if (entry.status === 'never') return { applies: false, why: entry.reason }
  const arm = armOf(c, item.kc, draw.expSeed)
  if (arm === undefined) return { applies: false, why: 'not-a-unit' }
  return { applies: true, comparison, arm, expSeed: draw.expSeed }
}

/** The record an event carries for the arm it was shown under; `fallback` says why the default was shown instead. */
export function armRecord(reading: Extract<ArmReading, { applies: true }>, fallback?: string): ArmRecord {
  return { comparison: reading.comparison, arm: reading.arm, expSeed: reading.expSeed, ...(fallback === undefined ? {} : { fallback }) }
}
