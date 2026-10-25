# S2 Proof (Lean 4): curriculum spec

**Status:** authoring spec for W2 (W2-T04 lessons, W2-T05 the self-explanation unit, W2-T02 LAB-2 and its challenge pack, W2-T06 ladders, W2-T10 runs, W2-T11 GEN-proof-structure and GEN-defend, W2-T12 the Defence, W2-T13 anchor variants). **Date:** 2026-10-23; updated 2026-10-25 for spine revision 3. **IDs:** every ID comes from `docs/spine/SPINE.md` (revision 3); anything the spine lacks is listed in §13 rather than invented silently, each item there ending with its revision 3 outcome.

**Sources, in precedence order:** the roadmap's Stage 2; executed runs (`research/spikes/`, `research/evidence/lean-measure/`, `a2r3/out/lean_*.txt`, `A5r3/comp-run*.log`); the brief; the digests; R1 and L2 with their verification logs; the A2–A4 reviews; the spine.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run W2-T10 records before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D follow the pedagogy digest. Learner copy appears in quotation marks after "Copy:"; everything else is for authors. Learner copy uses only the spine's §0 glossary terms and plain English, says "your system" for the learner's own product, and never uses internal names (lane, Shelf, docket, pocket checker, Hall of Records, proof debt, Judgment).

---

## 0. The stage at a glance

**Promise.** Prove a small program correct, then say exactly what the proof establishes and what it does not.

**New tool.** Lean 4.35.0, core plus Std, `autoImplicit false` [X RUN-lean-ledger]; no Mathlib, because a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib]. First contact is read-only Goal Replay in the tab (S2.L0); the Bench arrives before LAB-2.1 through the devcontainer (D-15), whose toolchain unpacks to 3.0 GB [X RUN-lean-toolchain], stated before the install. Roadmap time: 3–6 weeks. A "this will feel harder" card opens the stage (M-feels-harder, B [deslauriers19]); technical note 1 follows the Defence; the Lean keep-alive starts after sign-off.

| ID | Tier | Title | Minutes | KCs introduced | Cells with a call | Specimens · claims |
|---|---|---|---|---|---|---|
| S2.L0 | bridge | Reading a proof line by line | 15–20 | KC-2.proof-reading | 1 | — |
| S2.L1 | bridge | The Natural Number Game, first | 15–25 (+ game play, §12) | KC-2.induction-principle | 1 | — |
| S2.L2 | bridge | Lean as a language; propositions as types | 15–25 | KC-2.props-as-types | 1 | — |
| S2.L3 | bridge | Tactics transform goals | 15–25 | KC-2.goal-state-reading | 1 | — |
| S2.L4 | bridge | Induction you can explain | 15–25 | (KC-2.induction-principle, second lesson) | 1 | — |
| S2.L5 | core | Two accounts, conserved, and what the theorem says | 40–60 | KC-2.theorem-statement-reading | 3 | SP-2.2 · CL-2.1 |
| S2.L6 | bridge | Rejection and non-negativity | 15–25 | KC-2.rejection-unchanged, KC-2.automation-scope | 1 | CL-2.2, CL-2.3 |
| S2.L7 | core | Sequences of transfers: generalize first | 40–60 | KC-2.generalized-ih | 2 | SP-2.3 · CL-2.4 |
| S2.L8 | bridge | Many accounts: function update and self-transfer | 15–25 | KC-2.finite-map-update | 1 | SP-2.1 · CL-2.5 |
| S2.L9 | core | The trusted kernel, and the day it was wrong | 40–60 | KC-2.axioms-and-trust | 3 | SP-2.4, SP-2.5, SP-2.6 |
| S2.L10 | core | Every checker agrees; none read the requirement | 40–60 | KC-2.kernel-not-requirement, KC-2.statement-pinning | 3 | SP-2.7, SP-2.8, SP-2.9 |

**KCs of S2** (spine §4; four threshold KCs, each with extra calls, a spiral return and a later Defence):

| KC | Threshold | Requires | First taught | Spiral returns |
|---|---|---|---|---|
| KC-2.proof-reading | | — | S2.L0 | every S2 strip |
| KC-2.props-as-types | threshold | KC-2.proof-reading | S2.L2 | S2.L5; S3.L1 |
| KC-2.goal-state-reading | | KC-2.props-as-types | S2.L3 | S2.L5–S2.L7 |
| KC-2.induction-principle | | KC-2.proof-reading | S2.L1, S2.L4 | S2.L7 (confusable) |
| KC-2.generalized-ih | threshold | KC-2.induction-principle | S2.L7 | S3.L6 (F2), S9.L1, the keep-alive |
| KC-2.theorem-statement-reading | | KC-2.props-as-types, KC-1.quantifier-negation | S2.L5 | S2.L8, S2.L10 |
| KC-2.rejection-unchanged | | KC-2.goal-state-reading | S2.L6 | S3.L3 |
| KC-2.finite-map-update | | KC-2.theorem-statement-reading | S2.L8 | S3.L7 (confusable); S6.L2 |
| KC-2.axioms-and-trust | threshold | KC-2.props-as-types | S2.L9 | S3.L9, S4, S9.L9 |
| KC-2.automation-scope | | KC-2.goal-state-reading | S2.L6 | S2.L9 |
| KC-2.kernel-not-requirement | threshold | KC-2.theorem-statement-reading | S2.L10 | set B (S5); S10 |
| KC-2.statement-pinning | | KC-2.axioms-and-trust | S2.L10 | S3, S9 |

Order inside lessons respects every `requires` edge (spine §12 item 6). Confusable sets A ("which stamp") and C ("gap class") open in S2, so M-which-is-it starts here, after the exit items, within the spine's confusable edges.

**Roadmap completion tests, and where each is graded:**

| Completion test | Taught | Graded | Defence |
|---|---|---|---|
| Proofs contain no `sorry` | S2.L9 | GEN-which-stamp t1; comparator at LAB-2.c2–c6 | Part A items 1–2 |
| Explain the induction and the theorem statements without reciting tactics | S2.L4, S2.L5, S2.L7 | GEN-proof-structure t2, t3; GEN-call-it t4 | Part A items 5–8; Part D (uncredited) |
| Kernel acceptance establishes the formal proposition, not business intent | S2.L9, S2.L10 | GEN-call-it t4 | Part A items 10–12; Part C (AUD-2.1) |

**Sequence (default path).** S2.L0 → S2.L1 (with the Natural Number Game) → S2.L2 → LAB-2.1 → S2.L3 → S2.L4 → S2.L5 → LAB-2.2 → S2.L6 → LAB-2.3, LAB-2.4 → S2.L7 → LAB-2.5 → S2.L8 → LAB-2.6 → S2.L9 → S2.L10 → LAB-2.7 → Defence → technical note 1. On the builder's path S2 follows S8.L1–S8.L4, so SP-5.1 exists when CL-2.4 mints (§6). Test-out is open for every S2 KC; the "From kernelspace" placement never pre-credits induction (V2-20).

**Glossary schedule:** Goal Replay at S2.L0; parked goal at LAB-2; all other terms come from S1.

**Content blocks** (V2-18, at most six; spine §12 item 48): prose, instrument, item, claim, specimen and card. The prequestion, the graded item (the spine's segment item) and the exit item are item roles; Build this, the twin card (the spine's production twin), the dated incident and the "this will feel harder" card are card roles; a Call It sits inside its instrument cell, and a table is prose.

---

## 1. Conventions in this file

**Call It, the interpretation tap and tags** follow the S1 spec's §1: confidence bands with chance 1/k, CBM payoffs as feedback only, the first call final; after each solver or checker verdict the learner taps "holds", "violated" or "can't tell" before the stamp. Tags are the pedagogy digest's catalog IDs written `dp:…`. One entry is proposed, evidence "—", kept only if it draws errors: **dp:L9 (proposed)** a green build or a zero exit code read as a checked proof (seeded by SP-2.4, SP-2.6, SP-2.8).

**The proof bank.** Lean cannot run in the tab, so the Lean items of GEN-proof-structure, GEN-call-it and GEN-which-stamp draw from original ledger-flavored instances (transfer variants, list recursions with and without a threaded state, `Nat` recursions, pointwise updates) elaborated at build time on the pinned toolchain. Next-goal keys are the strips; needed-hypothesis keys come from hypothesis deletion in CI; distractors are misconception mutants checked distinct from the key. At least 12 instances per template per KC [D] keep the 60-day dose unrepeated; GATE-replay regenerates the bank on each toolchain bump. No item reproduces a Natural Number Game level. No instance proves a theorem that a LAB-2 stage asks for (Q-1): the transfer variants leave out LAB-2's own `transfer`, the threaded-state recursions leave out its `run`, and the Defence's Part A draws from the same banks. The variants that LAB-2's hint ladders keep unseen (§3.3) stay out of every bank too: a reverse-direction transfer, a fee-charging transfer, a transfer with a fee field, a deposit `run` and a three-account split.

**Parallel theorems** (Q-1; spine §12 item 52). S2's worked examples, strips, fading rungs and Proof Blocks prove the theorems below. Their proofs use the same moves as the proofs LAB-2 asks for, but none of them is a LAB-2 theorem. `transferPos` is a transfer with another guard shape (it also rejects a zero amount), so it collides with none of the variants that §3.3 keeps unseen, and `runPos` threads it through a list. Each strip is recorded in {{run:RUN-lean-s2-cells}} (§11).

```lean
def transferPos (s : Ledger) (n : Int) : Ledger :=
  if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s
def runPos (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => runPos (transferPos s n) ns
```

| Parallel theorem | Says | Used in | Stands beside |
|---|---|---|---|
| `transferPos_nonneg` | from `0 ≤ s.a` and `0 ≤ s.b`, both balances after `transferPos s n` are non-negative | S2.L0, S2.L6 | `transfer_nonneg` (LAB-2.4) |
| `transferPos_conserves` | `total (transferPos s n) = total s` | S2.L3, S2.L5 | `transfer_conserves` (LAB-2.2) |
| `runPos_conserves` | `total (runPos s ns) = total s` | S2.L7 | `run_conserves` (LAB-2.5) |
| `mints_from_7`, `fixed_from_7` | on a balance of 7 and an amount of 3, the buggy update gives 10 and the fixed one 7, each by `decide` | S2.L8 | `selftransfer_mints` and `selftransfer_fixed` (LAB-2.6) |

**Strips and messages** quoted here show shape only: shipped strips come from INS-goal-replay under GATE-replay, whose method is recorded on Ledger.lean's two reference proofs [X RUN-lean-plaingoal], and Lean call keys are recorded outputs under GATE-calls (nightly). Fading rungs are written "rung 0"–"rung 4" (the spine's L0–L4).

**Worked examples** (A [barbieri23]; B [renkl02][hilbert08]). Correct examples first. After S2.L0 no worked example carries a self-explanation prompt; revealed steps may carry one principle prompt (F1–F6; in S2, family F1 at S2.L7); no blank carries any prompt.

**Manual mode** (C [keenan26]). In LAB-2.2–LAB-2.4 `statespace check` scans the stage's proof for `grind`, `omega`, `lia`, `simp_arith`, `decide`, `native_decide`, `bv_decide` and `try?` and records the result. The stage's check fails while the scan finds automation in the taught theorem. Nothing else waits on it: the claim may still mint, with its method field naming the automation (M-manual-mode; §13 issue 17).

---

## 2. Lessons

### S2.L0 · bridge · Reading a proof line by line

**Objective.** For a highlighted line of a short ledger proof, select the hypothesis, definition or earlier line that licenses it (graded); write a three-part self-explanation (the move, the reason, the goal it serves) for three lines and compare it with a model (uncredited).
**KCs.** KC-2.proof-reading. **Prerequisites.** None (S1 recommended; nothing locks). **Instrument.** INS-goal-replay, read-only: the manual proof of `transferPos_nonneg`, a parallel theorem (§1, Q-1) {{run:RUN-lean-s2-cells}}, the first Lean the learner sees. **Generator.** GEN-proof-structure. **Minutes.** 15–20. **Evidence.** Self-explanation training g = 0.55 [bisra18]; a proof booklet d = 0.95 (Experiment 1), retention evidence thin (A/B [hodds14]).
**Reading pointer (dated).** TPIL §5.4 "Structuring Tactic Proofs" (read 2026-10-23), optional.

**Adaptation and replacement (OD-10, changed 2026-10-25; W2-T05).** *A, the default:* adapted from the Loughborough self-explanation booklet's text under the CC BY-SA 4.0 that page 1 of its PDF states, with no request to its authors: text only (its three rights-reserved images excluded), in its own directory with the license file, credit, a change note and share-alike. *B, the replacement:* if the authors ever object, the original unit below under the course license; it quotes nothing from the booklet.

**Prequestion** (k = 4, chance 1/4). Copy: "A proof reaches the line 'so 0 ≤ a − n'. Which response explains the line rather than repeats it?" A "The sender's new balance is not negative." · B "The allowed branch gives n ≤ a, and taking at most a away from a leaves at least 0; this is the sender's half of the goal." · C "This line is correct." · D "The proof shows the balances stay non-negative." **Key:** B. **Why** A: a paraphrase restates the line and adds no reason (dp:X2). B: it names the move, the fact that licenses it and the goal it serves. C: a verdict with no reason is validation by surface (dp:X2). D: a summary of the whole proof, not of this line (dp:L4).

**Segment · One line at a time** (12–15 min; one run: the strip cell)

1. *Model* (about 4 min). A four-line informal proof, in the moves of the strip below, that an allowed `transferPos` keeps the sender non-negative; each line carries a model self-explanation (move · reason · goal) beside a labeled paraphrase.
2. *Practice* (about 6 min). The same proof as a Lean strip:
   ```lean
   theorem transferPos_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
       0 ≤ (transferPos s n).a ∧ 0 ≤ (transferPos s n).b := by
     unfold transferPos
     split
     · next hg => exact ⟨Int.sub_nonneg_of_le hg.2, Int.add_nonneg hb (Int.le_of_lt hg.1)⟩
     · exact ⟨ha, hb⟩
   ```
   For three lines the learner types a self-explanation, reveals the model and ticks the ideas covered (prompt-and-compare; self-assessed, never credited).
3. **Call It** on the strip cell's first run, before the second branch is revealed (k = 4, chance 1/4). Copy: "The second branch closes with `exact ⟨ha, hb⟩`. Why is that enough?" A "In the rejected branch the state is unchanged, so the starting facts are the conclusion." · B "The guard makes both balances positive." · C "`exact` accepts any term." · D "It is not enough; Lean will report an error." **Key:** A. **Why** A: `transferPos` returns `s` when the guard fails, and `ha`, `hb` already say what is needed. B: here the guard is false and licenses nothing (dp:L4). C: `exact` succeeds only when the term's type is the goal (dp:L1). D: the strip shows the branch closing (dp:L4). **Surprise forecast:** no.

**Graded item.** GEN-proof-structure template 3 (needed hypothesis). The seed picks a reading-bank instance of three to six lines with at least three local hypotheses, and highlights one line; options are the local hypotheses plus the goal. **Key:** the hypotheses whose deletion breaks that line in CI. Distractors: a hypothesis present but unused (dp:X2), the goal itself (circular, dp:L6), the line's own conclusion (dp:L6). The reading bank holds no LAB-2 theorem (Q-1).

Copy at the close: "From here on, worked examples no longer ask you to explain each line. At most one short principle question follows a step once it is revealed, and blanks never carry a question. Keep asking the three questions yourself." (§1's rule applies from S2.L1.)

**Exit item.** Template 3, fresh seed → KC-2.proof-reading. **Today cards.** KC-2.proof-reading. **Twin card.** None. **Sibling bridge.** None. **Build this:** install the Bench before LAB-2.1. Copy: "Open the devcontainer and run `statespace doctor` until it is green (D-15). The toolchain unpacks to 3.0 GB [X RUN-lean-toolchain]." Not cut-eligible (spine §14).

---

### S2.L1 · bridge · The Natural Number Game, first

**Objective.** Play the Natural Number Game's required worlds (Tutorial, Addition, Multiplication, Implication) as far as is useful; on a generated goal, select the induction hypothesis the successor case needs (GEN-proof-structure template 3). Stating it in words is an uncredited explain-back.
**KCs.** KC-2.induction-principle (first of two lessons). **Prerequisites.** KC-2.proof-reading. **Instruments.** A disclosed, uncredited link-out to the Natural Number Game, https://adam.math.hhu.de/#/g/leanprover-community/NNG4 (OD-4), with drawer D-08 as the fallback; the strip cell is INS-goal-replay. **Generator.** GEN-proof-structure. **Drawer.** D-05. **Minutes.** 15–25 for the lesson; game play 3–5 h, budgeted under Build (§12).
**Reading pointer (dated).** The game's four required worlds (list read 2026-10-23 from the repository's `Game.lean`; Apache-2.0); optional: Power, Advanced Addition, ≤, Advanced Multiplication, Algorithm. TPIL §7.4 "Defining the Natural Numbers" (read 2026-10-23).

Copy: "The game runs its own Lean version, so a few tactics behave differently on the Bench. Its progress stays in the game; the course does not credit it."

If the game offers a less restrictive rules setting, the card names it (dated reading). Nothing in the course waits on the game's progress (§13 issue 18).

**Prequestion** (k = 4, chance 1/4). Copy: "You prove P(n) for every natural number n by induction. In the step for d + 1, what may you assume?" A P(d) · B P(d + 1) · C P(n) for every n · D nothing, because P(0) already covers it. **Key:** A. **Why** A: the step proves P(d + 1) from P(d); with P(0), every n is covered. B: that is the goal; assuming it is circular (dp:L6). C: that is the theorem itself (dp:L6). D: the base case covers 0 only (dp:L6).

**Segment · After the game** (12–15 min; one run: the strip of an original lemma, `credit2 k = k + k`, where `credit2` counts k deposits of 2) {{run:RUN-lean-s2-cells}}

**Call It** before the `k + 1` case is revealed (k = 4, chance 1/4). Copy: "Which fact closes the `k + 1` case after `credit2` is unfolded?" A `ih : credit2 k = k + k` · B `credit2 (k + 1) = (k + 1) + (k + 1)` · C `credit2 0 = 0` · D none: `rfl` closes it. **Key:** A. **Why** A: unfolding leaves `credit2 k + 2`; rewriting with the hypothesis for k leaves linear arithmetic. B: the goal itself (dp:L6). C: the base case says nothing about k (dp:L6). D: with a variable k, computation alone does not close it (dp:L2). **Surprise forecast:** no.

**Graded item.** GEN-proof-structure template 3 on fresh seeds from the `Nat`-recursion bank (doubling, k deposits of c, one fee per step). Options: the hypothesis for the predecessor, the goal, the base-case fact, an unrelated lemma. **Key:** by hypothesis deletion in CI.

**Explain-back** (uncredited). Copy: "Say the base case and the step without naming a tactic."

**Exit item.** Template 3, fresh seed → KC-2.induction-principle. **Today cards.** KC-2.induction-principle. **Twin card.** None. **Sibling bridge.** None. **Build this:** the Bench install (D-15), if not done; LAB-2.1 comes after S2.L2. Cut list: #2; its KC moves to S2.L4 and the game stays as the reading card's link-out.

---

### S2.L2 · bridge · Lean as a language; propositions as types

**Objective.** Predict what `#eval` of `transfer` prints; select the term proving `n ≤ s.a` from the guard; classify declarations as a proof, a computation or "does not elaborate" (GEN-call-it template 1). Writing `transfer` and a proof term by hand, on the Bench or the disclosed live.lean-lang.org link-out ("code leaves your machine"), is ungraded practice.
**KCs.** KC-2.props-as-types (threshold). **Prerequisites.** KC-2.proof-reading. **Instrument.** INS-goal-replay: recorded `#eval`, `#check` and message outputs. **Generators.** GEN-proof-structure, GEN-call-it. **Drawer.** D-02. **Minutes.** 15–25.
**Reading pointer (dated).** TPIL §3.1 "Propositions as Types", §3.2 "Working with Propositions as Types", §3.3.1 "Conjunction" (read 2026-10-23).

**Prequestion** (k = 4, chance 1/4). Copy: "In `(h : 0 ≤ n ∧ n ≤ s.a)`, what is `h`?" A a Boolean that happens to be true · B evidence: a term whose type is the proposition · C a check the program runs · D a comment for the reader. **Key:** B. **Why** A: a `Prop` is not a `Bool` (dp:L1). B: propositions are types; a proof is a term of that type. C: nothing runs; the type checker checks `h` (dp:L1). D: delete `h` and any proof that uses it breaks (dp:L1).

**Segment · Values and evidence** (12–15 min; one run: the definitions cell, followed by the proof-term cell)

**Call It** on the first run of `#eval transfer { a := 10, b := 0 } 3` (k = 4, chance 1/4). A `{ a := 7, b := 3 }` · B `{ a := 10, b := 0 }` · C `{ a := 13, b := -3 }` · D an error: Lean definitions do not run. **Key:** A [X RUN-lean-axioms]. **Why** A: 0 ≤ 3 ≤ 10, so 3 moves from `a` to `b`. B: the rejected branch, but the guard holds (dp:L4). C: wrong direction (dp:L4). D: `transfer` is an ordinary computable function (dp:L1). **Surprise forecast:** no.

Then the proof-term cell: `theorem guard_gives_cover (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) : n ≤ s.a := h.2`, the second component of the conjunction's evidence. Written with `def`, it draws a linter warning to use `theorem` {{run:RUN-lean-s2-cells}}. Copy: "`theorem` marks a proof, which nothing computes with; `def` marks data."

**Forward pointer: dependent types** (roadmap S2 theory). Copy: "The type of `h` mentions `s` and `n`, which come before it. A type that depends on values is a dependent type; in S3 you use one to make amounts that carry a proof that they are positive." The dependent-type lesson is S3.L2 (`Amount := {n : Int // 0 < n}`, KC-3.refined-types); S2 names the idea and grades nothing on it (§13 issue 16).

**Graded item.** GEN-call-it template 1 (three-way verdict). The seed picks a short bank declaration: a ledger function, a term proof (a projection, an anonymous constructor, a hypothesis), or an ill-typed variant. Verdicts: "proves its statement", "a computation", "does not elaborate". **Keys:** build-time elaboration. Distractor rationales tagged dp:L1 and dp:L4.

**Exit item.** GEN-proof-structure template 3 ("which term proves the target": `h.1`, `h.2`, `h`, `⟨h.2, h.1⟩`) → KC-2.props-as-types. **Today cards.** KC-2.props-as-types, with two extra generated calls in its first 60 days (threshold). **Twin card.** None. **Sibling bridge.** None. **Build this:** LAB-2.1. Copy: "Run `statespace check lab2.1` on the reference module and read the receipt's verdict lines. Two minutes."

---

### S2.L3 · bridge · Tactics transform goals

**Objective.** Before each tactic of a generated Goal Replay is revealed, select the goal it produces (GEN-proof-structure template 1).
**KCs.** KC-2.goal-state-reading. **Prerequisites.** KC-2.props-as-types. **Instrument.** INS-goal-replay: the reference proof of `transferPos_conserves`, a parallel theorem (§1, Q-1; `unfold transferPos total`, then `split <;> simp <;> omega` {{run:RUN-lean-s2-cells}}), with the goal generated before each tactic [X RUN-lean-plaingoal]. **Generator.** GEN-proof-structure. **Drawer.** D-07. **Minutes.** 15–25.
**Reading pointer (dated).** TPIL §5.1 "Entering Tactic Mode", §5.2 "Basic Tactics", §5.8 "Split Tactic" (read 2026-10-23).

**Prequestion** (k = 4, chance 1/4). Copy: "A goal contains `if c then x else y`. After `split`, what is there?" A one goal with the `if` removed · B two goals: one with `c` as a hypothesis and `x` in place of the `if`, one with `¬c` and `y` · C no goals · D two goals with no new hypotheses. **Key:** B. **Why** A: `split` does not pick a branch (dp:L1). B: a case split on the condition. C: `split` divides the work and proves nothing (dp:L2). D: each branch receives its condition as a hypothesis (dp:L1).

**Segment · Predict each goal** (12–15 min; one run: the strip, revealed one tactic at a time)

**Call It** at the first reveal, "after `unfold transferPos total`" (k = 4, chance 1/4). A the goal now shows `transferPos`'s `if … then … else …` inside a sum of fields · B the goal is closed · C the goal is unchanged · D a hypothesis `0 < n ∧ n ≤ s.a` appears. **Key:** A. **Why** A: `unfold` replaces names by their definitions. B: `unfold` proves nothing (dp:L2). C: both names occur in the goal, so both unfold (dp:L1). D: hypotheses come from case splits (dp:L1). **Surprise forecast:** no. The learner then predicts each later goal before it appears (practice, uncounted).

**Graded item.** GEN-proof-structure template 1 (next goal). The seed picks a transfer variant from the bank (guard shape and the property proved; the bank leaves out LAB-2's own `transfer` and the variants §3.3 keeps unseen) and a step. Options are pretty-printed goals: the key, the goal missing its branch hypothesis (dp:L1), the other branch's goal, and "no goals" (dp:L2).

**Exit item.** Template 1, fresh seed → KC-2.goal-state-reading. **Today cards.** KC-2.goal-state-reading. **Twin card.** None. **Sibling bridge.** None. **Build this:** LAB-2.2, conservation in manual mode. Cut list: #11; its KC moves to S2.L5.

---

### S2.L4 · bridge · Induction you can explain

**Objective.** Order the steps of a generated induction proof with Proof Blocks whose distractors include a circular use of the hypothesis, and select the hypothesis each case needs (GEN-proof-structure templates 2 and 3). Explaining the base case and the step without tactic names is an uncredited explain-back.
**KCs.** KC-2.induction-principle (second lesson). **Prerequisites.** KC-2.proof-reading. **Instrument.** INS-goal-replay: the whole worked proof of `net_append : net (xs ++ ys) = net xs + net ys`, where `net` sums a list of postings, then a recorded failure of a circular variant {{run:RUN-lean-s2-cells}}. **Generator.** GEN-proof-structure. **Drawer.** D-05. **Minutes.** 15–25. **Evidence.** After reading, Proof Blocks matched written proofs at one week in a quarter of the time (N = 332), and alone gave the smallest gains (B [poulsen23]).
**Reading pointer (dated).** TPIL §7.6 "Tactics for Inductive Types", §8.3 "Structural Recursion and Induction" (read 2026-10-23).

**Prequestion** (k = 4, chance 1/4). Copy: "To prove `net (xs ++ ys) = net xs + net ys` for all lists, induct on which variable?" A `xs` · B `ys` · C both at once · D neither: `simp` proves it. **Key:** A. **Why** A: `++` recurses on its first argument, so `net (x :: xs ++ ys)` unfolds. B: `++` never recurses on `ys` (dp:L5). C: one induction suffices; `ys` stays fixed (dp:L5). D: the step needs the hypothesis for `xs` (dp:L2).

**Segment · Base, step, and one trap** (12–15 min; one run: the circular-variant cell)

The worked example comes first and whole: the `nil` case reduces to `net ys = 0 + net ys`; the `cons` case rewrites with `ih` and reassociates.

**Call It** on the first run of the circular variant, whose step appeals to `net_append (x :: xs) ys` (k = 3, chance 1/3). A accepted · B rejected: Lean fails to show termination · C rejected: a type mismatch. **Key:** B {{run:RUN-lean-s2-cells}}. **Why** A: the appeal reuses the statement on the same list, so nothing shrinks (dp:L6). B: a theorem applied to its own argument is a recursion that does not decrease; the hypothesis is the statement for the shorter `xs`. C: the types match; the termination check catches the circularity (dp:L6). **Surprise forecast:** yes.

**Graded items.** (1) GEN-proof-structure template 2 (Proof Blocks): each block pairs an informal step with its Lean line; one or two distractors from {a circular appeal to the theorem (dp:L6), "the base case is not needed" (dp:L6), induction on `ys` (dp:L5)}; graded as a dependency DAG and orderable by keyboard (GATE-a11y). (2) Template 3. Copy: "Which fact does the `x :: xs` case need?" **Key:** `ih : net (xs ++ ys) = net xs + net ys`.

**Explain-back** (uncredited). Copy: "Say why the base case is needed and what the step assumes, without tactic names."

**Exit item.** Template 3, fresh seed → KC-2.induction-principle. **Today cards.** KC-2.induction-principle. **Twin card.** None. **Sibling bridge.** None. **Build this:** a preview of LAB-2.5. Copy: "The same move again, with a state that changes at every step." Cut list: #18; its KC moves to S2.L7.

---

### S2.L5 · core · Two accounts, conserved, and what the theorem says

**Objective.** Select the goals of a conservation proof parallel to LAB-2.2's (LAB-2.2 asks for `transfer_conserves` itself); judge about five English restatements true or false, the true ones naming every hypothesis (GEN-call-it template 4); judge which "if weakened" witnesses refute the claim's own proposition (template 4), then write one on CL-2.1 in LAB-2.7.
**KCs.** KC-2.theorem-statement-reading; KC-2.props-as-types (spiral). **Prerequisites.** KC-2.props-as-types, KC-1.quantifier-negation. **Instruments.** INS-goal-replay; INS-bench-lean (claim@1 validation on the Bench, recorded on phones). **Generators.** GEN-proof-structure, GEN-call-it. **Specimen · claim.** SP-2.2 · CL-2.1. **Minutes.** 2 + 3 × 12–15 + 5.
**Reading pointer (dated).** TPIL §4.1 "The Universal Quantifier" and §4.4 "The Existential Quantifier" (read 2026-10-24): what a statement over every `s` and `n` promises, and why "for some amount" promises less.

**PQ1** (k = 4, chance 1/4). Copy: "`theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s`. For which `n` does it promise anything?" A every integer, allowed or not · B only amounts the guard allows · C only `n ≥ 0` · D only when the transfer succeeds. **Key:** A. **Why** A: the statement has no hypothesis about `n`, and both branches of `transfer` conserve. B: the guard lives inside `transfer`, not in the statement (dp:L4). C: nothing restricts `n` (dp:L4). D: a rejected transfer returns `s`, which conserves trivially (dp:L4).

**PQ2** (k = 4, chance 1/4). Copy: "Delete the guard from `transfer`. Which theorem stops being provable?" A conservation · B non-negativity · C both · D neither. **Key:** B. **Why** A: (a − n) + (b + n) = a + b for every n, as Z3 showed in S1 [X RUN-z3-conservation-noguard] (dp:L4). B: a = 0 and n = 1 leave the sender at −1, and 1 is the minimal amount [X RUN-z3-optimize-min]. C: conservation survives (dp:L4). D: non-negativity needs n ≤ a (dp:L4).

**Segment 1 · What the statement promises** (12–15 min; one run: the strip of S2.L3's parallel proof {{run:RUN-lean-s2-cells}})

Correct worked example first, S2.L3's parallel theorem `transferPos_conserves`: the statement, `unfold transferPos total`, `split`, two goals, both closed; its axioms are `[propext, Quot.sound]` {{run:RUN-lean-s2-cells}}.

**Call It** before `split` is revealed (k = 3, chance 1/3). Copy: "Will any branch of this proof use the guard as a hypothesis?" A the allowed branch · B the rejected branch · C neither. **Key:** C. **Why** A: the allowed-branch goal holds for every n; the guard is present and unused (dp:L4). B: that branch returns `s` (dp:L4). C: both branches conserve whatever the guard says. **Surprise forecast:** yes.

**Graded item.** GEN-proof-structure template 1 (the goals after `split`), transfer-variant bank as in S2.L3, with no LAB-2 theorem; distractors as in S2.L3.

**Segment 2 · Take the guard away** (12–15 min; one run: the recorded no-guard variant {{run:RUN-lean-noguard}}, in which conservation still builds and non-negativity fails with omega's possible counterexample)

**Call It** (k = 2, chance 1/2). Copy: "With no guard, does `transfer_conserves` still build?" A yes · B no. **Key:** A. **Why** A: conservation is about the arithmetic of both branches; this is SP-2.2. B: the guard protects signs, not sums (dp:L4). **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4: five English renderings of a pinned statement, each judged "says exactly what the theorem proves, no more and no less", generated from formal mutants: the equivalent reading (true); one adding "if the transfer is allowed" (false: weaker, dp:L4); one dropping a hypothesis (false, dp:L4); one about another property (false, dp:L3); one saying "for some amount" (false, dp:G6). Keys by Z3 equivalence of each formal reading with the statement; feedback shows a distinguishing state.

**Segment 3 · If weakened** (12–15 min; one run: `statespace check`'s claim@1 validation of a demo CL-2.1 card, prefilled from the LAB-2.1 receipt, whose "if weakened" field holds SP-2.2's witness; recorded on phones)

Copy: "Roadmap rule 3 asks for the counterexample when an assumption is weakened. It must refute this claim, not its neighbor."

**Call It** before the validation runs (k = 3, chance 1/3). Copy: "Will claim@1 validation accept this card?" A accepted · B rejected: the witness does not refute this card's proposition · C rejected: the witness is not minimal. **Key:** B. **Why** A: with no guard conservation still holds, so the witness refutes CL-2.2, not CL-2.1 (dp:L4). B: claim@1 validation requires the witness to refute the card's own proposition. C: minimality is not required, and amount 1 is minimal anyway (dp:L4). **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4 over five candidate "if weakened" entries for CL-2.1, each judged "this witness refutes `total (transfer s n) = total s` under the weakened assumption":

| Entry | Key | Why |
|---|---|---|
| drop `n ≤ s.a`; a = 0, b = 0, n = 1 gives a sender at −1 | false | it refutes non-negativity (CL-2.2), not conservation (dp:L4) |
| let sender and recipient be one account, both new balances computed from the old state; a self-transfer of 1 | true | the account's balance changes, so the total does [X RUN-z3-selftransfer] |
| drop `0 ≤ n`; n = −5 | false | money moves backwards and the total is unchanged (dp:L4) |
| keep the guard; a = 0, n = 1 | false | the transfer is rejected and nothing changes (dp:L4) |
| one account, the credit read after the debit; 10 transferring 5 to itself | false | the fixed order conserves: 10 stays 10 [X RUN-lean-selftransfer] (dp:L7) |

Keys: each witness evaluated against the proposition under its weakened model, at grade time.

**Exit items.** (1) GEN-call-it template 4, fresh statement → KC-2.theorem-statement-reading. (2) GEN-proof-structure template 1, fresh variant → KC-2.props-as-types. **Today cards.** Both KCs; a re-find of SP-2.2 at 7 days or more.

**Twin card.** Comparator Live's trusted challenges, identified by `sha256(challenge.trimRight() + "\n")`, untrusted ones "loudly flagged as unreliable" [V, R1 F40]; course receipts hash the same way; pinned in {{run:RUN-twin-pins}}. Tracing questions: does `statespace hash` on your challenge equal the receipt's `challengeSha` and the published hash? Who wrote the statement you proved?
**Sibling bridge.** None. **Build this:** LAB-2.2. Copy: "Prove `transfer_conserves` without `grind` or `omega` (25 minutes). This stage's check passes only on a manual proof; nothing else waits on it."

---

### S2.L6 · bridge · Rejection and non-negativity

**Objective.** Select the hypothesis each branch of a parallel rejection or non-negativity proof needs (GEN-proof-structure template 3) and complete a stamp qualifier with the axioms automation adds (GEN-which-stamp template 2). LAB-2's own proofs are written in manual mode in LAB-2.3 and LAB-2.4.
**KCs.** KC-2.rejection-unchanged, KC-2.automation-scope. **Prerequisites.** KC-2.goal-state-reading. **Instruments.** INS-goal-replay (manual proofs {{run:RUN-lean-s2-cells}}; axiom outputs [X RUN-lean-axioms]); INS-bench-lean for the lab stages. **Generators.** GEN-proof-structure, GEN-which-stamp. **Claims.** CL-2.2, CL-2.3. **Drawer.** D-07. **Minutes.** 15–25. **Evidence.** With automated steps 48% of a cohort could finish "without thinking, just clicking randomly", 15% with manual steps; cohorts not equivalent (C [keenan26]).
**Reading pointer (dated).** TPIL §3.3.3 "Negation and Falsity", §5.8 "Split Tactic" (read 2026-10-23).

**Prequestion** (k = 4, chance 1/4). Copy: "`grind` and `omega` each close `transfer_conserves`. Do the two proofs depend on the same axioms?" A yes: a theorem has one axiom list · B no: the `grind` proof adds `Classical.choice` · C neither depends on any axiom · D both add `sorryAx`. **Key:** B [X RUN-lean-axioms]. **Why** A: the list belongs to the proof, not the theorem (dp:L8). B: as recorded. C: the `omega` proof uses `propext` and `Quot.sound` [X RUN-lean-axioms] (dp:L8). D: `sorryAx` marks an unfinished proof (dp:L8).

**Segment · Which hypothesis, and which axioms** (12–15 min; one run: S2.L0's manual strip of `transferPos_nonneg`)

**Call It** (k = 4, chance 1/4). Copy: "In the allowed branch, which fact makes `0 ≤ s.a - n` true?" A `ha : 0 ≤ s.a` · B the guard's `n ≤ s.a` · C `hb : 0 ≤ s.b` · D the guard's `0 < n`. **Key:** B. **Why** A: not needed: n ≤ s.a alone gives s.a − n ≥ 0; `ha` serves the rejected branch (dp:L4). B: subtracting at most s.a leaves at least 0. C: a fact about the recipient (dp:L4). D: needed for the recipient's component, not the sender's (dp:L4). **Surprise forecast:** yes.

**Graded items.** (1) GEN-proof-structure template 3 on fresh variants from banks that hold no LAB-2 theorem (Q-1): which fact each component of each branch needs; keys by hypothesis deletion in CI. (2) GEN-which-stamp template 2: from a raw receipt block of a `grind` proof, complete "PROVED [P] · Lean 4.35.0 kernel · axioms listed: …" with its axioms and automation flag.

Copy: "Manual mode: in these two lab stages, the check needs a proof without automation. The rest of the course stays open." Hints avoid `if_pos` and `if_neg`, deprecated on 4.35.0 {{run:RUN-lean-s2-cells}}.

**Exit items.** Template 3, fresh → KC-2.rejection-unchanged; GEN-which-stamp template 2, fresh → KC-2.automation-scope. **Today cards.** Both KCs. **Twin card.** None. **Sibling bridge.** None. **Build this:** LAB-2.3 and LAB-2.4. Cut list: #13; its KCs move to S2.L5, and CL-2.2 and CL-2.3 still mint in LAB-2.4 and LAB-2.3.

---

### S2.L7 · core · Sequences of transfers: generalize first

**Objective.** Select the goal and hypothesis of each case of a parallel sequence theorem; identify why `run_conserves` fails without generalizing (SP-2.3; GEN-proof-structure template 3); complete faded versions of the parallel proof and order its blocks (template 2); then prove `run_conserves` on the Bench in LAB-2.5.
**KCs.** KC-2.generalized-ih (threshold). **Prerequisites.** KC-2.induction-principle. **Instruments.** INS-goal-replay with backward fading (family F1); INS-bench-lean for LAB-2.5. **Generator.** GEN-proof-structure. **Specimen · claim.** SP-2.3 · CL-2.4, which plants SEAM-2. **Drawer.** D-07. **Minutes.** 2 + 3 × 12–15 + 5.
**Reading pointer (dated).** TPIL §4.1 "The Universal Quantifier" (read 2026-10-24): a hypothesis stated for every state.

**PQ1** (k = 4, chance 1/4). Copy: "`run s (n :: ns) = run (transfer s n) ns`. Proving `total (run s ns) = total s` by induction on `ns`, the step needs the hypothesis for which state?" A `s` · B `transfer s n`, so the hypothesis must hold for every state · C the empty list · D none: conservation of one transfer suffices. **Key:** B. **Why** A: the recursive call starts from `transfer s n` (dp:L5). B: the state changes at every step, so only a hypothesis about all states applies. C: that is the base case (dp:L6). D: the rest of the list still needs the hypothesis (dp:L6).

**PQ2** (k = 4, chance 1/4). Copy: "Without generalizing, which part fails?" A the base case · B the step: the hypothesis is about `s`, the goal about `transfer s n` · C nothing, Lean generalizes automatically · D the definition of `run`. **Key:** B. **Why** A: `run s [] = s` closes by `rfl` (dp:L6). B: SP-2.3. C: `induction` keeps `s` fixed unless told otherwise (dp:L5). D: the definition is fine; the proof is not (dp:L5).

**Segment 1 · The whole proof first** (rung 0; 12–15 min; one run: the strip of the parallel proof {{run:RUN-lean-s2-cells}})

The reference proof, of the parallel theorem `runPos_conserves` (§1, Q-1): `induction ns generalizing s with`, `nil` by `rfl`, `cons` by `simp [runPos, ih, transferPos_conserves]` {{run:RUN-lean-s2-cells}}, revealed step by step with one principle prompt each (generalize over the state the recursion changes; the empty sequence changes nothing; use the hypothesis at the new state, then one-step conservation). A second correct example, a two-direction ledger, puts `∀ s` after the list; it proves with `[propext, Quot.sound]` [X RUN-lean-axioms].

**Call It** before the `cons` case is revealed (k = 3, chance 1/3). Copy: "In the `cons` case, the hypothesis `ih` is stated for…" A `s` only · B `transferPos s n` only · C every state. **Key:** C. **Why** A: that would be the non-generalized hypothesis (dp:L5). B: the hypothesis covers every state; you pick `transferPos s n` when using it (dp:L5). C: `generalizing s` puts `s` inside the hypothesis. **Surprise forecast:** no.

**Graded item.** GEN-proof-structure template 1 (next goal) from the threaded-state bank (recursions over a list that thread a state, `runPos` among them; no LAB-2 `run`, and no deposit `run`).

**Segment 2 · Without generalizing** (12–15 min; one run: the recorded failure {{run:RUN-lean-ih-ungeneralised}}: the `cons` case stays open with `ih : total (run s ns) = total s` and the goal `total (run (transfer s n) ns) = total s`, and a linter notes that `ih` went unused)

**Call It** (k = 3, chance 1/3). Copy: "Without `generalizing s`, does the `cons` case close?" A it closes · B it fails: the hypothesis is about `s`, the goal about `transfer s n` · C it fails because the base case is missing. **Key:** B. **Why** A: the hypothesis is about the wrong state (dp:L5). B: SP-2.3. C: the base case closes (dp:L6). **Surprise forecast:** yes, for learners who expect Lean to generalize.

Copy: "An induction failure, not a bug: every theorem here is true." (Audit class G13.)

**Graded item.** GEN-proof-structure template 3. Copy: "Which instance of the hypothesis does the step need?" Options `ih (transfer s n)` (key), `ih s`, `transfer_conserves s n` alone, the goal; key by deletion in CI.

**Segment 3 · Fade it out** (rungs 1–3; 12–15 min; one run: the faded strip cells of the parallel proof, whose candidate lines were elaborated at build time)

Rungs 1–3 fade the parallel proof of Segment 1: rung 1 blanks the `cons` case's closing line, rung 2 the whole `cons` case, rung 3 all but the statement and `induction`. Blanks are filled from build-time candidates, each showing its resulting goal or error; no blank carries a prompt, and each revealed step gets one principle prompt. A 3-up, 1-down staircase per KC moves between rungs; rung 4 (transfer) is LAB-2.5 plus a Today isomorph with fee-charging transfers.

**Graded item.** GEN-proof-structure template 2 (Proof Blocks, informal plus Lean) laying out the parallel proof, distractors from {`induction ns` without generalizing (dp:L5), a circular appeal to `runPos_conserves s (n :: ns)` (dp:L6)}.

**Seam.** Copy on CL-2.4: "Assumed: transfers run one at a time." SEAM-2 is drawn dashed. On the builder's path SP-5.1 is already in the record, so CL-2.4 mints with SEAM-2 cracked and the forecast runs in LAB-2.5 (§6).

**Explain-back** (uncredited; Part D's prompt). Copy: "Explain the induction in `run_conserves` without naming a tactic."

**Exit items.** Templates 3 and 2, fresh seeds → KC-2.generalized-ih. **Today cards.** KC-2.generalized-ih, two extra calls in 60 days; spiral returns in S3.L6 and S9.L1; the S2 and S3 Defences. **Twin card.** None. **Sibling bridge.** None. **Build this:** LAB-2.5, a weekend stage. Copy: "Prove `run_conserves` against the pinned statement, 45 minutes; at 25, 45 or 90 minutes `statespace stuck` packages your goal." An optional exercise after LAB-2.8, outside the lab stages (spine §12 item 51), proves `run_nonneg` (§3.1), the roadmap's sequence clause for non-negativity: an invariant, not an equality, is carried through the list, so `ih` must cover every non-negative state.

---

### S2.L8 · bridge · Many accounts: function update and self-transfer

**Objective.** Produce a witness that a pointwise transfer computing both new balances from the old state changes a self-transfer's balance (GEN-find-the-witness template 1), and read its Lean `decide` check.
**KCs.** KC-2.finite-map-update. **Prerequisites.** KC-2.theorem-statement-reading. **Instruments.** INS-z3 (the buggy update query [X RUN-z3-selftransfer]); INS-goal-replay (the `decide` strip {{run:RUN-lean-s2-cells}}). **Generator.** GEN-find-the-witness. **Specimen · claim.** SP-2.1 · CL-2.5. **Drawer.** D-04. **Minutes.** 15–25.
**Reading pointer (dated).** TPIL §12.3 "Function Extensionality" (states as functions; read 2026-10-23).

**Scope against the roadmap.** "Then generalize to finite maps of accounts" is met by total functions `Bal := Acct → Int` (`Acct := Nat`) under pointwise update. `Finmap` needs Mathlib, whose packages for such a project take 7.3 GB [X RUN-lean-mathlib], and total functions keep the proofs at `if` and integer arithmetic, which is what KC-2.finite-map-update teaches [D]. The theorems are local: `xfer_frame` (every other account unchanged), `xfer_pair` (the two accounts' sum unchanged) and `xfer_self`. Conservation of a total over a finite set of accounts containing both follows from them on paper, but no such theorem is stated or proved, and CL-2.5 claims only the local ones (§13 issue 15). Copy: "The roadmap says finite maps; here accounts are a function from every account number to a balance. The theorems cover the two accounts a transfer touches and every account it leaves alone; a total over many accounts is not proved."

**Prequestion** (k = 4, chance 1/4). Copy: "An account holds 10 and transfers 5 to itself. Both new balances are computed from the old state, then written in order: debit, then credit. Final balance?" A 10 · B 5 · C 15 · D 20. **Key:** C [X RUN-lean-selftransfer]. **Why** A: the fixed update's result (dp:L7). B: the credit write overwrites the debit, not the reverse (dp:L7). C: the credit computes 10 + 5 from the old state and overwrites the debit's 5. D: only one 5 is added (dp:L7).

**Segment · One account, two writes** (12–15 min; one run: the INS-z3 cell asking for a self-transfer whose balance changes under the buggy update)

**Call It** (k = 4, chance 1/4). A never · B only for amounts the guard rejects · C for every positive amount the guard allows · D for every amount, zero included. **Key:** C. **Why** A: Z3 returns `sat [n = 1, t = 0, f = 0]` [X RUN-z3-selftransfer] (dp:L7). B: rejected transfers change nothing (dp:L7). C: the final balance is the old balance plus n. D: n = 0 changes nothing (dp:L7). **Surprise forecast:** yes. The witness replays in the tab.

Then the strip, on another balance and amount so that LAB-2.6's two specimen theorems stay the learner's (Q-1): `theorem mints_from_7 : xferBuggy (fun _ => 7) 0 0 3 0 = 10 := by decide`; the fixed `xfer` gives 7, also by `decide` {{run:RUN-lean-s2-cells}}. Copy: "`decide` evaluates a closed, decidable proposition. It checks this instance, not the general theorem."

**Graded item.** GEN-find-the-witness template 1 (model). The seed picks an update variant: old-state reads with debit-then-credit writes (mints n), with credit-then-debit writes (destroys n), or the fixed order (answer "none"). The learner submits a balance, amount and account whose self-transfer changes the balance, or "none"; graded by checking the witness on INS-z3, never by matching values, and "none" by an `unsat` with a premise witness. Class hint: every positive allowed amount; cure: read the destination after the debit.

**Exit item.** Template 1, fresh seed → KC-2.finite-map-update. **Today cards.** KC-2.finite-map-update; a re-find of SP-2.1 at 7 days or more. Copy at the close: "The same aliasing returns in SQL (S6)." **Twin card.** None. **Sibling bridge.** None. **Build this:** LAB-2.6. Cut list: #15; its KC moves to S2.L7 with SP-2.1, and CL-2.5 still mints in LAB-2.6.

---

### S2.L9 · core · The trusted kernel, and the day it was wrong

**Objective.** Classify `#print axioms` lines (standard, `sorryAx`, `_native`, custom) and map each to a stamp (GEN-which-stamp template 1); judge what a build, an axiom report, a kernel replay and comparator each establish (GEN-call-it template 4); complete a Lean qualifier (GEN-which-stamp template 2). Retelling the 2026 kernel-bug story is an uncredited explain-back.
**KCs.** KC-2.axioms-and-trust (threshold); KC-2.automation-scope. **Prerequisites.** KC-2.props-as-types. **Instruments.** INS-goal-replay (recorded outputs [X RUN-lean-axioms, RUN-lean-skipkernel]); INS-bench-lean. **Generators.** GEN-which-stamp, GEN-call-it. **Specimens.** SP-2.4, SP-2.5, SP-2.6; plants SEAM-15. **Drawer.** D-07. **Minutes.** 2 + 3 × 12–15 + 5.

**PQ1** (k = 4, chance 1/4). Copy: "`#print axioms transfer_conserves` prints `[propext, Quot.sound]`. What does that say?" A the proof is unsound: it uses axioms · B it uses only standard axioms of Lean's logic · C it contains a `sorry` · D the compiler was trusted. **Key:** B [X RUN-lean-ledger]; the manual's standard three are `propext`, `Classical.choice` and `Quot.sound` [V]. **Why** A: standard axioms are not a defect (dp:L8). C: a `sorry` shows as `sorryAx` (dp:L8). D: native computation shows as a `_native` axiom (dp:L8).

**PQ2** (k = 4, chance 1/4). Copy: "A file whose theorem ends in `sorry` is built. Exit code?" A 0, with a warning · B 1 · C 2 · D it does not build. **Key:** A [X RUN-lean-axioms]. **Why** B–D: a `sorry` only warns (dp:L9, proposed).

**Segment 1 · Four kinds of axiom** (12–15 min; one run: the recorded axiom probe [X RUN-lean-axioms]: six theorems whose lists cover the four kinds, among them `grind`'s added `Classical.choice`, `big_native._native.native_decide.ax_1_1`, none for `decide`, `sorryAx` and a declared `cheat`)

**Call It** on the `big_native` line (k = 4, chance 1/4). A standard · B `sorryAx` · C native: the compiler was trusted · D custom. **Key:** C. **Why** A: not one of the three (dp:L8). B: no `sorry` here (dp:L8). C: `_native` marks native evaluation, stamped [P] · kernel + compiler and outside the permitted list. D: generated by `native_decide`, not declared (dp:L8). **Surprise forecast:** no.

**Graded item.** GEN-which-stamp template 1 over one to three lines, keyed by spine §8.8: [P] · Lean 4.35.0 kernel · axioms listed; "PROVED modulo k assumed lemmas", each [A]; [P] · kernel + compiler; a custom axiom carried as [A] (§13 issue 5).

**Segment 2 · Build, axioms, replay** (12–15 min; one run: the recorded SP-2.4–SP-2.6 runs)

A `sorry` builds with exit 0, and `lake check` rejects three non-standard axioms yet logs "Lean default kernel accepts the solution" [X RUN-lean-axioms]. A declaration added under `debug.skipKernelTC`, and `1 = 2` built on it, exit 0 with no axioms; `leanchecker` rejects it [X RUN-lean-skipkernel]. Copy shows the option line and the verdicts, not the source.

**Call It** after SP-2.6's build and axiom lines (k = 3, chance 1/3). Copy: "Is `1 = 2` proved?" A yes: a clean build and no axioms · B no · C can't tell without kernel replay. **Key:** C. **Why** A: both outputs come from an elaborator told to skip the kernel (dp:L9, proposed). B: true, but these outputs cannot show it (dp:L9). C: replay is what rejects it. **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4 over five "‹check› establishes ‹property›" statements, drawn from: a green build, elaboration only; `#print axioms`, assumptions listed, nothing re-checked; replay, the declarations re-checked; `lake check`, plus the axiom policy; comparator, plus the pinned statement; none of them, the requirement. Keys from the recorded runs.

**Segment 3 · The day the kernel was wrong** (12–15 min; one run: `lake comparator --paranoid` on the learner's project, which takes seconds; `lake check --paranoid` replays the whole environment and takes minutes on a fast machine, so the lesson names it and does not wait for it [X RUN-bwrap-lanes]; on phones the recorded six-checker run [X RUN-lean-comparator])

Story card (sources linked; no exploit code; the disproof's repository not linked). On 2026-07-25 an AI-assisted Lean "disproof" of the Collatz conjecture was published from a pipeline that replayed proofs, checked axioms and ran a pinned nanoda. On 2026-07-28 issue #14576 reduced it to an axiom-free proof of `False`, fixed the same day in v4.32.2. The postmortem (2026-08-01): two bugs chained; the official kernel "had a missing check in the nested inductive type support" and nanoda "did not verify the type name in a projection node"; the repository "also passed a week-old version of nanoda"; lean4lean shared the kernel bug because its inductives port the reference implementation. The advisory (2026-08-02): exploitation "requires execution of a metaprogram within the Lean process", which is why `lake check` sandboxes the build and replays an export [pmortem][oss14576][leancmp; V per BRIEF §2.1].

**Call It** before the outcome (k = 2, chance 1/2). Copy: "A pipeline replayed proofs, checked axioms and ran a pinned second checker. Could it accept a proof of `False`?" A yes · B no. **Key:** A. **Why** A: it did: two bugs in two checkers, one a week stale. B: checks can share a blind spot or lag a fix (dp:X4). **Surprise forecast:** yes.

Copy after the run: "`--paranoid` runs six checkers [X RUN-lean-comparator], and they can share a flaw: lean4lean ports the reference logic for inductives. A PROVED stamp names its checkers and versions, and an advisory can reopen it."

**Graded item.** GEN-which-stamp template 2: complete "PROVED [P] · Lean 4.35.0 kernel · axioms listed · 6 checkers" from a raw `--paranoid` block, or "[P] · kernel + compiler" from a `_native` line.

**Seam.** Copy on CL-2.1–CL-2.4: "Assumed, and tested at every Lean Defence: the Lean 4.35.0 kernel accepts only well-typed terms." SEAM-15 is held; advisories arrive as change cards (M-change-cards), never as erosions.

**Exit items.** GEN-which-stamp template 1, fresh → KC-2.axioms-and-trust; GEN-call-it template 4, fresh → KC-2.automation-scope. **Today cards.** Both KCs, two extra calls for the threshold KC; set A interleaving begins. **Twin card.** Lean PR #14577, "fix: missing check at kernel inductive declaration", pinned in {{run:RUN-twin-pins}}; tracing questions: which component lacked the check, which second checker accepted the term and why, which release shipped the fix. **Sibling bridge.** None. **Build this:** LAB-2.7. Copy: "Read your receipt's axiom lists, `nativeAxioms` and `sorryCount` before writing the claim cards."
**Reading pointer (dated).** "Validating a Lean Proof" (4.35.0): Printing Axioms, Re-Checking Proofs, Gold Standard, Remaining Issues; TPIL §12.2, §12.4, §12.5; "Did you prove it?" (read 2026-10-23). A dated lag worth showing: the manual still says `lean4checker`; the 4.35.0 binary is `leanchecker` [X RUN-lean-toolchain].

---

### S2.L10 · core · Every checker agrees; none read the requirement

**Objective.** Predict comparator's verdicts, reading verdict lines rather than exit codes (GEN-call-it template 1); after `lake comparator --paranoid` accepts the four ledger theorems, exhibit in the tab outcomes they permit and the requirement forbids (template 4); select statements that rule those outcomes out (template 4).
**KCs.** KC-2.kernel-not-requirement (threshold); KC-2.statement-pinning. **Prerequisites.** KC-2.theorem-statement-reading, KC-2.axioms-and-trust. **Instruments.** INS-bench-lean (recorded runs on phones); INS-interp. **Generator.** GEN-call-it. **Specimens.** SP-2.7, SP-2.8, SP-2.9. **Drawer.** D-06. **Minutes.** 2 + 3 × 12–15 + 5.

**PQ1** (k = 4, chance 1/4). Copy: "`lake comparator --paranoid` accepts your four ledger theorems. What is established?" A the pinned statements are proved about the pinned definitions, with permitted axioms, and six checkers accept the proofs · B the ledger meets its business requirements · C your system's code behaves like the model · D six confirmations that cannot share a flaw. **Key:** A. **Why** B: no checker reads requirements (dp:L3). C: correspondence is a separate claim (S6) (dp:P3). D: they can share one: lean4lean ports the reference logic for inductives (S2.L9) (dp:X4).

**PQ2** (k = 4, chance 1/4). Copy: "Your agent adds `(h : n = 0)` to `transfer_conserves` under the same name; the build is green. Comparator says?" A accepted · B rejected: statement mismatch · C rejected by the kernel · D rejected: forbidden axiom. **Key:** B [X RUN-lean-comparator]. **Why** A: the statement no longer matches the pin (dp:L9, proposed). C: the weakened proof is valid (dp:L9). D: no axiom changed (dp:L8).

**Segment 1 · What comparator says** (12–15 min; one run: `lake comparator --paranoid` on the learner's four theorems)

Recorded contrast [X RUN-lean-comparator]: honest, "Your solution is okay!", exit 0; weakened, "Challenge and solution theorem statement do not match: 'transfer_conserves'", exit 1; `transfer` redefined to return its input, "Const does not match between challenge and target 'transfer'", exit 1; `--paranoid`, six checkers in about 3 s. SP-2.8 [X RUN-lean-bwrap-docker]: no bubblewrap exits 2; bubblewrap under default Docker exits 1, a rejection's code, after a namespace-permission error.

**Call It** on the redefined submission (k = 3, chance 1/3). A accepted: the proof is valid · B rejected: statement mismatch · C rejected: definition mismatch. **Key:** C. **Why** A: valid only for a `transfer` that no longer matches the pin (dp:L9, proposed). B: the statement's text is unchanged; a constant it uses changed (dp:L4). C: comparator compares the constants a statement uses. **Surprise forecast:** no.

**Graded item.** GEN-call-it template 1 on fresh raw outputs (exit code plus verdict lines): "accepted", "rejected", or "no verdict: the check did not run", including exit-1 sandbox failures and exit-2 starts (key: no verdict; rationale dp:L9, proposed).

**Segment 2 · Six checkers and a requirement** (12–15 min; one run: the INS-interp cell)

Copy: "R: an allowed transfer debits exactly n from the sender and credits exactly n to the recipient; a disallowed one changes nothing; no balance goes negative; money is never created or destroyed." The cell runs the four statements as executable properties against the pinned `transfer` and an idle transfer that returns its input: SP-2.7's redefinition, which comparator caught only because the challenge pins `transfer`.

**Call It** (k = 3, chance 1/3). Copy: "How many of the four statements hold for the idle transfer?" A none · B conservation only · C all four. **Key:** C {{run:RUN-lean-intent}}. **Why** A: sums, signs and rejection are all preserved by idling (dp:L3). B: non-negativity and rejection hold too (dp:L3). C: none says that money moves; this is SP-2.9. **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4 over five pre/post outcomes, each judged "the four theorems permit it and R forbids it": 5 from (10, 0) leaving (10, 0) (true); 4 from (10, 0) ending at (7, 3) (true: the wrong amount, conserved and non-negative); 5 from (3, 0) ending at (−2, 5) (false: forbidden by the theorems, dp:L4); −5 from (10, 8) ending at (15, 3) (false: `transfer_rejected` forbids it, dp:L4); 4 from (10, 0) ending at (6, 4) (false: R requires it, dp:L3). Seeds vary the numbers; keys by INS-interp at grade time.

**Segment 3 · You state** (12–15 min; one run: the INS-interp statement checker)

Copy: "Agents prove; you state. The cure for SP-2.9 is a statement, not a better proof."

**Call It** (k = 3, chance 1/3). Copy: "Add `transfer_moves`: an allowed transfer yields exactly (a − n, b + n). Against the idle transfer?" A it passes all five · B it fails `transfer_moves` only · C it fails conservation too. **Key:** B {{run:RUN-lean-intent}}. **Why** A: it fails at (1, 0) with n = 1 (dp:L3). B: the new statement is the one that says money moves. C: idling conserves (dp:L4). **Surprise forecast:** no.

**Graded item.** GEN-call-it template 4 over five candidate statements, each judged "with the four theorems, rules out the idle and wrong-amount outcomes and holds for the pinned transfer": `transfer_moves` (true); "an allowed transfer changes the state" (false: an allowed zero amount changes nothing, dp:L4); "an allowed transfer lowers the sender by exactly n" (true: with conservation it fixes the credit); "the total is conserved and balances stay non-negative" (false: idling satisfies it, dp:L3); "a disallowed transfer changes nothing" (false: silent on allowed transfers, dp:L4). Keys by INS-interp and Z3 equivalence over linear integer arithmetic.

Copy at the close: "Even with `transfer_moves` proved, requirement-fit stays [A]. The pinned guard allows a zero amount; whether R should reject it is a decision S3 records."

**Exit items.** Template 4, fresh → KC-2.kernel-not-requirement; template 1, fresh → KC-2.statement-pinning. **Today cards.** Both KCs; KC-2.kernel-not-requirement joins set B when S5 opens. **Twin card.** lean-eval, which counts a problem solved "iff comparator accepts the submitted solution" [V, R1 F40], pinned in {{run:RUN-twin-pins}}; tracing questions: who writes its challenges, what a wrong challenge would reward, where the trusted hashes live. **Sibling bridge.** None. **Build this:** LAB-2.7. Copy: "Write each card's proposition, 'if weakened' witness and requirement row; method, tool and version are prefilled."
**Reading pointer (dated).** "Validating a Lean Proof" (4.35.0), Gold Standard and Remaining Issues, including "it is important to distinguish the question 'does the theorem have a valid proof' from 'what does the theorem statement mean'" (read 2026-10-23).

---

### 2.11 Call tally

Eighteen authored calls. Keys: a reason, goal, term, value or hypothesis, 6 (33%: S2.L0–S2.L3, S2.L6, S2.L7 seg 1); a verdict class, 7 (39%: S2.L4, S2.L5 seg 3, S2.L7 seg 2, S2.L9 seg 1, S2.L10 segs 1–3); "neither" or "can't tell", 2 (S2.L5 seg 1, S2.L9 seg 2); "yes", 2 (S2.L5 seg 2, S2.L9 seg 3); a range, 1 (S2.L8). No key type exceeds 60%. Forecast surprises: 10 of 18 (56%: S2.L4, S2.L5 segs 1–3, S2.L6, S2.L7 seg 2, S2.L8, S2.L9 segs 2–3, S2.L10 seg 2), above the 30% floor; learner-zero's logged calls test the forecast.

---

## 3. LAB-2 · the verified ledger

The roadmap's Stage 2 project, on the Bench. **Template** (`statespace-lab`, `lab2/`): the definitions, the pinned statements, a reference module for LAB-2.1, specimen scaffolds, claim templates and the agent kit; the learner writes proofs, two specimen theorems and the cards' learner fields.

```
lab2/
  lean-toolchain             leanprover/lean4:v4.35.0
  lakefile.toml              libraries Challenge (srcDir "challenge"), Solution, Reference, Broken, Fixed;
                             default targets Solution, Broken and Fixed; autoImplicit false for every library
  lake-manifest.json         required by the sandbox
  challenge/Challenge.lean   read-only, hashed: definitions and statements ending in `sorry`
  Solution.lean              the same definitions, defined here once; proof bodies marked TODO(you)
  Reference.lean             LAB-2.1 only: a proof of transfer_conserves ("reference module, earns nothing")
  comparator.json            the whole-lab configuration
  broken/Broken.lean         fixed/Fixed.lean      each imports Solution
  claims/CL-2.1.yaml … CL-2.5.yaml    receipts/
  AGENTS.md  CLAUDE.md  the fail-closed PreToolUse hook
```

`Solution` carries the challenge's definitions (`Acct`, `Bal`, `upd`, `xferBuggy` and `xfer`) once, and `Broken` and `Fixed` import `Solution` instead of defining them again: `lake check` loads every default target into one environment and fails with "environment already contains" when two define a name [X RUN-bwrap-lanes]. The two specimens have distinct module names for a related reason: two modules both named `SelfTransfer` gave one `.olean`, built from the first library only, and `lake build` and `lake check` both exited 0, so the learner's `fixed/` specimen would never have been built or checked [X RUN-bwrap-lanes].

The hook blocks agent edits to `TODO(you)` bodies, `challenge/`, `comparator.json`, `claims/` and `receipts/` (friction, not enforcement; OD-8). A comparator-accepted proof of a pinned statement earns [P] whoever wrote it; agent work never counts as evidence (spine §8.1–§8.2).

**Statement pins** (`challenge/Challenge.lean`). Definitions and the four two-account statements are those of `research/spikes/lean/Ledger.lean` [X RUN-lean-ledger]; `upd`, `xferBuggy` and `xfer` come from the same file [X RUN-lean-selftransfer]; the three `xfer_*` statements, the optional `transfer_moves` and the optional exercise `run_nonneg` are new {{run:RUN-lean-finmap}} {{run:RUN-lean-intent}}; the exercise's reference proof is not a registered run.

```lean
structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b
def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s
def run (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => run (transfer s n) ns

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := sorry
theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := sorry
theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := sorry
theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := sorry
theorem run_nonneg (s : Ledger) (ns : List Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :   -- optional exercise, outside the stages (§13)
    0 ≤ (run s ns).a ∧ 0 ≤ (run s ns).b := sorry
theorem transfer_moves (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) :   -- optional (§13)
    transfer s n = { a := s.a - n, b := s.b + n } := sorry

abbrev Acct := Nat
abbrev Bal := Acct → Int
def upd (f : Bal) (k : Acct) (v : Int) : Bal := fun j => if j = k then v else f j
def xferBuggy (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then upd (upd f src (f src - n)) dst (f dst + n) else f
def xfer (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then
    let f1 := upd f src (f src - n)
    upd f1 dst (f1 dst + n)
  else f

theorem xfer_frame (f : Bal) (src dst k : Acct) (n : Int) (hs : k ≠ src) (hd : k ≠ dst) :
    xfer f src dst n k = f k := sorry
theorem xfer_pair (f : Bal) (src dst : Acct) (n : Int) (h : src ≠ dst) :
    xfer f src dst n src + xfer f src dst n dst = f src + f dst := sorry
theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := sorry
```

`comparator.json` (whole lab; LAB-2.7 and the Defence):

```json
{ "challenge_module": "Challenge", "solution_module": "Solution",
  "theorem_names": ["transfer_conserves", "transfer_rejected", "transfer_nonneg", "run_conserves",
                    "xfer_frame", "xfer_pair", "xfer_self"],
  "definition_names": [],
  "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"] }
```

Permitted: the three axioms the reference manual calls standard [V]; `sorryAx`, `_native` and custom axioms are rejected. The field "is deliberately not defaulted" (`lake help comparator`, recorded in `lean-measure/measure.log`), which is what S2.L9 teaches. Stage configurations copy the modules and axioms verbatim and name only the stage's theorems; comparator exports only their closure, so later theorems may still end in `sorry`. `transfer_moves` sits in an optional configuration no check requires. The optional exercise `run_nonneg` likewise has a configuration of its own that no stage or check requires, and is outside the whole-lab configuration; its `TODO(you)` body ships commented out in `Solution.lean`, so skipping it leaves no `sorry` for LAB-2.7's `lake check` (§13 issue 14). Statement hash: `sha256(trimRight(Challenge.lean) + "\n")`, as Comparator Live computes it; the edition publishes it, and a changed hash voids every LAB-2 claim to [?] (I7).

**Pipeline.** Per stage: `lake build` → `#print axioms` for the stage's theorems → `lake comparator` on the stage configuration. At LAB-2.7 and the Defence: one `lake check --paranoid` over all default targets (Solution, Broken and Fixed together, not one run each), which takes 172.6 s on the recording host [X RUN-bwrap-lanes], then whole-lab `lake comparator --paranoid` (§13 issue 7), which also runs at every Defence step. A solution that imports `Std` does not finish `lake check --paranoid` in 6 GiB [X RUN-bwrap-lanes]; for it the Defence runs `lake comparator --paranoid`, and `lake check --paranoid` waits for a memory measurement (spine §9.6).

**Sandbox.** The sandbox is recorded as on, off or failed, never required [X RUN-lean-bwrap-docker]. A failed sandbox is re-run with `--inadvisably-no-sandbox` only on the learner's recorded choice (`--sandbox=off`) or in CI (`--sandbox=auto`), never by an agent or a script (spine §9.6, §12 item 57); the receipt then records `sandbox: off` and keeps comparator's "not trustworthy" warning [X RUN-lean-axioms]. W0-S06 measured the sandbox in Docker Engine on Linux and settled the devcontainer's settings from it: confinement stays at Docker's default, and a documented opt-in profile relaxes it [X RUN-bwrap-lanes]. The CI-runner, Docker Desktop and Codespaces lanes have labeled stand-ins only, so no sentence here states their result {{run:RUN-bwrap-lanes}}.

### 3.1 Stages and checks

| Stage | Learner work | Min | Check: exact pass condition |
|---|---|---|---|
| LAB-2.1 | Three calls first (any axioms? which? exit code?), then `statespace check lab2.1` on `Reference.lean` (its stage configuration names `Reference` as the solution module) | 2 | **LAB-2.c1:** the receipt validates against receipt@1; "Your solution is okay!" and "Lean default kernel accepts the solution" are present; `transfer_conserves` lists `[propext, Quot.sound]` [X RUN-lean-ledger]; `challengeSha` equals the published hash |
| LAB-2.2 | `transfer_conserves`, manual mode (proof stage) | 25 | **LAB-2.c2:** comparator accepts (statement match, kernel acceptance); axioms within `comparator.json`; manual mode: the automation scan finds no `grind`, `omega`, `lia`, `simp_arith`, `decide`, `native_decide`, `bv_decide` or `try?` in the taught theorem |
| LAB-2.3 | `transfer_rejected`, manual mode (proof stage) | 20 | **LAB-2.c3:** comparator accepts; axioms within `comparator.json`; manual mode: the automation scan finds none of the tactics LAB-2.c2 lists in the taught theorem |
| LAB-2.4 | `transfer_nonneg`, manual mode (proof stage) | 25 | **LAB-2.c4:** comparator accepts; axioms within `comparator.json`; manual mode: the automation scan finds none of the tactics LAB-2.c2 lists in the taught theorem |
| LAB-2.5 | `run_conserves`, generalizing first (proof stage, `[weekend]`); one call first: "which state does your `ih` mention?" | 45 | **LAB-2.c5:** comparator accepts against the pinned statement |
| LAB-2.6 | the three `xfer_*` theorems; `selftransfer_mints` (buggy, 10 becomes 15) in `broken/` and `selftransfer_fixed` (10 stays 10) in `fixed/`, both by `decide` (proof stage; `upd`, `xfer`, `xferBuggy` supplied) | 25 | **LAB-2.c6:** comparator accepts the three theorems; both specimen files build and close by `decide` [X RUN-lean-selftransfer]; their axiom lists hold no `sorryAx`, `_native` or custom axiom |
| LAB-2.7 | Receipt and claim cards CL-2.1–CL-2.5, faded: method, tool and version prefilled; proposition, "if weakened" and requirement row written | 15 | **LAB-2.c7:** `lake check --paranoid` and whole-lab comparator accept; every card passes claim@1 validation (six fields; method, tool and version equal the receipt's; statement hash matches; the "if weakened" witness refutes the card's own proposition under its weakened assumption; requirement-fit is not [P]) |
| LAB-2.8 | `[stretch]` the transfer as zero-sum postings (−n, +n), foreshadowing S3.L2 | 25 | — |

**Optional exercise** (after LAB-2.8, outside the lab stages; spine §12 item 51). `run_nonneg`: from a non-negative state, any sequence of transfers (disallowed ones change nothing) keeps both balances non-negative; the invariant, not an equality, is carried through the list. It has no stage, check, claim template or run of its own, and nothing waits on it. A learner who writes a claim card for it writes a claim without a template, which claim@1 validation accepts (spine §5.2); its reference proof is not a registered run (§13 issue 14).

### 3.2 Receipt (receipt@1)

`LAB-2`, the stage, the badge; `environment` (devcontainer digest, OS, sandbox state); `tools[]` (`lean`, `lake` and, after `--paranoid`, five more checkers, with versions and binary SHA-256); `statements[]` (the challenge hash); `runs[]` (argv, exit code, verbatim verdict lines for build, `#print axioms`, comparator, `lake check`); `lean` (toolchain, `checkers[{name, version, verdict}]`, `challengeSha`, axioms per theorem, `nativeAxioms`, `sorryCount`, the automation scan); `checks[]` (LAB-2.c1–c7); self-reported `provenance` (`assisted`, `agent`); `claims[]` (CL-2.1–CL-2.5); `tcb[]` ("the Lean 4.35.0 kernel, plus five checkers after --paranoid; leanexport; comparator's plumbing; the sandbox if on; the pinned statement; your machine"). It never trusts an exit code (SP-2.8).

### 3.3 Hint ladders (shipped by W2-T06)

Each check opens with the explanation gate (the failing check, the goal or line it shows, and a hypothesis, in at least 12 words), after which R1 is shown. R0 is prompt-and-compare: a teach-back, three authored ideas revealed, the covered ones ticked; self-assessed, never credited. Past R2, credit is assisted until an unseen variant passes; after R4 and two red runs, a walkthrough to the first divergence and a re-attempt scheduled in Today for 24 hours later; the check stays runnable at any time.

| Check | R1 the concept | R2 where to look | R3 fragment (≤ 3 lines, never the closing step) | R4 informal proof | Unseen variant |
|---|---|---|---|---|---|
| c1 | a receipt holds several verdicts; acceptance needs all | `lean.checkers[]`, `lean.axioms`, `environment.sandbox` | `statespace doctor`, then `statespace check lab2.1 --verbose` | what each verdict line establishes | — (uncredited win) |
| c2 | both branches conserve; the allowed branch is linear arithmetic you can rewrite | the allowed goal after the split: where does `- n` meet `+ n`? | the lemmas `Int.add_comm`, `Int.add_assoc`, `Int.sub_add_cancel` suffice | (a − n) + (b + n) = ((a − n) + n) + b = a + b | a reverse-direction transfer |
| c3 | a false guard sends the `if` to its `else` | decide the `if` with `h` (`simp [h]`, or `split` and dismiss the impossible branch; not the deprecated `if_neg`) | `unfold transfer`, `split`, then a `sorry` for the impossible branch and `rfl` | ¬guard makes the `if` return `s` | a fee-charging transfer |
| c4 | each allowed component needs a different fact; rejected means unchanged | name the guard (`next hg =>`); look for `Int.sub_nonneg_of_le`, `Int.add_nonneg` | `· next hg => exact ⟨?_, ?_⟩` and `· exact ⟨ha, hb⟩` | n ≤ a gives a − n ≥ 0; b ≥ 0 and n ≥ 0 give b + n ≥ 0 | a transfer with a fee field |
| c5 | `run` changes the state; the hypothesis must cover every state | which state do the `cons` goal and `ih` mention? | `induction ns generalizing s with`, then `sorry` in both cases | empty list: `s`; otherwise the hypothesis at `transfer s n`, then one-step conservation | a deposit `run`, held out of the threaded-state bank the lessons draw from |
| c6 | `upd` is pointwise: ask whether the queried account is the updated one | unfold `xfer` and `upd`, split the guard, `simp` with your inequalities | `unfold xfer`, `split`, `sorry` in both branches | frame untouched; debit and credit cancel; the credit reads the debited balance | a three-account split |
| c7 | the witness must refute this card's proposition | the field `statespace check lab2.7` names | the pattern on a CL-1.x card | weaken "the accounts are distinct" (SP-2.1), not the guard (SP-2.2) | a generated card with one wrong field |

GATE-labs re-checks every rung, lemma names included, on each toolchain bump.

### 3.4 Stuck protocol, Prove-it, lanes

**Stuck protocol** (M-stuck-protocol). At 25, 45 and 90 minutes, `statespace stuck` captures the goal, the pinned statement and a required hypothesis, and emits a minimal example with private paths stripped (for Lean Zulip's new-members stream), a packet for the learner's own agent, and a park option. A parked goal is a named `sorry`: comparator rejects the theorem, the receipt records `sorryCount`, and the claim reads "PROVED modulo k assumed lemmas", each lemma [A], with a re-find after 7 days.

**Prove-it** (M-prove-it; agent closed). After LAB-2.5 and LAB-2.6, `statespace defend` seeds two or three mutations of the learner's artifact; the learner predicts, then Lean and comparator grade (`prove-it` events). Keys are computed on the learner's artifact; "expected" is the reference outcome GATE-labs holds. Defence Part B uses the same operators on fresh seeds.

| GEN-defend template | Mutation | Expected on the reference artifact | Basis |
|---|---|---|---|
| t1 drop a hypothesis | remove `generalizing s` | the build fails in the `cons` case | {{run:RUN-lean-ih-ungeneralised}} |
| t2 weaken a guard | drop `n ≤ s.a` from `transfer` | conservation and `run_conserves` build; non-negativity and rejection fail (omega's counterexample); comparator rejects the definition | {{run:RUN-lean-noguard}} |
| t3 change the encoding | `Int` → `Nat` for balances and amounts | omega-style proofs build, with unused-variable warnings on `ha` and `hb` (non-negativity is vacuous over `Nat`); manual `Int`-lemma proofs break; comparator rejects the definitions | {{run:RUN-lean-s2-cells}} |
| t3 change the checking route | `decide` → `native_decide` in `selftransfer_mints` | the build passes; `#print axioms` lists a `…_native.native_decide.ax_1_1` axiom; `statespace check` rejects it as not permitted | [X RUN-lean-axioms] |
| t1 change a hypothesis | add `(h : n = 0)` to `transfer_conserves` under the same name | the build passes; comparator: "theorem statement do not match" | [X RUN-lean-comparator] |

`native_decide` mutants touch only closed goals; with free variables the build fails ("Expected type must not contain free variables" [X RUN-lean-comparator]). GATE-labs checks that each mutant elaborates or that its key says it will not.

**Lanes.** Lane B only: every check and stamp is "reported from your machine"; the kernel never runs in the tab. "Re-checked here": schema validation, the statement hash, claim@1 structure and the "if weakened" witnesses (self-transfer on INS-z3 [X RUN-z3-selftransfer]; guard witnesses by the evaluator). Lane A begins in LAB-3 (D-14). Phones: predict, see the recorded run with its id, queue the stage for the laptop.

---

## 4. Specimens SP-2.1–SP-2.9

Labels come from runs (M-specimen-cabinet): "mounted" once a run verifies the label, "kept" after a re-find on a fresh variant at 7 days or more.

| ID | Witness | Violates, because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|
| SP-2.1 | 10 at account 0; a self-transfer of 5 under `xferBuggy` gives 15; Z3: n = 1, account 0 to 0 | conservation: both balances read the old state, so the credit overwrites the debit | yes: n = 1 | read the destination after the debit (`xfer` keeps 10) | [X RUN-lean-selftransfer, RUN-z3-selftransfer] |
| SP-2.2 | no guard: a = 0, b = 0, n = 1 leaves the sender at −1 | non-negativity, not conservation: sums never needed the guard | yes: amount 1 under an Optimize objective | restore `n ≤ s.a`; state non-negativity as its own theorem | [X RUN-z3-conservation-noguard, RUN-z3-optimize-min]; Lean twin {{run:RUN-lean-noguard}} |
| SP-2.3 | `induction ns` without `generalizing s`: `ih` is about `s`, the goal about `transfer s n` | no property (a proof failure, class G13): `run` changes the state | n/a | `generalizing s`, or `∀ s` after `ns` [X RUN-lean-axioms] | {{run:RUN-lean-ih-ungeneralised}} |
| SP-2.4 | a `sorry` builds with exit 0; `#print axioms` lists `sorryAx` | "green build means proved": the kernel accepts `sorryAx` | one declaration | the axiom policy; a parked goal carried as [A] | [X RUN-lean-axioms] |
| SP-2.5 | `lake check` rejects three non-standard axioms yet logs "Lean default kernel accepts the solution" (sandbox off, course code) | "one line tells the story": kernel acceptance and axiom policy are separate verdicts | one declaration per axiom kind | parse every verdict line | [X RUN-lean-axioms] |
| SP-2.6 | a `debug.skipKernelTC` declaration and a theorem `1 = 2` built on it: exit 0, no axioms; `leanchecker` rejects | "clean build and axioms mean proved": the option skips the kernel | one option line | kernel replay | [X RUN-lean-skipkernel] |
| SP-2.7 | `(h : n = 0)` under the same name: "theorem statement do not match"; `transfer` returning its input: "Const does not match"; both build green | statement integrity | one hypothesis; one definition | the challenge pack and comparator | [X RUN-lean-comparator] |
| SP-2.8 | no bubblewrap: exit 2; bubblewrap under default Docker: exit 1, a rejection's code | "the exit code is the verdict": exit 1 also covers a failed build or sandbox | — | parse verdict lines; record the sandbox | [X RUN-lean-bwrap-docker] |
| SP-2.9 | the idle transfer satisfies all four statements, which `--paranoid` accepts for the pinned `transfer`; (1, 0) with n = 1 ending at (1, 0) is permitted by them, forbidden by R | the requirement, not a theorem: no statement says money moves (class G1) | yes: amount 1 from (1, 0) | pin `transfer_moves`; requirement-fit stays [A] | {{run:RUN-lean-intent}} |

## 5. Claim templates CL-2.1–CL-2.5

Shared fields. **Model:** the pinned challenge (core Lean 4.35.0, `autoImplicit false`). **Method:** `lake comparator`, `--paranoid` at LAB-2.7 and the Defence, the automation scan. **Correspondence:** [N]: no implementation yet (S6). **Stamp:** PROVED [P] · Lean 4.35.0 kernel · axioms listed, plus "6 checkers" after `--paranoid` [X RUN-lean-comparator]; badge "reported from your machine". **Strip:** proposition-of-model [P] · correspondence [N] · requirement-fit [A], "restated by the learner; no checker reads requirements". **Assumed on CL-2.1–CL-2.4:** SEAM-1 (carried) and SEAM-15 (held); CL-2.5 rests on both too (§13 issue 10). LAB-2.7 prefills method, tool and version; the learner writes the proposition in words, the "if weakened" entry and the requirement row.

| Claim | Proposition | Further assumption | If weakened (reference entry) | Requirement row | Status |
|---|---|---|---|---|---|
| CL-2.1 | `transfer_conserves` | sender and recipient are distinct (two fields) | let them coincide, both balances read from the old state: a self-transfer of 1 changes the balance [X RUN-z3-selftransfer] | a transfer never creates or destroys money | [X RUN-lean-ledger] |
| CL-2.2 | `transfer_nonneg` | — | drop `n ≤ s.a`: a = 0, n = 1 gives −1 [X RUN-z3-optimize-min]; Lean {{run:RUN-lean-noguard}} | no transfer leaves a balance negative | [X RUN-lean-ledger] |
| CL-2.3 | `transfer_rejected` | — | drop `0 ≤ n`: (10, 3) with n = −5 becomes (15, −2) {{run:RUN-lean-noguard}} | a disallowed transfer changes nothing; "the caller is told" is [N], since the model has no outcome value (S3) | [X RUN-lean-ledger] |
| CL-2.4 | `run_conserves` | SEAM-2: transfers run one at a time | CL-2.1's witness on a one-element list; weakening SEAM-2 leaves this proposition true and cracks correspondence (ER-2) | no sequence of transfers creates or destroys money | [X RUN-lean-ledger] |
| CL-2.5 | `xfer_frame ∧ xfer_pair ∧ xfer_self` | — | read the destination from the old state (`xferBuggy`): 10 becomes 15 [X RUN-lean-selftransfer] | a transfer among many accounts conserves and touches only its two accounts | {{run:RUN-lean-finmap}} |

## 6. Seams and erosions

| Seam | Planted · carried | Fate | Other endpoint | Segment cracked |
|---|---|---|---|---|
| SEAM-1 balances are unbounded integers | S1 (CL-1.1, CL-1.2); carried by CL-2.1–CL-2.4 | erodes: ER-1 | S6.L4 · SP-6.4 | correspondence ("allowed ⇒ succeeds"); conservation untouched |
| SEAM-2 transfers run one at a time | S2.L7 · CL-2.4 | erodes: ER-2 | S5.L3 · SP-5.1 | correspondence: a sequential proof, a concurrent system |
| SEAM-15 the 4.35.0 kernel accepts only well-typed terms | S2.L9 · CL-2.1–CL-2.4 | held | `--paranoid` at every Lean Defence | none; advisories become change cards |

On the builder's path SP-5.1 exists before CL-2.4 mints, so CL-2.4 mints with SEAM-2 cracked and ER-2's forecast runs in LAB-2.5 ("Restate CL-2.4; which segment cracks?" Key: correspondence), as the S5 spec expects. No erosion cashes inside S2.

## 7. Audit anchors AUD-2.1–AUD-2.4

W1 ships them keyed by executed runs only; W2-T13 adds variants. They follow LAB-2, since erroneous examples need prior knowledge (A small [alemdag25]), recur a week later, and each session's sound share is seeded in 30–60%.

| ID | Class | Sound twin | Flawed variant | Typed evidence | Based on | Variant operators |
|---|---|---|---|---|---|---|
| AUD-2.1 | G1 | a refund theorem covering both parties (key to record, §13) | `refund_nonneg` constrains only the customer; the merchant can go negative [X RUN-z3-refund-a21] | a scenario the theorem permits and the requirement forbids | Spec-Harness: 22.7% of accepted specs had no postcondition (2026-04; https://arxiv.org/abs/2604.00280) | drop a conjunct; weaken a postcondition |
| AUD-2.2 | G6a | the lemma with standard axioms only [X RUN-lean-axioms] | closed by `sorry` or a custom axiom, build green [X RUN-lean-axioms] | the offending declaration and its `#print axioms` line | AlphaVerus agents used `assume(false)` (2024-12; https://arxiv.org/abs/2412.06176) | insert `sorry`, a custom axiom, or `native_decide` (G6b) |
| AUD-2.3 | G6c | the same theorem passing replay [X RUN-lean-skipkernel] | built under `debug.skipKernelTC` [X RUN-lean-skipkernel] | the option line and the replay verdict | an old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs (2025-07; https://arxiv.org/abs/2507.14722) | the bypass under another statement |
| AUD-2.4 | G8a | a comparator-accepted solution [X RUN-lean-comparator] | a weakened statement under the same name, or a redefined `transfer` [X RUN-lean-comparator] | the mismatched identifiers and the verdict | FormalQualBench: "Comparator catches the illegal axiom" (runs 2026-03-18/19; https://math.inc/formalqualbench) | add a hypothesis; redefine a constant |

## 8. The S2 Defence

Untimed, at least two sessions, within a week of LAB-2.7; agent closed in Parts A and B.
- **Part A (about 35 min; 12 unseen items, a call on each; items 1–4, 5–8 and 9–12 in this order).** GEN-which-stamp t1 ×3 (receipt axiom lines, one hiding `sorryAx` in a dependency; comparator output, including "voids to [?] · statement mismatch") and t2 (a `--paranoid` qualifier); GEN-proof-structure t1, t2 (an informal threaded-state induction with a circular distractor) and t3 ×2; GEN-call-it t1 (an outcome from raw output) and t4 ×3 (permitted-but-forbidden outcomes; restatements; what each check establishes). Completion tests map as in §0.
- **Part B (about 20 min).** Four to six §3.4 mutations on fresh seeds, predicted first; `--paranoid` on the unmutated artifact tests SEAM-15.
- **Part C (about 20 min).** Four cases from AUD-2.1–AUD-2.4 and variants, at least one sound, typed evidence.
- **Part D (about 10 min).** The induction in `run_conserves`, aloud for two minutes, then a three-idea self-check against Part A; required, uncredited.

Signed off per spine §8.6, with the Wilson interval shown (10 of 12 gives 0.55–0.95 [D]), plus fresh items on the twelve KCs right in three spaced sessions. A failed part is offered again in Today from three days later, on fresh seeds, and only that sitting can count toward sign-off; the part stays open as practice on fresh seeds at any time, and nothing else waits on it. Sign-off starts the Lean keep-alive and prompts technical note 1 (rule 5's three parts, from memory first).

## 9. Drawers used

**D-05** Induction, informally (S2.L1, S2.L4). **D-07** The Lean error museum, each exhibit with its message, meaning, usual cause and first move: unsolved goals {{run:RUN-lean-ih-ungeneralised}}; omega's "possible counterexample" {{run:RUN-lean-noguard}}; a circular appeal's termination failure, the `def`-for-a-proposition linter, deprecations, unused-variable and unused-simp-argument linters, unknown identifiers under `autoImplicit false`, `ℤ` as Mathlib notation {{run:RUN-lean-s2-cells}}; "Expected type must not contain free variables" [X RUN-lean-comparator]; the `sorry` warning with exit 0 [X RUN-lean-axioms]. **D-08** The Natural Number Game fallback: the community in-browser port at lean.cau.li/game (disclosed, uncredited, a large download whose size the card shows [X RUN-lean-wasm]; nothing asks first, OD-6), the game from its repository at a pinned commit, and original induction warm-ups in the template. **D-15** The devcontainer and `statespace doctor`. Also referenced: D-02, D-04, D-06. No deferred drawer triggers in S2.

## 10. Reading list (dated, section-level)

Section-level pointers sit in each lesson; the sources, with read dates:

| Source | Sections | Read |
|---|---|---|
| Natural Number Game, https://adam.math.hhu.de/#/g/leanprover-community/NNG4 | Tutorial, Addition, Multiplication, Implication | 2026-10-23 (repository world list) |
| *Theorem Proving in Lean 4*, https://lean-lang.org/theorem_proving_in_lean4/ | §3.1–§3.3.3, §4.1, §4.4, §5.1–§5.2, §5.8, §7.4, §7.6, §8.3, §12.2–§12.5 | 2026-10-23; §4.1 and §4.4 2026-10-24 |
| "Validating a Lean Proof" (4.35.0), https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/ | Printing Axioms; Re-Checking; Gold Standard; Remaining Issues | 2026-10-23 |
| "Did you prove it?", https://leanprover-community.github.io/did_you_prove_it.html | all five sections | 2026-10-23 |
| #14576 postmortem, https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/; advisory, https://www.openwall.com/lists/oss-security/2026/08/02/1 | whole | 2026-08-01, 2026-08-02; checked 2026-10-21 (R1 log) |
| Comparator Live and lean-eval READMEs (github.com/leanprover) | trusted challenges; scoring | 2026-10-21 (R1 log) |

## 11. Runs this stage needs

**Executed and cited:** RUN-lean-ledger, RUN-lean-selftransfer, RUN-lean-axioms, RUN-lean-skipkernel, RUN-lean-comparator, RUN-lean-bwrap-docker, RUN-lean-mathlib, RUN-lean-toolchain, RUN-z3-selftransfer, RUN-z3-optimize-min, RUN-z3-conservation-noguard, RUN-z3-refund-a21, and, recorded in W0, RUN-lean-plaingoal, RUN-lean-wasm and RUN-bwrap-lanes. RUN-lean-plaingoal, executed on Ledger.lean's two reference proofs [X RUN-lean-plaingoal], stays the method's evidence, and the shipped strips come from GATE-replay's build.

| To record | Must record | Task |
|---|---|---|
| RUN-lean-noguard | three guard weakenings (none; no `n ≤ s.a`; no `0 ≤ n`): which theorems build, omega's text, the negative-amount witness | W2-T10 |
| RUN-lean-ih-ungeneralised | the open `cons` goal; the unused-`ih` linter | W2-T10 |
| RUN-lean-intent | `--paranoid` on the four theorems; the four statements for the idle transfer; `transfer_moves` for both transfers | W2-T10 |
| RUN-lean-finmap | the `xfer_*` theorems accepted, with axioms | W2-T10 |
| RUN-lean-s2-cells (new) | the other authored S2 cells: manual proofs and axioms, `guard_gives_cover`, the `def` linter, `credit2`, `net_append`, the circular appeal, the `Int` → `Nat` mutant, D-07's exhibits; also the parallel strips of S2.L0, S2.L3, S2.L5, S2.L6 and S2.L7 (§1), S2.L7's faded cells and Proof Blocks lines, and S2.L8's other `decide` instance | W2-T10 |
| RUN-bwrap-lanes (three lanes) | the CI-runner, Docker Desktop and Codespaces lanes, each a labeled stand-in until recorded | W0-S06, owner actions 2 to 4 |
| RUN-twin-pins | the three twins | W2 |

## 12. Time budget against the roadmap

| Part | Planned [D] | Basis |
|---|---|---|
| Reading | 3.0–5.0 h | §10's targeted sections |
| Lessons | 4.4–6.8 h | four core at 40–60 min, six bridges at 15–25 min, S2.L0 at 15–20 min |
| Build | 5.4–12.1 h | LAB-2.1–LAB-2.6, 142 nominal minutes, proof stages up to 3× (2.4–7.1 h), plus 3–5 h of Natural Number Game play |
| Write | 1.8–3.0 h | LAB-2.7 (15 min, up to 2×) and technical note 1 |
| Defence | 1.0–1.5 h | about 85 minutes over two sessions |
| **Total** | **15.6–28.4 h** | roadmap 3–6 weeks, 14.25–28.5 h of stage work at 4.75 h a week: GATE-budget passes at the upper bound; no lower-bound warning |

Keep load: twelve KCs × about ten two-minute reviews ≈ 4 h over their first 60 days [D], inside the Keep block. CL-2.1 mints at LAB-2.2 and every later stage adds a claim or specimen, so no two-week gap opens. The high estimate sits at the roadmap's bound, so any addition must name its displacement. The `[stretch]` stage LAB-2.8 and the optional `run_nonneg` exercise are excluded (§13 issue 14).

---

## 13. Spine issues

Resolved in spine revision 3 on 2026-10-25 (spine §15); the section numbers in each item's closing note are the spine's.

Nothing below is applied silently.

1. **Misconception namespace.** As S1's issue 4; S2 proposes **dp:L9** (a green build or zero exit read as a checked proof). *Revision 3: already resolved (ID conventions; §12 item 40).*
2. **Runs.** Add RUN-lean-s2-cells (with S3's three, W2-T10 becomes eighteen runs); widen RUN-lean-noguard to three guard weakenings (CL-2.2, CL-2.3, Prove-it t2). *Revision 3: already resolved (§9.5); the run proposed for non-negativity over sequences is declined with issue 14.*
3. **Unregistered evidence.** `lean-measure/measure.log` (the `lake help` text S2 quotes) and `a2r3/out/lean_audit.txt` (Lean twins of AUD-2.1) need run IDs, for example under RUN-lean-toolchain and a new RUN-lean-refund-a21. *Revision 3: already resolved (§9.5).*
4. **Anchors.** AUD-2.1's sound twin has no key (RUN-z3-refund-a21 keys only the flawed side). AUD-2.4's basis quotes an illegal-axiom incident (G6a or G8c), not statement substitution (G8a). *Revision 3: already resolved (§6, §6.2).*
5. **§8.8 lacks a custom-axiom row;** this file treats it like `sorryAx` (no [P]; the axiom carried as [A]). *Revision 3: already resolved (§8.8).*
6. **GEN-defend's templates** name neither a statement change nor a `native_decide` route change, both in S2's Part B; within the 2–4 cap, widen t1 to "change a hypothesis" and t3 to "change the encoding or the checking route". *Revision 3: already resolved (§8.3 GEN-defend).*
7. **`lake check` per stage** (spine §9.6) fails on any `sorry` left in default targets; per-stage checks use comparator's per-theorem closure, and `lake check` runs at LAB-2.7 and the Defence. *Revision 3: already resolved (§9.6 `statespace check`).*
8. **LAB-2.1's reference.** Shipping RUN-lean-ledger's file whole would hand out LAB-2.2–LAB-2.5; only `transfer_conserves` ships, and a copied reference fails LAB-2.c2's manual-mode scan, since it closes with `omega` [X RUN-lean-ledger]. *Revision 3: already resolved (§3.2 LAB-2.1).*
9. **Dependency.** S2.L10 needs INS-interp (W2-T08); W2-T04 depends only on W2-T03 and W2-T10. *Revision 3: already resolved (§13 W2-T04).*
10. **SEAM-1 and SEAM-15 omit CL-2.5,** also an `Int`, kernel-checked claim (compare S1's issue 9). *Revision 3: already resolved (§5.3).*
11. **`transfer_moves`,** SP-2.9's cure, is an optional pinned statement with an optional configuration; no stage or check changes. *Revision 3: already resolved (§3.2 LAB-2).*
12. **Zero amounts.** S2's guard allows n = 0 (RUN-lean-ledger); S3's `Amount` is positive and its policy rejects zero; S3.L7 should show the change as a recorded decision. *Revision 3: already resolved (§3.3 S3.L7).*
13. **Minor.** S2.L9 adds a third twin (PR #14577); D-15 is missing from §3.2's drawer line; M-self-explanation's "none credited" should exempt S2.L0's closing item; §3.11 counts game play under Build, §3.2 beside reading. *Revision 3: already resolved (§3.2, §7, §3.11).*
14. **Sequences and non-negativity.** The roadmap's project asks for "preservation under arbitrary finite sequences of allowed transfers". The required path proves conservation over sequences (`run_conserves`, LAB-2.5, CL-2.4); non-negativity over sequences (`run_nonneg`) is an optional exercise after LAB-2.8, outside the lab stages, because the budget's high estimate already sits at the roadmap bound (§12). The exercise has no stage, claim template or run of its own: a claim card for it is a claim without a template, which claim@1 validation accepts (spine §5.2), and its reference proof is not a registered run. LAB-2.c5's unseen variant, formerly "`run` preserving non-negativity", is now a deposit `run`, since the pinned statement would make the old one seen. `transfer_moves` (issue 11) and `run_nonneg` need the same commented-out `TODO(you)` body; by issue 7, LAB-2.7's `lake check` fails while a body is `sorry`. *Revision 3: declined: OD-15, accepted on 2026-10-25, fixes 8 stretch stages, and S2's high estimate sits at its roadmap bound (§12 items 50 and 51).*
15. **Finite maps.** The roadmap's "then generalize to finite maps of accounts" is met by total functions `Acct → Int` under pointwise update, with the local theorems `xfer_frame`, `xfer_pair` and `xfer_self` (S2.L8). No total over a finite set of accounts is stated, because `Finmap` needs Mathlib [X RUN-lean-mathlib] and total functions keep the proofs at `if` and arithmetic [D]. Spine §12 should log the substitution, and §5.2's CL-2.5 row ("conserves") should say the claim is local. *Revision 3: applied (§5.2 CL-2.5; §12 item 50).*
16. **Dependent types.** The roadmap lists dependent types as S2 theory. S2.L2 names the idea where it first appears (the type of `h` in `guard_gives_cover` mentions `s` and `n`) and points forward; the worked dependent-type example is S3.L2's `Amount := {n : Int // 0 < n}` (KC-3.refined-types). Spine §12 should record the move to S3. *Revision 3: applied (§12 item 50).*
17. **Manual mode fails the stage's check.** M-manual-mode, the spine's S2.L6 objective and BRIEF §3.3 turn `grind` and `omega` off in manual variants, so LAB-2.c2–LAB-2.c4 now fail while the automation scan finds automation in the taught theorem; nothing else waits on them, and the claim may still mint. Spine §3.2's LAB-2.c2 ("manual-mode flag recorded"), LAB-2.c3 and LAB-2.c4 need the same pass condition. *Revision 3: applied (§3.2 LAB-2.c2–LAB-2.c4); the check cells name this spec for the tactic list.*
18. **The Natural Number Game.** Spine §3.2's S2.L1 objective says "finish the required worlds"; S2.L1 now asks the learner to play them as far as is useful, because the game's own progression may gate later levels (not verified here; W2-T04 checks it and dates the reading) and the course adopts no third-party lock. Its graded item never depended on game progress. *Revision 3: applied (§3.2 S2.L1).*
19. **Parallel theorems (Q-1).** The owner accepted on 2026-10-25 that LAB-2's complete proofs stay public as history, with provenance an honor system (OD-8), and that S2's worked examples, Goal Replay strips, fading rungs, Proof Blocks and bank instances prove parallel theorems, never a theorem that a LAB-2 stage asks for: `transfer_conserves`, `transfer_rejected`, `transfer_nonneg`, `run_conserves`, the three `xfer_*` theorems or the two `decide` specimens. They also avoid the variants the hint ladders keep unseen (§3.3): a reverse-direction transfer, a fee-charging transfer, a transfer with a fee field, a deposit `run` and a three-account split. §1 names the parallel theorems, and their strips stay shape-only and placeholder-tagged until RUN-lean-s2-cells records them (§11). What stays on LAB-2's theorems, because it shows a failure, reads a statement or names a move and shows no complete proof: SP-2.3 and S2.L7's Segment 2 with its template-3 item; PQ1 and PQ2 of S2.L5 and S2.L7; S2.L7's explain-back and Part D (§8); LAB-2.1's reference module (issue 8); and, in `curriculum/D-drawers.md`, D-05's "Generalize first" with its section D's informal example, and D-07's exhibit of the open `cons` goal. *Revision 3: applied (§3.2, INS-goal-replay, §12 item 52).*
