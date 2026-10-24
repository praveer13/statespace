// The seeded RNG. A wrapper over the vendored kernelspace module (vendor/kernelspace/VENDOR.md, module rng):
// integer-only arithmetic, so one seed gives one sequence in every runtime (invariant I3).
//
// Not re-exported on purpose:
//   freshSeed()   reads the entropy pool. The main origin draws a seed and records it before a run
//                 (ARCHITECTURE.md section 6.6); a pure package takes the seed as a parameter.
//   exportOrder() the Markdown export's option order for kernelspace's quiz keys; statespace's items
//                 define their own (W1).
export { hash32, shuffledOrder, splitmix32, splitmix32u } from '../../../vendor/kernelspace/src/lib/rng.ts'
