# L1 — Learning science for Plinth: inherit kernelspace's evidence, update it, extend it

**Date:** 2026-10-20. Revised the same day by a second verification pass, and on 2026-10-21 by a third (§6).

**Scope:** the evidence base for the Plinth formal-methods course: the roadmap's stages 1–10, and the v1 `PLAN.md` and `DESIGN.md`. This report:
- inherits kernelspace's adversarially verified dossiers (2026-10-03) and the evidence table in `kernelspace-PLAN-100X.md` Appendix A;
- updates them with 2024–2026 work;
- extends them to techniques kernelspace did not need: reading and writing proofs, specifications and verification conditions.

**Learner:** an experienced backend engineer who finished kernelspace (Rust-fluent, systems-literate). Solo study, 6–10 h/week for 9–18 months, while building their own system with coding agents.

**Labels**
- **[V]** I checked it against a primary record: an abstract or full text, via ERIC, PubMed, PMC, OpenAlex, Semantic Scholar, Crossref, arXiv, NBER, npm, GitHub or the author's page.
- **[KS]** It comes from kernelspace's verification logs (2026-10-03); I did not re-check it.
- **[L2], [L3], [L4]** It comes from a sibling dossier written today in this `research/` folder; I did not re-check it.
- **[2H]** It is second-hand.
- **[title]** Only the bibliographic record was reachable.
- **[unverified]** It is not confirmed.

**Grades**
- **A:** meta-analysis of mostly experimental studies.
- **B:** several RCTs or experiments.
- **C:** one study, or correlational or qualitative evidence.
- **D:** theory or practitioner consensus.

**Method**
- **Pass 1** ran out of web-search budget, so it verified known citations by DOI only.
- **Pass 2** re-checked every title-only and second-hand item it could reach (ERIC and PubMed APIs, OpenAlex, Crossref, PMC full text).
  - It ran a targeted 2024–2026 sweep: OpenAlex search plus four web searches. The sweep is not systematic, because OpenAlex and Semantic Scholar rate-limited part-way.
  - It corrected one inherited number (K1).
  - It found a 2025 meta-analysis that changes the case for the Audit Desk (U11).
- **Pass 3** (2026-10-21) re-read the report after an interrupted run.
  - It spot-checked 18 records against abstracts, and corrected two overstatements: delayed self-judgments (E4) and Faded Parsons problems (E1).
  - It added missing URLs, the original worked-example and expertise-reversal sources (E1), and 2024–2026 prequestion studies (U25).
- **Sibling dossiers** cover adjacent ground: L2 (proof and formal-methods education), L3 (assessment and AI) and L4 (persistence and transfer). This report links to them rather than repeating them.

---

## 1. Summary

1. **kernelspace's evidence base mostly carries over.** These all apply:
   - retrieval practice (lab g≈0.50; classroom g=0.499 over 222 studies);
   - spaced retrieval (g=0.74 against massed);
   - prequestions (g=0.54 on the content asked about);
   - case comparison (d=.50);
   - high-information feedback, informational rewards, soft gates and guarded AI.

   v1 already has the right mechanics: Call It, the Specimen Cabinet with Re-find, the Audit Desk, the Theater, Goal Replay and the viva. What is missing is scaffolding for formal notation, fresh-item generation and valid assessment.
2. **Expertise reversal is the central design constraint.** A 2025 meta-analysis found that instructional assistance helps novices (d=+0.505) and hurts learners with high prior knowledge (d=−0.428). Studies from 2024–2026 extend the pattern to feedback detail, pre-questions, comparative prompts and interleaving. This learner is an expert in systems and a novice in formal reasoning, so scaffolding is set per knowledge component (KC), not per course.
3. **Worked examples work (g=0.48), but for proofs, where the prompts go matters.** Examples work best faded backward, with prompts to name the principle.
   - **The warning:** completion blanks combined with self-explanation prompts *impaired* proof learning, while the prompts alone helped (N=111).
   - **Proof Blocks:** they matched proof writing in far less time (N=332).
   - **The limit:** examples build knowledge, not independent skill.

   Goal Replay therefore becomes a faded chain that ends in an unscaffolded Bench proof.
4. **Self-explanation training is the cheapest lever for proofs.** A short booklet raised proof comprehension by d=0.950, and a 15-minute in-lecture version had a lasting effect. The booklet is CC BY-SA. In maths, prompted self-explanation gives small-to-moderate *immediate* gains, but evidence on retention is thin, so pair it with successive relearning.
5. **A raw tool verdict is the weakest form of feedback.** "sat" or "No error has been found" only says right or wrong: ES 0.05, against 0.49 for elaborated feedback.
   - A network meta-analysis of 77 experiments ranks elaborated feedback first, for recall and for transfer.
   - Showing the learner's own wrong answer beside the right one raised transfer.
   - Detail adds load for experts.

   So feedback is layered: the witness and a one-line "why" always appear, and the rest can be collapsed.
6. **Call It is well founded.**
   - Prediction produces surprise, surprise drives learning, and 2025 prediction-error models explain the testing effect.
   - Prequestions placed before *each* segment of a text help (2024), and ChatGPT-written prequestions worked as well as human-written ones (2026).
   - Confidently held errors get corrected more often, but they also come back more often after a week.

   Four adjustments follow:
   - put a call before each lesson segment, not only at the start;
   - re-test sure-and-wrong calls on fresh items at about 1 day and about 1 week;
   - take self-judgments after a delay, showing the question without its answer. Delayed judgments are far more accurate than immediate ones (g=0.93), but the delays studied were minutes, so asking in a later session is my extrapolation;
   - test whether confidence prompts on review items are reactive.
7. **Formal methods is mostly a set of discrimination tasks.** Learners must tell apart:
   - safety from liveness;
   - proof from bounded check from test;
   - sat from unsat from unknown;
   - the 12 gap classes.

   Interleaving helps most when categories differ subtly (g up to 0.65–0.66), but mainly once learners know something. Side-by-side comparison beats studying in sequence (CS2 replication, N=241). Use pairs on first exposure, and interleave afterwards.
8. **The Audit Desk is justified as practice of the target skill, not as a strong learning technique.**
   - Learning from other people's errors averages only g=.136 (2025 meta-analysis, 42 papers), and more when the error must be explained.
   - Learners with weak prior knowledge do better with correct examples only.

   So the Desk should require an explanation with every finding, offer novice-area cases after correct examples, and be judged at one week.
9. **Nothing should lock, and the scheduler can stay simple.**
   - Self-paced mastery gating lowers completion.
   - "Set" should mean correct answers on fresh items in at least 3 spaced sessions.
   - Spacing is the active ingredient (g=0.74); whether the gaps expand or stay even barely matters (g=0.034).

   Remove v1's locks on theory drawers and audit cases.
10. **Switching tools has a real cost, and evidence specific to formal methods is thin.**
    - **Tools:** at most one new tool per course, one running example in every tool, the browser first, and instructions inside the lab files.
    - **Measurement:** the formal-methods evidence is grade C–D, and most effect sizes come from K-12 or undergraduate samples. Measure on the device (VRK₃₀: fresh, unassisted items answered correctly 30 or more days later) and compare variants within the learner.
    - **Myths to avoid:** learning styles; "derring", deliberately making your own errors while studying, which failed two preregistered replications; growth-mindset messaging (d=0.05, not significant after bias correction).

---

## 2. Findings

### 2.0 How to read the numbers

- In ~750 education RCTs the median effect is about 0.10 SD, and 0.20 or more counts as large for field interventions (Kraft 2020) [KS] <https://doi.org/10.3102/0013189X20912798>.
- The meta-analytic effects below come from aligned, researcher-made tests, mostly with K-12 or undergraduate samples, and they do not add up.
- None of them targets engineers learning formal methods. For one adult learner, an effect size means "more likely than not to help", not a forecast.
- **Confidence** in each finding combines its grade and its label:
  - **High:** [V] with grade A or B.
  - **Medium:** [V] with grade C, or [KS] or [L2]–[L4] with grade A or B.
  - **Low:** grade D, or anything tagged [title], [2H] or [unverified].

  Design implications marked [design inference] are mine, not the sources'.

### 2.1 Inherited from kernelspace (still applies)

**Sources.**
- The dossiers are `kernelspace-100x-evidence/research/{learning-science,computing-education,ai-tutoring,games-3d,exemplars,community}.md`.
- The spine is `kernelspace-PLAN-100X.md` §0, §3 and §5:
  - an evidence ledger and a KC graph;
  - the loop Predict → Play → Build → Prove → Keep;
  - generators with fresh seeds, and a Today review;
  - VRK₃₀ as the north star;
  - honest rewards, nothing locks, and guarded AI.

Rows K25–K32 are applicable principles that pass 1 missed.

| # | Principle | Effect (population) | Boundary | Grade | Source |
|---|---|---|---|---|---|
| K1 | Retrieval practice | **Rowland 2014 (lab) [KS]:** g=0.50 vs restudy; cued recall 0.61; free recall and recognition 0.29; ≈0.73 with feedback vs 0.39 without. **Adesope 2017 [KS]:** g=0.61 vs all controls; 0.51 vs restudy; 0.93 vs filler; mixed formats 0.80. **Classroom:** g=0.499 over 222 studies and 48,478 students (Yang 2021) [V]; 57% of 49 effects medium or large (Agarwal 2021) [V] | May shrink for high element-interactivity material (van Gog & Sweller vs Karpicke & Aue 2015) [KS]. The classroom effect varies with feedback, format match and repetitions. Only 6% of classroom studies are non-WEIRD | A | <https://doi.org/10.1037/a0037559> · <https://doi.org/10.3102/0034654316689306> · <https://doi.org/10.1037/bul0000309> · <https://doi.org/10.1007/s10648-021-09595-9> |
| K2 | Transfer of testing | d=0.40 | After bias correction, transfer needs application items or elaborated retrieval | A | Pan & Rickard 2018 [KS] <https://doi.org/10.1037/bul0000151> |
| K3 | Spacing | Best gap ≈5–10% of a 1-year horizon [KS]. Spaced vs massed retrieval g=0.74; expanding vs uniform gaps g=0.034, n.s. (29 studies) [V] | Mostly verbal material; expanding gaps help only with many exposures | A | Cepeda 2008 <https://doi.org/10.1111/j.1467-9280.2008.02209.x> · Latimier 2021 <https://doi.org/10.1007/s10648-020-09572-8> |
| K4 | Successive relearning | One relearning session raises recall substantially (see E5) | Mostly declarative (but see U7) | B | Rawson & Dunlosky 2022 [KS] <https://doi.org/10.1177/09637214221100484> |
| K5 | Interleaving | g=0.42; paintings 0.67, maths 0.34, words −0.39 | For discriminating similar categories; not for first exposure | A | Brunmair & Richter 2019 [KS] <https://doi.org/10.1037/bul0000209> |
| K6 | Prequestions | g=0.54 on asked content vs 0.04 on other content | Learners must study the answers afterwards | A | St. Hilaire 2023 [KS] <https://doi.org/10.3758/s13423-023-02353-8> |
| K7 | Problem solving before instruction | g=0.36 conceptual and transfer; −0.03 procedural | Needs prerequisites and a consolidation phase | A | Sinha & Kapur 2021 [KS] <https://doi.org/10.3102/00346543211019105> |
| K8 | Case comparison | d=.50 [.44, .56] | Larger when learners find similarities and the principle comes after | A | Alfieri 2013 [KS] <https://doi.org/10.1080/00461520.2013.775712> |
| K9 | Feedback | d=0.48 (435 studies, k=994, N>61,000). High-information 0.99 [0.82, 1.15] (k=42); corrective 0.46 (k=238); reward or punishment 0.24 (k=39). Controlled designs 0.42 vs pre-post 0.63; cognitive 0.51 vs motivational 0.33 [V, PMC full text] | High heterogeneity; the high-information figure rests on k=42; timing not coded | A | Wisniewski, Zierer & Hattie 2020 <https://doi.org/10.3389/fpsyg.2019.03087> · <https://pmc.ncbi.nlm.nih.gov/articles/PMC6987456/> |
| K10 | Rewards | Completion-contingent −0.36; informational positive feedback +0.33 | Weaker for college students | A | Deci, Koestner & Ryan 1999 [KS] <https://doi.org/10.1037/0033-2909.125.6.627> |
| K11 | Mastery gating | Positive, larger for weaker students; **self-paced mastery programs often reduce completion** | College classes | A | Kulik, Kulik & Bangert-Drowns 1990 [KS] <https://doi.org/10.3102/00346543060002265> |
| K12 | Practice dosage | ~65% correct after instruction; +2.5 pp per opportunity; median 7.24 opportunities to reach 80% | Learners differ mainly in prior knowledge | A | Koedinger 2023 [KS] <https://doi.org/10.1073/pnas.2221311120> |
| K13 | Tutoring benchmarks | Human d=0.79, step-based ITS 0.76; tutoring overall 0.33–0.37 SD; 2σ never replicated | — | A | VanLehn 2011 [KS] <https://doi.org/10.1080/00461520.2011.611369> · von Hippel 2024 [KS] <https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/> |
| K14 | Unguarded AI | Practice +48%, unassisted exam −17%; guarded tutor ≈0 | One Turkish high school | B/C | Bastani 2025 [KS] <https://doi.org/10.1073/pnas.2422633122> |
| K15 | AI while learning a library | Quiz 50% vs 67%, d=0.738; largest gap on debugging | **Still a preprint** (v2 2026-02-01) [V]; N=52; speed-incentivised | C | Shen & Tamkin <https://arxiv.org/abs/2601.20245> |
| K16 | Explanation gate | Failure on a no-AI task: 77% unrestricted vs 39% gated | **Still a preprint** (v2 2026-03-31) [V]; N=78 | C | Sankaranarayanan <https://arxiv.org/abs/2602.20206> |
| K17 | Engagement binds | ITT 0.06–0.08 SD/year; help sought in 17% of sessions with a mistake [V] | Middle school | B | Oreopoulos & Low, NBER w35620 <https://www.nber.org/papers/w35620> |
| K18 | Simulations and game form | Simulation g=0.85 (examples help novices, reflection helps experts). Games: multi-session 0.44 vs single 0.08; schematic 0.48 vs realistic −0.01. The rule should be the concept | Small k for game moderators | A/C | Chernikova 2020 [KS] <https://doi.org/10.3102/0034654320933544> · Clark 2016 [KS] <https://pmc.ncbi.nlm.nih.gov/articles/PMC4748544/> · Habgood & Ainsworth 2011 [KS] <https://shura.shu.ac.uk/3556/> |
| K19 | Engagement with visualisations | How learners use a visualisation matters more than what it shows (24 experiments) | Mostly CS1/CS2 | A/D | Hundhausen 2002 [KS] <https://faculty.cc.gatech.edu/~john.stasko/papers/jvlc02.pdf> · Naps 2002 [KS] <https://doi.org/10.1145/960568.782998> |
| K20 | Read before writing; PRIMM; subgoals | Tracing and explaining predict writing. PRIMM scored above control (no ES). Subgoal labels cut failures and withdrawals (N=265) | CS1, K-12 | B/C | Lister 2004 [KS] <https://www.cs.auckland.ac.nz/~j-hamer/ITiCSE04-wg.pdf> · Sentance 2019 [KS] <https://doi.org/10.1080/08993408.2019.1608781> · Margulieux 2020 [KS] <https://doi.org/10.1186/s40594-020-00222-7> |
| K21 | Conceptual model plus targeted rewrites | Rust ownership model d=0.56 (N=342); 10 of 12 rewrites significant, +20% on average | Self-selected readers | C | Crichton 2023 [KS] <https://cel.cs.brown.edu/paper/ownership-conceptual-model/> · Crichton & Krishnamurthi 2024 [KS] <https://arxiv.org/abs/2401.01257> |
| K22 | Motivation | At scale: plan-making ~20× smaller; value-relevance +2.79 pp (subgroup); public identity intentions acted on less; repairable streaks blunt drop-off [KS]. Utility value: relevance writing raised interest and grades for low-expectancy high-school students (RCT) [V]. Habits and re-entry: L4 | The utility-value effect holds for low-expectancy students | A/B | Kizilcec 2020 [KS] <https://pmc.ncbi.nlm.nih.gov/articles/PMC7334459> · Gollwitzer 2009 [KS] <https://pubmed.ncbi.nlm.nih.gov/19389130/> · Silverman & Barasch 2023 [KS] <https://doi.org/10.1093/jcr/ucac029> · Hulleman & Harackiewicz 2009 <https://doi.org/10.1126/science.1177067> |
| K23 | Fluency illusions | Active learning felt worse and worked better | — | B | Deslauriers 2019 [KS] <https://doi.org/10.1073/pnas.1821936116> |
| K24 | Scheduler | FSRS-7 "recency": log loss 0.3363, AUC 0.7243; neural models rank above all FSRS variants; `ts-fsrs` 5.4.2 is npm `latest` [V 2026-10-20] | Fitted to flashcards; skills need implicit credit across a KC graph, as in Math Academy's FIRe [KS] <https://justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/> | D | <https://github.com/open-spaced-repetition/srs-benchmark> · <https://registry.npmjs.org/ts-fsrs/latest> |
| K25 | Doing beats watching (ICAP, doer effect) | One SD more *doing* gave >6× the learning of one SD more reading or watching [V]. ICAP: interactive > constructive > active > passive [V]. Active learning +0.47 SD (225 STEM studies) [KS] | One MOOC, correlational. Operating an instrument is only "active"; the gains come from predictions and explanations | A/C | Koedinger 2015 <https://doi.org/10.1145/2724660.2724681> · Chi & Wylie 2014 <https://eric.ed.gov/?id=EJ1044018> · Freeman 2014 [KS] <https://doi.org/10.1073/pnas.1319030111> |
| K26 | Predict, observe, explain | Passive demo watchers understood no better than those who saw none; predicting first helped | Physics lectures | C | Crouch 2004 [KS] <https://doi.org/10.1119/1.1707018> |
| K27 | Coherence (no seductive details) | Seductive details hinder learning; image type, pacing and test type moderate it [V, abstract]. Overall g=−0.33, retention −0.37 [KS, secondary]. Decorative illustrations d≈0.95 retention cost [KS, secondary] | Effect sizes not in the abstract | A | Sundararajan & Adesope 2020 <https://doi.org/10.1007/s10648-020-09522-4> · Tislar & Steelman 2021 [KS] <https://pmc.ncbi.nlm.nih.gov/articles/PMC8442593/> |
| K28 | Spatial ability and dynamic views | High-spatial learners gain more from visualisations, r=0.34 [0.28, 0.39] (27 experiments); dynamic and 3D views compensate for low spatial ability [V]. Animation vs static d≈0.37 [KS, unverified] | Visualisation-heavy material | A | Höffler 2010 <https://doi.org/10.1007/s10648-010-9126-7> · Höffler & Leutner 2007 [KS] <https://doi.org/10.1016/j.learninstruc.2007.09.013> |
| K29 | Error-message enhancement | Mixed: enhanced javac messages cut errors; enhanced syntax errors "appear ineffectual"; LLM explanations sometimes more actionable | The difficulty is often conceptual, not the wording | C | Becker 2016 [KS] <https://researchrepository.ucd.ie/entities/publication/d4b1c9ce-e7ff-48e7-b9b9-f0ebe0c15e8e> · Denny 2014 [KS] <https://researchspace.auckland.ac.nz/handle/2292/43268?show=full> · Leinonen 2023 [KS] <https://arxiv.org/abs/2210.11630> |
| K30 | Explain-in-plain-English and LLM grading | Explaining what code is *for* predicts writing it. Grading explanations by generating code from them agreed only moderately with humans and was lenient. AI oral exams: inter-model α 0.83–0.95 after deliberation, 63–83% of students found them more stressful, validity unproven [KS] | Formative only; see L3 | C | Smith & Zilles 2024 [KS] <https://doi.org/10.1145/3649217.3653582> · Ipeirotis & Rizakos 2026 [KS] <https://arxiv.org/abs/2603.18221> |
| K31 | GenAI gains favour self-regulated learners | Higher-order thinking g≈0.609 (29 experiments); high self-regulation 0.863 vs low 0.284 [KS]. ChatGPT raised essay scores but not knowledge or transfer, N=117 [KS] | Heterogeneous, short studies | A/C | <https://pmc.ncbi.nlm.nih.gov/articles/PMC12734368/> [KS] · Fan 2025 [KS] <https://doi.org/10.1111/bjet.13544> |
| K32 | Threshold concepts; optional interactivity | Troublesome, transformative concepts where learners can mimic understanding (a design lens) [KS]. Few readers use optional interactive elements [KS] | Interpretive or practitioner evidence | D | Boustedt 2007 [KS] <https://doi.org/10.1145/1227310.1227366> · Hohman 2020 [KS] <https://distill.pub/2020/communicating-with-interactive-articles/> |

### 2.2 Updates and corrections since kernelspace (2024–2026)

- **U1 · Expertise reversal now has a meta-analysis.**
  - Source: Tetzlaff, Simonsmeier, Peters & Brod, *L&I* 98, 102142 (online 2025-04-17): 176 effects, 60 experiments, N=5,924.
  - Low prior knowledge: high assistance was better (d=0.505). High prior knowledge: low assistance was better (d=−0.428).
  - The effect is asymmetric, and less clear for younger students and for the humanities.
  - [V] <https://doi.org/10.1016/j.learninstruc.2025.102142> · Grade A.
- **U2 · The worked-example meta-analysis is verified, and it corrects kernelspace.**
  - Source: Barbieri, Miller-Cotto, Clerjuste & Chawla, *EPR* 35 (2023): 55 studies, g=0.48.
  - Correct-only examples beat incorrect-only or mixed sets, and adding self-explanation prompts went with *smaller* effects.
  - kernelspace F7's "including from studying incorrect examples" needs that caveat.
  - [V via ERIC EJ1364058] <https://doi.org/10.1007/s10648-023-09745-1>
- **U3 · Erroneous examples have a 2025 systematic review.**
  - Source: Dieterich, Rumann & Rodemer, *EPR* 37(4), art. 94 (2025-09-22); 40 studies.
  - Erroneous examples often beat correct examples and sometimes tie. The benefit depends on whether errors are highlighted or explained, on prompt design, and on prior knowledge.
  - Prompts can overload learners, and the long-term evidence is contradictory.
  - [V] <https://doi.org/10.1007/s10648-025-10071-x>
- **U4–U5 · No change.** Shen & Tamkin and Sankaranarayanan are still preprints. The Khanmigo NBER figures, `ts-fsrs` and the srs-benchmark are unchanged [V].
- **U6 · Confidence prompts can be reactive.**
  - Requiring memory ratings made restudy beat retrieval, in three preregistered word-pair experiments (Higham et al. 2023, *EPR* 35(4), art. 98) [V] <https://doi.org/10.1007/s10648-023-09809-2>.
  - In a meta-analysis, reactivity to judgments of learning was small overall (g=0.054), but positive for related pairs (0.323) and for lists (0.384) (Double et al. 2018) [V] <https://doi.org/10.1080/09658211.2017.1404111>.
- **U7 · Successive relearning extends to procedures.** N=119 learners produced artificial-language grammar. Three or four relearning sessions on consecutive days raised their production scores 14 days later (Serfaty & Serrano, *Language Learning* 74(1)) [V] <https://doi.org/10.1111/lang.12585>.
- **U8–U10 · Smaller updates.**
  - Kolikant 2001 is now verified (E15).
  - Salden et al.'s ASU-hosted PDF returns 404; cite <https://doi.org/10.1007/s11251-009-9107-8> instead.
  - A 2026 spatial-contiguity meta-analysis (*J. Educators Online* 23(3); 28 studies, g=0.73) corroborates Noetel 2022, from a lower-tier venue [V] <https://doi.org/10.9743/jeo.2026.23.3.1>.
- **U11 · A 2025 meta-analysis puts erroneous examples at g=.136.**
  - Source: Alemdag, Eichelmann & Narciss, *Review of Educational Research* (online 2025-11-20): 42 papers, 177 effects, compared with correct examples or with problem solving.
  - The effect is weak but significant.
  - Requiring an explanation of the error raised it, whether through self-explanation prompts or an instructional explanation.
  - [V] <https://doi.org/10.3102/00346543251390901> · Grade A.
- **U12 · Practice first works for memory, but not automatically for generalisation.**
  - Source: Asher & Carvalho, *EPR* 38, art. 12 (2026-01-26): two experiments, N=597, teaching linear regression.
  - Practice with feedback of either kind beat a lecture on memory.
  - Generalisation needed explanatory feedback *and* enough prior knowledge.
  - Practice also improved calibration, and GPT-4o explanatory feedback raised interest among less-confident learners.
  - [V] <https://doi.org/10.1007/s10648-025-10103-6> · Grade B.
- **U13 · Expertise reversal also applies to feedback and pre-questions.**
  - Source: Huangfu et al., *BJET* 57(4) (2026-02-09): 352 Chinese university students learning from videos.
  - Elaborated feedback lowered extraneous load for novices and *raised* it for learners with high prior knowledge.
  - Retention was best for novices given pre-questions without feedback.
  - [V] <https://doi.org/10.1111/bjet.70046> · Grade C.
- **U14 · How to design feedback.**
  - **Network meta-analysis.** Mertens, Finn & Lindner 2022, *JEP* 114(8): 163 effects from 77 experiments. Elaborated feedback is most likely the best type for both recall and transfer; knowledge of results is the least effective [V via ERIC EJ1372783] <https://doi.org/10.1037/edu0000764>. Grade A.
  - **Showing the learner's own error.** Feedback that paired the correct solution with an erroneous one matching the student's answer lowered extraneous load and raised transfer (Wang et al. 2024, *JECR* 62(6)) [V] <https://doi.org/10.1177/07356331241247592>. Grade C.
- **U15 · Learning from errors in a real classroom.**
  - Source: Metcalfe, Xu, Vuorre, Siegler, Wiliam & Bjork 2024, *BJEP* 95(1): two cohorts of ~88 students preparing for an algebra exam.
  - Error-focused mini-tests gave more learning per teacher hour than explicit instruction, but the result varied across teachers.
  - Discussing *why* errors happened worked best.
  - [V] <https://doi.org/10.1111/bjep.12651> · Grade C.
- **U16 · "Derring" failed to replicate.**
  - Source: Mera et al. 2025, *JEP: General* 154(3): two preregistered studies.
  - Generating a deliberately wrong definition and then correcting it was no better than copying, and Bayes factors favoured the null.
  - Pretesting, and finding other people's errors, are different manipulations.
  - [V] <https://doi.org/10.1037/xge0001707> · Grade B.
- **U17 · The mechanism behind prediction, and the timing of pretest feedback.**
  - **Mechanism.** Prediction-error models account for the testing effect (Chen et al. 2025, *Communications Psychology* 3:18, word pairs, N=80, 81 and 62; and *PNAS* 122(32), fMRI) [V] <https://doi.org/10.1038/s44271-025-00200-1> · <https://doi.org/10.1073/pnas.2506530122>.
  - **Timing.** After a failed pretest, immediate feedback beat feedback delayed by 24–48 h (Mera et al. 2025, *J. Cognition* 8:41) [V] <https://doi.org/10.5334/joc.455>.
  - **Pretests vs post-tests.** Pretests, post-tests and copy-test-copy all beat errorless copying, and did equally well (Mera et al. 2025, *Memory & Cognition*) [V] <https://doi.org/10.3758/s13421-025-01813-x>.
  - Grade C.
- **U18 · Spacing and relearning in detail.**
  - **Schedules.** Spaced vs massed retrieval g=0.74; expanding vs uniform gaps g=0.034, n.s.; expanding gaps help only with many exposures (Latimier, Peyre & Ramus 2021, *EPR* 33(3), 29 studies) [V via ERIC EJ1310148] <https://doi.org/10.1007/s10648-020-09572-8>. Grade A.
  - **A classroom design** (Higham, Zengel, Bartlett & Hadwin 2022, *JEP* 114(5)) [V via ERIC EJ1372739] <https://doi.org/10.1037/edu0000693>:
    - three sessions, 2 days apart;
    - items answered correctly were dropped, and misses came back up to twice;
    - exposure time was matched against restudy.

    Recall beat restudy. Higher recall during relearning was associated with better metacognition and lower anxiety. Grade B.
- **U19 · Retrieval practice for complex skills: the new evidence is mixed.**
  - **Positive.** In university maths, problem tests at the end of each lesson narrowed the prior-achievement gap (Muzsnay et al. 2025, *IJSME* 23(8); not randomised) [V] <https://doi.org/10.1007/s10763-025-10607-1>.
  - **Negative.** Grade 5–6 pupils learning a strategy skill did better with restudy than with retrieval (Kranz et al. 2024, *J. Exp. Educ.* 94(3)) [V] <https://doi.org/10.1080/00220973.2024.2392684>.
  - Grade C.
- **U20 · Interleaving in authentic settings.**
  - **Adults.** Interleaving improved nursing students' diagnosis of lung sounds, but not their monitoring accuracy, and they found it more effortful (Onan et al. 2025, *ACP* 39(3); quasi-experimental) [V] <https://doi.org/10.1002/acp.70063>.
  - **Children.** For third graders (N=147, preregistered), interleaving helped at 8 weeks, mainly for those with high prior knowledge (Klimovich & Richter 2025, *CRPI* 10:68) [V] <https://doi.org/10.1186/s41235-025-00680-z>.
  - Grade C.
- **U21 · Concreteness fading does no better than showing linked views at once.** In high-school physics (N=187), the two were equivalent within d=±0.5 (Lichtenberger, Kokkonen & Schalk 2024, *JRST* 61(9)) [V] <https://doi.org/10.1002/tea.21947>. Grade C.
- **U22 · In complex professional skills, worked examples build early knowledge, not independent skill.**
  - **Trainees.** Self-explained worked examples raised strategy knowledge and process quality, but not application. Problem solving gave better outcomes, and prompt specificity had no effect (Rexhäuser et al. 2026, *IJCSCL* 21(3), N=154) [V] <https://doi.org/10.1007/s11412-026-09468-9>.
  - **Apprentices.** Modelling examples raised knowledge and scaffolded skill, but not unscaffolded skill. Comparative prompts looked promising only for learners with higher prior knowledge (Meier et al. 2024, *JCAL* 40(4), N=118) [V] <https://doi.org/10.1111/jcal.12991>.
  - **A null result.** With learning time controlled, self-explanation prompts had no effect (Beege & Ploetzner 2024, *Instr. Sci.* 53(1), N=128) [V] <https://doi.org/10.1007/s11251-024-09693-5>.
  - Grade C.
- **U23 · Growth mindset, updated.**
  - **Overall.** d=0.05 across 63 studies, not significant after bias correction, and d=0.02 in the 6 best studies (Macnamara & Burgoyne 2023, *Psych. Bull.* 149(3–4)) [V] <https://doi.org/10.1037/bul0000352>.
  - **Targeted.** d=0.14 for targeted subsamples with high fidelity, with a 95% prediction interval of −0.08 to 0.35 (Burnette et al. 2023) [V] <https://doi.org/10.1037/bul0000368>.
  - Grade A.
- **U24 · Upgrades and one correction.**
  - **Now verified [V]:**
    - Große & Renkl 2007; Hilbert 2008; Butler 2011; Rawson 2013; Fyfe 2014;
    - Hodds 2014, whose d=0.950 is in the abstract;
    - Rittle-Johnson 2017, which turns out to be a meta-analysis;
    - Mejía-Ramos 2012; Hoyles & Küchemann 2002; Jaakkola & Veermans;
    - the Wisniewski 2020 subgroup values; Griffiths & Higham 2018.
  - **Corrected:** K1 had credited Adesope 2017 with "0.70 random effects". No accessible source shows that figure, so it was removed.
- **U25 · Prequestions before every segment, and written by an LLM (added in pass 3).**
  - **Interpolated pretesting.**
    - Source: Kliegl & Bäuml, *Psychological Research* 89 (online 2024-11-13, CC BY).
    - Learners studied four prose segments, thematically related (Exp. 1) or distinct (Exp. 2).
    - Pretest questions before each segment raised cumulative recall of the segments 24 h later, compared with study only.
    - Sample sizes are not in the abstract.
    - [V, abstract] <https://doi.org/10.1007/s00426-024-02042-8> · Grade C.
  - **AI-generated prequestions.**
    - Source: Pan, Schweppe, Teo, Indrajaya & Wenzel, *JARMAC*, issue dated 2026-09; four experiments with an educational text.
    - ChatGPT-generated prequestions beat reading alone and beat studying an AI-generated outline.
    - They were as effective as human-written questions, and helped on test questions that were *not* identical to the prequestions.
    - [V: preprint abstract, 2025-09-07] <https://doi.org/10.31234/osf.io/hsu8e_v1>; [title: published record] <https://doi.org/10.1037/mac0000254> · Grade B/C (one team, text learning).
  - **Tension with K6.** St. Hilaire 2023 found almost no benefit on content that was not asked about (g=0.04). Pan et al.'s non-identical questions may still target the same ideas, and the abstract does not say. Treat the broader benefit as unconfirmed.

### 2.3 Extensions kernelspace did not need

Each entry gives the evidence, its boundaries, the grade and the implication for Plinth. Course and lesson numbers follow `PLAN.md`.

**E1 · Worked examples, fading and expertise reversal, including proofs (A for the main effect and reversal; B for fading; C for proofs)**
- **Evidence:**
  - **Origins.**
    - **Worked examples:** they cut solution time and errors on later algebra problems, but only on problems identical in structure to the examples (Sweller & Cooper 1985, *Cognition and Instruction* 2(1), Year 9 to university students) [V] <https://doi.org/10.1207/s1532690xci0201_3>.
    - **Expertise reversal:** techniques that help inexperienced learners "can lose their effectiveness and even have negative consequences" for experienced ones (Kalyuga, Ayres, Chandler & Sweller 2003, *Educ. Psychol.* 38(1), a review) [V] <https://doi.org/10.1207/S15326985EP3801_4>.
    - **Tailoring instruction to the learner:** Kalyuga 2007, *EPR* 19(4) [title] <https://doi.org/10.1007/s10648-007-9054-3>.
  - U1, U2 and U22.
  - **Backward fading** beat forward fading, and fading beat example–problem pairs on near transfer (Renkl, Atkinson, Maier & Staley 2002, *J. Exp. Educ.* 70(4)) [V] <https://doi.org/10.1080/00220970209599510>.
  - **Fading plus principle prompts** gave medium-to-large near and far transfer at no extra time cost (Atkinson, Renkl & Merrill 2003, *JEP* 95(4)) [V] <https://doi.org/10.1037/0022-0663.95.4.774>.
  - **A rapid schema test** correlated with full tests at up to .92, cut testing time 2.5–4.9×, and supported adaptive instruction (Kalyuga & Sweller 2004, *JEP* 96(3)) [V] <https://doi.org/10.1037/0022-0663.96.3.558>.
  - **Proofs, and where prompts go.** Hilbert, Renkl, Kessler & Reiss 2008, *L&I*, with N=111 student teachers [V via ERIC EJ788043] <https://doi.org/10.1016/j.learninstruc.2006.10.008>:
    - heuristic worked examples beat a content-focused control on proving skill and on conceptual knowledge;
    - **completion requirements impaired learning, especially combined with self-explanation prompts;**
    - the prompts alone helped.

    Also Reiss & Renkl 2002 [title] <https://doi.org/10.1007/BF02655690>.
  - **Proof Blocks** matched written proofs in far less time (Poulsen et al., SIGCSE 2023, N=332) [V] <https://arxiv.org/abs/2211.09609>. Without reading first, they gave the smallest gains; distractors only trended positive and nearly doubled the time taken [L2].
  - **Faded Parsons problems** beat code writing and code tracing for learning programming patterns, and matched code writing on general code-writing ability. Students preferred them (Weinman, Fox & Hearst, CHI 2021, classroom study, N=237) [V] <https://doi.org/10.1145/3411764.3445228>.
  - **Adaptive selection.** Choosing for each learner among a worked example, a 1- or 2-error example or a problem matched a fixed sequence's learning with significantly fewer activities (Chen, Mitrovic & Mathews 2020, *IEEE TLT* 13(1)) [V] <https://doi.org/10.1109/TLT.2019.2896080>.
  - **Reviews:** Muldner et al. 2022 [V] <https://doi.org/10.1145/3560266>; Atkinson et al. 2000 [V] <https://doi.org/10.3102/00346543070002181>.
- **Boundaries:**
  - The evidence comes from well-structured domains and from novices.
  - Too much help harms learners with high prior knowledge.
  - Unfocused prompts shrink the effect, principle prompts help, and prompts stacked on completion blanks hurt.
- **Plinth:**
  - **Goal Replay becomes a faded chain for each proof pattern.** Each rung uses a new instance of the pattern:
    1. **Full replay.** The learner predicts each next goal. Revealed steps carry one principle prompt: "which hypothesis or lemma licenses this step?".
    2. **Backward fading.** The last tactic is blank, then the last two. **Blank steps carry no prompt.**
    3. **Lean Proof Blocks, after the replay.** Order 5–8 tactic or `have` lines. Distractors are optional. Candidates: a wrong induction variable, an ungeneralised hypothesis, a stray `sorry`, a premature `omega`.
    4. **The Bench proof,** unscaffolded.
  - **The Derivation Board fades backward the same way.** Novices answer by picking from the visible context; later rungs ask for free text.
  - **A 2-item rapid test precedes each chain.** Two correct answers skip ahead. For each KC, code (not the learner's self-rating) then picks the next activity from fresh-item results.

**E2 · Self-explanation, including proof reading (A overall; B/C for proofs)**
- **Evidence:**
  - **General meta-analysis:** g=0.55 over 69 effects from 64 reports (Bisra et al. 2018, *EPR* 30(3)) [V via ERIC EJ1186664] <https://doi.org/10.1007/s10648-018-9434-x>. The studies covered problem solving, studying worked problems and studying text, at several levels of education.
  - **Mathematics meta-analysis** (Rittle-Johnson, Loehr & Durkin 2017, *ZDM* 49(4)) [V via ERIC EJ1149060] <https://doi.org/10.1007/s11858-017-0834-z>:
    - small-to-moderate *immediate* gains in procedural knowledge, conceptual knowledge and transfer;
    - much thinner evidence for classrooms and retention;
    - larger gains when high-quality explanation is scaffolded.

    Its recommendations: train or structure explanations; keep prompts from stealing attention; prompt explanations of correct information; prompt explanations of why misconceptions are wrong.
  - **Chi.** Good learners explain steps by principles (Chi et al. 1989) [V] <https://doi.org/10.1207/s15516709cog1302_1>, and prompting raised gains (Chi et al. 1994) [V] <https://doi.org/10.1207/s15516709cog1803_3>.
  - **Proof comprehension** (Hodds, Alcock & Inglis 2014, *JRME* 45(1)) [V via ERIC EJ1028348] <https://doi.org/10.5951/jresematheduc.45.1.0062>. A booklet focusing attention on logical relationships:
    - raised comprehension, d=0.950 (Experiment 1);
    - raised engagement and attention movement across the proof (Experiment 2);
    - in a 15-minute in-lecture version, had a lasting effect (Experiment 3).

    The booklet is **CC BY-SA 4.0** [V, read 2026-10-20] <https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf>.
  - **A null with time controlled:** U22.
- **Boundaries:** prompt quality and scaffolding; U2's moderator; overload (U3); thin retention evidence.
- **Plinth:**
  - **Open Course 02 with a 15-minute unit,** "How to read a proof, and a Lean proof". Adapt it from the booklet, with attribution and share-alike. Show paraphrasing and "OK, I get it" as non-examples.
  - **Early answers are menus** (pick the hypothesis, lemma or rule); later answers are free text.
  - **Once per proof pattern,** ask "why is this step wrong?" about a catalogued misconception (the catalogue is in L2).
  - **The viva rubric** credits links between steps, not paraphrase.

**E3 · Generation, prediction and pretesting (A; C for the mechanism)**
- **Evidence:**
  - **Generation:** d=0.40 (Bertsch 2007) [KS]. How constrained the generation is moderates the effect (McCurdy et al. 2020, *PB&R* 27(6), 310 experiments) [V] <https://doi.org/10.3758/s13423-020-01762-3>.
  - **Prediction:** predicting outcomes beat evaluating them afterwards. Surprise, measured by pupil dilation, appeared only after predictions and tracked learning (Brod, Hasselhorn & Bunge 2018, *L&I* 55) [V] <https://doi.org/10.1016/j.learninstruc.2018.01.013>. See also K26 and U17.
  - **Pretesting** helps across texts, videos and lectures, even when the first answers are wrong, *if* learners study the answers afterwards (Pan & Carpenter 2023, *EPR* 35(4)) [V] <https://doi.org/10.1007/s10648-023-09814-5>. See also K6, U13 and U17.
  - **Interpolated and AI-generated prequestions:** U25.
- **Boundaries:**
  - The benefit concentrates on the content asked about.
  - Corrective study must follow, ideally at once.
  - Evidence for complex procedures is unresolved (§5).
- **Plinth:** Call It is a learning event, not only a measurement.
  - Aim each call at the lesson's KC: the verdict and why.
  - Put one call or prequestion before each segment of a lesson or theory drawer, not one at the top (U25).
  - Follow a wrong call *immediately* with the decoded witness.
  - Send fresh variants of the item into Re-find.
  - An LLM may draft prequestions for reading, because the text that follows supplies the answer (U25). Verdict items stay code-generated and solver-checked.

**E4 · Hypercorrection, confidence and calibration (B; A for delayed judgments)**
- **Evidence:**
  - **Hypercorrection.** High-confidence errors are the most likely to be corrected (Butterfield & Metcalfe 2001) [V] <https://doi.org/10.1037/0278-7393.27.6.1491>. Feedback that examines the reasoning helps most (Metcalfe 2017, *Annu. Rev. Psychol.* 68) [V] <https://doi.org/10.1146/annurev-psych-010416-044022>.
  - **Confident errors return.** Hypercorrection persisted at one week, but correction fell, and high-confidence errors were *more* likely than low-confidence ones to be reproduced (Butler, Fazio & Marsh 2011, *PB&R* 18(6)) [V via PubMed 21989771] <https://doi.org/10.3758/s13423-011-0173-y>.
  - **Memory of the feedback matters more than confidence.** Low-confidence errors on trick questions were corrected as often as high-confidence ones. What predicted correction was memory for the feedback and for the original answer, not confidence or surprise (Griffiths & Higham 2018, *Memory* 26(2)) [V via PubMed 28671026] <https://doi.org/10.1080/09658211.2017.1344249>.
  - **Classroom:** U15.
  - **Delayed judgments.**
    - Delayed judgments of learning are far more accurate than immediate ones: g=0.93 for relative accuracy (112 effects, N=4,554), with a small memory benefit, g=0.08 (Rhodes & Tauber 2011, *Psych. Bull.* 137(1)) [V] <https://doi.org/10.1037/a0021705>.
    - In the original paradigm the judgment is made on the cue alone, "shortly after study rather than ... immediately" (Nelson & Dunlosky 1991, *Psych. Sci.* 2(4)) [V] <https://doi.org/10.1111/j.1467-9280.1991.tb00147.x>.
    - The delays studied are minutes, not days, and the material is mostly word pairs.
  - **Other:** reactivity (U6); calibration can be trained (Mellers et al. 2014) [V] <https://doi.org/10.1177/0956797614524255>.
  - No meta-analysis of hypercorrection was found (§6).
- **Plinth:**
  - Keep three confidence levels, and record only the first call.
  - A **sure-and-wrong** call gets feedback that names the faulty reasoning, then:
    - a fresh re-test at about 1 day and about 1 week, as in L3;
    - a one-line restatement of the correction on the specimen card.
  - **Self-judgments:** make them delayed and cue-only.
    - At the start of a later session, show the prompt without its answer, for example "Could you state the invariant that `transfer` preserves?".
    - Use the answer only for scheduling.
    - Asking in a later session is my extrapolation from delays of minutes.
  - **The Judgment page** shows reliability and resolution with Wilson intervals. It claims nothing for a category with fewer than about 20 calls (a design threshold).
  - **Reactivity:** test within the learner whether confidence prompts on review items lower 30-day retention.

**E5 · Successive relearning (B)**
- **Evidence:**
  - Relearned content rose 10%, d=0.54–1.10, in a difficult biopsychology course (Janes et al. 2020, *ACP* 34(5)) [V] <https://doi.org/10.1002/acp.3699>.
  - Two experiments in an authentic course improved exam scores and long-term retention (Rawson, Dunlosky & Sciartelli 2013, *EPR* 25(4)) [V via ERIC EJ1036741] <https://doi.org/10.1007/s10648-013-9240-4>.
  - See also U7, U18 and K4.
- **Plinth:**
  - **A core KC is set** after correct answers on fresh items in at least 3 spaced sessions; the viva counts as one.
  - **Within a session,** drop items answered correctly, and bring misses back up to twice.
  - **Across sessions,** start with gaps of about 2 days, then widen them. Spacing matters more than the schedule's shape, so a simple queue is enough before FSRS-style scheduling.
  - **Reviews are executable:** re-run a solver query, or re-find a trace. This is Execute Program's pattern, which has no published efficacy data [KS] <https://notes.andymatuschak.org/Execute_Program>.

**E6 · Interleaving for discrimination (A/B)**
- **Evidence:**
  - **Meta-analysis.** Memory g up to 0.65 and transfer up to 0.66. Effects were largest when categories differed subtly, and they held at delay. Most studies were lab studies with undergraduates (Firth, Rivers & Boyle 2021, *Rev. Educ.* 9(2)) [V] <https://doi.org/10.1002/rev3.3266>.
  - **Classroom.** Eight weeks of interleaved physics homework gave median gains of 50% and 125% on two surprise tests, while students rated it less useful (Samani & Pan 2021) [V] <https://doi.org/10.1038/s41539-021-00110-x>.
  - **Side by side.** Simultaneous side-by-side presentation worked as well as interleaving (Kang & Pashler 2012) [V] <https://doi.org/10.1002/acp.1801>.
  - **RCT.** d=0.83 in 7th grade (Rohrer et al. 2020) [KS] <https://doi.org/10.1037/edu0000367>.
  - **New:** U20.
- **Plinth:** build "Which is it?" sets for:
  - property kind: safety, liveness, hyperproperty, refinement;
  - checking method: SMT, model checking, proof, test, runtime enforcement;
  - verdict meaning: sat, unsat, unknown, and "No error found" at a bound;
  - the 12 gap classes;
  - isolation anomalies;
  - proof technique: induction on what, whether to generalise, contradiction, case split.

  Show pairs on first exposure. Interleave a category once the learner has one correct fresh item on it.

**E7 · Contrasting cases (A/B)**
- **Evidence:**
  - **Comparison vs sequence.** Comparing two solution methods beat studying them in sequence on procedural knowledge and flexibility (Rittle-Johnson & Star 2007, *JEP* 99(3), N=70) [V] <https://doi.org/10.1037/0022-0663.99.3.561>. The result replicated in CS2 (Patitsas et al. 2013, N=241) [V] <https://doi.org/10.1145/2493394.2493409>.
  - **Meta-analysis:** K8.
  - **Inventing first.** Inventing with contrasting cases before being told improved transfer (Schwartz et al. 2011) [KS] <https://doi.org/10.1037/a0025140>.
  - **Comparative prompts** suit learners with higher prior knowledge (U22).
- **Plinth:** add **twin** blocks, pairs of artifacts that differ by one decision that flips the verdict:
  - `Int` vs `BitVec(64)`;
  - read-then-write vs atomic;
  - weak vs strong fairness (WF vs SF);
  - with vs without `Allowed`;
  - a JSON-body observer vs body + size + timing;
  - READ COMMITTED vs SERIALIZABLE histories;
  - small-step vs big-step semantics on a failed guard.

  The learner predicts both verdicts and names the difference; the principle comes last. Compare directly in expert areas; in novice areas, run each side alone first.

**E8 · Erroneous examples (A for a small average effect; B/C for the conditions)**
- **Evidence:**
  - **Meta-analysis and review:** g=.136, raised by a required error explanation (U11); conditional benefits (U3).
  - **Prior knowledge decides** (Große & Renkl 2007, *L&I* 17(6)) [V via ERIC EJ780439] <https://doi.org/10.1016/j.learninstruc.2007.09.008>:
    - mixing correct and incorrect solutions fostered far transfer only for learners with favourable prior knowledge;
    - learners with poor prior knowledge did better with correct solutions only;
    - incorrect solutions also reduced principle-based self-explanations.

    The highlighting result is not in the abstract [unverified].
  - **Delayed benefit.** No advantage at the immediate test, but d=.33 on gains at one week (McLaren, Adams & Mayer 2015, *IJAIED* 25(4), N=390) [V] <https://doi.org/10.1007/s40593-015-0064-x>.
  - **In a tutor,** erroneous examples prepared students for problem solving better than worked examples did. Explaining and correcting them improved debugging and problem-solving skills (Chen, Mitrovic & Mathews 2020, *IEEE TLT* 13(1), study 1) [V] <https://doi.org/10.1109/TLT.2019.2896080>.
  - **The learner's own error in feedback:** U14.
- **Plinth:** the Audit Desk rehearses the roadmap's end-state skill (g): deciding which correctness claims are justified before trusting agent-written code. As a learning technique its average effect is small. So:
  - **Every finding needs** an explanation, a fix and a specimen.
  - **Correct examples of a concept come first.**
  - **Queue order follows prior knowledge.** In novice KCs, a case is offered after one correct fresh item on that KC; in expert KCs, cases come early. Every case stays visible.
  - **Early cases** name the field that holds the gap and have one gap each.
  - **Sound cases stay in the mix.** v1 has 4 of 32 (L3).
  - **Judge the Desk at one week.**

**E9 · Concreteness fading (C)**
- **Evidence:**
  - **For.** Start concrete and fade explicitly to the abstract. The review argues four theoretical benefits and reports no pooled effect (Fyfe et al. 2014, *EPR* 26(1)) [V via ERIC EJ1036777] <https://doi.org/10.1007/s10648-014-9249-3>.
  - **Against or equal:**
    - Constant concrete representations matched fading on transfer for 127 pupils in grades 4–6 (Jaakkola & Veermans, *Instr. Sci.* 46(2)) [V via ERIC EJ1171479] <https://doi.org/10.1007/s11251-017-9428-y>.
    - The same authors' 2015 study notes that college studies favour abstract representations [V via ERIC EJ1068889] <https://eric.ed.gov/?id=EJ1068889>.
    - Fading did no better than simultaneous views (U21).
- **Plinth:**
  - **Default to linked, simultaneous views** in Courses 00, 01, 05 and 08. The concrete view (3-bit enumeration, play in the Theater) sits beside the schematic one (state graph, trace table) and the formal one (∀/∃, a TLA+ action, a Lean proposition), with the same element highlighted in every view.
  - **The concrete-to-formal sequence is an optional path,** with step-down on demand. Never force it on a fluent code reader.

**E10 · Multimedia principles (A)**
- **Evidence:**
  - **Meta-meta-analysis.** 11 principles helped. The largest effects were captions, temporal and spatial contiguity, and signalling. Design mattered more for complex material and for system-paced delivery (Noetel et al. 2022, *RER* 92(3)) [V] <https://doi.org/10.3102/00346543211052329>.
  - **Pre-training** on component names and states improved transfer (Mayer, Mathias & Wetzell 2002) [V] <https://doi.org/10.1037/1076-898X.8.3.147>.
  - **See also:** K27 and K28.
  - **Animated proofs.** Narrated, animated proofs matched static ones at once but were retained worse (Roy, Inglis & Alcock 2017) [L2].
- **Plinth:**
  - **Spatial contiguity:**
    - print witness values on the formula (`a − amount < 0` shown as `0 − 1 = −1`);
    - keep each Lean goal beside its tactic;
    - line up TLC trace states under the action that fired.
  - **Signalling and coherence:** DESIGN.md §2–3 already complies.
  - **Pre-training:** a 5-minute primer on each tool's parts comes before its first full problem.
  - **Pacing:** dynamic views stay learner-paced, and Goal Replay never autoplays.

**E11 · Cognitive load of switching tools (A for split attention; C for tool learning; D for session design)**
- **Evidence:**
  - **Integrated instructions.** For high element-interactivity instructions, an integrated manual used *without* the computer beat formats that needed continual interaction with it. For low element interactivity, format did not matter (Chandler & Sweller 1996, *ACP* 10(2), CAD/CAM trainees) [V] <https://doi.org/10.1002/(SICI)1099-0720(199604)10:2%3C151::AID-ACP380%3E3.0.CO;2-U>.
  - **Cognitive load theory:** Sweller, van Merriënboer & Paas 2019 [V] <https://doi.org/10.1007/s10648-019-09465-5>.
  - **Switching and interruption costs** [title]: Monsell 2003 <https://doi.org/10.1016/S1364-6613(03)00028-7>; Leroy 2009 <https://doi.org/10.1016/j.obhdp.2009.04.002>; Parnin & Rugaber 2011 <https://doi.org/10.1007/s11219-010-9104-9>.
  - **kernelspace's audit** ranked the first toolchain install as the top drop-off risk [KS].
- **Plinth:** six toolchains (Z3Py, Lean 4, an interpreter, TLA+, Postgres/Rust, Soufflé or Alloy) imply five rules:
  1. At most one new tool per course.
  2. The same running example (two accounts and a transfer) in every tool.
  3. First contact with each tool happens in a browser instrument.
  4. Instructions live inside the lab files, such as comments beside `TODO(you)` and goal states in docstrings.
  5. One tool per session, ending with a two-line resume note.

**E12 · Writing to learn (A, small effects, mostly K-12)**
- **Evidence:**
  - **Bangert-Drowns, Hurley & Wilkinson 2004**, *RER*, 48 programmes: a small positive effect. Metacognitive prompts raised it; longer assignments lowered it [V via ERIC EJ737264] <https://eric.ed.gov/?id=EJ737264>. A random-effects re-analysis gives 0.22 [0.13, 0.31] [V] <https://wviechtb.github.io/metadat/reference/dat.bangertdrowns2004.html>.
  - **Graham, Kiuhara & MacKay 2020:** 0.30 over 56 experiments [V via ERIC EJ1249514] <https://eric.ed.gov/?id=EJ1249514>.
  - **Related:** creating teaching materials g=0.17 [KS]; oral explanation beat written explanation for transfer [L4].
- **Plinth:**
  - Spend most of the 15% writing budget on short prompted writes: claim cards, specimen labels, decision records, and "what I believed / what broke it / what I'm unsure of".
  - Keep the capped technical note every 2–3 stages.

**E13 · Feedback content (A)**
- **Evidence:**
  - **Kluger & DeNisi 1996:** d=.41, but **more than a third of feedback interventions lowered performance**, more so when feedback drew attention to the self [V] <https://doi.org/10.1037/0033-2909.119.2.254>.
  - **Computer-based item feedback** (Van der Kleij, Feskens & Eggen 2015, *RER*, 40 studies, 70 effects) [V via ERIC EJ1081708] <https://eric.ed.gov/?id=EJ1081708>:
    - elaborated feedback 0.49, the correct answer 0.32, right/wrong only 0.05;
    - elaborated feedback did best on higher-order outcomes, and effects were larger in mathematics;
    - delayed feedback lowered effects (the interaction between timing and outcome level was not significant).
  - **See also:** K9, U12, U13 and U14.
- **Plinth:**
  - **Layer 1, always:**
    - the verdict;
    - the decoded witness;
    - the bound;
    - what the result rested on: unsat core, `#print axioms`, or TLC constants, depth and state count.
  - **Layer 2, expandable:** the full explanation and, for a miss, the likely misconception. Open by default in novice KCs; collapsed in expert KCs.
  - **A wrong call** shows what the call implied beside what the instrument found.
  - Never praise the person.

**E14 · Mastery, "nothing locks" and how much guidance (A)**
- **Evidence:**
  - K11, K12 and U1.
  - **Minimal guidance** underperforms until learners have enough prior knowledge (Kirschner, Sweller & Clark 2006) [V] <https://doi.org/10.1207/s15326985ep4102_1>.
  - **Discovery learning.** Unassisted discovery d=−0.38 vs explicit instruction; enhanced discovery +0.30 (Alfieri et al. 2011, 164 studies) [V] <https://doi.org/10.1037/a0021017>.
  - **Guidance** improved inquiry learning outcomes, d=0.50 (Lazonder & Harmsen 2016) [V] <https://doi.org/10.3102/0034654315627366>.
  - **Project-based learning:** d+=0.71 (Chen & Yang 2019) [V] <https://doi.org/10.1016/j.edurev.2018.11.001>.
  - **Practice first:** U12.
  - **An open debate.** Whether to combine inquiry with direct instruction remains contested: de Jong et al. 2023 <https://doi.org/10.1016/j.edurev.2023.100536> vs Sweller et al. 2024 <https://doi.org/10.1016/j.edurev.2023.100584> [title].
- **Plinth:**
  - The roadmap's "read only enough theory" and 65% building hold as *guided* discovery.
  - "Set" is computed, never a gate.
  - Remove the two v1 locks: drawers that open only after two missed calls, and audit cases that open only after a course is set.

**E15 · Proof and formal-methods education (C/D; detail in L2)**
- **Evidence:**
  - **Reading proofs.** Undergraduates attended to surface features, mathematicians to logical structure, and mathematicians sometimes disagreed about validity (Inglis & Alcock 2012, *JRME* 43(4)) [V] <https://doi.org/10.5951/jresematheduc.43.4.0358>.
  - **Assessing proof comprehension** (Mejía-Ramos et al. 2012, *ESM* 79(1)) [V via ERIC EJ948400] <https://doi.org/10.1007/s10649-011-9349-7>:
    - local dimensions: the meaning, logical status and chaining of statements;
    - holistic dimensions: high-level ideas, modules, methods, examples.
  - **Implication.** Students aged 13–14 used empirical, focused-empirical or focused-deductive strategies (Hoyles & Küchemann 2002) [V via ERIC EJ672156] <https://doi.org/10.1023/A:1023629608614>.
  - **Lean.** Students who joined voluntary Lean workshops wrote more explicit, goal-structured proofs (Thoma & Iannone 2022; correlational) [V] <https://doi.org/10.1007/s40753-021-00140-1>.
  - **Coq.** Coq's feedback helped proof writing (Knobelsdorf et al. 2017; qualitative) [V] <https://doi.org/10.1145/3105726.3106184>.
  - **Concurrency preconceptions** in high-school students (Kolikant 2001) [V] <https://doi.org/10.1076/csed.11.3.221.3831>:
    - ordering actions felt easier than finding critical sections;
    - they modelled computation on their own actions;
    - they saw parallelism where there was none.
  - **From L2 [L2]:**
    - there is no RCT of teaching with a proof assistant;
    - proof validation is unreliable even among experts;
    - temporal logic has a 14-type misconception catalogue;
    - minimal counterexamples can narrow students' fixes to the special case.
  - **Position paper:** formal methods should be mandatory (Broy et al. 2024; opinion) [V] <https://doi.org/10.1145/3670795>.
- **Plinth:**
  - Base the viva rubric on the local and holistic dimensions.
  - Include Audit cases where experts can reasonably disagree, with ASSUMED as a defensible answer.
  - Turn Kolikant's preconceptions into Theater challenges.
  - Aim Course 00 distractors at implication and vacuous truth.

**E16 · Validity of self-assessment (A)**
- **Evidence:**
  - Self-assessed knowledge tracks motivation and satisfaction more than learning (Sitzmann et al. 2010, *AMLE* 9(2)) [V] <https://doi.org/10.5465/amle.9.2.zqr169>.
  - Self-grades inflate most for weak performers [L3].
- **Plinth:**
  - The self-graded v1 viva cannot set a course on its own.
  - Self-grading earns practice weight. Credit comes from fresh, machine-checked items (kernelspace V6; L3's Defence).

### 2.4 Myths and over-generalisations to avoid

| Claim | Status | Source |
|---|---|---|
| Learning styles ("visual learner" matching) | No adequate support | Pashler 2008 [KS] <https://digitalcommons.usf.edu/psy_facpub/1765/> |
| Highlighting, rereading or summarising as built-in features | Low utility | Dunlosky 2013 [KS] <https://doi.org/10.1177/1529100612453266> |
| "2σ tutoring", "100× learning" | Not replicated; tutoring is 0.33–0.37 SD | von Hippel 2024 [KS] |
| "10,000 hours" | Deliberate practice explains 4% of variance in education, <1% in professions | Macnamara 2014 [KS] <https://doi.org/10.1177/0956797614535810> |
| "It felt productive, so it was" | Active learning felt worse and worked better; interleaving rated less useful and more effortful | Deslauriers 2019 [KS]; Samani & Pan 2021 [V]; Onan 2025 [V] |
| "Self-rated understanding equals learning" | Only a moderate relation | Sitzmann 2010 [V] |
| "Experienced engineers learn best by unguided discovery" | Unassisted discovery d=−0.38 vs explicit instruction | Alfieri 2011 [V]; Kirschner 2006 [V] |
| "Growth-mindset messaging raises achievement" | d=0.05, n.s. after bias correction; 0.14 only for targeted, high-fidelity subsamples | Macnamara & Burgoyne 2023 [V]; Burnette 2023 [V]; Sisk 2018 [V] <https://doi.org/10.1177/0956797617739704> |
| "Deliberately making errors while studying ('derring') helps" | Two preregistered replications found no benefit over copying | Mera 2025 [V] |
| "Self-explanation prompts always help" | Smaller worked-example effects in maths; harmful stacked on completion steps; null with time controlled | Barbieri 2023 [V]; Hilbert 2008 [V]; Beege & Ploetzner 2024 [V] |
| "Erroneous examples beat correct ones" | Small average effect (g=.136); worse than correct-only with low prior knowledge | Alemdag 2025 [V]; Große & Renkl 2007 [V] |
| "More detailed feedback is always better" | Redundant for experts; over a third of feedback interventions lowered performance | Huangfu 2026 [V]; Kluger & DeNisi 1996 [V] |
| "Review intervals must expand" | Expanding vs uniform g=0.034, n.s.; spacing is what works | Latimier 2021 [V] |
| "Always fade from concrete to abstract" | Equivalent to linked simultaneous views in one RCT | Lichtenberger 2024 [V]; Jaakkola & Veermans [V] |
| "Immersive 3D teaches better" | Small and conditional: head-mounted VR beat less immersive media by ES=0.24 over 35 studies, more for K-12. Adding immersive VR to a lab simulation raised presence and lowered learning (N=52 [KS]) | Wu, Yu & Gu 2020 [V] <https://doi.org/10.1111/bjet.13023>; Makransky, Terkildsen & Mayer 2019 [title] <https://doi.org/10.1016/j.learninstruc.2017.12.007> |
| "The kernel or TLC accepted it, so I learned it" | Agents produce green artifacts; unguarded AI lowered unassisted performance | Bastani 2025 [KS]; Shen & Tamkin, preprint [V] |

---

## 3. What this means for the course

### 3.1 The expertise map (my inference from the learner profile; confirm with rapid tests)

| Area | Likely status | Policy |
|---|---|---|
| Rust, Postgres in practice, concurrency and distributed failure modes | Expert | Predict and reflect; skip worked examples; problem-solving-first openers allowed |
| Isolation theory, histories, serializability | Intermediate | Twins plus interleaved classification; brief examples |
| Logic notation: ∀/∃, implication, negation | Novice, fast | Rapid test; 1–2 examples; fade fast |
| Proof: induction, proof terms, tactics, dependent types | Novice (highest load) | Full faded chains, self-explanation training, Proof Blocks after reading |
| Operational semantics, type safety | Novice | Worked examples plus twins |
| Hoare logic, weakest preconditions (WP), verification conditions (VCs) | Novice | Derivation Board with backward fading |
| Temporal logic, fairness, model checking | Novice in notation, expert in intuition | Linked Theater and formal views; notation pre-training |
| Information flow, hyperproperties | Novice | Problem-solving-first opener, then consolidation |
| Simulation and refinement proofs | Novice; very high element interactivity | Heavy examples; spiral revisits |

**Defaults by status** (U13, U20, U22, E1, E8):
- **Expert rows:**
  - layer-2 feedback collapsed;
  - comparative prompts and twins;
  - Audit cases early;
  - interleaving from the start.
- **Novice rows:**
  - worked-to-faded chains, with prompts on revealed steps only;
  - layer-2 feedback open;
  - correct examples before Audit cases;
  - each side of a twin alone before comparing;
  - interleaving after first exposure.

### 3.2 The loop

kernelspace's Predict → Play → Build → Prove → Keep (PLAN-100X §0), in Plinth's vocabulary:
- **Call:** predict the verdict and a confidence.
- **Witness:** run the instrument or play the Theater, and get layered feedback.
- **Explain:** self-explain the step or witness, and fill in the claim card.
- **Build:** Bench work in PRIMM stages, with subgoal-labelled TODOs mapped to checks.
- **Defend:** a no-agent viva and audit on fresh items.
- **Re-find:** successive relearning on regenerated specimens.

Only *Defend* and *Re-find* evidence, on fresh items without an agent, counts toward "set".

### 3.3 Changes to the v1 mechanics

| v1 mechanic | Keep | Change | Evidence |
|---|---|---|---|
| **Call It** (verdict + 55/75/95%; Run disabled until committed) | Yes | (a) Once a KC is solid, ask for a call on only a sample of runs. (b) Sure-and-wrong calls get reasoning-level feedback, then fresh re-tests at about 1 day and 1 week. (c) A wrong call shows the implied outcome beside the actual one. (d) Judgment shows reliability and resolution with intervals and a minimum n. (e) Test reactivity on review items. (f) Ask for one call before each lesson segment, not one per lesson | E3, E4, U6, U14, U25 |
| **Claims Ledger and stamps** | Yes (informational, no XP) | Each claim field is a generative prompt with an exemplar; the Requirement field stays human [design inference] | K10, E2, E12 |
| **Specimen Cabinet and Re-find** | Yes | Regenerate specimens from mutation generators with fresh seeds; ≥3 spaced correct sessions; within a session, drop correct items and bring misses back twice; executable reviews; interleave across courses | K2, K3, E5, E6 |
| **Bench and receipts** | Yes | PRIMM stages; subgoal labels mapped to checks; instructions inside the files; browser pre-training first; at most one new tool per course | K20, E10, E11 |
| **Instruments** | Yes | Two-layer feedback (layer 2 collapsed in expert KCs); witness values printed inline on the formula | E10, E13 |
| **Theater** | Yes (the rule is the concept) | Linked concrete, schematic and formal views, with fading optional; learner-paced; Kolikant challenges; predict the shortest trace before TLC | K18, K28, E9, E15 |
| **Derivation Board** | Yes | Backward fading; rapid tests; principle prompts on worked steps only | E1 |
| **Goal Replay** | Yes | Faded chain → Lean Proof Blocks after reading → Bench; prompts on revealed steps, none on blanks; never autoplay | E1, E2, E10 |
| **Audit Desk** | Yes (precision/recall is right) | Explain + fix + specimen required; correct examples first; queue order by prior knowledge, not locks; fade highlighting; cases where experts disagree; check at one week | E6, E8, E15 |
| **Viva** | Yes | A rubric built on the proof-comprehension dimensions. Self-grading earns practice weight only, and is done the next day [design inference]. Fresh objective items decide "set". A BYOK examiner is formative only | E4, E15, E16, K30 |
| **Notes** | Smaller | Short metacognitive writes plus a capped note every 2–3 stages, framed as artifacts | E12, K22 |
| **"Set" on viva; drawer and audit locks** | Status yes, locks no | "Set" is computed from evidence. Drawers are always open, with a "try first" nudge and logged provenance. Audit cases are always visible | K11, E14 |

### 3.4 Per course

| Course | Main levers | Twins and discrimination sets | Erroneous examples and misconceptions | Threshold KC |
|---|---|---|---|---|
| **00 Ground** | Rapid test-out; linked views of the 3-bit enumeration and ∀ over ℤ; a prequestion on vacuous truth; a negation generator | P→Q vs Q→P; ¬∀ vs ∀¬ | Implication and vacuity (Hoyles & Küchemann; L2 catalogue) | Validity of P ⇔ unsat of ¬P |
| **01 Counterexample (Z3)** | Call It on sat/unsat/unknown with contrast feedback; decoded witness and unsat core; worked examples for the Z3 API | `Int` vs `BitVec(64)`; `amount ≤ a` vs `<`; contradictory vs satisfiable constraints | A1.1–A1.3, after lesson 1.3 | The encoding is the claim |
| **02 Proof (Lean)** | Self-explanation booklet unit; Goal Replay → backward fading → Proof Blocks after reading → Bench; subgoal labels on `have`; the Natural Number Game as on-ramp | ℤ vs ℕ subtraction; with vs without `Allowed`; induction with vs without a generalised hypothesis | Statement review (A2.x) after correct proofs; "kernel accepted it, so it meets the requirement" | What kernel acceptance establishes |
| **03 Semantics** | Worked progress and preservation proofs; decision records as prompted writing | Big-step vs small-step on a failed guard | A3.1 (drift), A3.3 (`Nat` hides an overdraft) | Stuck state ≡ type error |
| **04 Obligations** | Derivation Board fading; interleaved assignment, sequence and conditional | Frame condition present vs missing | The planted miscompiler (S4.1/S4.2), after a correct VC generator | VC-generator correctness ≠ solver correctness |
| **05 Time (TLA+)** | Linked Theater, state-graph and TLA+ views; pre-training on state, action, behaviour, stuttering, fairness | WF vs SF; read-then-write vs atomic; safety vs liveness | Kolikant preconceptions; "deadlock-free means it terminates"; bounded presented as unbounded; LTL catalogue (L2) | Lasso; fairness as an environment assumption |
| **06 Correspondence** | Expert mode: predict and reflect, collapsed feedback, early Audit cases; interleaved anomaly classification; cross-link tablespace for MVCC | RC vs RR vs SERIALIZABLE histories; differential test vs refinement proof | A6.1–A6.3 | What tests establish; R(S, D) |
| **07 Secrecy** | Problem-solving-first ("show that B's data can't change A's view"), then self-composition; Alloy instances before assertions | Enforcement vs noninterference; observer variants | A7.x; "every endpoint checks `can_read`, so nothing leaks" | Observational equivalence |
| **08 Effects** | Crash windows in the Theater, then TLA+; cross-link byzantine for partitions | With vs without provider idempotency | A8.2 (a fresh key per retry) | An effect claim is a pair: you and the provider |
| **09 Preservation** | Worked simulation diagrams with fading; spaced revisits of 5.9 and 6.8 | Forward simulation vs bisimulation; observer with vs without aborts | S9.1, A9.1 | Simulation relation; the TCB |
| **10 Assembly** | Presenting; a Defence on fresh items across all KCs; the assurance report as synthesis | — | The agent-proposed command is itself an audit case | Proved / checked / tested / enforced / assumed |

### 3.5 The agent era (assessment design in L3)

- **Provenance.** Agent-assisted artifacts earn practice weight only. Credit comes from fresh, unassisted items (kernelspace V6, H1–H4).
- **Guardrails in code,** inherited: a deny hook on `TODO(you)` files, and an explanation gate before hints.
- **Teach the interaction patterns that scored well:** conceptual inquiry, and generate-then-comprehend (Shen & Tamkin, preprint).
- **Scaffold self-regulation, because AI gains concentrate in self-regulated learners (K31).**
  - Plans, Call It and calibration come before any agent use.
  - A BYOK model may write the layer-2 explanation, which raised interest for less-confident learners (U12). A checker, not the model, decides correctness.
- **Statement review is the skill agents cannot do for you.** No checker can guarantee that a spec matches what its author meant. The Audit Desk and the Requirement field train exactly that judgment.
- **Flawed-protégé items:** "debug this agent's proof or spec". Code, not the model, chooses the planted error. The evidence is preliminary (Kucharavy 2025) [KS].

### 3.6 Measurement

- **The north star is VRK₃₀:** KCs answered correctly on fresh generated items, without an agent, 30 or more days after first learning them.
- **Also track:**
  - calibration (reliability and resolution);
  - Audit precision and recall on unseen cases;
  - attempts to reach a green Bench stage.
- **Run within-learner comparisons** with keep/kill thresholds registered in advance (kernelspace §9). Candidates:
  - layer-2 feedback open vs collapsed in expert KCs;
  - confidence prompts on reviews, on vs off;
  - Proof Blocks distractors, on vs off.

  Report results descriptively, and claim no effects from one learner. Persistence measures are in L4.

---

## 4. Recommendations (ranked by expected impact × evidence ÷ effort)

1. **Add layered, expertise-aware feedback to every verdict (A; S–M).**
   - **Layer 1, always:** the decoded witness, the bound, and what the result relied on.
   - **Layer 2, expandable:** a note on the likely misconception. Collapsed in expert KCs.
   - **Wrong calls** show the implied outcome beside the actual one.

   Test the content in `verify:calls`.
2. **Use faded worked-example chains for formal notation (A/B; M).**
   - The chain runs Goal Replay → backward fading → Lean Proof Blocks after reading → Bench; the Derivation Board fades the same way.
   - Principle prompts go on revealed steps, never on blanks.
   - Rapid tests skip ahead, and code picks each KC's next activity from fresh-item results.
3. **Ship self-explanation training (A/B; S).**
   - Adapt the CC BY-SA Loughborough booklet for Lean, Z3 and TLA+.
   - Answers start as menus and move to free text.
   - Add one "why is this wrong?" prompt per proof pattern.
   - Base the viva rubric on the proof-comprehension dimensions.
4. **Build fresh-item generators and redefine "set" (A/B; L).**
   - Generators mutate guards, encodings, hypotheses, fairness and observers, and every answer is machine-checked.
   - An LLM may draft prequestions for theory reading (U25), because the text that follows supplies the answer.
   - "Set" means at least 3 spaced correct sessions.
   - Within a session, drop correct items and bring misses back twice.
   - Start with a simple spacing queue; `ts-fsrs` with implicit credit across the KC graph is an upgrade, not a prerequisite.
5. **Tune Call It (B/A; S):**
   - ask for one call before each lesson segment;
   - ask for a call on only a sample of runs once a KC is solid;
   - re-test sure-and-wrong calls at about 1 day and about 1 week, with the learner restating each correction;
   - collect self-judgments after a delay, showing the question without its answer;
   - show calibration with intervals;
   - test reactivity.
6. **Add interleaved "Which is it?" sets (A; M)** for property kind, method, verdict meaning, gap class, anomaly and proof technique. Use pairs first, and interleave after one correct fresh item.
7. **Add twin blocks (A; M)** for the encoding, atomicity, fairness, hypothesis, observer, isolation and semantics pairs. Use comparative prompts first in expert areas.
8. **Rebuild the Audit Desk around explanation (A for a small effect; S):**
   - every finding needs an explanation, a fix and a specimen;
   - correct examples come first;
   - queue order follows prior knowledge;
   - more sound cases (L3);
   - a check at one week.
9. **Remove the locks (A; S).** "Set" becomes a computed status. Drawers and audit cases are always available, with provenance logged.
10. **Enforce tool-switching discipline (A/C; S–M):**
    - one new tool per course;
    - the same transfer example in every tool;
    - a browser primer for each tool;
    - instructions inside the lab files;
    - resume notes.
11. **Make linked multi-view representations the default in Courses 00, 01, 05 and 08 (C; M),** with fading optional.
12. **Keep problem-solving-first openers to conceptual "invent the check" moments (A/B; S),** always consolidated with explanatory feedback, and never for tactic fluency.
13. **Change the writing mix (A, small; S):** short prompted writes, plus a capped note every 2–3 stages.
14. **Adapt the agent guardrails (B/C; S–M):** provenance weights, an explanation gate, no-agent statement review, code-seeded protégé errors, and self-regulation scaffolds before agent use (L3).
15. **Keep a misconception catalogue per course (C; S).** Entries include:
    - implication and vacuity;
    - Kolikant's preconceptions;
    - "unsat = safe", "No error = correct", "kernel = requirement", test-as-proof;
    - the LTL catalogue (L2).
16. **Measure on the device (D; M):**
    - VRK₃₀, calibration, and Audit precision/recall;
    - within-learner comparisons with keep/kill rules set in advance;
    - item-writing lints from day one (in kernelspace, the longest option was correct in 94.7% of quiz items).

---

## 5. Open questions

1. **Does retrieval practice hold for high element-interactivity formal reasoning,** such as constructing proofs and deriving VCs?
   - New evidence points both ways (U19).
   - A DFG research group (FOR 5254, "Lasting Learning") is testing whether retrieval fails on complex material only when initial understanding was inadequate. Its project page reports no results yet (last changed 2026-02-19) <https://www.psychologie.uni-wuerzburg.de/paepsy/for5254/projects/the-testing-effect-and-the-complexity-of-the-learning-material-the-adequacy-of-the-knowledge-base-as-a-moderator/>.
   - If that hypothesis holds, retrieval belongs after worked examples, not before.

   Validate generators with 30-day cold checks.
2. **Do prequestions work for complex formal procedures?** Prior knowledge changes which format helps (U13). The 2024–2026 evidence (U25) covers prose only, and no study covers formal procedures.
3. **Does the warning about prompts on completion steps (Hilbert 2008, geometry proofs) hold for Lean tactic proofs?** And does per-step prediction in Goal Replay overload novices? Test within the learner.
4. **Are confidence ratings reactive in this domain?** The evidence is one word-pair paper (Higham 2023).
5. **Do erroneous examples help adults who are expert in software and novice in formal methods?** The average effect is small (U11). Do the Audit Desk's gains appear at one week, and do they last?
6. **Which no-agent check best separates understanding from agent-produced proofs:** statement review, predicting the next goal, or explaining an induction in words? (See L3.)
7. **How many practice opportunities does a KC need here?** Koedinger's ~7 to reach 80% is an analogy, not a measurement.
8. **What re-entry design fits a 9–18-month arc with gaps of weeks?** kernelspace's welcome-back set is untested (L4).
9. **Is layer-2 feedback redundant in this learner's expert KCs,** or does unfamiliar formal notation make every KC a novice KC at first?
10. **Should the course publish anonymised, opt-in outcome data (kernelspace OD3)?** Formal-methods education has almost no controlled studies.

---

## 6. Verification log

**Pass 3 (resume check, 2026-10-21): checked directly**

| Claim | How checked | Result |
|---|---|---|
| Rhodes & Tauber 2011 (g=0.93, g=0.08) | OpenAlex abstract | Confirmed; the abstract gives no delay length |
| Nelson & Dunlosky 1991 | Crossref record; OpenAlex abstract | Judgment made on the cue alone, "shortly after study". **Corrected** Summary 6, E4 and recommendation 5: "the next day" had been presented as tested, but it is an extrapolation |
| Weinman, Fox & Hearst 2021 | OpenAlex abstract | **Corrected** E1: the advantage over writing and tracing is for programming patterns; general code writing was comparable |
| Chen, Mitrovic & Mathews 2020 | OpenAlex abstract | Confirmed; the missing URL was added to E8 |
| Noetel 2022; Van der Kleij 2015; Bisra 2018; Poulsen 2023; Butterfield & Metcalfe 2001 | OpenAlex, ERIC API, arXiv API | Confirmed; details added to E2 and E13 |
| Sweller & Cooper 1985; Kalyuga et al. 2003 | OpenAlex abstracts | Confirmed; added to E1 as original sources |
| Kalyuga 2007; Makransky 2019 | OpenAlex records with no abstract | Title and venue only |
| Wu, Yu & Gu 2020 | OpenAlex abstract | ES=0.24 over 35 studies; URL added to §2.4 |
| Kliegl & Bäuml 2024; Pan et al. 2026 | Semantic Scholar abstract; Crossref records (PsyArXiv preprint abstract, JARMAC record) | Added as U25. The published JARMAC abstract was not read |
| FOR 5254 project page | Web fetch | Planned studies, no results; cited in §5 only |
| New 2025–2026 meta-analyses on interleaving, hypercorrection, self-explanation and pretesting | Four web searches. OpenAlex was rate-limited (no API key used), and Crossref keyword search was too noisy | None found. The sweep is still not systematic |

**Pass 2 (2026-10-20): checked directly**

| Claim | How checked | Result |
|---|---|---|
| Große & Renkl 2007; Hilbert 2008; Rawson 2013; Fyfe 2014; Hodds 2014; Mejía-Ramos 2012; Hoyles & Küchemann 2002; Rittle-Johnson 2017; Jaakkola & Veermans 2015 and 2018 (online 2017); Sundararajan & Adesope 2020; Höffler 2010; Mertens 2022; Latimier 2021; Higham 2022; Chi & Wylie 2014 | ERIC API abstracts | Confirmed. Hodds' d=0.950 is in the abstract; Rittle-Johnson 2017 is a meta-analysis; the Große & Renkl highlighting result is not in the abstract |
| Butler 2011; Griffiths & Higham 2018; Hulleman & Harackiewicz 2009; Yang 2021; Macnamara & Burgoyne 2023; Burnette 2023 | PubMed abstracts | Confirmed |
| Wisniewski 2020 subgroups | PMC6987456 full text | Confirmed: 0.99 (k=42), 0.46 (k=238), 0.24 (k=39); controlled designs 0.42 |
| Koedinger 2015; Alemdag 2025; Chen, Mitrovic & Mathews 2020; Asher & Carvalho 2026; Huangfu 2026; Metcalfe 2024; Lichtenberger 2024; Mera 2025 (three papers); Chen 2025 (*Comms Psych*); Kranz 2024; Muzsnay 2025; Onan 2025; Klimovich & Richter 2025; Rexhäuser 2026; Meier 2024; Wang 2024; Beege & Ploetzner 2024 | OpenAlex abstracts; Crossref for authors, volumes and dates | Confirmed. Alemdag was found by web search and checked by DOI |
| K1: Adesope "0.70 random effects" | ERIC abstract (no numbers); kernelspace F1 | **Removed;** no accessible source shows it |
| Any newer meta-analyses (worked examples, self-explanation, interleaving, hypercorrection) | Four web searches; OpenAlex search from 2024 | None newer than Barbieri 2023, Bisra 2018 or Brunmair & Richter 2019; no hypercorrection meta-analysis found. Not exhaustive |
| Course-level claims (locks, gap classes, 15% writing, six toolchains) | `PLAN.md`, the roadmap | Consistent |
| kernelspace cross-references (94.7%, toolchain drop-off, V6, H1–H4, OD3, Kucharavy) | grep of PLAN-100X and the audits | Consistent |

**Pass 1 (interrupted run, 2026-10-20): checked directly** through OpenAlex, ERIC, Semantic Scholar, arXiv, NBER, npm and GitHub. Every other item tagged [V] (in K1–K24, U1–U10 and E1–E16). Notes:
- Bangert-Drowns 2004's 0.22 comes from the metadat re-analysis.
- The Hodds booklet's text and licence were read directly.
- The Salden 2010 link returns 404.

**Title or metadata only:** Reiss & Renkl 2002; Macedo 2021; Monsell 2003; Leroy 2009; Parnin & Rugaber 2011; Chen 2025 *PNAS* (beyond a partial abstract); de Jong 2023; Sweller 2024.

**Looked up but not used:** Avigad 2019; Schroeder & Cenkci 2018; Ginns 2006.

**Second-hand:** Sundararajan & Adesope's g values; Rey 2012's d≈0.95 (via Tislar & Steelman); Höffler & Leutner 2007; a secondary summary's g≈0.39 for Rittle-Johnson 2017 (not used).

**From sibling dossiers, not re-checked:**
- [L2]: the Proof Blocks follow-up RCTs, e-Proofs, the LTL catalogue and the proof-validation studies;
- [L3]: self-grade inflation;
- [L4]: oral vs written explanation.

**Inherited [KS]:** every item tagged [KS], taken from kernelspace's logs (2026-10-03).

**Not checked:**
- Selden & Selden 2003; Kulik 1979; Lichtenstein & Fischhoff 1980; Panadero 2017;
- a systematic 2025–2026 sweep (OpenAlex and Semantic Scholar rate-limited);
- 2025–2026 studies of LLM proof tutors (partly covered in L2 and L3).
