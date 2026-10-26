// The cabinet as a screen shows it: the specimens a learner holds, a drawer for every stage, the chips' counts, the
// filters and the schedule, over a learner whose log is built here.

import assert from 'node:assert/strict'
import test from 'node:test'
import { NO_FILTERS, STATUS_FILTERS, buildView, compareIds, stageOf } from '../model/cabinet.ts'
import { call, refind } from './helpers.mjs'
import { entryOf, loadCabinet } from './helpers.mjs'

const cabinet = loadCabinet()

/** A learner who has run Boot and S1.L1 on 2 November, S1.L2 on the 3rd, S1.L5 on the 4th, and kept SP-1.1 on the 10th. */
const LEARNER = [
  call('S1.L0', '2026-11-02T08:10:00Z'),
  call('S1.L1', '2026-11-02T08:50:00Z'),
  call('S1.L2', '2026-11-03T08:00:00Z'),
  call('S1.L5', '2026-11-04T08:00:00Z'),
  refind('SP-1.1', '2026-11-10T08:00:00Z'),
]
const idsOf = (view) => view.drawers.flatMap((d) => d.rows.map((r) => r.entry.record.id))

test('a learner who has met nothing sees every stage\'s drawer, empty, and nothing else', () => {
  const view = buildView(cabinet, [], '2026-11-09')
  assert.equal(view.drawers.length, 10)
  assert.deepEqual(view.drawers.map((d) => d.stage.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
  assert.ok(view.drawers.every((d) => d.rows.length === 0))
  assert.equal(view.empty, 'none-met')
  assert.deepEqual(view.counts, { all: 0, mounted: 0, kept: 0, incidents: 0 })
  assert.deepEqual(view.schedule, [])
  assert.deepEqual([view.stageOptions, view.kcOptions, view.held, view.anyDraft], [[], [], 0, false])
  assert.equal(view.drawers[0].stage.title, 'Counterexample (Z3Py)')
})

test('a specimen is listed once the learner has run a cell of the lesson that mounts it, and not before', () => {
  const view = buildView(cabinet, LEARNER, '2026-11-12')
  // Boot and S1.L1 mount SP-1.1; S1.L2 mounts SP-1.7 and SP-1.8; S1.L5 mounts SP-1.4, SP-1.5, SP-1.9 and SP-1.10
  assert.deepEqual(idsOf(view), ['SP-1.1', 'SP-1.4', 'SP-1.5', 'SP-1.7', 'SP-1.8', 'SP-1.9', 'SP-1.10'])
  // SP-1.2 and SP-1.3 (S1.L4) and SP-1.6 (S1.L3) have not been met, and are not listed, not even as a name
  for (const id of ['SP-1.2', 'SP-1.3', 'SP-1.6']) assert.ok(!idsOf(view).includes(id), id)
  assert.equal(view.empty, null)
  assert.equal(view.held, 7)
  assert.ok(view.drawers.slice(1).every((d) => d.rows.length === 0), 'the other nine stages keep their drawers, empty')
  // a drawer counts what the learner holds in its stage, which the filters never change: it tells "none yet" from "none match"
  assert.deepEqual(view.drawers.map((d) => d.held), [7, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const hidden = buildView(cabinet, LEARNER, '2026-11-12', { show: 'all', stage: null, kc: 'KC-1.unknown-fails-closed' })
  assert.deepEqual(hidden.drawers.map((d) => [d.rows.length, d.held]).slice(0, 2), [[2, 7], [0, 0]])
  const kept = buildView(cabinet, LEARNER, '2026-11-12', { show: 'kept', stage: null, kc: null })
  assert.deepEqual(kept.drawers.map((d) => [d.rows.length, d.held]).slice(0, 2), [[1, 7], [0, 0]])
  const none = buildView(cabinet, LEARNER.slice(0, 2), '2026-11-12', { show: 'kept', stage: null, kc: null })
  assert.deepEqual(none.drawers.map((d) => [d.rows.length, d.held]).slice(0, 2), [[0, 1], [0, 0]], 'a stage whose one specimen the Kept chip hides')
})

test('the numbers of an ID order it: SP-1.2 comes before SP-1.10', () => {
  assert.ok(compareIds('SP-1.2', 'SP-1.10') < 0)
  assert.ok(compareIds('SP-2.1', 'SP-1.10') > 0)
  assert.equal(compareIds('SP-1.1', 'SP-1.1'), 0)
  assert.deepEqual(['SP-1.10', 'SP-1.2', 'SP-1.1', 'SP-10.1', 'SP-2.1'].sort(compareIds), ['SP-1.1', 'SP-1.2', 'SP-1.10', 'SP-2.1', 'SP-10.1'])
})

test('the chips count mounted, kept and dated incidents, and each filter shows what its chip counts', () => {
  const view = buildView(cabinet, LEARNER, '2026-11-12')
  assert.deepEqual(view.counts, { all: 7, mounted: 6, kept: 1, incidents: 2 })
  const by = (show) => idsOf(buildView(cabinet, LEARNER, '2026-11-12', { ...NO_FILTERS, show }))
  assert.deepEqual(by('kept'), ['SP-1.1'])
  assert.deepEqual(by('mounted'), ['SP-1.4', 'SP-1.5', 'SP-1.7', 'SP-1.8', 'SP-1.9', 'SP-1.10'])
  assert.deepEqual(by('incidents'), ['SP-1.9', 'SP-1.10'])
  assert.equal(by('all').length, 7)
  assert.deepEqual(STATUS_FILTERS, ['all', 'mounted', 'kept', 'incidents'])
  for (const show of STATUS_FILTERS) assert.equal(by(show).length, view.counts[show], show)
})

test('a stage and a KC narrow the list, and the counts follow them', () => {
  const stage = buildView(cabinet, LEARNER, '2026-11-12', { show: 'all', stage: 'S2', kc: null })
  assert.deepEqual(idsOf(stage), [])
  assert.equal(stage.empty, 'no-match')
  assert.deepEqual(stage.drawers.map((d) => d.stage.id), ['S2'])
  const kc = buildView(cabinet, LEARNER, '2026-11-12', { show: 'all', stage: null, kc: 'KC-1.unknown-fails-closed' })
  assert.deepEqual(idsOf(kc), ['SP-1.7', 'SP-1.8'])
  assert.deepEqual(kc.counts, { all: 2, mounted: 2, kept: 0, incidents: 0 })
  // the options are the stages and KCs of what the learner holds
  const all = buildView(cabinet, LEARNER, '2026-11-12')
  assert.deepEqual(all.stageOptions.map((s) => s.id), ['S1'])
  assert.ok(all.kcOptions.some((k) => k.id === 'KC-1.encoding-is-the-claim'))
  assert.ok(!all.kcOptions.some((k) => k.id === 'KC-1.two-state-property'), 'a KC taught only by specimens the learner has not met is no option')
  // a filter that hides everything is told apart from nothing mounted
  const none = buildView(cabinet, LEARNER, '2026-11-12', { show: 'kept', stage: null, kc: 'KC-1.encoding-is-the-claim' })
  assert.equal(none.empty, 'no-match')
})

test('the schedule lists the mounted specimens with the day a re-find keeps them, and today decides only ready', () => {
  const early = buildView(cabinet, LEARNER, '2026-11-07')
  assert.deepEqual(early.schedule.map((s) => [s.specimen, s.from, s.ready]), [['SP-1.7', '2026-11-10', false], ['SP-1.8', '2026-11-10', false], ['SP-1.4', '2026-11-11', false], ['SP-1.5', '2026-11-11', false], ['SP-1.9', '2026-11-11', false], ['SP-1.10', '2026-11-11', false]].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || compareIds(a[0], b[0])))
  const late = buildView(cabinet, LEARNER, '2026-11-30')
  assert.ok(late.schedule.every((s) => s.ready))
  assert.ok(!late.schedule.some((s) => s.specimen === 'SP-1.1'), 'a kept specimen has no re-find to do')
})

test('the titles the schedule links to are those of everything held, whatever the filters hide', () => {
  const view = buildView(cabinet, LEARNER, '2026-11-12', { show: 'kept', stage: null, kc: null })
  assert.deepEqual(idsOf(view), ['SP-1.1'])
  assert.equal(view.titles.size, 7)
  for (const s of view.schedule) assert.ok(view.titles.has(s.specimen), s.specimen)
  assert.equal(view.titles.get('SP-1.9'), 'Bitcoin CVE-2010-5139, values that overflowed when summed')
  assert.ok(!view.titles.has('SP-1.2'), 'a specimen not met has no title to give away')
})

test('a row carries its label, its state and its stage, and the draft banner follows the specimens listed', () => {
  const view = buildView(cabinet, LEARNER, '2026-11-12')
  const row = view.drawers[0].rows[0]
  assert.equal(row.entry.record.id, 'SP-1.1')
  assert.equal(row.state.status, 'kept')
  assert.equal(row.state.keptDay, '2026-11-10')
  assert.equal(row.label.id, 'SP-1.1')
  assert.equal(row.stage, 'S1')
  assert.ok(view.anyDraft)
  // every S1 record is a draft until the owner and learner-zero have been through it; a reviewed one lifts the banner when it is alone
  const reviewed = { ...cabinet, specimens: cabinet.specimens.map((e) => ({ ...e, record: { ...e.record, draft: false } })) }
  assert.equal(buildView(reviewed, LEARNER, '2026-11-12').anyDraft, false)
})

test('the stage of a specimen is the stage of its ID, else of its lab stage, else of its lesson', () => {
  assert.equal(stageOf(entryOf('SP-1.5')), 'S1')
  const lab = { record: { id: 'refund-clamp-3f9a', found_in: { lab_stage: 'LAB-3.4' }, kcs: [] }, evidence: {}, rev: '', kcNames: {} }
  assert.equal(stageOf(lab), 'S3')
  assert.equal(stageOf({ ...lab, record: { ...lab.record, found_in: { lesson: 'S7.L4' } } }), 'S7')
  assert.equal(stageOf({ ...lab, record: { ...lab.record, found_in: { lab_stage: 'LAB-10.2' } } }), 'S10')
})
