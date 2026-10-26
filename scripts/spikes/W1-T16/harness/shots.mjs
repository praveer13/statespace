// Element screenshots of the harness, for a person to look at (the checks are check.mjs's). Runs in the Playwright image:
//   node scripts/spikes/W1-T16/harness/shots.mjs <dist> <out> <base>
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const [dist, out, base = '/statespace/'] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' }
const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  const rel = p.startsWith(base) ? p.slice(base.length) : null
  if (rel === null) return res.writeHead(404).end()
  const file = path.join(dist, rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel)
  if (!fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4174, '127.0.0.1', r))
const origin = `http://127.0.0.1:4174${base}`
const browser = await chromium.launch()
for (const [width, theme] of [[360, 'light'], [360, 'night'], [320, 'light'], [1280, 'light'], [1280, 'night']]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === 'night' ? 'dark' : 'light' })
  const page = await context.newPage()
  await page.goto(`${origin}?learner=all&theme=${theme}&open=all`)
  await page.waitForSelector('html[data-harness="ready"]')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(out, `top-${width}-${theme}.png`) })
  for (const id of ['SP-1.1', 'SP-1.2', 'SP-1.4', 'SP-1.6', 'SP-1.8', 'SP-1.9']) {
    await page.locator(`#${id.replace('.', '\\.')}`).screenshot({ path: path.join(out, `${id}-${width}-${theme}.png`) })
  }
  await context.close()
}
await browser.close()
server.close()
