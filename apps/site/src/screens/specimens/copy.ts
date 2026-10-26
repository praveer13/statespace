// What SCR-specimens says, in one place for review (DESIGN.md section 11: precise and unhurried, second person, present
// tense, no hype; no overdue counts, streaks or deadlines; learner states are words and never stamps; only the 25 glossary
// terms). A stamp is never written here: the labels draw theirs from @statespace/stamps (GATE-stamps).
//
// The word "drawer" is the glossary's (a short page of side material, D-01 to D-34), so the cabinet's grouping by stage is
// a heading and never a drawer in the words the learner reads.

export const COPY = {
  title: 'Specimens',
  lede: 'Counterexamples kept beside their fixes. Each label is read from the run that found it; the course writes only what a run cannot say.',
  draft: 'Draft: first-learner pass pending.',
  loading: 'Reading your practice record…',
  unavailable: 'This browser cannot keep a practice record (private browsing, or blocked storage), so the cabinet cannot tell which specimens you have mounted.',

  rail: 'Filters',
  filters: 'Show',
  chips: { all: 'All', mounted: 'Mounted', kept: 'Kept', incidents: 'Dated incidents' },
  stage: 'Stage',
  anyStage: 'All stages',
  about: 'About',
  anyIdea: 'Any idea',
  showAll: 'Show all',

  noneMet: 'No specimen is mounted yet. A lesson mounts one when you make its first call.',
  noMatch: 'No specimen matches these filters.',
  noneYet: 'none yet',
  /** A stage the learner holds specimens in, all of which the filters hide. */
  noneMatch: 'none match',

  schedule: {
    heading: 'Re-finds',
    intro: 'A specimen is kept when you find the same class again on a fresh variant, at least 7 days after you mounted it. A re-find comes up in Today.',
    none: 'No re-find is waiting.',
    from: (date: string): string => `From ${date}`,
    ready: 'ready now',
    more: (n: number): string => `${n} more, soonest first`,
  },

  item: {
    witness: 'Witness',
    answer: 'Raw answer',
    also: 'Also from the runs',
    replay: 'Replayed',
    lines: 'Lines from the runs',
    incident: 'Dated incident',
    toyModel: 'a toy model of the mechanism, never the incident\'s code',
    source: 'Source',
    ideas: 'Ideas',
    noStamp: 'No stamp',
  },

  fields: {
    violates: 'Violates',
    because: 'Because',
    minimal: 'Minimal?',
    class: 'Class',
    curedBy: 'Cured by',
    foundIn: 'Found in',
    status: 'Status',
    otherRuns: 'Also drawn from',
  },

  provenance: { sheet: 'Sheet', rev: 'Rev', drawn: 'Drawn', checkedBy: 'Checked by', none: '—' },

  status: {
    mounted: (day: string): string => `Mounted ${day}.`,
    waiting: (from: string): string => `Find the same class again on a fresh variant from ${from} to keep it.`,
    ready: 'A re-find is ready: find the same class again on a fresh variant to keep it.',
    readyLink: 'It comes up in Today',
    kept: (day: string): string => `Kept ${day}: you found the same class again on a fresh variant.`,
  },
} as const
