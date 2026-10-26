// What GATE-kc reads from the spine, on the real document and on planted defects.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSpineFacts } from '../src/spine.ts'
import { scanBlocks } from '../../ids/src/markdown.ts'
import { read } from './helpers.ts'

const spine = read('docs/spine/SPINE.md')
const facts = (text: string) => readSpineFacts(scanBlocks(text))

test('the real spine: the KC table, the sets, the families, first contact, the builder path and its jumps', () => {
  const { facts: f, problems } = facts(spine)
  assert.deepEqual(problems, [])
  assert.equal(f.kcs.length, 105)
  assert.equal(f.kcs.filter((k) => k.threshold).length, 26)
  const rowcount = f.kcs.find((k) => k.id === 'KC-6.rowcount-as-guard')
  assert.deepEqual(rowcount?.requires, ['KC-6.null-guards'])
  assert.deepEqual(rowcount?.requiresSoft, ['KC-3.big-step-errors'])
  const publish = f.kcs.find((k) => k.id === 'KC-10.publish-limitations')
  assert.deepEqual(publish?.requires, ['KC-10.claim-graph-report'])
  assert.deepEqual(publish?.requiresSoft, ['KC-5.bounded-scope', 'KC-2.statement-pinning'])
  assert.deepEqual(f.sets.map((s) => s.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  assert.equal(f.sets.find((s) => s.id === 'C')?.auditFamilies, true)
  assert.match(f.sets.find((s) => s.id === 'G')?.opensNote ?? '', /S9 members join at S9/)
  assert.deepEqual(f.families.map((x) => x.id), ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
  assert.deepEqual([...f.firstContact.entries()], [['S1.L0', ['KC-1.violation-as-sat']]])
  assert.deepEqual(f.builderPath?.tokens.slice(0, 4), ['S1', 'S5.L1–S5.L8', 'S6.L1', 'S6.L2'])
  assert.equal(f.builderPath?.tokens.at(-1), 'S10')
  assert.equal(f.jumps.length, 4)
  assert.ok(f.jumps.some((j) => j.substitute.includes('D-23')))
})

test('a malformed KC table or a missing paragraph is a problem, not a shorter reading', () => {
  const row = '| KC-1.only-if-direction | Read "P only if Q" as P → Q | S1 | | — | KC-1.implication-vacuity |'
  assert.ok(spine.includes(row))
  const ragged = facts(spine.replace(row, '| KC-1.only-if-direction | Read "P only if Q" as P → Q | S1 | | — |'))
  assert.ok(ragged.problems.some((p) => /has 5 cells, not 6/.test(p.message)))
  const garbage = facts(spine.replace(row, '| KC-1.only-if-direction | Read "P only if Q" as P → Q | S1 | | the earlier one | KC-1.implication-vacuity |'))
  assert.ok(garbage.problems.some((p) => /cannot read "the earlier one" as one KC ID/.test(p.message)))
  const flag = facts(spine.replace(row, '| KC-1.only-if-direction | Read "P only if Q" as P → Q | S1 | yes | — | KC-1.implication-vacuity |'))
  assert.ok(flag.problems.some((p) => /Threshold cell of KC-1\.only-if-direction reads "yes"/.test(p.message)))
  const noFamilies = facts(spine.replace('**Fading families.**', '**Fading.**'))
  assert.ok(noFamilies.problems.some((p) => /no "\*\*Fading families\.\*\*" paragraph/.test(p.message)))
  const noPath = facts(spine.replace(/^S1 → S5\.L1/m, 'S1 then S5.L1'))
  assert.ok(noPath.problems.some((p) => /prints no builder path/.test(p.message)))
})
