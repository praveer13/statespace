// W0-S03: the corpus through Pyodide + Z3 in a module worker, in Chromium, Firefox and WebKit.
//
//   node browser-run.mjs --corpus <corpus.json> --wheel <z3 wheel> --out <dir> [--probes] [--browsers chromium,firefox,webkit]
//
// Runs where Playwright's browsers are installed (the pinned Playwright container). One local static
// server stands in for the instrument origin: no COOP/COEP headers, as on static hosting. Writes
// <dir>/<browser>.json (replies and meta) and, with --probes, <dir>/<browser>-probes.json.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))[0]
const corpusFile = path.resolve(opt('corpus'))
const wheelFile = path.resolve(opt('wheel'))
const outDir = path.resolve(opt('out'))
const wantProbes = argv.includes('--probes')
const browsers = (opt('browsers') ?? 'chromium,firefox,webkit').split(',')
const pyodideDir = path.join(here, 'node_modules', 'pyodide')

const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.py': 'text/plain', '.zip': 'application/zip' }
const routes = {
  '/': path.join(here, 'browser', 'index.html'),
  '/browser/worker.mjs': path.join(here, 'browser', 'worker.mjs'),
  '/engine.mjs': path.join(here, 'engine.mjs'),
  '/ss_datalog.py': path.join(here, 'ss_datalog.py'),
  '/probes.py': path.join(here, 'probes.py'),
  '/corpus.json': corpusFile,
  [`/wheels/${path.basename(wheelFile)}`]: wheelFile,
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname
  let file = routes[url]
  if (url === '/wheels/NAME') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end(path.basename(wheelFile))
  }
  if (!file && url.startsWith('/pyodide/')) file = path.join(pyodideDir, path.basename(url))
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404)
    return res.end()
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
fs.mkdirSync(outDir, { recursive: true })

const launchers = { chromium, firefox, webkit }
async function job(browser, spec, timeout) {
  const page = await browser.newPage()
  page.on('console', (m) => console.log(`  [${spec.cmd}] ${m.text()}`.slice(0, 160)))
  try {
    await page.goto(`${origin}/?job=${encodeURIComponent(JSON.stringify(spec))}`)
    await page.waitForFunction(() => window.__result, null, { timeout })
    return await page.evaluate(() => window.__result)
  } catch (e) {
    return { error: String(e).split('\n')[0].slice(0, 200) }
  } finally {
    await page.close().catch(() => {})
  }
}

let failed = false
for (const name of browsers) {
  let browser = await launchers[name].launch()
  const version = browser.version()
  const t0 = Date.now()
  const started_at = new Date(t0).toISOString()
  const run = await job(browser, { cmd: 'corpus' }, 15 * 60 * 1000)
  if (run.error) {
    failed = true
    console.log(`${name}: FAILED ${run.error}`)
    await browser.close().catch(() => {})
    continue
  }
  const { meta, replies } = run.result
  meta.runtime = `Pyodide ${meta.pyodide} (CPython ${meta.python}) in a module worker, ${name} ${version}`
  meta.browser = { name, version }
  meta.wall_s = (Date.now() - t0) / 1000
  meta.started_at = started_at
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ meta, replies }))
  console.log(`${name} ${version}: ${replies.length} cases in ${meta.total_s.toFixed(1)} s (wall ${meta.wall_s.toFixed(1)} s); z3 ${meta.z3}; load ${JSON.stringify(meta.load_ms)}`)
  if (wantProbes) {
    const scenarios = (await job(browser, { cmd: 'scenarios' }, 120000)).result
    const probes = []
    for (const scenario of scenarios) {
      if (!browser.isConnected()) browser = await launchers[name].launch()
      const r = await job(browser, { cmd: 'probe', scenario }, 120000)
      probes.push(r.error ? { scenario, outcome: /crashed/.test(r.error) ? 'page crashed' : /Timeout/.test(r.error) ? 'timed out' : 'error', error: r.error } : { scenario, outcome: 'returned', result: r.result })
      console.log(`  ${scenario.padEnd(42)} ${probes.at(-1).outcome} ${JSON.stringify(probes.at(-1).result ?? probes.at(-1).error).slice(0, 110)}`)
    }
    fs.writeFileSync(path.join(outDir, `${name}-probes.json`), JSON.stringify({ meta, probes }, null, 1))
  }
  await browser.close().catch(() => {})
}
server.close()
process.exit(failed ? 1 : 0)
