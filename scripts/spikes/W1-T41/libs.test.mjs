// Tests of GATE-bundle's library: the size reader, the manifest reader, the budgets, the Boot budget file, route discovery,
// feature detection and the Pages-like host. No browser needed.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { applicability, deliveredScreens, featureDelivered } from './lib/applicability.ts'
import { loadBootBudget, scaleFor } from './lib/boot-budget.ts'
import { BUDGETS, checkFonts, closureFiles, countedBytes, facadelessChunksOf, indexChunks, measureHost, measureSite, payloadOf } from './lib/budgets.ts'
import { BUDGET_EXPECTED, BUDGET_VARIANTS, makeBudgetTree } from './fixtures/make-budget-tree.ts'
import { loaderMismatches, promptReason } from './lib/loader.ts'
import { chunkNameOf, exportsTarget, globToRegExp, ModuleGraph } from './lib/module-graph.ts'
import { checkManifestIntegrity, parseManifest, ManifestError, readManifest, sha256Hex } from './lib/manifest.ts'
import { startPagesServer } from './lib/pages-server.ts'
import { canaryRoutes, discoverRoutes, planRoutes, ROUTE_TABLE, routeKind } from './lib/routes.ts'
import { loaderTotal, parseSizes, sizeMatches } from './lib/units.ts'
import { exitCodeFor, summarize, verdictLine } from './lib/report.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../../..')

function temp() {
  const dir = mkdtempSync(join(tmpdir(), 'ss-libs-'))
  return {
    dir,
    write(rel, body) {
      const f = join(dir, rel)
      mkdirSync(dirname(f), { recursive: true })
      writeFileSync(f, body)
      return f
    },
    rm: () => rmSync(dir, { recursive: true, force: true }),
  }
}

describe('reading the size a loader prints', () => {
  test('parses exact and rounded figures with their separators', () => {
    const [a, b, c, d] = parseSizes('12,893,420 B and 12.9 MB, 12.3 MiB, 12 893 420 bytes')
    assert.deepEqual([a.value, a.decimals, a.unit], [12893420, 0, 'B'])
    assert.deepEqual([b.value, b.decimals, b.unit], [12.9, 1, 'MB'])
    assert.deepEqual([c.value, c.decimals, c.unit], [12.3, 1, 'MiB'])
    assert.deepEqual([d.value, d.unit], [12893420, 'bytes'])
  })
  test('a rounded figure must be the manifest figure rounded to the digits shown', () => {
    const manifest = 12893420
    assert.equal(sizeMatches(parseSizes('12.9 MB')[0], manifest), true)
    assert.equal(sizeMatches(parseSizes('12.3 MiB')[0], manifest), true)
    assert.equal(sizeMatches(parseSizes('12,893 KB')[0], manifest), true)
    assert.equal(sizeMatches(parseSizes('12,893,420 B')[0], manifest), true)
    assert.equal(sizeMatches(parseSizes('12.8 MB')[0], manifest), false, 'one tenth short')
    assert.equal(sizeMatches(parseSizes('13 MB')[0], manifest), true, 'rounded to whole megabytes')
    assert.equal(sizeMatches(parseSizes('12,893,421 B')[0], manifest), false, 'one byte over')
    assert.equal(sizeMatches(parseSizes('12.9 MiB')[0], manifest), false, 'the unit decides')
  })
  test('takes the total after "of", else the largest figure', () => {
    assert.equal(loaderTotal('Downloading Z3 · 3.1 MB of 12.9 MB')?.raw, '12.9 MB')
    assert.equal(loaderTotal('Downloading Z3 · 12,893,420 B of 12,893,420 B')?.value, 12893420)
    assert.equal(loaderTotal('Downloading Z3: 12.9 MB, 3.1 MB so far')?.raw, '12.9 MB')
    assert.equal(loaderTotal('Downloading'), null)
  })
  test('a bit is not a byte and a bare number is not a size', () => {
    assert.deepEqual(parseSizes('12 Mb and 12 and 3 of 5'), [])
  })
})

describe('the engine manifest', () => {
  const asset = (path, wire, extra = {}) => ({ path, wire, bytes: wire * 2, ...extra })
  test('reads the spike shape, an array shape and a flat asset list', () => {
    const a = parseManifest({ build: 'b1', engines: { z3: { wireBytes: 30, assets: [asset('/p/a', 10), asset('/p/b', 20)] } } }, 'm.json')
    assert.equal(a.engines.get('z3').firstLoadBytes, 30)
    assert.equal(a.buildId, 'b1')
    const b = parseManifest({ engines: [{ engine: 'pglite', firstLoadBytes: 5, assets: [] }] }, 'm.json')
    assert.equal(b.engines.get('pglite').firstLoadBytes, 5)
    const c = parseManifest({ assets: [{ engine: 'z3', path: 'x', wire: 4 }, { engine: 'z3', path: 'y', wire: 6 }] }, 'm.json')
    assert.equal(c.engines.get('z3').firstLoadBytes, 10)
    assert.equal(c.engines.get('z3').declared, false)
  })
  test('says what it could not read', () => {
    assert.throws(() => parseManifest({ engines: { z3: { assets: [{ path: 'x' }] } } }, 'm.json'), /no first-load figure/)
    assert.throws(() => parseManifest({ nothing: 1 }, 'm.json'), ManifestError)
    assert.throws(() => parseManifest([], 'm.json'), /not a JSON object/)
  })
  test('checks assets against the files and the sum against the figure', () => {
    const t = temp()
    const body = Buffer.from('engine bytes')
    t.write('b/x/engines/a.bin', body)
    const m = parseManifest({ engines: { z3: { firstLoadBytes: 10, assets: [{ path: '/b/x/engines/a.bin', bytes: body.length, sha256: sha256Hex(body), wire: 10 }] } } }, join(t.dir, 'b/x/manifest.json'))
    assert.deepEqual(checkManifestIntegrity(m, t.dir), [])
    const wrong = parseManifest({ engines: { z3: { firstLoadBytes: 12, assets: [{ path: '/b/x/engines/a.bin', bytes: 3, sha256: 'ab', wire: 10 }, { path: '/b/x/gone.bin', wire: 1 }] } } }, join(t.dir, 'b/x/manifest.json'))
    const problems = checkManifestIntegrity(wrong, t.dir).map((p) => p.message).join('\n')
    assert.match(problems, /says 3 B/)
    assert.match(problems, /SHA-256/)
    assert.match(problems, /gone.bin is listed but is not in the build/)
    assert.match(problems, /first load is 12 B but its assets' wire sizes add to 11 B/)
    t.rm()
  })
  test('reads the manifest of the W0-S02 run, whose first load is the figure the course cites', () => {
    const m = readManifest(join(REPO, 'runs/RUN-phone-pyodide/manifest.json'))
    assert.equal(m.engines.get('z3').firstLoadBytes, 12893420)
  })
})

describe('bundle budgets', () => {
  const chunk = (file, extra = {}) => ({ file, ...extra })
  function site() {
    const t = temp()
    const fill = (n) => Buffer.from(Array.from({ length: n }, (_, i) => (i * 7919) % 251))
    t.write('assets/entry.js', fill(3000))
    t.write('assets/shared.js', fill(2000))
    t.write('assets/boot.js', fill(4000))
    t.write('assets/today.js', fill(1000))
    t.write('assets/entry.css', 'body{margin:0}')
    t.write('index.html', '<!doctype html>')
    t.write('.vite/manifest.json', JSON.stringify({
      'index.html': chunk('assets/entry.js', { isEntry: true, imports: ['_shared.js'], css: ['assets/entry.css'] }),
      '_shared.js': chunk('assets/shared.js'),
      'src/screens/boot/route.tsx': chunk('assets/boot.js', { isDynamicEntry: true, src: 'src/screens/boot/route.tsx', imports: ['_shared.js'] }),
    }))
    return t
  }
  test('the closure follows static imports, and a route is counted beyond the entry', () => {
    const t = site()
    const m = JSON.parse(readManifestText(t.dir))
    assert.deepEqual([...closureFiles(m, ['index.html'])].sort(), ['assets/entry.css', 'assets/entry.js', 'assets/shared.js'])
    const s = measureSite(t.dir, ['boot', 'today'])
    assert.ok(s.entry.total > 0)
    assert.deepEqual(s.routes.get('boot').own.files, ['assets/boot.js'], 'shared.js is already in the entry')
    assert.ok(s.routes.get('boot').withEntry.total > s.entry.total)
    assert.equal(s.routes.get('today').key, null, 'no chunk for a screen the build does not split')
    assert.deepEqual(s.routes.get('today').roots, [], 'so the entry budget binds')
    t.rm()
  })

  // the manifests Vite 7.3.7 wrote for each way a router can load a screen (fixtures/make-budget-tree.ts has the whole set)
  function lazyTree(manifest, sources = {}) {
    const t = temp()
    const fill = (n, seed) => Buffer.from(Array.from({ length: n }, (_, i) => (i * seed) % 251))
    let seed = 7
    for (const c of Object.values(manifest)) t.write(c.file, fill(c.file.includes('Big') || c.file.includes('Heavy') ? 9000 : 500, (seed += 6)))
    t.write('.vite/manifest.json', JSON.stringify(manifest))
    for (const [rel, text] of Object.entries(sources)) t.write(`src-root/${rel}`, text)
    return t
  }
  const entry = (dynamicImports) => ({ file: 'assets/index.js', src: 'index.html', isEntry: true, dynamicImports })
  const dyn = (src, file, extra = {}) => ({ file, src, isDynamicEntry: true, imports: ['index.html'], ...extra })
  test("a router that imports route.tsx eagerly: the screen route.tsx loads lazily from its folder is the route's", () => {
    const t = lazyTree({ 'index.html': entry(['src/screens/boot/BootScreen.tsx']), 'src/screens/boot/BootScreen.tsx': dyn('src/screens/boot/BootScreen.tsx', 'assets/BootScreen-Big.js') })
    const boot = measureSite(t.dir, ['boot']).routes.get('boot')
    assert.deepEqual(boot.roots, ['src/screens/boot/BootScreen.tsx'])
    assert.equal(boot.key, null, 'route.tsx itself is in the entry chunk')
    assert.deepEqual(boot.own.files, ['assets/BootScreen-Big.js'], 'and the entry chunk it imports is not counted again')
    t.rm()
  })
  test("a router that imports route.tsx lazily: route.tsx and the screen it loads lazily are both the route's", () => {
    const t = lazyTree({
      'index.html': entry(['src/screens/boot/route.tsx']),
      'src/screens/boot/route.tsx': dyn('src/screens/boot/route.tsx', 'assets/route.js', { dynamicImports: ['src/screens/boot/BootScreen.tsx'] }),
      'src/screens/boot/BootScreen.tsx': dyn('src/screens/boot/BootScreen.tsx', 'assets/BootScreen-Big.js'),
    })
    const boot = measureSite(t.dir, ['boot']).routes.get('boot')
    assert.equal(boot.key, 'src/screens/boot/route.tsx')
    assert.deepEqual(boot.own.files, ['assets/BootScreen-Big.js', 'assets/route.js'])
    t.rm()
  })
  test("what a lazily loaded screen loads lazily in turn, at any depth, is the route's; another screen's chunk is not", () => {
    const t = lazyTree({
      'index.html': entry(['src/screens/boot/route.tsx', 'src/screens/today/route.tsx']),
      'src/screens/boot/route.tsx': dyn('src/screens/boot/route.tsx', 'assets/route.js', { dynamicImports: ['src/screens/boot/BootScreen.tsx'] }),
      'src/screens/boot/BootScreen.tsx': dyn('src/screens/boot/BootScreen.tsx', 'assets/BootScreen.js', { dynamicImports: ['src/components/heavy/Heavy.tsx'] }),
      'src/components/heavy/Heavy.tsx': dyn('src/components/heavy/Heavy.tsx', 'assets/Heavy.js'),
      'src/screens/today/route.tsx': dyn('src/screens/today/route.tsx', 'assets/today-Big.js'),
    })
    const s = measureSite(t.dir, ['boot', 'today'])
    assert.deepEqual(s.routes.get('boot').own.files, ['assets/BootScreen.js', 'assets/Heavy.js', 'assets/route.js'])
    assert.deepEqual(s.routes.get('today').own.files, ['assets/today-Big.js'], "the entry's lazy imports of other screens stay theirs")
    t.rm()
  })
  // the site's entry as the gate reads it from the source: index.html, src/main.tsx, and a router that globs the screens eagerly
  const ENTRY_SOURCES = {
    'index.html': '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>t</title></head><body><script type="module" src="/src/main.tsx"></script></body></html>',
    'src/main.tsx': "import { screens } from './app/router.tsx'\nconsole.info(screens)\n",
    'src/app/router.tsx': "export const screens = import.meta.glob('../screens/*/route.tsx', { eager: true })\n",
  }
  test('route.tsx in the entry chunk that loads a component from another folder: the source names it, so the route counts it', () => {
    const manifest = { 'index.html': entry(['src/components/boot-cell/BootCell.tsx']), 'src/components/boot-cell/BootCell.tsx': dyn('src/components/boot-cell/BootCell.tsx', 'assets/BootCell-Big.js') }
    const route = "export const routes = [{ path: 'boot', lazy: async () => ({ Component: (await import('../../components/boot-cell/BootCell')).BootCell }) }]\n"
    const t = lazyTree(manifest, { ...ENTRY_SOURCES, 'src/screens/boot/route.tsx': route, 'src/components/boot-cell/BootCell.tsx': 'export function BootCell() { return null }\n' })
    assert.deepEqual(measureSite(t.dir, ['boot']).routes.get('boot').roots, [], 'the manifest alone cannot attribute it')
    const boot = measureSite(t.dir, ['boot'], join(t.dir, 'src-root')).routes.get('boot')
    assert.deepEqual(boot.roots, ['src/components/boot-cell/BootCell.tsx'])
    assert.deepEqual(boot.own.files, ['assets/BootCell-Big.js'])
    assert.equal(boot.source.inBuild, true)
    t.rm()
  })
  test("a screen in the entry whose component's own import() loads a heavy part: the route counts the part", () => {
    const part = 'src/components/cell/Engine.tsx'
    const manifest = { 'index.html': entry([part]), [part]: dyn(part, 'assets/Engine-Big.js') }
    const t = lazyTree(manifest, {
      ...ENTRY_SOURCES,
      'src/screens/boot/route.tsx': "import { BootScreen } from './BootScreen.tsx'\nexport const routes = [{ path: 'boot', Component: BootScreen }]\n",
      'src/screens/boot/BootScreen.tsx': "import { Cell } from '../../components/cell/index.ts'\nexport function BootScreen() { return Cell }\n",
      'src/components/cell/index.ts': "export { Cell } from './Cell.tsx'\nexport type { CellProps } from './types.ts'\n",
      'src/components/cell/Cell.tsx': "import { lazy } from 'react'\nexport const Cell = lazy(() => import('./Engine.tsx'))\n",
      [part]: 'export default function Engine() { return null }\n',
    })
    const boot = measureSite(t.dir, ['boot'], join(t.dir, 'src-root')).routes.get('boot')
    assert.deepEqual(boot.roots, [part], 'followed through the re-export of the component folder')
    assert.deepEqual([boot.source.lazyModules, boot.source.inside, boot.source.unmeasured], [1, 0, []])
    t.rm()
  })
  test('a chunk Rollup wrote without a facade is matched by the name of the module loaded lazily; with none, the route is unmeasurable', () => {
    const route = "export const routes = [{ path: 'boot', lazy: async () => ({ Component: (await import('./BootScreen.tsx')).BootScreen }) }]\n"
    const sources = { ...ENTRY_SOURCES, 'src/screens/boot/route.tsx': route, 'src/screens/boot/BootScreen.tsx': 'export function BootScreen() { return null }\n' }
    const named = lazyTree({ 'index.html': entry(['_BootScreen-x.js']), '_BootScreen-x.js': { file: 'assets/BootScreen-Big.js', name: 'BootScreen', isDynamicEntry: true, imports: ['index.html'] } }, sources)
    const boot = measureSite(named.dir, ['boot'], join(named.dir, 'src-root')).routes.get('boot')
    assert.deepEqual(boot.roots, ['_BootScreen-x.js'])
    assert.deepEqual(boot.source.byName, ['src/screens/boot/BootScreen.tsx -> _BootScreen-x.js'])
    named.rm()
    const other = lazyTree({ 'index.html': entry(['_Screen-x.js']), '_Screen-x.js': { file: 'assets/Screen-Big.js', name: 'Screen', isDynamicEntry: true, imports: ['index.html'] } }, sources)
    const unmeasured = measureSite(other.dir, ['boot'], join(other.dir, 'src-root')).routes.get('boot')
    assert.deepEqual(unmeasured.roots, [])
    assert.match(unmeasured.source.unmeasured.join('\n'), /src\/screens\/boot\/route\.tsx loads src\/screens\/boot\/BootScreen\.tsx lazily, but the build manifest names no chunk for it/)
    other.rm()
  })
  test('a module loaded lazily that the entry imports statically, or that a counted chunk imports statically, adds nothing and is measured', () => {
    const t = lazyTree(
      { 'index.html': entry(['src/screens/boot/route.tsx']), 'src/screens/boot/route.tsx': dyn('src/screens/boot/route.tsx', 'assets/route.js') },
      {
        ...ENTRY_SOURCES,
        'src/main.tsx': "import { screens } from './app/router.tsx'\nimport { shared } from './app/shared.ts'\nconsole.info(screens, shared)\n",
        'src/app/router.tsx': "export const screens = import.meta.glob('../screens/*/route.tsx')\n",
        'src/app/shared.ts': 'export const shared = 1\n',
        'src/screens/boot/route.tsx': "import { COPY } from './copy.ts'\nexport const a = () => import('../../app/shared.ts')\nexport const b = () => import('./copy.ts')\nexport const c = COPY\n",
        'src/screens/boot/copy.ts': "export const COPY = 'x'\n",
      },
    )
    const boot = measureSite(t.dir, ['boot'], join(t.dir, 'src-root')).routes.get('boot')
    assert.deepEqual(boot.roots, ['src/screens/boot/route.tsx'])
    assert.deepEqual([boot.source.lazyModules, boot.source.inside, boot.source.unmeasured], [3, 2, []], 'route.tsx itself, shared.ts in the entry, copy.ts in the route chunk')
    t.rm()
  })
  test('a screen the build does not hold is not in the build; one whose folder has a chunk is', () => {
    const t = lazyTree({ 'index.html': entry([]) }, { ...ENTRY_SOURCES, 'src/app/router.tsx': 'export const screens = {}\n', 'src/screens/boot/route.tsx': 'export const routes = []\n' })
    assert.equal(measureSite(t.dir, ['boot'], join(t.dir, 'src-root')).routes.get('boot').source.inBuild, false)
    t.rm()
  })
  test('several chunks without a facade under one name: those that name another screen\'s chunk are that screen\'s; the rest all count', () => {
    const m = {
      'index.html': { file: 'i.js', isEntry: true, dynamicImports: ['_route-a.js', '_route-b.js', '_index-c.js', '_index-d.js'] },
      '_route-a.js': { file: 'a.js', name: 'route', isDynamicEntry: true, dynamicImports: ['src/screens/today/TodayScreen.tsx'] },
      '_route-b.js': { file: 'b.js', name: 'route', isDynamicEntry: true, dynamicImports: ['src/screens/boot/BootScreen.tsx'] },
      'src/screens/today/TodayScreen.tsx': { file: 't.js', src: 'src/screens/today/TodayScreen.tsx', isDynamicEntry: true },
      'src/screens/boot/BootScreen.tsx': { file: 's.js', src: 'src/screens/boot/BootScreen.tsx', isDynamicEntry: true },
      '_index-c.js': { file: 'c.js', name: 'index', isDynamicEntry: true },
      '_index-d.js': { file: 'd.js', name: 'index', isDynamicEntry: true },
      '_lost-e.js': { file: 'e.js', name: 'lost', isDynamicEntry: true },
    }
    const index = indexChunks(m)
    assert.deepEqual(facadelessChunksOf(index, '/x/src/screens/boot/route.tsx', 'boot'), ['_route-b.js'])
    assert.deepEqual(facadelessChunksOf(index, '/x/src/screens/today/route.tsx', 'today'), ['_route-a.js'])
    assert.deepEqual(facadelessChunksOf(index, '/x/src/components/p/index.ts', 'boot'), ['_index-c.js', '_index-d.js'], 'still ambiguous: both count')
    assert.deepEqual(facadelessChunksOf(index, '/x/src/lost.ts', 'boot'), [], 'a chunk nothing loads lazily is no candidate')
    assert.equal(chunkNameOf('/x/y/BootScreen.tsx'), 'BootScreen')
    assert.equal(chunkNameOf('/x/y/worker.entry.ts'), 'worker.entry')
  })
  test('the planted budget trees: each fails its own budget only, and the control none', () => {
    for (const v of BUDGET_VARIANTS) {
      const t = temp()
      makeBudgetTree(t.dir, v)
      const site = measureSite(join(t.dir, 'apps/site/dist'), ['boot', 'today', 'lesson'], join(t.dir, 'apps/site'))
      const host = measureHost(join(t.dir, 'apps/instruments/dist'))
      const failing = BUDGETS.filter((b) => {
        const p = b.id === 'budget.entry' ? site.entry : b.id === 'budget.host' ? host.payload : site.routes.get(b.screen).own
        const src = b.screen ? site.routes.get(b.screen).source : null
        // as the gate rules: over the budget, or the route cannot be measured (none of it in the build, or a lazy load unaccounted)
        return countedBytes(p, b) > b.kb * 1000 || (src !== null && (!src.inBuild || src.unmeasured.length > 0))
      }).map((b) => b.id)
      assert.deepEqual(failing, BUDGET_EXPECTED[v], v)
      t.rm()
    }
  })
  test('counts a font with the CSS that declares it, and finds a remote font', () => {
    const t = site()
    t.write('fonts/archivo.woff2', Buffer.alloc(500, 1))
    t.write('assets/entry.css', "@font-face{font-family:'Archivo';src:url(/fonts/archivo.woff2) format('woff2')}")
    assert.deepEqual(checkFonts(t.dir).findings, [])
    assert.equal(measureSite(t.dir, []).entry.fonts, 500)
    t.write('assets/more.css', "@font-face{font-family:'Roboto';src:url(https://fonts.example/r.woff2)} @font-face{font-family:Archivo;src:url(/fonts/gone.ttf)} @font-face{font-family:'Archivo Black';src:url(/fonts/archivo.woff2)}")
    const messages = checkFonts(t.dir).findings.map((f) => f.message).join('\n')
    assert.match(messages, /Roboto is not one of/)
    assert.match(messages, /Archivo Black is not one of/, 'a family that only begins with an allowed name is another face')
    assert.match(messages, /remote font/)
    assert.match(messages, /not WOFF2/)
    assert.match(messages, /is not in the build/)
    t.write('index.html', '<link rel="stylesheet" href="https://cdn.example/x.css">')
    assert.match(checkFonts(t.dir).findings.map((f) => f.message).join('\n'), /nothing loads from another origin/)
    t.write('index.html', '<!doctype html>')
    t.write('assets/imports.css', '@import url(https://fonts.example/css2?family=Archivo);\n@import "//cdn.example/y.css";\nbody{margin:0}')
    const imports = checkFonts(t.dir).findings.filter((f) => f.css === 'assets/imports.css').map((f) => f.message)
    assert.equal(imports.length, 2, 'a built stylesheet that imports one from another origin, with and without its scheme')
    assert.ok(imports.every((m) => /imports .*nothing loads from another origin/.test(m)))
    t.rm()
  })
  test('the host page excludes engine assets', () => {
    const t = temp()
    t.write('host.html', '<!doctype html><title>h</title>')
    t.write('assets/host.js', 'x'.repeat(1000))
    t.write('engines/big.wasm', Buffer.alloc(100000, 3))
    t.write('.vite/manifest.json', JSON.stringify({ 'host.html': { file: 'assets/host.js', src: 'host.html', isEntry: true, assets: ['engines/big.wasm'] } }))
    const withEngine = measureHost(t.dir)
    const without = measureHost(t.dir, new Set(['engines/big.wasm']))
    assert.ok(withEngine.payload.total > without.payload.total + 50)
    assert.deepEqual(without.payload.files, ['assets/host.js', 'host.html'])
    t.rm()
  })
  test('the table holds the figures of ARCHITECTURE.md section 14', () => {
    const kb = Object.fromEntries(BUDGETS.map((b) => [b.id, b.kb]))
    assert.deepEqual(kb, { 'budget.entry': 250, 'budget.route.boot': 200, 'budget.route.today': 200, 'budget.route.lesson': 250, 'budget.host': 50 })
  })
  test('payloadOf counts a file as the host sends it', () => {
    const t = temp()
    const text = 'abc'.repeat(5000)
    t.write('a.js', text)
    t.write('f.woff2', Buffer.alloc(300, 9))
    const p = payloadOf(t.dir, ['a.js', 'f.woff2'])
    assert.equal(p.js, gzipSync(text, { level: 5 }).length)
    assert.equal(p.fonts, 300)
    t.rm()
  })
})
const readManifestText = (dir) => readFileSync(join(dir, '.vite/manifest.json'), 'utf8')

describe('the module graph the route budgets read (lib/module-graph.ts)', () => {
  function site() {
    const t = temp()
    t.write('apps/site/index.html', '<!doctype html><script type="module" src="%BASE_URL%src/main.tsx"></script><script src="/legacy.js"></script>')
    t.write('apps/site/src/main.tsx', "import './app/router.tsx'\nimport type { Only } from './types.ts'\nimport './styles.css'\nimport url from './logo.svg?url'\nexport type { More } from './types.ts'\nconsole.info(url)\n")
    t.write('apps/site/src/types.ts', 'export type Only = 1\nexport type More = 2\n')
    t.write('apps/site/src/styles.css', 'body{}')
    t.write('apps/site/src/logo.svg', '<svg/>')
    t.write(
      'apps/site/src/app/router.tsx',
      [
        "export const eager = import.meta.glob('../screens/{boot,today}/route.tsx', { eager: true })",
        "export const lazy = import.meta.glob(['../screens/*/route.tsx', '!../screens/{boot,today}/route.tsx'])",
        "export const deep = import.meta.glob('/src/sheets/**/*.ts')",
        'export const pick = (n: string) => import(`./pages/${n}.tsx`)',
        "export const odd = (n: string) => import('./pages/' + n)",
        "export const pkg = () => import('@scope/lib/sub')",
        "export const third = () => import('thirdparty')",
        "export const missing = () => import('./nowhere.ts')",
      ].join('\n'),
    )
    for (const s of ['boot', 'today', 'lesson', 'week']) t.write(`apps/site/src/screens/${s}/route.tsx`, 'export const routes = []\n')
    t.write('apps/site/src/screens/boot/BootScreen.tsx', 'export {}\n')
    t.write('apps/site/src/sheets/a.ts', 'export {}\n')
    t.write('apps/site/src/sheets/x/y/b.ts', 'export {}\n')
    t.write('apps/site/src/app/pages/One.tsx', "export { helper } from '../../lib/helper.js'\n")
    t.write('apps/site/src/app/pages/Two.tsx', 'export {}\n')
    t.write('apps/site/src/lib/helper.ts', 'export const helper = 1\n')
    // a workspace package (its real path is outside node_modules), with an exports map, and a third-party one
    t.write('packages/lib/package.json', JSON.stringify({ name: '@scope/lib', exports: { '.': './src/index.ts', './sub': { types: './src/sub.d.ts', import: './src/sub/index.ts' } } }))
    t.write('packages/lib/src/sub/index.ts', "export const load = () => import('./heavy.ts')\n")
    t.write('packages/lib/src/sub/heavy.ts', 'export {}\n')
    mkdirSync(join(t.dir, 'node_modules/@scope'), { recursive: true })
    symlinkSync(join(t.dir, 'packages/lib'), join(t.dir, 'node_modules/@scope/lib'))
    t.write('node_modules/thirdparty/package.json', JSON.stringify({ name: 'thirdparty', module: 'dist/index.mjs', main: 'dist/index.cjs' }))
    t.write('node_modules/thirdparty/dist/index.mjs', "export const x = () => import('./more.mjs')\n")
    return t
  }
  test('reads the entry, static imports, eager and lazy globs with negation, templates, and resolves as Vite does', () => {
    const t = site()
    const g = new ModuleGraph(join(t.dir, 'apps/site'))
    const key = (f) => g.key(f)
    const entries = g.entryModules()
    assert.deepEqual(entries.map(key), ['src/main.tsx'], 'the module script, through %BASE_URL%; a classic script is not an entry')
    const main = g.node(entries[0])
    assert.deepEqual(main.static.map(key).sort(), ['src/app/router.tsx', 'src/styles.css'], 'type-only imports and exports are not followed, nor a ?url import')
    const router = g.node(main.static.find((f) => f.endsWith('router.tsx')))
    assert.deepEqual(router.static.map(key).sort(), ['src/screens/boot/route.tsx', 'src/screens/today/route.tsx'], 'the eager glob, braces expanded')
    const lazy = router.lazy.map((l) => (l.to ? key(l.to) : `unresolved ${l.specifier}`))
    for (const want of ['src/screens/lesson/route.tsx', 'src/screens/week/route.tsx', 'src/sheets/a.ts', 'src/sheets/x/y/b.ts', 'src/app/pages/One.tsx', 'src/app/pages/Two.tsx', '../../packages/lib/src/sub/index.ts', '../../node_modules/thirdparty/dist/index.mjs', 'unresolved ./nowhere.ts']) assert.ok(lazy.includes(want), `${want} in ${lazy.join(', ')}`)
    assert.ok(!lazy.some((l) => /screens\/(boot|today)\//.test(l)), 'the negated patterns are left out of the lazy glob')
    assert.ok(!lazy.some((l) => l.includes("' + n")), 'an import() built with + bundles nothing and is not read')
    // a .js specifier names the .ts file; the workspace package is read, the third-party one is a leaf
    const one = g.node(router.lazy.find((l) => l.to?.endsWith('One.tsx')).to)
    assert.deepEqual(one.static.map(key), ['src/lib/helper.ts'])
    const sub = g.node(router.lazy.find((l) => l.to?.endsWith('sub/index.ts')).to)
    assert.equal(sub.leaf, false)
    assert.deepEqual(sub.lazy.map((l) => key(l.to)), ['../../packages/lib/src/sub/heavy.ts'])
    const third = g.node(router.lazy.find((l) => l.to?.includes('thirdparty')).to)
    assert.deepEqual([third.leaf, third.lazy.length], [true, 0])
    // reach: static only, or lazy too, and a stop that keeps out what it names
    const all = g.reach(entries, { lazy: true })
    assert.ok([...all].some((f) => f.endsWith('heavy.ts')))
    const stopped = g.reach(entries, { lazy: true, stop: (f) => f.includes('/packages/') })
    assert.ok(![...stopped].some((f) => f.includes('/packages/')))
    assert.ok(![...g.reach(entries, { lazy: false })].some((f) => f.endsWith('lesson/route.tsx')))
    t.rm()
  })
  test('globs and exports maps', () => {
    assert.ok(globToRegExp('/s/src/screens/*/route.tsx').test('/s/src/screens/boot/route.tsx'))
    assert.ok(!globToRegExp('/s/src/screens/*/route.tsx').test('/s/src/screens/a/b/route.tsx'))
    assert.ok(globToRegExp('/s/**/*.ts').test('/s/a.ts') && globToRegExp('/s/**/*.ts').test('/s/x/y/a.ts'))
    assert.ok(globToRegExp('/s/*.{ts,tsx}').test('/s/a.tsx') && !globToRegExp('/s/*.{ts,tsx}').test('/s/a.js'))
    assert.equal(exportsTarget({ '.': { types: './i.d.ts', import: './i.js', require: './i.cjs' } }, '.'), './i.js')
    assert.equal(exportsTarget({ './*': './src/*.ts' }, './a/b'), './src/a/b.ts')
    assert.equal(exportsTarget('./main.js', '.'), './main.js')
    assert.equal(exportsTarget({ import: './m.js' }, '.'), './m.js')
    assert.equal(exportsTarget({ '.': './i.js' }, './missing'), null)
    assert.equal(exportsTarget({ '.': { node: './n.js', default: './d.js' } }, '.'), './d.js')
  })
})

describe('the loader rules (lib/loader.ts)', () => {
  const frame = (at, container, extra = {}) => ({ at, progress: { tag: 'PROGRESS', max: 3000938, now: 0, valueText: null, label: 'Downloading Z3', container, ...extra } })
  test('loader.size reads every frame and every place, and names the frame', () => {
    const figure = 3000938
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 3.0 MB'), frame(75, 'Downloading Z3 · 0.4 MB of 3.0 MB')], figure), [])
    // right in the first frame, wrong later (a host's decoded total)
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 3.0 MB'), frame(125, 'Downloading Z3 · 0.4 MB of 12.9 MB'), frame(150, 'Downloading Z3 · 0.8 MB of 12.9 MB')], figure), ['the text around the bar prints "12.9 MB" from 125 ms after the tap (2 frames)'])
    // right to a screen reader, wrong to the eye
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 2.9 MB', { valueText: 'Downloading Z3 · 0 B of 3.0 MB' })], figure), ['the text around the bar prints "2.9 MB" from 25 ms after the tap (1 frame)'])
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 3.0 MB', { valueText: '0 B of 3.3 MB' })], figure), ['aria-valuetext prints "3.3 MB" from 25 ms after the tap (1 frame)'])
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 3.0 MB', { max: 3000939 })], figure), ["the bar's maximum is 3000939 from 25 ms after the tap (1 frame)"])
    assert.match(loaderMismatches([frame(25, 'Downloading Z3 · 0 B of 3.0 MB', { max: 100 })], figure)[0], /counts percent/)
    assert.deepEqual(loaderMismatches([frame(25, 'Downloading Z3', { max: 1 })], figure), [], 'a frame that states no total, and a bar with no byte count, have nothing to disagree with')
  })
  test('loader.noprompt: wording anywhere, and a size only in the loader box or a line it has shown', () => {
    const box = new Set(['Downloading Z3 · 0 B of 3.0 MB'])
    assert.equal(promptReason('Heads up: Z3 is a 3.0 MB download.', box), 'consent or warning wording')
    assert.equal(promptReason('Running Z3 live downloads 3.0 MB.', null), 'consent or warning wording')
    assert.equal(promptReason('Z3: 3.0 MB.', box), "a size stated outside the loader's box")
    assert.equal(promptReason('Running it live fetches 3.0 MB.', null), 'a size stated while no loader is on the page')
    assert.equal(promptReason('Downloading Z3 · 0 B of 3.0 MB', box), null, "the loader's own line, wherever a live region repeats it")
    assert.equal(promptReason('Recorded result · RUN-z3-boot-variant · Z3 5.3.1', null), null)
  })
})

describe('the Boot budget', () => {
  const budget = loadBootBudget(join(REPO, 'runs/RUN-phone-pyodide/budget.json'))
  test('reads the budget W0-S02 derived', () => {
    assert.equal(budget.provisional, true, 'no real-device report is merged yet')
    assert.equal(budget.latestTickMs, 200)
    assert.equal(budget.referenceYardstickMs, 530)
    assert.equal(budget.perEngine.chromium.warmLiveMs, 3797)
    assert.equal(budget.perEngine.chromium.coldCpuMs, 2449)
  })
  test('at the recording machine\'s own yardstick the thresholds are the table\'s and the throttle is 4x', () => {
    const s = scaleFor(budget, 'chromium', 120.3)
    assert.equal(s.warmLiveMs, 3797)
    assert.equal(s.coldCpuMs, 2449)
    assert.equal(s.throttleRate, 4)
    assert.equal(s.latestTickMs, 200)
  })
  test('a slower runner gets proportionally larger thresholds and less throttle', () => {
    const s = scaleFor(budget, 'chromium', 240.6)
    assert.equal(s.warmLiveMs, 7594)
    assert.equal(s.throttleRate, 2)
    assert.equal(scaleFor(budget, 'chromium', 900).throttleRate, 1, 'slower than the reference: no throttle')
  })
  test('rejects a file without the figures', () => {
    const t = temp()
    const f = t.write('b.json', JSON.stringify({ reference: {}, reference_values: {}, budget_ms: {}, ci_thresholds_ms: {} }))
    assert.throws(() => loadBootBudget(f), /no ci_thresholds_ms/)
    t.rm()
  })
})

describe('routes and features', () => {
  test('finds a route in every index.html and each top-level page', () => {
    const t = temp()
    t.write('index.html', 'x')
    t.write('today/index.html', 'x')
    t.write('stages/S1/index.html', 'x')
    t.write('offline.html', 'x')
    t.write('404.html', 'x')
    t.write('assets/index.html', 'x')
    t.write('b/xyz/host.html', 'x')
    assert.deepEqual(discoverRoutes(t.dir), ['/', '/today', '/offline', '/stages/S1'])
    t.rm()
  })
  test('holds a delivered screen to having a page, and tests undelivered ones only if the build has them', () => {
    const t = temp()
    t.write('apps/site/src/screens/today/route.tsx', 'export {}')
    t.write('apps/site/src/screens/week/notes.md', 'no route yet')
    t.write('dist/index.html', 'x')
    t.write('dist/extra/index.html', 'x')
    const plan = planRoutes(t.dir, join(t.dir, 'dist'))
    assert.deepEqual(plan.missing.map((m) => m.path), ['/today'])
    assert.deepEqual(plan.routes.map((r) => [r.path, r.required]), [['/', true], ['/extra', false]])
    assert.deepEqual(deliveredScreens(t.dir), ['today'])
    t.rm()
  })
  test('the fragment canary loads every table route in the build, /receipts included, and one page of each other kind', () => {
    const routes = ['/', '/boot', '/today', '/stages', '/claims', '/receipts', '/stages/S1', '/stages/S2', '/stages/S1/S1.L0', '/stages/S1/S1.L1', '/drawers/D-01', '/drawers/D-02', '/offline'].map((path) => ({ path }))
    assert.deepEqual(canaryRoutes(routes), ['/', '/boot', '/today', '/stages', '/claims', '/receipts', '/stages/S1', '/stages/S1/S1.L0', '/drawers/D-01', '/offline'])
    // whatever order the plan gives, no table route is dropped
    const everyTableRoute = ROUTE_TABLE.map((r) => ({ path: r.path }))
    assert.deepEqual(canaryRoutes([...everyTableRoute].reverse()), ROUTE_TABLE.map((r) => r.path).reverse())
    assert.ok(canaryRoutes(everyTableRoute).includes('/receipts'))
    assert.equal(routeKind('/stages/S1/S1.L0'), 'stages/3')
    assert.equal(routeKind('/'), '/0')
  })
  test('a feature counts once its directory holds a file', () => {
    const t = temp()
    assert.equal(featureDelivered(t.dir, 'loader'), false)
    t.write('apps/site/src/consent/.gitkeep', '')
    assert.equal(featureDelivered(t.dir, 'loader'), false)
    t.write('apps/site/src/consent/loader.tsx', 'export {}')
    assert.equal(featureDelivered(t.dir, 'loader'), true)
    t.rm()
  })
  test('pending names the task; no frame is skipped; enforce-all enforces', () => {
    const t = temp()
    const base = { root: t.dir, requires: ['loader', 'boot'], courseDomain: 'x.test' }
    const pending = applicability(base)
    assert.equal(pending.status, 'pending')
    assert.match(pending.why, /W1-T06 \(the loader\), W1-T09 \(Boot\)/)
    assert.equal(pending.owner, 'W1-T06, W1-T09')
    assert.equal(applicability({ ...base, enforceAll: true }).status, 'enforced')
    assert.equal(applicability({ ...base, enforceAll: true, courseDomain: null, needsFrame: true }).status, 'skipped')
    t.rm()
  })
})

describe('the verdict', () => {
  const r = (status, owner) => ({ id: 'x', group: 'g', status, detail: '', ...(owner ? { owner } : {}) })
  test('a failure fails, and pending or skipped fail only under strict', () => {
    assert.equal(exitCodeFor([r('pass'), r('pending', 'W1-T02')], false), 0)
    assert.equal(exitCodeFor([r('pass'), r('pending', 'W1-T02')], true), 1)
    assert.equal(exitCodeFor([r('pass'), r('skipped')], true), 1)
    assert.equal(exitCodeFor([r('pass'), r('fail')], false), 1)
  })
  test('the last line carries the counts and the owners of what is pending', () => {
    const line = verdictLine('GATE-bundle', [r('pass'), r('pending', 'W1-T02'), r('pending', 'W1-T02'), r('pending', 'W1-T06')], false)
    assert.equal(line, 'GATE-bundle: ok (1 passed, 0 failed, 3 pending, waiting on W1-T02 2, W1-T06 1)')
    assert.deepEqual(summarize([r('fail')]).failed, 1)
  })
})

describe('the Pages-like host', () => {
  async function get(url, { redirect = 'manual', headers = {} } = {}) {
    const res = await fetch(url, { redirect, headers })
    return { status: res.status, headers: res.headers, text: await res.text() }
  }
  function rawGet(origin, path, headers) {
    return new Promise((resolve, reject) => {
      http.get(origin + path, { headers }, (res) => {
        const parts = []
        res.on('data', (c) => parts.push(c))
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) }))
      }).on('error', reject)
    })
  }
  test('serves files as Pages does and nothing else', async () => {
    const t = temp()
    t.write('index.html', '<h1>home</h1>')
    t.write('today/index.html', '<h1>today</h1>')
    t.write('about.html', '<h1>about</h1>')
    t.write('404.html', '<h1>custom 404</h1>')
    const log = []
    const s = await startPagesServer({ label: 'site', dir: t.dir, log })
    try {
      assert.equal((await get(`${s.origin}/`)).text, '<h1>home</h1>')
      const dir = await get(`${s.origin}/today?x=1`)
      assert.equal(dir.status, 301)
      assert.equal(dir.headers.get('location'), '/today/?x=1')
      assert.equal((await get(`${s.origin}/today/`)).text, '<h1>today</h1>')
      assert.equal((await get(`${s.origin}/about`)).text, '<h1>about</h1>', 'an extension-less URL serves its .html')
      const missing = await get(`${s.origin}/no/such/page`)
      assert.equal(missing.status, 404, 'no single-page fallback')
      assert.equal(missing.text, '<h1>custom 404</h1>')
      assert.equal((await get(`${s.origin}/..%2F..%2Fetc/passwd`)).status, 404)
      assert.equal((await get(`${s.origin}/`, { headers: {} })).headers.get('cache-control'), 'max-age=600')
      assert.equal((await get(`${s.origin}/`)).headers.get('cross-origin-opener-policy'), null)
      assert.ok(log.some((l) => l.path === '/today?x=1' && l.status === 301))
    } finally {
      await s.close()
      t.rm()
    }
  })
  test('sends text gzip level 5 and a font as it is', async () => {
    const t = temp()
    const js = 'const a = 1;\n'.repeat(4000)
    t.write('a.js', js)
    t.write('f.woff2', Buffer.alloc(1000, 7))
    const log = []
    const s = await startPagesServer({ label: 'site', dir: t.dir, log })
    try {
      const a = await rawGet(s.origin, '/a.js', { 'accept-encoding': 'gzip' })
      assert.equal(a.headers['content-encoding'], 'gzip')
      assert.equal(a.body.length, gzipSync(js, { level: 5 }).length)
      const plain = await rawGet(s.origin, '/a.js', {})
      assert.equal(plain.headers['content-encoding'], undefined)
      assert.equal(plain.body.length, js.length)
      const f = await rawGet(s.origin, '/f.woff2', { 'accept-encoding': 'gzip' })
      assert.equal(f.headers['content-encoding'], undefined)
      assert.equal(f.body.length, 1000)
      assert.equal(log.find((l) => l.path === '/a.js' && l.encoding === 'gzip')?.bytes, a.body.length)
      const etag = a.headers.etag
      assert.equal((await rawGet(s.origin, '/a.js', { 'accept-encoding': 'gzip', 'if-none-match': etag })).status, 304)
    } finally {
      await s.close()
      t.rm()
    }
  })
  test('shapes a chosen path to a rate, overrides a path and rewrites origin strings', async () => {
    const t = temp()
    t.write('engines/e.bin', Buffer.alloc(200_000, 5))
    t.write('p.html', '<a href="https://instruments.gate.test/x">https://gate.test/</a>')
    const log = []
    const s = await startPagesServer({ label: 'site', dir: t.dir, log, rewrites: () => [['https://instruments.gate.test', 'http://i'], ['https://gate.test', 'http://m']] })
    try {
      s.setShape({ mbps: 4, rttMs: 0, match: /^\/engines\// })
      const t0 = Date.now()
      const r = await rawGet(s.origin, '/engines/e.bin', {})
      const took = Date.now() - t0
      assert.equal(r.body.length, 200_000)
      assert.ok(took >= 250, `200 kB at 4 Mbit/s takes about 0.4 s, took ${took} ms`)
      assert.ok(took < 2000, `took ${took} ms`)
      s.setShape(null)
      const t1 = Date.now()
      await rawGet(s.origin, '/engines/e.bin', {})
      assert.ok(Date.now() - t1 < 200)
      assert.equal((await get(`${s.origin}/p.html`)).text, '<a href="http://i/x">http://m/</a>')
      s.override('/p.html', 'overridden', 'text/plain')
      assert.equal((await get(`${s.origin}/p.html`)).text, 'overridden')
      s.override('/p.html', null)
      assert.match((await get(`${s.origin}/p.html`)).text, /http:\/\/i/)
    } finally {
      await s.close()
      t.rm()
    }
  })
})
