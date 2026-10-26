import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PAGE_SIZE_WARN, buildContent, buildSearchIndex, naturalCompare, sha256Hex } from '../src/build/index.ts'
import type { ContentInput, Manifest, SearchIndex } from '../src/build/index.ts'
import { REPO, factsFile, fixture, realRuns, registry } from './helpers.ts'

const schemaFile = (name: string) => ({ path: `schemas/${name}.schema.json`, text: readFileSync(`${REPO}schemas/${name}.schema.json`, 'utf8') })

const input = (overrides: Partial<ContentInput> = {}): ContentInput => ({
  registry,
  files: [
    { path: 'content/stages/S1/S1.L1.md', text: fixture('lessons/S1.L1.md') },
    { path: 'content/drawers/D-03.md', text: fixture('drawers/D-03.md') },
    { path: 'content/drawers/D-33.md', text: fixture('drawers/D-33.md') },
    { path: 'content/stages/S1/stage.yaml', text: fixture('stages/S1.stage.yaml') },
    { path: 'content/stages/S1/lab.yaml', text: fixture('stages/S1.lab.yaml') },
  ],
  runs: realRuns(['RUN-z3-starter', 'RUN-z3-bv64']),
  facts: factsFile,
  schemas: [schemaFile('defs'), schemaFile('lesson'), schemaFile('claim')],
  builtAt: '2026-10-25',
  ...overrides,
})

const file = (files: Array<{ path: string; text: string }>, path: string | RegExp): { path: string; text: string } => {
  const f = files.find((x) => (typeof path === 'string' ? x.path === path : path.test(x.path)))
  assert.ok(f, `no output ${String(path)} in ${files.map((x) => x.path).join(', ')}`)
  return f
}

test('the fixture content builds with no error', () => {
  const r = buildContent(input())
  assert.deepEqual(r.problems.filter((p) => p.severity === 'error'), [])
  assert.deepEqual(r.report, {
    lessons: 1,
    drawers: 2,
    stages: 1,
    labs: 1,
    auditAnchors: 0,
    blocks: { prose: 2, instrument: 2, item: 3, claim: 1, specimen: 1, card: 1 },
    itemRevs: 5,
    runsCited: 1,
    files: r.files.length,
    skipped: [],
  })
})

test('every page is a hashed JSON file, a Markdown file and an entry of the manifest', () => {
  const r = buildContent(input())
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  assert.equal(manifest.format, 'statespace content manifest, revision 1')
  assert.equal(manifest.builtAt, '2026-10-25')
  assert.deepEqual(Object.keys(manifest.lessons), ['S1.L1'])
  assert.deepEqual(Object.keys(manifest.drawers), ['D-03', 'D-33'])
  for (const entry of [...Object.values(manifest.lessons), ...Object.values(manifest.drawers)]) {
    const json = file(r.files, entry.file)
    assert.match(entry.file, /^content\/(S1\.L1|D-03|D-33)\.[0-9a-f]{12}\.json$/)
    assert.equal(entry.file.split('.').at(-2), sha256Hex(json.text).slice(0, 12), 'the name carries the content hash')
    assert.equal((JSON.parse(json.text) as { rev: string }).rev, entry.rev)
    assert.ok(file(r.files, entry.md).text.startsWith('# '))
  }
  const lesson = manifest.lessons['S1.L1']
  assert.deepEqual({ title: lesson?.title, tier: lesson?.tier, draft: lesson?.draft, minutes: lesson?.minutes }, { title: 'Negate, then search', tier: 'core', draft: true, minutes: 18 })
  for (const key of ['stages', 'labs', 'search'] as const) assert.ok(file(r.files, manifest[key]), key)
  assert.equal(manifest.md, 'md/index.json')
  assert.equal(manifest.schemas, 'schemas/index.json')
})

test('the build is deterministic, and the content hash moves with the content', () => {
  const a = buildContent(input())
  const b = buildContent(input())
  assert.deepEqual(a.files, b.files)
  const rev = (r: typeof a): string => (JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest).contentRev
  assert.equal(rev(a), rev(b))
  const changed = input()
  changed.files = changed.files.map((f) => (f.path === 'content/stages/S1/S1.L1.md' ? { ...f, text: f.text.replace('A worked example first.', 'A worked example, first.') } : f))
  assert.notEqual(rev(buildContent(changed)), rev(a))
  const later = buildContent(input({ builtAt: '2026-11-02' }))
  assert.equal(rev(later), rev(a), 'the build date is not content')
  assert.deepEqual(
    later.files.filter((f) => f.path !== 'content/manifest.json'),
    a.files.filter((f) => f.path !== 'content/manifest.json'),
  )
})

test('the Markdown index lists every page for llms.txt', () => {
  const r = buildContent(input())
  const index = JSON.parse(file(r.files, 'md/index.json').text) as { pages: Array<{ id: string; kind: string; path: string; title: string }> }
  assert.deepEqual(index.pages.map((p) => [p.id, p.kind, p.path]), [['S1.L1', 'lesson', 'md/S1.L1.md'], ['D-03', 'drawer', 'md/D-03.md'], ['D-33', 'drawer', 'md/D-33.md']])
})

test('the stage pages join the spine tables to the stage data, and say which lessons are built', () => {
  const r = buildContent(input())
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  const stages = JSON.parse(file(r.files, manifest.stages).text) as { stages: Array<{ id: string; title: string; lessons: Array<{ id: string; built: boolean; minutes: number | null; tier: string }>; lab: { id: string } | null; labStages: unknown[]; anchors: string[]; drawers: Array<{ id: string; deferred: boolean }>; authored: { newTool: string } | null; unresolved: string[] }> }
  assert.equal(stages.stages.length, 10)
  const s1 = stages.stages[0]
  assert.equal(s1?.id, 'S1')
  assert.deepEqual(s1?.lessons.map((l) => [l.id, l.tier, l.built]), [['S1.L0', 'boot', false], ['S1.L1', 'core', true], ['S1.L2', 'bridge', false], ['S1.L3', 'bridge', false], ['S1.L4', 'bridge', false], ['S1.L5', 'core', false]])
  assert.equal(s1?.lessons[1]?.minutes, 18)
  assert.equal(s1?.lab?.id, 'LAB-1')
  assert.equal(s1?.labStages.length, 6)
  assert.deepEqual(s1?.anchors, ['AUD-1.1', 'AUD-1.2', 'AUD-1.3'])
  assert.ok(s1?.drawers.some((d) => d.id === 'D-01' && !d.deferred))
  assert.equal(s1?.authored?.newTool, 'Z3Py, met first in this tab')
  assert.deepEqual(s1?.unresolved, ['RUN-twin-pins'])
  assert.equal(stages.stages[1]?.authored, null, 'a stage with no stage.yaml has its tables only')
  assert.ok(stages.stages[9]?.lessons.some((l) => l.tier === 'step'))
})

test('the lab pages join each stage to its nominal minutes and its authored checks', () => {
  const r = buildContent(input())
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  const labs = JSON.parse(file(r.files, manifest.labs).text) as { labs: Array<{ id: string; authored: boolean; stages: Array<{ id: string; minutes: number; what: string | null; checks: Array<{ id: string }> }>; extra: unknown }> }
  assert.equal(labs.labs.length, 10)
  const lab1 = labs.labs[0]
  assert.equal(lab1?.authored, true)
  assert.deepEqual(lab1?.stages.map((s) => [s.id, s.minutes]), [['LAB-1.1', 2], ['LAB-1.2', 20], ['LAB-1.3', 15], ['LAB-1.4', 25], ['LAB-1.5', 25], ['LAB-1.6', 25]])
  assert.deepEqual(lab1?.stages[0]?.checks.map((c) => c.id), ['LAB-1.c1'])
  assert.equal(lab1?.stages[1]?.what, null)
  assert.equal(labs.labs[1]?.authored, false)
  assert.ok(lab1?.extra)
})

test('the search index holds titles, names and segment titles, and nothing a call is for', () => {
  const r = buildContent(input())
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  const text = file(r.files, manifest.search).text
  const index = JSON.parse(text) as SearchIndex
  const byId = new Map(index.entries.map((e) => [e.id, e]))
  assert.deepEqual(byId.get('S1.L1'), { id: 'S1.L1', kind: 'lesson', title: 'Negate, then search', href: '/lessons/S1.L1', stage: 'S1', text: 'core · Negating English · Exit' })
  assert.deepEqual(byId.get('S1.L2')?.text, 'bridge', 'a lesson not built yet has no segment titles')
  assert.equal(byId.get('D-33')?.text, 'deferred')
  assert.equal(byId.get('D-03')?.href, '/drawers/D-03')
  assert.deepEqual(byId.get('KC-1.violation-as-sat'), { id: 'KC-1.violation-as-sat', kind: 'kc', title: 'Search for a violation by asserting the negation and asking for `sat`', href: '/lessons/S1.L0', stage: 'S1', text: 'threshold · S1.L0' })
  assert.equal(byId.get('SP-1.1')?.href, '/specimens')
  assert.equal(byId.get('LAB-1')?.href, '/labs/LAB-1')
  assert.equal(byId.get('LAB-1.2')?.kind, 'lab-stage')
  assert.equal(byId.get('S1')?.kind, 'stage')
  assert.equal(byId.get('AUD-1.1')?.href, '/audit')
  assert.equal(byId.get('CL-1.1')?.href, '/claims')
  for (const secret of ['A model of this is a transfer that works', 'allowed ∧ bal', 'passes every premise', 'dp:Z', 'RUN-z3-starter', 'amount = 1']) assert.ok(!text.includes(secret), `the index holds ${JSON.stringify(secret)}`)
  assert.equal(new Set(index.entries.map((e) => e.id)).size, index.entries.length, 'each ID once')
})

/** The search entries of a build, by ID, and the stage pages' lessons, by ID. */
function titles(r: ReturnType<typeof buildContent>): { search: Map<string, { title: string }>; stage: Map<string, { title: string }> } {
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  const search = JSON.parse(file(r.files, manifest.search).text) as SearchIndex
  const stages = JSON.parse(file(r.files, manifest.stages).text) as { stages: Array<{ id: string; lessons: Array<{ id: string; title: string }>; drawers: Array<{ id: string; title: string }> }> }
  const s1 = stages.stages[0]
  return { search: new Map(search.entries.map((e) => [e.id, e])), stage: new Map([...(s1?.lessons ?? []), ...(s1?.drawers ?? [])].map((l) => [l.id, l])) }
}

test('a lesson or a drawer is titled as its built page titles it, and a Boot lesson with no page is titled "Start here"', () => {
  // no Boot page yet: the spine titles S1.L0 with the internal name, and learners see "Start here"
  const before = titles(buildContent(input()))
  assert.equal(before.search.get('S1.L0')?.title, 'Start here')
  assert.equal(before.stage.get('S1.L0')?.title, 'Start here')
  assert.equal(before.search.get('S1.L1')?.title, 'Negate, then search', 'a built page keeps its title')
  assert.match(before.search.get('S1.L2')?.title ?? '', /\S/, 'a lesson with no page takes the spine title')
  assert.ok(!before.search.get('S1.L2')?.title.startsWith('Start here'))
  // a Boot page: titled as the page says, which is "Start here", and the build has nothing to say about the difference from the spine
  const withBoot = input()
  withBoot.files = [...withBoot.files, { path: 'content/stages/S1/S1.L0.md', text: fixture('lessons/S1.L0.md') }]
  const built = buildContent(withBoot)
  assert.deepEqual(built.problems.filter((p) => p.severity === 'error'), [])
  assert.ok(!built.problems.some((p) => p.code === 'title-differs' && p.file === 'content/stages/S1/S1.L0.md'), 'Start here is not a difference from the spine title')
  const after = titles(built)
  assert.equal(after.search.get('S1.L0')?.title, 'Start here')
  assert.equal(after.stage.get('S1.L0')?.title, 'Start here')
  // the built page's title wins over the spine's, in the index and on the stage page, for a lesson and for a drawer
  const retitled = input()
  retitled.files = retitled.files.map((f) => (f.path === 'content/stages/S1/S1.L1.md' ? { ...f, text: f.text.replace('title: Negate, then search', 'title: Negate it, then search') } : f.path === 'content/drawers/D-03.md' ? { ...f, text: f.text.replace('title: Quantifiers and negation', 'title: Negating a claim') } : f))
  const changed = titles(buildContent(retitled))
  assert.equal(changed.search.get('S1.L1')?.title, 'Negate it, then search')
  assert.equal(changed.stage.get('S1.L1')?.title, 'Negate it, then search')
  assert.equal(changed.search.get('D-03')?.title, 'Negating a claim')
  assert.equal(changed.stage.get('D-03')?.title, 'Negating a claim')
  // "Boot" is an internal name: no lesson result carries it
  for (const t of [before, after]) assert.ok(![...t.search.values()].some((e) => /^Boot\b/.test(e.title)))
})

test('buildSearchIndex is a function of the registry and the built pages', () => {
  const a = buildSearchIndex(registry, [])
  assert.equal(a.entries.find((e) => e.id === 'S1.L1')?.text, 'core')
  assert.ok(a.entries.length > 300)
})

test('the published schemas are copied with an index of their hashes', () => {
  const r = buildContent(input())
  const index = JSON.parse(file(r.files, 'schemas/index.json').text) as { schemas: Array<{ name: string; id: string; schema: string | null; file: string; sha256: string }> }
  assert.deepEqual(index.schemas.map((s) => [s.name, s.id, s.schema]), [['claim', 'urn:statespace:claim@1', 'statespace/claim@1'], ['defs', 'urn:statespace:defs@1', null], ['lesson', 'urn:statespace:lesson@1', 'statespace/lesson@1']])
  for (const s of index.schemas) {
    const copy = file(r.files, s.file)
    assert.equal(s.sha256, sha256Hex(copy.text))
    assert.equal(copy.text, readFileSync(`${REPO}schemas/${s.name}.schema.json`, 'utf8'))
  }
})

test('a page with an error is left out and its problems are reported with its file and line', () => {
  const bad = input()
  bad.files = bad.files.map((f) => (f.path === 'content/stages/S1/S1.L1.md' ? { ...f, text: f.text.replace('KC-1.witness-class', 'KC-1.typo-slug') } : f))
  const r = buildContent(bad)
  const error = r.problems.find((p) => p.severity === 'error')
  assert.deepEqual({ file: error?.file, line: error?.line, code: error?.code }, { file: 'content/stages/S1/S1.L1.md', line: 6, code: 'unknown-kc' })
  assert.equal(r.report.lessons, 0)
  assert.ok(!r.files.some((f) => f.path.startsWith('content/S1.L1.')))
  assert.ok(!r.files.some((f) => f.path === 'md/S1.L1.md'))
})

test('files the build does not own are left alone, and stray files are reported', () => {
  const extra = input()
  extra.files = [
    ...extra.files,
    { path: 'content/stages/budget.yaml', text: 'schema: statespace/budget@1\n' },
    { path: 'content/stages/S1/placement.yaml', text: 'steps: []\n' },
    { path: 'content/stages/S1/notes.md', text: '# notes\n' },
    { path: 'content/drawers/README.md', text: '# drawers\n' },
    { path: 'content/stages/S1/data.csv', text: 'a,b\n' },
  ]
  const r = buildContent(extra)
  const stray = r.problems.filter((p) => /data\.csv|notes\.md|budget|placement/.test(p.file ?? ''))
  assert.deepEqual(stray.map((p) => [p.file, p.severity, p.code]), [['content/stages/S1/data.csv', 'warning', 'unread-file'], ['content/stages/S1/notes.md', 'error', 'unknown-file']])
  assert.deepEqual(r.report.skipped, ['content/drawers/README.md: documentation', 'content/stages/S1/data.csv: not read', "content/stages/S1/placement.yaml: another task's data", "content/stages/budget.yaml: another task's data"])
})

test('a file the build crashes on is an internal finding with its file, and the other files still build', () => {
  const crash = input()
  crash.files = crash.files.map((f) => (f.path === 'content/drawers/D-33.md' ? ({ path: f.path, text: null } as unknown as { path: string; text: string }) : f))
  const r = buildContent(crash)
  const errors = r.problems.filter((p) => p.severity === 'error')
  assert.deepEqual(errors.map((p) => [p.file, p.severity, p.code]), [['content/drawers/D-33.md', 'error', 'internal']])
  assert.match(errors[0]?.message ?? '', /^the build failed on this file: .*; that is a bug in the build, not in the file$/)
  assert.deepEqual([r.report.lessons, r.report.drawers, r.report.stages, r.report.labs], [1, 1, 1, 1])
})

test('a schema file that does not parse is reported', () => {
  const r = buildContent(input({ schemas: [{ path: 'schemas/broken.schema.json', text: '{' }] }))
  assert.ok(r.problems.some((p) => p.code === 'schema-file' && p.file === 'schemas/broken.schema.json'))
})

test('IDs are ordered the way a reader orders them', () => {
  assert.deepEqual(['S2.L10', 'S2.L9', 'S10.L1', 'S1.L2', 'D-02', 'D-01'].sort(naturalCompare), ['D-01', 'D-02', 'S1.L2', 'S2.L9', 'S2.L10', 'S10.L1'])
})

test('the pipeline with nothing to build still writes the manifest, the indexes and the schemas', () => {
  const r = buildContent(input({ files: [] }))
  assert.deepEqual(r.problems, [])
  const manifest = JSON.parse(file(r.files, 'content/manifest.json').text) as Manifest
  assert.deepEqual(manifest.lessons, {})
  assert.ok(file(r.files, manifest.stages).text.includes('"S10"'))
})

test('a page whose JSON is too large for a route is a warning', () => {
  const big = input()
  const chunk = `${'A line of prose that goes on. '.repeat(800)}\n\n`
  const filler = Array.from({ length: Math.ceil(PAGE_SIZE_WARN / 24_000) + 1 }, () => `${chunk}::specimen id=SP-1.2 mount=false\n\n`).join('')
  big.files = big.files.map((f) => (f.path === 'content/stages/S1/S1.L1.md' ? { ...f, text: f.text.replace('A worked example first.', `A worked example first.\n\n${filler}`) } : f))
  const r = buildContent(big)
  assert.deepEqual(r.problems.filter((p) => p.severity === 'error'), [])
  assert.deepEqual(r.problems.filter((p) => p.code === 'page-size').map((p) => [p.severity, p.file]), [['warning', 'content/stages/S1/S1.L1.md']])
  assert.equal(r.report.lessons, 1, 'a large page is still built')
})
