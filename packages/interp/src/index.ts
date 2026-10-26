// INS-interp: the course's reference interpreter for Mini-Plinth, in TypeScript. A port of the Lean reference
// (labs/LAB-3/reference/MiniPlinthRef) that GATE-interp holds to the kernel-checked goldens.
export * from './ir.ts'
export { covers, evalExpr, execTraced, execWith, inferTy, inv, post, typecheck } from './semantics.ts'
export type { DecidedAt, Env, Traced } from './semantics.ts'
export { ParseError, parseCommand, parseProgram } from './toy.ts'
export { REF_PROGRAM, REF_PROGRAM_TEXT } from './program.ts'
export { readNumber, runCell, showOutcome, showState } from './cell.ts'
export type { CellLine } from './cell.ts'
