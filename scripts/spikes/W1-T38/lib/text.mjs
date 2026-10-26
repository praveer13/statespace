// Reading a string of learner copy the way GATE-lessons' copy rules need it: with what is not copy blanked out,
// every offset kept (a blanked character becomes a space, a newline stays), and cut into sentences. A rule reads
// the masked text and reports an offset in the original, so a finding can name its line.

/** Spaces of the same length, newlines kept. */
export const blank = (s) => s.replace(/[^\n]/g, ' ')

/** Blank every inline code span, by CommonMark's rule: a run of n backticks closes at the next run of exactly n. */
function blankInlineCode(text) {
  const out = [...text]
  let i = 0
  while (i < text.length) {
    if (text[i] !== '`') {
      i += 1
      continue
    }
    let n = 0
    while (text[i + n] === '`') n += 1
    let j = i + n
    let close = -1
    while (j < text.length) {
      if (text[j] !== '`') {
        j += 1
        continue
      }
      let m = 0
      while (text[j + m] === '`') m += 1
      if (m === n) {
        close = j
        break
      }
      j += m
    }
    if (close < 0) {
      i += n
      continue
    }
    for (let k = i; k < close + n; k += 1) if (out[k] !== '\n') out[k] = ' '
    i = close + n
  }
  return out.join('')
}

/**
 * An evidence or design tag: [X RUN-id], [V], [D], [U], [KS]. A drawer's ID in brackets is no tag: `[D-03](/drawers/D-03)`
 * is a link whose text is copy.
 */
const TAG = /\[(?:X|V|D|U|KS)(?![\w-])[^\]\n]*\]/g

/**
 * Markdown emphasis blanked, every offset kept: a run of `*` that touches a word ("**S1.L3**", "*you can't*"), and a run of
 * `_` at the edge of a word ("_core lesson_", "__pocket checker__"). Emphasis is not a word, so "**S1.L3** opens tomorrow"
 * reads as "S1.L3 opens tomorrow". A list item's "* " and an underscore inside a word (snake_case) are left alone.
 */
export const blankEmphasis = (text) =>
  text.replace(/(?<=\S)\*+|\*+(?=\S)/g, (m) => ' '.repeat(m.length)).replace(/(?<![\p{L}\p{N}_])_+(?=\S)|(?<=\S)_+(?![\p{L}\p{N}_])/gu, (m) => ' '.repeat(m.length))

/**
 * The text with everything that is not copy blanked: fenced code, HTML comments, inline code, URLs, the target of a
 * link (its text is copy), run and fact references, evidence and design tags ([X RUN-id], [V], [D], [U], [KS]),
 * footnote labels and emphasis marks. A cell's code is not copy, and a reference is a token the build resolves.
 */
export function maskCopy(text) {
  let t = text
  t = t.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*(?:`{3,}|~{3,})[ \t]*(?=\n|$)|$)/gm, blank)
  t = t.replace(/<!--[\s\S]*?-->/g, blank)
  t = blankInlineCode(t)
  t = t.replace(/\{\{(?:run|fact):[^}\n]*\}\}/g, blank)
  t = t.replace(TAG, blank)
  t = t.replace(/\[\^[^\]\n]+\]/g, blank)
  t = t.replace(/https?:\/\/[^\s)>\]]+/g, blank)
  // emphasis before links, so that a mark around a link ("*[S1.L3](/x)*") still touches what it marks
  t = blankEmphasis(t)
  t = t.replace(/!?\[([^\]\n]*)\]\(([^)\n]*)\)/g, (m, inner) => ` ${inner}${' '.repeat(m.length - inner.length - 1)}`)
  return t
}

/**
 * The text as a word count reads it: what a learner reads, inline code included (`unsat` is a word of the lesson)
 * and a code block, a comment, a link target, a reference and a footnote label not.
 */
export function maskForWords(text) {
  let t = text
  t = t.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*(?:`{3,}|~{3,})[ \t]*(?=\n|$)|$)/gm, blank)
  t = t.replace(/<!--[\s\S]*?-->/g, blank)
  t = t.replace(/\{\{(?:run|fact):[^}\n]*\}\}/g, blank)
  t = t.replace(TAG, blank)
  t = t.replace(/\[\^[^\]\n]+\]/g, blank)
  t = t.replace(/https?:\/\/[^\s)>\]]+/g, blank)
  t = t.replace(/!?\[([^\]\n]*)\]\(([^)\n]*)\)/g, (m, inner) => ` ${inner}${' '.repeat(m.length - inner.length - 1)}`)
  return t.replace(/`+/g, ' ')
}

/** Blank the given [start, end) spans. */
export function blankSpans(text, spans) {
  if (spans.length === 0) return text
  const out = [...text]
  for (const [a, b] of spans) for (let k = a; k < b && k < out.length; k += 1) if (out[k] !== '\n') out[k] = ' '
  return out.join('')
}

const TABLE_ROW = /^[ \t]*\|/
const HEADING = /^[ \t]*#{1,6}\s/
const LIST_ITEM = /^[ \t]*(?:[-*+]|[0-9]{1,9}[.)])\s/
const ABBREVIATION = /(?:\be\.g|\bi\.e|\bvs|\bcf|\betc|\bapprox|\bNo|\bFig|\bal|\bSt|\bp|\bpp)$/i

/**
 * Cut masked text into sentences: [{start, end}] spans of the text. A blank line, a table row, a heading and a list
 * item each end a sentence (a table row and a heading are one sentence each), and so does a full stop, question mark
 * or exclamation mark followed by a space and a capital letter, a digit or an opening quote or bracket.
 */
export function splitSentences(masked) {
  const spans = []
  const lines = masked.split('\n')
  let offset = 0
  /** @type {{start:number,end:number}|null} */
  let block = null
  const flush = () => {
    if (block !== null) cutBlock(masked, block.start, block.end, spans)
    block = null
  }
  for (const line of lines) {
    const start = offset
    const end = offset + line.length
    offset = end + 1
    if (line.trim() === '') {
      flush()
      continue
    }
    if (TABLE_ROW.test(line) || HEADING.test(line)) {
      // a table row and a heading are one unit: the cells of a row are phrases, and a heading has no full stop to cut at
      flush()
      pushTrimmed(masked, start, end, spans)
      continue
    }
    if (LIST_ITEM.test(line)) flush()
    if (block === null) block = { start, end }
    else block.end = end
  }
  flush()
  return spans
}

function pushTrimmed(text, a, b, spans) {
  let s = a
  let e = b
  while (s < e && /\s/.test(text[s])) s += 1
  while (e > s && /\s/.test(text[e - 1])) e -= 1
  if (e > s) spans.push({ start: s, end: e })
}

function cutBlock(text, from, to, spans) {
  let start = from
  const push = (a, b) => pushTrimmed(text, a, b, spans)
  for (let i = from; i < to; i += 1) {
    const c = text[i]
    if (c !== '.' && c !== '!' && c !== '?') continue
    let j = i + 1
    while (j < to && `"”'’)]*_`.includes(text[j])) j += 1
    if (j >= to || !/\s/.test(text[j])) continue
    let k = j
    while (k < to && /\s/.test(text[k])) k += 1
    if (k >= to || !/[A-Z0-9"“(\[_§]/.test(text[k])) continue
    if (ABBREVIATION.test(text.slice(Math.max(from, i - 6), i))) continue
    push(start, j)
    start = k
    i = k - 1
  }
  push(start, to)
}

/** The start offset of each line of a text, for lineAt. */
export function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1)
  return starts
}

/** The 0-based line index of an offset. */
export function lineAt(starts, offset) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The number of words in copy: tokens that hold a letter or a digit (a formula's symbols are not words). */
export function wordCount(text) {
  return (text.match(/[^\s]+/g) ?? []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}
