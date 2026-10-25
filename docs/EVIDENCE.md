# statespace: the learning-science basis

**Status:** public companion to [the spine](spine/SPINE.md). It records the evidence behind the course's learning mechanics, the limits of that evidence, the doses the course commits to, the misconceptions its items are built from, and the rules by which the course will keep or kill its own mechanics. Every ID comes from the spine; where this document and the spine disagree, the spine governs until it is revised, and the disagreement is listed under [Spine issues](#spine-issues). **Date:** 2026-10-24 (machine clock), revised 2026-10-25 for spine revision 3. The owner reviewed the decisions on 2026-10-25 (spine §1.2; DECISIONS.md, section 1).

**Sources, in precedence order.** The roadmap (`research/context/roadmap.md`) sets scope. Executed runs (`research/spikes/RESULTS.md`, `research/evidence/`) beat any report. Then the v2 brief (`research/synthesis/BRIEF.md`, §3 and §4), the pedagogy digest (`research/synthesis/digest-pedagogy.md`) with the other three digests, the learning-science dossiers L1–L4 in `research/reports/` with their verification logs, and the A3 pedagogy review (`research/reviews/A3-pedagogy.md`). kernelspace's evidence appendix and its keep/kill machinery are used for what the predecessor already established.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run that must be recorded before the sentence ships (spine §9.5). `[V]` re-checked against a primary source: on 2026-10-23 by the pedagogy digest, or on 2026-10-24 by this document (Kraft's working paper). `[KS]` taken from kernelspace's verification logs of 2026-10-03 and not re-checked. `[preprint]` a preprint. `[U]` unverified. `[D]` derived arithmetic or design rationale. Untagged literature claims were checked by a dossier or its fact-check pass.

**Grades** follow the pedagogy digest. **A**: a meta-analysis or several consistent RCTs. **B**: one good experiment on a similar task, or a meta-analysis of a distant population. **C**: a small study, a quasi-experiment, correlational or prevalence data, or a preprint. **D**: theory, consensus, design rationale or tool precedent. A grade says how far to trust a finding, not how large it is.

**Contents.** §0 On one screen · §1 Reading effect sizes · §2 Graded evidence · §3 Principles → mechanics · §4 Anti-patterns · §5 Dosage · §6 Misconception catalog · §7 Keep/kill rules · §8 Inherited and new · §9 Corrections · Spine issues.

**Row numbers.** Rows 1–47 of §2 keep the pedagogy digest's numbering, so a citation written `[dp row N]` in the other documents resolves to the same row here. Rows 48–55 are added by this document.

---

## 0. On one screen

1. **Expect tenths of a standard deviation.** Across 1,942 effects from 747 education RCTs the median is 0.10 SD [V]. The effects in §2 come mostly from aligned, researcher-made tests with K-12 or undergraduate samples. They do not add up, and for one adult they mean "more likely than not to help". No copy promises a multiple (spine §2.4).
2. **Every row is graded and tied to the mechanics that use it** (§2). Of the spine's 46 mechanics, 29 rest on outcome evidence for their principle ("Ev"), 16 on precedent only ("Prec"), and one, M-consent, is an owner decision (§3).
3. **Twenty-six anti-patterns are excluded on evidence** (§4), among them every lock, XP for clicks, LLM grading, self-graded sign-off, runtime LLM items, daily counters and loss framing.
4. **Doses are explicit and held by gates** (§5): at least 8 graded opportunities per KC in its first 60 days, FSRS at a target retention of 0.85–0.90, and interleaving only within confusable sets, after the exit item.
5. **Misconceptions are cataloged per stage, with sources** (§6). Every distractor carries one.
6. **The course judges its own mechanics by rules fixed before any data** (§7). With one learner, one comparison is expected to end "not enough data" and the others will rarely be conclusive, so each keeps its evidence-based default unless the data are clear; the rules exist so that nothing is decided after the fact.
7. **Inherited and new** (§8). kernelspace established retrieval, spacing, interleaving, prequestions, honest rewards and guarded AI. statespace adds evidence on reading and writing proofs, counterexamples, specifications, assessment validity, misconceptions in formal notation, and persistence over a 9–18-month solo arc.
8. **Corrections** from the pedagogy digest and the dossiers' fact-checks are applied in place and listed in §9.

---

## 1. How to read the effect sizes

### 1.1 What the numbers are

Most rows in §2 report a standardized mean difference: the gap between two groups' average scores divided by a standard deviation. Cohen's *d* is the plain version; Hedges' *g* corrects it for small samples; a meta-analysis pools many of them. A *d* of 0.50 means the average learner in the treated group scored half a standard deviation above the average learner in the comparison group. Under a normal model the conversions are [D]:

| *d* | The average treated learner scores above this share of the comparison group | Chance that a random treated learner outscores a random comparison learner |
|---|---|---|
| 0.10 | 54% | 53% |
| 0.20 | 58% | 56% |
| 0.50 | 69% | 64% |
| −0.43 | 33% | 38% |

Some rows use other units: percentage points (13 points of leakage in row 27), proportions of learners (give-up rates in row 21), correlations (row 28), reliability coefficients (row 28) or counts. Those are not comparable to *d* and are never converted.

### 1.2 Kraft's benchmarks

Kraft's working paper, re-checked in full text for this document [V], is the course's calibration ([working paper](https://edworkingpapers.com/ai19-10); published as [Kraft 2020](https://doi.org/10.3102/0013189X20912798)).

- **The distribution.** 1,942 effect sizes from 747 RCTs of education interventions with standardized achievement outcomes have a median of 0.10 SD.
- **The benchmarks.** For causal studies of pre-K–12 interventions on achievement, Kraft proposes: below 0.05 is small, 0.05 to below 0.20 is medium, and 0.20 or more is large. The cut points fall near the 37th and 69th percentiles of the distribution.
- **Design shrinks effects.** Studies of more than 2,000 students had a median of 0.03 SD, against 0.24 for studies of 100 or fewer; broad achievement measures had 0.10, against 0.17 for narrow ones; pre-registered RCTs funded by the U.S. Department of Education had a median of 0.03 (139 effects from 49 RCTs).
- **Five guidelines.** (1) Effect sizes from correlational studies are not causal effects. (2) The magnitude depends on what, when and how outcomes are measured: outcomes that are easier to change, proximal to the intervention, measured soon after it and measured precisely give larger effects, and researcher-designed tests give larger effects than standardized ones. (3) Subjective decisions about design and analysis influence effect sizes. (4) Costs matter. (5) Scalability matters.

Tutoring, the usual upper reference, measures about 0.33–0.37 SD, and Bloom's two-sigma result was never replicated ([von Hippel 2024](https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/) [KS]).

### 1.3 Seven rules for reading §2

1. **Most rows are aligned, researcher-made tests.** They come mostly from K-12 and undergraduate samples and are larger than field effects by construction (Kraft's guideline 2). A *g* of 0.50 in §2 is not "five times Kraft's median"; the two numbers answer different questions.
2. **Effects do not add.** Retrieval (row 1), spacing (row 2) and prequestions (row 5) overlap, since spaced retrieval is both of the first two, and they compete for the same minutes.
3. **The population column decides whether a row reaches this learner.** Expertise reversal flips the sign: high assistance helps at low prior knowledge (*d* = +0.505) and hurts at high prior knowledge (*d* = −0.428) (row 9). "It worked for novices" can mean "it hurts here" in the learner's expert KCs (spine §2.1).
4. **The grade is about trust, not size.** Erroneous examples are a small, well-established effect (*g* = .136, A small; row 16); manual mode is a large, weakly established one (48% against 15% in non-equivalent cohorts, C; row 23).
5. **Prefer bias-corrected estimates.** Implementation intentions fell from *d* = .65 (2006) to .15 after correction (2025; row 39); growth-mindset messaging measures *d* = .05, not significant after correction (§4).
6. **Negative and null results are evidence.** Self-explanation prompts added to worked examples had a *negative* effect (row 10); more than a third of feedback interventions lowered performance (row 20). A study with no overall effect is never cited as harm (§9).
7. **For one adult, a row means "more likely than not to help", not a forecast.** The course measures its own effects only on the learner's device, for one learner, with intervals, and makes no population claim (§7; spine §8.9).

### 1.4 How the grades reach the course

- Every mechanic in spine §7 carries its grade and "Ev" or "Prec". Copy says "tenths of a standard deviation at most" and never states a multiple such as "100×" or "two sigma" (spine §2.4).
- SCR-assurance prints what the course cannot establish: unassisted work is self-declared, oracles are visible to a determined learner, Defence Part B has no outcome data, and one learner supports no causal claim (spine §8.9).
- The course's own proportions carry Wilson intervals [D]: 10 of 12 gives 0.55–0.95; 7 of 12 gives 0.32–0.81; 2 of 2 gives 0.34–1.00. Nothing is diagnosed below its minimum n: at least 20 calls in a band, with an interval wholly outside the printed band (spine §8.5), and n ≥ 10 per audit class.
- Proposed for SCR-assurance [D]: a pedagogical claim is stamped like any other claim. "Spacing improves retention" renders as ASSUMED [A] · why: "grade A, mostly verbal material (row 2)". It is never PROVED, and learner-zero's keep/kill results (§7) can add only TESTED [T] · "n units, one learner, descriptive".

---

## 2. Graded evidence table (restricted to what the course uses)

Each row names the technique and the mechanics that use it (spine §7), the effect, the population and boundary that limit it, the grade, and its sources. Rows 1–47 follow the pedagogy digest's §1, with its corrections applied in place (§9); rows 48–55 are added here because the spine cites evidence the digest's table does not hold.

### 2a. Practice, prediction, memory

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 1 | Retrieval with *application* items → M-call-it, M-re-find, M-today; every generator family | *g* = 0.50 against restudy in the lab [KS]; *g* = 0.499 in classrooms (222 studies, 48,478 students); transfer *d* = 0.40, but only with application items [KS] | Restudy beat retrieval in one complex-strategy study (grades 5–6). Whether retrieval helps while constructing proofs and VCs is open | A | [Rowland 2014](https://doi.org/10.1037/a0037559); [Yang 2021](https://doi.org/10.1037/bul0000309); [Pan & Rickard 2018](https://doi.org/10.1037/bul0000151); [Kranz 2024](https://doi.org/10.1080/00220973.2024.2392684) |
| 2 | Spacing → M-today's FSRS scheduler | Spaced against massed retrieval *g* = 0.74; expanding against uniform gaps *g* = 0.034, not significant (29 studies); the best gap is about 5–10% of a one-year retention interval | Mostly verbal material; expanding gaps help only with many exposures | A | [Latimier 2021](https://doi.org/10.1007/s10648-020-09572-8); [Cepeda 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x) |
| 3 | Successive relearning → "signed off" and "settled" (spine §8.6) | Three sessions about 2 days apart, correct items dropped and misses returned up to twice, beat time-matched restudy; exam and long-term retention gains in an authentic course; artificial-grammar production rose at 14 days (N = 119) | Mostly declarative material; one procedural study | B | [Higham 2022](https://doi.org/10.1037/edu0000693); [Rawson 2013](https://doi.org/10.1007/s10648-013-9240-4); [Serfaty & Serrano 2024](https://doi.org/10.1111/lang.12585) |
| 4 | Interleaving only confusables → M-which-is-it; confusable sets A–G (spine §4) | *g* = 0.42 overall, −0.39 for words [KS]; up to 0.65 for memory and 0.66 for transfer when categories differ subtly; eight weeks of interleaved physics homework gave median gains of 50% and 125% on two surprise tests, while students rated it less useful | After first exposure; mainly with prior knowledge | A | [Brunmair & Richter 2019](https://doi.org/10.1037/bul0000209); [Firth 2021](https://doi.org/10.1002/rev3.3266); [Samani & Pan 2021](https://doi.org/10.1038/s41539-021-00110-x) |
| 5 | A prequestion or call before each segment → M-prequestion, M-call-it | *g* = 0.54 on asked content against 0.04 on unasked content [KS]; works after wrong guesses if the answers are then studied; after a failed pretest, immediate feedback beat feedback delayed by 24–48 h; pretests before each of four segments raised 24-hour recall; ChatGPT-written prequestions matched human-written ones; predicting beat evaluating afterwards | Prose and video; no study of formal procedures | A (C for the per-segment placement and for AI-written prequestions) | [St. Hilaire 2023](https://doi.org/10.3758/s13423-023-02353-8); [Mera 2025](https://doi.org/10.5334/joc.455); [Kliegl & Bäuml 2024](https://doi.org/10.1007/s00426-024-02042-8); [Pan 2025](https://doi.org/10.1037/mac0000254); [Brod 2018](https://doi.org/10.1016/j.learninstruc.2018.01.013) |
| 6 | Hypercorrection → M-sure-wrong-returns | High-confidence errors are the most likely to be corrected after feedback, but after a week they return more often than low-confidence errors | Facts and science concepts | B | [Butterfield & Metcalfe 2001](https://doi.org/10.1037/0278-7393.27.6.1491); [Butler 2011](https://doi.org/10.3758/s13423-011-0173-y) |
| 7 | Delayed, cue-only self-judgments → scheduling inputs only (calls adjust FSRS ratings at the edges) | Relative accuracy *g* = 0.93 for delayed against immediate judgments of learning (112 effects, N = 4,554); memory benefit *g* = 0.08 | Delays of minutes, mostly word pairs; asking in a later session is an extrapolation [D] | A | [Rhodes & Tauber 2011](https://doi.org/10.1037/a0021705) |
| 8 | Confidence prompts are reactive → a caution on M-call-it; the comparison considered in §7.4 | Requiring memory ratings put restudy above retrieval in Experiments 1–2 only; in Experiment 3, with no rating, retrieval beat restudy [V]. Reactivity to judgments of learning *g* = 0.054 overall (0.323 for related pairs, 0.384 for lists); on Raven's matrices, ratings helped confident reasoners and hurt unconfident ones | Word pairs; matrices; small experiments, mostly from one group | B/C | [Higham 2023](https://doi.org/10.1007/s10648-023-09809-2); [Double 2018](https://doi.org/10.1080/09658211.2017.1404111); [Double & Birney 2019](https://doi.org/10.3389/fpsyg.2019.02755) |

### 2b. Examples, explanation, comparison

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 9 | Scaffolding set per KC (expertise reversal) → per-KC treatment (spine §2.1); M-layered-feedback's default; M-test-out | High assistance *d* = +0.505 at low prior knowledge and −0.428 at high (176 effects, 60 experiments, N = 5,924) [V]; elaborated feedback raised extraneous load for high-prior-knowledge learners (N = 352) | Asymmetric, so when unsure, help; less clear for younger students and the humanities | A | [Tetzlaff 2025](https://doi.org/10.1016/j.learninstruc.2025.102142); [Huangfu 2026](https://doi.org/10.1111/bjet.70046) |
| 10 | Correct worked examples first → M-goal-replay-fading (rung L0); S1's unfaded, correct-first examples | *g* = 0.48 (43 articles, 55 studies, 181 effects); correct-only sets beat incorrect-only or mixed sets; adding self-explanation prompts produced a *negative* effect against examples without them [V]; in complex professional skills, examples built knowledge but not unscaffolded skill (N = 154) | Mathematics; novices | A | [Barbieri 2023](https://doi.org/10.1007/s10648-023-09745-1); [Rexhäuser 2026](https://doi.org/10.1007/s11412-026-09468-9) |
| 11 | Backward fading with principle prompts on revealed steps → fading families F1–F6 (spine §4) | Backward fading beat forward fading, and fading beat example–problem pairs on near transfer; with principle prompts, medium-to-large near and far transfer at no extra time | Structured mathematics | B | [Renkl 2002](https://doi.org/10.1080/00220970209599510); [Atkinson 2003](https://doi.org/10.1037/0022-0663.95.4.774) |
| 12 | **No prompts on completion blanks** → M-goal-replay-fading (blanks carry no prompt; one principle prompt per revealed step) | Completion requirements impaired proof learning, "especially in combination with self-explanation prompts"; prompts alone helped (2×2, N = 111 student teachers) | Geometry proofs | B | [Hilbert 2008](https://doi.org/10.1016/j.learninstruc.2006.10.008) |
| 13 | One self-explanation unit before S2's proofs → M-self-explanation (S2.L0) | *g* = 0.55 (69 effects from 64 reports); a proof-reading booklet raised comprehension *d* = 0.950 (Experiment 1), and a 15-minute in-lecture version kept its advantage; with learning time controlled, prompts had no effect (N = 128) | Mathematics: small-to-moderate immediate gains, thin retention evidence. License: §9 | A (B for proofs) | [Bisra 2018](https://doi.org/10.1007/s10648-018-9434-x); [Hodds 2014](https://doi.org/10.5951/jresematheduc.45.1.0062); [Beege & Ploetzner 2024](https://doi.org/10.1007/s11251-024-09693-5) |
| 14 | Proof Blocks, after reading → M-proof-blocks; GEN-proof-structure template 2 | No difference at one week (*p* = 0.76) between Proof Blocks (11.1 min), a hybrid (32.1) and written proofs (43.4), N = 332; Proof Blocks without reading gave the smallest gains; distractors trended positive (+9.0 against +5.4 points over a control, both not significant) at about twice the time (19.3 against 10.5 min) | Induction proofs in discrete mathematics; only after reading | B | [Poulsen 2023](https://doi.org/10.1145/3545945.3569797); [Poulsen 2024](https://doi.org/10.1145/3626252.3630831); [Poulsen 2025](https://doi.org/10.1145/3641554.3701787) |
| 15 | Twins (contrasting cases) → M-twins; the audit pool's matched pairs; specimen pairs such as SP-4.3; M-cti-workbench | *d* = .50 [KS], larger when learners seek similarities and the principle comes after the comparison; comparing beat sequential study in CS2 (N = 241) | Comparative prompts suit learners with more prior knowledge | A | [Alfieri 2013](https://doi.org/10.1080/00461520.2013.775712); [Patitsas 2013](https://doi.org/10.1145/2493394.2493409) |
| 16 | Erroneous examples → M-audit-desk | *g* = .136 (42 papers, 177 effects), higher when learners must explain the error [V]; mixed correct and incorrect solutions fostered far transfer only with favorable prior knowledge; no immediate advantage, but *d* = .33 on gains at one week (N = 390), and learners liked the intervention less | Practice of the target skill; needs prior knowledge, so cases follow their lab | A (small) | [Alemdag 2025](https://doi.org/10.3102/00346543251390901); [Große & Renkl 2007](https://doi.org/10.1016/j.learninstruc.2007.09.008); [McLaren 2015](https://doi.org/10.1007/s40593-015-0064-x) |
| 17 | Engage before the reveal → the Audit Desk's first step ("call the statement alone"); Call It before first runs | Judging and attempting the statements first improved understanding of proofs by contradiction and contraposition (medium effect) | n = 87; randomization at group level | C | [Hapipi & Stylianides 2026](https://doi.org/10.1016/j.jmathb.2026.101353) |
| 18 | Linked simultaneous views, learner-paced, with pre-training → INS-theater (trace table beside the state graph); Goal Replay never autoplays; motion only for change (spine §10.2) | Concreteness fading was equivalent to simultaneous linked views (within *d* = ±0.5, N = 187); narrated, animated proofs tied static ones at once but were retained worse at two weeks; contiguity, signaling and pre-training help | One RCT each for the first two findings | A/C | [Lichtenberger 2024](https://doi.org/10.1002/tea.21947); [Roy 2017](https://doi.org/10.1007/s10649-017-9754-7); [Noetel 2022](https://doi.org/10.3102/00346543211052329); [Mayer 2002](https://doi.org/10.1037/1076-898X.8.3.147) |
| 19 | Guided building → labs (predict, run the reference, investigate, build); fail-first only to "invent the check" | Unassisted discovery *d* = −0.38 against explicit instruction, enhanced discovery +0.30; productive failure 0.36 on conceptual outcomes and −0.03 on procedural ones [KS]; project-based learning at university, SMD .116 | Fail-first never for tactic fluency | A | [Alfieri 2011](https://doi.org/10.1037/a0021017); [Sinha & Kapur 2021](https://doi.org/10.3102/00346543211019105); [Zhang & Ma 2023](https://doi.org/10.3389/fpsyg.2023.1202728) |

### 2c. Feedback and help

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 20 | Layered, elaborated feedback → M-layered-feedback | Elaborated feedback 0.49, the correct answer 0.32, right/wrong alone 0.05 (40 studies, 70 effects); elaborated feedback ranked first for recall and transfer (77 experiments); more than a third of feedback interventions lowered performance | Detail adds load for experts (row 9) | A | [Van der Kleij 2015](https://doi.org/10.3102/0034654314564881); [Mertens 2022](https://doi.org/10.1037/edu0000764); [Kluger & DeNisi 1996](https://doi.org/10.1037/0033-2909.119.2.254) |
| 21 | Counterexample feedback with class hints → M-class-hint; probes are one-shot (spine §8.4) | 377 students building DFAs, randomly assigned to binary, counterexample or hint feedback: 394 s per problem with binary feedback, against 245 s (counterexample) and 264 s (hint); give-ups on optional practice 44% with binary feedback, against 27% and 33%; attempts and grade improvement equal; the transfer item at ceiling. The authors warn that students may "treat the counterexample as a special case" | DFAs; process outcomes, not demonstrated learning | B | [D'Antoni 2015](https://doi.org/10.1145/2723163) |
| 22 | Self-explanation with each hint, then an unaided redo → M-hint-ladder (an explanation gate; past R2 the work is assisted until an unseen variant passes) | With error-location hints, students solved 9.12 of 12 tasks against 5.67 without hints; a week later, unhinted, the location-hint group solved 4.84 against 5.95 (not significant) [V]; code hints transferred to a later unhinted task only with self-explanation prompts | 85 BSc students specifying in Alloy; one CS1 study | B | [Cunha 2024](https://doi.org/10.1145/3639474.3640050); [Marwan 2019](https://doi.org/10.1145/3291279.3339420) |
| 23 | Manual mode → M-manual-mode | When a tool automated equational steps, 48% agreed they could finish "without thinking, just clicking randomly", and many inductive steps were left blank on the midterm; with manual steps required, 15% | Non-equivalent cohorts (25 undergraduates; 16 graduate students) | C [preprint] | [Keenan 2026](https://arxiv.org/abs/2608.23309) |
| 24 | Minimize → generalize → near-miss → M-specimen-cabinet; LAB-1.4 (a fix must also kill a non-minimal witness); M-class-hint | An Alloy class shown only minimal (35) or only maximal (25) counterexamples: 28 and 10 abandoned them, and many who stayed fixed only the case shown (full text, read by L2); with explained counterexamples, 9 of 13 engineers fully identified an inconsistent specification, against 4 from raw model-checker output | One-group designs, not counterbalanced | C | [Danas 2017](https://doi.org/10.1007/978-3-319-66197-1_11); [Kaleeswaran 2023](https://arxiv.org/abs/2304.08950) [preprint] |
| 25 | Hidden oracles and distinguishing scenarios → M-spec-duel; GEN-negate-it and GEN-spec-it return a distinguishing state; "unseen, not secret" (spine §8.3) | A misreading shared by a learner's tests and code passes those tests; with hidden correct and buggy implementations, invalid test suites fell from 29.7% to 9.3%; for regexes, LTL and access-control policies, rating distinguishing scenarios was a significant improvement over showing the candidate expressions | Non-randomized cohorts; the second study checks generated candidates rather than teaching | B−/C | [Wrenn & Krishnamurthi 2019](https://doi.org/10.1145/3291279.3339416); [Prasad 2026](https://doi.org/10.4230/LIPIcs.ECOOP.2026.22) |
| 26 | A refutation card after repeated misses → M-refutation-card | A pre-registered meta-analysis of 294 effects found a consistent advantage for refutation texts that moderators did not change [V] | Science; untested in logic, as the LTL catalog's authors caution | A (science) | [Danielson 2024](https://doi.org/10.1080/00461520.2024.2365628) |

### 2d. Assessment validity

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 27 | Structural variety, multiple true/false, item lints → 2–4 structurally different templates per family; GEN-call-it template 4; GATE-items; GATE-generators | Later test-takers gained 13 points from earlier ones when all drew from one parameterized generator, against 2–3 points with pools of 2–4 structurally different problems (425 students); nearly half of students who pick the correct multiple-choice answer misjudge the other options; lures can become false knowledge; keys sit where the options converge; "always pick the longest" passed 58 of 68 kernelspace lessons [KS] | These measure leakage and validity, not learning | B/C | [Chen 2018](https://doi.org/10.1145/3231644.3231664); [Couch 2018](https://doi.org/10.1093/biosci/biy037); [Roediger & Marsh 2005](https://doi.org/10.1037/0278-7393.31.5.1155); [Smith 1982](https://doi.org/10.1111/j.1745-3984.1982.tb00129.x) |
| 28 | Self-grades as practice; many cases, not one oral → the Defence (spine §8.6); a self-grade is [A] | Rubric self-grades correlated with the teacher's at *r* = 0.91–0.94, yet low performers inflated their scores; the lowest performers showed "gross overconfidence" [V]; two 20-minute orals reached an intercase reliability of 0.65, and four orals with two examiners each would reach 0.78 (896 candidates) | Middle school; undergraduates; medical candidates | B | [Sadler & Good 2006](https://doi.org/10.1207/s15326977ea1101_1); [Hacker 2000](https://doi.org/10.1037/0022-0663.92.1.160); [Wass 2003](https://doi.org/10.1046/j.1365-2923.2003.01417.x) |
| 29 | Calibration shown as bias → M-mirror | Calibration feedback cut overconfidence but did not improve discrimination; teaching the content *raised* overconfidence; a forecasting-training module improved Brier scores by 6–11% | Laboratory; forecasters | B/C | [Stone & Opel 2000](https://doi.org/10.1006/obhd.2000.2910); [Chang 2016](https://jbaron.org/journal/16/16511/jdm16511.pdf) |
| 30 | No penalties for credit; certainty-based marking (CBM) as feedback → M-call-it's three bands and payoffs (spine §8.5) | Under penalty scoring, women skipped more questions at equal knowledge; removing penalties on Chile's entry exam narrowed the gender gaps. The two studies share an author and are not independent. CBM is a proper scoring rule with switch points at 67% and 80%; 78% of 49 respondents rated it fair; its reliability gain is [U] | Laboratory; exams | B (C for CBM) | [Baldiga 2014](https://doi.org/10.1287/mnsc.2013.1776); [Coffman & Klinowski 2020](https://doi.org/10.1073/pnas.1920945117); [Moodle CBM](https://docs.moodle.org/311/en/Using_certainty-based_marking); [Smrkolj 2022](https://doi.org/10.3390/ijerph19031706); [Gardner-Medwin](https://www.physoc.org/abstracts/analysis-of-exams-using-certainty-based-marking/) [U] |
| 31 | The LLM is never the grader of record → spine §8.1; I8 | κ = 0.70 against a human 0.75 on short answers; olympiad proof scores inflated by up to about 20×; "substantial disagreement" between LLMs and TAs in a proof course; an autoformalizing tutor found the wrong step in 30% of incorrect proofs | Narrow tasks; mostly preprints | B/C [preprint] | [Henkel 2024](https://arxiv.org/abs/2405.02985); [Petrov 2025](https://arxiv.org/abs/2503.21934); [Mahinpei 2026](https://arxiv.org/abs/2602.23635); [Patel 2025](https://arxiv.org/abs/2506.08321) |
| 32 | Prompts from proof-comprehension facets → GEN-call-it template 4 on theorem statements; GEN-proof-structure | Seven local and holistic question types (meaning of terms, logical status, justification, main idea, modules, transferring the method, illustrating with examples) gave reliable tests | Undergraduate mathematics | C | [Mejía-Ramos 2012](https://doi.org/10.1007/s10649-011-9349-7) |

### 2e. AI while learning

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 33 | Credit only unassisted work → provenance weights (spine §8.2); I1 | Unguarded GPT raised practice scores 48% and lowered the unassisted exam 17%; a hint-only tutor largely mitigated the harm (about 1,000 high-school students). Developers learning a library with AI scored 17% lower on an immediate quiz (*d* = 0.738) and were not significantly faster; high-scoring interaction patterns, such as conceptual inquiry, scored 65–86%, and all low-scoring patterns 24–39% | High school; 52 crowd developers told to finish fast; the second study is a preprint | A−/B | [Bastani 2025](https://doi.org/10.1073/pnas.2422633122); [Shen & Tamkin 2026](https://arxiv.org/abs/2601.20245) [preprint] |
| 34 | An explanation gate; work-anchored review → M-hint-ladder | An AI-blackout task failed for 39% of users behind an explanation gate, against 77% with unrestricted AI (N = 78); AI access raised immediate unaided scores 0.27 SD, with a smaller gain a week later; answer-seeking chatbot use predicted lower midterms while proof-review use did not; prompt training alone produced no learning difference (N = 979) | Preprints; the third study is correlational | C [preprint] | [Sankaranarayanan 2026](https://arxiv.org/abs/2602.20206); [Contractor & Reyes 2026](https://arxiv.org/abs/2607.08849); [Chen 2026](https://arxiv.org/abs/2602.18807); [Xiao 2026](https://arxiv.org/abs/2602.16033) |
| 35 | Calibration measured separately under AI → M-mirror counts only post-instruction, unassisted calls | With AI, performance rose about 3 points while participants overestimated by about 4; higher AI literacy went with less accurate self-assessment | LSAT reasoning; N = 246 plus a replication of 452 | B | [Fernandes 2026](https://doi.org/10.1016/j.chb.2025.108779) |
| 36 | Engagement binds → Today and the Keep block are designed for returning, not for features | 0.06–0.08 SD a year by intention to treat; students asked the tutor for help in only 17% of exercise sessions with a mistake | Middle-school remedial mathematics in 18 Tennessee schools; a distant population | B (distant) | [Oreopoulos & Low 2026](https://www.nber.org/papers/w35620) |

### 2f. Motivation, persistence, transfer, decay

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 37 | Informational rewards; no points and no locks → I5; "signed off" as a belt; competence statements | Expected rewards cut free-choice intrinsic motivation (−.28 to −.40), positive feedback raised it (+.33); gamification was robust only for cognitive outcomes (*g* = .49); perceived competence rose only *g* = .28; self-paced mastery programs "often reduce the completion rates" in college | Mixed populations; college for mastery gating | A | [Deci 1999](https://doi.org/10.1037/0033-2909.125.6.627); [Sailer & Homner 2020](https://doi.org/10.1007/s10648-019-09498-w); [Li, Hew & Du 2024](https://doi.org/10.1007/s11423-023-10337-7); [Kulik 1990](https://doi.org/10.3102/00346543060002265) |
| 38 | Recorded weekly monitoring → M-weekly-review | *d*+ = .40 across 138 RCTs (N = 19,951), larger when progress is recorded and reported | Mostly health behavior | A | [Harkin 2016](https://doi.org/10.1037/bul0000025) |
| 39 | One or two if-then plans; no nudge-only design → M-monthly-retro; the plans in *Set your week* | Bias-corrected *d* = .15 across 642 tests; the academic subgroup's .25 is uncorrected; an uncorrected .19 at 1–6-month follow-ups; plan-making prompts were null across 269,169 MOOC students; accountability-partner prompts were null (N = 1,259; preregistration not stated) [V] | Strong publication bias | A (small) | [Sheeran 2025](https://doi.org/10.1080/10463283.2024.2334563) (*ERSP* 36(1)); [Kizilcec 2020](https://doi.org/10.1073/pnas.1921417117); [Li 2025](https://doi.org/10.24059/olj.v29i4.5215) |
| 40 | A repairable, gain-framed weekly rhythm → M-set-your-week ("met in k of the last 12 weeks", 7-day repair); M-welcome-back | Highlighting an intact rather than a broken streak raised engagement, less so when the streak could be repaired (7 studies); weekly gain-framed streak messages raised practice in a large pupil RCT (effect sizes [U]); rewarding the return after a missed workout topped 54 programs | Consumers; pupils; gym members | B | [Silverman & Barasch 2023](https://doi.org/10.1093/jcr/ucac029); [Aulagnon 2025](https://doi.org/10.1016/j.econedurev.2025.102721); [Milkman 2021](https://doi.org/10.1038/s41586-021-04128-4) |
| 41 | Plan for months and breaks → M-set-your-week (planned at ×1.6, reserve weeks); M-welcome-back; the arc shown as a range | Automaticity took 18–254 days, and one missed opportunity did not matter; only 48.7% finished by their *pessimistic* estimate; in an online master's program a multi-semester hiatus delayed graduation without raising dropout (38% against 39%) | Adults; students | B | [Lally 2010](https://doi.org/10.1002/ejsp.674); [Buehler 1994](https://doi.org/10.1037/0022-3514.67.3.366); [Joyner 2022](https://doi.org/10.1145/3491140.3528283) |
| 42 | "Signed off" as a belt → spine §8.6: large-grained, never revoked, never a gate | In a community of more than 50,000 learners (3,833 retained over a year), belts were "deeply motivating" and earned even "for no credit", while leaderboards grew static at scale [V] | One large community; untested for a solo adult | C | [Nelson 2026](https://doi.org/10.1145/3770762.3772636) |
| 43 | Keep specimens (error management) → M-specimen-cabinet; `broken/` beside `fixed/` | *d* = .44 overall and .80 on structurally different tasks (24 studies, N = 2,183) | Adult software training | A/B | [Keith & Frese 2008](https://doi.org/10.1037/0021-9010.93.1.59) |
| 44 | Near transfer, hugged and bridged → twin labs; M-production-twin; M-overlay; M-sibling-bridge | Far-transfer effects "equaled zero" under placebo and bias controls; workplace transfer tracks perceived utility, realistic training, error management and the chance to perform | Reviews | A/B | [Sala 2019](https://doi.org/10.1525/collabra.203); [Grossman & Salas 2011](https://doi.org/10.1111/j.1468-2419.2011.00373.x) |
| 45 | A keep loop sized to decay → M-lean-keep-alive; the Keep block | Unused, half of accuracy gains were gone by about 6.5 months (13 for speed, 11 for mixed measures); accuracy fell about 0.08 SD a month (1,344 effects) [V] | Procedural skills; proof-skill decay is unmeasured | A | [Tatel & Ackerman 2025](https://doi.org/10.1037/bul0000481) |
| 46 | A value story before each tool → production-twin cards; dated incidents (M-hall-of-records) | Engineers "from entry level to Principal" learned TLA+ from scratch with "useful results in 2 to 3 weeks"; newcomers benefit from hearing the value before tutorials | One company; survivorship | C | [Newcombe 2014](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf) |
| 47 | Oral explain-back; short prompted writes → M-explain-back (Defence Part D); M-notes; claim cards | Teaching after preparing *g* = .56 (preparing alone .35); oral explanation beat written; writing-to-learn 0.22 in a random-effects re-analysis, larger with metacognitive prompts | Students; mostly K-12 for writing | A/B (small) | [Kobayashi 2019](https://doi.org/10.1111/jpr.12221); [Lachner 2021](https://doi.org/10.1016/j.learninstruc.2020.101438); [Bangert-Drowns 2004](https://doi.org/10.3102/00346543074001029) |

### 2g. Added in this document

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 48 | Set expectations → M-feels-harder (Boot and the start of S2) | Students in active-learning sections learned more but felt they learned less [KS] | Undergraduate physics | B | [Deslauriers 2019](https://doi.org/10.1073/pnas.1821936116) |
| 49 | Assess soon after the work → the Defence within a week of its lab (spine §8.6) | When courses were split into modules, a break before the separate final exam "further reduces initial interest in the exams" | openHPI courses; observational | C | [Serth 2022](https://doi.org/10.3389/feduc.2022.1008545) |
| 50 | A dose per KC → ≥ 8 graded opportunities in 60 days (§5) | About 65% correct after instruction, about +2.5 points per practice opportunity, and a median of 7.24 opportunities to reach 80% [KS] | Tutoring datasets; used as an analogy, not a measurement for this learner | B/D (as an analogy) | [Koedinger 2023](https://doi.org/10.1073/pnas.2221311120) |
| 51 | Hours run out before intent → plans at the pessimistic end (§5) | Students study about 5–8 hours a week less than they plan; no intervention moved academic outcomes (about 25,000 students) | University students | B | [Oreopoulos & Petronijevic 2019](https://doi.org/10.3386/w26059) |
| 52 | Range goals and an explicit reserve → M-set-your-week's range target and two reserve weeks per 12; the comparison in §7.3 | A range goal ("2–4 pounds") beat a point goal for re-engagement; an explicit, costly "emergency reserve" was preferred and raised persistence, because people avoided spending it | Goal-pursuit experiments outside education | B | [Scott & Nowlis 2013](https://doi.org/10.1086/670766); [Sharif & Shu 2017](https://doi.org/10.1509/jmr.15.0231) |
| 53 | Show progress, restart at landmarks, keep timing flexible → SCR-week; M-welcome-back's landmark restart; two Bench blocks at self-chosen times | Early in a goal, attention to accumulated progress raised adherence, and late, attention to what remains did; goal pursuit rose after temporal landmarks; paying for gym visits only inside a planned window produced fewer visits than paying for any visit | Consumers; gym members | B/C | [Koo & Fishbach 2012](https://doi.org/10.1086/663827); [Dai, Milkman & Riis 2014](https://doi.org/10.1287/mnsc.2014.1901); [Beshears 2021](https://doi.org/10.1287/mnsc.2020.3706) |
| 54 | Self-assessment is not evidence of learning → a self-grade is [A] (spine §8.1); explain-back stays uncredited | Self-assessed knowledge correlated with learning at ρ = .34 overall, .19 for web-based training and .00 for gains; it tracked motivation and satisfaction more than learning | Training and education studies (meta-analysis) | A | [Sitzmann 2010](https://doi.org/10.5465/amle.9.2.zqr169) |
| 55 | Help always open → drawers always openable (I5); hint ladders behind an explanation gate, not behind failures | Learners under-use on-demand help even though good help-seeking goes with better learning, so help that opens only after failure adds friction where novices most need guidance | Interactive learning environments; reviews | C | [Aleven 2003](https://doi.org/10.3102/00346543073003277); [Kalyuga 2003](https://doi.org/10.1207/S15326985EP3801_4) |

---

## 3. Principles → mechanics

The spine's mechanics catalog (§7) lists each mechanic with its grade. This section reads it the other way: from each principle to the mechanics that carry it. "Ev" means the principle has outcome evidence; "Prec" means the mechanic has precedent only (V2-32).

### 3.1 Principles with outcome evidence

| # | Principle | Rows | Mechanics | Where it acts | Grade · kind |
|---|---|---|---|---|---|
| P1 | Retrieve on fresh application items, spaced over weeks | 1, 2, 50 | M-today, M-re-find, M-call-it; every generator family draws seeds at grade time | Today; lesson exit items; Defence Part A | A · Ev |
| P2 | Count competence by successive relearning, then a delayed fresh probe | 3 | "Signed off" and "settled" (spine §8.6); VRK₃₀ (spine §2.3) | the Defence; Today's settled probes; SCR-mirror | B · Ev |
| P3 | Predict before the reveal, then show the answer at once | 5, 6, 17 | M-prequestion, M-call-it, M-sure-wrong-returns; M-erosion-forecast and M-prove-it extend the move (Prec) | segment openers; first runs of authored cells; erosion events; Defence Part B | A (C for per-segment placement) · Ev |
| P4 | Compare first, interleave after the exit item | 15, 4 | M-twins, M-which-is-it; M-cti-workbench applies the contrast (Prec) | confusable sets A–G; the audit pool's matched pairs; SP-4.3 | A · Ev |
| P5 | Set scaffolding per KC, and help when unsure | 9, 20, 55 | Per-KC treatment (spine §2.1); M-layered-feedback (the misconception note open by default only in novice KCs); M-test-out | every item's feedback; placement and test-out | A · Ev |
| P6 | Correct worked examples, faded backward, with prompts only on revealed steps | 10, 11, 12, 13, 14 | M-goal-replay-fading (families F1–F6), M-self-explanation (S2.L0), M-proof-blocks | S2, S3 and S9 proofs (F1, F2, F6); S4 derivations (F3, F4); S5 actions (F5) | A/B · Ev |
| P7 | Explain the error, name its class, and refute a repeated misconception | 20, 21, 24, 26 | M-layered-feedback, M-class-hint, M-specimen-cabinet (minimize → generalize → near-miss), M-refutation-card | practice feedback; specimens; after two misses on one tag | A/B (C for generalization) · Ev |
| P8 | Help at the point of error, earned by an explanation; keep automation off the taught step | 22, 23, 33, 34 | M-hint-ladder (rungs R0–R4 behind an explanation gate), M-manual-mode; M-stuck-protocol adds a parked goal (Prec) | every lab check; Lean labs; stuck at 25, 45 and 90 minutes | B/C · Ev |
| P9 | Check intent with distinguishing scenarios, not with a learner's own tests | 25, 27 | M-spec-duel; GEN-negate-it and GEN-spec-it (a distinguishing state on every wrong answer); GEN-call-it template 4 (requirement fit); the formalize progression pick → fix → write (V2-26) | S1, S4, S7 | B−/C · Ev |
| P10 | Practice the end-state skill on erroneous examples, with a balanced base rate and typed evidence | 16, 15, 28 | M-audit-desk; GEN-spot-the-gap; the Clearinghouse's incidents (M-docket, Prec) | the Audit Desk; 0–1 case per Today session; Defence Part C | A (small) · Ev |
| P11 | Checkers decide; claims are not evidence | 31, 33, 28, 54 | Provenance weights (spine §8.2); M-defence; I1 and I8 | every credited event | A−/B for the substitution harm; B− for the Defence · Ev |
| P12 | Show calibration as bias, privately, with intervals | 29, 30, 35, 8 | M-mirror; M-call-it's bands, with CBM payoffs as feedback only | SCR-mirror | B/C · Ev |
| P13 | Reward competence and value; lock nothing | 37, 42, 55 | I5; "signed off" as a belt; competence statements from evidence; M-change-cards (errata flag "re-check" and never deduct, Prec) | everywhere | A · Ev |
| P14 | Monitor weekly; plan briefly | 38, 39 | M-weekly-review, M-monthly-retro | SCR-week | A (A small for plans) · Ev |
| P15 | A weekly, repairable, gain-framed rhythm, planned for months and breaks | 40, 41, 51, 52, 53 | M-set-your-week, M-welcome-back | SCR-week; SCR-today | B · Ev |
| P16 | Keep broken examples beside their fixes | 43, 24 | M-specimen-cabinet; M-hall-of-records (dated incidents, Prec) | `broken/` beside `fixed/`; the specimen cabinet's "dated incidents" filter | A/B · Ev |
| P17 | Promise near transfer, and build it in | 44 | Twin labs; M-production-twin, M-overlay, M-sibling-bridge (Prec) | every stage; S10 | A/B for the principle · Prec for the mechanics |
| P18 | Size the keep loop to decay | 45, 2 | M-lean-keep-alive; the Keep block (spine §3.0) | S5–S8 on the default path | A for decay · D for the dose |
| P19 | Tell the value before each tool | 46 | Production-twin cards; dated incidents | each stage's opening | C |
| P20 | Explain to learn; credit only what a checker verifies | 47, 54 | M-explain-back (Defence Part D, required and uncredited); M-notes | the Defence; notes after S2, S5, S7 and S9 | A/B (small) · Ev |
| P21 | Set expectations, and assess soon after the work | 48, 49 | M-feels-harder; the Defence within a week of its lab | Boot; the start of S2; every Defence | B/C · Ev |

### 3.2 Mechanics on design rationale or precedent

These have no outcome evidence of their own. Each is kept as a hypothesis, with the signal in learner-zero's log that would show it failing, read descriptively under §7's reporting rule [D].

| Mechanic | Precedent or rationale | A signal that it is not working |
|---|---|---|
| M-claim-card | roadmap rule 3; generation (row 47) | "if weakened" witnesses keep failing GATE-claims' refutation check after LAB-2 |
| M-assurance-strip | V2-10; requirement-fit is never [P] | GEN-which-stamp template 3 (which strip segment) stays below its stage's sign-off share |
| M-seam-erosion, M-erosion-forecast | prediction before the reveal (row 5) | forecasts of the cracked segment stay at chance across erosion events |
| M-stuck-protocol | Lean Zulip's minimal-working-example norm | a parked goal is not re-found within 14 days, or one lemma is parked twice |
| M-prove-it | kernelspace's no-AI Prove-it; Defence Part B | across stages, Part B's prediction accuracy shows no relation to Part A's (Part B has no outcome data; spine §8.9) |
| M-cti-workbench | contrasting cases (row 15); misconception O3 | CTI-or-reachable items stay below the sign-off share after S4 |
| M-change-cards | kernelspace's change cards | the struck line is still chosen on the card's two retrieval items |
| M-docket | the brief's thin persistent world (V2-25) | incident accuracy within the blind baselines recorded in RUN-docket-baselines |
| M-hall-of-records, M-production-twin | row 46; row 44 | none measured: the course makes no learning claim beyond rows 44 and 46 |
| M-sibling-bridge | link, don't re-teach (V2-31) | sibling-credited KCs fail their 7-day confirmation probes |
| M-telescope, M-pocket-checkers | engineering | no learning claim; the conformance gates hold them |
| M-public-counterexample, M-overlay | optional; private | no learning claim |
| M-consent | OD-6 | no learning claim |

---

## 4. Anti-patterns we will not build

The first seven rows are the hard constraints of BRIEF §3.3. "Held by" names the invariant or gate that keeps each one out.

| # | Anti-pattern | Evidence | Instead | Held by |
|---|---|---|---|---|
| 1 | **Locks:** drawers that open after missed calls, cases unlocked by sign-off, Run gated on every call | Self-paced mastery programs "often reduce the completion rates" in college (row 37, A); learners under-use help, so help that opens only after failure adds friction where novices need it (row 55) | A computed status; drawers, audit cases, lessons and labs always open; Call It only on first runs of authored cells and on generated items | I5; GATE-lessons (no lock copy) |
| 2 | **XP for clicks** | Completion- and engagement-contingent rewards cut intrinsic motivation (−.36 and −.40); gamification is robust only for cognitive outcomes and weakest on competence (row 37); kernelspace's own audit found a keypress paying more than a passed quiz [KS] | Informational feedback; competence statements drawn from evidence | I1; GATE-lessons (no completion without a graded item) |
| 3 | **LLM grading** | Judges inflated olympiad proof scores by up to about 20×; LLMs and TAs disagreed substantially in a proof course; an autoformalizing tutor found the wrong step in 30% of incorrect proofs (row 31); a formalize-then-check grader was lenient with line-by-line descriptions ([Smith & Zilles](https://arxiv.org/abs/2311.14903) [preprint]) | Checkers decide; an agent's assertion renders as quoted UNREVIEWED text | §8.1; I8; GATE-stamps |
| 4 | **Self-graded sign-off** | Low performers inflate self-grades even when *r* = 0.91–0.94 with the teacher; the lowest show "gross overconfidence" (row 28); self-assessed knowledge tracks motivation more than learning (row 54) | The Defence; a self-grade is [A] and earns no credit | M-defence; GATE-stamps |
| 5 | **Runtime LLM items** | The LTL Tutor's authors kept LLMs out because translations must never be wrong ([Prasad 2025](https://doi.org/10.1007/978-3-031-98685-7_9)); LLM-written distractors were valid but "less adept at anticipating" student errors ([Feng 2024](https://arxiv.org/abs/2404.02124)); an LLM asked to randomize picked one case in 6 of 7 exams ([Ipeirotis 2026](https://arxiv.org/abs/2603.18221) [preprint]) | Pure, seeded generators whose keys come from checkers at grade time; LLMs may draft reading prequestions at authoring time only | I3; GATE-generators; GATE-calls |
| 6 | **Daily counters** | Broken streaks lower engagement unless they can be repaired (row 40); one missed opportunity did not affect habit formation (row 41) | "Met in k of the last 12 weeks", graded or Bench work only, with a 7-day make-up | GATE-lessons' copy lint |
| 7 | **Loss framing** | The same evidence (row 40); weekly gain-framed streak messages raised practice (effect sizes [U]); rewarding the return beat the other 53 programs (row 40) | Gain-framed copy; welcome-back sets; never an overdue count | GATE-lessons' copy lint |
| 8 | Progress counted in claims | Substitution harms unassisted learning (row 33) | Evidence from unassisted, checker-graded work on unseen seeds | I1; ledger property tests |
| 9 | A Brier headline from a few dozen calls; 55/75/95 confidence levels on three-way verdicts | 7 of 12 right has a 95% interval of 0.32–0.81 [D]; teaching the content raised overconfidence (row 29); a 55% floor forces overconfidence where chance is 33% [D] | Bias and hit rate per band with intervals; chance printed as 1/k; nothing diagnosed without at least 20 calls in a band and an interval wholly outside the printed band (spine §8.5) | M-mirror; GATE-items |
| 10 | Four sound audit cases in thirty-two | "Reject everything" then scores 87.5% precision and 100% recall [D] | A seeded 30–60% sound share; balanced accuracy | GATE-audit-blind |
| 11 | Completion blanks plus self-explanation prompts | Rows 10 and 12 | Principle prompts on revealed steps only | M-goal-replay-fading |
| 12 | Automation closing the taught step | Row 23 | Manual variants with `grind` and `omega` off; an automated close is a flag on the receipt and the claim, never an event provenance (spine §8.2) | M-manual-mode; spine §8.2 |
| 13 | Teaching "invariant" as "inductive invariant", so `sat` reads as "bug" | Misconceptions G9 and O3 (§6) | A three-way verdict (inductive, CTI, reachable) and the CTI workbench | GEN-cti-or-bug; GATE-items' CTI count |
| 14 | Counterexample-only or minimal-only feedback | Rows 21 and 24 | Class hints; generalize after minimizing | M-class-hint |
| 15 | Answer-giving chat during practice | Rows 33 and 34 | An explanation gate; agent guardrails in every lab | GATE-guardrails |
| 16 | Parameter-only generators; longest-option keys | Row 27 | Two to four structurally different templates; length, convergence and absolute-word lints; blind-strategy CI | GATE-generators; GATE-items |
| 17 | "Due" notes and deadlines | Self-set deadlines did not raise completion ([Bisin & Hyndman 2020](https://doi.org/10.1016/j.geb.2019.11.010)); the classic deadline study was retracted on 2026-09-02 ([notice](https://doi.org/10.1177/09567976261488042)) after a replication found a negligible effect ([Hyndman & Bisin 2026](https://doi.org/10.1177/09567976261460772)) | Windows and a cadence | GATE-lessons' copy lint |
| 18 | Timed Defences | No evidence that timing adds validity; delegation flourished under speed pressure (row 33) | Untimed, over at least two sessions | M-defence |
| 19 | Validating items on simulated learners | LLM "students" correct themselves after any feedback, relevant or not ([Do 2026](https://arxiv.org/abs/2605.12748) [preprint]) | Learner-zero's logs; naive testers for Boot (RUN-boot-firstsuccess) | review checklist |
| 20 | Invented numbers | v1's mock-ups printed tool numbers that no run produced, and executed runs contradicted several of its claims [X RUN-tlc-doublespend, RUN-pg-anomalies] | Every tool number, verdict, flag and version is a recorded run | I4; GATE-numbers; GATE-facts; GATE-runs |
| 21 | Myths: learning styles; growth-mindset messaging; "derring"; forced expanding gaps; forced concrete-to-abstract fading; immersive 3D | No adequate support for learning styles ([Pashler 2008](https://digitalcommons.usf.edu/psy_facpub/1765/) [KS]); mindset messaging *d* = .05, not significant after correction ([Macnamara & Burgoyne 2023](https://doi.org/10.1037/bul0000352)); deliberate erring failed two preregistered replications ([Mera 2025](https://doi.org/10.1037/xge0001707)); expanding against uniform gaps *g* = 0.034 (row 2); fading equivalent to linked views (row 18); immersive VR ES 0.24, small and conditional ([Wu, Yu & Gu 2020](https://doi.org/10.1111/bjet.13023)) | Do not build | review checklist |
| 22 | Promising far transfer; "only 10% transfers" | Far transfer "equaled zero" under controls (row 44); the 10% figure is a "delusion" ([Ford, Yelon & Billington 2011](https://doi.org/10.1002/piq.20108)) | Near transfer, measured: VRK₃₀, twin labs, the private overlay | spine §2.4 |
| 23 | Cohorts, leaderboards and accountability-partner prompts | Accountability-partner prompts were null (row 39); leaderboards grew static at scale (row 42) | Venues at the point of need; an optional respected reviewer of claim cards (OD-9) | OD-9 |
| 24 | Exemplars before a draft; public identity claims | Exposure to exemplary peer work "caused a large proportion of students to quit" ([Rogers & Feller 2016](https://doi.org/10.1177/0956797615623770)); identity intentions that others noticed were acted on less ([Gollwitzer 2009](https://doi.org/10.1111/j.1467-9280.2009.02336.x)) | Exemplars only after the learner drafts; publish artifacts, never identity | M-notes |
| 25 | Penalty-scored credit | Penalties mix risk attitude into scores (row 30) | CBM payoffs shown as feedback only, never as credit | M-call-it |
| 26 | Narrated, autoplaying proof animations | Retained worse at two weeks than static proofs (row 18) | Learner-paced Goal Replay; motion only for change | spine §10.2 |

---

## 5. Dosage targets

The spine's §4.1 is canonical; this table adds the doses the pedagogy digest sets that §4.1 does not repeat, and names the evidence row behind each.

| Dose | Target | Rows | Grade | Held by |
|---|---|---|---|---|
| Study | 6–10 h/week, planned at the pessimistic end (×1.6); the arc shown as a range, never "behind" | 41, 51 | B | M-set-your-week; the spine §3.11 projection |
| Week shape | Two Bench blocks of 90–150 minutes on 2–3 self-chosen days, at any time on those days, plus the Keep block | 41, 53 | B | M-set-your-week; SCR-week |
| Segment | 12–15 minutes, ending in a graded interaction; one tool per session | 5 | D | GATE-lessons |
| New tools | At most one per stage; first contact in the browser. The digest adds a primer of at least 5 minutes before the first full problem (row 18, pre-training); the spine puts it in the opening 5 or more minutes of the first lesson that meets the stage's new tab instrument (Boot exempt), held by the review checklist (spine §4.1, §12 item 59) | 18; kernelspace's top drop-off risk was the first install [KS] | B/D | the stage map's one "New tool" line; GATE-budget |
| KC graph | 105 KCs, 26 of them threshold KCs that spiral, inside the 80–110 band | A3 review; first review digest | D | GATE-kc |
| Per KC | In its first lesson, a prequestion, one or two calls and an exit item; then at least 8 graded opportunities in 60 days, at about 1–3, 7, 21 and 45–60 days | 1, 5, 50 | B/D | GATE-kc; the W1-T08 scheduler property test |
| Maintenance | FSRS at a target retention of 0.85–0.90, or gaps of about 3–5 weeks for a one-year horizon | 2, 3 | A | M-today; W1-T08 |
| Signed off; settled | Fresh items correct in at least 3 spaced sessions (correct items dropped, misses returned at most twice) plus the Defence; settled is a fresh probe correct at least 30 days after the stage's sign-off | 3 | B | spine §8.6; ledger property tests |
| Sure-and-wrong returns | At about 1 day and about 1 week | 6 | B | M-sure-wrong-returns |
| Interleaving | After the exit item; at most half a session; only within one confusable set (A–G) | 4 | A | M-which-is-it; GATE-items |
| Self-explanation | One 15–20-minute unit before S2's proofs (S2.L0); at most one prompt per subgoal | 12, 13 | B | M-self-explanation |
| Worked-example fading | Six families F1–F6 with rungs L0–L4 on a 3-up, 1-down staircase per KC; prompts on revealed steps only, never on blanks | 10, 11, 12 | A/B; D for the staircase | M-goal-replay-fading |
| Proof Blocks | Only after reading; 1–2 distractors; about twice the time budget | 14 | B | M-proof-blocks |
| Audit | 2–3 cases a week; a seeded 30–60% sound share; at least 6 exemplars per gap class; per-class rates only at n ≥ 10 | 16 | A (small); D for the counts | the Keep block; GATE-audit; GATE-audit-blind |
| CTI items | At least 4, interleaved through S9 | A3 review (C4); misconception O3 | D | GEN-cti-or-bug; GATE-items |
| Defence | About 85 minutes (Parts A–D), untimed, over at least two sessions within a week of the lab | 1, 28, 47, 49 | B− | M-defence; spine §8.6 |
| Claims | Two by about week 4; never more than 2 weeks without a new claim or specimen | proximal subgoals helped children's competence and interest ([Bandura & Schunk 1981](https://doi.org/10.1037/0022-3514.41.3.586)) | C/D | GATE-budget's claim-cadence check |
| Writing (15%) | Short prompted writes; a 600–1,000-word note after S2, S5, S7 and S9 | 47 (writing-to-learn) | A (small) | M-notes |
| Plans | One or two if-then plans, re-prompted at stage start, month start and re-entry | 39 | A (small) | M-monthly-retro |
| Monitoring | A 5-minute weekly review; a 15-minute monthly retro | 38 | A | M-weekly-review; M-monthly-retro |
| Rhythm | "Met in k of the last 12 weeks" (target 8 or more), graded or Bench work only; a 7-day make-up; two reserve weeks per 12; declared breaks pause the window | 40, 52 | B | M-set-your-week |
| Re-entry | A welcome-back set after 7 or more idle days; "Back at the bench" (20–30 minutes) after 14 or more; a landmark restart after 6 weeks or more; never an overdue count | 40, 41, 53 | B | M-welcome-back |
| Keep block | Computed from logged item times; planned at 45–75 min/week at 6 h/week and 60–105 min/week at 10 h/week (spine §3.0; §12, item 25); Today runs 10–12 minutes, 3–5 times a week, inside it | 2, 45 | D | GATE-budget's Keep-load check |
| Lean keep-alive | 20–30 minutes every 2–3 weeks while Lean is idle, once S2 is signed off; its own Keep session, never part of Today | 45 | A for decay; D for the dose | M-lean-keep-alive; W3-T13 |

**Why the Keep block grew.** The digest sized it at about 30 minutes a week and the brief at 30–40, both on the basis "KCs × about 10 reviews × about 2 minutes". For the spine's 105 KCs that basis already gives about 35 hours over the arc before audit cases, Clearinghouse incidents, reviews and the keep-alive, so the spine computes the block instead and plans 45–75 minutes a week at 6 h/week (spine §12, item 25) [D]. Logged item times replace the estimate after each wave.

---

## 6. Misconception catalog by stage

The catalog seeds distractors, specimens, refutation cards and audit cases. It is the pedagogy digest's §2, mapped onto the spine's stages and IDs.

### 6.0 How to read and use it

- **IDs.** Each entry keeps the digest's ID: a letter for its family and a number. Three of these collide with other names in the course: misconception G1–G9 with gap classes G1–G13, misconception S1–S4 with stages S1–S10, and misconception Z3 with the solver. So in item metadata, in the stage specs and in prose outside this section, a misconception is written with the `dp:` prefix the curriculum specs already use (`dp:G4`, `dp:Z3`). Inside this section's tables the bare ID is unambiguous. The spine's ID table registers this form, `dp:{catalog key}`, from this section, §6.11's proposed entries included; GATE-links resolves every `dp:` key against the registry W0-T03 generates from it. ASSESSMENT.md's kebab tags (`mis:only-if-converse` for dp:G1, `mis:ih-not-generalized` for dp:L5) are descriptive aliases, mapped to these keys in its Appendix A.
- **Distractors.** Every option of a generated or authored item carries a catalog ID and a "why". A distractor is a conceptual mutant of the key, checked by the family's engine as distinct from the key and from every other option, never a random wrong answer (spine §8.3; GATE-items).
- **Formalization.** Vary the English wording, and weight English → formula items, because that direction fails about twice as often (dp:T4). Temporal items ask for one satisfying and one violating trace.
- **Repeated misses.** Two misses on one ID bring a refutation card that names and refutes the misconception (M-refutation-card; row 26).
- **"—" means no learner study.** The entry is logged through Call It and kept only if it draws errors (§6.11).
- **Validation.** Items are never validated on LLM-simulated learners, which "correct" themselves after any feedback ([Do 2026](https://arxiv.org/abs/2605.12748) [preprint]).
- **Entries read:** the misconception, then its seed or specimen in the course; where it lives (spine IDs); the evidence and its grade. Source keys resolve in §6.12. Tool behavior cited in a seed is a recorded run.

### 6.1 Ground (taught in S1 through drawers D-01–D-06)

The digest's "Stage 0" has no stage of its own in v2: its ground skills are taught in S1 through drawers D-01–D-06 (spine §4), and two entries reach later stages (G8 in S2 and S6, G9 in S4).

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| G1 | "P only if Q" read as Q → P or as P ↔ Q → "a transfer is allowed only if balance ≥ amount" | KC-1.only-if-direction; GEN-negate-it template 4 ("only if", "unless"); D-02 | BP08: "only if" produced 75.43% of the biconditional-for-conditional errors among 148,681 wrong translations (C) |
| G2 | The antecedent follows English word order → one rule written in both word orders | KC-1.only-if-direction; GEN-negate-it template 4 | BP08: reversals ran 66% when formula order departs from English word order, against 43% when it follows it (C) |
| G3 | → and ↔ swapped; "unless" and "provided" mistranslated → "refund unless the hold was captured" | KC-1.only-if-direction; GEN-spec-it | BP08: of the biconditional-for-conditional errors, 10.14% came from "unless" and 6.54% from "provided" (C) |
| G4 | A false antecedent read as "irrelevant" → a guard that never fires: does "every allowed transfer conserves" hold? | KC-1.implication-vacuity, KC-1.non-vacuity-check; SP-1.6; AUD-1.1 (gap class G2); D-02 | AI13: mathematics students' conditional reasoning moved toward treating false-antecedent cases as irrelevant (C) |
| G5 | A negation fails when the correct negation sounds implausible → negate "every hold is eventually released" | KC-1.quantifier-negation; GEN-negate-it; D-03 | AP05: where the correct negation clashed with plausible content, about 45% still failed after a logic course (C) |
| G6 | An informal claim not unpacked into quantifiers → "balances never go negative" as ∀ reachable states, ∀ accounts | KC-1.quantifier-negation; GEN-spec-it; D-03, D-04 | SS95: unpacking succeeded in 8.5% (simplified) and 5% (textbook) of attempts (C) |
| G7 | "If–then" read as "and"; "iff" read one way; proof by incomplete enumeration → two rows of the 3-bit transfer table "prove" a claim | KC-1.only-if-direction; D-01, D-02 | HKLZ08: think-alouds, n = 7 (D) |
| G8 | Empirical or authoritarian conviction → "20,000 runs passed"; "Lean accepted it" | D-01; KC-2.kernel-not-requirement; KC-6.differential-testing; gap class G11; misconception X1 | HS98: empirical and external proof schemes (C) |
| G9 | "Invariant" equated with "inductive invariant" → the 2×2 of invariant × inductive | KC-4.invariant-vs-inductive; S4.L4; M-cti-workbench; misconception O3 | A3 review (C4); LAM18; SDT22 (D) |

### 6.2 S1 Counterexample (Z3)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| Z1 | `sat` read as "the property holds"; `unsat` read as "safe" without a non-vacuity check → "unsat, therefore safe" over contradictory premises | KC-1.three-answers, KC-1.non-vacuity-check; SP-1.6 {{run:RUN-z3-vacuous-unsat}}; AUD-1.1; the interpretation tap (spine §8.4) | — (nearest evidence: G4) |
| Z2 | `unknown` or a timeout read as "no bug" → a reason-stable `unknown`: `x**y == 8, y > 1` returns "incomplete (theory arithmetic)" [X RUN-z3-unknown-pow]; in the tab a `timeout` never fires while `rlimit` cancels [X RUN-z3-budget-pyodide] | KC-1.unknown-fails-closed; SP-1.7, SP-1.8; AUD-1.3 (gap class G5) | — |
| Z3 | The model taken as *the* bug rather than one witness of a class | KC-1.witness-class; M-class-hint; LAB-1.4 (a fix must also kill a non-minimal witness) | D17 (C) |
| Z4 | `Int` assumed to cover `i64` → in signed BitVec 64 the guarded sender is `unsat`, but the recipient wraps: B = 9223372036850581504 receiving X = 4194304 [X RUN-z3-bv64] | KC-1.encoding-is-the-claim; SP-1.4; CL-1.5; AUD-1.2 (gap class G4) | — (the behavior is a recorded run; no learner study) |
| Z5 | Misconceptions G1–G3 and wrong operators carried into the encoding | GEN-negate-it's pick → fix → write progression (V2-26) | BP08; JS24 (C) |

The roadmap's starter prints its own answer, so S1.L1's first scored call is a generated variant (V2-05).

### 6.3 S2 Proof (Lean)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| L1 | "Programming isn't proving"; the syntax barrier | KC-2.props-as-types; S2.L2; D-07; M-feels-harder | IT23 (C/D) |
| L2 | `simp`, `omega` or `decide` closes the step being taught | KC-2.automation-scope; M-manual-mode; the `automated` flag on receipts and claims, never an event provenance (spine §8.2) | KK26 (C) [preprint] |
| L3 | Kernel acceptance taken to mean the requirement is met (gap class G12) → a true theorem every checker accepts that misses the intent | KC-2.kernel-not-requirement; S2.L10; SP-2.9 {{run:RUN-lean-intent}} | HS98; MZJC25 (C/D) |
| L4 | Cannot say what a theorem proves | KC-2.theorem-statement-reading; S2.L5 (GEN-call-it template 4) | MR12; IA12 (C) |
| L5 | The induction hypothesis is not generalized → `run_conserves` needs `generalizing s` [X RUN-lean-ledger] | KC-2.generalized-ih; SP-2.3 {{run:RUN-lean-ih-ungeneralised}}; fading family F1 | — (the proof is a recorded run; no learner study) |
| L6 | The base case seen as optional; the inductive step seen as circular | KC-2.induction-principle; the circular distractor in S2.L4's Proof Blocks | P06; K26 (C/D) |
| L7 | "Self-transfer obviously conserves" → computing both balances from the old state mints money: `xferBuggy (fun _ => 10) 0 0 5 0 = 15` by `decide` [X RUN-lean-selftransfer] | KC-2.finite-map-update; SP-2.1 | LK24 (C) |
| L8 | "Any axiom means unsound", or "no `sorry` means nothing is trusted" → conservation's `#print axioms` lists only `[propext, Quot.sound]` [X RUN-lean-ledger], while `grind` adds `Classical.choice` and a native computation adds a `_native` axiom [X RUN-lean-axioms] | KC-2.axioms-and-trust; SP-2.4, SP-2.5, SP-2.6, SP-9.5; AUD-2.2 (gap class G6a), AUD-2.3 (G6c) | LEANVP (D) |

### 6.4 S3 Semantics

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| S1 | Aliasing intuitions carried over from the host language | KC-2.finite-map-update, KC-3.edge-cases-as-decisions; SP-2.1 | LK24 (C) |
| S2 | `Nat` balances cannot overdraw → `Nat` subtraction truncates at 0 and hides the overdraft | KC-3.nat-truncation; SP-3.3 {{run:RUN-lean-nat-trunc}}; SEAM-6; ER-6; AUD-3.2 (gap class G4) | LEANNAT (D); no learner study |
| S3 | → written for ↔ in typing or guard rules; local state shared across calls | KC-3.typing-judgment | G3; SMK21 (C) |
| S4 | Progress plus preservation taken to imply the business invariant | KC-3.progress-preservation-scope; S3.L5; CL-3.1, CL-3.2 | — |

### 6.5 S4 Obligations (Hoare logic, weakest preconditions, VCs)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| O1 | Invariant notation: wrong quantifier bounds, off-by-one | KC-4.vc-shape; GEN-spec-it (postcondition with frame) | M10 (C) |
| O2 | An invariant that is incomplete, too strong or missing a relationship | KC-4.invariant-vs-inductive; GEN-cti-or-bug | M10 (C) |
| O3 | A counterexample to induction read as a reachable bug → three verdicts: inductive; CTI (strengthen the invariant); reachable (fix the command) | KC-4.cti-or-bug; S4.L6; M-cti-workbench; SP-4.3 {{run:RUN-z3-cti-pair}}; AUD-4.3 (gap class G13) | A3 review (C4); LAM18 (—: no learner study) |
| O4 | Weakest-precondition substitution done backwards or with variable capture; a missing frame condition | KC-4.wp-assignment, KC-4.capture-avoiding-substitution, KC-4.frame-condition; SP-4.1, SP-4.2; AUD-4.1 | — |
| O5 | Partial and total correctness confused; a vacuous VC; a solver bug confused with a VC-generator bug | KC-4.hoare-triple, KC-4.trust-stack; SP-4.4, SP-4.5; S4.L8 | — |

### 6.6 S5 Time (TLA+, concurrency, liveness)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| T1 | An implicit "always" or "eventually" | KC-5.temporal-operators | GSNK22; LTLT: an implicit "always" accounted for 28.68% of wrong answers (C) |
| T2 | "Until" read as weak-until. TLA+ has no until operator, so this arises when an English "until" is formalized [D] | KC-5.temporal-operators | GSNK22: 9 of 11 in one round (C) |
| T3 | "Resolves exactly once" written as an eager "eventually" | KC-5.safety-vs-liveness, KC-5.holds-lifecycle | GSNK22 (C) |
| T4 | English → formula fails about 47% of the time, against 23–24% for formula → English, so authoring items are weighted toward English → formula | GEN-spec-it; GEN-negate-it template 4 | GSNK22 (C) |
| T5 | "No error found" taken as proof for all sizes → TLC's "no error" on the atomic transfer covers the 4 distinct states it explored with two workers [X RUN-tlc-atomic]; SP-5.6 is clean at two workers and violated at three {{run:RUN-tlc-n3-only}} | KC-5.bounded-scope; S5.L8, S5.L9; AUD-5.3 (gap class G5) | — (the behavior is a recorded run) |
| T6 | Trace length is ambiguous → the double spend is 5 states and 4 actions; with default flags TLC stops at "Deadlock reached" after 10 distinct states, and the violation appears only with `-deadlock` [X RUN-tlc-doublespend]. Stems name the unit and the argv | KC-5.tlc-flags-matter; SP-5.2; GEN-call-it template 2 | — (the behavior is a recorded run) |
| C1 | Sequential consistency assumed | KC-5.interleaving-granularity | SMK21; K01 (C) |
| C2 | A lock serializes the whole function, or stops all threads | KC-5.interleaving-granularity | SMK21 (C) |
| C3 | "Add a lock" fixes an order violation | KC-5.interleaving-granularity, KC-6.compilation-pattern | L08: 73% of non-deadlock bugs were not fixed by adding or changing locks, and 92% were triggered by the order of at most four memory accesses (C) |
| C4 | "Correct most of the time" is good enough | KC-5.bounded-scope; SP-5.1 | SMK21 (C) |
| C5 | Safety and liveness swapped | KC-5.safety-vs-liveness; GEN-lasso-or-not; AUD-5.1 (gap class G3) | — |

### 6.7 S6 Correspondence (PostgreSQL)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| Q1 | `= NULL`, or `IS`, treated as equality | KC-6.sql-not-algebra; S6.L1 | KOLI23: in 28% of answers (C); T22 (C) |
| Q2 | `CHECK (bal >= 0)` assumed to forbid a missing balance → it accepts NULL [X RUN-pg-anomalies] | KC-6.null-guards; SP-6.1 | PGC (D); the behavior is a recorded run |
| Q3 | A NULL balance assumed to fail the guard visibly → `WHERE bal >= 10` silently skips the row [X RUN-pg-anomalies] | KC-6.null-guards; SP-6.1 | the behavior is a recorded run |
| Q4 | The isolation level alone decides whether a transfer loses an update → at READ COMMITTED an application read-modify-write spends 160 from 100, while a conditional UPDATE re-evaluates its WHERE clause and loses nothing [X RUN-pg-anomalies] | KC-6.compilation-pattern; SP-6.2, SP-6.6; S6.L6 | PGI (D); the behavior is a recorded run |
| Q5 | "REPEATABLE READ prevents everything" → under write skew both transactions commit and the team total reaches −100, while SERIALIZABLE aborts one with 40001 [X RUN-pg-anomalies] | KC-6.anomaly-isolation; SP-6.3 | PGI (D); the behavior is a recorded run |
| Q6 | A database integer assumed to behave like the model's integer or the host language's → PostgreSQL raises 22003, so the model takes a step the database refuses [X RUN-pg-anomalies, RUN-pg-claims] | KC-6.overflow-refusal; SP-6.4; ER-1 | PGN (D); the behavior is a recorded run |
| Q7 | SERIALIZABLE retries always terminate; differential tests count as proof | KC-6.serializable-retries (CL-6.5 is [A]); KC-6.differential-testing; AUD-6.1 (gap class G11) | — (see G8) |

### 6.8 S7 Secrecy (authorization and information flow)

| ID | Misconception → seed | Where it lives | Evidence |
|---|---|---|---|
| A1 | `in` (subset) used where overlap was meant; vacuously true on the empty set | KC-7.policy-checking; the S7 Defence's "`in` where overlap was meant" mutant | JS24: wrong operators were the most common error in 97,755 novice Alloy models, which include submissions from outside classrooms (C) |
| A2 | Extra quantifiers; a constraint set at the level of the whole set instead of per principal | KC-7.policy-as-datalog; GEN-spec-it (policy template) | JS24 (C) |
| A3 | Fixing only the instance shown | KC-1.witness-class; M-class-hint; LAB-7.c2's fresh generated worlds | D17 (C) |
| A4 | Enforcement mistaken for noninterference | KC-7.enforcement-vs-ni; S7.L5 | — |
| A5 | A policy accepted without a distinguishing request | KC-7.policy-checking; S7.L3; LAB-7.c3; M-spec-duel | PAFK26 (B−); WK19 (C) |
| A6 | A small scope read as unbounded; revocation assumed to "erase" what was disclosed | KC-7.small-scope, KC-7.revocation-past; SP-7.3; LAB-7.6 | — |

### 6.9 S8 Effects

No learner studies exist for this stage; every entry is "—".

| ID | Misconception | Where it lives | Evidence |
|---|---|---|---|
| E1 | "The outbox gives exactly once" | KC-8.at-least-once; AUD-8.1 (gap class G7) | — |
| E2 | A fresh idempotency key on every retry | KC-8.idempotency-keys; SP-8.3 | — |
| E3 | The acknowledgement always arrives, or liveness is checked with crashes switched off | KC-8.progress-needs-recovery; SP-8.6; ER-8 | — |
| E4 | The provider's idempotency left outside the trusted base | KC-8.provider-horizon; CL-8.2; SEAM-12; SP-8.5 | — |

### 6.10 S9–S10 and the Audit Desk

| ID | Misconception | Where it lives | Evidence |
|---|---|---|---|
| P1 | The observer ignores aborts; the direction of simulation is confused | KC-9.observations, KC-9.simulation-kinds; SP-9.3; AUD-9.1 (gap class G10) | — |
| P2 | Lean skill assumed to transfer to informal proof without fading | M-goal-replay-fading; Defence Part D; S2's completion test (explain the induction without reciting tactics) | BK18: the transfer's difficulty "is extremely underestimated" (D) |
| P3 | Compiler, command and runtime claims conflated | KC-9.three-claims; S9.L9 | — |
| X1 | A test or a bounded check presented as proof | gap classes G5 and G11; GEN-which-stamp; AUD-1.3, AUD-5.3, AUD-6.1 | see G8 (C) |
| X2 | Surface reading taken for validation | the Audit Desk's steps 3 and 5 ("This proves: ___"; typed evidence) | NE25 (C); IA12 |
| X3 | Rejecters are overconfident; accepters do not update | the seeded 30–60% sound share; M-mirror; GATE-audit-blind | IN13 (C) |
| X4 | Verified code for the wrong specification; a specification, its tests and its code sharing one misreading | gap classes G12 and G8; AUD-2.1; M-spec-duel | MZJC25; WK19 (C) |
| X5 | Frequent AI use goes with weaker detection of hallucinated solutions | KC-10.agent-proposal-triage; I8 | DO26 (C, correlational) |

### 6.11 Proposed extensions and the promotion rule

The stage specs propose further entries, each marked "—", in their own ranges: `dp:Z6`–`dp:Z7` (S1), `dp:L9` (S2), `dp:S5`–`dp:S14` (S3), `dp:T7`–`dp:T16` (S5), `dp:Q8`–`dp:Q15` (S6), `dp:A7`–`dp:A15` (S7), `dp:E5`–`dp:E11` (S8), `dp:P4`–`dp:P6` (S9) and `dp:X6`–`dp:X9` (S10). The drawers spec proposes `dp:G10`–`dp:G11`, and ASSESSMENT.md proposes `dp:Q16`, `dp:A16` and `dp:A17` (its Appendix A). Each proposing document owns its wording until an entry is promoted here. The rule [D]:

- **Promotion.** A proposed entry joins this catalog when a published study documents it (cited with a grade) or when learner-zero's log shows it drawing errors: its option chosen in at least three wrong answers, in at least two sessions.
- **Dormancy.** An entry marked "—" whose options draw no wrong answer within 60 days of its KC's first lesson becomes dormant: its distractors are rewritten, and the dormancy is logged. Entries with a published source never go dormant on one learner's data.
- **Reversibility.** Learner-zero wrote many of the items, which biases them toward drawing no errors, so dormancy is provisional and never deletes an entry.
- **Numbering.** A new entry takes the next free number in its family; a family's letter never changes.

### 6.12 Source key

| Key | Reference | Link |
|---|---|---|
| BP08 | Barker-Plummer, Cox, Dale & Etchemendy, CogSci 2008 | [escholarship](https://escholarship.org/uc/item/66k15611) |
| HKLZ08 | Herman, Kaczmarczyk, Loui & Zilles, ICER 2008 | [doi](https://doi.org/10.1145/1404520.1404527) |
| AI13 | Attridge & Inglis, *PLoS ONE* 2013 | [doi](https://doi.org/10.1371/journal.pone.0069399) |
| AP05 | Alacaci & Pasztor, CogSci 2005 | [escholarship](https://escholarship.org/uc/item/557238g2) |
| SS95 | Selden & Selden, *Educational Studies in Mathematics* 1995 | [doi](https://doi.org/10.1007/BF01274210) |
| HS98 | Harel & Sowder 1998, definitions as quoted in Nardi et al. 2023 | [doi](https://doi.org/10.1080/14794802.2023.2261435) |
| IA12 | Inglis & Alcock, *JRME* 2012 | [doi](https://doi.org/10.5951/jresematheduc.43.4.0358) |
| MR12 | Mejía-Ramos et al., *Educational Studies in Mathematics* 2012 | [doi](https://doi.org/10.1007/s10649-011-9349-7) |
| P06 | Polycarpou, ACM SE 2006 | [doi](https://doi.org/10.1145/1185448.1185579) |
| K26 | Khera et al., ASEE 2026 (a work in progress; its induction misconceptions summarize the literature) | [ASEE](https://nemo.asee.org/public/conferences/374/papers/51752/view) |
| NE25 | Neuhaus-Eckhardt et al. 2025 | [doi](https://doi.org/10.1007/s10763-025-10621-3) |
| IN13 | Inglis et al., *Topics in Cognitive Science* 2013 | [doi](https://doi.org/10.1111/tops.12019) |
| IT23 | Iannone & Thoma 2023 | [doi](https://doi.org/10.1080/0020739X.2023.2178981) |
| KK26 | Keenan, Kheterpal, Jeannin & Omar 2026 [preprint] | [arXiv](https://arxiv.org/abs/2608.23309) |
| MZJC25 | Mugnier, Zhou, Jhala & Coblenz, *PACMPL* (OOPSLA2) 2025 | [doi](https://doi.org/10.1145/3763181) |
| BK18 | Böhne & Kreitz, EPTCS 267, 2018 | [doi](https://doi.org/10.4204/EPTCS.267.1) |
| M10 | Mannila 2010 | [ERIC](https://files.eric.ed.gov/fulltext/EJ1064303.pdf) |
| LAM18 | Lamport, *Using TLC to Check Inductive Invariance*, 2018 | [pdf](https://lamport.azurewebsites.net/tla/inductive-invariant.pdf) |
| SDT22 | Schultz, Dardik & Tripakis 2022 | [arXiv](https://arxiv.org/abs/2205.06360) |
| LK24 | Lu & Krishnamurthi 2024 (the SMoL Tutor) | [doi](https://doi.org/10.1145/3649823) |
| JS24 | Jovanovic & Sullivan 2024 | [arXiv](https://arxiv.org/abs/2402.06624) |
| GSNK22 | Greenman, Saarinen, Nelson & Krishnamurthi, *Programming* 7(2), 2022 | [doi](https://doi.org/10.22152/programming-journal.org/2023/7/7) |
| LTLT | Prasad, Greenman, Nelson & Krishnamurthi, CAV 2025 (the LTL Tutor) | [doi](https://doi.org/10.1007/978-3-031-98685-7_9) |
| D17 | Danas et al., SEFM 2017 | [doi](https://doi.org/10.1007/978-3-319-66197-1_11) |
| WK19 | Wrenn & Krishnamurthi, ICER 2019 | [doi](https://doi.org/10.1145/3291279.3339416) |
| PAFK26 | Prasad, Austen, Fisler & Krishnamurthi, ECOOP 2026 | [doi](https://doi.org/10.4230/LIPIcs.ECOOP.2026.22) |
| K01 | Kolikant 2001 | [doi](https://doi.org/10.1076/csed.11.3.221.3831) |
| SMK21 | Strömbäck, Mannila & Kamkar 2021 | [doi](https://doi.org/10.15388/infedu.2021.29) |
| L08 | Lu, Park, Seo & Zhou, ASPLOS 2008 | [doi](https://doi.org/10.1145/1346281.1346323) |
| KOLI23 | SQL misconceptions across six universities (249 participants), Koli Calling 2023 | [doi](https://doi.org/10.1145/3631802.3631821) |
| T22 | Toussaint et al., *PVLDB* 15(11), 2022 | [doi](https://doi.org/10.14778/3551793.3551818) |
| DO26 | Deutsch & Oca, ASEE 2026 | [ASEE](https://nemo.asee.org/public/conferences/374/papers/53628/view) |
| A3 review | the course's learning-science review, finding C4 | `research/reviews/A3-pedagogy.md` |
| PGI · PGC · PGN | PostgreSQL documentation for the edition's pinned release [X RUN-pg-anomalies] (OD-12): transaction isolation, constraints, numeric types | [PGI](https://www.postgresql.org/docs/18/transaction-iso.html) · [PGC](https://www.postgresql.org/docs/18/ddl-constraints.html) · [PGN](https://www.postgresql.org/docs/18/datatype-numeric.html) |
| LEANNAT | Lean reference: natural numbers (read 2026-10-23) | [manual](https://lean-lang.org/doc/reference/latest/Basic-Types/Natural-Numbers/) |
| LEANVP | Lean reference: validating proofs | [manual](https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/) |

---

## 7. n-of-1 keep/kill rules

One learner cannot power a randomized trial, so the course keeps or kills its own mechanics by rules written before any data exists (V2-32; BRIEF §3.5). W0-T07 commits the binding rules file, with its SHA-256 recorded in RUN-keepkill-rules before the first learner-zero event, and GATE-schema fails if the hash changes (spine §13). This section is the learning-science proposal from which that file is cut [D]; PLAN.md §14.4 gives the same four comparisons and defaults. Where the committed file and this section differ, the file governs.

### 7.1 What one learner can and cannot show

- **Units, not learners, are randomized.** The course has one learner-zero, who is also its author, and no telemetry (I6). Randomizing learners is impossible; randomizing units within the learner (KCs, or 12-week windows) is possible, as kernelspace randomized checks and levels within each learner.
- **Precision is the binding limit** [D]:

  | Units with an outcome, per arm | Approximate 95% half-width for a difference in accuracy near 0.8 |
  |---|---|
  | 10 | ±35 points |
  | 20 | ±25 points |
  | 30 | ±20 points |
  | 50 | ±16 points |

  Even 50 KCs per arm cannot resolve kernelspace's 5-point non-inferiority margin. For example [D], 18 of 20 against 14 of 20 is a 20-point difference whose 95% interval runs from −5 to +43 points; 45 of 50 against 35 of 50 gives +4 to +35.
- **Three threats are stated in advance.** The learner knows the arm and wrote the items, so nothing is blinded and expectancy can bias any result; a habit learned in one arm spills over into the other arm's KCs, which biases toward no difference; and arms can differ in time on task, which is therefore logged and reported.
- **So every rule names an evidence-backed default** that stands unless the data are clear. "Not enough data" is the expected outcome for some comparisons, and the rules say so before the data exist. Results are read descriptively and support no causal claim (spine §8.9).

### 7.2 The common protocol

1. **Pre-commitment.** The rules file lists each comparison's arms, its eligible units, its outcome, its minimum, its thresholds, its read points and its default. It is hashed before the first learner-zero event. An amendment is a new file with a new hash and a dated reason, and it applies only to units allocated after it.
2. **Allocation.** The experiment seed `expSeed` is drawn once, at install, and logged. Within each stage, a comparison's eligible units are ordered by `fmix32(hash32(experiment, unit, expSeed))` and assigned to the two arms alternately, the first arm given by the lowest bit of the first value. This keeps arms balanced within a stage, so stage difficulty cannot masquerade as an effect, and it reuses kernelspace's corrected recipe: the plain `hash32 % 2` confounds the arm with the unit's name (kernelspace's wave-2 specification, decision D27). Because the eligible units are listed in the hashed file, every allocation is a pure function of the seed and the file (I2, I3).
3. **Exposure.** An arm changes only the manipulated feature. Defence probes, audit cases, the schedule and every invariant are identical across arms: nothing locks in either arm, and neither arm is counterexample-only feedback.
4. **Outcome.** For a KC unit, the first own · unseen graded item on that KC answered at least 30 days after the unit became eligible, scored correct or not. For units eligible from first learning, that is the first event VRK₃₀ qualifies (ASSESSMENT.md §3.6). Assisted and agent events never count. A unit with no such event by the read is reported as missing and left out.
5. **Estimate.** The difference in accuracy between the two arms, with Newcombe's hybrid score interval at 95% ([Newcombe 1998](https://doi.org/10.1002/%28SICI%291097-0258%2819980430%2917:8%3C873::AID-SIM779%3E3.0.CO;2-I), method 10). It is closed-form and needs no random number generator, so the same log gives the same answer on every device. Each arm's accuracy carries its Wilson interval.
6. **Minimum.** No read until each arm has at least 20 units with an outcome; below that the report says "not enough data", and the default stands.
7. **Decisions.**
   - *Switch* to the alternative only if the interval's lower bound is above zero and the point difference is at least 10 points.
   - Where the alternative is cheaper in time, *switch* also if it is non-inferior: the lower bound above −5 points, kernelspace's margin.
   - *Harm stop:* at any read, if the interval's upper bound is below zero, allocation to the alternative stops and the default applies to every remaining unit.
   - Otherwise the result is *inconclusive*, and the default stands.
8. **Reads.** An interim read, for harm only, when each arm first reaches 10 units with an outcome. The final read is 60 days after the sign-off of the last stage that contributes units, or 24 months after the first learner-zero event, whichever comes first. Decision dates follow learner-zero's progress, not the calendar.
9. **Reporting.** SCR-assurance shows, for each comparison, n per arm, missing units, each arm's accuracy with its Wilson interval, the difference with its interval, time per item by arm, the decision, and the words "one learner; descriptive; no causal claim". A result never changes a learner state, never locks anything and is never compared across learners.

### 7.3 The four comparisons

| Comparison | Default (as shipped) | Alternative | Eligible units | Expected units [D] | Outcome | Decision |
|---|---|---|---|---|---|---|
| **1 · The misconception note, open or collapsed, once the learner is competent** | Collapsed in expert-treatment KCs; open in novice KCs (M-layered-feedback; row 9) | The other state | Expert-treatment KCs from first learning; novice KCs from the session after they are first solid (ASSESSMENT.md §3.3). A novice KC that is not yet solid keeps its note open and is never allocated | up to about 100 over the arc; each arm reaches 20 in the arc's second half | §7.2 item 4, from eligibility | §7.2's switch rule, read in either direction: if open is clearly better, the note stays open in every eligible KC; if collapsed is clearly better, it collapses in every eligible KC, novice KCs once solid included; otherwise the shipped defaults stand |
| **2 · Proof Blocks with or without distractors** | One or two distractors (M-proof-blocks; row 14) | No distractors | KCs served by GEN-proof-structure template 2 in S2, S3 and S9 | about 10–18, below the minimum | §7.2 item 4; time per item | The default is expected to stand by "not enough data". The cheaper arm (no distractors, about half the time in row 14) replaces it only under the non-inferiority rule |
| **3 · How a witness is generalized** | The witness with its class named by the system (M-class-hint; rows 21, 24) | The witness with a second, structurally different witness of the same class and a prompt to name what they share; the class is shown after the attempt (contrasting cases, principle after comparison; row 15) | KCs whose practice items return a model, state, trace, history or state pair | 42 KCs, 21 per arm, by the rules file's list; an arm reaches the minimum of 20 only if at most one of its units lacks an outcome | §7.2 item 4; also the share of the KC's fixes that also kill a non-minimal witness | §7.2's switch and harm rules. Practice mode only: probes stay one-shot in both arms. Neither arm is counterexample-only feedback, which BRIEF §3.3 rules out |
| **4 · Reserve weeks** | Two reserve weeks in every 12 (M-set-your-week; row 52) | No reserve weeks, with the same target range | Consecutive 12-week windows with alternating arms, the first drawn from `expSeed`; declared breaks pause the window | 3–6 windows over the arc | Weeks with graded or Bench work, of 12; also the 30-day accuracy of KCs first learned in the window, and stage hours against plan | No interval is claimed. Switch only if each no-reserve window meets at least two more weeks than each reserve window, with the other outcomes no worse. With two windows per arm, that ordering arises by chance one time in six before the margin [D]. Otherwise the default stands |

**Why comparison 1 widens the brief's wording.** BRIEF §3.5 and the digest frame it "in expert KCs". The stage specs give expert treatment to only a handful of KCs, so that comparison could never reach its minimum [D]. Adding novice KCs once they are solid keeps the question the evidence poses, whether the note still helps once the learner is competent (row 9; L1's open question 9), and withholds nothing from a novice who is still learning: a KC enters the comparison only once it is solid, the point at which the course already fades other scaffolds (the expert skip on authored calls and the interpretation tap).

### 7.4 Considered and not adopted

- **Confidence prompts on review items, on or off** (pedagogy digest §7; row 8). Confidence ratings can be reactive, but the "off" arm removes calls the Mirror needs: a band is diagnosed only with at least 20 calls in it and an interval wholly outside the printed band (spine §8.5). It is left out of the default file; the owner may add it before W0-T07 hashes the file.
- **Adversary-drafted against plain audit cases** (L3). The audit pool's design is fixed by GATE-audit, and both kinds are certified the same way.
- **Morning against evening blocks, anchored against floating days, public against private notes** (L4). Scheduling is the learner's choice (M-set-your-week), and publishing notes is optional (M-notes); the course does not randomize either.

---

## 8. What kernelspace established, and what is new here

kernelspace's 100x plan built its learning engine on an evidence appendix that its own dossiers verified on 2026-10-03, and on measurements of its own site. statespace inherits that engine (spine §0), re-checks what it can, and adds the evidence a formal-methods course needs that a systems course did not.

### 8.1 Inherited

| What kernelspace established | Its basis | Where statespace uses it | Status here |
|---|---|---|---|
| Expect about 0.10 SD; tutoring is 0.33–0.37 SD; two sigma never replicated | Kraft 2020; von Hippel 2024 | §1; spine §2.4 | Kraft re-checked [V]; von Hippel [KS] |
| Retrieval beats restudy | Rowland 2014 (*g* = 0.50); [Adesope 2017](https://doi.org/10.3102/0034654316689306) (*g* = 0.61) | row 1 | [KS]; the classroom figure added (Yang 2021) |
| Transfer needs application items | Pan & Rickard 2018 (*d* = 0.40) | row 1 | [KS] |
| The spacing gap scales with the horizon | Cepeda 2008 (about 5–10% of a one-year horizon) | row 2 | [KS]; the schedule's shape added (Latimier 2021) |
| Interleave similar categories | Brunmair & Richter 2019 (*g* = 0.42) | row 4 | [KS]; boundaries added (Firth 2021; Samani & Pan 2021) |
| Prequestions help on the asked content | St. Hilaire 2023 (*g* = 0.54 against 0.04) | row 5 | [KS]; per-segment, timing and AI-written studies added |
| Compare cases, principle after | Alfieri 2013 (*d* = .50) | row 15 | [KS] |
| Fail first only for concepts | Sinha & Kapur 2021 | row 19 | [KS] |
| Informational feedback, not expected rewards | Deci 1999 | row 37 | [KS] |
| Mastery gating cuts completion | Kulik 1990 | row 37; §4 | [KS], re-checked by L4 |
| About seven opportunities to reach 80% | Koedinger 2023 | row 50; §5 | [KS]; used as an analogy |
| Unguarded AI lowers unassisted performance | Bastani 2025 | row 33 | re-checked; the Shen & Tamkin band corrected (§9) |
| An explanation gate preserves unaided skill | Sankaranarayanan 2026 | row 34 | still a preprint |
| Engagement binds | Oreopoulos & Low 2026 | row 36 | the population is now stated (§9) |
| Active learning feels worse and works better | Deslauriers 2019 | row 48 | [KS] |
| Myths: learning styles, two sigma, "10,000 hours" | Pashler 2008; von Hippel 2024; [Macnamara 2014](https://doi.org/10.1177/0956797614535810) | §4 | [KS] |
| Its own measurements: "always pick the longest" passed 58 of 68 lessons; the first toolchain install was the largest drop-off risk | kernelspace's audit, 2026-10-03 | GATE-items' blind strategies; first contact with every tool in the browser; LAB-1 without the devcontainer (spine §12, item 34) | [KS] |

**Machinery inherited.** An append-only evidence ledger with provenance weights of 1.0 and 0.3 (spine §12, item 10); VRK₃₀ as the north star; Today, scheduled by FSRS, with welcome-back sets and never an overdue count; a KC graph with requires, confusable and threshold edges; seeded generators whose keys come from code; validity CI (blind strategies, item lints, cue ablation); hint ladders R0–R4 behind an explanation gate; nothing locks; within-learner allocation with the corrected hash recipe; and keep/kill rules signed before any data, each with a default if underpowered.

### 8.2 What changed since kernelspace's dossiers

- **Expertise reversal now has a meta-analysis** (row 9), and it extends to feedback detail. It is why scaffolding is set per KC (spine §2.1).
- **Worked examples, corrected.** Correct-only sets work best, and self-explanation prompts added to worked examples were *negative* (row 10). kernelspace's line "including from studying incorrect examples" needs that caveat.
- **Erroneous examples are a small effect** (*g* = .136, row 16), which is why the Audit Desk is justified as practice of the target skill rather than as a strong technique.
- **Spacing's schedule shape barely matters** (expanding against uniform *g* = 0.034, row 2), so a simple scheduler is enough.
- **Successive relearning reached a procedural task** (row 3).
- **Confidence prompts can be reactive** (row 8), so their effect on this learner is an open question (§7.4).
- **Prequestions:** immediate feedback after a failed pretest beat a delay; per-segment placement and AI-written prequestions helped, at grade C (row 5).
- **Retrieval for complex strategies is mixed** (row 1's boundary).
- **"Derring" failed two preregistered replications; growth-mindset messaging is *d* = .05** (§4).
- **Concreteness fading is no better than linked simultaneous views** (row 18).
- **If-then plans shrink to *d* = .15 after bias correction** (row 39), and the classic deadline study was retracted on 2026-09-02 (§4).

### 8.3 New here

kernelspace taught systems; it did not need evidence on proofs, specifications or formal notation. statespace adds:

- **Reading and writing proofs:** self-explanation training (row 13), no prompts on completion blanks (row 12), backward fading (row 11), Proof Blocks (row 14), engaging before the reveal (row 17), the retention cost of animated proofs (row 18), manual mode (row 23) and proof-comprehension facets (row 32).
- **Counterexamples and specifications:** counterexample and hint feedback (row 21), minimize-then-generalize (row 24), hints and unaided redos (row 22), hidden oracles and distinguishing scenarios (row 25) and refutation (row 26).
- **Misconceptions in formal notation:** logic, induction, invariants, temporal logic, Alloy, concurrency and SQL (§6).
- **Assessment validity:** structural variety and multiple true/false (row 27), self-grades and orals (rows 28, 54), calibration as bias (row 29), certainty-based marking without penalties (row 30), LLMs as graders (row 31) and calibration under AI (row 35).
- **Persistence over a 9–18-month solo arc:** recorded monitoring (row 38), bias-corrected plans (row 39), repairable rhythms (row 40), plans for months and breaks (rows 41, 51), belts (row 42), range goals and reserves (row 52), and landmarks and flexible timing (row 53).
- **Decay, transfer and value:** skill decay (row 45), error management (row 43), near transfer (row 44), and the value story before each tool (row 46).

### 8.4 Not carried over

- **Games and 3D** ([Clark 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4748544/); [Habgood & Ainsworth 2011](https://shura.shu.ac.uk/3556/); [Makransky 2019](https://doi.org/10.1016/j.learninstruc.2017.12.007)). statespace has no game layer; immersive 3D appears only among the myths (§4).
- **The simulation meta-analysis** ([Chernikova 2020](https://doi.org/10.3102/0034654320933544), *g* = 0.85). The Theater rests on prediction and contrasting cases (rows 5, 15), not on that figure.
- **Step-based tutoring, the doer effect, PRIMM, Rust's ownership model, protégé blocks and utility-value writing** ([VanLehn 2011](https://doi.org/10.1080/00461520.2011.611369); [Koedinger 2015](https://doi.org/10.1145/2724660.2724681); [Sentance 2019](https://doi.org/10.1080/08993408.2019.1608781); [Crichton 2023](https://cel.cs.brown.edu/paper/ownership-conceptual-model/); [Kucharavy 2025](https://aclanthology.org/2025.bea-1.19/); [Hulleman & Harackiewicz 2009](https://doi.org/10.1126/science.1177067)). No statespace mechanic rests on them.
- **Nudges at scale** ([Kizilcec 2020](https://doi.org/10.1073/pnas.1921417117)) survive only as evidence against a nudge-only design (row 39).

---

## 9. Corrections applied

Every correction the pedagogy digest records is applied in place. Three more come from the dossiers and from re-checking for this document.

| # | Correction | Where |
|---|---|---|
| 1 | **Barbieri 2023:** self-explanation prompts added to worked examples gave a *negative* effect, not merely a smaller one; the meta-analysis covers 43 articles, 55 studies and 181 effects | row 10 |
| 2 | **Higham 2023:** required ratings put restudy above retrieval in Experiments 1–2 only; in Experiment 3, with no rating, retrieval beat restudy | row 8 |
| 3 | **Shen & Tamkin:** the 24–39% band covers all low-scoring interaction patterns, not delegation alone | row 33 |
| 4 | **Oreopoulos & Low:** the sample is middle-school remedial mathematics in 18 Tennessee schools, so the grade is B for distance | row 36 |
| 5 | **Sheeran 2025:** the academic subgroup's .25 is uncorrected; the overall bias-corrected estimate is .15; the citation is *ERSP* 36(1), 2025 | row 39 |
| 6 | **Lehmann et al.** (no overall effect in two pre-registered experiments; the substitute/complement split is exploratory) and **Darvishi et al.** (non-generative AI) are not cited as evidence of harm | row 33 |
| 7 | **Baldiga 2014 and Coffman & Klinowski 2020** share an author, so they are not independent corroboration | row 30 |
| 8 | **Alloy4Fun's** logged submissions include participants outside the classroom | §6.8 (A1) |
| 9 | **Still unverified:** Gardner-Medwin's CBM reliability figure and Aulagnon's effect sizes, tagged [U] | rows 30, 40 |
| 10 | **Upgraded to [V]:** Kraft 2020 (working-paper full text); Cunha 2024 (authors' version); Danielson 2024 (abstract); Hacker 2000 (ERIC); pwn.college (authors' PDF: more than 50,000 learners, 3,833 retained over a year); Li 2025 (journal page: N = 1,259, a null result, preregistration not stated) | §1.2; rows 22, 26, 28, 39, 42 |
| 11 | **The self-explanation booklet's license:** page 1 of the official PDF ([booklet](https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf), SHA-256 `e55f4c9e…6559` as fetched by the digest on 2026-10-23) states CC BY-SA 4.0. The rights-reserved notice in its metadata covers three embedded images, and "All rights reserved" is the footer of the [web page](https://www.lboro.ac.uk/departments/mec/research/mathematical-cognition/self-ex-training/). The course adapts the text, not the images, under the CC BY-SA 4.0 that page 1 states, with attribution, a change note and share-alike, in its own directory, without asking the authors (OD-10, changed 2026-10-25); an original unit replaces it if the authors object | row 13; Spine issues |
| 12 | **Danas 2017:** the second review digest called its figures unverified; the pedagogy digest relies on L2's full-text reading, and so does this document | row 24 |
| 13 | **D'Antoni 2015 (beyond the digest):** BRIEF §3.2 reads the study as "counterexample-only feedback raised give-ups from 27% to 44%". In the paper, the 44% give-up rate and 394 s per problem belong to the binary-feedback arm, against 27% and 245 s for counterexamples and 33% and 264 s for hints, with learning equal (L3, finding F1, from the full text). The case for class hints rests on the authors' special-case warning and on row 24, not on a give-up penalty for counterexamples | row 21 |
| 14 | **Kraft's benchmarks (beyond the digest):** the small and medium cut points, the design effects and the five guidelines were added from the working paper's full text, re-read for this document [V] | §1.2 |
| 15 | **Tatel & Ackerman (beyond the digest):** the dossier's check did not re-see the "motor components" qualifier, so row 45 states "procedural skills" only | row 45 |

---

## Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item below ends with its outcome.*

Things in [the spine](spine/SPINE.md) that this document believes are wrong or underspecified. This document follows the spine where they conflict; each item needs a spine revision or an owner call.

1. **Misconception IDs had no namespace.** GATE-items requires a misconception ID on every option (spine §8.4, §11.2), and the digest's IDs collide with spine IDs: misconception G1–G9 with gap classes G1–G13, misconception S1–S4 with stages S1–S10, and misconception Z3 with the solver's name. The spine's ID table now carries the row this item proposed, misconception `dp:{catalog key}` (for example `dp:G4`), registered from §6 of this document, and W0-T03 adds the registry to GATE-links' scope. ASSESSMENT.md's kebab tags, such as `mis:only-if-converse`, remain only as descriptive aliases in its Appendix A. *Revision 3: applied (ID conventions; §8.3; §12 item 40).*
2. **M-prequestion is graded A, but its placement is C.** Spine §7 gives "A · Ev [sthilaire23]", while the course places 1–2 prequestions at each core segment, which the digest grades C (row 5: "A (C for per-segment and AI)"). It should read "A for prequestions; C for the per-segment placement". *Revision 3: already resolved (§7 M-prequestion).*
3. **M-notes cites the wrong study.** M-notes and §4.1's writing row cite [kobayashi19], which measures learning by teaching (preparing *g* = .35, teaching after preparing .56) and supports M-explain-back. The writing-to-learn evidence is Bangert-Drowns 2004 (0.22 in a re-analysis, larger with metacognitive prompts). The grade, A (small), stays; the key should change. *Revision 3: already resolved, as one item with PLAN.md issue 11 (§4.1 Writing row, §7 M-notes).*
4. **§4.1 drops the tool primer.** The digest's dose is "first contact in the browser after a primer of at least 5 minutes" (pre-training, row 18; graded B/D), but §4.1's "New tools" row keeps only the first half and grades it D. Restore the primer, or log the cut in §12. *Revision 3: applied (§4.1 New tools row; §12 item 59).*
5. **OD-10 omits the booklet's images.** OD-10 and W2-T05 treat the self-explanation booklet as CC BY-SA, but its three embedded images are rights-reserved (§9, item 11). W2-T05's acceptance should say that the text is adapted and the images are not. *Revision 3: applied through OD-10's change on 2026-10-25, which adapts the text only (§1.2 OD-10, §3.2 S2.L0, §13 W2-T05).*
6. **One keep/kill arm is an anti-pattern as written.** W0-T07 takes BRIEF §3.5's "counterexample vs class hint" without defining the arms; read literally, one arm is counterexample-only feedback, which BRIEF §3.3 rules out and M-class-hint contradicts. §7.3 defines both arms so that neither is. W0-T07's acceptance should carry that constraint (PLAN.md raises the same point). *Revision 3: already resolved, as one item with PLAN.md issue 6 (§13 W0-T07).*
7. **One keep/kill comparison can never be read.** The feedback-layer comparison is framed "in expert KCs" (BRIEF §3.5; digest §7), but only a handful of KCs get expert treatment, so no minimum n is reachable. §7.3 widens eligibility to novice KCs once they are solid. The spine should adopt that or record that the comparison is expected to stay unread; W0-T07 also needs the units, minimum n, thresholds and read points that §7.2 proposes, which the spine does not yet state. *Revision 3: already resolved (§13 W0-T07; `content/governance/keepkill-rules.yaml`).*
