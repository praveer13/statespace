/// <reference lib="webworker" />
// The Goal Replay worker (INS-goal-replay). No Lean runs in the tab: the payload is the course's goal strips, read
// from real Lean 4.35.0 elaboration in the bench image by scripts/build-goal-replay.mjs and committed as
// RUN-goal-replay. scripts/instruments/fetch-engines.mjs pins that bundle by SHA-256, and assetLoader checks it again
// here before use.
//
// Input: { code: string }, the cell's text. A run looks the text up by its SHA-256 (after the same normalisation the
// generator applies) and replies with that cell's strips: the witness is the strip as JSON, the output its text
// view. A text Lean never elaborated (an edit) gets no goals, and the reply says why.

import type { OutLine } from '../../bus/protocol.ts'
import type { EngineManifestEntry, FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { assetLoader } from '../../workers/shared/assets.ts'

declare const self: DedicatedWorkerGlobalScope

const PINNED = '4.35.0'
const RUNTIME = 'no Lean in this tab: goal strips from lean --server 4.35.0 at build time (RUN-goal-replay)'

interface State {
  readonly when: 'before' | 'end'
  readonly tactic: string | null
  readonly line: number
  readonly character: number
  readonly goals: readonly string[] | null
}
interface Strip {
  readonly decl: string
  readonly kind: string
  readonly states: readonly State[]
}
interface Cell {
  readonly lesson: string
  readonly cell: number
  readonly recorded: string | null
  readonly text_sha256: string
  readonly lines: number
  readonly elaborated: 'clean' | 'with-errors' | 'needs-context'
  readonly errors: number
  readonly strips: readonly Strip[]
  readonly messages: readonly { readonly severity: string; readonly line: number; readonly character: number; readonly text: string }[]
}
interface Bundle {
  readonly schema: string
  readonly run: string
  readonly request: string
  readonly toolchain: { readonly version: string; readonly banner: string; readonly binary_sha256: string }
  readonly cells: readonly Cell[]
}

const post = (m: FromWorker): void => self.postMessage(m)

let entry: EngineManifestEntry | null = null
let base = ''
let bundle: Bundle | null = null
let byText = new Map<string, Cell>()
let loading: Promise<void> | null = null
let readyMs = 0
let printed = ''

const normalise = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n+$/, '')

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function load(id: string): Promise<void> {
  if (bundle !== null) return
  if (loading === null) {
    loading = (async () => {
      if (entry === null) throw new Error('the worker has no manifest entry')
      const t0 = performance.now()
      const assets = assetLoader(base, entry, (loaded, total) => post({ t: 'progress', id, phase: 'download', loaded, total }))
      await assets.loadAll()
      assets.installFetch()
      post({ t: 'progress', id, phase: 'init' })
      const file = entry.assets.find((a) => a.path.endsWith('/goal-strips.json'))?.path
      if (file === undefined) throw new Error('the manifest lacks goal-strips.json')
      const res = await fetch(assets.url(file))
      const b = (await res.json()) as Bundle
      if (b.schema !== 'statespace/goal-strips@1' || !Array.isArray(b.cells)) throw new Error('goal-strips.json is not a statespace/goal-strips@1 bundle')
      if (b.toolchain.version !== PINNED || entry.version !== PINNED)
        throw Object.assign(new Error(`the strips come from Lean ${b.toolchain.version}; this build pins ${PINNED}`), { code: 'version-mismatch' })
      const m = /version ([^,\s]+)/.exec(b.toolchain.banner)
      printed = m?.[1] ?? b.toolchain.version
      byText = new Map(b.cells.map((c) => [c.text_sha256, c]))
      bundle = b
      readyMs = Math.round(performance.now() - t0)
    })()
    loading.catch(() => {
      loading = null
    })
  }
  await loading
}

function goalLines(goals: readonly string[] | null): string[] {
  if (goals === null) return ['    (Lean reported no goal information here)']
  if (goals.length === 0) return ['    no goals']
  return goals.flatMap((g, k) => [...(goals.length > 1 ? [`    goal ${k + 1} of ${goals.length}`] : []), ...g.split('\n').map((l) => `    ${goals.length > 1 ? '  ' : ''}${l}`)])
}

function textView(c: Cell): OutLine[] {
  const out: string[] = []
  for (const s of c.strips) {
    out.push(`${s.kind} ${s.decl}`)
    s.states.forEach((st, i) => {
      out.push(`[${i}] ${st.when === 'end' ? 'end of proof' : `before ${st.tactic ?? ''}`}  (line ${st.line + 1})`, ...goalLines(st.goals))
    })
  }
  for (const m of c.messages) out.push(`${m.severity} at line ${m.line + 1}: ${m.text}`)
  return out.map((text) => ({ stream: 'stdout' as const, text }))
}

async function run(id: string, input: unknown): Promise<void> {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be a string of Lean', fatal: false })
    return
  }
  const cold = bundle === null
  try {
    await load(id)
  } catch (e) {
    const err = e as { code?: string; message?: string }
    post({ t: 'fail', id, code: err.code === 'version-mismatch' ? 'version-mismatch' : 'engine-crashed', detail: String(err.message ?? e), fatal: true })
    return
  }
  const b = bundle as Bundle
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  const sum = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalise(code))))
  const cell = byText.get(sum)
  let reply: WorkerReply
  if (cell === undefined) {
    reply = {
      verdict: [],
      witness: null,
      output: [],
      error: `Lean has not elaborated this text. Goal Replay steps through the goals Lean ${b.toolchain.version} printed for the course's own cells at build time (${b.run}); no Lean runs in this tab, so an edited proof has no goals to replay. Reset the code to step through the course's proof.`,
      stats: { cold, readyMs: cold ? readyMs : 0, runMs: Math.round(performance.now() - t0) },
      printed,
      runtime: RUNTIME,
    }
  } else {
    const states = cell.strips.reduce((n, s) => n + s.states.length, 0)
    const witness = JSON.stringify({ schema: 'statespace/goal-cell@1', run: b.run, request: b.request, banner: b.toolchain.banner, ...cell })
    reply = {
      verdict: [`${states} goal states in ${cell.strips.length} ${cell.strips.length === 1 ? 'proof' : 'proofs'}`, ...(cell.errors > 0 ? [`${cell.errors} ${cell.errors === 1 ? 'error' : 'errors'} from Lean`] : [])],
      witness,
      output: textView(cell),
      error: null,
      stats: { cold, readyMs: cold ? readyMs : 0, runMs: Math.round(performance.now() - t0) },
      printed,
      runtime: RUNTIME,
    }
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
    void run(m.id, m.input)
  }
}
