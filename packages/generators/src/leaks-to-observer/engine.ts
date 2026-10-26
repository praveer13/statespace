// GEN-leaks-to-observer's checker in the tab: the pair check, model.ts behind an engine port. `judge` checks one pair
// (low-equivalent, and told apart by a channel the observer sees); `none` tries every state of the item's scope and
// answers `unsat` when no pair leaks, `sat` with a witness pair otherwise.
//
// ASSESSMENT.md section 4.11 names INS-pairs, with Z3 self-composition for "none", as this family's engine. Neither
// reaches generated items yet, so this build checks by enumeration over the printed scope, in this page, and every
// grade says so [D]. It reads no clock.
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { findLeak, judgePair, scopeSize } from './model.ts'
import type { Pair, PairJudgment, World } from './model.ts'

export const PAIR_CHECK = 'pair-check'
export const PAIR_CHECK_VERSION = '1'
/** The scope budget the family asks for [D]; its largest world holds 2,304 states. */
export const PAIR_CHECK_MAX_STATES = 20000

export type PairQuery = { readonly op: 'judge'; readonly world: World; readonly pair: Pair } | { readonly op: 'none'; readonly world: World }

export class PairCheckError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PairCheckError'
    this.code = code
  }
}

function isQuery(x: unknown): x is PairQuery {
  if (typeof x !== 'object' || x === null) return false
  const q = x as { op?: unknown; world?: Partial<World>; pair?: Partial<Pair> }
  if (typeof q.world !== 'object' || q.world === null || !Array.isArray(q.world.cells) || !Array.isArray(q.world.channels)) return false
  if (q.op === 'none') return true
  return q.op === 'judge' && typeof q.pair === 'object' && q.pair !== null && typeof q.pair.base === 'object' && typeof q.pair.diff === 'object'
}

export function decidePairs(q: PairQuery, maxStates: number): InstrumentReply<PairJudgment | Pair> {
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: PAIR_CHECK, version: PAIR_CHECK_VERSION, build: `${PAIR_CHECK}@${PAIR_CHECK_VERSION}`, budget }
  const n = scopeSize(q.world)
  const stats = { ms: 0, n, bound: `every state of the printed scope (${n} states)` }
  if (q.op === 'judge') {
    const j = judgePair(q.world, q.pair)
    return { verdict: { kind: j.ok ? 'sat' : 'unsat' }, witness: j, stats, provenance }
  }
  if (n > maxStates) return { verdict: { kind: 'unknown', reason: `the scope holds ${n} states, over the budget of ${maxStates}` }, stats, provenance }
  const leak = findLeak(q.world)
  return leak === null ? { verdict: { kind: 'unsat' }, stats, provenance } : { verdict: { kind: 'sat' }, witness: leak, stats, provenance }
}

export const pairCheckPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== PAIR_CHECK) throw new PairCheckError('unknown-engine', `the pair check runs ${PAIR_CHECK}, not ${req.engine}`)
    if (req.version !== PAIR_CHECK_VERSION) throw new PairCheckError('version-mismatch', `the pair check is version ${PAIR_CHECK_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new PairCheckError('invalid-input', 'not a pair-check query')
    return decidePairs(req.input, req.budget.maxStates ?? PAIR_CHECK_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
