# Drawers D-01–D-23 and D-30–D-40, placement and test-out: curriculum spec

**Status:** authoring spec for the just-in-time drawers D-01–D-23, the deferred drawers D-30–D-40, the placement check and the per-stage test-out. W1-T11 ships D-01–D-06 and D-13; W2-T16 ships the test-out and the "From kernelspace" placement; spine §13 names the owner of every other drawer (§8.1). Draft: first-learner pass pending. **Date:** 2026-10-24 (machine clock). **IDs:** every ID comes from `docs/spine/SPINE.md`; anything the spine lacks is listed in §10 rather than invented silently.

**Sources, in precedence order:** the roadmap (learning rules 1–3, Stage 1–2 theory, the first weekend, "What not to study prematurely"); executed runs (`research/spikes/RESULTS.md`; `research/evidence/a2r3/out/`, `lean-measure/proj/`, `A5r3/`); the brief (V2-20, V2-30, V2-31, the corrections ledger §2.2, the anti-patterns §3.3); the pedagogy digest (§1 rows 5, 9, 20, 21, 26; the §2 misconception catalog), the landscape digest (§2 "Course 00: Ground") and the review digests (D13, B9, B11); report R2 (I9, the PutnamBench cases); reviews A1 (F13), A3 (M1, M11), A4 (A4-04, A4-19), A6 (F15, F16) and A8 (F8, F11); kernelspace, for its learning engine only: the placement walk and test-out (wave-1 spec §7), the per-check wasm ABI (wave-1 §12.1), the Error Museum (wave-2 §15.6) and the Evidence Pack (wave-2 §21.2); the v1 design's Course 00, for history only; the spine; and the sibling stage specs S01–S10, whose drawer references this file follows.

**Tags.** As in the spine: `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[D]` design rationale or estimate; grades A–D follow the pedagogy digest. `[V]` marks a documentation detail re-checked against a primary source on 2026-10-23 by the digest or sibling spec named beside it; this file re-checked nothing itself (its one attempt, PLF's Hoare chapter, failed to load). `[U]` marks a documentation detail no source re-checked; the owning task verifies it before copy ships. Learner copy appears in quotation marks after "Copy:"; everything else is for authors.

---

## 0. At a glance

Drawers are side material, always open; opening one is logged and never required (I5; spine §3.12). The just-in-time drawers replace v1's Course 00. Instead of six lessons standing between a new learner and Project 00, each ground skill sits beside the lesson that first needs it, which is roadmap rule 1 taken literally: "Read only enough theory to make the current project work; revisit the difficult theory when the artifact exposes a gap" (V2-20; A1 F13; A4-04). A miss *suggests* a drawer; a drawer never waits for a miss, and nothing is gated (BRIEF §3.3; A3 M1). The deferred drawers hold the roadmap's "what not to study prematurely" list as short cards (§4). The placement check (§5) and the per-stage test-out (§6) let a learner show what they already know, so the course can skip it (M-test-out, A [tetzlaff25]).

### 0.1 The just-in-time drawers

"Opens at" gives the trigger and its default presentation (§1.2); the triggers are those of spine §3.12. Minutes are the body's reading time [D]; items are counted separately (§1.3). "Ships" names the task that owns the drawer in spine §13 (§8.1).

| ID | Drawer | Opens at (default) | Main KCs (each drawer lists its previews and spirals) | Body min | Items | Ships |
|---|---|---|---|---|---|---|
| D-01 | A proof is not a test; reading a counterexample | Boot's close card (link); S1.L1 before segment 2 (inline) | KC-1.violation-as-sat (threshold), KC-1.witness-class | 6–8 | 4 | W1-T11 |
| D-02 | Propositions, implication and vacuity | S1.L3 (inline); S2.L2 and S4.L8 (link) | KC-1.implication-vacuity (threshold), KC-1.non-vacuity-check | 6–8 | 4 | W1-T11 |
| D-03 | Quantifiers and negation | S1.L1 before segment 1 (inline) | KC-1.quantifier-negation, KC-1.only-if-direction | 6–8 | 4 | W1-T11 |
| D-04 | State as functions, steps as relations | S1.L4 (inline); S2.L8 and S4.L4 (link) | KC-1.two-state-property | 6–8 | 4 | W1-T11 |
| D-05 | Induction, informally | S2.L1 and S2.L4 (inline) | KC-2.induction-principle | 7–9 | 4 | W1-T11; two items with W2-T11 |
| D-06 | The anatomy of a guarantee: the six fields | S1.L3 (inline); LAB-1.6 (link); S2.L10, LAB-4.8, LAB-10.8 (link) | KC-1.claim-anatomy; its items also carry KC-1.three-answers, KC-1.violation-as-sat, KC-1.non-vacuity-check | 6–8 | 4 | W1-T11 |
| D-07 | The Lean error museum | S2.L3, S2.L6, S2.L7, S2.L9; LAB-3.c4–c5's R1 rungs (link; exhibit links beside matching messages) | KC-2.goal-state-reading, KC-2.automation-scope, KC-2.axioms-and-trust | 6–10 | 4 | W2-T04 |
| D-08 | The Natural Number Game, pinned fallback | S2.L1 (link) | KC-2.induction-principle | 5–7 | 3 | W2-T04 |
| D-09 | PlusCal beside its TLA+ translation | S5.L2 (inline); S8.L2 (link) | KC-5.tlc-flags-matter, KC-5.interleaving-granularity | 6–8 | 4 | W3-T11 |
| D-10 | Reading PLF's Rocq notation | S4.L1, S4.L3 (link); S7 (link) | KC-4.hoare-triple, KC-4.wp-assignment | 5–7 | 3 | W3-T03 |
| D-11 | MVCC in one page (tablespace T4 card) | S6.L5–S6.L7 (link) | KC-6.anomaly-isolation (threshold), KC-6.compilation-pattern, KC-6.serializable-retries | 6–8 | 4 | W4-T13 |
| D-12 | Durability and the write-ahead log in one page (tablespace T3 card) | S8.L3 (link) | KC-8.crash-windows, KC-8.at-least-once (threshold), KC-8.commit-not-send (threshold) | 6–8 | 3 | W5-T02 |
| D-13 | SMT-LIB in one page | S1.L2 and LAB-1.6 (link); S4.L5 (inline); LAB-4.2 onward (link) | KC-1.three-answers (threshold), KC-1.unknown-fails-closed; KC-4.frame-condition | 6–8 | 4 | W1-T11; item 4 with W3-T03 |
| D-14 | The Lane A wasm ABI | the first Lane A stage (inline): LAB-3.8, or LAB-8.4 on the builder's path; LAB-4, LAB-6, LAB-9.11, LAB-10.2–10.3 (link) | the opening lab's correspondence KC (§3) | 6–8 | 3 | W2-T09 |
| D-15 | The devcontainer and `statespace doctor` | the first Bench stage (inline): LAB-2.1, or LAB-5.1 on the builder's path (S5.L2); LAB-6.1, LAB-10.2–10.3 (link) | KC-2.axioms-and-trust (threshold), KC-2.statement-pinning (both first contact here) | 5–7 | 3 | W2-T04 |
| D-16 | Alloy: scopes and instances | S7.L3 (link); LAB-7.8 | KC-7.small-scope, KC-7.policy-checking | 6–8 | 4 | W4-T09 |
| D-17 | Query containment | S7.L4 (link); LAB-7.8; S9.L8 (link) | KC-9.sql-equivalence, KC-6.differential-testing (threshold), KC-6.sql-not-algebra | 6–8 | 3 | W4-T09 |
| D-18 | Apalache for inductive invariants | S4.L6 (link, optional); S5.L9 (link) | KC-4.invariant-vs-inductive (threshold), KC-5.inductive-invariant-tla, KC-5.bounded-scope (threshold) | 6–8 | 3 | W3-T03 |
| D-19 | Scheduled work and timers | S8.L4 (link) | KC-8.crash-windows, KC-8.at-least-once (threshold), KC-5.fairness (threshold) | 5–7 | 3 | W5-T02 |
| D-20 | Sensitivity in caches, without vendor specifics | S7.L7 (link) | KC-7.observer-equivalence (threshold), KC-7.side-channels, KC-7.hyperproperty | 5–7 | 3 | W4-T09 |
| D-21 | byzantine in one page: consistency and the deterministic harness | S7.L8 and S8.L6 (link); S6.L8 (optional link) | KC-7.revocation-past, KC-8.deterministic-simulation | 6–8 | 3 | W4-T13 |
| D-22 | Lean 4 metaprogramming | a Today card once a LAB-3 or LAB-9 module uses `declare_syntax_cat` | KC-3.abstract-syntax, KC-2.axioms-and-trust | 5–7 | 3 | W2-T09 |
| D-23 | Explicit error outcomes in one page | S6.L2 on the builder's path (inline) | KC-3.big-step-errors, KC-6.rowcount-as-guard | 5–7 | 3 | W4-T05 |

Twenty-three drawers and 80 items, all from the fourteen generator families of spine §8.3; none uses GEN-defend, which belongs to the learner's own artifact. The ground drawers D-01–D-06 hold 24 items. The deferred drawers D-30–D-40 are §4.

### 0.2 Where v1's Course 00 went (history)

| v1 lesson | v1 activity | v2 home |
|---|---|---|
| 0.1 A proof is not a test | enumerate a 3-bit transfer space by hand, then reason about all of ℤ | D-01 §A, where the bounded enumeration is one row of the evidence table |
| 0.2 Propositions and implication | truth tables; `false → anything` | D-02 |
| 0.3 Quantifiers and negation | negate "every balance stays non-negative"; ∀/∃ duality | D-03 |
| 0.4 State as functions, steps as relations | a transfer as a relation between s and s′ | D-04 |
| 0.5 Induction, informally | invariants as "true at start, preserved by every step" | D-05 §D–§E, now with the invariant/inductive distinction v1 lacked |
| 0.6 Anatomy of a guarantee | a first six-field card about a toy counter | D-06, on CL-1.1, the learner's own first claim |
| Placement | ten questions graded with Call It, Course 00 only | the adaptive placement check (§5) and a test-out on every stage (§6) |
| Viva | negate three properties; vacuous truth; the six fields from memory | no viva: the S1 Defence's probes (S01 §8), D-06's items and LAB-1.c6 |

v1 opened its theory drawers "only when a Call It is missed twice" (v1 plan §2.10); the brief lists that as an anti-pattern and A3 called it "contraindicated" (BRIEF §3.3; A3 M1).

### 0.3 The ground topics, mapped

| Ground topic | Drawer | KCs |
|---|---|---|
| Logic and implication, vacuous truth included | D-02 | KC-1.implication-vacuity (threshold), KC-1.non-vacuity-check |
| Quantifiers and negation | D-03 | KC-1.quantifier-negation, KC-1.only-if-direction |
| Sets, relations and functions as state and steps | D-04 | KC-1.two-state-property; previews KC-2.finite-map-update, KC-4.frame-condition |
| Informal induction and invariants | D-05 | KC-2.induction-principle; previews KC-4.invariant-vs-inductive, KC-2.generalized-ih |
| The anatomy of a six-field guarantee | D-06 | KC-1.claim-anatomy |
| Reading a counterexample | D-01 §C (replay, cause, minimize, generalize, fix the class), continued in D-04 §E (two-state pairs), D-09 §D (TLC traces) and D-21 §C (seeded fault schedules) | KC-1.witness-class, KC-1.violation-as-sat, KC-1.two-state-property (§10, issue 2) |
| A proof is not a test; reading a counterexample | D-01 | KC-1.violation-as-sat (threshold), KC-1.witness-class |

### 0.4 Why drawers, and how much to expect

Supportive information just before a task cluster, and procedural information during the step, is the design A3 cites for rule 1 (Kester et al. 2001, verified in A3 M1). Learners under-use on-demand help (Aleven et al. 2003, verified there), so a drawer comes to the learner as an inline card at its trigger rather than waiting to be found. Item 1 of each drawer is a prequestion (A [sthilaire23]); the summary-first view applies expertise reversal (A [tetzlaff25]); a second miss on one misconception brings its refutation card (A for science content [danielson24]; untested in logic); mastery gating cuts completion (A [kulik90]), so nothing waits on a pass. As everywhere in the course, expect tenths of an SD at most (spine §7).

---

## 1. Conventions in this file

### 1.1 Drawer anatomy

Each just-in-time drawer gives: **Opens at** (the triggering lessons and segments, and the default presentation of §1.2); **Objective** (observable, resolved to the graded forms that measure it, spine §3.0); **KCs** (the KCs its items carry, split into those it teaches and those it previews, §1.5); **Misconceptions** (`dp:` tags, §1.4); **Body** (5–10 minutes, in lettered sections with minutes); **Items** (3–5, each with family, template and mode, what the learner produces, the key and its grader, and the tag on every distractor or wrong-attempt class); **Placement and test-out**; and **Runs**.

Bodies use only the six W1–W2 content block types (V2-18; spine §12 item 48): prose, instrument, item, claim, specimen and card. A prequestion and a graded item are items, and a table is prose. They show recorded results with their run ids rather than live authored cells, so a drawer adds no Call It beyond its items; a recorded result opens as a free run, ungated (spine §8.5). Rust cards, written for the reference learner (Rust-fluent, new to formal notation, spine §2.1), give one isomorphism and say where it breaks (A1 F13).

### 1.2 Presentation: link, inline, summary first, Today

A drawer's presentation is derived per learner at read time from the event log (I2). It is never stored and never a lock.

| Presentation | When | What the learner sees |
|---|---|---|
| **Link** | always | the drawer's line in the segment margin and in the lesson's drawer list, never in the rail, which shows segment titles only (V2-05); SCR-drawer and search at any time |
| **Inline** | the drawer's default is inline and no summary-first condition holds; or, whatever the default, a miss signal: two misses on one of the drawer's tags within 14 days (the signal that also fires M-refutation-card), or a *sure* call answered wrong on a KC the drawer teaches within 7 days (M-sure-wrong-returns, B [butterfield01]) | a dismissible card above the triggering segment or lab stage |
| **Summary first** | every KC the drawer teaches is shown at placement (§5) or tested out (§6), or the drawer's item 1 and one further fresh item on the same KC were both answered right; and no miss signal since | the drawer opens on its one-screen summary; the body is one tap away (expertise reversal, A [tetzlaff25]) |
| **Today card** | a deferred drawer's trigger fires (§4); or a sure-and-wrong call on a KC the drawer teaches happens in Today rather than in a lesson | a card in Today that opens the drawer; it unlocks nothing |

**Precedence.** A miss signal beats summary first, and summary first beats the default, because the most recent evidence wins. **Defaults** follow the scaffolding rule of spine §2.1: the ground drawers default to inline because the reference learner is new to formal notation; drawers in expert-treated domains (Rust, Postgres practice, concurrency failures) default to link; the rest say so per drawer.

Copy (inline card): "Before this segment: Quantifiers and negation, about 7 minutes. Open it now or carry on; it stays here." Copy (summary first): "You have shown this. Here is the one-screen summary; the full page is one tap away." Opening a drawer is logged as help-seeking and never penalized (A3 M1); the log moves no status (I1) and is the spine's uncredited `view` kind (§8.2).

### 1.3 Items in drawers

- **Generated, keyed by checkers** (I3). Seeds are drawn at grade time; keys come from Z3 (INS-z3), the interpreter (INS-interp), TLC state graphs (INS-theater, INS-spectacle), the lasso validator (INS-lasso), the history checker (INS-history), the paired-state evaluator (INS-pairs) or PGlite (INS-pglite). Lean items use goals and outputs from build-time elaboration (INS-goal-replay), regenerated by GATE-replay. Distractors are misconception mutants, tool-checked as distinct from the key (GATE-generators). Generators discard `unknown` instances (spine §8.3), so a generated three-way verdict never has `unknown` as its key; recorded raw lines serve `unknown`, as in S1.L2.
- **Item 1 is "try first".** Posed before the body, it is the drawer's prequestion (A [sthilaire23]); answered right, together with one further fresh item, it opens the drawer on its summary (§1.2); the confidence tap never shortens what the learner reads.
- **First attempt, one shot.** A first attempt on a fresh seed follows probe rules: one submission, feedback after it, and a call (chance 1/k printed; the first call is final). Unassisted, it is an `item` event, own · unseen, weight 1.0, and counts toward its KCs like any graded item, subject to §1.5. Reading the body moves nothing (I1).
- **Feedback** (M-layered-feedback, A [vdkleij15]): witness, bound and basis always; the chosen distractor's misconception note, open by default for novice-treated KCs (the ground KCs included) and collapsed for expert-treated ones.
- **Retries** draw a fresh seed in practice mode with the class hint shown first (M-class-hint, B/C [dantoni15]) and are recorded own · seen (0.3, scheduling only).
- **Today.** Each item's KC joins Today at its first window (about 1–3 days) if it is not scheduled already, toward the ≥ 8 graded opportunities in 60 days of spine §4.1.
- **Mirror.** A call counts toward the Mirror only if the KC's first lesson segment or the drawer's body was opened before it (the post-instruction rule, spine §8.5). Try-first calls on an unopened topic, placement calls and test-out calls on unopened KCs are excluded.
- **Shares.** Seeds draw keys in seeded shares, so no verdict exceeds 60% of a drawer's calls, and items whose answer may be "none" draw it in a seeded 30–60% share.
- **Phones.** Items keyed by Z3 need INS-z3, which downloads without asking while the loader shows its size (OD-6). Until it is ready, or offline before it is cached, a drawer serves the items INS-pocket can key offline (witness replays, five-statement items over finite tables) and queues the rest for the laptop. Lean items are recorded outputs and work offline.
- **Formalize mode.** GEN-negate-it and GEN-spec-it items are served in the learner's current mode for the KC: pick, then fix, then write (spine §8.4).

### 1.4 Misconception tags

Tags are `dp:` plus the catalog ID from the pedagogy digest's §2, because the catalog's Ground IDs collide with gap classes G1–G13; S01 set this convention and every sibling spec follows it (§10, issue 1). The ground drawers use the Ground set: G1–G8, which the catalog backs with learner studies (mostly grade C), and G9 ("invariant" equated with "inductive invariant", grade D), which serves D-05 and D-18. Later drawers use their stages' tags (Z, L, S, O, T, C, Q, A, E, P, X). Two Ground tags are proposed here, each "—" (no learner study): logged through Call It and kept only if they draw errors, which is the digest's rule.

| Tag | Misconception | Seed |
|---|---|---|
| **dp:G10** (proposed) | precedence or scope misread: → read as binding more tightly than ∧, a quantifier's scope taken to end early, a free constant of a query read as universal | PutnamBench #361 (opened 2026-10-12): a refactor lost parentheses, so → swallowed a chain of ∧ and the hypotheses became inconsistent; #366 (filed 2026-10-13): precedence turned a goal into a hypothesis [R2 I9; landscape digest §2] |
| **dp:G11** (proposed) | quantifier order swapped: ∀x ∃y read or written as ∃y ∀x | PutnamBench #368 (filed 2026-10-13): ∀x∃ written for ∃∀x [R2 I9; landscape digest §2] |

**Sibling-proposed tags reused here**, each still "—" and owned by the spec that proposed it: dp:Z6 (S01); dp:L9 (S02); dp:S5, dp:S7, dp:S12 (S03); dp:T9, dp:T10, dp:T13, dp:T14, dp:T16 (S05); dp:Q8–dp:Q12 (S06); dp:A13, dp:A14 (S07); dp:E5, dp:E6, dp:E8 (S08); dp:X9 (S10). Every option carries a "why"; every wrong option and every wrong-attempt class carries a tag (GATE-items).

**Where the Ground tags live.** Items are written `D-nn/i`k.

| Tag | Misconception (catalog) | Drawer items |
|---|---|---|
| dp:G1 | "P only if Q" read as Q → P or P ↔ Q | D-02/i2, D-02/i4, D-03/i3 |
| dp:G2 | the antecedent follows English word order | D-03/i3 |
| dp:G3 | → and ↔ swapped; "unless" and "provided" mistranslated | D-02/i2, D-02/i4, D-03/i1, D-03/i3, D-10/i1 |
| dp:G4 | a false antecedent read as "irrelevant": the guard that never fires | D-02/i1, D-02/i3, D-03/i1, D-06/i3 |
| dp:G5 | a negation fails when it sounds implausible | D-03/i2, D-03/i4 |
| dp:G6 | an informal claim not unpacked into quantifiers | D-04/i1, D-04/i2, D-04/i4, D-06/i3 |
| dp:G7 | if-then read as AND; iff read one way; proof by incomplete enumeration | D-01/i3, D-02/i2, D-05/i3 |
| dp:G8 | empirical or authoritarian conviction: "20,000 runs passed"; "Lean accepted it" | D-01/i1, D-01/i4, D-06/i1, D-06/i2, D-07/i3, D-13/i2, D-13/i3, D-15/i2, D-22/i2 |
| dp:G9 | "invariant" equated with "inductive invariant" | D-04/i4, D-05/i3, D-05/i4, D-18/i2, D-18/i3 |
| dp:G10 (proposed) | precedence or scope misread | D-02/i3, D-02/i4, D-13/i3 |
| dp:G11 (proposed) | quantifier order swapped | D-03/i4 |

**Refutation cards.** After two misses on one tag, M-refutation-card shows a card that names and refutes the misconception (spine §7; W2-T17). A3 M1 asks for at most 60 words, keyed to the wrong answer chosen. The Ground cards live with the drawers that carry their tags:

| Tag | Copy (≤ 60 words) |
|---|---|
| dp:G1 | "'P only if Q' makes Q necessary for P: P → Q. It does not say Q is enough; that would be Q → P. Check: a case with Q true and P false still satisfies 'P only if Q'." |
| dp:G2 | "English order is not logical order. 'P if Q' puts the condition second but means Q → P. Find the condition word (if, when, provided) and make its clause the premise." |
| dp:G3 | "→ goes one way; ↔ goes both ways. 'If' and 'only if' each give one direction, and you need both for 'if and only if'. 'P unless Q' means 'if not Q, then P'." |
| dp:G4 | "An implication with a false premise is true. 'Every allowed transfer leaves the sender at zero or above' is satisfied by every transfer that is not allowed, so a guard that never fires proves everything. Check that the premises can hold." |
| dp:G5 | "To negate 'every X is P', you need one X that is not P, not every X failing. To negate 'some X is P', show that no X is P. A negation that sounds unlikely follows the same two rules." |
| dp:G6 | "'Money is safe' is not a property yet. Say which: the sender never goes below zero (one state), the total never changes (one step), a hold pays out once (two steps). Each has its own negation and its own witness." |
| dp:G7 | "If-then is not 'and': 'if allowed, then covered' holds for a transfer that is not allowed. And checking many cases is not a proof: a list of passing cases says nothing about the next one." |
| dp:G8 | "A passing test or a green build is evidence about what it ran. A test covers its inputs; a build covers what its checker checked. Ask what was checked, against which statement, with which bound." |
| dp:G9 | "True in every reachable state (invariant) is weaker than kept by every step from any state that satisfies it (inductive). An invariant can fail the step check from a state no run reaches. Strengthen the invariant; do not change correct code." |
| dp:G10 | "→ binds more weakly than ∧: a ∧ b → c means (a ∧ b) → c. When you move or drop parentheses, check the statement again: one lost pair can turn a goal into a premise or make the premises contradict." |
| dp:G11 | "Order matters. ∀x ∃y lets each x have its own y; ∃y ∀x asks for one y that works for every x, a stronger claim. Read the quantifiers aloud, left to right." |

### 1.5 KC tags and first contact

One rule decides when a drawer item counts. An item counts toward a KC's state only once the learner has opened that KC's first lesson segment in their own path order. Before then it is first contact: recorded and scheduled, counted toward no KC state, exactly like Boot's call (spine §12 item 33); its misconception tags are recorded at once. Placement and test-out items are exempt, because they exist to show prior knowledge (§5.6, §6.4). Each drawer lists the KCs it **teaches** (first taught in a lesson that opens the drawer) and those it **previews** (first taught later on the default path); the rule makes the distinction automatic on both published paths and keeps GATE-kc's ordering rule intact.

### 1.6 Learner copy

Glossary terms only, plus plain English (spine §0). "Drawer" enters at S1.L1 (glossary row 11), so Boot links D-01 by its title. "Placement", "test out", "summary" and "idea" are plain English; learner copy never says "KC", "lane", "Shelf" or "Judgment", and deferred drawers carry the tag "deferred". No lock copy, no overdue counts, no loss framing, no bare "correct", "safe" or "verified" (GATE-codes, GATE-lessons).

### 1.7 Validity

Drawer, placement and test-out items are ordinary generated items under GATE-items (whys, tags, length and convergence lints, blind strategies within chance + 2 SD, cue ablation), GATE-generators, GATE-kc (every item tagged), GATE-numbers, GATE-runs and GATE-codes on all copy. GATE-lessons' copy, block-type and no-lock rules apply to SCR-drawer; its lesson anatomy does not (§10, issue 6).

### 1.8 Shipping and generator availability

W1-T11 ships D-01–D-06 and D-13 with items from the W1 families only: GEN-negate-it, GEN-find-the-witness, GEN-call-it, GEN-spot-the-gap and GEN-which-stamp. D-05's two GEN-proof-structure items go live with W2-T11, and D-13's item 4 with LAB-4's SMT-LIB vocabulary (W3-T03). Every other drawer ships with the task that spine §13 names for it (§8.1). A drawer appears in lessons only once it ships, so no learner meets a link to unwritten content; GATE-links checks that every drawer reference in shipped content resolves.

---

## 2. The ground drawers, D-01–D-06

These six hold what Course 00 taught, each beside the S1 or S2 segment that first needs it. They default to inline for the reference learner and fall back to summaries as soon as the learner shows the ideas (§1.2, §5).

### D-01 · A proof is not a test; reading a counterexample

**Opens at.** Boot's close card (link, by title only: Boot is held to 8 minutes, and "drawer" is not yet a term); S1.L1 before segment 2, the violation query (inline by default), and beside segment 3, one witness and one class (link). **Objective.** For a transfer, a test suite's result and a solver's result, stamp each and judge what each establishes (GEN-which-stamp t1; GEN-call-it t4); produce a second witness that differs from a given one in every variable and choose its class (GEN-find-the-witness t1 with class naming). **KCs.** Teaches KC-1.violation-as-sat (threshold) and KC-1.witness-class, both first taught in S1.L1; previews KC-1.three-answers (S1.L2). **Misconceptions.** dp:G7, dp:G8, dp:Z1, dp:Z3, dp:A3, dp:X1, dp:X3; dp:Z6 (proposed by S01).

**Body** (6–8 min)

**A · Two questions** (1.5 min). A test asks whether one input passes. A violation query asks whether any input, in this encoding, breaks the property. What each kind of evidence covers:

| Evidence | Covers | Stamp |
|---|---|---|
| "200 tests green" | the 200 inputs the tests chose | TESTED [T] · n = 200, with how the inputs were chosen |
| every input with values 0–7 checked | every input inside the bound, none outside it | MODEL-CHECKED [M] · bound 0–7 · complete within the bound (I10) |
| `unsat` on the violation query | every input of this encoding, if the solver is sound | PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N [X RUN-z3-starter], with the open defeater "encoding unverified" |
| `sat` with a model that replays | one input that breaks the property | REFUTED [R] · witness length |

**B · Why green tests missed it** (1 min). Boot's tests passed and the transfer still overdrew the sender. A suite checks the inputs its author thought of, and fixtures that gave both accounts the same balance never reached the inputs where the recipient covers the amount and the sender does not (S1.L0). A violation search covers every input of the encoding, including values no fixture holds: the 64-bit recipient wrap needs B = 9223372036850581504 and X = 4194304 [X RUN-z3-bv64], which S1.L5 mounts. Copy: "A passing test is evidence about the inputs it ran. A violation search asks about all of them."

**C · Reading a counterexample** (2.5 min). Five moves, in order.
1. *Replay it.* Put the model's values into the premises and the property: every premise holds and the property fails. The course grades witnesses this way, never by matching values, because a solver may return any member of the class [D] (spine §8.4).
2. *Name the cause.* Which premise let it through? In the roadmap's starter nothing bounds the amount by the sender's balance; in Boot the guard read the recipient's.
3. *Minimize, for an objective you choose.* Optimize with `minimize(amount)` returns amount = 1, b = 0, a = 0 [X RUN-z3-optimize-min]. "Minimal" means minimal for that objective and nothing else.
4. *Generalize.* Write the class every witness belongs to, here `amount > a`, and check that it implies the violation (S1.L1 segment 3).
5. *Fix the class, not the instance.* Excluding `a = 0` leaves the class intact: a = 1 with amount = 2 still overdraws (M-class-hint, B/C [dantoni15][danas17]). A fix must also kill a non-minimal witness (V2-26), and the broken version stays beside the fixed one (roadmap rule 2; the specimen cabinet).

Two-state witnesses continue in D-04 §E, TLC traces in D-09 §D and seeded fault schedules in D-21 §C.

**D · What `unsat` does not say** (1 min). It speaks about this encoding only (S1.L5: `Int` is not 64-bit), about this solver run only (the solver is an assumption, SEAM-7, and S4.L9 replays a solver bug), and only when the premises can hold together (D-02). Each limit becomes a field of your claim card (D-06).

**E · Rust card** (0.5 min). `cargo test` and proptest give TESTED evidence, and proptest's shrinking resembles minimizing for an objective. Where it breaks: no test runner can report that no failing input exists; a solver can, for the encoding it was given.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1 (three-way verdict), probe | a verdict on a seeded transfer (a guard on the wrong balance, a fee on the debit, or a correct guard) whose scenario card reports "n tests green" | Z3 at grade time on the violation query; buggy and correct guards drawn in a seeded 30–60% share | when a witness exists: `unsat`, "the tests passed, so no input fails" (dp:G8); when the guard is right: `sat`, "tests are incomplete, so a bug must exist" (dp:X3); always: `unknown`, though a small linear query is decided (dp:Z6) | KC-1.violation-as-sat |
| 2 | GEN-find-the-witness t1 (model) with class naming, probe | a second witness that differs from a shown one in every variable, then the class predicate among four | the witness replays offline (INS-pocket); the class key is Z3 equivalence with the violation set | the shown witness's values offered as the class: `a = 0`, `amount = 1`, `b = 0` (dp:Z3) | KC-1.witness-class |
| 3 | GEN-which-stamp t1 (raw output → stamp), probe | the stamp and qualifier for a seeded raw line: a test summary, a bounded enumeration, an `unsat` with its `rlimit`, a `sat` with its model | the verdict → stamp table (spine §8.8) and §A's rows | [P] for the test summary (dp:X1); [P] for the bounded enumeration (dp:G7); [R] before the model replays (dp:Z1) | KC-1.violation-as-sat; KC-1.three-answers (preview) |
| 4 | GEN-call-it t4 (five statements), probe | true or false for five statements about a seeded witness beside a passing suite | Z3 at grade time ("every member of the class violates the property" is a validity query) and the scenario's construction | "this is the only failing input" (dp:Z3); "excluding this input fixes the transfer" (dp:A3); "n passing tests show that no input fails" (dp:G8) | KC-1.witness-class, KC-1.violation-as-sat |

**Placement and test-out.** The walk probes KC-1.violation-as-sat and KC-1.witness-class (§5.3, steps 4 and 6). D-01 opens summary first when both are shown or tested out, or item 1 and one further fresh item on the same KC are both answered right; otherwise inline at S1.L1. Test-out sets draw fresh seeds from the same families (§6.6) and never reuse a drawer item's seed.

**Runs.** Executed: RUN-z3-starter, RUN-z3-optimize-min, RUN-z3-bv64. None new.

Copy (Boot's close card): "A proof is not a test; reading a counterexample (6 minutes): why 200 green tests missed this."

### D-02 · Propositions, implication and vacuity

**Opens at.** S1.L3 before cell 2, the configuration cell (inline by default; S01 places the truth table here); S2.L2 (link: in Lean a proof of P → Q is a function, S02); S4.L8 (link: the vacuity trap SP-4.4, where S04 recalls KC-1.implication-vacuity). **Objective.** Judge whether cases satisfy an implication stated in English (GEN-call-it t4), predict a premise query's verdict (GEN-call-it t1), and repair a violation query whose premises contradict, writing its premise query (GEN-negate-it t1, fix). **KCs.** Teaches KC-1.implication-vacuity (threshold) and KC-1.non-vacuity-check, both first taught in S1.L3; KC-1.only-if-direction and KC-1.violation-as-sat return as spirals. **Misconceptions.** dp:G1, dp:G3, dp:G4, dp:G7, dp:Z1; dp:G10 (proposed); dp:Z6 (proposed by S01).

**Body** (6–8 min)

**A · The truth table** (1.5 min).

| P | Q | P → Q |
|---|---|---|
| true | true | true |
| true | false | false |
| false | true | true |
| false | false | true |

Copy: "An implication is broken only by a case where the premise holds and the conclusion fails."

**B · Rules are implications** (1 min). "Every allowed transfer leaves the sender at zero or above" is ∀ inputs. allowed → a′ ≥ 0. A transfer that is not allowed cannot break it, which is why the violation query keeps `allowed` and negates only the conclusion (D-03 §B). Reading if-then as "and" (dp:G7) would make the rule false the moment any transfer is rejected.

**C · Vacuity** (2 min). If no input satisfies the premises, every property about them is "proved". With MAX_TRANSFER = 0 beside `amount > 0 ∧ amount ≤ MAX_TRANSFER`, the violation query, the absurd property "the sender ends 1,000,000 richer" and the premises alone all return `unsat` {{run:RUN-z3-vacuous-unsat}} (SP-1.6, S1.L3). The tell is the premise query: premises and guard, without the negated property. It must return `sat`; its model is the premise witness, and every `unsat` claim in the course carries one in its method field (LAB-1.c3; CL-1.1). AWS Automated Reasoning checks return IMPOSSIBLE among their seven results (read 2026-10-23 [V], S1.L2's reading card); the course maps it to contradictory premises [D].

**D · Precedence** (1 min). → binds more weakly than ∧: `a ∧ b → c` reads `(a ∧ b) → c`, and an unparenthesized chain can say something you did not mean. PutnamBench issue #361 (opened 2026-10-12) is the dated example: a readability refactor lost parentheses, → swallowed a chain of ∧, and the hypotheses became inconsistent, so the statement was vacuous [R2 I9; read 2026-10-23 [V] by S01 for AUD-1.1]. Parenthesize whenever you move a clause (dp:G10).

**E · Rust card** (0.5 min). `if guard { assert!(post) }` passes on every input where the guard is false, so a suite whose inputs never satisfy the guard stays green. Where it breaks: the `if` runs on the inputs a test supplies, while an implication is a claim about every input, and the premise query asks whether any input satisfies the guard at all. In Lean, `P → Q` is a function type: a way to turn evidence for P into evidence for Q (S2.L2).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1, probe | the premise query's verdict for a seeded claim | Z3 at grade time; contradictory premises drawn in a seeded 30–60% share | when the premises contradict: `sat`, "a proved claim must have allowed inputs" (dp:G4); when they are satisfiable: `unsat`, "the violation's `unsat` means the premises are empty" (dp:Z1); `unknown` (dp:Z6) | KC-1.non-vacuity-check, KC-1.implication-vacuity |
| 2 | GEN-call-it t4 (five cases), probe | for a seeded rule ("a refund is allowed only if the charge has settled") and five cases, whether each case satisfies the rule | the formula evaluated on each case at grade time (INS-pocket) | a case with a false premise judged a violation (dp:G7); allowed but not settled judged satisfying (dp:G1); settled but not allowed judged a violation, the two-way reading (dp:G3) | KC-1.implication-vacuity, KC-1.only-if-direction |
| 3 | GEN-negate-it t1 (single guard), fix | a repaired violation query for a seeded guard, plus its premise query | Z3 equivalence with the reference, with a distinguishing state on failure; the premise query must return `sat` | the planted defect, one per seed: a bound contradicting a premise (dp:Z1); → where ∧ belongs (dp:G4); a lost pair of parentheses (dp:G10) | KC-1.non-vacuity-check, KC-1.violation-as-sat |
| 4 | GEN-negate-it t4 (English "only if"/"unless"), in the learner's formalize mode | the violation query for a seeded rule with a chain of conditions | Z3 equivalence with the reference; a wrong pick or fix shows a distinguishing state | the unparenthesized chain in which → swallows ∧ (dp:G10); the reversed direction (dp:G1); a biconditional (dp:G3) | KC-1.implication-vacuity, KC-1.only-if-direction |

**Placement and test-out.** The walk probes KC-1.implication-vacuity (step 5) and KC-1.non-vacuity-check (step 9). D-02 opens summary first when both are shown or tested out, or item 1 and one further fresh item on the same KC are both answered right. A miss signal on dp:G4 or dp:Z1 brings it back inline wherever it is linked, including at S4.L8's vacuity trap.

**Runs.** Executed: RUN-z3-starter. To record: RUN-z3-vacuous-unsat (W1-T12).

### D-03 · Quantifiers and negation

**Opens at.** S1.L1 before segment 1, "Negating English" (inline by default); S1.L1's two prequestions use the same moves. **Objective.** Write the violation query for an English property with quantifiers, connectives, "only if" and "unless" (GEN-negate-it t1, t3, t4), and judge statements whose quantifiers come in different orders on a finite table (GEN-call-it t4). **KCs.** Teaches KC-1.quantifier-negation and KC-1.only-if-direction, both first taught in S1.L1 segment 1; previews KC-1.violation-as-sat, which segment 2 teaches. **Misconceptions.** dp:G1, dp:G2, dp:G3, dp:G4, dp:G5, dp:G6, dp:G7, dp:Z1, dp:Z5; dp:G11 (proposed).

**Body** (6–8 min)

**A · Two rules** (1.5 min). ¬(∀x. P(x)) ≡ ∃x. ¬P(x), and ¬(∃x. P(x)) ≡ ∀x. ¬P(x). "Every allowed transfer leaves the sender at zero or above" negates to "some allowed transfer leaves the sender below zero": one transfer, not every one (dp:G5). A violation query asserts that existential, and a model of it is a witness (D-01).

**B · Connectives** (1.5 min). ¬(A ∧ B) ≡ ¬A ∨ ¬B; ¬(A ∨ B) ≡ ¬A ∧ ¬B; ¬(A → B) ≡ A ∧ ¬B. "Both balances stay at zero or above" negates to `a′ < 0 ∨ b′ < 0`. Writing `a′ < 0 ∧ b′ < 0` asks for both at once, and on the unguarded transfer Z3 answers `unsat` although the property is violated {{run:RUN-z3-demorgan}} (S1.L1 segment 1). Negating an implication keeps its premise: `allowed ∧ a′ < 0`, not `allowed → a′ < 0` (dp:G4).

**C · English** (2 min).

| English | Formula | Common slip |
|---|---|---|
| P only if Q | P → Q | Q → P (dp:G1); P ↔ Q (dp:G3) |
| P if Q | Q → P | P → Q, following word order (dp:G2) |
| P provided Q | Q → P | P → Q (dp:G2) |
| P unless Q | ¬Q → P, that is, P ∨ Q | P → ¬Q, or P ↔ ¬Q (dp:G3) |
| P if and only if Q | P ↔ Q | one direction only (dp:G7) |

The course reads "P unless Q" as "if not Q, then P"; where a requirement means "exactly when not Q", the item says so in words [D].

**D · Free variables, and the order of quantifiers** (1.5 min). Asserting a formula asks whether some values of its free variables make it true: free variables act as an outermost "there exists". Asserting `∀k. k·k ≠ y` therefore asks whether some y is not a perfect square, and Z3 answers `sat` with y = 2 [X RUN-z3-unknown-pow]. Order matters: ∀x ∃y lets each x choose its own y, while ∃y ∀x asks for one y that serves every x. PutnamBench issue #368 (filed 2026-10-13) wrote ∀x∃ where ∃∀x was meant [R2 I9; landscape digest §2] (dp:G11).

**E · Unpack, then negate** (1 min). "Money is safe" is not yet a property (dp:G6). Say which one you mean: the sender never goes below zero (one state), the total never changes (one step, D-04), a hold pays out once (two steps). Each has its own negation and its own witness.

**F · Rust card** (0.5 min). `xs.iter().all(p)` is ∀, `xs.iter().any(p)` is ∃, and `!xs.iter().all(p) == xs.iter().any(|x| !p(x))` is the first rule. Where it breaks: an iterator visits the finite collection you hold, while ∀ over ℤ ranges over values no loop can visit, which is why the solver, not a loop, answers it.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-negate-it t1 (single guard), pick | the violation query for "every allowed transfer leaves the sender at zero or above", on a seeded variant | Z3 equivalence with the reference; a wrong pick shows a distinguishing state | `allowed ∧ bal′ ≥ 0`, a working transfer (dp:Z1); `¬allowed ∧ bal′ < 0`, the premise negated too (dp:G3); `allowed → bal′ < 0`, the implication kept (dp:G4) | KC-1.quantifier-negation, KC-1.violation-as-sat |
| 2 | GEN-negate-it t3 (quantified over accounts), pick then fix | the violation query for a property over a finite set of accounts ("every account stays at zero or above after the batch") | Z3 equivalence over the finite account sort, which is decidable | ∀a. bal′(a) < 0, the body negated and the quantifier kept (dp:G5); ∃a. bal′(a) ≥ 0, the quantifier flipped and the body kept (dp:G5); a De Morgan slip inside the body (dp:Z5) | KC-1.quantifier-negation |
| 3 | GEN-negate-it t4 (English "only if"/"unless"), in the learner's formalize mode | the violation query for a seeded rule such as "a refund is allowed only if the charge has settled, unless it is a chargeback" | Z3 equivalence with the reference; instances with unsatisfiable premises are discarded | the reversed "only if" (dp:G1); the condition placed by word order (dp:G2); "unless" mistranslated (dp:G3); a De Morgan slip (dp:Z5) | KC-1.only-if-direction, KC-1.quantifier-negation |
| 4 | GEN-call-it t4 (five statements), probe | true or false for five statements over a seeded finite table (accounts × approvers), mixing ∀∃, ∃∀ and negations | each statement evaluated on the table at grade time (INS-pocket; Z3 over a finite sort as a cross-check) | an order-swapped statement judged like its twin (dp:G11); a negation judged by negating only the body (dp:G5) | KC-1.quantifier-negation |

**Placement and test-out.** The walk starts here: KC-1.quantifier-negation is step 1 and KC-1.only-if-direction step 2 (§5.3), because neither requires anything. D-03 opens summary first when both are shown or tested out, or item 1 and one further fresh item on the same KC are both answered right.

**Runs.** Executed: RUN-z3-unknown-pow (the `∀k. k·k ≠ y` line of its log; §10, issue 16). To record: RUN-z3-demorgan (W1-T12).

### D-04 · State as functions, steps as relations

**Opens at.** S1.L4 before "The model" (inline by default); S2.L8 (link: pointwise update and the self-transfer mint, S02); S4.L4 (link: from commands to obligations, S04). **Objective.** Write a step as a relation over S and S′ with primed variables, including what stays unchanged (GEN-negate-it t2); tell a property of one state from a property of a step (GEN-call-it t4); read a two-state counterexample and name its class (GEN-find-the-witness t1). **KCs.** Teaches KC-1.two-state-property (first taught in S1.L4); KC-1.witness-class returns as a spiral; previews KC-2.finite-map-update (S2.L8) and KC-4.frame-condition (S4.L5). **Misconceptions.** dp:G6, dp:G9, dp:L7, dp:S1, dp:O2, dp:O4, dp:Z3, dp:Z5; dp:Z6 (proposed by S01).

**Body** (6–8 min)

**A · A state is a function** (1.5 min). A state maps names to values: for two accounts, S = (a, b); for many, `bal : Acct → Int`. A property of one state is a set of states: "a ≥ 0" picks the states in which the sender is non-negative.

**B · A step is a relation** (2 min). A step is a set of pairs (S, S′), written with primed variables. A transfer of `amt` is `amt > 0 ∧ amt ≤ a ∧ a′ = a − amt ∧ b′ = b + amt`. A relation may allow no successor (the guard fails, so there is no pair) or several (a choice of amount). Whatever it does not mention is unconstrained: with a third account c, the relation must say `c′ = c`. That conjunct is a frame condition, and S4.L5 returns to it with a missing frame that "proves" a false theorem (SP-4.1 {{run:RUN-z3-missing-frame}}).

**C · Properties of steps** (1 min). Conservation, `a′ + b′ = a + b`, is a property of pairs. Over `Int` it holds with no guard at all [X RUN-z3-conservation-noguard]: a step property can hold while a state property, non-negativity, fails. A chain S → S′ → S″ checks two steps, as the double capture does (SP-1.2 {{run:RUN-z3-double-capture}}).

**D · Functions and update** (1.5 min). With many accounts, `bal′ = upd(upd(bal, f, bal f − n), t, bal t + n)`. When f = t, computing both new balances from the old state mints money: Z3 finds `sat [n = 1, t = 0, f = 0]` [X RUN-z3-selftransfer], and in Lean `xferBuggy (fun _ => 10) 0 0 5 0 = 15` holds by `decide` while the fixed version gives 10 [X RUN-lean-selftransfer] (SP-2.1, S2.L8).

**E · Reading a two-state counterexample** (1 min). Read the pre-state, the step's parameters and the post-state; evaluate each conjunct of the property on the pair; the failing conjunct names the bug. Then ask which class of pairs fails (D-01 §C), and whether the pre-state can occur at all, a question S4.L6 makes precise (D-05 §E).

**F · Rust card** (0.5 min). `fn step(s: &State, c: Cmd) -> Option<State>` is a relation that happens to be a partial function, and in-place updates through `&mut` alias exactly as the self-transfer does. Where it breaks: a relation can allow several successors while a Rust function returns one; a specification says what is allowed, and the code picks.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1, probe | Z3's verdict on the conservation violation query for a seeded step (a fee to a third account, a refund, a plain transfer) | Z3 at grade time; conserving and leaking steps in a seeded 30–60% share | when the step conserves: `sat`, "the guard is weak, so money can leak" (conservation is not non-negativity, dp:G6); when a leg is missing: `unsat`, "every transfer conserves" (dp:O2); `unknown` (dp:Z6) | KC-1.two-state-property |
| 2 | GEN-negate-it t2 (two-state), pick then fix | the violation query over S, S′ (and S″ where needed) for a seeded step property: at most once, conservation, no mint | Z3 equivalence with the reference | the property negated on S instead of S′ (dp:G6); an untouched account left unconstrained (dp:O4); a De Morgan slip (dp:Z5) | KC-1.two-state-property |
| 3 | GEN-find-the-witness t1 (model), probe | a pair (S, S′) that violates conservation for a seeded map update (a stale read, a clamp, a missing leg), then its class | the pair replays (INS-pocket; Z3); the class is the generator's mutation class | the instance taken as the bug (dp:Z3); "a transfer to oneself changes nothing" (dp:L7, dp:S1) | KC-1.two-state-property, KC-1.witness-class |
| 4 | GEN-call-it t4 (five statements), probe | true or false for five statements about a shown pair and a step relation | each statement evaluated on the pair at grade time | "conservation is a property of one state" (dp:G6); "this pair shows the step relation is wrong", when it shows a property violation (dp:Z3); "a violating pair shows the property fails in some reachable state", when the pre-state may be unreachable (dp:G9) | KC-1.two-state-property |

**Placement and test-out.** KC-1.two-state-property requires nothing, so the walk probes it third (§5.3). D-04 opens summary first when it is shown or tested out, or item 1 and one further fresh item on the same KC are both answered right.

**Runs.** Executed: RUN-z3-conservation-noguard, RUN-z3-selftransfer, RUN-lean-selftransfer. To record: RUN-z3-double-capture (W1-T12), RUN-z3-missing-frame (W3-T07).

### D-05 · Induction, informally

**Opens at.** S2.L1, after the Natural Number Game's worlds, and S2.L4, before "Base, step, and one trap" (inline by default; proof is novice-treated, spine §2.1). **Objective.** Choose the hypothesis a successor or cons case may use (GEN-proof-structure t3), order an informal induction that contains a circular step (GEN-proof-structure t2), judge the base case, the step and invariance for a small system (GEN-call-it t4), and produce a counterexample to a step (GEN-find-the-witness t1). Saying the base case and step without tactic names stays an uncredited explain-back, as in S2.L1 and S2.L4. **KCs.** Teaches KC-2.induction-principle (first taught in S2.L1); previews KC-2.generalized-ih (S2.L7), KC-3.step-invariant (S3.L6) and KC-4.invariant-vs-inductive (S4.L4). **Misconceptions.** dp:G7, dp:G8, dp:G9, dp:L5, dp:L6.

**Body** (7–9 min)

**A · Dominoes, precisely** (1.5 min). To prove P(n) for every natural number n, prove P(0), then prove P(d) → P(d + 1) for an arbitrary d. Together they cover every n. For lists: P([]) and P(xs) → P(x :: xs).

**B · What the step may assume** (1.5 min). The step assumes P(d), the induction hypothesis, and proves P(d + 1). Assuming P(d + 1) is circular (dp:L6). Lean rejects a proof that applies its own statement to the same argument, because nothing shrinks: S2.L4's circular variant fails to show termination {{run:RUN-lean-s2-cells}}.

**C · Cases are not induction** (1 min). Checking P(0) through P(1000) shows those cases and no others (dp:G7, dp:G8). `decide` can check finitely many cases, which is a bounded claim, not the theorem for every n.

**D · Induction over steps: invariants** (1.5 min). For a system with Init and Step: if Init ⇒ Inv (the base) and Inv ∧ Step ⇒ Inv′ (the step), then Inv holds in every reachable state, by induction on the number of steps. Example: the guarded transfer keeps both balances at zero or above. Base: the initial balances are at zero or above; step: `amt ≤ a` gives `a − amt ≥ 0`, and `amt > 0` keeps `b + amt ≥ 0`.

**E · Invariant is not inductive** (1.5 min). A counter starts at 0 and adds 2 at each step. "x ≠ 1" holds in every reachable state (0, 2, 4, …), yet it fails the step check: from x = −1, which satisfies x ≠ 1, one step reaches 1. The state −1 is unreachable, so "x ≠ 1" is invariant but not inductive. Strengthen it to "x is even", which is inductive and implies x ≠ 1. S4.L4 sorts four invariants into this 2×2, and S4.L6 decides whether a satisfiable step is a counterexample to induction or a reachable bug (dp:G9; M-cti-workbench).

**F · Generalize first** (0.5 min). When the statement mentions a state that changes at every step, the hypothesis must hold for every starting state: `run_conserves` is proved by list induction `generalizing s` [X RUN-lean-ledger]; without it the step is unprovable (SP-2.3 {{run:RUN-lean-ih-ungeneralised}}). S2.L7 teaches this.

**G · Rust card** (0.5 min). A `debug_assert!` at the top of a loop checks the invariant on the states the loop visits. Where it breaks: the inductive step covers every state that satisfies the invariant, reachable or not, which is why "x ≠ 1" fails the step check yet never fires in any run.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first; from W2-T11) | GEN-proof-structure t3 (needed hypothesis), probe | the fact that closes the successor or cons case of a generated goal from S2.L1's `Nat`-recursion bank | goals from build-time elaboration; the key by hypothesis deletion in CI | the goal itself (dp:L6); the base-case fact (dp:L6); the statement for every n (dp:L6) | KC-2.induction-principle |
| 2 (from W2-T11) | GEN-proof-structure t2 (Proof Blocks, one or two distractors), probe | an ordered informal induction, each block an informal step with its Lean line | graded as a dependency DAG; orderable by keyboard (GATE-a11y) | a circular appeal to the theorem (dp:L6); "the base case is not needed" (dp:L6); induction on the wrong variable (dp:L5) | KC-2.induction-principle |
| 3 (try first until W2-T11) | GEN-call-it t4 (five statements), probe | true or false for "P holds initially", "every step from a state satisfying P keeps P", "P holds in every reachable state", "the first 10 steps show P forever" and "a property true in every reachable state passes the step check", on a seeded counter or ledger | Z3 at grade time for the base and the step; invariance keyed by a generator-supplied strengthening I that Z3 verifies (Init ⇒ I, I ∧ Step ⇒ I′, I ⇒ P), or refuted by a replayed trace of at most k steps, k printed (I10); invariant-but-not-inductive seeds drawn in a seeded share | "the first 10 steps show P forever" judged true (dp:G7); the reachable-implies-step statement judged true on a non-inductive seed (dp:G9) | KC-2.induction-principle; KC-4.invariant-vs-inductive (preview) |
| 4 | GEN-find-the-witness t1 (model), probe | for a seeded property that fails the step check, a state satisfying it and one step to a state that violates it, then which obligation failed (base or step) | the pair replays (Z3; INS-pocket); the obligation is the generator's construction | wrong-attempt class: "no counterexample exists, because the property never fails in a run" (dp:G9) | KC-2.induction-principle; KC-4.invariant-vs-inductive (preview) |

**Placement and test-out.** The walk does not probe KC-2.induction-principle: it requires KC-2.proof-reading, which S2.L0 teaches, so it waits for S2's test-out (§6.6), where fresh items can show it. The "From kernelspace" placement never pre-credits it (V2-20; §5.7). D-05 opens summary first when the KC is tested out, or item 1 (item 3 before W2-T11) and one further fresh item on the same KC are both answered right.

**Runs.** Executed: RUN-lean-ledger. To record: RUN-lean-ih-ungeneralised and RUN-lean-s2-cells (W2-T10).

### D-06 · The anatomy of a guarantee: the six fields

**Opens at.** S1.L3, where CL-1.1 is minted (inline for every learner the first time: the card is this course's own format, so nobody arrives knowing it); LAB-1.6, the README and two cards (link); S2.L10 (link: the requirement row against kernel acceptance, S02); LAB-4.8 and LAB-10.8 (link: claim cards and the report, S04, S10). **Objective.** Place a fact about a claim in its strip segment (GEN-which-stamp t3), complete a stamp's qualifier (GEN-which-stamp t2), produce the "if weakened" witness for a named assumption (GEN-find-the-witness t1) and judge what a claim covers (GEN-call-it t4). **KCs.** Teaches KC-1.claim-anatomy, first taught in S1.L3. Its items also carry KC-1.three-answers (S1.L2), KC-1.violation-as-sat and KC-1.non-vacuity-check, all taught by S1.L3, and preview KC-1.encoding-is-the-claim (S1.L5) and KC-2.kernel-not-requirement (S2.L10). **Misconceptions.** dp:G4, dp:G6, dp:G8, dp:L3, dp:L4, dp:X1, dp:Z4; dp:X9 (proposed by S10).

**Body** (6–8 min)

**A · Rule 3** (0.5 min). The roadmap: "Explain every guarantee as: proposition, assumptions, model, checking method, implementation correspondence, and counterexample when an assumption is weakened."

**B · Your first card, field by field** (3 min). CL-1.1, as S1.L3 mints it from your results (S01 §5):

| Field | CL-1.1 | Why the field exists |
|---|---|---|
| Proposition | ∀ a, b, amount ∈ ℤ. a ≥ 0 ∧ b ≥ 0 ∧ amount > 0 ∧ amount ≤ a → a − amount ≥ 0 | exactly what was checked, no more |
| Assumptions | balances are unbounded integers [A] (SEAM-1, dashed); the solver is sound [A] (SEAM-7, dashed) | what the result rests on; seams are planted on purpose, and some erode later |
| Model | one step over Z3 `Int`; the statement file `claims/cl-1-1.smt2`, hashed on the receipt | the encoding is the claim (S1.L5) |
| Method | violation query `unsat` [X RUN-z3-starter]; premise query `sat` {{run:RUN-z3-vacuous-unsat}}; PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N | which checker, which version, which bound (I10), and the premise witness (D-02) |
| Correspondence | no code named yet: [A] "the code computes a − amount without overflow"; open defeater "encoding unverified" | which code the model stands for; usually the weakest link |
| If weakened | drop the guard → `sat` at `[b = 0, amount = 1, a = 0]` [X RUN-z3-starter] | shows that the assumptions carry weight; claim@1 validation checks that the witness refutes the claim's own proposition (GATE-claims) |

Below the six fields sits the requirement row: "no transfer leaves the paying account below zero" [A], with the recipient NOT COVERED [N].

**C · The strip** (1.5 min). A claim renders as three segments: proposition-of-model (what the checker established about the model), correspondence (whether the model matches the code) and requirement-fit (whether the proposition is what you wanted). Requirement-fit is never [P] (GATE-stamps). Ask who wrote the statement, the landscape digest's reading move: an agent may draft a claim, but its assertions render as quoted UNREVIEWED text and are never stamped (I8).

**D · Claims are not evidence** (1 min). A claim records what an artifact establishes, and agents may produce one, so claims never move "signed off" (spine §8.1). Unassisted, checker-graded work on unseen seeds does: your items, probes and the Defence.

**E · Rust card** (0.5 min). An `unsafe fn`'s `# Safety` section lists what callers must guarantee; a claim card is that section made complete. Where it breaks: nothing checks a `# Safety` comment, while `statespace check` validates every field of a card against its receipt.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-which-stamp t3 (which strip segment), probe | the segment a seeded fact supports, for facts such as "Z3 5.3.1 returns `unsat` on the violation query" [X RUN-z3-starter], "the code stores balances as 64-bit integers", "the product owner wants the recipient protected" or "200 unit tests pass on the Rust function" | the scenario's construction and the verdict → stamp table | a solver result placed under requirement-fit (dp:L3); "proved, so it is what we wanted" (dp:G8); a test of the code placed under proposition-of-model (dp:X1); an encoding fact placed under proposition-of-model (dp:Z4) | KC-1.claim-anatomy, KC-1.three-answers; KC-1.encoding-is-the-claim, KC-2.kernel-not-requirement (previews) |
| 2 | GEN-which-stamp t2 (complete the qualifier), probe | the missing parts of a qualifier for a seeded raw line (solver, version, verdict, `rlimit`; or a test count) | spine §8.7's required qualifiers and §8.8's table | "uncertified" dropped (dp:G8); the `rlimit` or n left out, so the result cannot be re-run (dp:X9) | KC-1.claim-anatomy, KC-1.three-answers |
| 3 | GEN-find-the-witness t1 (model), probe: the "if weakened" witness | for a seeded claim with one assumption struck (the guard, `amount > 0`, distinct accounts under a map encoding), a witness that refutes the claim's own proposition | the witness replays (INS-pocket; Z3) and must satisfy every remaining premise while violating the conclusion, claim@1's rule | wrong-attempt classes: a witness that violates a premise (dp:G4); a witness that violates some other property (dp:G6) | KC-1.claim-anatomy, KC-1.violation-as-sat, KC-1.non-vacuity-check |
| 4 | GEN-call-it t4 (five statements), probe | true or false for what a seeded S1 claim establishes | the scenario's construction and recorded runs [X RUN-z3-starter, RUN-z3-bv64] | "it covers the recipient" (dp:L4); "it covers 64-bit code" (dp:Z4); "the requirement row is PROVED" (dp:L3) | KC-1.claim-anatomy, KC-1.non-vacuity-check; KC-1.encoding-is-the-claim (preview) |

**Placement and test-out.** The walk leaves KC-1.claim-anatomy out (§5.3): the card is this course's own format, so nobody arrives knowing it. S1's test-out (§6.6) still offers it on fresh items. D-06 opens summary first once LAB-1.c6 passes (both cards valid under claim@1), or item 1 and one further fresh item on the same KC are both answered right.

**Runs.** Executed: RUN-z3-starter, RUN-z3-bv64. To record: RUN-z3-vacuous-unsat (W1-T12).

---

## 3. The other just-in-time drawers, D-07–D-23

Tool, notation and sibling cards for S2–S9. Each is shorter than a ground drawer, but carries the same fields.

### D-07 · The Lean error museum

**Opens at.** S2.L3, S2.L6, S2.L7 and S2.L9 (link, S02) and LAB-3.c4–c5's R1 rungs (link, S03); beside any recorded output or imported receipt line that matches an exhibit, a link to that exhibit (spine: S2). A miss signal on dp:L9 opens it inline. **Objective.** For a recorded Lean message, judge what it means and pick a first move (GEN-call-it t1, t4), read the goal it leaves (GEN-proof-structure t1), and stamp an axiom list (GEN-which-stamp t1). **KCs.** Teaches KC-2.goal-state-reading (S2.L3), KC-2.automation-scope (S2.L6) and KC-2.axioms-and-trust (threshold, S2.L9); previews KC-2.statement-pinning (S2.L10). **Misconceptions.** dp:G8, dp:L1, dp:L2, dp:L4, dp:L8; dp:L9 (proposed by S02).

**Body** (6–10 min; a reference page whose first eight exhibits form the summary). Each exhibit follows kernelspace's Error Museum (wave-2 spec §15.6): the message as recorded, what it means and its usual cause, a first move, the tempting wrong move and why not, and the lesson that teaches it, with "practice this", which serves the items below on that exhibit.

| # | Message, as recorded | Meaning and usual cause | First move | Tempting wrong move, and why not | Taught in |
|---|---|---|---|---|---|
| 1 | `unsolved goals`, with the goal printed {{run:RUN-lean-ih-ungeneralised}} | the script ended with goals left; often a hypothesis too weak because it was not generalized, or a branch a case split left | read the remaining goal; ask which hypothesis would close it | `sorry` "to see the rest": the build passes with exit code 0 [X RUN-lean-axioms], but the claim then reads "PROVED modulo 1 assumed lemma" (spine §8.8) | S2.L7 |
| 2 | `omega` reports a possible counterexample {{run:RUN-lean-noguard}} | values satisfy the hypotheses and violate the goal in linear arithmetic: a hypothesis is missing (often the guard), or the goal is false | check the values against your statement | switch to `grind`: in manual mode the step is flagged automated, `grind` adds `Classical.choice` to the axioms [X RUN-lean-axioms], and a false goal stays false | S2.L6 |
| 3 | a termination failure on a circular appeal {{run:RUN-lean-s2-cells}} | the proof applies the theorem to the same argument, so nothing shrinks | use the hypothesis for the smaller case | assume termination away: the circularity remains, now hidden | S2.L4 |
| 4 | an unknown identifier under `autoImplicit false` {{run:RUN-lean-s2-cells}} | a name is not in scope: a typo or a missing binder | declare the variable or fix the name | turn `autoImplicit` on: Lean then binds the typo as a new variable and the statement changes silently, which is why templates set it off (landscape digest §2, Stage 3) | S2.L2 |
| 5 | `ℤ` not recognized {{run:RUN-lean-s2-cells}} | `ℤ` is Mathlib notation; core Lean writes `Int` | write `Int` | add Mathlib: a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib], and the course needs none | S2.L2 |
| 6 | the warning ``declaration uses `sorry` ``, with exit code 0 [X RUN-lean-axioms] | the file built with a hole in it | find each `sorry`; `#print axioms` lists `sorryAx` | read exit 0 as "proved" (dp:L9) | S2.L9 |
| 7 | `lake check`: `Axiom 'sorryAx' is not permitted; it is used by 'with_sorry'`, then `Lean default kernel accepts the solution` [X RUN-lean-axioms] | two verdicts: the kernel accepted the terms, and the axiom policy rejected them | read both lines; the receipt keeps both | trust the kernel line alone (dp:L9) | S2.L9 |
| 8 | comparator: `Challenge and solution theorem statement do not match: 'transfer_conserves'`, or `Const does not match between challenge and target 'transfer'` [X RUN-lean-comparator] | your statement, or a definition it uses, differs from the pinned challenge | restore the pinned statement and prove that | edit the challenge: its hash changes and the claim voids to [?] (I7) | S2.L10 |
| 9 | `Expected type must not contain free variables`, with a hint to use `+revert` [X RUN-lean-comparator] | a decision tactic was given a goal that still has free variables | revert or generalize them, or split into cases | reach for `native_decide`: it adds a `_native` axiom and with it the compiler to the trusted base [X RUN-lean-axioms], and still needs a closed goal | S2.L9 |
| 10 | comparator exits 2 without bubblewrap, and exits 1 when bubblewrap cannot start under default Docker [X RUN-lean-bwrap-docker] | the check did not run: the sandbox failed, not your proof | read the verdict lines; use the devcontainer (D-15) | read exit 1 as a rejection (dp:L9) | S2.L10 |
| 11 | a proof of `False` built under `debug.skipKernelTC`: a clean build, "does not depend on any axioms", and kernel replay reporting `(kernel) declaration type mismatch` [X RUN-lean-skipkernel] | the elaborator was told to skip the kernel | let kernel replay decide | trust the build and the axiom list (dp:L9) | S2.L9 |
| 12 | linter warnings: a proposition declared with `def`, deprecations, unused variables, unused `simp` arguments {{run:RUN-lean-s2-cells}} | style and maintenance warnings; the build passes | follow the suggestion (`theorem` for a proof) | treat a warning as a failed proof (dp:L1) | S2.L2 |

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1, probe | for a seeded raw output (exit code and verdict lines from the exhibits' runs): "accepted", "rejected" or "no verdict: the check did not run" | recorded outputs [X RUN-lean-axioms, RUN-lean-comparator, RUN-lean-bwrap-docker] | exit 0 beside a `sorry` warning judged accepted (dp:L9); exit 1 from a sandbox that could not start judged rejected (dp:L9); "Your solution is okay!" judged rejected because `Classical.choice` is listed (dp:L8) | KC-2.axioms-and-trust; KC-2.statement-pinning (preview) |
| 2 (from W2-T11) | GEN-proof-structure t1 (next goal), probe | the goal an exhibit's tactic leaves (exhibits 1–3) | goals from build-time elaboration | "no goals" (dp:L2); the goal without its case hypothesis (dp:L1) | KC-2.goal-state-reading |
| 3 | GEN-which-stamp t1, probe | the stamp for a seeded `#print axioms` line and verdict, such as `[propext, Classical.choice, Quot.sound]` [X RUN-lean-axioms] | spine §8.8: standard axioms → [P] · Lean 4.35.0 kernel · axioms listed [X RUN-lean-ledger]; `sorryAx` → no [P], "PROVED modulo k assumed lemmas"; a `_native` axiom → [P] · kernel + compiler | `Classical.choice` judged unsound (dp:L8); "does not depend on any axioms" from a build that skipped the kernel judged proved (dp:G8); `sorryAx` judged harmless because the build passed (dp:L9) | KC-2.axioms-and-trust, KC-2.automation-scope |
| 4 | GEN-call-it t4 (five statements), probe | true or false for statements about what an exhibit's message means | recorded outputs and the exhibit table | "switching to `grind` can make a false goal true" (dp:L2); "an unused-variable warning blocks the build" (dp:L1); "a statement mismatch means the theorem is false" (dp:L4) | KC-2.automation-scope, KC-2.goal-state-reading |

**Placement and test-out.** Not probed by the walk; S2's test-out covers its KCs (§6.6). A reference page opens on its summary once the KCs it teaches are tested out.

**Runs.** Executed: RUN-lean-axioms, RUN-lean-comparator, RUN-lean-bwrap-docker, RUN-lean-skipkernel, RUN-lean-mathlib, RUN-lean-ledger. To record: RUN-lean-ih-ungeneralised, RUN-lean-noguard and RUN-lean-s2-cells (W2-T10).

### D-08 · The Natural Number Game, pinned fallback

**Opens at.** S2.L1 (link, beside the game's link-out). The site cannot tell whether a third-party page loaded, so the drawer is always linked rather than inferred. **Objective.** Reach induction practice by one of three routes, then choose the hypothesis a successor case needs (GEN-proof-structure t3), predict the goals `induction` leaves (GEN-proof-structure t1) and predict whether computation alone closes a goal (GEN-call-it t1). **KCs.** Teaches KC-2.induction-principle (S2.L1); previews KC-2.goal-state-reading (S2.L3). **Misconceptions.** dp:L1, dp:L2, dp:L4, dp:L6.

**Body** (5–7 min)

**A · What the game is** (1.5 min). The Natural Number Game is a disclosed, uncredited link-out (OD-4). It runs its own Lean version, so a few tactics behave differently from the Bench, and progress stays in the game: the course credits nothing done there (S2.L1's copy). S2.L1 asks for four worlds: Tutorial, Addition, Multiplication and Implication (read 2026-10-23 [V] by S02 from the game's `Game.lean`).

**B · When it does not load** (0.5 min). Its host did not always answer while the course was planned (landscape digest §2, Stage 2; A4-05), hence this drawer.

**C · Three fallbacks** (2 min). (1) The community's in-browser port at lean.cau.li/game, also a disclosed, uncredited link-out; it is a large download, and the card shows its size, [X RUN-lean-wasm]; nothing asks first (OD-6). (2) The game from its repository at a pinned commit, built in the devcontainer (D-15); it brings its own Lean toolchain. (3) Original induction warm-ups in the LAB-2 template, on the course's Lean 4.35.0 [X RUN-lean-ledger]: k deposits of 2, doubling, one fee per step, from S2.L1's bank {{run:RUN-lean-s2-cells}}.

**D · What to carry back** (1 min). The base case and the step; the hypothesis the step may use (D-05 §B); and the habit of predicting each goal before you run a tactic (S2.L3).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first; from W2-T11) | GEN-proof-structure t3 (needed hypothesis), probe | the fact that closes the successor case of a bank lemma | build-time elaboration; the key by hypothesis deletion in CI | the goal itself (dp:L6); the base-case fact (dp:L6); an unrelated lemma (dp:L4) | KC-2.induction-principle |
| 2 (from W2-T11) | GEN-proof-structure t1 (next goal), probe | the goals left by `induction n` on a bank lemma | build-time elaboration | one goal instead of two (dp:L1); the successor goal without its hypothesis (dp:L6) | KC-2.induction-principle; KC-2.goal-state-reading (preview) |
| 3 (try first until W2-T11) | GEN-call-it t1 (three-way verdict), probe | whether `rfl` closes a seeded goal: "closes", "fails" or "does not elaborate" | recorded outputs from build-time elaboration | "closes" on a goal over a variable n, which computation alone cannot unfold (dp:L2); "does not elaborate" for a well-typed goal (dp:L1) | KC-2.induction-principle |

**Placement and test-out.** As D-05: S2's test-out, never a kernelspace pre-credit (V2-20).

**Runs.** Executed: RUN-lean-ledger, RUN-lean-wasm. To record: RUN-lean-s2-cells (W2-T10).

### D-09 · PlusCal beside its TLA+ translation

**Opens at.** S5.L2, where the learner writes M1 with its PlusCal form beside it (inline by default: temporal notation is novice-treated, spine §2.1); S8.L2 (link, for PlusCal beside the outbox spec, S08). **Objective.** Map PlusCal labels to TLA+ actions; predict which actions are enabled and how long the shortest violation is, in actions (GEN-trace-allowed t2; GEN-call-it t2); predict which TLC message comes first under given flags (GEN-call-it t1). **KCs.** Teaches KC-5.tlc-flags-matter (S5.L2); previews KC-5.interleaving-granularity (S5.L3); KC-5.behaviors-stuttering (S5.L1) returns as a spiral. **Misconceptions.** dp:C1, dp:C2, dp:T5, dp:T6; dp:T9, dp:T16 (proposed by S05).

**Body** (6–8 min)

**A · One label, one atomic step** (1.5 min). Code between two labels runs as one TLA+ action; the translator adds a program counter and one action per label. More labels mean finer steps and more interleavings.

**B · M1 both ways** (1.5 min). M1's worker has a read label and a write label, so two actions per worker; merging them under one label makes the critical step atomic, which is S5.L3's fix. The course's own translation of M1 and its default-flags verdict are {{run:RUN-pcal-doublespend}}.

**C · Finishing and deadlock** (1.5 min). For hand-written TLA+, default flags make TLC report "Deadlock reached" when no action of Next is enabled; on DoubleSpend that message comes before the invariant violation, and with `-deadlock` TLC reports `Invariant NoOverspend is violated` instead [X RUN-tlc-doublespend]. TLC's help says of `-deadlock`: "if specified DO NOT CHECK FOR DEADLOCK" (`research/evidence/a2r3/out/tlc-help-tla180.txt` [X RUN-tlc-help]). The PlusCal translator adds a terminating step when every process is done, so finishing is not reported as a deadlock (Learn TLA+, Core › Concurrency; read 2026-10-23 [V] by S05). That is why SP-5.2 belongs to hand-written specs.

**D · Reading a TLC trace** (1 min). A trace lists states; each step between two states is one action. The DoubleSpend counterexample has 5 states and 4 actions: Read(w1), Read(w2), Write(w1), Write(w2) [X RUN-tlc-doublespend]. Count length in actions, and say which unit you used (dp:T6).

**E · Why the course runs TLA+** (0.5 min). Spectacle reads TLA+ only, so PlusCal is translated at build time (spine §9.1). PlusCal's fairness keywords become fairness conjuncts in the translation [U]; S5.L7 writes fairness in TLA+ directly.

**F · Rust card** (0.5 min). A label is like the span between two `.await` points on a single-threaded executor: inside it nothing else of yours runs, and at each label another task may. Where it breaks: an executor picks one schedule; TLC explores every schedule the spec allows.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1 (three-way verdict), probe | which comes first for a seeded spec and flag set: "invariant violated", "deadlock reached" or "no error" | the adapter's search over Spectacle's successors at grade time, with its own deadlock check, whose verdict on which comes first matched TLC's on M1 and on its PlusCal translation with the check on (Spectacle's own checker has no deadlock check), gated by GATE-conformance [X RUN-spectacle-s5s8]; TLC outcomes recorded in CI per seed for a spec outside Spectacle's scope | "deadlock reached" read as two workers waiting on a lock, or `-deadlock` read as turning the check on (dp:T9); "no error, because TLC finished" (dp:T5) | KC-5.tlc-flags-matter |
| 2 | GEN-trace-allowed t2 (enabled actions), probe | the actions enabled in a given state of a seeded PlusCal fragment's translation | the TLC state graph | both labels of one process enabled at once (dp:T16); "a lock serializes the whole function" (dp:C2) | KC-5.behaviors-stuttering; KC-5.interleaving-granularity (preview) |
| 3 | GEN-call-it t2 (trace length as an interval), probe | the shortest violation of a seeded M1 variant, with labels split or merged, as an interval in actions | Spectacle's breadth-first search at grade time (Spectacle = TLC at one worker, GATE-conformance) | states counted as steps (dp:T6); "the writes need no reads first" (dp:C1) | KC-5.tlc-flags-matter |
| 4 | GEN-call-it t4 (five statements), probe | true or false for statements about labels, atomicity and flags | the scenario's construction and recorded runs [X RUN-tlc-doublespend] | "adding a label never changes the reachable states" (dp:C1); "`-deadlock` turns deadlock checking on" (dp:T9); "a trace of 5 states has 5 steps" (dp:T6) | KC-5.tlc-flags-matter; KC-5.interleaving-granularity (preview) |

**Placement and test-out.** S5's test-out (§6.6); never pre-credited from kernelspace, which never credits TLA+ (V2-20).

**Runs.** Executed: RUN-tlc-doublespend, RUN-tlc-help, RUN-spectacle-s5s8. To record: RUN-pcal-doublespend (W3-T07).

### D-10 · Reading PLF's Rocq notation

**Opens at.** S4.L1's reading pointer and S4.L3 (link, S04); S7 (link, for *Security Foundations*, also written in Rocq; S07 SI-15). PLF is optional reading, and the course installs no Rocq. **Objective.** Translate PLF's triples, substitutions and assertion implications into the course's notation (GEN-call-it t4), judge a PLF-style triple valid, invalid or valid only as partial correctness (GEN-call-it t1), and write the weakest precondition of an assignment given in PLF's notation (GEN-wp-it t1). **KCs.** Teaches KC-4.hoare-triple (S4.L1) and, from S4.L3, KC-4.wp-assignment (threshold; first taught in S4.L2). **Misconceptions.** dp:G3, dp:O4, dp:O5.

**Body** (5–7 min)

**A · Why a drawer** (0.5 min). PLF's Hoare chapters are the roadmap's Stage 4 reading. They are written in Rocq, which the course does not install; S04 names the edition it read.

**B · The notation, side by side** (3 min). Every PLF form below is marked [U] until W3-T03 checks it against that edition.

| PLF writes [U] | Meaning | The course writes |
|---|---|---|
| `{{P}} c {{Q}}` | from any state satisfying P, if c terminates, it ends in a state satisfying Q | `{P} c {Q}` (S4.L1) |
| `X := a`, inside `<{ … }>` | assignment | `x := e` |
| `Q [X \|-> a]` | Q with a in place of X: a substitution, not a state | `Q[e/x]`, so `wp(x := e, Q) = Q[e/x]` (S4.L2) |
| `P ->> Q` | every state satisfying P satisfies Q | P ⇒ Q, a consequence step on the Derivation Board |
| `(X !-> v ; st)` | the state st with X updated to v | `upd(st, x, v)` (D-04 §D) |
| `hoare_asgn`, `hoare_seq`, `hoare_if`, `hoare_consequence_pre` | proof-rule names | the Derivation Board's step kinds: assignment, sequence, conditional, consequence |

The two substitution notations run in opposite directions on the page: read `[X |-> a]` as "X replaced by a" and `Q[e/x]` as "e in place of x" (dp:O4).

**C · Partial and total** (1 min). PLF's triples are partial: a command that never terminates satisfies every triple. Total correctness adds termination, which S4.L1 checks on a fueled loop (dp:O5).

**D · How to read a PLF proof** (1 min). A decorated program lists assertions between commands; each line's obligation is what the Derivation Board checks as one Z3 validity query (S4.L2). Read the decorations; skip the Rocq tactic scripts.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t4 (five statements), probe | true or false for readings of PLF notation | the §B table, once W3-T03 confirms it | "`Q [X \|-> a]` puts X in place of a" (dp:O4); "a PLF triple says c terminates" (dp:O5); "`P ->> Q` says P and Q are equivalent" (dp:G3) | KC-4.hoare-triple |
| 2 | GEN-call-it t1 (three-way verdict), probe | for a seeded triple in PLF notation: "valid", "invalid" or "valid only as partial correctness" | Z3 validity of the translated obligation at grade time for loop-free commands; non-terminating commands drawn in a seeded share and keyed by construction | "invalid" for a non-terminating command under a partial triple (dp:O5); "valid" when the precondition comes from a reversed substitution (dp:O4) | KC-4.hoare-triple |
| 3 (from W3-T02) | GEN-wp-it t1 (assignment), in the learner's mode | the weakest precondition of an assignment written in PLF notation, in the course's notation | Z3 equivalence with the reference | the substitution reversed (dp:O4); a captured variable (dp:O4) | KC-4.wp-assignment |

**Placement and test-out.** S4's test-out (§6.6). At S7 the drawer is a link only.

**Runs.** None: the keys are computed by Z3 at grade time, and no tool number appears.

### D-11 · MVCC in one page (tablespace T4 prerequisite card)

**Opens at.** S6.L5 through S6.L7 (link: Postgres practice is expert-treated), and on S6.L5's test-out card, which S06 proposes to move to S6.L6's opening (S06 §14 issue 10). It is the self-contained prerequisite card for the tablespace T4 bridge (M-sibling-bridge; V2-31). **Objective.** For a compilation pattern and an isolation level, predict what a two-transaction history does (GEN-call-it t3); classify recorded PostgreSQL 18.6 histories by anomaly [X RUN-pg-anomalies] (GEN-anomaly-id t1, t2, t4); judge what retries promise (GEN-call-it t4). **KCs.** Teaches KC-6.compilation-pattern and KC-6.anomaly-isolation (threshold), first taught in S6.L6, and KC-6.serializable-retries (S6.L7); when opened at S6.L5 all three are previews. **Misconceptions.** dp:C1, dp:Q4, dp:Q5, dp:Q7; dp:Q11, dp:Q12 (proposed by S06).

**Body** (6–8 min)

**A · Versions and snapshots** (1.5 min). An UPDATE writes a new version of a row, and a transaction reads the versions its snapshot makes visible. At READ COMMITTED each statement takes a fresh snapshot; at REPEATABLE READ and SERIALIZABLE the whole transaction reads one snapshot (PostgreSQL 18 documentation, "Transaction Isolation", against which the landscape digest matched each executed row [V]). T4 teaches the visibility rules themselves.

**B · What PostgreSQL did on the course's histories** (2.5 min).

| Pattern | READ COMMITTED | REPEATABLE READ | SERIALIZABLE |
|---|---|---|---|
| application read-modify-write: two debits of 80 from 100, each writing a balance computed from its own read | both commit; 160 spent from 100 [X RUN-pg-anomalies] | the second writer gets 40001 [X RUN-pg-anomalies] | the second writer gets 40001, row H01 [X RUN-pg-catalog] |
| conditional UPDATE `… WHERE bal >= 80` | the second re-evaluates its WHERE clause, updates 0 rows and loses nothing [X RUN-pg-anomalies] | the second writer waits, then gets 40001 [X RUN-pg-claims] | the second writer waits, then gets 40001 [X RUN-pg-claims] |
| predicate read, then insert, over holds | commits: 160 held against 100 [X RUN-pg-claims] | commits: 160 held against 100 [X RUN-pg-claims] | 40001 [X RUN-pg-claims] |
| write skew: each checks a team total, then debits a different account | both commit; the team total ends at −100, row H05 [X RUN-pg-catalog] | both commit; the team total ends at −100 [X RUN-pg-anomalies] | one gets 40001; the total ends at 50 [X RUN-pg-anomalies] |

Two transfers that lock the same rows in opposite order end with one transaction getting 40P01 [X RUN-pg-claims].

**C · SERIALIZABLE and retries** (1.5 min). SERIALIZABLE aborts one transaction of a dangerous pattern with 40001 [X RUN-pg-anomalies]. The application retries the whole command, never the failed statement alone (S6.L7; dp:Q12), and that retries terminate is an assumption, stamped ASSUMED [A] (CL-6.5). The guarantee covers committed SERIALIZABLE transactions only, so one writer at a weaker level voids it (SEAM-14; SP-6.10 {{run:RUN-pg-mixed-levels}}).

**D · The pattern decides** (1 min). The same transfer, compiled two ways, behaves differently at one level, so specimens name their compilation pattern, never the level alone (spine §3.6). An anomaly is an interleaving the level permits, not a timing accident (dp:Q11): `statespace isorun` reproduces each one by detecting lock waits, never by sleeping (spine §9.6).

**E · What T4 adds** (0.5 min). Version visibility, vacuum and contention, which this course does not re-teach (M-sibling-bridge). A T4 completion counts as test-out evidence for anomaly basics (§5.7).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t3 (which anomaly), probe | for a seeded pattern and level: lost update, write skew, 40001, 40P01 or none | the recorded PostgreSQL 18.6 outcome for that cell, replayed by INS-history [X RUN-pg-anomalies, RUN-pg-claims, RUN-pg-catalog] | "lost update" for the conditional UPDATE at READ COMMITTED (dp:Q4); "none" for write skew at REPEATABLE READ (dp:Q5); "it depends on timing" (dp:Q11) | KC-6.compilation-pattern, KC-6.anomaly-isolation |
| 2 | GEN-anomaly-id t1 or t2 (read-modify-write, write skew), probe | the class of a recorded two-session history | the history checker on Bench-recorded PostgreSQL 18.6 histories [X RUN-pg-anomalies, RUN-pg-claims] | lost update read as write skew and back (dp:Q5); "each transaction saw the other's write" (dp:C1) | KC-6.anomaly-isolation |
| 3 | GEN-anomaly-id t4 (serialization failure or deadlock), probe | the SQLSTATE a recorded history ends with, and what it means | the recorded history [X RUN-pg-anomalies, RUN-pg-claims] | "40001 means the application has a bug" (dp:Q12); "40P01 is a slow query" (dp:Q11) | KC-6.anomaly-isolation, KC-6.serializable-retries |
| 4 | GEN-call-it t4 (five statements), probe | true or false for statements about retries and isolation | recorded runs and spine §3.6 | "retry the statement that failed" (dp:Q12); "retries always terminate" (dp:Q7); "REPEATABLE READ prevents write skew" (dp:Q5) | KC-6.serializable-retries, KC-6.anomaly-isolation |

**Placement and test-out.** S6's test-out (§6.6). A tablespace T4 completion stands in for KC-6.anomaly-isolation's three items, confirmed by one fresh item after 7 days (§5.7); kernelspace evidence never credits isolation (V2-20).

**Runs.** Executed: RUN-pg-anomalies, RUN-pg-claims, RUN-pg-catalog. To record: RUN-pg-mixed-levels (W4-T10).

### D-12 · Durability and the write-ahead log in one page (tablespace T3 prerequisite card)

**Opens at.** S8.L3 (link), as the self-contained card for the tablespace T3 bridge (M-sibling-bridge). **Objective.** Judge what survives a crash at each point of a commit and of an outbox dispatch (GEN-call-it t4, t1), and place a crash that loses an intent kept only in memory (GEN-find-the-witness t2). **KCs.** Teaches KC-8.crash-windows and KC-8.at-least-once (threshold), both first taught in S8.L3; KC-8.commit-not-send (threshold, S8.L1) returns as a spiral. **Misconceptions.** dp:E1, dp:E3; dp:E5 (proposed by S08); dp:T13 (proposed by S05).

**Body** (6–8 min)

**A · Log first, flush later** (1.5 min). A database records each change in its write-ahead log before it changes data pages. A commit is durable once its log record reaches stable storage; data pages can be written later, and after a crash, recovery replays the log (tablespace T3; PostgreSQL 18 documentation, "Reliability and the Write-Ahead Log" [U]).

**B · What a crash leaves** (1.5 min). A crash before the commit record is flushed leaves the transaction as if it never ran; a crash after leaves it committed, whatever had reached the data pages. Durability rests on the disk honoring flush requests, an assumption T3 examines [A].

**C · One layer up** (2 min). Your outbox intent commits in the same transaction as the command, so it is durable exactly when the command is. The external effect is not in the database's log: a commit is not a send (KC-8.commit-not-send). A crash between commit and send, or between send and acknowledgement, leaves the intent pending, and recovery sends again: at-least-once (S8.L3's crash-window table, S08 §1.2).

**D · Memory does not survive** (1 min). Anything kept only in the worker's memory dies with it (dp:T13). S8.L1's no-outbox contrast keeps the intent in memory, so a crash can lose it.

**E · The harness enumerates crashes** (0.5 min). T3's labs stop the process at chosen points, and your spec injects a crash between every two steps; neither waits on timing (S08's bridge text).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t4 (five statements), probe | true or false for what survives a crash at a marked point of a seeded commit-and-dispatch sequence | the crash-window table and the seeded model's TLC state graph (INS-theater) | "the effect happened because the commit did" (dp:E5); "deduplication kept in memory survives the restart" (dp:T13); "the acknowledgement always arrives" (dp:E3) | KC-8.crash-windows, KC-8.commit-not-send |
| 2 | GEN-find-the-witness t2 (trace), crash-window family, probe | a crash placement and trace that loses an intent kept only in memory, or "none" for the outbox model | the trace replays on the TLC graph (INS-theater, INS-spectacle); "none" in a seeded 30–60% share | a trace claimed to lose a committed intent in the outbox model, where the intent is durable (dp:E5) | KC-8.crash-windows |
| 3 | GEN-call-it t1 (three-way verdict), probe | after a crash between commit and send, whether the effect happens "never", "once" or "possibly twice", on a seeded model | the seeded model's TLC state graph | "never: the crash lost it" (dp:E5); "once: the outbox gives exactly once" (dp:E1) | KC-8.crash-windows, KC-8.at-least-once |

**Placement and test-out.** S8's test-out (§6.6). A tablespace T3 completion credits nothing here, because T3's labs exercise the database's log, not your outbox (§5.7); it opens this card on its summary.

**Runs.** None: no tool number appears; keys come from TLC graphs at grade time.

### D-13 · SMT-LIB in one page

**Opens at.** S1.L2 and LAB-1.6 (link: raw verdict lines, and the `.smt2` statement files your receipt hashes, S01); S4.L5, encoding to SMT (inline by default); LAB-4.2 onward (link: your checker emits SMT-LIB, S04). **Objective.** Read a short SMT-LIB query and judge what each verdict line establishes (GEN-call-it t1, t4; GEN-which-stamp t1); from S4.L5, write an obligation in SMT-LIB with post-state constants and frame conditions (GEN-negate-it t2, write). **KCs.** Teaches KC-1.three-answers (threshold) and KC-1.unknown-fails-closed (S1.L2); from S4.L5, KC-4.frame-condition. **Misconceptions.** dp:G8, dp:O4, dp:Z1, dp:Z2; dp:G10 (proposed); dp:Z6 (proposed by S01).

**Body** (6–8 min)

**A · The shape** (2 min). The roadmap's starter, as SMT-LIB:

```smt2
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (and (>= a 0) (>= b 0) (> amount 0)))
(assert (< (- a amount) 0))   ; the negated property
(check-sat)
(get-model)
```

Through Z3Py the same query gave `sat [b = 0, amount = 1, a = 0]`, and with `amount <= a` added, `unsat` [X RUN-z3-starter]; the SMT-LIB text itself is recorded in {{run:RUN-z3-smtlib-tour}}. Declared constants are the query's free variables: `check-sat` asks whether some values satisfy every assertion (D-03 §D). Your `claims/*.smt2` statement files are text like this, hashed on the receipt as `sha256(text.trimRight() + "\n")` (receipt@1).

**B · Verdict lines** (2 min).

| Line | Means | Stamp (spine §8.8) |
|---|---|---|
| `sat`, then the model | some values satisfy every assertion: a witness, once it replays | REFUTED [R] after replay |
| `unsat` | no values do, in this encoding, if the solver is sound | PROVED [P] of the encoding · uncertified · rlimit N, with the open defeater "encoding unverified" |
| `unknown`, reason "incomplete (theory arithmetic)" | no verdict: `x**y == 8, y > 1` lies outside what Z3 decides, though x = 2, y = 3 solves it [X RUN-z3-unknown-pow] | UNKNOWN [?] · reason |
| `unknown`, reason "canceled" | no verdict: the budget ran out; `rlimit` 5000000 stopped a query in 1.1 s under Pyodide, in a Node harness [X RUN-z3-budget-pyodide] | UNKNOWN [?] · canceled at rlimit R; fails closed where it guards enforcement |

Budgets are `rlimit`, because a `timeout` set under Pyodide never returned [X RUN-z3-budget-pyodide] (SP-1.8). In SMT-LIB the budget is a solver option and the reason is a query, `(set-option :rlimit …)` and `(get-info :reason-unknown)` [U], both recorded with the page's examples in {{run:RUN-z3-smtlib-tour}}.

**C · A second solver** (1 min). The course re-runs authored `unsat`s on cvc5 at build time (GATE-calls). On the guarded query cvc5 also returned `unsat`, with an Alethe proof that contains a `hole` step [X RUN-cvc5-alethe]. Two solvers agreeing is diversity, not a checked proof, so "uncertified" stays (S1.L3). Solvers have bugs: on issue #11179's inputs, Z3 5.3.0 returned `unsat` on satisfiable inputs and 5.3.1 `unknown` [X RUN-z3-11179] (S4.L9; ER-7).

**D · Post-states and frames, from S4.L5** (1.5 min). Post-state constants carry the suffix `_p`, the obligation is one assertion, and each unchanged piece of state gets a named frame conjunct, `(! … :named frame_k)` (S04 §2.2's proposed contract). Drop a frame and an untouched account may change, which "proves" a false theorem (SP-4.1 {{run:RUN-z3-missing-frame}}).

**E · Rust card** (0.5 min). SMT-LIB is to Z3 roughly what LLVM IR is to rustc: the plain text every front end lowers to, worth reading when you need to see exactly what was asked. Where it breaks: SMT-LIB states constraints, not instructions, and nothing in it runs in order.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1, probe | Z3's verdict on a seeded short SMT-LIB query | Z3 at grade time; `sat` and `unsat` keys in seeded shares (`unknown` instances are discarded, §1.3) | the verdict the un-negated property would get (dp:Z1); `unknown` on a small linear query (dp:Z6) | KC-1.three-answers |
| 2 | GEN-which-stamp t1, probe | the stamp for a recorded raw line: `unsat` with its `rlimit`, `sat` with a model, `unknown` with "incomplete (theory arithmetic)", `unknown` with "canceled" | spine §8.8, on recorded lines [X RUN-z3-starter, RUN-z3-unknown-pow, RUN-z3-budget-pyodide] | [P] for `unknown (canceled)` (dp:Z2); [R] before the model replays (dp:Z1); [P] without "uncertified" (dp:G8) | KC-1.three-answers, KC-1.unknown-fails-closed |
| 3 | GEN-call-it t4 (five statements), probe | true or false for readings of a seeded SMT-LIB query and its output | the query's construction and Z3 at grade time | "declared constants are universally quantified" (dp:G10); "cvc5 agreeing makes the result certified" (dp:G8); "`unknown` means no counterexample exists" (dp:Z2) | KC-1.three-answers |
| 4 (from W3-T03) | GEN-negate-it t2 (two-state), write, in S04's vocabulary | the obligation `Inv ∧ Guard ∧ Step ∧ ¬Inv′` in SMT-LIB for a seeded command over at least three accounts | Z3 equivalence with the reference over the fixed vocabulary (S04 §2.2); a distinguishing state on failure | wrong-attempt classes: a missing frame conjunct (dp:O4); the invariant negated on the pre-state (dp:Z1) | KC-4.frame-condition |

**Placement and test-out.** The walk probes KC-1.three-answers (step 7) and KC-1.unknown-fails-closed (step 8). D-13 opens summary first when both are shown or tested out; at S4.L5 it opens inline unless KC-4.frame-condition is tested out.

**Runs.** Executed: RUN-z3-starter, RUN-z3-unknown-pow, RUN-z3-budget-pyodide, RUN-cvc5-alethe, RUN-z3-11179. To record: RUN-z3-missing-frame (W3-T07) and RUN-z3-smtlib-tour (W1-T12; §10, issue 16).

### D-14 · The Lane A wasm ABI

**Opens at.** The learner's first Lane A stage, inline: LAB-3.8 on the default path, LAB-8.4 on the builder's path (spine §3.0); then link at LAB-4.2 onward, LAB-6.2 onward, LAB-9.11 and LAB-10.2–LAB-10.3 (S04, S06, S09, S10). A learner who imported a kernelspace Evidence Pack sees the summary first, because the ABI is the family's own (§5.7). **Objective.** Build a lab crate to a zero-import wasm module, list its checks, run one check on a seed and read the per-check result (GEN-call-it t1, t4), then stamp a Lane A result (GEN-which-stamp t1). **KCs.** None of its own. Its items carry the correspondence KC of the lab that opened it: LAB-3, KC-3.goldens-as-theorems; LAB-4, KC-4.trust-stack; LAB-6, KC-6.differential-testing; LAB-8, KC-8.deterministic-simulation; LAB-9, KC-9.translation-validation; LAB-10, KC-10.agent-proposal-triage. Under §1.5 each counts only once taught. **Misconceptions.** dp:T5, dp:X1, dp:X3, dp:Z2; dp:L9 (proposed by S02).

**Body** (6–8 min)

**A · What runs where** (1.5 min). Your Rust compiles to a wasm module that imports nothing. The instrument origin runs each check in a fresh instance of your module (the worker is replaced only after a timeout), on seeds drawn at grade time and under a time limit, and the result's badge reads *re-checked here*. A reference module earns nothing and says so.

**B · The protocol** (2 min). The family's ABI is vendored from kernelspace at a pinned SHA (spine §11.1). In kernelspace's design (wave-1 spec §12.1) the module exports its memory, an ABI version, allocation functions and one run entry that reads text lines (`list`, `only <id>`, `seed <n>`) and returns JSON. `list` names the checks and runs no learner code; `only <id>` returns the check's id, label, pass flag, message and seed; after a trap the module reports the panic message; empty input runs every check on default seeds, so `cargo test` keeps working. W2-T08 fixes statespace's names and version [D].

**C · Lab-specific exports** (1 min). Each lab adds pure functions over JSON strings; for LAB-4, S04 proposes `wp_emit`, `vc_emit`, `model_decode`, `bmc_emit` and `verdict_compose` (S04 §2.2). One JSON IR, `IR@1`, exported from Lean by `lake exe`, links the labs (spine §9.3).

**D · What a pass means** (1.5 min). A pass on n seeds is TESTED [T] · n with the generator's statistics, never PROVED (spine §8.8), and the same seed gives the same result in every browser (I3). Each check ends one of three ways: pass; fail (a wrong result or a panic); or no verdict (the module did not load, its ABI version did not match, or the time limit ran out), which, like `unknown`, refutes nothing.

**E · Rust card** (0.5 min). It is `cargo test` with the harness on the far side of a wasm boundary: you write the library, the course writes the tests and draws their seeds. Where it breaks: you cannot see the seeds in advance, and your output reaches you only through each result's message.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1 (three-way verdict), probe | for a seeded reply (a pass, a wrong result, a panic, a timeout, or a check only listed): "pass", "fail" or "no verdict" | the reply's construction under §D's rules | a check that was only listed judged a pass (dp:L9); a timeout judged a pass (dp:Z2); a timeout judged a fail (dp:X3) | the opening lab's correspondence KC |
| 2 | GEN-call-it t4 (five statements), probe | true or false for statements about a Lane A result | the ABI rules and the lab's construction | "passing on n seeds shows the module is right for every input" (dp:X1); "a reference module's pass counts toward your check" (dp:L9); "a timed-out check has refuted your module" (dp:X3) | the opening lab's correspondence KC |
| 3 | GEN-which-stamp t1, probe | the stamp for a seeded Lane A summary, such as "agrees with the kernel-checked goldens on n fresh seeds" | spine §8.8 | [P] (dp:X1); [M] · bound, as if the seeds were exhaustive (dp:T5) | the opening lab's correspondence KC |

**Placement and test-out.** No KC of its own. D-14 opens summary first after the learner's first Lane A check passes, or after a kernelspace pack is imported.

**Runs.** None: no tool number appears.

### D-15 · The devcontainer and `statespace doctor`

**Opens at.** The learner's first Bench stage, inline: LAB-2.1 on the default path (S2.L0's "Build this" asks for the install), LAB-5.1 on the builder's path (S5.L2; S05 §12 issue 5); then link at LAB-6.1 (S06) and LAB-10.2–LAB-10.3 (S10). LAB-1 needs no devcontainer (spine §12 item 34). **Objective.** Open the devcontainer, run `statespace doctor` to green, and read the environment block a receipt records (GEN-call-it t1, t4; GEN-which-stamp t1). **KCs.** Previews KC-2.axioms-and-trust (threshold, S2.L9) and KC-2.statement-pinning (S2.L10); this drawer is the first contact with both. **Misconceptions.** dp:G8, dp:L4, dp:X3; dp:L9 (proposed by S02).

**Body** (5–7 min)

**A · One pinned environment** (1 min). The devcontainer pins Lean 4.35.0 [X RUN-lean-ledger], `tla2tools` 1.8.0 by SHA-256 with Java 21 [X RUN-tlc-jars], PostgreSQL 18.6 [X RUN-pg-anomalies], Z3 5.3.1 [X RUN-z3-starter], cvc5 and the Rust crates, with their binaries recorded in [X RUN-scaffold]. Each tool is met first in the tab; the container is for the labs.

**B · Sizes, before you start** (1 min). The Lean toolchain unpacks to 3.0 GB [X RUN-lean-toolchain]. The course uses no Mathlib; a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib]. A Codespaces prebuild is the zero-install route (W0-T05).

**C · `statespace doctor`** (1 min). It checks the pins and the sandbox and prints a receipt-ready environment block (spine §9.6) [X RUN-doctor-devcontainer]. Green means the environment matches the pins; it checks no proof, and a failed sandbox does not turn it red: that is recorded, never required (§D).

**D · The sandbox** (2.5 min). Lean builds run in a bubblewrap sandbox on Linux only, and the receipt records it as on, off or failed, never required, because the threat is self-deception, not attack (BRIEF §5.1). Without bubblewrap comparator exits 2; under default Docker bubblewrap cannot start, and comparator exits 1, the code of a rejection [X RUN-lean-bwrap-docker]; a checker killed for memory exits like a rejection too [X RUN-bwrap-lanes]. With the sandbox disabled, `lake check` prints "WARNING: Sandbox disabled, this run is not trustworthy." [X RUN-lean-axioms]. So receipts parse verdict lines and never trust an exit code alone (SP-2.8): a failed sandbox is told from a rejection by a `bwrap:` line. The first `bwrap:` line names the cause, and `statespace doctor` prints the matching hint [X RUN-bwrap-lanes]:

| First line of the failure | What it means | What changes it |
|---|---|---|
| `bwrap: No permissions to create new namespace, likely because the kernel does not allow non-privileged user namespaces` | the container's seccomp profile blocks `clone` with namespace flags, as Docker's default profile does, or the host forbids unprivileged user namespaces | the devcontainer's opt-in sandbox profile; on a host, enable unprivileged user namespaces |
| `bwrap: Can't mount proc on /newroot/proc: Operation not permitted` | the container masks `/proc` paths | `systempaths=unconfined` |
| `bwrap: Can't mkdir /run/user: Read-only file system` | the image has no `/run/user` | create the directory in the image |
| `bwrap: pivot_root: Operation not permitted` | seccomp blocks `pivot_root`, which Docker's default profile does even with `CAP_SYS_ADMIN` | allow it, as the opt-in profile does |
| `bwrap: unshare user ns: Operation not permitted`, `bwrap: Failed to make / slave: Operation not permitted` or `bwrap: unmount old root: Operation not permitted` | seccomp blocks `unshare`, `mount` or `umount2` | allow them |
| `bwrap: setting up uid map: Permission denied` or `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` | Ubuntu 24.04's AppArmor restriction on unprivileged user namespaces | on the host, the sysctl or an AppArmor profile for the binary |
| `bwrap: Failed to make / slave: Permission denied` | Docker's AppArmor profile denies `mount` | `apparmor=unconfined` in the container |
| `error: ... needs ... to sandbox the code it checks, and it was not found.` (exit 2) | bubblewrap is not installed or not on `PATH` | install it |

macOS and Windows learners use the devcontainer (spine §9.2).

**E · Agents in the container** (0.5 min). The lab zip's agent kit travels with it, and its hook blocks agent edits to `TODO(you)` bodies, challenge files, claims and receipts (GATE-guardrails).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1, probe | for a seeded raw `statespace check` output (exit code and lines): "accepted", "rejected" or "no verdict: the check did not run" | recorded outputs [X RUN-lean-bwrap-docker, RUN-lean-comparator, RUN-lean-axioms] | exit 1 from a sandbox that could not start judged rejected (dp:L9); exit 0 beside a `sorry` warning judged accepted (dp:L9); "Your solution is okay!" judged rejected because the sandbox was off (dp:X3) | KC-2.axioms-and-trust, KC-2.statement-pinning (previews) |
| 2 | GEN-call-it t4 (five statements), probe | true or false for statements about a seeded environment block | the receipt rules (spine §9.4) and the recorded runs above | "doctor green means your proofs are checked" (dp:G8); "exit code 1 always means comparator rejected the proof" (dp:L9); "a verdict reached with the sandbox off does not count" (dp:X3) | KC-2.axioms-and-trust (preview) |
| 3 | GEN-which-stamp t1, probe | the stamp for a seeded receipt line: "Your solution is okay!" with its axiom list; a statement mismatch; a sandbox that could not start | spine §8.8: [P] · Lean 4.35.0 kernel · axioms listed [X RUN-lean-ledger], badge *reported from your machine*; the claim voided to [?] · statement mismatch; no stamp, because the check never ran | [P] for exit 0 beside a `sorry` warning (dp:L9); [R] for a statement mismatch (dp:L4); "rejected" for the sandbox failure (dp:L9) | KC-2.statement-pinning, KC-2.axioms-and-trust (previews) |

**Placement and test-out.** None: this drawer is operational. It opens summary first once LAB-2.c1 passes (the receipt shows kernel acceptance and the axiom list), or item 1 and one further fresh item on the same KC are both answered right.

**Runs.** Executed: RUN-lean-ledger, RUN-tlc-jars, RUN-pg-anomalies, RUN-z3-starter, RUN-lean-toolchain, RUN-lean-mathlib, RUN-lean-bwrap-docker, RUN-lean-axioms, RUN-lean-comparator, RUN-bwrap-lanes, RUN-scaffold, RUN-doctor-devcontainer.

### D-16 · Alloy: scopes and instances

**Opens at.** S7.L3 (link: S7.L3 quotes Jackson and points here, S07) and LAB-7.8, the `[stretch]` stage (link). Alloy honors the roadmap's "Soufflé or Alloy" as a drawer, so S7 adds no second engine (V2-23). **Objective.** Judge what a bounded check at scope k establishes beside other kinds of result (GEN-call-it t4; GEN-which-stamp t1), find a world within a scope (GEN-find-the-witness t1), and predict whether a subset constraint holds only vacuously (GEN-call-it t1). **KCs.** Teaches KC-7.policy-checking and KC-7.small-scope (S7.L3). **Misconceptions.** dp:A1, dp:A5, dp:A6, dp:X3, dp:Z2.

**Body** (6–8 min)

**A · Two commands** (2 min). `run` asks Alloy for an instance that satisfies a predicate within a scope; `check` asks for a counterexample to an assertion within a scope. A check that finds none says nothing beyond its scope: MODEL-CHECKED [M] · scope k · complete within the scope (S7.L3's table).

**B · Pair every check with a run** (1.5 min). A check over a contradictory model passes vacuously, the same trap as an `unsat` without a premise witness (D-02 §C), so every `check` sits beside a satisfiable `run` (landscape digest §2, Stage 7).

**C · The small scope hypothesis** (1 min). Jackson: "many bugs have small counterexamples", so bounded analysis is "sound: no false alarms" but "incomplete: can't prove anything" (York slides 18–19, 2004-02-04, as S7.L3 quotes them). It is a hypothesis about where bugs usually live, not a theorem about every size (dp:A6).

**D · Subset is not overlap** (1 min). `s in t` says s is a subset of t, and on an empty s it holds vacuously (dp:A1); overlap is `some s & t`.

**E · Running it** (1 min). Alloy 6.2.0 runs on the Bench, optionally [X RUN-alloy-version]; Alloy4Fun is a disclosed, uncredited link-out only, because it stores models on its server (OD-4; landscape digest §2). The tab has no Alloy, so this drawer's items are keyed by Z3 and the Datalog engine over finite worlds.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t4 (five statements), probe | true or false for what each result establishes: a one-world matrix, a bounded enumeration at scope k, an `unsat` with both witnesses, an `unknown` | spine §8.8 and S7.L3's table | "no counterexample within scope 4 means none at any size" (dp:A6); "a policy that passes its check needs no distinguishing request" (dp:A5); "an `unknown` from a quantified hierarchy means no cross-tenant read exists" (dp:Z2) | KC-7.small-scope, KC-7.policy-checking |
| 2 | GEN-find-the-witness t1 (model), probe | a world within a seeded scope (users, teams, documents, shares) that satisfies a seeded predicate, or one that breaks a seeded assertion | Z3 over finite sorts, or INS-datalog, at grade time; the scope printed (I10) | wrong-attempt class: a world outside the scope offered as a counterexample within it (dp:A6) | KC-7.policy-checking |
| 3 | GEN-which-stamp t1, probe | the stamp for a seeded raw line, such as "check NoCrossTenant for 4: no counterexample found" | spine §8.8: [M] · scope 4 · complete within the scope | [P] (dp:A6); no stamp at all, "a bounded check shows nothing" (dp:X3) | KC-7.small-scope |
| 4 | GEN-call-it t1 (three-way verdict), probe | for a seeded constraint written with `in` and a seeded world: "holds, and says something about sharing", "holds, but only because the set is empty" or "fails" | evaluation on the world at grade time | "fails, because nothing is shared" (dp:A1); the first option when the set is empty (dp:A1) | KC-7.policy-checking |

**Placement and test-out.** S7's test-out (§6.6).

**Runs.** Executed: RUN-alloy-version. No other tool fact appears.

### D-17 · Query containment

**Opens at.** S7.L4 (link: the proof alternative to the RLS differential for the conjunctive fragment, S07), LAB-7.8 (link; a `[stretch]` option) and S9.L8 (link: validating generated SQL, S09). **Objective.** Decide containment of two conjunctive queries by a homomorphism (GEN-call-it t4), refute a claimed equivalence with a database instance once duplicates or NULLs enter (GEN-find-the-witness t1), and stamp each method's result (GEN-which-stamp t1). **KCs.** Its items carry KC-6.differential-testing (threshold) and KC-6.sql-not-algebra, first taught in S6, as spirals; they preview KC-9.sql-equivalence in S7 and teach it in S9.L8. **Misconceptions.** dp:Q3, dp:X1; dp:Q8, dp:Q9 (proposed by S06).

**Body** (6–8 min)

**A · Containment** (1 min). Q1 ⊆ Q2 when, on every database, every row Q1 returns Q2 returns too; equivalence is containment both ways.

**B · Conjunctive queries** (2 min). For select–project–join queries with equalities, under set semantics, Q1 ⊆ Q2 exactly when some homomorphism maps Q2's body into Q1's and Q2's output variables onto Q1's (Chandra and Merlin, STOC 1977, as S9.L8 cites it). Example: `Q1(x) :- shared(x, d), team(d, t)` and `Q2(x) :- shared(x, d)`. Mapping Q2's one atom onto Q1's first atom shows Q1 ⊆ Q2: whoever has a share of a team's document has a share.

**C · Where SQL breaks it** (1.5 min). SQL returns bags, not sets (dp:Q8), and a comparison with NULL is unknown, which WHERE treats like false, silently dropping the row [X RUN-pg-anomalies] (dp:Q3, dp:Q9). A set-semantics proof can therefore fail for SQL; refute it with an instance run in the tab on PGlite, PostgreSQL 18.6 on one connection [X RUN-pglite].

**D · What each method earns** (1 min). A containment proof for the fragment under its stated semantics: PROVED [P] of that encoding · uncertified. A distinguishing instance: REFUTED [R] · rows. "Results match" on one database: TESTED [T] · 1 instance (spine §8.8; SP-9.4 {{run:RUN-pg-one-db}}).

**E · Provers and refuters** (0.5 min). S9.L8 compares a prover for a fragment, bounded checkers and refuters; none of them is taught here.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t4 (five statements), probe | true or false for statements about two seeded conjunctive queries and their containment | a homomorphism search over the two bodies at grade time; PGlite on a distinguishing instance | "equal results on one database show equivalence" (dp:X1); "a set-semantics proof covers SQL with duplicates" (dp:Q8); "`SUM` over no rows returns 0" (dp:Q9) {{run:RUN-pg-sum-null}} | KC-6.sql-not-algebra; KC-9.sql-equivalence (preview in S7) |
| 2 | GEN-find-the-witness t1 (model), probe | a database instance on which two seeded queries differ, through duplicates or a NULL row, or "none" | PGlite evaluates both queries at grade time [X RUN-pglite]; "none" in a seeded 30–60% share | wrong-attempt classes: an instance whose NULL row both queries drop, so the results agree (dp:Q3); results compared as sets, missing a duplicate (dp:Q8) | KC-6.differential-testing, KC-9.sql-equivalence |
| 3 | GEN-which-stamp t1, probe | the stamp for a seeded method and result: a containment proof for the fragment, a distinguishing instance, a match on one database | spine §8.8 | [P] for a match on one database (dp:X1); [P] for SQL with NULLs on the strength of a set-semantics proof (dp:Q8) | KC-6.differential-testing, KC-9.sql-equivalence |

**Placement and test-out.** S6's and S9's test-outs (§6.6).

**Runs.** Executed: RUN-pg-anomalies, RUN-pglite. To record: RUN-pg-sum-null (W4-T10), RUN-pg-one-db (W5-T03).

### D-18 · Apalache for inductive invariants

**Opens at.** S4.L6 (link, optional: Apalache's inductive checks earn [M], never [P] alone, S04) and S5.L9 (link). **Objective.** Stamp an inductive-invariant check at fixed constants and a parametric proof of the step (GEN-which-stamp t1), judge what each covers (GEN-call-it t4), and decide inductive, CTI or reachable for a satisfiable step (GEN-cti-or-bug t2). **KCs.** Its items carry KC-4.invariant-vs-inductive (threshold, first taught in S4.L4) when opened at S4.L6, and KC-5.inductive-invariant-tla (S5.L9) with KC-5.bounded-scope (threshold, S5.L8) when opened at S5.L9. **Misconceptions.** dp:G9, dp:O3, dp:T5, dp:Z1.

**Body** (6–8 min)

**A · Two obligations** (1.5 min). An inductive invariant satisfies Init ⇒ Inv and Inv ∧ Next ⇒ Inv′. The second is checked from every state the type invariant allows, reachable or not (Lamport's technique [lamportii]; D-05 §E).

**B · Bounded checkers** (1.5 min). TLC enumerates those states for fixed constants; Apalache encodes the check for an SMT solver but still instantiates the constants and types it is given. Either result earns MODEL-CHECKED [M] · constants · "inductive at N = k", never PROVED alone (spine §8.8; §12 item 29).

**C · For every N** (2 min). Discharge the step with the parameter as an uninterpreted sort in Z3, or prove it in Lean, for PROVED [P] · Z3 5.3.1 unsat · uncertified [X RUN-z3-starter], with a premise witness and the open defeater "encoding unverified" for the SMT translation of the spec (CL-5.4 {{run:RUN-z3-inductive-param}}, beside TLC's check at N = k {{run:RUN-tlc-inductive}}).

**D · Running Apalache** (1 min). Optional, on the Bench: Apalache 0.62.4, recorded with a bounded smoke check of five steps that says nothing more [X RUN-apalache-version]; S05 points to its documentation's section on checking an inductive invariant [U].

**E · A gap to spot** (0.5 min). "TLC inductive check at N = 3, stamped PROVED for all N" is AUD-5.3's G5 variant: a bounded result presented as proof (spine §6.2).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-which-stamp t1, probe | the stamp for a seeded raw line: a TLC inductive check passing at N = k; an Apalache inductive check passing at fixed constants; a Z3 `unsat` of the step with the parameter as an uninterpreted sort | spine §8.8 | [P] for either bounded check (dp:T5); [P] for the parametric step with no premise witness (dp:Z1) | KC-5.inductive-invariant-tla, KC-5.bounded-scope |
| 2 | GEN-call-it t4 (five statements), probe | true or false for statements about inductive checks on a seeded model | spine §8.8 and the seeded model | "inductive at N = 3 means inductive at N = 4" (dp:T5); "a property true in every reachable state passes the inductive check" (dp:G9); "a counterexample to induction is a reachable bug" (dp:O3) | KC-4.invariant-vs-inductive, KC-5.inductive-invariant-tla |
| 3 (from W3-T02) | GEN-cti-or-bug t2 (CTI), probe | for a satisfiable inductive step: "inductive", "CTI: strengthen the invariant" or "reachable: fix the command", backed by a bounded reachability search | Init ⇒ Inv, Inv ∧ Next ⇒ Inv′ and Inv ⇒ Safe by Z3, then bounded reachability, the bound printed (I10) | "reachable" for a CTI whose pre-state no run reaches within the bound (dp:O3); "inductive" for a satisfiable step (dp:G9) | KC-4.invariant-vs-inductive |

**Placement and test-out.** S4's and S5's test-outs (§6.6); TLA+ is never pre-credited from kernelspace.

**Runs.** Executed: RUN-z3-starter (the Z3 version), RUN-apalache-version. To record: RUN-z3-inductive-param and RUN-tlc-inductive (W3-T07).

### D-19 · Scheduled work and timers

**Opens at.** S8.L4 (link: the late-reply cell, where a timer released the hold; S08 has D-19 "frame the timer as a durable obligation"); the spine lists S8. Concurrency failures are expert-treated, so it is linked by default. **Objective.** Model a timer as durable state plus an action and judge statements about it (GEN-call-it t4), find a duplicate a timeout causes without any crash (GEN-find-the-witness t2), and find the starving lasso when the timer has no fairness (GEN-lasso-or-not t1). **KCs.** Its items carry KC-8.crash-windows and KC-8.at-least-once (threshold), first taught in S8.L3, and KC-5.fairness (threshold, S5.L7), all as spirals. **Misconceptions.** dp:E6 (proposed by S08); dp:T10, dp:T13, dp:T14 (proposed by S05).

**Body** (5–7 min)

**A · A timer is state** (1.5 min). "Release the hold after 24 hours" is a durable record, a due time, plus an action that fires it. A timer kept only in the worker's memory dies with the worker (dp:T13).

**B · Timeouts duplicate** (1.5 min). A timeout that sends again can race a late reply, and the effect happens twice with no crash at all (S8.L3's timeouts family; dp:E6). The remedy is a key that names the intent, not the attempt (S8.L4).

**C · Firing needs fairness** (1 min). "The hold is eventually released" holds only if the timer action is weakly fair and the worker recovers (S5.L7; S8.L5). Without fairness, a behavior in which the timer never fires is allowed (dp:T10).

**D · Time in a spec is an action** (1 min). TLA+ models a timeout as an action that becomes enabled, not as wall-clock seconds; a harness, not the clock, decides when it fires (D-21 §C).

**E · Pollers** (0.5 min). A due-time column and a poller that claims rows with `FOR UPDATE SKIP LOCKED`, which PostgreSQL's documentation says "provides an inconsistent view of the data" (landscape digest §2, Stage 8 [V]). S8.L3's lost effect comes from a high-water-mark poller (SP-8.2 {{run:RUN-tlc-lost-effect}}).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t4 (five statements), probe | true or false for statements about timers in a seeded outbox model | the seeded model's TLC state graph | "a timer kept in memory survives a restart" (dp:T13); "an enabled timer fires eventually without any fairness" (dp:T10); "a retry duplicates only if the first attempt was accepted and then lost" (dp:E6) | KC-8.at-least-once, KC-5.fairness |
| 2 | GEN-find-the-witness t2 (trace), timeouts family, probe | a trace in which a timeout and a late reply cause two effects with no crash, or "none" when keys name the intent | the trace replays on the TLC graph (INS-theater, INS-spectacle); "none" in a seeded 30–60% share | wrong-attempt class: a trace that needs a crash, offered where crashes are switched off (dp:E6) | KC-8.at-least-once, KC-8.crash-windows |
| 3 | GEN-lasso-or-not t1 (starving), probe | a lasso in which the hold stays held forever, or "none", for a seeded fairness setting | INS-lasso over the TLC graph | "none" when the timer has no fairness (dp:T10); a lasso offered when the timer is weakly fair and continuously enabled (dp:T14) | KC-5.fairness |

**Placement and test-out.** S8's and S5's test-outs (§6.6).

**Runs.** To record: RUN-tlc-lost-effect (W5-T03). No other tool fact appears.

### D-20 · Sensitivity in caches, without vendor specifics

**Opens at.** S7.L7 (link: a cache is one more observer, S07). The roadmap defers edge and CDN topology (D-37), so this card names no vendor and no deployment (BRIEF §5.1, the resolved cache-header item). **Objective.** Treat a shared cache as part of the observer and find a pair of worlds it lets another tenant tell apart (GEN-leaks-to-observer t1, t3), and judge what a `private` directive promises (GEN-call-it t4). **KCs.** Its items carry KC-7.observer-equivalence (threshold), KC-7.side-channels and KC-7.hyperproperty, all first taught before S7.L7, as spirals. **Misconceptions.** dp:A4, dp:X1; dp:A13 (proposed by S07).

**Body** (5–7 min)

**A · A cache is an observer** (1.5 min). Anything that stores a response and serves it to someone else observes it. Widen the observer to include what shared caches keep, and noninterference must hold for that wider observer (S7.L6).

**B · What the standard says** (1.5 min). RFC 9111 §5.2.2.7: a shared cache "MUST NOT store" a response marked `private`, and the directive "only controls where the response can be stored; it cannot ensure the privacy of the message content" (as S07 quotes it, checked by R5 on 2026-10-20 [V]). A directive you set and read back is CONFIGURED [C]; the property it is meant to protect still needs its own stamp.

**C · Paired worlds** (1.5 min). Two worlds differ only in another tenant's secret. The observer sees responses, and what a shared cache returns for them. A cache key that omits the tenant, or a difference between a hit and a miss, lets the observer tell the worlds apart.

**D · Out of scope** (0.5 min). Vendor behavior and edge topology, which the roadmap defers (D-37).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-leaks-to-observer t1 (field leak), probe | for a seeded view behind a seeded cache key, a pair of worlds the widened observer tells apart, or "none" | the paired-state evaluator (INS-pairs), bounds printed; "none" in a seeded 30–60% share | "none, because every read was checked" (dp:A4) | KC-7.observer-equivalence, KC-7.hyperproperty |
| 2 | GEN-leaks-to-observer t3 (size or abort observer), probe | a pair distinguished only by response size or by whether a shared cache already held the response, or "none" | INS-pairs | "none, because the bodies match" when the sizes differ (dp:A4); a pair whose difference the release record already explains (dp:A13) | KC-7.side-channels |
| 3 | GEN-call-it t4 (five statements), probe | true or false for statements about directives and stamps | RFC 9111 as quoted above; spine §8.7 | "`private` guarantees nobody else sees the content" (dp:A4); "a configured header proves the property it protects" (dp:X1); "a release that states what is shown is complete" (dp:A13) | KC-7.side-channels, KC-7.observer-equivalence |

**Placement and test-out.** S7's test-out (§6.6).

**Runs.** None: the RFC quotation is documentation, not a tool fact.

### D-21 · byzantine in one page: consistency and the deterministic harness

**Opens at.** S7.L8 (link: the new enemy as an ordering problem), S8.L6 (link: byzantine's deterministic network harness) and S6.L8 (optional link: byzantine's linearizability checker as the model for the serial-order search, S06). It is the self-contained prerequisite card for both byzantine bridges (M-sibling-bridge). **Objective.** Show a stale read after a revocation as a trace on a replicated model (GEN-trace-allowed t1), find where two runs of one seed diverge and why (GEN-find-the-witness t2), and judge statements about revocation and determinism (GEN-call-it t4). **KCs.** Teaches KC-7.revocation-past (S7.L8) and KC-8.deterministic-simulation (S8.L6), each where it opens; elsewhere they are previews. **Misconceptions.** dp:A6; dp:A14 (proposed by S07); dp:E8 (proposed by S08).

**Body** (6–8 min)

**A · Replicas and order** (2 min). A replica that has not yet applied an ACL change can serve a read after the revocation committed: Zanzibar's "new enemy" problem [zanzibar]. The remedies S7.L8 offers: read the ACL and the content at one snapshot; carry a consistency token with each content version and require an ACL snapshot at least as fresh (Zanzibar's zookies); or route reads after an ACL change to the primary. Revocation stops future reads; it cannot recall what was already delivered (dp:A6; SP-7.3 {{run:RUN-interp-revocation}}).

**B · Linearizability, in one paragraph** (1 min). A history is linearizable when some order that respects real time explains every result. byzantine's checker searches for such an order; S6.L8's serial-order search does the same for committed transactions (abstract serializability).

**C · The deterministic harness** (2 min). byzantine's labs drive a simulated network from seeded random streams, and the harness, not the wall clock, fires timers (S08's bridge text). The same seed gives the same transitions, so a failing seed replays (KC-8.deterministic-simulation). To read a fault schedule, take the seed, then each injected fault (drop, delay, duplicate, crash) in order, then the first step where an invariant fails.

**D · Where your simulator can break it** (1 min). Route every nondeterministic choice through the seed. Reading the system clock breaks replay, and so does iterating a Rust `HashMap`, whose default hasher is randomly seeded [U]. Deterministic means seeded, not free of randomness (dp:E8).

**E · Credit** (0.5 min). A byzantine lab passed on unseen seeds counts as test-out evidence for KC-8.deterministic-simulation (§5.7).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-trace-allowed t1 (safety prefix), probe | on a seeded replicated model, one trace that satisfies "after revocation, no new read succeeds" and one that violates it | bounded enumeration over INS-interp, the bound printed (S7.L8's item) | a violating trace that waits for every replica to lag (dp:A14); a "violation" in which data read before the revocation stays visible, which the property allows (dp:A6) | KC-7.revocation-past |
| 2 | GEN-find-the-witness t2 (trace), divergence family, probe | for two logs of one seed that diverge, the first differing transition and its source: an unseeded choice, a clock read, a hash-map order | both logs replayed at grade time (S08's divergence family) | wrong-attempt class: "randomness" named as the source when the seed controls it (dp:E8) | KC-8.deterministic-simulation |
| 3 | GEN-call-it t4 (five statements), probe | true or false for statements about revocation and determinism | the seeded models, S7.L8 and S8.L6 | "revocation takes effect on every replica at once" (dp:A14); "revocation removes what was already read" (dp:A6); "a deterministic simulator uses no randomness" (dp:E8) | KC-7.revocation-past, KC-8.deterministic-simulation |

**Placement and test-out.** S7's and S8's test-outs (§6.6), plus byzantine or kernelspace simulation evidence (§5.7).

**Runs.** To record: RUN-interp-revocation (W4-T10). No other tool fact appears.

### D-22 · Lean 4 metaprogramming

**Opens at.** A Today card, only once one of the learner's LAB-3 or LAB-9 modules uses `declare_syntax_cat` (spine: "surfaced if the learner embeds the toy syntax"); detecting that needs a lint flag on the receipt (§10, issue 15). Mini-Plinth skips parsing (S3.L1), so most learners never meet this drawer. **Objective.** Judge whether an embedded-syntax golden holds (GEN-call-it t1), whether two embedded forms elaborate to the same AST (GEN-call-it t1), and what metaprograms mean for trust (GEN-call-it t4). **KCs.** Its items carry KC-3.abstract-syntax (S3.L1) and KC-2.axioms-and-trust (threshold, S2.L9) as spirals. **Misconceptions.** dp:G8, dp:L1; dp:L9 (proposed by S02); dp:S5 (proposed by S03).

**Body** (5–7 min)

**A · What it is** (1.5 min). A syntax category plus macros lets `Transfer(a, b, 5)` appear in a Lean file. Macros rewrite syntax before elaboration, so the AST and its types are unchanged.

**B · Check the embedding with a golden** (1.5 min). A kernel-checked equation between the embedded form and the AST value you meant, closed by `rfl` or `decide`, shows the macro expands as intended; the exact syntax depends on your definitions [D].

**C · Metaprograms run when you build** (1.5 min). Macros and other metaprograms execute inside the Lean process during elaboration. The #14576 advisory says exploitation "requires execution of a metaprogram within the Lean process (e.g., as part of building a project or importing a dependency)" (2026-08-02; landscape digest §2, Stage 2 [V]), which is why `lake check` sandboxes the build and replays an exported proof through the kernel (S2.L9). Your macros are code the build runs.

**D · The roadmap's word is "selectively"** (0.5 min). Stage 9 lists Lean 4 Metaprogramming, selectively; this drawer is the selection.

**E · You do not need it** (0.5 min). The course's parser is your Rust one (LAB-3.8, capstone step S10.L1).

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1 (three-way verdict), probe | whether a seeded embedded-syntax golden "holds", "fails" or "does not elaborate" | recorded outputs from build-time elaboration (INS-goal-replay) | "holds, because Lean accepted the term as a `Cmd`" (dp:S5); "fails" when only a linter warning was printed (dp:L1) | KC-3.abstract-syntax |
| 2 | GEN-call-it t1 (three-way verdict), probe | whether two seeded embedded forms elaborate to "the same AST", "different ASTs" or "one does not elaborate" | `decide` on the two elaborated values, recorded at build time | "the same AST, because they print alike" (dp:S5); "the same, because Lean accepted both" (dp:G8) | KC-3.abstract-syntax |
| 3 | GEN-call-it t4 (five statements), probe | true or false for statements about macros and trust | the advisory as quoted; spine §9.6; S2.L9 | "a macro changes the AST's type" (dp:S5); "a green build of a file with macros shows the macros are harmless" (dp:L9); "a term Lean accepts as a `Cmd` is a well-typed Mini-Plinth program" (dp:S5) | KC-2.axioms-and-trust, KC-3.abstract-syntax |

**Placement and test-out.** No KC of its own; S2's and S3's test-outs cover the KCs its items carry.

**Runs.** None: keys are build outputs recorded at authoring time and regenerated by GATE-replay.

### D-23 · Explicit error outcomes in one page

**Opens at.** S6.L2 on the builder's path, inline: it is the declared substitute for the soft edge KC-6.rowcount-as-guard → KC-3.big-step-errors (spine §3.0). On the default path S3.L3 teaches the same and S03 does not show D-23, though it stays openable. **Objective.** Predict a compiled UPDATE's rowcount outcome (GEN-call-it t1), give a state and call that produce a named error outcome (GEN-find-the-witness t1), and judge statements about silent no-ops and errors (GEN-call-it t4). **KCs.** Teaches KC-6.rowcount-as-guard (S6.L2); KC-3.big-step-errors is first contact on the builder's path until S3.L3 opens, and a spiral on the default path. **Misconceptions.** dp:Q3; dp:Q10 (proposed by S06); dp:S7, dp:S12 (proposed by S03).

**Body** (5–7 min)

**A · Failure as a value** (1.5 min). A step returns `Except Err (State × Output × List Effect)`: an error, or a new state with its outputs and effects (KC-3.big-step-errors). S2's `transfer` returned the unchanged state when its guard failed, so a caller could not tell a rejection from a successful step that changed nothing (S3.L3's prequestion; dp:S12).

**B · Typed errors** (1.5 min). `guardFailed`, `unknownAccount`, `holdNotOpen` and `badArgument` (S03's outcome classes) are values a caller can match on, and the semantics fixes the order in which checks run (S03 §2.4). An error outcome is part of a correct semantics, not a defect (dp:S7).

**C · In SQL** (1.5 min). An UPDATE whose WHERE clause matches no row succeeds with rowcount 0, silently (dp:Q10), and a row whose balance is NULL is skipped the same way [X RUN-pg-anomalies] (dp:Q3). So the compiled transfer requires both rowcounts to equal 1 and maps each 0 to a typed error (S6.L2).

**D · Rust card** (0.5 min). `Result<T, E>` makes the same move as `Except Err`. Where it breaks: Lean's evaluator is pure and total, so every outcome is a value, while Rust code can still panic outside its `Result`.

**E · On the builder's path** (0.5 min). S3 later gives these outcomes a full semantics (S3.L3); for S6.L2 this card is enough.

**Items**

| # | Family · template · mode | Learner produces | Key and grader | Distractors (tag) | KCs |
|---|---|---|---|---|---|
| 1 (try first) | GEN-call-it t1 (three-way verdict), probe | for a seeded compiled UPDATE and state: "1 row", "0 rows, so a typed error" or "an SQL error" | PGlite runs it at grade time [X RUN-pglite] | "an SQL error" when no row matches (dp:Q10); "1 row" when the balance is NULL (dp:Q3) | KC-6.rowcount-as-guard |
| 2 | GEN-find-the-witness t1 (model), probe | a state and call that the reference evaluates to a seeded outcome class (S3.L3's family) | INS-interp at grade time | wrong-attempt class: a call that commits with no change, offered for a guard failure (dp:S12) | KC-3.big-step-errors |
| 3 | GEN-call-it t4 (five statements), probe | true or false for statements about outcomes | the reference semantics and recorded runs | "a rejected transfer that returns the unchanged state is distinguishable by its caller" (dp:S12); "an error outcome means the semantics is wrong" (dp:S7); "an UPDATE that matches no row raises an error" (dp:Q10) | KC-3.big-step-errors, KC-6.rowcount-as-guard |

**Placement and test-out.** S6's test-out for KC-6.rowcount-as-guard and S3's for KC-3.big-step-errors (§6.6); on the builder's path, a test-out of KC-6.rowcount-as-guard credits at once, because the edge it crosses is soft.

**Runs.** Executed: RUN-pg-anomalies, RUN-pglite.

---

## 4. The deferred drawers, D-30–D-40

The roadmap: "Defer category theory, advanced dependent type theory, proof-certificate infrastructure, Kani/Verus, full cryptographic protocol verification, mobile attestation, Cloudflare topology, generalized migrations, UI code generation, and multi-framework SDKs until a concrete proof obligation or implementation demands them." Each deferred drawer is always openable from SCR-drawer and search, carries the tag "deferred", and shows one short card: what the topic is, why the roadmap defers it, and what surfaces it (spine §3.12). A trigger surfaces the card in Today; it unlocks nothing (spine §12 item 22). Triggers are derived at read time (I2): D-33–D-40 read claim@1's optional `topics[]`, drawn from the eight keys of spine §3.12 and set on a claim card, on one of its assumptions or through the park option of `statespace stuck`, which writes the parked goal as an [A] assumption; D-31 reads a structured correspondence reference (language, path, symbol).

**No graded items, by design.** (1) The roadmap defers these topics until an obligation demands them, and items would turn each card into a lesson. (2) The KC graph holds no KC for them (spine §4), and GATE-kc requires every item to carry one. (3) The work their triggers create is graded where it arises: ER-1 and ER-7 each carry a forecast item and a remedy card (GATE-erosions), and a claim that names a deferred topic is checked like any claim. When an obligation does demand one, the learner's own claim and its checks are the graded work.

| ID | Card: what the topic is | Surfaced in Today when | The card then adds |
|---|---|---|---|
| D-30 | Kani: a bounded model checker for Rust, which checks properties of Rust code for every input up to the bounds it is given | ER-1 fires (SP-6.4: PostgreSQL refuses a credit with 22003 where the model commits [X RUN-pg-claims]) and the learner's runtime has an `i64` path, where `checked_add` returns `None` on overflow {{run:RUN-rust-i64}} (S06, S10) | the overflowing credit as the obligation; what a result would earn, MODEL-CHECKED [M] · bound; ER-1's remedies (spine §5.4); Kani's version is pinned and recorded as a run when first used |
| D-31 | Verus and Aeneas: tools that verify Rust code directly, Verus by checking annotated Rust with an SMT solver, Aeneas by translating Rust into a proof assistant's language | the first claim whose structured correspondence reference names Rust code, once per learner; S9.L9 links it as well (S09, S10) | the claim and the code it names; the trust-stack question of what the translation itself rests on (KC-4.trust-stack) |
| D-32 | Proof certificates (Alethe and Carcara): a solver emits a proof of `unsat` that an independent checker replays; cvc5 emits Alethe proofs, and Carcara checks them | ER-7 fires (SP-4.5: on issue #11179's inputs Z3 5.3.0 answered `unsat` on satisfiable inputs [X RUN-z3-11179]); again when S10's report logs a common-mode doubt (S04, S10) | SP-4.6, a cvc5 Alethe proof containing a `hole` step [X RUN-cvc5-alethe], so a certificate with a gap is partial; "uncertified" stays on solver-only stamps until a certificate replays |
| D-33 | Category theory: the mathematics of structure and structure-preserving maps, behind some semantics and type-theory texts | a claim or parked goal carries the topic `category-theory` | the obligation, and a note that no proof in the course needs it |
| D-34 | Advanced dependent type theory: type theory beyond what the course's Lean uses, which stops at refined types such as `Amount := {n : Int // 0 < n}` (S3.L2) | a claim or parked goal carries the topic `dependent-types` | the obligation, and S3.L2's refined type as the edge of what the course teaches |
| D-35 | Cryptographic protocol verification: proving secrecy and authentication properties of protocols against an active attacker | a claim or parked goal carries the topic `crypto-protocols` | a note that S7's observer model assumes no cryptography |
| D-36 | Mobile attestation, deferred by the roadmap: checking what a device and its software claim about themselves | a claim or parked goal carries the topic `mobile-attestation` | nothing beyond the roadmap's deferral |
| D-37 | Edge and CDN topology, deferred by the roadmap: how requests pass through caching and edge layers before they reach your system | a claim or parked goal carries the topic `edge-cdn` | D-20, which treats a cache as an observer without vendor specifics |
| D-38 | Generalized migrations: showing that schema and data migrations preserve your claims in general, rather than for one change | a claim or parked goal carries the topic `migrations`, as when S10's report writes schema migrations as NOT COVERED (S10) | state the migration as an [A] or [N] line until an obligation demands more |
| D-39 | UI code generation: generating user-interface code from a specification | a claim or parked goal carries the topic `ui-codegen`, as a NOT COVERED line can in S10 | a note that nothing in the Core covers user interfaces |
| D-40 | Multi-framework SDKs: client libraries generated for several frameworks from one interface | a claim or parked goal carries the topic `multi-framework-sdks` | nothing beyond the roadmap's deferral |

The cards keep to the roadmap's words and generic definitions, and GATE-privacy lints them like any copy (I9).

Copy (D-30's Today card): "Deferred topic, now relevant: Kani. Your overflow erosion touched Rust code that uses `i64`. The card says what Kani would check and what it would not. Nothing changes unless you open it."

---

## 5. The placement check

### 5.1 What it is

An optional, adaptive check of ten of S1's eleven ideas, all but the six-field card, which is this course's own format: at most 20 items, about 15 minutes. It finds what the learner already knows, so that the ground drawers and S1's lessons can open on summaries and Today can schedule confirmations instead of first-learning doses. It locks nothing, skips nothing on the learner's behalf, and stores nothing but item events: its result is derived at read time (I2). It inherits kernelspace's placement walk (wave-1 spec §7.1: at most 20 items, probes in curriculum order, two right means solid, a day-7 confirmation, a target of at least 85% confirmed) and re-tunes it: statespace probes reasoning moves, keeps Project 00 first (V2-20) and never pre-credits logic.

### 5.2 Where it is offered

- At the close of Boot, after *Set your week*, as one link (S1.L0; spine §3.1). Copy: "Know some logic already? An optional 15-minute check lets the course skip what you show. You can take it later from Stages."
- On SCR-stages, as S1's test-out entry while no S1 idea has been shown.
- In Today, once, as a dismissible card for a learner who has opened no lesson since Boot.

Never before Boot's first success, and never as a step anything waits on.

### 5.3 The walk

Probe order is a topological order of S1's `requires` edges (spine §4). Each KC gets at most two items: a band-2 item and then, if that is right at any confidence, a band-3 item from another family or template.

| Step | KC | Requires (step) | Item 1 (band 2) | Item 2 (band 3) |
|---|---|---|---|---|
| 1 | KC-1.quantifier-negation | — | GEN-negate-it t1, pick (k = 4) | GEN-negate-it t3, fix (constructed; Z3 equivalence) |
| 2 | KC-1.only-if-direction | — | GEN-negate-it t4, pick (k = 4) | GEN-call-it t4, five cases, all or nothing |
| 3 | KC-1.two-state-property | — | GEN-negate-it t2, pick (k = 4) | GEN-find-the-witness t1, a two-state witness (constructed) |
| 4 | KC-1.violation-as-sat | 1 | GEN-call-it t1 (k = 3) | GEN-find-the-witness t1: write the violation query and submit its model (constructed) |
| 5 | KC-1.implication-vacuity | 2 | GEN-call-it t4, five truth-table cases | GEN-call-it t1, a premise verdict (k = 3) |
| 6 | KC-1.witness-class | 4 | GEN-find-the-witness t1 with class naming (constructed, then k = 4) | GEN-call-it t4, five statements about the class |
| 7 | KC-1.three-answers | 4 | GEN-call-it t4, five statements | GEN-which-stamp t1 (k = 4) |
| 8 | KC-1.unknown-fails-closed | 7 | GEN-which-stamp t1 in an enforcement setting, on recorded raw lines (k = 4) | GEN-call-it t4, five statements |
| 9 | KC-1.non-vacuity-check | 5, 7 | GEN-negate-it t1, fix: repair the query and write its premise query (constructed) | GEN-call-it t1, a premise verdict (k = 3) |
| 10 | KC-1.encoding-is-the-claim | 7 | GEN-call-it t1 on an `Int` and BitVec 64 pair (k = 3) | GEN-find-the-witness t1, a BitVec 64 witness replayed in two's complement (constructed) |

**Per-KC rule** [D; kernelspace wave-1 §7.1]. Item 1 wrong: the KC is "not shown yet", and every KC that requires it becomes "not probed", so the walk moves on. Item 1 right at any confidence: item 2. Item 2 right: "shown"; wrong: "not shown yet".

**Chance.** Each pair includes a constructed response or an all-or-nothing five-statement item, so the probability of "shown" by blind guessing stays at most 1/20 per KC [D]. A constructed template's blind rate is the success rate of GATE-items' blind strategies on it (submitting the worked example's values, all zeros, a random draw), and the walk prints the product for each KC.

**Length and mode.** At most 20 items; the learner may stop after any item, and a partial walk keeps what it showed. Probe rules apply, with the key and a one-line why after each item and the misconception note collapsed, to hold the 15 minutes. Each item carries a call; placement calls never reach the Mirror, because they precede instruction (spine §8.5). The walk leaves out KC-2.induction-principle, which requires KC-2.proof-reading (S2.L0); S2's test-out covers both (§6.6). It also leaves out KC-1.claim-anatomy, the six-field card, which is this course's own format and new to everyone; S1's test-out can show it on fresh items (§6.6).

### 5.4 Phones and downloads

Items keyed by Z3 need INS-z3, which downloads without asking while the loader shows its size (OD-6). Until Z3 is ready, or offline before it is cached, the walk serves the items INS-pocket can key offline (witness replays, five-statement items over finite tables), marks the rest "not probed: needs the solver", and offers to finish on the laptop.

### 5.5 What the result changes

The result is derived per KC: shown, not shown yet, or not probed.

| Result | Its ground drawers | Its S1 lesson | Today |
|---|---|---|---|
| shown | summary first (§1.2) | segments open collapsed to their instrument cell and graded item, with the full text one tap away; the prequestion is skipped | one confirmation item 7–14 days later (§5.6), then FSRS maintenance |
| not shown yet | inline at the trigger, the default | full lesson | the KC's normal dose from its lesson (spine §4.1) |
| not probed | the default | full lesson | nothing until its lesson |

The suggested next step is always Project 00's: LAB-1.1 and S1.L1, with the shown ideas listed under "you can skim these". A KC shown at placement completes its test-out with one more fresh item (§6.3). Placement never moves the learner past Project 00, never changes LAB-1, its checks or the S1 Defence, and never mints a claim.

### 5.6 Confirmation

Each shown KC gets one fresh item in Today 7–14 days after the walk [D], kernelspace's day-7 check. Right: confirmed. Wrong: the KC returns to "not shown yet", and its drawer opens inline at its trigger; nothing is deducted. Copy: "Worth a second look: Quantifiers and negation. Its page sits beside S1.L1." Placement items are exempt from §1.5's first-contact rule, since showing prior knowledge is their purpose, and a confirmed KC counts as learned from its confirmation date (§7). The target is at least 85% of shown KCs confirmed (kernelspace K3's target), read descriptively from learner-zero's events and the naive testers' voluntary exports, and never a gate.

### 5.7 "From kernelspace" and sibling evidence

- **Import.** A kernelspace Evidence Pack (its one-file export of artifacts passed on unseen seeds; kernelspace wave-2 §21.2) or a sibling course's export is imported by file on the instrument origin only: schema-checked, size-capped and never rendered as HTML (I6), as INS-receipt does for receipts. Its provenance is self-declared, and the copy says so (OD-8).
- **Mapping.** A data table in W2-T16 maps the pack's own KC IDs to statespace KCs. A row exists only where the pack's evidence is a lab or item passed on unseen seeds that exercises the same move. Proposed rows: KC-8.deterministic-simulation, from kernelspace's seeded deterministic simulation or from byzantine's deterministic network-harness labs; KC-6.anomaly-isolation, from tablespace T4's MVCC lab (no dirty reads, snapshot repeatability, write-write conflict detection under a deterministic interleaving scheduler). tablespace T3's WAL lab maps to nothing and only opens D-12 on its summary.
- **Deny list.** Kernelspace evidence never pre-credits logic, induction, TLA+ or isolation (V2-20; spine §2.1). By ID, proposed (§10, issue 9): logic, KC-1.*; induction, KC-2.induction-principle and KC-2.generalized-ih; TLA+, KC-5.*; isolation, KC-6.anomaly-isolation, KC-6.compilation-pattern, KC-6.serializable-retries and KC-6.abstract-serializability. W2-T16's property test fails on any kernelspace row into these sets. Isolation may still come from tablespace evidence (A8 F11).
- **Effect.** A mapped row stands in for the KC's three test-out items (M-sibling-bridge: "sibling completions count as test-out evidence"). The KC still needs its confirmation, one fresh statespace item at least 7 days after the import, and it credits only once its hard `requires` are credited (§6.4): KC-8.deterministic-simulation requires KC-8.outbox-chain, so it waits for S8.
- **Presentation, not credit.** A kernelspace pack opens D-14 on its summary, because the wasm ABI is the family's own, and shows Rust cards compactly.

### 5.8 What placement never does

It never locks or hides a lesson, drawer, lab or audit case; never skips Project 00; never signs off a stage or replaces a Defence; never mints a claim; never shows a score, rank or percentile; never stores a status (I2); and never reaches the Mirror.

---

## 6. The per-stage test-out

### 6.1 The unit, and where it is offered

The unit is the KC: three fresh items, confirmed by one more after 7 days (spine §8.6; M-test-out, A [tetzlaff25]). A stage's test-out is the set of its KCs' test-outs, taken in `requires` order, all at once or a few at a time. It is offered on SCR-stages (the test-out entry), on SCR-stage ("Show this stage's ideas"), on each lesson ("Already know this?") and on drawer summaries, and sibling evidence can stand in for it (§5.7). Nothing waits on it.

### 6.2 Composition

Three fresh items per KC, drawn at grade time from the KC's families (§6.6), from at least two templates [chen18], at band 3 (A3 M11), on seeds this learner has not seen. At least one is a constructed response (a query, witness, trace, state pair, ordering or weakest precondition) wherever the KC's families offer one. The composer assembles only sets whose blind-pass probability under §6.3's rule is at most 1/20 [D], computed from each selected-response item's chance level and each constructed template's blind-strategy rate (GATE-items), and the card prints it. Example: three selected-response items with chance levels 1/3, 1/3 and 1/4 give 1/36 under three of three.

### 6.3 The pass rule

Pass when all three are right, or when two are right, a constructed response is among them and the miss is a selected-response item: kernelspace's "at least 2 of 3 with the constructed response right" (wave-1 §7.2). Probe rules apply: one submission, feedback after it, the agent closed with provenance self-declared (OD-8), and a call on each. One attempt per KC per local day, an honest measurement rather than a lock, since the lesson stays open (kernelspace wave-1 §7.2). A KC shown at placement already has two right items, so one more fresh item completes its test-out, provided the three together meet §6.2.

### 6.4 Confirmation, order and records

- **Confirmation.** One more fresh item 7–14 days after the pass [D], served in Today. Right: confirmed. Wrong: the KC returns to its lesson's normal path, its drawers open inline, and nothing is deducted.
- **Order.** A pass credits a KC only once every KC it requires through a hard edge is credited, by teaching, placement or an earlier test-out; until then the pass is recorded, and it credits the moment they are. The test-out page lists such prerequisites and offers their items first. The soft edge the builder's path crosses (spine §3.0) does not wait. This keeps GATE-kc's order on both published paths.
- **Records.** Test-out items are `item` events, own · unseen, weight 1.0, with a test-out context in `ref` (§7). They are exempt from §1.5's first-contact rule, and their calls reach the Mirror only when the KC's lesson segment or a drawer body teaching it was opened earlier (spine §8.5).

### 6.5 What a pass changes, and what it does not

A confirmed pass opens the KC's lesson segments collapsed (as in §5.5) and its drawers summary first, and Today keeps the KC in FSRS maintenance from the confirmation instead of the first-learning dose (§10, issue 11). The test-out session and the confirmation count as two of the three spaced sessions that sign-off asks for (spine §8.6), since each answers fresh items correctly in its own session.

A pass never signs off a stage: the Defence remains, Parts A–D. It never mints a claim, because labs do; never skips or shortens a lab stage, its checks or Prove-it; never changes a stage's audit cases; and never counts toward VRK₃₀ until 30 days after the confirmation (§7).

### 6.6 Per stage

| Stage | KCs | Families that serve test-out items | Notes |
|---|---|---|---|
| S1 | 11 | GEN-negate-it t1–t4, GEN-find-the-witness t1, GEN-call-it t1 and t4, GEN-which-stamp t1–t3 | the placement walk covers ten of the eleven first (§5); KC-1.claim-anatomy is served by GEN-which-stamp t3 and GEN-find-the-witness t1 |
| S2 | 12 | GEN-proof-structure t1–t3 (goals from build-time elaboration), GEN-call-it t1 and t4, GEN-which-stamp t1, GEN-find-the-witness t1 (for KC-2.finite-map-update) | KC-2.proof-reading has only GEN-proof-structure, so its three items come from t1–t3; induction can be shown on fresh items but is never pre-credited (V2-20); writing proofs stays lab work |
| S3 | 12 | GEN-find-the-witness t1–t2 (INS-interp), GEN-proof-structure t1–t3, GEN-call-it t1 and t4 | LAB-3's goldens and proof stages are unchanged |
| S4 | 11 | GEN-wp-it t1–t3, GEN-negate-it t2–t3, GEN-cti-or-bug t1–t3, GEN-which-stamp t1–t3, GEN-call-it t1 and t4 | GEN-cti-or-bug items also serve KC-5.inductive-invariant-tla in S5 |
| S5 | 11 | GEN-trace-allowed t1–t3, GEN-lasso-or-not t1–t2, GEN-call-it t1, t2 and t4, GEN-which-stamp t1, GEN-cti-or-bug t1–t3 | never pre-credited from kernelspace (TLA+); on the builder's path a pass on KC-5.inductive-invariant-tla waits for KC-4.invariant-vs-inductive (§6.4) |
| S6 | 12 | GEN-anomaly-id t1–t4, GEN-find-the-witness t1 and t3 (PGlite; recorded histories), GEN-call-it t1, t3 and t4, GEN-which-stamp t1 | a tablespace T4 completion stands in for KC-6.anomaly-isolation's three items (S6.L5's card, which S06 issue 10 moves to S6.L6's opening); kernelspace never credits isolation |
| S7 | 11 | GEN-spec-it t1–t2, GEN-find-the-witness t1 and t4, GEN-leaks-to-observer t1–t3, GEN-trace-allowed t1, GEN-call-it t4 | — |
| S8 | 10 | GEN-find-the-witness t2, GEN-trace-allowed t1–t3, GEN-lasso-or-not t1–t2, GEN-call-it t1 and t4, GEN-which-stamp t1–t2 | byzantine or kernelspace simulation evidence stands in for KC-8.deterministic-simulation, crediting once KC-8.outbox-chain is credited |
| S9 | 11 | GEN-proof-structure t1–t3, GEN-find-the-witness t1, t2 and t4, GEN-leaks-to-observer t3, GEN-which-stamp t1, GEN-call-it t4 | each mini-Defence still samples its own half |
| S10 | 4 | GEN-which-stamp t1–t3, GEN-spot-the-gap t1–t4, GEN-call-it t4 | the Defence over the report remains the stage's sign-off |

The counts sum to the spine's 105 KCs.

### 6.7 Copy

- Offer: "Already know this? Three items, about 5 minutes. Pass, and the lesson opens on its summary. It stays open either way."
- Odds, on every card: "Chance of passing by guessing: about 1 in 36." (the composer's figure for that set)
- Pass: "Shown: Two-state properties. One more item in about a week confirms it."
- Miss: "Not shown yet: Two-state properties. The lesson is ready when you are."
- Stage: "Show this stage's ideas: 12 ideas, three items each. Labs and the Defence stay as they are."

---

## 7. Data and derivation

- **Events.** Drawer, placement, test-out and confirmation items are `item` events (spine §8.2). `ref` carries the item revision and a context: `drawer:D-03/i2`, `placement:step-4`, `testout:KC-1.violation-as-sat`, `confirm:KC-1.violation-as-sat`. Imported packs are `receipt-import` events with `ref: pack:<course>` and self-declared provenance. Drawer opens are logged as help-seeking, as the spine's uncredited `view` kind (§8.2).
- **Derived per KC at read time** (I2): first contact, shown at placement, tested out, confirmed, not shown yet, not probed. No status is stored. The derivation is a pure function of the event log and the KC graph, so a double import, a merge or a stale tab gives the same result (the property tests W1-T03 runs on the event log, which W2-T16 extends).
- **Dates.** For a KC shown at placement or tested out, VRK₃₀ and "settled" count from the confirmation date [D] (§10, issue 12).
- **Travel.** Placement and test-out results travel with the event log's export and its merge-import with undo (SCR-settings), because they are nothing but events.

---

## 8. Ownership, runs and time

### 8.1 Owners

Spine §13 names the owner of every drawer: a stage's lesson task owns the drawers its stage introduces, W1-T44 writes the eleven deferred cards, and W3-T35, W4-T12 and W5-T40 wire their triggers. `tracker/tasks.yaml` also carries the drawers in tasks of their own (W2-T43, W2-T44, W3-T43, W4-T38, W4-T43 and W5-T39), and its review hours govern where they differ. Review hours follow the spine's rubric of 0.25 h per drawer [D] (spine §13).

| Task | Parts of this spec | Review h [D] |
|---|---|---|
| W1-T11 | D-01–D-06 and D-13 | 1.75 (spine) |
| W1-T09 | the S1 slice of the placement walk (§5) | within its 1.5 (spine) |
| W1-T44 | the text of the eleven deferred cards (§4) | 0.25 |
| W2-T04 | D-07, D-08, D-15 | 0.75 |
| W2-T09 | D-14, D-22 | 0.5 |
| W2-T16 | the per-stage test-out (§6), confirmations, and the "From kernelspace" and sibling imports (§5.7) | 1 (spine) |
| W2-T17 | the dp:G1–dp:G11 refutation cards (§1.4) | within its 0.5 |
| W3-T03 | D-10 and D-18; D-13's item 4 | 0.5 |
| W3-T11 | D-09 | 0.25 |
| W3-T35 | D-32's trigger at ER-7 | within its 0.5 |
| W4-T05 | D-23 | 0.25 |
| W4-T09 | D-16, D-17, D-20 | 0.75 |
| W4-T12 | D-30's trigger at ER-1 | within its 0.5 |
| W4-T13 | D-11, D-21 | within its 1.5 |
| W5-T02 | D-12, D-19 | 0.5 |
| W5-T40 | the triggers of D-31 and D-33–D-40 (§10, issue 14) | 0.25 |

### 8.2 Runs

- **Executed, cited here:** RUN-z3-starter, RUN-z3-optimize-min, RUN-z3-bv64, RUN-z3-conservation-noguard, RUN-z3-selftransfer, RUN-z3-unknown-pow, RUN-z3-budget-pyodide, RUN-z3-11179, RUN-cvc5-alethe, RUN-lean-ledger, RUN-lean-selftransfer, RUN-lean-axioms, RUN-lean-skipkernel, RUN-lean-comparator, RUN-lean-bwrap-docker, RUN-lean-toolchain, RUN-lean-mathlib, RUN-tlc-doublespend, RUN-tlc-jars, RUN-pg-anomalies, RUN-pg-claims, RUN-pglite; and, recorded by W0, RUN-pg-catalog, RUN-spectacle-s5s8, RUN-lean-wasm, RUN-scaffold, RUN-apalache-version, RUN-alloy-version, RUN-doctor-devcontainer, RUN-tlc-help and RUN-bwrap-lanes.
- **To record, all in spine §9.5:** RUN-z3-vacuous-unsat, RUN-z3-double-capture, RUN-z3-demorgan, RUN-z3-smtlib-tour and RUN-rust-i64 (W1-T12; RUN-z3-smtlib-tour is D-13's page: the starter as SMT-LIB and a budgeted `unknown` with its reason, natively and on Pyodide); RUN-lean-ih-ungeneralised, RUN-lean-noguard and RUN-lean-s2-cells (W2-T10); RUN-z3-missing-frame, RUN-z3-inductive-param, RUN-tlc-inductive and RUN-pcal-doublespend (W3-T07); RUN-pg-sum-null, RUN-pg-mixed-levels and RUN-interp-revocation (W4-T10); RUN-tlc-lost-effect and RUN-pg-one-db (W5-T03).

### 8.3 Time

Drawer reading sits outside the spine's §3.11 totals, which count only the reading list. For the reference learner the ground drawers are close to required: opening the five S1 ground drawers (D-01–D-04, D-06) and D-13 adds about 35–50 minutes of reading [D], while their first-attempt items are graded opportunities the Keep block already budgets (spine §3.0). On S1's high estimate of 9.4 h that comes to about 10.0–10.2 h, against the 10 h the spine reads into "2–4 focused sessions" (§10, issue 13).

---

## 9. Validation

- **Gates.** As §1.7, plus W2-T16's property tests: no kernelspace mapping row into the deny list; a credited KC's hard `requires` are credited; derived results identical after a double import, a merge or a stale tab; no stored status; placement calls and pre-instruction test-out calls never reach the Mirror; each test-out card's printed blind-pass probability equals the composer's computation and is at most 1/20.
- **Learner-zero and testers** (descriptive, n = 1; event-log exports such as RUN-lz-boot-w1 and RUN-lz-signoff-w2): drawer opens per triggering segment; try-first accuracy; the placement confirmation rate (target at least 85%, from kernelspace K3) and the test-out confirmation rate; and minutes per drawer, which replace the [D] estimates after each wave (spine §3.0). None of these gates a wave; W0-T07's rules, fixed in advance, decide what changes.

---

## 10. Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item ends with its outcome.*

Each item names where this file departs from the spine, or depends on a change to it. Nothing here is applied silently.

1. **Misconception namespace.** GATE-items requires a misconception ID on every option, but the spine defines no namespace, and the digest's G1–G9 collide with gap classes G1–G13. This file follows S01's `dp:` prefix (S01 issue 4; S07 SI-9; S10 issue 7) and proposes dp:G10 (precedence or scope) and dp:G11 (quantifier order), seeded by PutnamBench #361, #366 and #368 (§1.4). *Revision 3: already resolved (ID conventions; §8.3; §12 item 40).*
2. **"Reading a counterexample" has no drawer.** It is a ground topic this spec covers, but §3.12 has no drawer for it, so it lives in D-01 §C, D-04 §E, D-09 §D and D-21 §C. Propose renaming D-01 "A proof is not a test; reading a counterexample", or record the split. *Revision 3: already resolved (§3.12 D-01).*
3. **D-06 has no KC.** Roadmap rule 3 is the course's thesis, yet no KC holds it: D-06's items borrow KC-1.three-answers, KC-1.violation-as-sat and KC-1.non-vacuity-check, and the six-field skill is never itself graded as the learner's. Propose KC-1.claim-anatomy ("state a guarantee in six fields, with an 'if weakened' witness that refutes the claim's own proposition"), first taught in S1.L3 and within the 110-KC cap, or confirm the borrowing. *Revision 3: already resolved (§4, §3.1 S1.L3, §12 item 43).*
4. **§3.12 lags the stage specs.** Sibling specs add triggers: D-02 at S2.L2 and S4.L8; D-04 at S2.L8 and S4.L4; D-06 at S2.L10, LAB-4.8 and LAB-10.8; D-07 at LAB-3.c4–c5's rungs; D-09 at S8.L2; D-10 at S4.L3 and in S7 (S07 SI-15); D-13 at S1.L2, LAB-1.6 and LAB-4.2 onward; D-14 at LAB-4, LAB-6, LAB-9.11 and LAB-10.2–10.3; D-15 at S5.L2 on the builder's path (S05 issue 5), LAB-6.1 and LAB-10.2–10.3; D-16 at S7.L3; D-17 at S7.L4 and S9.L8 (S09 issue 6); D-18 at S4.L6; D-19 at S8.L4; D-20 at S7.L7; D-21 at S6.L8. Update the table, or state that GATE-links derives "Used in" from content. *Revision 3: already resolved (§3.12).*
5. **No task owns the placement walk.** Boot ends with "an optional placement walk" (§3.1; S01's Boot timeline), but W1 builds no placement, and W2-T16 owns the test-out and the "From kernelspace" import. The walk uses only W1 families and decides how the W1 ground drawers present, so propose its S1 slice in W1 (W1-T09 or W1-T11); otherwise Boot omits the link until W2. *Revision 3: already resolved (§13 W1-T09).*
6. **Most drawers have no owner, and W1-T11's acceptance is thin.** Only D-01–D-06 and D-13 (W1-T11), D-11 and D-21 (W4-T13), D-30 (W4-T12) and D-16 (through W4-T09) are owned; §8.1 proposes the rest. Drawers sit outside §7, §9.1 and §10.1, so GATE-links' ownership check misses them: extend it to D-*. W1-T11's acceptance is GATE-links alone; add GATE-items, GATE-generators and GATE-kc for drawer items, and GATE-numbers, GATE-runs and GATE-codes for drawer copy. W1-T11 also ships D-05, whose natural items (GEN-proof-structure) arrive with W2-T11 (§1.8). GATE-lessons should apply its copy, block-type and no-lock rules to SCR-drawer, but not its lesson anatomy. *Revision 3: applied, merged into PLAN#8 (§13 rules and rows; §11.2 GATE-links, GATE-lessons).*
7. **Test-out pass rule.** §8.6 says "three fresh items per KC, confirmed by one more after 7 days" and gives no threshold; two of three on three-option items would pass a blind guesser about one time in four. This file adopts kernelspace's "two of three with the constructed response right", a composer cap of 1/20 on blind passing, one attempt per KC per day, and a 7–14-day confirmation window (§6.2–§6.4). *Revision 3: applied (§8.6, §7 M-test-out, §13 W2-T16).*
8. **Event kinds.** §8.2's kinds include none for a drawer open, which A3 M1 asks to log as help-seeking, and nothing marks placement, test-out or confirmation context. Propose an uncredited `view` kind, and `ref` contexts on `item` events (§7). *Revision 3: already resolved (§8.2).*
9. **The kernelspace deny list has no IDs.** "Never logic, induction, TLA+ or isolation" (§2.1; W2-T16's property test) needs sets. Proposed: KC-1.*; KC-2.induction-principle and KC-2.generalized-ih; KC-5.*; KC-6.anomaly-isolation, KC-6.compilation-pattern, KC-6.serializable-retries and KC-6.abstract-serializability (§5.7). *Revision 3: already resolved (§2.1).*
10. **Derived credit is unordered.** GATE-kc orders content by first teaching, but nothing orders credit derived from placement or test-out, so a test-out could credit a KC whose prerequisites are uncredited. §6.4 credits only once the hard `requires` are credited; propose stating that rule in §8.6. *Revision 3: already resolved (§8.6; §13 W1-T09, W2-T16).*
11. **Dose for KCs shown early.** §4.1's "≥ 8 graded opportunities in 60 days" and W1-T08's scheduler test are silent on KCs shown before their lesson. Proposed: FSRS maintenance from the confirmation, and exclusion from the dose check (§6.5). *Revision 3: already resolved (§4.1, §13 W1-T08).*
12. **"First learning" is undefined** for VRK₃₀ and "settled" when a KC was shown at placement or tested out. Proposed: the confirmation date (§7). *Revision 3: already resolved (§2.3, §12 item 47).*
13. **S1's budget leaves out the ground drawers.** §3.11 counts only the Z3Py introduction under S1's reading. For the reference learner the five S1 ground drawers and D-13 add about 35–50 minutes [D], taking S1's high estimate from 9.4 h to about 10.0–10.2 h against the 10 h reading of "2–4 focused sessions". Count them in S1's Read column and trim elsewhere, or record that drawers sit outside the plan. *Revision 3: already resolved (§3.11).*
14. **Deferred triggers cannot be derived.** "When a claim names it" (D-33–D-40) and "when a correspondence field names Rust code" (D-31) cannot be computed from claim@1 as it stands (I2). Propose an optional `topics[]` field from a fixed vocabulary, settable on claim lines (NOT COVERED lines included) and on parked goals (`statespace stuck`), and a structured correspondence reference (language, path, symbol) for D-31. *Revision 3: applied (§3.12, §9.6 `statespace stuck`, §11.2 GATE-schema).*
15. **D-22's trigger needs a detector.** Propose that `statespace check` flag `declare_syntax_cat` in the learner's LAB-3 and LAB-9 modules, beside LAB-3.c3's existing lint, and that receipt@1 carry the flag, for example in a `lints[]` list. *Revision 3: applied (§3.12 D-22, §3.3 LAB-3.c3, §9.4).*
16. **Runs outside §9.5.** This file cites three sibling-proposed runs (RUN-z3-demorgan, RUN-lean-s2-cells, RUN-pcal-doublespend) and S05's proposed RUN-tlc-help, and proposes RUN-z3-smtlib-tour for D-13. RUN-z3-unknown-pow's §9.5 entry describes only `x**y`, though its log also holds the `∀k. k·k ≠ y` line D-03 cites and the "incomplete quantifiers" line S01 cites; widen the entry so GATE-facts can match them. *Revision 3: already resolved (§9.5).*
