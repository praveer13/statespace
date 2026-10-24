# A4: Learner journey, motivation, pacing and cognitive load

This is an adversarial review of Plinth v1. It covers `docs/history/v1/PLAN-v1.md`, `docs/history/v1/DESIGN-v1.md` and the six canvas artboards (Main, Elevation, Lesson, Theater, Audit, Ledger). The review was written on 2026-10-21; the task date was 2026-10-20.

**Lens.** I followed one learner week by week for more than 12 months. The learner:
- is an experienced backend engineer who has finished kernelspace;
- is fluent in Rust and systems-literate;
- is building their own system with coding agents;
- studies alone, 6–10 h/week, for 9–18 months.

At every stretch I asked five questions:
- Where do they stall or quit?
- Is the first hour magical?
- Is the 20/65/15 split honoured?
- How many tools and nouns must they hold at once?
- What brings them back, what do they do when stuck, and how does the week connect to their own system?

I then compared v1 with the journey design in kernelspace PLAN-100X: Boot, Today, Up Next and Mirror.

**Scope.** The roadmap (`research/context/roadmap.md`) is the source of truth for scope. The private platform design is not reproduced here; the learner's own product appears only as "your system" or in generic terms.

**Tags.**
- **[verified]**: checked against a primary source this session.
- **[measured]**: I ran it this session. Scripts are in `a4tools/`; downloads are in `a4dl/` (session working files, not published).
- **[sibling]**: measured or verified by another agent this session, in `research/spikes/RESULTS.md` or `research/reports/{R1-lean,L2-proof-fm-education,L4-persistence-transfer}.md`. I re-checked it where marked.
- **[K]**: from kernelspace's adversarially verified dossiers (2026-10-03). Not re-checked.
- **[derived]**: computed from cited inputs.
- **[estimated]**: my own assumption, always stated.
- **[unverified]**: I could not confirm it.

---

## 0. Verdict

**What v1 gets right, and must keep.** These are the strongest journey assets in the family.
1. **Honest, informational progress instead of XP.** The Ledger headline reads "31 claims. 12 proved. Read the other 19 carefully." (Ledger artboard). Informational feedback raises intrinsic motivation (d = +0.33); completion-contingent rewards lower it (d = −0.36) (Deci 1999) [K].
2. **Call It.** A committed verdict plus a confidence before every run is a prequestion and a calibration exercise in one (Lesson artboard; PLAN §2.2).
3. **Failure reframed as a find.** "Specimen mounted" and the Cabinet's empty drawers turn the red outcomes that dominate formal methods into collectible progress (DESIGN §9; PLAN §2.3).
4. **The Theater** ("You are the scheduler"). The rule is the concept, which is the strongest kind of game mechanic (Theater artboard).
5. **The Audit Desk** trains exactly the judgment the roadmap exists for: deciding what an agent's "proved ✓" really establishes (PLAN §2.8).
6. **Courses are set by viva, never by reading pages** (PLAN l.246–247). P0 is "the first weekend of the roadmap, done well" (l.633).

**What fails.** Inside a session v1 is excellent; across sessions it is not designed at all.
- There is no help path when stuck and no policy for the learner's own coding agent.
- There is no daily or weekly rhythm, no re-entry ramp and no phone lane.
- No week connects the course to the learner's own system. The roadmap's order differs from some builders' needs, and v1 offers no optional builder's path (OD-3).
- The first hour is a placement test or a week of logic review.
- About 7–14 weeks of pure Lean (Courses 02–03, midpoint ≈ 10.5; Course 04 adds 3–6 more of Lean + Z3) come early, with reading roughly 2–3× its 20% share. Then Lean sits idle for 14–28 weeks before the hardest Lean course.
- Seven toolchains and about 45 named UI concepts arrive with little staging.

The family solved most of this already in kernelspace PLAN-100X (Boot, Today, Up Next, Mirror, staged labs, H1–H4 help, "nothing locks"). v1 copies none of it.

---

## 1. The clock

### 1.1 Hours
- **Budget:** 9–18 months × 4.33 weeks × 6–10 h ≈ **234–780 h** [derived].
- **v1's own estimates** (PLAN §1 table, l.66–78): Courses 00–09 sum to **32–61 weeks**, counting Course 01 as about 1 week, plus an open-ended Course 10 [derived].
- **Other load:** the learner's other commitments (work, holidays, other projects) compete for hours with the course's 6–10 h/week [estimated].
- **Plans overstate study time.** Students "study about five to eight hours fewer each week than they plan to" (Oreopoulos & Petronijevic, NBER w26059) [verified]. That sample is students, so it transfers to an adult learner only as a warning.

### 1.2 Default path at v1 midpoints (8 h/week; the learner places out of Course 00) [derived, estimated]

| Course | v1 estimate | Midpoint | Calendar weeks |
|---|---|---|---|
| 01 Z3 | 2–4 sessions | 1 wk | W1 |
| 02 Lean | 3–6 wk | 4.5 | W2–W6 |
| 03 Semantics (Lean) | 4–8 wk | 6 | W7–W12 |
| 04 Obligations (Lean + Z3) | 3–6 wk | 4.5 | W13–W17 |
| 05 TLA+ | 3–6 wk | 4.5 | W18–W22 |
| 06 Postgres + Rust | 4–8 wk | 6 | W23–W28 |
| 07 Soufflé + Alloy + Z3 | 4–8 wk | 6 | W29–W34 |
| 08 TLA+ + Rust sim | 3–6 wk | 4.5 | W35–W39 |
| 09 Lean (compiler) | 6–10 wk | 8 | W40–W47 |
| 10 Capstone | open | — | W48+ |

- **Total:** about 45 weeks (≈10.4 months) before the capstone. With 20% slippage for holidays, illness and work crunches, that becomes about 54 weeks (≈12.5 months) [estimated].
- **Lean idle:** about 22 weeks at the midpoint (end of 04 to start of 09), with a range of 14–28 weeks [derived].
- **TLA+ idle:** about 12 weeks (end of 05 to start of 08) [derived].
- **Order:** the roadmap's order differs from some builders' needs, and v1 offers no optional builder's path (OD-3).

---

## 2. Week-by-week simulation [estimated; v1 midpoints; 8 h/week]

| Weeks | v1 content | What the learner experiences | Stall / quit risk |
|---|---|---|---|
| W1 | 10-item placement graded with Call It (l.277–278); lessons 1.1–1.5 in the browser; L1 template, `uv`, CLI, receipt import | First `sat` witness. The real "whoa" (1.5, a "proved" guard fails under 64-bit encoding) comes **last**. Project 00 happens this week only because placement skipped Course 00 | Low. Friction: the Z3 wasm needs cross-origin isolation and a ~6.3 MB brotli first load [measured]; receipts are dragged or pasted (l.163) |
| W2 | Viva 01; audits A1.1–A1.3; Course 02 install (elan, VS Code; the Lean 4.35 toolchain is ≈595 MB compressed [verified]; Mathlib adds ≈5 GB if used [verified]); NNG's 4 required worlds, 33 levels [measured] | Switch from Python to Lean. NNG runs a pinned Lean 4.23 [verified] on a host that timed out once in two probes [measured] | Medium |
| W3–W4 | 2.1–2.5; TPIL ch. 3–5 (≈32k words [measured]) | Mostly reading. The first Lean proofs, conservation over ℤ, feel good | Medium |
| W5–W6 | 2.6–2.8: list induction with "generalising the hypothesis"; finite maps, finite sums, self-transfer | Stuck on generalising the induction hypothesis and on the finite-sum lemma. There is no hint path, and an agent or `grind` can close the goal | **High: stall #1.** OMSCS dropout is front-loaded too [verified] |
| W6–W7 | 2.9–2.10; **5 audit cases unlock at once**; viva 02; Technical note 1 "due" (l.80) | An assessment and writing pile-up right after the hardest lab | Medium-high |
| W7–W12 | Course 03: FPIL (≈55–62k words) plus PFPL pp. 17–71 (55 dense pages) [measured]; AST, typing, big- and small-step semantics, progress and preservation | Six weeks with no new instrument "whoa" until 3.7 and 3.9. Proofs have many cases. Reading is ≈2–3× its 20% share [derived] | **High: stall #2.** Novelty is gone, and habits take months to form [sibling] |
| W13–W17 | Course 04: Derivation Board; PLF Hoare and Hoare2, **in Rocq** [verified]; VC generator; miscompiler | Two peaks (the board and the miscompiler). Rocq is a third proof notation | Medium |
| W18–W22 | Course 05: Java plus TLC; Theater; safety vs liveness; fairness | A peak (the Theater) | Medium |
| W23–W28 | Course 06: Docker Postgres; Rust proptest; erosion E1 | Comfort zone for this learner. E1's story ("bigint overflowing") contradicts what Postgres does: it raises an error [verified docs] | Low-medium, with a trust hit |
| W29–W34 | Course 07: Soufflé, Alloy and Z3 self-composition | Two new tools plus hyperproperties | **High: stall #3** |
| W35–W39 | Course 08: TLA+ again after ~12 idle weeks; Rust simulator | TLA+ must be relearned. Crash windows in the Theater are a peak | Medium |
| W40–W47 | Course 09: Lean after ~22 idle weeks; forward simulation | Lean must be relearned, the proofs are the hardest in the course, and the course is the longest | **High: stall #4.** Half of accuracy-skill gains are lost in about 6.5 months of disuse [verified] |
| W48+ | Course 10: seven open-ended steps | An integration cliff | **High: stall #5** |

**Stall map.** There are five predictable stalls:
1. Course 02, lessons 2.7–2.8.
2. Course 03, PFPL plus preservation proofs.
3. Course 07, two tools plus noninterference.
4. Course 09, Lean decay plus simulation proofs.
5. Course 10, open-ended assembly.

At each stall, the learner's other commitments (work, holidays, other projects) also compete for hours, and v1 has no mitigation for any of them.

---

## 3. The lens questions, answered

### 3.1 Is the first hour, or the first weekend, magical?
No.
- **No opener is designed.** There is no onboarding or Boot anywhere in PLAN.md, DESIGN.md or the artboards.
- **The first act is a test or a review.** A new learner either starts Course 00 ("pencil + Z3", six lessons of truth tables and quantifier negation, 1–2 weeks; l.68, l.275–289) or takes "a 10-question placement check graded with Call It" (l.277–278).
- **The best surprise comes last.** The course's thesis is "a true theorem about the wrong thing" (l.24–25). Its best demonstration, a guard proved over ℤ that fails at 64 bits (lesson 1.5, l.303), is the last lesson of Course 01.
- **v1 contradicts the roadmap's opener.** The roadmap's "First weekend — Project 00" is a 3–5 h Z3 counterexample lab. v1 inserts a whole on-ramp course in front of it.

### 3.2 Is 20 / 65 / 15 honoured?
It is asserted (l.13), not designed:
- No course has an hour budget.
- Nothing measures time by activity.
- The reading list is concentrated in the Lean valley (Courses 02–03), which is about 2–3× the 20% share there [derived, §4 A4-09].
- The 15% writing share is mostly form-filling: about 28 six-field claim cards, specimen labels, 11 vivas, 32 findings and 4 notes.

### 3.3 Too many tools?
Yes, and they arrive badly timed.
- **Seven toolchains:** Python/`uv`/Z3Py, elan/Lean/lake (plus Mathlib if used), Java/TLC, Docker/Postgres, Rust, Soufflé and Alloy (l.157–159).
- **Eight notations,** counting Rocq for reading PLF: Python, Lean, Rocq, TLA+/PlusCal, SQL, Rust, Datalog and Alloy.
- **Installs land in waves** at about W2, W18, W23 and W29.
- **Course 07 doubles up.** It uses Soufflé *and* Alloy *and* Z3 (l.75), where the roadmap says "Soufflé **or** Alloy".

### 3.4 Too many UI nouns?
Yes.
- **Nine top-level destinations.** The Elevation nav has eight items plus Search; the page list adds Course, Lesson and Shelf (l.591). kernelspace PLAN-100X cut eight nav items to "at most five" (l.237).
- **About 45 learner-facing named concepts,** such as set, seam, erosion, receipt, lasso, mount, label card, minimise, Re-find, stamp, qualifier, Judgment, Brier score, Defence and title block.
- **Six ID schemes:** C, S, A, E and L numbers, lesson numbers, and gap classes 1–12.
- **Overloaded words:**
  - "course" means both the product and a stage;
  - "Plinth" means the product, the toy language and the capstone;
  - "drawer" has three meanings.
- **The design's own cross-references already disagree** (A4-10).

### 3.5 Is there a weekly rhythm and a daily habit?
No.
- The home screen offers "Next at the bench", a Brier score, waiting audits and three counters (Elevation artboard).
- Re-find has a scheduler (l.148–151) but no surface.
- Audits arrive only "as courses are set" (l.215), that is, every 3–10 weeks.
- There is no Today, no "set your week", no weekly target, no re-entry path and no phone activity.

### 3.6 What does a solo learner do when stuck?
Nothing is designed for it.
- The only help is theory drawers, which open "only when a Call It is missed twice" (l.261), plus an optional BYOK examiner for vivas (l.244–246).
- Lab zips get no AGENTS.md, llms.txt, hint ladder or stuck protocol. The family formula requires agent-native tutoring.
- No community venue is named. I grepped PLAN.md and DESIGN.md for "hint", "stuck", "agents.md", "llms", "zulip", "community" and "forum": no matches.

### 3.7 How does the course connect to the learner's own system each week?
It doesn't.
- No lab touches the learner's own system; Course 10 builds a *toy* "Plinth Core" (l.559–569) instead.
- The roadmap's order differs from some builders' needs, and v1 offers no optional builder's path (§1.2; OD-3).
- The learner's other commitments (work, holidays, other projects) compete for hours.

### 3.8 v1 against kernelspace PLAN-100X journey design

| kernelspace PLAN-100X | Where | Plinth v1 | Gap |
|---|---|---|---|
| **Boot:** 10 min, 360 px, no install; median first success ≤4 min; ends with Set your week, optional placement and a "this will feel harder" card | K4, l.495–498; l.249 | none; Course 00 or a 10-item placement test comes first | missing |
| **Today:** 10–12 min, phone-first, offline; a welcome-back after ≥7 idle days, "never an overdue count" | K2, l.485–486 | a Re-find scheduler with no surface | missing |
| **Up Next:** one `recommend()` with a one-line *why*; paths; a braid | K3, l.491; §4.D | "Next at the bench" (next lesson only) | partial |
| **Mirror:** VRK₃₀, cold checks, calibration with intervals, competence statements | K5, l.500–503 | Judgment (Brier score, no interval); Ledger counts | partial |
| **Staged labs:** stage 1 is a 2-minute win, every stage ≤25 min; "a 30-minute day always works" | F2, l.425; l.261 | 9 monolithic Bench labs | missing |
| **Help:** H1 guardrails, H2 packets, H3 hint ladders, H4 "Prove it" without AI; in-page BYOK rejected (l.802), OD8 defer (l.824) | l.456–475 | an optional BYOK viva examiner only | missing; contradicts OD8 |
| **"Nothing locks";** a weekly target with repair | V5, l.296–297 | no XP (good); three locks | conflict |
| **≤5 primary destinations** | l.237 | 8 nav items + Search; 10 page types | conflict |
| **Fresh seeds;** no blind strategy above chance + 2 SD | S3, l.326; V1, l.277 | 32 static audit cases; "reject everything" ≈0.88 precision [derived] | missing |
| **Twins, BYO-service capstone, `field` provenance** | l.508, l.511, l.309 | nothing until Course 10 | missing |

---

## 4. Findings, ranked

### CRITICAL

#### A4-01: The solo learner has no help path when stuck and no policy for their own coding agent
**Problem.** In formal methods, the usual way to quit is to be stuck on one goal or one model for days. v1 gives the learner three things only:
- theory drawers that open after two missed calls (l.261);
- a self-graded viva;
- an optional in-page BYOK examiner (l.244–246).

It has no hint ladder per Bench check, no AGENTS.md, CLAUDE.md or llms.txt in the lab zips, no "stuck" protocol, and no named community venue. The family formula requires agent-native tutoring.

This learner builds software with coding agents every day. Lean automation and AI provers can now close the course's early theorems, and even IMO-level ones. So the realistic outcome is one of two:
- **quit** at 2.7–2.8 or 3.5; or
- **hollow green:** the agent writes the proof, and the receipt still says PROVED with no `sorry`.

**Evidence.**
- PLAN l.244–246 and l.261. My grep for hint, stuck, agents.md, llms, zulip and community found nothing.
- kernelspace PLAN-100X §5.6 H1–H4 (l.456–475). The in-page BYOK drawer was rejected (l.802) and BYOK deferred (OD8, l.824); v1 re-opens a decided question.
- `grind` has been stable since Lean 4.22.0 (2025-08-14) (https://lean-lang.org/doc/reference/stable/releases/v4.22.0/) [verified].
- The Aristotle prover produced formal Lean solutions to 5 of 6 IMO 2025 problems (arXiv 2510.01346) [verified].
- Learning costs of AI substitution [K]:
  - unguarded AI raised practice scores by 48% but lowered exam scores by 17%; a guarded tutor removed the harm (Bastani 2025);
  - AI while learning, d = 0.738 lower quiz scores (Shen & Tamkin 2026).
- Hint design matters [sibling: L2; title verified via Crossref]. In an Alloy RCT (Cunha et al., ICSE-SEET 2024, doi:10.1145/3639474.3640050), error-location hints raised tasks solved from 5.67 to 9.12 of 12 in the session. A week later, without hints, that group did no better.
- Venues exist [verified]:
  - Lean Zulip "new members", with the MWE norm and a strong preference for real names (https://leanprover-community.github.io/meet.html, /mwe.html);
  - the TLA+ group (https://groups.google.com/g/tlaplus);
  - Alloy Discourse.
  - All reachable on 2026-10-21 [measured].

**Recommendation.**
1. **A time-boxed stuck protocol in every lab and lesson.**
   - **After 25 min:** an authored hint ladder per check id, concept first.
     - R0: write your hypothesis.
     - R1: the concept.
     - R2: where to look, followed by a self-explanation prompt.
     - R3: a skeleton.
     - R4: a worked solution, then re-do it after 24 h.
   - **After 45 min:** `plinth stuck` builds (a) an MWE for Zulip or the TLA+ group, with a "public and real-name" note, and (b) a ≤6,000-character packet for the learner's own agent in Socratic mode.
   - **After 90 min:** park it. Record proof debt as ASSUMED (bold idea B3) and schedule a Re-find in 7 days.
2. **Agent guardrails in every lab zip:**
   - AGENTS.md and CLAUDE.md;
   - a PreToolUse guard that fences the `TODO(you)` proof files;
   - an explanation gate;
   - provenance on receipts (`own` vs `assisted`).
3. **"Prove it without the agent."** Viva prompts are generated from the learner's own theorem statements and goals ("state the IH at line 14 of your proof"). Kernel acceptance alone never sets a course.
4. **Drop the in-page BYOK examiner,** in line with kernelspace OD8. Ship a copyable viva packet for the learner's own agent instead, labelled formative.

#### A4-02: No return loop: a 9–18-month self-paced arc with no daily habit, weekly rhythm, re-entry or phone lane
**Problem.** v1 designs the session, not the week.
- Home shows the next lesson, a Brier score, waiting audits and three counters.
- Re-find has no surface.
- Audits arrive in bursts of 3–5 at course boundaries.
- Notes are "due".
- No activity works at 360 px. Lean, TLC and Docker are all laptop work.

Over 9–18 months the learner will have on-call weeks, holidays and work crunches, and v1 has no way back from any of them.

**Evidence.**
- Elevation artboard aside; PLAN l.148–151, l.215 and l.80; DESIGN l.121 (the only mention of phones is a gutter).
- Base rates:
  - open self-paced courses complete at about 3% (Reich & Ruipérez-Valiente 2019, doi:10.1126/science.aav7958) [K];
  - self-paced mastery programmes reduce completion (Kulik 1990) [K];
  - in OMSCS, "22% [of drop-outs] do so after attempting only a single class, and an additional 13% after attempting two". A hiatus "has delayed graduation but has not increased the chances of dropping out altogether" (Joyner, L@S '22) [verified]. In other words, design for return.
- Recorded progress monitoring raised goal attainment, d+ = 0.40, and more so "when the information was physically recorded" (Harkin et al. 2016, doi:10.1037/bul0000025) [verified].
- kernelspace K2 Today (l.485) and "a 30-minute day always works" (l.261).
- Showing intact rather than broken streaks raises engagement, and the effect of a break is weaker when streaks can be repaired (Silverman & Barasch 2023) [K].

**Recommendation.**
1. **Today:** 12–15 min, 360 px, offline. It holds:
   - generated Re-find items;
   - 2–3 Call It snippets;
   - one seam check;
   - one proof-reading item (B8);
   - the resume card from the last Bench block.
   
   Cap new items. After ≥7 idle days, show a welcome-back set and never an overdue count.
2. **Set your week:** minutes, weekdays vs weekend, optional `.ics`. Use a *weekly* target with repair and never a daily streak.
3. **A 20-minute Sunday weekly review:** the Ledger diff, the seams at risk and the next Bench stage. This is the recorded monitoring that works (Harkin).
4. **A phone contract.** Today, Theater "predict, then see the canonical outcome", audit reading, Goal Replay and proof-reading all work at 360 px.
5. **Weekly audits from generators** instead of course-boundary bursts (A4-11).

#### A4-03: Transfer fails. Other commitments compete for hours, the roadmap's order differs from some builders' needs, and no week connects the course to the learner's own system
**Problem.**
- **Hours.** The learner's other commitments (work, holidays, other projects) compete for hours with the course's 6–10 h. Since people under-deliver on planned study, the course's share will starve.
- **Order.** The roadmap's order differs from some builders' needs, and v1 offers no optional builder's path (§1.2; OD-3).
- **No connection.** No lab touches the learner's real system. Course 10 builds a toy "Plinth Core" in `plinth-lab` (l.559–569) instead.
- **The metaphor encodes a lock.** "Nothing is set on an unchecked base" (Elevation artboard) implies strict bottom-up order, and v1 has no paths.
- **The name collides.** "Plinth" names the course, the toy language and the capstone.

**Evidence.**
- PLAN §1 table and l.559–569 [derived schedule].
- Engineers "learn TLA+ from scratch and get useful results in 2 to 3 weeks … without help or training", on their own systems (Newcombe et al., https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf) [verified].
- Far transfer is about zero under controls (Sala et al. 2019) [sibling].
- Identified (value-based) regulation predicts persistence (Howard et al. 2021) [sibling]. For this learner, the value *is* their own system.
- kernelspace uses production twins (l.508), a BYO-service capstone (l.511) and `field` provenance (l.309).

**Recommendation.**
1. **Field twins.** Every Bench lab gets a 60–90-minute twin on the learner's own product; for the learner, that is "your system". Hours count once. Claims go to a Field Ledger with `field` provenance (B6).
2. **A Friday "Field Audit" (30 min):** review one real agent PR from your work against the 12-class taxonomy.
3. **An optional builder's path (nothing locks):**
   - pull Course 05 and lessons 8.1–8.3 into months 1–2;
   - keep Lean warm in weekday sessions;
   - draw out-of-order courses as "dry-laid" stones on the Elevation;
   - leave the default order unchanged. This is an owner decision (§7).
4. **Capstone.** Plinth Core is assembled as you go (B5). Offer a BYOS assurance report with the same Defence as an alternative.
5. **Disambiguate names:** the course, Mini-Plinth and "your system".

### MAJOR

#### A4-04: The first hour and first weekend are undesigned, Course 00 delays the roadmap's Project 00, and the best "whoa" comes last
**Problem.** There is no opener. The first act is a review course or a test, and the most surprising moment, the 64-bit counterexample, is lesson 1.5.

**Evidence.**
- PLAN l.68, l.275–289, l.277–278 and l.303; the roadmap's "First weekend — Project 00".
- Sibling spike [sibling, measured]: the guarded *sender* cannot go negative, but the *recipient* wraps at 64 bits (`sat`, B = 9223372036850581504, M = 4194304). That gives a crisp first specimen: "the guard protects the sender, not the recipient".
- `z3-solver` 5.3.1 (2026-10-16) [measured via npm and jsDelivr]:
  - `z3-built.wasm` is 34.6 MB raw, ≈6.3 MB brotli;
  - "The package requires threads … `SharedArrayBuffer`", so pages need special headers (README) [verified].
  
  A cold first visit therefore waits on the solver.
- Experienced learners lose time and learning when forced through basics (expertise reversal; Kalyuga 2003) [K]. Boot's "≤4 min" target is in K4 (l.498).

**Recommendation.** A **10-minute Boot**:
1. An "agent PR" claims "Z3 proved balances stay non-negative ✓".
2. Call It: verdict plus confidence on whether production can go negative.
3. Run over ℤ and get `unsat`. Render a precomputed, CI-verified result instantly while the live solver loads in the background.
4. Re-run as BitVec 64 and get `sat`: the recipient wraps.
5. Mount the specimen and mint a claim with a dashed seam.
6. Set your week.
7. Optional placement, routed by missed concepts.

After that, the first weekend is the roadmap's Project 00 verbatim, staged and at most 5 h. Course 00 becomes just-in-time drawers plus an optional "Ground" path for novices, offered *after* Boot.

#### A4-05: The Lean valley (Courses 02–03): an unscaffolded wall with front-loaded reading and a fragile entry point
**Problem.** About 7–14 weeks of pure Lean (Courses 02–03, midpoint ≈ 10.5) start in week 2, and Course 04 continues in Lean.
- The known walls are not staged:
  - 2.7, generalising the induction hypothesis;
  - 2.8, finite maps, finite sums and self-transfer;
  - 3.5, progress and preservation proofs with many cases.
- L2 is one lab: "C2.1–C2.4 proved, no `sorry`" (l.338–339).
- The entry point is fragile:
  - NNG runs a Lean pinned at v4.23.0 while stable is v4.35.0 [verified];
  - its host timed out once (20 s) and answered once (3.8 s) in two probes on 2026-10-21 [measured];
  - the required worlds hold 33 levels (Tutorial 8, Addition 5, Multiplication 9, Implication 11) [measured via the NNG4 repo].
- Reading peaks here as well (A4-09).

**Evidence.**
- PLAN l.70–71, l.321–337 and l.361–371.
- Students using Lean "struggled with syntactic and strategic knowledge", and many disengaged over syntax (Iannone & Thoma 2023, doi:10.1080/0020739X.2023.2178981) [sibling: abstract; title verified].
- Proof Blocks gave the same learning as writing proofs from scratch "in far less time" (RCT, N = 332; arXiv 2211.09609) [verified].
- Self-explanation training improved proof comprehension, d = 0.95 (Hodds, Alcock & Inglis 2014) [verified].
- Dropout is front-loaded (Joyner) [verified].
- The two-account ledger, list induction (`generalizing s`) and the finite-map self-transfer bug all compile on **core Lean 4.35 with no Mathlib** [sibling, measured].
- Install sizes [verified]:
  - the Lean v4.35.0 Linux toolchain is 594.5 MB (`.tar.zst`; GitHub release API);
  - Mathlib needs "about 5 GB of storage space" (Bonn LeanCourse README).

**Recommendation.**
1. **Stage L2 and L3** into ≤45-min stages, with a 2-minute first win and a resume card at each stop.
2. **Completion problems:**
   - fill in the `induction … generalizing` line;
   - prove one case of preservation from a worked sibling case;
   - fade from there.
3. **Proof Blocks before free proving** for each induction shape.
4. **Mathlib-free labs through Course 03.**
5. **Mirror NNG's 33 levels as local Lean files** in the template, as a fallback for when the host is down.
6. **Braid:**
   - one weekday Theater or Z3 item per week keeps wins coming;
   - add a "this will feel harder, here is why" card at the start of Course 02 (Deslauriers 2019) [K].

#### A4-06: Toolchain sprawl, badly timed, and the roadmap's "or" became "and"
**Problem.** Seven toolchains arrive in four waves (about W2, W18, W23 and W29). Course 07 alone adds two new runtimes:
- Soufflé ships x86-64 Linux packages only, plus a Homebrew formula, and no Windows binaries;
- Alloy needs Java 17 or later.

The roadmap asks for Soufflé *or* Alloy. Meanwhile Lean ships monthly, so a 9–18-month learner will face 9–18 toolchain releases.

**Evidence.**
- Roadmap: "Tools in rough order: … Soufflé or Alloy". PLAN l.75, l.157–159 and l.489–490.
- Tool facts [verified]:
  - Soufflé 2.5 (2025-03-24) release assets cover only x86-64 Fedora, Oracle Linux and Ubuntu;
  - `brew` has souffle 2.5;
  - Alloy 6.2.0 needs "Java 17 or later";
  - the TLA+ VS Code extension says to "Install Java";
  - Lean v4.34.0 shipped 2026-09-14 and v4.35.0 on 2026-10-12.
- PLF 7.1 targets "Coq 9.0.0 or later" [verified], a third proof notation.
- In-browser first contact already exists for most of the stack:
  - Spectacle, a browser TLA+ interpreter (`will62794/spectacle`, pushed 2026-09-30) [verified];
  - a community Lean WASM build (lean.cau.li) [sibling];
  - PGlite and the TS Datalog instrument (l.182–183).
- `ascent` 0.8.1 (2026-08-29) is a pure-Rust Datalog crate (crates.io) [verified].

**Recommendation.**
1. **One pinned devcontainer** plus `plinth doctor` per course, with time estimates.
2. **A "tool day"** opening Courses 05 and 07.
3. **Browser first.** The learner meets every tool in a browser instrument before installing it.
4. **L7 uses one engine.** The learner's choice is:
   - Soufflé;
   - `ascent` (cargo, no install, fits a Rust-fluent learner);
   - Alloy (reuses the JDK already installed for TLC).
   
   The others become drawers.
5. **Freeze one Lean toolchain per edition.**
6. **Name the Rocq switch and offer a Lean companion.** *The Hitchhiker's Guide to Logical Verification*, 2026 edition, has LoVe09 Operational Semantics and LoVe10 Hoare Logic as Lean 4.24 files [verified]. Its project requires Mathlib, so read the tablet PDF and port the definitions into the Mathlib-free lab.

#### A4-07: Lean sits idle for 14–28 weeks before the longest and hardest Lean course
**Problem.** Courses 05–08 contain no Lean (l.73–76). Course 09 (6–10 weeks, l.77) then asks for forward-simulation proofs from a learner whose Lean skill has decayed.
- Its first proof comes only at lesson 9.6.
- Its reading includes "Lean 4 Metaprogramming, selectively" (l.533), which the proofs don't need: a rabbit hole.

**Evidence.**
- "With lack of use, half of initial skill acquisition performance gains were lost after approximately 6.5 months for accuracy". "Intermittent performance opportunities" was a moderator (Tatel & Ackerman 2025, doi:10.1037/bul0000481) [verified].
- Skill loss runs from d = −0.01 immediately after training to −1.4 after more than 365 days. "Cognitive, artificial, and accuracy-based tasks" are the most susceptible (Arthur et al. 1998, *Human Performance* 11(1):57–101) [verified].

**Recommendation.**
1. **Keep Lean alive** during 05–08 with a weekly 20–30-min Lean kata: generated lemma variants over the learner's own Mini-Plinth definitions, plus B8 proof-reading.
2. **Optional Lean threads:**
   - state R(S, D) in Lean in Course 06;
   - prove a small idempotency lemma in Course 08.
3. **Open Course 09 with a one-week warm-up:** a stack-machine compiler with a correctness proof (PFPL, "Correctness of the Stack Machine", pp. 137–143, abbreviated online edition [verified TOC]).
4. **Make translation validation (9.8) the first win,** before the full simulation proof.
5. **Split 09 into two halves,** each with a mini-viva.
6. **Move Metaprogramming to the Deferred Shelf** with a concrete trigger.

#### A4-08: Win density collapses: labs are monoliths, no 30-minute day works, and progress is too coarse to see
**Problem.** Each course has one large Bench lab. Examples:
- L3: "AST, checker, evaluator, theorems; plus `#eval` export" (l.373–375);
- L6: "compiler to SQL, proptest differential harness, concurrent-history recorder, retry policy, R(S,D) checker" (l.461–462).

Lessons run about 45 min (Lesson artboard header). The Elevation shows course bands and claim counts ("in progress · 7 of 12 claims"). With 3–4 claims per course, visible progress moves every 1–3 weeks. Weekday sessions of 30–45 min have nothing sized for them.

**Evidence.**
- kernelspace F2 (l.425) and "a 30-minute day always works" (l.261).
- Recorded monitoring helps, d+ = 0.40 (Harkin 2016) [verified].
- Proximal subgoals beat distal goals (Bandura & Schunk 1981) [sibling].
- Resumption is slow: only about 1 in 10 interrupted programming sessions resumed editing within a minute (Parnin & Rugaber 2011, doi:10.1007/s11219-010-9104-9; abstract via search) [verified].

**Recommendation.**
1. **Stage every lab** into ≤45-min stages, ≤25 min on weekdays. Each stage ends green and committed, with a **resume card** (next step, failing check, last hypothesis) that Today shows.
2. **Issue a receipt per stage.**
3. **Show within-course progress on the Elevation:** stages done, goals proved, sorry count falling.
4. **Weekly competence statements** ("you can now derive the WP of a conditional").

#### A4-09: 20/65/15 is asserted, not designed; reading peaks inside the Lean valley
**Problem.** No course has an hour budget, and nothing measures time by activity.

**Measured word counts** of the assigned readings [measured; counts include code tokens; scripts in `a4tools/`]:

| Reading | Words |
|---|---|
| TPIL ch. 3–5, 7–8 | 56.8k |
| FPIL "ch. 1–2, 4, 7" | 55–62k; the 2025 Verso port renumbered chapters, so the assignment is ambiguous [sibling] |
| PFPL Parts I–II | 17.8k over 55 dense pages |
| PLF Hoare and Hoare2 (Rocq) | 19.3k |
| Learn TLA+ core | 26.5k |
| Soufflé tutorial | 3.5k |
| Postgres isolation docs | 3.9k |
| CompCert | ~4k |
| Alloy, Metaprogramming book | not measured |
| 80 lessons of course prose | not measured |

**Derived.** Course 03's PFPL plus FPIL comes to about 17–35 h, assuming an effective technical pace of 60–120 wpm. The baseline for silent non-fiction reading is 238 wpm (Brysbaert 2019) [verified]; the 60–120 figure is my estimate. Course 03's 20% share is about 10 h (6 weeks × 8 h × 20%), so it runs **≈2–3× over**. Course 02's TPIL is about 8–16 h against a ~7 h share. Later courses come in under. The writing share is mostly forms.

**Recommendation.**
1. **A per-course budget table** (read / build / write hours) with "minimum path" and "drawer" readings. For example, PFPL ch. 2 (rule induction) plus ch. 4–6 (statics, dynamics, type safety; pp. 51–71, ≈6.8k words) plus "Modernized Algol: Basic Commands" (pp. 155–163, since Mini-Plinth is command-based). Skip abstract binding trees (§1.2), and cite FPIL by title.
2. **Local active-minute accounting** by activity, shown in the weekly review.
3. **Auto-fill** claim cards' method, tool and version from receipts. The learner writes only the proposition (in their own words), the assumptions and the correspondence.

#### A4-10: Too many destinations and nouns, overloaded words, and an ID soup the design itself gets wrong
**Problem.** v1 has nine destinations, about 45 named concepts and six ID schemes, with collisions ("course", "Plinth", "drawer"). The mockups already cross-reference inconsistently, which predicts learner confusion:
- **S1.2:** "double capture" in PLAN l.302, but "the overdraft" in the Lesson and Main artboards (PLAN l.300 calls the overdraft S1.1).
- **Lesson 2.6:** the Elevation says "2.6 — Induction over transfer sequences … Prove C2.4". PLAN has 2.6 as rejection and non-negativity (C2.2) and 2.7 as sequences (C2.3).
- **Claim count:** "7 of 12 claims" in the Elevation vs C2.1–C2.4 in PLAN.
- **Lab names:** L2, verified-ledger, s2-ledger and s2 all name one lab.
- **Confidence bucket:** Judgment reports "at 80% confidence" (Elevation) when the options are 55/75/95% (l.125).
- **C6.2:** "READ COMMITTED Refuted" in the Ledger artboard vs "SERIALIZABLE and retries" in PLAN l.457.
- **C4.1:** "VC generator is sound (Lean)" in the Ledger vs hand-derived in PLAN l.395. The Lean soundness claim is C4.3 (l.400).

**Evidence.** Elevation nav; PLAN l.591; kernelspace l.237.

**Recommendation.**
1. **Four destinations plus ⌘K:**
   - **Today;**
   - **Map** (Elevation, stages, Shelf);
   - **Bench** (labs, Theater, instruments);
   - **Record** (the Ledger, with Cabinet, Judgment and Notes as tabs).
2. **Use the roadmap's word "Stage"** for units.
3. **One ID scheme generated from content data.** Extend `verify:links` to UI copy and mockups.
4. **Introduce each noun the first time it is needed,** with a glossary card.

#### A4-11: The Audit Desk is static, spent after one pass, locked per course, and its base rate rewards rejecting everything
**Problem.** There are 32 authored cases, released 3–5 per course (l.215). Only 4 are sound (A2.5, A4.3, A6.4, A9.3), so blind "reject everything" scores precision 28/32 ≈ 0.88 and full recall unless the gap class is scored [derived]. That contradicts the Audit artboard's claim that "an auditor who rejects everything is as useless as one who accepts everything".

The header reads "case A2.1 of 32 · record: 71% precision · 64% recall". At A2.1 there are at most four decisions, so these percentages are noise. And no case ever comes from the learner's own work.

**Evidence.** kernelspace V1, "no blind strategy above chance + 2 SD" (l.112, l.277); S3, fresh seeds (l.326–329).

**Recommendation.**
1. **Seeded mutation generators** over the learner's own artifacts (B1), with 40–50% sound cases.
2. **Score** both the gap class and the evidence.
3. **Publish a blind-strategy baseline.**
4. **One case a week in Today.**
5. **"Bring a real PR"** from the learner's work, logged as `field` and unscored.
6. **Show n and an interval** on precision and recall.

#### A4-12: Locks and gates contradict "nothing locks" and will degrade the very calibration data Judgment reports
**Problem.** v1 has three locks:
- Run waits for a call on *every* instrument run (l.122–125; "Pick a verdict and a confidence to unlock Run", Lesson artboard);
- theory drawers stay closed until two misses (l.261);
- audits unlock only when a course is set (l.215).

A learner who iterates on a TLA+ or Z3 model 30 times in an hour will click through calls at random, which pollutes the Brier score. The home screen also headlines a Brier score from 40 calls with no interval and an "80%" bucket that cannot exist.

**Evidence.**
- kernelspace sources:
  - "nothing locks" (l.75, l.296);
  - "at most one gate per ~4 minutes of reading" (l.605);
  - "skip once the KC is solid" (l.343).
- Kulik 1990 [K].

**Recommendation.**
1. **Gate only** authored Call It moments and the first run of a new model. Offer "run without calling (unrecorded)".
2. **Drawers are always openable;** log "opened before calling".
3. **Show calibration only over committed calls,** with n and an interval, and only after 30 or more calls.

#### A4-13: Progress is measured once; roadmap rule 6 has no Mirror; Re-find rehearses memorised witnesses
**Problem.**
- **Vivas happen once,** at course end (l.240–247).
- **Rule 6 has no delayed signal.** The roadmap's rule 6 ("Track progress by what you can now independently reason about") is mapped to viva, Judgment and audit precision (l.266). None of these is delayed, so no signal says whether the learner can still reason about unsat, fairness or refinement months later.
- **Re-find re-shows the same broken spec** (l.148–151). After one or two repetitions, the learner recalls the witness rather than redoing the reasoning.

**Evidence.**
- kernelspace K5 and VRK₃₀ (l.100, l.500–503).
- Transfer of testing needs application items, d = 0.40 (Pan & Rickard 2018) [K].
- Decay (Tatel & Ackerman 2025) [verified].

**Recommendation.**
1. **Viva returns** at 30 and 90 days, one prompt each.
2. **Generate Re-find items from parameters:** rename variables, change constants, change the encoding, add a guard.
3. **A Mirror page:** "independently reasoned ≥30 days", per gap class and concept, with intervals.

#### A4-14: Erosion events land months later, unannounced, and E1 contradicts what Postgres does
**Problem.** Erosion is the course's signature spiral.
- **The gaps are long.** E1 is planted around W1 and fires around W23–W28. E5 runs from Course 04 to Course 09 (l.106–113). By then the learner may not recall the claim, so a vermilion banner reads as loss rather than a find.
- **E1's story is wrong.** The Ledger artboard narrates "`balance bigint` overflowing at 2⁶³−1". Postgres raises an error instead of overflowing: "Attempts to store values outside of the allowed range will result in an error" (PostgreSQL 18.6 docs) [verified]. The sibling spike observed error 22003 [sibling]. A learner who runs it at that dramatic moment finds the course wrong.

**Recommendation.**
1. **Erosion forecasts (B4).** Before each erosion, the learner calls which of their claims cracks, and which field.
2. **Seam checks in Today** in the two weeks before each erosion.
3. **Frame it as "your seam was found".**
4. **Restate E1:** the abstract step succeeds and the database refuses it. That is a refinement failure with an availability effect, not silent wraparound.

#### A4-15: The capstone is a cliff
**Problem.** Course 10 is open-ended, with seven integration steps (l.78, l.559–569):
- parser;
- interpreter;
- SMT obligations;
- Postgres compiler plus runtime;
- systematic testing;
- the demo;
- publishing.

All of it comes after about 12 months, which is the classic last-mile quit point. It also never touches the learner's own system.

**Recommendation.** **Assemble as you go (B5):**
- 10.1–10.2 after Course 03;
- 10.3 after 04;
- 10.4 after 06;
- 10.5 after 08.

Course 10 then shrinks to integration, the demo and the Defence, at ≤6 weeks with time-boxed releases. Offer a BYOS alternative (A4-03).

### MINOR

#### A4-16: Vivas are self-graded without anchors, so "set" is honour-system
**Problem.** The learner "self-grades each rubric line" (l.244) against a model answer. The Elevation's main visual (solid "set" bands) rests on that. Self-assessment without anchored exemplars drifts.

**Recommendation.**
- Rubrics with 2–3 anchored sample answers per line (strong, weak, wrong).
- Label the status "set (self-assessed)" vs "set (examined)".
- Let the learner's own agent act as examiner via a copied packet (A4-01).

#### A4-17: Technical notes are framed as deadlines, and assessments pile up at course ends
**Problem.** Notes are "due after courses 02, 05, 07 and 09" (l.80) in a course with "no deadlines" (l.12). At the end of Course 02, five audit cases, a viva and Note 1 land in the same week as the hardest lab.

**Evidence.**
- Self-imposed deadlines "do not increase completion rates" (Bisin & Hyndman 2020) [sibling].
- Noticed identity claims backfire (Gollwitzer 2009) [K].

**Recommendation.**
- Notes become "ready to write" prompts, composed from the learner's own specimens.
- Publish artifacts, not identity claims.
- Spread audits weekly.

#### A4-18: Receipts are imported by hand at every check
**Problem.** "The site imports receipts (drag-drop or paste)" (l.163) on every Bench check. That is a friction tax on the core loop. kernelspace found uploads lost on reload and drag-drop friction (audit [K]).

**Recommendation.**
- `plinth bench check --open` launches the site with the gzipped receipt in the URL fragment. Fragments never reach a server.
- Or, in Chromium, use a persistent File System Access handle on `receipts/`.
- Keep paste as the fallback.

#### A4-19: No test-out beyond Course 00, and overlap with sibling courses wastes hours
**Problem.** Only Course 00 has placement (l.277). Lessons 6.5–6.7 (histories, isolation, SERIALIZABLE) overlap tablespace T4 (anomalies including write skew; SSI in Postgres; tablespace-PLAN l.93–94), and 8.6 (deterministic simulation) overlaps byzantine's simulated-network harness. A family graduate pays twice.

**Recommendation.**
- Per-stage test-out with three fresh items.
- Cross-link the sibling course lessons rather than re-teaching them.
- Credit sibling evidence from an imported ledger.

---

## 5. A journey that would work (sketch)

### 5.1 The first 10 minutes (Boot; phone-capable)
1. An agent's PR claims "Z3 proved balances stay non-negative ✓".
2. Call It, with a verdict and a confidence.
3. ℤ gives `unsat` instantly, from a precomputed, CI-verified result while the solver loads.
4. BitVec 64 gives `sat`: the recipient wraps.
5. Mount the first specimen and mint a claim with a dashed seam.
6. Set your week.
7. A 30-second "this will feel harder" card.
8. Optional placement.

The target is a median first insight in ≤4 min, matching kernelspace K4.

### 5.2 The first weekend
- The roadmap's Project 00 verbatim, in four staged checks with a receipt per stage.
- The README is written as claim cards, with method and version auto-filled.
- End state: two claims, three specimens and one seam.

### 5.3 A typical week (8 h; scales to 6–10) [estimated]

| Slot | Time | What | Split |
|---|---|---|---|
| Mon / Wed / Fri | 3 × 15 min | **Today**: Re-find, Call It, seam check, proof-reading (B8) | build/prove |
| Tue / Thu | 2 × 45 min | lesson block (reading and instruments) | ≈60% read |
| Saturday | 3 h | **Bench block**: 4 stages of ≤45 min, each ending green with a resume card | build |
| Sunday | 1.5 h | 45 min Bench or Theater; 30 min weekly review (Ledger diff, plan); 15 min Field task | build / write |
| Friday (in Today) | +15 min | Agent PR of the Week (B1), or a real PR from work | build |

The target split is about 1.5 h reading, 5.2 h building and proving, and 1.2 h writing. A local timer tracks it, and the weekly review shows it.

### 5.4 Monthly, and after a break
- **Monthly:** a 20-min retrospective on the first of the month (a "fresh start" landmark; Dai, Milkman & Riis 2014 [sibling]). It re-plans the week template and checks the read/build/write split.
- **Re-entry after ≥7 idle days:**
  - a 12-min welcome-back set;
  - the last resume card;
  - one 25-min stage that ends green;
  - never an overdue count.

### 5.5 Arc: peaks, valleys and mitigations

| When | Valley | Mitigation |
|---|---|---|
| Weeks 1–2 | installs | Boot, browser-first, `plinth doctor` |
| Weeks 4–12 | the Lean valley (2.7, 2.8, 3.5; PFPL) | staged labs, completion problems, Proof Blocks, proof debt (B3), a weekday Theater braid, stuck kit (B7) |
| Weeks 18–34 | new tools (TLC, Docker, Soufflé or Alloy) | tool days, one Datalog engine, field twins that make work count twice |
| Weeks 17–39 | Lean decay | weekly Lean kata, B8 proof-reading |
| Weeks 40–47 | Course 09 | stack-machine warm-up, translation validation first, split course |
| Weeks 48+ | capstone | assemble as you go (B5) |

Peaks come from Boot, specimens, the Theater, the miscompiler, erosion forecasts and the Daily Interleaving (B2).

---

## 6. Bold ideas

1. **B1: Agent PR of the Week, mutated from your own repo.**
   - A seeded mutation engine works over the learner's own `plinth-lab` artifacts. It can weaken a conclusion, add a vacuous hypothesis, swap ℤ for BitVec, drop a frame condition, add `native_decide`, change an isolation level or drop a fairness condition.
   - Each week it emits one "agent PR" with a hidden key; 40–50% are sound.
   - Scoring covers the gap class and the evidence.
   - Real PRs from your system can be filed alongside as unscored `field` items.
   - This trains the roadmap's core judgment on the distribution the learner actually meets.
2. **B2: The Daily Interleaving.**
   - A 3-minute, seeded, phone-playable scheduler puzzle in the Theater. Find the shortest violating interleaving, or a lasso for a liveness bug.
   - It is scored against the explorer's shortest trace, with a share string such as "Plinth Daily #112 · 4 steps · shortest".
   - The rule is the concept. It also keeps TLA+ intuitions warm through the Lean months.
3. **B3: Proof debt as ASSUMED.**
   - A `sorry` becomes an explicit ASSUMED lemma on the claim card: "PROVED modulo 2 assumed lemmas".
   - The Elevation shows the debt shrinking. A stage is set only at zero debt, so the roadmap's "no sorry" completion test is intact.
   - The course's own stamp semantics turn the Lean wall into a ramp without lying.
4. **B4: Erosion forecasts.**
   - Before each planned erosion, the learner calls which of their claims the new specimen cracks, and whether it hits the proposition or the correspondence field.
   - Seam checks appear in Today for two weeks beforehand.
   - The signature spiral becomes a prediction moment and a retrieval of a months-old claim.
5. **B5: Plinth Core grows as you go (the persistent world).**
   - The Elevation's empty top holds a schematic of Plinth Core: parser → checker → interpreter → VC generator → SQL compiler → runtime → simulator → report.
   - Each Bench stage lights a component. The top runs the learner's own pipeline end to end on a demo command.
   - Course 10 becomes integration and the Defence, not a cliff.
6. **B6: Field twins and a Field Ledger.**
   - Each Bench lab has a 60–90-min twin on the learner's own product. For the learner, that is "your system".
   - Twin claims go to a separate Field Ledger with the same stamps. After a year it is the first honest assurance report of the learner's real system.
   - Course hours count once.
7. **B7: `plinth stuck`.**
   - A time-boxed stuck verb. It captures the failing goal or check, the statement, and the learner's hypothesis, which is required.
   - It emits a Zulip-ready MWE, a ≤6,000-character Socratic packet for the learner's own agent, and a "park" option that records proof debt and schedules a Re-find in 7 days.
8. **B8: Phone proof-reading with self-explanation.**
   - A 15-minute weekday session: read one short proof with its goals rendered, then self-explain it line by line using the Hodds–Alcock–Inglis training (d = 0.95 on comprehension).
   - Follow it with one Proof Blocks item, which gives the same learning as writing in less time.
   - Keeps Lean reading fluent through Courses 05–08 with almost no setup.

---

## 7. Owner decisions this review cannot make

1. **Builder's path (OD-3).** The roadmap's order differs from some builders' needs. Offer an optional builder's path (Course 05 and 8.1–8.3 early, Lean later), or keep strict roadmap order? I recommend offering it, with the default unchanged and nothing locked.
2. **Datalog engine for L7:** Soufflé, `ascent` or Alloy only? The roadmap says "or".
3. **BYOK examiner:** drop it, in line with kernelspace OD8, or keep it as opt-in?
4. **Capstone target:** Plinth Core in `plinth-lab` (the roadmap default), or a BYOS assurance report on the learner's own system?
5. **Mathlib policy:** I recommend Mathlib-free through Course 03.
6. **Naming:** "Course" → "Stage", and give the product a name distinct from the toy language and the capstone.

---

## 8. Sources and verification log

### Primary sources checked this session [verified]
- **Z3 npm package:**
  - `z3-solver` npm 5.3.1, dated 2026-10-16 (registry.npmjs.org);
  - file sizes via the jsDelivr data API (`z3-built.wasm` 34.58 MB; brotli 6.34 MB) [measured];
  - README: https://raw.githubusercontent.com/Z3Prover/z3/master/src/api/js/PUBLISHED_README.md
- **Lean releases and install:**
  - Lean releases: https://api.github.com/repos/leanprover/lean4/releases (v4.35.0 on 2026-10-12, v4.36.0-rc1 on 2026-10-14, v4.34.0 on 2026-09-14);
  - Linux asset 594.5 MB (release tag v4.35.0);
  - install manual: https://lean-lang.org/install/manual
- **Mathlib storage,** "about 5 GB": https://github.com/fpvandoorn/LeanCourse23/
- **Lean web editor (lean4web),** server-side: https://github.com/leanprover-community/lean4web
- **NNG4:** `lean-toolchain` v4.23.0; level counts from the GitHub contents API [measured]; host probes [measured]: https://github.com/leanprover-community/NNG4
- **`grind` stable in 4.22.0:** https://lean-lang.org/doc/reference/stable/releases/v4.22.0/
- **Aristotle:** https://arxiv.org/abs/2510.01346
- **Hitchhiker's Guide 2026** (LoVe09, LoVe10; Lean v4.24.0; requires Mathlib): https://github.com/lean-forward/logical_verification_2026
- **PLF 7.1,** "Coq 9.0.0 or later": https://softwarefoundations.cis.upenn.edu/plf-current/index.html
- **PFPL abbreviated online edition** (TOC and page numbers via pypdf [measured]): https://www.cs.cmu.edu/~rwh/pfpl/abbrev.pdf
- **TPIL and FPIL** chapter pages and word counts [measured]: https://lean-lang.org/theorem_proving_in_lean4/ and https://lean-lang.org/functional_programming_in_lean/
- **Learn TLA+ core** (15 pages) [measured]: https://learntla.com/core/
- **Soufflé tutorial:** https://souffle-lang.github.io/tutorial
- **PostgreSQL 18.6** transaction isolation [measured word count] and the integer range error: https://www.postgresql.org/docs/current/datatype-numeric.html
- **Soufflé releases** (2.5, x86-64 Linux packages only): https://api.github.com/repos/souffle-lang/souffle/releases ; Homebrew: https://formulae.brew.sh/api/formula/souffle.json
- **Alloy** (Java 17+; v6.2.0, 2025-01-09): https://github.com/AlloyTools/org.alloytools.alloy
- **TLA+ VS Code extension** (Java required): https://github.com/tlaplus/vscode-tlaplus/wiki/How-to-Install
- **Spectacle:** https://github.com/will62794/spectacle ; tla-web docs: https://docs.tlapl.us/using:tla_web_explorer
- **`ascent` 0.8.1:** https://crates.io/crates/ascent
- **Lean community:** https://leanprover-community.github.io/meet.html and https://leanprover-community.github.io/mwe.html
- **Venues reachable on 2026-10-21** [measured]: groups.google.com/g/tlaplus, alloytools.discourse.group, leanprover.zulipchat.com, proofassistants.stackexchange.com, Soufflé GitHub Discussions.

### Learning science and adjacent evidence
- **Tatel & Ackerman 2025,** *Psychological Bulletin*, doi:10.1037/bul0000481. Abstract via https://ifp.nyu.edu/2025/meta-analyses-systematic-reviews/bul0000481/ [verified].
- **Arthur et al. 1998,** *Human Performance* 11(1):57–101. Abstract read from the PDF (https://www.gwern.net/doc/psychology/spaced-repetition/1998-arthur.pdf) [verified].
- **Harkin et al. 2016,** doi:10.1037/bul0000025 (Europe PMC abstract) [verified].
- **Joyner, L@S '22,** "Meet Me in the Middle" (https://www.davidjoyner.net/home/wp-content/uploads/2022/06/3491140.3528283.pdf), full text [verified].
- **Oreopoulos & Petronijevic,** NBER w26059 (https://www.nber.org/papers/w26059) [verified].
- **Newcombe et al., AWS** (https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf), full text [verified].
- **Hodds, Alcock & Inglis 2014,** JRME 45(1). d = 0.950 from the abstract via search; booklet: https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf [verified].
- **Poulsen et al., Proof Blocks RCT,** arXiv 2211.09609 (abstract) [verified].
- **Brysbaert 2019,** *J. Memory and Language* 109:104047 (238 wpm for non-fiction) [verified via abstract].
- **Iannone & Thoma 2023,** doi:10.1080/0020739X.2023.2178981 (title verified; findings from [sibling] L2).
- **Cunha et al. 2024,** doi:10.1145/3639474.3640050 (title verified; numbers from [sibling] L2, which read the full text).
- **Sheeran, Listrom & Gollwitzer 2024/25,** *European Review of Social Psychology* (642 tests). Title and abstract range .27–.66 [verified]. The bias-corrected d = .15 is [sibling] only. I avoid relying on "planning" effects for that reason.
- **From kernelspace dossiers [K]:** Deci 1999, Kulik 1990, Reich & Ruipérez-Valiente 2019, Bastani 2025, Shen & Tamkin 2026, Kalyuga 2003, Pan & Rickard 2018, Silverman & Barasch 2023, Deslauriers 2019.
- **From sibling L4 [sibling]:** Howard et al. 2021, Sala et al. 2019, Bandura & Schunk 1981, Buyalskaya 2023 (habit formation took months), Dai, Milkman & Riis 2014, Bisin & Hyndman 2020.

### Sibling measurements used
- `research/spikes/RESULTS.md` (2026-10-20):
  - the BitVec recipient-wrap witness;
  - L2 compiles on core Lean 4.35 with no Mathlib;
  - Postgres error 22003;
  - TLC state counts.
- `research/reports/R1-lean.md`:
  - toolchain about 3.0 GB unpacked;
  - FPIL renumbering;
  - the lean.cau.li WASM build;
  - agent tooling.

### Estimates and limits
- All week numbers, reading paces (60–120 wpm effective) and hours per activity are **[estimated]** and labelled where used.
- Word counts include code tokens and some navigation text, so they are approximate.
- The competition for hours from the learner's other commitments (work, holidays, other projects) is assumed, not measured.
- I could not verify phone performance of the Z3 or Lean WASM builds, or mobile usability of NNG. Both are **[unverified]**.
