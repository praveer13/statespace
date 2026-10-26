// Where the scheduler game sits: in S6.L6, after "Opposite directions", once all four compilations and their recorded
// histories have been met, and just before the exit table that sums them up. The game lets the learner build the
// interleavings with their own hands and watch the compilation and the level decide the verdict.

import type { ToyPlacement } from '../index.ts'

export const placements: ToyPlacement[] = [
  {
    lesson: 'S6.L6',
    afterSegment: 4,
    title: 'You are the scheduler',
    load: () => import('./Toy.tsx'),
  },
]
