// Where the poller game sits: in "Every crash window" (S8.L3), after "A poller and a late commit", once the learner has
// called the late commit, so that they can strand a row themselves and then watch the status design refuse to.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S8.L3',
    afterSegment: 4,
    title: 'Strand a row below the mark',
    load: () => import('./Toy.tsx'),
  },
]
