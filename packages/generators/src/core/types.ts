// The generator contract (ARCHITECTURE.md section 17.3; ASSESSMENT.md section 4.1; invariant I3).
//
// A family is a pure maker plus a keyer and a grader that consult checkers:
//
//   make(seed, band, template) -> instance      pure and deterministic: no clock, storage or randomness
//                                               beyond the seed; plain JSON data
//   key(instance, port)        -> key | discard  computed by a checker at grade time, through the port; a seed
//                                               the checker cannot decide (unknown, a budget stop, two options
//                                               it cannot tell apart) is discarded and redrawn
//   grade(instance, answer, key, port) -> grade  why, misconception, witness, bound and basis; ok is null when
//                                               the answer is ungraded
//
// GATE-generators (scripts/verify-generators.mjs) holds every family to it: purity, determinism across three
// engines, 2-4 structurally different templates banded 1-3, unknown discarded, distractors distinct from the
// key and from each other. A template whose engine ships in a later wave is declared `pending`: it counts toward
// the 2-4, is never drawn, and the checks skip it until its engine has a port.
//
// Pure: no DOM, storage or network.

import type { Json } from '@statespace/ledger'
import type { EngineName, EnginePort } from './port.ts'

export type { Json }

/** A generator family's ID (spine ID conventions). */
export type GenId = `GEN-${string}`
/** A template: t1 to t4 (a family has 2-4). */
export type TemplateId = 't1' | 't2' | 't3' | 't4'
export const TEMPLATE_IDS: readonly TemplateId[] = ['t1', 't2', 't3', 't4']
/** A band: 1 to 3, by operator count, quantifier alternation, trace length and process count. */
export type Band = 1 | 2 | 3
export const BANDS: readonly Band[] = [1, 2, 3]
/** A misconception ID: a `dp:` key of docs/EVIDENCE.md section 6. */
export type MisconceptionKey = `dp:${string}`
/** A KC ID. */
export type KcId = `KC-${number}.${string}`
/** Practice shows witnesses and class hints after each submission; a probe is one shot, all feedback after it. */
export type Mode = 'practice' | 'probe'

/** One primary KC, credited by evidence, and at most two secondary KCs (ASSESSMENT.md section 3.1). */
export interface KcTags {
  readonly primary: KcId
  readonly secondary: readonly KcId[]
}

/** An instance's difficulty on the axes its template's bands constrain (variables, atoms, alternations, ...). */
export type Measure = Readonly<Record<string, number>>

/** A band's inclusive [min, max] range on each axis. */
export type BandSpec = Readonly<Record<string, readonly [number, number]>>

/**
 * What a pending template waits for: an engine that ships in a later wave, and the tracker task that makes the
 * template live (GEN-find-the-witness's trace template waits for the TLC graphs that W3-T27 brings, for example).
 */
export interface PendingEngine {
  /** The engine the template's key and grade will consult, which no port provides yet. */
  readonly engine: EngineName
  /** The tracker task after which the template goes live: W{n}-T{nn}. */
  readonly lands: string
}

export interface TemplateSpec {
  readonly id: TemplateId
  /** The spine's template name, such as "single guard". */
  readonly name: string
  /** The KC tags of the template's instances. */
  readonly kcs: KcTags
  /** Bands 1-3: every instance's measure falls inside its band's ranges, and the ranges never fall from band to band. */
  readonly bands: Readonly<Record<Band, BandSpec>>
  /**
   * Present while the template waits for an engine of a later wave. A pending template is declared in full and
   * counts toward the family's 2-4 templates and the spine's count, but it is never drawn, and GATE-generators
   * skips it (and notes `lands`) until its engine has a port; the gate fails a template still pending once it
   * has one. Going live means removing `pending` and listing the engine in the family's `engines`.
   */
  readonly pending?: PendingEngine
}

/** Where an option or a statement came from: the generator's intended key, or a misconception mutant of it. */
export type Origin =
  | {
      /** The intended key. The checker confirms it at grade time; an instance whose reference it rejects is discarded. */
      readonly kind: 'reference'
    }
  | {
      /** One cataloged misconception applied to the reference (ASSESSMENT.md section 4.1, Distractors). */
      readonly kind: 'mutant'
      readonly tag: MisconceptionKey
      /** The mutation operator, in a few words: "assert the property", "converse". */
      readonly operator: string
    }

export interface ChoiceOption {
  /** A, B, C ... in display order. */
  readonly id: string
  /** The option as shown: a formula, a verdict, a stamp, a class. */
  readonly text: string
  /** Why it is or is not the answer: layer 2's misconception note for a mutant. */
  readonly why: string
  readonly origin: Origin
}

export interface ChoicePart {
  readonly kind: 'choice'
  readonly id: string
  readonly prompt: string
  readonly options: readonly ChoiceOption[]
}

export interface TrueFalseStatement {
  readonly id: string
  readonly text: string
  readonly why: string
  /** A reference statement is meant to be true (a restatement); a mutant is meant to be false. */
  readonly origin: Origin
}

/** A multiple true/false set: right only when every statement is (spine section 8.5). */
export interface TrueFalsePart {
  readonly kind: 'multi-tf'
  readonly id: string
  readonly prompt: string
  readonly statements: readonly TrueFalseStatement[]
}

/** A constructed answer in the template's own small language (ASSESSMENT.md section 4.1, Answer languages). */
export interface ConstructedPart {
  readonly kind: 'constructed'
  readonly id: string
  readonly prompt: string
  /** The language's name and a one-line summary of what it accepts. */
  readonly language: { readonly name: string; readonly summary: string }
}

export type ItemPart = ChoicePart | TrueFalsePart | ConstructedPart

/** What the learner sees: a stem and one or more parts, all of which must be right. */
export interface ItemView {
  readonly stem: string
  readonly parts: readonly ItemPart[]
}

/** The fields every instance carries, beside the family's own data. */
export interface InstanceBase {
  readonly family: GenId
  readonly template: TemplateId
  readonly band: Band
  readonly seed: number
  readonly kcs: KcTags
  readonly item: ItemView
  /** The bound a verdict on this instance rests on, printed with it (I10); absent when nothing is bounded. */
  readonly bound?: string
}

/** A learner's answer: a response per part (an option id; statement id to true or false; the constructed text). */
export type ItemAnswer = Readonly<Record<string, Json>>

/** A seed the checker could not key, with the reason. */
export interface Discard {
  readonly discard: string
}

/** A witness on which two options differ: a state, a world, a trace; for categorical options, `{"value": "distinct"}`. */
export interface Distinction {
  readonly a: string
  readonly b: string
  readonly witness: Json
}

/** A choice part's key: the option the checker confirmed, and a distinguishing witness for every pair of options. */
export interface ChoiceKey {
  readonly part: string
  readonly answer: string
  readonly distinctions: readonly Distinction[]
}

/** A true/false part's key: each statement's truth, and a witness that refutes each false statement. */
export interface TrueFalseKey {
  readonly part: string
  readonly truth: Readonly<Record<string, boolean>>
  readonly refutations: Readonly<Record<string, Json>>
}

/** What every key carries, beside the family's own data. */
export interface KeyBase {
  /** engine@version of the checker that computed the key: the event's `engine` field. */
  readonly engine: string
  readonly choices: readonly ChoiceKey[]
  readonly statements: readonly TrueFalseKey[]
  /** The bound the key rests on (I10); absent when the check is exact. */
  readonly bound?: string
}

/** Why an answer was not graded: the checker said unknown, a budget stopped it, or it fell outside the language. */
export type Ungraded = 'unknown' | 'budget' | 'outside-language'

/** A witness's class: the set of every witness like it (M-class-hint). */
export interface WitnessClass {
  readonly id: string
  readonly text: string
}

export interface Grade {
  /** true or false; null when ungraded, which never counts as a miss (ASSESSMENT.md section 2.1). */
  readonly ok: boolean | null
  readonly ungraded?: Ungraded
  /** Layer 1's sentence: what the checker found. */
  readonly why: string
  /** The misconception the response matched, which the event records and M-refutation-card reads. */
  readonly misconception?: MisconceptionKey
  /** Layer 2: the misconception note. */
  readonly note?: string
  /** The witness behind the verdict, plain data. */
  readonly witness?: Json
  /** The witness's class, shown in practice (M-class-hint). */
  readonly class?: WitnessClass
  /** The bound the verdict rests on (I10); absent when the check is exact. */
  readonly bound?: string
  /** What the verdict rests on: the checker and the fragment, such as "Z3 5.3.1, equivalence over QF_LIA". */
  readonly basis: string
  /** engine@version that graded. */
  readonly engine?: string
  /** The response in canonical form, as the event's `resp` records it. */
  readonly response?: Json
}

/** An answer the gate grades on a sampled instance, with the outcome the family expects. */
export interface SampleAnswer {
  readonly label: string
  readonly answer: ItemAnswer
  readonly expect: 'ok' | 'miss' | 'ungraded'
  readonly misconception?: MisconceptionKey
}

export interface Generator<I extends InstanceBase = InstanceBase, K extends KeyBase = KeyBase> {
  readonly id: GenId
  /** The framework's own fixture family: not a family of the spine, so the registry checks skip it. */
  readonly fixture: boolean
  readonly title: string
  /** 2-4 structurally different templates, t1 upward, pending ones included; at least one is live (not pending). */
  readonly templates: readonly TemplateSpec[]
  /** The engines key and grade consult for the live templates; a pending template names its own in `pending.engine`. */
  readonly engines: readonly EngineName[]
  /** The misconception tags its mutants carry. */
  readonly misconceptions: readonly MisconceptionKey[]
  /** Pure and deterministic (I3). */
  make(seed: number, band: Band, template: TemplateId): I
  /** A checker at grade time. */
  key(inst: I, port: EnginePort): Promise<K | Discard>
  grade(inst: I, answer: ItemAnswer, key: K, port: EnginePort): Promise<Grade>
  /** The instance's position on its template's band axes. */
  measure(inst: I): Measure
  /** The instance's shape with every literal erased; two templates never share a shape. */
  structure(inst: I): string
  /** Replays a distinction: true when options a and b of a part really differ on the witness. */
  replay?(inst: I, part: string, a: string, b: string, witness: Json): boolean
  /** Answers for parts the core cannot answer generically (constructed parts), each with its expected outcome. */
  samples?(inst: I, key: K): readonly SampleAnswer[]
}
