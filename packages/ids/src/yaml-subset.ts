// A parser for the YAML subset that tracker/tasks.yaml uses, with no dependencies (the
// gates run under plain Node, before any package is installed). It reads block
// mappings and sequences, plain / "double" / 'single' scalars, one-line flow
// collections and folded or literal block scalars. Anything else (anchors, tags,
// multi-line flow collections, multi-line plain scalars, duplicate keys) throws, so a
// reformatted file fails loudly instead of being half-read. packages/ids/test checks the
// result against PyYAML on the real file.

export type YamlValue = null | boolean | number | string | YamlValue[] | { [key: string]: YamlValue }

export class YamlError extends Error {
  readonly line: number
  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`)
    this.line = line
  }
}

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/', '0': '\0', ' ': ' ' }

function unquote(s: string, lineNo: number): string {
  if (s.startsWith("'")) return s.slice(1, -1).replace(/''/g, "'")
  return s.slice(1, -1).replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, g: string) => {
    if (g.startsWith('u') || g.startsWith('x')) return String.fromCodePoint(Number.parseInt(g.slice(1), 16))
    const simple = SIMPLE_ESCAPES[g]
    if (simple !== undefined) return simple
    throw new YamlError(`unsupported escape ${m}`, lineNo)
  })
}

/** Cut a trailing " # comment" that sits outside quotes. */
function stripComment(s: string): string {
  let q: string | null = null
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i)
    if (q !== null) {
      if (c === '\\' && q === '"') i++
      else if (c === q) q = null
    } else if (c === '"' || c === "'") {
      if (i === 0 || /[\s[{,:]/.test(s.charAt(i - 1))) q = c
    } else if (c === '#' && (i === 0 || /\s/.test(s.charAt(i - 1)))) {
      return s.slice(0, i).trimEnd()
    }
  }
  return s
}

function scalar(t: string, lineNo: number): YamlValue {
  if (t.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(t)) throw new YamlError('a double-quoted scalar must close on its own line', lineNo)
    return unquote(t, lineNo)
  }
  if (t.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(t)) throw new YamlError('a single-quoted scalar must close on its own line', lineNo)
    return unquote(t, lineNo)
  }
  if (/^[&*!>|]/.test(t) || t.startsWith('%')) throw new YamlError(`unsupported YAML construct "${t.slice(0, 12)}"`, lineNo)
  if (t === '' || t === '~' || t === 'null') return null
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^[-+]?(0|[1-9][0-9]*)$/.test(t)) return Number(t)
  if (/^[-+]?([0-9]+\.[0-9]*|\.[0-9]+)([eE][-+]?[0-9]+)?$/.test(t)) return Number(t)
  return t
}

interface Flow {
  value: YamlValue
  end: number
}

/** A one-line flow collection starting at `start`. */
function flow(t: string, start: number, lineNo: number): Flow {
  const skipWs = (j: number): number => {
    let k = j
    while (k < t.length && /\s/.test(t.charAt(k))) k++
    return k
  }
  let i = skipWs(start)
  if (t.charAt(i) === '[') {
    const arr: YamlValue[] = []
    i = skipWs(i + 1)
    while (t.charAt(i) !== ']') {
      if (i >= t.length) throw new YamlError('a flow sequence must close on its own line', lineNo)
      const r = flowItem(t, i, lineNo, false)
      arr.push(r.value)
      i = skipWs(r.end)
      if (t.charAt(i) === ',') i = skipWs(i + 1)
      else if (t.charAt(i) !== ']') throw new YamlError('expected "," or "]" in a flow sequence', lineNo)
    }
    return { value: arr, end: i + 1 }
  }
  if (t.charAt(i) === '{') {
    const obj: { [key: string]: YamlValue } = {}
    i = skipWs(i + 1)
    while (t.charAt(i) !== '}') {
      if (i >= t.length) throw new YamlError('a flow mapping must close on its own line', lineNo)
      const k = flowItem(t, i, lineNo, true)
      i = skipWs(k.end)
      if (t.charAt(i) !== ':') throw new YamlError('expected ":" in a flow mapping', lineNo)
      const v = flowItem(t, skipWs(i + 1), lineNo, false)
      const key = String(k.value)
      if (Object.hasOwn(obj, key)) throw new YamlError(`duplicate key "${key}"`, lineNo)
      obj[key] = v.value
      i = skipWs(v.end)
      if (t.charAt(i) === ',') i = skipWs(i + 1)
      else if (t.charAt(i) !== '}') throw new YamlError('expected "," or "}" in a flow mapping', lineNo)
    }
    return { value: obj, end: i + 1 }
  }
  throw new YamlError('expected a flow collection', lineNo)
}

function flowItem(t: string, i: number, lineNo: number, isKey: boolean): Flow {
  const c = t.charAt(i)
  if (c === '[' || c === '{') return flow(t, i, lineNo)
  if (c === '"' || c === "'") {
    let j = i + 1
    for (; j < t.length; j++) {
      if (c === '"' && t.charAt(j) === '\\') j++
      else if (t.charAt(j) === c) {
        if (c === "'" && t.charAt(j + 1) === "'") j++
        else break
      }
    }
    if (j >= t.length) throw new YamlError('unterminated quoted scalar in a flow collection', lineNo)
    return { value: unquote(t.slice(i, j + 1), lineNo), end: j + 1 }
  }
  let j = i
  const stop = isKey ? /[,\]}:]/ : /[,\]}]/
  while (j < t.length && !stop.test(t.charAt(j))) j++
  return { value: scalar(t.slice(i, j).trim(), lineNo), end: j }
}

function inline(s: string, lineNo: number): YamlValue {
  const t = stripComment(s)
  if (t.startsWith('[') || t.startsWith('{')) {
    const r = flow(t, 0, lineNo)
    if (t.slice(r.end).trim() !== '') throw new YamlError('text after a flow collection', lineNo)
    return r.value
  }
  return scalar(t, lineNo)
}

const KEY_START = /^("([^"\\]|\\.)*"|'([^']|'')*'|[A-Za-z0-9_./-][A-Za-z0-9_./ -]*?):(\s|$)/

export function parseYaml(text: string): YamlValue {
  const raw = text.replace(/\r\n?/g, '\n').split('\n')
  let pos = 0

  /** Index of the next line that is neither blank nor a comment, or raw.length. */
  const skip = (from: number): number => {
    let i = from
    while (i < raw.length && ((raw[i] as string).trim() === '' || (raw[i] as string).trimStart().startsWith('#'))) i++
    return i
  }
  const indentOf = (l: string): number => l.length - l.trimStart().length

  function parseBlock(parentIndent: number): YamlValue {
    pos = skip(pos)
    if (pos >= raw.length) return null
    const line = raw[pos] as string
    const indent = indentOf(line)
    if (indent <= parentIndent) return null
    return /^-(\s|$)/.test(line.trimStart()) ? parseSequence(indent) : parseMapping(indent)
  }

  function readKey(body: string, lineNo: number): { key: string; rest: string } {
    const m = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s:#&*!|>'"%@`{}[\],?-][^:#]*?|-[A-Za-z0-9_.][^:#]*?)\s*:(?:\s(.*)|$)/.exec(body)
    if (m === null) throw new YamlError(`cannot read a mapping key from "${body.slice(0, 40)}"`, lineNo)
    const k = m[1] as string
    return { key: k.startsWith('"') || k.startsWith("'") ? unquote(k, lineNo) : k, rest: m[2] ?? '' }
  }

  function blockScalar(style: string, chomp: string, parentIndent: number): string {
    const lines: string[] = []
    let blockIndent = -1
    while (pos < raw.length) {
      const l = raw[pos] as string
      if (l.trim() === '') {
        lines.push('')
        pos++
        continue
      }
      const ind = indentOf(l)
      if (ind <= parentIndent) break
      if (blockIndent < 0) blockIndent = ind
      if (ind < blockIndent) throw new YamlError('block scalar indented less than its first line', pos + 1)
      lines.push(l.slice(blockIndent))
      pos++
    }
    let trailing = 0
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
      trailing++
    }
    if (lines.length === 0) return ''
    let out: string
    if (style === '|') {
      out = lines.join('\n')
    } else {
      // Folded: a line break between two ordinary lines is a space; a blank line is one
      // newline; a more-indented line keeps its breaks.
      out = ''
      for (let i = 0; i < lines.length; i++) {
        const cur = lines[i] as string
        if (i > 0) {
          const prev = lines[i - 1] as string
          if (cur === '' || prev === '') out += '\n'
          else if (/^\s/.test(cur) || /^\s/.test(prev)) out += '\n'
          else out += ' '
        }
        out += cur
      }
      out = out.replace(/\n\n/g, '\n')
    }
    if (chomp === '-') return out
    if (chomp === '+') return out + '\n'.repeat(trailing + 1)
    return `${out}\n`
  }

  function parseMapping(indent: number): { [key: string]: YamlValue } {
    const map: { [key: string]: YamlValue } = {}
    for (;;) {
      pos = skip(pos)
      if (pos >= raw.length || indentOf(raw[pos] as string) !== indent) break
      const body = (raw[pos] as string).slice(indent)
      if (/^-(\s|$)/.test(body)) break
      const lineNo = pos + 1
      const k = readKey(body, lineNo)
      if (Object.hasOwn(map, k.key)) throw new YamlError(`duplicate key "${k.key}"`, lineNo)
      const rest = k.rest.trim()
      pos++
      if (rest === '' || rest.startsWith('#')) {
        map[k.key] = parseBlock(indent)
      } else if (/^[>|][+-]?\s*(#.*)?$/.test(rest)) {
        map[k.key] = blockScalar(rest.charAt(0), /[+-]/.exec(rest)?.[0] ?? '', indent)
      } else {
        map[k.key] = inline(rest, lineNo)
      }
    }
    return map
  }

  function parseSequence(indent: number): YamlValue[] {
    const seq: YamlValue[] = []
    for (;;) {
      pos = skip(pos)
      if (pos >= raw.length || indentOf(raw[pos] as string) !== indent) break
      const body = (raw[pos] as string).slice(indent)
      if (!/^-(\s|$)/.test(body)) break
      const rest = body.slice(1)
      const lineNo = pos + 1
      if (rest.trim() === '' || rest.trim().startsWith('#')) {
        pos++
        seq.push(parseBlock(indent))
      } else if (KEY_START.test(rest.trim())) {
        // "- key: value": the mapping continues at the column of the key.
        const col = indent + 1 + (rest.length - rest.trimStart().length)
        raw[pos] = ' '.repeat(col) + rest.trimStart()
        seq.push(parseMapping(col))
      } else {
        pos++
        seq.push(inline(rest.trim(), lineNo))
      }
    }
    return seq
  }

  pos = skip(0)
  if (raw[pos]?.trim() === '---') pos = skip(pos + 1)
  const value = pos >= raw.length ? null : parseBlock(-1)
  pos = skip(pos)
  if (pos < raw.length) throw new YamlError(`unexpected content "${(raw[pos] as string).trim().slice(0, 40)}"`, pos + 1)
  return value
}
