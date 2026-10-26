import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { LedgerEvent } from '@statespace/ledger'
import { addDays, daysBetween } from '@statespace/ledger'
import {
  DOSE_OPPORTUNITIES,
  DOSE_WINDOWS,
  KEEP_PLANNED,
  RHYTHM_TARGET,
  arcWeeks,
  deriveCards,
  deriveRhythm,
  isDue,
  keepBlock,
  planToday,
  ratingOf,
  stageWeeks,
  stageWorkHours,
  sureWrongReturns,
  weekOf,
} from '../src/schedule/index.ts'
import type { TemplateRef } from '../src/schedule/index.ts'
import { event } from './mirror-helpers.ts'

const KCS = ['KC-1.three-answers', 'KC-1.violation-as-sat', 'KC-1.witness-class']
const T: TemplateRef = { family: 'GEN-negate-it', template: 't1' }
const templatesOf = (): readonly TemplateRef[] => [T]

/** A generated item on `kc` on `day` at hh:mm UTC. */
function item(kc: string, day: string, ok: boolean, extra: Partial<LedgerEvent> = {}, hm = '09:00'): LedgerEvent {
  return event({ kind: 'item', ref: `item:${T.family}/${T.template}`, seed: Math.floor(Math.random() * 2 ** 31), ok, at: `${day}T${hm}:00Z`, data: { kc }, ms: 90_000, ...extra })
}

describe('the rating of section 3.10', () => {
  test('fresh ok is Good, Hard on a guess; a miss is Again; seen or assisted ok is Hard; ungraded and agent are no update', () => {
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', true)), 3)
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', true, { conf: 'guess' })), 2)
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', false, { conf: 'sure' })), 1)
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', true, { exposure: 'seen' })), 2)
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', true, { provenance: 'assisted' })), 2)
    assert.equal(ratingOf(item(KCS[0]!, '2026-11-02', true, { provenance: 'agent' })), null)
    const ungraded = event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1, data: { kc: KCS[0] } })
    assert.equal(ratingOf(ungraded), null)
  })
})

/**
 * The scheduler property test (W1-T08's acceptance; EVIDENCE.md section 5): on a simulated calendar, a learner who does
 * Today on the days they study and answers what it offers gives every KC at least 8 graded opportunities in its first 60
 * days, at least one in each of the four windows.
 */
describe('the dose floor on a simulated 60-day calendar', () => {
  const calendars: Record<string, (offset: number) => boolean> = {
    'every day': () => true,
    'three days a week': (d) => [0, 2, 4].includes(d % 7),
    'four days a week, misses one in five': (d) => [0, 1, 3, 5].includes(d % 7) && (d * 7) % 5 !== 0,
  }
  for (const [name, studies] of Object.entries(calendars)) {
    test(name, () => {
      const start = '2026-11-02'
      const introduced = new Map(KCS.map((k, i) => [k, addDays(start, i * 2)] as const))
      const events: LedgerEvent[] = []
      // The first lesson: a call and the exit item, on the day each KC is introduced.
      for (const [kc, day] of introduced) {
        events.push(event({ kind: 'call', ref: 'call:S1.L1/c1', conf: 'think', ok: true, at: `${day}T08:00:00Z`, data: { call: { form: 'choice', options: 3, kc } } }))
        events.push(item(kc, day, true, {}, '08:10'))
      }
      let correct = 0
      for (let d = 1; d <= 70; d++) {
        const today = addDays(start, d)
        if (!studies(d)) continue
        const plan = planToday({ events, today, introduced, templatesOf })
        for (const c of plan.cards) {
          if (c.kind !== 'item') continue
          correct = (correct + 1) % 5
          events.push(item(c.kc, today, correct !== 0, { data: { kc: c.kc, today: { day: today, slot: c.slot } } }, '19:00'))
        }
      }
      for (const [kc, intro] of introduced) {
        const offsets = events.filter((e) => (e.data as { kc?: string; call?: { kc?: string } }).kc === kc || (e.data as { call?: { kc?: string } }).call?.kc === kc).map((e) => daysBetween(intro, e.day))
        const in60 = offsets.filter((o) => o >= 0 && o <= 60)
        assert.ok(in60.length >= DOSE_OPPORTUNITIES, `${kc}: ${in60.length} opportunities in 60 days (${in60.join(',')})`)
        for (const [lo, hi] of DOSE_WINDOWS) {
          // A window can only be served on a study day inside it.
          const studyDayInside = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).some((o) => studies(o + daysBetween(start, intro)))
          if (studyDayInside) assert.ok(in60.some((o) => o >= lo && o <= hi), `${kc}: nothing in the window ${lo}-${hi} (${in60.join(',')})`)
        }
      }
    })
  }

  test('a session stays inside 12 minutes at the default item time', () => {
    const introduced = new Map(Array.from({ length: 20 }, (_, i) => [`KC-1.k${i}`, '2026-11-02'] as const))
    const plan = planToday({ events: [item('KC-1.k0', '2026-11-02', true)], today: '2026-11-05', introduced, templatesOf })
    assert.equal(plan.mode, 'session')
    assert.ok(plan.minutes[0] <= 12 && plan.counts.items > 0, JSON.stringify(plan.minutes))
  })
})

describe('Today', () => {
  const introduced = new Map([[KCS[0]!, '2026-10-01'], [KCS[1]!, '2026-10-01']])
  test('the plan holds still while the session runs: today\'s answers do not change it', () => {
    const events = [item(KCS[0]!, '2026-10-01', true), item(KCS[1]!, '2026-10-01', true)]
    const a = planToday({ events, today: '2026-10-03', introduced, templatesOf })
    const b = planToday({ events: [...events, item(KCS[0]!, '2026-10-03', true, {}, '10:00')], today: '2026-10-03', introduced, templatesOf })
    assert.deepEqual(a.cards, b.cards)
  })

  test('after 7 idle days a welcome-back set of at most 3 items and a re-find, never the pile', () => {
    const many = new Map(Array.from({ length: 30 }, (_, i) => [`KC-1.k${i}`, '2026-09-01'] as const))
    const events = [...many.keys()].map((k) => item(k, '2026-09-01', true))
    const plan = planToday({ events, today: '2026-09-10', introduced: many, templatesOf, refinds: [{ specimen: 'SP-1.1', kcs: ['KC-1.k3'], ready: true }] })
    assert.equal(plan.mode, 'welcome')
    assert.ok(plan.counts.items <= 3)
    assert.equal(plan.counts.refinds, 1)
    assert.equal(plan.counts.audits, 0)
    assert.equal(planToday({ events, today: '2026-09-16', introduced: many, templatesOf }).mode, 'bench')
    assert.equal(planToday({ events, today: '2026-10-14', introduced: many, templatesOf }).mode, 'landmark')
  })

  test('at most one audit case, on an anchor whose KCs are met, and none once decided', () => {
    const events = [item(KCS[0]!, '2026-10-01', true)]
    const audits = [
      { ref: 'AUD-1.1/sound', anchor: 'AUD-1.1', n: 1, stage: 'S1', kcs: [KCS[0]!], subject: 's' },
      { ref: 'AUD-1.1/flawed', anchor: 'AUD-1.1', n: 2, stage: 'S1', kcs: [KCS[0]!], subject: 's' },
      { ref: 'AUD-9.1/sound', anchor: 'AUD-9.1', n: 1, stage: 'S9', kcs: ['KC-9.x'], subject: 's' },
    ]
    const plan = planToday({ events, today: '2026-10-03', introduced, templatesOf, audits })
    const a = plan.cards.filter((c) => c.kind === 'audit')
    assert.equal(a.length, 1)
    assert.ok(a[0]!.kind === 'audit' && a[0]!.audit.anchor === 'AUD-1.1')
    const decided = [...events, event({ kind: 'audit', ref: 'audit:AUD-1.1/sound', ok: true, at: '2026-10-02T09:00:00Z' }), event({ kind: 'audit', ref: 'audit:AUD-1.1/flawed', ok: true, at: '2026-10-02T09:05:00Z' })]
    assert.equal(planToday({ events: decided, today: '2026-10-03', introduced, templatesOf, audits }).counts.audits, 0)
  })

  test('a sure miss returns at about 1 day and 1 week, on the same template, and is served by a later answer', () => {
    const miss = item(KCS[0]!, '2026-10-01', false, { conf: 'sure' })
    const r = sureWrongReturns([miss], '2026-10-02')
    assert.deepEqual(r.open.map((x) => x.after), [1])
    assert.deepEqual(r.all.map((x) => x.from), ['2026-10-02', '2026-10-08'])
    const plan = planToday({ events: [miss], today: '2026-10-02', introduced, templatesOf })
    assert.ok(plan.cards.some((c) => c.kind === 'item' && c.why === 'return' && c.kc === KCS[0]))
    const answered = [miss, item(KCS[0]!, '2026-10-02', true)]
    assert.deepEqual(sureWrongReturns(answered, '2026-10-09').open.map((x) => x.after), [7])
  })

  test('cards are due from their day and never accumulate a count of days late', () => {
    const cards = deriveCards({ events: [item(KCS[0]!, '2026-10-01', true)], introduced })
    const c = cards.get(KCS[0]!)!
    assert.ok(isDue(c, addDays(c.due, 30)))
    assert.ok(!('late' in c) && !('overdue' in c))
  })
})

describe('the week', () => {
  const at = (day: string, hm: string) => event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 7, ok: true, at: `${day}T${hm}:00Z`, data: { kc: KCS[0] } })
  test('weeks start on Monday', () => {
    assert.equal(weekOf('2026-10-26'), '2026-10-26')
    assert.equal(weekOf('2026-11-01'), '2026-10-26')
  })

  test('met in k of the last 12 weeks: two sessions meet a week; a missed week is made up within 7 days; reserve weeks', () => {
    const events: LedgerEvent[] = []
    // Week of 09-07: two sessions (met). Week of 09-14: one (missed), made up by three in the week of 09-21.
    events.push(at('2026-09-07', '09:00'), at('2026-09-09', '09:00'))
    events.push(at('2026-09-14', '09:00'))
    events.push(at('2026-09-21', '09:00'), at('2026-09-23', '09:00'), at('2026-09-25', '09:00'))
    // Week of 09-28: nothing (a reserve week). Two items 10 minutes apart are one session.
    events.push(at('2026-10-05', '09:00'), at('2026-10-05', '09:10'))
    const r = deriveRhythm(events, '2026-10-14')
    const by = new Map(r.weeks.map((w) => [w.start, w.status]))
    assert.equal(by.get('2026-09-07'), 'met')
    assert.equal(by.get('2026-09-14'), 'made-up')
    assert.equal(by.get('2026-09-21'), 'met')
    assert.equal(by.get('2026-09-28'), 'reserve')
    assert.equal(by.get('2026-10-05'), 'reserve')
    assert.equal(r.met, 3)
    assert.equal(r.of, 5)
    assert.ok(RHYTHM_TARGET === 8)
  })

  test('a declared break pauses its weeks and the window passes over them', () => {
    const events = [at('2026-09-07', '09:00'), at('2026-09-09', '09:00')]
    const r = deriveRhythm(events, '2026-09-30', { hours: [6, 8], benchDays: [2, 6], breaks: [{ from: '2026-09-14', to: '2026-09-27' }], ifThen: [] })
    assert.deepEqual(r.weeks.map((w) => w.start), ['2026-09-07'])
  })

  test('the first week starts counting', () => {
    const r = deriveRhythm([at('2026-10-26', '09:00')], '2026-10-27')
    assert.equal(r.starting, true)
  })

  test('the Keep block is computed and planned at the spine figures; stage work and the arc match the budget', () => {
    assert.equal(stageWorkHours(6), 4.75)
    assert.equal(stageWorkHours(10), 8.25)
    const s2 = stageWeeks([15.6, 28.4], 6, 6)
    assert.equal(s2[0].toFixed(1), '3.3')
    assert.equal(s2[1].toFixed(1), '6.0')
    const arc = arcWeeks([107, 197], 6, 6)
    assert.equal(Math.round(arc[0]), 43)
    assert.equal(Math.round(arc[1]), 80)
    const cards = deriveCards({ events: [item(KCS[0]!, '2026-10-01', true)], introduced: new Map([[KCS[0]!, '2026-10-01']]) })
    const k = keepBlock({ cards, today: '2026-10-02', hours: 6, itemMinutes: 2, clearinghouse: false })
    assert.deepEqual(k.planned, KEEP_PLANNED[6])
    assert.ok(k.minutes[0] >= 30 && k.minutes[1] <= 75, JSON.stringify(k))
    assert.equal(k.reviews, 1)
  })
})
