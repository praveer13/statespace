// GEN-find-the-witness (ASSESSMENT.md section 4.6): find the witness. Four templates, structurally different: t1 a
// model (the values of a guarded transfer that breaks its property, over integers or bit-vectors, the smallest one at
// band 3); t2 a trace of a workers system that ends below zero; t3 the serial order that explains a concurrent
// history, or "no serial order"; t4 a pair of states an observer tells apart although they agree on everything it may
// know.
//
// This build serves pick mode: the learner chooses the witness among candidates, each candidate but one failing for
// one cataloged misconception. There is no stored key: key() hands every candidate to the witness pocket (engine.ts),
// which evaluates it on the instance's model, and the one candidate it accepts is the key. The witness's class (M-class-
// hint) and write mode, where the learner types the witness, wait for a page that shows those parts.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { WITNESS_POCKET, WITNESS_POCKET_VERSION, witnessPocketPort } from './engine.ts'
import type { Observer, PairState, PocketAnswer, PocketQuery } from './engine.ts'
import { explainingOrders, opText, orderText, permutations, replayOrder, simulate } from './history.ts'
import type { History, Plan } from './history.ts'
import { add, at, k, maxOf, renderAssignment, renderAtom, sub, vr } from './model.ts'
import type { Assignment, Model } from './model.ts'
import { actionText, explore, specText, stepNames } from './workers.ts'
import type { Action, WorkerSpec } from './workers.ts'

export { anyLeak, answer, leaks, minimalAmount, observe, WITNESS_POCKET, WITNESS_POCKET_VERSION, witnessPocketPort } from './engine.ts'
export { evaluateModel, maxOf, wrap } from './model.ts'
export { explainingOrders, replayOrder, simulate } from './history.ts'

export const FIND_THE_WITNESS_ID = 'GEN-find-the-witness' as const
const PART = 'main'

const BASIS: Readonly<Record<'t1' | 't2' | 't3' | 't4', string>> = {
  t1: 'the witness pocket in this page: ground evaluation of the guard, the step and the property on each candidate, at the model’s width; Z3 is not run for this item',
  t2: 'the witness pocket in this page: each candidate trace replayed step by step from the initial state, in place of the TLC state graph',
  t3: 'the witness pocket in this page: every serial order replayed against the values the history read',
  t4: 'the witness pocket in this page: each pair checked for agreement on the public fields and for a different response, every pair of the domains tried for "none"',
}

/** A candidate witness, by kind. */
export type Candidate =
  | { readonly state: Assignment }
  | { readonly trace: readonly Action[] }
  | { readonly order: readonly string[] }
  | { readonly pair: readonly [PairState, PairState] }
  | { readonly none: true }

export interface FindTheWitnessData {
  readonly model?: Model
  /** t1 band 3: the variable whose value must be the smallest any witness has. */
  readonly minimize?: string
  readonly system?: WorkerSpec
  readonly history?: History
  readonly observer?: Observer
  /** Each option's candidate, by option id. */
  readonly values: Readonly<Record<string, Candidate>>
}

export interface FindTheWitnessInstance extends InstanceBase {
  readonly data: FindTheWitnessData
}

export interface FindTheWitnessKey extends KeyBase {
  /** What the pocket saw for each option, by option id. */
  readonly judged: PocketAnswer['judged']
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'model',
    kcs: { primary: 'KC-1.violation-as-sat', secondary: ['KC-1.encoding-is-the-claim', 'KC-1.witness-class'] },
    bands: { 1: { atoms: [2, 2], width: [0, 0], minimal: [0, 0] }, 2: { atoms: [3, 3], width: [16, 32], minimal: [0, 0] }, 3: { atoms: [4, 4], width: [64, 64], minimal: [1, 1] } },
  },
  {
    id: 't2',
    name: 'trace',
    kcs: { primary: 'KC-5.interleaving-granularity', secondary: ['KC-1.violation-as-sat'] },
    bands: { 1: { processes: [2, 2], actions: [2, 4] }, 2: { processes: [2, 2], actions: [5, 6] }, 3: { processes: [3, 3], actions: [7, 10] } },
  },
  {
    id: 't3',
    name: 'history',
    kcs: { primary: 'KC-6.abstract-serializability', secondary: ['KC-6.anomaly-isolation'] },
    bands: { 1: { transactions: [2, 2] }, 2: { transactions: [3, 3] }, 3: { transactions: [4, 4] } },
  },
  {
    id: 't4',
    name: 'state pair',
    kcs: { primary: 'KC-7.side-channels', secondary: ['KC-7.observer-equivalence'] },
    bands: { 1: { fields: [2, 2], domain: [2, 2] }, 2: { fields: [3, 4], domain: [3, 3] }, 3: { fields: [5, 5], domain: [4, 4] } },
  },
]

// ---------------------------------------------------------------- shared

interface Built {
  readonly stem: string
  readonly ask: string
  readonly reference: Candidate
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<Candidate>[]
  readonly distractors: number
  readonly render: (c: Candidate) => string
  readonly data: Omit<FindTheWitnessData, 'values'>
  readonly bound: string
}

const fixed = (tag: MisconceptionKey, operator: string, why: string, value: Candidate): Mutant<Candidate> => ({ tag, operator, why: () => why, apply: () => value })

const big = (x: bigint | number): string => String(x)

// ---------------------------------------------------------------- t1: model

function t1(band: Band, draw: SeededDraw): Built {
  if (band === 1) {
    const kk = draw.int(1, 2)
    const model: Model = { width: 0, vars: ['a', 'x'], guard: [at(vr('x'), '<=', add(vr('a'), k(kk)))], step: { "a'": sub(vr('a'), vr('x')) }, property: at(vr("a'"), '>=', k(0)) }
    const a = draw.int(0, 6)
    const s = (aa: number, x: number): Candidate => ({ state: { a: big(aa), x: big(x) } })
    const render = (c: Candidate): string => ('state' in c ? renderAssignment(model.vars, c.state) : '?')
    return {
      stem: `A withdrawal over unbounded integers: \`a\` is the balance and \`x\` the amount. Guard: \`${renderAtom(model.guard[0] as never)}\`. The step sets \`a′ = a − x\`. Property after the step: \`a′ ≥ 0\`.`,
      ask: 'Which state is a witness: one the guard lets through, after which the property is broken?',
      reference: s(a, a + draw.int(1, kk)),
      referenceWhy: `The guard holds (the amount is at most ${kk} over the balance), and the balance after the step is below 0: a violation the guard lets through.`,
      mutants: [
        fixed('dp:G4', 'the guard ignored', 'The balance would go below 0, but the guard is false here, so the step never runs: a state the guard refuses is not a violation of the guarded step.', s(a, a + kk + 1 + draw.int(0, 2))),
        fixed('dp:O1', 'the boundary taken for a violation', 'Here the amount equals the balance: the balance after the step is exactly 0, which the property allows. The violation starts one past the boundary.', s(a, a)),
        fixed('dp:Z1', 'a state that keeps the property', 'The guard holds and the balance stays non-negative: a state where the property holds, which shows nothing.', s(a + 2, draw.int(0, a + 1))),
      ],
      distractors: 3,
      render,
      data: { model },
      bound: 'the candidate states shown, evaluated exactly over unbounded integers',
    }
  }
  const width = band === 3 ? 64 : draw.pick([16, 32] as const)
  const max = maxOf(width)
  const guard = band === 3 ? [at(k(0), '<', vr('x')), at(vr('x'), '<=', vr('a')), at(k(0), '<=', vr('b'))] : [at(k(0), '<', vr('x')), at(vr('x'), '<=', vr('a'))]
  const model: Model = { width, vars: ['a', 'b', 'x'], guard, step: { "a'": sub(vr('a'), vr('x')), "b'": add(vr('b'), vr('x')) }, property: at(vr("b'"), '>=', k(0)) }
  const s = (a: bigint, b: bigint, x: bigint): Candidate => ({ state: { a: big(a), b: big(b), x: big(x) } })
  const render = (c: Candidate): string => ('state' in c ? renderAssignment(model.vars, c.state) : '?')
  const stem = `A transfer over signed ${width}-bit balances (largest value ${big(max)}), as a fixed-width field in code stores them: \`a\` is the sender's balance, \`b\` the recipient's, \`x\` the amount. Guard: \`${guard.map(renderAtom).join(' ∧ ')}\`. The step sets \`a′ = a − x\` and \`b′ = b + x\`, wrapping as the hardware does. Property after the step: \`b′ ≥ 0\`.`
  if (band === 2) {
    const r = BigInt(draw.int(0, 50))
    const x = r + 1n + BigInt(draw.int(0, 9))
    const a = x + BigInt(draw.int(0, 99))
    return {
      stem,
      ask: 'Which state is a witness: an allowed transfer after which the recipient’s balance is negative?',
      reference: s(a, max - r, x),
      referenceWhy: `The guard holds, and b + x is past ${big(max)}, so it wraps to a negative number in signed ${width}-bit arithmetic. The guard protects the sender, not the recipient.`,
      mutants: [
        fixed('dp:Z4', 'integers taken for bit-vectors', `b is large, but b + x stays at or below ${big(max)}, so nothing wraps and b′ is non-negative. The violation needs b + x past the largest value.`, s(a, max - x - BigInt(draw.int(0, 50)), x)),
        fixed('dp:G4', 'the guard ignored', 'b + x wraps here, but the amount is more than the sender has, so the guard is false and the step never runs.', s(x - 1n, max, x)),
        fixed('dp:Z1', 'a state that keeps the property', 'The guard holds and b + x is small: the recipient stays non-negative, so the property holds.', s(x, BigInt(draw.int(0, 100)), x)),
      ],
      distractors: 3,
      render,
      data: { model },
      bound: `the candidate states shown, evaluated exactly in signed ${width}-bit arithmetic`,
    }
  }
  const a = BigInt(draw.int(1, 1000))
  const x2 = BigInt(draw.int(2, 9))
  return {
    stem,
    ask: 'Which state is a witness with the smallest amount any witness can have?',
    reference: s(a, max, 1n),
    referenceWhy: `An amount of 1 is the least the guard allows (0 < x), and with b at ${big(max)} it already wraps b + x: no witness has a smaller amount, which is the minimum a Z3 Optimize objective defines (recorded run [X RUN-z3-optimize-min]).`,
    mutants: [
      fixed('dp:Z3', 'a witness taken for the smallest', 'This is a witness, but not a minimal one: an amount of 1 wraps the recipient when b is at its largest. The smallest witness shows the class most plainly.', s(x2 + BigInt(draw.int(0, 100)), max - 1n, x2)),
      fixed('dp:Z4', 'integers taken for bit-vectors', `b + x is exactly ${big(max)}: the largest value, not past it, so nothing wraps and the property holds.`, s(a, max - 1n, 1n)),
      fixed('dp:G4', 'the guard ignored', 'b + x wraps, but the sender has 0, so x ≤ a is false and the step never runs.', s(0n, max, 1n)),
    ],
    distractors: 3,
    render,
    data: { model, minimize: 'x' },
    bound: 'the candidate states shown, evaluated exactly in signed 64-bit arithmetic; the smallest amount found by trying amounts upward with extreme balances',
  }
}

// ---------------------------------------------------------------- t2: trace

function t2(band: Band, draw: SeededDraw): Built {
  const spec: WorkerSpec =
    band === 1 ? { init: 100, amount: draw.pick([60, 70, 80]), workers: 2, steps: 2 } : band === 2 ? { init: 100, amount: draw.pick([60, 70, 80]), workers: 2, steps: 3 } : draw.bool() ? { init: 100, amount: draw.pick([40, 45]), workers: 3, steps: 3 } : { init: 100, amount: 60, workers: 3, steps: 4 }
  const e = explore(spec, 50000)
  const key = e?.shortest
  if (key === null || key === undefined) throw new Error('t2 draws only systems with a violating trace')
  const render = (c: Candidate): string => ('trace' in c ? c.trace.map(actionText).join(', ') : '?')
  // Each worker in turn, all its steps: the sequential run, which never overspends.
  const sequential: Action[] = []
  for (let w = 1; w <= spec.workers; w++) for (const st of stepNames(spec)) sequential.push({ step: st, worker: w })
  const lastCheck = [...key].reverse().find((a) => a.step === 'Check')
  const skipped = lastCheck === undefined ? key.slice(1) : key.filter((a) => a !== lastCheck)
  const names = stepNames(spec).join(', ')
  return {
    stem: `${spec.workers} workers withdraw ${spec.amount} each from a balance that starts at ${spec.init}. A withdrawal takes ${stepNames(spec).length} steps (${names}): ${spec.steps >= 3 ? 'Read copies the balance, Check passes only if the copy covers the amount, ' : 'Check passes only if the balance covers the amount, '}${spec.steps === 4 ? 'Log does nothing, ' : ''}Debit subtracts the amount. A worker whose check fails stops. The property: the balance never goes below 0.`,
    ask: 'Which trace is a witness: every step allowed, ending with the balance below 0?',
    reference: { trace: key },
    referenceWhy: `Every step is allowed where it is taken, and the workers pass their checks before enough debits land: the balance ends below 0 after ${key.length} actions.`,
    mutants: [
      fixed('dp:C1', 'each withdrawal run alone', 'Each worker runs all its steps before the next starts. Every step is allowed, but a later check sees the debited balance and fails: run one at a time, the withdrawals never overspend. The bug needs an interleaving.', { trace: sequential }),
      fixed('dp:T6', 'stopped one action short', 'Every step is allowed, but the trace stops before its last debit: the balance has not gone below 0 yet. A trace of n actions has n + 1 states; the violation is in the last one.', { trace: key.slice(0, -1) }),
      fixed('dp:Z5', 'a step skipped', 'A worker debits without having passed its check: that step is not allowed there, so this is not a behaviour of the system at all.', { trace: skipped }),
    ],
    distractors: 3,
    render,
    data: { system: spec },
    bound: `each candidate replayed from the initial state at ${specText(spec)}`,
  }
}

// ---------------------------------------------------------------- t3: history

const KEYS: Readonly<Record<Band, readonly string[]>> = { 1: ['x', 'y'], 2: ['x', 'y'], 3: ['x', 'y', 'z'] }

/** A schedule of starts and commits for n transactions: each start before its commit, in a seeded interleaving. */
function schedule(n: number, draw: SeededDraw): { starts: number[]; commits: number[] } {
  const starts: number[] = Array.from({ length: n }, () => -1)
  const commits: number[] = Array.from({ length: n }, () => -1)
  for (let t = 0; t < 2 * n; t++) {
    const open = Array.from({ length: n }, (_, i) => i).filter((i) => commits[i] === -1)
    const i = draw.pick(open)
    if (starts[i] === -1) starts[i] = t
    else commits[i] = t
  }
  return { starts, commits }
}

function t3(band: Band, draw: SeededDraw): Built {
  const n = band + 1
  const keys = KEYS[band]
  const distractors = band === 1 ? 2 : 3
  for (let attempt = 0; attempt < 200; attempt++) {
    const plans: Plan[] = Array.from({ length: n }, (_, i) => {
      const reads = draw.sample(keys, draw.int(1, Math.min(2, keys.length)))
      const wk = draw.pick(keys)
      return { id: `T${i + 1}`, reads, writes: [{ key: wk, value: 10 * (i + 1) + draw.int(1, 9) }] }
    })
    const { starts, commits } = schedule(n, draw)
    const h = simulate(keys, 0, plans, starts, commits)
    if (h === null) continue
    const good = explainingOrders(h)
    const listed = h.txns.map((t) => t.id)
    const invalid = permutations(listed).filter((o) => replayOrder(h, o) !== null)
    const need = good.length === 0 ? distractors : distractors - 1
    if (invalid.length < need || (n === 2 && good.length > 1)) continue
    const reference: Candidate = good.length === 0 ? { none: true } : { order: good[0] as string[] }
    const same = (a: readonly string[], b: readonly string[]): boolean => a.join() === b.join()
    const whyOf = (o: readonly string[]): string => {
      const miss = replayOrder(h, o)
      return miss === null ? '' : `Replayed in this order, ${miss.txn} would read ${miss.key} = ${miss.would}, but the history shows it read ${miss.key} = ${miss.read}.`
    }
    const mutants: Mutant<Candidate>[] = []
    if (good.length > 0) mutants.push(fixed('dp:Q4', 'overlap read as an anomaly', `Transactions that overlap in time can still be serializable: ${orderText(good[0] as string[])} reproduces every value read.`, { none: true }))
    // The listed order first, then the commit order, then the other orders that fail.
    const ordered = [listed, h.commitOrder, ...invalid].filter((o, i, all) => replayOrder(h, o) !== null && all.findIndex((x) => same(x, o)) === i)
    for (const o of ordered) {
      if (same(o, listed)) mutants.push(fixed('dp:C1', 'the listed order taken as the serial order', `The order the transactions are listed in is not an order they explain. ${whyOf(o)}`, { order: o }))
      else if (same(o, h.commitOrder)) mutants.push(fixed('dp:Q4', 'commit order taken as the serial order', `Under snapshot isolation a transaction reads the state as of its start, so the commit order need not explain its reads. ${whyOf(o)}`, { order: o }))
      else mutants.push(fixed('dp:C1', 'an order that does not explain the reads', whyOf(o), { order: o }))
    }
    if (mutants.length < distractors) continue
    const lines = h.txns.map((t) => `- ${t.id} ${t.ops.map(opText).join(', ')}, then commits`)
    return {
      stem: [`${n} transactions ran concurrently under snapshot isolation, as simulated by this page: each read the committed state as of its start. Every key starts at 0. They committed in the order ${orderText(h.commitOrder)}.`, '', ...lines].join('\n'),
      ask: 'Which serial order explains every value read, or is there none?',
      reference,
      referenceWhy:
        good.length === 0
          ? 'Every serial order fails to reproduce some value read: each transaction read a state the other had not yet written, which no one-at-a-time order allows. The history is not serializable.'
          : `Run one after another in this order, every transaction reads exactly the values the history shows.`,
      mutants,
      distractors,
      render: (c) => ('none' in c ? 'no serial order' : 'order' in c ? orderText(c.order) : '?'),
      data: { history: h },
      bound: `all ${n === 2 ? 2 : n === 3 ? 6 : 24} serial orders of the ${n} committed transactions`,
    }
  }
  throw new Error('t3 found no history with enough failing orders')
}

// ---------------------------------------------------------------- t4: state pair

const PUBLIC_FIELDS = ['user', 'item', 'region', 'tier'] as const

function t4(band: Band, draw: SeededDraw): Built {
  const fields = band === 1 ? 2 : band === 2 ? draw.int(3, 4) : 5
  const domain = band + 1
  const publics = PUBLIC_FIELDS.slice(0, fields - 1)
  const via = band === 3 ? publics[0] : undefined
  const pv: Record<string, number> = {}
  for (const f of publics) pv[f] = draw.int(0, domain - 1)
  const lift = via === undefined ? 0 : (pv[via] as number)
  const threshold = lift + draw.int(1, domain - 1)
  const observer: Observer = { publics, secret: 's', body: publics, threshold, domain, ...(via === undefined ? {} : { via }) }
  const below = Array.from({ length: domain }, (_, i) => i).filter((x) => x + lift < threshold)
  const above = Array.from({ length: domain }, (_, i) => i).filter((x) => x + lift >= threshold)
  const s1 = draw.pick(below)
  const s2 = draw.pick(above)
  const st = (p: Record<string, number>, s: number): PairState => ({ ...p, s })
  const changed: Record<string, number> = { ...pv, [publics[publics.length - 1] as string]: ((pv[publics[publics.length - 1] as string] as number) + 1) % domain }
  const side = below.length >= 2 ? below : above.length >= 2 ? above : below
  const [q1, q2] = side.length >= 2 ? draw.sample(side, 2) : [side[0] as number, side[0] as number]
  const fieldOrder = [...publics, 's']
  const show = (p: PairState): string => `(${fieldOrder.map((f) => `${f} = ${p[f]}`).join(', ')})`
  const signal = via === undefined ? 's' : `s + ${via}`
  return {
    stem: `An endpoint answers a request with a body that echoes ${publics.map((f) => `\`${f}\``).join(', ')}, and with status 200 when \`${signal} ≥ ${threshold}\`, else 404. The observer is the caller: it knows ${publics.map((f) => `\`${f}\``).join(', ')} and sees the body and the status, but \`s\` (the account's balance band) is secret. Every field is an integer from 0 to ${domain - 1}.`,
    ask: 'Which pair of states is a leak witness: equal on everything the observer knows, yet answered differently?',
    reference: { pair: [st(pv, s1), st(pv, s2)] },
    referenceWhy: `The two states agree on every public field, so the observer should not be able to tell them apart; but ${signal} is below ${threshold} in one and not in the other, so the status differs. The status leaks the secret.`,
    mutants: [
      fixed('dp:A17', 'a pair that differs in public data', `These states differ in \`${publics[publics.length - 1]}\`, which the observer already knows, so the body differs for a reason that leaks nothing. A leak witness agrees on all public data.`, { pair: [st(pv, s1), st(changed, s2)] }),
      fixed('dp:A5', 'a pair the observer cannot tell apart', 'Both secrets fall on the same side of the threshold, so the observer gets the same body and status for both: this pair shows no leak.', { pair: [st(pv, q1 as number), st(pv, q2 as number)] }),
      fixed('dp:A16', 'the observer taken to see only the body', 'The body echoes only public fields, but the observer also sees the status, which depends on the secret: a pair exists.', { none: true }),
    ],
    distractors: 3,
    render: (c) => ('none' in c ? 'none: no pair leaks' : 'pair' in c ? `${show(c.pair[0])} and ${show(c.pair[1])}` : '?'),
    data: { observer },
    bound: `every field from 0 to ${domain - 1}, ${fields} fields`,
  }
}

const BUILDERS: Readonly<Record<'t1' | 't2' | 't3' | 't4', (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3, t4 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): FindTheWitnessInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  if (spec === undefined) throw new RangeError(`${FIND_THE_WITNESS_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${FIND_THE_WITNESS_ID}/${template}/b${band}`))
  const b = BUILDERS[template](band, draw)
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: b.mutants, distractors: b.distractors, draw: draw.fork('options'), render: b.render })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: b.ask, options }
  return { family: FIND_THE_WITNESS_ID, template, band, seed, kcs: spec.kcs, item: { stem: b.stem, parts: [part] }, bound: b.bound, data: { ...b.data, values } }
}

function queryOf(inst: FindTheWitnessInstance): PocketQuery | null {
  const v = inst.data.values
  const pick = <T>(f: (c: Candidate) => T | undefined): Record<string, T> | null => {
    const out: Record<string, T> = {}
    for (const [id, c] of Object.entries(v)) {
      const x = f(c)
      if (x === undefined) return null
      out[id] = x
    }
    return out
  }
  const d = inst.data
  if (d.model !== undefined) {
    const states = pick((c) => ('state' in c ? c.state : undefined))
    return states === null ? null : { op: 'model', model: d.model, states, ...(d.minimize === undefined ? {} : { minimize: d.minimize }) }
  }
  if (d.system !== undefined) {
    const traces = pick((c) => ('trace' in c ? c.trace : undefined))
    return traces === null ? null : { op: 'trace', spec: d.system, traces }
  }
  if (d.history !== undefined) {
    const orders = pick<readonly string[] | 'none'>((c) => ('none' in c ? 'none' : 'order' in c ? c.order : undefined))
    return orders === null ? null : { op: 'history', history: d.history, orders }
  }
  if (d.observer !== undefined) {
    const pairs = pick<readonly [PairState, PairState] | 'none'>((c) => ('none' in c ? 'none' : 'pair' in c ? c.pair : undefined))
    return pairs === null ? null : { op: 'pair', observer: d.observer, pairs }
  }
  return null
}

async function key(inst: FindTheWitnessInstance, port: EnginePort) {
  const input = queryOf(inst)
  if (input === null) return discard('reference-rejected', 'the instance carries no model the pocket can evaluate')
  const r = await ask<PocketQuery, Json>(port, { engine: WITNESS_POCKET, version: WITNESS_POCKET_VERSION, input, budget: { wallMs: 2000 } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the witness pocket could not decide: ${r.reason}`)
  const a = r.reply.verdict.kind === 'checks' ? (r.reply.verdict.results[0] as PocketAnswer | undefined) : undefined
  if (a === undefined) return discard('unknown', 'the witness pocket gave no answer')
  const part = inst.item.parts[0] as ChoicePart
  const accepted = part.options.filter((o) => a.judged[o.id]?.witness === true)
  const idOf = (c: Candidate): string | undefined => Object.entries(inst.data.values).find(([, x]) => x === c)?.[0]
  const confirm = async (ref: Candidate): Promise<ConfirmResult> => {
    const id = idOf(ref)
    if (id === undefined || a.judged[id]?.witness !== true) return { rejected: `the pocket saw ${id === undefined ? 'no option' : (a.judged[id]?.saw ?? 'nothing')}` }
    if (accepted.length > 1) return { rejected: `the pocket accepts ${accepted.length} options: ${accepted.map((o) => o.id).join(', ')}` }
    return { confirmed: true }
  }
  // Candidates differ by what the pocket saw on each: the witness is the evaluation of both.
  const distinguish = async (x: Candidate, y: Candidate): Promise<DistinguishResult> => {
    const ix = idOf(x)
    const iy = idOf(y)
    if (ix === undefined || iy === undefined) return { unknown: 'an option has no candidate', budget: false }
    return { differ: { [ix]: a.judged[ix]?.saw ?? '', [iy]: a.judged[iy]?.saw ?? '' } }
  }
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: FindTheWitnessKey = { engine: engineAtVersion(r.reply), choices: [choice], statements: [], judged: a.judged, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

function measure(inst: FindTheWitnessInstance): Measure {
  const d = inst.data
  switch (inst.template) {
    case 't1':
      return { atoms: (d.model?.guard.length ?? 0) + 1, width: d.model?.width ?? 0, minimal: d.minimize === undefined ? 0 : 1 }
    case 't2': {
      const e = d.system === undefined ? null : explore(d.system, 50000)
      return { processes: d.system?.workers ?? 0, actions: e?.shortest?.length ?? 0 }
    }
    case 't3':
      return { transactions: d.history?.txns.length ?? 0 }
    default:
      return { fields: (d.observer?.publics.length ?? 0) + 1, domain: d.observer?.domain ?? 0 }
  }
}

export const findTheWitnessGenerator: Generator<FindTheWitnessInstance, FindTheWitnessKey> = defineGenerator<FindTheWitnessInstance, FindTheWitnessKey>({
  id: FIND_THE_WITNESS_ID,
  fixture: false,
  title: 'Find the witness: a model, trace, history or state pair',
  templates: TEMPLATES,
  engines: [WITNESS_POCKET],
  misconceptions: ['dp:G4', 'dp:O1', 'dp:Z1', 'dp:Z3', 'dp:Z4', 'dp:Z5', 'dp:C1', 'dp:T6', 'dp:Q4', 'dp:A5', 'dp:A16', 'dp:A17'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: BASIS[inst.template as 't1'], engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  structure: (inst) => {
    const d = inst.data
    if (d.model !== undefined) return `model|${d.model.width === 0 ? 'int' : 'bv'}|${d.model.guard.length}|${d.minimize === undefined ? '' : 'min'}`
    if (d.system !== undefined) return `trace|${d.system.workers}`
    if (d.history !== undefined) return `history|${d.history.txns.length}`
    return `pair|${d.observer?.publics.length ?? 0}`
  },
})

export const generator = findTheWitnessGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [WITNESS_POCKET]: witnessPocketPort }
