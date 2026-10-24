import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkUnit } from '../src/index.ts'
import type { Fact, Token, Unit } from '../src/index.ts'
import { loadRuns, ROOT } from './helpers.ts'

const numbers = (await import(join(ROOT, 'scripts', 'runs', 'numbers-rules.mjs'))) as { tokensOf: (text: string) => Token[] }
const runs = loadRuns()
const facts = new Map<string, Fact>([['tool.pyodide.latest', { id: 'tool.pyodide.latest', kind: 'tool', statement: 'x', source: { url: 'https://example.org', title: 't' } }]])
const unit = (text: string, over: Partial<Unit> = {}): Unit => ({ file: 'docs/x.md', line: 1, text, copy: false, covered: /\[X\s|\{\{run:/.test(text), tokens: numbers.tokensOf(text), ...over })
const check = (text: string, over: Partial<Unit> = {}) => checkUnit(unit(text, over), { runs, facts })
const details = (text: string, over: Partial<Unit> = {}) => check(text, over).findings.map((f) => `${f.check}: ${f.detail}`)

test('a value tag passes when its sentence states the value, and fails when it states another', () => {
  assert.deepEqual(details('With `-deadlock`, TLC finds 11 distinct states [X RUN-tlc-doublespend#values.deadlock_off.distinct_states].'), [])
  const [d] = details('With `-deadlock`, TLC finds 212 distinct states [X RUN-tlc-doublespend#values.deadlock_off.distinct_states].')
  assert.match(d ?? '', /^values: the sentence does not state RUN-tlc-doublespend#values\.deadlock_off\.distinct_states, which is 11; it states "212 distinct states"/)
})

test('a value tag on a run that is not on disk, or on a path that names no one value, fails', () => {
  // A run that is never recorded: RUN-phone-pyodide served here until W0-S02 recorded it.
  assert.match(details('It loads in 3 s [X RUN-does-not-exist#values.ready_s].').join(), /is not on disk/)
  assert.match(details('Counts [X RUN-tlc-full#values.distinct_states].').join(), /an object with keys w2/)
  assert.match(details('Counts 11 [X RUN-tlc-full#outputs.values.distinct_states.w2].').join(), /run@1 keeps named values at the top level/)
})

test('a value reference prints one value; a reference to a run not yet recorded waits', () => {
  const ok = check('TLC finds {{run:RUN-tlc-full#values.distinct_states.w2}} distinct states.')
  assert.deepEqual(ok.findings, [])
  assert.equal(ok.counts.valueRefs, 1)
  const waiting = check('A phone loads {{run:RUN-does-not-exist#values.first_load_bytes}} bytes.')
  assert.deepEqual(waiting.findings, [])
  assert.equal(waiting.counts.forwardValueRefs, 1)
})

test('citations name no value, so nothing is compared', () => {
  const r = check('TLC finds 212 distinct states [X RUN-tlc-doublespend].')
  assert.deepEqual(r.findings, [])
  assert.equal(r.counts.citations, 1)
})

test('learner copy prints run outputs and never types them', () => {
  const copy = { file: 'content/stages/S5/L1.md', copy: true }
  assert.match(details('With two workers, TLC finds 11 distinct states {{run:RUN-tlc-full}}.', copy).join(), /^copy: learner copy types "11 distinct states" \(a count\)/)
  assert.deepEqual(details('With two workers, TLC finds {{run:RUN-tlc-full#values.distinct_states.w2}} distinct states.', copy), [])
  // A value tag that states the typed value binds it.
  assert.deepEqual(details('On the guarded query Z3 answers `unsat` [X RUN-z3-starter#values.guarded].', copy), [])
  // Flags are inputs, not outputs.
  assert.deepEqual(details("TLC's `-deadlock` flag turns the deadlock check off {{run:RUN-tlc-help}}.", copy), [])
  // A unit no run reference covers is GATE-numbers' business, not this rule's.
  assert.deepEqual(details('TLC finds 11 distinct states.', { ...copy, covered: false }), [])
  // Documents may type values beside a citation.
  assert.deepEqual(details('With two workers, TLC finds 11 distinct states {{run:RUN-tlc-full}}.'), [])
})

test('fact references name registry facts', () => {
  assert.deepEqual(details('The tab loads Pyodide {{fact:tool.pyodide.latest}}.'), [])
  assert.match(details('The tab loads Pyodide {{fact:tool.pyodide.oldest}}.').join(), /names no fact/)
  assert.match(details('The tab loads Pyodide {{fact:Pyodide}}.').join(), /is not a fact ID/)
  assert.deepEqual(details('Write `{{fact:<id>}}` to print a fact.'), [])
})

test('a finding names the line of its reference inside a multi-line unit', () => {
  const text = 'TLC explores the space.\nWith `-deadlock` it finds 212 distinct states [X RUN-tlc-doublespend#values.deadlock_off.distinct_states].'
  const r = checkUnit(unit(text, { line: 10, lineOf: (o) => 10 + (o > text.indexOf('\n') ? 1 : 0) }), { runs, facts })
  assert.equal(r.findings[0]?.line, 11)
})

test("a value tag after its sentence's full stop is reported as standing alone", () => {
  assert.match(details('[X RUN-tlc-doublespend#values.deadlock_off.distinct_states]').join(), /stands alone after its sentence's full stop/)
})

test("the copy rule names the value reference that prints a typed value, or says the cited run holds no such value", () => {
  const copy = { file: 'content/stages/S5/L1.md', copy: true }
  assert.match(details('With two workers, TLC finds 11 distinct states {{run:RUN-tlc-full}}.', copy).join(), /print it from the record: \{\{run:RUN-tlc-full#values\.distinct_states\.w2\}\}/)
  assert.match(details('With two workers, TLC finds 12 distinct states {{run:RUN-tlc-full}}.', copy).join(), /no value of RUN-tlc-full is "12 distinct states", so check it against the run/)
})
