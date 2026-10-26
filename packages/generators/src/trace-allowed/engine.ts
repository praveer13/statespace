// GEN-trace-allowed's checker in the tab: the trace graph. It builds the complete reachable state graph of the item's
// DoubleSpend instance at its constants (model.ts) and returns it; key() and grade() replay every option on it.
//
// ASSESSMENT.md section 4.8 names the spec's TLC state graph, computed in CI or by Spectacle in the tab, as this
// family's oracle. Neither reaches generated items yet, so this build explores the graph itself, in this page, and
// every grade says so [D]. Its exploration agrees with TLC's at the recorded constants: 11, 45 and 191 distinct states
// for two, three and four workers at Init 100, Amount 80 [X RUN-tlc-full] (the family's tests). A graph larger than
// the request's state budget comes back `unknown`, which discards the seed. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { explore } from './model.ts'
import type { Graph, WorkerModel } from './model.ts'

export const TRACE_GRAPH = 'trace-graph'
export const TRACE_GRAPH_VERSION = '1'
/** The state budget the family asks for [D]: its largest instance (three 3-step workers) stays well under it. */
export const TRACE_GRAPH_MAX_STATES = 5000

export interface GraphQuery {
  readonly op: 'graph'
  readonly model: WorkerModel
}

export class TraceGraphError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TraceGraphError'
    this.code = code
  }
}

function isQuery(x: unknown): x is GraphQuery {
  if (typeof x !== 'object' || x === null) return false
  const q = x as Partial<GraphQuery>
  const m = q.model as Partial<WorkerModel> | undefined
  return q.op === 'graph' && typeof m === 'object' && m !== null && Number.isInteger(m.init) && Number.isInteger(m.amount) && Number.isInteger(m.workers) && (m.steps === 2 || m.steps === 3)
}

export function graphBound(m: WorkerModel): string {
  return `the complete state graph of DoubleSpend at Init = ${m.init}, Amount = ${m.amount}, ${m.workers} workers`
}

export function decideGraph(q: GraphQuery, maxStates: number): InstrumentReply<Graph> {
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: TRACE_GRAPH, version: TRACE_GRAPH_VERSION, build: `${TRACE_GRAPH}@${TRACE_GRAPH_VERSION}`, budget }
  const bound = graphBound(q.model)
  const g = explore(q.model, maxStates)
  if (g === null) return { verdict: { kind: 'unknown', reason: `the graph holds more than ${maxStates} states` }, stats: { ms: 0, bound }, provenance }
  return { verdict: { kind: 'no-error', complete: true }, witness: g, stats: { ms: 0, distinct: g.distinct, generated: g.generated, depth: g.depth, bound }, provenance }
}

export const traceGraphPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== TRACE_GRAPH) throw new TraceGraphError('unknown-engine', `the trace graph runs ${TRACE_GRAPH}, not ${req.engine}`)
    if (req.version !== TRACE_GRAPH_VERSION) throw new TraceGraphError('version-mismatch', `the trace graph is version ${TRACE_GRAPH_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new TraceGraphError('invalid-input', 'not a trace-graph query')
    return decideGraph(req.input, req.budget.maxStates ?? TRACE_GRAPH_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
