// Pure markdown helpers for the ID registry: headings with section numbers, GFM pipe
// tables, and fenced-code awareness. No I/O, no dependencies (packages/* stay pure).

export interface HeadingBlock {
  type: 'heading'
  line: number
  level: number
  text: string
  section: string
}
export interface TableRow {
  line: number
  cells: string[]
}
export interface TableBlock {
  type: 'table'
  line: number
  section: string
  heading: string
  header: string[]
  rows: TableRow[]
}
export interface TextBlock {
  type: 'text'
  line: number
  text: string
  section: string
}
export type Block = HeadingBlock | TableBlock | TextBlock

/**
 * Split one pipe-table row into trimmed cells. A pipe splits a cell unless it is escaped
 * (`\|`) or sits inside a backtick code span.
 */
export function splitTableRow(line: string): string[] {
  const s = line.trim()
  const cells: string[] = []
  let cur = ''
  let inCode = false
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i)
    if (c === '\\' && s.charAt(i + 1) === '|') {
      cur += '|'
      i++
      continue
    }
    if (c === '`') inCode = !inCode
    if (c === '|' && !inCode) {
      cells.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  cells.push(cur)
  if (cells[0]?.trim() === '') cells.shift()
  if (cells.length > 0 && cells[cells.length - 1]?.trim() === '') cells.pop()
  return cells.map((x) => x.trim())
}

const SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/
const ROW = /^\s*\|/

/**
 * Walk a markdown document and return its headings, tables and remaining text lines in
 * order. Headings carry the section number of the nearest numbered heading ("3.1",
 * "13"); an unnumbered heading inherits its parent's number, so "### W0 ..." under
 * "## 13. Waves" is section "13". Lines inside fenced code blocks are plain text.
 */
export function scanBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let fence: string | null = null
  const bySection: string[] = ['', '', '', '', '', '', ''] // section number per heading level (1..6)
  let section = ''
  let heading = ''
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] as string
    const f = /^\s*(```+|~~~+)/.exec(l)
    if (f) {
      const mark = (f[1] as string).charAt(0)
      if (fence === null) fence = mark
      else if (mark === fence) fence = null
      blocks.push({ type: 'text', line: i + 1, text: l, section })
      continue
    }
    if (fence !== null) {
      blocks.push({ type: 'text', line: i + 1, text: l, section })
      continue
    }
    const h = /^(#{1,6})\s+(.*?)\s*$/.exec(l)
    if (h) {
      const level = (h[1] as string).length
      const title = h[2] as string
      const num = /^(\d+(?:\.\d+)*)\.?(?:\s|$)/.exec(title)
      bySection[level] = num ? (num[1] as string) : ''
      for (let k = level + 1; k <= 6; k++) bySection[k] = ''
      section = ''
      for (let k = level; k >= 1; k--) {
        if (bySection[k]) {
          section = bySection[k] as string
          break
        }
      }
      heading = title
      blocks.push({ type: 'heading', line: i + 1, level, text: title, section })
      continue
    }
    if (ROW.test(l) && i + 1 < lines.length && SEPARATOR.test(lines[i + 1] as string)) {
      const header = splitTableRow(l)
      const rows: TableRow[] = []
      let j = i + 2
      while (j < lines.length && ROW.test(lines[j] as string)) {
        rows.push({ line: j + 1, cells: splitTableRow(lines[j] as string) })
        j++
      }
      blocks.push({ type: 'table', line: i + 1, section, heading, header, rows })
      i = j - 1
      continue
    }
    blocks.push({ type: 'text', line: i + 1, text: l, section })
  }
  return blocks
}

/** Rows whose cell count differs from the header's: a malformed table. */
export function malformedRows(table: TableBlock): TableRow[] {
  return table.rows.filter((r) => r.cells.length !== table.header.length)
}

/**
 * Remove markdown link destinations, autolinks and bare URLs, keeping the link text and
 * every column in place, so that a scan sees prose but not URL paths.
 */
export function blankUrls(line: string): string {
  const blank = (m: string): string => ' '.repeat(m.length)
  return line
    .replace(/\]\([^)\s]*(?:\s+"[^"]*")?\)/g, (m) => `]${blank(m.slice(1))}`)
    .replace(/<https?:\/\/[^>\s]*>/g, blank)
    .replace(/https?:\/\/[^\s)>\]]+/g, blank)
}
