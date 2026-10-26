# LAB-8 · effects-sim; capstone S10.L5.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-8](../../labs/LAB-8). The repository: [LAB-8.zip](../../labs/LAB-8.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S8

The effects lab. You write the outbox spec, the worker as a sans-I/O machine, the fault plan, the reply handler and the trace mapping, and you check each against the others. The template supplies the simulator, `statespace trace validate`, the trace schema and a harness for the clock, the provider, the network and the disk. It pins the spec's interface, the property files, each check's configuration and the trace-validation module, so a weakened statement voids your claim to UNKNOWN [?]. LAB-8.4 and LAB-8.5 are checked in your tab and show the badge re-checked here. The other stages run on your machine and show reported from your machine. Once your machine passes LAB-8.4, it plugs into the Clearinghouse's provider, which sends duplicate replies, outages and late replies.

## The explanation gate

Before the first hint on any check, you write at least 12 words on the failing check, the property it protects and your hypothesis. It is compared with three authored ideas, self-assessed, and never credited. A check passed after the second hint counts as assisted until an unseen variant passes: other constants or another fault schedule, drawn when it is graded.

Ask for it before you give any hint on a failing check.

## Stages

### LAB-8.1 · Run the reference simulator on seed 1; see its NDJSON trace accepted by TLC

*about 2 min*

Run the reference simulator on seed 1, then watch TLC accept the NDJSON trace it wrote. This is the quick first win.

- **LAB-8.c1** · The reference trace for seed 1 is accepted.
  Passes when: The receipt's verdict line reads "accepted" for `traces/seed-1.ndjson` (run RUN-tlc-trace-validation). The trace's SHA-256 equals the recorded seed-1 hash (run RUN-sim-determinism), and the jar's SHA-256 equals the pin (run RUN-tlc-jars).

### LAB-8.2 · The outbox spec with crash, duplicate and delay actions; safety

*about 25 min*

Write the outbox spec with crash, duplicate and delay actions, then check its safety. The variant whose provider ignores keys must double-charge, and the full design must not.

- **LAB-8.c2** · The unsafe variant double-charges, and the full design passes all three invariants.
  Passes when: With `Dedup = FALSE` and `CrashWindows = {"CW3"}`, `NoDoubleCharge` is violated by a trace with a Crash between Accept and Persist. On the full design, `NoLostIntent`, `AckedIsDurable` and `NoDoubleCharge` pass: no error, the exploration complete, the constants printed. The pinned file hashes match (run RUN-tlc-outbox-safety).

### LAB-8.3 · Liveness under stated fairness and recovery: "every committed command's effect is eventually dispatched" and "every command is eventually acknowledged" (the roadmap's "which progress guarantees require eventual service recovery")

*about 25 min*

State which fairness and which recovery each progress property needs, and check both properties under them. Take recovery away and read the lasso that comes back.

- **LAB-8.c3** · Both properties hold under the stated assumptions, and a lasso appears without recovery.
  Passes when: Both properties hold under the stated fairness, with `MaxCrashes` finite. Without fair Recover, TLC returns a lasso that the lasso checker accepts. `claims/progress.yaml`, your table of what each property needs, matches TLC on every configuration that drops one assumption. The receipt lists the fairness conjuncts and the crash budget (run RUN-tlc-recovery).

### LAB-8.4 · A sans-I/O outbox machine under seeded faults (Lane A)

*about 25 min*

Write a sans-I/O outbox machine and test it under seeded faults, in your tab. Recovery acts on what is durable, and every output comes from the inputs alone.

- **LAB-8.c4** · The machine keeps its safety properties on fresh fault schedules.
  Passes when: On n schedules drawn at grade time (n, the step cap and the fault rate are printed), with a deduplicating provider, your machine allows no double charge and no lost intent, acknowledges only what it has stored, and writes identical traces for a seed run twice. The systematic mode, which crashes it in each of CW1 to CW4, passes too. A failure prints its seed and its first violating step.

### LAB-8.5 · Inbound keys (`ON CONFLICT` with `uuidv7()` (run RUN-pglite-inbound-key)) and reply validation

*about 25 min*

Write the inbound-key table and the reply validation on PGlite, with the key minted by `uuidv7()` (run RUN-pglite-inbound-key). Duplicate, late and invalid replies are rejected as specified.

- **LAB-8.c5** · At most one capture per intent, and bad replies rejected.
  Passes when: On fresh reply sequences (duplicates, reorderings, late, over-cost, invalid and unknown-key replies) on PGlite, there is at most one capture per intent, through the key row and the rowcount guard. Late and invalid replies are rejected, and the late one is reconciled. A re-run after a dropped COMMIT reports "already applied". The recorded same-key race (row H12a (run RUN-pg-catalog)) is handled by the retry policy of LAB-6.6 (run RUN-pglite-inbound-key).

### LAB-8.6 · NDJSON traces validated by TLC over n seeds

*about 25 min*

Write one trace disjunct for each worker event, and validate your machine's NDJSON traces against your spec over n seeds. The seeded ack-before-store mutant must be rejected, with its first non-conforming line named.

- **LAB-8.c6** · Traces over n seeds are accepted, and the mutant is rejected.
  Passes when: The traces of n seeds are accepted, with n at least the minimum and the seed list hashed. The seeded ack-before-store mutant is rejected, and its first non-conforming line is named. The schema lint requires the End record and each event's fields, the ones your trace disjunct constrains (run RUN-tlc-trace-validation). The stamp is TESTED [T] · n seeds.

### LAB-8.7 · Capstone S10.L5: the differential plus simulation suite; failures become specimens

*about 25 min*

The capstone for your whole system. Run the differential and simulation suite, and turn each failure into a specimen that replays from its seed.

- **LAB-8.c7** · Seeds are recorded, and every failure is mounted as a specimen.
  Passes when: The receipt records the differential and fault seeds. A planted failure mounts as a specimen, labeled from its run, and replays from its seed, as does every other failure.

### LAB-8.8 · Claim cards with the provider horizon (write stage)

*about 15 min*

Write the claim cards for CL-8.1 to CL-8.5, with the provider's idempotency and its horizon stated as assumptions. This is a write stage.

- **LAB-8.c8** · The five claim cards are complete, and the horizon is stated.
  Passes when: CL-8.1 to CL-8.5 pass claim@1 validation. CL-8.2 carries both assumption clauses: the provider's idempotency, and the horizon with its provider, API version, retention and date read. Each "if weakened" witness refutes its own proposition.

### LAB-8.9 · `[stretch]` the key TTL and replayed 500s in the spec

*about 25 min · stretch*

Optional. Add the provider's key TTL and replayed 500 responses to your spec, and see which of your claims survive.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `undefined` on LAB-8.2: undefined
- `undefined` on LAB-8.2: undefined
- `undefined` on LAB-8.3: undefined
- `undefined` on LAB-8.3: undefined
- `undefined` on LAB-8.4: undefined
- `undefined` on LAB-8.4: undefined
- `undefined` on LAB-8.5: undefined
- `undefined` on LAB-8.6: undefined

## Runs cited

- RUN-pg-catalog (postgres 18.6)
- RUN-pglite-inbound-key (PGlite 0.5.11)
- RUN-sim-determinism (statespace-sim statespace sim (bench/statespace/sim.py at the input's SHA-256))
- RUN-tlc-jars (tlc 2026.10.20.183001)
- RUN-tlc-outbox-safety (tlc 2026.10.20.183001)
- RUN-tlc-recovery (tlc 2026.10.20.183001)
- RUN-tlc-trace-validation (tlc 2026.10.20.183001)
