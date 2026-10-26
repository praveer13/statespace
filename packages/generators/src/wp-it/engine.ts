// GEN-wp-it's checker in the tab: the wp box. It runs over every state of a small box (each integer variable over its
// printed range, each flag false then true, in lexicographic order) and answers two questions:
//
//   wp      is there a state where the formula disagrees with the interpreter? The command is run from the state
//           (formula.ts, run): the state is in the weakest precondition when the run ends where the postcondition
//           holds, or an `assume` blocks it. sat returns the first such state; unsat means the formula is the weakest
//           precondition on every state of the box.
//   differ  is there a state where two formulas disagree? sat returns the first one.
//
// ASSESSMENT.md section 4.5 names Z3 equivalence over QF_LIA as this family's engine. Z3 runs on the instrument origin
// and is not wired to generated items yet, so this build keys and grades with the box and says so in every grade [D]:
// its verdicts are exact inside the box and say nothing outside it, so each carries the box as its bound (I10). A box
// larger than the request's state budget comes back `unknown`. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { evaluate, inWp } from './formula.ts'
import type { Cmd, Formula, State } from './formula.ts'

export const WP_BOX = 'wp-box'
export const WP_BOX_VERSION = '1'
/** The state budget the family asks for [D]: its largest box (t1, band 3, three accounts) holds 768 states. */
export const WP_BOX_MAX_STATES = 40000

export type Domain = { readonly v: string; readonly kind: 'int'; readonly lo: number; readonly hi: number } | { readonly v: string; readonly kind: 'flag' }

export type WpQuery =
  | { readonly op: 'wp'; readonly cmd: Cmd; readonly post: Formula; readonly formula: Formula; readonly domains: readonly Domain[] }
  | { readonly op: 'differ'; readonly a: Formula; readonly b: Formula; readonly domains: readonly Domain[] }

const minus = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`)

/** The bound a box verdict rests on, as the feedback prints it. */
export function boxBound(domains: readonly Domain[]): string {
  const groups: { range: string; vars: string[] }[] = []
  for (const d of domains) {
    const range = d.kind === 'flag' ? 'flag' : `${minus(d.lo)} to ${minus(d.hi)}`
    const g = groups.find((x) => x.range === range)
    if (g === undefined) groups.push({ range, vars: [d.v] })
    else g.vars.push(d.v)
  }
  return `every state with ${groups.map((g) => (g.range === 'flag' ? `${g.vars.join(', ')} true or false` : `${g.vars.join(', ')} from ${g.range}`)).join('; ')}`
}

export function boxSize(domains: readonly Domain[]): number {
  let n = 1
  for (const d of domains) n *= d.kind === 'flag' ? 2 : d.hi - d.lo + 1
  return n
}

function isQuery(input: unknown): input is WpQuery {
  if (typeof input !== 'object' || input === null) return false
  const q = input as Partial<Record<string, unknown>>
  if (!Array.isArray(q.domains)) return false
  if (q.op === 'wp') return typeof q.cmd === 'object' && typeof q.post === 'object' && typeof q.formula === 'object'
  if (q.op === 'differ') return typeof q.a === 'object' && typeof q.b === 'object'
  return false
}

export class WpBoxError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'WpBoxError'
    this.code = code
  }
}

const low = (d: Domain): number => (d.kind === 'flag' ? 0 : d.lo)
const high = (d: Domain): number => (d.kind === 'flag' ? 1 : d.hi)

/** Decide one query: sat with the first state that answers it, unsat, or unknown past the budget. */
export function decide(q: WpQuery, maxStates: number): InstrumentReply<State> {
  const states = boxSize(q.domains)
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: WP_BOX, version: WP_BOX_VERSION, build: `${WP_BOX}@${WP_BOX_VERSION}`, budget }
  const bound = boxBound(q.domains)
  if (states > maxStates) return { verdict: { kind: 'unknown', reason: `the box holds ${states} states, over the budget of ${maxStates}` }, stats: { ms: 0, n: 0, bound }, provenance }
  const hit = (s: State): boolean => (q.op === 'wp' ? evaluate(q.formula, s) !== inWp(q.cmd, q.post, s) : evaluate(q.a, s) !== evaluate(q.b, s))
  const values = q.domains.map(low)
  for (let n = 1; n <= states; n++) {
    const s: Record<string, number | boolean> = {}
    q.domains.forEach((d, i) => {
      s[d.v] = d.kind === 'flag' ? values[i] === 1 : (values[i] as number)
    })
    if (hit(s)) return { verdict: { kind: 'sat' }, witness: s, stats: { ms: 0, n, bound }, provenance }
    for (let i = values.length - 1; i >= 0; i--) {
      const d = q.domains[i] as Domain
      if ((values[i] as number) < high(d)) {
        values[i] = (values[i] as number) + 1
        break
      }
      values[i] = low(d)
    }
  }
  return { verdict: { kind: 'unsat' }, stats: { ms: 0, n: states, bound }, provenance }
}

/** The wp box as a port: it answers wp-box requests and refuses every other engine. */
export const wpBoxPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== WP_BOX) throw new WpBoxError('unknown-engine', `the wp box runs ${WP_BOX}, not ${req.engine}`)
    if (req.version !== WP_BOX_VERSION) throw new WpBoxError('version-mismatch', `the wp box is version ${WP_BOX_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new WpBoxError('invalid-input', 'not a wp-box query')
    return decide(req.input, req.budget.maxStates ?? WP_BOX_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
