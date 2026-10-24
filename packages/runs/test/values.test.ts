import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describe, findValue, isPrintable, renderings, renderValue, resolvePath } from '../src/index.ts'
import { loadRuns } from './helpers.ts'

test('resolvePath reads own properties and list indices, as GATE-runs does', () => {
  const doc = { values: { distinct_states: { w2: 11 }, list: ['a', 'b'] }, configs: [{ argv: ['java', '-jar'] }] }
  assert.equal(resolvePath(doc, 'values.distinct_states.w2'), 11)
  assert.equal(resolvePath(doc, 'values.list.1'), 'b')
  assert.deepEqual(resolvePath(doc, 'configs.0.argv'), ['java', '-jar'])
  assert.equal(resolvePath(doc, 'values.no_such'), undefined)
  assert.equal(resolvePath(doc, 'values.constructor'), undefined) // inherited names name nothing
  assert.equal(resolvePath(doc, 'values.list.x'), undefined)
  assert.equal(resolvePath(doc, 'values.distinct_states.w2.more'), undefined)
})

test('the real records: values GATE-facts prints', () => {
  const runs = loadRuns()
  assert.equal(resolvePath(runs.get('RUN-tlc-doublespend'), 'values.deadlock_off.distinct_states'), 11)
  assert.equal(resolvePath(runs.get('RUN-cvc5-alethe'), 'values.version_printed'), '1.4.2-modified')
  assert.equal(resolvePath(runs.get('RUN-z3-starter'), 'values.model'), '[b = 0, amount = 1, a = 0]')
})

test('isPrintable: a non-empty string, a finite number or a boolean', () => {
  for (const ok of ['sat', 11, 0, -3, 1.46, true, false]) assert.ok(isPrintable(ok), String(ok))
  for (const bad of ['', '  ', Number.NaN, Number.POSITIVE_INFINITY, null, undefined, [1], { w2: 11 }]) assert.ok(!isPrintable(bad), String(bad))
  assert.equal(describe({ w2: 11, w3: 45 }), 'an object with keys w2, w3')
  assert.equal(describe([1, 2, 3, 4]), 'a list of 4 items')
})

test('renderings and the printed form', () => {
  assert.deepEqual(renderings(594481375), ['594481375', '594,481,375'])
  assert.deepEqual(renderings(11), ['11'])
  assert.deepEqual(renderings(-3), ['-3', '−3'])
  assert.deepEqual(renderings('9223372036850581504'), ['9223372036850581504', '9,223,372,036,850,581,504'])
  assert.equal(renderValue(17179888), '17,179,888')
  assert.equal(renderValue(1.46), '1.46')
  assert.equal(renderValue('1.4.2-modified'), '1.4.2-modified')
})

test('findValue: a sentence states a value only as a whole token', () => {
  const states: Array<[string, string | number]> = [
    ['TLC finds 11 distinct states', 11],
    ['Spectacle shows a 5-state trace', 5],
    ['the archive is 594,481,375 bytes', 594481375],
    ['the archive is 594481375 bytes', 594481375],
    ['Lean v4.35.0 is the pin', '4.35.0'],
    ['Z3 answers `sat` on the starter', 'sat'],
    ['the model is `[b = 0,  amount = 1, a = 0]`', '[b = 0, amount = 1, a = 0]'],
    ['it prints 1.4.2-modified', '1.4.2-modified'],
    ['ready in 1.46 s', 1.46],
    ['ranges of 1.46–1.71 s', 1.71],
  ]
  for (const [text, v] of states) assert.ok(findValue(text, v) !== null, `${JSON.stringify(text)} states ${v}`)
  const not: Array<[string, string | number]> = [
    ['TLC finds 12 distinct states', 11],
    ['TLC finds 111 distinct states', 11],
    ['TLC finds 211 distinct states', 11],
    ['it took 1.11 s', 11],
    ['it took 11.5 s', 11],
    ['11,000 states', 11],
    ['Z3 answers `unsat`', 'sat'],
    ['Lean 4.35.0-rc1', '4.35.0'],
    ['it prints 1.4.2-modified', '1.4.2'],
    ['5-7 states', 5],
    ['H11 is a catalog row', 11],
  ]
  for (const [text, v] of not) assert.equal(findValue(text, v), null, `${JSON.stringify(text)} does not state ${v}`)
})
