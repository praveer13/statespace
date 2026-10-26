// Does the learner-state fixture reach the site's real storage adapter? W1-T03's adapter (apps/site/src/storage) is bundled with
// esbuild and run in a browser; the page opens a store, which makes the IndexedDB database `statespace`; the gate's seeding
// (lib/seed.ts, the one GATE-a11y uses) writes the fixture into it; and a fresh page opens the store again and reads the log and
// the mirror through the adapter's own API. The adapter validates what it reads, so a fixture it refuses shows in status().
//
// Run in the pinned Playwright image with the repository mounted (scripts/spikes/W1-T41/seed-adapter.test.mjs does):
//   node scripts/spikes/W1-T41/seed-adapter-check.mjs [--engines chromium,firefox,webkit]
// It prints one line per engine and exits 0 when the fixture arrives whole in every engine.

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const at = (...p) => pathToFileURL(path.join(ROOT, ...p)).href
const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
const pw = await import('playwright-core')
const seed = await import(at('scripts', 'spikes', 'W1-T41', 'lib', 'seed.ts'))
const state = seed.loadLearnerState(path.join(ROOT, seed.DEFAULT_FIXTURE))

const engineArg = process.argv.indexOf('--engines')
const engines = (engineArg > 0 ? process.argv[engineArg + 1] : 'chromium').split(',')

const built = await esbuild.build({
  entryPoints: [path.join(ROOT, 'scripts', 'spikes', 'W1-T41', 'fixtures', 'storage-harness.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  logLevel: 'silent',
})
const bundle = built.outputFiles[0].text
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>storage harness</title><script type="module" src="/bundle.js"></script></head><body></body></html>'
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': req.url === '/bundle.js' ? 'text/javascript' : 'text/html' })
  res.end(req.url === '/bundle.js' ? bundle : html)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}/`

let failed = 0
for (const name of engines) {
  const browser = await pw[name].launch()
  try {
    const context = await browser.newContext()
    await seed.freezeClock(context, state)
    const first = await context.newPage()
    await first.goto(base)
    await first.waitForFunction(() => document.title === 'storage harness ready')
    await first.evaluate(async () => {
      const store = await window.ledger.openLedgerStore()
      store.close()
    })
    const seeded = await seed.seedLearnerState(first, state)
    await first.close()

    const second = await context.newPage()
    await second.goto(base)
    await second.waitForFunction(() => document.title === 'storage harness ready')
    const read = await second.evaluate(async () => {
      const store = await window.ledger.openLedgerStore()
      const events = await store.events()
      const mirror = await store.listMirror()
      const status = store.status()
      store.close()
      return { ids: events.map((e) => e.id), mirror: mirror.map((m) => m.path), problems: status.problems ?? [] }
    })
    const wantIds = state.events.map((e) => e.id).sort()
    const gotIds = [...read.ids].sort()
    const ok =
      seeded.applied &&
      JSON.stringify(gotIds) === JSON.stringify(wantIds) &&
      JSON.stringify([...read.mirror].sort()) === JSON.stringify(state.mirror.map((m) => m.path).sort()) &&
      read.problems.length === 0
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: seeded ${JSON.stringify(seeded.counts)}; the store reads ${read.ids.length} events and ${read.mirror.length} mirror files${read.problems.length ? `; problems: ${read.problems.join(' | ')}` : ''}${seeded.applied ? '' : `; not applied: ${seeded.reason}`}`)
    if (!ok) failed += 1
  } finally {
    await browser.close()
  }
}
server.close()
process.exit(failed === 0 ? 0 : 1)
