// How stamps read: `WORD [code] · qualifier` (spine section 10.2; DESIGN.md section 5.2), the parts of a
// qualifier, the spoken name (DESIGN.md section 5.9), and a parser for stamp text that the gates and
// GEN-which-stamp's options use. Pure.

import type { Constants, WitnessLength } from './raw.ts'
import type { Stamp } from './types.ts'
import { STAMP_WORDS, isStampCode, isStampWord, specOf, type StampCode, type StampWord } from './vocabulary.ts'

/** The separator between a stamp's parts (spine section 10.2: "Parts of a qualifier are separated by ` · `"). */
export const SEP = ' · '

/** A count as copy prints it: 10, 1274, 29,745, 12,893,420. */
export function fmtCount(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`not a count: ${n}`)
  if (!Number.isInteger(n) || Math.abs(n) < 10000) return String(n)
  // grouped by hand, not with toLocaleString, so the text never depends on the runtime's locale data
  const digits = String(Math.abs(n))
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end))
  return `${n < 0 ? '-' : ''}${groups.join(',')}`
}

/** An rlimit as the course writes it: 5000000 is "5e6"; 123456 stays "123456". */
export function fmtRlimit(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`not an rlimit: ${n}`)
  if (n >= 10000) {
    const k = Math.floor(Math.log10(n))
    const m = n / 10 ** k
    if (Number.isInteger(m) && m >= 1 && m <= 9) return `${m}e${k}`
  }
  return String(n)
}

/** Constants in the configuration's order: "Init = 100, Amount = 80, Workers = {w1, w2}". */
export function constantsText(c: Constants): string {
  if (c.length === 0) return 'no constants'
  return c.map(([k, v]) => `${k} = ${v}`).join(', ')
}

const UNIT_ONE: Record<WitnessLength['unit'], string> = { actions: 'action', steps: 'step', rows: 'row', lines: 'line', calls: 'call' }

/** A witness's length: "1 step", "3 rows", "4 actions (5 states)". */
export function witnessText(w: WitnessLength): string {
  if (!Number.isInteger(w.length) || w.length < 0) throw new Error(`not a witness length: ${w.length}`)
  const unit = w.length === 1 ? UNIT_ONE[w.unit] : w.unit
  const states = w.states === undefined ? '' : ` (${fmtCount(w.states)} ${w.states === 1 ? 'state' : 'states'})`
  return `${fmtCount(w.length)} ${unit}${states}`
}

/** "WORD [code] · part · part". */
export function stampText(s: Pick<Stamp, 'code' | 'word' | 'qualifier'>): string {
  return [`${s.word} ${s.code}`, ...s.qualifier].join(SEP)
}

/** "[code] · part · part": the form the spine and GEN-which-stamp keys write. */
export function codeText(s: Pick<Stamp, 'code' | 'qualifier'>): string {
  return [s.code, ...s.qualifier].join(SEP)
}

/** The qualifier as one string. */
export const qualifierText = (s: Pick<Stamp, 'qualifier'>): string => s.qualifier.join(SEP)

/**
 * The accessible name: "Proved, code P: Lean 4.35.0 kernel, axioms listed". The visible bracketed code is hidden
 * from assistive technology and spelled here instead (DESIGN.md section 5.9).
 */
export function spokenName(s: Pick<Stamp, 'code' | 'qualifier'>): string {
  const spec = specOf(s.code)
  const parts = s.qualifier.map((p) => p.replace(/\s*\(([^()]*)\)/g, ', $1'))
  return `${spec.spokenWord}, code ${spec.spokenCode}: ${parts.join(', ')}`
}

export interface ParsedStamp {
  /** The word, when the text carries one. */
  readonly word?: StampWord
  readonly code: StampCode
  readonly qualifier: readonly string[]
  /** Problems with the text as a stamp: a word that does not match its code, a missing qualifier. */
  readonly problems: readonly string[]
}

const WORD_ALT = [...STAMP_WORDS].sort((a, b) => b.length - a.length).map((w) => w.replace('-', '\\-')).join('|')
const STAMP_RE = new RegExp(`^(?:(${WORD_ALT})\\s+)?(\\[(?:[PMTECAN?R])\\])(?:\\s*·\\s*([\\s\\S]*))?$`)

/**
 * Parse stamp text such as "UNKNOWN [?] · stopped at deadlock, 10 distinct states" or "[M] · constants ·
 * complete". Returns null when the text is not shaped like a stamp at all.
 */
export function parseStampText(text: string): ParsedStamp | null {
  const m = STAMP_RE.exec(text.trim())
  if (!m) return null
  const code = m[2]
  if (!isStampCode(code)) return null
  const word = m[1] !== undefined && isStampWord(m[1]) ? m[1] : undefined
  const qualifier = (m[3] ?? '')
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
  const problems: string[] = []
  if (word !== undefined && specOf(code).word !== word) problems.push(`${word} is not the word for ${code}; it is ${specOf(code).word}`)
  if (qualifier.length === 0) problems.push(`${code} has no qualifier; spine section 8.7 requires ${specOf(code).requires}`)
  return { word, code, qualifier, problems }
}
