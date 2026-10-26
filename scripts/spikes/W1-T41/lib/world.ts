// The gate's topology: the site on one origin, the instruments on another, and a third that stands in for a foreign site
// (a hostile embedder, or a link-out). Three loopback ports are the same-site, cross-origin layout W0-S02 measured on; the
// build's own origin strings are mapped onto them.
//
// A production build embeds https://instruments.<COURSE_DOMAIN> (the site's CSP frame-src and its bus client) and lists
// https://<COURSE_DOMAIN> as the instruments' parent (ARCHITECTURE.md sections 5.3 and 5.5). The gate reads the domain out of
// the site's CSP, then has both hosts rewrite those two strings in text responses, as a hosts file and a certificate would
// make the real names reach a local server. A build made without COURSE_DOMAIN embeds no frame, and the checks that need one
// report themselves skipped.

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findHostPage } from './budgets.ts'
import { findManifest, ManifestError, readManifest, type BuildManifest } from './manifest.ts'
import { startPagesServer, type LoggedRequest, type PagesServer } from './pages-server.ts'

/** A name for the build's domain when the gate builds the apps itself; a reserved .test name, never a real domain (OD-5). */
export const PLACEHOLDER_DOMAIN = 'statespace-gate.test'

function* htmlFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.vite') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* htmlFiles(full)
    else if (/\.html?$/i.test(e.name)) yield full
  }
}

/** The domain a site build was made for, read from its CSP's frame-src; null when it embeds no instrument frame. */
export function discoverCourseDomain(siteDir: string): string | null {
  for (const file of htmlFiles(siteDir)) {
    const m = /frame-src\s+https:\/\/instruments\.([a-z0-9.-]+)/i.exec(readFileSync(file, 'utf8'))
    if (m?.[1]) return m[1]
  }
  return null
}

/** A copy of a build to serve from, so a rebuild in the working tree cannot change what a run reads halfway through. */
export function snapshotDir(dir: string, label: string): string {
  const dest = mkdtempSync(join(tmpdir(), `ss-gate-${label}-`))
  cpSync(dir, dest, { recursive: true })
  return dest
}

export interface World {
  siteDir: string
  instrumentsDir: string
  site: PagesServer
  instruments: PagesServer
  foreign: PagesServer
  siteOrigin: string
  instrumentOrigin: string
  foreignOrigin: string
  courseDomain: string | null
  /** Every request any of the three hosts answered, in order. */
  requests: LoggedRequest[]
  /** host.html, relative to the instruments' root, and its URL; null when the build has no host page. */
  hostPage: string | null
  hostUrl: string | null
  /** The engine manifest, or why there is none. */
  manifest: BuildManifest | null
  manifestProblem: string | null
  close(): Promise<void>
}

export interface WorldOptions {
  siteDir: string
  instrumentsDir: string
  /** The domain the builds were made for; found from the site's CSP when omitted. */
  courseDomain?: string | null
  /** A directory for the foreign host; an empty page set when omitted. */
  foreignDir?: string
}

export async function startWorld(opts: WorldOptions): Promise<World> {
  const requests: LoggedRequest[] = []
  const courseDomain = opts.courseDomain === undefined ? discoverCourseDomain(opts.siteDir) : opts.courseDomain
  const origins = { site: '', instruments: '' }
  const rewrites = () =>
    courseDomain
      ? ([
          [`https://instruments.${courseDomain}`, origins.instruments],
          [`https://${courseDomain}`, origins.site],
        ] as const)
      : []
  const site = await startPagesServer({ label: 'site', dir: opts.siteDir, log: requests, rewrites })
  const instruments = await startPagesServer({ label: 'instruments', dir: opts.instrumentsDir, log: requests, rewrites })
  const foreign = await startPagesServer({ label: 'foreign', dir: opts.foreignDir ?? opts.siteDir, log: requests })
  origins.site = site.origin
  origins.instruments = instruments.origin

  let manifest: BuildManifest | null = null
  let manifestProblem: string | null = null
  const manifestFile = findManifest(opts.instrumentsDir)
  if (manifestFile) {
    try {
      manifest = readManifest(manifestFile)
    } catch (e) {
      manifestProblem = e instanceof ManifestError ? e.message : String(e)
    }
  } else manifestProblem = 'the instruments build has no engine manifest'

  const hostPage = findHostPage(opts.instrumentsDir)
  return {
    siteDir: opts.siteDir,
    instrumentsDir: opts.instrumentsDir,
    site,
    instruments,
    foreign,
    siteOrigin: site.origin,
    instrumentOrigin: instruments.origin,
    foreignOrigin: foreign.origin,
    courseDomain,
    requests,
    hostPage,
    hostUrl: hostPage ? `${instruments.origin}/${hostPage}` : null,
    manifest,
    manifestProblem,
    close: async () => {
      await Promise.all([site.close(), instruments.close(), foreign.close()])
    },
  }
}
