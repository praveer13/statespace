// What the keep/kill entry rules and outcomes read from the log, derived at read time (I2) under the
// definitions they cite: sessions and first learning (ASSESSMENT.md section 3.2), counted sessions,
// relearned and solid (section 3.3), fresh (section 2.3), and the practice items an arm acts on (the rules'
// common.exposure). The course content that resolves an event to its KC and template is injected, because
// KC tags live in content, never in events (ARCHITECTURE.md section 7.2).
//
// Pure: no DOM, storage or network.

import type { LedgerEvent } from '../event.ts'
import { itemContext, kcOfContext } from '../event.ts'
import { compareKeys, daysBetween, instantKey, shiftKey } from '../time.ts'
import type { InstantKey } from '../time.ts'
import { isFresh } from '../weights.ts'

/** The course content the rules need, resolved at read time. */
export interface KeepKillContent {
  /** The event's primary KC (ASSESSMENT.md section 3.1), or undefined when it has none. */
  primaryKc(event: LedgerEvent): string | undefined
  /** The generator family and 1-based template number of the event's instance, or undefined when not generated. */
  template(event: LedgerEvent): { family: string; template: number } | undefined
  /** The treatment a KC's content declares; undefined means none, which the rules read as novice. */
  treatment(kc: string): 'expert' | 'novice' | undefined
  /** True when the event is an attempt at the exit item of the KC's first lesson or step briefing. */
  isFirstLessonExit(event: LedgerEvent, kc: string): boolean
  /**
   * The KCs a placement item credited, from the placement walk, which credits a KC only once its hard
   * requires are credited (spine section 8.6). Absent: a correct placement item whose primary KC is k is
   * taken to credit k, which can only exclude more KCs, never fewer, and never depends on an arm.
   */
  placementCredits?(event: LedgerEvent): readonly string[]
}

/** Kinds whose ok makes a graded event, for sessions [D]: the evidence kinds and calls. */
const GRADED_KINDS = new Set<LedgerEvent['kind']>(['call', 'item', 'probe', 'prove-it', 'audit'])

/** A graded event: a call or an evidence kind with a verdict (an ungraded event omits ok and never counts). */
export function isGraded(e: LedgerEvent): boolean {
  return GRADED_KINDS.has(e.kind) && typeof e.ok === 'boolean'
}

/** A practice item, the only events an arm acts on (common.exposure): an item met in practice or a drawer, not in a placement walk, test-out or confirmation. */
export function isPracticeItem(e: LedgerEvent): boolean {
  const c = itemContext(e)
  return c === 'item' || c === 'drawer'
}

export interface Session {
  readonly index: number
  /** Graded events, in fold order. */
  readonly events: readonly LedgerEvent[]
  readonly start: InstantKey
  /** The local day of its first event. */
  readonly day: string
}

const SESSION_GAP_SECONDS = 30 * 60

/** Sessions: maximal runs of graded events in which consecutive events are less than 30 minutes apart. */
export function sessionsOf(ordered: readonly LedgerEvent[]): Session[] {
  const out: Session[] = []
  let current: LedgerEvent[] = []
  let last: InstantKey | null = null
  const close = (): void => {
    const first = current[0]
    if (first !== undefined) out.push({ index: out.length, events: current, start: instantKey(first.at), day: first.day })
    current = []
  }
  for (const e of ordered) {
    if (!isGraded(e)) continue
    const k = instantKey(e.at)
    if (last !== null && compareKeys(k, shiftKey(last, SESSION_GAP_SECONDS)) >= 0) close()
    current.push(e)
    last = k
  }
  close()
  return out
}

/** First learning of a KC: the first attempt at its first lesson's exit item, or a test-out's confirmation date. */
export function firstLearning(kc: string, ordered: readonly LedgerEvent[], content: KeepKillContent): { at: string; source: 'exit' | 'confirm' } | undefined {
  for (const e of ordered) {
    if (content.isFirstLessonExit(e, kc)) return { at: e.at, source: 'exit' }
    if (e.kind === 'item' && kcOfContext(e.ref) === kc && e.ref.startsWith('confirm:') && e.ok === true) return { at: e.at, source: 'confirm' }
  }
  return undefined
}

/** True when the placement walk credited the KC (see KeepKillContent.placementCredits). */
export function placementCredited(kc: string, ordered: readonly LedgerEvent[], content: KeepKillContent): boolean {
  return ordered.some((e) => {
    if (itemContext(e) !== 'placement') return false
    if (content.placementCredits !== undefined) return content.placementCredits(e).includes(kc)
    return e.ok === true && content.primaryKc(e) === kc
  })
}

/**
 * The first moment a KC is solid (ASSESSMENT.md section 3.3): relearned, meaning three counted sessions
 * pairwise at least two local days apart, taken greedily in time order; and the latest fresh event on the
 * KC correct. A session counts for the KC when a fresh event whose primary KC it is is correct no later
 * than the third attempt on it in that session. Returns the event at which solid first holds and its
 * session, or undefined.
 */
export function firstSolid(kc: string, sessions: readonly Session[], content: KeepKillContent): { event: LedgerEvent; session: number } | undefined {
  const countedDays: string[] = []
  let latestFreshOk: boolean | undefined
  for (const s of sessions) {
    let attempts = 0
    let counted = false
    for (const e of s.events) {
      // An attempt answers an item, a probe, a Prove-it prediction or an audit case; a call is a prediction, not an attempt.
      if (e.kind === 'call' || content.primaryKc(e) !== kc) continue
      attempts += 1
      if (isFresh(e)) latestFreshOk = e.ok === true
      if (!counted && attempts <= 3 && isFresh(e) && e.ok === true) {
        counted = true
        const prior = countedDays[countedDays.length - 1]
        if (prior === undefined || daysBetween(prior, s.day) >= 2) countedDays.push(s.day)
      }
      if (countedDays.length >= 3 && latestFreshOk === true) return { event: e, session: s.index }
    }
  }
  return undefined
}

/**
 * The first fresh, graded event on a KC at or after a moment, skipping events whose item form an arm
 * changes (comparison 2's practice Proof Blocks items): the rules' common.outcome.
 */
export function outcomeEvent(
  kc: string,
  from: InstantKey,
  ordered: readonly LedgerEvent[],
  content: KeepKillContent,
  skip: (e: LedgerEvent) => boolean,
): LedgerEvent | undefined {
  for (const e of ordered) {
    if (!isFresh(e) || typeof e.ok !== 'boolean') continue
    if (compareKeys(instantKey(e.at), from) < 0) continue
    if (content.primaryKc(e) !== kc || skip(e)) continue
    return e
  }
  return undefined
}
