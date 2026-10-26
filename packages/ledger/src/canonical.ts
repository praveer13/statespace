// Canonical JSON, the order the conflict rule compares in, and the structural limits on outside JSON.
//
// The canonical form is RFC 8785's (JSON Canonicalization Scheme) for the values an event can hold: object
// keys sorted by UTF-16 code units, no whitespace, and ECMAScript's own serialisation of strings and numbers
// (JSON.stringify), so -0 is written 0 and a lone surrogate is escaped. A value JSON cannot hold exactly
// (NaN, an infinity, undefined inside an array, a function, a class instance) is refused rather than
// silently changed, because a stored event must equal the parse of its canonical form.
//
// Pure: no DOM, storage or network.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/** Why a value or a log was refused. */
export type LedgerErrorCode =
  | 'not-json'
  | 'too-deep'
  | 'too-many-values'
  | 'forbidden-key'
  | 'invalid-event'
  | 'invalid-draw'
  | 'invalid-log'
  | 'refused'

export class LedgerError extends Error {
  readonly code: LedgerErrorCode

  constructor(code: LedgerErrorCode, message: string) {
    super(message)
    this.name = 'LedgerError'
    this.code = code
  }
}

/**
 * Structural limits on JSON that comes from outside the page, ARCHITECTURE.md section 5.6 [D]: depth at most
 * 64, at most 100,000 values, and the keys __proto__, prototype and constructor refused.
 */
export const JSON_LIMITS = {
  maxDepth: 64,
  maxValues: 100_000,
  forbiddenKeys: ['__proto__', 'prototype', 'constructor'] as readonly string[],
} as const

const isPlainObject = (v: object): boolean => {
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

/**
 * The canonical JSON text of a value. Object properties whose value is undefined are left out, as
 * JSON.stringify leaves them out; every other value JSON cannot represent exactly throws a LedgerError.
 */
export function canonicalJson(value: unknown): string {
  return encode(value, 0)
}

function encode(v: unknown, depth: number): string {
  if (depth > JSON_LIMITS.maxDepth) throw new LedgerError('too-deep', `a value nests deeper than ${JSON_LIMITS.maxDepth} levels`)
  if (v === null) return 'null'
  switch (typeof v) {
    case 'boolean':
      return v ? 'true' : 'false'
    case 'number':
      if (!Number.isFinite(v)) throw new LedgerError('not-json', `${String(v)} has no JSON form`)
      return JSON.stringify(v)
    case 'string':
      return JSON.stringify(v)
    case 'object': {
      if (Array.isArray(v)) {
        const parts: string[] = []
        for (let i = 0; i < v.length; i++) {
          const item: unknown = v[i]
          if (item === undefined) throw new LedgerError('not-json', `array element ${i} is undefined`)
          parts.push(encode(item, depth + 1))
        }
        return `[${parts.join(',')}]`
      }
      if (!isPlainObject(v)) throw new LedgerError('not-json', 'only plain objects have a JSON form')
      const record = v as Record<string, unknown>
      const keys = Object.keys(record)
        .filter((k) => record[k] !== undefined)
        .sort()
      return `{${keys.map((k) => `${JSON.stringify(k)}:${encode(record[k], depth + 1)}`).join(',')}}`
    }
    default:
      throw new LedgerError('not-json', `a ${typeof v} has no JSON form`)
  }
}

/** The parse of a value's canonical form: what a store holds, with undefined properties gone and -0 as 0. */
export function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T
}

/**
 * Compare two strings by Unicode code point, which is also the order of their UTF-8 bytes, so another
 * language reaches the same order. Code units are compared directly except across the surrogate range: a
 * supplementary character (a surrogate pair) sorts after every code point of the Basic Multilingual Plane.
 */
export function compareCodePoints(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const x = a.charCodeAt(i)
    const y = b.charCodeAt(i)
    if (x !== y) return rank(x) - rank(y)
  }
  return a.length - b.length
}

const rank = (c: number): number => (c >= 0xd800 && c <= 0xdfff ? c + 0x2000 : c >= 0xe000 ? c - 0x800 : c)

/** Problems with a parsed JSON value under JSON_LIMITS: nesting, size and forbidden keys. */
export function checkStructure(value: unknown): string[] {
  const problems: string[] = []
  let count = 0
  const walk = (v: unknown, depth: number, path: string): void => {
    if (problems.length > 0) return
    count += 1
    if (count > JSON_LIMITS.maxValues) {
      problems.push(`more than ${JSON_LIMITS.maxValues} values`)
      return
    }
    if (depth > JSON_LIMITS.maxDepth) {
      problems.push(`${path || '/'}: nests deeper than ${JSON_LIMITS.maxDepth} levels`)
      return
    }
    if (v === null || typeof v !== 'object') return
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, depth + 1, `${path}/${i}`))
      return
    }
    for (const key of Object.keys(v)) {
      if (JSON_LIMITS.forbiddenKeys.includes(key)) {
        problems.push(`${path}/${key}: the key ${JSON.stringify(key)} is refused`)
        return
      }
      walk((v as Record<string, unknown>)[key], depth + 1, `${path}/${key}`)
    }
  }
  walk(value, 0, '')
  return problems
}

/** JSON.parse followed by the structural check; throws a LedgerError on either failure. */
export function parseJsonSafely(text: string): Json {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (e) {
    throw new LedgerError('not-json', `not JSON: ${(e as Error).message}`)
  }
  const problems = checkStructure(value)
  if (problems.length > 0) {
    const code = problems[0]?.includes('deeper') ? 'too-deep' : problems[0]?.includes('values') ? 'too-many-values' : 'forbidden-key'
    throw new LedgerError(code, problems.join('; '))
  }
  return value as Json
}
