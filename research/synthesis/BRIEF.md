# v2 Redesign Brief: the formal-methods course (working name **statespace**)

Lead course architect · 2026-10-23 by machine clock (the brief's nominal date is 2026-10-20) · for owner review · successor to kernelspace.

**Precedence.** The roadmap sets scope [roadmap]. Facts executed on this machine on 2026-10-20 win over any report or review [spikes]. Then come the four digests [dl][dp][dr1][dr2] and the finding-level verdicts [rm1][rm2]. I re-checked volatile versions on 2026-10-23 against the GitHub, npm and PyPI APIs.

**Tags.** [X] executed on this machine · [V] re-checked against a primary source on 2026-10-23 · [U] unverified · [D] derived or design rationale. **Citations** are lowercase keys in brackets, resolved in §9 with URL and date. Finding IDs (A1-F1 … A8-21) resolve in [rm1] and [rm2]. Stamp codes such as [P] and [M] are single capitals, so they never collide with keys.

**Publication.** This file is written for a public repo.

---

## 0. Verdict on v1

v1's thesis survives intact, and every review lens said so [dr1 §1][dr2 §1]. Its parts:
- a guarantee is a six-field claim (proposition, assumptions, model, method, correspondence, counterexample-when-weakened) carrying a qualified assurance stamp;
- counterexamples are kept as specimens beside their fixes;
- assumptions are planted as seams, which later stages erode;
- the learner calls a verdict before a tool runs;
- an Audit Desk, scored on precision and recall, trains end-state (g) [v1plan §0–2].

The roadmap-faithful ten-stage arc, the Bench of real tools, build-time checking of authored answers and the drafting-table voice also survive.

What must change is that v1's own machinery commits the errors it teaches:
- **Receipts:** they would mint PROVED for a kernel-bypassed proof of `1 = 2` (A2-F2) and for any agent's work (A1-F1, A6-F1).
- **Sign-off:** a course is "set" by a self-graded or LLM-graded viva (A8-01).
- **Audit Desk:** with 4 sound cases in 32, "reject everything" scores 87.5% precision and 100% recall, beating v1's own mock learner (A3-C3, A8-04).
- **Invented and false numbers:** the mockups show 212 distinct states where TLC finds 11. The flagship specimens stamp a false REFUTED on concurrent transfers at READ COMMITTED, and narrate a `bigint` wrap that PostgreSQL 18.6 actually refuses with SQLSTATE 22003 [spikes].
- **Learning loop:** there is no KC graph, no generator and no review loop (A3-C1, A8-03). Help and content are locked (A4-12).
- **Planning:** no hours are planned against one person's week (A1-F12, A5-F1).
- **Tooling:** Z3, TLA+ and Lean sit on their hardest lanes: an npm build that needs COOP/COEP, a home-made DSL, and hand-authored goal slides (A5-F5, A5-F7, A6-F13).

v2 keeps the thesis, rebuilds the evidence machinery on kernelspace-100x's substrate, and makes every tool fact a recorded run.

---

## 1. Non-negotiables

### 1.1 Roadmap scope, the source of truth [roadmap]

| Stage | Tool | Project (abridged) | Completion test (abridged) | Time |
|---|---|---|---|---|
| 1 | Z3Py | Transfer counterexample; guard → `unsat`; conservation, double capture, buggy refund | Searching for a violation asserts the negation; sat/unsat/unknown precisely; dependence on the encoding | 2–4 sessions |
| 2 | Lean 4 | Pure credit ledger: conservation, non-negativity, unchanged on rejection, finite sequences; then finite maps | No `sorry`; explain the induction without tactics; kernel acceptance ≠ business intent | 3–6 wk |
| 3 | Lean 4 | Mini-Plinth as a typed AST; evaluator with explicit errors; invariant preservation; an unsafe command | A semantics independent of SQL, Rust and UI; zero, self-transfer, failed guard, overflow | 4–8 wk |
| 4 | Lean, Z3 | `miniplinth check`: Inv ∧ Guard ∧ Step ∧ ¬Inv′; a planted miscompilation | Derive obligations by hand for assignment and conditionals | 3–6 wk |
| 5 | TLA+ | Double-spend trace; atomic fix; holds with timeouts, duplicate replies, crashes, restarts, competing resolution | Safety vs liveness; the fairness needed; bounded ≠ proof | 3–6 wk |
| 6 | Postgres, Rust | Compile transfers; differential tests against the interpreter; write skew and RMW races; SERIALIZABLE with retries; R(S,D) | What differential tests establish; NULL, bags, overflow, serialization failures | 4–8 wk |
| 7 | Soufflé or Alloy | Users, teams, roles, documents, sharing; access matrix; paired states; a leaky field; revocation | Observer and equivalence relation; declassification; why the blanket claim is false | 4–8 wk |
| 8 | TLA+ | Outbox chain with a crash between every two steps, duplicates, delays; deterministic simulator | Every crash window; at-least-once duplication; the provider's idempotency as trusted | 3–6 wk |
| 9 | Lean, Rust | Translate a subset to an IR; semantic preservation; a bad optimisation; SQL translation validation | The refinement relation, its boundaries, and what remains unverified | 6–10 wk |
| 10 | All | Core: parser and typechecker, interpreter, SMT, counterexamples, Postgres compiler, runtime; demonstration; publish | A report separating proved, model-checked, runtime-enforced and assumed | open |

**Working approach.** 20% reading, 65% building and proving, 15% documenting, in one evolving lab repository. Keep broken examples, and study only what the next artifact needs.

**The six rules:**
1. Read only enough theory.
2. Preserve broken examples beside fixes.
3. State every guarantee in six parts.
4. Kernel acceptance ≠ requirement.
5. Write a technical note every 2–3 stages.
6. Track what you can independently reason about.

**First weekend.** Project 00, verbatim (3–5 h).

**End-state.** By the end, the learner can:
- (a) state a property precisely;
- (b) distinguish safety, liveness and information flow;
- (c) derive and audit proof obligations;
- (d) understand proofs over language semantics;
- (e) model adversarial concurrent executions;
- (f) establish or test a refinement to Postgres;
- (g) decide which claims are justified before trusting agent-written code.

**Deferred** until an obligation demands it: category theory, advanced dependent types, proof-certificate infrastructure, Kani/Verus, cryptographic protocols, mobile attestation, Cloudflare topology, generalized migrations, UI code generation, multi-framework SDKs. In v2 these appear only as closed Shelf drawers, each with a named trigger. The same list rules out the landscape digest's CDN cache-header lesson [dl §2].

**The owner's brief.** Match kernelspace in scope and quality: about 68–69 lessons in 9 tracks, browser sims, Rust labs graded in-browser, a persistent world, a capstone, zero servers. Design the look, feel and mechanics afresh [roadmap][ks100x].

**Scope ruling.** The roadmap sets scope. An addition survives only where a roadmap line asks for it: RLS for Stage 7's enforcement, and the provider horizon for Stage 8's idempotency [dr1 §4].

### 1.2 Family formula and owner constraints [ksnext][ks100x]

- **No servers.** Zero always-on servers; static hosting; no accounts, telemetry or grading server. Progress is local-first and exportable, and git backs up lab work.
- **The formula.** Browser instruments run real engines. Local labs are graded in the browser. The learner's components plug into one persistent world. Adversarial thresholds are proven against baselines, never guessed. The capstone executes claims.
- **Agent-native tutoring.** `llms.txt`, per-lesson Markdown, and AGENTS.md, CLAUDE.md and guard hooks in every lab zip. The learner's own agent tutors, and the site sees nothing.
- **Sourced numbers.** Every number is a dated, sourced claim with a TTL. Here, every tool number must also be a recorded run (§4.5).
- **Capacity.** One maintainer plus agents; review hours are the binding constraint [ks100x §8].

### 1.3 kernelspace-100x lessons v2 inherits [ks100x]

1. **Evidence, not clicks.** Only graded evidence moves status. The loop is Predict → Play → Build → **Defend** → Keep; "Prove" is renamed because PROVED is an artifact stamp here.
2. **An append-only evidence ledger** with provenance weights. Seeds are drawn at grade time: "unseen, not secret".
3. **A KC graph** with requires, confusable and threshold edges, and every item tagged.
4. **Seeded generators** whose keys come from code.
5. **Today:** 10–12 minutes, phone-first and offline, with a welcome-back set and never an overdue count, plus *Set your week*.
6. **VRK₃₀** as the north star: KCs answered correctly, unassisted, on unseen seeds, at least 30 days after first learning, shown on-device with intervals.
7. **Honest rewards; nothing locks.** No XP for clicks. Streaks count graded work only, with repair. Belts never revoke and never gate.
8. **Guarded AI:**
   - a fail-closed guardrail kit in every lab zip;
   - hint ladders R0–R4 behind an explanation gate;
   - a no-AI Prove-it;
   - no in-page BYOK tutor, no LLM-graded credit, no runtime LLM items.
9. **One claims registry,** with TTLs, "stale since" badges, errata that flag "re-check" and never deduct, and "N things you learned have changed" cards.
10. **Validity CI:** blind-strategy gates (always-pick-the-longest passed 58 of 68 kernelspace quizzes), item lints, and cue-ablation QA.
11. **Staged labs:** a 2-minute first win, stages of at most 25 minutes, results per check.
12. **Capacity rules:** fixed capacity with variable scope, a review-queue gate under 10 h, stretch lists and a cut order.
13. **Reach and polish:**
    - 360 px surfaces;
    - WCAG 2.2 AA, with axe plus a manual screen-reader pass each wave;
    - consent before large downloads;
    - production twins pinned at a SHA;
    - a "this will feel harder" card [deslauriers19];
    - keep/kill rules fixed in advance.

### 1.4 Roadmap concepts, in generic terms

| Generic concept (implied by the public roadmap) | Where v2 teaches it | What the learner can re-stamp, privately |
|---|---|---|
| Credits conserved under transfers | Stage 2 stretch; Stage 3 ResourceOp plus typing rule (V2-16) | Conservation per command: [P] |
| Holds: Available → Held → Captured or Released | Stage 1 constraints; Stage 5 model; Stage 8 replies | Never resolves twice: [M]. Eventually resolves under stated fairness |
| Transfers under SERIALIZABLE with retries; idempotency (roadmap Stages 6 and 8) | 6.7, 8.4 | [T] (n), plus [A]: all writers SERIALIZABLE, Postgres as documented |
| Outbox intent and dispatch; duplicated and delayed replies | Stage 8 | [M] plus [T] (n seeds) via trace validation; provider horizon [A] |
| Read policy: observer, declassification | Stage 7 | Policy [P]/[M]; RLS [E] |
| Proved vs runtime-enforced claims | 4.7, 6.5 | The [P] vs [E] split |
| A report separating proved, model-checked, runtime-enforced and assumed | Stage 10 | The Claims export |

The learner re-stamps their own guarantees in a local-only overlay. Nothing private leaves the browser or enters the repo (A1-F11, A6-F9).

### 1.5 Publication constraint

- **No private content.** No personal identifiers; public copy says "your system".
- **No identifiers.** No personal domains or account identifiers in course copy.

---

## 2. Landscape deltas as of 2026-10

### 2.1 Deltas that change content, tools or labs

| # | Fact (date) | Design consequence | Src |
|---|---|---|---|
| 1 | **An AI-assisted, sorry-free "disproof" of Collatz (2026-07-25)** passed Lean's kernel and a week-old nanoda by chaining two separate bugs. lean4lean shares the kernel bug. The fix (#14577) landed on 2026-07-28 and ships in v4.32.2 | PROVED names its checkers and versions; an advisory can reopen a stamp; "independent" means separately designed | [pmortem][oss14576][leancmp] |
| 2 | **Lean v4.35.0 (2026-10-12):** `lake check` replays the export through the kernel; `lake comparator` matches statements against a challenge; `--paranoid` adds bundled lean4lean, nanoda, con-leche, con-ron and leanchecker-paranoid; builds run in a bubblewrap sandbox, Linux-only [V] | Challenge packs, receipts, audit ground truth (V2-01) | [lean435][leanrel] |
| 3 | **Statements, not proof search, are where it fails:** five entries reached 672/672 on PutnamBench (2026-08-26 to 09-24), yet misformalized statements were still being filed on 2026-10-12/13. Formal Conjectures made 291 fixes, 48.1% of them misrepresentation | Spec-it items; dated "based on" audit cards | [putnamres][putnam366][formconj] |
| 4 | **Core Lean is enough** [X]; a Mathlib `Finmap` project's `.lake` takes 7.3 GB [X]; `grind`'s proof pulls in `Classical.choice`, `omega`'s does not [X] | No Mathlib in Stages 2–9; automation recorded on stamps; manual mode for taught steps | [spikes][a5logs][r1m] |
| 5 | **Lean `vcgen` is experimental.** `requires`/`ensures` arrived in 4.34, `given` in 4.35, `throws` in 4.36-rc1 | A dated production twin, shown after the learner's own VCGen; spike it first | [vcgen][lean435] |
| 6 | **Real engines run in the tab:** Z3Py on Pyodide without COOP/COEP in Chromium, Firefox and WebKit [X]; Spectacle's state counts equal TLC's (11/45/191/813) [X]; PGlite 0.5.11 is PostgreSQL 18.6 on one connection | Drop v1's npm shim and DSL explorer (V2-12, V2-13) | [a5logs][spectacle][pglite][dr2] |
| 7 | **Execution falsified three v1 claims** [X]: C6.2, E1, and "212 states" | A runs registry (V2-03) | [spikes] |
| 8 | **TLA+ tooling lags.** No stable TLC since v1.7.4 (2024-08-05); v1.8.0 is a rolling pre-release, re-published 2026-10-24 [V]. Learn TLA+ still lists exercises and refinement as future work | Pin the jar by SHA; the course writes its own exercises and refinement lessons; adopt TLA+ By Example's authoring contract | [tlarel][learntlanew][tlabyex] |
| 9 | **Solvers have bugs.** Z3 #11179, an incorrect UNSAT, opened and closed 2026-10-15 [V]. cvc5 1.4.0 disabled VTS over soundness issues. Alive2 lists 24 Z3 bugs, 4 of them unsound | Solver-only results stamp "uncertified"; authored unsats are cross-checked with cvc5 | [z3-11179][cvc5rel][alive2bugs] |
| 10 | **Residual risk sits in the spec.** Cedar pairs a Lean model with a verified SMT compiler and differential random testing (DRT): proofs found 4 bugs, DRT/PBT 21. All 7 of AuthV2's shadow mismatches were spec errors. About 32% of LLM SQL rewrites changed results | Stage 7 evidence layers; Stage 9 SQL validation; a verdict-to-stamp table | [cedar24][authv2][cidr26] |
| 11 | **PG 19:** RC1 2026-10-15; GA planned 2026-11-19 [V]; its notes list no isolation or RLS changes | Pin 18.6; link `/docs/18/`; re-record the catalogue after GA | [pg19rc1][pg19notes] |
| 12 | **LLM-written TLA+ specs** violate 41.9% of liveness properties vs 8.3% of safety, and choose fairness that is "overly technical or random" | A liveness base-rate card and audit cases | [sysmobench] |
| 13 | **Outcome evidence for formal-methods courseware is thin;** the best is a novice RCT with n = 332. Forge: "We do not claim to measure learning efficacy" | Import designs, not effect sizes; measure VRK₃₀ | [poulsen23][forge][eptcs419] |

### 2.2 Corrections ledger: never write the left column [dl §1][spikes]

| Wrong | Right |
|---|---|
| "Concurrent transfers lose updates at READ COMMITTED" | Only app-level read-modify-write does: it spends 160 out of 100. A conditional `UPDATE … WHERE bal >= $1` re-evaluates its WHERE clause and loses nothing [X] |
| "`bigint` wraps at 2⁶³−1" | Postgres raises 22003. The model takes a step the database refuses: a refinement failure with an availability effect [X] |
| "212 distinct states; TLC shortest 4" | 11 distinct states with `-deadlock`; the trace has 5 states and 4 actions; default flags stop at "Deadlock reached" after 10 distinct states [X] |
| "The Lean toolchain is about 200 MB" | A 594.5 MB download, 3.0 GB unpacked [X r1m] |
| "Stable TLC writes JSON traces" | v1.7.4 rejects `-dumpTrace`; v1.8.0 writes JSON [X] |
| "`--paranoid` runs six independent kernels" | Six checkers; lean4lean ports the reference inductive logic [pmortem] |

### 2.3 Version-pinned stack

Receipts record every version, SHA-256 or commit. Tool claims carry a 60–90-day TTL [dl §3].

| Layer | Pin (date) | Runs |
|---|---|---|
| SMT, tab | Pyodide 314.0.7 (2026-09-14) [V] + `z3_solver-5.3.1.0` pyemscripten wheel (2026-10-15) [V] | Instrument origin |
| SMT, Bench | Z3 5.3.1; cvc5 1.4.2 (2026-10-08) [V] | Bench |
| Proof | Lean v4.35.0, core plus Std, `autoImplicit false`; `lake check`/`comparator` | Bench (Linux + bwrap; devcontainer) |
| TLA+ | `tla2tools` 1.8.0, pinned by SHA-256 and labelled pre-release; 1.7.4 fallback via text traces; Java 21 | Bench |
| TLA+, tab | Spectacle `5827c22` (2026-09-30, measured); HEAD `8193eb0` (2026-10-23) only after the conformance gate [V] | Instrument origin |
| Inductive invariants | Apalache v0.62.4 (2026-10-12) [V], optional | Bench |
| Database | PostgreSQL 18.6; PGlite 0.5.11 (2026-10-21) [V] | Bench; tab, single session |
| Rust + PG | tokio-postgres 0.7.18, testcontainers 0.28.0, pg_query 6.2.1, proptest 1.12.0 [dl] | Bench |
| Datalog | Soufflé 2.5 (2025-03-24) [V]; Z3 Fixedpoint in the tab [U, spike S3] | Bench; tab |
| Relational | Alloy 6.2.0 (2025-01-09) [V], optional drawer | Bench |
| Shelf | Kani 0.68.0 (2026-09-16) [V]; Verus; Aeneas; Carcara at cvc5's pinned commit | Drawers only |
| Site | React 19, Vite 7, TypeScript 5.9, Playwright, axe; kernelspace's stateless infrastructure vendored at a pinned SHA; JuliaMono v0.63.2 (2026-07-18) [V] | Static pages |

**Avoid:** Stateright and madsim (dormant), jsCoq, embedded Alloy4Fun (server-side storage), self-hosted CheerpJ (commercial licence), a home-made TLA+ explorer, and an npm-Z3 shim [dl][cheerpj].

### 2.4 In-browser vs local split

| Capability | Tab (self-hosted, credited where a checker grades) | Bench (authoritative) |
|---|---|---|
| SMT | Z3Py on Pyodide; budgets via `rlimit`, because `timeout` never returned [X] | Z3 + cvc5 |
| Lean | Goal Replay generated by real elaboration at build time; `#guard_msgs` calls. No embedded WASM Lean: 137.5 MB, needs isolation, 998 commits behind [X][V]. live.lean-lang.org as a disclosed, uncredited link-out | `lake check --paranoid`, `lake comparator` |
| TLA+ safety | Spectacle up to ~5k states; authored scenes from TLC state graphs | TLC |
| TLA+ liveness | Lasso validator over imported TLC traces (lasso JSON [U]) | TLC |
| SQL | PGlite single session; multi-session histories recorded on the Bench and replayed | PG 18.6 multi-session (`isorun`) |
| Datalog | Fixedpoint [U] | Soufflé |
| Simulation | Recorded seeds; the learner's wasm machine under seeded faults | The learner's Rust simulator + TLC trace validation |

### 2.5 Volatility rules

- A tool bump re-runs `runs/` and produces a reviewable diff (V2-03).
- Lean 4.36.0 is likely in mid-November [D]. Pin 4.35.x per edition; run `verify:labs` monthly against the newest stable.
- `/docs/current/` flips to PG 19 on 2026-11-19, so link `/docs/18/` [D].
- Spectacle and the TLC tag move weekly, so pin by commit or SHA.

---

## 3. Evidence-based pedagogy

### 3.1 Calibrate expectations

Across 1,942 effects in 747 education RCTs, the median is 0.10 SD [kraft20]. The effects below come from aligned, researcher-made tests, mostly with K-12 or undergraduate samples. They do not add up. For one adult they mean "more likely than not to help". No learner-facing copy promises multiples.

### 3.2 Principles → mechanics

Grades follow [dp]: **A** = meta-analysis or several RCTs; **B** = one good similar experiment; **C** = small, correlational or preprint; **D** = rationale.

| Principle → v2 mechanic | Effect | Boundary | Grade | Src |
|---|---|---|---|---|
| Retrieval with *application* items → Call It, Today, re-find on fresh seeds | g = 0.50 vs restudy; transfer d = 0.40 only with application items | One complex-strategy exception | A | [rowland14][pan18] |
| Spacing → FSRS-scheduled Today | Spaced vs massed g = 0.74; expanding vs uniform gaps, n.s. | Mostly verbal material | A | [latimier21][cepeda08] |
| Successive relearning → "signed off", then "settled" | 3 spaced sessions beat time-matched restudy | Mostly declarative | B | [higham22][rawson13] |
| Interleave only confusables → "Which is it?" sets | g = 0.42; up to 0.65 for subtle categories | After first exposure | A | [brunmair19][samani21] |
| Prequestions → a call before each segment | g = 0.54 on asked content vs 0.04 on unasked | No study of formal procedures | A | [sthilaire23] |
| Hypercorrection → sure-and-wrong re-tests at ~1 day and ~1 week | Confident errors are corrected most often, but return | Facts, science | B | [butterfield01][butler11] |
| Expertise reversal → scaffolding set per KC | High assistance d = +0.505 at low prior knowledge, −0.428 at high | Asymmetric: when unsure, help | A | [tetzlaff25] |
| Correct worked examples first → generated Goal Replay | g = 0.48; self-explanation prompts *negative* | Mathematics novices | A | [barbieri23] |
| Backward fading; **no prompts on completion blanks** | Blanks plus prompts impaired proof learning | Geometry proofs, N = 111 | B | [renkl02][hilbert08] |
| One self-explanation unit before Stage 2 | g = 0.55; proof booklet d = 0.95 (Exp. 1) | Thin retention evidence | A/B | [bisra18][hodds14] |
| Proof Blocks, after reading | Equal at one week in 11.1 vs 43.4 min (N = 332) | Induction proofs | B | [poulsen23] |
| Contrasting cases → sound/flawed twins; CTI vs bug | d = .50; larger when the principle comes after comparison | — | A | [alfieri13] |
| Erroneous examples → Audit Desk | g = .136; d = .33 at one week | Needs prior knowledge | A (small) | [alemdag25][mclaren15] |
| Layered, elaborated feedback | Elaborated .49 vs right/wrong .05; over a third of feedback interventions harmed | Detail adds load for experts | A | [vdkleij15][kluger96] |
| Counterexample plus a class hint; generalise after minimise | Counterexample-only feedback raised give-ups from 27% to 44%; learners patched the special case | DFAs, N = 377; Alloy cohorts | B/C | [dantoni15][danas17] |
| Hidden oracles and distinguishing scenarios → spec-it | Invalid test suites fell from 29.7% to 9.3% | Non-randomised | B−/C | [wrenn19][prasad26] |
| Refutation card after repeated misses on one misconception tag | Consistent advantage across 294 effects, pre-registered | Science; untested in logic | A | [danielson24] |
| Manual mode for the taught step | 48% finished "without thinking, just clicking randomly"; 15% with manual steps | Non-equivalent cohorts | C | [keenan26] |
| Credit only unassisted work; explanation gate before hints | Unguarded GPT: practice +48%, exam −17%; gated "blackout" failure 39% vs 77% | High school; preprint | A−/C | [bastani25][sankar26] |
| Informational rewards; nothing locks | Expected rewards −.28 to −.40; self-paced mastery cuts completion | College | A | [deci99][kulik90] |
| Recorded weekly monitoring → the weekly Claims review | d+ = .40 across 138 RCTs | Mostly health | A | [harkin16] |
| 1–2 if-then plans | d = .15 after bias correction | Publication bias | A (small) | [sheeran25] |
| Repairable, gain-framed weekly rhythm | Repair softens the effects of broken streaks | Consumers | B | [silverman23] |
| Keep specimens (error management) | d = .44; .80 on structurally different tasks | Adult software training | A/B | [keith08] |
| Near transfer, hugged and bridged → twin labs | Far transfer ≈ 0 under controls | Reviews | A/B | [sala19][grossman11] |
| Size the keep loop to decay → a Lean keep-alive | Half of the gains gone by ~6.5 months when unused | Procedural; proof decay unmeasured | A | [tatel25] |

### 3.3 Anti-patterns we will not build

| Anti-pattern (v1 or common) | Evidence | Instead |
|---|---|---|
| Locks: drawers that open after two misses, audits unlocked by "set", Run gated on every call | Mastery gating cuts completion [kulik90] | A computed status; calls only on first runs |
| Self- or LLM-graded viva | Low performers inflate self-grades [hacker00]; LLM proof scores inflated up to ~20× [petrov25] | The Defence (§4.7) |
| Progress = claims | Substitution harms learning [bastani25] | Unassisted evidence |
| A Brier headline from 40 calls; a 55/75/95 scale on three-way verdicts | 7 of 12 right has a 95% CI of 0.32–0.81 [D]; content teaching *raised* overconfidence [stone00] | Bias, a reliability diagram, intervals, a minimum n |
| 4 sound audit cases out of 32 | "Reject all" scores 87.5% precision and 100% recall [D] | A seeded 30–60% share |
| Completion blanks plus self-explanation prompts | [hilbert08][barbieri23] | Principle prompts on revealed steps only |
| Automation closing the step being taught | [keenan26] | Manual variants (`grind`/`omega` off) |
| Teaching "invariant" as inductive, so sat ⇒ bug | Misconception O3 [dp §2] | A three-way verdict |
| Counterexample-only or minimal-only feedback | [dantoni15][danas17] | Class hints; generalisation |
| Answer-giving chat, LLM graders, runtime LLM items | An LLM "randomiser" picked one case in 6 of 7 exams [ipeirotis26] | Explanation gate; checkers |
| Parameter-only generators; longest-option keys | One generator leaks 13 pp vs 2–3 pp with pools [chen18] | Structural variety; blind-strategy CI |
| XP, leaderboards, daily counters, loss framing | [deci99][silverman23] | Competence statements |
| "Due" notes and deadlines | Self-set deadlines didn't help [bisin20]; the classic study was retracted on 2026-09-02 [retraction26] | Windows; a cadence |
| Timed Defences | Harm appeared under speed pressure [shen26] | Untimed |
| Validating items on simulated learners | LLM "students" correct themselves after any feedback [do26] | Learner-zero plus logs |
| Myths: learning styles, mindset messaging, immersive 3D | d = 0.05 for mindset messaging [macnamara23]; immersive ES 0.24 [wu20] | Don't build |

### 3.4 Dosage targets

| Dose | Target | Basis |
|---|---|---|
| Study | 6–10 h/week, planned at the pessimistic end (×1.6) | [buehler94][oreo19] |
| Segment | 12–15 min, ending in a graded interaction; one tool per session | [dp] D |
| New tools | ≤ 1 per stage; first contact in the browser | kernelspace drop-off [ks100x] D |
| KC graph | ≈ 80–100 KCs (cap 110), ≈ 25 of them threshold KCs that spiral | [dp][dr1] D |
| Per KC | A prequestion, 1–2 calls and an exit item; then ≥ 8 graded opportunities in 60 days (at ~1–3, 7, 21, 45–60 days) | [koedinger23] analogy |
| Maintenance | FSRS at 0.85–0.90 retention | A |
| Signed off; settled | Fresh items right in ≥ 3 spaced sessions plus the Defence; settled = a fresh probe ≥ 30 days later | [higham22] B |
| Keep | 30–40 min/week, recomputed from logged item times | D |
| Interleaving | After the exit item; ≤ 50% of a session; confusable sets only | [brunmair19] |
| Audit | 2–3 cases a week; ≥ 6 per gap class | D |
| CTI items | ≥ 4, interleaved through Stage 9 | D |
| Claims | 2 by ~week 4; never more than 2 weeks without a new claim or specimen | D |
| Writing (15%) | Short prompted writes; a 600–1,000-word note every 2–3 stages | [kobayashi19] |
| Lean keep-alive | 20–30 min every 2–3 weeks while Lean is idle (Stages 5–8) | [tatel25] D |

### 3.5 n-of-1 decisions

One learner cannot power randomisation. Keep/kill rules are fixed in advance and read descriptively from 30-day fresh-seed accuracy. Candidates [dp §7]:
- feedback layer open vs collapsed;
- Proof Blocks distractors vs none;
- counterexample vs class hint;
- reserve weeks vs none.

---

## 4. Assessment architecture

### 4.1 Principles

- **Checkers decide,** about the learner too: Z3, TLC, Spectacle, the interpreter, `lake comparator`, cargo, and keys computed by tools at grade time. Lean's manual treats "un-reviewed AI-generated proofs" as potentially malicious and prescribes the comparator [leanvp].
- **LLMs only propose:** reading prequestions, adversarial cases, hints. A witness certifies each flaw. No LLM grades and no runtime LLM items [dp §3.1].
- **The course stamps its own assessments.** A passed Defence is [T] (n unseen items), never PROVED competence. A self-grade is [A].
- **Claims ≠ Evidence.**
  - *Claims* record what artifacts establish. Agents may produce them, so claims never move "signed off".
  - *Evidence* credits only unassisted, checker-graded work on unseen seeds.

### 4.2 Evidence records and provenance

- **Event fields.** Each event records `{id, kind, ref, itemRev, engine@version, seed, ok, conf, provenance: own|assisted|agent|automated, seen|unseen}`.
- **Weights.** Only `own`+`unseen` events count toward sign-off, VRK₃₀ and Judgment, following kernelspace's provenance weights [ks100x V6].
- **Honesty.** Provenance is self-declared and calibrates rather than polices. Nothing local can verify "unassisted", and the copy says so [dr1 §4].

### 4.3 Statement integrity: you state, agents prove, the kernel checks, you audit

- **Challenge packs.** Every Lean lab ships a read-only `Challenge` module (definitions and statements) plus a `comparator.json` listing permitted axioms, which are taught. In measured runs, comparator accepted an honest proof and rejected a weakened statement ("theorem statement do not match") and a redefined `transfer` ("Const does not match") [X a5logs][r1m].
- **Two verdicts, not one.** A planted `sorryAx`, `_native` axiom or custom axiom exits 1, yet the log still says the default kernel accepts [X r1m]. A `sorry` build exits 0 [X r1m]. A `debug.skipKernelTC` proof of `1 = 2` built green, and only kernel replay rejected it (A2-F2). So receipts parse every verdict and never trust an exit code alone.
- **Hashed statements.** Non-Lean statements live in `claims/*.tla`, `*.smt2` and `*.yaml`. Receipts store their hashes, and a changed hash voids the claim to UNKNOWN.
- **Learner-owned semantics** (Stages 3 and 9) are checked against a pinned reference evaluator plus kernel-checked goldens (`theorem golden_k : run c s₀ = r := by decide`; no `implemented_by` or `native_decide`). The fallback is stamped "statement check: weak".
- **Receipt v1** is a published JSON Schema. It records statement hashes, argv, exit codes, verdicts, `sandbox: on|off|failed` (recorded, never required), tool hashes, TLC flags, Z3 `rlimit`, and the lane: *re-checked here*, *reported from your machine*, or *self-assessed*.
- **Agent claims** are shown as quoted, UNREVIEWED text and never stamped.

### 4.4 Checker-graded constructed responses

| Family | Learner produces | Grader | Stages |
|---|---|---|---|
| negate-it / spec-it | A negation, violation query, property or policy | Z3 checks P⇒R and R⇒P over a decidable fragment or bounded domain and returns a distinguishing state; a non-vacuity witness is mandatory | 1, 4, 7 |
| WP-it | A weakest precondition | Z3 equivalence, since WPs are unique up to equivalence | 4 |
| find-the-witness | A model, state, trace, history, or pair of states | The engine itself; no stored key; then name the *class* | 1, 3, 5–9 |
| CTI-or-bug | A verdict on an invariant: inductive, CTI (strengthen it) or reachable (fix the command) | Init⇒Inv, Inv∧Next⇒Inv′, Inv⇒Safe; then a bounded reachability search | 4, 5 |
| trace-allowed / lasso-or-not | One satisfying and one violating trace | TLC state graph; lasso validator | 5, 8 |
| anomaly-ID / leaks-to-observer | A history class, or a state pair the observer tells apart | History checker; paired-state evaluator | 6, 7 |
| call-it + multiple true/false | A verdict and confidence; true/false over ~5 scenarios | Keys computed at grade time; makes requirement mismatch gradable | all |
| proof-structure | The next goal, a Proof Blocks order, the needed hypothesis | Goals from real elaboration; hypothesis deletion in CI | 2, 3, 9 |
| defend | Predictions about seeded mutations of the learner's *own* artifact | comparator, TLC, Z3, cargo | 1–9 |

**Modes.** *Practice* shows witnesses and class hints. A *probe* is one shot, with feedback only after submission, because counterexamples invite patching of the special case [dantoni15]. Graded items stay in decidable fragments, with labelled bounded checks as fallback. `unknown` instances are discarded. Oracles are "unseen, not secret": a static site cannot hide them.

### 4.5 Generators and runs

- **Generators:**
  - Seeds are drawn at grade time.
  - Each KC family gets 2–4 structurally different templates, banded by operator count, quantifier alternation, trace length and process count [chen18].
  - Distractors are mutants from the misconception catalogue [dp §2], each tool-checked as distinct from the key and tagged with a misconception id.
- **Lints and CI:**
  - Lints check length, convergence and absolute words.
  - `verify:audit-blind` and blind-strategy CI fail if any blind strategy (always reject, always accept, longest option, topic-is-class) beats chance + 2 SD.
- **Every tool number, verdict, flag and version in copy, keys or artboards is a `{{run:id}}` reference.** `runs/` records engine, version, binary hash, argv, input hash, budget and outputs. `verify:numbers` fails on any untagged one.
- **Sat answers** are graded by checking the witness, never by matching a model: the native and Pyodide witnesses differed [X].

### 4.6 Calibration (Call It)

- **When to ask.** Only on first runs of authored cells and on generated items. Free runs stay ungated, with an expert skip once a KC is solid. Only the first call counts.
- **Confidence.** Three taps (*guess · think so · sure*) with printed bands taken from certainty-based marking's switch points (below 67%, 67–80%, above 80%). The item shows its chance level, 1/k. The CBM payoffs (+1/0, +2/−2, +3/−6) are shown before choosing and used **as feedback only, never credit**, because penalties mix risk attitude into the score [cbm][baldiga14].
- **Display.** The private Mirror leads with bias (stated confidence − accuracy) and hit rate per band, with Wilson intervals. Only post-instruction, unassisted calls count, and nothing is diagnosed below about 20–30 calls per band [stone00][fernandes26].
- **Sure-and-wrong calls** return at ~1 day and ~1 week [butterfield01].

### 4.7 The Defence (replaces the self-graded viva)

The Defence is untimed and taken over ≥ 2 sessions within a week of the lab. A gap before a separate exam loses learners [serth22].

| Part | Content | Graded by | ≈ min |
|---|---|---|---|
| A. Probes | 10–12 unseen-seed items from ≥ 3 families; the roadmap's completion tests turned into items; agent closed; a call on each | Checkers | 35 |
| B. Defend | 4–6 mutations of your own artifact (drop a hypothesis, weaken a guard, ℤ→ℕ or BitVec 64, split an atomic action, drop weak fairness, widen the observer); predict first | Lean, TLC, Z3, cargo | 20 |
| C. Audit | 2–4 cases, at least 1 sound; typed evidence | Evaluator and keys | 15 |
| D. Explain-back | A 2-minute oral and a 3-idea self-check compared with Part A; **required, uncredited** | — | 10 |

- **Signed off:** A–C at least 75% overall and each part at least 60%, with the Wilson interval shown. For example, 10 of 12 gives 0.55–0.95 [D].
- **Settled:** a probe per KC returns correct at ≥ 30 days and feeds VRK₃₀.
- **Grade B−.** Part B has face validity only [dp §3.5]. Retrieval [rowland14], case sampling [wass03] and explanation [kobayashi19] support the rest.

### 4.8 The Audit Desk

- **The pool.** Matched sound/flawed twins, about 50% sound in the pool. Each session draws its sound share from a seed in the 30–60% range, so the rate cannot be learned. About 24 anchors carry generated variants, with ≥ 6 exemplars per class and every key set by a real tool run.
- **Flow:**
  1. Call the statement alone.
  2. Reveal the diff.
  3. Write "This proves: ___".
  4. Pick a gap class, with no default; "none: sound" is an option.
  5. Anchor typed evidence to lines: a witness, the offending declaration, the mismatched identifiers, paired states, or a scenario the theorem permits and the requirement forbids.
- **Scoring.** Per-class precision and recall plus balanced accuracy, with Wilson intervals, reported per class only once n ≥ 10.
- **Cards.** Each case has a "based on" card citing a dated incident, and no exploit code.
- **Taxonomy v2** [dl §4][dr1 D3][dr2 A4]:
  - *Rebutting:* 1 statement too weak (subclass: non-functional omission → NOT COVERED); 2 vacuous premise; 3 wrong property kind (including 2-safety); 12 requirement mismatch.
  - *Undermining:* 4 encoding and type-semantics slip; 5 bounded or inconclusive presented as proof; 6 hidden trust (subclasses: escape hatches, native trust, `skipKernelTC`, "the check never ran", a trusted-base bug); 7 an unstated environment assumption; 11 a test presented as proof, or common-mode evidence.
  - *Undercutting:* 8 model–implementation drift (subclasses: statement substitution, answer in the statement, tampering, code bent to fit the proof); 9 granularity; 10 observer too weak; 13 induction failure confused with a bug.

### 4.9 Stamps and the verdict → stamp table

**Words and their required qualifiers:**
- PROVED [P] · *checker@version* (for example "Lean 4.35.0 kernel + 5 checkers", or "Z3 5.3.1 unsat · uncertified · rlimit N")
- MODEL-CHECKED [M] · *constants, complete or partial*
- TESTED [T] · *n and generator statistics*
- ENFORCED [E] · *where*
- CONFIGURED [C] · *source*
- ASSUMED [A] · *why*
- UNKNOWN [?] · *reason*
- NOT COVERED [N]
- REFUTED [R] · *witness length*

EROSION is an event, not a stamp. Each claim renders a **three-segment strip**: proposition-of-model, correspondence, requirement-fit; requirement-fit is never [P] [dr2 A6].

| Raw output | Stamp |
|---|---|
| `unsat` of ¬P on the learner's encoding | [P] of the encoding, plus an open defeater: "encoding unverified" |
| `sat` plus model | [R], after replay |
| `unknown`, timeout, `rlimit` | [?]; fails closed when it guards enforcement [bpa] |
| Bounded pass | [M] with its bound |
| DRT with no divergence | [T] (n, generator statistics) |
| Shadow or gold mismatch | No stamp; a defeater against both sides |
| A `_native` axiom | [P] · kernel + compiler |
| "Results match" on one database | [T] (1 instance) |
| An LLM says "equivalent" | No stamp |

**What this cannot establish.**
- Unassisted work is self-declared.
- Oracles are visible to a determined learner.
- Defence Part B lacks outcome data.
- n = 1.

These limits are printed on the course's own assurance page.

---

## 5. Prioritised change list (both review rounds, deduplicated)

Severity: **C** = critical (settle before authoring), **M** = major, **m** = minor. Round-1 change IDs (D…) and round-2 change IDs (A…, B…, C…) are in brackets.

| ID | Sev | What changes, and how | Why (findings) |
|---|---|---|---|
| V2-01 | C | **Statement pins and challenge packs; agents prove, the learner states** (§4.3). `bench check` runs build → `#print axioms` → `lake check` → `lake comparator`, with `--paranoid` in CI and at the Defence. The agent kit (AGENTS.md, CLAUDE.md, fail-closed PreToolUse hook on `TODO(you)`, challenge, claims and receipts) is in every zip [D1, D2, A1] | A1-F1, A2-F2, A2-F13, A2-F18, A5-F3, A5-F11, A6-F1, A8-02, A8-07, A3-M10, A4-01 |
| V2-02 | C | **Credit only from machine-graded, unassisted work.** The Defence replaces the viva; the BYOK examiner is deleted; "signed off" is a learner state that never borrows PROVED's colour [D1, A2] | A8-01, A6-F5, A3-C2, A4-13, A4-16, A7-02 |
| V2-03 | C | **Every tool fact is a recorded run; fix false content now.** E1 becomes a 22003 refusal. C6.2 names its compilation pattern. Theater numbers come from runs (11 vs 4 distinct states; 4 actions = 5 states; argv including `-deadlock`). One overdraft witness, with "minimal" defined as an Optimize objective. The flagship card is fixed: dropping Allowed leaves conservation intact, only non-negativity fails, amount = 1. A new specimen shows TLC reporting termination as deadlock. Artboards are labelled "illustrative" until promoted [A3, D21] | A5-F2, A6-F3, A6-F17, A6-F20, A7-07, A7-24, A8-14, A2-F7, A2-F8, A2-F17, A1-F21, A4-10 |
| V2-04 | C | **A valid Audit Desk** (§4.8): twins, a seeded share, typed evidence, statement-first flow, no pre-selected class, a blind-strategy gate, compiled cases (A2.1 recompiled), A4.2 kept as sound, a vacuity trap added [D3, A4] | A3-C3, A3-M7, A4-11, A2-F4, A2-F14, A1-F11, A4-17, A6-F4, A8-04, A7-08, A7-09 |
| V2-05 | C | **Valid calibration** (§4.6). The rail shows titles only, so answers don't leak. At least 30% of calls are genuine surprises; no verdict exceeds 60% per stage; every option has a "why" and a misconception id. Lesson 1.2's first scored call is a fresh variant, because the roadmap's starter prints `# sat` [D15, A4] | A2-F16, A3-M2, A3-M3, A4-12, A7-07, A7-10, A7-11, A8-05, A8-17, A6-F18 |
| V2-06 | C | **Retention.** A KC graph, generator families (negate-it, find-the-witness and call-it ship first), FSRS-scheduled Today, re-find as "same move, new specimen", VRK₃₀, and a thin Lean thread through Stages 5–8 [D6, A5] | A3-C1, A3-M5, A3-M6, A3-m8, A4-02, A6-F2, A8-03, A8-06, A7-13, A8-18 |
| V2-07 | C | **Stage 6 on measured Postgres.** The compilation strategy is the lesson variable: read-modify-write (lost update at RC, 40001 at RR), conditional UPDATE (safe at RC), predicate-read-then-insert (write skew at RR, 40001 at SERIALIZABLE), opposite-order moves (40P01). Both rowcounts must be 1, with typed errors and `NOT NULL CHECK`. Retries cover 40001 and 40P01; termination is [A]. Concurrent R(S,D) is abstract serializability. A deterministic lock-wait harness, never sleeps [D4, D11] | A1-F2, A2-F1, A2-F9, A1-F5, A1-F9 |
| V2-08 | C | **A truthful 64-bit story.** Under signed BitVec 64 the guard holds only with `amount > 0`; then only the recipient wraps, and a mixed signed/unsigned guard readmits the overdraft. A six-row table: Lean ℤ and Z3 Int never overflow; BitVec wraps; PG `bigint` and `numeric` raise errors; Rust `i64` panics in debug builds, wraps in release, and returns None from `checked_add`. Remedies are a bounded semantics, `Except Overflow`, or `numeric` with a bound; the Kani drawer opens here [D5] | A2-F3, A1-F14, A2-F19, A4-14 |
| V2-09 | C | **A budget that governs additions.** `verify:budget` holds each stage to the roadmap's upper bound. Every addition names what it displaces. The owner works in one weekly envelope (review ≤ 2–3 h); a wave starts only when the queue is under 10 h; learner-zero; outcome-based exits [D7, B6] | A1-F12, A4-03, A4-09, A4-15, A5-F1, A5-F12, A5-F19, A8-21 |
| V2-10 | C | **Stamps that mean what they say** (§4.9): CHECKED becomes MODEL-CHECKED (it collided with Postgres CHECK); CONFIGURED and NOT COVERED added; codes, not glyphs; shapes separable in greyscale; `verify:stamps` derives each stamp from its receipt; stamp colours never leak to progress [D16, A6] | A2-F5, A1-F15, A1-F16, A3-m7, A7-01, A7-02, A7-03, A7-04, A7-05, A7-06, A7-16, A6-F14 |
| V2-11 | M | **Invariant ≠ inductive invariant.** A 2×2 contrasting set at 4.4; a CTI workbench; L4 outputs "inductive", "CTI", "REACHABLE in k" or "none within N"; a vacuity query beside every `unsat`; lesson 5.9 "MODEL-CHECKED ≤ N → PROVED for every N" [D8, B11] | A3-C4, A2-F14, A3-m3, A6-F6 |
| V2-12 | M | **Z3 through Pyodide on its own origin.** Budgets via `rlimit`; `worker.terminate()` is the hard stop; UNKNOWN taught with reason-stable `x**y == 8`, never timeouts; "unsat proves ∀ for exactly your encoding, if the solver is sound"; authored unsats cross-checked with cvc5 at build time [D14, B1] | A2-F6, A2-F11, A2-F12, A1-F18, A5-F5, A6-F12, A8-15 |
| V2-13 | M | **One TLA+ semantics.** PlusCal translated at build time; authored scenes are TLC graphs (`-workers 1`, explicit deadlock flag); edits run in Spectacle; a lasso validator; Theater controls show enabled actions; witness length counted in actions; a fingerprint-collision note at 5.8 [D12, B2] | A2-F10, A1-F7, A2-F7, A3-m6, A5-F7, A6-F11, A7-19 |
| V2-14 | M | **Lean: core-only, generated, staged, with help.** `Acct → Int`, Std; Goal Replay regenerated on every bump (`verify:replay`); lab stages ≤ 25 min; hint ladder per pinned theorem; a Lean error museum; NNG first, with a pinned fallback; "this will feel harder"; fading only for the 5–6 hardest families [B3, D17] | A5-F8, A6-F13, A8-09, A8-10, A8-19, A4-05, A4-08, A3-M4, A3-m1, A2-F18 |
| V2-15 | M | **Two grading lanes, one IR.** Lane A is the learner's Rust compiled to wasm and graded in the tab on fresh seeds: interpreter, VC checker, SQL compiler, outbox machine, validator. Lane B is receipts (Lean, TLC, multi-session PG). `lake exe` emits one JSON IR. Mismatches are triaged as spec, implementation, tool or proof errors [D9, B7] | A1-F8, A4-18, A5-F20, A8-13 |
| V2-16 | M | **Mini-Plinth gets typed resource operations.** ResourceOp (hold, capture, release, move) as postings with mint and sink accounts; a typing rule that forbids assigning resource fields; `Amount := {n : Int // 0 < n}`; steps return `Except Err (State × Output × List Effect)`. Lesson 6.5 is "Enforced at commit" [D10, D11] | A1-F3, A1-F5, A1-F20 |
| V2-17 | M | **One home for evidence.** The lab repo is the record (`claims/*.yaml`, `specimens/`, `receipts/`, `broken/` beside `fixed/`). The browser keeps practice events only. A typed claim graph propagates erosion along rests-on edges. Export bundles plus a 7-day backup nudge, because WebKit can clear script storage after 7 days [B4][webkit7d] | A5-F4, A6-F19, A8-07 |
| V2-18 | M | **Gate pipeline.** A fast lane (< 5 min, blocking) and a heavy nightly lane that blocks *releases*; conformance gates (Spectacle = TLC, Pyodide = native Z3, PGlite = PG 18.6, Fixedpoint = Soufflé); kernelspace infrastructure vendored at a pinned SHA; ≤ 6 block types at first [B5] | A5-F9, A5-F10, A5-F15 |
| V2-19 | M | **Isolation and phones.** A message-only instrument bus; a separate instrument origin on its own custom subdomain, because project Pages sites share `<owner>.github.io` [ghpages][ghdomain]; consent above 5 MB; phone flow = predict → recorded run → queue the lab for later; self-hosted font subsets [B8] | A5-F6, A5-F14, A7-21, A7-23 |
| V2-20 | M | **Project 00 first; nothing locks.** Course 00 dissolves into just-in-time drawers plus adaptive placement; Boot ≤ 8 min; test-out per stage; nav = Today · Stages · Bench · Audit · Claims; "signed off" replaces "set" [D13, B9, B11] | A1-F13, A4-04, A3-M1, A3-M11, A6-F15, A6-F16, A8-08, A8-11, A7-12, A7-14, A4-19 |
| V2-21 | M | **Accessibility and notation.** A WCAG 2.2 AA gate at 360/320/1280 px; native radios; a keyboard Derivation Board (SC 2.5.7); traces as tables; JuliaMono (Plex Mono lacks 36 of 49 symbols); `verify:glyphs`; ASCII TLA+ by default [B10] | A5-F18, A7-15, A7-17, A7-18 |
| V2-22 | M | **The Bench as the roadmap names it.** A digest-pinned devcontainer as the default; `doctor`; Codespaces prebuild; tools met first in the browser; PLF's Rocq notation named [D24, B7] | A4-06, A5-F13, A5-F16, A5-F17, A6-F7, A8-20 |
| V2-23 | M | **Stage 7 within budget.** One Datalog engine pair with derivations; self-composition through the learner's own VCGen; RLS as a core lesson (SET ROLE differential; owner bypass, FORCE, covert channel); Alloy becomes a drawer; the small-scope claim taught as Jackson's hypothesis [D19] | A1-F6, A2-F20 |
| V2-24 | M | **Stage 8.** Replies are untrusted input (status checked, capture ≤ hold, late replies rejected); inbound keys written in the same SERIALIZABLE transaction; the provider-horizon seam (Stripe prunes keys after ≥ 24 h) [stripeidem]; a simulator plus TLC trace validation [D20, D12] | A2-F15, A1-F7, A1-F10 |
| V2-25 | M | **A thin persistent world** in the roadmap's nouns (§7.4); the mutation generator plays the agent; erosion fires from the oldest seam [D22, C2] | A1-F4, A6-F8 |
| V2-26 | M | **Practice that produces.** Formalize items go pick → fix → write; claim cards fade from prefilled to learner-written, checked by `verify:claims`; specimens go from mounted to kept; erosion opens with a forecast; notes come from memory before links; a fix must also kill a non-minimal witness [D18, B11] | A3-M8, A3-M9, A3-m2, A3-m4, A3-m5, A6-F20 |
| V2-27 | M | **Hall of Records** (§6, #9) [B11] | A6-F10 |
| V2-28 | M | **Your own design as the final exam,** in a private overlay [D23, C3] | A1-F11, A1-F12, A1-F15, A6-F9 |
| V2-29 | M | **Stage 9 restructured.** A stack-machine warm-up ported from HOL-IMP [holimp]; translation validation as the first win; forward vs backward simulation vs bisimulation; aborts observable; IR determinism stated [D17, D25] | A4-07, A2-F21, A1-F20 |
| V2-30 | m | **Shelf triggers match real obligations.** Kani opens at E1; certificates open at 4.9's "Z3 trusted" seam [D25] | A1-F17 |
| V2-31 | m | **Siblings: link, don't re-teach.** Bridge cards to tablespace's concurrency and durability tracks and to byzantine's harness, each with a self-contained prerequisite card; a light kernelspace strand [D26, C4] | A1-F19, A6-F21, A8-12 |
| V2-32 | m | **Evidence-tagged mechanics** (Ev or Prec); n = 1 keep/kill rules [C1] | A8-16 |
| V2-33 | m | **Visual cleanup.** A validated graphite night theme replaces navy and mint, which echo kernelspace; motion shows change (goal diffs, crack propagation) [C5] | A7-20, A7-22 |

### 5.1 Contested items, resolved

| Item | Positions | Resolution and reason |
|---|---|---|
| Confidence scale | 55/75/95; per-item 1/k mapping (D15); CBM (A4) | CBM bands with chance printed; CBM as feedback, never credit [baldiga14] |
| Audit sound share | 25–35% [dl]; fixed 40–50% (D3); seeded 30–60% (A4) | A twin pool plus a seeded 30–60% session share: a fixed rate can be learned |
| Defence format | 6–8 items, 5 of 6 (D1); Prove-it plus spec items (A2); four parts [dp] | Four parts (§4.7); explain-back required, uncredited (R21) |
| WASM Lean | Opt-in cell [dl]; none (R20) | None: 137.5 MB, needs isolation, lags the pin. Generated Goal Replay plus a link-out instead |
| Tab Datalog | TS evaluator [dl]; `ascent` (D19); Fixedpoint (R7) | Fixedpoint in the existing worker, if spike S3 passes; otherwise TS with DRT against Soufflé. Avoids a fourth engine (A5-F17) |
| TLC pin | 1.8.0 vs stable 1.7.4 | 1.8.0 pinned by SHA for JSON traces; CI also runs 1.7.4 |
| CheerpJ TLC | Opt-in [dl] | Owner decision; default off (vendor CDN; zero servers) |
| Comparator sandbox | Require vs record (R3) | Record, never require: the threat is self-deception, not attack |
| Heavy lane | Advisory vs blocking (R5) | Blocks releases; a red night downgrades the claims it touches to "unverified since <date>" |
| Author-lag | Embargo vs learner-zero (R2) | Learner-zero: agents draft stage N+1 while the owner studies stage N, labelled "draft" |
| AI policy | Per stage vs per item (R9) | Per item: agents welcome except on Prove-it and Defence items |
| World | A full simulated application vs thin (R18) | Thin; a richer domain adds scope without outcome evidence |
| Navigation | Map/Record (D21) vs Stages/Audit/Claims (R16) | Stages/Audit/Claims: "Ledger" and "set" collide with domain terms |
| Cache-header lesson | Core [dl] | A drawer without vendor specifics: the roadmap defers CDN topology |
| Experiments | Pre-registered vs n = 1 (R23) | n = 1 decision rules, reported descriptively |
| Glyphs, strip, interpretation tap | (R11–R13) | Codes; three segments; a faded "so P holds / is violated / can't tell" tap |

---

## 6. Bold upgrades, ranked by (impact × wow) ÷ effort

Impact and wow run 1–5. Effort: 1 = up to 3 agent-days, 2 = up to 2 weeks, 3 = up to 6 weeks [dr2 §5]. Each mechanism is tagged Ev (outcome evidence) or Prec (precedent only).

| # | Upgrade | I×W/E | Zero-server mechanism | Tag |
|---|---|---|---|---|
| 1 | **Four checkers agree; none read the requirement** | 4×5/1 = 20 | Stage 2.10 Bench lab: `lake comparator --paranoid` (six checkers, ~3 s measured [X]) accepts a true theorem that misses the intent; the learner exhibits the violating scenario in the tab | Prec |
| 2 | **The three-semantics overflow lab** | 4×4/1 = 16 | One transfer under ℤ, BitVec 64, PG `bigint` and Rust `i64`: Pyodide Z3 plus recorded PG 18.6 and cargo runs, all from existing spikes [X] | Prec |
| 3 | **Tool-trust specimens** | 4×4/1 = 16 | Runs already on disk become audit cases re-run nightly: a timeout that never fires, deadlock reported before the bug, one exit code for two failures (bwrap) [X] | Prec |
| 4 | **Public upstream counterexample** | 3×5/1 = 15 | An optional final rung: the receipt is an upstream issue or PR plus a witness that browsers replay | Prec |
| 5 | **Spec duels by URL** | 4×5/1.5 = 13.3 | A spec rides in the URL fragment, which is never sent to a server; only the instrument origin parses it; Z3 returns the distinguishing state | Ev (B−/C) [wrenn19] |
| 6 | **Your repo is the Audit Desk** | 5×5/2 = 12.5 | `bench audit` mutates the learner's repo with gap-class operators and harvests agent commits that touched statements; local checkers compute ground truth; the tab imports the bundle | Ev (small) [alemdag25] |
| 7 | **The course erodes in public** | 4×4/1.5 = 10.7 | A tool bump re-runs `runs/` in CI; the diff becomes an EROSION entry on the static `/assurance` page | Prec [cedarblog] |
| 8 | **Abstract-serializability checker** | 5×4/2 = 10 | Bench `isorun` records two-session histories; the tab replays them; accepted if some serial order replayed through the Lean-derived oracle reproduces every committed output (n ≤ 6–8, pruned) | Prec |
| 9 | **Hall of Records** | 4×5/2 = 10 | Dated toy models re-run in CI: Bitcoin CVE-2010-5139 (outputs "overflowed when summed") [btc2010]; Bloch 2006 binary-search overflow [bloch06]; the 2015 Starbucks race [starbucks15]; Jepsen PG 12.3 G2-item [jepsenpg]; Stripe key pruning [stripeidem]; Z3 #11179; Lean #14576 | Prec [newcombe14] |
| 10 | **CTI workbench** | 5×4/2 = 10 | A sat inductive step → bounded reachability in the tab → "strengthen" or "fix", over generated invariants | Prec [lamportii] |
| 11 | **Proof debt as ASSUMED** | 3×3/1 = 9 | "PROVED modulo k assumed lemmas" in the claim graph; debt shows on the path | Prec |
| 12 | **Pocket checkers** | 4×3/1.5 = 8 | Build-time TS predicates check witnesses offline on phones, property-tested against Z3 in CI | Prec |
| 13 | **State-space telescope** | 4×5/2.5 = 8 | Spectacle explores up to ~5k states with a minimap; TLC counts are precomputed in CI | Prec |
| 14 | **Verifiable belts and proof-carrying notes** | 3×4/1.5 = 8 | A file of witnesses plus receipt hashes, and notes with fragment permalinks, that any browser re-verifies offline | Prec |

Also kept, each scoring 8 or less: proof-report diff; kernelspace in the dock (optional side quests on the learner's kernelspace code); Sigstore attestations for *public* lab repos only [attest].

---

## 7. Proposed v2 shape (sketch)

### 7.1 The name

The course needs its own name because the roadmap's working title is shared with other uses. Collision checks ran 2026-10-23 [ghsearch].

| Name | Fit | Collisions found | Verdict |
|---|---|---|---|
| **statespace** | Pairs with kernelspace and tablespace; names model checking's central object and the S/S′ of every claim | The Statespace company (GitHub org `statespace-tech`, created 2025-02-10; repo `statespace-search`, 868★, "Search for the agentic web") [statespaceorg]; no course of that name | **Recommended.** Best family fit; the risk is search confusion, not domain overlap [U: no trademark search] |
| **obligation** | The roadmap's central verb ("derive proof obligations", end-state (c)); a single technical noun, like byzantine | Lowest: the top repo has 20★ | Distinctive but dry |
| **proofspace** | A "-space" name | A London verifiable-credentials company, ProofSpace [proofspaceco]; 8 repos, none starred | Weakest: it puts "proof" above the other eight stamps, against the thesis |

Recommendation: **statespace**. Keep the roadmap's own nouns for the toy language (Mini-Plinth) and the learner's checker (`miniplinth check`); the learner's twin is "your system" (§8, OD-2). Retire the stone-plinth metaphor: it points back at the roadmap's working title, and its elevation drawing was rejected (R17). The UI uses an ordered path of stages.

### 7.2 Stage map

Lesson tiers [dr2 B6]:
- **Core:** fully authored; 2–4 segments.
- **Bridge:** ≤ 1,000 words, instrument cells, and a dated, section-level pointer into the roadmap's reading.

Generator families feed Today and are not lessons.

| Stage | Lessons (core + bridge) | Lab (lane) | New tool | Signature specimens and claims |
|---|---|---|---|---|
| 1 Counterexample | Boot + 5 (2 + 3) | L1 Project 00 (Bench; witnesses re-checked in the tab) | Z3Py | Overdraft; the guard protects the sender, not the recipient [X]; a refund that mints |
| 2 Proof | 11 (4 + 7), including 2.0, a 15–20-min self-explanation unit [booklet] | L2 verified ledger (challenge pack) | Lean 4 | Four ledger theorems, `[propext, Quot.sound]` [X]; self-transfer mints 10 → 15 [X] |
| 3 Semantics | 9 (3 + 6) | L3 mini-plinth-core + kernel-checked goldens + JSON IR; capstone 10.1–10.2 (Lane A) | — | Postings refine the Stage 2 ledger; `Nat` hides the overdraft; the unsafe command |
| 4 Obligations | 9 (3 + 6) | L4 `miniplinth check` (Lane A; SMT-LIB to Pyodide Z3; cvc5 on the Bench) | — | Missing frame; substitution capture; a CTI paired with a reachable bug |
| 5 Time | 9 (3 + 6) | L5 holds spec (TLC receipts with argv) | TLA+ | Double spend: 11 vs 4 distinct states [X]; a starving lasso; termination reported as deadlock |
| 6 Correspondence | 9 (3 + 6) | L6 pg-refinement (Rust: `isorun`, DRT, serializability checker; Lane A compiler on PGlite) | PostgreSQL | 160 spent from 100; write skew at RR (−100) [X]; 22003 refusal; NULL silently skipped [X] |
| 7 Secrecy | 8 (3 + 5) | L7 authz-flow (Datalog, RLS differential, paired-state Z3) | Soufflé | Leaky field; count side channel; owner bypass; the "new enemy" [zanzibar] |
| 8 Effects | 7 (2 + 5) | L8 effects-sim (Lane A outbox machine; TLC trace validation) | — | A double charge after a crash; ack-before-durable drift caught only by trace validation |
| 9 Preservation | 9 (3 + 6), two halves | L9 compiler + preservation proof (Lean) + SQL validator (Lane A) | — | A write hoisted above its guard; a validator that checks shape, not meaning |
| 10 Assembly | 7 steps; 5 grown earlier | Capstone | — | The demonstration and the published report |
| **Total** | **76 lessons (26 core + 50 bridge) + Boot** | 9 labs, ~45 stages | 5 tools | — |

**Displacements** (V2-09):
- Course 00's six lessons → drawers plus Boot.
- v1 5.9 → merged into 6.8; the new 5.9 is "MODEL-CHECKED ≤ N → PROVED for every N".
- v1 6.5 → test-out plus a tablespace bridge; the new 6.5 is "Enforced at commit".
- v1 7.4 (Alloy) → drawer; the new 7.4 is RLS.
- The C3.1–C3.2 and C4.3 proofs → stretch. That frees time for 2.0 and 4.6 (CTI).

At kernelspace density, v1's 80 lessons come to ≈ 133k words (A5-F12). Tiering brings v2 to ≈ 100–110k [D].

**Planning note.** Students study 5–8 h/week less than they plan [oreo19], and at Buehler's ×1.64, v1's 31.5–61 weeks become about 12–23 months [buehler94][dp §4.1]. So the projected arc is shown as a range, never as "behind".

### 7.3 Lesson and lab anatomy

- **Core lesson:**
  1. Hook and 1–2 prequestions (≤ 2 min).
  2. 2–4 segments of 12–15 min, each built around one instrument run (Call It on the first run) and ending in a graded item.
  3. Exit items that create Today cards.
  4. A "Build this" card for the next lab stage.
  5. A production-twin card (Cedar for Stages 3, 6, 7 and 9 [cedarspec]; TigerBeetle's two-phase transfers for holds [tb2pc]; CompCert's theorem template for Stage 9 [compcert]).
- **Lab:**
  1. Predict, then run the reference.
  2. 3–5 investigation items.
  3. Stages of ≤ 25 min on weekdays and ≤ 45 min at weekends, starting with a 2-minute win.
  4. Per-check results and a hint ladder (R0 teach-back → R4 informal proof; anything after R2 is credited as assisted until an unseen variant passes).
  5. Prove-it: predictions about seeded mutations of your own artifact.
  6. Receipt, then a claim card, fading from prefilled to learner-written.
  7. A stuck protocol at 25, 45 and 90 min: `bench stuck` emits a forum-ready minimal example; parked goals become [A] proof debt with a re-find in 7 days (A4-01).

### 7.4 The persistent world (working name: the Clearinghouse)

A seeded, deterministic, multi-tenant application written in Mini-Plinth and run by the reference interpreter in the tab. It grows with the stages, in the roadmap's nouns only (V2-25):
- accounts with credits as postings and holds (Stages 1–3);
- concurrent command traffic (Stages 5–6, multi-session histories recorded on the Bench);
- users, teams, roles, documents and sharing (Stage 7);
- an external provider with crashes, duplicates and delays (Stage 8).

**Plug-ins.** The learner's Lane A components plug in: their checker gates proposals, their compiler runs on PGlite, their outbox machine runs under seeded faults, and their validator checks plans.

**The docket.** A weekly queue of 1–3 incidents:
- agent proposals generated by mutation, sound in a seeded 30–60% share;
- incidents drawn from the gap taxonomy, with thresholds proven against a naive and a reference baseline;
- erosions fired by the learner's *oldest* ASSUMED seam, never by the calendar, and shipped only when both endpoints exist.

This is kernelspace's Fleet pattern at a fraction of the build cost [ksnext]. There is no server: seeds, recordings and wasm all run in the tab.

### 7.5 Labs, Bench and agents

- **Lane A:** browser-graded wasm on fresh seeds, using the family's zero-import ABI [ksnext].
- **Lane B:** receipts, imported by file or URL fragment, schema-validated, size-capped, never rendered as HTML.
- **Bench:** the devcontainer pins Lean 4.35, JRE 21 with `tla2tools`, PG 18.6, Z3 5.3.1, Rust and Soufflé. The CLI stays in Python, with schemas generated from one JSON Schema [dr2 B7]; it keeps the course's name, not "plinth".
- **Zips:** every zip ships AGENTS.md, CLAUDE.md and the hook. The site ships `llms.txt` and per-lesson Markdown (A5-F11).

### 7.6 The daily and weekly loop

- **Today** (10–12 min, phone, offline):
  - due items from generator families on fresh seeds;
  - 0–1 audit cases;
  - re-finds and sure-and-wrong returns;
  - a Lean keep-alive every 2–3 weeks during Stages 5–8;
  - a resume card for the current lab stage;
  - "this has changed" cards and erosion forecasts.
  
  After ≥ 7 idle days it opens a welcome-back set, with no overdue counts.
- **The week** [dp §4.2]:
  - *Set your week*: a range target, two Bench blocks of 90–150 min on self-chosen days, and a Keep block of 30–40 min.
  - The rhythm reads "met in k of the last 12 weeks" (target ≥ 8). A missed week can be made up within 7 days, declared breaks pause the window, and there are two reserve weeks per 12.
  - A 5-minute weekly Claims review asks "what can I now reason about?" [harkin16].
  - A 15-minute monthly retro sets 1–2 if-then plans [sheeran25].
- **Re-entry:** "Back at the bench" (20–30 min) after ≥ 14 idle days; a landmark restart after ≥ 6 weeks.
- **Notes:** 600–1,000 words after Stages 2, 5, 7 and 9, on a cadence, not a due date. They are written from memory, then specimens and receipt hashes are auto-attached.

### 7.7 The capstone

- **As-you-go steps:** 10.1–10.2 after Stage 3, 10.3 after 4, 10.4 after 6, 10.5 after 8.
- **The final ≤ 6 weeks:** integration; **the demonstration** (an agent proposes a plausible transfer or authorization command; the learner's checker exhibits a violation or proves a restricted obligation; the corrected command runs on Postgres); publication of the operational semantics, theorem statements, specimens, tool versions and limitations; and a Defence over the report.
- **The report** is a traversal of the claim graph:
  - sections for proved, model-checked, tested, runtime-enforced, configured, assumed and not covered;
  - a checker matrix, statement hashes, budgets and advisories;
  - a defeater log showing doubts eliminated out of doubts identified, never summed or gated [sridefeat].
- **Optional private overlay:** a local self-audit of "your system" (V2-28).

### 7.8 Interface and look (sketch)

- **Navigation:** Today · Stages · Bench · Audit · Claims, plus search. The private Mirror (calibration, VRK₃₀) is reached from Today, drawn in ink, and never on Claims.
- **Look:** the drafting table stays (vellum and graphite; title blocks filled from runs), with a graphite night theme. Line styles carry one meaning each. Stamps are words plus codes, separable in greyscale. Motion is spent on change (goal diffs, crack propagation) and honours reduced motion.
- **Phone-first surfaces:** Today, Lesson, Audit and Claims.

### 7.9 Flagship moments

1. **Boot, on a phone:**
   1. An agent PR claims "safe, 200 tests green".
   2. The learner calls a variant the roadmap leaves open.
   3. Z3 finds the overdraft, and the guard makes it `unsat`.
   4. BitVec 64 shows the recipient wrap.
   5. The Bitcoin 2010 card closes the loop.
   
   A labelled recorded run covers the cold start [dr2 B11].
2. **"The kernel was wrong":** the #14576 story at 2.9, with no exploit code [pmortem].
3. **Same transfer, three verdicts:** the compilation pattern decides on real PG 18.6 runs [X].
4. **The step the database refuses:** E1 fires from the learner's own seam.
5. **Trace validation catches the drift that every test missed.**

### 7.10 Waves, shaped for planning and Sonnet 5.5 agents

**Implementation invariants:**
- I1 Evidence, not clicks.
- I2 Derived, never stored.
- I3 Generators are pure and deterministic, with keys from checkers.
- I4 Every tool number is a run reference.
- I5 Nothing locks.
- I6 Zero servers; untrusted input only in the instrument origin.
- I7 Statements are pinned and hashed.
- I8 Agent claims are never stamped.
- I9 No private-design content.
- I10 Bounded checks print their bound, the course's own graders included.

**Start rule:** a wave starts when the previous gates are green and the owner's queue is under 10 h. Task sizes are S (≤ 3 agent-days), M (≤ 2 weeks) and L (≤ 6 weeks), and each task's acceptance criteria are CI gates or recorded runs.

**Cut order:** Derivation Board polish → Judgment breakdowns → Alloy lab → path drawing → Shelf UI → bridge lessons beyond 30 → erosions lacking both endpoints → audit anchors beyond two per stage [dr2 B6].

| Wave | Scope | Acceptance (exit) |
|---|---|---|
| **W0 Spikes and foundations** | S1 instrument origin; S2 Pyodide-Z3 on real phones; S3 Fixedpoint in Pyodide; S4 Spectacle on Stage 5/8 specs and state pairs; S5 TLC lasso JSON; S6 bwrap on runners, Docker Desktop and Codespaces, plus `--paranoid` timing; S7 `vcgen` on a custom `Cmd`; S8 PGlite RLS and first-load size; S9 PG 18.6 isolation catalogue rows; S10 Goal Replay via `$/lean/plainGoal`; S11 receipt schema, `runs/`, lints; S12 vendoring and a scaffold on React 19 and Vite 7 | Each spike leaves a recorded run and a decision record with a fallback; the fast lane runs under 5 min; `verify:numbers` fails on a planted untagged number |
| **W1 Project 00 slice** | Boot; Stage 1; L1; grader core (3 families); KC graph v0; Today; provenance ledger; claims, stamps, specimens; about 8 audit anchors with twins; agent kit; `llms.txt`; phone layouts | Learner-zero finishes Project 00 with ≥ 2 claims and ≥ 2 kept specimens; Boot's median first success ≤ 4 min [ks100x]; blind strategies ≤ chance + 2 SD; median Today ≤ 12 min; axe shows 0 serious issues; every Stage 1 tool number is a run id; the hook blocks a scripted agent edit |
| **W2 Proof** | Stages 2–3; challenge packs; generated Goal Replay; ladders; self-explanation unit; L2–L3; goldens and IR; Lane A interpreter; spec-it; the Defence engine | CI shows comparator rejecting a weakened statement and a redefined function, and kernel replay rejecting `skipKernelTC`; `verify:replay` passes on a toolchain bump; learner-zero signs off Stages 1–2 |
| **W3 Obligations + Time** | Stages 4–5; Derivation Board; WP-it; CTI-or-bug; L4 (Lane A); Theater on TLC graphs; Spectacle; lasso validator; L5 | Spectacle = TLC on every authored spec; the lasso validator agrees with TLC on fixtures; E2 ships with both endpoints; keyboard-only Derivation Board |
| **W4 Correspondence + Secrecy** | Stages 6–7; `isorun`; serializability checker; DRT outcome classes; Datalog pair; RLS differential; paired-state Z3; L6–L7; Hall of Records | Nightly PG 18.6 asserts 22003, 40001, 40P01 and write skew at RR; the checker classifies a history fixture set correctly; the Datalog engines yield equal relations; E1 and E3 ship |
| **W5 Effects + Preservation + Assembly** | Stages 8–10; outbox machine; simulator plus trace validation; L8–L9; capstone; report export; `/assurance` | Trace validation rejects the ack-before-durable mutant; learner-zero publishes a report; a Cedar-style release gate (models, proofs, DRT and runs up to date) is green; E4 and E5 ship |

---

## 8. Open decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| OD-1 | Course name: statespace, obligation or proofspace | statespace (§7.1) |
| OD-2 | Keep the roadmap's "Mini-Plinth", `miniplinth` and `plinth-lab` in public copy, or rename them | Keep Mini-Plinth and `miniplinth` for roadmap fidelity; ship the template as `<name>-lab` |
| OD-3 | Default path: roadmap order, or a builder's path (1 → 5 → 6.6–6.7 → 8.1–8.4 → 7 → 2–4 → …) for early concurrency work | Roadmap order by default; offer the builder's path with erosions keyed to seams and a Lean keep-alive [dp §4.5] |
| OD-4 | Third-party opt-ins: CheerpJ TLC, live.lean-lang.org, Alloy4Fun, TigerBeetle's simulator | Disclosed link-outs only, never credited; no embedded CheerpJ |
| OD-5 | A dedicated custom subdomain for the instrument origin | Yes, decided in W0 (V2-19) |
| OD-6 | Consent threshold for downloads (Pyodide ≈ 13 MB gzipped [dr2]) | Consent above 5 MB |
| OD-7 | The owner's weekly envelope: review ≤ 2–3 h, queue gate 10 h | Adopt; revisit at W1's exit |
| OD-8 | Honour-system provenance, with no anti-cheat | Accept, and say so on the assurance page |
| OD-9 | An optional monthly human reviewer of claim cards, and design partners | Optional; partners gate only an "external learners" label [dp §4.3] |
| OD-10 | Adapting the CC BY-SA self-explanation booklet | Ask the authors; keep it in its own directory under its licence [dp] |
| OD-11 | Publication hygiene | Redact or exclude the review JSONs; keep the overlay out of the repo |
| OD-12 | Edition pins | Lean 4.35.x and PG 18.6 for edition 1; re-record after PG 19 GA (2026-11-19) |
| OD-13 | Sigstore attestations for learners' public repos | Off by default |
| OD-14 | A flavour name for the world, or plainly "the World" | Low priority; fewer nouns is the safer default |

---

## 9. Source index (deduplicated)

Dates are publication, version or release dates; "read" marks the access date where nothing else applies. Local files are session working files (not published) and should be committed, redacted where needed, under `docs/evidence/`.

**Local evidence**
- [roadmap] The user's roadmap, `context/roadmap.md` (read 2026-10-23)
- [v1plan] `PLAN.md`; [v1design] `DESIGN.md` (2026-10-20)
- [spikes] `spikes/RESULTS.md`, executed 2026-10-20
- [a5logs] `A5r3/`, `A5v2/` run logs, 2026-10-21
- [r1m] `lean-measure/`, 2026-10-20
- [dl] `synthesis/digest-landscape.md`; [dp] `digest-pedagogy.md`; [dr1] `digest-review-1.md`; [dr2] `digest-review-2.md` (2026-10-23/24)
- [rm1] `synthesis/review-merged-1.json`; [rm2] `review-merged-2.json` (not publishable as saved)
- [ks100x] kernelspace `PLAN-100X.md` (2026-10-03); [ksnext] kernelspace `NEXT-COURSES.md` (2026-08-03)

**Lean**
- [lean435] https://lean-lang.org/doc/reference/latest/releases/v4.35.0/ (2026-10-12; read 2026-10-23)
- [leanrel] https://api.github.com/repos/leanprover/lean4/releases (read 2026-10-23)
- [leanvp] https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/
- [pmortem] https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/ (2026-08-01; read 2026-10-23)
- [oss14576] https://www.openwall.com/lists/oss-security/2026/08/02/1 (2026-08-02)
- [leancmp] https://github.com/leanprover/lean4/compare/v4.32.1...v4.32.2
- [vcgen] https://lean-lang.org/doc/reference/latest/The--vcgen--tactic/
- [holimp] https://isabelle.in.tum.de/library/HOL/HOL-IMP/ASM.html (read 2026-10-23)

**SMT**
- [z3-11179] https://github.com/Z3Prover/z3/issues/11179 (opened and closed 2026-10-15)
- [cvc5rel] https://github.com/cvc5/cvc5/releases (1.4.0 2026-09-17; 1.4.2 2026-10-08)
- [alive2bugs] https://github.com/AliveToolkit/alive2/blob/master/BugList.md (2026-01-12)
- Pins: https://pypi.org/pypi/z3-solver/json · https://registry.npmjs.org/pyodide (read 2026-10-23)

**TLA+**
- [tlarel] https://github.com/tlaplus/tlaplus/releases (read 2026-10-23)
- [spectacle] https://github.com/will62794/spectacle (MIT)
- [tlabyex] https://learning.tlapl.us/
- [learntlanew] https://learntla.com/whatsnew.html
- [lamportii] https://lamport.azurewebsites.net/tla/inductive-invariant.pdf
- [sysmobench] https://arxiv.org/abs/2509.23130
- [cheerpj] https://cheerpj.com/docs/licensing

**PostgreSQL**
- [pg19rc1] https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/ (2026-10-15)
- [pg19notes] https://www.postgresql.org/docs/19/release-19.html
- [pglite] https://registry.npmjs.org/@electric-sql/pglite (0.5.11, 2026-10-21)
- [jepsenpg] https://jepsen.io/analyses/postgresql-12.3 (2020-06-12)
- Behaviour: https://www.postgresql.org/docs/18/transaction-iso.html

**Authorization and effects**
- [cedarspec] https://github.com/cedar-policy/cedar-spec
- [cedar24] https://arxiv.org/abs/2407.01688
- [cedarblog] https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/
- [authv2] https://www.amazon.science/publications/formally-verified-cloud-scale-authorization (2025)
- [bpa] https://doi.org/10.1145/3368089.3409728 (2020)
- [zanzibar] https://www.usenix.org/conference/atc19/presentation/pang (2019)
- [stripeidem] https://docs.stripe.com/api/idempotent_requests (read 2026-10-21)
- [tb2pc] https://docs.tigerbeetle.com/coding/two-phase-transfers/

**Compilers and SQL**
- [compcert] https://compcert.org/man/manual001.html (3.18, 2026-08-30)
- [cidr26] https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf (2026)

**AI × formal verification**
- [putnamres] https://trishullab.github.io/PutnamBench/results.json (read 2026-10-21)
- [putnam366] https://github.com/trishullab/PutnamBench/issues/366 (2026-10-13)
- [formconj] https://arxiv.org/abs/2605.13171 (2026-05)
- [sridefeat] https://arxiv.org/abs/2405.15800

**Hall of Records**
- [btc2010] https://en.bitcoin.it/wiki/CVE-2010-5139 (2010-08-15)
- [bloch06] https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/ (2006-06-02)
- [starbucks15] https://sakurity.com/blog/2015/05/21/starbucks.html (2015-05-21)

**Hosting and names**
- [ghpages] https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- [ghdomain] https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- [webkit7d] https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (2020-03-24)
- [attest] https://docs.github.com/en/actions/concepts/security/artifact-attestations
- [ghsearch] https://api.github.com/search/repositories (queries run 2026-10-23)
- [statespaceorg] https://api.github.com/orgs/statespace-tech (read 2026-10-23)
- [proofspaceco] https://www.kuppingercole.com/vendors/proofspace (read 2026-10-23)

**Courseware**
- [forge] https://doi.org/10.1145/3649833 (2024)
- [eptcs419] https://doi.org/10.4204/EPTCS.419.1
- [booklet] https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf (CC BY-SA 4.0; read 2026-10-23)

**Learning science**
- [kraft20] https://doi.org/10.3102/0013189X20912798 · [rowland14] https://doi.org/10.1037/a0037559 · [pan18] https://doi.org/10.1037/bul0000151
- [latimier21] https://doi.org/10.1007/s10648-020-09572-8 · [cepeda08] https://doi.org/10.1111/j.1467-9280.2008.02209.x · [higham22] https://doi.org/10.1037/edu0000693
- [rawson13] https://doi.org/10.1007/s10648-013-9240-4 · [brunmair19] https://doi.org/10.1037/bul0000209 · [samani21] https://doi.org/10.1038/s41539-021-00110-x
- [sthilaire23] https://doi.org/10.3758/s13423-023-02353-8 · [butterfield01] https://doi.org/10.1037/0278-7393.27.6.1491 · [butler11] https://doi.org/10.3758/s13423-011-0173-y
- [tetzlaff25] https://doi.org/10.1016/j.learninstruc.2025.102142 · [barbieri23] https://doi.org/10.1007/s10648-023-09745-1 · [renkl02] https://doi.org/10.1080/00220970209599510
- [hilbert08] https://doi.org/10.1016/j.learninstruc.2006.10.008 · [bisra18] https://doi.org/10.1007/s10648-018-9434-x · [hodds14] https://doi.org/10.5951/jresematheduc.45.1.0062
- [poulsen23] https://doi.org/10.1145/3545945.3569797 · [alfieri13] https://doi.org/10.1080/00461520.2013.775712 · [alemdag25] https://doi.org/10.3102/00346543251390901
- [mclaren15] https://doi.org/10.1007/s40593-015-0064-x · [vdkleij15] https://doi.org/10.3102/0034654314564881 · [kluger96] https://doi.org/10.1037/0033-2909.119.2.254
- [dantoni15] https://doi.org/10.1145/2723163 · [danas17] https://doi.org/10.1007/978-3-319-66197-1_11 · [wrenn19] https://doi.org/10.1145/3291279.3339416
- [prasad26] https://doi.org/10.4230/LIPIcs.ECOOP.2026.22 · [danielson24] https://doi.org/10.1080/00461520.2024.2365628 · [keenan26] https://arxiv.org/abs/2608.23309
- [bastani25] https://doi.org/10.1073/pnas.2422633122 · [sankar26] https://arxiv.org/abs/2602.20206 · [shen26] https://arxiv.org/abs/2601.20245
- [deci99] https://doi.org/10.1037/0033-2909.125.6.627 · [kulik90] https://doi.org/10.3102/00346543060002265 · [harkin16] https://doi.org/10.1037/bul0000025
- [sheeran25] https://doi.org/10.1080/10463283.2024.2334563 · [silverman23] https://doi.org/10.1093/jcr/ucac029 · [keith08] https://doi.org/10.1037/0021-9010.93.1.59
- [sala19] https://doi.org/10.1525/collabra.203 · [grossman11] https://doi.org/10.1111/j.1468-2419.2011.00373.x · [tatel25] https://doi.org/10.1037/bul0000481
- [hacker00] https://doi.org/10.1037/0022-0663.92.1.160 · [petrov25] https://arxiv.org/abs/2503.21934 · [stone00] https://doi.org/10.1006/obhd.2000.2910
- [ipeirotis26] https://arxiv.org/abs/2603.18221 · [chen18] https://doi.org/10.1145/3231644.3231664 · [bisin20] https://doi.org/10.1016/j.geb.2019.11.010
- [retraction26] https://doi.org/10.1177/09567976261488042 (2026-09-02) · [do26] https://arxiv.org/abs/2605.12748 · [macnamara23] https://doi.org/10.1037/bul0000352
- [wu20] https://doi.org/10.1111/bjet.13023 · [buehler94] https://doi.org/10.1037/0022-3514.67.3.366 · [oreo19] https://doi.org/10.3386/w26059
- [koedinger23] https://doi.org/10.1073/pnas.2221311120 · [kobayashi19] https://doi.org/10.1111/jpr.12221 · [cbm] https://www.ucl.ac.uk/lapt/REAP_CBM.htm
- [baldiga14] https://doi.org/10.1287/mnsc.2013.1776 · [fernandes26] https://doi.org/10.1016/j.chb.2025.108779 · [serth22] https://doi.org/10.3389/feduc.2022.1008545
- [wass03] https://doi.org/10.1046/j.1365-2923.2003.01417.x · [newcombe14] https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf · [deslauriers19] https://doi.org/10.1073/pnas.1821936116
