// Test helpers for the Mirror: valid event@1 records (every one is checked against the schema, so a test never feeds a
// derivation what the ledger would refuse), a call builder, a content stub, and a seeded random source.

import type { LedgerEvent } from '@statespace/ledger'
import { validateEvent } from '@statespace/ledger'
import type { Confidence, MirrorContent } from '../src/mirror/index.ts'
import { callDataOf } from '../src/mirror/index.ts'
import type { CallShape } from '../src/mirror/index.ts'

let counter = 0

export const DAY0 = '2026-11-02T08:00:00Z'

/** An event@1 record at `at` (UTC unless an offset is given; `day` follows the offset's local date). */
export function event(fields: Partial<LedgerEvent> & { tz?: number }): LedgerEvent {
  const { at = DAY0, tz = 0, ...rest } = fields
  counter += 1
  const e = {
    id: `evt-${String(counter).padStart(6, '0')}`,
    v: 1,
    kind: 'call',
    ref: 'call:S1.L1/c1',
    provenance: 'own',
    exposure: 'unseen',
    at,
    tz,
    day: at.slice(0, 10),
    dev: 'dev-test',
    ...rest,
  } as LedgerEvent
  const issues = validateEvent(e)
  if (issues.length > 0) throw new Error(`not an event@1 record: ${issues.map((i) => `${i.instancePath} ${i.keyword}`).join(', ')}`)
  return e
}

export const KC = 'KC-1.three-answers'
export const THREE_WAY: CallShape = { form: 'choice', options: 3 }
export const SET_OF_FIVE: CallShape = { form: 'set', statements: 5 }

/** The instant `minutes` after DAY0, in UTC. */
export function minutesAfter(base: string, minutes: number): string {
  const t = Date.parse(base) + minutes * 60_000
  return new Date(t).toISOString().replace('.000Z', 'Z')
}

export interface CallFields {
  ref?: string
  seed?: number
  conf?: Confidence
  ok?: boolean
  at?: string
  tz?: number
  shape?: CallShape
  kc?: string | null
  provenance?: LedgerEvent['provenance']
  exposure?: LedgerEvent['exposure']
  kind?: LedgerEvent['kind']
  data?: Record<string, unknown>
  noData?: boolean
}

let questions = 0

/** A call on a question of its own (a new cell number), after instruction by default, carrying its shape and KC. */
export function call(f: CallFields = {}): LedgerEvent {
  questions += 1
  const shape = f.shape ?? THREE_WAY
  const kc = f.kc === null ? undefined : (f.kc ?? KC)
  const base: Partial<LedgerEvent> = {
    kind: f.kind ?? 'call',
    ref: f.ref ?? `call:S1.L2/c${questions}`,
    conf: f.conf ?? 'think',
    ok: f.ok ?? true,
    at: f.at ?? minutesAfter(DAY0, 60 + questions),
    provenance: f.provenance ?? 'own',
    exposure: f.exposure ?? 'unseen',
    ...(f.tz === undefined ? {} : { tz: f.tz }),
  }
  if (f.seed !== undefined) base.seed = f.seed
  if (f.noData !== true) base.data = { ...f.data, ...callDataOf(shape, kc) }
  else if (f.data !== undefined) base.data = f.data
  return event(base)
}

/** The attempt at the exit item of the KC's first lesson: the test content reads `data.exit`. */
export function exitItem(kc: string, at: string): LedgerEvent {
  return event({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 10, ok: true, at, data: { exit: kc } })
}

/** A content stub: the exit item names the KC it is the exit of; every KC is resolved from the call's own record. */
export const content: MirrorContent = {
  primaryKc: () => undefined,
  isFirstLessonExit: (e, kc) => e.kind === 'item' && (e.data as { exit?: string } | undefined)?.exit === kc,
}

/** mulberry32: a small seeded generator for tests only. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)] as T
export const int = (r: () => number, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1))

export function shuffled<T>(r: () => number, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

/** Fixed seeds, so a failing property reproduces exactly. */
export const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 2654435761 + 12345) >>> 0)
