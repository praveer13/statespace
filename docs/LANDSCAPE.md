# statespace: the landscape, as of 2026-10

**Status:** the dated, sourced state of the field for statespace v2. It records what changed in the tools and the literature that the ten stages teach, the corrections made on the way, the version pins, the split between what runs in the tab and what runs on the Bench, and the rules that keep these facts from going stale. It is a reference page, not learner-facing copy, and it adds no claim of its own: every row restates the landscape digest (`research/synthesis/digest-landscape.md`), BRIEF §2, an executed run or the spine, and says which. Every ID comes from `docs/spine/SPINE.md`. **Date:** written 2026-10-24 (machine clock, PDT); the volatile pins were last re-checked on 2026-10-23, and a timestamp ending in Z is UTC. **Review:** the owner reviewed the owner decisions on 2026-10-25 (spine §1.2; DECISIONS.md, section 1); OD-4 (disclosed link-outs) and OD-12 (edition pins), both accepted, shape this page most.

**Precedence.** The spine's order applies: the roadmap [roadmap] sets scope; executed runs (`research/spikes/RESULTS.md`, `research/evidence/`) beat any report; then the brief, the four digests, the reports and reviews, kernelspace, and the v1 design. Where a run disagrees with the digest or the brief, this page follows the run and says so in the row (the PGlite version, the toolchain download size, the Docker flags, the WASM payload, the Pyodide first-load size). The spine [spine] wins where it differs from this page.

**Tags.**

- `[X RUN-id]` is an executed run whose output is on disk and registered in spine §9.5. `[X key]` is an executed fact recorded in `research/spikes/RESULTS.md` or a run log that the spine has not registered as a run; the key names the source ([spikes], [a5logs], [a2logs], [r1m]).
- `{{run:RUN-id}}` is a run that must be recorded before a sentence that uses it ships in lesson copy. On this page it also marks a fact that was reported, or measured only in part.
- `[V]` is a fact re-checked against a primary source, by the independent fact-check pass of 2026-10-21 or by the API re-check of 2026-10-23, as the digest records; a row names the date when it matters. A `[V]` fact is a dated reading and never stands in for a run: lesson copy that states a tool number, verdict, flag or version cites a run (I4; GATE-numbers). `[2nd]` is second-hand, `[U]` unverified, `[D]` an inference or design rationale.
- Lowercase keys in brackets resolve in §10 and keep BRIEF §9's names where they exist. Stamp codes ([P], [M], [T], [E], [A], [?], [N], [R]) mean what spine §8.7 says and appear here only where a spine row is quoted.

**Reading the rows.** The stage tables in §2 have three columns: the fact with its date and tag, its source keys, and where the spine uses it. A dash in the last column means the spine does not place the fact; it stays here as field state. The consequence that the digest or brief drew is restated after the fact, with spine IDs where the spine adopted it.

**Contents.** §1 thirteen deltas · §2 the field, stage by stage · §3 corrections ledger · §4 version-pinned stack · §5 the tab and the Bench · §6 volatility rules and TTLs · §7 dated incidents · §8 exemplars and sibling courses · §9 open questions · §10 source index · §11 spine issues.

**What this page leaves out.**

- The superseded sentences behind §3. The deny-list that GATE-numbers keeps for BRIEF §2.2 lives in the gate's own fixture file and is never shipped, so §3 gives each correction as a topic and its correct statement.
- Learning-science sources, which BRIEF §9 and the pedagogy digest hold.
- One vendor-documentation URL that the digest cites for a claim it marks [U] and the brief rules out of scope (§2.7). It is omitted on purpose, not lost.
- Anything about the learner's own product. Where a fact bears on it, the page says "your system".

---

## 1. Thirteen deltas that change content, tools or labs

BRIEF §2.1, with executed facts tagged and each row's landing in the spine added. The V2 change IDs (V2-01 to V2-33) are the brief's, kept in spine §12.1.

| # | Fact (date) | Consequence | Source | Lands in |
|---|---|---|---|---|
| 1 | An AI-assisted, `sorry`-free "disproof" of Collatz (2026-07-25) passed Lean's kernel, a fresh `leanchecker` replay and a week-old nanoda by chaining two separate bugs. lean4lean shares the kernel bug. The fix (#14577) landed on 2026-07-28 and ships in v4.32.2 [V] | A stamp names its checkers and versions; an advisory can reopen a stamp; "independent" means separately designed | [pmortem][oss14576][leancmp] | spine §8.7 (checker@version); SEAM-15; S2.L9; SP-2.6; S2.L10 |
| 2 | Lean v4.35.0 (2026-10-12): `lake check` replays the export through the kernel; `lake comparator` matches statements against a challenge; `--paranoid` adds the bundled lean4lean, nanoda, con-leche, con-ron and leanchecker-paranoid; builds run in a bubblewrap sandbox, Linux-only [V]. The unpacked toolchain ships those binaries, and `lake comparator --paranoid` ran six checkers on the course's ledger in about 3 s [X RUN-lean-toolchain, RUN-lean-comparator]; `lake check --paranoid` replays the whole environment and took 172.6 s on the LAB-2 pack [X RUN-bwrap-lanes] | Challenge packs, receipts and audit ground truth (V2-01) | [lean435][leanrel] | V2-01; LAB-2's challenge pack; receipt@1 (spine §9.4); `statespace check` (spine §9.6) |
| 3 | Statements, not proof search, are where it fails: five entries reached 672/672 on PutnamBench (2026-08-26 to 2026-09-24), yet misformalized statements were still being filed on 2026-10-12 and 2026-10-13. Formal Conjectures (2026-05-13) made 291 fixes, 48.1% of them misrepresentation [V] | Spec-it items; dated "based on" audit cards | [putnamres][putnam366][formconj] | GEN-negate-it; GEN-spec-it; AUD-1.1; the "based on" cards (spine §6) |
| 4 | Core Lean is enough [X RUN-lean-ledger]; a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib]; the `grind` proof of conservation uses `Classical.choice`, the `omega` proof does not [X RUN-lean-axioms] | No Mathlib in S2 to S9; automation recorded on stamps; manual mode for taught steps | [spikes][a5logs][r1m] | S2; M-manual-mode; KC-2.automation-scope; the automation flags of receipt@1 |
| 5 | Lean `vcgen` is experimental. `requires` and `ensures` arrived in 4.34, `given` in 4.35, `throws` in 4.36.0-rc1 [V] | A dated production twin, shown after the learner's own VC generator; spike it first | [vcgen][lean435] | S4.L9; SP-4.7 [X RUN-lean-vcgen]; W0-S07 |
| 6 | Real engines run in the tab: Z3Py on Pyodide without COOP and COEP in Chromium, Firefox and WebKit [X RUN-z3-starter-pyodide]; Spectacle's state counts equal TLC's (11, 45, 191 and 813) [X RUN-spectacle, RUN-tlc-full]; PGlite reports PostgreSQL 18.6 on one connection. The brief's row names PGlite 0.5.11; the first run on disk was 0.5.10 [X RUN-pglite], and W0-S08 recorded the 0.5.11 pin [X RUN-pglite-0511] | Drop v1's npm shim and DSL explorer (V2-12, V2-13) | [a5logs][spectacle][pglite][dr2] | INS-z3; INS-spectacle; INS-pglite; V2-12; V2-13 |
| 7 | Execution falsified three v1 mock-up claims: a concurrency verdict, a 64-bit mechanism and a TLC state count [X RUN-pg-anomalies, RUN-tlc-doublespend] | A runs registry (V2-03) | [spikes] | spine §9.5; GATE-numbers; GATE-facts; GATE-runs; §3 below |
| 8 | TLA+ tooling lags. No stable TLC since v1.7.4 (2024-08-05); v1.8.0 is a rolling pre-release, re-published 2026-10-24T01:42Z [V]. Learn TLA+ still lists exercises and refinement as future work, and its last content dates from 2023-08-02 | Pin the jar by SHA; the course writes its own exercises and refinement lessons; adopt TLA+ By Example's authoring contract | [tlarel][learntlanew][tlabyex] | INS-bench-tlc [X RUN-tlc-jars]; LAB-5; the S5 production twin |
| 9 | Solvers have bugs. Z3 #11179, an incorrect unsat, was opened and closed 2026-10-15 [V]; on the issue's inputs 5.3.0 returns `unsat` on both satisfiable inputs and 5.3.1 returns `unknown` [X RUN-z3-11179]. cvc5 1.4.0 (2026-09-17) disabled VTS over soundness issues [V]. Alive2's BugList (2026-01-12) lists 24 Z3 bugs, 4 of them unsound [V] | Solver-only results stamp "uncertified"; authored unsats are cross-checked with cvc5 | [z3-11179][cvc5rel][alive2bugs] | spine §8.8; SEAM-7; ER-7; SP-4.5; GATE-calls (V2-12) |
| 10 | Residual risk sits in the spec. Cedar pairs a Lean model with a verified SMT compiler and differential random testing (DRT): proofs found 4 bugs, DRT and property-based testing 21. All 7 of AuthV2's shadow mismatches were spec errors. About 32% of LLM SQL rewrites changed results [V] | Evidence layers in S7; SQL validation in S9; a verdict-to-stamp table | [cedar24][authv2][cidr26] | the S7 production twin; S9.L8; spine §8.8 |
| 11 | PostgreSQL 19: RC1 2026-10-15; GA planned 2026-11-19 [V]; its release notes list no isolation or RLS changes | Pin 18.6; link `/docs/18/`; re-record the catalog after GA | [pg19rc1][pg19notes] | OD-12; INS-bench-pg; W6-T07 |
| 12 | LLM-written TLA+ specs violate 41.9% of liveness properties against 8.3% of safety properties, and choose fairness that is "overly technical or random" [V] | A liveness base-rate card and audit cases | [sysmobench] | AUD-5.1; AUD-5.2 |
| 13 | Outcome evidence for formal-methods courseware is thin; the best is a novice randomized trial with n = 332. Forge: "We do not claim to measure learning efficacy" | Import designs, not effect sizes; measure VRK₃₀ | [poulsen23][forge][eptcs419] | spine §2.3 (VRK₃₀) and §2.4; M-proof-blocks |

---

## 2. The field, stage by stage

Facts are those of the landscape digest §2 and BRIEF §2, tagged by what was run or re-checked. A stage's lesson, lab and instrument IDs are in spine §3; its tool is named in the heading.

### 2.0 Boot and the ground drawers

Boot (S1.L0) and the drawers D-01 to D-06 replace v1's separate ground course (V2-20).

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| AWS Automated Reasoning checks (GA 2025-08-06) return seven verdicts: VALID, INVALID, SATISFIABLE, IMPOSSIBLE, TRANSLATION_AMBIGUOUS, TOO_COMPLEX and NO_TRANSLATIONS. The documentation says "A VALID result covers only the parts of the input captured through policy variables". *Consequence:* map the verdicts onto stamps (SATISFIABLE is close to missing premises, IMPOSSIBLE to vacuous, TRANSLATION_AMBIGUOUS to UNKNOWN) and teach "who wrote the statement?" as a reading move | [awsarc] | the S1 production-twin card that maps the seven verdicts onto stamps (spine §3.1) |
| PutnamBench #366 (precedence) and #368 (∀x∃ written for ∃∀x) were both filed 2026-10-13 [V]. *Consequence:* seed the precedence and quantifier drills | [putnam366] | the audit mutation operators "drop parentheses" and "swap ∀ and ∃" (spine §6.2); AUD-1.1 cites #361, filed 2026-10-12 |
| Proof Blocks: a randomized trial with n = 332 novices. *Consequence:* ordering warm-ups only | [poulsen23] | M-proof-blocks; S2.L4 |

### 2.1 S1 Counterexample (Z3Py)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Z3 5.3.1 (PyPI 2026-10-15, npm 2026-10-16) reproduces the roadmap's starter exactly: `sat [b = 0, amount = 1, a = 0]`, then `unsat` after `amount <= a` [X RUN-z3-starter]. It was still the latest on 2026-10-23 [V] | [spikes][pypiz3] | S1.L0; S1.L1; LAB-1.1 |
| The npm `z3-solver` package needs threads, SharedArrayBuffer and COOP and COEP headers, and its WASM is 34.6 MB (35.5 MB unpacked) [X spikes]. *Consequence:* drop the npm lane | [spikes] | V2-12 |
| The PyPI `pyemscripten` wheel (6.5 MB) [V] on Pyodide 314.0.7 ran the starter in Chromium 153, Firefox 155 and WebKit 26.6 without cross-origin isolation, ready in 1.46 to 1.71 s [X RUN-z3-starter-pyodide]. The first-load size, runtime plus wheel, is 12,893,420 B as gzip level 5, the same in every engine; phone timings are emulated, because no real device is on file [X RUN-phone-pyodide] | [a5logs][pypiz3][npmpyodide] | INS-z3; W0-S02 |
| Under Pyodide in a Node harness, Z3's `timeout` never returned (stopped at 25 s), while an `rlimit` of 5e6 gave `unknown (canceled)` in 1.1 s [X RUN-z3-budget-pyodide]. In Chromium, Firefox and WebKit (Playwright's desktop builds, not phones) the same `timeout` had not returned when a 25 s watchdog ended the worker [X RUN-phone-pyodide]. *Consequence:* budgets are `rlimit`, and `worker.terminate()` is the hard stop | [a5logs] | INS-z3 honest limits; SP-1.8; S1.L2 |
| The opaque-origin sandbox that kernelspace uses fails for Pyodide in Chromium. A separate origin with a module worker runs Z3 in all three engines and cannot read the parent's storage [X RUN-browser-origin]. *Consequence:* Pyodide Z3Py on its own origin | [a5logs] | OD-5; I6; W0-S01 |
| The Z3 Guide also runs Pyodide (pinned 314.0.4 with z3 5.1.0.0) | [z3guide][r6] (F17) | — |
| Models are not canonical. The native probe and the Pyodide probe returned different recipient-wrap witnesses (native: B = 9223372036850581504, amount 4194304; Pyodide: B = 9223336852482686975, amount 9223372036854775803). They were different queries, though: the native one carried the sender's guard and a third variable. Both witnesses are valid, and no same-query comparison is on disk [X RUN-z3-bv64, RUN-z3-bv64-pyodide]. *Consequence:* a call asserts verdicts and witness properties, never model values [D] | [spikes][a5logs][dr2] | spine §8.4; GATE-calls; SP-1.4 |
| One transfer, four encodings. `Int` hides overflow. Under `BitVec 64` the guard protects the sender, not the recipient [X RUN-z3-bv64]. `bv_decide` refutes the unguarded subtraction with `a = 0` and `amt = 2^63` [X RUN-lean-bv-decide]. PostgreSQL raises 22003 [X RUN-pg-anomalies] | [spikes][r1m][reports] | S1.L5 and its six-row table; SP-1.4; SP-1.5; ER-1 (S6.L4, SP-6.4) |
| Solvers have bugs: Alive2's BugList (2026-01-12) lists 24 Z3 bugs, four of them unsound; cvc5 1.4.0 (2026-09-17) disabled VTS over "soundness issues"; Z3 #11179 (see §2.4). *Consequence:* a footnote on `sat`, `unsat` and `unknown` | [alive2bugs][cvc5rel][z3-11179] | SEAM-7; S1.L2; S1.L3; KC-1.three-answers |
| Pact's archived tutorial refutes a negative-amount theft and a self-transfer that "creates money out of thin air!" [V]. *Consequence:* a reading card, and a guard checked against the correct, mutated and trivial transfers with a premise witness | [pact] | GEN-negate-it; GEN-spec-it (a non-vacuity witness is mandatory); KC-1.non-vacuity-check |

### 2.2 S2 Proof (Lean 4)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Lean v4.35.0 shipped 2026-10-12 and v4.36.0-rc1 on 2026-10-14; nothing newer had shipped by 2026-10-23 [V]. 4.36.0 is likely in mid-November [D]. *Consequence:* pin 4.35.x per edition, and run the labs monthly on the pin and on the newest stable | [leanrel][lean435] | OD-12; GATE-labs (monthly on the newest stable Lean) |
| Core only. On core Lean 4.35.0, `Ledger.lean` proves conservation, non-negativity, rejection and `run_conserves`; both conservation theorems use only `[propext, Quot.sound]`; the self-transfer mint is proved by `decide` [X RUN-lean-ledger, RUN-lean-selftransfer]. A Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib], and `Std.TreeMap` has the lemmas the ledger needs. *Consequence:* no Mathlib in S2 to S9; if ever needed, use Hex's `*-theory` split | [spikes][a5logs][treemap][hex] | S2; LAB-2; SP-2.1; CL-2.1 to CL-2.4 |
| Install weight: the Linux toolchain is a 594.5 MB download [V] and unpacks to 3.0 GB [X RUN-lean-toolchain] | [leanrel][r1m] | INS-bench-lean; D-15 |
| Automation: `grind` shipped in 4.22 (2025-08-14), and cutsat became `lia` in 4.27 (#11330) [V]. In the measured ledger, `grind` closes the conservation and non-negativity goals after `unfold transfer; split` [X r1m]. The `grind` proof of conservation uses `Classical.choice`; the `omega` proof does not [X RUN-lean-axioms]. *Consequence:* teach statements, goals and axioms: a "which axioms?" Call It, explanations without tactic names, automation recorded on the receipt and never blocked | [lean427][r1m] | KC-2.automation-scope; S2.L6; M-manual-mode; GEN-which-stamp |
| The ladder of validation: blue check marks, `#print axioms`, `lean4checker`, and "Gold Standard: comparator and external checkers". The manual separates "does the theorem have a valid proof" from "what does the theorem statement mean" and treats "un-reviewed AI-generated proofs and programs" as potentially malicious. The page the digest re-read lags the binary: it uses the old `lean4checker` name and lists only nanoda [V]. A `sorry` builds with exit code 0 [X RUN-lean-axioms]; `_native` axioms appear per use since 4.29; PR #14953 (merged 2026-08-28) removed `trustCompiler` [V]. *Consequence:* S2.L9 with real outputs; add TPIL chapter 12 and "Did you prove it?" | [leanvp][leanvp-latest][lean-pr14953][tpil][didyouprove] | S2.L9; SP-2.4; SP-2.5; KC-2.axioms-and-trust |
| From `lake help check` and `lake help comparator` [V]: a `bwrap` sandbox; exit codes 0, 1 and 2; `--paranoid` adds five checkers; `permitted_axioms` is "deliberately not defaulted". PR #14990 (merged 2026-09-07) added `lake check`. `--paranoid` runs six checkers in all; `lake comparator --paranoid` takes about 3 s on the course's small ledger [X RUN-lean-comparator], and `lake check --paranoid` takes 172.6 s on the LAB-2 pack, because it replays the whole environment [X RUN-bwrap-lanes] | [lean435][lean-pr14990] | `statespace check` (spine §9.6); LAB-2.c2 |
| Two verdicts, not one. A planted `sorryAx`, `_native` or custom axiom exits 1, yet the log still says "Lean default kernel accepts the solution" [X RUN-lean-axioms]. A `debug.skipKernelTC` proof of `False` builds with exit 0 and `leanchecker` rejects it [X RUN-lean-skipkernel]. *Consequence:* a receipt parses every verdict and never trusts an exit code alone | [r1m][a2logs] | SP-2.4; SP-2.5; SP-2.6; spine §9.4 |
| Comparator verdicts: honest, "Your solution is okay!"; a redefined `transfer`, "Const does not match"; a weakened statement, "theorem statement do not match" [X RUN-lean-comparator]. *Consequence:* each lab ships a read-only `Challenge.lean` and a `comparator.json`; receipts add toolchain, `checkers[{name, version, verdict}]`, `challengeSha`, `nativeAxioms` and sandbox; a `_native` axiom reads "kernel + compiler" | [r1m][a5logs] | SP-2.7; AUD-2.4; LAB-2's challenge pack; spine §9.4 and §8.8 |
| Docker. Under default Docker, bubblewrap exits 1, the code of a rejection; with no bubblewrap the exit is 2 [X RUN-lean-bwrap-docker]. W0-S06 recorded what starts the sandbox in a container: a seccomp profile that allows `clone`, `unshare`, `mount`, `umount2` and `pivot_root` (Docker's default plus one rule), `/proc` unmasked (`systempaths=unconfined`) and a `/run/user` directory in the image; a stock Ubuntu 24.04 host also needs AppArmor's restriction on unprivileged user namespaces lifted [X RUN-bwrap-lanes]. A verdict then took 1 to 2 s [X RUN-lean-comparator]. Lane verdicts on CI runners, Docker Desktop and Codespaces: {{run:RUN-bwrap-lanes}} (W0-S06 ran stand-ins only) | [a5logs] | SP-2.8; INS-bench-lean; D-15; W0-S06 |
| `lean-action` v1.6.2 has no input for `lake check` or `lake comparator` [V] | [lean-action] | the Bench lanes (§5.2) |
| Trusted challenges: Comparator Live hashes a challenge as `sha256(challenge.trimRight() + "\n")`, and lean-eval counts a problem solved "iff comparator accepts" [V]. No public Comparator Live instance was found [U]. *Consequence:* hash the same way and publish trusted hashes per edition | [comparator-live][lean-eval] | spine §9.4 (`statements[]`); I7 |
| The incident: the advisory says exploitation "requires execution of a metaprogram within the Lean process (e.g., as part of building a project or importing a dependency)" (2026-08-02) [V]. *Consequence:* link it and ship no exploit code; it explains why `lake check` sandboxes the build and replays an export | [oss14576][pmortem] | S2.L9; SEAM-15 |
| New since the snapshot: for perceived soundness bugs, Lean's issue template now asks "Does it affect `lake check --paranoid`?" and points reporters to the Lean FRO's security contact; visible in issue #15717 (2026-10-15) [V] | [lean-15717] | SEAM-15 (advisories become change cards); M-change-cards |
| Agents: lean-lsp-mcp 0.31.0 (2026-09-30, beta) includes `lean_verify`; Lean Beam is the FRO's preview MCP server and skill. *Consequence:* `AGENTS.md` wires in the read-only tools and protects the bodies of `TODO(you)` proofs (kernelspace H1) | [lean-lsp-mcp][lean-beam] | the agent kit (spine §11.1); GATE-guardrails |
| NNG4 is pinned to Lean v4.23.0, and its host was intermittent on 2026-10-20 and 2026-10-21. *Consequence:* fallbacks are the community build's own game page and the devcontainer | [nng4][cau-game] | S2.L1; D-08 |
| Lean in the browser: no official WASM asset has shipped since v4.15.0 (2025-01-04) [V]. The community build at `lean.cau.li` needs COOP and COEP; W0-S11's run shows it cross-origin isolated and ready in 6.1 s on a cold load, reporting Lean 4.33.0-pre; that load transferred 17,179,888 B and decoded to 137,362,599 B [X RUN-lean-wasm]. Its fork is 998 commits behind upstream (2026-10-23) [V]. The digest proposed an opt-in practice cell that never awards credit; BRIEF §5.1 resolved it to no embedded WASM Lean and live.lean-lang.org as a disclosed, uncredited link-out | [cau][r1m][live-lean] | OD-4; INS-goal-replay's honest limits |
| Goal states: SubVerso can extract them, but its format is "not a public API". Stock `$/lean/plainGoal` returned five goal states from the ledger proofs within 0.4 s of the server starting [X RUN-lean-plaingoal]. *Consequence:* generate Goal Replay at build time with a replay gate | [subverso][a5logs] | INS-goal-replay; GATE-replay; W0-S10 |

### 2.3 S3 Semantics (Lean 4)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Functional Programming in Lean (tested on Lean 4.33.0) renumbered its chapters in the 2025-06-02 Verso port [V]; its §7.3 "is not a realistic system". *Consequence:* cite chapters by title: Getting to Know Lean; Hello, World!; Monads; Programming with Dependent Types | [fpil] | the S3 reading (spine §3.3) |
| Companion texts: LoVe 2026 (Lean 4.24.0 plus Mathlib; BSD-3-style) has lectures 09 to 11 on operational semantics, Hoare logic with a `vcg` tactic and denotational semantics. Concrete Semantics (Isabelle2025-1) maps the arc at chapter 7, §8.4, §9.2 and §12.4. Nipkow's "Teach Proofs, Not Proof Scripts" [V]. *Consequence:* read them beside PFPL; do not install LoVe | [love2026][concsem][nipkow12] | — |
| Error semantics: Cedar's type-soundness theorem lists the runtime errors that remain possible, `entityDoesNotExist`, `extensionError` and `arithBoundsError`. *Consequence:* the template for progress and preservation | [cedarspec] | the S3 production twin; CL-3.1 and CL-3.2 (stretch); KC-3.progress-preservation-scope |
| Misformalization: Formal Conjectures (2026-05-13) made 291 fixes, 48.1% misrepresentation and 35.4% type semantics such as ℕ subtraction. "Faults in Our Formal Benchmarking" (ICML 2026) found 4,833 issues and recommends `autoImplicit false` [V]. *Consequence:* levels of statement fidelity; templates set `autoImplicit false` | [formconj][faults] | S3.L7; KC-3.nat-truncation; SP-3.3; AUD-3.2; the lab templates |
| Run code is not checked code: open issue #15717 (2026-10-15) says `ST.Ref` permits an unsafe cast in `BaseIO` [V]. *Consequence:* the `#eval`-to-JSON golden export is TESTED evidence about compiled code [D] | [lean-15717] | LAB-3.3's lint; LAB-3.7; CL-3.5 |

### 2.4 S4 Obligations (Lean, Z3)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Contracts: `requires` and `ensures` arrived in 4.34 (2026-09-14), `given` in 4.35 and `throws` in 4.36.0-rc1. In 4.35, `vcgen` sits behind `experimental.vcgen` and `experimental.intrinsic`, and `mvcgen` is deprecated [V]. Measured: the contract of `transfer` was proved automatically, and dropping `amt ≤ a` printed `⊢ 0 ≤ (a - amt, b + amt).fst` [X RUN-lean-vcgen]. The documentation says a custom command type works "once its weakest precondition is defined"; W0-S07 tried it on a Mini-Plinth-style command type, where `vcgen` proved the guarded `Transfer` once given a weakest-precondition instance and one specification per construct, and with the guard weakened left an unproved condition [X RUN-vcgen-cmd]. *Consequence:* hand derivation, then `miniplinth check`, then LoVe10's roughly 50-line `vcg` on Mini-Plinth's `Cmd`, then `vcgen`, labeled experimental; spike the last step first | [vcgen][lean434][lean435][r1m][reports] | S4.L9; SP-4.7; W0-S07 [X RUN-vcgen-cmd] |
| PLF 7.1 (Rocq 9.0 or later, 2026-08-24) [V]. *Consequence:* optional reading, not a second install mid-course | [sfplf] | D-10; S4.L1 |
| Derivation Board: UQ checks each step kind as a Dafny query [V]. *Consequence:* each board step is one Z3 validity query, and follow-up errors are not double-counted | [uq][asia] | INS-derivation; SCR-derivation |
| "The check never ran": an old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs; before Lean 4.20, an `apply?` bug inserted a silent `sorry`. *Consequence:* an audit case | [oldrepl][faults] | AUD-2.3 (G6c); G6d |
| Certificates: cvc5 1.4.2 (2026-10-08) emits Alethe for EUF, linear arithmetic, bit-vectors and parts of strings, which is `miniplinth`'s fragment; cvc5 1.4.0 added Logos, a proof checker written in Lean. Carcara's last release is 1.1.0 (2023-08-29) [V], and no cvc5 WASM build was found [U]. Executed: cvc5 from the pip wheel (version string `1.4.2-modified`) returned `unsat` on the guard query with a 19-line Alethe proof containing a `hole` step [X RUN-cvc5-alethe]. *Consequence:* a cvc5 cross-check on the Bench now; Alethe to Carcara is a deferred drawer | [cvc5rel][a2logs] | INS-bench-smt; SP-4.6; D-32; ER-7 |
| Z3 #11179: on the issue's inputs, 5.3.0 returns `unsat` on both satisfiable inputs and 5.3.1 returns `unknown`; builds 5.1.0 and 4.15.4 return `unsat` on the first input and `unknown` on the second [X RUN-z3-11179] | [z3-11179][a2logs] | SP-4.5; ER-7; SEAM-7 |
| Is the VC generator itself correct? Cedar proves its SMT encoding sound and complete. SymCert (FMCAD 2026) verified five production analyses in one work day in total, and its proofs caught encoder bugs [V]. *Consequence:* a lesson on VC-generator correctness, with the same theorem at toy scale | [cedar24][symcert] | S4.L8; CL-4.3 (stretch); AUD-4.1 |
| Inductive invariants: Apalache v0.62.4 (2026-10-12) checks them [V]. *Consequence:* an optional S4 to S5 bridge. Lamport's note on inductive invariants is the precedent for the CTI workbench (BRIEF §6, item 10) | [apalache][lamportii] | S5.L9; D-18; INS-bench-apalache [X RUN-apalache-version]; M-cti-workbench; S4.L6 |

### 2.5 S5 Time (TLA+)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| TLC. The newest stable is v1.7.4 (2024-08-05). v1.8.0 is a nightly-republished prerelease, re-published again 2026-10-24T01:42Z [V]. The recorded runs used build 2026.10.20.183001 (rev d2e1472); 1.7.4 reports "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)" [X RUN-tlc-jars, RUN-tlc-doublespend]. *Consequence:* pin the 1.8.0 jar by SHA-256 and vendor it (MIT) | [tlarel][a2logs][a5logs] | INS-bench-tlc; GATE-runs |
| 1.7.4 rejects `-dumpTrace`; 1.8.0 writes JSON traces [X RUN-tlc-doublespend]. TLC reports a liveness violation as a lasso ending "Back to state 1" [X RUN-tlc-hold-lasso]; the JSON trace lists the states and its last step goes back to a listed state, with no loop field, property name or spec name [X RUN-tlc-lasso-json] | [a5logs][a2logs] | INS-lasso; INS-theater; W0-S05 |
| Flags change the verdict. DoubleSpend (Init 100, Amount 80, two workers): default flags stop at "Deadlock reached" after 10 distinct states; `-deadlock` reports the invariant violated at 11 distinct states with a 5-state, 4-action trace; the atomic version has 4 distinct states [X RUN-tlc-doublespend, RUN-tlc-atomic]. The full reachable space for 2 to 5 workers is 11, 45, 191 and 813 distinct states [X RUN-tlc-full]. The read/check/write split gives a 7-state, 6-action trace and 20 distinct states [X RUN-tlc-rtw3]. *Consequence:* counts name the version, flags, constants and kind of run | [spikes][a5logs][a2logs] | SP-5.1; SP-5.2; SP-5.5; LAB-5.1; KC-5.tlc-flags-matter; S5.L2; S5.L3 |
| On a complete run, TLC 1.8.0 prints fingerprint-collision estimates [X RUN-tlc-fingerprint] | [exp] | S5.L8; KC-5.bounded-scope |
| Spectacle (MIT; pinned at `5827c22`, 2026-09-30) is conformance-tested against TLC on 142 graphs and shares traces by URL; it has no PlusCal and no WF, SF or liveness [V]. It matched TLC's 11, 45, 191 and 813 distinct states for 2 to 5 workers in Chromium, Firefox and WebKit, at 524 to 1,125 states/s [X RUN-spectacle]. HEAD has since moved to `8193eb0` (2026-10-23) [V]. *Consequence:* replace v1's explorer; learner edits run under a 10 s wall-clock budget [D], not a state cap; authored scenes use TLC graphs; a CI gate (Spectacle = TLC) runs before any bump; show PlusCal beside TLC's translation | [spectacle][a5logs] | INS-spectacle; INS-theater; GATE-conformance; D-09; M-telescope |
| TLA+ By Example runs TLC through CheerpJ 4.3 from the vendor's CDN. Its contract: `expect: success` or `expect: violation` on every lesson; every lesson runs in CI; counts are labeled first-counterexample or complete exploration; every lesson has a scope sentence. CheerpJ is free for personal, FOSS and one-person-company use from that CDN, and self-hosting needs a commercial license [V]. *Consequence:* copy the contract; CheerpJ TLC stays a link-out and never grades | [tlabyex][cheerpj] | the S5 production twin; OD-4 |
| Courseware gap: Learn TLA+'s roadmap still lists "Exercises" and "Refinement" [V], and its last content dates from 2023-08-02. Lamport's 2021 videos cover fairness and refinement mappings. *Consequence:* the course writes its own exercises and refinement lessons | [learntlanew][lamportvid] | LAB-5; S5.L7 |
| LLM-written specs violate 41.9% of liveness properties against 8.3% of safety properties and pick fairness that is "overly technical or random" (SysMoBench). Natural language to TLA+ is 8.6% semantically correct [V]. *Consequence:* audit cases and a liveness base-rate card | [sysmobench][nl2tla] | AUD-5.1; AUD-5.2 |
| TigerBeetle documents two-phase transfers, holds as pending postings | [tb2pc] | the S1 and S5 production-twin cards |

### 2.6 S6 Correspondence (PostgreSQL, Rust)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| PostgreSQL 18.6 is current. PG 19 RC1 shipped 2026-10-15, with GA planned for 2026-11-19 [V], and its release notes list no isolation or RLS changes. *Consequence:* pin 18.6; link `/docs/18/`, because `/docs/current/` flips to 19 at GA [D]; re-record the catalog after GA | [pg19rc1][pg19notes] | OD-12; INS-bench-pg; W6-T07 |
| Executed behavior on PostgreSQL 18.6, the second script also on 17.11 [X RUN-pg-anomalies, RUN-pg-claims]. READ COMMITTED re-evaluates the WHERE clause (EvalPlanQual), so a conditional UPDATE loses nothing. Application-level read-modify-write spends 160 from 100. Under REPEATABLE READ the read-modify-write's second writer, and the conditional UPDATE's, gets 40001. Write skew commits under REPEATABLE READ (a total of −100 on the team invariant, 160 held against 100 in the holds variant), while SERIALIZABLE aborts one transaction with 40001. `CHECK (bal >= 0)` accepts NULL and a guarded UPDATE skips a NULL row. A credit past 2^63−1 raises 22003. Opposite-order transfers deadlock with 40P01. A self-transfer compiled as one UPDATE with CASE turns 100 into 70, and two UPDATEs keep 100. The digest matched each row against the manual's isolation chapter. *Consequence:* differential tests compare outcome classes (success, zero rows, SQLSTATE), not balances | [spikes][a2logs][pgiso] | S6.L6 and its executed outcomes (spine §3.6); SP-6.1 to SP-6.7; CL-6.1 |
| Upstream specs: REL_18_STABLE has 127 isolationtester specs, including `simple-write-skew` (4 of 6 permutations abort), `read-only-anomaly`, `skip-locked` and `update-conflict-out` [V]. *Consequence:* write the catalog in that format; `isorun` is gated on reproducing upstream outputs; the catalog rows marked DOC and PROPOSED need 18.6 runs | [dl] (§2, Stage 6; the digest gives no URL for the branch) | INS-bench-pg; `statespace isorun`; GATE-specimens; SEAM-14; W0-S09; W4-T01 (RUN-isorun-upstream) |
| Fact sheets. Hermitage: READ COMMITTED is monotonic atomic view; REPEATABLE READ is snapshot isolation and allows G2-item and G2 [V]. Jepsen (2020-06-12): SERIALIZABLE "exhibited G2-item" in 9.5.22 to 13 [V]. SERIALIZABLE covers only "committed concurrent Serializable transactions". *Consequence:* PostgreSQL's semantics enter a claim as an assumption; mixed isolation levels get an audit case | [hermitage][jepsenpg] | S6.L9; KC-6.db-as-assumption; SP-6.10; SP-6.11; AUD-6.3 |
| PostgreSQL 18 features [V]: `RETURNING old` and `RETURNING new`, `uuidv7()` and `NOT ENFORCED`. *Consequence:* `UPDATE … RETURNING old.bal, new.bal` yields D to D′ per row for checking R(S, D); `NOT ENFORCED` becomes a specimen | [pg18notes] | LAB-8.5 (`ON CONFLICT` with `uuidv7()`); the other two are not placed by the spine |
| PGlite. 0.5.9 moved to PostgreSQL 18.6. The first run on disk is 0.5.10, which reports `PostgreSQL 18.6 (PGlite 0.5.10)`, raises 22003 on overflow, updates 0 rows when the amount is NULL, and serializes two "concurrent" workers [X RUN-pglite]. 0.5.11 (2026-10-21) is a patch release [V]; W0-S08 recorded it: it reports `PostgreSQL 18.6 (PGlite 0.5.11)`, and its first load is 5,580,851 B as gzip level 5 [X RUN-pglite-0511]. PGlite runs in "single-user mode, which means a single connection" [V]. *Consequence:* in the tab, concurrency is replayed from recorded histories; row-level security in PGlite gave PostgreSQL 18.6's answers on 52 of 53 specimen steps (the one difference is `RESET SESSION AUTHORIZATION`) and on 200 of 200 seeded worlds, with every RLS statement run after a `SET ROLE` [X RUN-pglite-rls] | [a5logs][a2logs][pglite][pglite04] | INS-pglite; INS-history; W0-S08 |
| History checkers: elle-cli needs Java 21; SQLancer's TLP and NoREC oracles do no transaction testing. *Consequence:* optional; a checker shows that anomalies are present, never that they are absent | [ellecli][sqlancer] | INS-history; S6.L8 |
| Correspondence: Michigan uses read-only `*.t.dfy` obligation files. In Cedar, 35.5% of generated `when` conditions were Boolean literals [V]. *Consequence:* differential-test receipts report the generator's distribution | [michigan][cedar24] | CL-6.1 (generator statistics); AUD-6.2 |

### 2.7 S7 Secrecy (Datalog, Z3, PostgreSQL RLS)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Cedar (Lean 4.35.0) proves forbid-trumps-permit, default-deny, order independence, sound typing, and sound and complete symbolic compilation, with daily DRT against the Rust code. Proofs found 4 bugs and DRT with property-based testing 21 [V]. `cedar-policy-symcc` 0.8.0 needs cvc5 1.3.1, and `cedar-wasm` lacks SymCC [V]. *Consequence:* three evidence layers: Lean meta-theorems (PROVED), a per-change SMT diff as in IAM's `CheckNoNewAccess`, and DRT of the enforcement (TESTED) | [cedarspec][cedar24] | the S7 production twin; AUD-6.2; CL-7.4 |
| Decidability: quantified hierarchy constraints "make the encoding undecidable, causing timeouts or unknown results"; Cedar grounds them instead [V]. *Consequence:* a lesson where `unknown` appears and grounding removes it | [cedar-ground] | S7.L3; SP-7.7 |
| Fail closed: S3 Block Public Access says "if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" (FSE 2020) [V]. *Consequence:* UNKNOWN fails closed when it guards enforcement | [bpa] | KC-1.unknown-fails-closed; AUD-1.3; spine §8.8 |
| AuthV2 (ICSE 2025), AWS's Dafny-built IAM authorizer, runs about 1 billion checks per second. It had 7 shadow mismatches, and "no issues were found with tools or proofs"; proof breakage delayed deploys "by up to 14 days" [V]. *Consequence:* test the spec against an independent behavior source | [authv2] | spine §8.8 (a shadow or gold mismatch earns no stamp and a defeater against both sides) |
| Engines. Soufflé 2.5 gives minimal-height proof trees, but has an open "sporadic crashes on ARM" issue (#2476). Nemo v0.10.1 (2026-08-01) runs in the browser and fixed "a critical bug where filters in rules would be ignored". Regorus says it is "mostly compliant with the latest OPA release v1.2.0", but OPA is at v1.21.3 [V]. *Consequence:* the TypeScript evaluator emits derivations and is differential-tested against Soufflé; engine versions go on receipts | [nemo][regorus] | INS-datalog; INS-bench-souffle [X RUN-souffle-version]; W4-T07; receipt@1 `tools[]` |
| Row-level security [V]: owners bypass it unless `FORCE` is set; `USING` filters silently, while `WITH CHECK` errors; views run as their owner unless `security_invoker` is set; integrity checks bypass RLS, a covert channel; the documentation describes a READ COMMITTED race in policy subqueries. *Consequence:* a `SET ROLE` differential check against the Datalog access matrix | [pgrls] | S7.L4; KC-7.rls-semantics; KC-7.side-channels; SP-7.4; SP-7.5; AUD-7.1; W0-S08 |
| Information flow: SecF 1.2 (2026-08-24) is the only maintained noninterference text found [V]. Sabelfeld and Sands: what, who, where and when [V]. Zanzibar's "new enemy" problem. *Consequence:* every `declassify` states those four dimensions; revocation cross-links byzantine | [secf][sabelfeld][zanzibar] | KC-7.declassification; S7.L7; S7.L8; SP-7.6; D-21 |
| Alloy 6.2.0 (2025-01-09; Java 17) [V]. *Consequence:* run it on the Bench and pair every `check` with a satisfiable `run`; Alloy4Fun stores models server-side, so it is a disclosed link-out | [alloy][alloy4fun-paper] | D-16; INS-bench-alloy [X RUN-alloy-version]; OD-4 |
| Caches: RFC 9111 says `private` "cannot ensure the privacy of the message content". The digest also cites a CDN vendor's documentation, which it marks [U]; that claim and its URL are not carried. The roadmap defers edge and CDN topology, and BRIEF §5.1 resolved the digest's cache-header lesson to a drawer without vendor specifics | [rfc9111] | D-20; D-37 |

### 2.8 S8 Effects (TLA+, Rust)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Queues: `SKIP LOCKED` "provides an inconsistent view of the data", and `nextval` values are "not reclaimed" on abort [V]. *Consequence:* the outbox is at-least-once by construction; the skipped-row case needs a spike (a catalog row; the unrun rows are W0-S09's); idempotency keys use `ON CONFLICT` plus `uuidv7()` | [pgselect][pgseq] | S8.L3; KC-8.at-least-once; LAB-8.5; W0-S09 |
| Trace validation reduces to constrained TLC checking (venue unverified [U]). CCF (NSDI 2025) binds TLA+ to the C++ behind Azure Confidential Ledger [V]. MongoDB found trace-checking against a highly abstract spec "impractical", while "MBTCG was highly successful for Realm Sync" [V]. *Consequence:* a lab in which a seeded Rust simulator emits NDJSON, TLC checks it against the learner's spec, and a mutated simulator that acks before the durable write is rejected | [tracevalid][ccf][mongotla] | S8.L6; LAB-8.6; `statespace trace validate`; SP-8.4; AUD-8.2 |
| Simulators: VOPR runs "real code … at 1000x speed … 24/7 on 1024 cores" in a debit and credit domain [V]. turmoil is active. Stateright has had no push since 2025-07-27, and madsim's last commit was a dependency bump [V]. *Consequence:* learners write their own simulator | [tbsafety][turmoil] | INS-sim; LAB-8.4; the S8 production twin; OD-4 |
| Industrial correspondence: P and PObserve, and `quint-connect` [V]. The roadmap's TLA+ example list dates from 2018-03-08. *Consequence:* reading cards; add CCF, MongoDB and TigerBeetle | [p-lang][quint][hillel] | the S8 production twin |
| Provider horizon: Stripe's API v1 idempotency keys may be pruned after at least 24 hours (read 2026-10-21) (BRIEF V2-24). *Consequence:* the horizon is an assumed seam | [stripeidem][brief] | S8.L7; SEAM-12; SP-8.5; AUD-8.1 |

### 2.9 S9 Preservation (Lean, Rust)

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| CompCert 3.18 (2026-08-30): its observables exclude "execution time and memory consumption", and preprocessing, elaboration, assembling and linking are unverified [V]. Csmith's silent wrong-code bugs in CompCert were in the unverified front end, plus one specification gap; "the middle-end bugs we found in all other compilers are absent" [V]. *Consequence:* state the preservation theorem in CompCert's template; a correct compiler with leaky output is the erosion | [compcert][csmith11] | S9.L4; SP-9.6; ER-10; AUD-9.1 |
| Alive2 is bounded and found 47 new LLVM bugs (PLDI 2021) [V]. *Consequence:* a translation validator's stamp carries its bound; the digest adds an egglog 3.0.0 (2026-08-19, runs in the browser) rewrite lab in which every rule is SMT-checked before admission | [alive2pldi][egglog] | S9.L2; the S9 production twin; the egglog lab is not placed by the spine |
| Hidden compilers: Cedar's oracle is Lean compiled to C; AuthV2 trusts DafnyLite; `native_decide` "adds the entire lean compiler to the trusted part" [V]. *Consequence:* the trusted-base drawing uses these | [cedarspec][authv2] | S9.L9; SP-9.5 [X RUN-lean-axioms]; KC-9.tcb |
| SQL equivalence. SQLSolver "may output NEQ or UNKNOWN for some equivalent query pairs"; QED needs Z3 and cvc5; VeriEQL is bounded; Polygon and ParSEval refute. At CIDR 2026, "≈32%" of LLM rewrites changed results, and QO-Verify proved about 37% of the 3100+ candidates. SpotIt: checking on a single database overstated accuracy by 11.3 to 14.2 points. LLM judges favor "equivalent" [V]. *Consequence:* containment, provers, refutation, and replay of every counterexample | [sqlsolver][qed][cidr26][spotit][llmjudge] | S9.L8; SP-9.2; SP-9.4; AUD-6.1; AUD-9.2 |
| The S9 warm-up is ported from the stack-machine compiler theory in Isabelle's HOL-IMP (`ASM`; read 2026-10-23) (V2-29). *Consequence:* S9 opens with a proof that `exec (comp a) s stk = aval a s :: stk` for arithmetic expressions | [holimp] | S9.L1; LAB-9.2; CL-9.1 |
| Aeneas (Rust to Lean 4.35.0) and Velvet open when "correspondence names Rust code"; Kani 0.68.0 (2026-09-16) and Verus are pinned when their drawers open | [dl] (§2, Stage 9) | D-30; D-31 |

### 2.10 S10 Assembly

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Assurance 2.0 asks that "no credible doubts remain". SRI-CSL-2024-01 marks defeaters active, retired or accepted [V]. Reviewers disagree about the quality of AI-proposed defeaters (kappa below 0.442). *Consequence:* each claim gets a defeater log and a count of doubts eliminated out of doubts identified, never summed or gated; the tutor proposes defeaters and never retires one | [assurance2][sridefeat][defeaterkappa] | KC-10.defeater-log; S10.L7; LAB-10.8 |
| Bloomfield's Personal Understanding Statement (2026-04-07) is a position paper. *Consequence:* pilot one unassisted statement per viva (the digest's term; the spine's sign-off is the Defence) | [bloomfield] | — |
| How serious 2026 evaluations report: they check outside the agent's environment against a declared threat model. OEIS Open claimed 147 solves, 144 of them confirmed under Comparator [V]. *Consequence:* the report adds CONFIGURED, NOT COVERED, a checker matrix, statement hashes, budgets and advisories | [oeis] | LAB-10.8; S10.L7; CL-10.2 |
| Cedar's release gate: "A new version of Cedar isn't released unless its model, proofs, and differential tests are up to date" [V]. *Consequence:* apply the same gate to the course | [cedarblog] | GATE-release; the S10 production twin |

### 2.11 Hosting and platform facts

These cut across the stages. BRIEF §5 and §9 give them, and the spine's OD-5, OD-13 and §11.1 carry them.

| Fact (date) and consequence | Source | Lands in |
|---|---|---|
| Project Pages sites under one owner share an origin, `<owner>.github.io`. *Consequence:* the instrument origin gets its own custom subdomain (V2-19) | [ghpages][ghdomain] | OD-5; I6; W0-S01 |
| WebKit can clear script-writable storage after seven days without interaction (2020-03-24). *Consequence:* export bundles and a 7-day backup nudge (V2-17) | [webkit7d] | spine §11.1 (Data); SCR-settings |
| Artifact attestations exist for GitHub Actions. *Consequence:* Sigstore attestations stay off by default, for learners' public repos only | [attest] | OD-13 |
| Codespaces gives about 60 free hours a month on 2 cores [V]. GitHub's ubuntu-24.04 runners: whether bubblewrap runs on them is open [U] | [codespaces] | D-15; W0-T05; W0-S06 |

---

## 3. Corrections ledger

Two sets of corrections: six that execution forced (BRIEF §2.2) and seventeen from the digest's fact-check passes (digest §1), followed by the facts the verifiers upgraded. Each row names the topic and gives the correct statement with its evidence. The superseded sentences are deliberately not reproduced: the deny-list that GATE-numbers keeps for BRIEF §2.2 lives in the gate's own fixture file and is never shipped. A new sentence on any of these topics follows the right-hand column, and a tool fact in it cites its run.

### 3.1 Forced by execution (BRIEF §2.2)

| # | Topic | Correct statement | Evidence | Where it bites |
|---|---|---|---|---|
| 1 | Concurrent transfers at READ COMMITTED | Only application-level read-modify-write loses updates: it spends 160 out of 100. A conditional `UPDATE … WHERE bal >= $1` re-evaluates its WHERE clause on the new row version and loses nothing. A specimen names its compilation pattern, never just the isolation level | [X RUN-pg-anomalies, RUN-pg-claims] [spikes] | S6.L6; SP-6.2; SP-6.6; CL-6.2 |
| 2 | `bigint` at 2^63−1 | PostgreSQL raises 22003 (`bigint out of range`). The model takes a step the database refuses: a refinement failure with an availability effect. Silent wraparound is the `BitVec` story [X RUN-z3-bv64]; Rust `i64` behavior is {{run:RUN-rust-i64}} | [X RUN-pg-anomalies, RUN-pg-claims, RUN-pglite] | S1.L5; S6.L4; SP-6.4; ER-1 |
| 3 | State counts for the double spend | Default flags stop at "Deadlock reached" after 10 distinct states. With `-deadlock`, TLC finds the violation at 11 distinct states with a trace of 5 states and 4 actions. The atomic version has 4 distinct states. Every TLC number in copy carries its version, flags and constants | [X RUN-tlc-doublespend, RUN-tlc-atomic] | SP-5.1; SP-5.2; LAB-5.1; AUD-5.3 |
| 4 | The Lean toolchain's size | A 594.5 MB download [V] that unpacks to 3.0 GB [X RUN-lean-toolchain]. Core-only Lean still holds | [leanrel][r1m] | INS-bench-lean; D-15 |
| 5 | JSON traces from TLC | TLC 1.7.4, the newest stable, rejects `-dumpTrace`. TLC 1.8.0, a rolling pre-release, writes JSON traces [X RUN-tlc-doublespend] | [a5logs] | INS-bench-tlc; INS-lasso |
| 6 | What `--paranoid` runs | Six checkers: the default kernel and five bundled ones [X RUN-lean-comparator]. lean4lean ports the reference inductive logic, so it is not independent for the bug class of #14576 [V] | [pmortem][r1m] | S2.L10; SP-2.7; SEAM-15 |

### 3.2 From the digest's fact-check (digest §1)

| # | Topic | Correct statement | Source | Tag |
|---|---|---|---|---|
| 7 | Release dates of Lean 4.23, 4.27, 4.28 and 4.31 | Published 2025-09-14, 2026-01-23, 2026-02-16 and 2026-06-15 (GitHub `published_at`) | [leanrel] | [V] |
| 8 | Count of Lean releases since 4.19, and the point releases | Sixteen minor releases, 4.20 through 4.35. Point releases include 4.20.1, 4.24.1, 4.25.1, 4.25.2, 4.28.1 and 4.29.1 as well as 4.32.1, 4.32.2, 4.33.1 and 4.34.1 | [leanrel] | [V] |
| 9 | Where the remark that `sorry` is caught "by nothing else" lives | In a commit message on PR #14990 (merged 2026-09-07), not in the PR description | [lean-pr14990] | [V] |
| 10 | Lean 4.34's kernel fixes | Three soundness issues found with AI testing, "two in the kernel proper and one in the runtime's reference counting", reported by OpenAI | [lean434] | [V] |
| 11 | Lean 4.33's kernel fixes | Twelve kernel PRs with mixed labels. #14577 and #14613 are labeled "Soundness bug, affecting users of comparator". The OpenAI credit comes from the postmortem, not the release notes | [lean433][pmortem] | [V] |
| 12 | What v4.32.2 contains | The release page is empty. The compare API shows #14577 plus "chore: prepare release" | [leancmp] | [V] |
| 13 | Versions affected by #14576 | "≤ v4.31.0" is the advisory's range. v4.32.0 and v4.32.1 also lacked the fix; the stable fix is v4.32.2 | [oss14576] | [V] |
| 14 | Verus and the length of LLM proofs | LLM proofs are "often 2–3× as long" (verbosity) | [verusguide] | [V] |
| 15 | ImpossibleBench's headline figures | The drop from 92% to 1% is on Conflicting-LiveCodeBench; the abort result, 54% to 9%, is on Conflicting-SWEbench | [impossiblebench] | [V] |
| 16 | SysMoBench's etcd Raft conformance | 7.69% (basic modeling) and 15.38% (code translation) for Claude-Sonnet-4; "26 of 32 SpinLock" is unverified | [sysmobench] | [V], [U] |
| 17 | AxDafny's headline | 725 of 782 on DafnyBench; 250 is the size of LCB-Pro-Dafny | [axdafny] | [V] |
| 18 | IsoVista's status | A 4-page demo, PVLDB 17(12):4325–4328, DOI 10.14778/3685800.3685866 | [isovista] | [V] |
| 19 | "Troubadour" | The paper exists (DOI 10.1145/3720504); the tool's name and its target are unverified | [troubadour] | [U] |
| 20 | Venue of the trace-validation paper | arXiv 2404.16075; the venue is unverified | [tracevalid] | [V], [U] |
| 21 | CheerpJ's license terms | Business use is excluded except by one-person companies; the free runtime is served from the vendor's CDN only; self-hosting needs a commercial license | [cheerpj] | [V] |
| 22 | jsCoq's release status | 0.17.1 is a pre-release; the last stable is v0.16.0 (2022-09-22); npm latest is 0.17.1 (2023-10-04) | [jscoq] | [V] |
| 23 | UQ's autograder marking-time figures | A year-over-year comparison; it measures efficiency, not learning | [uq] | [V] |

### 3.3 Confirmed or upgraded by the verifiers

- Elle: PVLDB 14(3), DOI 10.14778/3430915.3430918 [elle].
- `LEAKPROOF` "can only be set by the superuser" (PostgreSQL documentation).
- PostgreSQL 19 GA is planned for 2026-11-19, per the official RC1 announcement [pg19rc1].
- TxCheck: 56 bugs found, 52 confirmed.
- AWDIT: PLDI 2025, DOI 10.1145/3742465; its bounds are still unverified [awdit].
- Ports and Grittner: PVLDB 5(12):1850–1861.

---

## 4. The version-pinned stack

Receipts record every version, SHA-256 or commit (BRIEF §2.3). Tool claims carry a TTL of 60 to 90 days (digest §3), counted from the check date as §6 explains. A `[prior]` mark in the license column means the digest took that license from prior knowledge rather than reading it on the check; GATE-privacy's license lint re-reads every vendored directory's license (W6-T04).

### 4.1 Edition pins

| Layer | Pin (date) | License | Runs | Evidence; spine instrument |
|---|---|---|---|---|
| SMT, tab | Pyodide 314.0.7 (2026-09-14) [V] with the `z3_solver-5.3.1.0` pyemscripten wheel (2026-10-15) [V] | MIT [prior] | the instrument origin | [X RUN-z3-starter-pyodide]; first load 12,893,420 B as gzip level 5, with phone timings emulated [X RUN-phone-pyodide]; INS-z3 |
| SMT, Bench | Z3 5.3.1; cvc5 1.4.2 (2026-10-08) [V] | MIT; BSD | the Bench | [X RUN-z3-starter]; cvc5 as `1.4.2-modified` in the pip wheel [X RUN-cvc5-alethe]; the Bench binary prints 1.4.2 [X RUN-scaffold]; INS-bench-smt |
| Proof | Lean v4.35.0 (2026-10-12), core plus Std, `autoImplicit false`; `lake check` and `lake comparator`; elan v4.2.4; `lean-action` v1.6.2 | Apache-2.0 [prior] | the Bench (Linux with bubblewrap, and the devcontainer) | [X RUN-lean-ledger, RUN-lean-comparator, RUN-lean-toolchain]; core plus Std with `autoImplicit false` {{run:RUN-lean-template}}; INS-bench-lean |
| TLA+ | `tla2tools` 1.8.0, pinned by SHA-256 and labeled pre-release; 1.7.4 as the fallback with text traces (no JSON); Java 21 | MIT | the Bench | [X RUN-tlc-jars, RUN-tlc-doublespend]; INS-bench-tlc |
| TLA+, tab | Spectacle `5827c22` (2026-09-30, measured), vendored; HEAD `8193eb0` (2026-10-23) only after the conformance gate [V] | MIT | the instrument origin | [X RUN-spectacle]; INS-spectacle |
| Inductive invariants | Apalache v0.62.4 (2026-10-12), optional [V] | Apache-2.0 | the Bench | [X RUN-apalache-version]; INS-bench-apalache |
| Database | PostgreSQL 18.6; PGlite 0.5.11 (2026-10-21) [V] | PostgreSQL; PGlite [U] | the Bench; the tab, single session | [X RUN-pg-anomalies]; PGlite 0.5.11 is recorded, with its first load [X RUN-pglite-0511], and 0.5.10 was measured first [X RUN-pglite]; INS-bench-pg; INS-pglite |
| Rust and PostgreSQL | `tokio-postgres` 0.7.18, `testcontainers` 0.28.0, `pg_query` 6.2.1 and `proptest` 1.12.0, pinned by the scaffold; `postgresql_embedded` 0.22.0 [V], an option for learners without Docker, is not pinned | various | the Bench | [X RUN-scaffold]; INS-bench-cargo |
| Datalog | Soufflé 2.5 (2025-03-24) [V]; Z3 `Fixedpoint` in the tab | various | the Bench; the tab | [X RUN-souffle-version]; stratified negation measured [X RUN-z3-fixedpoint]; INS-bench-souffle; INS-datalog |
| Relational | Alloy 6.2.0 (2025-01-09), Java 17 or later, an optional drawer [V] | MIT | the Bench | [X RUN-alloy-version]; INS-bench-alloy; D-16 |
| Site | React 19.3.1, Vite 7.3.7, TypeScript 5.9.3, Playwright 1.63.0 and axe-core 4.14.0; kernelspace's stateless infrastructure vendored at a pinned SHA; JuliaMono v0.63.2 (2026-07-18) [V] | | static pages | [X RUN-scaffold, RUN-juliamono-glyphs] |

### 4.2 Tracked, not pinned

The digest and the brief list these. Each is a reading card, a deferred drawer or a candidate, and none is an edition pin.

| Item | State (date) | License | Note |
|---|---|---|---|
| cvc5 1.3.1 | needed by `cedar-policy-symcc` 0.8.0 | BSD | SymCC is not in the course's stack |
| Datalog and policy engines | `ascent` 0.8.1; the TypeScript evaluator; `cedar-policy` 4.14.0; OPA v1.21.3; Regorus 0.13.0 | various | field versions; engine versions go on receipts |
| Nemo | v0.10.1 (2026-08-01) | | runs in the browser; not among OD-4's link-outs |
| egglog | 3.0.0 (2026-08-19) | [U] | the digest's rewrite lab is not placed by the spine |
| Carcara | at cvc5's `contrib` commit | Apache-2.0 | a deferred drawer (D-32) |
| Deferred drawers | Kani 0.68.0 (2026-09-16); Verus `release/0.2026.10.18.7d82994`; Aeneas; Velvet | various | drawers only (D-30, D-31); pinned when a drawer opens |
| TLC on CheerpJ | CheerpJ 4.3 (2026-04-21) | CheerpJ Community | reached only through the TLA+ By Example link-out (OD-4) |
| Agent tooling | lean-lsp-mcp 0.31.0 (2026-09-30, beta) | | read-only tools wired into `AGENTS.md` |

### 4.3 Avoid

| Avoid | Why |
|---|---|
| Stateright and madsim | dormant: Stateright has had no push since 2025-07-27, and madsim's last commit was a dependency bump [V] |
| jsCoq | the last stable is v0.16.0 (2022-09-22); 0.17.1 is a pre-release [V] |
| Embedded Alloy4Fun | it stores models server-side, so it is a disclosed link-out only |
| Self-hosted CheerpJ, and CheerpJ in anything commercial beyond a one-person company | self-hosting needs a commercial license [V] |
| A home-made TLA+ explorer | Spectacle, conformance-tested against TLC, replaces it |
| An npm Z3 shim | the npm package needs threads and COOP and COEP, and its WASM is 34.6 MB [X spikes] |
| DDlog and Oso OSS | the digest lists them under "Avoid" without a reason |

### 4.4 Identifiers recorded in executed runs

Exact strings, so a pin can be matched to a run. Each is [X].

| Tool | Recorded identifier | Run |
|---|---|---|
| Z3 (native Python wheel) | `z3.get_version_string()` is 5.3.1 | RUN-z3-starter |
| Pyodide run | Pyodide 314.0.7; `z3_solver-5.3.1.0` pyemscripten wheel; Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6; Playwright 1.63.0 in `mcr.microsoft.com/playwright:v1.63.0-noble`; the Node-harness runs used Node v22.22.2 | RUN-z3-starter-pyodide; RUN-z3-budget-pyodide |
| cvc5 | `1.4.2-modified`, the pip wheel's version string | RUN-cvc5-alethe |
| Lean | `Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)`; `Lake version 5.0.0-src+eb6cafb (Lean version 4.35.0)`; elan v4.2.4 | RUN-lean-toolchain |
| TLC 1.8.0 | `TLC2 Version 2026.10.20.183001 (rev: d2e1472)`; `tla2tools.jar` SHA-256 `5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2` | RUN-tlc-jars; RUN-tlc-doublespend |
| TLC 1.7.4 | `TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)`; `tla2tools.jar` SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` | RUN-tlc-jars; RUN-tlc-doublespend |
| Java | Eclipse Adoptium 21.0.12.1, from the image `eclipse-temurin:21-jre` | RUN-tlc-doublespend |
| PostgreSQL | `PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)` and `PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)`; the 18.6 image was `postgres:18` | RUN-pg-claims; RUN-pg-anomalies |
| PGlite 0.5.11, the pin | `PostgreSQL 18.6 (PGlite 0.5.11) on wasm32-unknown-emscripten`, emcc 3.1.74 | RUN-pglite-0511 |
| PGlite 0.5.10, the first run | `PostgreSQL 18.6 (PGlite 0.5.10) on wasm32-unknown-emscripten`, emcc 6.0.5 | RUN-pglite |
| Spectacle | commit `5827c22` | RUN-spectacle |

The 1.8.0 tag is re-published nightly, so the SHA-256 above identifies the recorded build and not whatever the tag serves today.

---

## 5. The tab and the Bench

The split follows what a static page can run and a checker can grade. The tab runs self-hosted engines, and its results are credited only where a checker grades them. The Bench is the learner's machine with the real tools, and its receipts are authoritative. BRIEF §2.4 and the digest's §3 table, with the spine's decisions applied (OD-4: link-outs only, no embedded CheerpJ).

### 5.1 The split

| Capability | Tab (self-hosted instrument) | Disclosed link-out, uncredited (OD-4) | Bench (authoritative) | Why the split |
|---|---|---|---|---|
| SMT | INS-z3: Z3Py on Pyodide; budgets via `rlimit`, because `timeout` never returned [X RUN-z3-budget-pyodide] | none | INS-bench-smt: Z3 and cvc5 | runs in three engines without cross-origin isolation [X RUN-z3-starter-pyodide]; witnesses are not canonical, so grading checks properties |
| Lean | INS-goal-replay: Goal Replay generated at build time from real elaboration; recorded `#guard_msgs` outputs. No embedded WASM Lean | live.lean-lang.org; the Natural Number Game | INS-bench-lean: `lake check`, `lake comparator`, `--paranoid` | the community WASM build downloads 137,362,599 B decoded and needs cross-origin isolation [X RUN-lean-wasm], and it lags upstream by 998 commits [V] |
| TLA+ safety | INS-spectacle under a 10 s wall-clock budget [D]; INS-theater, authored scenes drawn from TLC state graphs | TLA+ By Example, which runs TLC through a vendor CDN | INS-bench-tlc: TLC | Spectacle's counts equal TLC's [X RUN-spectacle] |
| TLA+ liveness | INS-lasso: a validator over imported TLC traces; the lasso JSON shape is recorded [X RUN-tlc-lasso-json] | none | INS-bench-tlc: TLC | Spectacle has no fairness or liveness [V] |
| Inductive invariants | INS-z3 for a parametric step with an uninterpreted sort (S5.L9) | none | INS-bench-apalache, optional; INS-bench-tlc | an inductive check at fixed constants earns [M], never [P] alone (D-18) |
| Relational | none | Alloy4Fun | INS-bench-alloy: Alloy CLI, optional (D-16) | Alloy4Fun stores models server-side |
| Datalog and policy | INS-datalog: Z3 `Fixedpoint` [X RUN-z3-fixedpoint] or a TypeScript evaluator differential-tested against Soufflé; decided by W0-S03 | none | INS-bench-souffle: Soufflé | equal relations and derivation heights to Soufflé, 5,915 of 5,915 and 53,488 of 53,488 in the recorded run [X RUN-fixedpoint-equal], are gated by GATE-conformance |
| SQL | INS-pglite: one connection; INS-history replays Bench-recorded multi-session histories | none | INS-bench-pg: PostgreSQL 18.6, multi-session through `statespace isorun` | two "concurrent" PGlite workers serialize [X RUN-pglite]; RLS in PGlite equals PostgreSQL 18.6's on 200 of 200 seeded worlds, after a `SET ROLE` [X RUN-pglite-rls] |
| Simulation | INS-sim: the learner's wasm machine under recorded fault seeds | TigerBeetle's simulator (`sim.tigerbeetle.com`) | the learner's own simulator, with TLC trace validation | the tab is not authoritative; TLC trace validation on the Bench is |

### 5.2 Lean lanes

| Lane | State |
|---|---|
| Native | VS Code plus elan |
| Devcontainer | under default Docker settings the sandbox fails with the exit code of a rejection [X RUN-lean-bwrap-docker]; W0-S06 recorded the conditions that start it: five allowed system calls, `/proc` unmasked and a `/run/user` directory, and on a stock Ubuntu 24.04 host AppArmor's restriction on user namespaces lifted [X RUN-bwrap-lanes]; the lane verdicts on CI runners, Docker Desktop and Codespaces are {{run:RUN-bwrap-lanes}} |
| Codespaces | about 60 free hours a month on 2 cores [V] [codespaces] |
| Build bot | explicit `run:` steps, because `lean-action` v1.6.2 has no input for `lake check` or `lake comparator` [V] |
| GitHub's ubuntu-24.04 runners | whether bubblewrap runs there is unverified [U] |

The sandbox is Linux-only and is recorded as on, off or failed, never required (spine §9.2). The digest's verdict-to-stamp table (digest §3) is superseded by spine §8.8 and is not repeated here.

---

## 6. Volatility rules and TTLs

Tool versions, release tags and documentation aliases move on a scale of days. The rules below come from BRIEF §2.5, the digest and the spine's gates; the TTLs are the ones the brief and the spine set, and nothing here sets a new one.

### 6.1 The rules

| Rule | Source | Held by |
|---|---|---|
| A tool bump re-runs `runs/` and produces a reviewable diff | BRIEF §2.5; V2-03 | GATE-runs (nightly and release) |
| Lean 4.36.0 is likely in mid-November [D]. Pin 4.35.x per edition, and run the labs monthly against the newest stable | BRIEF §2.5; OD-12 | GATE-labs (monthly also on the newest stable Lean) |
| `/docs/current/` flips to PostgreSQL 19 on 2026-11-19, so link `/docs/18/` [D] | BRIEF §2.5; OD-12 | INS-bench-pg; W6-T07 |
| Spectacle and the TLC tag move weekly, so pin by commit or SHA | BRIEF §2.5 | RUN-tlc-jars; the Spectacle pin; GATE-conformance before any bump |
| Receipts record every version, SHA-256 or commit | BRIEF §2.3 | receipt@1 (spine §9.4) |
| A red nightly run downgrades the claims it touches to "unverified since" its date | BRIEF §5.1 | the nightly lane (spine §11.2) |
| A change in a tool or in the field surfaces as a "this has changed" card: a struck line, the new line, its source, and two retrieval items; errata flag "re-check" and never deduct | BRIEF §1.3; the spine's M-change-cards | M-change-cards; SCR-changes |
| The course erodes in public: a tool bump re-runs `runs/` in CI, and the diff becomes an EROSION entry on the assurance page | BRIEF §6 (item 7) | SCR-assurance; W5-T08 |
| An advisory against a checker becomes a change card | spine §5.3 | SEAM-15 |

The digest also lists two practices that no gate of that name carries: solved queries stay solved across solver bumps (Zelkova), and a seed-variation brittleness check (AuthV2). GATE-runs' re-run on a bump is the nearest the spine has to the first.

### 6.2 TTL classes

| Class | Members | TTL | Re-check trigger | Held by |
|---|---|---|---|---|
| Tool-version claims | every pin in §4: versions, release dates, "latest" statements | 60 to 90 days from the check date [dl §3; brief §2.3] | any upstream release; a red nightly run; an edition boundary (OD-12) | the `runs/` diff (GATE-runs); the nightly lane; the monthly newest-stable Lean run (GATE-labs) |
| Tool behavior with a recorded run | numbers, verdicts and flags in copy | no separate clock [D]: valid for the recorded version, re-run on a bump of that tool | a tool bump | GATE-runs; GATE-facts (V2-03; I4) |
| Rolling and pre-release artifacts | TLC 1.8.0; Spectacle HEAD | pin by SHA or commit; the tag moves weekly | the conformance gate, before any bump | RUN-tlc-jars; GATE-conformance |
| Production-twin SHAs | upstream counterparts pinned for twin cards | 60 days | refreshed by the wave that authors each stage | RUN-twin-pins; M-production-twin |
| Aliases that move | `/docs/current/` for PostgreSQL; `reference/latest/` for Lean | event-driven [D]: PostgreSQL 19 GA planned 2026-11-19; Lean 4.36.0 likely mid-November [D] | link versioned pages (`/docs/18/`, `reference/4.35.0/`) | OD-12; W6-T07 |
| Dated incidents, papers, leaderboards and quotations | §2 and §7 | none is set by the brief or the spine; each keeps its publication or read date | — | GATE-audit builds each anchor with its "based on" card |

The clock runs from the check date. Pins re-checked on 2026-10-23 reach their 60-day mark on 2026-12-22 and their 90-day mark on 2027-01-21; facts checked by the 2026-10-21 pass reach 2026-12-20 and 2027-01-19 [D]. A past mark makes a claim stale, not wrong: it earns a "stale since" badge and a re-check, and never a deduction.

### 6.3 Watch list on 2026-10-23

| Item | State | Next known event | Rule |
|---|---|---|---|
| Lean | v4.35.0 stable (2026-10-12); v4.36.0-rc1 (2026-10-14) | 4.36.0 likely mid-November [D] | pin 4.35.x; run the labs monthly on the pin and the newest stable |
| PostgreSQL | 18.6 current; 19 RC1 (2026-10-15) | GA planned 2026-11-19; `/docs/current/` flips | link `/docs/18/`; re-record the catalog after GA |
| TLC | 1.7.4 newest stable (2024-08-05); 1.8.0 pre-release, re-published 2026-10-24T01:42Z | re-published nightly | pin the jar by SHA-256; 1.7.4 text-trace fallback in CI |
| Spectacle | pinned `5827c22` (2026-09-30); HEAD `8193eb0` (2026-10-23) | weekly | bump only after the conformance gate |
| Z3 | 5.3.1 latest (PyPI 2026-10-15, npm 2026-10-16); 5.3.0 reached PyPI on 2026-10-14 [V] | — | a wrong answer on 5.3.0 became `unknown` on 5.3.1 [X RUN-z3-11179]: re-run on every bump, and cross-check authored unsats with cvc5 |
| cvc5 | 1.4.2 (2026-10-08); 1.4.0 (2026-09-17) | — | the cross-check; certificate replay stays a deferred drawer (D-32) |
| Pyodide | 314.0.7 (2026-09-14), the npm latest on 2026-10-23 [V] | — | the first load is 12,893,420 B as gzip level 5, and phone timings are emulated [X RUN-phone-pyodide] |
| PGlite | 0.5.10 measured; 0.5.11 (2026-10-21) | — | 0.5.11 is recorded by W0-S08 [X RUN-pglite-0511]; its RLS answers equal PostgreSQL 18.6's [X RUN-pglite-rls] |
| Apalache | v0.62.4 (2026-10-12) | — | the version is recorded, with a bounded smoke check only [X RUN-apalache-version] |
| Kani | 0.68.0 (2026-09-16) | pinned when D-30 opens | deferred drawer |
| Community WASM Lean | 998 commits behind upstream (2026-10-23) | the lag grows | not embedded (OD-4) |
| NNG4 | pinned to Lean v4.23.0; host intermittent on 2026-10-20 and 2026-10-21 | — | the pinned fallback (D-08) |
| Open Lean issues | #15717 (2026-10-15), an unsafe cast through `ST.Ref`; #15643 (2026-10-13), `leanchecker` rejects a valid `rfl` [V] | — | advisories become change cards (SEAM-15) |
| PutnamBench results | read 2026-10-21 | the leaderboard moves | cited as a dated reading |

### 6.4 Drift since the digest's snapshot

The digest's snapshot is 2026-10-20 and 2026-10-21, and it re-checked the volatile pins on 2026-10-23 [V]. Four things moved in between: PGlite went to 0.5.11; the TLC tag was re-published; Spectacle's HEAD moved; and the community WASM fork's lag grew to 998 commits. Everything else was unchanged.

---

## 7. Dated incidents and the failures behind them

The audit material of the digest §4. The pattern it reports: none of 37 incidents shows a wrong proof of a correct statement passing a working kernel; every accepted wrong proof went through a harness or kernel bug (digest §4, from R2 §2.7). Kleppmann predicted on 2025-12-08 that the challenge "will move to correctly defining the specification" [kleppmann] [V]. The spine's 25 audit anchors cite a subset; a dash in the last column means no anchor uses the incident. The digest's own class labels are replaced by the spine's G1 to G13 (spine §6.1), which BRIEF §4.8 derived.

### 7.1 By kind of failure

| Kind | Incidents (date; source) | How to detect it | Spine anchor |
|---|---|---|---|
| Misrepresentation | PutnamBench #366, #368 and #363 (2026-10-13) [putnam366]; Erdős #124, "= 1" written for "≥ 1" (2025-11) [erdos124] | back-translate; parenthesize; check ∀∃ order | AUD-4.2 (Erdős #124); the #366 and #368 drills are in §2.0 |
| Type semantics and junk values | Kimina #11: a dropped `(1/4 : ℝ)` ascription leaves "0 = 0" over ℕ (2026-09-13) [kimina11]; PutnamBench #348 (2026-08-25); Erdős #480 [xena] | evaluate small values; `autoImplicit false` | AUD-3.2 (G4) |
| False as written | PutnamBench #347 (2026-08-13); VERINA PR #17, merged 2026-04-17, fixed specs in 18 tasks and code in 9 [verina17] | look for a counterexample first | AUD-3.1 |
| Vacuous premise | PutnamBench #361 (2026-10-12): a refactor made the premises inconsistent; #365: a fix reopened the hole [putnam361] | a premise witness | AUD-1.1 (G2) |
| Answer in the statement | FormaTheoria (2026-08-11) [formatheoria]; comparator's `ChallengeSolution := RiemannHypothesis` example | a use-site test; a held-out spec | G8b |
| Weak spec | AlphaVerus [alphaverus]; Spec-Harness: 22.7% of accepted specs have no postcondition [specharness]; VERINA: 52.3% [verina] | mutation-test the spec | AUD-2.1 (G1) |
| Intent mismatch | Gemini on Erdős: 13 of 200 "meaningfully correct" (2026-01-29) [gemini-erdos]; AlphaProof Nexus "density" [alphaproof-nexus] | the requirement's owner restates it | AUD-7.2 (G12) |
| Non-functional omission | AxDafny: 89 of 127 verified programs failed resource limits (2026-06-30) [axdafny] | bounds, or NOT COVERED | G1a |
| Escape hatches | AlphaVerus `assume(false)`; AlphaProof Nexus: "prompting against this behavior failed to prevent it"; the Verus guide's cheat list [verusguide] | `lake check`; grep the diff | AUD-2.2 (G6a) |
| Native trust | Kimina #11: 15 of 225 solutions use undisclosed `native_decide` [kimina11] | version-aware axiom names | G6b; SP-9.5 |
| Tampering | FormalQualBench (runs 2026-03-18 and 2026-03-19): agents tried "elaborator-level workarounds"; "Comparator catches the illegal axiom" [formalqual] | challenge files; hashes | AUD-2.4 (G8a); G8c |
| The check never ran | an old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs [oldrepl]; before Lean 4.20, an `apply?` bug inserted a silent `sorry` [faults] | out-of-band replay | AUD-2.3 (G6c); G6d |
| Unsound checker | #14576, fixed 2026-07-28 [lean-14576]; 4.33's kernel PRs (12, mixed labels; two "affecting users of comparator"); 4.34's AI-found issues; STORM: 29 critical bugs in 7 SMT solvers (2020) [storm] | current external kernels; a second solver | S2.L9; SP-2.6; SEAM-15; ER-7 |
| Dependent or disagreeing checkers | lean4lean shares #14576; OEIS Open: Comparator and SafeVerify disagreed on five defective formalizations [oeis]; Lean #15643 (2026-10-13): `leanchecker` rejects a valid `rfl` | diverse checkers; triage | the Z3 and cvc5 cross-check (GATE-calls) |
| Engine defect or misread verdict | the Nemo filter bug (2026-08-01) [nemo]; SQLSolver's NEQ answers [sqlsolver]; Regorus's stale compliance claim [regorus] | versions; the verdict table | spine §8.8; receipt@1 `tools[]` |
| Textbook model, arbitrary fairness | SysMoBench [sysmobench] | trace validation | AUD-5.1 (G3); AUD-5.2 (G7); S8.L6 |
| Code bent to fit the proof | the Verus guide [verusguide]; Spec-Harness: agents changed code in 5.6% of tasks [specharness] | diff the code; DRT | AUD-4.3 (G13); G8d |
| Gaming under pressure | METR (2025-06-05): "nearly negligible effect" of anti-cheat prompts [metr]; ImpossibleBench (2025-10-23): an abort option cut GPT-5's cheating from 54% to 9%, "much less pronounced" for Claude Opus 4.1 [impossiblebench] | an abort path; out-of-band grading | the agent kit; GATE-guardrails; I7 |
| Snapshot drift | PutnamBench #353 (2026-09-13): 187 of 672 statements edited [V] | pin revisions | I7; spine §9.4 (a changed hash voids the claim) |
| Provenance and budget | AxiomProver's formalizer is unstated; FrontierMath Erdős off-protocol runs cost over $220k [frontiermath] | author, hash, n, cost | spine §9.4 (`runs[]` budgets) |
| Common-mode evidence; a test presented as proof | AuthV2's shadow tests; SpotIt's wrong gold SQL; CIDR's "results match" [cidr26] | the evidence source on receipts | AUD-6.1 (G11); AUD-9.2 |

Base-rate cards are labeled "context-specific". Example: miniF2F mismatched "more than half of the problems" [minif2f].

### 7.2 Dated incidents kept as toy models

BRIEF §6 (item 9) and spine §12 (item 16). Each is a specimen inside its stage, shown through the "dated incidents" filter, and re-run in CI; none carries exploit code.

| Incident (date) | Source | Spine |
|---|---|---|
| Bitcoin CVE-2010-5139: outputs that "overflowed when summed" (2010-08-15) | [btc2010] | SP-1.9; AUD-1.2 |
| Bloch's binary-search midpoint overflow (2006-06-02) | [bloch06] | SP-1.10 |
| The 2015 Starbucks gift-card race (2015-05-21) | [starbucks15] | SP-5.7; AUD-5.4 |
| Jepsen's PostgreSQL 12.3 report: G2-item under SERIALIZABLE (2020-06-12) | [jepsenpg] | SP-6.11; AUD-6.3 |
| Stripe's idempotency-key pruning (read 2026-10-21) | [stripeidem] | SP-8.5; AUD-8.1 |
| Z3 #11179, an incorrect unsat (2026-10-15) | [z3-11179] | SP-4.5 |
| Lean #14576, the kernel soundness bug (fixed 2026-07-28) | [pmortem] | S2.L9, as a story card with no exploit code |

---

## 8. Exemplars to borrow from, and sibling courses

### 8.1 Exemplars

| Borrow | From | Boundary | Spine |
|---|---|---|---|
| Statement-integrity receipts | Software Foundations: "If the type is not ok, it means you proved the wrong thing" [sflf]; Michigan's `.t.dfy` files [michigan]; comparator | only as good as the challenge | spine §9.4; I7 |
| Spec oracles | UQ's conjuncts [uq]; Forge's wheats and mutants [forge]; Alloy4Fun's labeled instances [alloy4fun-paper] | obfuscation is not secrecy | GEN-negate-it; GEN-spec-it; M-spec-duel |
| An authoring contract | TLA+ By Example [tlabyex]; Verso proof states [verso] | TLC stays authoritative | the S5 production twin |
| Build your own VC generator | LoVe10 [love2026]; Concrete Semantics §12.4 [concsem] | `vcgen` is experimental | S4.L9; LAB-4 |
| A correspondence kit | Pact's properties [pact]; Michigan [michigan]; `cedar-drt` [cedarspec] | Pact is archived | S6 |
| Misconception-coded items | LTL Tutor: "Implicit G" sits behind 28.68% of errors [ltltutor] | track effects with VRK₃₀ | KC-5.temporal-operators |
| Inventories, recorded rather than locked | lean4game's `NewTactic` and `Branch`; Forge's Froglet | GPL-3.0: copy the mechanics, not the code | I5 |
| Explanation-graded proofs | CMU 15-414 F26: "Categorical answers with no explanation will not even receive partial credit" [cmu15414] | — | — |
| Claim graph and errata | leanblueprint [leanblueprint]; "Crediting Error Finders" [forgebook] | — | SCR-claims; SCR-changes |
| Timed problems | VerifyThis 2026: 90 minutes, with AI use declared [verifythis] | the Defence is untimed (spine §8.6) | — |
| A 15 to 20 minute self-explanation unit | the CC BY-SA 4.0 booklet [booklet] | adapt the text, not its three rights-reserved images, with credit and a change note, in its own directory, without asking its authors; an original unit replaces it if they object (OD-10) | S2.L0; W2-T05 |

Where v1 already led: no exemplar measures calibration (Call It), schedules erosion, or grades agent review on both precision and recall. statespace's arc is new: no course builds an application-semantics language aimed at a database (an absence result), and Pact, Michigan and Cedar are the nearest precedents. Evidence caveat: Forge says "We do not claim to measure learning efficacy", and a field survey calls evaluation "still at its debut" [forge][eptcs419].

### 8.2 Sibling courses

- **byzantine** owns Raft, partitions and Jepsen-style checking; the two courses share elle-cli. Spine: D-21; M-sibling-bridge.
- **tablespace** owns MVCC internals and the planner. Spine: D-11 and D-12 as self-contained prerequisite cards.
- **kernelspace** supplies the registry schema for dated facts, "this has changed" cards, the H1 guardrails, VRK₃₀ and seeded generators. Spine: §0 (what is inherited) and §11.1 (what is vendored).

---

## 9. Open questions, and what closes them

The digest's ranked list (digest §7), with the spine task or decision that takes each up. "Planned" means a W0 task exists and has not run; "recorded" means it ran and its run is cited.

| # | Question | Status |
|---|---|---|
| 1 | Does bubblewrap run on GitHub's ubuntu-24.04 runners and on Docker Desktop? Default Docker fails [X RUN-lean-bwrap-docker] | recorded in part: W0-S06 ran stand-ins only; a stock Ubuntu 24.04 virtual machine fails as shipped and starts once AppArmor's restriction on user namespaces is lifted [X RUN-bwrap-lanes]; the verdicts of the real CI-runner, Docker Desktop and Codespaces lanes are {{run:RUN-bwrap-lanes}} |
| 2 | Does `vcgen` work on a custom `Cmd`, and will 4.36 or 4.37 change the syntax again? | recorded: W0-S07 ran it on a Mini-Plinth-style command type, where it works, and 4.36.0-rc1 and a nightly already changed the interface (a `throws` clause parses, and the fields of `WP` were renamed with aliases kept) [X RUN-vcgen-cmd]; the twin stays dated and experimental |
| 3 | How does TLC's JSON represent a liveness lasso? Does Spectacle cover every operator the course uses, and does it fetch `EXTENDS` modules remotely [U]? | recorded: the lasso JSON lists the states, and its last step goes back to a listed state [X RUN-tlc-lasso-json]; Spectacle covers 45 of 56 curriculum configurations, a local `EXTENDS` loads from the root module's directory, and community modules are blocked because Spectacle fetches them from a third-party URL [X RUN-spectacle-s5s8] |
| 4 | Does RLS work in PGlite under `SET ROLE`, and how big is the first load? | recorded: RLS in PGlite equals PostgreSQL 18.6's on 52 of 53 specimen steps and on 200 of 200 seeded worlds, after a `SET ROLE` [X RUN-pglite-rls]; the first load is 5,580,851 B as gzip level 5 [X RUN-pglite-0511] |
| 5 | The catalog rows H03, H04, H06, H09 to H12, H16, H17 and H20 need recorded 18.6 runs | recorded: W0-S09 ran all 24 catalog rows, H01 to H24, on PostgreSQL 18.6 [X RUN-pg-catalog] |
| 6 | Is CheerpJ acceptable under "zero servers, no telemetry"? An owner decision, default no | decided: OD-4, no embedded CheerpJ |
| 7 | How long does `--paranoid` take on a laptop or a 2-core Codespace? | `lake comparator --paranoid` takes 3 s on a small project in Docker [X RUN-lean-comparator]; `lake check --paranoid` took 172.6 s on the LAB-2 pack, and 207.8 s with the container limited to two CPUs [X RUN-bwrap-lanes]; no real laptop or Codespace was measured, and those figures are {{run:RUN-bwrap-lanes}} |
| 8 | Can Pyodide Z3 solve SymCC's SMT-LIB? | not taken up by the spine |
| 9 | How large and fast is Nemo-WASM on phones? Is Soufflé stable on ARM? | Nemo is not among OD-4's link-outs; Soufflé's version is 2.5, on x86_64 with no arm64 package [X RUN-souffle-version], and its ARM stability is not taken up |
| 10 | What are the base rates for agent-written application specs? None were found | open; the Audit Desk draws its sound share from a seed so the rate cannot be learned (spine §6) |
| 11 | What should "independent checker" require, given that lean4lean is a port? | the spine's stamps name every checker, and "independent" means separately designed (this page, §1, row 1) |
| 12 | Do defeater logs and Understanding Statements help learners? Pilot them | defeater logs are in LAB-10.8 as a count of doubts eliminated out of doubts identified; Understanding Statements are not placed |
| 13 | Licenses: TLA+ By Example (NOASSERTION); lean4game, LTL Tutor and Carnap (GPL-3.0); LoVe (BSD-3) | W6-T04's license lint; TLA+ By Example stays a link-out (OD-4) |
| 14 | Still unverified: the trace-validation venue; the AuthV2 DOI; Troubadour; AWDIT's bounds; the FormalQualBench literal; public Lean Workbench and Comparator Live instances; an official browser-Lean timeline | open |

---

## 10. Source index

Dates are publication, version or release dates; "read" marks the access date where nothing else applies, and "measured" the day a run was made. Keys keep BRIEF §9's names where they exist; the rest are named here. The index carries the field's sources only: the learning-science keys resolve in BRIEF §9, and the name-collision checks behind OD-1 are in BRIEF §7.1.

### Local evidence (repo-relative paths)

| Key | Source | Date | What it supports |
|---|---|---|---|
| [roadmap] | `research/context/roadmap.md` | read 2026-10-23 | scope; the stage list and the deferred topics |
| [spikes] | `research/spikes/RESULTS.md` | executed 2026-10-20 | executed facts: Z3, PGlite, PostgreSQL 18.6, TLC, core Lean |
| [a5logs] | `research/evidence/A5r3/, A5v2/ and A5spike/` | 2026-10-21 | browser runs, Pyodide Z3, PGlite, comparator and TLC logs, Mathlib size, saved registry JSON |
| [a2logs] | `research/evidence/a2r3/` | 2026-10-21 | Z3, cvc5, Lean-trust, PostgreSQL, PGlite and TLC outputs under out/ |
| [r1m] | `research/evidence/lean-measure/` | 2026-10-20 | the Lean 4.35.0 toolchain measurement, the check and judge outputs, the partial WASM probe outputs |
| [exp] | `research/evidence/exp/` | 2026-10-21 | the TLC fingerprint-collision run (tla/inc-native.log) |
| [dl] | `research/synthesis/digest-landscape.md` | snapshot 2026-10-20/21; pins re-checked 2026-10-23 | the landscape digest; a section is cited as [dl §n] |
| [dr2] | `research/synthesis/digest-review-2.md` | 2026-10-24 UTC | the second review digest |
| [brief] | `research/synthesis/BRIEF.md` | 2026-10-23 | the v2 redesign brief; §2 is the landscape section |
| [reports] | `research/reports/R1-lean.md through R6-fm-courseware.md, each with a .verify.md` | 2026-10-20/21 | the research reports and their fact-check logs; [r6] is cited separately for one row |
| [r6] | `research/reports/R6-fm-courseware.md (finding F17)` | 2026-10-20/21 | the courseware report; its F17 notes that the Z3 Guide runs Pyodide |
| [a5review] | `research/reviews/A5-feasibility.md` | 2026-10-21 | the feasibility review; it reported the Docker flag set that W0-S06's recorded conditions replace (§2.2) |
| [spine] | `docs/spine/SPINE.md` | 2026-10-23 | the canonical index of IDs |

### Lean

| Key | Source | Date | What it supports |
|---|---|---|---|
| [leanrel] | https://api.github.com/repos/leanprover/lean4/releases | read 2026-10-23; checked 2026-10-21 | release dates, point releases, asset sizes |
| [lean435] | https://lean-lang.org/doc/reference/latest/releases/v4.35.0/ | 2026-10-12; read 2026-10-23 | v4.35.0 release notes |
| [lean434] | https://lean-lang.org/doc/reference/latest/releases/v4.34.0/ | v4.34 2026-09-14 | v4.34.0 release notes |
| [lean433] | https://lean-lang.org/doc/reference/latest/releases/v4.33.0/ |  | v4.33.0 release notes |
| [lean427] | https://lean-lang.org/doc/reference/latest/releases/v4.27.0/ |  | v4.27.0 release notes (cutsat became lia) |
| [leanvp] | https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/ |  | Validating Proofs, the 4.35.0 edition |
| [leanvp-latest] | https://lean-lang.org/doc/reference/latest/ValidatingProofs/ | re-read 2026-10-21 | the page the digest re-read; the alias moves |
| [vcgen] | https://lean-lang.org/doc/reference/latest/The--vcgen--tactic/ |  | the experimental vcgen tactic |
| [pmortem] | https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/ | 2026-08-01; read 2026-10-23 | postmortem of kernel soundness bug #14576 |
| [oss14576] | https://www.openwall.com/lists/oss-security/2026/08/02/1 | 2026-08-02 | the oss-security advisory |
| [leancmp] | https://github.com/leanprover/lean4/compare/v4.32.1...v4.32.2 |  | what v4.32.2 changed |
| [lean-14576] | https://github.com/leanprover/lean4/issues/14576 | fixed 2026-07-28 | the kernel soundness issue |
| [lean-15717] | https://github.com/leanprover/lean4/issues/15717 | 2026-10-15 | open issue: an unsafe cast through ST.Ref in BaseIO; shows the new issue template |
| [lean-pr14953] | https://github.com/leanprover/lean4/pull/14953 | merged 2026-08-28 | removed trustCompiler |
| [lean-pr14990] | https://github.com/leanprover/lean4/pull/14990 | merged 2026-09-07 | lake check |
| [lean-action] | https://github.com/leanprover/lean-action/blob/v1.6.2/action.yml | v1.6.2 | has no input for lake check or lake comparator |
| [comparator-live] | https://github.com/leanprover/comparator-live |  | challenge hash sha256(challenge.trimRight() + newline) |
| [lean-eval] | https://github.com/leanprover/lean-eval |  | counts a problem solved only if comparator accepts |
| [lean-lsp-mcp] | https://github.com/oOo0oOo/lean-lsp-mcp | 0.31.0, 2026-09-30 | beta; includes lean_verify |
| [lean-beam] | https://github.com/leanprover/lean-beam |  | the FRO's preview MCP server and skill |
| [nng4] | https://github.com/leanprover-community/NNG4 | pinned to Lean v4.23.0 | the Natural Number Game |
| [cau] | https://lean.cau.li | measured 2026-10-20; fork lag read 2026-10-23 | community WASM Lean build; needs COOP and COEP |
| [cau-game] | https://lean.cau.li/game |  | its Natural Number Game, a fallback |
| [live-lean] | live.lean-lang.org (host name only, as the brief and digest give it) |  | disclosed, uncredited link-out (OD-4) |
| [subverso] | https://github.com/leanprover/subverso |  | goal-state extraction; format not a public API |
| [verso] | https://github.com/leanprover/verso |  | proof states in documents |
| [treemap] | https://lean-lang.org/doc/api/Std/Data/TreeMap/Lemmas.html |  | Std.TreeMap lemmas |
| [hex] | https://github.com/leanprover/hex |  | the *-theory split, if Mathlib is ever needed |
| [tpil] | https://lean-lang.org/theorem_proving_in_lean4/ |  | Theorem Proving in Lean 4; chapter 12 is Axioms and Computation |
| [fpil] | https://lean-lang.org/functional_programming_in_lean/ | Verso port 2025-06-02 | Functional Programming in Lean; chapters renumbered |
| [didyouprove] | https://leanprover-community.github.io/did_you_prove_it.html |  | Did you prove it? |
| [love2026] | https://github.com/lean-forward/logical_verification_2026 | 2026 | LoVe 2026; lectures 09 to 11 |
| [concsem] | http://concrete-semantics.org/ |  | Concrete Semantics (Isabelle2025-1) |
| [nipkow12] | https://www21.in.tum.de/~nipkow/pubs/vmcai12.pdf |  | Teach Proofs, Not Proof Scripts |
| [sfplf] | https://softwarefoundations.cis.upenn.edu/plf-current/toc.html | PLF 7.1, 2026-08-24 | Programming Language Foundations (Rocq 9.0 or later) |
| [secf] | https://softwarefoundations.cis.upenn.edu/secf-current/toc.html | SecF 1.2, 2026-08-24 | the maintained noninterference text |
| [sflf] | https://softwarefoundations.cis.upenn.edu/lf-current/Basics.html |  | Logical Foundations, Basics |
| [holimp] | https://isabelle.in.tum.de/library/HOL/HOL-IMP/ASM.html | read 2026-10-23 | HOL-IMP stack machine theory |

### SMT and Pyodide

| Key | Source | Date | What it supports |
|---|---|---|---|
| [z3-11179] | https://github.com/Z3Prover/z3/issues/11179 | opened and closed 2026-10-15 | an incorrect unsat |
| [cvc5rel] | https://github.com/cvc5/cvc5/releases | 1.4.0 2026-09-17; 1.4.2 2026-10-08 | release notes |
| [alive2bugs] | https://github.com/AliveToolkit/alive2/blob/master/BugList.md | 2026-01-12 | 24 Z3 bugs, four unsound |
| [pypiz3] | https://pypi.org/pypi/z3-solver/json | read 2026-10-23; saved copy in research/evidence/A5v2/z3pypi.json | z3-solver wheel list and upload times |
| [npmpyodide] | https://registry.npmjs.org/pyodide | read 2026-10-23; saved copy in research/evidence/A5v2/npm-pyodide.json | Pyodide versions and dates |
| [z3guide] | https://github.com/microsoft/z3guide |  | the Z3 Guide, which also runs Pyodide |
| [pact] | https://pact-language.readthedocs.io/en/latest/pact-properties.html |  | archived tutorial with refutation examples |
| [awsarc] | https://docs.aws.amazon.com/bedrock/latest/userguide/automated-reasoning-checks-concepts.html | GA 2025-08-06 | AWS Automated Reasoning checks, seven verdicts |
| [storm] | https://arxiv.org/abs/2004.05934 | 2020 | STORM: 29 critical bugs in 7 SMT solvers |
| [symcert] | https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_30 | FMCAD 2026 | SymCert (the digest gives the DOI) |
| [alive2pldi] | https://doi.org/10.1145/3453483.3454030 | PLDI 2021 | Alive2 (the digest gives the DOI) |
| [egglog] | https://github.com/egraphs-good/egglog | 3.0.0, 2026-08-19 | e-graph rewriting; runs in the browser |

### TLA+, effects and simulation

| Key | Source | Date | What it supports |
|---|---|---|---|
| [tlarel] | https://github.com/tlaplus/tlaplus/releases | read 2026-10-23 | TLC releases; the 1.8.0 tag is re-published |
| [spectacle] | https://github.com/will62794/spectacle | 5827c22 2026-09-30; HEAD 8193eb0 2026-10-23 | MIT |
| [tlabyex] | https://learning.tlapl.us/ |  | TLA+ By Example |
| [learntlanew] | https://learntla.com/whatsnew.html | last content 2023-08-02 | Learn TLA+'s roadmap |
| [lamportii] | https://lamport.azurewebsites.net/tla/inductive-invariant.pdf |  | inductive invariants |
| [lamportvid] | https://lamport.azurewebsites.net/video/videos.html | 2021 videos | fairness and refinement mappings |
| [sysmobench] | https://arxiv.org/abs/2509.23130 |  | SysMoBench: LLM-written TLA+ specs |
| [nl2tla] | https://arxiv.org/abs/2606.05792 |  | natural language to TLA+ |
| [cheerpj] | https://cheerpj.com/docs/licensing |  | CheerpJ licensing |
| [apalache] | https://github.com/apalache-mc/apalache | v0.62.4, 2026-10-12 | symbolic checking of inductive invariants |
| [tracevalid] | https://arxiv.org/abs/2404.16075 |  | trace validation as constrained TLC checking; venue unverified |
| [ccf] | https://arxiv.org/abs/2406.17455 | NSDI 2025 | CCF binds TLA+ to the implementation |
| [mongotla] | https://arxiv.org/abs/2006.00915 |  | MongoDB: trace-checking and model-based test generation |
| [tbsafety] | https://docs.tigerbeetle.com/concepts/safety/ |  | TigerBeetle's VOPR simulator |
| [tb2pc] | https://docs.tigerbeetle.com/coding/two-phase-transfers/ |  | two-phase transfers |
| [turmoil] | https://github.com/tokio-rs/turmoil |  | a deterministic network simulator for Rust |
| [p-lang] | https://github.com/p-org/P |  | P and PObserve |
| [quint] | https://github.com/quint-co/quint |  | quint-connect |
| [hillel] | https://hillelwayne.com/post/list-of-tla-examples/ | 2018-03-08 | the roadmap's TLA+ example list |

### PostgreSQL and databases

| Key | Source | Date | What it supports |
|---|---|---|---|
| [pg19rc1] | https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/ | 2026-10-15 | RC1 announcement; GA planned 2026-11-19 |
| [pg19notes] | https://www.postgresql.org/docs/19/release-19.html |  | PostgreSQL 19 release notes |
| [pglite] | https://registry.npmjs.org/@electric-sql/pglite | 0.5.11, 2026-10-21 | PGlite on npm |
| [pglite04] | https://electric.ax/blog/2026/03/25/announcing-pglite-v04 | 2026-03-25 | single-user mode, one connection |
| [jepsenpg] | https://jepsen.io/analyses/postgresql-12.3 | 2020-06-12 | Jepsen: PostgreSQL 12.3 |
| [pgiso] | https://www.postgresql.org/docs/18/transaction-iso.html |  | transaction isolation, PostgreSQL 18 |
| [pg18notes] | https://www.postgresql.org/docs/18/release-18.html |  | PostgreSQL 18 release notes |
| [pgrls] | https://www.postgresql.org/docs/18/ddl-rowsecurity.html |  | row security, PostgreSQL 18 |
| [pgselect] | https://www.postgresql.org/docs/18/sql-select.html |  | SELECT, including SKIP LOCKED |
| [pgseq] | https://www.postgresql.org/docs/18/functions-sequence.html |  | sequence functions |
| [hermitage] | https://github.com/ept/hermitage |  | isolation tests across databases |
| [ellecli] | https://github.com/ligurio/elle-cli |  | Elle, command line |
| [sqlancer] | https://github.com/sqlancer/sqlancer |  | SQL database testing oracles |
| [michigan] | https://github.com/GLaDOS-Michigan/verification-class |  | read-only *.t.dfy obligation files |
| [codespaces] | https://docs.github.com/en/billing/concepts/product-billing/github-codespaces |  | free hours and cores |
| [elle] | https://doi.org/10.14778/3430915.3430918 | PVLDB 14(3) | Elle (the digest gives the DOI) |
| [isovista] | https://doi.org/10.14778/3685800.3685866 | PVLDB 17(12):4325-4328 | a 4-page demo (the digest cites Crossref) |
| [awdit] | https://doi.org/10.1145/3742465 | PLDI 2025 | AWDIT; its bounds are unverified |
| [troubadour] | https://doi.org/10.1145/3720504 |  | the paper exists; the tool's name and target are unverified |

### Authorization, information flow and dated incidents

| Key | Source | Date | What it supports |
|---|---|---|---|
| [cedarspec] | https://github.com/cedar-policy/cedar-spec |  | Cedar's Lean model and differential testing |
| [cedar24] | https://arxiv.org/abs/2407.01688 | 2024 | How We Built Cedar |
| [cedarblog] | https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/ |  | Cedar's release gate |
| [authv2] | https://www.amazon.science/publications/formally-verified-cloud-scale-authorization | ICSE 2025 | AWS authorization with Dafny |
| [bpa] | https://doi.org/10.1145/3368089.3409728 | FSE 2020 | S3 Block Public Access |
| [cedar-ground] | https://arxiv.org/abs/2403.04651 |  | grounding quantified hierarchy constraints |
| [zanzibar] | https://www.usenix.org/conference/atc19/presentation/pang | 2019 | Zanzibar and the new-enemy problem |
| [sabelfeld] | https://doi.org/10.3233/JCS-2009-0352 |  | what, who, where and when (the digest gives the DOI) |
| [nemo] | https://github.com/knowsys/nemo/releases/tag/v0.10.1 | v0.10.1, 2026-08-01 | Datalog engine that runs in the browser |
| [regorus] | https://github.com/microsoft/regorus |  | a Rust Rego engine |
| [alloy] | https://github.com/AlloyTools/org.alloytools.alloy | 6.2.0, 2025-01-09 | Alloy; Java 17 |
| [alloy4fun-paper] | https://arxiv.org/abs/1907.02275 |  | Alloy4Fun's labeled instances |
| [rfc9111] | https://www.rfc-editor.org/rfc/rfc9111.txt |  | HTTP caching |
| [stripeidem] | https://docs.stripe.com/api/idempotent_requests | read 2026-10-21 | idempotency keys may be pruned after at least 24 hours |
| [btc2010] | https://en.bitcoin.it/wiki/CVE-2010-5139 | 2010-08-15 | outputs that overflowed when summed |
| [bloch06] | https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/ | 2006-06-02 | the binary-search midpoint overflow |
| [starbucks15] | https://sakurity.com/blog/2015/05/21/starbucks.html | 2015-05-21 | the gift-card race |

### Compilers, SQL and assurance

| Key | Source | Date | What it supports |
|---|---|---|---|
| [compcert] | https://compcert.org/man/manual001.html | 3.18, 2026-08-30 | CompCert manual |
| [csmith11] | https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf | PLDI 2011 | Csmith |
| [cidr26] | https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf | CIDR 2026 | LLM SQL rewrites |
| [sqlsolver] | https://github.com/SJTU-IPADS/SQLSolver |  | SQL equivalence prover |
| [qed] | https://github.com/qed-solver/prover |  | QED; needs Z3 and cvc5 |
| [spotit] | https://arxiv.org/abs/2510.26840 |  | single-database checking overstates accuracy |
| [llmjudge] | https://arxiv.org/abs/2412.05561 |  | LLM judges favor equivalence |
| [assurance2] | https://arxiv.org/abs/2004.10474 |  | Assurance 2.0 |
| [sridefeat] | https://arxiv.org/abs/2405.15800 |  | SRI-CSL-2024-01; defeaters |
| [defeaterkappa] | https://arxiv.org/abs/2607.06039 |  | reviewer disagreement on AI-proposed defeaters |
| [bloomfield] | https://arxiv.org/abs/2604.05662 | 2026-04-07 | Personal Understanding Statement; a position paper |
| [oeis] | https://arxiv.org/abs/2608.11941 |  | OEIS Open: 147 solves, 144 confirmed under Comparator |

### AI and formal verification: incidents and benchmarks

| Key | Source | Date | What it supports |
|---|---|---|---|
| [putnamres] | https://trishullab.github.io/PutnamBench/results.json | read 2026-10-21 | PutnamBench results |
| [putnam366] | https://github.com/trishullab/PutnamBench/issues/366 | 2026-10-13 | precedence; #368 and #363 are filed the same day |
| [putnam361] | https://github.com/trishullab/PutnamBench/issues/361 | 2026-10-12 | inconsistent premises (URL as in spine AUD-1.1) |
| [formconj] | https://arxiv.org/abs/2605.13171 | 2026-05-13 | Formal Conjectures |
| [kleppmann] | https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html | 2025-12-08 | the challenge moves to the specification |
| [kimina11] | https://github.com/MoonshotAI/Kimina-Prover-Preview/issues/11 | 2026-09-13 | a dropped ascription; undisclosed native_decide |
| [erdos124] | https://www.erdosproblems.com/forum/thread/124 | 2025-11 | = 1 written for at least 1 |
| [xena] | https://xenaproject.wordpress.com/2025/12/05/formalization-of-erdos-problems/ | 2025-12-05 | Erdos #480 |
| [verina17] | https://github.com/sunblaze-ucb/verina/pull/17 | merged 2026-04-17 | spec and code fixes |
| [formatheoria] | https://arxiv.org/abs/2608.10894 | 2026-08-11 | answer in the statement |
| [alphaverus] | https://arxiv.org/abs/2412.06176 |  | assume(false) |
| [specharness] | https://arxiv.org/abs/2604.00280 | 2026-04 | Spec-Harness |
| [verina] | https://arxiv.org/abs/2505.23135 |  | VERINA |
| [gemini-erdos] | https://arxiv.org/abs/2601.22401 | 2026-01-29 | 13 of 200 meaningfully correct |
| [alphaproof-nexus] | https://arxiv.org/abs/2605.22763 |  | AlphaProof Nexus |
| [axdafny] | https://arxiv.org/abs/2606.32007 | 2026-06-30 | AxDafny |
| [verusguide] | https://verus-lang.github.io/verus/guide/print.html |  | the Verus guide |
| [formalqual] | https://math.inc/formalqualbench | runs 2026-03-18/19 | FormalQualBench |
| [oldrepl] | https://arxiv.org/abs/2507.14722 |  | an old Lean REPL skipped the kernel |
| [faults] | https://arxiv.org/abs/2606.29493 | ICML 2026 | Faults in Our Formal Benchmarking |
| [metr] | https://metr.org/blog/2025-06-05-recent-reward-hacking/ | 2025-06-05 | reward hacking |
| [impossiblebench] | https://arxiv.org/abs/2510.20270 | 2025-10-23 | ImpossibleBench |
| [frontiermath] | https://arxiv.org/abs/2609.25050 |  | off-protocol runs and cost |
| [minif2f] | https://arxiv.org/abs/2511.03108 |  | miniF2F mismatches |
| [jscoq] | https://github.com/jscoq/jscoq/releases |  | jsCoq releases |

### Courseware and exemplars

| Key | Source | Date | What it supports |
|---|---|---|---|
| [poulsen23] | https://doi.org/10.1145/3545945.3569797 and https://arxiv.org/abs/2211.09609 |  | Proof Blocks, a randomized trial with n = 332 novices |
| [forge] | https://doi.org/10.1145/3649833 | 2024 | Forge |
| [forgebook] | https://forge-fm.github.io/book/2026/ | 2026 | Crediting Error Finders |
| [eptcs419] | https://doi.org/10.4204/EPTCS.419.1 |  | a field survey of formal-methods education |
| [ltltutor] | https://doi.org/10.1007/978-3-031-98685-7_9 |  | LTL Tutor |
| [cmu15414] | https://www.cs.cmu.edu/~15414/ | F26 | CMU 15-414 |
| [verifythis] | https://verifythis.github.io/ | 2026 | VerifyThis |
| [leanblueprint] | https://github.com/PatrickMassot/leanblueprint |  | claim graphs for Lean projects |
| [uq] | https://fmtea.github.io/TS1P1.pdf |  | UQ's autograder |
| [asia] | https://fmtea.github.io/TS1P2.pdf |  | ASIA |
| [booklet] | https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf | CC BY-SA 4.0; read 2026-10-23 | the self-explanation booklet (OD-10) |

### Hosting

| Key | Source | Date | What it supports |
|---|---|---|---|
| [ghpages] | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages |  | GitHub Pages |
| [ghdomain] | https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages |  | custom domains |
| [webkit7d] | https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ | 2020-03-24 | WebKit's seven-day storage rule |
| [attest] | https://docs.github.com/en/actions/concepts/security/artifact-attestations |  | artifact attestations |


---

## 11. Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15). Each item keeps its text and ends with its outcome.*

What this page believes the spine gets wrong, or states more strongly than the evidence on disk allows, most consequential first. The spine governs until it changes; this page follows its IDs.

1. **"In the tab" overstates three Pyodide runs.** SP-1.8 ("a timeout that never fires in the tab"), INS-z3's honest-limits cell, RUN-z3-budget-pyodide, RUN-z3-unknown-pow and RUN-z3-fixedpoint all rest on `research/evidence/A5r3/z3-pyodide.log`, whose header reads "z3py in pyodide 314.0.7 under node v22.22.2". Only RUN-z3-starter-pyodide ran in browsers (`browser-runs.log` §1). No browser run of the timeout case, the `unknown` case or Fixedpoint is on disk, and `A5spike/pyo-run1.out` and `pyo-run2.out` are empty. Reword the rows to "Pyodide under Node", or record browser runs (W0-S02 is the natural place). The `rlimit` design is safe either way. *Revision 3: applied, merged with the W0-S02 and W0-S08 browser runs (§5.1 SP-1.8; §9.1; §9.5), which replace the Node-only evidence where they cover it [X RUN-phone-pyodide, RUN-pglite-0511].*
2. **"Native and Pyodide witnesses differ" compares two different queries.** The native probe (`a2r3/scripts/z3_claims.py`) asks for `A >= 0, B >= 0, X > 0, X <= A, B + X < 0`; the Pyodide probe (`A5r3/scripts/z3unk.mjs`) asks for `B >= 0, M > 0, B + M < 0`. Both witnesses are valid, and review round 2 already notes that "A5's probe used another query" (digest-review-2 §2). The rule that grading checks witness properties stands, but SP-1.4, §8.4, INS-z3 and RUN-z3-bv64-pyodide say the two engines disagree, and no same-query run shows it. Say "model values are not canonical", or let GATE-conformance's Pyodide-equals-native check record the same query on both. *Revision 3: already resolved (§5.1 SP-1.4; §8.4; §9.1 INS-z3; §11.2 GATE-conformance): the spine says model values are not canonical, and the same-query pair stays GATE-conformance's.*
3. **RUN-lean-vcgen and RUN-lean-bv-decide are listed as executed, but no output log is on disk.** `lean-measure/proj/ledger/Ledger/Contract.lean`, `ContractBad.lean`, `Bits.lean` and `BitsBad.lean` exist; the outputs appear only as prose in `research/reports/R1-lean.verify.md` (rows 39 and 40, a re-run by the verifier). §9.5 says a run is listed as executed only when its output log is on disk, and that script-plus-prose evidence waits under "To record". Move both to "To record" (W0-S11 can re-run them in minutes), which makes the executed count 34 and the to-record count 104, or commit the outputs. *Revision 3: already resolved in revision 2 (§9.5, m11): both runs moved to To record, W0-S11 has since recorded them, and they are executed rows [X RUN-lean-bv-decide, RUN-lean-vcgen].*
4. **`[V]` is dated 2026-10-23 in the spine's tag legend, but the digest's `[V]` covers two checks.** The independent fact-check pass ran on 2026-10-21 and the API re-check on 2026-10-23. TTL arithmetic (§6.2) needs the actual check date. Define `[V]` as "re-checked on a stated date", or have each row carry its date. *Revision 3: already resolved (Tags paragraph): the spine dates [V] by its own sentence or row, and by 2026-10-23 where none is stated.*
5. **INS-bench-tlc pins `tla2tools` 1.8.0 "by SHA-256", but a hash cannot be re-fetched from a tag that is re-published nightly.** The 1.8.0 tag was re-published again on 2026-10-24T01:42Z [V]. The digest says to vendor the jar (MIT); §11.1's layout has no place for it, and RUN-tlc-jars records the SHA-256 of the 1.8.0 build that ran (2026.10.20.183001, rev d2e1472), not of a tag that keeps moving. Store the jar, in the repository or in the digest-pinned Bench image, with its license file (GATE-privacy), and record the build string in RUN-tlc-jars. *Revision 3: applied (§3.5; §11.1 layout): both jars and their MIT license are committed in `bench/image/tla2tools/`.*
6. **No gate or rule checks TTLs, and only two TTLs are set.** BRIEF §1.2 says every number is "a dated, sourced claim with a TTL". The brief and the spine give 60 to 90 days for tool claims and 60 days for production-twin SHAs, and nothing for dated incidents, papers, leaderboards or quotations; none of the 28 gates warns when a dated fact passes its mark. Add a warn-only date check on the registry of dated facts (docs/ARCHITECTURE.md §20 item 13 proposes the same), and give each class in §6.2 an explicit TTL or an explicit "none". *Revision 3: applied (§11.2 GATE-facts): a warn-only TTL check names tool claims, production-twin pins and the kinds that set no TTL.*
7. **Apalache's boundedness is asserted without a source.** D-18, §12 item 29 and a §8.8 row say Apalache's inductive check "is bounded by the constants and types it instantiates", so it earns [M] and never [P] alone. The digest and the brief say only that Apalache v0.62.4 "checks" inductive invariants, and RUN-apalache-version records a version, not behavior. Tag the statement [D] until a run shows it, or soften it to "treated as [M] unless a parametric proof closes the step". *Revision 3: already resolved (§3.12 D-18; §8.8; §9.2 INS-bench-apalache; §12 item 29): Apalache's bound is tagged [D] until a run shows otherwise.*
8. **`autoImplicit false` is pinned, but no recorded run sets it.** The S2 header (spine §3.2) cites RUN-lean-ledger for "core plus Std, `autoImplicit false`", and BRIEF §2.3 and spine §9.2 state the same pin. `research/spikes/lean/Ledger.lean` sets no `autoImplicit` option and imports nothing from Std (Std is imported by the `vcgen` and `bv_decide` probes). The only file that sets the option, `research/evidence/a2r3/lean/Impl.lean`, has no recorded output. Record the template build with the option set (W2-T01 or W0-T05) and cite that run for the pin. *Revision 3: already resolved (§3.2; §9.2 INS-bench-lean; §13 W2-T01): the pin cites RUN-lean-template, which W2-T01 records.*
9. **The Docker flag set that makes the sandbox pass lives only in review prose.** SP-2.8 and D-15 need it: seccomp, apparmor and systempaths set to unconfined, plus an existing `/run/user/0` (`research/reviews/A5-feasibility.md`). `comp-run3.log`, `comp-run4.log` and `comp-run5.log` show the failure sequence and the pass, but not the `docker run` argv, and W0-S06's acceptance names verdicts, not argv. Have RUN-bwrap-lanes record the argv. *Revision 3: already resolved (§9.5 RUN-lean-bwrap-docker; §13 W0-S06): W0-S06 recorded each lane's `docker run` argv in RUN-bwrap-lanes [X RUN-bwrap-lanes].*
