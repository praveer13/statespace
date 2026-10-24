# L4 — Persistence, motivation, transfer and community for a 9–18-month solo arc

Research dossier for the Plinth formal-methods course (successor to kernelspace). **Version 4, compiled 2026-10-21** (brief dated 2026-10-20). It supersedes v3 (same day) at this path. Every load-bearing claim was re-checked independently this session; §6.1 lists corrections and additions. No repository or context file was modified.

**Inputs.** `roadmap.md` (scope); v1 `PLAN.md`, `DESIGN.md`, artboards; kernelspace `PLAN-100X.md`, `audit/motivation.md`, `research/community.md`; sibling dossiers L1 (learning science), L2 (formal-methods education) and L3 (assessment, AI), cross-referenced rather than repeated.

**Tags.** **[V]** verified this session against the primary text or an official record or abstract (§6.2). **[S]** second-hand. **[K]** verified by kernelspace (2026-10-03). **[L1]/[L2]/[L3]** sibling dossier. **[repo]** design documents. **[derived]** computed here. **[U]** unverified.

**Grades.** **A**: meta-analysis or several robust RCTs with adult or higher-education samples. **B**: distant population, fragile effect, or large observational data from a close analogue. **C**: single or small study, practitioner report. **D**: theory, vendor data, design rationale.

**Fit caveat.** No study follows a solo adult through a 9–18-month self-directed technical curriculum; everything below extrapolates from MOOCs, degree programmes, gyms, workplaces, children's apps and industrial formal-methods teams.

---

## 1. Summary

1. **Design for resumption, not completion.** Only 19.5% of HarvardX learners who intended to finish did. In OMSCS, the closest adult analogue, dropout is front-loaded, and a multi-semester hiatus "delayed graduation but has not increased the chances of dropping out" (F1–F2).
2. **Hours bind, not motivation.** Students study 5–8 h/week less than they plan; even "pessimistic" estimates ran short. At Buehler's ratio, v1's 31.5–61 weeks become about 12–23 months. Course hours and other commitments stack if additive: twin the work and count hours once (F6–F7, F42).
3. **Light nudges and deadlines are weak levers.** If-then plans fall from d = .65 to .15 after bias correction (academic .25) and are weakest at 1–6-month follow-ups (.19). One-shot prompts were null at MOOC scale. Self-set deadlines did not raise completion; the classic deadline study was retracted on 2026-09-02 (F8–F10).
4. **Recorded, reported progress monitoring is the best-supported lever** (d+ = .40, 138 RCTs). It works better with range goals, a small explicit "emergency reserve" and an audience the learner respects (F11–F14).
5. **Rhythm: weekly, flexible, repairable, gain-framed.** Habits take months and survive a miss; flexible timing beat fixed windows; broken streaks hurt unless repairable or externally caused; weekly gain-framed streak messages raised practice in a 60,000-pupil RCT; rewarding the return topped 54 nudges (F15–F18).
6. **Motivation: competence and value, not points.** Identified regulation predicts persistence; competence is the strongest need; expected rewards undermine intrinsic motivation (d −.28 to −.40); gamification is short-run and weakest on competence; mastery "belts" outlast leaderboards (F19–F22).
7. **Community: venues, one respected human and public artifacts, not cohorts.** Accountability-partner prompts and preference-based groups were null; proactive coaching worked; exemplary peer work caused quitting; noticed identity claims backfire (F23–F28).
8. **Expect near transfer and build it in.** Far transfer is about zero under controls; workplace transfer tracks utility, realism, error management (adaptive transfer d = .80) and the chance to use the skill. AWS engineers learned TLA+ "in 2 to 3 weeks"; Cedar's recipe is the nearest public precedent (F31–F36).
9. **Plan for decay.** Unused accuracy-based procedural skills lose half their gains in about 6.5 months. v1's default order idles Lean for 14–28 weeks (roughly 25–50% loss if proof skill decays the same way); an optional builder's path cuts the gap to 3–5 weeks [derived] (F37–F38, F42).
10. **v1 still has three locks, "due" notes, a 3.3–5.6-week claim drought in Course 09 and no return loop** (F41).

---

## 2. Findings

### 2.1 Base rates and the shape of attrition

**F1. Intent does not predict completion.** Of 44,535 HarvardX respondents (nine courses, 2013–14) who intended to complete, 19.5% earned a certificate (Reich, EdWeek, 2014-12-10, https://www.edweek.org/leadership/opinion-explaining-mooc-completion-and-retention-in-the-context-of-student-intent/2014/12) [V]. edX completion was 3.13% in 2017–18 (46% for paid, verified learners), and first-timers returning the next year fell from 38% to 7% (Reich & Ruipérez-Valiente, *Science*, 2019, https://doi.org/10.1126/science.aav7958; figures via https://www.insidehighered.com/node/7744) [V secondary]. **B · high (pattern).**

**F2. In the closest adult analogue, dropout is early and breaks are normal.** OMSCS students are working professionals in their mid-30s, taking 1.4 classes a semester and "typically" skipping one or two semesters. 67.9% of matriculants remain or graduated; 22% of dropouts leave after one class and 13% after two; 84.5% of those who passed two courses remain or graduated. Of 1,309 who took a multi-semester hiatus, 38% later dropped out vs 39% overall (Joyner, L@S 2022, https://doi.org/10.1145/3491140.3528283) [V full text]. **B · high.** Paid and credentialed; expect worse solo.

**F3. Voluntary long-horizon learners are mastery-driven.** pwn.college has more than 50,000 learners, 3,833 of them retained over a year, mostly from outside the university; voluntary participants "became the most active mentors". Leaderboards grew static and "less meaningful"; belts were "deeply motivating", with course students solving "for no credit" to earn one; required-course students needed "frequent, lightweight incentives" (Nelson et al., SIGCSE TS 2026, https://doi.org/10.1145/3770762.3772636) [V full text]. Belts are still offered (https://pwn.college, 2026-10-21) [V]. **C · medium-high.**

**F4. Self-paced mastery gating costs completion.** Across 108 controlled evaluations, mastery programmes raised exam scores, but "self-paced mastery programs often reduce the completion rates in college classes" (Kulik, Kulik & Bangert-Drowns, *RER*, 1990, https://doi.org/10.3102/00346543060002265) [V]. **B · high.**

**F5. A gap before the exam loses people.** When openHPI split 6-week courses into 2-week modules, a break before the separate final exam "further reduces initial interest in the exams" (Serth et al., *Front. Educ.*, 2022-10-12, https://doi.org/10.3389/feduc.2022.1008545) [V]. **C (observational).**

### 2.2 Time and dosage

**F6. Time, not intent, runs out.** Among about 25,000 students, no intervention moved academic outcomes, and students "study about five to eight hours fewer each week than they plan to" (Oreopoulos & Petronijevic, NBER w26059, 2019, https://doi.org/10.3386/w26059) [V]. MOOC dropouts named managing time as one of four factors (Eriksson, Adawi & Stöhr, 2017, https://doi.org/10.1007/s12528-016-9127-8) [V]. In a two-year Khanmigo RCT (+0.06–0.08 SD a year), "The binding constraint appears to be engagement" (Oreopoulos & Low, NBER w35620, 2026-08, https://doi.org/10.3386/w35620) [V]. **B · high (direction).**

**F7. Plans run long, even pessimistic ones.** Thesis writers predicted 33.9 days and took 55.5; 29.7% finished by their best estimate and only 48.7% by their *pessimistic* one. Tying predictions to past experience removed the bias (Buehler, Griffin & Ross, *JPSP*, 1994, https://doi.org/10.1037/0022-3514.67.3.366) [V full text]. **B · high.**

### 2.3 Plans, nudges, commitments, deadlines

**F8. If-then plans help a little, least in the middle distance.** 94 tests gave d = .65 (Gollwitzer & Sheeran, 2006, https://doi.org/10.1016/S0065-2601(06)38002-1) [V]. In 642 tests, "extreme evidence" of publication bias left a robust Bayesian estimate of d = .15 [.08, .22]; academic behaviours .25 (k = 14). If-then beat schedule format (.43 vs .29); one rehearsal helped (.45 vs .33), more did not; 1–2 plans matched 7–8; recorded plans did worse (.31 vs .44); strong or self-concordant intentions mattered. By follow-up: under 1 week .48, 1–4 weeks .30, **1–6 months .19**, 6+ months .51 (k = 12) (Sheeran, Listrom & Gollwitzer, *ERSP*, online 2024-03-27, https://doi.org/10.1080/10463283.2024.2334563) [V full text]. **A (small effect) · high.**

**F9. One-shot nudges shrink at scale.** Across 269,169 students in 247 MOOCs, plan-making did not raise completion (+0.19 pp [−0.69, 1.07]; −0.23 pp [−1.61, 1.14]), early activity gains were "short-lived", mental contrasting (MCII) was null for its target group, and a value-relevance prompt helped one subgroup but, post hoc, lowered completion in courses without a global gap. Behavioural insights "have more promise in encouraging one-time, short-lived actions than more continuous behaviors that require sustained effort and habit change" (Kizilcec et al., *PNAS*, 2020, https://doi.org/10.1073/pnas.1921417117) [V full text]. An earlier +29% (time-specific plans predicted *non*-completion; Yeomans & Reich, 2017, https://doi.org/10.1145/3027385.3027416) did not replicate (Andor et al., 2018, https://ideas.repec.org/p/zbw/rwirep/790.html), and a scheduling nudge slightly backfired (Baker, Evans & Dee, 2016, https://doi.org/10.1177/2332858416674007) [V]. Nudge units average 1.4 pp vs 8.7 pp in journals, mostly from selective publication (DellaVigna & Linos, *Econometrica*, 2022, https://doi.org/10.3982/ECTA18709) [V]; bias correction left "no evidence for nudging" (Maier et al., *PNAS*, 2022, https://doi.org/10.1073/pnas.2200300119) [V]. **A · high.**

**F10. Commitments that bind behaviour helped; deadlines did not.** Pre-committing to limits on distracting internet use gave +24% course time, +0.29 SD grades and +40% (11 pp) completion, while alerts and blocking were null. Caveats: 18% participation, paid participants, about 31% PhD/MD holders, and completion p = .090 after Bonferroni (Patterson, *JEBO*, 2018, https://doi.org/10.1016/j.jebo.2018.06.017) [V full text]. A non-binding soft commitment raised exam taking and passing, reminders alone did nothing, and procrastinators gained most (Himmler et al., *AEJ: Applied*, 2019, https://doi.org/10.1257/app.20170288; on soft commitments see Bryan, Karlan & Nelson, 2010, https://doi.org/10.1146/annurev.economics.102308.124324) [V]. Self-funded commitment contracts left gym effects "detectable even several years after" (Royer et al., 2015, https://doi.org/10.1257/app.20130327) [V]. Students showed "a robust demand for commitment, in the form of self-imposed deadlines", yet deadlines did not raise completion and may have hurt; present-biased students self-controlled with repeated tasks (Bisin & Hyndman, *GEB*, 2020, https://doi.org/10.1016/j.geb.2019.11.010) [V]. Ariely & Wertenbroch (2002) is **retracted** (notice online 2026-09-02, https://doi.org/10.1177/09567976261488042) [V] after a replication found "a negligible effect" (Hyndman & Bisin, *Psych. Sci.*, 2026-07-15, https://doi.org/10.1177/09567976261460772) [V] and Data Colada found anomalies (Retraction Watch, 2026-09-03, https://retractionwatch.com/2026/09/03/procrastination-study-duke-dan-ariely-psychological-science-data-colada-tampering-retraction/) [V secondary]. **B · medium-high.**

### 2.4 Monitoring, goals and progress display

**F11. Recorded, reported monitoring works.** In 138 RCTs (N = 19,951), monitoring interventions raised goal attainment (d+ = .40 [.32, .48]), mediated by monitoring frequency, and more so "when the outcomes were reported or made public, and when the information was physically recorded" (Harkin et al., *Psych. Bull.*, 2016, https://doi.org/10.1037/bul0000025) [V]. **A (mostly health) · high.** Recording progress helps; recording plans did not (F8).

**F12. Goals: difficult, public, and shared with someone who matters.** Goal setting gives d = .34, larger for difficult, public and group goals (Epton, Currie & Armitage, 2017, https://doi.org/10.1037/ccp0000260) [V]. Commitment and performance rose with the perceived *status* of the person told (4 studies; Klein et al., *JAP*, 2020, https://doi.org/10.1037/apl0000441) [V]. Self-regulated-learning training gave university students g = .38 (49 studies; Theobald, 2021, https://doi.org/10.1016/j.cedpsych.2021.101976) [V]; in 4,831 MOOC learners, goal setting and planning predicted personal-goal attainment (correlational; Kizilcec et al., *C&E*, 2017, https://doi.org/10.1016/j.compedu.2016.10.001) [V record]. **A/B · high.**

**F13. Range goals and a costly reserve keep people going.** "Lose 2–4 pounds" beat "lose 3 pounds" for re-engagement (Scott & Nowlis, *JCR*, 2013, https://doi.org/10.1086/670766) [V]. An explicit "emergency reserve" (slack with a cost) was preferred and raised persistence, because people avoided spending it (Sharif & Shu, *JMR*, 2017, https://doi.org/10.1509/jmr.15.0231) [V]. **B · medium.**

**F14. Show the smaller area; use proximal subgoals and landmarks.** Early in a goal, attention to accumulated progress raises adherence; late, attention to what remains does (Koo & Fishbach, *JCR*, 2012, https://doi.org/10.1086/663827) [V]. Proximal subgoals built competence and interest where distal goals did not (children; Bandura & Schunk, 1981, https://doi.org/10.1037/0022-3514.41.3.586) [V]. Goal pursuit rises after temporal landmarks (Dai, Milkman & Riis, *Mgmt Sci*, 2014, https://doi.org/10.1287/mnsc.2014.1901) [V]. **B/C · medium.**

### 2.5 Habits, streaks and returning

**F15. Effortful habits take months and survive a miss.** Automaticity took 18–254 days, and "Missing one opportunity … did not materially affect the habit formation process" (Lally et al., 2010, https://doi.org/10.1002/ejsp.674) [V]; a 2024 review found medians of 59–66 days and a range of 4–335 (Singh et al., https://doi.org/10.3390/healthcare12232488) [V]. For 30,110 gym-goers the median was 4–7 months; for 76%, time since the last visit was the strongest negative predictor; 69% favoured the same weekdays (Buyalskaya et al., *PNAS*, 2023, https://pmc.ncbi.nlm.nih.gov/articles/PMC10151500/) [V full text]. Study habits mediated self-control's link to college persistence (Galla & Duckworth, 2015, https://doi.org/10.1037/pspp0000026) [V]. **B · high on "months, not weeks".**

**F16. Flexible timing beats fixed windows.** Paying for gym visits only inside a planned two-hour window produced fewer visits, during and after the incentives, than paying for any visit (Beshears et al., *Mgmt Sci*, 2021, https://doi.org/10.1287/mnsc.2020.3706) [V]. **B · medium-high.**

**F17. Streaks move behaviour both ways; repair and external causes blunt breaks.** Highlighting an intact rather than broken streak raised engagement "independent of actual past behavior", more when the break was self-attributed and less when the streak could be "repaired" (7 studies; Silverman & Barasch, *JCR*, 2023, https://doi.org/10.1093/jcr/ucac029) [V]. Silently removing GitHub's streak counters cut long streaks and weekend activity (Moldon, Strohmaier & Wachs, ICSE 2021, https://arxiv.org/abs/2006.02371) [V]. Among 60,000 Peruvian pupils, messages that "emphasized the benefits of extending or starting a new streak" of weekly work raised weeks practised by 9.4 pp among users and aligned-test scores by about 0.13–0.17 SD among the 2.3% tested, with no discouragement effect (Aulagnon et al., *Econ. Educ. Rev.* 109, 2025, https://doi.org/10.1016/j.econedurev.2025.102721; details from IPR WP-26-05, 2026-02-19) [V]. Khan Academy retired streaks in 2021, citing low use and that they "can actually be demotivating" when breaks are outside the learner's control [S; quote via Aulagnon]. **B · medium.**

**F18. Rewarding the return topped 54 nudges.** Among 61,293 gym members, 45% of 54 four-week programmes raised visits by 9–27%; the best gave "microrewards for returning to the gym after a missed workout"; only 8% lasted beyond four weeks; forecasters could not pick winners (Milkman et al., *Nature*, 2021, https://doi.org/10.1038/s41586-021-04128-4) [V]. **A for gyms · C for study.**

### 2.6 Motivation

**F19. Value and competence sustain persistence.** Self-determination theory (SDT) posits needs for competence, autonomy and relatedness (Ryan & Deci, 2000, https://doi.org/10.1037/0003-066X.55.1.68) [V]. Across 344 samples, identified regulation (personal value) was "particularly highly related to persistence", and external regulation was unrelated to persistence (Howard et al., *PPS*, 2021, https://doi.org/10.1177/1745691620966789) [V]. Competence was the strongest predictor of self-determined motivation (144 studies; Bureau et al., *RER*, 2022, https://doi.org/10.3102/00346543211042426) [V]. **A (correlational) · high.**

**F20. Expected rewards undermine; informational feedback helps.** Engagement-, completion- and performance-contingent rewards cut free-choice intrinsic motivation (d = −.40, −.36, −.28), while positive feedback raised it (.33) (128 studies; Deci, Koestner & Ryan, *Psych. Bull.*, 1999, https://doi.org/10.1037/0033-2909.125.6.627) [V]. The rival review found harm only from expected tangible rewards given merely for doing a task (Cameron & Pierce, *RER*, 1994, https://doi.org/10.3102/00346543064003363) [V]. Intrinsic motivation predicts the quality of performance, incentives its quantity (Cerasoli et al., 2014, https://doi.org/10.1037/a0035661) [V]. **A · high.**

**F21. Choice helps; relevance interventions are fragile.** Choice raised intrinsic motivation, most with 2–4 choices (Patall, Cooper & Robinson, 2008, https://doi.org/10.1037/0033-2909.134.2.270) [V]. Motivation interventions average d = .49, less when randomized (Lazowski & Hulleman, 2016, https://doi.org/10.3102/0034654315617832) [V]. Utility-value writing helps low-expectancy students [L1], but a 2023 RCT was null (Edwards et al., https://doi.org/10.1037/stl0000207) [V], and value-relevance at scale backfired outside one subgroup (F9). **A/B · medium.**

**F22. Gamification is positive on average, short-run and weakest on competence.** Cognitive g = .49, motivational .36 and behavioural .25, with only the cognitive effect robust to rigour (Sailer & Homner, *EPR*, 2020, https://doi.org/10.1007/s10648-019-09498-w) [V]; later meta-analyses give .50 and .78 for achievement (Bai et al., 2020, https://doi.org/10.1016/j.edurev.2020.100322; Zeng et al., 2024, https://doi.org/10.1111/bjet.13471) [V]. In asynchronous online learning (28 studies), motivation g = .52 and achievement .41; narrative beat points, badges and leaderboards; K-12 beat higher education (Treve, *Online Learning* 30(3), 2026-09, https://doi.org/10.24059/olj.v30i3.5188) [V]. Perceived competence rose only g = .28 (Li, Hew & Du, 2024, https://doi.org/10.1007/s11423-023-10337-7) [V]. In a 14-week CS1 course, effects fell after about 4 weeks and partly recovered (Rodrigues et al., 2022, https://doi.org/10.1186/s41239-021-00314-6) [V]; a 16-week badges-and-leaderboard course reportedly lowered intrinsic motivation and exam scores (Hanus & Fox, 2015, https://doi.org/10.1016/j.compedu.2014.08.019; 2018 corrigendum unread) [S]. **B · medium-high.** A 9–18-month arc is almost entirely post-novelty [derived].

### 2.7 Social

**F23. Accountability prompts and grouping did not raise completion; cohort effects are unproven.** Kizilcec 2020's social-accountability arm gave +0.89 pp [−0.22, 1.99] [V]. In a preregistered RCT with 1,259 environmental educators, prompts to recruit an accountability partner changed neither posts nor project completion; inside-course partners cut comments; among US participants, outside partners beat inside ones (Li, Kizilcec, Cho & Krasny, *Online Learning* 29(4), 2025, https://doi.org/10.24059/olj.v29i4.5215) [V]. Preference-based MOOC groups "did not improve course performance or completion" (Zhang et al., 2016, https://doi.org/10.1007/s11423-016-9439-4) [V]. Searches on 2026-10-21 found no RCT isolating cohort or pacing effects for adults; "85–95% cohort completion" is marketing [K]. **B · medium-high.**

**F24. Proactive coaching and structured small groups moved persistence.** Randomized coaching that linked daily activities to long-term goals raised persistence during treatment and enrolment a year later (Bettinger & Baker, *EEPA*, 2014, https://doi.org/10.3102/0162373713500523) [V]. Small-group learning raised persistence in undergraduate STEM (Springer, Stanne & Donovan, *RER*, 1999, https://doi.org/10.3102/00346543069001021) [V]. **B · medium.**

**F25. Comparison cuts both ways.** Comparison with previously successful learners raised completion, mainly for the highly educated (4 RCTs, N = 33,726; Davis et al., LAK 2017, https://doi.org/10.1145/3027385.3027411) [V]. Exposure to exemplary peer work "caused a large proportion of students to quit" (Rogers & Feller, *Psych. Sci.*, 2016, https://doi.org/10.1177/0956797615623770) [V]. **B · medium-high.**

**F26. Noticed identity claims backfire.** Identity intentions that others noticed were acted on less among strongly committed people, through a "premature sense of possessing the aspired-to identity" (Gollwitzer et al., *Psych. Sci.*, 2009, https://doi.org/10.1111/j.1467-9280.2009.02336.x) [V]. Make *progress* public to someone who matters (F11–F12), never *identity*. **B · medium.**

**F27. Teaching others is strongly generative.** Preparing to teach gave g = .35 and teaching after preparing .56, durable and larger when interactive (28 studies; Kobayashi, 2019, https://doi.org/10.1111/jpr.12221) [V]. Non-interactive teaching sometimes fails to replicate (Lachner et al., 2022, https://doi.org/10.1007/s10648-021-09643-4) [V]. **A/B · medium-high.**

**F28. Expert venues exist for the whole toolchain (checked 2026-10-21).** Lean: Zulip is "the main gathering point"; introduce yourself in "new members"; bring a "minimal working example" (https://leanprover-community.github.io/meet.html) [V]. TLA+: a mailing list and a "monthly online community meeting" (`tlaplus/tlaplus` CONTRIBUTING.md) [V]. Alloy: Discourse is "the main venue", and Stack Overflow's `alloy` tag is monitored (https://alloytools.org/community.html) [V]. Z3, cvc5 and Soufflé have GitHub Discussions; Proof Assistants Stack Exchange has 1,656 questions, the newest from 2026-10-11 [V]. **D · high.**

### 2.8 Writing, reflecting, projects

**F29. Writing and reflection help modestly; public vs private is untested.** Writing-to-learn had small positive effects, larger with metacognitive prompts and longer treatment (48 programmes; Bangert-Drowns, Hurley & Wilkinson, *RER*, 2004, https://doi.org/10.3102/00346543074001029) [V], and ES = .30 in grades 1–12 (Graham, Kiuhara & MacKay, *RER*, 2020, https://doi.org/10.3102/0034654320914744) [V]. Reflection beat extra practice early on a learning curve (10 experiments, N = 4,340; Di Stefano et al., working paper, 2023-06-23, https://www.kenaninstitute.unc.edu/publication/learning-by-thinking-how-reflection-can-spur-progress-along-the-learning-curve/) [V; not peer reviewed]. Developers blog to retain knowledge but struggle with "recreating and recalling recent development experiences" (Parnin, Treude & Storey, ICPC 2013, https://doi.org/10.1109/ICPC.2013.6613850) [V]. No controlled public-vs-private comparison was found [U]. **B/C · medium.**

**F30. For adults the project-based achievement edge is small; skills and retention favour it.** Project-based learning: d+ = .71 in mostly school samples (Chen & Yang, 2019, https://doi.org/10.1016/j.edurev.2018.11.001) [V], but SMD **.116 [.027, .204] at university** (k = 57; Zhang & Ma, 2023, https://doi.org/10.3389/fpsyg.2023.1202728) [V full text]. Problem-based learning gained on skills, not knowledge (Dochy et al., 2003, https://doi.org/10.1016/S0959-4752(02)00025-7) [V], and won on long-term retention but lost on short-term retention (Strobel & van Barneveld, 2009, https://doi.org/10.7771/1541-5015.1046) [V]. Whole-task 4C/ID: d = .79, best in higher education (Costa, Miranda & Melo, 2021, https://doi.org/10.1007/s10984-021-09373-y) [V]. Unassisted discovery lost (−.38), guided discovery won (.30) (Alfieri et al., 2011, https://doi.org/10.1037/a0021017) [V]. **B · medium.** Project-first rests on transfer, retention and value.

### 2.9 Transfer

**F31. Far transfer is rare; near transfer is real.** Barnett & Ceci's nine dimensions (content: skill, performance change, memory demand; context: knowledge domain and physical, temporal, functional and social context, modality) make a single far-transfer effect size "misguided" (*Psych. Bull.*, 2002, https://doi.org/10.1037/0033-2909.128.4.612) [V; dimension names S]. Chess, music and working-memory effects shrink as design quality rises (Sala & Gobet, 2017, https://doi.org/10.1177/0963721417712760) [V] and "equaled zero" under placebo and bias controls (Sala et al., *Collabra*, 2019, https://doi.org/10.1525/collabra.203) [V]. For learning to program, near g = .75 and far .47, inflated by untreated controls (Scherer, Siddiq & Sánchez Viveros, 2019, https://doi.org/10.1037/edu0000314) [V]. **A · high.**

**F32. Workplace transfer is generalization plus maintenance, driven by utility, realism and opportunity.** Transfer means generalizing to the job *and* maintaining the skill over time (Baldwin & Ford, 1988, https://doi.org/10.1111/j.1744-6570.1988.tb00632.x) [V]. Across 89 studies it tracked ability, conscientiousness, motivation and support, and same-source measures inflated it (Blume et al., 2010, https://doi.org/10.1177/0149206309352880) [V]. The most consistent factors are perceived utility, self-efficacy and motivation; behaviour modelling, error management and realistic training; and opportunity to perform with follow-up (Grossman & Salas, 2011, https://doi.org/10.1111/j.1468-2419.2011.00373.x) [V]. "Only 10% transfers" is a "delusion" (Ford, Yelon & Billington, 2011, https://doi.org/10.1002/piq.20108) [V]; track "transfer trajectories" (Ford, Baldwin & Prasad, 2018, https://doi.org/10.1146/annurev-orgpsych-032117-104443) [V]. **B · medium-high.**

**F33. Error-management training transfers best to novel tasks.** 24 studies (N = 2,183): d = .44 overall, .56 after training and **.80 for structurally different tasks** (Keith & Frese, *JAP*, 2008, https://doi.org/10.1037/0021-9010.93.1.59) [V]. Mostly adult software training. **A/B · high.** It underwrites Plinth's specimen culture.

**F34. Comparison, bridging, and preparation for future learning.** Case comparison beat other case formats (d = .50, 57 experiments), more when learners sought similarities and got the principle afterwards (Alfieri, Nokes-Malach & Schunn, 2013, https://doi.org/10.1080/00461520.2013.775712) [V]. Transfer can be measured as the ability to learn in the new setting (Bransford & Schwartz, 1999, https://doi.org/10.3102/0091732X024001061) [V]. "Hugging" and "bridging" come from Salomon & Perkins ("Teaching for transfer", 1988-09, https://www.ascd.org/el/articles/teaching-for-transfer) [V record; S content]. **A (comparison) / C.**

**F35. Experienced programmers import false assumptions.** 450 Stack Overflow questions held 276 instances of interference from another language (Shrestha et al., ICSE 2020, https://doi.org/10.1145/3377811.3380352) [V]. **C · medium-high.**

**F36. Engineers learn formal methods fast when the target is their own system.** At AWS, engineers "from entry level to Principal" learned TLA+ "from scratch and get useful results in 2 to 3 weeks, in some cases just in their personal time on weekends and evenings"; newcomers "benefit from hearing about the value of formal methods in industry before tackling tutorials" (Newcombe et al., 2014, https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf; *CACM* 2015, https://doi.org/10.1145/2699417) [V full text]. 216 professionals found formal methods useful but hard to use (Gleirscher & Marmsoler, *EMSE*, 2020, https://doi.org/10.1007/s10664-020-09836-5) [V]. Cedar's Lean proofs found 4 bugs, and differential and property-based testing 21 more (Disselkoen et al., FSE 2024, https://arxiv.org/abs/2407.01688) [V full text]. MongoDB found trace-checking against "a highly abstract specification" impractical but model-based test generation "highly successful" (Davis et al., *PVLDB*, 2020, https://doi.org/10.14778/3397230.3397233) [V]; AWS uses "formal specifications as oracles or monitors" (Desai, FMCAD 2025, https://doi.org/10.34727/2025/isbn.978-3-85448-084-6_2) [V]. **C (survivorship) · medium-high.**

### 2.10 Decay and spacing

**F37. Unused skills decay, cognitive ones most.** Loss grew from d = −.01 right after training to −1.4 after a year of non-use, worse for cognitive and accuracy-based tasks (Arthur et al., 1998, https://doi.org/10.1207/s15327043hup1101_3) [V]. For procedural skills "involving motor components", accuracy fell 0.08 SD a month, and half the gains were gone after about 6.5 months for accuracy, 13 for speed and 11 for mixed measures (1,344 effects; Tatel & Ackerman, *Psych. Bull.*, 2025, https://doi.org/10.1037/bul0000481) [V]. **A · high (direction); rates are extrapolations for proof skills.**

**F38. Spacing for long horizons.** For a one-year delay the optimal study gap was about 5–10% of the delay (Cepeda et al., 2008, https://doi.org/10.1111/j.1467-9280.2008.02209.x) [V]. Thirteen relearning sessions 56 days apart matched 26 sessions 14 days apart over five years (n = 4; Bahrick et al., 1993, https://doi.org/10.1111/j.1467-9280.1993.tb00571.x) [V]. **A (facts) · high.**

### 2.11 AI while learning

**F39. Delegating to AI while learning costs learning.** 52 developers learning a new library with AI scored 17% lower (d = .738) and were not significantly faster; delegation-style use scored 24–39%, conceptual inquiry and generate-then-comprehend 65–86% (Shen & Tamkin, arXiv 2601.20245 v2, 2026-02, https://arxiv.org/abs/2601.20245) [V full text]. Guardrails: L3. **B/C · medium.**

### 2.12 kernelspace and v1 [repo]

**F40. kernelspace learned "honest rewards" the hard way.** A keypress paid 100 XP, ranks saturated at 23% of attainable XP, streaks counted UTC page views, and nothing gave a reason to return (`audit/motivation.md` §0, §3, §6). PLAN-100X answered with XP as graded minutes, repairable weekly streaks of graded work, nothing locking (l.75, l.297), welcome-back sets with "never an overdue count" (l.485) and "own weekly target met in ≥8 of 12 weeks" as design rationale (l.109); it rejected timers, hard locks, loss-framed streaks, XP leaderboards and a core study contract, and deferred Seasons and peer review (l.805–808).

**F41. v1 has no XP, but it has locks, "due" notes, no return loop and claim droughts.** Run waits for a call (`PLAN.md` l.121–125; `DESIGN.md` l.101–102; artboard: "Pick a verdict and a confidence to unlock Run."); theory drawers open "only when a Call It is missed twice" (l.261); audit cases are "unlocked as courses are set" (l.215); notes are "due" after 02, 05, 07 and 09 (l.80, l.265). The Elevation home shows "Next at the bench", a Brier score and "2 agent submissions waiting", but no rhythm, Keep queue or re-entry path. The longest stretches without a new claim or specimen are 09's lessons 9.1–9.5 (3.3–5.6 weeks), 03's 3.1–3.3 (1.3–2.7) and 02's 2.1–2.4 (1.2–2.4) [derived].

**F42. Other commitments compete for hours, and the order is a choice.** The learner may have other commitments and may prefer a different order; offer an optional builder's path (OD-3). In v1's order, 05 starts after 11.5–23 weeks, 07 after 18.5–37 and 09 after 25.5–51. Courses 00–09 total 31.5–61 weeks, about 12–23 months at Buehler's 1.64 ratio, and Lean idles 14–28 weeks [derived; Course 01 = 0.5–1 week].

---

## 3. What this means for the course

### 3.1 The stance

A 9–18-month solo arc is a chain of restartable projects, not one course to "complete" (F1–F2). Each course should end in claims your system can use, so stopping after Course 05 still leaves model-checked designs of your system. Measure rhythm, kept skill (VRK₃₀, L1) and applied claims, never percent complete.

### 3.2 Three phases, three risks

| Phase | Main risk | Evidence | Response |
|---|---|---|---|
| **Ignition**, months 0–3 | quitting before two wins; toolchain and Lean-syntax friction (L2); Rust intuitions; no habit | F2, F15, F35, F36 | Project 00 on day 1; two claims by about week 4; false-friend cards; a value story before each tutorial |
| **Long middle**, months 3–9 | novelty gone, habit still forming, first hiatus, competing commitments, decay | F2, F15, F22, F37, F42 | twins; weekly range target with a reserve; re-entry ritual; monthly retro; Lean keep-alive |
| **Assembly**, months 9–18+ | sprawl, perfectionism, publishing anxiety | F7, F25, F26 | Course 10 *is* your system's report; publish artifacts, not identity |

### 3.3 The unit is the week

- **Typical week:** two Bench blocks of 90–150 minutes on 2–3 self-chosen weekdays, at any time on those days (F15, F16), plus a 20–30-minute Keep block for re-finds, sure-and-wrong re-tests and the 5-minute Ledger review (F11, F37).
- **Target as a range** the learner sets, such as "2–3 Bench blocks" (F13).
- **Rhythm** shows "weekly target met in k of the last 12 weeks", counting only graded or Bench work, twin hours included. A missed week can be made up within 7 days; two reserve weeks per 12 are spent explicitly (F13); declared external breaks (illness, travel, release week) pause the window (F17). Copy is gain-framed ("week 3 of a new run"), never a zero or a daily counter (F17).
- **Projected finish** is a range from the learner's own pace, never "behind"; even pessimistic guesses run short (F7).

### 3.4 Re-entry protocol

| Trigger | Response | Evidence |
|---|---|---|
| Planned week missed | one make-up prompt within 7 days; no rhythm loss if made up | F17, F18 |
| ≥14 idle days | "Back at the bench" (20–30 min): re-read the last claim card, 3 re-finds, 1 Call It, restate the next artifact; acknowledge the return | F15, F18 |
| ≥6 weeks idle | return at the next landmark (Monday, month or course start); a lighter target for 2 weeks; re-make one if-then plan | F2, F14 |

No overdue counts anywhere. The Elevation's "2 agent submissions waiting" becomes "2 audit cases ready" (F17, F40).

### 3.5 Motivation layer

- **No points, ranks, leaderboards or badges.** Rewards are informational: claims, specimens and evidence-based competence statements ("you can derive WP for assignment and `if`: Defence passed, 3 re-finds") (F20, F22).
- **"Set" is the belt**, a large-grained mastery marker earned by L3's Defence and never revoked; L3's 30-day "settled" check adds a later second marker (F3).
- **Erosion is planned and repairable, not damage.** The banner names the seam the course planted ("planted in Course 01 so that Course 06 could crack it"), the set course stays solid, and v1's three repairs are offered (F17: external attribution and repair).
- **The world is the narrative** (F22). **Value first:** each course opens with a guarantee about the learner's own system that it lets them check (F19, F36); no separate relevance-writing exercise (F21). **Choice:** 2–4 real choices per course: path, twin or course-only lab, oral or written explain-back (F21).

### 3.6 Community for a solo learner

Use venues at the point of need (F28) and one respected human outside the course for a monthly 20-minute artifact review (F12, F23, F24). Publish artifacts through short public notes, which also count as the roadmap's rule-5 notes (F11, F26). No cohorts, Seasons, peer review or leaderboards (F23, F40). "Learn generously": after setting a course, answer one newcomer question a month in its venue (F3, F27). Show exemplary notes only after the learner drafts their own (F25).

### 3.7 Transfer design

- **Locate it** on Barnett & Ceci's dimensions (F31). For a twinned lab, domain, physical context (same repo), modality and time (days) are all near; the far dimensions are functional (exercise vs production under deadlines) and social (alone vs with agents). Design for those two.
- **Hugging:** wherever possible the lab *is* work on the learner's own system: a realistic environment and an immediate chance to perform (F32, F36).
- **Bridging:** after each course, re-stamp the guarantees of your own system that it covers. After 05, the claim that a hold eventually resolves needs a stated fairness assumption; after 07, access rules need an observer and a declassification list; after 08, outbox effects put the provider's idempotency in the trusted base (F32, F34).
- **Errors and comparisons:** keep specimens, planted bugs and miscompilers, the best-evidenced transfer device (F33); pair each claim about your own system with its course twin and ask "what differs, and does the verdict change?" before revealing the principle (F34; L1's twin blocks).
- **Negative transfer:** one false-friend card per tool, tested in the course's first week (F35).
- **Measure** applied claims (`provenance: own-system`) per month as a transfer trajectory (F32), unassisted re-finds at 30+ days (VRK₃₀), and preparation for future learning: hours to a first useful result in a Deferred Shelf tool (Apalache, Stateright, Kani) once your own work needs it (F34).

### 3.8 Per course (roadmap order, Path A; the builder's path in SPINE §3.0 uses the same rows)

| Course | Twin in your own system | Persistence risk | Transfer move | False friend |
|---|---|---|---|---|
| 00 Ground | claim cards for 3 guarantees of your system | feels like school | "which guarantee is vacuous or overstated?" | English "proved" ≠ PROVED stamp |
| 01 Counterexample | Z3 queries over the roadmap's transfer, double-capture and refund bugs | none: the designed first win | one rule, two encodings | `Int` is unbounded, `i64` is not |
| 02 Proof | Lean conservation for postings | first valley; syntax disengagement (L2) | faded examples, then own proofs (L1) | `Nat` subtraction truncates |
| 03 Semantics | Mini-Plinth vs your system's language | scope creep; late first claim | reuse decision records | recursion must provably terminate |
| 04a Obligations by hand (4.1–4.5) | invariant obligations in your own system | abstraction | hand-derive 3 obligations from your own system; diff with the checker | a solver bug ≠ a VCGen bug |
| 04b VCGen (4.6–4.8) | course VCGen vs your system's checker | building two checkers | one SMT-LIB emitter, two front ends | — |
| 05 Time | TLA+ specs of your system's holds and effects | new formalism under project pressure | the course spec *is* your system's spec | primed variable ≠ assignment |
| 06a Isolation (6.5–6.7) | SERIALIZABLE with retries | Postgres rabbit holes (cross-link tablespace) | reproduce one anomaly in your own system | READ COMMITTED is the default |
| 06b Correspondence | generated SQL vs reference interpreter | harness sprawl | one shared proptest harness | NULL ≠ `Option`; bags |
| 07 Secrecy | your system's read policy and access matrix | abstraction overload | paired-state check on one real read path | a check on every read ≠ noninterference |
| 08 Effects | your system's outbox and deterministic simulator (cross-link byzantine) | duplicating 05 | choose an abstraction level trace validation can check (F36) | "exactly once" |
| 09 Preservation | Lean semantics of your system's core; differential tests in Cedar's style | longest course; 3.3–5.6-week drought | an early specimen; a TESTED matching-relation claim | a simulation proof ≠ a test |
| 10 Assembly | your system's report | sprawl, perfectionism | one report schema from early on | — |

### 3.9 What transfer to promise

- **Near transfer into your own system:** high, if course artifacts and your system's artifacts are the same artifacts (F32, F36).
- **Judgment transfer** (auditing agent PRs): moderate, if the Audit Desk takes real PRs from your own system and the gap taxonomy becomes its review checklist (F33, F34).
- **Tool-to-tool transfer** (TLA+ to Apalache or Stateright, Lean to Kani or Verus): plausible; measure it as preparation for future learning (F34).
- **Far transfer** ("thinks more rigorously everywhere"): not promised (F31).
- **Negative transfer** from Rust, SQL and English: expected, so pre-empt it (F35).
- **Maintenance:** with Lean idle for 14–28 weeks on Path A, roughly 25–50% of gains could be lost at Tatel & Ackerman's accuracy rate (41–81% at Buehler-stretched durations), an extrapolation from motor-procedural skills [derived] (F37).

---

## 4. Recommendations (ranked by expected effect × evidence ÷ effort)

**R1. Twin every Bench lab with work on your own system, count hours once, and offer an optional builder's path.** *B/C (F6, F7, F32, F36, F42) · effort M.*
- Each lab gets a `twin:` field (path in your own repo, claims minted, receipt checks); `plinth bench check --repo <your-repo>` stamps `provenance: own-system`.
- If the learner's own system needs concurrency and effect models early, offer the builder's path, Path B, in the repaired order the spine publishes (SPINE §3.0; DECISIONS OD-3). On this dossier's draft order, the Lean gap shrinks to 2.7–5.3 weeks [derived].
- Validate dependencies first: 07 needs a standalone access model, and 04a uses commands from your own system on the Derivation Board. Key erosions to seams, not course numbers: under Path B, S5.1 arrives before C2 exists, so it marks a pre-cracked seam when C2 is minted.
- Path A (roadmap order) stays the default; nothing locks either way. Let your own work open Deferred Shelf drawers (for example Kani). *Metric:* at least one applied claim per course from Course 01; planned vs actual hours.

**R2. Remove every lock; make "due" a window.** *A/B (F4, F41) · S.* Audit cases visible from day 1 but *ordered* after their lab, which meets L3's sequencing without a lock; theory drawers always openable, with a "try the call first" nudge; Call It stays the default before Run, with "skip (not recorded)"; notes "after every 2–3 courses" (roadmap rule 5). *Metric:* a CI lint finds no lock or unlock state; Call It skip rate.

**R3. Weekly range target with a reserve and repair.** *B (F13, F15–F18) · S.* As in §3.3: anchored days at any time, a range target, k-of-12, 7-day make-up, two reserve weeks per 12, labelled external breaks, gain-framed copy, graded work only. *Metric:* rhythm; re-entry latency.

**R4. Re-entry protocol.** *B (F2, F14, F15, F18) · S.* As in §3.4. *Metric:* median days to return; share of returns that reach a Bench block within 7 days.

**R5. Make the Ledger a weekly monitor and the home a "this week" view.** *A/B (F11, F14) · S.* A 5-minute weekly review (claims, specimens, one line of "what I can now reason about", roadmap rule 6); a 15-minute monthly retro setting the next 2–4-week proximal goal; accumulated progress shown early in a course, remaining progress late. Break droughts over about 2 weeks with proximal claims: in 09, a failing-simulation specimen at 9.3 and a TESTED matching-relation claim at 9.5; similar early claims in 03 and 02. *Metric:* weeks without a minted claim (target ≤2).

**R6. One or two if-then plans, re-prompted at landmarks; commit behaviour, not dates.** *A for a small effect (F8–F10, F14) · S.* "Set your week": one cue-based anchor plan and one coping plan, rehearsed once and kept short (written plans did worse between studies, F8). Re-prompt at course start, month start and re-entry, since effects dip at 1–6 months (F8). Offer a non-binding soft commitment ("I intend to set Course 05 in about 4–6 weeks") and an optional distraction-limit commitment for Bench blocks (F10). No deadlines.

**R7. Honest, competence-first motivation.** *A/B (F19–F22) · S.* As in §3.5: no points; "set" as the belt plus "settled"; competence statements from evidence; erosion framed as planned and repairable; value framing; 2–4 choices.

**R8. Build transfer in, not after.** *B (F31–F36) · M.* Bridging re-stamps after each course; twin comparisons; false-friend cards; an Audit Desk fed with real agent PRs from your own repository; a Course 08 lesson on choosing a spec abstraction level for trace validation; transfer measured as an applied-claim trajectory, VRK₃₀ and a preparation-for-future-learning check.

**R9. Size the Keep loop to decay; keep Lean alive.** *A/B (F37, F38) · M.* A Keep block of at most 30 minutes a week; review gaps of about 3–5 weeks for a one-year horizon (5–10% of the delay); on Path A, a 20–30-minute Lean proof every 2–3 weeks during Courses 05–08, or a Lean twin; application items set in scenarios from your own system.

**R10. Engineer ignition.** *B/C (F2, F28, F35, F36) · S–M.* Project 00 from the roadmap and a `plinth-lab` template on day 1; two minted claims by about week 4; one AWS or Cedar value story before each tool's tutorial; a Lean Zulip "new members" introduction with an MWE at the start of Course 02; the TLA+ monthly meeting during Course 05.

**R11. Community: venues, one respected human, public artifacts.** *B/C (F12, F23–F28) · S.* A per-course venue link with an MWE template generated from the learner's specimen; a monthly 20-minute claim-card review with a respected colleague or mentor outside the course (status mattered in F12; outside partners beat inside ones in F23); short public notes; "learn generously"; artifacts, never identity statements; exemplars only after a draft.

**R12. Explain, reflect and defend cheaply and promptly.** *B/C (F5, F27, F29) · S.* Oral explain-back (L3); a 5-minute end-of-session reflection in the first third of each course; notes of 600–1,000 words pre-filled from specimen labels and claim cards captured as you go (Parnin's recall problem); schedule the Defence within a week of the lab (F5).

**R13. Guard AI and record provenance.** *B/C (F39) · S.* Write the claim card and theorem statement before any agent attempt; receipts carry `assisted: none | explain | code`; Defences are unassisted (L3).

**R14. Never block study on course software.** *D (F6, F42) · S.* Labs and receipts work from the template before the site exists; build course phase P(n+1) while studying Course n.

**R15. Measure on the device; run n-of-1 trials.** *D (F18) · S.* Track rhythm, re-entry latency, VRK₃₀, applied claims, and planned vs actual hours. Trials: morning vs evening blocks, anchored vs floating days, reserve weeks on vs off, public vs private lab log; forecasters misjudge what works (F18). No telemetry.

**R16. Evidence hygiene.** Do not cite Ariely & Wertenbroch 2002 (retracted 2026-09-02); "85–95% cohort completion"; "only 10% transfers"; "21 or 66 days to a habit" as a rule; implementation intentions at d = .65 without the bias correction; Patterson's +40% without its selection and multiplicity caveats; or PBL d = .71 as an adult effect. Label child and K-12 evidence (F14, F17, F22, F29).

---

## 5. Open questions

1. **Hours.** Are the course's 6–10 h/week shared with the learner's other commitments (twinned work, counted once) or on top of them? On top is the largest single risk (F6, F42).
2. **Default path.** Path A or B? Roadmap rule 1 favours the builder's path for a learner who wants concurrency and effect models early, but its dependencies and erosion re-keying need validation; the owner decides.
3. **Who builds the course software?** Building the course (phases P0–P6) and the learner's own system while studying triple-books the hours; R14 is the minimum response.
4. **Decay of formal-methods skills.** No decay data exist for proof-assistant or model-checking skill; the keep-alive dose is a guess.
5. **Long-run AI effects.** F39 measured about an hour, not months of agent-heavy work on your own system.
6. **Reserve weeks.** Do they act as a costly reserve (F13) or, over 12+ months, as a licence to skip? Test as an n-of-1.
7. **Public lab log.** Does reporting (F11) help more than comparison (F25) hurts?
8. **Call It friction** for an expert after month 3: track the skip rate (R2).
9. **Belts for solo adults.** pwn.college's evidence comes from a large community; whether "set" motivates a solo learner is untested.
10. **Personalisation by interest.** A 2024 meta-analysis exists (Lin, Lin, Zhang & Ginns, *EPR* 36(3), https://doi.org/10.1007/s10648-024-09933-7), but its results were not reachable [U].

---

## 6. Verification log

### 6.1 Changes from v3

**Corrected.** Theobald 2021 is 49 studies with g = .38, not "g = .36 (32 studies)". Sheeran's long-term result now shows the 1–6-month dip (.19). Patterson's completion effect is p = .090 after Bonferroni. Gleirscher's N = 216 is from the EMSE version (arXiv v1 says 192). Aulagnon is now cited to *Econ. Educ. Rev.* 109 (2025). Joyner's retention figure is 67.9%. Li 2025's sample was environmental educators. Kizilcec 2020's value-relevance prompt also lowered completion where there was no global gap. The decay estimate is 25–50%, not 30–50%. Bilal 2019, the Advent of Code illustration and Alfieri 2011's adult subgroup were dropped.

**Added (verified).** On nudges and commitment: Gollwitzer & Sheeran 2006, DellaVigna & Linos 2022, Maier 2022, Bryan et al. 2010. On goals and habits: Klein 2020, Scott & Nowlis 2013, Sharif & Shu 2017, Singh 2024, Serth 2022. On motivation: Ryan & Deci 2000, Cameron & Pierce 1994. On writing and projects: Bangert-Drowns 2004, Dochy 2003, Strobel & van Barneveld 2009. On transfer and decay: Sala & Gobet 2017, Baldwin & Ford 1988, Ford 2018, Alfieri 2013, Bransford & Schwartz 1999, Bahrick 1993, Desai 2025. Second-hand: Hanus & Fox 2015, Khan Academy's streak retirement. Design: Path B with 04a, erosion re-keying, the Barnett & Ceci mapping, trajectory and preparation-for-future-learning metrics.

### 6.2 Claim status

| Status | Claims and how checked (2026-10-21) |
|---|---|
| **V, full text** (PDF or HTML extracted locally) | Joyner 2022; Sheeran 2024 (KOPS open access); Kizilcec 2020 (PMC); Aulagnon (IPR WP-26-05); Newcombe 2014; Cedar 2024; Shen & Tamkin 2026; Patterson 2018 (hosted copy); Buehler 1994; Zhang & Ma 2023; Buyalskaya 2023; pwn.college 2026 (copy cached by the v3 run; identity checked from title and authors, text re-extracted) |
| **V, record or abstract** | every other [V] item: Crossref metadata plus an abstract from Crossref, OpenAlex, Semantic Scholar, PubMed, ERIC, NBER/IDEAS, arXiv or the publisher or repository page linked inline, containing the quoted numbers. The retraction was confirmed by the Crossref notice record (update-to link), OpenAlex's retraction flag and Retraction Watch |
| **V, live data** | venues (`gh api`, project pages), Proof Assistants SE API, pwn.college homepage |
| **S** | Hanus & Fox 2015 (search summaries); Khan Academy's announcement (quote via Aulagnon); Salomon & Perkins 1988 content; edX figures via Inside Higher Ed; Barnett & Ceci's dimension names (the abstract confirms nine) |
| **K** | "85–95% cohort completion" as marketing (kernelspace `community.md`) |
| **L1/L2/L3** | utility-value RCT (L1); proof-assistant disengagement (L2); oral explanation, AI guardrails, the Defence (L3) |
| **Not used** | Brooker & Desai 2025 body (CACM and Queue blocked; Desai's FMCAD abstract used); Bilal 2019 (MIT DSpace unreachable); Lin 2024 results; Gick & Holyoak 1983; Duolingo A/B figures (vendor, second-hand) |
| **repo** | `PLAN.md` l.80, 121–125, 215, 261, 265 and §1, §3 tables; `DESIGN.md` l.101–102; Lesson and Elevation artboards; `PLAN-100X.md` l.75, 109, 297, 485, 805–808; `motivation.md` §0, §3, §6 |
| **derived** | course start weeks, totals, Buehler stretch, Lean gap, decay share, Path B timing, claim droughts (v1 §1 estimates; Course 01 = 0.5–1 week; 06a = 3/9 and 04a = 5/8 of their courses) |

**Method notes.** Downloads went to a private `l4v4-dl/` directory and were parsed with pypdf 5.1.0 in a private virtual environment; scripts were kept separately. Repository and context files were read, not modified.
