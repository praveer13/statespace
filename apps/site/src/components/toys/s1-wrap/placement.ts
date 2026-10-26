// Where the wrap game sits: in S1.L5, after "The total at 64 bits", once the learner has seen conservation hold modulo
// 2^64 and the recipient's credit wrap, so the game lets them push a sum past the largest value with their own hands.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S1.L5',
    afterSegment: 3,
    title: 'Past the largest value',
    load: () => import('./Toy.tsx'),
  },
]
