import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { REPO, checker, codes, compile, readmeFences, realRuns } from './helpers.ts'

test('the page the README gives as its example compiles, with the runs it cites on disk', () => {
  const [example] = readmeFences('markdown')
  assert.ok(example, 'the README has an example page')
  const runs = realRuns(['RUN-z3-unknown-pow'])
  assert.equal(runs.size, 1, 'RUN-z3-unknown-pow is recorded')
  const r = compile(example, 'content/stages/S1/S1.L2.md', { runs })
  assert.deepEqual(codes(r, 'error'), [])
  assert.ok(r.compiled)
  assert.deepEqual(checker.page(r.compiled.page), [])
  assert.deepEqual(r.compiled.page.rail, [{ id: 's1', title: 'What each answer asserts' }, { id: 's2', title: 'Exit' }])
  assert.equal(r.compiled.page.minutes, 15)
})

test('the choice the README shows for section 1.6 reads as a choice', () => {
  const choice = readmeFences('').find((f) => f.startsWith('@call key=B'))
  assert.ok(choice)
  const page = `---\nid: S1.L1\ntier: core\ntitle: Negate, then search\ndraft: true\nkcs: [KC-1.violation-as-sat]\n---\n\n## S {minutes=5}\n\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n${choice}\n:::\n`
  const r = compile(page, undefined, {})
  assert.deepEqual(codes(r, 'error'), [])
})

test('the reference forms the README names resolve against the real runs and facts', () => {
  const r = compile(
    `---\nid: S1.L1\ntier: core\ntitle: Negate, then search\ndraft: true\nkcs: [KC-1.violation-as-sat]\n---\n\n## S {minutes=5}\n\nZ3 returned {{run:RUN-z3-starter#values.model}} [X RUN-z3-starter]. Latest {{fact:tool.z3.pypi-latest}}.\n`,
  )
  assert.deepEqual(codes(r, 'error'), [])
  assert.match(r.compiled?.page.segments[0]?.blocks[0]?.type === 'prose' ? (r.compiled.page.segments[0].blocks[0] as { md: string }).md : '', /^Z3 returned \[b = 0, amount = 1, a = 0\] \{\{run:RUN-z3-starter\}\}\. Latest \{\{fact:tool\.z3\.pypi-latest\}\}\.$/)
})

test('every code a problem can carry is in the README table of section 1.8, and every code there is one the sources use', () => {
  const sources = readdirSync(`${REPO}packages/content/src`, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => readFileSync(`${e.parentPath}/${e.name}`, 'utf8'))
  sources.push(readFileSync(`${REPO}scripts/build-content.mjs`, 'utf8')) // the build-level findings: encoding, facts, run-record
  const used = new Set<string>()
  for (const text of sources) for (const m of text.matchAll(/\b(?:code:\s*|(?:error|warn)\(\s*)'([a-z][a-z0-9-]*)'/g)) used.add(m[1] as string)
  const readme = readFileSync(`${REPO}packages/content/README.md`, 'utf8')
  const section = readme.slice(readme.indexOf('### 1.8'), readme.indexOf('### 1.9'))
  const documented = new Set<string>()
  for (const row of section.split('\n').filter((l) => l.startsWith('| `'))) {
    const codes = row.split('|')[1] ?? ''
    for (const m of codes.matchAll(/`([a-z][a-z0-9-]*)`/g)) documented.add(m[1] as string)
  }
  assert.ok(used.size > 40, `found ${used.size} codes in the sources`)
  assert.deepEqual([...used].filter((c) => !documented.has(c)).sort(), [], 'a code the README does not name')
  assert.deepEqual([...documented].filter((c) => !used.has(c)).sort(), [], 'a code the README names that no source uses')
})
