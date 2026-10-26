// GEN-spec-it's checker in the tab: the spec scope. It decides whether two specifications disagree anywhere in a
// printed finite scope, and returns the first point where they do. A specification is an option's formula, policy or
// postcondition, or the item's requirement, which the checker evaluates directly from the instance data: a property
// requirement by its story's own predicate, a policy requirement by its story's own reading of the S7 world, a
// postcondition requirement by running the command. So the key is the option that never disagrees with the
// requirement, computed when the learner submits; nothing about it is stored with the item.
//
// ASSESSMENT.md section 4.4 names Z3 (equivalence over QF_LIA, policies inside a printed scope) as this family's
// engine. Z3 runs on the instrument origin and is not wired to generated items yet, so this build checks every point
// of the printed scope instead [D], and each grade prints the scope as its bound (I10). It runs as plain code behind
// the same EnginePort a bus engine uses, and reads no clock (stats.ms is 0).
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { evaluate } from './formula.ts'
import type { Formula, Point } from './formula.ts'
import { grants, readWorld, showWorld, worlds } from './policy.ts'
import type { Policy, World } from './policy.ts'

export const SPEC_SCOPE = 'spec-scope'
export const SPEC_SCOPE_VERSION = '1'
/** The point budget the family asks for [D]: its largest scope (t3, band 3) holds about 150,000 points. */
export const SPEC_SCOPE_MAX_POINTS = 400000

// ---------------------------------------------------------------- the scopes

/** A scalar's range, or an array of `accounts` cells over one range. */
export type Dim =
  | { readonly kind: 'int'; readonly v: string; readonly lo: number; readonly hi: number }
  | { readonly kind: 'flag'; readonly v: string }
  | { readonly kind: 'array'; readonly a: string; readonly lo: number; readonly hi: number }

/** Properties: every point of a box. */
export interface BoxSpace {
  readonly kind: 'box'
  readonly accounts: number
  readonly dims: readonly Dim[]
}

/** Policies: every world of one user, one document and `teams` teams. */
export interface WorldSpace {
  readonly kind: 'worlds'
  readonly teams: number
}

/** A command's state: per-account balances and scalar fields. */
export interface StepSpace {
  readonly kind: 'steps'
  readonly accounts: number
  /** The scalar fields of the state, each with its pre-state range. */
  readonly fields: readonly { readonly v: string; readonly lo: number; readonly hi: number }[]
  /** The command whose results the scope tries, and their one-field changes. */
  readonly cmd: CommandStory
  readonly bal: { readonly lo: number; readonly hi: number }
  readonly amt: { readonly lo: number; readonly hi: number }
  /** The values a perturbed post-state field takes. */
  readonly post: { readonly lo: number; readonly hi: number }
  /** Whether x and y may name the same account. */
  readonly aliasing: boolean
}

export type Space = BoxSpace | WorldSpace | StepSpace

// ---------------------------------------------------------------- the requirements

/**
 * A property requirement, by story. Each predicate reads the point directly, written apart from any option's
 * formula, so the key is the option that agrees with it everywhere.
 */
export type PropertyStory =
  | { readonly story: 'only-if'; readonly strict: boolean }
  | { readonly story: 'positive-covered'; readonly strict: boolean }
  | { readonly story: 'capped'; readonly strict: boolean }
  | { readonly story: 'backed'; readonly strict: boolean }

/** A policy requirement: the ways in, and whether a revocation closes the direct share. */
export interface PolicyStory {
  readonly owners: boolean
  readonly direct: boolean
  readonly revocable: boolean
  readonly teamShare: boolean
}

/** A command: Pay(x, y, amt) moves amt from x to y and updates the written scalar fields. */
export interface CommandStory {
  /** Scalar fields the command writes: count := count + 1, last := amt. */
  readonly writes: readonly ('count' | 'last')[]
}

export type Spec =
  | { readonly kind: 'formula'; readonly f: Formula }
  | { readonly kind: 'policy'; readonly p: Policy }
  | { readonly kind: 'property'; readonly req: PropertyStory }
  | { readonly kind: 'access'; readonly req: PolicyStory }
  | { readonly kind: 'command'; readonly cmd: CommandStory }

/** The property story's predicate. */
export function propertyHolds(req: PropertyStory, p: Point): boolean {
  const s = (name: string): number => p.scalars[name] as number
  const bal = p.arrays['bal'] ?? []
  switch (req.story) {
    case 'only-if': {
      // "A transfer is allowed only if the amount is at most (less than) the balance."
      const covered = req.strict ? s('x') < s('a') : s('x') <= s('a')
      return !(p.flags['ok'] as boolean) || covered
    }
    case 'positive-covered':
      // "The amount is positive and at most (less than) the balance."
      return s('x') > 0 && (req.strict ? s('x') < s('a') : s('x') <= s('a'))
    case 'capped': {
      // "The cap is at least 2, and every balance is from 0 up to (below) the cap."
      if (!(s('c') >= 2)) return false
      for (const b of bal) if (b < 0 || (req.strict ? b >= s('c') : b > s('c'))) return false
      return true
    }
    case 'backed': {
      // "Every account in credit is backed by a different, unfrozen account holding at least (more than) as much."
      const fz = p.arrays['fz'] ?? []
      for (let i = 0; i < bal.length; i++) {
        const bi = bal[i] as number
        if (!(bi > 0)) continue
        let backed = false
        for (let j = 0; j < bal.length; j++) {
          const bj = bal[j] as number
          if (j !== i && fz[j] === 0 && (req.strict ? bj > bi : bj >= bi)) backed = true
        }
        if (!backed) return false
      }
      return true
    }
  }
}

/** The policy story's reading of the world. */
export function accessGranted(req: PolicyStory, w: World): boolean {
  const owner = req.owners && w.member.some((t) => w.owns.includes(t))
  const direct = req.direct && w.shareUser && !(req.revocable && w.revoked)
  const team = req.teamShare && w.member.some((t) => w.shareTeam.includes(t))
  return owner || direct || team
}

/** The command's own result from a pre-state: the sequential update, so x = y leaves the balances as they were. */
export function runCommand(cmd: CommandStory, pre: StepPoint): StepPoint {
  const bal = [...pre.bal]
  bal[pre.x - 1] = (bal[pre.x - 1] as number) - pre.amt
  bal[pre.y - 1] = (bal[pre.y - 1] as number) + pre.amt
  const fields: Record<string, number> = { ...pre.fields }
  if (cmd.writes.includes('count')) fields['count'] = (fields['count'] as number) + 1
  if (cmd.writes.includes('last')) fields['last'] = pre.amt
  return { ...pre, bal, fields }
}

/** One step's pre-state, parameters, and (for a post) the state after. */
export interface StepPoint {
  readonly bal: readonly number[]
  readonly fields: Readonly<Record<string, number>>
  readonly x: number
  readonly y: number
  readonly amt: number
}

/** A step as a formula point: bal and the fields before, bal′ and the fields′ after. */
export function stepPoint(accounts: number, pre: StepPoint, post: StepPoint): Point {
  const scalars: Record<string, number> = { amt: pre.amt }
  for (const [k, n] of Object.entries(pre.fields)) scalars[k] = n
  for (const [k, n] of Object.entries(post.fields)) scalars[`${k}'`] = n
  return { scalars, flags: {}, arrays: { bal: pre.bal, "bal'": post.bal }, ix: { x: pre.x, y: pre.y }, accounts }
}

// ---------------------------------------------------------------- enumeration

/** Every point of a box, last dimension fastest. */
function* boxPoints(s: BoxSpace): Generator<Point> {
  type Cell = { kind: 'int' | 'flag'; dim: number; lo: number; hi: number }
  const cells: Cell[] = []
  s.dims.forEach((d, i) => {
    if (d.kind === 'flag') cells.push({ kind: 'flag', dim: i, lo: 0, hi: 1 })
    else if (d.kind === 'int') cells.push({ kind: 'int', dim: i, lo: d.lo, hi: d.hi })
    else for (let k = 0; k < s.accounts; k++) cells.push({ kind: 'int', dim: i, lo: d.lo, hi: d.hi })
  })
  const vals = cells.map((c) => c.lo)
  for (;;) {
    const scalars: Record<string, number> = {}
    const flags: Record<string, boolean> = {}
    const arrays: Record<string, number[]> = {}
    cells.forEach((c, k) => {
      const d = s.dims[c.dim] as Dim
      const n = vals[k] as number
      if (d.kind === 'flag') flags[d.v] = n === 1
      else if (d.kind === 'int') scalars[d.v] = n
      else (arrays[d.a] ??= []).push(n)
    })
    yield { scalars, flags, arrays, ix: {}, accounts: s.accounts }
    let i = cells.length - 1
    for (; i >= 0; i--) {
      const c = cells[i] as Cell
      if ((vals[i] as number) < c.hi) {
        vals[i] = (vals[i] as number) + 1
        break
      }
      vals[i] = c.lo
    }
    if (i < 0) return
  }
}

export function boxSize(s: BoxSpace): number {
  let n = 1
  for (const d of s.dims) {
    if (d.kind === 'flag') n *= 2
    else if (d.kind === 'int') n *= d.hi - d.lo + 1
    else for (let k = 0; k < s.accounts; k++) n *= d.hi - d.lo + 1
  }
  return n
}

/** Every tuple of `n` values from lo to hi. */
function tuples(n: number, lo: number, hi: number): number[][] {
  let out: number[][] = [[]]
  for (let k = 0; k < n; k++) {
    const next: number[][] = []
    for (const t of out) for (let v = lo; v <= hi; v++) next.push([...t, v])
    out = next
  }
  return out
}

/** Every pre-state and parameter choice of a step scope. */
function stepPres(s: StepSpace): StepPoint[] {
  const out: StepPoint[] = []
  const fieldVals = cartesian(s.fields.map((f) => range(f.lo, f.hi)))
  for (const bal of tuples(s.accounts, s.bal.lo, s.bal.hi))
    for (const fv of fieldVals)
      for (let x = 1; x <= s.accounts; x++)
        for (let y = 1; y <= s.accounts; y++) {
          if (!s.aliasing && x === y) continue
          for (let amt = s.amt.lo; amt <= s.amt.hi; amt++) {
            const fields: Record<string, number> = {}
            s.fields.forEach((f, i) => {
              fields[f.v] = fv[i] as number
            })
            out.push({ bal, fields, x, y, amt })
          }
        }
  return out
}

const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

function cartesian(xs: readonly (readonly number[])[]): number[][] {
  let out: number[][] = [[]]
  for (const vals of xs) {
    const next: number[][] = []
    for (const t of out) for (const v of vals) next.push([...t, v])
    out = next
  }
  return out
}

/**
 * The posts a step scope tries for a pre-state: the command's own result, the state unchanged, the reverse move,
 * then each one-field change of the command's result.
 */
function stepPosts(s: StepSpace, pre: StepPoint, run: StepPoint): StepPoint[] {
  const reverse = runCommand(s.cmd, { ...pre, x: pre.y, y: pre.x })
  const out: StepPoint[] = [run, pre, reverse]
  for (let k = 0; k < s.accounts; k++)
    for (let v = s.post.lo; v <= s.post.hi; v++) {
      if (v === run.bal[k]) continue
      const bal = [...run.bal]
      bal[k] = v
      out.push({ ...run, bal })
    }
  for (const f of s.fields)
    for (let v = s.post.lo; v <= s.post.hi; v++) {
      if (v === run.fields[f.v]) continue
      out.push({ ...run, fields: { ...run.fields, [f.v]: v } })
    }
  return out
}

export function stepScopeSize(s: StepSpace): number {
  const pres = stepPres(s).length
  const width = s.post.hi - s.post.lo + 1
  return pres * (3 + (s.accounts + s.fields.length) * (width - 1))
}

export function spaceSize(s: Space): number {
  if (s.kind === 'box') return boxSize(s)
  if (s.kind === 'worlds') {
    let n = 4
    for (let k = 0; k < 3 * s.teams; k++) n *= 2
    return n
  }
  return stepScopeSize(s)
}

// ---------------------------------------------------------------- evaluation of a spec at a point

/** The step scope needs the command to say which post is the real one; every other scope ignores it. */
type At = { readonly kind: 'box'; readonly p: Point } | { readonly kind: 'world'; readonly w: World } | { readonly kind: 'step'; readonly pre: StepPoint; readonly post: StepPoint; readonly p: Point }

function holds(spec: Spec, at: At): boolean {
  switch (spec.kind) {
    case 'formula':
      if (at.kind === 'world') throw new Error('a formula is not evaluated on a world')
      return evaluate(spec.f, at.p)
    case 'property':
      if (at.kind !== 'box') throw new Error('a property story reads a box point')
      return propertyHolds(spec.req, at.p)
    case 'policy':
      if (at.kind !== 'world') throw new Error('a policy is evaluated on a world')
      return grants(spec.p, at.w)
    case 'access':
      if (at.kind !== 'world') throw new Error('an access story reads a world')
      return accessGranted(spec.req, at.w)
    case 'command': {
      if (at.kind !== 'step') throw new Error('a command relates a pre-state to a post-state')
      const run = runCommand(spec.cmd, at.pre)
      return JSON.stringify(run.bal) === JSON.stringify(at.post.bal) && JSON.stringify(run.fields) === JSON.stringify(at.post.fields)
    }
  }
}

/** A point as the feedback prints it. */
export function showAt(at: At): Record<string, string | number | boolean> {
  if (at.kind === 'world') return showWorld(at.w)
  if (at.kind === 'box') {
    const out: Record<string, string | number | boolean> = { ...at.p.flags, ...at.p.scalars }
    for (const [a, xs] of Object.entries(at.p.arrays)) xs.forEach((n, i) => (out[`${a}(${i + 1})`] = n))
    return out
  }
  const out: Record<string, string | number | boolean> = { x: at.pre.x, y: at.pre.y, amt: at.pre.amt }
  at.pre.bal.forEach((n, i) => (out[`bal(${i + 1})`] = n))
  for (const [k, n] of Object.entries(at.pre.fields)) out[k] = n
  at.post.bal.forEach((n, i) => (out[`bal'(${i + 1})`] = n))
  for (const [k, n] of Object.entries(at.post.fields)) out[`${k}'`] = n
  return out
}

/** Reads a printed point back, for replay; null when it is not one of the space's. */
export function readAt(space: Space, x: unknown): At | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  if (space.kind === 'worlds') {
    const w = readWorld(o, space.teams)
    return w === null ? null : { kind: 'world', w }
  }
  const n = (k: string): number | null => (typeof o[k] === 'number' ? (o[k] as number) : null)
  if (space.kind === 'box') {
    const scalars: Record<string, number> = {}
    const flags: Record<string, boolean> = {}
    const arrays: Record<string, number[]> = {}
    for (const d of space.dims) {
      if (d.kind === 'flag') {
        if (typeof o[d.v] !== 'boolean') return null
        flags[d.v] = o[d.v] as boolean
      } else if (d.kind === 'int') {
        const k = n(d.v)
        if (k === null) return null
        scalars[d.v] = k
      } else {
        const xs: number[] = []
        for (let i = 1; i <= space.accounts; i++) {
          const k = n(`${d.a}(${i})`)
          if (k === null) return null
          xs.push(k)
        }
        arrays[d.a] = xs
      }
    }
    return { kind: 'box', p: { scalars, flags, arrays, ix: {}, accounts: space.accounts } }
  }
  const xv = n('x')
  const yv = n('y')
  const amt = n('amt')
  if (xv === null || yv === null || amt === null) return null
  const bal: number[] = []
  const balP: number[] = []
  for (let i = 1; i <= space.accounts; i++) {
    const b = n(`bal(${i})`)
    const bp = n(`bal'(${i})`)
    if (b === null || bp === null) return null
    bal.push(b)
    balP.push(bp)
  }
  const fields: Record<string, number> = {}
  const fieldsP: Record<string, number> = {}
  for (const f of space.fields) {
    const a = n(f.v)
    const b = n(`${f.v}'`)
    if (a === null || b === null) return null
    fields[f.v] = a
    fieldsP[f.v] = b
  }
  const pre: StepPoint = { bal, fields, x: xv, y: yv, amt }
  const post: StepPoint = { ...pre, bal: balP, fields: fieldsP }
  return { kind: 'step', pre, post, p: stepPoint(space.accounts, pre, post) }
}

/** True when the two specs disagree at the point. */
export function disagreeAt(a: Spec, b: Spec, at: At): boolean {
  return holds(a, at) !== holds(b, at)
}

function* pointsOf(space: Space): Generator<At> {
  if (space.kind === 'box') {
    for (const p of boxPoints(space)) yield { kind: 'box', p }
    return
  }
  if (space.kind === 'worlds') {
    for (const w of worlds(space.teams)) yield { kind: 'world', w }
    return
  }
  for (const pre of stepPres(space)) {
    // The posts tried: the command's result, the state unchanged, the reverse move, and each one-field change.
    const run = runCommand(space.cmd, pre)
    for (const post of stepPosts(space, pre, run)) yield { kind: 'step', pre, post, p: stepPoint(space.accounts, pre, post) }
  }
}

// ---------------------------------------------------------------- the port

export interface DifferQuery {
  readonly op: 'differ'
  readonly space: Space
  readonly a: Spec
  readonly b: Spec
}

export type Witness = Record<string, string | number | boolean>

/** Error with a bus error code, as the instrument bus rejects a request. */
export class SpecScopeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SpecScopeError'
    this.code = code
  }
}

/** sat with the first point where the specs disagree, unsat when they agree on every point, unknown past the budget. */
export function decide(q: DifferQuery, maxPoints: number): InstrumentReply<Witness> {
  const size = spaceSize(q.space)
  const budget = { wallMs: 0, maxStates: maxPoints }
  const provenance = { engine: SPEC_SCOPE, version: SPEC_SCOPE_VERSION, build: `${SPEC_SCOPE}@${SPEC_SCOPE_VERSION}`, budget }
  if (size > maxPoints) return { verdict: { kind: 'unknown', reason: `the scope holds ${size} points, over the budget of ${maxPoints}` }, stats: { ms: 0, n: 0 }, provenance }
  let n = 0
  for (const at of pointsOf(q.space)) {
    n += 1
    if (disagreeAt(q.a, q.b, at)) return { verdict: { kind: 'sat' }, witness: showAt(at), stats: { ms: 0, n }, provenance }
  }
  return { verdict: { kind: 'unsat' }, stats: { ms: 0, n }, provenance }
}

function isQuery(x: unknown): x is DifferQuery {
  if (typeof x !== 'object' || x === null) return false
  const q = x as Partial<DifferQuery>
  return q.op === 'differ' && typeof q.space === 'object' && typeof q.a === 'object' && typeof q.b === 'object'
}

/** The spec scope as a port: it answers spec-scope requests and refuses every other engine. */
export const specScopePort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== SPEC_SCOPE) throw new SpecScopeError('unknown-engine', `the spec scope runs ${SPEC_SCOPE}, not ${req.engine}`)
    if (req.version !== SPEC_SCOPE_VERSION) throw new SpecScopeError('version-mismatch', `the spec scope is version ${SPEC_SCOPE_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new SpecScopeError('invalid-input', 'not a spec-scope query')
    return decide(req.input, req.budget.maxStates ?? SPEC_SCOPE_MAX_POINTS) as unknown as InstrumentReply<W>
  },
}
