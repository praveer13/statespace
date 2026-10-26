// GEN-proof-structure's corpus: the proofs its items are drawn from, each a theory (definitions by equations, lemmas,
// the theorem) and the proof script that closes it in the tactic model. Five shapes: a one-step unfolding with no
// case split (P1), list induction that needs `generalizing` over the state (P2, the course's run-conserves shape) or
// over an accumulator (P3), list induction that needs none (P4), and induction with a nested `cases` on an operation
// (P5). Each comes in a few namings, so the same shape is met under different names.
//
// Pure: no DOM, storage or network.

import type { SeededDraw } from '@statespace/rng'
import { cons, minus, nil, plus, showEq, tc, tn, tv } from './tactics.ts'
import type { Binder, Ctor, Def, Law, Line, Script, Tac, Term, Theory } from './tactics.ts'

export type StoryId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'

export interface Story {
  readonly id: StoryId
  readonly theory: Theory
  readonly script: Script
  /** The induction line's index, when the proof has one. */
  readonly induction?: number
  /** The line holding the cons case's `rw [ih]`, and that tactic's position on it. */
  readonly rwIh?: { readonly line: number; readonly tac: number }
  /** The induction hypothesis's name and the generalized variables, when the proof has an induction. */
  readonly ih?: string
  readonly gen: readonly string[]
  /** Whether the proof needs `generalizing`: without it, `rw [ih]` finds no instance. */
  readonly needsGen: boolean
  /** The variable the induction is on, and its type. */
  readonly on?: Binder
}

const LIST_CTORS: readonly Ctor[] = [
  { name: 'nil', args: [] },
  { name: 'cons', args: ['elem', 'self'] },
]
const OP_CTORS: readonly Ctor[] = [
  { name: 'dep', args: ['Int'] },
  { name: 'wd', args: ['Int'] },
]
const TYPES = { 'List Int': LIST_CTORS, 'List Op': LIST_CTORS, Op: OP_CTORS }

const b = (n: string, ty: string): Binder => ({ n, ty })
const law = (name: string, binders: Binder[], l: Term, r: Term): Law => ({ name, binders, eq: { l, r } })
const def = (name: string, eqs: Law[]): Def => ({ name, eqs })
const simp = (...rules: string[]): Tac => ({ t: 'simp', rules })
const rw = (...rules: string[]): Tac => ({ t: 'rw', rules })
const OMEGA: Tac = { t: 'omega' }
const tacs = (...ts: Tac[]): Line => ({ k: 'tacs', tacs: ts })
const alt = (ctor: string, names: string[], ...ts: Tac[]): Line => ({ k: 'case', ctor, names, tacs: ts })

// ---------------------------------------------------------------- P1: unfold, unfold, omega

const P1_NAMES = [
  { total: 'total', step: 'step', thm: 'step_total' },
  { total: 'supply', step: 'move', thm: 'move_supply' },
] as const

function p1(draw: SeededDraw): Story {
  const nm = draw.pick(P1_NAMES)
  const three = draw.bool()
  const a = tv('a')
  const bb = tv('b')
  const c = tv('c')
  const n = tv('n')
  const fields = three ? [a, bb, c] : [a, bb]
  const binders = three ? [b('a', 'Int'), b('b', 'Int'), b('c', 'Int')] : [b('a', 'Int'), b('b', 'Int')]
  const sum = three ? plus(plus(a, bb), c) : plus(a, bb)
  const reverse = draw.bool()
  const moved = three ? (reverse ? [plus(a, n), bb, minus(c, n)] : [minus(a, n), bb, plus(c, n)]) : reverse ? [plus(a, n), minus(bb, n)] : [minus(a, n), plus(bb, n)]
  const theory: Theory = {
    defs: [def(nm.total, [law(nm.total, binders, tc(nm.total, tc('mk', ...fields)), sum)]), def(nm.step, [law(nm.step, [...binders, b('n', 'Int')], tc(nm.step, tc('mk', ...fields), n), tc('mk', ...moved))])],
    lemmas: [],
    theorem: law(nm.thm, [...binders, b('n', 'Int')], tc(nm.total, tc(nm.step, tc('mk', ...fields), n)), tc(nm.total, tc('mk', ...fields))),
    types: TYPES,
  }
  return { id: 'P1', theory, script: [tacs(simp(nm.step)), tacs(simp(nm.total)), tacs(OMEGA)], gen: [], needsGen: false }
}

// ---------------------------------------------------------------- P2: run over a list, generalizing the state

const P2_NAMES = [
  { run: 'run', step: 'step', total: 'total', thm: 'run_total', lemma: 'step_total' },
  { run: 'runPos', step: 'transferPos', total: 'total', thm: 'runPos_conserves', lemma: 'transferPos_conserves' },
  { run: 'settle', step: 'post', total: 'supply', thm: 'settle_supply', lemma: 'post_supply' },
] as const

function p2(draw: SeededDraw, compact: boolean): Story {
  const nm = draw.pick(P2_NAMES)
  const s = tv('s')
  const theory: Theory = {
    defs: [
      def(nm.run, [
        law(nm.run, [b('s', 'Ledger')], tc(nm.run, s, nil()), s),
        law(nm.run, [b('s', 'Ledger'), b('n', 'Int'), b('ns', 'List Int')], tc(nm.run, s, cons(tv('n'), tv('ns'))), tc(nm.run, tc(nm.step, s, tv('n')), tv('ns'))),
      ]),
    ],
    lemmas: [law(nm.lemma, [b('s', 'Ledger'), b('n', 'Int')], tc(nm.total, tc(nm.step, s, tv('n'))), tc(nm.total, s))],
    theorem: law(nm.thm, [b('s', 'Ledger'), b('ns', 'List Int')], tc(nm.total, tc(nm.run, s, tv('ns'))), tc(nm.total, s)),
    types: TYPES,
  }
  const exact: Tac = { t: 'exact', name: nm.lemma, args: ['s', 'n'] }
  const ind: Line = { k: 'induction', x: 'ns', gen: ['s'] }
  const script: Script = compact
    ? [ind, alt('nil', [], simp(nm.run)), alt('cons', ['n', 'ns', 'ih'], simp(nm.run), rw('ih')), tacs(exact)]
    : [ind, alt('nil', [], simp(nm.run)), alt('cons', ['n', 'ns', 'ih']), tacs(simp(nm.run)), tacs(rw('ih')), tacs(exact)]
  return { id: 'P2', theory, script, induction: 0, rwIh: compact ? { line: 2, tac: 1 } : { line: 4, tac: 0 }, ih: 'ih', gen: ['s'], needsGen: true, on: b('ns', 'List Int') }
}

// ---------------------------------------------------------------- P3: an accumulator, generalizing it

const P3_NAMES = [
  { acc: 'sumAcc', sum: 'sum', thm: 'sumAcc_eq' },
  { acc: 'addAll', sum: 'total', thm: 'addAll_eq' },
] as const

function p3(draw: SeededDraw, compact: boolean): Story {
  const nm = draw.pick(P3_NAMES)
  const acc = tv('acc')
  const theory: Theory = {
    defs: [
      def(nm.acc, [
        law(nm.acc, [b('acc', 'Int')], tc(nm.acc, nil(), acc), acc),
        law(nm.acc, [b('n', 'Int'), b('ns', 'List Int'), b('acc', 'Int')], tc(nm.acc, cons(tv('n'), tv('ns')), acc), tc(nm.acc, tv('ns'), plus(acc, tv('n')))),
      ]),
      def(nm.sum, [law(nm.sum, [], tc(nm.sum, nil()), tn(0)), law(nm.sum, [b('n', 'Int'), b('ns', 'List Int')], tc(nm.sum, cons(tv('n'), tv('ns'))), plus(tv('n'), tc(nm.sum, tv('ns'))))]),
    ],
    lemmas: [],
    theorem: law(nm.thm, [b('ns', 'List Int'), b('acc', 'Int')], tc(nm.acc, tv('ns'), acc), plus(acc, tc(nm.sum, tv('ns')))),
    types: TYPES,
  }
  const ind: Line = { k: 'induction', x: 'ns', gen: ['acc'] }
  const script: Script = compact
    ? [ind, alt('nil', [], simp(nm.acc, nm.sum), OMEGA), alt('cons', ['n', 'ns', 'ih'], simp(nm.acc, nm.sum), rw('ih')), tacs(OMEGA)]
    : [ind, alt('nil', [], simp(nm.acc, nm.sum), OMEGA), alt('cons', ['n', 'ns', 'ih']), tacs(simp(nm.acc, nm.sum)), tacs(rw('ih')), tacs(OMEGA)]
  return { id: 'P3', theory, script, induction: 0, rwIh: compact ? { line: 2, tac: 1 } : { line: 4, tac: 0 }, ih: 'ih', gen: ['acc'], needsGen: true, on: b('ns', 'List Int') }
}

// ---------------------------------------------------------------- P4: append and length, nothing to generalize

const P4_NAMES = [
  { app: 'app', len: 'len', thm: 'len_app' },
  { app: 'concat', len: 'size', thm: 'size_concat' },
] as const

function p4(draw: SeededDraw, compact: boolean): Story {
  const nm = draw.pick(P4_NAMES)
  const ys = tv('ys')
  const theory: Theory = {
    defs: [
      def(nm.app, [law(nm.app, [b('ys', 'List Int')], tc(nm.app, nil(), ys), ys), law(nm.app, [b('x', 'Int'), b('xs', 'List Int'), b('ys', 'List Int')], tc(nm.app, cons(tv('x'), tv('xs')), ys), cons(tv('x'), tc(nm.app, tv('xs'), ys)))]),
      def(nm.len, [law(nm.len, [], tc(nm.len, nil()), tn(0)), law(nm.len, [b('x', 'Int'), b('xs', 'List Int')], tc(nm.len, cons(tv('x'), tv('xs'))), plus(tn(1), tc(nm.len, tv('xs'))))]),
    ],
    lemmas: [],
    theorem: law(nm.thm, [b('xs', 'List Int'), b('ys', 'List Int')], tc(nm.len, tc(nm.app, tv('xs'), ys)), plus(tc(nm.len, tv('xs')), tc(nm.len, ys))),
    types: TYPES,
  }
  const ind: Line = { k: 'induction', x: 'xs', gen: [] }
  const script: Script = compact
    ? [ind, alt('nil', [], simp(nm.app, nm.len), OMEGA), alt('cons', ['x', 'xs', 'ih'], simp(nm.app, nm.len), rw('ih')), tacs(OMEGA)]
    : [ind, alt('nil', [], simp(nm.app, nm.len), OMEGA), alt('cons', ['x', 'xs', 'ih']), tacs(simp(nm.app, nm.len)), tacs(rw('ih')), tacs(OMEGA)]
  return { id: 'P4', theory, script, induction: 0, rwIh: compact ? { line: 2, tac: 1 } : { line: 4, tac: 0 }, ih: 'ih', gen: [], needsGen: false, on: b('xs', 'List Int') }
}

// ---------------------------------------------------------------- P5: induction with a nested case split

const P5_NAMES = [
  { apply: 'apply', exec: 'exec', count: 'count', dep: 'deposit', wd: 'withdraw', thm: 'apply_count' },
  { apply: 'replay', exec: 'step', count: 'entries', dep: 'credit', wd: 'debit', thm: 'replay_entries' },
] as const

function p5(draw: SeededDraw): Story {
  const nm = draw.pick(P5_NAMES)
  const s = tv('s')
  const k = tv('k')
  const one = (f: string): Law => law(`${f}_${nm.count}`, [b('s', 'Ledger'), b('k', 'Int')], tc(nm.count, tc(f, s, k)), plus(tc(nm.count, s), tn(1)))
  const theory: Theory = {
    defs: [
      def(nm.apply, [
        law(nm.apply, [b('s', 'Ledger')], tc(nm.apply, s, nil()), s),
        law(nm.apply, [b('s', 'Ledger'), b('op', 'Op'), b('ops', 'List Op')], tc(nm.apply, s, cons(tv('op'), tv('ops'))), tc(nm.apply, tc(nm.exec, s, tv('op')), tv('ops'))),
      ]),
      def(nm.exec, [law(nm.exec, [b('s', 'Ledger'), b('k', 'Int')], tc(nm.exec, s, tc('dep', k)), tc(nm.dep, s, k)), law(nm.exec, [b('s', 'Ledger'), b('k', 'Int')], tc(nm.exec, s, tc('wd', k)), tc(nm.wd, s, k))]),
      def('len', [law('len', [], tc('len', nil()), tn(0)), law('len', [b('x', 'Op'), b('xs', 'List Op')], tc('len', cons(tv('x'), tv('xs'))), plus(tn(1), tc('len', tv('xs'))))]),
    ],
    lemmas: [one(nm.dep), one(nm.wd)],
    theorem: law(nm.thm, [b('s', 'Ledger'), b('ops', 'List Op')], tc(nm.count, tc(nm.apply, s, tv('ops'))), plus(tc(nm.count, s), tc('len', tv('ops')))),
    types: TYPES,
  }
  const script: Script = [
    { k: 'induction', x: 'ops', gen: ['s'] },
    alt('nil', [], simp(nm.apply, 'len'), OMEGA),
    alt('cons', ['op', 'ops', 'ih']),
    tacs(simp(nm.apply, 'len')),
    tacs(rw('ih')),
    { k: 'cases', x: 'op' },
    alt('dep', ['k'], simp(nm.exec), rw(`${nm.dep}_${nm.count}`), OMEGA),
    alt('wd', ['k'], simp(nm.exec), rw(`${nm.wd}_${nm.count}`), OMEGA),
  ]
  return { id: 'P5', theory, script, induction: 0, rwIh: { line: 4, tac: 0 }, ih: 'ih', gen: ['s'], needsGen: true, on: b('ops', 'List Op') }
}

export function storyOf(id: StoryId, draw: SeededDraw, compact = false): Story {
  switch (id) {
    case 'P1':
      return p1(draw)
    case 'P2':
      return p2(draw, compact)
    case 'P3':
      return p3(draw, compact)
    case 'P4':
      return p4(draw, compact)
    case 'P5':
      return p5(draw)
  }
}

// ---------------------------------------------------------------- script edits the items use

/** The script with line `i` replaced. */
export const withLine = (s: Script, i: number, line: Line): Script => s.map((l, k) => (k === i ? line : l))

/** The script with lines i and j swapped. */
export const swapLines = (s: Script, i: number, j: number): Script => s.map((l, k) => (k === i ? (s[j] as Line) : k === j ? (s[i] as Line) : l))

/** The script without line i. */
export const dropLine = (s: Script, i: number): Script => s.filter((_, k) => k !== i)

/** A line with tactic `t` replaced (null drops it); a line left with no tactic is dropped by the caller. */
export function withTac(line: Line, t: number, tac: Tac | null): Line {
  if (line.k !== 'case' && line.k !== 'tacs') return line
  const ts = line.tacs.flatMap((x, k) => (k === t ? (tac === null ? [] : [tac]) : [x]))
  return { ...line, tacs: ts }
}

/** The induction line without `generalizing`. */
export function ungeneralized(s: Story): Script {
  if (s.induction === undefined) return s.script
  const l = s.script[s.induction] as Line
  return l.k === 'induction' ? withLine(s.script, s.induction, { ...l, gen: [] }) : s.script
}

/** Lines and their texts, for the stem: the theory's definitions, lemmas and the theorem in Lean's notation. */
export function theoryText(th: Theory): string[] {
  const out: string[] = []
  const show = (l: Law): string => `${l.binders.map((x) => `(${x.n} : ${x.ty})`).join(' ')}`
  for (const d of th.defs) for (const e of d.eqs) out.push(`${d.name}: ${showLaw(e)}`)
  for (const l of th.lemmas) out.push(`theorem ${l.name} ${show(l)} : ${showLaw(l)}`)
  out.push(`theorem ${th.theorem.name} ${show(th.theorem)} : ${showLaw(th.theorem)}`)
  return out
}

const showLaw = (l: Law): string => showEq(l.eq)
