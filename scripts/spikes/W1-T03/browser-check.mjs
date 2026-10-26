// W1-T03: the IndexedDB adapter (apps/site/src/storage) in real browsers. The unit tests run it on
// fake-indexeddb under Node; this check runs the same adapter, bundled with esbuild, in Chromium, Firefox and
// WebKit, two tabs to a profile: the outbox holds a call before its commit, another tab hears the change, two
// tabs with stale views and a double import give identical logs, undo restores the log, a tab's leftover
// outbox is drained by the next one, the experiment seed is drawn once and travels by merge, every keep/kill
// read keeps a record of its own that is never replaced, and a newer schema (in the profile, or from another
// tab's upgrade) makes the store read-only. Conflicts reach the database by both of the adapter's paths:
// merge() (imports) and commit() (appends, and the leftover outbox the next tab drains). The conflicting data
// is chosen so that a store applying the last writer, or keeping the first, gives a different log than the
// canonical conflict rule; the check states that its data does so before it compares the logs.
//
// Run it in the pinned Playwright image, with the repository mounted read-only at /repo:
//
//   docker run --rm --memory=6g -v "$PWD":/repo:ro -w /repo mcr.microsoft.com/playwright:v1.63.0-noble \
//     node scripts/spikes/W1-T03/browser-check.mjs
//
// It prints one JSON object and exits 0 when every check passes in every engine.

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const at = (...p) => pathToFileURL(path.join(ROOT, ...p)).href

const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
const { chromium, firefox, webkit } = await import('playwright-core')
const ledger = await import(at('packages', 'ledger', 'src', 'index.ts'))
const { genDraw, genEvents, rng, variantOf } = await import(at('packages', 'ledger', 'test', 'helpers.ts'))

const built = await esbuild.build({
  entryPoints: [path.join(ROOT, 'scripts', 'spikes', 'W1-T03', 'harness.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  logLevel: 'silent',
})
const bundle = built.outputFiles[0].text
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ledger harness</title><script type="module" src="/bundle.js"></script></head><body></body></html>'

const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' })
    res.end(bundle)
  } else {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(html)
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}/`

// The data, generated here and written by the pages; the expected logs are computed here with the ledger.
const r = rng(20261025)
const start = genEvents(r, 20, 0)
const batchA = genEvents(r, 15, 0.2)
const batchB = genEvents(r, 15, 0.2)
const conflictsB = start.slice(0, 6).map((e) => variantOf(r, e)) // decided from b's stale view
const bundleEvents = genEvents(r, 25, 0.2)
const leftover = genEvents(r, 1, 0)[0]
const draw = genDraw(r)
void draw
// Conflicts through commit(). Both tabs append a different record under ids b read long ago (step 2): a under
// start's ids 6 to 11 and b under 9 to 14, so ids 9 to 11 are raced by both tabs. A closed tab's outbox holds
// different records under ids 15 to 19, of which a imports others just before the next tab drains it (step 5).
const appendConflictsA = start.slice(6, 12).map((e) => variantOf(r, e))
const appendConflictsB = start.slice(9, 15).map((e) => variantOf(r, e)) // decided from b's stale view
const importedA = start.slice(15, 20).map((e) => variantOf(r, e))
const leftoverConflicts = start.slice(15, 20).map((e) => variantOf(r, e)) // the closed tab decided from a stale view

// The data must tell the conflict rule apart from the two plausible mistakes: an id whose winner is the record
// already held catches a store where the last writer wins, and an id whose winner arrives later catches one
// that keeps the first. The check requires both kinds in each step.
const sameRecord = (x, y) => ledger.canonicalJson(x) === ledger.canonicalJson(y)
const appended = Map.groupBy([...appendConflictsA, ...appendConflictsB], (v) => v.id)
const appendRace = [...appended].map(([id, later]) => {
  const held = start.find((e) => e.id === id)
  return sameRecord(later.reduce(ledger.resolveConflict, held), held)
})
const appendDecisive = { ids: appended.size, heldWins: appendRace.filter(Boolean).length, laterWins: appendRace.filter((x) => !x).length }
const drainRace = start.slice(15, 20).map((e, i) => {
  const held = ledger.resolveConflict(e, importedA[i])
  return sameRecord(ledger.resolveConflict(held, leftoverConflicts[i]), held)
})
const drainDecisive = { ids: drainRace.length, heldWins: drainRace.filter(Boolean).length, laterWins: drainRace.filter((x) => !x).length }
const decisive = (d) => d.heldWins > 0 && d.laterWins > 0

async function openPage(context) {
  const page = await context.newPage()
  await page.goto(base)
  await page.waitForFunction(() => document.title === 'ledger harness ready')
  await page.evaluate(async () => {
    window.store = await window.ledger.openLedgerStore()
    window.heard = []
    window.store.subscribe((c) => window.heard.push(c))
  })
  return page
}

async function check(engineName, engine) {
  const checks = []
  const ok = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail })
  const browser = await engine.launch()
  try {
    const context = await browser.newContext()
    const a = await openPage(context)
    const b = await openPage(context)

    // 1. The outbox holds the call before record() returns; the commit empties it; the other tab hears it.
    const call = await a.evaluate(async () => {
      const outbox = () => Object.keys(localStorage).filter((k) => k.startsWith(window.ledger.OUTBOX_PREFIX)).length
      const p = window.store.record({ kind: 'call', ref: 'call:S1.L3/c1', provenance: 'own', exposure: 'unseen', conf: 'sure' })
      const during = outbox()
      const e = await p
      return { during, after: outbox(), id: e.id, status: window.store.status() }
    })
    ok('outbox-before-commit', call.during === 1 && call.after === 0, call)
    ok('store-ready', call.status.mode === 'ready' && call.status.outboxDurable && call.status.crossTab, call.status)
    await b.waitForFunction(() => window.heard.some((c) => c.reason === 'append' && !c.local), null, { timeout: 5000 })
    const seenByB = await b.evaluate(async (id) => (await window.store.events()).some((e) => e.id === id), call.id)
    ok('cross-tab-message', seenByB, 'tab b heard the append and re-read the log')

    // 2. Two tabs with stale views: b reads now, then both write concurrently, each appending (through the
    // outbox and commit()) a different record under ids b read, and b re-importing others (through merge()).
    await a.evaluate(async (events) => window.store.merge({ events }), start)
    await b.evaluate(async () => {
      window.stale = await window.store.log()
    })
    await Promise.all([
      a.evaluate(async ({ batch, appends }) => {
        for (const [i, e] of batch.entries()) {
          await window.store.append([e])
          if (i < appends.length) await window.store.append([appends[i]])
        }
      }, { batch: batchA, appends: appendConflictsA }),
      b.evaluate(async ({ batch, conflicts, appends }) => {
        await window.store.merge({ events: batch })
        for (const e of appends) await window.store.append([e])
        await window.store.merge({ events: conflicts })
      }, { batch: batchB, conflicts: conflictsB, appends: appendConflictsB }),
    ])
    const callEvent = await a.evaluate(async (id) => (await window.store.events()).find((e) => e.id === id), call.id)
    const written = [callEvent, ...start, ...batchA, ...batchB, ...conflictsB, ...appendConflictsA, ...appendConflictsB]
    const expected = ledger.eventSetDigest(ledger.logFrom(written))
    const digests = await Promise.all([a, b].map((p) => p.evaluate(async () => window.ledger.eventSetDigest(await window.store.log()))))
    ok('stale-tabs-identical', decisive(appendDecisive) && digests[0] === expected && digests[1] === expected, { expected, a: digests[0], b: digests[1], appendConflicts: appendDecisive })

    // 3. A double import gives the identical log; the second preview finds only duplicates.
    const twice = await a.evaluate(async (events) => {
      await window.store.merge({ events })
      const once = window.ledger.logDigest(await window.store.log())
      const preview = await window.store.merge({ events })
      return { once, again: window.ledger.logDigest(await window.store.log()), added: preview.added.length, conflicts: preview.conflicts.length }
    }, bundleEvents)
    ok('double-import-identical', twice.once === twice.again && twice.added === 0 && twice.conflicts === 0, twice)

    // 4. Undo restores the log exactly.
    const undo = await a.evaluate(async (events) => {
      const before = window.ledger.logDigest(await window.store.log())
      await window.store.merge({ events: events.map((e) => ({ ...e, id: `${e.id}-x` })) })
      const merged = window.ledger.logDigest(await window.store.log())
      const undone = await window.store.undo()
      return { before, merged, undone, after: window.ledger.logDigest(await window.store.log()) }
    }, bundleEvents.slice(0, 5))
    ok('undo-restores', undo.undone && undo.after === undo.before && undo.merged !== undo.before, undo)

    // 5. A tab that closed before its commit: its outbox is drained by the next tab to open. It holds a new event
    // and, decided from a stale view, different records under ids that a has just imported others of.
    await a.evaluate(async (events) => window.store.merge({ events }), importedA)
    await b.evaluate((events) => {
      localStorage.setItem(`${window.ledger.OUTBOX_PREFIX}closed-tab`, JSON.stringify({ v: 1, entries: [{ seq: 1, events, draws: [] }] }))
    }, [leftover, ...leftoverConflicts])
    const c = await openPage(context)
    const drained = await c.evaluate(async (id) => ({ status: window.store.status(), present: (await window.store.events()).some((e) => e.id === id), left: Object.keys(localStorage).filter((k) => k.endsWith('closed-tab')).length }), leftover.id)
    ok('outbox-drained', drained.status.drained === 1 && drained.present && drained.left === 0, drained)
    // The whole log, from every record written so far (step 4's merge was undone), in all three tabs.
    const afterDrain = ledger.eventSetDigest(ledger.logFrom([...written, ...bundleEvents, ...importedA, leftover, ...leftoverConflicts]))
    const drainDigests = await Promise.all([a, b, c].map((p) => p.evaluate(async () => window.ledger.eventSetDigest(await window.store.log()))))
    ok('drained-conflicts-identical', decisive(drainDecisive) && drainDigests.every((d) => d === afterDrain), { expected: afterDrain, a: drainDigests[0], b: drainDigests[1], c: drainDigests[2], leftoverConflicts: drainDecisive })

    // 6. The experiment seed in a fresh profile: drawn once, never again, refused after events; it travels by merge.
    const fresh = await browser.newContext()
    const f = await openPage(fresh)
    const seed = await f.evaluate(async () => {
      const d = await window.store.drawExpSeed()
      let again = 'drawn twice'
      try {
        await window.store.drawExpSeed()
      } catch (e) {
        again = String(e.message)
      }
      await window.store.record({ kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen' })
      return { d, again, snapshot: await window.store.snapshot() }
    })
    const carried = await a.evaluate(async (snapshot) => {
      await window.store.merge(snapshot)
      return (await window.store.log()).expSeeds
    }, seed.snapshot)
    ok('expseed-once', /never redrawn/.test(seed.again) && Number.isInteger(seed.d.expSeed), { expSeed: seed.d.expSeed, again: seed.again })
    ok('expseed-travels', carried.length === 1 && carried[0].expSeed === seed.d.expSeed, carried)

    // 7. Keep/kill reads in that profile: each read keeps a record of its own, and a kept record is never replaced.
    const reads = await f.evaluate(async () => {
      const content = { primaryKc: () => undefined, template: () => undefined, treatment: () => undefined, isFirstLessonExit: () => false }
      const ask = { comparison: 'witness-generalization', phase: 'interim', content }
      const first = await window.store.readKeepKill(ask)
      const note = await window.store.record({ kind: 'note', ref: 'note:2', provenance: 'own', exposure: 'seen' })
      // A read counts the events whose at precedes it: let the clock leave the note's millisecond first.
      await new Promise((resolve) => setTimeout(resolve, 5))
      const second = await window.store.readKeepKill(ask)
      let refused = 'replaced'
      try {
        await window.store.recordKeepKillRead({ ...first.record, title: 'another read' })
      } catch (e) {
        refused = String(e.message)
      }
      const kept = await window.store.keepKillReads()
      return {
        ids: [first.record.id, second.record.id],
        events: [first.result.eventCount, second.result.eventCount],
        instants: { first: first.result.at, note: note.at, second: second.result.at },
        kept: kept.map((r) => r.id),
        firstUnchanged: kept.find((r) => r.id === first.record.id)?.title === first.record.title,
        refused,
      }
    })
    ok(
      'keepkill-reads-kept',
      reads.ids[0] !== reads.ids[1] && reads.events[0] === 1 && reads.events[1] === 2 && reads.kept.length === 2 && reads.ids.every((id) => reads.kept.includes(id)) && reads.firstUnchanged && /never replaced/.test(reads.refused),
      reads,
    )
    await fresh.close()

    // 8. A newer schema in the profile opens read-only; another tab's upgrade makes a live store read-only.
    const newer = await browser.newContext()
    const n1 = await newer.newPage()
    await n1.goto(base)
    await n1.waitForFunction(() => document.title === 'ledger harness ready')
    const readOnly = await n1.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('statespace', 2)
        req.onupgradeneeded = () => {
          req.result.createObjectStore('events', { keyPath: 'id' })
          req.result.createObjectStore('meta', { keyPath: 'key' })
        }
        req.onsuccess = () => {
          req.result.close()
          resolve()
        }
        req.onerror = () => reject(req.error)
      })
      const s = await window.ledger.openLedgerStore()
      let refused = false
      try {
        await s.record({ kind: 'note', ref: 'note:1', provenance: 'own', exposure: 'seen' })
      } catch {
        refused = true
      }
      return { status: s.status(), refused }
    })
    ok('newer-schema-read-only', readOnly.status.mode === 'read-only' && readOnly.status.reason === 'newer-schema' && readOnly.refused, readOnly)
    await newer.close()
    const upgrade = await a.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('statespace', 2)
        req.onsuccess = () => {
          req.result.close()
          resolve()
        }
        req.onerror = () => reject(req.error)
        req.onblocked = () => reject(new Error('blocked: a tab did not close its connection'))
      })
      return window.store.status()
    })
    await b.waitForFunction(() => window.store.status().mode === 'read-only', null, { timeout: 5000 })
    const bStatus = await b.evaluate(() => ({ status: window.store.status(), heard: window.heard.some((h) => h.reason === 'read-only') }))
    ok('version-change-read-only', upgrade.reason === 'version-change' && bStatus.status.reason === 'version-change' && bStatus.heard, { a: upgrade, b: bStatus })
    await context.close()
    return { engine: engineName, version: browser.version(), checks }
  } finally {
    await browser.close()
  }
}

const results = []
for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  try {
    results.push(await check(name, engine))
  } catch (e) {
    results.push({ engine: name, error: String(e && e.stack ? e.stack : e), checks: [] })
  }
}
server.close()
const pass = results.every((r) => !r.error && r.checks.length === 13 && r.checks.every((c) => c.pass))
console.log(JSON.stringify({ check: 'W1-T03 storage adapter in three engines', pass, node: process.version, results }, null, 2))
process.exit(pass ? 0 : 1)
