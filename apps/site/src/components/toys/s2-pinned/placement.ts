// Where the game sits: in S2.L10, after "You state", once the learner has seen the idle transfer satisfy the four
// pinned theorems and `transfer_moves` rule it out, so they can try to fool the pins themselves.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S2.L10',
    afterSegment: 4,
    title: 'Fool the pinned statements',
    load: () => import('./Toy.tsx'),
  },
]
