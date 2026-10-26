// The pair game for S7.L5: one request from frank, sent to W0 and to a copy of W0 with one change to Birch's private
// data. Pure and small: the page runs each view on each world, runs the per-run monitor (check A) on each response and
// compares the two responses (check B).
//
// W0 (the lesson's reference world): Acme holds Payments (dana, editor) and Growth (frank, viewer); Birch holds Legal
// (gia, hal). Payments owns q3-plan, Growth owns roadmap, Legal owns contract and layoffs-memo. contract is shared with
// dana and roadmap with Payments. Slugs are the document ids.

export type Tenant = 'Acme' | 'Birch'

export interface Doc {
  readonly id: string
  readonly team: string
  readonly tenant: Tenant
  /** Who may read it besides the owning team's members: a user share or a team share. */
  readonly sharedWithUsers: readonly string[]
  readonly sharedWithTeams: readonly string[]
  readonly body: string
}

export type World = readonly Doc[]

export const FRANK = { name: 'frank', teams: ['Growth'] } as const

export const W0: World = [
  { id: 'q3-plan', team: 'Payments', tenant: 'Acme', sharedWithUsers: [], sharedWithTeams: [], body: 'Q3 targets' },
  { id: 'roadmap', team: 'Growth', tenant: 'Acme', sharedWithUsers: [], sharedWithTeams: ['Payments'], body: 'Next quarter' },
  { id: 'contract', team: 'Legal', tenant: 'Birch', sharedWithUsers: ['dana'], sharedWithTeams: [], body: 'Terms' },
  { id: 'layoffs-memo', team: 'Legal', tenant: 'Birch', sharedWithUsers: [], sharedWithTeams: [], body: 'Private' },
]

/** One change to Birch's private data. Each keeps the two worlds related under ~Acme. */
export type Change = 'no-memo' | 'memo-body' | 'budget'

export const CHANGES: readonly { readonly id: Change; readonly label: string; readonly right: string }[] = [
  { id: 'no-memo', label: 'Birch has no layoffs-memo', right: 'W0 without layoffs-memo' },
  { id: 'memo-body', label: "layoffs-memo's body differs", right: "W0 with another body for layoffs-memo" },
  { id: 'budget', label: 'Birch has a private budget too', right: 'W0 with a private Birch budget' },
]

export function applyChange(w: World, c: Change): World {
  switch (c) {
    case 'no-memo':
      return w.filter((d) => d.id !== 'layoffs-memo')
    case 'memo-body':
      return w.map((d) => (d.id === 'layoffs-memo' ? { ...d, body: 'Private, rewritten' } : d))
    case 'budget':
      return [...w, { id: 'budget', team: 'Legal', tenant: 'Birch', sharedWithUsers: [], sharedWithTeams: [], body: 'Figures' }]
  }
}

/** The read rule's three ways in, for frank. */
export function canread(d: Doc, user: { readonly name: string; readonly teams: readonly string[] }): boolean {
  return user.teams.includes(d.team) || d.sharedWithUsers.includes(user.name) || d.sharedWithTeams.some((t) => user.teams.includes(t))
}

export type ViewId = 'open-v0' | 'open-v1' | 'create-global' | 'create-tenant'

export const VIEWS: readonly { readonly id: ViewId; readonly label: string; readonly code: string; readonly kind: 'open' | 'create' }[] = [
  {
    id: 'open-v0',
    label: 'Open, version 0',
    kind: 'open',
    code: 'if no document has this id        then error not_found\nelse if not canread(viewer, id)   then error forbidden\nelse the page of id',
  },
  {
    id: 'open-v1',
    label: 'Open, version 1',
    kind: 'open',
    code: 'if no document has this id\n   or not canread(viewer, id)     then error not_found\nelse the page of id',
  },
  {
    id: 'create-global',
    label: 'CreateDoc, slugs unique everywhere',
    kind: 'create',
    code: 'if any document in any tenant has this slug   then error slug_taken\nelse add the document to team                 and answer created',
  },
  {
    id: 'create-tenant',
    label: 'CreateDoc, slugs unique per tenant',
    kind: 'create',
    code: "if a document in frank's tenant has this slug   then error slug_taken\nelse add the document to team                   and answer created",
  },
]

export const OPEN_IDS = ['q3-plan', 'roadmap', 'contract', 'layoffs-memo', 'budget'] as const
export const SLUGS = ['layoffs-memo', 'budget', 'notes'] as const

export interface Response {
  /** The whole response as frank receives it, error code included. */
  readonly text: string
  /** The page returned, if any: the monitor checks it against canread. */
  readonly page: Doc | null
}

export function run(view: ViewId, arg: string, w: World): Response {
  const d = w.find((x) => x.id === arg)
  switch (view) {
    case 'open-v0':
      if (d === undefined) return { text: 'error not_found', page: null }
      if (!canread(d, FRANK)) return { text: 'error forbidden', page: null }
      return { text: `page ${d.id}: "${d.body}"`, page: d }
    case 'open-v1':
      if (d === undefined || !canread(d, FRANK)) return { text: 'error not_found', page: null }
      return { text: `page ${d.id}: "${d.body}"`, page: d }
    case 'create-global':
      return d !== undefined ? { text: 'error slug_taken', page: null } : { text: 'created', page: null }
    case 'create-tenant':
      return d !== undefined && d.tenant === 'Acme' ? { text: 'error slug_taken', page: null } : { text: 'created', page: null }
  }
}

/** Check A, on one run alone: every page returned passes canread. */
export const monitorPasses = (r: Response): boolean => r.page === null || canread(r.page, FRANK)

export interface PairResult {
  readonly left: Response
  readonly right: Response
  readonly monitorLeft: boolean
  readonly monitorRight: boolean
  /** Check B, on the two runs together: frank's two responses are equal. */
  readonly equal: boolean
}

export function runPair(view: ViewId, arg: string, change: Change): PairResult {
  const left = run(view, arg, W0)
  const right = run(view, arg, applyChange(W0, change))
  return { left, right, monitorLeft: monitorPasses(left), monitorRight: monitorPasses(right), equal: left.text === right.text }
}

export const argsFor = (view: ViewId): readonly string[] => (VIEWS.find((v) => v.id === view)?.kind === 'create' ? SLUGS : OPEN_IDS)

/** Every (argument, change) in this toy's menu that frank tells apart under a view. */
export function leaks(view: ViewId): { readonly arg: string; readonly change: Change }[] {
  const out: { arg: string; change: Change }[] = []
  for (const arg of argsFor(view)) for (const c of CHANGES) if (!runPair(view, arg, c.id).equal) out.push({ arg, change: c.id })
  return out
}

/** How many pairs the menu holds for a view. */
export const menuSize = (view: ViewId): number => argsFor(view).length * CHANGES.length
