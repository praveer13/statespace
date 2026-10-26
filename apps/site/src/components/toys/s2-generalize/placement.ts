// Where the stepper sits: in S2.L7, after "Without generalizing", once the learner has read the proof with
// `generalizing s` and watched the same induction stop without it, so the two can be stepped side by side.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S2.L7',
    afterSegment: 3,
    title: 'Which state does ih talk about?',
    load: () => import('./Toy.tsx'),
  },
]
