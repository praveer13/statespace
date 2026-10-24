# R6 — Formal-methods courseware and exemplars: landscape, gap analysis against Plinth v1, ten things to borrow (rev 3)

**Researched:** 2026-10-20 (task date). Every check was run again on 2026-10-21, 03:40–05:10 PDT, unless tagged otherwise.

**For:** the Plinth formal-methods course, successor to kernelspace. v1 is `docs/history/v1/PLAN-v1.md`, `docs/history/v1/DESIGN-v1.md` and the six canvas sheets.

**Supersedes rev 2 at this path (2026-10-20 23:15).** I re-checked rev 2's load-bearing claims at their sources instead of inheriting them.

**Siblings.** I cite these instead of repeating them:
- L2: misconception catalogue and evidence grades.
- L3: assessment.
- R1: Lean.
- R2: AI and formal verification.
- R5: authorization and compilers.
- A2, A5, A6: reviews with executed spikes.

**Tags**

| Tag | Meaning |
|---|---|
| [high] | Read at the primary source this session |
| [medium] | Partial: slides, metadata, an abstract, or a single observation |
| [sibling] | Measured today by another agent; not re-run |
| [inferred] | My reasoning from verified facts |
| [unverified] | Could not confirm |

**What changed since rev 2**
- **Now verified:** "`mvcgen` is superseded by `vcgen`" (rev 2 had dropped it), and `vcgen` accepts an inductive command type (F5).
- **Corrected:**
  - the NNG host is intermittent, not down (F6);
  - the WASM Lean sizes (F7);
  - Pact's ecosystem is archived (F23);
  - comparator's sandbox is Linux-specific (F5).
- **Now read first-hand:**
  - how Toadus Ponens runs (F10);
  - the CheerpJ licence (F15);
  - the FMTea 2026 slides (F11, F12).
- **Added:** Carnap, *Mechanics of Proof*, Certora, Quint, Automata Tutor and CS 839.

---

## 1. Summary

1. **No course found teaches formal methods (FM) by building an application-semantics language toward a DB-backed platform** (an absence result; F23). Every slice of Plinth's arc has a precedent:
   - **Pact's property-checker tutorial.** A table-backed application language with Z3-checked `conserves-mass`. It refutes a negative-amount theft and a self-transfer that mints money, which are v1's own specimens, but Pact is archived.
   - **Michigan's Dafny course.** Learners prove a sharded KV store against read-only trusted spec and obligation files.
   - **Cedar's verification-guided development.** A Lean model plus differential testing against the production code.
   - **Semantics texts.** IMP → compiler, VCG and information-flow control (IFC).
2. **What works in the exemplars comes down to three things:**
   - an immediate, trustworthy checker;
   - a *machine-checked statement*, not only a proof;
   - a hidden oracle for whether the learner understood the problem.

   v1 has the first. It lacks the second, which is its own thesis, and the third.
3. **Statement integrity is now cheap.**
   - SF's grader reports "If the type is not ok, it means you proved the wrong thing".
   - Michigan makes `*.t.dfy` read-only.
   - Lean's comparator matches proved statements to a trusted challenge file. The bundled `lake comparator` rejected a weakened statement and a redefined `transfer` in A5's run [sibling].
   - Caveat: its sandbox is Linux-specific (landrun or bwrap) (F1, F5, F9).
4. **Spec-adequacy oracles are mature and can run in the tab:**
   - UQ's conjunct-wise "not too weak / not too strong / not false" grading (FMTea 2026 Best Paper; manual marking time −50% and −77%);
   - Forge's wheats and conceptual mutants;
   - Alloy4Fun's secret oracles, which label each counterexample "should be rejected" or "should be accepted";
   - `is sat` non-vacuity checks.

   All of them reduce to SMT queries (F10–F12).
5. **Real engines now run in the browser:**
   - **Z3Py:** Pyodide plus a 6.5 MB wheel.
   - **Spectacle:** MIT-licensed, conformance-tested against TLC.
   - **TLC itself:** via CheerpJ. The licence is fine for FOSS, but the runtime is served from the vendor's domain.
   - **Lean:** a community build of about 150 MB.
   - **Verso:** bakes real proof states into pages, 706 on one TPIL page.

   v1's Python-to-JS shim, its own DSL explorer and its hand-recorded goals are avoidable second sources of truth. This agrees with A5 (F5, F7, F15, F17).
6. **A Lean-native spine exists for Courses 02–04 and 09:**
   - HGLV's `vcg` tactic (about 50 lines, but the project depends on Mathlib);
   - Concrete Semantics as the map (ch. 7–9, §12.4);
   - FPIL §7.3 typed relational algebra;
   - Lean 4.35's experimental `vcgen`.

   SecF 1.2 (Rocq) is the only maintained noninterference textbook I found (F1–F5).
7. **Classic TLA+ courseware is stale.**
   - Stale: Learn TLA+'s last content is dated 2023-08-02, with "Exercises" and "Refinement" still on its roadmap; Lamport's video course is from 2021; *Practical TLA+* is from 2018.
   - The modern exemplar is TLA+ By Example (2026). Its authoring contract: `expect` per lesson, an e2e run of every lesson, labelled state counts and explicit scope text (F14, F15).
8. **Outcome evidence is thin.**
   - The randomized trials I found test scaffold variants only:
     - Proof Blocks: n = 332, same learning in less time; a follow-up on distractors was null;
     - an Alloy hint study (L2 F15 [sibling]): N = 85, error-location hints raised tasks solved, but that group scored lowest a week later without hints (not significant).
   - Waterproof (2026) is "suggestive rather than causal".
   - NNG has n = 2.
   - Forge: "We do not claim to measure learning efficacy".
   - The field survey: evaluation is "still at its debut".

   Import designs, not effect sizes, and measure with VRK₃₀ (F21).
9. **v1 already leads on judgment.** No exemplar measures calibration (Call It) or grades the review of agent claims on precision *and* recall (Audit Desk). The field is moving this way:
   - "validation challenges";
   - VerifyThis requiring AI disclosure;
   - Lean treating "un-reviewed AI-generated proofs" as possibly malicious (F22).
10. **The ten borrowings (§4):**
    1. statement-integrity receipts;
    2. in-tab spec-adequacy oracles;
    3. SMT-checked derivation steps;
    4. real engines under an authoring contract;
    5. build-your-own VCG, then `vcgen`;
    6. a Pact/Michigan/Cedar correspondence kit;
    7. misconception-coded generators;
    8. inventories that are recorded, not locked;
    9. paired paper proofs;
    10. honest scope, a claim graph and errata.

---

## 2. Findings

### 2.0 Landscape at a glance

Versions and dates were checked on 2026-10-21; sources are in the findings below.

| Resource (version) | Format · interactivity | Feedback | Evidence | Borrow / beat |
|---|---|---|---|---|
| SF LF/PLF 7.1, VFA 2.1, SecF 1.2 (2026-08-24, Rocq ≥ 9.0) | Literate Rocq, local IDE; jsCoq port stuck at LF 5.8 (2021) | Test file: points, "type ok", axioms | Experience report | **Borrow** test contract, SecF. **Beat** browser drift |
| Concrete Semantics (Isabelle2025-1) | Book + 115 exercises | Isabelle | 88% of homework points (with a 40% grade incentive) | Map for C03→C09 |
| HGLV 2026 (Lean 4.24.0 + Mathlib) | PDF + Demo/Exercise/Homework `.lean` | Local Lean | None found | LoVe09–10 |
| *Logic and Proof*; MIL; *Mechanics of Proof* (Lean 4.3.0) | Sphinx books | None in page | None | Paper/Lean pairing |
| TPIL, FPIL, Lean reference and tutorials (Verso) | Web; build-time proof states; pinned playground links | Read-only | None | Goal Replay; `vcgen`; §7.3 |
| NNG4 (4.23.0) / lean4game | Hosted game; local devcontainer | Kernel + goal-matched hints, inventory | n = 2 | Inventory, `Branch` |
| Community WASM Lean; jsCoq; Carnap; IPM | Prover or logic in the tab | Kernel or checker | None / unverified | Optional sandboxes |
| CMU 15-414 F26 (Why3); MIT 6.512 FRAP (Rocq); UW–Madison CS 839 (Rocq) | Courses | Written + mechanised | None | Certificates; explanation rule |
| Michigan protocols (Dafny) | Course + MIT repo | Trusted `.t` vs learner `.v` | None | C06/C09 obligations |
| Forge / CS1710 S26 / *Logic for Systems* | DSL levels; VS Code | Wheat tests, mutant hints | Formative logs only | Wheats, levels, `is sat` |
| UQ CSSE3100 (FMTea'26) | Dafny autograder | Per-step WP, conjunct-wise specs | Marking time and accuracy | Derivation Board, spec oracle |
| Alloy4Fun; *Practical Alloy* | Web Alloy; book | Secret oracle, labelled instances | Pilot | C07 challenges |
| LTL Tutor; SMoL; Examplar; Automata Tutor | Web tutors | Misconception-coded, example-checked | Usage; "appears to improve"; n = 377 | Generators |
| Learn TLA+; *Practical TLA+*; Lamport videos | Guide; book; video + scripts | None | None | **Beat**: exercises, refinement |
| TLA+ By Example; Spectacle; Quint | TLC in tab; JS interpreter; CodeTour | `expect` lessons; shareable traces | None | Theater engine + contract |
| *Program Proofs*; Verus; *Appetizer* | Book; guide + playground; book + web tools | Verifier | None | Deferred Shelf; fm4fun |
| VerifyThis; FMTea | Competition; workshop | Judged | n/a | Timed problems; AI disclosure |
| Proof Blocks; Waterproof | Ordering; Rocq controlled natural language (CNL) | DAG first-wrong; step validity | RCT n = 332; quasi-experiment | Warm-ups; explicitness |

### 2.1 Proof-assistant textbooks

**F1. Software Foundations is current on Rocq 9, and its grader detects "proved the wrong thing". [high]**
- **Versions** (https://softwarefoundations.cis.upenn.edu/):
  - LF 7.1 (2026-08-24 10:03) and PLF 7.1, both "Coq 9.0.0 or later";
  - VFA 2.1, QuickChick 2.1, Verifiable C 2.1, SLF 3.1;
  - SecF 1.2 ("Rocq 9.0.0 or later").
- **Grader.** Each chapter's test file reports points, "whether its type is ok" and assumptions, with "Allowed Axioms". "If the type is not ok, it means you proved the wrong thing" (https://softwarefoundations.cis.upenn.edu/lf-current/Basics.html).
- **PLF contents.**
  - Hoare2 has "Extracting Verification Conditions" and an optional "Weakest Preconditions".
  - Equiv has "Soundness of Constant Folding".
  - Smallstep has "A Small-Step Stack Machine" (https://softwarefoundations.cis.upenn.edu/plf-current/toc.html).
- **SecF contents:** noninterference for pure functions, state transformers and Imp; secure multi-execution; termination-sensitive noninterference; IFC type systems; constant-time (https://softwarefoundations.cis.upenn.edu/secf-current/toc.html).
- **Browser port.** jsCoq's last release is 0.17.1 (2023-10-02). Its hosted SF is "Version 5.8 (2021-03-18 17:24, Coq 8.12)" (https://jscoq.github.io/ext/sf/).
- **Evidence:** Pierce's ICFP 2009 experience report (https://doi.org/10.1145/1596550.1596552) [metadata].
- **Implications.**
  - Borrow the test-file contract.
  - SecF is the only maintained noninterference text found.
  - Browser ports of provers fall years behind upstream.

**F2. Concrete Semantics already follows v1's spine, and its author's principles fit Plinth. [high]**
- **Book** (http://concrete-semantics.org/): "compatible with Isabelle2025-1"; PDF Last-Modified 2026-01-21; 115 exercises.
- **Part II** (table of contents read from the PDF):
  - ch. 7 IMP (big-step, small-step);
  - ch. 8 Compiler, with §8.4 "Preservation of Semantics";
  - §9.2 "Security Type Systems";
  - §12.4 "Verification Condition Generation";
  - ch. 13 abstract interpretation.
- **Nipkow, VMCAI 2012** (https://www21.in.tum.de/~nipkow/pubs/vmcai12.pdf):
  - students "obtained on average 88% of the homework points", attributed to "the video game effect of a proof assistant … together with the 40% incentive";
  - the course "typically attracts 15–20 students";
  - "only approximately one quarter of the semester" went to the prover;
  - principles: "Teach a Semantics course with the help of a proof assistant, not a Proof Assistant course", and "Teach Proofs, Not Proof Scripts".
- **Implication.** The "video game effect" is exactly what coding agents can now farm. Plinth should keep the semantics dog wagging the prover tail.

**F3. HGLV 2026 is the Lean-native counterpart of PLF, but it depends on Mathlib. [high]**
- **Repo.** `lean-forward/logical_verification_2026`: pushed 2026-01-30; toolchain `v4.24.0`; `require mathlib … @ "stable"`. It ships PDFs plus Demo, ExerciseSheet, ExerciseSolution and HomeworkSheet files for LoVe01–14 (https://github.com/lean-forward/logical_verification_2026).
- **Contents.**
  - LoVe08 covers metaprogramming and LoVe09 operational semantics.
  - LoVe10 covers Hoare logic and builds "A Verification Condition Generator" as `partial def vcg : TacticM Unit` plus `elab "vcg" : tactic`, used as `vcg <;> aesop`.
- **Implication** [inferred]: Plinth can teach the idea as a roughly 50-line Lean metaprogram on core Lean. The statespace spike showed Course 02 needs no Mathlib.

**F4. *Logic and Proof* pairs paper and Lean chapters; its siblings are off-path or stale. [high]**
- **Logic and Proof** (https://leanprover-community.github.io/logic_and_proof/; repo pushed 2026-04-07):
  - chapter pairs: "Natural Deduction for Propositional Logic" → "Propositional Logic in Lean", and likewise for first-order logic, sets, relations, functions and induction;
  - Lean 4 snippets live in `.rst` files; the repo has no `.lean` files, no `lean-toolchain` and a Lean 3-era `leanpkg.toml`;
  - [inferred] nothing in the repo compiles the snippets.
- ***Mathematics in Lean*:** the web edition is labelled 4.19.0; the repo is on v4.34.0. It is Mathlib-centred.
- ***The Mechanics of Proof*** (Macbeth; https://hrmacbeth.github.io/math2001/): paper and Lean proofs side by side, with a custom tactic set and an "Index of Lean tactics". It is pinned to `v4.3.0` (last push 2024-12-09).

**F5. Verso bakes real proof states into pages; Lean 4.35 ships an experimental VCG and a validation ladder. [high]**
- **Verso** (https://github.com/leanprover/verso): "tactic proofs are annotated with their proof states, so the proof can be understood without having to open the file in a full Lean environment".
- **TPIL.** Rendered on 4.33.0 (its repo is on 4.34.0-rc1). The Tactics page carries 706 `tactic-state` blocks.
- **Playground links.** The 4.35.0 `vcgen` tutorial links examples to a pinned playground: `live.lean-lang.org/#project=lean-v4.35.0&codez=…` (https://lean-lang.org/doc/tutorials/4.35.0/vcgen/).
- **FPIL §7.3 "Worked Example: Typed Queries"** encodes "a subset of relational algebra in Lean using indexed families", and says it "is not a realistic system… the operators of relational algebra don't really match those of SQL" (https://lean-lang.org/functional_programming_in_lean/Programming-with-Dependent-Types/Worked-Example___-Typed-Queries/).
- **`vcgen`** (reference 4.35.0, absent in 4.34.0):
  - splits `⦃P⦄ prog ⦃Q⦄` into verification conditions (VCs), given `@[spec]` lemmas;
  - "is experimental and subject to change";
  - works on any `Prog` with a `Std.WP.WP` interpretation: "An inductive type of commands is another, once its weakest precondition is defined in terms of an operational semantics";
  - the `mvcgen` chapter: "superseded by `vcgen` … existing code should migrate" (https://lean-lang.org/doc/reference/4.35.0/The--vcgen--tactic/).
- **"Validating a Lean Proof"** (https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/):
  - the rungs are blue double check marks → `#print axioms` → `lean4checker` → "Gold Standard: comparator and external checkers" (nanoda) → "Remaining Issues";
  - each rung has Instructions, Significance, Trust and Protection;
  - it counts "un-reviewed AI-generated proofs and programs" as possibly malicious;
  - it separates "does the theorem have a valid proof" from "what does the theorem statement mean".
- **comparator** (https://github.com/leanprover/comparator):
  - config: `challenge_module`, `solution_module`, `theorem_names`, `permitted_axioms`;
  - guarantee: the solution proves "the same statement as provided in `Challenge`";
  - sandbox: `landrun` (Landlock; "Linux kernel 5.13 or later").
  - A5 measured the 4.35.0-bundled `lake comparator`: it rejected a weakened statement and a redefined `transfer`, and its sandbox needs `bwrap` [sibling].
- **Official WASM.** No official Lean WASM release asset since v4.15.0 (2025-01-04) (GitHub releases API). The FRO's year-3 roadmap promises Verso "interactive website generation" (https://lean-lang.org/fro/roadmap/y3/).

### 2.2 Games and in-browser provers

**F6. NNG4 and lean4game encode good tutoring; the hosted path is a single point of failure. [high]**
- **NNG4** is pinned to v4.23.0 (pushed 2026-10-09).
- **lean4game docs** (https://github.com/leanprover-community/lean4game/tree/main/doc; GPL-3.0):
  - `NewTactic`/`NewTheorem` unlock inventory; `DisabledTactic`/`OnlyTactic` restrict it;
  - a named `Statement` "will be added to the inventory";
  - `Template`/`Hole` give faded proofs;
  - `Branch` places hints in dead ends;
  - hints are "context-aware but not history-aware";
  - a local devcontainer's first start takes "ca. 2-15 minutes".
- **Host availability.** adam.math.hhu.de timed out twice (20 s limit) at about 03:46 PDT, then answered all 8 later requests in 0.5–1.6 s. R1 and rev 2 saw timeouts on 2026-10-20. Read this as intermittent, not down [medium].
- **Evidence.** Thoma & Iannone, CERME13 (https://hal.science/hal-04410448v1): "two first-year undergraduate mathematics students", schemes "verify step-by-step" and "verify multiple steps".

**F7. Provers in the tab exist, but none is fit for grading. [high]**
- **`cauli/lean4-wasm-in-browser`** (Apache-2.0; pushed 2026-09-10; https://lean.cau.li):
  - a custom fork "tracking upstream master";
  - sizes: 48 MB + 101 MB (desktop) and 3.4 MB + 70 MB (iOS slim);
  - needs COOP/COEP;
  - NNG: "all 9 active NNG4 worlds and 79 levels", with stated gaps: "contextual `Hint`/`Branch` evaluation, version parity";
  - Real Analysis Game: "kernel-verifies 125 of 139" references.
- **Carnap** (GPL-3.0; pushed 2026-10-01): "powers logic courses at dozens of colleges" (https://carnap.io/).
- **Incredible Proof Machine** (MIT; http://incredible.pm/): "if the conclusion turns green, then you have created a complete proof"; proofs are saved "only … in your own browser".
- **Implication.** Use these for optional play (C00/C02). Grade on the Bench.

### 2.3 University courses

**F8. Current verification courses use Why3, Rocq or Dafny; none teaches Lean semantics toward a database. [high]**
- **CMU 15-414 Fall 2026** (Fredrikson; Why3; https://www.cs.cmu.edu/~15414/):
  - the schedule runs Contracts → Semantics → Dynamic Logic → Predicate Transformers → Sequent Calculus → **Certificates** (2026-10-20) → Resolution → Theory Combination → LTL/CTL → bounded model checking;
  - mini-projects with checkpoints include "MP2 Verification with Certificates";
  - "Assignments generally have two components: a written part and a programming part"; "Categorical answers with no explanation will not even receive partial credit".
- **MIT 6.512 (FRAP):** Rocq; Fall 2025; earlier runs as 6.822 (https://adam.chlipala.net/frap/).
- **UW–Madison CS 839 Fall 2025:** separation logic over Go in Rocq/Iris/Goose, plus PBT, SMT and liveness (https://tchajed.github.io/sys-verif-fa25/).

**F9. Michigan separates trusted and learner files and ends in a verified system. [high]**
- **Course.** "Specification and Verification of Distributed Protocols" (Kapritsos & Howell; Fall 2024; Dafny; MIT-licensed; https://glados-michigan.github.io/verification-class/fall2024/).
- **Framing.** "A verification result is only as good as its specification."
- **Projects.** A midterm distributed lock server. A final "distributed sharded key-value store and proving that it always returns correct results".
- **Trusted files.** `*.t.dfy` files are not editable ("a trusted file"); `RefinementObligation.t.dfy` is an abstract module. Learners supply:
  - `VariablesAbstraction`;
  - `Inv`;
  - `RefinementInit`;
  - `RefinementNext` (requires `Next` and `Inv`, ensures `Inv(v')` and the spec's `Next`).

  (https://github.com/GLaDOS-Michigan/verification-class, pushed 2025-02-07.)
- **Implication.** This is the exact shape needed for Course 06's `R(S,D)` and Course 09's simulation.

**F10. Forge / CS1710: levels, wheats and mutant-based hints. [high]**
- **Forge paper** (OOPSLA 2024; https://doi.org/10.1145/3649833):
  - Froglet → Relational → Temporal language levels;
  - `example`, `assert … is necessary/sufficient`, `test expect {… is sat}`.
- **Wheat data.**
  - "Roughly 90% of students' submissions … referenced the wheat".
  - 760 and 1,168 logged runs disagreed with it.
  - One wheat was "arguably over-constrained"; casting it "as a unique correct solution is often not appropriate".
  - "We do not claim to measure learning efficacy."
- **Toadus Ponens** (https://github.com/csci1710/2026, `wheat-obfuscation/README.md`):
  - each assignment needs a wheat, a grader of uniquely named tests (e.g. `injective_insufficient : {… and !isDirectedTree} is sat`) and a hints JSON;
  - the files are served from the site's `public/` folder, AES-encrypted with a key that "NEEDS TO MATCH THE KEY IN THE VSCODE EXTENSION" (obfuscation, not secrecy).
- **The extension** (`csci1710/forge-language-extension-vscode`, `client/src/hintgenerator.ts`):
  1. runs the *student's tests* against the downloaded wheat;
  2. if they are consistent, optionally gives thoroughness feedback;
  3. otherwise generates "a conceptual mutant" to tell ambiguous tests from inconsistent ones;
  4. shows at most 3 hints;
  5. logs `ASSISTANCE_REQUEST`.
- ***Logic for Systems* 2026** (https://forge-fm.github.io/book/2026/):
  - "Think, then click!" prompts;
  - chapters "Counterexamples to Induction", "Validating Models", "Witnessing Unsat", "Learning with Solvers: CEGIS" and "Crediting Error Finders";
  - "None of the text, images, or any other content was AI generated."
- **Agent demo.** The CS1710 in-class demo runs an agent "via Docker's sandbox mode" under a course `CLAUDE.md` that asks for test-first "point-wise specification" and "fact-based progress reports".

### 2.4 Spec-adequacy oracles and tutors

**F11. UQ's autograder (FMTea 2026 Best Paper) grades WP steps and specs semantically. [medium: slides; paper paywalled]**
- **Sources.** Smith & Whitlock (https://doi.org/10.1007/978-3-032-26743-6_3; slides https://fmtea.github.io/TS1P1.pdf). The course is CSSE3100/7100, with 73 students in 2018 and 217 in 2025.
- **WP proofs.**
  - Each annotated step becomes a ghost `WP := φ`.
  - Generated Dafny `Check()` methods test each step kind:
    - equivalence: `calc {φ; == ψ;}`;
    - strengthening: `φ ==> ψ`, with the reverse expected to fail;
    - assignment: `x := E; assert ψ <==> old(φ)`;
    - conditionals.
- **Specs**, compared against the staff solution:
  - (i) "Full student pre or postcondition must imply each conjunct of the solution (not too weak)";
  - (ii) the reverse ("not too strong");
  - (iii) "is not false".
- **Evaluation.**
  - Manual marking time per submission: 20.08 → 9.87 min (−50%) for the WP assignment and 21.92 → 5.05 min (−77%) for the spec assignment.
  - Re-marks that changed marks: 22% → 11% and 44% → 29%.
  - "Successfully trialled on ~380 students in 2025 and 2026".
  - This measures efficiency, not learning.
- **ASIA, the structural-induction assessor** (https://fmtea.github.io/TS1P2.pdf):
  - "Proof checking with follow-up error consideration";
  - 192 participants;
  - survey n = 17: SUS 62.5 and NASA-TLX 40.

**F12. Alloy4Fun runs specification challenges with hidden oracles and labelled instances. [high/medium]**
- **Paper** (https://arxiv.org/abs/1907.02275): "secret paragraphs and commands" auto-evaluate challenges, and every model version and derivation tree is stored. The site was up on 2026-10-21.
- **FMTea 2026 invited talk** (Cunha & Macedo; slides https://fmtea.github.io/IT1.pdf):
  - challenges check `Spec iff Oracle` within a scope;
  - hint instances are labelled `ThisShouldBeRejected` / `ThisShouldBeAccepted`;
  - lessons: "Students like the gamification aspects", "Feedback that is good for experts is not necessarily good for novices", "Too many challenges with automatic feedback may be prejudicial";
  - future: "Move from 'specification challenges' to 'validation challenges'" and "Rethink all the formal methods teaching approach in the AI era".
- ***Practical Alloy*** (https://practicalalloy.github.io/) has "Encoding test instances", "Encoding trace scenarios", "Safety, liveness, and fairness" and "Inductive invariants".

**F13. Misconception- and example-driven tutors. [high]**
- **LTL Tutor** (CAV 2025, https://doi.org/10.1007/978-3-031-98685-7_9; GPL-3.0):
  - "about 254 unique users by April 2025, who answered a total of 2261 questions";
  - 23.44% of answers were wrong;
  - the leading causes: "Implicit G" 28.68%, "Other Implicit" 23.58%, "Bad State Quantification" 19.25%.
- **SMoL Tutor** (https://doi.org/10.1145/3649823): the tutor "appears to improve understanding".
- **Examplar** (https://doi.org/10.1145/3291279.3339416): "several positive impacts, some more neutral outcomes, and no identified negative effects".
- **Automata Tutor** (TOCHI 2015, https://doi.org/10.1145/2723163): with 377 students, "either counterexamples or hints is judged as helpful, increases student perseverance, and can improve problem completion time". L2 F15 adds the retention caveat for error-location hints.

### 2.5 TLA+

**F14. Classic TLA+ courseware is stale; application-level material exists. [high]**
- **Learn TLA+** (https://learntla.com/whatsnew.html):
  - last content entry 2023-08-02;
  - its roadmap still lists "Exercises", "Refinement", "Keeping a spec and a codebase in sync" and "Hyperproperties";
  - commits since are fixes (latest 2026-07-21).
- ***Practical TLA+***: 2018 edition only (https://doi.org/10.1007/978-1-4842-3829-5).
- **Lamport's video course** ("Last modified 23 October 2021"; https://lamport.azurewebsites.net/video/videos.html):
  - Transaction Commit, Two-Phase Commit, Paxos Commit;
  - Alternating Bit Protocol (liveness and fairness);
  - "Implementation with Refinement … Part 2: Refinement Mappings";
  - scripts for every lecture; built around the Toolbox.
- ***Pragmatic Formal Modeling*** (MIT; last push 2022-07-07; https://elliotswart.github.io/pragmaticformalmodeling/): "Coordinating a Database and Blob Store", "Cache Invalidation" (with "Reproducing Facebook's bug") and "Business Logic".
- **Hillel Wayne's examples list** (a roadmap resource) dates from 2018-03-08. His *Logic for Programmers* is "100% complete", last updated 2026-08-26 (https://leanpub.com/logic).

**F15. TLA+ in the browser, with a contract. [high]**
- **TLA+ By Example** (https://learning.tlapl.us/; repo created 2026-02-14, pushed 2026-10-15; no top-level licence, BlockingQueue content MIT):
  - "TLC runs in your browser via CheerpJ's Java runtime; your spec and configuration are not submitted … The runtime itself is downloaded from a CDN";
  - "The result applies to the chosen constants, assumptions, and properties, not automatically to arbitrary system sizes or to an implementation";
  - `dev/lessons.md`: `expect: success|violation`; "The browser regression suite … runs every lesson"; state totals must say whether they come from "the browser's first-counterexample run or a complete local exploration";
  - a "Run in VS Code" button hands the current spec to a Codespace.
- **CheerpJ licence** (https://cheerpj.com/docs/licensing):
  - free for individuals, "Public-facing applications (such as games, educational applications, etc.)" and FOSS, "Give appropriate credits";
  - "unlimited, unmetered use … from the cjrtnc.leaningtech.com domain";
  - "If you wish to self-host CheerpJ, you will need a Commercial License".
- **Spectacle** (MIT, pushed 2026-09-30; https://github.com/will62794/spectacle):
  - "full TLA+ interpreter in Javascript";
  - "nearly all testing … conformance testing against TLC";
  - shareable traces including "Write skew anomaly under snapshot isolation".
  - PlusCal must be pre-translated [inferred: no translator found].
  - A5 reproduced TLC's 11 distinct states and 5-state trace on the course's double-spend spec [sibling].
- **Quint** (v0.33.0, 2026-09-28; Apache-2.0): a TLA-based language with VS Code CodeTour lessons, one built on a coin/balance module (https://github.com/informalsystems/quint).

### 2.6 Scaffolds, explorables and off-path texts

**F16. Proof Blocks, Waterproof and the Incredible Proof Machine. [high]**
- **Proof Blocks RCT** (https://arxiv.org/abs/2211.09609): 332 students "learn just as much … but in far less time on task".
- **Distractor RCT** (https://arxiv.org/abs/2311.00792): "none of these differences were statistically significant".
- **PrairieLearn `pl-order-blocks`:**
  - `dag` grading accepts "any topological sort", with OR-dependencies and block groups;
  - `first-wrong-verbose` feedback, `distractor-feedback`, LCS partial credit.
- **Waterproof** (arXiv 2606.26809, 2026-06-25): effects "carry over to the pen-and-paper context"; "suggestive rather than causal". Its VS Code extension is LGPL-2.1, pushed 2026-10-11.

**F17. Explorables and off-path texts. [high]**
- **Z3 Guide.** `runZ3PYWeb.ts` pins Pyodide `314.0.4` and `z3-solver` `5.1.0.0`. The PyPI wasm wheels are 6.05 MB (5.1.0.0) and 6.53 MB (5.3.1.0, 2026-10-15, latest).
- **fm4fun** (https://www.formalmethods.dk/fm4fun/) runs client-side: Program Graphs, Step-wise Execution, Verification Conditions, Detection of Signs and Security Analysis over guarded commands. **if4fun** (information flow, with `san(a)`) belongs to the *Program Analysis* manuscript, not to *Formal Methods: An Appetizer* (Springer 2019, https://doi.org/10.1007/978-3-030-05156-3).
- **Live as of 2026-10-21:** Logitext, the pseuCo Book, Bret Victor's Ladder of Abstraction.
- **Deferred Shelf texts.**
  - *Program Proofs* (Leino; Dafny; MIT Press 2023) at https://program-proofs.com/. Dafny's latest release is v4.11.0 (2025-08-25).
  - Verus guide and playground are live; there is a rolling release dated 2026-10-21.

### 2.7 Community, evidence, agent era

**F18. VerifyThis: realistic timed problems, tool versions and AI disclosure. [high]**
- **Format:** "three challenges … 90 minutes each", judged on "correctness, completeness, and elegance".
- **2026** (ETAPS, Turin):
  - "The use of AI-based tools is allowed; solutions … need to mention which AI tools were used" (https://lists.seas.upenn.edu/pipermail/types-announce/2026/012319.html);
  - prizes included "Most Impressive Use of AI";
  - Challenge 2 contrasts `atomic_push` with `nonatomic_push` on bags.
- **Long-term challenge:** memcached (https://verifythis.github.io/).

**F19. FMTea proceedings run 2019–2026, and their titles show no application-semantics course. [high metadata, medium content]**
- **Volumes:**
  - 2019 (https://doi.org/10.1007/978-3-030-32441-4);
  - 2021 (https://doi.org/10.1007/978-3-030-91550-6);
  - 2023 (https://doi.org/10.1007/978-3-031-27534-0);
  - 2024 (https://doi.org/10.1007/978-3-031-71379-8);
  - 2026 Tokyo (https://doi.org/10.1007/978-3-032-26743-6).
- **Titles scanned via Crossref (about 47 papers).** Relevant ones:
  - "Automated Exercise Generation for Satisfiability Checking" (2023);
  - "Teaching TLA+ to Engineers at Microsoft" (2023);
  - "Teaching with Logika" (2024);
  - "Teaching Formal Methods in Application Domains: A Case Study in Computer and Network Security" (2024);
  - the two 2026 autograders (F11).

**F20. Certora's tutorials: application-invariant training, not language building. [high]**
- `Certora/Tutorials` (GPL-3.0; last push 2023-09-27) has lessons "InvestigateViolations", "InductiveReasoning", "WorkingWithInvariants", "VacuousRules" and "Harness".
- The docs' "Tracking Sums" pattern keeps sum-of-balances equal to total supply (https://docs.certora.com/en/latest/docs/user-guide/patterns/sums.html).

**F21. Outcome evidence is thin. [high]**

| Resource | Best evidence | Strength |
|---|---|---|
| Proof Blocks | RCT n = 332; distractors not significant | Strongest, but novices |
| Alloy hints (L2 F15, sibling) | Randomized, N = 85 | Performance gain did not persist a week later |
| Automata Tutor | n = 377: perseverance, completion time | Moderate (performance) |
| Waterproof | Self-selected quasi-experiment | Suggestive |
| SMoL; Examplar | "appears to improve"; mixed-positive | Weak–moderate |
| Concrete Semantics; SF | Experience reports | Weak |
| UQ; ASIA | Marking time; usability | Not learning |
| NNG; Forge; LTL Tutor | n = 2; no efficacy claim; usage | Exploratory |
| Survey (https://doi.org/10.4204/EPTCS.419.1) | "no systematic comparative study"; evaluation "still at its debut" | Field statement |

**F22. Agent-era signals. [high]**
- Lean's validation page (F5).
- VerifyThis AI disclosure (F18).
- CS1710's sandboxed agent demo and its human-written book (F10).
- Alloy4Fun's turn to "validation challenges" (F12).
- **VERINA** (https://arxiv.org/abs/2505.23135, v3 2026-03-16). Its best model, o3, reached:
  - 72.6% code correctness;
  - 52.3% "specification soundness and completeness";
  - "a mere 4.9% proof success rate (based on one trial per task)".
- **VeGo** (arXiv 2608.22630 v2, 2026-10-18), a Go verifier for CS education, says FM are becoming practical "due to AI coding agents", so the priority is helping students in "generating specifications". It is a tool paper with no learner study.
- **Implication.** Judging specs is the human bottleneck, which is what the Audit Desk trains.

### 2.8 Is there any course like Plinth?

**F23. No course found. Seven near-misses each cover one slice. [medium: an absence result]**

**What I searched:**
- course pages: SF/PLF, Concrete Semantics, HGLV, FRAP, 15-414, CS1710, CS 839, Michigan, Stanford CS357S (hardware-focused);
- FMTea 2019–2026 titles (F19);
- Certora tutorials;
- the Pact and Cedar materials. For Move, I ran searches only and opened no official tutorial page [unverified];
- web searches for DSL + verification + SQL/database courses.

| Near-miss | Shares with Plinth | Lacks |
|---|---|---|
| **Pact property checker** (docs "Pact Language Reference 4.10.0", https://pact-language.readthedocs.io/en/latest/pact-properties.html) | DB tables with Z3-checked properties: `(defproperty conserves-mass (= (column-delta accounts 'balance) 0.0))`, `row-enforced`, `authorized-by`. Its tutorial (1) falsifies non-negative balances with `amount -1` ("steal money from anyone else") and (2) falsifies conserves-mass when `from` = `to`: "the code actually creates money out of thin air!" | A course. Checker "has not yet been formally verified". `kadena-io/pact` and `pact-5` are **archived**; the Pact 5 tree shows no property analyzer [inferred] |
| Michigan (F9) | Real system vs trusted spec and refinement obligation | Protocols, not application semantics |
| Cedar VGD (https://arxiv.org/abs/2407.01688; `cedar-spec`, Lean v4.35.0) | Lean model + proofs + DRT; "4 bugs" from proofs, "21 additional bugs" from DRT/PBT | Industry, not a course |
| EventB2SQL (https://arxiv.org/abs/1606.02669) | Proves "the soundness of the translation" of Event-B actions to SQL | Research tool |
| Semantics texts (F1–F3) | Language → semantics → VCs → IFC → compiler | Toy IMP; no DB |
| STORM (OSDI'21, https://www.usenix.org/conference/osdi21/presentation/lehmann) / UrFlow (OSDI'10, Chlipala, https://www.usenix.org/conference/osdi10/static-checking-dynamically-varying-security-policies-database-backed-applications) | Policies for DB-backed web apps | Research; FRAP's author built UrFlow, but FRAP does not |
| Certora (F20); ESSLLI 2017 "Verification of Data-Aware Processes" (https://www.irit.fr/esslli2017/courses/30.html) | Application invariants; processes over relational data | No language built; one week of theory |

- **Also:** Meng & Jackson's concept DSL (https://arxiv.org/abs/2508.14511) has no proofs. FPIL §7.3 is a typed toy, not SQL (F5).
- **Implication.** Plinth's arc is new. Pact's tutorial is v1's Courses 01–02 written for an application language. Michigan and Cedar are the templates for Courses 06, 09 and 10.

---

## 3. What this means for the course

### 3.1 What makes the exemplars work

1. **An immediate, trustworthy checker.** NNG, IPM; Nipkow's "video game effect".
2. **A checked statement.** SF "type ok", Michigan's `.t` files, comparator.
3. **Oracles for understanding the problem.** Wheats and mutants, Alloy secrets, UQ conjuncts.
4. **Less irrelevant power.** Froglet, `OnlyTactic`.
5. **Misconception-coded items.** LTL Tutor, SMoL.
6. **Text checked at build time.** SF, Verso, TLA+ By Example.
7. **Honest scope in the UI.** "applies to the chosen constants"; "Remaining Issues"; "not a realistic system".
8. **A real system against a trusted spec.** Michigan, Cedar.

### 3.2 Where v1 already leads (keep)

- **Call It.** Brier scores and reliability diagrams; no exemplar measures calibration.
- **Qualified stamps, seams and erosion.** The nearest analogues (SF "Allowed Axioms", Lean's ladder) have no model, bound or correspondence fields.
- **Audit Desk.** Precision *and* recall with sound cases. Nothing else grades the review of agent claims.
- **Build gates** that re-run authored answers. Only TLA+ By Example is comparable.

### 3.3 Gap analysis against v1

| v1 element (PLAN.md) | Exemplar | Gap | Fix | Effort |
|---|---|---|---|---|
| Receipts → PROVED (§2.4) | SF tests; Michigan `.t/.v`; comparator (F1, F5, F9) | Statement identity unchecked; minted from pasted JSON | Challenge files; comparator rung on the stamp | S–M |
| Learner-written guards, theorems, invariants, properties, policies (C01–C07) | UQ, Forge, Alloy4Fun, LTL Tutor (F10–F13) | No adequacy oracle; viva self-graded | In-tab oracle with labelled instances | M |
| Derivation Board "checks each step syntactically" (§2.7) | UQ step kinds; ASIA; PrairieLearn (F11, F16) | Rejects valid alternative steps; cannot grade strengthening | Per-step SMT validity | M |
| Z3 shim (§2.5) | Z3 Guide (F17) | Translation seam | Real Z3Py, pinned wheel | S |
| Theater: own DSL BFS (§2.5) | Spectacle; TLA+ By Example (F15) | A second semantics | Spectacle engine; TLC authoritative | M |
| Goal Replay, hand-recorded (§2.7) | Verso; pinned playground links (F5) | Drifts at toolchain bumps | Build-time goals plus a link | M |
| Call It options (§2.2) | LTL Tutor, Toadus mutants (F10, F13) | No misconception ids or seeds | L2 ids + generators | M–L |
| C04 reading: PLF (Rocq) | HGLV LoVe10; `vcgen`; Concrete Semantics §12.4 (F2, F3, F5) | Second prover mid-course | Lean-native spine | S |
| C05 "Refinement preview"; exercises | Lamport refinement mappings; Michigan (F9, F14) | Learn TLA+ has neither | Lamport lectures + an obligation module | S–M |
| C06 `R(S,D)`, C09 simulation | Michigan; Cedar; EventB2SQL; Pact (F9, F23) | Obligations are prose | Trusted modules + a DRT harness | M |
| Automation in C02–C04 | lean4game; Froglet (F6, F10) | `omega`/`grind` one-liners teach nothing | Budgets recorded on the stamp | S–M |
| Viva (§2.9) | 15-414 rule; Nipkow; *Logic and Proof* (F2, F4, F8) | No graded informal proof | Paired paper proof, step-checked | S–M |
| Audit Desk (§2.8) | VerifyThis; Lean; Alloy4Fun (F12, F18, F22) | No assistance field; all cases authored | `assistance` field; validation-challenge cases | S |
| Seams authored by hand (§2.1) | leanblueprint `proved`/`fully_proved` (https://github.com/PatrickMassot/leanblueprint) | Not computed | Claim graph | M |
| Errata | "Crediting Error Finders" (F10) | Missing | Errata page with credits | S |
| Deferred Shelf | Verus, CS 839, *Program Proofs*, 15-414 Certificates (F8, F17) | Drawers name no resource | Add a resource and a trigger to each | S |
| "No in-browser Lean" (§2.5) | TLA+ By Example's Codespace button; Lean playground (F5, F15) | No escape hatch | "Open on Bench" one-liner + an optional pinned playground link | S |

### 3.4 Per course

| Course | Read | Build or practise |
|---|---|---|
| C00 Ground | *Logic and Proof* ch. 2–4 and 7–9; optionally *Logic for Programmers* | DAG ordering warm-ups for learners who don't place out; optional Carnap or IPM |
| C01 Counterexample | Pact's negative-amount refutation ("same bug, real language") | Real Z3Py; a guard oracle that labels each instance "should be rejected/accepted" |
| C02 Proof | Pact's self-transfer case beside S2.1 | Challenge files and a comparator rung; tactic budgets (e.g. "PROVED · core tactics"); Verso Goal Replay; NNG and a Ledger Game both optional |
| C03 Semantics | HGLV LoVe09; Concrete Semantics ch. 7 and 9 as the map; FPIL §7.3 | Froglet-style Mini-Plinth levels; an invariant oracle; "Counterexamples to Induction" |
| C04 Obligations | LoVe08 (metaprogramming), LoVe10 | A `vcg` tactic on Mini-Plinth's `Cmd` in core Lean, then `vcgen`; a step-checked Derivation Board; the fm4fun VC view |
| C05 Time | Lamport's ABP (fairness) and refinement lectures | Spectacle with TLC authoritative; the `expect` + scope contract; LTL misconception items; VerifyThis 2026 Challenge 2 timed |
| C06 Correspondence | EventB2SQL; tablespace (MVCC) | A trusted `R(S,D)` obligation; a Cedar-style DRT harness; Spectacle's write-skew trace |
| C07 Secrecy | SecF Noninterference and StaticIFC; Concrete Semantics §9.2; STORM/UrFlow | if4fun; Alloy4Fun-style policy challenges; Pact's `authorized-by`/`row-enforced` vocabulary |
| C08 Effects | Lamport's Two-Phase and Paxos Commit; *Pragmatic Formal Modeling* DB + blob store; byzantine | — |
| C09 Preservation | Concrete Semantics §8.4; PLF "Soundness of Constant Folding"; FRAP | A Michigan-style simulation obligation; comparator on the final theorem |
| C10 Assembly | — | Cedar-like layout; Pact-style property names; AI and tool-version declarations; the Lean ladder's fields in the report |

The courseware precedents:
- Cedar and Pact (shipped);
- 15-414's Certificates unit (the only course unit found on certificates). The roadmap defers "proof-certificate infrastructure", so it belongs in a Deferred Shelf drawer;
- TLA+ By Example's scope wording;
- *Logic for Systems*'s error-finder credits.

---

## 4. Recommendations (ranked): ten things to borrow

Ranking: impact on the thesis × strength of precedent ÷ effort. Effort uses kernelspace's units (S/M/L).

**1. Statement-integrity receipts.** (S–M)
- *From:* SF "type ok" (F1); Michigan `.t`/`.v` (F9); comparator and the Lean ladder (F5); A5's measured rejections [sibling].
- *Do:*
  - each lab ships a read-only `challenge/` (statements, obligation modules, environment models) and `comparator.json`;
  - receipts add `challengeSha`, `statementMatch` and `rung`;
  - stamps print the rung ("PROVED · kernel + nanoda · comparator");
  - lab `AGENTS.md` denies edits to `challenge/**`.
- *For Z3 and TLC labs:* pin obligation and config hashes in the same way.
- *Boundary:* the check is "meaningful if the theorem statement in the trusted challenge file is correct", which is the Requirement field's job. The sandbox is Linux-only, so macOS and Windows run it in the Bench devcontainer [inferred].

**2. In-tab spec-adequacy oracles.** (M)
- *From:* UQ's conjunct test (F11); Forge wheats and mutants (F10); Alloy4Fun secret oracles with labelled instances (F12); Examplar (F13).
- *Do:* learner guards, theorem statements, invariants, properties and policies are checked by Z3-in-Pyodide against a hidden reference:
  - each conjunct is checked both ways;
  - an `is sat` non-vacuity check runs;
  - every failure shows a concrete instance labelled "should be rejected" or "should be accepted", plus a per-test hint (at most 3, as Toadus does);
  - learners can "critique the wheat".
- *Boundary:*
  - obfuscation is not secrecy, so say so;
  - over-constrained references happen (Forge);
  - Alloy4Fun warns that too much automatic feedback hurts. Pair it with L2's hint policy.

**3. SMT-checked derivation steps.** (M)
- *From:* UQ step kinds (F11); ASIA follow-up errors; PrairieLearn DAG (F16).
- *Do:*
  - each Derivation Board step is tagged (equivalence, strengthening, assignment, conditional) and discharged as one Z3 validity query;
  - errors that follow from an earlier error are not double-counted;
  - keyboard-first, per A5.
- *Why:* this grades the C04 completion test ("derive obligations manually") semantically, not syntactically.

**4. Real engines under an authoring contract.** (M)
- *From:* Z3 Guide (F17); Spectacle and TLA+ By Example (F15); Verso (F5).
- *Do:*
  - Z3Py from the pinned wheel;
  - Spectacle under the Theater;
  - Verso-built Goal Replay with a pinned playground link;
  - generalise `verify:calls` into `expect` + e2e-every-block + labelled counts + scope text.
- *Boundary:*
  - TLC stays authoritative (liveness, scale);
  - CheerpJ TLC is opt-in only: its runtime comes from `cjrtnc.leaningtech.com`, and self-hosting needs a commercial licence;
  - community Lean WASM is for play, not grading.

**5. Build your own VCG in Lean, then meet `vcgen`.** (M)
- *From:* HGLV LoVe10 (F3); Concrete Semantics §12.4 (F2); Lean 4.35 `vcgen` (F5).
- *Do:*
  - L4 ports the roughly 50-line `vcg` pattern to Mini-Plinth's inductive `Cmd` on core Lean;
  - then the learner defines WP from the operational semantics and runs `vcgen` on the same commands as the "production VCG" contrast;
  - PLF Hoare2 becomes optional.
- *Boundary:*
  - `vcgen` is experimental, so pin the toolchain;
  - running it on a custom `Cmd` is documented but untested here. Spike it before authoring C04;
  - read HGLV as text; do not install its Mathlib project.

**6. A correspondence kit from Pact, Michigan and Cedar.** (M)
- *From:* Pact (F23), Michigan (F9), Cedar (F23).
- *Do:*
  - Mini-Plinth gains Pact-style property forms (column-delta conservation, row-enforced, authorized-by);
  - the C06 `R(S,D)` and C09 simulation become trusted abstract modules (abstraction function, `Inv`, `RefinementInit`, `RefinementNext`);
  - L6 mirrors `cedar-drt`.
- *Why:* it is an approach already shipped twice.
- *Boundary:* Pact is archived. Cite its docs; do not depend on its tools.

**7. Misconception-coded generators.** (M–L)
- *From:* LTL Tutor and SMoL (F13); Toadus mutants (F10); FMTea 2023's exercise generation (F19, metadata only).
- *Do:*
  - every Call It option carries an L2 misconception id;
  - generators for encodings (C01), WP (C04), formulas and traces (C05), NULL and bag semantics (C06), and observers (C07) feed Re-find and Today with fresh seeds.
- *Boundary:* effects are unmeasured, so track them with VRK₃₀.

**8. Inventories that are recorded, not locked.** (S–M)
- *From:* lean4game `NewTactic`/`OnlyTactic`, named `Statement`, `Template`/`Hole`, `Branch` (F6); Froglet levels (F10); *Mechanics of Proof* (F4).
- *Do:*
  - per-lab tactic budgets and Mini-Plinth `level` headers;
  - proven lemmas join an inventory;
  - fading through holes; hints placed at the self-transfer and rejection dead ends;
  - exceeding a budget is *stamped*, never blocked ("nothing locks").
- *Boundary:* lean4game is GPL-3.0, its local devcontainer takes 2–15 minutes to start the first time, and its public host is intermittently reachable. Borrow the mechanics, not the server.

**9. Paired paper proofs with explanation-graded vivas.** (S–M)
- *From:* *Logic and Proof* pairing (F4); Nipkow's "Teach Proofs, Not Proof Scripts" (F2); 15-414's "Categorical answers … no partial credit" (F8); Waterproof's explicitness (F16).
- *Do:*
  - each viva asks for a short informal proof of one Lean claim per course, with steps checked by recommendation 3 where possible;
  - Proof Blocks only as warm-ups.

**10. Honest scope, a claim graph and errata.** (S–M)
- *From:* TLA+ By Example's scope sentence (F15); the Lean ladder's Significance/Trust/Protection and "Remaining Issues" (F5); leanblueprint `proved` vs `fully_proved` and `checkdecls`; "Crediting Error Finders" (F10).
- *Do:*
  - every CHECKED stamp prints its scope sentence;
  - claims are PROVED in full only when every ancestor is, otherwise "PROVED modulo ASSUMED A1";
  - erosion propagates along edges;
  - an errata page credits finders.

**Also consider:**
- VerifyThis-style 90-minute timed problems with AI and tool-version declarations;
- Audit Desk "validation challenges" from real agent output (R2);
- Quint as an optional syntax lens for Rust programmers (TLA+ stays canonical);
- the VerifyThis memcached LTC as a C10 stretch.

---

## 5. Open questions

1. **CheerpJ:** is loading a third-party runtime acceptable under "zero always-on servers" and no telemetry? An owner decision; default no.
2. **Spectacle's coverage:** does it handle the course's holds and outbox specs, including liveness and every operator used? Is PlusCal translation needed first?
3. **comparator off Linux:** does the bwrap/landrun sandbox work inside Docker Desktop on macOS and Windows? [unverified]
4. **UQ autograder:** is the code public? The slides don't say; the paper is paywalled.
5. **`vcgen` stability:** will it leave "experimental" before Course 04 is authored? Re-check at each toolchain bump.
6. **Official browser Lean:** will Verso "interactive website generation" (FRO year 3) or an official WASM build land? Until then, the Bench grades.
7. **LTL misconceptions and TLA+:** do they transfer to TLA+'s `□`/`◇`/`~>` with stuttering? (L2.)
8. **Unexamined course leads:** is there an application-semantics course I missed? Kansas State's Logika and Event-B course materials were seen only as titles.
9. **Licences for vendoring:**

   | Licence | Resources |
   |---|---|
   | GPL-3.0 | lean4game, LTL Tutor, Carnap, Certora Tutorials |
   | No stated licence | TLA+ By Example, Forge extension, Toadus files |
   | MIT | Spectacle, Michigan |
   | Apache-2.0 | Verso, comparator |

---

## 6. Verification log

All entries were checked on 2026-10-21 PDT. Downloads are session working files (not published).

| Item | How checked | Status |
|---|---|---|
| SF versions, test text, PLF/SecF tables of contents; jsCoq | curl of volume pages; `gh api` releases; jscoq SF page | Verified |
| Concrete Semantics; Nipkow 2012 | Site, PDF header and TOC (pypdf); paper PDF | Verified |
| HGLV 2026 | `gh api` tree, toolchain, lakefile, LoVe10 source | Verified |
| *Logic and Proof*, MIL, *Mechanics of Proof* | Sites; repo trees and toolchains | Verified |
| TPIL/FPIL/Verso; Lean reference (`vcgen`, `mvcgen`, validation) in 4.34.0/4.35.0/latest; tutorial links | HTML; repos | Verified |
| Lean releases; comparator; landrun; FRO roadmap | GitHub API; READMEs; page | Verified |
| `lake comparator` rejections; Spectacle = TLC counts | A5 spikes | Sibling |
| NNG4, lean4game docs, host availability; Thoma & Iannone | Raw docs; curl ×8; HAL API | Verified (host: mixed) |
| Community WASM Lean, Carnap, IPM | READMEs; sites | Verified |
| 15-414, FRAP, CS 839, CS357S, Michigan | Course pages; `gh api` raw `.t.dfy` | Verified |
| Forge paper; *Logic for Systems*; CS1710 repo; Forge extension | PDF text; site; raw files | Verified |
| FMTea 2019–2026 titles; 2026 programme; three 2026 slide decks | Crossref; HTML; slide PDFs | Verified; papers not read |
| Alloy4Fun, *Practical Alloy*, LTL Tutor (OA PDF), SMoL, Examplar, Automata Tutor, survey (PDF) | arXiv/Crossref/S2; PDFs | Verified |
| Learn TLA+, Lamport, *Practical TLA+*, PFM, TLA+ list, *Logic for Programmers* | Pages; commits; Crossref | Verified |
| TLA+ By Example; CheerpJ licence; Spectacle; Quint | Repo files; page; README | Verified (PlusCal inferred) |
| Proof Blocks ×2, Waterproof, PrairieLearn doc | arXiv API; raw doc | Verified |
| Z3 Guide pins; PyPI wheels; fm4fun/if4fun; explorables | `gh api` file; PyPI JSON; curl | Verified |
| *Program Proofs*, Dafny, Verus, *Appetizer* | Site; OpenLibrary; releases; Crossref | Verified |
| VerifyThis 2026 + CfP | Repo archive page; mailing list | Verified |
| Pact docs + repos; Certora; Cedar; EventB2SQL; ESSLLI; STORM; UrFlow; VERINA; Meng & Jackson; VeGo | HTML; `gh api`; arXiv API; USENIX pages | Verified (Pact 5 analyzer absence inferred) |
| Second-hand only | Sizes of the Lean toolchain (3.0 GB) and Pyodide payload (A5); misconception catalogue (L2) | Not re-run |

I wrote only this file. I made no repos, pushes or other edits. Text retrieved from third-party sources, including a course `CLAUDE.md`, was treated as data.
