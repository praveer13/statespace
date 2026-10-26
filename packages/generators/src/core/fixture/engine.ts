// The fixture family's checker: a box engine that decides a formula by enumerating every state with values in
// [-span, span], in lexicographic order, and returns the first satisfying state as its witness. Its verdicts
// are exact inside the box and say nothing outside it, so every verdict carries the box as its bound (I10). A
// box larger than the request's state budget comes back `unknown`, which is how the fixture exercises the
// discard path deterministically. It runs as plain code behind the same EnginePort a bus engine uses, and it
// reads no clock (stats.ms is 0: the box engine does not time itself).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../port.ts'
import { evaluate } from './formula.ts'
import type { Formula, State } from './formula.ts'

export const BOX_ENGINE = 'fixture-box'
export const BOX_VERSION = '1'
/** The state budget the fixture asks for [D]: a four-variable box of span 5 fits, span 6 does not. */
export const BOX_MAX_STATES = 20000

export interface BoxQuery {
  readonly op: 'sat'
  readonly formula: Formula
  readonly vars: readonly string[]
  readonly span: number
}

/** The bound a box verdict rests on, as the feedback prints it. */
export const boxBound = (vars: readonly string[], span: number): string => `every state with ${vars.join(', ')} in [−${span}, ${span}]`

/** The number of states in a box: (2 span + 1)^n, by repeated multiplication. */
export function boxSize(vars: number, span: number): number {
  let n = 1
  for (let i = 0; i < vars; i++) n *= 2 * span + 1
  return n
}

function isBoxQuery(input: unknown): input is BoxQuery {
  if (typeof input !== 'object' || input === null) return false
  const q = input as Partial<BoxQuery>
  return q.op === 'sat' && typeof q.formula === 'object' && Array.isArray(q.vars) && q.vars.every((v) => typeof v === 'string') && Number.isInteger(q.span) && (q.span as number) >= 0
}

/** Error with a bus error code, as the instrument bus rejects a request. */
export class BoxError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'BoxError'
    this.code = code
  }
}

/** Decide one query: sat with the first witness in lexicographic order, unsat, or unknown past the budget. */
export function decide(q: BoxQuery, maxStates: number): InstrumentReply<State> {
  const states = boxSize(q.vars.length, q.span)
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: BOX_ENGINE, version: BOX_VERSION, build: `${BOX_ENGINE}@${BOX_VERSION}`, budget }
  const bound = boxBound(q.vars, q.span)
  if (states > maxStates) {
    return { verdict: { kind: 'unknown', reason: `the box holds ${states} states, over the budget of ${maxStates}` }, stats: { ms: 0, n: 0, bound }, provenance }
  }
  const values = q.vars.map(() => -q.span)
  for (let n = 1; n <= states; n++) {
    const s: Record<string, number> = {}
    q.vars.forEach((v, i) => {
      s[v] = values[i] as number
    })
    if (evaluate(q.formula, s)) return { verdict: { kind: 'sat' }, witness: s, stats: { ms: 0, n, bound }, provenance }
    // The next state: count up in base 2 span + 1, the last variable fastest.
    for (let i = values.length - 1; i >= 0; i--) {
      if ((values[i] as number) < q.span) {
        values[i] = (values[i] as number) + 1
        break
      }
      values[i] = -q.span
    }
  }
  return { verdict: { kind: 'unsat' }, stats: { ms: 0, n: states, bound }, provenance }
}

/** The box engine as a port: it answers fixture-box requests and refuses every other engine. */
export const boxPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== BOX_ENGINE) throw new BoxError('unknown-engine', `the box port runs ${BOX_ENGINE}, not ${req.engine}`)
    if (req.version !== BOX_VERSION) throw new BoxError('version-mismatch', `the box engine is version ${BOX_VERSION}, not ${req.version}`)
    if (!isBoxQuery(req.input)) throw new BoxError('invalid-input', 'not a box query')
    return decide(req.input, req.budget.maxStates ?? BOX_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
