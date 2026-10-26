// Where the serial-order game sits: in S6.L8, after "Two orders for one history", once the learner has met the
// serial-order search on the lost update and on the report that commits last. The game hands them the lesson's
// histories and lets them try the orders themselves before the checker answers.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S6.L8',
    afterSegment: 4,
    title: 'Find a serial order',
    load: () => import('./Toy.tsx'),
  },
]
