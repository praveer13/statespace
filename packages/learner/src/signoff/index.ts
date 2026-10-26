// The Defence and stage sign-off, derived from the evidence log at read time and never stored (I2; ASSESSMENT.md
// sections 3.2 to 3.5 and 6; spine section 8.6).
//
// The Defence's events, by the event@1 ref grammar:
//   Part A  probe:S{n}/A/{attempt}/{index}        a probe on an unseen seed, graded by its family's checker, with a call
//   Part B  prove-it:S{n}/B/{attempt}/{mutant}    a prediction about a seeded mutation of the learner's own artifact;
//                                                 ungraded when written, scored against the outcome a defend receipt reports
//   Part C  audit:S{n}/C/{attempt}/{index}        an audit case, graded by its key
//   Part D  explain-back:S{n}                     the explain-back and its three-idea self-check: required, never credited
//
// Every Defence event carries `data.size` (the attempt's planned item count), so a part's n is the sample drawn,
// not the items answered. An item scores 1 when its verdict is true and its provenance is own (section 6.3).
//
// Pure: no DOM, storage or network.

import type { LedgerEvent } from '@statespace/ledger'
import { addDays, dayNumber, instantMs, isFresh } from '@statespace/ledger'
import { rateOf } from '../mirror/stats.ts'
import type { Rate } from '../mirror/stats.ts'

export type { Rate } from '../mirror/stats.ts'

// ------------------------------------------------------------------------------------------------ the rule's numbers

/** Each of Parts A to C scores at least this share (spine section 8.6). */
export const PART_FLOOR = 0.6
/** Parts A to C together score at least this share. */
export const OVERALL_FLOOR = 0.75
/** Every credited part has at least this many items, so one miss never fails a part. */
export const MIN_PART_ITEMS = 4
/** Parts A to C fall in at least this many sessions. */
export const MIN_SESSIONS = 2
/** A failed part is retaken on fresh seeds at least this many days later. */
export const RETAKE_DAYS = 3
/** A settled probe falls at least this many days after sign-off. */
export const SETTLE_DAYS = 30
/** A session is a run of graded events less than this many minutes apart [D] (section 3.2). */
export const SESSION_GAP_MIN = 30
/** Two counted sessions are spaced when their local days are at least this far apart. */
export const SPACED_DAYS = 2
/** Relearned: this many pairwise spaced counted sessions (section 3.3). */
export const RELEARN_SESSIONS = 3
/** A session counts for a KC when the correct fresh item comes no later than this attempt on the KC in it. */
export const COUNT_BY_ATTEMPT = 3

export type Part = 'A' | 'B' | 'C'
export const PARTS: readonly Part[] = ['A', 'B', 'C']

// ------------------------------------------------------------------------------------------------ refs

export interface DefenceRef {
  readonly stage: string
  readonly part: Part | 'D'
  /** 0 for Part D, which has no attempts. */
  readonly attempt: number
  /** The item's index (A, C) or the mutant's id (B); '' for D. */
  readonly index: string
}

const PROBE = /^probe:(S[0-9]+)\/A\/([0-9]+)\/([0-9]+)$/
const DEFEND = /^prove-it:(S[0-9]+)\/B\/([0-9]+)\/([A-Za-z0-9._-]+)$/
const AUDIT = /^audit:(S[0-9]+)\/C\/([0-9]+)\/([0-9]+)$/
const EXPLAIN = /^explain-back:(S[0-9]+)$/

/** The Defence position an event's ref names, or undefined for any other event. */
export function parseDefenceRef(e: Pick<LedgerEvent, 'kind' | 'ref'>): DefenceRef | undefined {
  const m =
    (e.kind === 'probe' && PROBE.exec(e.ref)) ||
    (e.kind === 'prove-it' && DEFEND.exec(e.ref)) ||
    (e.kind === 'audit' && AUDIT.exec(e.ref)) ||
    null
  if (m !== null) {
    const part: Part = e.kind === 'probe' ? 'A' : e.kind === 'prove-it' ? 'B' : 'C'
    return { stage: m[1] as string, part, attempt: Number(m[2]), index: m[3] as string }
  }
  const d = e.kind === 'explain-back' ? EXPLAIN.exec(e.ref) : null
  return d !== null ? { stage: d[1] as string, part: 'D', attempt: 0, index: '' } : undefined
}

/** The ref a Defence event is written under. */
export function defenceRef(stage: string, part: Part | 'D', attempt: number, index: string | number): string {
  if (part === 'D') return `explain-back:${stage}`
  if (part === 'A') return `probe:${stage}/A/${attempt}/${index}`
  if (part === 'B') return `prove-it:${stage}/B/${attempt}/${index}`
  return `audit:${stage}/C/${attempt}/${index}`
}

// ------------------------------------------------------------------------------------------------ Part B outcomes

/** What a seeded mutation did when the checker ran it: it passed, it built and a check rejected it, or it did not build. */
export type Verdict = 'passes' | 'rejects' | 'no-build'
export const VERDICTS: readonly Verdict[] = ['passes', 'rejects', 'no-build']

export interface Prediction {
  readonly verdict: Verdict
  /** The check that rejects it, for a `rejects` prediction. */
  readonly locus?: string | undefined
}

export interface DefendOutcome {
  readonly stage: string
  readonly mutant: string
  readonly verdict: Verdict
  readonly locus?: string | undefined
  /** When the receipt that reports it was imported. */
  readonly at: string
  /** The receipt's SHA-256, its import event's ref without the prefix. */
  readonly receipt: string
}

const rec = (x: unknown): Record<string, unknown> => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {})
const isVerdict = (x: unknown): x is Verdict => x === 'passes' || x === 'rejects' || x === 'no-build'

/** A prediction read back from its event's `resp`, or undefined. */
export function predictionOf(e: Pick<LedgerEvent, 'resp'>): Prediction | undefined {
  const r = rec(e.resp)
  if (!isVerdict(r.verdict)) return undefined
  return { verdict: r.verdict, ...(typeof r.locus === 'string' && r.locus !== '' ? { locus: r.locus } : {}) }
}

/**
 * The defend outcomes the log holds, by `${stage}/${mutant}`: each from a receipt-import event whose `data.defend`
 * lists them (`{ stage, mutants: [{ id, verdict, locus? }] }`). A later import replaces an earlier one for a mutant.
 */
export function defendOutcomes(events: readonly LedgerEvent[], beforeMs = Infinity): Map<string, DefendOutcome> {
  const out = new Map<string, DefendOutcome>()
  for (const e of events) {
    if (e.kind !== 'receipt-import' || instantMs(e.at) > beforeMs) continue
    const d = rec(rec(e.data).defend)
    const stage = typeof d.stage === 'string' ? d.stage : undefined
    if (stage === undefined || !Array.isArray(d.mutants)) continue
    for (const m of d.mutants) {
      const r = rec(m)
      if (typeof r.id !== 'string' || !isVerdict(r.verdict)) continue
      out.set(`${stage}/${r.id}`, {
        stage,
        mutant: r.id,
        verdict: r.verdict,
        ...(typeof r.locus === 'string' && r.locus !== '' ? { locus: r.locus } : {}),
        at: e.at,
        receipt: e.ref.replace(/^receipt-import:/, ''),
      })
    }
  }
  return out
}

/** A prediction scores when its verdict matches and, for a mutant a check rejects, its locus matches (section 6.3). */
export function predictionMatches(p: Prediction, o: Pick<DefendOutcome, 'verdict' | 'locus'>): boolean {
  if (p.verdict !== o.verdict) return false
  return o.verdict !== 'rejects' || o.locus === undefined || p.locus === o.locus
}

// ------------------------------------------------------------------------------------------------ sessions

/** The kinds whose events make up sessions: graded work, and Part B's predictions. */
const SESSION_KINDS: ReadonlySet<string> = new Set(['call', 'item', 'probe', 'prove-it', 'audit'])

/** Each session-making event's session number (0, 1, ...), by event id; sessions follow time order (section 3.2). */
export function sessionsOf(events: readonly LedgerEvent[]): Map<string, number> {
  const timed = events
    .filter((e) => SESSION_KINDS.has(e.kind))
    .map((e) => ({ id: e.id, ms: instantMs(e.at) }))
    .sort((a, b) => a.ms - b.ms)
  const out = new Map<string, number>()
  let session = -1
  let last = -Infinity
  for (const t of timed) {
    if (t.ms - last >= SESSION_GAP_MIN * 60_000) session++
    out.set(t.id, session)
    last = t.ms
  }
  return out
}

// ------------------------------------------------------------------------------------------------ parts

export interface ItemScore {
  readonly part: Part
  readonly attempt: number
  readonly index: string
  /** true or false once graded; null while ungraded (a Part B prediction whose run has not been imported). */
  readonly ok: boolean | null
  /** Scores 1: ok and own. */
  readonly credited: boolean
  readonly provenance: LedgerEvent['provenance']
  readonly unseen: boolean
  readonly at: string
  readonly day: string
  readonly session: number
  /** A Part C case's truth, when its event records it. */
  readonly truth?: 'sound' | 'flawed' | undefined
  /** The item's primary KC, when its event records it. */
  readonly kc?: string | undefined
  readonly event: LedgerEvent
}

export interface PartAttempt {
  readonly part: Part
  readonly attempt: number
  /** The planned item count of the attempt: n. */
  readonly size: number
  readonly items: readonly ItemScore[]
  readonly answered: number
  /** Answered but not yet graded (Part B, awaiting its run). */
  readonly pending: number
  /** c: items that score 1. */
  readonly correct: number
  /** Every planned item answered and graded. */
  readonly complete: boolean
  /** c of n with its Wilson interval, once the attempt is complete. */
  readonly rate: Rate | null
  /** null until complete; then whether c/n ≥ 60% with at least four items. */
  readonly passed: boolean | null
  readonly lastDay: string | null
  readonly lastAt: string | null
  /** For a failed attempt, the first local day a retake opens. */
  readonly retakeFrom: string | null
}

function itemsOf(stage: string, events: readonly LedgerEvent[], sessions: Map<string, number>, outcomes: Map<string, DefendOutcome>): ItemScore[] {
  const out: ItemScore[] = []
  const seen = new Set<string>()
  for (const e of events) {
    const r = parseDefenceRef(e)
    if (r === undefined || r.stage !== stage || r.part === 'D') continue
    // the first event of a position stands; a second filing of the same position is ignored
    const key = `${r.part}/${r.attempt}/${r.index}`
    if (seen.has(key)) continue
    seen.add(key)
    const d = rec(e.data)
    let ok: boolean | null
    if (r.part === 'B') {
      const p = predictionOf(e)
      const o = outcomes.get(`${stage}/${r.index}`)
      ok = p === undefined ? false : o === undefined ? null : predictionMatches(p, o)
    } else ok = typeof e.ok === 'boolean' ? e.ok : null
    const truth = d.truth === 'sound' || d.truth === 'flawed' ? d.truth : undefined
    const kc = typeof d.kc === 'string' ? d.kc : undefined
    out.push({
      part: r.part,
      attempt: r.attempt,
      index: r.index,
      ok,
      credited: ok === true && e.provenance === 'own',
      provenance: e.provenance,
      unseen: e.exposure === 'unseen',
      at: e.at,
      day: e.day,
      session: sessions.get(e.id) ?? -1,
      ...(truth !== undefined ? { truth } : {}),
      ...(kc !== undefined ? { kc } : {}),
      event: e,
    })
  }
  return out
}

function attemptOf(part: Part, attempt: number, items: readonly ItemScore[]): PartAttempt {
  const mine = items.filter((i) => i.part === part && i.attempt === attempt)
  const sizes = mine.map((i) => Number(rec(i.event.data).size)).filter((n) => Number.isInteger(n) && n > 0)
  const size = Math.max(mine.length, ...sizes, 0)
  const pending = mine.filter((i) => i.ok === null).length
  const correct = mine.filter((i) => i.credited).length
  const complete = size > 0 && mine.length >= size && pending === 0
  const rate = complete ? rateOf(correct, size) : null
  const passed = complete ? size >= MIN_PART_ITEMS && correct / size >= PART_FLOOR : null
  const last = [...mine].sort((a, b) => instantMs(a.at) - instantMs(b.at)).at(-1)
  const lastDay = last?.day ?? null
  return {
    part,
    attempt,
    size,
    items: mine,
    answered: mine.length,
    pending,
    correct,
    complete,
    rate,
    passed,
    lastDay,
    lastAt: last?.at ?? null,
    retakeFrom: passed === false && lastDay !== null ? addDays(lastDay, RETAKE_DAYS) : null,
  }
}

// ------------------------------------------------------------------------------------------------ KCs

export interface KcProgress {
  readonly kc: string
  /** The local days of the counted sessions taken greedily (section 3.3), at most three. */
  readonly spacedDays: readonly string[]
  readonly relearned: boolean
  /** When the third spaced counted session's counting event happened. */
  readonly relearnedAt: string | null
  readonly settled: boolean
  readonly settledAt: string | null
}

/**
 * Per-KC relearning (section 3.3): a session counts for k when a fresh item with primary KC k is answered correctly in
 * it, no later than the third attempt on k there; k is relearned at the third pairwise spaced counted session.
 */
export function relearningOf(kc: string, events: readonly LedgerEvent[], sessions: Map<string, number>): Pick<KcProgress, 'spacedDays' | 'relearned' | 'relearnedAt'> {
  const onK = events
    .filter((e) => typeof e.ok === 'boolean' && isFresh(e) && rec(e.data).kc === kc)
    .sort((a, b) => instantMs(a.at) - instantMs(b.at))
  const attempts = new Map<number, number>()
  const counted: Array<{ session: number; day: string; at: string }> = []
  for (const e of onK) {
    const s = sessions.get(e.id) ?? -1
    const n = (attempts.get(s) ?? 0) + 1
    attempts.set(s, n)
    if (e.ok === true && n <= COUNT_BY_ATTEMPT && !counted.some((c) => c.session === s)) counted.push({ session: s, day: e.day, at: e.at })
  }
  const taken: Array<{ day: string; at: string }> = []
  for (const c of counted) {
    const prev = taken.at(-1)
    if (prev === undefined || dayNumber(c.day) - dayNumber(prev.day) >= SPACED_DAYS) taken.push(c)
    if (taken.length === RELEARN_SESSIONS) break
  }
  const relearned = taken.length >= RELEARN_SESSIONS
  return { spacedDays: taken.map((t) => t.day), relearned, relearnedAt: relearned ? (taken[RELEARN_SESSIONS - 1] as { at: string }).at : null }
}

// ------------------------------------------------------------------------------------------------ the view

export interface PartView {
  /** The attempt that counts: the latest one with any item. */
  readonly latest: PartAttempt | null
  readonly history: readonly PartAttempt[]
}

export interface DefenceView {
  readonly stage: string
  readonly parts: Readonly<Record<Part, PartView>>
  /** Parts A to C together, once all three latest attempts are complete. */
  readonly overall: Rate | null
  /** The distinct sessions the latest attempts of A to C fall in. */
  readonly sessions: number
  readonly soundCase: boolean
  readonly explainBack: LedgerEvent | null
  /** defencePassed (section 3.4) now. */
  readonly passed: boolean
  /** The earliest time the Defence was passed, or null. */
  readonly passedAt: string | null
  /** Parts whose latest attempt fell below its floor. */
  readonly failedParts: readonly Part[]
  /** When every part clears its floor and the overall does not: the lowest-scoring part, which the Defence suggests retaking. */
  readonly suggestRetake: Part | null
  /** Unseen, own items over A to C, and their sessions: the [T] line's n. */
  readonly unseenItems: number
  readonly kcs: readonly KcProgress[]
  readonly signedOff: boolean
  readonly signOffAt: string | null
  /** Every KC of the stage settled. */
  readonly settled: boolean
}

interface Passing {
  readonly parts: Record<Part, PartView>
  readonly overall: Rate | null
  readonly sessions: number
  readonly soundCase: boolean
  readonly explainBack: LedgerEvent | null
  readonly passed: boolean
}

function passingOf(stage: string, events: readonly LedgerEvent[], sessions: Map<string, number>, outcomes: Map<string, DefendOutcome>): Passing {
  const items = itemsOf(stage, events, sessions, outcomes)
  const parts = {} as Record<Part, PartView>
  for (const p of PARTS) {
    const attempts = [...new Set(items.filter((i) => i.part === p).map((i) => i.attempt))].sort((a, b) => a - b)
    const history = attempts.map((a) => attemptOf(p, a, items))
    parts[p] = { latest: history.at(-1) ?? null, history }
  }
  const latest = PARTS.map((p) => parts[p].latest)
  const all = latest.every((l): l is PartAttempt => l !== null && l.complete)
  const c = all ? latest.reduce((s, l) => s + (l as PartAttempt).correct, 0) : 0
  const n = all ? latest.reduce((s, l) => s + (l as PartAttempt).size, 0) : 0
  const overall = all ? rateOf(c, n) : null
  const used = new Set(latest.flatMap((l) => (l === null ? [] : l.items.map((i) => i.session))))
  const soundCase = parts.C.latest?.items.some((i) => i.truth === 'sound') ?? false
  const explainBack = events.find((e) => e.kind === 'explain-back' && e.ref === `explain-back:${stage}`) ?? null
  const passed = all && latest.every((l) => (l as PartAttempt).passed === true) && n > 0 && c / n >= OVERALL_FLOOR && used.size >= MIN_SESSIONS && soundCase && explainBack !== null
  return { parts, overall, sessions: used.size, soundCase, explainBack, passed }
}

/** The KCs to sign a stage off over, and the date to read the view on (for retakes: "today"). */
export interface DefenceInput {
  readonly kcs: readonly string[]
}

/** The stage's Defence and sign-off, derived from the log (sections 3.4, 3.5 and 6). */
export function deriveDefence(stage: string, events: readonly LedgerEvent[], input: DefenceInput): DefenceView {
  const sessions = sessionsOf(events)
  const outcomes = defendOutcomes(events)
  const now = passingOf(stage, events, sessions, outcomes)

  // The earliest moment the Defence passed: the rule read at each Defence event's or outcome's time, in order.
  const moments = [
    ...events.filter((e) => {
      const r = parseDefenceRef(e)
      return r !== undefined && r.stage === stage
    }),
    ...events.filter((e) => e.kind === 'receipt-import'),
  ]
    .map((e) => instantMs(e.at))
    .sort((a, b) => a - b)
  let passedMs: number | null = null
  if (now.passed) {
    for (const t of moments) {
      const before = events.filter((e) => instantMs(e.at) <= t)
      if (passingOf(stage, before, sessions, defendOutcomes(events, t)).passed) {
        passedMs = t
        break
      }
    }
  }
  const atOf = (ms: number | null): string | null => (ms === null ? null : (events.find((e) => instantMs(e.at) === ms)?.at ?? null))

  const relearning = input.kcs.map((kc) => ({ kc, ...relearningOf(kc, events, sessions) }))
  const allRelearned = relearning.every((k) => k.relearned)
  const signedOff = now.passed && allRelearned
  let signOffMs: number | null = null
  if (signedOff && passedMs !== null) {
    signOffMs = Math.max(passedMs, ...relearning.map((k) => (k.relearnedAt === null ? -Infinity : instantMs(k.relearnedAt))))
  }
  const signOffAt = atOf(signOffMs)

  const kcs: KcProgress[] = relearning.map((k) => {
    if (signOffMs === null) return { ...k, settled: false, settledAt: null }
    const from = signOffMs + SETTLE_DAYS * 86_400_000
    const probe = events.find((e) => e.ok === true && isFresh(e) && rec(e.data).kc === k.kc && instantMs(e.at) >= from)
    return { ...k, settled: probe !== undefined, settledAt: probe?.at ?? null }
  })

  const failedParts = PARTS.filter((p) => now.parts[p].latest?.passed === false)
  const latest = PARTS.map((p) => now.parts[p].latest)
  let suggestRetake: Part | null = null
  if (failedParts.length === 0 && now.overall !== null && now.overall.rate < OVERALL_FLOOR) {
    suggestRetake = [...PARTS].sort((a, b) => (now.parts[a].latest?.rate?.rate ?? 0) - (now.parts[b].latest?.rate?.rate ?? 0))[0] ?? null
  }
  const unseenItems = latest.reduce((s, l) => s + (l === null ? 0 : l.items.filter((i) => i.unseen && i.provenance === 'own').length), 0)

  return {
    stage,
    parts: now.parts,
    overall: now.overall,
    sessions: now.sessions,
    soundCase: now.soundCase,
    explainBack: now.explainBack,
    passed: now.passed,
    passedAt: atOf(passedMs),
    failedParts,
    suggestRetake,
    unseenItems,
    kcs,
    signedOff,
    signOffAt,
    settled: signOffAt !== null && kcs.length > 0 && kcs.every((k) => k.settled),
  }
}

/** Whether a retake of a part may start on `today` (a local date): the part failed, or is the suggested one, and three days have passed. */
export function retakeOpen(view: DefenceView, part: Part, today: string): boolean {
  const l = view.parts[part].latest
  if (l === null || !l.complete || l.lastDay === null) return false
  const failed = l.passed === false
  if (!failed && view.suggestRetake !== part) return false
  return dayNumber(today) >= dayNumber(addDays(l.lastDay, RETAKE_DAYS))
}

/** The first local day a retake of the part opens, or null when no retake is due. */
export function retakeFrom(view: DefenceView, part: Part): string | null {
  const l = view.parts[part].latest
  if (l === null || !l.complete || l.lastDay === null) return null
  if (l.passed !== false && view.suggestRetake !== part) return null
  return addDays(l.lastDay, RETAKE_DAYS)
}
