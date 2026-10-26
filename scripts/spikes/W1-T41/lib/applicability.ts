// Which of GATE-bundle's checks can bite yet. W1 builds the shell, the bus, the loader, Boot and the importer in parallel
// tasks; the gate lands first and must not turn red because a feature it checks has not been delivered, nor pass in
// silence on one it cannot see. So each check names the features it needs, and a feature counts as delivered when its
// owning task's deliverable is in the tree (a source directory with a file in it). A check whose features are all delivered
// is enforced: if the feature is there and the check cannot find what the documents say it should find, the check fails. A
// check with a missing feature is `pending` and names the task. `--enforce-all` (used by the planted fixtures) and
// `--strict` (the wave-exit review) turn every pending check into a failure.

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type FeatureId = 'shell' | 'sw' | 'bus' | 'loader' | 'boot' | 'receipt'

export interface Feature {
  id: FeatureId
  owner: string
  /** What the gate looks for, repository-relative. */
  paths: string[]
  /** What the feature gives the gate to check. */
  what: string
}

export const FEATURES: Record<FeatureId, Feature> = {
  shell: { id: 'shell', owner: 'W1-T02', paths: ['apps/site/src/screens/stages/route.tsx'], what: 'the shell' },
  sw: { id: 'sw', owner: 'W1-T02', paths: ['apps/site/src/sw'], what: 'the service worker' },
  bus: { id: 'bus', owner: 'W1-T35', paths: ['packages/bus/src'], what: 'the bus, host and manifest' },
  loader: { id: 'loader', owner: 'W1-T06', paths: ['apps/site/src/consent'], what: 'the loader' },
  boot: { id: 'boot', owner: 'W1-T09', paths: ['apps/site/src/screens/boot/route.tsx'], what: 'Boot' },
  receipt: { id: 'receipt', owner: 'W1-T14', paths: ['apps/instruments/src/engines/receipt', 'apps/site/src/screens/receipt'], what: 'the importer' },
}

function delivered(root: string, path: string): boolean {
  const abs = join(root, path)
  if (!existsSync(abs)) return false
  const st = statSync(abs)
  if (st.isFile()) return true
  // a directory counts once it holds a file (a bare .gitkeep does not)
  const stack = [abs]
  while (stack.length > 0) {
    const dir = stack.pop() as string
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) stack.push(join(dir, e.name))
      else if (e.name !== '.gitkeep') return true
    }
  }
  return false
}

export function featureDelivered(root: string, id: FeatureId): boolean {
  return FEATURES[id].paths.every((p) => delivered(root, p))
}

export type Applicability =
  | { status: 'enforced' }
  | { status: 'pending'; owner: string; why: string }
  | { status: 'skipped'; why: string }

export interface ApplicabilityInput {
  root: string
  requires: readonly FeatureId[]
  /** The check drives the instrument frame, which a build without COURSE_DOMAIN does not embed. */
  needsFrame?: boolean
  courseDomain: string | null
  enforceAll?: boolean
}

export function applicability(i: ApplicabilityInput): Applicability {
  if (!i.enforceAll) {
    const missing = i.requires.filter((f) => !featureDelivered(i.root, f))
    if (missing.length > 0) {
      const owners = [...new Set(missing.map((m) => FEATURES[m].owner))]
      return { status: 'pending', owner: owners.join(', '), why: `waits for ${missing.map((m) => `${FEATURES[m].owner} (${FEATURES[m].what})`).join(', ')}` }
    }
  }
  if (i.needsFrame && i.courseDomain === null) {
    return { status: 'skipped', why: 'this build embeds no instrument frame: it was made without COURSE_DOMAIN (run with --build, or build with COURSE_DOMAIN set)' }
  }
  return { status: 'enforced' }
}

/** Screen folders under apps/site/src/screens that hold a route.tsx: the screens a task has delivered. */
export function deliveredScreens(root: string): string[] {
  const dir = join(root, 'apps/site/src/screens')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && (existsSync(join(dir, e.name, 'route.tsx')) || existsSync(join(dir, e.name, 'route.ts'))))
    .map((e) => e.name)
    .sort()
}
