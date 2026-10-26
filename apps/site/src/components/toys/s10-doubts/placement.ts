// Where the doubt-log game sits: in Publish (S10.L7), after "Doubts as m of n", once the learner has read rules D1 to
// D9 and CL-1.1's log before and after the cvc5 cross-check, so the game lets them apply the rules with their own hands.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S10.L7',
    afterSegment: 3,
    title: 'Keep the doubt log',
    load: () => import('./Toy.tsx'),
  },
]
