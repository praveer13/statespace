// The contract between the supervisor (src/host/supervisor.ts) and one engine's worker. Every engine worker is a
// module worker that handles these messages and nothing else; it never talks to the main origin or to another
// worker (ARCHITECTURE.md section 6.1).

import type { Budget, ErrorCode, OutLine, Phase } from '../bus/protocol.ts'

/** One file of an engine's first load, as scripts/instruments/fetch-engines.mjs writes it into the manifest. */
export interface Asset {
  /** Relative to the instruments build's base URL, e.g. engines/pyodide/314.0.7/pyodide.asm.wasm. */
  readonly path: string
  readonly sha256: string
  readonly bytes: number
  /** gzip level 5 bytes: what the wire carries. */
  readonly wire: number
}

export interface EngineManifestEntry {
  readonly version: string
  readonly label: string
  readonly assets: readonly Asset[]
  readonly rawBytes: number
  readonly firstLoadBytes: number
}

export interface EngineManifest {
  readonly manifest: 1
  readonly engines: Readonly<Record<string, EngineManifestEntry>>
}

/** Supervisor to worker. `init` comes first and once; then `warm` and `run`, one at a time. */
export type ToWorker =
  | { t: 'init'; engine: string; base: string; manifest: EngineManifestEntry }
  | { t: 'warm'; id: string }
  | { t: 'run'; id: string; input: unknown; budget: Budget }

/** What a run's reply carries before the supervisor stamps its provenance. */
export interface WorkerReply {
  readonly verdict: readonly string[]
  readonly witness: string | null
  readonly output: readonly OutLine[]
  readonly error: string | null
  readonly stats: { readonly cold: boolean; readonly readyMs: number; readonly runMs: number }
  /** The engine's own version string, as it printed it in this worker. */
  readonly printed: string
  readonly runtime: string
}

/** Worker to supervisor. A `progress` with phase `run` starts the run watchdog. */
export type FromWorker =
  | { t: 'progress'; id: string; phase: Phase; loaded?: number; total?: number }
  | { t: 'out'; id: string; line: OutLine }
  | { t: 'warmed'; id: string; readyMs: number; printed: string }
  | { t: 'done'; id: string; reply: WorkerReply }
  /** `fatal` asks the supervisor to terminate this worker and start the next request on a fresh one. */
  | { t: 'fail'; id: string; code: ErrorCode; detail: string; fatal: boolean }
