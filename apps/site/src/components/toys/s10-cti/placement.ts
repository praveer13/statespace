// Where the CTI explorer sits: in the demonstration (S10.L6), after "Witness, then decide", once the learner has met
// the hold-capture proposal, its satisfiable inductive step and the twin, so the grid lets them tell a counterexample to
// induction from a bug by hand.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S10.L6',
    afterSegment: 3,
    title: 'Counterexample to induction, or a bug?',
    load: () => import('./Toy.tsx'),
  },
]
