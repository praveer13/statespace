// What GATE-kc reads from docs/spine/SPINE.md, taken from the scanned blocks of the document (the caller scans it
// with packages/ids's markdown reader, whose block shapes these interfaces match): the section 4 KC table, the
// confusable sets and the fading families; the first-contact notes in the lesson rows; and section 3.0's builder
// path and its table of jumps and substitutes. Pure. A table whose shape no longer matches is a problem, never a
// silently shorter reading.

import { EXACT } from '@statespace/ids/grammar'
import type { Problem } from './types.ts'

export const SPINE_PATH = 'docs/spine/SPINE.md'

export interface MdRow {
  readonly line: number
  readonly cells: readonly string[]
}
export interface MdTable {
  readonly type: 'table'
  readonly line: number
  readonly section: string
  readonly heading: string
  readonly header: readonly string[]
  readonly rows: readonly MdRow[]
}
export interface MdText {
  readonly type: 'text'
  readonly line: number
  readonly text: string
  readonly section: string
}
export interface MdHeading {
  readonly type: 'heading'
  readonly line: number
  readonly level: number
  readonly text: string
  readonly section: string
}
export type MdBlock = MdTable | MdText | MdHeading

export interface SpineKc {
  readonly id: string
  readonly name: string
  readonly stage: string
  readonly threshold: boolean
  readonly requires: readonly string[]
  readonly requiresSoft: readonly string[]
  readonly confusable: readonly string[]
  readonly line: number
}

export interface SpineSet {
  readonly id: string
  readonly name: string
  readonly discriminate: string
  readonly kcs: readonly string[]
  readonly auditFamilies: boolean
  readonly opens: string
  readonly opensNote: string | null
  readonly line: number
}

export interface SpineFamily {
  readonly id: string
  readonly name: string
  readonly kc: string
  readonly line: number
}

export interface SpineJump {
  readonly jump: string
  readonly crossed: string
  readonly substitute: string
  readonly line: number
}

export interface SpineFacts {
  readonly kcs: readonly SpineKc[]
  readonly sets: readonly SpineSet[]
  readonly families: readonly SpineFamily[]
  /** lesson → the KCs its row marks as first contact. */
  readonly firstContact: ReadonlyMap<string, readonly string[]>
  /** The builder's path as the spine prints it: stage and lesson tokens, ranges as written. */
  readonly builderPath: { readonly tokens: readonly string[]; readonly line: number } | null
  readonly jumps: readonly SpineJump[]
}

const KC_IN = /KC-[0-9]+\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g
const kcsIn = (s: string): string[] => [...new Set([...s.matchAll(KC_IN)].map((m) => m[0]))]
const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i])
const isTable = (b: MdBlock): b is MdTable => b.type === 'table'
const isText = (b: MdBlock): b is MdText => b.type === 'text'

/** Split a cell into its comma-separated parts, each with the KC ID it names and whether it says "(soft)". */
function edges(cell: string, where: number, problems: Problem[]): { hard: string[]; soft: string[] } {
  const hard: string[] = []
  const soft: string[] = []
  const t = cell.trim()
  if (t === '—' || t === '') return { hard, soft }
  for (const part of t.split(',')) {
    const ids = kcsIn(part)
    if (ids.length !== 1) {
      problems.push({ message: `section 4, line ${where}: cannot read "${part.trim()}" as one KC ID`, where: `${SPINE_PATH}:${where}` })
      continue
    }
    const id = ids[0] as string
    if (!EXACT.kc.test(id)) problems.push({ message: `section 4, line ${where}: ${id} is not a KC ID`, where: `${SPINE_PATH}:${where}` })
    ;(/\(soft\)/.test(part) ? soft : hard).push(id)
  }
  return { hard, soft }
}

export function readSpineFacts(blocks: readonly MdBlock[]): { facts: SpineFacts; problems: Problem[] } {
  const problems: Problem[] = []
  const fail = (message: string, line: number | null = null): void => {
    problems.push({ message, where: line === null ? SPINE_PATH : `${SPINE_PATH}:${line}` })
  }

  // ---- the KC table (section 4)
  const KC_HEADER = ['ID', 'Name', 'Stage', 'Threshold', 'Requires', 'Confusable with']
  const kcTables = blocks.filter(isTable).filter((t) => t.section === '4' && same(t.header, KC_HEADER))
  if (kcTables.length !== 1) fail(`section 4 should hold one KC table headed "${KC_HEADER.join(' | ')}", found ${kcTables.length}`)
  const kcs: SpineKc[] = []
  for (const r of kcTables[0]?.rows ?? []) {
    if (r.cells.length !== KC_HEADER.length) {
      fail(`a row of the KC table has ${r.cells.length} cells, not ${KC_HEADER.length}`, r.line)
      continue
    }
    const [id, name, stage, threshold, requires, confusable] = r.cells as [string, string, string, string, string, string]
    if (!EXACT.kc.test(id)) fail(`the KC table names "${id}", which is not a KC ID`, r.line)
    if (!['', 'threshold'].includes(threshold)) fail(`the Threshold cell of ${id} reads "${threshold}"; it is empty or "threshold"`, r.line)
    const req = edges(requires, r.line, problems)
    const conf = edges(confusable, r.line, problems)
    if (conf.soft.length > 0) fail(`a confusable edge of ${id} is marked soft; only requires edges are`, r.line)
    kcs.push({ id, name, stage, threshold: threshold === 'threshold', requires: req.hard, requiresSoft: req.soft, confusable: [...conf.hard, ...conf.soft], line: r.line })
  }

  // ---- the confusable sets (section 4)
  const SET_HEADER = ['Set', 'Discriminate between', 'KCs', 'Opens']
  const setTables = blocks.filter(isTable).filter((t) => t.section === '4' && same(t.header, SET_HEADER))
  if (setTables.length !== 1) fail(`section 4 should hold one confusable-set table headed "${SET_HEADER.join(' | ')}", found ${setTables.length}`)
  const sets: SpineSet[] = []
  for (const r of setTables[0]?.rows ?? []) {
    const [setCell, discriminate, kcCell, opensCell] = r.cells as [string, string, string, string]
    const m = /^([A-Z]) · (.+)$/.exec(setCell ?? '')
    const o = /^(S[0-9]+)(?:\s+\((.*)\))?$/.exec((opensCell ?? '').trim())
    if (m === null || o === null || r.cells.length !== SET_HEADER.length) {
      fail(`cannot read the confusable-set row "${r.cells.join(' | ')}"`, r.line)
      continue
    }
    sets.push({
      id: m[1] as string,
      name: (m[2] as string).trim(),
      discriminate: discriminate ?? '',
      kcs: kcsIn(kcCell ?? ''),
      auditFamilies: /audit families/.test(kcCell ?? ''),
      opens: o[1] as string,
      opensNote: o[2] ?? null,
      line: r.line,
    })
  }

  // ---- the fading families (section 4): "F1 Lean list induction ... (KC-2.generalized-ih); F2 ..."
  const families: SpineFamily[] = []
  const famText = blocks.filter(isText).find((b) => b.section === '4' && b.text.includes('**Fading families.**'))
  if (famText === undefined) fail('section 4 has no "**Fading families.**" paragraph')
  else {
    for (const f of famText.text.matchAll(/\b(F[1-9][0-9]*) ([^;:()]+?) \((KC-[^)\s]+)\)/g)) {
      families.push({ id: f[1] as string, name: (f[2] as string).trim(), kc: f[3] as string, line: famText.line })
    }
    if (families.length === 0) fail('the fading-families paragraph names no family as "F<n> <name> (KC-…)"', famText.line)
  }

  // ---- first-contact notes in the lesson rows (sections 3.1–3.10)
  const firstContact = new Map<string, string[]>()
  for (const t of blocks.filter(isTable)) {
    const ki = t.header.indexOf('KCs')
    if (t.header[0] !== 'ID' || t.header[1] !== 'Tier' || ki < 0) continue
    for (const r of t.rows) {
      const lesson = r.cells[0] ?? ''
      const cell = r.cells[ki] ?? ''
      if (EXACT.lesson.test(lesson) && /first contact/i.test(cell)) firstContact.set(lesson, kcsIn(cell))
    }
  }

  // ---- section 3.0: the builder's path and its jumps
  let builderPath: SpineFacts['builderPath'] = null
  const pathLine = blocks.filter(isText).find((b) => b.section === '3.0' && /^S1 → /.test(b.text.trim()))
  if (pathLine === undefined) fail('section 3.0 prints no builder path ("S1 → …")')
  else {
    const tokens = pathLine.text.trim().replace(/\.$/, '').split('→').flatMap((part) => part.split(',').map((s) => s.trim())).filter(Boolean)
    builderPath = { tokens, line: pathLine.line }
  }
  const jumps: SpineJump[] = []
  const jumpTable = blocks.filter(isTable).find((t) => t.section === '3.0' && (t.header[0] ?? '').startsWith("Jump on the builder's path"))
  if (jumpTable === undefined) fail("section 3.0 has no table headed \"Jump on the builder's path\"")
  else for (const r of jumpTable.rows) jumps.push({ jump: r.cells[0] ?? '', crossed: r.cells[1] ?? '', substitute: r.cells[2] ?? '', line: r.line })

  return { facts: { kcs, sets, families, firstContact, builderPath, jumps }, problems }
}
