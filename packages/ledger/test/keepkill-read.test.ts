// Each keep/kill read writes a learner-zero run record: the read refuses without a draw or under rules that
// hash to anything but the draw's value, uses only the events before it, leaves out units exposed under a
// superseded seed, counts deviations, applies the decision tables, and returns a run@1 record carrying the
// digest of the event set it used, identical for any copy of the same log, under an id unique to the read,
// with a reason for every field it leaves null.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RunRecord } from '@statespace/schema'
import { validate } from '@statespace/schema'
import type { LedgerEvent } from '../src/index.ts'
import { canonicalJson, compareInstants, eventSetDigest, LedgerError, logFrom, mergeLogs, orderedEvents, sha256Hex, stampTime } from '../src/index.ts'
import {
  allocate,
  armData,
  decideCommon,
  decideNote,
  firstWindowArm,
  KC_COMPARISON_LIST,
  kcComparison,
  READ_ID_DIGEST_HEX,
  readComparison,
  readRecordId,
  unitsOf,
  WINDOWS,
} from '../src/keepkill/index.ts'
import { draw, ev, stubContent } from './kk-helpers.ts'
import { RULES_SHA, rng, shuffled } from './helpers.ts'

/** The fields a record leaves null: its own, and its environment's written environment.<field>. */
function nullFields(record: RunRecord): string[] {
  const own = Object.entries(record).filter(([, v]) => v === null).map(([k]) => k)
  const env = Object.entries(record.environment).filter(([, v]) => v === null).map(([k]) => `environment.${k}`)
  return [...own, ...env]
}

/** Every null field has its reason in unrecorded, and unrecorded names no field that holds a value. */
function assertNullsExplained(record: RunRecord, label: string): void {
  const nulls = nullFields(record)
  const explained = (record.unrecorded ?? []).map((u) => u.field)
  for (const f of nulls) assert.ok(explained.includes(f), `${label}: ${f} is null with no reason in unrecorded`)
  for (const f of explained) assert.ok(nulls.includes(f), `${label}: unrecorded names ${f}, which holds a value`)
  assert.equal(new Set(explained).size, explained.length, `${label}: each field is explained once`)
}

/** The id's last digits are the SHA-256 of the record's canonical JSON with the id left out. */
function idDigestOf(record: RunRecord): string {
  const { id: _id, ...body } = record
  return sha256Hex(canonicalJson(body)).slice(0, READ_ID_DIGEST_HEX)
}

const DAY = 86_400_000
const T0 = Date.UTC(2026, 10, 2, 9, 0)
const SEED = 2654435769

/** Comparison 3's units each enter at a practice item and meet a fresh item 31 days later, correct as `correct(arm)` says. */
function comparison3Log(correct: (arm: string, i: number) => boolean): LedgerEvent[] {
  const c = kcComparison('witness-generalization')
  const events: LedgerEvent[] = []
  allocate(c, SEED).forEach((a, i) => {
    const t = T0 + (i % 7) * 3600_000
    events.push(ev({ at: t, family: 'GEN-negate-it', kc: a.unit, seed: 1000 + i, ok: true, ms: a.arm === 'class-named' ? 40_000 : 60_000, data: armData({ comparison: c.id, arm: a.arm, expSeed: SEED }) }))
    events.push(ev({ at: t + 31 * DAY, kind: 'probe', family: 'GEN-negate-it', kc: a.unit, seed: 5000 + i, ok: correct(a.arm, i) }))
  })
  return events
}

test('a read refuses without a draw, and under rules that hash to anything but the value the draw recorded', () => {
  const events = comparison3Log(() => true)
  const at = stampTime(T0 + 60 * DAY, 60).at
  assert.throws(() => readComparison({ comparison: 'witness-generalization', phase: 'final', at, log: logFrom(events), content: stubContent() }), (e: unknown) => e instanceof LedgerError && e.code === 'refused')
  const amended = { ...draw(SEED), rulesSha256: '0'.repeat(64) }
  assert.throws(() => readComparison({ comparison: 'witness-generalization', phase: 'final', at, log: logFrom(events, [amended]), content: stubContent() }), /hash to/)
  assert.throws(() => readComparison({ comparison: 'no-such-comparison', phase: 'final', at, log: logFrom(events, [draw(SEED)]), content: stubContent() }), LedgerError)
})

test('comparison 3: outcomes, figures and the common decision, with a valid run@1 record', () => {
  const events = comparison3Log((arm, i) => (arm === 'contrast-then-class' ? i % 21 !== 0 : i % 3 !== 0))
  const at = stampTime(T0 + 60 * DAY, 60).at
  const { result, record } = readComparison({ comparison: 'witness-generalization', phase: 'final', at, log: logFrom(events, [draw(SEED)]), content: stubContent(), recordedAt: at })
  const [def, alt] = result.arms
  assert.equal(def?.arm, 'class-named')
  assert.equal(alt?.arm, 'contrast-then-class')
  assert.equal((def?.entered ?? 0) + (alt?.entered ?? 0), 42)
  assert.equal(def?.withOutcome, 21)
  assert.equal(alt?.withOutcome, 21)
  assert.equal(def?.missing, 0)
  assert.equal(def?.medianMs, 40_000)
  assert.equal(alt?.medianMs, 60_000)
  assert.equal(def?.deviations, 0)
  const expected = decideCommon({ xb: alt?.correct ?? 0, nb: 21, xa: def?.correct ?? 0, na: 21, phase: 'final', cheaperAlternative: false })
  assert.equal(result.decision, expected.decision)
  assert.equal(result.rule, expected.rule)
  assert.deepEqual(result.interval, expected.interval)
  assert.equal(result.estimate, 'contrast-then-class minus class-named')
  // The record.
  assert.deepEqual(validate('run', record), { ok: true })
  assert.match(record.id, /^RUN-lz-keepkill-witness-generalization-final-20270101-100000-[0-9a-f]{8}$/)
  assert.equal(record.id.slice(-READ_ID_DIGEST_HEX), idDigestOf(record))
  assert.equal(readRecordId(result, record), record.id)
  assert.equal(record.engine, 'statespace-ledger')
  assert.equal(record.inputs[0]?.sha256, eventSetDigest(events).replace('sha256:', ''))
  assert.equal(record.inputs[1]?.path, 'content/governance/keepkill-rules.yaml')
  assert.equal(record.inputs[1]?.sha256, RULES_SHA)
  assert.ok(record.verdict_lines.includes('one learner; descriptive; no causal claim'))
  assert.ok(record.verdict_lines.some((l) => l.startsWith('decision: ')))
  assert.equal(record.values?.expSeed, SEED)
  assert.deepEqual(nullFields(record), ['binary', 'binary_sha256', 'image', 'duration_s', 'exit_code', 'environment.os', 'environment.cpu_count'])
  assertNullsExplained(record, 'comparison 3')
})

test('two reads of one comparison and phase on one local day get different ids, and so do two reads at one instant over different event sets', () => {
  const events = comparison3Log((arm, i) => i % 2 === 0 || arm === 'class-named')
  const extra = ev({ at: Date.UTC(2026, 11, 12, 10, 0), kind: 'probe', family: 'GEN-negate-it', kc: 'KC-1.only-if-direction', seed: 4242, ok: false }) // 11:00 at +01:00
  const read = (at: string, list: LedgerEvent[]) =>
    readComparison({ comparison: 'witness-generalization', phase: 'interim', at, log: logFrom(list, [draw(SEED)]), content: stubContent() })
  const morning = read('2026-12-12T10:00:00.000+01:00', events)
  const afternoon = read('2026-12-12T13:00:00.000+01:00', [...events, extra])
  assert.notEqual(morning.result.eventDigest, afternoon.result.eventDigest, 'the afternoon read used one more event')
  assert.match(morning.record.id, /^RUN-lz-keepkill-witness-generalization-interim-20261212-100000-[0-9a-f]{8}$/)
  assert.match(afternoon.record.id, /^RUN-lz-keepkill-witness-generalization-interim-20261212-130000-[0-9a-f]{8}$/)
  // At one instant, the event sets alone tell the reads apart.
  const without = read('2026-12-12T13:00:00.000+01:00', events)
  assert.notEqual(without.record.id, afternoon.record.id)
  assert.equal(without.record.id.slice(0, -READ_ID_DIGEST_HEX), afternoon.record.id.slice(0, -READ_ID_DIGEST_HEX))
  // So does the content build the caller names, and the time the record was written.
  const named = readComparison({ comparison: 'witness-generalization', phase: 'interim', at: '2026-12-12T13:00:00.000+01:00', log: logFrom(events, [draw(SEED)]), content: stubContent(), contentBuild: { name: 'content build', sha256: 'ab'.repeat(32) } })
  const later = readComparison({ comparison: 'witness-generalization', phase: 'interim', at: '2026-12-12T13:00:00.000+01:00', log: logFrom(events, [draw(SEED)]), content: stubContent(), recordedAt: '2026-12-12T13:05:00.000+01:00' })
  const all = [morning, afternoon, without, named, later].map((o) => o.record)
  assert.equal(new Set(all.map((r) => r.id)).size, all.length, 'five different reads, five ids')
  for (const r of all) {
    assert.deepEqual(validate('run', r), { ok: true })
    assert.equal(r.id.slice(-READ_ID_DIGEST_HEX), idDigestOf(r))
  }
  // The same read, derived again, gets the same id.
  assert.equal(read('2026-12-12T13:00:00.000+01:00', [...events, extra]).record.id, afternoon.record.id)
})

test('every null field of a read record, the environment included, has its reason in unrecorded, for each of the four comparisons', () => {
  const events = comparison3Log(() => true)
  const at = stampTime(T0 + 60 * DAY, 60).at
  const comparisons = [...KC_COMPARISON_LIST.map((c) => c.id), WINDOWS.id]
  assert.equal(comparisons.length, 4)
  for (const comparison of comparisons) {
    for (const phase of ['interim', 'final'] as const) {
      const { record } = readComparison({ comparison, phase, at, log: logFrom(events, [draw(SEED)]), content: stubContent() })
      assert.deepEqual(validate('run', record), { ok: true })
      assert.ok(nullFields(record).includes('environment.os') && nullFields(record).includes('environment.cpu_count'))
      assertNullsExplained(record, `${comparison}, ${phase}`)
    }
  }
})

test('the same log gives the identical record, from any copy or merge of it; later events change nothing before the read', () => {
  const events = comparison3Log((arm, i) => i % 2 === 0 || arm === 'class-named')
  const at = stampTime(T0 + 45 * DAY, 60).at
  const input = { comparison: 'witness-generalization', phase: 'interim' as const, at, content: stubContent(), recordedAt: at }
  const a = readComparison({ ...input, log: logFrom(events, [draw(SEED)]) }).record
  const r = rng(4)
  const half = Math.floor(events.length / 2)
  const copy = mergeLogs(logFrom(shuffled(r, events).slice(0, half), [draw(SEED)]), logFrom(shuffled(r, events)))
  const b = readComparison({ ...input, log: copy }).record
  assert.equal(canonicalJson(a), canonicalJson(b))
  const later = ev({ at: T0 + 50 * DAY, kind: 'probe', family: 'GEN-negate-it', kc: 'KC-1.only-if-direction', seed: 99, ok: false })
  const c = readComparison({ ...input, log: logFrom([...events, later], [draw(SEED)]) }).record
  assert.equal(canonicalJson(a), canonicalJson(c))
  // An event at the read's own instant does not precede it, so it is not counted either.
  const same = ev({ at: T0 + 45 * DAY, kind: 'probe', family: 'GEN-negate-it', kc: 'KC-1.only-if-direction', seed: 98, ok: false })
  assert.equal(same.at, at)
  assert.equal(canonicalJson(readComparison({ ...input, log: logFrom([...events, same], [draw(SEED)]) }).record), canonicalJson(a))
  const used = orderedEvents(logFrom(events)).filter((e) => compareInstants(e.at, at) < 0)
  assert.equal(a.values?.eventCount, used.length)
})

test('units exposed under a superseded seed are left out and counted as deviations, as is an item shown with the other arm', () => {
  const c = kcComparison('witness-generalization')
  const events = comparison3Log(() => true)
  const units = allocate(c, SEED)
  const supersededUnit = units[0]?.unit as string
  const wrongArmUnit = units[1]?.unit as string
  const otherArm = units[1]?.arm === 'class-named' ? 'contrast-then-class' : 'class-named'
  events.push(ev({ at: T0 + 2 * DAY, family: 'GEN-negate-it', kc: supersededUnit, seed: 77, ok: true, data: armData({ comparison: c.id, arm: 'class-named', expSeed: 12345 }) }))
  events.push(ev({ at: T0 + 2 * DAY, family: 'GEN-negate-it', kc: wrongArmUnit, seed: 78, ok: true, data: armData({ comparison: c.id, arm: otherArm, expSeed: SEED }) }))
  events.push(ev({ at: T0 + 2 * DAY, family: 'GEN-negate-it', kc: wrongArmUnit, seed: 79, ok: true, data: armData({ comparison: c.id, arm: units[1]?.arm as string, expSeed: SEED, fallback: 'no second witness of the class' }) }))
  const later = { expSeed: 12345, drawnAt: stampTime(T0 - DAY, 60).at, rulesSha256: RULES_SHA, dev: 'dev-b' }
  const { result } = readComparison({ comparison: c.id, phase: 'final', at: stampTime(T0 + 60 * DAY, 60).at, log: logFrom(events, [draw(SEED), later]), content: stubContent() })
  const row = result.units?.find((u) => u.unit === supersededUnit)
  assert.equal(row?.excluded, 'superseded-seed')
  assert.equal(row?.outcome, undefined)
  assert.deepEqual(result.supersededSeeds, [12345])
  assert.equal(result.units?.find((u) => u.unit === wrongArmUnit)?.deviations, 2)
  assert.equal(result.arms.reduce((s, a) => s + a.entered, 0), 41)
})

test('comparison 1: the shipped default per treatment, outcomes from entry, and the either-direction decision', () => {
  const c = kcComparison('misconception-note')
  const treatments: Record<string, 'expert'> = {}
  for (const { unit } of unitsOf(c)) treatments[unit] = 'expert'
  const content = stubContent(treatments)
  const events: LedgerEvent[] = []
  allocate(c, SEED).forEach((a, i) => {
    const t = T0 + (i % 5) * 3600_000
    events.push(ev({ at: t, kc: a.unit, exit: a.unit, seed: 100 + i, ok: true }))
    events.push(ev({ at: t + 29 * DAY, kind: 'probe', kc: a.unit, seed: 200 + i, ok: false })) // too early to be the outcome
    events.push(ev({ at: t + 31 * DAY, kind: 'probe', kc: a.unit, seed: 300 + i, ok: a.arm === 'open' || i % 4 === 0 }))
  })
  const { result, record } = readComparison({ comparison: c.id, phase: 'final', at: stampTime(T0 + 70 * DAY, 60).at, log: logFrom(events, [draw(SEED)]), content })
  const [open, collapsed] = result.arms
  assert.equal((open?.withOutcome ?? 0) + (collapsed?.withOutcome ?? 0), 105)
  assert.equal(open?.accuracy, 1)
  const expected = decideNote({ xo: open?.correct ?? 0, no: open?.withOutcome ?? 0, xc: collapsed?.correct ?? 0, nc: collapsed?.withOutcome ?? 0, phase: 'final' })
  assert.equal(result.decision, expected.decision)
  assert.deepEqual(result.withdrawn, expected.withdrawn)
  assert.ok(result.units?.every((u) => u.defaultArm === 'collapsed'), 'expert KCs ship collapsed')
  assert.deepEqual(validate('run', record), { ok: true })
})

test('comparison 4: windows of 12 counted weeks, window 1 from expSeed, breaks pause, and a valid record', () => {
  const events: LedgerEvent[] = []
  // A graded event on most days of 40 weeks, with a declared break of two weeks in week 5.
  for (let d = 0; d < 280; d++) if (d % 7 !== 6 || d % 3 === 0) events.push(ev({ at: T0 + d * DAY, kc: 'KC-1.witness-class', seed: 9000 + d, ok: d % 5 !== 0, ms: 1000 }))
  const breaks = [{ from: '2026-11-30', to: '2026-12-13' }]
  const { result, record } = readComparison({ comparison: WINDOWS.id, phase: 'final', at: stampTime(T0 + 281 * DAY, 60).at, log: logFrom(events, [draw(SEED)]), content: stubContent(), breaks })
  const windows = result.windows ?? []
  assert.equal(windows.length, 4)
  assert.equal(windows[0]?.arm, firstWindowArm(WINDOWS, SEED).arm)
  assert.notEqual(windows[1]?.arm, windows[0]?.arm)
  assert.equal(windows[0]?.weeks.length, 12)
  assert.ok(!(windows[0]?.weeks ?? []).includes('2026-11-30') && !(windows[0]?.weeks ?? []).includes('2026-12-07'), 'the two weeks of the break are not counted')
  assert.deepEqual(windows.map((w) => w.complete), [true, true, true, false])
  assert.deepEqual(windows.slice(0, 3).map((w) => w.weeksWithWork), [12, 12, 12])
  assert.equal(windows[0]?.entersAt, events[0]?.at)
  assert.equal(result.decision, 'not enough data', 'one complete window in one arm, two in the other: below the minimum')
  assert.deepEqual(validate('run', record), { ok: true })
  assert.match(record.id, /^RUN-lz-keepkill-reserve-weeks-final-20270810-100000-[0-9a-f]{8}$/)
  assert.equal(record.id.slice(-READ_ID_DIGEST_HEX), idDigestOf(record))
  assertNullsExplained(record, 'comparison 4')
})
