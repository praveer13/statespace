// The tactic model (tactics.ts) behind the EnginePort a bus engine uses, so GEN-proof-structure keys and grades the
// way every family does: one request in, one reply out. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { runScript, showGoals } from './tactics.ts'
import type { Script, Theory } from './tactics.ts'

export const TACTIC_MODEL = 'tactic-model'
export const TACTIC_MODEL_VERSION = '1'
/** The rewrite budget the family asks for [D]: the corpus's longest proof spends under 100. */
export const TACTIC_MODEL_MAX_REWRITES = 2000

export interface RunQuery {
  readonly op: 'run'
  readonly theory: Theory
  readonly script: Script
  /** Run this many lines and report the goals then; the whole script when absent. */
  readonly upto?: number
}

export interface RunWitness {
  readonly ok: boolean
  readonly goals: string
  readonly line?: number
  readonly error?: string
}

export class TacticModelError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TacticModelError'
    this.code = code
  }
}

export function decide(q: RunQuery, maxRewrites: number): InstrumentReply<RunWitness> {
  const budget = { wallMs: 0, maxStates: maxRewrites }
  const provenance = { engine: TACTIC_MODEL, version: TACTIC_MODEL_VERSION, build: `${TACTIC_MODEL}@${TACTIC_MODEL_VERSION}`, budget }
  const r = runScript(q.theory, q.script, { ...(q.upto === undefined ? {} : { upto: q.upto }), maxRewrites })
  if (r.budget === true) return { verdict: { kind: 'unknown', reason: `the model spent more than ${maxRewrites} rewrites` }, stats: { ms: 0, n: r.rewrites }, provenance }
  const witness: RunWitness = { ok: r.ok, goals: showGoals(r.goals), ...(r.line === undefined ? {} : { line: r.line }), ...(r.error === undefined ? {} : { error: r.error }) }
  const verdict = r.error !== undefined ? ({ kind: 'rejected', issues: [`line ${r.line ?? '?'}: ${r.error}`] } as const) : ({ kind: 'no-error', complete: r.ok } as const)
  return { verdict, witness, stats: { ms: 0, n: r.rewrites }, provenance }
}

function isQuery(x: unknown): x is RunQuery {
  if (typeof x !== 'object' || x === null) return false
  const q = x as Partial<RunQuery>
  return q.op === 'run' && typeof q.theory === 'object' && Array.isArray(q.script)
}

export const tacticModelPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== TACTIC_MODEL) throw new TacticModelError('unknown-engine', `the tactic model runs ${TACTIC_MODEL}, not ${req.engine}`)
    if (req.version !== TACTIC_MODEL_VERSION) throw new TacticModelError('version-mismatch', `the tactic model is version ${TACTIC_MODEL_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new TacticModelError('invalid-input', 'not a tactic-model query')
    return decide(req.input, req.budget.maxStates ?? TACTIC_MODEL_MAX_REWRITES) as unknown as InstrumentReply<W>
  },
}
