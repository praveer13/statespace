# A3 · Learning-science audit of Plinth v1

**Lens.** Learning science. Each v1 mechanic is mapped to the evidence base: first kernelspace's adversarially verified dossiers and PLAN-100X Appendix A, then sources checked in this session. Each mechanic is rated supported, mis-dosed, unsupported or contraindicated. Every replacement comes with a dosage.

**Date.** 2026-10-20 (task date). Sources were checked on 2026-10-20 and 2026-10-21. This file replaces the earlier A3 file at this path. It was written independently; where it agrees with the earlier run, treat that as a second, independent finding.

**What I read.**
- The roadmap: `research/context/roadmap.md`.
- v1: `docs/history/v1/PLAN-v1.md` (643 lines) and `docs/history/v1/DESIGN-v1.md` (130 lines).
- All six artboards (`design/canvas/*.dc.html`), including the Call It logic in `Lesson.dc.html` L126–160.
- kernelspace: `PLAN-100X.md` (§3, §5, §9, §10, Appendix A/B), `research/learning-science.md`, `research/computing-education.md`, `research/ai-tutoring.md` (§2.6–2.8, gaps), `audit/motivation.md`, and `kernelspace-specs/wave-1.md` (§5.3 staircase, §6.3–6.4 composer and re-entry, §8.1 exit tickets).
- The learner's platform design (private design), for alignment only and not reproduced here.
- Sibling plans (tablespace T4 covers isolation anomalies and SSI).

**Evidence tags.**
- **[dossier]**: verified in a kernelspace dossier.
- **[verified]**: checked this session against a primary source or its abstract.
- **[secondary]**: only a secondary source was reachable.
- **[derived]**: my computation from v1's own numbers.
- **[unverified]**: could not be checked.

**Calibration.**
- Meta-analytic effects here come from aligned, researcher-made tests, mostly K-12 or undergraduate. Field effects are typically about 0.1 SD (Kraft 2020 [dossier]).
- No RCT targets working engineers learning formal methods. Formal-methods teaching evidence is mostly design and experience reports: Forge (Nelson et al. 2024), Alloy4Fun (Macedo et al. 2021), and Lean workshops (Thoma & Iannone 2022, exploratory, 36 proofs). There are also misconception studies: Greenman et al. 2023 on LTL, and Selden & Selden 1995 on unpacking statements into logic.
- Expect tenths of an SD, and measure on the learner's device.

---

## 0. Verdict

v1 has an original and largely evidence-compatible surface:
- **Call It** is a prediction/prequestion device.
- **The Theater** is a scaffolded simulation in which the learner plays the adversary.
- **Goal Replay** is a worked example with anticipation prompts.
- **The Audit Desk** aims straight at the roadmap's end-state (g).
- **The six-field claim** is a reusable schema.
- **Stamps** cannot render without their qualifier, and instruments state their limits. Both are honest notional-machine practice.

**The layer that turns activity into durable, unassisted, calibrated judgment is missing or invalid:**

1. **No learner model or retention architecture.** v1 swapped kernelspace's KC graph, exit tickets and review queue for thematic mechanics (PLAN L51–57). Re-find covers about 40 bug instances, not the roughly 100 concepts. Nothing measures recall at a delay, so roadmap rule 6 has no instrument (C1).
2. **The credential is unreliable and can be gamed or done by an agent.** A course is *set* by a self-graded viva taken straight after the course, or by an LLM-graded one. Receipts mint claims whether the learner or an agent wrote the proof. "Set" also gates (C2).
3. **The base rates teach blanket distrust.** 28 of 32 audit cases are flawed and 6 of 6 seam tests crack, so "reject everything" beats the mockup learner on precision and recall (C3).
4. **One core concept is set up to be taught wrongly.** Lesson 0.5 defines "invariant" as "inductive invariant", and Course 04 reports a sat inductive step as a "violating state" (C4).
5. **Guidance is withheld and dosing is off:**
   - theory drawers open only after two misses;
   - Course 04 has a drag-only derivation board but there is no worked-example fading anywhere (Goal Replay is read-only);
   - nothing is interleaved;
   - the core discriminations get one to five exemplars each;
   - the authoring direction (English → formal), the most error-prone one, gets no dosed practice.

**Fix.** Keep Plinth's surfaces and put the family's evidence substrate under them, renamed in Plinth's own vocabulary (the Desk, settled, cured), with the dosage in §3. None of this needs a server.

---

## 1. Mechanic → evidence map

| # | v1 mechanic | Where | Evidence | Verdict | Finding |
|---|---|---|---|---|---|
| 1 | **Call It** (verdict + confidence before every run) | PLAN L120–133; DESIGN L101–102; Lesson L81–105, L139–141 | Prequestions: g=0.54 on asked content vs 0.04 on unasked (St. Hilaire 2023 [dossier]). Predict-observe-explain (Crouch 2004 [dossier]). Hypercorrection (Butterfield & Metcalfe 2001; Metcalfe & Finn 2011 [dossier]) | **Supported in kind; mis-dosed** (every run and every tactic). Feedback is verdict-level and the scale is wrong for k-way items | M2 |
| 2 | **Judgment** (Brier, reliability diagram, per-type trait) on the home page | PLAN L126–128; Elevation L82–87 | Feedback interventions: d=.41, but over a third lower performance, more so when attention moves to the self (Kluger & DeNisi 1996 [verified]). Comments beat grades (Butler 1987 [verified], children). Calibration is trainable (Carpenter 2019 [verified]), but low performers stay overconfident (Osterhage 2021 [verified]), and forecasting-training gains are contested (Mellers 2014 vs Hauenstein 2025 [verified]) | **Mis-dosed / contraindicated as displayed** | M3 |
| 3 | **Specimen Cabinet** + Minimise | PLAN L135–147 | Learning from errors needs corrective feedback (Metcalfe 2017 [dossier]). Correct worked examples outperform incorrect-only or mixed sets on average (Barbieri 2023 [secondary]). Active comparison beats display (Alfieri 2013, d=.50 [dossier]) | **Supported with caveats** | m4, M4 |
| 4 | **Re-find** (spaced re-presentation of a specimen) | PLAN L148–151 | Retrieval g=0.50 (Rowland 2014 [dossier]). Spaced vs massed retrieval g=0.74 (Latimier 2021 [verified]). Transfer needs varied application items (Pan & Rickard 2018 [dossier]). Successive relearning (Rawson & Dunlosky 2022 [dossier]) | **Right technique; wrong unit, items and criterion** | M5, C1 |
| 5 | **Claims Ledger as the progress system** | PLAN L30–34, L89–118; Ledger L42–43 | Informational feedback +0.33 (Deci 1999 [dossier]). Unaided-evidence rule (kernelspace V6, H4) | **Supported as an artifact record; invalid as a learner record** | C2 |
| 6 | **Six-field claim card** | PLAN L30–33, L91–93, L263, L585, L598 | ICAP (Chi & Wylie 2014 [dossier]). Generation d=0.40 (Bertsch 2007 [dossier]). Fading plus prompts (Atkinson, Renkl & Merrill 2003 [verified]) | **Supported idea; delivered as templates** | M9 |
| 7 | **Assurance stamps** (7 categories + qualifier) | DESIGN §3; PLAN L94–96 | Category induction from varied, contrasting exemplars (Kornell & Bjork 2008 [dossier]; Kang & Pashler 2012 [secondary]) | **Supported**; but the mockups show inconsistent exemplars | m7 |
| 8 | **Seams and erosion** | PLAN L97–113 | Spiral re-encounter = spacing. Anomalous data changes beliefs only when engaged: of seven responses, only one is theory change (Chinn & Brewer 1993 [verified]) | **Supported in kind; passive, and a 100% crack rate** | C3, m2 |
| 9 | **Theater** (learner as scheduler and environment) | PLAN L189–200; Theater artboard | Simulation g=0.85; novices benefit from examples, experts from reflection (Chernikova 2020 [dossier]). Productive failure for concepts (Sinha & Kapur 2021 [dossier]) | **Supported** (needs scaffolds) | m6 |
| 10 | **Derivation Board** (drag substitutions, syntactic checks) | PLAN L204–208 | Step-based tutoring d=0.76 (VanLehn 2011 [dossier]). Transfer-appropriate processing (Morris, Bransford & Franks 1977 [verified]) | **Supported** but mis-formatted and Course 04 only | m3 |
| 11 | **Goal Replay** (predict the next goal before each tactic) | PLAN L209–211 | Worked examples + anticipation/self-explanation (Atkinson 2003 [verified]; Bisra 2018 g=.55 [dossier]) | **Supported; over-dosed; no fading toward production** | M2, M4 |
| 12 | **Audit Desk** (32 cases, 12 gap classes, precision/recall) | PLAN L213–236; Audit L31, L94 | Discrimination via interleaving (Brunmair & Richter 2019 [dossier]). About 7 opportunities to reach 80% (Koedinger 2023 [dossier]). Blind-strategy lint (kernelspace V1) | **Right target; mis-dosed, gameable, blocked by course** | C3, M7 |
| 13 | **Self-graded viva** as the gate for *set* | PLAN L42, L240–247 | Self-assessment vs learning ρ=.34 overall, .19 web-based, .00 for gain; .51 with repeated self-assessment plus accuracy feedback (Sitzmann et al. 2010 [verified]). kernelspace: self-graded = practice weight (V6, H4) | **Contraindicated as the sole credential; supported as explain-back practice** | C2 |
| 14 | **BYOK examiner** that grades | PLAN L244–246 | LLM raters α .52–.65 before deliberation (Ipeirotis & Rizakos 2026 [dossier]). kernelspace will not build an in-page BYOK drawer or LLM-graded credentials (PLAN-100X §10) | **Unsupported for grading; fine as a formative examiner** | C2 |
| 15 | **"Set" gates audit cases and paints progress** | PLAN L215, L246–247; Elevation L48, L64 | Self-paced mastery programs reduce completion (Kulik 1990 [dossier]). kernelspace principle 11: soft gates | **Contraindicated as a gate** | C2 |
| 16 | **Theory drawers open after two missed calls** | PLAN L261, L599–600 | High-information feedback d=0.99 vs corrective 0.46 (Wisniewski 2020 [dossier]). Learners under-use help (Aleven 2003 [verified]). Expertise reversal (Kalyuga 2003 [dossier]). Just-in-time information (Kester 2001 [verified]) | **Contraindicated** | M1 |
| 17 | Prequestion block | PLAN L599; Lesson L40 | St. Hilaire 2023 | **Supported**; dose unspecified | §3 |
| 18 | Exit ticket | Lesson L44 only; absent from PLAN | kernelspace wave-1 §8.1 | **Unspecified** | §3 |
| 19 | Placement (Course 00 only) | PLAN L277–278 | Expertise reversal; prior knowledge dominates (Koedinger 2023) | **Under-scoped** | M11 |
| 20 | Notes composer (after 02, 05, 07, 09) | PLAN L248–250 | Writing-to-learn is small on average and larger with metacognitive prompts (Bangert-Drowns 2004 [secondary]; Graham 2020 ES 0.30 [secondary]) | **Supported; prompts thin** | m5 |
| 21 | Deferred Shelf | PLAN L251–255 | Coherence principle (Mayer 2024 [dossier]); just-in-time information (Kester 2001) | **Supported (keep)** | — |
| 22 | Instruments state what they are not | PLAN L172–187 | Notional machines with "what it ignores" (Fincher 2020 [dossier]) | **Supported (keep)** | — |
| 23 | Bench labs and receipts (no hints, guardrails or provenance) | PLAN L153–170; no `AGENTS.md`, hints or no-AI check in PLAN (grep) | Bastani 2025; Shen & Tamkin 2026; Sankaranarayanan 2026; VanLehn 2011 [dossier] | **Missing support** | M10, C2 |
| 24 | Lesson length about 45 min with no segment budget | Lesson L31 | Segmenting (Rey 2019 [verified]); interpolated tests (Szpunar 2013 [verified]) | **Unspecified** | m1 |
| 25 | Formalization (English → formal) practice | 0.3; labs | Greenman 2023; Selden & Selden 1995 [verified] | **Missing as dosed practice** | M8 |
| 26 | Interleaving | none | Brunmair & Richter 2019; Kornell & Bjork 2008 | **Missing** | M6 |
| 27 | Worked-example fading | none (Goal Replay is read-only) | Barbieri 2023; Kalyuga 2003; Atkinson 2003; van Gog & Sweller 2015 | **Missing** | M4 |

---

## 2. Findings, ranked

### C1 · Critical · No retention architecture or learner model, so rule 6 has no instrument

**Where.**
- PLAN L51–57: the comparison table replaces kernelspace's "KC graph, spiral items", "quizzes, exit tickets, lab checks" and "flashcards" with Seams, Viva/Audit and Call It/Re-find.
- L148–151: Re-find is the only spaced mechanism, and it is keyed by specimen.
- L266: rule 6 maps to "Course set by viva; Judgment calibration; Audit precision/recall".
- L580–600: the architecture has no KC map, scheduler, item generator or evidence log.

**Problem.**
- The arc is 9–18 months, and Courses 06–10 (months about 6–18) rest on knowledge components (KCs) taught in months 1–4: negate-then-search, sat/unsat/unknown, induction with a generalised hypothesis, WP by substitution, and safety vs liveness.
- In v1 a KC is practised in its lesson, perhaps in a lab, and once in a viva. It is never practised again unless it happens to be a specimen.
- There are about 40 specimens against roughly 100 KCs. Specimens are bug instances, not concepts like "what kernel acceptance establishes".
- No mechanic measures recall at a delay. "Set" happens at the end of the course.

**Evidence.**
- Retrieval vs restudy: g=0.50 (Rowland 2014) and g=0.61 (Adesope 2017) [dossier].
- The best spacing gap is about 5–10% of a one-year retention interval (Cepeda 2008) [dossier].
- Spaced vs massed retrieval: g=0.74 (Latimier, Peyre & Ramus 2021) [verified].
- Successive relearning (Rawson & Dunlosky 2022) [dossier].
- The median number of practice opportunities to reach 80% is 7.24 (Koedinger 2023) [dossier]. v1 gives most KCs one to three.
- kernelspace already designed and verified this substrate: V3–V6, K1–K2, the VRK₃₀ north star (PLAN-100X §1, §5.1, §5.7), and wave-1 §6.3 (composer) and §6.4 (re-entry).

**Recommendation.** Put the family substrate under Plinth's surfaces, with Plinth names:
1. **KC graph.** About 100 KCs (8–10 per course), with roughly 25–30 marked as threshold KCs, and `requires` and `confusable` edges (§3.1). Every Call It, exit item, audit case, specimen, viva prompt and lab check is tagged.
2. **Evidence log.** An append-only, exportable log in IndexedDB, with provenance on every event: `unaided`, `assisted` or `agent`.
3. **The Desk.** A 10–15-minute FSRS session, 3–4 times a week, at desired retention 0.85–0.90. It gives at least 8 graded opportunities per KC in the first 60 days, then maintenance (§3.2).
4. **Generators on the course's own instruments.** Z3, the explorer, the interpreter, the Datalog engine and a history checker generate items, so every review uses a fresh variant (B1).
5. **North star: "cured" KCs.** A KC counts once it is answered correctly, unaided, on a fresh variant at least 30 days after first learning (B2).

Re-find becomes one item family inside the Desk. The time comes from the roadmap's 20% reading share: about 40–60 minutes a week, roughly 7–10% of a 6–10-hour week.

### C2 · Critical · *Set* is a self-graded credential, taken right after the course, that an agent can earn and that also gates

**Where.**
- PLAN L42 and L240–247: the learner self-grades each rubric line; an optional BYOK examiner "grades against the same rubric"; a course is set on passing.
- L215: audit cases are "unlocked as courses are set".
- L163–168: receipts mint claims, and the grader "is not tamper-proof".
- Elevation L48 ("Nothing is set on an unchecked base") and L64 ("set (viva passed)"); Ledger L42–43.

**Problem.**
- **Validity.** Self-assessed knowledge correlates with tested learning at ρ=.34 overall, but only ρ=.19 in web-based instruction and ρ=.00 when learners rate their *gain* (Sitzmann, Ely, Brown & Bauer 2010, k=137, N=16,951) [verified, full text]. The viva is web-based and taken straight after the course. Low performers stay overconfident even after practice-test feedback (Osterhage 2021, N=341) [verified].
- **Substitution.** The learner builds Plinth with coding agents. A Lean proof or VC generator written by an agent mints the same PROVED claim and the same receipt. Unguarded AI raised practice scores 48% and cut unaided exam scores 17% (Bastani 2025) [dossier]. In Shen & Tamkin 2026 (preprint, N=52), the AI group scored 50% vs 67%, d=0.738, with the largest gap on debugging [dossier].
- **LLM grading.** Independent LLM raters agreed at α .52–.65 before deliberation (Ipeirotis & Rizakos 2026) [dossier]. kernelspace explicitly will not build an in-page BYOK drawer or LLM-graded credentials (PLAN-100X §10). Direct browser calls also need Anthropic's opt-in `anthropic-dangerous-direct-browser-access` header (Willison, 2024-08-23) [secondary; current docs not checked].
- **Gating.** "Set" unlocks audit cases and is what paints the Elevation. Self-paced mastery programs reduce completion (Kulik 1990) [dossier].
- **Net effect.** By the course's own taxonomy, the learner's competence would be stamped PROVED on evidence that is "test presented as proof" plus "hidden trust".

**Recommendation.**
- **Part A, "Proof of work".** 6–8 machine-graded items on fresh variants of the course's KCs, taken with the agent closed (provenance `unaided`). Items are graded by the instruments: solver equivalence for negations, WPs and encodings; the explorer for property classification; a history checker for anomalies. Pass mark: at least 5 of 6, including at least one constructed item.
- **Part B, "Defence".** An explain-back:
  - the learner first **predicts their own rubric score**;
  - then answers in writing or by recording;
  - then self-grades against the rubric and model answer.

  The course then shows the gap between the predicted score, the self-grade and Part A. Repeated self-assessment with accuracy feedback is the condition under which Sitzmann found ρ=.51 (k=10).
- **Status levels.**
  - *Set* = Part A passed and Part B attempted.
  - *Cured* = a 30-day re-viva on fresh variants at 80% or better.
  - Retakes come after 24 hours or more, with new variants.
- **Nothing locks.** Audit cases open on demand, with a note: "not yet set: expect gap classes you haven't met".
- **The AI examiner** moves into the lab zip's `AGENTS.md` as a formative *viva mode* for the learner's own agent. It asks follow-ups, the code picks the objections from an authored list, and it never grades.
- **Lab claims carry provenance.** A claim enters the learner's record only through a no-AI "Prove it" with three questions about the learner's own artifact:
  - restate the proposition;
  - predict the verdict on a code-mutated version;
  - name what the receipt does not establish.

### C3 · Critical · Base rates teach blanket distrust, and the audit score can be gamed

**Where.**
- PLAN L215–223 and the §3 case lists: 32 cases, of which 4 are sound (A2.5, A4.3, A6.4, A9.3).
- PLAN L106–113: 6 of 6 planned seam tests crack.
- Audit L31 ("71% precision · 64% recall") and L94.
- Ledger L43 ("a claim downgraded for a good reason is worth more…").

**Problem.**
- **The metric is gameable** [derived]. If precision and recall are computed on the accept/reject decision, as L221–223 and Audit L94 describe, then "reject everything" scores precision 28/32 = 87.5% and recall 100%. That beats the mockup learner (71% / 64%).
- **The seams send the same signal.** Every planned seam test cracks.
- **The learner absorbs a false prior:** that about 88% of "verified" agent claims are broken and every assumption fails. That is the opposite of end-state (g), "decide which correctness claims are justified".
- **The defect is familiar.** It is the test-wiseness problem kernelspace measured (always picking the longest option passed 58 of 68 lessons) and fixed with a blind-strategy lint (PLAN-100X V1). The supporting evidence is the item-writing literature (Haladyna 2002; Attali & Bar-Hillel 2003) [dossier].

**Recommendation.**
- **Audit cases.**
  - Make 40–50% of cases sound, built as **matched pairs**: the same PR in a sound and a flawed variant. These are contrasting cases (Alfieri 2013).
  - Score with the gap class and evidence required.
  - Add `verify:audit-blind`. It fails if always-reject, always-accept or always-class-k scores above chance + 2 SD.
  - Record each decision as a probability, P(sound), scored with a proper rule (B4).
- **Seams.**
  - Plan about 9 seam tests, about a third of which **hold**. Examples:
    - C5.1, "a hold never resolves twice", survives crash injection when resolution is a single atomic transition; only the liveness claim C5.2 needs a recovery assumption.
    - Course 04's fragment VCs survive the *correct* compiler, while the bad optimisation (E5) cracks them.
  - Precede each seam test with a prediction (m2).

### C4 · Critical · "Invariant" is taught as "inductive invariant", so a sat inductive step will read as a reachable bug

**Where.**
- PLAN L286 (0.5): "Invariants as 'true at start, preserved by every step'".
- L396 (4.4): the obligation `Inv ∧ Guard ∧ Step ∧ ¬Inv′`.
- L398 (4.6): counterexamples are decoded and replayed in the interpreter.
- L402–403 (L4): the checker reports "violating states".
- L124: the Call It verdicts are holds / violated.
- Course 05 uses TLC invariants, which are checked over reachable states.
- A per-command inductive check is the roadmap's Stage 4 obligation.

**Problem.**
- A predicate can be an invariant (true in every reachable state) without being inductive.
- A sat answer to the step obligation is a **counterexample to induction (CTI)**, and its pre-state may be unreachable. The usual fix is to strengthen the invariant, not to change the command. CTIs are defined this way in Schultz, Dardik & Tripakis 2022 (arXiv 2205.06360) [verified], and maintainers on the TLA+ list say the same: an unreachable CTI pre-state usually means the invariant is too weak (discuss.tlapl.us msg06535) [verified].
- v1 does three things that push the wrong reading:
  - it defines "invariant" by the induction rule;
  - it calls sat results "violating states";
  - it offers only a binary verdict.
- So every Course 04 Call It, specimen and Re-find trains "sat ⇒ bug". Courses 04 and 05 also use "invariant" in two different senses and never contrast them.
- Uncorrected misconceptions persist (Roediger & Marsh 2005 [dossier]). This one is load-bearing for reading the learner's real checker output.

**Recommendation.**
- **Lesson 0.5** teaches both definitions side by side (invariant; inductive invariant = initiation + consecution) with a 2×2 set of contrasting cases:
  - inductive and an invariant;
  - an invariant but not inductive;
  - neither;
  - inductive but uselessly weak.
- **Course 04 verdicts become three-way**, with reachability checked by the interpreter or explorer from Init:
  - `unsat — inductive`;
  - `sat — CTI (pre-state unreachable: strengthen Inv)`;
  - `sat — reachable violation (fix the command)`.
- **L4** prints "counterexample to induction" plus a reachability verdict.
- **New specimens and audit cases.**
  - Specimen pair S4.3 / S4.4: a CTI from an unreachable state, and the same command with a reachable witness.
  - An audit case in which an agent "fixes" a correct command in response to a CTI.
  - A new gap class: "induction failure reported as a bug, or a bug dismissed as a CTI".
- **Dose.** At least 4 CTI-vs-real discrimination items, interleaved in the Desk through Course 09.

### M1 · Major · Theory drawers open only after two missed calls

**Where.** PLAN L261; L599–600 (`drawer`, "opened by repeated misses"); Lesson L139–141, where a miss gets one line of feedback.

**Problem.**
1. **Feedback content.** Elaborated, high-information feedback is the active ingredient (d=0.99 vs 0.46 for corrective feedback; Wisniewski 2020) [dossier]. The best moment for it is right after a *confident* error (hypercorrection) [dossier].
2. **Mechanics.** For binary verdicts the first run reveals the answer, so a second miss on the same call is almost impossible [derived]. If "twice" means two different calls, a novice must fail twice before seeing any theory.
3. **Help use.** Learners under-use on-demand help, even though good help-seeking goes with better learning (Aleven et al. 2003) [verified]. Making help contingent on failure adds friction exactly where novices need guidance (Kalyuga 2003) [dossier].
4. **Roadmap rule 1** ("read only enough theory… revisit when the artifact exposes a gap") is about scope, not about withholding. Just-in-time presentation satisfies it: supportive information before a task cluster, procedural information during the step (Kester, Kirschner, van Merriënboer & Bäumer 2001) [verified].

**Recommendation.**
- After any miss, or any "guess", show a **≤60-word, misconception-specific explanation** keyed to the wrong verdict chosen. Then offer an isomorphic variant with a fresh seed.
- Drawers are **always openable**, labelled with the task they unlock.
- Each task cluster opens with a ≤3-minute just-in-time card.
- Log drawer opens as help-seeking and never penalise them.

### M2 · Major · Call It gates every run and every tactic, with the wrong scale and verdict-level feedback

**Where.**
- PLAN L122–125: every run is gated; confidence is 55/75/95%.
- L129–130: "no penalty for 'unknown'".
- L209–211: Goal Replay asks for a Call It before each tactic.
- DESIGN L101–102: "Run stays disabled until a verdict and confidence are chosen".
- Lesson L90–92 and L139–141.

**Problem.**
- **Over-dosed.**
  - Gating every exploratory edit, every Course 06 differential run and every Goal Replay tactic invites low-effort clicks, which then pollute the calibration record.
  - Routine prompts draw low-effort replies. In Khanmigo, 39.4% of student messages were bare answers and 12.6% were low-effort (Oreopoulos & Low 2026) [dossier].
  - Prequestions help the content they ask about (St. Hilaire 2023), so they belong at **diagnostic** moments.
- **No "explain" step.** Predict-observe-explain has three steps (Crouch 2004); kernelspace P2 requires predict → run → one-line explanation.
- **Scale** [derived].
  - The lowest confidence is 55%, but chance on a 3-way item is 33%, so an honest guesser cannot say "guess".
  - A pure guesser at 55% scores Brier ≈ (1/3)(0.45²) + (2/3)(0.55²) ≈ 0.27, worse than the "0.25 is a coin flip" anchor shown on the Elevation.
- **`unknown` is ambiguous.**
  - As a verdict next to sat/unsat, it invites use as "I don't know".
  - The authored "unknown" in lesson 1.1 (nonlinear arithmetic) depends on solver heuristics and version. Z3 is now at **5.3.1** (GitHub release 2026-10-15; npm `z3-solver` 5.3.1, 2026-10-16) [verified], while the Lesson artboard says "Z3 4.15". Unknown has to be taught as a property of a *run* (solver, version, timeout), not of the formula.

**Recommendation.**
- **Dose.** 2–4 authored Call Its per lesson, placed where a named misconception predicts a wrong verdict, plus the first run of each new query. Free runs in the sandbox are ungated.
- **Goal Replay** prompts at only 2–3 structural steps per proof (induction split, use of the IH, case split): "which goal next, and why?".
- **Scale.** Guess / think so / sure, stored as 1/k, the midpoint, and 0.95. Offer `unknown` only on solver items that state the version and timeout.
- **After a miss or a guess:** a one-line "why" (self-explanation, g=.55; Bisra 2018 [dossier]), then the authored misconception feedback.
- **Lint.** Extend `verify:calls` so every distractor carries a misconception id and its feedback.

### M3 · Major · The home-page Judgment panel over-reads tiny samples and scores pre-instruction guesses

**Where.** PLAN L126–128. Elevation L82–87 shows "last 40 calls", a Brier score of 0.14, "0.25 is a coin flip", five bars, and "At 80% confidence you were right only 58% … Overconfident about guards".

**Problem.**
1. **It scores guesses.** Calls include predictions made before instruction. Being wrong there is the intended learning event (St. Hilaire 2023), yet it lowers a headline score, which punishes honest guessing.
2. **The sample is too small.** Forty calls spread over 3 confidence levels and several question types leaves about 3–8 calls per cell [derived]. The mockup also shows **5** bars and an "80%" bucket that a 55/75/95 scale cannot produce. "Overconfident about guards" is noise presented as a trait.
3. **Trait-level feedback can hurt.** Feedback raised performance on average (d=.41), but more than a third of interventions *lowered* it, increasingly so as feedback directed attention to the self (Kluger & DeNisi 1996, 607 effect sizes) [verified]. Grades and praise produced ego-involvement, while comments raised interest and performance (Butler 1987, N=200, grades 5–6) [verified; a child sample].
4. **The upside is real but bounded.**
   - Training with feedback improved metacognitive efficiency in a way that transferred across domains (Carpenter et al. 2019) [verified].
   - But low performers stay overconfident (Osterhage 2021).
   - Gains from forecasting training (Mellers et al. 2014) were reduced, eliminated or reversed once confounds were controlled (Hauenstein et al. 2025, *Psych Sci* 36(1)) [verified].

**Recommendation.**
- Score Judgment only on **post-instruction** calls: the Desk, exit tickets, Re-find, audits and Part A.
- Show it on a private "Mirror" page, not the Elevation, and show nothing until there are **at least 30 scored calls**.
- Then show:
  - a reliability diagram with Wilson intervals per confidence level;
  - **resolution** as well as calibration;
  - a "sure-and-wrong" list, each item re-queued first in the next session.
- Phrase it at the task level ("your 'unsat after adding a guard' calls: 6/10 at *sure*"), never as a trait.
- Keep Brier (Brier 1950) as an internal metric.

### M4 · Major · No worked-example → fading pipeline for the hardest material, and the course leans on erroneous examples

**Where.**
- Goal Replay (PLAN L209–211) is the only worked-example device.
- Bench labs L2, L3 and L9 go straight to independent proofs.
- The Derivation Board is used in Course 04 only.
- The §3 lessons are "You do" problems.
- The Cabinet, the Audit Desk and `broken/` are all erroneous examples (L144–147, L213–236, L262).

**Problem.**
- Lean proofs, WP derivations, TLA+ specs and simulation proofs are high in element interactivity for a formal-methods novice. That is where worked examples beat problem solving, and where the testing effect can shrink (van Gog & Sweller 2015) [dossier].
- **Worked examples work.** In mathematics the pooled effect is g=0.48. Correct-only examples outperformed incorrect-only and mixed sets, and adding self-explanation prompts moderated the effect (Barbieri et al. 2023) [secondary: abstract via a mirror; full text not checked].
- **Fading plus prompts improved near and far transfer** (Atkinson, Renkl & Merrill 2003) [verified].
- **Fade fast for experts** (expertise reversal, Kalyuga 2003).
- v1 has the read-only end (replay) and the full-problem end (labs), with nothing in between. It also leans on broken examples, which pay off once correct schemas exist.

**Recommendation.**
- **Procedure families (10).** A five-rung ladder for each of:
  - Z3 encoding;
  - Lean list induction with a generalised IH;
  - progress/preservation case analysis;
  - WP for assign/seq/if;
  - VC construction;
  - PlusCal/TLA+ action + invariant + config;
  - SQL history → anomaly;
  - Datalog policy;
  - self-composition for noninterference;
  - a simulation step.
- **The five rungs.**
  - **L0:** a worked example with 2–3 self-explanation prompts.
  - **L1:** the last step blanked (backward fading). In Lean, the last tactic becomes `sorry`, checked locally by `lake build`.
  - **L2:** two steps, or a middle step, blanked.
  - **L3:** an independent isomorphic problem.
  - **L4:** transfer, either a new surface (inventory instead of balances) or two KCs combined.
- **Staircase.**
  - 3-up/1-down per (KC, family), converging near 79% expected accuracy (kernelspace wave-1 §5.3).
  - Start at L1 after the lesson; placement starts at L3.
- **Dose.** At least 6 items per family before its Bench stage (about 60 items in all), then generator items in the Desk.
- **Pairing.** Show every specimen and audit case next to its correct counterpart.
- **Productive-failure openers** only at conceptual "why" moments, and always followed by a consolidation that compares the learner's attempt with the canonical design. The effect is g=0.36 for conceptual knowledge and −0.03 for procedural (Sinha & Kapur 2021) [dossier].

### M5 · Major · Re-find rehearses instances, not the reasoning move

**Where.** PLAN L148–151.

**Problem.**
- **The item repeats.** Showing the same broken spec again lets the learner recall the witness (`a=0, b=0, amount=1`) instead of re-deriving it. That is item memory, not the "reasoning move" L151 intends.
- **Transfer needs varied application items.** Pan & Rickard 2018 found d=0.40, and transfer often vanished after bias correction unless moderators like application items were present [dossier].
- **No criterion.** The queue has no relearning criterion.
- **The schedule shape is not the active ingredient.** Spaced vs massed retrieval is g=0.74, but the expanding-vs-uniform difference was negligible (Latimier et al. 2021) [verified for the 0.74; secondary for expanding vs uniform].
- **Scope.** About 40 specimens cover bug instances, not concepts.

**Recommendation.**
- Each Re-find draws a **fresh isomorph of the specimen's bug class**: renamed entities, new constants, or a different command with the same flaw (a refund that mints money becomes a transfer fee that mints money).
- Each bug class has a generator. `verify:generators` checks that every generated item reproduces its keyed verdict.
- A class is *settled* after correct re-finds in **3 separate sessions**. A miss returns it in about 1 day, and a sure-and-wrong answer goes first in the next session.
- Scheduling comes from the Desk's FSRS, not a separate queue.

### M6 · Major · Nothing is interleaved, so the core discriminations never mix

**Where.** §3: every Call It and audit case belongs to one course. L215: audit cases unlock course by course. No review mixes courses. The overlap with tablespace T4 (isolation anomalies, SSI) is not linked.

**Problem.**
- The course's judgment skills are **discriminations among similar categories**:
  - which stamp;
  - which property kind (safety, liveness, hyperproperty, refinement, requirement);
  - which gap class;
  - which anomaly (lost update, write skew, read skew);
  - which fairness (none, WF, SF);
  - which encoding (ℤ, BitVec, Nat, numeric);
  - which simulation (forward, backward, bisimulation, translation validation).
- Interleaving helps exactly here. Brunmair & Richter 2019 found g=0.42 overall, stronger for similar categories but **negative for unrelated words** [dossier].
- Learners judge blocked study as better even when it is worse (Kornell & Bjork 2008) [dossier].
- The benefit may come from juxtaposing categories, called "discriminative contrast" (Kang & Pashler 2012) [secondary].

**Recommendation.**
- Define 7 confusable sets (§3.4) as `confusable` edges in the KC graph.
- First exposure stays blocked within its lesson.
- From Course 02 on, Desk sessions alternate items within a confusable set (A-B-A-B) across every course started, for at most half of a session. Unrelated KCs are never shuffled together (kernelspace composer rule).
- Serve audit cases interleaved across all started courses.
- Link sibling courses through shared KC ids (B6).

### M7 · Major · The Audit Desk is under-dosed, single-use and blocked by course

**Where.** PLAN L213–236; the §3 case lists.

**Problem.**
- 32 cases cover 12 gap classes. My count from §3 [derived]:
  - about **1** case each for hidden trust (A2.3), granularity (A5.4), test-as-proof (A6.1) and requirement mismatch (A7.3);
  - about 2 each for weak statement, vacuity, wrong kind and bounded;
  - up to about 5 for drift.
- One case fits no class: A1.3, a timeout reported as "no counterexample".
- Inducing a category needs several varied, contrasting exemplars (Kornell & Bjork 2008). Reaching about 80% takes about 7 opportunities (Koedinger 2023).
- Each case is solved once, after which the answer is known, and cases arrive course by course.

**Recommendation.**
- **At least 6 exemplars per class (72 or more)**, from three sources:
  - the 32 authored anchors;
  - generated variants of them;
  - a mutation engine over the learner's own ledger (B3).
- 40–50% of cases sound (C3).
- 2–3 cases a week in the Desk, interleaved. A misclassified class returns in about 3 days.
- Per-class precision/recall appears only once a class has at least 10 cases, with intervals.
- Add two classes: **"inconclusive presented as proof"** (unknown/timeout) and **"induction failure ↔ bug"** (C4).

### M8 · Major · The authoring direction (English → formal) gets no dosed practice

**Where.** Lesson 0.3 has one negation exercise; there are the viva prompts (L289) and the labs. The drills that *are* dosed are Call It (predicting), Goal Replay (reading) and the Audit Desk (reviewing).

**Problem.**
- End-state (a), "state a property precisely", depends on formalising, and so does reviewing agent-written specifications. Formalising is the most error-prone direction:
  - English→LTL was the most error-prone direction in a two-year study, which also published instruments and a code book (Greenman, Saarinen, Nelson & Krishnamurthi 2023, *Programming* 7(2)) [verified].
  - Undergraduates unpacked informal statements into predicate logic in only **8.5%** (simplified) and **5%** (textbook) of attempts (Selden & Selden 1995) [verified].
- Formal-methods teaching tools have converged on auto-graded specification exercises:
  - Alloy4Fun hides secret checks and mines the history of student mistakes (Macedo et al. 2021) [verified].
  - Forge raises expressive power in stages and adds testing features (Nelson et al. 2024) [verified].
- v1 practises *recognising* verdicts far more than *writing* properties.

**Recommendation.**
- **A "Formalize" item family graded by the instruments.**
  - The learner writes a formula, invariant or temporal property.
  - The grader checks equivalence, or implication in the required direction, against the reference: Z3 for state formulas, the explorer for temporal properties on a small model.
  - When the answer is not equivalent, the feedback is the **distinguishing witness** ("your property and the intended one disagree on this state or trace") plus the matching misconception. Greenman's code book seeds the Course 05 distractors.
- **Dose.** At least 8 opportunities per formula family, half in lessons and exit tickets and half in the Desk. The families are:
  - quantifier negation;
  - implication and vacuity;
  - two-state and frame;
  - safety;
  - leads-to;
  - fairness;
  - observer equivalence;
  - refinement.
- **Levels** via the staircase: pick the formula → fix one operator → write it from English.

### M9 · Major · The six-field claim arrives as a template, so the skill is never practised with feedback

**Where.**
- PLAN L91–93 ("many lessons mint claims").
- L585: `content/claims.ts`, "claim templates per lab".
- L598: the `claim` block "mints a claim template".
- L263: rule 3 maps to the claim record, the stamps and the viva rubric.
- Main L120–131: a fully filled card.

**Problem.**
- Rule 3 ("explain every guarantee in six parts") is a *production* skill. Templates turn it into reading: constructive beats passive (Chi & Wylie 2014), and generating beats reading, d=0.40 (Bertsch 2007) [dossier].
- No field is checked, so a wrong bound or a missing assumption earns the same card.

**Recommendation.**
- **Completion fading.**
  - Courses 00–01: the learner writes 2 fields (Assumptions, If-weakened); 4 are pre-filled.
  - Courses 02–04: the learner writes 4.
  - Course 05 on: the learner writes all 6, then aligns them with an expert card (active comparison).
- **Machine checks.**
  - Method and bound must match the receipt (TLC constants, Alloy scope, n, timeout).
  - If-weakened must link to a run that returns REFUTED on the weakened variant.
  - Assumptions must include the facts the instruments detect (an `Int` sort, a no-crash model), or the card stays a draft.
- The Requirement field is always written by the learner.
- The Desk serves "which field is wrong on this card?" items.

### M10 · Major · Labs offer no help at the point of error and no agent guardrails

**Where.** PLAN L153–170 (the Bench). Grepping PLAN finds no hints, no `AGENTS.md` and no no-AI check.

**Problem.**
- The roadmap is 65% building and proving, and the stuck points are Lean goals, TLC configs and SQL histories. v1 offers receipts (pass/fail) and drawers that open after misses.
- Step-level help is the effective form: step-based tutoring d=0.76 vs no tutoring, with answer-based help lower (VanLehn 2011) [dossier]. Learners under-use help (Aleven 2003).
- The learner works with coding agents daily, and Lean is a language in which agents can write proofs. Without an explanation gate and protected files, the labs become agent work:
  - Bastani 2025 and Shen & Tamkin 2026 (above);
  - Sankaranarayanan 2026 (preprint, N=78): 39% failure with an explanation gate vs 77% without, on a task done without AI afterwards [dossier].

**Recommendation.** Port kernelspace H1–H4 (PLAN-100X §5.6):
- **`AGENTS.md`/`CLAUDE.md` in the plinth-lab template**, with a PreToolUse hook on `Edit|Write|Bash|mcp__.*` that fails closed on `TODO(you)` proof files.
- **An explanation gate** before any hint: state the failing goal or check, the invariant, and your hypothesis.
- **Authored hint ladders per lab goal:**
  - R0: teach-back;
  - R1: the concept;
  - R2: which lemma or tactic family;
  - R3: a skeleton with `sorry`;
  - R4: an outline.

  At the bottom of the ladder: a walkthrough, then re-implement after 24 hours or more, credited `assisted`.
- **A Lean error museum** explaining each error conceptually: unsolved goals, type mismatch, "motive is not type correct", "failed to synthesize", omega failures, "simp made no progress".
- **Lab stages** of at most 25 minutes, mapped to checks.
- **A no-AI "Prove it"** after the lab goes green (C2).

### M11 · Major · Placement covers only Course 00, so prior knowledge is ignored elsewhere

**Where.** PLAN L277–278.

**Problem.**
- Learners differ mostly in prior knowledge, not in learning rate (Koedinger 2023). Guidance that helps novices can hurt experts (Kalyuga 2003) [dossier].
- This learner is fluent in Rust, systems-literate, and may have taken tablespace T4 (isolation anomalies, SSI). Yet Courses 06 and 08 (Rust, deterministic simulation, isolation) have no test-out.

**Recommendation.**
- **Per-course test-out:** 3 fresh items per KC at staircase level 3, taken unaided.
- A pass credits the KC `tested-out`, creates its Desk card, and is confirmed by a check on day 7 (kernelspace K3 target: at least 85% confirmed).
- Course pages offer "skip to lab stage N".
- Exported sibling-course logs can pre-seed placement (B6).

### m1 · Minor · Lessons run about 45 minutes, with no segment budget and no short-session lane

**Where.** Lesson L31 ("~45 min"); PLAN has no lesson anatomy.

**Evidence.**
- Segmenting: 56 studies and 88 comparisons, with small-to-medium benefits on retention and transfer and lower cognitive load (Rey et al. 2019) [verified].
- Interpolated tests reduced mind-wandering and improved learning from online lectures (Szpunar, Khan & Schacter 2013) [verified].

**Recommendation.**
- At most 3 segments per lesson, each ≤15 minutes and ending in one retrieval item; resumable at segment boundaries.
- Desk sessions of 10–15 minutes that work on a phone.
- Lab stages of at most 25 minutes.

### m2 · Minor · Erosion is announced, not engaged

**Where.** PLAN L99–104; the Ledger erosion banner (L46–49).

**Evidence.**
- Faced with anomalous data, learners usually ignore, reject, exclude, hold in abeyance, reinterpret or make peripheral changes. Only one of seven responses changes the theory (Chinn & Brewer 1993) [verified].
- Prediction first (Crouch 2004).

**Recommendation.**
- Before each seam test, a Call It: "Which of your claims does this course threaten, and which field?".
- Then the learner restates the original claim **from memory** before the card opens.
- Then they choose restate, strengthen or accept, with a rationale that is logged as KC evidence.

### m3 · Minor · The Derivation Board's drag format does not match the paper derivation the viva asks for

**Where.** PLAN L204–208 (Course 04 only); viva L409.

**Evidence.** Transfer-appropriate processing (Morris, Bransford & Franks 1977) [verified]; step-level help (VanLehn 2011).

**Recommendation.**
- Fade from dragging, to typing the substituted predicate, to deriving the whole WP.
- Grade typed WPs by **Z3 equivalence** with the reference, and return a distinguishing state when they differ.
- At least 8 WP items in Course 04, plus spaced WP items in the Desk through Course 09.

### m4 · Minor · Specimen collecting can become an end in itself, and the label fields are not checked

**Where.** PLAN L139–147.

**Evidence.** Completion-contingent rewards: −0.36, weaker for adults (Deci 1999); active alignment beats display (Alfieri 2013).

**Recommendation.**
- Mounting a specimen requires a learner-written *because* and *cured by*, checked against the run: *cured by* must turn REFUTED into unsat/holds.
- Add a "minimal difference" alignment task between the broken and fixed versions.
- Drawers count understanding (re-found on a fresh variant), not possession.

### m5 · Minor · Notes have the right cadence but thin prompts

**Where.** PLAN L248–250.

**Evidence.**
- Writing-to-learn effects are small on average and larger with metacognitive prompts (Bangert-Drowns, Hurley & Wilkinson 2004 [secondary]; Graham, Kiuhara & MacKay 2020, ES 0.30 [secondary]).
- Actually teaching, by recording a short video lesson, helped delayed comprehension; only *expecting* to teach did not last (Fiorella & Mayer 2013/2014 [secondary]).

**Recommendation.**
- The composer asks, before showing any links:
  1. the model, in three sentences, without looking;
  2. the prediction you got wrong, and why;
  3. what you still can't explain;
  4. one claim you would now stamp differently.
- Links appear after the draft.
- An optional 5-minute "teach it" recording.

### m6 · Minor · The Theater needs scaffolds for novices and automation after hand-play

**Where.** PLAN L189–200; the Theater artboard.

**Evidence.** Novices benefit from examples and experts from reflection (Chernikova 2020); kernelspace W1 (turn cap, skip, Play → Compose → Code).

**Recommendation.**
- The first liveness scene shows a worked lasso.
- A turn cap (about 60) and a skip.
- After one hand-found trace, the learner writes the scheduler policy that finds it.
- The debrief states the principle *after* the comparison (Alfieri 2013).

### m7 · Minor · Inconsistent stamp exemplars teach the wrong category boundaries

**Where.**
- Ledger L70: C5.2, a TLC-checked liveness property under weak fairness, is stamped *Assumed*.
- Elevation L85–87: five bars and an "80%" bucket on a three-level scale.
- Lesson L139: the feedback says "Correct —", against DESIGN §9's voice rule.

**Evidence.** Category learning needs consistent exemplars plus contrast (Kornell & Bjork 2008); transfer-appropriate processing (Morris et al. 1977).

**Recommendation.**
- Teach a **stamp decision table** in Course 00 and lint it with `verify:stamps`: the stamp must be derivable from the receipt plus the Assumptions field.
- Restamp C5.2 as CHECKED (with its bound) and move weak fairness into Assumptions.

### m8 · Minor · No "this will feel harder" framing or self-regulation scaffolds for a 9–18-month solo arc

**Evidence.**
- Active learning feels worse while working better (Deslauriers 2019).
- Learners misjudge interleaving (Kornell & Bjork 2008).
- AI-era gains concentrate in self-regulated learners: g 0.863 vs 0.284 (GenAI meta-analysis 2025) [dossier].

**Recommendation.**
- An onboarding card.
- *Set your week*: minutes, Desk days, desired retention 0.85 or 0.90.
- A welcome-back session after 7 or more idle days (kernelspace wave-1 §6.4).
- A weekly target rather than a daily streak.

---

## 3. Dosage specification (the replacement system)

### 3.1 KC graph

**Size.** About 100 KCs:
- Course 00: 6 · 01: 6 · 02: 10 · 03: 10 · 04: 9 · 05: 10 · 06: 10 · 07: 10 · 08: 8 · 09: 10;
- plus about 5 integrative KCs for Course 10.

**About 25–30 threshold KCs, over-dosed and spiralled:**

| Course | Threshold KCs |
|---|---|
| 00 | quantifier negation; implication and vacuity; state as relation; **invariant vs inductive invariant** |
| 01 | violation search = sat of ¬P; sat/unsat/unknown as statements about a run; the encoding is the claim |
| 02 | propositions-as-types; induction with a generalised hypothesis; kernel trust and axioms; theorem ≠ requirement |
| 03 | stuck vs error states; the scope of progress + preservation |
| 04 | WP by substitution; VC shape and CTIs; the trust stack |
| 05 | safety vs liveness; fairness; scope of bounded checking; granularity |
| 06 | SQL ≠ relational algebra; anomaly ↔ isolation level; R(S,D); what tests establish |
| 07 | enforcement vs noninterference; observer and declassification |
| 08 | commit ≠ send; at-least-once and whose idempotency; crash windows |
| 09 | forward simulation; observational equivalence; the TCB |

**Edges.** `requires` (a DAG check in CI) and `confusable` (the seven sets in §3.4).

### 3.2 Items per KC: acquisition, consolidation, maintenance

- **Acquisition (in the lesson): 3–4 opportunities.**
  - 1 prequestion, for the lesson's 1–2 core KCs;
  - 1–2 diagnostic Call Its;
  - 1 exit-ticket item. Each lesson's ticket has 3 items, at least one constructed (Formalize or a solver-graded derivation). Pass = at least 2 correct, including the constructed one. A miss offers "new variant" or "continue anyway"; nothing locks.
- **Consolidation (first 60 days): at least 4 Desk reviews.** At about 1–3 days, 7 days, 21 days and 45–60 days. This brings each KC to **at least 8 graded opportunities** (Koedinger: median 7.24 to reach 80%).
- **Maintenance.** FSRS at desired retention 0.85–0.90. kernelspace derived 8.9–18.4 graded opportunities per KC in year one at SLO 0.90 (PLAN-100X §1) [derived there]. If FSRS is unavailable, use a fixed ladder of 2 / 7 / 21 / 60 / 120 days; the shape matters less than spacing itself (Latimier 2021).
- **Criterion (successive relearning).** A KC is *settled* after correct, unaided answers on fresh variants in **3 separate sessions**. A miss resets it to about 1 day. Sure-and-wrong items come first in the next session.
- **Cold check.** One probe at 30 days or later turns *settled* into *cured* (B2).
- **Item pool.** A generator (preferred), or at least 4 authored isomorphic variants, so no item repeats within its last 3 reviews (kernelspace wave-1 §6.3).
- **Load and time** [derived, to be timed in use]. 100 cards × about 10 reviews in year one ≈ 1,000 reviews, about 20 a week. That is 5–7 items per session at 3–4 sessions a week, at 1–3 minutes each, giving **10–15-minute sessions, about 40–60 minutes a week**.
  - New cards: at most 5 a week (the arc averages 1.3–2.6 new KCs a week).
  - Debt mode pauses new cards when due work exceeds two sessions.
  - After 7 or more idle days, a 12-minute welcome-back set; the rest of the backlog is spread over 14 days, and no overdue count is ever shown.

### 3.3 Spacing: Re-find becomes a family inside the Desk

- Specimen bug classes have generators, and every item uses a fresh variant (M5).
- Calls on these items count toward Judgment (post-instruction).
- Each course leaves about 3–5 bug-class generators; about 40 specimens become about 35 class generators.

### 3.4 Interleaving plan

- **First exposure** is blocked within its lesson. Interleaving starts after the KC's exit ticket.
- **Seven confusable sets:**
  - **A, what the tool said → which stamp:** Z3 sat/unsat/unknown · Lean kernel-accepted (axioms, `sorry`) · TLC "no error, N states, constants" · Alloy "no instance in scope k" · differential n · runtime CHECK.
  - **B, property kind:** safety · liveness · hyperproperty (NI) · refinement · requirement.
  - **C, gap class:** 12 classes + 2 new ones (M7).
  - **D, anomaly:** lost update · write skew · read skew · serialization failure (shared with tablespace T4).
  - **E, fairness:** none · WF · SF · lasso shapes.
  - **F, encoding:** ℤ · BitVec(64) · Nat · numeric / bigint.
  - **G, correspondence:** forward simulation · backward simulation · bisimulation · translation validation · differential testing.
- **Session rule.** Within a set, alternate A-B-A-B. Interleaved items take at most 50% of a session. Unrelated KCs are never shuffled together.
- **Start.** Set A from Course 02 (once there are two tools). Sets B, C and E from Course 05. Set D from Course 06. Set G from Course 09.

### 3.5 Worked-example fading

- **Ten procedure families** (M4), each with rungs L0–L4.
- 3-up/1-down staircase per (KC, family), converging near 79% (kernelspace wave-1 §5.3).
- Start at L1 after the lesson; placement or test-out starts at L3.
- At least 6 items per family before its Bench stage. Self-explanation prompts at 2–3 structural steps per example (Atkinson 2003).
- Lean completion items are produced by stripping tactics from authored proofs and replacing them with `sorry`, then checked locally (B5).

### 3.6 Audit Desk

- At least 6 exemplars per class (72 or more), 40–50% sound, built as matched pairs.
- 2–3 cases a week, interleaved; a misclassified class returns in about 3 days.
- Per-class metrics only once a class has at least 10 cases, with intervals.
- A blind-strategy lint in CI.

### 3.7 Call It, Judgment and viva

- **Call It:** 2–4 per lesson at diagnostic points, plus the first run of each new query. Free runs are ungated. Scale: guess / think so / sure. A one-line "why" after any miss or guess.
- **Judgment:** post-instruction calls only, shown once there are at least 30, with intervals and a sure-and-wrong list.
- **Viva:**
  - Part A: 6–8 machine-graded fresh items, at least 5 correct including at least one constructed, unaided.
  - Part B: predict your score, explain back, then self-grade.
  - *Set* = A passed + B attempted. *Cured* = a re-viva at 30 days or later, at 80% or better on fresh variants.

### 3.8 Seams

- About 9 seam tests at roughly 2:1 crack to hold, each preceded by a prediction and a restatement from memory (C3, m2).

### 3.9 Help

- Feedback keyed to the misconception after every miss.
- Drawers always open.
- Hint ladders R0–R4 per lab goal, behind an explanation gate.
- A no-AI "Prove it" after green.
- A protected `TODO(you)` (M10).

---

## 4. Bold ideas

1. **The instruments are the item bank and the grader.**
   - Every logical answer the learner writes is graded by checking equivalence or implication with the course's own instruments: Z3 for negations, WPs, VCs and invariants; the explorer for temporal properties; the history checker for anomalies.
   - A wrong answer comes back with the **distinguishing witness**, so the course's core move becomes its feedback channel.
   - Grammar-based generators give unlimited fresh variants, each verified by the instrument in CI (`verify:generators`, extending `verify:calls`).
2. **Set, then cured.**
   - ACI 318-19 §19.2.1.3 bases concrete's specified compressive strength on **28-day** test results (ACI FAQ) [verified].
   - Plinth can borrow this. A course is *set* at Part A of the viva and **cured** when its KCs pass fresh-variant cold checks 30 or more days later.
   - The Elevation draws curing courses hatched and cured courses solid, with no loss framing. It is a Plinth-native version of VRK₃₀, and it doubles as the spacing schedule.
3. **An "Agent of Doubt": a mutation engine over the learner's own ledger.**
   - Gap-class operators produce new audit cases from claims the learner made: drop a hypothesis, add an `axiom`, Int ↔ BitVec, shrink a TLC bound, swap the observer, weaken fairness, split an atomic step, export a different function.
   - Matched sound controls come with each one.
   - The result is personalised, endless and interleaved practice at reviewing coding-agent PRs, on your system's concepts.
4. **Trust as a forecast.**
   - At the Audit Desk the learner states P(sound) for each claim.
   - After 30 or more cases it is scored with a proper rule and shown with intervals and resolution. Confident accepts that were wrong come first, because they are the dangerous ones.
   - Calibrated trust in agent claims is the exact skill end-state (g) names.
5. **Faded proof chains generated from real proofs.**
   - A script strips the last k tactics of authored proofs (and, opt-in, the learner's own past proofs) and replaces them with `sorry`. `lake build` checks completions locally.
   - The path runs Goal Replay → completion → independent → "repair a broken agent proof" (a deliberately wrong tactic sequence to diagnose).
   - No in-browser Lean is needed.
6. **A family-wide KC namespace and a portable review deck.**
   - A local-first `review.json` export/import shared by kernelspace, tablespace, byzantine and Plinth, with `seeAlso` edges.
   - It lets tablespace's write skew interleave with Plinth's SERIALIZABLE and R(S,D), and byzantine's Raft safety with Plinth's safety-vs-liveness items.
   - Sibling evidence can pre-seed test-out. No server, no accounts.
7. **The pedagogy wears stamps too.**
   - The "About this course's assurance" page stamps each *pedagogical* claim. For example, "spacing improves retention: ASSUMED from lab meta-analyses (Cepeda 2008)", and "the Desk keeps your recall ≥ 0.85: TESTED on you, n = …".
   - Within-learner randomized comparisons decide keep or kill, pre-registered in the repo, as in kernelspace §9. Example: KCs randomized to Goal Replay vs faded chains, with a 30-day cold check as the outcome.
   - The course teaches honest claims by making honest claims about itself.
8. **The Defence audits your system.**
   - The final viva uses a set of correctness claims from your system.
   - The learner maps each guarantee to the six fields, finds two gaps, predicts which assumption will crack first, and says whether each sat result is a CTI or a reachable violation.
   - A 30-day follow-up re-asks one prediction.
   - This is a transfer task on the artifact the roadmap exists for.

---

## 5. Keep (supported; do not churn)

- Call It as an idea, with "first call recorded" and `verify:calls`.
- The Theater, including the lasso requirement and granularity as a visible modelling choice.
- Goal Replay as the L0 rung.
- The Audit Desk's target and precision/recall framing, once fixed.
- The six fields, and stamps that cannot render without their qualifier.
- Instruments that state their limits, and receipts that print their TCB.
- Minimise.
- The Deferred Shelf.
- Notes after Courses 02, 05, 07 and 09.
- Seams as a spiral.

---

## 6. Out-of-lens observations (for A1/A2)

- The Lesson artboard pins "Z3 4.15 (wasm)", but Z3 **5.3.1** is current (GitHub `z3-5.3.1`, 2026-10-15; npm `z3-solver` 5.3.1, 2026-10-16) [verified]. Authored `unknown` keys need re-verifying on 5.x.
- IDs disagree between the artboards and PLAN:
  - Elevation shows "2.6 Induction over transfer sequences / C2.4 / s2-ledger"; PLAN has 2.7 / C2.3 / L2 verified-ledger.
  - The Lesson artboard and Main show the overdraft as S1.2; PLAN has S1.1 overdraft and S1.2 double capture.
  - Elevation shows "7 of 12 claims" for Course 02; PLAN lists C2.1–C2.4.
- **Postgres 18 READ COMMITTED.** A concurrent `UPDATE … WHERE balance >= $1` re-evaluates its WHERE clause on the updated row version (PostgreSQL 18.6 docs, *Transaction Isolation*) [verified]. So a lost update needs the *read-then-write across statements* form. Make specimen S6.2, and any Call It keyed to it, specify that form, so the course does not teach that the guarded single statement loses updates.

---

## 7. Sources

**From kernelspace dossiers, verified there** (`kernelspace-100x-evidence/research/*.md`; session working files, not published):
- Kraft 2020 https://doi.org/10.3102/0013189X20912798
- Rowland 2014 https://doi.org/10.1037/a0037559
- Adesope 2017 https://doi.org/10.3102/0034654316689306
- Pan & Rickard 2018 https://doi.org/10.1037/bul0000151
- Cepeda 2008 https://doi.org/10.1111/j.1467-9280.2008.02209.x
- Rawson & Dunlosky 2022 https://doi.org/10.1177/09637214221100484
- Brunmair & Richter 2019 https://doi.org/10.1037/bul0000209
- Kornell & Bjork 2008 https://doi.org/10.1111/j.1467-9280.2008.02127.x
- St. Hilaire 2023 https://doi.org/10.3758/s13423-023-02353-8
- Bertsch 2007 https://pubmed.ncbi.nlm.nih.gov/17645161/
- Kalyuga 2003 https://doi.org/10.1207/S15326985EP3801_4
- van Gog & Sweller 2015 https://doi.org/10.1007/s10648-015-9310-x
- Sinha & Kapur 2021 https://doi.org/10.3102/00346543211019105
- Alfieri 2013 https://doi.org/10.1080/00461520.2013.775712
- Bisra 2018 https://doi.org/10.1007/s10648-018-9434-x
- Chi & Wylie 2014 https://doi.org/10.1080/00461520.2014.965823
- Crouch 2004 https://doi.org/10.1119/1.1707018
- Butterfield & Metcalfe 2001 https://doi.org/10.1037/0278-7393.27.6.1491
- Metcalfe & Finn 2011 https://pmc.ncbi.nlm.nih.gov/articles/PMC3079415
- Metcalfe 2017 https://doi.org/10.1146/annurev-psych-010416-044022
- Wisniewski 2020 https://doi.org/10.3389/fpsyg.2019.03087
- Roediger & Marsh 2005 https://doi.org/10.1037/0278-7393.31.5.1155
- Haladyna 2002 https://doi.org/10.1207/S15324818AME1503_5
- Attali & Bar-Hillel 2003 https://doi.org/10.1111/j.1745-3984.2003.tb01099.x
- Deslauriers 2019 https://doi.org/10.1073/pnas.1821936116
- Deci 1999 https://doi.org/10.1037/0033-2909.125.6.627
- Kulik 1990 https://doi.org/10.3102/00346543060002265
- VanLehn 2011 https://doi.org/10.1080/00461520.2011.611369
- Koedinger 2023 https://doi.org/10.1073/pnas.2221311120
- Chernikova 2020 https://doi.org/10.3102/0034654320933544
- Fincher 2020 https://luce.si.usi.ch/publications/2020-06-01-notional-machines.html
- Mayer 2024 https://doi.org/10.1007/s10648-023-09842-1
- Bastani 2025 https://doi.org/10.1073/pnas.2422633122
- Shen & Tamkin 2026 (preprint) https://arxiv.org/abs/2601.20245
- Sankaranarayanan 2026 (preprint) https://arxiv.org/abs/2602.20206
- Ipeirotis & Rizakos 2026 https://arxiv.org/abs/2603.18221
- Oreopoulos & Low 2026 https://www.nber.org/papers/w35620
- GenAI SRL meta-analysis 2025 https://pmc.ncbi.nlm.nih.gov/articles/PMC12734368/

**Checked this session:**
- Kluger & DeNisi 1996, *Psych Bull* 119:254–284, https://doi.org/10.1037/0033-2909.119.2.254 (abstract: https://pluto.huji.ac.il/%7Emskluger/files/Download/Kluger%20&%20%20DeNisi%20abstract.doc). d=.41; over a third of interventions lowered performance.
- Butler 1987, *J Educ Psych* 79(4):474–482, https://doi.org/10.1037/0022-0663.79.4.474. N=200, grades 5–6; comments > grades or praise.
- Sitzmann, Ely, Brown & Bauer 2010, *AMLE* 9(2):169–191, https://doi.org/10.5465/AMLE.2010.51428542 (full text read). ρ=.34; web .19; gain .00; feedback on accuracy .51.
- Rey et al. 2019, *EPR* 31:389–419, https://doi.org/10.1007/s10648-018-9456-4 (abstract via https://is.tuebingen.mpg.de/publications/rey2018segmenting).
- Atkinson, Renkl & Merrill 2003, *J Educ Psych* 95(4):774–783, https://doi.org/10.1037/0022-0663.95.4.774.
- Greenman, Saarinen, Nelson & Krishnamurthi 2023, *Programming* 7(2):7, https://arxiv.org/abs/2211.01677.
- Nelson et al. 2024, Forge (OOPSLA), https://cs.brown.edu/~sk/Publications/Papers/Published/ngp----forge/.
- Macedo et al. 2021, Alloy4Fun, *SCP*, https://doi.org/10.1016/j.scico.2021.102690.
- Latimier, Peyre & Ramus 2021, *EPR* 33:959–987, https://doi.org/10.1007/s10648-020-09572-8. g=0.74. The expanding-vs-uniform result is [secondary]: https://tipsforteachers.substack.com/p/research-bite-53-a-meta-analytic.
- Rawson & Dunlosky 2011, https://doi.org/10.1037/a0023956 (design only).
- Szpunar, Khan & Schacter 2013, *PNAS* 110(16):6313–6317, https://doi.org/10.1073/pnas.1221764110.
- Aleven et al. 2003, *RER* 73(3):277–320, https://doi.org/10.3102/00346543073003277.
- Kester et al. 2001, *CHB* 17(4):373–391, https://doi.org/10.1016/S0747-5632(01)00011-5.
- Morris, Bransford & Franks 1977, https://doi.org/10.1016/S0022-5371(77)80016-9.
- Selden & Selden 1995, *ESM* 29:123–151, https://doi.org/10.1007/BF01274210.
- Thoma & Iannone 2022, https://doi.org/10.1007/s40753-021-00140-1.
- Mellers et al. 2014, https://doi.org/10.1177/0956797614524255; Hauenstein et al. 2025, *Psych Sci* 36(1), https://doi.org/10.1177/09567976241266481.
- Osterhage 2021, https://doi.org/10.1128/jmbe.00139-21.
- Carpenter et al. 2019, https://doi.org/10.1037/xge0000505.
- Chinn & Brewer 1993, *RER* 63:1–49, https://doi.org/10.3102/00346543063001001.
- Barbieri, Miller-Cotto, Clerjuste & Chawla 2023, *EPR*, https://doi.org/10.1007/s10648-023-09745-1 [secondary for the abstract figures].
- Bangert-Drowns, Hurley & Wilkinson 2004, https://doi.org/10.3102/00346543074001029 [secondary for moderators].
- Graham, Kiuhara & MacKay 2020 [secondary], https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/08/CHU-KR-29_ENG_Graham-2020.pdf.
- Fiorella & Mayer 2013/2014 [secondary], https://dspace.library.uu.nl/bitstream/handle/1874/343127/Gaining.pdf?sequence=1.
- Kang & Pashler 2012 [secondary], via https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00259/full.
- Schultz, Dardik & Tripakis 2022 (CTIs), https://arxiv.org/abs/2205.06360; TLA+ list, https://discuss.tlapl.us/msg06535.html.
- Brier 1950, https://doi.org/10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0.CO;2.
- ACI FAQ on 28-day f′c (ACI 318-19 §19.2.1.3), https://www.concrete.org/frequentlyaskedquestions.aspx?faqid=13.
- PostgreSQL 18 transaction isolation, https://www.postgresql.org/docs/current/transaction-iso.html.
- Z3 releases, https://github.com/Z3Prover/z3/releases; npm `z3-solver`, https://www.npmjs.com/package/z3-solver.
- ts-fsrs 5.4.2 (2026-09-01), https://www.npmjs.com/package/ts-fsrs.
- Willison 2024 on the CORS header [secondary], https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access.

**Unverified:**
- The exact Falchikov & Boud 1989 pooled correlation (not used).
- The Rawson & Dunlosky 2011 "three relearning sessions" recommendation wording (the criterion here rests on Rawson & Dunlosky 2022 and kernelspace F3).
- The Barbieri 2023 moderator details beyond the abstract.
