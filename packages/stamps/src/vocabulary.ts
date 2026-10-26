// The stamp vocabulary of spine section 8.7 and DESIGN.md section 5: nine words, nine bracketed codes, the
// qualifier each one requires, the frame that tells it apart in grayscale, and the name a screen reader speaks.
// Pure data. GATE-stamps reads the spine's tables and fails when this file drifts from them.

/** The nine stamp codes, always bracketed (spine, "ID conventions"; GATE-codes). */
export const STAMP_CODES = ['[P]', '[M]', '[T]', '[E]', '[C]', '[A]', '[?]', '[N]', '[R]'] as const
export type StampCode = (typeof STAMP_CODES)[number]

/** The nine stamp words. EROSION is an event drawn as a crack, never a tenth stamp (spine section 8.7). */
export const STAMP_WORDS = [
  'PROVED',
  'MODEL-CHECKED',
  'TESTED',
  'ENFORCED',
  'CONFIGURED',
  'ASSUMED',
  'UNKNOWN',
  'NOT COVERED',
  'REFUTED',
] as const
export type StampWord = (typeof STAMP_WORDS)[number]

export interface StampSpec {
  readonly code: StampCode
  readonly word: StampWord
  /** The word as a screen reader says it: "Proved, code P: ..." (DESIGN.md section 5.9). */
  readonly spokenWord: string
  /** The code as a screen reader says it: "P", or "question mark" for [?]. */
  readonly spokenCode: string
  /** The qualifier spine section 8.7 requires, in its words. */
  readonly requires: string
  /** The shape cue of spine section 8.7, which DESIGN.md section 5.3 draws as a frame. */
  readonly frame: string
  /** The class the stamp component draws the frame with; GATE-stamps' hue and line lints name these classes. */
  readonly className: string
  /** [M] and [T] print their bound first: constants or n lead the qualifier (spine section 10.2; I10). */
  readonly boundFirst: boolean
}

export const STAMPS: readonly StampSpec[] = [
  { code: '[P]', word: 'PROVED', spokenWord: 'Proved', spokenCode: 'P', requires: 'checker@version', frame: 'solid fill', className: 'stamp-p', boundFirst: false },
  { code: '[M]', word: 'MODEL-CHECKED', spokenWord: 'Model-checked', spokenCode: 'M', requires: 'constants; complete or partial', frame: 'dotted frame on a tint', className: 'stamp-m', boundFirst: true },
  { code: '[T]', word: 'TESTED', spokenWord: 'Tested', spokenCode: 'T', requires: 'n and generator statistics', frame: 'single solid frame', className: 'stamp-t', boundFirst: true },
  { code: '[E]', word: 'ENFORCED', spokenWord: 'Enforced', spokenCode: 'E', requires: 'where', frame: 'double frame', className: 'stamp-e', boundFirst: false },
  { code: '[C]', word: 'CONFIGURED', spokenWord: 'Configured', spokenCode: 'C', requires: 'source, read back when', frame: 'rules above and below, open sides', className: 'stamp-c', boundFirst: false },
  { code: '[A]', word: 'ASSUMED', spokenWord: 'Assumed', spokenCode: 'A', requires: 'why', frame: 'dashed frame', className: 'stamp-a', boundFirst: false },
  { code: '[?]', word: 'UNKNOWN', spokenWord: 'Unknown', spokenCode: 'question mark', requires: 'reason', frame: 'hatched, solid frame', className: 'stamp-q', boundFirst: false },
  { code: '[N]', word: 'NOT COVERED', spokenWord: 'Not covered', spokenCode: 'N', requires: 'what is outside the model', frame: 'bare', className: 'stamp-n', boundFirst: false },
  { code: '[R]', word: 'REFUTED', spokenWord: 'Refuted', spokenCode: 'R', requires: 'witness length (actions, steps or rows)', frame: 'solid fill with a ring', className: 'stamp-r', boundFirst: false },
]

const BY_CODE = new Map<StampCode, StampSpec>(STAMPS.map((s) => [s.code, s]))
const BY_WORD = new Map<StampWord, StampSpec>(STAMPS.map((s) => [s.word, s]))

/** The specification of a code. */
export function specOf(code: StampCode): StampSpec {
  const spec = BY_CODE.get(code)
  if (!spec) throw new Error(`not a stamp code: ${code}`)
  return spec
}

/** The word that goes with a code, and the code that goes with a word. */
export const wordOf = (code: StampCode): StampWord => specOf(code).word
export function codeOf(word: StampWord): StampCode {
  const spec = BY_WORD.get(word)
  if (!spec) throw new Error(`not a stamp word: ${word}`)
  return spec.code
}

export const isStampCode = (s: string): s is StampCode => BY_CODE.has(s as StampCode)
export const isStampWord = (s: string): s is StampWord => BY_WORD.has(s as StampWord)

/**
 * The bracketed tags of the spine's Tags paragraph: `[X RUN-id]`, `[V]`, `[D]`, `[U]`, `[KS]`. With the stamp
 * codes they make GATE-codes' one allow-list of bracketed capital codes, in two sets with no code in both, so a
 * tag is never read as a stamp. `[X …]` stands for its family: `[X RUN-id]`, several run IDs, or a value tag.
 */
export const TAG_CODES = ['[X]', '[V]', '[D]', '[U]', '[KS]'] as const
export type TagCode = (typeof TAG_CODES)[number]

/**
 * Learner states: "signed off", "settled", "kept", "mounted" and "parked" are drawn in ink and are never stamps
 * (spine section 8.6; DESIGN.md section 5.8; GATE-codes).
 */
export const LEARNER_STATES = ['signed off', 'settled', 'kept', 'mounted', 'parked'] as const

/**
 * The status words copy never uses bare: only a stamp with its qualifier says what a check established. Spine section
 * 11.2 names the first three for GATE-codes; DESIGN.md section 11.2 gives it "proven" and "guaranteed" too, and the
 * gate checks all five.
 */
export const BARE_STATUS_WORDS = ['verified', 'correct', 'safe', 'proven', 'guaranteed'] as const
