// The ID registry as the pipeline reads it: lookups over @statespace/ids's generated entries. The registry is
// passed in, not imported, so a test can hold a small one and the build holds the real one.

import type { Entry, Kind, Registry } from '@statespace/ids'
import { tierFormat } from './blocks.ts'

export interface RegistryIndex {
  readonly registry: Registry
  entry(id: string): Entry | undefined
  /** Whether the registry holds the ID, as that kind. */
  has(kind: Kind, id: string): boolean
  byKind(kind: Kind): readonly Entry[]
  /** The number of templates the spine gives a generator family, or undefined for an ID that is not one. */
  templatesOf(family: string): number | undefined
}

export function indexRegistry(registry: Registry): RegistryIndex {
  const byId = new Map<string, Entry>()
  const kinds = new Map<string, Entry[]>()
  for (const e of registry.entries) {
    // An ID is unique across kinds, except where a proposed misconception and a gap class both read dp:G… never
    // overlap; keep the first so a lookup is stable.
    if (!byId.has(e.id)) byId.set(e.id, e)
    const list = kinds.get(e.kind) ?? []
    list.push(e)
    kinds.set(e.kind, list)
  }
  return {
    registry,
    entry: (id) => byId.get(id),
    has: (kind, id) => byId.get(id)?.kind === kind,
    byKind: (kind) => kinds.get(kind) ?? [],
    templatesOf: (family) => {
      const e = byId.get(family)
      return e?.kind === 'generator' ? e.templates : undefined
    },
  }
}

/** The stage of a lesson or a drawer's lesson ID: S1.L3 is in S1. */
export function stageOfLesson(lessonId: string): string | undefined {
  const m = /^(S[1-9][0-9]*)\.L[0-9]+$/.exec(lessonId)
  return m?.[1]
}

/**
 * The title a learner sees for a lesson or a drawer: the built page's, else the spine's. The spine titles Boot with its
 * internal name ("Boot: ..."), and learners see "Start here" (spine section 0), so a Boot lesson with no built page
 * is titled that.
 */
export function pageTitle(entry: Entry, page: { title: string } | undefined): string {
  if (page !== undefined) return page.title
  if (entry.kind === 'lesson' && entry.tier === 'boot') return tierFormat('boot')
  return entry.title ?? entry.id
}
