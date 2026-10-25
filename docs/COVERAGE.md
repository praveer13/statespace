# statespace: roadmap coverage matrix

**Status:** verifier pass, 2026-10-24. **Scope:** every clause of the roadmap, [research/context/roadmap.md](../research/context/roadmap.md), mapped to where the course covers it. IDs resolve against the spine, [docs/spine/SPINE.md](spine/SPINE.md); per-stage detail is in `curriculum/S01`–`S10` and `curriculum/D-drawers.md`.

**Status codes.** **C** covered. **C\*** covered through a substitution or deliberate deviation that the spine or a curriculum file records. **P** partial: some of the clause is covered, and the rest is listed in §3. **G** gap: nothing covers it; listed in §3. "Unnamed" means the concept is taught but the roadmap's term never appears in learner copy.

**Method.** Each roadmap sentence was split into clauses (time, theory terms, resources, project sentences, completion-test sentences) and searched for in the spine's stage tables (§3.1–§3.10), KC graph (§4), drawers (§3.12), decisions log (§12) and cut list (§14), then confirmed in the matching curriculum file's lessons, lab tables, reading list and time budget. Hour figures cited below are the spine's planning estimates [D], not measurements.

---

## 1. Framing clauses

| Roadmap clause | Covered by | Status | Note |
|---|---|---|---|
| "A project-first curriculum: learn the theory by building a tiny checked application language" | README "What it is"; PLAN §1.1; Mini-Plinth in S3–S4, S9, S10 | C | |
| Goal: define application semantics, derive proof obligations, inspect counterexamples, evaluate agent-produced implementations, determine what a proof does and does not establish | PLAN §1.1 (quoted); outcomes (a)–(g), spine §2.2; Audit Desk (AUDIT-DESK.md) | C | |
| "Plinth is the organizing problem, not a deadline or a commitment to a fixed architecture" | "no deadline": spine §3.11 ("never behind"), SCR-week | P | "Not a commitment to a fixed architecture" is not stated anywhere (§3, item 8) |
| Progression at a glance, items 1–10 | spine §3.1–§3.10 titles; README "The ten stages"; PLAN §2.1 table | C\* | Item 10, "assemble Plinth Core", becomes "the Core"; the toy-language names stay (OD-2; spine §12 item 17) |

## 2. Working approach and tools

| Roadmap clause | Covered by | Status | Note |
|---|---|---|---|
| 20% reading, 65% building/proving, 15% documenting | spine §3.11 (ratio sentence); PLAN §1.6, §2.1, §4.4 | P | PLAN §4.4 says the plan "matches" 20/65/15 and drops the spine's caveat that reading is about 40–44% if lessons count as reading (§3, item 9) |
| Keep one evolving `plinth-lab` repository | `statespace-lab` (OD-2; DECISIONS OD-2); labs/README §1 ("the first zip starts the repository, and later ones add their folder"), §5; PLAN §7.6 | C\* | Renamed by OD-2 |
| Maintain deliberately broken examples; a counterexample often teaches more than a passing model | `broken/` beside `fixed/` (labs/README §9.3; labs/AGENTS.md); specimens SP-1.1–SP-9.6 (spine §5.1); LAB-2.6, LAB-3.6, LAB-4.7, LAB-5.4, LAB-9.12 | C | |
| Study only the material needed for the next artifact | Learning rule 1 row below; bridge-lesson reading pointers (spine §3.0); just-in-time drawers D-01–D-23 | C | |
| Tools in rough order: Z3Py, Lean 4, a tiny language/interpreter, TLA+, Postgres/Rust, Soufflé or Alloy | Z3Py S1; Lean 4 S2; Mini-Plinth interpreter S3 (INS-interp, LAB-3.10); TLA+ S5, S8; PostgreSQL S6; Soufflé S7 with Alloy as D-16 and LAB-7.8 `[stretch]` | C\* | Rust, which the roadmap pairs with Postgres at Stage 6, enters at S3 (LAB-3.8–LAB-3.11, Lane A) and S4 (`miniplinth check` in Rust); no decision records the move (§3, item 11). Soufflé or Alloy: DECISIONS (Datalog engine, alternative c) |
| Overall arc 9–18 months at about 6–10 h/week | spine §3.11 (105–194 h [D]; about 42–78 weeks at 6 h/week, 25–45 at 10 h/week [D]); README; PLAN §4.4 | C | |
| No imposed deadline; stage estimates are rough, not requirements | spine §3.11 ("never as 'behind'"); SCR-week (plan range beside the roadmap range); GATE-budget; learner-zero times replace estimates after each wave | C | |

## 3. Gaps and misplacements (summary; each is returned as an issue)

1. **S2 project, "preservation under arbitrary finite sequences of allowed transfers."** Only conservation is proved over sequences (`run_conserves`, LAB-2.5, CL-2.4). No theorem shows non-negativity preserved across a sequence of allowed transfers, which is the invariant-preservation half of the clause. File: `curriculum/S02-proof.md`.
2. **S2 project, "then generalize to finite maps of accounts."** S2.L8 and LAB-2.6 use `Acct := Nat` and `Acct → Int` with pointwise update; the theorems are local (`xfer_frame`, `xfer_pair`, `xfer_self`). No conservation of a total over a finite account set is stated. The no-Mathlib reason [X RUN-lean-mathlib] is recorded, but the substitution and its weaker claim are not. File: `curriculum/S02-proof.md`.
3. **S2 resource, TPIL "chapters 3–5 and 7–8."** The S2 reading list cites §3, §5, §7, §8 and §12 but nothing from chapter 4 (Quantifiers and Equality), although "quantification" is S2 theory. File: `curriculum/S02-proof.md`.
4. **S2 theory, "dependent types."** Not mentioned in S2; subtypes appear only in S3.L2 (KC-3.refined-types, "as a dependent-type example"). The move is not recorded. File: `curriculum/S02-proof.md`.
5. **S5 theory, "labeled transitions" and "finite-state abstraction."** Both are taught in substance (actions in S5.L1; constants, symmetry and state constraints in S5.L8) but never named, and the step from an unbounded system to a finite model is not drawn explicitly. File: `curriculum/S05-time.md`.
6. **S8 project, "prove safety properties over the model."** Met as [M] · constants · complete (spine §12 item 28), which promises an optional inductive step to [P]; no stage or run hosts it (S08 spine issue 10). File: `curriculum/S08-effects.md`.
7. **S10, "a research artifact even if a broad Plinth platform never ships."** Not stated. File: `curriculum/S10-assembly.md`.
8. **Purpose, "not a deadline or a commitment to a fixed architecture."** Half missing (§1). File: `README.md`.
9. **Working approach, 20/65/15.** PLAN §4.4 asserts a match the spine (§3.11, revision M9) explicitly replaced. File: `docs/PLAN.md`.
10. **Learning rule 3 had no KC.** The six-field skill was checked by claim@1 validation in labs but was never a KC, so it was never spaced or sampled in a Defence (D-drawers spine issue 3). *Closed in spine revision 3:* KC-1.claim-anatomy holds it, first taught in S1.L3 with D-06 (spine §4, §12 item 43). File: `docs/spine/SPINE.md`.
11. **Tool order, Rust.** See §2. File: `docs/spine/SPINE.md`.
12. **No gate keeps this matrix true.** Cut eligibility (spine §14) protects the sole lesson of a completion test but not the sole lesson of a roadmap project sentence, theory term or resource (S3.L8 is the only lesson on "termination", S4.L1 the only Hoare-logic lesson, S2.L1 the NNG lesson; all are cut-eligible). No GATE checks roadmap clauses against lesson and lab IDs. File: `docs/spine/SPINE.md`.

---

## 4. Stage-by-stage matrix

### Stage 1 — Find a bug mathematically (S1)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 2–4 focused sessions | spine §3.1 budget, read as at most 10 h; S01 §12 | C | Plan 5.3–9.4 h [D] |
| Theory: propositions | D-02; S1.L3 (KC-1.implication-vacuity) | C | |
| Theory: first-order constraints | D-03; S1.L1 (KC-1.quantifier-negation) | C | unnamed |
| Theory: satisfiability | S1.L1, S1.L2 (KC-1.violation-as-sat, KC-1.three-answers) | C | |
| Theory: counterexamples | S1.L1, S1.L4 (KC-1.witness-class); SP-1.1–SP-1.3 | C | |
| Theory: integer arithmetic | S1.L5 (KC-1.encoding-is-the-claim; the six-row table) | C | |
| Resource: Z3Py introductory tutorial | S01 §10 (dated sections); LAB-1.1 | C | |
| Project: transfer-counterexample lab; two balances and an amount | LAB-1 (Project 00); LAB-1.2 | C | |
| Project: ask Z3 for an input making the source negative | LAB-1.2, LAB-1.c2; S1.L1 | C | |
| Project: add a sufficient-funds guard; violation becomes unsat | LAB-1.3, LAB-1.c3; S1.L3; CL-1.1 | C | |
| Project: extend to conservation, double capture and a buggy refund rule | S1.L4; LAB-1.4 (refund), LAB-1.5 (conservation, double capture); SP-1.2, SP-1.3; CL-1.2–CL-1.4 | C | |
| Starter code | LAB-1.1 runs it [X RUN-z3-starter]; S1.L1 scores a fresh variant because the starter prints its own answer | C | |
| Completion: why a violation search asserts the negation | S1.L1; S1 Defence Part A and D | C | |
| Completion: interpret sat, unsat and unknown precisely | S1.L2 (KC-1.three-answers, KC-1.unknown-fails-closed); Defence Part A | C | |
| Completion: dependence on the correctness of the encoding | S1.L5; CL-1.5; Defence Part A and B | C | |

### Stage 2 — Prove a small program correct (S2)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 3–6 weeks | spine §3.2 budget; S02 §12 | C | At the upper bound [D] |
| Theory: propositions-as-types | S2.L2 (KC-2.props-as-types) | C | |
| Theory: quantification | KC-1.quantifier-negation (S1) as a prerequisite of S2.L5 | P | No TPIL chapter 4 reading (§3, item 3) |
| Theory: mathematical induction | S2.L1, S2.L4, S2.L7 (KC-2.induction-principle, KC-2.generalized-ih); D-05 | C | |
| Theory: proof terms | S2.L2 | C | |
| Theory: dependent types | S3.L2 (KC-3.refined-types) only | P | Moved to S3 without a record (§3, item 4) |
| Theory: the trusted kernel | S2.L9 (KC-2.axioms-and-trust); SEAM-15 | C | |
| Resource: Natural Number Game ("start with") | S2.L1; D-08 (pinned fallback) | C | S2.L0, a 15–20-minute reading unit, precedes it |
| Resource: TPIL chapters 3–5 and 7–8 | S02 §10 | P | Chapter 4 missing (§3, item 3) |
| Project: two accounts, transfer over mathematical integers | S2.L2, S2.L5; LAB-2 challenge pack | C | |
| Project: prove conservation | LAB-2.2; CL-2.1 | C | |
| Project: non-negative balances after an allowed transfer | S2.L6; LAB-2.4; CL-2.3 | C | |
| Project: unchanged state on rejection | S2.L6; LAB-2.3; CL-2.2 | C | |
| Project: preservation under arbitrary finite sequences of allowed transfers | S2.L7; LAB-2.5 (`run_conserves`); CL-2.4 | P | Conservation only (§3, item 1) |
| Project: then generalize to finite maps of accounts | S2.L8; LAB-2.6; CL-2.5 | C\*/P | `Acct → Int`, local theorems only (§3, item 2) |
| Completion: proofs contain no `sorry` | LAB-2 comparator and axiom checks (`sorryAx`); S2.L9; Defence Part A | C | |
| Completion: explain the induction and theorem statements without reciting tactics | S2.L4, S2.L5, S2.L7 (explain-back); Defence Part D | C | |
| Completion: kernel acceptance establishes the proposition, not business intent | S2.L10 (KC-2.kernel-not-requirement); requirement-fit never [P] | C | |

### Stage 3 — Invent Mini-Plinth as a language (S3)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 4–8 weeks | spine §3.3; S03 §13 | C\* | Low estimate below the lower bound because progress and preservation proofs moved to stretch (BRIEF §7.2) |
| Theory: abstract syntax trees | S3.L1 (KC-3.abstract-syntax) | C | |
| Theory: type systems | S3.L2 (KC-3.typing-judgment) | C | |
| Theory: small-step and big-step semantics | S3.L3, S3.L4 | C | |
| Theory: progress and preservation | S3.L5 (KC-3.progress-preservation-scope); LAB-3.12, LAB-3.13 `[stretch]` | C\* | Proofs are stretch (BRIEF §7.2) |
| Theory: termination | S3.L8 (KC-3.termination-fuel) | C | S3.L8 is cut-eligible (§3, item 12) |
| Resource: *Functional Programming in Lean* ch. 1–2, 4, 7 as needed | S03 §12 (cited by title; chapter 7 optional) | C | |
| Resource: PFPL early chapters | S03 §12 (§1–§6, §34.1) | C | |
| Project: typed AST in Lean for entities, expressions, commands, guards and resource operations; skip parsing | S3.L1, S3.L2; LAB-3.2 | C | |
| Project: evaluator / transition relation with explicit error semantics | S3.L3, S3.L4; LAB-3.3 | C | |
| Project: well-formed successful transitions preserve a state invariant | S3.L6; LAB-3.4, LAB-3.5; CL-3.3 | C | |
| Project: introduce an unsafe command; watch the obligation fail | S3.L9; LAB-3.6 (`force move`) | C | |
| Toy syntax | S03 §2.1; spine §3.3; S10.L1 and LAB-3.8 parse it | C | |
| Completion: precise semantics independent of SQL, Rust or UI | S3 Defence Part A item 9; S3.L7 | C | |
| Completion: zero transfers, self-transfers, failed guards, overflow from the semantics | S3.L7 (KC-3.edge-cases-as-decisions); LAB-3.7 | C | |

### Stage 4 — Build a verification-condition generator (S4)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 3–6 weeks | spine §3.4; S04 §10 | C | |
| Theory: Hoare logic | S4.L1 (KC-4.hoare-triple) | C | S4.L1 is cut-eligible (§3, item 12) |
| Theory: weakest preconditions | S4.L2, S4.L3 | C | |
| Theory: substitution | S4.L2 (KC-4.capture-avoiding-substitution) | C | |
| Theory: symbolic execution | S4.L4 (KC-4.symbolic-execution) | C | |
| Theory: soundness of SMT encoding | S4.L8, S4.L9 (KC-4.trust-stack); LAB-4.9 `[stretch]` | C | |
| Resource: PLF Hoare and Hoare2 | S04 §9 (dated sections); D-10 | C\* | Marked optional because of Rocq notation |
| Resource: Z3 Guide | S04 §9 | C | |
| Project: `miniplinth check`, obligation Inv ∧ Guard ∧ Step ∧ ¬Inv′ | S4.L4, S4.L7; LAB-4.2–LAB-4.4 | C | |
| Project: if satisfiable, explain the violating state | S4.L7; LAB-4.5 (replay in the interpreter); S10.L3 | C | |
| Project: if unsatisfiable, report a proved obligation for the supported fragment | LAB-4.1; S4.L7 | C | |
| Adversarial: miscompile a construct so a false theorem appears true; locate it | S4.L8; LAB-4.7 | C | |
| Adversarial: solver correctness versus VC-generator correctness | S4.L8, S4.L9; Defence Part A | C | |
| Completion: derive obligations by hand for assignments and conditionals | S4.L2, S4.L3 (S4.L3 not cut-eligible); Defence Part A | C | |

### Stage 5 — Model concurrency and temporal behavior (S5)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 3–6 weeks | spine §3.5; S05 §11 | C | |
| Theory: labeled transitions | S5.L1 (actions) | P | Unnamed (§3, item 5) |
| Theory: safety and liveness | S5.L6 (KC-5.safety-vs-liveness) | C | |
| Theory: temporal logic | S5.L6 (KC-5.temporal-operators) | C | |
| Theory: fairness | S5.L7 (KC-5.fairness) | C | |
| Theory: stuttering | S5.L1 (KC-5.behaviors-stuttering) | C | |
| Theory: model checking | S5.L2, S5.L3, S5.L8 | C | |
| Theory: finite-state abstraction | S5.L8 (KC-5.bounded-scope) | P | Unnamed (§3, item 5) |
| Resource: Learn TLA+ | S05 §10 | C | |
| Project: unsafe read-then-write transfer; double-spend trace | S5.L3; LAB-5.1 [X RUN-tlc-doublespend]; SP-5.1 | C | |
| Project: make the critical transition atomic; re-check | S5.L3; LAB-5.2 | C | |
| Project: Available → Held → Captured / Released | S5.L4; LAB-5.3 | C | |
| Project: timeouts, duplicated effect replies, crashes, restarts, competing resolution | S5.L5; LAB-5.4 | C | |
| Completion: "never resolves twice" (safety) versus "eventually resolves" (liveness) | S5.L6; Defence Part A | C | |
| Completion: scheduler and environment fairness assumptions | S5.L7; LAB-5.5; AUD-5.2; Defence Part A | C | |
| Completion: bounded exploration is not a proof for arbitrary state spaces | S5.L8, S5.L9; CL-5.4; Defence Part A | C | |

### Stage 6 — Connect semantics to PostgreSQL (S6)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 4–8 weeks | spine §3.6; S06 §13 | C\* | Plans wholly below the lower bound; logged as the largest estimating risk (spine §14) |
| Theory: relational algebra | S6.L1 (KC-6.sql-not-algebra) | C | |
| Theory: NULL and bag semantics | S6.L1 (not cut-eligible), S6.L2 (KC-6.null-guards) | C | |
| Theory: MVCC | D-11 (drawer); SP-6.3, SP-6.9 (snapshot behavior) | C\* | Drawer, not a lesson |
| Theory: transaction histories | S6.L6, S6.L8 (INS-history) | C | |
| Theory: serializability | S6.L7, S6.L8 (KC-6.abstract-serializability) | C | |
| Theory: snapshot isolation | S6.L6 (REPEATABLE READ outcomes); SP-6.3 | C | |
| Theory: refinement relations | S6.L8 (KC-6.refinement-relation) | C | |
| Resource: PostgreSQL Transaction Isolation | S06 §10 item 1 (pinned `/docs/18/`) | C\* | Pinned version, not `current` (OD-12) |
| Project: compile transfers into transactions | S6.L2; LAB-6.2, LAB-6.3 | C | |
| Project: same random commands in the interpreter and Postgres; compare | S6.L3; LAB-6.4 | C | |
| Project: reproduce write skew or read/modify/write races with concurrent connections | S6.L6; LAB-6.5 | C | |
| Project: SERIALIZABLE and retries, tracking effects | S6.L7 (not cut-eligible); LAB-6.6 | C | |
| Project: R(S, D); legal S → S′ and R(S′, D′) for each successful D → D′ | S6.L8; LAB-6.7; CL-6.3 | C | |
| Completion: what differential tests establish and cannot | S6.L3 (KC-6.differential-testing); CL-6.1; Defence Part A | C | |
| Completion: NULL, bags, numeric overflow, serialization failures | S6.L1, S6.L4, S6.L7; Defence Part A | C | |

### Stage 7 — Access-control and information-flow claims (S7)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 4–8 weeks | spine §3.7; S07 §12 | C\* | Below the lower bound, as S6 |
| Theory: RBAC, ABAC, ReBAC | S7.L1 (exit item's three rule templates; Cedar reading) | C | |
| Theory: Datalog | S7.L2 (KC-7.policy-as-datalog) | C | |
| Theory: noninterference | S7.L5 | C | |
| Theory: observational equivalence | S7.L6 (KC-7.observer-equivalence) | C | |
| Theory: declassification | S7.L7 | C | |
| Theory: hyperproperties | S7.L5, S7.L6 (KC-7.hyperproperty) | C | |
| Resource: Soufflé tutorial | S07 §11 item 1 | C | |
| Resource: Alloy | D-16; LAB-7.8 `[stretch]` | C\* | "Soufflé or Alloy" (DECISIONS) |
| Project: users, teams, roles, documents, sharing; read policy | S7.L1; LAB-7.2 | C | |
| Project: generate and check the access matrix | S7.L2; LAB-7.1, LAB-7.2 | C | |
| Project: paired states differing only in another tenant's private data | S7.L6; LAB-7.5; CL-7.3 | C | |
| Deliberate bug: a shared-document query reveals a private field | S7.L7; LAB-7.5; SP-7.1 | C | |
| Revocation cannot erase delivered information | S7.L8; LAB-7.6 | C | |
| Enforcement of a permission check versus noninterference | S7.L5 (KC-7.enforcement-vs-ni) | C | |
| Completion: formulate the observer and equivalence relation | S7.L6; Defence Part A | C | |
| Completion: intentional declassification; why the blanket claim is false | S7.L7; LAB-7.7; Defence Part A | C | |

### Stage 8 — External effects and crash recovery (S8)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 3–6 weeks | spine §3.8; S08 §12 | C\* | Below the lower bound, as S6 |
| Theory: asynchronous machines | S8.L2 (the outbox machine) | C | unnamed |
| Theory: durable obligations | S08 §1.1 (`NoLostIntent`); S8.L2 | C | |
| Theory: crash consistency | S8.L3 (KC-8.crash-windows); D-12 | C | unnamed |
| Theory: idempotency | S8.L4 (KC-8.idempotency-keys), S8.L7 | C | |
| Theory: at-least-once delivery | S8.L3, S8.L7 (KC-8.at-least-once) | C | |
| Theory: environment assumptions | S8.L5; S08 §1.3 (guarantee table) | C | |
| Resource: advanced Learn TLA+ examples | S08 §10 | C | |
| Resource: industrial example list | S08 §10 (optional) | C | |
| Project: Command → Outbox → Worker → External → Ack | S8.L2; LAB-8.2 | C | |
| Project: crash between every two steps; duplicated and delayed replies | S8.L3; LAB-8.2; S08 §1.2 | C | |
| Project: prove safety properties over the model | LAB-8.2 as [M] · constants · complete (spine §12 item 28) | C\*/P | No stage for the promised [P] lift (§3, item 6) |
| Project: which progress guarantees need eventual service recovery or external idempotency | S8.L5; LAB-8.3; S08 §1.3 | C | |
| Project: deterministic simulator replaying transitions with injected failures | S8.L6; LAB-8.4, LAB-8.6 | C | |
| Recording intent versus sending; an outbox alone is not exactly-once | S8.L1 (KC-8.commit-not-send), S8.L7 | C | |
| Completion: every crash window | S8.L3; Defence Part A and D | C | |
| Completion: why at-least-once delivery duplicates calls | S8.L3; Defence Part A | C | |
| Completion: when the provider's idempotency is a trusted assumption | S8.L7 (KC-8.provider-horizon); SEAM-12; LAB-8.8 | C | |

### Stage 9 — Verify a compiler transformation (S9)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: 6–10 weeks | spine §3.9; S09 §12 | C | |
| Theory: forward simulation | S9.L5 (KC-9.forward-simulation) | C | |
| Theory: bisimulation | S9.L5 (KC-9.simulation-kinds) | C | |
| Theory: observational equivalence | S9.L4 (KC-9.observations) | C | |
| Theory: refinement | S9.L4–S9.L6; spiral from S6.L8 | C | |
| Theory: translation validation | S9.L2, S9.L8 (KC-9.translation-validation) | C | |
| Theory: trusted computing base | S9.L9 (KC-9.tcb) | C | |
| Resource: CompCert | S09 §11 | C | |
| Resource: Lean 4 Metaprogramming, selectively | D-22 | C\* | Drawer, surfaced only when needed |
| Project: translate a Mini-Plinth subset into a simpler IR | S9.L3; LAB-9.3 | C | |
| Project: semantic preservation, same observations | S9.L6; LAB-9.4–LAB-9.10; CL-9.2 | C | |
| Project: incorrect optimization; failing example or broken proof | S9.L7; LAB-9.12; SP-9.1 | C | |
| Project: narrow translation-validation check for generated Postgres transaction plans | S9.L8; LAB-9.11; CL-9.3 | C | |
| Keep apart: command preserves invariants, compiler preserves meaning, runtime follows target | S9.L9 (KC-9.three-claims) | C | |
| Completion: the refinement relation, its abstraction boundaries, what remains unverified | S9.L9; mini-Defences Part A | C | |

### Stage 10 — Assemble the Core (S10)

| Clause | Covered by | Status | Note |
|---|---|---|---|
| Time: open-ended | spine §3.10 (final assembly capped at six weeks); PLAN §4.8 | C\* | The cap applies only to final assembly |
| A tiny parsed and typed language | S10.L1 (LAB-3.8, LAB-3.9) | C | |
| A reference interpreter | S10.L2 (LAB-3.10, LAB-3.11) | C | |
| SMT obligations; reproducible counterexamples | S10.L3 (LAB-4.5); specimens | C | |
| A Postgres compiler; an executable transaction runtime | S10.L4 (LAB-6.8) | C | |
| Demonstration: an agent proposes a plausible transfer or authorization command | S10.L6; LAB-10.4 (mutation-generated proposals, no runtime LLM) | C | |
| The checker exhibits a violation or proves a restricted obligation | LAB-10.5 | C | |
| The corrected command executes on Postgres with systematic tests | LAB-10.6; S10.L5 (LAB-8.7) | C | |
| Report distinguishing proved, model-checked, runtime-enforced and assumed | LAB-10.8 (report@1 sections) | C | |
| Publish operational semantics, theorem statements, counterexamples, tool versions, known limitations | S10.L7; LAB-10.9 | C | |
| "A research artifact even if a broad Plinth platform never ships" | — | G | §3, item 7 |

---

## 5. Deferral list ("What not to study prematurely")

| Deferred topic | Drawer | Status |
|---|---|---|
| Category theory | D-33 | C |
| Advanced dependent type theory | D-34 | C |
| Proof-certificate infrastructure | D-32 (surfaced at ER-7) | C |
| Kani / Verus | D-30 (at ER-1); D-31 | C |
| Full cryptographic protocol verification | D-35 | C |
| Mobile attestation | D-36 | C |
| Cloudflare topology | D-37, "Edge and CDN topology" | C\* (vendor-neutral name) |
| Generalized migrations | D-38 | C |
| UI code generation | D-39 | C |
| Multi-framework SDKs | D-40 | C |
| "until a concrete proof obligation or implementation demands them" | triggers in spine §3.12; D-drawers §4; triggers surface a drawer and unlock nothing | C |

## 6. Learning rules

| Rule | Covered by | Status | Note |
|---|---|---|---|
| 1. Read only enough theory; revisit it when the artifact exposes a gap | just-in-time drawers surfaced on a miss (D-drawers §0); bridge reading pointers; budgets below the roadmap's bounds (spine §3.11) | C | |
| 2. Preserve broken examples and counterexample traces beside fixed versions | labs/README §9.3; labs/AGENTS.md (`broken/**` never edited); specimens | C | |
| 3. Explain every guarantee in six parts | claim cards and GATE-claims; KC-1.claim-anatomy, first taught in S1.L3 with D-06 (spine §4, §12 item 43); PLAN §1.1 | C | Spaced in Today and sampled in Defences as the learner's own; closes §3, item 10 |
| 4. Don't equate Lean's proof checking with the business requirement | S2.L10; KC-2.kernel-not-requirement; DESIGN principle 4; requirement-fit never [P] | C | |
| 5. Publish a short technical note every 2–3 stages | M-notes after S2, S5, S7 and S9 (spine §7); PLAN §5.4; `notes/` in the lab repo | C\* | Publishing is optional, so nothing is coerced |
| 6. Track progress by what you can reason about | VRK₃₀ (spine §2.3; ASSESSMENT §3.6); weekly review (PLAN §5.4) | C | |

## 7. First weekend — Project 00

| Checklist item | Covered by | Status |
|---|---|---|
| Counterexample laboratory, 3–5 hours | spine §3.1 "The first weekend"; S01 §12 (plan 3.25–5.9 h [D]) | C |
| Run the Z3Py introductory example | LAB-1.1 | C |
| Find a transfer that creates a negative balance | LAB-1.2 | C |
| Add a sufficient-funds guard and eliminate the counterexample | LAB-1.3 | C |
| Introduce a buggy refund rule and find a second counterexample | LAB-1.4 | C |
| README with property, assumptions, solver answer, example model, limitations | LAB-1.6, LAB-1.c6 | C |
| "Start here": Z3Py introduction | S01 §10; LAB-1.1 | C |
| "Next": Natural Number Game | S2.L1; D-08 | C |

## 8. End-state (a)–(g)

| Outcome | Covered by | Status |
|---|---|---|
| (a) State a property precisely | spine §2.2 row (a); S1, S4, S7; ASSESSMENT §3.8 | C |
| (b) Distinguish safety, liveness and information flow | row (b); S5, S7, S8 | C |
| (c) Derive and audit proof obligations | row (c); S4, S5, S9; Audit Desk G1, G2, G4, G13 | C |
| (d) Understand proofs over language semantics | row (d); S2, S3, S9 | C |
| (e) Model adversarial concurrent executions | row (e); S5, S6, S8 | C |
| (f) Establish or test a refinement relation to Postgres | row (f); S6, S9; LAB-6.c7 | C |
| (g) Decide which claims are justified before trusting agent-written code | row (g); Audit Desk; S10.L6; CL-10.1 | C |

## 9. The owner's additional instructions (context only)

| Instruction | Covered by |
|---|---|
| Scope and quality of kernelspace | spine §3.11 counts (76 lessons plus Boot, 10 labs, capstone); tab instruments (spine §9.1); Lane A graded in the tab; the Clearinghouse (WORLD.md); zero servers (I6) |
| Its own look and mechanics, not kernelspace's | DESIGN.md; spine §10.2 |
| Evidence-graded methods | EVIDENCE.md; grades A–D throughout |
