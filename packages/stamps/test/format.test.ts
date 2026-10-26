// How stamps read: counts, rlimits, witness lengths, the spoken name, and parsing stamp text back.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { codeText, constantsText, deriveStamp, fmtCount, fmtRlimit, parseStampText, spokenName, stampText, witnessText } from '../src/index.ts'

test('counts and rlimits as the course writes them', () => {
  assert.equal(fmtCount(10), '10')
  assert.equal(fmtCount(1274), '1274')
  assert.equal(fmtCount(29745), '29,745')
  assert.equal(fmtCount(12893420), '12,893,420')
  assert.equal(fmtRlimit(5000000), '5e6')
  assert.equal(fmtRlimit(1000000), '1e6')
  assert.equal(fmtRlimit(123456), '123456')
  assert.equal(fmtRlimit(500), '500')
  assert.throws(() => fmtRlimit(-1))
})

test('witness lengths and constants', () => {
  assert.equal(witnessText({ length: 1, unit: 'steps' }), '1 step')
  assert.equal(witnessText({ length: 4, unit: 'actions', states: 5 }), '4 actions (5 states)')
  assert.equal(witnessText({ length: 3, unit: 'rows' }), '3 rows')
  assert.equal(constantsText([]), 'no constants')
  assert.equal(constantsText([['N', '3']]), 'N = 3')
})

test('the spoken name spells the code and reads parentheses as a pause', () => {
  const unknown = deriveStamp({ kind: 'smt-unknown', solver: { name: 'Z3', version: '5.3.1' }, reason: 'incomplete (theory arithmetic)' }, { lane: 'rechecked-here', source: 'INS-z3' })
  assert.ok(unknown.kind === 'stamp')
  assert.equal(spokenName(unknown.stamp), 'Unknown, code question mark: incomplete, theory arithmetic')
  const lean = deriveStamp({ kind: 'lean-accepted', lean: { name: 'Lean', version: '4.35.0' }, axioms: [] }, { lane: 'reported', source: 'r' })
  assert.ok(lean.kind === 'stamp')
  assert.equal(spokenName(lean.stamp), 'Proved, code P: Lean 4.35.0 kernel, axioms listed')
  assert.equal(codeText(lean.stamp), '[P] · Lean 4.35.0 kernel · axioms listed')
  assert.equal(stampText(lean.stamp), 'PROVED [P] · Lean 4.35.0 kernel · axioms listed')
})

test('stamp text parses back, and a word that is not its code is a problem', () => {
  assert.deepEqual(parseStampText('UNKNOWN [?] · stopped at deadlock, 10 distinct states'), { word: 'UNKNOWN', code: '[?]', qualifier: ['stopped at deadlock, 10 distinct states'], problems: [] })
  assert.deepEqual(parseStampText('[M] · constants · complete')?.qualifier, ['constants', 'complete'])
  assert.match(parseStampText('PROVED [M] · constants · complete')?.problems.join() ?? '', /PROVED is not the word for \[M\]/)
  assert.match(parseStampText('ASSUMED [A]')?.problems.join() ?? '', /no qualifier/)
  assert.equal(parseStampText('CL-6.4 is a claim'), null)
  assert.equal(parseStampText('NOT COVERED [N] · the recipient')?.word, 'NOT COVERED')
})
