/// <reference lib="webworker" />
// The Pyodide-Z3 module worker (ARCHITECTURE.md section 6.2): Z3 5.3.1 through the z3_solver 5.3.1.0 wheel on
// Pyodide 314.0.7, self-hosted on the instrument origin. One request at a time; a fresh Python namespace per
// request; an rlimit on every Solver this worker creates, because a timeout never returned under Pyodide
// [X RUN-z3-budget-pyodide, RUN-phone-pyodide]. The supervisor's watchdog is the hard stop.
//
// Input: { code: string }, Python the course authored or the learner typed into the cell (section 5.7).

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../../engines/contract.ts'
import { assetLoader } from '../shared/assets.ts'

declare const self: DedicatedWorkerGlobalScope

const PINNED = '5.3.1'
const RUNTIME = 'Pyodide 314.0.7, z3_solver 5.3.1.0'
const DEFAULT_RLIMIT = 5_000_000

interface PyProxy {
  set(k: string, v: unknown): void
  destroy(): void
}
interface Pyodide {
  runPython(code: string, opts?: { globals?: PyProxy; filename?: string }): unknown
  loadPackage(url: string, opts?: { messageCallback?: (m: string) => void; errorCallback?: (m: string) => void }): Promise<unknown>
  setStdout(o: { batched: (s: string) => void }): void
  setStderr(o: { batched: (s: string) => void }): void
  globals: { get(name: string): () => PyProxy }
}
type LoadPyodide = (o: { indexURL: string; lockFileURL?: string; packages?: string[] }) => Promise<Pyodide>

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let py: Pyodide | null = null
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''
let current: string | null = null
let lines: OutLine[] = []

// Patched once, at load: every Solver gets the request's rlimit (I10: the verdict prints it).
const SETUP = `
import z3 as _ss_z3
if not getattr(_ss_z3, '_ss_patched', False):
    _ss_orig_init = _ss_z3.Solver.__init__
    def _ss_init(self, *a, **k):
        _ss_orig_init(self, *a, **k)
        self.set('rlimit', _ss_z3._ss_rlimit)
    _ss_z3.Solver.__init__ = _ss_init
    _ss_z3._ss_patched = True
_ss_z3._ss_rlimit = ${DEFAULT_RLIMIT}
_ss_z3.get_version_string()
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

/** A Python traceback, from the cell's first frame on: Pyodide's own frames say nothing to the learner. */
function traceback(e: unknown): string {
  const msg = String(e instanceof Error ? e.message : e)
  const all = msg.split('\n')
  const first = all.findIndex((l) => l.includes('File "<cell>"'))
  return (first > 0 ? ['Traceback (most recent call last):', ...all.slice(first)] : all).join('\n').trim()
}

async function run(id: string, input: unknown, rlimit: number): Promise<void> {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be a string of Python', fatal: false })
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
  const ns = p.globals.get('dict')()
  try {
    p.runPython(`import z3 as _ss_z3\n_ss_z3._ss_rlimit = ${Math.floor(rlimit)}`)
    p.runPython(code, { globals: ns, filename: '<cell>' })
  } catch (e) {
    error = traceback(e)
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
  const verdict = lines.filter((l) => l.stream === 'stdout' && /^(sat|unsat|unknown)$/.test(l.text.trim())).map((l) => l.text.trim())
  const reply: WorkerReply = { verdict, witness: null, output: lines, error, stats: { cold, readyMs: cold ? readyMs : 0, runMs }, printed, runtime: RUNTIME }
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
    void run(m.id, m.input, m.budget.rlimit ?? DEFAULT_RLIMIT)
  }
}
