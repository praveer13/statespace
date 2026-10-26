// Where the square runner sits: in S9.L7, after "From the stuck goal to the class", once the learner has met the
// hoisted debit's witness, its class and the sound rewrite, so they can run all of it from starts of their own.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S9.L7',
    afterSegment: 2,
    title: 'Close the square, or break it',
    load: () => import('./Toy.tsx'),
  },
]
