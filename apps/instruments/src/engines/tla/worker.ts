/// <reference lib="webworker" />
// The Spectacle worker (ARCHITECTURE.md section 6.3): a classic dedicated worker on the instrument origin, because
// Spectacle's scripts are classic scripts that declare globals and load with importScripts. Each script is
// fetched through the asset loader (SHA-256 checked against the build manifest, held in the engine cache) and
// run from those verified bytes; the course's adapter (adapter.ts) then searches the model the way TLC does.
// One request at a time; a fresh parse per request; the in-worker wall-clock budget (10 s by default) ends the
// search with a partial verdict, and the supervisor's watchdog behind it terminates the worker.
//
// Input: { code: string }, a whole TLA+ module with its configuration in comment lines (config.ts).
//
// This file is bundled into a single classic script: nothing below may declare a global that Spectacle's
// scripts also declare (Module, TreeSitter, parser, _, hashSum, and eval.js's top-level names); the bundle's
// own top-level names are short and module-local, and the globals Spectacle reads are set on `self`.

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { assetLoader } from '../../workers/shared/assets.ts'
import { check, parseModule } from './adapter.ts'
import { ConfigError, parseModelConfig } from './config.ts'
import type { TlaRun } from './result.ts'

declare const self: DedicatedWorkerGlobalScope & Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const TreeSitter: any

/** The pinned commit, and the SHA-256 of its eval.js: Spectacle prints no version, so the worker names the commit
 * whose interpreter file it verified (runs/RUN-spectacle-s5s8/spectacle/files.json). */
const COMMIT = '5827c22'
const EVAL_SHA256 = '40bc82440fe7e398662faeda767aaec6be68d8b1ba17da862aa24ef5990b609b'
const RUNTIME = 'Spectacle 5827c22 (tree-sitter-tlaplus parser), the course adapter: breadth first in TLC order, one worker'
/** DECISIONS.md Log item 56: learner edits run under a 10 s wall-clock budget, no state cap. */
const ENGINE_BUDGET_MS = 10_000
/** Room left for the reply before the supervisor's watchdog. */
const WATCHDOG_MARGIN_MS = 3_000
const WITNESS_MAX = 60_000

/** The scripts in Spectacle's own load order (W0-S04's harness worker). */
const SCRIPTS = ['lodash.min.js', 'hash-sum.js', 'tree-sitter.js', 'eval.js']

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let ready = false
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''

// Spectacle logs freely; the worker's console is no one's output.
for (const k of ['log', 'info', 'debug', 'warn', 'error'] as const) console[k] = () => {}

async function load(id: string): Promise<void> {
  if (ready) return
  if (loading === null) {
    loading = (async () => {
      if (entry === null) throw new Error('the worker has no manifest entry')
      const e = entry
      const t0 = performance.now()
      const assets = assetLoader(base, e, (loaded, total) => post({ t: 'progress', id, phase: 'download', loaded, total }))
      await assets.loadAll()
      assets.installFetch()
      post({ t: 'progress', id, phase: 'init' })
      const find = (name: string): string => {
        const a = e.assets.find((x) => x.path.endsWith(`/${name}`))
        if (a === undefined) throw new Error(`the manifest lacks Spectacle's ${name}`)
        return a.path
      }
      const evalAsset = e.assets.find((x) => x.path.endsWith('/eval.js'))
      if (evalAsset?.sha256 !== EVAL_SHA256)
        throw Object.assign(new Error(`eval.js is not the file of commit ${COMMIT}`), { code: 'version-mismatch' })
      // The globals eval.js reads, which its own app page defines.
      self.enableEvalTracing = false
      self.parser = undefined
      for (const name of SCRIPTS) {
        const res = await fetch(assets.url(find(name))) // the verified copy (installFetch)
        const src = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: 'text/javascript' }))
        try {
          importScripts(src)
        } finally {
          URL.revokeObjectURL(src)
        }
      }
      const runtimeWasm = assets.url(find('tree-sitter.wasm'))
      await TreeSitter.init({ locateFile: () => runtimeWasm })
      const p = new TreeSitter()
      p.setLanguage(await TreeSitter.Language.load(assets.url(find('tree-sitter-tlaplus.wasm'))))
      self.parser = p
      printed = COMMIT
      ready = true
      readyMs = Math.round(performance.now() - t0)
    })()
    loading.catch(() => {
      loading = null
    })
  }
  await loading
}

const n = (x: number): string => x.toLocaleString('en-US')
const plural = (k: number, one: string, many: string): string => `${n(k)} ${k === 1 ? one : many}`

/** The run as text, in TLC's words where TLC has words for it, so it reads beside the recorded TLC run. */
function textOf(r: TlaRun): string[] {
  const out: string[] = []
  const inv = r.invariants.length > 0 ? r.invariants.map((x) => `INVARIANT ${x}`).join(', ') : 'no invariant'
  out.push(`Spectacle ${COMMIT} in this tab; the course's breadth-first search, in TLC's order with one worker.`)
  out.push(`Model ${r.module}: INIT ${r.init}, NEXT ${r.next}, ${inv}${r.invariantsNamed || r.invariants.length === 0 ? '' : ' (the state predicates after Spec)'}, deadlock check ${r.deadlock ? 'on' : 'off'}.`)
  const consts = Object.entries(r.constants)
  if (consts.length > 0) out.push(`Constants: ${consts.map(([k, v]) => `${k} = ${v}`).join(', ')}.`)
  out.push(`Computed ${plural(r.initStates, 'initial state', 'initial states')}.`)
  if (r.verdict === 'violated') out.push(`Error: Invariant ${r.invariant ?? '?'} is violated.`)
  else if (r.verdict === 'deadlock') out.push('Error: Deadlock reached.')
  else if (r.verdict === 'ok') out.push('Model checking completed. No error has been found.')
  else out.push(`Stopped at the wall-clock budget of ${r.budgetMs / 1000} s: a partial search, with no error in the states it reached.`)
  if (r.trace.length > 0) {
    out.push('The behavior up to this state is:')
    r.trace.forEach((s, i) => {
      out.push(`State ${i + 1}: <${s.action ?? 'Initial predicate'}>`)
      r.vars.forEach((v, j) => out.push(`/\\ ${v} = ${s.values[j] ?? '?'}`))
      out.push('')
    })
  }
  out.push(`${plural(r.tlc.generated, 'state', 'states')} generated, ${plural(r.tlc.distinct, 'distinct state', 'distinct states')} found, ${plural(r.tlc.left, 'state', 'states')} left on queue.`)
  out.push(`The depth of the complete state graph search is ${r.tlc.depth}.`)
  if (r.verdict === 'violated' || r.verdict === 'deadlock') {
    out.push(
      r.explored.complete
        ? `Past the error, the search went on to draw the graph: ${plural(r.explored.distinct, 'reachable state', 'reachable states')} in all.`
        : `Past the error, the search went on to ${plural(r.explored.distinct, 'state', 'states')} for the graph.`,
    )
  }
  return out
}

/** The witness, shrunk until it fits under the supervisor's clip: the graph's values go first, then the graph. */
function witnessOf(r: TlaRun): string {
  let s = JSON.stringify(r)
  if (s.length > WITNESS_MAX && r.graph !== null) s = JSON.stringify({ ...r, graph: { ...r.graph, nodes: r.graph.nodes.map((x) => ({ depth: x.depth })) } })
  if (s.length > WITNESS_MAX) s = JSON.stringify({ ...r, graph: null })
  if (s.length > WITNESS_MAX) s = JSON.stringify({ ...r, graph: null, trace: r.trace.slice(0, 40) })
  return s
}

async function run(id: string, input: unknown, wallMs: number): Promise<void> {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be a string of TLA+', fatal: false })
    return
  }
  const cold = !ready
  try {
    await load(id)
  } catch (e) {
    const err = e as { code?: string; message?: string }
    post({ t: 'fail', id, code: err.code === 'version-mismatch' ? 'version-mismatch' : 'engine-crashed', detail: String(err.message ?? e), fatal: true })
    return
  }
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  const lines: OutLine[] = []
  let error: string | null = null
  let result: TlaRun | null = null
  try {
    const cfg = parseModelConfig(code)
    const spec = await parseModule(code, cfg)
    const budgetMs = Math.max(1_000, Math.min(ENGINE_BUDGET_MS, wallMs - WATCHDOG_MARGIN_MS))
    result = check(spec, cfg, {
      budgetMs,
      onProgress: (distinct, queued, ms) => post({ t: 'out', id, line: { stream: 'stderr', text: `searching: ${n(distinct)} distinct states, ${n(queued)} on the queue, ${(ms / 1000).toFixed(1)} s` } }),
    })
    for (const l of textOf(result)) lines.push({ stream: 'stdout', text: l })
    for (const c of cfg.ignored) lines.push({ stream: 'stderr', text: `Not checked in this tab: ${c}.` })
  } catch (e) {
    error = e instanceof ConfigError ? `The cell's model: ${e.message}.` : `Spectacle: ${String((e as Error)?.message ?? e)}`
  }
  const runMs = Math.round(performance.now() - t0)
  const verdict =
    result === null
      ? ['error']
      : result.verdict === 'violated'
        ? [`invariant ${result.invariant ?? '?'} violated`]
        : result.verdict === 'deadlock'
          ? ['deadlock']
          : result.verdict === 'ok'
            ? ['no error']
            : ['stopped: bound']
  const reply: WorkerReply = {
    verdict,
    witness: result === null ? null : witnessOf(result),
    output: lines,
    error,
    stats: { cold, readyMs: cold ? readyMs : 0, runMs },
    printed,
    runtime: RUNTIME,
  }
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
    void run(m.id, m.input, m.budget.wallMs)
  }
}
