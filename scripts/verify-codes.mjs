#!/usr/bin/env node
// GATE-codes (spine section 0, "ID conventions"; sections 8.7 and 11.2; DESIGN.md sections 5.2, 5.8 and 11;
// W1-T01).
//
// Codes are bracketed and IDs are not. One allow-list of bracketed capital codes, in two sets with no code in both:
// the stamp codes of spine section 8.7 and the tags of its Tags paragraph ([X RUN-id], [V], [D], [U], [KS]), so a
// tag is never read as a stamp and any other capital code fails. Status vocabulary: "signed off" and the other
// learner states are never stamps, and learner copy says no bare "verified", "correct" or "safe" (spine section
// 11.2), nor "proven" or "guaranteed" (DESIGN.md section 11.2, which gives all five to GATE-codes).
//
//   node scripts/verify-codes.mjs              the fast lane
//   node scripts/verify-codes.mjs --strict     also fail on the known debt listed below
//   node scripts/verify-codes.mjs --json       print the report as JSON
//   node scripts/verify-codes.mjs --root DIR   check the tree under DIR
//   node scripts/verify-codes.mjs --self-check plant faults in scratch copies; the gate must report each as expected
//
// Checks (each finding names its check):
//   allow-list  the stamp codes and the tags are two disjoint sets, the same as packages/stamps' and the spine's
//   code        a bracketed capital code that is neither a stamp code nor a tag: [OK], [PROVED], [R2 …], [X] alone
//   id          an ID inside brackets, such as [CL-6.4] or [SEAM-1: …]; a link's text, an [X RUN-id] tag and code
//               are not brackets
//   pair        a stamp word with its code unbracketed (PROVED P, PROVED (P)) or with another word's code
//               (PROVED [M]); EROSION written with a code, since erosion is an event and never a stamp
//   state       a learner state written as a stamp: "signed off [T]", SETTLED [..], KEPT [..]
//   status      in learner copy, a bare "verified", "correct", "safe", "proven" or "guaranteed": one outside quotation
//               marks, outside code, and in a sentence that carries no stamp with its qualifier. A statement under
//               evaluation (a distractor, an agent's words) is quoted in prose; in YAML and JSON it is the value of a
//               key that holds one (EVALUATED_KEYS: options, distractors, a claim under audit, a quote, an agent's
//               words), and every other value is copy, quoted or not, since a YAML value's own quotes are syntax
//
// It reads README.md, docs/ (not docs/history/), curriculum/, tracker/, labs/, content/ (not content/pg-catalog/),
// design/ (not design/canvas/), apps/site/public/llms.txt, the strings and JSX text of both apps' scripts (.ts, .tsx,
// .js, .jsx and their module forms, tests aside, under apps/site/src and apps/instruments/src, whose page shows receipts
// to the learner), the text files those sources hold (a JSON of labels, a Markdown page a screen imports; a folder's
// README and a file generated from content aside), and the text and copy attributes (title, alt, aria-label,
// aria-description, aria-roledescription, placeholder, label, a description meta's content) of the apps' HTML and SVG
// pages: each app's own pages (index.html,
// instrument.html, host.html) and those under its src/ and public/, and any HTML or SVG file in learner content. In a
// document the copy attributes of a raw HTML or MDX tag (`<abbr title="…">`, `title={'…'}`) and a link's title are
// copy too, read on their own since the sentence around them quotes them. The status check reads learner copy only:
// content/, labs/README.md, labs/template/, and the apps' sources, their text files and pages. Fenced code, code
// spans, HTML comments, scripts and styles, link syntax (its text and title aside), index expressions such as c[A],
// and the brackets and braces of a YAML flow collection are not copy (the strings it holds are).
// In the apps' sources a template is read whole, its substitutions as "…" (`${claim} verified` is "… verified"), and
// so is a `+` chain that holds a string. A unit of several words is copy unless it is a name. A one-word unit is copy
// when a rule can read it: a status word on its own wherever it is a value rather than a name (an object's value, a
// return value, an argument, an operand of || or ??, an array's element: `LABEL[s]` and `label(ok)` put such values
// on the screen), and any word that is capitalized or punctuated (every bracketed code is). Every rule reads every
// unit of copy, a one-word unit included, so `{'[OK]'}` is an unknown code and `{'[CL-1.1]'}` a bracketed ID. A name
// is a key, a literal type, an operand of an equality test, a case label, an element-access key or a non-copy
// attribute's value; so is a string with no space that joins a status word to a name by - or _ ('is-verified'), and
// the CSS name safe-area-inset (in a sentence, 'verified-safe' is copy). The arguments of a console call are the
// developer's log, not copy; every other call's are (an aria-label set with setAttribute, a toast's message). An enum
// value in a screen says 'hit' or 'held', never one of the status words.
//
// The self-check (--self-check, --only TEXT for some plants) needs the gate green on the tree, then plants faults in
// scratch copies, several at a time (GATE_SELF_CHECK_JOBS), each with the findings it must draw, where: a plant that
// exercises several forms of a rule (each status word, each learner state, each file kind and folder, each copy
// attribute, each key, value and call that carries copy, each look-alike of a tag) expects a finding for each, so a
// weakening that drops any one form, or widens an exemption to take one in, leaves a plant missed; a control (a
// console call, a folder's README, an attribute that is not copy, a tag shown as code) expects none.
// scripts/spikes/W1-T01/mutate.mjs measures that.
//
// Known debt: findings that the documents held when the gate was introduced are listed in KNOWN_DEBT below, each
// with its file and the text of its line; they are reported, and fail only under --strict. A new finding, or a
// listed one whose line changed, fails.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// packages/ids and packages/stamps are TypeScript, which Node 22 runs with type stripping.
if (!process.features.typescript && !process.env.CODES_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, CODES_GATE_STRIP: '1' },
  })
  process.exit(again.status ?? 1)
}

const SCRIPT = fileURLToPath(import.meta.url)
const REPO = path.resolve(path.dirname(SCRIPT), '..')

const SCAN = ['README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content', 'design', 'apps/site/public/llms.txt']
const EXEMPT = ['docs/history/', 'design/canvas/', 'content/pg-catalog/']
/** The apps' sources, whose strings and JSX text reach the screen: the site, and the instrument origin's page (SCR-instrument). */
const SOURCE_ROOTS = ['apps/site/src', 'apps/instruments/src']
/**
 * Learner copy, where the status vocabulary applies (spine section 0; GATE-lessons' scope): content (whose governance
 * rules are data, hashed before any learner event (RUN-keepkill-rules), not copy), the labs' README and template, and
 * the text files of the apps' sources. The apps' scripts and pages are learner copy too, and are read as such where
 * they are read (runGate).
 */
const LEARNER = [/^content\/(?!governance\/)/, /^labs\/README\.md$/, /^labs\/template\//, /^apps\/[^/]+\/src\//]
/**
 * Text files in the apps' sources that are not copy: a folder's README (notes for whoever works on it) and a file
 * generated from content (content/specimens/ makes the specimen cabinet's data), which is read at its source.
 */
const APP_TEXT_NOT_COPY = /(?:^|\/)README\.md$|\.generated\.json$/
/** Names the spine gives that hold a status word and are names, not claims: LAB-2, "the verified ledger" (spine section 3.2, after the roadmap's "a verified pure credit ledger"). */
const NAMES = [/\bthe verified ledger\b/gi]
const TEXT_EXT = new Set(['.md', '.mdx', '.yaml', '.yml', '.txt', '.json'])
const SKIP_DIRS = new Set(['node_modules', '.git', '.lake', 'target', '_solutions', '__pycache__', '.venv', 'dist', 'fixtures', 'generated'])

/**
 * Known debt: findings the documents held when the gate was introduced (2026-10-25), reported and failing only
 * under --strict. Each entry pins its line by the SHA-256 of the line's whole text, so any edit to the line makes
 * its findings new ones; the excerpt is for a reader.
 */
export const KNOWN_DEBT = [
  { file: 'curriculum/D-drawers.md', check: 'code', sha256: '514e8fc9a9b5cf1e7eccbbd3f4911309b73d26e96e490835b3e69749ac0af1fe', excerpt: '[R2 I9; landscape digest §2]' },
  { file: 'curriculum/D-drawers.md', check: 'code', sha256: '388efbbed09a1fa626e2448c476e7592889fe92a4d320680f95f3481a536e12b', excerpt: '[R2 I9; landscape digest §2]' },
  { file: 'curriculum/D-drawers.md', check: 'code', sha256: '26b0f472a26f62bed7490e594317f4eff902da19ba307622bccc6fe8aa2ce09c', excerpt: '[R2 I9; landscape digest §2]' },
  { file: 'curriculum/S05-time.md', check: 'code', sha256: 'b471cd8c2720b5324d93c51ffecf9cdc7bc2212d4a6dc884ae96db09c1e39327', excerpt: '[X evidence: a2r3/tla/live/Hold.trace.json]' },
  { file: 'docs/LANDSCAPE.md', check: 'code', sha256: '33118246eec94dad8123d7c83898fcd136a57b081bccc8c787d66e60be049f2b', excerpt: 'Each is [X].' },
  { file: 'docs/spikes/W0-S06.md', check: 'code', sha256: 'a4dd0a042a1ea9a52e2ba32e388f4c6b267072a876d8fc6f6290e89ced5897d1', excerpt: '[CPU 1.25]' },
  { file: 'docs/spikes/W0-S06.md', check: 'code', sha256: 'd90e903ce80a487182d5f8dd1f144370a9314f71a7110ef58148a2bfa34c6b2e', excerpt: '[CPU 3.35]' },
  { file: 'docs/spikes/W0-S06.md', check: 'code', sha256: '0b3b217fb09f3822e67d8c34ef42ba9f8e8be1964804e9b09ec56c15091261e4', excerpt: '[CPU 53.5]' },
  { file: 'docs/spikes/W0-S06.md', check: 'code', sha256: '68e9c4aaa310eb68df3a43459f53c037c8ae01175c17806ad5929d0fc987f7d8', excerpt: '[CPU 285.5]' },
  { file: 'docs/spine/SPINE.md', check: 'code', sha256: '8ac2b80e4b4a6140e3b8d6ec554153314eb8567a5a97c771c1fe5dd0085c89ac', excerpt: 'become [X ...] tags' },
]

// ------------------------------------------------------------------ the allow-list
const STAMP_CODE_RE = /^\[(?:P|M|T|E|C|A|\?|N|R)\]$/
/** A tag of the Tags paragraph, with the forms the documents use: [X RUN-id, RUN-id#path], [X spikes], [V], [V key], [D], [D: reason], [U], [KS]. */
function isTag(inner, evidenceKeys) {
  const x = /^X\s+(.+)$/.exec(inner)
  if (x) {
    const first = x[1].split(/[\s,;]+/)[0]
    return /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[\w.[\]-]+)?$/.test(first) || evidenceKeys.includes(first)
  }
  return /^(?:V|D|U|KS)(?:[\s:,;].*)?$/.test(inner)
}

// ------------------------------------------------------------------ masking: what is not copy
/** Replace a match with spaces of the same length, so offsets keep their lines. */
const blank = (s) => s.replace(/[^\n]/g, ' ')

/** Code spans, HTML comments, URLs and link syntax are not copy; a link's text is, without its brackets. */
export function maskCopy(text, definedRefs = new Set()) {
  let t = text
  t = t.replace(/<!--[\s\S]*?-->/g, blank)
  t = t.replace(/(`+)[\s\S]*?[^`]\1(?!`)|``/g, blank)
  t = t.replace(/https?:\/\/[^\s)>\]]+/g, blank)
  // inline links and images: [text](url) keeps its text, loses its brackets and target
  t = t.replace(/!?\[([^\]\n]*)\]\(([^)\n]*)\)/g, (m, inner) => ` ${inner}${' '.repeat(m.length - inner.length - 1)}`)
  // reference links [text][ref] and [text][]
  t = t.replace(/\[([^\]\n]*)\]\[([^\]\n]*)\]/g, (m, inner) => ` ${inner}${' '.repeat(m.length - inner.length - 1)}`)
  // shortcut references [text] whose definition [text]: url the document holds
  if (definedRefs.size > 0) t = t.replace(/\[([^\]\n]+)\](?!\()/g, (m, inner) => (definedRefs.has(inner.toLowerCase()) ? ` ${inner} ` : m))
  return t
}

/**
 * YAML keys whose values are statements under evaluation, which the status check leaves alone: the options and
 * distractors of an item (ASSESSMENT.md section 3; a lesson's choice.options), the claim an audit case puts under
 * audit (AUDIT-DESK.md: "unsat, therefore safe."), a quotation of a source, and an agent's or a model's words (I8).
 * An option's `text` counts too; its `why` and every other key are copy.
 */
export const EVALUATED_KEYS = new Set(['options', 'distractors', 'distractor', 'choices', 'claim', 'quote', 'quotes', 'agent', 'agent_text', 'agentText', 'says', 'assertion', 'unreviewed'])
const OPTION_KEYS = new Set(['options', 'distractors', 'distractor', 'choices'])
export function isEvaluatedPath(keys) {
  const own = keys[keys.length - 1]
  if (own === undefined) return false
  return EVALUATED_KEYS.has(own) || (own === 'text' && keys.slice(0, -1).some((k) => OPTION_KEYS.has(k)))
}

const BLOCK_SCALAR = /^[|>][-+0-9]*\s*(?:#.*)?$/

/**
 * A YAML document cut into blocks of copy, {text, line, lineOf, keys}: each key's value or list item with its
 * continuation lines, the key itself left out, and the path of keys from the root to it (an item without a key of
 * its own carries its parent's path). The lines of a block scalar (`|`, `>`) are its value and are never read as
 * keys, so `why: |` over `Safe: yes.` is copy that says "Safe". Comments and blank lines end a block.
 */
export function yamlBlocks(text) {
  const blocks = []
  const stack = [] // {indent, key, open}
  let block = null
  let scalarAt = null
  const flush = () => {
    if (block) blocks.push(block)
    block = null
  }
  const start = (line, content) => {
    flush()
    block = { line, keys: stack.map((s) => s.key), parts: [{ line, content }] }
  }
  text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .forEach((raw, i) => {
      const line = i + 1
      const t = raw.trim()
      const indent = raw.length - raw.trimStart().length
      if (scalarAt !== null) {
        if (t === '') return
        if (indent > scalarAt) {
          block?.parts.push({ line, content: t })
          return
        }
        scalarAt = null
      }
      if (t === '' || t.startsWith('#')) {
        flush()
        return
      }
      const m = /^(\s*)((?:-\s+)*)([\w"'.-]+):(?:\s|$)(.*)$/.exec(raw)
      if (m) {
        const col = m[1].length + m[2].length
        while (stack.length > 0 && stack[stack.length - 1].indent >= col) stack.pop()
        const value = m[4].trim()
        stack.push({ indent: col, key: m[3].replace(/^["']|["']$/g, ''), open: value === '' })
        if (BLOCK_SCALAR.test(value)) scalarAt = col
        start(line, BLOCK_SCALAR.test(value) ? '' : value)
        return
      }
      const item = /^(\s*)-(?:\s+(.*))?$/.exec(raw)
      if (item) {
        while (stack.length > 0 && (stack[stack.length - 1].indent > indent || (stack[stack.length - 1].indent === indent && !stack[stack.length - 1].open))) stack.pop()
        const value = (item[2] ?? '').trim()
        if (BLOCK_SCALAR.test(value)) scalarAt = indent
        start(line, BLOCK_SCALAR.test(value) ? '' : value)
        return
      }
      if (block) block.parts.push({ line, content: t })
      else start(line, t)
    })
  flush()
  return blocks.map((b) => {
    let joined = ''
    const starts = []
    for (const p of b.parts) {
      if (joined !== '' && p.content !== '') joined += ' '
      starts.push({ offset: joined.length, line: p.line })
      joined += p.content
    }
    const lineOf = (offset) => starts.reduce((l, s) => (s.offset <= offset ? s.line : l), b.line)
    return { text: joined, line: b.line, lineOf, keys: b.keys }
  })
}

/**
 * A YAML value's own quotes are syntax, not quotation marks in the copy: blank the delimiters of the quoted scalar
 * the value is, or of each quoted element of a flow collection. A plain scalar keeps its quotation marks, which
 * mark a statement under evaluation in the copy as they do in prose.
 */
export function unquoteYaml(content) {
  const flow = /^\s*[[{]/.test(content)
  const out = [...(flow ? maskFlowCollection(content) : content)]
  for (let i = 0; i < out.length; i += 1) {
    const q = out[i]
    if (q !== '"' && q !== "'") {
      if (!flow && /\S/.test(q)) break // a plain scalar: nothing to unquote
      continue
    }
    if (!(i === 0 || /[\s,]/.test(out[i - 1]))) continue
    let j = i + 1
    while (j < out.length) {
      if (q === '"' && out[j] === '\\') j += 2
      else if (out[j] === q && q === "'" && out[j + 1] === "'") j += 2
      else if (out[j] === q) break
      else j += 1
    }
    if (j >= out.length) break
    out[i] = ' '
    out[j] = ' '
    if (!flow) break // the one scalar the value is
    i = j
  }
  return out.join('')
}

/** A YAML value that is a flow collection ([…] or {…}) is structure: mask its brackets and braces, keep its strings. */
function maskFlowCollection(content) {
  if (!/^\s*[[{]/.test(content)) return content
  let quote = null
  return [...content]
    .map((c) => {
      if (quote) {
        if (c === quote) quote = null
        return c
      }
      if (c === '"' || c === "'") {
        quote = c
        return c
      }
      return '[]{}'.includes(c) ? ' ' : c
    })
    .join('')
}

// ------------------------------------------------------------------ the rules on one unit of copy
const WORDS = ['MODEL-CHECKED', 'NOT COVERED', 'CONFIGURED', 'ENFORCED', 'UNKNOWN', 'REFUTED', 'ASSUMED', 'TESTED', 'PROVED']
const CODE_OF = { PROVED: '[P]', 'MODEL-CHECKED': '[M]', TESTED: '[T]', ENFORCED: '[E]', CONFIGURED: '[C]', ASSUMED: '[A]', UNKNOWN: '[?]', 'NOT COVERED': '[N]', REFUTED: '[R]' }
const WORD_ALT = WORDS.map((w) => w.replace('-', '\\-')).join('|')
const PAIR_RE = new RegExp(`(?<![\\w-])(${WORD_ALT})\\s*(\\[(?:P|M|T|E|C|A|\\?|N|R)\\])`, 'g')
const UNBRACKETED_RE = new RegExp(`(?<![\\w-])(${WORD_ALT})\\s+(?:\\((P|M|T|E|C|A|\\?|N|R)\\)|(P|M|T|E|C|A|N|R))(?=[\\s·:,;.]|$)`, 'g')
const EROSION_RE = /(?<![\w-])EROSION\s*\[(?:P|M|T|E|C|A|\?|N|R)\]/g
/** A learner state followed by a stamp code, in any case: "signed off [T]", "SETTLED [T]". A tag after the word ("settled [D]") is not a stamp. */
const STATE_RE = /(?<![\w-])(signed off|settled|kept|mounted|parked)\s*\[(?:P|M|T|E|C|A|\?|N|R)\]/gi
const BRACKET_RE = /(?<![\w\])\\])\[([^\[\]\n]{1,120})\]/g
const STATUS_RE = /\b(verified|correct|safe|proven|guaranteed)\b/gi
const STAMP_IN_UNIT = new RegExp(`(?:(?<![\\w-])(?:${WORD_ALT})\\s*)?\\[(?:P|M|T|E|C|A|\\?|N|R)\\]\\s*·\\s*\\S`)

/** Spans of quoted text: "…", “…”, ‘…’ and «…» (straight single quotes are apostrophes too, so they are not read). */
function quotedSpans(text) {
  const spans = []
  for (const re of [/"[^"\n]*"/g, /“[^”\n]*”/g, /‘[^’\n]*’/g, /«[^»\n]*»/g]) for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length])
  return spans
}
const inSpan = (spans, i) => spans.some(([a, b]) => i >= a && i < b)

/**
 * The findings in one unit of copy, one word or many: every rule reads every unit. `masked` is the unit with code,
 * comments and link syntax blanked. `idTokens` finds registered-ID-shaped tokens in a string (packages/ids'
 * scanner). `evaluated` marks a statement under evaluation, which the status check leaves alone.
 */
export function unitFindings(masked, { learner, evidenceKeys, idTokens, evaluated = false }) {
  const out = []
  for (const m of masked.matchAll(BRACKET_RE)) {
    const inner = m[1].trim()
    const whole = `[${inner}]`
    if (STAMP_CODE_RE.test(whole) || isTag(inner, evidenceKeys)) continue
    const first = inner.split(/[\s,;:]+/)[0] ?? ''
    if (idTokens(first).some((t) => t.id === first)) {
      out.push({ check: 'id', index: m.index, detail: `an ID in brackets, ${whole}: IDs are never bracketed (codes are)` })
      continue
    }
    if (/^(?:[A-Z?][A-Z0-9?]*)$/.test(first) && /[A-Z?]/.test(first)) out.push({ check: 'code', index: m.index, detail: `${whole} is not on the allow-list: the stamp codes [P] [M] [T] [E] [C] [A] [?] [N] [R] and the tags [X RUN-id] [V] [D] [U] [KS]` })
  }
  for (const m of masked.matchAll(PAIR_RE)) if (CODE_OF[m[1]] !== m[2]) out.push({ check: 'pair', index: m.index, detail: `${m[1]} ${m[2]}: the word for ${m[2]} is not ${m[1]}` })
  for (const m of masked.matchAll(UNBRACKETED_RE)) out.push({ check: 'pair', index: m.index, detail: `${m[0].trim()}: a stamp code is always bracketed, ${CODE_OF[m[1]]}` })
  for (const m of masked.matchAll(EROSION_RE)) out.push({ check: 'pair', index: m.index, detail: `${m[0]}: erosion is an event drawn as a crack, never a stamp` })
  for (const m of masked.matchAll(STATE_RE)) out.push({ check: 'state', index: m.index, detail: `${m[0].trim()}: a learner state is drawn in ink and is never a stamp` })
  out.push(...statusFindings(masked, learner, evaluated))
  return out
}

/** The status check on one unit: a bare "verified", "correct" or "safe" in learner copy. */
function statusFindings(masked, learner, evaluated) {
  const out = []
  if (!learner || evaluated || STAMP_IN_UNIT.test(masked)) return out
  const spans = quotedSpans(masked)
  const named = NAMES.reduce((t, re) => t.replace(re, blank), masked)
  for (const m of named.matchAll(STATUS_RE))
    if (!inSpan(spans, m.index)) out.push({ check: 'status', index: m.index, detail: `a bare "${m[1]}": only a stamp with its qualifier says what a check established (DESIGN.md section 11.2); a statement under evaluation goes in quotation marks in prose, or under a key that holds one in YAML (${[...EVALUATED_KEYS].slice(0, 6).join(', ')}, …)` })
  return out
}

// ------------------------------------------------------------------ files
function walk(root, rel, keep) {
  const out = []
  const visit = (r) => {
    if (EXEMPT.some((e) => `${r}/`.startsWith(e))) return
    let st
    try {
      st = fs.lstatSync(path.join(root, r))
    } catch {
      return
    }
    if (st.isSymbolicLink()) return
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(r))) return
      for (const e of fs.readdirSync(path.join(root, r)).sort()) visit(path.posix.join(r, e))
    } else if (st.isFile() && keep(r)) out.push(r)
  }
  visit(rel)
  return out
}

/**
 * Units of a Markdown, YAML or text file: {text, offset, lineOf, evaluated} with code blocks and comments already
 * out. YAML is cut by yamlBlocks: a value is a statement under evaluation when its key holds one (isEvaluatedPath),
 * and the value's own quotes are blanked, so a quoted feedback string is held to the status rule like other copy.
 */
export function documentUnits(rules, text, file) {
  const units = []
  if (/\.ya?ml$/.test(file)) {
    for (const b of yamlBlocks(text)) {
      const evaluated = isEvaluatedPath(b.keys)
      for (const s of rules.sentencesOf(unquoteYaml(b.text))) units.push({ text: s.text, offset: s.offset, lineOf: b.lineOf, evaluated })
      for (const e of embeddedCopy(unquoteYaml(b.text))) units.push({ text: e.text, offset: e.offset, lineOf: b.lineOf, evaluated })
    }
    return units
  }
  for (const b of rules.blocksOf(text, file)) {
    for (const e of embeddedCopy(b.text)) units.push({ text: e.text, offset: e.offset, lineOf: b.lineOf, evaluated: false })
    if (b.kind === 'heading' || b.kind === 'title') {
      units.push({ text: b.text, offset: 0, lineOf: b.lineOf, evaluated: false })
      continue
    }
    for (const s of rules.sentencesOf(b.text)) units.push({ text: s.text, offset: s.offset, lineOf: b.lineOf, evaluated: false })
  }
  return units
}

/**
 * Copy a document holds inside syntax its sentences read as quoted or as link syntax: the copy attributes of a raw
 * HTML or MDX tag (`<abbr title="…">`, `<Callout title={'…'}>`; COPY_ATTRS) and a link's title (`[text](url "…")`,
 * `[ref]: url '…'`), which the page shows or reads aloud. Each is a unit of its own, with its offset in the text;
 * code spans are not read.
 */
export function embeddedCopy(text) {
  const t = text.replace(/(`+)[\s\S]*?[^`]\1(?!`)|``/g, blank)
  const out = []
  for (const tag of t.matchAll(/<([a-zA-Z][\w.:-]*)((?:\s+[^\s>"'{=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>"'{]+))?)*)\s*\/?>/dg)) {
    const attrsAt = tag.indices[2][0]
    for (const a of tag[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/dg)) {
      const k = [2, 3, 4, 5].find((g) => a[g] !== undefined)
      if (k === undefined || !COPY_ATTRS.test(a[1]) || !/\S/.test(a[k])) continue
      out.push({ text: decodeEntities(a[k]), offset: attrsAt + a.indices[k][0] })
    }
  }
  for (const m of t.matchAll(/\]\(\s*<?[^\s)>]+>?\s+(?:"([^"]*)"|'([^']*)')\s*\)|\]:\s*<?[^\s>]+>?\s+(?:"([^"]*)"|'([^']*)')/dg)) {
    const k = [1, 2, 3, 4].find((g) => m[g] !== undefined)
    if (k !== undefined && /\S/.test(m[k])) out.push({ text: m[k], offset: m.indices[k][0] })
  }
  return out
}

/** Strings of a JSON document, each a unit, located by its JSON path. */
function jsonUnits(text) {
  const units = []
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return units
  }
  const visit = (v, at) => {
    if (typeof v === 'string') units.push({ text: v, where: at })
    else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${at}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, `${at}.${k}`)
  }
  visit(value, '$')
  return units
}

/** JSX attributes whose values are names, addresses or tokens, never words on the screen. */
const NON_COPY_ATTR = /^(?:className|class|id|key|href|src|srcSet|type|role|htmlFor|name|method|action|rel|target|lang|dir|slot|form|for|autoComplete|inputMode|enterKeyHint|data-[\w-]+|aria-(?:controls|describedby|labelledby|owns|activedescendant|errormessage|details|flowto|live|relevant|haspopup|current|expanded|hidden|pressed|selected|checked|disabled|invalid|level|orientation|sort|autocomplete))$/

/** A status word, as a whole string: `'verified'`, `"Correct"`, `'SAFE'`, `'proven'`. */
const STATUS_WORD = /^(?:verified|correct|safe|proven|guaranteed)$/i

/**
 * Strings and JSX text of a TypeScript or TSX file, each a unit with its line. A template is one unit, its
 * substitutions standing as "…" (`${claim} verified` reads "… verified"), and so is a `+` chain that holds a string
 * (`'Your claim is ' + 'verified'`). A unit of several words is copy unless it is a name. A one-word unit is copy when
 * a rule can read it: a status word on its own wherever it is a value and not a name (an object's value, a return
 * value, an argument, an operand of || or ??, an array's element: anything may reach the screen, as `LABEL[s]` or
 * `label(ok)` does), and any word that is capitalized or punctuated (a bracketed code always is). Every rule reads
 * every unit. A name is a key, a literal type, an operand of an equality test, a case label, an element-access key or
 * a non-copy attribute's value; a string with no space such as 'is-verified', which joins a status word to a name by
 * - or _, and the CSS name safe-area-inset, are names too. So in the apps the status words are never string values:
 * an enum value says 'hit' or 'held' instead.
 */
export function sourceUnits(ts, rel, text) {
  const units = []
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const EQUALITY = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword])
  /** The string is a name, not words: a key, a non-copy attribute, a literal type, a comparison operand, a case label, an element-access key. */
  const isName = (node) => {
    const p = node.parent
    if (!p) return false
    if ((ts.isPropertyAssignment(p) || ts.isPropertySignature?.(p) || ts.isPropertyDeclaration?.(p) || ts.isMethodDeclaration?.(p) || ts.isEnumMember?.(p)) && p.name === node) return true
    if (ts.isComputedPropertyName(p)) return true
    if (ts.isJsxAttribute(p) && NON_COPY_ATTR.test(p.name.getText(sf))) return true
    if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) && NON_COPY_ATTR.test(p.parent.name.getText(sf))) return true
    if (ts.isLiteralTypeNode(p)) return true
    if (ts.isBinaryExpression(p) && EQUALITY.has(p.operatorToken.kind)) return true
    if (ts.isCaseClause(p) && p.expression === node) return true
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true
    return false
  }
  const isPlus = (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken
  const isStringLit = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)
  /** A template or a `+` chain read as one string: literal parts verbatim, every other part "…". */
  const textOf = (n) => {
    if (isStringLit(n)) return n.text
    if (ts.isTemplateExpression(n)) return n.head.text + n.templateSpans.map((s) => `…${s.literal.text}`).join('')
    if (ts.isParenthesizedExpression(n)) return textOf(n.expression)
    if (isPlus(n)) return textOf(n.left) + textOf(n.right)
    return '…'
  }
  /** The operands of a `+` chain, through parentheses and nested chains. */
  const leaves = (n) => (ts.isParenthesizedExpression(n) ? leaves(n.expression) : isPlus(n) ? [...leaves(n.left), ...leaves(n.right)] : [n])
  const outermostPlus = (n) => {
    let p = n.parent
    while (p && ts.isParenthesizedExpression(p)) p = p.parent
    return !(p && isPlus(p))
  }
  /** Names inside a string: the CSS env() name safe-area-inset, and a status word joined to a name by - or _ in a string with no space ('is-verified'). */
  const maskNames = (s) => {
    const t = s.replace(/safe-area-inset(?:-[a-z]+)*/gi, blank)
    return /\s/.test(t.trim()) ? t : t.replace(/[\w…]*[-_](?:verified|correct|safe|proven|guaranteed)\b[\w-]*|\b(?:verified|correct|safe|proven|guaranteed)[-_][\w-]*/gi, blank)
  }
  const push = (node, raw) => {
    if (isName(node)) return
    const s = maskNames(raw)
    // A one-word string is copy when it is a status word, capitalized, or punctuated (every bracketed code is): those
    // are the only one-word strings a rule can read, so every rule then reads it. A lower-case bare word ('ok',
    // 'pending') can draw no finding wherever it goes, so it is left out.
    if (!/[A-Za-z]\s+[A-Za-z]/.test(s)) {
      if (!/[A-Za-z?]/.test(s)) return
      if (!(STATUS_WORD.test(s.trim()) || /^\s*[A-Z]/.test(s) || /[^\w\s-]/.test(s))) return
    }
    if (s.trim() !== '') units.push({ text: s, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 })
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    // a console call's arguments are the developer's log, never words on the screen
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'console') return
    if (ts.isJsxText(node)) {
      if (node.text.trim() !== '') units.push({ text: maskNames(node.text), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 })
      return
    }
    // a `+` chain that holds a string is one unit; its other operands are read for strings of their own
    if (isPlus(node) && outermostPlus(node) && leaves(node).some((l) => isStringLit(l) || ts.isTemplateExpression(l))) {
      push(node, textOf(node))
      for (const l of leaves(node)) {
        if (ts.isTemplateExpression(l)) for (const span of l.templateSpans) visit(span.expression)
        else if (!isStringLit(l)) visit(l)
      }
      return
    }
    // a template is one unit; its substitutions are read for strings of their own
    if (ts.isTemplateExpression(node)) {
      push(node, textOf(node))
      for (const span of node.templateSpans) visit(span.expression)
      return
    }
    if (isStringLit(node)) {
      push(node, node.text)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return units
}

/** Attributes of a page whose values are words on the screen or read aloud. */
const COPY_ATTRS = /^(?:title|alt|aria-label|aria-description|aria-roledescription|placeholder|label)$/i
const decodeEntities = (t) => t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')

/**
 * The copy of an HTML or SVG page, each unit with its line: the text between tags, the copy attributes (title, alt,
 * aria-label, placeholder, …) and a description meta's content. Comments, scripts, styles and code are not copy.
 */
export function markupUnits(text) {
  const units = []
  const masked = text.replace(/<!--[\s\S]*?-->/g, blank).replace(/<(script|style|code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
  const lineAt = (i) => text.slice(0, i).split('\n').length
  for (const m of masked.matchAll(/>([^<]+)</g)) if (/\S/.test(m[1])) units.push({ text: decodeEntities(m[1]), line: lineAt(m.index + 1 + (m[1].length - m[1].trimStart().length)) })
  for (const tag of masked.matchAll(/<([a-zA-Z][\w:-]*)\b([^>]*)>/g)) {
    const attrs = [...tag[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((a) => ({ name: a[1], value: a[2] ?? a[3] ?? '' }))
    const isDescription = tag[1].toLowerCase() === 'meta' && attrs.some((a) => /^(?:name|property)$/i.test(a.name) && /description$/i.test(a.value))
    for (const a of attrs) if ((COPY_ATTRS.test(a.name) || (isDescription && a.name.toLowerCase() === 'content')) && /\S/.test(a.value)) units.push({ text: decodeEntities(a.value), line: lineAt(tag.index) })
  }
  return units
}

export async function runGate(root) {
  let rules
  let ids
  let stamps
  try {
    rules = await import(pathToFileURL(path.join(REPO, 'scripts', 'runs', 'numbers-rules.mjs')).href)
    ids = await import(pathToFileURL(path.join(REPO, 'packages', 'ids', 'src', 'grammar.ts')).href)
    stamps = await import(pathToFileURL(path.join(root, 'packages', 'stamps', 'src', 'vocabulary.ts')).href)
  } catch (e) {
    return { error: `could not load its modules (scripts/runs/, packages/ids/, packages/stamps/): ${e instanceof Error ? e.message : e}` }
  }
  const findings = []
  const fail = (check, where, detail) => findings.push({ check, where, detail })

  // the allow-list: two sets with no code in both, agreeing with packages/stamps and the spine
  const stampCodes = new Set(stamps.STAMP_CODES)
  const tagCodes = new Set(stamps.TAG_CODES)
  for (const c of stampCodes) if (tagCodes.has(c)) fail('allow-list', 'packages/stamps/src/vocabulary.ts', `${c} is both a stamp code and a tag`)
  const spine = (() => {
    try {
      return fs.readFileSync(path.join(root, 'docs/spine/SPINE.md'), 'utf8')
    } catch {
      return null
    }
  })()
  if (spine === null) return { error: 'docs/spine/SPINE.md is missing' }
  const conv = /Stamp codes are always bracketed \(([^)]*)\)/.exec(spine)
  const spineCodes = conv ? [...conv[1].matchAll(/`(\[[^\]]+\])`/g)].map((m) => m[1]) : []
  if (JSON.stringify(spineCodes) !== JSON.stringify([...stampCodes])) fail('allow-list', 'docs/spine/SPINE.md', `the spine's stamp codes (${spineCodes.join(' ')}) differ from packages/stamps' (${[...stampCodes].join(' ')})`)
  const gateRow = spine.split('\n').find((l) => l.startsWith('| GATE-codes |')) ?? ''
  const spineTags = [...gateRow.matchAll(/`(\[[^\]]+\])`/g)].map((m) => m[1].replace(/^\[X RUN-id\]$/, '[X]'))
  if (JSON.stringify(spineTags) !== JSON.stringify([...tagCodes])) fail('allow-list', 'docs/spine/SPINE.md', `GATE-codes' tags in the spine (${spineTags.join(' ')}) differ from packages/stamps' (${[...tagCodes].join(' ')})`)

  const idTokens = (s) => ids.scanLine(s)
  const evidenceKeys = rules.EVIDENCE_KEYS
  // the documents, and the text files of the apps' sources (copy a screen imports: a JSON of labels, a Markdown page)
  const appText = SOURCE_ROOTS.flatMap((s) => walk(root, s, (p) => TEXT_EXT.has(path.extname(p)) && !APP_TEXT_NOT_COPY.test(p) && !/(^|\/)(test|tests|e2e|__tests__)\//.test(p)))
  const files = [...SCAN.flatMap((s) => walk(root, s, (p) => TEXT_EXT.has(path.extname(p)))), ...appText]
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    const learner = LEARNER.some((re) => re.test(rel))
    if (rel.endsWith('.json')) {
      for (const u of jsonUnits(text)) {
        // the keys of the string's path, array indices left out: $.options[0].text is options, text
        const evaluated = isEvaluatedPath([...u.where.matchAll(/\.([^.[\]]+)/g)].map((m) => m[1]))
        for (const f of unitFindings(maskCopy(u.text), { learner, evidenceKeys, idTokens, evaluated })) fail(f.check, `${rel} ${u.where}`, f.detail)
      }
      continue
    }
    const defined = new Set([...text.matchAll(/^\s{0,3}\[([^\]\n]+)\]:\s/gm)].map((m) => m[1].toLowerCase()))
    for (const u of documentUnits(rules, text, rel)) {
      for (const f of unitFindings(maskCopy(u.text, defined), { learner, evidenceKeys, idTokens, evaluated: u.evaluated })) {
        const line = u.lineOf(u.offset + f.index)
        fail(f.check, `${rel}:${line}`, f.detail)
      }
    }
  }
  let ts = null
  try {
    ts = createRequire(path.join(REPO, 'package.json'))('typescript')
  } catch {
    fail('code', 'node_modules', 'the typescript package is needed to read apps/site/src')
  }
  if (ts) {
    const sources = SOURCE_ROOTS.flatMap((s) => walk(root, s, (p) => /\.[cm]?[jt]sx?$/.test(p) && !/\.d\.ts$/.test(p) && !/(^|\/)(test|tests|e2e|__tests__)\//.test(p) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(p)))
    for (const rel of sources) {
      const text = fs.readFileSync(path.join(root, rel), 'utf8')
      for (const u of sourceUnits(ts, rel, text)) for (const f of unitFindings(maskCopy(u.text), { learner: true, evidenceKeys, idTokens })) fail(f.check, `${rel}:${u.line}`, f.detail)
    }
  }
  // the apps' pages: each app's own HTML pages, and the HTML and SVG files under its src/ and public/; and any HTML or
  // SVG file in learner content
  const appsDir = path.join(root, 'apps')
  const apps = fs.existsSync(appsDir) ? fs.readdirSync(appsDir).filter((a) => fs.statSync(path.join(appsDir, a)).isDirectory()).sort() : []
  const pages = [
    ...apps.flatMap((a) => [
      ...fs.readdirSync(path.join(appsDir, a)).filter((n) => n.endsWith('.html')).sort().map((n) => `apps/${a}/${n}`),
      ...['src', 'public'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\.(?:html|svg)$/.test(p))),
    ]),
    ...walk(root, 'content', (p) => /\.(?:html|svg)$/.test(p) && LEARNER.some((re) => re.test(p))),
  ]
  for (const rel of pages) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    for (const u of markupUnits(text)) for (const f of unitFindings(maskCopy(u.text), { learner: true, evidenceKeys, idTokens })) fail(f.check, `${rel}:${u.line}`, f.detail)
  }

  // known debt: a finding whose file, check and line text match an entry
  const lineText = (where) => {
    const m = /^(.*):(\d+)$/.exec(where)
    if (!m) return null
    try {
      return fs.readFileSync(path.join(root, m[1]), 'utf8').split('\n')[Number(m[2]) - 1] ?? null
    } catch {
      return null
    }
  }
  const known = []
  const fresh = []
  for (const f of findings) {
    const file = f.where.replace(/:\d+$/, '').split(' ')[0]
    const line = lineText(f.where)
    const hash = line === null ? null : crypto.createHash('sha256').update(line).digest('hex')
    const debt = hash !== null && KNOWN_DEBT.some((d) => d.file === file && d.check === f.check && d.sha256 === hash)
    ;(debt ? known : fresh).push(f)
  }
  const stale = KNOWN_DEBT.filter((d) => !known.some((f) => f.where.startsWith(`${d.file}:`) && f.check === d.check && crypto.createHash('sha256').update(lineText(f.where) ?? '').digest('hex') === d.sha256))
  return { findings: fresh, known, stale }
}

// ------------------------------------------------------------------ self-check
const SELF_COPY = ['README.md', 'docs/spine/SPINE.md', 'docs/LANDSCAPE.md', 'curriculum/D-drawers.md', 'packages/stamps/src', 'content', 'labs', 'apps/site/src', 'apps/site/public', 'apps/instruments/src', 'apps/instruments/public']

/**
 * One planted fault per rule: [name, expect, plant(dir)]. `expect` is a check's name (any finding of that check counts)
 * or a list of findings that must all appear, each [check, where, detail]: where is the finding's location exactly or a
 * pattern it matches, and detail a pattern its text matches (null for either: any). A plant that exercises several
 * forms of a rule (one per line or file) lists a finding for each, so a weakening that drops any one form leaves its
 * finding missing and the self-check fails. A control, no(check, where), is a form the rule must leave alone: a
 * finding there fails the plant too.
 */
const x = (check, where = null, detail = null) => [check, where, detail]
const no = (check, where) => [`!${check}`, where, null]
const LESSON = 'content/stages/S1/planted.md'
const SCREEN = 'apps/site/src/screens/planted/Planted.tsx'
const at = (rel) => new RegExp(`^${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:\\d+$`)
/** Paragraphs that each draw a finding of `check` where they stand: one fault per paragraph, a blank line between. */
function paragraphs(rel, check, lines) {
  return { expect: lines.map((_, i) => x(check, `${rel}:${2 * i + 1}`)), plant: (d) => write(d, rel, `${lines.join('\n\n')}\n`) }
}
/** Lines that each draw a finding of `check` where they stand. */
function faultsPerLine(rel, check, lines) {
  return { expect: lines.map((_, i) => x(check, `${rel}:${i + 1}`)), plant: (d) => write(d, rel, `${lines.join('\n')}\n`) }
}
function together(...parts) {
  return { expect: parts.flatMap((p) => p.expect), plant: (d) => parts.forEach((p) => p.plant(d)) }
}
const entry = (name, combo) => [name, combo.expect, combo.plant]
function sub(text, from, to) {
  if (!text.includes(from)) throw new Error(`the plant's text is not in the file: ${from.slice(0, 80)}`)
  return text.split(from).join(to)
}
const subs = (d, rel, ...pairs) => edit(d, rel, (t) => pairs.reduce((acc, [a, b]) => sub(acc, a, b), t))
const appendLine = (rel, line) => ({ expect: [x('code', at(rel))], plant: (d) => fs.appendFileSync(path.join(d, rel), `\n${line}\n`) })

const STAMP_WORDS = [['PROVED', 'P'], ['MODEL-CHECKED', 'M'], ['TESTED', 'T'], ['ENFORCED', 'E'], ['CONFIGURED', 'C'], ['ASSUMED', 'A'], ['UNKNOWN', '?'], ['NOT COVERED', 'N'], ['REFUTED', 'R']]

export const PLANTS = [
  // ---------------------------------------------------------------- allow-list
  ['a stamp code that is also a tag, in the vocabulary and the spine alike', [x('allow-list', 'packages/stamps/src/vocabulary.ts', /\[P\] is both a stamp code and a tag/)], (d) => (subs(d, 'packages/stamps/src/vocabulary.ts', ["export const TAG_CODES = ['[X]', '[V]', '[D]', '[U]', '[KS]'] as const", "export const TAG_CODES = ['[X]', '[V]', '[D]', '[U]', '[KS]', '[P]'] as const"]), subs(d, 'docs/spine/SPINE.md', ['(`[X RUN-id]`, `[V]`, `[D]`, `[U]`, `[KS]`)', '(`[X RUN-id]`, `[V]`, `[D]`, `[U]`, `[KS]`, `[P]`)']))],
  ["the spine's stamp codes drift from the vocabulary's", [x('allow-list', 'docs/spine/SPINE.md', /the spine's stamp codes/)], (d) => subs(d, 'docs/spine/SPINE.md', ['Stamp codes are always bracketed (`[P]`, `[M]`, `[T]`, `[E]`, `[C]`, `[A]`, `[?]`, `[N]`, `[R]`)', 'Stamp codes are always bracketed (`[P]`, `[M]`, `[T]`, `[E]`, `[C]`, `[A]`, `[?]`, `[R]`)'])],
  ['the vocabulary drops a stamp code', [x('allow-list', 'docs/spine/SPINE.md', /differ from packages\/stamps' \(\[P\] \[M\] \[T\] \[E\] \[C\] \[A\] \[\?\] \[R\]\)/)], (d) => subs(d, 'packages/stamps/src/vocabulary.ts', ["export const STAMP_CODES = ['[P]', '[M]', '[T]', '[E]', '[C]', '[A]', '[?]', '[N]', '[R]'] as const", "export const STAMP_CODES = ['[P]', '[M]', '[T]', '[E]', '[C]', '[A]', '[?]', '[R]'] as const"])],
  ["the vocabulary's tags drift from the spine's", [x('allow-list', 'docs/spine/SPINE.md', /GATE-codes' tags in the spine/)], (d) => subs(d, 'packages/stamps/src/vocabulary.ts', ["export const TAG_CODES = ['[X]', '[V]', '[D]', '[U]', '[KS]'] as const", "export const TAG_CODES = ['[X]', '[V]', '[D]', '[U]', '[KS]', '[Z]'] as const"])],

  // ---------------------------------------------------------------- code and id
  entry(
    'an unknown capital code, in each shape the check reads, those that start like a tag among them',
    paragraphs(LESSON, 'code', ['The check came back [OK] on the first run.', 'The [PROVED] label.', 'The run [R2 I9] is listed.', 'The [CPU 1.25] column.', 'Each is [X].', 'Measured [X notes] once.', 'A [Q] mark.', 'A [?X] mark.', 'This lesson is [DRAFT] for now.', 'A [V2] mark.', 'An [UNSAFE] mark.', 'A [KSX] mark.', 'A [DONE] mark.', 'Measured [X RUN-z3-starter/notes] once.', 'Measured [X spikes2] once.']),
  ),
  entry('a bracketed ID, in each shape the check reads', paragraphs(LESSON, 'id', ['The guarded transfer is claim [CL-1.1] in your repo.', 'It rests on [SEAM-1: balances are unbounded integers].', 'The run [RUN-z3-starter] says so.'])),
  ['a known-debt line that was edited', [x('code', at('docs/LANDSCAPE.md'))], (d) => subs(d, 'docs/LANDSCAPE.md', ['Each is [X].', 'Each is [X]. Each pin is exact.'])],
  entry(
    'an unknown code or a bracketed ID in every file and folder the check reads',
    together(
      appendLine('README.md', 'It came back [OK].'),
      faultsPerLine('docs/planted.md', 'code', ['It came back [OK].']),
      faultsPerLine('docs/spikes/planted.md', 'code', ['It came back [OK].']),
      faultsPerLine('docs/waves/planted.md', 'code', ['It came back [OK].']),
      faultsPerLine('curriculum/planted.md', 'code', ['It came back [OK].']),
      faultsPerLine('tracker/planted.md', 'code', ['It came back [OK].']),
      faultsPerLine('design/planted.md', 'code', ['It came back [OK].']),
      appendLine('apps/site/public/llms.txt', 'It came back [OK].'),
      faultsPerLine('content/stages/S1/planted.mdx', 'code', ['It came back [OK].']),
      faultsPerLine('content/stages/S1/planted.yml', 'code', ['note: It came back [OK].']),
      faultsPerLine('content/stages/S1/planted.txt', 'code', ['It came back [OK].']),
      faultsPerLine('labs/planted.md', 'code', ['It came back [OK].']),
      { expect: [x('code', 'content/stages/S1/planted.json $.note')], plant: (d) => write(d, 'content/stages/S1/planted.json', '{ "note": "It came back [OK]." }\n') },
    ),
  ),

  // ---------------------------------------------------------------- pair
  entry(
    'a stamp word with another word\'s code, with its code unbracketed or in parentheses, and erosion written as a stamp',
    paragraphs(LESSON, 'pair', [
      ...STAMP_WORDS.map(([word], i) => `The stamp reads ${word} [${STAMP_WORDS[(i + 1) % STAMP_WORDS.length][1]}] · x.`),
      ...STAMP_WORDS.filter(([, c]) => c !== '?').map(([word, c]) => `The stamp reads ${word} ${c} · x.`),
      ...STAMP_WORDS.map(([word, c]) => `The stamp reads ${word} (${c}) · x.`),
      ...STAMP_WORDS.map(([, c]) => `The claim now shows EROSION [${c}] in its strip.`),
    ]),
  ),

  // ---------------------------------------------------------------- state
  entry(
    'a learner state written as a stamp, each state in any case, with each code',
    paragraphs(LESSON, 'state', [
      ...['signed off', 'settled', 'kept', 'mounted', 'parked'].map((state, i) => `It is ${state} [${STAMP_WORDS[i][1]}] now.`),
      ...['SIGNED OFF', 'Settled', 'KEPT', 'Mounted'].map((state, i) => `It is ${state} [${STAMP_WORDS[i + 5][1]}] now.`),
    ]),
  ),

  // ---------------------------------------------------------------- status: the words, the exemptions, the scopes
  entry(
    'each bare status word in learner copy, and copy that only looks exempt',
    together(
      paragraphs(LESSON, 'status', [
        'Your transfer is verified.',
        'The answer is correct.',
        'Now the transfer is safe for every input.',
        'The guard is proven for every transfer.',
        'The balance is guaranteed.',
        "The learner's transfer is verified, isn't it.",
        'The [P] stamp means the transfer is verified.',
        // parentheses and square brackets are not quotation marks; a stamp word without its code and qualifier is no
        // stamp; and "the verified ledger" is the one name that holds a status word
        'The guard holds (verified).',
        'The note [the guard is safe] is wrong.',
        'The transfer is verified and PROVED.',
        'Check the verified transfer again.',
        // each way Markdown dresses a sentence
        '| CL-1.1 | verified |',
        '- The transfer is **safe**.',
        '> Note: the guard is correct.',
        '1. Your claim is verified.',
        'The result is *proven* now.',
        '<p>The transfer is safe</p>',
        '![The transfer is safe](img.png)',
        'A lesson: [your claim is verified](claims/CL-1.1).',
        '<details><summary>Why is it safe?</summary>Because.</details>',
      ]),
      faultsPerLine('content/stages/S1/planted-heading.md', 'status', ['# Verified transfers']),
      faultsPerLine('content/stages/S1/planted-heading-closed.md', 'status', ['## Safe transfers ##']),
      { expect: [x('status', 'content/stages/S1/planted-setext.md:1')], plant: (d) => write(d, 'content/stages/S1/planted-setext.md', 'Verified transfers\n==================\n\nA lesson.\n') },
      { expect: [x('status', 'content/stages/S1/planted-front.md:2')], plant: (d) => write(d, 'content/stages/S1/planted-front.md', '---\ntitle: Verified transfers\n---\n\nA lesson.\n') },
      { expect: [x('status', 'content/stages/S1/planted-footnote.md:3')], plant: (d) => write(d, 'content/stages/S1/planted-footnote.md', 'A lesson.[^1]\n\n[^1]: The guard is correct.\n') },
    ),
  ),
  entry(
    "copy a document holds inside quoted syntax: each copy attribute of a raw HTML or MDX tag, in each way it is written, and a link's title in each form, beside an attribute that is not copy",
    together(
      paragraphs('content/stages/S1/planted-attributes.md', 'status', [
        'A <abbr title="The transfer is verified">note</abbr>.',
        'A picture: <img src=x.png alt="Verified transfer">',
        '<span aria-label="The guard is safe">x</span>',
        '<span aria-description="The balance is guaranteed">x</span>',
        '<span aria-roledescription="Verified claim">x</span>',
        '<input disabled placeholder="The answer is correct">',
        '<option label="The transfer is safe">',
        "A <abbr title='The guard is proven'>note</abbr>.",
        "A <abbr class='term' title=\"The guard is safe\">note</abbr>.",
        'See [the claim](claims/CL-1.1 "The transfer is verified").',
        "See [the claim](claims/CL-1.1 'The guard is safe').",
        '[guard]: claims/CL-1.1 "The guard is correct"',
        "[balance]: claims/CL-1.2 'The balance is guaranteed'",
      ]),
      faultsPerLine('content/stages/S1/planted-attributes.mdx', 'status', ['<Callout title="Your transfer is verified">x</Callout>', "<Callout title={'The guard is safe'}>x</Callout>", '<Callout title={"The balance is guaranteed"}>x</Callout>']),
      faultsPerLine('content/stages/S1/planted-attributes.yaml', 'status', ['body: <abbr title="The guard is proven">note</abbr>']),
      // left alone: an attribute that is not copy, and a tag shown as code
      { expect: [no('status', 'content/stages/S1/planted-class.md:1'), no('status', 'content/stages/S1/planted-class.md:3')], plant: (d) => write(d, 'content/stages/S1/planted-class.md', '<span class="verified" data-state="safe">A note.</span>\n\nWrite `<abbr title="The transfer is verified">` to see it.\n') },
    ),
  ),
  entry(
    'a bare status word in every folder of learner content, and in its text and MDX files',
    together(
      faultsPerLine('content/drawers/planted.md', 'status', ['Once the guard is in, the transfer is safe.']),
      faultsPerLine('content/audit/planted.yaml', 'status', ['feedback: The claim is verified by the run.']),
      faultsPerLine('content/claims/planted.yaml', 'status', ['summary: The guarded transfer is proven for every input.']),
      faultsPerLine('content/specimens/planted.yaml', 'status', ['fix: After the fix the transfer is guaranteed to keep the balance.']),
      faultsPerLine('content/generators/GEN-planted/templates.yaml', 'status', ['right: Correct, the negation flips the quantifier.']),
      faultsPerLine('content/kc/planted.yaml', 'status', ['summary: A negation is correct when it flips the quantifier.']),
      faultsPerLine('content/assurance/planted.md', 'status', ['The gate is verified.']),
      faultsPerLine('content/registry/planted.md', 'status', ['The fact is verified.']),
      faultsPerLine('content/stages/S1/planted-status.txt', 'status', ['Your transfer is verified.']),
      faultsPerLine('content/stages/S1/planted-status.mdx', 'status', ['Your transfer is verified.']),
    ),
  ),
  entry(
    "copy under a YAML key that is not one of the keys for a statement under evaluation, and strings in a flow sequence",
    together(
      faultsPerLine('content/stages/S1/planted-keys.yaml', 'status', [
        'title: Verified transfers',
        'body: The encoding is correct.',
        'label: Safe',
        'prompt: Which transfer is safe?',
        'note: The guard is proven.',
        'explanation: The balance is guaranteed.',
        'description: Your transfer is verified.',
        'caption: The answer is correct.',
        'heading: Safe transfers',
        'intro: The guard is verified.',
        'answer: The transfer is safe.',
        'message: Your claim is verified.',
        'tip: The guard is proven.',
        'hint: The transfer is safe.',
        'options_intro: Pick the reading that is correct.',
        'claim_note: The transfer is safe.',
        'agentHint: The guard is verified.',
        'hints: [The transfer is safe, Read the guard]',
      ]),
      // an option's text is a statement under evaluation; a hint's text is copy
      { expect: [x('status', 'content/stages/S1/planted-hint-text.yaml:2'), x('status', 'content/stages/S1/planted-hint-text.yaml:4')], plant: (d) => write(d, 'content/stages/S1/planted-hint-text.yaml', 'hints:\n  - text: The guard is proven.\nchoices_note:\n  text: The transfer is safe.\n') },
    ),
  ),
  entry(
    'a bare status word in each kind of learner file the check reads',
    together(
      { expect: [x('status', at('labs/README.md'))], plant: (d) => fs.appendFileSync(path.join(d, 'labs/README.md'), '\nYour guard is verified.\n') },
      faultsPerLine('labs/template/planted.md', 'status', ['Your guard is verified.']),
      { expect: [x('status', 'content/stages/S1/planted.json $.summary')], plant: (d) => write(d, 'content/stages/S1/planted.json', '{ "summary": "The transfer is safe." }\n') },
      // a key that ends at its colon still closes the inline options before it, so its list is copy
      { expect: [x('status', 'content/stages/S1/planted-hints.yaml:3')], plant: (d) => write(d, 'content/stages/S1/planted-hints.yaml', 'options: ["unsat, therefore safe"]\nhints:\n  - The guard is proven.\n') },
      { expect: [1, 3, 5, 7, 11].map((n) => x('status', `content/stages/S1/planted.yaml:${n}`)), plant: (d) => write(d, 'content/stages/S1/planted.yaml', 'feedback: "Correct, well done. Your transfer is verified."\nwhy: |\n  The transfer is verified.\nnote: >\n  The answer is correct.\nprompt:\n  text: "The transfer is safe."\noptions:\n  - text: "unsat, therefore safe"\nhints:\n  - The guard is proven.\n') },
    ),
  ),
  entry(
    'a status word on the screen, in each form a screen puts one there',
    together(
      faultsPerLine('apps/site/src/screens/planted/text.tsx', 'status', ['export const A = () => <p>Correct! Well done.</p>']),
      faultsPerLine('apps/site/src/screens/planted/label.tsx', 'status', ["const label = 'Verified'; export const A = () => <p>{label}</p>"]),
      faultsPerLine('apps/site/src/screens/planted/child.tsx', 'status', ["export const A = ({ ok }: { ok: boolean }) => <p>{ok ? 'correct' : 'wrong'}</p>"]),
      faultsPerLine('apps/site/src/screens/planted/template.tsx', 'status', ['export const A = ({ claim }: { claim: string }) => <p>{`${claim} verified`}</p>']),
      faultsPerLine('apps/site/src/screens/planted/plus.tsx', 'status', ["export const A = () => <p>{'Your claim is ' + 'verified'}</p>"]),
      faultsPerLine('apps/site/src/screens/planted/returned.ts', 'status', ["export function label(ok: boolean): string { return ok ? 'verified' : 'refuted' }"]),
      faultsPerLine('apps/site/src/screens/planted/attributes.tsx', 'status', ['export const A = () => <input aria-label="Verified" />', 'export const B = () => <img alt="The transfer is safe" />', 'export const C = () => <p title="Proven">x</p>', 'export const D = () => <input placeholder="The answer is correct" />']),
      faultsPerLine('apps/site/src/screens/planted/calls.ts', 'status', ["export const a = () => alert('Your transfer is verified.')", "export const b = (t: (s: string) => string) => t('The balance is guaranteed.')"]),
      { expect: [2, 3, 4, 5, 6].map((n) => x('status', `apps/site/src/screens/planted/values.tsx:${n}`)), plant: (d) => write(d, 'apps/site/src/screens/planted/values.tsx', "const LABEL = {\n  a: 'verified',\n  b: 'correct',\n  c: 'safe',\n  d: 'proven',\n  e: 'guaranteed',\n} as const\nexport const A = ({ k }: { k: keyof typeof LABEL }) => <span>{LABEL[k]}</span>\n") },
      faultsPerLine('apps/instruments/src/instrument/Planted.tsx', 'status', ['export const A = () => <p>Your transfer is verified.</p>']),
      faultsPerLine('apps/site/src/screens/planted/plain.jsx', 'status', ['export const A = () => <p>Your transfer is verified.</p>']),
      faultsPerLine('apps/site/src/screens/planted/plain.js', 'status', ["export const label = 'The balance is guaranteed.'"]),
      // copy a screen imports from a text file of its own; a folder's README and a file generated from content are not copy
      { expect: [x('status', 'apps/site/src/screens/planted/copy.json $.done')], plant: (d) => write(d, 'apps/site/src/screens/planted/copy.json', '{ "done": "Your transfer is verified." }\n') },
      faultsPerLine('apps/site/src/screens/planted/help.md', 'status', ['Your transfer is verified.']),
      faultsPerLine('apps/instruments/src/instrument/labels.yaml', 'status', ['done: The receipt is verified.']),
      { expect: [no('status', 'apps/site/src/screens/planted/README.md:1')], plant: (d) => write(d, 'apps/site/src/screens/planted/README.md', 'Notes: the cache is verified on load.\n') },
      faultsPerLine('apps/site/src/screens/planted/returns.tsx', 'status', [
        "export function word(): string { return 'Verified' }",
        "export const m = (p: { msg?: string }) => p.msg || 'All transfers are safe'",
        "export const n = (p: { msg?: string }) => p.msg ?? 'Proven'",
        "export const LABELS = ['Verified', 'Refuted'] as const",
        "export function say(m = 'All transfers are verified'): string { return m }",
        "export const T = () => <p>{'Your transfer is verified-safe now'}</p>",
      ]),
      faultsPerLine('apps/site/src/screens/planted/attributes-more.tsx', 'status', ['export const A = () => <option label="The transfer is safe" />', 'export const B = () => <input type="button" value="Verified" />', 'export const C = () => <div aria-description="The guard is proven" />', 'export const D = () => <div aria-roledescription="Verified claim" />', 'export const E = () => <div role="slider" aria-valuetext="Safe" />']),
      {
        expect: [1, 3, 4, 6, 7].map((n) => x('status', `apps/site/src/screens/planted/methods.ts:${n}`)).concat([no('status', 'apps/site/src/screens/planted/methods.ts:5')]),
        plant: (d) => write(d, 'apps/site/src/screens/planted/methods.ts', "export const a = (el: HTMLElement) => el.setAttribute('aria-label', 'Your transfer is verified')\ndeclare const toast: { show(s: string): void }\nexport const b = () => toast.show('The transfer is safe now.')\nexport const c = (region: HTMLElement) => region.append('Your claim is proven')\nexport const d = () => console.log('verified', 'the cache is safe')\nexport const e = () => window.alert('The balance is guaranteed.')\nexport const f = () => new Notification('Your transfer is verified')\n"),
      },
    ),
  ),
  entry(
    'an unknown code or a bracketed ID as a one-word string a screen renders',
    together(
      faultsPerLine('apps/site/src/screens/planted/ok.tsx', 'code', ["export const A = () => <p>{'[OK]'}</p>"]),
      faultsPerLine('apps/site/src/screens/planted/id.tsx', 'id', ["export const A = () => <p>{'[CL-1.1]'}</p>"]),
      { expect: [x('code', 'apps/site/src/screens/planted/badge.tsx:1')], plant: (d) => write(d, 'apps/site/src/screens/planted/badge.tsx', "const BADGE = { pass: '[PASS]', fail: '[FAIL]' } as const; export const A = ({ s }: { s: 'pass' | 'fail' }) => <span>{BADGE[s]}</span>\n") },
    ),
  ),
  entry(
    "a status word in each part of an app's page the check reads",
    together(
      faultsPerLine('apps/site/src/planted.html', 'status', [
        '<p>Your transfer is verified.</p>',
        '<img alt="The transfer is safe" src="x.png">',
        '<span title="The balance is guaranteed">x</span>',
        '<input placeholder="The answer is correct">',
        '<div aria-label="The guard is proven"></div>',
        '<div aria-description="Your transfer is verified"></div>',
        '<div aria-roledescription="The answer is correct"></div>',
        '<option label="The transfer is safe"></option>',
        '<meta name="description" content="Your transfer is verified">',
        '<meta property="og:description" content="The answer is correct">',
        "<img alt='The transfer is safe' src='x.png'>",
      ]),
      faultsPerLine('apps/site/public/planted.svg', 'status', ['<svg xmlns="http://www.w3.org/2000/svg"><title>Your transfer is verified</title></svg>']),
      faultsPerLine('content/stages/S1/planted.html', 'status', ['<p>Your transfer is verified.</p>']),
      faultsPerLine('content/stages/S1/planted.svg', 'status', ['<svg xmlns="http://www.w3.org/2000/svg"><title>The balance is guaranteed</title></svg>']),
      { expect: [x('status', at('apps/site/index.html'))], plant: (d) => subs(d, 'apps/site/index.html', ['<div id="root"></div>', '<div id="root"><p>Your transfer is verified.</p></div>']) },
      { expect: [x('code', at('apps/instruments/instrument.html'))], plant: (d) => subs(d, 'apps/instruments/instrument.html', ['<div id="root"></div>', '<div id="root" aria-label="Receipt [OK]"></div>']) },
    ),
  ),
]
function write(dir, rel, text) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), text)
}
function edit(dir, rel, f) {
  const p = path.join(dir, rel)
  const before = fs.readFileSync(p, 'utf8')
  const after = f(before)
  if (after === before) throw new Error(`the plant did not change ${rel}`)
  fs.writeFileSync(p, after)
}
export function copyTree(root, dest) {
  // each app's own pages
  const appsDir = path.join(root, 'apps')
  for (const a of fs.existsSync(appsDir) ? fs.readdirSync(appsDir) : []) {
    if (!fs.statSync(path.join(appsDir, a)).isDirectory()) continue
    for (const n of fs.readdirSync(path.join(appsDir, a)).filter((y) => y.endsWith('.html'))) {
      fs.mkdirSync(path.join(dest, 'apps', a), { recursive: true })
      fs.copyFileSync(path.join(appsDir, a, n), path.join(dest, 'apps', a, n))
    }
  }
  for (const rel of SELF_COPY) {
    const from = path.join(root, rel)
    if (!fs.existsSync(from)) continue
    if (fs.statSync(from).isDirectory()) {
      for (const f of walk(root, rel, () => true)) {
        fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true })
        fs.copyFileSync(path.join(root, f), path.join(dest, f))
      }
    } else {
      fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true })
      fs.copyFileSync(from, path.join(dest, rel))
    }
  }
}

/** The expectations of a plant that a report's findings do not meet (an empty list: the plant was caught); a control (`!check`) is unmet when a finding of its check stands where it says. */
export function unmetExpectations(findings, expect) {
  const list = typeof expect === 'string' ? [x(expect)] : expect
  return list.filter(([check, where, detail]) => {
    const control = check.startsWith('!')
    const c = control ? check.slice(1) : check
    const hit = findings.some((f) => f.check === c && (where === null || (where instanceof RegExp ? where.test(f.where) : f.where === where)) && (detail === null || detail.test(String(f.detail))))
    return control ? hit : !hit
  })
}
const describe = ([check, where, detail]) => (check.startsWith('!') ? `a ${check.slice(1)} finding it must not draw at ${where}` : `no finding: ${check}${where === null ? '' : ` at ${where}`}${detail === null ? '' : ` matching ${detail}`}`)

function spawnCollect(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b) => (stdout += b))
    child.stderr.on('data', (b) => (stderr += b))
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}
/** How many plants run at once: GATE_SELF_CHECK_JOBS, or a third of the cores (at least 2, at most 6). */
const selfCheckJobs = () => Number(process.env.GATE_SELF_CHECK_JOBS) || Math.max(2, Math.min(6, Math.floor((os.availableParallelism?.() ?? os.cpus().length) / 3)))

async function selfCheck(only) {
  // the planted-fault copies hold only the files the plants touch, so the copy itself must start green
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-codes-base-'))
  try {
    copyTree(REPO, base)
    const clean = await spawnCollect([SCRIPT, '--root', base, '--json'])
    if (clean.status !== 0) return { error: `the unplanted copy is not green: ${clean.stdout.slice(0, 2000)}` }
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
  const plants = PLANTS.filter(([name]) => only === undefined || name.includes(only))
  const results = new Array(plants.length)
  let next = 0
  const worker = async () => {
    while (next < plants.length) {
      const k = next++
      const [name, expect, plant] = plants[k]
      const checks = [...new Set(typeof expect === 'string' ? [expect] : expect.map((e) => e[0].replace(/^!/, '')))].join('+')
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-codes-self-'))
      try {
        copyTree(REPO, dir)
        plant(dir)
        const r = await spawnCollect([SCRIPT, '--root', dir, '--json'])
        let report = null
        try {
          report = JSON.parse(r.stdout)
        } catch {
          report = null
        }
        const missing = report?.findings ? unmetExpectations(report.findings, expect) : typeof expect === 'string' ? [x(expect)] : expect
        results[k] = { name, checks, caught: r.status === 1 && missing.length === 0, missing }
      } catch (e) {
        results[k] = { name, checks, caught: false, missing: [], error: e instanceof Error ? e.message : String(e) }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(selfCheckJobs(), plants.length) }, worker))
  return { results }
}

// ------------------------------------------------------------------ main
async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    const lines = fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1)
    console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
    return 0
  }
  if (argv.includes('--self-check')) {
    const clean = await runGate(REPO)
    if (clean.error || clean.findings.length > 0) {
      console.error('GATE-codes self-check: the gate must be green on the tree before faults are planted')
      return 1
    }
    const k = argv.indexOf('--only')
    const { results, error } = await selfCheck(k >= 0 ? argv[k + 1] : undefined)
    if (error) {
      console.error(`GATE-codes self-check: ${error}`)
      return 1
    }
    for (const r of results) {
      console.log(`${r.caught ? 'caught' : 'MISSED'}  ${r.checks.padEnd(10)} ${r.name}`)
      if (r.error) console.log(`        the plant could not be planted: ${r.error}`)
      for (const m of r.caught ? [] : r.missing) console.log(`        ${describe(m)}`)
    }
    const missed = results.filter((r) => !r.caught)
    console.log(missed.length === 0 ? `GATE-codes self-check: all ${results.length} planted faults caught` : `GATE-codes self-check: ${missed.length} of ${results.length} planted faults missed`)
    return missed.length === 0 ? 0 : 1
  }
  const i = argv.indexOf('--root')
  const root = i >= 0 ? path.resolve(argv[i + 1]) : REPO
  const strict = argv.includes('--strict')
  const result = await runGate(root)
  if (result.error) {
    if (argv.includes('--json')) console.log(JSON.stringify({ error: result.error }))
    else console.error(`GATE-codes could not run: ${result.error}`)
    return 2
  }
  const failing = strict ? [...result.findings, ...result.known] : result.findings
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ findings: failing, known: strict ? [] : result.known, stale: result.stale }, null, 2))
    return failing.length === 0 ? 0 : 1
  }
  if (!strict && result.known.length > 0) console.log(`known debt (fails only under --strict): ${result.known.map((f) => `${f.where} ${f.check}`).join('; ')}`)
  for (const d of result.stale) console.log(`note: a known-debt entry no longer matches a finding and can be deleted: ${d.file} ${d.check} ${d.excerpt}`)
  if (failing.length === 0) {
    console.log('GATE-codes: green (allow-list, code, id, pair, state, status)')
    return 0
  }
  for (const f of failing) console.log(`${f.check.padEnd(10)} ${f.where}: ${f.detail}`)
  console.log(`GATE-codes: ${failing.length} finding(s)`)
  return 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`GATE-codes could not run: ${e instanceof Error ? e.stack : e}`)
      process.exit(2)
    },
  )
}
