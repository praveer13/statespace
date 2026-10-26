// Where the stack stepper sits: in S9.L1, after "The proof, then the slip", once the learner has seen Lean stop in the
// plus case without `generalizing stk`, so they can watch which stack the second operand's code really starts on.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S9.L1',
    afterSegment: 2,
    title: 'Whose stack is it?',
    load: () => import('./Toy.tsx'),
  },
]
