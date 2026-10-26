# LAB-9 · compiler, preservation proof and SQL validator

Compile a subset of Mini-Plinth into a small IR, prove that the compiler preserves what a client observes, and
validate generated SQL one command at a time. The stage text, the minutes and your calls are on the lab's page;
this file says where everything is and how to check a stage.

Run every command from the repository root, inside the devcontainer (labs/README.md section 4.2). Lean, cargo and
PostgreSQL are there.

```
uv run statespace check lab9          # every stage, in order
uv run statespace check lab9.5        # one stage
uv run statespace check               # the labs, stages and checks in this repository
```

Each stage writes a receipt under `receipts/LAB-9.<k>/`; import it on the lab's page.

## What is here

| Path | Who writes it | What |
|---|---|---|
| `challenge/Course/` | the course | the stack machine (`Stack.lean`), the source fragment and the IR's syntax (`Source.lean`), `runT` (`Run.lean`) and the simulation relation (`Sim.lean`) |
| `challenge/Challenge/` | the course | the pinned statements: packs S9A, S9IR and S9B, each theorem closed by `sorry` |
| `challenge/lab9-<k>.json` | the course | the comparator configuration of stage LAB-9.k |
| `S9/Defs.lean` | you | the IR's semantics (`step`), `compE`, the `move` and `require` clauses of `compile`, `InFragment` |
| `S9/Statement.lean` | you | `Obs`, `obs` and the matching relation `R` |
| `Solution/*.lean` | you | your proofs, one module per stage |
| `reference/tv.py`, `reference/cases/` | the course | the reference translation validator: a reference module, it earns nothing |
| `validator/` | you | your SQL validator in Rust; `src/plan.rs` and `src/main.rs` are the template's |
| `stage1/counterexample.txt` | you | LAB-9.1's store |
| `broken/hoist/`, `broken/stack/`, `fixed/` | you | the bad optimization and the weakened proof, kept beside the fix |
| `stage12/tcb.md` | you | the trusted base of your system |
| `proveit/mutants.yaml` | the course | the Prove-it mutations of your artifacts, for `statespace defend` |

The claim cards are `claims/cl-9-1.yaml` to `cl-9-3.yaml`, and their witnesses `specimens/lab9-*.json`.

## How a Lean stage is checked

`statespace check lab9.<k>` runs, in `labs/LAB-9/`: `lake build` of the challenge and your stage's module, then
`#print axioms` for each theorem the stage judges, then `lake comparator --config challenge/lab9-<k>.json`. The
comparator establishes that each named theorem of yours proves the pinned statement, over the same definitions,
with no axiom outside `propext`, `Quot.sound` and `Classical.choice`, and that Lean's kernel accepts it. A `sorry`
shows up as `sorryAx` and fails the check; a goal you park with `statespace stuck` is carried as [A] instead.

Lean's sandbox (bubblewrap) does not start in a default container. When it cannot start, the check judges nothing
and writes no receipt. Either use the opt-in profile of labs/README.md section 4.4, or decide to run without the
sandbox: `STATESPACE_SANDBOX=off uv run statespace check lab9.<k>`, and every receipt then records `sandbox: off`.

From LAB-9.3 on, the receipts pin `S9/Defs.lean`, and from LAB-9.4 on `S9/Statement.lean`: the course's
statements import them, so an edit after a receipt voids the claims that rest on it until you check again.

Manual mode: in the proof stages, close the step being taught without `omega` or `grind`. `Course/Source.lean`
supplies the register-index lemmas (`upd_same`, `upd_other`, `reg_ne_of_lt`, `reg_lt_succ_of_lt`, ...) for that.
The receipt records what it finds in your module; a flagged proof still passes.

## The stages

**LAB-9.1 · Run the reference validator** (2 minutes). Call it first on the lab's page, then run

```
uv run python -I labs/LAB-9/reference/tv.py validate labs/LAB-9/reference/cases/transfer-30-1-2.tv
uv run python -I labs/LAB-9/reference/tv.py validate labs/LAB-9/reference/cases/transfer-30-1-2.reuse.tv
```

and copy the counterexample store of the second into `stage1/counterexample.txt`. The check runs both again and
replays your store through its own copies of both semantics.

**LAB-9.2 · The stack machine** (45 minutes, weekend). Prove `exec_append` and `exec_comp` in `Solution/S9A.lean`.

**LAB-9.3 · The IR and the compiler** (25 minutes). Write `step`, `compE`, the `move` and `require` clauses and
`InFragment` in `S9/Defs.lean`; then prove the goldens of `Challenge/S9IR.lean` (each by `decide`) and
`exec_deterministic` in `Solution/S9IR.lean`. The check also runs each golden by `decide` on its own, and lints
`S9/Defs.lean` for `native_decide`, `implemented_by`, `extern`, `partial` and `unsafe`.

**LAB-9.4 · Observations and the matching relation** (25 minutes). Write `Obs`, `obs` and `R` in
`S9/Statement.lean`, and prove the five adequacy theorems in `Solution/Adequacy.lean`.

**LAB-9.5 to LAB-9.10 · Preservation, case by case** (45 minutes each, weekend). One module per stage:
`Expr` (`compE_correct`), `Move` (`move_sim`; this mints CL-9.2 as "PROVED modulo the remaining pinned lemmas"),
`Require` (`require_sim`), `Seq` (`exec_append`, `seq_commit`), `Abort` (`seq_abort`, `abort_sim`, `skip_sim`) and
`Assembled` (`seq_sim`, `compile_correct`, `compile_complete`, `preservation`). Splitting compiled code needs an
append law before LAB-9.8 pins one; prove a helper of your own where you first need it.

**LAB-9.11 · A SQL validator** (25 minutes). Write `validate` in `validator/src/validator.rs`. The check builds
your crate with `cargo build --release`, draws a suite of plans (honest ones and wrong ones, the shape-only mutant
among them, each with its parameters renamed at random), runs your validator on it, and replays every rejection's
instance on PostgreSQL (the plan) and in the course's interpreter (the source command). It needs the
devcontainer's PostgreSQL service (`STATESPACE_PG_DSN`) and psycopg, which the repository's `pyproject.toml` pins at
the Bench's version [X RUN-scaffold]; when psycopg is missing, the check writes no receipt and says so. The input and output formats are at the top of
`src/plan.rs` and `src/main.rs`. The tab's version of this check, with your crate built as wasm (drawer D-14), is not
built yet; this one runs on your machine.

**LAB-9.12 · The bad optimization, the trusted base, the cards** (20 minutes). Keep the hoisted compile in
`broken/hoist/Hoist.lean` with its two goldens, write `fixed/hoist.md`, give every component in `stage12/tcb.md`
a status, keep your weakened stack-machine proof in `broken/stack/Narrow.lean`, fill the witnesses in
`specimens/lab9-*.json`, and fill the three cards in `claims/`.

## Before a hint: the teach-back (R0)

Before the hint ladder on the lab's page, write in at least 12 words what the failing check verifies, then compare
with the three ideas below and tick the ones you covered. Nothing grades it.

| Check | Three ideas |
|---|---|
| LAB-9.c1 | a validator checks one output, not the compiler · its acceptance holds within the printed bound only · a rejection is a store that both semantics replay as different observations |
| LAB-9.c2 | the plus case runs the second operand's code on a taller stack · the induction must generalize the stack · `exec_append` splits compiled code |
| LAB-9.c3 | the amount is evaluated once, before the first write · the credit reads the debited store · an abort discards every write of the run |
| LAB-9.c4 | an observer must tell an abort from a commit · and one error from another · `R` must imply equal observations |
| LAB-9.c5 | the value lands in the target register · the store is untouched · registers below the target keep their values (the frame) |
| LAB-9.c6 | `R` forgets registers · a posting is two writes · the amount register survives both reads |
| LAB-9.c7 | the guard compares registers 0 and 1 · the frame keeps register 0 while register 1 is computed · a failing guard aborts with the source's error |
| LAB-9.c8 | the second command starts from the registers and store the first left · the append law splits the run · the first simulation gives the related state |
| LAB-9.c9 | an abort short-circuits the append law · the second command's code never runs · no hypothesis about the second command is needed |
| LAB-9.c10 | induction on the command assembles the cases · `R_init` starts the diagram and `R_obs` ends it · `compile_complete` keeps the theorem from holding vacuously |
| LAB-9.c11 | compare outcome classes, not statement shapes · every rejection must replay on the database and in the interpreter · every verdict states its bound or n |
| LAB-9.c12 | the hoisted debit makes the guard test the debited balance · its class is `amt ≤ bal < 2·amt` · every component of the system has a status |
