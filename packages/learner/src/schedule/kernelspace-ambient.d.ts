// The vendored fsrs.ts imports its two types from kernelspace's '@/lib/learner/types' (vendor/kernelspace/VENDOR.md).
// This package's tsconfig maps that specifier to kernelspace-types.ts; a program that includes this package from
// elsewhere (the site) has no such mapping, so index.ts references this declaration to give the specifier the same
// two types there.
declare module '@/lib/learner/types' {
  export type { MemoryState, Rating } from './kernelspace-types.ts'
}
