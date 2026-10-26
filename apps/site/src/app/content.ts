// What the content build wrote (packages/content/README.md section 2), loaded on demand: the manifest at its stable URL,
// then the content-hashed files it names. Each file is fetched once per tab; a failed fetch is forgotten, so the next
// visit tries again.

import { useEffect, useState } from 'react'
import type { LabPage, Lesson, Manifest, ManifestPage, SearchIndex, StagePage } from '@statespace/content'
import names from './names.generated.json'

export type { LabPage, Lesson, Manifest, ManifestPage, SearchIndex, StagePage }

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

const cache = new Map<string, Promise<unknown>>()

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const held = cache.get(key) as Promise<T> | undefined
  if (held !== undefined) return held
  const p = load().catch((e: unknown) => {
    cache.delete(key)
    throw e
  })
  cache.set(key, p)
  return p
}

/** The manifest sits at a stable URL, so the browser revalidates it; the files it names carry their hash and never change. */
export const loadManifest = (): Promise<Manifest> => once('manifest', () => fetchJson<Manifest>('content/manifest.json', { cache: 'no-cache' }))

export const loadStages = (): Promise<StagePage[]> =>
  once('stages', async () => (await fetchJson<{ stages: StagePage[] }>((await loadManifest()).stages)).stages)

export const loadLabs = (): Promise<LabPage[]> => once('labs', async () => (await fetchJson<{ labs: LabPage[] }>((await loadManifest()).labs)).labs)

export const loadSearch = (): Promise<SearchIndex> => once('search', async () => fetchJson<SearchIndex>((await loadManifest()).search))

/** A lesson's or a drawer's entry in the manifest, or undefined when no page of that ID is built. */
export async function pageEntry(id: string): Promise<ManifestPage | undefined> {
  const m = await loadManifest()
  return m.lessons[id] ?? m.drawers[id]
}

/** A built lesson or drawer, or null when the build has no page of that ID. */
export function loadPage(id: string): Promise<Lesson | null> {
  return once(`page:${id}`, async () => {
    const entry = await pageEntry(id)
    return entry === undefined ? null : fetchJson<Lesson>(entry.file)
  })
}

/** Every lesson of the course in order, S1.L0 to S10.L7, with its stage: the order of the previous and next links. */
export async function courseLessons(): Promise<Array<StagePage['lessons'][number] & { stage: StagePage }>> {
  const stages = await loadStages()
  return stages.flatMap((stage) => stage.lessons.map((l) => ({ ...l, stage })))
}

/** The stage a lesson or a drawer belongs to: the stage that lists it. */
export async function stageOf(id: string): Promise<StagePage | undefined> {
  const stages = await loadStages()
  return stages.find((s) => s.lessons.some((l) => l.id === id) || s.drawers.some((d) => d.id === id))
}

// ---- names the registry does not carry: the spine's titles for claim templates and specimens

const NAMES = names as { claims: Record<string, string>; specimens: Record<string, string> }

export const claimName = (id: string): string | undefined => NAMES.claims[id]
export const specimenName = (id: string): string | undefined => NAMES.specimens[id]

// ---- a small hook for promises

export type Loaded<T> = { readonly status: 'loading' } | { readonly status: 'ready'; readonly value: T } | { readonly status: 'error'; readonly message: string }

/** The value of `load()`, run again whenever a key changes. */
export function useLoaded<T>(load: () => Promise<T>, keys: readonly unknown[]): Loaded<T> {
  const [state, setState] = useState<{ key: string; loaded: Loaded<T> }>({ key: '', loaded: { status: 'loading' } })
  const key = JSON.stringify(keys)
  useEffect(() => {
    let live = true
    setState((s) => (s.key === key ? s : { key, loaded: { status: 'loading' } }))
    load().then(
      (value) => {
        if (live) setState({ key, loaded: { status: 'ready', value } })
      },
      (e: unknown) => {
        if (live) setState({ key, loaded: { status: 'error', message: e instanceof Error ? e.message : String(e) } })
      },
    )
    return () => {
      live = false
    }
    // `load` is a fresh closure on every render; the keys say when it means something new
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state.loaded : { status: 'loading' }
}
