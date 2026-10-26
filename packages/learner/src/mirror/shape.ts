// The shape of a called item: how many answers it offers, which sets its chance level and its own bin in the Mirror (spine
// section 8.5). A three-way verdict, a trace-length interval and a which-anomaly question each offer k options and print
// "1 in k"; a multiple true/false set of m statements is right only when every statement is, so its chance is 1 in 2^m and
// it sits in its own bin; an answer built from scratch has no guessing floor.
//
// Pure: no DOM, storage or network.

export type CallShape =
  | { readonly form: 'choice'; readonly options: number }
  | { readonly form: 'set'; readonly statements: number }
  | { readonly form: 'constructed' }

/** The fewest and most options or statements a call can offer: authored cells carry 2 to 8 options, and a set stays well under 2^53. */
export const MIN_OFFERED = 2
export const MAX_OPTIONS = 12
export const MAX_STATEMENTS = 20

const isCount = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= MIN_OFFERED && x <= max

/** A well-formed shape. */
export function isCallShape(x: unknown): x is CallShape {
  if (typeof x !== 'object' || x === null) return false
  const s = x as { form?: unknown; options?: unknown; statements?: unknown }
  if (s.form === 'choice') return isCount(s.options, MAX_OPTIONS)
  if (s.form === 'set') return isCount(s.statements, MAX_STATEMENTS)
  return s.form === 'constructed'
}

/** The n of "chance 1 in n": k options, or 2^m for m statements; null with no guessing floor. */
export function oneIn(shape: CallShape): number | null {
  if (shape.form === 'constructed') return null
  if (shape.form === 'choice') return shape.options
  // 2^m by repeated doubling: exact for m up to 20, and the same in every engine.
  let n = 1
  for (let i = 0; i < shape.statements; i++) n *= 2
  return n
}

/** The probability of answering by guessing: 1/n, or 0 with no guessing floor. */
export function chanceOf(shape: CallShape): number {
  const n = oneIn(shape)
  return n === null ? 0 : 1 / n
}

/** A set sits in its own Mirror bin; every other call shares the other (spine section 8.5). */
export type Bin = 'answer' | 'set'
export const BINS: readonly Bin[] = ['answer', 'set']
export const binOf = (shape: CallShape): Bin => (shape.form === 'set' ? 'set' : 'answer')

/** The chance line printed beside the taps (DESIGN.md sections 6.2 and 6.3). */
export function chanceLine(shape: CallShape): string {
  switch (shape.form) {
    case 'choice':
      return `${shape.options} options · chance 1 in ${shape.options}`
    case 'set':
      return `all ${shape.statements} by guessing: 1 in ${oneIn(shape)}`
    case 'constructed':
      return 'no guessing floor'
  }
}
