// GEN-negate-it's checker in the tab: the negate box. It decides a formula by trying every state of a small box, each
// integer variable over its printed range and each flag false then true, in lexicographic order, and returns the first
// satisfying state as its witness. Its verdicts are exact inside the box and say nothing outside it, so each carries
// the box as its bound (I10), and every grade prints it. A box larger than the request's state budget comes back
// `unknown`, which discards the seed.
//
// ASSESSMENT.md section 4.3 names Z3 over QF_LIA as this family's engine; Z3 runs on the instrument origin and is not
// wired to generated items yet, so this build keys and grades with the box instead and says so in every grade [D].
// It runs as plain code behind the same EnginePort a bus engine uses, and it reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { evaluate } from './formula.ts'
import type { Formula, State } from './formula.ts'

export const NEGATE_BOX = 'negate-box'
export const NEGATE_BOX_VERSION = '1'
/** The state budget the family asks for [D]: its largest box (t2, band 3) holds 40,960 states. */
export const NEGATE_BOX_MAX_STATES = 60000

/** One variable's range: an integer from lo to hi, or a flag (false, then true). */
export type Domain = { readonly v: string; readonly kind: 'int'; readonly lo: number; readonly hi: number } | { readonly v: string; readonly kind: 'flag' }

export interface BoxQuery {
  readonly op: 'sat'
  readonly formula: Formula
  readonly domains: readonly Domain[]
}

const show = (v: string): string => v.replace(/'/g, '′')
const minus = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`)

/** The bound a box verdict rests on, as the feedback prints it. */
export function boxBound(domains: readonly Domain[]): string {
  const groups: { range: string; vars: string[] }[] = []
  for (const d of domains) {
    const range = d.kind === 'flag' ? 'false or true' : `${minus(d.lo)} to ${minus(d.hi)}`
    const g = groups.find((x) => x.range === range)
    if (g === undefined) groups.push({ range, vars: [show(d.v)] })
    else g.vars.push(show(d.v))
  }
  return `every state with ${groups.map((g) => (g.range === 'false or true' ? `${g.vars.join(', ')} true or false` : `${g.vars.join(', ')} from ${g.range}`)).join('; ')}`
}

/** The number of states in a box, by repeated multiplication. */
export function boxSize(domains: readonly Domain[]): number {
  let n = 1
  for (const d of domains) n *= d.kind === 'flag' ? 2 : d.hi - d.lo + 1
  return n
}

function isBoxQuery(input: unknown): input is BoxQuery {
  if (typeof input !== 'object' || input === null) return false
  const q = input as Partial<BoxQuery>
  return (
    q.op === 'sat' &&
    typeof q.formula === 'object' &&
    Array.isArray(q.domains) &&
    q.domains.every((d) => typeof d === 'object' && d !== null && typeof d.v === 'string' && (d.kind === 'flag' || (d.kind === 'int' && Number.isInteger(d.lo) && Number.isInteger(d.hi) && d.lo <= d.hi)))
  )
}

/** Error with a bus error code, as the instrument bus rejects a request. */
export class NegateBoxError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'NegateBoxError'
    this.code = code
  }
}

const low = (d: Domain): number => (d.kind === 'flag' ? 0 : d.lo)
const high = (d: Domain): number => (d.kind === 'flag' ? 1 : d.hi)

/** Decide one query: sat with the first witness in lexicographic order, unsat, or unknown past the budget. */
export function decide(q: BoxQuery, maxStates: number): InstrumentReply<State> {
  const states = boxSize(q.domains)
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: NEGATE_BOX, version: NEGATE_BOX_VERSION, build: `${NEGATE_BOX}@${NEGATE_BOX_VERSION}`, budget }
  const bound = boxBound(q.domains)
  if (states > maxStates) {
    return { verdict: { kind: 'unknown', reason: `the box holds ${states} states, over the budget of ${maxStates}` }, stats: { ms: 0, n: 0, bound }, provenance }
  }
  const values = q.domains.map(low)
  for (let n = 1; n <= states; n++) {
    const s: Record<string, number | boolean> = {}
    q.domains.forEach((d, i) => {
      s[d.v] = d.kind === 'flag' ? values[i] === 1 : (values[i] as number)
    })
    if (evaluate(q.formula, s)) return { verdict: { kind: 'sat' }, witness: s, stats: { ms: 0, n, bound }, provenance }
    // The next state: count up, the last variable fastest.
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

/** The negate box as a port: it answers negate-box requests and refuses every other engine. */
export const negateBoxPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== NEGATE_BOX) throw new NegateBoxError('unknown-engine', `the negate box runs ${NEGATE_BOX}, not ${req.engine}`)
    if (req.version !== NEGATE_BOX_VERSION) throw new NegateBoxError('version-mismatch', `the negate box is version ${NEGATE_BOX_VERSION}, not ${req.version}`)
    if (!isBoxQuery(req.input)) throw new NegateBoxError('invalid-input', 'not a negate-box query')
    return decide(req.input, req.budget.maxStates ?? NEGATE_BOX_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
