// A cell's SQL, split into statements the way psql sends them: one simple-protocol query per statement, so an error
// in one statement does not swallow the rest (outside a transaction block), and every statement gets its own result.
// The splitter knows the lexical forms that can hide a semicolon: '...' strings ('' escapes; E'...' backslash
// escapes), "..." identifiers, $tag$...$tag$ bodies, -- line comments and nested /* */ comments. It does not parse
// SQL; the server does that.

export interface Statement {
  /** The statement's text, without the terminating semicolon. */
  readonly sql: string
  /** 1-based line of the statement's first non-blank character in the cell. */
  readonly line: number
}

const IDENT_START = /[A-Za-z_\u0080-￿]/
const IDENT_PART = /[A-Za-z0-9_\u0080-￿]/

/** True when the text holds something besides whitespace and comments. */
function hasCode(s: string): boolean {
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') i++
    else if (c === '-' && s[i + 1] === '-') {
      const nl = s.indexOf('\n', i)
      i = nl < 0 ? s.length : nl + 1
    } else if (c === '/' && s[i + 1] === '*') {
      let depth = 1
      i += 2
      while (i < s.length && depth > 0) {
        if (s[i] === '/' && s[i + 1] === '*') {
          depth++
          i += 2
        } else if (s[i] === '*' && s[i + 1] === '/') {
          depth--
          i += 2
        } else i++
      }
    } else return true
  }
  return false
}

/** The offset of the first character that is not whitespace or a comment, from `from`. */
function codeStart(s: string, from: number, to: number): number {
  let i = from
  while (i < to) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') i++
    else if (c === '-' && s[i + 1] === '-') {
      const nl = s.indexOf('\n', i)
      i = nl < 0 || nl > to ? to : nl + 1
    } else if (c === '/' && s[i + 1] === '*') {
      let depth = 1
      i += 2
      while (i < to && depth > 0) {
        if (s[i] === '/' && s[i + 1] === '*') {
          depth++
          i += 2
        } else if (s[i] === '*' && s[i + 1] === '/') {
          depth--
          i += 2
        } else i++
      }
    } else return i
  }
  return to
}

export function splitSql(src: string): Statement[] {
  const out: Statement[] = []
  let start = 0
  let i = 0
  const n = src.length
  const push = (end: number): void => {
    const text = src.slice(start, end)
    if (hasCode(text)) {
      const at = codeStart(src, start, end)
      let line = 1
      for (let k = 0; k < at; k++) if (src.charCodeAt(k) === 10) line++
      out.push({ sql: src.slice(at, end).trimEnd(), line })
    }
  }
  while (i < n) {
    const c = src[i]
    if (c === '-' && src[i + 1] === '-') {
      const nl = src.indexOf('\n', i)
      i = nl < 0 ? n : nl + 1
    } else if (c === '/' && src[i + 1] === '*') {
      let depth = 1
      i += 2
      while (i < n && depth > 0) {
        if (src[i] === '/' && src[i + 1] === '*') {
          depth++
          i += 2
        } else if (src[i] === '*' && src[i + 1] === '/') {
          depth--
          i += 2
        } else i++
      }
    } else if (c === "'") {
      // E'...' allows backslash escapes; a plain string doubles its quote.
      const prev = i > 0 ? src[i - 1] : ''
      const escapes = (prev === 'E' || prev === 'e') && (i < 2 || !IDENT_PART.test(src[i - 2]))
      i++
      while (i < n) {
        if (escapes && src[i] === '\\') i += 2
        else if (src[i] === "'") {
          if (src[i + 1] === "'") i += 2
          else {
            i++
            break
          }
        } else i++
      }
    } else if (c === '"') {
      i++
      while (i < n) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') i += 2
          else {
            i++
            break
          }
        } else i++
      }
    } else if (c === '$' && (i === 0 || !IDENT_PART.test(src[i - 1]))) {
      // $$ or $tag$; $1 is a parameter, not a quote.
      let j = i + 1
      if (j < n && IDENT_START.test(src[j])) {
        j++
        while (j < n && IDENT_PART.test(src[j])) j++
      }
      if (src[j] === '$') {
        const tag = src.slice(i, j + 1)
        const close = src.indexOf(tag, j + 1)
        i = close < 0 ? n : close + tag.length
      } else i++
    } else if (c === ';') {
      push(i)
      i++
      start = i
    } else i++
  }
  push(n)
  return out
}
