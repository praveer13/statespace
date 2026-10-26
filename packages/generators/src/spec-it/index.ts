// GEN-spec-it (ASSESSMENT.md section 4.4): a specification from an English requirement. This build serves pick mode:
// the learner chooses, among the reference and misconception mutants of it, the specification that says exactly what
// the requirement says. Three templates, structurally different: t1 a property (a formula over a state, with
// quantifiers over accounts from band 2), t2 a policy (Datalog rules over the S7 world's relations), t3 a
// postcondition with its frame (a formula over the state before and after Pay).
//
// Keys are never stored. key() asks the family's checker, the spec scope (engine.ts), to compare the reference with
// the requirement itself, which the checker reads from the instance data without looking at any option: the
// property's story predicate, the policy's story, or the command run on every pre-state. The reference must agree
// with it on every point of the printed scope, and every pair of options must disagree on some point, which is kept
// as the option's witness. Every verdict rests on the scope, so every grade prints it as its bound.
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
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { disagreeAt, readAt, SPEC_SCOPE, SPEC_SCOPE_MAX_POINTS, SPEC_SCOPE_VERSION, specScopePort } from './engine.ts'
import type { CommandStory, DifferQuery, PolicyStory, PropertyStory, Space, Spec, Witness } from './engine.ts'
import { add, all, alternationsOf, and, arr, atomsOf, flag, iff, implies, ixEq, ixNe, num, or, quantifiersOf, rel, render, shapeOf, some, sub, v } from './formula.ts'
import type { Formula, Rel, Term } from './formula.ts'
import { negationsOf, relationsOf, renderPolicy } from './policy.ts'
import type { Lit, Policy, Rule } from './policy.ts'

export { SPEC_SCOPE, SPEC_SCOPE_MAX_POINTS, SPEC_SCOPE_VERSION, specScopePort } from './engine.ts'
export { evaluate, render } from './formula.ts'
export { grants, renderPolicy } from './policy.ts'

export const SPEC_IT_ID = 'GEN-spec-it' as const
const PART = 'main'

export const SPEC_IT_BASIS = 'the spec scope in this page: every point of the printed scope tried against the requirement itself, at grade time (not Z3)'

/** One option's specification: a formula (t1, t3) or a policy (t2). */
export type SpecValue = { readonly kind: 'formula'; readonly f: Formula } | { readonly kind: 'policy'; readonly p: Policy }

export interface SpecItData {
  /** The scope the checker enumerates. */
  readonly space: Space
  /** The requirement as the checker reads it, never from an option. */
  readonly requirement: Spec
  /** Each option's specification, by option id. */
  readonly values: Readonly<Record<string, SpecValue>>
  /** The reference's measures: atoms and quantifiers (t1), rules and relations (t2), fields and accounts (t3). */
  readonly measure: Measure
  /** The reference's shape, literals erased. */
  readonly shape: string
}

export interface SpecItInstance extends InstanceBase {
  readonly data: SpecItData
}

export interface SpecItKey extends KeyBase {
  /** How many points of the scope the reference was checked on against the requirement. */
  readonly points: number
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'property',
    kcs: { primary: 'KC-4.vc-shape', secondary: ['KC-7.policy-checking'] },
    bands: {
      1: { atoms: [1, 2], quantifiers: [0, 0], alternations: [0, 0] },
      2: { atoms: [3, 3], quantifiers: [1, 1], alternations: [0, 0] },
      3: { atoms: [4, 4], quantifiers: [2, 2], alternations: [1, 1] },
    },
  },
  {
    id: 't2',
    name: 'policy',
    kcs: { primary: 'KC-7.policy-as-datalog', secondary: ['KC-7.policy-checking'] },
    bands: {
      1: { rules: [1, 1], relations: [2, 2], negations: [0, 0] },
      2: { rules: [2, 2], relations: [3, 3], negations: [0, 0] },
      3: { rules: [3, 3], relations: [4, 5], negations: [1, 1] },
    },
  },
  {
    id: 't3',
    name: 'postcondition with frame',
    kcs: { primary: 'KC-4.frame-condition', secondary: ['KC-4.vc-shape'] },
    bands: {
      1: { written: [1, 1], accounts: [2, 2], aliasing: [0, 0] },
      2: { written: [2, 2], accounts: [3, 3], aliasing: [0, 0] },
      3: { written: [3, 3], accounts: [4, 4], aliasing: [1, 1] },
    },
  },
]

// ---------------------------------------------------------------- shared

interface Built {
  readonly stem: string
  readonly ask: string
  readonly space: Space
  readonly requirement: Spec
  readonly reference: SpecValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<SpecValue>[]
  readonly distractors: number
  readonly bound: string
  readonly measure: Measure
  readonly shape: string
}

const F = (f: Formula): SpecValue => ({ kind: 'formula', f })
const P = (p: Policy): SpecValue => ({ kind: 'policy', p })
const renderValue = (s: SpecValue): string => (s.kind === 'formula' ? render(s.f) : renderPolicy(s.p))
const asSpec = (s: SpecValue): Spec => (s.kind === 'formula' ? { kind: 'formula', f: s.f } : { kind: 'policy', p: s.p })

const fixed = (tag: MisconceptionKey, operator: string, why: string, value: SpecValue): Mutant<SpecValue> => ({ tag, operator, why: () => why, apply: () => value })

// ---------------------------------------------------------------- t1: property

const le = (strict: boolean): Rel => (strict ? '<' : '<=')
const flip = (op: Rel): Rel => (op === '<' ? '<=' : op === '<=' ? '<' : op === '>' ? '>=' : op === '>=' ? '>' : op)

function t1(band: Band, draw: SeededDraw): Built {
  const strict = draw.bool()
  if (band === 1) {
    const story = draw.pick(['only-if', 'positive-covered'] as const)
    const req: PropertyStory = { story, strict }
    const atMost = strict ? 'less than' : 'at most'
    const covered = rel(v('x'), le(strict), v('a'))
    const coveredOff = rel(v('x'), flip(le(strict)), v('a'))
    if (story === 'only-if') {
      const ok = flag('ok')
      const ref = implies(ok, covered)
      return {
        stem: `Requirement: "A transfer is allowed only if the amount is ${atMost} the balance." Variables: \`ok\`, true when the transfer is allowed; \`a\`, the balance; \`x\`, the amount; each integer from 0 to 4.`,
        ask: 'Pick the property that says exactly what the requirement says.',
        space: { kind: 'box', accounts: 0, dims: [{ kind: 'flag', v: 'ok' }, { kind: 'int', v: 'a', lo: 0, hi: 4 }, { kind: 'int', v: 'x', lo: 0, hi: 4 }] },
        requirement: { kind: 'property', req },
        reference: F(ref),
        referenceWhy: `"P only if Q" is P → Q: whenever the transfer is allowed, the amount is ${atMost} the balance. A refused transfer breaks nothing.`,
        mutants: [
          fixed('dp:G1', 'the converse', 'This is the converse, "a transfer is allowed if the balance covers it". The sentence never says a covered transfer must be allowed.', F(implies(covered, ok))),
          fixed('dp:G1', 'the biconditional', 'This reads "only if" as "if and only if", so it also forbids refusing a covered transfer, which the sentence allows.', F(iff(ok, covered))),
          fixed('dp:O1', 'shift the boundary', `This moves the boundary by one: on \`x = a\` it disagrees with "${atMost}".`, F(implies(ok, coveredOff))),
          fixed('dp:O2', 'too strong', 'This demands that every state be an allowed, covered transfer. A refused transfer keeps the requirement, and this property rejects it.', F(and(ok, covered))),
        ],
        distractors: 3,
        bound: 'every state with ok true or false and a, x from 0 to 4',
        measure: { atoms: atomsOf(ref), quantifiers: 0, alternations: 0 },
        shape: shapeOf(ref),
      }
    }
    const pos = rel(v('x'), '>', num(0))
    const ref = and(pos, covered)
    return {
      stem: `Requirement: "The amount is positive and ${atMost} the balance." Variables: \`a\`, the balance, an integer from 0 to 4; \`x\`, the amount, an integer from −1 to 4.`,
      ask: 'Pick the property that says exactly what the requirement says.',
      space: { kind: 'box', accounts: 0, dims: [{ kind: 'int', v: 'a', lo: 0, hi: 4 }, { kind: 'int', v: 'x', lo: -1, hi: 4 }] },
      requirement: { kind: 'property', req },
      reference: F(ref),
      referenceWhy: `Both conditions must hold: \`x > 0\` for positive and \`${render(covered)}\` for ${atMost} the balance.`,
      mutants: [
        fixed('dp:O1', 'zero counted as positive', 'This lets the amount be 0, and 0 is not positive.', F(and(rel(v('x'), '>=', num(0)), covered))),
        fixed('dp:O1', 'shift the boundary', `This moves the boundary by one: on \`x = a\` it disagrees with "${atMost}".`, F(and(pos, coveredOff))),
        fixed('dp:O2', 'drop a condition', 'This drops "positive", so a zero amount passes.', F(covered)),
        fixed('dp:Z5', 'or for and', 'This joins the conditions with "or", so an amount that meets only one of them passes.', F(or(pos, covered))),
      ],
      distractors: 3,
      bound: 'every state with a from 0 to 4 and x from −1 to 4',
      measure: { atoms: atomsOf(ref), quantifiers: 0, alternations: 0 },
      shape: shapeOf(ref),
    }
  }
  if (band === 2) {
    const req: PropertyStory = { story: 'capped', strict }
    const below = strict ? 'below' : 'up to'
    const cPos = rel(v('c'), '>=', num(2))
    const lo = (ix: string | number): Formula => rel(num(0), '<=', arr('bal', ix))
    const hi = (ix: string | number, op: Rel): Formula => rel(arr('bal', ix), op, v('c'))
    const ref = and(cPos, all('i', and(lo('i'), hi('i', le(strict)))))
    return {
      stem: `Requirement: "The cap is at least 2, and every account's balance is from 0 ${below} the cap." Variables: \`c\`, the cap, an integer from 0 to 3; \`bal(i)\`, account i's balance for accounts 1 to 3, each an integer from −1 to 3.`,
      ask: 'Pick the property that says exactly what the requirement says.',
      space: { kind: 'box', accounts: 3, dims: [{ kind: 'int', v: 'c', lo: 0, hi: 3 }, { kind: 'array', a: 'bal', lo: -1, hi: 3 }] },
      requirement: { kind: 'property', req },
      reference: F(ref),
      referenceWhy: `"Every account" is one ∀ over the accounts, with both bounds inside it, beside the condition on the cap.`,
      mutants: [
        fixed('dp:G6', 'every read as some', 'This says some account is within the bounds. "Every account" is a ∀: each account must be.', F(and(cPos, some('i', and(lo('i'), hi('i', le(strict))))))),
        fixed('dp:O1', 'shift the upper bound', `This moves the upper bound by one: a balance equal to the cap is ${strict ? 'not below it' : 'up to it'}.`, F(and(cPos, all('i', and(lo('i'), hi('i', flip(le(strict)))))))),
        fixed('dp:O1', 'shift the lower bound', 'This moves the lower bound by one, so a zero balance fails, though "from 0" includes it.', F(and(cPos, all('i', and(rel(num(0), '<', arr('bal', 'i')), hi('i', le(strict))))))),
        fixed('dp:O2', 'drop a condition', 'This drops "the cap is at least 2", so a cap of 1 with every balance 0 passes.', F(all('i', and(lo('i'), hi('i', le(strict)))))),
        fixed('dp:A2', 'one account for all', 'This bounds every balance below by 0 but checks the cap on account 1 alone: a constraint set once, not per account.', F(and(cPos, all('i', lo('i')), hi(1, le(strict))))),
      ],
      distractors: 4,
      bound: 'every state with c from 0 to 3 and bal(1) to bal(3) from −1 to 3',
      measure: { atoms: atomsOf(ref), quantifiers: quantifiersOf(ref), alternations: alternationsOf(ref) },
      shape: shapeOf(ref),
    }
  }
  // Only "at least as much": with "more than", the largest account in credit can never be backed, so the property
  // would hold only when no account is in credit and most options would coincide in the box.
  const req: PropertyStory = { story: 'backed', strict: false }
  const much = 'at least as much as'
  const cover = (op: Rel): Formula => rel(arr('bal', 'j'), op, arr('bal', 'i'))
  const op: Rel = '>='
  const body = (parts: Formula[]): Formula => and(...parts)
  const ref = all('i', implies(rel(arr('bal', 'i'), '>', num(0)), some('j', body([ixNe('j', 'i'), rel(arr('fz', 'j'), '=', num(0)), cover(op)]))))
  return {
    stem: `Requirement: "Every account in credit is backed by a different account that is not frozen and holds ${much} it." Variables, for accounts 1 to 3: \`bal(i)\`, account i's balance, an integer from 0 to 2; \`fz(i)\`, 1 when account i is frozen and 0 when it is not.`,
    ask: 'Pick the property that says exactly what the requirement says.',
    space: { kind: 'box', accounts: 3, dims: [{ kind: 'array', a: 'bal', lo: 0, hi: 2 }, { kind: 'array', a: 'fz', lo: 0, hi: 1 }] },
    requirement: { kind: 'property', req },
    reference: F(ref),
    referenceWhy: 'For each account i in credit there is some j, chosen after i, that is a different account, not frozen, and large enough: ∀i then ∃j.',
    mutants: [
      fixed('dp:G6', 'quantifiers swapped', 'This puts ∃j before ∀i: one single account must back every account in credit, which the requirement does not ask.', F(some('j', all('i', implies(rel(arr('bal', 'i'), '>', num(0)), body([ixNe('j', 'i'), rel(arr('fz', 'j'), '=', num(0)), cover(op)])))))),
      fixed('dp:O2', 'drop "different"', 'This drops `j ≠ i`, so an unfrozen account can back itself.', F(all('i', implies(rel(arr('bal', 'i'), '>', num(0)), some('j', body([rel(arr('fz', 'j'), '=', num(0)), cover(op)])))))),
      fixed('dp:O2', 'drop "not frozen"', 'This drops the frozen test, so a frozen account counts as backing.', F(all('i', implies(rel(arr('bal', 'i'), '>', num(0)), some('j', body([ixNe('j', 'i'), cover(op)])))))),
      fixed('dp:O1', 'shift the boundary', 'This asks for a backer for every account at 0 or above. An account at 0 is not in credit, so the requirement asks nothing of it.', F(all('i', implies(rel(arr('bal', 'i'), '>=', num(0)), some('j', body([ixNe('j', 'i'), rel(arr('fz', 'j'), '=', num(0)), cover(op)])))))),
      fixed('dp:A2', 'some read as every', 'This asks every other account to back i: an extra ∀ where the requirement asks for one backer.', F(all('i', implies(rel(arr('bal', 'i'), '>', num(0)), all('j', implies(ixNe('j', 'i'), body([rel(arr('fz', 'j'), '=', num(0)), cover(op)]))))))),
    ],
    distractors: 4,
    bound: 'every state with bal(1) to bal(3) from 0 to 2 and fz(1) to fz(3) 0 or 1',
    measure: { atoms: atomsOf(ref), quantifiers: quantifiersOf(ref), alternations: alternationsOf(ref) },
    shape: shapeOf(ref),
  }
}

// ---------------------------------------------------------------- t2: policy

const L = (p: string, ...args: Lit['args']): Lit => ({ p, args })
const N = (p: string, ...args: Lit['args']): Lit => ({ p, args, neg: true })
const rule = (body: Lit[], head = 'canread'): Rule => ({ head: { p: head, args: ['u', 'd'] }, body })

const OWNER = rule([L('member', 'u', 't'), L('owns', 't', 'd')])
const DIRECT = rule([L('share_user', 'd', 'u')])
const DIRECT_REV = rule([L('share_user', 'd', 'u'), N('revoked', 'd', 'u')])
const TEAM = rule([L('member', 'u', 't'), L('share_team', 'd', 't')])
/** "Every team of the user owns d": a subset test, vacuously true for a user on no team. */
const SUBSET_OWNER: Rule[] = [rule([L('member', 'u', 't'), N('owns', 't', 'd')], 'gap'), rule([L('user', 'u'), L('doc', 'd'), N('gap', 'u', 'd')])]
const SET_LEVEL_OWNER = rule([L('member', 'u', 't'), L('owns', 't2', 'd')])
const ANYONE = rule([L('user', 'u'), L('doc', 'd')])

function t2(band: Band, draw: SeededDraw): Built {
  const may = draw.pick(['may read', 'can read'])
  const teams = band === 3 ? 3 : 2
  const space: Space = { kind: 'worlds', teams }
  const bound = `every user–document pair of every world with up to ${teams} teams (each policy here reads only that pair's facts)`
  const lang = 'Rules are Datalog: `canread(u, d) :- …` grants a read when every literal holds, `!` negates a literal, and several rules for one head are alternatives. Relations: `member(u, t)` (u is on team t), `owns(t, d)` (team t owns d)'
  const done = (req: PolicyStory, routes: Rule[], sentence: string, extraRel: string, mutants: Mutant<SpecValue>[], distractors: number, why: string): Built => {
    const ref = draw.shuffle(routes)
    return {
      stem: `Requirement: "${sentence}" ${lang}${extraRel}.`,
      ask: 'Pick the rules that say exactly what the requirement says.',
      space,
      requirement: { kind: 'access', req },
      reference: P(ref),
      referenceWhy: why,
      mutants,
      distractors,
      bound,
      measure: { rules: ref.length, relations: relationsOf(ref).length, negations: negationsOf(ref) },
      shape: `policy:${ref.length}:${relationsOf(ref).length}:${negationsOf(ref)}`,
    }
  }
  if (band === 1) {
    const req: PolicyStory = { owners: true, direct: false, revocable: false, teamShare: false }
    return done(
      req,
      [OWNER],
      `A user ${may} a document when one of their teams owns it.`,
      '',
      [
        fixed('dp:A1', 'subset for overlap', 'This grants a read when every team of the user owns the document: a subset test where one shared team was meant. It is vacuously true for a user on no team, who then reads everything.', P(SUBSET_OWNER)),
        fixed('dp:A2', 'set-level match', 'This needs some team of the user and some team owning the document, not the same team: the match is made for the sets, not per team.', P([SET_LEVEL_OWNER])),
        fixed('dp:O2', 'drop a condition', 'This grants a read to anyone on any team, whoever owns the document.', P([rule([L('member', 'u', 't')])])),
        fixed('dp:A5', 'grants every request', 'This grants every request. No request tells it apart from "allow all", so it says nothing about who may read.', P([ANYONE])),
      ],
      3,
      'One rule: a team t that the user is on and that owns the document. The shared variable `t` makes it the same team.',
    )
  }
  if (band === 2) {
    const req: PolicyStory = { owners: true, direct: true, revocable: false, teamShare: false }
    return done(
      req,
      [OWNER, DIRECT],
      `A user ${may} a document when one of their teams owns it, or when it is shared with them directly.`,
      ', `share_user(d, u)` (d is shared with u)',
      [
        fixed('dp:A1', 'subset for overlap', 'The first rule tests that every team of the user owns the document, a subset where one shared team was meant, and it is vacuously true for a user on no team.', P([...SUBSET_OWNER, DIRECT])),
        fixed('dp:A2', 'one rule for two ways in', 'One rule joins the two ways in, so it demands both at once.', P([rule([L('member', 'u', 't'), L('owns', 't', 'd'), L('share_user', 'd', 'u')])])),
        fixed('dp:A2', 'set-level match', 'The first rule needs some team of the user and some team owning the document, not the same team.', P([SET_LEVEL_OWNER, DIRECT])),
        fixed('dp:O2', 'drop a way in', 'This drops the direct share, so a document shared with the user is refused.', P([OWNER])),
        fixed('dp:A5', 'grants every request', 'This grants every request. No request tells it apart from "allow all".', P([ANYONE])),
      ],
      4,
      'Two rules, one per way in: rules with the same head are alternatives, so either grants the read.',
    )
  }
  const req: PolicyStory = { owners: true, direct: true, revocable: true, teamShare: true }
  const okRules: Rule[] = [rule([L('member', 'u', 't'), L('owns', 't', 'd')], 'ok'), rule([L('share_user', 'd', 'u')], 'ok'), rule([L('member', 'u', 't'), L('share_team', 'd', 't')], 'ok'), rule([L('ok', 'u', 'd'), N('revoked', 'd', 'u')])]
  return done(
    req,
    [OWNER, DIRECT_REV, TEAM],
    `A user ${may} a document when one of their teams owns it, when it is shared with one of their teams, or when it is shared with them directly, unless that direct share is revoked.`,
    ', `share_team(d, t)` (d is shared with team t), `share_user(d, u)` (d is shared with u), `revoked(d, u)` (that direct share is revoked)',
    [
      fixed('dp:A8', 'ignore the revocation', 'The direct-share rule ignores revocations, so a revoked share still allows the read.', P([OWNER, DIRECT, TEAM])),
      fixed('dp:O2', 'revocation on every route', "This applies the revocation to every way in, so a revoked direct share also blocks a read the user's team grants. The requirement revokes only the direct share.", P(okRules)),
      fixed('dp:A1', 'subset for overlap', 'The owner rule tests that every team of the user owns the document: a subset where one shared team was meant, vacuously true for a user on no team.', P([...SUBSET_OWNER, DIRECT_REV, TEAM])),
      fixed('dp:O2', 'drop a way in', 'This drops the team share, so a document shared with one of the user\'s teams is refused.', P([OWNER, DIRECT_REV])),
      fixed('dp:A5', 'grants every request', 'This grants every request. No request tells it apart from "allow all".', P([ANYONE])),
    ],
    4,
    'Three rules, one per way in; only the direct-share rule carries `!revoked(d, u)`, because the requirement revokes only that share.',
  )
}

// ---------------------------------------------------------------- t3: postcondition with frame

const balP = (ix: string | number): Term => arr("bal'", ix)
const bal = (ix: string | number): Term => arr('bal', ix)
const eq = (l: Term, r: Term): Formula => rel(l, '=', r)

function t3(band: Band, _draw: SeededDraw): Built {
  const accounts = band + 1
  const aliasing = band === 3
  const writes: CommandStory['writes'] = band === 1 ? [] : band === 2 ? ['count'] : ['count', 'last']
  const cmd: CommandStory = { writes }
  const fields = [...writes.map((w) => ({ v: w, lo: 0, hi: 1 })), { v: 'limit', lo: 0, hi: 1 }]
  const space: Space = { kind: 'steps', accounts, fields, cmd, bal: { lo: 0, hi: 1 }, amt: { lo: 1, hi: 2 }, post: { lo: -2, hi: 3 }, aliasing }
  const moveOut = eq(balP('x'), sub(bal('x'), v('amt')))
  const moveIn = eq(balP('y'), add(bal('y'), v('amt')))
  const swapped = and(eq(balP('x'), add(bal('x'), v('amt'))), eq(balP('y'), sub(bal('y'), v('amt'))))
  const others = all('j', implies(and(ixNe('j', 'x'), ixNe('j', 'y')), eq(balP('j'), bal('j'))))
  const count = eq(v("count'"), add(v('count'), num(1)))
  const last = eq(v("last'"), v('amt'))
  const limit = eq(v("limit'"), v('limit'))
  const move = and(moveOut, moveIn)
  const transfer = aliasing ? and(implies(ixNe('x', 'y'), move), implies(ixEq('x', 'y'), eq(balP('x'), bal('x')))) : move
  const frameOthers = accounts > 2 ? [others] : []
  const writesF = [...(writes.includes('count') ? [count] : []), ...(writes.includes('last') ? [last] : [])]
  const ref = and(transfer, ...frameOthers, ...writesF, limit)
  const mutants: Mutant<SpecValue>[] = [
    fixed('dp:O4', 'drop a frame conjunct', 'This says nothing about `limit′`, so a result that changes the limit passes. A postcondition must say what stays the same.', F(and(transfer, ...frameOthers, ...writesF))),
    fixed('dp:Z5', 'direction swapped', 'This moves the amount the wrong way: into x and out of y.', F(and(aliasing ? and(implies(ixNe('x', 'y'), swapped), implies(ixEq('x', 'y'), eq(balP('x'), bal('x')))) : swapped, ...frameOthers, ...writesF, limit))),
  ]
  if (band === 1) mutants.push(fixed('dp:O2', 'too strong', 'This adds `bal′(x) ≥ 0`. Pay has no guard, so a run from a balance below the amount ends negative, and this postcondition rejects that real run.', F(and(ref, rel(balP('x'), '>=', num(0))))))
  if (accounts > 2) mutants.push(fixed('dp:O4', 'drop the account frame', 'This says nothing about the accounts other than x and y, so a result in which an untouched account changes passes.', F(and(transfer, ...writesF, limit))))
  if (band === 2) {
    mutants.push(fixed('dp:O2', 'a write left out', 'This says `count′ = count`, but Pay increments the counter, so every real run fails it.', F(and(transfer, ...frameOthers, eq(v("count'"), v('count')), limit))))
    mutants.push(fixed('dp:O2', 'frame over every account', 'This keeps every balance the same, x and y included, which contradicts the move itself, so no real run passes.', F(and(move, all('j', eq(balP('j'), bal('j'))), ...writesF, limit))))
  }
  if (band === 3) {
    mutants.push(fixed('dp:O2', 'aliasing ignored', 'This states the move without the case `x = y`. When x and y are the same account, Pay changes nothing, and this postcondition asks for both `bal(x) − amt` and `bal(x) + amt` at once, so the real run fails it.', F(and(move, others, ...writesF, limit))))
    mutants.push(fixed('dp:O2', 'a write left out', 'This says `last′ = last`, but Pay records the amount, so most real runs fail it.', F(and(transfer, others, count, eq(v("last'"), v('last')), limit))))
  }
  const fieldText = [...(writes.includes('count') ? ['`count`, a counter that Pay increments'] : []), ...(writes.includes('last') ? ['`last`, the last amount moved, which Pay sets to `amt`'] : []), '`limit`, which Pay never writes'].join('; ')
  const bound = `every pre-state with balances and fields from 0 to 1, amt from 1 to 2, x and y any accounts${aliasing ? '' : ' with x ≠ y'}; for each, Pay's own result, the state unchanged, the reverse move, and every result that differs from Pay's in one value, from −2 to 3`
  return {
    stem: `\`Pay(x, y, amt)\` moves \`amt\` from account \`x\` to account \`y\` among accounts 1 to ${accounts}${aliasing ? '; x and y may be the same account, and then the balances do not change' : ', where x and y are different accounts'}. State: \`bal(i)\`, each account's balance; ${fieldText}. A primed name is its value after Pay.`,
    ask: 'Pick the postcondition that describes Pay completely: every run of Pay satisfies it, and nothing else does.',
    space,
    requirement: { kind: 'command', cmd },
    reference: F(ref),
    referenceWhy: `It states each write and a frame for everything Pay leaves alone${aliasing ? ', with the case x = y apart' : ''}, so it holds of Pay's result and of nothing else.`,
    mutants,
    distractors: band === 1 ? 3 : 4,
    bound,
    measure: { written: 1 + writes.length, accounts, aliasing: aliasing ? 1 : 0 },
    shape: `post:${shapeOf(ref)}`,
  }
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): SpecItInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${SPEC_IT_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${SPEC_IT_ID}/${template}/b${band}`))
  const b = build(band, draw)
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: b.mutants, distractors: b.distractors, draw: draw.fork('options'), render: renderValue })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: b.ask, options }
  return {
    family: SPEC_IT_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: `${b.stem} This page checks every option against the requirement over ${b.bound}.`, parts: [part] },
    bound: b.bound,
    data: { space: b.space, requirement: b.requirement, values, measure: b.measure, shape: b.shape },
  }
}

function differ(port: EnginePort, inst: SpecItInstance, a: Spec, b: Spec): Promise<Answer<Witness>> {
  const input: DifferQuery = { op: 'differ', space: inst.data.space, a, b }
  return ask<DifferQuery, Witness>(port, { engine: SPEC_SCOPE, version: SPEC_SCOPE_VERSION, input, budget: { wallMs: 5000, maxStates: SPEC_SCOPE_MAX_POINTS } })
}

async function key(inst: SpecItInstance, port: EnginePort) {
  let engine: string | undefined
  let points = 0
  const confirm = async (ref: SpecValue): Promise<ConfirmResult> => {
    // The reference against the requirement itself, read from the instance data.
    const r = await differ(port, inst, asSpec(ref), inst.data.requirement)
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    engine = engineAtVersion(r.reply)
    points = r.reply.stats.n ?? 0
    return r.reply.verdict.kind === 'unsat' ? { confirmed: true } : { rejected: `it disagrees with the requirement on ${JSON.stringify(r.reply.witness)}` }
  }
  const distinguish = async (a: SpecValue, b: SpecValue): Promise<DistinguishResult> => {
    const r = await differ(port, inst, asSpec(a), asSpec(b))
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    return r.reply.verdict.kind === 'sat' && r.reply.witness !== undefined ? { differ: r.reply.witness as Json } : { same: true }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  if (engine === undefined) return discard('unknown', 'the spec scope gave no verdict on the reference')
  const k: SpecItKey = { engine, choices: [choice], statements: [], points, ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

export const specItGenerator: Generator<SpecItInstance, SpecItKey> = defineGenerator<SpecItInstance, SpecItKey>({
  id: SPEC_IT_ID,
  fixture: false,
  title: 'Spec it: the specification an English requirement states',
  templates: TEMPLATES,
  engines: [SPEC_SCOPE],
  misconceptions: ['dp:G1', 'dp:O1', 'dp:O2', 'dp:Z5', 'dp:G6', 'dp:A2', 'dp:A1', 'dp:A5', 'dp:A8', 'dp:O4'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: SPEC_IT_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure: (inst) => inst.data.measure,
  structure: (inst) => `${inst.template === 't2' ? 'policy' : inst.template === 't3' ? 'post' : 'property'}|${inst.data.shape}`,
  replay: (inst, part, a, b, witness) => {
    if (part !== PART) return false
    const va = inst.data.values[a]
    const vb = inst.data.values[b]
    if (va === undefined || vb === undefined) return false
    const at = readAt(inst.data.space, witness)
    if (at === null) return false
    try {
      return disagreeAt(asSpec(va), asSpec(vb), at)
    } catch {
      return false
    }
  },
})

export const generator = specItGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [SPEC_SCOPE]: specScopePort }
