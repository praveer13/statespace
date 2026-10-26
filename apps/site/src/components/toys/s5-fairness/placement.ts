// Where the fairness game sits: in S5.L7, after "Weak or strong", once the learner has read the retry lasso against
// weak and strong fairness, so the game lets them write Fair lines and watch which lassos survive.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S5.L7',
    afterSegment: 2,
    title: 'Whose promise ends the cycle',
    load: () => import('./Toy.tsx'),
  },
]
