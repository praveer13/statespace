// Runs inside the pinned Playwright image (mcr.microsoft.com/playwright:v1.63.0-noble):
//   node scripts/spikes/W1-T16/harness/check.mjs <dist> <out> <base>
// Serves the built harness, and for Chromium, Firefox and WebKit, at 320, 360 and 1280 px, in both themes:
//   - runs axe (WCAG 2.2 AA tags) on the screen for a learner who holds every S1 specimen, with every label closed and with
//     every label open, and on the screen for a learner who holds none; reports serious and critical violations
//   - requires that the page never scrolls sideways, that the three faces loaded, and that every control is at least 44 px
//     in both directions (buttons, selects, summaries, chips and the schedule's links; DESIGN.md section 2.8)
//   - walks the screen by keyboard: every Tab stop shows a focus ring and, once the browser has scrolled to it, is in view; a
//     heading button opens and closes its label with Enter and with Space, and the arrow keys move the status filter
//   - follows a fragment (#SP-1.4) to its label, which opens
//   - mounts the real route over the real IndexedDB adapter with the clock fixed, reads a learner's log, and sees a call that a
//     second tab writes arrive without a reload
// and writes screenshots (plain, grayscale and, at 360 px, forced colors) and a report. Exit 0 when nothing fails.

import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium, firefox, webkit } from 'playwright-core'

const [dist, out, base = '/statespace/'] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const p = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null
  if (p === null) return res.writeHead(404).end()
  const file = path.join(dist, p === '' || p.endsWith('/') ? `${p}index.html` : p)
  if (!file.startsWith(path.resolve(dist)) || !fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4173, '127.0.0.1', r))
const origin = `http://127.0.0.1:4173${base}`

const failures = []
const report = { runs: [], keyboard: [], route: [], notes: [] }
const fail = (where, what) => {
  failures.push(`${where}: ${what}`)
  console.log(`FAIL ${where}: ${what}`)
}

const ready = async (page) => {
  await page.waitForSelector('html[data-harness="ready"]', { timeout: 40000 })
  await page.evaluate(() => document.fonts.ready)
}

async function axeOf(page) {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  return {
    serious: axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })),
    all: axe.violations.map((v) => `${v.id}:${v.impact}`),
  }
}

/** Controls that must be at least 44 x 44 px (DESIGN.md section 2.8). A label is the chip's face; a summary is a disclosure's control. */
async function smallControls(page) {
  return page.evaluate(() => {
    const sel = 'button, select, summary, .sp-chip-face, .sp-schedule-link'
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent ?? '').trim().slice(0, 30)}"`)
  })
}

const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await engine.launch()
  const version = browser.version()
  for (const width of [320, 360, 1280]) {
    for (const theme of ['light', 'night']) {
      const tag = `${name}-${width}-${theme}`
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === 'night' ? 'dark' : 'light' })
      const page = await context.newPage()
      const cases = [
        ['closed', `learner=all&theme=${theme}`],
        ['open', `learner=all&theme=${theme}&open=all`],
        ['none', `learner=none&theme=${theme}`],
      ]
      for (const [kind, query] of cases) {
        await page.goto(`${origin}?${query}`)
        await ready(page)
        // the site's three faces: the structure face, the reading face and the code face (DESIGN.md section 3); a family name is
        // compared without the quotes a browser may give it
        const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '')))
        for (const face of ['Archivo', 'Source Serif 4', 'JuliaMono']) if (kind === 'closed' && !fonts.includes(face)) fail(tag, `${face} did not load`)
        const overflow = await overflowOf(page)
        if (overflow > 0) {
          const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)}`))
          fail(`${tag} ${kind}`, `scrolls sideways by ${overflow} px: ${offenders.join(', ')}`)
        }
        const axe = await axeOf(page)
        for (const v of axe.serious) fail(`${tag} ${kind}`, `axe ${v.id} (${v.impact}, ${v.nodes} nodes): ${v.help}; ${v.targets.join(' | ')}`)
        const small = await smallControls(page)
        for (const s of small) fail(`${tag} ${kind}`, `a control under 44 px: ${s}`)
        const articles = await page.locator('article.sp-item').count()
        const expected = kind === 'none' ? 0 : 10
        if (articles !== expected) fail(`${tag} ${kind}`, `${articles} labels listed, expected ${expected}`)
        if (kind === 'open' || width >= 900) {
          const open = await page.locator('article.sp-item[data-open="true"]').count()
          if (kind !== 'none' && open !== 10) fail(`${tag} ${kind}`, `${open} of 10 labels are open`)
        }
        report.runs.push({ engine: name, version, width, theme, kind, labels: articles, overflowPx: overflow, axeSerious: axe.serious.length, axeViolations: axe.all, smallControls: small.length, fonts: kind === 'closed' ? [...new Set(fonts)].sort() : null })
        if (name === 'chromium' && (width === 360 || width === 1280 || (width === 320 && theme === 'light')) && kind !== 'none') {
          await page.screenshot({ path: path.join(out, `${tag}-${kind}.png`), fullPage: true })
          if (width === 360 && kind === 'open') {
            await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
            await page.screenshot({ path: path.join(out, `${tag}-${kind}-gray.png`), fullPage: true })
          }
        }
      }
      await context.close()
    }
  }

  // ---------------------------------------------------------------- keyboard, at a phone and at a desktop width
  for (const width of [360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    await page.goto(`${origin}?learner=all`)
    await ready(page)
    const stops = []
    const stop = () =>
      page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const ring = (e) => {
          const s = getComputedStyle(e)
          return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
        }
        const target = el.matches('input.visually-hidden') ? el.nextElementSibling : el
        const r = target.getBoundingClientRect()
        return { tag: el.tagName.toLowerCase(), name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40), ring: ring(target), inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight }
      })
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab')
      // a browser scrolls a newly focused element into view after the key press, not during it (WebKit centres it a moment
      // later), so a stop is judged once it has settled: out of view only when it is still out of view a second later
      let info = await stop()
      for (let wait = 0; info !== null && !info.inView && wait < 20; wait += 1) {
        await page.waitForTimeout(50)
        info = await stop()
      }
      if (info === null) break
      stops.push(info)
    }
    const noRing = stops.filter((s) => !s.ring)
    if (noRing.length > 0) fail(`${name} keyboard ${width}`, `${noRing.length} Tab stops show no focus ring: ${noRing.slice(0, 4).map((s) => `${s.tag} "${s.name}"`).join(', ')}`)
    const hidden = stops.filter((s) => !s.inView)
    if (hidden.length > 0) fail(`${name} keyboard ${width}`, `${hidden.length} Tab stops are out of view: ${hidden.slice(0, 4).map((s) => `${s.tag} "${s.name}"`).join(', ')}`)
    if (stops.length < 5) fail(`${name} keyboard ${width}`, `only ${stops.length} Tab stops`)
    report.keyboard.push({ engine: name, width, stops: stops.length })

    // the status filter: one tab stop, the arrow keys move it, and "Kept" lists the two kept specimens
    await page.goto(`${origin}?learner=all`)
    await ready(page)
    await page.locator('input[type="radio"][value="all"]').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    const checked = await page.locator('input[type="radio"]:checked').getAttribute('value')
    if (checked !== 'kept') fail(`${name} keyboard ${width}`, `two ArrowRight presses chose ${checked}, expected kept`)
    const kept = await page.locator('article.sp-item').evaluateAll((els) => els.map((e) => e.id))
    if (JSON.stringify(kept) !== JSON.stringify(['SP-1.1', 'SP-1.2'])) fail(`${name} keyboard ${width}`, `the Kept filter lists ${kept.join(', ')}`)

    if (width < 900) {
      // a heading button opens and closes its label with Enter and with Space, and says which
      await page.goto(`${origin}?learner=all`)
      await ready(page)
      const toggle = page.locator('#sp-SP-1\\.4-heading button')
      await toggle.focus()
      for (const key of ['Enter', 'Space']) {
        await page.keyboard.press(key)
        if ((await toggle.getAttribute('aria-expanded')) !== 'true') fail(`${name} keyboard ${width}`, `${key} did not open the label`)
        if (!(await page.locator('#sp-SP-1\\.4-panel').isVisible())) fail(`${name} keyboard ${width}`, `the label is not visible after ${key}`)
        await page.keyboard.press(key)
        if ((await toggle.getAttribute('aria-expanded')) !== 'false') fail(`${name} keyboard ${width}`, `${key} did not close the label`)
      }
      // a fragment opens its label and brings it into view
      await page.goto(`${origin}?learner=all&hash=SP-1.4`)
      await ready(page)
      await page.waitForFunction(() => document.querySelector('#sp-SP-1\\.4-heading button')?.getAttribute('aria-expanded') === 'true')
      // the scroll to the label follows the label's opening by a frame or more, so it is given a second to settle
      const topOf = () => page.evaluate(() => document.getElementById('SP-1.4').getBoundingClientRect().top)
      let top = await topOf()
      for (let wait = 0; top > 900 && wait < 20; wait += 1) {
        await page.waitForTimeout(50)
        top = await topOf()
      }
      if (top > 900) fail(`${name} fragment ${width}`, `#SP-1.4 is ${Math.round(top)} px down the page, out of view`)
    }
    await context.close()
  }

  // ---------------------------------------------------------------- the route over the real IndexedDB adapter
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, serviceWorkers: 'block' })
    const a = await context.newPage()
    await a.clock.setFixedTime(new Date('2026-11-12T09:00:00Z'))
    await a.goto(`${origin}?mode=route&learner=all`)
    await ready(a)
    await a.waitForSelector('article.sp-item')
    const states = await a.locator('article.sp-item').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.id, e.getAttribute('data-status')])))
    const expected = { 'SP-1.1': 'kept', 'SP-1.2': 'kept', 'SP-1.3': 'mounted', 'SP-1.4': 'mounted', 'SP-1.5': 'mounted', 'SP-1.6': 'mounted', 'SP-1.7': 'mounted', 'SP-1.8': 'mounted', 'SP-1.9': 'mounted', 'SP-1.10': 'mounted' }
    if (JSON.stringify(states) !== JSON.stringify(expected)) fail(`${name} route`, `the route lists ${JSON.stringify(states)}`)
    const schedule = await a.locator('.sp-schedule-list li').count()
    if (schedule !== 8) fail(`${name} route`, `the schedule lists ${schedule} re-finds, expected 8`)
    report.route.push({ engine: name, states })
    await context.close()

    // two tabs of one profile: the second writes a call, and the first shows the specimens it mounts without a reload
    const ctx2 = await browser.newContext({ viewport: { width: 360, height: 900 }, serviceWorkers: 'block' })
    const first = await ctx2.newPage()
    await first.clock.setFixedTime(new Date('2026-11-12T09:00:00Z'))
    await first.goto(`${origin}?mode=route&learner=some`)
    await ready(first)
    await first.waitForSelector('article.sp-item')
    const before = await first.locator('article.sp-item').count()
    const second = await ctx2.newPage()
    await second.goto(`${origin}?mode=route&seed=0`)
    await ready(second)
    await second.evaluate(() => window.harness.append('S1.L2', '2026-11-03'))
    await first.waitForFunction((n) => document.querySelectorAll('article.sp-item').length > n, before, { timeout: 15000 }).catch(() => fail(`${name} route`, 'a call written by a second tab did not reach the first without a reload'))
    const after = await first.locator('article.sp-item').evaluateAll((els) => els.map((e) => e.id))
    if (JSON.stringify(after) !== JSON.stringify(['SP-1.1', 'SP-1.7', 'SP-1.8'])) fail(`${name} route`, `after the second tab's call the first lists ${after.join(', ')}`)
    report.route.push({ engine: name, crossTab: { before, after } })
    await ctx2.close()
  }

  // forced colors keep the witness's rule and the stamps' frames (a screenshot to look at; the frames are the stamp component's)
  if (name === 'chromium') {
    const fc = await browser.newContext({ viewport: { width: 360, height: 900 }, forcedColors: 'active' })
    const fp = await fc.newPage()
    await fp.goto(`${origin}?learner=all&open=all`)
    await ready(fp)
    await fp.screenshot({ path: path.join(out, 'chromium-360-forced.png'), fullPage: true })
    const rule = await fp.evaluate(() => {
      const el = document.querySelector('.sp-witness')
      const s = getComputedStyle(el)
      return { style: s.borderLeftStyle, width: s.borderLeftWidth }
    })
    if (rule.style === 'none' || parseFloat(rule.width) < 3) fail('chromium forced colors', `the witness's left rule is ${rule.style} ${rule.width}`)
    await fc.close()
  }
  await browser.close()
}

report.failures = failures
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
server.close()
console.log(`${report.runs.length} axe and layout runs, ${report.keyboard.length} keyboard walks, ${report.route.length} route checks; ${failures.length} failures`)
process.exit(failures.length === 0 ? 0 : 1)
