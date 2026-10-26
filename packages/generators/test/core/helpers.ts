// Test helpers: events and draws for the keep/kill readings, a stand-in for the course content that reads an
// event's KC, template and exit flag from its data, and recording ports.

import type { ExpSeedDraw, LedgerEvent } from '@statespace/ledger'
import { kcOfContext, RULES_SHA256, stampTime } from '@statespace/ledger'
import type { KeepKillContent } from '@statespace/ledger/keepkill'
import type { EnginePort, InstrumentReply, InstrumentRequest } from '../../src/core/index.ts'

export const DAY = 86_400_000
/** A Monday morning, after the draw below. */
export const T0 = Date.UTC(2026, 10, 2, 9, 0)

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
  exit?: string
}

let counter = 0

/** An event; the stand-in content reads its KC, template and exit flag from data. */
export function ev(s: Spec): LedgerEvent {
  counter += 1
  const { at, day, tz } = stampTime(s.at, 60)
  const data: Record<string, unknown> = {}
  if (s.kc !== undefined) data.kc = s.kc
  if (s.family !== undefined) data.family = s.family
  if (s.template !== undefined) data.template = s.template
  if (s.exit !== undefined) data.exit = s.exit
  const kind = s.kind ?? 'item'
  const e: Record<string, unknown> = {
    id: `g-${counter.toString().padStart(6, '0')}`,
    v: 1,
    kind,
    ref: s.ref ?? (kind === 'item' ? `item:${s.family ?? 'GEN-negate-it'}/t${s.template ?? 1}` : 'probe:S1/A/1/1'),
    provenance: 'own',
    exposure: s.exposure ?? 'unseen',
    at,
    tz,
    day,
    dev: 'dev-a',
    data,
  }
  if (s.seed !== undefined) e.seed = s.seed
  if (s.ok !== undefined) e.ok = s.ok
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

export const draw = (expSeed: number, ms = T0 - 7 * DAY, rulesSha256 = RULES_SHA256): ExpSeedDraw => ({ expSeed, drawnAt: stampTime(ms, 60).at, rulesSha256, dev: 'dev-a' })

/** A port that records requests and answers each with `reply`. */
export function scriptedPort(reply: (req: InstrumentRequest, n: number) => InstrumentReply | Promise<InstrumentReply>): EnginePort & { requests: InstrumentRequest[] } {
  const requests: InstrumentRequest[] = []
  return {
    requests,
    async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
      requests.push(req as InstrumentRequest)
      return (await reply(req as InstrumentRequest, requests.length)) as InstrumentReply<W>
    },
  }
}

/** A reply with the given verdict, in the shape a bus engine returns. */
export function reply(verdict: InstrumentReply['verdict'], witness?: unknown): InstrumentReply {
  return {
    verdict,
    ...(witness === undefined ? {} : { witness }),
    stats: { ms: 0 },
    provenance: { engine: 'z3', version: '5.3.1', build: 'test', budget: { wallMs: 1000 } },
  }
}
