// GEN-negate-it (ASSESSMENT.md section 4.3): write the violation query for a stated property. This build serves pick
// mode: the learner chooses among the reference query and misconception mutants of it. Four templates, structurally
// different: t1 negates a guard condition, t2 a two-state property after a step (primed variables), t3 a requirement
// quantified over accounts, t4 an English "only if" or "unless" sentence.
//
// Keys are never stored. key() asks the family's checker, the negate box (engine.ts), to confirm the reference
// against the violation it builds itself from the property and the premises, to find a premise witness (t2's
// non-vacuity check) or a violating state, and to tell every pair of options apart on a state. Every verdict rests on
// the box, so every grade prints it as its bound.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { Answer, EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { boxBound, NEGATE_BOX, NEGATE_BOX_MAX_STATES, NEGATE_BOX_VERSION, negateBoxPort } from './engine.ts'
import type { BoxQuery, Domain } from './engine.ts'
import {
  all,
  alternationsOf,
  and,
  atomsOf,
  depthOf,
  evaluate,
  flag,
  idx,
  implies,
  lin,
  negate,
  not,
  num,
  or,
  rel,
  render,
  shapeOf,
  shiftFirstBoundary,
  showVar,
  some,
  term,
  varsOf,
  xor,
} from './formula.ts'
import type { Formula, Rel, State } from './formula.ts'

export { NEGATE_BOX, NEGATE_BOX_MAX_STATES, NEGATE_BOX_VERSION, negateBoxPort } from './engine.ts'
export { evaluate, render } from './formula.ts'
export type { Formula, State } from './formula.ts'

export const NEGATE_IT_ID = 'GEN-negate-it' as const
const PART = 'main'

/** What the basis line of every grade says: the checker and what it tried. */
export const NEGATE_IT_BASIS = 'the negate box in this page: every state of the box tried, keys computed at grade time'

export interface NegateItData {
  /** The variables the checker enumerates, with their ranges. */
  readonly domains: readonly Domain[]
  /** The requirement the item states. */
  readonly property: Formula
  /** What a violation query must assume (t2: the guard, the update and the frame); empty elsewhere. */
  readonly premises: readonly Formula[]
  /** Each option's query, by option id. */
  readonly values: Readonly<Record<string, Formula>>
  /** Measures a formula cannot carry: t4's sentence form (1 only if, 2 reversed or unless, 3 not … unless). */
  readonly form?: number
}

export interface NegateItInstance extends InstanceBase {
  readonly data: NegateItData
}

export interface NegateItKey extends KeyBase {
  /** A state where the premises hold together (the non-vacuity witness), for a template with premises. */
  readonly premise?: Json
  /** A state the violation query accepts, or null when the box holds none (the property holds in the box). */
  readonly violation: Json | null
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'single guard',
    kcs: { primary: 'KC-1.violation-as-sat', secondary: ['KC-1.quantifier-negation'] },
    bands: {
      1: { variables: [2, 2], atoms: [1, 1], depth: [0, 0] },
      2: { variables: [3, 3], atoms: [2, 3], depth: [1, 1] },
      3: { variables: [4, 4], atoms: [4, 5], depth: [2, 2] },
    },
  },
  {
    id: 't2',
    name: 'two-state (primed variables)',
    kcs: { primary: 'KC-1.two-state-property', secondary: ['KC-1.violation-as-sat', 'KC-1.implication-vacuity'] },
    bands: {
      1: { variables: [2, 2], frame: [0, 0] },
      2: { variables: [3, 3], frame: [1, 1] },
      3: { variables: [4, 4], frame: [2, 2] },
    },
  },
  {
    id: 't3',
    name: 'quantified over accounts',
    kcs: { primary: 'KC-1.quantifier-negation', secondary: ['KC-1.violation-as-sat'] },
    bands: {
      1: { accounts: [2, 2], alternations: [0, 0] },
      2: { accounts: [3, 3], alternations: [1, 1] },
      3: { accounts: [4, 4], alternations: [2, 2] },
    },
  },
  {
    id: 't4',
    name: 'English "only if" or "unless"',
    kcs: { primary: 'KC-1.only-if-direction', secondary: ['KC-1.implication-vacuity'] },
    bands: {
      1: { conditions: [1, 1], form: [1, 1] },
      2: { conditions: [1, 1], form: [2, 2] },
      3: { conditions: [2, 2], form: [3, 3] },
    },
  },
]

// ---------------------------------------------------------------- copy

const ASK = 'Pick the query whose sat answers are violations.'

const WHY = {
  assert: 'This is the requirement itself, so a sat answer shows a state that keeps it, not one that breaks it.',
  shift: 'This moves a boundary by one. On the boundary itself it disagrees with the violation, so it reports a state that keeps the requirement or misses one that breaks it.',
  swapSides: 'This swaps the two sides instead of negating the comparison. Swapping the sides turns the comparison around; it does not negate it, so this query and the violation disagree on some states.',
  keepConnective: 'Negating an "and" gives an "or", and negating an "or" gives an "and". This negates each part but keeps the connective, so it asks for the wrong combination of failures.',
  flipConnective: 'This swaps "and" and "or" but leaves each part as it was: half of De Morgan\'s law. It accepts states that keep the requirement.',
  dropGuard: 'This drops the guard from the premises, so its sat answers include steps that never run: states where the guard is false.',
  stepImplication: 'An implication holds whenever its premises are false, so this query is satisfied by states where the step never runs. Its sat answers prove nothing.',
  stepAssert: 'This asks for a step that keeps the property. A sat answer shows a good step, not a violation.',
  keepQuantifiers: 'This negates the body but leaves the quantifiers as they were. ¬∀ is ∃¬ and ¬∃ is ∀¬, so every quantifier must flip; as written it misses states where only some accounts break the requirement.',
  swapQuantifiers: 'This flips the quantifiers but not the body: half of the negation. It accepts states where the requirement holds.',
  converse: (cond: string): string => `This looks for a refusal when ${cond}: a violation of the converse, which the sentence never states. "P only if Q" and "not P unless Q" both say P → Q, so the arrow points from ok to the condition.`,
  biconditional: 'This violates "if and only if". Refusing when the condition holds breaks no "only if", so this query also reports states that keep the requirement.',
  falseAntecedent: 'An implication holds whenever ok is false, so this query is satisfied by every refused case. Its sat answers prove nothing.',
} as const

// ---------------------------------------------------------------- helpers

/** Each relation and flag negated, every connective kept. */
function negateAtoms(f: Formula): Formula {
  switch (f.f) {
    case 'rel':
    case 'flag':
    case 'idx':
      return negate(f)
    case 'not':
      return f.arg
    case 'and':
      return and(...f.args.map(negateAtoms))
    case 'or':
      return or(...f.args.map(negateAtoms))
    case 'implies':
      return implies(negateAtoms(f.lhs), negateAtoms(f.rhs))
    case 'all':
    case 'some':
      return { ...f, body: negateAtoms(f.body) }
  }
}

/** Every "and" turned into "or" and back, the atoms kept. */
function swapConnectives(f: Formula): Formula {
  switch (f.f) {
    case 'and':
      return or(...f.args.map(swapConnectives))
    case 'or':
      return and(...f.args.map(swapConnectives))
    case 'not':
      return not(swapConnectives(f.arg))
    default:
      return f
  }
}

/** The quantifier prefix and the body under it. */
function prefixOf(f: Formula): { prefix: { q: 'all' | 'some'; ix: string; over: readonly number[] }[]; body: Formula } {
  const prefix: { q: 'all' | 'some'; ix: string; over: readonly number[] }[] = []
  let g = f
  while (g.f === 'all' || g.f === 'some') {
    prefix.push({ q: g.f, ix: g.ix, over: g.over })
    g = g.body
  }
  return { prefix, body: g }
}

function requantify(prefix: readonly { q: 'all' | 'some'; ix: string; over: readonly number[] }[], body: Formula): Formula {
  let out = body
  for (let i = prefix.length - 1; i >= 0; i--) {
    const p = prefix[i] as { q: 'all' | 'some'; ix: string; over: readonly number[] }
    out = p.q === 'all' ? all(p.ix, p.over, out) : some(p.ix, p.over, out)
  }
  return out
}

const dual = (q: 'all' | 'some'): 'all' | 'some' => (q === 'all' ? 'some' : 'all')

const ints = (vars: readonly string[], lo: number, hi: number): Domain[] => vars.map((v) => ({ v, kind: 'int' as const, lo, hi }))

/** "a (the sender's balance), x (the amount)" */
const gloss = (vars: readonly string[], meaning: Readonly<Record<string, string>>): string => vars.map((v) => `\`${showVar(v)}\` (${meaning[v] ?? v})`).join(', ')

const fixed = (tag: Mutant<Formula>['tag'], operator: string, why: string, value: Formula | null): Mutant<Formula> => ({ tag, operator, why: () => why, apply: () => value })

const COMPARISONS: readonly Rel[] = ['<', '<=', '>', '>=']

/** One relation between two variables: u op v + k. */
function atom(draw: SeededDraw, u: string, v: string): Formula {
  return rel(term(u), draw.pick(COMPARISONS), term(v, draw.int(-1, 1)))
}

// ---------------------------------------------------------------- t1: single guard

const T1_MEANING: Readonly<Record<string, string>> = { a: "the sender's balance", x: 'the amount', l: 'the daily limit', f: 'the fee' }

interface Built {
  readonly stem: string
  readonly property: Formula
  readonly premises: readonly Formula[]
  readonly reference: Formula
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<Formula>[]
  readonly distractors: number
  readonly domains: readonly Domain[]
  readonly form?: number
}

function t1(band: Band, draw: SeededDraw): Built {
  const vars = draw.sample(['a', 'x', 'l', 'f'], band + 1)
  const [v0, v1, v2, v3] = vars as [string, string, string?, string?]
  let p: Formula
  if (band === 1) p = atom(draw, v0, v1)
  else if (band === 2) {
    const c = draw.bool() ? and : or
    p = c(atom(draw, v0, v1), atom(draw, v2 as string, draw.pick([v0, v1])))
  } else {
    const outerAnd = draw.bool()
    const inner = outerAnd ? or : and
    const outer = outerAnd ? and : or
    p = outer(inner(atom(draw, v0, v1), atom(draw, v2 as string, v3 as string)), inner(atom(draw, v0, v2 as string), atom(draw, v1, v3 as string)))
  }
  const reference = negate(p)
  const mutants: Mutant<Formula>[] = [fixed('dp:Z1', 'assert the requirement', WHY.assert, p), fixed('dp:O1', 'shift a boundary', WHY.shift, shiftFirstBoundary(reference))]
  if (band === 1 && p.f === 'rel') mutants.push(fixed('dp:G5', 'swap the sides', WHY.swapSides, rel(p.rhs, (reference as Extract<Formula, { f: 'rel' }>).op, p.lhs)))
  else {
    mutants.push(fixed('dp:G5', 'keep the connective', WHY.keepConnective, negateAtoms(p)))
    mutants.push(fixed('dp:G5', 'flip the connective only', WHY.flipConnective, swapConnectives(p)))
  }
  return {
    stem: `Requirement: \`${render(p)}\`. Variables: ${gloss(vars, T1_MEANING)}, each an integer from 0 to 4. Which query, if sat, shows a state that violates the requirement?`,
    property: p,
    premises: [],
    reference,
    referenceWhy: `A state violates the requirement exactly when the requirement is false there, and \`${render(reference)}\` is its negation.`,
    mutants,
    distractors: 3,
    domains: ints(vars, 0, 4),
  }
}

// ---------------------------------------------------------------- t2: two-state

const T2_MEANING: Readonly<Record<string, string>> = { a: "the account's balance", x: 'the amount withdrawn', b: "a second account's balance", f: 'the fee' }

function t2(band: Band, draw: SeededDraw): Built {
  const k = draw.int(0, 1)
  const gop: Rel = draw.pick(['<', '<='])
  const m = draw.int(0, 1)
  let guard: Formula
  const step: Formula[] = []
  const frame: Formula[] = []
  let vars: string[]
  let domains: Domain[]
  if (band === 1) {
    vars = ['a', 'x']
    guard = rel(term('x'), gop, term('a', k))
    step.push(rel(term("a'"), '=', lin([{ v: 'a', c: 1 }, { v: 'x', c: -1 }])))
    domains = [...ints(['a', 'x'], 0, 3), { v: "a'", kind: 'int', lo: -3, hi: 3 }]
  } else if (band === 2) {
    vars = ['a', 'x', 'b']
    // The guard may read the wrong account's balance, as the course's first exercise does.
    guard = rel(term('x'), gop, term(draw.pick(['a', 'b']), k))
    step.push(rel(term("a'"), '=', lin([{ v: 'a', c: 1 }, { v: 'x', c: -1 }])))
    frame.push(rel(term("b'"), '=', term('b')))
    domains = [...ints(['a', 'x', 'b'], 0, 3), { v: "a'", kind: 'int', lo: -3, hi: 3 }, { v: "b'", kind: 'int', lo: 0, hi: 3 }]
  } else {
    vars = ['a', 'x', 'b', 'f']
    // The guard may forget the fee.
    guard = draw.bool() ? rel(lin([{ v: 'x', c: 1 }, { v: 'f', c: 1 }]), gop, term('a', k)) : rel(term('x'), gop, term('a', k))
    step.push(rel(term("a'"), '=', lin([{ v: 'a', c: 1 }, { v: 'x', c: -1 }, { v: 'f', c: -1 }])))
    frame.push(rel(term("b'"), '=', term('b')), rel(term("f'"), '=', term('f')))
    domains = [...ints(['a', 'x', 'b', 'f'], 0, 3), { v: "a'", kind: 'int', lo: -6, hi: 3 }, { v: "b'", kind: 'int', lo: 0, hi: 3 }, { v: "f'", kind: 'int', lo: 0, hi: 3 }]
  }
  const p = rel(term("a'"), '>=', num(m))
  const premises = [guard, ...step, ...frame]
  const notP = negate(p)
  const reference = and(...premises, notP)
  const mutants: Mutant<Formula>[] = [
    fixed('dp:Z1', 'assert the property', WHY.stepAssert, and(...premises, p)),
    fixed('dp:Z5', 'drop the guard', WHY.dropGuard, and(...step, ...frame, notP)),
    fixed('dp:G4', 'premises as an implication', WHY.stepImplication, implies(and(...premises), notP)),
    fixed('dp:O1', 'shift the boundary', WHY.shift, and(...premises, shiftFirstBoundary(notP) as Formula)),
  ]
  const updates = [...step, ...frame].map((f) => `\`${render(f)}\``).join(', ')
  return {
    stem: `A withdrawal step runs only when its guard \`${render(guard)}\` holds, and then sets ${updates}. Property after the step: \`${render(p)}\`. Variables: ${gloss(vars, T2_MEANING)}, each an integer from 0 to 3; a primed variable is its value after the step. Which query, if sat, shows a step that violates the property?`,
    property: p,
    premises,
    reference,
    referenceWhy: 'A violating step is one the guard lets through, with the update and frame as stated, that ends in a state where the property is false: the premises, then the negation of the property.',
    mutants,
    distractors: 3,
    domains,
  }
}

// ---------------------------------------------------------------- t3: quantified over accounts

function t3(band: Band, draw: SeededDraw): Built {
  const n = band + 1
  const over = Array.from({ length: n }, (_, i) => i + 1)
  let p: Formula
  if (band === 1) {
    const op: Rel = draw.pick(['>=', '<='])
    p = all('i', over, rel(term('bal[i]'), op, num(draw.int(1, 2))))
  } else if (band === 2) {
    p = all('i', over, some('j', over, and(idx('i', '!=', 'j'), rel(term('bal[j]'), draw.pick(['>=', '<=']), term('bal[i]', draw.int(0, 1))))))
  } else {
    p = all('i', over, some('j', over, all('k', over, and(idx('j', '!=', 'i'), rel(term('bal[k]'), draw.pick(['<=', '>=']), term('bal[j]', draw.int(0, 1)))))))
  }
  const { prefix, body } = prefixOf(p)
  const reference = negate(p)
  const mutants: Mutant<Formula>[] = [
    fixed('dp:Z1', 'assert the requirement', WHY.assert, p),
    fixed('dp:G5', 'negate the body only', WHY.keepQuantifiers, requantify(prefix, negate(body))),
    fixed('dp:G5', 'flip the quantifiers only', WHY.swapQuantifiers, requantify(prefix.map((q) => ({ ...q, q: dual(q.q) })), body)),
    fixed('dp:O1', 'shift the boundary', WHY.shift, shiftFirstBoundary(reference)),
  ]
  return {
    stem: `Requirement over accounts 1 to ${n}: \`${render(p)}\`, where \`bal[i]\` is account i's balance, an integer from 0 to 3. Which query, if sat, shows a state that violates the requirement?`,
    property: p,
    premises: [],
    reference,
    referenceWhy: `Negating swaps every ∀ for ∃ and every ∃ for ∀, and negates the body: \`${render(reference)}\` holds exactly when the requirement fails.`,
    mutants,
    distractors: 3,
    domains: ints(
      over.map((i) => `bal[${i}]`),
      0,
      3,
    ),
  }
}

// ---------------------------------------------------------------- t4: English "only if" and "unless"

interface Story {
  readonly ok: string
  readonly meaning: Readonly<Record<string, string>>
  readonly conds: readonly [{ readonly atom: Formula; readonly says: string }, { readonly atom: Formula; readonly says: string }]
  readonly onlyIf: (c: string) => string
  readonly reversed: (c: string) => string
  readonly unless: (c: string) => string
  readonly notUnless: (c: string) => string
}

const STORIES: readonly Story[] = [
  {
    ok: 'the transfer is allowed',
    meaning: { a: "the sender's balance", x: 'the amount', l: 'the daily limit' },
    conds: [
      { atom: rel(term('a'), '>=', term('x')), says: "the sender's balance covers the amount" },
      { atom: rel(term('x'), '<=', term('l')), says: 'the amount is within the daily limit' },
    ],
    onlyIf: (c) => `A transfer is allowed only if ${c}.`,
    reversed: (c) => `Only if ${c} is a transfer allowed.`,
    unless: (c) => `A transfer is refused unless ${c}.`,
    notUnless: (c) => `No transfer is allowed unless ${c}.`,
  },
  {
    ok: 'the order ships',
    meaning: { p: 'the amount paid', c: 'the price', s: 'the units in stock' },
    conds: [
      { atom: rel(term('p'), '>=', term('c')), says: 'the payment covers the price' },
      { atom: rel(term('s'), '>=', num(1)), says: 'the item is in stock' },
    ],
    onlyIf: (c) => `An order ships only if ${c}.`,
    reversed: (c) => `Only if ${c} does an order ship.`,
    unless: (c) => `An order is held unless ${c}.`,
    notUnless: (c) => `No order ships unless ${c}.`,
  },
  {
    ok: 'the withdrawal is approved',
    meaning: { x: 'the amount', l: 'the daily limit', a: 'the balance' },
    conds: [
      { atom: rel(term('x'), '<=', term('l')), says: 'the amount is within the daily limit' },
      { atom: rel(term('x'), '<=', term('a')), says: 'the balance covers the amount' },
    ],
    onlyIf: (c) => `A withdrawal is approved only if ${c}.`,
    reversed: (c) => `Only if ${c} is a withdrawal approved.`,
    unless: (c) => `A withdrawal is declined unless ${c}.`,
    notUnless: (c) => `No withdrawal is approved unless ${c}.`,
  },
]

function t4(band: Band, draw: SeededDraw): Built {
  const story = draw.pick(STORIES)
  const [c0, c1] = story.conds
  const cond = band === 3 ? and(c0.atom, c1.atom) : c0.atom
  const says = band === 3 ? `${c0.says} and ${c1.says}` : c0.says
  const sentence = band === 1 ? story.onlyIf(says) : band === 2 ? (draw.bool() ? story.reversed(says) : story.unless(says)) : story.notUnless(says)
  const ok = flag('ok')
  const p = implies(ok, cond)
  const reference = negate(p)
  const notCond = negate(cond)
  const mutants: Mutant<Formula>[] = [
    fixed('dp:G1', 'violate the converse', WHY.converse(says), and(cond, not(ok))),
    fixed('dp:G1', 'violate the biconditional', WHY.biconditional, or(and(ok, notCond), and(not(ok), cond))),
    fixed('dp:Z1', 'assert the requirement', WHY.assert, p),
    fixed('dp:G4', 'negate the consequent only', WHY.falseAntecedent, implies(ok, notCond)),
  ]
  const ints4 = varsOf(cond)
  return {
    stem: `Requirement: "${sentence}" Variables: \`ok\`, true when ${story.ok}; ${gloss(ints4, story.meaning)}, each an integer from 0 to 4. Which query, if sat, shows a state that violates the requirement?`,
    property: p,
    premises: [],
    reference,
    referenceWhy: `The sentence says \`ok → ${render(cond)}\`: whenever ${story.ok}, ${says}. A violation is a case where ${story.ok} and the condition fails: \`${render(reference)}\`.`,
    mutants,
    distractors: 4,
    domains: [{ v: 'ok', kind: 'flag' }, ...ints(ints4, 0, 4)],
    form: band,
  }
}

const BUILDERS: Readonly<Record<TemplateId, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3, t4 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): NegateItInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${NEGATE_IT_ID} has no template ${String(template)}`)
  // One stream per template and band, so a seed gives unrelated instances in different cells.
  const draw = createDraw(deriveSeed(seed, `${NEGATE_IT_ID}/${template}/b${band}`))
  const b = build(band, draw)
  const { options, values } = assembleOptions({
    reference: b.reference,
    referenceWhy: b.referenceWhy,
    mutants: b.mutants,
    distractors: b.distractors,
    draw: draw.fork('options'),
    render,
  })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: ASK, options }
  return {
    family: NEGATE_IT_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: b.stem, parts: [part] },
    bound: boxBound(b.domains),
    data: { domains: b.domains, property: b.property, premises: b.premises, values, ...(b.form === undefined ? {} : { form: b.form }) },
  }
}

function query(port: EnginePort, inst: NegateItInstance, formula: Formula): Promise<Answer<State>> {
  const input: BoxQuery = { op: 'sat', formula, domains: inst.data.domains }
  return ask<BoxQuery, State>(port, { engine: NEGATE_BOX, version: NEGATE_BOX_VERSION, input, budget: { wallMs: 2000, maxStates: NEGATE_BOX_MAX_STATES } })
}

/** The violation query the checker builds itself, from the property and the premises, never from the options. */
export function violationOf(inst: Pick<NegateItInstance, 'data'>): Formula {
  return and(...inst.data.premises, negate(inst.data.property))
}

async function key(inst: NegateItInstance, port: EnginePort) {
  const violation = violationOf(inst)
  let premise: Json | undefined
  // Non-vacuity: the premises can hold together, or every violation query would be unsat (ASSESSMENT.md 4.3, step 2).
  if (inst.data.premises.length > 0) {
    const pre = await query(port, inst, and(...inst.data.premises))
    if (pre.kind === 'unknown') return discard(pre.budget ? 'budget' : 'unknown', `the negate box could not decide the premises: ${pre.reason}`)
    if (pre.reply.verdict.kind !== 'sat' || pre.reply.witness === undefined) return discard('vacuous', 'no state of the box satisfies the premises')
    premise = pre.reply.witness as Json
  }
  const v = await query(port, inst, violation)
  if (v.kind === 'unknown') return discard(v.budget ? 'budget' : 'unknown', `the negate box could not decide the violation: ${v.reason}`)
  const found = v.reply.verdict.kind === 'sat' && v.reply.witness !== undefined ? (v.reply.witness as Json) : null
  // Without premises, a requirement no state of the box breaks makes a dull item: redraw.
  if (found === null && inst.data.premises.length === 0) return discard('vacuous', 'no state of the box violates the requirement')
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
  const k: NegateItKey = {
    engine,
    choices: [choice],
    statements: [],
    violation: found,
    ...(premise === undefined ? {} : { premise }),
    ...(inst.bound === undefined ? {} : { bound: inst.bound }),
  }
  return k
}

function measure(inst: NegateItInstance): Measure {
  const p = inst.data.property
  switch (inst.template) {
    case 't1':
      return { variables: varsOf(p).length, atoms: atomsOf(p), depth: depthOf(p) }
    case 't2':
      return { variables: inst.data.domains.filter((d) => !d.v.endsWith("'")).length, frame: Math.max(0, inst.data.premises.length - 2) }
    case 't3':
      return { accounts: inst.data.domains.length, alternations: alternationsOf(p) }
    case 't4':
      return { conditions: atomsOf(p) - 1, form: inst.data.form ?? 0 }
  }
}

export const negateItGenerator: Generator<NegateItInstance, NegateItKey> = defineGenerator<NegateItInstance, NegateItKey>({
  id: NEGATE_IT_ID,
  fixture: false,
  title: 'Negate it: the violation query for a stated property',
  templates: TEMPLATES,
  engines: [NEGATE_BOX],
  misconceptions: ['dp:Z1', 'dp:O1', 'dp:G5', 'dp:Z5', 'dp:G4', 'dp:G1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: NEGATE_IT_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  // Premises (t2 only) then the property: primed relations, quantifiers and flags keep the four shapes apart.
  structure: (inst) => `${inst.data.premises.map(shapeOf).join(',')}|${shapeOf(inst.data.property)}`,
  replay: (inst, part, a, b, witness) => {
    if (part !== PART || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
    const fa = inst.data.values[a]
    const fb = inst.data.values[b]
    if (fa === undefined || fb === undefined) return false
    const s = witness as State
    if (!inst.data.domains.every((d) => (d.kind === 'flag' ? typeof s[d.v] === 'boolean' : typeof s[d.v] === 'number'))) return false
    return evaluate(fa, s) !== evaluate(fb, s)
  },
})

/** What GATE-generators and the site read from a family module: the generator, and ports for engines it runs as plain code. */
export const generator = negateItGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [NEGATE_BOX]: negateBoxPort }
