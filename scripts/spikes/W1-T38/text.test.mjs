import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blank, blankEmphasis, blankSpans, lineAt, lineStarts, maskCopy, maskForWords, splitSentences, wordCount } from './lib/text.mjs'

const spans = (text) => splitSentences(maskCopy(text)).map((s) => text.slice(s.start, s.end))

test('maskCopy keeps every offset and every newline', () => {
  const text = 'A `code` span, <!-- a\ncomment --> and https://example.org/x?y=1 and [link](https://example.org) {{run:RUN-z3-starter}} [X RUN-z3-starter] [V] [D] note[^1]\n\n```python\nx = 1\n```\nafter'
  const masked = maskCopy(text)
  assert.equal(masked.length, text.length)
  assert.deepEqual([...masked].map((c) => c === '\n'), [...text].map((c) => c === '\n'))
})

test('maskCopy blanks what is not copy and keeps what is', () => {
  const masked = maskCopy('Say `unsat` here <!-- hidden --> see https://example.org/a [the guide](https://example.org/b) {{run:RUN-z3-starter#values.model}} [X RUN-z3-starter] fact[^2]')
  assert.match(masked, /Say {2}/)
  assert.doesNotMatch(masked, /unsat|hidden|example|RUN-|\[\^/)
  assert.match(masked, /the guide/)
  assert.match(masked, /fact/)
})

test('maskCopy blanks a fenced block, and one fenced with tildes, and leaves the text around it', () => {
  const masked = maskCopy('before\n```python\nlane = 1\n```\nbetween\n~~~\nShelf\n~~~\nafter')
  assert.doesNotMatch(masked, /lane|Shelf/)
  assert.match(masked, /before/)
  assert.match(masked, /between/)
  assert.match(masked, /after/)
})

test('an inline code span closes at a run of the same length; an unclosed one is left alone', () => {
  assert.doesNotMatch(maskCopy('a ``x ` y`` b'), /x|y/)
  assert.match(maskCopy('a ` b'), /`/)
  assert.doesNotMatch(maskCopy('a ``x`` and `y`'), /x|y/)
})

test('blankSpans blanks the given spans only', () => {
  assert.equal(blankSpans('abcdef', [[1, 3]]), 'a  def')
  assert.equal(blankSpans('abc\ndef', [[2, 5]]), 'ab \n ef')
  assert.equal(blank('ab\ncd'), '  \n  ')
})

test('splitSentences cuts at a full stop before a capital, a blank line, a table row, a heading and a list item', () => {
  assert.deepEqual(spans('One sentence. Another one! A third? yes, still the third.'), ['One sentence.', 'Another one!', 'A third? yes, still the third.'])
  assert.deepEqual(spans('First paragraph\ncontinues here.\n\nSecond paragraph.'), ['First paragraph\ncontinues here.', 'Second paragraph.'])
  assert.deepEqual(spans('| a | b |\n|---|---|\n| c. D | e |'), ['| a | b |', '|---|---|', '| c. D | e |'])
  assert.deepEqual(spans('# Heading\nBody text.\n- item one\n- item two'), ['# Heading', 'Body text.', '- item one', '- item two'])
})

test('splitSentences does not cut at an abbreviation or a number', () => {
  assert.deepEqual(spans('Use e.g. a guard, i.e. a check. Next one.'), ['Use e.g. a guard, i.e. a check.', 'Next one.'])
  assert.deepEqual(spans('Version 5.3.1 is pinned. Done.'), ['Version 5.3.1 is pinned.', 'Done.'])
})

test('lineAt reports the 0-based line of an offset', () => {
  const text = 'ab\ncd\n\nef'
  const starts = lineStarts(text)
  assert.deepEqual([0, 1, 2, 3, 5, 6, 7, 8].map((i) => lineAt(starts, i)), [0, 0, 0, 1, 1, 2, 3, 3])
})

test('wordCount counts words and not symbols, and maskForWords keeps inline code and drops fences', () => {
  assert.equal(wordCount('a ∧ b ≥ 0 and `x`'), 5)
  assert.equal(wordCount(maskForWords('Say `unsat` twice\n```python\nlots of code words here\n```\ndone [X RUN-z3-starter] {{run:RUN-z3-starter}}')), 4)
})

test('emphasis marks are blanked, every offset kept; a list item and snake_case are left alone', () => {
  const cases = [
    ['You can\'t open **S1.L3** yet.', 'You can\'t open   S1.L3   yet.'],
    ['*S1.L3* opens tomorrow.', ' S1.L3  opens tomorrow.'],
    ['This is a _core lesson_.', 'This is a  core lesson .'],
    ['The __pocket checker__ grades it.', 'The   pocket checker   grades it.'],
    ['When you are done, **S1.L3** opens, and *you can\'t* open it.', 'When you are done,   S1.L3   opens, and  you can\'t  open it.'],
    ['* a list item\n* another', '* a list item\n* another'],
    ['my_lab_folder and next_lesson', 'my_lab_folder and next_lesson'],
    ['a * b', 'a * b'],
  ]
  for (const [text, want] of cases) {
    assert.equal(blankEmphasis(text), want, text)
    assert.equal(blankEmphasis(text).length, text.length, text)
  }
  assert.equal(maskCopy('**S1.L3** opens tomorrow.'), '  S1.L3   opens tomorrow.')
})

test('a drawer link keeps its text: [D-03](/drawers/D-03) is a link, not a [D] tag; the tags are still blanked', () => {
  assert.equal(maskCopy("You can't open [D-03](/drawers/D-03) yet."), "You can't open  D-03                 yet.")
  assert.doesNotMatch(maskCopy('[D-01](/drawers/D-01) says why a test is not a proof.'), /drawers/)
  assert.doesNotMatch(maskCopy('A design [D] and a run [X RUN-z3-starter], a value [V] and [U] and [KS].'), /\[|RUN-/)
  assert.doesNotMatch(maskForWords('[D-03](/drawers/D-03) holds the rules [D].'), /drawers|\[D\]/)
  assert.match(maskForWords('[D-03](/drawers/D-03) holds the rules [D].'), /D-03/)
})
