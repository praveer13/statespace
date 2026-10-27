// What Today's plan is composed from, besides the record (packages/learner/src/schedule/today.ts): the KC graph's first
// lessons (which day each KC was first learned), the live generator templates by primary KC, the audit pool, the
// specimen cabinet's re-find schedule, and the change cards. Everything is derived at read time from the record and the
// content build (I2); nothing here stores a status.

import { GRAPH } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import type { AuditInput, ChangeInput, RefindInput, TemplateRef } from '@statespace/learner/schedule'
import { foldOrder } from '@statespace/learner/schedule'
import { loadPage } from '../../app/content.ts'
import { isLessonId, pageOf, questionOf } from '../../app/progress.ts'
import { LIVE_FAMILIES, templatesOf } from '../../components/generated/index.ts'
import { browseOrder, loadAudit } from '../audit/pool.ts'
import cabinetData from '../specimens/data/cabinet.generated.json'
import { refindSchedule, statesOf } from '../specimens/model/status.ts'
import type { MountRule } from '../specimens/model/status.ts'

/** The KCs each lesson first teaches (the KC graph's firstTaught). */
const FIRST_TAUGHT = new Map<string, string[]>()
for (const k of GRAPH.kcs) {
  const list = FIRST_TAUGHT.get(k.firstTaught)
  if (list === undefined) FIRST_TAUGHT.set(k.firstTaught, [k.id])
  else list.push(k.id)
}

/** The local day each KC was first learned: the first event on the lesson that first teaches it (DueSet's rule, kept). */
export function introductionsOf(events: readonly LedgerEvent[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const e of [...events].sort(foldOrder)) {
    const page = pageOf(e)
    if (page === undefined) continue
    for (const kc of FIRST_TAUGHT.get(page) ?? []) if (!out.has(kc)) out.set(kc, e.day)
  }
  return out
}

export interface Sources {
  /** Live templates by primary KC, in family then template order. */
  readonly templates: ReadonlyMap<string, readonly TemplateRef[]>
  readonly callTemplates: readonly TemplateRef[]
  readonly audits: readonly AuditInput[]
}

let sources: Promise<Sources> | undefined

/** The generator templates and the audit pool, loaded once per tab. A pool that fails to load leaves Today without an audit case. */
export function loadSources(): Promise<Sources> {
  sources ??= (async () => {
    // from the template index, so listing the templates downloads no family; GeneratedItem loads a family when it draws
    const templates = new Map<string, TemplateRef[]>()
    const callTemplates: TemplateRef[] = []
    for (const family of LIVE_FAMILIES) {
      for (const t of templatesOf(family)) {
        const ref = { family, template: t.template }
        const list = templates.get(t.primary)
        if (list === undefined) templates.set(t.primary, [ref])
        else list.push(ref)
        if (family === 'GEN-call-it') callTemplates.push(ref)
      }
    }
    let audits: AuditInput[] = []
    try {
      const pool = await loadAudit()
      audits = pool.anchors.flatMap((a) =>
        browseOrder(a).map((c, i) => ({ ref: c.ref, anchor: a.id, n: i + 1, stage: a.stage, kcs: a.kcs, subject: a.subject })),
      )
    } catch {
      audits = []
    }
    return { templates, callTemplates, audits }
  })().catch((e: unknown) => {
    sources = undefined
    throw e
  })
  return sources
}

interface SpecimenRecord {
  readonly id: string
  readonly title: string
  readonly kcs: readonly string[]
  readonly mount?: MountRule
}

const SPECIMENS: readonly SpecimenRecord[] = (cabinetData as unknown as { specimens: { record: SpecimenRecord }[] }).specimens.map((s) => s.record)

export const specimenTitle = (id: string): string | undefined => SPECIMENS.find((s) => s.id === id)?.title

/** The mounted specimens that are not yet kept, with whether a re-find keeps them today (7 days after mounting). */
export function refindsOf(events: readonly LedgerEvent[], today: string): RefindInput[] {
  const states = statesOf(events, SPECIMENS)
  return refindSchedule(states, today).map((r) => {
    const s = SPECIMENS.find((x) => x.id === r.specimen)
    return { specimen: r.specimen, title: s?.title, kcs: s?.kcs ?? [], ready: r.ready }
  })
}

/**
 * Change cards (M-change-cards): a question the learner answered whose revision has changed since. The answer stands and
 * nothing is deducted; the card says "re-check" and links to the lesson. Read from the lessons the record has touched.
 */
export async function changesOf(events: readonly LedgerEvent[]): Promise<ChangeInput[]> {
  const first = new Map<string, LedgerEvent>()
  for (const e of [...events].sort(foldOrder)) {
    const q = questionOf(e)
    if (q !== undefined && !first.has(q) && e.itemRev !== undefined) first.set(q, e)
  }
  const lessons = [...new Set([...first.values()].map(pageOf).filter((p): p is string => p !== undefined && isLessonId(p)))]
  const out: ChangeInput[] = []
  for (const id of lessons) {
    const page = await loadPage(id)
    if (page === null) continue
    let n = 0
    for (const s of page.segments) {
      for (const b of s.blocks) {
        const rev = (b as { itemRev?: string }).itemRev
        let key: string | undefined
        let label: string | undefined
        if (b.type === 'item') {
          n++
          key = `item:${id}/i${n}`
          label = `question ${n}`
        } else if (b.type === 'instrument') {
          key = `call:${id}/c${b.cell}`
          label = `the call on cell ${b.cell}`
        }
        const answered = key === undefined ? undefined : first.get(key)
        if (answered === undefined || rev === undefined || answered.itemRev === rev) continue
        out.push({
          id: key as string,
          title: `${id}: ${label as string} was revised`,
          detail: `You answered it on ${answered.day}. Your answer stands and nothing is deducted. Re-check it when you like.`,
          href: `/lessons/${id}`,
        })
      }
    }
  }
  return out
}
