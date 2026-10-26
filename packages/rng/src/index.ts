// The seeded RNG. A wrapper over the vendored kernelspace module (vendor/kernelspace/VENDOR.md, module rng):
// integer-only arithmetic, so one seed gives one sequence in every runtime (invariant I3).
//
// Re-exported from the vendored file:
//   splitmix32u, splitmix32, shuffledOrder, hash32
// Added here (src/draw.ts): exactly uniform integer draws, seed derivation and a draw stream for generators,
// pocket checkers and the Clearinghouse world. The determinism lint is a separate entry,
// `@statespace/rng/lint` (src/lint.ts), so this one stays free of the TypeScript compiler's types.
//
// Not re-exported on purpose:
//   freshSeed()   reads the entropy pool. The main origin draws a seed and records it before a run
//                 (ARCHITECTURE.md section 6.6); a pure package takes the seed as a parameter.
//   exportOrder() the Markdown export's option order for kernelspace's quiz keys; statespace's items
//                 define their own (W1).
export { hash32, shuffledOrder, splitmix32, splitmix32u } from '../../../vendor/kernelspace/src/lib/rng.ts'
export { createDraw, deriveSeed, fmix32, isUint32, SeededDraw, toUint32, UINT32_RANGE } from './draw.ts'
