// Where the reachability game sits: in S4.L6, after "Two models, one failing step", once the learner has called the twin
// and read that the search separates the two models, so they can try to reach the step query's pre-state by hand.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S4.L6',
    afterSegment: 2,
    title: 'Reach the counterexample',
    load: () => import('./Toy.tsx'),
  },
]
