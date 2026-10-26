/// <reference lib="webworker" />
// The INS-pairs worker, in the pure pool (ARCHITECTURE.md sections 5.4 and 6.7): course TypeScript with no third-party
// engine and no payload, so warming it downloads nothing.
//
// Input: { code: string }, one of
//   * a pair in the pair notation (notation.ts): the reply says whether the two worlds are related, what the observer
//     sees in each execution, whether it tells them apart, and the per-response monitor on each execution alone;
//   * a JSON object { "view": "<.view text>", "observe": [...], "release": [...], "pair"?: [state, state] }: the view
//     slice of LAB-7.5. With a pair, the reply replays it; without, it searches every state inside SLICE_BOUND and
//     returns a leaking pair or "none within the bound". The bound is printed with every answer (I10).

import type { OutLine } from '../../bus/protocol.ts'
import type { FromWorker, ToWorker, WorkerReply } from '../contract.ts'
import { readPair } from './notation.ts'
import { SLICE_BOUND, findSlicePair, judge, judgmentLines, readView, replaySlicePair, type SliceObserver, type SliceState } from './pairs.ts'

declare const self: DedicatedWorkerGlobalScope

export const PAIRS_VERSION = '1'
const RUNTIME = 'course TypeScript in the pure pool: the S7 interpreter and the paired-state evaluator (apps/instruments/src/engines/pairs)'

const post = (m: FromWorker): void => self.postMessage(m)
const out = (lines: readonly string[]): OutLine[] => lines.map((text) => ({ stream: 'stdout' as const, text }))

function evaluate(code: string): { verdict: string[]; witness: string | null } {
  if (code.trimStart().startsWith('{')) {
    const q = JSON.parse(code) as { view: string; observe: SliceObserver['observe']; release: SliceObserver['release']; pair?: [SliceState, SliceState] }
    const view = readView(q.view)
    const obs: SliceObserver = { observe: q.observe, release: q.release }
    if (q.pair !== undefined) {
      const r = replaySlicePair(view, obs, q.pair[0], q.pair[1])
      return { verdict: [`replay: ${r.related ? 'related' : 'not related'}; ${r.distinguishes ? 'told apart' : 'not told apart'}`], witness: JSON.stringify(q.pair) }
    }
    const found = findSlicePair(view, obs)
    return found === null
      ? { verdict: [`none within the bound: ${SLICE_BOUND}`], witness: null }
      : { verdict: [`a leaking pair within the bound: ${SLICE_BOUND}`], witness: JSON.stringify(found) }
  }
  const pair = readPair(code)
  const j = judge(pair)
  return { verdict: judgmentLines('the request', pair, j), witness: j.distinguishes ? JSON.stringify({ execution1: j.result1, execution2: j.result2 }) : null }
}

function run(id: string, input: unknown): void {
  const code = (input as { code?: unknown } | null)?.code
  if (typeof code !== 'string') {
    post({ t: 'fail', id, code: 'invalid-input', detail: 'input.code must be a pair in the pair notation, or a view-slice request as JSON', fatal: false })
    return
  }
  post({ t: 'progress', id, phase: 'run' })
  const t0 = performance.now()
  let reply: WorkerReply
  try {
    const r = evaluate(code)
    reply = { verdict: r.verdict, witness: r.witness, output: out(r.verdict), error: null, stats: { cold: false, readyMs: 0, runMs: Math.round(performance.now() - t0) }, printed: PAIRS_VERSION, runtime: RUNTIME }
  } catch (e) {
    reply = { verdict: [], witness: null, output: [], error: String((e as Error)?.message ?? e), stats: { cold: false, readyMs: 0, runMs: Math.round(performance.now() - t0) }, printed: PAIRS_VERSION, runtime: RUNTIME }
  }
  post({ t: 'done', id, reply })
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  if (m.t === 'warm') post({ t: 'warmed', id: m.id, readyMs: 0, printed: PAIRS_VERSION })
  else if (m.t === 'run') run(m.id, m.input)
}
