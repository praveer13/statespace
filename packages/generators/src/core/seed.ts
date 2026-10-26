// Seeds, the two halves of the seed space, the deterministic redraw sequence and instance references.
//
// Halves (ASSESSMENT.md section 2.3, "display seeds stay apart" [D]): worked examples, fading rungs, lesson
// demonstrations and drawer illustrations draw from the display half, graded items from the graded half, so
// "unseen" is computable from the log alone. This module fixes the split [D]: a seed whose top bit is set is in
// the display half, the rest are graded. ASSESSMENT.md's worked examples (0x7c1e09a4, 0x3d8a5c21, 0x0009b21f,
// ...) are all graded seeds under this rule, and W0-S09's pool split reads the same top bit as "display".
//
// Redraws (ASSESSMENT.md section 4.1, I3): a seed whose instance the checker cannot key is discarded, and the
// next seed is the successor of the last one, in the same half, so a redraw is a pure function of the drawn
// seed and replays identically everywhere.
//
// References: ASSESSMENT.md section 2.7 identifies an instance as gen:{family}:{template}:{band}:{seed}; the
// event@1 schema (ARCHITECTURE.md section 7.2) writes a generated item's ref as item:GEN-{family}/{template}
// with the seed in its own field. Both forms are built here; instanceEventFields gives an event writer the
// ref, the seed and the band, which event@1 has no field for (see the README's spine issues).
//
// Pure: no DOM, storage or network.

import { isUint32, splitmix32u, toUint32 } from '@statespace/rng'
import type { Band, GenId, TemplateId } from './types.ts'

export type SeedHalf = 'graded' | 'display'

/** The bit that marks a display seed. */
export const DISPLAY_BIT = 0x80000000

/** The half a seed belongs to. */
export function halfOf(seed: number): SeedHalf {
  return (toUint32(seed) & DISPLAY_BIT) !== 0 ? 'display' : 'graded'
}

/** A uint32 mapped into a half by setting or clearing the top bit; the other 31 bits are kept. */
export function inHalf(raw: number, half: SeedHalf): number {
  const low = toUint32(raw) & 0x7fffffff
  return half === 'display' ? (low | DISPLAY_BIT) >>> 0 : low >>> 0
}

/**
 * The next seed of the redraw sequence: the first output of the stream seeded by `seed`, in the seed's own half.
 * splitmix32's first output is a bijective mix of seed + 0x9e3779b9, so successive seeds look unrelated.
 */
export function successor(seed: number): number {
  const s = toUint32(seed)
  return inHalf(splitmix32u(s)(), halfOf(s))
}

/** `count` distinct seeds: the seed itself, then successors (a successor already listed is skipped past). */
export function seedSequence(seed: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError(`count must be a non-negative integer, got ${String(count)}`)
  const out: number[] = []
  const seen = new Set<number>()
  let s = toUint32(seed)
  // The sequence cannot cycle back within a few steps in practice; the guard keeps it total if it ever did.
  for (let guard = 0; out.length < count && guard < count * 64 + 64; guard++) {
    if (!seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
    s = successor(s)
  }
  if (out.length < count) throw new Error(`the redraw sequence from ${formatSeed(seed)} repeats before ${count} seeds`)
  return out
}

/**
 * A graded seed from a raw entropy draw (the main origin's crypto.getRandomValues, drawn and recorded before the
 * item is shown): the draw mapped into the graded half, then successors until `taken` says no. ASSESSMENT.md
 * section 2.3: a graded draw whose identity is already in the log is redrawn.
 */
export function gradedSeed(entropy: number, taken: (seed: number) => boolean = () => false, limit = 64): number {
  let s = inHalf(entropy, 'graded')
  for (let i = 0; i < limit; i++) {
    if (!taken(s)) return s
    s = successor(s)
  }
  throw new Error(`no untaken graded seed within ${limit} successors of ${formatSeed(entropy)}`)
}

/** A seed as ASSESSMENT.md writes it: 0x and eight lowercase hexadecimal digits. */
export function formatSeed(seed: number): string {
  return `0x${toUint32(seed).toString(16).padStart(8, '0')}`
}

/** A seed from 0x-hexadecimal or decimal text; anything else, or a value outside uint32, throws. */
export function parseSeed(text: string): number {
  const t = text.trim()
  const n = /^0x[0-9a-f]{1,8}$/i.test(t) ? Number.parseInt(t.slice(2), 16) : /^[0-9]{1,10}$/.test(t) ? Number(t) : Number.NaN
  if (!isUint32(n)) throw new RangeError(`not a uint32 seed: ${JSON.stringify(text)}`)
  return n
}

const REF = /^gen:(GEN-[a-z0-9]+(?:-[a-z0-9]+)*):(t[1-4]):b([1-3]):(0x[0-9a-f]{8})$/

/** ASSESSMENT.md section 2.7's instance identity: gen:{family}:{template}:b{band}:{seed}. */
export function instanceRef(family: GenId, template: TemplateId, band: Band, seed: number): string {
  return `gen:${family}:${template}:b${band}:${formatSeed(seed)}`
}

/** The parts of an instance reference, or undefined when the text is not one. */
export function parseInstanceRef(ref: string): { family: GenId; template: TemplateId; band: Band; seed: number } | undefined {
  const m = REF.exec(ref)
  if (!m) return undefined
  return { family: m[1] as GenId, template: m[2] as TemplateId, band: Number(m[3]) as Band, seed: parseSeed(m[4] as string) }
}

/** event@1's ref for a generated item met in practice: item:GEN-{family}/{template}. */
export function itemRef(family: GenId, template: TemplateId): string {
  return `item:${family}/${template}`
}

/** event@1's ref for a call on a generated item: call:GEN-{family}/{template}. */
export function callRef(family: GenId, template: TemplateId): string {
  return `call:${family}/${template}`
}

/**
 * What an event about a generated instance records so the instance can be regenerated: event@1's ref and seed,
 * and the band (with the ASSESSMENT.md identity) in `data.instance`, because event@1 has no band field.
 */
export function instanceEventFields(inst: { readonly family: GenId; readonly template: TemplateId; readonly band: Band; readonly seed: number }): {
  ref: string
  seed: number
  data: { instance: { ref: string; band: Band } }
} {
  return {
    ref: itemRef(inst.family, inst.template),
    seed: toUint32(inst.seed),
    data: { instance: { ref: instanceRef(inst.family, inst.template, inst.band, inst.seed), band: inst.band } },
  }
}
