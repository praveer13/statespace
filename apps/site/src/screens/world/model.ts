// The Clearinghouse's inputs on this device, and what a filing writes (docs/WORLD.md sections 4.1, 4.7 and 5).
//
// The world itself is never stored (I2). What is kept are its inputs: the weeks the learner opened, each with the seed
// drawn when it opened (working state `clearinghouse:weeks`), and the learner's filings, which are `audit` events in
// the evidence log. A week opens when the learner first opens the Clearinghouse in a new week of their own; a week
// they skip is never generated afterwards, and nothing is overdue. The calendar labels a week and never enters a seed.

import { useEffect, useMemo, useState } from 'react'
import type { EventInput, LedgerEvent } from '@statespace/ledger'
import { buildWorld, DEFAULT_INCIDENTS } from '@statespace/world'
import type { Adoption, Filing, Grade, Incident, Key, WeekInput, World } from '@statespace/world'
import type { LedgerStore } from '../../storage/index.ts'

export const WEEKS_KEY = 'clearinghouse:weeks'

/** The Monday of the local week, as YYYY-MM-DD: a label for the learner, never a seed. */
export function weekLabel(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const back = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - back)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function labelText(label: string | undefined): string {
  if (label === undefined) return 'this week'
  const [y, m, d] = label.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function freshSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0] as number
  } catch {
    return (Date.now() * 2654435761) >>> 0
  }
}

const isWeek = (x: unknown): x is WeekInput => {
  const r = x as Record<string, unknown> | null
  return r !== null && typeof r === 'object' && Number.isInteger(r.k) && Number.isInteger(r.seed)
}

export type WeeksState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly weeks: readonly WeekInput[]; readonly kept: boolean }

/**
 * The opened weeks, opening this week's on first visit. Without a store (no IndexedDB) the week lives for this visit
 * only and the screen says so.
 */
export function useWeeks(store: LedgerStore | null | undefined): WeeksState {
  const [state, setState] = useState<WeeksState>({ status: 'loading' })
  useEffect(() => {
    if (store === undefined) return
    let live = true
    const label = weekLabel(new Date())
    const open = (prior: readonly WeekInput[]): WeekInput[] => {
      const last = prior[prior.length - 1]
      if (last !== undefined && last.label === label) return [...prior]
      return [...prior, { k: (last?.k ?? 0) + 1, seed: freshSeed(), size: DEFAULT_INCIDENTS, label }]
    }
    if (store === null) {
      setState({ status: 'ready', weeks: open([]), kept: false })
      return
    }
    void (async () => {
      let prior: WeekInput[] = []
      try {
        const v = (await store.getWorking(WEEKS_KEY)) as { weeks?: unknown } | undefined
        if (v !== undefined && Array.isArray(v.weeks)) prior = v.weeks.filter(isWeek)
      } catch {
        /* an unreadable record opens a fresh week */
      }
      const weeks = open(prior)
      let kept = true
      if (weeks.length !== prior.length) {
        try {
          await store.setWorking(WEEKS_KEY, { weeks })
        } catch {
          kept = false
        }
      }
      if (live) setState({ status: 'ready', weeks, kept })
    })()
    return () => {
      live = false
    }
  }, [store])
  return state
}

const rec = (x: unknown): Record<string, unknown> => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {})

/** The Clearinghouse's filings in the log, oldest first. */
export const worldEvents = (events: readonly LedgerEvent[]): LedgerEvent[] => events.filter((e) => e.kind === 'audit' && rec(e.data).surface === 'clearinghouse')

/** The sound proposals the learner admitted: each joins the world from the week after (WORLD.md section 4.3). */
export function adoptions(events: readonly LedgerEvent[]): Adoption[] {
  const out: Adoption[] = []
  for (const e of worldEvents(events)) {
    const d = rec(e.data)
    if (d.incident === 'proposal' && d.member === 'sound' && d.decision === 'admit' && typeof d.week === 'number' && typeof d.family === 'string') out.push({ week: d.week, family: d.family })
  }
  return out
}

/** The world, recomputed from its inputs whenever they change. */
export function useWorld(weeks: readonly WeekInput[] | null, events: readonly LedgerEvent[] | null): World | null {
  const adopted = useMemo(() => (events === null ? [] : adoptions(events)), [events])
  const key = JSON.stringify([weeks, adopted])
  return useMemo(() => (weeks === null ? null : buildWorld({ weeks, adopted })), [key])
}

export const refOf = (inc: Incident): string => `audit:${inc.anchor}/${inc.id}`

/** The first filing on an incident, if any. */
export const filingOf = (events: readonly LedgerEvent[], inc: Incident): LedgerEvent | undefined => events.find((e) => e.kind === 'audit' && e.ref === refOf(inc))

export type Confidence = 'guess' | 'think' | 'sure'

export interface Finding extends Filing {
  readonly conf: Confidence
  readonly proves: string
  readonly help: boolean
}

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

/** The `audit` event a filing writes (WORLD.md section 4.7), with the call of step 1 riding on it as at the Desk. */
export function filingEvent(inc: Incident, f: Finding, key: Key, g: Grade, opts: { readonly firstContact: boolean; readonly size: number; readonly ms: number; readonly events: readonly LedgerEvent[] }): EventInput {
  const ref = refOf(inc)
  const seen = opts.events.some((e) => e.kind === 'audit' && e.ref === ref)
  return {
    kind: 'audit',
    ref,
    itemRev: `${inc.rev}/${inc.member}`,
    seed: inc.weekSeed >>> 0,
    ok: g.ok,
    conf: f.conf,
    provenance: f.help ? 'assisted' : 'own',
    exposure: seen ? 'seen' : 'unseen',
    ms: Math.max(0, Math.round(opts.ms)),
    resp: { call: f.call, proves: f.proves, scenarios: [...f.scenarios], named: f.named, lines: [...f.lines] },
    data: {
      surface: 'clearinghouse',
      incident: inc.kind,
      week: inc.k,
      weekSeed: inc.weekSeed >>> 0,
      family: inc.family.id,
      member: inc.member,
      decision: f.named === 'none' ? 'admit' : 'reject',
      plugins: ['reference'],
      firstContact: opts.firstContact,
      sitting: `clearinghouse-w${inc.k}`,
      position: inc.slot + 1,
      size: opts.size,
      truth: g.truth,
      primary: key.primary,
      acceptable: [...key.acceptable],
      found: g.found,
      classRight: g.classRight,
      evidenceValid: g.evidenceValid,
      restatementRight: g.restatementRight,
      restatementOf: g.restatementOf,
      callMatched: g.callMatched,
    },
  }
}

/** Counts split by truth, never a pooled score (AUDIT-DESK.md section 5.5). */
export function countsByTruth(events: readonly LedgerEvent[]) {
  let soundSeen = 0
  let soundAccepted = 0
  let flawedSeen = 0
  let flawedFound = 0
  let flawedFull = 0
  for (const e of worldEvents(events)) {
    const d = rec(e.data)
    if (d.truth === 'sound') {
      soundSeen++
      if (d.decision === 'admit') soundAccepted++
    } else if (d.truth === 'flawed') {
      flawedSeen++
      if (d.found === true) flawedFound++
      if (d.classRight === true && d.evidenceValid === true) flawedFull++
    }
  }
  return { soundSeen, soundAccepted, flawedSeen, flawedFound, flawedFull }
}

/** Has the learner's record reached LAB-3? Scheduling, never access (WORLD.md section 4.1). */
export const pastLab3 = (events: readonly LedgerEvent[]): boolean => events.some((e) => e.kind === 'lab-check' && e.ref.startsWith('lab-check:LAB-3.') && e.ok === true)

/** Which labs the record has reached, for the plug-in rows. */
export const labsReached = (events: readonly LedgerEvent[]): Set<string> =>
  new Set(events.filter((e) => e.kind === 'lab-check' && e.ok === true).map((e) => (/^lab-check:(LAB-\d+)\./.exec(e.ref)?.[1] ?? '')).filter((x) => x !== ''))
