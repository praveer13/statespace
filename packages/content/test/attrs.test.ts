import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listOf, parseAttrs } from '../src/build/index.ts'

const read = (s: string): { values: Record<string, string | true>; problems: string[] } => {
  const r = parseAttrs(s, 7)
  return { values: Object.fromEntries(r.values), problems: r.problems.map((p) => p.message) }
}

test('names alone are flags, name=value takes a bare value', () => {
  assert.deepEqual(read('role=exit family=GEN-call-it call').values, { role: 'exit', family: 'GEN-call-it', call: true })
  assert.deepEqual(read('kcs=KC-1.a,KC-1.b template=t1').values, { kcs: 'KC-1.a,KC-1.b', template: 't1' })
  assert.deepEqual(read('').values, {})
})

test('a quoted value may hold spaces, quotes and equals signs', () => {
  assert.deepEqual(read('title="Build this" lab=LAB-1.2').values, { title: 'Build this', lab: 'LAB-1.2' })
  assert.deepEqual(read('title="say \\"hi\\" a=b"').values, { title: 'say "hi" a=b' })
})

test('what cannot be read is reported with its line, and the reader stops', () => {
  for (const bad of ['Role=exit', 'role=', 'role="open', 'a=b=c', '=x', 'role=ex"it']) {
    const r = parseAttrs(bad, 7)
    assert.ok(r.problems.length > 0, bad)
    assert.ok(r.problems.every((p) => p.line === 7 && p.severity === 'error'), bad)
  }
})

test('a name given twice is reported', () => {
  assert.match(read('a=1 a=2').problems.join(' '), /a is given twice/)
})

test('listOf splits on commas and drops blanks', () => {
  assert.deepEqual(listOf('KC-1.a, KC-1.b,,'), ['KC-1.a', 'KC-1.b'])
  assert.deepEqual(listOf(undefined), [])
  assert.deepEqual(listOf(true), [])
})
