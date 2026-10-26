// Bundle budgets (ARCHITECTURE.md section 14). The figures are starting values carried over from kernelspace's budgets
// [ks100x section 7.3]; W6-T02 replaces them with logged measurements, so they live in one table here.
//
// What is counted [D]. Sizes are bytes on the wire as a Pages-like host sends them: gzip level 5 for text-like files
// (W0-S08 found GitHub Pages sending level 5), the file itself for a font or image. KB is 1000 bytes. Each row of section 14
// is held to the quantity its label names: the entry chunk and the Boot, Today and lesson routes are JavaScript (the CSS they
// name and the fonts that CSS declares are reported beside the figure and not counted); the instrument host page is a page, so
// its HTML, script and CSS count. Section 14 also says web fonts are "counted in the route budgets" and names no figure for
// them; a stylesheet declares every subset of a face, and a page loads only the subsets its text needs (unicode-range), so a
// static count would charge a route for files it never fetches. The routes' measured transfer, fonts included, is reported by
// the route checks instead, and COUNTED below is the one switch that makes CSS and fonts count. Three quantities, all read from
// Vite's build manifest (build.manifest is on in both apps):
//   entry   the static closure of index.html: what every route pays before its own code
//   route   everything a visit to the route can load beyond the entry, on render or later and at any depth. A screen lives in
//           apps/site/src/screens/<screen>/ and exports its routes from route.tsx (W1's rule), and a route usually loads its screen
//           lazily (React Router's `lazy`, React.lazy), so its code may sit in chunks of its own however the router imports
//           route.tsx. The manifest cannot say on its own which lazily loaded chunks are the route's when the module that loads
//           them sits in the entry chunk (a router that imports every route.tsx eagerly puts them there, with whatever they import
//           statically), so the route's chunks come from its source (lib/module-graph.ts):
//             1. the route's modules are the folder's modules that the build holds (reachable from index.html, or the facade of
//                a chunk), and every module they reach through static and lazy imports, the folder's own and any other
//                (components, workspace packages), never entering another screen's route module;
//             2. every module those modules load lazily is mapped to the chunk it became: the chunk whose facade it is, or,
//                when Rollup wrote the chunk without a facade (it shares a module with a part it loads lazily), the chunk that
//                carries the module's name (Rollup names such a chunk after the module it ends with); a module inside the
//                entry's closure, or inside the static imports of a chunk already counted, has no chunk of its own and adds
//                nothing;
//             3. a lazily loaded module that maps to no chunk and lies inside none counted, or an import the gate cannot
//                resolve, leaves the route unmeasurable, and the check fails saying so rather than passing.
//           Every chunk built from a module of the folder is the route's too. From those chunks the count follows static and
//           dynamic imports alike, and never enters a chunk of the entry's closure, which every route already pays for. The
//           lesson row's "excluding instrument engines" needs no rule here: engines are the instrument origin's files.
//   host    the instrument host page's closure, excluding the engines (workers and engine assets load on demand)
// A screen whose modules are all in the entry chunk, with everything they load lazily, adds nothing, and the entry budget binds.

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { wireSizeOfFile } from './manifest.ts'
import { chunkNameOf, ModuleGraph } from './module-graph.ts'

export type Component = 'js' | 'css' | 'fonts' | 'other'

/** What a budget counts, unless its row says otherwise [D]: JavaScript, as ARCHITECTURE.md section 14 labels its rows. */
export const COUNTED: readonly Component[] = ['js']

export interface Budget {
  id: string
  label: string
  /** Kilobytes of 1000 bytes. */
  kb: number
  /** The components of a payload this row counts; COUNTED when absent. */
  counts?: readonly Component[]
  /** The screen folder whose route chunk this budget bounds, for route budgets. */
  screen?: string
  /** The task that delivers the screen. */
  owner?: string
}

export const BUDGET_BASIS =
  '[D] ARCHITECTURE.md section 14: starting values from kernelspace [ks100x section 7.3]; W6-T02 replaces them with logged measurements'

export const BUDGETS: readonly Budget[] = [
  { id: 'budget.entry', label: 'entry chunk, compressed', kb: 250 },
  { id: 'budget.route.boot', label: 'Boot route', kb: 200, screen: 'boot', owner: 'W1-T09' },
  { id: 'budget.route.today', label: 'Today route', kb: 200, screen: 'today', owner: 'W1-T08' },
  { id: 'budget.route.lesson', label: 'a lesson route, excluding instrument engines', kb: 250, screen: 'lesson', owner: 'W1-T02' },
  { id: 'budget.host', label: 'instrument host page without engines', kb: 50, counts: ['js', 'css', 'other'] },
]

export const FONT_FAMILIES = ['Archivo', 'Source Serif 4', 'JuliaMono'] as const

export interface ViteChunk {
  file: string
  name?: string
  src?: string
  isEntry?: boolean
  isDynamicEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
  css?: string[]
  assets?: string[]
}
export type ViteManifest = Record<string, ViteChunk>

export function readViteManifest(distDir: string): ViteManifest | null {
  const file = join(distDir, '.vite', 'manifest.json')
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as ViteManifest
}

/** The manifest keys of a set of chunks and of everything they import statically. */
export function closureKeys(manifest: ViteManifest, keys: readonly string[]): Set<string> {
  const seen = new Set<string>()
  const visit = (key: string): void => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`the build manifest has no chunk ${key}`)
    for (const dep of chunk.imports ?? []) visit(dep)
  }
  for (const k of keys) visit(k)
  return seen
}

const filesOfChunk = (chunk: ViteChunk): string[] => [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]

/** The files (dist-relative) a set of chunks needs: each chunk's file, its CSS and assets, and those of its static imports. */
export function closureFiles(manifest: ViteManifest, keys: readonly string[]): Set<string> {
  const files = new Set<string>()
  for (const key of closureKeys(manifest, keys)) for (const f of filesOfChunk(manifest[key] as ViteChunk)) files.add(f)
  return files
}

/**
 * The files a set of root chunks can load beyond a base (the entry's closure): each chunk's file, CSS and assets, following static
 * and dynamic imports at any depth. The walk never enters a chunk of the base, because every route already carries it and what it
 * loads lazily is the entry's; a root that is itself in the base adds no file, but what it loads lazily is still the root's.
 */
export function reachableFiles(manifest: ViteManifest, roots: readonly string[], base: ReadonlySet<string>): Set<string> {
  const files = new Set<string>()
  const seen = new Set<string>()
  const rootSet = new Set(roots)
  const visit = (key: string): void => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`the build manifest has no chunk ${key}`)
    const inBase = base.has(key)
    if (inBase && !rootSet.has(key)) return
    if (!inBase) for (const f of filesOfChunk(chunk)) files.add(f)
    for (const dep of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) visit(dep)
  }
  for (const r of roots) visit(r)
  return files
}

// ---------------------------------------------------------------------------------------------- the chunks a module became

const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/i
const NOT_SOURCE = /\.(?:test|spec)\.[cm]?[jt]sx?$|\.d\.ts$|(?:^|\/)(?:__tests__|test|tests|e2e|fixtures)\//
/** A screen's route module, by its key: `src/screens/<screen>/route.tsx`. */
const ROUTE_MODULE = /^src\/screens\/([^/]+)\/route\.[cm]?[jt]sx?$/

export interface ChunkIndex {
  manifest: ViteManifest
  /** A module's key to the key of the chunk whose facade it is. */
  bySrc: Map<string, string>
  /** A chunk name to the chunks of that name written without a facade (no `src`) that something loads lazily. */
  facadeless: Map<string, string[]>
}

export function indexChunks(manifest: ViteManifest): ChunkIndex {
  const bySrc = new Map<string, string>()
  const loadedLazily = new Set<string>()
  for (const [key, c] of Object.entries(manifest)) {
    if (c.src !== undefined && /\.[cm]?js$/i.test(c.file)) bySrc.set(c.src, key)
    for (const d of c.dynamicImports ?? []) loadedLazily.add(d)
  }
  const facadeless = new Map<string, string[]>()
  for (const [key, c] of Object.entries(manifest)) {
    if (c.src !== undefined || !c.isDynamicEntry || !loadedLazily.has(key) || c.name === undefined) continue
    facadeless.set(c.name, [...(facadeless.get(c.name) ?? []), key])
  }
  return { manifest, bySrc, facadeless }
}

/** Whether a chunk's own imports name a chunk built from another screen's folder: then it is that screen's. */
function namesOtherScreen(index: ChunkIndex, key: string, screen: string): boolean {
  const c = index.manifest[key]
  for (const d of [...(c?.imports ?? []), ...(c?.dynamicImports ?? [])]) {
    const src = index.manifest[d]?.src ?? d
    const m = /^src\/screens\/([^/]+)\//.exec(src)
    if (m !== null && m[1] !== screen) return true
  }
  return false
}

/**
 * The chunks written without a facade that a module loaded lazily may have become: those that carry its name. When several do (each
 * screen's route.tsx chunk is named `route`), those whose own imports name a chunk built from another screen's folder are that
 * screen's and are dropped; what is still ambiguous is all counted, which can only overstate the route.
 */
export function facadelessChunksOf(index: ChunkIndex, file: string, screen: string): string[] {
  const found = index.facadeless.get(chunkNameOf(file)) ?? []
  if (found.length < 2) return found
  const own = found.filter((k) => !namesOtherScreen(index, k, screen))
  return own.length > 0 ? own : found
}

function* sourceFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') yield* sourceFiles(full)
    } else if (SOURCE_EXT.test(e.name)) yield full
  }
}

/** What the source says about the site as a whole: its module graph, the entry's static closure, and who loads what lazily. */
export interface SiteSource {
  graph: ModuleGraph
  /** Modules reachable from the entry through static imports: they are in the entry's chunks. */
  inEntry: Set<string>
  /** Modules reachable from the entry through any import: the modules the build can hold. */
  inBuild: Set<string>
  /** A module loaded lazily to the modules in the build that load it. */
  lazyImporters: Map<string, string[]>
}

export function readSiteSource(srcRoot: string, manifest: ViteManifest): SiteSource {
  const graph = new ModuleGraph(srcRoot)
  const others = Object.values(manifest)
    .filter((c) => c.isEntry && c.src !== undefined && !/\.html?$/i.test(c.src))
    .map((c) => c.src as string)
  const entries = graph.entryModules(others)
  const inEntry = graph.reach(entries, { lazy: false })
  const inBuild = graph.reach(entries, { lazy: true })
  const lazyImporters = new Map<string, string[]>()
  for (const m of inBuild) for (const l of graph.node(m).lazy) if (l.to !== null) lazyImporters.set(l.to, [...(lazyImporters.get(l.to) ?? []), m])
  return { graph, inEntry, inBuild, lazyImporters }
}

export interface RouteSource {
  /** Whether the build holds any of the screen's code: a module of its folder is reachable from the entry, or a chunk is built from one. */
  inBuild: boolean
  /** The chunks the route's lazily loaded modules became. */
  chunks: string[]
  /** How many modules the route loads lazily. */
  lazyModules: number
  /** Of those, how many have no chunk of their own: inside the entry's closure, or inside a counted chunk's static imports. */
  inside: number
  /** Chunks matched by name because Rollup wrote them without a facade: `module -> chunk`. */
  byName: string[]
  /** What leaves the route unmeasurable: a lazily loaded module with no chunk that lies inside none counted, an unresolvable import. */
  unmeasured: string[]
}

/** The route's lazily loaded chunks, from its source (the module comment, steps 1 to 3). */
export function routeFromSource(source: SiteSource, index: ChunkIndex, screen: string, inFolder: readonly string[]): RouteSource {
  const { graph } = source
  const out: RouteSource = { inBuild: false, chunks: [], lazyModules: 0, inside: 0, byName: [], unmeasured: [] }
  const folder = join(graph.root, 'src', 'screens', screen)
  const starts = new Set<string>()
  for (const abs of sourceFiles(folder)) {
    const real = realpathSync(abs)
    if (!NOT_SOURCE.test(graph.key(real)) && source.inBuild.has(real)) starts.add(real)
  }
  for (const k of inFolder) {
    const src = index.manifest[k]?.src
    const abs = src === undefined ? null : graph.resolveFile(join(graph.root, src))
    if (abs !== null) starts.add(abs)
  }
  if (starts.size === 0) return out
  out.inBuild = true
  const otherRoute = (f: string): boolean => {
    const m = ROUTE_MODULE.exec(graph.key(f))
    return m !== null && m[1] !== screen
  }
  // 1. the route's modules, and what they load lazily (a start that the router loads lazily is loaded lazily too)
  const reached = graph.reach(starts, { lazy: true, stop: otherRoute })
  const lazy = new Map<string, string>()
  for (const m of reached) {
    for (const l of graph.node(m).lazy) {
      if (l.to === null) out.unmeasured.push(`${graph.key(m)} loads '${l.specifier}' lazily, and the gate cannot resolve it to a file`)
      else if (!otherRoute(l.to) && !lazy.has(l.to)) lazy.set(l.to, m)
    }
  }
  for (const s of starts) {
    const from = source.lazyImporters.get(s)?.[0]
    if (from !== undefined && !lazy.has(s)) lazy.set(s, from)
  }
  out.lazyModules = lazy.size
  // 2. map each to its chunk: the chunk whose facade it is; else nothing, when it lies inside the entry's closure or inside the
  // static imports of a chunk already counted; else the chunk written without a facade that carries its name
  const chunks = new Set<string>()
  const counted = new Set<string>()
  for (const s of starts) if (index.bySrc.has(graph.key(s))) counted.add(s)
  const left: [string, string][] = []
  for (const [t, from] of lazy) {
    const k = index.bySrc.get(graph.key(t))
    if (k !== undefined) {
      chunks.add(k)
      counted.add(t)
    } else left.push([t, from])
  }
  const insideCounted = (): Set<string> => new Set([...source.inEntry, ...graph.reach(counted, { lazy: false })])
  let inside = insideCounted()
  const unnamed: [string, string][] = []
  for (const [t, from] of left) {
    if (inside.has(t)) {
      out.inside += 1
      continue
    }
    const found = facadelessChunksOf(index, t, screen)
    if (found.length === 0) {
      unnamed.push([t, from])
      continue
    }
    for (const k of found) chunks.add(k)
    counted.add(t)
    out.byName.push(`${graph.key(t)} -> ${found.join(', ')}`)
  }
  // 3. what is left maps to no chunk; it is measured only if it lies inside one counted now
  inside = insideCounted()
  for (const [t, from] of unnamed) {
    if (inside.has(t)) out.inside += 1
    else out.unmeasured.push(`${graph.key(from)} loads ${graph.key(t)} lazily, but the build manifest names no chunk for it (none whose facade it is, and none written without a facade under its name, ${chunkNameOf(t)}), and it lies inside no chunk the route counts`)
  }
  out.chunks = [...chunks].sort()
  return out
}

export interface Payload {
  files: string[]
  js: number
  css: number
  fonts: number
  other: number
  total: number
}

const FONT_EXT = /\.(woff2?|ttf|otf)$/i

export function payloadOf(distDir: string, files: Iterable<string>, extraFonts: Iterable<string> = []): Payload {
  const all = new Set([...files, ...extraFonts])
  const p: Payload = { files: [], js: 0, css: 0, fonts: 0, other: 0, total: 0 }
  for (const f of [...all].sort()) {
    const abs = join(distDir, f)
    if (!existsSync(abs)) continue
    const n = wireSizeOfFile(abs)
    p.files.push(f)
    if (/\.(m?js|cjs)$/i.test(f)) p.js += n
    else if (/\.css$/i.test(f)) p.css += n
    else if (FONT_EXT.test(f)) p.fonts += n
    else p.other += n
    p.total += n
  }
  return p
}

// ---------------------------------------------------------------------------------------------- fonts

export interface FontFace {
  family: string
  urls: string[]
  /** The CSS file that declares it, dist-relative. */
  css: string
}

export interface FontFinding {
  css: string
  family: string
  message: string
}

const FACE_BLOCK = /@font-face\s*\{([^}]*)\}/gi
const URL_TOKEN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi
/** `@import` of a stylesheet on another origin, in a built stylesheet or a page's inline style. */
const REMOTE_IMPORT = /@import\s+(?:url\(\s*)?['"]?((?:https?:)?\/\/[^'")\s;]+)/gi

export function fontFacesOf(cssText: string, cssFile: string): FontFace[] {
  const out: FontFace[] = []
  for (const m of cssText.matchAll(FACE_BLOCK)) {
    const body = m[1] ?? ''
    const family = /font-family\s*:\s*(['"]?)([^;'"]+)\1/i.exec(body)?.[2]?.trim() ?? '(unnamed)'
    const urls = [...body.matchAll(URL_TOKEN)].map((u) => u[2] ?? '')
    out.push({ family, urls, css: cssFile })
  }
  return out
}

/** A font URL's file in dist: absolute paths from the dist root, relative ones from the CSS file. Null for a remote URL. */
export function fontFileOf(url: string, cssFile: string): string | null {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return null
  const clean = url.split(/[?#]/)[0] ?? url
  return clean.startsWith('/') ? clean.slice(1) : posix.normalize(posix.join(posix.dirname(cssFile), clean))
}

function* walk(dir: string, skip: ReadonlySet<string> = new Set(['node_modules', '.vite'])): Generator<string> {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full, skip)
    else yield full
  }
}

/** The font manifest of W1-T01 (apps/site/public/fonts/fonts.json, `statespace/font-manifest@1`): every font file pinned by SHA-256. */
function checkFontManifest(siteDir: string, findings: FontFinding[]): number | null {
  const file = join(siteDir, 'fonts', 'fonts.json')
  if (!existsSync(file)) return null
  let doc: { files?: { file?: string; sha256?: string; bytes?: number }[] }
  try {
    doc = JSON.parse(readFileSync(file, 'utf8')) as typeof doc
  } catch (e) {
    findings.push({ css: 'fonts/fonts.json', family: '-', message: `the font manifest is not JSON: ${e instanceof Error ? e.message : String(e)}` })
    return null
  }
  const pinned = new Map<string, { sha256?: string; bytes?: number }>()
  for (const f of doc.files ?? []) if (f.file) pinned.set(f.file, f)
  for (const [name, pin] of pinned) {
    const abs = join(siteDir, 'fonts', name)
    if (!existsSync(abs)) {
      findings.push({ css: 'fonts/fonts.json', family: '-', message: `${name} is pinned but is not in the build` })
      continue
    }
    const body = readFileSync(abs)
    if (pin.bytes !== undefined && pin.bytes !== body.length) findings.push({ css: 'fonts/fonts.json', family: '-', message: `${name}: the manifest says ${pin.bytes} B, the file is ${body.length} B` })
    if (pin.sha256 !== undefined && pin.sha256 !== createHash('sha256').update(body).digest('hex')) findings.push({ css: 'fonts/fonts.json', family: '-', message: `${name}: the manifest's SHA-256 is not the file's` })
  }
  for (const abs of walk(join(siteDir, 'fonts'))) {
    const name = abs.slice(join(siteDir, 'fonts').length + 1)
    if (/\.(woff2?|ttf|otf)$/i.test(name) && !pinned.has(name)) findings.push({ css: 'fonts/fonts.json', family: '-', message: `${name} is a font file the manifest does not pin` })
  }
  return pinned.size
}

export interface FontReport {
  faces: FontFace[]
  findings: FontFinding[]
  /** Font files by the CSS file that declares them (dist-relative), so a closure can count its own. */
  filesByCss: Map<string, string[]>
  /** How many files the font manifest pins, or null when the build has none. */
  pinned: number | null
}

/**
 * Self-hosted subsets only (DESIGN.md section 3.4): every @font-face in every stylesheet of the build names one of the three
 * faces, loads WOFF2 from the site's own files (or a local() face), and the file exists. Stylesheets and preloads that point
 * at another origin are findings too.
 */
export function checkFonts(siteDir: string): FontReport {
  const faces: FontFace[] = []
  const findings: FontFinding[] = []
  const filesByCss = new Map<string, string[]>()
  const remoteImports = (rel: string, text: string): void => {
    for (const m of text.matchAll(REMOTE_IMPORT)) findings.push({ css: rel, family: '-', message: `${rel} imports ${m[1]}: nothing loads from another origin` })
  }
  for (const abs of walk(siteDir)) {
    const rel = abs.slice(siteDir.length + 1).split('\\').join('/')
    if (/\.css$/i.test(rel)) {
      const cssText = readFileSync(abs, 'utf8')
      remoteImports(rel, cssText)
      for (const face of fontFacesOf(cssText, rel)) {
        faces.push(face)
        // the exact family names W1-T01's generator writes (DESIGN.md section 3.4); 'Archivo Black' is another face
        const allowed = (FONT_FAMILIES as readonly string[]).includes(face.family)
        if (!allowed) findings.push({ css: rel, family: face.family, message: `${face.family} is not one of ${FONT_FAMILIES.join(', ')}` })
        for (const u of face.urls) {
          const file = fontFileOf(u, rel)
          if (file === null) {
            findings.push({ css: rel, family: face.family, message: `${u} is a remote font: fonts are self-hosted subsets` })
            continue
          }
          if (!/\.woff2$/i.test(file)) findings.push({ css: rel, family: face.family, message: `${u} is not WOFF2` })
          if (!existsSync(join(siteDir, file))) findings.push({ css: rel, family: face.family, message: `${u} is not in the build` })
          else filesByCss.set(rel, [...(filesByCss.get(rel) ?? []), file])
        }
      }
    } else if (/\.html?$/i.test(rel)) {
      const html = readFileSync(abs, 'utf8')
      for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
        const tag = m[0]
        const href = /href\s*=\s*(['"])(.*?)\1/i.exec(tag)?.[2] ?? ''
        const relAttr = /rel\s*=\s*(['"])(.*?)\1/i.exec(tag)?.[2] ?? ''
        if (/^(?:https?:)?\/\//i.test(href) && /stylesheet|preload|preconnect/i.test(relAttr)) {
          findings.push({ css: rel, family: '-', message: `${rel} links ${href} (${relAttr}): nothing loads from another origin` })
        }
      }
      remoteImports(rel, html)
    }
  }
  const pinned = checkFontManifest(siteDir, findings)
  return { faces, findings, filesByCss, pinned }
}

// ---------------------------------------------------------------------------------------------- measurement

export interface RouteMeasure {
  screen: string
  /**
   * The manifest keys of the chunks the route owns: every chunk built from a module of its folder, and every chunk its modules
   * load lazily (the module comment). Empty when all of the screen's code, and all it loads lazily, is in the entry's closure.
   */
  roots: string[]
  /** The route module's own chunk, when the build splits route.tsx out; null when it sits inside another chunk. */
  key: string | null
  /** Everything a visit to the route can load beyond the entry: the roots and what they import, statically or lazily. */
  own: Payload
  /** The entry plus own. */
  withEntry: Payload
  /** What the source says (null when the sources were not read: then only chunks built from the folder are counted). */
  source: RouteSource | null
}

export interface SiteMeasure {
  entryKey: string
  entry: Payload
  routes: Map<string, RouteMeasure>
}

function fontsFor(report: FontReport, files: Iterable<string>): string[] {
  const out: string[] = []
  for (const f of files) if (f.endsWith('.css')) out.push(...(report.filesByCss.get(f) ?? []))
  return out
}

/**
 * The entry's and each screen's payload from the site's build manifest. `srcRoot` is the site's Vite root (apps/site), whose
 * source says which lazily loaded chunks are each route's (the module comment); without it only chunks built from a screen's
 * folder are counted, which is the manifest's whole knowledge. Null when the build has no manifest.
 */
export function measureSite(siteDir: string, screens: readonly string[], srcRoot: string | null = null): SiteMeasure | null {
  const manifest = readViteManifest(siteDir)
  if (!manifest) return null
  const entryKey = manifest['index.html'] ? 'index.html' : Object.keys(manifest).find((k) => manifest[k]?.isEntry)
  if (!entryKey) throw new Error('the site build manifest has no entry chunk')
  const report = checkFonts(siteDir)
  const entryKeys = closureKeys(manifest, [entryKey])
  const entryFiles = closureFiles(manifest, [entryKey])
  const entry = payloadOf(siteDir, entryFiles, fontsFor(report, entryFiles))
  const index = indexChunks(manifest)
  const source = srcRoot !== null && existsSync(srcRoot) ? readSiteSource(srcRoot, manifest) : null
  const routes = new Map<string, RouteMeasure>()
  for (const screen of screens) {
    const folder = `src/screens/${screen}/`
    const inFolder = Object.keys(manifest).filter((k) => /\.[cm]?js$/i.test(manifest[k]?.file ?? '') && (manifest[k]?.src ?? k).startsWith(folder))
    const fromSource = source === null ? null : routeFromSource(source, index, screen, inFolder)
    const roots = [...new Set([...inFolder, ...(fromSource?.chunks ?? [])])].sort()
    const key = inFolder.find((k) => ROUTE_MODULE.exec(manifest[k]?.src ?? k)?.[1] === screen) ?? null
    const own = new Set([...reachableFiles(manifest, roots, entryKeys)].filter((f) => !entryFiles.has(f)))
    const all = new Set([...entryFiles, ...own])
    routes.set(screen, {
      screen,
      roots,
      key,
      own: payloadOf(siteDir, own, fontsFor(report, own)),
      withEntry: payloadOf(siteDir, all, fontsFor(report, all)),
      source: fromSource,
    })
  }
  return { entryKey, entry, routes }
}

/** The largest files of a payload's JavaScript, for a report line: `assets/BootScreen-x.js 303.2 KB`. */
export function largestFiles(distDir: string, p: Payload, n = 2): string[] {
  return p.files
    .filter((f) => /\.(m?js|cjs)$/i.test(f))
    .map((f) => ({ f, size: wireSizeOfFile(join(distDir, f)) }))
    .sort((a, b) => b.size - a.size)
    .slice(0, n)
    .map((x) => `${x.f} ${kb(x.size)}`)
}

/** The instrument host page's payload: host.html and the closure of its script, without engine assets. Null when the build has no host page. */
export function measureHost(instrumentsDir: string, engineAssets: ReadonlySet<string> = new Set()): { payload: Payload; page: string } | null {
  const page = findHostPage(instrumentsDir)
  if (!page) return null
  const manifest = readViteManifest(instrumentsDir)
  const key = manifest ? Object.keys(manifest).find((k) => manifest[k]?.isEntry && /(^|\/)host\.html$/.test(manifest[k]?.src ?? k)) : undefined
  const scripts = manifest && key ? [...closureFiles(manifest, [key])] : []
  const files = [page, ...scripts.filter((f) => !engineAssets.has(f))]
  return { payload: payloadOf(instrumentsDir, files), page }
}

/** host.html under b/<buildId>/ when the build is versioned, else at the root. Dist-relative, or null. */
export function findHostPage(instrumentsDir: string): string | null {
  const b = join(instrumentsDir, 'b')
  if (existsSync(b)) {
    const builds = readdirSync(b, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(b, d.name, 'host.html')))
      .map((d) => d.name)
      .sort((x, y) => statSync(join(b, y)).mtimeMs - statSync(join(b, x)).mtimeMs)
    if (builds[0]) return `b/${builds[0]}/host.html`
  }
  return existsSync(join(instrumentsDir, 'host.html')) ? 'host.html' : null
}

export const kb = (bytes: number): string => `${(bytes / 1000).toFixed(1)} KB`

/** The bytes of a payload that a budget counts. */
export function countedBytes(p: Payload, b: Pick<Budget, 'counts'>): number {
  return (b.counts ?? COUNTED).reduce((n, c) => n + p[c], 0)
}

/** The components of a payload, marking those a budget does not count. */
export function payloadDetail(p: Payload, b: Pick<Budget, 'counts'> = {}): string {
  const counts = b.counts ?? COUNTED
  const part = (name: Component, label: string): string | null => (p[name] > 0 || counts.includes(name) ? `${label} ${kb(p[name])}${counts.includes(name) ? '' : ' not counted'}` : null)
  return [part('js', 'js'), part('css', 'css'), part('fonts', 'fonts declared'), part('other', 'other')].filter((x): x is string => x !== null).join(', ')
}

