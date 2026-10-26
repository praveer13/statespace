// The engines this build serves, keyed by the bus's `engine` id (ARCHITECTURE.md section 5.4). Each build pins
// exactly one version per engine and refuses a request for any other (`version-mismatch`).
//
// To plug in an engine: write its worker under src/workers/<family>/worker.ts to the contract in contract.ts,
// add its pinned payloads to scripts/instruments/fetch-engines.mjs (the manifest key must equal `engine` here),
// and add an entry below. `spawn` must keep the literal `new Worker(new URL(...), { type: 'module' })` form so
// Vite bundles the worker.

import { LIMITS, byteLength } from '../bus/protocol.ts'
import { checkPgInput } from './pg/input.ts'

export interface EngineDef {
  readonly engine: string
  readonly version: string
  readonly runtime: string
  readonly spawn: () => Worker
  /** A reason the input is refused (`invalid-input` or `too-large`), or null. */
  readonly checkInput: (input: unknown) => { code: 'invalid-input' | 'too-large'; detail: string } | null
  /** Bounds on the engine budget this engine accepts. */
  readonly rlimit?: { readonly min: number; readonly max: number }
}

const textInput = (input: unknown): { code: 'invalid-input' | 'too-large'; detail: string } | null => {
  const code = (input as { code?: unknown } | null)?.code
  if (input === null || typeof input !== 'object' || typeof code !== 'string' || Object.keys(input).length !== 1)
    return { code: 'invalid-input', detail: 'input must be {code: string}' }
  if (byteLength(code) > LIMITS.textInputBytes) return { code: 'too-large', detail: `input above ${LIMITS.textInputBytes} bytes` }
  return null
}

export const ENGINES: Readonly<Record<string, EngineDef>> = {
  z3: {
    engine: 'z3',
    version: '5.3.1',
    runtime: 'Pyodide 314.0.7, z3_solver 5.3.1.0',
    spawn: () => new Worker(new URL('../workers/pyodide-z3/worker.ts', import.meta.url), { type: 'module', name: 'z3' }),
    checkInput: textInput,
    rlimit: { min: 1, max: 100_000_000 },
  },
  // INS-datalog: Z3 Fixedpoint behind the W0-S03 adapter; no rlimit (it does not bound a join), the watchdog stops it.
  datalog: {
    engine: 'datalog',
    version: '5.3.1',
    runtime: 'Fixedpoint (engine=datalog) via the W0-S03 adapter; Pyodide 314.0.7, z3_solver 5.3.1.0',
    spawn: () => new Worker(new URL('./datalog/worker.ts', import.meta.url), { type: 'module', name: 'datalog' }),
    checkInput: textInput,
  },
  // INS-goal-replay: no Lean in the tab; the worker replays the committed strips of RUN-goal-replay (Lean 4.35.0).
  'goal-replay': {
    engine: 'goal-replay',
    version: '4.35.0',
    runtime: 'no Lean in this tab: goal strips from lean --server 4.35.0 at build time (RUN-goal-replay)',
    spawn: () => new Worker(new URL('./goal/worker.ts', import.meta.url), { type: 'module', name: 'goal-replay' }),
    checkInput: textInput,
  },
  // INS-derivation: the Derivation Board, one Z3 validity query per step, each with the request's rlimit.
  derivation: {
    engine: 'derivation',
    version: '5.3.1',
    runtime: 'Pyodide 314.0.7, z3_solver 5.3.1.0, derivation board 1',
    spawn: () => new Worker(new URL('./derivation/worker.ts', import.meta.url), { type: 'module', name: 'derivation' }),
    checkInput: textInput,
    rlimit: { min: 1, max: 100_000_000 },
  },
  // INS-pglite: PGlite 0.5.11 (PostgreSQL 18.6) on one connection; the wall-clock watchdog is its only budget.
  pglite: {
    engine: 'pglite',
    version: '0.5.11',
    runtime: 'PGlite in memory, one connection, wasm32',
    spawn: () => new Worker(new URL('./pg/worker.ts', import.meta.url), { type: 'module', name: 'pglite' }),
    checkInput: checkPgInput,
  },
  // INS-spectacle (and live runs in INS-theater cells): Spectacle 5827c22 behind the course's TLC-order search. A
  // classic worker, because Spectacle's scripts load with importScripts (ARCHITECTURE.md section 6.3); it runs
  // from a build (`vite build`), since Vite's dev server serves workers as modules.
  spectacle: {
    engine: 'spectacle',
    version: '5827c22',
    runtime: 'Spectacle 5827c22 (tree-sitter-tlaplus), course adapter: breadth first in TLC order, one worker',
    spawn: () => new Worker(new URL('./tla/worker.ts', import.meta.url), { type: 'classic', name: 'spectacle' }),
    checkInput: textInput,
  },
  // INS-pairs: the paired-state evaluator over the S7 interpreter, course TypeScript in the pure pool with no payload;
  // the watchdog is its only budget, and every search prints its bound.
  pairs: {
    engine: 'pairs',
    version: '1',
    runtime: 'course TypeScript in the pure pool: the S7 interpreter and the paired-state evaluator',
    spawn: () => new Worker(new URL('./pairs/worker.ts', import.meta.url), { type: 'module', name: 'pairs' }),
    checkInput: textInput,
  },
}
