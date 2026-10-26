import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DRAFT_BANNER, plainRefs, renderMarkdown, tierFormat } from '../src/index.ts'
import type { Lesson } from '../src/index.ts'
import { compile, fixture, index, mutate, readmeFences, realRuns } from './helpers.ts'

const md = (text = fixture('lessons/S1.L1.md'), file?: string): string => {
  const r = compile(text, file)
  assert.ok(r.compiled, JSON.stringify(r.problems))
  return r.compiled.markdown
}

test('the Markdown carries the title, the draft banner, the format and the rail', () => {
  const text = md()
  assert.match(text, /^# S1\.L1 · Negate, then search\n\n> Draft: first-learner pass pending\.\n\n\*\*Format\.\*\* Full lesson, about 18 minutes\./)
  assert.ok(text.includes(DRAFT_BANNER))
  assert.match(text, /\*\*Segments\.\*\*\n\n1\. Negating English\n2\. Exit\n/)
  assert.match(text, /## Negating English \(13 min\)/)
})

test('a page that is not a draft has no banner', () => {
  assert.ok(!md(mutate('lessons/S1.L1.md', 'draft: true', 'draft: false')).includes('Draft:'))
})

test('the Markdown holds what the learner reads before a call, and never what the call is for', () => {
  const text = md()
  // the questions and their options are there
  assert.ok(text.includes('Which formula do you hand the solver to hunt for a bug?'))
  assert.ok(text.includes('- B. `allowed ∧ bal′ < 0`'))
  assert.ok(text.includes('What will Z3 return for this query?'))
  // no key, no why, no misconception, no forecast, no text that follows the first run
  for (const secret of ['A model of this is a transfer that works', 'The negation of "for every allowed transfer', 'passes every premise', 'dp:', 'surprise', 'key=', 'Z3 searched every whole-number input', '[b = 0, amount = 1, a = 0]']) {
    assert.ok(!text.includes(secret), `the Markdown holds ${JSON.stringify(secret)}`)
  }
  assert.match(text, /Text that follows the first run is left out here\./)
})

test('cells show their code, their tap and their recorded run', () => {
  const text = md()
  assert.match(text, /```python\nfrom z3 import \*/)
  assert.match(text, /After a run, you tap one of "so the sender never ends below zero holds", "so it is violated" and "can't tell"\./)
  assert.match(text, /Recorded run: RUN-z3-starter \(z3 5\.3\.1\)\./)
})

test('a generated item says it has no fixed answer', () => {
  assert.match(md(), /\*\*Question\*\* \(exit question\): a fresh practice question, made and checked by a tool/)
})

test('specimens, claims and cards read as plain lines, and a card is a quotation', () => {
  const text = md()
  assert.match(text, /\*\*Specimen SP-1\.1\*\* is mounted in your cabinet here\./)
  assert.match(text, /\*\*Claim card CL-1\.1\*\* is minted here/)
  assert.match(text, /> \*\*Build this\*\* · LAB-1\.2, about 20 minutes\n>\n> Next, find a transfer that makes the source balance negative \(run RUN-z3-starter\)\./)
})

test('footnote labels stay unique across the blocks of one document', () => {
  const text = md(mutate('lessons/S1.L1.md', '::specimen id=SP-1.1', 'Another note.[^1]\n\n[^1]: A second footnote with the same label.\n\n::specimen id=SP-1.1'))
  const labels = [...text.matchAll(/^\[\^([^\]]+)\]:/gm)].map((m) => m[1])
  assert.equal(new Set(labels).size, labels.length)
  assert.equal(labels.length, 2)
})

test('the runs cited are listed by ID, engine and version, and a run that waits is said not to be recorded', () => {
  assert.match(md(), /## Runs cited\n\n- RUN-z3-starter \(z3 5\.3\.1\)\n/)
  const pending = md(mutate('lessons/S1.L1.md', 'RUN-z3-starter#values.model', 'RUN-z3-bv64-negamt#values.verdict'))
  assert.match(pending, /- RUN-z3-bv64-negamt \(not recorded yet\)/)
})

/** What a cited run says about itself: its title says what it found, and its verdict lines and notes say more. */
const sayings = (page: Lesson): string[] =>
  Object.values(page.runs ?? {}).flatMap((r) => [r.title, ...(r.verdict_lines ?? []), ...(r.notes ?? [])].filter((t): t is string => typeof t === 'string' && t.trim() !== ''))

test('no cited run title, verdict line or note reaches the Markdown, for the fixture lesson and for the README example', () => {
  const example = readmeFences('markdown')[0]
  assert.ok(example, 'the README has an example page')
  const pages = [
    ['the fixture lesson', compile(fixture('lessons/S1.L1.md'))],
    ['the README example', compile(example, 'content/stages/S1/S1.L2.md', { runs: realRuns(['RUN-z3-unknown-pow']) })],
  ] as const
  for (const [name, r] of pages) {
    assert.ok(r.compiled, `${name} compiles`)
    const said = sayings(r.compiled.page)
    assert.ok(said.length >= 3, `${name} cites runs that say something to leak`)
    for (const text of said) assert.ok(!r.compiled.markdown.includes(text), `${name}: the Markdown holds ${JSON.stringify(text.slice(0, 70))}`)
  }
  // the titles the verifier found in the Markdown, by name
  const lesson = pages[0][1].compiled
  const example2 = pages[1][1].compiled
  assert.ok(lesson && !lesson.markdown.includes('an overdraft witness, then unsat'))
  assert.ok(example2 && !example2.markdown.includes('gives unknown, incomplete'))
})

test('Boot says "result" where every other page says "run", because the course introduces the word with S1.L1', () => {
  const text = md(fixture('lessons/S1.L0.md'), 'content/stages/S1/S1.L0.md')
  assert.match(text, /^# S1\.L0 · Start here\n/)
  assert.match(text, /\*\*Format\.\*\* Start here, about 5 minutes\./)
  assert.match(text, /\*\*Your call before you see the result:\*\*/)
  assert.match(text, /After the result, you tap one of/)
  assert.match(text, /Recorded result: RUN-z3-starter \(z3 5\.3\.1\)\./)
  assert.match(text, /Text that follows the first result is left out here\./)
  assert.match(text, /## Results cited\n\n- RUN-z3-starter \(z3 5\.3\.1\)\n/)
  assert.deepEqual(text.replace(/RUN-[a-z0-9-]+/g, '').match(/\brun(?:s)?\b/gi), null, 'no "run" outside a run ID')
  // the same page under another tier is a page that says "run"
  const boot = compile(fixture('lessons/S1.L0.md'), 'content/stages/S1/S1.L0.md').compiled
  assert.ok(boot)
  const core = renderMarkdown({ ...boot.page, tier: 'core' }, index)
  assert.match(core, /Recorded run: RUN-z3-starter/)
  assert.match(core, /## Runs cited/)
})

test('a drawer and a deferred drawer read as drawers, and a deferred one keeps its card', () => {
  const drawer = md(fixture('drawers/D-03.md'), 'content/drawers/D-03.md')
  assert.match(drawer, /\*\*Format\.\*\* Drawer: side material, always open, about 6 minutes\./)
  const deferred = md(fixture('drawers/D-33.md'), 'content/drawers/D-33.md')
  assert.match(deferred, /\*\*Format\.\*\* Deferred drawer: always open, and it unlocks nothing\./)
  assert.match(deferred, /\*\*What it is\.\*\*\n\nThe mathematics of structure/)
  assert.match(deferred, /\*\*Why the roadmap defers it\.\*\*/)
  assert.match(deferred, /\*\*What surfaces it\.\*\*/)
})

test('plainRefs turns reference forms into words and prints a fact', () => {
  const page = { facts: { 'tool.z3.pypi-latest': { id: 'tool.z3.pypi-latest', kind: 'tool', value: '5.3.1.0' } } } as never
  assert.equal(plainRefs('Seen {{run:RUN-z3-starter}}. Latest {{fact:tool.z3.pypi-latest}}.', page), 'Seen (run RUN-z3-starter). Latest 5.3.1.0.')
})

test('the plain formats learners see for the tiers', () => {
  assert.deepEqual(['boot', 'core', 'bridge', 'step'].map((t) => tierFormat(t as 'boot')), ['Start here', 'Full lesson', 'Short lesson with reading', 'Capstone step'])
})
