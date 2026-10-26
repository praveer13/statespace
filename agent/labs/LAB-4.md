# LAB-4 · `miniplinth check`; capstone S10.L3.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-4](../../labs/LAB-4). The repository: [LAB-4.zip](../../labs/LAB-4.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S4

Build `miniplinth check`, a checker for Mini-Plinth commands. It reads a command and an invariant, emits an SMT-LIB obligation, asks Z3, decodes a model into a state and replays it in the interpreter, and reports a stamp with its premise witness. The first stage runs the reference checker so you see the output before you write any. Stages 2 to 7 are your Rust, compiled to wasm and graded in the tab on seeds drawn at grade time. Stage 8 runs on your machine and compares Z3 with cvc5. This lab builds capstone step S10.L3.

## Stages

### LAB-4.1 · Run the reference checker on the guarded Transfer: "proved for the fragment" plus a premise witness

*about 2 min*

Run the reference checker on the guarded Transfer and read what it reports: the verdict, the stamp and the premise witness. It runs in the tab and earns nothing. It shows the output your own checker will produce.

- **LAB-4.c1** · The reference output, reproduced
  Passes when: The verdict is `unsat`, the stamp names the solver, its version, the word uncertified and the `rlimit`, and the premise witness satisfies `Inv ∧ Guard ∧ Step` and replays as a successful step. (run RUN-check-fragment) The witness is checked by running it, never by matching its values.

### LAB-4.2 · Weakest precondition of assignment emitted as SMT-LIB

*about 25 min*

Write `wp_emit`: the weakest precondition of an assignment or a ResourceOp, as SMT-LIB. The seeds include aliasing and capture-prone commands.

- **LAB-4.c2** · Weakest preconditions match the reference
  Passes when: On 20 fresh seeds of assignment shapes, aliasing and capture-prone seeds included, your output is Z3-equivalent to the reference on every seed. A failing seed shows the state where the two disagree. A seed Z3 cannot decide is drawn again and counted, and each seed's `rlimit` is printed.

### LAB-4.3 · Conditionals and guards

*about 25 min*

Extend `wp_emit` to sequences, conditionals and guards, with all four readings of a guard. Name the intermediate formulas so that a chain of conditionals stays small.

- **LAB-4.c3** · Conditionals and guards match the reference
  Passes when: The same equivalence check on 20 fresh seeds of sequences and guarded commands, all four guard readings, plus a chain of 12 sequential `if`s whose query stays within the check's size and time limits. Copying `Q` at every `if` does not.

### LAB-4.4 · Frame conditions

*about 25 min*

Write `vc_emit` with its forward route: `Inv ∧ Guard ∧ Step ∧ ¬Inv′`, with a named frame for every account the command leaves alone.

- **LAB-4.c4** · Frames are stated, and every one is needed
  Passes when: First, on 20 fresh obligations over at least three accounts that are known to hold, the forward route reports a proved obligation with a premise witness that replays. Second, every `frame_<k>` is load-bearing: deleting it turns `unsat` into `sat`, with account k changing. Third, the two routes agree on every seed.

### LAB-4.5 · Capstone S10.L3: decode models into Mini-Plinth states and replay them in the interpreter

*about 25 min*

Capstone S10.L3. Write `model_decode`: turn a Z3 model into a Mini-Plinth state and replay it in the interpreter. A model that does not replay is a defect in your generator, never a finding about the command.

- **LAB-4.c5** · Every refutation replays
  Passes when: On the fixtures and 10 fresh seeds, every REFUTED result decodes into a state that the interpreter replays to the same violation, and every premise witness replays as a success. A model that does not replay is reported as spurious, a defect in the generator, and never as REFUTED. The check tests this with an injected query that has no frame.

### LAB-4.6 · CTI or reachable: output "inductive", "CTI", "REACHABLE in k" or "none within N"

*about 25 min*

Write the driver that decides, for an invariant, `inductive`, `CTI`, `REACHABLE in k` or `none within N`, and chooses between claim CL-4.4 and claim CL-4.5.

- **LAB-4.c6** · Verdicts match the reference
  Passes when: On 10 generated invariants your output matches the reference on every seed. Every REACHABLE trace replays in the interpreter with k ≤ N. Every bounded verdict prints its bound N. CL-4.4 or CL-4.5 is chosen as the stamp rules direct.

### LAB-4.7 · Miscompile your own checker by over-constraining the translation (a guard strengthened in translation, a dropped effect or an over-broad frame) so that a known-false obligation reports [P]; locate the faulty translation; keep it in `broken/` (the roadmap's adversarial exercise; a dropped frame conjunct only turns `unsat` into a false alarm, never a [P])

*about 25 min*

Break your own checker on purpose. Miscompile one construct so that a known-false obligation is reported proved, find the faulty translation, and keep the broken build in `broken/`. Dropping a frame conjunct is not enough, because it only gives a false alarm. Over-constrain instead: strengthen a guard, drop an effect or widen a frame.

- **LAB-4.c7** · A false proof, located and fixed
  Passes when: One: `broken/` reports PROVED on a fixture whose reference verdict is REFUTED, through a strengthened guard, a dropped effect or an over-broad frame. Two: its premise-witness status is recorded, `sat` for a proof that is not vacuous and `unsat` for one that is. Three: `fixed/` reports REFUTED with a witness that replays. Four: fixture and semantics hashes match across builds. Five: reverting the hunk tagged `MISCOMPILE` restores REFUTED, so locating the bug is graded.

### LAB-4.8 · cvc5 cross-check on the Bench; claim cards (write stage)

*about 15 min*

On your machine, run cvc5 beside Z3 on every `unsat` you authored, then write the claim cards for CL-4.2 and for CL-4.4 or CL-4.5. A disagreement between the solvers is never overridden: it becomes a specimen candidate.

- **LAB-4.c8** · Two solvers agree, and the cards hold
  Passes when: cvc5 and Z3 agree on every authored `unsat` in your fixtures and claims, and a disagreement fails the check. CL-4.2 and CL-4.4 or CL-4.5 pass claim validation, their statement hashes match the receipt, and each "if weakened" witness refutes its own proposition.

### LAB-4.9 · `[stretch]` VC-generator soundness for assignment and `if`, in Lean (proof stage, `[weekend]`)

*about 45 min · stretch · weekend*

Optional. In Lean, prove that substitution is sound and that a weakest-precondition generator for assignment and `if` is sound, over a small pinned language: `subst_sound` and `wp_sound`. The theorem is about a Lean model of your Rust generator, so the claim it supports says how that model corresponds to your code.

## Runs cited

- RUN-check-fragment (z3 5.3.1)
- RUN-z3-bv64 (z3 5.3.1)
- RUN-z3-capture (z3 5.3.1)
- RUN-z3-missing-frame (z3 5.3.1)
