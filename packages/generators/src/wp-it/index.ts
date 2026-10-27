// GEN-wp-it (ASSESSMENT.md section 4.5): the weakest precondition of a loop-free command for a postcondition. This
// build serves pick mode: the learner chooses wp(c, Q) among the reference VC generator's answer and misconception
// mutants of it. Three templates, structurally different: t1 one assignment (band 3 an account update whose
// postcondition binds the parameter's name, so a naive substitution captures it), t2 a sequence of assignments,
// t3 a guarded command (assume, requires, if-then-else).
//
// Keys are never stored. key() asks the family's checker, the wp box (engine.ts), to run the command from every
// state of the box and confirm that the reference agrees with the interpreter on each, and to tell every pair of
// options apart on a state. The interpreter, not the substitution, decides: a mistake in wp() would show up as a
// rejected reference, which GATE-generators fails. On a miss, grade() replays the distinguishing state through the
// interpreter and says which way the option is wrong.
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
import type { Band, ChoicePart, Generator, Grade, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { chooseDistractors } from './choose.ts'
import { boxBound, WP_BOX, WP_BOX_MAX_STATES, WP_BOX_VERSION, wpBoxPort } from './engine.ts'
import type { Domain, WpQuery } from './engine.ts'
import {
  addLin,
  all,
  and,
  atomsOf,
  cmdShape,
  evaluate,
  idx,
  implies,
  inWp,
  lin,
  negate,
  nonCommutingPairs,
  num,
  rel,
  render,
  renderCmd,
  run,
  seq,
  set,
  setb,
  subst,
  term,
  wp,
} from './formula.ts'
import type { Cmd, Formula, Lin, Rel, State } from './formula.ts'

export { WP_BOX, WP_BOX_MAX_STATES, WP_BOX_VERSION, wpBoxPort } from './engine.ts'
export { evaluate, inWp, render, renderCmd, run, wp } from './formula.ts'
export type { Cmd, Formula, State } from './formula.ts'

export const WP_IT_ID = 'GEN-wp-it' as const
const PART = 'main'

/** What the basis line of every grade says: the checker, and that it is this page's, over this instance. */
export const WP_IT_BASIS =
  'this page, over this instance: the wp box runs the command in the interpreter from every state of the box and compares each option with the outcome; keys computed at grade time (Z3 equivalence over all integers is not wired to this item yet)'

export interface WpItData {
  readonly cmd: Cmd
  readonly post: Formula
  readonly domains: readonly Domain[]
  /** Each option's formula, by option id. */
  readonly values: Readonly<Record<string, Formula>>
  /** t1: 1 when the postcondition binds the name of the command's parameter (capture-prone). */
  readonly capture?: number
  /** t3: the guard reading, 1 assume, 2 requires, 3 if-then-else. */
  readonly reading?: number
}

export interface WpItInstance extends InstanceBase {
  readonly data: WpItData
}

export type WpItKey = KeyBase

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'assignment',
    kcs: { primary: 'KC-4.wp-assignment', secondary: ['KC-4.capture-avoiding-substitution'] },
    bands: {
      1: { atoms: [1, 1], capture: [0, 0] },
      2: { atoms: [2, 3], capture: [0, 0] },
      3: { atoms: [2, 3], capture: [1, 1] },
    },
  },
  {
    id: 't2',
    name: 'sequence',
    kcs: { primary: 'KC-4.wp-assignment', secondary: ['KC-4.wp-sequence-conditional'] },
    bands: {
      1: { assignments: [2, 2], noncommuting: [0, 0] },
      2: { assignments: [3, 3], noncommuting: [1, 1] },
      3: { assignments: [4, 4], noncommuting: [2, 2] },
    },
  },
  {
    id: 't3',
    name: 'guarded command',
    kcs: { primary: 'KC-4.wp-sequence-conditional', secondary: ['KC-4.wp-assignment'] },
    bands: {
      1: { guards: [1, 1], reading: [1, 1] },
      2: { guards: [1, 1], reading: [2, 2] },
      3: { guards: [2, 2], reading: [3, 3] },
    },
  },
]

// ---------------------------------------------------------------- copy

const ASK = 'Pick wp(c, Q): the weakest precondition.'

const WHY = {
  unsubstituted: 'This copies the postcondition and ignores the assignment: it checks the value before the command changes it.',
  inverse: 'This substitutes the inverse of the assignment, as if running it forward and undoing it. wp substitutes the assigned expression itself for the variable: Q[e/x].',
  equality: 'An equality pins one value. It is sufficient, so every state it admits ends in Q, but it excludes states that also end in Q: it is a precondition, not the weakest.',
  shift: 'This moves the boundary by one. On the boundary itself it disagrees with the command: it admits a state that ends outside Q, or excludes one that ends inside it.',
  partial: 'This substitutes into some occurrences of the variable and leaves others as they were. Every occurrence of the assigned variable in Q is replaced.',
  executionOrder: 'This substitutes in execution order, first assignment first. wp works backward from Q: the last assignment is substituted first, so a later assignment that reads an earlier one sees its new value.',
  forwardSigns: 'This flips the sign of each update, as forward reasoning about the old value does. Substituting backward replaces each variable by the expression assigned to it, sign and all.',
  skipFirst: 'This leaves the first assignment unsubstituted: Q is pushed back through the later assignments only, so it describes the state after the first one, not before the command.',
  stronger: 'This adds a condition the command does not need. Every state it admits ends in Q, but it excludes some that also do: sufficient, and stronger than the weakest.',
  captured: 'The substitution put `bal[k] − amt` under the ∀ that binds its own `k`, so the parameter `k` was captured: the formula now demands that every account cover `amt`. Rename the bound variable first, then substitute.',
  noFrame: 'This keeps the debited account and drops every other one. The postcondition is about all accounts, and the command leaves the others as they were, so they must already satisfy it.',
  rejectForAssume: 'This reads the `assume` as a `requires`. An `assume` blocks the run when its guard is false, and a blocked run has nothing to show, so wp is `G → wp(rest)`, not `G ∧ wp(rest)`.',
  assumeForReject: 'This reads the `requires` as an `assume`. A `requires` rejects a state where its guard is false, so wp must exclude it: `G ∧ wp(rest)`, not `G → wp(rest)`.',
  dropGuardStronger: 'This drops the `assume`. It demands Q from states the `assume` would block, where nothing has to hold: sufficient, and stronger than the weakest.',
  dropRequires: 'This drops the `requires`, so it admits states the command rejects. wp keeps the guard as a conjunct.',
  dropElse: 'This keeps only the branch where the outer guard holds. When it is false the command runs its else branch, and wp needs Q after that branch too.',
  unguarded: 'This demands every branch\'s condition at once, whichever branch runs. Each condition is needed only where its guard sends the run, so this is stronger than the weakest.',
  keepQ: 'This also demands Q before the command runs. Only the state the command ends in must satisfy Q, so this is sufficient but stronger than the weakest.',
} as const

// ---------------------------------------------------------------- helpers

const ints = (vars: readonly string[], lo: number, hi: number): Domain[] => vars.map((v) => ({ v, kind: 'int' as const, lo, hi }))
const fixed = (tag: Mutant<Formula>['tag'], operator: string, why: string, value: Formula | null): Mutant<Formula> => ({ tag, operator, why: () => why, apply: () => value })
const show = (f: Formula): string => `\`${render(f)}\``

/** The first relation with its comparison replaced. */
function mapFirstRel(f: Formula, map: (op: Rel) => Rel | null): Formula | null {
  let done = false
  const visit = (g: Formula): Formula => {
    if (done) return g
    switch (g.f) {
      case 'rel': {
        const op = map(g.op)
        if (op === null) return g
        done = true
        return rel(g.lhs, op, g.rhs)
      }
      case 'flag':
      case 'idx':
        return g
      case 'not':
        return { f: 'not', arg: visit(g.arg) }
      case 'and':
        return { f: 'and', args: g.args.map(visit) }
      case 'or':
        return { f: 'or', args: g.args.map(visit) }
      case 'implies': {
        const lhs = visit(g.lhs)
        return implies(lhs, visit(g.rhs))
      }
      case 'all':
        return all(g.ix, g.over, visit(g.body))
    }
  }
  const out = visit(f)
  return done ? out : null
}

const SHIFTED: Partial<Record<Rel, Rel>> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' }

/** Two mistakes at once: the first one's tag, both names, and both reasons in one why. */
function both(a: Mutant<Formula>, b: Mutant<Formula>, value: Formula | null): Mutant<Formula> {
  const wa = a.why(value as Formula)
  const wb = b.why(value as Formula)
  return fixed(a.tag, `${a.operator}, and ${b.operator}`, `Two mistakes at once. ${wa} ${wb.replace(/^This /, 'It also ')}`, value)
}

/** Every state of a small box, or null past 5000 states. */
function statesOf(domains: readonly Domain[]): State[] | null {
  let out: Record<string, number | boolean>[] = [{}]
  for (const d of domains) {
    const vals: (number | boolean)[] = d.kind === 'flag' ? [false, true] : Array.from({ length: d.hi - d.lo + 1 }, (_, i) => d.lo + i)
    if (out.length * vals.length > 5000) return null
    out = out.flatMap((st) => vals.map((x) => ({ ...st, [d.v]: x })))
  }
  return out as State[]
}

/** v := v + e, inverted: v := v − e. Other assignments are kept. */
function inverse(c: Cmd): Cmd {
  if (c.c !== 'set') return c
  const self = c.e.coefs.find((x) => x.v === c.v)
  if (self === undefined || self.c !== 1) return c
  const rest = lin(c.e.coefs.filter((x) => x.v !== c.v), c.e.k)
  return set(c.v, addLin(term(c.v), rest, -1))
}

/** Every assignment of a command with its update inverted (the forward-reasoning slip). */
function invertAll(c: Cmd): Cmd {
  switch (c.c) {
    case 'set':
      return inverse(c)
    case 'seq':
      return seq(...c.cmds.map(invertAll))
    case 'if':
      return { c: 'if', g: c.g, then: invertAll(c.then), else: invertAll(c.else) }
    default:
      return c
  }
}

interface Built {
  readonly stem: string
  readonly cmd: Cmd
  readonly post: Formula
  readonly reference: Formula
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<Formula>[]
  readonly domains: readonly Domain[]
  readonly capture?: number
  readonly reading?: number
}

const block = (c: Cmd): string => `\`\`\`\n${renderCmd(c)}\n\`\`\``

function stemOf(cmd: Cmd, post: Formula, vars: string): string {
  return `Command:\n\n${block(cmd)}\n\nPostcondition Q: ${show(post)}. ${vars} Which formula holds in exactly the states from which the command ends in a state that satisfies Q?`
}

// ---------------------------------------------------------------- t1: assignment

const T1_NAMES: readonly { readonly v: string; readonly w: string; readonly vSays: string; readonly wSays: string }[] = [
  { v: 'fee', w: 'cap', vSays: '`fee` is the fee charged', wSays: '`cap` its ceiling' },
  { v: 'a', w: 'l', vSays: '`a` is a balance', wSays: '`l` a limit' },
  { v: 'n', w: 'm', vSays: '`n` counts the requests served', wSays: '`m` is the quota' },
]

function t1(band: Band, draw: SeededDraw): Built {
  if (band === 3) return t1Capture(draw)
  const { v, w, vSays, wSays } = draw.pick(T1_NAMES)
  const d = draw.pick([-2, -1, 1, 2])
  const byVar = band === 2 && draw.bool()
  const e = byVar ? addLin(term(v), term(w), draw.pick([1, -1])) : term(v, d)
  const cmd = set(v, e)
  let post: Formula
  if (band === 1) {
    post = draw.bool() ? rel(term(v), draw.pick<Rel>(['<=', '<', '>=', '>']), num(draw.int(0, 2))) : rel(term(v), draw.pick<Rel>(['<=', '>=']), term(w))
  } else {
    const atoms: Formula[] = [rel(term(v), '>=', num(draw.int(0, 1))), rel(term(v), '<=', term(w))]
    if (draw.bool()) atoms.push(rel(term(w), '<=', num(3)))
    post = and(...draw.shuffle(atoms))
  }
  const reference = wp(cmd, post)
  const equality = (f: Formula): Formula | null => mapFirstRel(f, (op) => (op === '=' || op === '!=' ? null : '='))
  const shift = (f: Formula): Formula | null => mapFirstRel(f, (op) => SHIFTED[op] ?? null)
  const subs: Mutant<Formula>[] = [fixed('dp:O4', 'leave the variable unsubstituted', WHY.unsubstituted, post), fixed('dp:O4', 'substitute the inverse', WHY.inverse, wp(inverse(cmd), post))]
  if (post.f === 'and') {
    const [first, ...rest] = post.args
    subs.push(fixed('dp:O4', 'substitute into the first atom only', WHY.partial, and(subst(first as Formula, v, e), ...rest)))
  }
  const eq = fixed('dp:O2', 'an equality for the first comparison', WHY.equality, equality(reference))
  const sh = fixed('dp:O1', 'shift the first boundary', WHY.shift, shift(reference))
  // Each substitution mistake alone, and with the comparison mistakes on top [D].
  const keep = fixed('dp:O2', 'keep Q as well', WHY.keepQ, and(post, reference))
  const mutants: Mutant<Formula>[] = [
    ...subs,
    eq,
    sh,
    keep,
    ...subs.flatMap((m) => [both(m, sh, shift(m.apply(reference, draw) as Formula)), both(m, eq, equality(m.apply(reference, draw) as Formula))]),
    both(keep, sh, and(post, shift(reference) as Formula)),
    ...subs.map((m) => both(m, keep, and(post, m.apply(reference, draw) as Formula))),
  ]
  const vars = band === 1 && !readsW(post, w) ? [v] : [v, w]
  return {
    stem: stemOf(cmd, post, vars.length === 1 ? `Here ${vSays}, an integer.` : `Here ${vSays} and ${wSays}, both integers.`),
    cmd,
    post,
    reference,
    referenceWhy: `wp(${v} := e, Q) is Q with e put in for every \`${v}\`: ${show(reference)}. A state satisfies it exactly when the assignment leads to a state where Q holds.`,
    mutants,
    domains: ints(vars, -2, 3),
    capture: 0,
  }
}

function readsW(f: Formula, w: string): boolean {
  return render(f).split(/[^A-Za-z0-9_[\]]+/).includes(w)
}

function t1Capture(draw: SeededDraw): Built {
  const n = draw.int(2, 3)
  const over = Array.from({ length: n }, (_, i) => i + 1)
  const m = draw.int(0, 1)
  const cmd: Cmd = { c: 'seta', arr: 'bal', ix: 'k', e: addLin(term('bal[k]'), term('amt'), -1) }
  // The postcondition binds k, the parameter's own name: the capture-prone case.
  const post = all('k', over, rel(term('bal[k]'), '>=', num(m)))
  const debited = (e: Lin): Formula => rel(e, '>=', num(m))
  const others = all('j', over, implies(idx('j', '!=', 'k'), rel(term('bal[j]'), '>=', num(m))))
  const reference = and(debited(addLin(term('bal[k]'), term('amt'), -1)), others)
  const captured = fixed('dp:O4', 'substitute under the binder (capture)', WHY.captured, all('k', over, rel(addLin(term('bal[k]'), term('amt'), -1), '>=', num(m))))
  const inv = fixed('dp:O4', 'substitute the inverse', WHY.inverse, and(debited(addLin(term('bal[k]'), term('amt'))), others))
  const noFrame = fixed('dp:O4', 'drop the frame', WHY.noFrame, debited(addLin(term('bal[k]'), term('amt'), -1)))
  const mutants: Mutant<Formula>[] = [
    captured,
    fixed('dp:O4', 'leave the postcondition unsubstituted', WHY.unsubstituted, post),
    inv,
    noFrame,
    both(captured, inv, all('k', over, rel(addLin(term('bal[k]'), term('amt')), '>=', num(m)))),
    both(noFrame, inv, debited(addLin(term('bal[k]'), term('amt')))),
    fixed('dp:O2', 'keep Q as well', WHY.keepQ, and(post, reference)),
    fixed('dp:O1', 'shift the boundary', WHY.shift, mapFirstRel(reference, (op) => SHIFTED[op] ?? null)),
    both(inv, fixed('dp:O1', 'shift the boundary', WHY.shift, null), mapFirstRel(and(debited(addLin(term('bal[k]'), term('amt'))), others), (op) => SHIFTED[op] ?? null)),
  ]
  const accounts = over.map((i) => `bal[${i}]`)
  return {
    stem: stemOf(
      cmd,
      post,
      `\`Debit(k, amt)\` takes \`amt\` from account \`k\`, one of accounts 1 to ${n}; \`bal[i]\` is account i's balance. The \`k\` under Q's ∀ is bound there; the command's \`k\` is the parameter.`,
    ),
    cmd,
    post,
    reference,
    referenceWhy: `Rename the bound variable first (\`∀j. bal[j] ≥ ${m}\`), then substitute: account k must cover the debit, and every other account is unchanged and must already satisfy Q. That is ${show(reference)}.`,
    mutants,
    domains: [...ints(accounts, 0, 3), { v: 'k', kind: 'int', lo: 1, hi: n }, { v: 'amt', kind: 'int', lo: 0, hi: 3 }],
    capture: 1,
  }
}

// ---------------------------------------------------------------- t2: sequence

function t2(band: Band, draw: SeededDraw): Built {
  const m = draw.int(0, 1)
  const c = draw.int(2, 3)
  let cmds: Cmd[]
  let post: Formula
  let vars: string[]
  let lo = -2
  if (band === 1) {
    cmds = draw.shuffle([set('a', addLin(term('a'), term('x'), -1)), set('b', addLin(term('b'), term('x')))])
    post = and(rel(term('a'), '>=', num(m)), rel(term('b'), '<=', num(c)))
    vars = ['a', 'b', 'x']
  } else if (band === 2) {
    const transfer = draw.shuffle([set('a', addLin(term('a'), term('x'), -1)), set('b', addLin(term('b'), term('x')))])
    const flagOn = draw.bool() ? rel(term('a'), '>=', num(m)) : rel(term('b'), '<=', num(c))
    cmds = [...transfer, setb('ok', flagOn)]
    post = { f: 'flag', v: 'ok' }
    vars = ['a', 'b', 'x']
  } else {
    lo = -1
    const k = draw.int(0, 1)
    cmds = [set('a', addLin(term('a'), term('x'), -1)), setb('ok', rel(term('a'), '>=', num(m))), set('b', addLin(term('b'), term('y'))), set('t', addLin(term('b'), num(k)))]
    post = and({ f: 'flag', v: 'ok' }, rel(term('t'), '<=', num(c)))
    vars = ['a', 'x', 'b', 'y', 't']
  }
  const cmd = seq(...cmds)
  const reference = wp(cmd, post)
  const executionOrder = cmds.reduce((acc, x) => wp(x, acc), post)
  const stronger = (f: Formula): Formula => and(f, rel(term('x'), '>=', num(0)))
  const inverted = cmds.map(invertAll)
  const order = fixed('dp:O4', 'substitute in execution order', WHY.executionOrder, executionOrder)
  const flipped = fixed('dp:O4', 'flip each update', WHY.forwardSigns, wp(invertAll(cmd), post))
  const skip = fixed('dp:O4', 'skip the first assignment', WHY.skipFirst, wp(seq(...cmds.slice(1)), post))
  const extra = fixed('dp:O2', 'add an unneeded condition', WHY.stronger, stronger(reference))
  const mutants: Mutant<Formula>[] = [
    order,
    flipped,
    skip,
    extra,
    fixed('dp:O4', 'leave Q unsubstituted', WHY.unsubstituted, post),
    // Two mistakes at once [D]: the backward slips with forward signs, and each slip with the unneeded condition.
    both(order, flipped, inverted.reduce((acc, x) => wp(x, acc), post)),
    both(skip, flipped, wp(seq(...inverted.slice(1)), post)),
    both(order, extra, stronger(executionOrder)),
    both(flipped, extra, stronger(wp(invertAll(cmd), post))),
    both(skip, extra, stronger(wp(seq(...cmds.slice(1)), post))),
    both(fixed('dp:O4', 'leave Q unsubstituted', WHY.unsubstituted, null), extra, stronger(post)),
    both(both(order, flipped, null), extra, stronger(inverted.reduce((acc, x) => wp(x, acc), post))),
    fixed('dp:O2', 'keep Q as well', WHY.keepQ, and(post, reference)),
    fixed('dp:O1', 'shift the first boundary', WHY.shift, mapFirstRel(reference, (op) => SHIFTED[op] ?? null)),
    both(flipped, fixed('dp:O1', 'shift the first boundary', WHY.shift, null), mapFirstRel(wp(invertAll(cmd), post), (op) => SHIFTED[op] ?? null)),
  ]
  const hasOk = cmds.some((x) => x.c === 'setb')
  return {
    stem: stemOf(cmd, post, `${vars.map((x) => `\`${x}\``).join(', ')} are integers${hasOk ? ' and `ok` is true or false' : ''}.`),
    cmd,
    post,
    reference,
    referenceWhy: `Substitute backward, last assignment first: each step replaces the assigned variable by its expression, so an assignment that reads an earlier one sees its new value. The result is ${show(reference)}.`,
    mutants,
    domains: [...ints(vars, lo, 3), ...(hasOk ? [{ v: 'ok', kind: 'flag' as const }] : [])],
  }
}

// ---------------------------------------------------------------- t3: guarded command

function t3(band: Band, draw: SeededDraw): Built {
  const m = draw.int(0, 1)
  const post = rel(term('a'), '>=', num(m))
  const debit = set('a', addLin(term('a'), term('x'), -1))
  const vars = ['a', 'x', 'l']
  if (band === 1 || band === 2) {
    const g = rel(term('x'), '<=', term('l', draw.int(0, 1)))
    const cmd = seq(band === 1 ? { c: 'assume', g } : { c: 'require', g }, debit)
    const reference = wp(cmd, post)
    const w = wp(debit, post)
    // Every reading of the guard (as written, the other reading, dropped) with every substitution (right, Q left
    // as it is, the inverse), the reference aside [D].
    const readings = band === 1
      ? [
          { m: null, of: (x: Formula): Formula => implies(g, x) },
          { m: fixed('dp:O5', 'the reject reading', WHY.rejectForAssume, null), of: (x: Formula): Formula => and(g, x) },
          { m: fixed('dp:O2', 'drop the assume', WHY.dropGuardStronger, null), of: (x: Formula): Formula => x },
        ]
      : [
          { m: null, of: (x: Formula): Formula => and(g, x) },
          { m: fixed('dp:O5', 'the assume reading', WHY.assumeForReject, null), of: (x: Formula): Formula => implies(g, x) },
          { m: fixed('dp:O5', 'drop the requires', WHY.dropRequires, null), of: (x: Formula): Formula => x },
        ]
    const substs = [
      { m: null, f: w },
      { m: fixed('dp:O4', 'leave Q unsubstituted', WHY.unsubstituted, null), f: post },
      { m: fixed('dp:O4', 'substitute the inverse', WHY.inverse, null), f: wp(inverse(debit), post) },
    ]
    const mutants: Mutant<Formula>[] = []
    for (const r of readings)
      for (const x of substs) {
        const value = r.of(x.f)
        if (r.m === null && x.m === null) continue
        if (r.m !== null && x.m !== null) mutants.push(both(r.m, x.m, value))
        else mutants.push(fixed(((r.m ?? x.m) as Mutant<Formula>).tag, ((r.m ?? x.m) as Mutant<Formula>).operator, ((r.m ?? x.m) as Mutant<Formula>).why(value), value))
      }
    const keep = fixed('dp:O2', 'keep Q as well', WHY.keepQ, null)
    mutants.push(fixed('dp:O2', 'keep Q as well', WHY.keepQ, and(reference, post)), ...mutants.map((m) => both(m, keep, and(m.apply(reference, draw) as Formula, post))))
    return {
      stem: stemOf(cmd, post, `\`a\` is a balance, \`x\` an amount and \`l\` a limit, all integers. ${band === 1 ? 'An `assume` blocks the run when its guard is false.' : 'A `requires` rejects the state when its guard is false.'}`),
      cmd,
      post,
      reference,
      referenceWhy:
        band === 1
          ? `An \`assume\` that fails blocks the run, so nothing has to hold there: wp is \`G → wp(rest)\`, here ${show(reference)}.`
          : `A \`requires\` that fails rejects the state, so wp must exclude it: \`G ∧ wp(rest)\`, here ${show(reference)}.`,
      mutants,
      domains: ints(vars, -2, 3),
      reading: band,
    }
  }
  const g1 = rel(term('x'), '<=', term('a'))
  const g2 = rel(term('x'), '<=', term('l'))
  const capped = set('a', addLin(term('a'), term('l'), -1))
  const otherwise: Cmd = draw.bool() ? { c: 'skip' } : set('a', term('a', -1))
  const inner: Cmd = { c: 'if', g: g2, then: debit, else: capped }
  const cmd: Cmd = { c: 'if', g: g1, then: inner, else: otherwise }
  const reference = wp(cmd, post)
  const w1 = wp(debit, post)
  const w2 = wp(capped, post)
  const w3 = wp(otherwise, post)
  const innerWp = (a: Formula, b: Formula): Formula => and(implies(g2, a), implies(negate(g2), b))
  const dropElse = fixed('dp:O5', 'drop the else branch', WHY.dropElse, implies(g1, wp(inner, post)))
  const unguarded = fixed('dp:O2', 'every branch, unguarded', WHY.unguarded, and(w1, w2, w3))
  const inv = fixed('dp:O4', 'substitute the inverse in one branch', WHY.inverse, and(implies(g1, innerWp(wp(inverse(debit), post), w2)), implies(negate(g1), w3)))
  const unsub = fixed('dp:O4', 'leave one branch unsubstituted', WHY.unsubstituted, and(implies(g1, innerWp(post, w2)), implies(negate(g1), w3)))
  const mutants: Mutant<Formula>[] = [
    dropElse,
    unguarded,
    inv,
    unsub,
    // Two mistakes at once [D]: a branch mistake inside a dropped else or an unguarded conjunction.
    both(dropElse, inv, implies(g1, innerWp(wp(inverse(debit), post), w2))),
    both(dropElse, unsub, implies(g1, innerWp(post, w2))),
    both(unguarded, inv, and(wp(inverse(debit), post), w2, w3)),
    both(unguarded, unsub, and(post, w2, w3)),
    fixed('dp:O2', 'keep Q as well', WHY.keepQ, and(reference, post)),
    both(dropElse, fixed('dp:O2', 'keep Q as well', WHY.keepQ, null), and(implies(g1, wp(inner, post)), post)),
    both(inv, fixed('dp:O2', 'keep Q as well', WHY.keepQ, null), and(inv.apply(reference, draw) as Formula, post)),
    both(unsub, fixed('dp:O2', 'keep Q as well', WHY.keepQ, null), and(unsub.apply(reference, draw) as Formula, post)),
  ]
  return {
    stem: stemOf(cmd, post, '`a` is a balance, `x` an amount and `l` a cap on one debit, all integers.'),
    cmd,
    post,
    reference,
    referenceWhy: `Each branch contributes its own wp under its guard: \`(G → wp1) ∧ (¬G → wp2)\`, once for the outer guard and once for the nested one. Here that is ${show(reference)}.`,
    mutants,
    domains: ints(vars, -2, 3),
    reading: 3,
  }
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): WpItInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${WP_IT_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${WP_IT_ID}/${template}/b${band}`))
  const b = build(band, draw)
  // The distractors shown, chosen among the mistakes so the key does not stand out (choose.ts); a candidate that
  // agrees with the key or another on every state of the box is left out, as the checker would discard it.
  const states = statesOf(b.domains)
  const meaning = (f: Formula): string => (states === null ? render(f) : states.map((st) => (evaluate(f, st) ? '1' : '0')).join(''))
  const chosen = chooseDistractors({ reference: b.reference, candidates: b.mutants, n: 3, draw: draw.fork('choose'), render, meaning })
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: chosen, distractors: 3, draw: draw.fork('options'), render })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: ASK, options }
  return {
    family: WP_IT_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: b.stem, parts: [part] },
    bound: boxBound(b.domains),
    data: {
      cmd: b.cmd,
      post: b.post,
      domains: b.domains,
      values,
      ...(b.capture === undefined ? {} : { capture: b.capture }),
      ...(b.reading === undefined ? {} : { reading: b.reading }),
    },
  }
}

function query(port: EnginePort, input: WpQuery): Promise<Answer<State>> {
  return ask<WpQuery, State>(port, { engine: WP_BOX, version: WP_BOX_VERSION, input, budget: { wallMs: 2000, maxStates: WP_BOX_MAX_STATES } })
}

async function key(inst: WpItInstance, port: EnginePort): Promise<WpItKey | ReturnType<typeof discard>> {
  const { cmd, post, domains } = inst.data
  let engine = `${WP_BOX}@${WP_BOX_VERSION}`
  const confirm = async (ref: Formula): Promise<ConfirmResult> => {
    // The interpreter decides: the reference must agree with the run of the command from every state of the box.
    const r = await query(port, { op: 'wp', cmd, post, formula: ref, domains })
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    engine = engineAtVersion(r.reply)
    return r.reply.verdict.kind === 'unsat' ? { confirmed: true } : { rejected: `the interpreter disagrees with it on ${JSON.stringify(r.reply.witness)}` }
  }
  const distinguish = async (a: Formula, b: Formula): Promise<DistinguishResult> => {
    const r = await query(port, { op: 'differ', a, b, domains })
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    return r.reply.verdict.kind === 'sat' && r.reply.witness !== undefined ? { differ: r.reply.witness as Json } : { same: true }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  return { engine, choices: [choice], statements: [], ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
}

const fmt = (s: State): string =>
  Object.entries(s)
    .map(([k, v]) => `${k} = ${typeof v === 'number' && v < 0 ? `−${Math.abs(v)}` : String(v)}`)
    .join(', ')

/** The replay sentence for a missed option: what the command does from the distinguishing state. */
export function replaySentence(inst: WpItInstance, option: string, s: State): string | undefined {
  const f = inst.data.values[option]
  if (f === undefined) return undefined
  const admits = evaluate(f, s)
  const o = run(inst.data.cmd, s)
  const outcome =
    o.kind === 'blocked'
      ? 'an `assume` blocks the run, so nothing has to hold'
      : o.kind === 'rejected'
        ? 'a `requires` rejects it'
        : `the command ends in ${fmt(o.state)}, where Q is ${evaluate(inst.data.post, o.state) ? 'true' : 'false'}`
  const good = inWp(inst.data.cmd, inst.data.post, s)
  if (admits && !good) return `Replayed from ${fmt(s)}: ${outcome}, yet your option admits the state.`
  if (!admits && good) return `Replayed from ${fmt(s)}: ${outcome}, yet your option excludes the state; it is a precondition, not the weakest.`
  return undefined
}

async function grade(inst: WpItInstance, answer: Readonly<Record<string, Json>>, k: WpItKey): Promise<Grade> {
  const g = await gradeItem(inst, answer, k, { basis: WP_IT_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) })
  const picked = answer[PART]
  if (g.ok !== false || typeof picked !== 'string' || typeof g.witness !== 'object' || g.witness === null || Array.isArray(g.witness)) return g
  const sentence = replaySentence(inst, picked, g.witness as State)
  return sentence === undefined ? g : { ...g, why: `${g.why} ${sentence}` }
}

function referenceOf(inst: WpItInstance): Formula {
  const part = inst.item.parts[0] as ChoicePart
  const ref = part.options.find((o) => o.origin.kind === 'reference')
  const f = ref === undefined ? undefined : inst.data.values[ref.id]
  if (f === undefined) throw new Error(`${WP_IT_ID}: the instance has no reference option`)
  return f
}

function guardsOf(c: Cmd): number {
  switch (c.c) {
    case 'seq':
      return c.cmds.reduce((n, x) => n + guardsOf(x), 0)
    case 'assume':
    case 'require':
      return 1
    case 'if':
      return 1 + guardsOf(c.then) + guardsOf(c.else)
    default:
      return 0
  }
}

function measure(inst: WpItInstance): Measure {
  const { cmd } = inst.data
  switch (inst.template) {
    case 't1':
      return { atoms: atomsOf(referenceOf(inst)), capture: inst.data.capture ?? 0 }
    case 't2': {
      const cmds = cmd.c === 'seq' ? cmd.cmds : [cmd]
      return { assignments: cmds.length, noncommuting: nonCommutingPairs(cmds) }
    }
    default:
      return { guards: guardsOf(cmd), reading: inst.data.reading ?? 0 }
  }
}

export const wpItGenerator: Generator<WpItInstance, WpItKey> = defineGenerator<WpItInstance, WpItKey>({
  id: WP_IT_ID,
  fixture: false,
  title: 'WP it: the weakest precondition of a loop-free command',
  templates: TEMPLATES,
  engines: [WP_BOX],
  misconceptions: ['dp:O4', 'dp:O2', 'dp:O1', 'dp:O5'],
  make,
  key,
  grade: (inst, answer, k) => grade(inst, answer, k),
  measure,
  structure: (inst) => `${inst.template === 't1' ? 'assign' : inst.template === 't2' ? 'sequence' : 'guarded'}|${cmdShape(inst.data.cmd)}`,
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

export const generator = wpItGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [WP_BOX]: wpBoxPort }
