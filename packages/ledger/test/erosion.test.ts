// The erosion firing rule (spine section 5.4) over the course's own seam table: both endpoints fire an erosion on the
// default path and on the builder's path; the forecast cracks the seam; the oldest open erodible seam comes first;
// held seams never crack or block; the Clearinghouse erosion waits until its seam is the oldest open one.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import type { ErosionSpec, LedgerEvent, SeamSpec } from '../src/index.ts'
import { forecastRef, readErosions, stampTime } from '../src/index.ts'
import { ROOT } from './helpers.ts'

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/assurance/seams.json'), 'utf8')) as { seams: SeamSpec[]; erosions: ErosionSpec[] }

let n = 0
/** A call on a lesson's first cell, `day` days after a fixed start. */
function on(page: string, day: number): LedgerEvent {
  const { at, day: d } = stampTime(Date.UTC(2026, 10, 1) + day * 86_400_000, 0)
  return { id: `e${++n}`, v: 1, kind: 'call', ref: `call:${page}/c1`, provenance: 'own', exposure: 'unseen', at, tz: 0, day: d, dev: 'dev-a', conf: 'think', ok: true }
}

function forecast(er: string, day: number, segment: string, ok: boolean): LedgerEvent {
  const { at, day: d } = stampTime(Date.UTC(2026, 10, 1) + day * 86_400_000, 0)
  return { id: `f${++n}`, v: 1, kind: 'call', ref: forecastRef(er), provenance: 'own', exposure: 'unseen', at, tz: 0, day: d, dev: 'dev-a', conf: 'sure', ok, resp: { segment } }
}

const pageOf = (e: LedgerEvent): string | undefined => /^call:(S[0-9]+\.L[0-9]+)\//.exec(e.ref)?.[1]
const read = (events: LedgerEvent[]) => readErosions(data.seams, data.erosions, events, pageOf)
const state = (events: LedgerEvent[], id: string) => read(events).erosions.find((e) => e.id === id)

test('the table: 12 erosions, 15 seams, 3 held', () => {
  assert.equal(data.erosions.length, 12)
  assert.equal(data.seams.length, 15)
  assert.deepEqual(data.seams.filter((s) => s.fate === 'held').map((s) => s.id), ['SEAM-13', 'SEAM-14', 'SEAM-15'])
})

test('an erosion fires only when both endpoints exist', () => {
  assert.equal(state([], 'ER-2')?.status, 'dormant')
  assert.equal(state([on('S2.L7', 0)], 'ER-2')?.status, 'dormant')
  assert.equal(state([on('S5.L3', 0)], 'ER-2')?.status, 'dormant')
  const both = state([on('S2.L7', 0), on('S5.L3', 3)], 'ER-2')
  assert.equal(both?.status, 'fired')
  assert.equal(both?.builders, false)
})

test("the builder's path: the specimen first, then the planting, fires with builders set", () => {
  const s = state([on('S5.L3', 0), on('S2.L7', 4)], 'ER-2')
  assert.equal(s?.status, 'fired')
  assert.equal(s?.builders, true)
})

test('a Call It response reads as its segment', () => {
  const f = forecast('ER-2', 4, 'x', true)
  const r = read([on('S2.L7', 0), on('S5.L3', 3), { ...f, resp: { picked: 'B' } }])
  assert.equal(r.erosions.find((e) => e.id === 'ER-2')?.forecast?.segment, 'correspondence')
})

test('the forecast cracks the seam and closes it', () => {
  const r = read([on('S2.L7', 0), on('S5.L3', 3), forecast('ER-2', 4, 'correspondence', true)])
  assert.equal(r.erosions.find((e) => e.id === 'ER-2')?.status, 'cracked')
  const seam = r.seams.find((s) => s.id === 'SEAM-2')
  assert.equal(seam?.crackedBy, 'ER-2')
  assert.equal(seam?.open, false)
  assert.equal(r.next, undefined)
})

test('the next erosion is the fired one on the oldest open seam, ties by seam number', () => {
  // SEAM-1 and SEAM-7 are planted on the same day (S1.L3); SEAM-2 later
  const events = [on('S1.L3', 0), on('S2.L7', 1), on('S5.L3', 5), on('S4.L9', 6), on('S6.L4', 7)]
  const r = read(events)
  assert.equal(r.oldestOpen, 'SEAM-1')
  assert.equal(r.next?.id, 'ER-1')
  const after = read([...events, forecast('ER-1', 8, 'correspondence', true)])
  assert.equal(after.oldestOpen, 'SEAM-7')
  assert.equal(after.next?.id, 'ER-7')
})

test('held seams never crack and never count as the oldest open seam', () => {
  const r = read([on('S2.L9', 0), on('S3.L9', 0), on('S6.L6', 0), on('S2.L7', 1)])
  for (const id of ['SEAM-13', 'SEAM-14', 'SEAM-15']) assert.equal(r.seams.find((s) => s.id === id)?.open, false)
  assert.equal(r.oldestOpen, 'SEAM-2')
})

test('the Clearinghouse erosion waits until its seam is the oldest open one, after S9', () => {
  const base = [on('S8.L7', 0), on('S9.L1', 2)]
  assert.equal(state(base, 'ER-12')?.status, 'fired')
  // an older open seam (SEAM-1, planted first) holds the Clearinghouse back
  assert.equal(state([on('S1.L3', -5), ...base], 'ER-12')?.status, 'dormant')
  // without S9 it never fires
  assert.equal(state([on('S8.L7', 0)], 'ER-12')?.status, 'dormant')
})

test('every shipped erosion fires on the default path and on a builder-style reversed path', () => {
  const lessons = data.erosions.flatMap((er) => {
    const seam = data.seams.find((s) => s.id === er.seam)
    return [...(seam?.plantedIn ?? []), ...(er.cashedIn !== null ? [er.cashedIn] : [`${er.clearinghouseAfter}.L1`])]
  })
  // default: course order; answer each forecast as it comes, as Today would
  const order = (ids: string[]) => [...new Set(ids)].sort((a, b) => {
    const [sa, la] = a.slice(1).split('.L').map(Number) as [number, number]
    const [sb, lb] = b.slice(1).split('.L').map(Number) as [number, number]
    return sa - sb || la - lb
  })
  for (const path of [order(lessons), order(lessons).reverse()]) {
    const events: LedgerEvent[] = path.map((p, i) => on(p, i))
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const next = read(events).next
      if (next === undefined) break
      seen.add(next.id)
      events.push(forecast(next.id, 100 + i, 'correspondence', false))
    }
    assert.deepEqual([...seen].sort(), data.erosions.map((e) => e.id).sort(), `path starting ${path[0]}`)
  }
})
