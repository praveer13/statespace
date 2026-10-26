/// <reference lib="webworker" />
// The PGlite module worker (ARCHITECTURE.md section 6.4; W0-S08 section 5): PGlite 0.5.11, which reports
// PostgreSQL 18.6, self-hosted on the instrument origin, in memory, with no isolation headers. One instance per
// worker and one connection; a cell's run resets the session, so nothing persists between runs. The supervisor's
// wall-clock watchdog is the only budget: PostgreSQL has no engine budget that the reply could print.
//
// Input: { code: string, world?: string } (engines/pg/input.ts).

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { assetLoader } from '../../workers/shared/assets.ts'
import { checkPgInput, type PgInput } from './input.ts'
import { PgSession, type PgDb, type PgProtocol } from './session.ts'
import { PG_WORLDS } from './worlds.ts'

declare const self: DedicatedWorkerGlobalScope

const PINNED = '0.5.11'
const RUNTIME = 'PGlite in memory, one connection, wasm32'

interface PGliteModule {
  readonly PGlite: {
    create(opts: { wasmModule?: WebAssembly.Module; initdbWasmModule?: WebAssembly.Module; fsBundle?: Blob }): Promise<PgDb & { query(sql: string): Promise<{ rows: { version?: string }[] }> }>
  }
  readonly protocol: PgProtocol
}

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let session: PgSession | null = null
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''
let version = ''

async function load(id: string): Promise<void> {
  if (session !== null) return
  if (loading === null) {
    loading = (async () => {
      if (entry === null) throw new Error('the worker has no manifest entry')
      const t0 = performance.now()
      const assets = assetLoader(base, entry, (loaded, total) => post({ t: 'progress', id, phase: 'download', loaded, total }))
      await assets.loadAll()
      assets.installFetch()
      post({ t: 'progress', id, phase: 'init' })
      const path = (name: string): string => {
        const a = entry?.assets.find((x) => x.path.endsWith(`/${name}`))
        if (a === undefined) throw new Error(`the manifest lacks ${name}`)
        return assets.url(a.path)
      }
      // The three binaries go in from the verified copies; the modules import from the same manifest paths.
      const [wasmModule, initdbWasmModule, fsBundle] = await Promise.all([
        fetch(path('pglite.wasm')).then((r) => r.arrayBuffer()).then((b) => WebAssembly.compile(b)),
        fetch(path('initdb.wasm')).then((r) => r.arrayBuffer()).then((b) => WebAssembly.compile(b)),
        fetch(path('pglite.data')).then((r) => r.blob()),
      ])
      const mod = (await import(/* @vite-ignore */ path('index.js'))) as PGliteModule
      const db = await mod.PGlite.create({ wasmModule, initdbWasmModule, fsBundle })
      version = String((await db.query('select version()')).rows[0]?.version ?? '')
      const m = /^PostgreSQL (\S+) \(PGlite (\S+)\)/.exec(version)
      if (m === null || m[2] !== PINNED) throw Object.assign(new Error(`the engine reports "${version.slice(0, 120)}"; this build pins PGlite ${PINNED}`), { code: 'version-mismatch' })
      printed = `${m[2]} (PostgreSQL ${m[1]})`
      session = new PgSession(db, mod.protocol)
      readyMs = Math.round(performance.now() - t0)
    })()
    loading.catch(() => {
      loading = null
    })
  }
  await loading
}

async function run(id: string, input: unknown): Promise<void> {
  const bad = checkPgInput(input)
  if (bad !== null) {
    post({ t: 'fail', id, code: bad.code, detail: bad.detail, fatal: false })
    return
  }
  const { code, world } = input as PgInput
  const cold = session === null
  try {
    await load(id)
  } catch (e) {
    const err = e as { code?: string; message?: string }
    post({ t: 'fail', id, code: err.code === 'version-mismatch' ? 'version-mismatch' : 'engine-crashed', detail: String(err.message ?? e), fatal: true })
    return
  }
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  try {
    const w = world === undefined ? null : (PG_WORLDS[world] ?? null)
    const r = await (session as PgSession).run(code, w, version, (line: OutLine) => post({ t: 'out', id, line }))
    const reply: WorkerReply = {
      verdict: r.verdict,
      witness: JSON.stringify(r.witness),
      output: r.lines,
      error: null,
      stats: { cold, readyMs: cold ? readyMs : 0, runMs: Math.round(performance.now() - t0) },
      printed,
      runtime: RUNTIME,
    }
    post({ t: 'done', id, reply })
  } catch (e) {
    // A session that would not reset, or an engine fault: the next run gets a fresh worker and a fresh instance.
    session = null
    post({ t: 'fail', id, code: 'engine-crashed', detail: String((e as Error)?.message ?? e), fatal: true })
  }
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  if (m.t === 'init') {
    entry = m.manifest
    base = m.base
  } else if (m.t === 'warm') {
    load(m.id).then(
      () => post({ t: 'warmed', id: m.id, readyMs, printed }),
      (err: unknown) => post({ t: 'fail', id: m.id, code: 'engine-crashed', detail: String((err as Error)?.message ?? err), fatal: true }),
    )
  } else if (m.t === 'run') {
    void run(m.id, m.input)
  }
}
