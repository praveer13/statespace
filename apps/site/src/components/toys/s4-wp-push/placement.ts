// Where the weakest-precondition push sits: in S4.L3, after "Rules for sequence, branch and guard", once the learner has
// read the four readings of a guard and called the Board's line 5, so they can push Inv back by hand and see where the
// assume reading and Mini-Plinth's reading part.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S4.L3',
    afterSegment: 1,
    title: 'Push Inv back through Transfer',
    load: () => import('./Toy.tsx'),
  },
]
