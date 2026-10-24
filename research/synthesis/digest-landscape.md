# Landscape digest for Plinth v2

**Snapshot:** research 2026-10-20/21. Volatile pins re-checked 2026-10-23 through the GitHub, npm, PyPI and crates.io APIs (read-only).
**For:** the lead course architect of Plinth v2, successor to kernelspace. Learning science is in the pedagogy digest.

**Inputs and precedence**
- R1 Lean · R2 AI × formal verification · R3 tools · R4 PostgreSQL · R5 authorization, compilers, assurance · R6 courseware. Every fact-check correction is applied (§1).
- SPIKES = `research/spikes/RESULTS.md`, executed 2026-10-20. It wins any disagreement about executed facts.
- A5 = the feasibility review's executed logs, `research/evidence/A5r3/` and `research/evidence/A5v2/` (2026-10-21). Cited only where they settle a tool question.
- R1-M = R1's Lean measurements, `research/evidence/lean-measure/` (2026-10-20).

**Tags**
- No tag: primary source, read by the dossier on 2026-10-20/21 unless dated.
- **[X]**: executed on this machine.
- **[V]**: confirmed by a fact-check pass (2026-10-21) or by my API re-check (2026-10-23).
- **[S]**: second-hand. **[U]**: unverified. **[D]**: inference.

This digest is generic.

---

## 0. Ten facts that change the design

Sources for each item are in §1, §2 and §4.

1. **The checker is part of the claim.** An AI-assisted, `sorry`-free Collatz "disproof" (2026-07-25) passed Lean's kernel, a fresh `leanchecker` replay and a week-old nanoda by chaining two bugs. v4.32.2 fixed it on 2026-07-28. lean4lean shared the kernel bug. → PROVED names its toolchain, checkers and versions, advisories can reopen stamps, and "independent" means separately designed.
2. **Lean 4.35.0 (2026-10-12) builds proof auditing in.** It ships `lake check [--paranoid]`, `lake comparator` and bundled external kernels. Its manual treats "un-reviewed AI-generated proofs and programs" as potentially malicious. → Lesson 2.9, receipts and the Audit Desk get scriptable verdicts.
3. **Statements, not proof search, are where AI-era verification fails.** Five entries scored 672/672 on PutnamBench (2026-08-26 to 09-24), yet vacuous and weakened statements were still being filed on 2026-10-12/13. → Rebuild the Audit Desk on dated incidents (§4) and add a Spec Bench.
4. **Core-only Lean suffices [X]**, and `grind`, `lia` and `bv_decide` close the early theorems in one line. → Teach statements, goals and axioms. Record automation on stamps; never block it.
5. **Lean has an experimental Dafny-style VC generator** (`requires`/`ensures` plus `vcgen`). Its syntax changed in 4.34, 4.35 and 4.36. → A dated production twin, shown after the learner's own VCG.
6. **Real engines run in the tab:**
   - Z3Py on Pyodide, without COOP/COEP [X];
   - Spectacle, whose state counts equal TLC's on the course's double-spend spec [X];
   - PGlite, which is PostgreSQL 18.6 on one connection.
   - → Drop v1's Python shim and DSL explorer. Liveness, Lean grading, multi-session SQL, cvc5 and Alloy stay on the Bench.
7. **Execution falsified three v1 claims [X]:** C6.2, E1 and the Theater's "212 states". → Every number in course copy comes from a recorded run that names its version and flags.
8. **TLA+ tooling and courseware lag.** No stable TLC has shipped since 2024-08-05. Learn TLA+'s last content dates from 2023-08-02, with exercises and refinement still on its roadmap. → The course supplies both, and copies TLA+ By Example's authoring contract.
9. **Industrial evidence puts the residual risk in the spec.**
   - Cedar combines a Lean model, a verified SMT compiler and DRT.
   - All 7 of AuthV2's shadow-test mismatches were spec errors.
   - About 32% of LLM SQL rewrites changed results.
   - → Stage 7 gets evidence layers, Stage 9 SQL validation, and the course a verdict→stamp table.
10. **Outcome evidence for formal-methods courseware is thin.** The best is a novice RCT with n = 332. → Import designs, not effect sizes, and measure VRK₃₀.

---

## 1. Corrections ledger: never propagate the left column

| Do not write | Write instead | Source |
|---|---|---|
| Lean 4.23, 4.27, 4.28, 4.31 released 09-15, 01-24, 02-17, 06-13 | 2025-09-14, 2026-01-23, 2026-02-16, 2026-06-15 | https://api.github.com/repos/leanprover/lean4/releases [V] |
| "18 minor releases since 4.19"; point releases 4.32.1, 4.32.2, 4.33.1, 4.34.1 | 16 (4.20–4.35); point releases also 4.20.1, 4.24.1, 4.25.1, 4.25.2, 4.28.1, 4.29.1 | same [V] |
| PR #14990's *description* says `sorry` is caught "by nothing else" | It is a commit message on the PR (merged 2026-09-07) | https://github.com/leanprover/lean4/pull/14990 [V] |
| 4.34 fixed "three AI-found kernel issues" | Three soundness issues found with AI testing, "two in the kernel proper and one in the runtime's reference counting" (reported by Daniel Selsam, OpenAI) | https://lean-lang.org/doc/reference/latest/releases/v4.34.0/ [V] |
| 4.33 had "nine" kernel fixes, credited to OpenAI | 12 kernel PRs with mixed labels. #14577 and #14613 are "Soundness bug, affecting users of comparator". The OpenAI credit comes from the postmortem | https://lean-lang.org/doc/reference/latest/releases/v4.33.0/ [V] |
| "v4.32.2 = v4.32.1 + #14577 only", per the release page | The page is empty. The compare API shows #14577 plus "chore: prepare release" | https://github.com/leanprover/lean4/compare/v4.32.1...v4.32.2 [V] |
| `--paranoid` runs "six independent kernels" | Six checkers. lean4lean ports the inductive logic, so it is not independent for #14576's bug class | https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/ [V] |
| #14576 affected "≤ v4.31.0" | That is the advisory's range. v4.32.0–4.32.1 also lacked the fix; the stable fix is v4.32.2 | https://www.openwall.com/lists/oss-security/2026/08/02/1 [V] |
| The Lean toolchain is "~200 MB" (an unmeasured aside in SPIKES) | A 594.5 MB download, 3.0 GB unpacked. Core-only still holds | R1-M [X] |
| Verus: LLM proofs "run 2–3× longer" | They are "often 2–3× as long" (verbosity) | https://verus-lang.github.io/verus/guide/print.html [V] |
| ImpossibleBench: 92%→1% "on LiveCodeBench" | On Conflicting-LiveCodeBench; the abort result (54%→9%) is on Conflicting-SWEbench | https://arxiv.org/abs/2510.20270 [V] |
| SysMoBench etcd Raft conformance "≤15%" | 7.69% (basic modelling) and 15.38% (code translation), Claude-Sonnet-4; "26 of 32 SpinLock" is [U] | https://arxiv.org/abs/2509.23130 [V] |
| AxDafny "92.7% on 250 tasks" | 725 of 782 on DafnyBench; 250 is the size of LCB-Pro-Dafny | https://arxiv.org/abs/2606.32007 [V] |
| IsoVista as a research paper | A 4-page demo, PVLDB 17(12):4325–4328, DOI 10.14778/3685800.3685866 | Crossref [V] |
| "Troubadour, applied to PostgreSQL" | The paper exists (DOI 10.1145/3720504); the tool name and target are [U] | https://doi.org/10.1145/3720504 |
| Trace validation, "SEFM 2024" | arXiv 2404.16075; venue [U] | https://arxiv.org/abs/2404.16075 [V] |
| "CheerpJ's free tier excludes business use" | Except one-person companies; vendor-CDN runtime only; self-hosting needs a commercial licence | https://cheerpj.com/docs/licensing [V] |
| jsCoq's last release is 0.17.1 | 0.17.1 is a pre-release. The last stable is v0.16.0 (2022-09-22); npm latest 0.17.1 (2023-10-04) | https://github.com/jscoq/jscoq/releases [V] |
| Theater "212 distinct states"; "TLC shortest: 4" | 11 distinct states; a 5-state, 4-action trace | SPIKES [X] |
| C6.2: concurrent transfers lose updates at READ COMMITTED | Only app-level read-modify-write does. A single conditional `UPDATE` re-evaluates its WHERE clause on the new row version | SPIKES [X] |
| E1: `bigint` wraps at 2^63−1 | Postgres raises 22003. It is a refinement failure: the DB cannot match S→S′ | SPIKES [X] |
| "Stable TLC writes JSON traces" | 1.7.4 rejects `-dumpTrace`; 1.8.0 writes JSON | A5 `tla/run.log` [X] |
| UQ's autograder cut marking time 50% and 77% (read as an effect) | A year-over-year comparison; it measures efficiency, not learning | https://fmtea.github.io/TS1P1.pdf [V] |

**Upgraded by the verifiers**
- Elle: PVLDB 14(3), DOI 10.14778/3430915.3430918.
- `LEAKPROOF` "can only be set by the superuser".
- PG 19 GA: planned for 2026-11-19, per the official RC1 announcement.
- TxCheck: 56 bugs found, 52 confirmed.
- AWDIT: PLDI 2025, DOI 10.1145/3742465 (its bounds are still [U]).
- Ports & Grittner: PVLDB 5(12):1850–1861.

---

## 2. Stage by stage: facts that change content, tools or labs

Format: the fact and its source, then the change after →. Pins are in §3, and incidents in §4.

### Course 00: Ground

- **Honest verdicts.** AWS Automated Reasoning checks (GA 2025-08-06) return seven verdicts:
  - VALID, INVALID, SATISFIABLE, IMPOSSIBLE;
  - TRANSLATION_AMBIGUOUS, TOO_COMPLEX, NO_TRANSLATIONS.

  "A VALID result covers only the parts of the input captured through policy variables" (https://docs.aws.amazon.com/bedrock/latest/userguide/automated-reasoning-checks-concepts.html). → Map them onto stamps: SATISFIABLE ≈ missing premises; IMPOSSIBLE ≈ vacuous; TRANSLATION_AMBIGUOUS ≈ UNKNOWN. Teach "who wrote the statement?" as a reading move.
- **Drills.** PutnamBench #366 (precedence) and #368 (∀x∃ written for ∃∀x), both filed 2026-10-13 (https://github.com/trishullab/PutnamBench/issues/366) [V] → seed the precedence and quantifier drills.
- **Warm-ups.** Proof Blocks (RCT, n = 332, novices; https://arxiv.org/abs/2211.09609) → ordering warm-ups only.

### Stage 1: Z3 (Course 01)

- **Starter.** Z3 5.3.1 (PyPI 2026-10-15, npm 2026-10-16) reproduces the starter exactly [X SPIKES]. It is still the latest on 2026-10-23 [V].
- **The tab.**
  - npm `z3-solver` needs threads and COOP/COEP, and its WASM is 34.6 MB [X SPIKES].
  - The PyPI pyemscripten wheel (6.5 MB) on Pyodide 314.0.7 ran in Chromium 153, Firefox 155 and WebKit 26.6 *without* cross-origin isolation, ready in 1.46–1.71 s [X A5].
  - Under Pyodide (Node harness), Z3's `timeout` never returned, while `rlimit` 5e6 gave `unknown (canceled)` in 1.1 s [X A5].
  - Kernelspace's opaque-origin sandbox fails for Pyodide in Chromium; a separate origin works [X A5].
  - The Z3 Guide also runs Pyodide (pinned 314.0.4, z3 5.1.0.0; https://github.com/microsoft/z3guide, R6 F17).
  - → Run Pyodide Z3Py on its own origin, with budgets in `rlimit`. Drop npm Z3 and the shim.
- **Models are not canonical.** The recipient-wrap witnesses differed between the native run [X SPIKES] and the Pyodide run [X A5]. → `verify:calls` asserts verdicts and witness properties, not model values [D].
- **One transfer, four encodings.**
  - `Int` hides overflow.
  - With `BitVec 64`, the guard protects the sender, not the recipient [X SPIKES].
  - `bv_decide` refutes with `a = 0, amt = 2^63` [X R1-M].
  - Postgres raises 22003 [X SPIKES].
  - → An 01→02 bridge lesson that foreshadows the corrected E1.
- **Solvers have bugs.** Alive2's BugList (2026-01-12) has 24 Z3 bugs, four of them unsoundness (https://github.com/AliveToolkit/alive2/blob/master/BugList.md) [V]. cvc5 1.4.0 (2026-09-17) disabled VTS over "soundness issues" (https://github.com/cvc5/cvc5/releases) [V]. → A footnote on sat/unsat/unknown.
- **Readings and the Spec Bench.** Pact's archived tutorial refutes a negative-amount theft and a self-transfer that "creates money out of thin air!" (https://pact-language.readthedocs.io/en/latest/pact-properties.html) [V] → a reading card. → Spec Bench v0 checks the guard against the correct, mutated and trivial transfers, plus a premise witness (§5).

### Stage 2: Lean (Course 02)

- **Cadence.** v4.35.0 shipped 2026-10-12 and v4.36.0-rc1 on 2026-10-14; nothing newer had shipped by 2026-10-23 [V]. 4.36.0 is likely in mid-November [D]. → Pin 4.35.x, and run `verify:labs` monthly on the pin and on the newest stable.
- **Core-only.** On core 4.35.0, `Ledger.lean` proves conservation, non-negativity, rejection and `run_conserves`; both conservation theorems use only `[propext, Quot.sound]`. The self-transfer mint is proved by `decide` [X SPIKES]. A Mathlib `Finmap` project's `.lake` is 7.3 GB [X A5], and `Std.TreeMap` has the needed lemmas (https://lean-lang.org/doc/api/Std/Data/TreeMap/Lemmas.html). → No Mathlib in Courses 02–09; if ever needed, use Hex's `*-theory` split (https://github.com/leanprover/hex).
- **Automation.** `grind` shipped in 4.22 (2025-08-14), and cutsat became `lia` in 4.27 (#11330) (https://lean-lang.org/doc/reference/latest/releases/v4.27.0/) [V]. The `grind` proof uses `Classical.choice`; the `omega` proof doesn't [X R1-M]. → A "which axioms?" Call It, tactic-free vivas, and stamps reading "PROVED · core tactics".
- **The ladder** (https://lean-lang.org/doc/reference/latest/ValidatingProofs/) [V].
  - Rungs: blue check marks → `#print axioms` → `lean4checker` → "Gold Standard: comparator and external checkers".
  - It separates "does the theorem have a valid proof" from "what does the theorem statement mean".
  - The page lags the binary: it uses the old `lean4checker` name and lists only nanoda.
  - Related trust facts: `sorry` builds with exit code 0 [X R1-M]; `_native` axioms appear per use since 4.29; PR #14953 (2026-08-28) removed `trustCompiler` (https://github.com/leanprover/lean4/pull/14953) [V].
  - → Lesson 2.9, with real outputs. Add TPIL ch. 12 (https://lean-lang.org/theorem_proving_in_lean4/) and "Did you prove it?" (https://leanprover-community.github.io/did_you_prove_it.html).
- **`lake check` and `lake comparator`.**
  - **Mechanics** [V `lake help`]: a `bwrap` sandbox; exit codes 0, 1 and 2; `--paranoid` adds five checkers; `permitted_axioms` is "deliberately not defaulted".
  - **Two verdicts, not one.** Planted `sorryAx`, `_native` and custom axioms exit 1, yet the log still says "Lean default kernel accepts the solution" [X R1-M].
  - **Comparator verdicts** [X R1-M, A5]:
    - honest → "Your solution is okay!";
    - a redefined `transfer` → "Const does not match";
    - a weakened statement → "theorem statement do not match".
  - **Docker** needs seccomp, apparmor and systempaths unconfined plus `/run/user/0`. A verdict then takes 1–2 s, and `--paranoid` 3 s, on a small project [X A5].
  - **CI.** `lean-action` v1.6.2 has no input for either command (https://github.com/leanprover/lean-action/blob/v1.6.2/action.yml) [V].
  - → Each lab ships a read-only `Challenge.lean` plus `comparator.json`. Receipts add `toolchain`, `checkers[{name, version, verdict}]`, `challengeSha`, `nativeAxioms` and `sandbox`. A `_native` axiom renders as "PROVED · compiler-trusted".
- **Trusted challenges.** Comparator Live hashes a challenge as `sha256(challenge.trimRight() + "\n")`, and lean-eval counts a problem solved "iff comparator accepts" (https://github.com/leanprover/comparator-live; https://github.com/leanprover/lean-eval) [V]. No public Comparator Live instance was found [U]. → Hash the same way, and publish trusted hashes per edition.
- **The incident** (§4 C2). The advisory says exploitation "requires execution of a metaprogram within the Lean process (e.g., as part of building a project or importing a dependency)" (2026-08-02, https://www.openwall.com/lists/oss-security/2026/08/02/1) [V]. → Course 02's capstone story: link it and ship no exploit code. It explains why `lake check` sandboxes the build and replays an export.
- **New since the snapshot.** For perceived soundness bugs, Lean's issue template now asks "Does it affect `lake check --paranoid`?" and points to security@lean-fro.org. It is visible in issue #15717 (2026-10-15, https://github.com/leanprover/lean4/issues/15717) [V].
- **Agents.** lean-lsp-mcp 0.31.0 (2026-09-30, beta) includes `lean_verify` (https://github.com/oOo0oOo/lean-lsp-mcp); Lean Beam is the FRO's preview MCP server and skill (https://github.com/leanprover/lean-beam). → `AGENTS.md` wires in the read-only tools and protects the bodies of `TODO(you)` proofs (kernelspace H1).
- **NNG4** is pinned to v4.23.0 (https://github.com/leanprover-community/NNG4), and its host was intermittent on 2026-10-20/21. → Fallbacks: https://lean.cau.li/game and the devcontainer.
- **Lean in the browser.** No official WASM asset has shipped since v4.15.0 (2025-01-04) [V]. The community build at https://lean.cau.li needs COOP/COEP, decompresses to 137.5 MB and is ready in 6.3–8.3 s [X R1-M]; its fork is 998 commits behind upstream (2026-10-23) [V]. → An opt-in practice cell that never awards credit, with a CI divergence check.
- **Goal states.** SubVerso can extract them, but its format is "not a public API" (https://github.com/leanprover/subverso). Stock `$/lean/plainGoal` returns them in about 0.3 s per file [X A5]. → Generate Goal Replay at build time, with a `verify:replay` gate.

### Stage 3: Semantics (Course 03)

- **FPIL** (tested on 4.33.0) renumbered its chapters in the 2025-06-02 Verso port (https://lean-lang.org/functional_programming_in_lean/) [V]. → Cite chapters by title: Getting to Know Lean; Hello, World!; Monads; Programming with Dependent Types. Its §7.3 "is not a realistic system".
- **Companion texts.**
  - LoVe 2026 (Lean 4.24.0 plus Mathlib; BSD-3-style; https://github.com/lean-forward/logical_verification_2026) has lectures 09–11: operational semantics, Hoare logic with a `vcg` tactic, and denotational semantics [V].
  - Concrete Semantics (Isabelle2025-1; http://concrete-semantics.org/) maps the arc: ch. 7, §8.4, §9.2, §12.4. Nipkow: "Teach Proofs, Not Proof Scripts" (https://www21.in.tum.de/~nipkow/pubs/vmcai12.pdf) [V].
  - → Read them beside PFPL; don't install LoVe.
- **Error semantics.** Cedar's type-soundness theorem lists the runtime errors that remain possible: `entityDoesNotExist`, `extensionError`, `arithBoundsError` (https://github.com/cedar-policy/cedar-spec). → The template for C3.1/C3.2.
- **Misformalization.** Formal Conjectures (2026-05-13) made 291 fixes: 48.1% misrepresentation and 35.4% type semantics such as ℕ subtraction (https://arxiv.org/abs/2605.13171) [V]. "Faults in Our Formal Benchmarking" (ICML 2026) found 4,833 issues and recommends `autoImplicit false` (https://arxiv.org/abs/2606.29493). → Lesson 3.7's levels; templates set `autoImplicit false`.
- **Run code is not checked code.** Open issue #15717 (2026-10-15): `ST.Ref` permits an unsafe cast in `BaseIO` (https://github.com/leanprover/lean4/issues/15717) [V]. → The `#eval`→JSON golden export is TESTED evidence about compiled code [D].

### Stage 4: VC generation (Course 04)

- **Contracts.**
  - Versions: `requires`/`ensures` in 4.34 (2026-09-14), `given` in 4.35, `throws` in 4.36.0-rc1.
  - In 4.35, `vcgen` sits behind `experimental.vcgen` and `experimental.intrinsic`, and `mvcgen` is deprecated (https://lean-lang.org/doc/reference/latest/The--vcgen--tactic/) [V].
  - Measured: `transfer`'s contract proved automatically. Dropping `amt ≤ a` printed `⊢ 0 ≤ (a - amt, b + amt).fst` [X R1-M].
  - The docs say a custom command type works "once its weakest precondition is defined"; this is untested [U].
  - → Hand derivation → `miniplinth check` → LoVe10's roughly 50-line `vcg` on Mini-Plinth's `Cmd` → `vcgen`, labelled experimental. Spike that last step first.
- **PLF** 7.1 (Rocq ≥ 9.0, 2026-08-24; https://softwarefoundations.cis.upenn.edu/plf-current/toc.html) [V] → optional reading, not a second install mid-course.
- **Derivation Board.** UQ checks each step kind as a Dafny query [V]. → Each board step is one Z3 validity query. Follow-up errors are not double-counted (ASIA, https://fmtea.github.io/TS1P2.pdf).
- **"The check never ran."** The old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs (https://arxiv.org/abs/2507.14722). Before 4.20, an `apply?` bug inserted a silent `sorry` (https://arxiv.org/abs/2606.29493). → An audit case.
- **Certificates.** cvc5 1.4.2 (2026-10-08) emits Alethe for EUF, linear arithmetic, bit-vectors and parts of strings, which is `miniplinth`'s fragment. cvc5 1.4.0 added Logos, a proof checker written in Lean (https://github.com/cvc5/cvc5/releases). Carcara's last release is 1.1.0 (2023-08-29) [V], and no cvc5 WASM build exists that we found [U]. → A cvc5 cross-check on the Bench now; Alethe→Carcara is a Shelf drawer.
- **Is the VCGen itself correct?** Cedar proves its SMT encoding sound and complete. SymCert (FMCAD 2026, DOI 10.34727/2026/isbn.978-3-85448-093-8_30) verified five production analyses in one work day *in total*, and its proofs caught encoder bugs [V]. → Lesson 4.8; C4.3 is the same theorem at toy scale.
- **Inductive invariants.** Apalache v0.62.4 (2026-10-12; https://github.com/apalache-mc/apalache) checks them [V] → an optional 04→05 bridge.

### Stage 5: TLA+ (Course 05)

- **TLC.** The newest stable is v1.7.4 (2024-08-05). v1.8.0 is a nightly-republished prerelease, re-published again 2026-10-24T01:42Z (https://github.com/tlaplus/tlaplus/releases) [V]. → Pin the 1.8.0 jar by SHA-256 and vendor it (MIT).
- **Flags change the verdict.** DoubleSpend (Init 100, Amount 80, two workers):
  - default flags report "Deadlock reached" at 10 distinct states;
  - `-deadlock` reports the invariant violated at 11 distinct states, with a 5-state trace;
  - the atomic version has 4 distinct states [X A5, SPIKES].
  - → Counts name the version, flags, constants and kind of run.
- **Spectacle** (MIT; pinned at `5827c22`, 2026-09-30; https://github.com/will62794/spectacle).
  - It is TLC-conformance-tested on 142 graphs and shares traces by URL. It has no PlusCal and no WF/SF or liveness [V].
  - It matched TLC's 11/45/191/813 states for 2–5 workers, at 524–1,125 states/s [X A5].
  - HEAD has since moved to `8193eb0` (2026-10-23) [V].
  - → Replace v1's explorer. Learner edits are capped at about 5k states, authored scenes use TLC graphs, and a CI gate (Spectacle = TLC) runs before any bump. Show PlusCal beside TLC's translation.
- **TLA+ By Example** (https://learning.tlapl.us/) runs TLC through CheerpJ 4.3 from the vendor's CDN. Its contract:
  - `expect: success|violation` on every lesson;
  - every lesson runs in CI;
  - counts are labelled first-counterexample or complete exploration;
  - every lesson has a scope sentence.

  CheerpJ is free for personal, FOSS and one-person-company use from that CDN (https://cheerpj.com/docs/licensing) [V]. → Copy the contract. CheerpJ TLC is opt-in and never grades.
- **Courseware gap.** Learn TLA+'s roadmap still lists "Exercises" and "Refinement" (https://learntla.com/whatsnew.html) [V]. Lamport's 2021 videos cover fairness and refinement mappings (https://lamport.azurewebsites.net/video/videos.html). → The course writes its own exercises and refinement lessons.
- **AI on TLA+.** LLM-written specs violate 41.9% of liveness properties, against 8.3% of safety properties, and pick fairness that is "overly technical or random" (SysMoBench, https://arxiv.org/abs/2509.23130). NL→TLA+ is 8.6% semantically correct (https://arxiv.org/abs/2606.05792) [V]. → Audit cases and a liveness base-rate card.

### Stage 6: PostgreSQL (Course 06)

- **Versions.** 18.6 is current. PG 19 RC1 shipped 2026-10-15, with GA planned for 2026-11-19 (https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/) [V], and its notes list no isolation or RLS changes (https://www.postgresql.org/docs/19/release-19.html). → Pin 18.6. Link `/docs/18/`, because `/docs/current/` flips to 19 at GA [D]. Re-record the catalogue after GA.
- **Executed behaviour** [X SPIKES], each row matched by manual text (https://www.postgresql.org/docs/18/transaction-iso.html):
  - READ COMMITTED re-evaluates WHERE (EvalPlanQual);
  - app-level read-modify-write spends 160 from 100;
  - REPEATABLE READ raises 40001;
  - write skew commits under RR (−100), while SERIALIZABLE aborts one transaction;
  - CHECK passes NULL, and WHERE skips it;
  - overflow raises 22003.
  - → Differential tests compare outcome classes (success, zero rows, SQLSTATE), not balances.
- **Upstream specs.** REL_18_STABLE has 127 isolationtester specs, including `simple-write-skew` (4 of 6 permutations abort), `read-only-anomaly`, `skip-locked` and `update-conflict-out` [V]. → Write the catalogue in that format. The learner's Rust `isorun` is gated on reproducing upstream outputs. DOC and PROPOSED rows need 18.6 runs.
- **Fact sheets.**
  - Hermitage: RC is monotonic atomic view; RR is snapshot isolation and allows G2-item and G2 (https://github.com/ept/hermitage) [V].
  - Jepsen (2020-06-12): SERIALIZABLE "exhibited G2-item" in 9.5.22–13 (https://jepsen.io/analyses/postgresql-12.3) [V].
  - SERIALIZABLE covers only "committed concurrent Serializable transactions".
  - → Lesson 6.9: Postgres semantics is an assumption. Audit A6.3 covers mixed isolation levels.
- **PG 18 features** (https://www.postgresql.org/docs/18/release-18.html) [V]: `RETURNING old/new`, `uuidv7()`, `NOT ENFORCED`. → `UPDATE … RETURNING old.bal, new.bal` yields D→D′ per row for checking R(S,D). `NOT ENFORCED` becomes a specimen.
- **PGlite.** 0.5.9 moved to 18.6, and 0.5.11 (2026-10-21) is a patch release [V]. It runs "single-user mode, which means a single connection" (https://electric.ax/blog/2026/03/25/announcing-pglite-v04) [V], and two "concurrent" workers serialize [X A5]. → In the tab, concurrency is replayed from recorded histories. RLS in PGlite is not yet tested.
- **History checkers.** elle-cli needs Java 21 (https://github.com/ligurio/elle-cli). SQLancer's TLP and NoREC oracles do no transaction testing (https://github.com/sqlancer/sqlancer). → Optional; checkers show that anomalies are present, never that they are absent.
- **Correspondence.** Michigan uses read-only `*.t.dfy` obligation files (https://github.com/GLaDOS-Michigan/verification-class). In Cedar, 35.5% of generated `when` conditions were Boolean literals (https://arxiv.org/abs/2407.01688) [V]. → R(S,D) becomes a trusted module, and DRT receipts report the generator's distribution.

### Stage 7: Authorization and information flow (Course 07)

- **Cedar** (Lean 4.35.0; https://github.com/cedar-policy/cedar-spec).
  - Proved: forbid-trumps-permit, default-deny, order independence, sound typing, and sound and complete symbolic compilation.
  - Daily DRT against the Rust code. Proofs found 4 bugs and DRT/PBT 21 (https://arxiv.org/abs/2407.01688) [V].
  - `cedar-policy-symcc` 0.8.0 needs cvc5 1.3.1, and `cedar-wasm` lacks SymCC [V].
  - → Three evidence layers:
    1. Lean meta-theorems (PROVED);
    2. a per-change SMT diff, as in IAM's `CheckNoNewAccess`;
    3. DRT of the enforcement (TESTED).
- **Decidability.** Quantified hierarchy constraints "make the encoding undecidable, causing timeouts or unknown results"; Cedar grounds them instead (https://arxiv.org/abs/2403.04651) [V]. → A lesson where `unknown` appears and grounding removes it.
- **Fail closed.** S3 Block Public Access: "if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" (FSE 2020, DOI 10.1145/3368089.3409728) [V]. → UNKNOWN fails closed when it guards enforcement.
- **AuthV2** (ICSE 2025), AWS's Dafny-built IAM authorizer, runs about 1 billion checks per second. It had 7 shadow mismatches, and "no issues were found with tools or proofs". Proof breakage delayed deploys "by up to 14 days" (https://www.amazon.science/publications/formally-verified-cloud-scale-authorization) [V]. → Test the spec against an independent behaviour source.
- **Engines.**
  - Soufflé 2.5 gives minimal-height proof trees, but has an open "sporadic crashes on ARM" issue (#2476).
  - Nemo v0.10.1 (2026-08-01) runs in the browser and fixed "a critical bug where filters in rules would be ignored" (https://github.com/knowsys/nemo/releases/tag/v0.10.1) [V].
  - Regorus says it is "mostly compliant with the latest OPA release v1.2.0", but OPA is at v1.21.3 (https://github.com/microsoft/regorus) [V].
  - → The TS evaluator emits derivations and is DRT'd against Soufflé. Engine versions go on receipts.
- **RLS** (https://www.postgresql.org/docs/18/ddl-rowsecurity.html):
  - owners bypass it unless `FORCE` is set;
  - `USING` filters silently, while `WITH CHECK` errors;
  - views run as their owner unless `security_invoker` is set;
  - integrity checks bypass RLS, a covert channel;
  - the docs describe a READ COMMITTED race in policy subqueries.
  - → A `SET ROLE` differential check against the Datalog access matrix.
- **Information flow.**
  - SecF 1.2 (2026-08-24) is the only maintained noninterference text found (https://softwarefoundations.cis.upenn.edu/secf-current/toc.html) [V].
  - Sabelfeld & Sands: what, who, where and when (DOI 10.3233/JCS-2009-0352) [V].
  - Zanzibar's "new enemy" problem (https://www.usenix.org/conference/atc19/presentation/pang).
  - → Every `declassify` states those four dimensions. Revocation cross-links byzantine.
- **Alloy 6.2.0** (2025-01-09; Java 17; https://github.com/AlloyTools/org.alloytools.alloy) [V]. → Run it on the Bench, and pair every `check` with a satisfiable `run`. Alloy4Fun stores models server-side, so make it a disclosed link-out.
- **Caches.** RFC 9111: `private` "cannot ensure the privacy of the message content" (https://www.rfc-editor.org/rfc/rfc9111.txt). Cloudflare's docs imply that `private=<headers>` caches the body (https://developers.cloudflare.com/cache/concepts/cache-control/) [U]. → A sensitivity-flow lesson with CONFIGURED and ASSUMED seams.

### Stage 8: Effects (Course 08)

- **Queues.** SKIP LOCKED "provides an inconsistent view of the data" (https://www.postgresql.org/docs/18/sql-select.html), and `nextval` values are "not reclaimed" on abort (https://www.postgresql.org/docs/18/functions-sequence.html) [V]. → The outbox is at-least-once by construction. The skipped-row case, H20, needs a spike. Idempotency keys use `ON CONFLICT` plus `uuidv7()`.
- **Trace validation.**
  - It reduces to constrained TLC checking (https://arxiv.org/abs/2404.16075).
  - CCF (NSDI 2025) binds TLA+ to the C++ behind Azure Confidential Ledger (https://arxiv.org/abs/2406.17455) [V].
  - MongoDB found trace-checking against a highly abstract spec "impractical", while "MBTCG was highly successful for Realm Sync" (https://arxiv.org/abs/2006.00915) [V].
  - → A new lab:
    1. A seeded Rust simulator emits NDJSON.
    2. TLC checks it against the learner's spec.
    3. A mutated simulator, which acks before the durable write, is rejected.
- **Simulators.** VOPR runs "real code … at 1000x speed … 24/7 on 1024 cores" in a debit/credit domain (https://docs.tigerbeetle.com/concepts/safety/) [V]. turmoil is active (https://github.com/tokio-rs/turmoil). Stateright has had no push since 2025-07-27, and madsim's last commit was a dependency bump [V]. → Learners write their own simulator.
- **Industrial correspondence.** P/PObserve (https://github.com/p-org/P) and `quint-connect` (https://github.com/quint-co/quint) [V]. The roadmap's TLA+ example list dates from 2018-03-08 (https://hillelwayne.com/post/list-of-tla-examples/). → Reading cards; add CCF, MongoDB and TigerBeetle.

### Stage 9: Compiler correctness (Course 09)

- **CompCert 3.18** (2026-08-30). Its observables exclude "execution time and memory consumption", and preprocessing, elaboration, assembling and linking are unverified (https://compcert.org/man/manual001.html) [V]. Csmith's silent wrong-code bugs in CompCert were in the unverified front end, plus one specification gap; "the middle-end bugs we found in all other compilers are absent" (https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf) [V]. → Lesson 9.4 states the theorem in CompCert's template. Erosion E7: a correct compiler with leaky output.
- **Alive2** is bounded, and found 47 new LLVM bugs (PLDI 2021, DOI 10.1145/3453483.3454030) [V]. → Stamp `plinth-tv` CHECKED[bound]. Add an egglog 3.0.0 (2026-08-19, runs in the browser; https://github.com/egraphs-good/egglog) rewrite lab where every rule is SMT-checked before admission.
- **Hidden compilers.** Cedar's oracle is Lean compiled to C. AuthV2 trusts DafnyLite. `native_decide` "adds the entire lean compiler to the trusted part" [V]. → Lesson 9.10 draws the TCB with these.
- **SQL.**
  - SQLSolver "may output NEQ or UNKNOWN for some equivalent query pairs" (https://github.com/SJTU-IPADS/SQLSolver); QED needs Z3 and cvc5 (https://github.com/qed-solver/prover). VeriEQL is bounded, and Polygon and ParSEval refute.
  - CIDR 2026: "≈32%" of LLM rewrites changed results, and QO-Verify proved about 37% of the 3100+ candidates (https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf) [V].
  - SpotIt: checking on a single database overstated accuracy by 11.3–14.2 points (https://arxiv.org/abs/2510.26840) [V].
  - LLM judges favour "equivalent" (https://arxiv.org/abs/2412.05561).
  - → Lesson 9.9: containment, provers, refutation, and replay of every counterexample.
- **Shelf.** Aeneas (Rust to Lean 4.35.0) and Velvet open when "correspondence names Rust code". Kani 0.68.0 and Verus are pinned at opening.

### Stage 10: Assembly (Course 10)

- **Assurance.**
  - Assurance 2.0 asks that "no credible doubts remain" (https://arxiv.org/abs/2004.10474).
  - SRI-CSL-2024-01 marks defeaters active, retired or accepted (https://arxiv.org/abs/2405.15800) [V].
  - Reviewers disagree about the quality of AI-proposed defeaters (kappa < 0.442; https://arxiv.org/abs/2607.06039).
  - → Each claim gets a defeater log and an *m|n* doubt count (doubts eliminated out of doubts identified), never summed or gated. The tutor proposes defeaters; it never retires one.
- **Understanding.** Bloomfield's Personal Understanding Statement (2026-04-07; https://arxiv.org/abs/2604.05662) is a position paper. → Pilot one unassisted statement per viva.
- **How serious 2026 evaluations report.** They check outside the agent's environment against a declared threat model. OEIS Open claimed 147 solves, 144 of them confirmed under Comparator (https://arxiv.org/abs/2608.11941) [V]. → The report adds CONFIGURED, NOT COVERED, a checker matrix, statement hashes, budgets and advisories.
- **Release gate.** "A new version of Cedar isn't released unless its model, proofs, and differential tests are up to date" (https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/) [V]. → Apply the same gate to the course itself.

---

## 3. Version-pinned stack and the honest split

Receipts record each version, SHA-256 or commit. Tool versions carry a TTL of 60–90 days in the claims registry.

| Layer | Pin (date) | Licence | Runs |
|---|---|---|---|
| SMT, tab | Pyodide 314.0.7 (2026-09-14) + `z3_solver-5.3.1.0` wheel (2026-10-15) | MIT [prior] | tab, own origin [X] |
| SMT, Bench | z3 5.3.1; cvc5 1.4.2 (2026-10-08); cvc5 1.3.1 for SymCC | MIT; BSD | Bench |
| Proof | Lean v4.35.0, core-only; elan 4.2.4; `lean-action` v1.6.2 | Apache-2.0 [prior] | Bench (Linux + `bwrap`) |
| TLA+ | `tla2tools` 1.8.0 jar, SHA-pinned (1.7.4 fallback, no JSON); Java 21 | MIT | Bench [X] |
| TLA+, tab | Spectacle `5827c22` (2026-09-30), vendored | MIT | tab [X] |
| TLA+, opt-in | TLC on CheerpJ 4.3 (2026-04-21) | CheerpJ Community | tab, online |
| Symbolic TLA+ | Apalache v0.62.4 (2026-10-12) | Apache-2.0 | Bench |
| Relational | Alloy 6.2.0, Java 17+ | MIT | Bench |
| Database | PostgreSQL 18.6; PGlite 0.5.11 (2026-10-21) | PostgreSQL; [U] | Bench; tab |
| Rust + PG | `tokio-postgres` 0.7.18, `testcontainers` 0.28.0, `postgresql_embedded` 0.22.0, `pg_query` 6.2.1, `proptest` 1.12.0 | various | Bench |
| Datalog, policy | Soufflé 2.5; `ascent` 0.8.1; TS evaluator; `cedar-policy` 4.14.0; OPA v1.21.3; Regorus 0.13.0 | various | Bench; tab |
| Rewriting | egglog 3.0.0 | [U] | tab; Bench |
| Certificates | Carcara at cvc5's `contrib` commit | Apache-2.0 | Shelf |
| Shelf | Kani 0.68.0; Verus `release/0.2026.10.18.7d82994`; Aeneas; Velvet | various | Bench |

**Drift since 2026-10-20** [V]: PGlite went to 0.5.11; the TLC tag was re-published; Spectacle's HEAD moved; the WASM fork's lag grew to 998. Everything else is unchanged.

**Avoid:** Stateright, madsim, DDlog, Oso OSS, jsCoq, embedded Alloy4Fun, self-hosted CheerpJ, and CheerpJ in anything commercial beyond a one-person company.

| Capability | Tab, self-hosted | Tab, opt-in third party | Bench (authoritative) |
|---|---|---|---|
| SMT | Z3Py on Pyodide | — | Z3 + cvc5 |
| Lean | Generated Goal Replay; `#guard_msgs` Call-Its; WASM practice cell | live.lean-lang.org | `lake check --paranoid`, `lake comparator` |
| TLA+ safety | Spectacle ≤ ~5k states; TLC graphs | TLC via CheerpJ | TLC |
| TLA+ liveness | Imported TLC traces (lasso JSON [U]) | TLC via CheerpJ | TLC |
| Inductive invariants | — | — | Apalache |
| Relational | Recorded instances | Alloy4Fun | Alloy CLI |
| Datalog, policy | TS evaluator; Regorus; `cedar-wasm` | Nemo | Soufflé, `ascent`, SymCC |
| SQL | PGlite, single session | — | PG 18.6 multi-session, `isorun` |
| Simulation | Recorded seeds | sim.tigerbeetle.com | Own simulator |

**Lean lanes**
- Native: VS Code plus elan.
- A devcontainer with the `bwrap` options [X A5].
- Codespaces: about 60 free hours a month on 2 cores (https://docs.github.com/en/billing/concepts/product-billing/github-codespaces) [V].
- A build bot with explicit `run:` steps.

GitHub's ubuntu-24.04 runners are [U].

**CI gates**
- `verify:calls`;
- `verify:replay`;
- `verify:conformance`: Spectacle = TLC; Pyodide Z3 = native Z3; PGlite = PG 18.6; TS Datalog = Soufflé;
- `verify:labs`, run monthly;
- solved queries stay solved across solver bumps (Zelkova);
- a seed-variation brittleness check (AuthV2).

**Verdict → stamp** (condensed from R5 §3.3):

| Raw output | Stamp |
|---|---|
| `unsat` on the learner's encoding | PROVED (of the encoding); a defeater stays open: "encoding unverified" |
| `sat` + model | REFUTED, after replay |
| `unknown`, timeout, `rlimit` | UNKNOWN; fails closed in enforcement |
| Bounded pass | CHECKED[bound] |
| DRT, no divergence | TESTED[n, generator statistics] |
| DRT, shadow or gold-query mismatch | No stamp; a defeater against both sides |
| `_native` axiom | PROVED[kernel + compiler] |
| "Results match" on one database | TESTED[1 instance] |
| An LLM says "equivalent" | No stamp |

---

## 4. AI × FV failure taxonomy (audit material)

**The pattern** (R2 §2.7). None of 37 incidents shows a wrong proof of a correct statement passing a working kernel; every accepted wrong proof went through a harness or kernel bug. Kleppmann (2025-12-08) predicted the challenge "will move to correctly defining the specification" (https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html) [V].

| ID | Gap | Real incidents (date, source) | Detect | Plinth seed |
|---|---|---|---|---|
| S1 | Misrepresentation | PutnamBench #366, #368, #363 (2026-10-13; https://github.com/trishullab/PutnamBench/issues/366) [V]; Erdős #124, "= 1" for "≥ 1" (2025-11; https://www.erdosproblems.com/forum/thread/124) | Back-translate; parenthesise; check ∀∃ order | `ok a ∧ bal a ≥ amt → …` |
| S2 | Type semantics, junk values | Kimina #11: a dropped `(1/4 : ℝ)` ascription leaves "0 = 0" over ℕ (2026-09-13; https://github.com/MoonshotAI/Kimina-Prover-Preview/issues/11); PutnamBench #348 (2026-08-25); Erdős #480 (https://xenaproject.wordpress.com/2025/12/05/formalization-of-erdos-problems/) | Evaluate small values; `autoImplicit false` | `Nat` balances |
| S3 | False as written | PutnamBench #347 (2026-08-13); VERINA PR #17, merged 2026-04-17, fixed specs in 18 tasks and code in 9 (https://github.com/sunblaze-ucb/verina/pull/17) [V] | Look for a counterexample first | Self-transfer conservation |
| S4 | Vacuous premise | PutnamBench #361 (2026-10-12): a refactor made the premises inconsistent; #365: a fix reopened the hole [V] | Premise witness | An unreachable `requires` |
| S5 | Answer in the statement | FormaTheoria (2026-08-11; https://arxiv.org/abs/2608.10894); comparator's `ChallengeSolution := RiemannHypothesis` example | Use-site test; held-out spec | `ensures result = transfer_impl s` |
| S6 | Weak spec | AlphaVerus (https://arxiv.org/abs/2412.06176); Spec-Harness: 22.7% of accepted specs have no postcondition (https://arxiv.org/abs/2604.00280); VERINA: 52.3% (https://arxiv.org/abs/2505.23135) [V] | Mutation-test the spec | `refund_nonneg` |
| S7 | Intent mismatch | Gemini on Erdős: 13 of 200 "meaningfully correct" (2026-01-29; https://arxiv.org/abs/2601.22401); AlphaProof Nexus "density" (https://arxiv.org/abs/2605.22763) | The owner restates it | "No tenant observes any change" |
| S8 | Non-functional omission | AxDafny: 89 of 127 verified programs failed resource limits (2026-06-30; https://arxiv.org/abs/2606.32007) [V] | Bounds, or NOT COVERED | A ledger replay per transfer |
| T1 | Escape hatches | AlphaVerus `assume(false)`; AlphaProof Nexus: "prompting against this behavior failed to prevent it"; Verus guide cheat list (https://verus-lang.github.io/verus/guide/print.html) [V] | `lake check`; grep the diff | `conservation_aux` via `sorry` |
| T2 | Native trust | Kimina #11: 15 of 225 solutions use undisclosed `native_decide` | Version-aware axiom names | `native_decide` over 2^64 |
| T3 | Tampering | FormalQualBench (runs 2026-03-18/19): agents tried "elaborator-level workarounds"; "Comparator catches the illegal axiom" (https://math.inc/formalqualbench) | Challenge files; hashes | The agent edits `Inv` |
| C1 | The check never ran | Old REPL (https://arxiv.org/abs/2507.14722); `apply?` before 4.20 (https://arxiv.org/abs/2606.29493) | Out-of-band replay | Wrong CI target |
| C2 | Unsound checker | #14576 (fixed 2026-07-28; https://github.com/leanprover/lean4/issues/14576); 4.33's kernel PRs (12, mixed labels; two "affecting users of comparator"); 4.34's AI-found issues; STORM, 29 critical bugs in 7 SMT solvers (2020; https://arxiv.org/abs/2004.05934) | Current external kernels; second solver | Erosion: "the kernel was wrong" |
| C3 | Dependent or disagreeing checkers | lean4lean shares #14576; OEIS Open: Comparator and SafeVerify disagreed on five defective formalizations; Lean #15643 (2026-10-13), `leanchecker` rejects a valid `rfl` [V] | Diverse checkers; triage | Z3 vs cvc5 |
| C4 | Engine defect or misread verdict | Nemo filter bug (2026-08-01); SQLSolver NEQ; Regorus | Versions; verdict table | Erosion E8 |
| M1 | Textbook model, arbitrary fairness | SysMoBench (https://arxiv.org/abs/2509.23130) | Trace validation | Generic 2PC as the outbox |
| M2 | Code bent to fit the proof | Verus guide; Spec-Harness, 5.6% changed code | Diff the code; DRT | Rewritten `transfer` |
| M3 | Gaming under pressure | METR (2025-06-05): "nearly negligible effect" of anti-cheat prompts (https://metr.org/blog/2025-06-05-recent-reward-hacking/); ImpossibleBench (2025-10-23): an abort option cut GPT-5's cheating from 54% to 9%, "much less pronounced" for Claude Opus 4.1 (https://arxiv.org/abs/2510.20270) [V] | An abort path; out-of-band grading | Impossible brief |
| R1 | Snapshot drift | PutnamBench #353 (2026-09-13): 187 of 672 statements edited [V] | Pin revisions | Spec edited after minting |
| R2 | Provenance and budget | AxiomProver's formalizer unstated; FrontierMath Erdős off-protocol runs over $220k (https://arxiv.org/abs/2609.25050) | Author, hash, n, cost | 1 of 20 seeds |
| R3 | Common-mode evidence; test as proof | AuthV2; SpotIt's wrong gold SQL; CIDR's "results match" | Evidence source on receipts | "Matches the dev DB" |

**Mapping to v1's 12 gap classes:**
- S1 → 1/12; S2 → 4; S3 → 12; S4 → 2; S6 → 1; S7 → 12;
- T1 and T2 → 6; M1 → 7/8; M2 → 8; R3 → 11;
- new: S5, S8, T3 and C1–C4;
- lenses rather than classes: M3, R1 and R2.

**Design rules**
- **25–35% of Audit Desk cases are sound**, and both precision and recall are scored. With v1's 4 sound cases in 32, rejecting everything scores 87.5% precision.
- **Each case has a "based on" card** (incident, date, URL). Never ship exploit code.
- **Drills are generated by mutation:** drop parentheses, swap ∀∃, ℤ→ℕ, add a contradictory hypothesis, move the conclusion into a premise, insert `native_decide`, weaken a postcondition, drop fairness. Each mutation gives Today a fresh seed.
- **Base-rate cards are labelled "context-specific".** Example: miniF2F mismatched "more than half of the problems" (https://arxiv.org/abs/2511.03108).
- **`AGENTS.md` is advice, not evidence.** It denies edits to `challenge/**`, but grading never relies on it.
- **Revise the taxonomy.**
  - Merge R2's new classes (S5, S8, T3, C1–C3) with R5's undermining classes.
  - Rename class 4 "encoding and type-semantics slip".
  - Regroup the classes as rebutting, undermining or undercutting.

---

## 5. Exemplars to borrow from

| Borrow | From | Boundary |
|---|---|---|
| Statement-integrity receipts | SF: "If the type is not ok, it means you proved the wrong thing" (https://softwarefoundations.cis.upenn.edu/lf-current/Basics.html); Michigan's `.t.dfy` files; comparator | Only as good as the challenge |
| Spec oracles | UQ's conjuncts; Forge's wheats and mutants (https://doi.org/10.1145/3649833); Alloy4Fun's labelled instances (https://arxiv.org/abs/1907.02275) | Obfuscation is not secrecy |
| An authoring contract | TLA+ By Example; Verso proof states (https://github.com/leanprover/verso) | TLC stays authoritative |
| Build your own VCG | LoVe10; Concrete Semantics §12.4 | `vcgen` is experimental |
| A correspondence kit | Pact properties; Michigan; `cedar-drt` | Pact is archived |
| Misconception-coded items | LTL Tutor: "Implicit G" behind 28.68% of errors (https://doi.org/10.1007/978-3-031-98685-7_9) [V] | Track effects with VRK₃₀ |
| Inventories, recorded rather than locked | lean4game's `NewTactic` and `Branch`; Forge's Froglet | GPL-3.0: copy mechanics |
| Explanation-graded proofs | CMU 15-414 F26: "Categorical answers with no explanation will not even receive partial credit" (https://www.cs.cmu.edu/~15414/) | — |
| Claim graph and errata | leanblueprint (https://github.com/PatrickMassot/leanblueprint); "Crediting Error Finders" (https://forge-fm.github.io/book/2026/) | — |
| Timed problems | VerifyThis 2026: 90 minutes, with AI use declared (https://verifythis.github.io/) | — |

**Where v1 already leads (keep these).** No exemplar measures calibration (Call It), schedules erosion, or grades agent review on both precision and recall.

**Plinth's arc is new.** No course builds an application-semantics language aimed at a database (an absence result). Pact, Michigan and Cedar are the nearest precedents.

**Evidence caveat.** Forge: "We do not claim to measure learning efficacy". A field survey calls evaluation "still at its debut" (https://doi.org/10.4204/EPTCS.419.1).

---

## 6. Cross-links and alignment

- **byzantine** owns Raft, partitions and Jepsen-style checking; share elle-cli with it.
- **tablespace** owns MVCC internals and the planner.
- **kernelspace** supplies the claims-registry schema, "this has changed" cards, H1 guardrails, VRK₃₀ and seeded generators.
- **Twin labs.** Lean reference models plus differential random testing leave the residual risk in the spec; Block Public Access shows UNKNOWN is not safe; pin Carcara by commit.

---

## 7. Open questions, ranked by what blocks authoring

1. Does `bwrap` run on GitHub's ubuntu-24.04 runners and on Docker Desktop? Default Docker fails [X A5].
2. Does `vcgen` work on a custom `Cmd`, and will 4.36 or 4.37 change the syntax again?
3. How does TLC's JSON represent a liveness lasso? Does Spectacle cover every operator the course uses, and does it fetch `EXTENDS` modules remotely [U]?
4. In PGlite, does RLS work under `SET ROLE`, and how big is the first load?
5. Catalogue rows H03, H04, H06, H09–H12, H16, H17 and H20 need recorded 18.6 runs.
6. Is CheerpJ acceptable under "zero servers, no telemetry"? This is an owner decision; default no.
7. How long does `--paranoid` take on a laptop or a 2-core Codespace?
8. Can Pyodide Z3 solve SymCC's SMT-LIB?
9. How large and fast is Nemo-WASM on phones? Is Soufflé stable on ARM?
10. What are the base rates for agent-written application specs? None were found.
11. What should "independent checker" require, given that lean4lean is a port?
12. Do defeater logs and Understanding Statements help learners? Pilot them.
13. Licences: TLA+ By Example (NOASSERTION); lean4game, LTL Tutor and Carnap (GPL-3.0); LoVe (BSD-3).
14. Still unverified:
    - the trace-validation venue;
    - the AuthV2 DOI;
    - Troubadour;
    - AWDIT's bounds;
    - the FormalQualBench literal;
    - public Lean Workbench and Comparator Live instances;
    - an official browser-Lean timeline.
