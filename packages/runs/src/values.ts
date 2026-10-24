// Values inside a run record: resolving a dotted path, printing a value, and finding a value in a sentence.
//
// A value reference prints a value straight from its record (ARCHITECTURE.md section 18, item 14), and a value
// tag says that its sentence states that value. Both need a value a reader can read: a non-empty string, a
// finite number or a boolean. A list or an object names no one value, so it is never printed.
//
// A sentence states a value when one of the value's renderings occurs in it as a whole token:
//   numbers   as written in JSON (594481375) or grouped in thousands (594,481,375); a negative number also
//             with the minus sign U+2212
//   strings   verbatim, with any run of white space matching any run of white space; a string of four or
//             more digits also grouped in thousands
//   booleans  true, false
// A whole token: a rendering that starts with a letter or digit must not follow a letter or digit (a "v"
// before a version is allowed: v4.35.0 states 4.35.0), and one that ends with a letter or digit must not run
// on into one. Digits do not continue across a decimal point or a thousands separator (1.11 does not state 11
// or 1.1, and 11,000 does not state 11), and a version does not continue into a suffix (4.35.0-rc1 does not
// state 4.35.0). So 12 never states 11, unsat never states sat, and 111 never states 11. Pure: no I/O.

export type Printable = string | number | boolean

const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k)

/**
 * The value at a dotted path in a record (values.distinct_states.w2, configs.0.argv), or undefined when the
 * path names nothing. Only own properties are read, so values.constructor names nothing. GATE-runs resolves
 * paths the same way (scripts/runs/registry.mjs), except that it also follows inherited names.
 */
export function resolvePath(record: unknown, dotted: string): unknown {
  let v: unknown = record
  for (const part of dotted.split('.')) {
    if (v === null || typeof v !== 'object') return undefined
    if (Array.isArray(v)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(part)) return undefined
      v = v[Number(part)]
    } else {
      if (!hasOwn(v, part)) return undefined
      v = (v as Record<string, unknown>)[part]
    }
  }
  return v
}

/** Whether a value can be printed: a non-empty string, a finite number or a boolean. */
export function isPrintable(v: unknown): v is Printable {
  if (typeof v === 'string') return v.trim() !== ''
  if (typeof v === 'number') return Number.isFinite(v)
  return typeof v === 'boolean'
}

/** What a value is, for a message: "the number 11", "an object with keys w2, w3", "a list of 4 items". */
export function describe(v: unknown): string {
  if (v === undefined) return 'nothing'
  if (v === null) return 'null'
  if (typeof v === 'string') return v.trim() === '' ? 'an empty string' : `the string ${JSON.stringify(v.length > 80 ? `${v.slice(0, 77)}...` : v)}`
  if (typeof v === 'number') return Number.isFinite(v) ? `the number ${v}` : `the non-finite number ${v}`
  if (typeof v === 'boolean') return `the boolean ${v}`
  if (Array.isArray(v)) return `a list of ${v.length} item${v.length === 1 ? '' : 's'}`
  if (typeof v === 'object') {
    const keys = Object.keys(v)
    const shown = keys.slice(0, 6).join(', ')
    return keys.length === 0 ? 'an empty object' : `an object with keys ${shown}${keys.length > 6 ? `, ... (${keys.length})` : ''}`
  }
  return `a ${typeof v}`
}

const GROUPED = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 20 })
const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** How copy prints a value: numbers grouped in thousands (594,481,375), strings and booleans as they are. */
export function renderValue(v: Printable): string {
  if (typeof v === 'number') return GROUPED.format(v)
  return String(v)
}

/** Every spelling that states a value (see the header). */
export function renderings(v: Printable): string[] {
  const out = new Set<string>()
  if (typeof v === 'number') {
    const plain = String(v)
    out.add(plain)
    out.add(GROUPED.format(v))
    for (const r of [...out]) if (r.startsWith('-')) out.add(`−${r.slice(1)}`)
  } else if (typeof v === 'string') {
    const s = v.trim()
    out.add(s)
    const digits = /^(-?)(\d{4,})$/.exec(s)
    if (digits) out.add(`${digits[1]}${groupDigits(digits[2] as string)}`)
  } else {
    out.add(String(v))
  }
  return [...out].filter((r) => r !== '')
}

const WORD = /[\p{L}\p{N}_]/u
const isWord = (c: string | undefined): boolean => c !== undefined && WORD.test(c)
const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9'
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function wholeToken(text: string, start: number, end: number, r: string): boolean {
  const first = r[0]
  const last = r[r.length - 1]
  const before = text[start - 1]
  const after = text[end]
  if (isWord(first) && isWord(before)) {
    // v4.35.0 states 4.35.0: a lone "v" before a version-like rendering
    if (!(before === 'v' && isDigit(first) && !isWord(text[start - 2]))) return false
  }
  if (isDigit(first) && (before === '.' || before === ',') && isDigit(text[start - 2])) return false
  if (isWord(last) && isWord(after)) return false
  if (isDigit(last) && (after === '.' || after === ',') && isDigit(text[end + 1])) return false
  // 4.35.0-rc1 does not state 4.35.0, and 5-7 does not state 5; a 5-state trace still states 5
  if (isWord(last) && after === '-' && isWord(text[end + 1]) && (r.includes('.') || isDigit(text[end + 1]))) return false
  return true
}

/** Where a sentence states a value: the first whole-token occurrence of one of its renderings, or null. */
export function findValue(text: string, v: Printable): { index: number; length: number; rendering: string } | null {
  let best: { index: number; length: number; rendering: string } | null = null
  for (const r of renderings(v)) {
    const re = new RegExp(escapeRe(r).replace(/\s+/g, '\\s+'), 'gu')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1
        continue
      }
      if (wholeToken(text, m.index, m.index + m[0].length, r)) {
        if (best === null || m.index < best.index) best = { index: m.index, length: m[0].length, rendering: r }
        break
      }
    }
  }
  return best
}
