// The log: a grow-only set of events keyed by id, with the keep/kill experiment-seed draws beside them
// (ARCHITECTURE.md section 7.5; ASSESSMENT.md section 2.6; spine section 12, item 58).
//
// Merge is set union. When two records share an id and differ, the one whose canonical JSON is smaller in
// code-point order wins: a total order on records, so the rule is commutative, associative and idempotent,
// and double imports, merges, stale tabs and two-device merges converge on one log. Draws merge the same
// way (a set of distinct draws), and the earliest draw governs. Nothing here stores a status: every learner
// state is derived from the log at read time (I2).
//
// Pure: no DOM, storage or network.

import { canonicalJson, compareCodePoints } from './canonical.ts'
import type { ExpSeedDraw, LedgerEvent } from './event.ts'
import { normalizeEvent, normalizeExpSeedDraw } from './event.ts'
import { sha256Hex } from './sha256.ts'
import { compareInstants } from './time.ts'

/** An immutable log: events by id, and the draws of the experiment seed. */
export interface Log {
  readonly events: ReadonlyMap<string, LedgerEvent>
  readonly expSeeds: readonly ExpSeedDraw[]
}

/** Anything that carries events and, optionally, draws: a Log, an export's content, a plain list. */
export interface LogInput {
  readonly events: Iterable<LedgerEvent> | ReadonlyMap<string, LedgerEvent>
  readonly expSeeds?: Iterable<ExpSeedDraw>
}

export const EMPTY_LOG: Log = Object.freeze({ events: new Map<string, LedgerEvent>(), expSeeds: Object.freeze([]) as readonly ExpSeedDraw[] })

/**
 * The canonical conflict rule: of two records that share an id, the one whose canonical JSON is smaller
 * in code-point order. Equal canonical forms are the same record, and the first argument is returned.
 */
export function resolveConflict(a: LedgerEvent, b: LedgerEvent): LedgerEvent {
  if (a === b) return a
  const ca = canonicalJson(a)
  const cb = canonicalJson(b)
  return compareCodePoints(cb, ca) < 0 ? b : a
}

const eventsOf = (input: LogInput['events']): Iterable<LedgerEvent> =>
  input instanceof Map ? (input as ReadonlyMap<string, LedgerEvent>).values() : (input as Iterable<LedgerEvent>)

/**
 * Merge logs into one. Every event is validated and stored in its canonical form, so a record that is not
 * event@1 throws a LedgerError before anything is merged. The result does not depend on the order of the
 * inputs or of the events inside them.
 */
export function mergeLogs(...inputs: readonly LogInput[]): Log {
  const events = new Map<string, LedgerEvent>()
  const draws: ExpSeedDraw[] = []
  for (const input of inputs) {
    for (const raw of eventsOf(input.events)) {
      const e = normalizeEvent(raw)
      const held = events.get(e.id)
      events.set(e.id, held === undefined ? e : resolveConflict(held, e))
    }
    if (input.expSeeds !== undefined) for (const d of input.expSeeds) draws.push(normalizeExpSeedDraw(d))
  }
  return { events, expSeeds: mergeDraws(draws) }
}

/** A log from events and draws (a merge with nothing). */
export function logFrom(events: Iterable<LedgerEvent>, expSeeds: Iterable<ExpSeedDraw> = []): Log {
  return mergeLogs({ events, expSeeds })
}

/**
 * The fold order: by instant (exactly, whatever offset each at carries), then by id in code-point order.
 * Deterministic for any set, so a derivation that folds the log gives one answer in every tab and device.
 */
export function compareFoldOrder(a: LedgerEvent, b: LedgerEvent): number {
  return compareInstants(a.at, b.at) || compareCodePoints(a.id, b.id)
}

/** The events of a log, or of any collection of events, in fold order. */
export function orderedEvents(input: Log | Iterable<LedgerEvent>): LedgerEvent[] {
  const list = isLog(input) ? [...input.events.values()] : [...input]
  return list.sort(compareFoldOrder)
}

const isLog = (v: unknown): v is Log => typeof v === 'object' && v !== null && 'events' in v && (v as Log).events instanceof Map

/** Fold the log's events, in fold order, into a value. Derived state is computed this way, never stored. */
export function foldLog<S>(input: Log | Iterable<LedgerEvent>, init: S, step: (state: S, event: LedgerEvent) => S): S {
  let state = init
  for (const e of orderedEvents(input)) state = step(state, e)
  return state
}

/**
 * The digest of an event set: SHA-256 of the canonical JSON array of its events sorted by id in code-point
 * order, written "sha256:<hex>". Equal sets give equal digests whatever order or tab they came from; a
 * derived view cached for first paint is trusted only beside the digest it came from (ARCHITECTURE.md
 * section 7.6), and a keep/kill read records the digest of the events it used.
 */
export function eventSetDigest(input: Log | Iterable<LedgerEvent>): string {
  let list: LedgerEvent[]
  if (isLog(input)) list = [...input.events.values()]
  else {
    // A plain list may hold two records of one id: the set they form keeps the conflict rule's winner.
    const byId = new Map<string, LedgerEvent>()
    for (const e of input) {
      const held = byId.get(e.id)
      byId.set(e.id, held === undefined ? e : resolveConflict(held, e))
    }
    list = [...byId.values()]
  }
  list.sort((a, b) => compareCodePoints(a.id, b.id))
  return `sha256:${sha256Hex(`[${list.map((e) => canonicalJson(e)).join(',')}]`)}`
}

/** The digest of a whole log: its event set and its draws. Two logs are the same exactly when these agree. */
export function logDigest(log: Log): string {
  const draws = log.expSeeds.map((d) => canonicalJson(d)).sort(compareCodePoints)
  return `sha256:${sha256Hex(`{"events":"${eventSetDigest(log)}","expSeeds":[${draws.join(',')}]}`)}`
}

/** True when two logs hold the same events (by canonical form) and the same draws. */
export function sameLog(a: Log, b: Log): boolean {
  return logDigest(a) === logDigest(b)
}

/** What a merge of incoming records into a log would do, for SCR-settings' preview (ARCHITECTURE.md section 7.7). */
export interface MergePreview {
  /** Ids the log does not hold. */
  readonly added: readonly string[]
  /** Ids the log holds with an identical record. */
  readonly duplicates: readonly string[]
  /** Ids the log holds with a different record, and which side the conflict rule keeps. */
  readonly conflicts: readonly { id: string; kept: 'existing' | 'incoming' }[]
  /** Draws the log does not hold, and whether the governing draw would change. */
  readonly addedDraws: readonly ExpSeedDraw[]
  readonly governingChanges: boolean
}

/** The preview of merging incoming into base, without changing either. Throws a LedgerError on an invalid record. */
export function previewMerge(base: Log, incoming: LogInput): MergePreview {
  const added: string[] = []
  const duplicates: string[] = []
  const conflicts: { id: string; kept: 'existing' | 'incoming' }[] = []
  const seen = new Map<string, LedgerEvent>()
  for (const raw of eventsOf(incoming.events)) {
    const e = normalizeEvent(raw)
    const prior = seen.get(e.id)
    seen.set(e.id, prior === undefined ? e : resolveConflict(prior, e))
  }
  for (const [id, e] of seen) {
    const held = base.events.get(id)
    if (held === undefined) added.push(id)
    else if (canonicalJson(held) === canonicalJson(e)) duplicates.push(id)
    else conflicts.push({ id, kept: resolveConflict(held, e) === held ? 'existing' : 'incoming' })
  }
  const held = new Set(base.expSeeds.map((d) => canonicalJson(d)))
  const incomingDraws = mergeDraws([...(incoming.expSeeds ?? [])].map((d) => normalizeExpSeedDraw(d)))
  const addedDraws = incomingDraws.filter((d) => !held.has(canonicalJson(d)))
  const before = governingDraw(base.expSeeds)
  const after = governingDraw([...base.expSeeds, ...addedDraws])
  const key = (d: ExpSeedDraw | undefined): string => (d === undefined ? '' : canonicalJson(d))
  const byId = (a: string, b: string): number => compareCodePoints(a, b)
  return {
    added: added.sort(byId),
    duplicates: duplicates.sort(byId),
    conflicts: conflicts.sort((a, b) => byId(a.id, b.id)),
    addedDraws,
    governingChanges: key(before) !== key(after),
  }
}

// ---------------------------------------------------------------------------------------------- draws

/**
 * The order of draws: the one drawn first, on equal instants the smaller value (the rules'
 * common.experiment_seed), and on a full tie the smaller canonical JSON, so the order is total.
 */
export function compareDraws(a: ExpSeedDraw, b: ExpSeedDraw): number {
  return compareInstants(a.drawnAt, b.drawnAt) || a.expSeed - b.expSeed || compareCodePoints(canonicalJson(a), canonicalJson(b))
}

/** The distinct draws of any number of lists, governing draw first. */
export function mergeDraws(draws: Iterable<ExpSeedDraw>): ExpSeedDraw[] {
  const byKey = new Map<string, ExpSeedDraw>()
  for (const d of draws) byKey.set(canonicalJson(d), d)
  return [...byKey.values()].sort(compareDraws)
}

/** The draw that governs: the earliest. Undefined when the comparisons were never turned on. */
export function governingDraw(draws: Iterable<ExpSeedDraw>): ExpSeedDraw | undefined {
  return mergeDraws(draws)[0]
}

/** Draws that a merge met and the earliest draw supersedes; units exposed under them are deviations. */
export function supersededDraws(draws: Iterable<ExpSeedDraw>): ExpSeedDraw[] {
  return mergeDraws(draws).slice(1)
}
