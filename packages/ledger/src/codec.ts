// The codec: events and logs to text and back. Encoding is canonical JSON, so equal records encode to equal
// text in every tab, device and language. Decoding treats the text as outside bytes: JSON only, the
// structural limits of ARCHITECTURE.md section 5.6, then event@1 validation of every record. An imported
// export bundle is parsed on the instrument origin first (I6); the main origin decodes the structured
// result again with these functions before it merges anything (section 7.7).
//
// Pure: no DOM, storage or network.

import { canonicalJson, checkStructure, LedgerError, parseJsonSafely } from './canonical.ts'
import type { ExpSeedDraw, LedgerEvent, ValidationIssue } from './event.ts'
import { normalizeEvent, normalizeExpSeedDraw, validateEvent, validateExpSeedDraw } from './event.ts'
import type { Log } from './log.ts'
import { mergeLogs, orderedEvents } from './log.ts'

/** The portable form of a log: what an export carries beside its envelope (bundle@1). */
export interface LogSnapshot {
  events: LedgerEvent[]
  expSeeds: ExpSeedDraw[]
}

/** An event's canonical text. */
export function encodeEvent(event: LedgerEvent): string {
  return canonicalJson(normalizeEvent(event))
}

/** One event from text, or the reasons it is refused. */
export function decodeEvent(text: string): { ok: true; event: LedgerEvent } | { ok: false; issues: string[] } {
  let value: unknown
  try {
    value = parseJsonSafely(text)
  } catch (e) {
    return { ok: false, issues: [(e as Error).message] }
  }
  const issues = validateEvent(value)
  if (issues.length > 0) return { ok: false, issues: issues.map(formatIssue) }
  return { ok: true, event: normalizeEvent(value) }
}

/** A log's snapshot: events in fold order, draws governing first. */
export function snapshotOf(log: Log): LogSnapshot {
  return { events: orderedEvents(log), expSeeds: [...log.expSeeds] }
}

/** A log's canonical text: {"events":[...],"expSeeds":[...]} with events in fold order. */
export function encodeLog(log: Log): string {
  return canonicalJson(snapshotOf(log))
}

/** A refused record: where it sat in the input and why. */
export interface DecodeProblem {
  readonly where: string
  readonly issues: readonly string[]
}

/** The result of decoding a snapshot: the valid part as a log, and every refused record. */
export interface DecodedLog {
  readonly log: Log
  readonly problems: readonly DecodeProblem[]
}

/**
 * A snapshot from text or from an already-parsed value (an instrument-origin parse, a stored record). The
 * top level must be an object with an events array and, optionally, an expSeeds array; anything else throws
 * a LedgerError. Each record is held to the structural limits of ARCHITECTURE.md section 5.6 on its own
 * (depth, values, forbidden keys): a long log legitimately holds more than 100,000 values in all, and its
 * size is capped in bytes by whoever reads the file. Records that fail are reported in problems and left
 * out; the caller decides whether a partial import may proceed (SCR-settings shows them in its preview).
 */
export function decodeLog(input: string | unknown): DecodedLog {
  let value: unknown = input
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input)
    } catch (e) {
      throw new LedgerError('not-json', `not JSON: ${(e as Error).message}`)
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new LedgerError('invalid-log', 'a log is an object with an events array')
  const record = value as { events?: unknown; expSeeds?: unknown }
  if (!Array.isArray(record.events)) throw new LedgerError('invalid-log', 'a log needs an events array')
  if (record.expSeeds !== undefined && !Array.isArray(record.expSeeds)) throw new LedgerError('invalid-log', 'expSeeds must be an array')
  const problems: DecodeProblem[] = []
  const events: LedgerEvent[] = []
  record.events.forEach((raw: unknown, i: number) => {
    const structural = checkStructure(raw)
    const issues = structural.length > 0 ? structural : validateEvent(raw).map(formatIssue)
    if (issues.length > 0) problems.push({ where: `/events/${i}`, issues })
    else events.push(normalizeEvent(raw))
  })
  const draws: ExpSeedDraw[] = []
  ;((record.expSeeds as unknown[] | undefined) ?? []).forEach((raw: unknown, i: number) => {
    const structural = checkStructure(raw)
    const issues = structural.length > 0 ? structural : validateExpSeedDraw(raw).map(formatIssue)
    if (issues.length > 0) problems.push({ where: `/expSeeds/${i}`, issues })
    else draws.push(normalizeExpSeedDraw(raw))
  })
  return { log: mergeLogs({ events, expSeeds: draws }), problems }
}

const formatIssue = (i: ValidationIssue): string => `${i.instancePath || '/'} ${i.keyword}: ${i.message}`
