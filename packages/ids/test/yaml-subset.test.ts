import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseTasks } from '../src/tracker.ts'
import { parseYaml } from '../src/yaml-subset.ts'
import { ROOT } from './helpers.ts'

const tasksText = readFileSync(`${ROOT}/tracker/tasks.yaml`, 'utf8')

test('mappings, sequences of mappings and scalars of the subset', () => {
  const doc = parseYaml(`# a comment
schema: statespace/tracker@1
updated: 2026-10-24
n: 12
ratio: 0.25
flag: true
nothing: null
rules:
  quoted: "a: b, c # not a comment"
  single: 'it''s'
  list: [todo, "in-progress", review]
  map: {S: "at most 3", M: "at most 2"}
tasks:
  # a comment between entries
  - id: W0-S01
    title: "One"
    implements: ["INS-z3", "GATE-links"]
    depends_on: []
    notes: >-
      folded text
      on two lines

      after a blank line
  - id: W0-S02
    review_h: 0.5   # trailing comment
    deliverables:
      - "a/b/"
      - c.json
`)
  assert.deepEqual(doc, {
    schema: 'statespace/tracker@1',
    updated: '2026-10-24',
    n: 12,
    ratio: 0.25,
    flag: true,
    nothing: null,
    rules: { quoted: 'a: b, c # not a comment', single: "it's", list: ['todo', 'in-progress', 'review'], map: { S: 'at most 3', M: 'at most 2' } },
    tasks: [
      { id: 'W0-S01', title: 'One', implements: ['INS-z3', 'GATE-links'], depends_on: [], notes: 'folded text on two lines\nafter a blank line' },
      { id: 'W0-S02', review_h: 0.5, deliverables: ['a/b/', 'c.json'] },
    ],
  })
})

test('literal and kept block scalars', () => {
  const doc = parseYaml('a: |\n  line one\n  line two\nb: |-\n  x\nc: >\n  folded\n  text\n')
  assert.deepEqual(doc, { a: 'line one\nline two\n', b: 'x', c: 'folded text\n' })
})

test('constructs outside the subset fail loudly instead of being half-read', () => {
  const cases: [string, string][] = [
    ['a: &anchor 1\n', 'anchor'],
    ['a: *alias\n', 'alias'],
    ['a: !!str 1\n', 'tag'],
    ['a: [1,\n  2]\n', 'multi-line flow sequence'],
    ['a: {x: 1,\n  y: 2}\n', 'multi-line flow mapping'],
    ['a: "unterminated\n', 'unterminated quote'],
    ['a: 1\na: 2\n', 'duplicate key'],
    ['a: 1\n  b: 2\n', 'unexpected indentation'],
    ['- >\n  block in a sequence\n', 'block scalar as a sequence item'],
  ]
  for (const [text, why] of cases) assert.throws(() => parseYaml(text), /line \d+/, why)
})

test('tracker/tasks.yaml stays inside the subset and has the shape the gate reads', () => {
  const { tasks, waves, statuses, problems } = parseTasks(tasksText)
  assert.deepEqual(problems, [])
  assert.deepEqual(waves, ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6'])
  assert.deepEqual(statuses, ['todo', 'in-progress', 'review', 'done'])
  assert.ok(tasks.length > 0)
  for (const t of tasks) {
    assert.ok(t.line > 0, `${t.id} has a line`)
    assert.ok(Array.isArray(t.implements) && Array.isArray(t.dependsOn))
  }
})

// The parser is checked against PyYAML on the real file. It needs `uv` and a network on first use,
// so it runs only when asked: IDS_TEST_PYYAML=1 node --test packages/ids/test/yaml-subset.test.ts
test('agrees with PyYAML on tracker/tasks.yaml', { skip: process.env.IDS_TEST_PYYAML !== '1' }, () => {
  const py = [
    'import sys, json, datetime, yaml',
    "doc = yaml.safe_load(open(sys.argv[1], encoding='utf-8'))",
    'def d(o):',
    '    if isinstance(o, (datetime.date, datetime.datetime)): return o.isoformat()',
    '    raise TypeError(type(o))',
    'print(json.dumps(doc, default=d))',
  ].join('\n')
  const r = spawnSync('uv', ['run', '--quiet', '--with', 'pyyaml', 'python', '-I', '-c', py, `${ROOT}/tracker/tasks.yaml`], { encoding: 'utf8', maxBuffer: 1 << 28 })
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(parseYaml(tasksText), JSON.parse(r.stdout))
})
