# A8 — Successor lens: what kernelspace learned the hard way vs Plinth v1

Reviewer lens: Plinth v1 (`docs/history/v1/PLAN-v1.md`, `docs/history/v1/DESIGN-v1.md`, canvas artboards) succeeds
kernelspace, the most finished course in the family. This review checks every lesson in `kernelspace-PLAN-100X.md`
(2026-10-03, 877 lines, all read) and its three audits (`audit/motivation.md`, `audit/interactive.md`, `audit/content.md`).
Review date: 2026-10-21. Line numbers refer to `PLAN.md` / `DESIGN.md` as of 2026-10-20 (`cat -n`). Artboard
quotes come from visible text in `canvas/project/*.dc.html`.

## 0. Verdict in one paragraph

v1 has a strong formal-methods identity of its own. The Claim with six fields, stamps that always carry a qualifier,
Call It, specimens, erosion, the Audit Desk and the Deferred Shelf are all good, and `verify:calls` holds the course to
its own standard better than kernelspace v1 did. But v1 was designed as if the 100X plan did not exist.

It **repeats** four of kernelspace's five headline defects:
- completion by self-attestation: the viva is self-graded or graded by an LLM;
- a gameable assessment instrument: the Audit Desk's base rate, and Call It answers that leak from the narrative;
- no return loop: there is no KC graph, no Today and no generators, and Re-find replays ~40 fixed specimens;
- the toolchain wall: it moves from Course 01 to Course 02, because Lean has no zero-install lane.

It **ignores** the solutions kernelspace paid for: evidence ledger with provenance, VRK₃₀, guardrail kit in lab zips,
hint ladders, no-AI Prove-it, claims registry, test-out, "nothing locks", and "LLMs never grade credit".

It **handles** XP (gone), honest streaks (none), the prediction gate (Call It), build-time verification of authored
answers, and UI identity (deliberately different, as the user asked).

The most dangerous gap is new to this domain. The course's own grader is vulnerable to the very failure it teaches:
"a true theorem about the wrong thing". Lab receipts count `sorry` and axioms but never pin the theorem *statement*.
The learner, or the learner's coding agent, can weaken a statement and get a green receipt that mints PROVED.

## 1. The kernelspace lesson ledger: does v1 repeat, ignore or handle each lesson?

| # | Lesson kernelspace learned (100X ref) | v1 status | Where in v1 |
|---|---|---|---|
| 1 | Fix the instrument first; quizzes measured test-wiseness (§2.2 #1; content audit §3: always-longest passes 58/68) | **REPEATS** (new form) | Audit Desk 4/32 sound → "always reject" wins; Call It answers cued by narrative and by the sidebar (§2 F4, F5) |
| 2 | Longest-answer / position lint `verify-items` (V1) | **IGNORES** | no item lint; `verify:audit` (l.614) checks keys exist, not blind strategies |
| 3 | Clicks paid XP (§2.2 #2) | **HANDLED for XP; REPEATS as claims** | no XP (l.34); but lessons and authored runs mint claims and specimens (l.91-93; Lesson and Theater artboards) |
| 4 | Nothing reviewed (§2.2 #3) | **REPEATS** | only Re-find on fixed specimens (l.148-151); no Today, FSRS or KC review |
| 5 | First 10 minutes end at a toolchain install (§2.2 #6; motivation audit §5) | **PARTLY HANDLED** | Course 00/01 in-browser Z3 is good; the Lean wall arrives at Course 02 (l.184: "No in-browser Lean") |
| 6 | Mastery gating reduces completion; nothing locks (principle 11; Kulik 1990) | **REPEATS** | audit cases "unlocked as courses are set" (l.215); theory drawers open "only when a Call It is missed twice" (l.261); Run gated on every run (l.125) |
| 7 | Unguarded AI harms learning (Bastani 2025: practice +48%, exam −17%) | **REPEATS / IGNORES** | BYOK examiner grades the viva (l.244-246); no guardrails, packets or provenance |
| 8 | Stale numbers → dated claims (S2, S4) | **IGNORES** | Sources are names only (l.637-643); "Z3 4.15" is hard-coded on the Lesson artboard |
| 9 | VRK₃₀ north star (§1) | **IGNORES** | no outcome metric; "Track what you can reason about" maps to a self-graded viva (l.266) |
| 10 | Generators with fresh seeds; practice ≠ exam (K1, S3) | **IGNORES** | every item is authored once; Re-find replays the same spec |
| 11 | Today (K2) as the returning-visit home | **IGNORES** | home is Elevation, a map rather than a queue; 9 nav items (Elevation artboard) vs kernelspace's ≤5 |
| 12 | Test-out / placement persisted (K3) | **PARTLY** | 10-question placement for Course 00 only (l.277-278); no test-out for later courses |
| 13 | Honest rewards: XP = graded minutes, rings on unseen seeds (V5) | **PARTLY** | stamps are honest; "set", claims count and specimen drawers are not evidence-based |
| 14 | Hint ladders R0-R4 (H3) | **IGNORES** | no hints; Goal Replay is reading, not help at the point of error |
| 15 | No-AI Prove-it, v2 machine-graded (H4) | **IGNORES** | viva is neither no-AI nor machine-graded |
| 16 | Agent guardrails in lab zips (H1), context packets (H2), llms.txt | **IGNORES** | `grep -i "agent|AGENTS|llms|hint"` finds only the Audit Desk framing |
| 17 | Append-only evidence ledger with provenance (V3, V6) | **IGNORES** | "progress lives in IndexedDB and is exportable" (l.575-578); no event schema or provenance |
| 18 | KC graph (V4) | **IGNORES (replaced)** | l.57: "KC graph, spiral items" replaced by "Seams and erosion", which is a narrative, not a learner model |
| 19 | One source of truth (S; "game engines no" because a second truth) | **PARTLY** | semantics lives in 3 places: Lean, the TS port (l.180) and a bespoke PlusCal-like DSL (l.181) |
| 20 | Measure on device; within-learner experiments; keep/kill (§9); no "100×" (§10) | **IGNORES** | no learning-science citations or Ev/Prec tags; no keep/kill rules |
| 21 | Fixed capacity, variable scope; review hours bind (§8) | **IGNORES** | phases P0-P6 have no hours, cut order or partner gates (l.621-633) |
| 22 | Lesson anatomy: ≤12-min segments, ≤25-min lab stages, "a 30-minute day always works" (§5.0, §7.2, F2) | **REPEATS** | "~45 min" lesson (Lesson artboard); L1 "3–5 h" (l.305) unstaged |
| 23 | Security/perf contract: workers, CSP, SW kill switch, consent for big downloads (§7.3) | **IGNORES** | Z3 wasm requires cross-origin isolation (F15) |
| 24 | UI identity distinct per course | **HANDLED** | vellum/blueprint vs kernelspace dark mint (DESIGN.md l.13-14) |
| 25 | Authored answers verified in CI | **HANDLED, better than kernelspace v1** | `verify:calls`, `verify:specimens` (l.606-617) |

## 2. Findings (ranked)

### F1 — CRITICAL — A course is "set" by a self-graded or LLM-graded viva
- **Evidence.** `PLAN.md` l.240-247: "The learner writes or records an answer, then sees a rubric and model answer and
  self-grades each rubric line. Optional bring-your-own-key examiner (Claude via direct browser API call…) asks
  follow-ups and grades against the same rubric. A course is **set** on passing its viva." The Elevation artboard copy
  says "A course is set when its viva is passed". l.617 stamps viva rubrics ASSUMED.
- **Why it fails.** This is kernelspace defect #2/#5, completion as self-attestation, reborn. kernelspace made
  self-assessment "never credit" (H3 R0) and self-graded Prove-it "practice weight only, outside rings and VRK₃₀"
  (H4, V6). §10 rejects "In-page BYOK drawer" and "LLM-graded XP, rings or credentials" (LLM raters α 0.52–0.65), and
  OD8 defers BYOK. The rubric is shown *before* self-grading, which invites hindsight bias. It also contradicts the
  kernelspace rule that LLMs never grade credit.
- **Fix.**
  - Split every viva in two:
    - **Prove-it (credit):** no AI, machine-graded, fresh seeds. Examples:
      - negate three generated English properties, graded by Z3 equivalence against the reference formula;
      - derive WP for a generated command on the Derivation Board;
      - classify generated hold properties as safety or liveness;
      - name the fairness a generated lasso violates.
    - **Explain-back (practice):** free text, prompt-and-compare against 3 scored exemplars, self-assessed, never credit.
  - "Set" requires Prove-it on unseen seeds; explain-back is a recommendation.
  - Drop BYOK grading. Keep an *optional* skeptical-interviewer packet for the learner's own agent (kernelspace H2 and
    Interview mode), recorded as `assisted`.

### F2 — CRITICAL — Agent substitution is unguarded, and the grader does not pin theorem statements
- **Evidence.**
  - Receipts record "checks passed, goals proved, `sorry` count, the axioms each theorem depends on" (l.160-162). The
    site "imports receipts… and mints/updates claims" (l.163). Nothing checks that the theorem proved is the course's
    canonical statement.
  - There is no AGENTS.md/CLAUDE.md, no hook, no llms.txt, no provenance and no Prove-it (grep, §1 rows 15-17).
  - The learner builds a system of their own with coding agents.
  - Prover capability: DeepSeek-Prover-V2 reached 88.9% on MiniF2F-test in 2025
    (<https://arxiv.org/abs/2504.21801>). Course-scale ledger proofs are well within agent reach.
- **Why it fails.** (a) Every PROVED stamp may be agent output: kernelspace's Bastani/Shen-Tamkin harm, which it fenced
  with H1, H4 and V6. (b) Worse, a learner or agent that weakens `theorem conservation` gets `lake build` ✓,
  `0 sorry`, standard axioms, and a PROVED claim. That is gap classes 1/2/8 inside the course's own grader. It is the
  formal-methods analogue of kernelspace's "Act I passes with no module" and "Rust Zero drills checked on one literal
  input; returning the literal passes" (interactive audit §1.2, §1.4).
- **Fix.**
  - **Statement pinning:** each lab ships a course-owned challenge file holding the canonical statements with `sorry`.
    `plinth bench check` runs the Lean FRO **Comparator**, which guarantees that each solution theorem "prove[s] the
    same statement as Challenge, use[s] no more axioms than permitted_axioms, and [is] accepted by the Lean kernel".
    The typical permitted axioms are propext, Quot.sound and Classical.choice.
    - Sources: <https://github.com/leanprover/comparator>,
      <https://lean-lang.org/doc/reference/4.27.0-rc1/ValidatingProofs/>.
    - Comparator is Linux-oriented (Landrun sandbox; `fake-landrun.sh` for development). Off Linux, fall back to a
      `Checks.lean` that restates each canonical type (`example : <stmt> := Learner.thm`) and runs `#print axioms`.
  - Pin TLA+ invariants and `.cfg` constants, and Z3 property encodings, by hash.
  - **Guardrail kit (H1, adapted):** a deny rule plus PreToolUse hooks so agents may edit proofs but **not**
    statements, specs, invariants or check files ("agents prove, humans state"). Add an explanation gate and an
    AI-use card.
  - **Provenance (V6):** `authored | learner | assisted | agent | unseen`. Only `learner` or `unseen` Prove-it evidence
    sets a course.
  - Ship `llms.txt` and keyless context packets (H2).

### F3 — CRITICAL — No Keep loop: no KC graph, no Today, no VRK₃₀
- **Evidence.**
  - l.55: the "signature drill" is Call It plus Re-find. l.148-151: Re-find is "a simple expanding-interval queue keyed
    by specimen" over ~40 specimens.
  - l.57 replaces "KC graph, spiral items" with seams and erosion.
  - Elevation artboard: no due items and no Today.
  - The arc is 9–18 months (l.12).
- **Why it fails.** kernelspace's audit put "no return loop" among its top five defects (motivation audit §0.5), and
  100X built K1, K2 and V4 to fix it. Over 9–18 months, Course 01–03 reasoning moves (negating ∀, primed variables,
  generalising an induction hypothesis) will decay before Courses 04 and 09 need them. Erosion events are a superb
  *narrative* spiral, but they cannot schedule review, drive test-out or measure retention.
- **Fix.**
  - Inherit V4: ~120–160 formal-methods KCs with `requires` and `confusable` edges. Confusable sets include
    safety/liveness, WF/SF, sat/valid, partial/total correctness, enforcement/noninterference,
    simulation/bisimulation and SI/serializable. Interleave only inside these sets.
  - Inherit K2 Today (ts-fsrs; ≤1.2 new cards/day; welcome-back after 7 idle days; 10–12 min; phone-first) as the
    returning-visit home.
  - Define **VRC₃₀**: KCs answered correctly on fresh generated items, unassisted, ≥30 days after first learning,
    shown with intervals on a `/me`-style Judgment page.

### F4 — CRITICAL — The Audit Desk, the course's headline judgment measure, is test-wise by construction
- **Evidence.**
  - Cases A1.1-A9.3 (l.309-551) total 32. Only 4 are sound: A2.5, A4.3, A6.4 and A9.3.
  - "Always reject" therefore scores recall 28/28 = 100% and precision 28/32 = 87.5%. That beats the Audit artboard's
    displayed record ("71% precision · 64% recall").
  - Three of the four sound cases are the **last** case in their course list, a positional cue.
  - Each course's cases use the gap classes that course just taught: Course 05 uses wrong kind, assumption, bounded
    and granularity. Recency cues the class.
  - The Elevation artboard leaks a key on the home page: "One claims Proved on a theorem with a false hypothesis"
    (a vacuous-premise case).
  - Evidence is free text (Audit artboard), so it cannot be machine-checked.
  - The 12 classes overlap. "`Int` for `i64`" fits both class 4 (encoding) and class 8 (drift), so single-label keys
    are invalid.
- **Why it fails.** kernelspace principle 1: "Fix the instrument before anything consumes it". Always-B passed 40/68
  and always-longest 58/68 (content audit §3).
- **Fix.**
  - Raise the sound base rate to 35–50%.
  - Draw cases from a pool, shuffled, and interleave earlier courses' classes into later desks.
  - Never show case teasers.
  - Require **machine-checked evidence**: a witness state evaluated by the interpreter or Z3, a TLC trace, or a
    failing `example`. The gap class becomes multi-label with an acceptable set.
  - Score with a proper rule: log score on accept/reject with confidence, plus witness validity.
  - Add `verify:audit-blind`: always-reject, always-accept, last-is-sound and course-topic-class strategies must each
    score ≤ chance + 2 SD.
  - Use **mutation-generated cases** (bold idea 1) so the desk has fresh seeds.

### F5 — MAJOR — Call It answers are cued by the narrative and leaked by the UI
- **Evidence.**
  - Lesson artboard: the sidebar "This lesson establishes… S1.2 Specimen: the overdraft" is visible *before* the Call
    It. It says a counterexample exists, so the answer is `sat`.
  - l.144-147: "Missing specimens are shown as empty labelled drawers", which pre-announces every violation.
  - The lesson arc is bug→`sat`, guard→`unsat`, re-encode→`sat` (1.2-1.5, l.300-303).
  - There are no per-option `why` or misconception ids, and no verdict-balance lint.
- **Why it fails.** kernelspace learned that "what just happened stays hidden until done" (P2) and that keys must not
  be predictable (V1). Judgment calibration (l.126-128) then measures narrative-reading, not judgment.
- **Fix.**
  - Hide specimen and claim labels until earned ("1 unlabelled drawer").
  - Author ≥30% "surprise" calls per course: the guard is insufficient, the property holds without the guard, or the
    answer is genuinely `unknown`.
  - Extend `verify:calls` with a balance lint: majority verdict ≤60% per course. A "narrative-blind" strategy (sat on
    the first run, unsat after an edit) must score ≤ chance + 2 SD.
  - Every option carries a `why` and a misconception id (V1). Sure-and-wrong calls get reviewed first (V2).

### F6 — MAJOR — No generators; Re-find repeats kernelspace's `0x5eed` mistake
- **Evidence.** l.148-151: Re-find "re-presents an old broken spec with the counterexample hidden". The same spec and
  the same witness recur. Nothing else is generated.
- **Why it fails.** kernelspace §2.2 #4 "Practice is the exam" (every run used seed `0x5eed`) and K1/S3: same skill,
  new numbers (Pan & Rickard 2018, d=0.40 for transfer).
- **Fix: the deliberately different substrate.** Formal methods can grade *fresh* items exactly:
  - generate small guarded commands and invariants from a seed; Z3 computes ground truth;
  - accept **any valid witness**, checked by evaluating the learner's counterexample rather than matching a key;
  - check minimality with Z3 `Optimize`;
  - grade statement-writing items by **equivalence checking** against a hidden reference, with a distinguishing
    example as feedback. This is the Alloy4Fun model (Macedo et al. 2020, DOI 10.1007/978-3-030-48077-6_5; described
    as an equivalence check against a hidden oracle in <https://arxiv.org/abs/2402.06624>).
  - Seed families: negate-and-search, primed-variable obligations, WP derivation, safety-vs-liveness classification,
    fairness-for-this-lasso, observer/equivalence pairs.
  - Re-find becomes "same reasoning move, new specimen".

### F7 — MAJOR — Claims and specimens are minted by clicks on authored runs
- **Evidence.**
  - l.91-92: "Every lab and many lessons **mint claims**."
  - Lesson artboard: "This lesson establishes C1.1"; "Mount as specimen S1.2" right after running the authored
    snippet.
  - Theater artboard: "Mount the 4-step trace as specimen S5.1", but the 4-step trace is TLC's shortest, not the
    learner's.
  - Elevation: "in progress · 7 of 12 claims". Ledger: "31 claims. 12 proved."
- **Why it fails.** This is kernelspace defect #2 (a keypress pays 100 XP) in a new currency. The Ledger, which is
  both the progress system *and* the Course 10 assurance report (l.115-118), fills with course-authored results.
- **Fix.**
  - Provenance on every claim and specimen: `authored-demo` (no credit; shown greyed), `learner-found` (predicted, then
    found the witness or proof under Call It), `assisted`, `agent`.
  - Elevation fill and course "set" count only `learner-found` and `unseen` evidence.
  - Mount TLC's trace as a *reference*; the learner's specimen is their own trace, with a minimality ratio.

### F8 — MAJOR — Locks and withheld help return
- **Evidence.**
  - l.261: theory drawers "open only when a Call It is missed twice".
  - l.215: audit cases "unlocked as courses are set".
  - l.125 and DESIGN.md l.101-102: Run is disabled on *every* run until a call is made.
  - Elevation: "Nothing is set on an unchecked base."
- **Why it fails.** kernelspace principle 11: "nothing locks". Kulik 1990: self-paced mastery programs reduce
  completion. §10 rejects "hearts or delays on hints" because help avoidance is the problem.
- **Fix.**
  - Drawers are always openable and logged, with credit unaffected.
  - Audit cases are recommended by the KC graph, never locked.
  - Call It is required on first-run authored moments and generated items. Free iteration (Bench, sandbox) is
    ungated, with an expert skip once a KC is solid (P1 risk mitigation).

### F9 — MAJOR — No hint ladders where learners get stuck most: Lean proofs
- **Evidence.** There are no hints anywhere. Goal Replay (l.209-211) is authored reading. Labs L2, L3 and L9 are
  multi-week Lean projects.
- **Fix: adapt H3.**
  - **R0:** teach-back (state the theorem in words and the induction you expect).
  - **R1:** the concept (generalise the hypothesis; why `induction l generalizing s`).
  - **R2:** where it's stuck, showing the stuck goal state.
  - **R3:** a proof skeleton with `sorry` holes. This is the Lean-native faded worked example (van Gog & Sweller 2015).
  - **R4:** the informal proof in prose.
  - Bottom-out leads to a walkthrough, then re-prove after ≥24 h, credited `assisted` until an unseen-variant Prove-it
    passes.

### F10 — MAJOR — The toolchain wall moved to Course 02 (Lean)
- **Evidence.**
  - l.184: "No in-browser Lean; replay shows how goals transform, the Bench does the proving."
  - 2.8 uses "`Finmap`… and a finite sum" (l.334). `Finmap` and finite sums live in Mathlib, so the first real lab
    pulls a Mathlib cache.
  - Searched 2026-10-21: no official in-browser Lean WASM build. lean4web runs the Lean server "on a web server, and
    not in the browser" (<https://github.com/leanprover-community/lean4web>). A "Talos" WASM interpreter is an
    unverified lead.
  - Mathlib cache size: unverified, re-measure.
- **Fix: adapt F3's lanes.**
  - **(a) Goal bank:** phone-friendly "predict the goal after this tactic" and "which hypothesis is missing" items,
    *recorded in CI from a pinned Lean toolchain*, never hand-authored, the way kernelspace's compile bank pins rustc.
  - **(b)** A consented, labelled lane on live.lean-lang.org for short exercises ("code leaves your machine"), by
    kernelspace OD6's logic.
  - **(c)** Keep L2 dependency-light: functions `AccountId → Int` over an explicit account list and core `List.sum`.
    No Mathlib until it is needed.
  - **(d)** Staged labs (F2): stage 1 is a 2-minute green (`rfl`/`simp` lemma); every stage ≤25 min.

### F11 — MAJOR — The learner model mismatches the actual successor learner; test-out exists only for Course 00
- **Evidence.**
  - l.10-11: "Audience: backend engineers comfortable with Python and one typed language. No prior logic…". The actual
    learner has finished kernelspace and is Rust-fluent.
  - Placement covers Course 00 only, with 10 Call It items (l.277-278).
  - Sibling overlap: tablespace T4/lab 04 covers MVCC, snapshots, visibility and ww-conflicts
    (`tablespace-PLAN.md` l.93, l.113). Lab 03 covers WAL replay idempotence and crash injection (l.112).
    byzantine's labs use a deterministic simulated `Net` with xorshift streams (`byzantine-PLAN.md` l.81, l.90).
- **Fix.**
  - KC-level placement (K3: ≤20 adaptive items, persisted `{entry, missedKcs, at}`, test-out on 3 fresh items, day-7
    confirmation).
  - **Assume** for kernelspace graduates:
    - Rust and cargo;
    - threads and atomics, MPMC queues;
    - scheduling, admission and preemption;
    - refcounted block managers;
    - seeded deterministic simulation and sha256-pinned traces;
    - the family's Today and ledger habits.
  - **Don't assume:** logic, induction, TLA+, or MVCC/isolation unless tablespace evidence is imported.
  - Accept a kernelspace or tablespace Evidence Pack as test-out evidence.
  - Cross-link instead of re-teaching:
    - 6.5-6.6 points to tablespace T4 for MVCC mechanics and keeps only the *formal* layer (histories, refinement R);
    - 8.6 points to byzantine's `Net` and kernelspace's Fleet engine for deterministic simulation.

### F12 — MAJOR — No bridge back to kernelspace topics
- **Evidence.** No lesson, lab or audit case touches serving systems. Yet kernelspace's interactive audit §1.3 shows the
  learner already ran "pool: op-by-op conformance of a block manager against `RefBlockManager`". That *is* a TESTED
  refinement check, unnamed.
- **Fix: transfer items with "where the analogy breaks" (P3).**
  - Money conservation ↔ KV block conservation (free + Σ allocated = total). It breaks because blocks have identity
    and refcounts, and money is fungible.
  - Course 01/04: Z3 obligations for `alloc/free/fork` with refcounts; find the double-free witness.
  - Course 05: TLA+ for admission plus recompute preemption.
    - Safety: allocated ≤ capacity.
    - Liveness: every admitted request completes. This needs fairness and bounded sizes; produce the starvation
      lasso.
  - Course 08: trace-validate the learner's own Fleet traces against that spec. Cirstea, Kuppe, Loillier & Merz 2024
    frame trace validation as constrained model checking with TLC (<https://arxiv.org/abs/2404.16075>).
  - Course 06/09: re-stamp kernelspace's pool conformance honestly as TESTED (n), then prove the model.
  - The Deferred Shelf's Kani/Verus drawer (l.252-254) names the learner's Rust block manager as its opening
    obligation.

### F13 — MAJOR — Single source of truth is broken in three places
- **Evidence.**
  - Semantics is implemented three times: Lean (reference), a TS port "golden-tested against Lean `#eval` exports"
    (l.180), and "own explicit-state BFS for a small PlusCal-like DSL" (l.181). The Theater therefore plays a different
    artifact than the learner's `.tla`.
  - There is no event log, schema version, import-merge, cross-tab rule or migration (l.575-578).
  - Naming collides: v1's learner "Claims Ledger" vs kernelspace's "claims registry" (sourced course facts) vs
    "Evidence Ledger" (learning events).
- **Fix.**
  - Theater runs the learner's real TLA+ through **tla-web**, Will Schultz's in-browser TLA+ interpreter
    (<https://github.com/will62794/tla-web>; docs say it is "likely much slower than TLC" and that model checking is
    not a goal: <https://docs.tlapl.us/using:tla_web_explorer>). TLC stays authoritative. PlusCal support is
    unverified, so translate PlusCal on the Bench.
  - Inherit V3 and §7.1 as-is: append-only events with `provenance`, schema guard, BroadcastChannel sync,
    double-import property tests.
  - Rename: **Evidence log** (events), **Course facts** (sourced registry), **Assurance ledger** (learner claims).

### F14 — MAJOR — Stale facts are not dated claims
- **Evidence.**
  - §6 Sources lists names only, "URLs as given in the roadmap; pin versions… at build time" (l.637-643).
  - Lesson artboard hard-codes "Z3 4.15 (wasm, in this tab)".
  - Readings are cited by chapter number ("TPIL ch. 3–5, 7–8", l.322-323), which rots when books are restructured.
  - Lean ships monthly. The language reference is already at 4.27.0-rc1 per its URL
    (<https://lean-lang.org/doc/reference/4.27.0-rc1/ValidatingProofs/>).
  - TLC flags (`-dumpTrace json`, l.181) and PGlite limits (l.182) are unsourced.
- **Fix.**
  - Inherit S2's schema `{id, value, source{url, quote}, verifiedAt, ttlDays, rev}` for every tool-behaviour and
    industry fact (e.g. "AWS uses TLA+", "what CompCert covers").
  - Read instrument version strings from the loaded engine at runtime.
  - Cite readings by section anchor and title, not chapter number.
  - Add S4 change cards ("1 thing you learned has changed") for toolchain shifts such as Lean `decide` or
    `native_decide` behaviour.
  - Re-run `verify:calls` on every pin bump. v1 already has this, and it is the strongest part.

### F15 — MAJOR — The Z3-in-browser hosting contract was not inherited
- **Evidence.**
  - The z3-solver README says "The package requires threads", needs `SharedArrayBuffer`, and requires pages to be
    served with cross-origin isolation headers (COOP/COEP). It offers a client-side workaround but says "you
    shouldn't use that trick in more complex applications"
    (<https://raw.githubusercontent.com/Z3Prover/z3/master/src/api/js/PUBLISHED_README.md>, read 2026-10-21).
  - The family deploys statically (kernelspace uses GitHub Pages, which cannot set custom headers).
  - kernelspace §7.3 allows a service worker only with a kill switch, and discloses giscus and Google Fonts. Under
    COEP `require-corp`, those embeds may break (unverified per browser).
- **Fix.**
  - Choose the host by header support: a static host with a `_headers` file, still zero-server. Otherwise, design the
    service-worker path deliberately under §7.3 rules.
  - Lazy-load Z3 with download consent and size disclosure, the way kernelspace handles Miri at 54 MB. Z3's wasm size
    is unverified.
  - Run Z3 only in a worker with hard timeouts; reporting a timeout as UNKNOWN is good.
  - Add a phone-mode fallback that shows the canonical result.

### F16 — MAJOR — No evidence base or measurement plan for v1's own mechanics
- **Evidence.**
  - §6 cites only content sources. No mechanic carries an Ev/Prec tag.
  - There are no keep/kill rules and no within-learner randomization.
  - There is no "this will feel harder" card (Deslauriers 2019).
  - The user's round-2 brief demands "highest-quality scientific evidence".
- **Fix.**
  - Tag each mechanic. Call It maps to prequestions and prediction (St. Hilaire 2023 g=0.54; Brod 2021). Re-find and
    Today map to retrieval and spacing (Rowland 2014; Cepeda 2008). Goal Replay maps to faded worked examples. The
    Audit Desk maps to error detection (Prec only).
  - Pre-register keep/kill rules: for example, the Audit Desk and Goal Replay must be non-inferior at 30 days.
  - Import kernelspace's Appendix A calibration: field effects are ~0.1 SD; no "100×" in copy.

### F17 — MINOR — The Judgment panel misstates its statistics
- **Evidence.** Elevation artboard: "0.25 is a coin flip". That holds only for binary 50% forecasts; calls are 3-way
  and the options are 55/75/95%. "At 80% confidence you were right only 58%" refers to a bucket that does not exist.
  n=40 is shown with no interval, yet it drives a diagnosis ("Overconfident about guards").
- **Fix.** Use multi-class Brier or log score against a uniform-guess baseline. Show buckets as offered. Show n and a
  Wilson interval per bucket. Make no diagnosis below ~20 calls per bucket (K5: intervals, track-level only).

### F18 — MINOR — The home is a map and the nav has 9 destinations
- **Evidence.** Elevation nav: Elevation, Courses, Bench, Theater, Audit Desk, Cabinet, Ledger, Notes, Search.
  kernelspace §4.D: "At most five primary destinations replace today's eight"; returning visits land on Today.
- **Fix.** Use five destinations: **Today** (due items, Daily Audit, next step); **Elevation** (path); **Bench**
  (labs, Theater, instruments); **Ledger** (claims, specimens, notes, Judgment); and **⌘K**. Elevation remains the
  first-visit and orientation view.

### F19 — MINOR — Lessons and labs are not sized for a 30-minute day
- **Evidence.** Lesson artboard "~45 min"; L1 "3–5 h" (l.305) with no stages. kernelspace §5.0: "A 30-minute day
  always works: lab stages ≤25 min, lessons resumable at H2 boundaries". §7.2: segments ≤12 min, each ending in a
  graded interaction.
- **Fix.** Adopt the §7.2 anatomy and `verify-lessons`. Split Bench labs into receipt-checked stages mapped to check
  ids.

### F20 — MINOR — No production twins
- **Evidence.** kernelspace §5.8 "Production twins" uses upstream code at pinned SHAs. v1 cites only textbooks.
- **Fix.** Cedar is a near-exact twin for Courses 03/06/07/09: a Lean model with proved properties, Rust production
  code checked against it by differential random testing, and "verification-guided development"
  (<https://arxiv.org/abs/2407.01688>, <https://arxiv.org/abs/2403.04651>, <https://lean-lang.org/use-cases/cedar/>).
  Add three tracing questions at a pinned SHA per course, as a 60-day version claim.

### F21 — MINOR — No capacity plan
- **Evidence.** l.621-633 lists phases with no hours, partner gates or cut order. kernelspace §8: "review hours are the
  binding constraint" (511 h for a refit of an existing course).
- **Fix.** Fixed capacity, variable scope. Cost each phase in review hours. Define a cut order: Datalog instrument →
  Derivation Board polish → Theater environment actions → audit cases beyond 2 per course.

## 3. Inherit, adapt, or make deliberately different

**Inherit as-is** (as code, ideally one shared family package, re-skinned):
- V3 evidence log with §7.1 guards and property tests;
- V6 provenance weights;
- ts-fsrs plus the K2 rules (card cap, welcome-back, never an overdue count);
- V1 `verify-items` lints;
- the H1 guardrail-kit mechanics (deny rule, PreToolUse hooks, explanation gate, AI-use card);
- H2 keyless context packets;
- the S1 errata policy ("re-check", never deducted);
- the S2 claims schema and freshness pipeline;
- K3 placement and test-out;
- §7.3 perf, a11y and security gates;
- §9 within-learner randomization with prereg and keep/kill rules;
- the §10 "will not build" list (BYOK grading, LLM-graded credit, timers, hard locks, XP leaderboards, "100×" copy).

**Adapt:**
- K1 numeric generators → solver-graded formula and program generators that accept any valid witness and grade
  statements by equivalence.
- H4 v2 → "predict what your checker says on a seeded new command", graded by running it.
- W3 Daily → **Daily Audit** on the learner's own repo (mutation-generated PRs).
- F2 staged labs → theorem-staged Lean labs with `sorry` skeletons.
- F3 compile bank → a CI-recorded Lean goal bank.
- P3 isomorphisms → kernelspace↔formal pairs with `breaks`.
- §5.8 twins → Cedar and TLA+ trace validation.
- K5 Mirror → Judgment plus VRC₃₀.
- Evidence Pack → the assurance report, which v1 already has (l.115-118). Keep it.

**Deliberately different (keep v1's choices):**
- The currency is assurance stamps, not XP or rings.
- Failure is a collected specimen.
- The learner plays the adversary (the Theater) instead of playing against a ghost. TLC's shortest trace serves as the
  debrief ghost.
- The vellum/stamp identity stays.
- Calibration uses numeric confidence. Judgment *is* the taught skill, so keep 55/75/95 over guess/think-so/sure, but
  fix the statistics (F17).
- Grading is fundamentally different. kernelspace grades numbers against keys with tolerances. Plinth can verify
  witnesses, proofs and equivalences mechanically, but must then defend the *statement* (F2, F6) because machines
  cannot grade intent.

## 4. Bold ideas
1. **Daily Audit on your own repo.** Mutation operators drawn from the 12-class taxonomy are applied to the learner's
   own plinth-lab:
   - weaken a conclusion;
   - add a vacuous hypothesis;
   - swap `Int`↔`BitVec`;
   - drop a frame conjunct;
   - insert `native_decide`;
   - shrink TLC constants.

   Each mutation is presented as an agent PR. Ground truth is known by construction and checked by Z3, TLC or
   Comparator. This is the formal-methods analogue of kernelspace's Fleet Daily on own components, and it is phone-
   friendly for the Z3 and TLA+ parts.
2. **"Agents prove, humans state" as the lab-zip policy.** A PreToolUse statement-freeze plus Comparator challenge files
   turn the guardrail kit into a working prototype of an agent policy under which agents write proofs and checkers
   judge them.
3. **Equivalence-graded specification practice.** Alloy4Fun-style: every "write the property" item is graded by
   Z3/Alloy equivalence against a hidden reference, with the distinguishing state as feedback. This makes "say
   exactly what you mean" practice machine-graded and infinitely fresh.
4. **Kernelspace in the dock.** A cross-course capstone track:
   - the KV block manager's conservation and refcount invariants (Z3 and Lean);
   - scheduler admission safety and starvation liveness (TLA+ with WF/SF);
   - trace validation of the learner's own sha256-pinned Fleet traces against the spec.

   The output is an assurance report on code the learner wrote a year earlier.
5. **VRC₃₀ and a calibration mirror.** A proper scoring rule with intervals. "Sure-and-wrong" calls schedule review
   first. The headline metric is reasoning moves retained at 30 days on fresh solver-generated items.
6. **Evidence Pack import.** A kernelspace, tablespace or byzantine Evidence Pack feeds test-out, so Rust, concurrency,
   MVCC and deterministic-simulation KCs are credited, not re-taught.
7. **Cedar twin reading room.** At a pinned SHA, trace how Cedar's Lean model, differential tests and symbolic compiler
   map onto Courses 03, 06, 07 and 09. The learner then replicates Cedar's DRT pattern in L6.
8. **One family platform package.** Extract kernelspace's ledger, FSRS, claims registry, verify lints and guardrail kit
   into a shared library that Plinth, tablespace and byzantine consume with their own skins. Review hours are the
   binding constraint for a solo maintainer.

## 5. Sources consulted (accessed 2026-10-21)
- z3-solver npm README: <https://raw.githubusercontent.com/Z3Prover/z3/master/src/api/js/PUBLISHED_README.md>
- Lean FRO Comparator: <https://github.com/leanprover/comparator>; Lean reference "Validating Proofs":
  <https://lean-lang.org/doc/reference/4.27.0-rc1/ValidatingProofs/>
- lean4web (server-based): <https://github.com/leanprover-community/lean4web>. An in-browser Talos lead is
  **unverified**.
- tla-web: <https://github.com/will62794/tla-web>; <https://docs.tlapl.us/using:tla_web_explorer>;
  <https://conf.tlapl.us/2024/WillSchultz-TowardsBetterInteractiveFormalSpecifications.pdf>
- Trace validation: Cirstea, Kuppe, Loillier, Merz (2024) <https://arxiv.org/abs/2404.16075>
- Cedar: <https://arxiv.org/abs/2407.01688>; <https://arxiv.org/abs/2403.04651>;
  <https://lean-lang.org/use-cases/cedar/>
- Alloy4Fun: Macedo et al. 2020, DOI 10.1007/978-3-030-48077-6_5; <https://arxiv.org/abs/2402.06624>
- DeepSeek-Prover-V2: <https://arxiv.org/abs/2504.21801>
- Learning-science citations (Kulik 1990, Bastani 2025, Pan & Rickard 2018, St. Hilaire 2023, Deslauriers 2019,
  van Gog & Sweller 2015, Kraft 2020) are taken from kernelspace-PLAN-100X Appendices A and B, which hold the DOIs.
- **Unverified:** Mathlib cache download size; z3 wasm bundle size; COEP behaviour of giscus and Google Fonts per
  browser; PlusCal support in tla-web.
