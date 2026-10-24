# L3 — Assessing formal reasoning, metacognition and AI help in a zero-server course

**Topic:** How to assess formal-reasoning skill validly and cheaply in the Plinth course (v1 `PLAN.md`), the successor to kernelspace, and how to replace the self-graded vivas.
**Date:** 2026-10-20 (first pass), resumed the same day for a targeted re-check. A second resume pass on 2026-10-21 applied an independent fact-check (`L3-assessment-ai.verify.md`), re-checked versions and added six 2025–2026 sources. The last rows of §6 list what changed.
**Inputs read:** `roadmap.md`, v1 `PLAN.md` and `DESIGN.md`, the six canvas artboards, kernelspace `PLAN-100X.md` and its `ai-tutoring`, `learning-science` and `computing-education` dossiers. I checked overlap with sibling reports R6 and L4 without editing them.
**Method:** primary sources were read directly where reachable. These were papers, arXiv versions, official docs, and Crossref or OpenAlex records looked up by exact DOI. The session's shared web-search budget ran out partway through, so later items were verified only by direct identifier lookups (§6).

**Two scales are used throughout:**
- **Evidence grade** says how strong the evidence is for the effect.
  - **A:** meta-analyses or several RCTs agree, and transfer to an adult self-learner is plausible.
  - **B:** at least one good RCT, a strong quasi-experiment or a robust lab effect. Applying it here is an extrapolation across population or domain.
  - **C:** preliminary: a preprint, small N, correlational data, usage or perception data only, or an engineering precedent with no learning outcome.
  - **D:** design rationale or a [derived] computation, with no outcome data.
- **Confidence** (high, medium or low) says how sure I am that the source says what I report.

---

## 1. Summary

1. **The domain supplies the grader.** Most completion-test skills can be assessed as constructed responses (violation queries, weakest preconditions (WP), invariants, specs, counterexamples, mutation predictions) checked by a solver, model checker, interpreter or proof kernel. Grading uses equivalence, wheat/chaff strength, inductiveness, witness evaluation or Lean statement matching. The precedent is strong (Automata Tutor, Alloy4Fun, LTL Tutor, Examplar, DSLabs, nl2postcond); evidence that these tools improve learning is thin (B−/C).
2. **Replace the self-graded viva with a Defence:** machine-graded probes on unseen seeds, predictions about seeded mutations of the learner's own Bench artifacts (graded by Lean, TLC or Z3), and witness-backed Audit findings. Keep the spoken explain-back for learning, not credit. Rubric self-grades can correlate with a teacher's at r ≈ 0.9 yet inflate, most for weak performers (Sadler & Good 2006). Orals need many cases: four 20-minute orals with two examiners each reached only 0.78 reliability (Wass et al. 2003).
3. **Split v1's single progress ledger in two.** v1 makes "progress the Claims Ledger", and an agent can fill it. Keep **Claims** (what artifacts establish) apart from **Evidence** (what the learner can do, weighted by provenance; kernelspace V3/V6). Substitution harms learning: −17% on an unassisted exam (Bastani 2025), d = 0.74 (Shen & Tamkin 2026).
4. **Generate items as code:** misconception-tagged *conceptual mutation* for distractors, a solver check that each differs from the key, structural as well as numeric variety (Chen et al. 2018: a 13-point leakage advantage fell to 2–3), difficulty bands, and lints for the length and *convergence* cues (Smith 1982).
5. **Keep Call It, but fix scoring and display:** a proper scoring rule, intervals, a minimum n, and calibration that never gates progress (keep the predict-before-Run step; confidence prompts are reactive, and penalties mix in risk attitude). Calibration feedback cuts overconfidence but not discrimination, and teaching content can *raise* overconfidence (Stone & Opel 2000), so lead with bias rather than a raw Brier score. Re-test sure-and-wrong calls at about 1 day and 1 week, because confident errors return.
6. **The 2024–2026 AI evidence is consistent.** Unguarded AI lifts practice, lowers unassisted performance and inflates self-assessment; grounded, platform-sequenced tutoring helps; engagement binds. In Dafny exercises, ChatGPT raised performance while it was available; learning was not measured (Carreira et al. 2025). AI-literate users self-assess *less accurately*, erring towards overconfidence (Fernandes et al. 2026), which describes this learner.
7. **An LLM is never the grader of record.** Judges approach human agreement on narrow tasks (κ 0.70 against 0.75 on short answers; 89.3% against 90.4% on proof correctness). But they inflated olympiad proof scores up to about 20× (Petrov et al. 2025), disagreed substantially with TAs in a proof course (Mahinpei et al. 2026), and are manipulable and sycophantic. Use them for formative feedback, or to *formalize* an explanation that a checker grades. That route is still lenient and immature: LeanTutor found the wrong step in only 30% of incorrect proofs.
8. **Use LLMs as adversaries at build time.** They draft plausible but wrong agent PRs, specs and proofs; a checker certifies every flaw with a witness and every "sound" case as sound. Show the witness immediately (lures stick), and place each case after its lab (erroneous examples help mainly learners with prior knowledge). Frequent AI users spot hallucinated solutions worse (Deutsch & Oca 2026, correlational), so the audit skill needs deliberate training.
9. **Fix two measured v1 defects.** The Audit Desk has 4 sound cases in 32, so "reject everything" scores 87.5% precision and 100% recall. The home screen's calibration copy rests on about 12 calls per bucket, a 95% CI of roughly 0.32–0.81 [derived].
10. **Explain to learn, not to be graded.** Speaking beats writing (Lachner et al. 2021). Self-explanation training improved proof comprehension (d = 0.95), and a 15-minute in-lecture version also worked (Hodds et al. 2014). Teaching after preparing gives g = 0.56 (Kobayashi 2019). Credit only what a checker can verify.

---

## 2. Findings

### 2.1 Constructed responses graded by checkers

**F1. Counterexample or hint feedback from an equivalence checker beats binary feedback on time and persistence, not yet on demonstrated learning.**
- **Study:** 377 students at two universities, randomly assigned to binary, counterexample or hint feedback while building DFAs. Time per problem was 394 s with binary feedback, against 245 s (counterexamples) and 264 s (hints). Give-ups on optional practice were 44%, against 27% and 33%.
- **No difference:** attempts and grade improvement were the same across arms, and the one-shot transfer item was at ceiling everywhere (about 9.7/10).
- **Authors' warning:** students may "treat the counterexample as a special case", patching it instead of finding the general mistake.
- **Source:** D'Antoni et al., *TOCHI* 22(2), 2015-04, https://doi.org/10.1145/2723163 (PDF read: https://microsoft.com/en-us/research/wp-content/uploads/2016/12/tochi15.pdf). Automata Tutor v3: CAV 2020, https://doi.org/10.1007/978-3-030-53291-8_1.
- **Grade B** (an RCT, but on process outcomes) · **confidence high.**

**F2. Hidden-oracle equivalence grading of specifications is in routine use.**
- **Alloy4Fun:** instructors hide `//SECRET` check commands that test whether a student's predicate is semantically equivalent to the teacher's, within Alloy's bounded scope. An MSc thesis reports about 97,755 logged submissions from 2019 to spring 2023 (Minho and Porto) and uses them to generate hints. No outcomes are reported. Sources: Macedo et al., ABZ 2020, https://doi.org/10.1007/978-3-030-48077-6_5; Barros, MSc thesis, U. Porto, 2023-07-25, https://repositorio-aberto.up.pt/bitstream/10216/151936/2/636676.pdf.
- **Iltis:** web logic exercises "in courses … with more than 300 students". ITiCSE 2018, https://doi.org/10.1145/3197091.3197095; arXiv v3 2022-05-27, https://arxiv.org/abs/2105.05763.
- **Grade C** · **confidence high** for the mechanism, **medium** for the counts.

**F3. The LTL Tutor is a complete template for misconception-tagged, generated formal-logic items.**
- **Generation:** seed formulas come from Spot's `randltl` (at most 4 propositions). Distractors are *conceptual mutants*, each tied to a catalogued misconception, and semantically identical mutants are dropped because LTL equivalence is decidable. Traces for trace-satisfaction items come from Büchi automata.
- **Learner model and feedback:** misconception likelihoods with recency decay. After 5 or more errors, the learner gets a refutation text for the most likely misconception.
- **Usage by April 2025:** 254 users and 2,261 answers, 23.44% of them wrong. "Implicit G" accounted for 28.68% of wrong answers.
- **No LLMs:** the authors avoid them because "English translations [must] never be incorrect", and they decline LLM grading of LTL-to-English answers for reliability.
- **Outcomes:** no learning-outcome evaluation is reported.
- **Sources:**
  - Prasad, Greenman, Nelson & Krishnamurthi, CAV 2025 (Distinguished Paper), https://doi.org/10.1007/978-3-031-98685-7_9 (PDF read: https://users.cs.utah.edu/~blg/publications/hf/pgnk-cav-2025.pdf);
  - the misconception catalog: *Programming* 7(2), 2023, https://doi.org/10.22152/programming-journal.org/2023/7/7.
- **Grade C** · **confidence high.**

**F4. A specification can be scored on two axes: validity (wheats) and strength (chaffs).**
- **Examplar:** learner examples are *valid* if they accept every correct implementation (wheat), and *thorough* by the share of buggy implementations (chaffs, which encode likely misunderstandings) they reject. Program output is suppressed so students cannot probe the wheats instead of reading the spec. Between two non-randomized cohorts, invalid suites fell (DocDiff 29.7% to 9.3%), thoroughness held, and the effect on implementation correctness was inconclusive (p = 0.086). ICER 2019, https://doi.org/10.1145/3291279.3339416.
- **nl2postcond:** defines *correctness* (the reference satisfies the postcondition) and *bug-completeness* (the share of mutants killed). Because `true` is "vacuously" correct, strength has to be measured with mutants, and LLM-generated "natural" mutants are harder to kill than artificial ones. Endres et al., FSE 2024, arXiv v2 2024-04-15, https://arxiv.org/abs/2310.01831.
- **Forge**, Brown's Alloy-derived teaching language, ships testing features for specifications. OOPSLA 2024, https://doi.org/10.1145/3649833.
- **Grade C** · **confidence high.**

**F5. A model checker can be the grader.**
- **DSLabs** grades student Paxos and sharded key-value implementations with an explicit-state model checker plus a visual debugger, for about 175 students a year (the EuroSys abstract says "over two hundred students", cumulatively). Guided search found a 36-step Paxos bug in about 18 s, against about 12 h unguided.
- **Sources:** EuroSys 2019, https://doi.org/10.1145/3302424.3303947; details from a secondary summary, https://blog.acolyer.org/2019/04/17/teaching-rigorous-distributed-systems-with-efficient-model-checking/.
- **Grade C** · **confidence medium** (secondary source).

**F6. A learner's inductive invariant can be machine-checked, completely only on tiny models.**
- **Conditions:** Init ⇒ Inv; Inv ∧ Next ⇒ Inv′; Inv ⇒ I.
- **TLC method:** use Inv itself as the initial predicate. This is complete but "works only on extremely tiny models". On larger models, switch to probabilistic checking from random initial states.
- **Source:** Lamport, *Using TLC to Check Inductive Invariance*, 2018-08-23, https://lamport.azurewebsites.net/tla/inductive-invariant.pdf.
- **For Mini-Plinth:** with linear-integer state, Z3 can check the same three conditions without bounds and return a counterexample to induction [derived].
- **Grade D** (a technique) · **confidence high.**

**F7. Lean now documents a ladder for validating proofs.**
- **The rungs:** editor check marks; `#print axioms`; kernel replay (`lean4checker --fresh`, which ships as `leanchecker` with every toolchain from v4.28.0; the old repo is archived, last push 2026-03-25); and `lake comparator`.
- **Comparator** builds in a sandbox and replays the proof in Lean's kernel and/or the independent Rust checker *nanoda*. It also checks that the proved statement matches a trusted challenge file, guarding against actively malicious proofs.
- **AI-generated proofs count as possibly malicious.** The manual defines malicious code as code that "goes out of its way to trick or mislead the user, exploit bugs or compromise the system. This includes un-reviewed AI-generated proofs and programs." It reserves comparator for high-risk scenarios, "unaligned AI" among them.
- **Axioms:** `propext`, `Classical.choice` and `Quot.sound` are benign. `sorryAx`, `_native` axioms and custom axioms are warning signs; since 4.29.0, each natively evaluated computation adds its own axiom.
- **Removed:** `Lean.trustCompiler` was removed in 4.35.0 (stable since 2026-10-12; 4.36.0-rc1 followed on 2026-10-14).
- **Sources:** https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/ (read 2026-10-21); https://lean-lang.org/doc/reference/4.29.0/ValidatingProofs/ ; https://github.com/leanprover/lean4/releases ; https://github.com/leanprover/lean4checker
- **Grade D** · **confidence high.** R6 reaches the same conclusion.

**F8. In-browser Z3 has a hosting constraint.**
- **Requirement:** the `z3-solver` JavaScript package "requires threads", so it needs `SharedArrayBuffer`, and pages must be served with COOP/COEP headers. For GitHub Pages the README points to a `coi-serviceworker` workaround, adding "you shouldn't use that trick in more complex applications". Latest npm release: 5.3.1, 2026-10-16. Sources: https://github.com/Z3Prover/z3/blob/master/src/api/js/PUBLISHED_README.md ; https://registry.npmjs.org/z3-solver
- **Python alternative:** R6 reports Z3Py running in Pyodide wheels. I did not check that build's threading needs.
- **Grade D** · **confidence high.**

### 2.2 Item generation, distractors and test-wiseness

**F9. Randomizing parameters alone is weak; varying structure works.** On asynchronous exams in a course of 425 students, "information consumers" (later test-takers who could learn from earlier ones) gained 13 percentage points when everyone got the same generator with randomized parameters, but only 2–3 points when each drew from a pool of 2–4 different problems (Chen, West & Zilles, L@S 2018, https://doi.org/10.1145/3231644.3231664, PDF read). This measures leakage between test-takers, not learning. For a solo learner [derived], it means that seeing one seed of a template partly reveals all of them. Pools vary in difficulty: selecting with history roughly halved the SD of exam difficulty (Sud, West & Zilles, ASEE 2019, https://lagrange.mechse.illinois.edu/pubs/SuWeZi2019/), generator difficulty is predictable from homework data (Chen et al., L@S 2019, https://doi.org/10.1145/3330430.3333647), and cloned items need family-level models (Glas & van der Linden 2003, https://doi.org/10.1177/0146621603027004001).
- **Grade B** · **confidence high.**

**F10. Item-writing guidelines and the convergence cue.**
- Haladyna, Downing & Rodriguez give a taxonomy of 31 multiple-choice (MC) item-writing guidelines "validated through a logical process". The two sources of evidence are consensus across 27 testing textbooks and 27 studies and reviews published since 1990, and the taxonomy is "mainly intended for classroom assessment". So most guidelines rest on consensus, not experiments (*AME* 15(3), 2002, https://doi.org/10.1207/S15324818AME1503_5; abstract read). The examples "homogeneous options" and "balanced key position" come from a search summary.
- Smith documented that the correct answer tends to sit where the options *converge* (*JEM* 19(3), 1982, https://doi.org/10.1111/j.1745-3984.1982.tb00129.x). The classic taxonomy of such exploitable cues is Millman, Bishop & Ebel, "An Analysis of Test-Wiseness" (*EPM* 25(3), 1965, https://doi.org/10.1177/001316446502500304; metadata only).
- **Implication [derived]:** mutation-generated distractors are all one edit away from the key, so the key becomes the centroid. That makes them especially exposed to this cue.
- **Grade B/C** (consensus guidelines plus a documented cue) · **confidence high** for Haladyna (abstract), **medium** for the content of the 1982 paper (title only).

**F11. Plain MC overstates mastery; multiple true/false (MTF) reveals partial understanding.**
- **MTF finding:** "nearly half of the students who select the correct MC answer likely hold incorrect understandings of the other options" (Couch, Hubbard & Brassil, *BioScience* 68(6), 2018, https://doi.org/10.1093/biosci/biy037).
- **Format equivalence:** when MC and constructed-response items share a stem, their disattenuated correlation "approaches unity" (Rodriguez, *JEM* 2003, https://doi.org/10.1111/j.1745-3984.2003.tb01102.x).
- **Lure risk:** MC lures can become false knowledge (Roediger & Marsh 2005, https://doi.org/10.1037/0278-7393.31.5.1155).
- **Grade B** · **confidence high.**

**F12. LLM-written distractors are "mathematically valid" but "less adept at anticipating" real student errors. LLMs do better proposing misconception patterns that an algorithm then validates.**
- **Distractors:** Feng et al., NAACL Findings 2024, arXiv v3 2024-04-18, https://arxiv.org/abs/2404.02124.
- **Mining misconceptions:** the Iltis group (Killich, Schmellenkamp, Vehlken & Zeume) has an LLM propose "bug fixing transformations" that map incorrect student formalizations to correct ones.
  - Each transformation is "validated algorithmically", then clustered and visualized for instructors.
  - It reproduces common mistakes in propositional-logic modelling that earlier work found by hand. The abstract reports no accuracy figures.
  - Source: arXiv v1 2026-09-15, https://arxiv.org/abs/2609.17111.
- **Grade C** · **confidence high** (abstracts read).

**F13. Four-tier diagnostic items can tell misconceptions from knowledge gaps.**
- **Format:** answer, confidence, reason and confidence in the reason.
- **Source:** Caleon & Subramaniam, *RISE* 40(3), 2010, https://doi.org/10.1007/s11165-009-9122-4.
- **Grade C** · **confidence medium** (metadata only).

### 2.3 Calibration, confidence-based marking, hypercorrection

**F14. Certainty-based marking (CBM) is a proper scoring rule that students accept.**
- **Scheme:** +1/0, +2/−2, +3/−6 for certainty levels 1, 2 and 3.
- **Switch points:** a correct-probability of 67% and 80% [checked: E = p, 4p − 2, 9p − 6] (Moodle docs, https://docs.moodle.org/311/en/Using_certainty-based_marking).
- **Reliability:** Gardner-Medwin reports Cronbach's α of 92.4% under CBM against 88.7% for number-correct scoring, across 17 UCL medical exams of 250–300 true/false items each. This comes from a physiology-meeting abstract (reportedly 2006) that I could only see second-hand, through search snippets: https://www.physoc.org/abstracts/analysis-of-exams-using-certainty-based-marking/ (blocked). I found no independent replication.
- **Acceptance:** 89 fifth-year medical students sat a voluntary, ungraded revision exam. Of the 49 who answered the post-exam questionnaire, 78% rated CBM fair and 94% useful. Scores did not shift, and the paper reports no reliability coefficient (Smrkolj et al., *IJERPH* 2022-02-02, https://doi.org/10.3390/ijerph19031706; full text https://pmc.ncbi.nlm.nih.gov/articles/PMC8834968/).
- **Grade C** · **confidence high** for the scheme, **low** for the reliability figure.

**F15. Penalty scoring mixes risk attitude into the score.**
- **Lab:** with a penalty for wrong answers, women answered significantly fewer questions at equal knowledge, and risk preferences explained less than half of the gap (Baldiga, *Management Science* 60(2), 2014, https://doi.org/10.1287/mnsc.2013.1776).
- **Policy change:** removing penalties on Chile's national entry exam narrowed the gender gap in skipped questions and scores (Coffman & Klinowski, *PNAS* 117(16), 2020-04-21, https://doi.org/10.1073/pnas.1920945117).
- **Grade B** · **confidence high.**

**F16. Asking for confidence on reasoning tasks is reactive.**
- **Direction depends on the person:** on Raven's matrices, confidence ratings helped students with high self-confidence and hurt those with low self-confidence (Double & Birney 2017). A second experiment, in older adults, again found reactivity moderated by self-confidence.
- **Wording matters a little:** reactivity was "somewhat negated" when "confident" was replaced with "likely" (the older-adult experiment).
- **Item difficulty:** across two studies of industry managers, the study that elicited ratings showed higher performance on easy items and lower on difficult ones (Birney et al. 2017). That is a cross-study comparison, not an experiment.
- **Sources:** Double & Birney, *Front. Psychol.* 2019-12-06, https://doi.org/10.3389/fpsyg.2019.02755 (review re-read 2026-10-21); *Thinking & Reasoning* 2017, https://doi.org/10.1080/13546783.2017.1289121.
- **Grade B/C** (small experiments, mostly one research group) · **confidence high.**

**F17. Hypercorrection is real, but confident errors return.**
- **Effect:** errors made with high confidence are the most likely to be corrected after feedback (Butterfield & Metcalfe 2001, https://doi.org/10.1037/0278-7393.27.6.1491; Metcalfe, *Annu Rev Psychol* 2017, https://doi.org/10.1146/annurev-psych-010416-044022).
- **Persistence:** the effect lasts a week, "but high-confidence errors return" (Butler, Fazio & Marsh 2011, https://doi.org/10.3758/s13423-011-0173-y).
- **Extensions:** it extends to science misconceptions held with high confidence through refutation texts (van Loon et al. 2015, https://doi.org/10.1016/j.cedpsych.2015.04.003) and to classrooms (Carpenter et al. 2018, https://doi.org/10.1080/09658211.2018.1477164).
- **Grade B** (mostly facts and science concepts) · **confidence high** for the first two, **medium** for the rest (titles).

**F18. Calibration can be trained, and showing calibration feedback reduces overconfidence. It does not improve discrimination or knowledge, and teaching the content can even raise overconfidence.**
- **Training works:** a forecasting module of under an hour improved Brier scores by 6–11% over control across four years (Chang et al., *JDM* 11(5), 2016, https://jbaron.org/journal/16/16511/jdm16511.pdf), and training improved both calibration and resolution (Mellers et al., *Psych Sci* 2014, https://doi.org/10.1177/0956797614524255).
- **Calibration feedback fixes calibration, not discrimination:**
  - Stone & Opel gave undergraduates judging art-history slides *performance feedback* (personalized calibration graphs), *environmental feedback* (teaching about the domain) or no feedback. "performance feedback reduced participants' overconfidence and environmental feedback improved discrimination", but "neither type of feedback led to an improvement on the other component. In fact, environmental feedback led to an increase in overconfidence." (*OBHDP* 83(2), 2000-11, https://doi.org/10.1006/obhd.2000.2910; quote verified in the PubMed abstract, PMID 11056072.)
  - The first pass reported reading the full text: N = 84 (arms of 29, 30 and 25), and a literature review finding the same pattern in Lichtenstein & Fischhoff 1980 and Benson & Önkal 1992, where discrimination feedback alone "did not improve on any measure". An independent re-check found the paper closed access, so treat these details as unverified.
- **What the score measures:** metacognitive *bias*, *sensitivity* and *efficiency* (sensitivity given task performance) are different quantities, and correlation-style measures are contaminated by response bias (Fleming & Lau, *Front. Hum. Neurosci.* 8:443, 2014, https://doi.org/10.3389/fnhum.2014.00443; abstract read). A Brier score falls as knowledge rises even when calibration does not [derived from the Murphy decomposition].
- **Classroom evidence is mixed and mostly not randomized:**
  - Students were still overconfident after thirteen exams (Foster et al. 2017, https://doi.org/10.1007/s11409-016-9158-6), and practice at making judgments alone did not improve calibration or bias (Tomes, *Proc. Atlantic Universities' Teaching Showcase* 21, 2019-06-11, https://ojs.library.dal.ca/auts/article/view/8423; abstract read).
  - Only the semester that got feedback on both performance *and* judgments improved scores and reduced overconfidence on exam 2 (Callender, Franco-Watkins & Roberts, *Metacogn. Learn.* 11(2), 2016, Study 2 N = 90, a comparison of semesters, https://doi.org/10.1007/s11409-015-9142-6; abstract read).
  - Giving *standards* (the correct answers to compare against) improved calibration on current and new tasks, most for low performers (Nederhand, Tabbers & Rikers, *Appl. Cogn. Psychol.* 33(6), 2019, N = 122, https://doi.org/10.1002/acp.3548; abstract read).
  - In a semester course (N = 96), high performers predicted accurately and improved over exams, while the lowest showed "gross overconfidence" (Hacker et al. 2000, https://doi.org/10.1037/0022-0663.92.1.160; ERIC EJ619366). Concrete feedback plus extra-credit incentives improved low performers' predictions but not their scores (Miller & Geraci 2011, Exp. 2, https://doi.org/10.1007/s11409-011-9083-7; ERIC EJ946398).
- **Not found:** a study that isolates *showing* adult self-learners their Brier score and measures delayed learning. A relevant meta-analysis exists (Gutierrez de Blume, *J Educ Psychol* 114(4), 2022, https://doi.org/10.1037/edu0000674), but its abstract was unreachable.
- **Grade B** for "calibration can be trained" (Chang, Mellers) · **B/C** for "calibration feedback reduces overconfidence but not discrimination" (one verified lab experiment; the earlier studies are known only through its review) · **C** for the classroom studies · **confidence high**, except **medium** for second-hand items and Stone & Opel's sample sizes.

**F19. AI use flattens the Dunning-Kruger pattern and inflates self-assessment.**
- **Study:** LSAT logical reasoning with AI, N = 246 plus a replication with N = 452.
- **Result:** performance rose about 3 points over norms, but participants overestimated by about 4. The Dunning-Kruger pattern disappeared, and higher AI literacy went with *less* accurate self-assessment.
- **Source:** Fernandes et al., *Computers in Human Behavior* 175, 2026-02, https://doi.org/10.1016/j.chb.2025.108779 (arXiv v2 2025-01-05, https://arxiv.org/abs/2409.16708).
- **Corroboration:** Bastani's students were "overly optimistic about their abilities" (Wharton 2024-08-27, https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/).
- **Grade B** · **confidence high.**

### 2.4 Self-assessment and rubric self-grading

**F20. Self-assessment is least accurate where it matters most.**
- **Meta-analysis:** students in advanced courses and in science self-assess more accurately, and better-designed studies show closer agreement (Falchikov & Boud, *RER* 1989, https://doi.org/10.3102/00346543059004395).
- **The Dunning-Kruger effect is contested:**
  - It is "(mostly) a statistical artefact" (Gignac & Zajenkowski 2020, https://doi.org/10.1016/j.intell.2020.101449).
  - A rational model "supports insensitivity to evidence in low performers" (Jansen et al. 2021, https://doi.org/10.1038/s41562-021-01057-0).
  - The original study: Kruger & Dunning 1999, https://doi.org/10.1037/0022-3514.77.6.1121.
- **Measurement cautions:** Brown, Andrade & Chen 2015, https://doi.org/10.1080/0969594X.2014.996523.
- **Grade B** · **confidence medium** (two of the sources from titles only).

**F21. Rubric self-grading can correlate highly with a teacher and still be biased.**
- **Middle school:** with rubric training, student grades matched the teacher's at r = 0.91–0.94, yet "lower performing students tended to inflate their own low scores" (Sadler & Good 2006, https://doi.org/10.1207/s15326977ea1101_1).
- **MOOC:**
  - Students rated their own work 7% higher than staff did.
  - Feedback about grading bias improved accuracy.
  - Clearer rubric wording cut the median error from 12.4% to 9.9% (Kulkarni et al., *TOCHI* 2013, https://doi.org/10.1145/2505057).
- **Self-assessment as an intervention:** it helps learning, g = 0.585, with larger effects in repeated-measures designs (Yan et al. 2022, https://doi.org/10.1016/j.edurev.2022.100484).
- **Grade B** · **confidence high.**
- **Implication [derived]:** a self-grader shares the author's misconception, the same way tests and implementation share a misunderstanding in Examplar's argument (F4). That is fine for learning and invalid as credit.

### 2.5 Oral exams, explaining, teaching

**F22. Content specificity makes orals reliable only with many cases.**
- **Study:** 896 candidates in structured oral exams.
- **Variance:** 41% candidates, 32% oral content, 27% examiners and error.
- **Reliability:** intercase reliability was 0.65 with two 20-minute orals, against a preset benchmark of 0.8. Four 20-minute orals with two examiners each, or five with one examiner each, would reach only 0.78, with pass/fail reliability rising from 0.85 to 0.94. The authors conclude orals can reach high-stakes reliability "if sufficient resources are available".
- **Source:** Wass et al., *Med Educ* 2003, https://doi.org/10.1046/j.1365-2923.2003.01417.x (full abstract read).
- **Other studies:** a randomized comparison (n = 99) found higher marks orally, more nervousness and more perceived authenticity (Huxham et al. 2012, https://doi.org/10.1080/02602938.2010.515012). Oral exams in an introductory CS course were feasible and well received (Ohmann, SIGCSE 2019, https://doi.org/10.1145/3287324.3287489).
- **Grade B** · **confidence high.**

**F23. AI oral exams are feasible, stressful, and models agreeing is not the same as validity.**
- **Study:** N = 73 (36 + 37) at NYU Stern. A three-model council's Krippendorff's α rose from 0.52–0.65 to 0.86–0.90 after a deliberation round. In Spring 2026, 1 of 37 exams (about 3%) was flagged for human review. The grading models cost under $1 per exam; the planning figure including voice is about $3.40 per 30-minute exam.
- **Students:** 83% then 63% found it more stressful, and 33% then 56% saw the examiner as fair.
- **Lessons:** enforce constraints in code, not prompts (stacked questions fell from 31% to 11%), and never let the LLM do the randomizing (one case was picked in 6 of 7 exams).
- **Source:** Ipeirotis & Rizakos, *Communications of the ACM* 2026 (author's version: arXiv v3 2026-07-26), https://arxiv.org/abs/2603.18221.
- **Grade C** · **confidence high.**

**F24. Explaining surfaces the limits of understanding; self-explanation training improves proof comprehension.**
- **Illusion of explanatory depth:** people overrate their mechanistic understanding until they try to explain it (Rozenblit & Keil 2002, https://doi.org/10.1207/s15516709cog2605_1).
- **Proof comprehension:** a self-explanation booklet improved proof comprehension, d = 0.95, and a 15-minute in-lecture version also worked, with a lasting effect (Hodds, Alcock & Inglis, *JRME* 45(1), 2014, https://doi.org/10.5951/jresematheduc.45.1.0062; abstract via https://figshare.com/articles/Self-explanation_training_improves_proof_comprehension/9367232).
- **Proof validation:** undergraduates attend to surface features, and mathematicians sometimes disagree (Inglis & Alcock 2012, https://doi.org/10.5951/jresematheduc.43.4.0358); undergraduates are weak proof validators (Selden & Selden 2003, https://doi.org/10.2307/30034698). An assessment model for proof comprehension: Mejía-Ramos et al. 2012, https://doi.org/10.1007/s10649-011-9349-7.
- **Grade B** · **confidence high** for Hodds and Inglis, **medium** for the others.

**F25. Learning by teaching works, but writing to a fictitious student adds little.**
- Preparing to teach gives g = 0.35 and teaching after preparing g = 0.56, with interactive teaching better (Kobayashi 2019 meta-analysis, https://doi.org/10.1111/jpr.12221).
- Writing to a fictitious student did no better than self-explaining, which won for transfer; a cumulative meta-analysis found small effects (g = 0.29 concepts, 0.22 transfer), oral above written (Lachner, Jacob & Hoogerheide 2021, https://doi.org/10.1016/j.learninstruc.2020.101438).
- Several recent studies did not replicate non-interactive teaching effects (Lachner et al., *EPR* 2022, https://doi.org/10.1007/s10648-021-09643-4), and tutors show a "knowledge-telling bias" (Roscoe & Chi 2007, https://doi.org/10.3102/0034654307309920). Explaining on video beats writing (Hoogerheide et al. 2016, title, https://doi.org/10.1016/j.cedpsych.2016.02.005).
- **Fiorella & Mayer** (2013, https://doi.org/10.1016/j.cedpsych.2013.06.001; 2014, https://doi.org/10.1016/j.cedpsych.2014.01.001; journal abstracts unreachable). A same-titled 2013 UCSB thesis abstract, seen only through a search summary, reports four experiments on a Doppler-effect lesson. Preparing to teach beat preparing for a test on an immediate test. After a week, only *actually teaching* helped (d = .79 and .90), and the expectancy effect disappeared.
- **The protégé effect (origin of the term):** in Betty's Brain, 8th-graders who believed they were teaching their own Teachable Agent "spent more time on learning activities" and learned more than peers using the same software for themselves, most of all lower achievers. In a 5th-grade verbal-protocol study, students teaching an agent were "more likely to acknowledge errors". The effect was measured on effort, in schoolchildren (Chase, Chin, Oppezzo & Schwartz, *J Sci Educ Technol* 18(4):334–352, 2009, https://doi.org/10.1007/s10956-009-9180-4; abstract read at https://purl.stanford.edu/zm369yx3532).
- **Grade B** · **confidence high**, except **medium** for Fiorella & Mayer.

**F26. An LLM as protégé (the learner diagnoses a seeded misconception) looks promising.**
- **Result:** +0.72 on a 1–6 scale. The work is "preliminary", and the drop in midterm failures is a projection.
- **Source:** Kucharavy et al., BEA 2025, https://aclanthology.org/2025.bea-1.19/.
- **Grade C** · **confidence high.**

### 2.6 AI help: RCTs, harms and guardrails

**F27. Unguarded AI substitutes for the work and harms unassisted performance.**
- **Bastani et al. (PNAS 2025):**
  - About 1,000 high-school students.
  - GPT Base: +48% in practice, then −17% on the unassisted exam.
  - The hint-only "GPT Tutor" with teacher input: +127% in practice and about level with control on the exam.
  - Source: *PNAS* 122(26), 2025-07, https://doi.org/10.1073/pnas.2422633122.
- **Shen & Tamkin (2026):**
  - 52 crowd developers (26 per arm) learning Python's Trio library, paid a flat $150 and told to finish "as fast as they could".
  - The control group scored 4.15 points higher on a 14-question, 27-point quiz (the authors' "17%" difference), d = 0.738, p = 0.010. Debugging showed the largest gap and code reading the smallest. The quiz was immediate, and AI brought no "significant efficiency gains on average".
  - Three of six interaction patterns kept quiz scores at 65% or above: conceptual inquiry (n = 7), hybrid code-explanation (n = 3) and generation-then-comprehension (n = 2). Delegation-style patterns scored below 40%.
  - Source: arXiv v2 2026-02-01, https://arxiv.org/abs/2601.20245 (abstract and HTML read).
- **Darvishi et al. (2024):** an RCT with 1,625 students found they "rel[ied] on rather than learn[ed] from AI assistance" (*C&E* 210, https://doi.org/10.1016/j.compedu.2023.104967).
- **Lehmann et al. (preprint):** using an LLM as a substitute broadens coverage but lowers understanding; using it as a complement deepens understanding. It widens prior-knowledge gaps (arXiv v2 2025-03-08, https://arxiv.org/abs/2409.09047).
- **In this course's own domain:** master's students in a formal-methods course solved one Dafny verification problem with ChatGPT and one without. They did "significantly better" with it, with gains "tied to prompt quality", and the authors recommend "LLM-aware challenges that promote learning rather than substitution". Only assisted performance was measured, as in Bastani's practice phase (Carreira et al., arXiv v4 2025-09-07, https://arxiv.org/abs/2506.22370).
- **Grade A−/B** for "substitution harms" · **confidence high.**

**F28. Structured, grounded tutoring can help, and engagement binds.**
- **Kestin et al.:** a randomized crossover with 194 eligible students showed 0.73–1.3 SD by quantile regression on a post-lesson quiz, with no delayed test. Linear regression gave 0.63 SD, which the authors call an underestimate because of a ceiling. The AI group's median time was 49 minutes, against an *assumed* 60 minutes of learning in class. Prompts were "enriched … with comprehensive, step-by-step answers", and the platform, not the prompt, sequenced problems. *Sci Rep* 15:17458, 2025-06-03, https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/. A blog re-analysis put the gain at about 16–30% (second-hand via kernelspace).
- **De Simone et al.:** a six-week after-school program (June–July 2024, Benin City, Nigeria) using Microsoft Copilot (GPT-4) gave +0.31 SD on a composite of English, AI knowledge and digital skills, and +0.23 SD on English (working paper 2025-05 via Stanford SCALE, https://scale.stanford.edu/ai/repository/chalkboards-chatbots-evaluating-impact-generative-ai-learning-outcomes-nigeria). The World Bank blog (2025-01-09) reports "about 0.3 standard deviations" and "The more sessions students attended, the greater their gains" (https://blogs.worldbank.org/en/education/From-chalkboards-to-chatbots-Transforming-learning-in-Nigeria; re-read 2026-10-21).
- **Oreopoulos & Low:**
  - A two-year cluster-randomized trial in 18 Tennessee middle schools, inside daily remedial math sessions, with Khanmigo set to coach rather than give answers.
  - Assignment raised achievement by about 0.06–0.08 SD a year (implied 0.14 SD for a full year of active use), similar to Khan Academy practice without AI.
  - 96% tried it, but students messaged it in only 17% of exercise sessions with a mistake, mostly with bare answers. "The binding constraint appears to be engagement."
  - NBER w35620, 2026-08, https://www.nber.org/papers/w35620 (abstract read).
- **Grade B** · **confidence high.**

**F29. Guardrails that gate on articulation preserve unassisted skill (preprints).**
- **Explanation Gate:** with an LLM judge enforcing a teach-back before generated code is accepted, an AI-blackout maintenance task failed for 39% of users, against 77% with unrestricted AI (N = 78). Source: Sankaranarayanan, arXiv v2 2026-03-31, https://arxiv.org/abs/2602.20206.
- **Augmentation vs automation:** in a proctored randomized experiment, AI access raised immediate unaided test scores by 0.27 SD (IZA DP 18792, 2026-07, https://www.iza.org/publications/dp/18792), and "a smaller gain persists a week later". Gains survive when AI acts as a tutor and fade when it writes for the student. Source: Contractor & Reyes, arXiv v2 2026-10-04, https://arxiv.org/abs/2607.08849.
- **Supervised tutoring:** LearnLM supervised by tutors matched or beat human tutors on novel problems, 66.2% against 60.7% (N = 165, exploratory). Source: arXiv v1 2025-12-29, https://arxiv.org/abs/2512.23633.
- **Instruction alone is not a guardrail:** in a semester-long CS1 RCT (N = 979), teaching students to prompt AI as a tutor improved prompting skill in all four conditions, but "no direct between-group differences emerged" in learning (Xiao et al., arXiv v1 2026-02-17, https://arxiv.org/abs/2602.16033).
- **Grade C** · **confidence high.**

### 2.7 LLMs as graders

**F30. LLM graders are moderately reliable on narrow tasks and manipulable everywhere.**
- GPT-4 reached κ = 0.70 against a human level of 0.75 on K-12 short answers (Henkel et al. 2024, https://arxiv.org/abs/2405.02985).
- On over 5,000 human-judged LLM proofs, the best judge (GPT-5) scored 89.3% (90.8% majority-of-5) against 90.4% human inter-judge agreement, measured on the roughly 10% of proofs graded twice (Open Proof Corpus, v2 2026-01-14, https://arxiv.org/abs/2506.21621). Yet LLMs "frequently fail to distinguish correct mathematical reasoning from clearly flawed solutions" (Mahdavi et al., v2 2025-04-10, https://arxiv.org/abs/2504.01995).
- On USAMO 2025, two LLM judges were "consistently overestimating" proof quality, "inflating the scores by a factor of up to 20". One model's proofs averaged 1.2/42 from human graders and 23.8/42 from a judge. Source: Petrov et al., "Proof or Bluff?", §3.3 and Table 2, v5 2025-09-04, https://arxiv.org/abs/2503.21934. The table caption and the text name different judge models.
- **In a proof course:** a case study in an undergraduate proof-based course found "substantial disagreement between LLMs and TAs on grading decisions", though LLM feedback helped TAs on submissions with major errors (Mahinpei, Druchyna & Horta Ribeiro, arXiv v1 2026-02-27, https://arxiv.org/abs/2602.23635).
- Agreement with human preferences is above 80%, with position, verbosity and self-enhancement biases (Zheng et al., NeurIPS 2023, https://arxiv.org/abs/2306.05685). Short universal phrases inflate *absolute* scores; comparative judging is more robust (Raina et al., v2 2024-07-04, https://arxiv.org/abs/2402.14016). Assistants are generally sycophantic (Sharma et al., v4 2025-05-10, https://arxiv.org/abs/2310.13548).
- **Formalize-then-check (code-generation-based grading, CGBG):** for "explain in plain English" questions, an LLM turns the student's explanation into code, which is run against tests. It reached "moderate agreement with human graders"; the main disagreement was "its leniency with respect to low-level and line-by-line descriptions of code" (Smith & Zilles, arXiv v1 2023-11-25, https://arxiv.org/abs/2311.14903; venue unverified). By analogy [derived], an LLM formalizing a learner's English property may quietly resolve ambiguity in favour of the key, the risk the LTL Tutor authors give for not LLM-grading LTL-to-English answers (F3).
- **Autoformalizing proofs is not yet a grader.** LeanTutor translates a learner's English proof into Lean and checks it. On PeanoBench (371 proofs from the Natural Number Game), it correctly formalized 57% of tactics in correct proofs and identified the incorrect step in 30% of incorrect proofs (Patel et al., figures from the v1 abstract of 2025-06-10; v2 2026-03-03, https://arxiv.org/abs/2506.08321).
- **Grade B** (C for CGBG, the proof-course case study and LeanTutor) · **confidence high.**

### 2.8 LLMs as adversaries, and erroneous examples

**F31. LLM-generated flaws can be certified by an oracle and match instructor-made ones.**
- **BugSpotter:** an LLM writes buggy code from a spec, a test suite verifies the bug, and the student designs a *failing test*. Student performance matched that on instructor-made exercises (SIGCSE 2025, https://arxiv.org/abs/2411.14303).
- **nl2postcond:** LLM "natural" mutants are harder to kill (F4).
- **The audit skill is weak, and AI use may erode it.** Engineering students accepted or rejected GPT-5.1 solutions to mechanics and E&M problems, some of them hallucinated, with confidence ratings. "Higher AI usage frequency is significantly correlated with lower hallucination detection accuracy", and higher confidence was "marginally correlated with lower" accuracy (Deutsch & Oca, ASEE 2026, https://nemo.asee.org/public/conferences/374/papers/53628/view; correlational, N not given on the abstract page).
- **Grade C** · **confidence high.**

**F32. Erroneous examples help learners with prior knowledge, often only on delayed tests, and learners like them less.**
- **Prior knowledge decides:** mixing correct and incorrect worked solutions fostered far transfer for learners with favourable prior knowledge; with poor prior knowledge, correct solutions alone were better. Incorrect solutions also "substantially reduced" principle-based self-explanations (Große & Renkl 2007, two experiments, https://doi.org/10.1016/j.learninstruc.2007.09.008; ERIC abstract EJ780439).
- **Delayed, not immediate:** middle-school students (N = 390) who found, explained and fixed errors in decimal problems did no better on the immediate post-test but better a week later (d = .33 on gains). This replicated Adams et al. 2014 (N = 208, https://doi.org/10.1016/j.chb.2014.03.053). They also *liked* the intervention less (d = .21): "what students like does not always lead to the best learning outcomes" (McLaren, Adams & Mayer, *IJAIED* 2015, https://doi.org/10.1007/s40593-015-0064-x; abstract read).
- **Conceptual understanding:** in two in-vivo Algebra Cognitive Tutor experiments, incorrect examples, alone or with correct ones, were "especially beneficial for fostering conceptual understanding" (Booth et al. 2013, https://doi.org/10.1016/j.learninstruc.2012.11.002; ERIC abstract EJ1003563).
- **Efficiency (title and recall only):** McLaren et al. 2016 found worked examples the most time-efficient (https://doi.org/10.1016/j.chb.2015.08.038). Metcalfe 2017 adds that corrective feedback, "including analysis of the reasoning", is crucial (F17).
- **Grade B** · **confidence high**, except **medium** for McLaren et al. 2016.

---

## 3. What this means for the course

### 3.1 The principle: agents propose, checkers decide (assessment included)

The course should hold its assessments to one rule: a model may propose, only a checker settles correctness, and a failed attempt gets a counterexample back:
- **Who decides:** keys, grades and stamps come from solvers, model checkers, the Mini-Plinth interpreter, Lean (via comparator) or authored keys verified at build time.
- **What LLMs do:** they *propose* items, flaws, hints and follow-up questions.
- **Applying the course's own vocabulary to itself:**
  - a passed Defence is **TESTED (n items, unseen seeds)**, not PROVED competence;
  - a self-grade is **ASSUMED**;
  - an LLM examiner's score is **UNKNOWN reliability**.

  Print this on the course's "About this course's assurance" page.

**Two ledgers.** v1 makes "progress the Claims Ledger". Claims describe *artifacts*, and an agent can produce PROVED claims (F27). Keep the Claims Ledger as the artifact record. Add kernelspace's Evidence Ledger (V3), with provenance weights (V6), as the learner record:
- **Full credit (1.0):** unassisted work on unseen seeds, and Bench predictions graded by tools.
- **At most 0.3:** assisted or practice work.
- **Practice weight:** self-grades.
- **Zero:** LLM grades.

A course is *set* on Evidence, never on the number of Claims.

### 3.2 The assessment stack

| Layer | What it is | Who grades | kernelspace analogue | Grade |
|---|---|---|---|---|
| L0 Items as code (build time) | Generators with seeds, KC tags and difficulty features. Distractors by conceptual mutation from per-course misconception catalogs (start from the 12 gap classes and the LTL catalog). Solver-checked keys and distinctness. Lints for length, absolute words and convergence. Cue-ablation QA | CI (`verify:items` extends `verify:calls`) | V1, K1, cue-ablation QA | B |
| L1 Checker-graded responses (browser) | Formula and query construction (equivalence). Specs, policies and postconditions (wheat validity plus chaff strength). Invariants (Init, inductive step, implies safety; counterexample-to-induction feedback). Witness construction (evaluation). Verdict prediction. MTF over scenarios | Z3 (wasm), interpreter, explorer, Datalog, PGlite | K1, P2 | B−/C |
| L2 Bench Defence (local) | `plinth defend sN`: seeded mutations of the learner's *own* artifacts. Predict first; the tools grade. Receipts carry comparator, axioms and `leanchecker` results | Lean, TLC, Z3, cargo; receipt imported | H4 v2 "probe" | C/D |
| L3 Audit Desk | Balanced, checker-certified cases. Findings must carry a witness or an MTF gap-class judgment | Evaluator plus authored keys | P4, receipts | B/C |
| L4 Metacognition | Call It with a proper scoring rule. Hypercorrection queue. Calibration split by assisted and unassisted work. Self-grade calibration | Code | V2, K5 | B/C |
| L5 Explain and teach (no credit) | Self-explanation training before Course 02. Oral explain-back. Protégé blocks. Optional agent examiner | Learner; formative LLM | H3 R0, Interview mode | B (learning) |
| L6 Retention | Re-find; Today; one probe per KC at 30 days on fresh seeds | Code | K2, VRK₃₀ | A |

### 3.3 Replacing the self-graded viva: the Defence

Each course ends with a Defence of about 60–90 minutes, split over two or more days. Nothing locks. v1 already calls Course 10's final viva "the Defence" (PLAN.md 10.7); this extends the name, and the evidence standard, to every course.

**A. Probes (browser, about 35 minutes)**
- Twelve items on unseen seeds, drawn from at least 3 families, with at least one checker-graded constructed-response family.
- Every item gets a Call It, and the agent is closed (framed as calibration, as in kernelspace H4).
- The roadmap's completion tests become items. For example:
  - Stage 1, "why a violation search asserts the negation": the learner *writes* the query. Z3 checks it against Pre ∧ Guard ∧ ¬P, and MTF items ask which of 5 queries find violations.
  - Stage 4, "derive obligations manually": the learner writes the WP. It is unique up to equivalence, so a Z3 equivalence check is a clean grader.
  - Stage 5, "safety vs liveness and fairness": classify generated properties, then construct the lasso the explorer accepts.

**B. Artifact defence (Bench, about 20 minutes)**
- `plinth defend sN` applies 4–6 seeded mutations to the learner's own work: drop hypothesis `h₂`, weaken a guard, switch ℤ to ℕ or `BitVec 64`, split an atomic action, remove a weak-fairness (WF) condition, or widen the observer.
- The learner first predicts in the browser: does it still check, which goal or state breaks, and how likely each call is.
- The CLI then runs the tools and writes a receipt, and the browser grades the predictions.
- This puts the roadmap's "explain without reciting tactics" into practice without anyone grading prose.

**C. Audit (about 15 minutes)**
- Two to four cases, at least one of them sound.
- A finding needs a **witness** that the evaluator validates, for example `merchant = 0, amt = 50 → −50` for A2.1. For gap classes with no machine witness (requirement mismatch, environment assumption), the learner answers MTF items over concrete scenarios.

**D. Explain-back (formative, about 10 minutes)**
- A recorded oral answer, about 2 minutes, to one completion-test prompt. Oral beats written (F25), and L4 also recommends oral-first.
- The learner then self-checks against a 3-idea rubric.
- An optional agent examiner packet adds follow-up questions chosen by seeded code, decomposed yes/no checks that quote the learner, and comparative rather than absolute judgments.
- **Formalize-then-check, for prompts whose answer is a property:**
  - The packet formalizes the spoken answer into the item language (Z3, LTL or a Lean statement), sampling several literal readings.
  - Z3 or the explorer checks each reading against the key. All readings must match for a "matches" result, and any disagreement is shown as a counterexample to discuss.
  - This is the CGBG pattern (F30). It stays formative, because the formalizer can repair vague English, and autoformalizing English proofs is still unreliable (LeanTutor found 30% of wrong steps, F30).
- The self-grade is compared with Part A results on the same KCs to give a *self-grade calibration* signal (Kulkarni's bias feedback, F21).

**Rule for "set".**
- Parts A–C together score at least 75%, each part at least 60%, across two or more sessions.
- Show the Wilson interval: 10 of 12 gives a 95% CI of 0.55–0.95 [derived], so a single session is a screen, not a measurement.
- One probe per KC returns at 30 days. Passing it marks the course "settled", which feeds VRK₃₀.

**Why this beats a self-graded viva.**
- It replaces a judgment shared with the author's own misconception (F21) with evidence from the checker.
- It samples more cases, which is what content specificity calls for (F22).
- It keeps the learning benefits of explaining (F24, F25).
- The overall grade is B−. The components range from A (retrieval) to C (Bench probes), and Part B has no outcome evidence yet.

### 3.4 Per course

| Course | Checker-graded families (L1) | `defend` mutations (L2) | Audit focus |
|---|---|---|---|
| 00 Ground | Construct negations and quantified statements (truth-table or Z3 equivalence); MTF on vacuity | — | — |
| 01 Counterexample | Write the violation query (equivalence); build a witness model (evaluate); Call It sat/unsat/unknown; Int vs BitVec | add or drop the guard; `Int` to `BitVec 64`; `amount ≥ 0` | vacuity; timeout reported as safe; encoding |
| 02 Proof | Self-explanation training first (F24). Goal Replay next-goal prediction. "Which hypothesis is needed?" (checked by deleting it in CI). Statement-reading MTF, with the theorem evaluated on states | drop a hypothesis; weaken the statement; ℤ to ℕ; IH generalized or not | too weak; vacuous; hidden trust (axioms); drift (comparator) |
| 03 Semantics | Evaluate programs (TS interpreter); construct a stuck program; edge-case scenarios | add `force move`; change error semantics | big- vs small-step disagreement |
| 04 Obligations | Write the WP (equivalence); find the input that exposes a miscompiled verification condition (VC) (witness) | remove the frame condition; substitution capture | guard missing from the query |
| 05 Time | Write an inductive invariant (counterexample to induction (CTI) on tiny bounds; TLC/Apalache on the Bench); safety/liveness with LTL-misconception distractors (F3); construct a violating lasso. Link the free LTL Tutor for practice | split an atomic action; drop WF; change constants | bounded presented as unbounded; fairness on environment actions |
| 06 Correspondence | Classify anomalies in generated histories; evaluate R(S,D) on pairs; NULL/3VL predictions (PGlite) | isolation level; `bigint` overflow | test presented as proof; observer too weak (reuse tablespace/byzantine history checkers; do not rebuild) |
| 07 Secrecy | Policy-writing (Datalog access-matrix equivalence over a finite domain); construct a state pair the observer distinguishes | widen the observer; declassify | enforcement mistaken for noninterference |
| 08 Effects | Enumerate crash windows (scored as recall against the explorer's complete set); construct a duplicate-effect trace | crash point; a fresh idempotency key per retry | "exactly-once" claims |
| 09 Preservation | Find a distinguishing observation (witness); check the simulation relation on pairs | bad optimisation; observer ignores aborts | shape-only validation |
| 10 Assembly | A stamp-consistency checker over the report; audit of the learner's *own* agent PRs | full `defend` over the report | bring your own (BYO) agent PRs |

### 3.5 AI policy for this course

- **Labs (inherit kernelspace H1):**
  - Hooks guard the `TODO(you)` proof and spec files.
  - A **statement lock** means the receipt's comparator must match the course's challenge statement. This blocks the "agent proved a weaker theorem" failure, which is gap class 1 turned on the learner. Lean's own manual treats un-reviewed AI-generated proofs as possibly malicious and prescribes exactly this check (F7).
  - Before any hint, an explanation gate asks for the failing goal or counterexample and a hypothesis (F29). A short primer on prompting AI as a tutor is cheap, but it is not a guardrail on its own (Xiao et al., F29).
- **Help packets (H2):** they carry authored solution paths, checker outputs and misconception tags (F28). They never carry Defence keys.
- **Calibration under AI:** measure it separately. Before blackout probes, the learner predicts their unassisted score (F19).
- **Adversary mode, Courses 02–10:**
  - At build time, an LLM drafts cases for gap classes that *code* chooses.
  - CI certifies each flawed case with a witness and each sound case with a proof (Lean comparator, Z3 unsat, or TLC within stated bounds), then cue-ablation and a human review follow.
  - An optional live mode does the same through the learner's own agent, with Bench certification before the case is shown.
  - In "flip" mode, the learner plants a flaw and the agent hunts it (protégé-style practice, F26). It carries no credit.
- **Late courses (09–10):** assess *AI-assisted verification* as a competency in its own right. The learner audits their own agent's "verified" output. This is the learner's real working condition.

### 3.6 Concrete fixes to v1

1. **Audit Desk base rate.** Only 4 of 32 cases are sound: A2.5, A4.3, A6.4 and A9.3.
   - Rejecting everything scores 87.5% precision and 100% recall [derived], which contradicts the plan's own claim that "rejecting everything is as useless as accepting everything".
   - Make at least a third of cases sound, and report sensitivity, specificity, witness validity and gap-class accuracy.
   - With 3–5 cases per course the numbers are noise, so aggregate across courses and generate parametric variants.
2. **Home-screen calibration copy.** "At 80% … right only 58%" from 40 calls means roughly 12 per bucket, a 95% CI of about 0.32–0.81 [derived].
   - Show the copy only once a bucket has n ≥ 30, about ±15 points at p = 0.75 [derived], and always show the interval.
   - "80%" is not one of the offered levels (55/75/95).
   - **The headline "0.14 Brier score (lower is better; 0.25 is a coin flip)" misleads.** A Brier score falls as content knowledge grows, even with no gain in calibration (F18). And "0.25 is a coin flip" holds only for two-way verdicts: a three-way sat/unsat/unknown call at 55% with chance accuracy (⅓) scores about 0.27 [derived].
   - **Lead instead with bias** (mean confidence minus accuracy, with an interval) and the reliability diagram. Show resolution separately (accuracy on 95% calls against 55% calls), and show the view after each finished lesson, because teaching content can raise overconfidence (F18).
3. **Call It levels.** For a three-way verdict (sat/unsat/unknown), the lowest option, 55%, is above chance (33%). An honest guess is therefore forced into overconfidence, which biases the reliability plot [derived].
   - Set the levels per item's number of options.
   - Word the prompt as "how likely". This is a cheap default, not a strong fix: the switch only "somewhat negated" reactivity (F16).
   - Under Brier scoring, the levels 55/75/95 switch at 65% and 85% [derived]. Explain this once.
4. **The viva's self-grade.** Self-grades carry practice weight only, and "set" moves to the Defence.
5. **The Claims Ledger.** It is the progress view of artifacts. Learner progress comes from the Evidence Ledger.

---

## 4. Recommendations (ranked by expected validity gain per unit of effort)

1. **Split Claims (artifacts) from Evidence (learner) and weight evidence by provenance.**
   - Evidence: substitution harms are A−/B (F27); the design itself is D.
   - Effort: S/M. Inherits kernelspace V3 and V6.
2. **Replace the self-graded viva with the Defence (§3.3)**, and make the 30-day "settled" re-check part of VRK₃₀.
   - Evidence: B− (F21, F22, F24, F25).
   - Effort: M per course, much of it reusing L1 items.
3. **Build the four checker-graded families in the browser:** equivalence, wheat/chaff, inductiveness and witness.
   - Restrict items to decidable fragments (quantifier-free linear integer arithmetic (QF_LIA), bit-vectors, finite domains), with bounded checking as a fallback.
   - Offer "practice" (counterexamples shown) and "probe" (one shot, feedback after submission) modes, since counterexample feedback invites special-case patching (F1).
   - Show hints that describe the *class* of misclassified inputs, not just one point.
   - Settle hosting for COOP/COEP before committing to `z3-solver` (F8).
   - Evidence: B− for the precedent, C for learning outcomes.
4. **Treat items as code.**
   - Generate distractors by conceptual mutation from misconception catalogs, with solver-checked distinctness (F3).
   - Grow the catalogs from donated learner submissions. An LLM proposes bug-fixing transformations, an algorithm validates each one, and a human names each cluster (F12).
   - Vary item templates as well as numbers (F9). Band difficulty by structural features: operator count, quantifier alternation, trace length, number of processes.
   - Add lints for length, absolute words and *convergence* (F10). Prefer MTF for multi-claim judgments (F11).
   - Evidence: B. Effort: M.
5. **Repair Audit Desk scoring (§3.6.1).** Require witness-backed findings. Use MTF over concrete scenarios for the requirement-mismatch and environment-assumption classes: the formal statement is evaluated on each scenario and the requirement's verdict is authored, which makes "requirement fidelity", the hardest gap, machine-gradable. Evidence: B/D. Effort: S/M.
6. **Fix how Call It scores and displays (§3.6.2–3).** Use a proper rule; show bias and the reliability diagram first, with intervals and a minimum n, after lessons, and with assisted and unassisted calls apart (F18). Add a hypercorrection queue that re-tests sure-and-wrong calls at about 1 and 7 days (F17). Keep the predict-before-Run step, but never let calibration gate progress. Evidence: B/C for calibration feedback (F18), C for the rest. Effort: S.
7. **Add `plinth defend` and comparator-grade receipts.**
   - Challenge files and `lake comparator`; record axioms; replay with `leanchecker`; a statement lock in the lab hooks (F7).
   - Evidence: C/D (integrity). Effort: M. Agrees with R6 and with Lean's own guidance for AI-generated proofs (F7).
8. **Run an LLM-as-adversary pipeline at build time, with certification in CI.**
   - Optional live and flip modes through the learner's own agent.
   - Unlock cases after the matching lab, because erroneous examples help with prior knowledge (F32).
   - Always show the witness immediately (F11 lure risk).
   - Evidence: C. Effort: M.
9. **Treat explanation as learning.**
   - Run a self-explanation training session of about 15 minutes before Course 02 (F24).
   - Make explain-backs oral, and keep protégé blocks.
   - Any LLM examiner is formative only, with code-seeded questions, quoted evidence and comparative checks (F23, F30).
   - Where the answer is a property, formalize it and let the solver check it (the CGBG pattern, F30). Never accept an LLM's verdict. Keep formalization formative until it has been measured on donated learner explanations (LeanTutor: 57% and 30%, F30).
   - Evidence: B for learning, C for the examiner.
10. **Pre-register within-learner experiments (kernelspace §9).** Candidates:
    - counterexample versus class-hint feedback;
    - confidence prompt on versus off;
    - adversary cases versus plain cases.

    The outcome measure is 30-day accuracy on fresh seeds. Evidence: D (method).
11. **Borrow external practice:** the LTL Tutor for Course 05, and Alloy4Fun-style hidden-oracle challenges for Course 07. Evidence: C.

**Do not build:**
- runtime LLM-generated graded items;
- LLM-graded stamps or "set" status;
- penalty-scored gates;
- timed Defences. Nothing here shows that timing adds validity, and speed pressure was part of the setting in which delegation flourished (F27).

---

## 5. Open questions

1. Does *showing* Brier scores help or hurt adult self-learners on 30-day outcomes? No study isolates this (F18). The nearest evidence says calibration feedback reduces overconfidence without improving discrimination, and teaching the content can raise overconfidence (Stone & Opel 2000). The open part is whether calibration feedback changes *study behaviour*, such as re-testing sure-and-wrong items, enough to improve 30-day accuracy. Test it within each learner.
2. Does checker feedback produce durable learning, or only faster completion (F1)? No formal-methods RCT reports delayed outcomes.
3. How valid is Part B, predicting the effects of mutations on one's own artifacts? It has face validity and no data yet.
4. Generator difficulty calibration without telemetry. Partners' donated logs are the only source (kernelspace §9).
5. Do LLM-drafted flaws match real agent failure modes in Lean, TLA+ and SQL? Natural mutants differ from artificial ones (F4). Mining the learner's own agent sessions may be the most valid source.
6. Lure risk in a domain where misconceptions are held with high confidence. Do refutation texts suffice (F17), or do flawed proofs leave traces?
7. Workload. Will Defences of 60–90 minutes per course fit a 6–10-hour week? This needs measuring with partners.
8. Does the LTL misconception catalog transfer to TLA+, whose temporal operators work over stuttering-invariant behaviours?
9. Bench receipts remain self-reported. Does tamper-resistance matter for a solo learner? It probably matters only for shared Evidence Packs.
10. Does Pyodide Z3 avoid the COOP/COEP requirement (R6 versus F8)?
11. How accurately can an LLM formalize this course's learner explanations (properties, invariants, proof sketches) into the item languages? LeanTutor's figures suggest poorly for proofs (F30). Properties in decidable fragments may fare better. Measure it on donated explanations before relying on it, even formatively.

---

## 6. Verification log

| Status | Items |
|---|---|
| **Full text or primary page read** | Automata Tutor PDF (N, arms, times, give-ups, special-case warning); LTL Tutor PDF; Examplar PDF; Chen et al. 2018 PDF; Lamport 2018 PDF; Barros 2023 thesis (Alloy4Fun mechanism and counts); Chang et al. 2016 PDF; Smrkolj 2022 PDF; Kestin (PMC); Lean *Validating Proofs* 4.29.0 and 4.35.0-rc4; `lean4checker` README; `z3-solver` README and npm registry; Moodle CBM docs; Double & Birney 2019; Ipeirotis & Rizakos v3, Open Proof Corpus v2 and nl2postcond v2 (HTML) |
| **Abstract or arXiv page read** | Shen & Tamkin (plus HTML details), Fernandes, Lehmann, Contractor & Reyes v2, LearnLM/Eedi, Sankaranarayanan, BugSpotter, Kucharavy, Raina, Zheng, Mahdavi, Petrov, Henkel, Sharma, Feng, Iltis; Oreopoulos & Low (NBER page); Hodds 2014 (figshare API); Lachner 2021 (OSF API) |
| **Abstract via Crossref or OpenAlex, by exact DOI** | Kobayashi, Lachner 2022, Roscoe & Chi, Rozenblit & Keil, Butterfield & Metcalfe, Metcalfe 2017, Mellers, Wass (full abstract, resume pass), Huxham, Ohmann, Falchikov & Boud, Brown et al., Sadler & Good (truncated), Kulkarni, Yan, Rodriguez, Couch, Roediger & Marsh, Darvishi, Baldiga, Coffman & Klinowski, Glas & van der Linden, Forge, Inglis & Alcock; resume pass: Haladyna 2002, Fleming & Lau 2014, Nederhand et al. 2019 |
| **Metadata or title only; findings partly recalled (medium or low)** | Butler 2011, van Loon 2015, Carpenter 2018, Foster 2017, Gignac 2020, Jansen 2021, Kruger & Dunning, Smith 1982, Millman et al. 1965, Caleon & Subramaniam, Hoogerheide 2016, Selden & Selden, Mejía-Ramos, McLaren et al. 2016, Gutierrez de Blume 2022. Consulted at title level and not relied on: Jonsson & Svingby 2007, Panadero et al. 2017, Memon et al. 2010 |
| **Second-hand** | DSLabs details (*The Morning Paper*); Gardner-Medwin's α and exam details (search snippets; physoc.org blocked); Fiorella & Mayer 2013 findings (search summary of a same-titled UCSB thesis abstract); the Ford re-analysis of Kestin (kernelspace verification log, 2026-10-03); Lichtenstein & Fischhoff 1980 and Benson & Önkal 1992 (via Stone & Opel's literature review); Haladyna's example guidelines (search summary). Bastani's percentages were first taken from Wharton, CHIBE and RePEc; the fact-check then found them verbatim in the abstract via OpenAlex (PNAS itself blocked) |
| **Derived (reproducible)** | Wilson intervals; CBM switch points (67/80); Brier menu switch points (65/85, the midpoints between adjacent levels); Brier ≈ 0.27 for a three-way call at 55% with ⅓ accuracy; Audit base-rate arithmetic; bucket sizes (n ≈ 72 for ±10 points, n ≈ 32 for ±15 at p = 0.75) |
| **Resume pass, 2026-10-20** | *Re-checked, all confirmed:* `z3-solver` 5.3.1 (npm, 2026-10-16); Lean 4.35.0-rc4 *Validating Proofs*; `lean4checker` README; NBER w35620; Shen & Tamkin HTML v2. *Newly read:* Stone & Opel 2000 (full-text PDF, as reported; the later fact-check could not re-access it); Petrov et al. HTML v5 (§3.3, Table 2); abstracts of CGBG, Killich et al. 2026, Chase et al. 2009, Callender et al. 2016 and Tomes 2019; De Simone (SCALE page: 0.31 and 0.23). *v1 claims re-checked* in `PLAN.md` and the Elevation and Audit artboards: 4 sound cases in 32; levels 55/75/95; "last 40 calls … 0.14 … right only 58%". *Citation integrity:* all 62 first-pass DOIs resolved through OpenAlex, and all 17 arXiv IDs through the arXiv API, to the titles described; year gaps are online-first versus issue dates |
| **Second resume pass, 2026-10-21** | *Applied the independent fact-check* (`L3-assessment-ai.verify.md`: 41 claims, no fabricated citations). It corrected F5, F7, F9, F12, F16 (the "somewhat negated" misquote), F18, F23, F28, F30 and Summary 6. *Re-checked directly:* Double & Birney 2019 (full text); Kestin (PMC); the World Bank blog (attendance quote verbatim); Smrkolj (PMC full text: 89 sat, 49 answered, no reliability coefficient, so F14 was corrected); `z3-solver` 5.3.1; Lean 4.35.0 stable *Validating Proofs*; arXiv versions of eight preprints. *Upgraded from recall* via ERIC or Semantic Scholar abstracts: Hacker 2000, Miller & Geraci 2011, Große & Renkl 2007, Booth 2013, McLaren 2015. *New sources, abstracts read:* Carreira 2025, Mahinpei 2026, LeanTutor, Xiao 2026, Contractor & Reyes (IZA), Deutsch & Oca 2026. *Still unreachable:* the Fiorella & Mayer journal abstracts, Gardner-Medwin's primary source, the Gutierrez de Blume 2022 abstract |
| **Limits** | Blocked or unrendered hosts: PNAS, ScienceDirect, Springer, ACM DL, Nature, Taylor & Francis, physoc.org, APA PsycNet, UCL, the UCSB library (JavaScript only), peer.asee.org, and the Loughborough and Utrecht repositories. The search budget was limited in every pass, so newer 2026 studies may be missed. Searches for experiments in which students audit LLM-generated flawed proofs (repeated 2026-10-21) found only a teaching note (ATCM 2025, not read) and the ASEE 2026 hallucination-detection survey (abstract page read; correlational, F31). Not found: a direct test of showing calibration scores to learners; a delayed-outcome RCT of checker-graded formal-methods exercises |
