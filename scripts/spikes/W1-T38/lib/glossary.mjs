// content/glossary.yaml as GATE-lessons reads it: the 25 coined terms with the first lesson whose copy may use each,
// the internal names that stay out of learner copy, and the kinds of ID that are internal. This module loads and
// validates the file, compares it with the spine's table (the spine decides; the file adds the words that count as
// using a term), and compiles the matchers the copy rules run.

/** The position at the end of a stage: a stage page, a lab page or a drawer may use any term introduced up to there. */
export const END = Number.POSITIVE_INFINITY

const LESSON_ID = /^S([1-9][0-9]*)\.L([0-9]+)$/

/** [stage, lesson] of a lesson ID such as S1.L3, or null. */
export function lessonPosition(id) {
  const m = LESSON_ID.exec(String(id))
  return m === null ? null : [Number(m[1]), Number(m[2])]
}

/** The position at the end of stage n. */
export const stageEnd = (n) => [n, END]

/** Negative, zero or positive as a comes before, is, or comes after b. */
export function comparePositions(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1
  if (a[1] === b[1]) return 0
  return a[1] < b[1] ? -1 : 1
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * One matcher for a list of forms: whole words only. A space in a form matches any run of spaces and hyphens, so "pocket
 * checker" is also "pocket-checker" and "Hall-of-Records" (a hyphen is U+002D, U+2010 or U+2011).
 */
export function compileForms(forms, caseSensitive) {
  const alternatives = [...forms].sort((a, b) => b.length - a.length).map((f) => escapeRe(f.trim()).replace(/\s+/g, '[\\s\\u2010\\u2011-]+'))
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, caseSensitive ? 'gu' : 'giu')
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== ''
const isStringList = (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString)

/**
 * Validate the shape of a parsed glossary and compile it. Returns {glossary, problems}; `glossary` is null when the
 * shape is too broken to use. A problem is {rule, message, pointer}, `rule` a rule of lib/rules.mjs.
 */
export function shapeGlossary(value) {
  const problems = []
  const bad = (rule, pointer, message) => problems.push({ rule: `glossary/${rule}`, message, pointer })
  if (!isObject(value)) return { glossary: null, problems: [{ rule: 'glossary/root', message: 'the glossary is a mapping with format, terms, internal and internalIds', pointer: '' }] }
  if (value.format !== 'glossary/1') bad('format', '/format', 'format must be glossary/1')
  const terms = []
  if (!Array.isArray(value.terms)) bad('terms', '/terms', 'terms is a list')
  else {
    value.terms.forEach((t, i) => {
      const at = `/terms/${i}`
      if (!isObject(t)) return bad('term', at, 'a term is a mapping')
      if (!Number.isInteger(t.n)) bad('term-n', `${at}/n`, 'n is the spine\'s row number')
      for (const key of ['term', 'meaning', 'introduced']) if (!isNonEmptyString(t[key])) bad('term-text', `${at}/${key}`, `${key} is a non-empty string`)
      if (lessonPosition(t.from) === null) bad('term-from', `${at}/from`, 'from is a lesson ID such as S1.L1')
      if (!isStringList(t.forms)) bad('term-forms', `${at}/forms`, 'forms is a non-empty list of words')
      if (t.caseSensitive !== undefined && typeof t.caseSensitive !== 'boolean') bad('term-case', `${at}/caseSensitive`, 'caseSensitive is true or false')
      if (t.until !== undefined && !isNonEmptyString(t.until)) bad('term-until', `${at}/until`, 'until is a non-empty string')
      if (t.unmatched !== undefined && !(Array.isArray(t.unmatched) && t.unmatched.every((u) => isObject(u) && isNonEmptyString(u.word) && isNonEmptyString(u.why)))) bad('term-unmatched', `${at}/unmatched`, 'unmatched is a list of {word, why}')
      if (isStringList(t.forms)) {
        terms.push({
          n: t.n,
          term: t.term,
          meaning: t.meaning,
          introduced: t.introduced,
          from: t.from,
          fromPosition: lessonPosition(t.from) ?? [0, 0],
          forms: t.forms,
          caseSensitive: t.caseSensitive === true,
          until: t.until,
          unmatched: t.unmatched ?? [],
          matcher: compileForms(t.forms, t.caseSensitive === true),
          pointer: at,
        })
      }
    })
  }
  const internal = []
  if (!Array.isArray(value.internal)) bad('internal', '/internal', 'internal is a list')
  else {
    value.internal.forEach((x, i) => {
      const at = `/internal/${i}`
      if (!isObject(x)) return bad('internal-entry', at, 'an internal name is a mapping')
      for (const key of ['name', 'say', 'source']) if (!isNonEmptyString(x[key])) bad('internal-text', `${at}/${key}`, `${key} is a non-empty string`)
      if (!isStringList(x.forms)) bad('internal-forms', `${at}/forms`, 'forms is a non-empty list of words')
      if (x.caseSensitive !== undefined && typeof x.caseSensitive !== 'boolean') bad('internal-case', `${at}/caseSensitive`, 'caseSensitive is true or false')
      if (isStringList(x.forms)) {
        internal.push({ name: x.name, forms: x.forms, say: x.say, source: x.source, caseSensitive: x.caseSensitive === true, matcher: compileForms(x.forms, x.caseSensitive === true), pointer: at })
      }
    })
  }
  if (!isStringList(value.internalIds)) bad('internal-ids', '/internalIds', 'internalIds is a non-empty list of ID kinds')
  const internalIds = new Set(isStringList(value.internalIds) ? value.internalIds : [])
  if (problems.length > 0 && terms.length === 0 && internal.length === 0) return { glossary: null, problems }
  return { glossary: { terms, internal, internalIds }, problems }
}

/** What the spine's glossary table says, without markup: [{n, term, introduced}], or null when the table is not there. */
export function parseSpineGlossary(spineText) {
  const lines = spineText.split('\n')
  const head = lines.findIndex((l) => /^\|\s*#\s*\|\s*Term\s*\|\s*Meaning\s*\|\s*First introduced\s*\|\s*$/.test(l))
  if (head < 0) return null
  const rows = []
  for (let i = head + 2; i < lines.length && /^\|/.test(lines[i]); i += 1) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length !== 4 || !/^[0-9]+$/.test(cells[0])) continue
    rows.push({ n: Number(cells[0]), term: cells[1], introduced: plain(cells[3]) })
  }
  return rows
}

/** Text without Markdown emphasis or code marks, single-spaced. */
export const plain = (s) => String(s).replace(/[*`]/g, '').replace(/\s+/g, ' ').trim()

/** The most terms the spine allows (OD-14), and the most Boot may introduce. */
export const MAX_TERMS = 25
export const BOOT_TERMS = 5

/**
 * What is wrong with the glossary as data: its size, its numbering, its positions against the registry and against
 * the spine's column, and words that would be read two ways. Returns [{rule, message, pointer}].
 */
export function checkGlossary(glossary, { spineRows, hasLesson, kindNames }) {
  const out = []
  const bad = (rule, pointer, message) => out.push({ rule: `glossary/${rule}`, message, pointer })
  const { terms, internal, internalIds } = glossary
  if (terms.length !== MAX_TERMS) bad('count', '/terms', `the spine's glossary has ${MAX_TERMS} terms (OD-14); this file has ${terms.length}`)
  terms.forEach((t, i) => {
    if (t.n !== i + 1) bad('numbering', t.pointer, `the terms run 1 to ${MAX_TERMS} in the spine's order: this one is ${t.n}, in place ${i + 1}`)
    if (!hasLesson(t.from)) bad('from-registered', `${t.pointer}/from`, `${t.from} is not a lesson of the spine's registry`)
    const introduced = t.introduced
    const lesson = /^S[1-9][0-9]*\.L[0-9]+$/.test(introduced)
    const stage = /^S([1-9][0-9]*)\b/.exec(introduced)
    if (lesson && t.from !== introduced) bad('from-lesson', `${t.pointer}/from`, `${t.term} is introduced at ${introduced}, so its copy starts there, not at ${t.from}`)
    else if (!lesson && stage !== null && lessonPosition(t.from)?.[0] !== Number(stage[1])) bad('from-stage', `${t.pointer}/from`, `${t.term} is introduced in stage S${stage[1]}, so its first lesson is one of that stage's, not ${t.from}`)
    else if (/^Boot\b/.test(introduced) && t.from !== 'S1.L0') bad('from-boot', `${t.pointer}/from`, `${t.term} is introduced in Boot, so its copy starts at S1.L0, not ${t.from}`)
  })
  const seenTerms = new Map()
  for (const t of terms) {
    const key = t.term.toLowerCase()
    if (seenTerms.has(key)) bad('duplicate', t.pointer, `${t.term} is listed twice (also ${seenTerms.get(key)})`)
    else seenTerms.set(key, t.pointer)
  }
  const boot = terms.filter((t) => t.from === 'S1.L0')
  if (boot.length > BOOT_TERMS) bad('boot-count', '/terms', `Boot introduces at most ${BOOT_TERMS} terms (OD-14); ${boot.map((t) => t.term).join(', ')} are ${boot.length}`)
  for (const t of boot) if (t.n > BOOT_TERMS) bad('boot-number', t.pointer, `${t.term} is term ${t.n} and starts at S1.L0: Boot introduces terms 1 to ${BOOT_TERMS} only`)
  for (const t of terms) if (t.n <= BOOT_TERMS && t.from !== 'S1.L0') bad('boot-terms', `${t.pointer}/from`, `${t.term} is term ${t.n}: terms 1 to ${BOOT_TERMS} are Boot's, so its copy starts at S1.L0`)
  // the spine decides the terms and where they are introduced
  if (spineRows === null) bad('spine-table', '', "the spine's glossary table was not found (docs/spine/SPINE.md section 0), so the file cannot be compared with it")
  else {
    if (spineRows.length !== terms.length) bad('spine-count', '/terms', `the spine's table has ${spineRows.length} terms; this file has ${terms.length}`)
    for (const row of spineRows) {
      const t = terms.find((x) => x.n === row.n)
      if (t === undefined) bad('spine-row', '/terms', `the spine's term ${row.n}, ${row.term}, is missing`)
      else {
        if (t.term !== row.term) bad('spine-term', `${t.pointer}/term`, `the spine's term ${row.n} is ${JSON.stringify(row.term)}; this file says ${JSON.stringify(t.term)}`)
        if (plain(t.introduced) !== row.introduced) bad('spine-introduced', `${t.pointer}/introduced`, `the spine introduces ${row.term} at ${JSON.stringify(row.introduced)}; this file says ${JSON.stringify(t.introduced)}`)
      }
    }
  }
  // a word is one term, or one internal name, never two
  const owner = new Map()
  const claim = (word, who, pointer, caseSensitive) => {
    const key = caseSensitive ? word : word.toLowerCase()
    const hit = owner.get(key) ?? owner.get(word.toLowerCase())
    if (hit !== undefined && hit.who !== who) bad('form-collision', pointer, `${JSON.stringify(word)} is a form of both ${hit.who} and ${who}: a word is one term, or one internal name`)
    else owner.set(key, { who, pointer })
  }
  for (const t of terms) for (const f of t.forms) claim(f, t.term, `${t.pointer}/forms`, t.caseSensitive)
  for (const x of internal) for (const f of x.forms) claim(f, x.name, `${x.pointer}/forms`, x.caseSensitive)
  for (const k of internalIds) if (!kindNames.includes(k)) bad('id-kind', '/internalIds', `${k} is not a kind of ID in the registry (${kindNames.join(', ')})`)
  return out
}
