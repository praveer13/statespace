// GEN-anomaly-id's checker in the tab: the history check, history.ts behind an engine port. It classifies one recorded
// history: every serial order of its committed transactions replayed through the reference semantics, then the
// dependency cycle's shape, then the recorded SQLSTATEs.
//
// ASSESSMENT.md section 4.10 names INS-history, on the instrument origin, as this family's engine. It is not wired to
// generated items yet, so this build runs the same rules in this page over the recorded history and every grade says
// so [D]. The histories themselves are recorded runs: PostgreSQL 18.6's own output, copied into pool.ts
// [X RUN-pg-catalog]. It reads no clock.
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { classify, MAX_TXNS } from './history.ts'
import type { Classification, History } from './history.ts'

export const HISTORY_CHECK = 'history-check'
export const HISTORY_CHECK_VERSION = '1'

export interface HistoryQuery {
  readonly op: 'classify'
  readonly history: History
}

export class HistoryCheckError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'HistoryCheckError'
    this.code = code
  }
}

const isQuery = (x: unknown): x is HistoryQuery => {
  if (typeof x !== 'object' || x === null) return false
  const q = x as Partial<HistoryQuery>
  return q.op === 'classify' && typeof q.history === 'object' && q.history !== null && Array.isArray(q.history.txns)
}

export function historyBound(h: History): string {
  const n = h.txns.filter((t) => t.outcome === 'commit').length
  return `this recorded run only: every serial order of its ${n} committed transaction${n === 1 ? '' : 's'} replayed (the search stops at ${MAX_TXNS}); other runs of the same programs may differ`
}

export function decideHistory(q: HistoryQuery): InstrumentReply<Classification> {
  const budget = { wallMs: 0, maxTxns: MAX_TXNS }
  const provenance = { engine: HISTORY_CHECK, version: HISTORY_CHECK_VERSION, build: `${HISTORY_CHECK}@${HISTORY_CHECK_VERSION}`, budget }
  const bound = historyBound(q.history)
  const c = classify(q.history)
  if ('unknown' in c) return { verdict: { kind: 'unknown', reason: c.unknown }, stats: { ms: 0, bound }, provenance }
  return { verdict: { kind: 'sat' }, witness: c, stats: { ms: 0, n: c.orders, bound }, provenance }
}

export const historyCheckPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== HISTORY_CHECK) throw new HistoryCheckError('unknown-engine', `the history check runs ${HISTORY_CHECK}, not ${req.engine}`)
    if (req.version !== HISTORY_CHECK_VERSION) throw new HistoryCheckError('version-mismatch', `the history check is version ${HISTORY_CHECK_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new HistoryCheckError('invalid-input', 'not a history-check query')
    return decideHistory(req.input) as unknown as InstrumentReply<W>
  },
}
