// Today's plan (M-today, M-sure-wrong-returns, M-re-find, M-welcome-back; spine section 7; ASSESSMENT.md sections 3.10 and
// 5.7; EVIDENCE.md section 5; DESIGN.md SCR-today). A 10-12-minute session, run 3-5 times a week inside the Keep block:
// due items on fresh seeds, at most one audit case, re-finds of mounted specimens at least 7 days later, sure-and-wrong
// returns at about 1 day and 1 week, and cards for anything that has changed. After 7 or more idle days the plan is a
// welcome-back set; after 14 or more, "Back at the bench"; after 6 weeks or more, a landmark restart. None of them is
// a backlog: what is not in today's set is never counted, listed or called overdue.
//
// The plan is composed from the record as it stood before `today` began, so answering an item does not reshuffle the
// session under the learner; the same record and day always give the same plan (I2). The seeds themselves are drawn
// fresh when an item is shown (GeneratedItem), never here. Pure: the caller passes the day.

import type { LedgerEvent } from '@statespace/ledger'
import { addDays, daysBetween } from '@statespace/ledger'
import type { KcCard } from './cards.ts'
import { deriveCards, isDue, recallOf } from './cards.ts'
import { foldOrder, isFullWeight, kcOfEvent, lastWorkDay, medianItemMinutes } from './evidence.ts'

/** A session's length, in minutes (spine section 4.1). */
export const SESSION_MINUTES: readonly [number, number] = [10, 12]
/** An item's minutes before the record has enough logged times to say (spine section 3.0: about 2 minutes a review) [D]. */
export const DEFAULT_ITEM_MINUTES = 2
/** An audit case's minutes in a session [D]. */
export const AUDIT_MINUTES = 4
/** Audit cases a week (EVIDENCE.md section 5: 2-3); a session holds 0 or 1. */
export const AUDIT_PER_WEEK = 3
/** Re-finds in an ordinary session [D]. */
export const REFINDS_PER_SESSION = 2
/** The returns after a "sure" miss, in days (ASSESSMENT.md section 5.7). */
export const SURE_WRONG_RETURNS: readonly number[] = [1, 7]

/** The idle thresholds of M-welcome-back, in days. */
export const WELCOME_AFTER = 7
export const BENCH_AFTER = 14
export const LANDMARK_AFTER = 42

export type TodayMode = 'start' | 'session' | 'welcome' | 'bench' | 'landmark'

/** A generated template that can serve a KC. */
export interface TemplateRef {
  readonly family: string
  readonly template: string
}

export interface RefindInput {
  readonly specimen: string
  readonly title?: string | undefined
  /** The specimen's KC tags, primary first. */
  readonly kcs: readonly string[]
  /** True from the first day a re-find keeps it (7 days after it was mounted). */
  readonly ready: boolean
}

export interface AuditInput {
  /** `AUD-1.1/sound`: what an audit event's ref names after `audit:`. */
  readonly ref: string
  readonly anchor: string
  /** Its place in the anchor's browse order, as /audit/case/:anchor/:n numbers it. */
  readonly n: number
  readonly stage: string
  readonly kcs: readonly string[]
  readonly subject: string
}

export interface ChangeInput {
  readonly id: string
  readonly title: string
  readonly detail: string
  readonly href: string
}

export type PlanCard =
  | { readonly kind: 'item'; readonly slot: string; readonly why: 'due' | 'return' | 'welcome' | 'call'; readonly kc: string; readonly family: string; readonly template: string; readonly minutes: number }
  | { readonly kind: 'refind'; readonly slot: string; readonly specimen: string; readonly title?: string | undefined; readonly kc: string; readonly family: string; readonly template: string; readonly minutes: number }
  | { readonly kind: 'audit'; readonly slot: string; readonly audit: AuditInput; readonly minutes: number }

export interface TodayPlan {
  readonly day: string
  readonly mode: TodayMode
  /** Whole local days since the last graded or Bench work, before today; null for an empty record. */
  readonly idleDays: number | null
  readonly cards: readonly PlanCard[]
  readonly changes: readonly ChangeInput[]
  /** The plan's length in minutes, as a range. */
  readonly minutes: readonly [number, number]
  /** Minutes per item, and whether it came from the learner's own logged times. */
  readonly itemMinutes: number
  readonly itemMinutesLogged: boolean
  readonly counts: { readonly items: number; readonly audits: number; readonly refinds: number }
}

export interface TodayInput {
  readonly events: readonly LedgerEvent[]
  readonly today: string
  readonly introduced: ReadonlyMap<string, string>
  /** The live templates that serve a KC as its primary KC, in a stable order. */
  readonly templatesOf: (kc: string) => readonly TemplateRef[]
  readonly refinds?: readonly RefindInput[]
  readonly audits?: readonly AuditInput[]
  readonly changes?: readonly ChangeInput[]
  /** The GEN-call-it templates, for the bench set's one call. */
  readonly callTemplates?: readonly TemplateRef[]
}

/** FNV-1a, 32-bit: a stable choice among equals that changes from day to day. */
export function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const pick = <T>(xs: readonly T[], key: string): T | undefined => (xs.length === 0 ? undefined : xs[hash32(key) % xs.length])

/** A sure-and-wrong return that is open on `today`. */
export interface SureWrongReturn {
  readonly kc: string
  /** The template of the miss, when it was a generated item; a return is a fresh variant of it. */
  readonly template?: TemplateRef | undefined
  readonly missDay: string
  /** 1 or 7: which return. */
  readonly after: number
  /** The first day of the return. */
  readonly from: string
  /** The miss's ref, for the Mirror's sure-and-wrong list. */
  readonly ref: string
}

const TEMPLATE_REF = /^(?:item|call):(GEN-[a-z0-9-]+)\/(t[0-9]+)$/

/** The template a generated event names in its ref, or undefined for an authored cell. */
export function templateOfRef(ref: string): TemplateRef | undefined {
  const m = TEMPLATE_REF.exec(ref)
  return m === null ? undefined : { family: m[1] as string, template: m[2] as string }
}

/**
 * Every "sure" miss's returns (ASSESSMENT.md section 5.7): a fresh variant of the same template and KC at about 1 day and
 * about 1 week. A return is served once the record holds a later graded event on the same KC (and template, when the miss
 * was generated) on or after its day. Returns whose day is after `today` are listed as not yet open.
 */
export function sureWrongReturns(events: readonly LedgerEvent[], today: string): { open: SureWrongReturn[]; all: SureWrongReturn[] } {
  const sorted = [...events].sort(foldOrder)
  const all: SureWrongReturn[] = []
  for (const e of sorted) {
    if (e.conf !== 'sure' || e.ok !== false || !isFullWeight(e)) continue
    const kc = kcOfEvent(e)
    if (kc === undefined) continue
    const template = templateOfRef(e.ref)
    for (const after of SURE_WRONG_RETURNS) {
      const from = addDays(e.day, after)
      const served = sorted.some((x) => x !== e && typeof x.ok === 'boolean' && x.day >= from && kcOfEvent(x) === kc && (template === undefined || sameTemplate(x.ref, template)))
      if (!served) all.push({ kc, template, missDay: e.day, after, from, ref: e.ref })
    }
  }
  return { open: all.filter((r) => r.from <= today), all }
}

const sameTemplate = (ref: string, t: TemplateRef): boolean => {
  const x = templateOfRef(ref)
  return x !== undefined && x.family === t.family && x.template === t.template
}

/** Monday of the week that holds `day`. */
export function weekOf(day: string): string {
  const d = daysBetween('2024-01-01', day) // 2024-01-01 is a Monday
  return addDays('2024-01-01', d - (((d % 7) + 7) % 7))
}

export function planToday(input: TodayInput): TodayPlan {
  const { today } = input
  // The plan reads the record as it stood before today, so it holds still while the session runs.
  const before = input.events.filter((e) => e.day < today)
  const last = lastWorkDay(before)
  const idleDays = last === undefined ? null : daysBetween(last, today)
  const logged = medianItemMinutes(input.events)
  const itemMinutes = logged === undefined ? DEFAULT_ITEM_MINUTES : Math.min(6, Math.max(1, Math.round(logged * 2) / 2))
  const changes = input.changes ?? []
  const introducedBefore = new Map([...input.introduced].filter(([, d]) => d < today))
  const cards = deriveCards({ events: before, introduced: introducedBefore })
  const mode: TodayMode =
    idleDays === null && cards.size === 0 ? 'start' : idleDays === null ? 'session' : idleDays >= LANDMARK_AFTER ? 'landmark' : idleDays >= BENCH_AFTER ? 'bench' : idleDays >= WELCOME_AFTER ? 'welcome' : 'session'

  const out: PlanCard[] = []
  const used = new Set<string>()
  const itemFor = (kc: string, why: 'due' | 'return' | 'welcome' | 'call', prefer?: TemplateRef): PlanCard | undefined => {
    const ts = input.templatesOf(kc)
    const t = prefer !== undefined && ts.some((x) => x.family === prefer.family && x.template === prefer.template) ? prefer : pick(ts, `${today}|${kc}`)
    if (t === undefined) return undefined
    return { kind: 'item', slot: `${why}:${kc}`, why, kc, family: t.family, template: t.template, minutes: itemMinutes }
  }
  const add = (c: PlanCard | undefined): boolean => {
    if (c === undefined || used.has(c.slot)) return false
    if (c.kind !== 'audit' && used.has(`kc:${c.kc}`)) return false
    used.add(c.slot)
    if (c.kind !== 'audit') used.add(`kc:${c.kc}`)
    out.push(c)
    return true
  }
  const total = (): number => out.reduce((n, c) => n + c.minutes, 0)
  const refinds = (input.refinds ?? []).filter((r) => r.ready)
  const refindCard = (r: RefindInput): PlanCard | undefined => {
    for (const kc of r.kcs) {
      const t = pick(input.templatesOf(kc), `${today}|${r.specimen}`)
      if (t !== undefined) return { kind: 'refind', slot: `refind:${r.specimen}`, specimen: r.specimen, title: r.title, kc, family: t.family, template: t.template, minutes: itemMinutes }
    }
    return undefined
  }
  const byRecall = (xs: KcCard[], strongest: boolean): KcCard[] =>
    [...xs].sort((a, b) => (strongest ? recallOf(b, today) - recallOf(a, today) : recallOf(a, today) - recallOf(b, today)) || (a.kc < b.kc ? -1 : 1))

  if (mode === 'welcome' || mode === 'landmark') {
    // A short set on what is most likely still there, so the first answers back are likely ones; never the pile.
    for (const c of byRecall([...cards.values()], true)) {
      if (out.length >= 3) break
      add(itemFor(c.kc, 'welcome'))
    }
    if (refinds[0] !== undefined) add(refindCard(refinds[0]))
  } else if (mode === 'bench') {
    // "Back at the bench", 20-30 minutes: three re-finds (or items on the ideas met longest ago), one call; the screen
    // adds the last claim card and the next artifact restated.
    for (const r of refinds) {
      if (out.filter((c) => c.kind === 'refind').length >= 3) break
      add(refindCard(r))
    }
    const oldest = [...cards.values()].sort((a, b) => (a.introduced < b.introduced ? -1 : a.introduced > b.introduced ? 1 : a.kc < b.kc ? -1 : 1))
    for (const c of oldest) {
      if (out.length >= 3) break
      add(itemFor(c.kc, 'welcome'))
    }
    const call = pick(input.callTemplates ?? [], `${today}|call`)
    if (call !== undefined) {
      const kc = oldest.find((c) => input.templatesOf(c.kc).some((t) => t.family === call.family && t.template === call.template))?.kc
      add({ kind: 'item', slot: 'call:bench', why: 'call', kc: kc ?? `call:${call.template}`, family: call.family, template: call.template, minutes: itemMinutes })
    }
  } else if (mode === 'session') {
    const max = SESSION_MINUTES[1]
    const room = (m: number): boolean => total() + m <= max
    for (const r of sureWrongReturns(before, today).open) {
      if (!room(itemMinutes)) break
      add(itemFor(r.kc, 'return', r.template))
    }
    for (const r of refinds) {
      if (out.filter((c) => c.kind === 'refind').length >= REFINDS_PER_SESSION || !room(itemMinutes)) break
      add(refindCard(r))
    }
    const audit = auditFor(input, before, cards)
    if (audit !== undefined && room(AUDIT_MINUTES)) add({ kind: 'audit', slot: `audit:${audit.ref}`, audit, minutes: AUDIT_MINUTES })
    // Due KCs, the ones most likely to have slipped first.
    for (const c of byRecall([...cards.values()].filter((c) => isDue(c, today)), false)) {
      if (!room(itemMinutes)) break
      add(itemFor(c.kc, 'due'))
    }
  }

  const items = out.filter((c) => c.kind === 'item').length
  const audits = out.filter((c) => c.kind === 'audit').length
  const refindsN = out.filter((c) => c.kind === 'refind').length
  const t = total()
  const minutes: readonly [number, number] = mode === 'bench' ? [20, 30] : t === 0 ? [0, 0] : [t, Math.ceil(t * 1.25)]
  return { day: today, mode, idleDays, cards: out, changes, minutes, itemMinutes, itemMinutesLogged: logged !== undefined, counts: { items, audits, refinds: refindsN } }
}

/** At most one audit case a session, and 2-3 a week: an undecided case on an anchor whose KCs the learner has met. */
function auditFor(input: TodayInput, before: readonly LedgerEvent[], cards: ReadonlyMap<string, KcCard>): AuditInput | undefined {
  const pool = input.audits ?? []
  if (pool.length === 0) return undefined
  const week = weekOf(input.today)
  const thisWeek = input.events.filter((e) => e.kind === 'audit' && e.day >= week && e.day < input.today).length
  if (thisWeek >= AUDIT_PER_WEEK) return undefined
  const decided = new Set(before.filter((e) => e.kind === 'audit').map((e) => e.ref.replace(/^audit:/, '')))
  const open = pool.filter((a) => !decided.has(a.ref) && a.kcs.some((k) => cards.has(k)))
  return pick(open, `${input.today}|audit`)
}

/** The tag a Today card writes into its event's `data`, beside the item's own: what served it, and on which day. */
export interface TodayTag {
  readonly day: string
  readonly slot: string
}

export function todayTagOf(e: Pick<LedgerEvent, 'data'>): TodayTag | undefined {
  const d = e.data as { today?: { day?: unknown; slot?: unknown } } | undefined
  const t = d?.today
  return typeof t?.day === 'string' && typeof t.slot === 'string' ? { day: t.day, slot: t.slot } : undefined
}

/** The first answer each slot of `day`'s plan received, by slot. */
export function answeredSlots(events: readonly LedgerEvent[], day: string): Map<string, LedgerEvent> {
  const out = new Map<string, LedgerEvent>()
  for (const e of [...events].sort(foldOrder)) {
    const t = todayTagOf(e)
    if (t === undefined || t.day !== day || out.has(t.slot)) continue
    out.set(t.slot, e)
  }
  return out
}

export { deriveCards }
