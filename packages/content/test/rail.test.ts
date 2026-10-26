import assert from 'node:assert/strict'
import { test } from 'node:test'
import { railLeaks, railOf } from '../src/index.ts'
import type { Lesson } from '../src/index.ts'
import { compile, fixture } from './helpers.ts'

const lesson = (): Lesson => {
  const compiled = compile(fixture('lessons/S1.L1.md')).compiled
  assert.ok(compiled)
  return compiled.page
}

const withTitle = (title: string): Lesson => {
  const page = lesson()
  return { ...page, segments: page.segments.map((s, i) => (i === 0 ? { ...s, title } : s)) }
}

test('the rail is the segment titles and nothing else', () => {
  const page = lesson()
  assert.deepEqual(page.rail, [{ id: 's1', title: 'Negating English' }, { id: 's2', title: 'Exit' }])
  for (const entry of railOf(page)) assert.deepEqual(Object.keys(entry), ['id', 'title'])
  const json = JSON.stringify(page.rail)
  for (const secret of ['unsat', 'sat', 'unknown', 'allowed', 'Z3', 'key', 'why', 'RUN-']) assert.ok(!json.includes(secret), `the rail holds ${secret}`)
})

test('railOf takes the title of each segment and drops whatever else a segment carries', () => {
  const rail = railOf({ segments: [{ id: 's1', title: 'One', blocks: [1], minutes: 3 } as { id: string; title: string }] })
  assert.deepEqual(rail, [{ id: 's1', title: 'One' }])
})

test('a title that is an option of a question on the page leaks, and the fixture titles do not', () => {
  assert.deepEqual(railLeaks(lesson()), [])
  assert.match(railLeaks(withTitle('What unsat tells you'))[0]?.message ?? '', /holds "unsat", an option of a question on this page/)
  assert.match(railLeaks(withTitle('Why sat is not enough'))[0]?.message ?? '', /holds "sat"/)
  assert.equal(railLeaks(withTitle('A satisfying search')).length, 0, 'a word that merely contains an option is not the option')
})

test('a long option may not appear in a title, whatever its case or punctuation', () => {
  const page = lesson()
  const first = page.segments[0]?.blocks[0]
  assert.equal(first?.type, 'item')
  const long: Lesson = {
    ...page,
    segments: page.segments.map((s, i) =>
      i === 0
        ? {
            ...s,
            title: 'Why "Negating the premise as well" fails',
            blocks: s.blocks.map((b) =>
              b.type === 'item' && b.choice !== undefined
                ? { ...b, choice: { ...b.choice, options: b.choice.options.map((o) => (o.id === 'C' ? { ...o, text: 'Negating the premise as well, which the guard already rejects' } : o)) } }
                : b,
            ),
          }
        : s,
    ),
  }
  assert.equal(railLeaks(long).length, 0, 'a part of an option is not the option')
  const exact: Lesson = { ...long, segments: long.segments.map((s, i) => (i === 0 ? { ...s, title: 'NEGATING the premise as well, which the guard already rejects!' } : s)) }
  assert.match(railLeaks(exact)[0]?.message ?? '', /repeats an option/)
})

test('a title is plain text: no Markdown, code, link or reference', () => {
  for (const title of ['The `query`', 'A **bold** move', 'See [this](x)', 'a <b>', 'Run {{run:RUN-z3-starter}}', 'a | b']) {
    assert.match(railLeaks(withTitle(title))[0]?.message ?? '', /is not plain text/, title)
  }
})

test('options as common as "no" or "true" do not make a word of the title a leak', () => {
  const page = lesson()
  const yesNo: Lesson = {
    ...page,
    segments: page.segments.map((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.type === 'item' && b.choice !== undefined ? { ...b, choice: { ...b.choice, options: b.choice.options.map((o, i) => (i === 0 ? { ...o, text: 'No' } : o)) } } : b)),
    })),
  }
  assert.deepEqual(railLeaks({ ...yesNo, segments: yesNo.segments.map((s, i) => (i === 0 ? { ...s, title: 'No guard, no proof' } : s)) }), [])
})

test('two segments with the same title cannot be told apart in the rail', () => {
  const page = lesson()
  const twin: Lesson = { ...page, segments: page.segments.map((s) => ({ ...s, title: 'Same' })) }
  assert.match(railLeaks(twin)[0]?.message ?? '', /repeats the title of segment 1/)
})
