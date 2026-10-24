# S4 Obligations: Hoare logic, weakest preconditions, VC generation, `miniplinth check`

**Status.** Detailed curriculum spec for stage S4, for owner review, 2026-10-23. **IDs** come from `docs/spine/SPINE.md` (revision 2); where this spec believes the spine is wrong, §11 says so instead of diverging silently. **Tags** follow the spine: `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run recorded before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D from the pedagogy digest. **Misconception tags** are the digest's §2 catalog with the stage specs' `dp:` prefix (dp:O3), because its G1–G9 and S1–S4 collide with gap classes and stage IDs (§11, item 16). The author re-derived every frame, capture and CTI claim below with Z3 while drafting; those checks are not course runs and are never cited as `[X]`.

## 0. The stage at a glance

**Scope (roadmap Stage 4, 3–6 weeks).** Theory: Hoare logic, weakest preconditions (WP), substitution, symbolic execution, soundness of the SMT encoding. Project: `miniplinth check`, which derives `Inv(S) ∧ Guard(S) ∧ Step(S,S′) ∧ ¬Inv(S′)`, asks Z3, explains a violating state when the answer is `sat`, and reports a proved obligation for the precisely supported fragment when it is `unsat`. Adversarial exercise: miscompile a construct so that a false theorem appears true, locate the faulty translation, and tell solver correctness from VC-generator correctness. **Completion test:** derive obligations by hand for assignments and conditionals, not just paste hand-written assertions into a solver.

**Tools and lanes.** No new tool. Z3 5.3.1 returns from S1 [X RUN-z3-starter], in the tab on Pyodide 314.0.7 [X RUN-z3-starter-pyodide] with `rlimit` budgets, because `timeout` never returned there [X RUN-z3-budget-pyodide]. cvc5 1.4.2 cross-checks authored `unsat`s on the Bench (the executed run's pip wheel reads `1.4.2-modified` [X RUN-cvc5-alethe]; the Bench binary is {{run:RUN-scaffold}}). The learner's Rust checker runs as wasm in the tab (badge *re-checked here*); the cvc5 cross-check and the Lean stretch run on the Bench (*reported from your machine*). LAB-4.5 builds capstone step S10.L3. Sibling bridges: none.

**Two ideas carry the stage.**

1. *One obligation, two derivations.* Backward by WP and forward by symbolic execution give equisatisfiable queries for a deterministic command; Z3 confirms it (S4.L4).
2. *Which way an encoding errs.* A violation query is a conjunction. Dropping a premise conjunct (a frame equation, the guard) can only turn `unsat` into `sat`: false alarms, whose witnesses do not replay as violations in the interpreter, never false proofs. Adding a wrong conjunct, or encoding a step that omits a real effect, can only turn `sat` into `unsat`: false proofs, and at the limit contradictory premises (vacuity). With Inv encoded exactly, a VC generator is *sound* when its step relation contains every real step and *complete* when it contains nothing else: the halves of Cedar's encoder theorem [cedar24]. Replay tests completeness; known-false fixtures and premise witnesses test soundness. This is monotonicity of conjunction, not a tool fact; the course runs are {{run:RUN-z3-missing-frame}} and {{run:RUN-z3-vacuity-trap}}. It corrects two spine sentences (§11, items 1–2).

**Lesson map.**

| ID | Tier | Title | KCs | Instruments | Graded families | Specimens · claims | Build this |
|---|---|---|---|---|---|---|---|
| S4.L1 | bridge | Hoare triples: partial and total | KC-4.hoare-triple | INS-derivation, INS-z3 | GEN-call-it | — | LAB-4.1 |
| S4.L2 | core | Weakest preconditions of assignment, by hand | KC-4.wp-assignment (threshold), KC-4.capture-avoiding-substitution | INS-derivation | GEN-wp-it | SP-4.2 | LAB-4.2 |
| S4.L3 | bridge | Sequence and conditionals | KC-4.wp-sequence-conditional | INS-derivation | GEN-wp-it | CL-4.1 | LAB-4.3 |
| S4.L4 | core | From commands to obligations; invariant versus inductive | KC-4.vc-shape, KC-4.symbolic-execution, KC-4.invariant-vs-inductive (threshold) | INS-derivation, INS-z3 | GEN-negate-it, GEN-cti-or-bug, GEN-call-it | — | LAB-4.4, after S4.L5 |
| S4.L5 | bridge | Encoding to SMT: sorts, primes, frames | KC-4.frame-condition | INS-z3 | GEN-negate-it; GEN-spec-it (§11, item 4) | SP-4.1 | LAB-4.4 |
| S4.L6 | core | The counterexample that can't happen | KC-4.cti-or-bug (threshold) | INS-z3 (M-cti-workbench), INS-interp | GEN-cti-or-bug | SP-4.3 · CL-4.4, CL-4.5 | LAB-4.6 |
| S4.L7 | bridge | Build the checker; prove or enforce | KC-4.prove-or-enforce, KC-4.vc-shape | INS-lane-a, INS-z3, INS-interp | GEN-negate-it, GEN-find-the-witness; GEN-which-stamp (§11, item 5) | CL-4.2 | LAB-4.5 |
| S4.L8 | bridge | The miscompiler: is the VC generator correct? | KC-4.trust-stack (threshold), KC-4.frame-condition | INS-z3 | GEN-find-the-witness, GEN-spot-the-gap | SP-4.4 | LAB-4.7 |
| S4.L9 | bridge | The trust stack | KC-4.trust-stack | INS-z3, INS-bench-smt | GEN-which-stamp, GEN-call-it | SP-4.5, SP-4.6, SP-4.7 · CL-4.3 (stretch) | LAB-4.8; LAB-4.9 (stretch) |

**Paths.** Default: S3 → S4 → S5. Builder's path (spine §3.0): S2 → S3 → S4 → S5.L9, after S5.L1–S5.L8, so ER-2 has already cracked SEAM-2 and CL-4.2 and CL-4.4 mint with it cracked (spine §5.4; §11, item 11). S4 crosses no soft edge.

**The fragment S4 reasons about.** LAB-3's commands, `requires g` (a failed guard returns `Err`, state unchanged, S3.L3) over one statement: a ResourceOp, as an update of the balance function, or a scalar `set` (resource fields cannot be assigned, S3.L2). S4 adds sequence, `if b then st₁ else st₂` and integer scalars to `IR@1` (§11, item 15). `Inv` is S3's: total zero, every account but `mint` non-negative; postings conserve by construction, so S4's obligations center on non-negativity and hold consistency, and conservation tests the encoding (S4.L2). Arithmetic is linear over `Int`; accounts are declared and finite (scalars) or unbounded (arrays, invariants shaped `∀k. linear(bal(k))`). No obligation observes the `List Effect`; claims say so with [N].

**Generator templates used in S4.** Template numbers are positions in spine §8.3. Distractors are misconception mutants, each tool-checked as distinct from the key; `unknown` instances are discarded and redrawn; seed shares are design parameters [D]. Families used without S4-specific bands (GEN-call-it t1 three-way and t4 multiple true/false; GEN-find-the-witness t1, model; GEN-spot-the-gap; GEN-which-stamp t1–t3) keep spine §8.3's graders.

| Family · template | Bands | Grader (key at grade time) | Distractor mutants (pick mode) |
|---|---|---|---|
| GEN-wp-it t1, assignment | B1: one scalar assignment. B2: ResourceOps as function updates, ≥ 25% aliasing seeds. B3: a quantified postcondition whose bound variable shares a parameter's name (≥ 50% of B3) | Z3 validity of `P ⇔ wp_ref`; on failure, a distinguishing state and the relation (stronger, weaker, incomparable) | Q unchanged; substitution reversed; captured substitution (all dp:O4); simultaneous update (dp:L7); equation for inequality (dp:O2) |
| GEN-wp-it t2, sequence | 2–4 commands; ≤ 1 `if` (B1), ≤ 3 (B2) | as t1 | composition reversed (dp:O4); a branch dropped (dp:O2) |
| GEN-wp-it t3, guarded command | `requires` (reject), `assert`, `assume`, Dijkstra's `if g → c fi` | as t1 | the other readings' formulas (dp:G3, dp:G4, dp:O5) |
| GEN-negate-it t1 single guard, t2 two-state | scalars, 2–4 accounts | Z3 checks P⇒R and R⇒P against the reference `Inv ∧ Guard ∧ Step ∧ ¬Inv′`, with a distinguishing state; a premise witness is mandatory | `Inv′` for `¬Inv′` (dp:Z1); guard negated (dp:G3); frame omitted (dp:O4) |
| GEN-negate-it t3, over accounts | arrays, one `∀` | as t2, in the array-property fragment | `∀`/`∃` swapped (dp:G5); update without frame (dp:O4) |
| GEN-cti-or-bug t1–t3 | 2–4 commands, 2–4 variables, traces ≤ 4 | Init⇒Inv, Inv∧Next⇒Inv′, Inv⇒Safe, then bounded reachability, bound printed; a "CTI" key carries a strengthening proved inductive at grade time (§11, item 13) | reachable for CTI (dp:O3, dp:G9); CTI for reachable (dp:O3); inductive for CTI (dp:Z1) |
| GEN-spec-it t3, postcondition with frame | 2–3 accounts | Z3 against the reference; requirement fit by true/false scenarios | frame missing (dp:O4); too strong (dp:O2) |

## 1. Lessons

Each lesson gives its objective, KCs, prerequisites (`requires` edges, then *recalls* without an edge), prequestions, segments (one instrument run, a Call It on the first run, a graded item), fading where F3 (S4.L2) or F4 (S4.L6) apply, exit items, Today cards (spine §4.1: FSRS at 0.85–0.90, first returns at about 1–3, 7, 21 and 45–60 days, sure-and-wrong calls back at about 1 day and 1 week), twin, sibling and "Build this". Segment titles are what the rail shows; none names an answer (V2-05).

### S4.L1 · bridge · Hoare triples: partial and total

**Objective.** State a Hoare triple `{P} c {Q}` for Transfer, check it as a Z3 validity query, and judge about five partial- and total-correctness claims about a fueled loop true or false (GEN-call-it template 4).
**KC.** KC-4.hoare-triple. **Requires.** KC-1.two-state-property. **Recalls.** KC-1.implication-vacuity (partial correctness is an implication), KC-3.termination-fuel, KC-3.big-step-errors.
**Setting.** `settle(fuel, pending)`, which exists only in this lesson's cells, captures one pending hold per iteration and returns `outOfFuel` if fuel runs out first. A postcondition speaks about every *finished* run (`ok` or `Err`); `outOfFuel` is an unfinished run. Partial correctness says nothing about unfinished runs; total correctness says there are none.

**Prequestion.** "With fuel 2 and 3 pending captures, which triples hold for `{Inv} settle {Inv}`?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| Both the partial and the total triple | | Total correctness needs every run to finish; this one always ends `outOfFuel` | dp:O5 |
| Partial holds, total fails | key | Partial reads "if it finishes, Inv holds". No run finishes, so the implication holds vacuously; total demands finishing | — |
| Total holds, partial fails | | Impossible: every total triple is also a partial triple | dp:O5 |
| Neither | | Partial fails only through a finished run that breaks Inv, and there is none | dp:G4 |

**Segment: a triple is a query (12–15 min).**

- *Run.* INS-derivation shows Transfer between pre- and postcondition; INS-z3 searches for a state that satisfies the precondition, takes the success step and violates the postcondition. For `{a ≥ 0 ∧ b ≥ 0 ∧ amount > 0 ∧ amount ≤ a} a := a − amount {a ≥ 0}` this is S1's guarded starter query, read as a triple.
- *Call It* (first run): `sat`, `unsat` or `unknown`? Chance 1/3. Key: `unsat` [X RUN-z3-starter]. Why: `sat` would need the guard to hold while the sender goes negative (dp:Z1); `unsat` means no state satisfies precondition ∧ step ∧ ¬postcondition, so the triple is valid for this encoding, if the solver is sound; `unknown` cannot arise in decidable linear arithmetic (dp:Z2).
- *The loop.* INS-z3 unrolls `settle` once per unit of fuel: fuel is an unrolling bound, previewing S4.L6's bounded search.
- *Graded item.* GEN-call-it template 4: about five generated loop scenarios (fuel, pending count, a body that may break Inv), keyed by bounded unrolling in Z3.

**Exit item.** GEN-call-it template 1: for a generated `(P, settle, Q, fuel)`, choose "total holds", "only partial holds" or "neither". **Today cards.** KC-4.hoare-triple from GEN-call-it templates 1 and 4. **Twin.** None. **Sibling.** None. **Reading.** *PLF* 7.1 (2026-08-24; read 2026-10-23 [V]), Hoare: "Hoare Triples, Informally" and "Formally", "Proof Rules" (Skip, Sequencing, Assignment, Consequence); D-10 maps its Rocq notation. **Build this.** LAB-4.1 (2 min): run the reference checker on the guarded Transfer and read its verdict, stamp and premise witness.

### S4.L2 · core · Weakest preconditions of assignment, by hand

**Objective.** On the Derivation Board, derive `wp(x := e, Q) = Q[e/x]` and a ResourceOp's WP as a function update, each step one Z3 validity query; substitute without capture under quantifiers; and judge a proposed P weakest, sufficient but stronger, or insufficient.
**KCs.** KC-4.wp-assignment (threshold), KC-4.capture-avoiding-substitution. **Requires.** KC-4.hoare-triple; inside the lesson, KC-4.capture-avoiding-substitution follows KC-4.wp-assignment (segment 3 after segment 1). **Recalls.** KC-1.quantifier-negation, KC-2.finite-map-update.

**Prequestions** (≤ 2 min; the answers come in the segments).

PQ1: "What must hold before `fee := fee + 2` so that `fee ≤ 10` holds after?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| `fee + 2 ≤ 10` | key | Substitute the assigned expression for `fee` in the postcondition | — |
| `fee ≤ 10` | | Copies the postcondition and ignores the assignment | dp:O4 |
| `fee ≤ 12` | | Substitutes in the wrong direction, as if undoing the assignment | dp:O4 |
| `fee + 2 = 10` | | Sufficient for one value only, so not the weakest | dp:O2 |

PQ2: "The invariant is `∀k. bal(k) ≥ 0`. `Debit(k, amt)` sets `bal(k) := bal(k) − amt`. Someone substitutes and gets `∀k. bal(k) − amt ≥ 0`. Is that the weakest precondition?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| Yes | | The parameter `k` was captured by the quantifier's `k` | dp:O4 |
| No, it is stronger than needed: it demands that every account cover `amt` | key | The capture-free WP is `bal(k) − amt ≥ 0 ∧ ∀j ≠ k. bal(j) ≥ 0` | — |
| No, it is weaker than needed | | The captured formula implies the right one, so it is stronger, not weaker | dp:O4 |
| No, the WP should mention only account k | | The other accounts must still be non-negative afterwards, so they stay in the WP | dp:O2 |

**Segment 1: substitution (12–15 min).**

- *Worked example first* (F3, rung L0): the board derives `wp(fee := fee + 2, fee ≤ 10)` and `wp(a := a − amount, a ≥ 0 ∧ b ≥ 0)` bottom-up, one labeled step per line, one principle prompt per revealed line, none on blanks.
- *Run.* The learner's first derivation. Each step is one Z3 validity query: an assignment step from Q (below) to P (above) is valid iff `P ⇔ Q[e/x]`; a consequence step iff `P ⇒ P′`, the reverse expected to fail; a simplification iff `P ⇔ P′`. Steps are checked against the learner's own previous line, so a slip is never counted twice.
- *Call It.* "The proposed precondition `fee ≤ 7`, for postcondition `fee ≤ 10` across `fee := fee + 2`: weakest, sufficient but stronger, or insufficient?" Chance 1/3. Key: sufficient but stronger {{run:RUN-z3-wp-transfer}} (that run records every authored S4.L2–S4.L3 cell, §11, item 14). Why: "weakest" is wrong because `fee = 8` also works (dp:O2). "Sufficient but stronger" is the key: `fee ≤ 7` implies `fee ≤ 8`, not conversely. "Insufficient" is wrong because every `fee ≤ 7` gives `fee + 2 ≤ 9` (dp:O4, substitution reversed).
- *Graded item.* GEN-wp-it template 1, band B1.

**Segment 2: functions are updated, not variables (12–15 min).**

- *Idea.* `move amt from f to t` is `bal := bal[f ↦ bal(f) − amt]` followed by `bal := bal[t ↦ bal(t) + amt]`, so its WP substitutes the *sequential* update of the balance function.
- *Run.* INS-derivation computes the WP of conservation over three accounts with the sequential update and with the simultaneous one, which reads both new balances from the old function.
- *Call It.* "Are the two WPs equivalent?" Options: equivalent; not equivalent, only at `f = t`; not equivalent, also where `f ≠ t`. Chance 1/3. Key: not equivalent, only at `f = t`: the simultaneous update changes the balance on self-transfer [X RUN-z3-selftransfer], and the same aliasing makes a refund theorem `unsat` under the sequential (modify) update but `sat` under the simultaneous (value) one when customer and merchant coincide [X RUN-z3-refund-a21]. Why: "equivalent" forgets aliasing (dp:L7); with distinct accounts the updates agree, so "f ≠ t" misplaces the difference (dp:S1). A re-find of SP-2.1's class in a new tool.
- *Graded item.* GEN-wp-it template 1, band B2, aliasing seeds included.

**Segment 3: capture (12–15 min).**

- *Run.* The board substitutes into `∀k. bal(k) ≥ 0` for `Debit(k, amt)` naively (capturing the parameter) and capture-free (renaming the bound variable first). Z3 finds the WPs inequivalent, with a distinguishing state; the obligation on the captured WP is `sat`, with a witness in which another account holds less than `amt`, no violation, since debiting `k` leaves it alone. SP-4.2 is mounted {{run:RUN-z3-capture}}.
- *Call It.* "Is `∀k. bal(k) − amt ≥ 0` equivalent to the capture-free WP, stronger, or weaker?" Chance 1/3. Key: stronger {{run:RUN-z3-capture}}. Why: "equivalent" ignores the capture (dp:O4); "weaker" reverses the implication (dp:O4); "stronger" holds because the captured formula quantifies the parameter away.
- The mirror case, a capture that *weakens* the WP and yields a false proof (an invariant "only account x may be negative" under `x := k`), appears as a generated B3 variant.
- *Graded item.* GEN-wp-it template 1, band B3 (capture-prone seeds).

**Fading plan (F3, KC-4.wp-assignment).** A 3-up, 1-down staircase over rungs L0, the derivation above; L1, the topmost (last-solved) line blank; L2, the top two blank; L3, all but the first blank; L4, a new shape (guarded, then quantified). No prompts on blanks; one principle prompt per revealed line (grades A and B [dp rows 10–12]).

**Exit items.** GEN-wp-it t1 at the current band; GEN-call-it t1 (weakest · stronger · insufficient) on a fresh P. **Today cards.** KC-4.wp-assignment (GEN-wp-it t1, B1–B2); KC-4.capture-avoiding-substitution (t1, B3). The threshold KC gets extra calls and returns in S4.L4, S4.L7 and S7.L6. **Twin.** None by design: Lean's `vcgen` appears only after the learner's own generator exists (S4.L9), so it cannot stand in for the hand derivation. **Sibling.** None. **Build this.** LAB-4.2: emit the WP of assignments and ResourceOps as SMT-LIB, graded by Z3 equivalence with the reference.

### S4.L3 · bridge · Sequence and conditionals

**Objective.** Derive WPs for sequences, `if` and guards under four readings; name the reading of `requires`; derive Transfer's WP by hand, minting CL-4.1 when Z3 finds it equivalent to the reference.
**KC.** KC-4.wp-sequence-conditional. **Requires.** KC-4.wp-assignment.

**The rules on the board.** `wp(c₁; c₂, Q) = wp(c₁, wp(c₂, Q))` and `wp(if b then c₁ else c₂, Q) = (b → wp(c₁,Q)) ∧ (¬b → wp(c₂,Q))`. For a guard g before a body c:

| Reading | When g fails | wp |
|---|---|---|
| Dijkstra `if g → c fi` | abort | `g ∧ wp(c,Q)` |
| `assert g; c` | an error to rule out | `g ∧ wp(c,Q)` |
| `assume g; c` | run ignored | `g → wp(c,Q)` |
| Mini-Plinth `requires g; c` (reject) | `Err`, state unchanged | `(g → wp(c,Q)) ∧ (¬g → Q)` |

The first two share a formula and differ in what failure means. The WP of n sequential `if`s copies Q up to 2ⁿ times, and `let` alone cannot share it, since each branch substitutes into its own copy. Naming each intermediate WP with `define-fun` over the state, or computing the state forward with `let` and `ite`, keeps the query linear; LAB-4.3 tests it.

**Prequestion.** "Transfer is `requires bal(from) ≥ amount; do move amount from from to to`. Which formula is `wp(Transfer, Q)` for a state predicate Q?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| `g ∧ wp(move, Q)` | | Treats a reject as an abort | dp:G3, dp:O5 |
| `g → wp(move, Q)` | | Treats a failing guard as a run that does not count; Mini-Plinth does run and leaves the state unchanged, so Q must hold of it | dp:G4 |
| `(g → wp(move,Q)) ∧ (¬g → Q)` | key | The reject reading: success must establish Q, and the unchanged state must already satisfy it | — |
| `wp(move, Q)` | | Ignores the guard | dp:O4 |

**Cells (one segment, 12–15 min).**

- *Run.* INS-derivation derives `wp(Transfer, Inv)` with sequence and guard steps. INS-z3 then compares an authored candidate, the assume-reading formula, with the reference.
- *Call It.* "Is the assume-reading candidate equivalent to the reference WP of Transfer?" Chance 1/2. Key: not equivalent; the distinguishing state has the guard false and Inv already false, where the assume reading says "fine" and the reject reading demands Q of the unchanged state {{run:RUN-z3-wp-transfer}}. Why: "equivalent" treats a false antecedent as irrelevant (dp:G4). "Not equivalent" is the key, for the reason stated.
- *Graded item.* GEN-wp-it template 3 (guarded command; the reading is given by the keyword).
- *Claim.* The learner's hand-derived WP of Transfer, once Z3 finds it equivalent to the reference, mints CL-4.1.

**Exit item.** GEN-wp-it template 2 (a sequence with one `if`). **Today cards.** KC-4.wp-sequence-conditional from GEN-wp-it t2 and t3. **Twin.** None. **Sibling.** None. **Reading.** *PLF* 7.1, Hoare: "Proof Rules" (Sequencing, Conditionals) and "Additional Exercises" (Assert and Assume); Hoare2: "Weakest Preconditions (Optional)" (read 2026-10-23 [V]). Optional: Dijkstra 1975, the sections that define the guarded-command statements and their weakest preconditions. **Build this.** LAB-4.3: conditionals and guards, including a sharing test.

### S4.L4 · core · From commands to obligations; invariant versus inductive

**Objective.** Build `Inv(S) ∧ Guard(S) ∧ Step(S,S′) ∧ ¬Inv(S′)` by WP and by forward symbolic execution, with Z3 confirming the routes agree; show why the reject branch needs no query; pair every `unsat` with a premise witness; sort four predicates into the 2×2 of *invariant* (true in every reachable state) × *inductive* (preserved by every step).
**KCs.** KC-4.vc-shape, KC-4.symbolic-execution, KC-4.invariant-vs-inductive (threshold). **Requires.** KC-4.wp-sequence-conditional, KC-1.violation-as-sat, KC-4.wp-assignment, KC-3.step-invariant. **Recalls.** KC-1.non-vacuity-check, KC-2.induction-principle, KC-1.two-state-property (drawer D-04).

**Prequestions.**

PQ1: "A checker asks Z3 for a state satisfying `Inv ∧ Guard ∧ Step ∧ ¬Inv′` and gets `sat`. What is established?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| The command preserves Inv | | Reads `sat` as "holds" | dp:Z1 |
| Some state satisfying Inv and the guard steps to a state violating Inv; whether that state is reachable is still open | key | The query starts from any Inv-state, reachable or not | — |
| A reachable state violates Inv: a real bug | | Reads a counterexample to the step as a reachable bug | dp:O3, dp:G9 |
| The solver could not decide | | That answer is `unknown` | dp:Z2 |

PQ2: "For a predicate I that holds in every initial state, which combination is impossible?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| Invariant and inductive | | Possible: segment 3's strengthened holds invariant | — |
| Invariant, not inductive | | Possible: segment 3 shows one | dp:G9 |
| Neither | | Possible: segment 3's I3 | — |
| Inductive, not invariant | key | Init ⇒ I and I ∧ Next ⇒ I′ give I in every reachable state, by induction on run length | — |

**Segment 1: the obligation, by weakest precondition (12–15 min).** Start from `Inv → wp(Transfer, Inv)` under the reject reading, `(g → wp(move,Inv)) ∧ (¬g → Inv)`. With Inv assumed the second conjunct is discharged, leaving `Inv ∧ g → wp(move, Inv)`: negated, the roadmap's obligation with `Step` folded into the substitution.
- *Run.* INS-z3 checks the reduction, then the obligation beside its premise witness `Inv ∧ Guard ∧ Step`, which must be `sat`.
- *Call It.* "Must the checker also query the reject branch, `Inv ∧ ¬Guard ∧ S′ = S ∧ ¬Inv′`?" Options: yes, it can be `sat`; no, it is `unsat` whenever Inv is assumed; only for self-transfer. Chance 1/3. Key: no {{run:RUN-check-fragment}}. Why: "yes" forgets that the reject branch leaves S unchanged, so `Inv′` is Inv (dp:G4); the key follows from that; "only for self-transfer" confuses the reject branch with aliasing (dp:L7).
- *Graded item.* GEN-negate-it template 2: write the violation query for a generated command and invariant; Z3 equivalence with the reference; premise witness mandatory.

**Segment 2: the obligation, forward (12–15 min).** Forward symbolic execution turns the body into equations over primed variables (`a′ = a − amt`, `b′ = b + amt`), and each untouched variable needs its own `c′ = c` (S4.L5). For a deterministic command, `∃S′. Step(S,S′) ∧ ¬Inv(S′)` and `¬wp(c, Inv)(S)` are equisatisfiable, because `Step` fixes S′ as a function of S.
- *Run.* INS-z3 checks `Step(S,S′) → (Inv(S′) ⇔ wp(c,Inv)(S))` for Transfer.
- *Call It.* "Can the two routes' queries for one deterministic command get different verdicts?" Options: never; when the guard fails; on self-transfer. Chance 1/3. Key: never, if both encode the same update {{run:RUN-check-fragment}}. Why: the key follows from the argument above; both routes carry the guard as a premise (dp:G4); a self-transfer difference needs the simultaneous update, S4.L2's bug (dp:L7).
- *Graded item.* GEN-call-it template 4: about five statements on the routes, such as "forward execution must state the frame; substitution leaves untouched variables alone" (true).

**Segment 3: invariant × inductive (12–15 min).** The holds model of one account, with `n : Amount` (so `n > 0`, S3.L2): `Hold(n)` requires `n ≤ bal − held` and sets `held += n`; `Capture(n)` requires `n ≤ held` and sets `held −= n`, `bal −= n`; `Release(n)` requires `n ≤ held` and sets `held −= n`; initially `bal ≥ 0`, `held = 0`. This abstracts one owner in S3's postings, where `hold n on x` posts `x → escrow h`: `held` is the owner's open escrow, `bal` its balance plus that escrow. Predicates: I1 `bal ≥ 0`; I2 `bal ≥ 0 ∧ 0 ≤ held ≤ bal`; I3 `held = 0`; I4 `bal < 0 ∧ held = 0`.
- *Run.* For each, INS-z3 checks Init ⇒ I and I ∧ Next ⇒ I′, and searches from Init to a bound.
- *Call It* on I1: "Is the inductive step `sat` or `unsat`?" Chance 1/2. Key: `sat`; the pre-state has `held > bal`, and a Capture drives `bal` below 0 {{run:RUN-z3-cti-pair}}. Why: `unsat` assumes a true invariant is inductive (dp:G9); `sat` is the key, for the pre-state just named.
- *The 2×2 fills* (keys {{run:RUN-z3-cti-pair}}, {{run:RUN-z3-inductive}}): I2 is invariant and inductive; I1 invariant, not inductive; I3 neither, since one Hold breaks it; I4 inductive, because no command is enabled from such a state, yet not invariant, because it fails at Init.
- *Graded item.* GEN-cti-or-bug, band 1, templates mixed (the verdict only; strengthenings come in S4.L6).

**Exit items.** GEN-call-it template 4 (the 2×2 as true/false statements on fresh predicates); GEN-negate-it template 2. **Today cards.** KC-4.vc-shape (GEN-negate-it t2); KC-4.symbolic-execution (GEN-negate-it t2 built from a forward trace); KC-4.invariant-vs-inductive (GEN-cti-or-bug, GEN-call-it t4). The threshold KC returns in S4.L6, S5.L9 and the S5 Defence. **Twin.** No separate card; S4.L6's card uses the same holds model. **Sibling.** None. **Build this.** LAB-4.4 (frame conditions), opened after S4.L5.

### S4.L5 · bridge · Encoding to SMT: sorts, primes, frames

**Objective.** Encode the obligation in SMT-LIB with sorts, primed constants and explicit frames; predict, then see, that dropping a frame conjunct yields a false alarm (an untouched account changes), never a false proof; revisit `Int` versus signed BitVec 64 at obligation level.
**KC.** KC-4.frame-condition. **Requires.** KC-4.vc-shape. **Recalls.** KC-1.encoding-is-the-claim, KC-2.finite-map-update.

**Frames, two ways.** With arrays, `bal′ = store(store(bal, f, …), t, …)` states the frame for free, since `store` copies every other index. With scalars, or relational constraints such as `select(bal′, f) = …`, every untouched location needs its own equation, tagged `frame_k` in LAB-4 (§2.2).

**Prequestion.** "Your emitter forgets `c′ = c` for an account Transfer does not touch. On a Transfer that really preserves Inv, what does the checker report?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| PROVED [P]: fewer constraints can only hide bugs | | The reverse: fewer premises admit more models | dp:O4 |
| A counterexample in which the untouched account changes | key | `c′` is free, so `¬Inv′` can be met at c | — |
| `unknown` | | The query stays in decidable linear arithmetic | dp:Z2 |
| The same verdict as before | | Inv mentions c, so a free `c′` can violate it | dp:O4 |

**Cells (12–15 min).**
- *Run 1.* INS-z3 on the three-account Transfer obligation with `c′ = c` deleted. *Call It:* `sat`, `unsat` or `unknown`? Chance 1/3. Key: `sat`, with `c′ < 0` while c is untouched {{run:RUN-z3-missing-frame}}. Why: `unsat` reverses monotonicity (dp:O4); the key holds because `c′` is free; `unknown` cannot arise (dp:Z2). Checked against the correct step relation, the witness is `unsat`, no step of Transfer, so S4.L7's replay will refuse it. SP-4.1 is mounted.
- *Run 2.* In signed BitVec 64 the obligation is `sat`: the guarded recipient wraps [X RUN-z3-bv64], S1.L5's SP-1.4 at obligation level.
- *Run 3 (optional).* Aliasing under arrays: the value-update and modify-update pair [X RUN-z3-refund-a21].
- *Graded item.* GEN-negate-it template 3: the violation query over arrays for a generated command; Z3 equivalence with the reference; premise witness mandatory.

**Exit item.** GEN-spec-it template 3 (a postcondition with its frame) for a generated two- or three-account command (§11, item 4). **Today cards.** KC-4.frame-condition from GEN-negate-it t3 and GEN-spec-it t3. **Twin.** None. **Sibling.** None. **Reading.** Drawer D-13 (SMT-LIB in one page); the Z3 guide (read 2026-10-23 [V]): Logic, "Basic Commands"; Theories, "Arrays" ("Select and Store", "Array models") and "Bitvectors". **Build this.** LAB-4.4: frame conditions.

### S4.L6 · core · The counterexample that can't happen

**Objective.** Given a satisfiable inductive step, decide "inductive", "CTI: strengthen the invariant" or "reachable: fix the command" with a bounded reachability search from Init in Z3, printing its bound; strengthen an invariant after a CTI until Init ⇒ Inv, Inv ∧ Next ⇒ Inv′ and Inv ⇒ Safe all hold; and choose between CL-4.4 and CL-4.5.
**KC.** KC-4.cti-or-bug (threshold). **Requires.** KC-4.invariant-vs-inductive. **Recalls.** KC-1.witness-class (confusable), KC-1.non-vacuity-check; on the builder's path, KC-5.bounded-scope.

**Prequestions.**

PQ1: "The inductive step for `bal ≥ 0` on the holds model returns the pre-state `bal = 0, held = 1`; a Capture of 1 makes `bal = −1`. What next?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| Fix Capture: it lets balances go negative | | Reads the CTI as a reachable bug | dp:O3 |
| Ask whether `held > bal` is reachable from Init; if not, strengthen the invariant | key | A CTI is a bug only if its pre-state is reachable | — |
| The property is false: the solver found a violation | | The violation is of the step, from an arbitrary Inv-state | dp:Z1, dp:O3 |
| Ignore it: pre-states are hypothetical | | Dismisses the CTI without checking reachability | dp:O3 |

PQ2: "A bounded search from Init finds no violation within 6 steps. What may the claim carry?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| PROVED [P] for every run | | Bounded presented as proof | dp:X1, dp:T5 |
| MODEL-CHECKED [M] · bound 6 · partial | key | A bounded search earns [M] with its bound (I10) | — |
| TESTED [T] · n = 6 | | Confuses a depth bound with a sample count | dp:X1 |
| REFUTED [R] | | No witness was found | dp:Z1 |

**Segment 1: two models, one CTI (12–15 min).** SP-4.3 on the CTI workbench (M-cti-workbench). The good model is S4.L4's; its twin's `Hold(n)` requires only `n ≤ bal`, forgetting existing holds. Both give the same CTI shape: a pre-state with `held > bal`.
- *Run.* INS-z3 searches from a symbolic Init on the twin, then the good model; INS-interp replays any trace.
- *Call It* on the twin, before the search: inductive, CTI, or reachable? Chance 1/3. Key: reachable in 3 steps (Hold, Hold, Capture) {{run:RUN-z3-cti-pair}}. On the good model the key is CTI, with no violation within the bound. Why: "inductive" ignores the `sat` step (dp:Z1); "CTI" on the twin misses that two Holds stack beyond the balance (dp:O3); "reachable" on the good model reads a CTI as a bug (dp:O3); each key is the search's result.
- *Graded item.* GEN-cti-or-bug templates 2 and 3, mixed: the verdict, plus a trace that INS-interp replays (k ≤ N) for "reachable", or a strengthening graded by Z3's three checks for "CTI".

**Segment 2: strengthen (12–15 min).**
- *Worked example first* (fading family F4, rung L0). From I1's CTI, the missing fact is "holds never exceed the balance": add `0 ≤ held ≤ bal`, then check Init ⇒ I2, the inductive step for I2 and I2 ⇒ I1, and mint CL-4.4.
- *Run.* INS-z3 on the strengthened step.
- *Call It:* `sat`, `unsat` or `unknown`? Chance 1/3. Key: `unsat` {{run:RUN-z3-inductive}}. Why: `sat` expects a further CTI, but every guard now keeps `held ≤ bal` (dp:O2); the key follows; `unknown` cannot arise in linear arithmetic (dp:Z2).
- *Graded item.* GEN-cti-or-bug template 2 in fix mode: complete a strengthening with one blank conjunct, graded by Z3.

**Segment 3: when strengthening stalls (12–15 min).** When no strengthening comes quickly, the honest claim is CL-4.5, "holds on every run of length ≤ N": [M] · bound N · partial, inductiveness [?] · CTI found, never [P].
- *Run.* INS-z3 searches to the learner's N on an invariant needing a two-conjunct strengthening; the output reads "none within N".
- *Call It.* "Which claim applies?" Options: CL-4.4 [P]; CL-4.5 [M] · bound 6 · partial; CL-4.5 with the CTI line deleted. Chance 1/3. Key: CL-4.5 [M] · bound 6 · partial {{run:RUN-z3-cti-pair}}. Why: CL-4.4 needs an `unsat` inductive step (dp:X1); deleting the CTI hides a defeater (dp:X2); the key prints the bound and keeps the defeater.
- *Graded item.* GEN-cti-or-bug, all templates, band 2, with the stamp chosen by spine §8.8.

**Worked example and fading plan (F4, KC-4.cti-or-bug).** L0, the full strengthening above; L1, the strengthening conjunct blank; L2, the conjunct and the Init check blank; L3, only the CTI given; L4, transfer to a new model (a two-account escrow). A 3-up, 1-down staircase; no prompts on blanks; one principle prompt per revealed line ("which fact excludes this pre-state?").

**Exit items.** GEN-cti-or-bug, one per template, interleaved. **Today cards.** KC-4.cti-or-bug: the first of the at least four CTI items Today interleaves through S9 (spine §4.1; GATE-items counts them). **Twin** (proposed, §11, item 6). TigerBeetle's flag `debits_must_not_exceed_credits` rejects a transfer when `debits_pending + debits_posted + amount > credits_posted`, and two-phase transfers reserve the pending amount so that a post or void never breaks the balance invariant (docs read 2026-10-23 [V] [tb2pc]; pin {{run:RUN-twin-pins}}). Tracing question: which conjunct of I2 does the flag enforce at reservation, and which Hold guard does it use? Drawer D-18 (optional): Apalache's inductive checks earn [M], never [P] alone. **Sibling.** None. **Build this.** LAB-4.6: CTI or reachable.

### S4.L7 · bridge · Build the checker; prove or enforce

**Objective.** Run your emitter on a command, decode a `sat` model into a Mini-Plinth state and replay it; decide per command whether to prove the obligation ([P] for the fragment, with a premise witness) or enforce it at commit ([E]: `unknown`, outside the fragment, or about concurrently changed state).
**KCs.** KC-4.prove-or-enforce, KC-4.vc-shape. **Requires.** KC-4.vc-shape. **Recalls.** KC-1.unknown-fails-closed, KC-1.three-answers.

| Checker output | Stamp | Action |
|---|---|---|
| `unsat`, premise witness `sat` and replayed | [P] · Z3 5.3.1 unsat · uncertified · rlimit N; "encoding unverified" open | no runtime check needed |
| `unsat`, premise witness `unsat` | none: vacuous | fix the encoding (S4.L8) |
| `sat`, witness replays | [R] · 1 step | fix the command |
| `sat`, witness does not replay | none; a defeater against the generator (§11, item 12) | fix the encoding |
| `unknown`, `rlimit` stop | [?] · reason | fail closed: [E] at commit |
| outside the fragment | [N] · construct named | [E] at commit |

`unknown` is real: `x**y == 8, y > 1` gives `unknown`, "incomplete (theory arithmetic)" [X RUN-z3-unknown-pow], and in the tab `rlimit` cancels where `timeout` never returned [X RUN-z3-budget-pyodide]. A per-command obligation also assumes one command at a time (SEAM-2), so invariants over concurrently touched data are enforced at commit until S6.

**Prequestion.** "On a command whose fee multiplies two parameters, your checker returns `unknown (canceled)` at its rlimit. What does the pipeline do?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| Treat it as proved: no counterexample was found | | `unknown` is no verdict | dp:Z2 |
| Reject the command: `unknown` means a bug | | `unknown` is no witness either | dp:Z1 |
| Mark it [?] and enforce the invariant at commit | key | `unknown` fails closed where it guards enforcement | — |
| Drop the fee conjunct so the query is linear, then stamp the original command [P] | | Proves a weaker obligation than the one claimed | dp:X4 |

**Cells (12–15 min).**
- *Run.* INS-lane-a runs your emitter (LAB-4.2–LAB-4.4) on an unguarded `Withdraw`. The host sends the SMT-LIB to INS-z3 and shows the raw model; you decode it; INS-interp replays it.
- *Call It* (first run): [P]; [R], a `sat` whose witness replays; a `sat` whose witness does not replay; [?]. Chance 1/4. Key: [R] {{run:RUN-check-fragment}}. Why: [P] would need the guard (dp:Z1); the key is a real overdraft; a non-replaying witness needs a missing frame or a capture, neither present here (dp:O4); [?] cannot arise in linear arithmetic (dp:Z2).
- *Graded item.* GEN-find-the-witness template 1: decode a printed Z3 model, array syntax included (the `Store(K(Int, 2), 3, 0)` form [X RUN-z3-refund-a21]), into a Mini-Plinth state. INS-interp replays it, and the violation must reproduce.

**Exit items.** GEN-which-stamp template 1, raw checker output to stamp and action, `unknown` → [?] → [E] included (§11, item 5); GEN-negate-it template 1. **Today cards.** KC-4.prove-or-enforce (GEN-which-stamp t1); KC-4.vc-shape (GEN-negate-it t1). **Claim and seam.** CL-4.2, minted in LAB-4.8, plants SEAM-5, "obligations checked on the source carry to the running code". **Clearinghouse.** Once LAB-4.5 passes, your checker gates the Clearinghouse's weekly proposals (W3-T14), each returning [P], [R], [?] or [N] from your own pipeline. **Twin.** None. **Sibling.** None. **Reading.** The Z3 guide, Theories, "Arithmetic" ("Basics", "Non-linear arithmetic"), read 2026-10-23 [V]. **Build this.** LAB-4.5 (capstone S10.L3): decode models and replay every [R].

### S4.L8 · bridge · The miscompiler: is the VC generator correct?

**Objective.** Locate a planted translation bug that makes a known-false obligation report [P], with the premise witness, a known-false fixture and a wrongly excluded state; tell a solver bug from a VC-generator bug by the evidence exposing each.
**KCs.** KC-4.trust-stack (threshold), KC-4.frame-condition. **Requires.** KC-4.vc-shape, KC-2.axioms-and-trust. **Recalls.** KC-1.non-vacuity-check, KC-1.implication-vacuity (drawer D-02).

| Planted bug | Premise witness | What catches it |
|---|---|---|
| Over-broad frame: `a′ = a` asserted for the account the command debits | `unsat`: the premises contradict | the premise witness (SP-4.4) |
| Guard strengthened in translation: source `amount ≤ bal(from) + 1`, emitted `amount < bal(from) + 1` | `sat`: not vacuous | a known-false fixture, then a state the emitted query excludes and the source admits |

| Evidence | Points at |
|---|---|
| A second solver disagrees, or a model fails the solver's own input | the solver or its entry path |
| Both solvers agree on a wrong verdict | the text both read: the VC generator (common-mode evidence, G11) |
| A `sat` witness that does not replay | the generator's step relation: incomplete |
| A known-false fixture reported [P] | the generator: unsound |

**Prequestion.** "A checker reports PROVED [P] for a command known to overdraw; Z3 and cvc5 both say `unsat`. Where is the bug most likely?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| In Z3 | | A solver bug is rarely shared by a separately built solver | dp:O5 |
| In both solvers | | Possible, but far less likely than one shared wrong input | dp:O5 |
| In the VC generator: both solvers read the same wrong text | key | Agreement rules out a lone solver bug, not a wrong query | — |
| Nowhere: two solvers agreeing settles it | | Takes authority for validation | dp:G8, dp:X2 |

**Cells (12–15 min).**
- *Run 1.* INS-z3 on a naive checker that stamps every `unsat` [P] without a premise witness, with the over-broad frame planted. *Call It:* its report on an unguarded Withdraw is [P], [R] or [?]? Chance 1/3. Key: [P], a false proof {{run:RUN-z3-vacuity-trap}}. Why: [R] expects the overdraft, but contradictory premises admit no state (dp:O5); the key follows; [?] cannot arise (dp:Z2). Adding the premise witness returns `unsat`, exposing vacuity. SP-4.4 is mounted.
- *Run 2.* The guard-strengthening miscompile on the off-by-one Withdraw. *Call It:* is its premise witness `sat` or `unsat`? Chance 1/2. Key: `sat` (recorded within {{run:RUN-z3-vacuity-trap}}, §11, item 14), so a premise witness cannot catch a false proof that is not vacuous. Why: `unsat` assumes every false proof is vacuous (dp:O5).
- *Graded item.* GEN-spot-the-gap on an audit variant, the checker's claim plus its emitted SMT-LIB: pick none: sound, G2, G8 or G11, and anchor typed evidence to lines.

**Exit item.** GEN-find-the-witness template 1: exhibit a state that the miscompiled query excludes and the source admits, and that violates Inv after the step; INS-interp replays it. **Today cards.** KC-4.trust-stack (GEN-spot-the-gap, GEN-find-the-witness t1); KC-4.frame-condition (GEN-spot-the-gap frame variants). **Twin.** Cedar proves its symbolic compilation to SMT sound and complete [cedar24]; SymCert (FMCAD 2026) verified production SMT analyses in Lean, and its proofs caught encoder bugs; pin {{run:RUN-twin-pins}}. Tracing question: which half of Cedar's theorem rules out the missing frame, and which the strengthened guard? (Completeness, then soundness.) **Sibling.** None. **Reading.** Cedar [cedar24] (arXiv 2407.01688, 2024), its symbolic-compilation soundness and completeness results; SymCert (FMCAD 2026), abstract and evaluation. **Build this.** LAB-4.7: miscompile your own checker and keep it in `broken/`.

### S4.L9 · bridge · The trust stack

**Objective.** Stamp a solver-only result "uncertified"; cross-check an authored `unsat` with cvc5 on the Bench; read a solver-bug replay and a holed certificate; compare your obligation with Lean's experimental `vcgen` as a dated twin; place each failure in its layer.
**KC.** KC-4.trust-stack. **Requires.** KC-4.vc-shape, KC-2.axioms-and-trust.

| Layer | Must get right | S4 evidence | Stamp effect |
|---|---|---|---|
| Requirement | Inv means the rule | true/false scenarios | requirement-fit, never [P] |
| Semantics | the S3 Lean reference | kernel-checked goldens | — |
| VC generator | exactly the fragment's steps | [T] equivalence and replay; stretch CL-4.3 | "encoding unverified" |
| Solver, entry path | `unsat` means no model | a second solver; certificates (deferred) | "uncertified" |
| Instrument | Pyodide Z3 = native; INS-interp = Lean | GATE-conformance; GATE-interp (SEAM-13) | the badge |

**ER-7 opens with a forecast** (M-erosion-forecast): restate CL-1.1 from memory, then call which segment cracks once the solver it trusts is shown fallible. Key: the assumption record, "solver soundness" (SEAM-7). Remedies offered: the cvc5 cross-check, the "uncertified" qualifier, and the deferred certificates drawer D-32, which ER-7 surfaces in Today.

**Prequestion.** "CL-1.1 reads '[P] · Z3 5.3.1 unsat · uncertified · rlimit N'. What does 'uncertified' admit?" Chance 1/4.

| Option | Key | Why | Misconception |
|---|---|---|---|
| No human reviewed it | | Review is not what the qualifier records | dp:X2 |
| It rests on the solver being sound; no independent certificate was checked | key | The qualifier names the trusted solver | — |
| The encoding was not checked | | That is the separate defeater "encoding unverified" | dp:O5 |
| The result is bounded | | That would be [M] | dp:X1 |

**Cells (12–15 min).**
- *Run 1* (a recorded replay of a dated incident, SP-4.5). Z3 issue #11179's two inputs are satisfiable (input 1 at y = 2). Through the SMT-LIB command interpreter, after `(push 1)`, 5.3.0 returns `unsat` on both and 5.3.1 `unknown`; 4.15.4 and 5.1.0 return `unsat` on input 1 [X RUN-z3-11179]. Through the Python API's `from_string`, all four versions return `unknown` (`research/evidence/a2r3/out/z3_11179.txt`; §11, item 9). *Call It:* input 1, 5.3.0, command interpreter: `sat`, `unsat` or `unknown`? Chance 1/3. Key: `unsat` [X RUN-z3-11179]. Why: `sat` is the truth, which this version missed (dp:G8); `unknown` is 5.3.1's answer; the key is the recorded output. The bug sits in nonlinear real exponentiation, outside `miniplinth check`'s fragment; what carries over is that an `unsat` names its solver, version and entry path, and stays "uncertified" until something independent checks it.
- *Run 2.* cvc5 on S1's guard query returns `unsat` with a 19-line Alethe proof that contains a `hole` step, "untranslated rewrite" [X RUN-cvc5-alethe] (SP-4.6): a certificate can be partial.
- *Card* (SP-4.7). Lean's experimental `vcgen` proves `transfer`'s contract under `requires 0 < amt ∧ amt ≤ a`; with `0 < amt ∧ 0 ≤ a` and `ensures r => 0 ≤ r.1` it leaves the unproved goal `0 ≤ (a - amt, b + amt).fst` {{run:RUN-lean-vcgen}}. Your checker gives `sat` on that obligation, witness class `a = 0, amt = 1`: an unprovable VC and a satisfiable negation are two faces of one obligation. The 4.35.0 reference calls `vcgen` "experimental and subject to change" (read 2026-10-23 [V]); on a custom command type it is {{run:RUN-vcgen-cmd}}.
- *Graded item.* GEN-which-stamp template 2 (complete the qualifier): from "Z3 5.3.1 unsat; cvc5 1.4.2 unsat; no certificate; premise witness sat" to "[P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified", with the open defeater "encoding unverified".

**Exit item.** GEN-call-it template 4: about five failures sorted by layer (solver, entry path, VC generator, semantics, requirement). **Today cards.** KC-4.trust-stack (GEN-which-stamp t2 and t3, GEN-call-it t4); a D-32 card. After the exit item, Which-is-it sets A (which stamp) and C (gap class) may take up to half a Today session (spine §4). **Twin.** Lean's `vcgen`, above. **Sibling.** None. **Reading.** Lean 4.35.0 reference, ch. 17 "The vcgen tactic", §§17.1–17.3; the `vcgen` tutorial's "Preconditions and Postconditions" and "Control Flow" (read 2026-10-23 [V]); https://github.com/Z3Prover/z3/issues/11179 (2026-10-15). **Build this.** LAB-4.8: the cvc5 cross-check and claim cards; LAB-4.9 (stretch): VC-generator soundness in Lean.

## 2. LAB-4: `miniplinth check`; capstone S10.L3

### 2.1 Lanes and division of labor

LAB-4.1 runs the reference module in the tab (it earns nothing). LAB-4.2–LAB-4.7 are Lane A: your Rust as wasm with the zero-import ABI (D-14), graded in a fresh worker on seeds drawn at grade time by INS-z3 and INS-interp (badge *re-checked here*). LAB-4.8 (`statespace check lab4.8`, native Z3 and cvc5) and the stretch LAB-4.9 (`lake comparator`) are Lane B receipts (*reported from your machine*).

**The template supplies** the `IR@1` reader, the vocabulary, the output format, the fragment declaration, the host and the fixtures (known-true and known-false obligations: the third-account fee fixture, the off-by-one Withdraw, capture-prone postconditions). **You write** everything the stages name: WP emission, the forward step with frames, decoding, the CTI driver, a miscompile and its fix, and claim cards.

### 2.2 The contract (proposed for the template and D-14; §11, item 17)

- **Exports**, pure functions over JSON strings: `wp_emit`, `vc_emit` (route `wp` or `forward`), `model_decode`, `bmc_emit(system, inv, k)`, `verdict_compose`. The host runs Z3 between calls; the module imports nothing.
- **Vocabulary.** State symbols from `IR@1` (`bal` and the hold table as arrays, or one scalar per declared account); post-state suffix `_p`; parameters `p_<name>`. One `assert`, shared through `let` and `define-fun`, no extra `declare-const`: equivalence with the reference is then quantifier-free over a fixed vocabulary.
- **Named conjuncts** `guard`, `step_<i>`, `frame_<k>`, `inv_pre`, `neg_inv_post` (`(! … :named …)`), through which LAB-4.c4 and `statespace defend` mutate the text whatever the code's structure.
- **Output lines**: `command`, `fragment`, `query` (SHA-256), `solver` (version, `rlimit`, entry path), `verdict`, `premise`, `stamp` (for example `PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N`), `defeaters`.

### 2.3 Stages and checks

| Stage | Title | Min | Check: exact pass condition |
|---|---|---|---|
| LAB-4.1 | Run the reference checker on the guarded Transfer | 2 | LAB-4.c1: verdict `unsat`, stamp `PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N`, and a premise witness that satisfies `Inv ∧ Guard ∧ Step` and replays as a successful step {{run:RUN-check-fragment}}; the witness is graded by checking it, never by matching values |
| LAB-4.2 | WP of assignments and ResourceOps, as SMT-LIB | 25 | LAB-4.c2: on 20 fresh seeds [D] of GEN-wp-it t1 shapes (aliasing and capture-prone seeds included), `wp_emit` is Z3-equivalent to the reference on every seed; a failing seed shows its distinguishing state; `unknown` seeds are redrawn and counted; the per-seed `rlimit` is printed |
| LAB-4.3 | Conditionals and guards | 25 | LAB-4.c3: the same on 20 fresh t2 and t3 seeds, all four guard readings; plus a chain of 12 sequential `if`s [D] whose query must stay within the check's size and time limits, which copying Q at every `if` does not |
| LAB-4.4 | Frame conditions | 25 | LAB-4.c4: (i) on 20 fresh known-true obligations over ≥ 3 accounts, the forward route reports [P] with a replaying premise witness; (ii) every `frame_<k>` is load-bearing: deleting it turns `unsat` into `sat`, with account k changing; (iii) the two routes agree on every seed |
| LAB-4.5 | Capstone S10.L3: decode models into Mini-Plinth states and replay them | 25 | LAB-4.c5: on the fixtures and 10 fresh seeds [D], every [R] decodes into a state INS-interp replays to the same violation, and every premise witness replays as a success; a non-replaying decode is reported "spurious: VC-generator defect", never [R] (tested with an injected frame-less query) |
| LAB-4.6 | CTI or reachable | 25 | LAB-4.c6: on 10 generated invariants [D], the output ("inductive", "CTI", "REACHABLE in k", "none within N") matches the reference on every seed; every REACHABLE trace replays in INS-interp with k ≤ N; every bounded verdict prints N (I10); CL-4.4 or CL-4.5 is chosen as spine §8.8 directs |
| LAB-4.7 | Miscompile your own checker; keep it in `broken/` (the roadmap's adversarial exercise) | 25 | LAB-4.c7: (1) `broken/` reports [P] on a fixture whose reference verdict is [R], through a strengthened guard, a dropped effect or an over-broad frame (a dropped frame conjunct only gives a false alarm, §11, item 1); (2) its premise-witness status is recorded (`sat`: non-vacuous; `unsat`: vacuous); (3) `fixed/` reports [R] with a replaying witness; (4) fixture and semantics hashes match across builds; (5) reverting the hunk tagged `MISCOMPILE` restores [R], so "locate" is graded |
| LAB-4.8 | cvc5 cross-check on the Bench; claim cards (write stage) | 15 | LAB-4.c8: cvc5 1.4.2 and Z3 5.3.1 agree on every authored `unsat` in your fixtures and claims; a disagreement fails the check and becomes a specimen candidate, never an override; CL-4.2 and CL-4.4 or CL-4.5 pass claim@1 validation, their statement hashes match the receipt, and each "if weakened" witness refutes its own proposition |
| LAB-4.9 | `[stretch]` VC-generator soundness for assignment and `if`, in Lean | 25 (§11, item 18) | — |

### 2.4 Receipt (receipt@1, written by LAB-4.8)

`lab`, `stage`, `lane`, `createdAt`; `environment` (devcontainer digest, OS, sandbox `on | off | failed`); `tools[]` with binary SHA-256 (Z3 5.3.1; cvc5's version string verbatim, `1.4.2-modified` for the pip wheel [X RUN-cvc5-alethe]); `statements[]` (`claims/inv-*.smt2`, IR files and emitted queries, hashed over `trimRight` text plus a newline); `runs[]` per query (engine, version, entry path, argv, input SHA-256, `rlimit`, exit code, verdict lines verbatim, `reason_unknown`); `z3`; `checks[]` (c1–c8, Lane A results keeping their badge); `claims[]` (CL-4.2, CL-4.4 or CL-4.5); `tcb[]` (your VC generator, unverified; the printer; Z3; cvc5; INS-interp at [T] against goldens); `provenance` (self-reported). Every verdict line is parsed, no exit code is trusted alone, and a changed statement hash voids the claim to [?].

### 2.5 Hint ladders

An explanation gate opens every ladder. **R0** for every check: write a teach-back of the failing check (what it tested, the invariant, your hypothesis), then reveal three authored ideas and tick those you covered; self-assessed, never credited. R1 opens after a good-faith teach-back of at least 12 words. Past R2, work is credited as assisted until an unseen variant passes.

| Check | R1 concept | R2 where to look | R3 fragment (≤ 3 lines) | R4 informal argument |
|---|---|---|---|---|
| c1 | a premise witness shows the premises can hold together | the `premise` line | — | `unsat` alone may be vacuous |
| c2 | WP is substitution; ResourceOps substitute sequential updates | `subst` on `forall`; the order in `move` | `Forall(y,b) => { let y2 = fresh(y, fv(e) ∪ fv(b)); Forall(y2, subst(rename(b,y,y2), x, e)) }` | substituting under ∀y binds a free y of e; renaming first prevents it |
| c3 | each guard reading has its own WP; name intermediate WPs | the guard's value in the distinguishing state; the chain's query size | `emit(define_fun(q_i, state, wp_rest)); wp(If(b,c1,c2)) = and(implies(b, app(q_i, post(c1))), implies(not(b), app(q_i, post(c2))))` | an application costs one node, a copy the whole formula, and twelve copies double twelve times |
| c4 | a forward step states every untouched location unchanged | the deleted `frame_<k>` | `for k in accounts \ writes(cmd) { emit(named(eq(post(k), pre(k)), frame(k))) }` | without it `post(k)` is free and `¬Inv′` holds at k |
| c5 | a witness claims something of the semantics, so it must replay | decoded state against the interpreter's | `if !replays(decode(m)) { report(Spurious(VcgDefect)) }` | a non-replaying model is a step the semantics forbids: the encoding is incomplete |
| c6 | a `sat` step is not yet a bug | `bmc_emit`'s unrolling and Init | `for k in 0..=n { if sat(bmc(k)) { return Reachable(k) } }` | reachability makes the CTI a bug; a strengthening makes it unreachable |
| c7 | dropping premises cannot yield [P]; over-constraining can | the guard's comparison; the fee fixture's write set | `emit(lt(amount, plus(bal(from), 1))) // MISCOMPILE: source says le` | a stronger guard excludes the overdrawing boundary state |
| c8 | two solvers catch solver bugs, not encoding bugs | the disagreeing query's hash | — | agreement leaves "encoding unverified" open |

### 2.6 Prove-it

Agent closed; predict first; `statespace defend` mutates your checker and grades with Z3 and replay.

| Mutation | Predict | Key from |
|---|---|---|
| delete one `frame_<k>` | frame fixture: `sat`, reported spurious (the witness changes account k and does not replay) | Z3 + INS-interp |
| delete `guard` | Transfer: `sat`, reported spurious (the witness violates the guard, so replay rejects the command); Deposit: [P] unchanged (sound) | Z3 + INS-interp |
| a capture-prone postcondition into `wp_emit` | equivalent if you rename; otherwise stronger, and a spurious `sat` | Z3 equivalence |
| drop LAB-4.6's strengthening conjunct | inductive becomes CTI; none within N | Z3 |
| `≤` emitted as `<` in a guard | [P] on the off-by-one fixture; premise witness still `sat` | Z3 |
| signed BitVec 64 mode, if you built one | Transfer: [R] through the recipient wrap [X RUN-z3-bv64] | Z3 |

### 2.7 Challenge pack for LAB-4.9 (Lean 4.35.0, core only, `autoImplicit false` [X RUN-lean-ledger])

The read-only `Challenge` module pins `Var`, `State := Var → Int`, `AExp`, `BExp`, a quantifier-free assertion language `Form`, `Cmd` (`assign`, `seq`, `ite`), a total `exec`, `holds`, `substF` and the generator `wpF`. The statements:

```lean
theorem subst_sound (Q : Form) (x : Var) (e : AExp) (s : State) :
    holds (substF Q x e) s ↔ holds Q (fun y => if y = x then aeval e s else s y)
theorem wp_sound (c : Cmd) (Q : Form) (s : State) :
    holds (wpF c Q) s → holds Q (exec c s)
```

`comparator.json`, in the measured format [X RUN-lean-comparator]: `{"challenge_module": "Challenge", "solution_module": "Solution", "theorem_names": ["subst_sound", "wp_sound"], "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}`. `sorryAx`, `_native` and custom axioms are rejected, as in S2 [X RUN-lean-axioms]. The theorem concerns the Lean `wpF`, a model of your Rust generator, so CL-4.3's correspondence cites LAB-4.c2–c3 ([T] · n seeds). Quantifiers, and so capture, stay out of `Form`.

## 3. Specimens

Labels follow spine §5.1; *found in* and *tool version* come from each run record. "Kept" needs a re-find on a fresh variant after 7 days or more: SP-4.1 and SP-4.4 via GEN-spot-the-gap, SP-4.2 via GEN-wp-it B3, SP-4.3 via GEN-cti-or-bug, SP-4.5–SP-4.7 via GEN-which-stamp.

| ID · lesson | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-4.1 Missing frame · S4.L5 | a model of the frame-less Transfer obligation in which an untouched account changes (`c′ < 0`) | nothing real: a false alarm, since the model is no step of Transfer and does not replay | the emitted step omits `c′ = c`, leaving `c′` free | the run states it as an Optimize objective on \|c′ − c\| | one frame equation per untouched location, or `store`; LAB-4.c5's replay gate | {{run:RUN-z3-missing-frame}}; label corrected (§11, item 2) |
| SP-4.2 Capture · S4.L2 | account k covers `amt`, another account j has `0 ≤ bal(j) < amt` | equivalence with the reference WP; downstream, a spurious `sat` | parameter `k` captured by `∀k` | Optimize objective on `bal(j)`, recorded in the run | rename the bound variable before substituting | {{run:RUN-z3-capture}} |
| SP-4.3 CTI and its reachable twin · S4.L6 | good model: CTI pre-state `bal = 0, held = 1`, unreachable; twin: Hold, Hold, Capture from Init drives `bal` below 0 | twin: `bal ≥ 0`; good model: only I1's inductiveness | the twin's Hold ignores existing holds | twin trace shortest within the search | good: strengthen to I2; twin: guard `n ≤ bal − held` | {{run:RUN-z3-cti-pair}} |
| SP-4.4 The vacuity trap · S4.L8 | none: `Inv ∧ Guard ∧ Step` is `unsat` | KC-1.non-vacuity-check | an over-broad frame asserts `a′ = a` beside `a′ = a − amt` with `amt > 0` | — | a premise witness beside every `unsat`; fix the frame's write set | {{run:RUN-z3-vacuity-trap}} |
| SP-4.5 The solver was wrong · S4.L9 (dated incident) | input 1 of Z3 issue #11179 is satisfiable at y = 2 | solver soundness (SEAM-7) | a defect in nonlinear real exponentiation: through the command interpreter 5.3.0 answers `unsat` on both inputs, 5.3.1 `unknown`, and 4.15.4 and 5.1.0 `unsat` on input 1 | the issue's inputs | pin 5.3.1; a second solver; certificates (D-32) | [X RUN-z3-11179]; API path `research/evidence/a2r3/out/z3_11179.txt` |
| SP-4.6 A certificate with a hole · S4.L9 | cvc5's Alethe proof of S1's guard query has a `hole` step, "untranslated rewrite" | the belief that a certificate is a complete independent check | some rewrites are not translated into Alethe | — | count holes; treat a holed certificate as partial; Carcara stays deferred (D-32) | [X RUN-cvc5-alethe]; hole count not citable (§11, item 10) |
| SP-4.7 `vcgen` and the dropped guard · S4.L9 | unproved goal `0 ≤ (a - amt, b + amt).fst` under `0 < amt ∧ 0 ≤ a` | the contract `ensures r => 0 ≤ r.1` | the guard omits `amt ≤ a` | your checker's witness class `a = 0, amt = 1` | restore `amt ≤ a` | {{run:RUN-lean-vcgen}}; custom command type {{run:RUN-vcgen-cmd}} |

## 4. Claim templates

Six fields plus the requirement row, rendered with the strip *proposition-of-model · correspondence · requirement-fit*; requirement-fit is never [P]. Cards fade from receipt-prefilled (method, tool, version) to learner-written (proposition, "if weakened").

| Field | CL-4.1 hand WP of Transfer = reference (S4.L3) | CL-4.2 `miniplinth check` discharges the fragment's obligation (S4.L7, LAB-4.8) | CL-4.4 Inv is inductive (S4.L6, LAB-4.6) | CL-4.5 Safe on runs of ≤ N steps (instead of CL-4.4) | CL-4.3 VC-generator soundness (stretch; S4.L9, LAB-4.9) |
|---|---|---|---|---|---|
| Proposition | learner's `wp(Transfer, Inv)` ⇔ reference WP | each fragment command: `Inv ∧ Guard ∧ Step ⇒ Inv′`; the reject branch by S4.L4's reduction | Init ⇒ Inv; Inv ∧ Next ⇒ Inv′; Inv ⇒ Safe | no run from Init of ≤ N steps reaches ¬Safe | `subst_sound`, `wp_sound` |
| Assumptions | [A] reference encodes S3; Z3 sound (SEAM-7); SEAM-1 | [A] encoding unverified (open defeater; [T] from LAB-4.c2–c5); solvers sound (SEAM-7); one command at a time (SEAM-2); unbounded integers (SEAM-1); SEAM-5, planted here | as CL-4.2 | as CL-4.2, plus N | [A] Lean 4.35.0 kernel (SEAM-15, held) |
| Model | Transfer, scalars, `Int` | S3 semantics on the fragment | the holds model or your command set | the same, unrolled | the pinned toy language |
| Method | Z3 5.3.1 `unsat` of ¬(WP_learner ⇔ WP_ref) | Z3 5.3.1 `unsat`, cvc5 1.4.2 agreeing; premise witness replayed; `rlimit` N | Z3 `unsat` of each negation | bounded search to depth N | `lake comparator` |
| Correspondence | formula-level only | source level (SEAM-5); replay via INS-interp (SEAM-13); effects [N] | source level | source level | `wpF` models your Rust generator: [T] · n seeds (LAB-4.c2–c3) |
| If weakened | the reference reads the guard as an abort: they differ where the guard fails and Inv holds | SEAM-1 weakened to signed BitVec 64: `sat` via the recipient wrap [X RUN-z3-bv64] | drop `held ≤ bal`: `sat` at `bal = 0, held = 1` | Hold's guard weakened to `n ≤ bal`: REACHABLE in 3 | a quantifier with naive substitution breaks `subst_sound` |
| Requirement | [A] the README's "no account goes negative"; holds [N] | [A] Inv states the README's rule | [A] | [A] | [N] ResourceOps, frames, reject reading |
| Stamp | [P] · Z3 5.3.1 equivalence · uncertified | [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified | [P] · Z3 5.3.1 unsat · uncertified (the inductive step) | [M] · bound N · partial; inductiveness [?] · CTI found | [P] · Lean 4.35.0 kernel · axioms listed (+ "6 checkers" after `--paranoid` [X RUN-lean-comparator]) |
| Status | {{run:RUN-z3-wp-transfer}} | {{run:RUN-check-fragment}} | {{run:RUN-z3-inductive}} | {{run:RUN-z3-cti-pair}} | {{run:RUN-lean-vcgen-soundness}} |

## 5. Seams and erosions

| Item | Endpoint 1: planted | Endpoint 2: cashed | Segment cracked | Remedies | Ships |
|---|---|---|---|---|---|
| SEAM-5 → ER-5 | S4.L7 · CL-4.2 (LAB-4.8) | S9.L7 · SP-9.1, a write hoisted above its guard | correspondence: source obligations do not reach the target | a preservation proof, or per-command translation validation | W5 |
| SEAM-7 → ER-7 | S1.L3 · CL-1.1 | S4.L9 · SP-4.5 | assumption record: solver soundness | the cvc5 cross-check; the "uncertified" qualifier; D-32 surfaced in Today | W3 |

ER-7's forecast item is the S4.L9 call above. Both endpoints precede their cash-in on the default and builder's paths, which W3-T12's property test replays. S4's claims also carry SEAM-1 (cashed by ER-1 in S6.L4) and SEAM-2 (cashed by ER-2 in S5.L3), which the spine does not list for them (§11, item 11). Every S4 replay rests on the held SEAM-13.

## 6. Audit anchors

Five-step flow (spine §6). Agent claims render as quoted UNREVIEWED text. Cases are scheduled after LAB-4 and re-checked a week later.

| ID | Class | Statement shown first | Sound twin | Flawed variant | Typed evidence | Based on | Key |
|---|---|---|---|---|---|---|---|
| AUD-4.1 | G8 | agent PR: "`miniplinth check` REFUTED Transfer: account 3 goes negative; I added `bal(3) ≥ 0` to the guard." | the witness replays (the guard really was missing) and the fix restores it | the generator omits `frame_3`; Transfer never touches account 3; the witness does not replay; the "fix" edits a sound command | the witness anchored to the missing frame line, plus its failed replay | SymCert, FMCAD 2026, pp. 238–247 (DOI 10.34727/2026/isbn.978-3-85448-093-8_30): proofs caught encoder bugs; https://www.amazon.science/publications/symcert-verifying-smt-based-policy-analyses | {{run:RUN-z3-missing-frame}} (§11, items 3, 14) |
| AUD-4.2 | none: sound | "Z3 proved the command preserves Inv; the emitted query omits one conjunct." | Deposit; the query omits the guard `amount ≤ limit`: a dropped premise strengthens the obligation, so [P] stands | Withdraw guarded by `amount ≤ bal`; the query drops `held′ ≤ bal′` from `¬Inv′` (G1) | sound: a restatement; flawed: `bal = 5, held = 5`, Withdraw 5 | Erdős problem #124: "= 1" written for "≥ 1" (2025-11); https://www.erdosproblems.com/forum/thread/124 | {{run:RUN-check-fragment}} (§11, item 14) |
| AUD-4.3 | G13 | agent PR after a CTI on `bal ≥ 0`: "Fixed a reachable overdraft in Capture with `requires held ≤ bal`." | strengthen to I2; Capture unchanged (CL-4.4) | the CTI's pre-state is unreachable; the "fix" edits a correct command | the pre-state unreachable within the bound and excluded by I2's proof, plus the diff | Spec-Harness (arXiv 2604.00280, 2026-04): agents changed code in 5.6% of tasks; https://arxiv.org/abs/2604.00280 | {{run:RUN-z3-cti-pair}} |

**Variants** (mutation-generated, keys recomputed by the checker, toward ≥ 6 exemplars per class): dropped or over-broad frame, dropped effect, capture (G8); a dropped `¬Inv′` conjunct (G1); a contradictory hypothesis (G2); `Int` claimed for `i64` (G4); "none within N" stamped PROVED (G5); an affected solver's `unsat` without "uncertified" (G6e); "two solvers agree, so the encoding is certified" (G11); a CTI "fixed" in the command (G13); sound: guard dropped from the query, a checked strengthening, a cross-checked `unsat` with premise witness. GEN-spot-the-gap serves them to Today (0–1 per session), the Clearinghouse and the Defence.

## 7. The Defence (S4)

Untimed, over at least two sessions within a week of LAB-4, agent closed, with a call on every Part A item.

**Part A, probes (12 items, ~35 min, 4 families).** GEN-wp-it t1 B2, t1 B3, t3, t2 (the completion test "derive obligations by hand for assignments and conditionals"); GEN-negate-it t2 twice (KC-4.vc-shape; KC-4.symbolic-execution from a forward trace) and t3 (KC-4.frame-condition); GEN-cti-or-bug t1–t3; GEN-which-stamp t1 (KC-4.prove-or-enforce) and t3, which layer (KC-4.trust-stack; the completion test "tell solver correctness from VC-generator correctness").

**Part B, defend (4–6 mutations, ~20 min).** §2.6's mutations of the learner's checker: always the frame deletion, the capture-prone postcondition, the guard deletion (sound) and the dropped strengthening; also `≤` as `<` and BitVec 64 when present. They act on named conjuncts or inputs, so every mutant builds (GATE-labs).

**Part C, audit (4 cases, ~20 min).** From AUD-4.1–AUD-4.3 and variants, at least one sound, the session's sound share seeded in 30–60%, typed evidence anchored to lines.

**Part D, explain-back (~10 min; required, uncredited).** Two minutes aloud on why a satisfiable inductive step is not yet a bug, then a three-idea self-check against Part A.

**Sign-off** follows spine §8.6: A–C at least 75% overall and each at least 60% (at most one miss in a part of five or fewer items), Wilson interval shown (10 of 12 gives 0.55–0.95 [D]), plus fresh items on S4's eleven KCs right in three spaced sessions; a failed part is retaken on fresh seeds after at least 3 days.

## 8. Drawers

D-10 (PLF's Rocq notation: S4.L1, S4.L3); D-13 (SMT-LIB in one page: S4.L5, LAB-4.2 onward); D-18 (Apalache: S4.L6, optional); deferred D-32 (certificates), surfaced in Today by ER-7. Linked but listed elsewhere in the spine: D-02 (S4.L8), D-04 (S4.L4), D-06 (LAB-4.8) and D-14 (LAB-4.2 onward) (§11, item 19).

## 9. Reading list

| Reading | Sections | Used in | Dated |
|---|---|---|---|
| *PLF* (*Software Foundations* vol. 2) | Hoare: "Hoare Triples, Informally" and "Formally", "Proof Rules" (Skip, Sequencing, Assignment, Consequence, Conditionals), "Additional Exercises" (Assert and Assume). Hoare2: "Decorated Programs", "Formal Decorated Programs" (Extracting Verification Conditions), "Weakest Preconditions (Optional)" | S4.L1–S4.L3, optional (D-10) | 7.1, 2026-08-24; read 2026-10-23 [V] |
| Z3 guide | Logic: "Basic Commands", "Quantifiers". Theories: "Arithmetic" (Basics, Non-linear arithmetic), "Arrays" (Select and Store, Array models), "Bitvectors" | S4.L5, S4.L7 | read 2026-10-23 [V] |
| Lean 4.35.0 reference and `vcgen` tutorial | ch. 17, §§17.1–17.3; "Preconditions and Postconditions", "Control Flow" | S4.L9 | read 2026-10-23 [V] |
| Lamport, "Using TLC to Check Inductive Invariance" | §1 "Inductive Invariance" | S4.L4, S4.L6 | 2018-08-23 |
| Schultz, Dardik, Tripakis, arXiv 2205.06360 | the definition of a CTI | S4.L6, optional | 2022-05-12 |
| TigerBeetle docs | Account `flags.debits_must_not_exceed_credits`; "Two-Phase Transfers", "Interaction with Account Invariants" | S4.L6 twin | read 2026-10-23 [V] |
| Cedar [cedar24]; SymCert (FMCAD 2026) | symbolic compilation, its soundness and completeness; SymCert's evaluation | S4.L8 twin | 2024; 2026 |
| Dijkstra (CACM 18(8)); Flanagan and Saxe (POPL) | guarded commands and their WPs; compact VCs | S4.L3, LAB-4.3, optional | 1975; 2001 |
| Z3 issue #11179 | the report and its two inputs | S4.L9 | 2026-10-15 |

## 10. Time budget

| Component | Hours | Basis [D] |
|---|---|---|
| Read | 1.5–3.0 | §9; PLF optional |
| Lessons | 3.5–5.5 | 3 core at 40–60 min; 6 bridges at 15–25 min |
| Build | 2.5–5.1 | LAB-4.1 (2 min) plus LAB-4.2–LAB-4.7 (6 × 25 min): 152 nominal minutes, up to 2×; no Lean proof stage outside the stretch |
| Write | 0.25–0.5 | LAB-4.8 (15 min) |
| Defence | 1.0–1.5 | four parts, two sessions |
| **Total** | **8.8–15.6** | 1.9–3.3 weeks at 6 h/week (4.75 h of stage work); 1.1–1.9 weeks at 10 h/week (8.25 h) |

The roadmap's 3–6 weeks are 14.25–28.5 h of stage work; the high estimate is under the upper bound and the low above half the lower bound (7.1 h), so GATE-budget passes without warning. Like S3–S9, S4 plans below the lower bound; logged times replace these figures after W3. LAB-4.9 is excluded. Eleven KCs add about 11 × 10 reviews × 2 min ≈ 3.7 h of Keep work over 60 days [D]. Specimens or claims arrive in S4.L2, L3, L5, L6, L8 and L9.

## 11. Spine issues

1. **LAB-4.7 (§3.4) cannot be done as worded.** Dropping a frame conjunct only turns `unsat` into `sat` (a false alarm, never [P]); flipping a guard gives a spurious `sat` whose witness replays as a rejection. False proofs need over-constraint: a guard strengthened in translation, a dropped effect, an over-broad frame. Reword as LAB-4.c7 does; Defence Part B keeps the frame deletion, keyed as a false alarm.
2. **SP-4.1's label (§5.1)** says a missing frame "'proves' a false theorem"; it yields a counterexample in which an untouched account changes, which replay refuses. Relabel accordingly.
3. **AUD-4.1 (§6.2)**: state that its flawed claim is a REFUTED (or "fix") on a non-replaying witness; a missing frame cannot support a false PROVED.
4. **GEN-spec-it** claims S4 (§8.3) but no S4 row names it; add template 3 to S4.L5.
5. **S4.L7's objective** (prove or enforce) has no graded family (§3.0); add GEN-which-stamp template 1.
6. **S4.L6 lacks its twin**; add TigerBeetle's pending-aware balance invariant [tb2pc] to §3.4, pinned in RUN-twin-pins.
7. **Confusable edges without a set.** KC-4.wp-assignment ↔ KC-4.symbolic-execution and KC-4.vc-shape ↔ KC-4.invariant-vs-inductive ↔ KC-4.cti-or-bug ↔ KC-1.witness-class fall in none of sets A–G (§4). Add set H, "obligation verdicts", opening at S4.
8. **Misconception granularity.** dp:O4 joins substitution direction, capture and missing frames; dp:O5 joins partial/total, vacuity and solver/generator. Split them (the L2 report's O4–O7 is a start) and add "a dropped premise yields a false proof" and "agreeing solvers certify the encoding".
9. **RUN-z3-11179 (§9.5)** cites only `z3_11179_cli.txt`; register `z3_11179.txt` (the API path: `unknown` on all four versions) in the same run, and add an entry-path field to receipt@1's `z3` block (§9.4), as the A2 review advised.
10. **RUN-cvc5-alethe**: the proof file is not on disk, so the number of `hole` steps cannot be cited; re-run with it committed.
11. **Seam carriers (§5.3).** CL-4.1, CL-4.2, CL-4.4 and CL-4.5 rest on SEAM-1, and CL-4.2, CL-4.4 and CL-4.5 on SEAM-2, as CL-2.4 does; list them so ER-1 and ER-2 propagate. On the builder's path they mint with SEAM-2 cracked.
12. **§8.8 lacks a row** for a `sat` model that does not replay: "no stamp; a defeater against the VC generator".
13. **GEN-cti-or-bug keys (§8.3).** "None within N" does not prove a CTI's pre-state unreachable. A "CTI" instance should carry a strengthening proved inductive at grade time; instances with neither a trace nor a strengthening are discarded.
14. **Run scope.** Authored S4 cells and AUD-4.x keys need runs: S4.L2–S4.L3 cells under RUN-z3-wp-transfer, the non-vacuous miscompile under RUN-z3-vacuity-trap, AUD-4.1 under RUN-z3-missing-frame, AUD-4.2 under RUN-check-fragment, AUD-4.3 under RUN-z3-cti-pair; or new run IDs.
15. **Sequence and conditionals.** S3's v0 body is one statement, without `if`; S4's completion test and CL-4.3 need both. State in §3.4 and W3-T04 that LAB-4's template adds `seq`, `if` and integer scalars to `IR@1` (W2-T08) with reference semantics.
16. **ID collision.** The digest's misconception tags G1–G9 and S1–S4 collide with gap classes and stage IDs; adopt the stage specs' `dp:` prefix in the spine's ID table.
17. **LAB-4's ABI is unspecified.** Equivalence grading needs a fixed vocabulary and `statespace defend` needs named conjuncts; put §2.2 into D-14 or W3-T04's acceptance.
18. **LAB-4.9** proves whole Lean theorems, so by §3.0 it is `[weekend]` at 45 minutes, still `[stretch]`.
19. **Drawer "Used in" (§3.12)**: add S4 to D-02, D-04, D-06 and D-14 if GATE-links derives it from content.
