# statespace: task tracker

**Status:** as of 2026-10-25, 17 of the 263 tasks are `done` and 6 are in `review`: W0-S13, W0-T09 and W0-T10, and W0-S01, W0-S02 and W0-S08, which OD-6 reopened on 2026-10-25 and whose re-review covers only their addenda. The other 240 are `todo`. On the review page the owner accepted all 20 W0 tasks the wave workflow verified (see [the W0 wave report](waves/W0-report.md), sections 9 and 10). The owner's review queue is 4.5 hours, under the 10-hour gate (OD-7); W0-T11, the exit review, starts once those six are `done`. **Source of truth:** [tracker/tasks.yaml](../tracker/tasks.yaml). This page is its human view, and [tracker/README.md](../tracker/README.md) explains how both files are used and updated. **Source:** [the spine](spine/SPINE.md), section 13 (revision 3), refined with the work the companion specifications name: [PLAN.md](PLAN.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ASSESSMENT.md](ASSESSMENT.md), [DESIGN.md](DESIGN.md), [WORLD.md](WORLD.md), [AUDIT-DESK.md](AUDIT-DESK.md), the [lab manuals](../labs/) and the [curriculum](../curriculum/).

## How to read this page

Every task from spine section 13 keeps its ID, title and scope; PLAN.md and the other documents cite all of them, so none is renumbered. Where a section 13 task is too large for one agent session, it becomes a **milestone**: its children carry the work under new IDs that continue the wave's sequence, and the milestone closes when they are done and its own acceptance passes. **Added** tasks are work the spine or the brief requires but section 13 assigns to no task: per-stage Defence content, most drawers, several gates, the instrument bus, the content pipeline, each wave's screen-reader pass and exit review. **Proposed** tasks are scope that a companion specification proposes beyond the spine; they wait for the owner's adoption (W0-T09, W0-T10).

Each line reads `- [ ] ID · title · size · model · deps`. Sizes: S is at most 3 agent-days, M at most 2 weeks, L at most 6 weeks. The model follows the spine's rule (decision 24): opus for architecture, hard content, proofs, graders, checkers and adversarial review; sonnet for clearly specified work. Descriptions, deliverables, acceptance, review hours and the reason for each model choice are in tasks.yaml.

### Status legend

| Marker | Status | Meaning |
|---|---|---|
| `[ ]` | todo | not started; selectable once the wave is open and every dependency is done |
| `[~]` | in-progress | an agent or person is working on it |
| `[=]` | review | acceptance verified (gates green, runs recorded); waiting for the owner if the task has owner review, and counted in the review queue |
| `[x]` | done | accepted, and reviewed where owner review applies |

GitHub renders only `[ ]` and `[x]` as boxes; the other two markers appear as text. A wave starts only when the previous wave's exit task is done with its gates green and the owner's review queue is under 10 hours (OD-7).

## Summary

### Tasks per wave

| Wave | Goal | Tasks | Milestones | S | M | L | opus | sonnet | Owner review (h) | Spine section 13 review (h) |
|---|---|---|---|---|---|---|---|---|---|---|
| W0 | Spikes and foundations | 24 | 0 | 16 | 8 | 0 | 9 | 15 | 17 | 13.75 |
| W1 | Project 00 slice | 47 | 4 | 12 | 35 | 0 | 31 | 16 | 33.25 | 29.75 |
| W2 | Proof | 46 | 7 | 20 | 26 | 0 | 35 | 11 | 42 | 39.75 |
| W3 | Obligations and Time | 45 | 10 | 17 | 28 | 0 | 33 | 12 | 35 | 33.25 |
| W4 | Correspondence and Secrecy | 45 | 9 | 16 | 29 | 0 | 35 | 10 | 35 | 32.25 |
| W5 | Effects, Preservation and Assembly | 42 | 7 | 16 | 25 | 1 | 35 | 7 | 37 | 34 |
| W6 | Launch hardening | 14 | 2 | 7 | 7 | 0 | 6 | 8 | 10.5 | 10 |
| **Total** | | **263** | **39** | **104** | **158** | **1** | **184** | **79** | **209.75** | **192.75** |

The spine column includes about 1 hour per wave for the W1-W5 screen-reader passes, as spine section 13 does. Milestones are sized S because their children carry the work; tasks.yaml records the spine's original size as `spine_size`. The 109 spine tasks (the 108 of revision 2 and W0-S13) keep section 13's figures: 20, 20, 18, 15, 15, 13 and 8 tasks in W0–W6; 25 S, 63 M and 21 L, counting each milestone at its `spine_size`; 65 opus and 44 sonnet.

### Per model, per size and per origin

| | Count | Share |
|---|---|---|
| opus | 184 | 70% |
| sonnet | 79 | 30% |
| S | 104 | 40% |
| M | 158 | 60% |
| L | 1 | 0% |
| origin: spine | 109 | 41% |
| origin: refined | 115 | 44% |
| origin: added | 38 | 14% |
| origin: proposed | 1 | 0% |

### Owner review against the spine's calendar

The spine's calendar counts about 193 hours of owner review [D]: 187.75 hours of section 13 task estimates plus about 1 hour per wave for the W1–W5 screen-reader passes. The tracker plans 209.75 hours. The table shows where the difference comes from.

| Source | Tasks | Owner review (h) |
|---|---|---|
| Section 13 estimates, carried by the spine tasks and their children | 224 | 185 |
| Residuals on stage milestones (stage pages, production-twin cards, S9's two mini-Defences) and the two prerequisite drawers inside W4-T13 | W1-T10, W2-T09, W3-T03, W3-T11, W4-T05, W4-T09, W4-T13, W5-T02, W5-T05, W5-T07 | 3 |
| Screen-reader passes, which the spine's totals already count | W1-T46, W2-T45, W3-T44, W4-T44, W5-T41 | 5 |
| Defence content for every stage | W2-T40, W2-T41, W3-T42, W4-T42, W5-T37, W5-T38 | 4.25 |
| Drawers and deferred-drawer triggers | W1-T44, W2-T43, W2-T44, W3-T43, W4-T43, W5-T39, W5-T40 | 4 |
| Gates, the instrument bus and the content pipeline | W0-T08, W1-T35, W1-T36, W1-T38, W1-T39, W1-T40, W1-T41, W1-T42, W1-T43, W2-T42 | 3 |
| Owner decisions and spine revision 3 | W0-T09, W0-T10 | 2.5 |
| Wave exit reviews and the edition 1 release | W0-T11, W1-T47, W2-T46, W3-T45, W4-T45, W5-T42, W6-T14 | 2 |
| Boot's placement walk | W1-T45 | 0.5 |
| Proposed by companion specifications (W4-T41, awaiting adoption) | W4-T41 | 0.5 |
| **Total** | **263** | **209.75** |

The first two rows carry section 13's scope: 188 hours in the tracker against the spine's 187.75, because the tracker's split of the stage milestones gives them figures of their own, and the tracker's figures govern (spine section 13). Net of the screen-reader passes, the tracker adds 17 hours to the spine's calendar, about 7 weeks at 2.5 hours a week; the proposed task, which the owner may decline, accounts for 0.5 of them. If a wave's total outruns its window, the cut order of spine section 14 applies before the queue gate is relaxed, and logged review time replaces these estimates after each wave (PLAN.md section 14.5).

### Gaps in section 13 that the added tasks fill

- **Defence content.** Section 13 builds the Defence engine (W2-T12), checks S2's Part B mutants inside LAB-2 (W2-T02) and configures S9's two mini-Defences (W5-T05), but no task authors the other stages' Parts A–D, and W2's exit needs S1's and S2's for RUN-lz-signoff-w2: W2-T40, W2-T41, W3-T42, W4-T42, W5-T37, W5-T38.
- **Infrastructure.** The instrument bus and host (ARCHITECTURE.md sections 5–6) and the content pipeline (section 3.3) have no section 13 task of their own: W1-T35, W1-T36.
- **ER-6 in W2.** W2's exit ships ER-6 under GATE-erosions, but GATE-erosions and M-erosion-forecast belong to W3-T12: W2-T42 builds a first version, and W3-T34 extends it.
- **Drawers.** Section 13 names each just-in-time drawer under a task of its stage and gives the deferred drawers' cards to W1-T44 and their triggers to W3-T35, W4-T12 and W5-T40 (spine revision 3, from PLAN.md spine issue 8); the tracker carries the drawer work in tasks of its own, as curriculum/D-drawers.md section 8.1 proposes: W1-T44, W2-T43, W2-T44, W3-T43, W4-T43, W5-T39, W5-T40.
- **Gates used before anyone builds them.** Section 13 tasks name these gates in acceptance from W1 on, but implement GATE-items, GATE-audit-blind, GATE-bundle and GATE-a11y only in W6 (W6-T01, W6-T02, W6-T06) and GATE-specimens' PostgreSQL rows in W4 (W4-T02), and assign GATE-facts, GATE-lessons, GATE-audit, GATE-conformance and GATE-labs to no task. W0-T08 and W1-T38 to W1-T43 build them first; the W6 tasks keep their sweeps.
- **The validator plug-in.** BRIEF section 7.4 names four Clearinghouse plug-ins. Section 13 owned three until spine revision 3 gave the fourth, the validator, to W5-T13, so W5-T36, which adds the plans phase and the validator slot, is now that milestone's child.
- **Rules without tasks.** Each wave's screen-reader pass and exit check are rules in section 13, not tasks; the tracker makes them tasks so the queue and the wave gate can be computed. The owner reviewed the decisions on 2026-10-25 (W0-T09 records them), and the companion specifications list spine issues (W0-T10).

### Proposed tasks and proposed run IDs

W4-T41 (a Lean reference for S7, from curriculum/S07-secrecy.md SI-8) is a proposal, and no workflow selects it until the owner adopts it; tasks.yaml marks it `adopted: false`. W0-S13 (a trace-validation spike, from curriculum/S08-effects.md issue 1) was a proposal too: the owner adopted it on 2026-10-25 (decision Q-2), and spine revision 3 lists it in section 13, so its origin is now `spine`; tasks.yaml keeps `adopted: true` as the record of Q-2. Spine revision 3 also registered every run ID that a task listed under `proposed_ids`, and each task now names them, so no `proposed_ids` remain. A new run ID that a specification proposes goes under its task's `proposed_ids`, or into packages/ids/proposals.json, until the spine registers it; GATE-links reports it as pending meanwhile.

## Critical path

Two clocks pace the build (PLAN.md section 13.1). **Review sets the calendar:** the owner-review totals above, at 2.5 hours a week, give each wave's duration, and the spine projects about 18–21 months from W0's start before the additions. **Learner-zero gates three exits:** W1 needs S1 studied, W2 needs S1–S2 signed off, and W5 waits for the whole arc through S10.

Within each wave the longest dependency chain decides what to start first. Chain lengths are upper bounds in agent working days (S 3, M 10, L 30, a milestone 1; five working days to a week) and count only dependencies inside the wave, because waves run one after another; across waves the path passes through each wave's exit task. The table sets each chain beside the wave's review window.

| Wave | Longest chain (agent-days, upper bound) | ≈ weeks | Owner review (h) | ≈ weeks at 2.5 h/week | Learner-zero study the exit needs |
|---|---|---|---|---|---|
| W0 | 26 | 5.2 | 17 | 6.8 | none |
| W1 | 77 | 15.4 | 33.25 | 13.3 | S1: 5.3–9.4 h |
| W2 | 88 | 17.6 | 42 | 16.8 | S1–S2 signed off: 20.9–37.8 h |
| W3 | 50 | 10.0 | 35 | 14.0 | none at the exit; learner-zero studies S3–S4 meanwhile |
| W4 | 66 | 13.2 | 35 | 14.0 | none at the exit |
| W5 | 80 | 16.0 | 37 | 14.8 | the whole arc through S10: 107–197 h, about 43–80 weeks from W1's start at 6 h/week |
| W6 | 28 | 5.6 | 10.5 | 4.2 | none |

At their upper bounds the chains of W1, W2, W5 and W6 run slightly longer than the review windows, so those waves start their chain tasks on the first day; elsewhere owner review is the binding clock. Sizes are maxima and agents work in parallel, so real chains should be shorter. W5's exit waits for learner-zero's whole arc whatever the chain.

- **W0:** W0-T02 One JSON Schema with TypeScript and Python codegen → W0-S11 Receipt schema, `runs/`, lints → W0-T05 Devcontainer, `statespace doctor`, Codespaces prebuild → W0-T11 W0 exit review. In short, the single schema (W0-T02) and the runs registry (W0-S11) come first, because the CI lanes, the devcontainer and GATE-facts wait on them.
- **W1:** W1-T04 KC graph v0 (105 KCs) → W1-T21 Generator framework core → W1-T39 GATE-items → W1-T07 Call It and Mirror v0 → W1-T24 GEN-call-it → W1-T05 Generator framework and the first five families → W1-T08 Today, the Keep block and *Set your week* → W1-T09 Boot → W1-T46 W1 screen-reader pass → W1-T47 W1 exit review. In short, the KC graph (W1-T04) and the generator framework (W1-T21) come first; every family, Call It, Today and Boot wait on them.
- **W2:** W2-T32 Lean receipt section and verdict parsers → W2-T33 Comparator, kernel replay and sandbox recording → W2-T01 Lean lane in `statespace check` → W2-T34 Reference semantics in Lean → W2-T35 Kernel-checked goldens, semantics lint and IR export → W2-T07 Mini-Plinth reference semantics and goldens → W2-T25 LAB-3 stages LAB-3.1–LAB-3.3 → W2-T26 LAB-3 stages LAB-3.4–LAB-3.7 → W2-T27 LAB-3 capstone stages LAB-3.8–LAB-3.11 → W2-T06 Hint ladders and the explanation gate → W2-T45 W2 screen-reader pass → W2-T46 W2 exit review. In short, the Lean lane (W2-T32, W2-T33) and the reference semantics (W2-T34, W2-T35) gate LAB-3, whose checks the hint ladders (W2-T06) need.
- **W3:** W3-T05 TLC lane with pinned jars → W3-T23 Theater engine → W3-T27 GEN-trace-allowed → W3-T29 S5 lessons S5.L1–S5.L3 → W3-T35 ER-2 and ER-7 content → W3-T12 Claim graph, seams and erosion forecasts → W3-T44 W3 screen-reader pass → W3-T45 W3 exit review. In short, the TLC lane (W3-T05) gates the Theater, the trace generators and the S5 lessons, whose double spend cashes ER-2.
- **W4:** W4-T16 isorun driver → W4-T18 Abstract-serializability checker → W4-T24 Reference compiler and reference R(S, D) → W4-T34 Record the S6 runs → W4-T25 LAB-6 stages LAB-6.1–LAB-6.5 → W4-T26 LAB-6 stages LAB-6.6–LAB-6.9 → W4-T42 Defence content for S6 and S7 → W4-T45 W4 exit review. In short, isorun (W4-T16) and the serializability checker (W4-T18) gate the reference compiler, the S6 runs and LAB-6.
- **W5:** W5-T04 Stack-machine warm-up, S9 challenge packs, reference translation validator → W5-T22 Record the S9 runs → W5-T26 LAB-9 stages LAB-9.1–LAB-9.3 (half A) → W5-T27 LAB-9 preservation stages LAB-9.4–LAB-9.10 → W5-T28 LAB-9 stages LAB-9.11–LAB-9.12 → W5-T36 Plans phase and the validator slot → W5-T13 Clearinghouse provider and validator plug-ins; ER-12 → W5-T41 W5 screen-reader pass → W5-T42 W5 exit review. In short, the S9 challenge packs (W5-T04) and LAB-9's preservation stages (W5-T27, the only L task) are the long pole.
- **W6:** W6-T09 axe sweep across every screen → W6-T10 Full NVDA pass → W6-T01 Accessibility pass → W6-T12 Adversarial review: I1–I5 → W6-T08 Final adversarial review against I1–I10 → W6-T14 Edition 1 release. In short, the axe sweep and the screen-reader passes gate the adversarial review, which gates the release.

## W0: Spikes and foundations

**Goal.** Retire the tool risks, lay the evidence substrate, and fix the keep/kill rules before any data exists.

**Exit criteria** (spine section 13):

- Every spike has a recorded run and a decision record.
- The fast lane runs under 5 minutes (RUN-ci-fastlane).
- GATE-numbers fails on a planted untagged number, and GATE-runs on an unresolved run reference.
- GATE-privacy is green.
- The keep/kill rules are committed and hashed before the first learner-zero event (RUN-keepkill-rules).

**Load.** 24 tasks (16 S, 8 M, 0 L; 9 opus, 15 sonnet); owner review 17 h against the spine's 13.75 h. Learner-zero study the exit needs: none. The exit is recorded by W0-T11.

### Spikes

- [=] W0-S01 · Instrument origin on a custom subdomain · S · opus · —
- [=] W0-S02 · Pyodide-Z3 on real phones · S · sonnet · W0-S01
- [x] W0-S03 · Z3 `Fixedpoint` for Stage 7 · S · sonnet · —
- [x] W0-S04 · Spectacle on Stage 5/8 specs and state pairs · M · opus · —
- [x] W0-S05 · TLC lasso JSON · S · sonnet · —
- [x] W0-S06 · Sandbox lanes and `--paranoid` timing [X RUN-bwrap-lanes] · M · sonnet · —
- [x] W0-S07 · `vcgen` on a custom `Cmd` · S · opus · —
- [=] W0-S08 · PGlite RLS and first-load size · S · sonnet · —
- [x] W0-S09 · PostgreSQL 18.6 isolation catalog rows [X RUN-pg-anomalies] · M · sonnet · —
- [x] W0-S10 · Goal Replay via `$/lean/plainGoal` · S · sonnet · —
- [=] W0-S13 · Trace validation by TLC's trace-module method · S · opus · —

### Governance

- [x] W0-T01 · Publication hygiene · S · opus · —
- [x] W0-T03 · ID registry generated from this spine · M · sonnet · —
- [x] W0-T07 · Keep/kill rules fixed in advance (n = 1) · S · opus · W0-T02
- [=] W0-T09 · Owner review of OD-1 to OD-15 (added) · S · sonnet · —
- [=] W0-T10 · Spine revision 3 from the companion specs' issues (added) · M · opus · W0-T03

### Platform

- [x] W0-S12 · Vendoring and a React 19 / Vite 7 scaffold [X RUN-scaffold] · M · sonnet · —
- [x] W0-T04 · CI lanes: fast, nightly, release stub · S · sonnet · W0-S12, W0-S11
- [x] W0-T05 · Devcontainer, `statespace doctor`, Codespaces prebuild · M · sonnet · W0-S06, W0-S11

### Gates

- [x] W0-T06 · GATE-budget over the stage plans · S · sonnet · W0-T03
- [x] W0-T08 · GATE-facts and the facts registry (added) · S · opus · W0-S11

### Evidence and claims

- [x] W0-S11 · Receipt schema, `runs/`, lints · M · opus · W0-T02
- [x] W0-T02 · One JSON Schema with TypeScript and Python codegen · S · sonnet · —

### Wave exit

- [ ] W0-T11 · W0 exit review (added) · S · sonnet · every other W0 task

## W1: Project 00 slice

**Goal.** Boot, S1 and LAB-1 on the full loop, so that the first weekend works end to end.

**Exit criteria** (spine section 13):

- Learner-zero finishes Project 00, without the hint ladders and Prove-it, which ship in W2 (W2-T06, W2-T11), with at least two claims and two kept specimens.
- The Boot timing gate passes, and learner-zero's Boot time is recorded as descriptive, learner-zero only (RUN-lz-boot-w1).
- Blind strategies stay within chance + 2 SD.
- Learner-zero's median Today is at most 12 minutes (RUN-lz-today-w1, descriptive).
- Axe shows 0 serious issues, and the screen-reader pass is filed.
- Every S1 tool number is a run reference that resolves, and every S1 authored unsat is cross-checked with cvc5.
- The hook blocks a scripted agent edit.

**Load.** 47 tasks (12 S, 35 M, 0 L; 31 opus, 16 sonnet); owner review 33.25 h against the spine's 29.75 h. Learner-zero study the exit needs: S1: 5.3–9.4 h. The exit is recorded by W1-T47.

### Platform

- [ ] W1-T02 · App shell, navigation, service worker · M · sonnet · W0-S12, W1-T36, W1-T41
- [ ] W1-T18 · Agent kit, `llms.txt`, phone layouts · M · sonnet · W1-T13, W1-T36, W1-T41
- [ ] W1-T20 · Settings: export, merge-import with undo, 7-day backup nudge · M · sonnet · W1-T03, W1-T35
- [ ] W1-T31 · SCR-lab and SCR-bench (part of W1-T13) · M · sonnet · W1-T02, W1-T14, W1-T41
- [ ] W1-T35 · Instrument bus and host (added) · M · opus · W0-S01, W0-T02, W1-T41
- [ ] W1-T36 · Content pipeline (added) · M · sonnet · W0-S12, W0-T03, W0-S11

### Gates

- [ ] W1-T37 · GATE-calls (part of W1-T05) · M · opus · W1-T12
- [ ] W1-T38 · GATE-lessons (added) · S · sonnet · W1-T36
- [ ] W1-T39 · GATE-items (added) · M · opus · W1-T21
- [ ] W1-T40 · GATE-audit and GATE-audit-blind (added) · M · opus · W1-T21
- [ ] W1-T41 · GATE-bundle and GATE-a11y harness (added) · M · sonnet · W0-S12, W0-S02
- [ ] W1-T42 · GATE-specimens and GATE-conformance harnesses (added) · M · sonnet · W0-S11, W0-T04
- [ ] W1-T43 · GATE-labs harness (added) · M · opus · W0-T04, W1-T29

### Evidence and claims

- [ ] W1-T01 · Stamps, strip and tokens · M · opus · W0-S12
- [ ] W1-T03 · Event log and provenance · M · opus · W0-T02
- [ ] W1-T14 · Receipt import and claim minting · M · opus · W0-S11, W1-T35, W1-T41
- [ ] W1-T15 · Claim cards and GATE-claims · M · opus · W1-T14, W1-T12
- [ ] W1-T16 · Specimen cabinet · M · sonnet · W1-T03, W1-T12, W1-T42

### Runs

- [ ] W1-T12 · Record the S1 runs · S · sonnet · W0-S11

### Bench lanes

- [ ] W1-T29 · Bench CLI core: check, receipt verify, hash, run (part of W1-T13) · M · opus · W0-T05, W0-T02, W0-S11

### Instruments

- [ ] W1-T06 · INS-z3 cell with the download loader and recorded fallback · M · sonnet · W0-S01, W0-S02, W1-T35, W1-T41
- [ ] W1-T19 · Pocket checkers · M · opus · W1-T05, W1-T42

### Generators

- [ ] W1-T05 · Generator framework and the first five families (milestone) · S · opus · W1-T04, W0-S01, W1-T21, W1-T22, W1-T23, W1-T24, W1-T25, W1-T26, W1-T37
- [ ] W1-T21 · Generator framework core (part of W1-T05) · M · opus · W1-T04, W0-T02
- [ ] W1-T22 · GEN-negate-it (part of W1-T05) · M · opus · W1-T21, W1-T39
- [ ] W1-T23 · GEN-find-the-witness (part of W1-T05) · M · opus · W1-T21, W1-T39
- [ ] W1-T24 · GEN-call-it (part of W1-T05) · M · opus · W1-T21, W1-T07, W1-T39
- [ ] W1-T25 · GEN-spot-the-gap (part of W1-T05) · M · opus · W1-T21, W1-T40
- [ ] W1-T26 · GEN-which-stamp (part of W1-T05) · S · opus · W1-T21, W1-T01, W1-T39

### Learning engine

- [ ] W1-T04 · KC graph v0 (105 KCs) · M · opus · W0-T03
- [ ] W1-T07 · Call It and Mirror v0 · M · sonnet · W1-T03, W1-T39
- [ ] W1-T08 · Today, the Keep block and *Set your week* · M · sonnet · W1-T05

### Audit Desk

- [ ] W1-T17 · Audit Desk v1 with eight anchors (milestone) · S · opus · W1-T05, W1-T12, W1-T32, W1-T33, W1-T34, W1-T40
- [ ] W1-T32 · Audit Desk flow and scoring (part of W1-T17) · M · opus · W1-T03, W1-T25
- [ ] W1-T33 · Anchors AUD-1.1–AUD-1.3 with variants (part of W1-T17) · M · opus · W1-T25, W1-T12, W1-T40
- [ ] W1-T34 · Anchors AUD-2.1–AUD-2.4 and AUD-5.3 keyed by executed runs (part of W1-T17) · S · opus · W1-T32, W1-T40

### Stage S1: Boot, lessons, LAB-1, drawers

- [ ] W1-T09 · Boot · M · opus · W1-T05, W1-T06, W1-T07, W1-T08, W1-T12, W1-T38, W1-T41, W1-T45
- [ ] W1-T10 · S1 lessons S1.L1–S1.L5 (milestone) · S · opus · W1-T05, W1-T06, W1-T12, W1-T27, W1-T28
- [ ] W1-T11 · Drawers D-01–D-06 and D-13 · M · opus · W1-T04, W1-T12, W1-T36, W1-T38, W1-T01, W1-T21, W1-T39
- [ ] W1-T13 · LAB-1 and `statespace check` for Z3 (milestone) · S · opus · W0-S11, W1-T29, W1-T30, W1-T31, W1-T43
- [ ] W1-T27 · S1 lessons S1.L1–S1.L2 (part of W1-T10) · M · opus · W1-T22, W1-T23, W1-T24, W1-T26, W1-T06, W1-T12, W1-T37, W1-T38
- [ ] W1-T28 · S1 lessons S1.L3–S1.L5 (part of W1-T10) · M · opus · W1-T22, W1-T23, W1-T24, W1-T26, W1-T06, W1-T12, W1-T15, W1-T19, W1-T37, W1-T38
- [ ] W1-T30 · LAB-1 stages LAB-1.1–LAB-1.6 (part of W1-T13) · M · opus · W1-T29, W1-T12, W1-T15, W1-T43
- [ ] W1-T44 · Deferred drawer cards D-30–D-40 (added) · S · sonnet · W1-T11
- [ ] W1-T45 · S1 placement walk (added) · S · opus · W1-T22, W1-T23, W1-T24, W1-T11, W1-T38

### Accessibility

- [ ] W1-T46 · W1 screen-reader pass (added) · S · sonnet · W1-T02, W1-T06, W1-T07, W1-T08, W1-T09, W1-T11, W1-T13, W1-T14, W1-T15, W1-T16, W1-T17, W1-T20

### Wave exit

- [ ] W1-T47 · W1 exit review (added) · S · sonnet · every other W1 task

## W2: Proof

**Goal.** S2 and S3 with statement integrity: nothing an agent writes can change what is being proved.

**Exit criteria** (spine section 13):

- CI shows comparator rejecting a weakened statement and a redefined function [X RUN-lean-comparator], and kernel replay rejecting skipKernelTC [X RUN-lean-skipkernel].
- GATE-replay passes on a toolchain bump.
- Learner-zero signs off S1–S2 (RUN-lz-signoff-w2).
- ER-6 ships (GATE-erosions v0 and the ER-6 forecast, W2-T42).
- The screen-reader pass is filed.

**Load.** 46 tasks (20 S, 26 M, 0 L; 35 opus, 11 sonnet); owner review 42 h against the spine's 39.75 h. Learner-zero study the exit needs: S1–S2 signed off: 20.9–37.8 h. The exit is recorded by W2-T46.

### Runs

- [ ] W2-T10 · Record the S2–S3 runs (milestone) · S · sonnet · W2-T01, W2-T38, W2-T39
- [ ] W2-T38 · Record the S2 runs (part of W2-T10) · S · sonnet · W2-T33
- [ ] W2-T39 · Record the S3 runs (part of W2-T10) · S · sonnet · W2-T07, W2-T08

### Bench lanes

- [ ] W2-T01 · Lean lane in `statespace check` (milestone) · S · opus · W0-S06, W2-T32, W2-T33
- [ ] W2-T32 · Lean receipt section and verdict parsers (part of W2-T01) · M · opus · W1-T29, W0-S06
- [ ] W2-T33 · Comparator, kernel replay and sandbox recording (part of W2-T01) · M · opus · W2-T32

### Semantics

- [ ] W2-T07 · Mini-Plinth reference semantics and goldens (milestone) · S · opus · W2-T01, W2-T34, W2-T35
- [ ] W2-T34 · Reference semantics in Lean (part of W2-T07) · M · opus · W2-T01
- [ ] W2-T35 · Kernel-checked goldens, semantics lint and IR export (part of W2-T07) · M · opus · W2-T34

### Instruments

- [ ] W2-T03 · Goal Replay generator and UI · M · sonnet · W0-S10
- [ ] W2-T08 · IR schema, TypeScript interpreter, Lane A host · M · opus · W2-T07

### Generators

- [ ] W2-T11 · GEN-spec-it, GEN-proof-structure, GEN-defend (milestone) · S · opus · W1-T05, W2-T29, W2-T30, W2-T31
- [ ] W2-T29 · GEN-spec-it (part of W2-T11) · M · opus · W1-T22
- [ ] W2-T30 · GEN-proof-structure (part of W2-T11) · M · opus · W2-T03, W2-T01
- [ ] W2-T31 · GEN-defend and statespace defend (part of W2-T11) · M · opus · W2-T01, W1-T29, W2-T36, W2-T37

### Learning engine

- [ ] W2-T06 · Hint ladders and the explanation gate · M · opus · W2-T02, W2-T25, W2-T26, W2-T27
- [ ] W2-T12 · Defence engine, sign-off and retake · M · opus · W2-T11
- [ ] W2-T14 · Stuck protocol and parked goals · S · sonnet · W2-T01
- [ ] W2-T15 · Notes composer; learner-zero sign-off · S · sonnet · W2-T12, W2-T40
- [ ] W2-T16 · Welcome-back, re-entry, test-out and placement · M · sonnet · W1-T08, W2-T12
- [ ] W2-T17 · Refutation cards and sure-and-wrong returns · S · sonnet · W1-T07
- [ ] W2-T18 · Proof Blocks · M · sonnet · W2-T11

### Audit Desk

- [ ] W2-T13 · Anchors AUD-3.1–AUD-3.2; variants of AUD-2.1–AUD-2.4 · M · opus · W1-T17, W2-T01, W2-T10, W2-T39

### Erosions, assurance and the report

- [ ] W2-T42 · GATE-erosions v0 and the ER-6 forecast (added) · S · opus · W1-T15

### Stage S2: lessons, LAB-2, Defence, drawers

- [ ] W2-T02 · LAB-2 challenge pack and template (milestone) · S · opus · W2-T01, W2-T36, W2-T37
- [ ] W2-T04 · S2 lessons S2.L0–S2.L10 (milestone) · S · opus · W2-T03, W2-T10, W2-T05, W2-T19, W2-T20, W2-T21
- [ ] W2-T05 · Self-explanation unit (OD-10) · S · opus · —
- [ ] W2-T19 · S2 lessons S2.L1–S2.L4 (part of W2-T04) · M · opus · W2-T03, W2-T30, W2-T38, W2-T18
- [ ] W2-T20 · S2 lessons S2.L5–S2.L7 (part of W2-T04) · M · opus · W2-T03, W2-T30, W2-T38, W2-T01
- [ ] W2-T21 · S2 lessons S2.L8–S2.L10 (part of W2-T04) · M · opus · W2-T03, W2-T30, W2-T38, W2-T01, W2-T08
- [ ] W2-T36 · LAB-2 stages LAB-2.1–LAB-2.4 with the challenge pack (part of W2-T02) · M · opus · W2-T33
- [ ] W2-T37 · LAB-2 stages LAB-2.5–LAB-2.8 (part of W2-T02) · M · opus · W2-T36
- [ ] W2-T40 · Defence content for S1 and S2 (added) · M · opus · W2-T12, W2-T31, W1-T13, W2-T02, W2-T13, W1-T17
- [ ] W2-T43 · Drawers D-07, D-08 and D-15 (added) · S · opus · W2-T38, W1-T11

### Stage S3: lessons, LAB-3, Defence, drawers

- [ ] W2-T09 · S3 lessons and LAB-3 with capstone stages (milestone) · S · opus · W2-T08, W2-T10, W2-T06, W2-T42, W2-T22, W2-T23, W2-T24, W2-T25, W2-T26, W2-T27, W2-T28
- [ ] W2-T22 · S3 lessons S3.L1–S3.L3 (part of W2-T09) · M · opus · W2-T08, W2-T39, W2-T30
- [ ] W2-T23 · S3 lessons S3.L4–S3.L6 (part of W2-T09) · M · opus · W2-T08, W2-T39, W2-T30
- [ ] W2-T24 · S3 lessons S3.L7–S3.L9 (part of W2-T09) · M · opus · W2-T08, W2-T39, W2-T42
- [ ] W2-T25 · LAB-3 stages LAB-3.1–LAB-3.3 (part of W2-T09) · M · opus · W2-T07, W2-T33
- [ ] W2-T26 · LAB-3 stages LAB-3.4–LAB-3.7 (part of W2-T09) · M · opus · W2-T25
- [ ] W2-T27 · LAB-3 capstone stages LAB-3.8–LAB-3.11 (part of W2-T09) · M · opus · W2-T26, W2-T08
- [ ] W2-T28 · LAB-3 stretch stages LAB-3.12–LAB-3.13 (part of W2-T09) · S · opus · W2-T26
- [ ] W2-T41 · Defence content for S3 (added) · S · opus · W2-T12, W2-T31, W2-T25, W2-T26, W2-T27, W2-T13
- [ ] W2-T44 · Drawers D-14, D-22 and D-23 (added) · S · opus · W2-T08

### Accessibility

- [ ] W2-T45 · W2 screen-reader pass (added) · S · sonnet · W2-T03, W2-T06, W2-T12, W2-T14, W2-T15, W2-T16, W2-T18

### Wave exit

- [ ] W2-T46 · W2 exit review (added) · S · sonnet · every other W2 task

## W3: Obligations and Time

**Goal.** S4 and S5: obligations derived by hand and checked by machine, then concurrency and liveness played by hand on real state graphs.

**Exit criteria** (spine section 13):

- Spectacle = TLC on every authored spec.
- The lasso validator agrees with TLC on its fixtures.
- ER-2 and ER-7 ship (GATE-erosions).
- The Derivation Board works keyboard-only.
- The Clearinghouse's first incidents pass GATE-audit-blind, with baselines recorded (RUN-docket-baselines).
- The screen-reader pass is filed.

**Load.** 45 tasks (17 S, 28 M, 0 L; 33 opus, 12 sonnet); owner review 35 h against the spine's 33.25 h. Learner-zero study the exit needs: none at the exit; learner-zero studies S3–S4 meanwhile. The exit is recorded by W3-T45.

### Runs

- [ ] W3-T07 · Record the S4–S5 runs (milestone) · S · sonnet · W3-T05, W3-T25, W3-T26
- [ ] W3-T25 · Record the S4 runs (part of W3-T07) · S · sonnet · W3-T21
- [ ] W3-T26 · Record the S5 runs (part of W3-T07) · S · sonnet · W3-T05

### Bench lanes

- [ ] W3-T05 · TLC lane with pinned jars · M · opus · W0-S05

### Instruments

- [ ] W3-T01 · Derivation Board · M · sonnet · W1-T06
- [ ] W3-T06 · Theater on TLC state graphs (milestone) · S · sonnet · W3-T05, W3-T23, W3-T24
- [ ] W3-T08 · Spectacle instrument and its minimap · M · sonnet · W0-S04
- [ ] W3-T09 · Lasso validator · M · opus · W0-S05
- [ ] W3-T23 · Theater engine (part of W3-T06) · M · sonnet · W3-T05
- [ ] W3-T24 · SCR-theater (part of W3-T06) · M · sonnet · W3-T23, W3-T09

### Generators

- [ ] W3-T02 · GEN-wp-it, GEN-cti-or-bug, CTI workbench (milestone) · S · opus · W3-T01, W3-T16, W3-T17
- [ ] W3-T10 · GEN-trace-allowed and GEN-lasso-or-not (milestone) · S · opus · W3-T09, W3-T27, W3-T28
- [ ] W3-T16 · GEN-wp-it (part of W3-T02) · M · opus · W3-T01
- [ ] W3-T17 · GEN-cti-or-bug and the CTI workbench (part of W3-T02) · M · opus · W3-T01, W3-T05
- [ ] W3-T27 · GEN-trace-allowed (part of W3-T10) · M · opus · W3-T05, W3-T23
- [ ] W3-T28 · GEN-lasso-or-not (part of W3-T10) · M · opus · W3-T09

### Learning engine

- [ ] W3-T15 · Change cards · S · sonnet · W0-S11
- [ ] W3-T38 · Lean keep-alive sessions (part of W3-T13) · M · opus · W2-T15, W1-T08

### Audit Desk

- [ ] W3-T13 · Anchors AUD-4.1–4.3, 5.1, 5.2, 5.4; AUD-5.3 variants; Lean keep-alive (milestone) · S · opus · W1-T17, W3-T05, W3-T07, W3-T36, W3-T37, W3-T38
- [ ] W3-T36 · Anchors AUD-4.1–AUD-4.3 (part of W3-T13) · M · opus · W3-T22, W3-T25
- [ ] W3-T37 · Anchors AUD-5.1, AUD-5.2, AUD-5.4 and AUD-5.3's variants (part of W3-T13) · M · opus · W3-T05, W3-T25, W3-T26

### Erosions, assurance and the report

- [ ] W3-T12 · Claim graph, seams and erosion forecasts (milestone) · S · opus · W1-T15, W3-T34, W3-T35
- [ ] W3-T34 · Typed claim graph and erosion propagation (part of W3-T12) · M · opus · W1-T15, W2-T42
- [ ] W3-T35 · ER-2 and ER-7 content (part of W3-T12) · S · opus · W3-T34, W3-T29, W3-T20

### Clearinghouse

- [ ] W3-T14 · Clearinghouse v0 (milestone) · S · opus · W2-T08, W1-T17, W3-T39, W3-T40, W3-T41
- [ ] W3-T39 · Clearinghouse world core (part of W3-T14) · M · opus · W2-T08, W3-T21
- [ ] W3-T40 · Clearinghouse incident families v0 (part of W3-T14) · M · opus · W3-T39, W1-T25, W3-T17
- [ ] W3-T41 · SCR-clearinghouse v0 (part of W3-T14) · M · sonnet · W3-T39

### Stage S4: lessons and LAB-4

- [ ] W3-T03 · S4 lessons (milestone) · S · opus · W3-T02, W3-T07, W3-T18, W3-T19, W3-T20
- [ ] W3-T04 · LAB-4 with the cvc5 cross-check (milestone) · S · opus · W2-T08, W3-T21, W3-T22
- [ ] W3-T18 · S4 lessons S4.L1–S4.L3 (part of W3-T03) · M · opus · W3-T01, W3-T16, W3-T25
- [ ] W3-T19 · S4 lessons S4.L4–S4.L6 (part of W3-T03) · M · opus · W3-T16, W3-T17, W3-T25, W3-T21
- [ ] W3-T20 · S4 lessons S4.L7–S4.L9 (part of W3-T03) · M · opus · W3-T25, W3-T21, W3-T22, W0-S07
- [ ] W3-T21 · LAB-4 stages LAB-4.1–LAB-4.4 with the template and ABI (part of W3-T04) · M · opus · W2-T08, W1-T29
- [ ] W3-T22 · LAB-4 stages LAB-4.5–LAB-4.9 (part of W3-T04) · M · opus · W3-T21

### Stage S5: lessons, LAB-5, Defence, drawers

- [ ] W3-T11 · S5 lessons and LAB-5 (milestone) · S · opus · W3-T06, W3-T07, W3-T29, W3-T30, W3-T31, W3-T32, W3-T33
- [ ] W3-T29 · S5 lessons S5.L1–S5.L3 (part of W3-T11) · M · opus · W3-T23, W3-T08, W3-T26, W3-T27
- [ ] W3-T30 · S5 lessons S5.L4–S5.L6 (part of W3-T11) · M · opus · W3-T23, W3-T08, W3-T09, W3-T26, W3-T27, W3-T28
- [ ] W3-T31 · S5 lessons S5.L7–S5.L9 (part of W3-T11) · M · opus · W3-T09, W3-T25, W3-T26, W3-T28, W3-T17
- [ ] W3-T32 · LAB-5 stages LAB-5.1–LAB-5.4 (part of W3-T11) · M · opus · W3-T05, W3-T26
- [ ] W3-T33 · LAB-5 stages LAB-5.5–LAB-5.7 (part of W3-T11) · M · opus · W3-T32, W3-T09, W3-T25
- [ ] W3-T42 · Defence content for S4 and S5 (added) · M · opus · W2-T12, W2-T31, W3-T22, W3-T33, W3-T36, W3-T37
- [ ] W3-T43 · Drawers D-09, D-10 and D-18 (added) · S · opus · W3-T25, W3-T26

### Accessibility

- [ ] W3-T44 · W3 screen-reader pass (added) · S · sonnet · W3-T01, W3-T06, W3-T08, W3-T12, W3-T14, W3-T15

### Wave exit

- [ ] W3-T45 · W3 exit review (added) · S · sonnet · every other W3 task

## W4: Correspondence and Secrecy

**Goal.** S6 and S7 on measured PostgreSQL: compiled commands compared with the semantics, and access-control and information-flow claims checked.

**Exit criteria** (spine section 13):

- Nightly PostgreSQL 18.6 asserts 22003, 40001, 40P01 and write skew at REPEATABLE READ [X RUN-pg-anomalies, RUN-pg-claims].
- The checker classifies the history fixture set.
- Tab Datalog = Soufflé.
- ER-1, ER-3 and ER-9 ship (GATE-erosions).
- The screen-reader pass is filed.

**Load.** 45 tasks (16 S, 29 M, 0 L; 35 opus, 10 sonnet); owner review 35 h against the spine's 32.25 h. Learner-zero study the exit needs: none at the exit. The exit is recorded by W4-T45.

### Gates

- [ ] W4-T02 · Nightly PostgreSQL specimens · M · sonnet · W4-T01

### Evidence and claims

- [ ] W4-T11 · Dated incidents in the specimen cabinet · M · opus · W4-T10

### Runs

- [ ] W4-T10 · Record the S6–S7 runs (milestone) · S · sonnet · W4-T01, W4-T34, W4-T35
- [ ] W4-T34 · Record the S6 runs (part of W4-T10) · S · sonnet · W4-T16, W4-T18, W4-T04, W4-T24
- [ ] W4-T35 · Record the S7 runs (part of W4-T10) · S · sonnet · W4-T07, W4-T27, W4-T16

### Bench lanes

- [ ] W4-T01 · `statespace isorun` (milestone) · S · opus · W0-S09, W4-T16, W4-T17
- [ ] W4-T16 · isorun driver (part of W4-T01) · M · opus · W0-S09, W0-T05
- [ ] W4-T17 · isorun on the upstream isolationtester specs (part of W4-T01) · M · sonnet · W4-T16

### Semantics

- [ ] W4-T41 · Lean reference extension for S7 (proposed) · M · opus · W2-T07

### Instruments

- [ ] W4-T03 · History viewer and serializability checker (milestone) · S · opus · W4-T01, W4-T18, W4-T19
- [ ] W4-T04 · PGlite instrument · M · sonnet · W0-S08
- [ ] W4-T07 · Datalog pair · M · sonnet · W0-S03
- [ ] W4-T08 · Paired-state evaluator and GEN-leaks-to-observer (milestone) · S · opus · W2-T08, W4-T27, W4-T28
- [ ] W4-T15 · Spec duels by URL · M · opus · W0-S01
- [ ] W4-T18 · Abstract-serializability checker (part of W4-T03) · M · opus · W4-T16, W2-T08
- [ ] W4-T19 · INS-history viewer and replayer (part of W4-T03) · M · sonnet · W4-T18
- [ ] W4-T27 · INS-pairs paired-state evaluator (part of W4-T08) · M · opus · W2-T08

### Generators

- [ ] W4-T20 · GEN-anomaly-id (part of W4-T05) · M · opus · W4-T18, W0-S09
- [ ] W4-T28 · GEN-leaks-to-observer (part of W4-T08) · M · opus · W4-T27

### Audit Desk

- [ ] W4-T13 · Anchors AUD-6.1–6.3, 7.1, 7.2; sibling bridge cards (milestone) · S · opus · W1-T17, W4-T01, W4-T10, W4-T36, W4-T37, W4-T38
- [ ] W4-T36 · Anchors AUD-6.1–AUD-6.3 (part of W4-T13) · M · opus · W4-T34, W4-T17
- [ ] W4-T37 · Anchors AUD-7.1–AUD-7.2 (part of W4-T13) · M · opus · W4-T35, W4-T27

### Erosions, assurance and the report

- [ ] W4-T12 · Erosions ER-1, ER-3, ER-9; drawer D-30 · S · opus · W3-T12, W4-T10, W4-T22, W4-T31

### Clearinghouse

- [ ] W4-T14 · Clearinghouse plug-ins: compiler, concurrent traffic, users, teams and documents (milestone) · S · opus · W3-T14, W4-T04, W4-T39, W4-T40
- [ ] W4-T39 · Traffic phase and the compiler slot (part of W4-T14) · M · opus · W3-T14, W4-T19, W4-T24, W4-T04
- [ ] W4-T40 · Access phase (part of W4-T14) · M · opus · W4-T39, W4-T07, W4-T27

### Stage S6: lessons, LAB-6, siblings

- [ ] W4-T05 · GEN-anomaly-id and S6 lessons (milestone) · S · opus · W4-T03, W4-T10, W4-T20, W4-T21, W4-T22, W4-T23
- [ ] W4-T06 · LAB-6 with its capstone stage (milestone) · S · opus · W4-T04, W4-T24, W4-T25, W4-T26
- [ ] W4-T21 · S6 lessons S6.L1–S6.L3 (part of W4-T05) · M · opus · W4-T04, W4-T34, W2-T08
- [ ] W4-T22 · S6 lessons S6.L4–S6.L6 (part of W4-T05) · M · opus · W4-T04, W4-T19, W4-T20, W4-T34, W4-T38
- [ ] W4-T23 · S6 lessons S6.L7–S6.L9 (part of W4-T05) · M · opus · W4-T18, W4-T19, W4-T20, W4-T34, W4-T38
- [ ] W4-T24 · Reference compiler and reference R(S, D) (part of W4-T06) · M · opus · W2-T08, W4-T04, W4-T18
- [ ] W4-T25 · LAB-6 stages LAB-6.1–LAB-6.5 (part of W4-T06) · M · opus · W4-T24, W4-T16, W4-T34
- [ ] W4-T26 · LAB-6 stages LAB-6.6–LAB-6.9 (part of W4-T06) · M · opus · W4-T25, W4-T18
- [ ] W4-T38 · Sibling bridge cards; D-11 and D-21 (part of W4-T13) · S · opus · W1-T11

### Stage S7: lessons, LAB-7, Defence, drawers

- [ ] W4-T09 · S7 lessons and LAB-7 with the RLS differential (milestone) · S · opus · W4-T07, W4-T08, W4-T10, W4-T29, W4-T30, W4-T31, W4-T32, W4-T33
- [ ] W4-T29 · S7 lessons S7.L1–S7.L4 (part of W4-T09) · M · opus · W4-T07, W4-T35, W4-T04
- [ ] W4-T30 · S7 lessons S7.L5–S7.L6 (part of W4-T09) · M · opus · W4-T27, W4-T28, W4-T35
- [ ] W4-T31 · S7 lessons S7.L7–S7.L8 (part of W4-T09) · M · opus · W4-T27, W4-T28, W4-T35, W4-T38
- [ ] W4-T32 · LAB-7 stages LAB-7.1–LAB-7.4 (part of W4-T09) · M · opus · W4-T07, W4-T35, W4-T16
- [ ] W4-T33 · LAB-7 stages LAB-7.5–LAB-7.8 (part of W4-T09) · M · opus · W4-T32, W4-T27
- [ ] W4-T42 · Defence content for S6 and S7 (added) · M · opus · W2-T12, W2-T31, W4-T26, W4-T33, W4-T36, W4-T37
- [ ] W4-T43 · Drawers D-16, D-17 and D-20 (added) · S · opus · W4-T35

### Accessibility

- [ ] W4-T44 · W4 screen-reader pass (added) · S · sonnet · W4-T03, W4-T04, W4-T07, W4-T08, W4-T11, W4-T14, W4-T15

### Wave exit

- [ ] W4-T45 · W4 exit review (added) · S · sonnet · every other W4 task

## W5: Effects, Preservation and Assembly

**Goal.** S8–S10 and the published report: effects modeled and simulated, a compiler step proved, and the Core assembled.

**Exit criteria** (spine section 13):

- Trace validation rejects the ack-before-durable mutant.
- Learner-zero publishes a report.
- GATE-release is green.
- ER-4, ER-5, ER-8, ER-10, ER-11 and ER-12 ship (GATE-erosions).
- The screen-reader pass is filed.

**Load.** 42 tasks (16 S, 25 M, 1 L; 35 opus, 7 sonnet); owner review 37 h against the spine's 34 h. Learner-zero study the exit needs: the whole arc through S10: 107–197 h, about 43–80 weeks from W1's start at 6 h/week. The exit is recorded by W5-T42.

### Gates

- [ ] W5-T09 · Release gate · S · opus · W5-T08

### Runs

- [ ] W5-T03 · Record the S8–S9 runs (milestone) · S · sonnet · W5-T01, W5-T04, W5-T21, W5-T22
- [ ] W5-T21 · Record the S8 runs (part of W5-T03) · S · sonnet · W3-T05, W5-T15
- [ ] W5-T22 · Record the S9 runs (part of W5-T03) · S · sonnet · W5-T04

### Bench lanes

- [ ] W5-T01 · Sim instrument and `statespace trace validate` (milestone) · S · opus · W3-T05, W5-T14, W5-T15, W0-S13
- [ ] W5-T14 · statespace trace validate and trace@1 (part of W5-T01) · M · opus · W3-T05, W0-S13

### Instruments

- [ ] W5-T15 · INS-sim and statespace sim (part of W5-T01) · M · opus · W2-T08, W5-T14

### Audit Desk

- [ ] W5-T11 · Anchors AUD-8.1–AUD-9.2 and `statespace audit` (milestone) · S · opus · W1-T17, W5-T01, W5-T03, W5-T32, W5-T33, W5-T34
- [ ] W5-T32 · Anchors AUD-8.1–AUD-8.2 (part of W5-T11) · M · opus · W5-T21, W5-T14
- [ ] W5-T33 · Anchors AUD-9.1–AUD-9.2 (part of W5-T11) · M · opus · W5-T22
- [ ] W5-T34 · statespace audit: your repo is the Audit Desk (part of W5-T11) · M · opus · W1-T25, W1-T29

### Erosions, assurance and the report

- [ ] W5-T06 · Report export from the claim graph · M · opus · W3-T12
- [ ] W5-T08 · `/assurance` and the course erosion log · M · sonnet · W0-S11
- [ ] W5-T10 · Erosions ER-4, ER-5, ER-8, ER-10, ER-11 · M · opus · W3-T12, W5-T03, W5-T16, W5-T17, W5-T25
- [ ] W5-T12 · Private overlay and learner-zero report · M · opus · W5-T06

### Clearinghouse

- [ ] W5-T13 · Clearinghouse provider and validator plug-ins; ER-12 (milestone) · S · opus · W4-T14, W5-T01, W3-T12, W5-T35, W5-T36
- [ ] W5-T35 · Effects phase and the outbox slot (part of W5-T13) · M · opus · W4-T14, W5-T15, W5-T14
- [ ] W5-T36 · Plans phase and the validator slot (part of W5-T13) · M · opus · W5-T35, W5-T28

### Stage S8: lessons, LAB-8, Defence, drawers

- [ ] W5-T02 · S8 lessons and LAB-8 (milestone) · S · opus · W5-T01, W5-T03, W5-T16, W5-T17, W5-T18, W5-T19, W5-T20
- [ ] W5-T16 · S8 lessons S8.L1–S8.L3 (part of W5-T02) · M · opus · W5-T21, W5-T39
- [ ] W5-T17 · S8 lessons S8.L4–S8.L5 (part of W5-T02) · M · opus · W5-T21
- [ ] W5-T18 · S8 lessons S8.L6–S8.L7 (part of W5-T02) · M · opus · W5-T21, W5-T01
- [ ] W5-T19 · LAB-8 stages LAB-8.1–LAB-8.4 (part of W5-T02) · M · opus · W5-T01, W5-T21
- [ ] W5-T20 · LAB-8 stages LAB-8.5–LAB-8.9 (part of W5-T02) · M · opus · W5-T19
- [ ] W5-T37 · Defence content for S8 (added) · S · opus · W2-T12, W2-T31, W5-T20, W5-T32
- [ ] W5-T39 · Drawers D-12 and D-19 (added) · S · opus · W5-T21

### Stage S9: lessons, LAB-9, challenge packs

- [ ] W5-T04 · Stack-machine warm-up, S9 challenge packs, reference translation validator · M · opus · W2-T01
- [ ] W5-T05 · S9 lessons and LAB-9 (milestone) · S · opus · W5-T04, W5-T03, W5-T23, W5-T24, W5-T25, W5-T26, W5-T27, W5-T28
- [ ] W5-T23 · S9 lessons S9.L1–S9.L4 (half A) (part of W5-T05) · M · opus · W5-T04, W5-T22
- [ ] W5-T24 · S9 lessons S9.L5–S9.L6 (part of W5-T05) · M · opus · W5-T04, W5-T22
- [ ] W5-T25 · S9 lessons S9.L7–S9.L9 (part of W5-T05) · M · opus · W5-T04, W5-T22
- [ ] W5-T26 · LAB-9 stages LAB-9.1–LAB-9.3 (half A) (part of W5-T05) · M · opus · W5-T04, W5-T22
- [ ] W5-T27 · LAB-9 preservation stages LAB-9.4–LAB-9.10 (part of W5-T05) · L · opus · W5-T26
- [ ] W5-T28 · LAB-9 stages LAB-9.11–LAB-9.12 (part of W5-T05) · M · opus · W5-T27

### Stage S10: LAB-10, Defence, triggers

- [ ] W5-T07 · LAB-10 and the demonstration recorder (milestone) · S · opus · W5-T06, W5-T29, W5-T30, W5-T31
- [ ] W5-T29 · LAB-10 stages LAB-10.1–LAB-10.3 (part of W5-T07) · M · opus · W5-T06, W5-T15
- [ ] W5-T30 · LAB-10 stages LAB-10.4–LAB-10.7 and the demonstration (part of W5-T07) · M · opus · W5-T29, W3-T40
- [ ] W5-T31 · LAB-10 stages LAB-10.8–LAB-10.10 (part of W5-T07) · M · opus · W5-T30, W5-T06
- [ ] W5-T38 · Defence content for S10, over the report (added) · S · opus · W2-T12, W5-T31, W5-T34
- [ ] W5-T40 · Deferred-drawer triggers D-31 and D-33–D-40 (added) · S · sonnet · W5-T06, W3-T34

### Accessibility

- [ ] W5-T41 · W5 screen-reader pass (added) · S · sonnet · W5-T01, W5-T06, W5-T08, W5-T12, W5-T13

### Wave exit

- [ ] W5-T42 · W5 exit review (added) · S · sonnet · every other W5 task

## W6: Launch hardening

**Goal.** Edition 1.

**Exit criteria** (spine section 13):

- GATE-release is green from a clean clone.
- Axe shows 0 serious issues on every screen, with full NVDA and VoiceOver passes.
- GATE-privacy is green.
- The edition pins are recorded.

**Load.** 14 tasks (7 S, 7 M, 0 L; 6 opus, 8 sonnet); owner review 10.5 h against the spine's 10 h. Learner-zero study the exit needs: none. The exit is recorded by W6-T14.

### Governance

- [ ] W6-T04 · Publication hygiene audit · S · opus · W5-T12
- [ ] W6-T08 · Final adversarial review against I1–I10 (milestone) · S · opus · W6-T01, W6-T02, W6-T03, W6-T04, W6-T05, W6-T06, W6-T07, W6-T12, W6-T13
- [ ] W6-T12 · Adversarial review: I1–I5 (part of W6-T08) · M · opus · W6-T01, W6-T02, W6-T03, W6-T04, W6-T05, W6-T06, W6-T07
- [ ] W6-T13 · Adversarial review: I6–I10 (part of W6-T08) · M · opus · W6-T01, W6-T02, W6-T03, W6-T04, W6-T05, W6-T06, W6-T07

### Platform

- [ ] W6-T02 · Performance budgets · M · sonnet · W5-T09
- [ ] W6-T03 · Glyphs and fonts · S · sonnet · W5-T09

### Gates

- [ ] W6-T06 · Cue-ablation and blind-strategy sweep · M · opus · W5-T11

### Runs

- [ ] W6-T07 · Runs re-record and the PostgreSQL 19 check (OD-12) · M · sonnet · W5-T03

### Accessibility

- [ ] W6-T01 · Accessibility pass (milestone) · S · sonnet · W5-T09, W6-T09, W6-T10, W6-T11
- [ ] W6-T09 · axe sweep across every screen (part of W6-T01) · M · sonnet · W5-T09
- [ ] W6-T10 · Full NVDA pass (part of W6-T01) · S · sonnet · W6-T09
- [ ] W6-T11 · Full VoiceOver pass (part of W6-T01) · S · sonnet · W6-T09

### Launch

- [ ] W6-T05 · Docs and edition notes · M · sonnet · W6-T04
- [ ] W6-T14 · Edition 1 release (added) · S · opus · every other W6 task
