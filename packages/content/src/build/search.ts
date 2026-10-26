// The search index for SCR-search: a build-time list of the IDs, lessons, drawers, knowledge components, labs,
// specimens and stages a learner can look for (spine section 10.1). It holds titles, names and the segment
// titles of a built page, and no body text, no option and no key, because a result list is not where an answer
// may appear (V2-05). A lesson or drawer is titled as its built page titles it, so a result reads as the page does
// ("Start here" for Boot, whose spine title names the internal tier). The routes are ARCHITECTURE.md section 3.2's.

import type { Entry, Registry } from '@statespace/ids'
import type { Lesson } from '@statespace/schema'
import { SEARCH_FORMAT } from '../output.ts'
import { pageTitle } from '../registry.ts'
import type { SearchEntry, SearchIndex } from '../output.ts'

const stageOfLab = (lab: string): string => `S${lab.slice('LAB-'.length)}`

/** Build the index from the registry and the pages that have been built. */
export function buildSearchIndex(registry: Registry, pages: readonly Lesson[]): SearchIndex {
  const built = new Map(pages.map((p) => [p.id, p]))
  const entries: SearchEntry[] = []
  const firstLesson = new Map<string, string>()
  for (const e of registry.entries) {
    if (e.kind === 'lesson') for (const kc of e.kcs ?? []) if (!firstLesson.has(kc)) firstLesson.set(kc, e.id)
  }
  const push = (e: SearchEntry): void => void entries.push(e)
  const text = (...parts: Array<string | undefined>): string => parts.filter((p): p is string => p !== undefined && p !== '').join(' · ')
  for (const e of registry.entries as readonly Entry[]) {
    switch (e.kind) {
      case 'stage':
        push({ id: e.id, kind: 'stage', title: e.title ?? e.id, href: `/stages/${e.id}`, stage: e.id, text: text(e.tagline) })
        break
      case 'lesson': {
        const page = built.get(e.id)
        push({ id: e.id, kind: 'lesson', title: pageTitle(e, page), href: `/lessons/${e.id}`, ...(e.stage === undefined ? {} : { stage: e.stage }), text: text(e.tier, ...(page?.segments.map((s) => s.title) ?? [])) })
        break
      }
      case 'drawer': {
        const page = built.get(e.id)
        push({ id: e.id, kind: 'drawer', title: pageTitle(e, page), href: `/drawers/${e.id}`, ...(e.stages?.[0] === undefined ? {} : { stage: e.stages[0] }), text: text(e.deferred === true ? 'deferred' : undefined, ...(page?.segments.map((s) => s.title) ?? [])) })
        break
      }
      case 'kc': {
        const lesson = firstLesson.get(e.id)
        push({ id: e.id, kind: 'kc', title: e.name ?? e.id, href: lesson === undefined ? `/stages/${e.stage ?? ''}` : `/lessons/${lesson}`, ...(e.stage === undefined ? {} : { stage: e.stage }), text: text(e.threshold === true ? 'threshold' : undefined, lesson) })
        break
      }
      case 'lab':
        push({ id: e.id, kind: 'lab', title: e.title ?? e.id, href: `/labs/${e.id}`, stage: stageOfLab(e.id), text: '' })
        break
      case 'lab-stage':
        push({ id: e.id, kind: 'lab-stage', title: e.title ?? e.id, href: `/labs/${e.lab ?? ''}`, ...(e.lab === undefined ? {} : { stage: stageOfLab(e.lab) }), text: text(e.stretch === true ? 'stretch' : undefined) })
        break
      case 'specimen':
        push({ id: e.id, kind: 'specimen', title: e.id, href: '/specimens', ...(e.lesson === undefined ? {} : { stage: e.lesson.split('.')[0] as string }), text: text(e.lesson) })
        break
      case 'claim-template':
        push({ id: e.id, kind: 'claim', title: e.id, href: '/claims', text: '' })
        break
      case 'anchor':
        push({ id: e.id, kind: 'anchor', title: e.id, href: '/audit', ...(e.stage === undefined ? {} : { stage: e.stage }), text: '' })
        break
      default:
        break
    }
  }
  return { format: SEARCH_FORMAT, entries }
}
