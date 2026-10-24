// The `dp:` misconception registry, generated from docs/EVIDENCE.md section 6 (spine ID
// conventions: "registered from docs/EVIDENCE.md section 6, its proposed entries
// (section 6.11) included"). Pure: takes the document's text.

import { scanBlocks } from './markdown.ts'
import type { Entry, Problem } from './spine.ts'

const BARE = /^([A-Z])([1-9][0-9]*)$/

/**
 * Catalog entries are the rows of the section 6.1-6.10 tables, whose first cell is a bare
 * ID (`G4`, `Z1`). Proposed entries are the `dp:` keys and ranges named in section 6.11
 * (`dp:S5`-`dp:S14` is ten entries); each is marked `proposed`.
 * @param text docs/EVIDENCE.md
 */
export function buildMisconceptionEntries(text: string): { entries: Entry[]; problems: Problem[] } {
  const blocks = scanBlocks(text)
  const entries: Entry[] = []
  const problems: Problem[] = []
  const seen = new Set<string>()
  const add = (key: string, section: string, line: number, proposed: boolean): void => {
    const id = `dp:${key}`
    if (seen.has(id)) {
      problems.push({ line, message: `misconception ${id} is defined twice` })
      return
    }
    seen.add(id)
    entries.push({ id, kind: 'misconception', section, src: 'evidence', family: key.charAt(0), proposed })
  }

  let tables = 0
  for (const b of blocks) {
    if (b.type === 'table' && /^6\.([1-9]|10)$/.test(b.section) && b.header[0] === 'ID') {
      tables++
      for (const r of b.rows) {
        const key = r.cells[0] ?? ''
        if (BARE.test(key)) add(key, b.section, r.line, false)
        else problems.push({ line: r.line, message: `misconception row "${key}" is not a bare ID such as G4` })
      }
    }
    if (b.type === 'text' && b.section === '6.11') {
      // `dp:Z6`-`dp:Z7` is a range of one family; a lone `dp:L9` is one entry.
      const covered: [number, number][] = []
      for (const m of b.text.matchAll(/dp:([A-Z])([1-9][0-9]*)`?[–-]`?dp:([A-Z])([1-9][0-9]*)/g)) {
        covered.push([m.index, m.index + m[0].length])
        const [, fromFamily = '', from = '0', toFamily = '', to = '0'] = m
        if (fromFamily !== toFamily || Number(from) > Number(to)) {
          problems.push({ line: b.line, message: `misconception range ${m[0]} spans families or runs backwards` })
          continue
        }
        for (let n = Number(from); n <= Number(to); n++) add(`${fromFamily}${n}`, '6.11', b.line, true)
      }
      for (const m of b.text.matchAll(/dp:([A-Z])([1-9][0-9]*)/g)) {
        if (covered.some(([s, e]) => m.index >= s && m.index < e)) continue
        add(`${m[1]}${m[2]}`, '6.11', b.line, true)
      }
    }
  }
  if (tables !== 10) problems.push({ line: null, message: `expected 10 misconception tables (6.1 to 6.10), found ${tables}` })
  return { entries, problems }
}
