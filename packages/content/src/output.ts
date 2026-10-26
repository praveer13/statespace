// The shapes of the files the build writes and the site loads (section 2 of packages/content/README.md). Types and
// format names only, so the site imports them without the reader, the checks or the build.

import type { LessonLab, LessonStage } from '@statespace/schema'
import type { Tier } from './blocks.ts'

export const MANIFEST_FORMAT = 'statespace content manifest, revision 1'
export const STAGES_FORMAT = 'statespace stage pages, revision 1'
export const LABS_FORMAT = 'statespace lab pages, revision 1'
export const SEARCH_FORMAT = 'statespace search index, revision 1'
export const MARKDOWN_INDEX_FORMAT = 'statespace markdown index, revision 1'

export interface ManifestPage {
  /** The path of the page's JSON, under the public directory. */
  file: string
  /** The path of the page's Markdown. */
  md: string
  rev: string
  title: string
  tier?: Tier
  draft: boolean
  minutes: number
}

/** content/manifest.json: the entry point, at a stable URL. */
export interface Manifest {
  format: string
  /** The build date, YYYY-MM-DD: the title block's "Drawn". */
  builtAt: string
  /** A hash over every page's revision and every file's name: it changes when anything the site loads changes. */
  contentRev: string
  lessons: Record<string, ManifestPage>
  drawers: Record<string, ManifestPage>
  stages: string
  labs: string
  search: string
  /** The audit pool (content/audit.<hash>.json; audit-types.ts). Absent from manifests written before the Desk. */
  audit?: string
  md: string
  schemas: string
}

export interface StagePage {
  id: string
  title: string
  tagline: string
  lessons: Array<{ id: string; title: string; tier: string; kcs: string[]; built: boolean; minutes: number | null; draft: boolean | null }>
  lab: { id: string; title: string } | null
  labStages: Array<{ id: string; title: string; minutes: number; stretch: boolean }>
  anchors: string[]
  drawers: Array<{ id: string; title: string; deferred: boolean }>
  /** The stage's own data, or null while content/stages/<id>/stage.yaml is not written. */
  authored: LessonStage | null
  runs: Record<string, unknown>
  facts: Record<string, unknown>
  unresolved: string[]
}

export interface LabPage {
  id: string
  title: string
  stage: string
  stages: Array<{ id: string; title: string; minutes: number; stretch: boolean; weekend: boolean; what: string | null; checks: Array<{ id: string; label: string; passes: string | null }> }>
  summary: string | null
  extra: LessonLab['extra'] | null
  authored: boolean
  runs: Record<string, unknown>
  facts: Record<string, unknown>
  unresolved: string[]
}

export type SearchKind = 'stage' | 'lesson' | 'drawer' | 'kc' | 'lab' | 'lab-stage' | 'specimen' | 'claim' | 'anchor'

export interface SearchEntry {
  id: string
  kind: SearchKind
  title: string
  /** The route that shows it. */
  href: string
  /** The stage it belongs to, where it has one. */
  stage?: string
  /** Words to match besides the title: tier tags and segment titles, which stay in data and search (DESIGN.md). */
  text: string
}

export interface SearchIndex {
  format: string
  entries: SearchEntry[]
}

/** md/index.json: every page's Markdown, from which llms.txt is written. */
export interface MarkdownIndex {
  format: string
  pages: Array<{ id: string; kind: 'lesson' | 'drawer'; title: string; path: string }>
}
