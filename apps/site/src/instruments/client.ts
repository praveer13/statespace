// InstrumentClient (ARCHITECTURE.md section 3.5): the main origin's end of the instrument bus. It creates the
// hidden, sandboxed iframe on the first instrument need, performs the handshake of section 5.3, multiplexes
// requests by id over the one MessagePort, enforces the caps on what it sends (section 5.6), runs its own watchdog
// per request, and treats every reply as untrusted data (section 5.5).

import { HOST_URL, INSTRUMENT_BUILD, INSTRUMENT_ORIGIN } from './config.ts'
import {
  BUS,
  LIMITS,
  byteLength,
  structuralProblem,
  type EngineCaps,
  type ErrorCode,
  type FromHost,
  type OutLine,
  type Phase,
  type RunReply,
  type RunRequest,
  type ToHost,
} from './protocol.ts'

/** The client's watchdog: the host's wall clock plus this margin [D]. */
const MARGIN_MS = 5_000
/** No word from the frame for this long while an engine loads is a stalled load. */
const STALL_MS = 150_000
const CONNECT_MS = 20_000

export class BusError extends Error {
  readonly code: ErrorCode | 'unavailable'
  constructor(code: ErrorCode | 'unavailable', detail: string) {
    super(detail)
    this.code = code
  }
}

export interface RunHandlers {
  onProgress?: (p: { phase: Phase; loaded?: number; total?: number }) => void
  onOutput?: (line: OutLine) => void
}

export interface RunHandle {
  readonly id: string
  readonly done: Promise<RunReply>
  cancel(): void
}

interface Pending {
  readonly resolve: (v: unknown) => void
  readonly reject: (e: BusError) => void
  readonly handlers: RunHandlers
  readonly wallMs: number
  timer: ReturnType<typeof setTimeout> | null
}

const newId = (): string => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** A run reply, checked field by field; anything else is refused. */
export function asRunReply(v: unknown): RunReply | null {
  if (structuralProblem(v) !== null || v === null || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  const p = r.provenance as Record<string, unknown> | undefined
  const s = r.stats as Record<string, unknown> | undefined
  const out = r.output
  if (!isStrings(r.verdict)) return null
  if (!(r.witness === null || typeof r.witness === 'string')) return null
  if (!(r.error === null || typeof r.error === 'string')) return null
  if (!Array.isArray(out) || !out.every((l) => l !== null && typeof l === 'object' && (l.stream === 'stdout' || l.stream === 'stderr') && typeof l.text === 'string')) return null
  if (s === undefined || typeof s.cold !== 'boolean' || typeof s.readyMs !== 'number' || typeof s.runMs !== 'number') return null
  if (p === undefined || typeof p.engine !== 'string' || typeof p.version !== 'string' || typeof p.printed !== 'string' || typeof p.runtime !== 'string' || typeof p.build !== 'string') return null
  const b = p.budget as Record<string, unknown> | undefined
  if (b === undefined || typeof b.wallMs !== 'number' || !(b.rlimit === undefined || typeof b.rlimit === 'number')) return null
  return v as RunReply
}

export class InstrumentClient {
  private frame: HTMLIFrameElement | null = null
  private port: MessagePort | null = null
  private connecting: Promise<EngineCaps[]> | null = null
  private readonly pending = new Map<string, Pending>()
  private readonly answered = new Set<string>()

  /** Whether this build knows an instrument origin at all. */
  get configured(): boolean {
    return HOST_URL !== null && INSTRUMENT_ORIGIN !== null
  }

  /** Create the frame and complete the handshake; resolves with the engines the host reports in `ready`. */
  connect(): Promise<EngineCaps[]> {
    if (this.connecting !== null) return this.connecting
    this.connecting = new Promise<EngineCaps[]>((resolve, reject) => {
      if (HOST_URL === null || INSTRUMENT_ORIGIN === null) {
        reject(new BusError('unavailable', 'this build names no instrument origin'))
        return
      }
      const origin = INSTRUMENT_ORIGIN
      const frame = document.createElement('iframe')
      frame.title = 'statespace instruments'
      frame.hidden = true
      frame.referrerPolicy = 'no-referrer'
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
      const timer = setTimeout(() => {
        window.removeEventListener('message', onHello)
        reject(new BusError('unavailable', `the instrument origin did not answer within ${CONNECT_MS / 1000} s`))
      }, CONNECT_MS)
      const onHello = (e: MessageEvent): void => {
        // Section 5.3, step 3: the origin, the frame and the build must all match; anything else is ignored unread.
        if (this.port !== null || e.origin !== origin || e.source !== frame.contentWindow || frame.contentWindow === null) return
        const d = e.data as { t?: unknown; bus?: unknown; build?: unknown } | null
        if (d === null || typeof d !== 'object' || d.t !== 'hello' || d.bus !== BUS || d.build !== INSTRUMENT_BUILD) return
        window.removeEventListener('message', onHello)
        const ch = new MessageChannel()
        this.port = ch.port1
        ch.port1.onmessage = (ev) => {
          const m = ev.data as FromHost | null
          if (m !== null && typeof m === 'object' && m.t === 'ready') {
            clearTimeout(timer)
            resolve(Array.isArray(m.engines) ? m.engines.filter((x) => x !== null && typeof x === 'object' && typeof x.engine === 'string') : [])
            ch.port1.onmessage = (x) => this.onPort(x)
            return
          }
          this.onPort(ev)
        }
        const connect: ToHost = { t: 'connect', bus: 1, build: INSTRUMENT_BUILD, nonce: newId() }
        frame.contentWindow.postMessage(connect, origin, [ch.port2])
      }
      window.addEventListener('message', onHello)
      frame.src = HOST_URL
      document.body.appendChild(frame)
      this.frame = frame
    })
    this.connecting.catch(() => {
      // a failed connect can be tried again by the next cell
      this.frame?.remove()
      this.frame = null
      this.port = null
      this.connecting = null
    })
    return this.connecting
  }

  private post(m: ToHost): void {
    if (this.port === null) throw new BusError('unavailable', 'not connected')
    if (byteLength(m) > LIMITS.messageBytes) throw new BusError('too-large', `a message above ${LIMITS.messageBytes} bytes`)
    const shape = structuralProblem(m)
    if (shape !== null) throw new BusError('bad-message', shape)
    this.port.postMessage(m)
  }

  private settle(id: string): Pending | undefined {
    const p = this.pending.get(id)
    if (p === undefined) return undefined
    if (p.timer !== null) clearTimeout(p.timer)
    this.pending.delete(id)
    this.answered.add(id)
    return p
  }

  private watch(id: string, ms: number, why: string): void {
    const p = this.pending.get(id)
    if (p === undefined) return
    if (p.timer !== null) clearTimeout(p.timer)
    p.timer = setTimeout(() => {
      const q = this.settle(id)
      if (q === undefined) return
      try {
        this.post({ t: 'cancel', id })
      } catch {
        // the frame is gone; nothing to stop
      }
      q.reject(new BusError('terminated', why))
    }, ms)
  }

  private onPort(e: MessageEvent): void {
    const m = e.data as FromHost | null
    if (m === null || typeof m !== 'object' || typeof m.t !== 'string') return
    if (byteLength(m) > LIMITS.messageBytes || structuralProblem(m) !== null) return
    const id = 'id' in m && typeof m.id === 'string' ? m.id : undefined
    if (id === undefined || this.answered.has(id)) return // unknown or already answered: dropped (section 5.5)
    const p = this.pending.get(id)
    if (p === undefined) return
    if (m.t === 'progress') {
      if (m.phase === 'run' && m.out === undefined) this.watch(id, p.wallMs + MARGIN_MS, `no reply within the watchdog's ${p.wallMs + MARGIN_MS} ms`)
      else if (m.phase !== 'run') this.watch(id, STALL_MS, 'the engine stopped loading')
      if (m.out !== undefined && (m.out.stream === 'stdout' || m.out.stream === 'stderr') && typeof m.out.text === 'string') {
        p.handlers.onOutput?.({ stream: m.out.stream, text: m.out.text.slice(0, LIMITS.shownChars) })
      } else if (m.phase === 'download' || m.phase === 'init' || m.phase === 'run') {
        p.handlers.onProgress?.({
          phase: m.phase,
          ...(typeof m.loaded === 'number' && typeof m.total === 'number' ? { loaded: m.loaded, total: m.total } : {}),
        })
      }
      return
    }
    if (m.t === 'result') {
      this.settle(id)?.resolve(m.reply)
      return
    }
    if (m.t === 'error') {
      this.settle(id)?.reject(new BusError(m.code, String(m.detail).slice(0, LIMITS.detailChars)))
    }
  }

  private request(m: ToHost & { id: string }, handlers: RunHandlers, wallMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pending.set(m.id, { resolve, reject, handlers, wallMs, timer: null })
      this.watch(m.id, STALL_MS, 'the instrument origin went quiet')
      try {
        this.post(m)
      } catch (e) {
        this.settle(m.id)
        reject(e instanceof BusError ? e : new BusError('bad-message', String(e)))
      }
    })
  }

  /** Run one request. The reply is checked before it resolves; a refused reply rejects as bad-message. */
  run(req: RunRequest, handlers: RunHandlers = {}): RunHandle {
    const id = newId()
    const done = (async () => {
      if (byteLength(req.input) > LIMITS.textInputBytes) throw new BusError('too-large', `input above ${LIMITS.textInputBytes} bytes`)
      await this.connect()
      const reply = await this.request({ t: 'run', id, req }, handlers, req.budget.wallMs)
      const r = asRunReply(reply)
      if (r === null) throw new BusError('bad-message', 'the reply did not match the run reply shape')
      return r
    })()
    return {
      id,
      done,
      cancel: () => {
        if (!this.pending.has(id)) return
        try {
          this.post({ t: 'cancel', id })
        } catch {
          const p = this.settle(id)
          p?.reject(new BusError('terminated', 'stopped'))
        }
      },
    }
  }

  async warm(engine: string, handlers: RunHandlers = {}): Promise<void> {
    await this.connect()
    const id = newId()
    await this.request({ t: 'warm', id, engine }, handlers, STALL_MS)
  }

  async caps(): Promise<EngineCaps[]> {
    await this.connect()
    const id = newId()
    const r = (await this.request({ t: 'caps', id }, {}, STALL_MS)) as { engines?: unknown } | null
    return Array.isArray(r?.engines) ? (r.engines as EngineCaps[]) : []
  }

  async evict(engine?: string): Promise<void> {
    await this.connect()
    const id = newId()
    await this.request({ t: 'evict', id, ...(engine !== undefined ? { engine } : {}) }, {}, STALL_MS)
  }
}

let shared: InstrumentClient | null = null

/** The page's one client: one frame and one port per page lifetime. */
export function instrumentClient(): InstrumentClient {
  if (shared === null) shared = new InstrumentClient()
  return shared
}
