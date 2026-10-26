// GEN-lasso-or-not's checker in the tab: the lasso check, the validator of model.ts behind an engine port. Two
// questions: `validate` (is this lasso a fair behavior of the spec that violates EventuallyResolves?) and `none` (does
// any such lasso exist? `unsat` when none does, `sat` with one as the witness otherwise).
//
// ASSESSMENT.md section 4.9 names INS-lasso over TLC's graph, with its lasso@1 input, as this family's engine. It runs
// on the instrument origin and is not wired to generated items yet, so this build checks over the spec's finite graph
// itself, in this page, and every grade says so [D]. Its verdicts agree with TLC's on the six recorded fairness lines
// of the Hold spec [X RUN-tlc-hold-lasso, RUN-tlc-hold-fairness] (the family's tests). It reads no clock.
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { findLasso, holdGraph, judgeLasso } from './model.ts'
import type { Fairness, HoldModel, Lasso, LassoJudgment } from './model.ts'

export const LASSO_CHECK = 'lasso-check'
export const LASSO_CHECK_VERSION = '1'

export type LassoQuery =
  | { readonly op: 'validate'; readonly model: HoldModel; readonly fairness: readonly Fairness[]; readonly lasso: Lasso }
  | { readonly op: 'none'; readonly model: HoldModel; readonly fairness: readonly Fairness[] }

export class LassoCheckError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'LassoCheckError'
    this.code = code
  }
}

function isQuery(x: unknown): x is LassoQuery {
  if (typeof x !== 'object' || x === null) return false
  const q = x as { op?: unknown; model?: Partial<HoldModel>; fairness?: unknown; lasso?: Partial<Lasso> }
  const modelOk = typeof q.model === 'object' && q.model !== null && (q.model.modulus === 1 || q.model.modulus === 2) && typeof q.model.widened === 'boolean'
  if (!modelOk || !Array.isArray(q.fairness)) return false
  if (q.op === 'none') return true
  return q.op === 'validate' && typeof q.lasso === 'object' && q.lasso !== null && Array.isArray(q.lasso.stem) && Array.isArray(q.lasso.cycle)
}

export function lassoBound(m: HoldModel): string {
  return `the complete state graph of Hold (${holdGraph(m).distinct} states, tries modulo ${m.modulus}${m.widened ? ', Timeout from held or pending' : ''}), stuttering allowed in every state`
}

export function decideLasso(q: LassoQuery): InstrumentReply<LassoJudgment | Lasso> {
  const budget = { wallMs: 0 }
  const provenance = { engine: LASSO_CHECK, version: LASSO_CHECK_VERSION, build: `${LASSO_CHECK}@${LASSO_CHECK_VERSION}`, budget }
  const g = holdGraph(q.model)
  const stats = { ms: 0, distinct: g.distinct, generated: g.generated, bound: lassoBound(q.model) }
  if (q.op === 'validate') {
    const j = judgeLasso(q.model, q.fairness, q.lasso)
    return { verdict: { kind: j.ok ? 'sat' : 'unsat' }, witness: j, stats, provenance }
  }
  const l = findLasso(q.model, q.fairness)
  return l === null ? { verdict: { kind: 'unsat' }, stats, provenance } : { verdict: { kind: 'sat' }, witness: l, stats, provenance }
}

export const lassoCheckPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== LASSO_CHECK) throw new LassoCheckError('unknown-engine', `the lasso check runs ${LASSO_CHECK}, not ${req.engine}`)
    if (req.version !== LASSO_CHECK_VERSION) throw new LassoCheckError('version-mismatch', `the lasso check is version ${LASSO_CHECK_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new LassoCheckError('invalid-input', 'not a lasso-check query')
    return decideLasso(req.input) as unknown as InstrumentReply<W>
  },
}
