# L2 — Proof, logic and formal-methods education: evidence for Plinth

**Checked:** 2026-10-21 (task dated 2026-10-20). **Version 4.** Replaces the 2026-10-21 04:20 version at this path; §6 lists 10 corrections, 5 upgrades and 20 additions. Finding numbers F1–F32 are kept stable because R6 cites them.

**Scope.** Empirical research on learning to read, validate and write proofs and specifications, and documented misconceptions in logic, induction, invariants, LTL, Alloy, concurrency and SQL. Outputs: a misconception catalog per course (§3.1) and evidence-graded instructional moves (§3.2, §4). Siblings are cited as [X: …], not repeated: L1 learning science, L3 assessment and AI, L4 persistence, R6 courseware, kernelspace `computing-education` [X: KS].

**Method.** Primary sources first: full texts from arXiv, eScholarship, ERIC and author pages; abstracts via Crossref, Semantic Scholar, ERIC, DROPS and arXiv. Most publisher full texts were paywalled; OpenAlex refused requests, so three abstracts come from an earlier run's cached OpenAlex records.

**Tags.** [F] full text read this session · [F*] full text downloaded by an earlier run, re-read this session · [A] abstract or repository record read this session · [A*] abstract from an earlier run's cached OpenAlex record · [2H] second-hand, via the named source · [M] metadata or title only · [P] earlier run, not re-checked.

**Grades.** **A** meta-analysis or several RCTs · **B** ≥1 randomized or controlled experiment on this kind of task · **C** quasi-experiment, correlational or large descriptive data (shows a misconception exists, not that a fix works) · **D** small qualitative study, experience report or tool paper · **—** no study; a hypothesis. **Confidence** = how sure I am the source says what I report.

**Transfer caveat.** Nearly every sample is students or crowd workers, not a Rust-fluent engineer studying alone. Help that aids novices can hurt experts [X: L1 U1]; fade scaffolds per knowledge component. The closest samples to this learner are the Dafny, Bosch and AWS engineers (F28).

---

## 1. Summary

1. **Reading and validating proofs is a separate, cheaply trainable skill.** Comprehension and validation load on one factor, construction on another (n = 153). A ~20-minute self-explanation booklet gave d = 0.95; a 15-minute version kept its advantage almost three weeks (F2, F5). **B.**
2. **Engage before the reveal; keep support generative.** Judging and attempting a statement first improved proof understanding; narrated, animated proofs lost more over two weeks; completion blanks *plus* self-explanation prompts impaired learning, prompts alone helped (F3, F4, F7). **B/C.**
3. **Proof Blocks are a middle rung.** In an RCT (N = 332) they matched proof writing in about a quarter of the time, but only after reading; alone they gave the smallest gains. As exam items they carried about as much information as written proofs (F12). **B.**
4. **Help that does the work buys practice scores, not learning.** Error-location hints raised tasks solved from 5.67 to 9.12 of 12 with no retention benefit; hints transferred only with self-explanation prompts; a prover that automated steps let 48% "click randomly"; chatbot answer-seeking predicted lower midterms, review of the student's own proof did not (F15–F17). **B/C.**
5. **There is still no RCT of teaching with a proof assistant** (2025 survey; my searches to 2026-10-21). Quasi-experiments show more explicit, goal-structured paper proofs, no clear grade effect, syntax disengagement, and transfer only with fading (F18–F21). **C/D.**
6. **Writing a formula from English is the hard direction.** English→LTL was wrong 47% of the time vs 23% for LTL→English (researchers: 28% vs 15%). "Only if" caused 75% of biconditional-for-conditional errors in 148,681 wrong translations. Only 25.4% of 97,755 novice Alloy models were correct (F8, F22, F25). **C.**
7. **A shared misunderstanding defeats self-checking.** Tests that share the code's misreading pass; a verifier won't flag a wrong spec. Hidden oracles (wheats and chaffs) and distinguishing scenarios catch it; `pick` beat showing candidate expressions (F26, F28). **B−/C.**
8. **Counterexample form shapes the fix.** Students shown only minimal *or* only maximal counterexamples mostly abandoned them, and many banned only self-loops; explained counterexamples took engineers from 4/13 to 9/13 (F24, F28). **C.**
9. **Catalogs now cover most courses.** Undocumented: reading sat/unsat/unknown, counterexamples to induction (CTIs), noninterference, crash windows, simulation proofs. Plinth must log its own data there (§3.1, §5).
10. **Biggest change for v2:** a misconception-tagged item bank feeding Call It, Re-find and Today; a work-anchored help policy; a self-explanation module; a validation track at the Audit Desk (§4).

---

## 2. Findings

### 2.1 Reading, validating and comprehending proofs

**F1. Proof comprehension has a validated assessment model.** Seven question types: meaning of terms; logical status and proof framework; justification of claims (local); main idea; modules; transferring the method; illustrating with examples (holistic). Reliable multiple-choice tests were built from it; expert comparative judgement of proof summaries was reliable, and top summaries named the logical structure. "Proof Without Claim" tasks (reconstruct what a proof proves) expose how learners link proof to claim.
*Sources:* Mejía-Ramos et al., *ESM*, online 2011-10-11, https://doi.org/10.1007/s10649-011-9349-7 [F*]; 2017, https://doi.org/10.1080/14794802.2017.1325776 [A]; Davies, Alcock & Jones, 2020-10, https://doi.org/10.1007/s10649-020-09984-x [A]; Zazkis & Mirin, online 2025-08-07, https://doi.org/10.1080/14794802.2025.2527638 [A]. **C · high.**

**F2. Self-explanation training improves proof comprehension.** Three experiments: trained students wrote better explanations and scored higher (d = 0.950); eye tracking showed more attention shifts; a 15-minute in-lecture version helped "and the effect persists over time". The booklet takes ~20 minutes, separates self-explanation from paraphrase and is CC BY-SA 4.0; the guide reports an advantage on a different proof "almost three weeks later".
*Sources:* Hodds, Alcock & Inglis, *JRME* 45(1):62–101, 2014-01, https://doi.org/10.5951/jresematheduc.45.1.0062 [A: repository abstract]; booklet https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf; guide https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/SE-booklet-guide.pdf [F*]. **B (one group) · high.**

**F3. Over-supported proofs hurt retention.** e-Proofs (audio plus animation) tied a textbook proof immediately but lost more over two weeks: 2.8 vs 1.3 points of 18 (time × group F(1,47) = 5.659, p = .021); the support "disrupts the processes by which students organise information". Roy, Inglis & Alcock, online 2017-03-29, https://doi.org/10.1007/s10649-017-9754-7 [F*]. **B · high.**

**F4. Engage with the statement before reading the proof.** 87 undergraduates in four groups; two randomly chosen groups (n = 43) first judged and tried to prove six statements, then understood the given proofs by contradiction and contraposition better (medium effect). Hapipi & Stylianides, *J. Math. Behav.* 85:101353 (issue dated 2027-03), https://doi.org/10.1016/j.jmathb.2026.101353 [A]. Weber's reading strategies (try to prove it first, identify the framework, test inferences on examples) agree: 2015-07-03, https://doi.org/10.1007/s40753-015-0011-0 [2H via arXiv 2006.01581v1]. **C+ (group-level randomization) · medium.**

**F5. Novices validate poorly and by surface; experts disagree; validation is its own skill.**
- 8 undergraduates judging 4 arguments started near chance and improved with reflective questions (Selden & Selden 2003, https://doi.org/10.2307/30034698) [2H via Weber 2008; rates unverified].
- Of 13 mathematics majors shown a flawed real-analysis proof, 6 rejected it, only 2 for legitimate reasons (Alcock & Weber 2005, https://doi.org/10.1016/j.jmathb.2005.03.003) [2H via Weber 2008].
- Students spend proportionally more time on surface features; mathematicians shift between consecutive lines, inferring warrants (Inglis & Alcock, 2012-07, https://doi.org/10.5951/jresematheduc.43.4.0358) [A]; mathematicians also validate with examples (Weber 2008, manuscript https://sites.math.rutgers.edu/~jpmejia/files/Weber_(2008JRME).pdf) [F*].
- 109 mathematicians disagreed about one calculus proof; rejecters were more confident; accepters rarely changed when shown the objection (Inglis et al., 2013-04, https://doi.org/10.1111/tops.12019) [A].
- In 153 undergraduates, construction vs comprehension-plus-validation fitted best as two skills (Neuhaus-Eckhardt et al., online 2025-11-11, https://doi.org/10.1007/s10763-025-10621-3) [A].
**C · high (medium for 2H).**

**F6. Proof schemes: what convinces a learner.** Harel & Sowder separate external conviction (authoritarian, ritual, non-referential symbolic), empirical and deductive schemes (1998, https://doi.org/10.1090/cbmath/007/07 [M]; definitions quoted in Nardi et al. 2023, https://doi.org/10.1080/14794802.2023.2261435 [F*]). High-attaining 14–15-year-olds chose algebraic arguments for marks but empirical ones for themselves (Healy & Hoyles 2000, https://doi.org/10.2307/749651 [A*]). Some wrong concurrency solutions reflect "alternative correctness": right most of the time is good enough (Kolikant, ICER 2005, https://doi.org/10.1145/1089786.1089790 [2H via Strömbäck 2021]). For Plinth: "Lean accepted it" is authoritarian; tactic play is non-referential symbolic; "20,000 runs passed" is empirical. **C · medium-high.**

**F7. Worked examples for proving: prompt the principle, don't stack blanks on prompts, train backward reasoning.** 2×2 experiment (N = 111 student teachers): heuristic examples beat a content control; completion requirements "impaired learning especially in combination with self-explanation prompts"; prompts alone helped (Hilbert et al., *L&I* 18(1), 2008-02, https://doi.org/10.1016/j.learninstruc.2006.10.008 [A: ERIC EJ788043]). In the Deep Thought logic tutor, backward worked examples *plus* backward problem solving beat no training or examples alone on unaided proofs (Shabrina et al., arXiv 2208.04696v1, 2022-07-27 [A]). **B (Hilbert); C (Shabrina) · high/medium.**

### 2.2 Logic misconceptions

**F8. English→first-order logic: direction, "only if" and word order.** LPL Exercise 7.12, 2000–2007: >74,000 submissions, 57% erroneous, 148,681 wrong translations from 11,925 students. Shares of all errors: antecedent–consequent reversal 25.86%; biconditional-for-conditional 18.06%; conditional-for-biconditional 11.71%; negation 9.23%; incorrect scope 5.59%; failure to scope 4.85%. Of biconditional-for-conditional errors, 75.43% came from "S only if S", 10.14% "unless", 6.54% "provided". "a is a tetrahedron only if it is in front of b" drew 8,981 wrong answers, 58% biconditionals; "If a is a tetrahedron then it is in front of d" (same form) drew 1,361, 12% biconditionals. Reversals ran 66% when formula order departs from English word order vs 43% when it follows it. Barker-Plummer, Cox, Dale & Etchemendy, *Proc. CogSci* 30 (2008), https://escholarship.org/uc/item/66k15611 [F*]. Whole corpus: 70% of first attempts correct (Mayn & van Deemter, arXiv 2204.12197v1 [F*]). **C · high.**

**F9. Conditionals: the "defective" reading, and collapse to AND.** Advanced-mathematics students' conditional reasoning improved more than literature students', but toward treating false-antecedent cases as irrelevant (Attridge & Inglis, *PLoS ONE*, 2013-07-15, https://doi.org/10.1371/journal.pone.0069399 [A]; Inglis & Simpson 2009, https://doi.org/10.1007/s10649-009-9187-z [A]). Think-alouds with 7 students after digital logic: none translated "A iff B" correctly (reduced to one direction or AND); four wrote "if A then B" as A AND B; students felt an equivalence was proved after one or two rows ("proof by incomplete enumeration") (Herman, Kaczmarczyk, Loui & Zilles, ICER 2008, https://doi.org/10.1145/1404520.1404527; PDF https://zilles.web.engr.illinois.edu/papers/misconceptions.icer08.pdf [F]). **C; D for Herman · high.**

**F10. Quantifiers and negation: the unpacking bottleneck.**
- 61 bridge-course undergraduates unpacked informal calculus statements into predicate logic in 8.5% of attempts (simplified) and 5% (textbook) (Selden & Selden 1995, https://doi.org/10.1007/BF01274210) [A: PhilArchive abstract].
- 40 junior CS students: where the correct negation clashed with plausible content, correct negations rose from 11.8 to 22 of 40 after a logic course, so ~45% still failed; non-clashing items stayed near ceiling (32.8 → 34.5) (Alacaci & Pasztor, *Proc. CogSci* 27, 2005, https://escholarship.org/uc/item/557238g2) [F*].
- People reasoned about formal specifications with the same biases as natural language; content and believability shifted performance (Loomes & Vinter 1996, https://uhra.herts.ac.uk/id/eprint/12213/) [A; preliminary].
- Quantifier order in context: Dawkins & Roh 2019, https://doi.org/10.1007/s40753-019-00097-2 [M]; negating implications: Arnold et al. 2026, https://doi.org/10.1016/j.jmathb.2026.101345 [M].
**C (D for 1996) · high/medium.**

**F11. Induction.** Students who understood recursive definitions proved by induction; others failed or worked mechanically (Polycarpou, ACM SE 2006, https://doi.org/10.1145/1185448.1185579 [A]). A 2026 work-in-progress summarises the literature: base case seen as optional, step as circular, low confidence, unsure when to use induction; its own 15-student think-alouds had no results yet (Khera et al., ASEE 2026, https://nemo.asee.org/public/conferences/374/papers/51752/view [A]). When a tool automated equational steps, many students left the inductive step blank on paper (F16). **C/D · medium.**

### 2.3 Scaffolds, sequencing and feedback

**F12. Proof Blocks: equal learning in a quarter of the time, after reading.** RCT, 332 discrete-maths students learning induction, all reading notes first, posttest a week later: no difference (χ² = 0.54, p = 0.76); activity time 11.1 min (Proof Blocks, n = 107), 32.1 (hybrid, n = 112), 43.4 (written, n = 113) (Poulsen et al., SIGCSE 2023, https://doi.org/10.1145/3545945.3569797 [F*]). Proof Blocks alone gave the smallest gains; chapter plus blocks was only marginally above the chapter alone (SIGCSE 2024, https://doi.org/10.1145/3626252.3630831 [A]). Distractors: +9.0 points (p = 0.114) vs +5.4 (p = 0.348) over an off-topic control, at 19.3 vs 10.5 vs 7.7 minutes (SIGCSE TS 2025, https://doi.org/10.1145/3641554.3701787 [F*]). As exam items they were easier than written proofs yet gave "about as much information about student knowledge" (ICER 2021, https://doi.org/10.1145/3446871.3469741 [A]). Dependency-DAG grading; optional blocks allow several valid proofs (arXiv 2510.11999v1 [A]). **B · high.**

**F13. Parsons problems, distractors and subgoals.**
- Parsons problems with distractors took less time than fixing or writing code, with no significant difference in learning or one-week retention (Ericson, Margulieux & Rick, Koli 2017, https://doi.org/10.1145/3141880.3141895 [A]); not when the solution was unusual (Haynes & Ericson, CHI 2021, https://doi.org/10.1145/3411764.3445292 [A]).
- Distractors: +11 points immediately (significant), +10 a week later (approaching significance), because learners read blocks closely (Smith et al., ICER 2024, https://doi.org/10.1145/3632620.3671114 [A]); for young novices in a blocks language they cut success 26% and added 14% time, with equal transfer (Harms et al., ICER 2016, https://doi.org/10.1145/2960310.2960314 [F]).
- Subgoal labels over a semester (265 students): better quizzes, not exams, fewer drops and fails (Margulieux et al., 2020-05-11, https://doi.org/10.1186/s40594-020-00222-7 [A]). Learner-constructed subgoals worked best with hints *or* correct-explanation feedback, not both (Margulieux & Catrambone, online 2018-08-15, https://doi.org/10.1080/10508406.2018.1491852 [A]). PRIMM and more: [X: KS F6–F9].
**B (distractors mixed) · high.**

**F14. Trace before writing — for novices.** 5–10 minutes teaching an explicit tracing strategy raised tracing scores 15% and midterms 7% (block-randomized, n = 24) (Xie, Nelson & Ko, SIGCSE 2018, https://doi.org/10.1145/3159450.3159527 [F*]); a comprehension-first tutor gave 60% larger gains than Codecademy (3.89 vs 2.42 of 27) (Nelson et al., ICER 2017, https://doi.org/10.1145/3105726.3106178 [F*]); tracing and explaining predict writing (Lopez et al., ICER 2008, https://doi.org/10.1145/1404520.1404531 [A]). But among 384 CS2 students the gap had closed, reverse gaps were as common, and any gap flagged weak students (Harrington & Cheng, SIGCSE 2018, https://doi.org/10.1145/3159450.3159530 [A]). **B−/C · medium-high.**

**F15. Hints raise performance; retention needs self-explanation.** Alloy4Fun RCT: 85 BSc students fixed faulty specs with one of three hint types or none, then specified from scratch a week later without hints. Tasks solved of 12, session 1 → week later: no hints 5.67 → 5.95; error location 9.12 → 4.84; counterexample 5.42 → 5.89; error description 4.75 → 4.95. Week-later differences were not significant (p = 0.68); 3 counterexample tasks misbehaved. The authors: location hints helped immediate performance "without apparent future negative effects"; none aided retention; try hints with self-explanation (Cunha et al., ICSE-SEET, 2024-04-14, https://doi.org/10.1145/3639474.3640050 [F*]). Randomized: code hints with explanations improved immediate performance but a later unhinted task only with self-explanation prompts (Marwan, Williams & Price, ICER 2019, https://doi.org/10.1145/3291279.3339420 [A]). In a logic-proof tutor, data-driven hints raised completion, posttest and grades and cut abandonment (switching replications; Stamper et al., https://doi.org/10.3233/JAI-130029 [A]). **B · high.**

**F16. When the tool does the target step, learning doesn't transfer.** Hazel Prover, Fall 2025 (25 undergraduates): the tool automated equational steps; 48% agreed they could finish assignments "without thinking, just clicking randomly"; midterm induction scores fell below earlier semesters, with many inductive steps blank. Winter 2026 (16 graduate students, same instructor) required manual steps: 15%, blanks back to normal; cohorts differ (Keenan et al., arXiv 2608.23309v1, 2026-08-24 [F*]). An earlier Coq tool: 21% completed some exercises by random clicking (Kerjean et al. 2022, via Hazel [2H]). A Natural Number Game interviewee: Lean proving "feels like sort of cheating" (Iannone & Thoma, 2025-12-27, n = 2, https://doi.org/10.1007/s40751-025-00193-w [A]). **C · medium.**

**F17. AI help in proof courses: work-anchored review vs answer-seeking chat.** GPTutor, discrete maths, staggered access, 148 students: access raised homework but not exam scores; controlling for prior performance and self-efficacy, chatbot use and answer-seeking predicted lower midterms, while proof-review use showed no detectable independent association (Chen et al., AIED 2026, arXiv 2602.18807v2, 2026-03-31 [A]; the 2025 preprint had reported a positive association, since revised). An LLM induction-proof autograder beat most human graders; students improved proofs with it but trusted it less (Zhao, Silva & Poulsen, arXiv 2406.10268v2 [A]). Explorable proofs (LLM-translated to Lean) improved comprehension answers (n = 16; arXiv 2604.02598v3 [A]). LeanTutor (arXiv 2506.08321v2) and LeanSide (arXiv 2610.00760v2) report no learning outcomes [A]. General AI evidence: [X: L3]. **B−/C · medium.**

### 2.4 Proof assistants in teaching

**F18. No comparative or randomized evidence yet.** The 2025 survey: "no systematic comparative study that would favor one proof assistant over another"; "relatively few analyses" of impact on pen-and-paper proofs; evaluation "still at its debut"; it relays criteria including "resistance to random use success" and "transition to pen and paper proof" (Tran Minh, Gonnord & Narboux, EPTCS 419:1–27, 2025-05-25, https://doi.org/10.4204/EPTCS.419.1 [F*]). A 2026 a priori analysis of six assistants on one exercise frames research questions (Bartzia et al., online 2026-03-12, https://doi.org/10.1080/0020739X.2026.2632264 [A]). My arXiv-API and web searches to 2026-10-21 found no RCT; 2025–2026 ThEdu items (e.g., OnlineProver, Coq in L1, ProofBuddy) and SPLASH-E 2025 are experience reports or usability studies (F21). **State of evidence · high.**

**F19. Lean: explicit, goal-structured writing; real syntax disengagement.**
- 36 proofs from voluntary workshops: Lean-engaged students used accurate notation, full sentences and explicit goals and sub-goals (Thoma & Iannone, online 2021-07-07, https://doi.org/10.1007/s40753-021-00140-1 [A]).
- 99 questionnaires and 37 interviews: "many students failed to engage with Lean due to its difficult syntax and because they perceived programming to be disconnected from the activity of proving" (Iannone & Thoma, online 2023-03-30, https://doi.org/10.1080/0020739X.2023.2178981 [A]).
- Zurich pilot: 5 self-selected finishers of 78 scored 46 vs 34.9 of 60 on the exam (p = .006) (Bottoni et al., arXiv 2501.03352v3 [F*]).
**C/D · medium.**

**F20. Waterproof: explicitness transfers to paper; grades don't clearly move.** Utrecht quasi-experiment (16 active, 18 inactive, 46 controls): active users wrote more explicit steps on paper, even in Dutch with an English tool; exercise count had a non-significant positive effect on quiz 1 (p ≈ 0.10) while school exam grade had d ≈ 0.84; engagement held until week 3, then fell; "suggestive rather than causal" (Otte, Bos, Commelin & Portegies, arXiv 2606.26809v1, 2026-06-25 [F*]). **C · medium-high.**

**F21. Coq, Isabelle and others: immediate feedback helps; transfer needs fading; usability bites.**
- Coq in theory of computation: "students were profiting strongly from the system's immediate feedback and scaffolding" (mainly qualitative) (Knobelsdorf et al., ICER 2017, https://doi.org/10.1145/3105726.3106184 [A*]).
- Coq → textbook proofs via line-by-line comments, weakened comments, then structure-faithful proofs; the transfer's difficulty "is extremely underestimated" (Böhne & Kreitz, EPTCS 267, 2018-03-02, https://doi.org/10.4204/EPTCS.267.1 [F]).
- Coq user study plus heuristic evaluation: assistants build skill, but syntax and unclear errors hinder; formal proofs are more explicit and verbose (Mahinpei, Horta Ribeiro & Milano, SPLASH-E, 2025-10-09, https://doi.org/10.1145/3758317.3759679 [A]).
- Avigad's CMU course: with Lean students "knew what the rules were", unlike human-graded informal proofs; most came to enjoy the unforgiving syntax (manuscript 2018-06-06, https://www.andrew.cmu.edu/user/avigad/Papers/learning_logic_and_proof.pdf [F]).
**D · medium.**

### 2.5 Temporal logic, model finding and specifications

**F22. LTL misconceptions are common, and experts share them.** Wrong answers, English→LTL vs LTL→English: students 47% vs 23–24% (rounds of 57 and 11, 2021–22); researchers 28% vs 15% (29 people). WeakU (U read as weak-until) affected half of round 2 and 9 of 11 in round 4; ImplicitG appeared everywhere. "Eager F" — "Red is on in exactly one state" as F(Red ∧ X G ¬Red) — came from 2 researchers and 15 students. Electrum's unary `after`, read as English "after", led the Alloy Board to restrict implicit-and to line breaks. The authors suggest asking for a satisfying *and* a non-satisfying trace, and warn a tool won't catch a misconception shared by system and formula (Greenman, Saarinen, Nelson & Krishnamurthi, *Programming* 7(2), published 2022-10-15, https://doi.org/10.22152/programming-journal.org/2023/7/7 [F*]). Follow-up (>3,000 responses): Implicit Prefix (24 responses from 14 people), Spreading X, Length and Last (finite traces); Cycle G and Trace-Split U had little support (FM 2024, 2024-09-11, https://doi.org/10.1007/978-3-031-71162-6_30 [F*]). **C · high.**

**F23. Misconception-driven tutors exist; efficacy data are thin.**
- LTL Tutor: conceptual-mutant distractors tied to the catalog; after repeated errors, refutation-style feedback on the general misconception; no LLM grading, for reliability. By April 2025 ~254 users gave 2,261 answers, 23.44% wrong: Implicit G 28.68%, Other Implicit 23.58%, Bad State Quantification 19.25%. No outcome study (Prasad et al., CAV 2025, https://doi.org/10.1007/978-3-031-98685-7_9 [F*]).
- SMoL Tutor (mutation, aliasing, scope): misconceptions widespread; the tutor "appears to improve understanding" (Lu & Krishnamurthi, 2024-04-29, https://doi.org/10.1145/3649823 [A]).
- Mining mistakes: Iltis quantifies logic-modelling misconceptions from >250 data points per exercise (Schmellenkamp et al., SIGCSE 2023, https://doi.org/10.1145/3545945.3569806 [A]); LLM-proposed, algorithmically validated bug-fix transformations reproduced hand-found mistakes (Killich et al., arXiv 2609.17111v1, 2026-09-15 [A]).
**C (prevalence); D (efficacy) · high.**

**F24. Counterexample form shapes what learners fix.** An Alloy class saw only minimal (35) or only maximal (25) counterexamples: 28 and 10 abandoned them for plain Alloy. Of 7 minimal-group stayers, 3 banned all cycles and 3 only self-loops; of 15 maximal-group stayers, 2 and 5. Authors: minimality "and its maximal dual" can frustrate and mislead; provenance can narrow attention; the visualizer drew the eye to self-loops (Danas et al., SEFM 2017, https://doi.org/10.1007/978-3-319-66197-1_11 [F*]). Negative instances helped "in certain settings" (Dyer et al., 2022-04-29, https://doi.org/10.1145/3527323 [A]). Tools can group witnesses into distinct violating behaviours (arXiv 2108.00885v3 [A]); default visualizers "violate presentational and cognitive principles", while lightweight domain diagrams proved "good for reasoning" (arXiv 2412.03310v1 [A]). **C (D for tools) · medium-high.**

**F25. Novice Alloy: wrong operators, extra quantifiers, misleading errors.** 97,755 Alloy4Fun models: 25.4% correct, 45.3% over- or under-constrained, 29.28% syntax or type errors; the most common mistake was the wrong operator (subset for intersection, join, implication), then extra quantifiers; type errors were "ambiguous at best, and misleading at worst" (Jovanovic & Sullivan, arXiv 2402.06624v3, 2024-03-30 [F*]). An earlier run's re-tally of a 2019/20 temporal set: "the protected status never changes" failed 92 of 112 checks, 50 lacking a prime or `after` (https://github.com/haslab/Alloy4Fun/wiki/EM-19-10 [P]). **C · medium-high.**

**F26. Hidden oracles and distinguishing scenarios catch shared misunderstandings.** "If a student develops both their tests and implementation with the same misunderstanding, running their tests against their implementation will not reveal the issue." Examplar checks learners' examples against hidden correct ("wheat") and buggy ("chaff") implementations: "several positive impacts … and no identified negative effects" (Wrenn & Krishnamurthi, ICER 2019, https://doi.org/10.1145/3291279.3339416 [A]). Chaffs built from clustered student failures identify misconceptions "much better" (Prasad et al., 2023-10-15, https://doi.org/10.22152/programming-journal.org/2024/8/7 [A]); Forge and Alloy4Fun use the same idea, without outcome claims [X: R6 F10, F12]. `pick` generates candidate expressions, computes distinguishing scenarios and asks users to rate them; for regexes, LTL and access-control policies it was "a significant improvement over showing users the candidate expressions" and helps detect when no candidate matches (Prasad, Austen, Fisler & Krishnamurthi, ECOOP 2026, 2026-06-25, https://doi.org/10.4230/LIPIcs.ECOOP.2026.22 [A]). **B− (`pick`); C/D (rest) · medium-high.**

### 2.6 Verification practice

**F27. Invariants and weakest preconditions.** 23 students, 129 invariant-based programs: invariant errors were the most common type throughout, in nine kinds (quantifier syntax, quantifier bounds, variable bounds/off-by-one, undeclared variable, imprecise notation, incomplete, missing relationship, too strong, erroneous); the main difficulty was "translating intuitive and informal statements into a symbolic form using logical notation in general and quantifiers in particular" (Mannila 2010, https://files.eric.ed.gov/fulltext/EJ1064303.pdf [F*]). WP computation is reported as hard, without data (Todorova & Orozova 2018 [F*]). WP and spec autograding: [X: R6 F11]. **C/D · medium.**

**F28. Practitioners: spec review is the bottleneck; engineers learn fast on real problems.**
- 14 Dafny users: tests and review "provide rare opportunities to catch errors in formal specifications, which would not be flagged by the verifier"; "sane contracts don't tell you if it actually models reality"; plus "hardening" against SMT brittleness (Mugnier, Zhou, Jhala & Coblenz, *PACMPL* 9(OOPSLA2), 2025-10-09, https://doi.org/10.1145/3763181 [F*]).
- Bosch: surveyed engineers (n = 41) found notation and verification output hard; one-group pre/post (n = 13): from raw model-checker output 4 fully identified the inconsistent spec, with an explained counterexample 9 (not counterbalanced) (Kaleeswaran et al., arXiv 2304.08950v1 [F*]).
- AWS: "Engineers from entry level to Principal have been able to learn TLA+ from scratch and get useful results in 2 to 3 weeks", some on evenings and weekends (Newcombe et al., 2014-09-29, https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf [F*]).
**C/D · medium-high.**

**F29. The FM-teaching literature is mostly experience reports.** Foster's survey of 53 papers: "primarily about sharing experiences"; a Hoare-logic tool (HAHA) reportedly raised assignment scores [2H] (https://eprints.whiterose.ac.uk/id/eprint/207496 [F*]). FMTea 2026 (Tokyo, 2026-05-19) accepted 6 of 12 full papers, centred on assessment [A; X: R6 F11, F19]. **D · medium.**

### 2.7 Concurrency and SQL

**F30. Concurrency: sequential intuitions, lock myths, small interleavings.**
- High-school students found ordering problems more natural than critical sections, invented computational models, saw parallelism that wasn't there and attributed intelligence to systems (Kolikant 2001, https://doi.org/10.1076/csed.11.3.221.3831 [A*]); later the hard part was identifying synchronization goals (Kolikant 2004 [2H via Strömbäck 2021]).
- 216 exam answers: about half eliminated the issue; many didn't tie shared data to one primitive (Strömbäck et al., ICER 2019, https://doi.org/10.1145/3291279.3339415 [A]).
- 137 exam solutions (~55% correct): wrong ones would be right under "alternative abstractions" — sequential consistency; locals shared between calls; pointers copy data; a lock inside a function serialises it; acquire/release delimit a lexical region; acquiring a lock stops all threads; a function runs concurrently only with others (or only itself); sporadic failure is acceptable; waiting instead of failing (Strömbäck, Mannila & Kamkar, 2021-12-11, https://doi.org/10.15388/infedu.2021.29 [F*]).
- 105 real bugs: ~⅓ of non-deadlock bugs are order violations; 92% triggerable by ordering ≤4 memory accesses; 73% of non-deadlock bugs were not fixed by adding or changing locks (Lu, Park, Seo & Zhou, ASPLOS 2008, https://doi.org/10.1145/1346281.1346323 [F]).
- Lönnberg, Berglund & Malmi (ACE 2009) interviewed students building and testing concurrent programs [2H; findings not reached].
**C · medium-high.**

**F31. SQL and NULLs.** Misconceptions stem from prior course knowledge, generalisation, language and incomplete mental models (Miedema et al., ICER 2021, https://doi.org/10.1145/3446871.3469759 [A]). 249 participants, six universities: every misconception was held in 1–52% of answers; most common `IS`/`==` as equality (28%), CTE scoping (26%), DISTINCT on a key (24%) (Koli 2023, https://doi.org/10.1145/3631802.3631821 [F*]). NULL problems vary by feature and can't be reduced to one issue (Toussaint et al., *PVLDB* 15(11), 2022, https://doi.org/10.14778/3551793.3551818 [A]). **C · medium-high.**

### 2.8 Correcting misconceptions

**F32. Refutation works in science; simulated students don't hold misconceptions.** A pre-registered meta-analysis (71 articles, 294 effect sizes) found a consistent advantage for refutation texts that moderators did not change (Danielson et al., online 2024-08-16, https://doi.org/10.1080/00461520.2024.2365628 [A]); see also Schroeder & Kucera 2022, https://doi.org/10.1007/s10648-021-09656-z [M] and a methodological critique, https://doi.org/10.1080/00461520.2020.1861948 [M]. The LTL authors caution that science findings may not carry over to logic (F22). LLM "simulated students" correct themselves after any feedback, relevant or not, across seven models (Do, Sonkar & Sachan, arXiv 2605.12748v1, 2026-05-12 [A]). Erroneous examples: g = .136 [X: L1 U11]. **A (science only); untested in logic · medium-high.**

---

## 3. What this means for the course

### 3.1 Misconception catalog by course

Entries seed Call It distractors, Re-find items, Audit Desk cases or specimens. Version-3 IDs are unchanged. "—" = no learner study: log it through Call It; keep it only if it draws wrong answers.

**00 Ground.** Weight English→formula items; vary surface forms; placement check samples G1–G16.

| ID | Misconception | Seed | Evidence |
|---|---|---|---|
| G1 | "P only if Q" read as Q→P or P↔Q | "A transfer is allowed only if balance ≥ amount" | F8 C |
| G2 | Antecedent and consequent follow English word order | One rule, both word orders | F8 C |
| G3 | → written for ↔, or the reverse | "may read exactly when member or shared" | F8 C |
| G4 | "unless"/"provided" mistranslated | "refund unless the hold was captured" | F8 C |
| G5 | False antecedent read as "irrelevant", not true | A guard that never fires: does "every allowed transfer conserves" hold? | F9 C |
| G6 | Negation fails when the right one sounds implausible | Negate "every hold is eventually released" | F10 C |
| G7 | Quantifier order read from context | "Every account has an approver" vs "one approver for all" | F10 [M] |
| G8 | Informal claim not unpackable into quantifiers | "Balances never go negative" → ∀ reachable s, ∀ a | F10 C |
| G9 | Scope errors | Misplaced bracket in ∀a. P(a) → ∃b. Q | F8 C |
| G10 | Subset where overlap meant; vacuous on ∅ | `u.teams in d.teams` grants a user with no teams | F25 C |
| G11 | Extra or misplaced quantifiers | "Each account has a hold" written set-level | F25 C |
| G12 | Base case optional; step circular | A ledger induction with no base case | F11 C/D |
| G13 | Empirical or authoritarian conviction | "20,000 runs passed"; "Lean accepted it" | F6 C |
| G14 | Proof judged by surface form; framework missed | Well-formatted proof with one gap | F5 C |
| G15 | Proof by incomplete enumeration | Two rows of the 3-bit transfer table "prove" it | F9 D |
| G16 | if-then collapsed to AND; iff to one direction | "If shared then visible" as `shared ∧ visible` | F9 D |

**01 Counterexample** (no learner studies; nearest evidence in brackets): Z1 `sat` read as "the property holds" (G6); Z2 `unsat` read as "safe" without a non-vacuity check (G5, F26); Z3 `unknown` or a timeout read as "no bug" (—); Z4 the model is *the* bug rather than one witness of a class (F24); Z5 the unsat core is the root cause (F24); Z6 `Int` assumed to cover `i64` (—); Z7 G1, G10, G11 carried into the encoding (F8, F25).

**02 Proof** (self-explanation module before 2.3; NNG first; "manual mode" for taught steps): L1 "programming isn't proving", syntax barrier (F19 C); L2 tactic play without understanding (F6, F16 C); L3 kernel acceptance taken as the requirement met, gap class 12 (F6 C, F28); L4 line-by-line reading misses the framework (F1, F5 C); L5 induction hypothesis not generalised, or the wrong variable (—); L6 G12 in Lean form (F11); L7 `simp`/`omega`/`grind`/`decide` closes the taught step (F16 C); L8 can't say what a theorem proves (F5 C).

**03 Semantics:** S1 self-transfer and other aliasing (F23 SMoL C; [X: R6]); S2 `Nat` subtraction truncates and hides an overdraft (—); S3 → for ↔ in typing or guard rules (G3); S4 local state shared between invocations (F30 C); S5 mutation and aliasing intuitions carried from the host language (F23 C).

**04 Obligations** (Derivation Board = the Proof Blocks rung for WP): O1 invariant notation — quantifier bounds, off-by-one, undeclared variables (F27 C); O2 invariant incomplete, missing a relationship, or too strong (F27 C); O3 a CTI read as a reachable bug (—); O4 WP substitution in the wrong direction or with capture (—); O5 missing frame condition (—); O6 partial vs total correctness (—); O7 vacuous VC (G5, Z2).

**05 Time.** Port the LTL catalog to TLA+ (`'`, `[]`, `<>`, `~>`, WF/SF) and keep only tags that draw errors.

| ID | Misconception | Evidence |
|---|---|---|
| T1 | Implicit G / Implicit F | F22, F23 C |
| T2 | Other Implicit ("F prevents flicker") | F22, F23 C |
| T3 | Bad State Quantification | F23 C |
| T4 | U read as weak-until | F22 C |
| T5 | Bad State Index; Spreading X | F22 C |
| T6 | "Resolves exactly once" as F(p ∧ X G ¬p) (eager F, Implicit Prefix) | F22 C |
| T7 | Single-state "invariant": no prime or `after` | F25 [P] |
| T8 | "Eventually … and stays" | F25 [P] |
| T9 | Quantifier outside a temporal operator over a changing domain | — |
| T10 | Vernacular operator reading (`after` as English "after") | F22 C |
| C1 | Sequential consistency assumed | F30 C |
| C2 | Lock serialises the function, stops all threads, or marks a lexical region | F30 C |
| C3 | Shared datum not tied to one lock | F30 C |
| C4 | Runs concurrently only with others (or itself) | F30 C |
| C5 | Correct most of the time is fine; sporadic failure → retry | F6, F30 C |
| C6 | Intelligence attributed to components | F30 C |
| C7 | Pattern applied without reasoning about interleavings | F30 C |
| C8 | "Add a lock" fixes an order violation | F30 C |
| C9 | Safety and liveness swapped | — |

**06 Correspondence** (cross-link tablespace for isolation anomalies): Q1 NULL under negation or aggregation (F31 C); Q2 `==`/`IS` as equality, `= NULL` (F31 C); Q3 missing join condition (F31 C); Q4 CTE scoping (F31 C); Q5 `DISTINCT` needed on a key (F31 C); Q6 differential tests presented as proof (G13); Q7 retries under SERIALIZABLE assumed to terminate (—).

**07 Secrecy:** A1 `in` (subset) where `some … & …` (overlap) was meant (F25 C); A2 quantifying over the whole set, not per principal (F25 C); A3 → for ↔ in "may read iff" rules (F8 C); A4 fixing only the shown instance (F24 C); A5 enforcement mistaken for noninterference (—); A6 accepting a policy without a distinguishing request (F26 B−); A7 a small scope read as unbounded (—).

**08 Effects** (cross-link byzantine): E1 "the outbox guarantees exactly once" (C5); E2 retry without idempotency (F30); E3 the ack always arrives (F30); E4 liveness checked with crashes off (—).

**09 Preservation:** P1 observer ignores aborts (—); P2 simulation direction confused (—); P3 Lean skill assumed to transfer without fading (F21 D).

**Audit Desk:** X1 test or bounded check as proof (G13); X2 surface reading as validation (F5); X3 rejecters overconfident, accepters don't update (F5); X4 verified implementation of the wrong spec (F28); X5 claim doesn't match its proof (F1, F5); X6 spec, tests and code share one misreading, so everything passes (F26).

### 3.2 Mechanic by mechanic

- **Call It, Re-find, Today (fresh seeds).** Options carry catalog IDs; distractors are conceptual mutants, solver-checked against the key [X: L3 F3, F9]; English surface forms vary (F8). Order items trace-satisfaction → formula→English → English→formula, weighting the last; temporal items ask for a satisfying and a violating trace (F22). Repeated misses on a tag trigger a refutation card (F23, F32). Proof Blocks and Derivation Board items qualify for Today (F12). Never validate items on LLM-simulated learners (F32).
- **Self-explanation module** (~20 min, before lesson 2.3, reused for specs and traces): adapt the CC BY-SA booklet (F2).
- **Goal Replay.** Restate and judge the theorem first (F4); predict at subgoal boundaries; one principle prompt per *revealed* step, none on blanks (F7); a statement-hidden variant (F1, F5); fade to an unscaffolded Bench proof (F21).
- **Proof Blocks / Derivation Board.** Only after reading or a replay; DAG-graded; 1–2 catalog distractors (L5, O4, O5); double time budget (F12, F13). Learner-written subgoal labels get hints *or* feedback, not both (F13).
- **Lean Bench.** "Manual mode": the receipt flags automation that closed the taught step; each lemma needs a one-line explanation (F16). Expect a dip after week 3 (F19, F20). Fade write-ups through Böhne & Kreitz's styles (F21).
- **Hints and AI (Prove-it guardrails).** Hinted or AI-touched solves are "assisted": one-line self-explanation, then an unaided redo on a fresh seed (F15). AI reviews the learner's own attempt; no answer-giving chat during practice (F17). Never give a counterexample alone as feedback (F15, F24).
- **Specimen Cabinet and Theater.** Minimise → Generalise (name the class) → near-miss; "fixed only the shown case" is an error (F24). Theater challenges use ≤4 ordered accesses, seeded with C1–C8 (F30).
- **Audit Desk.** Score validation apart from construction (F5); add statement-hidden, distinguishing-scenario (F26) and shared-misreading (X6) cases; capture confidence; keep sound cases.
- **Examples before specs** (04, 05, 07): learners first write example states or traces, checked against hidden wheats and chaffs (F26) [X: R6 F10–F13].
- **Viva and Defence.** Prompts from the seven comprehension facets; summaries must name the logical structure (F1).
- **Catalog → checker lints:** ∃ with ⇒; single-state "invariant"; one-way "unchanged"; "exactly once" with a free prefix; `in` over a possibly empty set; liveness written as safety; "only if" as ↔ (answers F22's call to check users "really meant what they wrote").
- **Distinguishing scenarios for intent:** rating concrete scenarios that separate candidate specs is the best-evidenced way to settle what a spec should mean, including for agent drafts (F26).
- **Counterexample stories** name the class and add a near-miss (F24, F28); timeouts stay "not proved" (Z3).

---

## 4. Recommendations (ranked)

Ranked by impact for this learner × evidence ÷ effort.

| # | Move | Grade | Where | Effort | Guardrail |
|---|---|---|---|---|---|
| 1 | Misconception-tagged item bank (§3.1): conceptual-mutation generators, refutation cards | C catalogs; A refutation (science) | Call It, Re-find, Today, Audit | M | No random distractors; no LLM-simulated validation |
| 2 | Work-anchored help: assisted solves logged; self-explanation per hint; unaided fresh-seed redo; AI reviews only the learner's own attempt; Lean "manual mode" | B / C | Instruments, Bench, tutor | S–M | Assisted solves never count toward VRK₃₀ |
| 3 | Self-explanation module, then principle prompts on revealed steps only | B | Before 2.3; reused in 04, 05, 09 | S | ≤1 prompt per subgoal; CC BY-SA attribution |
| 4 | Validation track: statement-hidden, distinguishing-scenario and shared-misreading cases; separate score; confidence | C / B− | Audit Desk, Defence | M | Keep sound cases |
| 5 | Examples before specs, checked against hidden wheats/chaffs | B−/C | 04, 05, 07, capstone | M | Learner may "critique the wheat" |
| 6 | Engage before the reveal: restate, judge, attempt | C+ | Every proof and spec reveal | S | ≤2 minutes |
| 7 | Minimise → Generalise → near-miss; class-naming counterexample stories | C | Cabinet, Theater, Z3 | M | Minimal-only fix scored as error |
| 8 | Proof Blocks / Derivation Board as the middle rung; reused as Today items | B | 0.5, 2.4–2.7, 4.2–4.3, 9.5 | M | Never first; 2× time |
| 9 | English→formula weighting, surface-form variation, satisfying + violating traces | C | 00, 01, 05, 07 | S | Solver-check every key |
| 10 | Lean on-ramp with planned transfer: NNG → ledger → faded write-ups | C/D | 02, 03, 09 | M | Log syntax friction separately |
| 11 | "Not inductive" (CTI) verdict class, distinct from a reachable violation | — | 4.4–4.7, 5.6–5.8 | S | Tagged as hypothesis |
| 12 | Theater seeded with alternative abstractions and ≤4-access order violations | C | 05, 08 | S–M | — |
| 13 | Tracing items as a test-out, not a gate | B−/C | 00, 05 | S | Experts skip (F14) |
| 14 | Viva/Defence prompts from the comprehension facets | C | All vivas | S | Formative only |

---

## 5. Open questions

1. Do LTL misconceptions transfer to TLA+ primes, `~>` and WF/SF under stuttering? No study found.
2. Do learners mistake counterexamples to induction for reachable bugs? No study found.
3. Does the Proof Blocks time saving hold for Lean tactic steps and experienced engineers?
4. Which hint-fading schedule preserves retention for a solo adult? Evidence is from novices; a large 2025 RCT is titled a "failure to find a benefit" of reflection prompts (https://doi.org/10.1145/3698205.3729547 [M]).
5. Do varied (non-minimal) witnesses improve *learning*, not just debugging?
6. How much Lean→paper fading does an agent-assisted adult need? For Plinth, "paper" means explaining theorem statements and reviewing agent specs.
7. Does work-anchored AI review *cause* better learning? GPTutor shows associations only (F17).
8. Course 07's small-scope hypothesis is design rationale; I verified no evaluation. Teach it as a hypothesis with the bound stamped.
9. Licences: LTL study instruments and Alloy4Fun data state no reuse terms; LTL Tutor and lean4game are GPL-3.0 [P].
10. Can opt-in, on-device item statistics validate the catalog without telemetry [X: L3, L4]?
11. Unverified: Selden & Selden 2003 rates; Weber 2015 and Kolikant 2004–05 full texts; Lönnberg 2009 findings; FMTea 2026 paper contents; Schroeder & Kucera's pooled effect.

---

## 6. Verification log

| Item | How checked | Result |
|---|---|---|
| All [F*] items (Proof Blocks, LTL, Danas, Jovanovic, Hazel, Barker-Plummer, Alloy hints, Dafny, Bosch, Waterproof, Strömbäck …) | Cached full texts re-read and grepped (LTL oldstyle numerals decoded) | Figures as reported; corrections below |
| Herman 2008; Harms 2016; Avigad; Böhne & Kreitz; Lu 2008 | PDFs downloaded this session | Confirmed |
| ~75 DOIs | Crossref; abstracts via Semantic Scholar, ERIC, arXiv, DROPS, PhilArchive | Titles, venues, dates confirmed |
| Kolikant 2001, Knobelsdorf 2017, Healy & Hoyles | Earlier run's cached OpenAlex records | [A*] |
| 2025–2026 sweep | arXiv API and web search (proof assistants, LTL, Alloy, Dafny, TLA+ × education) | New: GPTutor, SPLASH-E 2025, Killich, ThEdu'24 reports; no proof-assistant RCT |
| Second-hand only | Secondary texts | Selden & Selden 2003, Alcock & Weber (via Weber 2008); Kolikant 2004–05 (via Strömbäck 2021); Weber 2015; Kerjean 2022; HAHA |
| Not reached | — | NCTM, T&F, Springer, ACM full texts; CRPIT (DNS failure); Aalto repository |

**Corrections to the 04:20 version (10):**
1. **Danas 2017:** the maximal group did not do better (2/15 vs 3/7 banned all cycles); the authors fault both forms.
2. **Alloy hints:** the week-later gap is not significant, and the authors judge location hints beneficial "without apparent future negative effects"; now "no retention benefit", not "harm".
3. **Khera 2026:** the induction misconceptions are the authors' literature summary; their own data were not yet analysed.
4. **LTL paper:** published 2022-10-15.
5. **Iannone & Thoma 2025:** n = 2.
6. **Bartzia 2026:** frames research questions; no hypothesis about different skills.
7. **Barker-Plummer:** 58% and 12% are shares of the 8,981 and 1,361 wrong answers (my reading of "solutions of this kind").
8. **Schroeder & Kucera:** g = 0.41 not re-verifiable; downgraded to [M], Danielson 2024 now the anchor.
9. **Harms 2016:** young novices.
10. **Kolikant 2005:** now sourced via Strömbäck 2021.

**Upgraded:** Lu 2008, Avigad, Böhne & Kreitz to [F]; Selden 1995 to [A]; `pick` verified on DROPS.

**Added (20 main items):** Herman; Harrington & Cheng; Proof Blocks exam items; Ericson; Haynes & Ericson; Margulieux & Catrambone; Shabrina; GPTutor; Examplar; counterexample classification; Loomes & Vinter; Healy & Hoyles; Alcock & Weber; SMoL; Schmellenkamp; Killich; Mahinpei; eager-F and vernacular-`after`; the refutation critique; Arnold 2026.
