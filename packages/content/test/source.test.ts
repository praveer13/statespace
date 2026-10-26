import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lineOf, parsePageSource, stripComments } from '../src/build/index.ts'
import { aliasBomb, fixture } from './helpers.ts'

const page = (front: string, body: string): string => `---\n${front}\n---\n${body}`
const FRONT = 'id: S1.L1\ntier: core\ntitle: T\ndraft: true\nkcs: [KC-1.violation-as-sat]'
const messages = (text: string): string[] => parsePageSource(text).problems.map((p) => `${p.line ?? '?'}: ${p.message}`)

type Rec = { segments: Array<{ id: string; title: string; minutes: number; blocks: Array<Record<string, unknown>> }> } & Record<string, unknown>

test('the fixture lesson reads without a problem, into segments of blocks', () => {
  const r = parsePageSource(fixture('lessons/S1.L1.md'))
  assert.deepEqual(r.problems, [])
  const rec = r.record as Rec
  assert.equal(rec.schema, 'statespace/lesson@1')
  assert.equal(rec.id, 'S1.L1')
  assert.deepEqual(rec.segments.map((s) => [s.id, s.title, s.minutes]), [['s1', 'Negating English', 13], ['s2', 'Exit', 5]])
  assert.deepEqual(rec.segments[0]?.blocks.map((b) => b.type), ['item', 'prose', 'instrument', 'specimen', 'claim'])
  assert.deepEqual(rec.segments[1]?.blocks.map((b) => b.type), ['item', 'card'])
})

test('a segment heading carries its minutes and its components', () => {
  const rec = parsePageSource(fixture('lessons/S1.L1.md')).record as Rec
  assert.deepEqual(rec.segments.map((s) => (s as { kcs?: string[] }).kcs), [['KC-1.quantifier-negation', 'KC-1.only-if-direction'], ['KC-1.violation-as-sat']])
  assert.match(messages(page(FRONT, '\n## S {minutes=5 kcs=KC-1.a extra=1}\nx\n')).join('\n'), /a segment heading takes no attribute extra/)
  assert.match(messages(page(FRONT, '\n## S {kcs=KC-1.a}\nx\n')).join('\n'), /segment heading needs minutes/)
})

test('a choice reads its question, its options with a why and a mis, and its key', () => {
  const rec = parsePageSource(fixture('lessons/S1.L1.md')).record as Rec
  const item = rec.segments[0]?.blocks[0] as { choice: { prompt: string; options: Array<{ id: string; text: string; why: string; mis?: string }>; key: string; surprise: string } }
  assert.equal(item.choice.key, 'B')
  assert.equal(item.choice.surprise, 'moderate')
  assert.match(item.choice.prompt, /^The property: every allowed transfer/)
  assert.deepEqual(item.choice.options.map((o) => [o.id, o.mis]), [['A', 'dp:Z1'], ['B', undefined], ['C', 'dp:G3'], ['D', 'dp:G4']])
  assert.equal(item.choice.options[1]?.text, '`allowed ∧ bal′ < 0`')
  assert.match(item.choice.options[1]?.why ?? '', /^The negation of "for every allowed transfer/)
})

test('a cell reads its code, its sections and its call, in the schema order', () => {
  const rec = parsePageSource(fixture('lessons/S1.L1.md')).record as Rec
  const cell = rec.segments[0]?.blocks[2] as Record<string, unknown>
  assert.deepEqual(Object.keys(cell), ['type', 'ins', 'cell', 'callOnFirstRun', 'recorded', 'md', 'direction', 'code', 'tap', 'call', 'after'])
  assert.equal(cell.callOnFirstRun, true)
  assert.deepEqual(cell.code, { lang: 'python', text: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\nprint(s.check())" })
  assert.deepEqual(cell.tap, { property: 'the sender never ends below zero' })
  assert.equal((cell.call as { keyRun: string }).keyRun, 'RUN-z3-starter')
})

test('lines are kept for the nodes the reader can place, and lineOf falls back to the nearest ancestor', () => {
  const r = parsePageSource(fixture('lessons/S1.L1.md'))
  assert.equal(lineOf(r.lines, '/id'), 2)
  assert.equal(lineOf(r.lines, '/segments/1'), 77)
  assert.equal(lineOf(r.lines, '/segments/0/blocks/0'), 19)
  assert.equal(lineOf(r.lines, '/segments/0/blocks/0/choice/options/2'), 28)
  assert.equal(lineOf(r.lines, '/segments/0/blocks/2/call/surprise'), 57)
  assert.equal(lineOf(r.lines, '/nonexistent'), 1)
})

test('a call defaults to the first run in a lesson and to a free run in a drawer, and call= overrides it', () => {
  const block = ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n:::'
  const lesson = parsePageSource(page(FRONT, `\n## S {minutes=5}\n${block}\n`)).record as Rec
  assert.equal(lesson.segments[0]?.blocks[0]?.callOnFirstRun, true)
  const drawer = parsePageSource(page('id: D-03\ntitle: T\ndraft: true\nkcs: []', `\n## S {minutes=5}\n${block}\n`)).record as Rec
  assert.equal(drawer.segments[0]?.blocks[0]?.callOnFirstRun, false)
  const off = parsePageSource(page(FRONT, `\n## S {minutes=5}\n${block.replace('recorded=RUN-z3-starter', 'recorded=RUN-z3-starter call=false')}\n`)).record as Rec
  assert.equal(off.segments[0]?.blocks[0]?.callOnFirstRun, false)
})

test('a leaf block with no body takes one line, and a body is refused', () => {
  const ok = parsePageSource(page(FRONT, '\n## S {minutes=5}\n::claim template=CL-1.1\n::specimen id=SP-1.1 mount=false\n')).record as Rec
  assert.deepEqual(ok.segments[0]?.blocks, [{ type: 'claim', template: 'CL-1.1' }, { type: 'specimen', id: 'SP-1.1', mount: false }])
  assert.match(messages(page(FRONT, '\n## S {minutes=5}\n:::claim template=CL-1.1\nhello\n:::\n')).join('\n'), /a claim block has no body/)
})

test('HTML comments are removed outside code, and every line stays where it was', () => {
  const lines = ['a <!-- gone --> b', '<!-- starts', 'still a comment', 'ends --> kept', '```', '<!-- code stays -->', '```']
  assert.deepEqual(stripComments(lines), ['a  b', '', '', ' kept', '```', '<!-- code stays -->', '```'])
})

test('a code fence may hold lines that look like block syntax', () => {
  const body = '\n## S {minutes=5}\n\n```\n:::card variant=twin\n## not a heading\n```\n\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n```python\n:::\n@call\n```\n:::\n'
  const r = parsePageSource(page(FRONT, body))
  assert.deepEqual(r.problems, [])
  const rec = r.record as Rec
  assert.equal(rec.segments.length, 1)
  assert.deepEqual(rec.segments[0]?.blocks.map((b) => b.type), ['prose', 'instrument'])
  assert.equal((rec.segments[0]?.blocks[1]?.code as { text: string }).text, ':::\n@call')
})

test('an unknown block type is kept, so a gate can count it, and reported', () => {
  const r = parsePageSource(page(FRONT, '\n## S {minutes=5}\n:::figure caption="x"\nA drawing.\n:::\n'))
  assert.match(r.problems.map((p) => p.message).join('\n'), /figure is not a block type: the six are prose, instrument, item, claim, specimen and card/)
  assert.deepEqual((r.record as Rec).segments[0]?.blocks, [{ type: 'figure' }])
})

test('front matter faults are reported with their lines', () => {
  assert.match(messages('# no front matter\n').join('\n'), /1: a page starts with front matter/)
  assert.match(messages('---\nid: S1.L1\n').join('\n'), /1: the front matter is never closed/)
  assert.match(messages('---\nid: [unclosed\n---\n').join('\n'), /the front matter is not valid YAML/)
  assert.match(messages('---\nid: S1.L1\nid: S1.L2\n---\n').join('\n'), /not valid YAML/)
  assert.match(messages(page(`${FRONT}\nrail: []`, '\n## S {minutes=5}\ntext\n')).join('\n'), /7: rail is computed by the build/)
  assert.match(messages(page(`${FRONT}\nstatus: ok`, '\n## S {minutes=5}\ntext\n')).join('\n'), /status is not a front matter key/)
  assert.match(messages(page(`${FRONT}\nsegments: []`, '\n## S {minutes=5}\ntext\n')).join('\n'), /segments are written in the body/)
  assert.match(messages(page(`${FRONT}\nschema: statespace/lesson@2`, '\n## S {minutes=5}\ntext\n')).join('\n'), /schema must be statespace\/lesson@1/)
})

test('body faults are reported with their lines', () => {
  const body = (s: string): string => page(FRONT, s)
  assert.match(messages(body('\ntext before\n## S {minutes=5}\nx\n')).join('\n'), /text comes before the first segment/)
  assert.match(messages(body('\n## S\nx\n')).join('\n'), /gives its minutes/)
  assert.match(messages(body('\n## S {minutes=abc}\nx\n')).join('\n'), /minutes must be a whole number/)
  assert.match(messages(body('\n# A title\n## S {minutes=5}\nx\n')).join('\n'), /no level-1 heading/)
  assert.match(messages(body('\n## S {minutes=5}\n:::card variant=twin\nnever closed\n')).join('\n'), /never closed/)
  assert.match(messages(body('\n## S {minutes=5}\n:::card variant=twin\na\n:::card variant=twin\nb\n:::\n')).join('\n'), /blocks do not nest/)
  assert.match(messages(body('\n## S {minutes=5}\n:::item role=exit family=GEN-call-it template=t1\nhello\n:::\n')).join('\n'), /item needs kcs|holds nothing but a @choice/)
  assert.match(messages(body('\n## S {minutes=5}\n::item role=exit family=GEN-call-it template=t1 kcs=KC-1.a extra=1\n')).join('\n'), /item takes no attribute extra/)
})

test('choice faults are reported with their lines', () => {
  const choice = (inner: string): string => page(FRONT, `\n## S {minutes=5}\n:::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n@choice key=A\nQ?\n${inner}\n:::\n`)
  assert.match(messages(choice('Just text, no options.')).join('\n'), /lists its options as "- A. text" lines/)
  assert.match(messages(choice('- A. one\n  - why: w\nstray text')).join('\n'), /text after the options/)
  assert.match(messages(choice('- A. one\n  - why: w\n  - why: again')).join('\n'), /option A has two why lines/)
  assert.match(messages(page(FRONT, '\n## S {minutes=5}\n:::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n@choice\nQ?\n- A. one\n:::\n')).join('\n'), /@choice needs key=/)
})

test('a continued option and a continued why join their lines', () => {
  const r = parsePageSource(page(FRONT, '\n## S {minutes=5}\n:::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n@choice key=A\nQ?\n\n- A. the first\n  half of the text\n  - why: a reason that\n    runs on\n- B. second\n  - why: w\n  - mis: dp:Z1\n:::\n'))
  assert.deepEqual(r.problems, [])
  const item = (r.record as Rec).segments[0]?.blocks[0] as { choice: { options: Array<{ text: string; why: string }> } }
  assert.equal(item.choice.options[0]?.text, 'the first half of the text')
  assert.equal(item.choice.options[0]?.why, 'a reason that runs on')
})

test('@tap is one line, and a cell takes only its own sections', () => {
  const cell = (inner: string): string => page(FRONT, `\n## S {minutes=5}\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n${inner}\n:::\n`)
  assert.match(messages(cell('@tap\nline one\nline two')).join('\n'), /@tap is one line/)
  assert.match(messages(cell('@verdict\nsat')).join('\n'), /takes @direction, @tap, @call and @after sections, not @verdict/)
  assert.match(messages(cell('@after\none\n@after\ntwo')).join('\n'), /a cell has one @after/)
  assert.match(messages(cell('```python\na\n```\n```python\nb\n```')).join('\n'), /one piece of code/)
})

test('a byte order mark and CRLF line ends are read as plain text', () => {
  const text = `﻿${fixture('lessons/S1.L1.md').replaceAll('\n', '\r\n')}`
  const a = parsePageSource(text)
  const b = parsePageSource(fixture('lessons/S1.L1.md'))
  assert.deepEqual(a.problems, [])
  assert.deepEqual(a.record, b.record)
})

test('a code fence may say the learner can edit the code, and nothing else', () => {
  const cell = (info: string): string => page(FRONT, `\n## S {minutes=5}\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n\`\`\`${info}\nx = 1\n\`\`\`\n:::\n`)
  const ok = parsePageSource(cell('python editable'))
  assert.deepEqual(ok.problems, [])
  assert.deepEqual(((ok.record as Rec).segments[0]?.blocks[0] as { code: unknown }).code, { lang: 'python', text: 'x = 1', editable: true })
  assert.deepEqual((((parsePageSource(cell('python')).record as Rec).segments[0]?.blocks[0]) as { code: unknown }).code, { lang: 'python', text: 'x = 1' })
  assert.match(messages(cell('python writable')).join('\n'), /takes the flag editable, not "writable"/)
})

test('front matter whose aliases expand past the limit is a reported problem at its first line, not a crash', () => {
  const r = parsePageSource(`---\n${aliasBomb()}---\n\n## S {minutes=5}\ntext\n`)
  assert.equal(r.record, null)
  assert.deepEqual(r.problems.map((p) => [p.severity, p.code, p.line]), [['error', 'front-matter', 2]])
  assert.match(r.problems[0]?.message ?? '', /the front matter is not valid YAML: .*alias/i)
  // a handful of aliases is YAML like any other
  const few = parsePageSource(page(`${FRONT}\nobjective: &o same text`, '\n## S {minutes=5}\ntext\n'))
  assert.deepEqual(few.problems, [])
})

test('prose is not a block: ":::prose" says so, instead of calling prose a block type that is one of the six', () => {
  const r = parsePageSource(page(FRONT, '\n## S {minutes=5}\n:::prose\nSome text.\n:::\n'))
  assert.deepEqual(r.problems.map((p) => [p.code, p.line]), [['block-type', 10]], 'at the line that opens the block')
  const message = r.problems[0]?.message ?? ''
  assert.match(message, /^prose is plain Markdown between blocks, not a block of its own: remove the ::: lines/)
  assert.doesNotMatch(message, /is not a block type/)
  assert.deepEqual((r.record as Rec).segments[0]?.blocks, [{ type: 'prose', md: 'Some text.' }], 'the text is kept as the prose it is')
  // the one-line form
  const leaf = parsePageSource(page(FRONT, '\n## S {minutes=5}\n::prose\n'))
  assert.match(leaf.problems[0]?.message ?? '', /^prose is plain Markdown between blocks/)
  // any other word is still not a block type
  assert.match(messages(page(FRONT, '\n## S {minutes=5}\n:::proze\nx\n:::\n')).join('\n'), /proze is not a block type: the six are prose, instrument/)
})

test('a heading drawn with a line of = or - under text is reported at the underline, whatever the level', () => {
  /** The lines of the heading problems in a segment holding the text, and the line the underline is on. */
  const headings = (text: string): { found: Array<number | null>; underline: number } => {
    const src = page(FRONT, `\n## S {minutes=5}\n${text}\n`)
    // the front matter's own fences are lines of hyphens: look below them
    return { found: parsePageSource(src).problems.filter((p) => p.code === 'heading').map((p) => p.line), underline: src.split('\n').findIndex((l, i) => i >= 8 && /^ {0,3}(?:=+|-+)\s*$/.test(l)) + 1 }
  }
  for (const text of ['A title\n=======', 'A title\n-------', 'A title\n=', 'A title\n-', 'Some text\nthat goes on\n-----', 'Some text\n   ===  ', 'A title\n   ---']) {
    const { found, underline } = headings(text)
    assert.deepEqual(found, [underline], JSON.stringify(text))
  }
  assert.match(parsePageSource(page(FRONT, '\n## S {minutes=5}\nA title\n=======\n')).problems.find((p) => p.code === 'heading')?.message ?? '', /under a line of text makes a heading, which a page does not have: start a segment with "## Title \{minutes=N\}"/)
  // what is not a setext heading is left alone: a rule after a blank line, a list, a quote, a table, code, an ATX heading's neighbour
  for (const text of [
    'Some text\n\n---\n\nMore text',
    '---',
    '---\n---',
    '- an item\n---',
    '- an item\n- another\n-',
    '> a quote\n---',
    '| a | b |\n|---|---|\n| 1 | 2 |',
    '```\ncode\n---\n```',
    '~~~\ncode\n===\n~~~',
    '    indented code\n    ---',
    '1. one\n---',
    'Text with --- inside',
    'Text with a === b',
    '### A sub-heading\nText\n\n***\n\nMore',
    '[^1]: a note\n---',
  ]) assert.deepEqual(headings(text).found, [], JSON.stringify(text))
})

test('a heading drawn with an underline inside a block is reported too', () => {
  const lineOfText = (src: string, text: string): number => src.split('\n').indexOf(text) + 1
  const card = page(FRONT, '\n## S {minutes=5}\n:::card variant=twin\nA title\n=======\nThe card says more.\n:::\n')
  assert.deepEqual(parsePageSource(card).problems.filter((p) => p.code === 'heading').map((p) => p.line), [lineOfText(card, '=======')])
  const cell = page(FRONT, '\n## S {minutes=5}\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-starter\n```python\nx = 1\n---\n```\n@after\nWhat happened\n-------------\nText.\n:::\n')
  assert.deepEqual(parsePageSource(cell).problems.filter((p) => p.code === 'heading').map((p) => p.line), [lineOfText(cell, '-------------')], 'the code fence is left alone and the section is not')
})
