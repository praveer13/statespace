// The content block types (V2-18; spine section 12 item 48; ARCHITECTURE.md section 3.3). W1 to W2 content uses
// six and no more, and a seventh needs a logged decision in the spine: change this list and the schema
// (schemas/lesson.schema.json) together, and GATE-lessons counts against MAX_BLOCK_TYPES.

import type { LessonBlock, LessonSegment } from '@statespace/schema'

export const BLOCK_TYPES = ['prose', 'instrument', 'item', 'claim', 'specimen', 'card'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

/** The most block types W1 to W2 content may use (V2-18). */
export const MAX_BLOCK_TYPES = 6

/** An item's role is where it sits: before a segment, ending a segment, or in the exit. */
export const ITEM_ROLES = ['prequestion', 'segment', 'exit'] as const
export type ItemRole = (typeof ITEM_ROLES)[number]

/**
 * A card's variant. The spine names four (Build this, twin, dated incident, "this will feel harder"); curriculum/
 * S01-counterexample.md adds the dated reading pointer a bridge lesson carries (spine section 3.0).
 */
export const CARD_VARIANTS = ['build-this', 'twin', 'dated-incident', 'feels-harder', 'reading'] as const
export type CardVariant = (typeof CARD_VARIANTS)[number]

/** The spine's tiers. Tier names stay internal: learners see the plain formats of tierFormat. */
export const TIERS = ['boot', 'core', 'bridge', 'step'] as const
export type Tier = (typeof TIERS)[number]

/** The plain format a learner sees for a tier (DESIGN.md SCR-stage and SCR-lesson); "core" and "bridge" are not glossary terms. */
export function tierFormat(tier: Tier): string {
  switch (tier) {
    case 'boot':
      return 'Start here'
    case 'core':
      return 'Full lesson'
    case 'bridge':
      return 'Short lesson with reading'
    case 'step':
      return 'Capstone step'
  }
}

type WithBlocks = { segments: ReadonlyArray<{ blocks: ReadonlyArray<{ type: string }> }> }

/** Every block of a page, in order. */
export function blocksOf(page: { segments: readonly LessonSegment[] }): LessonBlock[] {
  return page.segments.flatMap((s) => s.blocks)
}

/** How many blocks of each type a page has, in first-seen order. A type outside the six is counted as it is. */
export function countBlockTypes(page: WithBlocks): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const s of page.segments) for (const b of s.blocks) counts[b.type] = (counts[b.type] ?? 0) + 1
  return counts
}

/** The block types a page uses that are not among the six, which GATE-lessons trips on. */
export function unknownBlockTypes(page: WithBlocks): string[] {
  const known: ReadonlySet<string> = new Set(BLOCK_TYPES)
  return Object.keys(countBlockTypes(page)).filter((t) => !known.has(t))
}
