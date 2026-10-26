// KC tags in course content (spine section 4: "Every item, lesson segment, lab check, audit case and specimen
// carries KC tags"). Two readers, both pure:
//   - pages: a lesson or drawer page in the shape of schemas/lesson.schema.json (lesson@1), which the content
//     pipeline (packages/content, W1-T36) builds from the Markdown source. Items carry `kcs` (primary first), and a
//     segment may carry its own `kcs` (`## Title {minutes=N kcs=...}`): "a cell's call is for its segment's
//     components" (lesson@1, $defs.segment.kcs). An instrument cell carries none, so its Call It counts toward the
//     segment's declared KCs; a segment that declares none lends the KCs of its graded items instead.
//   - records: YAML or JSON records of other kinds (audit anchors, specimens, generator templates, lab data and
//     placement steps). Their KC tags sit under a tag key (TAG_KEYS) of the record or of an enclosing object.

import { EXACT } from '@statespace/ids/grammar'
import type { Problem } from './types.ts'

export type Role = 'prequestion' | 'segment' | 'exit'

/** The keys under which a record carries KC tags; the first KC found is the primary one. */
export const TAG_KEYS = ['kcs', 'kc', 'primary', 'primary_kc', 'primaryKc', 'secondary', 'secondary_kcs', 'secondaryKcs', 'kc_tags', 'kcTags'] as const

type Obj = { readonly [key: string]: unknown }
const isObj = (x: unknown): x is Obj => x !== null && typeof x === 'object' && !Array.isArray(x)

/** The KC tags of one object (its own tag keys only), primary first, and the values that are not KC IDs. */
export function tagsOf(o: Obj): { kcs: string[]; bad: string[] } {
  const kcs: string[] = []
  const bad: string[] = []
  const add = (v: unknown): void => {
    if (typeof v === 'string') {
      for (const tok of v.split(/[\s,;]+/).filter(Boolean)) {
        if (EXACT.kc.test(tok)) {
          if (!kcs.includes(tok)) kcs.push(tok)
        } else bad.push(tok)
      }
    } else if (Array.isArray(v)) v.forEach(add)
    else if (isObj(v)) for (const k of TAG_KEYS) if (k in v) add(v[k])
    else if (v !== null && v !== undefined) bad.push(JSON.stringify(v))
  }
  for (const k of TAG_KEYS) if (k in o) add(o[k])
  return { kcs, bad }
}

export interface PageItem {
  readonly role: Role
  readonly family: string
  readonly template: string
  readonly kcs: readonly string[]
  readonly segment: string
  /** "s2 item 3", for messages. */
  readonly ref: string
}

export interface PageCall {
  readonly segment: string
  readonly ref: string
  /** The KCs this call counts toward: a GEN-call-it item's own tags, or, for a cell's Call It, its segment's KCs. */
  readonly kcs: readonly string[]
}

export interface PageSegment {
  readonly id: string
  readonly title: string
  /** The KC tags the segment declares itself (lesson@1's segment `kcs`), in order; empty when it declares none. */
  readonly declared: readonly string[]
  /**
   * The KCs the segment teaches, which its cells' calls count toward: the ones it declares; when it declares none,
   * the union of its graded items' tags (segment and exit items); when it holds no graded item, its prequestions'.
   */
  readonly kcs: readonly string[]
}

export interface Page {
  readonly file: string
  /** S1.L1 or D-03. */
  readonly id: string
  readonly kind: 'lesson' | 'drawer'
  readonly kcs: readonly string[]
  readonly segments: readonly PageSegment[]
  readonly items: readonly PageItem[]
  readonly calls: readonly PageCall[]
}

const ROLES: readonly string[] = ['prequestion', 'segment', 'exit']

/**
 * Read a lesson@1 page. Shape problems that would hide tags are reported here (a bad item role, a page, segment or
 * item tag that is not a KC ID); the rest of the shape is GATE-schema's and the content build's.
 */
export function readPage(record: unknown, file: string): { page: Page | null; problems: Problem[] } {
  const problems: Problem[] = []
  const bad = (message: string): void => {
    problems.push({ message, where: file })
  }
  if (!isObj(record)) {
    bad('the page is not a mapping')
    return { page: null, problems }
  }
  const id = typeof record.id === 'string' ? record.id : null
  if (id === null || !(EXACT.lesson.test(id) || EXACT.drawer.test(id))) {
    bad(`the page's id ${JSON.stringify(record.id)} is not a lesson or drawer ID`)
    return { page: null, problems }
  }
  const pageTags = tagsOf(record)
  for (const b of pageTags.bad) bad(`${id}: the page's kcs holds ${b}, which is not a KC ID`)
  const segments: PageSegment[] = []
  const items: PageItem[] = []
  const calls: PageCall[] = []
  const rawSegments = Array.isArray(record.segments) ? record.segments : []
  if (!Array.isArray(record.segments) && !isObj(record.deferred)) bad(`${id}: the page has no segments list`)
  rawSegments.forEach((seg: unknown, si: number) => {
    const sid = isObj(seg) && typeof seg.id === 'string' ? seg.id : `s${si + 1}`
    const title = isObj(seg) && typeof seg.title === 'string' ? seg.title : ''
    const blocks = isObj(seg) && Array.isArray(seg.blocks) ? seg.blocks : []
    if (!isObj(seg) || !Array.isArray(seg.blocks)) bad(`${id} ${sid}: a segment needs a blocks list`)
    const segTags = isObj(seg) ? tagsOf(seg) : { kcs: [], bad: [] }
    for (const x of segTags.bad) bad(`${id} ${sid}: the segment's kcs holds ${x}, which is not a KC ID`)
    const segItems: PageItem[] = []
    const segCalls: { ref: string; own: readonly string[] | null }[] = []
    blocks.forEach((b: unknown, bi: number) => {
      if (!isObj(b)) return
      const ref = `${sid} block ${bi + 1}`
      if (b.type === 'item') {
        const t = tagsOf(b)
        for (const x of t.bad) bad(`${id} ${ref}: kcs holds ${x}, which is not a KC ID`)
        const role = typeof b.role === 'string' && ROLES.includes(b.role) ? (b.role as Role) : null
        if (role === null) bad(`${id} ${ref}: an item's role is prequestion, segment or exit, not ${JSON.stringify(b.role)}`)
        const family = typeof b.family === 'string' ? b.family : ''
        const item: PageItem = { role: role ?? 'segment', family, template: typeof b.template === 'string' ? b.template : '', kcs: t.kcs, segment: sid, ref }
        segItems.push(item)
        items.push(item)
        if (family === 'GEN-call-it' && role === 'segment') segCalls.push({ ref, own: t.kcs })
      } else if (b.type === 'instrument' && (b.callOnFirstRun === true || isObj(b.call))) {
        segCalls.push({ ref, own: null })
      }
    })
    // A segment's KCs are the ones it declares (lesson@1: "a cell's call is for its segment's components"). One that
    // declares none takes those of the graded items it holds (segment and exit items), and one whose only items are
    // prequestions takes theirs. A cell's Call It counts toward its segment's KCs.
    const union = (its: readonly PageItem[]): string[] => [...new Set(its.flatMap((it) => it.kcs))]
    const graded = union(segItems.filter((it) => it.role !== 'prequestion'))
    const segKcs = segTags.kcs.length > 0 ? segTags.kcs : graded.length > 0 ? graded : union(segItems)
    segments.push({ id: sid, title, declared: segTags.kcs, kcs: segKcs })
    for (const c of segCalls) calls.push({ segment: sid, ref: c.ref, kcs: c.own ?? segKcs })
  })
  return { page: { file, id, kind: EXACT.drawer.test(id) ? 'drawer' : 'lesson', kcs: pageTags.kcs, segments, items, calls }, problems }
}

export type RecordKind = 'audit' | 'specimen' | 'generator' | 'lab' | 'placement'

export interface TaggedUnit {
  readonly file: string
  readonly kind: 'audit case' | 'specimen' | 'generator template' | 'lab check' | 'placement item'
  readonly ref: string
  /** The unit's tags: its own, or those of the nearest enclosing object that has tags. */
  readonly kcs: readonly string[]
  /** Whether a unit with no tags of its own may take them from the graph instead (lab checks: lab_stages). */
  readonly graphTagged: boolean
}

const SPECIMEN = /^SP-[1-9][0-9]*\.[1-9][0-9]*$/
const ANCHOR = /^AUD-[1-9][0-9]*\.[1-9][0-9]*$/
const CHECK = /^LAB-[1-9][0-9]*\.c[1-9][0-9]*$/
const TEMPLATE = /^t[1-9][0-9]*$/

/** Every KC tag anywhere in a subtree: an anchor or a specimen may carry its tags on its members. */
function deepTags(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) for (const x of node) deepTags(x, out)
  else if (isObj(node)) {
    for (const k of tagsOf(node).kcs) if (!out.includes(k)) out.push(k)
    for (const [key, v] of Object.entries(node)) if (!(TAG_KEYS as readonly string[]).includes(key)) deepTags(v, out)
  }
  return out
}

/**
 * The tagged units of one record document. A unit is found by its identity: an object whose `id` (or whose key in
 * a mapping) is a specimen, anchor or lab check ID; a generator template (an entry of a `templates` list, or an
 * object whose `template` or `id` is t1, t2, ...); a placement item (an object with a `family`, or `type: item`).
 * A record file whose top level is the one unit (an anchor file, a specimen file) is that unit. A unit's tags are
 * its own, else those of the nearest enclosing object with tags; an anchor or a specimen with neither takes the
 * tags its members carry.
 */
export function unitsOfRecord(doc: unknown, file: string, kind: RecordKind): { units: TaggedUnit[]; problems: Problem[] } {
  const units: TaggedUnit[] = []
  const problems: Problem[] = []
  const name = file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '')
  const visit = (node: unknown, key: string | null, inherited: readonly string[], inTemplates: boolean): void => {
    if (Array.isArray(node)) {
      for (const x of node) visit(x, null, inherited, inTemplates)
      return
    }
    if (!isObj(node)) return
    const own = tagsOf(node)
    for (const b of own.bad) problems.push({ message: `${file}: ${b} under a KC tag key is not a KC ID`, where: file })
    const tags = own.kcs.length > 0 ? own.kcs : inherited
    const id = typeof node.id === 'string' ? node.id : key
    const unit = (k: TaggedUnit['kind'], ref: string, graphTagged = false): void => {
      units.push({ file, kind: k, ref, kcs: tags, graphTagged })
    }
    if (kind === 'audit' && id !== null && ANCHOR.test(id)) units.push({ file, kind: 'audit case', ref: id, kcs: tags.length > 0 ? tags : deepTags(node), graphTagged: false })
    else if (kind === 'specimen' && id !== null && SPECIMEN.test(id)) units.push({ file, kind: 'specimen', ref: id, kcs: tags.length > 0 ? tags : deepTags(node), graphTagged: false })
    else if (kind === 'lab' && id !== null && CHECK.test(id)) unit('lab check', id, true)
    else if (kind === 'generator' && (inTemplates || (typeof node.template === 'string' && TEMPLATE.test(node.template)) || (typeof node.id === 'string' && TEMPLATE.test(node.id)))) {
      unit('generator template', `${name} ${String(node.template ?? node.id ?? 'template')}`)
    } else if (kind === 'placement' && (typeof node.family === 'string' || node.type === 'item')) unit('placement item', String(node.id ?? key ?? `${name} item`))
    for (const [k, v] of Object.entries(node)) {
      if ((TAG_KEYS as readonly string[]).includes(k)) continue
      visit(v, k, tags, k === 'templates')
    }
  }
  visit(doc, null, [], false)
  // A file that is itself the one record of its kind (AUD-1.1.yaml, SP-1.1.json) without an id field.
  if (units.length === 0 && isObj(doc)) {
    if (kind === 'audit' && ANCHOR.test(name)) units.push({ file, kind: 'audit case', ref: name, kcs: deepTags(doc), graphTagged: false })
    else if (kind === 'specimen' && SPECIMEN.test(name)) units.push({ file, kind: 'specimen', ref: name, kcs: deepTags(doc), graphTagged: false })
  }
  return { units, problems }
}
