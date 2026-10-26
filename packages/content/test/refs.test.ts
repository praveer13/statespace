import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citedRuns, resolveRefs } from '../src/build/index.ts'
import type { RefContext } from '../src/build/index.ts'
import { facts, realRuns } from './helpers.ts'

const ctx = (draft: boolean, extra: Partial<RefContext> = {}): RefContext => ({
  runs: realRuns(['RUN-z3-starter', 'RUN-z3-bv64', 'RUN-tlc-doublespend']),
  facts,
  registeredRun: (id) => /^RUN-[a-z0-9-]+$/.test(id),
  draft,
  ...extra,
})

test('a value reference prints the value from the record, as the site prints numbers', () => {
  const r = resolveRefs('Z3 returned {{run:RUN-z3-starter#values.model}} and "{{run:RUN-z3-starter#values.guarded}}".', ctx(false), 4)
  assert.deepEqual(r.problems, [])
  assert.equal(r.text, 'Z3 returned [b = 0, amount = 1, a = 0] and "unsat".')
  assert.deepEqual(r.runs, ['RUN-z3-starter'])
})

test('a citation stays in the text and is listed as cited', () => {
  const r = resolveRefs('It is recorded {{run:RUN-z3-bv64}}.', ctx(false), 1)
  assert.equal(r.text, 'It is recorded {{run:RUN-z3-bv64}}.')
  assert.deepEqual(r.runs, ['RUN-z3-bv64'])
})

test("the documents' tag compiles to citations, one per run, and drops a value path", () => {
  const r = resolveRefs('Both hold [X RUN-z3-starter, RUN-z3-bv64#values.sender] here.', ctx(false), 1)
  assert.deepEqual(r.problems.map((p) => p.message), [])
  assert.equal(r.text, 'Both hold {{run:RUN-z3-starter}}{{run:RUN-z3-bv64}} here.')
  assert.deepEqual(r.runs, ['RUN-z3-bv64', 'RUN-z3-starter'])
})

test('a run that is not recorded waits in a draft and fails outside one', () => {
  const draft = resolveRefs('Later {{run:RUN-z3-bv64-negamt}}, and {{run:RUN-z3-bv64-negamt#values.verdict}}.', ctx(true), 9)
  assert.deepEqual(draft.problems.map((p) => [p.severity, p.code]), [['warning', 'run-pending'], ['warning', 'run-pending']])
  assert.equal(draft.text, 'Later {{run:RUN-z3-bv64-negamt}}, and {{run:RUN-z3-bv64-negamt#values.verdict}}.')
  assert.deepEqual(draft.unresolved, ['RUN-z3-bv64-negamt'])
  const final = resolveRefs('Later {{run:RUN-z3-bv64-negamt}}.', ctx(false), 9)
  assert.deepEqual(final.problems.map((p) => [p.severity, p.code, p.line]), [['error', 'run-unresolved', 9]])
})

test('an [X ...] tag needs its run on disk even in a draft', () => {
  const r = resolveRefs('Said [X RUN-z3-bv64-negamt].', ctx(true), 2)
  assert.deepEqual(r.problems.map((p) => [p.severity, p.code]), [['error', 'run-tag']])
  assert.equal(r.text, 'Said [X RUN-z3-bv64-negamt].')
})

test('a value path the record lacks is an error, and the architecture spelling gets a hint', () => {
  const none = resolveRefs('{{run:RUN-z3-starter#values.nothing}}', ctx(false), 1)
  assert.match(none.problems[0]?.message ?? '', /the record has nothing there \(values has: version, starter, model, guarded\)/)
  const object = resolveRefs('{{run:RUN-tlc-doublespend#values}}', ctx(false), 1)
  assert.match(object.problems[0]?.message ?? '', /does not name one printable value/)
  const arch = resolveRefs('{{run:RUN-z3-starter#outputs.values.model}}', ctx(false), 1)
  assert.match(arch.problems[0]?.message ?? '', /write values\.model/)
  const tag = resolveRefs('[X RUN-z3-starter#values.nothing]', ctx(false), 1)
  assert.match(tag.problems[0]?.message ?? '', /the record has nothing at values\.nothing/)
})

test('a run the spine does not register, and a malformed ID, are errors', () => {
  const r = resolveRefs('{{run:RUN-not-registered}}', ctx(true, { registeredRun: () => false }), 1)
  assert.ok(r.problems.some((p) => p.code === 'run-unregistered'))
  assert.match(resolveRefs('{{run:z3-starter}}', ctx(true), 1).problems[0]?.message ?? '', /is not a run ID/)
})

test('a fact reference stays in the text and is listed; an unknown fact is an error', () => {
  const r = resolveRefs('The latest is {{fact:tool.z3.pypi-latest}}.', ctx(false), 1)
  assert.deepEqual(r.problems, [])
  assert.equal(r.text, 'The latest is {{fact:tool.z3.pypi-latest}}.')
  assert.deepEqual(r.facts, ['tool.z3.pypi-latest'])
  assert.deepEqual(resolveRefs('{{fact:tool.nothing.here}}', ctx(false), 1).problems.map((p) => p.code), ['fact-unknown'])
})

test('the names of the reference forms are placeholders, not references', () => {
  const r = resolveRefs('Write {{run:RUN-id}} or [X RUN-id] or {{run:ID}} to cite a run.', ctx(false), 1)
  assert.deepEqual(r.problems, [])
  assert.equal(r.text, 'Write {{run:RUN-id}} or [X RUN-id] or {{run:ID}} to cite a run.')
  assert.deepEqual(r.runs, [])
})

test('citedRuns lists every run a text names, recorded or not, once, in order', () => {
  assert.deepEqual(citedRuns('{{run:RUN-b}} [X RUN-a, RUN-b] {{run:RUN-c#values.x}} {{fact:tool.a.b}} {{run:RUN-id}}'), ['RUN-a', 'RUN-b', 'RUN-c'])
})
