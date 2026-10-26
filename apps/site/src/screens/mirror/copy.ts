// SCR-mirror's fixed words, in one place for review (DESIGN.md section 6.12 and SCR-mirror; ASSESSMENT.md section 5.6). Ink only:
// nothing here praises or warns, no sentence describes the person (only the calls), and no count is a score. The glossary's first
// lesson for "Mirror" is S1.L1, so the screen's words use only the terms whose first lesson is S1.L1 or an earlier one (call, Today,
// Mirror, signed off and settled are the ones it uses) and none introduced later, claim and seam (S1.L3) included. Its privacy is told
// as "stays on this device and is never part of a shared report"; that it never appears on Claims (DESIGN.md section 7.2) is the
// route's rule, not a sentence for a learner who has not met the term. The render test holds this with scripts/spikes/W1-T07/lib/words.mjs.

import { BANDS, MIN_CALLS_PER_BAND } from '@statespace/learner/mirror'
import type { Bin, Confidence, Exclusion } from '@statespace/learner/mirror'

/** A rate or an interval end: two decimals, as the spec's tables write them (0.42-0.75). */
export const fmt = (x: number): string => x.toFixed(2)
/** A signed figure for a difference: +0.08, −0.04 (a true minus sign), 0.00. */
export const signedFmt = (x: number): string => {
  const t = Math.abs(x).toFixed(2)
  return t === '0.00' ? t : x > 0 ? `+${t}` : `−${t}`
}
const range = (low: number, high: number): string => `${fmt(low)}–${fmt(high)}`
const quoted = (conf: Confidence): string => `“${BANDS[conf].tap}”`

export const COPY = {
  title: 'Mirror',
  lede: 'Only you see this. It stays on this device and is never part of a shared report. It sets how sure you said you were beside how often you were right.',
  backToToday: 'Back to Today',
  loading: 'Reading your record…',
  unavailable: 'This browser is not keeping your record, so there is nothing to show here.',
  empty: `Your confidence taps go to this Mirror. It shows nothing until there are enough calls to say anything: at least ${MIN_CALLS_PER_BAND} in a band.`,

  calibration: 'Calibration',
  bins: { answer: 'Calls with one answer', set: 'Calls on a set of statements' } satisfies Record<Bin, string>,
  assistedHeading: 'Calls made with help, shown apart',
  assistedLede: 'These are kept out of everything above and never pooled with it.',

  biasLabel: 'Bias',
  /** "Bias +0.08 (interval −0.04 to +0.20)": mean stated confidence minus the hit rate. */
  bias: (value: number, low: number, high: number): string => `${signedFmt(value)} (interval ${signedFmt(low)} to ${signedFmt(high)})`,
  biasDetail: (mean: number, hits: number, n: number, low: number, high: number): string =>
    `Stated confidence averaged ${fmt(mean)}. ${hits} of ${n} calls were right: hit rate ${fmt(hits / n)}, interval ${range(low, high)}.`,
  biasWaiting: (n: number): string => `Too few calls to say anything about bias yet (${n} of ${MIN_CALLS_PER_BAND}).`,
  noCalls: 'No calls in this group yet.',

  bandHead: (conf: Confidence): string => `${BANDS[conf].tap} · ${BANDS[conf].printed}`,
  counts: (hits: number, n: number, rate: number, low: number, high: number): string => `${hits} of ${n} right · hit rate ${fmt(rate)} · interval ${range(low, high)}`,
  bandEmpty: 'No calls in this band yet.',
  tooFew: (n: number): string => `Too few calls in this band to say anything yet (${n}).`,
  below: (conf: Confidence, hits: number, n: number, low: number, high: number): string =>
    `Your ${quoted(conf)} calls hit less often than ${quoted(conf)} says: ${hits} of ${n}, interval ${range(low, high)}.`,
  above: (conf: Confidence, hits: number, n: number, low: number, high: number): string =>
    `Your ${quoted(conf)} calls hit more often than ${quoted(conf)} says: ${hits} of ${n}, interval ${range(low, high)}.`,
  reaches: 'The interval reaches the band, so there is nothing to report.',
  resolution: (sureRate: number, guessRate: number, diff: number): string =>
    `Hit rate at ${quoted('sure')} ${fmt(sureRate)}, at ${quoted('guess')} ${fmt(guessRate)}: ${signedFmt(diff)}. Shown apart from bias, because feedback on confidence can narrow overconfidence without improving the answers.`,
  axisLow: '0%',
  axisHigh: '100%',

  countsHeading: 'What counts',
  counted: (n: number): string => `${n} ${n === 1 ? 'call counts' : 'calls count'}: your first call on each question, made after the lesson that teaches it, with no help declared.`,
  /** The calls read and left out, by reason, in the learner's words. */
  excluded: {
    repeat: (n: number): string => `${n} on a question you had already called (only the first call counts).`,
    ungraded: (n: number): string => `${n} with no result, which counts as neither right nor wrong.`,
    agent: (n: number): string => `${n} an agent made.`,
    seen: (n: number): string => `${n} on a question you had seen before.`,
    'no-kc': (n: number): string => `${n} that cannot be placed against a lesson.`,
    'no-shape': (n: number): string => `${n} that do not say how many answers the question offered.`,
    'before-instruction': (n: number): string => `${n} made before the lesson that teaches the idea (kept out on purpose).`,
  } satisfies Record<Exclusion, (n: number) => string>,
  leftOut: 'Left out:',

  vrkHeading: 'Reasoning moves still yours at 30 days',
  vrkTermCount: 'Count',
  vrkTermRate: 'Rate',
  vrkTermAnswers: 'Answers',
  vrkNothing: 'Nothing yet. An idea counts after you answer a fresh question on it, right, 30 days or more after you first learned it.',
  vrkCount: (n: number): string => `${n} ${n === 1 ? 'idea' : 'ideas'}`,
  vrkCountDetail: 'whose latest answer, 30 days or more after you first learned them, was right',
  vrkRate: (rate: number, months: number): string => `${fmt(rate)} per active study-month (${months} ${months === 1 ? 'month' : 'months'} with graded work on 4 or more days)`,
  vrkRateWaiting: 'No active study-month yet: a month is active with graded work on 4 or more days.',
  vrkAccuracy: (hits: number, n: number, low: number, high: number): string => `${hits} of ${n} answers right 30 days or more after first learning · interval ${range(low, high)}`,
  vrkIdeas: 'Ideas that count',
  vrkSince: (from: string, at: string): string => `first learned ${from} · latest answer ${at}`,
  settledTag: 'settled',
  settledNote: 'Settled ideas are marked here once a stage is signed off and a fresh question on the idea is answered 30 days or more later.',
  unknownIdea: 'an idea that is not in this version of the course',

  howHeading: 'How to read this',
  how: [
    `A call records an answer and how likely you said it was right: guess (${BANDS.guess.printed}), think so (${BANDS.think.printed}) or sure (${BANDS.sure.printed}).`,
    'The hit rate is the share of calls in a band that were right, with a 95% interval: the range the true rate plausibly lies in, given that many calls.',
    'Bias is the average of what you said minus the hit rate. Above zero means more sure than right; below zero means less. What you said is taken as the middle of each band: 0.73 for think so, 0.90 for sure, and for guess midway between the question\'s chance and 2/3.',
    `A band gets a sentence only with at least ${MIN_CALLS_PER_BAND} calls and an interval wholly outside its printed band. With fewer, an interval says too little.`,
    'Only your first call on each question counts, made after the lesson that teaches it. Calls made with help are shown apart.',
    'Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work.',
  ],
} as const
