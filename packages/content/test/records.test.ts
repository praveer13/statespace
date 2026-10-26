import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileRecord, mapStrings, readYaml } from '../src/build/index.ts'
import type { LessonLab, LessonStage } from '../src/index.ts'
import { aliasBomb, checker, facts, fixture, index, realRuns } from './helpers.ts'

const ctx = (file: string) => ({ file, index, runs: realRuns(['RUN-z3-starter']), facts, checker })
const stage = (text = fixture('stages/S1.stage.yaml'), file = 'content/stages/S1/stage.yaml') => compileRecord<LessonStage>('stage', text, ctx(file))
const lab = (text = fixture('stages/S1.lab.yaml'), file = 'content/stages/S1/lab.yaml') => compileRecord<LessonLab>('lab', text, ctx(file))
const errors = (r: { problems: Array<{ severity: string; code: string }> }): string[] => r.problems.filter((p) => p.severity === 'error').map((p) => p.code)

test('the stage fixture compiles, and its card waits for a run that is not recorded, in a draft', () => {
  const r = stage()
  assert.deepEqual(errors(r), [])
  assert.ok(r.compiled)
  assert.equal(r.compiled.record.id, 'S1')
  assert.deepEqual(r.compiled.unresolved, ['RUN-twin-pins'])
  assert.ok(r.problems.some((p) => p.code === 'run-pending'))
})

test('the lab fixture compiles, a tag becomes a citation, and its open extra survives', () => {
  const r = lab()
  assert.deepEqual(errors(r), [])
  assert.ok(r.compiled)
  assert.match(r.compiled.record.stages?.[0]?.what ?? '', /\{\{run:RUN-z3-starter\}\}\.$/)
  assert.deepEqual(Object.keys(r.compiled.runs), ['RUN-z3-starter'])
  assert.deepEqual((r.compiled.record.extra as { hints: unknown[] }).hints.length, 1)
})

test('stage faults: a record in the wrong place, an ID the spine lacks, a seam, an anchor, a drawer', () => {
  assert.ok(errors(stage(undefined, 'content/stages/S2/stage.yaml')).includes('file-name'))
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('id: S1', 'id: S11'), 'content/stages/S11/stage.yaml')).includes('id-unregistered'))
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('SEAM-7', 'SEAM-99'))).includes('unknown-seam'))
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('AUD-1.3', 'AUD-9.9'))).includes('unknown-anchor'))
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('D-13', 'D-99'))).includes('unknown-drawer'))
  assert.ok(stage(fixture('stages/S1.stage.yaml').replace('AUD-1.3', 'AUD-2.1')).problems.some((p) => p.code === 'anchor-stage' && p.severity === 'warning'))
})

test('stage faults: the schema is closed, so a misspelled key and a missing draft flag are errors', () => {
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('newTool:', 'new_tool:'))).includes('schema'))
  assert.ok(errors(stage(fixture('stages/S1.stage.yaml').replace('draft: true\n', ''))).includes('schema'))
  const r = stage(fixture('stages/S1.stage.yaml').replace('seams: [SEAM-1, SEAM-7]', 'seams: SEAM-1'))
  assert.match(r.problems.find((p) => p.code === 'schema')?.message ?? '', /\/seams/)
})

test('lab faults: wrong place, a stage of another lab, a check the spine lacks', () => {
  assert.ok(errors(lab(undefined, 'content/stages/S2/lab.yaml')).includes('file-name'))
  assert.ok(errors(lab(fixture('stages/S1.lab.yaml').replace('id: LAB-1.2', 'id: LAB-2.1'))).includes('unknown-lab-stage'))
  assert.ok(errors(lab(fixture('stages/S1.lab.yaml').replace('LAB-1.c1', 'LAB-1.c99'))).includes('unknown-check'))
  assert.ok(errors(lab(fixture('stages/S1.lab.yaml').replace('LAB-1.c1', 'LAB-2.c1'))).includes('unknown-check'))
})

test('YAML faults are reported with their line, and duplicate keys fail', () => {
  const bad = readYaml('id: S1\nid: S2\n')
  assert.equal(bad.problems[0]?.code, 'yaml')
  assert.equal(bad.problems[0]?.line, 2)
  assert.equal(readYaml('a: [\n').problems[0]?.severity, 'error')
})

test('readYaml places every key and every list item', () => {
  const r = readYaml('a: 1\nlist:\n  - x\n  - y: 2\n    z: 3\n')
  assert.equal(r.lines.get('/a'), 1)
  assert.equal(r.lines.get('/list'), 2)
  assert.equal(r.lines.get('/list/0'), 3)
  assert.equal(r.lines.get('/list/1'), 4)
  assert.equal(r.lines.get('/list/1/z'), 5)
})

test('mapStrings maps every string value and nothing else', () => {
  assert.deepEqual(mapStrings({ a: 'x', n: 1, l: ['y', { k: 'z' }], t: true, z: null }, (s) => s.toUpperCase()), { a: 'X', n: 1, l: ['Y', { k: 'Z' }], t: true, z: null })
})

test('YAML 1.2: a bare date and bare yes or no stay strings', () => {
  const r = readYaml('d: 2026-10-25\nn: no\ny: yes\n')
  assert.deepEqual(r.value, { d: '2026-10-25', n: 'no', y: 'yes' })
})

const lineOfKey = (text: string, key: string): number => text.split('\n').findIndex((l) => l.startsWith(`${key}:`)) + 1

test('a stage or a lab file declares its schema, which is how GATE-schema finds the file', () => {
  const without = (name: string): string => fixture(name).replace(/^schema: .*\n/, '')
  for (const [kind, r] of [['stage', stage(without('stages/S1.stage.yaml'))], ['lab', lab(without('stages/S1.lab.yaml'))]] as const) {
    assert.deepEqual(r.problems.map((p) => [p.severity, p.code, p.line]), [['error', 'schema-tag', 1]], kind)
    assert.match(r.problems[0]?.message ?? '', /declares its schema, "schema: statespace\/lesson@1": that line is how GATE-schema finds the file/)
    assert.equal(r.compiled, null)
  }
  // a tag that is not this schema's is a schema fault, at its line
  const wrong = stage(fixture('stages/S1.stage.yaml').replace('statespace/lesson@1', 'statespace/stage@1'))
  assert.deepEqual(wrong.problems.filter((p) => p.severity === 'error').map((p) => [p.code, p.line]), [['schema', 1]])
  assert.match(wrong.problems[0]?.message ?? '', /\/schema must equal "statespace\/lesson@1"/)
  // a file that is not a mapping is not asked for a tag
  assert.deepEqual(errors(stage('- a\n- b\n')), ['schema'])
})

test('the stage and the lab compile to records of the schema, and the schema root accepts what they compile to', () => {
  for (const r of [stage(), lab()]) {
    assert.ok(r.compiled)
    assert.equal((r.compiled.record as { schema?: string }).schema, 'statespace/lesson@1')
    assert.deepEqual(checker.record(r.compiled.record), [])
  }
})

test('YAML whose aliases expand past the library limit is a reported problem, not a crash', () => {
  const r = readYaml(aliasBomb())
  assert.equal(r.value, null)
  assert.deepEqual(r.problems.map((p) => [p.severity, p.code, p.line]), [['error', 'yaml', 1]])
  assert.match(r.problems[0]?.message ?? '', /^not valid YAML: .*alias/i)
  const nested = aliasBomb()
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => `  ${l}`)
    .join('\n')
  const c = stage(`schema: statespace/lesson@1\nid: S1\ndraft: true\nextra:\n${nested}\n`)
  assert.equal(c.compiled, null)
  assert.deepEqual(c.problems.map((p) => [p.severity, p.code]), [['error', 'yaml']])
  const l = lab(`schema: statespace/lesson@1\nid: LAB-1\ndraft: true\nextra:\n${nested}\n`)
  assert.deepEqual(l.problems.map((p) => p.code), ['yaml'])
})

test('PyYAML reads a content file too, so a scalar the two readers read differently is reported where it is written', () => {
  const read = (text: string): Array<[string, number | null]> => readYaml(text, { pyyaml: true }).problems.map((p) => [p.code, p.line])
  assert.deepEqual(read('a: no\n'), [['pyyaml', 1]])
  assert.deepEqual(read('a: 1\nb: 2026-10-25\n'), [['pyyaml', 2]])
  assert.deepEqual(read('list:\n  - yes\n  - "yes"\n  - ok\n'), [['pyyaml', 2]])
  assert.deepEqual(read('a: [on, off]\n'), [['pyyaml', 1], ['pyyaml', 1]])
  assert.deepEqual(read('yes: 1\n'), [['pyyaml', 1]], 'a key too')
  assert.deepEqual(read('a: 0777\nb: 1e3\nc: 12:30\nd: 1_000\n'), [['pyyaml', 1], ['pyyaml', 2], ['pyyaml', 3], ['pyyaml', 4]])
  assert.deepEqual(read("a: 'no'\nb: \"2026-10-25\"\nc: |\n  no\nd: true\ne: 12\nf: 1.5\ng: ~\nh: text with no and yes in it\n"), [], 'quoted, block, and agreed scalars pass')
  const message = readYaml('a: no\n', { pyyaml: true }).problems[0]?.message ?? ''
  assert.equal(message, '"no" is read as a boolean by PyYAML (YAML 1.1), which GATE-schema reads this file with, and as a string here: put it in quotes')
  assert.deepEqual(readYaml('a: no\nb: 2026-10-25\n').problems, [], 'off unless asked: a file no gate reads with PyYAML has no use for the rule')
  // through the compiler
  const text = fixture('stages/S1.stage.yaml').replace('newTool: Z3Py, met first in this tab', 'newTool: no')
  assert.deepEqual(stage(text).problems.filter((p) => p.severity === 'error').map((p) => [p.code, p.line]), [['pyyaml', lineOfKey(text, 'newTool')]])
  const lab2 = fixture('stages/S1.lab.yaml').replace('weekend: false', 'weekend: off')
  assert.deepEqual(lab(lab2).problems.filter((p) => p.severity === 'error').map((p) => [p.code, p.line]), [['pyyaml', lab2.split('\n').findIndex((l) => l.includes('weekend:')) + 1]])
})
