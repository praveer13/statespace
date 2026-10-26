// The live run of one instrument cell: connect on reveal (caps only; nothing downloads until a run), run the code,
// stream its output, stop it, reset the code. The recorded run stays the cell's evidence whatever happens here.

import { useCallback, useEffect, useRef, useState } from 'react'
import { BusError, instrumentClient, type RunHandle } from './client.ts'
import type { EngineCaps, OutLine, RunReply } from './protocol.ts'
import type { LiveInstrument } from './registry.ts'

export type LiveState =
  | { readonly s: 'idle' }
  | { readonly s: 'connecting' }
  | { readonly s: 'download'; readonly loaded: number; readonly total: number }
  | { readonly s: 'init' }
  | { readonly s: 'running'; readonly lines: readonly OutLine[] }
  | { readonly s: 'result'; readonly reply: RunReply; readonly code: string }
  | { readonly s: 'stopped'; readonly lines: readonly OutLine[] }
  /** `fallback`: the engine could not load here, so the recorded run is all this cell shows. */
  | { readonly s: 'error'; readonly code: string; readonly detail: string; readonly lines: readonly OutLine[]; readonly fallback: boolean }

export interface LiveRun {
  readonly state: LiveState
  readonly caps: EngineCaps | null
  readonly code: string
  readonly edited: boolean
  readonly busy: boolean
  setCode(code: string): void
  run(): void
  stop(): void
  reset(): void
}

const LOAD_CODES = new Set(['unavailable', 'unknown-engine', 'version-mismatch', 'engine-crashed'])

export function useLiveRun(live: LiveInstrument | undefined, authored: string, enabled: boolean): LiveRun {
  const [code, setCode] = useState(authored)
  const [state, setState] = useState<LiveState>({ s: 'idle' })
  const [caps, setCaps] = useState<EngineCaps | null>(null)
  const handle = useRef<RunHandle | null>(null)
  const stopping = useRef(false)

  useEffect(() => {
    if (live === undefined || !enabled) return
    let alive = true
    const client = instrumentClient()
    client.connect().then(
      (engines) => {
        if (!alive) return
        const c = engines.find((e) => e.engine === live.engine) ?? null
        setCaps(c)
        if (c === null) setState({ s: 'error', code: 'unknown-engine', detail: `the instruments build serves no ${live.name}`, lines: [], fallback: true })
      },
      (e: unknown) => {
        if (alive) setState({ s: 'error', code: e instanceof BusError ? e.code : 'unavailable', detail: e instanceof Error ? e.message : String(e), lines: [], fallback: true })
      },
    )
    return () => {
      alive = false
    }
  }, [live, enabled])

  useEffect(() => () => handle.current?.cancel(), [])

  const run = useCallback(() => {
    if (live === undefined || handle.current !== null) return
    const ran = code
    const lines: OutLine[] = []
    let ranPhase = false
    stopping.current = false
    setState({ s: 'connecting' })
    const h = instrumentClient().run(
      { engine: live.engine, version: live.version, input: live.input(ran), budget: live.budget },
      {
        onProgress: (p) => {
          if (p.phase === 'download') setState({ s: 'download', loaded: p.loaded ?? 0, total: p.total ?? caps?.firstLoadBytes ?? 0 })
          else if (p.phase === 'init') setState({ s: 'init' })
          else {
            ranPhase = true
            setState({ s: 'running', lines: [...lines] })
          }
        },
        onOutput: (line) => {
          lines.push(line)
          setState({ s: 'running', lines: [...lines] })
        },
      },
    )
    handle.current = h
    h.done.then(
      (reply) => {
        handle.current = null
        setState({ s: 'result', reply, code: ran })
        setCaps((c) => (c === null ? c : { ...c, cached: true }))
      },
      (e: unknown) => {
        handle.current = null
        const err = e instanceof BusError ? e : new BusError('engine-crashed', String(e))
        if (stopping.current && err.code === 'terminated') setState({ s: 'stopped', lines: [...lines] })
        else setState({ s: 'error', code: err.code, detail: err.message, lines: [...lines], fallback: !ranPhase && LOAD_CODES.has(err.code) })
      },
    )
  }, [live, code, caps])

  const stop = useCallback(() => {
    stopping.current = true
    handle.current?.cancel()
  }, [])

  const reset = useCallback(() => setCode(authored), [authored])

  const busy = state.s === 'connecting' || state.s === 'download' || state.s === 'init' || state.s === 'running'
  return { state, caps, code, edited: code !== authored, busy, setCode, run, stop, reset }
}
