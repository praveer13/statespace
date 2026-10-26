// The framework's own learner-facing sentences, kept in one place for review (DESIGN.md section 11). They say
// "matched" and "missed", never "correct" or "wrong"; an ungraded answer counts neither way; a verdict names
// what it rests on; and they use no glossary term beyond those Boot introduces (spine section 0, OD-14), so
// they read the same wherever a generated item appears. Families write their own stems, options and whys.
//
// Pure: no DOM, storage or network.

export const COPY = {
  matched: 'Your answer matched.',
  missed: 'Your answer missed.',
  notGraded: 'Not graded.',
  /** Layer 1 after a miss on a choice: the witness tells the two options apart. */
  told: (chosen: string, answer: string): string => `The witness below tells option ${chosen} from option ${answer}.`,
  /** Layer 1 after a miss on a true/false set. */
  statementsMissed: (wrong: readonly string[]): string =>
    wrong.length === 1 ? `Statement ${wrong[0]} missed; a set counts only when every statement matches.` : `Statements ${wrong.join(', ')} missed; a set counts only when every statement matches.`,
  ungradedUnknown: 'Not graded: the checker returned unknown, so this answer counts neither way.',
  ungradedBudget: 'Not graded: the checker stopped at its budget before a verdict, so this answer counts neither way.',
  outsideLanguage: (summary: string): string => `Not graded: this answer is outside the item's language (${summary}).`,
  /** The placeholder for an empty field (DESIGN.md section 6.1: an empty field shows a dash, never a guess). */
  none: '—',
  /** M-class-hint's prompt in the contrast arm; ungraded, and it writes no evidence. */
  comparePrompt: 'Here is a second witness of the same kind. What do the two share?',
} as const
