// The attribute list on the line that opens a block or heads a segment:
//
//   :::item role=prequestion family=GEN-negate-it template=t1 kcs=KC-1.a,KC-1.b
//   ## Negating English {minutes=14}
//
// A name alone is a flag; name=value takes a bare value (no space, quote or equals sign) or a value in double
// quotes with \" and \\ escapes. A list is bare values joined by commas. The reader reports what it cannot read
// and never guesses.

import type { PageProblem } from './types.ts'

export type AttrValue = string | true

export interface Attrs {
  /** The attributes read, by name, in the order written. */
  values: Map<string, AttrValue>
  /** What the reader found wrong, with the line of the list. */
  problems: PageProblem[]
}

const NAME = /^[a-z][a-zA-Z0-9-]*/

export function parseAttrs(source: string, line: number): Attrs {
  const values = new Map<string, AttrValue>()
  const problems: PageProblem[] = []
  const fail = (message: string): void => void problems.push({ severity: 'error', code: 'attributes', message, line })
  let i = 0
  while (i < source.length) {
    while (i < source.length && /\s/.test(source.charAt(i))) i++
    if (i >= source.length) break
    const name = NAME.exec(source.slice(i))?.[0]
    if (name === undefined) {
      fail(`cannot read an attribute at ${JSON.stringify(source.slice(i, i + 24))}: write name=value with the name in lower case (a list is joined with commas and no spaces: kcs=KC-1.a,KC-1.b)`)
      break
    }
    i += name.length
    let value: AttrValue = true
    if (source.charAt(i) === '=') {
      i++
      if (source.charAt(i) === '"') {
        i++
        let text = ''
        let closed = false
        while (i < source.length) {
          const c = source.charAt(i)
          if (c === '\\' && (source.charAt(i + 1) === '"' || source.charAt(i + 1) === '\\')) {
            text += source.charAt(i + 1)
            i += 2
          } else if (c === '"') {
            closed = true
            i++
            break
          } else {
            text += c
            i++
          }
        }
        if (!closed) {
          fail(`the quoted value of ${name} is not closed`)
          break
        }
        value = text
      } else {
        const start = i
        while (i < source.length && !/[\s"=]/.test(source.charAt(i))) i++
        value = source.slice(start, i)
        if (value === '') {
          fail(`${name}= has no value`)
          break
        }
        if (source.charAt(i) === '"' || source.charAt(i) === '=') {
          fail(`the value of ${name} holds a quote or an equals sign: put it in double quotes`)
          break
        }
      }
    } else if (i < source.length && !/\s/.test(source.charAt(i))) {
      fail(`cannot read an attribute at ${JSON.stringify(source.slice(i - name.length, i + 12))}`)
      break
    }
    if (values.has(name)) fail(`${name} is given twice`)
    else values.set(name, value)
  }
  return { values, problems }
}

/** The values of a comma-separated list attribute. */
export function listOf(value: AttrValue | undefined): string[] {
  if (value === undefined || value === true) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '')
}
