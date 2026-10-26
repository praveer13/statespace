// The sheet's fixed words, in one place for review (DESIGN.md sections 6.2, 6.3 and 11.6). They say "matched" and "missed",
// never "correct" or "wrong"; the payoffs are feedback only; and they use plain English and the one glossary term Boot
// introduces for this, "call", so they read the same in Boot (which may use terms 1 to 5 only) and in every lesson.

import { BANDS, CONFIDENCES, signed } from '@statespace/learner/mirror'

const payoffs = CONFIDENCES.map((c) => `${BANDS[c].tap} ${signed(BANDS[c].payoff.right)} / ${signed(BANDS[c].payoff.wrong)}`).join(' · ')

export const COPY = {
  /** The label and the sentence beside it: DESIGN.md section 11.6. */
  label: 'Call it.',
  rule: 'Your first call is the one that counts.',
  howLikely: 'How likely is this right?',
  /** DESIGN.md section 11.6: "Feedback only, never credit: +1 / 0 · +2 / −2 · +3 / −6", with each tap named. */
  payoffs: `Feedback only, never credit: ${payoffs}.`,
  /** Before the action can be taken. */
  needAnswer: 'Choose an answer, then how likely it is right.',
  needAllStatements: 'Mark every statement, then say how likely the whole set is right.',
  needConfidence: 'Now say how likely it is right.',
  action: 'Record my call',
  help: 'I had help with this call',
  helpHint: 'Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work.',
  saving: 'Recording your call…',
  matched: 'Your call matched.',
  missed: 'Your call missed.',
  recorded: (answer: string, tap: string): string => `Recorded: ${answer} · ${tap}.`,
  payoff: (n: number): string => `${signed(n)}, feedback only.`,
  withHelp: 'Marked as made with help.',
  elsewhere: 'This question was already called, in another tab. That call stands.',
  failed: (reason: string): string => `Not recorded: ${reason}. Your call has not been saved.`,
  unavailable: 'This browser is not keeping your record, so a call cannot be recorded here.',
  loading: 'Looking for your call…',
  skip: "Skip the call: you've shown this one.",
  trueWord: 'True',
  falseWord: 'False',
  bound: (bound: string): string => `Bound: ${bound}.`,
  /** After the result. */
  yourStatement: (id: string, said: string, key: string): string => `Statement ${id}: you said ${said}; it is ${key}.`,
  answerWas: 'The answer:',
  whyYours: 'Why your answer:',
  whyKey: 'Why the answer:',
  setSummary: (n: number): string => `${n} statements`,
} as const
