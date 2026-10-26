// Where the relation figure sits: in S7.L6, after "The observer and the relation", once the learner has met ~Acme and
// the three changes, so they can make worlds differ by hand and see which pairs count as tests for the view.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S7.L6',
    afterSegment: 2,
    title: 'Related under ~Acme, or not',
    load: () => import('./Toy.tsx'),
  },
]
