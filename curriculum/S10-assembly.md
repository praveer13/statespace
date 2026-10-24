# S10 Assembly: the Core, the demonstration, the published report

**Status:** authoring spec for W5 (W5-T06 report export, W5-T07 LAB-10 and the demonstration recorder, W5-T11 `statespace audit`, W5-T12 the private overlay, W5-T13 the Clearinghouse provider and ER-12). **Date:** 2026-10-23. **IDs:** every ID comes from `docs/spine/SPINE.md` (revision 2); anything the spine lacks is proposed in §13, never used silently. Draft: first-learner pass pending.

**Sources, in precedence order:** the roadmap (Stage 10, learning rules 3–6); executed runs (`research/spikes/RESULTS.md`; `research/evidence/a2r3/out/z3_5.3.1.txt`, `pg_claims.txt`, `cvc5_alethe.txt`, `z3_11179_cli.txt`; `A5r3/comp-run2.log`, `comp-run5.log`); the brief (§4, §7.7); the four digests; reports R2, R5 and L4; the spine.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D follow the pedagogy digest. Learner copy appears after "Copy:"; everything else is for authors. Learner copy uses only the spine's §0 glossary plus plain English: "step briefing", "re-entry card", "report pass", "traversal rule" and "evaluator" are authoring names, and learner copy says "doubt" where the sources say "defeater".

**Pins used in this stage.** Z3 5.3.1 [X RUN-z3-starter]; cvc5 1.4.2 (the executed run used the pip wheel, whose version string reads `1.4.2-modified` [X RUN-cvc5-alethe]; the Bench binary is {{run:RUN-scaffold}}); Lean 4.35.0 [X RUN-lean-ledger], edition pin 4.35.x (OD-12); PostgreSQL 18.6 [X RUN-pg-anomalies]; `tla2tools` 1.8.0, pinned by SHA-256 and labeled pre-release [X RUN-tlc-jars]. S10 adds no new tool.

---

## 0. The stage at a glance

**Promise.** Assemble the Core, let it judge an agent's proposal in front of you, and publish a report that says exactly what each part establishes.

**Roadmap.** "Combine a tiny parsed/typed language, a reference interpreter, SMT obligations, reproducible counterexamples, a Postgres compiler, and an executable transaction runtime." Then the demonstration and publication of "the operational semantics, theorem statements, counterexamples, tool versions, and known limitations". Time: open-ended; the spine caps the final assembly at six weeks.

**Steps, not lessons.** S10 has seven capstone steps, tier `[step]`, outside the 76 lessons and every lesson count (spine §3.10, §12 item 2). Five were built in earlier labs; S10 wires them and adds two steps of new work.

| Step | Title | Built in · gate | KCs | Claims |
|---|---|---|---|---|
| S10.L1 | Parser and typechecker | LAB-3.8–LAB-3.9 · golden tests against the S3 IR | S3 KCs | — |
| S10.L2 | Reference interpreter as oracle | LAB-3.10–LAB-3.11 · [T] (n goldens) | S3 KCs | CL-3.5 |
| S10.L3 | SMT obligations with counterexample replay | LAB-4.5 · every [R] replays | S4 KCs | CL-4.2 |
| S10.L4 | Postgres compiler and runtime with retries | LAB-6.8 · the S6 differential suite passes | S6 KCs | CL-6.1, CL-6.2 |
| S10.L5 | Systematic testing | LAB-8.7 · seeds recorded | S8 KCs | CL-8.3 |
| S10.L6 | The demonstration | LAB-10.4–LAB-10.7 · recorded end to end | KC-10.agent-proposal-triage | CL-10.1 |
| S10.L7 | Publish | LAB-10.8–LAB-10.9 · the Defence over the report | KC-10.claim-graph-report, KC-10.defeater-log, KC-10.publish-limitations | CL-10.2 |

S10.L1–S10.L5 get re-entry cards (§2.1); S10.L6 and S10.L7 get step briefings (§2.2, §2.3).

**Step briefings.** The four S10 KCs need the in-lesson dose of spine §4.1, which GATE-kc checks "in its first lesson", but no S10 KC has a lesson. S10.L6 and S10.L7 therefore each carry a step briefing with core-lesson anatomy: prequestions, three 12–15-minute segments with one instrument run (Call It on the first run) and one graded item each, exit items, Today cards, a twin card and a "Build this" card. Briefings keep the `[step]` tier and stay out of lesson counts (§13, issues 1–2).

**KCs of S10** (spine §4; none is a threshold KC; KC-10.agent-proposal-triage is an outcome-(g) core KC and belongs to confusable set C, gap class):

| KC | Requires | First taught | Spiral returns |
|---|---|---|---|
| KC-10.agent-proposal-triage | KC-4.trust-stack, KC-2.kernel-not-requirement | S10.L6, segments 1–3 | the Clearinghouse's weekly proposals; Defence Part A (outcome g) and Part C |
| KC-10.claim-graph-report | KC-9.tcb | S10.L7, segment 1 | LAB-10.8; Defence Part D |
| KC-10.defeater-log | KC-10.claim-graph-report | S10.L7, segment 2 | LAB-10.8 pass 5; Today |
| KC-10.publish-limitations | KC-10.claim-graph-report | S10.L7, segment 3 | LAB-10.9; Defence Part A |

**Six weeks, as windows** [D]. The plan shows ranges and never "behind"; nothing locks.

| Window | Work | What it mints |
|---|---|---|
| Week 1 | LAB-10.1; re-entry cards with LAB-10.2–LAB-10.3; the ER-12 forecast arrives among the Clearinghouse's weekly incidents | refreshed receipts |
| Weeks 1–2 | S10.L6 briefing; LAB-10.4–LAB-10.5 | a specimen, or a fragment claim |
| Weeks 2–3 | LAB-10.6–LAB-10.7 | CL-10.1 |
| Weeks 3–5 | S10.L7 briefing; LAB-10.8 in nine passes | [C] and [N] claims; CL-10.2 |
| Weeks 5–6 | LAB-10.9; the Defence, untimed, within a week of it | the published bundle |

---

## 1. Conventions and design basis

### 1.1 Conventions

**Call It** (M-call-it). Three taps with printed bands: *guess* (below 67%), *think so* (67–80%), *sure* (above 80%); chance 1/k printed; payoffs +1/0, +2/−2, +3/−6 shown before choosing, used as feedback only. The first call is final: only it counts, and it cannot be edited. Each authored call carries a surprise forecast; §2.4 tallies them for GATE-items.

**Misconception tags** are the pedagogy digest's catalog IDs written `dp:X1`, `dp:P3` and so on, because the catalog's G1–G9 collide with gap classes G1–G13 (§13, issue 7). This spec uses no `dp:G*` tag. Four entries are proposed for the catalog, evidence "—" (log through Call It; keep only if they draw errors):

| Tag (proposed) | Misconception | Seed |
|---|---|---|
| dp:X6 | Doubt counts summed, averaged or ranked across claims, or printed as a confidence percentage | "the Core is 85% assured" |
| dp:X7 | A doubt retired by assertion, by deletion or by a fix elsewhere, rather than by a specimen, a receipt or a written argument | "the solver bug was fixed, so that doubt is gone" |
| dp:X8 | A composite claim stamped with its strongest part, or a claim reported without the assumptions it rests on | "the demonstration is PROVED" |
| dp:X9 | A result treated as reproducible without its version, binary hash, argv, bound, seed and statement hash; or a stale or voided result dropped instead of shown | "Z3 says unsat", with no version or rlimit |

**Graded items** name a family and template (spine §8.3; template numbers follow §8.3's order). Keys come from checkers or from the course's deterministic tools at grade time: the reference pipeline, `statespace export`, the claim-graph evaluator (§4.3) and the §8.8 table. No language model drafts, grades or keys anything at run time. S10 writes no new proof, so it has no Goal Replay plan; its two worked examples are complete, with no blanks.

### 1.2 What the evidence supports here

Expect tenths of an SD at most from any of this [kraft20]; no copy promises more.

| Choice | Grade | Basis |
|---|---|---|
| Retrieval prequestions before wiring months-old components | A | retrieval with application items [rowland14][pan18]; prequestions [sthilaire23]; idle skills decay [tatel25] |
| Correct, complete worked examples before each briefing's first call; no fading (S10's KCs are outside F1–F6) | A | [barbieri23]; spine §12 item 12 |
| Sound and flawed proposals side by side; the CTI twin | A | [alfieri13] |
| Proposals and audit cases as erroneous examples, after the labs that taught each checker | A (small) | [alemdag25] |
| A witness plus its class; a fix must also kill a non-minimal witness | B/C | [dantoni15][danas17] |
| The reference report is a skeleton; full exemplar reports are surfaced after the learner's first full draft and are reachable at any time from search and SCR-drawer under the label "read after your first draft" | B | exemplary peer work caused quitting (Rogers & Feller 2016; L4 F25) |
| The bundle names the artifact, never the learner's identity | B | noticed identity claims backfire (Gollwitzer et al. 2009; L4 F26) |
| Ranges, nine short report passes and release windows | B | plans run long, even pessimistic ones [buehler94] |
| One if-then plan at stage start against perfectionism | A (small) | [sheeran25] |
| The Defence within a week of LAB-10.9, untimed, over two or more sessions | B− (parts); C (the gap) | spine §8.6; [serth22] |
| Doubts kept as m of n per claim, statuses from Assurance 2.0, no severity scores | D (practice literature) | SRI-CSL-2024-01 §6; CMU/SEI-2015-TR-005 §2.1; R5 F35, F41, F42 |

**Anti-patterns refused** (BRIEF §3.3). No language model grades the demonstration or the report, or runs at grade time. Publishing earns nothing: no badge, no XP; only the Defence's unassisted evidence moves "signed off". Nothing locks: the report, the audit pool and the Defence are open before the demonstration ends. Release windows are not deadlines.

---

## 2. The steps

### 2.1 Grown steps S10.L1–S10.L5: re-entry cards

These components were built months earlier; their KCs stayed in Today, but wiring is a different act from recalling. Each re-entry card runs inside LAB-10.2 or LAB-10.3, before the wiring: one authored retrieval prequestion (generated isomorphs feed Today as GEN-call-it template 1), then a re-run of the step's own gate on the learner's current code. The re-run has no Call It, because it runs the learner's artifact, not an authored cell (predictions about it belong to Prove-it, §3.7). All five take 5–10 minutes; none is forecast as a surprise.

**S10.L1 · step · Parser and typechecker.** Objective (spine): parse and typecheck the roadmap's toy syntax into the JSON IR. KCs re-entered: KC-3.abstract-syntax, KC-3.typing-judgment, KC-3.resource-postings. Copy: "Your typechecker accepts an agent's command that assigns a number to `balance(from)`. What follows?" (k = 3)
- (a) "The command is safe: it type-checks." Typing rules out ill-formed programs, not invariant violations. `dp:S4`
- **(b) "Your typechecker has drifted from `HasType`'s resource rule; re-run the typing goldens."** The rule forbids assigning a resource field (S3.L2), so acceptance means the Rust mirror disagrees with the Lean judgment.
- (c) "Nothing yet: the obligation checker will catch what typing misses." Typing and obligation checking make different claims, and the checker assumes a well-typed IR. `dp:P3`

Gate re-run: LAB-3.c8 (IR equals the Lean export on the goldens) and LAB-3.c9 (agrees with the typing goldens on fresh seeds). Build this: LAB-10.2.

**S10.L2 · step · Reference interpreter as oracle.** Objective: run the IR with the same results as the kernel-checked goldens. KCs: KC-3.big-step-errors, KC-3.edge-cases-as-decisions, KC-3.goldens-as-theorems. Claim carried: CL-3.5. Copy: "Your Rust interpreter agrees with the kernel-checked goldens on n fresh seeds. Which stamp does that earn?" (k = 3)
- **(a) "[T] · n goldens, resting on the pinned Lean reference."** The goldens are theorems about the Lean reference; your interpreter's agreement with them is a test.
- (b) "[P] · Lean 4.35.0 kernel: the goldens are theorems." The kernel checked the goldens, not your Rust code. `dp:X1`
- (c) "[M] · n: the seeds bound the check." [M] names a model check over stated constants; agreement over sampled seeds is [T]. `dp:T5`

Gate re-run: LAB-3.c10 (agrees with kernel-checked goldens on fresh seeds, n reported). Build this: LAB-10.2.

**S10.L3 · step · SMT obligations with counterexample replay.** Objective: discharge obligations and replay every [R] in the interpreter. KCs: KC-4.vc-shape, KC-4.frame-condition, KC-4.trust-stack. Claim: CL-4.2. Copy: "Your checker returns `sat` on an obligation, and the decoded witness does not replay in the interpreter. What do you record?" (k = 3)
- (a) "[R]: the solver found the violation." A witness earns [R] only after it replays (spine §8.8). `dp:O5`
- **(b) "No stamp yet: open a doubt against both sides and triage the encoding, the decoder and the VC generator."** The interpreter is checked against kernel-checked goldens; the newer, unchecked pieces are the usual suspects.
- (c) "The interpreter is wrong; keep the solver's verdict." Solver output is evidence about your encoding, not about the semantics. `dp:O5`

Gate re-run: LAB-4.c5 (every [R] replays in the interpreter). Build this: LAB-10.2.

**S10.L4 · step · Postgres compiler and runtime with retries.** Objective: run compiled commands on PostgreSQL 18.6 with whole-command retries. KCs: KC-6.rowcount-as-guard, KC-6.overflow-refusal, KC-6.serializable-retries. Claims: CL-6.1, CL-6.2. Copy: "Your runtime retries whole commands on 40001 and 40P01. A credit fails with SQLSTATE 22003. What should it do?" (k = 3; codes as recorded [X RUN-pg-claims])
- (a) "Retry it, like a serialization failure." 22003 is not transient: PostgreSQL 18.6 refuses the value as "bigint out of range" [X RUN-pg-claims], a retry repeats the input, and LAB-6.c6 requires that 22003 is never retried. `dp:Q7`
- **(b) "Return a typed error without retrying: the model took a step the database refuses."** That is ER-1's correspondence failure (SP-6.4); the remedy lives in the semantics, not in a retry.
- (c) "Clamp the balance at the `bigint` maximum and commit." PostgreSQL raises; it neither wraps nor clamps, and clamping would change the semantics silently. `dp:Q6`

Gate re-run: LAB-6.c8 (the S6 differential suite passes through the runtime). Build this: LAB-10.3.

**S10.L5 · step · Systematic testing.** Objective: run seeded differential and fault-injection suites; failures become specimens. KCs: KC-6.differential-testing, KC-8.deterministic-simulation, KC-8.trace-validation. Claim: CL-8.3. Copy: "Your simulator's traces pass TLC trace validation on n seeds. What does the report print?" (k = 3)
- (a) "[P]: no seed failed." Sampled checks are never [P]. `dp:X1`
- **(b) "[T] · n seeds, composed with the spec's [M] and never merged into it."** Spine §8.8: trace validation over n seeds is [T] · n seeds composed with the spec's [M].
- (c) "[M] · n: the seeds bound the exploration." [M] belongs to the spec's model check; the implementation's traces are tested. `dp:T5`

Gate re-run: LAB-8.c7 (seeds recorded; every failure mounted as a specimen). Build this: LAB-10.3.

**Builder's path.** LAB-6 and LAB-8's early blocks may have run against the course's reference compiler, labeled "reference module, earns nothing" (spine §3.0). LAB-10.3 fails while any wired component is a reference module: the Core is the learner's own.

### 2.2 S10.L6 · step · The demonstration

**Observable objective.** Given an unseen, mutation-generated agent proposal (a transfer or authorization command in the toy syntax, its claim quoted as UNREVIEWED text), choose the checker for each part of the claim, run your own pipeline and decide: refute with a witness that replays, prove the obligation for a stated fragment with a premise witness, keep a correct command and strengthen a too-weak invariant after a CTI, or fail closed. Then run the accepted or corrected command on PostgreSQL 18.6 under your runtime with systematic tests, and record it end to end. Graded forms: GEN-call-it template 4, GEN-spot-the-gap templates 1–4, GEN-which-stamp templates 1 and 3.

**KCs:** KC-10.agent-proposal-triage. **Prerequisites** (spine `requires`): KC-4.trust-stack, KC-2.kernel-not-requirement. **Drawn on:** KC-1.non-vacuity-check, KC-4.vc-shape, KC-4.cti-or-bug, KC-4.prove-or-enforce, KC-6.differential-testing, KC-7.enforcement-vs-ni, KC-7.observer-equivalence, KC-9.three-claims. **Instruments:** INS-z3, INS-lane-a and INS-bench-pg (the spine's row), plus INS-interp for the reference replay and INS-receipt to show Bench runs on phones (§13, issue 5).

**Hook (≤ 1 min).** Copy: "An agent's pull request adds one command and says: 'Preserves conservation. 200 tests green.' The claim sits in quotes, unreviewed and unstamped. What would it take for you to accept it?"

**Prequestions** (≤ 2 min; both answered in segment 1).

P1. Copy: "Before you read the command, what do you need first?" (k = 4)
- (a) "Whether the 200 tests cover the edge cases." Tests sample behaviors; at best they give [T] · 200, and they do not say what was claimed. `dp:X1`
- (b) "Which tool the agent ran." A tool's name is not evidence, and an agent's assertion is never stamped, whatever it cites (I8). `dp:X2`
- **(c) "Which of your invariants the command must preserve, and which checker decides each."** Triage starts from your own invariant set and each claim's property kind, because a true claim can still be too weak.
- (d) "Whether it compiles." Compiling establishes parsing and typing (S10.L1), not invariant preservation. `dp:S4`

P2. Copy: "Your checker returns `unsat` on the agent's claim. May you accept the proposal?" (k = 3)
- (a) "Yes: `unsat` proves the claim for every input." It proves the claim for every input of this encoding, if the solver is sound, and says nothing about invariants the agent never claimed. `dp:L4`
- **(b) "Not yet: check the premise witness and every other invariant you require."** An `unsat` needs a satisfiable premise witness (S1.L3), and the claim may omit a requirement.
- (c) "No: `unsat` means the checker had nothing to say." `unsat` is a definite answer about the query; `unknown` is the answer with no verdict. `dp:Z2`

**Worked example first** (correct and complete, read before segment 1; every output from an executed run). Copy: "One proposal, triaged end to end. The agent's claim: 'computing both new balances from the old state is fine; a self-transfer leaves the balance unchanged.'"

| # | Move | Output | Stamp |
|---|---|---|---|
| 1 | Quote the claim; name its kind | a two-state property of one step | none: agent text, UNREVIEWED |
| 2 | Choose the checker | an obligation over S and S′ in Z3 | — |
| 3 | Run | `sat [n = 1, t = 0, f = 0]`: a self-transfer of 1 on account 0 changes its balance [X RUN-z3-selftransfer] | pending replay |
| 4 | Confirm the class in the kernel-checked model | `xferBuggy (fun _ => 10) 0 0 5 0 = 15`, by `decide` [X RUN-lean-selftransfer] | [R] · 1 step (SP-2.1) |
| 5 | Decide: change the system (CMU/SEI-2015-TR-005 §3.5.1) | read the destination after the debit | — |
| 6 | Re-check the fix | the fixed transfer gives 10 [X RUN-lean-selftransfer] | [P] for the fragment (CL-2.5, {{run:RUN-lean-finmap}}) |
| 7 | Run it on PostgreSQL 18.6 | two UPDATEs leave a balance of 100 at 100; one `CASE` UPDATE turns 100 into 70 on a self-transfer of 30 [X RUN-pg-claims] | [T] · 1 instance; [R] · 1 row (SP-6.7) |

Row 7 is the turn: the corrected command is proved, and one compilation of it still burns money. Command, compiler and runtime carry three claims that stay apart (KC-9.three-claims), which is why CL-10.1 is composite.

**Segment 1 — Read the claim, then your invariants (13 min).** Instrument run (INS-z3, authored cell): a proposal with no guard, `command Transfer(from, to, amount) do move amount from from to to`, claim "conserves money", encoded over two `Int` balances exactly as the cited runs encode it; one run checks the claim and your invariant set (conservation and sender non-negativity).

Call It. Copy: "What does Z3 return on the agent's claim, conservation over `Int`?" (k = 3; chance 1/3; surprise forecast: yes, since many expect a missing guard to break everything)
- (a) "`sat`: some input violates it." Over `Int`, (a − amt) + (b + amt) = a + b for every amount; the guard protects non-negativity, not conservation. `dp:L4`
- **(b) "`unsat`, printed as `proved`: no input violates it"** [X RUN-z3-conservation-noguard]. True of every input of this encoding, if the solver is sound. And not your requirement.
- (c) "`unknown`." Linear integer arithmetic is decidable here; `unknown` comes from nonlinear terms or a budget stop. `dp:Z2`

Reveal (same run): the non-negativity obligation is `sat` with minimal amount 1 from a sender at 0 [X RUN-z3-optimize-min], which is specimen SP-2.2. Copy: "The claim is true and too weak. Reject it, and say so in the requirement-fit segment; the proposition-of-model segment stays [P]." Gap class G1.

Graded item: GEN-call-it template 4 (multiple true/false, five statements). Template spec: draw an unseen proposal (§3.2) with its claim and offered evidence; instantiate five statements from five stems: (i) "the claim is a [single-state invariant | two-state property | 2-safety property | liveness property]"; (ii) "`unsat` on the claim shows that the command preserves your invariant set"; (iii) "'k tests green' makes the claim [T] · k, not [P]"; (iv) "a `sat` result becomes [R] once its witness replays in the interpreter"; (v) "the typechecker's acceptance establishes ⟨named invariant⟩". Keys at grade time: (i) from the proposal's IR claim schema; (ii) from the reference pipeline's per-invariant verdicts; (iii)–(v) from spine §8.8. Statement tags drawn from `dp:X1`, `dp:L4`, `dp:S4`, `dp:O5`, `dp:P3`.

**Segment 2 — Witness, then decide (13 min).** Teaches the decisions after a checker result, from eliminative argumentation's three ways to make counterevidence irrelevant (CMU/SEI-2015-TR-005 §3.5.1) [V]: change the system (fix the command); change the specification (narrow the claim honestly to a stated fragment, the roadmap's "restricted obligation"); attack the counterevidence (a witness that does not replay is invalid, so suspect the encoding). Two answers are not refutations: `unknown` fails closed, so prove-or-enforce applies (S4.L7), and a `sat` inductive step is not yet a bug (S4.L6).

Instrument run (INS-z3 with the CTI workbench over INS-interp, authored cell): the agent proposes a hold-capture command; your invariant's inductive step is `sat`; a bounded reachability search from `Init` runs to N {{run:RUN-z3-cti-pair}}.

Call It. Copy: "The search finds no reachable violation within N. What do you do with the proposal?" (k = 4; chance 1/4; surprise forecast: yes)
- (a) "Reject the command: `sat` means a violation." A `sat` inductive step is a counterexample to induction; it is a bug only if its pre-state is reachable. `dp:O3`
- (b) "Accept it and stamp [P]: nothing is reachable." "None within N" is [M] · bound N (CL-4.5's shape), never [P]. `dp:T5`
- **(c) "Keep the command; strengthen the invariant and re-check."** The pre-state is unreachable within N, so this is a CTI; once the strengthened invariant's step is `unsat`, CL-4.4's [P] holds for the fragment {{run:RUN-z3-cti-pair}}.
- (d) "Mark it [?] and enforce at commit." `sat` is a definite answer; enforcing is the fallback when proving fails, not the cure for a weak invariant. `dp:O2`

Graded item: GEN-spot-the-gap, templates 1–4 by draw (rebutting, undermining, undercutting, sound). Template spec: an unseen proposal variant with a sound share seeded in 30–60%; the learner calls the claim alone, sees the command, writes "This proves: ___", picks a class among G1–G13 or "none: sound" (no default), and anchors typed evidence: a witness that replays, the offending line, a scenario the claim permits and the requirement forbids, mismatched hashes, or paired states. Keys from the reference pipeline on the mutated twin.

**Segment 3 — From the checker to PostgreSQL (13 min).** Teaches that a proved command is one claim of three, and that CL-10.1 lists its parts and takes no single stamp. Instrument run (INS-bench-pg recorded run, shown by INS-receipt with its run id): the corrected self-transfer compiled two ways on PostgreSQL 18.6, account 1 at 100, a self-transfer of 30 [X RUN-pg-claims].

Call It. Copy: "Compiled as one `UPDATE … SET bal = CASE … END` over both rows, the self-transfer commits. What is the final balance?" (k = 4; chance 1/4; surprise forecast: no, it re-finds SP-6.7 in a new place)
- (a) "100." That is the two-UPDATE compilation; on one row, the first matching branch (`id = from`) applies only the debit. `dp:P3`
- **(b) "70"** [X RUN-pg-claims]. Specimen SP-6.7: the command claim holds, and this compilation does not preserve meaning.
- (c) "130." The credit branch is never reached once the debit branch matches. `dp:X2`
- (d) "An error, 22003." 22003 needs a value past the `bigint` range [X RUN-pg-claims]. `dp:Q6`

Graded item: GEN-which-stamp template 1 (raw output → stamp). Template spec: five raw outputs from a generated demonstration (a checker verdict line with rlimit and premise witness; a replay result; a differential summary with n, generator statistics and engines; a PostgreSQL attempt log by SQLSTATE; a `transaction_isolation` read-back), each mapped to stamp and qualifier by spine §8.8; a sixth line asks for the composite's stamp, keyed "none: list the parts". Tags `dp:X1`, `dp:X8`, `dp:Q7`.

**Exit items** (each creates a Today card).
- E1: GEN-spot-the-gap on a fresh proposal variant, any template.
- E2: GEN-which-stamp template 3 (which strip segment). Seed: "The agent's claim is [P]; your non-negativity requirement fails. Which segment shows it?" Key: requirement-fit; generated variants cover correspondence (a compilation that burns money) and an assumption record.

**Today cards created.** KC-10.agent-proposal-triage at about 1–3, 7, 21 and 45–60 days: proposal variants (GEN-spot-the-gap, 0–1 per session, counted with audit cases) and triage statements (GEN-call-it template 4); gap-class interleaving within set C (M-which-is-it) after the exit items, at most half a session; a re-find of the demonstration's specimen at 7 days or later (M-re-find), which moves it from mounted to kept; sure-and-wrong returns at about 1 day and 1 week.

**Production twin.** Cedar's release gate: "A new version of Cedar isn't released unless its model, proofs, and differential tests are up to date" (AWS Open Source Blog, 2024-04-08, section "How Cedar uses Lean for verification-guided development") [V][cedarblog]. Tracing questions at a pinned `cedar-spec` SHA {{run:RUN-twin-pins}}: which evidence must a change to the Rust authorizer pass before release; which must a change to the Lean model pass; and what does the differential-testing oracle itself trust (AuthV2's paper notes that Cedar relies on the Lean compiler to run its oracle; R5 F30).

**Sibling bridge:** none. **Build this:** LAB-10.4, intake a mutation-generated agent proposal (25 min, re-checked here); then LAB-10.5–LAB-10.7.

### 2.3 S10.L7 · step · Publish

**Observable objective.** Export your report from the claim graph and defend each line: every claim under the section its proposition-of-model stamp names; every assumption it rests on listed as [A] and every exclusion as [N]; every crack in the erosion log; doubts as m of n per claim, never summed; every bound, version and statement hash printed. Then publish a bundle in which `statespace check` resolves every link and every hash. Graded forms: GEN-call-it templates 1 and 4, GEN-which-stamp templates 2 and 3.

**KCs:** KC-10.claim-graph-report (segment 1), KC-10.defeater-log (segment 2), KC-10.publish-limitations (segment 3). **Prerequisites:** KC-9.tcb; KC-10.claim-graph-report for the other two. **Drawn on:** KC-2.statement-pinning, KC-2.axioms-and-trust, KC-5.bounded-scope, KC-6.db-as-assumption, KC-8.provider-horizon. **Instrument:** INS-receipt (the spine's row): it imports receipts, the claim graph and `statespace export`'s report JSON, and re-derives every stamp in the tab.

**Hook.** Copy: "Your repo holds every claim you have minted since Project 00. Once published, your Core is a research artifact in its own right, whether or not it ever becomes part of a larger system. A stranger will read one report. What may its first page say?"

**Prequestions** (answered in segments 1 and 2).

P1. Copy: "Your Core holds claims stamped [P], [M] and [T]. Which first-page summary may the report print?" (k = 4)
- (a) "The Core is verified." A bare "verified" erases bounds, assumptions and checkers; the status vocabulary bans it (GATE-codes). `dp:X8`
- (b) "80% of its claims are proved." A percentage across stamps counts [M] and [T] as unfinished [P]. `dp:X6`
- **(c) "By stamp, with each qualifier, plus what is assumed and what is not covered, each linked to its lines."** The summary is the traversal, shortened; never a score.
- (d) "All tests and proofs pass." Pass or fail hides what each check established and its bound. `dp:X1`

P2. Copy: "A claim has four doubts identified. Receipts eliminated two; you accepted one with a written rationale. What does its doubt log show?" (k = 3)
- **(a) "2|4, naming the two that remain: one accepted, one active."** m of n counts eliminated doubts out of identified ones and names the n − m residual doubts (CMU/SEI-2015-TR-005 §2.1) [V].
- (b) "3|4: accepting a doubt eliminates it." Acceptance is a decision about a residual doubt, not its elimination (SRI-CSL-2024-01 §6) [V]. `dp:X7`
- (c) "50%." m of n is a count, not a probability, and never becomes a percentage. `dp:X6`

**Worked example first.** Copy: "One claim, traversed." CL-5.3 ("a hold eventually resolves under stated fairness"; [M] · constants; fairness as [A]) lands under MODEL-CHECKED with its constants and "complete" or "partial"; an ASSUMED entry records weak fairness on the system's actions, with its "why"; the starving lasso SP-5.3 [X RUN-tlc-hold-lasso] appears among the specimens as the counterexample when fairness is weakened; and because ER-8 cracked SEAM-8 (SP-8.6), the line shows the crack and the remedy taken ("state recovery as [A]; check with crashes on"), with CL-8.4's recovery assumption under ASSUMED. Nothing in the traversal changes CL-5.3's stamp.

**Segment 1 — The report is a traversal (13 min).** Teaches traversal rules T1–T12 (§4.1), chiefly T1 (one section per claim, by its proposition-of-model stamp), T3 (every rests-on edge becomes an ASSUMED entry), T4 (composites take no single stamp) and T9 (design [M] and implementation [T] side by side, never merged). Instrument run (INS-receipt, authored cell): `statespace export` renders the reference claim graph's report skeleton, which reproduces {{run:RUN-core-demo}}.

Call It. Copy: "CL-6.2, 'the conditional-UPDATE compilation never overspends under concurrent READ COMMITTED', is [T] · n histories plus [A] clauses. Where does the exporter put it?" (k = 4; chance 1/4; surprise forecast: no)
- **(a) "Under TESTED with n and the search bound, plus one ASSUMED entry per [A] clause."** T1 and T3.
- (b) "Under PROVED: the executed runs show no lost update." Recorded histories are tests [X RUN-pg-anomalies]; no run covers every history. `dp:X1`
- (c) "Under ASSUMED only: it depends on PostgreSQL." Its proposition was tested; the dependence sits beside it, not instead of it. `dp:X8`
- (d) "Under TESTED, its assumptions in a footnote." An assumption that is not an entry cannot be counted, cracked or audited. `dp:X8`

Graded item: GEN-call-it template 4. Template spec: a generated claim-graph fragment shaped like the learner's own (2–4 claims, 1–3 seams, at most one cracked, at most one composite); five statements from stems: (i) "⟨claim⟩ appears under ⟨section⟩"; (ii) "the report creates an ASSUMED entry for ⟨clause⟩"; (iii) "the composite takes the stamp of its strongest part"; (iv) "a claim resting on a cracked seam moves to UNKNOWN"; (v) "requirement-fit may read [P]". Keys from `statespace export` and spine §8.8; (iii)–(v) are false in every instance (an erosion cracks a segment or an assumption record, never silently the proposition; spine §5.4). Tags `dp:X1`, `dp:X8`, `dp:P3`, `dp:L3`.

**Segment 2 — m of n, never summed (13 min).** Teaches the three doubt kinds (rebutting, undermining, undercutting; CMU/SEI-2015-TR-005 §2.2 [V]), which match the gap-class kinds of spine §6.1; the statuses active, retired and accepted residual, and open versus closed arguments (SRI-CSL-2024-01 §6 [V]); rules D1–D9 (§4.3); and how to hunt doubts: every inference rule for undercutting doubts, every item of evidence for undermining ones, every claim for counterexamples (CMU/SEI-2015-TR-005 §3.1 [V]), with the seven-category checklist (arXiv 2502.00238 §IV [V]).

Worked example: CL-1.1's doubt log before the cross-check. (1) "The premises may contradict each other": undercutting, retired by receipt (the premise witness is `sat`, LAB-1.c3). (2) "The `unsat` rests on one solver" (SEAM-7, cracked at ER-7 by SP-4.5: Z3 5.3.0 returned a wrong `unsat` on issue #11179's satisfiable inputs, and 5.3.1 returns `unknown` [X RUN-z3-11179]): undermining, active. (3) "The recipient can overflow in 64-bit arithmetic": accepted residual, listed under NOT COVERED with CL-1.5's [N] line. The log reads 1|3.

Instrument run (INS-receipt, authored cell): import the cvc5 cross-check receipt for CL-1.1's query: `unsat`, with a 19-line Alethe proof that contains a `hole` step [X RUN-cvc5-alethe]. The evaluator recomputes the log.

Call It. Copy: "What happens to doubt 2, 'the `unsat` rests on one solver'?" (k = 4; chance 1/4; surprise forecast: yes)
- (a) "It is retired, and the claim's argument closes." Agreement answers the one-solver doubt, but two solvers can fail together, so a common-mode doubt opens and keeps the argument open. `dp:X7`
- (b) "It stays active: a proof with a `hole` proves nothing." The `hole` limits the certificate, not cvc5's independent verdict. `dp:X3`
- (c) "It is deleted: 5.3.1 no longer gives the wrong `unsat`." Doubts are never deleted, and a changed verdict on one input proves no soundness. `dp:X7`
- **(d) "It is retired by the receipt, and a new doubt opens: 'both solvers could be wrong; the certificate is incomplete', active until you accept it with a rationale."** Rules D1 and D5: the log reads 2|4, and certificate replay stays a deferred drawer (D-32).

Graded item: GEN-call-it template 1 (three-way verdict: retired, active, accepted residual). Template spec: a generated doubt record on one of the learner's own claim types (kind, source, linked evidence, any acceptance note) plus one new event (a receipt, a specimen, an advisory, an erosion or an acceptance); the learner calls the doubt's new status; the key is the evaluator's output under D1–D9. Tags `dp:X3`, `dp:X6`, `dp:X7`.

**Segment 3 — Publish what anyone can re-run (13 min).** Teaches that a published line is reproducible only with tool, version, binary hash, argv, input hash, bound or seed, and statement hash (receipt@1, spine §9.4); TTLs, advisories and "stale since"; the edition pins (Lean 4.35.x and PostgreSQL 18.6, re-recorded after PostgreSQL 19 GA; OD-12); and limitations written as [N] and [A] lines, the way CompCert's manual separates what is and is not verified (chapter 1, §1.2–1.3) [V].

Worked example, from executed runs. Copy: "CL-5.1 · MODEL-CHECKED [M] · constants Init = 100, Amount = 80, Workers = {w1, w2} · complete · 4 distinct states · TLC 1.8.0, SHA-256 pinned, pre-release · argv recorded · statement hash ⟨sha⟩. Also run at three workers with Amount = 40: 8 distinct states. Other sizes: NOT COVERED, unless the parametric step of CL-5.4 is proved." [X RUN-tlc-atomic, RUN-tlc-jars]

Instrument run (INS-receipt, authored cell): an agent commit weakened the statement of `transfer_conserves` under the same name; `statespace check` re-runs comparator, which prints "error: Challenge and solution theorem statement do not match: 'transfer_conserves'" [X RUN-lean-comparator]; the report is re-exported.

Call It. Copy: "Where does CL-2.1 appear in the re-exported report?" (k = 4; chance 1/4; surprise forecast: no)
- (a) "Under PROVED: the proof still builds." The build proves the weakened statement, not the pinned one. `dp:L3`
- (b) "Under REFUTED: the statement changed." [R] needs a witness that violates the claim; nothing was refuted. `dp:X2`
- **(c) "Under UNKNOWN, [?] · statement mismatch, until the pinned statement is proved again."** Spine §8.8 voids the claim; traversal rule T5 keeps it visible.
- (d) "Nowhere: voided claims are dropped." Dropping it would hide exactly the edit comparator caught. `dp:X9`

Graded item: GEN-which-stamp template 2 (complete the qualifier). Template spec: five generated report lines, each missing one element: [P] without checker@version or rlimit; [M] without constants or "complete"/"partial"; [T] without n or generator statistics; [C] without source or read-back time; [A] without its "why". The learner completes each from the attached receipt; keys from spine §8.7. Tag `dp:X9`.

**Exit items.** E1 (KC-10.publish-limitations): GEN-call-it template 4, five generated report lines judged "reproducible as written" or not. E2 (KC-10.defeater-log): GEN-call-it template 1 on a fresh doubt record. E3 (KC-10.claim-graph-report): GEN-which-stamp template 3 on a traversal question.

**Today cards created.** Each KC at about 1–3, 7, 21 and 45–60 days: placement and strip-segment items (KC-10.claim-graph-report), doubt statuses (KC-10.defeater-log), qualifier completion and reproducibility judgments (KC-10.publish-limitations); change cards (M-change-cards) whenever an advisory for a pinned tool lands after one of the learner's receipts.

**Production twin.** Cedar's release gate, read as release evidence: at the pinned `cedar-spec` SHA {{run:RUN-twin-pins}}, sort the README's verified properties into proved in Lean, tested by differential testing, and trusted (R5 F3), and list what the gate re-runs before a release. **Sibling bridge:** none. **Build this:** LAB-10.8, export the report from the claim graph (a write stage in nine passes); then LAB-10.9.

### 2.4 Call tally

Seven authored calls in S10 (one per briefing segment, plus the ER-12 forecast in §7): forecast surprises 4 of 7 (S10.L6 segments 1–2, S10.L7 segment 2, the ER-12 forecast), above the 30% floor. Keys sit at positions b, c, b, a, d, c and d; no key value covers more than 60% of the calls (GATE-items).

---

## 3. LAB-10 — Core assembly

The final assembly, planned within six weeks. Agent proposals come from the mutation generator, sound in a seeded 30–60% share; no language model runs at grade time (spine §3.10).

### 3.1 What the template supplies, and what you write

Supplied (course tools; reference modules earn nothing): `statespace demo` (the reference pipeline); the fixture corpus (the toy syntax's goldens plus the four decision-record edge cases: zero, self-transfer, failed guard, overflow); `statespace proposal draw`; `statespace demo record`; the claim-graph evaluator and `statespace export` (report@1, W5-T06); `statespace check`; `statespace audit gen | harvest`; the agent kit, whose fail-closed hook blocks agent edits to `TODO(you)`, `challenge/`, `claims/`, `receipts/` and the report's statement fields. You write: the wiring, every triage decision, every fix, each claim's proposition and "if weakened" witness, the [C] and [N] records, doubt rationales, the limitations prose, and where (if anywhere) to publish. Your own agent may help wire code, logged as assisted; it is closed on Prove-it and Defence items, and its assertions render as quoted UNREVIEWED text.

### 3.2 The proposal generator

The Clearinghouse's weekly proposals and LAB-10.4's draw share one generator: GEN-spot-the-gap's twin machinery (spine §6) applied to proposal twins, each a reference command plus a correct claim. A draw keeps the twin sound (possibly rewritten without changing meaning) or applies one operator. Commands are always syntactically valid. The agent's offered evidence ("k tests green", "Z3: unsat", "Lean accepted it") is drawn independently of soundness, so cue strategies fail; GATE-audit-blind holds always-reject, always-accept, cue and topic-is-class strategies within chance + 2 SD against the baselines in RUN-docket-baselines. Where an operator makes the claim false, the class follows the evidence offered: tests give G11, a solver verdict on the agent's own encoding G4, a proof of a different statement G8a ("by evidence" below).

| Operator (flawed unless marked) | Keyed by (reference pipeline) | Class to name |
|---|---|---|
| Guard loosened, or placed on the wrong account | `miniplinth check`, non-negativity; witness replay | by evidence |
| A multi-leg command whose guard covers one leg (a fee leg) | the same | by evidence |
| Per-leg guards where the sum must be guarded | the same | by evidence |
| Capture without the hold's state check (SP-1.2's class) | "a hold is captured at most once" | by evidence |
| Refund larger than the capture (SP-1.3's class) | "the refund never mints" | by evidence |
| True claim that omits one of your invariants (SP-2.2's class) | per-invariant verdicts | G1 |
| "Z3: unsat" over `Int` where your semantics is bounded (ER-1's remedy) | the checker under your chosen semantics | G4 |
| An "impossible brief" met by weakening a pinned `Inv` in the same change | statement hash; comparator | G8a |
| A correct command "fixed" after a CTI (SP-4.3's class) | CTI workbench, bounded reachability | G13 |
| A shared view returning a private field, justified by "every read checks the ACL" (SP-7.1) | self-composition through your VC generator (LAB-7.5) | G3a |
| A count over every tenant's documents (SP-7.2) | the same, with counts in the observer | G10 |
| `in` written where overlap was meant (`dp:A1`) | the policy query's distinguishing request (LAB-7.3) | G12 |
| Sound: an equivalent guard, a stronger guard, reordered legs, a declassified field | all of the above | none: sound |
| Typed rejection: a resource field assigned, or `amount : Int` | your typechecker against `HasType` | demonstration and Today statements only; never an audit variant |

### 3.3 Stages and exact checks

| Stage | Title | Min | Check: exact pass condition |
|---|---|---|---|
| LAB-10.1 | Run the reference pipeline on the provided proposal | 2 | LAB-10.c1: `statespace demo` (reference parser → typechecker → checker → interpreter → compiler → runtime on PostgreSQL 18.6) writes a report skeleton whose section list, verdict lines and statement hashes equal {{run:RUN-core-demo}}. The default proposal [D] is `command TransferWithFee(from, to, amount, fee) requires balance(from) >= amount do move amount from from to to; move fee from from to sink`, claim "never overdraws; conserves; 200 tests green". The guard omits the fee; its expected verdicts are recorded in the same run |
| LAB-10.2 | Wire your parser, checker and interpreter | 25 | LAB-10.c2: on the fixture corpus and on seeds drawn at grade time, your pipeline in the tab (a) emits IR equal to the Lean export on every golden, valid under IR@1; (b) agrees with the typing goldens; (c) returns the reference checker's verdict class on every fixture obligation; (d) replays every [R] witness in your interpreter and in INS-interp; (e) shows no [P] without a satisfiable premise witness; n printed |
| LAB-10.3 | Wire your compiler, runtime and simulator | 25 | LAB-10.c3: every fixture's outcome class on PostgreSQL 18.6 (success; zero rows mapped to a typed error; SQLSTATE) equals the interpreter's, and R(S, D) holds after each commit; the attempt log groups retries by SQLSTATE and never retries 22003; `transaction_isolation` reads back `serializable`; simulator seed 1 yields an NDJSON trace accepted by `statespace trace validate`; no wired component is a reference module |
| LAB-10.4 | Intake a mutation-generated agent proposal | 25 | LAB-10.c4: `statespace proposal draw` returns an unseen proposal for a seed drawn at grade time; your parser parses it; your typechecker's verdict is recorded (a typed rejection is a valid triage outcome); the claim is stored in `claims/` as quoted UNREVIEWED text with no stamp; your triage plan names a checker for each part of the claim (investigation items, not credited) |
| LAB-10.5 | Exhibit the violation, or prove the restricted obligation | 25 | LAB-10.c5: your verdict matches the reference key and either (flawed) the decoded witness replays in your interpreter and in INS-interp against the named invariant, is minimized (under an Optimize objective where it is numeric), has its class named, and is mounted as a specimen with its label; or (sound) every obligation is `unsat` for the stated fragment, a premise witness is `sat`, and cvc5 1.4.2 agrees on every `unsat`. A disagreement with the reference opens a doubt against both sides; it passes only if your witness replays in INS-interp, which makes the reference wrong and files an erratum |
| LAB-10.6 | Run the corrected command on PostgreSQL 18.6 with systematic tests | 25 | LAB-10.c6: the corrected command (or the accepted proposal), compiled by your compiler and run by your runtime, passes the differential suite (outcome classes and R(S, D) against the interpreter) and the simulation suite (TLC-validated traces), printing n, seeds and generator statistics with n at least the floors of LAB-6.c4 and LAB-8.c6; the fix also kills a non-minimal witness of the specimen's class |
| LAB-10.7 | Record the demonstration end to end | 25 | LAB-10.c7: `statespace demo record` writes `demo/` with the proposal and its hash, the triage plan, the checker and replay (or premise-witness) receipts, the fix diff, the re-check, the PostgreSQL and simulation receipts and CL-10.1, citing every artifact by run id and every statement by hash; `statespace check demo/` replays the witness and verifies every hash. A replayable bundle, not a video |
| LAB-10.8 | Export the report from the claim graph (write stage, nine passes, §3.4) | 25 (spine §3.10); the passes total 325 nominal | LAB-10.c8: the report validates under report@1, with sections for proved, model-checked, tested, enforced, configured, assumed and not covered (plus UNKNOWN and the specimens), a checker matrix, statement hashes, budgets and advisories, and a doubt log as m of n; `statespace check report/` confirms traversal rules T1–T12 (§4.1), re-deriving every stamp from its receipt by spine §8.8 |
| LAB-10.9 | Publish the bundle (write stage) | 25 | LAB-10.c9: `statespace check bundle/` finds every link resolving, every statement hash matching (`trimRight` plus one newline), every receipt re-verifiable, the privacy lint clean (no private paths, secrets or identifiers the learner did not choose to publish; nothing from the overlay), a license and reproduction instructions present, and the bundle building from a clean clone in the devcontainer. Where to publish is the learner's choice; the check runs on the local bundle |
| LAB-10.10 | `[stretch]` a public upstream counterexample: an issue or PR plus a witness any browser replays (M-public-counterexample) | 25 | — |

### 3.4 LAB-10.8 in nine passes

Each pass fits a weekday (≤ 25 min) or weekend (≤ 45 min) window and ends with a per-pass result from `statespace export --section`. Nominal total: 4 × 25 + 5 × 45 = 325 minutes. The spine plans LAB-10.8 at 25 minutes and counts the report's writing in S10's Write column (§12); recording LAB-10.8 as a multi-pass write stage is proposed in §13, issue 2.

| Pass | Window | Work |
|---|---|---|
| 1 | weekday | export the skeleton; re-check every receipt marked "stale since" or touched by an advisory |
| 2 | weekend | PROVED, with the theorem statements and their hashes |
| 3 | weekend | MODEL-CHECKED and TESTED, each with its bound or n and generator statistics |
| 4 | weekday | ENFORCED and CONFIGURED: mint [C] claims from read-backs of `transaction_isolation`, the server version and the row-security settings |
| 5 | weekend | the doubt hunt: the seven-category checklist over each claim group; statuses; m of n |
| 6 | weekend | ASSUMED, NOT COVERED and the erosion log |
| 7 | weekday | the demonstration, the specimens and the agent incident ledger |
| 8 | weekend | operational semantics, edge-case decisions and known limitations |
| 9 | weekday | "What this report establishes and what it does not" (CL-10.2's six fields, written last); the validator |

Exemplar reports (learner-zero's published report among them) are surfaced in the tab after pass 9's first validator run (§1.2). Before that they stay one search away, labeled "read after your first draft". Scheduling is not access (I5).

### 3.5 Receipts

Every Bench stage writes receipt@1 (spine §9.4), which never trusts an exit code alone. LAB-10.1, LAB-10.3, LAB-10.6: `runs[]`, `pg`, `tlc` and `tcb[]` (the trusted base from S9.L9). LAB-10.5's cross-check: both solvers' verdict lines and `z3`. LAB-10.7: `statements[]` (the proposal's command and every invariant), `claims[]` (CL-10.1) and self-reported `provenance` (OD-8). LAB-10.8–LAB-10.9: the report@1 export plus a receipt whose `statements[]` covers every pinned statement in the bundle and whose `lean` block lists each theorem's checkers, axioms, `sorryCount` and `nativeAxioms`.

### 3.6 Hint ladders (R0–R4)

R0 is the explanation gate; anything past R2 counts as assisted until an unseen variant passes unassisted (M-hint-ladder).

| Check | R0: say first | R1: pointer | R2: targeted | R3: worked partial | R4: outline |
|---|---|---|---|---|---|
| c1 | which pipeline step prints the first difference | `statespace doctor`; D-15 | compare the receipt's `tools[]` with the pins | a solved case: wrong devcontainer digest | the reproduction checklist |
| c2 | the first disagreeing fixture and component | the step's own gate (LAB-3.c8–c10, LAB-4.c5); D-14 | the IR diff for that fixture | a solved mismatch of the same kind on another fixture | the IR@1 contract, field by field |
| c3 | the interpreter's outcome class and PostgreSQL's | S6.L2 (rowcount as guard); SP-6.1 | which rowcount or SQLSTATE the runtime mis-maps | a solved NULL-guard fixture | the outcome-class table and the R(S, D) check |
| c4 | whether the failure is in parsing, typing or claim storage | S10.L1's gate; claim@1's quoted-claim block | the grammar rule at the error position | an intake of another proposal family | the intake contract |
| c5 | the invariant, your verdict, and whether the reference agrees | S4.L6; S1.L3; the three moves of segment 2 | sat: the replay diff; unsat: the premise query; mismatch: which component to suspect first | the worked self-transfer triage (§2.2) | the obligation's shape for this family, never the key |
| c6 | the first diverging sequence and both outcome classes | S6.L3; S8.L6 | the generator statistics around the divergence | a triaged divergence (spec, implementation, tool or proof) | the suite configuration checklist |
| c7 | which artifact lacks a run id or hash | receipt@1's `runs[]` and `statements[]` | `statespace demo record --explain` | LAB-10.1's reference recording | the recording manifest |
| c8 | the failing rule and line | §4 of this spec; SRI-CSL-2024-01 §6 | the validator's pointer | a fix of the same rule on another claim | every rule with an example |
| c9 | the unresolved link or mismatched hash | spine §9.4's hash definition | `statespace hash` on both copies | a statement edited after its receipt | the publication checklist |

### 3.7 Prove-it

`statespace defend` seeds mutations of your own Core and report after LAB-10.3 and again after LAB-10.8; agent closed; predict first, then the owning checker grades. (1) The checker skips the premise-witness query: which fixture reports a vacuous `unsat` as [P] (SP-4.4's class)? (2) The compiler drops the rowcount check: which inputs diverge, and in which outcome class? (3) The runtime's pool runs READ COMMITTED: what does the abstract-serializability check say about the recorded holds write-skew history, in which both transactions commit and 160 is held against a balance of 100 [X RUN-pg-claims]? (4) The runtime retries 22003: what does the attempt log show? (5) One [T] line is restamped [P]: what does the validator report? (6) A pinned statement is edited after its receipt: where does the claim land (T5)? A surviving mutant is a coverage gap: it enters the report as an active doubt.

### 3.8 Challenge pack

`challenge/` in the bundle is the union of LAB-2's, LAB-3's and LAB-9's read-only challenge modules at their final hashes. `comparator.json` is the union of their permitted-axiom lists, which may name only the standard axioms (`propext`, `Quot.sound`, `Classical.choice`; S2.L9), never `sorryAx` or a `_native` axiom. `statespace check` runs build → `#print axioms` → `lake check` → `lake comparator --paranoid` (six checkers [X RUN-lean-comparator]) on every pinned theorem at Lean 4.35.x. A parked goal is never hidden: its theorem fails comparator, its receipt records `sorryCount` k, and the report reads "PROVED modulo k assumed lemmas", in words and never with the [P] code, each lemma under ASSUMED with its parked date (spine §8.8; T7).

### 3.9 Lanes, phones, stuck time and the overlay

*Re-checked here* (Lane A): LAB-10.2, LAB-10.4 and LAB-10.5's checker run and replay; on import the tab also re-derives every stamp and hash of LAB-10.7–LAB-10.9. *Reported from your machine* (Lane B): LAB-10.1, LAB-10.3, LAB-10.5's cvc5 cross-check, LAB-10.6, LAB-10.7, LAB-10.8's export and LAB-10.9. The stuck protocol fires at 25, 45 and 90 minutes (`statespace stuck`); in a report pass, the unfinished part becomes a dated NOT COVERED line with a re-find in 7 days. At stage start the monthly retro asks for one if-then plan. Copy: "If a report pass runs past its window, then I stop at the next section boundary and write what is missing as a NOT COVERED line." The private overlay (M-overlay, `statespace overlay`) runs the same traversal over local claims about "your system"; nothing from it enters the repo or the bundle, which LAB-10.c9 and GATE-privacy confirm (W5-T12).

---

## 4. The report: traversal rules, sections and doubt rules

### 4.1 Traversal rules (checked by `statespace check report/`)

- **T1** Each claim appears once in the stamp sections, under its proposition-of-model stamp: [P] PROVED, [M] MODEL-CHECKED, [T] TESTED, [E] ENFORCED, [C] CONFIGURED, [A] ASSUMED, [N] NOT COVERED, [?] UNKNOWN; [R] lives with the specimens.
- **T2** Each line prints stamp word, code and qualifier (bound first for [M] and [T]), lane badge, statement hash, receipt ids and the three-segment strip; requirement-fit is never [P].
- **T3** Each rests-on edge to a seam or [A] clause creates or links an ASSUMED entry with its "why"; each [N] line creates a NOT COVERED entry.
- **T4** Composites (CL-10.1, CL-10.2) list their parts and take no single stamp, least of all their strongest part's.
- **T5** A claim whose statement hash no longer matches, or whose receipt fails re-verification, moves to UNKNOWN as [?] · reason. Nothing is dropped.
- **T6** A claim on a cracked seam keeps its stamp and shows the crack and the remedy; the erosion log lists every ER with both endpoints, its forecast result and its remedy.
- **T7** A Lean claim with k parked lemmas reads "PROVED modulo k assumed lemmas", in words only; each lemma sits under ASSUMED with its parked date.
- **T8** No bare "verified", "correct" or "safe"; no sum, average or percentage of stamps or of doubt counts.
- **T9** Design-level [M] claims and implementation-conformance [T] claims sit side by side, cross-linked, never merged.
- **T10** The checker matrix has one row per claim and one column per checker (the Lean kernel and the other five `--paranoid` checkers, comparator, Z3, cvc5, TLC, the interpreter goldens, PostgreSQL 18.6, PGlite, Soufflé); each cell is a verdict line with its receipt id, or blank, never inferred.
- **T11** Every bound is printed (`rlimit`, constants, n, seeds, search bound); every tool version lists the advisories known on the report's date, and every receipt its TTL ("stale since" once past).
- **T12** The agent incident ledger lists every triaged proposal, from the Clearinghouse and the demonstration: date, seed, operator family, verdict, class named, decision.

### 4.2 Sections (report@1, in order)

Title block (artifact name, edition pins, commit and bundle hash, date; no identity claim) · what this report establishes and what it does not (CL-10.2) · the Core and its trusted base, marked proved, validated per run, tested or trusted (S9.L9) · operational semantics and the four decision records · theorem statements with hashes · PROVED · MODEL-CHECKED · TESTED · ENFORCED · CONFIGURED · ASSUMED · NOT COVERED · UNKNOWN · specimens · the demonstration (CL-10.1) · erosion log · doubt log · checker matrix · budgets and advisories · agent incident ledger · known limitations · reproduction.

### 4.3 Doubt records and rules D1–D9 (the claim-graph evaluator; keys for KC-10.defeater-log)

A record is a compact Defeater Card (R5 F41) without severity scores: affected claim; kind (rebutting, undermining, undercutting, matching spine §6.1); description; source (learner, AI-proposed, specimen, tool, erosion event); found by; trigger; the seam or assumption involved; status; mitigation; rationale, kept even when dismissed.

- **D1** Only a linked specimen, receipt or written argument retires a doubt. An AI may propose doubts, labeled AI-proposed; it never retires one.
- **D2** A doubt not retired is active, unless accepted as residual with a written rationale.
- **D3** An argument is open while any doubt is active or any rests-on edge reaches an unsupported claim or an unremedied crack; otherwise it is closed (SRI-CSL-2024-01 §6).
- **D4** m|n per claim: n identified, m retired; the n − m residual doubts are named, active ones first (CMU/SEI-2015-TR-005 §2.1). Never summed, averaged, ranked or gated on.
- **D5** An agreeing second checker retires a one-checker doubt and opens a common-mode doubt; an agreeing independent oracle retires a specification doubt only within its generator's distribution and opens one for what lies outside it.
- **D6** An erosion opens a doubt of the seam's kind on every claim resting on the seam; the remedy retires it or restates it as a new [A] edge.
- **D7** An advisory newer than a receipt opens a re-check doubt on every claim citing that tool version; a receipt on a fixed version retires it.
- **D8** A dismissed doubt keeps its record and rationale, and counts as retired only under D1.
- **D9** CL-10.2 carries one standing undercutting doubt, "doubts not yet identified" (CMU/SEI-2015-TR-005 §3.1), accepted with a rationale that records the checklist pass (arXiv 2502.00238 §IV); it is never retired.

---

## 5. Specimens

S10 adds no catalog specimen (spine §5.1). LAB-10.5 mints the learner's own demonstration specimen, labeled from its run: mounted, then kept after a re-find at 7 days or more. §13 issue 4 proposes an ID for the LAB-10.1 proposal's witness. Specimens S10 re-mounts:

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-2.1 | `n = 1, t = 0, f = 0`; in Lean, 10 becomes 15 on a self-transfer of 5 | a self-transfer leaves the balance unchanged | both balances read the old state, so the credit overwrites the debit | amount 1 is the least positive amount (no objective run) | read the destination after the debit: 10 stays 10 | [X RUN-z3-selftransfer, RUN-lean-selftransfer] |
| SP-2.2 | sender at 0 sends 1 | sender non-negativity; conservation survives | no guard | yes, under an Optimize objective | the sufficient-funds guard | [X RUN-z3-conservation-noguard, RUN-z3-optimize-min] |
| SP-6.7 | account 1 at 100, self-transfer of 30: 70 | conservation in SQL | the single row takes only the `CASE` debit branch | a fixture, not minimized | two UPDATEs: 100 stays 100 | [X RUN-pg-claims] |
| SP-6.3 (holds) | two holds of 80 commit at READ COMMITTED and REPEATABLE READ: 160 held against 100 | holds never exceed the balance | each transaction checks a predicate the other's insert changes | a recorded history | SERIALIZABLE: the second gets 40001 | [X RUN-pg-claims] |
| SP-4.3 | a CTI and a reachable twin | the invariant's inductive step | same invariant shape, opposite verdicts | — | strengthen (CTI) or fix (reachable) | {{run:RUN-z3-cti-pair}} |
| SP-4.5 | issue #11179's satisfiable inputs: `unsat` on 5.3.0, `unknown` on 5.3.1 | solver soundness | a solver bug | — | a cvc5 cross-check; "uncertified" | [X RUN-z3-11179] |
| SP-4.6 | cvc5 `unsat` with a 19-line Alethe proof holding a `hole` step | certificate completeness | an untranslated rewrite | — | certificate replay, deferred (D-32) | [X RUN-cvc5-alethe] |
| SP-2.7 | "Challenge and solution theorem statement do not match: 'transfer_conserves'" | the statement pin | a weakened statement under the same name | — | comparator's statement lock | [X RUN-lean-comparator] |
| SP-8.5 | an outage that outlives the provider's key retention | no double charge | retries outlast documented key pruning | — | ER-12's remedies | {{run:RUN-tlc-key-ttl}} |

---

## 6. Claim templates

**CL-10.1 · The demonstration** (S10.L6, minted at LAB-10.7; status {{run:RUN-core-demo}}).

| Field | Content |
|---|---|
| Proposition | For proposal P (hash h), either P violates invariant I, witnessed by w, and the corrected command C preserves the invariant set for fragment F; or P preserves it for F. C (or P) runs on PostgreSQL 18.6 under the runtime and matches the interpreter's outcome classes and R(S, D) on n generated sequences and k fault seeds |
| Assumptions | the fragment F (one command at a time; the chosen arithmetic; the stated observer for authorization commands); sound solvers (two agree; uncertified); every writer SERIALIZABLE and PostgreSQL behaving as documented (§13.2.3) [V]; retries terminate (CL-6.5) |
| Model | the Mini-Plinth reference semantics (LAB-3) and the IR; the outbox spec where effects occur |
| Method | `miniplinth check` with the cvc5 cross-check; replay in two interpreters; the differential and simulation suites |
| Correspondence | compiled SQL to IR: [T] · n, or CL-9.3's per-command validation; runtime to PostgreSQL: [A] |
| If weakened | for the default proposal, drop the fee from the corrected guard: a balance equal to the amount with a positive fee overdraws ({{run:RUN-core-demo}}); claim@1 validation checks that the witness refutes this claim's own proposition |
| Requirement row | the learner's requirement scenarios: [T] · k scenarios or [A] · why; never [P] |
| Stamp | composite (T4): [R] · witness length, then [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified · fragment F (or that [P] alone), plus [T] · n · generator statistics · engines named, plus [T] · k seeds |

**CL-10.2 · The published report** (S10.L7, minted at LAB-10.8; composite, no run of its own).

| Field | Content |
|---|---|
| Proposition | This report places every claim of the claim graph at commit c under its stamp's section with its strip, lists every assumption it rests on as [A], every exclusion as [N], every crack and m of n per claim, and every stamp re-derives from a receipt whose statement hashes match bundle b |
| Assumptions | the claim graph is complete (D9); receipts are honest (honor-system provenance, OD-8); every "re-checked here" badge rests on SEAM-13 (INS-interp agrees with the Lean reference: [T] · n goldens); advisories as known on the report's date |
| Model | claim@1 records, receipts, specimens and seams at commit c |
| Method | `statespace export` (T1–T12) and `statespace check` (spine §8.8 re-derivation, hashes, links) |
| Correspondence | bundle b to commit c, by hash |
| If weakened | drop T3: CL-5.3 appears without its fairness assumption, a report the weakened rules permit and the requirement forbids |
| Stamp | none for the whole; each line carries its own; validation is recorded as LAB-10.c8 and LAB-10.c9 |

**Learner-written records** (LAB-10.8 passes 4 and 6; no CL template, §13 issue 9): [C] · source, read back when (`transaction_isolation`, the server version, forced row security); [N] · what lies outside (timing and size channels, per ER-10's remedy; performance and availability; malformed-text parsing where tests generated only ASTs, the gap Cedar's differential testing missed, R5 F2; schema migrations, which surfaces D-38; the coding agent itself).

---

## 7. Seams and erosions

S10 plants no seam. One erosion fires during the stage; the report then logs all twelve.

| ER | Seam | Endpoint 1: planted | Endpoint 2: cashed | Segment cracked | Remedies |
|---|---|---|---|---|---|
| ER-12 | SEAM-12, "retries finish before the provider forgets the key" | S8.L7, CL-8.2's provider-horizon clause written in LAB-8.8 | the Clearinghouse, in the first week SEAM-12 is the learner's oldest open erodible seam (after S9 on both published paths) · SP-8.5 {{run:RUN-tlc-key-ttl}} | an assumption record: the provider's horizon | bound the retry horizon; reconcile by key; state the loss |

**Forecast** (M-erosion-forecast; authored call 7). The learner restates CL-8.2 from memory (six fields, uncredited). Copy: "Which segment does this incident crack?" (k = 4; chance 1/4; surprise forecast: yes)
- (a) "Proposition-of-model." The model's "no double charge" holds under its stated assumptions; an erosion never silently cracks a proposition (spine §5.4). `dp:E4`
- (b) "Correspondence." The implementation still follows the spec; an environment promise failed. `dp:P3`
- (c) "Requirement-fit." The requirement is unchanged; what it rested on failed. `dp:E1`
- **(d) "An assumption record: the provider's horizon."**

**Remedy cards.** Bound the horizon: CL-8.2 restated with [A] "retries finish within H, below the provider's documented retention" and an [E] alarm when an outage passes H. Reconcile by key after recovery, stamped by its own evidence. State the loss: the window in which a duplicate is possible becomes an accepted residual doubt and a NOT COVERED line. Stripe's documented key pruning is the dated twin [stripeidem].

**In the report.** The erosion log lists ER-1–ER-12 with the endpoints of spine §5.4 and the remedy each learner chose; every restated assumption is an open [A] line. The held seams appear under ASSUMED as tested and holding: SEAM-13 under every "re-checked here" badge, SEAM-14 (tested nightly by GATE-specimens) under CL-6.2, SEAM-15 (`--paranoid` at every Lean Defence) under CL-2.1–CL-2.4.

---

## 8. Audit anchors and the S10 audit pool

No new anchors (spine §3.10); §13 issue 3 proposes two, with dated sources. The S10 pool has three sources, a sound share seeded at 30–60% per session, typed evidence, and counts shown afterward (per class only at n ≥ 10):

1. **Harvested** (`statespace audit harvest`): commits by the learner's agent that touched a statement, a claim or a challenge file become cases, keyed locally by the same checkers. "Based on" card: the learner's commit (hash, date) plus the anchor whose class it instantiates.
2. **Generated** (`statespace audit gen`): spine §6's operators applied to the learner's own claims and report lines (for example, a bounded check stamped [P], a narrowed observer, a dropped frame conjunct, a changed isolation level), each keyed by re-running its checker.
3. **Cross-stage anchors** AUD-1.1–AUD-9.2 with their variants and "based on" cards.

---

## 9. The Defence (S10, over the report)

Untimed, over two or more sessions, within a week of LAB-10.9; agent closed; sign-off and retakes as spine §8.6.

**Part A, 12 probes** across the seven outcome families of spine §2.2, keys at grade time: (a) GEN-negate-it template 3 on one of your invariants, GEN-spec-it template 1; (b) GEN-call-it template 1, the property kind of a report claim; (c) GEN-cti-or-bug, GEN-wp-it template 3; (d) GEN-proof-structure template 3 on a goal from CL-3.3 or CL-9.2; (e) GEN-find-the-witness template 2, a crash-window trace; (f) GEN-anomaly-id on a Bench-recorded history; (g) four probes: GEN-spot-the-gap on a fresh proposal, GEN-which-stamp template 1 on a mutated line of your own report, GEN-call-it template 4 on what your report establishes, GEN-call-it template 1 on a doubt status. Outcome (g)'s probes carry the roadmap's three Stage 10 demands: stamp distinctions, the proposal, versions and limitations.

**Part B, seven mutations**, one per component you own, predicted first, graded by the owning checker; every mutant builds or its key predicts it will not (GATE-labs): the parser reads subtraction as right-associative (the syntax corpus, LAB-3.c8); the typechecker drops the resource-assignment rule (the typing goldens); the checker drops the frame conjunct for untouched accounts (the missing-frame fixture, SP-4.1's class); the interpreter treats a failed guard as a successful no-op (the kernel-checked goldens); the compiler emits read-modify-write (recorded PostgreSQL 18.6 histories); the runtime's pool runs READ COMMITTED (abstract serializability on the holds history [X RUN-pg-claims]); the simulator acknowledges before the durable write (trace validation, {{run:RUN-tlc-trace-validation}}).

**Part C, four cases**: one from your own repo (harvested, or generated when nothing qualifies), three from the cross-stage pool, at least one sound; typed evidence.

**Part D, explain-back** (required, uncredited): two minutes on what the report establishes and what it does not, then a three-idea self-check compared with Part A, framed as a short statement of understanding: the Core's behavior, the evidence behind it, and the doubts that remain with how each is handled (R5 F43; grade D).

---

## 10. Drawers

The deferred drawers D-30–D-40, each surfaced in Today by its trigger and never locked: D-30 (Kani) at ER-1, for the runtime's `i64` path; D-31 (Verus and Aeneas) once the report's trusted-base section names Rust code to verify directly; D-32 (certificates) at ER-7, again at segment 2's common-mode doubt; D-38 when a NOT COVERED line names migrations; D-39 when one names UI generation; D-33–D-37 and D-40 on their own triggers. Re-surfaced just-in-time drawers: D-06 (the six fields) in LAB-10.8; D-14 and D-15 in LAB-10.2–LAB-10.3.

---

## 11. Reading list (dated, section-level)

Required (about 0.5–1.0 h):
1. Bloomfield, Netkachova & Rushby, "Defeaters and Eliminative Argumentation in Assurance 2.0", SRI-CSL-2024-01, arXiv 2405.15800v1 (May 2024; read 2026-10-23) [V]: §6 "Defeaters and Confidence"; optionally §1 and §3.
2. Goodenough, Weinstock & Klein, "Eliminative Argumentation: A Basis for Arguing Confidence in System Properties", CMU/SEI-2015-TR-005 (2015-02-25) [V]: §2.1 (m|n), §2.2 (the three defeater types), §3.1 "Unidentified Defeaters", §3.5 "True Defeaters (Counterevidence)".
3. Lean Language Reference 4.35.0, "Validating a Lean Proof" (read 2026-10-23) [V]: the opening threat model ("un-reviewed AI-generated proofs and programs"), "Gold Standard: comparator and external checkers", "Remaining Issues".
4. CompCert manual, version 3.18 (2026-08-30), chapter 1, §1.2–§1.3 [V]: what is verified, what is not, and "observable behavior".

Optional:
5. Gohar, Hunter, Cohen & Lutz, "A Taxonomy of Real-World Defeaters in Safety Assurance Cases", arXiv 2502.00238v1 (2025-02-01) [V]: §IV-A–§IV-G, the doubt-hunting checklist of pass 5.
6. Lean community, "Did you prove it?" (undated; read 2026-10-23) [V]: "Does the repository compile? Is the proof being checked?" and "Does your work prove what you claim it proves?".
7. PostgreSQL 18 documentation, §13.2.3 "Serializable Isolation Level" (read 2026-10-23) [V]: the retry requirement, and a guarantee stated for committed Serializable transactions.
8. Twin: Hietala & Torlak, "Lean Into Verified Software Development", AWS Open Source Blog (2024-04-08) [V], section "How Cedar uses Lean for verification-guided development".
9. Dated incident: Adamczewski, "OEIS Open", arXiv 2608.11941 (v1 2026-08-12) [V], §2.3 "Proof verification": a headline 147/492 becomes 144/492 under Comparator's verdicts.

---

## 12. Time budget against the roadmap

| Part | Hours [D] | Basis |
|---|---|---|
| Read | 0.5–1.0 | §11 items 1–4 |
| Lessons | — | spine §3.11, which counts no lesson time for steps; the two step briefings at core rates (40–60 min each) plus 5–10 min of re-entry cards would add 1.4–2.2 h (§13, issues 1–2) |
| Build | 2.5–5.1 | LAB-10.1–LAB-10.7: 152 nominal minutes, up to 2× |
| Write | 6.8–11.7 | spine §3.11: the report's writing and publication, with LAB-10.8 at 25 nominal minutes (§3.10); counting LAB-10.8 as its nine passes, 325 nominal minutes up to 2× (5.4–10.8 h), plus LAB-10.9 (0.4–0.8 h) and the CL-10.1 and CL-10.2 cards (0.5–0.8 h), gives 6.3–12.4 h (§13, issue 2) |
| Defence | 1.5–2.0 | spine §3.11 |
| **Total** | **11.4–19.7** | spine §3.11: 2.4–4.1 weeks at 6 h/week (4.75 h of stage work); 1.4–2.4 weeks at 10 h/week (8.25 h). This spec's own count is 12.2–22.7 h: 2.6–4.8 and 1.5–2.8 weeks (§13, issue 2) |

The roadmap gives Stage 10 no bound ("open-ended"); against the spine's six-week cap (28.5 h at 6 h/week) GATE-budget passes on either count, with no lower-bound warning because the roadmap states none. Until §13, issue 2 is decided, this spec plans with the spine's figures; its own count is higher because the briefings add lesson time and the nine passes are counted explicitly. Excluded: LAB-10.10, the overlay and the Keep block. Claim cadence at 6 h/week: a specimen or fragment claim in weeks 1–2, CL-10.1 in weeks 2–3, [C] and [N] claims in weeks 3–4, CL-10.2 in week 5; no two-week gap.

---

## 13. Spine issues

1. **The S10 KCs have no first lesson.** GATE-kc places each KC's prequestion, call and exit item "in its first lesson", but KC-10.* appear only in `[step]`s. This spec gives S10.L6 and S10.L7 step briefings, outside lesson counts. Proposed: GATE-kc reads "first lesson or step briefing", and §3.10 records the briefings.
2. **S10's budget understates its work.** §3.11 shows "—" for S10's lessons and §3.10 gives LAB-10.8 25 minutes, while the Write column plans 6.8–11.7 h. This spec runs LAB-10.8 as nine passes (325 nominal minutes) and counts 12.2–22.7 h, still inside the cap; until this is decided, §3.3 and §12 carry the spine's figures. Proposed: record LAB-10.8 as a multi-pass write stage whose passes each fit a weekday or weekend window (spine §3.0; splitting it would change OD-15's count) and update §3.11's S10 row. Adopting it, with or without S9's Defence proposal (S9's spec, §14, item 1), raises the arc's high estimate from 194 h to about 197 h, which projects to about 79–80 weeks at 6 h/week, just past the roadmap's 18 months [D].
3. **S10 has no audit anchors**, against §12 item 9's "at least two per stage". Proposed **AUD-10.1** (G11): sound twin, a report that counts only results re-checked outside the producing environment and logs each discrepancy as a doubt; flawed variant, a PROVED count that includes results checked only inside it; based on OEIS Open (2026-08-12; https://arxiv.org/abs/2608.11941, §2.3: 147/492 at the headline, 144/492 under Comparator); evidence, the receipt whose environment matches the producer's, beside the out-of-band verdict. Proposed **AUD-10.2** (G1a): sound twin, a report listing performance and resource limits under NOT COVERED; flawed variant, a summary implying fitness for use with no such line; based on AxDafny (2026-06-30; https://arxiv.org/abs/2606.32007: 89 of 127 verified programs failed resource limits); evidence, a scenario every PROVED line permits and the requirement forbids. Optional **AUD-10.3** (G8a, snapshot drift): based on PutnamBench issue #353 (2026-09-13; https://github.com/trishullab/PutnamBench/issues/353: 187 of 672 statements edited after creation).
4. **The LAB-10.1 proposal's witness has no specimen ID.** Proposed SP-10.1, "a fee leg outside the guard overdraws the sender", status {{run:RUN-core-demo}}.
5. **S10.L6's instrument list is short**: the reference replay uses INS-interp and phones see Bench runs through INS-receipt, both already covering S10 in §9.1. Proposed: add both to the row.
6. **RUN-core-demo is overloaded** (LAB-10.c1's skeleton, CL-10.1's status, an S10.L7 cell, CL-10.1's "if weakened" witness). Proposed: list its outputs in §9.5, or split them.
7. **Misconception tags collide.** The pedagogy digest's G1–G9 share names with gap classes G1–G13. This spec writes `dp:` tags, as S1's spec does, and uses no `dp:G*` tag. Proposed: the spine fixes the `dp:` prefix.
8. **Catalog additions dp:X6–dp:X9** are proposed (§1.1). Other stage specs may propose X-series entries; the digest's owner should assign final IDs.
9. **No CL template covers [C] or [N]**, yet LAB-10.c8 requires a CONFIGURED section. This spec has the learner write those records; claim@1 validation must accept claims without a template, and GATE-budget's cadence check must count them.
10. **Part C's own-repo case can be empty**: a learner who used no agent has no harvestable commits. This spec falls back to `statespace audit gen`; the spine should say so.
11. **S10's Part B has seven mutations**, one per learner-owned component, above §3.0's four to six. The Defence budget absorbs it; record the exception.
12. **LAB-10.c8 names seven sections**, but [?] claims and [R] specimens also need places. This spec adds UNKNOWN and the specimens; amend the check's text.
13. **Two small catalog gaps**: §8.3's stages for GEN-find-the-witness omit S10, whose Defence samples it (add S10, or exempt Defence sampling); KC-10.publish-limitations could take soft edges from KC-5.bounded-scope and KC-2.statement-pinning, which S10.L7's segment 3 leans on.
