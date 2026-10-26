// Test helpers: a seeded random source, generators of valid event@1 records and draws, and the repository
// root. Every property test draws from a fixed seed list, so a failure reproduces exactly.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EventKind, ExpSeedDraw, LedgerEvent } from '../src/index.ts'
import { stampTime } from '../src/index.ts'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

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

/** Shuffle a copy (Fisher-Yates). */
export function shuffled<T>(r: () => number, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

/** Seeds for property tests. */
export const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 2654435761) >>> 0)

const REFS: Record<EventKind, (r: () => number) => string> = {
  call: (r) => pick(r, ['call:S1.L3/c1', 'call:GEN-negate-it/t2', 'call:ER-6/forecast', `call:S1.L${int(r, 1, 5)}/c${int(r, 1, 4)}`]),
  item: (r) =>
    pick(r, [
      `item:GEN-negate-it/t${int(r, 1, 4)}`,
      `item:GEN-find-the-witness/t${int(r, 1, 4)}`,
      'drawer:D-03/i2',
      'placement:step-4',
      'testout:KC-1.violation-as-sat',
      'confirm:KC-1.violation-as-sat',
    ]),
  probe: (r) => `probe:S${int(r, 1, 3)}/A/${int(r, 1, 3)}/${int(r, 1, 12)}`,
  'prove-it': (r) => pick(r, ['prove-it:LAB-1/m1', `prove-it:S2/B/1/m${int(r, 1, 6)}`]),
  audit: (r) => pick(r, ['audit:AUD-1.1/v1', 'audit:harvest/9f3a0c11', `audit:S1/C/1/${int(r, 1, 4)}`]),
  'lab-check': (r) => `lab-check:LAB-1.c${int(r, 1, 5)}`,
  'receipt-import': () => `receipt-import:${'ab'.repeat(32)}`,
  'explain-back': (r) => `explain-back:S${int(r, 1, 3)}`,
  note: (r) => `note:${int(r, 1, 9)}`,
  view: (r) => `view:D-0${int(r, 1, 6)}`,
}

const KINDS = Object.keys(REFS) as EventKind[]

/** A valid event; the optional fields vary with the seed. */
export function genEvent(r: () => number, overrides: Partial<LedgerEvent> = {}): LedgerEvent {
  const kind = overrides.kind ?? pick(r, KINDS)
  const base = Date.UTC(2026, 10, 1) + int(r, 0, 90) * 86_400_000 + int(r, 0, 86_399_999)
  const tz = pick(r, [0, 60, -300, 330, 840, -720, 345])
  const { at, day } = stampTime(base, tz)
  const e: Record<string, unknown> = {
    id: `ev-${Math.floor(r() * 2 ** 32).toString(36)}-${Math.floor(r() * 2 ** 32).toString(36)}`,
    v: 1,
    kind,
    ref: REFS[kind](r),
    provenance: pick(r, ['own', 'own', 'own', 'assisted', 'agent'] as const),
    exposure: kind === 'view' ? 'seen' : pick(r, ['seen', 'unseen'] as const),
    at,
    tz,
    day,
    dev: pick(r, ['dev-a', 'dev-b', 'dev-c']),
  }
  if (r() < 0.5) e.seed = Math.floor(r() * 2 ** 32)
  if (r() < 0.6) e.ok = r() < 0.6
  if (r() < 0.3) e.conf = pick(r, ['guess', 'think', 'sure'])
  if (r() < 0.3) e.ms = int(r, 200, 120_000)
  if (r() < 0.2) e.resp = { picked: pick(r, ['A', 'B', 'C']), text: pick(r, ['sat', 'unsat', 'Ünïcødé 𝔽', '']) }
  if (r() < 0.2) e.mis = pick(r, ['dp:L4', 'dp:G4'])
  if (r() < 0.2) e.data = { checks: { c1: pick(r, ['pass', 'fail']) }, n: int(r, 0, 9) }
  return { ...(e as unknown as LedgerEvent), ...overrides }
}

/** A different record with the same id: one field changed. */
export function variantOf(r: () => number, e: LedgerEvent): LedgerEvent {
  const options: Partial<LedgerEvent>[] = [
    { ok: !(e.ok ?? false) },
    { ms: int(r, 1, 999_999) },
    { provenance: e.provenance === 'own' ? 'assisted' : 'own' },
    { exposure: e.exposure === 'seen' ? 'unseen' : 'seen' },
    { data: { changed: int(r, 0, 1_000_000) } },
  ]
  const kindSafe = e.kind === 'view' ? options.filter((o) => !('exposure' in o)) : options
  return { ...e, ...pick(r, kindSafe) }
}

/** A log's events: n events, some duplicated with variants (conflicts). */
export function genEvents(r: () => number, n: number, conflictRate = 0.15): LedgerEvent[] {
  const out: LedgerEvent[] = []
  for (let i = 0; i < n; i++) {
    const prior = out.length > 0 && r() < conflictRate ? pick(r, out) : undefined
    out.push(prior === undefined ? genEvent(r) : variantOf(r, prior))
  }
  return out
}

export const RULES_SHA = '67d1cba9cdab3247ca8425f7bfa5e1821c6823ac8ea613648cde73211f94e589'

export function genDraw(r: () => number, overrides: Partial<ExpSeedDraw> = {}): ExpSeedDraw {
  const ms = Date.UTC(2026, 9, 20) + int(r, 0, 10) * 86_400_000 + int(r, 0, 3) * 1000
  return {
    expSeed: Math.floor(r() * 2 ** 32),
    drawnAt: stampTime(ms, pick(r, [0, 60, -300])).at,
    rulesSha256: RULES_SHA,
    dev: pick(r, ['dev-a', 'dev-b']),
    ...overrides,
  }
}
