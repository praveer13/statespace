// The source of a lesson or a drawer: a Markdown file with YAML front matter, read into the record that
// schemas/lesson.schema.json describes. packages/content/README.md is the authors' guide; this is the reader.
//
//   ---
//   id: S1.L1
//   tier: core
//   title: Negate, then search
//   draft: true
//   kcs: [KC-1.violation-as-sat]
//   ---
//
//   ## Negating English {minutes=14 kcs=KC-1.a}  a segment: a level-2 heading with its minutes and its components
//
//   Ordinary Markdown is prose.
//
//   :::item role=prequestion family=GEN-negate-it template=t1 kcs=KC-1.violation-as-sat
//   @choice key=B surprise=yes
//   The question the learner reads.
//   - A. an option
//     - why: why it is wrong
//     - mis: dp:Z1
//   - B. the key
//     - why: why it is right
//   :::
//
//   ::claim template=CL-1.1                  a block with no body is one line
//
// Learner copy is never inside a code fence, because GATE-numbers and GATE-facts skip fenced blocks: only code is
// fenced. The reader is strict and says where it stopped: a line number and what it expected. It also keeps
// reading after an error, and keeps an unknown block type as it is, so a gate can count the types a page uses.

import { LineCounter, parseDocument } from 'yaml'
import { listOf, parseAttrs } from './attrs.ts'
import type { AttrValue, Attrs } from './attrs.ts'
import type { PageProblem } from './types.ts'

export interface ParsedSource {
  /** The record the source describes, as far as it could be read; null when there is no front matter to read. */
  record: Record<string, unknown> | null
  problems: PageProblem[]
  /** The source line of a JSON Pointer into the record, for the nodes the reader can place. */
  lines: ReadonlyMap<string, number>
}

/** The front matter keys an author writes. */
export const FRONT_KEYS = ['schema', 'id', 'tier', 'title', 'draft', 'kcs', 'previews', 'objective', 'drawers', 'deferred'] as const
/** The fields of a record the build derives; an author may not write them. */
export const DERIVED_KEYS = ['minutes', 'rail', 'establishes', 'runs', 'facts', 'checkedBy', 'unresolved', 'rev'] as const

/** The tag every record of schemas/lesson.schema.json declares: a page, a stage and a lab. */
export const SCHEMA_TAG = 'statespace/lesson@1'

interface BodyLine {
  text: string
  line: number
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/

/** Tracks a fenced code block across lines. */
class Fence {
  private marker: string | null = null
  /** Feed a line; returns whether it is inside a fence or on its opening or closing line. */
  feed(text: string): boolean {
    if (this.marker === null) {
      const m = FENCE_OPEN.exec(text)
      if (m === null || ((m[1] as string).startsWith('`') && (m[2] as string).includes('`'))) return false
      this.marker = m[1] as string
      return true
    }
    const c = FENCE_CLOSE.exec(text)
    if (c !== null && (c[1] as string).charAt(0) === this.marker.charAt(0) && (c[1] as string).length >= this.marker.length) this.marker = null
    return true
  }
  get open(): boolean {
    return this.marker !== null
  }
}

/** Remove HTML comments, outside fenced code, keeping every line where it was. */
export function stripComments(lines: readonly string[]): string[] {
  const out: string[] = []
  const fence = new Fence()
  let comment = false
  for (const raw of lines) {
    if (!comment && fence.feed(raw)) {
      out.push(raw)
      continue
    }
    let rest = raw
    let kept = ''
    for (;;) {
      if (comment) {
        const end = rest.indexOf('-->')
        if (end < 0) {
          rest = ''
          break
        }
        rest = rest.slice(end + 3)
        comment = false
      } else {
        const start = rest.indexOf('<!--')
        if (start < 0) {
          kept += rest
          break
        }
        kept += rest.slice(0, start)
        rest = rest.slice(start + 4)
        comment = true
      }
    }
    out.push(kept)
  }
  return out
}

const trimBlank = (lines: BodyLine[]): BodyLine[] => {
  let a = 0
  let b = lines.length
  while (a < b && (lines[a] as BodyLine).text.trim() === '') a++
  while (b > a && (lines[b - 1] as BodyLine).text.trim() === '') b--
  return lines.slice(a, b)
}

const joined = (lines: BodyLine[]): string => trimBlank(lines).map((l) => l.text).join('\n')

class Reader {
  readonly problems: PageProblem[] = []
  readonly lines = new Map<string, number>()
  error(code: string, message: string, line: number | null): void {
    this.problems.push({ severity: 'error', code, message, line })
  }
  add(problems: PageProblem[]): void {
    this.problems.push(...problems)
  }
  place(pointer: string, line: number): void {
    if (!this.lines.has(pointer)) this.lines.set(pointer, line)
  }
}

// ------------------------------------------------------------------ front matter

function readFrontMatter(lines: string[], r: Reader): { front: Record<string, unknown> | null; bodyStart: number } {
  if (lines[0]?.trim() !== '---') {
    r.error('front-matter', 'a page starts with front matter: a line of three hyphens, the keys, and another line of three hyphens', 1)
    return { front: null, bodyStart: 0 }
  }
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] as string).trim() === '---') {
      end = i
      break
    }
  }
  if (end < 0) {
    r.error('front-matter', 'the front matter is never closed: add a line of three hyphens after the last key', 1)
    return { front: null, bodyStart: lines.length }
  }
  const text = lines.slice(1, end).join('\n')
  const counter = new LineCounter()
  const doc = parseDocument(text, { lineCounter: counter, uniqueKeys: true, strict: true })
  for (const e of doc.errors) {
    const at = e.linePos?.[0]?.line
    r.error('front-matter', `the front matter is not valid YAML: ${e.message.split('\n')[0]}`, at === undefined ? 2 : at + 1)
  }
  if (doc.errors.length > 0) return { front: null, bodyStart: end + 1 }
  let value: unknown
  try {
    // toJS refuses a document whose aliases expand past a limit (a resource-exhaustion guard), by throwing
    value = doc.toJS()
  } catch (e) {
    r.error('front-matter', `the front matter is not valid YAML: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`, 2)
    return { front: null, bodyStart: end + 1 }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    r.error('front-matter', 'the front matter must be a list of key: value lines', 2)
    return { front: null, bodyStart: end + 1 }
  }
  const front = value as Record<string, unknown>
  const contents = doc.contents as { items?: Array<{ key?: { value?: unknown; range?: [number, number, number] } }> } | null
  for (const item of contents?.items ?? []) {
    const key = item.key?.value
    const start = item.key?.range?.[0]
    if (typeof key === 'string' && start !== undefined) r.place(`/${key}`, counter.linePos(start).line + 1)
  }
  return { front, bodyStart: end + 1 }
}

// ------------------------------------------------------------------ blocks

const BLOCK_ATTRS: Record<string, readonly string[]> = {
  instrument: ['ins', 'cell', 'recorded', 'call'],
  item: ['role', 'family', 'template', 'kcs', 'mode', 'band'],
  claim: ['template'],
  specimen: ['id', 'mount'],
  card: ['variant', 'title', 'lab'],
}

class AttrReader {
  private readonly attrs: Attrs
  private readonly r: Reader
  private readonly line: number
  readonly block: string
  constructor(attrs: Attrs, r: Reader, line: number, block: string) {
    this.attrs = attrs
    this.r = r
    this.line = line
    this.block = block
  }
  str(name: string): string | undefined {
    const v = this.attrs.values.get(name)
    if (v === undefined) return undefined
    if (v === true) {
      this.r.error('attributes', `${name} needs a value: ${name}=...`, this.line)
      return undefined
    }
    return v
  }
  required(name: string): string | undefined {
    const v = this.str(name)
    if (v === undefined && !this.attrs.values.has(name)) this.r.error('attributes', `${this.block} needs ${name}=...`, this.line)
    return v
  }
  int(name: string, required: boolean): number | undefined {
    const v = required ? this.required(name) : this.str(name)
    if (v === undefined) return undefined
    if (!/^(?:0|[1-9][0-9]*)$/.test(v)) {
      this.r.error('attributes', `${name} must be a whole number, not ${JSON.stringify(v)}`, this.line)
      return undefined
    }
    return Number(v)
  }
  requiredList(name: string): string[] {
    if (!this.attrs.values.has(name)) {
      this.r.error('attributes', `${this.block} needs ${name}=...`, this.line)
      return []
    }
    return listOf(this.attrs.values.get(name))
  }
  bool(name: string): boolean | undefined {
    const v = this.attrs.values.get(name)
    if (v === undefined) return undefined
    if (v === true || v === 'true') return true
    if (v === 'false') return false
    this.r.error('attributes', `${name} must be true or false, not ${JSON.stringify(v)}`, this.line)
    return undefined
  }
  has(name: string): boolean {
    return this.attrs.values.has(name)
  }
  get(name: string): AttrValue | undefined {
    return this.attrs.values.get(name)
  }
  /** Report any attribute the block type does not take. */
  closed(allowed: readonly string[]): void {
    for (const name of this.attrs.values.keys()) {
      if (!allowed.includes(name)) this.r.error('attributes', `${this.block} takes no attribute ${name}; it takes ${allowed.join(', ')}`, this.line)
    }
  }
}

const OPTION_LINE = /^- ([A-H])\.\s+(\S.*)$/
const FIELD_LINE = /^(?:- )?(why|mis):\s*(.*)$/

/** Read a choice: the question, then options with their why and mis. `at` is the pointer prefix of the choice. */
function readChoice(body: BodyLine[], attrs: Attrs, line: number, at: string, r: Reader): Record<string, unknown> {
  r.add(attrs.problems)
  const a = new AttrReader(attrs, r, line, '@choice')
  a.closed(['key', 'run', 'surprise'])
  const key = a.required('key')
  const keyRun = a.str('run')
  const surprise = a.str('surprise')
  const stem: BodyLine[] = []
  const options: Array<{ id: string; text: string; why?: string; mis?: string; line: number }> = []
  let current: (typeof options)[number] | null = null
  let field: 'text' | 'why' | 'mis' = 'text'
  let ended = false
  for (const l of body) {
    const m = OPTION_LINE.exec(l.text)
    if (m !== null) {
      current = { id: m[1] as string, text: (m[2] as string).trim(), line: l.line }
      field = 'text'
      options.push(current)
      continue
    }
    if (current === null) {
      stem.push(l)
      continue
    }
    if (l.text.trim() === '') continue
    if (!/^\s{2,}/.test(l.text)) {
      if (!ended) r.error('choice', `text after the options at column 1: indent the lines of an option under its "- ${current.id}." line, and put everything else before the first option`, l.line)
      ended = true
      continue
    }
    const inner = l.text.trim()
    const f = FIELD_LINE.exec(inner)
    if (f !== null) {
      field = f[1] as 'why' | 'mis'
      if (current[field] !== undefined) r.error('choice', `option ${current.id} has two ${field} lines`, l.line)
      current[field] = (f[2] as string).trim()
      continue
    }
    current[field] = `${current[field] ?? ''} ${inner}`.trim()
  }
  options.forEach((o, i) => r.place(`${at}/options/${i}`, o.line))
  if (options.length === 0) r.error('choice', 'a choice lists its options as "- A. text" lines, each with "- why:" and, unless it is the key, "- mis:" lines under it', line)
  return {
    prompt: joined(stem),
    options: options.map((o) => ({ id: o.id, text: o.text, why: o.why ?? '', ...(o.mis === undefined ? {} : { mis: o.mis }) })),
    key: key ?? '',
    ...(keyRun === undefined ? {} : { keyRun }),
    ...(surprise === undefined ? {} : { surprise }),
  }
}

interface Section {
  label: string
  attrs: Attrs
  line: number
  body: BodyLine[]
}

const LABEL_LINE = /^@([a-z]+)(?:\s+(.*))?$/

/** Split a container body into its preamble and its @sections, leaving fenced code alone. */
function splitSections(body: BodyLine[]): { preamble: BodyLine[]; sections: Section[] } {
  const preamble: BodyLine[] = []
  const sections: Section[] = []
  const fence = new Fence()
  let current: Section | null = null
  for (const l of body) {
    if (fence.feed(l.text)) {
      ;(current === null ? preamble : current.body).push(l)
      continue
    }
    const m = LABEL_LINE.exec(l.text.trim())
    if (m !== null && !/^\s/.test(l.text)) {
      current = { label: m[1] as string, attrs: parseAttrs(m[2] ?? '', l.line), line: l.line, body: [] }
      sections.push(current)
      continue
    }
    ;(current === null ? preamble : current.body).push(l)
  }
  return { preamble, sections }
}

function readCode(preamble: BodyLine[], r: Reader): { md: string; code?: { lang: string; text: string; editable?: boolean } } {
  const prose: BodyLine[] = []
  let code: { lang: string; text: string; editable?: boolean } | undefined
  let fenceLines: BodyLine[] | null = null
  let lang = ''
  let editable = false
  let marker = ''
  for (const l of preamble) {
    if (fenceLines === null) {
      const m = FENCE_OPEN.exec(l.text)
      if (m !== null) {
        if (code !== undefined) r.error('code', 'a cell shows one piece of code: this is a second code fence', l.line)
        fenceLines = []
        marker = m[1] as string
        const [first, ...flags] = (m[2] as string).trim().split(/\s+/).filter((t) => t !== '')
        lang = (first ?? '').toLowerCase() || 'text'
        editable = flags.includes('editable')
        for (const flag of flags) if (flag !== 'editable') r.error('code', `the code fence takes the flag editable, not ${JSON.stringify(flag)}: \`\`\`python editable`, l.line)
        continue
      }
      prose.push(l)
    } else {
      const c = FENCE_CLOSE.exec(l.text)
      if (c !== null && (c[1] as string).charAt(0) === marker.charAt(0) && (c[1] as string).length >= marker.length) {
        if (code === undefined) code = { lang, text: fenceLines.map((x) => x.text).join('\n'), ...(editable ? { editable: true } : {}) }
        fenceLines = null
      } else fenceLines.push(l)
    }
  }
  if (fenceLines !== null) r.error('code', 'a code fence in the cell is never closed', (preamble[preamble.length - 1] as BodyLine).line)
  return { md: joined(prose), ...(code === undefined ? {} : { code }) }
}

const UNDERLINE = /^ {0,3}(?:=+|-+)[ \t]*$/
const THEMATIC = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/
/** A line that starts something other than a paragraph: a list item, a quote, a heading, a table, HTML, a fence, a footnote, indented code. */
const NOT_A_PARAGRAPH = /^(?: {4}|\t| {0,3}(?:[-*+](?:\s|$)|[0-9]{1,9}[.)](?:\s|$)|>|#{1,6}(?:\s|$)|\||<|\[\^|`{3}|~{3}))/

/**
 * Report a heading drawn with a line of = or - under a line of text (Markdown's setext form), which a page does not
 * have: a segment is "## Title {minutes=N}", and text under another heading would not be a segment at all. A line of
 * hyphens after a blank line is a rule, and a line under a list item, a quote or a table belongs to it: neither is
 * reported. Fenced code is left alone.
 */
function setextHeadings(lines: readonly BodyLine[], r: Reader): void {
  const fence = new Fence()
  let paragraph = 0
  let candidate = false
  for (const l of lines) {
    if (fence.feed(l.text) || l.text.trim() === '') {
      paragraph = 0
      continue
    }
    if (paragraph === 0) {
      if (THEMATIC.test(l.text) || UNDERLINE.test(l.text)) continue
      candidate = !NOT_A_PARAGRAPH.test(l.text)
    } else if (candidate && UNDERLINE.test(l.text)) {
      r.error('heading', 'a line of = or - under a line of text makes a heading, which a page does not have: start a segment with "## Title {minutes=N}", and leave a blank line above a rule', l.line)
      paragraph = 0
      continue
    }
    paragraph += 1
  }
}

function noBody(name: string, body: BodyLine[], line: number, r: Reader): void {
  if (trimBlank(body).length > 0) r.error('body', `a ${name} block has no body: write it on one line, as ::${name} ...`, line)
}

function buildBlock(
  name: string,
  attrs: Attrs,
  body: BodyLine[],
  line: number,
  at: string,
  defaultCall: boolean,
  r: Reader,
): Record<string, unknown> {
  r.add(attrs.problems)
  const a = new AttrReader(attrs, r, line, name)
  switch (name) {
    case 'claim': {
      a.closed(BLOCK_ATTRS.claim as readonly string[])
      noBody(name, body, line, r)
      return { type: 'claim', template: a.required('template') }
    }
    case 'specimen': {
      a.closed(BLOCK_ATTRS.specimen as readonly string[])
      noBody(name, body, line, r)
      return { type: 'specimen', id: a.required('id'), mount: a.bool('mount') ?? true }
    }
    case 'card': {
      a.closed(BLOCK_ATTRS.card as readonly string[])
      const title = a.str('title')
      const lab = a.str('lab')
      return {
        type: 'card',
        variant: a.required('variant'),
        ...(title === undefined ? {} : { title }),
        md: joined(body),
        ...(lab === undefined ? {} : { lab }),
      }
    }
    case 'item': {
      a.closed(BLOCK_ATTRS.item as readonly string[])
      const band = a.int('band', false)
      const mode = a.str('mode')
      const block: Record<string, unknown> = {
        type: 'item',
        role: a.required('role'),
        family: a.required('family'),
        template: a.required('template'),
        kcs: a.requiredList('kcs'),
        ...(mode === undefined ? {} : { mode }),
        ...(band === undefined ? {} : { band }),
      }
      const { preamble, sections } = splitSections(body)
      if (trimBlank(preamble).length > 0) r.error('body', 'an item holds nothing but a @choice section: put prose outside the block', (trimBlank(preamble)[0] as BodyLine).line)
      for (const s of sections) {
        if (s.label !== 'choice') {
          r.error('body', `an item takes a @choice section, not @${s.label}`, s.line)
          continue
        }
        if (block.choice !== undefined) r.error('body', 'an item has one @choice', s.line)
        else {
          r.place(`${at}/choice`, s.line)
          block.choice = readChoice(s.body, s.attrs, s.line, `${at}/choice`, r)
        }
      }
      return block
    }
    case 'instrument': {
      a.closed(BLOCK_ATTRS.instrument as readonly string[])
      const call = a.bool('call')
      const block: Record<string, unknown> = {
        type: 'instrument',
        ins: a.required('ins'),
        cell: a.int('cell', true),
        callOnFirstRun: call ?? defaultCall,
        recorded: a.required('recorded'),
      }
      const { preamble, sections } = splitSections(body)
      const { md, code } = readCode(preamble, r)
      if (md !== '') block.md = md
      const seen = new Set<string>()
      for (const s of sections) {
        if (seen.has(s.label)) {
          r.error('body', `a cell has one @${s.label}`, s.line)
          continue
        }
        seen.add(s.label)
        switch (s.label) {
          case 'direction':
            r.add(s.attrs.problems)
            block.direction = joined(s.body)
            break
          case 'tap': {
            r.add(s.attrs.problems)
            const text = joined(s.body)
            if (text.includes('\n')) r.error('body', '@tap is one line: the property the query tests, in words', s.line)
            block.tap = { property: text.replace(/\s*\n\s*/g, ' ') }
            break
          }
          case 'call':
            r.place(`${at}/call`, s.line)
            block.call = readChoice(s.body, s.attrs, s.line, `${at}/call`, r)
            break
          case 'after':
            r.add(s.attrs.problems)
            block.after = joined(s.body)
            break
          default:
            r.error('body', `a cell takes @direction, @tap, @call and @after sections, not @${s.label}`, s.line)
        }
      }
      // Fields in the order the schema lists them, so a built page reads the same whichever order the author wrote.
      const ordered: Record<string, unknown> = {}
      for (const k of ['type', 'ins', 'cell', 'callOnFirstRun', 'recorded', 'md', 'direction', 'code', 'tap', 'call', 'after']) {
        if (k === 'code') {
          if (code !== undefined) ordered.code = code
        } else if (block[k] !== undefined) ordered[k] = block[k]
      }
      return ordered
    }
    case 'prose': {
      // prose is not written as a block: it is the Markdown between blocks. The text is kept as the prose it is.
      r.error('block-type', 'prose is plain Markdown between blocks, not a block of its own: remove the ::: lines and write the text as it is', line)
      return { type: 'prose', md: joined(body) }
    }
    default:
      // A block type outside the six: kept as written, so a gate can count it, and reported.
      r.error('block-type', `${name} is not a block type: the six are prose, instrument, item, claim, specimen and card (V2-18; a seventh needs a logged decision)`, line)
      return { type: name }
  }
}

// ------------------------------------------------------------------ the body

const CONTAINER_OPEN = /^:::([a-z][a-z-]*)(?:\s+(.*))?\s*$/
const LEAF = /^::([a-z][a-z-]*)(?:\s+(.*))?\s*$/
const SEGMENT_HEADING = /^##\s+(.*?)\s*$/
const MINUTES = /\{([^{}]*)\}\s*$/

interface SegmentBuilder {
  title: string
  minutes: number | undefined
  kcs: string[] | undefined
  line: number
  blocks: Array<Record<string, unknown>>
}

export interface ParseOptions {
  /** Whether the source is a lesson or a drawer. Default: read it from the front matter's id. */
  kind?: 'lesson' | 'drawer'
}

/** Read a source file's text into the record it describes. */
export function parsePageSource(text: string, options: ParseOptions = {}): ParsedSource {
  const r = new Reader()
  const raw = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  const { front, bodyStart } = readFrontMatter(raw, r)
  const kind = options.kind ?? (typeof front?.id === 'string' && front.id.startsWith('D-') ? 'drawer' : 'lesson')
  const defaultCall = kind === 'lesson'

  const bodyRaw = stripComments(raw.slice(bodyStart))
  const body: BodyLine[] = bodyRaw.map((t, i) => ({ text: t, line: bodyStart + i + 1 }))

  const segments: SegmentBuilder[] = []
  let segment: SegmentBuilder | null = null
  let prose: BodyLine[] = []
  let container: { name: string; attrSource: string; line: number; body: BodyLine[] } | null = null
  const fence = new Fence()

  const pushBlock = (block: Record<string, unknown>, line: number): void => {
    if (segment === null) {
      r.error('before-first-segment', 'a block comes before the first segment: start with "## Title {minutes=N}"', line)
      return
    }
    r.place(`/segments/${segments.length - 1}/blocks/${segment.blocks.length}`, line)
    segment.blocks.push(block)
  }
  const flushProse = (): void => {
    const lines = trimBlank(prose)
    prose = []
    if (lines.length === 0) return
    setextHeadings(lines, r)
    if (segment === null) {
      r.error('before-first-segment', 'text comes before the first segment: start with "## Title {minutes=N}", or put the text in the front matter\'s objective', (lines[0] as BodyLine).line)
      return
    }
    pushBlock({ type: 'prose', md: lines.map((l) => l.text).join('\n') }, (lines[0] as BodyLine).line)
  }
  const leafOrContainer = (name: string, attrSource: string, line: number, blockBody: BodyLine[]): void => {
    setextHeadings(blockBody, r)
    const at = `/segments/${Math.max(segments.length - 1, 0)}/blocks/${segment?.blocks.length ?? 0}`
    pushBlock(buildBlock(name, parseAttrs(attrSource, line), blockBody, line, at, defaultCall, r), line)
  }

  for (const l of body) {
    if (container !== null) {
      if (!fence.open && l.text.trim() === ':::') {
        const c = container
        container = null
        leafOrContainer(c.name, c.attrSource, c.line, c.body)
        continue
      }
      if (!fence.open && CONTAINER_OPEN.test(l.text)) {
        r.error('container', `a block opened at line ${container.line} is not closed: blocks do not nest, so end it with a line of three colons before opening another`, l.line)
        const c = container
        container = null
        leafOrContainer(c.name, c.attrSource, c.line, c.body)
        const m = CONTAINER_OPEN.exec(l.text) as RegExpExecArray
        container = { name: m[1] as string, attrSource: m[2] ?? '', line: l.line, body: [] }
        continue
      }
      fence.feed(l.text)
      container.body.push(l)
      continue
    }
    if (fence.feed(l.text)) {
      prose.push(l)
      continue
    }
    const open = CONTAINER_OPEN.exec(l.text)
    if (open !== null) {
      flushProse()
      container = { name: open[1] as string, attrSource: open[2] ?? '', line: l.line, body: [] }
      continue
    }
    const leaf = LEAF.exec(l.text)
    if (leaf !== null) {
      flushProse()
      leafOrContainer(leaf[1] as string, leaf[2] ?? '', l.line, [])
      continue
    }
    const heading = SEGMENT_HEADING.exec(l.text)
    if (heading !== null && !l.text.startsWith('###')) {
      flushProse()
      let title = heading[1] as string
      let minutes: number | undefined
      let kcs: string[] | undefined
      const m = MINUTES.exec(title)
      if (m !== null) {
        title = title.slice(0, m.index).trim()
        const attrs = parseAttrs(m[1] as string, l.line)
        r.add(attrs.problems)
        const a = new AttrReader(attrs, r, l.line, 'a segment heading')
        a.closed(['minutes', 'kcs'])
        minutes = a.int('minutes', true)
        if (a.has('kcs')) kcs = a.requiredList('kcs')
      } else r.error('attributes', 'a segment heading gives its minutes: "## Title {minutes=14}"', l.line)
      segment = { title, minutes, kcs, line: l.line, blocks: [] }
      segments.push(segment)
      r.place(`/segments/${segments.length - 1}`, l.line)
      continue
    }
    if (/^#\s/.test(l.text)) {
      r.error('heading', 'a page has no level-1 heading: its title is the front matter\'s title, and each segment starts with "## Title {minutes=N}"', l.line)
      continue
    }
    prose.push(l)
  }
  if (container !== null) {
    r.error('container', `the block opened at line ${container.line} is never closed: end it with a line of three colons`, container.line)
    leafOrContainer(container.name, container.attrSource, container.line, container.body)
  }
  flushProse()

  if (front === null) return { record: null, problems: r.problems, lines: r.lines }

  for (const key of Object.keys(front)) {
    const line = r.lines.get(`/${key}`) ?? 1
    if ((DERIVED_KEYS as readonly string[]).includes(key)) r.error('front-matter', `${key} is computed by the build: remove it`, line)
    else if (key === 'segments') r.error('front-matter', 'segments are written in the body, each with a "## Title {minutes=N}" heading', line)
    else if (!(FRONT_KEYS as readonly string[]).includes(key)) r.error('front-matter', `${key} is not a front matter key; the keys are ${FRONT_KEYS.join(', ')}`, line)
  }
  if (front.schema !== undefined && front.schema !== SCHEMA_TAG) r.error('front-matter', `schema must be ${SCHEMA_TAG} when it is written`, r.lines.get('/schema') ?? 1)

  const record: Record<string, unknown> = { schema: SCHEMA_TAG }
  for (const key of FRONT_KEYS) if (key !== 'schema' && front[key] !== undefined) record[key] = front[key]
  record.segments = segments.map((s, i) => ({ id: `s${i + 1}`, title: s.title, minutes: s.minutes, ...(s.kcs === undefined ? {} : { kcs: s.kcs }), blocks: s.blocks }))
  r.place('', 1)
  return { record, problems: r.problems, lines: r.lines }
}
