# LAB-3 · mini-plinth-core, goldens and the JSON IR; capstone S10.L1–S10.L2.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-3](../../labs/LAB-3). The repository: [LAB-3.zip](../../labs/LAB-3.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S3

Build Mini-Plinth's semantics yourself in Lean and check it against a reference you cannot import. You write the syntax, the typing rules, the evaluator and the proof that every successful step keeps the invariant. Then you record your edge-case decisions, export your semantics as JSON, and write a Rust parser, typechecker and interpreter that agree with the course's kernel-checked goldens. The Lean stages run on your Bench, and the Rust stages are graded in the tab.

## Stages

### LAB-3.1 · Run the reference evaluator; see a golden pass

*about 2 min*

Run the reference evaluator on the template and watch one golden, a recorded expected outcome, pass.

- **LAB-3.c1** · One golden passes on the template
  Passes when: `statespace check lab3.1` succeeds on the template, and the receipt shows `golden_transfer_ok` accepted by the kernel with no axioms. Goldens of this form elaborate with no axioms once the template derives `DecidableEq` for `Except` (run RUN-lean-golden-harness).

### LAB-3.2 · AST, `ResourceOp` and `HasType` for the fragment (`[weekend]`)

*about 45 min · weekend*

Write your AST, `ResourceOp` and `HasType` for the fragment, starting from the signature file that fixes your constructor names.

- **LAB-3.c2** · Typing goldens build
  Passes when: Every typing golden, `typecheck Γₖ cₖ = rₖ := by decide`, builds. The pool holds an accepted command and a rejection for each rule, so a checker that rejects everything fails. The signature file compiles, and `autoImplicit false` holds everywhere.

### LAB-3.3 · Evaluator with explicit errors (`[weekend]`)

*about 45 min · weekend*

Write an evaluator whose every failure is a value, and declare the policy it implements as `Lab3.policy`.

- **LAB-3.c3** · Evaluator goldens build
  Passes when: Every evaluator golden, `exec pₖ cₖ sₖ = rₖ := by decide`, builds, with each `rₖ` selected by your `policy`. A golden that fails to reduce is "no verdict", not a pass. No golden uses an axiom. The lint finds no `implemented_by`, `extern`, `partial`, `unsafe` or `native_decide` in your semantics modules, and no import of the reference module.

### LAB-3.4 · Step invariant (a): the per-operation lemmas, one `ResourceOp` at a time (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the per-operation lemmas for the step invariant, one `ResourceOp` at a time, starting from `post_inv`.

- **LAB-3.c4** · The operation lemmas are accepted
  Passes when: Comparator accepts `post_inv` and the five operation lemmas against the frozen challenge. Axioms stay within the permitted list, there are no `sorry`s, and no `grind` appears.

### LAB-3.5 · Step invariant (b): the theorem over every successful step, assembled from the lemmas (proof stage, `[weekend]`)

*about 45 min · weekend*

Assemble the theorem over every successful step from your lemmas, using `covers_sound` for the coverage hypothesis.

- **LAB-3.c5** · The step-invariant theorem is accepted
  Passes when: Comparator accepts `covers_sound` and `step_preserves_inv` against the frozen challenge. Axioms stay within the permitted list, and LAB-3.c3's goldens pass at the same source hash, on the same receipt.

### LAB-3.6 · The unsafe command: add `force move` to your semantics; the step-invariant theorem fails; keep it in `broken/` (proof stage)

*about 25 min*

Add `force move` to your semantics, watch the step-invariant theorem fail, and keep that version in `broken/`.

- **LAB-3.c6** · The counterexample is kernel-checked
  Passes when: In `broken/`, a typing golden shows that the `force move` command type-checks, and `cex_force`, the negation of the pinned statement proved with witnesses and `decide`, builds with permitted axioms. An edited statement is rejected by comparator (run RUN-lean-comparator). `fixed/` still passes LAB-3.c5.

### LAB-3.7 · Decision records for zero, self-transfer, failed guard and overflow; IR export via `lake exe` (write stage)

*about 20 min*

Write a decision record for each of zero, self-transfer, failed guard and overflow, and export your semantics as JSON.

- **LAB-3.c7** · Four records and a valid export
  Passes when: `decisions/zero.md`, `decisions/self-transfer.md`, `decisions/failed-guard.md` and `decisions/overflow.md` each have "Decision", "Alternative considered", "Consequence" and "Downstream" sections and a `choice:` equal to the matching `Lab3.policy` field. The output of `lake exe export-ir` validates against the JSON format, with golden right-hand sides taken from the golden module's literals.

### LAB-3.8 · Capstone S10.L1 (a): a Rust parser for the toy syntax (Lane A)

*about 25 min*

Write a Rust parser for the toy syntax, graded in the tab.

- **LAB-3.c8** · The parser reads the corpus
  Passes when: The parser accepts every positive corpus file, the roadmap's text verbatim included. It rejects every negative file with a located error. For each pool program it emits JSON equal to the Lean export.

### LAB-3.9 · Capstone S10.L1 (b): a typechecker that mirrors `HasType` (Lane A)

*about 25 min*

Write a Rust typechecker that mirrors your `HasType`, graded in the tab.

- **LAB-3.c9** · The typechecker agrees with the typing goldens
  Passes when: On typing goldens sampled by a seed drawn at grading time, your verdict, accept or the name of the rule, equals the golden's on every sample. The number of samples is printed.

### LAB-3.10 · Capstone S10.L2 (a): a Rust reference interpreter (Lane A)

*about 25 min*

Write a Rust reference interpreter for your semantics, graded in the tab.

- **LAB-3.c10** · The interpreter agrees with the evaluator goldens
  Passes when: On evaluator goldens sampled by a seed drawn at grading time, under your policy, stratified by operation and outcome class and including boundary values, every outcome equals the golden's. The number of samples and the count for each stratum are printed.

### LAB-3.11 · Capstone S10.L2 (b): differential run and claim cards

*about 20 min*

Run your interpreter against the course's on fresh programs, and write the claim cards for what that establishes.

- **LAB-3.c11** · Claim cards and a triaged differential run
  Passes when: CL-3.3, CL-3.4 and CL-3.5 pass the claim card format. The TESTED [T] stamps print the number of samples and the generator statistics. A run against the course's interpreter on m fresh programs reports m and triages each disagreement as a spec, implementation, tool or proof error.

### LAB-3.12 · `[stretch]` progress for the fragment

*about 25 min · stretch*

Stretch: prove progress for the fragment. This mints CL-3.1.

### LAB-3.13 · `[stretch]` preservation for the fragment

*about 25 min · stretch*

Stretch: prove preservation for the fragment. This mints CL-3.2.

## Runs cited

- RUN-lean-comparator (lean 4.35.0)
- RUN-lean-golden-harness (lean 4.35.0)
