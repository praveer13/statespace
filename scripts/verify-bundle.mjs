#!/usr/bin/env node
// GATE-bundle (spine section 11.2; ARCHITECTURE.md sections 13.2 and 14; W1-T41). A fast-lane gate.
//
//   node scripts/verify-bundle.mjs                   the gate on the build in apps/*/dist (npm run build first)
//   node scripts/verify-bundle.mjs --build           build with COURSE_DOMAIN set first, so the build embeds an instrument frame
//   node scripts/verify-bundle.mjs --only lint.      only the checks whose id is, or starts with, a name (comma-separated)
//   node scripts/verify-bundle.mjs --list            print every check and whether it is enforced yet
//   node scripts/verify-bundle.mjs --engines all     chromium (the default), firefox, webkit, a list, or all
//   node scripts/verify-bundle.mjs --strict          a check that is pending or skipped fails too (the wave-exit review)
//   node scripts/verify-bundle.mjs --json            print the results as JSON
//   node scripts/verify-bundle.mjs --self-check      plant faults; the gate must fail on each and pass on the control
//   --root DIR            the tree under test (default: this repository); --site-dist and --instruments-dist name the builds
//   --runner auto|local|docker   where the browsers come from (default auto: a local one, else the pinned Playwright image)
//   --enforce-all         treat every feature as delivered (the planted fixtures)
//   --budget FILE         the Boot budget (default runs/RUN-phone-pyodide/budget.json)
//   --verbose             print Playwright's own output too
//
// What it checks (ids are stable; a task never edits this file to add a route, a screen or a test):
//   budget.*      the route budgets of ARCHITECTURE.md section 14 from Vite's manifest and the site's source: the entry, the Boot,
//                 Today and lesson routes (each route: what a visit can load beyond the entry, its lazily loaded code included,
//                 wherever the import() is written; a route the gate cannot measure fails), and the instrument host page without
//                 engines; budget.fonts: self-hosted WOFF2 subsets of the three faces only
//   manifest.*    the instrument build's engine manifest reads, matches its files, and states each engine's first load
//   lint.*        the iframe carries sandbox="allow-scripts allow-same-origin" (lint.sandbox), apps/site never assigns
//                 document.cookie (lint.cookie), no fragment payload reaches a parser on the main origin (lint.fragment), and a
//                 production instrument build names no localhost (lint.parents)
//   routes.*      every delivered screen has a static page; route:<path> opens each route in a fresh browser and holds it to the
//                 rules of e2e/routes.spec.ts; nav is the shell's five destinations and search
//   sw.*          the service worker's kill switch, four ways (e2e/killswitch.spec.ts)
//   loader.*, frame.sandbox   OD-6: no prompt or warning anywhere on the page before an engine downloads, and every frame of the
//                 loader prints the manifest's figure, in every place it states one
//   boot.*        the Boot timing gate at 360 px with W0-S02's budget: the handshake to the loader's size, the page held responsive
//                 with an engine download in flight, and the cold and warm live verdicts
//   fragment.*, import.*, handshake.*   the fragment canary, the fuzzed import, and the bus handshake from outside
//
// A check whose feature its owning task has not delivered yet is reported as pending and names the task; it is neither a pass nor
// a failure until --strict (scripts/spikes/W1-T41/lib/applicability.ts says what counts as delivered). Exit status: 0 green,
// 1 a check failed, 2 the gate could not run (no build, no browser, a harness error).
//
// Browsers come from Playwright where they launch, else from the pinned image mcr.microsoft.com/playwright:v1.63.0-noble, in
// which this script runs itself with the repository mounted. scripts/spikes/W1-T41/README.md has the rest.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The checks are TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' })
  process.exit(again.status ?? 1)
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lib = (name) => import(pathToFileURL(join(REPO, 'scripts/spikes/W1-T41/lib', name)).href)
const [report, browserLib, appl, routesLib, budgets, lints, manifestLib, worldLib, units] = await Promise.all(
  ['report.ts', 'browser.ts', 'applicability.ts', 'routes.ts', 'budgets.ts', 'lints.ts', 'manifest.ts', 'world.ts', 'units.ts'].map(lib),
)

class HarnessError extends Error {}

// ------------------------------------------------------------------------------------------------ arguments
const FLAGS = new Set(['--build', '--list', '--strict', '--json', '--self-check', '--enforce-all', '--no-browser', '--verbose', '--help'])
const VALUES = new Set(['--root', '--site-dist', '--instruments-dist', '--only', '--engines', '--runner', '--budget', '--course-domain'])

function parseArgs(argv) {
  const o = { flags: new Set(), values: {} }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (FLAGS.has(a)) o.flags.add(a)
    else if (VALUES.has(a)) {
      if (i + 1 >= argv.length) throw new HarnessError(`${a} needs a value`)
      o.values[a] = argv[(i += 1)]
    } else throw new HarnessError(`unknown argument ${a} (--help lists them)`)
  }
  return o
}

function printHelp() {
  const text = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')
  const out = []
  for (const l of text.slice(1)) {
    if (!l.startsWith('//')) break
    out.push(l.replace(/^\/\/ ?/, ''))
  }
  console.log(out.join('\n'))
}

// ------------------------------------------------------------------------------------------------ the checks
/** The groups of checks that need no browser; anything else (including a task's own `*.gate.ts` test) runs in one. */
const STATIC_GROUPS = ['budget', 'manifest', 'lint', 'routes']
const groupOf = (id) => id.split(/[.:]/)[0]

/** The browser checks whose enforcement depends on a delivered feature. The others (routes, fragment canary) always run. */
const BROWSER_REQUIRES = {
  nav: { requires: ['shell'] },
  'sw.register': { requires: ['sw'] },
  'sw.offline': { requires: ['sw'] },
  'sw.nosw': { requires: ['sw'] },
  'sw.kill': { requires: ['sw'] },
  'loader.noprompt': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'loader.size': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'frame.sandbox': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'boot.handshake': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'boot.responsive': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'boot.cold': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'boot.warm': { requires: ['loader', 'boot', 'bus'], needsFrame: true },
  'import.fuzz': { requires: ['receipt', 'bus'] },
  'handshake.foreign': { requires: ['bus'], needsFrame: true },
  'handshake.allowed': { requires: ['bus'], needsFrame: true },
  'handshake.caps': { requires: ['bus'], needsFrame: true },
  'handshake.toplevel': { requires: ['bus'], needsFrame: true },
}

const STATIC_IDS = ['budget.entry', 'budget.route.boot', 'budget.route.today', 'budget.route.lesson', 'budget.host', 'budget.fonts', 'manifest.engines', 'lint.sandbox', 'lint.cookie', 'lint.fragment', 'lint.parents', 'routes.present']

/** The ids a name selects: the id itself, a group or check it prefixes (`lint.` selects lint.sandbox), and `route:` the routes. */
function selector(only) {
  if (!only) return () => true
  const names = only.split(',').map((x) => x.trim()).filter(Boolean)
  return (id) => names.some((n) => (/[.:*]$/.test(n) ? id.startsWith(n.replace(/\*$/, '')) : id === n || id.startsWith(`${n}.`) || id.startsWith(`${n}:`)))
}

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A Playwright --grep for the same selection: the test titles are `[check-id] ...`. */
function grepFor(only) {
  const names = only.split(',').map((x) => x.trim()).filter(Boolean)
  const parts = names.map((n) => (/[.:*]$/.test(n) ? `${escapeRe(n.replace(/\*$/, ''))}[^\\]]*` : `${escapeRe(n)}(?:[.:][^\\]]*)?`))
  return `\\[(?:${parts.join('|')})\\]`
}

/** Which tree is under test, and where its builds are. */
function resolveTree(opts) {
  const root = resolve(opts.values['--root'] ?? REPO)
  const abs = (p) => resolve(p)
  return {
    root,
    siteDir: abs(opts.values['--site-dist'] ?? join(root, 'apps/site/dist')),
    instrumentsDir: abs(opts.values['--instruments-dist'] ?? join(root, 'apps/instruments/dist')),
    budgetFile: abs(opts.values['--budget'] ?? (existsSync(join(root, 'runs/RUN-phone-pyodide/budget.json')) ? join(root, 'runs/RUN-phone-pyodide/budget.json') : join(REPO, 'runs/RUN-phone-pyodide/budget.json'))),
  }
}

function need(dir, what, hint) {
  const where = dir === REPO || dir.startsWith(`${REPO}/`) ? relative(REPO, dir) || '.' : 'the given path'
  if (!existsSync(dir)) throw new HarnessError(`there is no ${what} at ${where}; ${hint}`)
}

const R = (id, status, detail, extra = {}) => ({ id, group: groupOf(id), status, detail, ...extra })
const kbOf = (n) => `${(n / 1000).toFixed(1)} KB`

// ------------------------------------------------------------------------------------------------ static checks
function staticChecks(tree, opts, wanted) {
  const out = []
  const enforceAll = opts.flags.has('--enforce-all')
  const results = (id, fn) => {
    if (wanted(id)) out.push(...[].concat(fn()))
  }

  // ---- budgets
  const budgetIds = budgets.BUDGETS.map((b) => b.id)
  let site = null
  let host = null
  let manifest = null
  let manifestProblem = null
  const delivered = new Set(appl.deliveredScreens(tree.root))
  const needsSite = budgetIds.some(wanted) || wanted('budget.fonts') || wanted('routes.present')
  const needsInstruments = wanted('budget.host') || wanted('manifest.engines') || wanted('lint.parents')
  if (needsSite) {
    need(tree.siteDir, 'site build', 'run `npm run build` first, or pass --build')
    site = budgets.measureSite(tree.siteDir, [...new Set(budgets.BUDGETS.filter((b) => b.screen).map((b) => b.screen))], join(tree.root, 'apps/site'))
    if (!site) throw new HarnessError(`the site build has no .vite/manifest.json (build.manifest must stay on in apps/site/vite.config.ts)`)
  }
  let engineAssets = new Set()
  if (needsInstruments) {
    need(tree.instrumentsDir, 'instruments build', 'run `npm run build` first, or pass --build')
    const file = manifestLib.findManifest(tree.instrumentsDir)
    if (file) {
      try {
        manifest = manifestLib.readManifest(file)
        engineAssets = manifestLib.engineAssetPaths(manifest)
      } catch (e) {
        manifestProblem = e instanceof Error ? e.message : String(e)
      }
    } else manifestProblem = 'the instruments build has no engine manifest'
    host = budgets.measureHost(tree.instrumentsDir, engineAssets)
  }

  for (const b of budgets.BUDGETS) {
    results(b.id, () => {
      const limit = b.kb * 1000
      const verdict = (counted, p, extra = '') => R(b.id, counted <= limit ? 'pass' : 'fail', `${b.label}: ${kbOf(counted)} against ${b.kb} KB (${budgets.payloadDetail(p, b)})${extra}`)
      if (b.id === 'budget.entry') return verdict(budgets.countedBytes(site.entry, b), site.entry)
      if (b.id === 'budget.host') {
        if (!host) return R(b.id, 'fail', 'the instruments build has no host page (host.html with a Vite manifest entry)')
        return verdict(budgets.countedBytes(host.payload, b), host.payload)
      }
      const m = site.routes.get(b.screen)
      const folder = `apps/site/src/screens/${b.screen}/`
      if (!delivered.has(b.screen) && !enforceAll) return R(b.id, 'pending', `${b.label}: ${folder}route.tsx does not exist yet`, { owner: b.owner })
      const src = m.source
      const entryKb = `${kbOf(budgets.countedBytes(site.entry, b))} of ${budgets.BUDGETS[0].kb} KB`
      if (!src) return R(b.id, 'fail', `${b.label}: the tree has no apps/site source beside the build, so the chunks the route loads lazily cannot be attributed and the route cannot be measured`)
      // the build holds none of the screen's code: before the shell's router discovers screens that is the shell's to do; after, the
      // route cannot be measured, and that is never a pass
      if (!src.inBuild) {
        const what = `${b.label}: the build holds none of ${folder}: no module of it is reachable from the site's entry (index.html) and no chunk is built from it`
        if (!enforceAll && !appl.featureDelivered(tree.root, 'shell')) return R(b.id, 'pending', `${what}; the shell's router (${appl.FEATURES.shell.owner}) discovers each screen's route.tsx, and it is not in the tree yet`, { owner: appl.FEATURES.shell.owner })
        return R(b.id, 'fail', `${what}, so the route cannot be measured; the shell's router discovers each screen's route.tsx`)
      }
      const counted = budgets.countedBytes(m.own, b)
      if (src.unmeasured.length > 0) {
        const more = src.unmeasured.length > 2 ? ` (+${src.unmeasured.length - 2} more)` : ''
        return R(b.id, 'fail', `${b.label}: cannot be measured: ${src.unmeasured.slice(0, 2).join('; ')}${more}; what the gate can count is ${kbOf(counted)} against ${b.kb} KB`)
      }
      if (m.roots.length === 0) {
        // with no chunk counted and nothing unmeasured, every module the route loads lazily lies inside the entry's closure
        const lazyNote = src.lazyModules === 0 ? ', and they load nothing lazily' : `, and so ${src.lazyModules === 1 ? 'is the module' : `are the ${src.lazyModules} modules`} they load lazily`
        return R(b.id, 'pass', `${b.label}: every module of ${folder} in the build is in the entry's closure${lazyNote}, so the route adds nothing and the entry budget binds (${entryKb})`)
      }
      const biggest = budgets.largestFiles(tree.siteDir, m.own)
      const one = m.roots.length === 1
      const byName = src.byName.length > 0 ?`; matched by name (Rollup wrote ${src.byName.length === 1 ? 'it' : 'them'} without a facade): ${src.byName.join(', ')}` : ''
      return verdict(counted, m.own, `; what a visit can load beyond the entry: ${m.roots.length} chunk${one ? '' : 's'} of the route and what ${one ? 'it imports' : 'they import'}, statically or lazily${biggest.length > 0 ? `; largest ${biggest.join(', ')}` : ''}${byName}; the entry adds ${kbOf(budgets.countedBytes(site.entry, b))}`)
    })
  }

  results('budget.fonts', () => {
    const f = budgets.checkFonts(tree.siteDir)
    if (f.findings.length > 0) return R('budget.fonts', 'fail', f.findings.slice(0, 3).map((x) => `${x.css}: ${x.message}`).join('; ') + (f.findings.length > 3 ? ` (+${f.findings.length - 3} more)` : ''))
    const pins = f.pinned === null ? '; the build has no font manifest' : `; the font manifest pins ${f.pinned} font files by SHA-256, each in the build and matching, and fonts/ holds no other font file`
    return R('budget.fonts', 'pass', `${f.faces.length === 0 ? 'no @font-face rule in the built CSS yet' : `${f.faces.length} @font-face rules, all self-hosted WOFF2 of ${budgets.FONT_FAMILIES.join(', ')}`}${pins}`)
  })

  // ---- manifest
  results('manifest.engines', () => {
    const busDelivered = enforceAll || appl.featureDelivered(tree.root, 'bus')
    if (!manifest) {
      if (!busDelivered) return R('manifest.engines', 'pending', `${manifestProblem}; ${appl.FEATURES.bus.owner} builds it`, { owner: appl.FEATURES.bus.owner })
      return R('manifest.engines', 'fail', manifestProblem ?? 'no engine manifest')
    }
    const problems = manifestLib.checkManifestIntegrity(manifest, tree.instrumentsDir)
    const engines = [...manifest.engines.values()].map((e) => `${e.id} ${units.describeBytes(e.firstLoadBytes)}`).join('; ')
    if (problems.length > 0) return R('manifest.engines', 'fail', problems.slice(0, 3).map((p) => `${p.engine}: ${p.message}`).join('; ') + (problems.length > 3 ? ` (+${problems.length - 3} more)` : ''))
    const z3 = manifest.engines.get('z3')
    const note = z3 && z3.firstLoadBytes !== 12893420 ? ` (RUN-phone-pyodide recorded z3 at 12,893,420 B as gzip level 5; this build differs)` : ''
    return R('manifest.engines', 'pass', `first loads: ${engines}${note}`)
  })

  // ---- lints
  const siteSources = () => lints.productionSources(tree.root, 'apps/site')
  const verdictOf = (id, found, ok) => (found.length === 0 ? R(id, 'pass', ok) : R(id, 'fail', `${found.length} finding${found.length === 1 ? '' : 's'}: ${found.slice(0, 2).map(lints.formatFinding).join(' | ')}${found.length > 2 ? ` (+${found.length - 2} more)` : ''}`))
  results('lint.sandbox', () => verdictOf('lint.sandbox', lints.lintSandbox(siteSources()), 'every iframe in apps/site carries sandbox="allow-scripts allow-same-origin"'))
  results('lint.cookie', () => verdictOf('lint.cookie', lints.lintCookie(siteSources()), 'apps/site never assigns document.cookie'))
  results('lint.fragment', () => verdictOf('lint.fragment', lints.lintFragment(siteSources()), 'no URL-fragment value reaches a decoder or parser in apps/site'))
  results('lint.parents', () => verdictOf('lint.parents', lints.lintParents(tree.instrumentsDir, engineAssets), 'the production instrument build names no localhost'))

  // ---- routes the build must have. The shell (W1-T02) writes a static page per route and its router discovers the screens'
  // route.tsx files, so a screen another task delivers before the shell cannot have a page yet: pending on the shell, not a failure
  results('routes.present', () => {
    const plan = routesLib.planRoutes(tree.root, tree.siteDir)
    if (plan.missing.length > 0) {
      const what = `delivered screens with no static page in the build: ${plan.missing.map((m) => `${m.path} (apps/site/src/screens/${m.screen}/)`).join(', ')}`
      if (!enforceAll && !appl.featureDelivered(tree.root, 'shell')) return R('routes.present', 'pending', `${what}; ${appl.FEATURES.shell.owner}'s shell writes a static index.html for every route (ARCHITECTURE.md section 3.1), and it is not in the tree yet`, { owner: appl.FEATURES.shell.owner })
      return R('routes.present', 'fail', `${what}; a post-build step writes an index.html for every static route (ARCHITECTURE.md section 3.1)`)
    }
    return R('routes.present', 'pass', `${plan.routes.length} routes in the build, every delivered screen has one`)
  })
  return out
}

// ------------------------------------------------------------------------------------------------ browser checks
function applicabilityTable(tree, opts, courseDomain) {
  const table = {}
  for (const [id, r] of Object.entries(BROWSER_REQUIRES)) {
    table[id] = appl.applicability({ root: tree.root, requires: r.requires, needsFrame: r.needsFrame ?? false, courseDomain, enforceAll: opts.flags.has('--enforce-all') })
  }
  return table
}

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g
const firstLine = (s) => String(s ?? '').replace(ANSI, '').split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? ''

/** Fold Playwright's JSON report into one result per check id, across the engines it ran in. */
function foldPlaywright(json) {
  const tests = []
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) tests.push({ title: spec.title, t })
    for (const s of suite.suites ?? []) visit(s)
  }
  for (const s of json.suites ?? []) visit(s)
  const byId = new Map()
  for (const { title, t } of tests) {
    const id = /^\[([^\]]+)\]/.exec(title)?.[1] ?? `test:${title}`
    const results = t.results ?? []
    const last = results[results.length - 1]
    const failed = t.status === 'unexpected' || (last && ['failed', 'timedOut', 'interrupted'].includes(last.status))
    const skipped = !failed && (t.status === 'skipped' || last?.status === 'skipped')
    const annotations = t.annotations ?? []
    const entry = byId.get(id) ?? { id, engines: [], failed: [], skipped: [], passed: [], notes: [], pending: null, envSkip: null, ms: 0 }
    entry.engines.push(t.projectName)
    entry.ms += last?.duration ?? 0
    if (failed) entry.failed.push(`${t.projectName}: ${firstLine(last?.error?.message ?? last?.errors?.[0]?.message ?? 'failed')}`.slice(0, 420))
    else if (skipped) {
      entry.skipped.push(t.projectName)
      entry.pending ??= annotations.find((a) => a.type === 'pending')?.description ?? null
      entry.envSkip ??= annotations.find((a) => a.type === 'skipped')?.description ?? null
    } else entry.passed.push(t.projectName)
    for (const a of annotations) if (a.type === 'measured') entry.notes.push(a.description)
    byId.set(id, entry)
  }
  const out = []
  for (const e of byId.values()) {
    // the engines a check actually passed in, when it ran in more than one
    const named = e.failed.length > 0 ? e.engines : e.passed
    const engines = named.length > 1 ? named : undefined
    if (e.failed.length > 0) out.push(R(e.id, 'fail', e.failed.join(' | '), { ...(engines ? { engines } : {}), ms: e.ms }))
    else if (e.skipped.length > 0 && e.passed.length === 0) {
      if (e.pending) out.push(R(e.id, 'pending', e.pending.replace(/^[^:]*: /, ''), { owner: /^((?:W\d-[TS]\d\d)(?:, W\d-[TS]\d\d)*): /.exec(e.pending)?.[1] ?? 'unowned' }))
      else out.push(R(e.id, 'skipped', e.envSkip ?? 'skipped by the test'))
    } else out.push(R(e.id, 'pass', e.notes.length > 0 ? e.notes.join(' | ') : 'ok', { ...(engines ? { engines } : {}), ms: e.ms }))
  }
  return out
}

async function runBrowserChecks(tree, opts, wanted, engines, courseDomain) {
  const cleanup = []
  try {
    const siteDir = worldLib.snapshotDir(tree.siteDir, 'site')
    const instrumentsDir = worldLib.snapshotDir(tree.instrumentsDir, 'instruments')
    cleanup.push(siteDir, instrumentsDir)
    const out = mkdtempSync(join(tmpdir(), 'ss-bundle-pw-'))
    cleanup.push(out)
    const domain = courseDomain === undefined ? worldLib.discoverCourseDomain(siteDir) : courseDomain
    const plan = routesLib.planRoutes(tree.root, tree.siteDir)
    const env = {
      repoRoot: REPO,
      root: tree.root,
      siteDir,
      instrumentsDir,
      courseDomain: domain,
      budgetFile: tree.budgetFile,
      routes: plan.routes,
      applicability: applicabilityTable(tree, opts, domain),
      engines,
      strict: opts.flags.has('--strict'),
    }
    // A feature that needs the instrument frame is delivered but the build embeds none: the checks cannot run, and that is a failure of
    // the build the gate was given, not a pass. One result says so, and the checks it blocks stay skipped.
    const blocked = Object.entries(env.applicability).filter(([, a]) => a.status === 'skipped').map(([id]) => id).filter(wanted)
    const missingFrame = blocked.length > 0 ? [R('build.domain', 'fail', `the build embeds no instrument frame, so ${blocked.join(', ')} cannot run: build with COURSE_DOMAIN set (the gate's placeholder is ${worldLib.PLACEHOLDER_DOMAIN}), or run with --build`)] : []
    const only = opts.values['--only']
    const args = [join(REPO, 'node_modules/@playwright/test/cli.js'), 'test', '-c', join(REPO, 'playwright.config.ts')]
    if (only) args.push('--grep', grepFor(only))
    const child = spawnSync(process.execPath, args, {
      cwd: REPO,
      env: { ...process.env, SS_GATE_ENV: JSON.stringify(env), SS_ENGINES: engines.join(','), SS_PW_JSON: join(out, 'report.json'), SS_PW_OUT: join(out, 'pw'), FORCE_COLOR: '0', CI: process.env.CI ?? '1' },
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    const jsonFile = join(out, 'report.json')
    if (!existsSync(jsonFile)) {
      const tail = `${child.stdout ?? ''}${child.stderr ?? ''}`.split('\n').filter(Boolean).slice(-12).join('\n')
      throw new HarnessError(`Playwright produced no report (exit ${child.status}):\n${tail}`)
    }
    if (opts.flags.has('--verbose')) process.stderr.write(`${child.stdout ?? ''}${child.stderr ?? ''}`)
    const json = JSON.parse(readFileSync(jsonFile, 'utf8'))
    const errors = (json.errors ?? []).map((e) => firstLine(e.message))
    if (errors.length > 0) throw new HarnessError(`Playwright reported errors: ${errors.join('; ')}`)
    return [...missingFrame, ...foldPlaywright(json).filter((r) => wanted(r.id) || r.id.startsWith('test:'))]
  } finally {
    for (const d of cleanup) rmSync(d, { recursive: true, force: true })
  }
}

// ------------------------------------------------------------------------------------------------ running
async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.flags.has('--help')) return printHelp(), 0
  const gate = 'GATE-bundle'
  const tree = resolveTree(opts)
  const wanted = selector(opts.values['--only'])
  const strict = opts.flags.has('--strict')
  const engines = browserLib.parseEngines(opts.values['--engines'] ?? process.env.SS_ENGINES)
  const requested = opts.values['--runner'] ?? process.env.SS_RUNNER ?? 'auto'
  if (!['auto', 'local', 'docker'].includes(requested)) throw new HarnessError('--runner is auto, local or docker')

  if (opts.flags.has('--list')) {
    const domain = existsSync(tree.siteDir) ? worldLib.discoverCourseDomain(tree.siteDir) : null
    const table = applicabilityTable(tree, opts, domain)
    console.log(`${gate}: ${STATIC_IDS.length} static checks, ${Object.keys(table).length} feature-dependent browser checks, route:<path> for each route, fragment.canary and route:404 always`)
    for (const id of STATIC_IDS) console.log(`  ${id}`)
    for (const [id, a] of Object.entries(table)) console.log(`  ${id.padEnd(20)} ${a.status}${a.status === 'pending' ? ` (${a.owner}: ${a.why})` : a.status === 'skipped' ? ` (${a.why})` : ''}`)
    console.log(`  course domain in the build: ${domain ?? 'none (built without COURSE_DOMAIN)'}`)
    return 0
  }

  // which phases run
  const browserWanted = opts.flags.has('--self-check') || (!opts.flags.has('--no-browser') && (!opts.values['--only'] || opts.values['--only'].split(',').some((n) => !STATIC_GROUPS.includes(groupOf(n.trim())))))

  // browsers: here, or in the pinned image
  let runner = { kind: 'local' }
  if (browserWanted) {
    runner = await browserLib.chooseRunner(requested, engines)
    if (runner.kind === 'none') throw new HarnessError(runner.why)
    if (runner.kind === 'docker') {
      process.stderr.write(`${gate}: no local browser; running in ${browserLib.PLAYWRIGHT_IMAGE}\n`)
      const mounts = []
      const args = []
      const argv = process.argv.slice(2)
      for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i]
        if (['--root', '--site-dist', '--instruments-dist', '--budget'].includes(a)) {
          const host = resolve(argv[i + 1])
          const inRepo = host === REPO || host.startsWith(REPO + '/')
          if (!inRepo) mounts.push({ host, guest: host, readOnly: true })
          args.push(a, inRepo ? join('/work', relative(REPO, host)) : host)
          i += 1
        } else args.push(a)
      }
      return browserLib.runInDocker({ repoRoot: REPO, nodeArgs: ['scripts/verify-bundle.mjs', ...args, '--runner', 'local'], mounts })
    }
  }

  if (opts.flags.has('--self-check')) {
    const { selfCheck } = await import(pathToFileURL(join(REPO, 'scripts/spikes/W1-T41/self-check.mjs')).href)
    return selfCheck({ gate, repo: REPO, script: fileURLToPath(import.meta.url), kind: 'bundle' })
  }

  if (opts.flags.has('--build')) {
    console.error(`${gate}: building with COURSE_DOMAIN=${worldLib.PLACEHOLDER_DOMAIN} (npm run build)`)
    const b = spawnSync('npm', ['run', 'build'], { cwd: REPO, env: { ...process.env, COURSE_DOMAIN: worldLib.PLACEHOLDER_DOMAIN }, stdio: ['ignore', 'ignore', 'inherit'] })
    if (b.status !== 0) throw new HarnessError('the build failed')
  }

  const courseDomain = opts.values['--course-domain']
  const results = staticChecks(tree, opts, wanted)
  if (browserWanted) {
    need(tree.siteDir, 'site build', 'run `npm run build` first, or pass --build')
    need(tree.instrumentsDir, 'instruments build', 'run `npm run build` first, or pass --build')
    results.push(...(await runBrowserChecks(tree, opts, wanted, engines, courseDomain)))
  }
  // a name in --only that selects nothing (a typo, or a browser check with --no-browser) is the caller's error, never an empty "ok"
  if (opts.values['--only']) {
    const idle = opts.values['--only'].split(',').map((x) => x.trim()).filter(Boolean).filter((n) => !results.some((r) => selector(n)(r.id)))
    if (idle.length > 0) throw new HarnessError(`--only ${idle.join(', ')} selects no check${browserWanted ? '' : ' that runs without a browser'} (--list names them)`)
  }

  const order = ['build', 'budget', 'manifest', 'lint', 'routes', 'route', 'nav', 'sw', 'loader', 'frame', 'boot', 'fragment', 'import', 'handshake']
  const rank = (r) => (order.includes(r.group) ? order.indexOf(r.group) : order.length)
  results.sort((a, b) => rank(a) - rank(b)) // stable: a group keeps the order its checks ran in

  if (opts.flags.has('--json')) {
    console.log(JSON.stringify({ gate, strict, engines, runner: runner.kind, summary: report.summarize(results), results }, null, 2))
  } else {
    console.log(`${gate} (${tree.root === REPO ? 'this repository' : tree.root.startsWith(REPO + '/') ? relative(REPO, tree.root) : 'a tree outside the repository'}; ${browserWanted ? `${engines.join(', ')} via ${browserLib.insideImage() ? 'the pinned image' : 'a local browser'}` : 'no browser'})`)
    for (const l of report.formatResults(results)) console.log(l)
    console.log(report.verdictLine(gate, results, strict))
  }
  return report.exitCodeFor(results, strict)
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`GATE-bundle: could not run: ${err instanceof HarnessError ? err.message : (err?.stack ?? err)}`)
    process.exit(2)
  },
)
