import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildMisconceptionEntries } from '../src/evidence.ts'
import { buildRegistry, countEntries, diffRegistries, generateTypes, serializeRegistry } from '../src/registry.ts'
import { buildSpineEntries, drawerIdsIn, segmentAfter, stageOfLab, stageOfRef, TIERS } from '../src/spine.ts'
import { addRow, ROOT } from './helpers.ts'

const spine = readFileSync(`${ROOT}/docs/spine/SPINE.md`, 'utf8')
const evidence = readFileSync(`${ROOT}/docs/EVIDENCE.md`, 'utf8')

// A fixture with the shapes that matter for counting: Boot, core and bridge lessons in S1 and two
// capstone steps in S10, and the tab instruments that they use. (It lacks the other tables of the spine,
// so only counts and derived stages are read from it.)
const LESSONS_FIXTURE = `
### 3.1 S1 Counterexample (Z3Py) — "find a bug mathematically"

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S1.L0 | boot | Boot | o | KC-1.a | INS-z3 | GEN-call-it | SP-1.1 |
| S1.L1 | core | One | o | KC-1.a | INS-z3 | GEN-call-it | SP-1.1 |
| S1.L2 | bridge | Two | o | KC-1.b | INS-z3, INS-pocket | GEN-call-it | — |
| S1.L3 | bridge | Three | o | KC-1.c | INS-z3 | GEN-negate-it | CL-1.1 |

### 3.10 S10 Assembly — "assemble the Core"

| ID | Tier | Title | Observable objective | KCs | Built in · gate | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|---|
| S10.L1 | step | Parser | o | (S3 KCs) | LAB-3.8–LAB-3.9, after S3 · golden tests | INS-lane-a | — | — |
| S10.L2 | step | Oracle | o | (S3 KCs) | LAB-3.10–LAB-3.11, after S3 · [T] | INS-lane-a, INS-interp | — | CL-3.5 |

### 9.1 Tab instruments (instrument origin unless the origin note names another)

| ID | Engine and pin | Used in | Honest limits |
|---|---|---|---|
| INS-z3 | z | S1 | l |
| INS-pocket | p | S1 | l |
| INS-interp | i | S10 | l |
| INS-lane-a | h | S3 (LAB-3), S10 | l |
`

test('[step] IDs are lessons by shape and are excluded from every lesson count', () => {
  const { entries } = buildSpineEntries(LESSONS_FIXTURE)
  const lessons = entries.filter((e) => e.kind === 'lesson')
  assert.equal(lessons.length, 6, 'S1.L0–S1.L3 and S10.L1–S10.L2 are all lesson-shaped IDs')
  assert.deepEqual(
    lessons.filter((e) => e.tier === 'step').map((e) => e.id),
    ['S10.L1', 'S10.L2'],
  )
  const counts = countEntries(entries)
  assert.equal(counts.lessons, 3, 'one core and two bridge lessons: not Boot, not the two steps')
  assert.equal(counts.core, 1)
  assert.equal(counts.bridge, 2)
  assert.equal(counts.boot, 1)
  assert.equal(counts.steps, 2)
  assert.equal((counts.lessons ?? 0) + (counts.boot ?? 0) + (counts.steps ?? 0), lessons.length)
})

test('steps count towards Used in, and Lane A also counts the labs a step is built in', () => {
  const { entries } = buildSpineEntries(LESSONS_FIXTURE)
  const stages = (id: string): string[] | undefined => entries.find((e) => e.id === id)?.stages
  assert.equal(entries.find((e) => e.id === 'S10.L1')?.builtIn?.join(), 'LAB-3.8,LAB-3.9')
  assert.deepEqual(stages('INS-z3'), ['S1'])
  assert.deepEqual(stages('INS-pocket'), ['S1'])
  assert.deepEqual(stages('INS-interp'), ['S10'], 'S10.L2 names it; only Lane A takes the labs of the Built in column')
  assert.deepEqual(stages('INS-lane-a'), ['S3', 'S10'], 'S3 through LAB-3, named by S10.L1 and S10.L2; S10 through the steps')
})

test('the real spine builds with no problems', () => {
  const { entries, problems } = buildSpineEntries(spine)
  assert.deepEqual(problems, [])
  for (const e of entries.filter((x) => x.kind === 'lesson')) {
    assert.ok(TIERS.includes(e.tier ?? ''), `${e.id}: tier ${e.tier}`)
    assert.equal(stageOfRef(e.id), e.stage)
    assert.equal(e.section, `3.${(e.stage ?? '').slice(1)}`)
  }
  const steps = entries.filter((e) => e.kind === 'lesson' && e.tier === 'step')
  assert.deepEqual(
    steps.map((e) => e.stage),
    steps.map(() => 'S10'),
    'capstone steps sit in S10',
  )
  const boot = entries.filter((e) => e.kind === 'lesson' && e.tier === 'boot')
  assert.deepEqual(boot.map((e) => e.id), ['S1.L0'])
})

test('every ID of the registry is unique, in its kind format, and has a section', () => {
  const { registry, problems } = buildRegistry(spine, evidence)
  assert.deepEqual(problems, [])
  const seen = new Set<string>()
  for (const e of registry.entries) {
    assert.ok(!seen.has(e.id), `duplicate ${e.id}`)
    seen.add(e.id)
    assert.match(e.section, /^\d+(\.\d+)?$/, e.id)
    assert.ok(e.src === 'spine' || e.src === 'evidence', e.id)
  }
})

test('a malformed table, a duplicate ID and a missing table are problems, not a shorter registry', () => {
  const extraCell = addRow(spine, '| ID | Purpose | Evidence |', '| M-extra-cell | a | b | c | d | surplus |')
  assert.ok(buildSpineEntries(extraCell).problems.some((p) => /cells, the header has 5/.test(p.message)))

  const dup = addRow(spine, '| ID | Purpose | Evidence |', '| M-call-it | a | b | c | d |')
  assert.ok(buildSpineEntries(dup).problems.some((p) => p.message.includes('ID M-call-it is defined twice')))

  const noScreens = spine.replace('| ID | Purpose | Phone | Key components |', '| Name | Purpose | Phone | Key components |')
  assert.ok(buildSpineEntries(noScreens).problems.some((p) => p.message.includes('expected 1 table(s) for "screens", found 0')))

  const wrongStage = addRow(
    spine,
    '| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |',
    '| S9.L1 | core | Misfiled | o | KC-1.a | INS-z3 | GEN-call-it | — |',
  )
  assert.ok(buildSpineEntries(wrongStage).problems.some((p) => /lesson S9\.L1 sits in the table of S1/.test(p.message)))
})

test('stage and lab arithmetic', () => {
  assert.equal(stageOfLab('LAB-3'), 'S3')
  assert.equal(stageOfLab('LAB-10'), 'S10')
  assert.equal(stageOfRef('LAB-6.c4'), 'S6')
  assert.equal(stageOfRef('S9.L2'), 'S9')
  assert.equal(stageOfRef('KC-1.x'), null)
})

test('drawer references of a stage spec: the Drawers and Sibling bridges paragraphs, ranges expanded', () => {
  const line = '**Audit anchors.** AUD-7.1. **Drawers.** D-10 (note), D-16; the deferred drawers D-30–D-32. **Production twins.** x D-99. **Sibling bridges.** card D-21.'
  assert.deepEqual(drawerIdsIn(segmentAfter(line, 'Drawers') ?? ''), ['D-30', 'D-31', 'D-32', 'D-10', 'D-16'])
  assert.deepEqual(drawerIdsIn(segmentAfter(line, 'Sibling bridges') ?? ''), ['D-21'])
  assert.equal(segmentAfter(line, 'Capstone'), null)
})

test('misconception keys: catalog rows plus the ranges proposed in section 6.11', () => {
  const doc = [
    '## 6. Misconception catalog by stage',
    '### 6.1 Ground',
    '| ID | Misconception | Where |',
    '|---|---|---|',
    '| G1 | a | b |',
    '| Z1 | a | b |',
    '### 6.11 Proposed extensions and the promotion rule',
    'The specs propose `dp:Z6`–`dp:Z8` (S1), `dp:L9` (S2) and `dp:S5`–`dp:S6`; the drawers spec proposes `dp:G10`.',
  ].join('\n')
  const { entries, problems } = buildMisconceptionEntries(doc)
  assert.deepEqual(
    entries.map((e) => [e.id, e.proposed]),
    [
      ['dp:G1', false],
      ['dp:Z1', false],
      ['dp:Z6', true],
      ['dp:Z7', true],
      ['dp:Z8', true],
      ['dp:S5', true],
      ['dp:S6', true],
      ['dp:L9', true],
      ['dp:G10', true],
    ],
  )
  assert.ok(problems.some((p) => /expected 10 misconception tables/.test(p.message)), 'the fixture has one table')
})

test('the generated files are deterministic, and a registry diff names added, removed and changed IDs', () => {
  const { registry } = buildRegistry(spine, evidence)
  assert.equal(serializeRegistry(registry), serializeRegistry(buildRegistry(spine, evidence).registry))
  assert.equal(generateTypes(registry), generateTypes(buildRegistry(spine, evidence).registry))
  const planted = buildRegistry(addRow(spine, '| ID | Purpose | Evidence |', '| M-planted | p | e | u | d |'), evidence).registry
  assert.deepEqual(diffRegistries(registry, planted), { added: ['M-planted'], removed: [], retyped: [], changed: [] })
  assert.deepEqual(diffRegistries(planted, registry), { added: [], removed: ['M-planted'], retyped: [], changed: [] })
  const title = registry.entries.find((e) => e.id === 'S1.L1')?.title ?? ''
  const retitled = buildRegistry(spine.replace(`| S1.L1 | core | ${title} |`, `| S1.L1 | core | ${title} (renamed) |`), evidence).registry
  assert.deepEqual(diffRegistries(registry, retitled), { added: [], removed: [], retyped: [], changed: ['S1.L1'] })
})
