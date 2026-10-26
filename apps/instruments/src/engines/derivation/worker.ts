/// <reference lib="webworker" />
// The Derivation Board's module worker (INS-derivation, docs/DESIGN.md section 6.8): the same pinned payload as
// INS-z3 (Z3 5.3.1 through the z3_solver 5.3.1.0 wheel on Pyodide 314.0.7, self-hosted on the instrument origin,
// SHA-256-checked and held in the shared engine cache), plus the board's checker, derivation.py, bundled with this
// worker. One request at a time; every Solver the checker makes carries the request's rlimit, and the supervisor's
// watchdog is the hard stop.
//
// Input: { code: string }, the derivation as the lesson writes it or the learner edits it. The reply's witness is
// the board as JSON (derivation.py's check_board); its output lines are one plain-text line per step.

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { assetLoader } from '../../workers/shared/assets.ts'
import CHECKER from './derivation.py?raw'

declare const self: DedicatedWorkerGlobalScope

const PINNED = '5.3.1'
const RUNTIME = 'Pyodide 314.0.7, z3_solver 5.3.1.0, derivation board 1'
const DEFAULT_RLIMIT = 5_000_000

interface PyDict {
  get(k: string): unknown
  destroy(): void
}
interface Pyodide {
  runPython(code: string, opts?: { globals?: PyDict; filename?: string }): unknown
  loadPackage(url: string, opts?: { messageCallback?: (m: string) => void; errorCallback?: (m: string) => void }): Promise<unknown>
  setStdout(o: { batched: (s: string) => void }): void
  setStderr(o: { batched: (s: string) => void }): void
  globals: { get(name: string): () => PyDict }
}
type LoadPyodide = (o: { indexURL: string; packages?: string[] }) => Promise<Pyodide>
type CheckBoard = (text: string, rlimit: number) => string

/** The board as derivation.py returns it; only what the output lines need. */
interface Board {
  readonly z3: string
  readonly steps: readonly {
    readonly n: number
    readonly result: 'valid' | 'not-valid' | 'unknown' | 'stated' | 'unread'
    readonly error?: string
    readonly follow_on: readonly number[]
    readonly checks: readonly { readonly raw: string | null; readonly state?: readonly string[] | null }[]
  }[]
  readonly not_valid: readonly number[]
}

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let py: Pyodide | null = null
let check: CheckBoard | null = null
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''
let current: string | null = null
let lines: OutLine[] = []

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
      const ns = p.globals.get('dict')()
      p.runPython(CHECKER, { globals: ns, filename: 'derivation.py' })
      check = ns.get('check_board') as CheckBoard
      printed = String(p.runPython('import z3\nz3.get_version_string()'))
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

const WORD: Readonly<Record<Board['steps'][number]['result'], string>> = {
  valid: 'valid',
  'not-valid': 'not valid',
  unknown: 'unknown at the rlimit',
  stated: 'stated, not checked',
  unread: 'not read',
}

function stepLine(s: Board['steps'][number]): string {
  const raws = s.checks.map((c) => c.raw).filter((r): r is string => r !== null)
  const state = s.checks.find((c) => c.raw === 'sat')?.state
  const parts = [`line ${s.n}:`, raws.length > 0 ? `${raws.join(', ')} →` : '', WORD[s.result]]
  if (state !== undefined && state !== null && state.length > 0) parts.push(`[${state.join(', ')}]`)
  if (s.follow_on.length > 0) parts.push(`(follow-on of line ${s.follow_on.join(', ')})`)
  if (s.error !== undefined) parts.push(`(${s.error})`)
  return parts.filter((x) => x !== '').join(' ')
}

async function run(id: string, input: unknown, rlimit: number): Promise<void> {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be the derivation as text', fatal: false })
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
  current = id
  lines = []
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  let error: string | null = null
  let witness: string | null = null
  let verdict: string[] = []
  try {
    witness = String((check as CheckBoard)(code, Math.floor(rlimit)))
    const board = JSON.parse(witness) as Board
    for (const s of board.steps) emit('stdout', stepLine(s))
    verdict = board.steps.filter((s) => s.checks.some((c) => c.raw !== null)).map((s) => `line ${s.n}: ${s.checks.map((c) => c.raw ?? '-').join(' ')}`)
  } catch (e) {
    error = String(e instanceof Error ? e.message : e).trim()
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
    void run(m.id, m.input, m.budget.rlimit ?? DEFAULT_RLIMIT)
  }
}
