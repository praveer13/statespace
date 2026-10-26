import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { LedgerEvent } from '@statespace/ledger'
import { defenceRef, deriveDefence, parseDefenceRef, retakeOpen, sessionsOf } from '../src/signoff/index.ts'
import { event } from './mirror-helpers.ts'

const KC = 'KC-1.violation-as-sat'

/** The instant on `day` (2026-11-dd) at hh:mm UTC. */
const at = (day: number, h = 9, m = 0): string => `2026-11-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`

let seed = 1000
const probe = (attempt: number, i: number, ok: boolean, when: string, size = 10): LedgerEvent =>
  event({ kind: 'probe', ref: defenceRef('S1', 'A', attempt, i), seed: seed++, ok, conf: 'think', at: when, data: { size, kc: KC } })
const predict = (attempt: number, id: string, verdict: string, when: string, size = 4): LedgerEvent =>
  event({ kind: 'prove-it', ref: defenceRef('S1', 'B', attempt, id), seed: seed++, resp: { verdict }, at: when, data: { size } })
const audit = (attempt: number, i: number, ok: boolean, truth: 'sound' | 'flawed', when: string): LedgerEvent =>
  event({ kind: 'audit', ref: defenceRef('S1', 'C', attempt, i), seed: seed++, ok, at: when, data: { size: 4, truth } })
const outcomes = (when: string, mutants: Array<{ id: string; verdict: string }>): LedgerEvent =>
  event({ kind: 'receipt-import', ref: `receipt-import:${'a'.repeat(64)}`, provenance: 'own', exposure: 'unseen', at: when, data: { defend: { stage: 'S1', mutants } } })
const explain = (when: string): LedgerEvent => event({ kind: 'explain-back', ref: 'explain-back:S1', at: when, resp: { ideas: [true, true, false] } })

const MUTANTS = ['m1', 'm2', 'm3', 'm4'].map((id) => ({ id, verdict: 'passes' }))

/** Part A on day 2 (9 of `aRight`), Parts B to D on day 3. */
function sitting(aRight: number, bRight: number): LedgerEvent[] {
  const a = Array.from({ length: 10 }, (_, i) => probe(1, i + 1, i < aRight, at(2, 9, i * 2)))
  const b = MUTANTS.map((m, i) => predict(1, m.id, i < bRight ? 'passes' : 'no-build', at(3, 9, i)))
  const c = [audit(1, 1, true, 'sound', at(3, 9, 10)), audit(1, 2, true, 'flawed', at(3, 9, 12)), audit(1, 3, true, 'flawed', at(3, 9, 14)), audit(1, 4, false, 'flawed', at(3, 9, 16))]
  return [...a, ...b, outcomes(at(3, 9, 20), MUTANTS), ...c, explain(at(3, 9, 25))]
}

describe('refs (event@1 grammar)', () => {
  test('round trip', () => {
    assert.deepEqual(parseDefenceRef({ kind: 'probe', ref: 'probe:S1/A/2/7' }), { stage: 'S1', part: 'A', attempt: 2, index: '7' })
    assert.deepEqual(parseDefenceRef({ kind: 'prove-it', ref: 'prove-it:S2/B/1/drop-gen' }), { stage: 'S2', part: 'B', attempt: 1, index: 'drop-gen' })
    assert.deepEqual(parseDefenceRef({ kind: 'explain-back', ref: 'explain-back:S3' }), { stage: 'S3', part: 'D', attempt: 0, index: '' })
    assert.equal(parseDefenceRef({ kind: 'audit', ref: 'audit:AUD-1.1/a' }), undefined)
  })
})

describe('the worked results of ASSESSMENT.md section 6.3', () => {
  test('case 1: 9/10, 3/4, 3/4 passes at 15/18', () => {
    const v = deriveDefence('S1', sitting(9, 3), { kcs: [] })
    assert.equal(v.parts.A.latest?.correct, 9)
    assert.equal(v.parts.B.latest?.correct, 3)
    assert.equal(v.parts.C.latest?.correct, 3)
    assert.equal(v.overall?.hits, 15)
    assert.equal(v.overall?.n, 18)
    assert.equal(v.sessions, 2)
    assert.equal(v.passed, true)
    assert.equal(v.signedOff, true, 'no KCs given, so relearning is vacuous')
    assert.ok(Math.abs((v.overall?.low ?? 0) - 0.61) < 0.01)
  })

  test('case 2: B at 2/4 fails, alone; it reopens three days later', () => {
    const events = sitting(7, 2)
    const v = deriveDefence('S1', events, { kcs: [] })
    assert.deepEqual(v.failedParts, ['B'])
    assert.equal(v.passed, false)
    assert.equal(retakeOpen(v, 'B', '2026-11-05'), false)
    assert.equal(retakeOpen(v, 'B', '2026-11-06'), true)
    assert.equal(retakeOpen(v, 'A', '2026-11-06'), false, 'a passed part is not retaken')
    // the retake: attempt 2 of Part B, four of four
    const retake = [...MUTANTS.map((m, i) => predict(2, m.id, 'passes', at(6, 9, i))), outcomes(at(6, 9, 10), MUTANTS)]
    const w = deriveDefence('S1', [...events, ...retake], { kcs: [] })
    assert.equal(w.parts.B.latest?.attempt, 2)
    assert.equal(w.overall?.hits, 14)
    assert.equal(w.passed, true)
  })

  test('an unrun Part B is pending, never a miss', () => {
    const events = sitting(9, 3).filter((e) => e.kind !== 'receipt-import')
    const v = deriveDefence('S1', events, { kcs: [] })
    assert.equal(v.parts.B.latest?.pending, 4)
    assert.equal(v.parts.B.latest?.complete, false)
    assert.equal(v.passed, false)
  })

  test('one session is not enough, and Part D is required', () => {
    const one = sitting(9, 3).map((e) => ({ ...e, at: e.at.replace('2026-11-02', '2026-11-03'), day: e.day.replace('2026-11-02', '2026-11-03') }))
    const v = deriveDefence('S1', one, { kcs: [] })
    assert.equal(v.sessions, 1)
    assert.equal(v.passed, false)
    const noD = sitting(9, 3).filter((e) => e.kind !== 'explain-back')
    assert.equal(deriveDefence('S1', noD, { kcs: [] }).passed, false)
  })
})

describe('relearning and sign-off', () => {
  test('three spaced counted sessions relearn a KC; sign-off waits for them', () => {
    const base = sitting(9, 3)
    const v = deriveDefence('S1', base, { kcs: [KC] })
    assert.equal(v.passed, true)
    assert.equal(v.signedOff, false, 'Part A on one day counts one session')
    const item = (when: string): LedgerEvent => event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: seed++, ok: true, at: when, data: { kc: KC } })
    const later = [item(at(5)), item(at(8))]
    const w = deriveDefence('S1', [...base, ...later], { kcs: [KC] })
    assert.deepEqual(w.kcs[0]?.spacedDays, ['2026-11-02', '2026-11-05', '2026-11-08'])
    assert.equal(w.signedOff, true)
    assert.equal(w.signOffAt, at(8))
  })

  test('sessions break at 30 minutes', () => {
    const s = sessionsOf([probe(1, 1, true, at(2, 9, 0)), probe(1, 2, true, at(2, 9, 29)), probe(1, 3, true, at(2, 10, 0))])
    assert.deepEqual([...s.values()], [0, 0, 1])
  })
})
