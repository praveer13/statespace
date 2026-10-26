// Where the scheduler game sits: in S5.L3, after "Be the scheduler", where the lesson asks the learner to choose which
// worker moves next and find a behavior that pays out more than the account holds.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S5.L3',
    afterSegment: 2,
    title: 'You are the scheduler',
    load: () => import('./Toy.tsx'),
  },
]
