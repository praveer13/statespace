# PLINTH — Course Design

**Learn formal methods by building a tiny checked application language.**

An interactive, local-first course that takes a working software engineer
from "I've heard of Z3" to being able to define application semantics,
derive proof obligations, read counterexamples, audit agent-written
"verified" code, and say exactly what a proof does and does not establish.

**Audience:** backend engineers comfortable with Python and one typed
language. No prior logic, type theory or PL background assumed.
**Arc:** 9–18 months at 6–10 h/week. No deadlines; stage estimates are rough.
**Split:** 20% reading · 65% building and proving · 15% writing.
**Design date:** 2026-10-20. Visual design: `DESIGN.md` and the design canvas.

---

## 0. Thesis — what this course is, and what kernelspace is not

kernelspace is a **flight simulator and a forge**: you build systems components,
plug them into a persistent simulated cluster, and defend choices with a
measured number. Its currency is *performance under SLO*.

Plinth needs a different currency. In formal methods the dangerous failure is
not a slow system — it is a **true theorem about the wrong thing**. A green
check feels like a guarantee; it is a guarantee only about a proposition,
under assumptions, of a model, by a method, with some correspondence to a
running system. So the course is built around one object and one skill:

- **The object — the Claim.** Every result the learner produces is a claim with
  six fields (proposition, assumptions, model, method, correspondence,
  counterexample-when-weakened) and an honest **assurance stamp**: PROVED,
  CHECKED (with its bound), TESTED (with its n), ENFORCED, ASSUMED, REFUTED,
  UNKNOWN. Progress is the Claims Ledger, not XP.
- **The skill — judgment.** Before every solver, prover or model-checker run,
  the learner **calls it** (predicts the verdict and a confidence). Judgment is
  measured as calibration. At the **Audit Desk**, the learner reviews
  plausible agent submissions marked "verified ✓" and finds the gap.

The metaphor carries the whole UI: a **plinth** is the base a statue stands on,
built in horizontal **courses** of stone. Each stage of the roadmap is a course.
A course is *set* when its viva is passed. A claim that rests on an untested
assumption shows as a dashed **seam**; later courses deliberately crack earlier
seams (**erosion events**), which is how the course teaches that guarantees are
relative. Your application stands on top — only once the base is checked.

| | kernelspace | Plinth |
|---|---|---|
| Look | dark terminal, mint accent, GPU-lab energy | light vellum drafting table, graphite, rubber stamps; blueprint at night |
| Unit | lesson in a track | lesson in a **course** (a stone layer) |
| Progress | XP, badges, streak, personal bests | **Claims Ledger** with assurance stamps; courses *set* by viva |
| Build loop | Forge: Rust → WASM → graded checks | **Bench**: local `plinth-lab` repo + `plinth` CLI → **receipts** that list their own trusted base |
| World | The Fleet: one persistent cluster sim | **Plinth itself**: one evolving language whose spec, theorems and specimens accumulate |
| Failure | a red test | a **specimen** — a counterexample collected, labelled, minimised, kept |
| Signature drill | arithmetic flashcards, speedruns | **Call It** (calibrated verdict prediction), **Re-find** (spaced retrieval of counterexamples) |
| Assessment | quizzes, exit tickets, lab checks | **Viva** (explain-back defence), **Audit Desk** (precision/recall on gap-finding) |
| Spiral | KC graph, spiral items | **Seams and erosion**: planted assumptions cashed in by later courses |

---

## 1. The ten courses at a glance

Plus an on-ramp (Course 00) and a capstone (Course 10). 80 lessons + 7 capstone
steps, 9 bench labs, 32 audit cases, ~40 specimens to collect, 11 vivas, 4 technical notes.

| # | Course | Tool | Promise | Lessons | Est. |
|---|---|---|---|---|---|
| 00 | **Ground** | pencil + Z3 | Read and write the logic every later course assumes. | 6 | 1–2 wk |
| 01 | **Counterexample** | Z3Py | Find a bug mathematically. | 5 | 2–4 sessions |
| 02 | **Proof** | Lean 4 | Prove a small program correct — and say what was proved. | 10 | 3–6 wk |
| 03 | **Semantics** | Lean 4 | Invent Mini-Plinth: syntax, types, meaning, safety. | 9 | 4–8 wk |
| 04 | **Obligations** | Lean + Z3 | Derive verification conditions instead of guessing assertions. | 8 | 3–6 wk |
| 05 | **Time** | TLA+ / TLC | Concurrency, safety vs liveness, fairness. | 9 | 3–6 wk |
| 06 | **Correspondence** | PostgreSQL, Rust | Relate abstract semantics to a real database. | 9 | 4–8 wk |
| 07 | **Secrecy** | Soufflé, Alloy, Z3 | Authorization and information-flow claims. | 8 | 4–8 wk |
| 08 | **Effects** | TLA+, Rust sim | Reliable external effects under crashes. | 7 | 3–6 wk |
| 09 | **Preservation** | Lean 4 | A compiler pass that provably preserves meaning. | 9 | 6–10 wk |
| 10 | **Assembly** | everything | Plinth Core: a published research artifact. | 7 steps | open |

Technical notes (learning rule 5) are due after courses 02, 05, 07 and 09.

---

## 2. Signature mechanics

Each mechanic exists because one of the roadmap's learning rules needs a
place to live in the interface. Mapping in §2.10.

### 2.1 Claims Ledger — the progress system

- Every lab and many lessons **mint claims** (`C<course>.<n>`). A claim is a
  typed record: the six fields, a stamp, the receipt or instrument run that
  supports it, and links to specimens.
- Stamps are the core semantic palette (DESIGN.md §3). A stamp cannot render
  without its qualifier: CHECKED must state its bound, TESTED its n, UNKNOWN
  its timeout. There is no "verified" or "correct" label anywhere in the UI.
- **Seams.** Each claim's ASSUMED fields are seams. A course *plants* seams on
  purpose (e.g. Course 01 uses unbounded `Int`).
- **Erosion events.** Later courses crack seams on schedule and the Ledger
  shows a vermilion EROSION banner with the specimen that cracked it. The
  original claim stays PROVED *of the model* — erosion hits the
  correspondence field, never silently the proposition. The learner must
  either restate the claim, strengthen the implementation, or accept the
  seam with a written rationale. Planned erosions:

  | Event | Cracked claim | By | Specimen |
  |---|---|---|---|
  | E1 | C1/C2 balance claims over `ℤ` | Course 06 `bigint` overflow (foreshadowed by S1.4) | S6.4 |
  | E2 | C2 sequential conservation | Course 05 read-then-write interleaving | S5.1 |
  | E3 | C3 "safe" semantics with no observer | Course 07 noninterference | S7.1 |
  | E4 | C5 holds model without crashes | Course 08 crash windows | S8.1 |
  | E5 | C4 VCs checked on source only | Course 09 bad optimisation | S9.1 |
  | E6 | C3 `Nat` balances "can't go negative" | Course 03 itself, lesson 3.7 | S3.3 |

- Export: the Ledger renders the Course 10 **assurance report** (Markdown +
  JSON) that distinguishes proved, model-checked, tested, runtime-enforced and
  assumed properties — the roadmap's final deliverable falls out of the
  progress system rather than being written at the end.

### 2.2 Call It — calibrated prediction before every run

- Every instrument run (Z3, Theater explorer, PGlite, Datalog) and every
  authored "what will Lean say" moment is gated: pick a verdict
  (`sat`/`unsat`/`unknown`, `holds`/`violated`, `type-checks`/`stuck`, trace
  length, which anomaly) and a confidence (55/75/95%), then Run unlocks.
- Calls feed **Judgment**: Brier score, a reliability diagram by confidence
  bucket, and a breakdown by question type ("you are overconfident about
  guards"; "you under-predict liveness failures").
- Re-running is free but the first call is the one recorded. There is no
  penalty for "unknown" when the instrument genuinely returns unknown.
- Every authored Call It answer is **machine-checked at build time**
  (`verify:calls` runs each Z3 snippet and explorer model and asserts the
  authored verdict) — the course holds itself to its own standard.

### 2.3 The Specimen Cabinet — counterexamples as collected objects

- Any REFUTED result can be **mounted**: the counterexample (Z3 model, TLA+
  trace, failing Lean goal, SQL history, Alloy instance, paired observations)
  plus a label card: *violates, because, minimal?, cured by, found in, tool
  version*.
- **Minimise** is a first-class action: shrink a trace or model (fewer steps,
  smaller values) and the Cabinet records whether the learner reached the
  instrument's shortest witness.
- Each course lists the specimens it expects (§3). Missing specimens are shown
  as empty labelled drawers — collecting them is the closest thing Plinth has
  to achievements, and every one of them is a broken example preserved next
  to its fix (learning rule 2).
- **Re-find** (spaced retrieval): the Cabinet periodically re-presents an old
  broken spec with the counterexample hidden; the learner must find it again,
  under Call It. Scheduling is a simple expanding-interval queue keyed by
  specimen, not by fact — it rehearses a *reasoning move*, not a definition.

### 2.4 The Bench — real tools, local repo, receipts

- The roadmap insists on one evolving `plinth-lab` repository. The course ships
  it as a template (`labs/` → zip + `git clone`), with one directory per
  course and a `plinth` CLI (Python, `uv`-managed) that runs the real tools:
  `pytest` for Z3Py, `lake build` + `#print axioms` for Lean, TLC with a
  pinned `tla2tools.jar`, Docker Postgres, Soufflé, Alloy, `cargo test`.
- `plinth bench check s2` produces a **receipt** (`receipts/s2.json`): checks
  passed, goals proved, `sorry` count, the axioms each theorem depends on, TLC
  state counts and depth, tool versions, file hashes, timestamps.
- The site imports receipts (drag-drop or paste) and mints/updates claims.
- **Every receipt prints its own trusted computing base**: "you trust Lean's
  kernel, `propext`, `Quot.sound`, this CLI's parser of Lean output, and your
  own machine." The grader is honest that it is not tamper-proof — a receipt
  establishes reproducibility on your machine, which is a lesson in itself
  (Course 09 returns to it).
- Three setup lanes: native toolchains, VS Code Dev Container, Codespaces —
  with pinned versions in `labs/TOOLS.md`.

### 2.5 Instruments — what runs in the browser

The lesson page has live **instrument cells**. Each states what it is and
what it is not.

| Instrument | Engine | Used in | Honest limits |
|---|---|---|---|
| Z3 | official `z3-solver` npm (WASM) in a worker | 00, 01, 04, 07 | Same solver, Python syntax shimmed to the JS API; long queries time out at 10 s |
| Mini-Plinth interpreter | TS reference, golden-tested against Lean `#eval` exports | 03, 04, 06, 09 | A port; the Lean evaluator is the reference semantics |
| Theater explorer | own explicit-state BFS for a small PlusCal-like DSL; plus TLC trace import (`-dumpTrace json`) | 05, 08 | Toy-sized state spaces; TLC on the Bench is authoritative |
| PGlite | Postgres compiled to WASM | 06 | Single connection — sequential semantics, NULL/bag/numeric behaviour only; concurrency labs run on Bench Postgres and are replayed here |
| Datalog | small semi-naive evaluator in TS | 07 | Positive Datalog + stratified negation; Soufflé on the Bench for the lab |
| Lean | Goal Replay (authored, recorded goal states) + local `lake` | 02, 03, 09 | No in-browser Lean; replay shows how goals transform, the Bench does the proving |

All of these are verified-before-build items: pin exact versions at
implementation time and record them in `TOOLS.md` and on every receipt.

### 2.6 The Theater — you are the adversary first

- For concurrency and effects, the learner plays the **scheduler and the
  environment** before any tool does: step any process, crash any process,
  duplicate or delay any message, restart. Monitors evaluate invariants live;
  liveness monitors ask for a **lasso** (a repeatable loop) rather than a
  finite prefix.
- Then the same model goes to the explorer (and TLC on the Bench). The Theater
  compares: your trace length vs the shortest; states explored; and **what the
  bound was** (stamp: CHECKED ≤ N states, with the model constants printed).
- Granularity is a visible modelling choice: actions can be split or merged
  and the Theater shows how the set of reachable interleavings changes.

### 2.7 Derivation Board and Goal Replay — reasoning by hand first

- **Derivation Board** (Course 04): weakest preconditions are derived by
  dragging substitutions onto a predicate, step by step, before the VC
  generator is written. The board checks each step syntactically and,
  at the end, hands the resulting VC to Z3. Completion test: derive
  obligations manually for assignment and conditionals.
- **Goal Replay** (Courses 02, 03, 09): authored proofs are shown as a strip of
  goal states; the learner predicts the next goal (Call It) before each
  tactic is revealed. It teaches reading Lean without reciting tactics.

### 2.8 The Audit Desk — reviewing agent "verified" work

- 32 authored cases, 3–5 per course, unlocked as courses are set. Each is a
  plausible agent PR: a description, a diff (Lean, Python/Z3, TLA+, SQL, Rust)
  and a confident claim ("proved", "model-checked", "tested, safe to merge").
- The learner files a **finding**: a gap class from the 12-class taxonomy
  (below), evidence (ideally a specimen), and a re-stamp (REFUTED / ASSUMED /
  downgrade CHECKED / ACCEPT).
- Some cases are **sound** — accepting them is the right answer. Scoring is
  precision *and* recall: rejecting everything is as useless as accepting
  everything.
- **Gap taxonomy** (also the vocabulary of the vivas and the final report):
  1. Statement too weak — proves less than claimed
  2. Vacuous premise — hypotheses can't all hold
  3. Wrong property kind — safety stated, liveness needed (or reverse)
  4. Unsound encoding — `Int` for `i64`, missing frame condition, quantifier slip
  5. Bounded presented as unbounded
  6. Hidden trust — `sorry`, `axiom`, `native_decide`, `admit`, unchecked lemma
  7. Unstated environment assumption — fairness, no crashes, provider idempotency
  8. Model–implementation drift — the theorem is about a different function
  9. Granularity error — atomicity in the model that the code lacks
  10. Observer too weak — information flow checked against the wrong view
  11. Test presented as proof
  12. Requirement mismatch — true proposition, wrong business intent

### 2.9 Viva, Notes, and the Deferred Shelf

- **Viva** — each course's completion test, as an oral defence. 5–7 prompts
  ("Explain why searching for a violation means asserting the negation";
  "State the fairness assumption C5.2 needs and what fails without it").
  The learner writes or records an answer, then sees a rubric and model
  answer and self-grades each rubric line. Optional bring-your-own-key
  examiner (Claude via direct browser API call; key stays in the browser)
  asks follow-ups and grades against the same rubric. A course is **set** on
  passing its viva — never on reading its pages.
- **Notes** — the technical-note composer (model · surprising failure · what
  changed my understanding), pre-filled with links to the learner's own
  specimens and erosion events. Exports Markdown for a blog or the repo.
- **Deferred Shelf** — the roadmap's "do not study prematurely" list, shown as
  closed drawers, each with the concrete obligation that would open it
  (e.g. *Kani/Verus — opens when a Course 09 claim's correspondence field
  names Rust runtime code you want to verify directly*). It makes restraint
  a visible design choice rather than a missing topic.

### 2.10 Learning rules → mechanics

| Roadmap rule | Where it lives |
|---|---|
| 1. Read only enough theory | Lessons are short and gated by the next artifact; theory "drawers" in each lesson open only when a Call It is missed twice |
| 2. Preserve broken examples | Specimen Cabinet; the lab template keeps `broken/` beside `fixed/` |
| 3. Explain every guarantee in six parts | The Claim record; the stamp system; the viva rubric |
| 4. Lean ≠ business intent | Lesson 2.10, gap class 12, every PROVED card has a separate "Requirement" field that can only be ASSUMED or argued |
| 5. Technical note every 2–3 stages | Notes composer; due after 02, 05, 07, 09 |
| 6. Track what you can reason about | Course set by viva; Judgment calibration; Audit precision/recall |

---

## 3. Curriculum, course by course

Format per course: promise · theory · lessons · bench lab · specimens ·
audit cases · claims and seams · viva prompts.

### Course 00 — Ground (on-ramp)

*Read and write the logic every later course assumes.* Skippable by a
10-question placement check graded with Call It.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 0.1 | A proof is not a test | Enumerate a 3-bit transfer space by hand, then reason about all of ℤ | — |
| 0.2 | Propositions and implication | Truth tables; discover that `false → anything` is true | Seam: vacuity (cashed in A1.1, A2.2) |
| 0.3 | Quantifiers and negation | Negate "every balance stays non-negative" correctly; ∀/∃ duality | — |
| 0.4 | State as functions, steps as relations | Write a transfer as a relation between `s` and `s′` | — |
| 0.5 | Induction, informally | Invariants as "true at start, preserved by every step" | — |
| 0.6 | Anatomy of a guarantee | Fill your first six-field claim card about a toy counter | C0.1 (ASSUMED-heavy, on purpose) |

Viva: negate three English properties; explain vacuous truth with an example
from payments; state the six fields from memory and why each exists.

### Course 01 — Counterexample · Z3Py

*Find a bug mathematically.* Theory: propositions, first-order constraints,
satisfiability, models, integer arithmetic. Reading: Z3Py introduction.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 1.1 | sat, unsat, unknown | Run the starter; read a model; force an `unknown` with nonlinear arithmetic | — |
| 1.2 | Negate, then search | Assert the bad outcome; get the overdraft witness | S1.1 overdraft |
| 1.3 | The guard | Add `amount ≤ a`; unsat; write what unsat does and doesn't say | C1.1 |
| 1.4 | Two-state properties | Primed variables; conservation; double capture; the buggy refund | S1.2 double capture, S1.3 refund mints money, C1.2–C1.3 |
| 1.5 | The encoding is the claim | Re-encode with `BitVec(64)`; watch a "proved" guard wrap | S1.4 wraparound — first look at seam E1 |

**Bench lab L1 — counterexample-lab** (Project 00, 3–5 h): the roadmap's
first-weekend checklist verbatim, plus a `README.md` written as six-field
claim cards. Receipt: pytest results, Z3 version, each query's verdict.

**Audit cases:** A1.1 "unsat, therefore safe" with contradictory constraints
(vacuous) · A1.2 `Int` model shipped for `i64` code (encoding) · A1.3 a 10 s
timeout reported as "no counterexample found" (UNKNOWN presented as proof).

**Viva:** why a violation search asserts the negation; precise meanings of
sat/unsat/unknown; why the answer depends on the encoding; what changes if
`amount` may be zero.

### Course 02 — Proof · Lean 4

*Prove a small program correct — and say what was proved.* Theory:
propositions-as-types, quantification, induction, proof terms, dependent
types, the trusted kernel. Reading: Natural Number Game (Tutorial, Addition,
Multiplication, Implication worlds required; rest optional), *Theorem Proving
in Lean 4* ch. 3–5, 7–8.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 2.1 | Lean as a language | `structure Ledger`, `def transfer`, `#eval` | — |
| 2.2 | Propositions as types | A proof is a term; `theorem` vs `def`; write one proof term by hand | — |
| 2.3 | Tactics transform goals | Goal Replay: predict each next goal before it's shown | — |
| 2.4 | Induction on ℕ | NNG checkpoint; explain an induction hypothesis in words | — |
| 2.5 | Two accounts, conserved | Prove conservation over `ℤ` | C2.1 |
| 2.6 | Rejection and non-negativity | Unchanged state on rejection; non-negativity after allowed transfer | C2.2 |
| 2.7 | Sequences of transfers | List induction; generalising the hypothesis | C2.3 |
| 2.8 | Finite maps of accounts | Generalise to `Finmap`/function update and a finite sum; meet self-transfer | S2.1 self-transfer mints money |
| 2.9 | The trusted kernel | `sorry`, `axiom`, `native_decide`, `#print axioms`; what the kernel does and doesn't check | — |
| 2.10 | Statement review | Read three true theorems that don't say what the business wants | Seam: requirement field |

**Bench lab L2 — verified-ledger:** two-account then finite-map ledger with
C2.1–C2.4 proved, no `sorry`, axiom list in the receipt.

**Audit cases:** A2.1 `refund_nonneg` constrains only the customer (too
weak) · A2.2 a hypothesis pair that can't both hold (vacuous) · A2.3 a lemma
closed by `native_decide`/a stray `axiom` (hidden trust) · A2.4 theorem about
`transfer'`, export is `transfer` (drift) · A2.5 sound — accept it.

**Viva:** explain the induction in C2.3 without naming tactics; what kernel
acceptance establishes; one requirement C2.3 does not capture.

**Technical note 1** due.

### Course 03 — Semantics · Mini-Plinth in Lean

*Invent Mini-Plinth.* Theory: ASTs, type systems, big-/small-step semantics,
progress, preservation, termination. Reading: *Functional Programming in Lean*
ch. 1–2, 4, 7 as needed; Harper, *PFPL*, early chapters on statics,
dynamics, safety.

Toy syntax: `entity Account; command Transfer(from, to, amount); requires
balance(from) >= amount; do move amount from from to to.`

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 3.1 | Abstract syntax | Inductive `Expr`, `Guard`, `Cmd`, `Entity`; why we skip parsing | — |
| 3.2 | Typing judgements | Write `HasType`; resource vs scalar types; well-formed commands | — |
| 3.3 | Big-step with explicit errors | Evaluator into `Except PlinthError State` | — |
| 3.4 | Small-step and stuck states | Transition relation; find a stuck ill-typed program | S3.1 stuck |
| 3.5 | Progress and preservation | Prove both for the fragment | C3.1, C3.2 |
| 3.6 | Invariants of successful steps | Prove a state invariant preserved by successful transitions | C3.3 |
| 3.7 | Edge cases are decisions | Zero, self-transfer, failed guard, overflow — write a decision record; discover `Nat` subtraction truncates | S3.3 `Nat` hides overdraft (E6) |
| 3.8 | Termination | Structural recursion, fuel, why v0 has no loops | — |
| 3.9 | The unsafe command | Add `force move`; watch the invariant obligation fail | S3.2 |

**Bench lab L3 — mini-plinth-core:** AST, checker, evaluator, theorems; plus
`#eval` export of golden cases that the site's TS interpreter must match
(the course's own correspondence check).

**Audit cases:** A3.1 preservation proved for a checker stricter than the one
shipped (drift) · A3.2 big-step and small-step disagree on error states ·
A3.3 "balances can't go negative" because they're `Nat` (encoding).

**Viva:** behaviour of zero transfers, self-transfers, failed guards and
overflow answered from the semantics alone; what progress + preservation
buy you and what they don't.

### Course 04 — Obligations · Hoare logic, WP, SMT

*Build `miniplinth check`.* Theory: Hoare logic, weakest preconditions,
substitution, symbolic execution, SMT encoding soundness. Reading: PLF
Hoare and Hoare2; Z3 guide.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 4.1 | Hoare triples | Partial vs total correctness on transfer | — |
| 4.2 | WP of assignment | Derivation Board: substitution by hand | — |
| 4.3 | Sequence and conditionals | Derive WP for guarded commands by hand | C4.1 (hand-derived) |
| 4.4 | Commands to obligations | `Inv(S) ∧ Guard(S) ∧ Step(S,S′) ∧ ¬Inv(S′)` | — |
| 4.5 | Encoding to SMT | Sorts, primed variables, frame conditions; `Int` vs `BitVec` | revisits S1.4 |
| 4.6 | Build the checker | VC generator emits SMT-LIB; counterexamples decoded into Mini-Plinth states and replayed in the interpreter | C4.2 |
| 4.7 | The miscompiler | A planted translation bug makes a false theorem "proved"; locate it | S4.1 missing frame, S4.2 substitution capture |
| 4.8 | The trust stack | Solver correctness vs VCGen correctness vs semantics fidelity | C4.3 VCGen soundness for assign + if (Lean) |

**Bench lab L4 — miniplinth-check:** `miniplinth check cmd.plinth --inv inv`
reporting violating states or a proved obligation *for the stated fragment*.

**Audit cases:** A4.1 VCGen forgets unchanged accounts (frame) · A4.2
"Z3 proved it" over a query that never mentions the guard · A4.3 sound —
accept · A4.4 checker supports `if` but the command uses `match`.

**Viva:** derive WP for assignment and conditional on paper; explain the
difference between a solver bug and a VCGen bug, and which you'd catch how.

### Course 05 — Time · TLA+

*Concurrency and temporal behaviour.* Theory: labelled transitions,
safety/liveness, temporal logic, fairness, stuttering, model checking,
finite abstraction. Reading: Learn TLA+.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 5.1 | States, actions, behaviours | Stuttering; why specs allow doing nothing | — |
| 5.2 | First spec | Read-then-write transfer in PlusCal; TLC | — |
| 5.3 | The double spend | Theater first, then TLC; make the step atomic | S5.1 (E2), C5.0 |
| 5.4 | Holds lifecycle | Available → Held → Captured / Released | — |
| 5.5 | The hostile environment | Timeouts, duplicate replies, crashes, restarts, competing resolution | S5.2 resolved twice |
| 5.6 | Safety vs liveness | □, ◇, ~>; "never resolves twice" vs "eventually resolves" | C5.1 |
| 5.7 | Fairness | WF/SF; lassos; what the scheduler must promise | S5.3 starving lasso, C5.2 |
| 5.8 | What "no error" means | Bounds, constants, symmetry, state constraints | — |
| 5.9 | Refinement preview | One spec implementing another | — |

**Bench lab L5 — holds-spec:** spec + TLC configs + recorded traces; the
receipt carries constants, distinct states, depth.

**Audit cases:** A5.1 "deadlock-free, so it terminates" (wrong kind) ·
A5.2 liveness proved under fairness of an action the environment controls
(assumption) · A5.3 2-worker check presented as N-worker proof (bounded) ·
A5.4 one atomic action that's three SQL statements in the code (granularity).

**Viva:** distinguish the two hold properties; name the fairness assumptions;
explain why bounded exploration isn't a proof for all sizes.

**Technical note 2** due.

### Course 06 — Correspondence · PostgreSQL + Rust

*Relate abstract semantics to a real database.* Theory: relational algebra,
NULL, bags, MVCC, histories, serializability, snapshot isolation, refinement.
Reading: PostgreSQL docs, Transaction Isolation.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 6.1 | SQL is not relational algebra | Bags, NULL, three-valued logic in PGlite | S6.1 NULL guard no-op |
| 6.2 | Compile a transfer | `UPDATE … WHERE balance >= $1 RETURNING`; rowcount as the guard result | — |
| 6.3 | Differential testing | Random commands through interpreter and Postgres; compare | C6.1 TESTED |
| 6.4 | Numbers | `bigint` overflow, `numeric`, CHECK constraints | S6.4 (E1 erosion) |
| 6.5 | Histories and anomalies | Lost update, write skew, read skew | — |
| 6.6 | Isolation in Postgres | Reproduce with two connections on the Bench, replay in Theater | S6.2 lost update, S6.3 write skew at REPEATABLE READ |
| 6.7 | SERIALIZABLE and retries | Serialization failures; retry loops; does retrying terminate? | C6.2 |
| 6.8 | The refinement relation | Define `R(S, D)`; check the simulation square in tests | C6.3 |
| 6.9 | What tests establish | Write the TESTED card honestly | — |

**Bench lab L6 — pg-refinement (Rust):** compiler to SQL, `proptest`
differential harness, concurrent-history recorder, retry policy, `R(S,D)` checker.

**Audit cases:** A6.1 20k differential runs presented as a proof (test-as-proof) ·
A6.2 harness compares only balances, not error results (observer) ·
A6.3 SERIALIZABLE claimed but the pool sets READ COMMITTED (drift) ·
A6.4 sound — accept.

**Viva:** what differential tests establish and can't; four SQL semantic
mismatches; the definition of R and what one simulation step checks.

### Course 07 — Secrecy · Datalog, Alloy, Z3

*Authorization and information-flow claims.* Theory: RBAC/ABAC/ReBAC,
Datalog, noninterference, observational equivalence, declassification,
hyperproperties. Reading: Soufflé tutorial; Alloy.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 7.1 | Access models | Users, teams, roles, documents, sharing in Plinth | — |
| 7.2 | Policy as Datalog | Read policy; generate the access matrix | C7.1 |
| 7.3 | Checking policies | "No cross-tenant read" as a query and as an Alloy assertion | C7.2 CHECKED scope n |
| 7.4 | Alloy instances | Scope, instances, why small scopes find most bugs | — |
| 7.5 | Enforcement vs noninterference | A check on every read vs no influence across runs | — |
| 7.6 | Observers and equivalence | Paired states differing only in tenant B's private data; self-composition | C7.3 |
| 7.7 | The leaky shared document | Deliberate bug; then declassify on purpose and write down what is released | S7.1 leaky field (E3), S7.2 count side-channel |
| 7.8 | Revocation and the past | Why revocation can't unsee; stating it temporally | S7.3 |

**Bench lab L7 — authz-flow:** Soufflé policy, Alloy model, paired-state Z3
checks for one API view.

**Audit cases:** A7.1 every endpoint calls `can_read` (enforcement offered
as noninterference) · A7.2 observer = JSON body, ignores response size and
timing (observer) · A7.3 "no tenant can ever observe any change" claimed
(requirement — false by design: sharing is declassification).

**Viva:** formulate the observer and equivalence relation; name what is
deliberately declassified; refute the blanket "no tenant ever observes"
claim with a legitimate feature.

**Technical note 3** due.

### Course 08 — Effects · TLA+ and deterministic simulation

*Reliable external effects under crashes.* Theory: asynchronous machines,
durable obligations, crash consistency, idempotency, at-least-once,
environment assumptions. Reading: advanced Learn TLA+; industrial examples list.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 8.1 | Commits are not sends | Separate recording intent from performing effect | — |
| 8.2 | The outbox, modelled | Command → Outbox → Worker → External → Ack | — |
| 8.3 | Every crash window | Theater: crash between every pair of steps, systematically | S8.1 double charge (E4), S8.2 lost effect |
| 8.4 | Duplicates and idempotency | Keys; whose idempotency you are trusting | C8.1 |
| 8.5 | Progress needs recovery | Which liveness holds only if the service eventually comes back | C8.2 ASSUMED-recovery |
| 8.6 | Deterministic simulation | Seeded simulator replays the same transitions with injected faults | C8.3 |
| 8.7 | Exactly-once is a pair | The claim belongs to you + the provider; write it that way | — |

**Bench lab L8 — effects-sim:** TLA+ spec with crash/duplicate/delay actions
and a Rust deterministic simulator whose traces replay in the Theater.

**Audit cases:** A8.1 "exactly-once via outbox" (assumption) · A8.2 retries
with a fresh idempotency key per attempt (drift) · A8.3 liveness checked
with crashes disabled (bounded/assumption).

**Viva:** walk every crash window; explain at-least-once duplication;
say when the provider's idempotency implementation joins the trusted base.

### Course 09 — Preservation · compiler correctness in Lean

*A translation that provably preserves meaning.* Theory: forward simulation,
bisimulation, observational equivalence, refinement, translation validation,
TCB. Reading: CompCert overview; Lean 4 Metaprogramming, selectively.

| # | Lesson | You do | Leaves |
|---|---|---|---|
| 9.1 | Why compilers need proofs | CompCert, Csmith, what "verified compiler" covers | — |
| 9.2 | A target IR | Plinth IR: reads, writes, asserts, aborts | — |
| 9.3 | Compile | Mini-Plinth subset → IR | — |
| 9.4 | Observations | Choose what is observable; observational equivalence | — |
| 9.5 | Forward simulation | The matching relation and the simulation diagram | — |
| 9.6 | Prove it | Semantic preservation for the fragment | C9.1 |
| 9.7 | The bad optimisation | Hoist a write above its guard; the proof breaks; extract the counterexample | S9.1 (E5) |
| 9.8 | Translation validation | Check each generated SQL plan instead of the compiler | C9.2 |
| 9.9 | Draw the TCB | Every unverified piece of the executable system, named | — |

**Bench lab L9 — plinth-compiler:** compiler + preservation proof + a narrow
validator for generated Postgres transactions.

**Audit cases:** A9.1 preservation proved with an observer that ignores
aborts · A9.2 validator checks shape, not semantics · A9.3 sound — accept.

**Viva:** describe the refinement relation, its abstraction boundaries, and
what remains unverified; keep apart "the command preserves invariants",
"the compiler preserves meaning", and "the runtime follows the target".

**Technical note 4** due.

### Course 10 — Assembly · Plinth Core (capstone)

| Step | Build | Gate |
|---|---|---|
| 10.1 | Parser + typechecker for the toy syntax | Golden tests vs Course 03 AST |
| 10.2 | Reference interpreter as oracle | Matches Lean `#eval` exports |
| 10.3 | SMT obligations with counterexample replay | Every REFUTED replays in the interpreter |
| 10.4 | Postgres compiler + transaction runtime with retries | Course 06 differential suite passes |
| 10.5 | Systematic testing: differential + deterministic simulation | Seeds recorded; failures become specimens |
| 10.6 | **The demonstration**: an agent proposes a plausible transfer or authorization command; the checker shows a violation (or a restricted obligation proved); the corrected command runs on Postgres | Recorded end-to-end |
| 10.7 | **Publish**: operational semantics, theorem statements, specimens, tool versions, known limitations; the assurance report exported from the Ledger | The **Defence**: a final viva over the report |

---

## 4. Product architecture

Local-first, no server, same promise kernelspace makes: everything runs in
the browser, progress lives in IndexedDB and is exportable. The difference is
the centre of gravity: the Bench (local repo + real tools) is authoritative;
the browser holds instruments, the Ledger and the Cabinet.

```
src/
  content/courses/<c00..c10>/<slug>.ts   typed lesson data
  content/audit/<A1.1..>.ts              audit cases + answer keys
  content/specimens.ts                   expected specimens per course
  content/claims.ts                      claim templates per lab
  instruments/                           z3 worker, interpreter, explorer, pglite, datalog
  ledger/                                claims, stamps, seams, erosion, report export
  cabinet/                               specimens, minimise, re-find queue
  judgment/                              call records, Brier, reliability
  bench/                                 receipt schema, import, validation
  pages/                                 Elevation, Course, Lesson, Bench, Theater, Audit, Cabinet, Ledger, Notes, Shelf
labs/                                    plinth-lab template + `plinth` CLI (never ships solutions)
scripts/verify-*.ts                      build gates (below)
```

**Lesson blocks** (new union; not kernelspace's): `prose`, `margin`,
`instrument` (`z3 | interp | explorer | pglite | datalog`), `callit`,
`goal-replay`, `derivation`, `theater`, `claim` (mints a claim template),
`specimen-drawer`, `prequestion`, `audit-ref`, `viva`, `drawer` (collapsed
theory, opened by repeated misses).

**Receipt schema** (abridged): `{ lab, version, tools: {name, version}[],
checks: {id, pass}[], lean?: {theorem, axioms[], sorry}[], tlc?: {spec,
constants, states, depth, result}[], hashes, tcb: string[], at }`.

**Build gates** — the course's own claims, each with its stamp on an
"About this course's assurance" page:

| Gate | Checks | Stamp |
|---|---|---|
| `verify:calls` | every authored Call It answer reproduced by the instrument | CHECKED |
| `verify:specimens` | every authored specimen still reproduces | CHECKED |
| `verify:interp` | TS interpreter matches Lean golden exports | TESTED (n = golden count) |
| `verify:audit` | every audit case has a key, a gap class, and a demonstrating specimen or a soundness argument | CHECKED |
| `verify:labs` | template fails, private solution passes, in CI | TESTED |
| `verify:links` | every claim/specimen/lesson reference resolves | CHECKED |
| Viva rubrics | human-authored | ASSUMED |

---

## 5. Build phases

| Phase | Scope | Exit |
|---|---|---|
| **P0 — Slice** | Design system, Elevation, lesson engine, Z3 instrument, Call It, Cabinet, Ledger; Courses 00–01 complete; Bench L1 + receipts | A learner can do Project 00 end-to-end and export a ledger with real claims and specimens |
| **P1 — Proof** | Goal Replay, Lean bench lane, Courses 02–03, golden-tested TS interpreter, Viva | C2/C3 claims minted from receipts with axiom lists |
| **P2 — Obligations + Audit** | Derivation Board, Course 04, Audit Desk with A1–A4 | Precision/recall scoring live |
| **P3 — Time** | Theater + explorer + TLC trace import, Courses 05 and 08 | Erosions E2, E4 fire |
| **P4 — Correspondence** | PGlite instrument, Course 06, history replay | E1 fires from a real Postgres run |
| **P5 — Secrecy** | Datalog instrument, paired-state views, Course 07 | E3 fires |
| **P6 — Preservation + Assembly** | Course 09, Course 10, assurance report export, Defence | A complete published Plinth Core report |

P0 alone is a usable product: the first weekend of the roadmap, done well.

---

## 6. Sources

Z3 guide (Python) · Natural Number Game · Theorem Proving in Lean 4 ·
Functional Programming in Lean · Harper, PFPL · Software Foundations, PLF ·
Learn TLA+ · Hillel Wayne's TLA+ examples list · PostgreSQL transaction
isolation docs · Soufflé tutorial · Alloy · CompCert · Lean 4 Metaprogramming.
URLs as given in the roadmap; pin versions in `labs/TOOLS.md` at build time.
