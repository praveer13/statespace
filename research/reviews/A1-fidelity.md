# A1 — Roadmap fidelity and platform alignment: adversarial review of PLINTH v1 (pass 3)

**Lens.** Does v1 honour the user's roadmap line by line: all ten stages, every project and completion test, the first weekend, the learning rules, the deferral list, end-state (a)–(g) and the user's added instructions? And does it build the skills that Plinth, the roadmap's organizing problem (RM:6), needs?

**Reviewed:** 2026-10-21 (the task is dated 2026-10-20). **Status:** adversarial review, not an endorsement.

**Supersedes** the 23:08 draft at this path, which had the same lens. §8 lists what changed. In brief, this pass:
- re-fetched every load-bearing external fact;
- fixed one citation and one framing error;
- hands four correctness items to the lenses that own them;
- adds six new findings or extensions.

**Under review:**
- `docs/history/v1/PLAN-v1.md` (643 lines);
- `docs/history/v1/DESIGN-v1.md` (130 lines);
- the six canvas artboards `design/canvas/{Main,Elevation,Lesson,Theater,Audit,Ledger}.dc.html`.

**Source of truth:** `research/context/roadmap.md` (**RM**).

**Alignment targets:**
- **Plinth, the roadmap's organizing problem (RM:6):** only what the roadmap names or implies, and public sources.
- **100X:** `context/kernelspace-PLAN-100X.md` and its dossiers.
- The sibling plans (byzantine, tablespace).
- This session's dossiers: R2 (AI and formal verification), R5 (authorization, compilers, assurance) and L4 (persistence).

**Other lenses:** A2 correctness, A3 pedagogy, A4 journey, A5 feasibility and A6 world-class. This review cross-references them and does not repeat them.

**Citations** are `file:line`.

**Tags:**
- **[verified]**: fetched by me on 2026-10-21 (§7);
- **[verified-R2/R5/L4]**: verified in that dossier and not re-fetched;
- **[derived]**: computed here from cited inputs;
- **[estimated]**;
- **[unverified]**.

---

## 0. Verdict in plain words

**What v1 gets right, and should keep.**
- **The roadmap's skeleton survives intact.** All ten stages are in order, and every stage project, adversarial exercise and completion test appears somewhere (§1).
- **The learning rules have homes:**
  - the six-field Claim (rule 3);
  - the Specimen Cabinet, plus `broken/` kept beside `fixed/` (rule 2);
  - a Requirement field that can never be PROVED, plus gap class 12 (rule 4);
  - notes after 02, 05, 07 and 09 (rule 5).
- **The deferral list is respected.** Nothing deferred is taught, and the Shelf makes the restraint visible.
- **Several choices already meet the roadmap's own tests:**
  - v0 has no loops (PLAN.md:370), so Stage 4's obligations stay within the assignments and conditionals that RM:65 names;
  - the specimen label (*violates / because / cured by*) keeps each broken example beside its fix (rule 2, RM:122);
  - a timeout is never a proof (audit case A1.3), as RM:40's precise reading of `unknown` requires;
  - an access matrix (7.2), as RM:86 asks;
  - per-run translation validation of SQL (9.8), as RM:106 asks;
  - "exactly-once is a pair" (8.7), which is the point of RM:97 and :99.
- **The Main artboard states hold resolution correctly as liveness,** `□(held ⇒ ◇(captured ∨ released))`, the distinction RM:72 tests.

**Where it fails.**
1. **It cannot tell the learner's judgment from their agent's (F1).** The roadmap exists to build exactly that judgment (RM:6, rule 6), and this learner builds with agents every day.
2. **Stage 6's concurrency project cannot run as designed (F2).** Two of its three planned anomalies cannot arise from v1's own model; one is stamped falsely on an artboard; and the refinement check would misread valid SERIALIZABLE histories.
3. **Mini-Plinth is a transfer toy, not a seed of Plinth Core (F3).** Balances are assigned rather than moved (RM:54), holds live only in TLA+, and a step produces no observations or effects (RM:86, :97). The "world" is a metaphor (F4).
4. **Reasoning moves that the roadmap's later stages and report levels (RM:113) need are missing:**
   - why per-command proofs survive concurrency, and enforcement at commit (F5);
   - information-flow reachability, query containment, RLS and the "new enemy" problem (F6);
   - sans-I/O machines, trace validation and inductive invariants (F7);
   - the Lean oracle and a Rust translation validator (F8);
   - idempotent commands (F9);
   - timeouts as durable obligations, reply guards and the provider's idempotency horizon (F10).
5. **It distorts the roadmap in places:**
   - Course 00 comes before the first weekend (F13);
   - E1 runs the refinement direction backwards (F14);
   - E4 contradicts Stage 5 (F16);
   - there is no time budget, and agent-written work arrives before the course can review it (F12).

**A caveat from the roadmap itself (RM:6).** "Plinth is the organizing problem, not … a commitment to a fixed architecture." So align with the **semantic core** that the roadmap names: resource moves and holds (RM:54, :70), commands and effects (RM:95), observations (RM:86, :104) and report levels (RM:113). **Don't** align with topics the roadmap defers (RM:118), such as Cloudflare topology and mobile attestation. And use the course to **audit** design claims (F11), not to assume them.

None of this needs a redesign. Most fixes swap one lesson, or change the running example so that every stage builds toward Plinth Core.

---

## 1. Line-by-line roadmap trace

Legend: ✓ honoured · △ partial or distorted · ✗ missing or contradicted.

### 1.1 Purpose, approach, tools, progression (RM:5–22)

| Roadmap item | v1 | Verdict | Note |
|---|---|---|---|
| Goal: semantics, obligations, counterexamples, evaluating agent output, what a proof does and doesn't establish (RM:6) | PLAN.md:5–8 | ✓ / △ | Restated faithfully. Evaluating agent work is untested on the learner (F1). |
| "Plinth is the organizing problem" (RM:6) | PLAN.md:53, "Plinth itself" as the world | △ | The semantics never grows toward Plinth Core (F3, F4) |
| 20% reading / 65% building / 15% documenting (RM:8) | PLAN.md:13 | △ | Stated, never budgeted (F12) |
| One evolving `plinth-lab` repo; keep broken examples (RM:8) | PLAN.md:155–159, 262 | △ | One directory per course; whether labs build on each other is unspecified (F8) |
| "Study only the material needed to make the next artifact work" (RM:8) | Course 00 | ✗ | Six theory lessons come before the first artifact (F13) |
| Tools in order: Z3Py, Lean 4, interpreter, TLA+, Postgres/Rust, "Soufflé **or** Alloy" (RM:10) | PLAN.md:66–78 | △ | Stage 7 uses Soufflé, Alloy *and* Z3 (F6). The CLI is Python (F8). |
| 9–18 months at 6–10 h/week (RM:10) | PLAN.md:12 | △ | No arithmetic behind it (F12) |
| Progression 1–10, including "9. Lean/Rust" (RM:13–22) | PLAN.md:66–78 | △ | Course 00 is inserted (F13). Course 09 is "Lean 4" only (F8). |

### 1.2 Stages

**Stage 1 — Find a bug mathematically** (RM:24–40)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Theory and resource (Z3Py guide) | 1.1–1.5 | ✓ | |
| Overdraft → guard → conservation, double capture, buggy refund | 1.2–1.4, L1 (PLAN.md:299–307) | △ | "Double capture" comes before any capture semantics exists (F3) |
| Starter code | Lesson artboard | △ | The in-browser cell is a JS shim, not Z3Py (F18) |
| Completion: negation; sat, unsat and unknown; dependence on the encoding | 1.1–1.5; viva PLAN.md:313–315 | ✓ | A2-F7 covers how `unknown` is taught |
| Time: "2–4 focused sessions" | Course 01: 5 lessons, L1, 3 audit cases, a viva | △ | About 9–12 h against the first weekend's 3–5 h [estimated] (F12) |

**Stage 2 — Prove a small program correct** (RM:42–47)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| "Start with Natural Number Game", then *Theorem Proving in Lean 4* (TPIL) ch. 3–5 and 7–8 | NNG is a checkpoint at 2.4 (PLAN.md:330) | △ | Order slip (F20) |
| Theory includes dependent types and the trusted kernel | 2.2–2.9 | △ | TPIL ch. 2, "Dependent Type Theory", is outside the reading [verified]; 2.9 is good, but see F1 and A2-F3 |
| Project: conservation, non-negativity, unchanged on rejection, sequences, finite maps | 2.5–2.8, L2 | ✓ / △ | The finite-map step assigns balances rather than moving them (F3) |
| Completion: no `sorry`; explain without tactics; kernel ≠ intent | 2.9–2.10, viva | ✓ | `#print axioms` alone is no longer the standard for un-reviewed AI proofs (F1) |

**Stage 3 — Invent Mini-Plinth** (RM:49–56)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Typed AST of entities, expressions, commands, guards and **resource operations** | 3.1: `Expr, Guard, Cmd, Entity` (PLAN.md:363) | △ | No resource operations (F3) |
| Evaluator or transition relation with explicit errors | 3.3–3.4: `Except PlinthError State` (PLAN.md:365) | △ | No observations or effects (F3) |
| Invariant of successful steps; an unsafe command | 3.6, 3.9 | ✓ | |
| Completion: zero, self-transfer, failed guard, overflow, from the semantics alone | 3.7 | ✓ / △ | Overflow should be an explicit error (F14); negative amounts are missing (A2-F21) |

**Stage 4 — Build a verification-condition generator** (RM:58–65)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Hoare logic, weakest preconditions (WP), substitution | 4.1–4.3, Derivation Board | ✓ | |
| Symbolic execution; soundness of the SMT encoding | 4.5 | △ | Symbolic execution is never taught (F20) |
| `miniplinth check` with the obligation `Inv ∧ Guard ∧ Step ∧ ¬Inv′` | 4.4–4.6 (PLAN.md:396–398) | ✓ | No implementation language is given (F8) |
| Miscompile on purpose; solver correctness vs VCGen correctness | 4.7–4.8 | ✓ | C4.3, "VCGen soundness in Lean", goes beyond the stage (F20) |
| Completion: derive assignment and conditional obligations by hand | Derivation Board | ✓ | |

**Stage 5 — Concurrency and temporal behaviour** (RM:67–72)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Read-then-write double spend, then make the step atomic | 5.2–5.3 | ✓ | |
| Holds with timeouts, duplicate replies, **crashes, restarts** and competing resolution | 5.4–5.5 (PLAN.md:423–424) | △ | E4 and the Ledger's "no crash" contradict it (F16) |
| Completion: safety vs liveness; fairness; bounded ≠ proof | 5.6–5.8 | ✓ | |

**Stage 6 — Connect semantics to PostgreSQL** (RM:74–81)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Compile transfers into transactions | 6.2 (PLAN.md:452) | ✓ | It compiles to the one form that cannot race (F2) |
| Run the same random commands in *your* abstract interpreter and in Postgres | 6.3 | △ | Which interpreter is unspecified, and it isn't the Lean semantics (F8) |
| Reproduce write skew or read-modify-write races with concurrent connections | 6.6 (PLAN.md:456) | ✗ | Neither arises from v1's model (F2) |
| SERIALIZABLE and retries, "tracking how they affect behavior" | 6.7 | △ | Only 40001, and nothing is tracked (F9) |
| R(S, D) and the simulation square | 6.8 | △ | Concurrent histories need a serial-order search (F2). E1 blurs the direction (F14). |
| Completion: NULL, bags, overflow, serialization failures | 6.1, 6.4, 6.9 | △ | The NULL traps that defeat enforcement are missing (F5). Overflow is muddled (F14). |

**Stage 7 — Access control and information flow** (RM:83–90)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Theory: RBAC/ABAC/ReBAC, Datalog, noninterference, declassification, hyperproperties | 7.1–7.8 | △ | No hyperproperty framing; gap class 3 lacks it (F6) |
| Users, teams, roles, documents, sharing | 7.1 | ✓ | Generic documents (F4) |
| Access matrix | 7.2 | ✓ | |
| Pairs of states that differ only in another tenant's data | 7.6 | △ | PLAN puts this in Z3; the Ledger artboard puts it in Alloy (F6) |
| Leaky shared field; revocation; enforcement vs noninterference | 7.7, 7.8, 7.5 | ✓ / △ | No new-enemy ordering and no RLS (F6) |
| Completion: observer, equivalence, declassification, the false blanket claim | viva (PLAN.md:497–499) | ✓ | Point it at the learner's own design (F11) |

**Stage 8 — External effects and crash recovery** (RM:92–99)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Command → outbox → worker → external → ack | 8.1–8.2 | ✓ | |
| A crash between every pair of steps; duplicated and delayed replies | 8.3–8.4 | ✓ / △ | Replies are applied without a guard (F10) |
| "**Prove** safety properties over the model" | TLC only | △ | No inductive invariants (F7) |
| Progress needs recovery or external idempotency | 8.5, 8.7 | ✓ / △ | The provider's idempotency horizon is missing (F10) |
| A deterministic simulator replaying "the same state-machine transitions" | 8.6, L8 | △ | A visual replay, not a conformance check (F7) |
| Theory: durable obligations | — | ✗ | No lesson on timeouts or periodic jobs (F10) |
| Completion: crash windows, duplication, the provider in the trusted base | viva | ✓ | |

**Stage 9 — Verify a compiler transformation** (RM:101–108)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Theory, including bisimulation | listed only (PLAN.md:531) | △ | (F20) |
| IR, preservation proof, bad optimisation | 9.2–9.7 | ✓ | |
| Narrow translation validation for Postgres | 9.8 | ✓ | No query containment (F6) |
| Keep three claims apart; draw the TCB | 9.9, viva | ✓ | |
| "Lean/Rust" (RM:21) | "Lean 4" (PLAN.md:77) | △ | (F8) |
| Lean 4 Metaprogramming | listed (PLAN.md:533) | △ | Never used (F20) |

**Stage 10 — Assemble Plinth Core** (RM:110–115)

| Item | v1 | Verdict | Note |
|---|---|---|---|
| Parsed, typed language; interpreter; SMT; counterexamples; Postgres compiler; runtime | 10.1–10.5 | ✓ / △ | The oracle is fixed golden exports (F8) |
| The agent demonstration | 10.6 | ✓ | |
| Report: proved, model-checked, runtime-enforced, assumed | 10.7, PLAN.md:115–118 | △ | The stamp vocabulary differs (F15) |
| Publish semantics, theorems, counterexamples, versions, limitations | 10.7 | ✓ | |

### 1.3 Deferrals, rules, first weekend, end-state, added instructions

| Roadmap item | v1 | Verdict | Note |
|---|---|---|---|
| Deferral list (RM:117–118) | Deferred Shelf (PLAN.md:251–255) | ✓ | Faithful. Two triggers are mis-set (F17). |
| Rule 1: theory only as needed; revisit "when the artifact exposes a gap" | PLAN.md:261 | ✗ | Course 00 front-loads theory, and drawers lock it behind misses (F13) |
| Rule 2: broken examples | Cabinet | ✓ | |
| Rule 3: six-part guarantee | Claim card | ✓ / △ | The flagship card's "If weakened" refutes a different proposition (F21; A2-F10) |
| Rule 4: Lean ≠ intent | 2.10, gap class 12, Requirement field | ✓ | |
| Rule 5: a note every 2–3 stages | after 02, 05, 07, 09 | ✓ | Nothing guards "in your own words" against agents (F1) |
| Rule 6: what you can **independently** reason about | PLAN.md:266 | ✗ | Every counted signal can be produced by an agent (F1) |
| First weekend comes first | L1 sits after Course 00 (PLAN.md:68, 305) | ✗ | (F13) |
| First-weekend checklist | L1, "verbatim" (PLAN.md:305–306) | ✓ / △ | The README fields and Z3Py don't match (F18) |
| End-state (a) state a property | throughout | ✓ | No unassisted measure (F1) |
| (b) safety, liveness, **information flow** | Courses 05, 07 | △ | No 2-safety framing (F6) |
| (c) derive and audit obligations | Course 04, Audit Desk | ✓ | |
| (d) proofs over semantics | Courses 03, 09 | ✓ | |
| (e) adversarial concurrent executions | Courses 05, 06, 08 | △ | Stage 6 is broken (F2) |
| (f) refinement to Postgres | 6.8, 9.8 | △ | Serial order, E1 and the oracle (F2, F14, F8) |
| (g) decide which claims are justified before trusting agent code | Audit Desk | △ | Three completion-test patterns have no case (F11); unmeasured unassisted (F1) |
| Outcome model for (a)–(g) | — | ✗ | No mapping from end-state to evidence (F1) |
| Same scope and quality as kernelspace: browser sims, Rust labs graded in-browser, persistent world, zero servers (RM:141) | instruments ✓; receipts; a "world" metaphor | △ | (F4, F8). No `llms.txt` or `AGENTS.md` (F1). |
| "Do not copy kernelspace" (RM:142) | A distinct UI and mechanics | ✓ | |
| Round 2: "highest-quality scientific evidence" (RM:143) | — | △ | v1 reverses three of kernelspace's evidence-based decisions: no BYOK grading, nothing locks, fresh items (F1, F13) |

---

## 2. Platform alignment (withdrawn)

This section is withdrawn. BRIEF §1.4 lists the generic concepts that the roadmap implies, and every finding below rests on roadmap lines (RM) and public sources.

---

## 3. Running example: where a domain in the roadmap's own nouns should replace the generic ledger, and where it shouldn't

**Principle.** Keep every roadmap project's *shape* and change only its *objects*. Switch at the point where the roadmap itself generalises. Keep the first contact generic where minimal syntax helps.

**Domain and naming.**
- The example application below is a generic multi-tenant credits application built only from the roadmap's own nouns: accounts and credits (RM:45), moves (RM:54) and holds (RM:70); users, teams, roles, documents and sharing (RM:86); and an external provider effect (RM:95, :99). A later digest adopted exactly this restriction (D22).
- Keep the roadmap's own "Mini-Plinth" and "Plinth Core", but don't brand the public course as the "broad Plinth platform" of RM:115.

| Stage | Keep generic | Switch to the example application (same roadmap project) |
|---|---|---|
| 1 Z3 | The first weekend exactly as RM:130–134 lists it (two balances) | Lesson 1.4: hold, capture and release as postings. Double capture, **capture > hold** (a capture larger than the hold drives the balance negative) and **refund > charge** become real counterexamples. |
| 2 Lean | Two accounts → finite map, as RM:45 says | The finite-map step becomes a **double-entry posting ledger** with `mint` and `sink` accounts. Theorems: every command's postings sum to zero; no non-mint account goes negative. Corollary: the roadmap's closed-transfer conservation. |
| 3 Semantics | The roadmap's `Transfer` toy syntax stays the first command | Add resource-operation nodes for the roadmap's moves and hold lifecycle (RM:54, :70), and commands that place, resolve and release a hold around an external operation. `step` also produces observations and effects as data (RM:86, :97). Decision records: available vs posted; overflow is an explicit error. |
| 4 Obligations | The Derivation Board on tiny assignments (`x := x − a`) | `miniplinth check` finds the unguarded reply (capture > hold) and explains the violating state (RM:61) |
| 5 TLA+ | The read-then-write two-worker scene (RM:70) | Capture, release and timeout race to resolve a hold (RM:70), with duplicate and late replies, crashes and restarts. Never resolves twice (safety) vs eventually resolves (liveness under fairness of the timeout schedule). |
| 6 Postgres | The NULL and bags lesson can stay abstract | A postings table. **Write skew** at REPEATABLE READ from guard-on-SUM-then-INSERT; 40001 at SERIALIZABLE; `SUM` of no rows is NULL; idempotent commands; deadlock on opposite two-row moves (F2, F5, F9). |
| 7 Secrecy | The access-model vocabulary | Team, member and role reads. A shared document whose query reveals a private field (the roadmap's deliberate bug). Noninterference with sharing as declassification. RLS. Revocation with the new-enemy ordering (F6). |
| 8 Effects | The roadmap's five-step outbox chain | The external effect and its guarded reply. A duplicated provider reply (RM:95), deduplicated by the provider's own id. A timeout or periodic job under crash (RM:93). The provider's idempotency horizon (F10). |
| 9 Compiler | IR design can stay generic | Compile the example commands to IR, then to SQL transaction plans, and validate each plan (RM:106) |
| 10 Capstone | — | Plinth Core runs the example application. The final systematic tests draw their cases from the gap taxonomy and the roadmap's own bugs (for example the double spend, a buggy refund rule, a duplicated effect, a cross-tenant read). |

---

## 4. Findings, ranked

Severity:
- **critical**: the course would fail its purpose or teach something false;
- **major**: significantly weakens learning or quality;
- **minor**: polish.

### F1 — critical — The course cannot tell the learner's judgment from their agent's: rule 6 and end-state (g) have no outcome model

**Evidence.**
- **What the roadmap asks:**
  - Its purpose includes evaluating "agent-produced implementations" (RM:6).
  - Rule 6: track "what you can now **independently** reason about" (RM:126).
  - End-state (g): decide which claims are justified "before trusting agent-written code" (RM:138).
  - This learner builds with coding agents every day.
- **What v1 counts:**
  - A course is "set" on a self-graded viva, or one graded by an optional BYOK Claude examiner (PLAN.md:243–247).
  - Receipts come from a CLI that is "not tamper-proof" (PLAN.md:166–168). The receipt schema has no statement pin and no provenance field (PLAN.md:602–604; A5-F2).
  - There are 32 fixed audit cases, whose answer keys sit in the content bundle (PLAN.md:215, 583).
  - Re-find re-presents the same specimen (PLAN.md:148–151).
  - Call It items are fixed and pre-verified (PLAN.md:130–133).
- **What is missing (grep of PLAN.md):** zero hits for `AGENTS`, `CLAUDE`, `llms`, `provenance` and `unassisted`. The family formula requires "llms.txt, per-lesson markdown, AGENTS.md in every lab zip" (kernelspace-NEXT-COURSES.md:25; tablespace-PLAN.md:64).
- **The predecessor decided the opposite, with evidence:**
  - provenance weights (100X:308–311);
  - a guardrail kit in every lab zip (100X:456–459);
  - a no-AI "Prove it" (100X:472–475);
  - "Same skill, new numbers" (100X:165);
  - it will not build "LLM-graded XP, rings or credentials" or an "In-page BYOK drawer" (100X:801–802);
  - keep AI vivas "formative, text-first and retryable, and never the sole basis of a credential" (kernelspace research/community.md:271).
- **The Lean manual's threat model [verified]:**
  - It treats "un-reviewed AI-generated proofs and programs" as malicious.
  - It says `#print axioms` only reveals the axioms used; it does not check the proof or whether the statement means what you intend.
  - It names `lake comparator` the gold standard. Comparator builds in a sandbox and checks the proved statements against a trusted challenge file.
  - Lean 4.35.0 (2026-10-12) added `lake check` and `--paranoid` runs of external checkers [verified].
- **Prompts don't stop gaming [verified-R2]:** METR found anti-cheat prompts had a "nearly negligible effect". An `AGENTS.md` file is advice, not evidence.

**Why it matters.** Everything v1 counts is something this learner's agents produce fluently: Lean proofs, TLA+ specs, audit findings and viva prose. A course set this way certifies the agent, which defeats the roadmap's purpose for exactly this learner.

**Recommendation.**
1. **Authorship split.** This turns the roadmap's Stage 10 demonstration (an agent proposes, the checker exhibits a violation; RM:113) into credit rules.
   - The learner writes propositions, invariants, temporal properties, R(S, D), observers and equivalence relations, and claim cards.
   - Agents may implement and prove.
   - Learner statements are pinned in a challenge file (`Claims.lean`, `claims/*.tla`). Receipts record statement hashes and replay with `lake check`, or comparator-style.
   - Any statement change voids the claim, so gap class 8 (drift) becomes mechanical. Receipt mechanics are in A2-F3 and A5-F2.
2. **Provenance on every ledger event:** `unassisted | assisted | agent-authored`, plus `fresh` when the item was generated after the attempt began. Only unassisted, fresh evidence sets a course or counts for rule 6. This is an honour system, framed as calibration, the way kernelspace frames Prove-it.
3. **Agent-native surfaces.**
   - Every lab zip ships `AGENTS.md`, `CLAUDE.md` and a PreToolUse hook that guards learner-owned files. This is friction, not DRM (100X H1).
   - The site ships `llms.txt` and keyless lesson markdown.
4. **Replace the BYOK grader with fresh-mutant vivas** (B2). The learner gets generated variants (a dropped guard, a swapped observer, weakened fairness, a missing frame), predicts the verdict and names the gap *before* any tool runs, then self-grades against the rubric. Vivas are formative and retryable.
5. **An end-state outcome model.** Each of (a)–(g) gets a family of fresh, unassisted tasks, scored at first success and again 30 or more days later (the VRK₃₀ idea, 100X:100). The Defence (10.7) samples from these families, not from authored prompts.

| End-state | Fresh, unassisted task (generated) | Instrument |
|---|---|---|
| (a) state a property | Formalise a generated rule about the example application. Graded by mutant discrimination: the formula must reject k bad states and accept the good ones. | Z3 |
| (b) safety / liveness / information flow | Classify generated properties, then produce the right witness: a finite trace, a lasso, or a pair of runs | Theater, Z3 |
| (c) derive and audit obligations | Derive a mutated command's VC by hand; find the planted VCGen fault | Derivation Board |
| (d) proofs over semantics | Predict which theorem breaks after a generated semantic change, and why | Goal Replay |
| (e) adversarial concurrency | Find a violating interleaving of a generated two-process variant | Theater |
| (f) refinement to Postgres | For a generated compiled command, predict whether R holds at READ COMMITTED, REPEATABLE READ and SERIALIZABLE, and produce the history | PGlite, Bench |
| (g) justified claims | Audit a generated "verified ✓" PR; scored by precision and recall | Audit Desk |

### F2 — critical — Stage 6's concurrency project cannot run as designed

Two of the three planned anomalies cannot arise from v1's own model, one is stamped falsely, and the planned refinement check would misread valid histories.

**Evidence.**
- **The roadmap:** "Reproduce write skew or read/modify/write races with concurrent connections", then R(S, D) for a *successful* DB transition (RM:77–79).
- **v1:**
  - It compiles a transfer as one guarded statement, `UPDATE … WHERE balance >= $1 RETURNING` (PLAN.md:452).
  - It then expects "S6.2 lost update, S6.3 write skew at REPEATABLE READ" (PLAN.md:456).
  - The Ledger artboard stamps "C6.2 Concurrent transfers serialise at READ COMMITTED — Refuted — 2 connections, 9 ms window — S6.2 lost update".
- **Lost update can't happen with that statement.** At READ COMMITTED, a blocked updater "will attempt to apply its operation to the updated version of the row. The search condition of the command (the WHERE clause) is re-evaluated" (PG 18.6 §13.2.1) [verified]. So a guarded relative debit neither loses an update nor overdraws. A2-F1 analyses the details.
- **Write skew needs a predicate v1's model doesn't have [derived].** Write skew needs a guard over rows the two transactions then write disjointly. PG's own SERIALIZABLE example is one transaction summing one class and inserting into the other (§13.2.3) [verified].
  - v1 has one balance row per account and a per-row non-negativity rule.
  - Every transfer writes the rows it reads, so conflicting transfers are write–write conflicts: blocked at READ COMMITTED, 40001 at REPEATABLE READ.
  - So nothing in v1's model is prone to write skew.
  - A **posting or hold table** is exactly the missing predicate: guard on SUM or available, then INSERT. That gives write skew at REPEATABLE READ and a serialization failure at SERIALIZABLE.
- **The refinement check would misread valid histories.** L6 has a "concurrent-history recorder" and an "R(S,D) checker" (PLAN.md:461–462), and 6.8 checks "the simulation square in tests" (PLAN.md:458). No order of replay is specified.
  - Under SSI, the apparent serial order need not match commit order [verified]. Ports & Grittner (PVLDB 2012) note that under two-phase locking and standard OCC "the commit order of transactions matches the apparent serial order", which is not true of SSI.
  - The PG wiki's Rollover example: "T1 appears to have executed first, since it saw row 2 without the change committed by T2", although T1 committed later.
  - So replaying committed commands in commit order would report false divergences on valid SERIALIZABLE histories.
- **No gate would catch any of this.** PGlite is single-connection (PLAN.md:182), and `verify:specimens` is stamped CHECKED (PLAN.md:612).

**Why it matters.** End-states (e) and (f) meet in Stage 6. As designed, the learner either cannot reproduce the roadmap's anomalies or is told something false about them, and the refinement check teaches the wrong idea of correspondence under concurrency.

**Recommendation.**
1. **Make the compilation strategy the variable in 6.6:**

| Variant | What happens |
|---|---|
| (a) Read-modify-write: SELECT, compute, UPDATE with a constant | **Lost update** at READ COMMITTED. At REPEATABLE READ, "could not serialize access due to concurrent update" (40001) [verified]. |
| (b) Guarded single-row UPDATE | Safe for one row at READ COMMITTED: TESTED, with a dashed field ASSUMED from §13.2.1 |
| (c) Postings: guard on `SUM`, then INSERT | **Write skew** at REPEATABLE READ; 40001 at SERIALIZABLE. This is the posting model's shape (F3), and the reason Stage 6 needs SERIALIZABLE (RM:77). |
| (d) Two-row moves in opposite directions | Deadlock (`40P01`) at any isolation level |

2. **Adopt the posting and hold model (F3),** so write skew comes from the course's own commands.
3. **Define the concurrent R(S, D) check as abstract serializability.** A set of committed commands and their outputs passes if *some* serial order, replayed through the Lean oracle, reproduces every output and the final state.
   - Search permutations for n ≤ 6–8, pruned by the observed dependencies.
   - Aborted attempts are stuttering steps.
   - Link byzantine's Porcupine-style checker (kernelspace-NEXT-COURSES.md:54). See B4.
4. **Run concurrency specimens in CI** against a pinned Postgres 18.x service with scripted two-session interleavings. Fail the build when an authored specimen stops reproducing.
5. **Re-stamp the artboard:**
   - "a read-modify-write transfer is safe at READ COMMITTED: REFUTED (S6.2)";
   - "a guarded single-row debit: TESTED (n interleavings) + ASSUMED §13.2.1".

### F3 — major — Mini-Plinth is not a seed of Plinth Core

Balances are assigned rather than moved (RM:54). Holds exist only in TLA+. A step produces no observations or effects (RM:86, :97).

**Evidence.**
- **What v1 has:**
  - closed-system conservation (PLAN.md:331–334; the Main artboard's `total (run σ ops) = total σ`);
  - an AST of `Expr, Guard, Cmd, Entity` (PLAN.md:363), although RM:52 asks for "resource operations";
  - an evaluator into `Except PlinthError State` (PLAN.md:365);
  - holds as a TLA+ lifecycle only (PLAN.md:423);
  - "double capture" in Course 01, before capture has any semantics (PLAN.md:302);
  - observations that first appear in 9.4 (PLAN.md:540).
- **The roadmap is already halfway there.** Its toy syntax moves an amount instead of assigning balances (`command … requires … do move …`, RM:54), and Stage 5 names the hold states Available, Held, Captured and Released (RM:70). Stage 7 needs "authorized observations" (RM:86), Stage 8 separates recording intent from sending an effect (RM:97), and Stage 9 needs "the same observations" (RM:104).

**Why it matters.**
- "The total is constant" is false once grants mint credits and captures burn them.
- `balance(account)` becomes ambiguous (posted or available?) exactly where a guard can go wrong.
- Stages 7–9 have to bolt observers and effects onto a semantics that has neither.

**Recommendation.**
- **Stage 2.** Keep two accounts → finite map, but make the generalisation a double-entry posting ledger:
  - state is a list of postings, and a balance is a sum;
  - commands emit postings that sum to zero, using `mint` and `sink` accounts;
  - prove the zero-sum and non-negativity theorems, with closed conservation (C2.x) as a corollary;
  - self-transfer becomes harmless by construction. Keep S2.1 to show the assignment version's bug.
- **Lesson 1.4.** Encode hold, capture and release as postings among available, held and sink.
- **Stage 3:**
  - make resource operations AST nodes, with a typing rule that forbids assigning to balance fields directly, so conservation becomes a well-formedness property;
  - type amounts as a refinement, `{n : Int // 0 < n}`. This doubles as the dependent-type example Stage 2 lacks;
  - add a decision record on available vs posted balance;
  - let a step return observations and effects as data, never executing an effect inside a step, so recording intent stays separate from sending (RM:97).
- **Production twin:** TigerBeetle's two-phase transfers [verified]:
  - a pending transfer "reserves its `amount`" in the `debits_pending` / `credits_pending` fields;
  - a partial post restores "the remainder … to its original accounts";
  - a void restores the pending amount;
  - on timeout "the full amount is returned to the original account".

### F4 — major — The running example and the "world" are generic

The family's persistent simulated world with calibrated adversarial scenarios is missing, and the roadmap's own projects supply both.

**Evidence.**
- **Objects:** two balances, a toy counter, `Account`, generic documents (PLAN.md:282–287, 299–303, 358–359, 480).
- **World:** "Plinth itself: one evolving language…" (PLAN.md:53). That is a set of artifacts, not a world.
- **The family formula:**
  - "A persistent world — student components plug in cumulatively and run against shared deterministic traffic";
  - "Calibrated adversarial scenarios" (kernelspace-NEXT-COURSES.md:19–22; tablespace-PLAN.md:58–61).
  - The user asked for kernelspace's scope, including a "persistent world" (RM:141).
- **The roadmap already provides both:**
  - a domain: accounts and credits (RM:45), holds (RM:70), users, teams, roles, documents and sharing (RM:86), and an external provider (RM:95, :99);
  - a catalogue of bug classes: a double capture and a buggy refund rule (RM:27), the read-then-write double spend (RM:70), a shared document query that reveals a private field (RM:88), and a crash between any two outbox steps (RM:95).

**Recommendation.** Adopt the example application (§3) as both the running example and the world.
- **Plug-ins, course by course:** the Lean oracle, the interpreter, the checker, the SQL compiler, the outbox machine, the policy.
- **Seeded adversarial traffic:** concurrent requests, late and duplicated replies, crashes, revocations, cross-tenant probes.
- **Incidents:** generated from the bug classes.
- **Calibration:** by seeded mutants.
- **Domain and naming:** follow §3.

### F5 — major — Runtime enforcement, and why per-command proofs survive concurrency, are untaught

The roadmap's report separates proved from runtime-enforced properties (RM:113). Per-command proofs need a composition theorem to survive concurrency, and enforcement at commit has no lesson.

**Evidence.**
- **The roadmap:**
  - Stage 4 derives one command's obligation at a time (RM:61);
  - Stage 6 runs commands under SERIALIZABLE, with retries (RM:77);
  - Stage 10's report distinguishes proved from runtime-enforced properties (RM:113).
- **v1 has the pieces but never connects them:**
  - Course 04 proves invariants per command; 5.3 makes a step atomic; 6.7 uses SERIALIZABLE.
  - ENFORCED is a stamp (DESIGN.md:41), but no lesson builds an enforcement path. 6.4 names only CHECK constraints (PLAN.md:454).
- **PostgreSQL 18.6 states the composition principle [verified]:**
  - "any concurrent execution of a set of Serializable transactions is guaranteed to produce the same effect as running them one at a time in some order";
  - "if you can demonstrate that a single transaction, as written, will do the right thing when run by itself, you can have confidence that it will do the right thing in any mix of Serializable transactions … or it will not successfully commit" (§13.2.3);
  - it holds "If the Serializable transaction isolation level is used for all writes and for all reads which need a consistent view", but "does not yet extend to hot standby mode … or logical replicas" (§13.4.1);
  - "any data read … not be considered valid until the transaction which read it has successfully committed" (§13.2.3).
- **NULL traps [verified]:** a CHECK "is satisfied if the check expression evaluates to true or the null value" (§5.5), and "`sum` of no rows returns null, not zero" (§9.21).
- **The documented behaviour has failed before [verified]:** Jepsen found G2-item under SERIALIZABLE in PostgreSQL 12.3 and earlier (2020-06-12).

**Why it matters.**
- Without the composition theorem, the learner can believe that per-command obligations imply safety at any isolation level. That is exactly the belief write skew refutes (F2).
- Without an enforcement lesson, RM:113's runtime-enforced level is taught as a stamp, not as a mechanism.

**Recommendation.**
- **New lesson, "Why per-command proofs survive concurrency"** (late Course 05 or early 06):
  - A Lean lemma: if each command preserves Inv when run alone, every serial execution preserves Inv. This reuses Stage 2's list induction.
  - Stamp the system claim PROVED (the serial lemma) plus ASSUMED "all writers are SERIALIZABLE on the primary" and "PG's SERIALIZABLE behaves as documented".
  - F2's snapshot-isolation counterexample shows that the assumption carries weight.
  - Seams to plant:
    - replicas fall outside the guarantee;
    - the 2020 Jepsen bug is why "as documented" is a seam;
    - effects are only acted on after commit, which is the reason for Stage 8.
- **New lesson, "Enforced at commit":**
  - Compile `balance(account) ≥ 0` into a deferred constraint trigger, or into a pre-commit check over the postings delta.
  - Show that the delta check equals the full invariant, given the invariant held before. This is Course 04's inductive obligation again, either PROVED or TESTED.
  - Make S6.1 concrete: "SUM over a new team's postings is NULL; the CHECK passes". The cure is `COALESCE` or `NOT NULL`.
  - Teach what a solver `unknown` means (RM:40): the static claim is UNKNOWN, never PROVED.

### F6 — major — Stage 7 misses checks its own project calls for, and never enforces its policy in the database

**Evidence.**
- **The roadmap:**
  - its progression line is "7. Datalog/SMT" (RM:19);
  - its tools line says "Soufflé **or** Alloy" (RM:10);
  - Stage 7 lists both as resources (RM:84);
  - its deliberate bug is a shared document query that reveals a private field, it explores revocation, and it asks to distinguish enforcement of a permission check from noninterference (RM:88).
- **v1:**
  - uses Soufflé, Alloy and Z3 (PLAN.md:75), with an Alloy lesson (7.4, PLAN.md:483) and an Alloy model in L7;
  - PLAN puts the paired-state checks in Z3 (PLAN.md:489–490), but the Ledger artboard's C7.3 says "Alloy, paired states";
  - 7.4 states "why small scopes find most bugs" as fact. Jackson presents it as the "small scope hypothesis" and notes the analysis "can't prove theorems" [verified].
  - Gap class 3 covers only safety and liveness (PLAN.md:227), although end-state (b) names information flow (RM:138).
- **Absent from v1:** information-flow reachability, containment, RLS (grep: 0) and the new-enemy ordering.
- **[verified] facts the recommendation rests on:**
  - Soufflé's `-t explain` prints proof trees that are "of _minimal height_".
  - Zanzibar's **new enemy** (Pang et al., USENIX ATC 2019): "Alice removes Bob from the ACL of a document; … Charlie [adds] new contents … Bob should not be able to see the new contents, but may do so if the ACL check is evaluated with a stale ACL".
  - PostgreSQL RLS:
    - owners bypass it unless `FORCE ROW LEVEL SECURITY` is set; `BYPASSRLS` always bypasses it;
    - with no policy, it defaults to deny;
    - integrity checks bypass it, so "covert channel" leaks are possible (§5.9).

**Recommendation.**
- **7.x "Information flow as reachability"**, in Soufflé.
  - Example rule: `leak(f,u) :- shows(q,f), private(f), can_run(u,q), !may_read(u,f).`
  - Proof trees explain each counterexample.
- **Noninterference in Z3**, via a product program emitted by the learner's own Course 04 VCGen (self-composition; Barthe, D'Argenio & Rezk, CSFW 2004, doi:10.1109/csfw.2004.1310735).
  - The equivalence relation: equal on A's observation, modulo declassified (shared) data.
  - Extend gap class 3 to "safety / liveness / hyperproperty (2-safety)".
- **7.y "Is the generated query inside the policy?"** Containment for the select-project-join fragment (Chandra & Merlin, STOC 1977, doi:10.1145/800105.803397). Then break it with NULL.
- **RLS lesson.** Compile the read rule to `CREATE POLICY`, then differential-test it against the Datalog or Lean oracle on PGlite. Specimens:
  - an owner bypass without FORCE;
  - a unique-constraint covert channel: paired states that differ only in B's private names change the outcome of A's INSERT.
- **7.8 revocation.** Add the new-enemy ordering, with a stale-replica specimen. This ties to F5's replica seam and to byzantine.
- **ABAC** (RM:84). Keep attributes abstract, as opaque inputs to the policy; mobile attestation stays deferred (RM:118).
- **Demote Alloy to an optional drawer.** The roadmap's "or" permits choosing one. Restate 7.4 as a hypothesis.

### F7 — major — Course 08 neither checks its simulator against the model nor meets the roadmap's "prove"

**Evidence.**
- **The roadmap:**
  - "Prove safety properties over the model" (RM:95);
  - a simulator "capable of replaying the same state-machine transitions" (RM:97);
  - "bounded exploration is not an unqualified proof" (RM:72).
- **v1:**
  - uses TLC only (PLAN.md:430–431, 519–520);
  - its simulator traces "replay in the Theater" (PLAN.md:519–520), which is a visual replay, not a conformance check;
  - has zero hits for sans-I/O, trace validation, Stateright or Apalache.
- **[verified] tools and results:**
  - Cirstea, Kuppe, Loillier & Merz (arXiv:2404.16075, v2 2024-09-17) reduce trace validation to "a constrained model checking problem, realized using the TLC model checker", "detecting discrepancies … in all cases".
  - Apalache v0.62.4 (2026-10-12) documents the IndInit, IndNext and IndProp runs.
  - Stateright is at 0.31.0.
  - In SysMoBench, LLM-written models "imitate classic TLA+ models … missing important system-specific content".

**Recommendation.**
- **L8:**
  - The outbox worker is a sans-I/O Rust state machine, `step(&mut self, ev) -> Vec<Action>`. This is the shape of byzantine's `on_msg` (byzantine-PLAN.md:84).
  - The simulator logs spec-variable updates, and TLC validates every trace. The claim is "simulator traces ⊆ spec behaviours — TESTED (n traces)".
  - Plant a drift only trace validation catches: the worker marks an effect dispatched before sending it.
  - Optional: model-check the same machine in Stateright.
- **8.y (or an extension of 5.8), "Inductive invariants":**
  - Strengthen "a hold never resolves twice" until it is inductive, then run IndInit, IndNext and IndProp.
  - Stamp the result MODEL-CHECKED (inductive, for fixed constants and types). It becomes PROVED only through TLAPS or Lean (stretch).
  - Say explicitly that this is the same obligation as Course 04's per-command check.

### F8 — major — The labs drop the roadmap's Rust and the family's in-browser grading, and the Lean semantics is never the executable oracle

**Evidence.**
- **The roadmap:** "Postgres/Rust" (RM:10); "9. Lean/Rust" (RM:21); "a reference interpreter" in Plinth Core (RM:111); "Rust labs graded in-browser" (RM:141).
- **v1:**
  - a Python `plinth` CLI (PLAN.md:157) whose receipts the site imports (PLAN.md:160–168);
  - Course 09 uses "Lean 4" only (PLAN.md:77);
  - Course 04's checker has no implementation language (PLAN.md:398);
  - a TS interpreter golden-tested against fixed Lean `#eval` exports (PLAN.md:180, 373–374, 613), and capstone step 10.2 gated on "Matches Lean `#eval` exports" (PLAN.md:564);
  - L6 compares against an unspecified interpreter (PLAN.md:453, 461), although RM:77 says "your abstract interpreter";
  - a Lean AST (L3) and a Rust compiler (L6) with no shared IR between them.
- **[verified] precedents:**
  - Cedar (arXiv:2407.01688): "writing an executable model of the system and mechanically proving properties about the model". Proofs found 4 bugs; differential random testing (DRT) and property-based testing found 21 more.
  - AWS's AuthV2 (ICSE 2025): shadow testing "exposed 7 mismatches owing to inaccuracies or incompleteness of our specification; no issues were found with tools or proofs".

**Recommendation.**
- **Lane A: browser-graded Rust → wasm** on a kslab-style ABI, with per-check results and seeds drawn at grade time:

| Component | How it is graded |
|---|---|
| Interpreter | DRT against the Lean oracle's cases |
| VC checker | emits SMT-LIB; the page runs Z3 on fresh mutants |
| SQL compiler | output runs on PGlite against the interpreter |
| Outbox machine | sans-I/O, under the page's fault injector |
| Stage 9 validator | the translation validator |

- **Lane B: receipts** for Lean (statement-pinned, F1), TLC and Apalache, and multi-connection Postgres.
- **One shared JSON schema for the AST and IR.** Lean emits it (`lake exe miniplinth-oracle`, JSON in and out), and Rust consumes it.
  - DRT reports n and generator statistics (Cedar's lesson).
  - Mismatches are triaged as spec, implementation, tool or proof errors. AuthV2's lesson is to expect spec errors.
- **Stage 9:** prove the IR pass in Lean, and check the Rust SQL generator on every run with a Rust translation validator. This restores "Lean/Rust".
- **Make `plinth-lab` cumulative,** with components named by function. Keep Python only for Course 01's Z3Py.

### F9 — major — Commands as idempotent SERIALIZABLE transactions are not taught

**Evidence.**
- **The roadmap:** Stage 6 uses SERIALIZABLE and retries (RM:77), and Stage 8 lists idempotency as theory (RM:93).
- **v1:**
  - 6.7 asks "does retrying terminate?" (PLAN.md:457);
  - idempotency appears only for outbound effects (PLAN.md:514, 522–523);
  - the roadmap's "tracking how they affect behavior" (RM:77) is never operationalised.
- **PG 18.6 §13.5 [verified]:**
  - retry 40001 unconditionally;
  - "It may also be advisable to retry deadlock failures … `40P01`";
  - "In some cases … `23505` … `23P01`";
  - "retry the complete transaction, including all logic that decides which SQL to issue";
  - "Transaction retry does not guarantee that the retried transaction will complete";
  - a conflicting prepared transaction can block progress.
- **§9.27.8 [verified]:** `pg_xact_status` lets an application determine whether a transaction committed "after the application and database server become disconnected while a `COMMIT` is in progress".
- **Ports & Grittner [verified]:** "Safe retry: if a transaction is aborted, immediately retrying the same transaction will not cause it to fail again with the same serialization failure". That is not a termination guarantee.

**Recommendation.**
- **Split 6.7.**
  - **(a) Retrying:** 40001 and 40P01, and when 23505 and 23P01 apply. Retry the whole command function. State termination as liveness under a contention assumption, with safe retry as the partial answer.
  - **(b) Idempotent commands:**
    - the key row is written in the same SERIALIZABLE transaction as the postings;
    - the key, or `pg_xact_status`, resolves an ambiguous commit;
    - concurrent same-key requests are handled.
- **Specimens:**
  - a double apply when the key is checked outside the transaction;
  - a duplicate apply under concurrent same-key requests at READ COMMITTED.
- **Claim:** "a retried request with the same idempotency key changes the ledger only once".
  - MODEL-CHECKED in a TLA+ model of client retry × lost acknowledgement.
  - TESTED on the Bench with injected connection drops.
- **Make "tracking" concrete:** the L6 receipt records attempts, 40001 and 40P01 counts, and latency against contention.
- **Audit case:** a runtime that retries only 40001.

### F10 — major — Course 08 misses timeouts as durable obligations, reply guards and the provider's idempotency horizon

**Evidence.**
- **The roadmap:** "durable obligations … idempotency … environment assumptions" (RM:93); timeouts in Stage 5's hold model (RM:70); "duplicated and delayed replies" (RM:95); and "when a provider's idempotency implementation is part of the trusted assumptions" (RM:99).
- **v1:**
  - no lesson on timeouts or periodic jobs as durable obligations (the grep hits for "schedule" are process scheduling and "erosion on schedule", PLAN.md:99, 191, 426);
  - timeouts only inside Course 05's model;
  - replies are applied without a guard.
- **Stripe API [verified]:**
  - v1 keys can be pruned "after they're at least 24 hours old. We generate a new request if a key is reused after the original is pruned";
  - saved results include `500` errors;
  - a request that conflicts with one executing concurrently is not saved, and can be retried;
  - parameters must match;
  - API v2 differs: "retries don't repeat successful operations … retries failed or partially failed work to completion".
- **PostgreSQL [verified]:** `SKIP LOCKED` "provides an inconsistent view of the data … can be used to avoid lock contention with multiple consumers accessing a queue-like table".

**Recommendation.**
- **8.x "Timeouts and periodic jobs are durable obligations":**
  - Model hold timeouts (RM:70) and one periodic job under a scheduler that crashes and restarts.
  - Safety: each due item takes effect at most once, via a deterministic key.
  - Liveness: under weak fairness of the scheduler, plus recovery.
  - Specimen: a double effect after a crash between dispatch and mark-done.
  - `SKIP LOCKED` enters as an ASSUMED queue-semantics field.
- **Extend 8.4: validate every reply before applying it.**
  - Guard every reply so it applies only while the hold is still pending and never captures more than was held.
  - Reject a late reply that arrives after the timeout, and state the provider's charge as a business loss.
  - Specimen: a duplicated provider reply (RM:95) is applied twice unless it is deduplicated by the provider's own id.
- **Give 8.7's "exactly-once is a pair" a time bound and an API version.**
  - The worker's retry horizon must be shorter than the provider's retention window.
  - A replayed 500 must be classified, not retried in a loop.
  - Specimen: a double charge after an outage longer than 24 hours.
- See also A2-F14.

### F11 — major — Generic claim patterns fail the roadmap's completion tests, and the Audit Desk covers only half of them

Each pattern below is a claim that one of the roadmap's completion tests exists to catch: the kind end-state (g) asks the learner to judge "before trusting agent-written code" (RM:138).

**Evidence.**

| Claim pattern | Roadmap test it fails | Gap class |
|---|---|---|
| "No tenant can ever observe any change in another tenant", stamped proved, although shared documents are readable across tenants | RM:90: the blanket claim is false, because sharing is declassification | 12 |
| A bounded check stamped proved, or "exhaustively model-checked" with no constants stated | RM:72: bounded exploration is not an unqualified proof, and "exhaustive" holds only for the chosen constants | 5 |
| "A hold eventually resolves" filed as a state invariant, or stamped runtime-enforced | RM:72: it is liveness, it needs stated scheduler and environment fairness, and no runtime check can enforce an eventuality. v1's Main artboard files it correctly. | 3, 7 |
| "Exactly-once effects" because an outbox records every intent | RM:97: an outbox alone does not give exactly-once effects at an external service; RM:99: the provider's idempotency joins the trusted assumptions | 7 |
| One "verified" stamp covering the command, the compiler and the runtime | RM:106 keeps those three claims apart, and RM:108 asks which pieces stay unverified: the validator, the SQL semantics model and Postgres do | 6, 8 |
| A runtime that retries only 40001 | RM:77; PG 18.6 §13.5 also names 40P01, 23505 and 23P01 | 7 |

- v1 has authored cases for three of these patterns: A5.3, A7.3 and A8.1 (PLAN.md:435, 494, 522). The other three have none, and all 32 cases are fixed (PLAN.md:215–223).
- AuthV2 [verified]: once the proofs were done, every production mismatch was a specification error. So the residual risk sits in statements like these.

**Recommendation.**
- Author 4–6 audit cases from these patterns, including the three v1 lacks, each keyed to the roadmap test it fails.
- The course may offer a local-only overlay for the learner's own system (B6): zero servers, nothing uploaded or committed. At the Defence, the learner re-stamps that system's claims with claim cards.
- This is the most direct transfer the course can offer, and it uses the roadmap's own completion tests as the review checklist.

### F12 — major — There is no time budget

Estimates are copied unchanged while roughly 50–100 h of mechanisms are added, and agent-written work arrives before the course can review it.

**The stage envelope [derived from RM:24–108].**
- Stages 1–9 take 30.5–59 weeks, which is 183–590 h at 6–10 h/week.
- The 9–18-month arc (about 39–78 weeks) leaves 8.5–19 weeks for Stage 10.

**What v1 adds without re-estimating** (it copies every stage estimate, PLAN.md:66–78) [estimated]:

| Addition | Hours |
|---|---|
| Course 00 (1–2 weeks) | 6–20 |
| 32 audit cases at 30–45 min | 16–24 |
| 11 vivas | 11–22 |
| Re-find | 13–27 |
| Call It on every run | 3–10 |
| **Total** | **≈49–103 h, about 17–27% of the stage envelope** |

At the fast end, that consumes most of Stage 10's window.

**Other budget gaps.**
- **Course 01 alone is 2–3× the first weekend [estimated].** 5 lessons at about 45 min (Lesson artboard), plus L1 (3–5 h), 3 audit cases and a viva, comes to about 9–12 h. The first weekend is 3–5 h, yet the table still says "2–4 sessions" (PLAN.md:69).
- **The 20/65/15 split** (RM:8) is stated (PLAN.md:13) and never budgeted.

**Agent-written work arrives early.**
- The learner builds their own system with agents while taking the course, so agent-written specs, proofs and SQL arrive before the roadmap's default order teaches how to review them (RM:6, :138).
- v1 reaches TLA+ at weeks ~11.5–23, Postgres at ~14.5–29, effects at ~22.5–45 and Datalog at ~18.5–37 [derived].
- **Agent-written TLA+ fails exactly where a reviewer is most needed [verified].** In SysMoBench, "only 8.3% of safety properties are violated while 41.9% of liveness properties were violated" (arXiv:2509.23130 v3).
- **Lean sits idle for 14–28 weeks** between Courses 04 and 09 (L4:63; decay data from Arthur et al. 1998, L4:337–342) [verified-L4].

**Recommendation.**
- **A derived per-course hour budget,** with the 20/65/15 split visible.
- **A cut order:**
  1. Alloy becomes a drawer;
  2. 5.9 merges into the R(S, D) lesson;
  3. C3.1–C3.2 and C4.3 become stretch goals;
  4. 6.5 becomes a tablespace link;
  5. Course 00 becomes drawers.
- **Keep each course within the roadmap's upper estimate.**
- **Don't silently reorder the roadmap.** Instead:
  - import agent-written specs, proofs and SQL from the learner's own system as ASSUMED **audit debt** until the matching course is set;
  - offer a labelled, learner-chosen **bridge**: 5.6–5.7 (safety vs liveness, fairness) as an early side quest, so agent-written TLA+ gets a competent reviewer;
  - count hours on the learner's own system that exercise a course skill only once (L4's "twins", L4:551–560).

### F13 — major — Course 00 displaces the first weekend, the audience line describes someone else, and locks invert rule 1

**Evidence.**
- **The roadmap:**
  - "First weekend — Project 00 … Start here: [the Z3 intro]" (RM:128–135);
  - "Study only the material needed…" (RM:8);
  - rule 1: revisit theory "when the artifact exposes a gap" (RM:121).
- **v1 opens with theory:**
  - Course 00 "Ground" comes first: 6 lessons over 1–2 weeks (PLAN.md:68, 275–290);
  - the Elevation artboard draws it as the base course;
  - P0's scope is "Courses 00–01" (PLAN.md:625), yet P0 claims to be "the first weekend of the roadmap, done well" (PLAN.md:633);
  - the names "Project 00" and "Course 00" collide.
- **The audience is wrong:** "Python and one typed language. No prior logic, type theory or PL background assumed" (PLAN.md:10–11). The learner is a Rust-fluent kernelspace graduate.
- **v1 locks things:**
  - theory drawers "open only when a Call It is missed twice" (PLAN.md:261);
  - audit cases are "unlocked as courses are set" (PLAN.md:215).
- **kernelspace says "nothing locks"** (100X:75, :296) and rejects hard locks (100X:806, citing Kulik 1990). L4's F35 reaches the same conclusion.

**Recommendation.**
- **Delete Course 00 as a stage.** The first visit opens Project 00 in the browser.
- **Fold its lessons into just-in-time drawers:**

| Course 00 lesson | New home |
|---|---|
| 0.3 negation | 1.2 |
| 0.2 vacuity | 1.3 |
| 0.4 state as relations | 1.4 |
| 0.5 induction | 2.4 |
| 0.6 the claim card | the L1 README template |

- **Remove the locks.**
  - Drawers can always be opened; a missed call *suggests* one.
  - Audit cases can be browsed any time, marked "assumes Course N".
- **Keep placement** as an optional test-out.
- **Retarget the audience line.**
- **Add isomorphisms for a Rust engineer that say where each one breaks:**
  - the borrow checker ↔ a typing judgement, with `unsafe` as the hole;
  - proptest ↔ TESTED;
  - loom ↔ interleaving search;
  - kernelspace's KV-block refcounts ↔ hold invariants.

### F14 — major — Erosion E1 blurs the overflow semantics and the direction of Stage 6's refinement relation

**Evidence.**
- **The E1 chain in v1:**
  - S1.4: "watch a 'proved' guard wrap — first look at seam E1" (PLAN.md:303);
  - E1: "Course 06 `bigint` overflow" (PLAN.md:108);
  - the Ledger banner: "balance bigint overflowing at 2⁶³−1, where Lean's ℤ keeps counting … Its correspondence to the running system does not [hold] … Add a CHECK constraint and re-test".
- **What the engines actually do [verified]:**
  - PostgreSQL integers out of range "will result in an error"; for `numeric(p,s)`, "an error is raised".
  - Cargo's release profile sets `overflow-checks = false`, so integers wrap; the dev profile sets it true, so they panic.
  - Kani checks "arithmetic overflows" (0.68.0, 2026-09-16).

**Why it matters.**
- **Postgres aborts; it doesn't wrap.**
- **RM:79's question runs from the database to the abstract:** for a *successful* DB transition, is there a legal abstract step? An aborted transaction is not a successful transition, so C2.3's correspondence for committed states survives.
- **What actually fails** is completeness (the database refuses commands that are abstractly legal) and the equality of observations (an error vs success).
- **A CHECK can't cure** an error raised during evaluation.
- **The silent wrap lives in a Rust runtime built in release mode.** That is a natural target for a bounded verifier of Rust code.

**Recommendation.**
- Teach E1 as a six-row table: Lean ℤ, Z3 `Int`, Z3 `BitVec`, PG `bigint` (error), PG `numeric` (error), and Rust `i64` (wraps in release, panics in debug).
- Make 3.7's decision "amounts and balances are bounded; overflow is an explicit error".
- Restate the cure: bound the abstract semantics, and make errors observable in R.
- Open the Kani drawer here (F17).
- See also A2-F2.

### F15 — minor — The stamp vocabulary diverges from the roadmap's report levels

**Evidence.**
- **The roadmap's levels:** "proved, model-checked, runtime-enforced, and assumed" (RM:113).
- **The word CHECKED is overloaded:**
  - v1's CHECKED stamp (DESIGN.md:39) is also used for build gates that are really tests (PLAN.md:611–616);
  - PostgreSQL's `CHECK` constraints, which v1's 6.4 uses (PLAN.md:454), are runtime enforcement in RM:113's sense, not tests or model checks.

**Recommendation.**
- Rename CHECKED to MODEL-CHECKED, with the bound required, and stamp the build gates TESTED(n).
- Add NOT COVERED, fed by 9.9's TCB list (RM:108 asks "which pieces of the executable system remain unverified"), and CONFIGURED as a section that stays on the Shelf.
- **Keep any mapping local:** a table from the course's stamps to the learner's own system belongs in the local-only overlay (F11), not in the public course.
- Emit the capstone report with each counterexample's violated property and violating state.
- See also A2-F9.

### F16 — minor — E4 contradicts Stage 5's crash model, and C5.2's stamp breaks the stamp rules

**Evidence.**
- Stage 5 includes "crashes, restarts" (RM:70), and so does 5.5 (PLAN.md:424).
- Yet E4 cracks "C5 holds model without crashes" (PLAN.md:111), and the Ledger's C5.1 rests on "2 workers, no crash".
- C5.2 is stamped ASSUMED, but its method is "TLC, WF on Timeout". By DESIGN.md:39–42 that is a model-checked claim with one assumed field.

**Recommendation.**
- Keep crashes in Course 05's claims.
- Retarget E4 at a seam Course 05 legitimately plants: "the effect is dispatched atomically with the hold's commit". Course 08's commit→send windows crack it (S8.1).
- Re-stamp C5.2 as MODEL-CHECKED with a dashed WF(Timeout) field, and add a runtime claim for the timeout schedule (F10).

### F17 — minor — The Deferred Shelf's triggers aren't the obligations the learner will actually meet

**Evidence.**
- **Kani/Verus:** the drawer opens on a Course 09 correspondence field (PLAN.md:253–254). But the obligation first appears at E1 (the Rust release-build wrap), and again in any Rust code that does ledger arithmetic.
- **Certificates:** no trigger at all, although certified solver results are how a solver's place in the trusted base shrinks.
- The roadmap defers both "until a concrete proof obligation or implementation demands them" (RM:118).
- **[verified] tool status:**
  - cvc5 1.4.2 (2026-10-08) emits Alethe proofs under `proof-format-mode=alethe`;
  - Alethe covers "equality with uninterpreted functions, linear arithmetic, bit-vectors and parts of the theory of strings";
  - Carcara's last release is 1.1.0 (2023-08-29).

**Recommendation.**
- Open the Kani drawer at E1.
- Open "proof certificates" at 4.8's "Z3 trusted" seam, scoped to the theories Alethe covers.
- A 15-minute Z3-vs-cvc5 cross-check in 4.8 is not certificate infrastructure, so it needs no deferral.
- Keep the rest of the Shelf as it is.

### F18 — minor — First-weekend fidelity details

**Evidence.**
- RM:130 says "Run Z3Py introductory example". v1's in-browser cell has "Python syntax shimmed to the JS API" (PLAN.md:179).
- PyPI `z3-solver` 5.1.0.0 and later ship `pyemscripten_2026_0_wasm32` wheels; the latest is 5.3.1.0 (2026-10-15) [verified]. Compatibility with current Pyodide is [unverified].
- RM:134's README fields (property, assumptions, solver answer, example model, limitations) don't map onto the six claim fields.
- "Model" is overloaded: a Z3 model, a claim field, a TLC model and an Alloy model.

**Recommendation.**
- Spike real Z3Py in Pyodide, and keep the JS API as a labelled fallback (A5-F3).
- The L1 README template should carry RM:134's five fields plus the six-field card.
- Rename the card field "Formalisation", and reserve "witness" for solver models.

### F19 — minor — Sibling duplication without cross-links

**Evidence.**
- A grep of PLAN.md finds no "tablespace" or "byzantine".
- 6.5 (anomalies) duplicates tablespace's T4, which covers MVCC, the anomalies and "SSI in one lesson", and its lab 04 `mvcc` (tablespace-PLAN.md:93–95, :113).
- 8.6 duplicates byzantine's deterministic harness and its echo/idempotency lab (byzantine-PLAN.md:84, :90; kernelspace-NEXT-COURSES.md:51).
- byzantine already has a Porcupine-style checker (kernelspace-NEXT-COURSES.md:54).

**Recommendation.**
- Turn 6.5 into a 3-item test-out plus a link to tablespace T4. Keep only the Plinth step: restate each anomaly as a violated R(S, D) or invariant.
- Link byzantine's harness for 8.6, and its linearizability checker for F2's serial-order checker.
- Credit sibling completions as test-out evidence.
- Link 7.8's new-enemy ordering to byzantine's consistency material.

### F20 — minor — Theory that is listed but not taught, small order slips, and one piece of scope creep

**Evidence.**
- Bisimulation (RM:102) appears in v1's theory line (PLAN.md:531) but has no lesson.
- Symbolic execution (RM:59) is never taught.
- "Start with Natural Number Game" (RM:43), but NNG sits at 2.4 (PLAN.md:330).
- Dependent types (RM:43): TPIL ch. 2 is "Dependent Type Theory" and falls outside the prescribed ch. 3–5 and 7–8. *Functional Programming in Lean* ch. 7, "Programming with Dependent Types", sits in Stage 3's reading [verified].
- Lean 4 Metaprogramming is listed (PLAN.md:533) but never used.
- C4.3, "VCGen soundness (Lean)" (PLAN.md:400), goes beyond Stage 4, which asks only to distinguish solver correctness from VCGen correctness.

**Recommendation.**

| Lesson | Change |
|---|---|
| 9.5 | Contrast forward simulation, backward simulation and bisimulation |
| 4.4 | Derive the obligation both by WP and by forward symbolic execution |
| 2.1 | Put the NNG checkpoint first |
| 2.2 or 3.2 | Use a refined `Amount` type as the dependent-type example (ties to F3) |
| 10.1 | Embed the toy syntax with `declare_syntax_cat`, or drop the metaprogramming reading |
| C4.3 | Move to stretch |

### F21 — minor — IDs, numbers and the flagship claim card drift from the plan and from rule 3

**Evidence.**
- **IDs:**
  - The overdraft is S1.1 in PLAN (PLAN.md:300) but S1.2 on the Lesson and Main artboards.
  - Elevation says "course 2 of 10", but there are 11 courses.
  - Elevation's "2.6 … Prove C2.4" doesn't match PLAN's 2.7 and C2.3 (PLAN.md:333).
  - L2 promises "C2.1–C2.4" (PLAN.md:338–339), but the lessons mint only C2.1–C2.3.
- **Numbers:**
  - Judgment reports "At 80% confidence", but Call It offers 55, 75 and 95% (PLAN.md:125).
  - The artboards say "Z3 4.15"; Z3 is at 5.3.1 (2026-10-15) [verified].
  - PLAN promises "~40 specimens" (PLAN.md:64), but only 23 are named.
  - Mock numbers ("48,112 states", "9 ms window", "212 distinct states") are unlabelled.
- **The flagship claim card gets rule 3 wrong.** The Main artboard's C2.3 is conservation, and its "If weakened" field reads "Drop 'Allowed' → specimen S1.2, balance −40". That is a non-negativity counterexample. Dropping the guard doesn't break conservation, so rule 3's sixth field is illustrated with a counterexample to a different proposition (A2-F10).

**Recommendation.**
- Run `verify:links` over the artboards as well as the plan.
- Keep a claims registry for versions and numbers, with dates (100X:320–324), and label mock numbers [illustrative].
- Add a `verify:claims` gate that machine-checks every "if weakened" specimen against the claim's own proposition.

---

## 5. Bold ideas

1. **The example-application world.**
   - **What it is:** a persistent, simulated multi-tenant app (§3).
   - **How it grows:** the learner's components plug in course by course: the Lean oracle, then the interpreter, the VC checker, the SQL compiler, the outbox machine and the policy.
   - **Its incidents:** generated each day from the gap taxonomy and the roadmap's own bugs (for example the double spend, a buggy refund rule, a duplicated effect, a cross-tenant read), calibrated by seeded mutants.
   - **The capstone:** publishes which seeded bugs the learner's checker caught.
2. **Mutant Arena and fresh-mutant vivas.**
   - **The catalogue:** dropped guard; capture > hold; missing frame; `Nat` truncation; self-transfer aliasing; missing tenant filter; unguarded reply; RLS owner bypass; weakened fairness.
   - **What it produces:** generated items for Call It, Re-find and the vivas ("same skill, new numbers" for formal methods).
   - **What it grades:** the learner's checker, in the page, by precision and recall on unseen mutants. That rehearses catching seeded bugs every week.
3. **"You specify, agents prove, the kernel checks, you audit."**
   - **Pinning:** learner-authored statements are pinned in a challenge file and replayed comparator-style.
   - **Credit splits three ways:** specified (learner), implemented (agent), audited (learner, no AI).
   - **Why it fits:** it turns the roadmap's Stage 10 demonstration (an agent proposes, the checker exhibits a violation; RM:113) into pedagogy.
4. **Abstract-serializability checker ("Porcupine for SQL").**
   - **What it checks:** that committed commands and their observed outputs are explained by *some* serial order run through the Lean oracle.
   - **Why it's right:** the order must not be commit order, because SSI's serial order can differ from it.
   - **Where it's reused:** in Course 06, in the capstone, and in the learner's own concurrent differential tests. It shares its algorithm with byzantine's linearizability checker.
5. **Bidirectional conformance lab.**
   - **Spec → implementation:** TLC and Apalache counterexample traces replay as tests against the learner's sans-I/O Rust machine.
   - **Implementation → spec:** simulator traces are validated against the spec with TLC.
   - **The result:** a model-checked-plus-conforming claim, built end to end in one lab.
6. **"Your design is the final exam."** The course may offer a local-only overlay for the learner's own system, whose claims the learner re-stamps at the Defence. It runs with zero servers, and nothing is uploaded or committed.
7. **Plinth Core as a standalone research artifact.**
   - **The target:** what RM:115 already asks for, "a research artifact even if a broad Plinth platform never ships".
   - **What it contains:** a Lean oracle, a Rust runtime differential-tested against it, hold and outbox specs with trace validation, and a report.
   - **The Cabinet's role:** every specimen exports as machine-readable counterexample JSON, so the Cabinet becomes a regression corpus.

---

## 6. Scope ledger: adds vs cuts

**Adds:**

| Item | Size |
|---|---|
| "Why per-command proofs survive concurrency" and "Enforced at commit" (F5) | +2 lessons |
| Idempotent commands (F9) | +1 lesson |
| Information-flow reachability, containment and RLS (F6) | +3 lessons |
| Timeouts and periodic jobs as durable obligations (F10) | +1 lesson |
| Inductive invariants (F7) | +1 lesson |
| The four compilation variants, the posting model and the step signature (F2, F3) | inside existing lessons |
| Lean oracle, shared IR, sans-I/O, trace validation, Lane A (F7, F8) | lab requirements, not lessons |
| **Total** | **+8 lessons** |

**Cuts:**

| Item | Size |
|---|---|
| Course 00, folded into drawers (F13) | −6 |
| Alloy, to an optional drawer (F6) | −1 |
| 6.5, to a tablespace link (F19) | −1 |
| 5.9, merged into the R(S, D) lesson | −1 |
| C3.1–C3.2 and C4.3 | to stretch |
| **Total** | **−9 lessons** |

**Net:** about 80 → 79 lessons [derived]. Lesson time is roughly neutral [estimated]. The first weekend is restored. The remaining load from audits, vivas and Re-find still needs F12's budget.

---

## 7. Verification log (fetched 2026-10-21 unless marked otherwise)

| Fact | Source | Status |
|---|---|---|
| READ COMMITTED re-evaluates WHERE on the updated row; REPEATABLE READ raises "could not serialize access due to concurrent update"; serializable = "one at a time in some order"; the single-transaction reasoning principle; data read is not valid until commit | https://www.postgresql.org/docs/current/transaction-iso.html (PG 18.6) | verified |
| Retry 40001; "advisable" 40P01; "in some cases" 23505 and 23P01; retry the complete transaction; no completion guarantee; prepared-transaction caveat | https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html | verified |
| Serializable for all writes ⇒ consistency; not on hot standby or logical replicas | https://www.postgresql.org/docs/current/applevel-consistency.html | verified |
| Integer out of range is an error; `numeric(p,s)` overflow is an error | https://www.postgresql.org/docs/current/datatype-numeric.html | verified |
| CHECK is satisfied by NULL | https://www.postgresql.org/docs/current/ddl-constraints.html | verified |
| `sum` of no rows is NULL | https://www.postgresql.org/docs/current/functions-aggregate.html | verified |
| RLS: BYPASSRLS, owner bypass and FORCE, default deny, integrity checks as covert channels | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | verified |
| `pg_xact_status` after a disconnect during COMMIT | https://www.postgresql.org/docs/current/functions-info.html | verified |
| `SKIP LOCKED`: an inconsistent view; queue-like tables | https://www.postgresql.org/docs/current/sql-select.html | verified |
| SSI's serial order can differ from commit order (the Rollover and Deposit Report examples) | https://wiki.postgresql.org/wiki/SSI (last edited 2020-01-22) | verified |
| Safe-retry definition; 2PL and OCC match commit order to serial order | Ports & Grittner, PVLDB 2012, https://drkp.net/papers/ssi-vldb12.pdf (PDF text) | verified |
| Jepsen: G2-item under SERIALIZABLE, PG 12.3 and earlier, 2020-06-12 | https://jepsen.io/analyses/postgresql-12.3 | verified |
| Stripe: v1 keys pruned after ≥ 24 h; 500s replayed; concurrent conflicts not saved; parameters compared; v2 differs | https://docs.stripe.com/api/idempotent_requests | verified |
| TigerBeetle two-phase transfers: reserve, partial post, void, expiry | https://docs.tigerbeetle.com/coding/two-phase-transfers/ | verified |
| Cedar verification-guided development: executable model; 4 bugs from proofs, 21 from DRT and PBT | https://arxiv.org/abs/2407.01688 (2024-07-01; no venue listed) | verified |
| AuthV2: 7 shadow-test mismatches, all specification errors; none from tools or proofs | Chakarov et al., ICSE 2025, https://cdn.amazon.science/bb/40/22ac44f84f6d8eb625ac9666a00f/formally-verified-cloud-scale-authorization.pdf (PDF text) | verified |
| Trace validation with TLC; discrepancies "in all cases" | https://arxiv.org/abs/2404.16075 (v2 2024-09-17) | verified |
| Apalache IndInit, IndNext and IndProp; v0.62.4 (2026-10-12) | https://apalache-mc.org/docs/apalache/running.html; GitHub releases API | verified |
| SysMoBench: 8.3% of safety vs 41.9% of liveness properties violated; models imitate classic TLA+ | https://arxiv.org/html/2509.23130 (v3 2026-01-28) | verified |
| Zanzibar's new-enemy problem; zookies | Pang et al., USENIX ATC 2019, https://www.usenix.org/system/files/atc19-pang.pdf (PDF text) | verified |
| Soufflé `-t explain`; proof trees of minimal height | https://souffle-lang.github.io/provenance | verified |
| Lean: un-reviewed AI proofs are the malicious case; limits of `#print axioms`; comparator is the gold standard | https://lean-lang.org/doc/reference/latest/ValidatingProofs/ | verified |
| Lean 4.35.0 (2026-10-12): `lake check`, `--paranoid`, `lake comparator`; `trustCompiler` removed | https://lean-lang.org/doc/reference/latest/releases/v4.35.0/ | verified |
| TPIL ch. 2 is "Dependent Type Theory" (assumes Lean 4.33.0); FPIL ch. 7 is "Programming with Dependent Types" | https://lean-lang.org/theorem_proving_in_lean4/ ; https://lean-lang.org/functional_programming_in_lean/ | verified |
| Cargo: release `overflow-checks = false`, dev `true`; overflow checks panic | https://doc.rust-lang.org/cargo/reference/profiles.html | verified |
| Kani checks panics and arithmetic overflows; kani-verifier 0.68.0 (2026-09-16) | https://model-checking.github.io/kani/ ; crates.io API | verified |
| cvc5 Alethe option and theory coverage; Carcara helper | https://cvc5.github.io/docs/latest/proofs/output_alethe.html | verified |
| cvc5 1.4.2 (2026-10-08); Carcara 1.1.0 (2023-08-29); Soufflé 2.5; Alloy 6.2.0; Lean v4.35.0; Z3 5.3.1 (2026-10-15); TLA+ tools 1.7.4 stable, 1.8.0 pre-release (2026-10-20); PGlite 0.5.10; Nemo v0.10.1; Verus 0.2026.10.18 | GitHub releases API | verified |
| stateright 0.31.0; ascent 0.8.1; proptest 1.12.0; loom 0.7.2; madsim 0.2.34; turmoil 0.7.2 | crates.io API | verified |
| `z3-solver` 5.3.1.0 on PyPI, with a pyemscripten wasm32 wheel (since 5.1.0.0) | https://pypi.org/pypi/z3-solver/json | verified (Pyodide compatibility unverified) |
| Spectacle: a browser TLA+ playground, pushed 2026-09-30 | GitHub API, will62794/spectacle | verified |
| Small-scope *hypothesis*; Alloy "can't prove theorems" | Jackson, https://people.csail.mit.edu/dnj/talks/newcastle/newcastle-b/outlinee.htm | verified |
| Barthe, D'Argenio & Rezk 2004; Chandra & Merlin 1977 | Crossref: doi:10.1109/csfw.2004.1310735; doi:10.1145/800105.803397 | verified (bibliographic) |
| METR: anti-cheat prompts had a negligible effect | R2 dossier (its verifier confirmed it 2026-10-21) | verified-R2 |
| Skill decay (Arthur et al. 1998); the 14–28-week Lean gap | L4:63, :337–342 | verified-L4 / derived |

**Unverified:**
- whether the z3-solver Pyodide wheel loads in current Pyodide;
- the cost of searching permutations at n = 6–8 inside the browser's time budget [estimated feasible; to be measured];
- whether TLC's JSON trace dump carries lasso back-edges.

---

## 8. Changes from the 23:08 draft at this path

**Corrections:**
- The decay citation was L4:35. The claim is at L4:63 and :337–342.
- The draft said Course 07 promotes Alloy "against the roadmap's wording". In fact the roadmap lists Alloy as a Stage 7 resource (RM:84) and says "Soufflé **or** Alloy" (RM:10). The issue is the three-tool mix, noninterference assigned to Alloy on the artboard, and the Datalog checks Stage 7 calls for going missing (F6).

**Handed to the lenses that own them, and cross-referenced instead:**
- the lost-update mechanics (A2-F1);
- E1's correctness detail (A2-F2);
- the Lean receipt bypass and native axioms (A2-F3, A5-F2);
- the flagship claim card (A2-F10).

**Widened:**
- The old F1 now covers the whole Stage 6 project (F2): write skew needs a multi-row predicate that only postings or holds supply, and SSI's serial order is not commit order.
- The old F2 gains the end-state (a)–(g) outcome matrix, statement pinning (the Lean 4.35 checkers and comparator), and the METR evidence (F1).

**New in this pass:**
- the composition principle that PG's own documentation states, and the replica seam (F5);
- the new-enemy problem (F6);
- AuthV2's evidence that the remaining errors are specification errors (F8, F11);
- the difference between Stripe's API v1 and v2 (F10);
- SysMoBench's liveness gap as the reason for an early TLA+ bridge (F12);
- the abstract-serializability checker (B4).

**Merged:**

| Old findings | Now |
|---|---|
| F3 + F7 | F3 |
| F10 + F11 | F6 |
| F13 + F15 | F7 |
| F17 + F18 | F8 |
| F5 + the locks | F13 |

## 9. Not covered by this lens

- visual and UX quality;
- learning-science effect sizes (A3);
- the journey and its persistence (A4);
- build feasibility and capacity (A5);
- comparisons with world-class courses (A6).
