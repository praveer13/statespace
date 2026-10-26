# LAB-6, pg-refinement

**Status:** draft: first-learner pass pending.

You build the bridge between your model and PostgreSQL: a compiler from Transfer to a plan with exact expectations, typed errors, a differential harness with your own generator, specs for the anomalies, a retry policy, your own R(S, D), and a runtime that ties them together. The stage pages in the course say what each stage teaches; this file says where your work goes and how each stage is checked.

## Before you start

- **PostgreSQL.** The checks connect to the server that libpq's variables name: `PGHOST`, `PGPORT`, `PGUSER` and `PGPASSWORD` (or `STATESPACE_PG_DSN`). The devcontainer's service container sets them. The course pins PostgreSQL 18.6 (labs/TOOLS.md section 2.5) [X RUN-pg-claims#version], and LAB-6.1 reads the version back. Every check works in a scratch database it creates and drops, so your own databases are not touched. The user needs to create databases, and LAB-6.7's opposite-order fixture was recorded as a superuser.
- **psycopg.** `statespace isorun` and the checks drive PostgreSQL through psycopg 3. The repository's `pyproject.toml` pins it at the Bench's version (labs/TOOLS.md section 2.5) [X RUN-scaffold], so `uv run statespace check lab6.1` has it.
- **Rust.** Your code is the crate in `pgref/`. It has no dependencies, so `cargo build --release --offline` builds it, and `statespace check` builds it before it runs a stage (labs/TOOLS.md section 2.6).

## Where your work goes

Every file you write carries the by-hand marker; AGENTS.md lists them, and your coding agent is asked not to edit them.

| Stage | You write | Checked by |
|---|---|---|
| LAB-6.1 | the one permutation line in `histories/rmw.spec` | LAB-6.c1 |
| LAB-6.2 | `pgref/src/compile.rs`, and the constraints in `claims/schema.sql` | LAB-6.c2 |
| LAB-6.3 | `pgref/src/decision.rs`, and the self-transfer and typed refusals in `compile.rs` | LAB-6.c3 |
| LAB-6.4 | `pgref/src/gen.rs`: your generator and your comparison | LAB-6.c4 |
| LAB-6.5 | `specs/lost-update.spec`, `specs/write-skew.spec`, `specs/deadlock.spec`, `specs/conditional.spec` | LAB-6.c5 |
| LAB-6.6 | `pgref/src/retry.rs`: your classifier, its loop decisions and K | LAB-6.c6 |
| LAB-6.7 | `pgref/src/refine.rs` (alpha, wf, R) and `claims/refinement.yaml` | LAB-6.c7 |
| LAB-6.8 | `pgref/src/runtime.rs`, and the commit-time check of S6.L5 in `claims/schema.sql` | LAB-6.c8 |
| LAB-6.9 | `claims/cl-6-1.yaml` to `claims/cl-6-5.yaml` | LAB-6.c9 |

Run one stage with `uv run statespace check lab6.2` (or `statespace check lab6.2` inside the devcontainer). Each check prints `pass` or `FAIL`, its message, what it suspects, and the first divergence or witness it found; the last line names the receipt it wrote under `receipts/LAB-6.2/`. Import the receipt in the tab.

## What the course supplies

Each of these is a reference module, and earns nothing.

- `statespace isorun <spec>`: runs an isolationtester-format spec on your server, one connection per session, and sends the next step only when the previous one has finished or is seen waiting on a lock. It writes a history file beside the spec.
- `catalog/`: the four catalog rows LAB-6.5 compares with, each spec with the output isolationtester printed for it, and `rows.json`, the outcomes each row recorded at each isolation level (RUN-pg-catalog).
- `fixtures/attempts.txt`: LAB-6.6's attempt fixtures.
- `fixtures/manifest.yaml`, `fixtures/histories/` and `fixtures/specs/`: LAB-6.7's fixtures, each with the reference classification copied from RUN-serializability-fixtures.
- `pgref/src/model.rs` and `pgref/src/main.rs`: the plan and outcome types, and the glue the checks drive. Read `model.rs` first: it says how a plan runs, and in which order the reference interpreter decides a transfer.
- The abstract-serializability checker and the reference semantics, inside the command line (`statespace/history.py`).

## How the stages are graded

LAB-6.1, the Bench half of LAB-6.4, LAB-6.5, the LAB-6.6 loop and LAB-6.8 are *reported from your machine*. LAB-6.2, LAB-6.3, the tab half of LAB-6.4, the LAB-6.6 classifier and LAB-6.7 are *re-checked here* in the tab; `statespace check` also runs them on your machine's PostgreSQL, so you can iterate before you go to the tab, and its receipt says it ran on the Bench.

The checks draw their commands and seeds when they run, so a check you pass is not a fixed list of answers. A receipt reports what the tools said; it does not prove you ran it (labs/README.md section 8).
