// The site's module graph, read from its source, for the route budgets (lib/budgets.ts). Vite's build manifest says which chunk
// a lazily loaded module became, but not which module loads it when that module sits in the entry chunk (a router that imports
// every route.tsx eagerly puts them all there, and so a component they use statically), nor which modules a chunk written without
// a facade holds. So the gate reads the imports itself, the way Vite resolves them:
//   static   import … from '…', export … from '…' (not `import type`), import.meta.glob(…, { eager: true })
//   lazy     import('…'), import(`./dir/${x}.tsx`) (one path segment per substitution, as Vite's dynamic-import-vars expands it),
//            import.meta.glob(…) without eager
// A relative or root-absolute specifier resolves as Vite resolves one: the path, the path with each of Vite's extensions, a `.js`
// written for a `.ts` file, an index file. A bare one resolves through the package's `exports` (conditions browser, module,
// import, production, default), else its `module` or `main` field. A workspace package (its real path is outside node_modules) is
// read like the site's own code. A third-party package is a leaf: it is resolved, so a lazy import of it finds its chunk, and not
// read, because its chunk's own entry in the manifest lists what it loads lazily. A specifier with a query (`?url`, `?raw`,
// `?worker`) imports something other than the module's code and is not followed. An import() whose argument is neither a literal
// nor a template that starts with ./ or ../ is one Vite leaves as it is; it bundles nothing, so there is nothing to read.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import ts from 'typescript'

/** The files the graph reads; any other file a module imports (CSS, JSON, an image) is a leaf. */
const PARSED = /\.(?:[cm]?[jt]sx?)$/i
/** Vite's default resolve.extensions, in its order. */
const EXTENSIONS = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
/** A `.js` specifier may name a TypeScript file (TypeScript's own convention, which Vite follows). */
const TS_FOR: Record<string, string[]> = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] }
/** Export conditions of a production browser build (Vite's defaults, with `production` for the build). */
export const CONDITIONS: readonly string[] = ['browser', 'module', 'import', 'production', 'default']

export interface LazyImport {
  /** The specifier as written, or the glob a template or import.meta.glob expands to. */
  specifier: string
  /** The module it loads, as a real absolute path; null when it resolves to nothing. */
  to: string | null
}

export interface ModuleNode {
  file: string
  /** A module the graph does not read: a third-party package's, or a file that is not JavaScript or TypeScript. */
  leaf: boolean
  static: string[]
  lazy: LazyImport[]
}

const posixOf = (p: string): string => p.split(sep).join('/')
const escapeRe = (s: string): string => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')

/** The regular-expression body of a glob (picomatch's common forms: *, **, ?, {a,b}, [...]). */
function globBody(p: string): string {
  let re = ''
  for (let i = 0; i < p.length; i += 1) {
    const c = p[i] as string
    if (c === '*') {
      if (p[i + 1] === '*') {
        i += 1
        if (p[i + 1] === '/') {
          i += 1
          re += '(?:[^/]+/)*'
        } else re += '.*'
      } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else if (c === '{') {
      let depth = 1
      let j = i + 1
      for (; j < p.length && depth > 0; j += 1) depth += p[j] === '{' ? 1 : p[j] === '}' ? -1 : 0
      const inner = p.slice(i + 1, j - 1)
      const alts: string[] = []
      let d = 0
      let start = 0
      for (let k = 0; k < inner.length; k += 1) {
        if (inner[k] === '{') d += 1
        else if (inner[k] === '}') d -= 1
        else if (inner[k] === ',' && d === 0) {
          alts.push(inner.slice(start, k))
          start = k + 1
        }
      }
      alts.push(inner.slice(start))
      re += `(?:${alts.map(globBody).join('|')})`
      i = j - 1
    } else if (c === '[') {
      const end = p.indexOf(']', i + 1)
      if (end < 0) re += '\\['
      else {
        re += `[${p.slice(i + 1, end).replace(/^!/, '^')}]`
        i = end
      }
    } else re += escapeRe(c)
  }
  return re
}

export function globToRegExp(absPattern: string): RegExp {
  return new RegExp(`^${globBody(absPattern)}$`)
}

/** The directory a glob's matches lie under: its longest leading run of segments with no glob character. */
function globBase(absPattern: string): string {
  const parts = absPattern.split('/')
  const fixed: string[] = []
  for (const part of parts.slice(0, -1)) {
    if (/[*?{[]/.test(part)) break
    fixed.push(part)
  }
  return fixed.join('/') || '/'
}

function* filesUnder(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git') yield* filesUnder(full)
    } else if (e.isFile()) yield full
  }
}

const isImportMetaGlob = (e: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(e) &&
  e.name.text === 'glob' &&
  ts.isMetaProperty(e.expression) &&
  e.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
  e.expression.name.text === 'meta'

const stringsOf = (e: ts.Expression | undefined): string[] | null => {
  if (!e) return null
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text]
  if (ts.isArrayLiteralExpression(e)) {
    const out: string[] = []
    for (const x of e.elements) {
      if (!(ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x))) return null
      out.push(x.text)
    }
    return out
  }
  return null
}

const isEager = (e: ts.Expression | undefined): boolean =>
  e !== undefined &&
  ts.isObjectLiteralExpression(e) &&
  e.properties.some((p) => ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'eager' && p.initializer.kind === ts.SyntaxKind.TrueKeyword)

interface PackageJson {
  exports?: unknown
  module?: unknown
  browser?: unknown
  main?: unknown
}

/** The target an `exports` field gives a subpath ('.' or './x'), or null. */
export function exportsTarget(exp: unknown, subpath: string, conditions: readonly string[] = CONDITIONS): string | null {
  let map: Record<string, unknown>
  if (typeof exp === 'string' || Array.isArray(exp)) map = { '.': exp }
  else if (exp !== null && typeof exp === 'object') {
    const keys = Object.keys(exp)
    map = keys.length > 0 && keys.every((k) => k.startsWith('.')) ? (exp as Record<string, unknown>) : { '.': exp }
  } else return null
  const pick = (t: unknown, star: string): string | null => {
    if (typeof t === 'string') return t.replace(/\*/g, star)
    if (Array.isArray(t)) {
      for (const x of t) {
        const r = pick(x, star)
        if (r !== null) return r
      }
      return null
    }
    if (t !== null && typeof t === 'object') {
      for (const [k, v] of Object.entries(t)) {
        if (!conditions.includes(k)) continue
        const r = pick(v, star)
        if (r !== null) return r
      }
    }
    return null
  }
  if (Object.prototype.hasOwnProperty.call(map, subpath)) return pick(map[subpath], '')
  let best: { key: string; star: string } | null = null
  for (const key of Object.keys(map)) {
    const at = key.indexOf('*')
    if (at < 0) continue
    const pre = key.slice(0, at)
    const post = key.slice(at + 1)
    if (subpath.startsWith(pre) && subpath.endsWith(post) && subpath.length >= pre.length + post.length) {
      if (best === null || pre.length > best.key.indexOf('*')) best = { key, star: subpath.slice(pre.length, subpath.length - post.length) }
    }
  }
  return best === null ? null : pick(map[best.key], best.star)
}

export class ModuleGraph {
  /** The Vite root (apps/site), as a real path: the manifest's keys are relative to it. */
  readonly root: string
  private readonly nodes = new Map<string, ModuleNode>()
  private readonly packages = new Map<string, { dir: string; json: PackageJson } | null>()

  constructor(viteRoot: string) {
    this.root = realpathSync(viteRoot)
  }

  /** A module's key as Vite's manifest writes one: its path relative to the Vite root, with forward slashes. */
  key(file: string): string {
    return posixOf(relative(this.root, file))
  }

  /** The real path of the file a path names, trying Vite's extensions, a `.js` written for a `.ts` file, and an index file. */
  resolveFile(base: string): string | null {
    const file = (p: string): string | null => {
      try {
        return statSync(p).isFile() ? realpathSync(p) : null
      } catch {
        return null
      }
    }
    const exact = file(base)
    if (exact !== null) return exact
    for (const e of EXTENSIONS) {
      const r = file(base + e)
      if (r !== null) return r
    }
    const ext = extname(base)
    for (const alt of TS_FOR[ext] ?? []) {
      const r = file(base.slice(0, -ext.length) + alt)
      if (r !== null) return r
    }
    for (const e of EXTENSIONS) {
      const r = file(join(base, `index${e}`))
      if (r !== null) return r
    }
    return null
  }

  private findPackage(name: string, fromDir: string): { dir: string; json: PackageJson } | null {
    for (let dir = fromDir; ; dir = dirname(dir)) {
      const candidate = join(dir, 'node_modules', name)
      let hit = this.packages.get(candidate)
      if (hit === undefined) {
        const pj = join(candidate, 'package.json')
        hit = existsSync(pj) ? { dir: candidate, json: JSON.parse(readFileSync(pj, 'utf8')) as PackageJson } : null
        this.packages.set(candidate, hit)
      }
      if (hit !== null) return hit
      if (dirname(dir) === dir) return null
    }
  }

  /** The real path of the module a specifier names from a module, or null. A specifier with a query is not followed (null). */
  resolve(specifier: string, from: string): string | null {
    if (specifier.includes('?')) return null
    const spec = specifier.split('#')[0] ?? specifier
    if (spec.startsWith('./') || spec.startsWith('../')) return this.resolveFile(join(dirname(from), spec))
    if (spec.startsWith('/')) return this.resolveFile(join(this.root, spec))
    if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) return null // a URL, a virtual module or a node: builtin
    const parts = spec.split('/')
    const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? spec)
    const sub = spec.slice(name.length)
    const pkg = this.findPackage(name, dirname(from))
    if (pkg === null) return null
    if (pkg.json.exports !== undefined) {
      const target = exportsTarget(pkg.json.exports, `.${sub}`)
      return target === null ? null : this.resolveFile(join(pkg.dir, target))
    }
    if (sub !== '') return this.resolveFile(join(pkg.dir, sub))
    const field = [pkg.json.module, pkg.json.browser, pkg.json.main].find((f): f is string => typeof f === 'string') ?? 'index.js'
    return this.resolveFile(join(pkg.dir, field))
  }

  /** The files a glob of import.meta.glob or a template import() matches, from a module (the module itself excluded, as Vite does). */
  expandGlob(patterns: readonly string[], from: string): string[] {
    const keep: RegExp[] = []
    const drop: RegExp[] = []
    const bases: string[] = []
    for (const raw of patterns) {
      const negative = raw.startsWith('!')
      const p = negative ? raw.slice(1) : raw
      let abs: string
      if (p.startsWith('./') || p.startsWith('../')) abs = posixOf(join(dirname(from), p))
      else if (p.startsWith('/')) abs = posixOf(join(this.root, p))
      else continue // an alias: this graph does not read the Vite config
      ;(negative ? drop : keep).push(globToRegExp(abs))
      if (!negative) bases.push(globBase(abs))
    }
    const out = new Set<string>()
    for (const base of new Set(bases)) {
      for (const f of filesUnder(base)) {
        const p = posixOf(f)
        if (keep.some((r) => r.test(p)) && !drop.some((r) => r.test(p))) {
          const real = realpathSync(f)
          if (real !== from) out.add(real)
        }
      }
    }
    return [...out].sort()
  }

  /** One module's imports, read once. */
  node(file: string): ModuleNode {
    const cached = this.nodes.get(file)
    if (cached) return cached
    const leaf = !PARSED.test(file) || file.split(sep).includes('node_modules')
    const n: ModuleNode = { file, leaf, static: [], lazy: [] }
    this.nodes.set(file, n)
    if (leaf) return n
    const kind = /\.tsx$/i.test(file) ? ts.ScriptKind.TSX : /\.jsx$/i.test(file) ? ts.ScriptKind.JSX : /\.[cm]?js$/i.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, kind)
    const statics = new Set<string>()
    const addStatic = (spec: string): void => {
      const to = this.resolve(spec, file)
      if (to !== null) statics.add(to)
    }
    const addLazy = (specifier: string, to: string | null): void => {
      if (!n.lazy.some((l) => l.specifier === specifier && l.to === to)) n.lazy.push({ specifier, to })
    }
    const visit = (x: ts.Node): void => {
      if (ts.isImportDeclaration(x)) {
        if (!x.importClause?.isTypeOnly && ts.isStringLiteral(x.moduleSpecifier)) addStatic(x.moduleSpecifier.text)
      } else if (ts.isExportDeclaration(x)) {
        if (!x.isTypeOnly && x.moduleSpecifier && ts.isStringLiteral(x.moduleSpecifier)) addStatic(x.moduleSpecifier.text)
      } else if (ts.isCallExpression(x)) {
        if (x.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arg = x.arguments[0]
          if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
            if (!arg.text.includes('?')) addLazy(arg.text, this.resolve(arg.text, file))
          } else if (arg && ts.isTemplateExpression(arg)) {
            // Vite's dynamic-import-vars: a template that starts with ./ or ../ loads any file its glob matches
            const glob = arg.head.text + arg.templateSpans.map((s) => `*${s.literal.text}`).join('')
            if ((glob.startsWith('./') || glob.startsWith('../')) && !glob.includes('?')) {
              const hits = this.expandGlob([glob], file)
              if (hits.length === 0) addLazy(glob, null)
              for (const h of hits) addLazy(glob, h)
            }
          }
        } else if (isImportMetaGlob(x.expression)) {
          const patterns = stringsOf(x.arguments[0])
          if (patterns !== null) {
            const hits = this.expandGlob(patterns, file)
            if (isEager(x.arguments[1])) for (const h of hits) statics.add(h)
            else for (const h of hits) addLazy(patterns.join(','), h)
          }
        }
      }
      ts.forEachChild(x, visit)
    }
    visit(sf)
    n.static = [...statics]
    return n
  }

  /**
   * The modules reachable from a set of modules: through static imports, and through lazy ones too when `lazy` is set. A module
   * for which `stop` holds is not entered (unless it is a start).
   */
  reach(starts: Iterable<string>, opts: { lazy: boolean; stop?: (file: string) => boolean }): Set<string> {
    const seen = new Set<string>()
    const stack = [...starts]
    const startSet = new Set(stack)
    while (stack.length > 0) {
      const f = stack.pop() as string
      if (seen.has(f)) continue
      if (opts.stop && !startSet.has(f) && opts.stop(f)) continue
      seen.add(f)
      const n = this.node(f)
      for (const s of n.static) if (!seen.has(s)) stack.push(s)
      if (opts.lazy) for (const l of n.lazy) if (l.to !== null && !seen.has(l.to)) stack.push(l.to)
    }
    return seen
  }

  /** The modules the site starts from: index.html's module scripts, and the module of any other entry the build names. */
  entryModules(otherEntrySources: readonly string[] = []): string[] {
    const out: string[] = []
    const html = join(this.root, 'index.html')
    if (existsSync(html)) {
      for (const m of readFileSync(html, 'utf8').matchAll(/<script\b([^>]*)>/gi)) {
        const attrs = m[1] ?? ''
        if (!/\btype\s*=\s*["']?module\b/i.test(attrs)) continue
        const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
        if (!src || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src)) continue
        const clean = (src.replace(/^%BASE_URL%\/?/, '/').split(/[?#]/)[0] ?? src).replace(/^\/+/, '')
        const r = this.resolveFile(join(this.root, clean))
        if (r !== null) out.push(r)
      }
    }
    for (const s of otherEntrySources) {
      const r = this.resolveFile(join(this.root, s))
      if (r !== null) out.push(r)
    }
    return [...new Set(out)]
  }
}

/** The name Rollup gives a chunk written without a facade: the base name, less its last extension, of the module it ends with. */
export const chunkNameOf = (file: string): string => basename(file, extname(file))
