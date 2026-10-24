# A7: Visual design, UX and information architecture review

**Lens:** identity, the plinth and elevation metaphor, naming and IA, the stamp system compared with the roadmap's proof-report vocabulary, accessibility, phone, motion, dark mode, Lean typography, Lesson density, Call It, Theater, Audit Desk and Ledger.
**Reviewed (2026-10-21):**
- `docs/history/v1/DESIGN-v1.md` (130 lines)
- `docs/history/v1/PLAN-v1.md` (§0–2 and §4)
- six artboards in `design/canvas/`: Main (the design system), Elevation, Lesson, Theater, Audit, Ledger
- the roadmap
- the private platform design, for context only and not reproduced here
- kernelspace-PLAN-100X, §0, §3, §5.3, §5.7 and §7.3
- review A5, cross-referenced where it overlaps

**Method.** I did more than read. I measured the following:
- **Contrast:** WCAG 2.x relative-luminance contrast for every text, ground and stamp pair in the artboards.
- **Colour vision:** CVD separation, using the Machado 2009 matrices and CIE76 ΔE.
- **Glyph coverage:** I parsed the `cmap` tables of the exact font files Google Fonts serves, and of JuliaMono, against 49 common Lean and TLA+ symbols.
- **Proposed dark tokens:** validated with the same contrast script.

Scripts (session working files, not published):
- `a7tools/contrast.py`
- `a7tools/cmap.py`

---

## Verdict in brief

1. **In light mode the identity is strong and right for the subject.**
   - Vellum, graphite, Archivo Expanded labels, Source Serif reading text and rubber stamps are clearly *not* kernelspace.
   - Stamps fit the subject. On engineering drawings, a stamp is a signed scope of responsibility.
   - Every light-mode text pair I measured passes 4.5:1 (lowest: 4.99:1). DESIGN.md:72's claim holds.
2. **The semantics are not yet kept by the artboards.** The design's central promise is that "colour always means something about the strength of a claim" (DESIGN.md:18–20). The six sheets break it in at least eleven places:
   - The home page paints a self-graded viva in PROVED blue.
   - CHECKED tint is labelled "claims proved so far".
   - The first instrument styles the raw solver word `sat` as a refutation.
   - The Theater gives a single observed trace the CHECKED stamp.
   - The Ledger headline tells the learner PROVED claims need less reading.

   **In a course whose subject is not overstating guarantees, the interface overstates guarantees. That is the main finding.**
3. **The stamps and the roadmap's proof-report vocabulary should become one vocabulary.**
   - Course "CHECKED" (bounded model checking) collides with PostgreSQL `CHECK` constraints, which are runtime enforcement (ENFORCED). Both appear on the same Ledger page.
   - The roadmap's Stage 10 report "distinguishes proved, model-checked, runtime-enforced, and assumed properties": its word is "model-checked", not "checked".
   - Each side is missing levels: the roadmap's list has no TESTED, REFUTED or UNKNOWN, and neither side has CONFIGURED or NOT COVERED.
4. **The IA has too many proprietary nouns** (about 30, across five metaphors) and three name collisions: "Ledger", "course" and "Plinth". There is also **no Today or re-entry surface** for a learner who returns once or twice a week.
5. **Typography will not render Lean.** IBM Plex Mono lacks 36 of 49 measured Lean/TLA+ glyphs (∀ ⊢ ℤ λ ⟨⟩ ⇒ …). Its fallback, Noto Sans Math, is proportional, with advance widths of 173 to ≥572 units against Plex's 600. Every logic line will misalign. JuliaMono covers all 49 glyphs and is monospaced.
6. **The dark "blueprint" theme converges on kernelspace.** Its sheet is ΔE76 3.7 from kernelspace's surface and its accent is mint-teal. It also drops the stamp shape cues.

## What to keep

- **The light palette and type stack:** vellum and graphite, Archivo for structure, Source Serif 4 for prose, 18–19 px prose with a measure of 680 px or less.
- **The rule that colour is semantic.** Enforce it with a lint instead of abandoning it.
- **PROVED blue against REFUTED vermilion.** ΔE76 is at least 92 under protan, deutan and tritan simulation, so DESIGN.md:47–49 is right.
- **The claim card, the specimen label and the title block** as components.
- **Motion restraint, reduced-motion support, and the voice rules** (DESIGN.md §7 and §9).
- **The Audit Desk scoring copy:** "an auditor who rejects everything is as useless as one who accepts everything" (Audit:94).

---

## Findings (most severe first)

### A7-01 · CRITICAL: "CHECKED" collides with PostgreSQL's `CHECK` and blurs the roadmap's model-checked versus runtime-enforced distinction. The stamps and the proof report should share one vocabulary.

**Where:**
- DESIGN.md:36–45 (the stamp table) and PLAN.md:30–34.
- Ledger:49 ("Add a CHECK constraint and re-test") sits on the same page as CHECKED stamps (Ledger:69 and 73).
- PostgreSQL enforces a `CHECK` constraint at run time: an insert or update that violates it is rejected. DESIGN.md:41 gives ENFORCED the qualifier "where (runtime, DB constraint)", so in the course's own table a `CHECK` constraint is ENFORCED, not CHECKED.
- The roadmap, Stage 10, asks for a report that "distinguishes proved, model-checked, runtime-enforced, and assumed properties".

**Problem:**
- The roadmap's report must keep four kinds of property apart: proved, model-checked, runtime-enforced and assumed. The word "checked" straddles two of them. The CHECKED stamp means bounded model checking, while the `CHECK` constraint that the same Ledger page recommends is runtime enforcement by the database.
- The course has no CONFIGURED and no NOT COVERED. Courses 06–08 need both: a SERIALIZABLE isolation level is configured, provider idempotency is assumed or configured, and some handlers are out of scope.
- The roadmap's four words leave out TESTED, REFUTED and UNKNOWN, which the course teaches carefully (gap class 11; the timeout rule). Yet the same demonstration calls for "systematic tests" and a checker that "exhibits a violation", so the report needs those words too.
- One claim can need several levels: C2.3's proposition is proved of the model while its correspondence is refuted (A7-03). The course allows only one stamp per claim.

**Recommendation:**
- Adopt the single vocabulary in §"Unify" below:
  - CHECKED becomes **MODEL-CHECKED**.
  - Add **CONFIGURED** and **NOT COVERED**.
  - Keep TESTED, REFUTED and UNKNOWN.
- UNKNOWN always carries its fallback ("? UNKNOWN · rlimit 5M → □ ENFORCED at commit").
- Allow several stamps per claim field (see A7-03).
- Add a `verify:vocabulary` gate. It fails on "checked" used as a stamp word, and on "verified", "safe" or "correct" in UI copy (DESIGN.md §9 already bans these words).

### A7-02 · CRITICAL: Stamp colours leak outside claims, so the home page asserts PROVED and CHECKED about things that are neither

**Where:**
- DESIGN.md:18–20 versus DESIGN.md:90–94.
- Elevation:58–59: set courses are filled #1D3F8F (PROVED).
- Elevation:57: the current course's progress fill is #E3E9F6 (CHECKED tint).
- Elevation:65: the legend says "claims proved so far".
- Elevation:85: the calibration bars use #1D3F8F and #C2410C.
- Elevation:97–98: "9 Specimens" is vermilion and "11 Claims" is PROVED blue.

**Problem:**
- "Set (viva passed)" means passing a *self-graded* oral defence (PLAN.md:243–247), yet it is drawn in PROVED blue. Course 01 is solid PROVED blue while it carries a seam (its claims assume unbounded ℤ).
- CHECKED tint is labelled "proved".
- The calibration bars use proof colours to mean good or bad buckets.
- "11 Claims" in PROVED blue counts claims that are mostly unproved. The Ledger shows 12 of 31 proved.

The first screen teaches the colour-to-strength mapping wrongly.

**Recommendation:**
- Stamp hues may appear only inside a stamp or an assurance strip attached to a claim.
- Show progress in ink:
  - set: graphite fill with vellum text
  - in progress: a 45° pencil hatch with the count in text
  - not started: outline only
- "You are here" becomes a pointer glyph, not a verdigris outline (see A7-17).
- Counters and calibration use ink and pencil only.
- Add a `verify:palette` lint that fails when a stamp token appears outside `.stamp` or `.strip`.

### A7-03 · CRITICAL: The Ledger's single stamp per claim, and its headline, teach that PROVED needs no scrutiny

**Where:**
- Ledger:42: "31 claims. 12 proved. Read the other 19 carefully."
- Ledger:66: C2.3 shows "Proved" and "Erosion" side by side, and EROSION is styled as REFUTED (DESIGN.md:45).
- Ledger:70: C5.2 is stamped ASSUMED although its method is "TLC, WF on Timeout".
- Ledger:63: the columns are Claim, Proposition, Stamp, Method and Rests on. There is no Correspondence column and no Requirement column.
- The Main claim card (Main:123–130) has no Requirement row, although PLAN.md:264 and DESIGN.md:96–97 require one.
- PLAN.md:100–104 says erosion hits the correspondence field, never the proposition.

**Problem:**
- The headline says the 12 PROVED claims are the safe ones. That contradicts the thesis (PLAN.md:24–28: "a true theorem about the wrong thing") and roadmap rule 4. The erosion banner on the same page is about a PROVED claim.
- One stamp cannot express "proposition proved of the model; correspondence refuted by S6.4; requirement assumed". The row therefore reads as both proved and refuted.
- The ASSUMED stamp on C5.2 erases the fact that it was model-checked under a fairness assumption.
- "Rests on" mixes four different things:
  - assumptions ("weak fairness of the clock")
  - versions ("fragment v0.3")
  - trust ("Z3 trusted")
  - evidence ("S6.2 lost update")

**Recommendation:**
- Replace the single stamp with an **assurance strip**: Proposition · Model · Correspondence · Requirement (· Environment). Each segment carries its own stamp and qualifier. For C2.3:
  - Proposition: `⊢ PROVED · Lean kernel, axioms propext`
  - Correspondence: `~ ASSUMED · ℤ = bigint`, cracked to `⊥ REFUTED by S6.4`
  - Requirement: `~ ASSUMED · "conservation is the rule"`
- Erosion becomes a crack glyph on one segment, not a second stamp.
- Split "Rests on" into **Assumes** (links to shared assumption records) and **Evidence** (a receipt or specimen).
- Headline v2: "31 claims · 47 assumptions · 3 erosions. Start with what they rest on."
- Add a **rests-on view**. Pick an assumption (for example "balances are unbounded ℤ") and see every claim that depends on it.
- Add the Requirement row to the claim card. It can never render PROVED.

### A7-04 · CRITICAL: The first instrument styles the solver's raw `sat` as a refutation, which teaches that sat means bad

**Where:**
- Lesson:104: `<span class="stamp" style="background:#C2410C…">sat · witness found</span>`.
- The Call It options at Lesson:84–86.
- The roadmap's Stage 1 completion test: "Interpret sat, unsat, and unknown precisely", and "explain why searching for a violation means asserting the negation".

**Problem:**
- Whether sat is good or bad depends on what the query asserts. Here the query asserts ¬P, so sat refutes P.
- Later the same course needs sat to be the *good* answer:
  - a vacuity check (gap class 2) asks for a model of the hypotheses;
  - Alloy `run` instances, test-input generation and reachability witnesses are all wanted sats;
  - in Course 04, a VC is valid exactly when its negation is unsat.
- Colouring the solver's word as the REFUTED stamp skips the interpretation that the first completion test examines.

**Recommendation:**
- Split the result into two rows:
  - **Row 1, neutral mono ink:** "Z3 returned **sat**. Model: a = 0, b = 0, amount = 1."
  - **Row 2, the stamp, derived from query direction and result:** "Query asserted ¬(a′ ≥ 0), so the property is ⊥ REFUTED · witness: 3 vars, 1 step."
- Declare what the query asserts in the instrument header: "Query: ∃ a state violating P".
- After the run, ask the learner to interpret before the stamp appears: "So P: holds / is violated / can't tell". Record this as its own Call It type.
- Across the course, `verify:calls` must include both directions, so that some sats are good news.

### A7-05 · CRITICAL: The Theater stamps one observed trace as CHECKED

**Where:**
- Theater:90: TypeOK carries a CHECKED-style stamp reading "Holds on this trace".
- Theater:91: an ASSUMED-style stamp whose word is "Needs fairness".
- Theater:105: a CHECKED stamp whose qualifier sits outside it.
- DESIGN.md:39: CHECKED requires a bound.
- Gap classes 5 and 11 (PLAN.md:229 and 235).

**Problem:**
- One trace is a single sample, TESTED with n = 1 at most. Here it wears the stamp reserved for exhaustive search within a bound.
- The Theater's lesson is the contrast between your hand-played trace and the checker's exhaustive search. Giving both the same stamp erases that contrast.
- "Needs fairness" is not a stamp word.

**Recommendation:**
- Live monitors show observations, not stamps:
  - "✓ holds so far on your trace (6 steps)", in pencil ink with no fill;
  - "✗ violated at t6", in vermilion ink, linked to the step.
- Only explorer or TLC results earn a stamp, with the bound inside it: `⊨ MODEL-CHECKED · 212 states · 2 workers · amount ∈ {80}`.
- Liveness rows read: "◇ AllDone: needs WF(Timeout). Your lasso: none yet."
- Add a stamp-grammar lint: the word must come from the shared vocabulary, and the qualifier must sit inside the stamp.

### A7-06 · MAJOR: Stamp shapes do not separate the stamps that matter, and the qualifier is the smallest text

**Where:**
- DESIGN.md:36–45 shape cues:
  - PROVED, ENFORCED ("solid slate") and REFUTED are all solid fills.
  - TESTED and UNKNOWN are both ochre.
  - CHECKED is the same blue hue as PROVED.
- DESIGN.md:33–34 says a stamp always carries a qualifier.
- Main:19–20: the stamp word is 12 px bold expanded, while the qualifier is 11 px mono `small`.
- Bare stamps with no qualifier appear at Main:121 and 128, Elevation:92, Audit:44, Ledger:65–68 and 73, Lesson:120, and Theater:105.

**Evidence (measured):**

| Pair | Luminance ratio | Separation (CIE76 ΔE) |
|---|---|---|
| PROVED #1D3F8F vs ENFORCED #3B4A57 | **1.07:1**, so identical in a greyscale print of the exported report | 12.2 under tritanopia |
| TESTED #7A5A00 vs UNKNOWN #5C4400 | — | 13.2 |

**Problem:**
- The distinction between PROVED and ENFORCED is central to the roadmap's end state, yet the two differ only by hue and word.
- TESTED (sampled evidence) and UNKNOWN (no verdict) share a hue.
- Most artboard stamps omit the "mandatory" qualifier. Where it appears, it is the smallest text, although it is the claim itself ("≤ 3 holds").

**Recommendation:**
- Make word, glyph and border differ for every stamp. All glyphs below are verified present in JuliaMono v0.63.2. (The full table is in §Unify.)

  | Glyph | Stamp | Border or fill |
  |---|---|---|
  | ⊢ | PROVED | solid fill |
  | ⊨ | MODEL-CHECKED | dotted blue, the line language's "bounded" |
  | ≈ | TESTED | solid outline, ochre |
  | □ | ENFORCED | double rule, slate ("always, by abort") |
  | ≜ | CONFIGURED | thin outline |
  | ~ | ASSUMED | dashed |
  | ? | UNKNOWN | neutral grey hatch, off ochre |
  | ∉ | NOT COVERED | pencil, no border |
  | ⊥ | REFUTED | solid vermilion |

- Set the qualifier at the same size as the word (12 px mono, weight 600). For MODEL-CHECKED and TESTED, put the bound first.
- `<Stamp kind qualifier>` makes `qualifier` a required type. ASSUMED requires `why` instead.
- Give each stamp an accessible name, such as "Proved by Lean kernel, axioms propext".

### A7-07 · MAJOR: The Lesson page leaks the Call It answer, and specimen evidence is hand-written

**Where:**
- Lesson:46–50, the rail: "This lesson establishes … S1.2 Specimen: the overdraft". It is visible while the learner predicts sat or unsat for the unguarded query (Lesson:83–87).
- The specimen data disagrees:
  - Lesson:107 shows the witness `[a = 0, b = 0, amount = 1]`, and Lesson:110 says "Mount as specimen S1.2".
  - Main:141 shows S1.2 as amount 40 → −40, and Main:129 says "S1.2, balance −40".
- Lesson:68 hard-codes "Z3 4.15", but npm `z3-solver` is **5.3.1** (modified 2026-10-16; A5 also flags this).
- The margin note sits in the main column (Lesson:61–64).

**Problem:**
- Naming a specimen before the run tells the learner that a counterexample exists. The page answers the call, not the learner. This breaks kernelspace's "fix the instrument before anything consumes it" (100X §3.1) and P2's rule that "what just happened stays hidden until done".
- One specimen ID with two different witnesses shows that IDs and values are typed by hand, not produced by runs.

**Recommendation:**
- The rail shows section titles only. "Establishes" appears after the exit ticket.
- Specimen IDs are minted on mount. Labels are generated from the run: witness, tool version, seed, and minimality against the shortest witness.
- Instrument headers bind to the version the engine reports.
- Margin notes become true sidenotes in a right margin at 1100 px and wider, and fall inline below that.
- Add a cue-leak lint over the blocks before each Call It, on the same idea as kernelspace's test-wiseness lint.

### A7-08 · MAJOR: Agent claims wear the course's own PROVED stamp, and the home page spoils an audit case

**Where:**
- Audit:44: a bare PROVED stamp on the agent's self-assessment.
- Elevation:92: "One claims [Proved] on a theorem with a false hypothesis."

**Problem:**
- The Audit Desk exists to teach distrust of "verified ✓" (PLAN.md:213–217). Showing the agent's unqualified claim in the stamp reserved for kernel-checked results lends it the course's authority.
- The home-page teaser names the gap, roughly gap class 2 (vacuous premise), before the learner opens the case.

**Recommendation:**
- Show submissions as quoted, unstamped text: "Agent says: “proved”, “safe to merge”", in pencil with an UNREVIEWED label.
- Show facts the desk re-derived with their provenance: "lake build ✓, re-run on your Bench · axioms: propext, Quot.sound".
- A stamp appears only after the learner files a finding.
- Teasers show counts and subjects only, for example "2 cases waiting · refunds (Lean), hold timeout (TLA+)".

### A7-09 · MAJOR: The Audit Desk flow pre-selects an answer, collects too little, and scores before any evidence

**Where:**
- Audit:69: the first gap-class radio is `checked`.
- Audit:77–80: evidence is free text.
- Audit:83–87: the re-stamp options are only REFUTED, ASSUMED and ACCEPT. PLAN.md:219–220 also lists "downgrade CHECKED".
- Audit:86: ACCEPT is drawn as a stamp.
- Audit:31: precision and recall show live as "71% · 64%", with no n.

**Problem:**
- A default gap class anchors the learner and lets them submit without deciding.
- The core skill is "decide what it is a proof *of*" (Audit:61), yet there is no field to state the proposition the theorem actually proves.
- Free-text evidence cannot be checked by an instrument.
- Downgrades to TESTED (gap 11) and to MODEL-CHECKED (gap 5) are missing.
- Over 32 or fewer cases, percentages without counts mislead.

**Recommendation.** Flow v2:
1. Show only the theorem statement and the claim it supports. The learner calls sound or gap, with CBM confidence.
2. Reveal the description and the diff.
3. **Restate:** "This proves: ___", in plain English, optionally with a Lean `theorem` stub.
4. Choose a gap class. There is no default, and "none: sound" is an explicit option.
5. Give evidence by clicking diff lines (line-anchored citations), and optionally attach a **witness** the desk re-runs: a Z3 query, a Lean `example : ¬ …`, or a TS predicate. A finding is then itself stamped `⊥ REFUTED by witness` or `~ argued`.
6. Re-stamp each field with the full vocabulary.
7. Score after submission, as counts: "5 of 7 flags correct".

### A7-10 · MAJOR: Call It offers confidence levels without stakes, has no way to say "guess", and lets Reset re-open a recorded call

**Where:**
- Lesson:88–93 and PLAN.md:125: confidence options 55, 75 and 95%.
- PLAN.md:129: "the first call is the one recorded".
- The Lesson script, line 153: `reset` clears call, confidence and run state.
- Lesson:140: "Correct — recorded", although the voice rules ban "correct" (DESIGN.md:127–128).

**Problem:**
- Bare percentages are hard to report honestly.
- 55% is not "no idea" on a three-way call (chance is 33%), or on "which anomaly" calls with more options.
- Reset after a run blanks the controls, which implies the call can be made again.

**Recommendation:**
- Use **certainty-based marking** (Gardner-Medwin):
  - Three levels: "Unsure", "Fairly sure", "Sure".
  - Payoffs shown before choosing: +1/0, +2/−2, +3/−6.
  - Honest reporting maximises the expected score; the optimal switch points are 67% and 80%.
  - Map the levels to probabilities for the reliability diagram.
- Print chance per question: "3 options · chance 33%".
- After the first run, lock the recorded call visibly: "Recorded: sat · Fairly sure · +2". Reset clears only runs labelled practice.
- Copy: "Your call matched" or "Your call missed".
- To reduce density, disclose step by step: verdict, then confidence, then Run.
- Use native radios (see A7-17).

### A7-11 · MAJOR: The Judgment panel makes unsupported claims about the learner

**Where:**
- Elevation:82–87: "last 40 calls", Brier 0.14 ("0.25 is a coin flip"), five bars, and "At 80% confidence you were right only 58% … Overconfident about guards."

**Problem:**
- There is no 80% option, and five bars do not match three levels.
- 40 calls across five buckets is about 8 per bucket. The Wilson 95% interval for 58% at n = 8 is about 27–84% [derived], which contains 80%. So "overconfident about guards" is not supported: the learner model breaks the course's own rule that every claim wears its status.
- "0.25 is a coin flip" is true only for binary calls.

**Recommendation:**
- Draw a reliability diagram with:
  - one bin per offered level;
  - the diagonal;
  - **n printed per bin**;
  - 95% **consistency bars** (Bröcker & Smith 2007).
- Show a diagnosis only when its interval excludes the diagonal and n ≥ 20, and label the diagnosis itself ("≈ TESTED · n = 23").
- The headline is the CBM average and the calibration gap, not Brier.
- Use ink colours only (A7-02).

### A7-12 · MAJOR: Too many nouns, mixed metaphors, and three name collisions

**Where:**
- Elevation:32: the nav has Elevation, Courses, Bench, Theater, Audit Desk, Cabinet, Ledger and Notes, plus Search.
- PLAN.md:590 lists 10 pages.
- PLAN §0–2 coins about 30 proprietary nouns across five metaphors: masonry, drafting, museum, theatre, and court/academy.
- The collisions:
  - **"Ledger"** is both the progress page and the subject's ledger (Audit:40 "feat(ledger)", Audit:48 "Ledger/Refund.lean", and Stage 2's "verified pure credit ledger").
  - **"course"** is both a stage and the product.
  - **"Plinth"** is this course, Mini-Plinth/Plinth Core (the language) and the base metaphor, and it collides with other uses of the word.
  - **"set"** is also Lean's `Set`.

**Problem:**
- Two meanings of "Ledger" can appear on one screen.
- Eight destinations plus about nine named instruments is more navigation than a solo learner on 6–10 h/week can hold between sessions.

**Recommendation:**
- Set a noun budget of six or fewer top-level destinations, all plain words from one metaphor family.
- v2 navigation: **Today · Map · Bench · Inspect · Record**, plus search.
- Theater, Goal Replay and the Derivation Board are instruments inside lessons and the Bench, not destinations.
- Cabinet, Judgment and Notes become tabs of Record: Claims · Specimens · Calibration · Notes.
- The Deferred Shelf becomes a "Not yet" section of Map.
- Claims Ledger becomes **Record**, and its export is a "proof report".
- UI copy never says "the course". Say "Plinth" for the programme and "Plinth Core" for the language, and keep other uses of the word out of public copy.
- Test whether "set" confuses Lean learners, and fall back to "signed off" if it does.
- See §"v2 key screens".

### A7-13 · MAJOR: There is no Today or re-entry surface for a learner who returns weekly

**Where:**
- Elevation:70–101: the home page offers one CTA, "Resume lesson".
- PLAN.md:148–151: Re-find exists but appears on no artboard.
- kernelspace-PLAN-100X §5.7 K2: Today is 10–12 minutes, phone-first, and shows a welcome-back set after 7 or more idle days.

**Problem:**
- At 6–10 h/week over 9–18 months, sessions are few and gaps of one to three weeks are likely.
- The costliest moment is re-entry: what was I proving, what failed, what is due.

**Recommendation.** A **Today** screen, which is also the phone home, sized to the minutes the learner says they have:
1. Due Re-finds, with CBM confidence.
2. One statement-first audit card.
3. "Where you left off": the last receipt, the failing check, and the open Lean goal from the receipt.
4. Erosions fired since the last visit.
5. The next lesson step.

After 7 or more idle days, show a welcome-back set instead of an overdue count. At the end of a session, prompt for a "park note", and show it first next time.

### A7-14 · MAJOR: The Elevation is a linear tower and a lock, contradicting the family rule that nothing locks

**Where:**
- Elevation:47–60: eleven stacked courses, 46% to 100% wide.
- Elevation:48: "Nothing is set on an unchecked base".
- PLAN.md:215: audit cases are "unlocked as courses are set".
- kernelspace-PLAN-100X §0 ("nothing locks") and §3.11 (soft gates).

**Problem:**
- A tower implies that Course 05 (TLA+) needs Courses 03–04 (Lean semantics and VCs), which is false for its core.
- The widths encode nothing.
- The stepped silhouette reads as a ladder of levels: the gamified look DESIGN.md:11 rejects.
- Unlocking by viva gates practice behind self-grading.

**Recommendation:**
- Draw the prerequisite DAG as a **masonry bond**: each course block spans exactly the blocks whose claims it uses. An illustrative layout (derive the real one from the KC graph):
  - 05 rests on 01;
  - 06 rests on 03 and 05;
  - 08 rests on 05;
  - 09 rests on 03 and 04.
- Width encodes estimated hours.
- Every block can be entered. "Set" describes assurance, not access.
- Provide a DOM list mirror (as A5 asks) and a phone list.

### A7-15 · MAJOR: Lean and TLA+ notation will not render in the specified code font

**Where:**
- DESIGN.md:80: "IBM Plex Mono, falling back to Noto Sans Math for ∀ ∃ ⊢ □ ◇ ⟦⟧ ℤ ′".
- DESIGN.md:82–83: JuliaMono "evaluate in production".
- Every artboard loads these faces from Google Fonts (for example Main:12).

**Evidence (measured 2026-10-21 from the served files):**

| Font | Glyphs | Missing of 49 Lean/TLA+ symbols | Advance widths |
|---|---|---|---|
| IBM Plex Mono (v20 TTF) | 930 | **36**, including ∀ ∃ ⊢ ⊨ □ ◇ ⟦ ⟧ ℤ ℕ ≜ ⇒ ∨ ∧ ↦ λ ⟨ ⟩ ∈ ⊆ ∪ ∩ ⊤ ⊥ ≡ | 600 units |
| Noto Sans Math (the fallback) | — | 4 | **proportional**, 173 to ≥572 units, so mixed lines drift out of alignment |
| Source Serif 4 | — | ℤ, ∀, ∃, ⇒ and others, so "unbounded ℤ" in prose (Main:125) falls back | — |
| **JuliaMono v0.63.2** | 11,191 | **0** | single advance width |

**ᵢ** and **⁻** (as in x⁻¹) are in none of the three Google Fonts faces.

**Recommendation:**
- The code and logic face is **JuliaMono** (SIL OFL), self-hosted and subset to the code points the content uses.
- Prose sets inline math in the code face.
- Add a `verify:glyphs` gate: extract every code point from lessons, specimens, audit cases and claims, and fail if any is missing from the face assigned to its role.
- Show each symbol's typing abbreviation and spoken name on hover and tap (A7-18).

### A7-16 · MAJOR: The artboards contradict their own line language

**Where:**
- DESIGN.md:27: "Dashed … the only meaning of a dash anywhere".
- DESIGN.md:28: dotted blue means bounded.
- DESIGN.md:93: seams are dashed vermilion.
- DESIGN.md:104: the SHARED state row is drawn in dashed boxes.
- Theater:20 (dashed empty slots) and Theater:76–81 (dashed SHARED cells).
- Main:134: a dashed divider.
- Elevation:58: the seam is #C2410C dashed on #1D3F8F.

**Problem:**
- Dashes also mean shared state, an empty slot, and a divider.
- The seam mixes the dash (assumed) with vermilion (witnessed violation). An assumption that has not failed is drawn in the colour of failure.
- Dotted blue is defined but never used.
- The seam is **1.88:1** against the navy block, below the 3:1 WCAG 1.4.11 asks for graphics that carry meaning.

**Recommendation:**
- Each line style has one meaning:
  - dashed pencil means assumed;
  - dotted blue means bounded (it becomes the MODEL-CHECKED border);
  - heavy vermilion means a witnessed violation;
  - a zig-zag vermilion **crack** means erosion.
- Map seams are dashed graphite joints (14.6:1 on vellum) carrying "~". They become cracks only when an erosion fires.
- Shared state is a tinted band. Empty slots are blank. Dividers are solid hairlines.
- Add a CSS lint that rejects `dashed` and `dotted` outside the assumed and bounded classes.

### A7-17 · MAJOR: Call It and other controls break the design's own accessibility rules

**Where:**
- DESIGN.md:122–124 promises that "Call It is a real radio group" and that targets are at least 44 px.
- Lesson:83–93 uses `<button>`s in a `role="group"`. The selected state is a background swap only (script, lines 131–134), with no `aria-checked` or `aria-pressed`.
- Elevation nav links are about 41–43 px tall (14 px text, 2×12 px padding, 2 px border).
- The search button (Elevation:34) and the Ledger filters (Ledger:53–58) have `min-height:40px`.
- DESIGN.md:62 gives verdigris three jobs: links, the focus ring and "you are here". Elevation:57 draws "you are here" as a 2.5 px verdigris outline.
- No artboard defines `:focus-visible`.

**Evidence:**
- Under deuteranopia, verdigris #0E6655 simulates to neutral grey #575756, close to pencil #4A534D.
- Verdigris against body ink is about 2.5:1 [derived], so links must keep their underlines (WCAG 1.4.1).

**Recommendation:**
- Use a `<fieldset>`/`<legend>` with native radios (the APG radio pattern). Show the selected state with a check glyph, not fill alone.
- Focus is a 2 px graphite ring with a 2 px vellum offset (15.5:1 in dark mode).
- "You are here" is a pointer glyph, not an outline.
- Never remove underlines from inline links.
- Make every target at least 44 px.
- Run axe at 360 and 1280 px, plus NVDA and VoiceOver passes, as in kernelspace-PLAN-100X §7.3.

### A7-18 · MAJOR: Traces and logic notation are not perceivable or operable without sight

**Where:**
- Theater:54–83: the trace is a grid of `div`s with no table semantics.
- A violation is shown only by colour and border width (Theater:73 and 81: vermilion against graphite is 3.15:1; 2.5 px against 1.5 px). The "t6" label is coloured only (Theater:57).
- DESIGN.md:123–124: single-key shortcuts (1–9, c, u).
- The notation ⊢ □ ◇ ≜ ⟦⟧ appears throughout.

**Problem:**
- A screen-reader user hears a flat list of events with no process or time attached.
- Single-character shortcuts must be scoped to focus, or be possible to turn off or remap (WCAG 2.1.4).
- Screen readers speak logic glyphs inconsistently. Which glyphs are skipped per reader is **unverified**; test with NVDA and VoiceOver.

**Recommendation:**
- Render the trace as a real `<table>`: `th scope=col` for t1…t6 and `th scope=row` for W1, W2 and SHARED.
- Add a narrated alternative: "t6 · W2 writes bal ← 20 · shared: bal 20, spent 160 · ✗ NoOverspend".
- Mark violations with text and a glyph, not colour alone.
- Make shortcuts focus-scoped, listed and toggleable.
- Add a notation layer:
  - every symbol gets an `aria-label` from a speech map: ⊢ "proves", □ "always", ◇ "eventually", ≜ "is defined as";
  - TLA+ shows in ASCII source form by default, with a pretty-print toggle; the tlauc mapping table converts between the forms;
  - Lean symbols show their input abbreviation, such as `\|-`.

### A7-19 · MAJOR: In the Theater the learner chooses processes, not actions; history is linear; the lasso has no interface

**Where:**
- Theater:41–52: Step W1, Step W2, Crash W1, Duplicate reply, Delay message, Undo.
- Theater:92: the lasso exists only in prose.
- PLAN.md:189–200.

**Problem:**
- The scheduler cannot see each process's next action.
- Message faults are offered in a model with no messages.
- A single Undo makes exploring alternatives tedious, although alternatives are the point.
- Liveness's hardest idea, the lasso, has no affordance.
- Nothing shows how much of the state space the learner covered.
- "Crash W1" is drawn in vermilion, which is reserved for violations (A7-16).

**Recommendation:**
- Controls list enabled actions: "W1 ▸ write bal ← 20". Disabled actions show their reason ("guard false").
- Faults are defined per scenario.
- History is a **branching tree**: click any past state to fork from it.
- **Lasso tool:** "loop back to this state". The monitor then evaluates fairness: "W1 continuously enabled, never taken: not weakly fair".
- A **state-space minimap** shows visited states against all reachable states (for example 9 of 212).
- A granularity toggle shows how the number of interleavings changes.
- Draw faults in ink.

### A7-20 · MAJOR: The dark "blueprint" theme converges on kernelspace and loses the stamp shapes

**Where:**
- DESIGN.md:13–14 (Plinth is "deliberately the opposite" of kernelspace).
- DESIGN.md:67–69: ground #0E1622, sheet #142033, rule #2A3A52, verdigris #4FC2A8, proved #8FB0F5; "stamps invert to outline-on-dark with the same shape cues".
- kernelspace `src/index.css`: `--primary: 154 87% 60%; /* accent mint */` and `--accent: 218 33% 14%`.
- There is no dark artboard.

**Evidence:**
- The blueprint sheet is ΔE76 **3.7** from kernelspace's #18212F surface, and the ground is ΔE76 5.6. Both are effectively the same navy.
- Blueprint verdigris has hue 166°; kernelspace mint has hue 154°.
- Dark PROVED and verdigris have the same luminance (ratio 1.01).
- Dark rules are 1.58:1 against the ground.

**Problem:**
- At night, Plinth looks like kernelspace.
- If every stamp becomes an outline, the solid, hollow and outline cues vanish. That contradicts "same shape cues".
- On a blue ground, PROVED blue becomes the ambient line colour.
- The line-drawn structure disappears at 1.58:1.

**Recommendation.** Use a neutral **graphite night** theme. Every token below is validated:

| Token or stamp | Values | Contrast |
|---|---|---|
| Ground | #121412 | — |
| Sheet | #1A1D1A | — |
| Ink | #E9ECE6 | 14.3:1 |
| Pencil | #B4BCB2 | 8.7:1 |
| Component rule | #6E776E | 3.67:1 |
| PROVED | solid #8FB0F5, text #0B1430 | 8.4:1 |
| REFUTED | solid #FF8A50, text #2A0E00 | 7.8:1 |
| MODEL-CHECKED | dotted #8FB0F5 on #1E2A44 | 6.6:1 |
| TESTED | #E0B44C | 8.8:1 |
| ENFORCED | double rule #B7C4D1 | 9.6:1 |
| ASSUMED | dashed border #A9B1A9 | 7.7:1 |
| UNKNOWN | hatch, #E0C878 on #26261C | 9.2:1 |

- Links are ink with an underline, not mint.
- Dark PROVED and REFUTED fills have similar luminance (1.08:1), so in greyscale the glyphs ⊢ and ⊥ carry the difference.
- Draw the dark artboards before building.

### A7-21 · MAJOR: There are no phone designs, and wide components only scroll

**Where:**
- Every artboard preview is 1280 px wide.
- Theater:55 has `min-width:900px`.
- Ledger:19 has `min-width:880px`.
- The Audit diff uses `white-space:pre`.
- A5-F12 already demands a phone contract. This finding adds the per-screen layouts.

**Recommendation:**
- **Today:** phone-first.
- **Lesson:** single column. Call It is a sticky bottom sheet. Heavy instruments show recorded runs with run IDs (as A5 proposes).
- **Theater:** rotate the lanes so time flows down, with one column per process (two or three fit at 360 px), SHARED as a sticky strip, and an action bar of enabled actions.
- **Inspect:** a statement-first card, the diff collapsed, and a three-step finding form.
- **Record:** claim cards with assurance strips and filter chips with counts. Show the table only at 900 px and wider.
- **Map:** a vertical list.
- **Bench:** labelled laptop-only.

### A7-22 · MINOR: Motion is well restrained; spend it on showing change

**Where:** DESIGN.md:109–114.

**Recommendation:**
- Every stamp lands with the same 120 ms motion. PROVED gets no extra flourish.
- Animate diffs instead:
  - goal states in Goal Replay;
  - the trace scrub in the Theater;
  - erosion cracks propagating to dependent claims.
- Under `prefers-reduced-motion`, show the same diffs as static +/− marks.

### A7-23 · MINOR: Loading fonts from Google's CDN conflicts with local-first, offline use and no telemetry

**Where:** every artboard loads Google Fonts (Archivo with width 62–125 and weight 400–800).

**Problem:**
- The CDN receives the learner's IP address. The Munich Regional Court (LG München I, 3 O 17493/20, 20 January 2022) held that embedding Google Fonts without consent unlawfully transmitted IP addresses. The source is secondary, and whether the ruling was appealed is **unverified**.
- Offline sessions fall back to system fonts, which makes A7-15 worse.
- Archivo ships more width and weight range than the design uses.

**Recommendation:**
- Self-host subset WOFF2 files:
  - Archivo, width 100–125, weights 600–800;
  - Source Serif 4, regular, italic and semibold;
  - JuliaMono, subset by the glyph gate.
- Precache them in the service worker.

### A7-24 · MINOR: Numbers disagree across sheets, and the title block is decoration rather than provenance

**Where:**
- Elevation:43 says "course 2 of 10", but there are 11 courses (00–10).
- Claim counts disagree: "11 Claims" (Elevation:98), "7 of 12 claims" (Elevation:57) and "31 claims" (Ledger:42).
- The two S1.2 witnesses differ (A7-07).
- DESIGN.md:88–89 says each lesson and receipt carries a title block, but the Lesson artboard has none.

**Recommendation:**
- Drive every mockup from one fixture of learner state.
- Make the title block a provenance block, filled from receipts and runs and never typed:

  | Field | Content |
  |---|---|
  | Project | Plinth Core version |
  | Sheet | claim or lesson ID |
  | Drawn | date of the run |
  | Rev | receipt hash |
  | Scale | the bound |
  | Checked by | engine and version |

---

## Unify: the stamps and the proof report should share one vocabulary

The answer is **yes**. The learner is training to read and write exactly the kind of report the roadmap's final demonstration asks for. Stamps are participles and report sections may be verbs, but the words must match.

| Shared stamp | Glyph · shape | Meaning | Course qualifier (required) | Change |
|---|---|---|---|---|
| PROVED | ⊢ · solid | holds for every input of the model, checked by a kernel or solver | checker and TCB: "Lean kernel · propext", "Z3 unsat · no certificate", "cvc5 + Carcara" | none |
| MODEL-CHECKED | ⊨ · dotted | holds in every reachable state within a stated bound | constants, scope, states, depth | course renames CHECKED |
| TESTED | ≈ · outline | held on n sampled runs | n, generator, seed | teach carefully (gap 11) |
| ENFORCED | □ · double | the runtime rejects violations | where: commit check, DB `CHECK`, timeout | new shape |
| CONFIGURED | ≜ · thin | a setting, read back | what was read and when | add to the course (06, 08) |
| ASSUMED | ~ · dashed | taken on trust | why, and what would test it | — |
| UNKNOWN | ? · grey hatch | no verdict | rlimit or timeout, plus the fallback (→ □ or ~) | pair with a fallback |
| NOT COVERED | ∉ · bare | outside the model | what is outside | add to the course |
| REFUTED | ⊥ · solid vermilion | a witness violates the property | witness size, specimen ID | — |
| *(event)* EROSION | crack on a strip segment | a later course broke an assumption or correspondence | the cracking specimen | not a stamp |

Rules:
1. A claim carries an **assurance strip**, one stamp per field, so a single claim can carry several levels.
2. Correspondence and Requirement can never be ⊢.
3. The Record exports its sections in the course's own order and as JSON (bold idea 1).

---

## v2 design system: drafting table, with the semantics enforced

**Tokens (light):** keep DESIGN.md §4. Every text pair passes, from 4.99:1 to 9.79:1. The changes:
- Stamp hues are scoped to `.stamp` and `.strip` by lint.
- Verdigris is for links and the current location only.
- Focus is a 2 px graphite ring with a 2 px vellum offset.
- UNKNOWN moves to neutral grey.

**Tokens (dark):** graphite night, as in A7-20. kernelspace's navy and mint are not used.

**Stamp grammar:** `[glyph] WORD · qualifier`.
- The qualifier is required and the same size as the word.
- The bound comes first for MODEL-CHECKED and TESTED.
- Word, glyph and shape are all distinct; colour is a fourth cue.
- Each stamp has an accessible name.

**Line language:**

| Line | Meaning |
|---|---|
| Solid graphite | structure |
| Dashed pencil | assumed |
| Dotted blue | bounded |
| Heavy vermilion | witnessed violation |
| Vermilion zig-zag crack | erosion |

Nothing else may be dashed or dotted.

**Type:**
- Archivo, width 100–125 and weights 600–800, for structure.
- Source Serif 4 for reading.
- JuliaMono for code and logic, including inline math.
- Everything self-hosted and subset.
- The `verify:glyphs` gate.
- A minimum label size of 12 px on phones.

**Components:**
- Stamp; assurance strip; claim card (six fields plus Requirement).
- Specimen label, generated from the run.
- Instrument cell, with a provenance title block and the query direction.
- Call It (CBM, radios, a post-run interpretation step).
- Trace table, with a narrated text alternative and a vertical phone layout.
- Goal strip (Lean goals with diffs and type hovers).
- Derivation board, with a keyboard path.
- Finding form (no default, line-linked evidence, witness, restatement).
- Report section.

**Accessibility contract:**
- WCAG 2.2 AA gate: axe at 360 and 1280 px, plus NVDA and VoiceOver.
- No colour-only state.
- Speech map for notation.
- Shortcuts scoped to focus.
- 44 px targets.

**Motion contract:** A7-22.

**Phone contract:** A5-F12 plus the layouts in A7-21.

## v2 key screens (10)

1. **Today.** The session plan: due Re-finds, a statement-first audit card, where you left off (receipt, failing check, open goal), new erosions, and the next step. A welcome-back set after 7 or more idle days, and the park note. This is the phone home.
2. **Map** (the Elevation, v2). The masonry-bond DAG:
   - set blocks in graphite;
   - in-progress blocks hatched;
   - seams as dashed joints and erosions as cracks;
   - every block enterable;
   - "Not yet" (the Deferred Shelf) above the top course;
   - a list mirror.
3. **Lesson.** Prose (680 px or less) with right-margin sidenotes and no answer-leaking rail. The instrument cell declares its query direction. Call It is CBM, then Run, then the learner interprets, then the stamp lands. "Establishes" appears after the exit ticket.
4. **Goal Replay** (Lean). A strip of goal states with diffs. The learner predicts the next goal under Call It. Types appear on hover. ASCII and abbreviation toggles are available. The proposition is pinned with its Requirement row asking "is this the requirement?" (A5 measured build-time goal export via `$/lean/plainGoal`.)
5. **Bench and receipt.** The receipt is rendered as a title block. It prints its TCB, per-check results, and the claims it will mint or update, with its provenance lane (as A5 proposes).
6. **Theater / Shake Table.** Enabled-action controls, branching history, monitors that show observations rather than stamps, a state-space minimap against the explorer and TLC, the lasso tool, printed constants, and vertical lanes on phones.
7. **Inspect** (the Audit Desk, v2). Statement first, then the description, then the restatement, then a gap class with no default, then line-linked evidence and a witness, then a re-stamp per field, then a score shown as counts.
8. **Specimens.** Drawers by course, including empty labelled drawers. Each specimen shows its witness, its minimality against the shortest witness, its Re-find schedule, and filters by gap class.
9. **Record** (the Ledger as a proof report). Sections ordered by stamp, assurance strips, a rests-on view showing each assumption's blast radius, the erosion log, a calibration tab with consistency bars, export to Markdown and JSON, and claim cards on phones.
10. **Sign-off** (the viva) **and Notes.** Prompts, a written or recorded answer, the rubric, then the block sets. The note composer is pre-filled from the learner's specimens and erosions.

## Bold ideas

1. **The Record is a proof report.**
   - Progress renders in report sections and a JSON schema, so the capstone output is a valid report artefact.
   - A weekly "report diff" shows what got stronger and what got weaker.
2. **Masonry-bond Map with propagating cracks.**
   - The metaphor *is* the dependency graph.
   - An erosion cracks every claim resting on the broken assumption, so the learner sees its blast radius.
3. **Logic-glyph stamps as the brand** (⊢ ⊨ ≈ □ ≜ ~ ? ∉ ⊥).
   - The wordmark and favicon come from ⊢.
   - Glyphs survive greyscale, 16 px and speech.
4. **Statement-first inspection cards on the phone, generated fresh by seed.**
   - Audit judgment gets spaced practice instead of 32 one-off cases (kernelspace K1 generators).
5. **Witness-backed findings.**
   - The desk re-runs the learner's Z3 query, Lean `example : ¬ …` or TLA+ trace.
   - The auditor's own work is stamped in the same vocabulary.
6. **The Shake Table.**
   - The learner plays the adversarial ground motion.
   - A state-space minimap shows how little hands cover compared with the checker, which makes "bounded versus exhaustive" visceral.
7. **A notation layer you can say and type.**
   - Every symbol shows how to type it, how to say it, and its ASCII form.
   - Listings flip between pretty and source forms.
   - The glyph gate keeps the layer honest.
8. **Goal Replay as proof movies made from real Lean data.**
   - Alectryon-style reading (Pit-Claudel 2020).
   - Verso-style hovers.
   - No server: everything is exported at build time.

---

## Sources

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
  - Understanding 1.4.1, Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
  - Understanding 1.4.11, Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - Understanding 2.1.4, Character Key Shortcuts: https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
  - Understanding 2.5.8, Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - Understanding 4.1.2, Name, Role, Value: https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- ARIA APG radio group pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/ · table pattern: https://www.w3.org/WAI/ARIA/apg/patterns/table/
- Machado, Oliveira & Fernandes (2009), "A physiologically-based model for simulation of color vision deficiency", IEEE TVCG 15(6), DOI 10.1109/TVCG.2009.113. I used its severity-1.0 matrices. The DOI was not re-fetched this session.
- Certainty-based marking (Gardner-Medwin):
  - https://www.ucl.ac.uk/lapt/REAP_CBM.htm
  - https://docs.moodle.org/39/en/Using_certainty-based_marking (thresholds 67% and 80%; marks +1/0, +2/−2, +3/−6)
- Bröcker & Smith (2007), "Increasing the reliability of reliability diagrams", Weather and Forecasting 22(3):651–661:
  - https://researchonline.lse.ac.uk/id/eprint/22217
  - preprint: https://www.lse.ac.uk/CATS/Assets/PDFs/Publications/Papers/2007/73-IncreasingReliabilityDiagrams-2006-Brocker-Smith.pdf
- JuliaMono v0.63.2 (measured): https://github.com/cormullion/juliamono/releases/tag/v0.63.2
- Font files measured 2026-10-21:
  - IBM Plex Mono v20: https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf
  - Noto Sans Math v19: https://fonts.gstatic.com/s/notosansmath/v19/7Aump_cpkSecTWaHRlH2hyV5UHkG.ttf
  - Source Serif 4 v15, served by fonts.googleapis.com
- z3-solver 5.3.1, modified 2026-10-16 (via `npm view`): https://www.npmjs.com/package/z3-solver
- PostgreSQL 18, Constraints (the `CHECK` constraint, A7-01): https://www.postgresql.org/docs/18/ddl-constraints.html
- kernelspace tokens: https://github.com/praveer13/kernelspace/blob/main/src/index.css
- Verso: https://github.com/leanprover/verso and https://verso.lean-lang.org/doc/latest. Search snippets say its hover and proof-state renderer is experimental; the details are unverified.
- tlauc (TLA+ ASCII↔Unicode): https://docs.rs/crate/tlauc/0.1.1
- LG München I, 3 O 17493/20 (secondary source): https://www.ihk.de/bergische/recht-und-steuern/wettbewerbsrecht/google-fonts-5646176
- Pit-Claudel (2020), "Untangling mechanized proofs" (Alectryon), SLE 2020, DOI 10.1145/3426425.3426940. Not re-fetched; verify before citing publicly.
- Local files: kernelspace-PLAN-100X §0, §3, §5.3, §5.7 and §7.3; A5-feasibility (A5-F12, the Z3 version, provenance lanes).

## Appendix: measurements

**Light-mode contrast (text).** All pass:

| Pair | Contrast |
|---|---|
| Labels, #4A534D on vellum | 7.14 |
| Labels on sheet | 7.67 |
| Link, #0E6655 on vellum | 6.17 |
| TESTED | 6.15 |
| UNKNOWN on hatch | 7.40 |
| CHECKED | 7.99 |
| White on PROVED | 9.72 |
| White on ENFORCED | 9.12 |
| White on REFUTED | 5.18 |
| Theater violated state | 7.00 |
| "t6" label, vermilion on white | 5.18 |
| Crash button text | 4.99 |
| Code comments | 5.85 |

**Non-text contrast:**

| Element | Contrast | Note |
|---|---|---|
| Seam, vermilion on navy | **1.88** | fails 3:1 |
| ASSUMED dashed border | 5.63 | passes |
| Progress tint against sheet | 1.17 | the information is also in text |
| Violation border against normal border | 3.15 | passes |
| Dark-mode rule | **1.58** | fails |

**Colour-vision checks (Machado 2009):**

| Pair | Result |
|---|---|
| PROVED vs ENFORCED | luminance 1.07; ΔE 43.5 normal, 37.1 protan, 40.2 deutan, 12.2 tritan |
| PROVED vs REFUTED | ΔE ≥ 92 in every simulation |
| Verdigris under deuteranopia | becomes #575756 |

**Glyph coverage (49 symbols):**

| Font | Missing |
|---|---|
| IBM Plex Mono | 36 |
| Source Serif 4 | 34 |
| Noto Sans Math | 4, and proportional |
| JuliaMono | 0, and monospaced |

**kernelspace comparison:**

| Pair | ΔE76 |
|---|---|
| Blueprint sheet vs kernelspace's #18212F surface | 3.7 |
| Blueprint verdigris vs kernelspace mint | 34 (hues 166° and 154°) |
