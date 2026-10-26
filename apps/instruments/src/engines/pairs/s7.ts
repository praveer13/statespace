// The S7 world and its interpreter, for INS-pairs and INS-interp's S7 extension (curriculum/S07-secrecy.md
// section 1). It has no Lean reference: SEAM-13's course claim covers the goldens' fragment only, and this file is
// outside it (tracker W4-T27; WORLD.md issue 8).
//
// A world is concrete: tenants, teams, users and their memberships, nesting, documents with their fields, and the
// shares. The read rule is rules 1 to 3 with nesting. Views leave the state unchanged and return a value, error code
// included: the observer of SEAM-10. Commands change the state; the interpreter keeps each observer's delivered log,
// which only grows, and can check the ACL on a replica that lags the primary by a number of steps (S7.L8's
// replicated model).
//
// Pure: no DOM, storage or network, so it runs in a worker and in Node unchanged.

export type Role = 'viewer' | 'editor' | 'admin'
export type Field = 'title' | 'body' | 'internal_notes'
export const FIELDS: readonly Field[] = ['title', 'body', 'internal_notes']

export interface Doc {
  readonly id: string
  readonly team: string
  readonly slug: string
  readonly title: string
  readonly body: string
  readonly internal_notes: string
  readonly version: number
}

export interface ShareUser {
  readonly doc: string
  readonly user: string
  readonly revoked: boolean
}

export interface World {
  readonly teamTenant: Readonly<Record<string, string>>
  readonly userTenant: Readonly<Record<string, string>>
  readonly members: readonly { readonly user: string; readonly team: string; readonly role: Role }[]
  /** [s, t]: team s is nested in team t. */
  readonly subteams: readonly (readonly [string, string])[]
  readonly docs: readonly Doc[]
  readonly shareUser: readonly ShareUser[]
  /** [doc, team] */
  readonly shareTeam: readonly (readonly [string, string])[]
}

const doc = (id: string, team: string): Doc => ({ id, team, slug: id, title: `${id} title`, body: `${id} body`, internal_notes: `${id} notes`, version: 1 })

/** The reference world W0 (curriculum/S07-secrecy.md section 1). */
export const W0: World = {
  teamTenant: { payments: 'acme', growth: 'acme', legal: 'birch' },
  userTenant: { dana: 'acme', frank: 'acme', gia: 'birch', hal: 'birch' },
  members: [
    { user: 'dana', team: 'payments', role: 'editor' },
    { user: 'frank', team: 'growth', role: 'viewer' },
    { user: 'gia', team: 'legal', role: 'admin' },
    { user: 'hal', team: 'legal', role: 'viewer' },
  ],
  subteams: [],
  docs: [doc('q3-plan', 'payments'), doc('roadmap', 'growth'), doc('contract', 'legal'), doc('layoffs-memo', 'legal')],
  shareUser: [{ doc: 'contract', user: 'dana', revoked: false }],
  shareTeam: [['roadmap', 'payments']],
}

export const docOf = (w: World, id: string): Doc | undefined => w.docs.find((d) => d.id === id)
export const tenantOfDoc = (w: World, d: Doc): string => w.teamTenant[d.team] ?? ''

/** The teams a user is in: their memberships, and every team those are nested in. */
export function teamsOf(w: World, user: string): Set<string> {
  const out = new Set(w.members.filter((m) => m.user === user).map((m) => m.team))
  let grew = true
  while (grew) {
    grew = false
    for (const [s, t] of w.subteams) {
      if (out.has(s) && !out.has(t)) {
        out.add(t)
        grew = true
      }
    }
  }
  return out
}

/** Which rules let `user` read `id`, in order; empty when none does. */
export function readRules(w: World, user: string, id: string): number[] {
  const d = docOf(w, id)
  if (d === undefined) return []
  const teams = teamsOf(w, user)
  const rules: number[] = []
  if (teams.has(d.team)) rules.push(1)
  if (w.shareUser.some((s) => s.doc === id && s.user === user && !s.revoked)) rules.push(2)
  if (w.shareTeam.some(([x, t]) => x === id && teams.has(t))) rules.push(3)
  return rules
}

export const canread = (w: World, user: string, id: string): boolean => readRules(w, user, id).length > 0

// ------------------------------------------------------------------------------------------------ views
/** A view's result: a page, a list, a count, a write outcome or an error code. */
export type Result =
  | { readonly code: 'ok'; readonly page: Readonly<Record<string, string>> }
  | { readonly code: 'ok'; readonly hits: readonly string[]; readonly total?: number }
  | { readonly code: 'ok'; readonly created: string }
  | { readonly code: string }

export type Request =
  /** v0 answers forbidden when the document exists and may not be read; v1 answers not_found for both (S7.L5's fix);
   * leaky is v1 whose page also returns internal_notes (the roadmap's deliberate bug, S7.L7). */
  | { readonly view: 'Open'; readonly variant: 'v0' | 'v1' | 'leaky'; readonly user: string; readonly doc: string }
  /** before: total counts every match, before the filter (SP-7.2); after: total counts the hits. */
  | { readonly view: 'Search'; readonly variant: 'before' | 'after'; readonly user: string; readonly term: string }
  | { readonly view: 'ListShared'; readonly user: string }
  /** Slugs are globally unique, so a slug another tenant holds fails the insert (SP-7.5). */
  | { readonly view: 'CreateDoc'; readonly user: string; readonly team: string; readonly slug: string }

export function runRequest(w: World, r: Request): Result {
  switch (r.view) {
    case 'Open': {
      const d = docOf(w, r.doc)
      if (d === undefined) return { code: 'not_found' }
      if (!canread(w, r.user, r.doc)) return { code: r.variant === 'v0' ? 'forbidden' : 'not_found' }
      const page: Record<string, string> = { title: d.title, body: d.body, owner_team: d.team }
      if (r.variant === 'leaky') page.internal_notes = d.internal_notes
      return { code: 'ok', page }
    }
    case 'Search': {
      const matches = w.docs.filter((d) => d.title.includes(r.term) || d.slug.includes(r.term))
      const hits = matches.filter((d) => canread(w, r.user, d.id)).map((d) => d.id).sort()
      return { code: 'ok', hits, total: r.variant === 'before' ? matches.length : hits.length }
    }
    case 'ListShared': {
      const hits = w.docs.filter((d) => canread(w, r.user, d.id) && !teamsOf(w, r.user).has(d.team)).map((d) => d.id).sort()
      return { code: 'ok', hits }
    }
    case 'CreateDoc': {
      if (!teamsOf(w, r.user).has(r.team)) return { code: 'forbidden' }
      if (w.docs.some((d) => d.slug === r.slug)) return { code: 'unique_violation' }
      return { code: 'ok', created: r.slug }
    }
  }
}

/** A page returned to `user` passes the read check: the per-response monitor of S7.L5, a property of one run. */
export function pagePassesCheck(w: World, r: Request, result: Result): boolean {
  if (r.view !== 'Open' || result.code !== 'ok') return true
  return canread(w, r.user, r.doc)
}

export const showResult = (r: Result): string => JSON.stringify(r)

// ------------------------------------------------------------------------------------------------ commands
export type Command =
  | { readonly kind: 'Share'; readonly by: string; readonly doc: string; readonly user: string }
  | { readonly kind: 'Revoke'; readonly by: string; readonly doc: string; readonly user: string }
  | { readonly kind: 'Edit'; readonly by: string; readonly doc: string; readonly field: Field; readonly value: string }
  | { readonly kind: 'Open'; readonly user: string; readonly doc: string }

/** Editors and admins of a document's owning team: the guard of Share, Revoke and Edit. */
export function mayManage(w: World, by: string, id: string): boolean {
  const d = docOf(w, id)
  return d !== undefined && w.members.some((m) => m.user === by && m.team === d.team && m.role !== 'viewer')
}

export function applyCommand(w: World, c: Command): World {
  if (c.kind === 'Open' || !mayManage(w, c.by, c.doc)) return w
  if (c.kind === 'Share') {
    const rest = w.shareUser.filter((s) => !(s.doc === c.doc && s.user === c.user))
    return { ...w, shareUser: [...rest, { doc: c.doc, user: c.user, revoked: false }] }
  }
  if (c.kind === 'Revoke') return { ...w, shareUser: w.shareUser.map((s) => (s.doc === c.doc && s.user === c.user ? { ...s, revoked: true } : s)) }
  return { ...w, docs: w.docs.map((d) => (d.id === c.doc ? { ...d, [c.field]: c.value, version: d.version + 1 } : d)) }
}

export interface TraceStep {
  readonly i: number
  readonly command: Command
  /** For Open: the page returned, `<doc>@<version>`, or null for a refusal. */
  readonly page: string | null
  /** For Open: the body the page carried. */
  readonly body: string | null
  /** Whether, in the primary state after the step, the subject may read the document. */
  readonly canread: boolean
  /** The subject's delivered log after the step. */
  readonly delivered: readonly string[]
}

/** Run commands on a world. With `lag` > 0, Open checks the ACL as the primary had it `lag` steps earlier and reads
 * the content from the primary. */
export function interpret(world: World, commands: readonly Command[], lag = 0): TraceStep[] {
  let w = world
  const acl: World[] = []
  const delivered = new Map<string, string[]>()
  const out: TraceStep[] = []
  commands.forEach((c, k) => {
    acl.push(w)
    let page: string | null = null
    let body: string | null = null
    if (c.kind === 'Open') {
      const replica = lag > 0 ? acl[Math.max(0, acl.length - 1 - lag)]! : w
      const d = docOf(w, c.doc)
      if (d !== undefined && canread({ ...w, shareUser: replica.shareUser, shareTeam: replica.shareTeam }, c.user, c.doc)) {
        page = `${d.id}@${d.version}`
        body = d.body
        delivered.set(c.user, [...(delivered.get(c.user) ?? []), page])
      }
    } else {
      w = applyCommand(w, c)
    }
    const subject = c.kind === 'Edit' ? c.by : c.user
    out.push({ i: k + 1, command: c, page, body, canread: canread(w, subject, c.doc), delivered: [...(delivered.get(subject) ?? [])] })
  })
  return out
}

/** S-new, "after revocation, no new read succeeds": every successful Open is allowed by the primary state. */
export function sNew(trace: readonly TraceStep[]): { readonly holds: boolean; readonly step?: number } {
  const bad = trace.find((s) => s.command.kind === 'Open' && s.page !== null && !s.canread)
  return bad === undefined ? { holds: true } : { holds: false, step: bad.i }
}

/** S-past, "revocation removes what was already read": after Revoke(u, d), no page of d is in u's log. */
export function sPast(trace: readonly TraceStep[]): { readonly holds: boolean; readonly step?: number; readonly kept?: string } {
  for (const s of trace) {
    if (s.command.kind !== 'Revoke') continue
    const prefix = `${s.command.doc}@`
    const kept = s.delivered.find((p) => p.startsWith(prefix))
    if (kept !== undefined) return { holds: false, step: s.i, kept }
  }
  return { holds: true }
}

export function showCommand(c: Command): string {
  switch (c.kind) {
    case 'Share':
      return `Share(${c.by}: ${c.doc} -> ${c.user})`
    case 'Revoke':
      return `Revoke(${c.by}: ${c.doc} -> ${c.user})`
    case 'Edit':
      return `Edit(${c.by}: ${c.doc}.${c.field} = ${JSON.stringify(c.value)})`
    case 'Open':
      return `Open(${c.user}, ${c.doc})`
  }
}

export function showStep(s: TraceStep): string {
  const open = s.command.kind === 'Open' ? ` -> ${s.page === null ? 'refused' : `${s.page} ${JSON.stringify(s.body)}`}` : ''
  return `${s.i}. ${showCommand(s.command)}${open}; canread ${s.canread ? 'yes' : 'no'}; delivered [${s.delivered.join(', ')}]`
}
