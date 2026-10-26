// Where the pair game sits: in S7.L5, after "Two runs, one difference", once the learner has seen the monitor pass on
// both runs and frank's responses still differ, so the game lets them find such a pair, and see the fix leave none.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S7.L5',
    afterSegment: 2,
    title: "Tell frank's two worlds apart",
    load: () => import('./Toy.tsx'),
  },
]
