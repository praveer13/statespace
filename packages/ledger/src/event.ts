// event@1: the record of the evidence log (schemas/event.schema.json; ARCHITECTURE.md section 7.2; spine
// section 8.2). Types come from the generated @statespace/schema; this module adds the kind sets, the
// validation the main origin runs on every event it stores or imports, the factory that stamps a new event
// from an injected clock, and the reading of a ref's context.
//
// Pure: no DOM, storage or network.

import { compileSchema, createRegistry, SCHEMA_DOCUMENTS } from '@statespace/schema'
import type { EventKind, ExpSeedDraw, LedgerEvent, ValidationIssue } from '@statespace/schema'
import { canonicalClone, canonicalJson, LedgerError } from './canonical.ts'
import { stampTime } from './time.ts'

export type { EventKind, ExpSeedDraw, LedgerEvent, ValidationIssue }

export type Provenance = LedgerEvent['provenance']
export type Exposure = LedgerEvent['exposure']

/** Every kind, in the schema's order (spine section 8.2). */
export const EVENT_KINDS: readonly EventKind[] = [
  'call',
  'item',
  'probe',
  'prove-it',
  'audit',
  'lab-check',
  'receipt-import',
  'explain-back',
  'note',
  'view',
]

/** Kinds that produce evidence when fresh (ASSESSMENT.md section 2.3): their generated variants can be fresh. */
export const EVIDENCE_KINDS: ReadonlySet<EventKind> = new Set<EventKind>(['item', 'probe', 'prove-it', 'audit'])

/**
 * Kinds that never weigh as evidence (spine section 8.2; ASSESSMENT.md section 2.5): lab checks and receipt
 * imports produce claims and specimens; an explain-back is required for sign-off but uncredited; notes and
 * drawer views count toward nothing.
 */
export const UNCREDITED_KINDS: ReadonlySet<EventKind> = new Set<EventKind>(['lab-check', 'receipt-import', 'explain-back', 'note', 'view'])

/** The shape version this code writes for every kind. A reader meets higher versions and keeps them. */
export const CURRENT_KIND_VERSION = 1

const validateEventSchema = compileSchema('event')

const drawRegistry = createRegistry([
  ...SCHEMA_DOCUMENTS,
  {
    name: 'ledger-exp-seed-draw',
    id: 'urn:statespace:ledger-exp-seed-draw@1',
    schema: null,
    json: { $ref: 'urn:statespace:event@1#/$defs/expSeedDraw' },
  },
])
const validateDrawSchema = drawRegistry.compileSchema('ledger-exp-seed-draw')

const canonicalIssue = (value: unknown): ValidationIssue[] => {
  try {
    canonicalJson(value)
    return []
  } catch (e) {
    return [{ instancePath: '', schemaPath: '', keyword: 'canonical', message: (e as Error).message }]
  }
}

/**
 * Problems with a value as an event@1 record: the schema (both validators agree on it under GATE-schema),
 * and a canonical JSON form (no infinity, which JSON.parse makes of 1e400, and nothing JSON cannot hold).
 */
export function validateEvent(value: unknown): ValidationIssue[] {
  const issues = validateEventSchema(value)
  return issues.length > 0 ? issues : canonicalIssue(value)
}

/** A type guard over validateEvent. */
export function isLedgerEvent(value: unknown): value is LedgerEvent {
  return validateEvent(value).length === 0
}

/** Problems with a value as an experiment-seed draw (event@1's $defs/expSeedDraw). */
export function validateExpSeedDraw(value: unknown): ValidationIssue[] {
  const issues = validateDrawSchema(value)
  return issues.length > 0 ? issues : canonicalIssue(value)
}

const describe = (issues: readonly ValidationIssue[]): string =>
  issues
    .slice(0, 5)
    .map((i) => `${i.instancePath || '/'} ${i.keyword}: ${i.message}`)
    .join('; ')

/** The parse of a value's canonical form, or a LedgerError of the given code. */
function cloneOrThrow(value: unknown, code: 'invalid-event' | 'invalid-draw', what: string): unknown {
  try {
    return canonicalClone(value)
  } catch (e) {
    throw new LedgerError(code, `${what}: ${(e as Error).message}`)
  }
}

/**
 * The event as stored: reduced to the parse of its canonical form (undefined properties gone, -0 as 0),
 * then validated. Throws a LedgerError.
 */
export function normalizeEvent(value: unknown): LedgerEvent {
  const clone = cloneOrThrow(value, 'invalid-event', 'not an event@1 record')
  const issues = validateEventSchema(clone)
  if (issues.length > 0) throw new LedgerError('invalid-event', `not an event@1 record: ${describe(issues)}`)
  return clone as LedgerEvent
}

/** The draw as stored: reduced to the parse of its canonical form, then validated. Throws a LedgerError. */
export function normalizeExpSeedDraw(value: unknown): ExpSeedDraw {
  const clone = cloneOrThrow(value, 'invalid-draw', 'not an experiment-seed draw')
  const issues = validateDrawSchema(clone)
  if (issues.length > 0) throw new LedgerError('invalid-draw', `not an experiment-seed draw: ${describe(issues)}`)
  return clone as ExpSeedDraw
}

/** What an action supplies; the factory adds id, v, at, tz, day and dev. */
export type EventInput = Omit<LedgerEvent, 'id' | 'v' | 'at' | 'tz' | 'day' | 'dev'> & { v?: number }

/** What the app injects: a fresh id (crypto.randomUUID()), the clock's reading and offset, the device. */
export interface EventEnv {
  id: string
  nowMs: number
  /** Minutes east of UTC at nowMs (in a browser, -new Date(nowMs).getTimezoneOffset()). */
  tz: number
  dev: string
}

/** A new, validated event stamped from the injected clock. Throws a LedgerError when the result is not event@1. */
export function createEvent(input: EventInput, env: EventEnv): LedgerEvent {
  const { at, tz, day } = stampTime(env.nowMs, env.tz)
  const { v, ...rest } = input
  return normalizeEvent({ ...rest, id: env.id, v: v ?? CURRENT_KIND_VERSION, at, tz, day, dev: env.dev })
}

/** The context an item was met in, from its ref (spine section 8.2; ARCHITECTURE.md section 7.2). */
export type ItemContext = 'item' | 'drawer' | 'placement' | 'testout' | 'confirm'

/** The ref's prefix: the kind for most refs, or an item's context. */
export function refPrefix(ref: string): string {
  const i = ref.indexOf(':')
  return i < 0 ? ref : ref.slice(0, i)
}

/** The context of an item event, or undefined for another kind. */
export function itemContext(event: Pick<LedgerEvent, 'kind' | 'ref'>): ItemContext | undefined {
  if (event.kind !== 'item') return undefined
  const p = refPrefix(event.ref)
  return p === 'item' || p === 'drawer' || p === 'placement' || p === 'testout' || p === 'confirm' ? p : undefined
}

const GEN_REF = /^(?:item|call):(GEN-[a-z0-9-]+)\/([A-Za-z0-9._-]+)$/
const KC_CONTEXT = /^(?:testout|confirm):(KC-[1-9][0-9]*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/

/** The generator family and template named in an item:GEN-... or call:GEN-... ref; undefined otherwise. */
export function genOfRef(ref: string): { family: string; template: string } | undefined {
  const m = GEN_REF.exec(ref)
  return m ? { family: m[1] as string, template: m[2] as string } : undefined
}

/** The KC a testout: or confirm: ref names; undefined otherwise. */
export function kcOfContext(ref: string): string | undefined {
  return KC_CONTEXT.exec(ref)?.[1]
}
