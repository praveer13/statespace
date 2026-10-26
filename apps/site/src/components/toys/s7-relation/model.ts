// The relation workbench for S7.L6: W0 on the left, a copy of W0 on the right in which the learner makes some fields
// differ. The page decides whether the two worlds are related under a relation, names the clause each change breaks,
// runs Open for an observer on both worlds and compares the two responses. Pure and small, and the search in leakFor is
// exhaustive over this toy's twelve fields only.
//
// W0: Payments (dana, editor) and Growth (frank, viewer) are Acme's; Legal is Birch's. Payments owns q3-plan, Growth
// owns roadmap, Legal owns contract and layoffs-memo. roadmap is shared with Payments; contract is shared with dana.

export type Group = 'acme' | 'released' | 'private'

export const GROUPS: readonly { readonly id: Group; readonly label: string }[] = [
  { id: 'acme', label: "All of Acme's data" },
  { id: 'released', label: 'What Birch released to Acme' },
  { id: 'private', label: "Birch's private data" },
]

export type FieldId =
  | 'q3.title'
  | 'q3.body'
  | 'roadmap.title'
  | 'roadmap.body'
  | 'roadmap.share'
  | 'contract.share'
  | 'contract.title'
  | 'contract.body'
  | 'contract.notes'
  | 'memo.exists'
  | 'memo.title'
  | 'memo.body'

export interface Field {
  readonly id: FieldId
  readonly group: Group
  /** What the field is, in W0. */
  readonly label: string
  /** What making it differ means on the right. */
  readonly differs: string
}

export const FIELDS: readonly Field[] = [
  { id: 'q3.title', group: 'acme', label: "q3-plan's title", differs: 'another title' },
  { id: 'q3.body', group: 'acme', label: "q3-plan's body", differs: 'another body' },
  { id: 'roadmap.title', group: 'acme', label: "roadmap's title", differs: 'another title' },
  { id: 'roadmap.body', group: 'acme', label: "roadmap's body", differs: 'another body' },
  { id: 'roadmap.share', group: 'acme', label: 'roadmap shared with Payments', differs: 'not shared' },
  { id: 'contract.share', group: 'released', label: 'contract shared with dana', differs: 'not shared' },
  { id: 'contract.title', group: 'released', label: "contract's title", differs: 'another title' },
  { id: 'contract.body', group: 'released', label: "contract's body", differs: 'another body' },
  { id: 'contract.notes', group: 'private', label: "contract's internal notes", differs: 'other notes' },
  { id: 'memo.exists', group: 'private', label: 'layoffs-memo exists', differs: 'absent' },
  { id: 'memo.title', group: 'private', label: "layoffs-memo's title", differs: 'another title' },
  { id: 'memo.body', group: 'private', label: "layoffs-memo's body", differs: 'another body' },
]

export type RelationId = 'acme' | 'acme-only' | 'identical'

export const RELATIONS: readonly { readonly id: RelationId; readonly label: string; readonly agree: readonly Group[] }[] = [
  { id: 'acme', label: "~Acme: agree on Acme's data and on Birch's releases to Acme", agree: ['acme', 'released'] },
  { id: 'acme-only', label: "Agree on Acme's data only", agree: ['acme'] },
  { id: 'identical', label: 'Identical worlds', agree: ['acme', 'released', 'private'] },
]

export type Changes = ReadonlySet<FieldId>

const field = (id: FieldId): Field => FIELDS.find((f) => f.id === id)!

/** The changes a relation does not allow, each with the clause it breaks. Empty means the worlds are related. */
export function broken(rel: RelationId, ch: Changes): { readonly field: Field; readonly group: Group }[] {
  const agree = RELATIONS.find((r) => r.id === rel)!.agree
  return FIELDS.filter((f) => ch.has(f.id) && agree.includes(f.group)).map((f) => ({ field: f, group: f.group }))
}

export const related = (rel: RelationId, ch: Changes): boolean => broken(rel, ch).length === 0

export type Observer = 'frank' | 'dana'
export type ViewId = 'v0' | 'v1'
export const DOCS = ['q3-plan', 'roadmap', 'contract', 'layoffs-memo'] as const
export type DocId = (typeof DOCS)[number]

const prefix: Record<DocId, string> = { 'q3-plan': 'q3', roadmap: 'roadmap', contract: 'contract', 'layoffs-memo': 'memo' }

/** May the observer read the document in this world? The read rule's three ways in. */
export function canread(o: Observer, d: DocId, right: boolean, ch: Changes): boolean {
  const on = (f: FieldId): boolean => !(right && ch.has(f))
  const team = o === 'frank' ? 'Growth' : 'Payments'
  switch (d) {
    case 'q3-plan':
      return team === 'Payments'
    case 'roadmap':
      return team === 'Growth' || (team === 'Payments' && on('roadmap.share'))
    case 'contract':
      return o === 'dana' && on('contract.share')
    case 'layoffs-memo':
      return false
  }
}

/** The whole response the observer receives from Open, error code included. Internal notes are not on the page. */
export function open(view: ViewId, o: Observer, d: DocId, right: boolean, ch: Changes): string {
  if (d === 'layoffs-memo' && right && ch.has('memo.exists')) return 'error not_found'
  if (!canread(o, d, right, ch)) return view === 'v0' ? 'error forbidden' : 'error not_found'
  const p = prefix[d]
  const prime = (f: string): string => (right && ch.has(`${p}.${f}` as FieldId) ? '′' : '')
  return `page {title${prime('title')}, body${prime('body')}}`
}

export interface Judgement {
  readonly related: boolean
  readonly broken: readonly { readonly field: Field; readonly group: Group }[]
  readonly left: string
  readonly right: string
  readonly equal: boolean
  /** A related pair the observer tells apart. */
  readonly leak: boolean
}

export function judge(rel: RelationId, view: ViewId, o: Observer, d: DocId, ch: Changes): Judgement {
  const b = broken(rel, ch)
  const left = open(view, o, d, false, ch)
  const right = open(view, o, d, true, ch)
  return { related: b.length === 0, broken: b, left, right, equal: left === right, leak: b.length === 0 && left !== right }
}

export const PAIRS = 2 ** FIELDS.length

/** Every set of changes, smallest first. */
function* subsets(): Generator<Set<FieldId>> {
  const all: Set<FieldId>[] = []
  for (let m = 0; m < PAIRS; m++) all.push(new Set(FIELDS.filter((_, i) => (m >> i) & 1).map((f) => f.id)))
  all.sort((x, y) => x.size - y.size)
  yield* all
}

export interface Search {
  /** How many (changes, request) pairs the search looked at. */
  readonly looked: number
  /** How many of them were related. */
  readonly relatedCount: number
  /** How many related pairs the observer tells apart. */
  readonly leaks: number
  /** The first leak with the fewest changes. */
  readonly smallest: { readonly changes: Changes; readonly doc: DocId } | null
  /** Related pairs in which the right world differs from W0 at all (the premise witness). */
  readonly nonTrivial: number
}

/** Exhaustive over this toy: every subset of the twelve fields, and Open on each of the four documents. */
export function leakFor(rel: RelationId, view: ViewId, o: Observer): Search {
  let looked = 0
  let relatedCount = 0
  let leaks = 0
  let nonTrivial = 0
  let smallest: Search['smallest'] = null
  for (const ch of subsets()) {
    const isRel = related(rel, ch)
    if (isRel && ch.size > 0) nonTrivial++
    for (const d of DOCS) {
      looked++
      if (!isRel) continue
      relatedCount++
      if (open(view, o, d, false, ch) !== open(view, o, d, true, ch)) {
        leaks++
        if (smallest === null) smallest = { changes: ch, doc: d }
      }
    }
  }
  return { looked, relatedCount, leaks, smallest, nonTrivial }
}

export { field }
