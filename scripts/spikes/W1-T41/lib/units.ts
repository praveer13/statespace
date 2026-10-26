// Reading the size a loader prints, and comparing it with the build manifest's figure (OD-6: the loader shows one
// engine's compressed first load, from the manifest through caps.firstLoadBytes; DESIGN.md section 6.2 gives its text as
// "Downloading <engine> · <received> of <size>").
//
// A loader may print exact bytes ("12,893,420 B") or a rounded figure ("12.9 MB"). KB, MB and GB are decimal (1000),
// KiB, MiB and GiB binary (1024), as the units are written. A rounded figure must be the manifest's figure rounded to
// the digits it shows, so "12.8 MB" for 12,893,420 bytes is a mismatch, and an exact figure must be exact.

export interface ParsedSize {
  /** The text as printed. */
  raw: string
  /** The number as printed, separators removed. */
  value: number
  /** Digits after the decimal point as printed. */
  decimals: number
  /** The unit as printed. */
  unit: string
  /** value in bytes, as the unit means it (not rounded). */
  bytes: number
}

const FACTORS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kb: 1e3,
  kib: 1024,
  mb: 1e6,
  mib: 1024 ** 2,
  gb: 1e9,
  gib: 1024 ** 3,
}

// digits with thousands separators (comma, space, no-break and thin spaces), or plain digits; an optional fraction; a unit
// whose last letter is a capital B (a lower-case b is a bit)
const SEP = '[,\\u00a0\\u202f\\u2009 ]'
const SIZE = new RegExp(`(?<![\\w.])(\\d{1,3}(?:${SEP}\\d{3})+|\\d+)(?:\\.(\\d+))?\\s*(bytes?|[kK]i?B|[MG]i?B|B)(?![\\w])`, 'g')

export function unitFactor(unit: string): number {
  const f = FACTORS[unit.toLowerCase()]
  if (f === undefined) throw new Error(`unknown size unit ${unit}`)
  return f
}

/** Every size in a text, in order of appearance. */
export function parseSizes(text: string): ParsedSize[] {
  const out: ParsedSize[] = []
  for (const m of text.matchAll(SIZE)) {
    const whole = (m[1] ?? '').replace(new RegExp(SEP, 'g'), '')
    const fraction = m[2] ?? ''
    const unit = m[3] ?? 'B'
    const value = Number(fraction ? `${whole}.${fraction}` : whole)
    out.push({ raw: m[0], value, decimals: fraction.length, unit, bytes: value * unitFactor(unit) })
  }
  return out
}

/** True when the printed figure is the manifest's byte count rounded to the digits the loader shows. */
export function sizeMatches(shown: ParsedSize, manifestBytes: number): boolean {
  const factor = unitFactor(shown.unit)
  const rounded = Number((manifestBytes / factor).toFixed(shown.decimals))
  return rounded === shown.value
}

/**
 * The total a loader's text states: the size after "of" ("3.1 MB of 12.9 MB"), else the largest size in the text. Null
 * when the text holds no size at all.
 */
export function loaderTotal(text: string): ParsedSize | null {
  const sizes = parseSizes(text)
  if (sizes.length === 0) return null
  const afterOf = /\bof\s+(\d[\d,.    ]*\s*(?:bytes?|[kK]i?B|[MG]i?B|B))(?![\w])/i.exec(text)
  if (afterOf) {
    const parsed = parseSizes(afterOf[1] ?? '')
    if (parsed[0]) return parsed[0]
  }
  return sizes.reduce((a, b) => (b.bytes > a.bytes ? b : a))
}

/** A figure as the course writes one: exact bytes with thousands separators, then the decimal-megabyte reading. */
export function describeBytes(bytes: number): string {
  return `${bytes.toLocaleString('en-US')} B (${(bytes / 1e6).toFixed(1)} MB)`
}
