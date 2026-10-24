// W0-S08: the module worker of the harness page. It imports PGlite from the page's own origin (/pglite/) and
// runs one of these tasks:
//   first-load  import, construct, first query, and the cost of further fresh in-memory instances
//   rls         the specimens of rls-spec.mjs on one PGlite instance
//   specimens   the single-session specimens of RUN-pglite on a fresh instance
//   cpu-probe   a fixed integer loop, to check whether CPU throttling reaches the worker
//   mem-open, mem-cycle, mem-close   hold, replace and close one instance (the driver samples memory in between)
// Nothing is fetched from another origin.

import { SPEC_VERSION, pgliteExecutor, counting, runPart1, runPart2, runSingleSession, runSerialize } from '/spec/rls-spec.mjs'

const post = (m) => self.postMessage(m)
const now = () => performance.now()
const mem = (db) => { const m = db.Module ?? db.mod; return m && m.HEAPU8 ? m.HEAPU8.length : null }
const jsHeap = () => (typeof performance.memory === 'object' && performance.memory ? performance.memory.usedJSHeapSize : null)

async function firstLoad({ instances = 5 }) {
  const heapBefore = jsHeap()
  const t0 = now()
  const mod = await import('/pglite/index.js')
  const t1 = now()
  const db = new mod.PGlite()
  await db.waitReady
  const t2 = now()
  const r = await db.query('select version()')
  const t3 = now()
  const first = { import_ms: t1 - t0, ready_ms: t2 - t1, first_query_ms: t3 - t2, total_ms: t3 - t0, version: r.rows[0].version, wasm_memory_bytes: mem(db), js_heap_before: heapBefore, js_heap_after: jsHeap() }
  const entries = performance.getEntriesByType('resource').map((e) => ({
    name: new URL(e.name).pathname, initiator: e.initiatorType, transfer_size: e.transferSize, encoded_body_size: e.encodedBodySize, decoded_body_size: e.decodedBodySize, duration_ms: e.duration,
  }))
  await db.close()
  const more = []
  for (let i = 2; i <= instances; i++) {
    const a = now()
    const d = new mod.PGlite()
    await d.waitReady
    await d.query('select 1')
    more.push({ instance: i, ready_ms: now() - a, wasm_memory_bytes: mem(d), js_heap: jsHeap() })
    await d.close()
  }
  return { first, resource_entries: entries, further_instances: more }
}

async function rls({ worlds }) {
  const started_at = new Date().toISOString()
  const t0 = now()
  const { PGlite } = await import('/pglite/index.js')
  const db = new PGlite()
  await db.waitReady
  const ex = counting(pgliteExecutor(db))
  const version = (await ex.run('SELECT version()')).rows[0][0]
  const part1 = await runPart1(ex)
  post({ progress: `part 1: ${part1.steps.length} steps, ${part1.checks.filter((c) => c.pass).length}/${part1.checks.length} checks pass` })
  const part2 = await runPart2(ex, worlds, { onProgress: (i, n) => post({ progress: `part 2: world ${i}/${n}` }) })
  const single_session = await runSingleSession(ex)
  const serialize = await runSerialize(db)
  const result = {
    spec_version: SPEC_VERSION, engine: 'pglite', server_version: version,
    started_at, duration_s: Math.round(now() - t0) / 1000,
    statements: { count: ex.st.count, errors: ex.st.errors, ms: Math.round(ex.st.ms) },
    part1, part2: { n: worlds, worlds: part2 }, single_session, serialize,
    wasm_memory_bytes: mem(db),
  }
  await db.close()
  return result
}

// the single-session specimens of RUN-pglite on a fresh instance, with the version string
async function specimens() {
  const started_at = new Date().toISOString()
  const { PGlite } = await import('/pglite/index.js')
  const db = new PGlite()
  await db.waitReady
  const ex = counting(pgliteExecutor(db))
  const version = (await ex.run('SELECT version()')).rows[0][0]
  const single_session = await runSingleSession(ex)
  const serialize = await runSerialize(db)
  await db.close()
  return { spec_version: SPEC_VERSION, started_at, server_version: version, single_session, serialize }
}

// memory: hold one instance, replace it by a fresh one, close it; the driver samples the browser's memory between calls
let held = null
async function memOpen() {
  const { PGlite } = await import('/pglite/index.js')
  held = new PGlite()
  await held.waitReady
  await held.query('select 1')
  return { wasm_memory_bytes: mem(held) }
}
async function memCycle() {
  const { PGlite } = await import('/pglite/index.js')
  await held.close()
  held = new PGlite()
  await held.waitReady
  await held.query('select 1')
  return { wasm_memory_bytes: mem(held) }
}
async function memClose() {
  await held.close()
  held = null
  return {}
}

// a fixed integer loop, to tell whether CPU throttling reaches this worker (not a PGlite measurement)
function cpuProbe({ iterations = 60000000 }) {
  const t = now()
  let x = 1
  for (let i = 0; i < iterations; i++) x = (Math.imul(x, 1664525) + 1013904223) | 0
  return { iterations, ms: now() - t, checksum: x }
}

self.onmessage = async (e) => {
  const { id, task, ...args } = e.data
  try {
    const result = task === 'first-load' ? await firstLoad(args)
      : task === 'rls' ? await rls(args)
      : task === 'specimens' ? await specimens()
      : task === 'cpu-probe' ? cpuProbe(args)
      : task === 'mem-open' ? await memOpen()
      : task === 'mem-cycle' ? await memCycle()
      : task === 'mem-close' ? await memClose()
      : (() => { throw new Error('unknown task ' + task) })()
    post({ id, result })
  } catch (err) {
    post({ id, error: String(err && err.stack ? err.stack : err) })
  }
}
