/// <reference path="./kernelspace-ambient.d.ts" />
// The schedule: FSRS-6, pure and dependency-free. A wrapper over the vendored kernelspace module
// (vendor/kernelspace/VENDOR.md, module fsrs), whose formulas and rounding points were checked against
// ts-fsrs 5.4.2 to 1e-8 over 2000 replays. Do not change an operand order or a rounding point.
//
// statespace schedules at a target retention of 0.85 to 0.90 (spine section 4.1); callers pass it to
// intervalDays(), whose default is DEFAULT_RETENTION. On top of it: one card per KC with the dose floor (cards.ts),
// Today's plan (today.ts) and the weekly rhythm and Keep block (week.ts). README.md says how they fit.
export {
  DEFAULT_RETENTION,
  MAX_INTERVAL,
  W,
  intervalDays,
  nextMemory,
  retrievability,
} from '../../../../vendor/kernelspace/src/lib/learner/fsrs.ts'
export type { MemoryState, Rating } from './kernelspace-types.ts'
export * from './evidence.ts'
export * from './cards.ts'
export * from './today.ts'
export * from './week.ts'
