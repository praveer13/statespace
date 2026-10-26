// A small Markdown reader for the copy the content build passes through (packages/content/README.md sections 1.5 to
// 1.9): paragraphs, lists, block quotes, tables, fenced code, rules and level-3 to level-6 headings; code spans, emphasis,
// strong, strikethrough, links, hard breaks, footnote references (drawn as sidenotes) and the two reference tokens the
// build keeps, {{run:RUN-id}} and {{fact:id}}. Raw HTML and images never reach it (the build refuses both), and the
// result is a tree the renderer draws as React elements, never as markup. Pure.

export type Inline =
  | { readonly t: 'text'; readonly v: string }
  | { readonly t: 'code'; readonly v: string }
  | { readonly t: 'em' | 'strong' | 'del'; readonly c: readonly Inline[] }
  | { readonly t: 'link'; readonly href: string; readonly c: readonly Inline[] }
  | { readonly t: 'br' }
  | { readonly t: 'run'; readonly id: string; readonly path?: string }
  | { readonly t: 'fact'; readonly id: string }
  | { readonly t: 'note'; readonly label: string }

export type Align = 'left' | 'right' | 'center' | null

export type Block =
  | { readonly t: 'p'; readonly c: readonly Inline[] }
  | { readonly t: 'h'; readonly level: number; readonly c: readonly Inline[] }
  | { readonly t: 'code'; readonly lang: string; readonly v: string }
  | { readonly t: 'list'; readonly ordered: boolean; readonly start: number; readonly tight: boolean; readonly items: readonly (readonly Block[])[] }
  | { readonly t: 'quote'; readonly c: readonly Block[] }
  | { readonly t: 'table'; readonly align: readonly Align[]; readonly head: readonly (readonly Inline[])[]; readonly rows: readonly (readonly (readonly Inline[])[])[] }
  | { readonly t: 'hr' }

export interface Doc {
  readonly blocks: readonly Block[]
  /** Footnote texts by label: the block's sidenotes. */
  readonly notes: ReadonlyMap<string, readonly Inline[]>
  /** Footnote labels in the order the text first refers to them, which numbers them. */
  readonly refs: readonly string[]
}

// ---------------------------------------------------------------- inline

const PUNCT = /[!-/:-@[-`{-~]/
const WORD = /[\p{L}\p{N}]/u

/** Where a code span opened by `n` backticks at `from` closes, or -1. */
function closeTicks(src: string, from: number, n: number): number {
  let i = from
  while (i < src.length) {
    if (src[i] !== '`') {
      i++
      continue
    }
    let k = 0
    while (src[i + k] === '`') k++
    if (k === n) return i
    i += k
  }
  return -1
}

/** The `]` that closes the `[` at `open`, skipping code spans and nested brackets, or -1. */
function closeBracket(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (ch === '`') {
      let n = 0
      while (src[i + n] === '`') n++
      const end = closeTicks(src, i + n, n)
      if (end >= 0) i = end + n - 1
      continue
    }
    if (ch === '[') depth++
    else if (ch === ']' && --depth === 0) return i
  }
  return -1
}

/** Where a delimiter run of `n` `ch` that can close starts, at or after `from`, or -1. */
function closeDelim(src: string, from: number, ch: string, n: number): number {
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '`') {
      let k = 0
      while (src[i + k] === '`') k++
      const end = closeTicks(src, i + k, k)
      if (end >= 0) i = end + k - 1
      continue
    }
    if (c !== ch) continue
    let k = 0
    while (src[i + k] === ch) k++
    const prev = src[i - 1] ?? ' '
    const next = src[i + k] ?? ' '
    const closes = i > from && prev.trim() !== '' && !(ch === '_' && WORD.test(next))
    if (closes && k >= n) return i + (k - n)
    i += k - 1
  }
  return -1
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = (): void => {
    if (buf !== '') out.push({ t: 'text', v: buf })
    buf = ''
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i] as string
    const rest = (): string => src.slice(i)
    if (ch === '\\' && i + 1 < src.length) {
      const nx = src[i + 1] as string
      if (nx === '\n') {
        flush()
        out.push({ t: 'br' })
        i += 2
        continue
      }
      if (PUNCT.test(nx)) {
        buf += nx
        i += 2
        continue
      }
    }
    if (ch === '`') {
      let n = 0
      while (src[i + n] === '`') n++
      const end = closeTicks(src, i + n, n)
      if (end >= 0) {
        flush()
        let v = src.slice(i + n, end).replace(/\n/g, ' ')
        if (v.length > 2 && v.startsWith(' ') && v.endsWith(' ') && v.trim() !== '') v = v.slice(1, -1)
        out.push({ t: 'code', v })
        i = end + n
        continue
      }
      buf += '`'.repeat(n)
      i += n
      continue
    }
    if (ch === '{' && src.startsWith('{{', i)) {
      const m = /^\{\{(run|fact):([^}#\s]+)(?:#([^}\s]+))?\}\}/.exec(rest())
      if (m !== null) {
        flush()
        const id = m[2] as string
        out.push(m[1] === 'run' ? (m[3] === undefined ? { t: 'run', id } : { t: 'run', id, path: m[3] }) : { t: 'fact', id })
        i += m[0].length
        continue
      }
    }
    if (ch === '[') {
      const note = /^\[\^([^\]\s]+)\]/.exec(rest())
      if (note !== null) {
        flush()
        out.push({ t: 'note', label: note[1] as string })
        i += note[0].length
        continue
      }
      const close = closeBracket(src, i)
      if (close > i && src[close + 1] === '(') {
        const m = /^\(\s*<?([^\s()<>]*)>?(?:\s+"[^"]*")?\s*\)/.exec(src.slice(close + 1))
        if (m !== null) {
          flush()
          out.push({ t: 'link', href: m[1] as string, c: parseInline(src.slice(i + 1, close)) })
          i = close + 1 + m[0].length
          continue
        }
      }
    }
    if (ch === '<') {
      const m = /^<(https:\/\/[^\s<>]+)>/.exec(rest())
      if (m !== null) {
        flush()
        out.push({ t: 'link', href: m[1] as string, c: [{ t: 'text', v: m[1] as string }] })
        i += m[0].length
        continue
      }
    }
    if (ch === '*' || ch === '_' || ch === '~') {
      let n = 0
      while (src[i + n] === ch) n++
      const prev = src[i - 1] ?? ' '
      const next = src[i + n] ?? ' '
      const opens = next.trim() !== '' && !(ch === '_' && WORD.test(prev)) && (ch !== '~' || n === 2)
      if (opens) {
        const tries = ch === '~' ? [2] : n >= 2 ? [2, 1] : [1]
        let done = false
        for (const use of tries) {
          const end = closeDelim(src, i + use, ch, use)
          if (end < 0) continue
          flush()
          const c = parseInline(src.slice(i + use, end))
          out.push({ t: ch === '~' ? 'del' : use === 2 ? 'strong' : 'em', c })
          i = end + use
          done = true
          break
        }
        if (done) continue
      }
      buf += ch.repeat(n)
      i += n
      continue
    }
    if (ch === '\n') {
      if (/ {2,}$/.test(buf)) {
        buf = buf.replace(/ +$/, '')
        flush()
        out.push({ t: 'br' })
      } else buf = `${buf.replace(/ +$/, '')}\n`
      i++
      continue
    }
    buf += ch
    i++
  }
  flush()
  return out
}

// ---------------------------------------------------------------- blocks

const FENCE = /^( {0,3})(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/
const LIST = /^( {0,3})([-*+]|[0-9]{1,9}[.)])( +|$)(.*)$/
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/
const QUOTE = /^ {0,3}> ?(.*)$/
const NOTE_DEF = /^\[\^([^\]\s]+)\]:[ \t]?(.*)$/
const blank = (s: string): boolean => s.trim() === ''

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  let ticks = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string
    if (ch === '\\' && s[i + 1] === '|') {
      cur += '|'
      i++
      continue
    }
    if (ch === '`') {
      let n = 0
      while (s[i + n] === '`') n++
      if (ticks === 0) ticks = n
      else if (ticks === n) ticks = 0
      cur += '`'.repeat(n)
      i += n - 1
      continue
    }
    if (ch === '|' && ticks === 0) {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

const isDelimiterRow = (line: string): boolean => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line) && line.includes('-')

const alignOf = (cell: string): Align => {
  const l = cell.startsWith(':')
  const r = cell.endsWith(':')
  return l && r ? 'center' : r ? 'right' : l ? 'left' : null
}

/** Whether a line starts a block other than a paragraph, which ends a paragraph or a lazy list line. */
const startsBlock = (line: string): boolean => FENCE.test(line) || HEADING.test(line) || QUOTE.test(line) || RULE.test(line) || LIST.test(line)

function parseBlocks(lines: readonly string[], notes: Map<string, string>): Block[] {
  const out: Block[] = []
  let para: string[] = []
  const flush = (): void => {
    if (para.length > 0) out.push({ t: 'p', c: parseInline(para.join('\n').trim()) })
    para = []
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i] as string
    if (blank(line)) {
      flush()
      i++
      continue
    }
    const fence = FENCE.exec(line)
    if (fence !== null) {
      flush()
      const mark = fence[2] as string
      const indent = (fence[1] as string).length
      const closer = new RegExp(`^ {0,3}${mark[0] === '`' ? '`' : '~'}{${mark.length},}\\s*$`)
      const body: string[] = []
      i++
      while (i < lines.length && !closer.test(lines[i] as string)) {
        body.push((lines[i] as string).replace(new RegExp(`^ {0,${indent}}`), ''))
        i++
      }
      i++
      out.push({ t: 'code', lang: fence[3] ?? '', v: body.join('\n') })
      continue
    }
    const def = NOTE_DEF.exec(line)
    if (def !== null) {
      flush()
      const body = [def[2] as string]
      i++
      while (i < lines.length && /^(?: {2,}|\t)\S/.test(lines[i] as string)) {
        body.push((lines[i] as string).trim())
        i++
      }
      notes.set(def[1] as string, body.join('\n'))
      continue
    }
    const heading = HEADING.exec(line)
    if (heading !== null) {
      flush()
      out.push({ t: 'h', level: Math.max(3, (heading[1] as string).length), c: parseInline(heading[2] as string) })
      i++
      continue
    }
    if (RULE.test(line)) {
      flush()
      out.push({ t: 'hr' })
      i++
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && isDelimiterRow(lines[i + 1] as string)) {
      flush()
      const head = splitRow(line)
      const align = splitRow(lines[i + 1] as string).map(alignOf)
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && !blank(lines[i] as string) && (lines[i] as string).includes('|')) {
        const cells = splitRow(lines[i] as string)
        rows.push(head.map((_, k) => parseInline(cells[k] ?? '')))
        i++
      }
      out.push({ t: 'table', align: head.map((_, k) => align[k] ?? null), head: head.map((h) => parseInline(h)), rows })
      continue
    }
    if (QUOTE.test(line)) {
      flush()
      const body: string[] = []
      while (i < lines.length) {
        const q = QUOTE.exec(lines[i] as string)
        if (q !== null) body.push(q[1] as string)
        else if (!blank(lines[i] as string) && !startsBlock(lines[i] as string) && body.length > 0) body.push(lines[i] as string)
        else break
        i++
      }
      out.push({ t: 'quote', c: parseBlocks(body, notes) })
      continue
    }
    const item = LIST.exec(line)
    if (item !== null && !(para.length > 0 && blank(item[4] as string))) {
      flush()
      const ordered = /[0-9]/.test(item[2] as string)
      const start = ordered ? Number.parseInt(item[2] as string, 10) : 1
      const kind = (m: RegExpExecArray): string => (/[0-9]/.test(m[2] as string) ? `o${(m[2] as string).slice(-1)}` : `u${m[2] as string}`)
      const listKind = kind(item)
      const items: string[][] = []
      let tight = true
      let gap = false
      while (i < lines.length) {
        const l = lines[i] as string
        const m = LIST.exec(l)
        if (m !== null && kind(m) === listKind && (m[1] as string).length <= 3) {
          if (gap && items.length > 0) tight = false
          gap = false
          const pad = (m[3] as string).length > 4 ? 1 : Math.max(1, (m[3] as string).length)
          const offset = (m[1] as string).length + (m[2] as string).length + pad
          const lines0: string[] = [m[4] as string]
          i++
          while (i < lines.length) {
            const n = lines[i] as string
            if (blank(n)) {
              // a blank line stays in the item only when indented text follows it
              let j = i
              while (j < lines.length && blank(lines[j] as string)) j++
              const after = lines[j]
              if (after !== undefined && /^\s*/.exec(after)![0].length >= offset) {
                for (let k = i; k < j; k++) lines0.push('')
                tight = false
                i = j
                continue
              }
              gap = true
              i = j
              break
            }
            const indent = /^\s*/.exec(n)![0].length
            if (indent >= offset) lines0.push(n.slice(offset))
            else if (!startsBlock(n) && !blank(lines0[lines0.length - 1] ?? '')) lines0.push(n.trim())
            else break
            i++
          }
          items.push(lines0)
          continue
        }
        break
      }
      out.push({ t: 'list', ordered, start, tight, items: items.map((ls) => parseBlocks(ls, notes)) })
      continue
    }
    para.push(line)
    i++
  }
  flush()
  return out
}

function noteRefs(blocks: readonly Block[], into: string[]): void {
  const walk = (xs: readonly Inline[]): void => {
    for (const x of xs) {
      if (x.t === 'note') {
        if (!into.includes(x.label)) into.push(x.label)
      } else if ('c' in x) walk(x.c)
    }
  }
  for (const b of blocks) {
    if (b.t === 'p' || b.t === 'h') walk(b.c)
    else if (b.t === 'list') for (const it of b.items) noteRefs(it, into)
    else if (b.t === 'quote') noteRefs(b.c, into)
    else if (b.t === 'table') {
      for (const h of b.head) walk(h)
      for (const r of b.rows) for (const c of r) walk(c)
    }
  }
}

const parsed = new Map<string, Doc>()

/** A block of Markdown as a tree; the same text is read once per tab. */
export function parseMarkdown(md: string): Doc {
  const held = parsed.get(md)
  if (held !== undefined) return held
  const raw = new Map<string, string>()
  const blocks = parseBlocks(md.replace(/\r\n?/g, '\n').split('\n'), raw)
  const notes = new Map<string, readonly Inline[]>()
  for (const [label, text] of raw) notes.set(label, parseInline(text))
  const refs: string[] = []
  noteRefs(blocks, refs)
  const doc: Doc = { blocks, notes, refs }
  parsed.set(md, doc)
  return doc
}
