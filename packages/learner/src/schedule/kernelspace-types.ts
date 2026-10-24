// The two types the vendored fsrs.ts imports from kernelspace's learner types as '@/lib/learner/types'
// (vendor/kernelspace/src/lib/learner/fsrs.ts, line 12). That module also holds kernelspace's cards, tickets
// and ledger types, which statespace does not inherit, so tsconfig.json maps the specifier to this file, which
// restates the two definitions from kernelspace (src/lib/learner/types.ts at the pinned commit).

/** FSRS grade: Again, Hard, Good, Easy. */
export type Rating = 1 | 2 | 3 | 4

/** FSRS-6 memory state. `stability` in days (the interval at which R = 0.9), `difficulty` in [1, 10]. */
export interface MemoryState {
  stability: number
  difficulty: number
}
