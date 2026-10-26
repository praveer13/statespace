// GATE-coverage (scripts/verify-coverage.mjs), which W1-T04 builds beside GATE-kc: green over docs/COVERAGE.md, and
// failing on each planted unresolved ID and on a cut whose clause names no receiving ID.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addRow, between, checkCoverage, loadInputs, PLANTS, readCuts, rowIds, selfCheck } from '../../../scripts/verify-coverage.mjs'
import { ROOT } from './helpers.ts'

const loaded = loadInputs(ROOT)
if ('missing' in loaded) throw new Error(`cannot read ${loaded.missing}`)
const inputs = loaded as { coverage: string; spine: string; registry: { id: string; kind: string }[] }

test('GATE-coverage passes over docs/COVERAGE.md', () => {
  const r = checkCoverage(inputs)
  assert.deepEqual(r.failures, [])
  assert.ok(r.rows > 150, `${r.rows} rows`)
  assert.ok(r.ids > 200, `${r.ids} IDs`)
  assert.deepEqual(r.applied, [])
})

test('every planted fault trips the gate, and naming the receiving ID clears a cut', () => {
  const results = selfCheck(inputs)
  assert.equal(results.length, PLANTS.length + 1)
  for (const r of results) assert.ok(r.ok, `${r.name}: ${r.detail}`)
})

test('a planted unresolved ID fails with its clause and line', () => {
  const coverage = addRow(inputs.coverage, '### Stage 2 — Prove a small program correct (S2)', '| Planted clause | LAB-2.9, S2.L11 | C | |')
  const r = checkCoverage({ ...inputs, coverage })
  const msgs = r.failures.map((f) => `${f.check} ${f.message} ${f.where}`)
  assert.ok(msgs.some((m) => /^unresolved "Planted clause": LAB-2\.9 does not resolve: the spine registers no lab-stage LAB-2\.9 docs\/COVERAGE\.md:\d+$/.test(m)), msgs.join('\n'))
  assert.ok(msgs.some((m) => /S2\.L11 does not resolve/.test(m)))
})

test('ranges: between one prefix every ID is read; across prefixes only the endpoints', () => {
  assert.deepEqual(between('SP-1.1', 'SP-1.3'), ['SP-1.1', 'SP-1.2', 'SP-1.3'])
  assert.deepEqual(between('LAB-2.c1', 'LAB-2.c3'), ['LAB-2.c1', 'LAB-2.c2', 'LAB-2.c3'])
  assert.equal(between('SP-1.1', 'SP-9.6'), null)
  assert.equal(between('S2.L5', 'S2.L1'), null)
  assert.deepEqual(rowIds(['a clause', 'S9.L4–S9.L6; SP-1.1–SP-9.6; D-03; KC-1.witness-class; S1']).map((x) => x.id), ['S9.L4', 'S9.L5', 'S9.L6', 'SP-1.1', 'SP-9.6'])
})

test('the spine\'s cut table: twenty bridges, none cut; a struck-through bridge or a "cut" row is applied', () => {
  const { cuts, problems } = readCuts(inputs.spine)
  assert.deepEqual(problems, [])
  assert.equal(cuts.size, 20)
  assert.equal([...cuts.values()].filter((c) => c.applied).length, 0)
  assert.deepEqual(cuts.get('S2.L1')?.receivers, ['S2.L4', 'S2.L7'])
  const struck = readCuts(inputs.spine.replace('| 1 | S4.L5 |', '| 1 | ~~S4.L5~~ |')).cuts.get('S4.L5')
  assert.equal(struck?.applied, true)
  const marked = readCuts(inputs.spine.replace('| 3 | S7.L1 |', '| 3 (cut) | S7.L1 |')).cuts.get('S7.L1')
  assert.equal(marked?.applied, true)
})

test('a cut passes its coverage to its receivers, and to theirs when a receiver is cut too', () => {
  // cut S2.L1: the Natural Number Game row names only S2.L1 and D-08, so it fails
  const one = inputs.spine.replace('| 2 | S2.L1 |', '| 2 (cut) | S2.L1 |')
  const r1 = checkCoverage({ ...inputs, spine: one })
  assert.ok(r1.failures.some((f) => f.check === 'cut' && /Natural Number Game.*S2\.L1 was cut \(spine section 14, row 2\) and the row names no receiving ID \(S2\.L4 or S2\.L7\)/.test(f.message)), r1.failures.map((f) => f.message).join('\n'))
  // the induction row names S2.L4 and S2.L7, so it stands; cut S2.L4 as well and S2.L7 still receives
  assert.equal(r1.failures.some((f) => /mathematical induction/.test(f.message)), false)
  const two = one.replace('| 18 | S2.L4 |', '| 18 (cut) | S2.L4 |')
  const r2 = checkCoverage({ ...inputs, spine: two })
  assert.equal(r2.failures.some((f) => /mathematical induction/.test(f.message)), false)
  // with S2.L4 cut as well, S2.L1's coverage passes on to S2.L7 alone
  assert.ok(r2.failures.some((f) => /Natural Number Game.*S2\.L1 was cut .*names no receiving ID \(S2\.L7\)$/.test(f.message)), r2.failures.map((f) => f.message).join('\n'))
})

test('a malformed cut table is a problem', () => {
  const r = checkCoverage({ ...inputs, spine: inputs.spine.replace('| # | Bridge | Its KCs move to |', '| # | Lesson | Its KCs move to |') })
  assert.ok(r.failures.some((f) => f.check === 'cut' && /should hold one cut table/.test(f.message)))
})
