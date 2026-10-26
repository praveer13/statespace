// What the Call It sheet asks and what it records. An item is a question with one answer (a verdict, a trace-length interval,
// a which-anomaly option) or a multiple true/false set with one confidence for the whole set (spine section 8.5; DESIGN.md
// sections 6.2 and 6.3). Both authored cells and generated instances reduce to these two shapes; items.ts does the reducing.

import type { CallIdentity, CallShape, Confidence } from '@statespace/learner/mirror'

export interface CallOption {
  /** A, B, C ... in display order. */
  readonly id: string
  /** The option as the learner reads it: Markdown with `code` spans. */
  readonly text: string
  /** Why it is or is not the answer, shown after the result. */
  readonly why: string
  /** The misconception key (dp:...) a learner who picks it holds; the key option has none. */
  readonly mis?: string
}

export interface CallStatement {
  readonly id: string
  readonly text: string
  readonly why: string
  readonly mis?: string
  /** Whether the statement is true: the key. */
  readonly truth: boolean
}

interface CallBase {
  /** The question: its ref, and the seed for a generated instance (ASSESSMENT.md section 2.3). */
  readonly identity: CallIdentity
  /** A scenario shown above the question (a generated instance's stem): Markdown with `code` spans. */
  readonly stem?: string
  /** The question as the learner reads it: Markdown with `code` spans. For a set, what the statements are judged against. */
  readonly prompt: string
  /** The knowledge component the call is about, resolved from content when the call is written (the item's primary tag). */
  readonly kc?: string
  /** The item's revision, as content builds it (an authored cell) or the family's itemRev. */
  readonly rev?: string
  /** The engine that keyed the item, name@version. */
  readonly engine?: string
  /** The bound the verdict rests on, printed with the item (I10). */
  readonly bound?: string
  /** More kind-specific data to keep beside the call, such as a generated instance's `instance`. */
  readonly extra?: Readonly<Record<string, unknown>>
}

export interface ChoiceItem extends CallBase {
  readonly form: 'choice'
  readonly options: readonly CallOption[]
  /** The id of the keyed option. */
  readonly key: string
}

export interface SetItem extends CallBase {
  readonly form: 'set'
  readonly statements: readonly CallStatement[]
}

export type CallItem = ChoiceItem | SetItem

/** The shape that sets the printed chance and the Mirror's bin. */
export function shapeOf(item: CallItem): CallShape {
  return item.form === 'choice' ? { form: 'choice', options: item.options.length } : { form: 'set', statements: item.statements.length }
}

/** What the learner has chosen so far, before the call is committed. */
export interface Draft {
  /** A choice's picked option. */
  readonly picked: string | null
  /** A set's answers so far, by statement id. */
  readonly answers: Readonly<Record<string, boolean>>
  readonly conf: Confidence | null
  /** The learner said they had help with this call (OD-8). */
  readonly help: boolean
}

/** A call as the log holds it, reduced to what the sheet shows. */
export interface RecordedCall {
  /** The event's id. */
  readonly id: string
  readonly conf: Confidence
  readonly ok: boolean | null
  /** The choice that was picked, or the set's answers, as recorded. */
  readonly picked: string | null
  readonly answers: Readonly<Record<string, boolean>> | null
  readonly provenance: 'own' | 'assisted' | 'agent'
}
