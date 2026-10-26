// Where the decision panel sits: in S3.L7, after "Four edge cases, four decisions", once the lesson has set out the
// four Policy fields and the fixed order, so the learner can switch each option and watch which of the lesson's calls
// move.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S3.L7',
    afterSegment: 2,
    title: 'Switch a decision, watch the calls move',
    load: () => import('./Toy.tsx'),
  },
]
