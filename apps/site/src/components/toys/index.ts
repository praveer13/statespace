// The lesson toys: small interactive figures, each in its own folder under components/toys/<slug>/, found here by their
// placement files so that adding a toy edits no shared file. A placement names the lesson, the segment the toy follows
// (1-based, the §n the page prints) and a loader; the page loads the toy lazily, so a lesson pays for a toy only when it
// opens.

import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

export interface ToyPlacement {
  /** The lesson's address, such as S1.L0. */
  readonly lesson: string
  /** The 1-based number of the segment the toy follows (the page's §n). */
  readonly afterSegment: number
  /** The figure's title, also its accessible name while it loads. */
  readonly title: string
  readonly load: () => Promise<{ default: ComponentType }>
}

const modules = import.meta.glob<{ placements: readonly ToyPlacement[] }>('./*/placement.ts', { eager: true })

const ALL: readonly ToyPlacement[] = Object.keys(modules)
  .sort()
  .flatMap((k) => modules[k]?.placements ?? [])

/** Every toy placed in a lesson, in folder order. */
export function toysFor(lessonId: string): ToyPlacement[] {
  return ALL.filter((p) => p.lesson === lessonId)
}

const loaded = new Map<ToyPlacement, LazyExoticComponent<ComponentType>>()

/** The lazy component for a placement, made once, so a re-render never loads or remounts it again. */
export function lazyToy(p: ToyPlacement): LazyExoticComponent<ComponentType> {
  let c = loaded.get(p)
  if (c === undefined) {
    c = lazy(p.load)
    loaded.set(p, c)
  }
  return c
}
