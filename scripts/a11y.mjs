#!/usr/bin/env node
// GATE-a11y (spine section 11.2; DESIGN.md sections 10 and 12; W1-T41): axe with 0 serious issues at 360, 320 and 1280 px on every
// screen, in both themes. A nightly gate. This is statespace's form of the harness that kernelspace vendored
// (vendor/kernelspace/scripts/a11y.mjs, pinned in vendor/kernelspace/VENDOR.md, which is never edited): the same checks, the same
// exit codes and the same `--fixture` proof, with what statespace changes in this file, as VENDOR.md says the wrapper supplies:
//   * the routes come from the build (every index.html, plus every screen a task has delivered) and from the instrument origin's
//     own pages, not from a list: a task that adds a screen adds it to the sweep by building it
//   * two origins, served as GitHub Pages serves them (scripts/spikes/W1-T41/lib/pages-server.ts), not `vite preview`
//   * the one learner-state fixture, tests/fixtures/learner-state.json, is put into the app's database before each screen is
//     drawn and the clock is fixed to its instant, so the screens tested are the screens shipped (DESIGN.md section 12)
//   * both themes, light and night (DESIGN.md section 2.9: the system setting), at each width
//   * Playwright and axe at the versions pinned in RUN-scaffold (@playwright/test 1.63.0, @axe-core/playwright 4.14.0)
//   * browsers from a local Playwright, else the pinned Playwright image (the script runs itself in it)
//
//   node scripts/a11y.mjs                                   every screen, three widths, two themes, on the build in apps/*/dist
//   node scripts/a11y.mjs --routes /,/today --widths 360    a subset (also --themes light,dark)
//   node scripts/a11y.mjs --fixture file.html               a local page instead of the app: the harness's proof that it fails
//   node scripts/a11y.mjs --screenshots DIR                 also write each screen as a PNG, from the same state (artboards, review)
//   node scripts/a11y.mjs --require-seed                    fail when the learner-state fixture cannot be put into the app
//   node scripts/a11y.mjs --self-check                      plant faults; the harness must fail on each and pass on the control
//   --fail-on serious|critical|moderate|minor   the lowest impact that fails (default serious: serious and critical)
//   --build                    run `npm run build` first (the default is to use the build that is there; kernelspace's --skip-build is accepted)
//   --root DIR, --site-dist DIR, --instruments-dist DIR   as in verify-bundle
//   --learner-state FILE|none  the fixture (default tests/fixtures/learner-state.json)
//   --engines chromium|firefox|webkit|all   (default chromium)   --runner auto|local|docker   --json   --list
//
// Exit status: 0 no violation at or above --fail-on and no sideways scroll; 1 a violation or a sideways scroll; 2 the harness could not
// run (no build, no browser, navigation failed, the fixture could not be applied under --require-seed).
// Reflow (WCAG 1.4.10, which axe does not test): at each width the harness measures the document's scrollWidth - clientWidth after
// the fonts load, and fails a screen that scrolls sideways, naming the pixels and the widest elements past the viewport.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' })
  process.exit(again.status ?? 1)
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lib = (name) => import(pathToFileURL(join(REPO, 'scripts/spikes/W1-T41/lib', name)).href)
const [browserLib, routesLib, worldLib, budgets, seedLib] = await Promise.all(['browser.ts', 'routes.ts', 'world.ts', 'budgets.ts', 'seed.ts'].map(lib))

// A harness failure (exit 2) is thrown, never process.exit()ed, so the browser and the servers are always stopped.
class HarnessError extends Error {}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const IMPACTS = ['critical', 'serious', 'moderate', 'minor']
const DEFAULT_WIDTHS = [360, 320, 1280]
const THEMES = { light: 'light', dark: 'dark' }

const FLAGS = new Set(['--build', '--skip-build', '--require-seed', '--self-check', '--json', '--list', '--help'])
const VALUES = new Set(['--routes', '--widths', '--themes', '--fixture', '--fail-on', '--screenshots', '--root', '--site-dist', '--instruments-dist', '--learner-state', '--engines', '--runner'])

function parseArgs(argv) {
  const o = { flags: new Set(), values: {}, fixtures: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (FLAGS.has(a)) o.flags.add(a)
    else if (VALUES.has(a)) {
      if (i + 1 >= argv.length) throw new HarnessError(`${a} needs a value`)
      const v = argv[(i += 1)]
      if (a === '--fixture') o.fixtures.push(v)
      else o.values[a] = a === '--routes' && o.values[a] ? `${o.values[a]},${v}` : v
    } else throw new HarnessError(`unknown argument ${a} (--help lists them)`)
  }
  return o
}

function printHelp() {
  const out = []
  for (const l of readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) {
    if (!l.startsWith('//')) break
    out.push(l.replace(/^\/\/ ?/, ''))
  }
  console.log(out.join('\n'))
}

function settings(opts) {
  const widths = (opts.values['--widths'] ?? '').split(',').filter(Boolean).map(Number)
  for (const w of widths) if (!Number.isInteger(w) || w < 200 || w > 4000) throw new HarnessError(`bad width ${w}`)
  const themes = (opts.values['--themes'] ?? 'light,dark').split(',').filter(Boolean)
  for (const t of themes) if (!(t in THEMES)) throw new HarnessError(`--themes is light, dark or both, not ${t}`)
  const failOn = opts.values['--fail-on'] ?? 'serious'
  if (!IMPACTS.includes(failOn)) throw new HarnessError(`--fail-on is one of ${IMPACTS.join(', ')}`)
  const routes = (opts.values['--routes'] ?? '').split(',').filter(Boolean)
  for (const r of routes) if (!r.startsWith('/')) throw new HarnessError(`route ${r} must start with /`)
  return { widths: widths.length > 0 ? widths : DEFAULT_WIDTHS, themes, failOn, routes }
}

// ------------------------------------------------------------------------------------------------ one page
async function checkPage(context, label, url, width, theme, { AxeBuilder, screenshot, seed }) {
  const page = await context.newPage()
  try {
    const res = await page.goto(url, { waitUntil: 'load' })
    if (res && !res.ok()) throw new Error(`HTTP ${res.status()}`)
    // lazy routes and the log load after the first paint; settle, but a page that keeps polling still gets checked
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    // the app creates its database when a screen first opens its store, which may be this one: seed it now and draw the screen again
    if (seed && (await seed(page))) {
      await page.reload({ waitUntil: 'load' })
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    }
    // axe measures contrast with the fonts that will be used, so wait for them first
    await page.evaluate(() => document.fonts.ready)
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const rows = violations.map((v) => ({
      route: label,
      width,
      theme,
      impact: v.impact ?? 'minor',
      id: v.id,
      help: v.help,
      nodes: v.nodes.length,
      target: v.nodes[0] ? v.nodes[0].target.join(' ') : '',
    }))
    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      const px = root.scrollWidth - root.clientWidth
      if (px <= 0) return { px, culprits: [] }
      // the elements that stick out past the viewport edge, widest overhang first; one inside its own scroll
      // container (overflow auto, scroll, hidden or clip on an ancestor) does not widen the document
      const edge = root.clientWidth
      const clipped = (el) => {
        for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true
        }
        return false
      }
      const culprits = []
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.right <= edge + 0.5 || clipped(el)) continue
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
        culprits.push({ over: Math.round(r.right - edge), w: Math.round(r.width), desc: el.tagName.toLowerCase() + (cls ? `.${cls}` : '') })
      }
      culprits.sort((a, b) => b.over - a.over)
      return { px, culprits: culprits.slice(0, 3) }
    })
    if (screenshot) await screenshot(page)
    const scroll = overflow.px > 0 ? { route: label, width, theme, px: overflow.px, culprits: overflow.culprits } : null
    return { rows, scroll }
  } finally {
    await page.close()
  }
}

const slug = (label) => label.replace(/^\//, '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'home'

// ------------------------------------------------------------------------------------------------ the report
function report(rows, scrolls, checked, failOn) {
  const rank = (impact) => IMPACTS.indexOf(impact)
  rows.sort((a, b) => rank(a.impact) - rank(b.impact) || a.route.localeCompare(b.route) || a.width - b.width || a.theme.localeCompare(b.theme))
  for (const impact of IMPACTS) {
    const group = rows.filter((r) => r.impact === impact)
    if (group.length === 0) continue
    console.log(`\n${impact.toUpperCase()} (${group.length})`)
    for (const r of group) {
      console.log(`  ${r.route}  ${r.width}px  ${r.theme}  ${r.id}  ${r.nodes} node${r.nodes === 1 ? '' : 's'}  ${r.help}`)
      console.log(`    first: ${r.target}`)
    }
  }
  const counts = IMPACTS.map((i) => `${rows.filter((r) => r.impact === i).length} ${i}`).join(', ')
  const blocking = rows.filter((r) => rank(r.impact) <= rank(failOn))
  if (scrolls.length > 0) {
    console.log(`\nSIDEWAYS SCROLL (${scrolls.length}), WCAG 1.4.10 Reflow`)
    for (const s of scrolls) {
      console.log(`  ${s.route}  ${s.width}px  ${s.theme}  scrolls sideways by ${s.px}px`)
      for (const c of s.culprits) console.log(`    ${c.desc}  ${c.w}px wide, ${c.over}px past the viewport`)
    }
  }
  console.log(`\na11y: ${checked} page${checked === 1 ? '' : 's'} checked; ${counts}; ${scrolls.length} sideways scroll`)
  const ok = blocking.length === 0 && scrolls.length === 0
  if (ok) console.log(`a11y: ok (none at ${failOn} or worse, no sideways scroll)`)
  else console.log(`a11y: FAIL (${blocking.length} at ${failOn} or worse, ${scrolls.length} sideways scroll)`)
  return ok
}

// ------------------------------------------------------------------------------------------------ running
async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.flags.has('--help')) return printHelp(), 0
  const cfg = settings(opts)
  const engines = browserLib.parseEngines(opts.values['--engines'] ?? process.env.SS_ENGINES)
  const requested = opts.values['--runner'] ?? process.env.SS_RUNNER ?? 'auto'
  if (!['auto', 'local', 'docker'].includes(requested)) throw new HarnessError('--runner is auto, local or docker')

  const root = resolve(opts.values['--root'] ?? REPO)
  const siteDir = resolve(opts.values['--site-dist'] ?? join(root, 'apps/site/dist'))
  const instrumentsDir = resolve(opts.values['--instruments-dist'] ?? join(root, 'apps/instruments/dist'))
  const wantApp = opts.fixtures.length === 0 || cfg.routes.length > 0

  if (opts.flags.has('--list')) {
    console.log(`a11y: widths ${cfg.widths.join(', ')}; themes ${cfg.themes.join(', ')}; fails on ${cfg.failOn} or worse`)
    if (existsSync(siteDir)) for (const r of routesLib.planRoutes(root, siteDir).routes) console.log(`  site ${r.path}`)
    return 0
  }

  // browsers: here, or in the pinned image
  const runner = await browserLib.chooseRunner(requested, engines)
  if (runner.kind === 'none') throw new HarnessError(runner.why)
  if (runner.kind === 'docker') {
    process.stderr.write(`a11y: no local browser; running in ${browserLib.PLAYWRIGHT_IMAGE}\n`)
    const mounts = []
    const args = []
    const argv = process.argv.slice(2)
    const inRepo = (p) => p === REPO || p.startsWith(`${REPO}/`)
    for (let i = 0; i < argv.length; i += 1) {
      const a = argv[i]
      if (['--root', '--site-dist', '--instruments-dist', '--fixture', '--learner-state', '--screenshots'].includes(a) && argv[i + 1] !== 'none') {
        const host = resolve(argv[i + 1])
        if (a === '--screenshots') mkdirSync(host, { recursive: true })
        if (!inRepo(host)) mounts.push({ host, guest: host, readOnly: a !== '--screenshots' })
        args.push(a, inRepo(host) ? join('/work', relative(REPO, host)) : host)
        i += 1
      } else args.push(a)
    }
    return browserLib.runInDocker({ repoRoot: REPO, nodeArgs: ['scripts/a11y.mjs', ...args, '--runner', 'local'], mounts })
  }

  if (opts.flags.has('--self-check')) {
    const { selfCheck } = await import(pathToFileURL(join(REPO, 'scripts/spikes/W1-T41/self-check.mjs')).href)
    return selfCheck({ gate: 'GATE-a11y', repo: REPO, script: fileURLToPath(import.meta.url), kind: 'a11y' })
  }

  if (wantApp && opts.flags.has('--build')) {
    console.error('a11y: building (npm run build)')
    const b = spawnSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] })
    if (b.status !== 0) throw new HarnessError('the build failed')
  }
  if (wantApp && !existsSync(siteDir)) throw new HarnessError(`there is no site build at ${siteDir.startsWith(`${REPO}/`) ? relative(REPO, siteDir) : 'the given path'}; run \`npm run build\` first, or pass --build`)

  // the learner-state fixture
  const stateFile = opts.values['--learner-state'] ?? join(REPO, seedLib.DEFAULT_FIXTURE)
  const state = wantApp && stateFile !== 'none' ? seedLib.loadLearnerState(resolve(stateFile)) : null

  const { AxeBuilder } = await import('@axe-core/playwright')
  const pw = await import('playwright-core')
  const rows = []
  const scrolls = []
  let checked = 0
  const snaps = []
  let world = null
  try {
    let targets = opts.fixtures.map((f) => {
      const file = resolve(f)
      if (!existsSync(file)) throw new HarnessError(`no fixture at ${f}`)
      return { label: f, url: pathToFileURL(file).href, kind: 'fixture' }
    })
    if (wantApp) {
      const site = worldLib.snapshotDir(siteDir, 'a11y-site')
      const instr = existsSync(instrumentsDir) ? worldLib.snapshotDir(instrumentsDir, 'a11y-instruments') : null
      snaps.push(site, ...(instr ? [instr] : []))
      world = await worldLib.startWorld({ siteDir: site, instrumentsDir: instr ?? site })
      const paths = cfg.routes.length > 0 ? cfg.routes : routesLib.planRoutes(root, siteDir).routes.map((r) => r.path)
      targets.push(...paths.map((p) => ({ label: p, url: `${world.siteOrigin}${p}`, kind: 'site' })))
      if (cfg.routes.length === 0 && instr) {
        for (const page of ['host.html', 'instrument.html']) {
          const rel = existsSync(join(instr, page)) ? page : (budgets.findHostPage(instr) ?? '').replace(/host\.html$/, page)
          if (rel && existsSync(join(instr, rel))) targets.push({ label: `instruments /${rel}`, url: `${world.instrumentOrigin}/${rel}`, kind: 'instruments' })
        }
      }
    }
    let seedNote = state ? 'learner state: not tried (no site screen in this run)' : 'learner state: none'
    let seedWait = 4000 // how long to wait for the app to create its database; shortened once it is known to have none
    let everSeeded = false
    for (const engine of engines) {
      const browser = await pw[engine].launch({ executablePath: engine === 'chromium' ? process.env.PW_CHROMIUM_EXECUTABLE || undefined : undefined })
      try {
        for (const theme of cfg.themes) {
          for (const width of cfg.widths) {
            const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: THEMES[theme], reducedMotion: 'reduce', serviceWorkers: 'allow' })
            let seededHere = false
            // put the fixture into the app's database once per context, the first time a screen has made it
            const trySeed = state
              ? async (page) => {
                  if (seededHere || !page.url().startsWith(world.siteOrigin)) return false
                  const seeded = await seedLib.seedLearnerState(page, state, seedWait)
                  if (seeded.applied) {
                    seededHere = true
                    everSeeded = true
                    seedNote = `learner state: applied (${Object.entries(seeded.counts).map(([k, v]) => `${v} ${k}`).join(', ')})`
                  } else {
                    if (!everSeeded) seedNote = `learner state: NOT applied (${seeded.reason})`
                    if (/has not created/.test(seeded.reason ?? "")) seedWait = 1500
                  }
                  return seeded.applied
                }
              : null
            try {
              if (state) await seedLib.freezeClock(context, state)
              if (trySeed && targets.some((t) => t.kind === 'site')) {
                const start = await context.newPage()
                await start.goto(`${world.siteOrigin}/`, { waitUntil: 'load' })
                await trySeed(start)
                await start.close()
              }
              for (const t of targets) {
                try {
                  const screenshot = opts.values['--screenshots']
                    ? async (page) => {
                        const dir = join(resolve(opts.values['--screenshots']), engine, theme, String(width))
                        mkdirSync(dir, { recursive: true })
                        await page.screenshot({ path: join(dir, `${slug(t.label)}.png`), fullPage: true })
                      }
                    : null
                  const result = await checkPage(context, t.label, t.url, width, theme, { AxeBuilder, screenshot, seed: t.kind === 'site' ? trySeed : null })
                  rows.push(...result.rows)
                  if (result.scroll) scrolls.push(result.scroll)
                  checked += 1
                } catch (err) {
                  if (err instanceof HarnessError) throw err
                  throw new HarnessError(`${t.label} at ${width}px (${theme}): ${err instanceof Error ? err.message : err}`)
                }
              }
            } finally {
              await context.close()
            }
          }
        }
      } finally {
        await browser.close()
      }
    }
    if (state && opts.flags.has('--require-seed') && !everSeeded) throw new HarnessError(`the learner-state fixture could not be put into the app (${seedNote})`)
    if (!opts.flags.has('--json')) console.log(`a11y: ${seedNote}`)
    const ok = opts.flags.has('--json')
      ? (console.log(JSON.stringify({ widths: cfg.widths, themes: cfg.themes, checked, seed: seedNote, rows, scrolls }, null, 2)),
        rows.filter((r) => IMPACTS.indexOf(r.impact) <= IMPACTS.indexOf(cfg.failOn)).length === 0 && scrolls.length === 0)
      : report(rows, scrolls, checked, cfg.failOn)
    return ok ? 0 : 1
  } finally {
    if (world) await world.close()
    for (const d of snaps) rmSync(d, { recursive: true, force: true })
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`a11y: ${err instanceof HarnessError ? err.message : (err?.stack ?? err)}`)
    process.exit(2)
  },
)
