#!/usr/bin/env node
// Writes dist/sw.js, the main origin's service worker (ARCHITECTURE.md sections 4.2 and 16), from the vendored
// kernelspace worker (vendor/kernelspace/public/sw.js), which is never edited in place (section 4.1). The vendored
// worker's four rules hold unchanged: the kill switch, index.html network-first with a 3-s timeout then the precached
// shell, hashed assets cache-first, and the schema handshake; it never touches IndexedDB. This step does what upstream's
// build-sw-manifest.ts does (fills the BUILD placeholder) and applies statespace's rewrites, each of which must match
// the vendored text exactly once, so a drift in the vendored file fails the build instead of shipping a half-patched
// worker:
//
//   1. cache names and the handshake's meta key take the `ss-` prefix, and the offline page says statespace;
//   2. the vendored capstone page leaves the static-page list (statespace has none; BUILD.staticPages carries it);
//   3. the content build's hashed files (content/<name>.<12 hex>.json) are cache-first like assets/, and the first
//      lesson file a stage serves caches the rest of that stage's lessons (lesson content cached per stage on its
//      first visit).
//
// The precache is the app shell (the entry's closure and index.html), Today, search, settings, the lesson screen with Boot (S1.L0) and its
// content, the content manifest, the stage and search indexes, and the self-hosted fonts.
//
//   node apps/site/src/sw/build-sw.mjs [DIST] [--kill]     DIST defaults to apps/site/dist
//
// --kill writes the kill-switch worker instead: deployed, it unregisters itself and deletes its caches.

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = resolve(HERE, '..', '..')
const REPO = resolve(SITE, '..', '..')
const args = process.argv.slice(2)
const kill = args.includes('--kill')
const dist = resolve(args.find((a) => !a.startsWith('--')) ?? join(SITE, 'dist'))

const fail = (msg) => {
  process.stderr.write(`build-sw: ${msg}\n`)
  process.exit(1)
}

/** The ledger data version the bundle was built for: the handshake's baseline (apps/site/src/storage/db.ts). */
function schemaVersion() {
  const src = readFileSync(join(SITE, 'src/storage/db.ts'), 'utf8')
  const m = /export const LEDGER_DATA_VERSION = (\d+)/.exec(src)
  if (!m) fail('apps/site/src/storage/db.ts has no LEDGER_DATA_VERSION')
  return Number(m[1])
}

/** The route chunks whose closures are precached, with their own lazy chunks: Today, the lesson screen (Boot), and search and settings, whose own data (the search index, this browser's record) works offline. */
const ROUTES = ['src/screens/today/TodayScreen.tsx', 'src/screens/lesson/LessonRoute.tsx', 'src/screens/search/SearchScreen.tsx', 'src/screens/settings/SettingsScreen.tsx']
/** Lessons precached with the shell: Boot. */
const PRECACHE_LESSONS = ['S1.L0']

function collectPrecache(manifest, content) {
  const files = new Set()
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) fail(`the Vite manifest has no chunk ${key}`)
    files.add(chunk.file)
    for (const f of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) files.add(f)
    for (const dep of chunk.imports ?? []) visit(dep)
  }
  if (!manifest['index.html']) fail('the Vite manifest has no index.html entry; is build.manifest on?')
  visit('index.html')
  for (const src of ROUTES) {
    if (!manifest[src]) fail(`the Vite manifest has no chunk for ${src}; is it still a lazy route?`)
    // A route's lazy chunks, transitively: a lesson draws its toys and instrument cells lazily, and a lesson read offline
    // must not stop at a chunk it never fetched online.
    const lazy = [src]
    const walked = new Set()
    while (lazy.length > 0) {
      const key = lazy.pop()
      if (walked.has(key)) continue
      walked.add(key)
      visit(key)
      for (const dep of [...(manifest[key].imports ?? []), ...(manifest[key].dynamicImports ?? [])]) lazy.push(dep)
    }
  }
  files.add('content/manifest.json')
  for (const k of ['stages', 'search']) if (typeof content[k] === 'string') files.add(content[k])
  for (const id of PRECACHE_LESSONS) if (content.lessons?.[id]) files.add(content.lessons[id].file)
  if (existsSync(join(dist, 'fonts'))) for (const f of readdirSync(join(dist, 'fonts'))) if (f.endsWith('.woff2')) files.add(`fonts/${f}`)
  files.add('index.html')
  return [...files].sort()
}

/** statespace's rewrites of the vendored worker: [what, vendored text, replacement]. */
function rewrites() {
  const STAGE_CACHE = `
  /** Hashed content-build files (content/<name>.<12 hex>.json): immutable, so cache-first like assets/. */
  const HASHED_CONTENT = /^content\\/[\\w.-]+\\.[0-9a-f]{12}\\.json$/
  /** A lesson's file names its stage: content/S5.L3.<hash>.json. */
  const LESSON_FILE = /^content\\/(S\\d+)\\.L\\d+\\.[0-9a-f]{12}\\.json$/
  const stagesCached = new Set()
  /** On a stage's first lesson visit, cache the rest of that stage's lessons from the content manifest. */
  async function cacheStage(stage) {
    if (killed || stagesCached.has(stage)) return
    stagesCached.add(stage)
    try {
      const manifestUrl = SCOPE + 'content/manifest.json'
      const res = (await caches.match(manifestUrl, { ignoreVary: true })) ?? (await fetch(manifestUrl))
      const lessons = (await res.json()).lessons ?? {}
      const cache = await caches.open(RUNTIME)
      for (const [id, entry] of Object.entries(lessons)) {
        if (killed || !id.startsWith(stage + '.') || typeof entry.file !== 'string') continue
        const url = SCOPE + entry.file
        if (await caches.match(url, { ignoreVary: true })) continue
        const file = await fetch(url)
        if (file.ok) await cache.put(url, file)
      }
    } catch {
      stagesCached.delete(stage) // offline mid-way: the next visit tries again
    }
  }

  self.addEventListener('fetch', (event) => {`
  return [
    ['kill switch for --kill', 'const KILL_SWITCH = false', kill ? 'const KILL_SWITCH = true' : 'const KILL_SWITCH = false'],
    ['cache prefix', "const PREFIX = 'ks-'", "const PREFIX = 'ss-'"],
    ['meta cache', "const META_CACHE = 'ks-meta'", "const META_CACHE = 'ss-meta'"],
    ['meta key', '`${SCOPE}__ks-sw-meta`', '`${SCOPE}__ss-sw-meta`'],
    ['static pages', "new Set([new URL(SCOPE).pathname + 'capstone-sandbox.html'])", 'new Set(BUILD.staticPages.map((p) => new URL(SCOPE).pathname + p))'],
    ['offline page', '<title>kernelspace offline</title>', '<title>statespace offline</title>'],
    ['stage cache', "\n  self.addEventListener('fetch', (event) => {", STAGE_CACHE],
    [
      'content rule',
      'if (bare.startsWith(`${SCOPE}assets/`)) {\n      event.respondWith(assetFirst(event))',
      'if (bare.startsWith(`${SCOPE}assets/`) || HASHED_CONTENT.test(bare.slice(SCOPE.length))) {\n      event.respondWith(assetFirst(event))\n      const lesson = LESSON_FILE.exec(bare.slice(SCOPE.length))\n      if (lesson) event.waitUntil(cacheStage(lesson[1]))',
    ],
  ]
}

const PLACEHOLDER = '/*__SW_BUILD__*/ null'

const manifestPath = join(dist, '.vite/manifest.json')
if (!existsSync(manifestPath)) fail(`${manifestPath} is missing; run vite build first`)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const contentPath = join(dist, 'content/manifest.json')
if (!existsSync(contentPath)) fail(`${contentPath} is missing; run the content build first`)
const content = JSON.parse(readFileSync(contentPath, 'utf8'))
const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8')

const precache = collectPrecache(manifest, content)
for (const f of precache) if (!existsSync(join(dist, f))) fail(`the precache lists ${f}, which is not in ${dist}`)
const hash = createHash('sha256').update(indexHtml).update('\0').update(precache.join('\n'))
for (const f of precache) if (!f.startsWith('assets/')) hash.update('\0').update(readFileSync(join(dist, f)))
const build = { id: hash.digest('hex').slice(0, 12), schema: schemaVersion(), shell: 'index.html', precache, staticPages: [] }

let source = readFileSync(join(REPO, 'vendor/kernelspace/public/sw.js'), 'utf8')
for (const [what, from, to] of rewrites()) {
  const n = source.split(from).length - 1
  if (n !== 1) fail(`rewrite "${what}" matched the vendored worker ${n} times, not once; vendor/kernelspace/public/sw.js changed`)
  source = source.replace(from, () => to)
}
if (!source.includes(PLACEHOLDER)) fail('the vendored worker has no BUILD placeholder to fill')
source = source.replace(PLACEHOLDER, () => JSON.stringify(build, null, 2))
const header = `/* statespace service worker: written by apps/site/src/sw/build-sw.mjs from the vendored kernelspace worker,\n   with statespace's rewrites applied. Do not edit; edit the build step. */\n`
writeFileSync(join(dist, 'sw.js'), header + source)
process.stdout.write(`build-sw: sw.js ${kill ? 'KILL SWITCH' : `build ${build.id}`}, schema ${build.schema}, ${precache.length} precached files\n`)
