// Where the witness game sits: in Boot (S1.L0), after "The pull request", once the learner has made the call and read
// Z3's witness, so the game lets them find one with their own hands.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S1.L0',
    afterSegment: 1,
    title: 'Get past the guard',
    load: () => import('./Toy.tsx'),
  },
]
