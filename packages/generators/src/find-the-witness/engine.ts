// GEN-find-the-witness's checker in the tab: the witness pocket. It never compares a witness with a stored one; it
// evaluates each candidate the item offers (ASSESSMENT.md section 4.6):
//
//   model    ground evaluation of the guard, the step and the property on the candidate's values, at the model's
//            width; with `minimize`, the smallest amount any witness can have, found by trying amounts upward with
//            the extreme balances (exact for these guarded transfers, whose guard bounds the amount from below by 1
//            and from above by the sender's balance [D]). The course defines minimality by a Z3 Optimize objective
//            (recorded run RUN-z3-optimize-min); Z3 is not run here.
//   trace    replay from the initial state: every step must be enabled, and the last state must break NoOverspend.
//   history  the serial-order search over every order of the committed transactions (history.ts).
//   pair     the paired-state evaluator: the two states agree on every field the observer may see, and the observer's
//            view of them differs; "none" is checked by trying every pair of the printed domains.
//
// Every question is exact on its finite model. It reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { explainingOrders, replayOrder } from './history.ts'
import type { History } from './history.ts'
import { evaluateModel, maxOf } from './model.ts'
import type { Assignment, Evaluation, Model } from './model.ts'
import { replay, violates } from './workers.ts'
import type { Action, WorkerSpec } from './workers.ts'

export const WITNESS_POCKET = 'witness-pocket'
export const WITNESS_POCKET_VERSION = '1'

/** The observer of t4: which fields it may see, and the response it gets. */
export interface Observer {
  /** The fields the observer may know (its own data), in order; the rest are secret. */
  readonly publics: readonly string[]
  readonly secret: string
  /** The response body echoes these public fields. */
  readonly body: readonly string[]
  /** The status is 200 when secret (+ the named public field, at band 3) is at least the threshold, else 404. */
  readonly threshold: number
  readonly via?: string
  /** Every field ranges over 0 to domain − 1. */
  readonly domain: number
}

export type PairState = Readonly<Record<string, number>>

export type PocketQuery =
  | { readonly op: 'model'; readonly model: Model; readonly states: Readonly<Record<string, Assignment>>; readonly minimize?: string }
  | { readonly op: 'trace'; readonly spec: WorkerSpec; readonly traces: Readonly<Record<string, readonly Action[]>> }
  | { readonly op: 'history'; readonly history: History; readonly orders: Readonly<Record<string, readonly string[] | 'none'>> }
  | { readonly op: 'pair'; readonly observer: Observer; readonly pairs: Readonly<Record<string, readonly [PairState, PairState] | 'none'>> }

/** Each candidate's verdict: whether it is a witness, and what the checker saw. */
export interface Judged {
  readonly witness: boolean
  readonly saw: string
}

export interface PocketAnswer {
  readonly judged: Readonly<Record<string, Judged>>
  /** model with minimize: the smallest amount; history: how many orders explain; pair: whether any pair leaks. */
  readonly extra?: Readonly<Record<string, string | number | boolean>>
}

/** What the observer sees of a state: the body it echoes and the status. */
export function observe(o: Observer, s: PairState): { readonly body: string; readonly status: number } {
  const signal = (s[o.secret] as number) + (o.via === undefined ? 0 : (s[o.via] as number))
  return { body: o.body.map((f) => `${f}=${s[f]}`).join('&'), status: signal >= o.threshold ? 200 : 404 }
}

/** Whether a pair is a leak witness: equal on every public field, told apart by the observer. */
export function leaks(o: Observer, a: PairState, b: PairState): { readonly lowEquivalent: boolean; readonly differ: boolean } {
  const lowEquivalent = o.publics.every((f) => a[f] === b[f])
  const x = observe(o, a)
  const y = observe(o, b)
  return { lowEquivalent, differ: x.body !== y.body || x.status !== y.status }
}

/** Whether any pair of states of the domains leaks: two secrets on either side of the threshold for some public values. */
export function anyLeak(o: Observer): boolean {
  const fields = [...o.publics, o.secret]
  const states: PairState[] = []
  const values = fields.map(() => 0)
  let more = true
  while (more) {
    const s: Record<string, number> = {}
    fields.forEach((f, i) => {
      s[f] = values[i] as number
    })
    states.push(s)
    more = false
    for (let i = values.length - 1; i >= 0; i--) {
      if ((values[i] as number) < o.domain - 1) {
        values[i] = (values[i] as number) + 1
        more = true
        break
      }
      values[i] = 0
    }
  }
  for (const a of states) for (const b of states) if (a !== b && leaks(o, a, b).lowEquivalent && leaks(o, a, b).differ) return true
  return false
}

const describe = (e: Evaluation): string =>
  !e.inRange ? 'a value outside the width' : !e.guard ? 'the guard is false, so the step never runs' : e.violates ? 'the guard holds and the property breaks after the step' : 'the guard holds and the property still holds after the step'

/**
 * The smallest amount of any witness: amounts 1 upward, each tried with every other variable at an extreme of the
 * width (its largest value, the amount itself, the largest value less the amount plus one, and 0). Null past `limit`.
 */
export function minimalAmount(m: Model, amount: string, limit = 64): bigint | null {
  const max = maxOf(m.width === 0 ? 64 : m.width)
  const others = m.vars.filter((v) => v !== amount)
  for (let x = 1n; x <= BigInt(limit); x++) {
    const extremes = [max, x, max - x + 1n, 0n]
    const choice = others.map(() => 0)
    for (;;) {
      const s: Record<string, string> = { [amount]: String(x) }
      others.forEach((v, i) => {
        s[v] = String(extremes[choice[i] as number])
      })
      const e = evaluateModel(m, s)
      if (e.inRange && e.guard && e.violates) return x
      let i = choice.length - 1
      while (i >= 0 && (choice[i] as number) === extremes.length - 1) {
        choice[i] = 0
        i--
      }
      if (i < 0) break
      choice[i] = (choice[i] as number) + 1
    }
  }
  return null
}

class PocketError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'PocketError'
    this.code = code
  }
}

const isQuery = (x: unknown): x is PocketQuery => typeof x === 'object' && x !== null && ['model', 'trace', 'history', 'pair'].includes(String((x as { op?: unknown }).op))

export function answer(q: PocketQuery): PocketAnswer {
  const judged: Record<string, Judged> = {}
  switch (q.op) {
    case 'model': {
      const min = q.minimize === undefined ? null : minimalAmount(q.model, q.minimize)
      for (const [id, s] of Object.entries(q.states)) {
        const e = evaluateModel(q.model, s)
        const isMin = q.minimize === undefined || (min !== null && s[q.minimize] === String(min))
        const ok = e.inRange && e.guard && e.violates && isMin
        judged[id] = { witness: ok, saw: e.guard && e.violates && !isMin ? `a witness, but its amount is not the smallest (${String(min)})` : describe(e) }
      }
      return { judged, ...(min === null ? {} : { extra: { minimum: String(min) } }) }
    }
    case 'trace': {
      for (const [id, t] of Object.entries(q.traces)) {
        const r = replay(q.spec, t)
        if (!r.ok) judged[id] = { witness: false, saw: `step ${r.at + 1} is not enabled there` }
        else {
          const last = r.states[r.states.length - 1]
          const bad = last !== undefined && violates(last)
          judged[id] = { witness: bad, saw: bad ? `every step is enabled and the balance ends at ${last?.bal}` : `every step is enabled, but the balance ends at ${last?.bal}, not below 0` }
        }
      }
      return { judged }
    }
    case 'history': {
      const n = explainingOrders(q.history).length
      for (const [id, o] of Object.entries(q.orders)) {
        if (o === 'none') judged[id] = { witness: n === 0, saw: n === 0 ? 'no serial order reproduces every read' : `${n} serial order(s) reproduce every read` }
        else {
          const miss = replayOrder(q.history, o)
          judged[id] = { witness: miss === null, saw: miss === null ? 'this order reproduces every read' : `in this order ${miss.txn} would read ${miss.key} = ${miss.would}, but it read ${miss.read}` }
        }
      }
      return { judged, extra: { orders: n } }
    }
    case 'pair': {
      const any = anyLeak(q.observer)
      for (const [id, p] of Object.entries(q.pairs)) {
        if (p === 'none') judged[id] = { witness: !any, saw: any ? 'some pair agrees on the public fields and gets different responses' : 'no pair leaks' }
        else {
          const l = leaks(q.observer, p[0], p[1])
          judged[id] = {
            witness: l.lowEquivalent && l.differ,
            saw: !l.lowEquivalent ? 'the two states differ in a field the observer already knows' : l.differ ? 'they agree on every public field and the responses differ' : 'the observer gets the same response for both',
          }
        }
      }
      return { judged, extra: { leak: any } }
    }
  }
}

export const witnessPocketPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== WITNESS_POCKET) throw new PocketError('unknown-engine', `the witness pocket runs ${WITNESS_POCKET}, not ${req.engine}`)
    if (req.version !== WITNESS_POCKET_VERSION) throw new PocketError('version-mismatch', `the witness pocket is version ${WITNESS_POCKET_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new PocketError('invalid-input', 'not a witness-pocket query')
    const a = answer(req.input)
    return {
      verdict: { kind: 'checks', results: [a] },
      stats: { ms: 0, n: Object.keys(a.judged).length },
      provenance: { engine: WITNESS_POCKET, version: WITNESS_POCKET_VERSION, build: `${WITNESS_POCKET}@${WITNESS_POCKET_VERSION}`, budget: req.budget },
    }
  },
}
