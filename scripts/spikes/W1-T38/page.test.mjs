import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { failing, runGate } from '../../verify-lessons.mjs'
import { BOOT, BRIDGE, CORE, lintBuilt, lintDocument, lintPage, lintRecord, onlyIds, pipelineDrift, recordStrings, segmentKinds, titleVerdict } from './lib/page.mjs'
import { judge } from './lib/self-check.mjs'
import { BRIDGE_FIXTURE_WORDS } from './lib/plants.mjs'
import { FIXTURE_TREE, PLANTS, REPO, checks, envFor, fixtureText, mutate, scratchTree } from './helpers.mjs'

const env = (await envFor()).env
const L0 = 'content/stages/S1/S1.L0.md'
const L1 = 'content/stages/S1/S1.L1.md'
const L2 = 'content/stages/S1/S1.L2.md'

const lesson = async (text, file = L1) => (await lintPage({ text, file, kind: 'lesson', env })).findings
const errors = (findings) => findings.filter((f) => f.severity === 'error')
const warns = (findings) => findings.filter((f) => f.severity === 'warn')

// ------------------------------------------------------------------ the fixture tree, and the planted faults

test('the fixture tree passes every rule', async () => {
  const r = await runGate(FIXTURE_TREE)
  assert.deepEqual(r.findings, [])
  assert.deepEqual(r.summary, { lessons: 3, drawers: 2, stages: 1, labs: 1, placements: 1, documents: 1, warnDocuments: 0, built: 0, terms: 25, internal: 12, blockTypes: { card: 4, instrument: 6, item: 12, prose: 7, specimen: 1 }, generatorsMissing: [] })
})

test('every planted fault fails the gate with every rule it names (in process; --self-check runs the same through the command line)', async () => {
  const missed = []
  for (const plant of PLANTS) {
    const dir = scratchTree(REPO)
    try {
      plant.apply(dir, REPO)
      const r = await runGate(dir, { strict: plant.strict === true })
      const status = failing(r.findings, plant.strict === true).length > 0 ? 1 : 0
      const { caught, fired } = judge(plant, status, r.findings)
      if (!caught) missed.push(`${plant.name}: expected ${plant.rules.join(', ')}, got ${fired.join(', ') || 'a green gate'}`)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
  assert.deepEqual(missed, [])
})

test('a plant is caught only when every rule it names fired: a rule that is gone, or another rule in its place, is a miss', () => {
  const plant = { name: 'p', rules: ['lock/not-yet', 'lock/padlock'], check: 'lock' }
  const lock = (rules) => ({ check: 'lock', rule: rules[0], rules, where: 'x:1', detail: '', severity: 'error' })
  assert.equal(judge(plant, 1, [lock(['lock/not-yet', 'lock/not-until']), lock(['lock/padlock'])]).caught, true)
  assert.equal(judge(plant, 1, [lock(['lock/not-until'])]).caught, false)
  assert.equal(judge(plant, 1, [lock(['lock/not-yet'])]).caught, false)
  assert.equal(judge(plant, 0, [lock(['lock/not-yet', 'lock/padlock'])]).caught, false)
  // a warning counts only under --strict, which the plant asks for
  const warn = { check: 'anatomy', rule: 'anatomy/core-planned', where: 'x:1', detail: '', severity: 'warn' }
  assert.equal(judge({ name: 'w', rules: ['anatomy/core-planned'] }, 1, [warn]).caught, false)
  assert.equal(judge({ name: 'w', rules: ['anatomy/core-planned'], strict: true }, 1, [warn]).caught, true)
})

test('the pipeline\'s own lists must be the spine\'s six types, three roles and five variants (block-type/drift, which no plant reaches)', () => {
  assert.deepEqual(pipelineDrift(env.content), [])
  const seventh = pipelineDrift({ ...env.content, BLOCK_TYPES: [...env.content.BLOCK_TYPES, 'figure'] })
  assert.deepEqual(seventh.map((f) => [f.rule, f.check, f.severity]), [['block-type/drift', 'block-type', 'error']])
  assert.match(seventh[0].detail, /block types .*figure.* are not the spine's/)
  assert.equal(pipelineDrift({ ...env.content, ITEM_ROLES: ['prequestion', 'segment'] }).length, 1)
  assert.equal(pipelineDrift({ ...env.content, CARD_VARIANTS: undefined }).length, 1)
})

test('the five faults the acceptance names each trip exactly their own check', async () => {
  const five = [
    ['a graded item without a family', 'family'],
    ['an answer in the rail', 'rail'],
    ['a seventh block type', 'block-type'],
    ['lock copy', 'lock'],
    ['an internal name', 'internal'],
  ]
  for (const [name, check] of five) {
    const plant = PLANTS.find((p) => p.name === name)
    assert.ok(plant, name)
    const dir = scratchTree(REPO)
    try {
      plant.apply(dir, REPO)
      const failed = [...new Set(errors((await runGate(dir)).findings).map((f) => f.check))]
      assert.deepEqual(failed, [check], name)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
})

// ------------------------------------------------------------------ the fixtures are real pages, and the built ones have a plain rail

/** The fixture pages through the content pipeline: the pages as the site loads them, by ID. */
function buildFixtures() {
  const runs = new Map()
  for (const f of fs.readdirSync(path.join(REPO, 'runs'))) if (/^RUN-.*\.json$/.test(f)) runs.set(f.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(REPO, 'runs', f), 'utf8')))
  const facts = JSON.parse(fs.readFileSync(path.join(REPO, 'content/registry/facts.json'), 'utf8'))
  const files = [L0, L1, L2, 'content/drawers/D-03.md', 'content/drawers/D-33.md'].map((p) => ({ path: p, text: fixtureText(p) }))
  const out = env.content.buildContent({ registry: env.index.registry, files, runs, facts, schemas: [], builtAt: '2026-10-25' })
  const pages = new Map(out.files.filter((f) => /^content\/(?:S[0-9]+\.L[0-9]+|D-[0-9]{2})\.[0-9a-f]{12}\.json$/.test(f.path)).map((f) => [/^content\/(D-[0-9]{2}|S[0-9]+\.L[0-9]+)\./.exec(f.path)[1], f.text]))
  return { out, pages }
}

test('the fixture pages build with the content pipeline without an error: they are pages the site could load', () => {
  const { out, pages } = buildFixtures()
  assert.deepEqual(out.problems.filter((p) => p.severity === 'error'), [])
  assert.deepEqual([...pages.keys()].sort(), ['D-03', 'D-33', 'S1.L0', 'S1.L1', 'S1.L2'])
})

test('a built lesson\'s rail is an id and a title for each segment, and nothing else', async () => {
  const { pages } = buildFixtures()
  const built = (id) => ({ text: pages.get(id), file: `apps/site/public/content/${id}.0123456789ab.json`, env })
  for (const id of ['S1.L0', 'S1.L1', 'S1.L2']) assert.deepEqual((await lintBuilt(built(id))).findings, [], id)
  const edit = (id, change) => {
    const page = JSON.parse(pages.get(id))
    change(page)
    return { ...built(id), text: JSON.stringify(page) }
  }
  const detail = async (arg) => (await lintBuilt(arg)).findings.map((f) => `${f.check}: ${f.detail}`).join(' | ')
  assert.match(await detail(edit('S1.L1', (p) => (p.rail[1].verdict = 'unsat'))), /rail: rail entry 2 holds id, title, verdict: the rail shows an id and a title and nothing else/)
  assert.match(await detail(edit('S1.L1', (p) => (p.rail[0] = { id: 's1' }))), /rail entry 1 holds id/)
  assert.match(await detail(edit('S1.L1', (p) => (p.rail[2].title = 'The answer is B'))), /rail entry 3 is not the title of segment 3/)
  assert.match(await detail(edit('S1.L1', (p) => p.rail.pop())), /the rail has 3 entries for 4 segments/)
  assert.match(await detail(edit('S1.L1', (p) => ((p.segments[1].title = 'Why unsat is the answer'), (p.rail[1].title = 'Why unsat is the answer')))), /holds "unsat", an option of a question on this page/)
  // a verdict that no option offers, once: Boot's options are prose
  const boot = await lintBuilt(edit('S1.L0', (p) => ((p.segments[1].title = 'REFUTED, then PROVED'), (p.rail[1].title = 'REFUTED, then PROVED'))))
  assert.deepEqual(boot.findings.map((f) => f.check), ['rail'])
  assert.match(boot.findings[0].detail, /rail entry 2: the title "REFUTED, then PROVED" names the verdict "REFUTED"/)
  assert.match(await detail(edit('S1.L1', (p) => p.segments[0].blocks.push({ type: 'figure' }))), /block-type: figure is not a content block type/)
  assert.match(await detail({ ...built('S1.L1'), text: 'not json' }), /read: the built page is not JSON/)
  assert.match(await detail({ ...built('S1.L1'), text: '{"segments": 1}' }), /read: a built lesson has segments and a rail/)
})

test('the gate reads the lessons a build wrote, and fails on a rail that holds more than titles', async () => {
  const { pages } = buildFixtures()
  const dir = scratchTree(REPO)
  try {
    for (const [id, text] of pages) if (id.startsWith('S1.')) fs.mkdirSync(path.join(dir, 'apps/site/public/content'), { recursive: true }), fs.writeFileSync(path.join(dir, `apps/site/public/content/${id}.0123456789ab.json`), text)
    const green = await runGate(dir)
    assert.deepEqual(green.findings, [])
    assert.equal(green.summary.built, 3)
    const page = JSON.parse(pages.get('S1.L1'))
    page.rail[1].verdict = 'unsat'
    fs.writeFileSync(path.join(dir, 'apps/site/public/content/S1.L1.0123456789ab.json'), JSON.stringify(page))
    const red = await runGate(dir)
    assert.deepEqual(red.findings.map((f) => f.check), ['rail'])
    assert.match(red.findings[0].where, /^apps\/site\/public\/content\/S1\.L1\.0123456789ab\.json:1$/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// ------------------------------------------------------------------ the page

test('a page that cannot be read says so and nothing else about it', async () => {
  const f = await lesson('no front matter here\n')
  assert.ok(f.length > 0 && f.every((x) => x.check === 'read'))
  assert.match(f[0].detail, /front matter/)
})

test('the build\'s problems are left out only where a rule of the gate reports them: prose written as a block is the build\'s refusal', async () => {
  const MINIMAL = '"Minimal" means minimal for the objective you asked for, and nothing else.'
  // prose is one of the six types, so block-type/type says nothing, and the build's refusal is the finding
  const prose = errors(await lesson(mutate(L1, MINIMAL, `:::prose\n${MINIMAL}\n:::`)))
  assert.deepEqual(prose.map((x) => x.rule), ['read/page'])
  assert.match(prose[0].detail, /^prose is plain Markdown between blocks, not a block of its own/)
  // a seventh type is block-type/type's, once, and an item with no family is family/missing's, once
  const figure = errors(await lesson(mutate(L1, MINIMAL, `:::figure\nA plot.\n:::\n\n${MINIMAL}`)))
  assert.deepEqual(figure.map((x) => x.rule), ['block-type/type'])
  const family = errors(await lesson(mutate(L1, 'family=GEN-find-the-witness template=t1 kcs=KC-1.violation-as-sat', 'template=t1 kcs=KC-1.violation-as-sat')))
  assert.deepEqual(family.map((x) => x.rule), ['family/missing'])
})

test('findings name the file and the line of what they found', async () => {
  const text = mutate(L1, 'Next, find a transfer that makes the source balance negative.', 'Finish the Defence to unlock the next lesson.')
  const lock = (await lesson(text)).find((x) => x.check === 'lock')
  assert.equal(lock.where, `${L1}:${text.split('\n').findIndex((l) => l.includes('unlock the next lesson')) + 1}`)
  // in a prose block, a line of its own; in an option's why, the option's line
  const prose = mutate(L1, '"Minimal" means minimal for the objective you asked for, and nothing else.', 'First line.\n\nThe lane badge.')
  assert.equal((await lesson(prose)).find((x) => x.check === 'internal').where, `${L1}:${prose.split('\n').findIndex((l) => l.includes('The lane badge.')) + 1}`)
  const why = mutate(L1, 'The minimizer chooses every variable', 'The lane chooses every variable')
  assert.equal((await lesson(why)).find((x) => x.check === 'internal').where, `${L1}:${why.split('\n').findIndex((l) => l.includes('The lane chooses')) + 1}`)
  // a cell's @direction, @tap and @after sit lines below the cell's opening, each at its own line
  let cell = fixtureText(L1)
  cell = cell.replace('Query asserts: both balances end below zero at once.', 'Query asserts: both balances end below zero at once, as the pocket checker says.')
  cell = cell.replace('both balances stay at zero or above', 'both balances stay at zero or above in the docket')
  cell = cell.replace('That answer was not safety. It answered the wrong question.', 'That answer was not safety. The telescope shows it answered the wrong question.')
  const at = (word) => `${L1}:${cell.split('\n').findIndex((l) => l.includes(word)) + 1}`
  assert.deepEqual((await lesson(cell)).filter((x) => x.check === 'internal').map((x) => x.where), [at('pocket checker'), at('docket'), at('telescope')])
})

test('the pipeline\'s own fixture pages raise no copy finding', async () => {
  const dir = path.join(REPO, 'packages/content/test/fixtures')
  const copy = new Set(['internal', 'term', 'lock', 'pressure', 'reward'])
  for (const [file, kind] of [['lessons/S1.L0.md', 'lesson'], ['lessons/S1.L1.md', 'lesson'], ['drawers/D-03.md', 'drawer'], ['drawers/D-33.md', 'drawer']]) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8')
    const id = /^id: (\S+)/m.exec(text)[1]
    const rel = kind === 'drawer' ? `content/drawers/${id}.md` : `content/stages/S1/${id}.md`
    const f = (await lintPage({ text, file: rel, kind, env })).findings.filter((x) => copy.has(x.check))
    assert.deepEqual(f, [], file)
  }
  for (const [file, kind] of [['stages/S1.stage.yaml', 'stage'], ['stages/S1.lab.yaml', 'lab']]) {
    const f = (await lintRecord({ text: fs.readFileSync(path.join(dir, file), 'utf8'), file: `content/stages/S1/${kind}.yaml`, env })).findings
    assert.deepEqual(f, [], file)
  }
})

test('front matter of any type is a finding or nothing, never a crash', async () => {
  const drawer = (text, id = 'D-33') => lintPage({ text, file: `content/drawers/${id}.md`, kind: 'drawer', env }).then((r) => r.findings)
  // `deferred:` with no value is null
  assert.ok(checks(await drawer('---\nid: D-33\ntitle: Category theory\ndraft: true\nkcs: []\ndeferred:\n---\n')).includes('drawer'))
  for (const front of ['id: 7', 'title: 5', 'objective: [a, b]', 'tier: 3', 'kcs: 5', 'drawers: x', 'draft: maybe', 'deferred: yes', 'deferred: [a]']) {
    const text = `---\nid: S1.L2\ntier: bridge\ntitle: T\ndraft: true\nkcs: [KC-1.three-answers]\nobjective: o\n${front}\n---\n\n## S {minutes=15}\n\nText.\n`
    await assert.doesNotReject(lesson(text, L2), front)
  }
})

// ------------------------------------------------------------------ the front matter

test('a lesson names its objective, and a drawer need not', async () => {
  assert.deepEqual(checks(await lesson(mutate(L1, /^objective: .*\n/m, ''))), ['front'])
  const drawer = fixtureText('content/drawers/D-03.md').replace(/^objective: .*\n/m, '')
  assert.deepEqual((await lintPage({ text: drawer, file: 'content/drawers/D-03.md', kind: 'drawer', env })).findings, [])
})

test('an ID the registry does not hold, and a tier the spine does not give, are named', async () => {
  const unregistered = mutate(L1, 'id: S1.L1', 'id: S1.L9').replace('tier: core', 'tier: core')
  assert.ok(checks(await lesson(unregistered)).includes('front'))
  assert.match((await lesson(mutate(L2, 'tier: bridge', 'tier: core'))).find((f) => f.check === 'front').detail, /the spine gives S1.L2 the tier bridge/)
})

// ------------------------------------------------------------------ block types

test('a block type outside the six, a role outside the three and a variant outside the five are each a seventh', async () => {
  const f = await lesson(mutate(L1, '"Minimal" means minimal for the objective', ':::figure caption="x"\nbody\n:::\n\n"Minimal" means minimal for the objective'))
  assert.equal(f.filter((x) => x.check === 'block-type').length, 1)
  assert.match(f.find((x) => x.check === 'block-type').detail, /figure is not a content block type.*prose, instrument, item, claim, specimen, card.*a seventh needs a logged decision/)
  assert.ok(checks(await lesson(mutate(L1, 'role=exit family=GEN-call-it', 'role=bonus family=GEN-call-it'))).includes('block-type'))
  assert.ok(checks(await lesson(mutate(L1, 'variant=build-this', 'variant=quiz'))).includes('block-type'))
})

test('a line that reads as a block and is not one is a finding: the pipeline shows it as text and the block is lost', async () => {
  const at = '"Minimal" means minimal for the objective'
  const stray = async (block, file = L1) => (await lesson(mutate(file, at, `${block}\n\n${at}`), file)).filter((x) => x.check === 'block-type')
  for (const block of [':::Figure\nA.\n:::', '::Video src=x', ':::QUIZ\nQ?\n:::', '::: card\nA.\n:::', '  :::card variant=twin\nA.\n:::', '::::card\nA.\n:::']) {
    const f = await stray(block)
    assert.equal(f.length, 1, block)
    assert.match(f[0].detail, /reads as a block but is not one, so it shows as text: a block is ::name or :::name at the start of a line, in lower case/, block)
  }
  const item = await stray('::Item role=exit family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat')
  assert.match(item[0].detail, /written as ::item or :::item, it would be the item block it means/)
  assert.match((await stray(':::Figure\nA.\n:::'))[0].detail, /Figure is not one of them either/)
  assert.equal((await stray(':::Figure\nA.\n:::'))[0].where, `${L1}:${mutate(L1, at, `:::Figure\nA.\n:::\n\n${at}`).split('\n').indexOf(':::Figure') + 1}`)
  // code, a comment, a closing fence and the front matter are not blocks
  for (const block of ['```text\n:::Figure\n::Item\n```', '<!--\n:::Figure\n-->', '<!-- ::Item -->', 'Haskell writes `x :: Int`; a colon :: in prose.']) assert.deepEqual(await stray(block), [], block)
  // a drawer is held to the same rule
  const d03 = fixtureText('content/drawers/D-03.md').replace('A recorded result,', ':::Quiz\nQ?\n:::\n\nA recorded result,')
  assert.deepEqual(checks((await lintPage({ text: d03, file: 'content/drawers/D-03.md', kind: 'drawer', env })).findings), ['block-type'])
})

test('the claim and the specimen blocks are among the six, and they may stand after a segment\'s graded item', async () => {
  const text = mutate(L1, '## Exit {minutes=5}', '::claim template=CL-1.1\n\n::specimen id=SP-1.1\n\n## Exit {minutes=5}')
  assert.deepEqual(errors(await lesson(text)), [])
})

// ------------------------------------------------------------------ graded items name their family and template

test('a graded item names a registered family and a template of it, in a lesson and in a drawer', async () => {
  const detail = async (from, to) => (await lesson(mutate(L2, from, to))).find((f) => f.check === 'family')?.detail
  assert.match(await detail('family=GEN-call-it template=t4', 'template=t4'), /names its generator family/)
  assert.match(await detail('family=GEN-call-it template=t4', 'family=GEN-guess-it template=t4'), /GEN-guess-it is not a generator family of the spine's registry/)
  assert.match(await detail('family=GEN-call-it template=t4', 'family=GEN-call-it'), /names its template/)
  assert.match(await detail('family=GEN-call-it template=t4', 'family=GEN-call-it template=t5'), /t5 is not a template|has 4 templates/)
  assert.match(await detail('family=GEN-which-stamp template=t1', 'family=GEN-which-stamp template=t4'), /GEN-which-stamp has 3 templates in the spine, so t4 does not exist/)
  const drawer = fixtureText('content/drawers/D-03.md').replace('family=GEN-negate-it template=t1', 'template=t1')
  assert.ok(checks((await lintPage({ text: drawer, file: 'content/drawers/D-03.md', kind: 'drawer', env })).findings).includes('family'))
})

// ------------------------------------------------------------------ the rail

test('the rail holds plain titles that are told apart and give no answer, verdict or option text', async () => {
  const detail = async (from, to) => (await lesson(mutate(L1, from, to))).filter((f) => f.check === 'rail').map((f) => f.detail).join(' | ')
  assert.match(await detail('## The violation query {', '## Why unsat is the answer {'), /holds "unsat", an option of a question on this page/)
  assert.match(await detail('## The violation query {', '## The `violation` query {'), /is not plain text/)
  assert.match(await detail('## One witness, one class {', '## The violation query {'), /repeats the title of segment 2/)
  assert.equal(await detail('## One witness, one class {', '## One witness, one class and more {'), '')
  // emphasis in underscores is Markdown too, which the pipeline's own check leaves to the gate; an underscore inside a word is not
  const rules = async (from, to) => (await lesson(mutate(L1, from, to))).filter((f) => f.check === 'rail').map((f) => f.rule)
  assert.deepEqual(await rules('## One witness, one class {', '## One _witness_, one class {'), ['rail/markup'])
  assert.deepEqual(await rules('## One witness, one class {', '## __One__ witness, one class {'), ['rail/markup'])
  assert.deepEqual(await rules('## One witness, one class {', '## One witness_class, one class {'), [])
  // a title the pipeline reports already is reported once, and the underscore rule reads a built rail too
  assert.deepEqual(await rules('## The violation query {', '## Why _unsat_ is the answer {'), ['rail/option'])
  const built = { schema: 'statespace/lesson@1', id: 'S1.L1', segments: [{ id: 's1', title: 'Negating _English_', minutes: 13, blocks: [{ type: 'prose', md: 'Text.' }] }], rail: [{ id: 's1', title: 'Negating _English_' }] }
  assert.deepEqual((await lintBuilt({ text: JSON.stringify(built), file: 'built.json', env })).findings.map((f) => f.rule), ['rail/built-markup'])
})

test('the options a generated item may show are options of a question on the page too', async () => {
  // GEN-call-it's three-way verdict is sat, unsat and unknown, whatever the page authors
  const text = mutate(L0, '## What it showed {', '## Is sat the answer {').replace('::specimen id=SP-1.1 mount=false', '::specimen id=SP-1.1 mount=false\n\n::item role=exit family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat')
  const rail = (await lesson(text, L0)).filter((f) => f.check === 'rail')
  assert.equal(rail.length, 1, 'one finding for the title: the option it holds')
  assert.match(rail[0].detail, /holds "sat".*\(a generated item's options\)/)
  // the same title with no generated item and no authored option `sat` still names a verdict (V2-05: "never answers, verdicts or option text")
  const noOption = mutate(L0, '## What it showed {', '## Is sat the answer {').replace(/- A\. No: the guard[\s\S]*?mis: dp:Z3\n/, '- A. No\n  - why: The guard reads the recipient.\n  - mis: dp:G8\n- B. Yes\n  - why: The solver found a transfer.\n')
  const verdict = (await lesson(noOption, L0)).filter((f) => f.check === 'rail')
  assert.equal(verdict.length, 1)
  assert.match(verdict[0].detail, /the title "Is sat the answer" names the verdict "sat": the rail shows no answers, verdicts or option text, whatever the page's questions offer \(V2-05\)/)
})

test('a title that stands inside an option, or spells out a number an option gives, is option text', async () => {
  const rail = async (file, from, to) => (await lesson(mutate(file, from, to), file)).filter((f) => f.check === 'rail').map((f) => f.detail)
  // Boot's key option is "Yes: some inputs get past the guard."
  const inside = await rail(L0, '## What it showed {', '## Some inputs get past the guard {')
  assert.equal(inside.length, 1)
  assert.match(inside[0], /the title "Some inputs get past the guard" is the text of an option of a question on this page: the rail shows no option text \(V2-05\)/)
  // fewer than four words is a topic, not an option's text
  assert.deepEqual(await rail(L0, '## What it showed {', '## Past the guard {'), [])
  // S1.L1's call offers `1`: a title that ends on "one" gives it away, and "One witness, one class" counts witnesses
  const one = await rail(L1, '## One witness, one class {', '## The amount comes back as one {')
  assert.equal(one.length, 1)
  assert.match(one[0], /spells out "1", an option of a question on this page/)
  assert.deepEqual(await rail(L1, '## One witness, one class {', '## One witness, one class {'), [])
  assert.match((await rail(L1, '## One witness, one class {', '## The minimum is one, not zero {'))[0] ?? '', /spells out "1"/)
  // the same in a built lesson
  const page = JSON.parse(buildFixtures().pages.get('S1.L0'))
  page.segments[1].title = 'Some inputs get past the guard'
  page.rail[1].title = 'Some inputs get past the guard'
  const built = await lintBuilt({ text: JSON.stringify(page), file: 'apps/site/public/content/S1.L0.0123456789ab.json', env })
  assert.deepEqual(built.findings.map((f) => f.check), ['rail'])
  assert.match(built.findings[0].detail, /is the text of an option/)
})

test('a title never names a verdict: the solver\'s answers in any case, and a stamp word in capitals', async () => {
  const rail = async (file, from, to) => (await lesson(mutate(file, from, to), file)).filter((f) => f.check === 'rail').map((f) => f.detail)
  // Boot's options are prose, so no option offers these words: the title alone gives them away
  for (const title of ['Z3 says sat', 'REFUTED, then PROVED', 'Unsat, for every input', 'Why it is unknown', 'A satisfiable premise', 'MODEL-CHECKED or NOT COVERED']) {
    const found = await rail(L0, '## What it showed {', `## ${title} {`)
    assert.equal(found.length, 1, title)
    assert.match(found[0], /names the verdict/, title)
  }
  assert.match((await rail(L2, '## Exit {minutes=4}', '## Why unknown {minutes=4}'))[0] ?? '', /names the verdict "unknown"|holds "unknown"/)
  // a stamp word in lower case is a word of the title, and a word that holds a verdict's letters is not one
  for (const title of ['What stays assumed', 'What it showed, tested', 'A satisfying assignment', 'Unsatisfied guards', 'Saturation']) {
    assert.deepEqual(await rail(L0, '## What it showed {', `## ${title} {`), [], title)
  }
  assert.equal(titleVerdict('Five sat-solver myths'), undefined)
  assert.equal(titleVerdict('SAT and SMT'), 'SAT')
  assert.equal(titleVerdict('The proof is PROVED'), 'PROVED')
  assert.equal(titleVerdict(7), undefined)
  // a drawer has no rail
  const d03 = fixtureText('content/drawers/D-03.md').replace('## Try first {minutes=2}', '## Z3 says unsat {minutes=2}')
  assert.deepEqual((await lintPage({ text: d03, file: 'content/drawers/D-03.md', kind: 'drawer', env })).findings, [])
})

test('a family with no module yet is noted, and the rail reads the authored options alone', async () => {
  const notes = new Set()
  const bare = { ...env, note: (n) => notes.add(n), generated: async () => ({ missing: true }) }
  const f = (await lintPage({ text: fixtureText(L1), file: L1, kind: 'lesson', env: bare })).findings
  assert.deepEqual(f, [])
  assert.deepEqual([...notes].sort(), ['generator-missing:GEN-call-it', 'generator-missing:GEN-find-the-witness', 'generator-missing:GEN-negate-it'])
})

test('a family whose module will not load is a finding, not a skipped check', async () => {
  const broken = { ...env, generated: async () => ({ error: 'index.ts: boom' }) }
  const f = (await lintPage({ text: fixtureText(L1), file: L1, kind: 'lesson', env: broken })).findings
  assert.ok(f.length > 0 && f.every((x) => x.check === 'generators'))
  assert.match(f[0].detail, /could not load the generator of GEN-negate-it to read its options: index.ts: boom/)
})

// ------------------------------------------------------------------ anatomy

test('segment kinds: an opening of prequestions alone, the teaching segments, and the exit', async () => {
  const parse = (text) => env.content.parsePageSource(text).record
  assert.deepEqual(segmentKinds(parse(fixtureText(L1))), ['teaching', 'teaching', 'teaching', 'exit'])
  assert.deepEqual(segmentKinds(parse(fixtureText(L2))), ['teaching', 'exit'])
  const opening = fixtureText(L1).replace('## Negating English {', '## Before you start {minutes=2}\n\n::item role=prequestion family=GEN-negate-it template=t1 kcs=KC-1.violation-as-sat\n\n## Negating English {')
  assert.deepEqual(segmentKinds(parse(opening)), ['opening', 'teaching', 'teaching', 'teaching', 'exit'])
})

test('exit items inside a teaching segment do not make it the exit', async () => {
  const merged = fixtureText(L1).replace('## Exit {minutes=5}', '').replace(/(::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class\n)\n(::item role=exit)/, '$1\n$2')
  const parse = (text) => env.content.parsePageSource(text).record
  assert.deepEqual(segmentKinds(parse(merged)), ['teaching', 'teaching', 'teaching'])
  const f = errors(await lesson(merged)).filter((x) => x.check === 'anatomy').map((x) => x.detail).join(' | ')
  assert.match(f, /segment 3 ends in a graded item/)
})

test('a core lesson has 2 to 4 segments, each of 12 to 15 minutes', async () => {
  const [lo, hi] = CORE.segmentMinutes
  assert.deepEqual([lo, hi, CORE.segments], [12, 15, [2, 4]])
  const at = async (minutes) => errors(await lesson(mutate(L1, '## The violation query {minutes=13', `## The violation query {minutes=${minutes}`))).filter((f) => f.check === 'anatomy')
  for (const ok of [12, 13, 15]) assert.deepEqual(await at(ok), [], `${ok} minutes`)
  for (const bad of [11, 16, 20]) assert.match((await at(bad))[0]?.detail ?? '', /segment 2 is \d+ minutes; a core segment is 12 to 15/, `${bad} minutes`)
  const four = fixtureText(L1).replace('## Exit {minutes=5}', '## A fourth segment {minutes=12}\n\n:::instrument ins=INS-z3 cell=4 recorded=RUN-z3-starter\n@call key=A run=RUN-z3-starter\nWhat will Z3 return?\n\n- A. `sat`\n  - why: A transfer exists.\n- B. `unsat`\n  - why: None exists.\n  - mis: dp:Z5\n:::\n\n::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class\n\n## Exit {minutes=5}')
  assert.deepEqual(errors(await lesson(four)).filter((f) => f.check === 'anatomy'), [])
  const five = four.replace('## Exit {minutes=5}', '## A fifth segment {minutes=12}\n\n:::instrument ins=INS-z3 cell=5 recorded=RUN-z3-starter\n@call key=A run=RUN-z3-starter\nWhat now?\n\n- A. `sat`\n  - why: A transfer exists.\n- B. `unsat`\n  - why: None exists.\n  - mis: dp:Z5\n:::\n\n::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class\n\n## Exit {minutes=5}')
  assert.match(errors(await lesson(five)).find((f) => f.check === 'anatomy').detail, /2 to 4 segments.*this one has 5/)
})

test('a core segment has an instrument cell, asks for a call on its first run, and ends in a graded item', async () => {
  const detail = async (text) => errors(await lesson(text)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  assert.match(await detail(fixtureText(L1).replace(/:::instrument ins=INS-z3 cell=3[\s\S]*?\n:::\n/, '')), /segment 3 has no instrument cell/)
  // a free run is not a call, and a generated Call It is one
  const freeRun = fixtureText(L1).replace('cell=3 recorded=RUN-z3-optimize-min', 'cell=3 recorded=RUN-z3-optimize-min call=false').replace(/@call key=A run=RUN-z3-optimize-min[\s\S]*?mis: dp:Z3\n/, '')
  assert.ok(!freeRun.includes('@call key=A run=RUN-z3-optimize-min'))
  assert.match(await detail(freeRun), /segment 3 asks for no call on its first run/)
  assert.deepEqual(await detail(fixtureText(L1)), '')
  assert.match(await detail(fixtureText(L1).replace('::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class\n', '"Minimal" holds for every witness.\n')), /segment 3 ends in a graded item/)
})

test('a segment uses one tool: its cells run one instrument (spine section 4.1, "one tool per session")', async () => {
  const detail = async (text) => errors(await lesson(text)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  // a second cell of another instrument in segment 1
  const second = ':::instrument ins=INS-pglite cell=9 recorded=RUN-z3-demorgan call=false\nA second tool.\n\n```sql\nselect 1;\n```\n:::\n\n'
  const twoTools = fixtureText(L1).replace(':::instrument ins=INS-z3 cell=1 ', `${second}:::instrument ins=INS-z3 cell=1 `)
  assert.match(await detail(twoTools), /segment 1 runs INS-pglite and INS-z3: a segment uses one tool/)
  // two cells of one instrument stay a warning about the one instrument run, not this error
  const twoCells = fixtureText(L1).replace(':::instrument ins=INS-z3 cell=1 ', `${second.replace('INS-pglite', 'INS-z3')}:::instrument ins=INS-z3 cell=1 `)
  assert.doesNotMatch(await detail(twoCells), /one tool/)
})

test('a core lesson opens with prose or a prequestion, has one or two prequestions, exit items and a Build this card', async () => {
  const detail = async (text) => errors(await lesson(text)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  const opensWithCell = fixtureText(L1).replace(/(## Negating English \{[^}]*\}\n\n)([\s\S]*?)(:::instrument ins=INS-z3 cell=1[\s\S]*?\n:::\n)/, '$1$3')
  assert.match(await detail(opensWithCell), /opens with a hook and its prequestions/)
  assert.match(await detail(mutate(L1, /:::item role=prequestion family=GEN-negate-it template=t3[\s\S]*?\n:::\n\n/, '').replace(/:::item role=prequestion[\s\S]*?\n:::\n\n/, '')), /1 to 2 prequestions; this one has 0/)
  assert.match(await detail(fixtureText(L1).replace(/::item role=exit [^\n]*\n\n/g, '')), /exit items that create Today cards/)
  assert.match(await detail(fixtureText(L1).replace(/:::card variant=build-this[\s\S]*?:::\n/, '')), /"Build this" card/)
  assert.match(await detail(mutate(L1, 'variant=build-this title="Build this" lab=LAB-1.2', 'variant=build-this title="Build this"')), /"Build this" card/)
})

test('a core lesson is planned at 40 to 60 minutes: outside it is a warning, not a failure', async () => {
  assert.deepEqual(CORE.planned, [40, 60])
  const minutes = (a, b, c, exit) => fixtureText(L1).replace('{minutes=13 kcs=KC-1.quantifier-negation', `{minutes=${a} kcs=KC-1.quantifier-negation`).replace('## The violation query {minutes=13', `## The violation query {minutes=${b}`).replace('## One witness, one class {minutes=14', `## One witness, one class {minutes=${c}`).replace('## Exit {minutes=5}', `## Exit {minutes=${exit}}`)
  assert.deepEqual(warns(await lesson(fixtureText(L1))), [])
  const short = await lesson(minutes(12, 12, 12, 3))
  assert.deepEqual(errors(short), [])
  assert.match(warns(short)[0].detail, /planned at 40 to 60 minutes; this one adds up to 39/)
  const long = await lesson(minutes(15, 15, 15, 16))
  assert.deepEqual(errors(long), [])
  assert.match(warns(long)[0].detail, /adds up to 61/)
  assert.deepEqual(warns(await lesson(minutes(12, 12, 12, 4))), [])
})

test('a bridge has one prequestion tagged with every component, a call, a graded item, an exit item and a dated reading pointer', async () => {
  const detail = async (text) => errors(await lesson(text, L2)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  assert.equal(await detail(fixtureText(L2)), '')
  assert.match(await detail(fixtureText(L2).replace('kcs=KC-1.three-answers,KC-1.unknown-fails-closed\n@choice', 'kcs=KC-1.three-answers\n@choice')), /leaves out KC-1.unknown-fails-closed/)
  // no cell with a call is a warning (a bridge whose instrument is a link-out has none); a cell that asks for a call and carries none is an error
  const noCell = fixtureText(L2).replace(/:::instrument[\s\S]*?\n:::\n\n/, '')
  assert.equal(await detail(noCell), '')
  assert.match(warns(await lesson(noCell, L2))[0].detail, /instrument cells with Call It on their first runs: this one has no cell with a @call/)
  assert.match(await detail(fixtureText(L2).replace(/@call key=C run=RUN-z3-unknown-pow[\s\S]*?(?=\n@after)/, '')), /cell 1 asks for a call on its first run but carries none/)
  assert.match(await detail(fixtureText(L2).replace('::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers', 'The answer is a statement about a query.')), /one graded item/)
  assert.match(await detail(fixtureText(L2).replace(/::item role=exit [^\n]*\n\n/, '')), /exit item/)
  assert.match(await detail(fixtureText(L2).replace(/:::card variant=reading[\s\S]*?:::\n\n/, '')), /dated, section-level pointer/)
  assert.match(await detail(fixtureText(L2).replace('Read 2026-10-23.', 'Read it last week.')), /reading pointer is dated/)
  assert.match(await detail(fixtureText(L2).replace(/(:::item role=prequestion[\s\S]*?\n:::\n)/, '$1\n::item role=prequestion family=GEN-call-it template=t2 kcs=KC-1.three-answers\n')), /1 prequestion; this one has 2/)
})

test('a bridge\'s prequestion is tagged with the components the bridge introduces: one that an earlier lesson lists is not counted', async () => {
  const detail = async (text, file = L2) => errors(await lesson(text, file)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  const kcs = 'kcs: [KC-1.three-answers, KC-1.unknown-fails-closed]'
  const tags = 'kcs=KC-1.three-answers,KC-1.unknown-fails-closed\n@choice'
  // S1.L1 lists KC-1.witness-class, so S1.L2 may list it again without tagging it
  const listsEarlier = mutate(L2, kcs, 'kcs: [KC-1.three-answers, KC-1.unknown-fails-closed, KC-1.witness-class]')
  assert.equal(await detail(listsEarlier), '')
  // ... and a new component must still be tagged
  const leavesOutNew = listsEarlier.replace(tags, 'kcs=KC-1.three-answers\n@choice')
  assert.notEqual(leavesOutNew, listsEarlier)
  const missing = await detail(leavesOutNew)
  assert.match(missing, /leaves out KC-1.unknown-fails-closed/)
  assert.doesNotMatch(missing, /KC-1.witness-class/)
  // a component that only a later lesson lists is introduced here: S1.L4 lists KC-1.two-state-property
  assert.match(await detail(mutate(L2, kcs, 'kcs: [KC-1.three-answers, KC-1.unknown-fails-closed, KC-1.two-state-property]')), /leaves out KC-1.two-state-property/)
  // the spine's S1.L4: it lists KC-1.two-state-property and KC-1.witness-class (S1.L1's), and tags the first
  const l4 = fixtureText(L2).replace('id: S1.L2', 'id: S1.L4').replace(kcs, 'kcs: [KC-1.two-state-property, KC-1.witness-class]').replace(tags, 'kcs=KC-1.two-state-property\n@choice')
  assert.equal(await detail(l4, 'content/stages/S1/S1.L4.md'), '')
  // the same lesson with its prequestion tagged with neither component
  assert.match(await detail(l4.replace('kcs=KC-1.two-state-property\n@choice', 'kcs=KC-1.three-answers\n@choice'), 'content/stages/S1/S1.L4.md'), /leaves out KC-1.two-state-property/)
  // a bridge whose every component an earlier lesson lists has nothing new to tag
  assert.equal(await detail(l4.replace('kcs: [KC-1.two-state-property, KC-1.witness-class]', 'kcs: [KC-1.witness-class]').replace('kcs=KC-1.two-state-property\n@choice', 'kcs=KC-1.violation-as-sat\n@choice'), 'content/stages/S1/S1.L4.md'), '')
})

test('env.kcsBefore: the components that a lesson earlier in roadmap order lists', () => {
  const before = (id) => env.kcsBefore(id)
  assert.deepEqual([...before('S1.L0')], [])
  assert.ok(before('S1.L2').has('KC-1.witness-class'), 'S1.L1 lists it')
  assert.ok(before('S1.L2').has('KC-1.violation-as-sat'), 'S1.L0 and S1.L1 list it')
  assert.ok(!before('S1.L2').has('KC-1.three-answers'), 'its own')
  assert.ok(!before('S1.L2').has('KC-1.two-state-property'), 'a later lesson\'s')
  assert.ok(before('S1.L4').has('KC-1.witness-class'))
  assert.ok(before('S2.L0').has('KC-1.encoding-is-the-claim'), 'every S1 lesson is before S2.L0')
  assert.ok(!before('S1.L5').has('KC-1.encoding-is-the-claim'))
  assert.deepEqual([...before('not a lesson')], [])
  assert.deepEqual([...before('')], [])
})

test('a bridge is at most 1,000 words of what a learner reads, code left out', async () => {
  assert.equal(BRIDGE.words, 1000)
  const { wordCount, maskForWords } = await import('./lib/text.mjs')
  const filler = (n) => Array.from({ length: n }, (_, i) => `w${i % 9}`).join(' ')
  const base = fixtureText(L2)
  const readWords = (text) => env.content.copyOf(env.content.parsePageSource(text).record).reduce((n, s) => n + wordCount(maskForWords(s.text)), 0)
  const count = readWords(base)
  // the plant of a bridge one word over the limit counts on this number (lib/plants.mjs)
  assert.equal(count, BRIDGE_FIXTURE_WORDS, `the fixture bridge has ${count} words: set BRIDGE_FIXTURE_WORDS in lib/plants.mjs to it`)
  const at = async (total) => {
    const text = base.replace('The solver answers for one query, one encoding and one run.', `The solver answers for one query, one encoding and one run. ${filler(total - count)}`)
    assert.equal(readWords(text), total)
    return errors(await lesson(text, L2)).filter((f) => f.check === 'anatomy')
  }
  assert.deepEqual(await at(1000), [])
  assert.match((await at(1001))[0].detail, /at most 1000 words; this one has 1001/)
  // code is not read: a long code block adds nothing
  const code = base.replace('s = Solver()', `${Array.from({ length: 900 }, (_, i) => `# comment ${i}`).join('\n')}\ns = Solver()`)
  assert.notEqual(code, base)
  assert.deepEqual(errors(await lesson(code, L2)).filter((f) => f.check === 'anatomy'), [])
})

test('Boot is at most 8 minutes, asks for one call and ends with the "this will feel harder" card', async () => {
  assert.equal(BOOT.minutes, 8)
  const detail = async (text) => errors(await lesson(text, L0)).filter((f) => f.check === 'anatomy').map((f) => f.detail).join(' | ')
  assert.equal(await detail(fixtureText(L0)), '')
  assert.equal(await detail(mutate(L0, '## What it showed {minutes=3}', '## What it showed {minutes=4}')), '')
  assert.match(await detail(mutate(L0, '## What it showed {minutes=3}', '## What it showed {minutes=5}')), /at most 8 minutes on a phone; its segments add up to 9/)
  assert.match(await detail(fixtureText(L0).replace(/@call[\s\S]*?(?=\n@after)/, '')), /asks for one call/)
  assert.match(await detail(fixtureText(L0).replace(/:::card variant=feels-harder[\s\S]*?:::\n/, '')), /this will feel harder/)
})

test('Boot asks its call before the first run: the first cell carries it, or a fixed question comes before that cell', async () => {
  const detail = async (text) => errors(await lesson(text, L0)).filter((f) => f.rule === 'anatomy/boot-call').map((f) => f.detail).join(' | ')
  const CELL = ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant'
  const FREE = ':::instrument ins=INS-z3 cell=9 recorded=RUN-z3-boot-variant call=false\nThe same transfer, with no question first.\n\n```python\nprint(1)\n```\n:::\n\n'
  const QUESTION = ':::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n@choice key=B\nCould the sender go below zero?\n\n- A. No.\n  - why: The guard reads the wrong account.\n  - mis: dp:G8\n- B. Yes.\n  - why: The solver found one.\n:::\n\n'
  const freeCall = (text) => text.replace(CELL, `${CELL} call=false`).replace(/\n@call[\s\S]*?(?=\n@after)/, '')
  assert.equal(await detail(fixtureText(L0)), '')
  // a free run before the cell that carries the call: the learner sees a run before committing
  assert.match(await detail(mutate(L0, CELL, `${FREE}${CELL}`)), /before the first run: its first instrument cell carries the @call, or a fixed question comes before that cell/)
  // the only call a fixed question after the cell, which runs free
  assert.match(await detail(freeCall(fixtureText(L0)).replace('## What it showed {minutes=3}\n', `## What it showed {minutes=3}\n\n${QUESTION}`)), /before the first run/)
  // a fixed question before the free run asks the call first, and a page with no cell asks it as a fixed question
  assert.equal(await detail(freeCall(fixtureText(L0)).replace(CELL, `${QUESTION}${CELL}`)), '')
  assert.equal(await detail(fixtureText(L0).replace(/:::instrument[\s\S]*?\n:::\n/, QUESTION)), '')
  assert.match(await detail(fixtureText(L0).replace(/:::instrument[\s\S]*?\n:::\n/, '')), /before the first run/)
})

test('every lesson has a graded item, and an authored call is one (I1)', async () => {
  const detail = async (text, file) => (await lesson(text, file)).filter((f) => /finished by reading \(I1\)/.test(f.detail)).length
  const bare = `---\nid: S1.L2\ntier: bridge\ntitle: Three answers\ndraft: true\nkcs: [KC-1.three-answers]\nobjective: Say what each answer asserts.\n---\n\n## Read {minutes=15}\n\nJust reading.\n`
  assert.equal(await detail(bare, L2), 1)
  // a cell with a call is a graded interaction (Boot has no item), so I1 holds; the bridge's own rules still ask for an item
  const onlyCall = fixtureText(L2).replace(/::item role=[a-z]+ [^\n]*\n\n/g, '').replace(/:::item role=prequestion[\s\S]*?\n:::\n\n/, '')
  assert.equal(await detail(onlyCall, L2), 0)
  assert.equal(await detail(fixtureText(L0), L0), 0)
})

test('a capstone step is not a lesson: it has no anatomy', async () => {
  const text = `---\nid: S10.L1\ntier: step\ntitle: Step one\ndraft: true\nkcs: []\nobjective: Assemble the first piece.\n---\n\n## Step {minutes=30}\n\nBuild the first piece.\n`
  const f = await lintPage({ text, file: 'content/stages/S10/S10.L1.md', kind: 'lesson', env })
  assert.deepEqual(f.findings.filter((x) => x.check === 'anatomy'), [])
})

// ------------------------------------------------------------------ drawers

test('a drawer has the copy, block-type and no-lock rules, and no anatomy and no rail', async () => {
  const drawer = (text, id = 'D-03') => lintPage({ text, file: `content/drawers/${id}.md`, kind: 'drawer', env }).then((r) => r.findings)
  const d03 = fixtureText('content/drawers/D-03.md')
  assert.deepEqual(await drawer(d03), [])
  // no rail: a segment title may hold an option's word in a drawer
  assert.deepEqual(await drawer(d03.replace('## Try first {minutes=2}', '## What unsat means {minutes=2}')), [])
  // no anatomy: no segment of 12 to 15 minutes, no exit
  assert.deepEqual(checks(await drawer(d03)).includes('anatomy'), false)
  // the rules that apply
  assert.deepEqual(checks(await drawer(d03.replace('A recorded result,', 'Finish S1 first: this opens after the Defence. A recorded result,'))), ['lock'])
  assert.deepEqual(checks(await drawer(d03.replace('A recorded result,', 'The lane badge. A recorded result,'))), ['internal'])
  assert.deepEqual(checks(await drawer(d03.replace('A recorded result,', 'A Goal Replay. A recorded result,'))), ['term'])
  assert.deepEqual(checks(await drawer(d03.replace('::item role=prequestion', ':::figure\nx\n:::\n\n::item role=prequestion'))), ['block-type'])
})

test('a drawer sits at the end of the first stage that uses it, and a deferred drawer at no stage', async () => {
  const drawer = (text, id) => lintPage({ text, file: `content/drawers/${id}.md`, kind: 'drawer', env }).then((r) => r.findings)
  const d05 = `---\nid: D-05\ntitle: Induction, informally\ndraft: true\nkcs: [KC-1.quantifier-negation]\nobjective: See why induction works.\n---\n\n## Idea {minutes=3}\n\nA Goal Replay shows each goal. A seam is one place an assumption can hide.\n`
  assert.deepEqual(checks(await drawer(d05, 'D-05')), [])
  const d03 = fixtureText('content/drawers/D-03.md').replace('A recorded result,', 'A Goal Replay shows each goal. A recorded result,')
  assert.deepEqual(checks(await drawer(d03, 'D-03')), ['term'])
  const d33 = fixtureText('content/drawers/D-33.md').replace('The roadmap defers it', 'The Theater and the Clearinghouse come later. The roadmap defers it')
  assert.deepEqual(checks(await drawer(d33, 'D-33')), [])
})

test('a deferred drawer is its card alone: a topic, a reason and a trigger, no segments', async () => {
  const drawer = (text) => lintPage({ text, file: 'content/drawers/D-33.md', kind: 'drawer', env }).then((r) => r.findings)
  const d33 = fixtureText('content/drawers/D-33.md')
  assert.deepEqual(await drawer(d33), [])
  for (const key of ['topic', 'why', 'trigger']) {
    const f = await drawer(d33.replace(new RegExp(`^ {2}${key}: .*\\n`, 'm'), ''))
    assert.ok(f.some((x) => x.check === 'drawer' && x.detail.includes(`says its ${key}`)), key)
  }
  assert.ok((await drawer(`${d33}\n## A segment {minutes=1}\n\nText.\n`)).some((x) => x.check === 'drawer' && /no segments/.test(x.detail)))
  // a trigger that locks is lock copy
  assert.deepEqual(checks(await drawer(d33.replace('A claim or a parked goal carries the topic category-theory.', '"Finish S2 first, then this drawer opens after the Defence."'))), ['lock'])
})

// ------------------------------------------------------------------ stage and lab records

test('a stage or lab record sits at the end of its stage and is read for its copy', async () => {
  const stage = (text) => lintRecord({ text, file: 'content/stages/S1/stage.yaml', env }).then((r) => r.findings)
  const base = fixtureText('content/stages/S1/stage.yaml')
  assert.deepEqual(await stage(base), [])
  assert.deepEqual(checks(await stage(base.replace('Find a bug', 'On the Shelf, find a bug'))), ['internal'])
  assert.deepEqual(checks(await stage(base.replace('Find a bug', 'Finish S2 first, then find a bug'))), ['lock'])
  assert.deepEqual(checks(await stage(base.replace('Find a bug', 'A Goal Replay finds a bug'))), ['term'])
  assert.deepEqual(await stage(base.replace('Find a bug', 'Your claim, the Defence and a seam, then find a bug')), [])
  assert.deepEqual(checks(await stage(base.replace('variant: twin', 'variant: quiz'))), ['block-type'])
  assert.match((await stage(base.replace('variant: twin', 'variant: quiz')))[0].where, /^content\/stages\/S1\/stage\.yaml:\d+$/)
  const lab = (text) => lintRecord({ text, file: 'content/stages/S1/lab.yaml', env }).then((r) => r.findings)
  const labText = fixtureText('content/stages/S1/lab.yaml')
  assert.deepEqual(await lab(labText), [])
  assert.deepEqual(checks(await lab(labText.replace('Run the starter', 'The lane badge, then run the starter'))), ['internal'])
})

test('under extra, a string of one word is a name and not copy', async () => {
  const strings = recordStrings({ schema: 'statespace/lesson@1', id: 'LAB-1', summary: 'One two.', extra: { tools: ['lane-a'], hints: [{ rung: 'R0', note: 'A teach-back, compared with three ideas.' }] } })
  assert.deepEqual(strings.map((s) => s.path), ['/id', '/summary', '/extra/hints/0/note'])
  const lab = (text) => lintRecord({ text, file: 'content/stages/S1/lab.yaml', env }).then((r) => r.findings)
  assert.deepEqual(await lab(fixtureText('content/stages/S1/lab.yaml').replace('rung: R0', 'rung: R0\n      tool: lane-a')), [])
  assert.deepEqual(checks(await lab(fixtureText('content/stages/S1/lab.yaml').replace('A teach-back,', 'A lane for a teach-back,'))), ['internal'])
})

test('a placement walk is read where the caller places it: S1\'s closes Boot, so its copy uses Boot\'s terms', async () => {
  const placement = (text, at = [1, 0], boot = true) => lintRecord({ text, file: 'content/stages/S1/placement.yaml', env, at, boot }).then((r) => r.findings)
  const base = fixtureText('content/stages/S1/placement.yaml')
  assert.deepEqual(await placement(base), [])
  // it has no stage or lab ID to check: the caller says where it sits
  assert.deepEqual(await placement(base.replace('id: S1\n', '')), [])
  const offer = 'Know some logic already? An optional 15-minute check lets the course skip what you show.'
  assert.deepEqual(checks(await placement(base.replace(offer, 'Finish it to unlock S1.L3.'))), ['lock'])
  assert.deepEqual(checks(await placement(base.replace(offer, 'The pocket checker grades it.'))), ['internal'])
  assert.deepEqual(checks(await placement(base.replace(offer, 'It feeds your KC state.'))), ['internal'])
  const terms = await placement(base.replace(offer, 'Your lab and your receipt come later.'))
  assert.deepEqual(checks(terms), ['term', 'term'])
  assert.match(terms[0].detail, /^Boot's copy uses terms 1 to 5 only, and "lab" is term 7/)
  // S2's walk sits at the start of S2: S2's terms are open to it, and S3's are not
  assert.deepEqual(await placement(base.replace(offer, 'A Goal Replay shows each goal.'), [2, 0], false), [])
  assert.deepEqual(checks(await placement(base.replace(offer, 'An erosion comes next.'), [2, 0], false)), ['term'])
  assert.match((await placement(base.replace(offer, 'Finish it to unlock S1.L3.')))[0].where, /^content\/stages\/S1\/placement\.yaml:6$/)
})

test('a record field that holds IDs alone is data, and an ID in a sentence is copy', async () => {
  const scan = env.scanIds
  for (const data of ['GEN-negate-it', 'KC-1.witness-class', ' KC-1.a-b ', 'D-01, D-03', 'KC-1.witness-class · KC-1.violation-as-sat', 'placement:step-4/GEN-call-it/t1', 'S1']) assert.equal(onlyIds(data, scan), true, data)
  for (const copy of ['The idea KC-1.witness-class.', 'GEN-negate-it t1', 'pick (k = 4)', '', 'Shelf', 'GEN-call-it\nand more']) assert.equal(onlyIds(copy, scan), false, copy)
  const lab = (text) => lintRecord({ text, file: 'content/stages/S1/lab.yaml', env }).then((r) => r.findings)
  const base = fixtureText('content/stages/S1/lab.yaml')
  assert.deepEqual(await lab(base.replace('draft: true\n', 'draft: true\nkcs: [KC-1.violation-as-sat, KC-1.witness-class]\nfamily: GEN-find-the-witness\n')), [])
  assert.deepEqual(checks(await lab(base.replace('Project 00, the counterexample lab.', 'Project 00 practises KC-1.witness-class.'))), ['internal'])
})

test('a record that is not a stage or a lab, or does not read, is a finding', async () => {
  const record = (text) => lintRecord({ text, file: 'content/stages/S1/stage.yaml', env }).then((r) => r.findings)
  assert.deepEqual(checks(await record('schema: statespace/lesson@1\nid: X9\ndraft: true\n')), ['front'])
  assert.deepEqual(checks(await record('a: [unclosed\n')), ['read'])
})

// ------------------------------------------------------------------ the lab manual

test('labs/README.md is read for its copy: a design-notes cross-reference passes and a bare internal name does not', async () => {
  const doc = (text) => lintDocument({ text, file: 'labs/README.md', env }).then((r) => r.findings)
  assert.deepEqual(await doc(fixtureText('labs/README.md')), [])
  const f = await doc('# A manual\n\nA line.\n\nThe pocket checker runs offline.\n')
  assert.deepEqual(f.map((x) => [x.check, x.where]), [['internal', 'labs/README.md:5']])
  assert.deepEqual(await doc(fs.readFileSync(path.join(REPO, 'labs/README.md'), 'utf8')), [])
})
