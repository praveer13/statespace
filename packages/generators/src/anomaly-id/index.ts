// GEN-anomaly-id (ASSESSMENT.md section 4.10): the class of a recorded concurrent history. Instances are drawn only
// from histories PostgreSQL 18.6 recorded (pool.ts, copied from RUN-pg-catalog): the tab cannot run concurrent
// PostgreSQL, and a history with altered numbers would be an unrun fact. The seed picks the history, from the display
// half for a display seed and the graded half otherwise; nothing about it is changed.
//
// Four templates, as the grid's patterns fall: t1 read-modify-write (and its conditional-UPDATE twin), t2 write skew,
// t3 read skew, t4 serialization failure or deadlock (band 1 the 40001 histories cross-listed from t1 and t2, band 3
// the attempt logs with a retry). The options are the six classes, chance 1 in 6. Keys are never stored: key() asks
// the history check (engine.ts) to classify the history at grade time, in this page, and every grade prints that the
// verdict holds for this recorded run only.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import { halfOf } from '../core/seed.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { HISTORY_CHECK, HISTORY_CHECK_VERSION, historyBound, historyCheckPort } from './engine.ts'
import type { HistoryQuery } from './engine.ts'
import { CLASS_TEXT, CLASSES, classify, finalText, historyTable, LEVEL_NAME } from './history.ts'
import type { AnomalyClass, Classification, History } from './history.ts'
import { POOL, POOL_RUN } from './pool.ts'

export { HISTORY_CHECK, HISTORY_CHECK_VERSION, historyCheckPort } from './engine.ts'
export { classify, cycleOf, replayOrder } from './history.ts'
export type { AnomalyClass, History } from './history.ts'
export { POOL } from './pool.ts'

export const ANOMALY_ID_ID = 'GEN-anomaly-id' as const
const PART = 'main'

export const ANOMALY_ID_BASIS =
  'the history check in this page: every serial order of the committed transactions replayed through the reference semantics, then the shape of the dependency cycle, then the recorded SQLSTATEs (checked by this page over this recorded history)'

export interface AnomalyData {
  readonly history: History
  readonly values: Readonly<Record<string, AnomalyClass>>
}

export interface AnomalyInstance extends InstanceBase {
  readonly data: AnomalyData
}

export interface AnomalyKey extends KeyBase {
  readonly cls: AnomalyClass
}

/** The pattern's place on its template's band axis. */
const RANK: Readonly<Record<string, number>> = {
  rmw2: 1,
  cond2: 2,
  rmw3: 3,
  teamsum2: 1,
  holds2: 2,
  readskew2: 1,
  readskew3: 2,
  'readskew2-mixed': 3,
  opposite2: 2,
  ordered2: 2,
  'retry-holds': 3,
  'retry-cond': 3,
  'retry-opposite': 3,
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'read-modify-write',
    kcs: { primary: 'KC-6.compilation-pattern', secondary: ['KC-6.anomaly-isolation'] },
    bands: { 1: { pattern: [1, 1] }, 2: { pattern: [2, 2] }, 3: { pattern: [3, 3] } },
  },
  {
    id: 't2',
    name: 'write skew',
    kcs: { primary: 'KC-6.anomaly-isolation', secondary: ['KC-6.compilation-pattern'] },
    bands: { 1: { pattern: [1, 1], level: [1, 3] }, 2: { pattern: [2, 2], level: [1, 3] }, 3: { pattern: [2, 2], level: [3, 3] } },
  },
  {
    id: 't3',
    name: 'read skew',
    kcs: { primary: 'KC-6.anomaly-isolation', secondary: [] },
    bands: { 1: { pattern: [1, 1] }, 2: { pattern: [2, 2] }, 3: { pattern: [3, 3] } },
  },
  {
    id: 't4',
    name: 'serialization failure or deadlock',
    kcs: { primary: 'KC-6.serializable-retries', secondary: ['KC-6.anomaly-isolation'] },
    bands: { 1: { pattern: [1, 1] }, 2: { pattern: [2, 2] }, 3: { pattern: [3, 3] } },
  },
]

const LEVEL_RANK = { RC: 1, RR: 2, SER: 3 } as const

/** The histories a template and band draw from. */
export function poolOf(template: TemplateId, band: Band): History[] {
  if (template === 't4' && band === 1) return POOL.filter((h) => (h.template === 't1' || h.template === 't2') && h.band === 1 && h.txns.some((t) => t.outcome === 'abort:40001'))
  if (template === 't2' && band === 3) return POOL.filter((h) => h.template === 't2' && h.band === 2 && Object.values(h.levels).every((l) => l === 'SER'))
  return POOL.filter((h) => h.template === template && h.band === band)
}

// ---------------------------------------------------------------- copy

function patternText(p: string): string {
  const base = p.replace(/^retry-/, '')
  const say: Record<string, string> = {
    rmw2: 'each session withdraws by an application read-modify-write: it reads the balance into `seen`, then writes `seen − amount` if `seen` covers the amount',
    rmw3: 'each of three sessions withdraws by an application read-modify-write: it reads the balance into `seen`, then writes `seen − amount` if `seen` covers the amount',
    cond2: 'each session withdraws with one conditional UPDATE whose WHERE clause checks the balance',
    cond: 'each session withdraws with one conditional UPDATE whose WHERE clause checks the balance',
    teamsum2: "each session reads the team's total into `seen`, then debits its own account if the total stays at or above zero",
    holds2: 'each session reads the available balance (balance minus holds) into `seen`, then inserts a hold if `seen` covers it: a predicate read, then an insert',
    holds: 'each session reads the available balance (balance minus holds) into `seen`, then inserts a hold if `seen` covers it: a predicate read, then an insert',
    readskew2: 'a reader SELECTs both balances while a mover moves money from account 1 to account 2 in one transaction',
    'readskew2-mixed': 'a reader SELECTs both balances while a mover moves money from account 1 to account 2 in one transaction',
    readskew3: 'two readers SELECT both balances while a mover moves money from account 1 to account 2 in one transaction',
    opposite2: 'two transfers move money in opposite directions: each debits one account with a conditional UPDATE, then credits the other',
    opposite: 'two transfers move money in opposite directions: each debits one account with a conditional UPDATE, then credits the other',
    ordered2: 'two transfers each touch the lower-numbered account first, then the other',
  }
  const s = say[p] ?? say[base] ?? p
  return p.startsWith('retry-') ? `${s}; the session that failed then retries the whole command from BEGIN` : s
}

function referenceWhy(c: Classification): string {
  if (c.failures !== undefined) {
    return `No serial order of the committed transactions reproduces what they printed (${c.failures.join('; ')}). ${c.cycle ?? ''}: that cycle is a ${CLASS_TEXT[c.cls]}.`
  }
  const order = (c.order ?? []).join(' then ')
  if (c.cls === 'none') return `The serial order ${order} reproduces every output and the final check, and no transaction failed: the history is serializable and shows no anomaly.`
  const code = c.cls === 'deadlock' ? '40P01' : '40001'
  return `The committed transactions fit the serial order ${order}, so what committed is serializable; a session failed with SQLSTATE ${code}, read from the recording. PostgreSQL ${c.cls === 'deadlock' ? 'broke a lock cycle by aborting one session' : 'refused to commit a transaction that could not be serialized'}.`
}

function whyNot(opt: AnomalyClass, c: Classification, h: History): string {
  const rr = Object.values(h.levels).includes('RR')
  const levels = [...new Set(Object.values(h.levels).map((l) => LEVEL_NAME[l]))].join(' and ')
  const serializable = c.order !== undefined
  const order = (c.order ?? []).join(' then ')
  const failed = h.txns.filter((t) => t.outcome.startsWith('abort:')).map((t) => `${t.s} failed with ${t.outcome.slice('abort:'.length)}`)
  switch (opt) {
    case 'none':
      if (serializable) return `What committed fits the serial order ${order}, but ${failed.join(' and ')}: the recorded outcome is part of the history, and "no anomaly" leaves it out.`
      return rr
        ? 'REPEATABLE READ is taken to prevent every anomaly. It gives each transaction a snapshot, but two transactions can still commit outputs no serial order produces, and no serial order reproduces this history.'
        : `Every statement succeeded, but success is not serializability: no serial order of the committed transactions reproduces what they printed at ${levels}.`
    case 'serialization-failure':
      return c.sqlstates.includes('40001')
        ? 'A session did fail with 40001 here, but the history has more to name: see the answer.'
        : 'No transaction failed with 40001 in this recording. That SQLSTATE is the usual outcome of the pattern at a stricter level; naming it from the level reads the level, not this history.'
    case 'deadlock':
      return c.sqlstates.includes('40001')
        ? 'The failure here is 40001, a serialization failure, not 40P01. A lock wait that ends in an error is not a deadlock unless two sessions wait on each other.'
        : 'No session failed with 40P01. A step that waits for a lock and then completes is a lock wait, not a deadlock.'
    case 'lost-update':
    case 'write-skew':
    case 'read-skew':
      if (serializable) {
        return `What committed fits the serial order ${order}, so no ${CLASS_TEXT[opt]} survived to commit${failed.length > 0 ? `: PostgreSQL stopped it when ${failed.join(' and ')}` : ''}. An anomaly is a committed outcome no serial order produces.`
      }
      if (opt === 'lost-update')
        return c.cls === 'write-skew'
          ? 'The two sessions wrote different rows, so neither overwrote the other: each read what the other wrote. That is write skew, not a lost update.'
          : 'No row was read by two committed transactions before either committed and then written by both, which is what a lost update needs.'
      if (opt === 'write-skew')
        return c.cls === 'lost-update'
          ? 'Both sessions wrote the same row; write skew needs two transactions that write different rows, each having read what the other writes.'
          : 'No two committed transactions each read a row that the other then wrote, with different rows written.'
      return 'No committed transaction read one row before another transaction committed and a second row after it.'
  }
}

const TAG: Readonly<Record<AnomalyClass, MisconceptionKey>> = {
  none: 'dp:Q5',
  'serialization-failure': 'dp:Q4',
  'lost-update': 'dp:Q4',
  'write-skew': 'dp:Q4',
  deadlock: 'dp:Q11',
  'read-skew': 'dp:Q11',
}

// ---------------------------------------------------------------- make

function make(seed: number, band: Band, template: TemplateId): AnomalyInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  if (spec === undefined) throw new RangeError(`${ANOMALY_ID_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${ANOMALY_ID_ID}/${template}/b${band}`))
  const half = halfOf(seed)
  const supply = poolOf(template, band)
  const inHalf = supply.filter((h) => h.half === half)
  const from = inHalf.length > 0 ? inHalf : supply
  if (from.length === 0) throw new RangeError(`${ANOMALY_ID_ID} ${template} b${band}: no recorded history in the pool`)
  const h = from[draw.below(from.length)] as History
  const c = classify(h)
  if ('unknown' in c) throw new RangeError(`${ANOMALY_ID_ID}: ${h.id} cannot be classified: ${c.unknown}`)
  const mutants: Mutant<AnomalyClass>[] = CLASSES.filter((x) => x !== c.cls).map((x) => ({ tag: TAG[x], operator: `name it ${CLASS_TEXT[x]}`, why: () => whyNot(x, c, h), apply: () => x }))
  const { options, values } = assembleOptions({ reference: c.cls, referenceWhy: referenceWhy(c), mutants, distractors: 5, draw: draw.fork('options'), render: (x) => CLASS_TEXT[x] })
  const levels = Object.entries(h.levels).map(([s, l]) => `${s} ${LEVEL_NAME[l]}`).join(', ')
  const setup = h.pattern.includes('holds') ? `account 1 holds ${h.balance}, with no holds placed` : `accounts 1 and 2 each hold ${h.balance}`
  const stem = [
    `*History:* recorded on PostgreSQL 18.6 (\`${POOL_RUN}\`, history \`${h.id}\`). *Compiled as:* ${patternText(h.pattern)}. *Isolation:* ${levels}. *Setup:* ${setup}.`,
    '',
    historyTable(h),
    '',
    `*Final check:* ${finalText(h)}.`,
    '',
    'Which class names this history? This page checks your pick over this recorded history.',
  ].join('\n')
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Pick the class.', options }
  return {
    family: ANOMALY_ID_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem, parts: [part] },
    bound: historyBound(h),
    data: { history: h, values },
  }
}

// ---------------------------------------------------------------- key and grade

async function key(inst: AnomalyInstance, port: EnginePort) {
  const input: HistoryQuery = { op: 'classify', history: inst.data.history }
  const r = await ask<HistoryQuery, Classification>(port, { engine: HISTORY_CHECK, version: HISTORY_CHECK_VERSION, input, budget: { wallMs: 2000, maxTxns: 8 } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the history check could not classify the history: ${r.reason}`)
  const c = r.reply.witness
  if (c === undefined) return discard('unknown', 'the history check returned no classification')
  const facts: Record<string, Json> = {
    'the checker': CLASS_TEXT[c.cls],
    ...(c.order !== undefined ? { 'serial order that fits': c.order.join(' then ') } : { 'serial orders tried': `${c.orders}, none fits` }),
    ...(c.cycle !== undefined ? { cycle: c.cycle } : {}),
    ...(c.sqlstates.length > 0 ? { 'recorded SQLSTATEs': c.sqlstates.join(', ') } : {}),
  }
  const confirm = async (ref: AnomalyClass): Promise<ConfirmResult> => (ref === c.cls ? { confirmed: true } : { rejected: `the history check finds ${CLASS_TEXT[c.cls]}` })
  const distinguish = async (a: AnomalyClass, b: AnomalyClass): Promise<DistinguishResult> => (a === b ? { same: true } : { differ: facts })
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: AnomalyKey = { engine: engineAtVersion(r.reply), choices: [choice], statements: [], cls: c.cls, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

function measure(inst: AnomalyInstance): Measure {
  const h = inst.data.history
  const pattern = inst.template === 't4' && inst.band === 1 ? 1 : (RANK[h.pattern] ?? 0)
  if (inst.template !== 't2') return { pattern }
  let level = 0
  for (const l of Object.values(h.levels)) if (LEVEL_RANK[l] > level) level = LEVEL_RANK[l]
  return { pattern, level }
}

export const anomalyIdGenerator: Generator<AnomalyInstance, AnomalyKey> = defineGenerator<AnomalyInstance, AnomalyKey>({
  id: ANOMALY_ID_ID,
  fixture: false,
  title: 'Anomaly ID: the class of a recorded PostgreSQL history',
  templates: TEMPLATES,
  engines: [HISTORY_CHECK],
  misconceptions: ['dp:Q5', 'dp:Q4', 'dp:Q11'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: ANOMALY_ID_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  // The pattern's step vocabulary and the session count, with the numbers erased.
  structure: (inst) => {
    const h = inst.data.history
    const kinds = [...new Set(h.txns.flatMap((t) => t.ops.map((o) => o.k)))].sort().join(',')
    return `${inst.template === 't4' ? 'outcome' : 'anomaly'}|${kinds}|sessions:${Object.keys(h.levels).length}`
  },
  replay: (inst, part, a, b) => {
    if (part !== PART) return false
    const va = inst.data.values[a]
    const vb = inst.data.values[b]
    return va !== undefined && vb !== undefined && va !== vb
  },
})

export const generator = anomalyIdGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [HISTORY_CHECK]: historyCheckPort }
