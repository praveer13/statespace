// GEN-cti-or-bug's checker in the tab: the CTI box. It answers the CTI workbench's three questions about a small
// transition system (system.ts), as plain code behind the same EnginePort a bus engine uses:
//
//   reach        breadth-first search from Init for a state that breaks the formula, to depth N. A violation comes
//                back `violated` with its shortest run as the witness; a search that visits every reachable state
//                comes back `no-error` (complete); one that stops at N or at the state cap comes back `unknown`.
//   consecution  every state of the box that satisfies the formula, every command and parameter: `sat` with the
//                first counterexample to induction, or `unsat`.
//   implies      every state of the box: `sat` with a state where the first formula holds and the second fails.
//
// ASSESSMENT.md section 4.7 names Z3 over QF_LIA for initiation, consecution and safety. Z3 is not wired to
// generated items yet, so this build answers consecution and implication over a printed box [D]: a CTI it finds is
// a real one, and "no CTI" means none in the box. Reachability is exact whenever the search completes. Every grade
// prints the box and the depth. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { boxSize, consecution, impliesInBox, reach } from './system.ts'
import type { Box, Formula, State, Step, System } from './system.ts'

export const CTI_BOX = 'cti-box'
export const CTI_BOX_VERSION = '1'
/** The state budget the family asks for [D]: its largest box (four variables from −1 to 6) holds 4,096 states. */
export const CTI_BOX_MAX_STATES = 20000

export type CtiQuery =
  | { readonly op: 'reach'; readonly sys: System; readonly inv: Formula; readonly depth: number }
  | { readonly op: 'consecution'; readonly sys: System; readonly inv: Formula; readonly box: Box }
  | { readonly op: 'implies'; readonly sys: System; readonly a: Formula; readonly b: Formula; readonly box: Box }

/** The witness of a `violated` reach: the run and the state it ends in. */
export interface RunWitness {
  readonly trace: readonly Step[]
  readonly state: State
}

/** The witness of a `sat` consecution: the counterexample to induction. */
export interface CtiWitness {
  readonly state: State
  readonly step: Step
}

export class CtiBoxError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'CtiBoxError'
    this.code = code
  }
}

function isQuery(input: unknown): input is CtiQuery {
  if (typeof input !== 'object' || input === null) return false
  const q = input as Partial<Record<string, unknown>>
  if (typeof q.sys !== 'object' || q.sys === null) return false
  if (q.op === 'reach') return typeof q.inv === 'object' && typeof q.depth === 'number'
  if (q.op === 'consecution') return typeof q.inv === 'object' && typeof q.box === 'object'
  if (q.op === 'implies') return typeof q.a === 'object' && typeof q.b === 'object' && typeof q.box === 'object'
  return false
}

export function decide(q: CtiQuery, maxStates: number): InstrumentReply<unknown> {
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: CTI_BOX, version: CTI_BOX_VERSION, build: `${CTI_BOX}@${CTI_BOX_VERSION}`, budget }
  if (q.op === 'reach') {
    const r = reach(q.sys, q.inv, q.depth, maxStates)
    if (r.kind === 'violated') {
      const witness: RunWitness = { trace: r.trace, state: r.state }
      return { verdict: { kind: 'violated', property: 'Inv', length: r.trace.length, unit: 'actions' }, witness, stats: { ms: 0, depth: r.trace.length }, provenance }
    }
    if (r.kind === 'exhausted') return { verdict: { kind: 'no-error', complete: true }, stats: { ms: 0, distinct: r.states }, provenance }
    return { verdict: { kind: 'unknown', reason: `the search stopped at depth ${r.depth} after ${r.states} states with no violation` }, stats: { ms: 0, distinct: r.states, depth: r.depth }, provenance }
  }
  const n = boxSize(q.sys, q.box)
  if (n > maxStates) return { verdict: { kind: 'unknown', reason: `the box holds ${n} states, over the budget of ${maxStates}` }, stats: { ms: 0, n: 0 }, provenance }
  if (q.op === 'consecution') {
    // States with no negative variable first, so the counterexample shown reads like a ledger state when one exists.
    const c = (q.box.lo < 0 ? consecution(q.sys, q.inv, { lo: 0, hi: q.box.hi }) : null) ?? consecution(q.sys, q.inv, q.box)
    if (c === null) return { verdict: { kind: 'unsat' }, stats: { ms: 0, n }, provenance }
    const witness: CtiWitness = c
    return { verdict: { kind: 'sat' }, witness, stats: { ms: 0, n }, provenance }
  }
  return impliesInBox(q.sys, q.a, q.b, q.box) ? { verdict: { kind: 'unsat' }, stats: { ms: 0, n }, provenance } : { verdict: { kind: 'sat' }, stats: { ms: 0, n }, provenance }
}

export const ctiBoxPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== CTI_BOX) throw new CtiBoxError('unknown-engine', `the CTI box runs ${CTI_BOX}, not ${req.engine}`)
    if (req.version !== CTI_BOX_VERSION) throw new CtiBoxError('version-mismatch', `the CTI box is version ${CTI_BOX_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new CtiBoxError('invalid-input', 'not a CTI-box query')
    return decide(req.input, req.budget.maxStates ?? CTI_BOX_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
