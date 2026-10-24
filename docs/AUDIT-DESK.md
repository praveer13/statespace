# The Audit Desk

**Status:** design specification for M-audit-desk, M-twins, GEN-spot-the-gap, SCR-audit, GATE-audit and GATE-audit-blind. It elaborates spine §6 and never overrides it; where this document adds a rule the spine does not state, the rule is marked [D] and, if it changes the spine, it is listed under "Spine issues" at the end. **Date:** 2026-10-23 (machine clock). **IDs:** every ID comes from `docs/spine/SPINE.md`. **Owner decisions:** the adopted defaults OD-1 to OD-14 (OD-15 proposed) await owner review.

**Sources, in precedence order.** The roadmap (`research/context/roadmap.md`); executed runs (`research/spikes/RESULTS.md`, `research/evidence/`); the v2 brief (`research/synthesis/BRIEF.md`, §4.8 and V2-04); the four digests, chiefly the landscape digest §4 and the pedagogy digest §1 and §3.6; three research reports, `research/reports/R2-ai-fv.md` ("the AI-verification report"), `R5-authz-compilers-assurance.md` ("the assurance report") and `L3-assessment-ai.md` ("the assessment report"), with their verification logs; the adversarial reviews A3, A6, A7 and A8, cited by the brief's finding IDs (A3-C3, A8-04 and so on); the spine. Change IDs D1–D26 belong to the first review digest.

**Tags** (as in the spine). `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run that must be recorded before the sentence ships; `[V]` re-checked against a primary source by a digest; `[D]` design rationale or derived arithmetic; evidence grades **A–D** follow the pedagogy digest (A meta-analysis or several RCTs; B one good similar experiment; C small, correlational or preprint; D rationale). Tool numbers, verdicts, flags and versions from this course's own runs carry a run tag; figures and versions quoted from the literature carry their source.

**Words.** This is an internal document. "Judgment" is the internal name of outcome (g)'s measure; learner copy says "audit accuracy". "Anchor", "variant", "pool", "key" and "acceptable set" are internal too; learner copy says "case", "kind of gap" and "sound". The spine calls matched sound and flawed cases "twins"; learner copy cannot, because glossary term 19 reserves "twin" for production twins (see Spine issues), so this document writes "pair" for the matched cases and "sound twin" only where it quotes spine §6.2.

---

## 1. Purpose: end-state (g)

The roadmap closes on seven abilities. The last is the one every other stage serves: **(g) "decide which correctness claims are justified before trusting agent-written code."** The Audit Desk is where the course trains and measures that decision.

A case is an agent's proposal: a claim (quoted, never stamped), the statement the claim rests on (a theorem, a solver query, a TLA+ property, a policy, a SQL plan) and the diff that produced it. The learner decides whether the claim is justified, says in a checkable form what the statement actually establishes, names the kind of gap if there is one, and anchors evidence to the lines that carry it. A checker, never a person or a model, computes every key.

### 1.1 What it measures

| Item | Definition | Where it lives |
|---|---|---|
| Outcome (g), spine §2.2 | "Audit Desk balanced accuracy and per-class precision and recall; GEN-spot-the-gap; GEN-which-stamp; the capstone demonstration" | Judgment, derived at read time (I2) |
| Judgment | balanced accuracy on `own · unseen` audit decisions, with an interval, plus per-class precision and recall once a class has n ≥ 10 (§6) | SCR-audit, private and local |
| Core KCs | KC-10.agent-proposal-triage, KC-4.trust-stack, KC-2.kernel-not-requirement | every case also carries the KCs of its class (§3) |
| Confusable set | set C, "gap class": G1–G13 and their subclasses; opens at S2 | M-which-is-it rules apply |
| Dose | 2–3 cases a week; at least six exemplars per class (spine §4.1) | the Keep block; 0–1 case per Today session |

### 1.2 Why this form, and how much to expect

The Desk combines six mechanisms whose principles have outcome evidence. Together they promise no more than tenths of a standard deviation; the median education effect is about 0.10 SD [kraft20], and no copy promises more.

| Principle | Use at the Desk | Effect and boundary | Grade |
|---|---|---|---|
| Erroneous examples | every flawed case | g = .136; nothing on the immediate test, d = .33 a week later (N = 390, middle-school decimals); helps learners with prior knowledge; learners liked it less | A (small) [alemdag25][mclaren15] |
| Contrasting cases | matched sound and flawed pairs | d = .50, larger when learners compare first and meet the principle after | A [alfieri13] |
| Interleaving confusables | classes mixed across stages within set C | g = 0.42, after first exposure | A [brunmair19] |
| Elaborated, layered feedback | key, pair, witness and note after filing | elaborated 0.49 vs right/wrong 0.05; over a third of feedback interventions harmed | A [vdkleij15][kluger96] |
| Distinguishing scenarios | the "scenario" evidence type | invalid test suites fell from 29.7% to 9.3% (non-randomized) | B−/C [wrenn19] |
| Calibration shown as bias | the step-1 call feeds the Mirror | feedback cut overconfidence, not discrimination | B/C [stone00] |

Two boundaries shape the design. Erroneous examples help only with prior knowledge, so a case is scheduled after the lab stages that teach its class (§5.1). Their benefit appears on delayed tests, so every case is re-checked about a week later on a fresh variant (§5.5).

### 1.3 What it is not

- **Not anti-cheat.** Provenance is self-declared and calibrates rather than polices (OD-8); oracles are "unseen, not secret".
- **Not graded by a model.** No language model grades a finding, and no case is generated by a model at run time; models may draft adversarial cases at authoring time, and a recorded run certifies each one (spine §8.1).
- **Not a gate.** Cases are always browsable and never locked (I5); Judgment unlocks nothing.
- **Not a base rate.** The sound share is seeded so that it cannot be learned (§5.2); it says nothing about how often real agents fail. Base-rate cards from the literature are labeled "context-specific".
- **Not a source of exploit code.** "Based on" cards cite dated incidents and link their sources; no case ships a working bypass (AUD-2.3 elides its construction, §3).

### 1.4 The v1 defects this design answers

v1's Desk had the right target and a gameable instrument. Each defect below has a counter in this document.

| v1 defect | Source | Counter in v2 | Section |
|---|---|---|---|
| 4 of 32 cases sound, so "reject everything" scored 87.5% precision and 100% recall, beating the mock-up learner's 71% and 64% [D] | A3-C3; A8-04 | matched pairs, a seeded 30–60% sound share, balanced accuracy | §5.2, §6 |
| three of the four sound cases sat last in their course's list | A8-04 | seeded order; last-is-sound in GATE-audit-blind | §5.3, §7 |
| each course's cases used the classes that course had just taught | A8-04 | interleaving across stages; topic-is-class | §5.3, §7 |
| a home-page teaser named a case's gap; agent claims wore a PROVED stamp | A7-08 | counts and subjects only; agent claims as quoted UNREVIEWED text (I8) | §5.3, §5.4 |
| the first class radio was pre-selected, and evidence was free text | A7-09 | no default; typed, line-anchored, engine-checked evidence | §5.4, §6 |
| single-label keys over overlapping classes | A8-04 | a primary class plus an acceptable set | §2.4, §6 |
| cases unlocked by "set"; about one case for several classes; single use | A3-C2, A3-M7 | always browsable; at least six exemplars per class; fresh variants | §4, §5 |
| the flagship refund case did not compile | D3; A2-F4 | every key from a recorded run; GATE-audit builds every case | §3, §10 |
| percentages shown without n | A7-09 | counts in sessions; rates with intervals only at n ≥ 10 | §6 |

---

## 2. Gap taxonomy v2

### 2.1 Three kinds of defeater

The taxonomy groups its thirteen classes by what a gap attacks, using the three defeater types of eliminative argumentation (SEI CMU/SEI-2015-TR-005, Goodenough, Weinstock and Klein; summarized in the assurance report, finding F28):

| Kind | Attacks | In that report's words | Classes (spine §6.1) |
|---|---|---|---|
| Rebutting | the claim | "If R is true, the claim is false" | G1, G2, G3, G12 |
| Undermining | the evidence | "If UM is true, the evidence is invalid" | G4, G5, G6, G7, G11 |
| Undercutting | the inference | "the truth of the rule's premises is insufficient" | G8, G9, G10, G13 |

Read at the Desk: a **rebutting** gap means that, read against the requirement, the claim is false or empty; there is a behavior it says cannot happen, or no state it covers. An **undermining** gap means the evidence does not mean what it is taken to mean: the arithmetic differs, the output was inconclusive, something unchecked carried the proof, or an assumption was left out. An **undercutting** gap means the evidence is valid about something, but not about the thing claimed: a different artifact, a coarser step, a blinder observer, or a counterexample to induction read as a bug. The grouping follows the brief and the spine; the assurance report offered a different regrouping, which the spine did not adopt. GEN-spot-the-gap uses the kinds as its four template families (rebutting, undermining, undercutting, sound).

### 2.2 The thirteen classes

"Evidence" names the typed evidence a finding of that class must carry (§6.3 lists how each type is checked).

| Class | Kind | Name | Definition: the claim fails because… | Telltale | Evidence |
|---|---|---|---|---|---|
| G1 | rebutting | Statement too weak | the statement is true and checked, but permits behavior the requirement forbids; it proves less than the claim says | a party, account or field the statement never mentions | a scenario the statement permits and the requirement forbids |
| G2 | rebutting | Vacuous premise | the hypotheses cannot all hold together, or no reachable state meets them, so the statement is true of nothing | `unsat` with no premise witness; a guard that never fires | the premises alone are unsatisfiable, anchored to the conflicting lines |
| G3 | rebutting | Wrong property kind | the property is of a different kind than the requirement needs: safety for liveness or the reverse, or a single-trace property for a relation between executions | "terminates" argued from deadlock freedom; an invariant standing in for "eventually" | a behavior of the right kind that the stated property cannot see: a lasso, a finite prefix, or a pair of executions |
| G4 | undermining | Encoding and type-semantics slip | the statement is about a model whose arithmetic, types or defaults differ from the implementation's | `Int` for `i64`; `Nat` subtraction; signedness; a dropped type ascription | a witness under the implementation's semantics |
| G5 | undermining | Bounded or inconclusive presented as proof | the check's raw output (`unknown`, a timeout or `rlimit` stop, a run stopped at a deadlock, a bounded or fixed-constant check) is reported as an unbounded verdict | "no counterexample found"; [P] on a model checker's output | the raw verdict line with its reason, or the argv and stop line, set against the stamp table (spine §8.8) |
| G6 | undermining | Hidden trust | the result leans on something unchecked inside or beneath the checker | a green build with a non-standard axiom; a missing replay; a known-bad version | the offending declaration and its axiom line; the option line and replay verdict; the missing step; the version or configuration read back |
| G7 | undermining | Unstated environment assumption | the result holds only under an assumption about the environment that the claim leaves out | fairness on an action the system does not control; "exactly once" | the assumption and the behavior that appears when it is removed |
| G8 | undercutting | Model–implementation drift | the checked artifact is not the shipped one | a different statement, function, checker, encoder or code path | the mismatched identifiers; a state or trace step where the implementation departs from the model |
| G9 | undercutting | Granularity | the model's atomic step is coarser than the implementation's, so the code interleaves where the model cannot | one action in the spec, several statements in the code | the code lines set against the action, with an interleaving the action forbids |
| G10 | undercutting | Observer too weak | the property's observer sees less than the real client or attacker | bodies without counts; outcomes without aborts; balances without outcome classes | paired states the observer equates and the attacker distinguishes |
| G11 | undermining | Test presented as proof, or common-mode evidence | a finite or one-instance check is stamped as proof, or two "independent" checks share the failure's source | [P] on differential runs; "results match" | the stamp set against the method, with a distinguishing instance where one exists |
| G12 | rebutting | Requirement mismatch | the statement faithfully proves a different requirement: a reinterpretation, a blanket claim that forbids legitimate behavior, or a statement false as written | "no tenant can ever observe any change" | a scenario of legitimate behavior the claim forbids, or forbidden behavior it permits |
| G13 | undercutting | Induction failure confused with a bug | a satisfiable inductive step whose pre-state is unreachable (a counterexample to induction, CTI) is treated as a reachable bug, and correct code is changed | an agent "fixes" a command right after a `sat` inductive step | the CTI's pre-state shown unreachable within the stated bound, plus the diff |

A sound case carries its own evidence: a restatement of what the statement establishes, made checkable as multiple true/false over concrete scenarios (§5.4, step 3).

### 2.3 Subclasses

Subclasses sharpen the evidence a finding needs. Scoring counts classes; the subclass is optional on the form, recorded, and shown in feedback, so that per-class counts reach n ≥ 10 sooner [D].

| Subclass | Definition | Examples | Evidence |
|---|---|---|---|
| G1a non-functional omission | the requirement includes a resource, time or size bound the statement never mentions; that part of the claim renders [N] | a "verified" transfer that replays the whole ledger; verified programs that failed runtime limits (§9) | the requirement line the statement omits |
| G3a 2-safety hyperproperty filed as a trace property | noninterference, a property of pairs of executions, is offered as an invariant of single executions | "every read passes the policy check, so nothing leaks" (KC-7.enforcement-vs-ni) | a pair of executions, each passing the trace check, that the observer tells apart |
| G6a escape hatches | the proof uses a declaration nobody proved | `sorry`, `admit`, a custom `axiom`, Verus `assume(false)` or `external_body` | the declaration and its `#print axioms` line |
| G6b native trust | the proof trusts compiled code; the stamp becomes [P] · kernel + compiler | `native_decide` and its `_native` axiom | the tactic line and the `_native` axiom line |
| G6c kernel bypass | the build skipped kernel checking, so it is green but fails replay | `debug.skipKernelTC` | the option line and the replay verdict |
| G6d the check never ran | the cited check did not run on this statement | a receipt with no replay line; a build target that never imports the module; a front end that skipped the kernel | the pipeline step missing from the receipt |
| G6e a trusted-base bug | a trusted component has a defect, or a configuration voids its guarantee | a kernel or solver soundness bug; a database anomaly under SERIALIZABLE; a pool at READ COMMITTED | the version or configuration read back, plus the advisory or history |
| G8a statement substitution | a different statement under the pinned name, or a redefinition of something the statement uses | comparator's "theorem statement do not match" and "Const does not match" | the mismatched identifiers and the comparator verdict |
| G8b answer in the statement | the statement restates the implementation or assumes its conclusion | `ensures result = transfer_impl s`; the conclusion moved into a premise | the clause that contains the answer |
| G8c tampering | pinned statement files, `comparator.json` or the environment were edited | an agent edits `Inv` in the proof PR | the statement-hash change (I7) and the edited line |
| G8d code bent to fit the proof | the implementation changed so the proof goes through, changing behavior | an agent rewrites `transfer` to ease the proof | the code diff and a behavior that changed |

### 2.4 Overlaps, and why keys are multi-label

The classes overlap at their edges, so single-label keys would be invalid (A8-04). Every flawed case's key has a **primary class**, the one the case is counted under for coverage and per-class recall, and an **acceptable set**, every class a finding may name and still be correct. GATE-audit records both, and the keying battery (§4.3) computes them. Common overlaps:

| Situation | Primary | Also acceptable | Why |
|---|---|---|---|
| an `Int` model shipped for `i64` code | G4 | G8 | the encoding slip is also a model that is not the code |
| a pool that runs some writers at READ COMMITTED | G6e | G7 | "every writer is SERIALIZABLE" is an [A] clause (S6.L9) the claim dropped |
| a precedence slip that makes the premises inconsistent | G2 | G1 | the statement is vacuous, and therefore weaker than intended |
| an agent edits a correct command after a CTI | G13 | G8d | the edit is code bent to fit the proof |
| a validator that checks shape, not meaning | G11 | G10 | the check observes less than equivalence requires |

### 2.5 Lineage

v1 had twelve classes. v2 renames class 4 ("unsound encoding" becomes "encoding and type-semantics slip"), widens class 5 to "bounded or inconclusive presented as proof" (absorbing v1's timeout case), adds G13 (D3, D8), adds subclasses for statement substitution and trusted-base bugs (digest-review-2 A4), and folds in the new failure types of the AI-verification report's taxonomy (answer in the statement, non-functional omission, tampering, the check never ran, unsound and dependent checkers) as subclasses of G1, G6, G8 and G11. §9 maps the landscape digest's §4 incident types onto G1–G13.

---

## 3. The anchor catalog

Twenty-five anchors cover all thirteen classes, at least two per stage (spine §12 item 9). Each anchor is a matched pair: the same artifact and claim wording, one member sound and one flawed. Code in this section sketches each case's shape; the shipped case is built from the run named on its **Key** line, and only that run decides verdicts. Every case carries the KCs listed with it, plus the outcome (g) core KCs once their stages are reached.

### 3.1 Summary

"Also acceptable" lists the classes a finding may name and still be correct (§2.4). "Ships" names the owning task; the five W1 anchors from later stages ship keyed only by executed runs, without variants (spine §6).

| Anchor | Stage | Primary class (also acceptable) | Medium | Key runs | Scheduled after | Ships |
|---|---|---|---|---|---|---|
| AUD-1.1 | S1 | G2 (G1) | Z3Py | {{run:RUN-z3-vacuous-unsat}} | LAB-1.3 | W1-T17, with variants |
| AUD-1.2 | S1 | G4 (G8) | Z3Py, BitVec 64 | [X RUN-z3-bv64, RUN-z3-bv64-pyodide]; {{run:RUN-z3-bv64-negamt}} | LAB-1, S1.L5 | W1-T17, with variants |
| AUD-1.3 | S1 | G5 | Z3Py | [X RUN-z3-budget-pyodide, RUN-z3-unknown-pow] | LAB-1, S1.L2 | W1-T17, with variants |
| AUD-2.1 | S2 | G1 (G12) | SMT in W1; Lean from W2 | [X RUN-z3-refund-a21] | LAB-2 | W1-T17 run-keyed; variants W2-T13 |
| AUD-2.2 | S2 | G6a (G6b for the native form) | Lean | [X RUN-lean-axioms] | LAB-2, S2.L9 | W1-T17 run-keyed; variants W2-T13 |
| AUD-2.3 | S2 | G6c (G6d) | Lean receipt | [X RUN-lean-skipkernel] | LAB-2, S2.L9 | W1-T17 run-keyed; variants W2-T13 |
| AUD-2.4 | S2 | G8a (G8c) | Lean | [X RUN-lean-comparator] | LAB-2, S2.L10 | W1-T17 run-keyed; variants W2-T13 |
| AUD-3.1 | S3 | G8 (G8a) | Lean | none named in the spine (Spine issues) | LAB-3 | W2-T13 |
| AUD-3.2 | S3 | G4 | Lean | {{run:RUN-lean-nat-trunc}} | LAB-3, S3.L7 | W2-T13 |
| AUD-4.1 | S4 | G8 (G1) | SMT-LIB, Lane A | {{run:RUN-z3-missing-frame}} | LAB-4.4 | W3-T13 |
| AUD-4.2 | S4 | none: sound (flawed member G1) | SMT-LIB | [X RUN-z3-conservation-noguard, RUN-z3-optimize-min] | LAB-4 | W3-T13 |
| AUD-4.3 | S4 | G13 (G8d) | Z3, interpreter | {{run:RUN-z3-cti-pair}} | LAB-4.6 | W3-T13 |
| AUD-5.1 | S5 | G3 | TLA+ | [X RUN-tlc-hold-lasso]; {{run:RUN-tlc-eventually}} | LAB-5, S5.L6 | W3-T13 |
| AUD-5.2 | S5 | G7 | TLA+ | [X RUN-tlc-hold-lasso]; {{run:RUN-tlc-eventually}} | LAB-5.5 | W3-T13 |
| AUD-5.3 | S5 | G5 | TLA+ | [X RUN-tlc-doublespend]; {{run:RUN-tlc-inductive}}, {{run:RUN-z3-inductive-param}} | LAB-5.1 | W1-T17 run-keyed; G5 variant W3-T13 |
| AUD-5.4 | S5 | G9 | TLA+, SQL | [X RUN-tlc-rtw3, RUN-tlc-atomic, RUN-pg-anomalies] | LAB-5, S5.L3 | W3-T13 |
| AUD-6.1 | S6 | G11 | Rust, SQL | {{run:RUN-drt-transfers}} | LAB-6.4 | W4-T13 |
| AUD-6.2 | S6 | G10 (G11) | Rust, SQL | [X RUN-pg-claims]; {{run:RUN-drt-transfers}} | LAB-6.4 | W4-T13 |
| AUD-6.3 | S6 | G6e (G7 for the pool form) | SQL | {{run:RUN-pg-mixed-levels}}, {{run:RUN-history-g2item}}, {{run:RUN-isorun-upstream}} | LAB-6, S6.L9 | W4-T13 |
| AUD-7.1 | S7 | G10 | Z3 pairs, SQL row security | {{run:RUN-z3-count-channel}}, {{run:RUN-pg-rls-covert}} | LAB-7, S7.L6 | W4-T13 |
| AUD-7.2 | S7 | G12 (G1) | Z3 self-composition | {{run:RUN-z3-selfcomp}} | LAB-7, S7.L7 | W4-T13 |
| AUD-8.1 | S8 | G7 | TLA+ | {{run:RUN-tlc-double-charge}}, {{run:RUN-tlc-key-ttl}}, {{run:RUN-tlc-outbox-safety}} | LAB-8.8 | W5-T11 |
| AUD-8.2 | S8 | G8 | TLA+, Rust | {{run:RUN-tlc-trace-validation}} | LAB-8.6 | W5-T11 |
| AUD-9.1 | S9 | G10 (G1) | Lean | {{run:RUN-lean-abort-blind}} | LAB-9 half A, S9.L4 [D] | W5-T11 |
| AUD-9.2 | S9 | G11 (G10) | Rust, SQL | {{run:RUN-sql-shape-validator}}, {{run:RUN-pg-one-db}} | LAB-9 half B, LAB-9.11; its IR-level variants also serve half A [D] | W5-T11 |

On the builder's path (OD-3) the S6 and S8 anchors are scheduled after the later S6 and S8 blocks, where their classes are taught.

### 3.2 Anchor cards

Each card gives the agent's claim (always quoted, UNREVIEWED), the two members of the pair, the dated incident the case is based on, the operators that generate its variants (§4), the evidence a finding needs, and its key.

#### AUD-1.1 · S1 · G2 Vacuous premise

- **Claim:** "unsat, therefore safe."
- **Sound member:** the guarded transfer in Z3Py. Premises `a >= 0, b >= 0, amount > 0, amount <= a`; the violation query adds `a - amount < 0` and returns `unsat` [X RUN-z3-starter]. The premises alone return `sat`, the premise witness, recorded with the anchor's key run. Stamp: [P] · Z3 5.3.1 unsat · uncertified · rlimit N.
- **Flawed member:** the same claim and violation query, but a refactor left a second guard that contradicts the first (for example `a < amount` beside `amount <= a`). The violation query is `unsat` only because the premises alone are.
- **Based on:** PutnamBench issue #361 (2026-10-12). A "readability" refactor lost parentheses, an implication absorbed a chain of conjunctions, and the hypotheses became inconsistent; automated hypothesis-redundancy checks found it. https://github.com/trishullab/PutnamBench/issues/361 [V]
- **Operators:** add a contradictory hypothesis; drop parentheses (when the slip leaves the premises jointly unsatisfiable). Sound form: add a redundant hypothesis that the others imply.
- **Evidence:** the premises alone are `unsat`, anchored to the conflicting lines; the Desk re-runs the premise query in INS-z3, or in INS-pocket offline.
- **Key:** {{run:RUN-z3-vacuous-unsat}} (SP-1.6). **KCs:** KC-1.non-vacuity-check, KC-1.implication-vacuity.

#### AUD-1.2 · S1 · G4 Encoding and type-semantics slip

- **Claim:** "No balance can go negative; the transfer is safe."
- **Sound member:** the transfer re-encoded with `BitVecs('a b amount', 64)` and signed comparisons, guarded by `amount > 0, amount <= a`. The claim is limited to the sender, whose new balance cannot go negative: `unsat` [X RUN-z3-bv64]. The card (CL-1.5) marks the recipient [N].
- **Flawed member:** an `Int` model shipped for code that runs on `i64`, with a claim that covers the recipient. Under BitVec 64 the recipient wraps: `sat` [X RUN-z3-bv64]. The witness differs between native Z3 and Pyodide [X RUN-z3-bv64-pyodide], so grading checks the property, never the values. A second flawed form: an unsigned guard with a signed check readmits the overdraft, `sat` [X RUN-z3-bv64].
- **Based on:** Bitcoin CVE-2010-5139 (2010-08-15): transaction outputs "overflowed when summed". https://en.bitcoin.it/wiki/CVE-2010-5139 (also the dated-incident specimen SP-1.9)
- **Operators:** ℤ → BitVec 64, with signedness variations; dropping `amount > 0` {{run:RUN-z3-bv64-negamt}}. Sound form: conservation modulo 2⁶⁴, which is proved [X RUN-z3-bv64] and stays sound only while the claim says "modulo 2⁶⁴"; the same claim without those words is G4.
- **Evidence:** a witness under BitVec semantics, replayed by INS-z3 and graded by the property it violates.
- **Key:** RUN-z3-bv64, RUN-z3-bv64-pyodide. **KCs:** KC-1.encoding-is-the-claim.

#### AUD-1.3 · S1 · G5 Bounded or inconclusive presented as proof

- **Claim:** "Z3 found no counterexample, so the property holds."
- **Sound member:** the query run under `s.set('rlimit', N)` returns `unsat`, with a premise witness, and is stamped with its budget: [P] · Z3 5.3.1 unsat · uncertified · rlimit N [X RUN-z3-starter].
- **Flawed member:** the run returned `unknown`, and `s.reason_unknown()` reports `canceled` because the budget ran out; the claim reports it as "no counterexample". In the tab, `rlimit` 5e6 gave `unknown (canceled)` in 1.1 s, while a `timeout` setting never returned [X RUN-z3-budget-pyodide]. A second flawed form: `x**y == 8, y > 1` returns `unknown` with "incomplete (theory arithmetic)" [X RUN-z3-unknown-pow], reported as "no solution exists". Under spine §8.8 both are [?] with their reason.
- **Based on:** S3 Block Public Access (FSE 2020): "if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe", so `unknown` fails closed where it guards enforcement. https://doi.org/10.1145/3368089.3409728 [V]
- **Operators:** report an inconclusive result as a verdict (proposed, §4.2): shrink the budget, or move the query into nonlinear integer arithmetic. Sound form: the same budget with an `unsat` result, stamped with the budget.
- **Evidence:** the raw verdict line and its reason.
- **Key:** RUN-z3-budget-pyodide, RUN-z3-unknown-pow. **KCs:** KC-1.three-answers, KC-1.unknown-fails-closed.

#### AUD-2.1 · S2 · G1 Statement too weak

- **Claim:** "Refunds never overdraw anyone; proved."
- **Flawed member:** `refund_nonneg` constrains only the customer, while `refund` debits the merchant with no guard:

  ```lean
  theorem refund_nonneg (s : State) (p : PaymentId) (amt : Int)
      (hInv : NonNeg s) (hPos : 0 ≤ amt) :
      0 ≤ (refund s p amt).balance (s.payments p).customer
  ```

  In W1 the case renders as executed in SMT: with a modify-style update the violation query for the stated property (the customer is non-negative after the refund) is `unsat`, and the query for the merchant is `sat` [X RUN-z3-refund-a21].
- **Sound member:** per spine §6.2, a refund theorem covering both parties: `NonNeg s → NonNeg (refund s p amt)` for a refund that rejects unless the merchant holds `amt`. Its key is recorded with the Lean rendering in W2-T13. In W1, before that run exists, the sound member is the customer-only statement with an honest card, "protects the customer; the merchant is not covered [N]", keyed by the same run's first line (Spine issues).
- **Third member:** with a value-style update the stated property itself fails (`sat`, a self-refund) [X RUN-z3-refund-a21]. D3 made that form its own "statement false" case; it is a G12 variant keyed by the same run.
- **Based on:** Spec-Harness (arXiv 2604.00280, first version 2026-03-31): 22.7% of verifier-accepted specifications had no postcondition, on SpecGenBench. https://arxiv.org/abs/2604.00280 (confirmed by the AI-verification report's verification log)
- **Operators:** weaken a postcondition (drop the merchant's conjunct); swap ∀ and ∃; drop parentheses. Sound form: drop a conjunct that the remaining ones imply.
- **Evidence:** a scenario the statement permits and the requirement forbids, such as a refund that leaves the merchant negative; graded by evaluating the statement and the requirement on the scenario, never by matching values.
- **Key:** RUN-z3-refund-a21. **KCs:** KC-2.theorem-statement-reading, KC-2.kernel-not-requirement.

#### AUD-2.2 · S2 · G6a Hidden trust: escape hatches

- **Claim:** "Proved; the build is green."
- **Sound member:** the lemma closed with standard axioms only: `#print axioms` lists `[propext, Quot.sound]` [X RUN-lean-axioms], axioms the challenge's `comparator.json` permits, and comparator accepts a solution of that kind [X RUN-lean-comparator].
- **Flawed member:** the same lemma closed by `sorry` or by a custom `axiom`. The build is green (a file with `sorry` exits 0); `#print axioms` lists `sorryAx` or the custom axiom; `lake check` rejects the axiom as not permitted while its log still says "Lean default kernel accepts the solution" [X RUN-lean-axioms]. This is why receipts parse every verdict line and never trust an exit code alone.
- **Native form (G6b, same operator):** `native_decide` on a closed, decidable goal adds a `…._native.native_decide.ax_1_1` axiom [X RUN-lean-axioms]; the honest stamp is [P] · kernel + compiler. Native forms are applied only to closed, decidable goals, as in the S2 Defence.
- **Based on:** AlphaVerus (arXiv 2412.06176, 2024-12): without critique models, its agent increasingly closed verification obligations with `assume(false)`, then moved to trivial specifications. https://arxiv.org/abs/2412.06176 [V]
- **Operators:** insert `native_decide` or `sorry` (and a custom axiom). Sound form: close the same goal with `decide`, which adds no axioms, or `omega`, which adds only standard ones; `grind` adds `Classical.choice`, still standard, so a `grind` proof is a sound control that looks alarming [X RUN-lean-axioms].
- **Evidence:** the offending declaration and its `#print axioms` line.
- **Key:** RUN-lean-axioms. **KCs:** KC-2.axioms-and-trust, KC-2.automation-scope.

#### AUD-2.3 · S2 · G6c Hidden trust: kernel bypass

- **Claim:** "Proved; the build is green and uses no axioms."
- **Sound member:** the same theorem, built and then replayed by the kernel with no complaint; in the recorded log, the replay of the conservation module prints no problem [X RUN-lean-skipkernel].
- **Flawed member:** a proof built while the `debug.skipKernelTC` option was set. The build exits 0 and `#print axioms` reports no axioms; only the kernel replay rejects the declaration [X RUN-lean-skipkernel]. The case shows the option line and the verdict lines from the recorded run. It never shows how the proof was produced, and no case ships such a construction.
- **Based on:** an older Lean REPL "did not utilize the Lean verification kernel", so 12 incorrect miniF2F proofs passed (arXiv 2507.14722, 2025-07, Appendix B). https://arxiv.org/abs/2507.14722
- **Operators:** no source-level operator generates this class, by design. Receipt-level variants come from "drop a verification step" (proposed, §4.2), which yields G6d: a receipt with a build verdict and no replay line.
- **Evidence:** the option line and the replay verdict.
- **Key:** RUN-lean-skipkernel. **KCs:** KC-2.axioms-and-trust.

#### AUD-2.4 · S2 · G8a Statement substitution

- **Claim:** "Comparator-ready; proved."
- **Sound member:** a solution that `lake comparator` accepts against the pinned challenge: "Your solution is okay!" (exit 0) [X RUN-lean-comparator]. The executed challenge pins:

  ```lean
  def transfer (a b amt : Int) : Int × Int :=
    if 0 < amt ∧ amt ≤ a then (a - amt, b + amt) else (a, b)

  theorem conserves (a b amt : Int) :
      (transfer a b amt).1 + (transfer a b amt).2 = a + b
  ```

- **Flawed member:** a weakened statement under the same name, which comparator reports as "theorem statement do not match", or a redefined `transfer`, reported as "Const does not match" (exit 1) [X RUN-lean-comparator].
- **Based on:** FormalQualBench (math.inc; runs evaluated 2026-03-18 and 2026-03-19). Agents attempted workarounds at the elaborator level, and "Comparator catches the illegal axiom". https://math.inc/formalqualbench (a vendor page; the AI-verification report's verification log confirmed the quoted sentence). The card cites the incident for its lesson, that an out-of-band statement check catches what the build accepts, and reproduces nothing of the workaround.
- **Operators:** weaken a postcondition, kept under the pinned name; redefine a definition the statement uses (proposed). Sound form: a different proof of the same pinned statement.
- **Evidence:** the mismatched identifiers and the comparator verdict.
- **Key:** RUN-lean-comparator. **KCs:** KC-2.statement-pinning, KC-2.kernel-not-requirement.

#### AUD-3.1 · S3 · G8 Model–implementation drift

- **Claim:** "Preservation proved for the typechecker."
- **Sound member:** the step-invariant (or preservation) theorem stated over `HasType`, the relation the shipped checker implements, pinned in the challenge pack.
- **Flawed member:** the theorem is proved over `HasType'`, a stricter copy (for example one that also excludes self-transfers), while the shipped checker implements `HasType`; programs the shipped checker accepts fall outside the theorem.
- **Based on:** VERINA pull request #17 (merged 2026-04-17): a published verification benchmark fixed its specifications in 18 tasks and its code in 9. https://github.com/sunblaze-ucb/verina/pull/17 [V]
- **Operators:** redefine a definition the statement uses, or point the theorem at a stricter copy (proposed). Sound form: the theorem over the shipped `HasType`, with an extra helper lemma.
- **Evidence:** the mismatched identifiers; comparator reports the statement mismatch when the challenge pins `HasType`.
- **Key:** no run is named in the spine (Spine issues); the comparator verdict's shape is [X RUN-lean-comparator], and the S3 recording task is W2-T10. **KCs:** KC-3.goldens-as-theorems, KC-2.statement-pinning.

#### AUD-3.2 · S3 · G4 Encoding and type-semantics slip

- **Claim:** "Balances can't go negative."
- **Sound member:** balances are `Int`; the transfer rejects unless `amt ≤ s.bal from`, and the non-negativity theorem uses the guard.
- **Flawed member:** balances are `Nat`, so the claim holds by type. `Nat` subtraction truncates at 0: an overdraft becomes 0, and the total changes without any error.
- **Based on:** Kimina-Prover issue #11 (2026-09-13): a released solution proves a statement without its `(1/4 : ℝ)` ascription, and over ℕ "the content is 0 = 0". https://github.com/MoonshotAI/Kimina-Prover-Preview/issues/11 (the AI-verification report rates its confidence medium: no maintainer reply)
- **Operators:** ℤ → ℕ. Sound form: a `Nat` model in which every subtraction is guarded, so truncation never occurs.
- **Evidence:** a truncation witness (a debit larger than the balance yields 0 and changes the total), checked by `decide` or INS-interp.
- **Key:** {{run:RUN-lean-nat-trunc}} (SP-3.3). **KCs:** KC-3.nat-truncation, KC-1.encoding-is-the-claim.

#### AUD-4.1 · S4 · G8 Model–implementation drift

- **Claim:** "`miniplinth check` proves that every command preserves the invariant."
- **Sound member:** the VC generator emits frame conditions as obligations: every account other than `from` and `to` is unchanged, `(forall ((k Int)) (=> (and (distinct k from) (distinct k to)) (= (select bal1 k) (select bal0 k))))`.
- **Flawed member:** the generator checks `Inv′` only at `from` and `to` and assumes every other account unchanged without emitting that obligation; a command whose interpreter semantics also writes a third account is then "proved".
- **Based on:** SymCert (FMCAD 2026): verifying five production analyses took one work day in total, and its proofs caught encoder bugs. https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_30 [V]
- **Operators:** drop a frame conjunct. Sound form: move the frame conjunct into a separate obligation that is still checked.
- **Evidence:** a state in which an untouched account changes, replayed in INS-interp.
- **Key:** {{run:RUN-z3-missing-frame}} (SP-4.1). **KCs:** KC-4.frame-condition, KC-4.trust-stack.

#### AUD-4.2 · S4 · sound anchor (flawed member G1)

- **Claim:** "Z3 proved the invariant obligation, even without the guard."
- **Sound member (the anchor):** conservation for the transfer, checked by a query with the guard dropped, is `unsat` [X RUN-z3-conservation-noguard]. Dropping a premise strengthens the obligation, so the result implies the guarded one, and the claim is justified.
- **Flawed member (G1):** the claim card states the invariant as non-negativity and conservation, but the query also dropped the non-negativity conjunct of `Inv′`, so the `unsat` covers conservation only. Without the guard, non-negativity fails at amount 1 [X RUN-z3-optimize-min] (SP-2.2).
- **Based on:** Erdős problem #124 (2025-11): the Lean statement said "= 1" where the comment said "≥ 1", which made it weaker; the corrected form was also proved. https://www.erdosproblems.com/forum/thread/124
- **Operators:** weaken a postcondition (drop a conjunct of `Inv′`) for the flawed member; drop a premise (the guard) for the sound one. The edit has the same shape both ways and the opposite effect, which is what the pair teaches.
- **Evidence:** sound: the restatement (§5.4, step 3). Flawed: a scenario the checked query permits and the stated invariant forbids.
- **Key:** RUN-z3-conservation-noguard, RUN-z3-optimize-min. **KCs:** KC-4.vc-shape, KC-2.theorem-statement-reading.

#### AUD-4.3 · S4 · G13 Induction failure confused with a bug

- **Claim:** "Z3 found a bug in Capture; fixed."
- **Sound member:** the inductive step for an invariant is `sat`, a counterexample to induction (CTI); bounded reachability finds no violation within N; the invariant is strengthened (for example, a captured amount never exceeds the amount held), the strengthened invariant is inductive, and the command is unchanged.
- **Flawed member:** the same CTI, but the agent changes the correct command (adds a guard or alters the update), although the CTI's pre-state is unreachable.
- **Based on:** Spec-Harness (arXiv 2604.00280): 5.6% of verifier-accepted specifications "come with code that the model changed", on SpecGenBench. https://arxiv.org/abs/2604.00280
- **Operators:** weaken an invariant to produce a CTI (GEN-cti-or-bug's CTI template), then edit the executable code (proposed). Sound form: the "reachable" template, where the command really is wrong and the same kind of edit fixes it.
- **Evidence:** the CTI's pre-state shown unreachable within the stated bound, with the bound printed (I10), plus the diff.
- **Key:** {{run:RUN-z3-cti-pair}} (SP-4.3). **KCs:** KC-4.cti-or-bug, KC-4.invariant-vs-inductive.

#### AUD-5.1 · S5 · G3 Wrong property kind

- **Claim:** "TLC finds no deadlock, so every hold resolves."
- **Sound member:** `EventuallyResolves` checked as a temporal property under stated fairness on system actions, stamped [M] · constants with the fairness drawn as [A] (CL-5.3) {{run:RUN-tlc-eventually}}.
- **Flawed member:** the claim argues "every hold resolves" from deadlock freedom and an invariant check. A deadlock-free spec can still loop: in the Hold spec, TLC reports `EventuallyResolves` violated by the lasso Try → Busy → Try, back to the start [X RUN-tlc-hold-lasso].
- **Based on:** SysMoBench (arXiv 2509.23130, 2025-09): model-written TLA+ specifications violated 41.9% of liveness properties, against 8.3% of safety properties. https://arxiv.org/abs/2509.23130 [V]
- **Operators:** restate an "eventually" property as an invariant (proposed). Sound form: a safety property ("a hold never resolves twice") checked as an invariant.
- **Evidence:** a lasso, validated by INS-lasso.
- **Key:** RUN-tlc-hold-lasso; {{run:RUN-tlc-eventually}}. **KCs:** KC-5.safety-vs-liveness, KC-5.lasso-reading.

#### AUD-5.2 · S5 · G7 Unstated environment assumption

- **Claim:** "Liveness proved: every hold eventually resolves."
- **Sound member:** fairness only on the system's own actions, its timeout included, `Spec == Init /\ [][Next]_vars /\ WF_vars(Timeout)`; the hold resolves even when the provider stalls (LAB-5.c5).
- **Flawed member:** the liveness result rests on strong fairness of the provider's reply, an action the environment controls, and the claim never states that assumption.
- **Based on:** SysMoBench: fairness choices in model-written specifications were "overly technical or random". https://arxiv.org/abs/2509.23130 [V]
- **Operators:** drop or misplace fairness. Sound form: move fairness between two system actions.
- **Evidence:** the fairness conjunct and the lasso that appears when it is removed; with fairness on Try and Busy only, TLC returns the starving lasso [X RUN-tlc-hold-lasso].
- **Key:** RUN-tlc-hold-lasso; {{run:RUN-tlc-eventually}}. **KCs:** KC-5.fairness.

#### AUD-5.3 · S5 · G5 Bounded or inconclusive presented as proof

- **Claim:** "TLC found no invariant violation."
- **Sound member:** DoubleSpend (Init 100, Amount 80, two workers) run with `-deadlock` reports "Invariant NoOverspend is violated" at 11 distinct states, with a 5-state, 4-action trace [X RUN-tlc-doublespend]; the honest stamp is [R] with a witness length of 4 actions.
- **Flawed member:** the same spec under default flags stops at "Deadlock reached" after 10 distinct states [X RUN-tlc-doublespend]. The invariant was checked only on the states explored, so the verdict is [?] · stopped at deadlock (spine §8.8), not "no violation".
- **G5 variant (W3-T13):** "TLC inductive check at N = 3 stamped PROVED for all N". The honest stamp is [M] · constants · inductive at N = 3; [P] for every N needs the parametric proof {{run:RUN-tlc-inductive}}, {{run:RUN-z3-inductive-param}}.
- **Based on:** this course's own v1 mock-ups printed TLC numbers that no run had produced (2026-10-20), and the executed run replaced them (2026-10-21). Sources: `docs/history/v1/` and `research/evidence/A5r3/tla/run.log` in this repository.
- **Operators:** stamp a bounded inductive check as proof; report an inconclusive result as a verdict (proposed: drop `-deadlock` and keep the claim). Sound form: the atomic variant explored completely, [M] · constants · complete, 4 distinct states [X RUN-tlc-atomic].
- **Evidence:** the argv and the stop line.
- **Key:** RUN-tlc-doublespend. **KCs:** KC-5.tlc-flags-matter, KC-5.bounded-scope; KC-5.inductive-invariant-tla for the G5 variant.

#### AUD-5.4 · S5 · G9 Granularity

- **Claim:** "Implements the atomic Transfer action."
- **Sound member:** the atomic action `Transfer(w) == bal >= Amount /\ bal' = bal - Amount /\ spent' = spent + Amount`, compiled to one conditional statement, `UPDATE acct SET bal = bal - $1 WHERE id = $2 AND bal >= $1`, whose rowcount must be 1. On PostgreSQL 18.6 at READ COMMITTED, the second concurrent UPDATE re-evaluates its WHERE clause and updates 0 rows, so nothing is lost [X RUN-pg-anomalies].
- **Flawed member:** the same action implemented as three steps: `SELECT bal`, a check in the application, then an UPDATE that writes the value read minus the amount. The code's steps are finer than the model's single action. At READ COMMITTED two such transactions spend 160 from 100 [X RUN-pg-anomalies], and the read/check/write split in TLA+ reaches the violation in a 7-state, 6-action trace [X RUN-tlc-rtw3].
- **Based on:** the gift-card race (2015-05-21): concurrent redemption requests spent one balance twice. https://sakurity.com/blog/2015/05/21/starbucks.html (also the dated-incident specimen SP-5.7)
- **Operators:** split an atomic action. Sound form: split the action but keep the guard inside the write (the conditional UPDATE), which keeps the atomic step's effect.
- **Evidence:** the code lines set against the action, with the interleaving the action forbids.
- **Key:** RUN-tlc-rtw3, RUN-tlc-atomic, RUN-pg-anomalies. **KCs:** KC-5.interleaving-granularity.

#### AUD-6.1 · S6 · G11 Test presented as proof

- **Claim:** "The compiler is proved correct: n random transfers agree with the interpreter."
- **Sound member:** the differential suite (compiled transfers on PostgreSQL against the interpreter) stamped [T] · n · generator statistics · engines named (CL-6.1).
- **Flawed member:** the same n runs stamped PROVED.
- **Based on:** CIDR 2026: about 32% of LLM-produced SQL rewrites changed query results. https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf [V]
- **Operators:** replace a proof by a single-database test (here: stamp a test as proof). Sound form: the same runs, stamped [T] with n.
- **Evidence:** the stamp set against the method; spine §8.8 maps "differential testing, no divergence" to [T] · n, generator statistics.
- **Key:** {{run:RUN-drt-transfers}}. **KCs:** KC-6.differential-testing.

#### AUD-6.2 · S6 · G10 Observer too weak

- **Claim:** "The compiled transfers match the interpreter on every generated command."
- **Sound member:** the Rust harness compares outcome classes (success, zero rows, SQLSTATE) before balances, for example `assert_eq!(model.outcome(), db.outcome())` over an `Outcome` enum.
- **Flawed member:** the harness compares balances only. On PostgreSQL 18.6 an UPDATE naming an unknown account succeeds with 0 rows, as does a guarded UPDATE with a NULL amount [X RUN-pg-claims], while the reference semantics returns a typed error for the unknown account {{run:RUN-drt-transfers}}. Balances agree, outcome classes differ, and the balance-only harness reports agreement.
- **Based on:** Cedar (arXiv 2407.01688, 2024): differential random testing found 21 bugs, against 4 found by the proofs. https://arxiv.org/abs/2407.01688 [V]
- **Operators:** widen or narrow the observer (here: narrow the harness to balances). Sound form: widen it to outcome classes; the suite still passes.
- **Evidence:** two runs equal on balances and different in outcome class.
- **Key:** RUN-pg-claims; {{run:RUN-drt-transfers}}. **KCs:** KC-6.differential-testing, KC-6.rowcount-as-guard.

#### AUD-6.3 · S6 · G6e Hidden trust: a trusted-base bug

- **Claim:** "Serializable by construction; the database guarantees it."
- **Sound member:** the claim names PostgreSQL 18.6, reads back `transaction_isolation` for every writer, retries whole commands on 40001 and 40P01 [X RUN-pg-anomalies, RUN-pg-claims], and rests on the held seam SEAM-14, tested nightly with the upstream `update-conflict-out` spec {{run:RUN-isorun-upstream}}.
- **Flawed member:** the claim rests on SERIALIZABLE in a version with a reported anomaly, or a connection pool's setup puts some writers at READ COMMITTED; mixed isolation levels void the guarantee (SP-6.10) {{run:RUN-pg-mixed-levels}}. The pool form also accepts G7, because "every writer is SERIALIZABLE" is an [A] clause the claim dropped.
- **Based on:** Jepsen, PostgreSQL 12.3 (2020-06-12): SERIALIZABLE exhibited G2-item. https://jepsen.io/analyses/postgresql-12.3 [V] (toy history: the dated-incident specimen SP-6.11)
- **Operators:** change an isolation level; pin an affected engine version (proposed). Sound form: raise the pool to SERIALIZABLE, with whole-command retries.
- **Evidence:** the version string or configuration read back, plus the history.
- **Key:** {{run:RUN-pg-mixed-levels}}, {{run:RUN-history-g2item}}, {{run:RUN-isorun-upstream}}. **KCs:** KC-6.db-as-assumption, KC-6.serializable-retries.

#### AUD-7.1 · S7 · G10 Observer too weak

- **Claim:** "Noninterference proved for the document view."
- **Sound member:** the observer includes what a client can see: the JSON body, result counts and sizes. Self-composition over paired states that differ only in another tenant's private documents is `unsat`.
- **Flawed member:** the observer sees the JSON body only. The proof goes through, but a client who reads counts, or who meets an integrity-check error, tells the pair apart.
- **Based on:** the PostgreSQL 18 row-security documentation, which warns that integrity checks bypass row security and can act as a covert channel (read 2026-10-23). https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- **Operators:** widen or narrow the observer. Sound form: widen it and re-check; the result is still `unsat`, and stronger.
- **Evidence:** paired states the observer equates and an attacker distinguishes, checked by INS-pairs.
- **Key:** {{run:RUN-z3-count-channel}} (SP-7.2), {{run:RUN-pg-rls-covert}} (SP-7.5). **KCs:** KC-7.observer-equivalence, KC-7.side-channels.

#### AUD-7.2 · S7 · G12 Requirement mismatch

- **Claim:** "No tenant can ever observe any change in another tenant."
- **Sound member:** noninterference modulo the declassified share. Paired states that agree on everything tenant A may see, including documents tenant B has shared with A, give A equal observations; the declassification record states what, who, where and when (CL-7.3).
- **Flawed member:** the blanket claim. Sharing is a legitimate feature: when B edits a document shared with A, A observes the change, so the claim forbids behavior the requirement wants.
- **Based on:** a study of model answers to Erdős problems (arXiv 2601.22401, 2026-01-29): of 200 graded answers, 13 were "meaningfully correct", and 50 were "technically valid but mathematically vacuous", missing the problem's intent. https://arxiv.org/abs/2601.22401
- **Operators:** drop a declassification (proposed for spine §6.2; it is already in the S7 Defence's mutation list). Sound form: add a declassification with its record.
- **Evidence:** a scenario of legitimate behavior (a share) that the claim forbids, graded as multiple true/false over scenarios: the statement is evaluated on each, and the requirement's verdict is authored.
- **Key:** {{run:RUN-z3-selfcomp}}. **KCs:** KC-7.declassification, KC-2.kernel-not-requirement.

#### AUD-8.1 · S8 · G7 Unstated environment assumption

- **Claim:** "Exactly once, via the outbox."
- **Sound member:** at-least-once delivery with no double charge given the provider's idempotency, stated as [A], plus the provider-horizon clause written in LAB-8.8 (CL-8.2) {{run:RUN-tlc-outbox-safety}}.
- **Flawed member:** "exactly once", with the provider's idempotency absent from the assumptions.
- **Based on:** Stripe's API v1 documentation: idempotency keys may be pruned after at least 24 hours (read 2026-10-21). https://docs.stripe.com/api/idempotent_requests (also the dated-incident specimen SP-8.5)
- **Operators:** drop or misplace an environment assumption (a proposed generalization of "drop or misplace fairness"). Sound form: restore the assumption as [A].
- **Evidence:** a trace with a duplicate effect: a crash after the provider accepts and before the acknowledgement leads to a second dispatch (SP-8.1).
- **Key:** {{run:RUN-tlc-double-charge}}, {{run:RUN-tlc-key-ttl}}, {{run:RUN-tlc-outbox-safety}}. **KCs:** KC-8.at-least-once, KC-8.provider-horizon.

#### AUD-8.2 · S8 · G8 Model–implementation drift

- **Claim:** "The simulator implements the outbox spec; all tests pass."
- **Sound member:** NDJSON traces from the learner's Rust simulator, validated against the spec with TLC over n seeds: [T] · n seeds, composed with the spec's [M] (CL-8.3).
- **Flawed member:** the code acknowledges before the durable write, while the spec orders the write first. Unit tests pass; trace validation rejects the trace at the acknowledgement step.
- **Based on:** MongoDB (arXiv 2006.00915): checking traces against a highly abstract specification was "impractical", while model-based test-case generation "was highly successful for Realm Sync". https://arxiv.org/abs/2006.00915 [V]
- **Operators:** reorder two effects in the implementation (proposed; "ack before the durable write" is already in the S8 Defence's mutation list). Sound form: reorder two effects the spec allows in either order.
- **Evidence:** the trace and its first non-conforming step.
- **Key:** {{run:RUN-tlc-trace-validation}} (SP-8.4). **KCs:** KC-8.trace-validation.

#### AUD-9.1 · S9 · G10 Observer too weak

- **Claim:** "The compiler preserves meaning; proved in Lean."
- **Sound member:** observations include aborts, `obs r := (r.isAbort, view r.state)`, and preservation holds under that observer, in CompCert's template.
- **Flawed member:** preservation proved with `obs r := view r.state`, an observer blind to aborts. When a guard fails, the source run aborts while the compiled target skips the write and commits; both leave the state unchanged, so the proof goes through while a client sees an error from one and success from the other.
- **Based on:** Csmith (PLDI 2011): CompCert's silent wrong-code bugs were in its unverified front end, plus one specification gap. https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf [V]
- **Operators:** widen or narrow the observer (here: narrow it to exclude aborts). Sound form: widen it.
- **Evidence:** a pair of runs, the source aborting and the target committing, with equal observations.
- **Key:** {{run:RUN-lean-abort-blind}} (SP-9.3). **KCs:** KC-9.observations.

#### AUD-9.2 · S9 · G11 Test presented as proof

- **Claim:** "Generated SQL validated; equivalent to the source."
- **Sound member:** a validator that replays every counterexample through both semantics, the interpreter and PostgreSQL, and stamps [T] · n commands or [M] · bound (CL-9.3).
- **Flawed member:** a validator that checks the plan's shape against a template rather than its meaning, and accepts a non-equivalent rewrite; or "results match on one database" stamped as proof.
- **Based on:** LLM judges favor "equivalent" (arXiv 2412.05561, 2024-12), and about 32% of LLM SQL rewrites changed results [cidr26]. https://arxiv.org/abs/2412.05561
- **Operators:** replace a proof by a single-database test. Sound form: the same single-database run, stamped [T] · 1 instance.
- **Evidence:** a distinguishing database instance.
- **Key:** {{run:RUN-sql-shape-validator}} (SP-9.2), {{run:RUN-pg-one-db}} (SP-9.4). **KCs:** KC-9.sql-equivalence, KC-9.translation-validation.

---

## 4. Variants: operators, keys and coverage

Each class grows to at least six exemplars through seeded mutation operators whose keys a checker recomputes (spine §6.2; GATE-audit). An **exemplar** is a keyed case that differs structurally from the class's other cases (a different operator, artifact or medium), not one with re-seeded constants [D]. Every operator has a **matched sound form**: the same kind of edit where it does not break the claim, or the same check honestly stamped. Sound forms keep each family supplying sound cases at the rate the session composer needs, so that a sound case cannot be recognized by being familiar, and they keep the two members of a pair alike in diff size and shape.

### 4.1 Operators in spine §6.2

| Operator | What it changes | Classes it can key | Matched sound form | Keyed by |
|---|---|---|---|---|
| drop parentheses | the grouping of a hypothesis chain or guard | G2 if the premises become inconsistent; G1 if weaker; G12 if incomparable | an equivalent regrouping (associativity of ∧) | Z3 equivalence and premise queries |
| swap ∀ and ∃ | the quantifier order of a property or policy | G1, G12 | swap two quantifiers of the same kind | Z3 checks P⇒R and R⇒P (GEN-negate-it's machinery) |
| ℤ → ℕ or BitVec 64 | the model's arithmetic | G4 | the change under a guard that keeps every operation in range, stated in the claim (CL-1.5) | Z3 bit-vectors; Lean `decide`; PGlite for `bigint` |
| add a contradictory hypothesis | the premise list | G2 | add a redundant hypothesis the others imply | Z3 premise query |
| move the conclusion into a premise | the statement's shape | G8b | the moved fact is a lemma the claim cites and the receipt proves | comparator against the pinned statement; Z3 |
| insert `native_decide` or `sorry` | the proof's trust base | G6a (`sorry`, custom axiom); G6b (`native_decide`, closed decidable goals only) | close the goal with `decide`, `omega` or `grind` [X RUN-lean-axioms] | `#print axioms`; `lake check` |
| weaken a postcondition | a conjunct of the conclusion | G1; G8a when kept under the pinned name | drop a conjunct the others imply | Z3 implication; comparator |
| drop a frame conjunct | a generator's or spec's frame | G8, G1 | move the conjunct into a separate checked obligation | Z3; INS-interp replay |
| drop or misplace fairness | the spec's fairness conjuncts | G7 | move fairness between two system actions, or drop it from a safety check, where it is irrelevant | TLC graphs; INS-lasso |
| split an atomic action | the granularity of a step | G9 | keep the guard inside the write | TLC or Spectacle; INS-history on recorded PostgreSQL histories |
| widen or narrow the observer | the observation function | narrowing: G10; widening: sound if the property still holds | widen | INS-pairs; Z3 self-composition |
| change an isolation level | a transaction's or pool's level | lowering: G6e (G7, G9 acceptable); raising to SERIALIZABLE with retries: sound | raise, with whole-command retries | recorded PostgreSQL 18.6 histories [X RUN-pg-anomalies] |
| replace a proof by a single-database test | the method behind a stamp | G11 | the same test, stamped [T] · 1 instance | the verdict→stamp table (GEN-which-stamp) |
| stamp a bounded inductive check as proof | the stamp on a bounded check | G5 | the same check, stamped [M] · constants · inductive at N = k | the verdict→stamp table |

### 4.2 Operators this document proposes

The spine's list leaves several anchors without an operator that produces their class: G3 and G13 cannot reach six exemplars from it, and G5 grows only through TLA+. These operators fill the gap; each traces to an anchor, a subclass or a Defence mutation the spine already names, and none needs a new ID (Spine issues).

| Operator (proposed) | Classes | Matched sound form | Traced to |
|---|---|---|---|
| report an inconclusive result as a verdict | G5 | report it as [?] with its reason | AUD-1.3, AUD-5.3; spine §8.8 |
| drop a verification step and keep the claim (the replay, `lake check`, the comparator, the cvc5 cross-check) | G6d | the step present and passing | AUD-2.3; the receipt pipeline (spine §9.4) |
| redefine a definition the statement uses, or point the theorem at a stricter copy | G8a, G8 | a different proof of the pinned statement | AUD-2.4's redefined `transfer`; AUD-3.1 |
| edit the executable code so that a proof goes through | G8d; G13 when the edit answers a CTI | GEN-cti-or-bug's "reachable" template, where the edit fixes a real bug | AUD-4.3 |
| restate an "eventually" property as an invariant, or a pair property as a single-trace property | G3, G3a | a safety property checked as an invariant | AUD-5.1; S7.L5 |
| pin an affected engine version | G6e | the edition's pinned version with its upstream spec passing | AUD-6.3 |
| drop a declassification | G12 | add a declassification with its record | AUD-7.2; the S7 Defence's Part B |
| drop or misplace an environment assumption other than fairness (provider idempotency, eventual recovery, crash actions switched off) | G7 | restore it as [A] | AUD-8.1; the S8 Defence's Part B |
| reorder two effects in the implementation | G8 | reorder two effects the spec allows in either order | AUD-8.2; the S8 Defence's Part B |
| drop a non-functional requirement from the statement | G1a | keep it, stamped [N] | the G1a subclass |
| edit a pinned statement file or `comparator.json` | G8c | edit an unpinned helper file | the G8c subclass; I7 |

Runs already on disk supply ready variants, as the brief's "tool-trust specimens" upgrade proposed (BRIEF §6, item 3):

| Specimen | Run | Flawed form | Class | Sound form |
|---|---|---|---|---|
| SP-2.8 | [X RUN-lean-bwrap-docker] | exit 1 read as "comparator rejected it" when the sandbox failed under default Docker | G6d | the receipt's sandbox field recorded as `failed`, and no verdict claimed |
| SP-4.5 | [X RUN-z3-11179] | "proved" on Z3 5.3.0, which answers `unsat` on both satisfiable inputs | G6e | the same inputs on 5.3.1, reported as [?] (`unknown`), failing closed |
| SP-4.6 | [X RUN-cvc5-alethe] | "certified by cvc5" when the Alethe proof contains a `hole` step | G6a | the `unsat` stamped "uncertified", with the hole named |
| SP-5.2 | [X RUN-tlc-doublespend] | "no violation" from a run stopped at "Deadlock reached" | G5 | the `-deadlock` run, stamped [R] |

### 4.3 The keying battery

Keys come from checkers, never from the operator that produced a variant: an operator only proposes. Every anchor member and every variant runs one battery, in order. The first failing check gives the **primary class**; every failing check joins the **acceptable set**; and a variant on which any check returns `unknown` is discarded, as generators discard `unknown` instances (spine §8.3).

| Step | Check (engine) | Fails as |
|---|---|---|
| 1 Trust and pipeline | parse the receipt; `#print axioms`; `lake check`; comparator; kernel replay; the cvc5 cross-check; the version and configuration read back | non-standard axiom → G6a; `_native` axiom → G6b; build green, replay rejects → G6c; a cited step absent or not run → G6d; a version or configuration with a known defect → G6e |
| 2 Statement integrity | statement hashes (I7); comparator against the challenge | a different statement or definition under the pinned name → G8a; an edited pinned file → G8c; the answer inside the statement → G8b |
| 3 Verdict honesty | the raw verdict line against spine §8.8 | inconclusive or bounded output under an unbounded stamp → G5; a test or one-instance result under [P] → G11 |
| 4 Non-vacuity | a premise query; guard enabledness; `Init` satisfiability | no state meets the premises → G2 |
| 5 Semantics | the statement under the implementation's arithmetic and types | holds in the model, fails in the implementation's semantics → G4 |
| 6 Requirement fit | for the variant's statement V and the anchor's authored requirement R, Z3 checks V⇒R and R⇒V over the decidable fragment and returns a distinguishing state | V strictly weaker → G1 (G1a when the missing part is a non-functional line); V and R incomparable → G12; V equivalent or stronger → passes |
| 7 Model checks | the medium's engine (TLC, INS-lasso, INS-pairs, INS-history, INS-interp, trace validation, bounded reachability) | a lasso for an "eventually" filed as an invariant → G3; a pair of executions for a pair property filed as a trace property → G3a; a behavior that appears when an environment assumption is removed → G7; an implementation interleaving the atomic action forbids → G9; paired states the observer equates and the attacker distinguishes → G10; a state or trace step where the implementation departs from the model → G8; a CTI with an unreachable pre-state answered by a code edit → G13 |
| 8 Sound | every check passes and the claim's stamp matches what spine §8.8 gives its raw output | keyed "none: sound" |

The order encodes a judgment [D]: a proof that leans on `sorryAx` says nothing about requirement fit, so trust and integrity are checked first. GATE-audit (nightly) re-runs the battery on every anchor and variant and fails on any key that changes, any check that returns `unknown`, and any case without its class, typed evidence and "based on" card.

### 4.4 Supply

- **Tab-keyed families** (Z3 queries, the interpreter, Spectacle safety checks, PGlite single-session SQL, paired states) generate variants at grade time from a seed and key them on the instrument origin (INS-z3, INS-interp, INS-spectacle, INS-pglite, INS-pairs), so an unseen variant is always available.
- **Bench-keyed families** (Lean, TLC liveness, multi-session PostgreSQL) generate and key variants in CI on INS-bench-lean, INS-bench-tlc and INS-bench-pg, each with a recorded run, and ship them as a bank. The tab draws from the bank by seed and prefers members the learner has not seen; GATE-runs keeps every bank key resolvable.
- **Unseen, not secret.** Bank keys sit in the static site, where a determined learner can read them (OD-8; spine §8.9).

### 4.5 Coverage

| Class | Anchors | Operators that grow it | Six exemplars reachable? |
|---|---|---|---|
| G1 | AUD-2.1; AUD-4.2's flawed member | weaken a postcondition; drop parentheses; swap ∀ and ∃ | yes, across SMT, Lean and policies |
| G2 | AUD-1.1 | add a contradictory hypothesis; drop parentheses | yes, from one anchor across media |
| G3 | AUD-5.1 | none in §6.2; proposed: restate "eventually" as an invariant | not with §6.2 alone |
| G4 | AUD-1.2, AUD-3.2 | ℤ → ℕ or BitVec 64 | yes; RUN-z3-bv64 alone gives two flawed forms |
| G5 | AUD-1.3, AUD-5.3 | stamp a bounded inductive check as proof; proposed: report an inconclusive result as a verdict; SP-5.2 | yes with the proposal; with §6.2 alone only through TLA+ |
| G6 | AUD-2.2, AUD-2.3, AUD-6.3 | insert `native_decide` or `sorry`; change an isolation level; SP-2.8, SP-4.5, SP-4.6 | yes |
| G7 | AUD-5.2, AUD-8.1 | drop or misplace fairness; proposed: environment assumptions | yes |
| G8 | AUD-2.4, AUD-3.1, AUD-4.1, AUD-8.2 | drop a frame conjunct; move the conclusion into a premise; weaken a postcondition under the pinned name; proposed: redefine, reorder, edit code | yes |
| G9 | AUD-5.4 | split an atomic action | yes, in TLA+ and SQL |
| G10 | AUD-6.2, AUD-7.1, AUD-9.1 | widen or narrow the observer | yes |
| G11 | AUD-6.1, AUD-9.2 | replace a proof by a single-database test | yes |
| G12 | AUD-7.2 | drop parentheses and swap ∀ and ∃ (when the result is incomparable with the requirement); proposed: drop a declassification | yes |
| G13 | AUD-4.3 | none in §6.2; GEN-cti-or-bug plus the proposed code edit | not with §6.2 alone |

---

## 5. Sessions

### 5.1 Where cases are served

| Surface | Cases | Unit of the sound share | Feedback | Counts toward Judgment |
|---|---|---|---|---|
| SCR-audit: a Desk session the learner starts | 5, 6 or 8, the learner's choice [D] | the session | after the session's last finding | unseen, own, unassisted decisions |
| Today (M-today) | 0–1 per session, inside the Keep block's 2–3 a week | a block of 10 serves | right after the finding | the same |
| Defence Part C (M-defence, SCR-defence) | 4, at least one sound; at S10 one is harvested by `statespace audit` | the part | after the part | the same, plus the Defence's rule (§6.6) |
| The Clearinghouse (M-docket, SCR-clearinghouse) | 1–3 incidents a week | a block of 10 incidents | after each incident | the same |
| `statespace audit` bundles (§8) | the learner's choice | the bundle | after the bundle | the same, badged *reported from your machine* |

Rules on every surface:

- **Always open.** Scheduling is not access (I5). The Desk lists every anchor family with its stage and medium, and any case can be opened at any time.
- **After the lab.** A case is scheduled after the lab stages that teach its class (§3.1), because erroneous examples help learners with prior knowledge [alemdag25]. A decision on a case whose class the learner has not yet been taught is first-contact practice and counts toward no Judgment figure, as Boot's call counts toward no KC state [D].
- **Interleaved.** Set C opens at S2; from then on sessions mix classes and stages (§5.3).
- **Re-checked.** About a week after a case, a fresh variant of the same class returns (§5.5).

### 5.2 The seeded sound share

- **The share.** A seed drawn at the start of the session, or of the block, gives u in [0, 1), and across sittings the share is p = 0.30 + 0.30·u, so p always lies in the 30–60% range (spine §6).
- **Within one sitting** (a Desk session, Defence Part C), exactly k cases are sound, where k is drawn by the seed uniformly from the integers in [ceil(0.30·n), floor(0.60·n)], and the cases are then shuffled. For a four-case Defence Part C, k is drawn uniformly from {1, 2}, the one declared exception: only k = 2 lies inside the 30–60% range, and a fixed k would be learnable; Part C's "at least one sound" still holds. Feedback waits until the last finding, so earlier answers reveal nothing about later cases. For n = 5, k is 2 or 3; for n = 6, 2 or 3; for n = 8, 3 or 4 [D].
- **Across sittings** (Today, the Clearinghouse), each serve in a block of 10 is sound with probability p, drawn independently. Feedback follows every serve there, and an exact count per block would let its last serves be inferred from the earlier ones [D].
- **The pool** stays about half sound (spine §6); the composer, not the pool, sets each session's share.
- **Stated openly.** The Desk says, "In a Desk session, between 30 and 60 percent of the cases are sound; in a four-case Defence part, one or two are," and never states a session's k. An honest range answers the prior v1 taught, that nearly every agent claim is broken (A3-C3).

### 5.3 Drawing cases, pairs and order

1. **Eligible families:** every anchor family whose class is taught on the learner's path, including all earlier stages' families.
2. **Sequence first:** the session's sound and flawed slots are fixed (§5.2), then shuffled by the seed, so no position carries information (last-is-sound, §7).
3. **Family per slot:** weighted toward classes due for review by the Today scheduler (sure-and-wrong calls return at about 1 day and 1 week; M-sure-wrong-returns) and away from the current stage. Once two stages are done, at most half of a session comes from the current stage and at least one case from an earlier one [D].
4. **Member per slot:** the sound or flawed member the slot asks for, preferring unseen variants; a flawed slot takes a GEN-spot-the-gap template (rebutting, undermining, undercutting) in proportion to the classes due.
5. **Pairs apart:** the two members of a pair never share a scored session; the other member appears after filing (§5.5).
6. **One phrase bank:** the agent's claim wording for both members of a pair comes from a single bank, so wording cannot cue the key; cue-ablation QA checks this (§7.5).
7. **No teasers:** lists show counts and subjects only ("3 cases waiting: refunds (Lean), a hold timeout (TLA+)"), never a line that names a gap (A7-08).

### 5.4 The statement-first flow

The five steps are spine §6's. SCR-audit is phone-first: a statement-first card, the diff reveal, "This proves: ___", class radios with no default, line-anchored evidence, and counts afterwards (spine §10.1).

1. **Call the statement alone.** The card shows the agent's claim as quoted UNREVIEWED text (I8), the statement it rests on, and the claim card's proposition, without the diff or the agent's description. The learner calls "sound" or "gap" with a confidence tap (guess, think so, sure), with chance (1/2) printed and the CBM payoffs shown as feedback, never as credit. Only the first call counts and it cannot be edited (M-call-it). It is a `call` event and feeds the Mirror (§6.5).
2. **Reveal the diff.** The diff, the agent's description and the receipt lines the Desk re-derived appear, each with its lane badge (*re-checked here*, *reported from your machine*). Nothing is stamped yet; a stamp appears only once the learner files a finding (A7-08).
3. **Write "This proves: ___".** The learner writes one line in their own words; it is kept and uncredited, because free prose is an uncredited explain-back (spine §3.0). They then answer multiple true/false over about five concrete scenarios, "does the statement, as written, rule this out?" (GEN-call-it, template 4); the case's engine evaluates the statement on each scenario at grade time. For a sound case this restatement is its evidence; for G1 and G12 it is where the gap first shows.
4. **Pick a gap class.** Radios G1 to G13 and "none: sound"; nothing is selected by default, and filing waits until one option is chosen (A7-09). The subclass is optional.
5. **Anchor typed evidence to lines.** The evidence type follows the class (§2.2, §6.3). The learner selects one to three lines of the statement, diff or receipt and attaches the artifact the type needs (a witness, trace, pair, scenario, or the stamp the method earns), which the instrument origin replays.

### 5.5 After filing

- **Counts, split by truth.** At the end of a sitting, or right after each finding on cross-sitting surfaces: "sound: 2 of 3 accepted · flawed: 3 of 4 found, 2 with the right class and evidence". A pooled "k of n correct" is never shown, because it rises with the flawed share [D].
- **Layered feedback** (M-layered-feedback): the key and its acceptable set; whether the evidence validated, and why not; the other member of the pair side by side, so comparison comes before the principle (M-twins); the "based on" card, linked to the dated-incident specimen where one exists (SP-1.9, SP-5.7, SP-6.11, SP-8.5); and a misconception note, open by default only in novice KCs.
- **Witness first.** When a call was wrong, the witness appears at once, because unrefuted lures stick (the assessment report, finding F11).
- **Refutation card** after two misses on one misconception tag (M-refutation-card).
- **Re-check** about seven days later on a fresh variant of the same class, as a re-find (M-re-find).

### 5.6 Phones and access

The Desk works at 360 px. Line anchors are tap targets of at least 44 px; witnesses that INS-pocket covers are checked offline, and the rest wait for the instrument origin or show their recorded run with its id. Radios are native, traces render as tables, and the line selector works from the keyboard (V2-21; GATE-a11y).

---

## 6. Scoring

### 6.1 Three judgments per case

A finding records three things: the **decision** (gap or sound), the **class** (whether the named class is in the key's acceptable set) and the **evidence** (whether the typed evidence validates). A flawed case is **found** when the learner names any class, and the finding is **correct** when its class is acceptable and its evidence validates. A sound case is **accepted** when the learner picks "none: sound".

### 6.2 Formulas

Over the learner's counted decisions (§6.4):

| Figure | Definition | Note |
|---|---|---|
| TNR, sound accepted | accepted sound cases ÷ sound cases | "none: sound" recall |
| TPR, flawed found | found flawed cases ÷ flawed cases | decision only |
| Balanced accuracy (BA) | (TPR + TNR) ÷ 2 | always-reject scores exactly 0.5 (TPR 1, TNR 0), and any strategy that ignores the case scores 0.5 in expectation; v1's reject-all scores 0.5 here, not 87.5% [D] |
| Recall of class k | correct findings on cases whose primary class is k ÷ cases whose primary class is k | multi-label keys: a correct finding may name another acceptable class |
| Precision of class k | correct findings that named k ÷ findings that named k | |
| "none: sound" | recall = TNR; precision = sound cases among accepted cases | reported like a class |

Judgment is BA with its interval plus per-class precision and recall (spine §2.2), all derived from `audit` events at read time (I2).

### 6.3 Evidence types and their checks

| Type | The learner supplies | Checked by | Classes |
|---|---|---|---|
| witness | a model, state, trace, history, lasso or database instance | replay by the engine (INS-z3, INS-pocket, INS-interp, INS-lasso, INS-history, INS-pglite), graded by the property it violates, never by matching values, because witnesses differ between engines [X RUN-z3-bv64-pyodide] | G3, G4, G7, G8, G9, G13 |
| declaration | one to three anchored lines | the key lists one to three load-bearing lines per class; a finding validates when it includes one of the class's kind, together with the receipt's axiom or verdict line where the type needs it. For G2 the load-bearing lines are the premises' unsat core, recomputed by Z3 | G2, G6, G8a, G8b, G8c, G8d |
| identifiers | the mismatched names | the comparator's output | G8a |
| paired states | two states | INS-pairs evaluates both observations | G10, G3a |
| scenario | a concrete scenario | the statement evaluated on it by the case's engine; the requirement's verdict authored with the anchor | G1, G12 |
| verdict line | the raw line, argv or stop line, and the stamp it earns | parsed against spine §8.8 (GEN-which-stamp) | G5, G11, G6d |
| restatement | multiple true/false over about five scenarios | keys computed at grade time | sound cases; every case answers it |

The three-line cap means selecting every line cannot validate a declaration finding [D].

### 6.4 What counts

- **Own, unseen, unassisted, post-instruction** decisions only (spine §8.2). Seen cases and assisted work weigh 0.3, for scheduling only; agent work weighs 0; decisions on untaught classes are first-contact practice (§5.1).
- **Every surface counts the same way.** Each `audit` event records where it was served (Desk, Today, Part C, the Clearinghouse, a bundle), so a display can split by surface.
- **Provenance is declared,** and the copy says so (OD-8).

### 6.5 Intervals, and the n ≥ 10 rule

- **Proportions** (TPR, TNR, each recall and precision) carry 95% Wilson intervals.
- **BA** is the mean of two proportions, so its interval is assembled from the 97.5% Wilson intervals of TPR and TNR: [(L_TPR + L_TNR) ÷ 2, (U_TPR + U_TNR) ÷ 2]. The two intervals hold together with probability at least 95% (Bonferroni), so the interval for their mean holds at least that often [D]. Worked examples [D]: flawed 8 of 10 and sound 8 of 10 give BA 0.80 with interval 0.45–0.95; flawed 16 of 20 and sound 14 of 20 give 0.75 with interval 0.50–0.90.
- **Per-class figures** appear only once n ≥ 10 (spine §6): a class's recall once ten cases of that primary class are counted, its precision once the learner has named it ten times. Below that the class shows "n so far; a rate appears at 10" and no percentage.
- **Every rate** shows its n and its interval; I10 applies to the course's own graders.
- **Calibration** from step-1 calls goes to the Mirror: bias and hit rate per band with Wilson intervals, and nothing diagnosed below about 20–30 calls per band (spine §8.5).

### 6.6 Defence Part C

- **Draw:** four cases, at least one sound, from the stage's pairs and their variants; S9 runs four per half, and S10 includes one case harvested by `statespace audit`.
- **Hit:** a flawed case found with a correct finding, or a sound case accepted with its restatement answered.
- **Pass:** at most one miss, the rule for a part with five or fewer items, alongside the Defence's overall rule; a failed part is retaken on fresh seeds after at least three days (spine §8.6).
- **Stamp:** the part's result is [T] · 4 cases with its Wilson interval (for example, 3 of 4 gives 0.30–0.95 [D]); a pass is never PROVED competence.

### 6.7 Never shown

No leaderboard, XP, audit streak, daily counter or loss framing; no rate without its n; Judgment stays private and local, and the Mirror never appears on Claims.

---

## 7. The blind-strategy gate (GATE-audit-blind)

The gate asks one question: could a learner who never reads a case beat chance on any figure the Desk reports? It runs in the fast lane and blocks merges (spine §11.2).

### 7.1 Inputs

The pool at the commit, the real session composer and the real scorer (the code that scores learners), driven over simulated streams on both published paths: Desk sessions, Today blocks, Defence Part C draws, Clearinghouse incidents (from W3-T14) and harvested bundles (from W5-T11). Seeds are fixed in the gate's configuration, so each commit gets one deterministic verdict [D].

### 7.2 Strategies

| Strategy | Rule | Source |
|---|---|---|
| always-reject | flag every case, naming the pool's most frequent class, with up to three lines chosen at random | spine §6 |
| always-accept | "none: sound" on every case | spine §6 |
| last-is-sound | accept each session's last case, flag the rest | spine §6 |
| topic-is-class | flag every case with the most frequent class of the session's topic stage (the stage most recently completed) | spine §6 |
| fill-the-floor | in Part C, accept the last case when every earlier one was flagged | proposed [D] |
| stage-majority | accept a case when its stage is majority-sound in the pool | proposed [D] |
| longest-diff-is-flawed | flag cases whose diff is longer than the session's median | proposed [D], after kernelspace's always-longest finding (58 of 68 quizzes) |

### 7.3 Metrics

Every figure the Desk shows: the session counts (TPR, TNR), BA, each class's recall and precision at the n its display uses, recall averaged over classes, and the Part C pass rate.

### 7.4 Chance and its SD

- **Decision figures** (TPR, TNR, BA, the Part C pass rate): permute the strategy's picks across all cases in the stream. The permutation keeps the strategy's pick rates and breaks any link to the truth; the permutation mean is chance and its standard deviation is the SD. No surface feature, the stage and the medium included, may predict soundness.
- **Class figures** (recall, precision, recall averaged over classes): permute the picks within each stage. A case's own stage legitimately narrows its class (G6c arises only in Lean), so this null keeps what the stage reveals and breaks only what position, the session's topic or a constant would add.
- **Rule:** fail when an observed figure exceeds chance + 2 SD, with 1,000 permutations per strategy and figure [D].

This null passes constant strategies by construction (their score equals chance, with SD 0), and it catches a planted position cue, a composer that favors the session's topic, and a stage whose sound share differs from the rest. A single full permutation for class figures would fail every pool, because the stage alone predicts part of the class. Both behaviors were checked on a toy pool while writing this design [D].

### 7.5 Companion checks

- **GATE-audit** (nightly) builds or runs every anchor and variant with its key, class, typed evidence and "based on" card (spine §11.2), re-running the keying battery (§4.3).
- **GATE-items** lints the step-3 scenarios like any multiple true/false item: a "why" and a misconception ID on every option, and length and convergence lints.
- **Cue-ablation QA** (W6-T06) answers each case with parts removed: the claim wording alone, the diff without the statement, the statement without the requirement. Beating chance by more than 15 points across two runs flags the case, kernelspace's rule for its own items. This is authoring-time QA of items by an agent; it never grades a learner (spine §8.1).

### 7.6 Report-only output

The gate also computes the **stage-only floor**: the class recall a strategy reaches by naming, for each case, the most frequent class of the case's own stage. It does not fail on it. SCR-assurance publishes the floor beside the explanation of per-class figures, so a learner can read their per-class recall against it [D].

### 7.7 Power, and the bound the gate prints

With a small pool the SD is wide, and a pass says little. The gate prints its pool size and stream length, so its claim on SCR-assurance carries its bound (I10). In W1 the pool holds AUD-1.1 to AUD-1.3 with variants plus five run-keyed anchors; digest-review-2 (A4) suggested blocking only once a mutation-fed pool nears 100 cases. The spine blocks from W1, which costs nothing when the gate passes and stays honest while the bound is printed.

---

## 8. Your repo is the Audit Desk

The brief's sixth bold upgrade, scored 12.5 for impact and wow over effort (BRIEF §6; Ev small [alemdag25]), points the Desk at the learner's own work. Its tool is `statespace audit gen | harvest` (spine §9.6; the brief's `bench audit`), owned by W5-T11.

### 8.1 What it does

- **`statespace audit gen`** applies §4's operators to the learner's lab repository (`statespace-lab`): pinned challenge statements, `claims/*.yaml`, `claims/*.tla`, `*.smt2` files and semantics modules. Each mutation yields a pair, the flawed form and its sound form.
- **`statespace audit harvest`** turns commits by the learner's own agent that touched statement files into cases: the statement before and after, the commit message as the agent's claim (quoted UNREVIEWED), and the diff.
- **Keys** come from the keying battery (§4.3), run locally on the Bench engines (comparator, `lake check`, Z3 and cvc5, TLC, the interpreter). The tool writes a bundle, which the tab imports through INS-receipt on the instrument origin (I6): schema-validated, size-capped and never rendered as HTML.

### 8.2 Rules

1. **Thirty days of distance.** `gen` mutates only artifacts last edited at least 30 days earlier, because a learner remembers what they wrote last week (D3).
2. **Pairs and share.** Every mutation also yields its sound form, and the bundle's sessions use the seeded share (§5.2).
3. **Checkers only.** A harvested change whose class no check in the battery can decide (requirement fit with no authored requirement predicate, for example) becomes an unscored review card. The tool never guesses a key, and a learner never keys a case they will answer.
4. **Which commits.** Commits that touch pinned statements (`Challenge` modules, `comparator.json`), claim files or semantics modules, and that the agent kit marks as agent-authored. Nothing is fetched over the network.
5. **Lane.** Bundle cases are badged *reported from your machine*, because their keys were computed there; a case the tab re-checks (a Z3 query, an interpreter replay) is badged *re-checked here*.
6. **Privacy.** Bundles stay on the device, and the course receives nothing. Private paths are stripped as `statespace stuck` strips them, and GATE-privacy runs on a fixture bundle.
7. **Your system.** Pointing `statespace audit` at "your system" happens only inside the private overlay (`statespace overlay`, M-overlay); nothing from it enters the course repository or the lab repository (V2-28).

### 8.3 When it runs, and how it counts

- **When:** in the late stages, once W5-T11 ships; the S10 Defence's Part C includes one harvested case (spine §3.10).
- **Counting:** a decision on a bundle case counts like any other (§6.4) when its variant was drawn at grade time and the learner had not seen it.
- **Why:** it is near transfer, hugged and bridged (A/B [sala19][grossman11]): the same move on statements the learner wrote, and erroneous examples produced by the learner's own agent. It is the closest the course comes to end-state (g) in the learner's own work.

---

## 9. Background: the AI × formal-verification failure taxonomy

This section summarizes the landscape digest's §4, which drew on the AI-verification report's incident review, and maps each incident type onto the Desk's classes. Figures are quoted from their sources; [V] marks those a digest re-checked against a primary source.

### 9.1 The pattern

The AI-verification report reviewed 37 documented incidents from 2024 to 2026. None showed a wrong proof of a correct statement passing a working kernel: every accepted wrong proof went through a harness or kernel bug, and 22 of the 37 incidents sit in the statement or trust-base layers (its §2.7). Kleppmann (2025-12-08) predicted that "the challenge will move to correctly defining the specification" (https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html) [V]. The Desk follows that shape: most of its classes concern the statement and the trust base, and its sound cases exist because the checkers usually work.

### 9.2 Incident types and their classes

The digest numbers its 21 incident types within five layers. This table names the layer instead of the digest's codes, because those codes collide with stage IDs and hint rungs; rows keep the digest's order.

| Layer | Gap | Dated incidents and sources | Class at the Desk |
|---|---|---|---|
| statement | Misrepresentation | PutnamBench issues #366, #368 and #363 (2026-10-13; https://github.com/trishullab/PutnamBench/issues/366) [V]; Erdős problem #124, "= 1" written for "≥ 1" (2025-11; https://www.erdosproblems.com/forum/thread/124) | G1 or G12; G2 when the slip makes the premises inconsistent |
| statement | Type semantics and junk values | Kimina-Prover issue #11 (2026-09-13; https://github.com/MoonshotAI/Kimina-Prover-Preview/issues/11); PutnamBench #348 (2026-08-25); Erdős #480 (https://xenaproject.wordpress.com/2025/12/05/formalization-of-erdos-problems/) | G4 |
| statement | False as written | PutnamBench #347 (2026-08-13); VERINA pull request #17, merged 2026-04-17, specification fixes in 18 tasks and code fixes in 9 (https://github.com/sunblaze-ucb/verina/pull/17) [V] | G12; an accepted "proof" of such a statement also implies G6 |
| statement | Vacuous premise | PutnamBench #361 (2026-10-12) and #365, where a fix reopened the hole (https://github.com/trishullab/PutnamBench/issues/361) [V] | G2 |
| statement | Answer in the statement | FormaTheoria (2026-08-11; https://arxiv.org/abs/2608.10894); the definition-hole example in comparator's README | G8b |
| statement | Weak specification | AlphaVerus (https://arxiv.org/abs/2412.06176); Spec-Harness, 22.7% of accepted specifications without a postcondition (https://arxiv.org/abs/2604.00280); VERINA, best specification soundness and completeness 52.3% (https://arxiv.org/abs/2505.23135) [V] | G1 |
| statement | Intent mismatch | model answers on Erdős problems, 13 of 200 "meaningfully correct" (2026-01-29; https://arxiv.org/abs/2601.22401); AlphaProof Nexus and the reading of "density" (https://arxiv.org/abs/2605.22763) | G12 |
| statement | Non-functional omission | AxDafny: 89 of 127 verified programs failed runtime limits (2026-06-30; https://arxiv.org/abs/2606.32007) [V] | G1a |
| trust base | Escape hatches | AlphaVerus and `assume(false)`; AlphaProof Nexus, where prompting against the behavior "failed to prevent it"; the Verus guide's list of LLM cheats (https://verus-lang.github.io/verus/guide/print.html) [V] | G6a |
| trust base | Native trust | Kimina-Prover issue #11: 15 of 225 solutions use undisclosed `native_decide` | G6b |
| trust base | Tampering | FormalQualBench (runs evaluated 2026-03-18 and 2026-03-19): "Comparator catches the illegal axiom" (https://math.inc/formalqualbench) | G8c |
| checker | The check never ran | an older Lean REPL that skipped the kernel (https://arxiv.org/abs/2507.14722); a front-end bug in Lean before 4.20 that left a silent `sorry` (https://arxiv.org/abs/2606.29493) | G6d |
| checker | Unsound checker | Lean kernel issue #14576, fixed 2026-07-28 (https://github.com/leanprover/lean4/issues/14576; postmortem: https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/); Lean 4.33's release notes list 12 kernel PRs with mixed labels, two marked as affecting users of comparator (https://lean-lang.org/doc/reference/latest/releases/v4.33.0/) [V]; Lean 4.34 fixed three soundness issues found with AI adversarial testing, two in the kernel proper and one in the runtime's reference counting (https://lean-lang.org/doc/reference/latest/releases/v4.34.0/) [V]; STORM found 29 critical bugs in 7 SMT solvers (2020; https://arxiv.org/abs/2004.05934) | G6e |
| checker | Dependent or disagreeing checkers | lean4lean shared #14576 because it ports the reference's handling of inductive types; in OEIS Open, Comparator and SafeVerify disagreed on five defective formalizations (https://arxiv.org/abs/2608.11941); Lean issue #15643, where `leanchecker` rejects a valid proof (https://github.com/leanprover/lean4/issues/15643) [V] | G11 (common-mode evidence) or G6e |
| checker | Engine defect or misread verdict | Nemo's filter bug, fixed in v0.10.1 (2026-08-01; https://github.com/knowsys/nemo/releases/tag/v0.10.1); SQLSolver may report NEQ or UNKNOWN for equivalent query pairs (https://github.com/SJTU-IPADS/SQLSolver) [V] | G6e for a defect; G5 for a misread verdict |
| model and agent | Textbook model, arbitrary fairness | SysMoBench (https://arxiv.org/abs/2509.23130) [V] | G8 for the textbook model; G7 for the fairness |
| model and agent | Code bent to fit the proof | the Verus guide; Spec-Harness, 5.6% of specifications with changed code | G8d |
| model and agent | Gaming under pressure | METR (2025-06-05): anti-cheat instructions had a "nearly negligible effect" (https://metr.org/blog/2025-06-05-recent-reward-hacking/); ImpossibleBench (2025-10-23): on Conflicting-SWEbench an abort option cut GPT-5's cheating from 54% to 9%, an effect "much less pronounced" for Claude Opus 4.1 (https://arxiv.org/abs/2510.20270) [V] | a lens, not a class: no key or grade relies on agent instructions |
| reporting | Snapshot drift | PutnamBench #353 (2026-09-13): 187 of 672 statements edited after creation (https://github.com/trishullab/PutnamBench/issues/353) | a lens; here a changed statement hash voids a claim to [?] (I7) |
| reporting | Provenance and budget | AxiomProver's formalizer unstated; FrontierMath Erdős off-protocol runs above $220k (https://arxiv.org/abs/2609.25050) [V] | a lens; receipts carry author, hash, n and budget |
| reporting | Common-mode evidence; test as proof | AuthV2's shadow-test mismatches were all specification errors (https://www.amazon.science/publications/formally-verified-cloud-scale-authorization); SpotIt: checking on one database overstated accuracy (https://arxiv.org/abs/2510.26840); CIDR 2026 on "results match" | G11 |

G3, G9, G10 and G13 have no row here, and G5 only a partial one: they come from v1's taxonomy, the review digests and the course's own stages. SysMoBench's liveness figures (AUD-5.1), the course's own TLC run (AUD-5.3), the gift-card race (AUD-5.4) and Csmith (AUD-9.1) supply their dated anchors.

### 9.3 Design rules from landscape §4

| Rule | Status here |
|---|---|
| every case has a "based on" card (incident, date, URL), and no case ships exploit code | adopted (§3) |
| drills are generated by mutation (drop parentheses, swap ∀∃, ℤ→ℕ, add a contradictory hypothesis, move the conclusion into a premise, insert `native_decide`, weaken a postcondition, drop fairness) | adopted and extended (§4) |
| 25–35% of cases are sound, and both precision and recall are scored | superseded by the brief (§5.1): a pair pool and a seeded 30–60% session share, because a fixed rate can be learned; scored by balanced accuracy and per-class figures |
| base-rate cards are labeled "context-specific" | adopted: a card may quote its incident's base rate (for example, miniF2F's formal–informal mismatch in "more than half of the problems", https://arxiv.org/abs/2511.03108), labeled context-specific and never presented as the rate of the learner's own agents |
| `AGENTS.md` is advice, not evidence | adopted: no key or grade relies on it |
| merge the AI-verification report's new classes with the assurance report's undermining classes, rename class 4, regroup by defeater kind | done in BRIEF §4.8 and spine §6.1 (§2 here) |

---

## 10. Build plan

| Task | Wave | Delivers | Acceptance |
|---|---|---|---|
| W1-T05 | W1 | GEN-spot-the-gap, among the first five generator families | GATE-generators, GATE-calls |
| W1-T17 | W1 | M-audit-desk, M-twins, SCR-audit; AUD-1.1–AUD-1.3 with variants; AUD-2.1–AUD-2.4 and AUD-5.3 keyed by executed runs, without variants, scheduled after LAB-2 and LAB-5 | GATE-audit, GATE-audit-blind |
| W2-T12 | W2 | the Defence engine, Part C included | GATE-schema; ledger property tests |
| W2-T13 | W2 | AUD-3.1, AUD-3.2; variants of AUD-2.1–AUD-2.4 | GATE-audit |
| W3-T13 | W3 | AUD-4.1–AUD-4.3, AUD-5.1, AUD-5.2, AUD-5.4; AUD-5.3's G5 variant | GATE-audit |
| W3-T14 | W3 | Clearinghouse v0 incidents | GATE-audit-blind extended to the incidents; RUN-docket-baselines |
| W4-T13 | W4 | AUD-6.1–AUD-6.3, AUD-7.1, AUD-7.2 | GATE-audit |
| W5-T11 | W5 | AUD-8.1–AUD-9.2; `statespace audit` | GATE-audit; keys computed locally |
| W6-T06 | W6 | the cue-ablation and blind-strategy sweep | GATE-items, GATE-audit-blind |

**Owner review.** The spine's rubric allows 0.3 h per anchor, 7.5 h for all 25 [D], inside the task totals of spine §13.

**Cuts.** Spine §14's cut order removes "Judgment breakdowns" second (per-class figures go; balanced accuracy stays) and "audit anchors beyond two per stage" last. A class-preserving form of the last cut keeps every class and the sound anchor; one feasible set drops AUD-1.2, AUD-2.3, AUD-2.4, AUD-4.1, AUD-5.2, AUD-5.3 and AUD-6.1, leaving 18 anchors [D]. It drops three anchors that W1 already keys from executed runs, so the owner may prefer another set; any set must keep G1, G2, G3, G9, G12 and G13, whose classes have one anchor each, and AUD-4.2.

---

## 11. What the Desk cannot establish

- **One learner.** Judgment describes one learner's decisions on one pool; it supports no population claim and no causal claim (spine §8.9).
- **Declared provenance.** "Unassisted" is self-declared and cannot be verified locally (OD-8).
- **Visible oracles.** Bank keys and generator code ship with the static site.
- **Pool-relative figures.** Per-class figures depend on the pool's diversity within each stage; read them against the stage-only floor (§7.6).
- **No base rate.** The flawed share is seeded, so the Desk cannot say how often agents err; only harvested cases (§8) come from the learner's own agent, and they are few.
- **Modest effects.** The mechanisms behind the Desk have evidence for their principles (grades A small to A); the Desk as a whole has no outcome study, and tenths of an SD is the most to expect [kraft20].
- **One-sided evidence checks.** A validated witness shows the gap exists; a witness that fails to validate shows only that this witness did not show it.
- **Ungraded prose.** The "This proves" line is uncredited; only its scenario check is graded.

---

## 12. Spine issues

Items in `docs/spine/SPINE.md` that this document believes are wrong, inconsistent or underspecified, with the choice made here.

1. **"Twin" means two things.** Glossary term 19 defines "twin" as a production system pinned at a SHA, while §6, M-twins and the AUD table call matched sound and flawed cases "twins". Learner copy at the Desk cannot use the word without colliding; this document writes "pair" and recommends that §6 and M-twins do the same.
2. **AUD-2.1's sound twin has no executed key.** §6 says the five W1 anchors from later stages "ship keyed only by executed runs", but RUN-z3-refund-a21 keys only the flawed variant (and a narrower customer-only claim), not "a refund theorem covering both parties". This document uses the honest customer-only claim as the W1 sound member and moves the both-parties member to W2-T13 with its own run.
3. **§6.2 has no key-run column.** AUD-3.1 names no run at all. AUD-4.2, AUD-5.1 and AUD-5.2 can be keyed by executed runs the table does not cite (RUN-z3-conservation-noguard, RUN-z3-optimize-min, RUN-tlc-hold-lasso). GATE-audit needs every key from a run, so the table should carry run references, as §5.1 does for specimens.
4. **The operator list cannot grow every class.** No §6.2 operator produces G3 or G13, so neither can reach six exemplars; G5 grows only through TLA+; and AUD-1.3, AUD-2.3, AUD-3.1, AUD-4.3, AUD-5.1, AUD-6.3, AUD-7.2, AUD-8.1 and AUD-8.2 have no operator for their own class. §4.2 proposes eleven operators, each traced to an anchor, a subclass or a Defence mutation the spine already names.
5. **GATE-audit's six-per-class count cannot hold in W1.** §4.1 says GATE-audit holds "≥ 6 per class", but W1-T17 requires GATE-audit green with eight anchors and variants for only three of them. The count should apply to classes whose anchors have shipped, or start at W5.
6. **GATE-audit-blind's "chance" is undefined.** With a naive null, topic-is-class fails every pool on class figures, because a case's own stage legitimately narrows its class. §7.4 defines the null: a full permutation for decision figures, a within-stage permutation for class figures.
7. **The sound share is undefined for single-case streams.** §6 draws the share per session, but Today serves 0–1 case per session and the Clearinghouse 1–3 incidents a week. §5.2 draws it per block of 10 serves, with independent draws, because feedback follows every serve.
8. **"Wilson interval" for balanced accuracy.** §2.2's criterion for outcome (g) shows balanced accuracy "with a Wilson interval", but Wilson intervals are defined for a single proportion. §6.5 assembles the interval from the two parts' 97.5% Wilson intervals (Bonferroni).
9. **Multi-label keys are unscored in the spine.** Digest-review-2 (A4) makes keys multi-label, and §6 does not say how per-class precision and recall treat an acceptable set. §6.2 defines them with a primary class and an acceptable set.
10. **AUD-6.3 mixes two failures under G6e.** A database anomaly under SERIALIZABLE is a trusted-base bug, but a pool that runs writers at READ COMMITTED drops S6.L9's [A] clause "every writer is SERIALIZABLE", which fits G7 at least as well. This document keeps G6e as primary and accepts G7 for the pool form.
11. **AUD-2.4's "based on" card.** FormalQualBench reports an injected axiom that comparator caught, which is closer to G8c or G6a than to statement substitution. The anchor's class is right; its card should cite the incident for its lesson, the out-of-band statement check, as §3 does. The landscape digest also lists "the FormalQualBench literal" as unverified, so only the confirmed sentence is quoted.
12. **Dates.** The spine dates Spec-Harness "2026-04", while the AI-verification report gives its first version as 2026-03-31 (the arXiv identifier 2604.00280 is consistent with both). The same report dates VERINA's pull request #17 to 2026-03-05, while the landscape digest and the spine say "merged 2026-04-17"; the cards should say which event each date marks.
13. **Evidence on disk without a run ID.** `research/evidence/a2r3/out/tlc_runs.txt` also records TLC's warning that declaring symmetry during liveness checking can miss violations, a ready G5 variant with no ID in §9.5. `research/evidence/a2r3/out/lean_audit.txt` holds a compiled Lean rendering of the refund case that could key AUD-2.1's Lean member, also without an ID.
14. **S9's Part C draws.** §3.9 drew Part C's cases "per half from the AUD-9.1–AUD-9.2 twin pool" without saying which anchor serves which half, while a mini-Defence samples only its own half; one anchor per half would leave each half's four cases to a single family's variants, which is thin. AUD-9.1 is scheduled after S9.L4 and AUD-9.2 after LAB-9.11 (§3.1), but mini-Defence A draws AUD-9.1 variants and IR-level AUD-9.2 variants, since half A teaches translation validation (S9.L2, LAB-9.1), and mini-Defence B draws both anchors' variants, since half B states the observations and proves the abort case (LAB-9.4, LAB-9.9). §3.9 now states this split.
15. **No learner word for "gap class".** The glossary (§0) has no term for it. "Kind of gap" is plain English and needs no new term under the 25-term cap; GATE-lessons should accept it.
