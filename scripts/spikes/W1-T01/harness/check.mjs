// Runs inside the pinned Playwright image (mcr.microsoft.com/playwright:v1.63.0-noble):
//   node scripts/spikes/W1-T01/harness/check.mjs <dist> <out> <base>
// Serves the built harness page, and for Chromium, Firefox and WebKit at 320, 360 and 1280 px in both themes:
// runs axe (WCAG 2.2 AA tags) and reports serious and critical violations, checks that the page never scrolls
// sideways and that the three faces loaded, and writes screenshots: plain, in grayscale, and under forced colors.

import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium, firefox, webkit } from 'playwright-core'

const [dist, out, base = '/statespace/'] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' }
const requests = []
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  requests.push(url.pathname)
  let p = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null
  if (p === null) {
    res.writeHead(404).end()
    return
  }
  if (p === '' || p.endsWith('/')) p += 'index.html'
  const file = path.join(dist, p)
  if (!file.startsWith(path.resolve(dist)) || !fs.existsSync(file)) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4173, '127.0.0.1', r))

const report = { runs: [], fonts404: [] }
for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await engine.launch()
  for (const width of [320, 360, 1280]) {
    for (const theme of ['light', 'night']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === 'night' ? 'dark' : 'light' })
      const page = await context.newPage()
      await page.goto(`http://127.0.0.1:4173${base}?theme=${theme}`)
      await page.waitForSelector('.strip')
      await page.evaluate(() => document.fonts.ready)
      const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const offenders = overflow > 0 ? await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)}`)) : []
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
      const tag = `${name}-${width}-${theme}`
      if (name === 'chromium') {
        await page.screenshot({ path: path.join(out, `${tag}.png`), fullPage: true })
        await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
        await page.screenshot({ path: path.join(out, `${tag}-gray.png`), fullPage: true })
        if (width === 360) {
          const fc = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === 'night' ? 'dark' : 'light', forcedColors: 'active' })
          const fp = await fc.newPage()
          await fp.goto(`http://127.0.0.1:4173${base}?theme=${theme}`)
          await fp.waitForSelector('.strip')
          await fp.evaluate(() => document.fonts.ready)
          await fp.screenshot({ path: path.join(out, `${tag}-forced.png`), fullPage: true })
          await fc.close()
        }
      }
      report.runs.push({ engine: name, version: browser.version(), width, theme, overflowPx: overflow, offenders, fontsLoaded: fonts, axeSerious: serious, axeViolations: axe.violations.map((v) => `${v.id}:${v.impact}`) })
      await context.close()
    }
  }
  await browser.close()
}
report.fonts404 = requests.filter((p) => p.includes('/fonts/')).filter((p) => !fs.existsSync(path.join(dist, p.slice(base.length))))
report.fontRequests = [...new Set(requests.filter((p) => p.includes('/fonts/')))].sort()
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
server.close()
const bad = report.runs.filter((r) => r.axeSerious.length > 0 || r.overflowPx > 0)
console.log(`${report.runs.length} runs; ${bad.length} with a serious axe issue or sideways scroll; font requests: ${report.fontRequests.join(', ')}`)
for (const r of bad) console.log(JSON.stringify(r))
process.exit(bad.length === 0 ? 0 : 1)
