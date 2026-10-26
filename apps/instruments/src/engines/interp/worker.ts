/// <reference lib="webworker" />
// The INS-interp worker, in the pure pool (ARCHITECTURE.md sections 5.4 and 6.7): the course's TypeScript port of the
// Mini-Plinth reference semantics (packages/interp), with no third-party engine and no payload, so warming it
// downloads nothing. GATE-interp holds it to every kernel-checked golden of LAB-3's pool (RUN-interp-goldens).
//
// Input: { code: string }, an S3 lesson cell in INS-interp's text format (packages/interp/src/cell.ts): a state, a
// policy, calls of the reference program, single operations, or commands in the toy syntax. The reply prints each
// line of the view; the verdict lines are the outcomes (or the type checker's verdicts), and the witness is the view
// as JSON.
//
// Not registered yet: it plugs in with an `interp` entry in ../registry.ts and in scripts/instruments/fetch-engines.mjs
// (`sources: []`, as INS-pairs), and an 'INS-interp' entry in apps/site/src/instruments/registry.ts (lang 'text').

import type { OutLine } from '../../bus/protocol.ts'
import type { FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { runCell } from '@statespace/interp'

declare const self: DedicatedWorkerGlobalScope

export const INTERP_VERSION = '1'
const RUNTIME = 'course TypeScript in the pure pool: the Mini-Plinth reference semantics (packages/interp), held to the kernel-checked goldens'

const post = (m: FromWorker): void => self.postMessage(m)
const out = (lines: readonly string[]): OutLine[] => lines.map((text) => ({ stream: 'stdout' as const, text }))

function run(id: string, input: unknown): void {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be an INS-interp cell: a state, a policy, calls, operations or commands', fatal: false })
    return
  }
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  let reply: WorkerReply
  try {
    const lines = runCell(code)
    const verdict = lines.filter((l) => l.kind !== 'note').map((l) => l.text)
    reply = { verdict, witness: JSON.stringify(lines), output: out(lines.map((l) => l.text)), error: null,
      stats: { cold: false, readyMs: 0, runMs: Math.round(performance.now() - t0) }, printed: INTERP_VERSION, runtime: RUNTIME }
  } catch (e) {
    reply = { verdict: [], witness: null, output: [], error: String((e as Error)?.message ?? e),
      stats: { cold: false, readyMs: 0, runMs: Math.round(performance.now() - t0) }, printed: INTERP_VERSION, runtime: RUNTIME }
  }
  post({ t: 'done', id, reply })
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  if (m.t === 'warm') post({ t: 'warmed', id: m.id, readyMs: 0, printed: INTERP_VERSION })
  else if (m.t === 'run') run(m.id, m.input)
}
