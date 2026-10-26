// INS-pairs: the paired-state evaluator (ASSESSMENT.md section 4.11; ARCHITECTURE.md section 6.7). Two executions of
// one request side by side: are the two states related, and does the observer tell the results apart? Bounds are
// printed with every answer that rests on a search (I10).
//
// Two models:
//   * concrete S7 worlds (s7.ts): a pair is two worlds and a request; the relation is the tenant equivalence ~a with a
//     release record, the blanket relation ("no tenant can ever observe any change in another tenant") or identity;
//     the observer is the response, error codes included (SEAM-10), or successful pages only;
//   * the view slice of LAB-7.5 (labs/LAB-7/checker/src/lib.rs): eight state symbols per execution, a view in the
//     .view format, the observer and release list of claims/observer.yaml. `findSlicePair` decides "none" by trying
//     every state with Booleans and integers in {0, 1}: exact inside that scope, and nothing outside it.
//
// Pure.

import { FIELDS, canread, docOf, runRequest, pagePassesCheck, showResult, teamsOf, tenantOfDoc, type Field, type Request, type Result, type World } from './s7.ts'

export type Relation =
  | { readonly kind: 'tenant'; readonly tenant: string; readonly release: readonly Field[] }
  | { readonly kind: 'blanket' }
  | { readonly kind: 'identical' }

export type Observer = 'response' | 'pages-only'

export interface Pair {
  readonly world1: World
  readonly world2: World
  readonly request: Request
  readonly relation: Relation
  readonly observer: Observer
}

export interface Judgment {
  readonly related: boolean
  /** Why the worlds are not related, when they are not. */
  readonly unrelated?: string
  readonly result1: Result
  readonly result2: Result
  readonly seen1: string
  readonly seen2: string
  /** Related, and the observer sees different things: a leak witness. */
  readonly distinguishes: boolean
  /** The per-response monitor ("every page returned passes canread"), run on each execution alone. */
  readonly monitor1: boolean
  readonly monitor2: boolean
}

/** The principals of a tenant: its users and its teams. */
const usersOf = (w: World, a: string): string[] => Object.keys(w.userTenant).filter((u) => w.userTenant[u] === a)

/** Documents of other tenants released to tenant `a`: shared, unrevoked, with one of its users or teams. */
export function releasedTo(w: World, a: string): Set<string> {
  const out = new Set<string>()
  for (const d of w.docs) {
    if (tenantOfDoc(w, d) === a) continue
    if (usersOf(w, a).some((u) => canread(w, u, d.id))) out.add(d.id)
  }
  return out
}

/** `null` when the worlds are related, else why not. */
export function unrelated(rel: Relation, w1: World, w2: World): string | null {
  if (rel.kind === 'blanket') return null
  if (rel.kind === 'identical') return JSON.stringify(w1) === JSON.stringify(w2) ? null : 'the worlds differ, and the relation is identity'
  const a = rel.tenant
  for (const key of ['teamTenant', 'userTenant', 'members', 'subteams', 'shareTeam'] as const) {
    if (JSON.stringify(w1[key]) !== JSON.stringify(w2[key])) return `the worlds differ in ${key}, which ${a} may know`
  }
  const sharesOf = (w: World): string =>
    JSON.stringify(w.shareUser.filter((s) => w.userTenant[s.user] === a).map((s) => [s.doc, s.user, s.revoked]).sort())
  if (sharesOf(w1) !== sharesOf(w2)) return `the shares to ${a}'s users differ`
  const own = (w: World): string => JSON.stringify(w.docs.filter((d) => tenantOfDoc(w, d) === a).map((d) => ({ ...d, version: 0 })).sort((x, y) => (x.id < y.id ? -1 : 1)))
  if (own(w1) !== own(w2)) return `${a}'s own documents differ`
  const r1 = releasedTo(w1, a)
  const r2 = releasedTo(w2, a)
  if (JSON.stringify([...r1].sort()) !== JSON.stringify([...r2].sort())) return `the documents released to ${a} differ`
  for (const id of r1) {
    const d1 = docOf(w1, id)
    const d2 = docOf(w2, id)
    if (d1 === undefined || d2 === undefined) return `the released document ${id} exists in one world only`
    for (const f of rel.release) if (d1[f] !== d2[f]) return `the released ${f} of ${id} differs, and the record releases it to ${a}`
  }
  return null
}

export function seen(observer: Observer, r: Result): string {
  if (observer === 'pages-only' && r.code !== 'ok') return '(no page)'
  return showResult(r)
}

export function judge(p: Pair): Judgment {
  const why = unrelated(p.relation, p.world1, p.world2)
  const result1 = runRequest(p.world1, p.request)
  const result2 = runRequest(p.world2, p.request)
  const seen1 = seen(p.observer, result1)
  const seen2 = seen(p.observer, result2)
  return {
    related: why === null,
    ...(why === null ? {} : { unrelated: why }),
    result1,
    result2,
    seen1,
    seen2,
    distinguishes: why === null && seen1 !== seen2,
    monitor1: pagePassesCheck(p.world1, p.request, result1),
    monitor2: pagePassesCheck(p.world2, p.request, result2),
  }
}

/** The judgment as verdict lines, the form a run record and the bus reply carry. */
export function judgmentLines(name: string, p: Pair, j: Judgment): string[] {
  const lines = [
    `pair ${name}: ${j.related ? 'related' : `not related (${j.unrelated})`}`,
    `  execution 1: ${j.seen1}`,
    `  execution 2: ${j.seen2}`,
    `  per-response monitor: execution 1 ${j.monitor1 ? 'passes' : 'fails'}, execution 2 ${j.monitor2 ? 'passes' : 'fails'}`,
  ]
  lines.push(j.distinguishes ? `  verdict: told apart (a leak witness under ${relationText(p.relation)})` : j.related ? '  verdict: not told apart' : '  verdict: no witness (the worlds are not related)')
  return lines
}

export function relationText(r: Relation): string {
  if (r.kind === 'blanket') return 'the blanket relation'
  if (r.kind === 'identical') return 'identity'
  return `~${r.tenant} with release {${r.release.join(', ')}}`
}

// ------------------------------------------------------------------------------------------------ the view slice
export const SLICE_STATE = [
  ['exists', 'bool'],
  ['own', 'bool'],
  ['shared', 'bool'],
  ['title', 'int'],
  ['body', 'int'],
  ['internal_notes', 'int'],
  ['visible', 'int'],
  ['hidden', 'int'],
] as const

export type SliceState = Readonly<Record<(typeof SLICE_STATE)[number][0], boolean | number>>

export interface SliceView {
  readonly name: string
  readonly missing: string
  readonly denied: string
  readonly fields: readonly Field[]
  readonly total: 'none' | 'visible' | 'all'
}

export interface SliceObserver {
  readonly observe: readonly ('code' | 'fields' | 'total')[]
  readonly release: readonly Field[]
}

/** The same reader as labs/LAB-7/checker/src/lib.rs `read_view`. */
export function readView(text: string): SliceView {
  let name = ''
  let missing = ''
  let denied = ''
  let total: SliceView['total'] = 'none'
  const fields: Field[] = []
  text.split('\n').forEach((raw, n) => {
    const line = raw.split('#')[0]!.trim()
    if (line === '') return
    const words = line.split(/\s+/)
    if (words.length !== 2) throw new Error(`line ${n + 1}: expected \`<key> <value>\``)
    const [key, value] = words as [string, string]
    if (key === 'view') name = value
    else if (key === 'missing') missing = value
    else if (key === 'denied') denied = value
    else if (key === 'field') {
      if (!(FIELDS as readonly string[]).includes(value)) throw new Error(`line ${n + 1}: ${value} is not a field`)
      if (!fields.includes(value as Field)) fields.push(value as Field)
    } else if (key === 'total') {
      if (value !== 'none' && value !== 'visible' && value !== 'all') throw new Error(`line ${n + 1}: total is none, visible or all`)
      total = value
    } else throw new Error(`line ${n + 1}: unknown key ${key}`)
  })
  if (!name || !missing || !denied) throw new Error('a view names itself and its missing and denied codes')
  return { name, missing, denied, fields, total }
}

/** labs/LAB-7/checker/src/lib.rs `code_number`. */
export function codeNumber(code: string): number {
  if (code === 'ok') return 0
  if (code === 'not_found') return 1
  if (code === 'forbidden') return 2
  let h = 0
  for (const b of new TextEncoder().encode(code)) h = (h * 31 + b) % 1_000_003
  return 3 + h
}

export function sliceObservation(v: SliceView, o: SliceObserver, s: SliceState): string {
  const readable = s.exists === true && (s.own === true || s.shared === true)
  const code = s.exists !== true ? v.missing : !readable ? v.denied : 'ok'
  const total = v.total === 'none' ? 0 : v.total === 'visible' ? (s.visible as number) : (s.visible as number) + (s.hidden as number)
  const parts: [string, unknown][] = []
  if (o.observe.includes('code')) parts.push(['code', codeNumber(code)])
  if (o.observe.includes('fields')) parts.push(['fields', v.fields.map((f) => (readable ? s[f] : 0))])
  if (o.observe.includes('total')) parts.push(['total', total])
  return JSON.stringify(parts)
}

export function sliceRelated(release: readonly Field[], a: SliceState, b: SliceState): boolean {
  if (a.own !== b.own || a.shared !== b.shared || a.visible !== b.visible) return false
  if (a.own === true && (['exists', ...FIELDS] as const).some((k) => a[k] !== b[k])) return false
  if (a.shared === true && (['exists', ...release] as const).some((k) => a[k] !== b[k])) return false
  return true
}

export const SLICE_BOUND = 'every state with Booleans and integers in {0, 1}: 256 states, 65,536 pairs'

export function sliceStates(): SliceState[] {
  let out: Record<string, boolean | number>[] = [{}]
  for (const [name, kind] of SLICE_STATE) {
    const next: Record<string, boolean | number>[] = []
    for (const s of out) for (const v of kind === 'bool' ? [false, true] : [0, 1]) next.push({ ...s, [name]: v })
    out = next
  }
  return out as SliceState[]
}

/** A related pair the observer tells apart, inside SLICE_BOUND, or null. */
export function findSlicePair(v: SliceView, o: SliceObserver): readonly [SliceState, SliceState] | null {
  const states = sliceStates()
  for (const a of states) {
    const seenA = sliceObservation(v, o, a)
    for (const b of states) if (sliceRelated(o.release, a, b) && sliceObservation(v, o, b) !== seenA) return [a, b]
  }
  return null
}

/** Replay a decoded pair: is it related, and does the observer tell it apart? */
export function replaySlicePair(v: SliceView, o: SliceObserver, a: SliceState, b: SliceState): { readonly related: boolean; readonly distinguishes: boolean } {
  const related = sliceRelated(o.release, a, b)
  return { related, distinguishes: related && sliceObservation(v, o, a) !== sliceObservation(v, o, b) }
}

export const usersOfTenant = usersOf
export const teamsOfUser = teamsOf
