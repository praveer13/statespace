// Helpers for the keep/kill tests: events built from a short spec, a stand-in for the course content that
// reads an event's KC, template and exit flag from its data, and draws.

import type { ExpSeedDraw, LedgerEvent } from '../src/index.ts'
import { kcOfContext, stampTime } from '../src/index.ts'
import type { KeepKillContent } from '../src/keepkill/index.ts'
import { RULES_SHA } from './helpers.ts'

export const DAY = 86_400_000
export const T0 = Date.UTC(2026, 10, 2, 9, 0) // a Monday morning, after the draw below

export interface Spec {
  at: number
  kind?: LedgerEvent['kind']
  ref?: string
  kc?: string
  family?: string
  template?: number
  seed?: number
  ok?: boolean
  exposure?: LedgerEvent['exposure']
  provenance?: LedgerEvent['provenance']
  exit?: string
  ms?: number
  data?: Record<string, unknown>
}

let counter = 0
/** A test event; the stand-in content below reads its KC, template and exit flag from data. */
export function ev(s: Spec): LedgerEvent {
  counter += 1
  const { at, day, tz } = stampTime(s.at, 60)
  const data: Record<string, unknown> = { ...(s.data ?? {}) }
  if (s.kc !== undefined) data.kc = s.kc
  if (s.family !== undefined) data.family = s.family
  if (s.template !== undefined) data.template = s.template
  if (s.exit !== undefined) data.exit = s.exit
  const kind = s.kind ?? 'item'
  const e: Record<string, unknown> = {
    id: `t-${counter.toString().padStart(6, '0')}`,
    v: 1,
    kind,
    ref: s.ref ?? (kind === 'item' ? `item:${s.family ?? 'GEN-negate-it'}/t${s.template ?? 1}` : kind === 'call' ? 'call:S1.L3/c1' : kind === 'probe' ? 'probe:S1/A/1/1' : 'note:1'),
    provenance: s.provenance ?? 'own',
    exposure: s.exposure ?? 'unseen',
    at,
    tz,
    day,
    dev: 'dev-a',
    data,
  }
  if (s.seed !== undefined) e.seed = s.seed
  if (s.ok !== undefined) e.ok = s.ok
  if (s.ms !== undefined) e.ms = s.ms
  return e as unknown as LedgerEvent
}

export function stubContent(treatments: Record<string, 'expert' | 'novice'> = {}): KeepKillContent {
  return {
    primaryKc: (e) => (typeof e.data?.kc === 'string' ? e.data.kc : kcOfContext(e.ref)),
    template: (e) => (typeof e.data?.family === 'string' ? { family: e.data.family, template: typeof e.data.template === 'number' ? e.data.template : 1 } : undefined),
    treatment: (kc) => treatments[kc],
    isFirstLessonExit: (e, kc) => e.data?.exit === kc,
  }
}

export const draw = (expSeed: number, ms = T0 - 7 * DAY): ExpSeedDraw => ({ expSeed, drawnAt: stampTime(ms, 60).at, rulesSha256: RULES_SHA, dev: 'dev-a' })

