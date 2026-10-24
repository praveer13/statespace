# S1 Counterexample (Z3Py): curriculum spec

**Status:** authoring spec for W1 (W1-T09 Boot, W1-T10 lessons, W1-T12 runs, W1-T13 LAB-1, W1-T15 claims, W1-T16 specimens, W1-T17 audit); ladders, Prove-it and the Defence land with W2-T06, W2-T11 and W2-T12. **Date:** 2026-10-23. **IDs:** every ID comes from `docs/spine/SPINE.md`; anything the spine lacks is listed in §13 rather than invented silently.

**Sources, in precedence order:** the roadmap (Stage 1 and "First weekend — Project 00"); executed runs (`research/spikes/RESULTS.md`, `research/evidence/a2r3/out/z3_*.txt`, `cvc5_alethe.txt`, `A5r3/z3-pyodide.log`, `A5r3/browser-runs.log`); the brief; the four digests; the A2 and A4 reviews; the spine.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D follow the pedagogy digest. Learner copy appears in quotation marks after "Copy:"; everything else is for authors. Learner copy uses only the §0 glossary terms of the spine and never internal names (lane, Shelf, docket, pocket checker, Hall of Records, Judgment).

---

## 0. The stage at a glance

**Promise.** Find a bug mathematically: state a property, assert its negation, read the solver's answer exactly, and say what that answer is about.

**New tool.** Z3Py, met first in the tab: INS-z3 runs Z3 5.3.1 on Pyodide 314.0.7 in a module worker on the instrument origin, without cross-origin isolation, in Chromium 153, Firefox 155 and WebKit 26.6 [X RUN-z3-starter-pyodide, RUN-browser-origin]. LAB-1 runs on the learner's machine with `uv run --with z3-solver==5.3.1`, as the spikes ran [X RUN-z3-starter], or entirely in the tab; no devcontainer (spine §12 item 34). Roadmap time: 2–4 focused sessions.

| ID | Tier | Title | Minutes | KCs introduced | Cells with a call | Specimens · claims |
|---|---|---|---|---|---|---|
| S1.L0 | boot | Boot: "safe, 200 tests green" | ≤ 8 | (first contact with KC-1.violation-as-sat) | 1 | mounts SP-1.1; shows SP-1.4, SP-1.9 |
| S1.L1 | core | Negate, then search | 40–60 | KC-1.quantifier-negation, KC-1.only-if-direction, KC-1.violation-as-sat, KC-1.witness-class | 2 + 1 generated | SP-1.1 |
| S1.L2 | bridge | Three answers: sat, unsat, unknown | 15–25 | KC-1.three-answers, KC-1.unknown-fails-closed | 2 | SP-1.7, SP-1.8 |
| S1.L3 | bridge | The guard, and what unsat says | 15–25 | KC-1.implication-vacuity, KC-1.non-vacuity-check | 2 | SP-1.6 · CL-1.1 |
| S1.L4 | bridge | Two-state properties | 15–25 | KC-1.two-state-property | 2 | SP-1.2, SP-1.3 · CL-1.2, CL-1.3, CL-1.4 |
| S1.L5 | core | The encoding is the claim | 40–60 | KC-1.encoding-is-the-claim | 3 | SP-1.4, SP-1.5, SP-1.9, SP-1.10 · CL-1.5 |

**KCs of S1** (spine §4; four threshold KCs, each with a spiral return and a later Defence):

| KC | Threshold | Requires | First taught | Spiral returns |
|---|---|---|---|---|
| KC-1.quantifier-negation | | — | S1.L1 seg 1 | KC-2.theorem-statement-reading (S2) |
| KC-1.only-if-direction | | — | S1.L1 seg 1 | S7 policy phrasing |
| KC-1.violation-as-sat | threshold | KC-1.quantifier-negation | S1.L1 seg 2 | KC-4.vc-shape (S4 Defence); KC-7.policy-checking (S7 Defence) |
| KC-1.witness-class | | KC-1.violation-as-sat | S1.L1 seg 3 | confusable with KC-4.cti-or-bug (S4) |
| KC-1.three-answers | threshold | KC-1.violation-as-sat | S1.L2 | confusable set A from S2; S5.L8 bounded scope (S5 Defence) |
| KC-1.unknown-fails-closed | | KC-1.three-answers | S1.L2 | confusable with KC-5.bounded-scope; S7.L3 |
| KC-1.implication-vacuity | threshold | KC-1.only-if-direction | S1.L3 | SP-4.4 vacuity trap (S4 Defence); S7 "vacuously true on ∅" |
| KC-1.non-vacuity-check | | KC-1.implication-vacuity, KC-1.three-answers | S1.L3 | every later `unsat` claim card |
| KC-1.two-state-property | | — | S1.L4 | KC-4.hoare-triple, KC-5.behaviors-stuttering, KC-3.resource-postings |
| KC-1.encoding-is-the-claim | threshold | KC-1.three-answers | S1.L5 | confusable set F from S3 (KC-3.nat-truncation, S3 Defence); KC-6.overflow-refusal and ER-1 (S6 Defence) |

Order inside lessons respects every `requires` edge. No confusable set opens in S1 (set A opens in S2, set F in S3), so M-which-is-it starts later.

**Glossary schedule** (spine §0; Boot introduces exactly five): Boot: call, stamp, specimen, Today, Keep block. S1.L1: run, drawer, re-find, Mirror. S1.L3: claim, seam. S1.L4: twin. LAB-1: lab · check, receipt, Bench, Prove-it. After LAB-1: Audit Desk, Defence, signed off · settled.

**Content blocks** (V2-18, at most six in W1): prose, prequestion, instrument cell with Call It, graded item, card (reading, twin, incident, "Build this"), table. GATE-lessons counts them.

**The first weekend** (spine §3.1): Boot → LAB-1.1 → S1.L1 → LAB-1.2 → S1.L2 → S1.L3 → LAB-1.3 → LAB-1.4 → LAB-1.6, plus the reading. S1.L4, S1.L5 and LAB-1.5 follow in week 2. Budget in §12.

---

## 1. Conventions in this file

**Call It** (M-call-it, grade A for retrieval, C for confidence as feedback). Three confidence taps with printed bands: *guess* (below 67%), *think so* (67–80%), *sure* (above 80%); the chance level 1/k is printed; payoffs +1/0, +2/−2, +3/−6 are shown before choosing and used as feedback only. The first call is final: only it counts, and it cannot be edited. Only post-instruction, unassisted calls reach the Mirror. Sure-and-wrong calls return at about 1 day and 1 week (M-sure-wrong-returns).

**Interpretation tap** (spine §8.4). After every solver result in S1 the learner taps "so the property holds", "so it is violated" or "can't tell" before the stamp appears; the tap fades per KC once fresh items are solid.

**Misconception tags.** Every option carries a tag from the pedagogy digest's catalog (§2), written `dp:Z1`, `dp:G4` and so on, because the catalog's G1–G9 collide with gap classes G1–G13 (§13, issue 4). Two entries are proposed for the catalog and marked "proposed": **dp:Z6** misjudges what the solver decides (expects `unknown` on a small linear integer query, or a decision on a nonlinear or quantified one); **dp:Z7** treats overflow as breaking every check instead of tracing which operation wraps.

**Graded items** name a family and template (spine §8.3). Keys are computed at grade time by Z3 or a witness check; `sat` answers are graded by checking the witness's property, never by matching model values. Practice shows witnesses and class hints; probes are one-shot (M-class-hint, [dantoni15]). GEN-negate-it serves pick → fix → write, moving after two unseen successes and back after two misses.

**Surprise forecast.** Each authored call carries the author's forecast of whether it is a genuine surprise; §2.7 tallies the balance GATE-items checks.

**Worked examples.** S1 has no proofs, so no Goal Replay plan; its worked examples are correct-first and unfaded (the six fading families start in S2), and no completion blank carries a prompt. S1 has no sibling bridges (spine §3.1).

**Scaffolding per KC** (expertise reversal, A [tetzlaff25]): novice for all ten S1 KCs, with misconception notes open and a correct worked example before each KC's first graded constructed item (fix or write mode, or a witness the learner supplies); expert for none, because no S1 KC lies in an expert-treated domain (Rust, PostgreSQL practice, concurrency failures; spine §2.1). Two KCs lean on familiar habits (KC-1.unknown-fails-closed on fail-closed gates, KC-1.encoding-is-the-claim on Rust integer overflow), but each teaches an idea that is new here, so both stay novice: the reversal is asymmetric, and when unsure the course helps.

---

## 2. Lessons

### S1.L0 · boot · Boot: "safe, 200 tests green"

**Objective (observable).** Call whether an agent's guarded transfer is safe for the sender over `Int`, using a variant whose answer the roadmap does not print; read Z3's overdraft witness, then the corrected guard's `unsat`; meet the BitVec 64 recipient wrap as an uncredited reveal.
**KCs.** KC-1.violation-as-sat, first contact only: the call is recorded and scheduled but counts toward no KC state and never reaches the Mirror (spine §12 item 33). **Prerequisites.** None. **Instruments.** INS-z3; recorded results stand in while the worker is cold. **Generator.** GEN-call-it (the scheduled follow-up). **Target.** At most 8 minutes on a phone; first success within 4 minutes, checked by the GATE-bundle timing gate and, before the "external learners" label, by RUN-boot-firstsuccess.

**The agent's variant.** The pull request guards the debit with the recipient's balance:

```python
def transfer(src, dst, amount):
    if amount <= 0 or amount > dst.balance:   # "guard: sufficient funds"
        raise Rejected
    src.balance -= amount
    dst.balance += amount
```

Encoding: `a ≥ 0, b ≥ 0, amount > 0, amount ≤ b` with the violation `a − amount < 0`; the corrected guard `amount ≤ a` is exactly the roadmap's starter, whose `unsat` is recorded natively and on Pyodide [X RUN-z3-starter, RUN-z3-starter-pyodide]. The variant itself is {{run:RUN-z3-boot-variant}} (native and Pyodide; its recording is the cold-start fallback for this cell).

| Time | Beat | What the learner sees |
|---|---|---|
| 0:00 | Prompt card | The pull request and its description, rendered as quoted UNREVIEWED text (I8): "Transfer is now guarded. Safe: 200 tests green." |
| 0:30 | **Call It** | see below |
| 1:15 | Witness | Z3's model, replayed: the sender's balance is below the amount, the recipient's covers it, and the sender ends below zero {{run:RUN-z3-boot-variant}}. The specimen card SP-1.1 is mounted (term *specimen*). |
| 2:15 | Fix | One edit, `dst` → `src`. Result: no such input [X RUN-z3-starter]. The first stamp (term *stamp*): "PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N", with the plain line "for mathematical integers; sender only; the encoding is not yet checked against code". |
| 3:30 | First success | Called, witnessed, fixed, stamped. |
| 3:30 | Reveal (uncredited) | Copy: "Same corrected guard, but balances are 64-bit integers, as in most code." Sender: no such input; recipient: a witness, B = 9223372036850581504 and X = 4194304, where B + X reads as negative [X RUN-z3-bv64]. Copy: "The guard protects the sender, not the recipient." (SP-1.4, shown; mounted in S1.L5.) |
| 5:00 | Dated incident card | SP-1.9, exposure only: on 2010-08-15 it was found that Bitcoin's transaction checks "didn't account for the case of outputs so large that they overflowed when summed"; a transaction in block 74638 had created 184,467,440,737.09551616 bitcoins [btc2010, V]. No tool numbers on this card. |
| 5:45 | "This will feel harder" | M-feels-harder (B [deslauriers19]). Copy: "Effortful practice often feels slower than rereading, and it tends to stick better. Expect that here." |
| 6:15 | *Set your week* | A range target (for example 6–10 hours), two build blocks on your laptop, and a Keep block (term). Today (term): 10–12 minutes, 3–5 times a week. |
| 7:30 | Close | Optional placement walk; the scheduled card is shown. |

While the worker is cold the cell shows the recorded result labeled "Recorded result · Z3 5.3.1 · checked on every build" [X RUN-z3-starter-pyodide]; the live solver loads only after consent, because its first download exceeds 5 MB (OD-6; size from {{run:RUN-phone-pyodide}}).

**Call It** (k = 3, chance 1/3). Copy: "Can the sender's balance go below zero after this transfer, for some whole-number balances?" A "No: the guard checks funds before the debit." · B "Yes: some inputs get past the guard." · C "Only when the amount exceeds both balances." **Key:** B {{run:RUN-z3-boot-variant}}. **Why** A: the guard reads `dst`, so it checks the wrong balance; green tests sample inputs, and fixtures with equal balances never reach this case (dp:G8). B: the solver searched every whole-number input and found one that passes the guard and overdraws the sender. C: an amount above both balances fails the guard; the bad inputs are those where the recipient covers the amount and the sender does not (dp:Z3). **Surprise forecast:** moderate.

**Prequestion.** The Call It doubles as Boot's single prequestion: asked before any instruction, answered by the run (M-prequestion).

**Today card created.** One fresh GEN-call-it template 1 item on the same move, due after S1.L1 teaches it. **Build this:** LAB-1.1, the 2-minute win. Copy: "Next, on your laptop or here: run the starter yourself (2 minutes)." The card avoids the word "lab", which S1 introduces with LAB-1.

---

### S1.L1 · core · Negate, then search

**Objective.** Turn an English property into a violation query by asserting its negation, get a witness, and name the class the witness belongs to. The first scored call is a fresh variant, because the roadmap's starter prints its own answer (V2-05).
**KCs.** KC-1.quantifier-negation, KC-1.only-if-direction, KC-1.violation-as-sat (threshold), KC-1.witness-class. **Prerequisites.** None (Boot's first contact helps but is not required). **Instruments.** INS-z3. **Generators.** GEN-negate-it, GEN-find-the-witness, GEN-call-it. **Specimen.** SP-1.1. **Drawers.** D-01, D-03. **Terms.** run, drawer, re-find, Mirror. **Minutes.** 2 (prequestions) + 3 × 12–15 + 5 (exit).

**Prequestions** (M-prequestion, A [sthilaire23]; answered inside the segments).

PQ1 (k = 4, chance 1/4; KC-1.violation-as-sat, KC-1.quantifier-negation). Copy: "The property: every allowed transfer leaves the sender at zero or above. Which formula do you hand the solver to hunt for a bug?" A `allowed ∧ bal′ ≥ 0` · B `allowed ∧ bal′ < 0` · C `¬allowed ∧ bal′ < 0` · D `allowed → bal′ < 0`. **Key:** B. **Why** A: a model is a transfer that works, which proves nothing about the others (dp:Z1). B: the negation of "for every allowed transfer, bal′ ≥ 0" is "some allowed transfer has bal′ < 0"; a model of it is a bug. C: negating the premise as well searches transfers the guard already rejects (dp:G3). D: an implication is satisfied by any input that is not allowed, so the model need not be a bug (dp:G4).

PQ2 (k = 3, chance 1/3; KC-1.only-if-direction). Copy: "'A transfer is allowed only if the balance covers the amount.' Which formula is it?" A `allowed → covers` · B `covers → allowed` · C `allowed ↔ covers`. **Key:** A. **Why** A: "P only if Q" makes Q necessary for P. B: reverses the direction; covering is necessary, not sufficient (dp:G1). C: reads "only if" as "if and only if" (dp:G3).

**Segment 1 · Negating English** (12–15 min; KC-1.quantifier-negation, KC-1.only-if-direction)

Worked example first, correct only (A [barbieri23]): "every allowed transfer leaves the sender non-negative" becomes `∀ inputs. allowed → a′ ≥ 0`, whose negation is `∃ inputs. allowed ∧ a′ < 0`; "both balances stay non-negative" (`a′ ≥ 0 ∧ b′ ≥ 0`) negates to `a′ < 0 ∨ b′ < 0`. Drawer D-03 holds the rules. Reading pointer: the Z3 guide's "Boolean Logic".

*Cell* (authored): the unguarded transfer (`a ≥ 0, b ≥ 0, amount > 0`, `a′ = a − amount`, `b′ = b + amount`) with the mis-negation `a′ < 0 ∧ b′ < 0`, then the correct `a′ < 0 ∨ b′ < 0` {{run:RUN-z3-demorgan}}.

**Call It** (k = 3, chance 1/3). Copy: "This query asks for `a′ < 0 ∧ b′ < 0` on the unguarded transfer. What will Z3 return?" A `sat` · B `unsat` · C `unknown`. **Key:** B {{run:RUN-z3-demorgan}}. **Why** A: the transfer is unguarded, but this query asks for both balances to go negative at once, and the recipient only gains; the De Morgan slip made the search impossible (dp:Z5). B: no input satisfies it, so Z3 answers `unsat`, yet the property is violated: the correct negation is `sat` in the same run. C: three linear integer constraints are decided outright (dp:Z6, proposed). **Surprise forecast:** yes. The lesson line, after the tap: "That `unsat` was not safety. It answered the wrong question."

**Graded item.** GEN-negate-it template 4 (English "only if"/"unless"), pick mode, band 2–3 connectives: a seeded rule such as "a refund is allowed only if the charge has settled, unless it is a chargeback"; options are the reference violation query and three tool-checked mutants tagged dp:G1 (reversed "only if"), dp:G3 ("unless" mistranslated) and dp:Z5 (De Morgan slip). Graded by Z3 equivalence (P⇒R and R⇒P); a wrong pick shows a distinguishing state; the generator discards instances whose premises are unsatisfiable.

**Segment 2 · The violation query** (12–15 min; KC-1.violation-as-sat)

*Cell* (generated; the first scored call of the stage): GEN-call-it template 1 on a fresh seeded variant of the starter (a different guard, a fee on the debit, or a different property), key computed by Z3 at grade time. Options `sat` / `unsat` / `unknown`, chance 1/3; whys are generated from the instance's misconception mutants.

Then the worked example, with the term *run*: the roadmap's starter asserts the premises and the negation `a − amount < 0`; Z3 5.3.1 returns `sat [b = 0, amount = 1, a = 0]` [X RUN-z3-starter]. The witness is replayed offline: 0 − 1 = −1 < 0 (copy says "checked offline"; INS-pocket). Copy: "Every result in this course is a recorded run with an id, RUN-z3-starter here, that anyone can execute again." The Z3 guide states the principle: "F is valid precisely when Not(F) is not satisfiable" ("Satisfiability and Validity" [V]). Drawer D-01 contrasts this with the 200 tests from Boot.

**Graded item.** GEN-find-the-witness template 1 (model), band 3–4 variables: a seeded buggy guard; the learner writes the violation query in the cell and submits the model. Pass: the witness satisfies the premises and violates the property under the encoding (checked offline), and the query is equivalent to premises ∧ ¬property (Z3; a distinguishing state otherwise).

**Segment 3 · One witness, one class** (12–15 min; KC-1.witness-class)

*Cell* (authored): Optimize with `minimize(amount)` over the starter's overdraft query; Z3 returns `[amount = 1, b = 0, a = 0]` [X RUN-z3-optimize-min].

**Call It** (k = 3, chance 1/3). Copy: "Z3 is asked for the overdraft with the smallest amount. What amount comes back?" A `1` · B `0` · C "one more than the sender's balance in the first witness". **Key:** A [X RUN-z3-optimize-min]. **Why** A: the minimizer chooses every variable, so it sets the sender's balance to 0 and the amount to 1. B: the premise `amount > 0` excludes 0 (dp:Z5). C: treats the first witness's balance as fixed; it is one member of the class, not the bug (dp:Z3). **Surprise forecast:** no.

Copy: "'Minimal' means minimal for the objective you asked for, here the amount, and nothing else." The class is every input with `amount > a`; the starter's witness and Boot's are members. Patching the instance (excluding `a = 0`) leaves the class intact, and Z3 returns another member. M-class-hint (B/C [dantoni15][danas17]).

**Graded item.** GEN-find-the-witness template 1 with class naming: give a second overdraft witness that differs from the first in every variable (checked offline), then pick the class predicate among four (`amount > a` key; `a = 0`, `amount = 1`, `b = 0`, each tagged dp:Z3); the class key is checked by Z3 equivalence with the violation set.

**Exit items** (all create Today cards; first windows at about 1–3, 7, 21 and 45–60 days, toward at least 8 graded opportunities per KC in 60 days):
1. GEN-negate-it template 1 (single guard), pick mode → KC-1.quantifier-negation, KC-1.violation-as-sat.
2. GEN-call-it template 1, fresh variant → KC-1.violation-as-sat.
3. GEN-find-the-witness template 1 with class naming → KC-1.witness-class.

**Today cards created.** The three exit families; a re-find of SP-1.1 at 7 days or more (term *re-find*: the same move on a new specimen; "kept" after it succeeds, M-re-find, A [rowland14][pan18]); sure-and-wrong returns. Copy at the close introduces the *Mirror*: "Your confidence taps go to a private Mirror. It shows nothing until there are enough calls to say anything."

**Twin card.** No production twin pinned at a SHA covers this move. A dated reading card does: S3 Block Public Access compiles a policy into `Allow(P) ∧ ¬Trust(...)`, and "a satisfying assignment corresponds to an untrusted (public) access that is allowed" (ESEC/FSE 2020, §4.2, p. 6 [bpa, V]). Copy: "Industrial checkers make the same move: assert the bad outcome and ask for a witness."

**Sibling bridge.** None. **Build this:** LAB-1.2, "Find a transfer that makes the source balance negative" (20 min).

---

### S1.L2 · bridge · Three answers: sat, unsat, unknown

**Objective.** Judge about five statements true or false on what `sat`, `unsat` and `unknown` each assert about one query, one encoding and one solver run (GEN-call-it template 4), and pick the fail-closed behavior when `unknown` guards enforcement.
**KCs.** KC-1.three-answers (threshold), KC-1.unknown-fails-closed. **Prerequisites.** KC-1.violation-as-sat. **Instruments.** INS-z3. **Generators.** GEN-call-it, GEN-which-stamp. **Specimens.** SP-1.7, SP-1.8. **Drawer.** D-13. **Minutes.** 15–25.

**Prequestion** (k = 4, chance 1/4; tagged KC-1.three-answers and KC-1.unknown-fails-closed). Copy: "A deploy gate asks Z3 whether a new rule can overdraw any account. Z3 answers `unknown`. What is established?" A "No account can be overdrawn." · B "Some account can be overdrawn." · C "Nothing about the rule; the gate should block it until the question is decided." · D "The rule is safe for the inputs Z3 tried." **Key:** C. **Why** A: `unknown` is no verdict (dp:Z2). B: `unknown` is not a witness; only `sat` with a replayed model shows a violation (dp:Z1). C: correct; a gate that lets `unknown` through has no evidence at all. D: Z3 reports no partial coverage, and "inputs tried" is a testing idea (dp:X1).

**Cell 1** (authored): `x**y == 8, y > 1` over `Int`. **Call It** (k = 3, chance 1/3): A `sat` · B `unsat` · C `unknown`. **Key:** C, with the reason line "smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))" on Z3 5.3.1 and 4.15.4 natively, and on 5.3.1 under Pyodide [X RUN-z3-unknown-pow]. **Why** A: x = 2, y = 3 is a solution, so the formula is satisfiable, yet the verdict reports this run, not the truth (dp:Z6, proposed). B: x = 2, y = 3 satisfies it; a guess of `unsat` misread the constraint (dp:Z5). C: correct, and the reason names the gap (nonlinear exponentiation). **Surprise forecast:** yes. The same run's log holds a decided neighbor, `2**x == y, x ≥ 0, y == 5`, which is `unsat` [X RUN-z3-unknown-pow]: `unknown` belongs to a query, not to "exponents".

**Cell 2** (authored): `x > 2, y > 2, z > 2, x·x·x + y·y·y == z·z·z`, which has no solution, run with `rlimit` 5000000. **Call It** (k = 2, chance 1/2): A "proved: `unsat`" · B "no verdict: `unknown`". **Key:** B, `unknown (canceled)` in 1.1 s [X RUN-z3-budget-pyodide]. **Why** A: no solution exists, but Z3 has not shown it within the budget; truth and verdict differ (dp:Z6, proposed). B: correct; the reason "canceled" says the budget ran out. **Surprise forecast:** yes. Then specimen SP-1.8: the same query with `s.set('timeout', 2000)` never returned and was stopped by an external 25 s limit [X RUN-z3-budget-pyodide], so course budgets are `rlimit`, with `worker.terminate()` as the hard stop. `rlimit` counts solver work rather than seconds, so a verdict at a stated `rlimit` can be re-run [D].

**Fail closed.** Copy: "When `unknown` guards enforcement, treat it as 'no'." The dated source: S3 Block Public Access, "To maintain soundness, we choose to fail closed: if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" (ESEC/FSE 2020, p. 8 [bpa, V]).

**Reading card** (the S1 twin from the spine, a docs page rather than a repository): AWS Automated Reasoning checks return seven results, VALID, INVALID, SATISFIABLE, IMPOSSIBLE, TRANSLATION_AMBIGUOUS, TOO_COMPLEX and NO_TRANSLATIONS (read 2026-10-23 [V]). The course's mapping [D]: VALID ≈ [P] of the translated claims only; INVALID ≈ [R]; SATISFIABLE ≈ missing premises (true in some scenarios, false in others); IMPOSSIBLE ≈ contradictory premises (S1.L3); TRANSLATION_AMBIGUOUS and TOO_COMPLEX ≈ [?] with a reason; NO_TRANSLATIONS ≈ [N].

**Graded item.** GEN-call-it template 4 (multiple true/false), five statements drawn from a seeded scenario (a query, its encoding, one raw output line), keys computed at grade time from the scenario's construction and a decisive run. Statement templates and tags: "this `unsat` covers every input of this encoding, if the solver is sound" (true); "this `sat` means the property holds" (false, dp:Z1); "this `unknown (canceled)` means no counterexample exists" (false, dp:Z2); "a larger `rlimit` could turn this `unknown` into a verdict" (true); "the printed model is the bug, so excluding that input fixes it" (false, dp:Z3); "this `unsat` also covers 64-bit integer code" (false, dp:Z4).

**Exit item.** GEN-which-stamp template 1 (raw output → stamp) in an enforcement setting: a raw line such as `unknown (canceled)` at a stated `rlimit` on a deploy gate; key "[?] · canceled at rlimit R" and the gate blocks; tags KC-1.unknown-fails-closed, KC-1.three-answers.

**Today cards.** GEN-call-it template 4; GEN-which-stamp template 1; a re-find of SP-1.7 served as GEN-which-stamp items on recorded raw lines (for example the "incomplete quantifiers" line in the same run [X RUN-z3-unknown-pow]), because generators discard live `unknown` instances.

**Reading pointer.** Z3 guide, "Solvers" (`check()` returns `sat`, `unsat` or `unknown`; its own `2**x` example returns `unknown`) and "Satisfiability and Validity", read 2026-10-23 [V]. **Build this:** after S1.L3, LAB-1.3; your receipt records each verdict line verbatim with its `rlimit`.

---

### S1.L3 · bridge · The guard, and what unsat says

**Objective.** Add the sufficient-funds guard, read `unsat` as "for every input of exactly this encoding, if the solver is sound", and run the premise witness beside it.
**KCs.** KC-1.implication-vacuity (threshold), KC-1.non-vacuity-check. **Prerequisites.** KC-1.only-if-direction, KC-1.three-answers. **Instruments.** INS-z3. **Generators.** GEN-negate-it, GEN-call-it. **Specimen · claim.** SP-1.6 · CL-1.1. **Drawers.** D-02, D-06. **Terms.** claim, seam. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3; tagged both KCs). Copy: "The violation query for 'every transfer with amount > 0 and amount ≤ MAX_TRANSFER leaves the sender at zero or above' comes back `unsat` with MAX_TRANSFER = 0. Which is true?" A "The transfer is safe for all inputs." · B "The claim is true but says nothing: no transfer meets its premises." · C "The claim is false." **Key:** B. **Why** A: `unsat` over premises that cannot hold is vacuous (dp:Z1). B: correct; an implication with a false premise is true. C: reads if-then as "and" (dp:G7).

**The guard, recorded.** The guarded query's `unsat` is not called again: the roadmap prints it and Boot showed it [X RUN-z3-starter]. Copy: "`unsat` here means: for every input of exactly this encoding, the guarded transfer leaves the sender at zero or above, if the solver is sound." The course re-runs this query on a second solver at build time: cvc5 1.4.2 (its pip wheel reports `1.4.2-modified`) also returns `unsat` [X RUN-cvc5-alethe]. Two solvers agreeing is diversity, not a checked proof, so the qualifier stays "uncertified".

**Cell 1** (authored): the premise query, premises and guard without the negated property {{run:RUN-z3-vacuous-unsat}}. **Call It** (k = 3, chance 1/3): `sat` / `unsat` / `unknown`. **Key:** `sat`. **Why** `unsat`: confuses the premise query with the violation query, as if the violation's `unsat` made the premises empty (dp:Z1). `unknown`: a small linear query is decided (dp:Z6, proposed). **Surprise forecast:** no.

**Cell 2** (authored, the config cell): a default config sets MAX_TRANSFER = 0 beside `amount > 0 ∧ amount ≤ MAX_TRANSFER`. Three queries {{run:RUN-z3-vacuous-unsat}}: (i) violation of "sender ≥ 0"; (ii) violation of the absurd property "the sender ends 1,000,000 richer"; (iii) the premises alone. **Call It** on (ii) (k = 3, chance 1/3): `sat` / `unsat` / `unknown`. **Key:** `unsat`: the absurd property is "proved". **Why** `sat`: expects the absurd claim to be refuted; with no allowed transfer, every claim about allowed transfers holds vacuously (dp:G4). `unknown`: (dp:Z6, proposed). **Surprise forecast:** yes. Then (i) and (iii) are also `unsat`. Copy: "When the premises cannot hold together, every property is proved. The premise query is the tell." D-02 holds the truth table.

**The first claim** (terms *claim* and *seam*). CL-1.1 is minted, prefilled from the cell's results: six fields, the requirement row and the three-segment strip (§5). Its two assumptions are drawn dashed: SEAM-1, "balances are unbounded integers", and SEAM-7, "the solver is sound". Copy: "A seam is an assumption planted on purpose. Some give way later in the course; some are tested and hold." D-06 explains each field.

**Graded item.** GEN-negate-it template 1 (single guard), fix mode: a near-miss violation query for a seeded guard (a wrongly negated conjunct, or an extra bound that contradicts a premise); the learner repairs it and writes the premise query. Graded by Z3 equivalence with the reference (a distinguishing state on failure); the premise query must be `sat`.

**Exit item.** GEN-call-it template 1: for a seeded claim, predict the premise query's verdict. Seeds draw contradictory premises in a seeded 30–60% of instances so the rate cannot be learned; tags KC-1.non-vacuity-check, KC-1.implication-vacuity.

**Today cards.** GEN-negate-it template 1 (fix); GEN-call-it template 1 (premise verdicts); a re-find of SP-1.6 at 7 days or more. The audit case AUD-1.1 is scheduled after LAB-1.

**Reading pointer.** Z3 guide, "Satisfiability and Validity" (`prove` asserts the negation and checks for unsatisfiability), read 2026-10-23 [V]. **Twin.** None. **Build this:** LAB-1.3, "Add the sufficient-funds guard: `unsat`, plus a satisfiable premise witness" (15 min).

---

### S1.L4 · bridge · Two-state properties

**Objective.** Encode conservation with primed variables, find the double-capture and buggy-refund witnesses, and fix each so that a non-minimal witness dies too.
**KCs.** KC-1.two-state-property (and KC-1.witness-class again). **Prerequisites.** KC-1.violation-as-sat, KC-1.witness-class, KC-1.non-vacuity-check. **Instruments.** INS-z3. **Generators.** GEN-find-the-witness, GEN-negate-it (two-state template). **Specimens · claims.** SP-1.2, SP-1.3 · CL-1.2, CL-1.3, CL-1.4. **Drawer.** D-04. **Term.** twin. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3; KC-1.two-state-property, KC-1.witness-class). Copy: "A capture is applied twice to the same hold. Which property catches it?" A "Total money is conserved." · B "The merchant gains at most the hold's amount from it." · C "The held balance never goes below zero." **Key:** B. **Why** A: a double capture moves money; it does not create it (dp:O2). B: correct. C: catches it only when this hold is the only one; with other holds in the same held balance it passes (dp:A3).

**The model** (D-04). A state is `(avail, held, merchant, status)`; a step is a relation between S and S′ written with primed variables, the roadmap's holds in Z3 constraints. Capture: `held′ = held − h ∧ merchant′ = merchant + h ∧ status′ = CAPTURED`; the buggy capture has no guard, the tempting patch requires `held ≥ h`, and the fixed guard is `status = HELD`. Two captures chain S → S′ → S″.

**Cell 1** (authored): conservation of the plain transfer with no guard, `(a − amount) + (b + amount) == a + b`. **Call It** (k = 3, chance 1/3): "proved" / "counterexample" / `unknown`. **Key:** proved [X RUN-z3-conservation-noguard]. **Why** "counterexample": conservation is not non-negativity, and it needs no guard; "money is safe" was never unpacked into one property (dp:G6). `unknown`: (dp:Z6, proposed). **Surprise forecast:** yes. The primed form `a′ = a − amount ∧ b′ = b + amount ∧ a′ + b′ ≠ a + b` becomes the recorded query after substitution. The two-variable model cannot say "same account"; CL-1.2's "if weakened" field shows what aliasing does (§5).

**Cell 2** (authored; all queries in {{run:RUN-z3-double-capture}}): the buggy capture applied twice to one HELD hold. Queries: (i) conservation of `avail + held + merchant` from S to S″; (ii) `merchant″ − merchant ≤ h`; (iii) the patch "capture requires `held ≥ h`" with other holds pooled in `held`; (iv) the fixed capture; (v) the premise witness, one capture succeeding. **Call It** on (i) (k = 3, chance 1/3): "conservation fails (`sat`)" / "conservation holds (`unsat`)" / `unknown`. **Key:** holds. **Why** "fails": the double capture lowers `held` as it raises `merchant` (dp:O2). `unknown`: (dp:Z6, proposed). **Surprise forecast:** yes. Then (ii) is `sat` (SP-1.2: the merchant gains twice the hold); (iii) is `sat` with a non-minimal witness, because the patch fixed the instance and not the class; (iv) is `unsat`; (v) is `sat`.

**Twin card** (term *twin*). TigerBeetle's two-phase transfers: a pending transfer "can be posted or voided only once"; posting it twice fails with `pending_transfer_already_posted`, and posting more than the pending amount fails with `exceeds_pending_transfer_amount` ("Resolve Funds" and "Errors", read 2026-10-23 [tb2pc, V]; SHA in {{run:RUN-twin-pins}}). Tracing questions: which guard in your model plays the role of the first error, and which property would the second error protect?

**The refund.** LAB-1.4 found the clamp refund's mint in the first weekend, so this lesson does not call it again; a fresh variant is the graded item.

**Graded item.** GEN-find-the-witness template 1 on a seeded refund variant (a clamp at a fee floor; a debit computed from a stale balance; a fee credited back without its debit): find the mint witness, then submit a fix. The fix passes when the mint query is `unsat`, some refund with `r > 0` is still accepted (`sat`), and a non-minimal witness drawn at grade time is rejected (checked offline).

**Exit item.** GEN-negate-it template 2 (two-state), pick then fix: the violation query over S, S′ (and S″ where needed) for a seeded step property (at most once, conservation, no mint).

**Today cards.** GEN-negate-it template 2; GEN-find-the-witness template 1 (refund family); re-finds of SP-1.2 and SP-1.3.

**Reading pointer.** D-04, and TigerBeetle's "Two-Phase Transfers" sections "Reserve Funds (Pending Transfer)" and "Resolve Funds", read 2026-10-23 [V]. **Build this:** LAB-1.5, "Conservation and double capture as two-state properties" (25 min).

---

### S1.L5 · core · The encoding is the claim

**Objective.** Re-encode the transfer in BitVec 64 and show, through graded items, why the guarded sender stays safe only with `amount > 0`, why the recipient wraps, and how a mixed signed/unsigned guard readmits the overdraft; read the six-row "what 64-bit means" table.
**KC.** KC-1.encoding-is-the-claim (threshold). **Prerequisites.** KC-1.three-answers, KC-1.violation-as-sat, KC-1.non-vacuity-check. **Instruments.** INS-z3, INS-pocket. **Generators.** GEN-call-it, GEN-find-the-witness. **Specimens · claim.** SP-1.4, SP-1.5, SP-1.9, SP-1.10 · CL-1.5. **Minutes.** 2 + 3 × 12–15 + 5.

**Prequestions.** PQ1 (k = 3, chance 1/3). Copy: "A claim proved over `Int`, 'the guarded transfer never overdraws the sender', moves to code that stores balances as 64-bit integers. What carries over?" A "All of it: the guard did not change." · B "The sender's half, given amount > 0; the recipient needs its own check." · C "Nothing: 64-bit arithmetic can wrap anywhere." **Key:** B [X RUN-z3-bv64]. **Why** A: `Int` never overflows; 64-bit integers do (dp:Z4). B: correct. C: overflow happens in particular operations, and the sender's subtraction stays in range under the guard (dp:Z7, proposed).

PQ2 (k = 3, chance 1/3). Copy: "On Z3 bit-vectors, is `<` signed or unsigned?" A "Signed." · B "Unsigned." · C "It depends on how the variable was declared." **Key:** A (Z3 guide, "Machine Arithmetic" [V]). **Why** B: `ULT` is the unsigned comparison (dp:Z5). C: bit-vectors carry no sign; each operator chooses one (dp:Z5).

**Segment 1 · The sender at 64 bits** (12–15 min). *Cell*: signed BitVec 64, guard `X ≤ A` without `X > 0`, violation `A − X < 0` {{run:RUN-z3-bv64-negamt}}; then with `X > 0` the violation is `unsat` [X RUN-z3-bv64]. **Call It** on the first query (k = 3, chance 1/3): `sat` / `unsat` / `unknown`. **Key:** `sat`. **Why** `unsat`: over `Int` a negative amount makes the sender richer, never poorer; at 64 bits, subtracting a negative amount is an addition that can overflow (dp:Z4). `unknown`: (dp:Z6, proposed). **Surprise forecast:** yes. Copy: "Zero and negative amounts are a decision, not a detail. S3 records it." **Graded item:** GEN-find-the-witness template 1 on a seeded BitVec variant (no `amount > 0`, or `X ≤ A + 1`); the witness is checked offline with 64-bit two's-complement arithmetic.

**Segment 2 · The total at 64 bits** (12–15 min). *Cell*: `(A − X) + (B + X) == A + B` over BitVec 64. **Call It** (k = 3, chance 1/3): "proved" / "counterexample" / `unknown`. **Key:** proved [X RUN-z3-bv64]. **Why** "counterexample": arithmetic modulo 2⁶⁴ still cancels; a wrap moves no money in this sum (dp:Z7, proposed). `unknown`: (dp:Z6, proposed). **Surprise forecast:** yes. Then the recipient, seen in Boot and now mounted as SP-1.4: B = 9223372036850581504 and X = 4194304 give B + X = 2⁶³, which signed 64-bit reads as −2⁶³ [X RUN-z3-bv64]. A Pyodide run of a related query (`B ≥ 0, M > 0, B + M < 0`) returned a different witness [X RUN-z3-bv64-pyodide]; witnesses are not canonical, so items check the property. **Graded item:** GEN-call-it template 4, five statements on what CL-1.5 covers: the sender with `amount > 0` (true); the recipient (false, dp:Z4); conservation modulo 2⁶⁴ (true); "the `Int` claim carries over to `i64` code" (false, dp:Z4); "on an overflowing credit, PostgreSQL `bigint` ends in the same state as the BitVec model" (false [X RUN-pg-claims]).

**Segment 3 · Signed and unsigned** (12–15 min). *Cell*: guard `UGT(X, 0), ULE(X, A)` with the signed property `A − X < 0`. **Call It** (k = 3, chance 1/3): `sat` / `unsat` / `unknown`. **Key:** `sat`, A = 13835060254305419776, X = 4611686018427387904 [X RUN-z3-bv64]. **Why** `unsat`: `ULE` reads A's bits as about 1.38 × 10¹⁹ while `<` reads the same bits as negative, so guard and property disagree about the state (dp:Z5). `unknown`: (dp:Z6, proposed). **Surprise forecast:** moderate. Copy: "Pick one reading of the bits and use it in every comparison." (SP-1.5.)

The six-row table:

| Semantics | An overflowing credit | Evidence |
|---|---|---|
| Lean `Int` | cannot overflow (arbitrary precision) | definition of the type |
| Z3 `Int` | cannot overflow (mathematical integers) | definition; Z3 guide "Arithmetic" [V] |
| Z3 BitVec 64 | wraps modulo 2⁶⁴; signedness is per operator | [X RUN-z3-bv64] |
| PostgreSQL `bigint` | raises 22003 "bigint out of range"; the balance keeps its old value | [X RUN-pg-claims] |
| PostgreSQL `numeric` | raises on its declared bound | {{run:RUN-pg-numeric-bound}} |
| Rust `i64` | debug build panics; release build wraps; `checked_add` returns `None` | {{run:RUN-rust-i64}} |

Copy: "S6 comes back to the PostgreSQL row. There, your model takes a step the database refuses." This foreshadows ER-1 without firing it. Two dated incidents sit in the specimen cabinet's "dated incidents" filter as toy models: SP-1.9, Bitcoin 2010 {{run:RUN-z3-btc2010}}, and SP-1.10, Bloch 2006's binary-search midpoint {{run:RUN-z3-bloch06}}; each runs from the cabinet as a free run.

**Graded item.** GEN-find-the-witness template 1 on a seeded encoding variant, then name the class: signedness mismatch, overflow on the credit, or a negative amount (keys at grade time).

**Exit items.** GEN-call-it template 1 on a fresh `Int` versus BitVec variant; GEN-find-the-witness template 1 for a recipient-wrap witness under a seeded guard. Both tag KC-1.encoding-is-the-claim. CL-1.5 is minted (§5).

**Today cards.** The two exit families; a re-find of SP-1.4 (a fresh guard's wrap) at 7 days or more.

**Twin card.** AWS Automated Reasoning checks, revisited: "A VALID result covers only the parts of the input captured through policy variables in the translated premises and claims" (read 2026-10-23 [V]). Copy: "What the checker never saw, it never checked. Here the unseen part was the width of an integer."

**Sibling bridge.** None. **Build this:** revise LAB-1.6's limitations field (name the encoding; add the recipient as not covered) and run LAB-1's Prove-it encoding mutation.

### 2.7 Call tally

Eleven authored calls after Boot; Boot's first-contact call and the generated call in S1.L1 segment 2 are excluded (GATE-items balances generated keys per stage):

| Key | Calls | Share |
|---|---|---|
| `unsat` (including "proved" and "holds") | S1.L1 seg 1; S1.L3 cell 2; S1.L4 cells 1 and 2; S1.L5 seg 2 | 5 of 11 (45%) |
| `sat` | S1.L3 cell 1; S1.L5 segs 1 and 3 | 3 of 11 (27%) |
| `unknown` | S1.L2 cells 1 and 2 | 2 of 11 (18%) |
| a value | S1.L1 seg 3 | 1 of 11 (9%) |

No verdict exceeds 60%. Forecast surprises: 8 of 11 (73%), above the 30% floor; learner-zero's logged calls test the forecast before the "external learners" label.

---

## 3. LAB-1 · Project 00, the counterexample lab

The roadmap's first-weekend checklist, plus Stage 1's conservation and double-capture project in LAB-1.5 (3–5 h in the roadmap). It runs with `uv run` on the learner's machine or entirely in the tab, never in the devcontainer.

**Template** (`statespace-lab`, folder `lab1/`). `pyproject.toml` pins `z3-solver==5.3.1` [X RUN-z3-starter]. Given: `starter.py` (the roadmap's starter, verbatim) and `broken/refund.py` (the clamp rule of SP-1.3). The learner writes the bodies marked `TODO(you)` in `transfer.py`, `fixed/refund.py` and `holds.py`, each exposing a small interface (`premises`, `guard`, `step`, `prop`, and for holds a `capture` relation over S and S′) that `statespace check` imports in a subprocess. Also present: `README.md` with the five headings; `claims/` with templates for CL-1.1–CL-1.5 (`*.yaml` beside `*.smt2`); `specimens/`; `receipts/`; a read-only `challenge/` holding the reference queries the checker compares against (hashed; "unseen, not secret"); and the agent kit (AGENTS.md, CLAUDE.md, the fail-closed hook on `TODO(you)` bodies, `challenge/`, `claims/` and `receipts/`).

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-1.1 | Run the Z3Py introductory example, then the roadmap's starter; see `sat`, then `unsat` | 2 | LAB-1.c1 |
| LAB-1.2 | Find a transfer that makes the source balance negative | 20 | LAB-1.c2 |
| LAB-1.3 | Add the sufficient-funds guard: `unsat`, plus a satisfiable premise witness | 15 | LAB-1.c3 |
| LAB-1.4 | Introduce the buggy refund rule, find the second counterexample, fix it so a non-minimal witness also dies | 25 | LAB-1.c4 |
| LAB-1.5 | Conservation and double capture as two-state properties | 25 | LAB-1.c5 |
| LAB-1.6 | README with the property, assumptions, solver answer, example model and limitations; two claim cards prefilled from the receipt (write stage) | 25 | LAB-1.c6 |

**Predict, then run.** LAB-1.1 opens with a call on the starter's two verdicts; the roadmap prints them, so this call is practice and never scored (V2-05). **Investigation items** (practice mode, witnesses and class hints shown): in LAB-1.2, minimize your witness's amount with Optimize and say what "minimal" covers; in LAB-1.3, drop `amount > 0` and predict the sender's verdict over `Int`; in LAB-1.4, find which conjunct of your fixed refund is load-bearing by deleting each in turn; in LAB-1.5, ask whether conservation catches your double capture.

### 3.1 Checks and exact pass conditions

Every check parses verdicts from the solver's output and never trusts an exit code alone; every `sat` is graded by replaying its model through the checker's reference evaluator (Python integers for `Int`, 64-bit two's complement for BitVec), never by matching values. Each check runs under a stated `rlimit` recorded on the receipt.

- **LAB-1.c1** passes when `z3.get_version_string()` reports 5.3.1 and `starter.py` prints the verdict pair `sat` then `unsat` [X RUN-z3-starter]. Model values are not compared. The guide's introductory example is run and logged but not graded.
- **LAB-1.c2** passes when (a) the learner's violation query returns `sat`; (b) the model satisfies `a ≥ 0, b ≥ 0, amount > 0` and leaves the sender below zero under the encoding. Reported, not required: whether the query is equivalent to premises ∧ ¬property; a narrower query gets a distinguishing state ("your query would miss this violation").
- **LAB-1.c3** passes when (a) the guarded violation query is `unsat`; (b) the premise query (premises and guard, no negated property) is `sat` and its model satisfies every premise; (c) the guard is equivalent to `amount ≤ a` under the premises, so a guard that also rejects a full-balance transfer fails with that distinguishing state; (d) the violation query is equivalent to premises ∧ guard ∧ ¬property, so extra constraints cannot make `unsat` cheap.
- **LAB-1.c4** passes when (a) `broken/refund.py` gives `sat` on the learner's mint query (`total′ > total`) and the model replays; the witness is written to `specimens/`; (b) `fixed/refund.py` gives `unsat` on the same query for the base parameters and for two parameter sets drawn at grade time from the bug's family (a non-zero floor, a prior partial refund, a fee): the fresh mutants of the bug; (c) the fixed rule's premise query is `sat`, so some refund with `r > 0` is accepted (rejecting every refund is not a fix); (d) a non-minimal witness of the clamp class drawn at grade time is rejected or conserves under the fixed rule.
- **LAB-1.c5** passes when, on the base model and on three seeds drawn at grade time (hold amounts, other holds pooled in `held`, initial status): (a) the transfer step written with primed variables conserves the total (negation `unsat`) and the step relation itself is `sat`; (b) the buggy capture applied twice is `sat` on the at-most-once query, with a witness that replays; (c) the fixed capture is `unsat`; (d) one fixed capture succeeds (`sat`).
- **LAB-1.c6** passes when (a) `README.md` has the headings Property, Assumptions, Solver answer, Example model and Limitations, each non-empty; (b) every verdict line under Solver answer matches a receipt line verbatim, with the Z3 version and `rlimit`; (c) the Example model replays as a violation of the stated property; (d) the two cards (CL-1.1 and CL-1.4) pass claim@1 validation: six fields present, method, tool and version equal to the receipt's, statement hash equal to the `claims/*.smt2` hash, the "if weakened" witness refuting the claim's own proposition on replay, and requirement-fit not [P]. Prose quality is not graded; nothing here is graded by a language model.

### 3.2 Receipt (receipt@1)

`schema`, `lab` LAB-1, `stage`, `createdAt`; badge words only: *reported from your machine* for `uv run`, *re-checked here* for tab runs and witness replays, *self-assessed* for the provenance block; `environment` (OS, Python, `uv` version; devcontainer: none; sandbox: not applicable); `tools[]` (z3-solver version string and the SHA-256 of the installed wheel); `statements[]` (`claims/cl-1-*.smt2` path and `sha256(text.trimRight() + "\n")`); `runs[]` (engine, version, argv, SHA-256 of the SMT-LIB export of each query, budget `rlimit`, exit code, verdict lines verbatim); `z3` block (`rlimit`, verdict, `reason_unknown`); `checks[{id, pass}]`; `provenance` (`assisted: none | explain | code`, `agent: bool`, self-reported); `claims[]` (CL-1.1 at LAB-1.3, CL-1.4 at LAB-1.4, CL-1.2 and CL-1.3 at LAB-1.5); `tcb[]` (z3-solver 5.3.1 [X RUN-z3-starter], CPython, the learner's encoding). A changed statement hash voids its claim to [?].

### 3.3 Hint ladders (M-hint-ladder, A−/C; authored here, shipped by W2-T06)

Explanation gate before any rung: state the failing check, the property and a hypothesis in at least 12 words. **R0** (every check): write a teach-back, then compare it with three authored ideas and tick those covered; self-assessed, never credit. Past R2 the check is credited as assisted until an unseen variant passes unassisted.

| Check | R1 · the concept | R2 · where to look | R3 · a fragment (≤ 3 lines) | R4 · the design in prose |
|---|---|---|---|---|
| c1 | `sat` gives a witness; `unsat` says none exists in this encoding | the version line: is `uv` using the pin? | `uv run --with z3-solver==5.3.1 python starter.py` [X RUN-z3-starter] | run the pinned solver and read both verdict lines |
| c2 | assert the premises and the negation of the property | the sender's post-state and the comparison's direction | `s.add(a >= 0, b >= 0, amount > 0)` · `s.add(Not(a - amount >= 0))` · `print(s.check(), s.model())` | the property holds for every allowed input; its negation asks for one allowed input that breaks it; a model of that is the counterexample |
| c3 | an `unsat` needs a satisfiable premise query beside it | which constraint makes the premises empty, or the guard too strict | `p = Solver(); p.add(premises + [guard])` · `print(p.check())` | check the violation (expect `unsat`), the premises alone (expect `sat`), and that the guard admits exactly the transfers with sufficient funds |
| c4 | fix the class, not the instance: a fix must kill witnesses you have not seen | the branch where the debit differs from the credit | `If(r <= m, ok_state, s)` | reject a refund the merchant cannot cover, and make the debit equal the credit on every accepted path |
| c5 | a step is a relation between S and S′; two steps chain S′ to S″ | the guard of the second capture | `cap1 = capture(S0, S1)` · `cap2 = capture(S1, S2)` · `s.add(cap1, cap2, M2 - M0 > h)` | a capture must consult the hold's status, not the pooled balance; then the second capture is rejected whatever else is held |
| c6 | each README field maps to one receipt fact | the receipt's verdict lines and statement hashes | `statespace receipt verify receipts/<file>` | copy verdicts from the receipt, replay the example model, and state the encoding and its untested assumptions under Limitations |

### 3.4 Prove-it (M-prove-it, C/D · Prec; shipped with GEN-defend in W2)

`statespace defend lab1` seeds mutations of the learner's own artifact, with the agent closed. The learner predicts each affected verdict, with a call; Z3 computes the keys at grade time on the mutated files. GEN-defend templates 1–3:

| # | Mutation | Predict |
|---|---|---|
| 1 | drop `amount > 0` (`Int`) | the guarded sender's verdict, and any recipient query's |
| 2 | weaken the guard to `amount ≤ a + 1` | the violation verdict |
| 3 | tighten `≤` to `<` in the guard | the violation verdict, and whether LAB-1.c3's sufficient-funds equivalence still passes |
| 4 | switch `Int` to signed BitVec 64 throughout | each of LAB-1.3's and LAB-1.5's verdicts |
| 5 | drop one conjunct of the fixed refund (seeded choice) | the mint verdict |
| 6 | drop the status check from the fixed capture | the at-most-once verdict |

### 3.5 Statement pins, lanes and the stuck protocol

**Statement pins.** LAB-1 is not a Lean lab, so there is no challenge pack or `comparator.json`. Its statements are pinned as `claims/cl-1-*.smt2`, hashed on every receipt (I7); a changed hash voids the claim to [?].
**Lanes** (internal names; learners see badge words). Lane A, the learner's Rust graded in the tab: none in LAB-1; the first is LAB-3 (LAB-8.4 on the builder's path). Lane B, receipts from real tools: `uv run` receipts imported by file or URL fragment, their witnesses re-checked in the tab. A learner without Python runs every stage in the tab on INS-z3.
**Stuck protocol** (M-stuck-protocol, D · Prec). At 25, 45 and 90 minutes `statespace stuck` packages the failing check, the query's SMT-LIB and the stated property into a forum-ready minimal example with private paths stripped. At 90 minutes the check can be parked: the claim carries the unchecked property as [A], and a re-find is scheduled in 7 days.

---

## 4. Specimens SP-1.1–SP-1.10

Labels are generated from runs (M-specimen-cabinet, A/B [keith08]); a specimen is "mounted" when its run exists and "kept" after a re-find at 7 days or more. Placeholder witnesses are described by property only; their values arrive with the run.

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-1.1 overdraft | `[b = 0, amount = 1, a = 0]` [X RUN-z3-starter]; Boot's witness {{run:RUN-z3-boot-variant}} | sender ≥ 0 after the transfer | no condition on the sender's balance (in Boot, the guard read the recipient's) | for the objective "minimize amount": amount = 1 [X RUN-z3-optimize-min] | `amount ≤ a`, then `unsat` [X RUN-z3-starter] | [X RUN-z3-starter, RUN-z3-optimize-min]; {{run:RUN-z3-boot-variant}} |
| SP-1.2 double capture | one HELD hold captured twice; the merchant gains twice the hold | CL-1.3 | capture never consults the hold's status (the patch `held ≥ h` consults the pooled balance and still fails) | to record (minimize the hold) | capture requires `status = HELD` and sets CAPTURED | {{run:RUN-z3-double-capture}} |
| SP-1.3 refund mint | a refund above the merchant's balance credits the customer in full while the merchant is clamped at 0 | CL-1.4 (`total′ ≤ total`) | the clamp protects non-negativity instead of rejecting | to record (minimize the minted amount) | reject when `r > m`; debit equals credit | {{run:RUN-z3-refund-mint}} |
| SP-1.4 recipient wrap | `A = 9223372036854775806, B = 9223372036850581504, X = 4194304` [X RUN-z3-bv64]; Pyodide, related query: `M = 9223372036854775803, B = 9223336852482686975` [X RUN-z3-bv64-pyodide] | recipient ≥ 0, signed 64-bit | the guard bounds the debit, not the credit; B + X = 2⁶³ reads as −2⁶³ | not minimized | a credit guard, checked arithmetic, or an unbounded type | [X RUN-z3-bv64, RUN-z3-bv64-pyodide] |
| SP-1.5 mixed signedness | `A = 13835060254305419776, X = 4611686018427387904` [X RUN-z3-bv64] | sender ≥ 0, signed reading | unsigned guard, signed property; A's top bit is set | not minimized | one reading in every comparison | [X RUN-z3-bv64] |
| SP-1.6 vacuous unsat | the premises alone are `unsat`; core `amount > 0`, `amount ≤ MAX_TRANSFER` with MAX_TRANSFER = 0 | non-vacuity | contradictory premises "prove" every property | the two-constraint core (to record) | a premise query beside every `unsat`; fix the config | {{run:RUN-z3-vacuous-unsat}} |
| SP-1.7 reason-stable unknown | `x**y == 8, y > 1` → `unknown`, "incomplete (theory arithmetic)" [X RUN-z3-unknown-pow] | none: a verdict specimen | nonlinear exponentiation lies outside what Z3 decides, though x = 2, y = 3 solves it | n/a | read the reason; never treat it as safety; fail closed in enforcement | [X RUN-z3-unknown-pow] |
| SP-1.8 tool trust | `timeout` 2000 never returned (external stop at 25 s); `rlimit` 5000000 → `unknown (canceled)` in 1.1 s [X RUN-z3-budget-pyodide] | the expectation that a set budget bounds the run | observed in the course's Pyodide build under Node (§13, issue 3); cause not established | n/a | budgets as `rlimit`; `worker.terminate()` | [X RUN-z3-budget-pyodide] |
| SP-1.9 Bitcoin 2010 (dated) | toy model: two signed 64-bit outputs, each ≥ 0, whose wrapped sum passes `sum ≤ input` while one output exceeds the input | "no transaction creates value" | outputs summed in 64-bit arithmetic without a range check [btc2010] | n/a | a range check on each output before summing; the 2010 fix rejected overflowing outputs and outputs over 21 million BTC [btc2010, V] | {{run:RUN-z3-btc2010}} |
| SP-1.10 Bloch 2006 (dated) | toy model: signed BitVec 32 with `0 ≤ low ≤ high` and `mid = (low + high) / 2` below zero | `low ≤ mid ≤ high` | `low + high` exceeds the largest `int` [bloch06] | n/a | `low + (high − low) / 2` or `LShR(low + high, 1)`, Java's `>>>` [bloch06, V] | {{run:RUN-z3-bloch06}} |

---

## 5. Claim templates CL-1.1–CL-1.5

Six fields plus a requirement row; the strip reads proposition-of-model · correspondence · requirement-fit, and requirement-fit is never [P]. Cards fade: CL-1.1 and CL-1.4 arrive prefilled from the receipt except the requirement row; CL-1.2 and CL-1.3 leave the proposition and "if weakened" to the learner; CL-1.5 is learner-written except method, tool and version.

**CL-1.1 · The guarded transfer never overdraws the sender (`Int`)** · minted S1.L3, LAB-1.3.
*Proposition:* ∀ a, b, amount ∈ ℤ. a ≥ 0 ∧ b ≥ 0 ∧ amount > 0 ∧ amount ≤ a → a − amount ≥ 0. *Assumptions:* balances are unbounded integers [A] (SEAM-1, dashed); the solver is sound [A] (SEAM-7, dashed); callers reject amount ≤ 0 [A]. *Model:* one step over Z3 `Int`, sender and recipient distinct; `claims/cl-1-1.smt2`. *Method:* violation `unsat` [X RUN-z3-starter]; premise query `sat` {{run:RUN-z3-vacuous-unsat}}; build-time diversity check, cvc5 `unsat` [X RUN-cvc5-alethe]. *Correspondence:* no code named: [A] "the code computes a − amount without overflow"; open defeater "encoding unverified". *If weakened:* drop the guard → `sat` at `[b = 0, amount = 1, a = 0]` [X RUN-z3-starter]. *Requirement:* "no transfer leaves the paying account below zero" [A]; the recipient [N]. *Stamp:* PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit N; open defeater "encoding unverified". *Strip:* [P] · [A] dashed · [A].

**CL-1.2 · A transfer conserves the total (`Int`)** · minted S1.L4, LAB-1.5.
*Proposition:* ∀ a, b, amount. a′ = a − amount ∧ b′ = b + amount → a′ + b′ = a + b. *Assumptions:* SEAM-1; SEAM-7; the two accounts are distinct [A]. *Model:* two `Int` variables, no guard. *Method:* negation `unsat` [X RUN-z3-conservation-noguard]; the step relation's `sat` is on the learner's receipt (LAB-1.c5). *Correspondence:* [A] "the code updates two distinct rows". *If weakened:* let the accounts alias under a map encoding with the stale-read update → `sat [n = 1, t = 0, f = 0]`, the balance rising by 1 [X RUN-z3-selftransfer]; S2.L8 returns to it. *Requirement:* "transfers neither create nor destroy money" [A]. *Stamp:* [P] · Z3 5.3.1 unsat · uncertified · rlimit N.

**CL-1.3 · A hold is captured at most once** · minted S1.L4, LAB-1.5.
*Proposition:* for a hold h with status HELD and held ≥ h > 0, two successive fixed captures give merchant″ − merchant ≤ h. *Assumptions:* `Int` balances (§13, issue 9); SEAM-7; captures arrive one at a time [A]; status is stored per hold [A]. *Model:* S → S′ → S″ over `Int` with a status variable. *Method:* violation `unsat`; one capture succeeds, `sat` {{run:RUN-z3-double-capture}}. *Correspondence:* [A] none named. *If weakened:* drop the status guard → `sat`, the merchant gaining 2h {{run:RUN-z3-double-capture}}. *Requirement:* "a hold pays out at most once" [A]; TigerBeetle documents the same rule [tb2pc, V]. *Stamp:* [P] · Z3 5.3.1 unsat · uncertified · rlimit N.

**CL-1.4 · The fixed refund never mints** · minted LAB-1.4 (first weekend), revisited in S1.L4.
*Proposition:* ∀ c, m, r ∈ ℤ. c ≥ 0 ∧ m ≥ 0 ∧ r > 0 → total(refund(c, m, r)) ≤ c + m, a rejected refund leaving the state unchanged. *Assumptions:* `Int` balances; SEAM-7; callers reject r ≤ 0 [A]. *Model:* one refund step over `Int`. *Method:* mint query `unsat` and premise query `sat` {{run:RUN-z3-refund-mint}}, and on the receipt for two fresh parameter sets (LAB-1.c4). *Correspondence:* [A] none named. *If weakened:* restore the clamp → `sat` {{run:RUN-z3-refund-mint}}. *Requirement:* "refunds move money and never create it" [A]; "refunds of one charge never exceed it" [N]. *Stamp:* [P] · Z3 5.3.1 unsat · uncertified · rlimit N.

**CL-1.5 · Under signed BitVec 64 with amount > 0, the guarded sender cannot go negative** · minted S1.L5.
*Proposition:* ∀ A, B, X ∈ BV64. A ≥ₛ 0 ∧ B ≥ₛ 0 ∧ X >ₛ 0 ∧ X ≤ₛ A → A − X ≥ₛ 0, arithmetic modulo 2⁶⁴. *Assumptions:* the code's integers are 64-bit two's complement and wrap [A], which a Rust release build does and a debug build or PostgreSQL does not ({{run:RUN-rust-i64}}; [X RUN-pg-claims]); SEAM-7; callers reject amount ≤ 0 [A]. *Model:* one step over BitVec 64, signed operators. *Method:* violation `unsat`; the recipient-wrap model satisfies every premise, so it serves as the premise witness [X RUN-z3-bv64]. *Correspondence:* [A] naming the runtime, for example "Rust `i64`, release build"; otherwise [N]. *If weakened:* drop amount > 0 → `sat` {{run:RUN-z3-bv64-negamt}}; an unsigned guard → `sat` [X RUN-z3-bv64]. *Requirement:* recipient non-negativity [N] [X RUN-z3-bv64]. *Stamp:* [P] · Z3 5.3.1 unsat · uncertified · rlimit N; recipient not covered [N].

---

## 6. Seams and erosions

| Seam | Assumption | Planted in S1 | Erosion | Cashed (lesson · specimen) | Segment cracked | Remedies offered |
|---|---|---|---|---|---|---|
| SEAM-1 | Balances are unbounded integers | S1.L3, S1.L4 via CL-1.1, CL-1.2; carried by CL-2.1–CL-2.4 | ER-1 | S6.L4 · SP-6.4: PostgreSQL raises 22003 on a credit the model commits [X RUN-pg-claims] | correspondence ("allowed ⇒ succeeds" fails); conservation untouched | bounded semantics and re-prove; `Except Overflow` observable in R; `numeric` with a stated bound; surfaces D-30 |
| SEAM-7 | The solver is sound | S1.L3 via CL-1.1's "uncertified" qualifier | ER-7 | S4.L9 · SP-4.5: Z3 #11179's inputs give a wrong `unsat` on 5.3.0 and `unknown` on 5.3.1 [X RUN-z3-11179] | assumption record (solver soundness) | a cvc5 cross-check; the "uncertified" qualifier; surfaces D-32 |

S1.L5 foreshadows ER-1 through the table's PostgreSQL row and fires nothing. Each erosion opens with a forecast (M-erosion-forecast): restate the claim from memory, then call the segment that cracks. Both erosions fire on both published paths, because S1 precedes S4 and S6 on each.

---

## 7. Audit anchors AUD-1.1–AUD-1.3

| Anchor | Class | Sound twin (key) | Flawed variant (key) | Based on (dated, sourced) | Typed evidence |
|---|---|---|---|---|---|
| AUD-1.1 | G2 vacuous premise | "unsat, therefore safe" beside a `sat` premise query [X RUN-z3-starter]; {{run:RUN-z3-vacuous-unsat}} | the same claim over contradictory premises: the premises alone are `unsat` {{run:RUN-z3-vacuous-unsat}} | PutnamBench #361, opened 2026-10-12, "hypotheses are inconsistent, statement is vacuous": a readability refactor lost parentheses, and "→ binds weaker than ∧" (https://github.com/trishullab/PutnamBench/issues/361; open, fix PR #362 open; read 2026-10-23 [V]) | the premises alone `unsat`, anchored to the conflicting lines |
| AUD-1.2 | G4 encoding slip | a signed BitVec 64 guard with `amount > 0`, claim limited to the sender [X RUN-z3-bv64] | an `Int` model shipped for `i64` code with a claim covering the recipient, refuted by the BitVec witness [X RUN-z3-bv64] | Bitcoin CVE-2010-5139, 2010-08-15: outputs "so large that they overflowed when summed" (https://en.bitcoin.it/wiki/CVE-2010-5139; read 2026-10-23 [V]) | a witness under BitVec semantics |
| AUD-1.3 | G5 inconclusive as proof | `unsat` under a stated `rlimit` with a premise witness, stamped with its budget | `unknown (canceled)` [X RUN-z3-budget-pyodide] reported as "no counterexample found" | S3 Block Public Access, ESEC/FSE 2020: "we choose to fail closed: if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" (https://doi.org/10.1145/3368089.3409728, p. 8; read 2026-10-23 [V]) | the raw verdict line and its reason |

**Variants** (GEN-spot-the-gap templates 1, 2 and 4; Z3 recomputes every key. Mechanics: M-audit-desk, A small [alemdag25]; M-twins, A [alfieri13].) G2: drop parentheses so a premise swallows the conclusion (the #361 shape); add a contradictory hypothesis; a config default that empties a range. G4: ℤ → BitVec 64; a signed operator swapped for its unsigned twin; `amount > 0` dropped under BitVec. G5: `unknown (canceled)` or a timeout reported as safe; a check over balances up to a bound stamped [P]; a verdict line without its budget. Sound variants: renamed variables, reordered conjuncts, an extra satisfiable premise, a sender-only BitVec claim. Cases follow the §6 flow of the spine (call the statement, reveal the diff, "This proves: ___", a class with no default, typed evidence); they are browsable at any time, scheduled into Today after LAB-1 (0–1 per session) with a seeded 30–60% sound share, and re-checked a week later.

---

## 8. The S1 Defence

Untimed, over at least two sessions within a week of LAB-1; ships with W2-T12 (M-defence, B−).

- **Part A, probes** (about 25–30 min; agent closed; a call on each): 10 unseen-seed items: GEN-negate-it ×3 (templates 1, 2 and 4, write mode once eligible), GEN-find-the-witness ×3 (template 1: an overdraft, a BitVec wrap, a mint), GEN-call-it ×3 (template 1 twice, template 4 once), GEN-which-stamp ×1 (template 1 or 2). The completion tests as items: why a violation search asserts the negation (GEN-call-it template 4 plus a GEN-negate-it write); what `sat`, `unsat` and `unknown` mean precisely (GEN-call-it template 4, GEN-which-stamp); why the answer depends on the encoding (GEN-call-it template 1 on an `Int`/BitVec pair, a BitVec witness); what changes if `amount` may be zero or negative (GEN-call-it template 1; over `Int` a zero amount is a no-op and a negative one passes `amount ≤ a` and drains the recipient, and under BitVec the sender can wrap {{run:RUN-z3-bv64-negamt}}).
- **Part B, defend** (about 15 min): four mutations of the learner's Project 00, predicted first, keyed by Z3 on the mutated files: drop `amount > 0` under BitVec 64; replace `≤` with `<` in the guard (§13, issue 8); switch `Int` to BitVec 64; drop a conjunct of the refund rule. Every mutant runs (GATE-labs).
- **Part C, audit** (about 20 min): four cases from the AUD-1.1–AUD-1.3 twin pool and its variants, at least one sound, typed evidence required.
- **Part D, explain-back** (about 10 min; required, uncredited): a 2-minute oral on why searching for a violation means asserting the negation, then a 3-idea self-check compared with Part A.

**Signed off** when A–C reach 75% overall and Part A at least 60%, Parts B and C (four items each) with at most one miss, the Wilson interval shown; plus fresh items on the ten S1 KCs correct in at least three spaced sessions. **Settled** when a fresh probe per KC is correct at 30 days or more. A failed part is retaken on fresh seeds at least 3 days later; nothing locks meanwhile.

---

## 9. Drawers used

| Drawer | Holds, for S1 | Surfaced in |
|---|---|---|
| D-01 A proof is not a test | 200 green tests against every input | Boot, S1.L1 |
| D-02 Propositions, implication and vacuity | the truth table; false → anything | S1.L3 |
| D-03 Quantifiers and negation | ∀/∃ duality, De Morgan, "only if", "unless" | S1.L1 |
| D-04 State as functions, steps as relations | primed variables; chaining S → S′ → S″ | S1.L4 |
| D-06 The anatomy of a guarantee | the six fields and the strip | S1.L3, LAB-1.6 |
| D-13 SMT-LIB in one page | raw verdict lines, `reason_unknown`, `.smt2` statement files | S1.L2, LAB-1.6 |

No deferred drawer surfaces in S1: D-30 waits for ER-1, D-32 for ER-7.

## 10. Reading list (dated, section-level)

| Pointer | Sections | Read | For |
|---|---|---|---|
| Z3 guide, "Z3 API in Python", the roadmap's Z3Py introduction: https://microsoft.github.io/z3guide/programming/Z3%20Python/Introduction/ | Getting Started; Boolean Logic; Solvers; Arithmetic; Machine Arithmetic; Satisfiability and Validity | 2026-10-23 [V] | all lessons, LAB-1.1 |
| AWS Automated Reasoning checks concepts: https://docs.aws.amazon.com/bedrock/latest/userguide/automated-reasoning-checks-concepts.html | "Findings and validation results"; "Validation results reference" and its note on VALID | 2026-10-23 [V] | S1.L2, S1.L5 |
| TigerBeetle, "Two-Phase Transfers": https://docs.tigerbeetle.com/coding/two-phase-transfers/ | Reserve Funds (Pending Transfer); Resolve Funds; Errors | 2026-10-23 [V] | S1.L4 |
| Bouchet et al., "Block public access: trust safety verification of access control policies", ESEC/FSE 2020 [bpa] | §4, the VC (p. 6); the fail-closed sentence (p. 8) | 2026-10-23 [V] | S1.L1, S1.L2, AUD-1.3 |
| Bitcoin wiki, CVE-2010-5139 [btc2010] | the whole page | 2026-10-23 [V] | Boot, SP-1.9, AUD-1.2 |
| Bloch, "Extra, Extra – Read All About It: Nearly All Binary Searches and Mergesorts are Broken", 2006-06-02 [bloch06] | the buggy line, the fixes, the 2008-02-17 update | 2026-10-23 [V] | SP-1.10 |
| PutnamBench issue #361 | the issue text | 2026-10-23 [V] | AUD-1.1 |

The guide's embedded runner names its own Z3 build in its footer; LAB-1 compares nothing against it, and course verdicts come only from the pinned Z3 5.3.1 [X RUN-z3-starter].

## 11. Runs this stage needs

**Executed and cited:** RUN-z3-starter, RUN-z3-starter-pyodide, RUN-browser-origin, RUN-z3-optimize-min, RUN-z3-conservation-noguard, RUN-z3-bv64, RUN-z3-bv64-pyodide, RUN-z3-unknown-pow, RUN-z3-budget-pyodide, RUN-z3-selftransfer, RUN-cvc5-alethe, RUN-pg-claims, and RUN-z3-11179 (ER-7's endpoint).

**To record in W1-T12** (natively and on Pyodide; every authored `unsat` cross-checked on cvc5 by GATE-calls):

| Run | Must record |
|---|---|
| RUN-z3-boot-variant (new) | Boot's variant: verdict and replaying witness; doubles as the cold-start fallback |
| RUN-z3-demorgan (new) | S1.L1's mis-negation (expected `unsat`) and the correct negation (expected `sat`, witness) |
| RUN-z3-vacuous-unsat | CL-1.1's premise query (`sat`); the MAX_TRANSFER = 0 config: violation, absurd property, premises alone, unsat core |
| RUN-z3-double-capture | S1.L4 cell 2's queries (i)–(v); Optimize on the hold amount |
| RUN-z3-refund-mint | the clamp's mint; Optimize on the minted amount; the special-case patch's non-minimal witness; the fixed rule (`unsat`) and its premise query (`sat`) |
| RUN-z3-bv64-negamt | signed BitVec 64 without `amount > 0`; plus the `Int` twin from `evidence/a2r3/scripts/z3_negamt.py` |
| RUN-z3-btc2010, RUN-z3-bloch06 | the §4 toy models, buggy and fixed |
| RUN-pg-numeric-bound, RUN-rust-i64 | the two placeholder rows of the six-row table |
| RUN-phone-pyodide (W0-S02) | Boot's first-load size for the consent prompt |

## 12. Time budget against the roadmap

| Part | Planned [D] | Basis |
|---|---|---|
| Reading | 0.5–1.0 h | §10, the guide's sections first |
| Lessons | 2.2–3.4 h | Boot 8 min; two core at 40–60 min; three bridges at 15–25 min (133–203 min) |
| Build | 1.5–2.9 h | LAB-1.1–LAB-1.5 at 87 nominal minutes, up to 2× |
| Write | 0.4–0.8 h | LAB-1.6 at 25 nominal minutes, up to 2× |
| Defence | 0.75–1.25 h | 45–75 min over two sessions |
| **Total** | **5.3–9.4 h** | the roadmap's 2–4 focused sessions, read as at most 10 h (spine §12 item 11): GATE-budget passes, and no lower-bound warning |

The first weekend (Boot, S1.L1–S1.L3, reading, LAB-1.1–LAB-1.4, LAB-1.6) plans at 3.25–5.9 h against the roadmap's 3–5 h; week 2 holds S1.L4, S1.L5 and LAB-1.5 (1.3–2.3 h) and the Defence. The Keep block comes off the top: ten new KCs at about ten graded reviews each, two minutes apiece, is about 3.3 h across their first 60 days [D], inside the planned block. S1 mints CL-1.1 and CL-1.4 in the first weekend, meeting the cadence of two claims by about week 4.

---

## 13. Spine issues

Each item names where this file departs from, or depends on a change to, the spine. Nothing here is applied silently.

1. **Boot's variant has no run.** The spine cites RUN-z3-starter-pyodide for Boot's cold-start fallback, but that run records the roadmap's starter, which Boot must not use (V2-05). Add RUN-z3-boot-variant to §9.5 and to SP-1.1's status. Boot's fallback label also should not introduce the term "run" before S1.L1; this file says "recorded result".
2. **Cross-engine witnesses.** SP-1.4 and §8.4 say native and Pyodide witnesses differ [X RUN-z3-bv64-pyodide], but the two runs used different queries (native: the guarded transfer over A, B, X; Pyodide: `B ≥ 0, M > 0, B + M < 0`). The grading rule stands; reword the evidence or re-record the native query on Pyodide.
3. **"In the tab" rests on Node.** RUN-z3-budget-pyodide and RUN-z3-bv64-pyodide (`A5r3/z3-pyodide.log`) ran Pyodide under Node, and RUN-z3-unknown-pow's non-native evidence is Node-hosted wasm; browsers ran only the starter (RUN-z3-starter-pyodide). SP-1.8's "never fires in the tab" and INS-z3's limits should say "under Pyodide (Node harness)" until W0-S02 records them in browsers.
4. **No misconception namespace.** GATE-items requires a misconception ID on every option, but the spine defines none, and the digest's G1–G9 and S1–S4 collide with gap classes and stage IDs. This file writes `dp:…`; register a prefix (for example `MC-`) and the two proposed entries dp:Z6 and dp:Z7 (§1).
5. **CL-1.1 lacks a premise-witness run.** No executed run records the guarded premises alone; extend RUN-z3-vacuous-unsat to record them (§11).
6. **The negative-amount twin.** The A2 review's `Int` result for a guard without `amount > 0` was never committed; record it inside RUN-z3-bv64-negamt, since the Defence's zero-or-negative item needs both encodings.
7. **Two new S1 runs.** RUN-z3-boot-variant and RUN-z3-demorgan join §9.5's "To record"; with D-13's RUN-z3-smtlib-tour, W1-T12's acceptance becomes eleven S1 runs, not eight.
8. **"Weaken ≤ to <" tightens.** In S1 Defence Part B, `amount < a` admits fewer transfers, so it cannot make the violation query satisfiable; only the sufficient-funds check can fail. Rename it "tighten ≤ to <" (a useful surprise item) or replace it with a genuine weakening such as `amount ≤ a + 1`.
9. **SEAM-1's claims.** CL-1.3 and CL-1.4 are `Int` claims too, yet SEAM-1 lists only CL-1.1 and CL-1.2, so ER-1 would not propagate to them. Add them, or record why not.
10. **One prequestion, two KCs.** §3.0 gives bridges one prequestion; GATE-kc wants one per KC in its first lesson. S1.L2 and S1.L3 tag one prequestion with both KCs; the spine should say that satisfies the rule.
11. **Twins without a SHA.** RUN-twin-pins pins twins "at a SHA", but the AWS Automated Reasoning checks card is a docs page. Record a content hash and read date for non-repository twins.
12. **First-weekend order.** LAB-1.4 precedes S1.L4, so the refund is authored in expression form (no primed variables), and S1.L4 grades a fresh refund variant rather than re-calling LAB-1.4's answer.
13. **W1 without ladders and Prove-it.** §3.0 requires hint rungs and Prove-it on every lab, but they ship in W2 (W2-T06, W2-T11). W1's exit should state that learner-zero's Project 00 runs without them.
14. **A possible extra erosion.** CL-1.3 assumes captures arrive one at a time, which is SEAM-2's content; consider letting ER-2 crack CL-1.3 as well.
