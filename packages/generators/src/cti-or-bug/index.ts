// GEN-cti-or-bug (ASSESSMENT.md section 4.7): a verdict on a candidate invariant of a small transition system,
// "inductive", "CTI: strengthen the invariant" or "reachable: fix the command". This build serves pick mode: the
// three verdicts are the options. The templates are the three key classes, each over ledger systems of two to four
// variables and one to three guarded commands: t1 an inductive invariant, t2 a true invariant that is not inductive
// (the generator holds a strengthening that certifies it), t3 a buggy command whose violation is reachable at a
// designed depth.
//
// Keys are never stored. key() asks the family's checker, the CTI box (engine.ts), the workbench's questions in
// order: a search from Init (a violation found is a replayable run: reachable); then consecution over the box (a
// counterexample found, with every reachable state inside Inv, is a CTI, and the generator's strengthening must
// pass initiation, consecution and implication too); otherwise inductive. The verdict the checker reaches must be
// the template's reference; GATE-generators fails a family whose checker rejects one.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard } from '../core/define.ts'
import type { DiscardOf } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { CTI_BOX, CTI_BOX_MAX_STATES, CTI_BOX_VERSION, ctiBoxPort } from './engine.ts'
import type { CtiQuery, CtiWitness, RunWitness } from './engine.ts'
import { and, conjuncts, evaluate, num, rel, render, renderCommand, showStep, sum, term } from './system.ts'
import type { Box, Command, Formula, State, System } from './system.ts'

export { CTI_BOX, CTI_BOX_MAX_STATES, CTI_BOX_VERSION, ctiBoxPort } from './engine.ts'
export { consecution, evaluate, reach, render } from './system.ts'
export type { Formula, State, System } from './system.ts'

export const CTI_OR_BUG_ID = 'GEN-cti-or-bug' as const
const PART = 'main'

export const CTI_OR_BUG_BASIS =
  'this page, over this instance: the CTI box searches runs from Init (exact when the search completes) and checks consecution over every state of the printed box; keys computed at grade time (Z3 over all integers is not wired to this item yet)'

export type Verdict = 'inductive' | 'cti' | 'reachable'

export const VERDICT_TEXT: Readonly<Record<Verdict, string>> = {
  inductive: 'Inductive: Init satisfies it and every step preserves it',
  cti: 'True but not inductive: a CTI, so strengthen the invariant',
  reachable: 'Reachable: a run from Init breaks it, so fix the command',
}

export interface CtiOrBugData {
  readonly sys: System
  readonly inv: Formula
  /** t2: the conjuncts the generator adds to Inv to certify that it holds in every reachable state. */
  readonly strengthen?: readonly Formula[]
  /** t3: the designed length of the shortest violating run, in actions. */
  readonly depth?: number
  /** The search depth N, printed. */
  readonly n: number
  readonly box: Box
  /** Each option's verdict, by option id. */
  readonly values: Readonly<Record<string, Verdict>>
}

export interface CtiOrBugInstance extends InstanceBase {
  readonly data: CtiOrBugData
}

export interface CtiOrBugKey extends KeyBase {
  readonly verdict: Verdict
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'inductive',
    kcs: { primary: 'KC-4.invariant-vs-inductive', secondary: ['KC-4.cti-or-bug'] },
    bands: {
      1: { variables: [2, 2], commands: [1, 1] },
      2: { variables: [3, 3], commands: [2, 2] },
      3: { variables: [4, 4], commands: [3, 3] },
    },
  },
  {
    id: 't2',
    name: 'CTI',
    kcs: { primary: 'KC-4.cti-or-bug', secondary: ['KC-4.invariant-vs-inductive', 'KC-5.inductive-invariant-tla'] },
    bands: {
      1: { commands: [1, 1], conjuncts: [1, 1] },
      2: { commands: [2, 2], conjuncts: [1, 1] },
      3: { commands: [3, 3], conjuncts: [2, 2] },
    },
  },
  {
    id: 't3',
    name: 'reachable',
    kcs: { primary: 'KC-4.cti-or-bug', secondary: ['KC-4.invariant-vs-inductive'] },
    bands: {
      1: { depth: [1, 2] },
      2: { depth: [3, 4] },
      3: { depth: [5, 6] },
    },
  },
]

// ---------------------------------------------------------------- the ledger systems

const ZERO = num(0)

function move(x: number, opts: { capped?: boolean; bonus?: boolean } = {}): Command {
  const capped = opts.capped ?? true
  return {
    name: 'Move',
    param: { v: 'x', lo: 1, hi: x },
    guard: and(rel(ZERO, '<', term('x')), ...(capped ? [rel(term('x'), '<=', term('a'))] : [])),
    updates: [
      { v: 'a', e: { coefs: [{ v: 'a', c: 1 }, { v: 'x', c: -1 }], k: 0 } },
      { v: 'b', e: { coefs: [{ v: 'b', c: 1 }, { v: 'x', c: 1 }], k: opts.bonus === true ? 1 : 0 } },
    ],
  }
}

function debit(x: number, capped = true): Command {
  return {
    name: 'Debit',
    param: { v: 'x', lo: 1, hi: x },
    guard: and(rel(term('p'), '=', ZERO), rel(ZERO, '<', term('x')), ...(capped ? [rel(term('x'), '<=', term('a'))] : [])),
    updates: [
      { v: 'a', e: { coefs: [{ v: 'a', c: 1 }, { v: 'x', c: -1 }], k: 0 } },
      { v: 'p', e: term('x') },
    ],
  }
}

function credit(clear = true): Command {
  return {
    name: 'Credit',
    guard: rel(term('p'), '>', ZERO),
    updates: [{ v: 'b', e: sum(['b', 'p']) }, ...(clear ? [{ v: 'p', e: ZERO }] : [])],
  }
}

function fee(double = false): Command {
  return {
    name: 'Fee',
    guard: rel(term('b'), '>', ZERO),
    updates: [
      { v: 'b', e: term('b', -1) },
      { v: 'f', e: term('f', double ? 2 : 1) },
    ],
  }
}

type Shape = 'move' | 'pending' | 'fee'

const VARS: Readonly<Record<Shape, readonly string[]>> = { move: ['a', 'b'], pending: ['a', 'b', 'p'], fee: ['a', 'b', 'p', 'f'] }
const SAYS: Readonly<Record<Shape, string>> = {
  move: '`a` and `b` are two balances; `Move` transfers `x` from `a` to `b`.',
  pending: '`a` and `b` are two balances and `p` an amount in flight: `Debit` takes `x` from `a` into `p`, and `Credit` pays `p` into `b`.',
  fee: '`a` and `b` are two balances, `p` an amount in flight and `f` the fees collected: `Debit` takes `x` from `a` into `p`, `Credit` pays `p` into `b`, and `Fee` moves one unit from `b` to `f`.',
}

function systemOf(shape: Shape, t: number, cmds: readonly Command[]): System {
  const init: Record<string, number> = {}
  for (const v of VARS[shape]) init[v] = 0
  init['a'] = t
  return { vars: VARS[shape], init, commands: cmds }
}

const total = (shape: Shape): string[] => [...VARS[shape]]

interface Built {
  readonly shape: Shape
  readonly sys: System
  readonly inv: Formula
  readonly strengthen?: readonly Formula[]
  readonly depth?: number
  readonly t: number
}

function t1(band: Band, draw: SeededDraw): Built {
  const t = draw.int(3, 5)
  const x = draw.int(1, 2)
  const shape: Shape = band === 1 ? 'move' : band === 2 ? 'pending' : 'fee'
  const cmds = shape === 'move' ? [move(x)] : shape === 'pending' ? [debit(x), credit()] : [debit(x), credit(), fee()]
  const nonneg = (vs: readonly string[]): Formula[] => vs.map((v) => rel(term(v), '>=', ZERO))
  const choices: Formula[] =
    shape === 'move'
      ? [and(rel(sum(['a', 'b']), '=', num(t)), ...nonneg(['a'])), and(rel(sum(['a', 'b']), '<=', num(t)), ...nonneg(['a'])), and(...nonneg(['a', 'b']))]
      : shape === 'pending'
        ? [rel(sum(total(shape)), '=', num(t)), and(rel(sum(total(shape)), '=', num(t)), ...nonneg(['p'])), and(...nonneg(['a', 'p']))]
        : [rel(sum(total(shape)), '=', num(t)), and(rel(sum(total(shape)), '=', num(t)), ...nonneg(['b'])), and(...nonneg(['a', 'b', 'p']))]
  return { shape, sys: systemOf(shape, t, cmds), inv: draw.pick(choices), t }
}

function t2(band: Band, draw: SeededDraw): Built {
  const t = draw.int(3, 5)
  const x = draw.int(1, 2)
  if (band === 1) {
    const inv = draw.bool() ? rel(term('b'), '<=', num(t)) : and(rel(term('a'), '<=', num(t)), rel(term('b'), '<=', num(t)))
    return { shape: 'move', sys: systemOf('move', t, [move(x)]), inv, strengthen: [rel(sum(['a', 'b']), '<=', num(t))], t }
  }
  if (band === 2) {
    const inv = draw.bool() ? rel(sum(['a', 'b']), '<=', num(t)) : rel(sum(['b', 'p']), '<=', num(t))
    return { shape: 'pending', sys: systemOf('pending', t, [debit(x), credit()]), inv, strengthen: [rel(sum(['a', 'b', 'p']), '<=', num(t))], t }
  }
  return {
    shape: 'fee',
    sys: systemOf('fee', t, [debit(x), credit(), fee()]),
    inv: rel(sum(['b', 'f']), '<=', num(t)),
    strengthen: [rel(sum(['a', 'b', 'p', 'f']), '<=', num(t)), rel(term('a'), '>=', ZERO)],
    t,
  }
}

/** The bugs of t3, each with the depth of its shortest violating run worked out by hand (the tests replay each). */
function t3(band: Band, draw: SeededDraw): Built {
  type Design = () => Built
  const moveUncapped = (t: number, x: number): Built => ({ shape: 'move', sys: systemOf('move', t, [move(x, { capped: false })]), inv: rel(term('a'), '>=', ZERO), depth: Math.floor(t / x) + 1, t })
  const debitUncapped = (shape: 'pending' | 'fee', t: number, x: number): Built => ({
    shape,
    sys: systemOf(shape, t, shape === 'pending' ? [debit(x, false), credit()] : [debit(x, false), credit(), fee()]),
    inv: rel(term('a'), '>=', ZERO),
    depth: 2 * (Math.floor(t / x) + 1) - 1,
    t,
  })
  const designs: Readonly<Record<Band, readonly Design[]>> = {
    1: [
      () => {
        const t = draw.int(3, 5)
        return { shape: 'move', sys: systemOf('move', t, [move(draw.int(1, 2), { bonus: true })]), inv: rel(sum(['a', 'b']), '<=', num(t)), depth: 1, t }
      },
      () => moveUncapped(draw.int(2, 3), 2),
      () => {
        const t = draw.int(1, 2)
        return debitUncapped('pending', t, t + 1)
      },
    ],
    2: [
      () => {
        const t = draw.int(3, 5)
        return { shape: 'pending', sys: systemOf('pending', t, [debit(draw.int(1, 2)), credit(false)]), inv: rel(sum(['a', 'b']), '<=', num(t)), depth: 3, t }
      },
      () => {
        const t = draw.int(3, 5)
        return { shape: 'fee', sys: systemOf('fee', t, [debit(draw.int(1, 2)), credit(), fee(true)]), inv: rel(sum(['a', 'b', 'p', 'f']), '<=', num(t)), depth: 3, t }
      },
      () => debitUncapped(draw.bool() ? 'pending' : 'fee', 3, 2),
      () => moveUncapped(3, 1),
    ],
    3: [() => debitUncapped(draw.bool() ? 'pending' : 'fee', draw.int(4, 5), 2), () => moveUncapped(draw.int(4, 5), 1), () => debitUncapped('pending', 2, 1)],
  }
  return draw.pick(designs[band])()
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

const REFERENCE: Readonly<Record<string, Verdict>> = { t1: 'inductive', t2: 'cti', t3: 'reachable' }

// ---------------------------------------------------------------- copy

const ASK = 'Which is it?'

function whys(ref: Verdict, b: Built): { referenceWhy: string; mutants: Mutant<Verdict>[] } {
  const v = (tag: Mutant<Verdict>['tag'], operator: string, why: string, value: Verdict): Mutant<Verdict> => ({ tag, operator, why: () => why, apply: () => value })
  if (ref === 'inductive') {
    return {
      referenceWhy: 'Init satisfies Inv, and no state that satisfies Inv has a step out of it: initiation and consecution both hold, so Inv is inductive and holds in every reachable state.',
      mutants: [
        v('dp:G9', 'a CTI where there is none', 'There is no counterexample to induction: every state that satisfies Inv steps only to states that satisfy it. Inductive is the stronger property, and this Inv has it.', 'cti'),
        v('dp:O3', 'a bug where there is none', 'No run from Init breaks Inv. An inductive invariant holds in every state a run can reach, so there is nothing to fix.', 'reachable'),
      ],
    }
  }
  if (ref === 'cti') {
    const star = render(and(b.inv, ...(b.strengthen ?? [])))
    return {
      referenceWhy: `Consecution fails: some state satisfies Inv and a step leaves it. No run reaches that state. \`${star}\` holds at Init, every command preserves it, and it implies Inv, so Inv holds in every reachable state. Strengthen the invariant; the commands are fine.`,
      mutants: [
        v('dp:G9', 'invariant read as inductive', 'Inv is true in every reachable state, but that does not make it inductive: a step from a state that satisfies Inv, which no run reaches, breaks it. Consecution fails.', 'inductive'),
        v('dp:O3', 'a CTI read as a bug', 'A step out of Inv from a state no run reaches is a counterexample to induction, not a bug. Every reachable state satisfies Inv, so changing a command fixes nothing.', 'reachable'),
      ],
    }
  }
  const d = b.depth ?? 0
  return {
    referenceWhy: `A run of ${d} action${d === 1 ? '' : 's'} from Init reaches a state that breaks Inv. The state is reachable, so no strengthening can exclude it: the command is wrong.`,
    mutants: [
      v('dp:T5', 'a search stopped short', `A search that stops before ${d} action${d === 1 ? '' : 's'} finds no violation and makes the failing step look like a CTI. Searched far enough, the run from Init reaches the bad state.`, 'cti'),
      v('dp:G9', 'inductive on a broken invariant', 'Inv fails in a reachable state, so it is not even an invariant, let alone an inductive one.', 'inductive'),
    ],
  }
}

function stemOf(b: Built): string {
  const vars = b.sys.vars.map((v) => `\`${v}\``).join(', ')
  const init = b.sys.vars.map((v) => `${v} = ${b.sys.init[v]}`).join(', ')
  const cmds = b.sys.commands.map((c) => `- ${renderCommand(c)}`).join('\n')
  return `State: ${vars}, integers. ${SAYS[b.shape]}\n\nInit: \`${init}\`.\n\nCommands (a variable a command does not set keeps its value):\n\n${cmds}\n\nCandidate invariant Inv: \`${render(b.inv)}\`.\n\nIs Inv inductive, true but not inductive (a counterexample to induction, so strengthen it), or broken by a run from Init (so fix the command)?`
}

// ---------------------------------------------------------------- make, key, grade

/** The search depth N: past every designed violation (t3 reaches at most 6). */
const N = 8

function make(seed: number, band: Band, template: TemplateId): CtiOrBugInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  const ref = REFERENCE[template]
  if (spec === undefined || build === undefined || ref === undefined) throw new RangeError(`${CTI_OR_BUG_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${CTI_OR_BUG_ID}/${template}/b${band}`))
  const b = build(band, draw)
  const { referenceWhy, mutants } = whys(ref, b)
  const { options, values } = assembleOptions({ reference: ref, referenceWhy, mutants, distractors: 2, draw: draw.fork('options'), render: (x) => VERDICT_TEXT[x] })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: ASK, options }
  const box: Box = { lo: -1, hi: b.t + 1 }
  const params = b.sys.commands.flatMap((c) => (c.param === undefined ? [] : [c.param.lo === c.param.hi ? `${c.param.v} = ${c.param.lo}` : `${c.param.v} from ${c.param.lo} to ${c.param.hi}`]))
  return {
    family: CTI_OR_BUG_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: stemOf(b), parts: [part] },
    bound: `runs from Init searched to ${N} actions, or until no new state appears; consecution checked over every state with ${b.sys.vars.join(', ')} from −1 to ${b.t + 1}${params.length > 0 ? `, ${params.join(', ')}` : ''}`,
    data: {
      sys: b.sys,
      inv: b.inv,
      ...(b.strengthen === undefined ? {} : { strengthen: b.strengthen }),
      ...(b.depth === undefined ? {} : { depth: b.depth }),
      n: N,
      box,
      values,
    },
  }
}

function q<W>(port: EnginePort, input: CtiQuery) {
  return ask<CtiQuery, W>(port, { engine: CTI_BOX, version: CTI_BOX_VERSION, input, budget: { wallMs: 2000, maxStates: CTI_BOX_MAX_STATES } })
}

const minus = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`)

const stateWitness = (vars: readonly string[], s: State): Record<string, Json> => {
  const out: Record<string, Json> = {}
  for (const v of vars) out[v] = s[v] as number
  return out
}

/** What the checker found, as the verdict and a witness for it. */
export interface Classified {
  readonly verdict: Verdict
  readonly witness: Json
  readonly engine: string
}

/** The workbench's procedure: search from Init, then consecution, then (for a CTI) the generator's strengthening. */
export async function classify(inst: CtiOrBugInstance, port: EnginePort): Promise<Classified | DiscardOf> {
  const { sys, inv, box, n } = inst.data
  // A completed search is exact; t1 and t2 systems are finite, so their search runs to the end.
  const r = await q<RunWitness>(port, { op: 'reach', sys, inv, depth: inst.template === 't3' ? n : 64 })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the CTI box could not finish the search: ${r.reason}`)
  const engine = engineAtVersion(r.reply)
  if (r.reply.verdict.kind === 'violated') {
    const w = r.reply.witness as RunWitness
    return { verdict: 'reachable', engine, witness: { ...stateWitness(sys.vars, w.state), run: ['Init', ...w.trace.map(showStep)].join(' → ') } }
  }
  const c = await q<CtiWitness>(port, { op: 'consecution', sys, inv, box })
  if (c.kind === 'unknown') return discard(c.budget ? 'budget' : 'unknown', `the CTI box could not check consecution: ${c.reason}`)
  if (c.reply.verdict.kind === 'unsat') return { verdict: 'inductive', engine, witness: { initiation: 'holds at Init', consecution: 'no state of the box steps out of Inv' } }
  const cti = c.reply.witness as CtiWitness
  // The search already showed every reachable state inside Inv; the strengthening is the certificate the item shows.
  if (inst.data.strengthen !== undefined) {
    const star = and(inv, ...inst.data.strengthen)
    if (!evaluate(star, sys.init)) return discard('reference-rejected', 'the strengthening fails at Init')
    const s = await q<CtiWitness>(port, { op: 'consecution', sys, inv: star, box })
    if (s.kind === 'unknown') return discard(s.budget ? 'budget' : 'unknown', `the CTI box could not check the strengthening: ${s.reason}`)
    if (s.reply.verdict.kind !== 'unsat') return discard('reference-rejected', 'the strengthening is not inductive over the box')
    const i = await q(port, { op: 'implies', sys, a: star, b: inv, box })
    if (i.kind === 'unknown' || i.reply.verdict.kind !== 'unsat') return discard('reference-rejected', 'the strengthening does not imply Inv')
  }
  return {
    verdict: 'cti',
    engine,
    witness: { ...stateWitness(sys.vars, cti.state), then: `${showStep(cti.step)} reaches ${sys.vars.map((v) => `${v} = ${minus(cti.step.to[v] ?? 0)}`).join(', ')}, outside Inv; no run from Init reaches the first state` },
  }
}

async function key(inst: CtiOrBugInstance, port: EnginePort): Promise<CtiOrBugKey | DiscardOf> {
  const found = await classify(inst, port)
  if ('discard' in found) return found
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice<Verdict>({
    part: PART,
    options: part.options,
    values: inst.data.values,
    confirm: async (ref) => (ref === found.verdict ? { confirmed: true } : { rejected: `the checker found ${found.verdict}` }),
    // Verdicts differ by value; the pair that includes the checker's verdict carries its certificate.
    distinguish: async (a, b) => (a === b ? { same: true } : { differ: a === found.verdict || b === found.verdict ? found.witness : { value: 'distinct' } }),
  })
  if ('discard' in choice) return choice
  return { engine: found.engine, choices: [choice], statements: [], verdict: found.verdict, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
}

function measure(inst: CtiOrBugInstance): Measure {
  const { sys } = inst.data
  if (inst.template === 't1') return { variables: sys.vars.length, commands: sys.commands.length }
  if (inst.template === 't2') return { commands: sys.commands.length, conjuncts: inst.data.strengthen?.length ?? 0 }
  return { depth: inst.data.depth ?? 0 }
}

export const ctiOrBugGenerator: Generator<CtiOrBugInstance, CtiOrBugKey> = defineGenerator<CtiOrBugInstance, CtiOrBugKey>({
  id: CTI_OR_BUG_ID,
  fixture: false,
  title: 'CTI or bug: inductive, a counterexample to induction, or a reachable violation',
  templates: TEMPLATES,
  engines: [CTI_BOX],
  misconceptions: ['dp:G9', 'dp:O3', 'dp:T5'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: CTI_OR_BUG_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  // The certificate each template's key rests on, then the system's shape with every literal erased.
  structure: (inst) =>
    `${inst.template === 't1' ? 'inductive' : inst.template === 't2' ? `strengthen×${inst.data.strengthen?.length ?? 0}` : 'trace'}|vars ${inst.data.sys.vars.length}|${inst.data.sys.commands.map((c) => `${c.param === undefined ? 'cmd' : 'cmd(x)'}:${conjuncts(c.guard).length}`).join(',')}|inv ${conjuncts(inst.data.inv).length}`,
})

export const generator = ctiOrBugGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [CTI_BOX]: ctiBoxPort }
