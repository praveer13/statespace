// GEN-spot-the-gap's checker in the tab: the gap check. It runs the checks an audit case calls for on the case's own
// artifact and reports the gap classes they certify, with the evidence: a premise set that cannot hold (G2), a scenario
// the statement permits and the requirement forbids (G1) or the reverse (G12), an inconclusive or bounded verdict
// reported as proof (G5), a witness under the code's own arithmetic (G4), a fair lasso once the environment's
// fairness is dropped (G7), mismatched identifiers between the pinned and the proved statement (G8), a pair of states
// the declared observer equates and an attacker tells apart (G10), and an unreachable counterexample to induction
// answered by changing correct code (G13). When no check finds a gap, the case is sound, and the checker returns the
// evidence for that (a premise witness, an inductive strengthening, the statements equal).
//
// ASSESSMENT.md section 4.16 keys each variant by running its anchor's checker (Z3, TLC, comparator, INS-pairs) on the
// mutated pair member. Those checkers run on the instrument origin or the Bench and are not wired to generated items,
// so this build checks each case over a printed finite scope instead [D]: boxes of integers, an explicit state graph,
// token lists. Each grade prints the scope as its bound (I10). Plain code behind the EnginePort; no clock.
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'

// ---------------------------------------------------------------- formulas over a box

export type T = { readonly t: 'v'; readonly v: string } | { readonly t: 'n'; readonly n: number } | { readonly t: '+' | '-'; readonly l: T; readonly r: T }
export type Op = '<' | '<=' | '>' | '>=' | '=' | '!='
export type F =
  | { readonly f: 'rel'; readonly op: Op; readonly l: T; readonly r: T }
  | { readonly f: 'flag'; readonly v: string }
  | { readonly f: 'not'; readonly a: F }
  | { readonly f: 'and' | 'or'; readonly args: readonly F[] }
  | { readonly f: 'implies'; readonly l: F; readonly r: F }

export const V = (v: string): T => ({ t: 'v', v })
export const K = (n: number): T => ({ t: 'n', n })
export const P = (l: T, r: T): T => ({ t: '+', l, r })
export const M = (l: T, r: T): T => ({ t: '-', l, r })
export const R = (l: T, op: Op, r: T): F => ({ f: 'rel', op, l, r })
export const B = (v: string): F => ({ f: 'flag', v })
export const NOT = (a: F): F => ({ f: 'not', a })
export const AND = (...args: F[]): F => (args.length === 1 ? (args[0] as F) : { f: 'and', args })
export const OR = (...args: F[]): F => (args.length === 1 ? (args[0] as F) : { f: 'or', args })
export const IMP = (l: F, r: F): F => ({ f: 'implies', l, r })

export type State = Readonly<Record<string, number | boolean>>

function val(t: T, s: State): number {
  if (t.t === 'n') return t.n
  if (t.t === 'v') {
    const x = s[t.v]
    if (typeof x !== 'number') throw new Error(`unbound integer ${t.v}`)
    return x
  }
  return t.t === '+' ? val(t.l, s) + val(t.r, s) : val(t.l, s) - val(t.r, s)
}

export function holds(f: F, s: State): boolean {
  switch (f.f) {
    case 'rel': {
      const a = val(f.l, s)
      const b = val(f.r, s)
      return f.op === '<' ? a < b : f.op === '<=' ? a <= b : f.op === '>' ? a > b : f.op === '>=' ? a >= b : f.op === '=' ? a === b : a !== b
    }
    case 'flag': {
      const x = s[f.v]
      if (typeof x !== 'boolean') throw new Error(`unbound flag ${f.v}`)
      return x
    }
    case 'not':
      return !holds(f.a, s)
    case 'and':
      return f.args.every((a) => holds(a, s))
    case 'or':
      return f.args.some((a) => holds(a, s))
    case 'implies':
      return !holds(f.l, s) || holds(f.r, s)
  }
}

const OPS: Readonly<Record<Op, string>> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=', '!=': '≠' }
const showN = (n: number): string => (n < 0 ? `−${-n}` : String(n))

export function showT(t: T): string {
  if (t.t === 'n') return showN(t.n)
  if (t.t === 'v') return t.v
  const r = t.r.t === 'v' || t.r.t === 'n' ? showT(t.r) : `(${showT(t.r)})`
  return `${showT(t.l)} ${t.t === '+' ? '+' : '−'} ${r}`
}

export function showF(f: F): string {
  switch (f.f) {
    case 'rel':
      return `${showT(f.l)} ${OPS[f.op]} ${showT(f.r)}`
    case 'flag':
      return f.v
    case 'not':
      return `¬${f.a.f === 'flag' ? showF(f.a) : `(${showF(f.a)})`}`
    case 'and':
    case 'or':
      return f.args.map((a) => (a.f === 'rel' || a.f === 'flag' || a.f === 'not' ? showF(a) : `(${showF(a)})`)).join(f.f === 'and' ? ' ∧ ' : ' ∨ ')
    case 'implies':
      return `${f.l.f === 'rel' || f.l.f === 'flag' || f.l.f === 'not' ? showF(f.l) : `(${showF(f.l)})`} → ${showF(f.r)}`
  }
}

/** An integer from lo to hi, or a flag. */
export type Dom = { readonly v: string; readonly lo: number; readonly hi: number } | { readonly v: string; readonly flag: true }

export function* box(doms: readonly Dom[]): Generator<State> {
  const lo = (d: Dom): number => ('flag' in d ? 0 : d.lo)
  const hi = (d: Dom): number => ('flag' in d ? 1 : d.hi)
  const vals = doms.map(lo)
  for (;;) {
    const s: Record<string, number | boolean> = {}
    doms.forEach((d, i) => {
      s[d.v] = 'flag' in d ? vals[i] === 1 : (vals[i] as number)
    })
    yield s
    let i = doms.length - 1
    for (; i >= 0; i--) {
      const d = doms[i] as Dom
      if ((vals[i] as number) < hi(d)) {
        vals[i] = (vals[i] as number) + 1
        break
      }
      vals[i] = lo(d)
    }
    if (i < 0) return
  }
}

export function boxSize(doms: readonly Dom[]): number {
  let n = 1
  for (const d of doms) n *= 'flag' in d ? 2 : d.hi - d.lo + 1
  return n
}

export function first(doms: readonly Dom[], f: F): State | null {
  for (const s of box(doms)) if (holds(f, s)) return s
  return null
}

export function showBox(doms: readonly Dom[]): string {
  const groups: { range: string; vs: string[] }[] = []
  for (const d of doms) {
    const range = 'flag' in d ? 'true or false' : `from ${showN(d.lo)} to ${showN(d.hi)}`
    const g = groups.find((x) => x.range === range)
    if (g === undefined) groups.push({ range, vs: [d.v] })
    else g.vs.push(d.v)
  }
  return groups.map((g) => `${g.vs.join(', ')} ${g.range}`).join('; ')
}

const showState = (s: State): string =>
  Object.entries(s)
    .map(([k, x]) => `${k} = ${typeof x === 'number' ? showN(x) : String(x)}`)
    .join(', ')

// ---------------------------------------------------------------- the cases

/** A line of the case's artifact, as the learner sees it, with its line number. */
export interface Numbered<X> {
  readonly n: number
  readonly x: X
}

/** A query or a theorem over integers: premises (or hypotheses), and the violation the claim says is impossible. */
export interface QueryCase {
  readonly kind: 'query'
  readonly doms: readonly Dom[]
  readonly premises: readonly Numbered<F>[]
  readonly violation: F
}

/** A statement and a requirement over the behaviours a system allows. */
export interface ScenarioCase {
  readonly kind: 'scenario'
  readonly doms: readonly Dom[]
  /** The behaviours the system allows. */
  readonly system: F
  /** What the theorem says of every behaviour. */
  readonly statement: F
  /** What the requirement asks of every behaviour. */
  readonly requirement: F
}

/** A bounded check, its verdict line, and the scope the claim reports. */
export interface LogCase {
  readonly kind: 'log'
  readonly doms: readonly Dom[]
  readonly query: F
  /** The state budget the run was given. */
  readonly budget: number
  /** The verdict line the case shows, as the run printed it. */
  readonly verdictLine: string
  /** What the claim reports: no counterexample at all, or none for every integer. */
  readonly claimScope: 'no-counterexample' | 'all-integers' | 'the-box'
  /** A wider box the checker searches, to show a counterexample outside the run's. */
  readonly wider: readonly Dom[]
}

/** Code with fixed-width arithmetic, modelled over Int or over its own width. */
export interface WidthCase {
  readonly kind: 'width'
  readonly bits: number
  /** The guard the code checks before b := b + x. */
  readonly guard: F
  /** The model the claim rests on. */
  readonly model: 'int' | 'bits'
}

/** A state graph with actions owned by the system or the environment, and the fairness the claim assumes. */
export interface FairCase {
  readonly kind: 'fair'
  readonly actions: readonly FairAction[]
  /** Actions under weak fairness in the claim. */
  readonly fair: readonly string[]
  readonly names: { readonly hold: string; readonly paid: string }
}

export interface FairAction {
  readonly name: string
  readonly owner: 'system' | 'environment'
  /** Enabled when hold and paid have these values. */
  readonly from: { readonly hold: boolean; readonly paid: boolean }
  readonly to: { readonly hold: boolean; readonly paid: boolean }
}

/** The pinned statement and the statement the build proved. */
export interface IdentsCase {
  readonly kind: 'idents'
  readonly pinned: string
  readonly proved: string
}

/** A response's fields as functions of the visible count a and the other tenant's secret count s. */
export interface ObserverCase {
  readonly kind: 'observer'
  readonly fields: readonly { readonly name: string; readonly secret: boolean }[]
  /** The fields the claim's observer reads. */
  readonly observer: readonly string[]
  readonly max: number
}

/** A two-variable system, the property, a counterexample to induction, and what the change touched. */
export interface CtiCase {
  readonly kind: 'cti'
  readonly doms: readonly Dom[]
  readonly init: State
  /** The step: x := x + y (`add`), and y unchanged. */
  readonly property: F
  readonly cti: State
  /** The change answering the CTI: the code (guarded step), or the invariant (strengthened by `strengthen`). */
  readonly change: 'code' | 'invariant'
  readonly strengthen: F
}

export type GapCase = QueryCase | ScenarioCase | LogCase | WidthCase | FairCase | IdentsCase | ObserverCase | CtiCase

/** A class, or none for a sound case. */
export type GapClass = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10' | 'G11' | 'G12' | 'G13' | 'none'

export interface Finding {
  /** The classes the checks certify, most specific first; ['none'] when no check finds a gap. */
  readonly classes: readonly GapClass[]
  /** What certifies the finding, printed in the feedback. */
  readonly evidence: Readonly<Record<string, string>>
  /** The scope the checks ran over (I10). */
  readonly bound: string
  /** A premise witness, for a case with premises that can hold. */
  readonly premise?: State
}

/** The code's addition at a width: two's complement wrap-around. */
export function wrap(n: number, bits: number): number {
  let span = 1
  for (let i = 0; i < bits; i++) span *= 2
  const half = span / 2
  return ((((n + half) % span) + span) % span) - half
}

function audit(c: GapCase): Finding {
  switch (c.kind) {
    case 'query': {
      const bound = `every state with ${showBox(c.doms)}`
      const all = AND(...c.premises.map((p) => p.x))
      const witness = first(c.doms, all)
      if (witness === null) {
        // The smallest set of premise lines that cannot hold together: pairs first, then the whole set.
        for (let i = 0; i < c.premises.length; i++)
          for (let j = i + 1; j < c.premises.length; j++) {
            const a = c.premises[i] as Numbered<F>
            const b = c.premises[j] as Numbered<F>
            if (first(c.doms, AND(a.x, b.x)) === null) return { classes: ['G2'], evidence: { 'conflicting lines': `${a.n} and ${b.n}`, [`${showF(a.x)} ∧ ${showF(b.x)}`]: 'no state in the box satisfies both' }, bound }
          }
        return { classes: ['G2'], evidence: { 'conflicting lines': c.premises.map((p) => p.n).join(', '), 'the premises together': 'no state in the box satisfies them' }, bound }
      }
      const bad = first(c.doms, AND(all, c.violation))
      if (bad !== null) return { classes: [], evidence: { 'a violation the claim misses': showState(bad) }, bound }
      return { classes: ['none'], evidence: { 'the premises can hold': showState(witness), 'premises and violation together': 'no state in the box' }, bound, premise: witness }
    }
    case 'scenario': {
      const bound = `every behaviour with ${showBox(c.doms)} that the system allows`
      const weak = first(c.doms, AND(c.system, c.statement, NOT(c.requirement)))
      const strong = first(c.doms, AND(c.system, c.requirement, NOT(c.statement)))
      const classes: GapClass[] = []
      const evidence: Record<string, string> = {}
      if (weak !== null) {
        classes.push('G1')
        evidence['a behaviour the statement permits and the requirement forbids'] = showState(weak)
      }
      if (strong !== null) {
        classes.push('G12')
        evidence['a behaviour the requirement permits and the statement forbids'] = showState(strong)
      }
      if (classes.length === 0) return { classes: ['none'], evidence: { 'statement and requirement': 'they agree on every behaviour the system allows' }, bound }
      return { classes, evidence, bound }
    }
    case 'log': {
      const unknown = c.verdictLine.startsWith('unknown')
      const bound = `the run's own box (${showBox(c.doms)}) and a wider one (${showBox(c.wider)})`
      const outside = first(c.wider, c.query)
      if (unknown && c.claimScope !== 'the-box') return { classes: ['G5'], evidence: { 'the verdict line': c.verdictLine, 'what it means': 'no verdict: the run stopped at its budget' }, bound }
      if (!unknown && c.claimScope === 'all-integers') {
        return { classes: ['G5'], evidence: { 'the verdict line': c.verdictLine, 'what it covers': `only ${showBox(c.doms)}`, ...(outside === null ? {} : { 'a violation outside that box': showState(outside) }) }, bound }
      }
      if (unknown) return { classes: [], evidence: { 'the verdict line': c.verdictLine }, bound }
      return { classes: ['none'], evidence: { 'the verdict line': c.verdictLine, 'the claim': `limited to ${showBox(c.doms)}, as the run is` }, bound }
    }
    case 'width': {
      let span = 1
      for (let i = 0; i < c.bits; i++) span *= 2
      const min = -(span / 2)
      const max = span / 2 - 1
      const bound = `every b and x from ${showN(min)} to ${max}, the code's ${c.bits}-bit range`
      // The claim: a guarded deposit never lowers the balance. Over Int it holds whenever x > 0.
      for (let b = min; b <= max; b++)
        for (let x = min; x <= max; x++) {
          const s = { b, x }
          if (!holds(c.guard, s)) continue
          const after = wrap(b + x, c.bits)
          if (after < b) {
            if (c.model === 'int') return { classes: ['G4'], evidence: { 'the inputs': showState(s), [`b + x in ${c.bits} bits`]: showN(after), 'over Int': showN(b + x) }, bound }
            return { classes: [], evidence: { 'a wrap the model allows': showState(s) }, bound }
          }
        }
      return { classes: ['none'], evidence: { [`under the code's ${c.bits}-bit arithmetic`]: 'no guarded input lowers the balance' }, bound }
    }
    case 'fair': {
      const bound = `the ${c.names.hold} system's four states, every fair cycle`
      const envFair = c.fair.filter((a) => c.actions.find((x) => x.name === a)?.owner === 'environment')
      const sysFair = c.fair.filter((a) => !envFair.includes(a))
      const lasso = fairLasso(c, sysFair)
      if (envFair.length > 0 && lasso !== null) {
        return { classes: ['G7'], evidence: { 'fairness on an action the environment controls': envFair.map((a) => `WF(${a})`).join(', '), 'without it, a fair cycle that never releases': lasso }, bound }
      }
      if (fairLasso(c, c.fair) !== null) return { classes: [], evidence: { 'a fair cycle under the claim': fairLasso(c, c.fair) as string }, bound }
      return { classes: ['none'], evidence: { 'fairness': `${c.fair.map((a) => `WF(${a})`).join(', ')}, all on the system's own actions`, 'fair cycles that never release': 'none' }, bound }
    }
    case 'idents': {
      const bound = 'the two statements, token by token'
      const a = tokens(c.pinned)
      const b = tokens(c.proved)
      const diff: string[] = []
      for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push(`${a[i] ?? '(nothing)'} / ${b[i] ?? '(nothing)'}`)
      if (diff.length > 0) return { classes: ['G8'], evidence: { 'pinned / proved': diff.join('; ') }, bound }
      return { classes: ['none'], evidence: { 'pinned and proved statements': 'the same, token by token' }, bound }
    }
    case 'observer': {
      const bound = `every pair of states with a and s from 0 to ${c.max}`
      const see = (names: readonly string[], a: number, s: number): string => names.map((n) => `${n}=${c.fields.find((f) => f.name === n)?.secret === true ? a + s : a}`).join(',')
      const all = c.fields.map((f) => f.name)
      for (let a = 0; a <= c.max; a++)
        for (let s1 = 0; s1 <= c.max; s1++)
          for (let s2 = s1 + 1; s2 <= c.max; s2++) {
            if (see(c.observer, a, s1) === see(c.observer, a, s2) && see(all, a, s1) !== see(all, a, s2)) {
              const leak = c.fields.find((f) => f.secret && !c.observer.includes(f.name)) as { name: string }
              return { classes: ['G10'], evidence: { 'state 1': `a = ${a}, s = ${s1}`, 'state 2': `a = ${a}, s = ${s2}`, 'the declared observer sees': 'the same response in both', [`an attacker reading ${leak.name} sees`]: `${a + s1} and ${a + s2}` }, bound }
            }
          }
      return { classes: ['none'], evidence: { 'pairs that differ only in the other tenant’s documents': 'every field reads the same in both' }, bound }
    }
    case 'cti': {
      const bound = `every state with ${showBox(c.doms)}, steps x := x + y`
      const step = (s: State): State => ({ x: (s['x'] as number) + (s['y'] as number), y: s['y'] as number })
      const inBox = (s: State): boolean => c.doms.every((d) => 'flag' in d || ((s[d.v] as number) >= d.lo && (s[d.v] as number) <= d.hi))
      // Reachable states from init, inside the box.
      const seen = new Set<string>()
      const queue: State[] = [c.init]
      const key = (s: State): string => `${s['x'] as number},${s['y'] as number}`
      let violated: State | null = null
      while (queue.length > 0) {
        const s = queue.shift() as State
        if (!inBox(s) || seen.has(key(s))) continue
        seen.add(key(s))
        if (!holds(c.property, s)) violated ??= s
        queue.push(step(s))
      }
      const ctiReachable = seen.has(key(c.cti))
      const inv = AND(c.property, c.strengthen)
      let inductive = true
      for (const s of box(c.doms)) {
        const t = step(s)
        if (holds(inv, s) && inBox(t) && !holds(inv, t)) inductive = false
      }
      const strengthened = inductive && holds(inv, c.init) && !holds(inv, c.cti)
      if (violated === null && !ctiReachable && c.change === 'code') {
        return { classes: ['G13'], evidence: { 'the CTI': showState(c.cti), 'reachable from the start': 'no', 'the code already keeps the property': 'every reachable state in the box satisfies it', ...(strengthened ? { 'a strengthening that excludes the CTI and is inductive in the box': showF(inv) } : {}) }, bound }
      }
      if (violated === null && c.change === 'invariant' && strengthened) return { classes: ['none'], evidence: { 'the strengthened invariant': showF(inv), 'inductive in the box, holds at the start, excludes the CTI': 'yes' }, bound }
      if (violated !== null && c.change === 'code') return { classes: ['none'], evidence: { 'a reachable state breaking the property': showState(violated), 'so the code had a bug': 'changing it is the fix' }, bound }
      return { classes: [], evidence: {}, bound }
    }
  }
}

/** Identifier and symbol tokens of a statement. */
export function tokens(s: string): string[] {
  return s.match(/[A-Za-z_][A-Za-z0-9_'.]*|[0-9]+|[^\sA-Za-z0-9_]/g) ?? []
}

/**
 * A cycle that stays where something is held, fair to the given actions: each is disabled somewhere on the cycle or
 * taken on it. Stuttering is always a step. Returns the cycle as text, or null.
 */
export function fairLasso(c: FairCase, fair: readonly string[]): string | null {
  type S = { hold: boolean; paid: boolean }
  const all: S[] = [
    { hold: false, paid: false },
    { hold: false, paid: true },
    { hold: true, paid: false },
    { hold: true, paid: true },
  ]
  const eq = (a: S, b: S): boolean => a.hold === b.hold && a.paid === b.paid
  const enabled = (a: FairAction, s: S): boolean => eq(a.from, s)
  // Reachable from the start (nothing held, nothing paid).
  const reach: S[] = [all[0] as S]
  for (let i = 0; i < reach.length; i++) for (const a of c.actions) if (enabled(a, reach[i] as S) && !reach.some((r) => eq(r, a.to))) reach.push(a.to)
  const held = reach.filter((s) => s.hold)
  const show = (s: S): string => `${c.names.hold} ${s.hold ? 'held' : 'free'}, ${c.names.paid} ${s.paid ? 'yes' : 'no'}`
  // Single held states with stuttering, then pairs linked both ways inside the held states.
  for (const s of held) {
    if (fair.every((n) => !c.actions.some((a) => a.name === n && enabled(a, s)))) return `${show(s)}, then nothing happens, forever`
  }
  for (const s of held)
    for (const t of held) {
      if (eq(s, t)) continue
      const st = c.actions.filter((a) => enabled(a, s) && eq(a.to, t))
      const ts = c.actions.filter((a) => enabled(a, t) && eq(a.to, s))
      if (st.length === 0 || ts.length === 0) continue
      const taken = [...st, ...ts].map((a) => a.name)
      // Weak fairness is broken only by an action enabled all along the cycle and never taken on it.
      const always = (n: string): boolean => c.actions.some((a) => a.name === n && enabled(a, s)) && c.actions.some((a) => a.name === n && enabled(a, t))
      if (fair.every((n) => taken.includes(n) || !always(n))) return `${show(s)} and ${show(t)}, in turn, forever`
    }
  return null
}

// ---------------------------------------------------------------- the port

export const GAP_CHECK = 'gap-check'
export const GAP_CHECK_VERSION = '1'
/** The largest scope the family asks for [D]: the width case's 65,536 inputs. */
export const GAP_CHECK_MAX_STATES = 70000

export interface AuditQuery {
  readonly op: 'audit'
  readonly case: GapCase
}

export function scopeSize(c: GapCase): number {
  switch (c.kind) {
    case 'query':
    case 'scenario':
      return boxSize(c.doms)
    case 'log':
      return boxSize(c.wider)
    case 'width': {
      let span = 1
      for (let i = 0; i < c.bits; i++) span *= 2
      return span * span
    }
    case 'cti':
      return boxSize(c.doms)
    case 'observer':
      return (c.max + 1) * (c.max + 1) * (c.max + 1)
    default:
      return 1
  }
}

export class GapCheckError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GapCheckError'
    this.code = code
  }
}

export function decide(q: AuditQuery, maxStates: number): InstrumentReply<Finding> {
  const budget = { wallMs: 0, maxStates }
  const provenance = { engine: GAP_CHECK, version: GAP_CHECK_VERSION, build: `${GAP_CHECK}@${GAP_CHECK_VERSION}`, budget }
  const size = scopeSize(q.case)
  if (size > maxStates) return { verdict: { kind: 'unknown', reason: `the case's scope holds ${size} states, over the budget of ${maxStates}` }, stats: { ms: 0, n: 0 }, provenance }
  const f = audit(q.case)
  return { verdict: { kind: 'checks', results: f.classes }, witness: f, stats: { ms: 0, n: size, bound: f.bound }, provenance }
}

/** A bounded run of the box over a query, as a log case prints it: the verdict line. */
export function boxRun(doms: readonly Dom[], query: F, budget: number): string {
  const size = boxSize(doms)
  if (size > budget) return `unknown (budget): the box holds ${size} states, over the budget of ${budget}`
  const s = first(doms, query)
  return s === null ? `unsat: ${size} states tried, none satisfies the query` : `sat: ${showState(s)}`
}

function isQuery(x: unknown): x is AuditQuery {
  return typeof x === 'object' && x !== null && (x as Partial<AuditQuery>).op === 'audit' && typeof (x as Partial<AuditQuery>).case === 'object'
}

export const gapCheckPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== GAP_CHECK) throw new GapCheckError('unknown-engine', `the gap check runs ${GAP_CHECK}, not ${req.engine}`)
    if (req.version !== GAP_CHECK_VERSION) throw new GapCheckError('version-mismatch', `the gap check is version ${GAP_CHECK_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new GapCheckError('invalid-input', 'not a gap-check query')
    return decide(req.input, req.budget.maxStates ?? GAP_CHECK_MAX_STATES) as unknown as InstrumentReply<W>
  },
}
