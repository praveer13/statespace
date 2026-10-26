# LAB-10 · Core assembly

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-10](../../labs/LAB-10). The repository: [LAB-10.zip](../../labs/LAB-10.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S10

Assemble your Core and use it. You wire the parts you built in Stages 3, 4, 6 and 8 into one pipeline and re-run each part's gate. Then you take an agent's proposal through it: parse it, triage it, exhibit the violation or prove the restricted obligation, run the corrected command on PostgreSQL with systematic tests, and record the demonstration end to end. Last, you export a report from your claim graph and publish a bundle that anyone can re-run. Agent proposals come from a mutation generator, and a seeded share of them is sound. No language model grades anything.

## The explanation gate

Before the first hint on any check, you write at least 12 words on the failing check, the property it protects and your hypothesis. It is compared with authored ideas, self-assessed, and never credited. A check passed with help past the second hint counts as assisted until an unseen variant passes without help.

Ask for it before you give any hint on a failing check.

## Stages

### LAB-10.1 · Run the reference pipeline on the provided agent proposal

*about 2 min*

Run the reference pipeline on the provided agent proposal, and read the report skeleton it writes.

- **LAB-10.c1** · The skeleton reproduces the recorded one
  Passes when: `statespace demo` runs the reference parser, typechecker, checker, interpreter, compiler and runtime on PostgreSQL, and writes a report skeleton whose section list, verdict lines and statement hashes equal (run RUN-core-demo). The provided proposal is `command TransferWithFee(from, to, amount, fee)` with `requires balance(from) >= amount` and `do move amount from from to to; move fee from from to sink`, and its claim is "never overdraws; conserves; 200 tests green". The guard leaves out the fee, and the expected verdicts are recorded in the same run.

### LAB-10.2 · Wire your parser, checker and interpreter

*about 25 min*

Wire your parser, typechecker, checker and interpreter into one pipeline, after you re-run the gate of each.

- **LAB-10.c2** · Your pipeline agrees with the fixtures end to end
  Passes when: On the fixture corpus and on seeds drawn when the gate runs, your pipeline in the tab (a) emits IR equal to the Lean export on every golden, valid under `IR@1`; (b) agrees with the typing goldens; (c) returns the reference checker's verdict class on every fixture obligation; (d) replays every REFUTED [R] witness in your interpreter and in the tab's interpreter; and (e) shows no PROVED [P] without a satisfiable premise witness. The number of samples is printed.

### LAB-10.3 · Wire your compiler, runtime and simulator

*about 25 min*

Wire your compiler, runtime and simulator behind the pipeline, and run the fixtures through PostgreSQL.

- **LAB-10.c3** · The same fixtures pass through PostgreSQL
  Passes when: Every fixture's outcome class on PostgreSQL (success, zero rows mapped to a typed error, or an SQLSTATE) equals the interpreter's, and R(S, D) holds after each commit. The attempt log groups retries by SQLSTATE and never retries 22003. `transaction_isolation` reads back `serializable`. Simulator seed 1 yields an NDJSON trace that `statespace trace validate` accepts. No wired component is a reference module: the Core is the one you built.

### LAB-10.4 · Intake a mutation-generated agent proposal

*about 25 min*

Draw an unseen agent proposal and take it in: parse it, record your typechecker's verdict, store its claim as quoted text with no stamp, and name a checker for each part of the claim.

- **LAB-10.c4** · The proposal parses, and its claim is quoted text
  Passes when: `statespace proposal draw` returns an unseen proposal for a seed drawn when the gate runs. Your parser parses it, and your typechecker's verdict is recorded; a typed rejection is a valid outcome of triage. The claim is stored in `claims/` as quoted, unreviewed text with no stamp. Your triage plan names a checker for each part of the claim. The plan is not credited.

### LAB-10.5 · Exhibit the violation, or prove the restricted obligation

*about 25 min*

Exhibit the violation with a witness that replays, or prove the restricted obligation with its premise witness.

- **LAB-10.c5** · The witness replays, or the fragment is proved with a premise witness
  Passes when: Your verdict matches the reference key. For a flawed proposal, the decoded witness replays in your interpreter and in the tab's interpreter against the named invariant, is minimized (under an Optimize objective where it is numeric), has its class named, and is mounted as a specimen with its label. For a sound proposal, every obligation is `unsat` for the stated fragment, a premise witness is `sat`, and cvc5 agrees on every `unsat`. A disagreement with the reference opens a doubt against both sides. It passes only if your witness replays in the tab's interpreter, which makes the reference wrong and files an erratum.

### LAB-10.6 · Run the corrected command on PostgreSQL 18.6 with systematic tests

*about 25 min*

Run the corrected command on PostgreSQL with systematic tests: the differential suite and the simulation suite.

- **LAB-10.c6** · Both suites pass, and the fix kills a non-minimal witness
  Passes when: The corrected command, or the accepted proposal, compiled by your compiler and run by your runtime, passes the differential suite (outcome classes and R(S, D) against the interpreter) and the simulation suite (traces that TLC accepts). The receipt prints n, the seeds and the generator statistics, with n at least the floors of LAB-6.c4 and LAB-8.c6. The fix also kills a non-minimal witness of the specimen's class.

### LAB-10.7 · Record the demonstration end to end

*about 25 min*

Record the demonstration end to end, as a bundle that can be replayed.

- **LAB-10.c7** · The recording cites every artifact by run id and every statement by hash
  Passes when: `statespace demo record` writes `demo/` with the proposal and its hash, the triage plan, the checker and replay receipts (or the premise-witness receipt), the fix diff, the re-check, the PostgreSQL and simulation receipts, and CL-10.1, citing every artifact by run id and every statement by hash. `statespace check demo/` replays the witness and checks every hash. It is a replayable bundle, not a video.

### LAB-10.8 · Export the report from the claim graph (a multi-pass write stage: nine passes, each within a weekday or weekend window [D])

*about 325 min*

Export the report from your claim graph, in nine passes. Each pass fits a weekday window of about 25 minutes or a weekend window of about 45, and ends with a result from `statespace export --section`. Pass 1 exports the skeleton and re-checks every receipt marked stale or touched by an advisory. Pass 2 is PROVED, with the theorem statements and their hashes. Pass 3 is MODEL-CHECKED and TESTED, each with its bound or n and its generator statistics. Pass 4 is ENFORCED and CONFIGURED: you mint CONFIGURED claims from read-backs of `transaction_isolation`, the server version and the row-security settings. Pass 5 is the doubt hunt, with the checklist run over each group of claims, their statuses and their m|n. Pass 6 is ASSUMED, NOT COVERED and the erosion log. Pass 7 is the demonstration, the specimens and the agent incident ledger. Pass 8 is the operational semantics, the edge-case decisions and the known limitations. Pass 9 is "What this report establishes and what it does not", written last, and the validator. If a pass runs past its window, stop at the next section boundary and write what is missing as a dated NOT COVERED line.

- **LAB-10.c8** · The report validates, and the rules hold
  Passes when: The report validates under `report@1`, with sections for PROVED, MODEL-CHECKED, TESTED, ENFORCED, CONFIGURED, ASSUMED and NOT COVERED, plus UNKNOWN and the specimens, a checker matrix, statement hashes, budgets and advisories, and a doubt log as m|n. `statespace check report/` confirms rules T1 to T12 and re-derives every stamp from its receipt.

### LAB-10.9 · Publish the bundle (write stage)

*about 25 min*

Publish the bundle. Where to publish is your choice, and the check runs on the local bundle.

- **LAB-10.c9** · Every link and every hash in the bundle resolves
  Passes when: `statespace check bundle/` finds every link resolving, every statement hash matching (the text with trailing whitespace removed, plus one newline), every receipt re-verifiable, the privacy check clean (no private paths, secrets or identifiers you did not choose to publish, and nothing from your private overlay), a license and reproduction instructions present, and the bundle building from a clean clone in the devcontainer.

### LAB-10.10 · `[stretch]` a public upstream counterexample: an issue or PR plus a witness any browser replays

*about 25 min · stretch*

Stretch: find a counterexample in a public project, and report it as an issue or a pull request with a witness that any browser can replay.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `skip-premise-witness` on undefined: The checker skips the premise-witness query.
- `drop-rowcount-check` on undefined: The compiler drops the rowcount check.
- `rc-pool` on undefined: The runtime's pool runs READ COMMITTED.
- `retry-out-of-range` on undefined: The runtime retries a value-out-of-range failure.
- `restamp-test` on undefined: One TESTED [T] line is restamped PROVED [P].
- `edit-after-receipt` on undefined: A pinned statement is edited after its receipt.

## Runs cited

- RUN-core-demo (statespace 0.1.0)
- RUN-pg-claims (postgres 18.6)
