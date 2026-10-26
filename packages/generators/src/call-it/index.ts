// GEN-call-it (ASSESSMENT.md section 4.12): a verdict called before the run, or true/false judgments over about five
// statements. Four templates, structurally different: t1 the three-way verdict a solver gives a query (sat, unsat or
// unknown); t2 the length of the shortest violating trace of a small workers system, as an interval; t3 which anomaly
// a recorded history shows (pending until the recorded histories and their checker land, W4-T20); t4 multiple
// true/false over restatements of a Lean theorem.
//
// Keys are never stored: key() asks the call pocket (engine.ts) at grade time, which decides each question exactly on
// the instance's finite model, and the option the pocket's answer matches is the key. The confidence call itself is
// M-call-it's, on the page; this family supplies the verdict and its key.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice, optionLetters } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type {
  Band,
  ChoicePart,
  Generator,
  InstanceBase,
  Json,
  KeyBase,
  Measure,
  MisconceptionKey,
  TemplateId,
  TemplateSpec,
  TrueFalsePart,
  TrueFalseStatement,
} from '../core/types.ts'
import { CALL_POCKET, CALL_POCKET_MAX_STATES, CALL_POCKET_VERSION, callPocketPort, POW_REASON, predict } from './engine.ts'
import type { Bound, GraphAnswer, PocketQuery, Prediction, ReadingAnswer } from './engine.ts'
import { and, atomsOf, hasPow, minus, n, not, off, pow, rel, render, shapeOf, v } from './logic.ts'
import type { Formula, Term } from './logic.ts'
import { LEDGER_BOX, THEOREMS } from './readings.ts'
import type { Statement } from './readings.ts'
import { explore, specText, stepNames } from './workers.ts'
import type { WorkerSpec } from './workers.ts'

export { CALL_POCKET, CALL_POCKET_VERSION, callPocketPort, POW_REASON, predict } from './engine.ts'
export { INTERPRETATIONS, judge, THEOREMS } from './readings.ts'
export { explore, replay } from './workers.ts'
export type { WorkerSpec } from './workers.ts'

export const CALL_IT_ID = 'GEN-call-it' as const
const PART = 'main'

const BASIS = {
  t1: 'the call pocket in this page: every state inside the bounds the query asserts, so sat and unsat are exact; for a power term with a variable exponent it gives the answer Z3 5.3.1 recorded (RUN-z3-unknown-pow). Z3 itself is not run for this item',
  t2: 'the call pocket in this page: a breadth-first search of the whole state graph at the printed constants, in place of the TLC graph',
  t4: 'the call pocket in this page: each reading compared with the theorem as a closed statement, under the definition and five altered transfers, over a box of ledgers and amounts; Lean and Z3 are not run for this item',
} as const

export type Verdict = 'sat' | 'unsat' | 'unknown'

export interface CallItData {
  /** t1: the query, the bounds it asserts, and the guard the encoding changed from (bands 2 and 3). */
  readonly query?: { readonly formula: Formula; readonly bounds: readonly Bound[]; readonly changedFrom?: Formula }
  /** t2: the workers system and the interval each option names: [lo, hi] in actions (hi null for "or more"), or "none". */
  readonly system?: { readonly spec: WorkerSpec; readonly intervals: Readonly<Record<string, readonly [number, number | null] | 'none'>> }
  /** t4: the theorem's reading and each statement's, by statement id. */
  readonly readings?: { readonly theorem: string; readonly formula: Formula; readonly statements: Readonly<Record<string, Formula>>; readonly swaps: number }
  /** Each choice option's value, by option id. */
  readonly values: Readonly<Record<string, string>>
}

export interface CallItInstance extends InstanceBase {
  readonly data: CallItData
}

export interface CallItKey extends KeyBase {
  /** t1: the pocket's answer, and its witness when sat. */
  readonly prediction?: Prediction
  /** t2: the shortest violating trace and the states explored. */
  readonly graph?: GraphAnswer
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'three-way verdict',
    kcs: { primary: 'KC-1.three-answers', secondary: ['KC-1.unknown-fails-closed', 'KC-1.violation-as-sat'] },
    bands: {
      1: { operators: [1, 2], change: [0, 0], pow: [0, 0] },
      2: { operators: [3, 4], change: [1, 1], pow: [0, 0] },
      3: { operators: [4, 5], change: [1, 1], pow: [0, 1] },
    },
  },
  {
    id: 't2',
    name: 'trace length as an interval',
    kcs: { primary: 'KC-5.interleaving-granularity', secondary: ['KC-5.tlc-flags-matter'] },
    bands: {
      1: { processes: [2, 2], intervals: [3, 3] },
      2: { processes: [2, 2], intervals: [4, 4] },
      3: { processes: [3, 3], intervals: [4, 4] },
    },
  },
  {
    id: 't3',
    name: 'which anomaly',
    kcs: { primary: 'KC-6.anomaly-isolation', secondary: ['KC-6.abstract-serializability'] },
    bands: { 1: { patterns: [2, 2], levels: [1, 1] }, 2: { patterns: [3, 3], levels: [1, 1] }, 3: { patterns: [4, 4], levels: [2, 2] } },
    pending: { engine: 'history', lands: 'W4-T20' },
  },
  {
    id: 't4',
    name: 'multiple true/false',
    kcs: { primary: 'KC-2.theorem-statement-reading', secondary: ['KC-1.only-if-direction'] },
    bands: { 1: { statements: [4, 4], swaps: [0, 1] }, 2: { statements: [5, 5], swaps: [0, 1] }, 3: { statements: [6, 6], swaps: [2, 2] } },
  },
]

const fixed = (tag: MisconceptionKey, operator: string, why: string, value: string): Mutant<string> => ({ tag, operator, why: () => why, apply: () => value })

// ---------------------------------------------------------------- t1: three-way verdict

interface Guarded {
  readonly guard: readonly Formula[]
}

const lin = (terms: readonly [string, number][], k = 0): Term => ({ lin: terms.map(([name, c]) => ({ v: name, c })), k })

const P1: Formula = rel(minus('a', 'x'), '>=', n(0))
const P2: Formula = and(rel(minus('a', 'x'), '>=', n(0)), rel(lin([['b', 1], ['x', 1]]), '<=', n(6)))
const P3: Formula = and(rel(lin([['a', 1], ['x', -1], ['f', -1]]), '>=', n(0)), rel(lin([['b', 1], ['x', 1]]), '<=', n(6)))

const B1: readonly Guarded[] = [
  { guard: [] },
  { guard: [rel(v('x'), '<=', v('a'))] },
  { guard: [rel(v('x'), '<', v('a'))] },
  { guard: [rel(v('x'), '<=', off('a', 1))] },
  { guard: [rel(v('x'), '>=', n(1))] },
  { guard: [rel(v('x'), '<=', off('a', -1))] },
]
const B2: readonly Guarded[] = [
  { guard: [rel(v('x'), '<=', v('a')), rel(lin([['b', 1], ['x', 1]]), '<=', n(6))] },
  { guard: [rel(v('x'), '<=', v('a'))] },
  { guard: [rel(v('x'), '<=', v('b'))] },
  { guard: [rel(v('x'), '<=', v('a')), rel(lin([['b', 1], ['x', 1]]), '<=', n(7))] },
  { guard: [rel(v('x'), '<', v('a')), rel(lin([['b', 1], ['x', 1]]), '<', n(6))] },
]
const B3: readonly Guarded[] = [
  { guard: [rel(lin([['x', 1], ['f', 1]]), '<=', v('a')), rel(lin([['b', 1], ['x', 1]]), '<=', n(6))] },
  { guard: [rel(v('x'), '<=', v('a')), rel(lin([['b', 1], ['x', 1]]), '<=', n(6))] },
  { guard: [rel(lin([['x', 1], ['f', 1]]), '<=', v('a')), rel(lin([['b', 1], ['x', 1]]), '<=', n(6)), rel(v('f'), '<=', n(2))] },
  { guard: [rel(lin([['x', 1], ['f', 1]]), '<=', off('a', 1)), rel(lin([['b', 1], ['x', 1]]), '<=', n(6))] },
  { guard: [rel(lin([['x', 1], ['f', 1]]), '<', v('a')), rel(v('x'), '<=', lin([['b', -1]], 6))] },
]

const bounds = (vars: readonly string[]): Bound[] => vars.map((name) => ({ v: name, lo: 0, hi: 4 }))
const guardText = (g: readonly Formula[]): string => (g.length === 0 ? 'none' : `\`${render(and(...g))}\``)
const query = (g: readonly Formula[], p: Formula): Formula => and(...g, not(p))

const VERDICT_TEXT: Readonly<Record<Verdict, string>> = { sat: 'sat', unsat: 'unsat', unknown: 'unknown' }

function verdictWhy(key: Verdict, option: Verdict): { tag: MisconceptionKey; operator: string; why: string } {
  if (key === 'unknown') {
    return option === 'unsat'
      ? { tag: 'dp:Z2', operator: 'unknown read as no bug', why: `unknown is no answer, and reading it as "no violation" is the error the [?] stamp exists to stop. Z3 5.3.1 answers this query unknown, "${POW_REASON}" (recorded run [X RUN-z3-unknown-pow]).` }
      : { tag: 'dp:Z1', operator: 'truth taken for the answer', why: `The query has a solution on paper (x = 2, y = 3), but with a variable exponent the arithmetic is outside what the solver decides: Z3 5.3.1 answers unknown, "${POW_REASON}" (recorded run [X RUN-z3-unknown-pow]).` }
  }
  if (option === 'unknown') return { tag: 'dp:Z2', operator: 'a decidable query called unknown', why: 'The query is linear over integers inside the bounds it asserts: the solver decides it, sat or unsat. unknown is for theories it cannot decide, a budget, or a timeout.' }
  return key === 'sat'
    ? { tag: 'dp:Z1', operator: 'sat and unsat swapped', why: 'unsat would mean no state inside the bounds passes the guard and breaks the property. The checker found one, so the answer is sat: a violation.' }
    : { tag: 'dp:Z1', operator: 'sat and unsat swapped', why: 'sat would need a state inside the bounds that passes the guard and breaks the property. The guard rules every such state out, so the answer is unsat.' }
}

const MEANING: Readonly<Record<string, string>> = { a: "the sender's balance", b: "the recipient's balance", x: 'the amount', f: 'the fee' }

interface BuiltChoice {
  readonly stem: string
  readonly ask: string
  readonly reference: string
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<string>[]
  readonly distractors: number
  readonly data: Omit<CallItData, 'values'>
  readonly bound?: string
}

function t1(band: Band, draw: SeededDraw): BuiltChoice {
  const usePow = band === 3 && draw.chance(1, 3)
  let formula: Formula
  let qb: Bound[]
  let changedFrom: Formula | undefined
  let stem: string
  if (usePow) {
    formula = and(rel(pow('x', 'y'), '=', n(8)), rel(v('y'), '>', n(1)))
    qb = []
    changedFrom = rel(lin([['x', 1]]), '=', n(2))
    stem = `A query over unbounded integers \`x\` and \`y\`. The encoding replaces a fixed exponent with a variable one: \`x * x * x = 8\` becomes \`${render(formula)}\` (SP-1.7's power query). What will Z3 5.3.1 answer on the new query?`
  } else {
    const [bank, p, vars] = band === 1 ? [B1, P1, ['a', 'x']] : band === 2 ? [B2, P2, ['a', 'b', 'x']] : [B3, P3, ['a', 'b', 'x', 'f']]
    const picks = draw.sample(bank, 2)
    const now = picks[0] as Guarded
    const before = picks[1] as Guarded
    formula = query(now.guard, p)
    qb = bounds(vars as string[])
    if (band > 1) changedFrom = and(...before.guard)
    const glossary = (vars as string[]).map((x) => `\`${x}\` (${MEANING[x] ?? x})`).join(', ')
    const change = band > 1 ? ` The encoding changes: the guard ${guardText(before.guard)} becomes ${guardText(now.guard)}.` : ''
    stem = `A withdrawal step ${now.guard.length === 0 ? 'with no guard' : `with guard ${guardText(now.guard)}`}; the property after it is \`${render(p)}\`. Variables: ${glossary}, each an integer from 0 to 4, bounds the query asserts.${change} The violation query is \`${render(formula)}\`. What will the solver answer?`
  }
  const key = predict(formula, qb).answer
  const others = (['sat', 'unsat', 'unknown'] as const).filter((x) => x !== key)
  const mutants = others.map((o) => {
    const w = verdictWhy(key, o)
    return fixed(w.tag, w.operator, w.why, o)
  })
  const referenceWhy =
    key === 'sat'
      ? 'Some state inside the bounds passes the guard and breaks the property, so the violation query is sat: the checker shows one.'
      : key === 'unsat'
        ? 'No state inside the bounds passes the guard and breaks the property, so the violation query is unsat.'
        : `Z3 5.3.1 answers unknown, "${POW_REASON}", natively and under Pyodide (recorded run [X RUN-z3-unknown-pow]): a variable exponent is outside the arithmetic it decides. On a gate, unknown fails closed.`
  return {
    stem,
    ask: 'Call it before the run: sat, unsat or unknown?',
    reference: key,
    referenceWhy,
    mutants,
    distractors: 2,
    data: { query: { formula, bounds: qb, ...(changedFrom === undefined ? {} : { changedFrom }) } },
    ...(qb.length > 0 ? { bound: `every state with ${qb.map((b) => b.v).join(', ')} from ${qb[0]?.lo} to ${qb[0]?.hi}` } : {}),
  }
}

// ---------------------------------------------------------------- t2: trace length as an interval

const INTERVALS: Readonly<Record<Band, readonly (readonly [number, number | null])[]>> = {
  1: [
    [1, 3],
    [4, 6],
    [7, null],
  ],
  2: [
    [1, 3],
    [4, 5],
    [6, 7],
    [8, null],
  ],
  3: [
    [1, 4],
    [5, 7],
    [8, 10],
    [11, null],
  ],
}

const intervalText = (iv: readonly [number, number | null] | 'none'): string => (iv === 'none' ? 'no violating trace' : iv[1] === null ? `${iv[0]} or more actions` : `${iv[0]}–${iv[1]} actions`)
const inInterval = (len: number, iv: readonly [number, number | null]): boolean => len >= iv[0] && (iv[1] === null || len <= iv[1])

function t2(band: Band, draw: SeededDraw): BuiltChoice {
  const steps = (band === 1 ? draw.pick([1, 2, 3] as const) : band === 2 ? draw.pick([2, 3, 4] as const) : draw.pick([2, 3] as const)) as WorkerSpec['steps']
  const amount = band === 3 ? draw.pick([40, 45, 60]) : draw.pick([60, 70, 80])
  const spec: WorkerSpec = { init: 100, amount, workers: band === 3 ? 3 : 2, steps }
  const ivs = INTERVALS[band]
  const intervals: Record<string, readonly [number, number | null] | 'none'> = { 'no violating trace': 'none' }
  ivs.forEach((iv) => {
    intervals[intervalText(iv)] = iv
  })
  const e = explore(spec, CALL_POCKET_MAX_STATES)
  const len = e?.shortest?.length ?? null
  const keyText = len === null ? 'no violating trace' : intervalText(ivs.find((iv) => inInterval(len, iv)) as readonly [number, number | null])
  const statesText = len === null ? null : intervalText(ivs.find((iv) => inInterval(len + 1, iv)) as readonly [number, number | null])
  const mutants = Object.keys(intervals)
    .filter((t) => t !== keyText)
    .map((t) => {
      if (t === 'no violating trace') return fixed('dp:C1', 'each withdrawal taken to run alone', 'With the withdrawal split into steps, two workers can both pass the check before either debits: an interleaving the atomic picture misses.', t)
      if (len === null) return fixed('dp:C1', 'an atomic step split in the reading', 'Here the check and the debit are one atomic step, so no interleaving lets two workers pass the same check: no reachable state overspends.', t)
      if (t === statesText) return fixed('dp:T6', 'states counted for actions', 'A trace of n actions passes through n + 1 states; trace length is counted in actions.', t)
      const iv = intervals[t] as readonly [number, number | null]
      return iv[0] > len
        ? fixed('dp:T6', 'the trace over-counted', 'The shortest violating trace needs only the workers whose withdrawals overspend, each taking its steps once: count those actions and no more.', t)
        : fixed('dp:C1', 'steps merged in the count', 'Every step is an action of its own: each worker that withdraws takes all of its steps, interleaved, before the balance goes below zero.', t)
    })
  const names = stepNames(spec).join(', ')
  return {
    stem: `${spec.workers} workers withdraw ${spec.amount} each from one shared balance that starts at ${spec.init}. Each withdrawal takes ${steps === 1 ? 'one atomic step' : `${steps} steps`} (${names}): ${steps >= 3 ? 'Read copies the balance, Check passes only if the copy covers the amount, ' : steps === 2 ? 'Check passes only if the balance covers the amount, ' : 'it debits only if the balance covers the amount. '}${steps >= 2 ? `${steps === 4 ? 'Log does nothing, ' : ''}Debit subtracts the amount from the balance.` : ''} Any interleaving of the workers' steps can happen. The property: the balance never goes below 0.`,
    ask: 'Call it before the run: how long is the shortest trace that breaks the property?',
    reference: keyText,
    referenceWhy:
      len === null
        ? 'The check and the debit are one atomic step, so a worker debits only when the balance it checks covers the amount: no reachable state overspends.'
        : `The shortest violating trace is ${len} actions: every worker that must pass the check does so before enough debits land, and each of its ${steps} steps is one action.`,
    mutants,
    distractors: Object.keys(intervals).length - 1,
    data: { system: { spec, intervals } },
    bound: `every state reachable at ${specText(spec)}`,
  }
}

// ---------------------------------------------------------------- t4: multiple true/false

interface BuiltSet {
  readonly stem: string
  readonly part: TrueFalsePart
  readonly readings: NonNullable<CallItData['readings']>
}

function t4(band: Band, draw: SeededDraw): BuiltSet {
  const th = draw.pick(THEOREMS)
  const m = band + 3
  const trues = th.statements.filter((s) => s.meant === true)
  const swaps = th.statements.filter((s) => s.meant !== true && s.swap === true)
  const plain = th.statements.filter((s) => s.meant !== true && s.swap !== true)
  let chosen: Statement[]
  if (band === 3) {
    const t = draw.int(1, Math.min(trues.length, m - 2 - 1))
    chosen = [...draw.sample(trues, t), ...swaps.slice(0, 2), ...draw.sample(plain, m - 2 - t)]
  } else {
    // At most one quantifier swap below band 3; between 1 and m − 1 true statements.
    const falsePool = [...plain, ...draw.sample(swaps, 1)]
    const t = draw.int(1, Math.min(trues.length, m - 1))
    chosen = [...draw.sample(trues, t), ...draw.sample(falsePool, m - t)]
  }
  const ordered = draw.shuffle(chosen)
  const ids = optionLetters(ordered.length).map((_, i) => String(i + 1))
  const statements: TrueFalseStatement[] = ordered.map((s, i) => ({
    id: ids[i] as string,
    text: s.text,
    why: s.why,
    origin: s.meant === true ? { kind: 'reference' } : { kind: 'mutant', tag: s.meant.tag, operator: s.meant.operator },
  }))
  const readingById: Record<string, Formula> = {}
  ordered.forEach((s, i) => {
    readingById[ids[i] as string] = s.reading
  })
  return {
    stem: `The theorem, proved on core Lean 4.35.0 (recorded run [X RUN-lean-ledger]):\n\n\`\`\`lean\n${th.lean}\n\`\`\`\n\n${th.gloss}`,
    part: { kind: 'multi-tf', id: PART, prompt: 'Which sentences say exactly what it proves? Mark each true or false; the set counts only when every mark matches.', statements },
    readings: { theorem: th.id, formula: th.reading, statements: readingById, swaps: ordered.filter((s) => s.swap === true).length },
  }
}

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): CallItInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  if (spec === undefined || spec.pending !== undefined) throw new RangeError(`${CALL_IT_ID} cannot make template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${CALL_IT_ID}/${template}/b${band}`))
  const base = { family: CALL_IT_ID, template, band, seed, kcs: spec.kcs } as const
  if (template === 't4') {
    const b = t4(band, draw)
    return { ...base, item: { stem: b.stem, parts: [b.part] }, bound: 'every ledger with a and b from −3 to 3 and every amount from −3 to 3, under six transfers', data: { readings: b.readings, values: {} } }
  }
  const b = template === 't1' ? t1(band, draw) : t2(band, draw)
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: b.mutants, distractors: b.distractors, draw: draw.fork('options'), render: (x) => x })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: b.ask, options }
  return { ...base, item: { stem: b.stem, parts: [part] }, ...(b.bound === undefined ? {} : { bound: b.bound }), data: { ...b.data, values } }
}

function pocket<W>(port: EnginePort, input: PocketQuery) {
  return ask<PocketQuery, W>(port, { engine: CALL_POCKET, version: CALL_POCKET_VERSION, input, budget: { wallMs: 2000, maxStates: CALL_POCKET_MAX_STATES } })
}

const resultOf = <T>(verdict: { readonly kind: string; readonly results?: readonly unknown[] }): T | undefined => (verdict.kind === 'checks' ? (verdict.results?.[0] as T | undefined) : undefined)

async function key(inst: CallItInstance, port: EnginePort) {
  const bound = inst.bound === undefined ? {} : { bound: inst.bound }
  if (inst.template === 't4') {
    const r = inst.data.readings
    if (r === undefined) return discard('reference-rejected', 'a t4 instance carries its readings')
    const a = await pocket(port, { op: 'readings', theorem: r.formula, statements: r.statements })
    if (a.kind === 'unknown') return discard(a.budget ? 'budget' : 'unknown', `the call pocket could not judge the readings: ${a.reason}`)
    const ans = resultOf<ReadingAnswer>(a.reply.verdict)
    if (ans === undefined) return discard('unknown', 'the call pocket gave no judgment')
    const part = inst.item.parts[0] as TrueFalsePart
    // A statement the generator meant true must judge true, and a mutant false: otherwise the generator is wrong.
    for (const s of part.statements) {
      if ((s.origin.kind === 'reference') !== ans.truth[s.id]) return discard('reference-rejected', `statement ${s.id} was meant ${s.origin.kind === 'reference' ? 'true' : 'false'} but its reading judges otherwise`)
    }
    const refutations: Record<string, Json> = {}
    for (const [id, x] of Object.entries(ans.refutations)) refutations[id] = { 'differs under': x.under, theorem: x.theorem, sentence: x.statement }
    const k: CallItKey = { engine: engineAtVersion(a.reply), choices: [], statements: [{ part: PART, truth: ans.truth, refutations }], ...bound }
    return k
  }
  const part = inst.item.parts[0] as ChoicePart
  let want: string
  let witness: Json
  let extra: Partial<CallItKey> = {}
  let engine: string
  if (inst.template === 't1') {
    const q = inst.data.query
    if (q === undefined) return discard('reference-rejected', 'a t1 instance carries its query')
    const a = await pocket<Json>(port, { op: 'predict', formula: q.formula, bounds: q.bounds })
    if (a.kind === 'unknown') return discard(a.budget ? 'budget' : 'unknown', `the call pocket could not decide the query: ${a.reason}`)
    const p = resultOf<Prediction>(a.reply.verdict)
    if (p === undefined) return discard('unknown', 'the call pocket gave no answer')
    want = p.answer
    witness = p.answer === 'sat' ? (p.witness as Json) : p.answer === 'unknown' ? { 'Z3 5.3.1 answers': `unknown, ${p.reason}` } : { 'every state in the bounds': 'rejected' }
    extra = { prediction: p }
    engine = engineAtVersion(a.reply)
  } else {
    const s = inst.data.system
    if (s === undefined) return discard('reference-rejected', 'a t2 instance carries its system')
    const a = await pocket<Json>(port, { op: 'graph', spec: s.spec })
    if (a.kind === 'unknown') return discard(a.budget ? 'budget' : 'unknown', `the call pocket could not explore the graph: ${a.reason}`)
    const g = resultOf<GraphAnswer>(a.reply.verdict)
    if (g === undefined) return discard('unknown', 'the call pocket gave no graph')
    const len = g.shortest
    const match = Object.entries(s.intervals).find(([, iv]) => (iv === 'none' ? len === null : len !== null && inInterval(len, iv)))
    if (match === undefined) return discard('unknown', `no option covers a shortest trace of ${String(len)} actions`)
    want = match[0]
    witness = g.trace === null ? { 'distinct states': g.distinct, 'violating states': 0 } : { 'shortest violating trace': g.trace.join(', '), actions: g.trace.length }
    extra = { graph: g }
    engine = engineAtVersion(a.reply)
  }
  const confirm = async (ref: string): Promise<ConfirmResult> => (ref === want ? { confirmed: true } : { rejected: `the pocket's answer is ${want}` })
  const distinguish = async (x: string, y: string): Promise<DistinguishResult> => (x === y ? { same: true } : { differ: witness })
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: CallItKey = { engine, choices: [choice], statements: [], ...bound, ...extra }
  return k
}

function measure(inst: CallItInstance): Measure {
  switch (inst.template) {
    case 't1': {
      const q = inst.data.query
      const f = q?.formula
      if (f === undefined) return { operators: 0, change: 0, pow: 0 }
      // A power term counts two operators beyond its relation [D]: it is the nonlinear part of the query.
      return { operators: atomsOf(f) + (hasPow(f) ? 2 : 0), change: q?.changedFrom === undefined ? 0 : 1, pow: hasPow(f) ? 1 : 0 }
    }
    case 't2':
      return { processes: inst.data.system?.spec.workers ?? 0, intervals: Object.keys(inst.data.system?.intervals ?? {}).length - 1 }
    default:
      return { statements: Object.keys(inst.data.readings?.statements ?? {}).length, swaps: inst.data.readings?.swaps ?? 0 }
  }
}

const VERDICTS: readonly string[] = Object.values(VERDICT_TEXT)

export const callItGenerator: Generator<CallItInstance, CallItKey> = defineGenerator<CallItInstance, CallItKey>({
  id: CALL_IT_ID,
  fixture: false,
  title: 'Call it: the verdict before the run',
  templates: TEMPLATES,
  engines: [CALL_POCKET],
  misconceptions: ['dp:Z1', 'dp:Z2', 'dp:T6', 'dp:C1', 'dp:L4', 'dp:G1', 'dp:G5', 'dp:G6'],
  make,
  key,
  grade: (inst, answer, k) =>
    gradeItem(inst, answer, k, { basis: inst.template === 't1' ? BASIS.t1 : inst.template === 't2' ? BASIS.t2 : BASIS.t4, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  structure: (inst) => {
    if (inst.template === 't1') return `verdict|${shapeOf(inst.data.query?.formula ?? and())}|${VERDICTS.length}`
    if (inst.template === 't2') return `interval|workers|${Object.keys(inst.data.system?.intervals ?? {}).length}`
    return `multi-tf|${Object.keys(inst.data.readings?.statements ?? {}).length}`
  },
})

export const generator = callItGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [CALL_POCKET]: callPocketPort }

/** The values t4's readings range over. */
export const READING_BOX = LEDGER_BOX
