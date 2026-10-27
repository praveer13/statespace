# LAB-6 · pg-refinement; capstone S10.L4.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-6](../../labs/LAB-6). The repository: [LAB-6.zip](../../labs/LAB-6.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S6

Build the bridge between your model and PostgreSQL: a compiler from Transfer to a plan with exact expectations, typed errors, a differential harness with your own generator, specs for the anomalies, a retry policy, your own R(S, D), and a runtime that ties them together. The template supplies `statespace isorun`, the catalog specs with their recorded outputs, the checker for abstract serializability, the reference interpreter, the plan and outcome types, the attempt-log fixtures, the fixture manifest and the mutation operators. You write the schema, the compiler, the typed-error map, the generator and comparison, the isolationtester-format specs, the retry classifier and loop, alpha, wf and R, the runtime and the claim cards. LAB-6 has no proof stage. Its statements are pinned instead: the refinement file, the schema file, the catalog specs and the fixture manifest are hashed on your receipt, and a changed hash voids the claim that depends on it.

## Stages

### LAB-6.1 · `statespace isorun` replays the provided read-modify-write history on PostgreSQL 18.6

*about 2 min*

Run `statespace doctor`, then replay the provided read-modify-write history with `statespace isorun` against a real PostgreSQL server. Predict first, then read the receipt. This stage is reported from your machine.

- **LAB-6.c1** · The recorded history replays as recorded.
  Passes when: The server version your receipt reads back begins with PostgreSQL 18.6. Session B blocks and then commits, and the history spends 160 from a balance of 100, as recorded (run RUN-pg-claims).

### LAB-6.2 · Compiler: Transfer → SQL with rowcount guards (Lane A on PGlite)

*about 25 min*

Compile Transfer into a plan on PGlite in which every UPDATE expects exactly one row and every zero becomes a named outcome. The schema says `NOT NULL CHECK (bal >= 0)`. This stage is re-checked here.

- **LAB-6.c2** · Your plan's outcomes equal the reference's.
  Passes when: On a sample drawn when the check runs (at least 200 commands, with at least 10 percent guard refusals, 5 percent missing `from` and 5 percent missing `to`), every outcome class on PGlite equals the reference interpreter's, and every committed command leaves a database state that alpha maps to the reference's new state. The first divergence prints its seed.

### LAB-6.3 · Typed errors; the self-transfer decision in SQL

*about 25 min*

Give your typed errors their own outcomes and put your self-transfer decision into the SQL. This stage is re-checked here.

- **LAB-6.c3** · Typed errors are distinct, and the self-transfer follows your decision.
  Passes when: Fresh self-transfers return the outcome your decision record names and leave alpha(D) unchanged. `Insufficient`, `NoSuchAccount(from)` and `NoSuchAccount(to)` are distinct on fresh seeds. The course's case-merge mutation of your plan (SP-6.7) fails on a fresh self-transfer seed, because your declared expectations reject the merged statement's single row.

### LAB-6.4 · Differential harness: your generator and outcome classes

*about 25 min*

Write a differential harness with your own generator, outcome classes and statistics, and run it on PGlite in the tab and on PostgreSQL on the Bench. The tab half is re-checked here and the Bench half is reported from your machine.

- **LAB-6.c4** · Your suite runs on both engines and catches the course's mutants.
  Passes when: The suite runs on PostgreSQL on the Bench and on PGlite in the tab. The receipt names both engines and their versions, n, and the statistics: the share of each outcome class, the self-transfer share and the largest balance. With your own generator and comparison it kills the three course mutants: a CHECK-only guard, an unchecked credit and the case-merge.

### LAB-6.5 · Reproduce the lost update, write skew and 40P01 with `isorun`

*about 25 min*

Write isolationtester-format specs for the lost update, write skew, a deadlock and the conditional-UPDATE twin, and run them with `statespace isorun`. This stage is reported from your machine.

- **LAB-6.c5** · Each spec reproduces the matching catalog row.
  Passes when: Every permutation of each of your specs, at the stated isolation level, yields the commit, abort and SQLSTATE classes of the matching catalog row's recorded output ((run RUN-pg-claims) for the rows it holds, (run RUN-pg-catalog) for the rest). Your spec hashes are on the receipt.

### LAB-6.6 · Retry policy for 40001 and 40P01 with attempt logs

*about 25 min*

Write a retry policy for serialization failures and deadlocks, with attempt logs. The classifier is re-checked here, and the loop against a real server is reported from your machine.

- **LAB-6.c6** · The classifier retries the right failures and stops.
  Passes when: On the attempt fixtures your classifier re-runs the command from BEGIN on `serialization_failure` and `deadlock_detected`, never retries `numeric_value_out_of_range` or a typed refusal, and retries `unique_violation` or `exclusion_violation` only for a command your declared policy marks as re-reading the key before it writes, never by re-sending a blind insert (run RUN-pg-catalog). It stops at your declared k with `GaveUp`, and the Bench log records each attempt's SQLSTATE.

### LAB-6.7 · Your R(S, D) with the abstract-serializability check on recorded histories

*about 25 min*

Write alpha, wf and R, and run the abstract-serializability check over recorded histories. This stage is re-checked here.

- **LAB-6.c7** · Your R classifies the fixtures as the reference does.
  Passes when: With your alpha and wf, the checker classifies every fixture in the pinned manifest as the reference does (accept or reject, and for an accept an order the replay confirms) and rejects the two R-mutant fixtures (run RUN-serializability-fixtures).

### LAB-6.8 · Capstone S10.L4: a transaction runtime wired to your compiler

*about 25 min*

Wire a transaction runtime to your compiler: one connection per session, the isolation level asserted per transaction, your retry loop, and the commit-time check from S6.L5 in the schema. This is the capstone for S10 and is reported from your machine.

- **LAB-6.c8** · The runtime passes your suite and its histories are accepted.
  Passes when: On PostgreSQL on the Bench the LAB-6.4 suite passes through the runtime with no outcome-class divergence, and every session reads back `serializable`. A concurrent run of compiled commands driven by `statespace isorun` yields histories your LAB-6.7 checker accepts. Attempts are logged by SQLSTATE, and the receipt names the deferred triggers that re-stamp CL-6.4.

### LAB-6.9 · Claim cards and their [A] clauses (write stage)

*about 15 min*

Write the claim cards for CL-6.1 to CL-6.5 and their ASSUMED [A] clauses. This is a write stage with no run.

- **LAB-6.c9** · Your claim cards pass validation.
  Passes when: CL-6.1 to CL-6.5 pass claim@1 validation: six fields, an "if weakened" witness that refutes the card's own proposition, and matching statement hashes.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `rmw-compile` on undefined: The debit becomes a SELECT followed by an UPDATE to a constant, which splits the atomic action.
- `drop-credit-check` on undefined: Commands with a missing `to` commit the debit.
- `retry-40001-only` on undefined: Only one failure code is retried.
- `rc-pool` on undefined: Sessions default to READ COMMITTED.
- `strict-guard` on undefined: The guard is `bal > $amt`.
- `r-totals-only` on undefined: R compares totals only.

## Runs cited

- RUN-pg-anomalies (postgres 18.6)
- RUN-pg-catalog (postgres 18.6)
- RUN-pg-claims (postgres 18.6)
- RUN-serializability-fixtures (postgresql 18.6)
