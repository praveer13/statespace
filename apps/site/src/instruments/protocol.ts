// The instrument bus, version 1 (ARCHITECTURE.md section 5.4), as the main origin speaks it: a copy of
// apps/instruments/src/bus/protocol.ts, kept equal by hand until packages/bus (W1-T35) holds the one copy.

export const BUS = 1

/** Section 5.6's caps [D]. */
export const LIMITS = {
  messageBytes: 16 * 1024 * 1024,
  textInputBytes: 256 * 1024,
  witnessBytes: 64 * 1024,
  jsonDepth: 64,
  jsonValues: 100_000,
  queuedPerEngine: 16,
  shownChars: 10_000,
  detailChars: 2_000,
} as const

export type ErrorCode =
  | 'bad-message'
  | 'too-large'
  | 'unknown-engine'
  | 'version-mismatch'
  | 'budget-exhausted'
  | 'terminated'
  | 'engine-crashed'
  | 'invalid-input'
  | 'busy'

export interface Budget {
  /** The engine budget (a Z3 rlimit); the verdict prints it (I10). */
  readonly rlimit?: number
  /** The wall-clock watchdog for the run phase, in ms; on expiry the worker is terminated. */
  readonly wallMs: number
}

export interface RunRequest {
  readonly engine: string
  readonly version: string
  readonly input: unknown
  readonly budget: Budget
}

export interface EngineCaps {
  readonly engine: string
  readonly version: string
  readonly label: string
  /** OD-6's figure: the compressed first load, from the build's manifest (section 5.9). */
  readonly firstLoadBytes: number
  readonly rawBytes: number
  readonly cached: boolean
}

export type Phase = 'download' | 'init' | 'run'

/** One line the engine wrote while it ran; streamed in `progress` and repeated in the final reply. */
export interface OutLine {
  readonly stream: 'stdout' | 'stderr'
  readonly text: string
}

export interface Provenance {
  readonly engine: string
  readonly version: string
  /** What the engine itself printed as its version in this run (for Z3, get_version_string()). */
  readonly printed: string
  readonly runtime: string
  readonly build: string
  readonly budget: Budget
}

export interface RunReply {
  readonly verdict: readonly string[]
  readonly witness: string | null
  readonly output: readonly OutLine[]
  /** The program's own error (a Python traceback), as text; the run itself finished. */
  readonly error: string | null
  readonly stats: { readonly cold: boolean; readonly readyMs: number; readonly runMs: number }
  readonly provenance: Provenance
}

export type ToHost =
  | { t: 'connect'; bus: 1; build: string; nonce: string }
  | { t: 'run'; id: string; req: RunRequest }
  | { t: 'cancel'; id: string }
  | { t: 'warm'; id: string; engine: string }
  | { t: 'caps'; id: string }
  | { t: 'evict'; id: string; engine?: string }

export type FromHost =
  | { t: 'hello'; bus: 1; build: string }
  | { t: 'ready'; engines: EngineCaps[] }
  | { t: 'progress'; id: string; phase: Phase; loaded?: number; total?: number; out?: OutLine }
  | { t: 'result'; id: string; reply: unknown }
  | { t: 'error'; id?: string; code: ErrorCode; detail: string }

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

/** Section 5.6's structural limits. Returns a reason, or null when the value passes. */
export function structuralProblem(value: unknown): string | null {
  let count = 0
  const walk = (v: unknown, depth: number): string | null => {
    if (++count > LIMITS.jsonValues) return `more than ${LIMITS.jsonValues} values`
    if (depth > LIMITS.jsonDepth) return `deeper than ${LIMITS.jsonDepth}`
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return null
    if (Array.isArray(v)) {
      for (const x of v) {
        const p = walk(x, depth + 1)
        if (p !== null) return p
      }
      return null
    }
    if (typeof v === 'object') {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return 'not a plain object'
      for (const k of Object.keys(v)) {
        if (FORBIDDEN_KEYS.has(k)) return `forbidden key ${k}`
        const p = walk((v as Record<string, unknown>)[k], depth + 1)
        if (p !== null) return p
      }
      return null
    }
    return `a ${typeof v} value`
  }
  return walk(value, 0)
}

const enc = new TextEncoder()
export const byteLength = (v: unknown): number => enc.encode(JSON.stringify(v) ?? '').byteLength

export const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v)

export const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s)
