// GEN-spec-it's policies: a small Datalog with stratified negation over the S7 world's relations, and the worlds the
// checker enumerates. Every policy here decides one request, canread(u, d), from the facts about that user and that
// document only (their teams, the document's owners and shares, the revocation), so the checker enumerates every
// assignment of those facts for one user, one document and the scope's teams. Any world inside the printed scope that
// two policies disagree on contains a user and a document whose facts form one of these assignments, so the check is
// exact inside the scope and says nothing outside it.
//
// Evaluation: rules run in their stated order, a derived relation's rules before the rules that use it (the
// stratification), and every rule is read over every binding of its variables to the world's constants.
//
// Pure: no DOM, storage or network.

/** A rule variable: the user, the document, or a team. */
export type PVar = 'u' | 'd' | 't' | 't2'

export interface Lit {
  readonly p: string
  readonly args: readonly PVar[]
  readonly neg?: true
}

export interface Rule {
  readonly head: { readonly p: string; readonly args: readonly PVar[] }
  readonly body: readonly Lit[]
}

export type Policy = readonly Rule[]

/**
 * One user u, one document d, and teams t1..tN. `member` and the others list the teams that hold, `shareUser` and
 * `revoked` are the user's share of d and its revocation.
 */
export interface World {
  readonly teams: number
  readonly member: readonly number[]
  readonly owns: readonly number[]
  readonly shareTeam: readonly number[]
  readonly shareUser: boolean
  readonly revoked: boolean
}

/** The base relations a policy may read, in the world above. */
export const BASE = ['user', 'doc', 'member', 'owns', 'share_team', 'share_user', 'revoked'] as const

const has = (xs: readonly number[], t: number): boolean => xs.includes(t)

/** A base fact's truth for one binding. `u` and `d` are the only user and document, so they are always 0. */
function base(w: World, p: string, args: readonly number[]): boolean {
  const [a, b] = args as [number, number]
  switch (p) {
    case 'user':
    case 'doc':
      return true
    case 'member':
      return has(w.member, b)
    case 'owns':
      return has(w.owns, a)
    case 'share_team':
      return has(w.shareTeam, b)
    case 'share_user':
      return w.shareUser
    case 'revoked':
      return w.revoked
    default:
      throw new Error(`no base relation ${p}`)
  }
}

/** The constants a variable ranges over: one user, one document, the scope's teams. */
const range = (x: PVar, teams: number): number[] => (x === 'u' || x === 'd' ? [0] : Array.from({ length: teams }, (_, i) => i + 1))

function varsOf(r: Rule): PVar[] {
  const out: PVar[] = []
  for (const x of [...r.head.args, ...r.body.flatMap((l) => l.args)]) if (!out.includes(x)) out.push(x)
  return out
}

/** Every binding of the rule's variables. */
function bindings(r: Rule, teams: number): Record<PVar, number>[] {
  let out: Record<string, number>[] = [{}]
  for (const x of varsOf(r)) {
    const next: Record<string, number>[] = []
    for (const b of out) for (const c of range(x, teams)) next.push({ ...b, [x]: c })
    out = next
  }
  return out as Record<PVar, number>[]
}

const keyOf = (args: readonly number[]): string => args.join(',')

/** Whether the policy grants canread(u, d) in the world. */
export function grants(policy: Policy, w: World): boolean {
  const derived = new Map<string, Set<string>>()
  const holds = (l: Lit, b: Record<PVar, number>): boolean => {
    const args = l.args.map((x) => b[x])
    const d = derived.get(l.p)
    const v = d !== undefined ? d.has(keyOf(args)) : (BASE as readonly string[]).includes(l.p) ? base(w, l.p, args) : false
    return l.neg === true ? !v : v
  }
  for (const r of policy) {
    const set = derived.get(r.head.p) ?? new Set<string>()
    for (const b of bindings(r, w.teams)) if (r.body.every((l) => holds(l, b))) set.add(keyOf(r.head.args.map((x) => b[x])))
    derived.set(r.head.p, set)
  }
  return derived.get('canread')?.has('0,0') ?? false
}

/** Every world of the scope, in a fixed order. */
export function worlds(teams: number): World[] {
  const subsets: number[][] = []
  for (let m = 0; m < 1 << teams; m++) subsets.push(Array.from({ length: teams }, (_, i) => i + 1).filter((t) => (m & (1 << (t - 1))) !== 0))
  const out: World[] = []
  for (const member of subsets)
    for (const owns of subsets)
      for (const shareTeam of subsets)
        for (const shareUser of [false, true])
          for (const revoked of [false, true]) out.push({ teams, member, owns, shareTeam, shareUser, revoked })
  return out
}

/** The base relations the policy reads. */
export function relationsOf(policy: Policy): string[] {
  const out: string[] = []
  for (const r of policy) for (const l of r.body) if ((BASE as readonly string[]).includes(l.p) && l.p !== 'user' && l.p !== 'doc' && !out.includes(l.p)) out.push(l.p)
  return out
}

export const negationsOf = (policy: Policy): number => policy.reduce((n, r) => n + r.body.filter((l) => l.neg === true).length, 0)

const lit = (l: Lit): string => `${l.neg === true ? '!' : ''}${l.p}(${l.args.join(', ')})`

export function renderRule(r: Rule): string {
  const head = `${r.head.p}(${r.head.args.join(', ')})`
  return r.body.length === 0 ? `${head}.` : `${head} :- ${r.body.map(lit).join(', ')}.`
}

export const renderPolicy = (p: Policy): string => p.map(renderRule).join('  ')

/** The world as the feedback prints it: each team list, and the share and its revocation. */
export function showWorld(w: World): Record<string, string> {
  const ts = (xs: readonly number[]): string => (xs.length === 0 ? 'none' : xs.map((t) => `t${t}`).join(' and '))
  return {
    "u's teams": ts(w.member),
    'teams owning d': ts(w.owns),
    'teams d is shared with': ts(w.shareTeam),
    'd shared with u': w.shareUser ? 'yes' : 'no',
    'that share revoked': w.revoked ? 'yes' : 'no',
  }
}

/** Reads a world back from showWorld()'s form, for replay; null when it is not one. */
export function readWorld(x: unknown, teams: number): World | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const ts = (s: unknown): number[] | null => {
    if (s === 'none') return []
    if (typeof s !== 'string') return null
    const out = s.split(' and ').map((p) => Number(p.slice(1)))
    return out.every((t) => Number.isInteger(t) && t >= 1 && t <= teams) ? out : null
  }
  const member = ts(o["u's teams"])
  const owns = ts(o['teams owning d'])
  const shareTeam = ts(o['teams d is shared with'])
  const yes = (s: unknown): boolean | null => (s === 'yes' ? true : s === 'no' ? false : null)
  const shareUser = yes(o['d shared with u'])
  const revoked = yes(o['that share revoked'])
  if (member === null || owns === null || shareTeam === null || shareUser === null || revoked === null) return null
  return { teams, member, owns, shareTeam, shareUser, revoked }
}
