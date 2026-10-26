// The rules of GATE-lessons for one page, one record or one document (spine section 3.0 and section 11.2):
//
//   read        the page cannot be read as a page (the build says why: node scripts/build-content.mjs --check)
//   front       the page's own facts: a registered ID, the spine's tier, an objective
//   anatomy     lesson anatomy by tier (spine section 3.0): Boot, core, bridge; a drawer has none
//   family      every graded item names a generator family the spine registers and one of its templates
//   rail        the rail shows segment titles only: no markup, no repeat, no option text (an option inside a title,
//               a title inside an option, a number an option gives spelled out), the options of a generated item
//               included, and no verdict: sat, unsat, unknown, or a stamp word in capitals (V2-05)
//   block-type  at most the six content block types (V2-18; spine section 12 item 48), and no line that reads as a
//               block and is not one (":::Figure" and "::Item" show as text)
//   internal    an internal name or an ID of the course's machinery in learner copy
//   term        a glossary term before its lesson; Boot's copy uses terms 1 to 5 only
//   lock        lock copy (I5)
//   pressure    counters, loss framing and deadlines
//   reward      XP and praise for a click
//   drawer      a deferred drawer's card (topic, why and a neutral trigger)
//   generators  a generator family's module that could not be loaded
//
// A finding is {check, rule, rules?, where, detail, severity}: `rule` is the rule that raised it (lib/rules.mjs), and a
// lock finding's `rules` names every lock phrase that matched; severity is "error" or "warn" (a warning fails under
// --strict). scripts/spikes/W1-T38/README.md has the table of rules with the spine line each one comes from.

import { copyFindings } from './copy.mjs'
import { lessonPosition, stageEnd } from './glossary.mjs'
import { knownRule, ruleCheck } from './rules.mjs'
import { lineStarts, lineAt, maskForWords, wordCount } from './text.mjs'

// ------------------------------------------------------------------ the numbers the spine gives

/** The six content block types of W1-W2 (V2-18; spine section 12 item 48). A seventh needs a logged decision. */
export const SIX_BLOCK_TYPES = ['prose', 'instrument', 'item', 'claim', 'specimen', 'card']
/** An item's roles, and a card's variants (spine section 12 item 48; the dated reading pointer is a card too, section 3.0). */
export const ITEM_ROLES = ['prequestion', 'segment', 'exit']
export const CARD_VARIANTS = ['build-this', 'twin', 'dated-incident', 'feels-harder', 'reading']

// Each limit and each list below is read when a rule runs, so rules.test.mjs can loosen a limit by one at either end, or
// take a word out of a list, and require a plant of lib/plants.mjs to be missed: each end of each range has a plant one
// step past it, and each word of each list a plant of its own.

/** A core lesson: 2 to 4 segments of 12 to 15 minutes, one or two prequestions; planned at 40 to 60 minutes (spine section 3.0 and 3.0's budget method). */
export const CORE = { segments: [2, 4], segmentMinutes: [12, 15], prequestions: [1, 2], planned: [40, 60] }
/** A bridge: at most 1,000 words, one prequestion, planned at 15 to 25 minutes. */
export const BRIDGE = { words: 1000, prequestions: [1, 1], planned: [15, 25] }
/** Boot: at most 8 minutes on a phone (spine section 3.1). */
export const BOOT = { minutes: 8 }

const ISO_DATE = /\b20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])\b/

/**
 * What the rail may not show (V2-05: "never answers, verdicts or option text"), whether or not a question on its page
 * offers it:
 *
 *   verdictWords        the solver's answers, in any case (verdictsInAnyCase)
 *   stampWords          the stamp words of spine section 8.7 as stamps are written, in capitals ("what stays assumed" is
 *                       a title; "ASSUMED" is a stamp); the stamp word UNKNOWN is the solver's word too, so it is read
 *                       among the verdict words, in any case
 *   titleInOptionWords  a title of this many words or more that stands inside an option is that option's text
 *                       ("Some inputs get past the guard")
 *   numberWords         a number spelled out where a title ends or pauses, when an option is that number
 */
export const RAIL = {
  verdictWords: ['sat', 'unsat', 'unknown', 'satisfiable', 'unsatisfiable'],
  verdictsInAnyCase: true,
  stampWords: ['PROVED', 'REFUTED', 'MODEL-CHECKED', 'TESTED', 'ENFORCED', 'CONFIGURED', 'ASSUMED', 'NOT COVERED'],
  titleInOptionWords: 4,
  numberWords: { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 },
}
const alternation = (words) => words.map((w) => w.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('|')
/** A solver's verdict as a whole word, in any case. */
const solverVerdict = () => new RegExp(String.raw`(?<![\p{L}\p{N}_-])(?:${alternation(RAIL.verdictWords)})(?![\p{L}\p{N}_-])`, RAIL.verdictsInAnyCase ? 'iu' : 'u')
/** A stamp word as a whole word, in capitals. */
const stampWord = () => new RegExp(String.raw`(?<![A-Za-z-])(?:${alternation(RAIL.stampWords)})(?![A-Za-z-])`)
/** The verdict a title names, or undefined. */
export function titleVerdict(title) {
  if (!isString(title)) return undefined
  return (solverVerdict().exec(title) ?? stampWord().exec(title))?.[0]
}
/** The rule a verdict in a title breaks: a solver's verdict (any case), or a stamp word in capitals. */
const verdictRule = (word, prefix = '') => `rail/${prefix}${solverVerdict().test(word) ? 'verdict' : 'stamp'}`
/** The rule a leak the pipeline's railLeaks reports breaks: markup in a title, a repeated title, or an option in a title. */
export function leakRule(message, prefix = '') {
  if (/ is not plain text/.test(message)) return `rail/${prefix}markup`
  if (/ repeats the title of segment /.test(message)) return `rail/${prefix}repeat`
  return `rail/${prefix}option`
}
const verdictMessage = (title, word) => `the title ${JSON.stringify(title)} names the verdict ${JSON.stringify(word)}: the rail shows no answers, verdicts or option text, whatever the page's questions offer (V2-05)`
/** The segments railLeaks reports for what a title gives away (markup, an option), not for a repeat. */
const givenAway = (leaks) => new Set(leaks.filter((l) => !/repeats the title of segment/.test(l.message)).map((l) => l.segment))
/**
 * Emphasis in underscores, which the pipeline's check of markup does not read: "What _it_ showed", "__Why__ it fails". An
 * underscore inside a word ("balance_after", "snake_case") is not emphasis.
 */
const UNDERSCORE_EMPHASIS = /(?<![\p{L}\p{N}_])_{1,2}(?![\s_])[^_\n]*?(?<![\s_])_{1,2}(?![\p{L}\p{N}_])/u
/**
 * The pipeline's railLeaks, and a title in underscore emphasis as markup too: a title is plain text, and a Markdown
 * emphasis in underscores is as much markup as one in asterisks. A title railLeaks already reports is reported once.
 */
export function railLeaksOf(content, page) {
  const leaks = content.railLeaks(page)
  const reported = givenAway(leaks)
  page.segments.forEach((s, i) => {
    if (reported.has(i) || !isString(s.title) || !UNDERSCORE_EMPHASIS.test(s.title)) return
    leaks.push({ segment: i, message: `the title ${JSON.stringify(s.title)} is not plain text: the rail takes no Markdown, code, link or reference, and emphasis in underscores is Markdown` })
  })
  return leaks
}

function isString(v) {
  return typeof v === 'string'
}
const isItem = (b) => b?.type === 'item'
const isCell = (b) => b?.type === 'instrument'
const hasCall = (b) => isCell(b) && b.callOnFirstRun === true && b.call !== undefined
/** A generated Call It: the first scored call of a segment is an item of GEN-call-it. */
const isGeneratedCall = (b) => isItem(b) && b.family === 'GEN-call-it' && b.role === 'segment'

/**
 * The segment kinds of a lesson page: the opening (prequestions alone), the teaching segments, the exit. The last segment is
 * the exit when it holds exit items and no cell and no segment item; exit items inside a teaching segment do not make it the exit.
 */
export function segmentKinds(page) {
  const segs = page.segments
  const kinds = segs.map(() => 'teaching')
  const last = segs.length - 1
  if (last >= 0) {
    const blocks = segs[last].blocks
    if (blocks.some((b) => isItem(b) && b.role === 'exit') && !blocks.some(isCell) && !blocks.some((b) => isItem(b) && b.role === 'segment')) kinds[last] = 'exit'
  }
  if (segs.length > 1 && kinds[0] === 'teaching') {
    const blocks = segs[0].blocks
    if (blocks.some((b) => isItem(b) && b.role === 'prequestion') && !blocks.some(isCell) && !blocks.some((b) => isItem(b) && b.role === 'segment')) kinds[0] = 'opening'
  }
  return kinds
}

// ------------------------------------------------------------------ one place to collect findings

/** A finding of a rule (lib/rules.mjs), whose check is the part of its ID before the slash. */
export function finding(rule, where, detail, severity = 'error', rules = undefined) {
  if (!knownRule(rule)) throw new Error(`${rule} is not a rule of lib/rules.mjs`)
  return { check: ruleCheck(rule), rule, ...(rules === undefined ? {} : { rules }), where, detail, severity }
}

function collector({ file, lines, source, content }) {
  const findings = []
  const rawLines = source === undefined ? null : source.split('\n')
  const where = (line) => `${file}:${line ?? 1}`
  return {
    findings,
    /** A finding of a rule at a JSON Pointer of the record. */
    at(rule, pointer, detail, severity = 'error') {
      findings.push(finding(rule, where(content.lineOf(lines, pointer)), detail, severity))
    },
    /** A finding of a rule at a line. */
    line(rule, line, detail, severity = 'error') {
      findings.push(finding(rule, where(line), detail, severity))
    },
    /**
     * A finding in a string of copy. The line is the string's own line (the pointer's, or the first line from there on
     * that holds the string's first line, since a cell's @direction, @tap and @after sit below the cell's opening),
     * plus the lines before the offset, then corrected to the nearest line that holds the word: a block's body starts
     * after its opening line.
     */
    inCopy(pointer, text, f, severity = 'error') {
      let start = content.lineOf(lines, pointer) ?? 1
      let skipped = 0
      const head = text.split('\n').find((l) => l.trim().length >= 8)
      if (rawLines !== null && head !== undefined) {
        const probe = head.trim().slice(0, 60)
        for (let n = start; n <= Math.min(rawLines.length, start + 400); n += 1) {
          if (rawLines[n - 1].includes(probe)) {
            start = n
            skipped = text.slice(0, text.indexOf(head)).match(/\n/g)?.length ?? 0
            break
          }
        }
      }
      let line = start - skipped + (text.slice(0, f.index).match(/\n/g)?.length ?? 0)
      const word = (f.word ?? '').split('\n')[0]
      if (rawLines !== null && word !== '') {
        const has = (n) => (rawLines[n - 1] ?? '').includes(word)
        if (!has(line)) {
          for (let d = 1; d <= 12; d += 1) {
            if (has(line + d)) {
              line += d
              break
            }
            if (d <= 3 && line - d >= 1 && has(line - d)) {
              line -= d
              break
            }
          }
        }
      }
      findings.push(finding(f.rule, where(line), f.detail, severity, f.rules))
    },
  }
}

// ------------------------------------------------------------------ the generators' options, for the rail

/** The options a page's generated items may show, read from each family's maker (a family not built yet is noted). */
async function generatedTexts(page, env, add) {
  const wanted = new Map()
  for (const s of page.segments) for (const b of s.blocks) if (isItem(b) && isString(b.family) && isString(b.template)) wanted.set(`${b.family}|${b.template}|${b.band ?? ''}`, b)
  const texts = new Set()
  for (const b of wanted.values()) {
    const r = await env.generated(b.family, b.template, b.band)
    if (r.missing) env.note(`generator-missing:${b.family}`)
    else if (r.error) add.line('generators/load', 1, `could not load the generator of ${b.family} to read its options: ${r.error}`)
    else for (const t of r.texts) texts.add(t)
  }
  return texts
}

/** The options a page authors: a cell's call and an item's fixed instance. */
function authoredTexts(page) {
  const out = []
  for (const s of page.segments) {
    for (const b of Array.isArray(s.blocks) ? s.blocks : []) {
      const choice = b?.type === 'instrument' ? b.call : b?.type === 'item' ? b.choice : undefined
      for (const o of Array.isArray(choice?.options) ? choice.options : []) if (isString(o?.text)) out.push(o.text)
    }
  }
  return out
}

/**
 * The segments whose title stands inside an option's text: railLeaks finds an option inside a title, and this the other way
 * round, so a title that repeats an option without its "Yes:" is option text too (V2-05). Returns [{segment, kind, message}],
 * `kind` being title-in-option or spelled-number.
 */
export function titlesInOptions(page, texts, normalize) {
  const options = texts.map((t) => ` ${normalize(t)} `)
  const numbers = new Set(texts.map((t) => normalize(t)).filter((t) => /^[0-9]+$/.test(t)))
  // a number word at the end of a title or before its punctuation
  const spelled = new RegExp(String.raw`\b(${alternation(Object.keys(RAIL.numberWords))})\b(?=\s*(?:$|[.,;:!?)\u2014-]))`, 'gi')
  const out = []
  page.segments.forEach((s, i) => {
    if (!isString(s.title)) return
    const title = normalize(s.title)
    if (title.split(' ').length >= RAIL.titleInOptionWords && options.some((o) => o.includes(` ${title} `))) {
      out.push({ segment: i, kind: 'title-in-option', message: `the title ${JSON.stringify(s.title)} is the text of an option of a question on this page: the rail shows no option text (V2-05)` })
      return
    }
    // a number spelled out where a title ends or pauses ("The amount comes back as one"), when an option is that number;
    // a number word before a noun counts things ("One witness, one class") and is left alone
    for (const m of s.title.matchAll(spelled)) {
      const digit = String(RAIL.numberWords[m[1].toLowerCase()])
      if (numbers.has(digit)) {
        out.push({ segment: i, kind: 'spelled-number', message: `the title ${JSON.stringify(s.title)} spells out ${JSON.stringify(digit)}, an option of a question on this page: the rail shows no answers or option text (V2-05)` })
        return
      }
    }
  })
  return out
}

/**
 * The leaks of a page's titles into the options its generated items may show: railLeaks over a page that holds them.
 * Returns the segments it reported, and the options it read.
 */
async function generatedRailLeaks(page, env, add) {
  const reported = new Set()
  const texts = await generatedTexts(page, env, add)
  if (texts.size === 0) return { reported, texts }
  const options = [...texts].map((text, i) => ({ id: String.fromCharCode(65 + (i % 26)), text, why: '' }))
  const synthetic = { type: 'item', role: 'segment', family: 'GEN-x', template: 't1', kcs: [], choice: { prompt: '', options, key: 'A' } }
  const withOptions = { ...page, segments: page.segments.map((s, i) => (i === 0 ? { ...s, blocks: [...s.blocks, synthetic] } : s)) }
  const before = new Set(env.content.railLeaks(page).map((l) => `${l.segment}|${l.message}`))
  for (const leak of env.content.railLeaks(withOptions)) {
    if (before.has(`${leak.segment}|${leak.message}`)) continue
    reported.add(leak.segment)
    add.at('rail/generated', `/segments/${leak.segment}`, `${leak.message} (a generated item's options)`)
  }
  return { reported, texts }
}

// ------------------------------------------------------------------ lesson anatomy

function anatomy(page, tier, add, env) {
  const segs = page.segments
  const kinds = segmentKinds(page)
  const blocks = segs.flatMap((s) => s.blocks)
  const items = blocks.filter(isItem)
  const cells = blocks.filter(isCell)
  const total = segs.reduce((n, s) => n + (Number.isInteger(s.minutes) ? s.minutes : 0), 0)
  const first = (role) => items.filter((b) => b.role === role)
  const pointerOf = (si, bi) => `/segments/${si}/blocks/${bi}`
  const err = (rule, pointer, detail) => add.at(`anatomy/${rule}`, pointer, detail)
  const warn = (rule, pointer, detail) => add.at(`anatomy/${rule}`, pointer, detail, 'warn')

  if (tier === 'step') return // a capstone step is not a lesson (spine section 3.10); no anatomy is specified for it

  // I1: no completion without a graded item. Boot's is its call, an authored one in the cell or a fixed question
  const graded = items.length > 0 || cells.some(hasCall)
  if (tier !== 'boot' && !graded) err('graded', '', `${page.id} has no graded item: a lesson without one could be finished by reading (I1)`)

  // Call It on the first run: a cell that asks for a call carries it (a free run says call=false)
  segs.forEach((s, si) =>
    s.blocks.forEach((b, bi) => {
      if (isCell(b) && b.callOnFirstRun === true && b.call === undefined) err('call-carried', pointerOf(si, bi), `cell ${b.cell} asks for a call on its first run but carries none: write its @call, or call=false for a free run`)
    }),
  )

  // a Build this card points at a lab stage: the stage it names is one the registry has (LAB-1.2, not LAB-1 or S1.L3)
  segs.forEach((s, si) =>
    s.blocks.forEach((b, bi) => {
      if (b?.type === 'card' && b.variant === 'build-this' && b.lab !== undefined && !(isString(b.lab) && env.index.has('lab-stage', b.lab))) {
        err('build-this-lab', pointerOf(si, bi), `the Build this card names ${JSON.stringify(b.lab)}, which is not a lab stage of the spine's registry: lab=LAB-1.2`)
      }
    }),
  )

  // one tool per session (spine section 4.1, the segment row): a segment's cells run one instrument; an item checked
  // offline is not a cell (S1.L5's witnesses)
  segs.forEach((s, si) => {
    const tools = [...new Set(s.blocks.filter(isCell).map((b) => b.ins))]
    if (tools.length > 1) err('one-tool', `/segments/${si}`, `segment ${si + 1} runs ${tools.join(' and ')}: a segment uses one tool (spine section 4.1, "one tool per session")`)
  })

  if (tier === 'boot') {
    if (total > BOOT.minutes) err('boot-minutes', '/segments', `Boot is at most ${BOOT.minutes} minutes on a phone; its segments add up to ${total}`)
    // one call before the first run (curriculum/S01-counterexample.md: "asked before any instruction, answered by the
    // run"): the first cell carries its @call, or a fixed question stands before the first cell; a page with no cell asks
    // its call as a fixed question
    const firstCell = blocks.findIndex(isCell)
    const firstQuestion = blocks.findIndex((b) => isItem(b) && b.choice !== undefined)
    const callFirst = firstCell < 0 ? firstQuestion >= 0 : hasCall(blocks[firstCell]) || (firstQuestion >= 0 && firstQuestion < firstCell)
    if (!callFirst) err('boot-call', '/segments', 'Boot asks for one call before the first run: its first instrument cell carries the @call, or a fixed question comes before that cell (the call doubles as Boot\'s prequestion)')
    if (!blocks.some((b) => b.type === 'card' && b.variant === 'feels-harder')) err('boot-feels-harder', '/segments', 'Boot ends with the "this will feel harder" card: :::card variant=feels-harder')
    return
  }

  // the opening, the segments and the close
  const prequestions = first('prequestion')
  const [pqMin, pqMax] = tier === 'core' ? CORE.prequestions : BRIDGE.prequestions
  if (prequestions.length < pqMin || prequestions.length > pqMax) {
    err('prequestions', '/segments', `a ${tier} lesson has ${pqMin === pqMax ? `${pqMin} prequestion` : `${pqMin} to ${pqMax} prequestions`}; this one has ${prequestions.length}`)
  }
  const teaching = segs.map((s, i) => ({ s, i })).filter(({ i }) => kinds[i] === 'teaching')

  if (tier === 'core') {
    const opener = segs[0]?.blocks[0]
    if (opener !== undefined && !(opener.type === 'prose' || (isItem(opener) && opener.role === 'prequestion'))) {
      err('core-opener', pointerOf(0, 0), 'a core lesson opens with a hook and its prequestions: the first block is prose or a prequestion, not a cell or a graded item')
    }
    const [lo, hi] = CORE.segments
    if (teaching.length < lo || teaching.length > hi) err('core-segments', '/segments', `a core lesson has ${lo} to ${hi} segments of ${CORE.segmentMinutes[0]} to ${CORE.segmentMinutes[1]} minutes (and its exit); this one has ${teaching.length}`)
    for (const { s, i } of teaching) {
      const [m0, m1] = CORE.segmentMinutes
      if (!Number.isInteger(s.minutes) || s.minutes < m0 || s.minutes > m1) err('core-segment-minutes', `/segments/${i}`, `segment ${i + 1} is ${s.minutes} minutes; a core segment is ${m0} to ${m1}`)
      if (!s.blocks.some(isCell)) err('core-cell', `/segments/${i}`, `segment ${i + 1} has no instrument cell: each segment is built around one instrument run`)
      else if (s.blocks.filter(isCell).length > 1) warn('core-cells', `/segments/${i}`, `segment ${i + 1} has ${s.blocks.filter(isCell).length} instrument cells: a segment is built around one instrument run`)
      if (!s.blocks.some(hasCall) && !s.blocks.some(isGeneratedCall)) err('core-call', `/segments/${i}`, `segment ${i + 1} asks for no call on its first run: its cell carries a @call, or the segment holds a generated Call It (an item of GEN-call-it)`)
    }
    if (first('exit').length === 0) err('core-exit', '/segments', 'a core lesson has exit items that create Today cards: an item with role=exit')
    if (!blocks.some((b) => b.type === 'card' && b.variant === 'build-this' && isString(b.lab))) err('core-build-this', '/segments', 'a core lesson has a "Build this" card for the next lab stage: :::card variant=build-this lab=LAB-1.2')
    if (total < CORE.planned[0] || total > CORE.planned[1]) warn('core-planned', '/segments', `a core lesson is planned at ${CORE.planned[0]} to ${CORE.planned[1]} minutes; this one adds up to ${total}`)
  }

  if (tier === 'bridge') {
    const words = copyWords(page, env)
    if (words > BRIDGE.words) err('bridge-words', '', `a bridge lesson is at most ${BRIDGE.words} words; this one has ${words}`)
    // a bridge introduces the knowledge components that no lesson before it lists (S1.L4 lists KC-1.witness-class, which S1.L1 introduced)
    const covered = new Set(prequestions.flatMap((b) => (Array.isArray(b.kcs) ? b.kcs : [])))
    const earlier = env.kcsBefore(isString(page.id) ? page.id : '')
    const missing = (Array.isArray(page.kcs) ? page.kcs : []).filter((k) => !earlier.has(k) && !covered.has(k))
    if (prequestions.length === 1 && missing.length > 0) {
      err('bridge-kcs', '/kcs', `a bridge's one prequestion is tagged with every knowledge component the lesson introduces (one that an earlier lesson lists was introduced there); this one leaves out ${missing.join(', ')}`)
    }
    // a bridge whose instrument is a link-out (S2.L1's Natural Number Game) has no cell of its own
    if (!cells.some(hasCall)) warn('bridge-cell', '/segments', 'a bridge lesson has instrument cells with Call It on their first runs: this one has no cell with a @call')
    if (first('segment').length === 0) err('bridge-segment-item', '/segments', 'a bridge lesson has one graded item: an item with role=segment')
    if (first('exit').length === 0) err('bridge-exit', '/segments', 'a bridge lesson has an exit item: an item with role=exit')
    const readings = blocks.filter((b) => b.type === 'card' && b.variant === 'reading')
    if (readings.length === 0) err('bridge-reading', '/segments', 'a bridge lesson ends with a dated, section-level pointer into the roadmap\'s reading: :::card variant=reading')
    else if (!readings.some((b) => ISO_DATE.test(String(b.md)))) err('bridge-reading-date', '/segments', 'the reading pointer is dated: say when the section was read, as 2026-10-23')
    if (total < BRIDGE.planned[0] || total > BRIDGE.planned[1]) warn('bridge-planned', '/segments', `a bridge lesson is planned at ${BRIDGE.planned[0]} to ${BRIDGE.planned[1]} minutes; this one adds up to ${total}`)
  }

  // each segment of teaching ends in a graded item (spine section 3.0; EVIDENCE.md: "ending in a graded interaction")
  // (a claim or a specimen block draws nothing in its segment: "Establishes" shows it after the exit items, so it may stand last)
  for (const { s, i } of teaching) {
    const shown = s.blocks.filter((b) => b.type !== 'claim' && b.type !== 'specimen')
    const lastBlock = shown[shown.length - 1]
    if (!(isItem(lastBlock) && lastBlock.role === 'segment')) {
      if (tier === 'core' || s.blocks.some(isCell) || s.blocks.some((b) => isItem(b) && b.role === 'segment')) err('segment-ends-graded', pointerOf(i, Math.max(s.blocks.length - 1, 0)), `segment ${i + 1} ends in a graded item: its last block is an item with role=segment`)
    }
  }
  // exit items belong to the close
  const lastIndex = segs.length - 1
  segs.forEach((s, i) => {
    if (i !== lastIndex && s.blocks.some((b) => isItem(b) && b.role === 'exit')) warn('exit-last', `/segments/${i}`, `segment ${i + 1} holds exit items: the exit is the last segment`)
  })
}

/** The words a learner reads on a page: every string of copy but code. */
function copyWords(page, env) {
  return env.content.copyOf(page).reduce((n, s) => n + wordCount(maskForWords(String(s.text))), 0)
}

// ------------------------------------------------------------------ lines that read as blocks

/** A block, as the pipeline reads one: `:::name` or `::name` at the start of a line, in lower case (packages/content/src/source.ts). */
const CONTAINER_OPEN = /^:::([a-z][a-z-]*)(?:\s+(.*))?\s*$/
const LEAF = /^::([a-z][a-z-]*)(?:\s+(.*))?\s*$/
/** A line that a writer meant as a block: colons, then a name in any case, maybe indented or spaced (":::Figure", "::Item", "::: card"). */
const LOOKS_LIKE_BLOCK = /^[ \t]*:{2,}[ \t]*([A-Za-z][A-Za-z0-9_-]*)/
const FENCE = /^ {0,3}(`{3,}|~{3,})/

/**
 * The lines of a page source that read as a block and are not one. The pipeline takes them for prose, so a learner sees
 * ":::Figure" as text, and a block meant as "::Item" is silently lost: a seventh type or a broken one either way.
 */
export function strayFences(text) {
  const out = []
  const lines = text.split('\n')
  let i = 0
  if (lines[0]?.trim() === '---') {
    i = lines.findIndex((l, k) => k > 0 && l.trim() === '---') + 1
    if (i === 0) return out
  }
  let fence = null
  let comment = false
  for (; i < lines.length; i += 1) {
    const line = lines[i]
    const f = FENCE.exec(line)
    if (fence !== null) {
      if (f !== null && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = null
      continue
    }
    if (f !== null) {
      fence = f[1]
      continue
    }
    if (comment) {
      if (line.includes('-->')) comment = false
      continue
    }
    if (line.includes('<!--') && !line.includes('-->')) {
      comment = true
      continue
    }
    const m = LOOKS_LIKE_BLOCK.exec(line)
    if (m === null || CONTAINER_OPEN.test(line) || LEAF.test(line)) continue
    const name = m[1].toLowerCase()
    const meant = SIX_BLOCK_TYPES.includes(name) ? `; written as ::${name} or :::${name}, it would be the ${name} block it means` : `, and ${m[1]} is not one of them either`
    out.push({ line: i + 1, detail: `${JSON.stringify(line.trim().slice(0, 60))} reads as a block but is not one, so it shows as text: a block is ::name or :::name at the start of a line, in lower case, one of the six (${SIX_BLOCK_TYPES.join(', ')})${meant}` })
  }
  return out
}

// ------------------------------------------------------------------ the pipeline's own lists

/**
 * The content pipeline's own lists of block types, item roles and card variants are the spine's six, three and five, or
 * the gate says so: a seventh type is a decision, not an edit of a list (spine section 12 item 48).
 */
export function pipelineDrift(content) {
  const out = []
  const drift = (name, mine, theirs) => {
    const listed = Array.isArray(theirs) ? theirs : []
    if (JSON.stringify([...mine].sort()) !== JSON.stringify([...listed].sort())) {
      out.push(finding('block-type/drift', 'packages/content/src/blocks.ts:1', `the pipeline's ${name} (${listed.join(', ')}) are not the spine's (${mine.join(', ')}; section 12 item 48): a change needs a logged decision`))
    }
  }
  drift('block types', SIX_BLOCK_TYPES, content.BLOCK_TYPES)
  drift('item roles', ITEM_ROLES, content.ITEM_ROLES)
  drift('card variants', CARD_VARIANTS, content.CARD_VARIANTS)
  return out
}

// ------------------------------------------------------------------ the page

/**
 * Lint one lesson or drawer source. Returns {findings}. `kind` says which it is; a drawer has no anatomy and no rail.
 */
export async function lintPage({ text, file, kind, env }) {
  const { content, index, glossary } = env
  const parsed = content.parsePageSource(text, { kind })
  const add = collector({ file, lines: parsed.lines, source: text, content })
  // a page that cannot be read cannot be vouched for; the problems the rules below report themselves are left out: a
  // block of a type outside the six (block-type/type), an item with no family or template (family/missing,
  // family/no-template). A prose block written as a fence (":::prose") is of one of the six types, so the build's
  // refusal of it is reported here
  const covered = (p) => (p.code === 'block-type' && / is not a block type: /.test(p.message)) || (p.code === 'attributes' && /^item needs (?:family|template)=/.test(p.message))
  for (const p of parsed.problems) {
    if (p.severity === 'error' && !covered(p)) add.line('read/page', p.line, `${p.message} (node scripts/build-content.mjs --check says the same)`)
  }
  // The record is read before any schema has judged it, so a front matter field may be of any type: `deferred:` with no
  // value is null, which the pipeline's copyOf does not expect.
  const page = parsed.record === null ? null : { ...parsed.record, ...(parsed.record.deferred === null ? { deferred: undefined } : {}) }
  if (page === null) return { findings: add.findings }
  if (!Array.isArray(page.segments)) return { findings: add.findings }

  const id = isString(page.id) ? page.id : ''
  const entry = index.entry(id)
  const drawer = kind === 'drawer'

  // the page's own facts
  if (entry === undefined || entry.kind !== (drawer ? 'drawer' : 'lesson')) add.at('front/id', '/id', `${id || 'the page'} is not a ${drawer ? 'drawer' : 'lesson'} of the spine's registry`)
  if (!isString(page.title) || page.title.trim() === '') add.at('front/title', '/title', 'a page has a title')
  if (!drawer && entry?.kind === 'lesson' && page.tier !== entry.tier) add.at('front/tier', '/tier', `the spine gives ${id} the tier ${entry.tier}; this page says ${String(page.tier)}`)
  if (!drawer && !(isString(page.objective) && page.objective.trim() !== '')) add.at('front/objective', '/objective', 'a lesson states its observable objective, in the learner\'s words')
  if (!drawer && entry?.kind === 'lesson' && entry.tier !== 'step' && !(Array.isArray(page.kcs) && page.kcs.length > 0)) add.at('front/kcs', '/kcs', 'a lesson lists the knowledge components it teaches (kcs: [KC-1.a, KC-1.b]): its items and its prequestion are tagged with them')

  // the six block types, and the roles and variants inside them
  for (const [type, n] of Object.entries(content.countBlockTypes(page))) env.counts?.set(type, (env.counts.get(type) ?? 0) + n)
  page.segments.forEach((s, si) => {
    ;(Array.isArray(s.blocks) ? s.blocks : []).forEach((b, bi) => {
      const at = `/segments/${si}/blocks/${bi}`
      if (!SIX_BLOCK_TYPES.includes(b?.type)) add.at('block-type/type', at, `${String(b?.type)} is not a content block type: W1-W2 content uses the six of spine section 12 item 48 (${SIX_BLOCK_TYPES.join(', ')}), and a seventh needs a logged decision`)
      if (b?.type === 'item' && !ITEM_ROLES.includes(b.role)) add.at('block-type/role', at, `an item's role is ${ITEM_ROLES.join(', ')}; ${String(b.role)} would be another kind of block`)
      if (b?.type === 'card' && !CARD_VARIANTS.includes(b.variant)) add.at('block-type/variant', at, `a card's variant is ${CARD_VARIANTS.join(', ')}; ${String(b.variant)} would be another kind of block`)
    })
  })

  // every graded item names its generator family and template
  page.segments.forEach((s, si) => {
    ;(Array.isArray(s.blocks) ? s.blocks : []).forEach((b, bi) => {
      if (!isItem(b)) return
      const at = `/segments/${si}/blocks/${bi}`
      if (!isString(b.family) || b.family === '') add.at('family/missing', at, 'a graded item names its generator family: family=GEN-negate-it')
      else if (!index.has('generator', b.family)) add.at('family/unregistered', at, `${b.family} is not a generator family of the spine's registry (section 8.3)`)
      if (!isString(b.template) || b.template === '') add.at('family/no-template', at, 'a graded item names its template: template=t1')
      else {
        const n = /^t([1-9])$/.exec(b.template)
        const count = isString(b.family) ? index.templatesOf(b.family) : undefined
        if (n === null) add.at('family/not-template', at, `${b.template} is not a template: t1 to t4`)
        else if (count !== undefined && Number(n[1]) > count) add.at('family/template-count', at, `${b.family} has ${count} templates in the spine, so ${b.template} does not exist`)
      }
    })
  })

  // the rail: titles only
  if (!drawer) {
    const leaks = railLeaksOf(content, page)
    for (const leak of leaks) add.at(leakRule(leak.message), `/segments/${leak.segment}`, leak.message)
    page.segments.forEach((s, i) => {
      if (!isString(s.title) || s.title.trim() === '') add.at('rail/untitled', `/segments/${i}`, `segment ${i + 1} has a title: the rail shows titles and nothing else`)
    })
    const flagged = givenAway(leaks)
    const generated = await generatedRailLeaks(page, env, add)
    for (const i of generated.reported) flagged.add(i)
    // a title that stands inside an option, authored or generated
    for (const leak of titlesInOptions(page, [...authoredTexts(page), ...generated.texts], content.normalize)) {
      if (flagged.has(leak.segment)) continue
      flagged.add(leak.segment)
      add.at(`rail/${leak.kind}`, `/segments/${leak.segment}`, leak.message)
    }
    // a verdict in a title, which no option on the page need offer (one finding for a title, the option's when there is one)
    page.segments.forEach((s, i) => {
      const word = flagged.has(i) ? undefined : titleVerdict(s.title)
      if (word !== undefined) add.at(verdictRule(word), `/segments/${i}`, verdictMessage(s.title, word))
    })
  }

  // a line that reads as a block and is not one shows as text, and the block it meant is lost
  for (const f of strayFences(text)) add.line('block-type/stray', f.line, f.detail)

  // anatomy
  const tier = entry?.kind === 'lesson' ? entry.tier : page.tier
  if (!drawer) anatomy(page, tier, add, env)
  if (drawer && entry?.deferred === true) deferredCard(page, add)

  // the copy rules
  const boot = !drawer && tier === 'boot'
  const place = drawer ? 'drawer' : boot ? 'boot' : 'lesson'
  let unit = null
  if (!drawer) unit = lessonPosition(id)
  else if (entry?.kind === 'drawer' && entry.deferred !== true && Array.isArray(entry.stages) && entry.stages.length > 0) unit = stageEnd(Math.min(...entry.stages.map((s) => Number(String(s).slice(1)))))
  for (const s of content.copyOf(page)) {
    if (!isString(s.text)) continue
    for (const f of copyFindings(s.text, { glossary, unit, boot, place, scanIds: env.scanIds })) add.inCopy(s.path, s.text, f)
  }
  return { findings: add.findings }
}

/** A deferred drawer shows what the topic is, why the roadmap defers it and what surfaces it, and unlocks nothing. */
function deferredCard(page, add) {
  const d = page.deferred
  if (d === undefined || d === null || typeof d !== 'object') return add.at('drawer/card', '/deferred', 'a deferred drawer carries its card: topic, why and trigger')
  for (const key of ['topic', 'why', 'trigger']) {
    if (!isString(d[key]) || d[key].trim() === '') add.at('drawer/card-field', `/deferred/${key}`, `a deferred drawer's card says its ${key}`)
  }
  if (Array.isArray(page.segments) && page.segments.length > 0) add.at('drawer/segments', '/segments', 'a deferred drawer is its card alone: it has no segments')
}

// ------------------------------------------------------------------ stage and lab records

/**
 * Every string a learner may read in a stage's or a lab's record, with its JSON Pointer: all strings but the schema tag.
 * Under `extra`, which holds what no field names yet (hint rungs, Prove-it mutants, tool names), a string of one word is
 * a name and not copy.
 */
export function recordStrings(value, pointer = '') {
  const out = []
  const escape = (k) => k.replaceAll('~', '~0').replaceAll('/', '~1')
  if (isString(value)) {
    if (!(pointer.startsWith('/extra/') && !/\s/.test(value.trim()))) out.push({ path: pointer, text: value })
  } else if (Array.isArray(value)) value.forEach((v, i) => out.push(...recordStrings(v, `${pointer}/${i}`)))
  else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!(pointer === '' && k === 'schema')) out.push(...recordStrings(v, `${pointer}/${escape(k)}`))
  }
  return out
}

/**
 * A string that holds registry IDs and nothing else but separators (`family: GEN-negate-it`, `kc: KC-1.witness-class`,
 * `drawers: [D-01, D-03]`), or one token with an ID in it (`ref: placement:step-4/GEN-call-it/t1`), is data that a record
 * keys on, not copy a learner reads.
 */
export function onlyIds(text, scanIds) {
  const trimmed = String(text).trim()
  if (!/\s/.test(trimmed) && scanIds(trimmed).length > 0) return true
  let found = false
  for (const line of String(text).split('\n')) {
    let rest = line
    for (const t of scanIds(line)) {
      found = true
      const at = t.col - 1
      rest = rest.slice(0, at) + ' '.repeat(t.id.length) + rest.slice(at + t.id.length)
    }
    if (!/^[\s,;·|/+&]*$/.test(rest)) return false
  }
  return found
}

/**
 * Lint a stage's or a lab's YAML record (content/stages/S1/stage.yaml, lab.yaml), which sits at the end of its stage, or a
 * record that the caller places itself with `at` and `boot`: the placement walk (content/stages/S1/placement.yaml) sits at
 * the start of its stage, and S1's closes Boot, so its copy uses Boot's terms (spine section 3.1).
 */
export async function lintRecord({ text, file, env, at, boot = false }) {
  const { content, glossary } = env
  const read = content.readYaml(text)
  const add = collector({ file, lines: read.lines, source: text, content })
  for (const p of read.problems) if (p.severity === 'error') add.line('read/record', p.line, `${p.message} (node scripts/build-content.mjs --check says the same)`)
  const record = read.value
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return { findings: add.findings }
  const id = isString(record.id) ? record.id : ''
  const n = /^(?:S|LAB-)([1-9][0-9]*)$/.exec(id)
  const placed = at !== undefined
  const unit = placed ? at : n === null ? null : stageEnd(Number(n[1]))
  const place = placed ? 'placement' : id.startsWith('LAB-') ? 'lab' : 'stage'
  if (!placed && n === null) add.at('front/record-id', '/id', `${id || 'the record'} is not a stage (S1) or a lab (LAB-1)`)
  for (const [i, card] of (Array.isArray(record.cards) ? record.cards : []).entries()) {
    if (card !== null && typeof card === 'object') {
      if (card.type !== undefined && card.type !== 'card') add.at('block-type/record-type', `/cards/${i}`, `${String(card.type)} is not a content block type; a stage's cards are cards`)
      if (!CARD_VARIANTS.includes(card.variant)) add.at('block-type/record-variant', `/cards/${i}`, `a card's variant is ${CARD_VARIANTS.join(', ')}; ${String(card.variant)} would be another kind of block`)
    }
  }
  for (const s of recordStrings(record)) {
    if (onlyIds(s.text, env.scanIds)) continue
    for (const f of copyFindings(s.text, { glossary, unit, boot, place, scanIds: env.scanIds })) add.inCopy(s.path, s.text, f)
  }
  return { findings: add.findings }
}

// ------------------------------------------------------------------ built pages

/**
 * Lint a built lesson (apps/site/public/content/S1.L1.<hash>.json), which the site loads: its rail is the titles of its
 * segments and nothing else, and no block is of a seventh type. The sources are linted whatever the build wrote; this
 * is the check that what the site loads is what the sources say, as far as the rail goes (V2-05).
 */
export async function lintBuilt({ text, file, env }) {
  const { content } = env
  const findings = []
  const bad = (rule, detail) => findings.push(finding(rule, `${file}:1`, detail))
  let page
  try {
    page = JSON.parse(text)
  } catch (e) {
    bad('read/built-json', `the built page is not JSON: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`)
    return { findings }
  }
  if (page === null || typeof page !== 'object' || !Array.isArray(page.segments) || !Array.isArray(page.rail)) {
    bad('read/built-shape', 'a built lesson has segments and a rail')
    return { findings }
  }
  const same = page.rail.length === page.segments.length
  if (!same) bad('rail/built-count', `the rail has ${page.rail.length} entries for ${page.segments.length} segments: it is one title per segment`)
  page.rail.forEach((entry, i) => {
    const keys = entry !== null && typeof entry === 'object' ? Object.keys(entry).sort() : []
    if (keys.join(',') !== 'id,title') bad('rail/built-keys', `rail entry ${i + 1} holds ${keys.length === 0 ? 'no keys' : keys.join(', ')}: the rail shows an id and a title and nothing else (V2-05)`)
    else if (same && (entry.id !== page.segments[i]?.id || entry.title !== page.segments[i]?.title)) bad('rail/built-title', `rail entry ${i + 1} is not the title of segment ${i + 1}: the rail is built from the titles alone`)
  })
  const leaks = railLeaksOf(content, page)
  for (const leak of leaks) bad(leakRule(leak.message, 'built-'), leak.message)
  // a title inside an option, and a verdict in what the rail shows, which no option on the page need offer
  const flagged = givenAway(leaks)
  for (const leak of titlesInOptions(page, authoredTexts(page), content.normalize)) {
    if (flagged.has(leak.segment)) continue
    flagged.add(leak.segment)
    bad(`rail/built-${leak.kind}`, leak.message)
  }
  page.rail.forEach((entry, i) => {
    const word = flagged.has(i) || entry === null || typeof entry !== 'object' ? undefined : titleVerdict(entry.title)
    if (word !== undefined) bad(verdictRule(word, 'built-'), `rail entry ${i + 1}: ${verdictMessage(entry.title, word)}`)
  })
  for (const [type] of Object.entries(content.countBlockTypes(page))) {
    if (!SIX_BLOCK_TYPES.includes(type)) bad('block-type/built', `${type} is not a content block type: W1-W2 content uses the six of spine section 12 item 48, and a seventh needs a logged decision`)
  }
  return { findings }
}

// ------------------------------------------------------------------ other learner documents

/**
 * Lint a Markdown document of learner copy that has no place in the course order (labs/README.md): the copy rules, not the
 * first-use rule. `severity` is "warn" for a document that is not clean yet (WARN_DOCUMENTS in scripts/verify-lessons.mjs).
 */
export async function lintDocument({ text, file, env, severity = 'error' }) {
  const { glossary } = env
  const starts = lineStarts(text)
  const findings = []
  for (const f of copyFindings(text, { glossary, unit: null, boot: false, scanIds: env.scanIds })) {
    findings.push(finding(f.rule, `${file}:${lineAt(starts, f.index) + 1}`, f.detail, severity, f.rules))
  }
  return { findings }
}
