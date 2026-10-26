// Small trees for GATE-bundle's budget checks through the command line, with no browser: a site build (Vite's manifest and the
// files it names), the site's source as the gate reads it (index.html, src/main.tsx, a router that discovers the screens with
// import.meta.glob, and the screens' modules), an instrument host page. The control passes every budget.* check; each other
// variant is over one budget and only that one. The manifests copy the shapes that the pinned Vite (7.3.7 [X RUN-scaffold])
// wrote when apps/site was built in throwaway copies with each way a router can load a screen, while this harness was made (a
// development observation, not a recorded run; the shapes matter here, not the sizes): the router importing route.tsx eagerly
// (`import.meta.glob(..., { eager: true })`, so route.tsx and what it imports statically sit in the entry chunk) or lazily
// (route.tsx a chunk of its own), route.tsx importing its screen statically or lazily, from its folder or from elsewhere, and
// Rollup writing a lazily loaded module's chunk without a facade (key `_<Name>-<hash>.js`, no `src`) when the module shares a
// module with a part it loads lazily in turn.
//
//   control              every budget passes. The router imports Boot's route.tsx eagerly (so Boot is all in the entry) and the
//                        others lazily. The control also holds the shapes the measurement must count right rather than fail,
//                        each a guard against a rule taken out: Boot's and Today's route.tsx load lazily a module the entry
//                        imports statically, and the lesson's route.tsx one it imports statically itself, so none of them has a
//                        chunk of its own and each adds nothing; Today's and the lesson's route.tsx chunks are written without a
//                        facade, both named `route`, each naming its own screen's chunk (so each route takes its own, and the
//                        lesson's 210 KB screen never lands on Today or Boot); and the Boot screen uses a helper that imports
//                        the router, whose lazy imports of the other screens are theirs, not Boot's
//   entry-over           the entry chunk is over 250 KB                                                  budget.entry
//   host-over            the instrument host page is over 50 KB                                          budget.host
//   boot-split-over      a lazily loaded route.tsx that holds the Boot screen is over 200 KB; the router
//                        discovers the screens through an alias (`@/screens/*/route.tsx`), which the gate
//                        does not read, so the rule that every chunk built from the folder is the route's
//                        is what counts it                                                                budget.route.boot
//   boot-lazy-eager      route.tsx is in the entry and loads the Boot screen lazily from its folder       budget.route.boot
//   boot-lazy-glob       route.tsx is loaded lazily and loads the Boot screen lazily from its folder     budget.route.boot
//   boot-lazy-other      route.tsx is in the entry and loads ../../components/boot-cell/BootCell lazily  budget.route.boot
//   boot-lazy-deep       the Boot screen, loaded lazily, loads ../../components/heavy/Heavy lazily       budget.route.boot
//   boot-lazy-package    the Boot screen, loaded lazily, loads a third-party package lazily, whose chunk
//                        loads the package's heavy part lazily in turn (an import() inside the package,
//                        which the gate does not read: the manifest's lazy imports are what count it)     budget.route.boot
//   boot-lazy-component  a lazily loaded route.tsx holds the screen, which uses a component that loads a
//                        heavy part lazily (the import() is written in the component, outside the folder) budget.route.boot
//   boot-facadeless-eager  route.tsx is in the entry and loads the screen lazily; Rollup wrote the screen's
//                        chunk without a facade (`_BootScreen-x.js`, name BootScreen), and it is heavy     budget.route.boot
//   boot-lazy-facadeless the same, the screen's cell loading an engine client lazily from its click
//                        handler, the client and the cell sharing a module                                budget.route.boot
//   boot-entry-component route.tsx is in the entry and imports the screen statically; the screen uses
//                        ../../components/cell/Cell.tsx, whose click handler loads a heavy part lazily      budget.route.boot
//   boot-eager-component the same, the component (../../components/instrument-cell/InstrumentCell.tsx, reached
//                        through its folder's index.ts, which re-exports it) loading its heavy part on render
//                        with React's lazy                                                                 budget.route.boot
//   boot-unmapped        route.tsx is in the entry and loads the screen lazily, and the manifest names no
//                        chunk for the screen (only a heavy chunk without a facade under another name):
//                        the route cannot be measured, which fails                                         budget.route.boot
//   boot-unbuilt         the shell is delivered, but its router does not discover Boot's route.tsx, so the
//                        build holds none of the screen: the route cannot be measured, which fails          budget.route.boot
//   today-over           the Today route is over 200 KB                                                  budget.route.today
//   lesson-over          the lesson route is over 250 KB                                                 budget.route.lesson
//
// Built at run time, so no large file is committed: a payload is pseudo-random base64 text (mulberry32), which gzip shrinks to
// about three quarters, so 400,000 characters are about 300 KB on the wire and 2,000 characters are about 1.5 KB.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mulberry32 } from '../lib/fuzz.ts'

export type BudgetVariant =
  | 'control'
  | 'entry-over'
  | 'host-over'
  | 'boot-split-over'
  | 'boot-lazy-eager'
  | 'boot-lazy-glob'
  | 'boot-lazy-other'
  | 'boot-lazy-deep'
  | 'boot-lazy-package'
  | 'boot-lazy-component'
  | 'boot-facadeless-eager'
  | 'boot-lazy-facadeless'
  | 'boot-entry-component'
  | 'boot-eager-component'
  | 'boot-unmapped'
  | 'boot-unbuilt'
  | 'today-over'
  | 'lesson-over'

export const BUDGET_VARIANTS: readonly BudgetVariant[] = [
  'control',
  'entry-over',
  'host-over',
  'boot-split-over',
  'boot-lazy-eager',
  'boot-lazy-glob',
  'boot-lazy-other',
  'boot-lazy-deep',
  'boot-lazy-package',
  'boot-lazy-component',
  'boot-facadeless-eager',
  'boot-lazy-facadeless',
  'boot-entry-component',
  'boot-eager-component',
  'boot-unmapped',
  'boot-unbuilt',
  'today-over',
  'lesson-over',
]

/** The budget.* checks each variant must fail, and nothing else among `--only budget.` may. */
export const BUDGET_EXPECTED: Record<BudgetVariant, string[]> = {
  control: [],
  'entry-over': ['budget.entry'],
  'host-over': ['budget.host'],
  'boot-split-over': ['budget.route.boot'],
  'boot-lazy-eager': ['budget.route.boot'],
  'boot-lazy-glob': ['budget.route.boot'],
  'boot-lazy-other': ['budget.route.boot'],
  'boot-lazy-deep': ['budget.route.boot'],
  'boot-lazy-package': ['budget.route.boot'],
  'boot-lazy-component': ['budget.route.boot'],
  'boot-facadeless-eager': ['budget.route.boot'],
  'boot-lazy-facadeless': ['budget.route.boot'],
  'boot-entry-component': ['budget.route.boot'],
  'boot-eager-component': ['budget.route.boot'],
  'boot-unmapped': ['budget.route.boot'],
  'boot-unbuilt': ['budget.route.boot'],
  'today-over': ['budget.route.today'],
  'lesson-over': ['budget.route.lesson'],
}

/** The variants whose router imports Boot's route.tsx lazily, so that it is a chunk of its own; the others import it eagerly. */
const LAZY_BOOT: ReadonlySet<BudgetVariant> = new Set(['boot-split-over', 'boot-lazy-glob', 'boot-lazy-deep', 'boot-lazy-package', 'boot-lazy-component'])

const SMALL = 2_000
const BIG = 400_000
/** The lesson screen's size: about 210 KB on the wire, under the lesson's 250 KB and over Today's 200 KB were it counted there. */
const LESSON = 280_000
const HOST_BIG = 100_000

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** A module of `chars` pseudo-random characters, the same for the same seed. */
function module(seed: number, chars: number, extra = ''): string {
  const rand = mulberry32(seed)
  let s = ''
  for (let i = 0; i < chars; i += 1) s += ALPHABET[Math.floor(rand() * 64)]
  return `${extra}export const PAD = "${s}";\n`
}

interface Chunk {
  file: string
  name?: string
  src?: string
  isEntry?: boolean
  isDynamicEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
  css?: string[]
}

const lazyRoute = (path: string, specifier: string, name: string): string =>
  `import type { RouteObject } from 'react-router'\nexport const routes: RouteObject[] = [{ path: '${path}', lazy: async () => ({ Component: (await import('${specifier}')).${name} }) }]\n`
const staticRoute = (path: string, specifier: string, name: string): string =>
  `import type { RouteObject } from 'react-router'\nimport { ${name} } from '${specifier}'\nexport const routes: RouteObject[] = [{ path: '${path}', Component: ${name} }]\n`

export function makeBudgetTree(root: string, v: BudgetVariant): void {
  const put = (rel: string, body: string): void => {
    const f = join(root, rel)
    mkdirSync(dirname(f), { recursive: true })
    writeFileSync(f, body)
  }
  const src = (rel: string, body: string): void => put(`apps/site/${rel}`, body)
  const S = 'apps/site/dist'
  const manifest: Record<string, Chunk> = {}
  const entryDynamic: string[] = []
  // a chunk whose facade is the module `key` (Vite keys it by the module)
  const chunk = (key: string, file: string, chars: number, extra: Partial<Chunk> = {}, seed = file.length * 7919): void => {
    manifest[key] = { file, name: file.replace(/^assets\/|-[\w]+\.js$/g, ''), src: key, isDynamicEntry: true, imports: ['index.html'], ...extra }
    put(`${S}/${file}`, module(seed, chars))
  }
  // a chunk Rollup wrote without a facade: Vite keys it `_<file name>` and gives it no src
  const facadeless = (name: string, file: string, chars: number, extra: Partial<Chunk> = {}): string => {
    const key = `_${file.replace(/^assets\//, '')}`
    manifest[key] = { file, name, isDynamicEntry: true, imports: ['index.html'], ...extra }
    put(`${S}/${file}`, module(file.length * 6271, chars))
    return key
  }
  // a route module the router loads lazily is a chunk of its own
  const route = (screen: string, chars: number, extra: Partial<Chunk> = {}): void => {
    const key = `src/screens/${screen}/route.tsx`
    entryDynamic.push(key)
    chunk(key, `assets/route-${screen}.js`, chars, extra, screen.length * 104729)
  }

  // ---- the site's entry, as the gate reads it from the source
  src('index.html', '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><title>budget tree</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n')
  src('src/main.tsx', "import { routes } from './app/router.tsx'\nimport { shared } from './app/shared.ts'\nconsole.info(routes, shared)\n")
  src('src/app/shared.ts', 'export const shared = 1\n')
  // a helper a screen may use, which reads the router: the other screens it reaches through the router are theirs
  src('src/app/nav.ts', "import { routes } from './router.tsx'\nexport const destinations = () => Object.keys(routes)\n")
  src(
    'src/app/router.tsx',
    v === 'boot-split-over'
      ? "export const routes = import.meta.glob('@/screens/*/route.tsx')\n"
      : LAZY_BOOT.has(v)
      ? "export const routes = import.meta.glob('../screens/*/route.tsx')\n"
      : v === 'boot-unbuilt'
        ? "export const routes = import.meta.glob(['../screens/*/route.tsx', '!../screens/boot/route.tsx'])\n"
        : "const boot = import.meta.glob('../screens/boot/route.tsx', { eager: true })\nconst others = import.meta.glob(['../screens/*/route.tsx', '!../screens/boot/route.tsx'])\nexport const routes = { boot, others }\n",
  )
  // the shell is delivered (lib/applicability.ts reads its stages screen), so a screen its router leaves out is a failure
  if (v === 'boot-unbuilt') src('src/screens/stages/route.tsx', "export const routes = [{ path: 'stages', Component: () => null }]\n")

  // ---- Boot. By default route.tsx imports the screen statically and also loads it lazily, which adds no chunk: the screen is in
  // the entry chunk with route.tsx (the eager router), or in route.tsx's own chunk (the lazy one)
  const bootScreen = 'src/screens/boot/BootScreen.tsx'
  let bootRoute = `${staticRoute('boot', './BootScreen.tsx', 'BootScreen')}export const preload = () => import('./BootScreen.tsx')\n`
  let bootScreenSource = "import { destinations } from '../../app/nav.ts'\nexport function BootScreen() { return destinations }\n"
  if (v === 'boot-lazy-eager') {
    entryDynamic.push(bootScreen)
    chunk(bootScreen, 'assets/BootScreen-e.js', BIG)
    bootRoute = lazyRoute('boot', './BootScreen.tsx', 'BootScreen')
  } else if (v === 'boot-lazy-other') {
    const cell = 'src/components/boot-cell/BootCell.tsx'
    entryDynamic.push(cell)
    chunk(cell, 'assets/BootCell-o.js', BIG)
    bootRoute = lazyRoute('boot', '../../components/boot-cell/BootCell', 'BootCell')
    src(cell, 'export function BootCell() { return null }\n')
  } else if (v === 'boot-lazy-glob' || v === 'boot-lazy-deep' || v === 'boot-lazy-package') {
    route('boot', SMALL, { dynamicImports: [bootScreen] })
    bootRoute = lazyRoute('boot', './BootScreen.tsx', 'BootScreen')
    if (v === 'boot-lazy-glob') chunk(bootScreen, 'assets/BootScreen-g.js', BIG)
    else if (v === 'boot-lazy-package') {
      // a third-party package: Vite keys its modules by their path under node_modules, and the gate does not read its code
      const pkg = 'node_modules/heavy-lib'
      chunk(bootScreen, 'assets/BootScreen-p.js', SMALL, { dynamicImports: [`${pkg}/index.js`] })
      chunk(`${pkg}/index.js`, 'assets/index-p.js', SMALL, { dynamicImports: [`${pkg}/part.js`] })
      chunk(`${pkg}/part.js`, 'assets/part-p.js', BIG)
      src(`${pkg}/package.json`, `${JSON.stringify({ name: 'heavy-lib', version: '1.0.0', type: 'module', exports: { '.': { types: './index.d.ts', import: './index.js' } } })}\n`)
      src(`${pkg}/index.js`, "export const load = () => import('./part.js')\n")
      src(`${pkg}/part.js`, 'export const PART = 1\n')
      bootScreenSource = "export function BootScreen() { return () => import('heavy-lib') }\n"
    } else {
      const heavy = 'src/components/heavy/Heavy.tsx'
      chunk(bootScreen, 'assets/BootScreen-d.js', SMALL, { dynamicImports: [heavy] })
      chunk(heavy, 'assets/Heavy-d.js', BIG)
      src(heavy, 'export default function Heavy() { return null }\n')
      bootScreenSource = "import { lazy } from 'react'\nconst Heavy = lazy(() => import('../../components/heavy/Heavy.tsx'))\nexport function BootScreen() { return Heavy }\n"
    }
  } else if (v === 'boot-lazy-component') {
    // the screen and the component it imports statically are in route.tsx's chunk; the component's own import() is that chunk's
    const part = 'src/components/cell/HeavyPart.tsx'
    route('boot', SMALL, { dynamicImports: [part] })
    chunk(part, 'assets/HeavyPart-c.js', BIG)
    src('src/components/cell/Cell.tsx', "import { lazy } from 'react'\nexport const HeavyPart = lazy(() => import('./HeavyPart.tsx'))\n")
    src(part, 'export default function HeavyPart() { return null }\n')
    bootScreenSource = "import { HeavyPart } from '../../components/cell/Cell.tsx'\nexport function BootScreen() { return HeavyPart }\n"
  } else if (v === 'boot-facadeless-eager') {
    entryDynamic.push(facadeless('BootScreen', 'assets/BootScreen-x.js', BIG))
    bootRoute = lazyRoute('boot', './BootScreen.tsx', 'BootScreen')
  } else if (v === 'boot-lazy-facadeless') {
    const client = 'src/components/instrument-cell/engine-client.ts'
    const screenKey = facadeless('BootScreen', 'assets/BootScreen-f.js', BIG, { dynamicImports: [client] })
    entryDynamic.push(screenKey)
    chunk(client, 'assets/engine-client-f.js', SMALL, { imports: [screenKey, 'index.html'] })
    bootRoute = lazyRoute('boot', './BootScreen.tsx', 'BootScreen')
    bootScreenSource = "import { InstrumentCell } from '../../components/instrument-cell/InstrumentCell.tsx'\nimport { STORY } from './story.ts'\nexport function BootScreen() { return [STORY, InstrumentCell] }\n"
    src('src/screens/boot/story.ts', "export const STORY = 'the agent said it was safe'\n")
    src('src/components/instrument-cell/protocol.ts', "export const BUS = { version: 1, run: (id: string) => ({ t: 'run', id }) }\n")
    src('src/components/instrument-cell/InstrumentCell.tsx', "import { BUS } from './protocol.ts'\nexport function InstrumentCell() {\n  return { onClick: async () => { const { start } = await import('./engine-client.ts'); start(BUS.run('a')) } }\n}\n")
    src(client, "import { BUS } from './protocol.ts'\nexport function start(m: unknown): void { console.info(BUS.version, m) }\n")
  } else if (v === 'boot-entry-component') {
    const engine = 'src/components/cell/Engine.tsx'
    entryDynamic.push(engine)
    chunk(engine, 'assets/Engine-a.js', BIG)
    bootScreenSource = "import { Cell } from '../../components/cell/Cell.tsx'\nexport function BootScreen() { return Cell }\n"
    src('src/components/cell/Cell.tsx', "export function Cell() {\n  return { onClick: async () => { const { Engine } = await import('./Engine.tsx'); return Engine } }\n}\n")
    src(engine, 'export function Engine() { return null }\n')
  } else if (v === 'boot-eager-component') {
    // through the component folder's index, which re-exports it
    const part = 'src/components/instrument-cell/HeavyPart.tsx'
    entryDynamic.push(part)
    chunk(part, 'assets/HeavyPart-b.js', BIG)
    bootScreenSource = "import { InstrumentCell } from '../../components/instrument-cell'\nexport function BootScreen() { return InstrumentCell }\n"
    src('src/components/instrument-cell/index.ts', "export { InstrumentCell } from './InstrumentCell.tsx'\n")
    src('src/components/instrument-cell/InstrumentCell.tsx', "import { lazy } from 'react'\nconst Heavy = lazy(() => import('./HeavyPart.tsx'))\nexport function InstrumentCell() { return Heavy }\n")
    src(part, 'export default function HeavyPart() { return null }\n')
  } else if (v === 'boot-unmapped') {
    entryDynamic.push(facadeless('Screen', 'assets/Screen-u.js', BIG))
    bootRoute = lazyRoute('boot', './BootScreen.tsx', 'BootScreen')
  } else if (v === 'boot-split-over') route('boot', BIG)
  // otherwise (the control and the trees over another budget) route.tsx and its screen are in the entry chunk, and boot-unbuilt
  // builds nothing of the screen
  src('src/screens/boot/route.tsx', bootRoute)
  src(bootScreen, bootScreenSource)

  // ---- Today and a lesson. Each route.tsx is a chunk Rollup wrote without a facade (both named `route`), naming its own screen's
  // chunk. Today's also loads lazily a module the entry imports statically: Vite gives that no chunk (the lazy import resolves to
  // the entry chunk, which the route chunk's manifest entry names), and the route adds nothing for it. The lesson's loads lazily
  // a module it imports statically itself, which is in its own chunk
  const todayScreen = 'src/screens/today/TodayScreen.tsx'
  const lessonScreen = 'src/screens/lesson/LessonScreen.tsx'
  entryDynamic.push(facadeless('route', 'assets/route-t.js', v === 'today-over' ? BIG : SMALL, { dynamicImports: [todayScreen, 'index.html'] }))
  chunk(todayScreen, 'assets/TodayScreen-t.js', SMALL)
  entryDynamic.push(facadeless('route', 'assets/route-l.js', SMALL, { dynamicImports: [lessonScreen] }))
  chunk(lessonScreen, 'assets/LessonScreen-l.js', v === 'lesson-over' ? BIG : LESSON)
  src('src/screens/today/route.tsx', `${lazyRoute('today', './TodayScreen.tsx', 'TodayScreen')}export const loadShared = () => import('../../app/shared.ts')\n`)
  src(todayScreen, 'export function TodayScreen() { return null }\n')
  src('src/screens/lesson/route.tsx', `import { COPY } from './copy.ts'\n${lazyRoute('lessons/:id', './LessonScreen.tsx', 'LessonScreen')}export const title = COPY\nexport const loadCopy = () => import('./copy.ts')\n`)
  src('src/screens/lesson/copy.ts', "export const COPY = 'Lesson'\n")
  src(lessonScreen, 'export function LessonScreen() { return null }\n')

  // ---- the entry
  manifest['index.html'] = { file: 'assets/index.js', name: 'index', src: 'index.html', isEntry: true, dynamicImports: entryDynamic, css: ['assets/index.css'] }
  put(`${S}/assets/index.js`, module(0x5e17, v === 'entry-over' ? BIG : SMALL * 10))
  put(`${S}/assets/index.css`, 'body { margin: 0; }\n')
  put(`${S}/index.html`, '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><title>budget tree</title><script type="module" src="/assets/index.js"></script></head><body><main><h1>budget tree</h1></main></body></html>\n')
  put(`${S}/.vite/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)

  // ---- the instrument host page
  const I = 'apps/instruments/dist'
  put(`${I}/b/fixture/host.html`, '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><title>host</title><script type="module" src="/b/fixture/host.js"></script></head><body><main><h1>host</h1></main></body></html>\n')
  put(`${I}/b/fixture/host.js`, module(0x4057, v === 'host-over' ? HOST_BIG : SMALL))
  put(`${I}/.vite/manifest.json`, JSON.stringify({ 'host.html': { file: 'b/fixture/host.js', src: 'host.html', isEntry: true } }))
}
