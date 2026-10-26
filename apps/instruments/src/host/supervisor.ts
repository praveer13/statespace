// The supervisor (ARCHITECTURE.md section 6.1): one long-lived worker per engine, created on first use, a FIFO
// queue with one request in flight per worker, a watchdog per request, a fresh worker after terminate(), and
// provenance stamped on every reply. terminate() is called only by the watchdog, by cancel and on a crash,
// never on a timer (section 5.8).

import { LIMITS, clip, type Budget, type ErrorCode, type FromHost, type OutLine, type RunReply, type RunRequest } from '../bus/protocol.ts'
import type { EngineManifest, FromWorker, ToWorker } from '../engines/contract.ts'
import { ENGINES, type EngineDef } from '../engines/registry.ts'

/** Download or start-up with no progress for this long is a stalled load. */
const STALL_MS = 120_000

type Send = (m: FromHost) => void

interface Job {
  readonly id: string
  readonly kind: 'run' | 'warm'
  readonly engine: string
  readonly input?: unknown
  readonly budget: Budget
}

interface Lane {
  readonly def: EngineDef
  worker: Worker | null
  readonly queue: Job[]
  current: Job | null
  timer: ReturnType<typeof setTimeout> | null
}

export class Supervisor {
  private readonly lanes = new Map<string, Lane>()
  private readonly send: Send
  private readonly manifest: () => Promise<EngineManifest>
  private readonly build: string
  private readonly base: string

  constructor(opts: { send: Send; manifest: () => Promise<EngineManifest>; build: string; base: string }) {
    this.send = opts.send
    this.manifest = opts.manifest
    this.build = opts.build
    this.base = opts.base
  }

  private fail(id: string, code: ErrorCode, detail: string): void {
    this.send({ t: 'error', id, code, detail: clip(detail, LIMITS.detailChars) })
  }

  private lane(engine: string): Lane | null {
    const def = ENGINES[engine]
    if (def === undefined) return null
    let l = this.lanes.get(engine)
    if (l === undefined) {
      l = { def, worker: null, queue: [], current: null, timer: null }
      this.lanes.set(engine, l)
    }
    return l
  }

  run(id: string, req: RunRequest): void {
    const def = ENGINES[req.engine]
    if (def === undefined) return this.fail(id, 'unknown-engine', `no engine ${String(req.engine)} in this build`)
    if (req.version !== def.version) return this.fail(id, 'version-mismatch', `this build pins ${def.engine} ${def.version}, not ${String(req.version)}`)
    const b = req.budget
    if (b === null || typeof b !== 'object' || !Number.isFinite(b.wallMs) || b.wallMs < 1_000 || b.wallMs > 600_000)
      return this.fail(id, 'bad-message', 'budget.wallMs must be between 1000 and 600000')
    if (def.rlimit !== undefined && (!Number.isInteger(b.rlimit) || (b.rlimit as number) < def.rlimit.min || (b.rlimit as number) > def.rlimit.max))
      return this.fail(id, 'bad-message', `budget.rlimit must be an integer from ${def.rlimit.min} to ${def.rlimit.max}`)
    const bad = def.checkInput(req.input)
    if (bad !== null) return this.fail(id, bad.code, bad.detail)
    this.enqueue({ id, kind: 'run', engine: def.engine, input: req.input, budget: { wallMs: b.wallMs, ...(b.rlimit !== undefined ? { rlimit: b.rlimit } : {}) } })
  }

  warm(id: string, engine: string): void {
    if (ENGINES[engine] === undefined) return this.fail(id, 'unknown-engine', `no engine ${String(engine)} in this build`)
    this.enqueue({ id, kind: 'warm', engine, budget: { wallMs: STALL_MS } })
  }

  private enqueue(job: Job): void {
    const l = this.lane(job.engine) as Lane
    if (l.queue.length >= LIMITS.queuedPerEngine) return this.fail(job.id, 'busy', `${LIMITS.queuedPerEngine} requests already queued for ${job.engine}`)
    l.queue.push(job)
    void this.pump(l)
  }

  /** Drop a queued request, or terminate the worker running it; the next request gets a fresh worker. */
  cancel(id: string): void {
    for (const l of this.lanes.values()) {
      const i = l.queue.findIndex((j) => j.id === id)
      if (i >= 0) {
        l.queue.splice(i, 1)
        return this.fail(id, 'terminated', 'cancelled before it started')
      }
      if (l.current?.id === id) {
        this.kill(l)
        this.fail(id, 'terminated', 'stopped: the worker was terminated')
        void this.pump(l)
        return
      }
    }
  }

  /** The kill switch's worker half: stop every worker and fail what they held. */
  stopAll(): void {
    for (const l of this.lanes.values()) {
      const held = [...(l.current !== null ? [l.current] : []), ...l.queue.splice(0)]
      this.kill(l)
      for (const j of held) this.fail(j.id, 'terminated', 'the engine cache was evicted')
    }
  }

  private kill(l: Lane): void {
    if (l.timer !== null) clearTimeout(l.timer)
    l.timer = null
    l.worker?.terminate()
    l.worker = null
    l.current = null
  }

  private arm(l: Lane, ms: number, why: string): void {
    if (l.timer !== null) clearTimeout(l.timer)
    const job = l.current
    l.timer = setTimeout(() => {
      if (job === null || l.current !== job) return
      this.kill(l)
      this.fail(job.id, 'terminated', why)
      void this.pump(l)
    }, ms)
  }

  private async spawn(l: Lane): Promise<Worker> {
    const m = await this.manifest()
    const entry = m.engines[l.def.engine]
    if (entry === undefined) throw new Error(`the manifest has no ${l.def.engine} entry`)
    if (entry.version !== l.def.version) throw new Error(`the manifest pins ${entry.version}, the build ${l.def.version}`)
    const w = l.def.spawn()
    w.onmessage = (e: MessageEvent<FromWorker>) => this.onWorker(l, w, e.data)
    w.onerror = (e) => {
      e.preventDefault()
      if (l.worker !== w) return
      const job = l.current
      this.kill(l)
      if (job !== null) this.fail(job.id, 'engine-crashed', e.message || 'the engine worker failed')
      void this.pump(l)
    }
    const init: ToWorker = { t: 'init', engine: l.def.engine, base: this.base, manifest: entry }
    w.postMessage(init)
    return w
  }

  private async pump(l: Lane): Promise<void> {
    if (l.current !== null) return
    const job = l.queue.shift()
    if (job === undefined) return
    l.current = job
    try {
      if (l.worker === null) l.worker = await this.spawn(l)
    } catch (e) {
      l.current = null
      this.fail(job.id, 'engine-crashed', String((e as Error)?.message ?? e))
      void this.pump(l)
      return
    }
    if (l.current !== job) return // cancelled while the worker spawned
    this.arm(l, STALL_MS, `no progress for ${STALL_MS / 1000} s while the engine loaded`)
    const msg: ToWorker = job.kind === 'warm' ? { t: 'warm', id: job.id } : { t: 'run', id: job.id, input: job.input, budget: job.budget }
    l.worker.postMessage(msg)
  }

  private finish(l: Lane): void {
    if (l.timer !== null) clearTimeout(l.timer)
    l.timer = null
    l.current = null
    void this.pump(l)
  }

  private onWorker(l: Lane, w: Worker, m: FromWorker): void {
    const job = l.current
    if (l.worker !== w || job === null || m.id !== job.id) return
    switch (m.t) {
      case 'progress':
        if (m.phase === 'run') this.arm(l, job.budget.wallMs, `wall-clock watchdog at ${job.budget.wallMs} ms`)
        else this.arm(l, STALL_MS, `no progress for ${STALL_MS / 1000} s while the engine loaded`)
        this.send({ t: 'progress', id: job.id, phase: m.phase, ...(m.loaded !== undefined ? { loaded: m.loaded, total: m.total } : {}) })
        return
      case 'out':
        this.send({ t: 'progress', id: job.id, phase: 'run', out: { stream: m.line.stream, text: clip(String(m.line.text), LIMITS.shownChars) } })
        return
      case 'warmed':
        this.send({ t: 'result', id: job.id, reply: { warmed: true, readyMs: m.readyMs, printed: m.printed } })
        this.finish(l)
        return
      case 'done': {
        const r = m.reply
        let budget = 0
        const output: OutLine[] = []
        for (const line of r.output) {
          budget += line.text.length
          if (budget > LIMITS.witnessBytes) break
          output.push({ stream: line.stream, text: line.text })
        }
        const reply: RunReply = {
          verdict: r.verdict,
          witness: r.witness === null ? null : clip(r.witness, LIMITS.witnessBytes),
          output,
          error: r.error === null ? null : clip(r.error, LIMITS.shownChars),
          stats: r.stats,
          provenance: { engine: l.def.engine, version: l.def.version, printed: r.printed, runtime: r.runtime, build: this.build, budget: job.budget },
        }
        this.send({ t: 'result', id: job.id, reply })
        this.finish(l)
        return
      }
      case 'fail':
        if (m.fatal) this.kill(l)
        this.fail(job.id, m.code, m.detail)
        this.finish(l)
        return
    }
  }
}
