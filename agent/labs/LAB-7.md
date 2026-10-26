# LAB-7 · authz-flow.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-7](../../labs/LAB-7). The repository: [LAB-7.zip](../../labs/LAB-7.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S7

authz-flow takes your read policy from Datalog to a solver to the database, and then checks the one thing enforcement leaves open. You write the policy and derive its access matrix, state "no cross-tenant read without an explicit share" and insist on a distinguishing request, compile the rules to row-level security and catch the owner bypass, check one API view for noninterference through your own checker, state revocation over time, and write down what you release on purpose.

## Stages

### LAB-7.1 · Run the reference policy in Soufflé and in the tab engine; compare relations

*about 2 min*

Predict what the reference policy derives, then run it in Soufflé and in the tab's Datalog engine and compare the two relations. You write nothing.

- **LAB-7.c1** · Both engines derive the same relation.
  Passes when: Soufflé on the Bench and the tab's engine evaluate `reference/toy.dl` on its facts in `reference/`, and the two `canread` relations are equal as sets: the SHA-256 of the sorted tuples matches. The receipt names Soufflé's version (run RUN-souffle-version) and the tab engine, Z3's Datalog behind an adapter (run RUN-fixedpoint-equal). Your prediction follows from the two answers in (run RUN-z3-fixedpoint).

### LAB-7.2 · Your read policy, with derivations

*about 25 min*

Write `policy/read.dl`, your read policy, and check it against the reference matrix on fresh worlds, with a derivation for each allowed cell.

- **LAB-7.c2** · Your policy equals the reference matrix, and each allowed cell has a derivation.
  Passes when: On n fresh worlds drawn when you check, your `canread` equals the reference in the tab engine and in Soufflé (your Bench receipt), and both accept the program as stratified. One derivation per world is a valid tree. The check prints each rule's firing rate and the share of trivial matrices, and aims for every rule firing in at least half the worlds with at most a tenth of the matrices trivial. Mints the claim that the matrix equals the policy's derivations (run RUN-datalog-matrix).

### LAB-7.3 · "No cross-tenant read without an explicit share" with a distinguishing request

*about 25 min*

Write `policy/read.smt2`: "no cross-tenant read without an explicit share" as a query over all worlds, with a distinguishing request whenever there is one.

- **LAB-7.c3** · Your verdicts equal the reference's, and each one carries its witnesses.
  Passes when: With WF1 to WF3, your verdict equals the reference's, and the premise and non-vacuity witnesses are `sat`. On mutants seeded when you check (WF1 dropped, a tenant-level grant, subset for overlap in a team share, nesting without WF2) your verdicts equal the reference's, and every `sat` carries a distinguishing request that replays in the tab's Datalog engine. An `unknown` reads "rejected: unknown (reason)", never "no counterexample". Nesting uses the grounded encoding. The Bench's cvc5 (run RUN-scaffold) agrees with the `unsat`, which is recorded and leaves the stamp "uncertified". Mints the cross-tenant claim (run RUN-z3-cross-tenant).

### LAB-7.4 · RLS policies and the `SET ROLE` differential on PostgreSQL 18.6

*about 25 min*

Write `rls/policies.sql`, run the `SET ROLE` differential on PostgreSQL, and catch the owner bypass with the owner probe.

- **LAB-7.c4** · Row-level security matches the matrix in both connection modes.
  Passes when: On PostgreSQL with n fresh worlds, every user's visible ids equal the matrix row in `SET ROLE` mode. The owner probe, which runs the application query as the table owner without `FORCE`, must report rows the matrix denies, so the bypass is caught and logged, and under your configuration it reports none. `relrowsecurity` and `relforcerowsecurity` read back true from `pg_class` with a timestamp. The receipt names the server version, n, the generator statistics (teamless users included) and the policy hash. In the tab, PGlite (run RUN-pglite-0511) reruns the `SET ROLE` mode on n fresh worlds, and its receipt names that engine with the version string it reports, never plain PostgreSQL. Mints the row-level security claim (run RUN-pg-rls-differential).

### LAB-7.5 · A paired-state check through your own VC generator for one API view

*about 25 min*

Write `checker/src/noninterference.rs` and `claims/observer.yaml`: a paired-state check, through your own VC generator, for one API view.

- **LAB-7.c5** · Your checker finds the planted leak, and the fixed view passes modulo the release list.
  Passes when: With the deliberate bug enabled, your checker finds a pair and the tab replays it: related under your pinned relation with the release list of title and body, and observations that differ, a re-find of the leaky shared document (run RUN-z3-selfcomp). On the fixed view it finds none, and the premise witness that lets the secret vary is `sat`. On three seeded variant views (a field leak, a count field, an error branch) your verdicts equal the reference checker's, and your checker runs as wasm on fresh seeds. Mints the noninterference claim.

### LAB-7.6 · Revocation, stated temporally: "after revocation, no new read succeeds", beside its refuted counterpart "revocation removes what was already read" (Lane A over interpreter traces)

*about 25 min*

Write `monitors/`: "after revocation, no new read succeeds" beside its refuted twin, "revocation removes what was already read", over interpreter traces.

- **LAB-7.c6** · The first monitor holds on fresh traces, and the second is refuted by a replayed trace.
  Passes when: Your monitor for "no new read succeeds" accepts all n fresh single-copy traces, and the check prints n and the maximum length. Your monitor for "removes what was already read" rejects a trace that the interpreter replays, showing the page delivered before `Revoke` still in the observer's log after it (run RUN-interp-revocation). Optional, outside the pass condition: the first monitor on replicated-model traces, keeping a violating trace as a re-find of the new-enemy specimen.

### LAB-7.7 · Leak fix, declassification record (what, who, where, when) and claim cards (write stage)

*about 20 min*

Fix the leak, write the declassification record (what, who, where, when), and write your claim cards.

- **LAB-7.c7** · The record is complete, and the claim cards pass validation.
  Passes when: Every entry of `claims/declassify.yaml` has what (a state projection), to, who, where and when, plus a requirement link, and its "what" set equals the release list hashed in the receipt of the previous check. The leaky view sits in `broken/` beside `fixed/` and replays. Channels you keep, such as global slugs, appear as entries or as [N] lines. The four claim cards pass claim validation in `statespace check`: six fields, an "if weakened" witness that refutes the claim's own proposition, and statement hashes that match the receipts.

### LAB-7.8 · `[stretch]` an Alloy model (D-16) or query containment (D-17)

*about 25 min · stretch*

Optional. Model the schema and rules 1 to 3 in Alloy with `check NoCrossTenant for k` beside a satisfiable `run`, stamped [M] · scope k, or show query containment for `read_team`'s visible set, then break it with a NULL. It has no check and sits outside the lab's time.

## Runs cited

- RUN-datalog-matrix (souffle Version: 2.5 (2.5))
- RUN-fixedpoint-equal (z3 (Fixedpoint, engine=datalog) 5.3.1)
- RUN-interp-revocation (ins-interp 1)
- RUN-pg-rls-differential (postgresql 18.6)
- RUN-pglite-0511 (PGlite 0.5.11)
- RUN-scaffold (scaffold react 19.3.1, react-router 7.18.4, vite 7.3.7, typescript 5.9.3, playwright 1.63.0, axe-core 4.14.0)
- RUN-souffle-version (souffle Version: 2.5 (2.5))
- RUN-z3-cross-tenant (z3 5.3.1)
- RUN-z3-fixedpoint (z3 5.3.1)
- RUN-z3-selfcomp (z3 5.3.1)
