# v2 pedagogy digest: graded evidence, misconceptions, assessment, persistence

**Prepared** 2026-10-23 (machine clock; the brief is dated 2026-10-20) for the v2 course architect. Replaces the 2026-10-21 draft.

**Inputs:** dossiers L1–L4 and their fact-check logs; kernelspace `PLAN-100X` Appendix A; spikes executed 2026-10-20 (`spikes/RESULTS.md`), which win any conflict; the round-2 review digest (`synthesis/digest-review-2.md`); the A3 review (dosage).

**Learner:** a kernelspace graduate, Rust-fluent and systems-literate, novice in formal notation; solo, 6–10 h/week for 9–18 months, building their own system with coding agents.

**Vocabulary** (review digest): *stage*; *signed off* (v1 "set"); **VRC₃₀**, knowledge components (KCs) re-derived unassisted on unseen seeds ≥30 days after first learning (kernelspace's VRK₃₀, applied to reasoning moves).

**Grades:** **A** meta-analysis or several consistent RCTs; **B** one good experiment on a similar task, or a meta-analysis of a distant population; **C** small study, quasi-experiment, correlational or prevalence data, preprint; **D** theory, consensus, design rationale, tool precedent.

**Tags** (untagged = checked by a dossier or fact-check pass): **[V+]** re-checked by me, 2026-10-23; **[U]** unverified; **[KS]** kernelspace logs; **[pre]** preprint; **[RUN]** executed spike; **[R2]** review-lens measurement, not in RESULTS.md; **[A3]** A3 review; **[D]** derived or design rationale.

**Effect sizes.** Kraft's benchmarks come from 1,942 effects in 747 education RCTs: median 0.10 SD, with ≥0.20 SD "large" for pre-K–12 achievement [V+, working-paper full text] ([WP](https://edworkingpapers.com/ai19-10); [DOI](https://doi.org/10.3102/0013189X20912798)). Effects below come from aligned, researcher-made tests, mostly K-12 or undergraduate; they do not add up, and for one adult they mean "more likely than not to help".

**Corrections applied in place:** Barbieri 2023, prompts *negative*, 43 articles, 55 studies, 181 effects (row 10); Higham 2023, Exps 1–2 only (row 8); Shen & Tamkin, 24–39% spans all low-scoring patterns (row 33); Oreopoulos & Low, middle-school remedial maths in 18 Tennessee schools (row 36); Sheeran, academic .25 uncorrected, *ERSP* 36(1), 2025 (row 39). Lehmann (null in two pre-registered experiments) and Darvishi (non-generative AI) are not cited as harm; Baldiga and Coffman & Klinowski share an author (row 30); Alloy4Fun data include non-classroom users. **Still [U]:** Gardner-Medwin's CBM reliability; Aulagnon's effect sizes.

**Upgraded to [V+] from primary sources:** Kraft (above); Cunha 2024, authors' version (row 22); Danielson 2024, abstract (row 26); Hacker 2000, ERIC (row 28); pwn.college, authors' PDF (>50,000 learners, 3,833 retained >365 days; row 42); Li 2025, journal page (N=1,259, null; preregistration not stated).

**Booklet licence:** page 1 of the [official PDF](https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf) (sha256 `e55f4c9e…6559`, fetched 2026-10-23) states CC BY-SA 4.0; the rights-reserved `dc:rights` sits on three embedded images, and "All rights reserved" is the [web page's](https://www.lboro.ac.uk/departments/mec/research/mathematical-cognition/self-ex-training/) footer. Adapt the text, not the images, with attribution and share-alike after a one-line confirmation from the authors; the owner decides how a CC BY-SA module fits the repo.

---

## 0. The design in ten lines

1. **Scaffold per KC** (row 9): expert in Rust, Postgres practice and concurrency failures; novice in proof, semantics, weakest preconditions (WP), temporal notation, information flow, simulation. The reversal is asymmetric: when unsure, help.
2. **Loop:** Call → Witness → Explain → Build → Defend → Re-find; only unassisted Defend and Re-find evidence on fresh items moves "signed off".
3. **Layered feedback:** witness, bound and basis always; a misconception note, open by default only in novice KCs.
4. **Faded proof chains:** a self-explanation unit → Goal Replay → backward fading (no prompts on blanks) → Proof Blocks after reading → an unscaffolded Bench proof in manual mode.
5. **Twins first, interleaving after.**
6. **Items are code:** structural generators, misconception-tagged distractors, tool-computed keys.
7. **A Defence replaces the self-graded viva;** explain-back stays, uncredited.
8. **Claims ≠ Evidence:** what artifacts establish vs what the learner can do unassisted.
9. **Nothing locks; the week is the unit;** reward competence and value, never points.
10. **Twin labs with platform work;** promise near transfer only.

---

## 1. Graded evidence table (restricted to what the course uses)

### 1a. Practice, prediction, memory

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 1 | Retrieval with application items → Call It, Re-find, Today | g=0.50 vs restudy [KS]; classroom g=0.499 (222 studies); transfer d=0.40 only with application items [KS] | Restudy beat retrieval in one complex-strategy study (grades 5–6) | A | [Rowland 2014](https://doi.org/10.1037/a0037559); [Yang 2021](https://doi.org/10.1037/bul0000309); [Pan & Rickard 2018](https://doi.org/10.1037/bul0000151); [Kranz 2024](https://doi.org/10.1080/00220973.2024.2392684) |
| 2 | Spacing → scheduler | Spaced vs massed g=0.74; expanding vs uniform gaps 0.034 (n.s.); best gap ≈5–10% of a 1-year horizon | Mostly verbal material | A | [Latimier 2021](https://doi.org/10.1007/s10648-020-09572-8); [Cepeda 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x) |
| 3 | Successive relearning → sign-off criterion | 3 sessions, 2 days apart, correct items dropped, misses back ≤2×: beat time-matched restudy; exam and retention gains in a course; grammar production up at 14 days | Mostly declarative | B | [Higham 2022](https://doi.org/10.1037/edu0000693); [Rawson 2013](https://doi.org/10.1007/s10648-013-9240-4); [Serfaty 2024](https://doi.org/10.1111/lang.12585) |
| 4 | Interleaved "Which is it?" sets | g=0.42 (words −0.39) [KS]; up to 0.65–0.66 for subtly different categories; interleaved homework: surprise-test gains 50% and 125%, rated less useful | After first exposure; mainly with prior knowledge | A | [Brunmair 2019](https://doi.org/10.1037/bul0000209); [Firth 2021](https://doi.org/10.1002/rev3.3266); [Samani 2021](https://doi.org/10.1038/s41539-021-00110-x) |
| 5 | A call before each segment | g=0.54 on asked vs 0.04 on unasked content [KS]; works after wrong guesses if answers are then studied; immediate feedback beat a 24–48 h delay; per-segment and ChatGPT-written prequestions helped; predicting beat evaluating afterwards | Prose and video; no formal-procedure study | A (C for per-segment and AI) | [St. Hilaire 2023](https://doi.org/10.3758/s13423-023-02353-8); [Mera 2025](https://doi.org/10.5334/joc.455); [Kliegl 2024](https://doi.org/10.1007/s00426-024-02042-8); [Pan 2025](https://doi.org/10.1037/mac0000254); [Brod 2018](https://doi.org/10.1016/j.learninstruc.2018.01.013) |
| 6 | Hypercorrection queue | Confident errors are corrected most often, but return more often after a week | Facts and science concepts | B | [Butterfield 2001](https://doi.org/10.1037/0278-7393.27.6.1491); [Butler 2011](https://doi.org/10.3758/s13423-011-0173-y) |
| 7 | Delayed, cue-only self-judgments (scheduling only) | Relative accuracy g=0.93 for delayed vs immediate judgments | Delays of minutes; using the next session is [D] | A | [Rhodes 2011](https://doi.org/10.1037/a0021705) |
| 8 | Test confidence prompts for reactivity | Required ratings put restudy above retrieval (Exps 1–2 only) [V+]; reactivity g=0.054 overall; ratings helped confident reasoners and hurt unconfident ones | Word pairs; Raven's matrices | B/C | [Higham 2023](https://doi.org/10.1007/s10648-023-09809-2); [Double 2018](https://doi.org/10.1080/09658211.2017.1404111); [Double 2019](https://doi.org/10.3389/fpsyg.2019.02755) |

### 1b. Examples, explanation, comparison

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 9 | Per-KC scaffolding (expertise reversal) | High assistance: d=+0.505 at low prior knowledge, −0.428 at high (60 experiments) [V+]; detailed feedback raised load for experts | Asymmetric | A | [Tetzlaff 2025](https://doi.org/10.1016/j.learninstruc.2025.102142); [Huangfu 2026](https://doi.org/10.1111/bjet.70046) |
| 10 | Correct worked examples first | g=0.48; correct-only beat mixed sets; self-explanation prompts *negative* [V+]; built knowledge, not unscaffolded skill | Maths; novices | A | [Barbieri 2023](https://doi.org/10.1007/s10648-023-09745-1); [Rexhäuser 2026](https://doi.org/10.1007/s11412-026-09468-9) |
| 11 | Backward fading; principle prompts on revealed steps | Backward beat forward fading; with principle prompts, medium-to-large near and far transfer, no extra time | Structured maths | B | [Renkl 2002](https://doi.org/10.1080/00220970209599510); [Atkinson 2003](https://doi.org/10.1037/0022-0663.95.4.774) |
| 12 | **No prompts on completion blanks** | Blanks impaired proof learning, "especially in combination with self-explanation prompts"; prompts alone helped | N=111; geometry proofs | B | [Hilbert 2008](https://doi.org/10.1016/j.learninstruc.2006.10.008) |
| 13 | Self-explanation unit before Stage 2 | g=0.55; proof booklet d=0.950 (Exp 1); a 15-min version lasted; null with time controlled | Maths: immediate gains; thin retention evidence | A (B proofs) | [Bisra 2018](https://doi.org/10.1007/s10648-018-9434-x); [Hodds 2014](https://doi.org/10.5951/jresematheduc.45.1.0062); [Beege 2024](https://doi.org/10.1007/s11251-024-09693-5) |
| 14 | Lean Proof Blocks (middle rung) | Equal at one week (p=0.76) in 11.1 vs 43.4 min (N=332); Blocks alone gave the smallest gains; distractors trended positive at ~2× the time | Induction; after reading | B | [Poulsen 2023](https://doi.org/10.1145/3545945.3569797); [2024](https://doi.org/10.1145/3626252.3630831); [2025](https://doi.org/10.1145/3641554.3701787) |
| 15 | Twins (contrasting cases) | d=.50, larger when learners seek similarities and the principle comes after [KS]; comparison beat sequential study (CS2, N=241) | Comparative prompts suit experts | A | [Alfieri 2013](https://doi.org/10.1080/00461520.2013.775712); [Patitsas 2013](https://doi.org/10.1145/2493394.2493409) |
| 16 | Audit Desk as erroneous examples | g=.136, higher with error-explanation prompts or explanations [V+]; mixed sets help only with prior knowledge; nothing immediate, d=.33 at one week | Practice of the target skill | A (small) | [Alemdag 2025](https://doi.org/10.3102/00346543251390901); [Große 2007](https://doi.org/10.1016/j.learninstruc.2007.09.008); [McLaren 2015](https://doi.org/10.1007/s40593-015-0064-x) |
| 17 | Engage before the reveal | Judging and attempting the statement first improved proof understanding | n=87; group-level randomisation | C | [Hapipi 2026](https://doi.org/10.1016/j.jmathb.2026.101353) |
| 18 | Linked simultaneous views; learner-paced; pre-training | Concreteness fading ≈ simultaneous linked views; narrated animated proofs lost more by 2 weeks; contiguity, signalling and pre-training help | One RCT each for the first two | A/C | [Lichtenberger 2024](https://doi.org/10.1002/tea.21947); [Roy 2017](https://doi.org/10.1007/s10649-017-9754-7); [Noetel 2022](https://doi.org/10.3102/00346543211052329); [Mayer 2002](https://doi.org/10.1037/1076-898X.8.3.147) |
| 19 | Guided building | Unassisted discovery d=−0.38, enhanced +0.30; fail-first 0.36 conceptual, −0.03 procedural [KS]; university project-based learning .116 | Fail-first only to "invent the check" | A | [Alfieri 2011](https://doi.org/10.1037/a0021017); [Sinha 2021](https://doi.org/10.3102/00346543211019105); [Zhang 2023](https://doi.org/10.3389/fpsyg.2023.1202728) |

### 1c. Feedback and help

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 20 | Layered, elaborated feedback | Elaborated 0.49, correct answer 0.32, right/wrong 0.05; elaborated ranked first for recall and transfer; over a third of interventions lowered performance | Detail adds load for experts | A | [Van der Kleij 2015](https://doi.org/10.3102/0034654314564881); [Mertens 2022](https://doi.org/10.1037/edu0000764); [Kluger 1996](https://doi.org/10.1037/0033-2909.119.2.254) |
| 21 | Counterexample feedback with class hints | 394 s vs 245 s per problem; give-ups 44% vs 27%; learning equal; learners "treat the counterexample as a special case" | DFAs, N=377 | B | [D'Antoni 2015](https://doi.org/10.1145/2723163) |
| 22 | Self-explanation with each hint; unaided redo | Location hints: 9.12 vs 5.67 of 12 solved, but 4.84 vs 5.95 a week later (n.s.) [V+]; code hints transferred only with self-explanation | 85 BSc students, Alloy | B | [Cunha 2024](https://doi.org/10.1145/3639474.3640050); [Marwan 2019](https://doi.org/10.1145/3291279.3339420) |
| 23 | Manual mode | 48% could finish "without thinking, just clicking randomly"; inductive steps left blank; with manual steps, 15% | Non-equivalent cohorts | C [pre] | [Keenan 2026](https://arxiv.org/abs/2608.23309) |
| 24 | Minimise → generalise → near-miss | With minimal-only or maximal-only witnesses, 28/35 and 10/25 abandoned them, and many fixed only the case shown (L2 full text); explained counterexamples: 9 vs 4 of 13 engineers | Alloy class; one-group, not counterbalanced | C | [Danas 2017](https://doi.org/10.1007/978-3-319-66197-1_11); [Kaleeswaran 2023](https://arxiv.org/abs/2304.08950) [pre] |
| 25 | Hidden oracles; distinguishing scenarios | A shared misreading passes the learner's own tests; invalid suites fell 29.7%→9.3%; scenarios beat showing the candidates | Non-randomised cohorts; LTL, regexes, policies | B−/C | [Wrenn 2019](https://doi.org/10.1145/3291279.3339416); [Prasad 2026](https://doi.org/10.4230/LIPIcs.ECOOP.2026.22) |
| 26 | Refutation card after repeated misses | Pre-registered, 294 effects: a consistent advantage; moderators changed nothing [V+] | Science; untested in logic | A (science) | [Danielson 2024](https://doi.org/10.1080/00461520.2024.2365628) |

### 1d. Assessment validity

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 27 | Structural variety; multiple true/false (MTF); item lints | Leakage gain 13 pp with one generator vs 2–3 pp with pools; nearly half of correct multiple-choice answerers misjudge other options; lures stick; convergence cue; "pick the longest" passed 58/68 kernelspace lessons [KS] | Leakage, not learning | B/C | [Chen 2018](https://doi.org/10.1145/3231644.3231664); [Couch 2018](https://doi.org/10.1093/biosci/biy037); [Roediger 2005](https://doi.org/10.1037/0278-7393.31.5.1155); [Smith 1982](https://doi.org/10.1111/j.1745-3984.1982.tb00129.x) |
| 28 | Self-grades as practice; many cases, not one oral | Self-grades r=0.91–0.94 with teacher's, yet low performers inflate; "gross overconfidence" [V+]; two orals: reliability 0.65; four orals × two examiners: 0.78 | School; undergraduates; 896 candidates | B | [Sadler 2006](https://doi.org/10.1207/s15326977ea1101_1); [Hacker 2000](https://doi.org/10.1037/0022-0663.92.1.160); [Wass 2003](https://doi.org/10.1046/j.1365-2923.2003.01417.x) |
| 29 | Calibration shown as bias | Feedback cut overconfidence, not discrimination; content teaching *raised* overconfidence; training improved Brier 6–11% | Lab; forecasters | B/C | [Stone 2000](https://doi.org/10.1006/obhd.2000.2910); [Chang 2016](https://jbaron.org/journal/16/16511/jdm16511.pdf) |
| 30 | No penalties for credit; certainty-based marking (CBM) as feedback | Under penalties, women skipped more at equal knowledge (same first author in both). CBM is proper (67%/80% switch points); 78% of 49 respondents rated it fair; reliability gain [U] | Lab; exams | B (C for CBM) | [Baldiga 2014](https://doi.org/10.1287/mnsc.2013.1776); [Coffman 2020](https://doi.org/10.1073/pnas.1920945117); [Moodle](https://docs.moodle.org/311/en/Using_certainty-based_marking); [Smrkolj 2022](https://doi.org/10.3390/ijerph19031706); [Gardner-Medwin](https://www.physoc.org/abstracts/analysis-of-exams-using-certainty-based-marking/) |
| 31 | The LLM is never the grader of record | κ 0.70 vs human 0.75; olympiad proof scores inflated up to ~20×; "substantial disagreement" with TAs; LeanTutor found 30% of wrong steps | Narrow tasks | B/C [pre] | [Henkel 2024](https://arxiv.org/abs/2405.02985); [Petrov 2025](https://arxiv.org/abs/2503.21934); [Mahinpei 2026](https://arxiv.org/abs/2602.23635); [Patel 2025](https://arxiv.org/abs/2506.08321) |
| 32 | Prompts from proof-comprehension facets | Seven local and holistic question types; reliable tests | Undergraduate maths | C | [Mejía-Ramos 2012](https://doi.org/10.1007/s10649-011-9349-7) |

### 1e. AI while learning

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 33 | Credit only unassisted work | Unguarded GPT: practice +48%, exam −17%; a hint-only tutor largely mitigated it. With AI: quiz 17% lower (d=0.738), not significantly faster; high-scoring patterns such as conceptual inquiry 65–86%, all low-scoring patterns 24–39% | ~1,000 high-school students; 52 developers paid for speed | A−/B | [Bastani 2025](https://doi.org/10.1073/pnas.2422633122); [Shen 2026](https://arxiv.org/abs/2601.20245) [pre] |
| 34 | Explanation gate; work-anchored review | Blackout failure 39% gated vs 77% unrestricted; +0.27 SD unaided, smaller after a week; answer-seeking predicted lower midterms, proof review did not; prompt training alone: no learning difference | Preprints; correlational | C [pre] | [Sankaranarayanan 2026](https://arxiv.org/abs/2602.20206); [Contractor 2026](https://arxiv.org/abs/2607.08849); [Chen 2026](https://arxiv.org/abs/2602.18807); [Xiao 2026](https://arxiv.org/abs/2602.16033) |
| 35 | Calibration measured separately under AI | With AI: +3 points, ~4 overestimated; AI literacy went with less accurate self-assessment | LSAT, N=698 | B | [Fernandes 2026](https://doi.org/10.1016/j.chb.2025.108779) |
| 36 | Engagement binds | 0.06–0.08 SD/year (ITT); help sought in 17% of sessions with a mistake | Middle-school remedial maths | B (distant) | [Oreopoulos 2026](https://www.nber.org/papers/w35620) |

### 1f. Motivation, persistence, transfer, decay

| # | Technique → use | Effect | Population / boundary | Grade | Source |
|---|---|---|---|---|---|
| 37 | Informational rewards; no points or locks | Expected rewards −.28 to −.40, positive feedback +.33; gamification robust only for cognition (.49), competence .28; self-paced mastery "often reduce[s] the completion rates" | Mixed; college | A | [Deci 1999](https://doi.org/10.1037/0033-2909.125.6.627); [Sailer 2020](https://doi.org/10.1007/s10648-019-09498-w); [Li 2024](https://doi.org/10.1007/s11423-023-10337-7); [Kulik 1990](https://doi.org/10.3102/00346543060002265) |
| 38 | Recorded weekly monitoring | d+=.40 (138 RCTs); larger when recorded and reported | Mostly health | A | [Harkin 2016](https://doi.org/10.1037/bul0000025) |
| 39 | 1–2 if-then plans; no nudge-only design | Bias-corrected d=.15; uncorrected .19 at 1–6-month follow-ups; MOOC plan prompts and accountability-partner prompts were null [V+] | Strong publication bias | A (small) | [Sheeran 2025](https://doi.org/10.1080/10463283.2024.2334563); [Kizilcec 2020](https://doi.org/10.1073/pnas.1921417117); [Li 2025](https://doi.org/10.24059/olj.v29i4.5215) |
| 40 | Repairable, gain-framed weekly rhythm | Repair softens broken-streak effects; weekly streak messages raised practice (sizes [U]); rewarding the return topped 54 nudges | Consumers; pupils; gyms | B | [Silverman 2023](https://doi.org/10.1093/jcr/ucac029); [Aulagnon 2025](https://doi.org/10.1016/j.econedurev.2025.102721); [Milkman 2021](https://doi.org/10.1038/s41586-021-04128-4) |
| 41 | Plan for months and breaks | Habits took 18–254 days, and one miss didn't matter; 48.7% finished by their *pessimistic* estimate; a hiatus didn't raise dropout | Adults; students | B | [Lally 2010](https://doi.org/10.1002/ejsp.674); [Buehler 1994](https://doi.org/10.1037/0022-3514.67.3.366); [Joyner 2022](https://doi.org/10.1145/3491140.3528283) |
| 42 | "Signed off" as a belt | Belts were "deeply motivating", earned even "for no credit"; leaderboards faded at scale [V+] | One large community | C | [Nelson 2026](https://doi.org/10.1145/3770762.3772636) |
| 43 | Keep specimens (error management) | d=.44; .80 on structurally different tasks | Adult software training | A/B | [Keith 2008](https://doi.org/10.1037/0021-9010.93.1.59) |
| 44 | Near transfer, hugged and bridged | Far transfer "equaled zero" under controls; utility, realism and the chance to perform drive workplace transfer | Reviews | A/B | [Sala 2019](https://doi.org/10.1525/collabra.203); [Grossman 2011](https://doi.org/10.1111/j.1468-2419.2011.00373.x) |
| 45 | Keep loop sized to decay | Unused, half of accuracy gains gone by ~6.5 months (speed 13, mixed 11) [V+] | Procedural skills; proof decay unmeasured | A | [Tatel 2025](https://doi.org/10.1037/bul0000481) |
| 46 | Value story before each tool | Engineers learned TLA+ "from scratch" with "useful results in 2 to 3 weeks" | Survivorship | C | [Newcombe 2014](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf) |
| 47 | Oral explain-back; short prompted writes | Teaching after preparing g=.56; oral beat written; writing-to-learn 0.22 (re-analysis), more with metacognitive prompts | Students; mostly K-12 | A/B (small) | [Kobayashi 2019](https://doi.org/10.1111/jpr.12221); [Lachner 2021](https://doi.org/10.1016/j.learninstruc.2020.101438); [Bangert-Drowns 2004](https://doi.org/10.3102/00346543074001029) |

---

## 2. Misconception catalog by stage (seeds for distractors, specimens and audit cases)

**Rules.** Options carry catalog IDs; distractors are conceptual mutants, tool-checked against the key. Vary the English wording and weight English → formula items (T4). Temporal items ask for one satisfying and one violating trace. Repeated misses on a tag bring a refutation card (row 26). "—" means no learner study: log it through Call It and keep it only if it draws errors. Never validate items on LLM-simulated learners, which "correct" themselves after any feedback ([Do 2026](https://arxiv.org/abs/2605.12748) [pre]). Entries read: misconception → seed or specimen; *evidence (grade)*.

**Stage 0 — Ground**
- **G1** "P only if Q" read as Q→P or P↔Q → "a transfer is allowed only if balance ≥ amount". *BP08: "only if" caused 75.43% of biconditional-for-conditional errors (C).*
- **G2** The antecedent follows English word order. *BP08: reversals 66% vs 43% (C).*
- **G3** → and ↔ swapped; "unless" and "provided" mistranslated. *BP08 (C).*
- **G4** A false antecedent read as "irrelevant" → a guard that never fires. *AI13 (C).*
- **G5** A negation fails when it sounds implausible → negate "every hold is eventually released". *AP05: ~45% still wrong after a logic course (C).*
- **G6** An informal claim not unpacked into quantifiers. *SS95: 5–8.5% success (C).*
- **G7** if-then read as AND; iff read one way; proof by incomplete enumeration. *HKLZ08, n=7 (D).*
- **G8** Empirical or authoritarian conviction → "20,000 runs passed"; "Lean accepted it". *HS98 (C).*
- **G9** "Invariant" equated with "inductive invariant" → a 2×2 of inductive × invariant. *[A3]; LAM18; SDT22 (D).*

**Stage 1 — Z3**
- **Z1** `sat` read as "holds"; `unsat` read as "safe" without a non-vacuity check. *—; G4.*
- **Z2** `unknown` or a timeout read as "no bug" → UNKNOWN with a stable reason, under `rlimit` [R2]. *—.*
- **Z3** The model taken as *the* bug rather than one witness of a class. *D17 (C).*
- **Z4** `Int` assumed to cover `i64` → with BitVec(64), the guarded sender is `unsat` but the recipient wraps (`sat`, B=9223372036850581504, M=4194304). *[RUN].*
- **Z5** G1–G3 mistakes and wrong operators carried into the encoding. *BP08; JS24 (C).*
- **Note:** the roadmap's starter prints `# sat`, so the first recorded call is a generated variant [R2].

**Stage 2 — Lean**
- **L1** "Programming isn't proving"; the syntax barrier. *IT23 (C/D).*
- **L2** `simp`, `omega` or `decide` closes the step being taught. *KK26 (C).*
- **L3** Kernel acceptance taken to mean the requirement is met (gap 12). *HS98; MZJC25 (C/D).*
- **L4** Can't say what a theorem proves. *MR12; IA12 (C).*
- **L5** Induction hypothesis not generalised → `run_conserves` needs `generalizing s`. *[RUN]; —.*
- **L6** Base case seen as optional; inductive step seen as circular. *P06; K26 (C/D).*
- **L7** "Self-transfer obviously conserves" → computing both balances from the old state mints money: `xferBuggy (fun _ => 10) 0 0 5 0 = 15`, by `decide`. *[RUN]; LK24 (C).*
- **L8** "Any axiom means unsound", or "no `sorry` means nothing is trusted" → `#print axioms` shows `[propext, Quot.sound]`, both benign. *[RUN]; LEANVP.*

**Stage 3 — Semantics**
- **S1** Aliasing intuitions carried over from the host language. *LK24 (C).*
- **S2** `Nat` balances can't overdraw → `Nat` subtraction is "truncated at `0`". *LEANNAT; —.*
- **S3** → written for ↔ in typing or guard rules; local state shared across calls. *G3; SMK21 (C).*
- **S4** Progress plus preservation taken to imply the business invariant. *—.*

**Stage 4 — Hoare logic, WP, VCs**
- **O1** Invariant notation: wrong quantifier bounds, off-by-one. *M10 (C).*
- **O2** An invariant that is incomplete, too strong, or missing a relationship. *M10 (C).*
- **O3** A counterexample to induction (CTI) read as a reachable bug → three verdicts: inductive; CTI (strengthen the invariant); reachable violation (fix the command). *[A3]; LAM18; —.*
- **O4** WP substitution done backwards or with variable capture; a missing frame condition. *—.*
- **O5** Partial vs total correctness; a vacuous VC; solver bug vs VC-generator bug. *—.*

**Stage 5 — TLA+, concurrency, liveness**
- **T1** An implicit G or F. *GSNK22; LTLT: 28.68% of wrong answers (C).*
- **T2** U read as weak-until. *GSNK22: 9 of 11 in round 4 (C).*
- **T3** "Resolves exactly once" written as an eager F. *GSNK22 (C).*
- **T4** English → formula is wrong 47% of the time, vs 23–24% for formula → English. *GSNK22 (C).*
- **T5** "No error found" taken as proof for all sizes → the unsafe double spend has 11 distinct states, the atomic version 4. *[RUN].*
- **T6** Trace length is ambiguous (5 states = 4 actions) [RUN]; with default flags TLC reports "Deadlock reached", so the counts above need `-deadlock` [R2]. Stems name the unit and argv.
- **C1** Sequential consistency assumed. *SMK21; K01 (C).*
- **C2** A lock serialises the whole function or stops all threads. *SMK21 (C).*
- **C3** "Add a lock" fixes an order violation. *L08: locks didn't fix 73% of non-deadlock bugs; 92% need only ≤4 ordered accesses to trigger (C).*
- **C4** "Correct most of the time" is good enough. *SMK21 (C).*
- **C5** Safety and liveness swapped. *—.*

**Stage 6 — PostgreSQL** (cross-link tablespace for MVCC)
- **Q1** `= NULL` or `IS` treated as equality. *KOLI23: 28% (C); T22 (C).*
- **Q2** `CHECK (bal >= 0)` assumed to forbid missing balances → it **accepts** NULL. *[RUN]; PGC.*
- **Q3** A NULL balance assumed to fail the guard visibly → `WHERE bal >= 10` **silently skips** it. *[RUN].*
- **Q4** "READ COMMITTED loses updates" → a conditional UPDATE loses nothing, but an app-level read-modify-write spends 160 out of 100. *[RUN]; PGI.*
- **Q5** "REPEATABLE READ prevents everything" → under write skew both transactions commit (total −100); SERIALIZABLE aborts one with 40001. *[RUN]; PGI.*
- **Q6** "bigint wraps like `i64`" → Postgres raises 22003: **the model takes a step the database refuses**. *[RUN]; PGN.*
- **Q7** SERIALIZABLE retries always terminate; differential tests count as proof. *—; G8.*

**Stage 7 — Authorization and information flow**
- **A1** `in` (subset) used where overlap was meant; vacuously true on ∅. *JS24: wrong operators are the top error (C).*
- **A2** Extra quantifiers; constraints set at set level instead of per principal. *JS24 (C).*
- **A3** Fixing only the instance shown. *D17 (C).*
- **A4** Enforcement mistaken for noninterference. *—.*
- **A5** A policy accepted without a distinguishing request. *PAFK26 (B−); WK19 (C).*
- **A6** A small scope read as unbounded; revocation assumed to "erase" disclosure. *—.*

**Stage 8 — Effects** (cross-link byzantine; no learner studies, all —): **E1** "the outbox gives exactly once"; **E2** a fresh idempotency key on every retry; **E3** the ack always arrives, or liveness checked with crashes turned off; **E4** the provider's idempotency left outside the trusted base.

**Stages 9–10 and the Audit Desk**
- **P1** The observer ignores aborts; the simulation direction is confused. *—.*
- **P2** Lean skill assumed to transfer to informal proof without fading. *BK18: "extremely underestimated" (D).*
- **P3** Compiler, command and runtime claims conflated. *—.*
- **X1** A test or a bounded check presented as proof. *G8.*
- **X2** Surface reading taken for validation. *NE25 (C); IA12.*
- **X3** Rejecters are overconfident; accepters don't update. *IN13 (C).*
- **X4** Verified code for the wrong spec; spec, tests and code sharing one misreading. *MZJC25; WK19 (C).*
- **X5** Frequent AI use goes with weaker detection of hallucinations. *DO26 (C, correlational).*

**Source key**
- **Logic and proof:** BP08 [Barker-Plummer](https://escholarship.org/uc/item/66k15611), HKLZ08 [Herman](https://doi.org/10.1145/1404520.1404527), AI13 [Attridge](https://doi.org/10.1371/journal.pone.0069399), AP05 [Alacaci](https://escholarship.org/uc/item/557238g2), SS95 [Selden](https://doi.org/10.1007/BF01274210), HS98 [Harel–Sowder](https://doi.org/10.1080/14794802.2023.2261435) (via Nardi), IA12 [Inglis–Alcock](https://doi.org/10.5951/jresematheduc.43.4.0358), MR12 [Mejía-Ramos](https://doi.org/10.1007/s10649-011-9349-7), P06 [Polycarpou](https://doi.org/10.1145/1185448.1185579), K26 [Khera](https://nemo.asee.org/public/conferences/374/papers/51752/view), NE25 [Neuhaus-Eckhardt](https://doi.org/10.1007/s10763-025-10621-3), IN13 [Inglis](https://doi.org/10.1111/tops.12019).
- **Proof assistants and verification:** IT23 [Iannone–Thoma](https://doi.org/10.1080/0020739X.2023.2178981), KK26 [Keenan](https://arxiv.org/abs/2608.23309), MZJC25 [Mugnier](https://doi.org/10.1145/3763181), BK18 [Böhne–Kreitz](https://doi.org/10.4204/EPTCS.267.1), M10 [Mannila](https://files.eric.ed.gov/fulltext/EJ1064303.pdf), LAM18 [Lamport](https://lamport.azurewebsites.net/tla/inductive-invariant.pdf), SDT22 [Schultz](https://arxiv.org/abs/2205.06360).
- **Specification and tutors:** LK24 [Lu–Krishnamurthi](https://doi.org/10.1145/3649823), JS24 [Jovanovic–Sullivan](https://arxiv.org/abs/2402.06624), GSNK22 [Greenman](https://doi.org/10.22152/programming-journal.org/2023/7/7), LTLT [LTL-Tutor](https://doi.org/10.1007/978-3-031-98685-7_9), D17 [Danas](https://doi.org/10.1007/978-3-319-66197-1_11), WK19 [Wrenn](https://doi.org/10.1145/3291279.3339416), PAFK26 [Prasad](https://doi.org/10.4230/LIPIcs.ECOOP.2026.22).
- **Concurrency, SQL and AI:** K01 [Kolikant](https://doi.org/10.1076/csed.11.3.221.3831), SMK21 [Strömbäck](https://doi.org/10.15388/infedu.2021.29), L08 [Lu](https://doi.org/10.1145/1346281.1346323), KOLI23 [Koli](https://doi.org/10.1145/3631802.3631821), T22 [Toussaint](https://doi.org/10.14778/3551793.3551818), DO26 [Deutsch–Oca](https://nemo.asee.org/public/conferences/374/papers/53628/view).
- **Documentation:** Postgres [PGI](https://www.postgresql.org/docs/18/transaction-iso.html), [PGC](https://www.postgresql.org/docs/18/ddl-constraints.html), [PGN](https://www.postgresql.org/docs/18/datatype-numeric.html); Lean [LEANNAT](https://lean-lang.org/doc/reference/latest/Basic-Types/Natural-Numbers/) (read 2026-10-23; links to the 4.36.0-rc1 manual), [LEANVP](https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/).
- **[RUN]:** Z3 5.3.1; PostgreSQL 18.6; TLC 1.8.0, a nightly (stable is 1.7.4); core Lean 4.35.0. Re-run and record the argv before quoting in course copy.

---

## 3. Assessment architecture

### 3.1 Principle and records
- **Checkers decide, about the learner too:** solvers, TLC, the interpreter, Lean (`lake comparator` against a pinned challenge statement, plus `leanchecker`), or keys verified by tools at build time. Lean's manual treats "un-reviewed AI-generated proofs" as possibly malicious and prescribes the comparator (LEANVP).
- **LLMs propose** prequestions, adversarial cases and hints; a witness certifies each flaw, a proof or stated bound each sound case. No runtime LLM-generated graded items and no LLM grades (row 31); the review digest deletes the bring-your-own-key examiner.
- **The course stamps its own assessments:** a passed Defence is TESTED (n items, unseen seeds), not PROVED competence; a self-grade is ASSUMED.
- **Claims and Evidence are separate.** Claims record what artifacts establish; agents can produce them, so they never move "signed off". Evidence credits only unassisted, checker-graded work on unseen seeds; assisted work, practice and self-grades are logged uncredited (rows 28, 33; the rule is [D]). Receipts carry `assisted: none | explain | code`, labelled self-reported.
- **Guardrails:** claim card and theorem statement before any agent attempt; deny hooks on `TODO(you)` and challenge files; the comparator as statement lock; an explanation gate before hints (row 34).

### 3.2 Checker-graded constructed responses (family names follow the review digest)

| Family | Learner produces | Grader | Stages | Caveat |
|---|---|---|---|---|
| negate-it / spec-it | Negation, violation query, property, policy | Z3 checks P⇒R and R⇒P over a decidable fragment or bounded domain, returning a distinguishing state; non-vacuity required | 0, 1, 4, 7 | Equivalence is not intent, so requirement fit uses MTF scenarios |
| WP-it | Weakest precondition | Z3 equivalence (WP is unique up to equivalence) | 4 | Derive by hand first |
| find-the-witness | Model, state, trace, history, state pair, observation | Interpreter or evaluator; no stored key | 1, 3, 5–9 | Then ask for the *class* (row 24) |
| CTI-or-bug | Inductive invariant | Check Init⇒Inv, Inv∧Next⇒Inv′ and Inv⇒Safety; if sat, search for reachability | 4, 5 | TLC's complete method "works only on extremely tiny models"; use Z3 for linear state |
| trace-allowed / lasso-or-not | Satisfying and violating traces; lassos | TLC state graph; lasso validator | 5, 8 | Ask for both traces |
| anomaly-ID / leaks-to-observer | History class; state pair the observer distinguishes | History checker; paired-state evaluator | 6, 7 | Replay Bench histories (PGlite is single-connection) |
| call-it + MTF | Verdict and confidence; true/false over ~5 scenarios | Keys computed at grade time | all | Makes requirement mismatch gradable |
| proof-structure | Next goal; Proof Blocks order; which hypothesis is needed | Goals from real elaboration; DAG grading; hypothesis deletion in CI | 2, 3, 9 | Only after reading (row 14) |
| defend | Predictions about seeded mutations of the learner's own work | comparator, `leanchecker`, TLC, Z3, cargo | 1–9 | Face validity only (C/D) |

**Modes:** *practice* shows counterexamples and class hints; *probe* is one shot with feedback after submission, because counterexamples invite special-case patching (row 21). Graded items stay in decidable fragments, with labelled bounded checking as the fallback; `unknown` instances are discarded.

### 3.3 Generators
- **Seeds and structure:** seeds drawn at grade time; 2–4 structurally different templates per KC family (row 27), banded by operator count, quantifier alternation, trace length and process count.
- **Distractors** are §2 mutants, each tool-checked as distinct from the key. Mutation makes the key the centroid of the options, so lint for convergence as well as length and absolute words, and run cue ablation and blind-strategy CI (always reject, always accept, always pick the longest).
- **Every number in a key or in copy comes from a recorded run** with engine, version and argv. v1's "212 distinct states" was invented; TLC finds 11 [RUN].
- **LLMs may draft reading prequestions,** because the text that follows supplies the answer (row 5). Verdict items stay generated and tool-checked.

### 3.4 Calibration (Call It)
- **When to ask:** first runs of authored cells, and generated items. Free and Bench runs stay ungated, with an expert skip. Only the first call counts.
- **Levels per item.** v1's 55/75/95 forces overconfidence on three-way verdicts, where chance is 33%. Print the chance level and make it the lowest option [D].
- **Certainty-based marking (CBM).** The review proposes CBM payoffs (+1/0, +2/−2, +3/−6) as the headline. CBM is proper, but penalties mix in risk attitude (row 30), so use it for feedback, never for credit. Show the payoffs before the learner chooses.
- **Display:** lead with bias (mean confidence − accuracy) and a reliability diagram with Wilson intervals, resolution shown separately; count post-instruction calls only, assisted and unassisted apart (row 35); no diagnosis below about n=20–30 per band. A Brier score falls as knowledge rises (row 29), and v1's "at 80% right only 58%" rests on about 12 calls per bucket: 95% CI 0.32–0.81 [D].
- **Sure-and-wrong calls:** reasoning-level feedback, then fresh variants at ~1 day and ~1 week (row 6).
- **Self-judgments:** delayed, cue-only, for scheduling only; test reactivity within the learner (row 8).

### 3.5 The Defence (replaces the self-graded viva)

Untimed, over ≥2 sessions, within a week of the lab (a gap before a separate exam lost learners: [Serth 2022](https://doi.org/10.3389/feduc.2022.1008545)).

| Part | Content | Graded by | ≈min |
|---|---|---|---|
| A. Probes | 12 unseen-seed items from ≥3 families, including Prove-it and spec-it responses; agent closed; a call on each; the roadmap's completion tests become items | checkers | 35 |
| B. `defend` | 4–6 mutations: drop a hypothesis, weaken a guard, ℤ→ℕ or BitVec 64, split an atomic action, drop weak fairness, widen the observer. Predict first | Lean, TLC, Z3, cargo | 20 |
| C. Audit | 2–4 cases, at least 1 sound; typed evidence | evaluator plus keys | 15 |
| D. Explain-back | 2-minute oral; a 3-idea self-check, compared with Part A | uncredited | 10 |

- **Signed off:** A–C ≥75% overall and each part ≥60%, across ≥2 sessions, with the Wilson interval shown (10 of 12 gives 0.55–0.95 [D]).
- **Settled:** one probe per KC returns at ≥30 days, feeding VRC₃₀.
- **Grade B−:** retrieval (A), case sampling (row 28), explanation (row 47). Part B has no outcome data.
- **Formalize-then-check stays formative,** because the formalizer can repair vague English.

### 3.6 Audit Desk
- **Base rate.** v1 has 4 sound cases out of 32, so rejecting everything scores 87.5% precision and 100% recall [D]. Draw a 30–60% sound share per session from a seed; score with per-class recall, balanced accuracy and Wilson intervals, reporting per class only from n≥10.
- **Findings need an explanation (row 16) and typed evidence:** a witness, the offending axiom, mismatched identifiers, paired states, or a scenario the theorem permits but the requirement forbids.
- **Placement:** after its lab, never locked; re-check at one week.
- **Case types:** statement-hidden, distinguishing-scenario and shared-misreading cases; late stages audit the learner's own agent PRs.

### 3.7 Constraints from executed runs
- **Z3.** npm `z3-solver` needs COOP/COEP [RUN]; the review measured Pyodide Z3Py working without isolation [R2].
- **TLC.** `-dumpTrace json` works in 1.8.0 [RUN] and is absent from stable 1.7.4 [R2].
- **Lean.** Core Lean needs no Mathlib [RUN]. RESULTS.md's "~200 MB toolchain" is an implication-line estimate, not a run, and the review measured more [R2]; quote sizes only from runs.

---

## 4. Persistence and transfer for a 9–18-month solo arc

### 4.1 Stance, hours, phases
- **Design for resumption, not completion.** 19.5% of HarvardX learners who intended to finish did ([Reich 2014](https://www.edweek.org/leadership/opinion-explaining-mooc-completion-and-retention-in-the-context-of-student-intent/2014/12)); in OMSCS a hiatus delayed graduation without raising dropout (row 41). Every stage ends in claims the learner can apply to their own system.
- **Hours run out before intent.** Students study 5–8 h/week less than they plan ([Oreopoulos & Petronijevic 2019](https://doi.org/10.3386/w26059)); at Buehler's 1.64, v1's 31.5–61 weeks become about 12–23 months [D]. Twin labs with platform work, count the hours once, and show a projected range, never "behind".

| Phase | Risk | Response |
|---|---|---|
| Ignition (months 0–3) | Quitting before two wins; toolchain and Lean syntax; Rust false friends ([Shrestha 2020](https://doi.org/10.1145/3377811.3380352)) | Project 00 on day 1; 2 claims by ~week 4; a value story before each tool (row 46); a false-friend card per tool |
| Long middle (3–9) | Novelty gone; habit forming; first hiatus; competing projects; decay | Twins; a range target with reserve; re-entry; a monthly retro; Lean keep-alive |
| Assembly (9–18+) | Sprawl; perfectionism | Stage 10's report doubles as the learner's proof report (proved, model-checked, tested, enforced, assumed). Publish artifacts, not identity ([Gollwitzer 2009](https://doi.org/10.1111/j.1467-9280.2009.02336.x)) |

### 4.2 The week is the unit
- **Shape:** two Bench blocks of 90–150 minutes on 2–3 self-chosen days, at any time (flexible timing beat fixed windows: [Beshears 2021](https://doi.org/10.1287/mnsc.2020.3706)), plus a Keep block.
- **Target:** a range ([Scott 2013](https://doi.org/10.1086/670766)) with two explicit reserve weeks per 12 ([Sharif 2017](https://doi.org/10.1509/jmr.15.0231)).
- **Rhythm:** "met in k of the last 12 weeks" (target ≥8), graded or Bench work only; a missed week can be made up within 7 days; declared breaks pause the window; copy is gain-framed (row 40).
- **Re-entry, never an overdue count:** after ≥14 idle days, "Back at the bench" (20–30 minutes: last claim card, 3 re-finds, 1 call, next artifact restated); after ≥6 weeks, restart at a landmark ([Dai 2014](https://doi.org/10.1287/mnsc.2014.1901)) with a lighter target for 2 weeks.
- **Monitoring** (row 38): a 5-minute weekly Ledger review ("what I can now reason about", roadmap rule 6); a 15-minute monthly retro setting a 2–4-week proximal goal; accumulated progress shown early in a stage, what remains shown late ([Koo 2012](https://doi.org/10.1086/663827)).

### 4.3 Motivation and community
- **Competence and value:** identified regulation predicts persistence ([Howard 2021](https://doi.org/10.1177/1745691620966789)); "signed off" is a belt, large-grained and never revoked (row 42); erosion is planned and repairable; each stage offers 2–4 real choices ([Patall 2008](https://doi.org/10.1037/0033-2909.134.2.270)).
- **Venues at the point of need:** Lean Zulip "new members" with a minimal working example ([meet](https://leanprover-community.github.io/meet.html)); the TLA+ monthly meeting ([CONTRIBUTING](https://github.com/tlaplus/tlaplus/blob/master/CONTRIBUTING.md)); Alloy Discourse ([community](https://alloytools.org/community.html)).
- **One respected human** reviews the claim cards monthly. Commitment rose with the status of the person told ([Klein 2020](https://doi.org/10.1037/apl0000441)), and coaching raised persistence ([Bettinger 2014](https://doi.org/10.3102/0162373713500523)).
- **No** cohorts, leaderboards or accountability-partner prompts (row 39); exemplars only after a draft, since exemplary peer work caused quitting ([Rogers 2016](https://doi.org/10.1177/0956797615623770)).

### 4.4 Transfer
- **Locate the distance** ([Barnett & Ceci 2002](https://doi.org/10.1037/0033-2909.128.4.612)). Twinned labs are near in domain, repo and time. The far dimensions are functional (exercise vs production) and social (alone vs with agents), so design for those.
- **Hug:** the lab *is* platform work (row 44).
- **Bridge:** after each stage, re-stamp the claims about the learner's own system that it covers. Stage 2: conservation under transfers. Stage 5: a hold resolves at most once, and eventually under a stated fairness assumption. Stage 6: transfers under SERIALIZABLE with retries. Stage 7: a read policy, with an observer and a declassification list. Stage 8: outbox effects, with the provider's idempotency in the trusted base.
- **Errors and comparison:** keep specimens (row 43); ask what differs from the course twin and whether the verdict changes (row 15); the gap taxonomy becomes a review checklist for the learner's own system.
- **Measure:** applied claims per month as a trajectory ([Ford 2018](https://doi.org/10.1146/annurev-orgpsych-032117-104443)); VRC₃₀; hours to a first useful result in a Deferred Shelf tool ([Bransford 1999](https://doi.org/10.3102/0091732X024001061)).

### 4.5 Decay and stage order
- **Path A, the roadmap's order, is the default.** Lean sits idle for 14–28 weeks across Stages 5–8, which at row 45's rate would cost about 25–50% [D, extrapolated from procedural skills]. Keep it alive with a 20–30-minute Lean item every 2–3 weeks (L4's dose [D]; the review's thin Prove-it thread [R2]).
- **Path B, for a learner who wants concurrency and effect models early:** 0 → 1 → 5 → 6a (isolation) → 8 → 4a (VCs by hand) → 7 → 2 → 3 → 4b → 6b → 9 → 10. The Lean gap falls to about 3–5 weeks [D]. Validate dependencies first, and key erosions to seams, not stage numbers.

---

## 5. Anti-patterns

| Anti-pattern | Evidence | Instead |
|---|---|---|
| v1's locks: drawers that open after two misses, audit cases unlocked by "set", Run gated on every call | Mastery gating cuts completion (row 37) | A computed status; calls only on first runs |
| Self- or LLM-graded viva | Rows 28, 31 | The Defence |
| Progress = Claims | Substitution harms learning (row 33) | Unassisted Evidence |
| A Brier headline from 40 calls; 55/75/95 on three-way verdicts | Row 29; CI 0.32–0.81 [D] | Bias, a reliability diagram, intervals, a minimum n |
| 4 sound audit cases in 32 | Reject-all scores 87.5% precision, 100% recall [D] | 30–60% sound |
| Completion blanks plus self-explanation prompts | Rows 10, 12 | Prompts on revealed steps only |
| Automation closing the taught step | Row 23 | Manual mode |
| "Invariant" taught as inductive, so sat ⇒ bug | O3 | A three-way verdict |
| Counterexample-only or minimal-only feedback | Rows 21, 24 | Class hints; generalisation |
| Answer-giving chat, LLM graders, runtime LLM items | Rows 31, 33; an LLM "randomiser" picked one case in 6 of 7 exams ([Ipeirotis 2026](https://arxiv.org/abs/2603.18221) [pre]) | An explanation gate; checkers |
| Parameter-only generators; longest-option keys | Row 27 | Structural variety, lints, blind-strategy CI |
| XP, badges, leaderboards, daily counters, loss framing | Rows 37, 40, 42 | Competence statements |
| "Due" notes and deadlines | Self-set deadlines didn't help ([Bisin 2020](https://doi.org/10.1016/j.geb.2019.11.010)); the classic study was **retracted** 2026-09-02 ([notice](https://doi.org/10.1177/09567976261488042)) | Windows; soft commitments |
| Timed Defences | No validity evidence; harm appeared under speed pressure (row 33) | Untimed |
| Invented numbers | "212 states" (real: 11); a bigint "wrap" where Postgres raises 22003 [RUN] | Recorded runs with argv |
| Myths | Learning styles ([Pashler](https://digitalcommons.usf.edu/psy_facpub/1765/) [KS]); growth-mindset messaging, d=0.05 ([Macnamara 2023](https://doi.org/10.1037/bul0000352)); "derring" ([Mera 2025](https://doi.org/10.1037/xge0001707)); forced expanding gaps or fading (rows 2, 18); immersive 3D, ES 0.24 ([Wu 2020](https://doi.org/10.1111/bjet.13023)) | Don't build |
| Promising far transfer; "only 10% transfers" | Row 44; [Ford 2011](https://doi.org/10.1002/piq.20108) | Measured near transfer |

---

## 6. Dosage targets

| Dose | Target | Basis | Grade |
|---|---|---|---|
| Study | 6–10 h/week; plan at the pessimistic end (×1.6) | Row 41 | B |
| Segment | 12–15 min, ending in a graded interaction; one tool per session | [R2]; [A3] | D |
| New tools | ≤1 per stage; first contact in the browser after a primer of ≥5 min | Row 18; first install was kernelspace's top drop-off risk [KS] | B/D |
| KC graph | ~60–100 KCs, ~25 of them threshold KCs that spiral | [R2]; [A3] | D |
| Per KC | In the lesson: a prequestion, 1–2 calls and an exit item. Then ≥8 graded opportunities in 60 days (at ~1–3, 7, 21 and 45–60 days) | Rows 1, 5; median 7.24 opportunities to reach 80% ([Koedinger 2023](https://doi.org/10.1073/pnas.2221311120) [KS], an analogy) | B/D |
| Maintenance | Gaps of ~3–5 weeks, or ts-fsrs at 0.85–0.90 retention | Rows 2–3 | A |
| Signed off; settled | Fresh items correct in ≥3 spaced sessions plus the Defence (drop correct items; misses return ≤2×); settled = a fresh probe per KC at ≥30 days | Row 3 | B |
| Sure-and-wrong re-tests | At ~1 day and ~1 week | Row 6 | B |
| Keep | ~30 min/week: one block plus 5-min warm-ups; recompute from logged item times | [D]: 80 KCs × ~10 reviews × ~2 min | D |
| Interleaving | After the exit item; ≤50% of a session; only within confusable sets (verdicts, property kinds, gap classes, anomalies, fairness, encodings, correspondence) | Row 4; [A3] | A/D |
| Self-explanation | One 15–20-minute unit before Stage 2; ≤1 prompt per subgoal | Row 13 | B |
| Proof Blocks | After reading; 1–2 distractors; twice the time | Row 14 | B |
| CTI items | ≥4, interleaved through Stage 9 | [A3] | D |
| Defence | 60–90 min over ≥2 sessions, within a week of the lab | §3.5 | B− |
| Audit | 30–60% sound; ≥6 cases per gap class; 2–3 a week | Row 16; [A3] | A/D |
| Claims | 2 by ~week 4; ≤2 weeks without a new claim or specimen (v1's Stage 9 goes 3.3–5.6) | Proximal subgoals ([Bandura 1981](https://doi.org/10.1037/0022-3514.41.3.586), children) [D] | C/D |
| Writing (15%) | Short prompted writes; a 600–1,000-word note every 2–3 stages | Row 47 | A (small) |
| Plans | 1–2, re-prompted at stage start, month start and re-entry | Row 39 | A (small) |
| Lean keep-alive | 20–30 min every 2–3 weeks while Lean is idle | Row 45 | D |

---

## 7. Open questions and n-of-1 trials

**Open:** Does retrieval help when constructing proofs and VCs (row 1)? Does "no prompts on blanks" (row 12) hold for Lean tactics? Do LTL misconceptions carry over to TLA+, and do learners read CTIs as bugs? How fast do proof and model-checking skills decay? Is Defence Part B valid, and does the Defence fit a 6–10-hour week? Do CBM penalties change this learner's calls?

**Pre-registered within-learner comparisons** (kernelspace §9), with 30-day accuracy on fresh seeds as the outcome and keep/kill thresholds fixed in advance: layer-2 feedback open vs collapsed in expert KCs; confidence prompts on reviews vs none; Proof Blocks distractors vs none; a counterexample vs a class hint; reserve weeks vs none.

Report results descriptively. One learner supports no causal claims.
