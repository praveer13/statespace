// The framework's fixture family: a small, complete generator that exercises every rule of the contract with a
// checker that runs anywhere (the box engine, engine.ts), so GATE-generators can hold the framework itself to
// purity, determinism across three engines, 2-4 structurally different templates banded 1-3, unknown discarded
// and distractors distinct, before any course family exists. It is not a family of the spine (`fixture: true`),
// it ships no content, and no lesson uses it.
//
// The item: a requirement over a few integer variables; pick the query that, if sat, shows a state violating it.
// Three templates negate three shapes (a bound, an implication, a conjunction); the distractors are misconception
// mutants (assert the requirement, shift the boundary, negate the consequent only, the converse, keep the "and",
// flip the connective only). The box engine confirms the reference, finds a violating state (non-vacuity) and tells
// every pair of options apart on a state; a box past its state budget is `unknown`, so band 3 discards some seeds.
//
// Changed by W1-T39 on 2026-10-25, for GATE-items: t3's dp:Z5 mutant "drop a conjunct" was always the shortest
// option, a length cue (always picking the longest option scored 500.0 of 1800 against a bar of 486.7 on both
// samples, and t3/b3 had 130 of 400 keys over 1.3 times their distractors' mean length; RUN-items-gate records both),
// so "flip the connective only" (dp:G5) replaced it. t3's instances changed with it, which is why determinism.json's
// t3 digests (and the family digest) were re-recorded in Node, Chromium, Firefox and WebKit (RUN-generators-gate).
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../define.ts'
import { assembleOptions, certifyChoice } from '../distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../distractors.ts'
import { gradeItem } from '../grade.ts'
import { ask, engineAtVersion } from '../port.ts'
import type { Answer, EnginePort } from '../port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec, WitnessClass } from '../types.ts'
import { BOX_ENGINE, BOX_MAX_STATES, BOX_VERSION, boxBound, boxPort } from './engine.ts'
import type { BoxQuery } from './engine.ts'
import { and, atomsOf, evaluate, flipDirection, implies, maxCoefOf, negate, not, or, rel, render, shapeOf, shiftBoundary, varsOf, xor } from './formula.ts'
import type { Formula, Lin, Rel, State } from './formula.ts'

export { BOX_ENGINE, BOX_MAX_STATES, BOX_VERSION, boxPort } from './engine.ts'

export const FIXTURE_ID = 'GEN-fixture' as const

const VARIABLES = ['a', 'b', 'x', 'f'] as const
const OPS: readonly Rel[] = ['<', '<=', '>', '>=']
const PART = 'main'

export interface FixtureData {
  readonly vars: readonly string[]
  readonly span: number
  readonly property: Formula
  /** Each option's formula, by option id. */
  readonly values: Readonly<Record<string, Formula>>
}

export interface FixtureInstance extends InstanceBase {
  readonly data: FixtureData
}

export type FixtureKey = KeyBase

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'negate a bound',
    kcs: { primary: 'KC-1.violation-as-sat', secondary: ['KC-1.quantifier-negation'] },
    bands: {
      1: { variables: [2, 2], atoms: [1, 1], coefficient: [1, 1], span: [3, 4] },
      2: { variables: [3, 3], atoms: [1, 1], coefficient: [1, 1], span: [3, 5] },
      3: { variables: [4, 4], atoms: [1, 1], coefficient: [1, 2], span: [4, 6] },
    },
  },
  {
    id: 't2',
    name: 'negate an implication',
    kcs: { primary: 'KC-1.only-if-direction', secondary: ['KC-1.implication-vacuity'] },
    bands: {
      1: { variables: [2, 2], atoms: [2, 2], coefficient: [1, 1], span: [3, 4] },
      2: { variables: [3, 3], atoms: [3, 3], coefficient: [1, 1], span: [3, 5] },
      3: { variables: [4, 4], atoms: [4, 4], coefficient: [1, 2], span: [4, 6] },
    },
  },
  {
    id: 't3',
    name: 'negate a conjunction',
    kcs: { primary: 'KC-1.quantifier-negation', secondary: ['KC-1.violation-as-sat'] },
    bands: {
      1: { variables: [2, 2], atoms: [2, 2], coefficient: [1, 1], span: [3, 4] },
      2: { variables: [3, 3], atoms: [2, 2], coefficient: [1, 1], span: [3, 5] },
      3: { variables: [4, 4], atoms: [3, 3], coefficient: [1, 2], span: [4, 6] },
    },
  },
]

/** A relation over the given variables: unit coefficients with seeded signs (one 2 when `double`), a seeded op and bound. */
function relation(draw: SeededDraw, vars: readonly string[], double: boolean): Formula {
  const doubled = double ? draw.below(vars.length) : -1
  const coefs = vars.map((v, i) => ({ v, c: (i === doubled ? 2 : 1) * (draw.bool() ? 1 : -1) }))
  const lin: Lin = { coefs, k: 0 }
  return rel(draw.pick(OPS), lin, draw.int(-1, 1))
}

/** Split the variables over `n` atoms so every variable appears: atom i takes the variables at positions i, i+n, ... and one more when it has a single one. */
function spread(draw: SeededDraw, vars: readonly string[], n: number): string[][] {
  const groups: string[][] = Array.from({ length: n }, () => [])
  vars.forEach((v, i) => (groups[i % n] as string[]).push(v))
  return groups.map((g) => {
    if (g.length >= 2 || vars.length < 2) return g
    const others = vars.filter((v) => !g.includes(v))
    return [...g, draw.pick(others)]
  })
}

const MUTANTS: Readonly<Record<'t1' | 't2' | 't3', readonly Mutant<Formula>[]>> = {
  t1: [
    {
      tag: 'dp:Z1',
      operator: 'assert the requirement',
      why: () => 'This is the requirement itself, so a sat answer shows a state that satisfies it, not one that violates it.',
      apply: (ref) => negate(ref),
    },
    {
      tag: 'dp:O1',
      operator: 'shift the boundary',
      why: () => 'This moves the boundary by one: on the boundary itself it disagrees with the violation of the requirement.',
      apply: (ref) => shiftBoundary(ref),
    },
    {
      tag: 'dp:G5',
      operator: 'flip the comparison',
      why: () => 'This flips the comparison instead of negating it: it accepts states that keep the requirement and misses states that break it.',
      apply: (ref) => flipDirection(ref),
    },
  ],
  t2: [
    {
      tag: 'dp:G4',
      operator: 'negate the consequent only',
      why: () => 'An implication holds whenever its guard is false, so this query is satisfied by states that never meet the guard; its sat answers prove nothing.',
      apply: (ref) => (ref.f === 'and' && ref.args.length === 2 ? implies(ref.args[0] as Formula, ref.args[1] as Formula) : null),
    },
    {
      tag: 'dp:G1',
      operator: 'violate the converse',
      why: () => 'This looks for a violation of the converse, "if the result holds then the guard held", which the requirement never states.',
      apply: (ref) => (ref.f === 'and' && ref.args.length === 2 ? and(negate(ref.args[1] as Formula), negate(ref.args[0] as Formula)) : null),
    },
    {
      tag: 'dp:Z1',
      operator: 'assert the requirement',
      why: () => 'This is the requirement itself, so a sat answer shows a state that satisfies it, not one that violates it.',
      apply: (ref) => (ref.f === 'and' && ref.args.length === 2 ? implies(ref.args[0] as Formula, negate(ref.args[1] as Formula)) : null),
    },
  ],
  t3: [
    {
      tag: 'dp:G5',
      operator: 'keep the and',
      why: () => 'Negating a conjunction gives a disjunction: this query asks every part to fail at once, so it misses states that break only one.',
      apply: (ref) => (ref.f === 'or' ? and(...ref.args) : null),
    },
    // In place of dp:Z5 "drop a conjunct", which was always the shortest option (W1-T39; see the header). With it, t3
    // is a 2x2 of connective and negation, so neither length nor shared tokens single out the key.
    {
      tag: 'dp:G5',
      operator: 'flip the connective only',
      why: () => 'This turns the "and" into an "or" but leaves each part as it was, half of the negation: it accepts states that keep the requirement.',
      apply: (ref) => (ref.f === 'or' ? or(...ref.args.map((a) => negate(a as Formula))) : null),
    },
    {
      tag: 'dp:Z1',
      operator: 'assert the requirement',
      why: () => 'This is the requirement itself, so a sat answer shows a state that satisfies it, not one that violates it.',
      apply: (ref) => negate(ref),
    },
  ],
}

/** The requirement a template asks about, for a band. */
function property(template: TemplateId, band: Band, draw: SeededDraw, vars: readonly string[]): Formula {
  const double = band === 3
  if (template === 't1') return relation(draw, vars, double)
  if (template === 't2') {
    // atoms: 2, 3, 4 = guard atoms + result atoms
    const guardAtoms = band === 1 ? 1 : 2
    const resultAtoms = band === 3 ? 2 : 1
    const groups = spread(draw, vars, guardAtoms + resultAtoms)
    const atoms = groups.map((g, i) => relation(draw, g, double && i === 0))
    const guard = guardAtoms === 1 ? (atoms[0] as Formula) : and(...atoms.slice(0, guardAtoms))
    const result = resultAtoms === 1 ? (atoms[guardAtoms] as Formula) : and(...atoms.slice(guardAtoms))
    return implies(guard, result)
  }
  const conjuncts = band === 3 ? 3 : 2
  const groups = spread(draw, vars, conjuncts)
  return and(...groups.map((g, i) => relation(draw, g, double && i === 0)))
}

function make(seed: number, band: Band, template: TemplateId): FixtureInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  if (spec === undefined) throw new RangeError(`${FIXTURE_ID} has no template ${String(template)}`)
  // One stream per template and band, so a seed gives unrelated instances in different cells.
  const draw = createDraw(deriveSeed(seed, `${FIXTURE_ID}/${template}/b${band}`))
  const vars = draw.sample(VARIABLES, band + 1)
  const [lo, hi] = spec.bands[band].span as readonly [number, number]
  const span = draw.int(lo, hi)
  const p = property(template, band, draw, vars)
  const reference = negate(p)
  const { options, values } = assembleOptions({
    reference,
    referenceWhy: `A state violates the requirement exactly when its negation holds, and ${render(reference)} is that negation.`,
    mutants: MUTANTS[template as keyof typeof MUTANTS],
    distractors: 3,
    draw: draw.fork('options'),
    render,
  })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Pick the query whose sat answers are violations.', options }
  return {
    family: FIXTURE_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: {
      stem: `Requirement: ${render(p)}, for integers ${vars.join(', ')} from −${span} to ${span}. Which query, if sat, shows a state that violates the requirement?`,
      parts: [part],
    },
    bound: boxBound(vars, span),
    data: { vars, span, property: p, values },
  }
}

function query(port: EnginePort, inst: FixtureInstance, formula: Formula): Promise<Answer<State>> {
  const input: BoxQuery = { op: 'sat', formula, vars: inst.data.vars, span: inst.data.span }
  return ask<BoxQuery, State>(port, { engine: BOX_ENGINE, version: BOX_VERSION, input, budget: { wallMs: 2000, maxStates: BOX_MAX_STATES } })
}

async function key(inst: FixtureInstance, port: EnginePort) {
  const violation = negate(inst.data.property)
  // Non-vacuity: some state of the box violates the requirement, or every violation query would be unsat.
  const v = await query(port, inst, violation)
  if (v.kind === 'unknown') return discard(v.budget ? 'budget' : 'unknown', `the box engine could not decide the requirement: ${v.reason}`)
  if (v.reply.verdict.kind !== 'sat') return discard('vacuous', 'no state of the box violates the requirement')
  const engine = engineAtVersion(v.reply)
  const confirm = async (ref: Formula): Promise<ConfirmResult> => {
    const r = await query(port, inst, xor(ref, violation))
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    return r.reply.verdict.kind === 'unsat' ? { confirmed: true } : { rejected: `it differs from the violation on ${JSON.stringify(r.reply.witness)}` }
  }
  const distinguish = async (a: Formula, b: Formula): Promise<DistinguishResult> => {
    const r = await query(port, inst, xor(a, b))
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    return r.reply.verdict.kind === 'sat' && r.reply.witness !== undefined ? { differ: r.reply.witness as Json } : { same: true }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  return { engine, choices: [choice], statements: [], ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
}

/** The class of a violating state: every state where the requirement's negation holds (M-class-hint). */
export function fixtureClassOf(inst: FixtureInstance): WitnessClass {
  return { id: `${inst.template}:violation`, text: `every state where ${render(negate(inst.data.property))}` }
}

/**
 * A second violating state that differs from the first in every variable, certified by the box engine, or null
 * when the box holds none or the engine cannot decide (M-class-hint's contrast arm; S1.L1's "differs from the
 * first in every variable").
 */
export async function fixtureSecondWitness(inst: FixtureInstance, first: Json, port: EnginePort): Promise<Json | null> {
  if (typeof first !== 'object' || first === null || Array.isArray(first)) return null
  const w = first as Record<string, Json>
  const apart = inst.data.vars.map((v) => rel('!=', { coefs: [{ v, c: 1 }], k: 0 }, typeof w[v] === 'number' ? (w[v] as number) : 0))
  const r = await query(port, inst, and(negate(inst.data.property), ...apart))
  return r.kind === 'verdict' && r.reply.verdict.kind === 'sat' && r.reply.witness !== undefined ? (r.reply.witness as Json) : null
}

/** True when a state is a violation of the instance's requirement (the pocket-checker view of a witness). */
export function fixtureViolates(inst: FixtureInstance, state: State): boolean {
  return evaluate(not(inst.data.property), state)
}

export const fixtureGenerator: Generator<FixtureInstance, FixtureKey> = defineGenerator<FixtureInstance, FixtureKey>({
  id: FIXTURE_ID,
  fixture: true,
  title: 'Framework fixture: negate a requirement over a bounded box',
  templates: TEMPLATES,
  engines: [BOX_ENGINE],
  misconceptions: ['dp:Z1', 'dp:O1', 'dp:G5', 'dp:G4', 'dp:G1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: 'the fixture box engine, every state of the box enumerated', engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure: (inst): Measure => ({
    variables: varsOf(inst.data.property).length,
    atoms: atomsOf(inst.data.property),
    coefficient: maxCoefOf(inst.data.property),
    span: inst.data.span,
  }),
  structure: (inst) => shapeOf(inst.data.property),
  replay: (inst, part, a, b, witness) => {
    if (part !== PART || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
    const fa = inst.data.values[a]
    const fb = inst.data.values[b]
    if (fa === undefined || fb === undefined) return false
    const s = witness as State
    if (!inst.data.vars.every((v) => typeof s[v] === 'number')) return false
    return evaluate(fa, s) !== evaluate(fb, s)
  },
})

/** What GATE-generators reads from a family module: the generator, and ports for engines that run as plain code. */
export const generator = fixtureGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [BOX_ENGINE]: boxPort }
