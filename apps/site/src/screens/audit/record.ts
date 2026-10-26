// What a filed finding writes to the evidence log, and how the Desk reads findings back (docs/AUDIT-DESK.md sections
// 5.4, 6.1 and 6.4). One `audit` event per finding, ref `audit:AUD-n.k/<case>` (event@1). The step-1 call rides on
// the same event (`conf`, `resp.call`): event@1's call refs name lessons and generators only, so a Desk call cannot be
// a `call` event of its own yet. Judgment is derived from these events at read time and never stored (I2).

import type { EventInput, LedgerEvent } from '@statespace/ledger'
import type { AuditCase } from './pool.ts'
import type { Decision } from './judgment.ts'
import { linesValidate } from './judgment.ts'

export type Confidence = 'guess' | 'think' | 'sure'

/** What the learner filed on one case, in the order of the five steps. */
export interface Finding {
  call: 'sound' | 'gap'
  conf: Confidence
  /** "This proves: ___", in the learner's words: kept on this device, never graded. */
  proves: string
  /** The answer given to each step-3 scenario, in the case's order. */
  scenarios: boolean[]
  /** "none" or a gap class, G1 to G13. */
  named: string
  /** The anchored lines, as statement:N, diff:N or receipt:N. */
  lines: string[]
  help: boolean
}

/** The grade of a finding against the case's key: what the event's `ok` and `data` carry. */
export interface Graded {
  truth: 'sound' | 'flawed'
  found: boolean
  classRight: boolean
  evidenceValid: boolean
  restatementRight: number
  restatementOf: number
  /** A flawed case found with an acceptable class and valid evidence, or a sound case accepted. */
  ok: boolean
  callMatched: boolean
}

export function grade(c: AuditCase, f: Finding): Graded {
  const restatementRight = c.restatement.scenarios.filter((s, i) => f.scenarios[i] === s.answer).length
  const restatementOf = c.restatement.scenarios.length
  const callMatched = (f.call === 'sound') === (c.key.truth === 'sound')
  if (c.key.truth === 'sound') {
    const accepted = f.named === 'none'
    return { truth: 'sound', found: false, classRight: accepted, evidenceValid: accepted, restatementRight, restatementOf, ok: accepted, callMatched }
  }
  const found = f.named !== 'none'
  const classRight = found && c.key.acceptableTop.includes(f.named)
  const evidenceValid = found && linesValidate(f.lines, c.evidence.loadBearing)
  return { truth: 'flawed', found, classRight, evidenceValid, restatementRight, restatementOf, ok: classRight && evidenceValid, callMatched }
}

export interface Sitting {
  /** The sitting's seed as text, or "open" for a case opened on its own. */
  id: string
  position: number
  size: number
}

/** The event a filing writes. */
export function auditEvent(c: AuditCase, f: Finding, g: Graded, sitting: Sitting, seed: number | null, ms: number, events: readonly LedgerEvent[]): EventInput {
  const ref = `audit:${c.ref}`
  const seen = events.some((e) => e.kind === 'audit' && e.ref === ref && e.itemRev === c.rev)
  return {
    kind: 'audit',
    ref,
    itemRev: c.rev,
    ...(seed === null ? {} : { seed }),
    ok: g.ok,
    conf: f.conf,
    provenance: f.help ? 'assisted' : 'own',
    exposure: seen ? 'seen' : 'unseen',
    ms: Math.max(0, Math.round(ms)),
    resp: { call: f.call, proves: f.proves, scenarios: f.scenarios, named: f.named, lines: f.lines },
    data: {
      surface: 'desk',
      sitting: sitting.id,
      position: sitting.position,
      size: sitting.size,
      truth: g.truth,
      primary: c.key.truth === 'flawed' ? c.key.top : null,
      acceptable: c.key.truth === 'flawed' ? c.key.acceptableTop : [],
      found: g.found,
      classRight: g.classRight,
      evidenceValid: g.evidenceValid,
      restatementRight: g.restatementRight,
      restatementOf: g.restatementOf,
      callMatched: g.callMatched,
    },
  }
}

const rec = (x: unknown): Record<string, unknown> => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {})

/** The audit events of the log, oldest first. */
export const auditEvents = (events: readonly LedgerEvent[]): LedgerEvent[] => events.filter((e) => e.kind === 'audit')

/** A finding read back from its event. */
export function findingOf(e: LedgerEvent): Finding {
  const r = rec(e.resp)
  return {
    call: r.call === 'sound' ? 'sound' : 'gap',
    conf: (e.conf ?? 'guess') as Confidence,
    proves: typeof r.proves === 'string' ? r.proves : '',
    scenarios: Array.isArray(r.scenarios) ? r.scenarios.map((x) => x === true) : [],
    named: typeof r.named === 'string' ? r.named : 'none',
    lines: Array.isArray(r.lines) ? r.lines.filter((x): x is string => typeof x === 'string') : [],
    help: e.provenance !== 'own',
  }
}

/**
 * The decisions that count toward audit accuracy (AUDIT-DESK 6.4): own and unseen. Assisted and seen work weighs only
 * for scheduling, and agent work never counts.
 */
export function countedDecisions(events: readonly LedgerEvent[]): Decision[] {
  const out: Decision[] = []
  for (const e of auditEvents(events)) {
    if (e.provenance !== 'own' || e.exposure !== 'unseen') continue
    const d = rec(e.data)
    const r = rec(e.resp)
    const truth = d.truth === 'sound' ? 'sound' : d.truth === 'flawed' ? 'flawed' : null
    if (truth === null) continue
    const named = typeof r.named === 'string' && r.named !== 'none' ? r.named : null
    out.push({
      case: e.ref.slice('audit:'.length),
      truth,
      primary: typeof d.primary === 'string' ? d.primary : null,
      acceptable: Array.isArray(d.acceptable) ? d.acceptable.filter((x): x is string => typeof x === 'string') : [],
      pick: named === null ? 'sound' : 'gap',
      named,
      evidenceValid: d.evidenceValid === true,
      restatementAnswered: typeof d.restatementRight === 'number',
      surface: typeof d.surface === 'string' ? d.surface : 'desk',
      sitting: typeof d.sitting === 'string' ? d.sitting : 'open',
      position: typeof d.position === 'number' ? d.position : 0,
    })
  }
  return out
}

/** The findings filed in one sitting, by case ref (the first filing of a case in that sitting stands). */
export function sittingFindings(events: readonly LedgerEvent[], sitting: string): Map<string, LedgerEvent> {
  const out = new Map<string, LedgerEvent>()
  for (const e of auditEvents(events)) {
    if (rec(e.data).sitting !== sitting) continue
    const ref = e.ref.slice('audit:'.length)
    if (!out.has(ref)) out.set(ref, e)
  }
  return out
}
