// Distractors as misconception mutants (ASSESSMENT.md section 4.1, Distractors): each applies one cataloged
// misconception to the generator's reference and carries its `dp:` tag and its "why". make() assembles the
// options from the reference and the mutants that apply; key() asks the family's checker to confirm the
// reference and to tell every pair of options apart on a witness, and discards the seed when it cannot
// (two options equivalent, or the checker undecided). Witnesses are kept for the options' feedback.
//
// Pure: no DOM, storage or network.

import type { SeededDraw } from '@statespace/rng'
import { discard } from './define.ts'
import type { DiscardOf } from './define.ts'
import type { ChoiceKey, ChoiceOption, Distinction, Json, MisconceptionKey, Origin } from './types.ts'

export interface Mutant<R> {
  readonly tag: MisconceptionKey
  /** The mutation operator, in a few words: "assert the property", "converse". */
  readonly operator: string
  /** The option's why for this reference: what applying the misconception gets wrong. */
  why(reference: R): string
  /** The mutant of this reference, or null when the operator does not apply to it. */
  apply(reference: R, draw: SeededDraw): R | null
}

export interface AssembledOptions<R> {
  /** The options in display order, labeled A, B, C ... */
  readonly options: readonly ChoiceOption[]
  /** Each option's value (a formula, a verdict), by option id: plain JSON, kept in the instance. */
  readonly values: Readonly<Record<string, R>>
}

/** Option labels for n options: A, B, ..., Z. */
export function optionLetters(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n > 26) throw new RangeError(`between 0 and 26 options, not ${String(n)}`)
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
}

/**
 * The options of a choice part: the reference and up to `distractors` mutants, the operators tried in a seeded
 * order, a mutant whose text repeats the reference or an earlier option skipped, then all of them in a seeded
 * order. Deterministic in the draw. Throws when fewer than `minDistractors` mutants apply, because a part whose
 * option count changes with the seed would change its chance level.
 */
export function assembleOptions<R>(args: {
  readonly reference: R
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<R>[]
  readonly distractors: number
  readonly minDistractors?: number
  readonly draw: SeededDraw
  readonly render: (value: R) => string
}): AssembledOptions<R> {
  const { reference, mutants, distractors, draw, render } = args
  const min = args.minDistractors ?? distractors
  const candidates: { value: R; text: string; why: string; origin: Origin }[] = [{ value: reference, text: render(reference), why: args.referenceWhy, origin: { kind: 'reference' } }]
  const texts = new Set([candidates[0]?.text])
  for (const m of draw.shuffle(mutants)) {
    if (candidates.length > distractors) break
    const value = m.apply(reference, draw)
    if (value === null) continue
    const text = render(value)
    if (texts.has(text)) continue
    texts.add(text)
    candidates.push({ value, text, why: m.why(reference), origin: { kind: 'mutant', tag: m.tag, operator: m.operator } })
  }
  if (candidates.length - 1 < min) throw new Error(`only ${candidates.length - 1} mutant(s) applied, fewer than the ${min} the part needs`)
  const ordered = draw.shuffle(candidates)
  const ids = optionLetters(ordered.length)
  const options: ChoiceOption[] = []
  const values: Record<string, R> = {}
  ordered.forEach((c, i) => {
    const id = ids[i] as string
    options.push({ id, text: c.text, why: c.why, origin: c.origin })
    values[id] = c.value
  })
  return { options, values }
}

/** What a checker said about two options: a witness on which they differ, that they are equivalent, or undecided. */
export type DistinguishResult = { readonly differ: Json } | { readonly same: true } | { readonly unknown: string; readonly budget: boolean }

/** What a checker said about the reference: confirmed as the key, rejected, or undecided. */
export type ConfirmResult = { readonly confirmed: true } | { readonly rejected: string } | { readonly unknown: string; readonly budget: boolean }

/**
 * The key of a choice part, certified by the family's checker: the reference confirmed, and every unordered pair
 * of options told apart on a witness (so each distractor differs from the key and from every other option).
 * Any undecided question, or two equivalent options, discards the seed.
 */
export async function certifyChoice<R>(args: {
  readonly part: string
  readonly options: readonly ChoiceOption[]
  readonly values: Readonly<Record<string, R>>
  readonly confirm: (reference: R) => Promise<ConfirmResult>
  readonly distinguish: (a: R, b: R) => Promise<DistinguishResult>
}): Promise<ChoiceKey | DiscardOf> {
  const { part, options, values } = args
  const refs = options.filter((o) => o.origin.kind === 'reference')
  if (refs.length !== 1) throw new Error(`part ${part} has ${refs.length} reference options; a choice part has exactly one`)
  const ref = refs[0] as ChoiceOption
  const value = (id: string): R => {
    if (!(id in values)) throw new Error(`part ${part}: option ${id} has no value`)
    return values[id] as R
  }
  const confirmed = await args.confirm(value(ref.id))
  if ('unknown' in confirmed) return discard(confirmed.budget ? 'budget' : 'unknown', `the checker could not confirm the reference: ${confirmed.unknown}`)
  if ('rejected' in confirmed) return discard('reference-rejected', `the checker rejected the reference option ${ref.id}: ${confirmed.rejected}`)
  const distinctions: Distinction[] = []
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const a = options[i] as ChoiceOption
      const b = options[j] as ChoiceOption
      const r = await args.distinguish(value(a.id), value(b.id))
      if ('unknown' in r) return discard(r.budget ? 'budget' : 'unknown', `the checker could not tell options ${a.id} and ${b.id} apart: ${r.unknown}`)
      if ('same' in r) return discard('equivalent', `options ${a.id} and ${b.id} are equivalent`)
      distinctions.push({ a: a.id, b: b.id, witness: r.differ })
    }
  }
  return { part, answer: ref.id, distinctions }
}

/**
 * Distinctions for categorical options (verdict words, stamps, classes), which differ by value: the witness
 * records that. Throws when two options share a value.
 */
export function categoricalDistinctions(options: readonly ChoiceOption[]): Distinction[] {
  const out: Distinction[] = []
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const a = options[i] as ChoiceOption
      const b = options[j] as ChoiceOption
      if (a.text === b.text) throw new Error(`options ${a.id} and ${b.id} share the text ${JSON.stringify(a.text)}`)
      out.push({ a: a.id, b: b.id, witness: { value: 'distinct' } })
    }
  }
  return out
}

/** The distinction between two options of a key, in either order. */
export function distinctionOf(key: ChoiceKey, a: string, b: string): Distinction | undefined {
  return key.distinctions.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a))
}

/**
 * The misconception a constructed answer matches: the first candidate the checker finds equivalent to it
 * (ASSESSMENT.md section 4.1, Misconception matching). Undecided comparisons are skipped, never matched.
 */
export async function matchMisconception<R>(
  answer: R,
  candidates: readonly { readonly tag: MisconceptionKey; readonly value: R }[],
  equivalent: (a: R, b: R) => Promise<boolean | 'unknown'>,
): Promise<MisconceptionKey | undefined> {
  for (const c of candidates) if ((await equivalent(answer, c.value)) === true) return c.tag
  return undefined
}
