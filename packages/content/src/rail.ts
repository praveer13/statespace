// The lesson rail: segment titles and nothing else, never an answer, a verdict or option text (V2-05; spine
// section 3.0; DESIGN.md section 6.15). The rail is built from the segments' titles alone, so no block can reach
// it; railLeaks lints the titles themselves, because an author can still write an answer into one.

import type { Lesson, LessonChoice, LessonRailEntry } from '@statespace/schema'

/** The rail of a page: for each segment its anchor and its title. */
export function railOf(page: { segments: ReadonlyArray<{ id: string; title: string }> }): LessonRailEntry[] {
  return page.segments.map((s) => ({ id: s.id, title: s.title }))
}

export interface RailLeak {
  /** The index of the segment. */
  segment: number
  message: string
}

/** Characters that make a title more than plain text: Markdown, HTML and reference syntax. */
const MARKUP = /[`*[\]<>{}\\|]/

/** Text as the leak check compares it: lower case, no backticks or punctuation, single spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_"'“”‘’.,;:!?()[\]{}<>/\\|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Options too common to be an answer on their own: a title may hold "no" or "true" without giving anything away. */
const COMMON = new Set(['yes', 'no', 'true', 'false', 'none', 'all', 'both', 'not'])

/** Every choice the page authors, in a cell's call or an item's fixed instance. */
function choicesOf(page: Lesson): LessonChoice[] {
  const out: LessonChoice[] = []
  for (const s of page.segments) {
    for (const b of s.blocks) {
      if (b.type === 'instrument' && b.call !== undefined) out.push(b.call)
      if (b.type === 'item' && b.choice !== undefined) out.push(b.choice)
    }
  }
  return out
}

/**
 * The titles of a page that give something away. A title is plain text: no Markdown, no HTML, no reference. And
 * a title never holds an answer the page's own questions offer: an option short enough to be a verdict (`sat`,
 * "proved") may not appear in it as a word, and a longer option may not appear in it at all. The check reads the
 * options the page authors; an item whose instance is generated carries no text to compare, so GATE-lessons
 * (W1-T38) runs the same rule over the generators' options too.
 */
export function railLeaks(page: Lesson): RailLeak[] {
  const options = choicesOf(page).flatMap((c) => c.options.map((o) => normalize(o.text)))
  const short = new Set(options.filter((o) => o !== '' && !COMMON.has(o) && o.split(' ').length <= 3))
  const long = options.filter((o) => o.split(' ').length > 3)
  const out: RailLeak[] = []
  page.segments.forEach((s, i) => {
    if (MARKUP.test(s.title)) {
      out.push({ segment: i, message: `the title ${JSON.stringify(s.title)} is not plain text: the rail takes no Markdown, code, link or reference` })
      return
    }
    const title = normalize(s.title)
    const padded = ` ${title} `
    const word = [...short].find((o) => padded.includes(` ${o} `))
    if (word !== undefined) {
      out.push({ segment: i, message: `the title ${JSON.stringify(s.title)} holds ${JSON.stringify(word)}, an option of a question on this page: the rail shows no answers, verdicts or option text (V2-05)` })
      return
    }
    const phrase = long.find((o) => padded.includes(` ${o} `))
    if (phrase !== undefined) {
      out.push({ segment: i, message: `the title ${JSON.stringify(s.title)} repeats an option of a question on this page (${JSON.stringify(phrase)}): the rail shows no option text (V2-05)` })
    }
  })
  const seen = new Map<string, number>()
  page.segments.forEach((s, i) => {
    const key = normalize(s.title)
    const first = seen.get(key)
    if (first !== undefined) out.push({ segment: i, message: `the title ${JSON.stringify(s.title)} repeats the title of segment ${first + 1}: the rail must tell the segments apart` })
    else seen.set(key, i)
  })
  return out
}
