# W1 wave report

## Happy path build (2026-10-26)

On 2026-10-26 the owner changed the order of work. The course's happy path is built completely first, so a learner can go through every stage on the site. Bugs, gates, extra runs and polish come later, in separate passes. One site agent and twenty content agents built it, and an integrator checked the result. This section is that record.

### What was built

**Content.** Every lesson the spine lists now has a page. Each page is `draft: true` and carries the spine's title and tier.

| Stage | Lessons | Lesson minutes | Drawers listed | Lab | Lab stages | Lab minutes |
|---|---|---|---|---|---|---|
| S1 | 6 (L0 to L5) | 162 | 6 | LAB-1 | 6 | 112 |
| S2 | 11 (L0 to L10) | 321 | 7 | LAB-2 | 8 | 182 |
| S3 | 9 | 264 | 3 | LAB-3 | 13 | 372 |
| S4 | 9 | 248 | 8 | LAB-4 | 9 | 212 |
| S5 | 9 | 247 | 3 | LAB-5 | 7 | 147 |
| S6 | 9 | 274 | 6 | LAB-6 | 9 | 192 |
| S7 | 8 | 248 | 5 | LAB-7 | 8 | 172 |
| S8 | 7 | 180 | 5 | LAB-8 | 9 | 192 |
| S9 | 9 | 267 | 4 | LAB-9 | 12 | 412 |
| S10 | 7 | 143 | 14 | LAB-10 | 10 | 527 |
| **Total** | **84** | **2,354 (about 39 hours)** | **61 listings of 34 drawers** | **10** | **91** | **2,520 (about 42 hours)** |

- **Lesson tiers:** 1 start page (S1.L0, "Start here"), 26 core lessons, 50 bridges and 7 re-entry steps (S10.L1 to S10.L7). Together they have 273 segments.
- **Blocks:**
  - 174 instrument cells, 158 of them with a Call It.
  - 369 items. Each is a fixed `@choice` instance with a why on every option.
  - 48 claim blocks, 72 specimen blocks and 193 cards.
- **Stage and lab data:** every stage has a `stage.yaml` and a `lab.yaml`. The ten labs have 91 stages, each saying what it asks, and 83 checks with pass conditions.
- **Drawers:** all 34 registry drawers are written. D-01 to D-23 each open with a "Try first" question, then reading segments, then a "Check yourself" segment, with 80 items in all. D-30 to D-40 are deferred cards (topic, why, trigger).

**Site screens** (`apps/site`):
- **Shell:** five destinations (Today, Stages, Bench, Audit, Claims), a bottom bar under 900 px and a top bar from 900 px, a skip link, and a footer with the license line and the source link.
- **Start page:** "Start the course" goes to S1.L0. "All stages" goes to the stage list.
- **/stages:** the ten stages, each with its roadmap question, lesson count and minutes.
- **/stages/:stage:** the lessons in order, the lab and its stages, the drawers, and previous and next stage.
- **/lessons/:id:**
  - A title block, a draft banner and a rail of segment titles.
  - All six block types render. Footnotes become sidenotes.
  - Answers are recorded.
  - Previous and next links run in course order, from S1.L0 to S10.L7.
- **/drawers/:id:** the same renderer, without calls.
- **/labs/:lab:** each lab stage with its minutes, what it asks, its checks, and the `statespace check` command.
- **/today:** continues the lesson you were on, or starts at S1.L0.
- **/bench:** the ten labs, how to install the tools, and the CLI commands.
- **/claims:** the claims your answers have minted.
- **/audit:** a placeholder.
- **From earlier:** /specimens and /mirror.

**Checks at the end of the build:**
- **Content build.** `node scripts/build-content.mjs --check --json` reports 0 errors. It reports 568 warnings:
  - 455 `run-pending`, from 77 registered runs that pages cite but `runs/` does not hold.
  - 59 `row-differs`.
  - 52 `item-kc`.
  - 2 `title-differs`.
- **Site build.** `npm run build -w apps/site` passes. It runs the content build, the names step, the typecheck, `vite build`, then writes `404.html`.
- **Smoke test.** `scripts/site/smoke.sh` runs Chromium in the pinned Playwright image (`mcr.microsoft.com/playwright:v1.63.0-noble`) at 360 px, and all 17 tests pass. The new `apps/site/e2e/pages.spec.ts` opens every page. Each must show one visible h1, which is not the could-not-load or not-found heading, and no console error. Results:

  | Pages | Render |
  |---|---|
  | Start page, /stages and the ten stage pages | 12 of 12 |
  | Lessons | 84 of 84 |
  | Labs | 10 of 10 |
  | Drawers | 34 of 34 |

  `routes.spec.ts` also covers Today, Bench, Claims, Audit, Specimens and Mirror. It checks for sideways scroll at 360 and 320 px, and that a learner can answer a lesson and then find their place on Today.
- **Privacy.** `node scripts/verify-privacy.mjs` passes. No hashed term list is set on this machine, so only the local identity was checked. A search of the new and changed files found no personal paths, no user names and no real course domain. "Mini-Plinth" and `miniplinth` are the roadmap names that OD-2 keeps.

No content or site fixes were needed at integration. The integrator added `pages.spec.ts` and made `smoke.sh` run it.

### What a learner can do now

A learner can open the site, press "Start the course" and walk all 84 lessons in order, from S1.L0 to S10.L7.
- On each lesson they make the Call It before a cell's result shows, then see the result, the why for every option and the after text.
- They answer the graded items and see the key with every why.
- Claims and specimens unlock once the questions above them are answered.
- They can open any drawer from a stage or a lesson.
- They can read each lab's stages and checks.
- Their answers survive a reload. Today takes them back to where they stopped, and Claims shows what they have minted.

### What is stubbed

- **Cells.** A cell shows its recorded run only. There is no engine in the tab, and no download, Stop, edit-and-run or stamps. 117 of the 174 cells cite a run that is not recorded yet, so after the call they show "run not yet recorded". The call, the whys and the after text still show.
- **Items.** Every lesson item is a fixed instance. The 80 drawer items are placeholders that say they come in a later build.
- **Screens:**
  - Today has no scheduler plan.
  - Claims has no claim strips, rests-on view or export.
  - The Bench has no receipt import and no doctor panel.
  - There is no search, no settings, no run sheet behind run IDs and no "stale since" badge.
  - Stage pages have no Defence, seams, anchors or budget.
  - The Audit Desk is a placeholder page.
- **Labs.** The labs are descriptions and checks only. There are no starter repositories and no checkers behind `statespace check`. Hint ladders and Prove-it mutants are written for LAB-4, 5, 6, 8, 9 and 10 only.

### Follow-ups

1. **Record the runs.** 77 registered runs are cited and not recorded. The authors' reports name the exact cell code for each.
   - The most cited are RUN-twin-pins (the twin cards in most stages), RUN-lean-s2-cells (S2), RUN-lean-golden-harness (S3 and S10), RUN-tv-reference (S9) and RUN-z3-cti-pair (S4 and S10).
   - Re-record RUN-z3-selftransfer to match S2.L8's cell.
   - Give the `settle` cell in S4.L1 a run of its own.
   - Record the extended cell code in S10.L3 and S10.L6.
   - Add named values where pages now say a result in words:
     - the unsigned-guard witness in RUN-z3-bv64;
     - the neighbouring query in RUN-z3-unknown-pow;
     - the SQLSTATE for each isolation level in RUN-pg-claims.
2. **Run the code nobody ran.** No Lean toolchain was available for S2.L0 to S2.L5, S3.L6 to S3.L9, S9.L1, and S9.L4 to S9.L6, and S3.L6 to S3.L9 had no Z3 either. Their keys are design keys until the runs above are recorded.
3. **Generators.** Build the seeded generators. Then swap them in for the fixed lesson items, and give the drawers their 80 items.
4. **Live engines in the tab.** Z3 in Pyodide, PGlite, Goal Replay, the TLC instruments, Datalog, the Derivation Board, the pair viewer, the interpreter, the history viewer and receipts. Several cells use a notation no engine reads yet, so each needs an input format:
   - the Derivation Board's plain-text derivations (S4.L2, S4.L3);
   - the pair and interpreter notation (S7);
   - the isolationtester-style histories (S6.L6, S6.L8);
   - the IR (S9);
   - the interpreter pseudo-notation (S2.L10).
5. **Lab starters and checkers.**
   - The `statespace-lab` template and each lab's starter, including mini-plinth-core for LAB-3.
   - Checkers for the 83 checks.
   - Hint ladders and Prove-it mutants for LAB-1, 2, 3 and 7.
6. **The Audit Desk.** It is a placeholder route now.
7. **Gates:**
   - **Front-matter lists.** GATE-codes flags front-matter ID lists in flow style (`kcs: [KC-…]`), which the README's model page uses. Every author switched to block lists. Fix the example or the gate.
   - **`item-kc`.** The check should consult `previews` and spiral KCs (`packages/content/src/check.ts`).
   - **GATE-items.** It finds keys longer than their distractors and odd-one-out cues on most pages. These are for the polish pass.
   - **GATE-calls.** It has no engine for TLC, PGlite, the Bench or receipts, and cannot read keys that are decisions or ranges.
   - **GATE-lessons.** S7.L7 and S7.L8 each have two prequestions: an erosion forecast plus the spec's own. The owner decides.
   - **Word counter.** It blanks only the first line of a fenced block in prose or an item stem, so code counts toward the bridge word cap and the counts read high (`maskForWords` in `scripts/spikes/W1-T38/lib/text.mjs`).
   - **`row-differs`.** The 59 warnings mostly come from the one-instrument-per-segment rule. Change the spine rows or the pages.
   - **GATE-kc.** It finds gaps in S4.L2 and S4.L4.
8. **Owner decisions the authors flagged:**
   - Run IDs that give away the answer to their own call: RUN-z3-inductive, RUN-z3-vacuity-trap and RUN-tlc-resolved-twice.
   - Specimen names and KC names that give answers away (S1.L0, S6).
   - S2.L3's Build this card names LAB-2.2, which comes after S2.L5.
   - The shape of the open `extra` fields in S9's stage and lab data.
   - Claim and specimen names belong in the registry. The site reads them from SPINE.md through `scripts/site/build-names.mjs`.

## Phase 2 — recorded runs (2026-10-26)

Follow-up 1 ("Record the runs") and part of follow-up 2. Every value below is what a tool printed into a record under `runs/`; where a lesson had said more than its run shows, the lesson changed, not the record.

### Runs recorded

- **56 new records**, all with argv, hashed inputs and outputs, and containers named by digest where a container ran:
  - Lean (12): RUN-lean-s2-cells, -noguard, -ih-ungeneralised, -intent, -stuck, -nat-trunc, -implemented-by, -golden-harness, -finmap, -stack-machine, -preservation-frag, -hoist [X RUN-lean-s2-cells, RUN-lean-noguard, RUN-lean-ih-ungeneralised, RUN-lean-intent, RUN-lean-stuck, RUN-lean-nat-trunc, RUN-lean-implemented-by, RUN-lean-golden-harness, RUN-lean-finmap, RUN-lean-stack-machine, RUN-lean-preservation-frag, RUN-lean-hoist].
  - Z3 (14): RUN-z3-cti-pair (with the S4.L1 settle cell as its own configuration), -wp-transfer, -missing-frame, -nat-trunc, -inductive, -inductive-param, -vacuity-trap, -capture, -cross-tenant, -hierarchy-unknown, -selfcomp, -leaky-field, -count-channel, and RUN-check-fragment [X RUN-z3-cti-pair, RUN-z3-wp-transfer, RUN-z3-missing-frame, RUN-z3-nat-trunc, RUN-z3-inductive, RUN-z3-inductive-param, RUN-z3-vacuity-trap, RUN-z3-capture, RUN-z3-cross-tenant, RUN-z3-hierarchy-unknown, RUN-z3-selfcomp, RUN-z3-leaky-field, RUN-z3-count-channel, RUN-check-fragment].
  - TLC and PlusCal (16): RUN-pcal-doublespend, RUN-tlc-lifecycle, -never-twice, -resolved-twice, -starbucks15, -bare-property, -hold-fairness, -eventually, -inductive, -double-charge, -outbox-safety, -lost-effect, -fresh-key, -key-ttl, -crash-liveness, -recovery [X RUN-pcal-doublespend, RUN-tlc-lifecycle, RUN-tlc-never-twice, RUN-tlc-resolved-twice, RUN-tlc-starbucks15, RUN-tlc-bare-property, RUN-tlc-hold-fairness, RUN-tlc-eventually, RUN-tlc-inductive, RUN-tlc-double-charge, RUN-tlc-outbox-safety, RUN-tlc-lost-effect, RUN-tlc-fresh-key, RUN-tlc-key-ttl, RUN-tlc-crash-liveness, RUN-tlc-recovery].
  - PostgreSQL and PGlite (12): RUN-pg-sql-semantics, -sum-null, -enforce-commit, -conditional-concurrent, -read-skew, -mixed-levels, -rls-semantics, -rls-owner, -rls-covert, -rls-differential, -one-db, and RUN-pglite-inbound-key [X RUN-pg-sql-semantics, RUN-pg-sum-null, RUN-pg-enforce-commit, RUN-pg-conditional-concurrent, RUN-pg-read-skew, RUN-pg-mixed-levels, RUN-pg-rls-semantics, RUN-pg-rls-owner, RUN-pg-rls-covert, RUN-pg-rls-differential, RUN-pg-one-db, RUN-pglite-inbound-key].
  - Soufflé (1): RUN-datalog-matrix [X RUN-datalog-matrix]. Twin pins (1): RUN-twin-pins, one `git ls-remote` per pinned repository [X RUN-twin-pins].
- **Named values added to three imported records** (copied from their logs, which they already hash), through `scripts/runs/import-research.mjs` so `--check` still holds:
  - RUN-z3-unknown-pow: the neighbouring query's line is now a verdict line, with `values.neighbour_query` and `values.neighbour_verdict`, which is unsat [X RUN-z3-unknown-pow#values.neighbour_verdict].
  - RUN-z3-bv64: `values.unsigned_guard_witness.{A,X}`, with A = 13835060254305419776 [X RUN-z3-bv64#values.unsigned_guard_witness.A].
  - RUN-pg-claims: the SQLSTATE per isolation level, `values.e1_sqlstate.{read_committed,repeatable_read,serializable}`, `values.e2_sqlstate_repeatable_read`, `values.e3_sqlstate_serializable`; under repeatable read the second writer gets 40001 [X RUN-pg-claims#values.e1_sqlstate.repeatable_read].
- **Registry repairs:**
  - `runs/index.json` was stale (the new records were not in it); rebuilt, 153 records.
  - The recorders named the follow-up in four different fields (`task_label`, `task_ref`, `follow_up`, `recorded_for`) because run@1's `task` pattern rejects `W1-followup-1`. All 56 now use `task_label`, and their notes say so.
  - RUN-pglite-inbound-key's committed harness held a private host path. It now reads `<sandbox>/…`; the record's input hash and size are the committed copy's, and a note keeps the hash of the file as it ran.
  - RUN-twin-pins had a null `image` with no reason; `unrecorded` now gives one (git ran on the host).

### Lessons changed to match the runs

One call key changed; every other edit is prose or a citation.

- **S8.L5 cell 3, key A to B:** with sends bounded, EventuallyAcked is violated under strong worker fairness and unlimited crashes; TLC's lasso spends the attempts across crash/recover cycles [X RUN-tlc-recovery].
- S8.L5 cell 2: setup says sends are bounded at three attempts, and the whys say the crash lands before Ack, not that Dispatch starves [X RUN-tlc-recovery].
- S8.L4 cell 3: states that both engines mint the key with `uuidv7()` [X RUN-pglite-inbound-key].
- S8.L7: Stripe card drops the pin citation (no repository to pin) [X RUN-twin-pins].
- S1.L0 cell 2: @after cites the run that executed that query [X RUN-z3-boot-variant].
- S1.L2 cell 1: @after names the neighbouring query the run printed [X RUN-z3-unknown-pow].
- S1.L3: an item stem prints the verdict, unsat, from the record instead of typing it [X RUN-z3-starter#values.guarded].
- S2.L0: "goal displayed at each step, recorded" now says only that the proof builds; goal states are another run's [X RUN-lean-s2-cells, RUN-lean-plaingoal].
- S2.L10: "accepted by every checker" became "Lean proves every one": the comparator was not run [X RUN-lean-intent].
- S2.L5 cell 3: the call no longer claims a run; the record says no claim-card validator ran [X RUN-lean-s2-cells].
- S3.L2, S3.L3, S3.L7 (six interpreter cells): moved from RUN-lean-golden-harness, whose notes say it does not back them, to the pending RUN-interp-goldens [X RUN-lean-golden-harness].
- S3.L8 cell 1: @after quotes the message Lean printed [X RUN-lean-stuck].
- S3.L7 footnote: the truncation example cites the Lean run that shows it [X RUN-lean-nat-trunc].
- S3 `lab.yaml` LAB-3.c1: cites the golden harness only for what it shows [X RUN-lean-golden-harness].
- S3.L6 and `stage.yaml` Cedar cards: the pin is on the repository, not the paper [X RUN-twin-pins].
- S4.L5 cell 1: @after says the query returns its verdict and then the model print fails, as the run exited [X RUN-z3-missing-frame].
- S4.L2 cell 2: the call cites the run that executed the cell [X RUN-z3-wp-transfer].
- S4.L4 cell 3 and S4.L6 step 1: no longer say a model was printed; the cells print only verdicts and checks [X RUN-z3-cti-pair].
- S5.L5 item: the hand-written trace became the trace TLC printed [X RUN-tlc-resolved-twice].
- S5.L7 cell 3: cites its own run and says the deadlock check is off [X RUN-tlc-eventually]; S5 `lab.yaml` LAB-5.c5(a) says the same.
- S5.L6 cell 3: adds how TLC reports the bare property [X RUN-tlc-bare-property].
- S5.L9: adds the CTI TLC found [X RUN-tlc-inductive].
- S6.L6: "n histories" now prints the measured count, 126 [X RUN-pg-conditional-concurrent#values.histories].
- S6.L9 cells 1 and 2: cite their own runs instead of catalog rows [X RUN-pg-read-skew, RUN-pg-mixed-levels].
- S7.L2 cell 2: @after quotes Soufflé's provenance tree and its missing negated premise [X RUN-datalog-matrix].
- S7.L3 cells 1 and 2: no printed model claimed; the unknown reason is the recorded one [X RUN-z3-cross-tenant, RUN-z3-hierarchy-unknown].
- S7.L6 cells 2 and 3: @after states only the recorded verdicts [X RUN-z3-selfcomp].
- S7.L7 cell 1: the cure "drop the field" is incomplete; the general query still leaks through another field [X RUN-z3-leaky-field].
- S7.L1, S7.L8, S7 `stage.yaml` Zanzibar cards: pin citation replaced by the read date (a paper has no commit) [X RUN-twin-pins].
- S9.L4: "one line" became "three short tactics" [X RUN-lean-preservation-frag].
- S9.L6 cell 1: no longer claims a recorded elaboration the record lacks [X RUN-lean-preservation-frag].
- S9.L7 cell 2: @after quotes the constraints `omega` printed [X RUN-lean-hoist].
- S9.L8: cites the one-database run and its recorded command tags [X RUN-pg-one-db].
- S9.L9 card and S9 `lab.yaml` LAB-9.c2: the pin is CompCert's repository; the proofs ran in plain Lean, without the comparator [X RUN-twin-pins, RUN-lean-stack-machine].
- S10.L1: moved off RUN-lean-golden-harness to the pending RUN-interp-goldens; the verdict rests on rule R-set [X RUN-lean-golden-harness].
- S10.L6, S10.L7 Cedar cards: print the pinned commit, 301bdd22df134786a8a1312e24138afcd3f8bffe [X RUN-twin-pins#values.pins.cedar-spec.sha].

### Runs still pending

22 registered runs are cited and not recorded (77 before this phase). Each waits for something not built yet:

- **Reference interpreter and typechecker** (LAB-3 template, mini-plinth-core): RUN-interp-goldens (S3, S10), RUN-interp-revocation and RUN-interp-new-enemy (S7).
- **LAB-3 reference semantics in Lean:** RUN-lean-step-invariant, -progress, -preservation, -bigsmall, -unsafe-cmd, -golden-redef, -postings-refine (S3).
- **Pair checker:** RUN-pairs-reference (S7).
- **LAB-9 template, the S9 IR semantics and the validators:** RUN-tv-reference, RUN-lean-abort-blind, RUN-lean-leaky-compile, RUN-sql-shape-validator, RUN-sql-validation (S9).
- **History checker and fixtures** (INS-history, the LAB-6.7 manifest): RUN-history-g2item, RUN-serializability-fixtures; the differential generator: RUN-drt-transfers (S6).
- **Reference simulator and `statespace trace validate`:** RUN-tlc-trace-validation, RUN-sim-determinism (S8).
- **`statespace demo` (W5-T07):** RUN-core-demo (S10).

### Pending cells

- **38 of the 174 cells** now cite a run that is not recorded (117 before), in 25 lessons; 37 of them show "run not yet recorded" in place of the output, and one only behind its call key. Counted from the built pages in `apps/site/public/content`.
- 39 `{{run:}}` references in lesson prose still render the pending marker; with stage and lab data and one drawer, the content build reports 118 `run-pending` warnings.

### Still open from this phase

- **Re-record before release:** RUN-lean-s2-cells, RUN-lean-noguard and RUN-lean-preservation-frag hash whole lesson files that later prose edits changed (S2.L0, S2.L5, S9.L4); their cell code is unchanged, and the release lane fails on them until they are re-run.
- **Citations that resolve to records that don't back them:** S9.L6 cells 1–3 and LAB-9.c10 (RUN-lean-preservation-frag), S9.L7 cell 1 (RUN-lean-hoist), S4.L7 cell 1 and LAB-4.c1 (RUN-check-fragment). Each needs its own pending ID in the spine or an extended record.
- **Runs not yet given their own record:** RUN-z3-selftransfer for S2.L8's cell; the settle cell (S4.L1) is a configuration of RUN-z3-cti-pair; the S8.L5 segment item (EventuallyDispatched) was never run.
- **New named values not yet printed:** S1.L2 and S1.L5 can now print the values added above.
- **Schema:** decide whether run@1's `task` pattern admits follow-up labels, or whether `task_label` joins the schema.
- **Curriculum drift:** `curriculum/S08-*.md` still holds the old S8.L5 key and the strong-fairness remedy; `curriculum/S03-semantics.md` line 308 and the S6 claim CL-6.2 also predate these runs.
- **Gates the reconcilers met:** GATE-calls reads the first verdict line of a multi-line cell (S4.L4#3, S7.L3#2) and compares recorded older releases with today's Z3 (S4.L9#1); cvc5 needs `--arrays-exp` for S5.L9 cell 1.
- **Lesson animations, interactive tools and games** (the owner's request): not part of the reconcile or the registry; it needs its own task in `apps/site` and the lesson pages.

## Phase 1 — lesson pages, screens and teaching aids (2026-10-26)

The lesson pages and the working screens now live in the Little Library world that the start page and the stage pages already had, and twenty interactive teaching aids ("toys") sit inside the lessons where they teach. `DESIGN.md` (Components) and `.impeccable/design.json` describe the new components.

### What shipped

- **A lesson is a chapter inside its volume.** A full-width running head in the volume's ink carries the volume numeral and name (a link back to the stage), the address and a small cover figure. The opener sets the lesson number large and light ("L3", "Boot" for L0) beside the title, then the objective, one quiet line (format, minutes, questions answered), the draft banner and a ruled colophon whose "Checked by" groups runs under their engine and version. Drawers use the series black and read "Drawer beside S5 Time".
- **Reading layout.** From 1100 px: a sticky contents rail numbering segments §1, §2 … with the current one marked by weight and a 3-px rule, a reading column of at most 680 px, and a margin for sidenotes and the "Build this" and "Reading" plates. Below 1100 px the rail is the old disclosure.
- **Exercises and figures.** Questions are numbered exercises ("Exercise 1.2 · Before this segment") with ruled, full-width choices and a round mark that fills when picked; the confidence taps are one segmented control. Recorded runs are numbered figures ("Figure 2.1 · Z3 · recorded run" plus the run ID). Claims and specimens are museum labels. The chapter ends with "What this lesson establishes", the drawers beside it, and a pager whose next lesson is set large behind the round series flag.
- **Working screens.** Today, Claims, Specimens, Mirror, the Bench, the lab pages, the Audit Desk and Not found share one page head (Jost title, Source Serif lede, 3-px ink rule, no eyebrow) and use ruled rows instead of boxed cards. Today makes "where you stopped" the hero, with a mini-cover of the next lesson's volume, and gives the week in ranges. Claims is a ruled ledger; Specimens is a cabinet of labels in uneven sizes. A lab page reads as a lab manual: a time plan, numbered steps with minutes, and the checks as a ruled checklist in plain text. The Audit Desk placeholder now says what the Desk will do, from `docs/AUDIT-DESK.md`, with no fake cases. Not found reads the typed address back and lists how addresses read.
- **Night mode.** A new token, `--vol-lift` (0% by day, 64% at night), lifts volume-ink numerals so dark inks such as vol-5 stay readable at night; the stage catalogue numerals and the doubt-log toy use it too.
- **Integration fixes in this pass.** Call It's picked mark now fills by background, not an inset shadow, so the Mirror test's "no shadow" rule passes again (126 of 126 unit tests). The toy strip is set in the same type as a recorded-run figure strip. The page heads on Claims, Specimens, the Audit Desk and Not found now match the others in spacing, lede face and lede colour. Today's first-session line quotes "safe" as the agent's word (GATE-codes).

### The toy catalogue

Each toy computes a real thing about a small model the lesson discusses, says what it covers, and says that no solver, checker or database runs on the page. Each sits right after the segment that introduces its idea and loads only when the lesson opens.

| Toy | Lesson, after | What you do and what it shows |
|---|---|---|
| Get past the guard (game) | S1.L0 §1 | Pick balances and an amount; the page runs the PR's guard and shows the witnesses (165 of a 1,000-pick grid). The fixed guard has none on the grid, and the grid says nothing beyond it. |
| Past the largest value | S1.L5 §3 | At 8 and 64 bits an addition that passes the guard wraps; over Int, with X > 0, nothing does. |
| Which state does ih talk about? | S2.L7 §3 | Step induction with a fixed header and with `generalizing s`, and see which state the hypothesis is about. |
| Fool the pinned statements (game) | S2.L10 §4 | Find a transfer that passes the four pinned statements but breaks the requirement; `transfer_moves` stops them all on the grid. |
| Step it, one rule at a time | S3.L4 §2 | Small-step four calls; each ends done, in an error, or stuck with no rule. |
| Switch a decision, watch the calls move | S3.L7 §2 | Change a policy decision and watch five calls change outcome. |
| Push Inv back through Transfer | S4.L3 §1 | Push the invariant backward under three guard readings. |
| Reach the counterexample (game) | S4.L6 §2 | Drive the twin from Init to a CTI and then below zero; the good model reaches none within 6 steps. |
| You are the scheduler (game) | S5.L3 §2 | Interleave two workers' Read and Write to overpay; the atomic repair has no such order. |
| Whose promise ends the cycle (game) | S5.L7 §2 | Write a Fair line and read each lasso against it. |
| You are the scheduler (game) | S6.L6 §4 | Order two transactions under three isolation levels and four compilations. |
| Find a serial order | S6.L8 §4 | Replay five histories in both serial orders. |
| Tell frank's two worlds apart (game) | S7.L5 §2 | Find pairs of worlds frank's view tells apart under Open v0 and global slugs. |
| Related under ~Acme, or not | S7.L6 §2 | Change a second world's fields; the page says whether the worlds are related and whether the observer can tell. |
| Place the crash yourself (game) | S8.L3 §2 | Allow one crash in a window and try to make the provider charge twice. |
| Strand a row below the mark | S8.L3 §4 | Strand a late-committed row under a mark-based poller. |
| Whose stack is it? | S9.L1 §2 | Run `comp e` on a stack machine from any starting stack. |
| Close the square, or break it | S9.L7 §2 | Step source and edited IR and sweep the grid for starts where they differ. |
| Counterexample to induction, or a bug? | S10.L6 §3 | Pick a pre-state and step; tell an unreached CTI from a reached one. |
| Keep the doubt log (game) | S10.L7 §3 | Call what the log reads after each event before the page applies the rules. |

### Checked

`npx tsc -p apps/site` is clean. `npm run build -w apps/site` succeeds. `node scripts/verify-stamps.mjs` reports only the known S8.L7 content finding. 126 of 126 unit tests pass (`node --test` over `apps/site/src/**/test/*.test.mjs`). Sixteen routes (/, /stages/S2, five lessons, a drawer, Today, Claims, Specimens, Mirror, the Bench, LAB-5, the Audit Desk, a missing page) were opened at 1440 and 390 in light and dark with a seeded ledger: no horizontal scroll, nothing overflowing past the viewport, no console errors. All 20 toy placements render after the segment they name, at 360 and 1440 in light and dark, each with controls and a live status line and no page scroll sideways.

### Follow-ups

- A "Build this" plate that closes a segment floats below that segment's last paragraph rather than beside it; moving the card earlier in the content, or a placement step, would tighten it.
- At night the vol-5 and vol-10 surfaces (small covers, squares, the S5 and S10 figure strips) sit close to the dark ground; squares carry an ink outline and every stage is named in text, but a night tint for the volume inks is a token decision still to make.
- The Mirror's section heads stay in ink because its render test allows only ink tokens; allowing `--rubric` there is the test owner's call. The top nav still marks TODAY on /mirror (App.tsx).
- `/bench`, `/labs/` and `/audit` are not full bleed, so a lab page has no running-head band; extending `data-bleed` to `/labs/` would allow one.
- Toys: some SVG labels shrink to about 9 px at 360 px (s5-fairness ring, s6-scheduler timeline); the map cells of s9-hoist and s10-cti take only mouse clicks (the number inputs give the keyboard path); s2-generalize's chain could carry a real list mirror.
- The lesson-page loading, failed and missing states (`components/page/states.tsx`) were not restyled in this phase.
- GATE-codes still reports five bracketed IDs in S5.L6–S5.L9 content front matter and prose, and the LAB-2 title "The verified ledger" uses a bare "verified" on the Bench; both are content, not the site.
- The e2e suite (`npm run e2e -w apps/site`, with its axe checks) was not run in this phase.

## Phase 3 — Audit Desk and generators (2026-10-26)

The Audit Desk now holds real cases, and fourteen generator families draw fresh questions in the tab. Every Desk key, scenario answer and receipt line is copied from a run recorded in the Bench image; every generated item is keyed when it is graded, by a checker that runs in the page and prints its bound.

### What a learner can now do

- **Audit an agent's claim, end to end.** `/audit` starts a session of mixed sound and flawed cases (4 while the pool has fewer pairs than a 5-case session needs), or opens any case from the catalogue at `/audit/case/AUD-n.k/m`. A case runs the five steps of AUDIT-DESK section 5: call the statement alone, with how sure you are (the call is final); read the agent's diff and the receipt from a recorded run; write "This proves: ___" and answer the scenarios; name the kind of gap (G1 to G13 in three groups, or none: sound); point at one to three lines. Filing shows the answer key, the scenario answers with the run line behind each, the other case of the pair side by side, and the dated incident the anchor is based on.
- **See audit accuracy.** `/audit` shows flawed cases found, sound cases accepted and balanced accuracy, from the learner's own findings on unseen cases, with each rate held back until ten cases count. Nothing is stored but the events.
- **Practise on fresh questions.** Drawers place generated items; S1.L1 now has one beside its fixed question; Today shows "Practice, drawn fresh", up to three items from families whose first lesson the learner has met. Each item draws a new seed, grades in the page, shows the state where the pick and the answer differ, the box it checked, the checker, and every option's why, and offers "Draw another". Nothing locks.

### Anchors shipped

25 anchors, 120 cases (60 sound, 60 flawed), every one with a matched pair and all but the five pending ones with variant pairs:

| Stage | Anchors | Kinds of gap |
|---|---|---|
| S1 | AUD-1.1, AUD-1.2, AUD-1.3 | G2, G4, G5 |
| S2 | AUD-2.1 to AUD-2.4 (variants pending, W2-T13) | G1, G6a, G6c, G8a |
| S3 | AUD-3.1, AUD-3.2 | G8, G4 |
| S4 | AUD-4.1, AUD-4.2, AUD-4.3 | G8, G1, G13 |
| S5 | AUD-5.1 to AUD-5.4 | G3, G7, G5, G9 |
| S6 | AUD-6.1, AUD-6.2, AUD-6.3 | G11, G10, G6e |
| S7 | AUD-7.1, AUD-7.2 | G10, G12 |
| S8 | AUD-8.1, AUD-8.2 | G7, G8 |
| S9 | AUD-9.1, AUD-9.2 | G10, G11 |

AUDIT-DESK and the spine define no S10 anchors; S10's Defence Part C harvests a case with `statespace audit` (not built). The key runs recorded for the Desk, all in the Bench image with `--network none`: RUN-z3-vacuous-variants, RUN-z3-bv64-pairs, RUN-z3-inconclusive-pairs, RUN-lean-refund-both, RUN-lean-axioms-pair, RUN-lean-skipkernel-pair, RUN-lean-comparator-pair, RUN-lean-checker-drift, RUN-lean-nat-pair, RUN-z3-frame-pair, RUN-z3-noguard-pair, RUN-z3-cti-variants, RUN-tlc-hold-kind, RUN-tlc-hold-env, RUN-tlc-deadlock-stop, RUN-tlc-split-guard, RUN-pg-withdraw-split, RUN-drt-transfers, RUN-pg-pool-levels, RUN-history-g2item, RUN-z3-observer-pairs, RUN-pg-observer-pairs, RUN-z3-declassify-pairs, RUN-tlc-env-assumption, RUN-tlc-trace-drift, RUN-lean-abort-blind and RUN-pg-validator-pairs. The three Lean records of Phase 2 that hashed edited lesson files (RUN-lean-s2-cells, RUN-lean-noguard, RUN-lean-preservation-frag) were re-run: every log came back byte-identical, and only their input hashes and times changed. The 22 run IDs the spine does not register are listed in `packages/ids/proposals.json` for the next spine revision.

### Families shipped

| Family | Templates | Engine in the page |
|---|---|---|
| GEN-negate-it | t1–t4 | negate box |
| GEN-find-the-witness | t1–t4 | witness pocket |
| GEN-call-it | t1, t2, t4 (t3 pending, W4-T20) | call pocket |
| GEN-which-stamp | t1–t3 | the stamp deriver |
| GEN-spot-the-gap | t1–t4 | gap check |
| GEN-spec-it | t1–t3 | spec scope |
| GEN-proof-structure | t1–t3 | tactic model |
| GEN-defend | t1–t4 | defend box |
| GEN-wp-it | t1–t3 | wp box |
| GEN-cti-or-bug | t1–t3 | CTI box |
| GEN-trace-allowed | t1–t3 | trace graph |
| GEN-lasso-or-not | t1, t2 | lasso check |
| GEN-anomaly-id | t1–t4 | history check over recorded PostgreSQL histories |
| GEN-leaks-to-observer | t1–t3 | pair check |

All serve pick mode. GATE-generators is green on the fourteen and the fixture family, with determinism digests recorded in Chromium, Firefox and WebKit. Every stem and basis says the check ran in this page over a printed box, and names the engine it stands in for.

### Integration in this pass

- **GATE-links** was red: the 22 new Desk run IDs were unregistered. They are now proposals, pending the next spine revision.
- **GATE-codes** was red on Desk files: run lines and code (a receipt's `[E1 …]`, a Python `[HIDDEN for …]`) read as bracket codes. The gate now skips an audit case's verbatim keys (`statement`, `diff`, `receipt`, `key_line`, `key_lines`, `reference`), and three `explain` texts lost a bare "correct". The S5.L6 to S5.L9 front matter now writes its KC and drawer lists as block lists, so their IDs are no longer bracketed. GATE-codes is green and its self-check catches all 18 planted faults.
- **GATE-stamps:** AUD-9.2's requirement no longer puts [P] in requirement fit; only the old S8.L7 finding remains.
- **GATE-numbers:** the Playwright image tag in this report's first section is now quoted as an image name.
- **Site:** a single case opened from the catalogue reads "The case" instead of a misleading "Case 1"; on phones the answer key's scenario table puts each why on its own line; generated options written as words (verdicts, predictions) are set in the reading face with `code` spans, not in monospace with literal backticks.
- **Tracker:** tasks.yaml and docs/TRACKER.md moved 15 tasks to `review` and 119 to `in-progress`, each with a note naming what is missing.

### Checked

`npx tsc -p apps/site` clean; `npm run build -w apps/site` succeeds; 126 site unit tests, 167 generator tests and 170 content tests pass. Green: GATE-generators, GATE-audit-blind (advisory longest-diff note only), GATE-runs, GATE-links, GATE-codes, GATE-numbers, GATE-schema, GATE-coverage, GATE-privacy (local identity only). Screenshots at 1440 and 390 of /audit, a full case (call, reveal, this proves, kind of gap, evidence, answer key), audit accuracy, drawer D-03 graded, S1.L1's generated item and Today's practice set: no horizontal scroll, no console errors, no request off localhost.

### Follow-ups

- **GATE-audit** (15 findings): key-run on AUD-2.2, 2.3, 7.2, 8.2 and 9.2, where the spine's Key run cell names a run that is imported without argv or not yet recorded; no GEN-spot-the-gap `auditBattery`; exemplars short of six for G1, G2, G3, G6, G7, G9, G12 and G13.
- **GATE-items** (735 findings): option-balance, cue and blind-strategy findings on every generated family, and the authored stage items found before this phase.
- **Desk:** no stamp after filing; evidence for witness, paired-states and scenario types is graded by the stand-in rule (lines that include a load-bearing one), not replayed; sessions ignore `scheduled_after`; the call rides on the audit event until event@1 admits AUD refs; judgment code should move to `packages/learner` with its property tests; the case header names the anchor's medium even for a variant in another; the differing line in the pair figures is not marked.
- **Generators:** pick mode only; GeneratedItem shows one choice part (GEN-call-it t4 shows a placeholder), never `grade.why` on a miss; keys rest on in-page checkers, not Z3, TLC, Lean or the history checker; most lesson items keep their fixed choice, so families reach learners through drawers and Today.
- **Pre-existing, not from this phase:** GATE-kc (7 dose failures), GATE-calls (S1.L0 and S10 cells), GATE-lessons (S7.L7, S7.L8 anatomy), GATE-specimens (SP-4.2, SP-7.1, SP-7.2), GATE-conformance (Pyodide against native Z3), GATE-bundle (Today and lesson route budgets, fonts, routes, search at 360 px, the fragment canary), and GATE-runs' 36 changed inputs that the release lane fails on.
- **Review queue** is 12.4 hours, over the 10-hour gate.
