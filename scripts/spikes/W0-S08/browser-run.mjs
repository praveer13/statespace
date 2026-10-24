#!/usr/bin/env node
// W0-S08: drive one browser engine through the harness page. Runs inside the Playwright container.
//
//   node browser-run.mjs --engine chromium|firefox|webkit --task rls|first-load|specimens|throttle|slow|memory [--pglite <dependency name>]
//                        [--worlds 200] [--repeat 3] [--instances 5] [--gzip-level 5] [--gz-dir /gz]
//
// Prints one JSON object on stdout; progress goes to stderr. The page, the worker and the PGlite files are served
// by serve.mjs on a loopback port, so the engine sees an ordinary same-origin site with no isolation headers.
//
// first-load: for each of identity and gzip, `repeat` cold loads (a fresh browser context, so an empty HTTP cache),
//   then one warm load in the last context. Sizes come from the server's log of bytes sent and from the engine's own
//   resource timing; times are the worker's own clock.
// rls: one load with gzip, then the specimens of rls-spec.mjs inside the worker.
// specimens: one load with gzip, then the single-session specimens of RUN-pglite on a fresh instance.
// throttle (chromium only): Chrome DevTools Protocol CPU throttling at 1x, 4x and 6x; at each rate a CPU probe in the
//   worker (to see whether the throttle reaches it) and a cold first load with gzip. An emulation, not a phone.
// memory: one blank page for a baseline, then the harness page, one live PGlite instance, `repeat` cycles of close and
//   fresh instance, the last instance closed, and the page closed. After each step the memory of every browser process
//   is sampled (the sum of VmRSS, container-wide except this driver) once things have settled for 1.5 s.
// slow: run it in a container started with a CPU quota (docker run --cpus=Q). Three CPU probes in the worker, then one
//   cold first load with gzip. The probe's time against an unconstrained run is the effective slowdown. An emulation, not a phone.

import { parseArgs } from 'node:util'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright-core'
import { startServer } from './serve.mjs'

const { values: a } = parseArgs({
  options: {
    engine: { type: 'string' }, task: { type: 'string' }, pglite: { type: 'string', default: '@electric-sql/pglite' },
    worlds: { type: 'string', default: '200' }, repeat: { type: 'string', default: '3' }, instances: { type: 'string', default: '5' }, label: { type: 'string' },
    'gzip-level': { type: 'string', default: '5' }, 'gz-dir': { type: 'string' },
  },
})
const launchers = { chromium, firefox, webkit }
if (!launchers[a.engine] || !['rls', 'first-load', 'specimens', 'throttle', 'slow', 'memory'].includes(a.task)) { console.error('usage: see the header of browser-run.mjs'); process.exit(2) }

const here = path.dirname(fileURLToPath(import.meta.url))
const pgliteDist = path.dirname(fileURLToPath(import.meta.resolve(a.pglite)))
const pgliteVersion = JSON.parse(readFileSync(path.join(pgliteDist, '..', 'package.json'), 'utf8')).version
const log = (...m) => console.error(`[${a.engine}/${a.task}]`, ...m)

// total resident memory of every process in this container except this one, in bytes (browser processes only)
function browserRssBytes() {
  let total = 0
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    if (Number(pid) === process.pid) continue
    try {
      const m = /VmRSS:\s+(\d+) kB/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))
      if (m) total += Number(m[1]) * 1024
    } catch { /* process gone */ }
  }
  return total
}

const server = await startServer({
  routes: [{ prefix: '/pglite/', dir: pgliteDist, gzDir: a['gz-dir'] }, { prefix: '/spec/', dir: here }, { prefix: '/', dir: path.join(here, 'browser') }],
  gzipLevel: Number(a['gzip-level']),
})
const base = `http://127.0.0.1:${server.port}`
const browser = await launchers[a.engine].launch()
const out = {
  engine: a.engine, task: a.task, browser_version: browser.version(), pglite_dependency: a.pglite, pglite_version: pgliteVersion,
  playwright_core: JSON.parse(readFileSync(new URL('./node_modules/playwright-core/package.json', import.meta.url), 'utf8')).version,
  node: process.version, started_at: new Date().toISOString(),
}
const withTimeout = (p, ms, what) => {
  let timer
  const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout after ${ms} ms: ${what}`)), ms) })
  return Promise.race([p, limit]).finally(() => clearTimeout(timer))
}

async function openPage(ctx) {
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('part') || m.text().startsWith('world')) log('page:', m.text()) })
  page.on('pageerror', (e) => log('pageerror:', e.message))
  const requests = []
  page.on('requestfinished', async (req) => {
    try { const s = await req.sizes(); requests.push({ path: new URL(req.url()).pathname, response_body_size: s.responseBodySize, response_headers_size: s.responseHeadersSize }) } catch { /* sizes unavailable */ }
  })
  await page.goto(`${base}/index.html`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__pageReady === true, null, { timeout: 30000 })
  return { page, requests }
}

try {
  out.user_agent = null
  if (a.task === 'first-load') {
    out.first_load = {}
    for (const mode of ['identity', 'gzip']) {
      server.setEncoding(mode)
      const runs = []
      let lastCtx = null
      for (let i = 0; i < Number(a.repeat); i++) {
        if (lastCtx) await lastCtx.close()
        const ctx = await browser.newContext()
        lastCtx = ctx
        const mark = server.log.length
        const { page, requests } = await openPage(ctx)
        out.user_agent ??= await page.evaluate(() => navigator.userAgent)
        const t = Date.now()
        const result = await withTimeout(page.evaluate((n) => window.runTask({ task: 'first-load', instances: n }), Number(a.instances)), 180000, 'first-load')
        runs.push({ cold: true, wall_ms: Date.now() - t, result, server_log: server.log.slice(mark), playwright_sizes: requests })
        await page.close()
        log(mode, 'cold', i + 1, 'ready', Math.round(result.first.ready_ms), 'ms, total', Math.round(result.first.total_ms), 'ms')
      }
      // warm: a new page in the last context, whose HTTP cache holds the files
      const mark = server.log.length
      const { page, requests } = await openPage(lastCtx)
      const result = await withTimeout(page.evaluate((n) => window.runTask({ task: 'first-load', instances: n }), 1), 180000, 'first-load warm')
      runs.push({ cold: false, result, server_log: server.log.slice(mark), playwright_sizes: requests })
      log(mode, 'warm ready', Math.round(result.first.ready_ms), 'ms, requests to server', server.log.length - mark)
      await lastCtx.close()
      out.first_load[mode] = runs
    }
  } else if (a.task === 'specimens') {
    server.setEncoding('gzip')
    const ctx = await browser.newContext()
    const { page } = await openPage(ctx)
    out.user_agent = await page.evaluate(() => navigator.userAgent)
    out.specimens = await withTimeout(page.evaluate(() => window.runTask({ task: 'specimens' })), 180000, 'specimens')
    await ctx.close()
  } else if (a.task === 'memory') {
    server.setEncoding('gzip')
    const settle = () => new Promise((r) => setTimeout(r, 1500))
    const ctx = await browser.newContext()
    const blank = await ctx.newPage()
    await blank.goto('about:blank')
    await settle()
    out.steps = [{ step: 'a blank page', rss_bytes: browserRssBytes() }]
    const { page } = await openPage(ctx)
    out.user_agent = await page.evaluate(() => navigator.userAgent)
    await settle()
    out.steps.push({ step: 'the harness page and its worker, no PGlite yet', rss_bytes: browserRssBytes() })
    const open = await withTimeout(page.evaluate(() => window.runTask({ task: 'mem-open' })), 180000, 'mem-open')
    await settle()
    out.wasm_memory_bytes = open.wasm_memory_bytes
    out.steps.push({ step: 'one live instance', rss_bytes: browserRssBytes() })
    for (let i = 1; i <= Number(a.repeat); i++) {
      await withTimeout(page.evaluate(() => window.runTask({ task: 'mem-cycle' })), 180000, 'mem-cycle')
      await settle()
      out.steps.push({ step: `after ${i} close-and-recreate cycle${i > 1 ? 's' : ''}`, rss_bytes: browserRssBytes() })
    }
    await withTimeout(page.evaluate(() => window.runTask({ task: 'mem-close' })), 180000, 'mem-close')
    await settle()
    out.steps.push({ step: 'the last instance closed', rss_bytes: browserRssBytes() })
    await page.close()
    await settle()
    out.steps.push({ step: 'the harness page closed (its worker ends)', rss_bytes: browserRssBytes() })
    await ctx.close()
  } else if (a.task === 'slow') {
    server.setEncoding('gzip')
    out.label = a.label ?? null
    out.repeats = []
    for (let i = 0; i < Number(a.repeat); i++) {
      const ctx = await browser.newContext()
      const { page } = await openPage(ctx)
      out.user_agent ??= await page.evaluate(() => navigator.userAgent)
      const probes = []
      for (let k = 0; k < 3; k++) probes.push((await withTimeout(page.evaluate(() => window.runTask({ task: 'cpu-probe' })), 300000, 'cpu-probe')).ms)
      const load = await withTimeout(page.evaluate(() => window.runTask({ task: 'first-load', instances: 2 })), 600000, 'first-load slow')
      out.repeats.push({ cpu_probe_ms: probes, first: load.first, further_instances: load.further_instances })
      log(a.label ?? '', 'cpu probe', probes.map(Math.round), 'ms; ready', Math.round(load.first.ready_ms), 'ms')
      await ctx.close()
    }
  } else if (a.task === 'throttle') {
    if (a.engine !== 'chromium') throw new Error('CPU throttling through the DevTools protocol is Chromium only')
    server.setEncoding('gzip')
    out.throttle = []
    for (const rate of [1, 4, 6]) {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      const cdp = await ctx.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      await page.goto(`${base}/index.html`, { waitUntil: 'load' })
      await page.waitForFunction(() => window.__pageReady === true, null, { timeout: 30000 })
      out.user_agent ??= await page.evaluate(() => navigator.userAgent)
      const probe = await withTimeout(page.evaluate(() => window.runTask({ task: 'cpu-probe' })), 180000, 'cpu-probe')
      const load = await withTimeout(page.evaluate(() => window.runTask({ task: 'first-load', instances: 2 })), 300000, 'first-load throttled')
      out.throttle.push({ rate, cpu_probe_ms: probe.ms, first: load.first, further_instances: load.further_instances })
      log('rate', rate, 'cpu probe', Math.round(probe.ms), 'ms, ready', Math.round(load.first.ready_ms), 'ms')
      await ctx.close()
    }
  } else {
    server.setEncoding('gzip')
    const ctx = await browser.newContext()
    const { page } = await openPage(ctx)
    out.user_agent = await page.evaluate(() => navigator.userAgent)
    out.rls = await withTimeout(page.evaluate((n) => window.runTask({ task: 'rls', worlds: n }), Number(a.worlds)), 900000, 'rls')
    log('done in', out.rls.duration_s, 's,', out.rls.statements.count, 'statements')
    await ctx.close()
  }
  out.finished_at = new Date().toISOString()
  out.server_requests_total = server.log.length
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e)
  log('FAILED', out.error)
  process.exitCode = 1
} finally {
  log('closing browser', new Date().toISOString())
  await browser.close()
  log('browser closed', new Date().toISOString())
  server.closeAll?.()
  await server.close()
  log('server closed', new Date().toISOString())
}
process.stdout.write(JSON.stringify(out))
log('written', new Date().toISOString())
