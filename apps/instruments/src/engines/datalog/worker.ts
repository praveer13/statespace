/// <reference lib="webworker" />
// The INS-datalog module worker: Z3's Fixedpoint (engine='datalog') on Pyodide 314.0.7 with the z3_solver
// 5.3.1.0 wheel, behind the W0-S03 adapter (docs/spikes/W0-S03.md section 5; DECISIONS.md Log item 55). The
// payload is Z3's own, from the manifest's `datalog` entry; the adapter (ss_datalog.py, a verbatim copy of the
// spike's) and the tab runner (tab.py) are the course's code and are bundled here as text.
//
// Input: { code: string }, a Souffle-subset program with its facts in the text. Output: each .output relation
// printed as `souffle -D-` prints it, and a JSON witness of the relations (tuples, the rule and height that
// derive each one, the SHA-256 of the sorted tuples) that the site renders as ruled tables.
//
// Budget: neither rlimit nor timeout stops Fixedpoint inside a join (W0-S03 section 4.5), so this worker
// takes none; the supervisor's wall-clock watchdog terminates it. The estimated cap is W4-T07's.

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { assetLoader } from '../../workers/shared/assets.ts'
import ADAPTER from './ss_datalog.py?raw'
import TAB from './tab.py?raw'

declare const self: DedicatedWorkerGlobalScope

const PINNED = '5.3.1'
const RUNTIME = 'Fixedpoint (engine=datalog) via the W0-S03 adapter; Pyodide 314.0.7, z3_solver 5.3.1.0'

interface PyDict {
  set(k: string, v: unknown): void
  get(k: string): unknown
  destroy(): void
}
interface Pyodide {
  runPython(code: string, opts?: { globals?: PyDict; filename?: string }): unknown
  loadPackage(url: string, opts?: { messageCallback?: (m: string) => void; errorCallback?: (m: string) => void }): Promise<unknown>
  setStdout(o: { batched: (s: string) => void }): void
  setStderr(o: { batched: (s: string) => void }): void
  globals: { get(name: string): () => PyDict }
  FS: { mkdirTree(p: string): void; writeFile(p: string, data: string): void }
}
type LoadPyodide = (o: { indexURL: string; packages?: string[] }) => Promise<Pyodide>

interface TabReply {
  readonly ok: boolean
  readonly error?: string
  readonly relations?: readonly { readonly name: string; readonly tuples: number }[]
}

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let py: Pyodide | null = null
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''
let current: string | null = null
let lines: OutLine[] = []

const LIB = '/ss-datalog'
const SETUP = `
import sys
if ${JSON.stringify(LIB)} not in sys.path:
    sys.path.insert(0, ${JSON.stringify(LIB)})
import z3, ss_datalog, tab
z3.get_version_string()
`

function emit(stream: OutLine['stream'], text: string): void {
  if (current === null) return
  const line = { stream, text }
  lines.push(line)
  post({ t: 'out', id: current, line })
}

async function load(id: string): Promise<void> {
  if (py !== null) return
  if (loading === null) {
    loading = (async () => {
      if (entry === null) throw new Error('the worker has no manifest entry')
      const t0 = performance.now()
      const assets = assetLoader(base, entry, (loaded, total) => post({ t: 'progress', id, phase: 'download', loaded, total }))
      await assets.loadAll()
      assets.installFetch()
      post({ t: 'progress', id, phase: 'init' })
      const pyPath = entry.assets.find((a) => a.path.endsWith('/pyodide.mjs'))?.path
      const wheel = entry.assets.find((a) => a.path.endsWith('.whl'))?.path
      if (pyPath === undefined || wheel === undefined) throw new Error('the manifest lacks pyodide.mjs or the Z3 wheel')
      const indexURL = assets.url(pyPath.slice(0, pyPath.lastIndexOf('/') + 1))
      const mod = (await import(/* @vite-ignore */ assets.url(pyPath))) as { loadPyodide: LoadPyodide }
      const p = await mod.loadPyodide({ indexURL, packages: [] })
      await p.loadPackage(assets.url(wheel), { messageCallback: () => {}, errorCallback: (m) => emit('stderr', m) })
      p.FS.mkdirTree(LIB)
      p.FS.writeFile(`${LIB}/ss_datalog.py`, ADAPTER)
      p.FS.writeFile(`${LIB}/tab.py`, TAB)
      p.setStdout({ batched: (s) => emit('stdout', s) })
      p.setStderr({ batched: (s) => emit('stderr', s) })
      printed = String(p.runPython(SETUP))
      if (printed !== PINNED) throw Object.assign(new Error(`the wheel reports Z3 ${printed}; this build pins ${PINNED}`), { code: 'version-mismatch' })
      py = p
      readyMs = Math.round(performance.now() - t0)
    })()
    loading.catch(() => {
      loading = null
    })
  }
  await loading
}

async function run(id: string, input: unknown): Promise<void> {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be a string of Datalog', fatal: false })
    return
  }
  const cold = py === null
  try {
    await load(id)
  } catch (e) {
    const err = e as { code?: string; message?: string }
    post({ t: 'fail', id, code: err.code === 'version-mismatch' ? 'version-mismatch' : 'engine-crashed', detail: String(err.message ?? e), fatal: true })
    return
  }
  const p = py as Pyodide
  current = id
  lines = []
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  let error: string | null = null
  let witness: string | null = null
  let verdict: string[] = []
  const ns = p.globals.get('dict')()
  try {
    ns.set('_ss_program', code)
    p.runPython('import tab as _ss_tab\n_ss_reply = _ss_tab.run(_ss_program)', { globals: ns, filename: '<datalog>' })
    const raw = String(ns.get('_ss_reply'))
    const r = JSON.parse(raw) as TabReply
    if (r.ok) {
      witness = raw
      verdict = (r.relations ?? []).map((x) => `${x.name}: ${x.tuples} ${x.tuples === 1 ? 'tuple' : 'tuples'}`)
    } else {
      error = r.error ?? 'the adapter refused the program'
    }
  } catch (e) {
    error = String(e instanceof Error ? e.message : e).trim()
  } finally {
    try {
      p.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()')
    } catch {
      // flushing never decides a run
    }
    ns.destroy()
  }
  const runMs = Math.round(performance.now() - t0)
  current = null
  const reply: WorkerReply = { verdict, witness, output: lines, error, stats: { cold, readyMs: cold ? readyMs : 0, runMs }, printed, runtime: RUNTIME }
  post({ t: 'done', id, reply })
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
