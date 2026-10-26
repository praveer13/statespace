// The keep/kill entry rules hold (keep/kill rules, common.entry, common.units and each comparison's entry):
// constructed logs for each rule, and properties over random logs: an entry never depends on the arm (it is
// the same under every expSeed), never precedes the draw, and never admits a KC credited at placement, a KC
// first learned by test-out, or a KC the rules do not list.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ExpSeedDraw, LedgerEvent } from '../src/index.ts'
import { logFrom, orderedEvents } from '../src/index.ts'
import type { Entry, KeepKillContent } from '../src/keepkill/index.ts'
import { allocate, entriesOf, entryOf, firstSolid, kcComparison, sessionsOf, unitsOf } from '../src/keepkill/index.ts'
import { int, pick, rng, SEEDS } from './helpers.ts'
import { DAY, draw, ev, stubContent, T0 } from './kk-helpers.ts'

const ctx = (events: LedgerEvent[], d: ExpSeedDraw, content = stubContent()) => ({ ordered: orderedEvents(logFrom(events)), content, draw: d })

const C1 = kcComparison('misconception-note')
const C2 = kcComparison('proof-blocks-distractors')
const C3 = kcComparison('witness-generalization')

test('comparison 3: a unit enters at its first practice item of a listed family, not at a placement, test-out or unlisted item', () => {
  const kc = 'KC-1.violation-as-sat'
  const events = [
    ev({ at: T0, family: 'GEN-call-it', kc, seed: 1, ok: true }), // GEN-call-it is not a listed family
    ev({ at: T0 + 1000, ref: 'placement:step-2', family: 'GEN-negate-it', kc, ok: false }), // not practice
    ev({ at: T0 + 2000, kind: 'probe', family: 'GEN-negate-it', kc, seed: 2, ok: true }), // a probe, not an item
    ev({ at: T0 + 3000, family: 'GEN-find-the-witness', kc, seed: 3, ok: true }),
    ev({ at: T0 + 4000, family: 'GEN-negate-it', kc, seed: 4, ok: true }),
  ]
  assert.deepEqual(entryOf(C3, kc, ctx(events, draw(7))), { status: 'entered', at: events[3]?.at })
  // A drawer item is practice too.
  const drawer = [ev({ at: T0, ref: 'drawer:D-03/i2', family: 'GEN-negate-it', kc, seed: 9 })]
  assert.equal(entryOf(C3, kc, ctx(drawer, draw(7))).status, 'entered')
  assert.deepEqual(entryOf(C3, kc, ctx([], draw(7))), { status: 'waiting' })
})

test('comparison 2: a unit enters at its first practice item of GEN-proof-structure template 2', () => {
  const kc = 'KC-2.proof-reading'
  const events = [ev({ at: T0, family: 'GEN-proof-structure', template: 1, kc, seed: 1 }), ev({ at: T0 + 5000, family: 'GEN-proof-structure', template: 2, kc, seed: 2 })]
  assert.deepEqual(entryOf(C2, kc, ctx(events, draw(1))), { status: 'entered', at: events[1]?.at })
  assert.deepEqual(entryOf(C2, 'KC-2.goal-state-reading', ctx(events, draw(1))), { status: 'waiting' })
})

test('comparison 1: an expert KC enters at first learning; a novice KC at the first graded event of the session after it first became solid', () => {
  const expert = 'KC-1.only-if-direction'
  const content = stubContent({ [expert]: 'expert' })
  const exitAttempt = ev({ at: T0 + 3600_000, kc: expert, exit: expert, seed: 5, ok: false })
  assert.deepEqual(entryOf(C1, expert, ctx([ev({ at: T0, kc: expert, seed: 4 }), exitAttempt], draw(3), content)), { status: 'entered', at: exitAttempt.at })

  const novice = 'KC-1.three-answers'
  // Three counted sessions, pairwise two local days apart, each with a fresh correct item on the KC.
  const s1 = ev({ at: T0, kc: novice, seed: 10, ok: true })
  const s2 = ev({ at: T0 + 2 * DAY, kc: novice, seed: 11, ok: true })
  const s3a = ev({ at: T0 + 4 * DAY, kc: novice, seed: 12, ok: true }) // solid here: relearned, latest fresh correct
  const s3b = ev({ at: T0 + 4 * DAY + 10 * 60_000, kc: 'KC-1.witness-class', seed: 13, ok: true }) // same session
  const next = ev({ at: T0 + 4 * DAY + 3 * 3600_000, kind: 'call', kc: 'KC-2.proof-reading', ok: true }) // a later session
  const events = [s1, s2, s3a, s3b, next]
  const solid = firstSolid(novice, sessionsOf(orderedEvents(logFrom(events))), stubContent())
  assert.equal(solid?.event.id, s3a.id)
  assert.deepEqual(entryOf(C1, novice, ctx(events, draw(3))), { status: 'entered', at: next.at })
  // Two days between sessions is needed: sessions one day apart do not count as spaced.
  const close = [ev({ at: T0, kc: novice, seed: 20, ok: true }), ev({ at: T0 + DAY, kc: novice, seed: 21, ok: true }), ev({ at: T0 + 2 * DAY, kc: novice, seed: 22, ok: true }), ev({ at: T0 + 5 * DAY, kc: 'KC-1.witness-class', seed: 23, ok: true })]
  assert.deepEqual(entryOf(C1, novice, ctx(close, draw(3))), { status: 'waiting' })
  // A miss after the third session keeps it from being solid until a fresh correct one.
  const missed = [s1, s2, ev({ at: T0 + 4 * DAY, kc: novice, seed: 30, ok: false }), ev({ at: T0 + 4 * DAY + 60_000, kc: novice, seed: 31, ok: true })]
  assert.equal(firstSolid(novice, sessionsOf(orderedEvents(logFrom(missed))), stubContent())?.event.seed, 31)
})

test('common rules: not a unit, credited at placement, first learned by test-out, or entering before the draw never enters', () => {
  const kc = 'KC-1.violation-as-sat'
  const practice = ev({ at: T0, family: 'GEN-negate-it', kc, seed: 1 })
  assert.deepEqual(entryOf(C3, 'KC-1.not-in-the-rules', ctx([practice], draw(1))), { status: 'never', reason: 'not-a-unit' })
  assert.deepEqual(entryOf(C2, kc, ctx([practice], draw(1))), { status: 'never', reason: 'not-a-unit' }, 'a KC listed by comparison 3 only')
  const placed = [ev({ at: T0 - DAY, ref: 'placement:step-4', kc, ok: true }), practice]
  assert.deepEqual(entryOf(C3, kc, ctx(placed, draw(1, T0 - 2 * DAY))), { status: 'never', reason: 'placement' })
  const unplaced = [ev({ at: T0 - DAY, ref: 'placement:step-4', kc, ok: false }), practice]
  assert.equal(entryOf(C3, kc, ctx(unplaced, draw(1, T0 - 2 * DAY))).status, 'entered', 'a missed placement item credits nothing')
  const testedOut = [ev({ at: T0 - DAY, ref: `testout:${kc}`, seed: 2, ok: true }), ev({ at: T0 + 9 * DAY, ref: `confirm:${kc}`, seed: 3, ok: true }), ev({ at: T0 + 10 * DAY, kc, exit: kc, seed: 4 }), practice]
  assert.deepEqual(entryOf(C3, kc, ctx(testedOut, draw(1, T0 - 2 * DAY))), { status: 'never', reason: 'test-out' })
  const lessonFirst = [ev({ at: T0 - DAY, kc, exit: kc, seed: 5 }), ev({ at: T0 + 9 * DAY, ref: `confirm:${kc}`, seed: 6, ok: true }), practice]
  assert.equal(entryOf(C3, kc, ctx(lessonFirst, draw(1, T0 - 2 * DAY))).status, 'entered', 'first learning by the lesson stays a unit')
  assert.deepEqual(entryOf(C3, kc, ctx([practice], draw(1, T0 + 1))), { status: 'never', reason: 'before-draw', at: practice.at })
  assert.equal(entryOf(C3, kc, ctx([practice], draw(1, T0))).status, 'entered', 'an entry at the draw instant is not before it')
  // A content that names the KCs a placement item credits governs instead of the primary KC.
  const named: KeepKillContent = { ...stubContent(), placementCredits: () => [] }
  assert.equal(entryOf(C3, kc, { ...ctx(placed, draw(1, T0 - 2 * DAY)), content: named }).status, 'entered')
})

test('property: entries never depend on the arm, never precede the draw and never admit an excluded KC', () => {
  const seen = new Map<string, number>()
  const units = [...new Set([C1, C2, C3].flatMap((c) => unitsOf(c).map((u) => u.unit)))]
  const families = ['GEN-negate-it', 'GEN-find-the-witness', 'GEN-call-it', 'GEN-proof-structure', 'GEN-cti-or-bug']
  for (const seed of SEEDS) {
    const r = rng(seed)
    const treatments: Record<string, 'expert' | 'novice'> = {}
    for (const u of units) if (r() < 0.2) treatments[u] = 'expert'
    const content = stubContent(treatments)
    const events: LedgerEvent[] = []
    const start = T0 - 20 * DAY
    for (let i = 0; i < 400; i++) {
      const kc = pick(r, units)
      const at = start + int(r, 0, 80) * DAY + int(r, 0, 12) * 3600_000 + int(r, 0, 59) * 60_000
      const kind = r() < 0.1 ? 'probe' : 'item'
      const ctxKind = r()
      const ref = kind === 'probe' ? undefined : ctxKind < 0.05 ? 'placement:step-1' : ctxKind < 0.08 ? `testout:${kc}` : ctxKind < 0.1 ? `confirm:${kc}` : ctxKind < 0.15 ? 'drawer:D-05/i1' : undefined
      events.push(
        ev({
          at,
          kc,
          ...(ref !== undefined ? { ref } : {}),
          kind,
          family: pick(r, families),
          template: int(r, 1, 3),
          ...(r() < 0.8 ? { seed: int(r, 0, 2 ** 31) } : {}),
          ...(r() < 0.9 ? { ok: r() < 0.7 } : {}),
          exposure: r() < 0.85 ? 'unseen' : 'seen',
          ...(r() < 0.1 ? { exit: kc } : {}),
        }),
      )
    }
    const drawnAt = start + int(r, 0, 40) * DAY
    const base = ctx(events, draw(1, drawnAt), content)
    for (const c of [C1, C2, C3]) {
      const reference = entriesOf(c, base)
      // The same log under other seeds, which allocate the units differently, gives the same entries.
      for (const other of [0, 2654435769, 4294967295, int(r, 0, 2 ** 31)]) {
        assert.deepEqual(entriesOf(c, { ...base, draw: draw(other, drawnAt) }), reference)
        assert.notDeepEqual(allocate(c, other).map((a) => a.unit), [], 'units are allocated')
      }
      for (const [unit, entry] of reference as Map<string, Entry>) {
        const label = entry.status === 'never' ? `never:${entry.reason}` : entry.status
        seen.set(label, (seen.get(label) ?? 0) + 1)
        if (entry.status === 'entered') assert.ok(compareAfter(entry.at, drawnAt), `${c.id} ${unit}`)
        if (entry.status === 'never' && entry.reason === 'before-draw') assert.ok(!compareAfter(entry.at as string, drawnAt))
        const placementCredit = events.some((e) => e.ref.startsWith('placement:') && e.ok === true && e.data?.kc === unit)
        if (placementCredit) assert.deepEqual(entry, { status: 'never', reason: 'placement' })
      }
    }
  }
  // The generated logs exercise every outcome of the rules, not only one.
  for (const label of ['entered', 'waiting', 'never:placement', 'never:test-out', 'never:before-draw']) assert.ok((seen.get(label) ?? 0) > 20, `${label}: ${seen.get(label) ?? 0}`)
})

/** True when an instant is at or after a clock reading. */
function compareAfter(at: string, ms: number): boolean {
  return Date.parse(at) >= ms
}
