// The words of the Call It sheet and the Mirror, held to the vocabulary rules a learner's copy keeps (OD-14; spine section 0;
// DESIGN.md section 11): none of the glossary's internal names, no ID of the course's machinery, no bare status word that GATE-codes
// reserves for stamps, and no glossary term before the lesson that introduces it. The glossary (content/glossary.yaml) is the one
// source: this file holds no list of names of its own, and it reads a term's first lesson from the glossary's `from` field, never
// from the term's row number (rows 9 and 10, claim and seam, come from S1.L3, but rows 11 to 19 come from S1.L1).
//
// The page a text sits on is named by its lesson (`lesson: 'S1.L1'`): Boot's copy is S1.L0, and the end of S1 is S1.L5. A term is
// allowed on a page when its first lesson is the page's or an earlier one, ordering lessons by stage and then number.
//
// Run through Node's type stripping: the ID grammar is TypeScript.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { scanLine } from '../../../../packages/ids/src/grammar.ts'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A form as a pattern: whole words, with a space read as white space or a hyphen. */
function matcherOf(form, caseSensitive) {
  const body = escapeRegExp(form.trim()).replace(/ +/g, '[\\s-]+')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, caseSensitive ? 'gu' : 'giu')
}

/** [stage, lesson] of a lesson ID such as S1.L3, or null when the text is not one. */
export function lessonPosition(id) {
  const m = /^S([1-9][0-9]*)\.L([0-9]+)$/.exec(String(id))
  return m === null ? null : [Number(m[1]), Number(m[2])]
}

/** Negative, zero or positive as lesson a comes before, is, or comes after lesson b. */
export function comparePositions(a, b) {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]
}

export function readGlossary(root = REPO) {
  const doc = parse(fs.readFileSync(path.join(root, 'content/glossary.yaml'), 'utf8'))
  const internal = (doc.internal ?? []).map((x) => {
    const forms = (x.forms ?? [x.name]).map(String)
    return { name: x.name, say: String(x.say ?? ''), forms, matchers: forms.map((f) => matcherOf(f, x.caseSensitive === true)) }
  })
  const terms = (doc.terms ?? []).map((t) => {
    const at = lessonPosition(t.from)
    if (at === null) throw new Error(`content/glossary.yaml: term ${t.n} (${t.term}) has no lesson ID in from, so no page can be held to it`)
    const forms = (t.forms ?? [t.term]).map(String)
    return { n: t.n, term: t.term, from: String(t.from), at, forms, matchers: forms.map((f) => matcherOf(f, t.caseSensitive === true)) }
  })
  if (internal.length === 0 || terms.length === 0) throw new Error('content/glossary.yaml lists no internal names or no terms, so no word can be held to it')
  return { internal, terms, internalIds: new Set((doc.internalIds ?? []).map(String)) }
}

/** The internal names and machinery IDs in one string of learner copy. */
export function internalFindings(text, glossary) {
  const out = []
  for (const x of glossary.internal) for (const m of x.matchers) for (const hit of text.matchAll(m)) out.push(`"${hit[0]}" is an internal name (${x.name}); learners see ${x.say}`)
  for (const t of scanLine(text)) if (glossary.internalIds.has(t.kind)) out.push(`${t.id} is an ID of the course's machinery (${t.kind})`)
  return out
}

/** The glossary terms (as `{ n, term, from }`) a string uses. */
export function termsIn(text, glossary) {
  return glossary.terms.filter((t) => t.matchers.some((m) => [...text.matchAll(m)].length > 0)).map(({ n, term, from }) => ({ n, term, from }))
}

/** GATE-codes' status words, bare: copy never says them without a stamp (spine section 11.2; DESIGN.md section 11.2). */
export const STATUS_WORDS = ['verified', 'correct', 'safe', 'proven', 'guaranteed']
/** A word inside quotation marks or a code span is named, not claimed: GATE-codes reads a statement under evaluation that way. */
const unquoted = (text) => text.replace(/"[^"]*"|“[^”]*”|`[^`]*`/gu, ' ')
export const statusWords = (text) => STATUS_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(unquoted(text)))

/**
 * Everything wrong with a string of learner copy on the page of lesson `lesson` (S1.L0 for Boot, S1.L1, ..., S1.L5 for the end of
 * S1): an internal name, an ID of the machinery, a bare status word, a glossary term whose first lesson comes after the page's,
 * a check mark, an exclamation mark. `lesson` is required: with no page there is no vocabulary to hold the copy to.
 */
export function copyProblems(text, glossary, { lesson } = {}) {
  const page = lessonPosition(lesson)
  if (page === null) throw new Error(`copyProblems needs the lesson the text sits on (a lesson ID such as S1.L1), not ${JSON.stringify(lesson)}`)
  const problems = [...internalFindings(text, glossary)]
  for (const w of statusWords(text)) problems.push(`the bare status word "${w}"`)
  for (const t of termsIn(text, glossary)) {
    const at = glossary.terms.find((x) => x.n === t.n).at
    if (comparePositions(at, page) > 0) problems.push(`glossary term ${t.n} (${t.term}) before ${t.from}, the lesson that introduces it, on a page of ${lesson}`)
  }
  if (/[✓✔✅]/u.test(text)) problems.push('a check mark, which reads as "verified" (DESIGN.md section 11.2)')
  if (/!/.test(text)) problems.push('an exclamation mark (DESIGN.md section 11.1)')
  return problems
}
