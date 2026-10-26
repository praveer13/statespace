// The shapes a derivation produces. A Stamp is made only by this package: its brand is a private class field (below,
// not exported) that only the package's makeStamp gives a value, through a cast. TypeScript never copies a private
// field into an object literal, so the compiler refuses a stamp typed by hand and a spread copy of a derived one
// (`{ ...stamp, lane: 'rechecked-here' }`, `{ ...stamp, qualifier: [] }`): an app derives a stamp from a receipt or an
// engine reply, and never changes one (I2; DESIGN.md section 5.4). Where a type check cannot see (a cast, JSON.parse
// typed as a stamp, Object.assign onto a stamp, a copy handed to stampText, which takes a stamp's text fields),
// GATE-stamps' hand check reads the text of the apps; a value typed `any` from elsewhere is beyond both.

import type { StampCode, StampWord } from './vocabulary.ts'

/**
 * A derived stamp's lane. A stored receipt carries only `reported` or `self-assessed`; `rechecked-here` exists
 * only as the read-time lane of a stamp the tab derived from its own engine (ARCHITECTURE.md section 18, item 13).
 */
export type Lane = 'rechecked-here' | 'reported' | 'self-assessed'

/** The badge words a learner sees beside a stamp (spine section 9.3; DESIGN.md section 5.5). */
export const LANE_BADGES: Readonly<Record<Lane, string>> = {
  'rechecked-here': 're-checked here',
  reported: 'reported from your machine',
  'self-assessed': 'self-assessed',
}

/**
 * The label for the course's own recorded run, shown in place of a live one. It is course evidence and mints no
 * learner stamp (spine section 9.3); Boot says "recorded result" until S1.L1 introduces "run" (spine section 0).
 */
export const RECORDED_RUN_LABELS = { run: 'recorded run', boot: 'recorded result' } as const

/**
 * The brand. A private field makes the type nominal in a way a symbol-keyed property does not: a spread copies a
 * symbol-keyed property, so `{ ...stamp, lane: 'rechecked-here' }` would still type-check as a Stamp, but it never
 * copies a private field. The class is declared only, so nothing of it exists at run time.
 */
declare abstract class StampBrand {
  #stamp: true
}

/** The rows of spine section 8.8, plus the rules outside the table that also yield stamps (`rows.ts`). */
export type RowKey = string

export interface Defeater {
  /** The doubt in words, such as "encoding unverified". */
  readonly text: string
  /** What the doubt is against. */
  readonly against: 'claim' | 'vc-generator' | 'both-sides'
}

export interface Stamp extends StampBrand {
  readonly code: StampCode
  readonly word: StampWord
  /** The qualifier's parts in order, joined by " · " for display; [M] and [T] lead with the bound. */
  readonly qualifier: readonly string[]
  readonly lane: Lane
  /** Where the raw output came from: a receipt path and run, an engine reply, a run ID. Never shown as a stamp. */
  readonly source: string
  /** The row of spine section 8.8 (or the rule outside it) that derived the stamp. */
  readonly row: RowKey
  /** Open defeaters that stack under the stamp in a claim card, such as "encoding unverified". */
  readonly defeaters: readonly Defeater[]
}

/**
 * An assertion shown as quoted text, never framed: an agent's or a language model's words under UNREVIEWED (I8;
 * spine section 8.8), or a course-authored claim the Clearinghouse puts under audit, under UNDER AUDIT.
 */
export interface UnreviewedQuote {
  readonly label: 'UNREVIEWED' | 'UNDER AUDIT'
  /** The words, verbatim. */
  readonly quote: string
  /** Who said it, in learner words: "the agent", or a model's name. */
  readonly by: string
}

/** Why a raw output earns no stamp. Each reason maps to a row of spine section 8.8 or to an invariant. */
export type NoStampReason =
  | 'agent-assertion'
  | 'model-assertion'
  | 'course-claim-under-audit'
  | 'shadow-mismatch'
  | 'no-replay'
  | 'replay-pending'
  | 'premise-witness'
  | 'direction-unknown'
  | 'tool-error'
  | 'checker-rejected'
  | 'no-verdict'
  | 'trace-unearned'
  | 'liveness-untestable'

export interface Witness {
  readonly trace: string
  readonly firstNonConformingLine: number
}

export type Derivation =
  | {
      readonly kind: 'stamp'
      readonly stamp: Stamp
      /** An [?] that guards enforcement fails closed: the gate treats it as a refusal (spine section 8.8; [bpa]). */
      readonly enforcement?: 'fail-closed'
      /** Rejected traces: each earns no [T]; the trace and its first non-conforming line are the witness. */
      readonly witnesses?: readonly Witness[]
    }
  | {
      /** Lean with `sorryAx` or a custom axiom: no [P]; the claim reads "PROVED modulo k assumed lemmas", each [A]. */
      readonly kind: 'modulo'
      readonly text: string
      readonly assumed: readonly Stamp[]
    }
  | {
      readonly kind: 'none'
      readonly reason: NoStampReason
      /** What the screen says instead of a stamp, in plain words. */
      readonly text: string
      readonly row: RowKey
      readonly defeater?: Defeater
      readonly quote?: UnreviewedQuote
      readonly witnesses?: readonly Witness[]
    }
