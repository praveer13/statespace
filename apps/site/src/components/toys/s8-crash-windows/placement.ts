// Where the crash-window explorer sits: in "Every crash window" (S8.L3), after "Place the crash", once the learner has
// read CW1 worked through and called CW2, so that they can fill the rest of the table with their own hands.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S8.L3',
    afterSegment: 2,
    title: 'Place the crash yourself',
    load: () => import('./Toy.tsx'),
  },
]
