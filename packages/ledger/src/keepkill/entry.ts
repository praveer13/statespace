// The entry rules (keep/kill rules, common.entry and each comparison's entry): a unit enters its comparison
// at the instant, an at from the event log, that the comparison's rule names. Only entered units have
// outcomes or count anywhere. No entry rule reads an arm, so an entry is the same under every expSeed; a unit
// whose entry would precede the draw never enters; a KC credited at placement, or whose first learning is a
// test-out's confirmation, is never a unit of comparisons 1 to 3; and KCs the graph gained after the rules
// file are not units.
//
// Pure: no DOM, storage or network.

import type { ExpSeedDraw, LedgerEvent } from '../event.ts'
import { compareInstants } from '../time.ts'
import type { KeepKillContent, Session } from './facts.ts'
import { firstLearning, firstSolid, isPracticeItem, placementCredited, sessionsOf } from './facts.ts'
import type { KcComparison } from './rules.ts'
import { isUnit, PROOF_BLOCKS, unitsOf } from './rules.ts'

export type NeverReason = 'not-a-unit' | 'placement' | 'test-out' | 'before-draw'

export type Entry =
  | { readonly status: 'entered'; readonly at: string }
  | { readonly status: 'waiting' }
  | { readonly status: 'never'; readonly reason: NeverReason; readonly at?: string }

export interface EntryContext {
  /** The events the read uses, in fold order. */
  readonly ordered: readonly LedgerEvent[]
  readonly content: KeepKillContent
  /** The governing draw of expSeed. */
  readonly draw: ExpSeedDraw
  /** Sessions of `ordered`, when the caller has them already. */
  readonly sessions?: readonly Session[]
}

/** The instant a unit's comparison rule names, before the common exclusions; undefined while it has not happened. */
function ruleInstant(comparison: KcComparison, kc: string, ctx: EntryContext, sessions: () => readonly Session[]): string | undefined {
  const { ordered, content } = ctx
  switch (comparison.id) {
    case 'misconception-note': {
      // Expert: at first learning. Novice (or no treatment declared): at the first graded event of the first
      // session after the session in which the KC first became solid.
      if ((content.treatment(kc) ?? 'novice') === 'expert') return firstLearning(kc, ordered, content)?.at
      const all = sessions()
      const solid = firstSolid(kc, all, content)
      return solid === undefined ? undefined : all[solid.session + 1]?.events[0]?.at
    }
    case 'proof-blocks-distractors':
      // The first practice item of GEN-proof-structure template 2 whose primary KC is the unit.
      return ordered.find((e) => {
        if (!isPracticeItem(e) || content.primaryKc(e) !== kc) return false
        const t = content.template(e)
        return t !== undefined && t.family === PROOF_BLOCKS.family && t.template === PROOF_BLOCKS.template
      })?.at
    case 'witness-generalization': {
      // The first practice item of a listed family whose primary KC is the unit.
      const families = new Set(comparison.families ?? [])
      return ordered.find((e) => {
        if (!isPracticeItem(e) || content.primaryKc(e) !== kc) return false
        const t = content.template(e)
        return t !== undefined && families.has(t.family)
      })?.at
    }
    default:
      throw new RangeError(`no entry rule for comparison ${comparison.id}`)
  }
}

/** A unit's entry under the rules, from the events the read uses. */
export function entryOf(comparison: KcComparison, kc: string, ctx: EntryContext): Entry {
  let cached: readonly Session[] | undefined = ctx.sessions
  const sessions = (): readonly Session[] => (cached ??= sessionsOf(ctx.ordered))
  if (!isUnit(comparison, kc)) return { status: 'never', reason: 'not-a-unit' }
  if (placementCredited(kc, ctx.ordered, ctx.content)) return { status: 'never', reason: 'placement' }
  if (firstLearning(kc, ctx.ordered, ctx.content)?.source === 'confirm') return { status: 'never', reason: 'test-out' }
  const at = ruleInstant(comparison, kc, ctx, sessions)
  if (at === undefined) return { status: 'waiting' }
  if (compareInstants(at, ctx.draw.drawnAt) < 0) return { status: 'never', reason: 'before-draw', at }
  return { status: 'entered', at }
}

/** Every listed unit's entry, in the rules' order. */
export function entriesOf(comparison: KcComparison, ctx: EntryContext): Map<string, Entry> {
  const withSessions: EntryContext = { ...ctx, sessions: ctx.sessions ?? sessionsOf(ctx.ordered) }
  return new Map(unitsOf(comparison).map(({ unit }) => [unit, entryOf(comparison, unit, withSessions)]))
}
