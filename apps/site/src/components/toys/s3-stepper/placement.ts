// Where the stepper sits: in S3.L4, after "One step at a time", once the lesson has shown the five expression rules
// and the stuck theorem, so the learner can take the lesson's own calls through them and find both kinds of ending.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S3.L4',
    afterSegment: 2,
    title: 'Step it, one rule at a time',
    load: () => import('./Toy.tsx'),
  },
]
