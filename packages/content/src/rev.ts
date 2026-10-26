// Revisions. itemRev is a fingerprint over an item's authored fields and the runs it cites (ARCHITECTURE.md
// section 3.3): an event graded against an older revision shows "re-check" and never deducts, so a revision
// changes exactly when what the learner was asked, or what a cited tool printed, changed. The fingerprint is
// 16 hexadecimal digits of a SHA-256 over canonical JSON.

import type { LessonBlock } from '@statespace/schema'
import { canonicalJson, fingerprint, sha256Hex } from './hash.ts'

/** What a revision reads besides the block: the content of the runs it cites and of its generator's template. */
export interface RevContext {
  /** The SHA-256 of a run record's canonical JSON, or null when the run is not recorded. */
  runHash(runId: string): string | null
  /** A fingerprint of a generator family's templates and key procedure, or null when the build cannot name one. */
  templateRev(family: string): string | null
}

/** The version of the fingerprint's input; a change to what it reads is a new version. */
export const REV_VERSION = 1

/** The hash of a run record as itemRev reads it. */
export function runRecordHash(record: unknown): string {
  return sha256Hex(canonicalJson(record))
}

/** A block without the fields the build derives, which are not authored. */
export function authoredFields(block: LessonBlock): Record<string, unknown> {
  const { itemRev: _itemRev, runs: _runs, minutes: _minutes, ...rest } = block as LessonBlock & { itemRev?: unknown; runs?: unknown; minutes?: unknown }
  return rest
}

/** The itemRev of an item or an instrument cell, given the runs its text and fields cite. */
export function itemRev(block: LessonBlock, cited: readonly string[], ctx: RevContext): string {
  const runs: Record<string, string | null> = {}
  for (const id of [...new Set(cited)].sort()) runs[id] = ctx.runHash(id)
  const template = block.type === 'item' ? ctx.templateRev(block.family) : null
  return fingerprint({ v: REV_VERSION, block: authoredFields(block), runs, template }, 16)
}
