# @statespace/interp: INS-interp

The course's reference interpreter for Mini-Plinth in TypeScript: a port, line for line, of the Lean reference
semantics (`labs/LAB-3/reference/MiniPlinthRef/`). It is pure (packages/README.md), so the tab, a worker and Node
run the same code.

| Module | What |
|---|---|
| `src/ir.ts` | IR@1 as TypeScript types (`schemas/ir.schema.json`), and canonical JSON |
| `src/semantics.ts` | the type checker (`typecheck`), the evaluator under a policy (`execWith`), and `execTraced`, which also names the step of the outcome order that decided a call; `inv` evaluates the invariant |
| `src/toy.ts` | the front end for the toy syntax, with type inference for untyped parameters and located errors |
| `src/program.ts` | the reference program, as toy syntax |
| `src/cell.ts` | the S3 lesson cells' text format (`start`, `policy`, calls, single operations, commands) |

GATE-interp is `node --test packages/interp/test/*.test.ts`: every golden of LAB-3's pool, evaluator and typing,
must give the kernel-checked right-hand side, and the reference program parsed from toy syntax must equal the
Lean export. The run is RUN-interp-goldens, which also prints each lesson cell's view and kernel-checks the pool.

Not here yet: the live engine on the instrument origin (INS-interp cells still show their recorded run), the
small-step trace view (S3.L4 cells cite RUN-lean-stuck and RUN-lean-bigsmall), and S3.L7 cell 1's rerun of each
call under both options of its decision.
