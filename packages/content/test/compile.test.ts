import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Lesson } from '../src/index.ts'
import { checker, codes, compile, fixture, mutate, pageContext, realRuns } from './helpers.ts'

const built = (text = fixture('lessons/S1.L1.md'), file?: string, overrides = {}): Lesson => {
  const r = compile(text, file, overrides)
  assert.ok(r.compiled, `did not compile: ${JSON.stringify(r.problems)}`)
  return r.compiled.page
}
const cell = (page: Lesson): Extract<Lesson['segments'][number]['blocks'][number], { type: 'instrument' }> => {
  const b = page.segments[0]?.blocks.find((x) => x.type === 'instrument')
  assert.equal(b?.type, 'instrument')
  return b as never
}

test('the fixture lesson compiles with no error, and only the differences from the spine row as warnings', () => {
  const r = compile(fixture('lessons/S1.L1.md'))
  assert.deepEqual(codes(r, 'error'), [])
  assert.deepEqual(codes(r, 'warning'), ['row-differs', 'row-differs'])
  assert.ok(r.compiled)
  assert.equal(r.compiled.itemRevs, 3)
})

test('the built page is a valid lesson record', () => {
  assert.deepEqual(checker.page(built()), [])
})

test('the page carries the derived fields: minutes, rail, what it establishes, the runs it cites, who checked', () => {
  const page = built()
  assert.equal(page.minutes, 18)
  assert.deepEqual(page.rail, [{ id: 's1', title: 'Negating English' }, { id: 's2', title: 'Exit' }])
  assert.deepEqual(page.establishes, { claims: ['CL-1.1'], specimens: ['SP-1.1'] })
  assert.deepEqual(Object.keys(page.runs ?? {}), ['RUN-z3-starter'])
  assert.deepEqual(page.checkedBy, [{ run: 'RUN-z3-starter', engine: 'z3', version: '5.3.1' }])
  assert.deepEqual(page.unresolved, [])
  assert.match(page.rev ?? '', /^[0-9a-f]{64}$/)
  assert.deepEqual(Object.keys(page.runs?.['RUN-z3-starter'] ?? {}).includes('outputs'), false, 'the snapshot carries what the chip and sheet read, not the output list')
  assert.deepEqual(page.runs?.['RUN-z3-starter']?.verdict_lines?.[0], 'z3 version: 5.3.1')
})

test('references are resolved: a value is printed, a tag becomes a citation, a card gets its lab stage minutes and its runs', () => {
  const page = built()
  assert.match(cell(page).after ?? '', /returned \[b = 0, amount = 1, a = 0\]\./)
  const card = page.segments[1]?.blocks[1]
  assert.equal(card?.type, 'card')
  assert.match((card as { md: string }).md, /negative \{\{run:RUN-z3-starter\}\}\./)
  assert.equal((card as { minutes?: number }).minutes, 20)
  assert.deepEqual((card as { runs?: string[] }).runs, ['RUN-z3-starter'])
})

test('itemRev is stable, and changes with what the learner is asked or what a cited run says', () => {
  const rev = (page: Lesson, j: number): string => (page.segments[0]?.blocks[j] as { itemRev: string }).itemRev
  const a = built()
  const b = built()
  assert.equal(rev(a, 0), rev(b, 0))
  assert.notEqual(rev(a, 0), rev(a, 2), 'two items have two revisions')
  assert.match(rev(a, 0), /^[0-9a-f]{16}$/)
  // an edit to an option changes that item's revision and no other
  const edited = built(mutate('lessons/S1.L1.md', 'A model of this is a transfer that works', 'A model of this is a transfer that runs'))
  assert.notEqual(rev(edited, 0), rev(a, 0))
  assert.equal(rev(edited, 2), rev(a, 2))
  // an edit to prose changes no item
  const prose = built(mutate('lessons/S1.L1.md', 'A worked example first.', 'A worked example, first.'))
  assert.equal(rev(prose, 0), rev(a, 0))
  assert.equal(rev(prose, 2), rev(a, 2))
  assert.notEqual(prose.rev, a.rev)
  // a change to a cited run's record changes the cell's revision (a tool bump), and not an item that cites none
  const runs = realRuns(['RUN-z3-starter'])
  const record = structuredClone(runs.get('RUN-z3-starter')) as { values: { guarded: string } }
  record.values.guarded = 'sat'
  const bumped = built(undefined, undefined, { runs: new Map([['RUN-z3-starter', record]]) })
  assert.notEqual(rev(bumped, 2), rev(a, 2))
  assert.equal(rev(bumped, 0), rev(a, 0))
})

test('a generator template change changes the item revisions of its family', () => {
  const rev = (page: Lesson): string => (page.segments[0]?.blocks[0] as { itemRev: string }).itemRev
  const a = built()
  const t1 = built(undefined, undefined, { templateRev: (family: string) => (family === 'GEN-negate-it' ? 'one' : null) })
  const t2 = built(undefined, undefined, { templateRev: (family: string) => (family === 'GEN-negate-it' ? 'two' : null) })
  assert.notEqual(rev(a), rev(t1))
  assert.notEqual(rev(t1), rev(t2))
  assert.equal((t1.segments[1]?.blocks[0] as { itemRev: string }).itemRev, (a.segments[1]?.blocks[0] as { itemRev: string }).itemRev, 'another family is untouched')
})

test('the same source compiles to the same bytes', () => {
  assert.equal(JSON.stringify(built()), JSON.stringify(built()))
  const a = compile(fixture('lessons/S1.L1.md')).compiled
  const b = compile(fixture('lessons/S1.L1.md')).compiled
  assert.equal(a?.markdown, b?.markdown)
})

test('a drawer and a deferred drawer compile', () => {
  const drawer = built(fixture('drawers/D-03.md'), 'content/drawers/D-03.md')
  assert.equal(drawer.tier, undefined)
  assert.equal(drawer.minutes, 6)
  assert.equal(cell(drawer.segments[1] ? { ...drawer, segments: [drawer.segments[1]] } : drawer).callOnFirstRun, false)
  const deferred = built(fixture('drawers/D-33.md'), 'content/drawers/D-33.md')
  assert.deepEqual(deferred.segments, [])
  assert.deepEqual(deferred.rail, [])
  assert.equal(deferred.minutes, 0)
  assert.match(deferred.deferred?.trigger ?? '', /category-theory/)
})

type Fault = { name: string; text: string; code: string; line?: number; file?: string }
const L = 'lessons/S1.L1.md'
const faults: Fault[] = [
  { name: 'an unregistered KC', text: mutate(L, 'KC-1.witness-class', 'KC-1.typo-slug'), code: 'unknown-kc', line: 6 },
  { name: 'a segment component the registry lacks', text: mutate(L, 'kcs=KC-1.violation-as-sat}', 'kcs=KC-1.typo-slug}'), code: 'unknown-kc', line: 77 },
  { name: 'a tier the spine does not give', text: mutate(L, 'tier: core', 'tier: bridge'), code: 'tier-mismatch', line: 3 },
  { name: 'a file name that is not the ID', text: fixture(L), code: 'file-name', file: 'content/stages/S1/S1.L2.md' },
  { name: 'an ID the spine does not register', text: mutate(L, 'id: S1.L1', 'id: S1.L9'), code: 'id-unregistered', line: 2 },
  { name: 'a cell number used twice', text: mutate(L, '::specimen id=SP-1.1', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n:::\n\n::specimen id=SP-1.1'), code: 'cell-duplicate' },
  { name: 'a key that is not an option', text: mutate(L, '@choice key=B', '@choice key=E'), code: 'choice-key', line: 20 },
  { name: 'a wrong option without a misconception', text: mutate(L, '  - mis: dp:G3\n', ''), code: 'choice-mis', line: 28 },
  { name: 'a key with a misconception', text: mutate(L, '  - why: A transfer of 1 from an account holding 0 passes every premise.', '  - why: A transfer of 1 from an account holding 0 passes every premise.\n  - mis: dp:Z1'), code: 'choice-mis' },
  { name: 'a misconception the registry lacks', text: mutate(L, 'dp:G3', 'dp:Q99'), code: 'unknown-misconception' },
  { name: 'a generator family the spine lacks', text: mutate(L, 'family=GEN-negate-it', 'family=GEN-made-up'), code: 'unknown-generator', line: 19 },
  { name: 'a template the family does not have', text: mutate(L, 'family=GEN-negate-it template=t1', 'family=GEN-negate-it template=t9'), code: 'template-range', line: 19 },
  { name: 'an instrument the spine lacks', text: mutate(L, 'ins=INS-z3', 'ins=INS-nothing'), code: 'unknown-instrument', line: 40 },
  { name: 'a specimen the spine lacks', text: mutate(L, 'id=SP-1.1', 'id=SP-9.9'), code: 'unknown-specimen', line: 73 },
  { name: 'a claim template the spine lacks', text: mutate(L, 'template=CL-1.1', 'template=CL-9.9'), code: 'unknown-claim', line: 75 },
  { name: 'a lab stage the spine lacks', text: mutate(L, 'lab=LAB-1.2', 'lab=LAB-1.9'), code: 'unknown-lab-stage', line: 81 },
  { name: 'a Build this card with no lab stage', text: mutate(L, ' lab=LAB-1.2', ''), code: 'card-lab', line: 81 },
  { name: 'a lab stage on another kind of card', text: mutate(L, 'variant=build-this', 'variant=twin'), code: 'card-lab', line: 81 },
  { name: 'a drawer the spine lacks', text: mutate(L, 'drawers: [D-01, D-03]', 'drawers: [D-01, D-99]'), code: 'unknown-drawer', line: 12 },
  { name: 'raw HTML in prose', text: mutate(L, 'A worked example first.', '<div>A worked example</div> first.'), code: 'html' },
  { name: 'an image', text: mutate(L, 'A worked example first.', '![a plot](plot.png) A worked example first.'), code: 'image' },
  { name: 'a link that is not https', text: mutate(L, 'A worked example first.', '[a worked example](http://example.org) first.'), code: 'link' },
  { name: 'a javascript link', text: mutate(L, 'A worked example first.', '[a worked example](javascript:alert(1)) first.'), code: 'link' },
  { name: 'a reference in a title', text: mutate(L, '## Exit {minutes=5', '## Exit {{run:RUN-z3-starter}} {minutes=5'), code: 'rail' },
  { name: 'an answer in the rail', text: mutate(L, '## Negating English', '## What unsat means'), code: 'rail', line: 17 },
  { name: 'a schema fault: minutes of zero', text: mutate(L, '{minutes=13 ', '{minutes=0 '), code: 'schema', line: 17 },
  { name: 'a schema fault: no title', text: mutate(L, 'title: Negate, then search\n', ''), code: 'schema' },
  { name: 'a run the page is not allowed to wait for', text: mutate(L, 'draft: true', 'draft: false').replace('RUN-z3-starter#values.model', 'RUN-z3-bv64-negamt#values.verdict'), code: 'run-unresolved' },
  { name: 'a tag of a run that is not on disk', text: mutate(L, 'A worked example first.', 'A worked example first [X RUN-z3-bv64-negamt].'), code: 'run-tag' },
]
for (const f of faults) {
  test(`planted fault: ${f.name}`, () => {
    const r = compile(f.text, f.file ?? 'content/stages/S1/S1.L1.md')
    const hit = r.problems.find((p) => p.severity === 'error' && p.code === f.code)
    assert.ok(hit, `no ${f.code} error; got ${JSON.stringify(r.problems.map((p) => `${p.severity} ${p.code} @${p.line}`))}`)
    if (f.line !== undefined) assert.equal(hit.line, f.line, `${f.code} is reported at line ${hit.line}`)
    assert.equal(r.compiled, null, 'a page with an error compiles to nothing')
  })
}

test('a draft may wait for a run, and says which', () => {
  const r = compile(mutate(L, 'RUN-z3-starter#values.model', 'RUN-z3-bv64-negamt#values.verdict'))
  assert.deepEqual(codes(r, 'error'), [])
  assert.ok(r.problems.some((p) => p.severity === 'warning' && p.code === 'run-pending'))
  assert.deepEqual(r.compiled?.page.unresolved, ['RUN-z3-bv64-negamt'])
  assert.match(cell(r.compiled?.page as Lesson).after ?? '', /\{\{run:RUN-z3-bv64-negamt#values\.verdict\}\}/)
})

test('a cell that waits on its recorded run in a draft is a warning; in a final page an error', () => {
  const draft = compile(mutate(L, 'recorded=RUN-z3-starter', 'recorded=RUN-z3-boot-variant'))
  assert.deepEqual(codes(draft, 'error'), [])
  assert.deepEqual(draft.compiled?.page.unresolved, ['RUN-z3-boot-variant'])
  const final = compile(mutate(L, 'recorded=RUN-z3-starter', 'recorded=RUN-z3-boot-variant').replace('draft: true', 'draft: false'))
  assert.ok(codes(final, 'error').includes('run-unresolved'))
})

test('a drawer takes no Call It', () => {
  const text = fixture('drawers/D-03.md').replace('call=false\nA recorded result, opened as a free run.', 'call=true\nA recorded result.\n@call key=A\nQ?\n- A. one\n  - why: w\n- B. two\n  - why: w\n  - mis: dp:Z1')
  assert.ok(codes(compile(text, 'content/drawers/D-03.md'), 'error').includes('drawer-call'))
})

test('a deferred drawer carries its card, and a drawer that is not deferred does not', () => {
  assert.ok(codes(compile(fixture('drawers/D-33.md').replace(/deferred:[\s\S]*---\n$/, '---\n'), 'content/drawers/D-33.md'), 'error').length > 0)
  const extra = fixture('drawers/D-03.md').replace('previews:', 'deferred:\n  topic: t\n  why: w\n  trigger: g\nprevie_ws:').replace('previe_ws', 'previews')
  assert.ok(codes(compile(extra, 'content/drawers/D-03.md'), 'error').some((c) => c === 'deferred-card' || c === 'schema'))
})

test('the warnings name how the page differs from the spine row', () => {
  const r = compile(fixture(L))
  const messages = r.problems.filter((p) => p.code === 'row-differs').map((p) => p.message)
  assert.ok(messages.some((m) => /leaves out GEN-find-the-witness/.test(m)))
  assert.ok(messages.some((m) => /uses CL-1\.1, which the row does not list/.test(m)))
})

test('pageContext gives the fixture its runs', () => {
  assert.equal(pageContext('x').runs.size, 2)
})

test('a segment component the page does not list is a warning', () => {
  const r = compile(mutate(L, 'kcs=KC-1.violation-as-sat}', 'kcs=KC-1.three-answers}'))
  assert.deepEqual(codes(r, 'error'), [])
  assert.ok(r.problems.some((p) => p.code === 'segment-kc' && p.severity === 'warning' && p.line === 77))
})

test('a title differs from the spine\'s as a warning, and a note in parentheses is not a difference', () => {
  const different = compile(mutate(L, 'title: Negate, then search', 'title: Negate and search'))
  assert.deepEqual(codes(different, 'error'), [])
  assert.ok(different.problems.some((p) => p.code === 'title-differs' && p.line === 4))
  // the spine titles D-01 "A proof is not a test; reading a counterexample (continued in D-04, D-09 and D-21)"
  const drawer = fixture('drawers/D-03.md').replace('id: D-03', 'id: D-01').replace('title: Quantifiers and negation', 'title: A proof is not a test; reading a counterexample')
  const r = compile(drawer, 'content/drawers/D-01.md')
  assert.ok(!r.problems.some((p) => p.code === 'title-differs'))
})

test('Boot\'s row lists a generator for its scheduled follow-up, which is no block, so it is not missing', () => {
  const boot = '---\nid: S1.L0\ntier: boot\ntitle: \'Boot: "safe, 200 tests green"\'\ndraft: true\nkcs: [KC-1.violation-as-sat]\n---\n\n## The pull request {minutes=2}\n\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n:::\n\n::specimen id=SP-1.1\n::specimen id=SP-1.4 mount=false\n::specimen id=SP-1.9 mount=false\n'
  const r = compile(boot, 'content/stages/S1/S1.L0.md')
  assert.deepEqual(codes(r, 'error'), [])
  assert.deepEqual(r.problems.filter((p) => p.code === 'row-differs'), [])
})

test('a cell that asks for a call carries one: a warning in a draft, an error in a final page', () => {
  const noCall = fixture('lessons/S1.L1.md').replace(/@call key=B[\s\S]*?\n@after/, '@after')
  const draft = compile(noCall)
  assert.deepEqual(codes(draft, 'error'), [])
  assert.ok(draft.problems.some((p) => p.code === 'call-missing' && p.severity === 'warning' && p.line === 40))
  assert.ok(codes(compile(noCall.replace('draft: true', 'draft: false')), 'error').includes('call-missing'))
  assert.ok(!compile(noCall.replace('recorded=RUN-z3-starter', 'recorded=RUN-z3-starter call=false')).problems.some((p) => p.code === 'call-missing'))
})
