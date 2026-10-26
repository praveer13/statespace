// The three confidence taps and everything printed or computed from them (spine section 8.5; ASSESSMENT.md sections
// 5.2 and 5.6). One place holds every constant, so the Call It sheet that prints the bands, the Mirror that reads them
// and the tests that pin them cannot drift apart.
//
// Pure: no DOM, storage or network.

/** A confidence tap, stored on an event as the category it is; the bands are applied at read time (ASSESSMENT.md section 2.1). */
export type Confidence = 'guess' | 'think' | 'sure'

/** The taps, lowest first. */
export const CONFIDENCES: readonly Confidence[] = ['guess', 'think', 'sure']

export interface Band {
  readonly conf: Confidence
  /** The words on the tap. */
  readonly tap: string
  /** The band as it is printed beside the tap: certainty-based marking's switch points [cbm]. */
  readonly printed: string
  /**
   * The band as fractions, for the Mirror's diagnosis: the interval is read against [lo, hi]. The printed band
   * says 67% and 80%, so those are the edges (the guess band's own imputation uses 2/3, below).
   */
  readonly lo: number
  readonly hi: number
  /** The payoff if right and if wrong: feedback only, never credit (ASSESSMENT.md section 5.3). */
  readonly payoff: { readonly right: number; readonly wrong: number }
}

/** guess below 67%, think so 67 to 80%, sure above 80%; +1/0, +2/-2, +3/-6 (ASSESSMENT.md section 5.2). */
export const BANDS: Readonly<Record<Confidence, Band>> = {
  guess: { conf: 'guess', tap: 'guess', printed: 'below 67%', lo: 0, hi: 0.67, payoff: { right: 1, wrong: 0 } },
  think: { conf: 'think', tap: 'think so', printed: '67–80%', lo: 0.67, hi: 0.8, payoff: { right: 2, wrong: -2 } },
  sure: { conf: 'sure', tap: 'sure', printed: 'above 80%', lo: 0.8, hi: 1, payoff: { right: 3, wrong: -6 } },
}

export const isConfidence = (x: unknown): x is Confidence => x === 'guess' || x === 'think' || x === 'sure'

/**
 * The payoff of a call, shown after the result as information about the choice and never summed, credited or compared
 * (ASSESSMENT.md section 5.3).
 */
export function payoffOf(conf: Confidence, ok: boolean): number {
  const p = BANDS[conf].payoff
  return ok ? p.right : p.wrong
}

/** A payoff written with its sign: +2, -2 (a true minus sign), 0. */
export function signed(n: number): string {
  if (n === 0) return '0'
  return n > 0 ? `+${n}` : `−${-n}`
}

/** The upper edge of the guess band, as the imputation reads it (ASSESSMENT.md section 5.6: "midway between the item's chance and 2/3"). */
export const GUESS_CEILING = 2 / 3
/** The stated confidence imputed to a "think so" call [D] (spine section 8.5). */
export const IMPUTED_THINK = 0.73
/** The stated confidence imputed to a "sure" call [D] (spine section 8.5). */
export const IMPUTED_SURE = 0.9

/**
 * The stated probability imputed to a tap (spine section 8.5; ASSESSMENT.md section 5.6): for guess, midway between the
 * item's chance (0 with no guessing floor) and 2/3; 0.73 for think so; 0.90 for sure. The imputed mean is fixed by the
 * taps, which is why the bias interval is the mean minus the interval of accuracy.
 */
export function imputedConfidence(conf: Confidence, chance: number): number {
  if (conf === 'think') return IMPUTED_THINK
  if (conf === 'sure') return IMPUTED_SURE
  return (chance + GUESS_CEILING) / 2
}

/**
 * The fewest calls a band must hold before it is diagnosed, and before the bias is shown: one constant for the whole
 * Mirror (spine section 8.5; ASSESSMENT.md section 5.6; DESIGN.md section 6.12 "fixed as one constant in W1-T07"). Seven
 * of 12 calls right has an interval of 0.32 to 0.81, which says nothing about a band [D]; 20 is the spine's floor.
 */
export const MIN_CALLS_PER_BAND = 20

/** z for every Mirror interval: ASSESSMENT.md section 6.4 uses 1.96. */
export const MIRROR_Z = 1.96

/** An active study-month holds graded own work on at least this many distinct local days [D] (spine section 2.3, section 12 item 49). */
export const ACTIVE_MONTH_DAYS = 4

/** A knowledge component counts toward VRK30 from this many days after first learning (spine section 2.3). */
export const VRK30_DAYS = 30
