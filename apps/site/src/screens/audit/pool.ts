// The audit pool as the Desk reads it: the file the content build writes (content/audit.<hash>.json, named by the
// manifest), loaded once per tab, and the small views every Desk screen shares.

import type { AuditAnchor, AuditCase, AuditPool, LineRef, TextPart } from '@statespace/content'
import { loadManifest } from '../../app/content.ts'

export type { AuditAnchor, AuditCase, AuditPool, LineRef, TextPart }

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
let held: Promise<AuditPool> | undefined

/** The pool, or an empty one when this build wrote none. A failed fetch is forgotten, so the next visit tries again. */
export function loadAudit(): Promise<AuditPool> {
  held ??= (async () => {
    const m = await loadManifest()
    if (m.audit === undefined || m.audit === '') return { format: '', classes: [], anchors: [], runs: {} }
    const res = await fetch(`${BASE}${m.audit}`)
    if (!res.ok) throw new Error(`${m.audit}: ${res.status} ${res.statusText}`)
    return (await res.json()) as AuditPool
  })().catch((e: unknown) => {
    held = undefined
    throw e
  })
  return held
}

/** Every case of the pool, with its anchor. */
export function allCases(pool: AuditPool): Array<{ anchor: AuditAnchor; c: AuditCase }> {
  return pool.anchors.flatMap((anchor) => anchor.cases.map((c) => ({ anchor, c })))
}

export function caseByRef(pool: AuditPool, ref: string): { anchor: AuditAnchor; c: AuditCase } | undefined {
  return allCases(pool).find((x) => x.c.ref === ref)
}

/** FNV-1a, 32-bit: a stable hash of a string (the same as the vendored rng's hash32). */
export function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * An anchor's cases in a fixed order that is not the file's: the file lists the sound member first, so a list in file
 * order would say which is which. The order is a permutation seeded by the anchor's ID, the same on every visit.
 */
export function browseOrder(anchor: AuditAnchor): AuditCase[] {
  return [...anchor.cases].sort((a, b) => hash32(`${anchor.id}|${a.id}`) - hash32(`${anchor.id}|${b.id}`))
}

const MEDIA: Record<string, string> = { z3py: 'Z3Py', 'smt-lib': 'SMT-LIB', lean: 'Lean', tla: 'TLA+', sql: 'SQL', rust: 'Rust' }
export const mediumName = (m: string): string => MEDIA[m] ?? m

/** The volume ink of a stage, S1 to S10. */
export const stageInk = (stage: string): string => `var(--vol-${stage.slice(1)})`

/** The text of one line reference, or undefined. */
export function lineText(c: AuditCase, ref: LineRef): string | undefined {
  const [part, n] = ref.split(':') as [TextPart, string]
  return c[part][Number(n) - 1]
}

export const PART_NAME: Record<TextPart, string> = { statement: 'Statement', diff: 'Change', receipt: 'Receipt' }
