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
- **Smoke test.** `scripts/site/smoke.sh` runs Chromium in the Playwright image v1.63.0-noble at 360 px, and all 17 tests pass. The new `apps/site/e2e/pages.spec.ts` opens every page. Each must show one visible h1, which is not the could-not-load or not-found heading, and no console error. Results:

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
