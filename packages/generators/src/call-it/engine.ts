// GEN-call-it's checker in the tab: the call pocket. Three questions, each exact on the instance's finite model:
//
//   predict   the answer a solver gives a query whose variables the query itself bounds: every state of the bounds is
//             tried, so sat (with the first witness) or unsat is exact. A query with SP-1.7's power term `x ** y` is
//             outside the linear fragment; for it the pocket answers unknown, "incomplete (theory arithmetic)", the
//             answer Z3 5.3.1 gave natively and under Pyodide (recorded run RUN-z3-unknown-pow). That one answer is a
//             recorded behaviour the pocket reproduces, not a decision it makes [D].
//   graph     the shortest violating trace of a workers system (workers.ts), by breadth-first search of its whole
//             state graph at the printed constants.
//   readings  whether each restatement's reading agrees with the theorem's under every interpretation (readings.ts).
//
// ASSESSMENT.md section 4.12 keys these with Z3, the TLC graph and Lean; the tab runs none of them for generated items
// yet, so the pocket stands in and every grade says so [D]. A question past its state budget is unknown, which
// discards the seed. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { evaluate, hasPow } from './logic.ts'
import type { Formula, State } from './logic.ts'
import { judge } from './readings.ts'
import { actionText, explore } from './workers.ts'
import type { WorkerSpec } from './workers.ts'

export const CALL_POCKET = 'call-pocket'
export const CALL_POCKET_VERSION = '1'
export const CALL_POCKET_MAX_STATES = 50000

/** The reason Z3 5.3.1 printed for SP-1.7's query (recorded run RUN-z3-unknown-pow). */
export const POW_REASON = 'incomplete (theory arithmetic)'

export interface Bound {
  readonly v: string
  readonly lo: number
  readonly hi: number
}

export type PocketQuery =
  | { readonly op: 'predict'; readonly formula: Formula; readonly bounds: readonly Bound[] }
  | { readonly op: 'graph'; readonly spec: WorkerSpec }
  | { readonly op: 'readings'; readonly theorem: Formula; readonly statements: Readonly<Record<string, Formula>> }

export type Prediction = { readonly answer: 'sat'; readonly witness: State } | { readonly answer: 'unsat' } | { readonly answer: 'unknown'; readonly reason: string }

export interface GraphAnswer {
  readonly distinct: number
  /** The shortest violating trace's length in actions, or null when no reachable state violates. */
  readonly shortest: number | null
  readonly trace: readonly string[] | null
}

export interface ReadingAnswer {
  readonly truth: Readonly<Record<string, boolean>>
  readonly refutations: Readonly<Record<string, { readonly under: string; readonly theorem: boolean; readonly statement: boolean }>>
}

const size = (bounds: readonly Bound[]): number => bounds.reduce((n, b) => n * (b.hi - b.lo + 1), 1)

/** Try every state of the bounds, the last variable fastest; the first that satisfies the formula is the witness. */
export function predict(formula: Formula, bounds: readonly Bound[]): Prediction {
  if (hasPow(formula)) return { answer: 'unknown', reason: POW_REASON }
  const values = bounds.map((b) => b.lo)
  const total = size(bounds)
  for (let i = 0; i < total; i++) {
    const s: Record<string, number> = {}
    bounds.forEach((b, j) => {
      s[b.v] = values[j] as number
    })
    if (evaluate(formula, s)) return { answer: 'sat', witness: s }
    for (let j = values.length - 1; j >= 0; j--) {
      const b = bounds[j] as Bound
      if ((values[j] as number) < b.hi) {
        values[j] = (values[j] as number) + 1
        break
      }
      values[j] = b.lo
    }
  }
  return { answer: 'unsat' }
}

class PocketError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'PocketError'
    this.code = code
  }
}

const isQuery = (x: unknown): x is PocketQuery => typeof x === 'object' && x !== null && ['predict', 'graph', 'readings'].includes(String((x as { op?: unknown }).op))

export const callPocketPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== CALL_POCKET) throw new PocketError('unknown-engine', `the call pocket runs ${CALL_POCKET}, not ${req.engine}`)
    if (req.version !== CALL_POCKET_VERSION) throw new PocketError('version-mismatch', `the call pocket is version ${CALL_POCKET_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new PocketError('invalid-input', 'not a call-pocket query')
    const q = req.input
    const max = req.budget.maxStates ?? CALL_POCKET_MAX_STATES
    const provenance = { engine: CALL_POCKET, version: CALL_POCKET_VERSION, build: `${CALL_POCKET}@${CALL_POCKET_VERSION}`, budget: req.budget }
    const reply = (results: unknown, witness: unknown, n: number): InstrumentReply<W> => ({ verdict: { kind: 'checks', results: [results] }, witness: witness as W, stats: { ms: 0, n }, provenance })
    if (q.op === 'predict') {
      if (!hasPow(q.formula) && size(q.bounds) > max) return { verdict: { kind: 'unknown', reason: `the bounds hold ${size(q.bounds)} states, over the budget of ${max}` }, stats: { ms: 0 }, provenance }
      const p = predict(q.formula, q.bounds)
      return reply(p, p.answer === 'sat' ? p.witness : undefined, size(q.bounds))
    }
    if (q.op === 'graph') {
      const e = explore(q.spec, max)
      if (e === null) return { verdict: { kind: 'unknown', reason: `the state graph holds more than ${max} states` }, stats: { ms: 0 }, provenance }
      const g: GraphAnswer = { distinct: e.distinct, shortest: e.shortest === null ? null : e.shortest.length, trace: e.shortest === null ? null : e.shortest.map(actionText) }
      return reply(g, g.trace, e.distinct)
    }
    const truth: Record<string, boolean> = {}
    const refutations: Record<string, { under: string; theorem: boolean; statement: boolean }> = {}
    for (const [id, f] of Object.entries(q.statements)) {
      const j = judge(q.theorem, f)
      truth[id] = 'same' in j
      if (!('same' in j)) refutations[id] = { under: j.differs.says, theorem: j.theorem, statement: j.statement }
    }
    const r: ReadingAnswer = { truth, refutations }
    return reply(r, undefined, Object.keys(q.statements).length)
  },
}
