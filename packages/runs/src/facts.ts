// The facts registry (content/registry/): dated, sourced facts that are not tool behavior, with TTLs,
// "stale since" dates, and errata that flag "re-check". Adapted from kernelspace's claims registry
// (ARCHITECTURE.md section 4.2); "claim" is a learner term here, so the store is the facts registry.
//
// Tool behavior is never a registry fact: a tool's numbers, verdicts, flags and versions are runs (I4). What
// the registry holds, and how long each kind stays fresh (spine section 11.2; docs/LANDSCAPE.md section 6.2):
//
//   tool         a tool's status read from its release page or registry: a version, a release date, a
//                "latest" or "newest stable" statement. Checked on checked_at; fresh for ttl_days, 60 to 90
//                (BRIEF section 2.3)
//   twin         a production-twin pin. The pin itself (a commit SHA, or a documentation page's content hash
//                and read date) lives in a run, RUN-twin-pins, with its 60-day ttl_days; the fact names the run
//                and the path of the pin in it, and the run's clock is the fact's clock
//   incident, paper, leaderboard, quotation
//                dated facts: each states its own date, so none has a TTL
//
// A fact past its TTL is stale, not wrong: it earns a "stale since <date>" badge and a re-check, never a
// deduction, and GATE-facts only warns about it. The clock: a fact checked on day D with a TTL of N days is
// stale from day D + N on (kernelspace's staleSince), so a pin checked on 2026-10-23 with 60 days is stale
// since 2026-12-22, the date docs/LANDSCAPE.md section 6.2 gives.
//
// A fact's statement states its own value (the value a fact reference prints), by the rule of values.ts, so
// the two cannot drift apart; a saved copy of the source (evidence) keeps its SHA-256 and holds the quote.
//
// Pure: dates are passed in (today), and file contents come through the context. No I/O, no clock.

import { FACT_ID, RUN_ID } from './refs.ts'
import { describe, findValue, isPrintable, renderValue, resolvePath } from './values.ts'

export type FactKind = 'tool' | 'twin' | 'incident' | 'paper' | 'leaderboard' | 'quotation'
export const FACT_KINDS: readonly FactKind[] = ['tool', 'twin', 'incident', 'paper', 'leaderboard', 'quotation']
/** The kinds that state their own date and carry no TTL. */
export const DATED_KINDS: readonly FactKind[] = ['incident', 'paper', 'leaderboard', 'quotation']

/** TTL bounds in days, by kind; null: no TTL. */
export const TTL_DAYS: Readonly<Record<FactKind, { min: number; max: number } | null>> = {
  tool: { min: 60, max: 90 },
  twin: { min: 60, max: 60 },
  incident: null,
  paper: null,
  leaderboard: null,
  quotation: null,
}

export interface FactSource {
  /** the source key that docs/LANDSCAPE.md section 10 defines, such as npmpyodide */
  key?: string
  url: string
  title: string
  /** the source's own words, verbatim; checked against the saved copy when evidence names one */
  quote?: string
}

/** A saved copy of the source in the repository, hashed, so the quote can be checked offline. */
export interface FactEvidence {
  path: string
  sha256: string
}

export interface Fact {
  /** dotted lowercase, at least two segments (tool.pyodide.latest); stable once published */
  id: string
  kind: FactKind
  /** the fact in one sentence, as copy may state it */
  statement: string
  /** the value a fact reference prints, {{fact:id}} */
  value?: string | number
  unit?: string
  source: FactSource
  evidence?: FactEvidence
  /** tool: when a person last checked the fact against its source; incident and the other dated kinds: when it was read */
  checked_at?: string
  /** tool only: days the fact stays fresh after checked_at */
  ttl_days?: number
  /** incident, paper, leaderboard, quotation: the date the fact states (YYYY, YYYY-MM or YYYY-MM-DD) */
  date?: string
  /** twin only: the run that records the pin, and the pin's path in it */
  run?: string
  pin?: string
  /** conditions under which the fact holds */
  boundary?: string
  /** where the check is recorded, such as docs/LANDSCAPE.md section 6.3 */
  via?: string
  notes?: string
}

export interface FactsFile {
  format: string
  about?: string
  facts: Fact[]
}

export interface Erratum {
  /** <date>-<slug>, such as 2026-11-20-postgresql-19-ga */
  id: string
  /** the day the correction shipped */
  date: string
  /** error: the course was wrong; changed: the field or a tool moved and the course caught up */
  kind: 'error' | 'changed'
  /** the lessons it flags "re-check" (S{n}.L{k}) */
  lessons: string[]
  /** the runs whose change caused it */
  runs?: string[]
  /** the registry facts it corrects */
  facts?: string[]
  title: string
  /** the statement as it was taught, and the corrected one; at most 240 characters each */
  before: string
  after: string
  /** at most 40 words */
  why?: string
  source?: { url: string; title: string }
  /** the earlier erratum this one replaces */
  supersedes?: string
}

export interface ErrataFile {
  format: string
  about?: string
  errata: Erratum[]
}

/** A problem with one entry of a registry file; id is the entry's id when it has one. */
export interface Issue {
  id: string | null
  detail: string
}

export interface RegistryContext {
  /** the day the check runs, YYYY-MM-DD */
  today: string
  /** the run records on disk, by ID */
  runs: ReadonlyMap<string, unknown>
  /** a repository file as text with its SHA-256, or null when it is not there (the gate reads the disk) */
  file: (path: string) => { text: string; sha256: string } | null
}

export const FACTS_FORMAT = 'statespace facts registry, revision 1'
export const ERRATA_FORMAT = 'statespace errata, revision 1'
const FACT_FIELDS = new Set(['id', 'kind', 'statement', 'value', 'unit', 'source', 'evidence', 'checked_at', 'ttl_days', 'date', 'run', 'pin', 'boundary', 'via', 'notes'])
const SOURCE_FIELDS = new Set(['key', 'url', 'title', 'quote'])
const ERRATUM_FIELDS = new Set(['id', 'date', 'kind', 'lessons', 'runs', 'facts', 'title', 'before', 'after', 'why', 'source', 'supersedes'])
const MAX_STATEMENT = 400
const MAX_FIELD = 240
const MAX_WHY_WORDS = 40
const LESSON_ID = /^S[0-9]{1,2}\.L[0-9]{1,2}$/
const SHA256 = /^[0-9a-f]{64}$/
const REPO_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._@+=,-]+(?:\/[A-Za-z0-9._@+=,-]+)*$/

// ------------------------------------------------------------------ dates
const DAY_MS = 86_400_000
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Whether s is a real calendar date, YYYY-MM-DD. */
export function isRealDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE.test(s)) return false
  const t = Date.parse(`${s}T00:00:00Z`)
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s
}

/** Whether s is a real year, month or day: YYYY, YYYY-MM or YYYY-MM-DD (dated facts state their own precision). */
export function isPartialDate(s: unknown): s is string {
  if (typeof s !== 'string') return false
  if (/^\d{4}$/.test(s)) return true
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return true
  return isRealDate(s)
}

/** date + days, as YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)
}

/** The UTC date of an instant or a date (2026-10-24T14:16:02.311Z gives 2026-10-24), or null. */
export function dateOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (isRealDate(value)) return value
  const t = Date.parse(value)
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  return new Date(t).toISOString().slice(0, 10)
}

// ------------------------------------------------------------------ TTLs
export interface Staleness {
  /** the day the clock started: a fact's checked_at, or a run's execution date */
  anchor: string
  ttl_days: number
  /** anchor + ttl_days: the first stale day */
  expires: string
  /** whether today is on or after expires */
  stale: boolean
  /** days from anchor to today */
  age_days: number
}

export function staleness(anchor: string, ttlDays: number, today: string): Staleness {
  const expires = addDays(anchor, ttlDays)
  return { anchor, ttl_days: ttlDays, expires, stale: today >= expires, age_days: daysBetween(anchor, today) }
}

/** The "stale since" date of a badge, or null while the fact is fresh (kernelspace's staleSince). */
export function staleSince(anchor: string, ttlDays: number, today: string): string | null {
  const s = staleness(anchor, ttlDays, today)
  return s.stale ? s.expires : null
}

interface RunDates {
  ttl_days?: unknown
  started_at?: unknown
  recorded_at?: unknown
}

/** A run's clock starts on the day it executed (started_at), or the day it was recorded when that is unknown. */
export function runAnchor(record: unknown): string | null {
  if (record === null || typeof record !== 'object') return null
  const r = record as RunDates
  return dateOf(r.started_at) ?? dateOf(r.recorded_at)
}

/** A run's staleness, for a run that describes a moving upstream (ttl_days on run@1); null without a TTL. */
export function runStaleness(record: unknown, today: string): Staleness | null {
  if (record === null || typeof record !== 'object') return null
  const ttl = (record as RunDates).ttl_days
  if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 1) return null
  const anchor = runAnchor(record)
  return anchor === null ? null : staleness(anchor, ttl, today)
}

/** A fact's staleness: a tool fact's own clock, a twin's run clock; null for the dated kinds. */
export function factStaleness(fact: Fact, runs: ReadonlyMap<string, unknown>, today: string): Staleness | null {
  if (fact.kind === 'tool' && isRealDate(fact.checked_at) && typeof fact.ttl_days === 'number') return staleness(fact.checked_at, fact.ttl_days, today)
  if (fact.kind === 'twin' && typeof fact.run === 'string') return runStaleness(runs.get(fact.run), today)
  return null
}

// ------------------------------------------------------------------ validation
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const httpsUrl = (v: unknown): boolean => typeof v === 'string' && /^https:\/\/[!-~]+$/.test(v)
/** A raw value as a message shows it: JSON, or nothing for a missing one. */
const shownRaw = (v: unknown): string => (v === undefined ? 'nothing' : JSON.stringify(v))
const article = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`)

function checkSource(src: unknown, fail: (d: string) => void, fields = SOURCE_FIELDS): void {
  if (!isObject(src)) return fail('source must be an object with an https url and a title')
  for (const k of Object.keys(src)) if (!fields.has(k)) fail(`source.${k} is not a field of a source`)
  if (!httpsUrl(src.url)) fail(`source.url must be an https URL, got ${shownRaw(src.url)}`)
  if (!nonEmpty(src.title)) fail('source.title must be a non-empty string')
  if (src.quote !== undefined && !nonEmpty(src.quote)) fail('source.quote, when present, must be a non-empty string')
  if (src.key !== undefined && !(typeof src.key === 'string' && /^[A-Za-z][\w.+-]*$/.test(src.key))) fail(`source.key must be a source key such as npmpyodide, got ${JSON.stringify(src.key)}`)
}

/**
 * Validate content/registry/facts.json. Returns the well-formed facts and the issues; a fact with an issue
 * is still returned when it has an id and a kind, so references to it resolve and only the issue is reported.
 */
export function checkFacts(doc: unknown, ctx: RegistryContext): { facts: Fact[]; issues: Issue[] } {
  const issues: Issue[] = []
  const facts: Fact[] = []
  if (!isObject(doc)) return { facts, issues: [{ id: null, detail: 'the file must hold an object with format and facts' }] }
  if (doc.format !== FACTS_FORMAT) issues.push({ id: null, detail: `format must be ${JSON.stringify(FACTS_FORMAT)}, got ${JSON.stringify(doc.format)}` })
  if (!Array.isArray(doc.facts)) return { facts, issues: [...issues, { id: null, detail: 'facts must be a list' }] }
  const seen = new Set<string>()
  const tomorrow = addDays(ctx.today, 1)
  doc.facts.forEach((raw, i) => {
    const id = isObject(raw) && typeof raw.id === 'string' ? raw.id : null
    const fail = (detail: string): void => {
      issues.push({ id: id ?? `facts[${i}]`, detail })
    }
    if (!isObject(raw)) return fail('a fact must be an object')
    for (const k of Object.keys(raw)) if (!FACT_FIELDS.has(k)) fail(`${k} is not a field of a fact`)
    if (id === null || !FACT_ID.test(id)) fail(`id must be dotted lowercase with at least two segments, such as tool.pyodide.latest; got ${shownRaw(raw.id)}`)
    else if (seen.has(id)) fail('a second fact with this id')
    if (id !== null) seen.add(id)
    const kind = raw.kind as FactKind
    if (!FACT_KINDS.includes(kind)) {
      fail(`kind must be one of ${FACT_KINDS.join(', ')}; got ${shownRaw(raw.kind)}`)
      return
    }
    if (!nonEmpty(raw.statement)) fail('statement must be a non-empty sentence')
    else if (raw.statement.length > MAX_STATEMENT) fail(`statement is ${raw.statement.length} characters; at most ${MAX_STATEMENT}`)
    if (raw.value !== undefined && !(nonEmpty(raw.value) || (typeof raw.value === 'number' && Number.isFinite(raw.value)))) fail('value, when present, must be a non-empty string or a finite number')
    else if (raw.value !== undefined && nonEmpty(raw.statement) && findValue(raw.statement, raw.value as string | number) === null) {
      // The statement and the value a fact reference prints must not drift apart.
      fail(`statement does not state its value, ${renderValue(raw.value as string | number)}`)
    }
    if (raw.unit !== undefined && !nonEmpty(raw.unit)) fail('unit, when present, must be a non-empty string')
    for (const k of ['boundary', 'via', 'notes'] as const) if (raw[k] !== undefined && !nonEmpty(raw[k])) fail(`${k}, when present, must be a non-empty string`)
    checkSource(raw.source, fail)

    // The clock, by kind.
    if (kind === 'tool') {
      if (!isRealDate(raw.checked_at)) fail(`checked_at must be a real date, YYYY-MM-DD; got ${shownRaw(raw.checked_at)}`)
      else if (raw.checked_at > tomorrow) fail(`checked_at ${raw.checked_at} is in the future`)
      const ttl = TTL_DAYS.tool as { min: number; max: number }
      if (typeof raw.ttl_days !== 'number' || !Number.isInteger(raw.ttl_days) || raw.ttl_days < ttl.min || raw.ttl_days > ttl.max) {
        fail(`ttl_days must be a whole number of days from ${ttl.min} to ${ttl.max} for a tool fact (BRIEF section 2.3); got ${shownRaw(raw.ttl_days)}`)
      }
      if (raw.date !== undefined) fail('date belongs to the dated kinds; a tool fact keeps its clock in checked_at, and its statement says the dates it reports')
      if (raw.run !== undefined || raw.pin !== undefined) fail('run and pin belong to twin facts')
    } else if (kind === 'twin') {
      if (raw.checked_at !== undefined || raw.ttl_days !== undefined) fail('a twin keeps its clock in its run (ttl_days and the run date of RUN-twin-pins), not in checked_at or ttl_days')
      if (raw.date !== undefined) fail('date belongs to the dated kinds')
      if (typeof raw.run !== 'string' || !RUN_ID.test(raw.run)) fail(`run must name the run that records the pin, such as RUN-twin-pins; got ${shownRaw(raw.run)}`)
      else if (!nonEmpty(raw.pin)) fail('pin must be the path of the pin in the run, such as values.pins.tigerbeetle')
      else {
        const record = ctx.runs.get(raw.run)
        if (record === undefined) fail(`${raw.run} is not on disk (runs/${raw.run}.json): record the pin before the twin ships`)
        else {
          const pin = resolvePath(record, raw.pin)
          if (!isPrintable(pin)) fail(`${raw.run}#${raw.pin} is ${describe(pin)}, not one pin`)
          const ttl = (record as RunDates).ttl_days
          if (ttl !== 60) fail(`${raw.run} must carry ttl_days 60 for production-twin pins (spine section 11.2); it has ${ttl === undefined ? 'none' : JSON.stringify(ttl)}`)
          else if (runAnchor(record) === null) fail(`${raw.run} has neither started_at nor recorded_at, so its clock cannot start`)
        }
      }
    } else {
      if (!isPartialDate(raw.date)) fail(`date must be the date the ${kind} states, YYYY, YYYY-MM or YYYY-MM-DD; got ${shownRaw(raw.date)}`)
      else if (raw.date.slice(0, 10) > tomorrow.slice(0, raw.date.length)) fail(`date ${raw.date} is in the future`)
      if (raw.ttl_days !== undefined) fail(`${article(kind)} states its own date, so it has no TTL (spine section 11.2)`)
      if (raw.checked_at !== undefined && !isRealDate(raw.checked_at)) fail(`checked_at, when present, must be a real date; got ${shownRaw(raw.checked_at)}`)
      if (raw.run !== undefined || raw.pin !== undefined) fail('run and pin belong to twin facts')
    }

    // A saved copy of the source: still the bytes it was, and holding the quote.
    if (raw.evidence !== undefined) {
      const ev = raw.evidence
      if (!isObject(ev) || typeof ev.path !== 'string' || !REPO_PATH.test(ev.path) || typeof ev.sha256 !== 'string' || !SHA256.test(ev.sha256)) {
        fail('evidence, when present, must be {path, sha256}: a repository path and its SHA-256')
      } else {
        const file = ctx.file(ev.path)
        if (file === null) fail(`evidence ${ev.path} is not in the repository`)
        else if (file.sha256 !== ev.sha256) fail(`evidence ${ev.path} has SHA-256 ${file.sha256.slice(0, 12)}..., the fact says ${ev.sha256.slice(0, 12)}...`)
        else if (isObject(raw.source) && nonEmpty(raw.source.quote) && !file.text.includes(raw.source.quote)) fail(`source.quote ${JSON.stringify(raw.source.quote)} does not occur in ${ev.path}`)
      }
    }
    if (id !== null && FACT_ID.test(id)) facts.push(raw as unknown as Fact)
  })
  return { facts, issues }
}

/** Validate content/registry/errata.json against the facts and runs it names. */
export function checkErrata(doc: unknown, ctx: RegistryContext & { facts: ReadonlyMap<string, Fact> }): { errata: Erratum[]; issues: Issue[] } {
  const issues: Issue[] = []
  const errata: Erratum[] = []
  if (!isObject(doc)) return { errata, issues: [{ id: null, detail: 'the file must hold an object with format and errata' }] }
  if (doc.format !== ERRATA_FORMAT) issues.push({ id: null, detail: `format must be ${JSON.stringify(ERRATA_FORMAT)}, got ${JSON.stringify(doc.format)}` })
  if (!Array.isArray(doc.errata)) return { errata, issues: [...issues, { id: null, detail: 'errata must be a list' }] }
  const tomorrow = addDays(ctx.today, 1)
  const byId = new Map<string, Record<string, unknown>>()
  doc.errata.forEach((raw, i) => {
    const id = isObject(raw) && typeof raw.id === 'string' ? raw.id : null
    const fail = (detail: string): void => {
      issues.push({ id: id ?? `errata[${i}]`, detail })
    }
    if (!isObject(raw)) return fail('an erratum must be an object')
    for (const k of Object.keys(raw)) if (!ERRATUM_FIELDS.has(k)) fail(`${k} is not a field of an erratum`)
    if (!isRealDate(raw.date)) fail(`date must be a real date, YYYY-MM-DD; got ${shownRaw(raw.date)}`)
    else if (raw.date > tomorrow) fail(`date ${raw.date} is in the future`)
    if (id === null || !/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`id must be <date>-<slug>, such as 2026-11-20-postgresql-19-ga; got ${shownRaw(raw.id)}`)
    else if (isRealDate(raw.date) && !id.startsWith(`${raw.date}-`)) fail(`id must start with its date ${raw.date}`)
    else if (byId.has(id)) fail('a second erratum with this id')
    if (raw.kind !== 'error' && raw.kind !== 'changed') fail(`kind must be error or changed; got ${shownRaw(raw.kind)}`)
    if (!Array.isArray(raw.lessons) || raw.lessons.length === 0) {
      fail('lessons must name at least one lesson, S{n}.L{k}: the lessons it flags "re-check"')
    } else {
      for (const l of raw.lessons) {
        if (typeof l !== 'string' || !LESSON_ID.test(l)) fail(`${JSON.stringify(l)} is not a lesson ID, S{n}.L{k}`)
      }
    }
    if (raw.runs !== undefined) {
      if (!Array.isArray(raw.runs)) {
        fail('runs, when present, must be a list of run IDs')
      } else {
        for (const r of raw.runs) {
          if (typeof r !== 'string' || !RUN_ID.test(r)) fail(`${JSON.stringify(r)} is not a run ID`)
          else if (!ctx.runs.has(r)) fail(`${r} is not on disk (runs/${r}.json)`)
        }
      }
    }
    if (raw.facts !== undefined) {
      if (!Array.isArray(raw.facts)) {
        fail('facts, when present, must be a list of fact IDs')
      } else {
        for (const f of raw.facts) {
          if (typeof f !== 'string' || !ctx.facts.has(f)) fail(`${JSON.stringify(f)} names no fact in content/registry/facts.json`)
        }
      }
    }
    for (const k of ['title', 'before', 'after'] as const) {
      const text = raw[k]
      if (!nonEmpty(text)) fail(`${k} must be a non-empty string`)
      else if (text.length > MAX_FIELD) fail(`${k} is ${text.length} characters; at most ${MAX_FIELD}`)
    }
    if (raw.why !== undefined) {
      if (!nonEmpty(raw.why)) fail('why, when present, must be a non-empty string')
      else if (raw.why.trim().split(/\s+/).length > MAX_WHY_WORDS) fail(`why is over ${MAX_WHY_WORDS} words`)
    }
    if (raw.source !== undefined) checkSource(raw.source, fail, new Set(['url', 'title']))
    if (id !== null) {
      byId.set(id, raw)
      if (!issues.some((x) => x.id === id)) errata.push(raw as unknown as Erratum)
    }
  })
  // supersedes names an earlier erratum that shares a lesson, and never loops.
  for (const [id, e] of byId) {
    if (e.supersedes === undefined) continue
    const fail = (detail: string): void => {
      issues.push({ id, detail })
    }
    const target = typeof e.supersedes === 'string' ? byId.get(e.supersedes) : undefined
    if (target === undefined) {
      fail(`supersedes ${JSON.stringify(e.supersedes)} names no erratum`)
      continue
    }
    if (e.supersedes === id) fail('supersedes itself')
    if (typeof target.date === 'string' && typeof e.date === 'string' && target.date > e.date) fail(`supersedes ${String(e.supersedes)}, which is newer`)
    const mine = Array.isArray(e.lessons) ? e.lessons : []
    const theirs = Array.isArray(target.lessons) ? target.lessons : []
    if (!mine.some((l) => theirs.includes(l))) fail(`supersedes ${String(e.supersedes)}, but they share no lesson`)
    const seen = new Set<string>([id])
    let next: unknown = e.supersedes
    while (typeof next === 'string') {
      if (seen.has(next)) {
        fail('supersedes forms a loop')
        break
      }
      seen.add(next)
      next = byId.get(next)?.supersedes
    }
  }
  return { errata: errata.filter((e) => !issues.some((x) => x.id === e.id)), issues }
}

// ------------------------------------------------------------------ errata: "re-check"
export interface RecheckFlag {
  erratum: string
  lesson: string
  /** the erratum's date */
  date: string
}

/**
 * The "re-check" flags for one learner: for each lesson an erratum names that the learner finished on or
 * before the erratum's date, one flag. A flag never deducts; it asks for a re-check (kernelspace's change
 * cards). An erratum replaced by a newer one that also flags the learner is dropped, so a card never
 * repeats itself. finished maps a lesson ID to the day the learner finished it.
 */
export function recheckFlags(errata: readonly Erratum[], finished: ReadonlyMap<string, string>): RecheckFlag[] {
  const flags: RecheckFlag[] = []
  for (const e of errata) {
    for (const lesson of e.lessons) {
      const done = finished.get(lesson)
      if (done !== undefined && done <= e.date) flags.push({ erratum: e.id, lesson, date: e.date })
    }
  }
  const flagged = new Set(flags.map((f) => f.erratum))
  const replaced = new Set<string>()
  for (const e of errata) if (e.supersedes !== undefined && flagged.has(e.id)) replaced.add(e.supersedes)
  return flags.filter((f) => !replaced.has(f.erratum)).sort((a, b) => b.date.localeCompare(a.date) || a.erratum.localeCompare(b.erratum) || a.lesson.localeCompare(b.lesson))
}
