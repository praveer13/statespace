# statespace: the spine

**Status:** canonical index for v2 authoring. Every ID used anywhere in this repository comes from this file. **Date:** 2026-10-23 (machine clock). **Review:** the owner decisions in §1.2 are adopted as defaults and await owner review.

**Precedence of sources.** (1) the roadmap, `research/context/roadmap.md`, sets scope; (2) executed runs, `research/spikes/RESULTS.md` and `research/evidence/`, beat any report; (3) the v2 redesign brief, `research/synthesis/BRIEF.md`; (4) the four digests in `research/synthesis/`; (5) the research reports and adversarial reviews, published in redacted form, where a "[redacted: private design detail]" marker is an intentional gap and not a broken reference; (6) kernelspace, the predecessor, for its learning engine only; (7) the v1 design in `docs/history/v1/`, for history only. Where the brief is silent, this spine decides and logs the reason in §12.

**Tags.** `[X RUN-id]` an executed run that already exists on disk; `{{run:RUN-id}}` a run that must be recorded before the sentence ships; `[V]` re-checked against a primary source on the date its sentence or row states, or on 2026-10-23 where none is stated (the landscape digest's [V] spans a fact-check of 2026-10-21 and an API re-check of 2026-10-23, so each TTL runs from its fact's own date); `[D]` design rationale or estimate; `[U]` unverified; `[KS]` from kernelspace's logs, not re-checked; evidence grades **A–D** follow the pedagogy digest (A meta-analysis or several RCTs; B one good similar experiment; C small, correlational or preprint; D rationale). Every tool number, verdict, flag or version stated as a fact here traces to a run in §9.5 and carries one of the first two tags where it is introduced. Learner-facing copy refers to the learner's own product only as "your system".

**ID conventions (exact).**

| Kind | Format | Example |
|---|---|---|
| Stage | `S1`…`S10` | S6 |
| Lesson | `S{n}.L{k}`, tier `[core]`, `[bridge]` (Boot is `S1.L0`, tier `[boot]`, counted as Boot and not among the 76 lessons; capstone steps `S10.L1`–`S10.L7` carry the tier `[step]`, are not lessons and are excluded from every lesson count, GATE-links included, §3.10) | S4.L6 |
| Knowledge component | `KC-{n}.{kebab-slug}`, "threshold" marks a threshold KC | KC-4.cti-or-bug |
| Lab, lab stage, check | `LAB-{n}`, `LAB-{n}.{k}`, `LAB-{n}.c{k}` | LAB-6.4, LAB-6.c4 |
| Specimen, claim template | `SP-{n}.{k}`, `CL-{n}.{k}` | SP-5.1, CL-2.4 |
| Seam, erosion event | `SEAM-{k}`, `ER-{k}` | SEAM-1, ER-1 |
| Audit anchor, gap class | `AUD-{n}.{k}`, `G1`…`G13` (subclasses `G6a`…) | AUD-2.3, G6c |
| Generator family, mechanic | `GEN-{kebab}`, `M-{kebab}` | GEN-cti-or-bug |
| Misconception | `dp:{catalog key}`, registered from `docs/EVIDENCE.md` §6, its proposed entries (§6.11) included; item metadata carries the `dp:` key, and ASSESSMENT.md's `mis:` names are descriptive aliases mapped in its Appendix A | dp:G4 |
| Instrument, screen, CI gate | `INS-{kebab}`, `SCR-{kebab}`, `GATE-{kebab}` | INS-z3, SCR-today, GATE-numbers |
| Drawer | `D-{nn}` (just-in-time `D-01`…`D-23`; deferred `D-30`…`D-40`) | D-03 |
| Run | `RUN-{kebab}` | RUN-tlc-doublespend |
| Wave, task, spike | `W0`…`W6`, `W{n}-T{nn}`, `W0-S{nn}` | W3-T11, W0-S05 |
| Owner decision, brief change | `OD-{n}`, `V2-{nn}` | OD-5, V2-07 |

Stamp codes are always bracketed (`[P]`, `[M]`, `[T]`, `[E]`, `[C]`, `[A]`, `[?]`, `[N]`, `[R]`); IDs are never bracketed. GATE-codes enforces this.

---

## 0. Identity

**Name.** statespace (OD-1). It sits beside kernelspace and tablespace in one family, and it names the object every claim in the course is about: the set of states S and the step S → S′.

**Promise, one line.** Learn formal methods by building a tiny checked application language, and learn to say exactly what each proof, model check and test establishes.

**Successor framing.** statespace inherits kernelspace's learning engine and nothing of its look.

| Inherited from kernelspace (kept, re-tuned) | Deliberately different in statespace |
|---|---|
| Evidence, not clicks: only graded evidence moves status | The currency is a *justified claim*, not performance under an SLO |
| An append-only evidence ledger with provenance weights; seeds drawn at grade time ("unseen, not secret") | Claims live in the learner's lab repo; the browser's only record is practice events, beside a disposable, read-only mirror of the lab repo (V2-17) |
| A KC graph with requires, confusable and threshold edges | Threshold KCs are reasoning moves (negate, generalize, separate invariant from inductive), not facts |
| Seeded generators whose keys come from code | Keys come from real checkers at grade time: Z3, TLC, Spectacle, the interpreter, `lake comparator` |
| Today (10–12 min, phone-first, offline), *Set your week*, VRK₃₀ | Erosion forecasts and "this has changed" cards ride in Today; the Mirror is private |
| Staged labs with a 2-minute first win and ≤25-minute stages (≤45 at weekends) | Two grading lanes: learner Rust as wasm in the tab (Lane A) and receipts from real tools (Lane B) |
| Hint ladders R0–R4 behind an explanation gate; agent guardrails in every zip | Agents may prove; the learner states. Challenge packs pin statements; agent claims are never stamped |
| A facts registry with TTLs (kernelspace's "claims registry"), errata that flag "re-check", change cards | Every tool number is a recorded run (`runs/`); the course erodes in public when a tool changes |
| Validity CI: blind-strategy gates, item lints, cue-ablation | An Audit Desk scored on per-class precision and recall with a seeded sound share |
| Production twins pinned at a SHA; consent before large downloads | A persistent world in the roadmap's nouns, the Clearinghouse, run by the learner's own components |
| Nothing locks; no XP for clicks; honest, repairable weekly rhythm | Stamps are words plus codes; "signed off" is a learner state that never borrows a stamp's color |

**Look.** A drafting table: vellum sheets and graphite line work, title blocks filled from runs, and assurance stamps that are words plus bracketed codes, separable in grayscale. Structure is drawn, not boxed: hairline rules, no shadows, no gradients, a corner radius of at most 2 px. Line styles carry one meaning each: solid graphite is structure, dashed is assumed, dotted is bounded, heavy vermilion is a witnessed violation, and a vermilion zig-zag is an erosion crack. The night theme is a neutral graphite night, not kernelspace's navy and mint (V2-33). There is no stone-plinth metaphor and no elevation drawing; home is an ordered path of stages with a list mirror. Motion is spent only on change (goal diffs, trace scrubs, crack propagation) and becomes static +/− marks under reduced motion.

**Navigation.** Today · Stages · Bench · Audit · Claims, plus search. The private Mirror (calibration and VRK₃₀) is reached from Today and never appears on Claims. The flagship phone surfaces are Today, Lesson, Audit and Claims; §10.1 marks every screen that also works on a phone; the Bench is labeled laptop-only.

**Nouns, kept few (OD-14).** Learner-facing copy uses only the coined terms in the glossary below, at most 25, plus plain English. Boot introduces at most five of them, terms 1–5: its *Set your week* says "study blocks" until LAB-1 introduces the Bench, and its cold-start fallback is labeled "recorded result" until S1.L1 introduces "run". The toy language keeps the roadmap's names: Mini-Plinth and `miniplinth check` (OD-2); the capstone artifact is "the Core". Roadmap names are not coined terms and do not count toward the 25, and neither do plain-English phrases such as "kind of gap" (the learner's words for a gap class), hint ladder, challenge pack, stuck protocol and staged lab. Tier names stay internal: learners see "Start here" for Boot and lesson formats for `[core]` and `[bridge]`. The lab template is `statespace-lab` (OD-2). Internal names stay out of learner copy, and GATE-lessons lints for them: lane (learners see the badge words *re-checked here*, *reported from your machine* and *self-assessed*), Shelf (learners see drawers tagged "deferred"), docket (learners see the Clearinghouse's weekly incidents), pocket checker, telescope (learners see the Spectacle view's minimap), Hall of Records (learners see a "dated incidents" filter in the specimen cabinet), proof debt (learners see "parked goal") and Judgment. GATE-lessons lints all learner copy, `labs/README.md` included; a labeled cross-reference to the design documents may name an internal term once.

| # | Term | Meaning | First introduced |
|---|---|---|---|
| 1 | call | a verdict and a confidence committed before a run (Call It) | Boot |
| 2 | stamp | a word plus a bracketed code saying what a check established, with its qualifier | Boot |
| 3 | specimen | a counterexample kept beside its fix | Boot |
| 4 | Today | the 10–12-minute practice session | Boot |
| 5 | Keep block | the weekly block that holds Today sessions, audit cases, the Clearinghouse's incidents and reviews | Boot (*Set your week*) |
| 6 | run | a recorded tool execution with an id, which anyone can re-execute | S1.L1 |
| 7 | lab · check | a staged build on your machine; one per-stage result | S1 (LAB-1) |
| 8 | receipt | a run's verdict lines, versions and statement hashes, imported from your machine | S1 (LAB-1) |
| 9 | claim | a six-part guarantee card with a three-segment strip | S1.L3 |
| 10 | seam | an assumption planted on purpose; some erode later, some are tested and hold | S1.L3 |
| 11 | drawer | side material, always open; deferred topics carry a "deferred" tag | S1.L1 |
| 12 | Bench | your machine with the real tools; the devcontainer from S2 | S1 (LAB-1) |
| 13 | Audit Desk | judge whether a claim is justified, with typed evidence | S1 |
| 14 | Defence | the four-part sign-off assessment | S1 |
| 15 | signed off · settled | learner states: the Defence passed plus three spaced sessions; then a fresh probe correct 30 days or more after sign-off | S1 |
| 16 | Mirror | private calibration and the VRK₃₀ count | S1 |
| 17 | re-find | the same move on a new specimen | S1 |
| 18 | Prove-it | predictions about seeded mutations of your own artifact | S1 (LAB-1) |
| 19 | twin | a production system that met the same problem, pinned at a SHA (a documentation page by content hash and read date); matched sound and flawed audit cases are "pairs", never twins | S1 |
| 20 | Goal Replay | Lean goal strips generated from real elaboration | S2 |
| 21 | parked goal | a proof goal set aside by the stuck protocol and carried as an assumption | S2 |
| 22 | erosion | the event in which a seam cracks | S3 (ER-6) |
| 23 | Clearinghouse | the persistent world your components plug into | S3, after LAB-3 |
| 24 | Derivation Board | weakest preconditions step by step, each step checked by Z3 | S4 |
| 25 | Theater | concurrency played by hand on real TLC state graphs | S5 |

---

## 1. Invariants and owner decisions

### 1.1 Implementation invariants I1–I10 (BRIEF §7.10)

| # | Invariant | What it means in code | Enforced by |
|---|---|---|---|
| I1 | Evidence, not clicks | Status moves only on checker-graded, unassisted events on unseen seeds; reading, viewing and agent work never move it | GATE-lessons (no completion without a graded item), M-defence rules |
| I2 | Derived, never stored | KC state, sign-off, VRK₃₀, Judgment and stamps are computed at read time from events and receipts; no stored "status" | GATE-stamps, GATE-schema, ledger property tests |
| I3 | Generators are pure and deterministic, with keys from checkers | `make(seed, level) → instance`; the key is computed by an engine at grade time, or by the pinned checker at build time or on the Bench and replayed at grade time (GEN-proof-structure's elaborated goals, GEN-defend's receipts, and seeded draws from a pool of goldens kernel-checked at build time); same seed, same instance in three browsers | GATE-generators, GATE-calls |
| I4 | Every tool number is a run reference | Copy, keys and artboards cite `{{run:RUN-id}}`; `runs/` holds engine, version, binary hash, argv, input hash, budget and outputs | GATE-numbers, GATE-facts, GATE-runs |
| I5 | Nothing locks | Drawers, audit cases, lessons and labs are always open; Call It is required only on first runs of authored cells and on generated items | GATE-lessons (no lock copy), review checklist |
| I6 | Zero servers; untrusted input only in the instrument origin | Static hosting; no accounts, telemetry or grading server; every byte from outside the page (URL-fragment specs, imported receipts, event export bundles, lab and audit bundles, Bench histories, NDJSON traces, IR exports and learner wasm) is parsed only on the instrument origin | GATE-bundle, W0-S01 decision record |
| I7 | Statements are pinned and hashed | Lean challenge packs plus `comparator.json`; non-Lean statements in `claims/*.tla`, `*.smt2`, `*.yaml`; a changed hash voids the claim to [?] | GATE-claims, receipt schema |
| I8 | Agent claims are never stamped | An agent's assertion renders as quoted UNREVIEWED text | GATE-stamps |
| I9 | No private-design content | Public copy says "your system"; review JSONs stay out of the repo; no personal identifiers | GATE-privacy |
| I10 | Bounded checks print their bound, the course's own graders included | Every [M], [T] and grader verdict shows its bound (states, constants, n, scope, rlimit); the Defence shows its Wilson interval | GATE-stamps, GATE-items |

### 1.2 Adopted owner decisions (defaults, awaiting review)

| # | Decision adopted | Where it lands |
|---|---|---|
| OD-1 | Course name: statespace | §0 |
| OD-2 | Keep "Mini-Plinth" and `miniplinth check`; the lab template is `statespace-lab` | §3, §9.6 |
| OD-3 | Roadmap order by default; an optional builder's path for early concurrency work, with erosions keyed to seams and a Lean keep-alive. The brief's path (S1 → S5 → S6.L6–L7 → S8.L1–L4 → S7 → S2–S4 → …) broke the `requires` DAG and the lab dependencies, so this spine adopts its topological repair: S1 → S5.L1–L8 → S6.L1–L2, S6.L6–L7 → S8.L1–L4 → S2 → S3 → S4 → S5.L9 → S7 → S6.L3–L5, S6.L8–L9 → S8.L5–L7 → S9 → S10 (§3.0 Paths) | §3.0, §12 |
| OD-4 | Third-party tools only as disclosed, uncredited link-outs (live.lean-lang.org, the Natural Number Game, Alloy4Fun, TigerBeetle's simulator, TLA+ By Example); no embedded CheerpJ | §9.1, GATE-bundle, §12 |
| OD-5 | A separate instrument origin on its own custom subdomain; the domain lives only in deployment configuration, and committed files write `<course-domain>` | §11.1, W0-S01, GATE-privacy |
| OD-6 | Consent before any download above 5 MB, counted as one engine's compressed first load | M-consent, GATE-bundle |
| OD-7 | Owner review envelope 2–3 h/week; a wave starts only when the review queue is under 10 h | §13 |
| OD-8 | Honor-system provenance, stated openly on the assurance page | §8.2, SCR-assurance |
| OD-9 | An optional human reviewer of claim cards; design partners gate only an "external learners" label | M-weekly-review, §13 |
| OD-10 | Ask the authors before adapting the CC BY-SA self-explanation booklet; keep it in its own directory under its license; only the text is adapted, because its three embedded images are rights-reserved | S2.L0, W2-T05 |
| OD-11 | No private-design content; the review JSONs are excluded from the repo; `research/` is published only in redacted form: W0-T01 removes personal domains, account identifiers and private paths, and GATE-privacy scans the tree | GATE-privacy, W0-T01 |
| OD-12 | Edition 1 pins Lean 4.35.x and PostgreSQL 18.6; re-record the isolation catalog after PostgreSQL 19 GA | §9.2, W6-T07 |
| OD-13 | Sigstore attestations off by default (learners' public repos only, if ever enabled) | §9.4 |
| OD-14 | The persistent world's working name is "the Clearinghouse"; prefer fewer nouns | §0 glossary, M-docket, SCR-clearinghouse, W3-T14 |
| OD-15 | *Proposed by this spine, awaiting owner review.* Lab shape: 10 labs (LAB-10 is the final assembly) with 83 planned and 8 `[stretch]` stages, against the brief's 9 labs and "~45 stages". Stages are pinned per lemma, at most 25 minutes on weekdays and at most 45 minutes at weekends (BRIEF §7.3), and seven LAB-3/4/6/8 stages build capstone steps | §3.0, §3.11, §12 |
| OD-16 | *Open, for the owner.* The course's own licenses, one for content and one for code (the OD-10 booklet keeps its own); W0-T01 requires both LICENSE files before the first public push | W0-T01, GATE-privacy |

---

## 2. Learner and outcomes

### 2.1 Who the course is for

A working backend engineer, Rust-fluent and systems-literate, novice in formal notation, studying alone for 6–10 hours a week over many months while building their own system with coding agents. A kernelspace graduate is the reference learner; a "From kernelspace" placement path pre-credits only KCs that a kernelspace Evidence Pack actually evidences, and never logic, induction, TLA+ or isolation (V2-20): never KC-1.*, KC-2.induction-principle, KC-2.generalized-ih, KC-5.*, KC-6.anomaly-isolation, KC-6.compilation-pattern, KC-6.serializable-retries or KC-6.abstract-serializability (W2-T16's property test). Scaffolding is set per KC: expert treatment for Rust, Postgres practice and concurrency failures; novice treatment for proof, semantics, weakest preconditions, temporal notation, information flow and simulation (expertise reversal, grade A [dp row 9]).

### 2.2 The end-state as measurable outcomes

The roadmap's end-state (a)–(g) becomes seven outcome families. Each family is a generated task set re-sampled at ≥30 days (the "end-state matrix"); every Defence samples from it. "Criterion" is per learner and on-device; the course reports it descriptively with an interval (a Wilson interval for a proportion; §6's for balanced accuracy) and makes no population claim.

| Outcome (roadmap) | Measured by | Core KCs | Criterion (per learner) | Trained in |
|---|---|---|---|---|
| (a) State a property precisely | GEN-negate-it and GEN-spec-it items graded by Z3 equivalence (P⇒R and R⇒P) with a distinguishing state and a mandatory non-vacuity witness | KC-1.quantifier-negation, KC-1.only-if-direction, KC-1.violation-as-sat, KC-7.policy-checking | ≥75% on ≥12 unseen items across ≥2 sessions, then a fresh probe correct at ≥30 days | S1, S4, S7 |
| (b) Distinguish safety, liveness and information flow | GEN-call-it property-kind items, GEN-lasso-or-not, GEN-leaks-to-observer | KC-5.safety-vs-liveness, KC-7.hyperproperty, KC-7.enforcement-vs-ni | Same rule; interleaved only within confusable set B | S5, S7, S8 |
| (c) Derive and audit proof obligations | GEN-wp-it, GEN-cti-or-bug, Derivation Board items; Audit Desk classes G1, G2, G4, G13 | KC-4.wp-assignment, KC-4.vc-shape, KC-4.cti-or-bug, KC-4.trust-stack | Same rule; plus per-class audit recall reported once n ≥ 10 | S4, S5, S9 |
| (d) Understand proofs over language semantics | GEN-proof-structure on generated goals from S3 and S9; statement-reading items on CL-3.3 and CL-9.2 | KC-3.step-invariant, KC-3.progress-preservation-scope, KC-9.forward-simulation, KC-9.observations | Same rule | S2, S3, S9 |
| (e) Model adversarial concurrent executions | GEN-find-the-witness (traces), GEN-trace-allowed, GEN-anomaly-id | KC-5.interleaving-granularity, KC-6.anomaly-isolation, KC-8.crash-windows | Same rule | S5, S6, S8 |
| (f) Establish or test a refinement to Postgres | R(S,D) items, GEN-anomaly-id, history classification on Bench-recorded histories | KC-6.refinement-relation, KC-6.differential-testing, KC-6.abstract-serializability | Same rule; beside it, outside the criterion, the artifact line "LAB-6.c7 passes on the learner's own R(S, D)" | S6, S9 |
| (g) Decide which claims are justified before trusting agent-written code | Audit Desk balanced accuracy and per-class precision and recall; GEN-spot-the-gap; GEN-which-stamp; the capstone demonstration | KC-10.agent-proposal-triage, KC-4.trust-stack, KC-2.kernel-not-requirement | Balanced accuracy with an interval assembled from the two class rates' 97.5% Wilson intervals (§6); per-class rates only at n ≥ 10; beside it, outside the criterion, the artifact line "the demonstration recorded end to end (CL-10.1)" | All stages; S10 |

**Judgment** (an internal name, used in I2, §8.2 and §14) is outcome (g)'s measure: the Audit Desk's balanced accuracy on `own · unseen` cases, with the interval of §6, plus per-class precision and recall once a class has n ≥ 10. Like every learner state it is derived from events at read time. Learner copy calls it "audit accuracy".

### 2.3 North star: VRK₃₀

A KC counts toward **VRK₃₀** when the learner answers fresh generated items on it correctly, with provenance `own` and `unseen`, at least 30 days after first learning it (for a KC credited at placement or test-out, first learning is the confirmation date). The Mirror shows the count, its rate per active study-month, and intervals. There is no population target and no comparison across learners; the number exists to answer roadmap rule 6, "track what you can independently reason about". (The pedagogy digest calls the same measure VRC₃₀; this spine uses the brief's name.)

### 2.4 What is and is not promised

| Promised | Not promised |
|---|---|
| Every tool number, verdict, flag and version in the course is a recorded run you can re-execute | Effect multiples; the median education effect is about 0.10 SD [kraft20], and nothing here adds up to more |
| Stamps that say what a check established, with its checker, bound or n | Far transfer; the course trains near transfer to your system through twin labs and the private overlay |
| Nothing locks; your data stays on your device and in your lab repo | Anti-cheat: provenance is self-declared and calibrates rather than polices (OD-8) |
| A published report that separates proved, model-checked, tested, enforced, configured, assumed and not covered | That "signed off" means PROVED competence; a passed Defence is [T] (n unseen items) |
| Errata that flag "re-check" and never deduct | A fixed duration: the arc is shown as a range, never as "behind" |

---

## 3. Stage map

### 3.0 Conventions for every stage

**Lesson tiers.** A `[core]` lesson is fully authored: a hook and 1–2 prequestions (≤2 min); 2–4 segments of 12–15 minutes, each built around one instrument run (Call It on the first run) and ending in a graded item; exit items that create Today cards; a "Build this" card for the next lab stage; and a production-twin card where one exists. A `[bridge]` lesson is at most 1,000 words with one prequestion, tagged with every KC the bridge introduces (which meets GATE-kc's per-KC rule), instrument cells (Call It on first runs), one graded item plus an exit item, and a dated, section-level pointer into the roadmap's reading. Generator families feed Today; they are not lessons. The lesson rail shows segment titles only, never answers, verdicts or option text (V2-05; GATE-lessons' rail lint). W1–W2 content uses at most six content block types (V2-18; GATE-lessons counts them); W1-T10 names the six and logs them in §12, and a new type is added only by a logged decision.

**Graded objectives.** Every objective verb that asks the learner to explain, say or name resolves to a checker-graded form, named by its generator family and template in the lesson's item list: usually GEN-call-it template 4 (multiple true/false over about five scenarios), GEN-proof-structure's "needed hypothesis", Proof Blocks, or a witness. Free prose is an uncredited explain-back (I1; GATE-lessons fails a lesson whose graded item names no family and template).

**Lab anatomy.** Predict, then run the reference; 3–5 investigation items; stages of at most 25 minutes on weekdays and at most 45 minutes at weekends (BRIEF §7.3), the first a 2-minute win; per-check results; a hint ladder behind an explanation gate on every check (M-hint-ladder [D]: the gate asks for the failing check, the property it protects and a hypothesis in at least 12 words, and grades nothing; R0 a teach-back compared with three authored ideas, self-assessed; R1 the concept; R2 where to look, the stuck goal on a Lean stage; R3 a fragment of at most three lines, a `sorry` skeleton on a Lean stage; R4 the design in prose, the informal proof on a Lean stage; anything after R2 is credited as assisted until an unseen variant passes); Prove-it predictions about seeded mutations of the learner's own artifact; a receipt; then claim cards that fade from receipt-prefilled to learner-written. A stuck protocol is offered, with no timer on screen, at about 25 minutes (`statespace stuck` writes a forum-ready minimal example and an agent packet), 45 minutes (post that example where people who know the tool will see it) and 90 minutes (park the goal, carried as [A]) [D] (M-stuck-protocol). Stages marked `[stretch]` are optional and excluded from budgets; stages marked `[weekend]` are planned at 45 nominal minutes, and every Lean proof stage that proves a whole theorem rather than one case is a weekend stage. Lean proof stages are planned at up to 3× their nominal minutes (the stuck protocol parks a goal at 90 minutes); other stages at up to 2×. Each Lean lab's template states what it pre-supplies (for example, LAB-3 supplies `State`, `Err`, `Inv`, the `Policy` record, the expression evaluator and the goldens harness), so a stage's minutes cover only what the learner writes. Learner lab checks never cite course CI gates: "claim@1 validation" means `statespace check` applying the GATE-claims rules locally.

**The Defence pattern** (full rules in §8.6). Part A, probes: 10–12 unseen-seed items from ≥3 families, the roadmap's completion tests turned into items, agent closed, a call on each (~35 min). Part B, defend: 4–6 seeded mutations of the learner's own lab artifact (S10's seven, one per learner-owned component, is the one logged exception), predicted first, graded by Lean, TLC, Z3 or cargo (~20 min); every mutant elaborates or builds, or its prediction key says it fails to (GATE-labs). Part C, audit: 4 cases with at least one sound, typed evidence (~20 min). Part D, explain-back: a 2-minute oral and a 3-idea self-check compared with Part A, required and uncredited (~10 min). Untimed, over at least two sessions, within a week of the lab; a failed part is retaken on fresh seeds (§8.6).

**Budget method** [D]. Planned hours = reading + lessons (core 40–60 min, bridge 15–25 min, Boot 8 min) + build (lab stages at nominal minutes, up to the multipliers above) + write (write-stages, claim cards and the technical note) + the Defence. The weekly Keep block comes off the top. It is a computed figure, not a constant: introduced KCs × about 10 graded reviews each (the ≥ 8-in-60-days dose of §4.1, plus FSRS maintenance) × logged seconds per item, plus 2–3 audit cases, 1–3 Clearinghouse incidents, the 5-minute weekly review, the monthly retro and, while Lean is idle, the keep-alive session. Today runs 3–5 times a week inside it. The planned figures assume about three Today sessions and one Clearinghouse incident (10–15 minutes [D]) a week at 6 h/week, and about four sessions and two incidents at 10 h/week; an erosion takes one of the week's incident slots, and SCR-week recomputes the figure from the learner's own settings. At the digest's sizing (about 2 minutes per review; 105 KCs × 10 × 2 min ≈ 35 h over the arc) the Keep block is planned at 45–75 min/week at 6 h/week and 60–105 min/week at 10 h/week [D], so a 6 h week gives at least 4.75 h of stage work and a 10 h week at least 8.25 h. GATE-budget fails a stage whose high estimate exceeds the roadmap's upper bound in weeks × 4.75 h; warns, until a justification is logged in §12, when a stage's high estimate falls below half of the roadmap's lower bound × 4.75 h; and checks each stage's implied Keep load against the plan. Logged item times from learner-zero replace these estimates after each wave.

**Columns.** Objectives are observable; KCs (§4), instruments (§9), generators (§8.3), specimens and claims (§5) resolve to their catalogs.

**Paths.** Roadmap order is the default. The optional builder's path (OD-3) puts concurrency first and is a topological order of the hard `requires` edges and of the lab-artifact dependencies (GATE-kc checks every published path):

S1 → S5.L1–S5.L8 → S6.L1, S6.L2, S6.L6, S6.L7 → S8.L1–S8.L4 → S2 → S3 → S4 → S5.L9 → S7 → S6.L3–S6.L5, S6.L8, S6.L9 → S8.L5–S8.L7 → S9 → S10.

| Jump on the builder's path | Edge or artifact crossed | Substitute |
|---|---|---|
| S6.L2 before S3 | KC-6.rowcount-as-guard → KC-3.big-step-errors (a soft edge) | drawer D-23, a self-contained card on explicit error outcomes |
| LAB-6 before LAB-3 and LAB-4 | the early block runs LAB-6.1, LAB-6.5 and LAB-6.6 only; LAB-6.6's retry policy wraps the course's reference compiler | the reference compiler is labeled "reference module, earns nothing"; LAB-6.2–LAB-6.4 and LAB-6.7–LAB-6.9 run in the later S6 block |
| S8.L1–S8.L4 before LAB-3 and LAB-6.2 | LAB-8.1, LAB-8.2, LAB-8.4 and LAB-8.5 only; LAB-8.4 is the learner's first Lane A work; LAB-8.5's inbound keys run against the reference compiler | drawer D-14 (the Lane A wasm ABI) is read first; the reference compiler carries the same label; LAB-8.3 and LAB-8.6–LAB-8.9 run in the later S8 block |
| S5.L9 after S4 | KC-5.inductive-invariant-tla → KC-4.invariant-vs-inductive (hard) | none needed: S5.L9 and LAB-5.7 move after S4 |

Every other `requires` edge is hard. Erosions are keyed to seams, not stage numbers (§5.4). The Lean keep-alive starts only once S2 is signed off and runs while Lean is idle (S5–S8 on the default path; S7 and the later S6 and S8 blocks on the builder's path).

### 3.1 S1 Counterexample (Z3Py) — "find a bug mathematically"

New tool: Z3Py, met first in the tab (INS-z3, Z3 5.3.1 on Pyodide 314.0.7 [X RUN-z3-starter-pyodide]). Lab lane: the learner's own machine with `uv run --with z3-solver==5.3.1`, as the executed spikes ran [X RUN-z3-starter], or entirely in the tab on INS-z3; no devcontainer, which arrives at S2 (D-15); witnesses are re-checked in the tab. Roadmap time: 2–4 focused sessions.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S1.L0 | boot | Boot: "safe, 200 tests green" | call whether an agent's guarded transfer, a variant whose answer the roadmap does not print, is safe for the sender over `Int`; read Z3's overdraft witness, then the corrected guard's `unsat`; close on the BitVec 64 recipient wrap as an uncredited reveal | KC-1.violation-as-sat (first contact: a pre-instruction call, recorded and scheduled but counted toward no KC state until S1.L1 teaches it) | INS-z3; while the worker is cold, the variant's recorded result {{run:RUN-z3-boot-variant}}, labeled "recorded result" because S1.L1 introduces "run" | GEN-call-it | mounts SP-1.1; the reveal shows SP-1.4 and closes on SP-1.9 (exposure only) |
| S1.L1 | core | Negate, then search | turn an English property into a violation query by asserting its negation, get a witness, and name the class the witness belongs to; the first scored call is a fresh variant, because the roadmap's starter prints its own answer (V2-05) | KC-1.violation-as-sat, KC-1.quantifier-negation, KC-1.only-if-direction, KC-1.witness-class | INS-z3 | GEN-negate-it, GEN-find-the-witness, GEN-call-it | SP-1.1 |
| S1.L2 | bridge | Three answers: sat, unsat, unknown | judge about five statements true or false on what `sat`, `unsat` and `unknown` each assert about one query, one encoding and one solver run (GEN-call-it, template 4), and pick the fail-closed behavior when `unknown` guards enforcement | KC-1.three-answers, KC-1.unknown-fails-closed | INS-z3 | GEN-call-it, GEN-which-stamp | SP-1.7, SP-1.8 |
| S1.L3 | bridge | The guard, and what unsat says | add the sufficient-funds guard, read `unsat` as "for every input of exactly this encoding, if the solver is sound", and run the premise witness beside it; then fill CL-1.1's six fields, its "if weakened" witness refuting its own proposition (D-06) | KC-1.non-vacuity-check, KC-1.implication-vacuity, KC-1.claim-anatomy | INS-z3 | GEN-negate-it, GEN-call-it | SP-1.6 · CL-1.1 |
| S1.L4 | bridge | Two-state properties | encode conservation with primed variables, find the double-capture and buggy-refund witnesses, and fix each so that a non-minimal witness dies too | KC-1.two-state-property, KC-1.witness-class | INS-z3 | GEN-find-the-witness, GEN-negate-it (two-state template) | SP-1.2, SP-1.3 · CL-1.2, CL-1.3, CL-1.4 |
| S1.L5 | core | The encoding is the claim | re-encode the transfer in BitVec 64 and explain why the guarded sender stays safe only with `amount > 0` {{run:RUN-z3-bv64-negamt}}, why the recipient wraps, and how a mixed signed/unsigned guard readmits the overdraft; read the six-row "what 64-bit means" table | KC-1.encoding-is-the-claim | INS-z3, INS-pocket | GEN-call-it, GEN-find-the-witness | SP-1.4, SP-1.5, SP-1.9, SP-1.10 · CL-1.5 |

**Boot notes.** At most 8 minutes on a phone. The target is a first success within 4 minutes [ks100x]; W1 checks it mechanically with a Playwright timing gate and records learner-zero's time descriptively, and the naive-tester median (RUN-boot-firstsuccess, at least five testers) is recorded before the "external learners" label (§13, W1-T09). Boot ends with the "this will feel harder" card [deslauriers19], *Set your week*, and an optional placement walk. The six-row table in S1.L5 shows: Lean ℤ and Z3 Int never overflow; Z3 BitVec wraps with signedness per operator [X RUN-z3-bv64]; PostgreSQL `bigint` raises 22003 [X RUN-pg-claims] and `numeric` raises on its declared bound {{run:RUN-pg-numeric-bound}}; Rust `i64` panics in debug builds, wraps in release builds, and returns `None` from `checked_add` {{run:RUN-rust-i64}}.

**Lab LAB-1 — Project 00, the counterexample lab** (the roadmap's first-weekend checklist, plus Stage 1's conservation and double-capture project in LAB-1.5; 3–5 h in the roadmap). It runs with `uv run` or in the tab, never in the devcontainer.

**The first weekend** is Boot, S1.L1, S1.L2 and S1.L3, the Z3Py introduction, and LAB-1.1–LAB-1.4 plus LAB-1.6: the roadmap's checklist, about 3–6 h at the planning multipliers against the roadmap's 3–5 h. S1.L4, S1.L5 and LAB-1.5 follow in week 2. Because LAB-1.4 comes before S1.L4, its refund rule is written in expression form, without primed variables, and S1.L4 grades a fresh refund variant rather than re-asking the call LAB-1.4 answered.

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-1.1 | Run the Z3Py introductory example, then the roadmap's starter; see `sat`, then `unsat` | 2 | LAB-1.c1: the verdict pair reproduces [X RUN-z3-starter] |
| LAB-1.2 | Find a transfer that makes the source balance negative | 20 | LAB-1.c2: the witness replays under the encoding (graded by checking the witness, never by matching model values) |
| LAB-1.3 | Add the sufficient-funds guard: `unsat`, plus a satisfiable premise witness | 15 | LAB-1.c3: `unsat` on the violation query and `sat` on the premises alone |
| LAB-1.4 | Introduce the buggy refund rule, find the second counterexample, fix it so a non-minimal witness also dies | 25 | LAB-1.c4: the fixed rule is `unsat` on fresh mutants of the bug |
| LAB-1.5 | Conservation and double capture as two-state properties | 25 | LAB-1.c5: both queries return the expected verdicts on fresh seeds |
| LAB-1.6 | README with the property, assumptions, solver answer, example model and limitations; two claim cards prefilled from the receipt | 25 | LAB-1.c6: the README carries the roadmap's five fields; both cards pass claim@1 validation |

**Seams and erosions.** Plants SEAM-1 ("balances are unbounded integers", via CL-1.1 and CL-1.2; CL-1.3 and CL-1.4, also `Int` claims, carry it) and SEAM-7 ("the solver is sound", via CL-1.1's uncertified [P]). S1.L5 foreshadows ER-1 without firing it.

**Defence (S1).** A: 10 items from GEN-negate-it, GEN-find-the-witness, GEN-call-it and GEN-which-stamp, including the completion tests as items: why a violation search asserts the negation; what `sat`, `unsat` and `unknown` mean precisely; why the answer depends on the encoding; what changes if `amount` may be zero. B: four mutations of the learner's Project 00 (drop `amount > 0` under BitVec 64; tighten `≤` to `<`, a surprise item, because the stricter guard admits fewer transfers and cannot make the violation query satisfiable; switch Int to BitVec 64; drop a conjunct of the refund rule), predicted first, graded by Z3. C: four cases from the AUD-1.1–AUD-1.3 pair pool and its generated variants, at least one sound. D: explain back why searching for a violation means asserting the negation.

**Audit anchors.** AUD-1.1, AUD-1.2, AUD-1.3. **Drawers.** D-01, D-02, D-03, D-04, D-06, D-13. **Production twins.** TigerBeetle's two-phase transfers, holds as pending postings [tb2pc]; the seven-verdict vocabulary of AWS Automated Reasoning checks as a reading card that maps onto stamps [dl §2]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None.

**Budget** [D]: 5.3–9.4 h (reading: the Z3Py introduction) against 2–4 focused sessions, read as at most 10 h; GATE-budget passes. Breakdown in §3.11.

### 3.2 S2 Proof (Lean 4) — "prove a small program correct"

New tool: Lean 4, toolchain 4.35.0, core only [X RUN-lean-ledger], with Std and `autoImplicit false` added by the lab template {{run:RUN-lean-template}}; no Mathlib (a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib]). Met first in the tab as generated Goal Replay. Lab lane: Bench with a challenge pack. Roadmap time: 3–6 weeks. A "this will feel harder" card opens the stage. Technical note 1 follows it.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S2.L0 | bridge | Reading a proof line by line | self-explain each line of a short proof (the move, the reason, the goal it serves) before writing any Lean; a 15–20-minute unit, adapted from the CC BY-SA booklet only after its authors confirm (OD-10) | KC-2.proof-reading | INS-goal-replay (read-only) | GEN-proof-structure | — |
| S2.L1 | bridge | The Natural Number Game, first | finish the required worlds of the Natural Number Game, then pick the induction hypothesis a generated goal needs (GEN-proof-structure, "needed hypothesis"); stating it in words is an uncredited explain-back | KC-2.induction-principle | link-out (NNG; pinned fallback D-08) | GEN-proof-structure | — |
| S2.L2 | bridge | Lean as a language; propositions as types | write `transfer` over `Int`, evaluate it, and write one proof term by hand; tell `theorem` from `def` | KC-2.props-as-types | INS-goal-replay | GEN-proof-structure, GEN-call-it | — |
| S2.L3 | bridge | Tactics transform goals | predict the next goal before each tactic of a generated Goal Replay is revealed | KC-2.goal-state-reading | INS-goal-replay | GEN-proof-structure | — |
| S2.L4 | bridge | Induction you can explain | order the steps of a generated induction proof with Proof Blocks, whose distractors include a circular use of the hypothesis, and pick the hypothesis each case needs (GEN-proof-structure, templates 2 and 3); explaining the base case and step without tactic names is an uncredited explain-back | KC-2.induction-principle | INS-goal-replay | GEN-proof-structure | — |
| S2.L5 | core | Two accounts, conserved, and what the theorem says | prove conservation over `Int`; judge about five English restatements true or false, the true ones naming every hypothesis (GEN-call-it, template 4); and fill the claim card's "if weakened" field with a witness against *its own* proposition | KC-2.theorem-statement-reading, KC-2.props-as-types | INS-goal-replay, INS-bench-lean | GEN-proof-structure, GEN-call-it | SP-2.2 · CL-2.1 |
| S2.L6 | bridge | Rejection and non-negativity | prove unchanged-on-rejection and non-negativity after an allowed transfer in manual mode (`grind` and `omega` off), and say which axioms automation would add | KC-2.rejection-unchanged, KC-2.automation-scope | INS-goal-replay, INS-bench-lean | GEN-proof-structure, GEN-which-stamp | CL-2.2, CL-2.3 |
| S2.L7 | core | Sequences of transfers: generalize first | prove `run_conserves` by list induction and explain why the hypothesis must be generalized over the state | KC-2.generalized-ih | INS-goal-replay (backward fading), INS-bench-lean | GEN-proof-structure | SP-2.3 · CL-2.4 |
| S2.L8 | bridge | Many accounts: function update and self-transfer | generalize to `Acct → Int` with pointwise update and exhibit the self-transfer mint with `decide` | KC-2.finite-map-update | INS-goal-replay, INS-z3 | GEN-find-the-witness | SP-2.1 · CL-2.5 |
| S2.L9 | core | The trusted kernel, and the day it was wrong | read `#print axioms`, classify each axiom (standard, `sorryAx`, `_native`, custom), explain why a build verdict and a kernel-replay verdict are both needed, and retell the #14576 kernel-bug story without exploit code [pmortem] | KC-2.axioms-and-trust, KC-2.automation-scope | INS-goal-replay (recorded outputs), INS-bench-lean | GEN-which-stamp, GEN-call-it | SP-2.4, SP-2.5, SP-2.6 |
| S2.L10 | core | Every checker agrees; none read the requirement | run `lake comparator --paranoid` (six checkers [X RUN-lean-comparator]) on a true theorem that misses the intent, then exhibit in the tab a scenario the theorem permits and the requirement forbids | KC-2.kernel-not-requirement, KC-2.statement-pinning | INS-bench-lean, INS-interp | GEN-call-it | SP-2.7, SP-2.8, SP-2.9 |

**Lab LAB-2 — the verified ledger** (challenge pack: a read-only `Challenge` module with definitions and statements, plus `comparator.json` listing the permitted axioms, which S2.L9 teaches; the pack also pins an optional `transfer_moves`, SP-2.9's cure, with its own optional comparator configuration, on which no stage or check depends).

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-2.1 | `statespace check` on the reference proof of `transfer_conserves`, the only proof the pack ships (copied into LAB-2.2, it trips manual mode's automation flag); read the receipt's verdict lines | 2 | LAB-2.c1: the receipt shows kernel acceptance and the axiom list [X RUN-lean-ledger] |
| LAB-2.2 | `transfer_conserves`, manual mode (proof stage) | 25 | LAB-2.c2: comparator accepts; axioms within `comparator.json`; manual-mode flag recorded |
| LAB-2.3 | `transfer_rejected` (proof stage) | 20 | LAB-2.c3: comparator accepts |
| LAB-2.4 | `transfer_nonneg` (proof stage) | 25 | LAB-2.c4: comparator accepts |
| LAB-2.5 | `run_conserves`, generalizing first (proof stage, `[weekend]`) | 45 | LAB-2.c5: comparator accepts against the pinned statement |
| LAB-2.6 | `Acct → Int`: the fixed transfer conserves; the buggy one mints, by `decide` (proof stage; the template supplies `upd` and the two transfer definitions) | 25 | LAB-2.c6: fixed theorem accepted; the buggy specimen is kept in `broken/` beside `fixed/` |
| LAB-2.7 | Receipt and claim cards, faded: method, tool and version prefilled; proposition and "if weakened" written by the learner | 15 | LAB-2.c7: `lake check` passes on the default targets, now free of `sorry` (stretch modules sit outside them); cards pass claim@1 validation |
| LAB-2.8 | `[stretch]` the transfer as zero-sum postings | 25 | — |

**Seams and erosions.** Plants SEAM-2 ("transfers run one at a time", via CL-2.4) and SEAM-15 (the 4.35.0 kernel accepts only well-typed terms; a held seam tested by `lake comparator --paranoid` at the Defence). CL-2.1–CL-2.5 carry SEAM-1, and all five rest on SEAM-15.

**Defence (S2).** A: 12 items from GEN-proof-structure, GEN-which-stamp and GEN-call-it (multiple true/false over requirement scenarios), including the completion tests: proofs contain no `sorry`, read from a receipt's axiom list; explain the induction in `run_conserves` without reciting tactics; say what kernel acceptance establishes and what it does not. B: mutations of the learner's LAB-2 (drop `generalizing s`; ℤ → ℕ balances; drop the `amount ≤ balance` hypothesis; replace `decide` with `native_decide` in the closed goal of SP-2.1's `xferBuggy … = 15` in LAB-2.6, predicting that the build passes, `#print axioms` lists a `…._native.native_decide.ax_1_1` axiom and `statespace check` rejects it as not permitted [X RUN-lean-axioms]; weaken the statement under the same name), predicted first, then run by `statespace defend`. A `native_decide` mutant is applied only to closed, decidable goals; on the universally quantified ledger goals it would not elaborate. C: cases from the AUD-2.1–AUD-2.4 pair pool. D: explain back the induction in `run_conserves`.

**Audit anchors.** AUD-2.1, AUD-2.2, AUD-2.3, AUD-2.4. **Drawers.** D-02 (S2.L2), D-04 (S2.L8), D-05, D-06 (S2.L10), D-07, D-08, D-15. **Production twins.** `lake comparator` and Comparator Live's challenge-hash contract; lean-eval counts a problem solved only if comparator accepts [dl §2]; Lean PR #14577, the kernel fix behind S2.L9's story; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None.

**Budget** [D]: 15.6–28.4 h (reading: targeted *Theorem Proving in Lean 4* sections; the 3–5 h of Natural Number Game play count under Build, §3.11) against 3–6 weeks (14.3–28.5 h of stage work at 4.75 h/week); GATE-budget passes at its upper bound. `run_conserves` is a weekend stage because generalizing the hypothesis is the stage's hardest move.

### 3.3 S3 Semantics (Lean 4) — "invent Mini-Plinth as a language"

No new tool: Rust is the learner's existing language, not a new tool (§12). Lab lane: Bench (Lean, kernel-checked goldens) plus Lane A (the learner's Rust, graded in the tab) for capstone steps S10.L1–S10.L2. Toy syntax, from the roadmap: `entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.` Roadmap time: 4–8 weeks.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S3.L1 | bridge | Abstract syntax, and why we skip parsing | represent entities, expressions, guards, commands and resource operations as inductive types, and judge about five scenarios true or false: which errors an AST-only design still rules out and which it leaves to a parser (GEN-call-it, template 4) | KC-3.abstract-syntax | INS-interp (AST view), INS-goal-replay | GEN-call-it | — (plants SEAM-6) |
| S3.L2 | core | Typing: resources cannot be assigned | write `ResourceOp ∈ {deposit, move, hold, capture, release}`, each a pair of postings against mint and sink accounts (V2-16); write `HasType` with resource and scalar types, a rule that forbids assigning a resource field, and `Amount := {n : Int // 0 < n}`; find an ill-typed program the rule rejects | KC-3.typing-judgment, KC-3.resource-postings, KC-3.refined-types | INS-goal-replay, INS-interp | GEN-proof-structure, GEN-find-the-witness | — |
| S3.L3 | bridge | Big-step with explicit errors | write an evaluator returning `Except Err (State × Output × List Effect)` and give the outcomes of zero, self-transfer and failed-guard commands as values | KC-3.big-step-errors | INS-interp | GEN-find-the-witness | — |
| S3.L4 | bridge | Small-step and stuck states | define the transition relation, find a stuck ill-typed program, and tell a stuck state from an error outcome | KC-3.small-step-stuck | INS-interp | GEN-find-the-witness, GEN-call-it | SP-3.1, SP-3.4 |
| S3.L5 | bridge | What progress and preservation buy | read the progress and preservation statements for the fragment and judge about five candidate guarantees true or false: which ones they give and which business invariants they do not (GEN-call-it, template 4) | KC-3.progress-preservation-scope | INS-goal-replay | GEN-proof-structure, GEN-call-it | CL-3.1, CL-3.2 (stretch) |
| S3.L6 | core | Invariants of successful steps | prove a state invariant preserved by every successful transition, case by case, and state the refinement from postings to the Stage 2 ledger | KC-3.step-invariant | INS-goal-replay (fading, F2), INS-bench-lean | GEN-proof-structure | CL-3.3, CL-3.4 |
| S3.L7 | core | Edge cases are decisions | answer zero, self-transfer, failed guard and overflow from the semantics alone, record each decision (zero is a recorded change: S2's guard admits n = 0 [X RUN-lean-ledger], while `Amount` is positive), and show how `Nat` subtraction hides an overdraft | KC-3.edge-cases-as-decisions, KC-3.nat-truncation | INS-interp, INS-z3 | GEN-call-it, GEN-find-the-witness | SP-3.3 |
| S3.L8 | bridge | Termination: structural recursion and fuel | explain why v0 has no loops, how fuel makes evaluation total, and what an out-of-fuel result means | KC-3.termination-fuel | INS-goal-replay | GEN-call-it | — |
| S3.L9 | bridge | The unsafe command; goldens as theorems | add `force move`, watch the invariant obligation fail, and check the interpreter against kernel-checked goldens (`theorem golden_k : run c s₀ = r := by decide`) | KC-3.goldens-as-theorems, KC-3.step-invariant | INS-interp, INS-bench-lean | GEN-find-the-witness | SP-3.2, SP-3.5 · CL-3.5 |

**Lab LAB-3 — mini-plinth-core, goldens and the JSON IR; capstone S10.L1–S10.L2.** Learner-owned semantics are checked against a pinned reference evaluator plus kernel-checked goldens; the fallback is stamped "statement check: weak" (BRIEF §4.3). The template supplies `State`, `Err`, `Inv`, the `Policy` record, the expression evaluator and the goldens harness, so a learner cannot weaken the pinned statement by redefining `Inv`; the learner writes the command syntax, `HasType`, the command evaluator and the step-invariant proof. The reference evaluator ships as a pinned dependency that learner semantics modules may not import (a lint, on the honor system of OD-8; GATE-guardrails). Goldens of the form `run c s₀ = r := by decide` need a finite state with decidable equality (not `Acct → Int`), a derived `DecidableEq` instance for `Except`, which core 4.35.0 lacks {{run:RUN-lean-golden-harness}}, and a structurally recursive, fueled evaluator (W2-T07). Because the tab runs no Lean, "fresh seeds" for kernel-checked goldens (LAB-3.c9–LAB-3.c10) means seeded sampling from a pool kernel-checked at build time (I3). Manual mode in LAB-3.4–LAB-3.5 turns off `grind` only, because case analysis is the taught step and `omega` adds no `Classical.choice` [X RUN-lean-axioms] (§12).

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-3.1 | Run the reference evaluator; see a golden pass | 2 | LAB-3.c1: one golden passes |
| LAB-3.2 | AST, `ResourceOp` and `HasType` for the fragment (`[weekend]`) | 45 | LAB-3.c2: typing goldens pass by `decide`; `autoImplicit false` |
| LAB-3.3 | Evaluator with explicit errors (`[weekend]`) | 45 | LAB-3.c3: evaluator goldens pass; lint finds no `implemented_by`, `extern`, `partial`, `unsafe` or `native_decide` in semantics modules |
| LAB-3.4 | Step invariant (a): the per-operation lemmas, one `ResourceOp` at a time (proof stage, `[weekend]`) | 45 | LAB-3.c4: comparator accepts each lemma against its pinned statement |
| LAB-3.5 | Step invariant (b): the theorem over every successful step, assembled from the lemmas (proof stage, `[weekend]`) | 45 | LAB-3.c5: comparator accepts against the pinned statement |
| LAB-3.6 | The unsafe command: add `force move` to your semantics; the step-invariant theorem fails; keep it in `broken/` (proof stage) | 25 | LAB-3.c6: a kernel-checked counterexample golden (`by decide`) exhibits a state that `force move` takes outside the invariant, so no proof of the pinned statement exists for the extended command set; an attempt that changes the statement is rejected by comparator; `broken/` sits beside `fixed/` |
| LAB-3.7 | Decision records for zero, self-transfer, failed guard and overflow; IR export via `lake exe` (write stage) | 20 | LAB-3.c7: four decision records present; the IR validates against `IR@1` |
| LAB-3.8 | Capstone S10.L1 (a): a Rust parser for the toy syntax (Lane A) | 25 | LAB-3.c8: parses the syntax corpus; IR equals the Lean export on the goldens |
| LAB-3.9 | Capstone S10.L1 (b): a typechecker that mirrors `HasType` (Lane A) | 25 | LAB-3.c9: agrees with the typing goldens on fresh seeds |
| LAB-3.10 | Capstone S10.L2 (a): a Rust reference interpreter (Lane A) | 25 | LAB-3.c10: agrees with kernel-checked goldens on fresh seeds, n reported |
| LAB-3.11 | Capstone S10.L2 (b): differential run and claim cards | 20 | LAB-3.c11: cards pass claim@1 validation; [T] stamps print n |
| LAB-3.12 | `[stretch]` progress for the fragment | 25 | — |
| LAB-3.13 | `[stretch]` preservation for the fragment | 25 | — |

**Seams and erosions.** Plants SEAM-3 ("a correct step needs no observer", via CL-3.3; CL-3.3 and CL-3.4 also carry SEAM-1, since balances stay unbounded `Int`) and SEAM-6 ("`Nat` balances cannot go negative", offered as the first AST draft in S3.L1). S3.L9 shows SEAM-13, a held seam planted on the course's own assurance claim that INS-interp agrees with the Lean reference (§5.3). Cashes ER-6 in S3.L7.

**Defence (S3).** A: 12 items from GEN-find-the-witness (stuck versus error), GEN-proof-structure (step-invariant cases) and GEN-call-it (multiple true/false on edge cases), including the completion tests: a semantics independent of SQL, Rust and UI; zero, self-transfer, failed guard and overflow answered from the semantics alone. B: mutations (amounts as `Nat`; drop the resource-assignment rule; reverse a guard; let `force move` type-check; a stricter typecheck under which the statement still holds, so predicting "breaks" every time fails), predicted first. C: cases from the AUD-3.1–AUD-3.2 pair pool. D: explain back what progress and preservation buy and what they do not.

**Audit anchors.** AUD-3.1, AUD-3.2. **Drawers.** D-07 (LAB-3.c4–LAB-3.c5's rungs), D-14; D-22 (surfaced only if the learner embeds the toy syntax with `declare_syntax_cat`, which `statespace check` flags). **Production twins.** Cedar's Lean model, whose type-soundness theorem lists the runtime errors that remain possible [cedarspec]; TigerBeetle's two-phase transfers at S3.L2, a pending transfer that a later post or void resolves [tb2pc]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None. **Capstone.** S10.L1 and S10.L2 are built here.

**Budget** [D]: 11.9–23.7 h (reading: *Functional Programming in Lean* chapters by title; early PFPL chapters) against 4–8 weeks (19–38 h of stage work at 4.75 h/week); GATE-budget passes. The low estimate sits under the roadmap's lower bound because progress and preservation moved to stretch (BRIEF §7.2); the stretch stages add 0.8–2.5 h.

### 3.4 S4 Obligations (Lean, Z3) — "build a verification-condition generator"

No new tool: cvc5 is a second engine reading the SMT-LIB the learner already writes, reported through the same receipt, and Rust is the learner's own language (§12). Lab lane: Lane A (`miniplinth check`, the learner's Rust, emitting SMT-LIB to INS-z3), with a cvc5 cross-check on the Bench. Roadmap time: 3–6 weeks.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S4.L1 | bridge | Hoare triples: partial and total | state a triple for transfer and tell partial from total correctness on a fueled loop (reading: PLF Hoare, with its Rocq notation named in D-10) | KC-4.hoare-triple | INS-derivation, INS-z3 | GEN-call-it | — |
| S4.L2 | core | Weakest preconditions of assignment, by hand | derive the weakest precondition of assignments by substitution on the Derivation Board, each step checked as one Z3 validity query, without variable capture | KC-4.wp-assignment, KC-4.capture-avoiding-substitution | INS-derivation | GEN-wp-it | SP-4.2 |
| S4.L3 | bridge | Sequence and conditionals | derive weakest preconditions for sequences and guarded commands and name the four readings of a guard (a `requires` is the reject reading) | KC-4.wp-sequence-conditional | INS-derivation | GEN-wp-it | CL-4.1 |
| S4.L4 | core | From commands to obligations; invariant versus inductive | build `Inv(S) ∧ Guard(S) ∧ Step(S,S′) ∧ ¬Inv(S′)` both by weakest precondition and by forward symbolic execution, and sort four invariants into the 2×2 of invariant × inductive | KC-4.vc-shape, KC-4.symbolic-execution, KC-4.invariant-vs-inductive | INS-derivation, INS-z3 | GEN-negate-it, GEN-cti-or-bug, GEN-call-it | — |
| S4.L5 | bridge | Encoding to SMT: sorts, primes, frames | encode the obligation in SMT-LIB with primed variables and frame conditions, and revisit Int versus BitVec | KC-4.frame-condition | INS-z3 | GEN-negate-it, GEN-spec-it (template 3) | SP-4.1 |
| S4.L6 | core | The counterexample that can't happen | given a satisfiable inductive step, decide "inductive", "CTI: strengthen the invariant" or "reachable: fix the command" with a bounded reachability search, and print the bound | KC-4.cti-or-bug | INS-z3 (M-cti-workbench), INS-interp | GEN-cti-or-bug | SP-4.3 · CL-4.4, CL-4.5 |
| S4.L7 | bridge | Build the checker; prove or enforce | emit SMT-LIB from Mini-Plinth commands, decode `sat` models into states replayed in the interpreter, and decide per command whether to prove the obligation or enforce it at commit (GEN-which-stamp, template 1) | KC-4.prove-or-enforce, KC-4.vc-shape | INS-lane-a, INS-z3, INS-interp | GEN-negate-it, GEN-find-the-witness, GEN-which-stamp | CL-4.2 |
| S4.L8 | bridge | The miscompiler: is the VC generator correct? | locate a planted translation bug that makes a false theorem "proved", and tell a solver bug from a VC-generator bug | KC-4.trust-stack, KC-4.frame-condition | INS-z3 | GEN-find-the-witness, GEN-spot-the-gap | SP-4.4 |
| S4.L9 | bridge | The trust stack | stamp a solver-only result "uncertified", cross-check it with cvc5, read a solver-bug replay, and compare your obligation with Lean's experimental `vcgen` as a dated production twin | KC-4.trust-stack | INS-z3, INS-bench-smt | GEN-which-stamp, GEN-call-it | SP-4.5, SP-4.6, SP-4.7 · CL-4.3 (stretch) |

**Lab LAB-4 — `miniplinth check`; capstone S10.L3.** The template adds sequencing, `if` and integer scalars to `IR@1`, with reference semantics (W2-T08, W3-T04), because S3's v0 body is one statement and S4's completion test and CL-4.3 need both. The step relation keeps v0's encoding, in which a hold moves funds into an escrow account, so a balance is already the available balance and every witness replays in the interpreter. LAB-4's ABI fixes the SMT-LIB vocabulary that equivalence grading reads and names the conjuncts that `statespace defend` mutates (D-14; W3-T04).

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-4.1 | Run the reference checker on the guarded Transfer: "proved for the fragment" plus a premise witness | 2 | LAB-4.c1: verdict and premise witness reproduce {{run:RUN-check-fragment}} |
| LAB-4.2 | Weakest precondition of assignment emitted as SMT-LIB | 25 | LAB-4.c2: Z3 equivalence with the reference on fresh commands |
| LAB-4.3 | Conditionals and guards | 25 | LAB-4.c3: the same, for guarded commands |
| LAB-4.4 | Frame conditions | 25 | LAB-4.c4: the missing-frame mutant is caught on fresh mutants |
| LAB-4.5 | Capstone S10.L3: decode models into Mini-Plinth states and replay them in the interpreter | 25 | LAB-4.c5: every [R] replays in the interpreter |
| LAB-4.6 | CTI or reachable: output "inductive", "CTI", "REACHABLE in k" or "none within N" | 25 | LAB-4.c6: verdicts match the reference on generated invariants |
| LAB-4.7 | Miscompile your own checker by over-constraining the translation (a guard strengthened in translation, a dropped effect or an over-broad frame) so that a known-false obligation reports [P]; locate the faulty translation; keep it in `broken/` (the roadmap's adversarial exercise; a dropped frame conjunct only turns `unsat` into a false alarm, never a [P]) | 25 | LAB-4.c7: the broken build reports [P] on the fixture and the fixed build reports [R] with a witness that replays in the interpreter |
| LAB-4.8 | cvc5 cross-check on the Bench; claim cards (write stage) | 15 | LAB-4.c8: Z3 and cvc5 agree on every authored `unsat`; cards pass claim@1 validation |
| LAB-4.9 | `[stretch]` VC-generator soundness for assignment and `if`, in Lean (proof stage, `[weekend]`) | 45 | — |

**Seams and erosions.** Plants SEAM-5 ("obligations checked on the source carry to the running code", via CL-4.2). CL-4.1, CL-4.2, CL-4.4 and CL-4.5 carry SEAM-1, and CL-4.2, CL-4.4 and CL-4.5 carry SEAM-2 (on the builder's path they mint with SEAM-2 already cracked). Cashes ER-7 in S4.L9: the solver-bug replay SP-4.5 cracks SEAM-7, planted in S1, and surfaces the deferred certificates drawer D-32 in Today.

**Defence (S4).** A: 12 items from GEN-wp-it, GEN-negate-it, GEN-cti-or-bug and GEN-which-stamp, including the completion tests: derive obligations by hand for assignment and conditionals; tell solver correctness from VC-generator correctness. B: mutations of the learner's checker (drop a frame conjunct, keyed as a false alarm whose witness the interpreter refuses; a capture-prone substitution; drop the guard from the obligation, which is sound; weaken the invariant), predicted first, graded by Z3. C: cases from the AUD-4.1–AUD-4.3 pair pool (AUD-4.2 is a sound anchor). D: explain back why a satisfiable inductive step is not yet a bug.

**Audit anchors.** AUD-4.1, AUD-4.2, AUD-4.3. **Drawers.** D-02 (S4.L8), D-04 (S4.L4), D-06 (LAB-4.8), D-10, D-13, D-14 (LAB-4), D-18; deferred D-32, surfaced at ER-7. **Production twins.** Lean's experimental `vcgen`, shown after the learner's own generator {{run:RUN-lean-vcgen}}; Cedar's sound and complete symbolic compilation [cedar24]; TigerBeetle's pending-aware balance invariant at S4.L6 [tb2pc]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None. **Capstone.** S10.L3 is built here.

**Budget** [D]: 8.8–15.6 h (reading: PLF Hoare chapters, optional; the Z3 guide) against 3–6 weeks; GATE-budget passes. VC-generator soundness is stretch.

### 3.5 S5 Time (TLA+) — "explore concurrency and liveness"

New tool: TLA+ with TLC on the Bench, `tla2tools` 1.8.0 (build 2026.10.20.183001), labeled pre-release, with 1.7.4 as the text-trace fallback [X RUN-tlc-jars]; because the 1.8.0 tag is re-published [V], both jars are vendored with their MIT license in `vendor/tla2tools/` and pinned by SHA-256, never re-fetched from the tag. Met first in the tab through INS-theater (authored TLC state graphs) and INS-spectacle (Spectacle at commit 5827c22 [X RUN-spectacle]). Roadmap time: 3–6 weeks. Technical note 2 follows. The Lean keep-alive runs from here through S8, once S2 is signed off (M-lean-keep-alive).

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S5.L1 | bridge | States, actions, behaviors, stuttering | read a TLA+ spec as a set of behaviors and explain why specs allow stuttering | KC-5.behaviors-stuttering | INS-theater, INS-spectacle | GEN-trace-allowed | — |
| S5.L2 | bridge | A first spec, and the flags that change verdicts | write the read-then-write transfer in TLA+, its PlusCal form shown beside it (PlusCal's translation adds a `Terminating` action {{run:RUN-pcal-doublespend}}, so SP-5.2's deadlock appears only in the hand-written spec), run it, explain why default flags stop at a deadlock before the invariant, and count trace length in actions | KC-5.tlc-flags-matter | INS-spectacle, INS-bench-tlc | GEN-call-it | SP-5.2 |
| S5.L3 | core | The double spend: you are the scheduler | find the double-spend interleaving by hand, confirm it with TLC, make the step atomic, and explain both distinct-state counts with their argv | KC-5.interleaving-granularity | INS-theater, INS-spectacle, INS-bench-tlc | GEN-find-the-witness, GEN-trace-allowed, GEN-call-it | SP-5.1, SP-5.5 · CL-5.1 |
| S5.L4 | bridge | The holds lifecycle | model Available → Held → Captured or Released and state "a hold never resolves twice" | KC-5.holds-lifecycle | INS-spectacle | GEN-trace-allowed | — |
| S5.L5 | bridge | The hostile environment | add timeouts, duplicate replies, crashes, restarts and competing resolution as actions, and find a hold resolved twice | KC-5.hostile-environment | INS-theater, INS-spectacle | GEN-find-the-witness, GEN-call-it | SP-5.4, SP-5.7 · CL-5.2 |
| S5.L6 | core | Safety or liveness? | classify properties as safety or liveness and give one satisfying and one violating behavior for each: a finite prefix or a lasso | KC-5.safety-vs-liveness, KC-5.temporal-operators, KC-5.lasso-reading | INS-theater, INS-lasso | GEN-trace-allowed, GEN-lasso-or-not, GEN-call-it | — |
| S5.L7 | core | Fairness: what the scheduler must promise | state the weak or strong fairness that "eventually resolves" needs, read a starving lasso, and draw the fairness as a dashed assumption | KC-5.fairness, KC-5.lasso-reading | INS-lasso, INS-bench-tlc | GEN-lasso-or-not, GEN-call-it | SP-5.3 · CL-5.3 |
| S5.L8 | bridge | What "no error" means | state the bounds, constants, symmetry and state constraints of a check, and read TLC's fingerprint-collision estimate [X RUN-tlc-fingerprint] | KC-5.bounded-scope | INS-spectacle (M-telescope), INS-bench-tlc | GEN-call-it, GEN-which-stamp | SP-5.6 |
| S5.L9 | bridge | From MODEL-CHECKED ≤ N to PROVED for every N | check that `Inv` is inductive with TLC's technique at fixed constants, which earns [M] · constants and nothing more; then discharge `Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` for arbitrary N, with workers as an uninterpreted sort, in Z3 (or as a Lean proof), to earn [P] for every N; Apalache is optional and bounded the same way | KC-5.inductive-invariant-tla | INS-bench-tlc, INS-z3, INS-bench-smt, INS-bench-apalache | GEN-cti-or-bug, GEN-which-stamp | CL-5.4 |

**Lab LAB-5 — the holds spec** (TLC receipts carry their argv).

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-5.1 | Run the provided DoubleSpend configuration on the Bench; read the receipt and its argv | 2 | LAB-5.c1: the `-deadlock` run reports the violation, its distinct-state count and its 4-action trace as recorded [X RUN-tlc-doublespend] |
| LAB-5.2 | Make the critical step atomic; complete check | 25 | LAB-5.c2: no error, complete exploration, constants printed |
| LAB-5.3 | Holds lifecycle with NeverTwice | 25 | LAB-5.c3: the invariant holds on the lifecycle model |
| LAB-5.4 | Environment actions; find resolved-twice; fix it | 25 | LAB-5.c4: with crash actions on, TLC finds the unsafe variant's trace and the fix passes |
| LAB-5.5 | Liveness under stated fairness; validate the starving lasso | 25 | LAB-5.c5: EventuallyResolves holds with fairness on system actions only and crash actions off, stated as [A] (SEAM-8); the starving variant's lasso is accepted by INS-lasso |
| LAB-5.6 | Bound statement and claim cards (write stage) | 20 | LAB-5.c6: [M] cards print constants and "complete" or "partial" |
| LAB-5.7 | `[stretch]` an inductive invariant: TLC's inductive check at fixed constants ([M] · constants), then the inductive step for arbitrary N in Z3 with workers as an uninterpreted sort ([P]); Apalache optional | 25 | — |

**Seams and erosions.** Cashes ER-2 in S5.L3: the double spend SP-5.1 cracks SEAM-2. Plants SEAM-4 ("effect dispatch is atomic with the hold's commit", via CL-5.2) and SEAM-8 ("the worker keeps running under weak fairness", via CL-5.3).

**Defence (S5).** A: 12 items from GEN-trace-allowed, GEN-lasso-or-not, GEN-call-it (property kind; trace length as an interval, in actions) and GEN-which-stamp, including the completion tests: "a hold never resolves twice" versus "a hold eventually resolves"; the scheduler and environment fairness needed; why bounded exploration is not a proof for arbitrary state spaces. B: mutations of the learner's spec (split the atomic action; drop weak fairness; add a duplicate-reply action; raise the worker constant), predicted first, graded by TLC. C: cases from the AUD-5.1–AUD-5.4 pair pool. D: explain back safety versus liveness for holds.

**Audit anchors.** AUD-5.1, AUD-5.2, AUD-5.3, AUD-5.4. **Drawers.** D-09, D-15 (LAB-5, first on the builder's path), D-18. **Production twins.** TigerBeetle's two-phase transfers [tb2pc]; TLA+ By Example's authoring contract (every lesson declares `expect: success|violation`, runs in CI and labels counts first-counterexample or complete) [tlabyex]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None.

**Budget** [D]: 10.5–17.6 h (reading: *Learn TLA+* core chapters), including technical note 2, against 3–6 weeks; GATE-budget passes.

### 3.6 S6 Correspondence (PostgreSQL, Rust) — "connect semantics to PostgreSQL"

New tool: PostgreSQL 18.6 on the Bench [X RUN-pg-anomalies], multi-session through `statespace isorun` {{run:RUN-isorun-upstream}}; the executed concurrent rows came from psycopg scripts, and `pg_anomalies.py` paces its first experiment with a 0.5 s sleep, so interleaving-sensitive rows cite RUN-pg-claims. In the tab, PGlite runs PostgreSQL 18.6 on one connection (0.5.10 measured under Node [X RUN-pglite]; a browser run and the 0.5.11 pin are recorded by W0-S08 {{run:RUN-pglite-0511}}). The compilation strategy is the lesson variable (V2-07). The course supplies `statespace isorun` and the abstract-serializability checker; the learner writes the compiler, the generator, the retry policy and R(S, D). Roadmap time: 4–8 weeks.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S6.L1 | bridge | SQL is not relational algebra | predict NULL, bag and three-valued outcomes in PGlite, including a CHECK that accepts NULL and a guarded UPDATE that skips a NULL row | KC-6.sql-not-algebra, KC-6.null-guards | INS-pglite | GEN-call-it, GEN-find-the-witness | SP-6.1 |
| S6.L2 | core | Compile a transfer: the rowcount is the guard | compile Transfer so that both rowcounts must equal 1, each 0 maps to a typed error, the schema says `NOT NULL CHECK (bal >= 0)`, and the S3 self-transfer decision reaches the SQL (the guard still runs, so a self-transfer above the balance is refused as `guardFailed`, never compiled to no SQL) | KC-6.rowcount-as-guard, KC-6.null-guards | INS-pglite, INS-lane-a, INS-interp | GEN-find-the-witness, GEN-call-it | SP-6.7 |
| S6.L3 | bridge | Differential testing: what it establishes | run generated commands through the interpreter and PGlite, compare outcome classes (success, zero rows, SQLSTATE), and stamp [T] with n and generator statistics | KC-6.differential-testing | INS-lane-a, INS-pglite, INS-interp (the pinned reference, so your own interpreter cannot agree with itself) | GEN-call-it, GEN-which-stamp | CL-6.1 |
| S6.L4 | bridge | Numbers: the step the database refuses | show the model committing a transfer that PostgreSQL refuses with 22003, and choose a remedy: a bounded semantics, `Except Overflow`, or `numeric` with a stated bound | KC-6.overflow-refusal | INS-pglite, INS-z3 | GEN-call-it | SP-6.4 |
| S6.L5 | bridge | Enforced at commit | write a deferred delta check over postings with its S4 obligation and catch the NULL that SUM returns over no rows | KC-6.enforce-at-commit | INS-pglite | GEN-find-the-witness | SP-6.8 · CL-6.4 |
| S6.L6 | core | Same transfer, three verdicts: the compilation pattern decides | open with the tablespace test-out of anomaly basics (on both paths); predict, then replay on recorded PostgreSQL 18.6 histories, the outcomes of read-modify-write, the conditional UPDATE, predicate-read-then-insert and opposite-order moves | KC-6.compilation-pattern, KC-6.anomaly-isolation | INS-history, INS-pglite | GEN-anomaly-id, GEN-call-it | SP-6.2, SP-6.3, SP-6.5, SP-6.6 · CL-6.2 |
| S6.L7 | bridge | SERIALIZABLE and retries | retry whole commands on 40001 and 40P01 [X RUN-pg-anomalies, RUN-pg-claims] (23505 or 23P01 only when transient: a [D] policy, whose SQLSTATE behavior under SERIALIZABLE is {{run:RUN-pg-catalog}}), log attempts by SQLSTATE, and stamp termination [A] (GEN-which-stamp, template 1) | KC-6.serializable-retries | INS-history | GEN-anomaly-id, GEN-which-stamp | CL-6.5 |
| S6.L8 | core | The refinement relation R(S, D) | define R(S, D), check the simulation square for each committed transaction, and accept a concurrent history when some serial order, replayed through the reference semantics, reproduces every committed output | KC-6.refinement-relation, KC-6.abstract-serializability | INS-history, INS-interp | GEN-anomaly-id, GEN-find-the-witness | CL-6.3 |
| S6.L9 | bridge | Postgres semantics is an assumption | write the [T] card honestly and list its [A] clauses (every writer SERIALIZABLE, PostgreSQL behaves as documented, nothing reads a replica), with the Jepsen PostgreSQL 12.3 report as the dated example [jepsenpg] | KC-6.db-as-assumption | INS-history | GEN-which-stamp, GEN-call-it | SP-6.9, SP-6.10, SP-6.11 |

**Executed outcomes behind S6.L6** on PostgreSQL 18.6 [X RUN-pg-anomalies, RUN-pg-claims]: application read-modify-write at READ COMMITTED spends 160 from 100, and at REPEATABLE READ the second writer gets 40001; the conditional UPDATE at READ COMMITTED re-evaluates its WHERE clause, updates 0 rows and loses nothing; predicate-read-then-insert over holds commits at READ COMMITTED and REPEATABLE READ (160 held against 100) and gets 40001 at SERIALIZABLE; opposite-order moves get 40P01. Specimens name their compilation pattern, never just the isolation level.

**Lab LAB-6 — pg-refinement; capstone S10.L4.**

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-6.1 | `statespace isorun` replays the provided read-modify-write history on PostgreSQL 18.6 | 2 | LAB-6.c1: outcome as recorded [X RUN-pg-claims] |
| LAB-6.2 | Compiler: Transfer → SQL with rowcount guards (Lane A on PGlite) | 25 | LAB-6.c2: outcome classes match the interpreter on fresh seeds |
| LAB-6.3 | Typed errors; the self-transfer decision in SQL | 25 | LAB-6.c3: the CASE-compilation mutant (SP-6.7) is caught |
| LAB-6.4 | Differential harness: your generator and outcome classes | 25 | LAB-6.c4: the differential suite runs on PostgreSQL 18.6 on the Bench (and on PGlite in the tab); the receipt names both engines, n and generator statistics |
| LAB-6.5 | Reproduce the lost update, write skew and 40P01 with `isorun` | 25 | LAB-6.c5: SQLSTATE classes match the catalog rows |
| LAB-6.6 | Retry policy for 40001 and 40P01 with attempt logs | 25 | LAB-6.c6: attempts logged by SQLSTATE; 22003 is never retried |
| LAB-6.7 | Your R(S, D) with the abstract-serializability check on recorded histories | 25 | LAB-6.c7: classifies the history fixture set as the reference does |
| LAB-6.8 | Capstone S10.L4: a transaction runtime wired to your compiler | 25 | LAB-6.c8: the S6 differential suite passes through the runtime, and the receipt names the deferred reconciliation triggers that re-stamp CL-6.4 |
| LAB-6.9 | Claim cards and their [A] clauses (write stage) | 15 | LAB-6.c9: cards pass claim@1 validation |

**Seams and erosions.** Cashes ER-1 in S6.L4: the 22003 refusal SP-6.4 cracks SEAM-1's correspondence (the model takes a step the database refuses; conservation is untouched) and surfaces the deferred Kani drawer D-30 in Today. Plants SEAM-9 (S6.L9, carried per clause: "PostgreSQL behaves as documented" by CL-6.2 and CL-6.3; "every writer is SERIALIZABLE" and "nothing reads a replica" by CL-6.3), SEAM-11 ("one database's agreement stands for the compiler", S6.L3, via CL-6.1) and SEAM-14 (PostgreSQL 18.6's SERIALIZABLE for committed SERIALIZABLE transactions; planted in S6.L6 and carried by CL-6.3, since CL-6.2 is a READ COMMITTED claim; held, tested nightly).

**Defence (S6).** A: 12 items from GEN-anomaly-id, GEN-call-it, GEN-which-stamp and GEN-find-the-witness, including the completion tests: what differential tests establish and what they cannot; SQL mismatches (NULL, bags, numeric overflow, serialization failures). B: mutations of the learner's compiler and runtime (read-modify-write compilation; drop the rowcount check; retry only 40001; a READ COMMITTED pool), predicted first, graded on recorded PostgreSQL 18.6 histories. C: cases from the AUD-6.1–AUD-6.3 pair pool. D: explain back R(S, D) and what one simulation step checks.

**Audit anchors.** AUD-6.1, AUD-6.2, AUD-6.3. **Drawers.** D-11, D-14 (LAB-6), D-15, D-21 (S6.L8), D-23 (builder's path only); deferred D-30, surfaced at ER-1. **Production twins.** PostgreSQL's own isolationtester specs on the REL_18_STABLE branch, the format the course's catalog copies [dl §2]; Cedar's differential random testing [cedarspec]; Hermitage [dl §2]; TigerBeetle's `create_transfers` results at S6.L2 and S6.L4; Elle at S6.L8; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** tablespace T4 (concurrency) at S6.L5–S6.L7, with the self-contained prerequisite card D-11; byzantine's linearizability checker as the model for the serial-order search at S6.L8; a light kernelspace strand at S6.L9 that re-stamps kernelspace pool conformance as [T] (n). **Capstone.** S10.L4 is built here.

**Budget** [D]: 9.2–15.9 h (reading: the PostgreSQL 18 transaction-isolation chapter; Hermitage) against 4–8 weeks; GATE-budget passes.

### 3.7 S7 Secrecy (Datalog, Z3, PostgreSQL RLS) — "prove access-control and information-flow claims"

New tool: Soufflé on the Bench {{run:RUN-souffle-version}}; in the tab, Z3 `Fixedpoint` inside the existing Pyodide worker (stratified negation measured under Pyodide in a Node harness [X RUN-z3-fixedpoint]) if W0-S03 passes, otherwise a TypeScript evaluator differential-tested against Soufflé. The roadmap's "Soufflé or Alloy" is honored with Alloy as a drawer (D-16). Row-level security runs on PostgreSQL 18.6 on the Bench; PGlite RLS waits on W0-S08. Roadmap time: 4–8 weeks. Technical note 3 follows.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S7.L1 | bridge | Access models in the roadmap's nouns | model users, teams, roles, documents and sharing, and state the read policy: a user may see a document when they are a team member or it is explicitly shared | KC-7.access-models | INS-datalog | GEN-call-it | — |
| S7.L2 | bridge | Policy as Datalog, with derivations | write the read rule as Datalog, generate the access matrix, and explain one access by its derivation | KC-7.policy-as-datalog | INS-datalog | GEN-spec-it, GEN-find-the-witness | CL-7.1 |
| S7.L3 | bridge | Checking policies: distinguishing requests | state "no cross-tenant read without an explicit share" as a query, insist on a distinguishing request, watch a quantified hierarchy return `unknown` until grounding removes it, and read the small-scope claim as Jackson's hypothesis | KC-7.policy-checking, KC-7.small-scope | INS-z3 (M-spec-duel), INS-datalog | GEN-spec-it, GEN-call-it | SP-7.7 · CL-7.2 |
| S7.L4 | core | Row-level security as enforcement | compile the read rule to `CREATE POLICY`, differential-test it under `SET ROLE` against the Datalog matrix, and find the owner bypass (with an owner-connection probe, since `SET ROLE` alone cannot show it), the `FORCE` fix and the covert channel | KC-7.rls-semantics, KC-7.side-channels | INS-pglite, INS-history, INS-bench-pg | GEN-find-the-witness | SP-7.4, SP-7.5 · CL-7.4 |
| S7.L5 | core | Enforcement is not noninterference | tell a check on every read from no influence across executions, using a pair of executions as the witness | KC-7.enforcement-vs-ni, KC-7.hyperproperty | INS-pairs | GEN-leaks-to-observer, GEN-call-it | — |
| S7.L6 | core | Observers and equivalence | define the observer and the equivalence relation, construct paired states that differ only in another tenant's private data, and check them by self-composition through your own VC generator | KC-7.observer-equivalence, KC-7.hyperproperty | INS-pairs, INS-z3 | GEN-leaks-to-observer, GEN-spec-it (template 1) | CL-7.3 |
| S7.L7 | bridge | The leaky shared document, and declassifying on purpose | find the roadmap's deliberate leak, declassify on purpose by stating what, who, where and when, and refute the blanket "no tenant ever observes any change" claim with a legitimate feature | KC-7.declassification, KC-7.side-channels | INS-pairs, INS-interp, INS-z3 | GEN-leaks-to-observer | SP-7.1, SP-7.2 |
| S7.L8 | bridge | Revocation and the past; the new enemy | explain why revocation cannot unsee delivered information, state it temporally, and show a stale-replica read after an ACL change [zanzibar] | KC-7.revocation-past | INS-interp, INS-pairs | GEN-trace-allowed, GEN-call-it | SP-7.3, SP-7.6 |

**Lab LAB-7 — authz-flow.**

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-7.1 | Run the reference policy in Soufflé and in the tab engine; compare relations | 2 | LAB-7.c1: equal relations {{run:RUN-fixedpoint-equal}} |
| LAB-7.2 | Your read policy, with derivations | 25 | LAB-7.c2: matches the reference matrix on fresh generated worlds |
| LAB-7.3 | "No cross-tenant read without an explicit share" with a distinguishing request | 25 | LAB-7.c3: verdicts match the reference; a non-vacuity witness is present |
| LAB-7.4 | RLS policies and the `SET ROLE` differential on PostgreSQL 18.6 | 25 | LAB-7.c4: no disagreement with the matrix on fresh worlds; an owner-connection probe catches the owner bypass |
| LAB-7.5 | A paired-state check through your own VC generator for one API view | 25 | LAB-7.c5: finds the planted leak; the fix passes modulo the declassified fields |
| LAB-7.6 | Revocation, stated temporally: "after revocation, no new read succeeds", beside its refuted counterpart "revocation removes what was already read" (Lane A over interpreter traces) | 25 | LAB-7.c6: the first statement holds on fresh generated traces with the bound printed; the counterpart is refuted by a trace in which data delivered before revocation stays in the observer's view, replayed by the interpreter |
| LAB-7.7 | Leak fix, declassification record (what, who, where, when) and claim cards (write stage) | 20 | LAB-7.c7: record complete; cards pass claim@1 validation |
| LAB-7.8 | `[stretch]` an Alloy model (D-16) or query containment (D-17) | 25 | — |

**Seams and erosions.** Cashes ER-3 in S7.L7: the leaky field SP-7.1 cracks SEAM-3, and CL-3.3's requirement-fit gains a [N] line for confidentiality. Cashes ER-9 in S7.L8: the stale-replica read SP-7.6 cracks only SEAM-9's clause "nothing reads a replica", so CL-6.3 cracks and CL-6.2 stands. Plants SEAM-10 ("the observer sees only the response body", meaning the view's returned value with its error codes, via CL-7.3).

**Defence (S7).** A: 12 items from GEN-spec-it, GEN-leaks-to-observer and GEN-call-it, including the completion tests: formulate the observer and the equivalence relation; say which information is intentionally declassified and why the blanket claim is false. B: mutations of the learner's policy and view (widen the observer; drop a declassification; write `in` where overlap was meant; drop `FORCE`), predicted first. C: cases from the AUD-7.1–AUD-7.2 pair pool. D: explain back enforcement versus noninterference.

**Audit anchors.** AUD-7.1, AUD-7.2. **Drawers.** D-10 (*Security Foundations* is written in Rocq), D-16, D-17, D-20. **Production twins.** Cedar's three evidence layers: Lean meta-theorems, a per-change SMT diff, and differential random testing of the enforcement [cedar24]; Zanzibar's "new enemy" [zanzibar]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** byzantine's consistency material at S7.L8 (the new enemy as an ordering problem), with prerequisite card D-21.

**Budget** [D]: 9.7–17.0 h (reading: the Soufflé tutorial; selected *Security Foundations* chapters; Sabelfeld and Sands on declassification), including technical note 3, against 4–8 weeks; GATE-budget passes. RLS is the stage's third core lesson (V2-23); policy as Datalog is a bridge because the Soufflé tutorial already covers it.

### 3.8 S8 Effects (TLA+, Rust) — "model external effects and crash recovery"

No new tool (TLA+ and Rust return). Lab lane: Lane A (the learner's sans-I/O outbox machine and simulator, graded in the tab on seeded faults) plus Bench trace validation with TLC. Spectacle serves S8.L2–S8.L4 and S8.L7 only if W0-S04 covers the S8 specs (RUN-spectacle-s5s8); otherwise INS-theater with recorded runs stands in. LAB-8.3 runs after LAB-8.4 and LAB-8.5 on both published paths, because it needs S8.L5. Roadmap time: 3–6 weeks.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S8.L1 | bridge | Commits are not sends | separate recording intent from performing an effect by judging about five outbox scenarios true or false: which guarantees hold at the external service and which do not (GEN-call-it, template 4) | KC-8.commit-not-send | INS-theater | GEN-call-it | — |
| S8.L2 | bridge | The outbox, modeled | model Command → Outbox → Worker → External → Ack as a TLA+ machine | KC-8.outbox-chain | INS-spectacle, INS-theater | GEN-trace-allowed | — |
| S8.L3 | core | Every crash window | inject a crash between every two steps, plus duplicated and delayed replies, and name what each window permits | KC-8.crash-windows, KC-8.at-least-once | INS-theater, INS-spectacle, INS-bench-tlc | GEN-find-the-witness, GEN-trace-allowed | SP-8.1, SP-8.2 · CL-8.1 |
| S8.L4 | bridge | Replies are untrusted input | validate replies (status, charge ≤ hold, late replies rejected with the loss stated), write inbound idempotency keys in the same SERIALIZABLE transaction, and resolve an ambiguous commit by key | KC-8.untrusted-replies, KC-8.idempotency-keys | INS-spectacle, INS-pglite, INS-history (a recorded same-key SERIALIZABLE race) | GEN-find-the-witness | SP-8.3 · CL-8.2 |
| S8.L5 | bridge | Progress needs recovery | state which liveness holds only if the service eventually recovers and the worker is weakly fair, and show a check that passes only with crashes switched off | KC-8.progress-needs-recovery | INS-lasso, INS-bench-tlc | GEN-lasso-or-not | SP-8.6 · CL-8.4, CL-8.5 |
| S8.L6 | core | Deterministic simulation and trace validation | replay seeded fault schedules through your simulator and validate its traces against your spec with TLC, catching an ack-before-durable drift that every test missed | KC-8.deterministic-simulation, KC-8.trace-validation | INS-sim, INS-lane-a, INS-bench-tlc | GEN-find-the-witness, GEN-trace-allowed | SP-8.4 · CL-8.3 |
| S8.L7 | bridge | Exactly-once is a pair; the provider's horizon | write the effect claim as yours plus the provider's, with the [A] seam "every copy of every attempt is delivered or dropped before the provider can forget the key", using Stripe's documented key pruning as the dated example [stripeidem] | KC-8.provider-horizon, KC-8.at-least-once | INS-spectacle | GEN-call-it, GEN-which-stamp | SP-8.5 · CL-8.2 (its provider-horizon clause) |

**Lab LAB-8 — effects-sim; capstone S10.L5.** The course supplies `statespace trace validate` (the trace-module method of Cirstea et al. and CCF, reading NDJSON through TLC's bundled JSON module {{run:RUN-trace-validate-spike}}) and the NDJSON trace schema; the learner writes the machine, the fault plan and the spec.

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-8.1 | Run the reference simulator on seed 1; see its NDJSON trace accepted by TLC | 2 | LAB-8.c1: trace accepted {{run:RUN-tlc-trace-validation}} |
| LAB-8.2 | The outbox spec with crash, duplicate and delay actions; safety | 25 | LAB-8.c2: TLC finds the double charge on the unsafe variant; "no committed command's outbox intent is lost before acknowledgement" holds with crashes on, exploration complete and constants printed |
| LAB-8.3 | Liveness under stated fairness and recovery: "every committed command's effect is eventually dispatched" and "every command is eventually acknowledged" (the roadmap's "which progress guarantees require eventual service recovery") | 25 | LAB-8.c3: both properties hold with weak fairness on Worker and eventual recovery assumed; with recovery not assumed TLC returns a lasso, validated by INS-lasso |
| LAB-8.4 | A sans-I/O outbox machine under seeded faults (Lane A) | 25 | LAB-8.c4: safety invariants hold on fresh fault schedules |
| LAB-8.5 | Inbound keys (`ON CONFLICT` with `uuidv7()` {{run:RUN-pglite-inbound-key}}) and reply validation | 25 | LAB-8.c5: duplicate and late replies are rejected as specified |
| LAB-8.6 | NDJSON traces validated by TLC over n seeds | 25 | LAB-8.c6: [T] (n seeds); the ack-before-durable mutant is rejected |
| LAB-8.7 | Capstone S10.L5: the differential plus simulation suite; failures become specimens | 25 | LAB-8.c7: seeds recorded; every failure mounted as a specimen |
| LAB-8.8 | Claim cards with the provider horizon (write stage) | 15 | LAB-8.c8: cards carry the [A] horizon and pass claim@1 validation |
| LAB-8.9 | `[stretch]` the key TTL and replayed 500s in the spec | 25 | — |

**Seams and erosions.** Cashes ER-4 in S8.L3: the double charge SP-8.1 cracks SEAM-4. Cashes ER-8 in S8.L5: SP-8.6 cracks SEAM-8. Plants SEAM-12 ("every copy of every attempt is delivered or dropped before the provider can forget the key", via CL-8.2's provider-horizon clause, written in LAB-8.8; pruning after the worker's acknowledgement still double-charges when an earlier copy arrives late {{run:RUN-tlc-key-ttl}}), which ER-12 cashes in the Clearinghouse once SEAM-12 is the oldest open erodible seam, after S9 on both published paths (§5.4).

**Defence (S8).** A: 12 items from GEN-find-the-witness, GEN-trace-allowed, GEN-lasso-or-not and GEN-which-stamp, including the completion tests: every crash window; why at-least-once delivery can duplicate calls; when the provider's idempotency joins the trusted assumptions. B: mutations of the learner's machine and spec (a fresh key per retry; ack before the durable write; drop reply validation; switch crash actions off in the liveness check), predicted first, graded by TLC and trace validation. C: cases from the AUD-8.1–AUD-8.2 pair pool. D: explain back every crash window.

**Audit anchors.** AUD-8.1, AUD-8.2. **Drawers.** D-09 (S8.L2), D-12, D-14 (LAB-8.4), D-19, D-21. **Production twins.** CCF's TLA+ trace validation (NSDI 2025) and TigerBeetle's VOPR simulator [dl §2]; TigerBeetle's "Reliable Transaction Submission" page at S8.L3; Stripe's idempotency documentation as a dated twin [stripeidem]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** tablespace T3 (durability) at S8.L3 with prerequisite card D-12; byzantine's deterministic network harness at S8.L6 with prerequisite card D-21. **Capstone.** S10.L5 is built here.

**Budget** [D]: 7.4–13.2 h (reading: advanced *Learn TLA+* examples; the trace-validation paper) against 3–6 weeks; GATE-budget passes, 0.3 h above half the roadmap's lower bound, so cutting both S8.L2 and S8.L4 (§14 rows 9 and 16) would trip its lower-bound warning. The roadmap's "prove safety properties over the model" is met as [M] · constants · complete (§12).

### 3.9 S9 Preservation (Lean, Rust) — "verify a compiler transformation"

No new tool. Two halves, each closed by a mini-Defence: half A (S9.L1–S9.L4 with LAB-9.1–LAB-9.3: warm-up, translation validation as the first win, IR, observations) and half B (S9.L5–S9.L9 with LAB-9.4–LAB-9.12: simulation, the proof, the bad optimization, SQL validation and the trusted computing base). A mini-Defence samples only its own half. Lab lanes: Bench (Lean) and Lane A (the SQL validator). Roadmap time: 6–10 weeks. Technical note 4 follows.

| ID | Tier | Title | Observable objective | KCs | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|
| S9.L1 | bridge | A stack machine, proved | prove `exec (comp a) s stk = aval a s :: stk` for arithmetic expressions, ported from Isabelle's HOL-IMP `ASM` theory [holimp] | KC-9.stack-machine-correctness | INS-goal-replay, INS-bench-lean | GEN-proof-structure | CL-9.1 |
| S9.L2 | bridge | Translation validation first | check each compiled output instead of the compiler, and stamp the result with its bound or instance count | KC-9.translation-validation | INS-lane-a, INS-interp | GEN-find-the-witness, GEN-which-stamp | — |
| S9.L3 | bridge | A target IR, and compiling into it | define an IR of reads, writes, asserts and aborts, state its determinism, and compile the Mini-Plinth subset into it | KC-9.target-ir | INS-interp | GEN-find-the-witness | — |
| S9.L4 | core | What is observable | choose the observations (aborts included), define observational equivalence, and state the preservation theorem in CompCert's template [compcert] | KC-9.observations | INS-pairs, INS-goal-replay | GEN-leaks-to-observer, GEN-call-it | SP-9.3 |
| S9.L5 | core | Forward, backward, bisimulation | draw the simulation diagram for the fragment and say when forward simulation suffices (a deterministic target) | KC-9.forward-simulation, KC-9.simulation-kinds | INS-goal-replay (fading) | GEN-proof-structure, GEN-call-it | — |
| S9.L6 | core | Prove preservation for the fragment | prove, case by case, that each successful source step corresponds to a target execution with the same observations | KC-9.preservation-proof | INS-goal-replay, INS-bench-lean | GEN-proof-structure | CL-9.2 |
| S9.L7 | bridge | The bad optimization | hoist a write above its guard, watch the proof break, and extract the counterexample | KC-9.bad-optimization | INS-interp, INS-bench-lean | GEN-find-the-witness | SP-9.1 |
| S9.L8 | bridge | Validating SQL: containment, provers, refutation | validate generated SQL per command, replay every counterexample through both semantics, and stamp "results match on one database" as [T] (1 instance) | KC-9.sql-equivalence | INS-pglite, INS-lane-a | GEN-find-the-witness, GEN-which-stamp | SP-9.2, SP-9.4 · CL-9.3 |
| S9.L9 | bridge | Draw the trusted computing base | mark each component of the executable system (parser, typechecker, checker, solver, compiler, runtime, database) as proved, validated per run, tested or trusted, against your own claim graph (GEN-which-stamp, template 1), and sort about five claims into the three that stay apart: the command preserves invariants, the compiler preserves meaning, the runtime follows the target (GEN-call-it, template 4) | KC-9.tcb, KC-9.three-claims | — (SCR-claims rests-on view) | GEN-which-stamp, GEN-call-it | SP-9.5, SP-9.6 |

**Lab LAB-9 — compiler, preservation proof and SQL validator.** The template supplies the IR's syntax and the source semantics (the learner's own from LAB-3, or the pinned reference). CL-9.2 is minted after LAB-9.6 as "PROVED modulo the remaining cases", each case [A], and updated as each case closes, so the preservation stages never go two weeks without a claim update.

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-9.1 | Run the reference translation validator on one compiled command: it accepts the honest output and rejects one that writes to the wrong account (half A; the first win, V2-29; the hoisted write stays unseen until ER-5) | 2 | LAB-9.c1: both verdicts reproduce {{run:RUN-tv-reference}} |
| LAB-9.2 | Stack-machine compiler correctness, yourself (proof stage, `[weekend]`) | 45 | LAB-9.c2: comparator accepts against the pinned statement; the reference proof is {{run:RUN-lean-stack-machine}} |
| LAB-9.3 | IR and compiler for the subset (half A) | 25 | LAB-9.c3: IR goldens pass by `decide`; comparator accepts the determinism lemma `exec_deterministic`, so no `sorryAx` reaches the receipt |
| LAB-9.4 | Observations and the simulation relation, frozen as learner modules (half B) | 25 | LAB-9.c4: comparator accepts the adequacy theorems of a course challenge that imports the frozen modules (comparator requires every definition a pinned statement uses to match between challenge and solution [X RUN-lean-comparator], so no challenge can pin the learner's own `obs` and R) |
| LAB-9.5 | Preservation lemma: compiled expressions evaluate as the source does (proof stage, `[weekend]`) | 45 | LAB-9.c5: comparator accepts the lemma |
| LAB-9.6 | Preservation: the posting case, postings compiled to writes (proof stage, `[weekend]`) | 45 | LAB-9.c6: accepted |
| LAB-9.7 | Preservation: the guard case, a failing guard included (proof stage, `[weekend]`) | 45 | LAB-9.c7: accepted |
| LAB-9.8 | Preservation: the sequence case (proof stage, `[weekend]`) | 45 | LAB-9.c8: accepted |
| LAB-9.9 | Preservation: the abort case, with aborts observable (proof stage, `[weekend]`) | 45 | LAB-9.c9: accepted |
| LAB-9.10 | Preservation: the assembled theorem (proof stage, `[weekend]`) | 45 | LAB-9.c10: accepted; axioms within `comparator.json` |
| LAB-9.11 | A SQL validator (Lane A) on generated plans | 25 | LAB-9.c11: rejects the shape-only mutant; replays every counterexample through both semantics |
| LAB-9.12 | The bad optimization kept as a specimen; the TCB drawn; claim cards (write stage) | 20 | LAB-9.c12: the specimen replays; cards pass claim@1 validation |

**Seams and erosions.** Cashes ER-5 in S9.L7 (SP-9.1 cracks SEAM-5), ER-11 in S9.L8 (SP-9.4 cracks SEAM-11) and ER-10 in S9.L9 (SP-9.6, a correct compiler with leaky output, cracks SEAM-10).

**Defence (S9), as two mini-Defences.** A: 10 items per half from GEN-proof-structure, GEN-find-the-witness, GEN-which-stamp and GEN-leaks-to-observer, including the completion test: describe the refinement relation, its abstraction boundaries, and which pieces of the executable system remain unverified. B: four mutations per half, predicted first; half A's include replacing `decide` with `native_decide` in an IR golden of LAB-9.3, a closed goal, predicting a green build, a `_native` axiom in `#print axioms` and rejection by `statespace check` [X RUN-lean-axioms]; half B's include making aborts unobservable, hoisting a write and validating shape only. C: four cases per half, half A from AUD-9.1's pairs and half B from AUD-9.2's, each topped up from earlier stages' anchor families because one family per half is thin. D: explain back the three claims and why they stay apart.

**Audit anchors.** AUD-9.1, AUD-9.2. **Drawers.** D-14 (LAB-9.11), D-17 (S9.L8), D-22; deferred D-31 (its trigger appears in S9.L9). **Production twins.** CompCert's preservation theorem and its list of unverified parts [compcert]; Alive2 as bounded translation validation [dl §2]; Cedar [cedarspec]; Isabelle's HOL-IMP at S9.L1 [holimp]; QED or SQLSolver at S9.L8; AuthV2's reliance on its DafnyLite compiler at S9.L9 [authv2]; pins in {{run:RUN-twin-pins}}. **Sibling bridges.** None.

**Budget** [D]: 16.1–33.8 h (reading: CompCert manual chapter 1; HOL-IMP `ASM`), including technical note 4 and two mini-Defences (2.3–2.8 h by the §3.0 Defence pattern), against 6–10 weeks (28.5–47.5 h of stage work at 4.75 h/week); GATE-budget passes. Preservation is six weekend proof stages, one per lemma or case, rather than three 25-minute stages.

### 3.10 S10 Assembly — "assemble the Core"

Seven capstone steps; five are grown inside earlier labs, and the final assembly is capped at six weeks. Steps use lesson IDs with tier `[step]`; they are not lessons, are not counted among the 76, and GATE-links excludes `[step]` IDs from every lesson count. S10.L6 and S10.L7 open with step briefings, kept outside lesson counts, that carry the KC-10.* KCs' prequestion, call and exit item (GATE-kc reads "first lesson or step briefing").

| ID | Tier | Title | Observable objective | KCs | Built in · gate | Instruments | Generators | Specimens · claims |
|---|---|---|---|---|---|---|---|---|
| S10.L1 | step | Parser and typechecker | parse and typecheck the roadmap's toy syntax into the JSON IR | (S3 KCs) | LAB-3.8–LAB-3.9, after S3 · golden tests against the S3 IR | INS-lane-a | — | — |
| S10.L2 | step | Reference interpreter as oracle | run the IR with the same results as the kernel-checked goldens | (S3 KCs) | LAB-3.10–LAB-3.11, after S3 · [T] (n goldens) | INS-lane-a, INS-interp | — | CL-3.5 |
| S10.L3 | step | SMT obligations with counterexample replay | discharge obligations and replay every [R] in the interpreter | (S4 KCs) | LAB-4.5, after S4 · every [R] replays | INS-lane-a, INS-z3 | — | CL-4.2 |
| S10.L4 | step | Postgres compiler and runtime with retries | run compiled commands on PostgreSQL 18.6 with whole-command retries | (S6 KCs) | LAB-6.8, after S6 · the S6 differential suite passes | INS-lane-a, INS-bench-pg | — | CL-6.1, CL-6.2 |
| S10.L5 | step | Systematic testing | run seeded differential and fault-injection suites; failures become specimens | (S8 KCs) | LAB-8.7, after S8 · seeds recorded | INS-sim, INS-bench-tlc | — | CL-8.3 |
| S10.L6 | step | The demonstration | take a mutation-generated agent proposal (a plausible transfer or authorization command), exhibit a violation or prove a restricted obligation with your checker, and run the corrected command on Postgres | KC-10.agent-proposal-triage | LAB-10.4–LAB-10.7 · recorded end to end | INS-lane-a, INS-z3, INS-bench-pg, INS-interp, INS-receipt | GEN-spot-the-gap, GEN-which-stamp | SP-10.1 · CL-10.1 |
| S10.L7 | step | Publish | publish the operational semantics, theorem statements, specimens, tool versions and known limitations, with the report exported from the claim graph | KC-10.claim-graph-report, KC-10.defeater-log, KC-10.publish-limitations | LAB-10.8–LAB-10.9 · the Defence over the report | INS-receipt | GEN-which-stamp | CL-10.2 |

**Lab LAB-10 — Core assembly** (the final ≤6 weeks). Agent proposals come from the mutation generator, each sound with a seeded probability of 30–60%; no language model runs at grade time.

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-10.1 | Run the reference pipeline on the provided agent proposal | 2 | LAB-10.c1: the reference report skeleton reproduces {{run:RUN-core-demo}} |
| LAB-10.2 | Wire your parser, checker and interpreter | 25 | LAB-10.c2: end-to-end smoke test on fixture commands |
| LAB-10.3 | Wire your compiler, runtime and simulator | 25 | LAB-10.c3: the same fixtures pass through PostgreSQL 18.6 |
| LAB-10.4 | Intake a mutation-generated agent proposal | 25 | LAB-10.c4: the proposal parses; its claim renders as quoted UNREVIEWED text |
| LAB-10.5 | Exhibit the violation, or prove the restricted obligation | 25 | LAB-10.c5: the [R] replays, or [P] holds for the stated fragment with its premise witness |
| LAB-10.6 | Run the corrected command on PostgreSQL 18.6 with systematic tests | 25 | LAB-10.c6: differential and simulation suites pass; n recorded |
| LAB-10.7 | Record the demonstration end to end | 25 | LAB-10.c7: the recording cites run ids and statement hashes |
| LAB-10.8 | Export the report from the claim graph (a multi-pass write stage: nine passes, each within a weekday or weekend window [D]) | 325 (9 passes) | LAB-10.c8: the report validates: sections for proved, model-checked, tested, enforced, configured, assumed, not covered and unknown; the specimens; a checker matrix; statement hashes; budgets and advisories; a defeater log as m of n |
| LAB-10.9 | Publish the bundle (write stage) | 25 | LAB-10.c9: `statespace check` finds every link resolving and every statement hash matching in the bundle |
| LAB-10.10 | `[stretch]` a public upstream counterexample: an issue or PR plus a witness any browser replays | 25 | — |

**Seams and erosions.** ER-12 fires in the Clearinghouse in the first week in which both its endpoints exist and SEAM-12 is the learner's oldest open erodible seam (the held seams SEAM-13–SEAM-15 never crack and are excluded). Its second endpoint is that Clearinghouse week, in which the learner's own outbox machine meets a fresh re-find of SP-8.5's class; meeting SP-8.5 in S8.L7 does not cash it, so the forecast stays a prediction. On both published paths that is after S9, once ER-5, ER-10 and ER-11 have cracked the older SEAM-5, SEAM-10 and SEAM-11. The report lists every open seam as [A] and every crack in its erosion log. An optional private overlay runs the same checks on "your system" locally; nothing from it enters the repo (V2-28).

**Defence (S10), over the report.** A: 12 probes sampled across all seven outcome families of §2.2, with one item each on the threshold KCs KC-8.commit-not-send and KC-8.at-least-once. B: one seeded mutation per pipeline component of the learner's own Core, seven in all (the logged exception to §3.0's four to six). C: four cases, one of them harvested from the learner's own repo by `statespace audit harvest`, or generated by `statespace audit gen` when no agent commit touched a statement. D: explain back what the report establishes and what it does not.

**Audit anchors.** None new; `statespace audit` turns the learner's repo into the Audit Desk (M-audit-desk). **Drawers.** D-06 (LAB-10.8), D-14 and D-15 (LAB-10.2–LAB-10.3); the deferred drawers D-30–D-40, each surfaced by its trigger. **Production twins.** Cedar's release gate: no release unless the model, proofs and differential tests are up to date [cedarblog]. **Sibling bridges.** None.

**Budget** [D]: 12.2–22.7 h, mostly writing the report and publication (LAB-10.8's nine passes counted at their 325 nominal minutes) plus the two step briefings, against the six-week cap on final assembly; GATE-budget passes.

### 3.11 Counts and budget summary

**Counts.** 76 lessons (26 core, 50 bridge) plus Boot; 7 capstone steps; 10 labs with 91 stages (OD-15): LAB-1–LAB-9 have 81 (74 planned and 7 `[stretch]`; 7 of the planned stages build capstone steps) and the capstone LAB-10 has 10 (9 planned, 1 `[stretch]`); 105 KCs (26 threshold); 69 specimens; 43 claim templates; 15 seams; 12 erosion events; 25 audit anchors; 23 just-in-time and 11 deferred drawers.

Weeks use the stage-work hours left after the planned Keep block (§3.0): 4.75 h in a 6 h week and 8.25 h in a 10 h week.

| Stage | Read | Lessons | Build | Write | Defence | Total (h) | Weeks at 6 h/wk | Weeks at 10 h/wk | Roadmap | GATE-budget |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 0.5–1.0 | 2.2–3.4 | 1.5–2.9 | 0.4–0.8 | 0.75–1.25 | 5.3–9.4 | 1.1–2.0 | 0.6–1.1 | 2–4 sessions (≤ 10 h) | pass |
| S2 | 3.0–5.0 | 4.4–6.8 | 5.4–12.1 | 1.8–3.0 | 1.0–1.5 | 15.6–28.4 | 3.3–6.0 | 1.9–3.4 | 3–6 wk | pass |
| S3 | 2.0–4.0 | 3.5–5.5 | 5.0–12.0 | 0.3–0.7 | 1.0–1.5 | 11.9–23.7 | 2.5–5.0 | 1.4–2.9 | 4–8 wk | pass |
| S4 | 1.5–3.0 | 3.5–5.5 | 2.5–5.1 | 0.25–0.5 | 1.0–1.5 | 8.8–15.6 | 1.9–3.3 | 1.1–1.9 | 3–6 wk | pass |
| S5 | 2.5–4.0 | 3.5–5.5 | 1.7–3.4 | 1.8–3.2 | 1.0–1.5 | 10.5–17.6 | 2.2–3.7 | 1.3–2.1 | 3–6 wk | pass |
| S6 | 1.5–2.5 | 3.5–5.5 | 3.0–5.9 | 0.25–0.5 | 1.0–1.5 | 9.2–15.9 | 1.9–3.3 | 1.1–1.9 | 4–8 wk | pass |
| S7 | 1.5–3.0 | 3.25–5.1 | 2.1–4.2 | 1.8–3.2 | 1.0–1.5 | 9.7–17.0 | 2.0–3.6 | 1.2–2.1 | 4–8 wk | pass |
| S8 | 1.0–2.0 | 2.6–4.1 | 2.5–5.1 | 0.25–0.5 | 1.0–1.5 | 7.4–13.2 | 1.6–2.8 | 0.9–1.6 | 3–6 wk | pass |
| S9 | 2.0–4.0 | 3.5–5.5 | 6.5–18.3 | 1.8–3.2 | 2.3–2.8 | 16.1–33.8 | 3.4–7.1 | 2.0–4.1 | 6–10 wk | pass |
| S10 | 0.5–1.0 | 1.4–2.2 (step briefings) | 2.5–5.1 | 6.3–12.4 | 1.5–2.0 | 12.2–22.7 | 2.6–4.8 | 1.5–2.8 | open; final ≤6 wk | pass |
| **Total** | **16.0–29.5** | **31.4–49.1** | **32.7–74.1** | **15.0–28.0** | **11.6–16.6** | **106.7–197.3** | **22.5–41.5** | **12.9–23.9** | 9–18 months | — |

Reading is about 15% of planned hours and writing about 14%. Lessons (instrument-driven, each segment ending in a graded item), building and the Defence together are about 71%. That is close to the roadmap's 20/65/15 only when graded lesson work counts as building and proving; counted as reading, reading would be about 40–44%. The Keep block, stretch stages, field twins, the private overlay and the drawers (optional and opened on demand; S1's five ground drawers and D-13 would add about 35–50 minutes [D]) are outside these totals. At the pessimistic planning factor of 1.6 [buehler94] and two reserve weeks in every twelve, the arc projects to about 43–80 weeks at 6 h/week (about 10–18.4 months, so the high end runs just past the roadmap's 18) and about 25–46 weeks at 10 h/week. The course shows that projection as a range and never as "behind". Every stage plans below the roadmap's upper bound. S6, S7 and S8 plan wholly below its lower bound, as do the low estimates of S3–S9; no stage's high estimate falls below half of the lower bound, so GATE-budget raises no warning. That follows the brief's displacements and roadmap rule 1, and it remains the plan's largest estimating risk (§14), so learner-zero's logged times replace these figures after each wave.

### 3.12 Drawers

Drawers are always open (I5); opening one is logged, never required. Just-in-time drawers replace v1's Course 00 and hold side material. Deferred drawers hold the roadmap's deferred topics (the Shelf, internally): each is always openable and shows a short card saying what the topic is, why the roadmap defers it and what surfaces it. A trigger surfaces the drawer in Today; it unlocks nothing. "Used in" is generated from the stage specs' drawer references and GATE-links checks it; a stage's lesson task owns the drawers it introduces (§13). Deferred triggers read claim@1's optional `topics[]`, drawn from a fixed vocabulary and settable on claim lines (NOT COVERED lines included) and on parked goals; D-31 reads a structured correspondence reference (language, path, symbol).

| ID | Drawer | Used in, or trigger |
|---|---|---|
| D-01 | A proof is not a test; reading a counterexample (continued in D-04, D-09 and D-21) | Boot, S1.L1 |
| D-02 | Propositions, implication and vacuity | S1.L3, S2.L2, S4.L8 |
| D-03 | Quantifiers and negation | S1.L1 |
| D-04 | State as functions, steps as relations | S1.L4, S2.L8, S4.L4 |
| D-05 | Induction, informally | S2.L1, S2.L4 |
| D-06 | The anatomy of a guarantee: the six fields | S1.L3, LAB-1.6, S2.L10, LAB-4.8, LAB-10.8 |
| D-07 | The Lean error museum | S2; LAB-3.c4–LAB-3.c5's rungs |
| D-08 | The Natural Number Game, pinned fallback | S2.L1 |
| D-09 | PlusCal beside its TLA+ translation | S5.L2, S8.L2 |
| D-10 | Reading PLF's Rocq notation | S4.L1, S4.L3; S7 |
| D-11 | MVCC in one page (tablespace T4 prerequisite card) | S6.L5–S6.L7 |
| D-12 | Durability and the write-ahead log in one page (tablespace T3 prerequisite card) | S8.L3 |
| D-13 | SMT-LIB in one page | S1 (S1.L2, LAB-1.6), S4.L5, LAB-4.2 onward |
| D-14 | The Lane A wasm ABI | LAB-3, LAB-4, LAB-6, LAB-8.4 (first on the builder's path), LAB-9.11, LAB-10.2–LAB-10.3 |
| D-15 | The devcontainer and `statespace doctor` | S2, S6 (LAB-6.1), LAB-10.2–LAB-10.3; on the builder's path, S5 (LAB-5) first |
| D-16 | Alloy: scopes and instances | S7.L3, LAB-7.8 |
| D-17 | Query containment | S7.L4, LAB-7.8, S9.L8 |
| D-18 | Apalache for inductive invariants: its check is treated as bounded by the constants and types it instantiates, like TLC's, so it earns [M] unless a parametric proof closes the step [D] | S4.L6, S5.L9 |
| D-19 | Scheduled work and timers | S8.L4 |
| D-20 | Sensitivity in caches, without vendor specifics | S7.L7 |
| D-21 | byzantine in one page: consistency and the deterministic harness | S6.L8, S7.L8, S8.L6 |
| D-22 | Lean 4 metaprogramming | surfaced when `statespace check` flags `declare_syntax_cat` in a LAB-3 or LAB-9 module (receipt `lints[]`) |
| D-23 | Explicit error outcomes in one page: `Except Err`, typed errors and why a failed guard is a value (builder's-path prerequisite card) | S6.L2 on the builder's path |
| D-30 | Kani | deferred; surfaced at ER-1, for the `i64` path of the learner's Rust |
| D-31 | Verus and Aeneas | deferred; surfaced when a claim's structured correspondence reference names Rust code to verify directly |
| D-32 | Proof certificates (Alethe and Carcara) | deferred; surfaced at ER-7 |
| D-33 | Category theory | deferred; surfaced when a proof obligation needs it |
| D-34 | Advanced dependent type theory | deferred; surfaced when a proof obligation needs it |
| D-35 | Cryptographic protocol verification | deferred; surfaced when a claim names a protocol |
| D-36 | Mobile attestation (deferred by the roadmap) | deferred; surfaced when a claim names it |
| D-37 | Edge and CDN topology (deferred by the roadmap) | deferred; surfaced when a claim names it |
| D-38 | Generalized migrations | deferred; surfaced when a claim names a migration obligation |
| D-39 | UI code generation | deferred; surfaced when a claim names it |
| D-40 | Multi-framework SDKs | deferred; surfaced when a claim names it |

---

## 4. KC graph v0

105 KCs, 26 of them threshold KCs that spiral. Every KC gets the per-KC dose of §4.1: in the lesson, a prequestion, 1–2 calls and an exit item; then at least 8 graded opportunities in its first 60 days, at about 1–3, 7, 21 and 45–60 days. Each threshold KC adds extra Call Its, spiral returns in later stages and a place in at least one later Defence. Every item, lesson segment, lab check, audit case and specimen carries KC tags (GATE-kc). `requires` edges form a DAG, and an edge marked "(soft)" needs no ordering on a published path; `confusable` edges define the interleaving sets below. Ground skills that v1 taught in Course 00 live in S1 and are taught just in time by drawers D-01–D-06.

| ID | Name | Stage | Threshold | Requires | Confusable with |
|---|---|---|---|---|---|
| KC-1.only-if-direction | Read "P only if Q" as P → Q | S1 | | — | KC-1.implication-vacuity |
| KC-1.quantifier-negation | Negate ∀ and ∃ claims correctly | S1 | | — | KC-1.only-if-direction |
| KC-1.implication-vacuity | A false premise makes an implication true; vacuous premises | S1 | threshold | KC-1.only-if-direction | KC-1.non-vacuity-check |
| KC-1.two-state-property | A step as a relation between S and S′; primed variables | S1 | | — | KC-5.behaviors-stuttering |
| KC-1.violation-as-sat | Search for a violation by asserting the negation and asking for `sat` | S1 | threshold | KC-1.quantifier-negation | KC-1.three-answers |
| KC-1.three-answers | `sat`, `unsat`, `unknown` as statements about one query, encoding and solver run | S1 | threshold | KC-1.violation-as-sat | KC-1.unknown-fails-closed |
| KC-1.unknown-fails-closed | `unknown` is no verdict; it fails closed where it guards enforcement | S1 | | KC-1.three-answers | KC-5.bounded-scope |
| KC-1.witness-class | A witness is one member of a class: minimize, then generalize | S1 | | KC-1.violation-as-sat | KC-4.cti-or-bug |
| KC-1.non-vacuity-check | Every `unsat` needs a satisfiable premise witness | S1 | | KC-1.implication-vacuity, KC-1.three-answers | KC-1.implication-vacuity |
| KC-1.encoding-is-the-claim | The result is about the encoding: Int, BitVec 64, signedness | S1 | threshold | KC-1.three-answers | KC-3.nat-truncation |
| KC-1.claim-anatomy | State a guarantee in six fields, with an "if weakened" witness that refutes the claim's own proposition | S1 | | KC-1.three-answers, KC-1.violation-as-sat | — |
| KC-2.proof-reading | Self-explain a proof line by line | S2 | | — | — |
| KC-2.props-as-types | A proof is a term; `theorem` versus `def` | S2 | threshold | KC-2.proof-reading | KC-2.goal-state-reading |
| KC-2.goal-state-reading | Predict the goal a tactic produces | S2 | | KC-2.props-as-types | — |
| KC-2.induction-principle | Base case and step; the hypothesis is not circular | S2 | | KC-2.proof-reading | KC-2.generalized-ih |
| KC-2.generalized-ih | Generalize the hypothesis over the state before induction | S2 | threshold | KC-2.induction-principle | KC-2.induction-principle |
| KC-2.theorem-statement-reading | Say what a theorem proves, naming every hypothesis | S2 | | KC-2.props-as-types, KC-1.quantifier-negation | KC-2.kernel-not-requirement |
| KC-2.rejection-unchanged | Unchanged state on rejection as a theorem shape | S2 | | KC-2.goal-state-reading | — |
| KC-2.finite-map-update | Pointwise update over `Acct → Int`; aliasing on self-transfer | S2 | | KC-2.theorem-statement-reading | KC-3.edge-cases-as-decisions |
| KC-2.axioms-and-trust | Read `#print axioms`; standard, `sorryAx`, `_native`, custom; build versus replay | S2 | threshold | KC-2.props-as-types | KC-2.automation-scope |
| KC-2.automation-scope | What `omega`, `decide` and `grind` close, and which axioms they add | S2 | | KC-2.goal-state-reading | KC-2.axioms-and-trust |
| KC-2.kernel-not-requirement | Kernel acceptance establishes the formal proposition, not business intent | S2 | threshold | KC-2.theorem-statement-reading | KC-2.statement-pinning |
| KC-2.statement-pinning | Agents prove, you state: challenge packs and comparator verdicts | S2 | | KC-2.axioms-and-trust | KC-2.kernel-not-requirement |
| KC-3.abstract-syntax | An inductive AST for entities, expressions, guards and commands | S3 | | KC-2.props-as-types | — |
| KC-3.typing-judgment | `HasType`; well-formed commands | S3 | | KC-3.abstract-syntax | KC-3.progress-preservation-scope |
| KC-3.resource-postings | `ResourceOp ∈ {deposit, move, hold, capture, release}`, each a pair of postings against mint and sink accounts; resources cannot be assigned | S3 | | KC-3.typing-judgment, KC-1.two-state-property | — |
| KC-3.refined-types | `Amount := {n : Int // 0 < n}` as a dependent-type example | S3 | | KC-3.typing-judgment | KC-1.encoding-is-the-claim |
| KC-3.big-step-errors | An evaluator into `Except Err (State × Output × List Effect)` | S3 | | KC-3.abstract-syntax | KC-3.small-step-stuck |
| KC-3.small-step-stuck | Stuck states versus error outcomes | S3 | threshold | KC-3.big-step-errors | KC-3.big-step-errors |
| KC-3.progress-preservation-scope | What progress and preservation buy, and what they do not | S3 | threshold | KC-3.small-step-stuck, KC-3.typing-judgment | KC-3.step-invariant |
| KC-3.step-invariant | An invariant preserved by every successful transition | S3 | | KC-2.generalized-ih, KC-3.big-step-errors | KC-3.progress-preservation-scope |
| KC-3.edge-cases-as-decisions | Zero, self-transfer, failed guard and overflow as recorded decisions | S3 | | KC-3.big-step-errors | KC-2.finite-map-update |
| KC-3.nat-truncation | `Nat` subtraction truncates and hides overdrafts | S3 | | KC-1.encoding-is-the-claim | KC-1.encoding-is-the-claim |
| KC-3.termination-fuel | Structural recursion and fuel | S3 | | KC-3.big-step-errors | — |
| KC-3.goldens-as-theorems | Kernel-checked goldens as the correspondence check for learner-owned semantics | S3 | | KC-2.axioms-and-trust, KC-3.big-step-errors | KC-6.differential-testing |
| KC-4.hoare-triple | Triples; partial versus total correctness | S4 | | KC-1.two-state-property | — |
| KC-4.wp-assignment | Weakest precondition of assignment by substitution | S4 | threshold | KC-4.hoare-triple | KC-4.symbolic-execution |
| KC-4.wp-sequence-conditional | Weakest preconditions of sequences and guarded commands; four guard readings | S4 | | KC-4.wp-assignment | — |
| KC-4.vc-shape | `Inv ∧ Guard ∧ Step ∧ ¬Inv′`, and what `sat` or `unsat` of it means | S4 | | KC-4.wp-sequence-conditional, KC-1.violation-as-sat | KC-4.invariant-vs-inductive |
| KC-4.symbolic-execution | Forward symbolic execution as a second derivation | S4 | | KC-4.wp-assignment | KC-4.wp-assignment |
| KC-4.frame-condition | Frame conditions: unchanged state must be said | S4 | | KC-4.vc-shape | — |
| KC-4.capture-avoiding-substitution | Substitution without variable capture | S4 | | KC-4.wp-assignment | — |
| KC-4.invariant-vs-inductive | Invariant (true in reachable states) versus inductive (preserved by every step) | S4 | threshold | KC-4.vc-shape, KC-3.step-invariant | KC-4.cti-or-bug |
| KC-4.cti-or-bug | Inductive, CTI (strengthen) or reachable (fix) | S4 | threshold | KC-4.invariant-vs-inductive | KC-1.witness-class |
| KC-4.trust-stack | Solver versus VC generator versus semantics: which correctness a result rests on | S4 | threshold | KC-4.vc-shape, KC-2.axioms-and-trust | KC-9.tcb |
| KC-4.prove-or-enforce | Prove per command, otherwise enforce at commit | S4 | | KC-4.vc-shape | KC-6.enforce-at-commit |
| KC-5.behaviors-stuttering | Behaviors, actions and stuttering | S5 | | KC-1.two-state-property | — |
| KC-5.tlc-flags-matter | Flags change verdicts; trace length counts actions, not states | S5 | | KC-5.behaviors-stuttering | KC-5.bounded-scope |
| KC-5.interleaving-granularity | Atomicity and granularity decide the reachable interleavings | S5 | | KC-5.behaviors-stuttering | KC-6.compilation-pattern |
| KC-5.holds-lifecycle | Available → Held → Captured or Released | S5 | | KC-5.behaviors-stuttering | — |
| KC-5.hostile-environment | Timeouts, duplicates, crashes and restarts as actions | S5 | | KC-5.holds-lifecycle | KC-8.crash-windows |
| KC-5.safety-vs-liveness | "Never twice" versus "eventually" | S5 | threshold | KC-5.behaviors-stuttering | KC-7.hyperproperty |
| KC-5.temporal-operators | □, ◇ and ~>, read and written; implicit always and eventually | S5 | | KC-5.safety-vs-liveness | — |
| KC-5.fairness | Weak and strong fairness: what the scheduler and the environment promise | S5 | threshold | KC-5.safety-vs-liveness | KC-8.progress-needs-recovery |
| KC-5.lasso-reading | A liveness counterexample is a lasso | S5 | | KC-5.safety-vs-liveness | — |
| KC-5.bounded-scope | "No error" holds for stated constants and bounds, not every size | S5 | threshold | KC-5.tlc-flags-matter | KC-1.unknown-fails-closed |
| KC-5.inductive-invariant-tla | An inductive invariant checked at fixed N is [M]; a parametric proof of the inductive step is [P] | S5 | | KC-4.invariant-vs-inductive, KC-5.bounded-scope | — |
| KC-6.sql-not-algebra | Bags, NULL and three-valued logic | S6 | | KC-1.encoding-is-the-claim | — |
| KC-6.null-guards | CHECK accepts NULL; WHERE skips it | S6 | | KC-6.sql-not-algebra | — |
| KC-6.rowcount-as-guard | Rowcount equals 1, or a typed error | S6 | | KC-6.null-guards, KC-3.big-step-errors (soft) | — |
| KC-6.differential-testing | What differential tests establish: outcome classes, n, generator statistics | S6 | threshold | KC-6.rowcount-as-guard | KC-3.goldens-as-theorems |
| KC-6.overflow-refusal | The model takes a step the database refuses (22003) | S6 | | KC-1.encoding-is-the-claim, KC-6.rowcount-as-guard | — |
| KC-6.enforce-at-commit | A deferred check over postings; SUM over no rows is NULL | S6 | | KC-4.prove-or-enforce, KC-6.null-guards | KC-4.prove-or-enforce |
| KC-6.compilation-pattern | The compilation pattern, not only the isolation level, decides the anomaly | S6 | | KC-6.rowcount-as-guard, KC-5.interleaving-granularity | KC-6.anomaly-isolation |
| KC-6.anomaly-isolation | Lost update, write skew and read skew against isolation levels | S6 | threshold | KC-6.compilation-pattern | KC-6.compilation-pattern |
| KC-6.serializable-retries | Whole-command retries on 40001 and 40P01; termination is assumed | S6 | | KC-6.anomaly-isolation | — |
| KC-6.refinement-relation | R(S, D) and the simulation square | S6 | threshold | KC-6.differential-testing, KC-3.step-invariant | KC-9.forward-simulation |
| KC-6.abstract-serializability | Accept a history if some serial order reproduces every committed output | S6 | | KC-6.refinement-relation, KC-6.anomaly-isolation | — |
| KC-6.db-as-assumption | PostgreSQL's semantics enter a claim as assumptions | S6 | | KC-6.serializable-retries, KC-6.abstract-serializability | KC-4.trust-stack |
| KC-7.access-models | Users, teams, roles, documents and sharing | S7 | | — | — |
| KC-7.policy-as-datalog | Policy as Datalog: access matrix and derivations | S7 | | KC-7.access-models | — |
| KC-7.policy-checking | Policy queries with distinguishing requests; operator choice | S7 | | KC-7.policy-as-datalog, KC-1.violation-as-sat | — |
| KC-7.small-scope | A small scope is a hypothesis, not a proof for all sizes | S7 | | KC-7.policy-checking, KC-5.bounded-scope | KC-5.bounded-scope |
| KC-7.rls-semantics | `USING` filters silently, `WITH CHECK` errors, owners bypass unless `FORCE` | S7 | | KC-7.policy-as-datalog, KC-6.sql-not-algebra | — |
| KC-7.side-channels | Counts, sizes and integrity checks as channels | S7 | | KC-7.rls-semantics | — |
| KC-7.enforcement-vs-ni | A check on every read is not noninterference | S7 | threshold | KC-7.policy-checking | KC-7.observer-equivalence |
| KC-7.hyperproperty | Noninterference is a property of pairs of executions | S7 | | KC-5.safety-vs-liveness | KC-5.safety-vs-liveness |
| KC-7.observer-equivalence | The observer, its equivalence relation and paired states | S7 | threshold | KC-7.hyperproperty, KC-4.vc-shape | KC-7.enforcement-vs-ni |
| KC-7.declassification | What, who, where and when; why the blanket claim is false | S7 | | KC-7.observer-equivalence | KC-7.side-channels |
| KC-7.revocation-past | Revocation cannot unsee; the new enemy | S7 | | KC-7.declassification, KC-5.temporal-operators | — |
| KC-8.commit-not-send | Recording intent is not performing an effect | S8 | threshold | KC-5.hostile-environment | KC-8.at-least-once |
| KC-8.outbox-chain | Command → Outbox → Worker → External → Ack | S8 | | KC-8.commit-not-send | — |
| KC-8.crash-windows | What a crash between each pair of steps permits | S8 | | KC-8.outbox-chain | KC-5.hostile-environment |
| KC-8.at-least-once | At-least-once delivery duplicates; exactly-once is a pair | S8 | threshold | KC-8.crash-windows | KC-8.commit-not-send |
| KC-8.untrusted-replies | Replies as untrusted input | S8 | | KC-8.outbox-chain | — |
| KC-8.idempotency-keys | One key per command, written in the same SERIALIZABLE transaction | S8 | | KC-8.at-least-once, KC-6.serializable-retries | — |
| KC-8.progress-needs-recovery | Liveness that needs eventual recovery | S8 | | KC-5.fairness, KC-8.crash-windows | KC-5.fairness |
| KC-8.deterministic-simulation | Seeded fault schedules replay the same transitions | S8 | | KC-8.outbox-chain | — |
| KC-8.trace-validation | Implementation traces checked as behaviors of the spec | S8 | | KC-8.deterministic-simulation, KC-5.behaviors-stuttering | KC-6.differential-testing |
| KC-8.provider-horizon | The provider's key retention as an assumed seam | S8 | | KC-8.idempotency-keys | — |
| KC-9.stack-machine-correctness | A compiler-correctness proof by structural induction | S9 | | KC-2.generalized-ih | — |
| KC-9.translation-validation | Check each output instead of the compiler | S9 | | KC-6.differential-testing | KC-9.forward-simulation |
| KC-9.target-ir | IR semantics with aborts; determinism | S9 | | KC-3.big-step-errors | — |
| KC-9.observations | What is observable; observational equivalence | S9 | | KC-9.target-ir, KC-7.observer-equivalence | KC-7.observer-equivalence |
| KC-9.forward-simulation | Matching relation and simulation diagram | S9 | threshold | KC-9.observations, KC-6.refinement-relation | KC-9.simulation-kinds |
| KC-9.simulation-kinds | Forward, backward and bisimulation; when forward suffices | S9 | | KC-9.forward-simulation | KC-9.forward-simulation |
| KC-9.preservation-proof | Semantic preservation for the fragment | S9 | | KC-9.forward-simulation | — |
| KC-9.bad-optimization | A wrong transformation breaks the proof; extract its counterexample | S9 | | KC-9.preservation-proof | KC-4.cti-or-bug |
| KC-9.sql-equivalence | Containment, provers and refutation; one-database agreement is [T] (1 instance) | S9 | | KC-9.translation-validation, KC-6.sql-not-algebra | KC-6.differential-testing |
| KC-9.three-claims | Command, compiler and runtime claims kept apart | S9 | | KC-9.preservation-proof | KC-9.tcb |
| KC-9.tcb | Name every unverified piece of the executable system | S9 | threshold | KC-9.three-claims, KC-4.trust-stack | KC-4.trust-stack |
| KC-10.claim-graph-report | The report as a traversal of the claim graph | S10 | | KC-9.tcb | — |
| KC-10.defeater-log | Doubts eliminated out of doubts identified, never summed | S10 | | KC-10.claim-graph-report | — |
| KC-10.agent-proposal-triage | Choose and run the right checker on an agent's proposal, then decide | S10 | | KC-4.trust-stack, KC-2.kernel-not-requirement | — |
| KC-10.publish-limitations | State tool versions, statement hashes and known limitations | S10 | | KC-10.claim-graph-report, KC-5.bounded-scope (soft), KC-2.statement-pinning (soft) | — |

**Confusable sets for interleaving** (M-which-is-it; after the exit item, at most half a session, never across sets):

| Set | Discriminate between | KCs | Opens |
|---|---|---|---|
| A · which stamp | what Z3, Lean, TLC, Spectacle, a differential run, a constraint and a configuration each established | KC-1.three-answers, KC-1.unknown-fails-closed, KC-2.axioms-and-trust, KC-5.bounded-scope, KC-6.differential-testing | S2 |
| B · property kind | safety, liveness, hyperproperty, refinement, requirement | KC-5.safety-vs-liveness, KC-7.hyperproperty, KC-6.refinement-relation, KC-2.kernel-not-requirement | S5 |
| C · gap class | G1–G13 and their subclasses | audit families; KC-4.trust-stack, KC-10.agent-proposal-triage | S2 |
| D · anomaly | lost update, write skew, read skew, serialization failure, deadlock | KC-6.anomaly-isolation, KC-6.compilation-pattern | S6 |
| E · fairness | none, weak, strong; lasso shapes | KC-5.fairness, KC-5.lasso-reading, KC-8.progress-needs-recovery | S5 |
| F · encoding | ℤ, BitVec 64, `Nat`, `bigint`, `numeric` | KC-1.encoding-is-the-claim, KC-3.nat-truncation, KC-6.overflow-refusal | S3 |
| G · correspondence | forward simulation, backward simulation, bisimulation, translation validation, differential testing, trace validation | KC-9.forward-simulation, KC-9.simulation-kinds, KC-9.translation-validation, KC-6.differential-testing, KC-8.trace-validation | S8 (its S6 and S8 members are both in hand after S8.L6; the S9 members join at S9) |
| H · obligation verdicts | weakest precondition versus symbolic execution; what a `sat` obligation means: not inductive, a CTI or a bug | KC-4.wp-assignment, KC-4.symbolic-execution, KC-4.vc-shape, KC-4.invariant-vs-inductive, KC-4.cti-or-bug, KC-1.witness-class | S4 |

**Fading families.** Correct worked examples first, then backward fading with no prompts on completion blanks and one principle prompt per revealed step (grades A and B [dp rows 10–12]), only for the six hardest procedure families: F1 Lean list induction with a generalized hypothesis (KC-2.generalized-ih); F2 step-invariant case analysis (KC-3.step-invariant); F3 weakest-precondition derivation (KC-4.wp-assignment); F4 invariant strengthening after a CTI (KC-4.cti-or-bug); F5 a TLA+ action with its invariant and fairness (KC-5.fairness); F6 a forward-simulation step (KC-9.forward-simulation). Each family runs rungs L0 (worked example) to L4 (transfer) on a 3-up, 1-down staircase per KC.

### 4.1 Dosage targets (BRIEF §3.4)

Copied from the brief with their sources, and wired to the gate or test that holds each one.

| Dose | Target | Basis | Held by |
|---|---|---|---|
| Study | 6–10 h/week, planned at the pessimistic end (×1.6) | [buehler94][oreo19] | M-set-your-week; the §3.11 projection |
| Segment | 12–15 min, ending in a graded interaction; one tool per session | [dp] D | GATE-lessons |
| New tools | ≤ 1 per stage; first contact in the browser after a primer of at least 5 minutes | pre-training [dp row 18] B/D; kernelspace drop-off [ks100x] D | the stage map's one "New tool" line per stage; GATE-budget |
| KC graph | cap 110 KCs, 105 planned; about 25 threshold KCs that spiral (26 planned) | [dp][dr1] D | GATE-kc |
| Per KC | in the lesson, a prequestion, 1–2 calls and an exit item; then ≥ 8 graded opportunities in 60 days, at about 1–3, 7, 21 and 45–60 days; a KC credited at placement or test-out is left out of the dose check and gets FSRS maintenance from its confirmation date | [koedinger23], an analogy; B/D | GATE-kc (every KC carries a prequestion, a call and an exit item in its first lesson or step briefing); the Today scheduler's property test on a simulated 60-day calendar (W1-T08) |
| Maintenance | FSRS at 0.85–0.90 target retention | A [latimier21][cepeda08] | M-today; the W1-T08 scheduler test |
| Signed off; settled | fresh items right in ≥ 3 spaced sessions plus the Defence; settled = a fresh probe ≥ 30 days after sign-off | B [higham22] | §8.6; ledger property tests |
| Keep | the brief: 30–40 min/week, recomputed from logged item times. This spine: computed as in §3.0, planned at 45–75 min/week at 6 h/week and 60–105 min/week at 10 h/week (§12) | D | GATE-budget (each stage's implied Keep load) |
| Interleaving | after the exit item; ≤ 50% of a session; confusable sets only | A [brunmair19] | M-which-is-it; GATE-items |
| Audit | 2–3 cases a week; ≥ 6 exemplars per gap class once its anchors have shipped | D | the Keep block (0–1 case per Today session); GATE-audit (≥ 6 per class whose anchors have shipped) |
| CTI items | ≥ 4, interleaved through S9 | D | GEN-cti-or-bug in S4 and S5, interleaved to S9; GATE-items counts them |
| Claims | 2 by about week 4; never more than 2 weeks without a new claim or specimen | C/D [dp] | GATE-budget's claim-cadence check over both published paths at 6 h/week |
| Writing (15%) | short prompted writes; a 600–1,000-word note every 2–3 stages | A (small) [bangertdrowns04] | M-notes after S2, S5, S7 and S9 |
| Lean keep-alive | 20–30 min every 2–3 weeks while Lean is idle, as its own Keep session | D [tatel25] | M-lean-keep-alive; W3-T13 |

---

## 5. Specimens, claims, seams and erosions

### 5.1 Specimens

A specimen is a counterexample kept beside its fix, with a label generated from its run: *violates, because, minimal?, cured by, found in, tool version* (for a state pair, "minimal?" asks for the fewest differing secret atoms, and for a trace the shortest violating prefix, as the run's shrinker found them). It moves from "mounted" (label verified by a run) to "kept" (re-found on a fresh variant after at least 7 days). Status is `[X RUN-id]` when the run exists or `{{run:RUN-id}}` when it must be recorded first.

| ID | Specimen | Lesson | Status |
|---|---|---|---|
| SP-1.1 | The overdraft: the starter's witness, minimal amount 1 under an Optimize objective | S1.L1 | [X RUN-z3-starter, RUN-z3-optimize-min]; Boot's variant {{run:RUN-z3-boot-variant}} |
| SP-1.2 | Double capture: one hold captured twice | S1.L4 | {{run:RUN-z3-double-capture}} |
| SP-1.3 | A refund rule that mints money | S1.L4 | {{run:RUN-z3-refund-mint}} |
| SP-1.4 | The guard protects the sender, not the recipient: BitVec 64 recipient wrap (model values are not canonical: the native and Pyodide runs posed different queries and returned different wraps, so grading checks the property) | S1.L5 | [X RUN-z3-bv64, RUN-z3-bv64-pyodide] |
| SP-1.5 | A guard mixing unsigned and signed comparisons readmits the overdraft | S1.L5 | [X RUN-z3-bv64] |
| SP-1.6 | "unsat, therefore safe" over contradictory premises | S1.L3 | {{run:RUN-z3-vacuous-unsat}} |
| SP-1.7 | A reason-stable `unknown`: `x**y == 8, y > 1`, "incomplete (theory arithmetic)" | S1.L2 | [X RUN-z3-unknown-pow] |
| SP-1.8 | Tool trust: a timeout that never returned under Pyodide in a Node harness, while `rlimit` cancels (the browser run is {{run:RUN-phone-pyodide}}) | S1.L2 | [X RUN-z3-budget-pyodide] |
| SP-1.9 | Bitcoin CVE-2010-5139, values that overflowed when summed: a toy model (dated incident) | S1.L5 | {{run:RUN-z3-btc2010}} |
| SP-1.10 | Bloch 2006, the binary-search midpoint overflow: a toy model (dated incident) | S1.L5 | {{run:RUN-z3-bloch06}} |
| SP-2.1 | Self-transfer mints money: computing both balances from the old state turns 10 into 15 | S2.L8 | [X RUN-lean-selftransfer, RUN-z3-selftransfer] |
| SP-2.2 | Drop the guard: conservation survives; only non-negativity fails, at amount 1 | S2.L5 | [X RUN-z3-conservation-noguard, RUN-z3-optimize-min]; Lean counterpart {{run:RUN-lean-noguard}} |
| SP-2.3 | An induction hypothesis not generalized over the state leaves the step unprovable | S2.L7 | {{run:RUN-lean-ih-ungeneralised}} |
| SP-2.4 | A `sorry` builds with exit code 0 | S2.L9 | [X RUN-lean-axioms] |
| SP-2.5 | Two verdicts: `lake check` rejects non-standard axioms while its log still says the default kernel accepts | S2.L9 | [X RUN-lean-axioms] |
| SP-2.6 | A kernel bypass (`debug.skipKernelTC`) builds green; only kernel replay rejects it | S2.L9 | [X RUN-lean-skipkernel] |
| SP-2.7 | Statement substitution caught: "theorem statement do not match" and "Const does not match" | S2.L10 | [X RUN-lean-comparator] |
| SP-2.8 | One exit code for two failures: the sandbox failing under default Docker exits like a rejection | S2.L10 | [X RUN-lean-bwrap-docker] |
| SP-2.9 | A true theorem every checker accepts that misses the intent | S2.L10 | {{run:RUN-lean-intent}} |
| SP-3.1 | A stuck ill-typed program | S3.L4 | {{run:RUN-lean-stuck}} |
| SP-3.2 | The unsafe command `force move` breaks the invariant obligation | S3.L9 | {{run:RUN-lean-unsafe-cmd}} |
| SP-3.3 | `Nat` hides the overdraft by truncating at 0 | S3.L7 | {{run:RUN-lean-nat-trunc}} |
| SP-3.4 | Big-step and small-step semantics disagree on an error state | S3.L4 | {{run:RUN-lean-bigsmall}} |
| SP-3.5 | A redefined evaluator passes statement matching and fails the kernel-checked goldens | S3.L9 | {{run:RUN-lean-golden-redef}} |
| SP-4.1 | A missing frame condition yields a counterexample in which an untouched account changes, a witness the interpreter's replay refuses | S4.L5 | {{run:RUN-z3-missing-frame}} |
| SP-4.2 | Substitution capture in a hand-written weakest precondition | S4.L2 | {{run:RUN-z3-capture}} |
| SP-4.3 | A CTI paired with a reachable bug: same invariant shape, opposite verdicts | S4.L6 | {{run:RUN-z3-cti-pair}} |
| SP-4.4 | The vacuity trap: `unsat` because the premises cannot hold together | S4.L8 | {{run:RUN-z3-vacuity-trap}} |
| SP-4.5 | The solver was wrong: Z3 issue #11179's inputs, through the command line, give a wrong `unsat` on 5.3.0 and `unknown` on 5.3.1 (through the Python API, `unknown` on every tested version) | S4.L9 | [X RUN-z3-11179] |
| SP-4.6 | A certificate with a hole: cvc5's Alethe proof contains an untranslated step | S4.L9 | [X RUN-cvc5-alethe] |
| SP-4.7 | Lean's experimental `vcgen` exposes the obligation left by a dropped guard | S4.L9 | {{run:RUN-lean-vcgen}} |
| SP-5.1 | The double spend: two reads, two writes, 160 spent from 100 | S5.L3 | [X RUN-tlc-doublespend, RUN-tlc-atomic] |
| SP-5.2 | A deadlock reported before the bug under default flags | S5.L2 | [X RUN-tlc-doublespend] |
| SP-5.3 | The starving lasso: a provider that keeps answering "busy" | S5.L7 | [X RUN-tlc-hold-lasso] |
| SP-5.4 | A hold resolved twice by competing paths | S5.L5 | {{run:RUN-tlc-resolved-twice}} |
| SP-5.5 | Granularity changes the reachable interleavings: the read/check/write split | S5.L3 | [X RUN-tlc-rtw3] |
| SP-5.6 | Clean at two workers, violated at three | S5.L8 | [X RUN-tlc-unsafe-3w] (three workers); {{run:RUN-tlc-n3-only}} (two workers) |
| SP-5.7 | The 2015 gift-card race, a transfer confirmed twice: a toy model (dated incident) | S5.L5 | {{run:RUN-tlc-starbucks15}} |
| SP-6.1 | NULL passes `CHECK (bal >= 0)` and a guarded UPDATE silently skips the NULL row | S6.L1 | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.2 | Lost update by application read-modify-write | S6.L6 | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.3 | Write skew at REPEATABLE READ (team sum and holds variants) | S6.L6 | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.4 | The step the database refuses: 22003 where the model commits | S6.L4 | [X RUN-pg-anomalies, RUN-pg-claims, RUN-pglite] |
| SP-6.5 | Opposite-order transfers deadlock with 40P01 | S6.L6 | [X RUN-pg-claims] |
| SP-6.6 | The sound counterpart: a conditional UPDATE loses nothing at READ COMMITTED | S6.L6 | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.7 | A CASE-compiled self-transfer burns money (100 becomes 70), while two UPDATEs conserve | S6.L2 | [X RUN-pg-claims] |
| SP-6.8 | SUM over no rows is NULL, so a delta check passes | S6.L5 | {{run:RUN-pg-sum-null}} |
| SP-6.9 | Read skew: a conserving system observed not conserving | S6.L9 | {{run:RUN-pg-read-skew}} |
| SP-6.10 | Mixed isolation levels void the SERIALIZABLE guarantee | S6.L9 | {{run:RUN-pg-mixed-levels}} |
| SP-6.11 | Jepsen's PostgreSQL 12.3 G2-item under SERIALIZABLE: a toy history (dated incident) | S6.L9 | {{run:RUN-history-g2item}} |
| SP-7.1 | The leaky shared document: a shared view reveals a private field | S7.L7 | {{run:RUN-z3-leaky-field}} |
| SP-7.2 | A count side channel reveals another tenant's private document | S7.L7 | {{run:RUN-z3-count-channel}} |
| SP-7.3 | Revocation cannot unsee information already delivered | S7.L8 | {{run:RUN-interp-revocation}} |
| SP-7.4 | The table owner bypasses RLS until `FORCE` | S7.L4 | {{run:RUN-pg-rls-owner}} |
| SP-7.5 | An integrity check leaks a row's existence past RLS | S7.L4 | {{run:RUN-pg-rls-covert}} |
| SP-7.6 | The new enemy: a stale replica serves a read after an ACL change | S7.L8 | {{run:RUN-interp-new-enemy}} |
| SP-7.7 | A quantified hierarchy returns `unknown`; grounding removes it | S7.L3 | {{run:RUN-z3-hierarchy-unknown}} |
| SP-8.1 | A double charge after a crash between acceptance and acknowledgement | S8.L3 | {{run:RUN-tlc-double-charge}} |
| SP-8.2 | A lost effect: a high-water-mark poller skips a late commit | S8.L3 | {{run:RUN-tlc-lost-effect}} |
| SP-8.3 | A fresh idempotency key on every retry duplicates the charge | S8.L4 | {{run:RUN-tlc-fresh-key}} |
| SP-8.4 | Ack before the durable write, caught only by trace validation | S8.L6 | {{run:RUN-tlc-trace-validation}} |
| SP-8.5 | An outage longer than the provider's key retention (dated incident: documented key pruning) | S8.L7 | {{run:RUN-tlc-key-ttl}} |
| SP-8.6 | A liveness check that passes only with crash actions switched off | S8.L5 | {{run:RUN-tlc-crash-liveness}} |
| SP-9.1 | A write hoisted above its guard breaks the preservation proof | S9.L7 | {{run:RUN-lean-hoist}} |
| SP-9.2 | A validator that checks shape, not meaning | S9.L8 | {{run:RUN-sql-shape-validator}} |
| SP-9.3 | An abort-blind observer "proves" preservation | S9.L4 | {{run:RUN-lean-abort-blind}} |
| SP-9.4 | "Results match" on one database for a non-equivalent rewrite | S9.L8 | {{run:RUN-pg-one-db}} |
| SP-9.5 | `native_decide` adds the compiler to the trusted base (a `_native` axiom appears) | S9.L9 | [X RUN-lean-axioms] |
| SP-9.6 | A meaning-preserving compiler whose output leaks through size or timing | S9.L9 | {{run:RUN-lean-leaky-compile}} |
| SP-10.1 | The provided agent proposal: a fee leg outside the guard overdraws the sender | S10.L6 | {{run:RUN-core-demo}} |

### 5.2 Claim templates

Each claim is a six-field card (proposition, assumptions, model, method, correspondence, counterexample when weakened) plus a requirement row, rendered with a three-segment strip (proposition-of-model · correspondence · requirement-fit). Requirement-fit is never [P]. Claims live in the learner's lab repo as `claims/*.yaml`; templates fade from prefilled to learner-written.

| ID | Proposition (short) | Minted in | Expected stamp and qualifier | Status |
|---|---|---|---|---|
| CL-1.1 | The guarded transfer never overdraws the sender (Int) | S1.L3, LAB-1.3 | [P] · Z3 5.3.1 unsat · uncertified · rlimit N; open defeater "encoding unverified" | [X RUN-z3-starter] |
| CL-1.2 | A transfer conserves the total (Int) | S1.L4, LAB-1.5 | [P] · Z3 5.3.1 unsat · uncertified · rlimit N | [X RUN-z3-conservation-noguard] |
| CL-1.3 | A hold is captured at most once | S1.L4, LAB-1.5 | [P] · Z3 5.3.1 unsat · uncertified · rlimit N | {{run:RUN-z3-double-capture}} |
| CL-1.4 | The fixed refund never mints | S1.L4, LAB-1.4 | [P] · Z3 5.3.1 unsat · uncertified · rlimit N | {{run:RUN-z3-refund-mint}} |
| CL-1.5 | Under signed BitVec 64 with `amount > 0`, the guarded sender cannot go negative | S1.L5 | [P] · Z3 5.3.1 unsat · uncertified · rlimit N; recipient not covered [N] | [X RUN-z3-bv64] |
| CL-2.1 | `transfer_conserves` | S2.L5, LAB-2.2 | [P] · Lean 4.35.0 kernel · axioms listed | [X RUN-lean-ledger] |
| CL-2.2 | `transfer_nonneg` | S2.L6, LAB-2.4 | [P] · Lean 4.35.0 kernel · axioms listed | [X RUN-lean-ledger] |
| CL-2.3 | `transfer_rejected` | S2.L6, LAB-2.3 | [P] · Lean 4.35.0 kernel · axioms listed | [X RUN-lean-ledger] |
| CL-2.4 | `run_conserves` over finite sequences | S2.L7, LAB-2.5 | [P] · Lean 4.35.0 kernel · axioms listed | [X RUN-lean-ledger] |
| CL-2.5 | The many-account transfer (fixed self-transfer) conserves | S2.L8, LAB-2.6 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-finmap}} |
| CL-3.1 | Progress for the fragment (stretch) | S3.L5, LAB-3.12 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-progress}} |
| CL-3.2 | Preservation for the fragment (stretch) | S3.L5, LAB-3.13 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-preservation}} |
| CL-3.3 | Successful steps preserve the state invariant | S3.L6, LAB-3.5 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-step-invariant}} |
| CL-3.4 | Postings refine the Stage 2 ledger | S3.L6, from the course's reference proof, with no lab stage; it reaches your semantics only through the goldens | [P] · Lean 4.35.0 kernel · axioms listed, for the reference semantics | {{run:RUN-lean-postings-refine}} |
| CL-3.5 | Your Rust interpreter agrees with the kernel-checked goldens (it rests on the pinned Lean reference, whose goldens are kernel-checked theorems) | S3.L9, LAB-3.10 | [T] · n goldens | {{run:RUN-interp-goldens}} |
| CL-4.1 | The hand-derived weakest precondition of transfer equals the reference | S4.L3 | [P] · Z3 5.3.1 equivalence · uncertified | {{run:RUN-z3-wp-transfer}} |
| CL-4.2 | `miniplinth check` discharges the invariant obligation for the supported fragment | S4.L7, LAB-4.8 | [P] · Z3 5.3.1 and cvc5 agree · uncertified (the Bench cvc5 is {{run:RUN-scaffold}}) | {{run:RUN-check-fragment}} |
| CL-4.3 | VC-generator soundness for assignment and `if` (stretch) | S4.L9, LAB-4.9 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-vcgen-soundness}} |
| CL-4.4 | The invariant is inductive for the command set | S4.L6, LAB-4.6 | [P] · Z3 5.3.1 unsat · uncertified (the inductive step) | {{run:RUN-z3-inductive}} |
| CL-4.5 | The invariant holds on every trace of length ≤ N; minted instead of CL-4.4 when the inductive step is `sat` and no violation is reachable within N | S4.L6, LAB-4.6 | [M] · bound N · partial; inductiveness [?] · CTI found | {{run:RUN-z3-cti-pair}} |
| CL-5.1 | The atomic transfer never overspends | S5.L3, LAB-5.2 | [M] · constants printed · complete | [X RUN-tlc-atomic] |
| CL-5.2 | A hold never resolves twice | S5.L5, LAB-5.4 | [M] · constants · complete | {{run:RUN-tlc-never-twice}} |
| CL-5.3 | A hold eventually resolves under stated fairness | S5.L7, LAB-5.5 | [M] · constants; fairness as [A] | {{run:RUN-tlc-eventually}} |
| CL-5.4 | An inductive invariant lifts "never overspends" to every N | S5.L9, LAB-5.7 | [P] · Z3 5.3.1 unsat · uncertified (workers as an uninterpreted sort), with the open defeater "translation from the TLA+ spec unverified", supported by [M] · TLC inductive check at N = k | {{run:RUN-z3-inductive-param}}, {{run:RUN-tlc-inductive}} |
| CL-6.1 | Compiled transfers match the interpreter on outcome classes | S6.L3, LAB-6.4 | [T] · n · generator statistics · engines named | {{run:RUN-drt-transfers}} |
| CL-6.2 | The conditional-UPDATE compilation never overspends under concurrent READ COMMITTED | S6.L6 | [T] · n histories, plus [A] clauses | {{run:RUN-pg-conditional-concurrent}} |
| CL-6.3 | R(S, D) holds on every checked history | S6.L8, LAB-6.7 | [T] · n histories · serial-order search bound | {{run:RUN-serializability-fixtures}} |
| CL-6.4 | Postings conserve at commit | S6.L5; re-stamped from LAB-6.8's Bench receipt | [E] · deferred check, where | {{run:RUN-pg-enforce-commit}} |
| CL-6.5 | Every command commits or is refused without exhausting its retry budget | S6.L7 | [A] · why: contention assumed finite | — (assumed by design) |
| CL-7.1 | The access matrix equals the policy's derivations | S7.L2, LAB-7.2 | [T] · n worlds; engines agree | {{run:RUN-datalog-matrix}} |
| CL-7.2 | No cross-tenant read without an explicit share, at the policy level | S7.L3, LAB-7.3 | [P] · Z3 5.3.1 unsat · uncertified, with grounding stated | {{run:RUN-z3-cross-tenant}} |
| CL-7.3 | Noninterference for the document view modulo declassified fields | S7.L6, LAB-7.5 | [P] · Z3 5.3.1 unsat by self-composition · uncertified; observer as [A] | {{run:RUN-z3-selfcomp}} |
| CL-7.4 | RLS enforces the read rule | S7.L4, LAB-7.4 | [E] · PostgreSQL RLS, plus [T] · `SET ROLE` differential, plus [C] · `relrowsecurity` and `relforcerowsecurity` read back from `pg_class` | {{run:RUN-pg-rls-differential}} |
| CL-8.1 | No committed command's outbox intent is lost before acknowledgement (safety) | S8.L3, LAB-8.2 | [M] · constants · complete, crash actions on | {{run:RUN-tlc-outbox-safety}} |
| CL-8.2 | No double charge, given the provider's idempotency | S8.L4, LAB-8.5 | [M] · constants · complete, plus [A] provider idempotency in the trusted base and, from LAB-8.8, the [A] provider horizon | {{run:RUN-tlc-outbox-safety}} |
| CL-8.3 | Simulator traces are behaviors of the spec | S8.L6, LAB-8.6 | [T] · n seeds | {{run:RUN-tlc-trace-validation}} |
| CL-8.4 | Every command is eventually acknowledged, given recovery (liveness) | S8.L5, LAB-8.3 | [M] · constants; weak fairness on Worker and eventual recovery as [A] | {{run:RUN-tlc-recovery}} |
| CL-8.5 | Every committed command's effect is eventually dispatched (liveness) | S8.L5, LAB-8.3 | [M] · constants; weak fairness on Worker and eventual recovery as [A] | {{run:RUN-tlc-recovery}} |
| CL-9.1 | The stack-machine compiler is correct | S9.L1, LAB-9.2 | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-stack-machine}} |
| CL-9.2 | Semantic preservation for the fragment | S9.L6, LAB-9.10 (minted after LAB-9.6 as "PROVED modulo the remaining cases", each [A]) | [P] · Lean 4.35.0 kernel · axioms listed | {{run:RUN-lean-preservation-frag}} |
| CL-9.3 | Generated SQL is validated per command | S9.L8, LAB-9.11 | [T] · n commands, or [M] · bound | {{run:RUN-sql-validation}} |
| CL-10.1 | The demonstration: the agent's proposal is refuted or a restricted obligation is proved, and the corrected command runs on PostgreSQL 18.6 | S10.L6, LAB-10.7 | composite: [R] or [P], plus [T] | {{run:RUN-core-demo}} |
| CL-10.2 | The published report | S10.L7, LAB-10.8 | composite: a traversal of the claim graph; no single stamp | — (composite) |

A learner may also write claims that no template covers, such as further configured or not-covered lines for LAB-10.8's report; claim@1 validation accepts them. Every Lean template's qualifier is "Lean 4.35.0 kernel · axioms listed", plus "6 checkers" when `lake comparator --paranoid` ran [X RUN-lean-comparator]; every solver template names its solver and version (§8.7, GATE-stamps).

### 5.3 Seams

A seam is an ASSUMED field planted on purpose. Some erode later; some are tested and expected to hold, because not every assumption breaks.

| ID | Assumption | Planted (lesson · claims) | Fate | Tested by |
|---|---|---|---|---|
| SEAM-1 | Balances are unbounded integers | S1.L3, S1.L4 · CL-1.1, CL-1.2; carried by CL-1.3, CL-1.4, CL-2.1–CL-2.5, CL-3.3, CL-3.4, CL-4.1, CL-4.2, CL-4.4 and CL-4.5 | erodes: ER-1 | SP-6.4 |
| SEAM-2 | Transfers run one at a time | S2.L7 · CL-2.4; carried by CL-4.2, CL-4.4 and CL-4.5 | erodes: ER-2 | SP-5.1 |
| SEAM-3 | A correct step needs no observer | S3.L6 · CL-3.3 | erodes: ER-3 | SP-7.1 |
| SEAM-4 | Effect dispatch is atomic with the hold's commit | S5.L5 · CL-5.2 | erodes: ER-4 | SP-8.1 |
| SEAM-5 | Obligations checked on the source carry to the running code | S4.L7 · CL-4.2 | erodes: ER-5 | SP-9.1 |
| SEAM-6 | `Nat` balances cannot go negative | S3.L1 (the first AST draft's offered default) | erodes: ER-6 | SP-3.3 |
| SEAM-7 | The solver is sound | S1.L3 · CL-1.1 | erodes: ER-7 | SP-4.5 |
| SEAM-8 | The worker keeps running under weak fairness | S5.L7 · CL-5.3 | erodes: ER-8 | SP-8.6 |
| SEAM-9 | Three clauses, carried separately: nothing reads a replica (CL-6.3); PostgreSQL behaves as documented (CL-6.2, CL-6.3); every writer is SERIALIZABLE (CL-6.3) | S6.L9 · CL-6.2, CL-6.3 | erodes: ER-9, the replica clause only | SP-7.6 |
| SEAM-10 | The observer sees only the response body: the view's returned value, error codes included | S7.L6 · CL-7.3 | erodes: ER-10 | SP-9.6 |
| SEAM-11 | One database's agreement stands for the compiler | S6.L3 · CL-6.1 | erodes: ER-11 | SP-9.4 |
| SEAM-12 | Every copy of every attempt is delivered or dropped before the provider can forget the key | S8.L7 · CL-8.2 (its provider-horizon clause, written in LAB-8.8) | erodes: ER-12 | SP-8.5 |
| SEAM-13 | INS-interp, the TypeScript port, agrees with the Lean reference semantics on the fragments its kernel-checked goldens cover: the S3 fragment and the S9 target IR (the S7 access extension has no Lean reference; tab Datalog = Soufflé checks its policies) | the course's own claim on SCR-assurance, "INS-interp agrees with the Lean reference: [T] · n goldens (GATE-interp)"; shown in S3.L9 | held | GATE-interp in the fast lane; the pocket-checker differential (GATE-conformance) |
| SEAM-14 | PostgreSQL 18.6's SERIALIZABLE gives serializable outcomes for committed SERIALIZABLE transactions | S6.L6 · carried by CL-6.3 | held | GATE-specimens nightly, including the upstream `update-conflict-out` spec |
| SEAM-15 | The Lean 4.35.0 kernel accepts only well-typed terms | S2.L9 · CL-2.1–CL-2.5 | held | `lake comparator --paranoid` at every Lean Defence; advisories become change cards |

### 5.4 Erosion events

EROSION is an event, not a stamp. It cracks the correspondence segment or an assumption record, never silently the proposition-of-model. Each event opens with a forecast (M-erosion-forecast): the learner restates the claim from memory and calls which segment cracks. On any path an erosion fires when both endpoints exist in the learner's record; if the cracking specimen came first (the builder's path), the claim mints with its seam already cracked and the forecast asks which segment it hits. "Oldest open erodible seam" means the open, unheld seam whose first planting event in the learner's record came earliest, ties broken by seam number: SEAM-13–SEAM-15 never crack and never block a Clearinghouse erosion. A Clearinghouse "week" is the learner's own week, opened on demand and never generated retroactively from the calendar. A Clearinghouse-hosted erosion's second endpoint is the world week itself; its specimen only labels the witness, so meeting that specimen in a lesson does not cash it. W3-T12's property test replays both published paths and fails unless every ER fires on each.

| ID | Seam | Endpoint 1: planted | Endpoint 2: cashed (lesson · specimen) | Segment cracked | Remedies offered | Ships in |
|---|---|---|---|---|---|---|
| ER-1 | SEAM-1 | S1 (CL-1.1–CL-1.4), S2 (CL-2.1–CL-2.5), S3 (CL-3.3, CL-3.4) and S4 (CL-4.1, CL-4.2, CL-4.4, CL-4.5) | S6.L4 · SP-6.4 | correspondence: "allowed ⇒ succeeds" fails; refinement CL-6.1 gains a defeater; conservation untouched | bounded semantics and re-prove; `Except Overflow` observable in R; `numeric` with a stated bound; surfaces D-30 | W4 |
| ER-2 | SEAM-2 | S2.L7 (CL-2.4) and S4 (CL-4.2, CL-4.4, CL-4.5) | S5.L3 · SP-5.1 | correspondence: sequential proof, concurrent system | an atomic action; isolation (S6) | W3 |
| ER-3 | SEAM-3 | S3.L6 (CL-3.3) | S7.L7 · SP-7.1 | requirement-fit: confidentiality becomes [N] | an observer, an equivalence relation and a declassification list | W4 |
| ER-4 | SEAM-4 | S5.L5 (CL-5.2) | S8.L3 · SP-8.1 | assumption record: dispatch is not atomic with commit | an outbox, inbound keys, provider idempotency as [A] | W5 |
| ER-5 | SEAM-5 | S4.L7 (CL-4.2) | S9.L7 · SP-9.1 | correspondence: source obligations do not reach the target | a preservation proof or per-command translation validation | W5 |
| ER-6 | SEAM-6 | S3.L1 | S3.L7 · SP-3.3 | correspondence: `Nat` is not the intended arithmetic | `Int` plus a guard; refined `Amount` | W2 |
| ER-7 | SEAM-7 | S1.L3 (CL-1.1) | S4.L9 · SP-4.5 | assumption record: solver soundness | a cvc5 cross-check; "uncertified" qualifier; surfaces D-32 | W3 |
| ER-8 | SEAM-8 | S5.L7 (CL-5.3) | S8.L5 · SP-8.6 | assumption record: progress needs recovery | state recovery as [A]; check with crashes on | W5 |
| ER-9 | SEAM-9 | S6.L9 (the replica clause, carried by CL-6.3) | S7.L8 · SP-7.6 | assumption record: replicas and ordering; CL-6.2 does not rest on that clause and stands | read-your-writes routing or tokens stated as [A] or [E] | W4 |
| ER-10 | SEAM-10 | S7.L6 (CL-7.3) | S9.L9 · SP-9.6 | assumption record: the observer omits size and timing | widen the observer or state the channel as [N] | W5 |
| ER-11 | SEAM-11 | S6.L3 (CL-6.1) | S9.L8 · SP-9.4 | correspondence: one instance is [T] (1 instance) | translation validation per command; provers or refutation | W5 |
| ER-12 | SEAM-12 | S8.L7 (CL-8.2) | the Clearinghouse week in which SEAM-12 is the learner's oldest open erodible seam (after S9 on both published paths): a fresh re-find of SP-8.5's class on the learner's own outbox machine | assumption record: the provider's horizon | bound how long any copy of an attempt can stay in flight, below the provider's retention; reconcile by key; state the loss | W5 |

---

## 6. The Audit Desk

**Pool.** Matched sound and flawed pairs, about half sound across the pool. The sound share is seeded so it cannot be learned: within one sitting (a Desk session, Defence Part C) a seed sets p in the 30–60% range and exactly round(p·n) cases are sound; across sittings (Today, the Clearinghouse) each serve in a block of 10 is sound with probability p, drawn independently, because feedback follows every serve there. Twenty-five anchors carry generated variants, at least six exemplars per gap class once that class's anchors have shipped, and every key is set by a real tool run (GATE-audit). Cases are always browsable and never locked; a case is scheduled after its lab and re-checked a week later. The five W1 anchors from later stages (AUD-2.1–AUD-2.4 and AUD-5.3) ship keyed only by executed runs (RUN-z3-refund-a21 and RUN-lean-refund-a21, whose honest customer-only claim is AUD-2.1's W1 sound member; RUN-lean-axioms, RUN-lean-skipkernel, RUN-lean-comparator, RUN-tlc-doublespend), without generated variants, and are scheduled after LAB-2 and LAB-5, because erroneous examples need prior knowledge [alemdag25]; their variants follow once the Lean and TLC lanes exist (W2-T13, W3-T13). Late stages add cases harvested from the learner's own repo by `statespace audit` (bold upgrade "your repo is the Audit Desk").

**Flow (five steps).** (1) Call the statement alone. (2) Reveal the diff. (3) Write "This proves: ___". (4) Pick a gap class, with no default; "none: sound" is an option. (5) Anchor typed evidence to lines: a witness or trace, the offending declaration, the mismatched identifiers, paired states, or a scenario the theorem permits and the requirement forbids. Agent claims render as quoted UNREVIEWED text. Scores appear afterwards, as counts.

**Scoring.** Per-class precision and recall, each with a 95% Wilson interval, plus balanced accuracy, whose interval is assembled from the 97.5% Wilson intervals of its two class rates (Bonferroni); per-class figures appear only once a class has n ≥ 10. Each flawed case's key names a primary class, under which it counts for coverage and recall, and a set of acceptable classes, any of which a finding may name and still be correct. GATE-audit-blind fails CI if always-reject, always-accept, last-is-sound or topic-is-class beats chance by more than 2 SD, where chance is the permutation null of a strategy that knows only the pool's base rates: picks are permuted across the whole stream for decision figures, and within each stage for class figures, because a case's stage legitimately narrows its class. Each case carries a "based on" card citing a dated incident and its source, and never exploit code; the card says which event each date marks.

### 6.1 Gap taxonomy v2 (BRIEF §4.8)

| Class | Kind | Name | Subclasses |
|---|---|---|---|
| G1 | rebutting | Statement too weak | G1a non-functional omission (renders [N]) |
| G2 | rebutting | Vacuous premise | — |
| G3 | rebutting | Wrong property kind | G3a a 2-safety hyperproperty filed as a trace property |
| G4 | undermining | Encoding and type-semantics slip | — |
| G5 | undermining | Bounded or inconclusive presented as proof | — |
| G6 | undermining | Hidden trust | G6a escape hatches; G6b native trust; G6c kernel bypass (`skipKernelTC`, builds but fails replay); G6d the check never ran; G6e a trusted-base bug |
| G7 | undermining | Unstated environment assumption | — |
| G8 | undercutting | Model–implementation drift | G8a statement substitution; G8b answer in the statement; G8c tampering; G8d code bent to fit the proof |
| G9 | undercutting | Granularity | — |
| G10 | undercutting | Observer too weak | — |
| G11 | undermining | Test presented as proof, or common-mode evidence | — |
| G12 | rebutting | Requirement mismatch | — |
| G13 | undercutting | Induction failure confused with a bug | — |

### 6.2 Anchors

| ID | Stage | Class | Sound case | Flawed variant | Based on (dated, sourced) | Evidence required | Key run |
|---|---|---|---|---|---|---|---|
| AUD-1.1 | S1 | G2 | "unsat, therefore safe" with a satisfiable premise witness | the same claim over contradictory premises | PutnamBench #361: a refactor made premises inconsistent (2026-10-12; github.com/trishullab/PutnamBench/issues/361) | the premises alone are `unsat`, anchored to the conflicting lines | {{run:RUN-z3-vacuous-unsat}} |
| AUD-1.2 | S1 | G4 (G8 accepted) | a BitVec 64 signed guard with `amount > 0`, claim limited to the sender | an Int model shipped for `i64` code, claim covering the recipient | Bitcoin CVE-2010-5139, outputs that "overflowed when summed" (2010-08-15) [btc2010] | a witness under BitVec semantics | [X RUN-z3-bv64] |
| AUD-1.3 | S1 | G5 | `unsat` under an `rlimit` with a premise witness, stamped with its budget | `unknown (canceled)` reported as "no counterexample found" | S3 Block Public Access: an `unknown` from a time-out means "not Trust Safe" (FSE 2020) [bpa] | the raw verdict line and its reason | [X RUN-z3-budget-pyodide] |
| AUD-2.1 | S2 | G1 | in W1, the honest claim limited to the customer; from W2-T13, a refund theorem covering both parties | `refund_nonneg` constrains only the customer, yet is claimed to cover both parties [X RUN-z3-refund-a21] | Spec-Harness: 22.7% of accepted specs had no postcondition (arXiv 2604.00280, v1 posted 2026-03-31) | a scenario the theorem permits and the requirement forbids | [X RUN-z3-refund-a21, RUN-lean-refund-a21]; both-parties member {{run:RUN-lean-refund-both}} |
| AUD-2.2 | S2 | G6a | the same lemma with only standard axioms | the lemma closed by `sorry` or a custom axiom, build green [X RUN-lean-axioms] | AlphaVerus agents used `assume(false)` (arXiv 2412.06176) | the offending declaration and its `#print axioms` line | [X RUN-lean-axioms] |
| AUD-2.3 | S2 | G6c | the same theorem passing kernel replay | a proof built under `debug.skipKernelTC` [X RUN-lean-skipkernel] | an old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs (arXiv 2507.14722) | the option line and the replay verdict | [X RUN-lean-skipkernel] |
| AUD-2.4 | S2 | G8a | a comparator-accepted solution | a weakened statement under the same name, or a redefined `transfer` [X RUN-lean-comparator] | FormalQualBench (runs evaluated 2026-03-18 and 2026-03-19), cited for its lesson that an out-of-band statement check catches what the build accepts: "Comparator catches the illegal axiom" (itself a tampering incident, G8c) | the mismatched identifiers and the comparator verdict | [X RUN-lean-comparator] |
| AUD-3.1 | S3 | G8 | preservation proved for the shipped checker | preservation proved for a stricter checker than the one shipped | VERINA PR #17 fixed specs in 18 tasks and code in 9 (merged 2026-04-17) | the mismatched identifiers | {{run:RUN-lean-checker-drift}} |
| AUD-3.2 | S3 | G4 | `Int` balances with a guard proof | "balances can't go negative" because they are `Nat` | Kimina-Prover issue #11: a dropped ascription leaves "0 = 0" over ℕ (2026-09-13) | a truncation witness | {{run:RUN-lean-nat-trunc}} |
| AUD-4.1 | S4 | G8 | a VC generator with frame conditions | a VC generator that forgets unchanged accounts reports REFUTED, or "fix", on a witness that does not replay (a missing frame cannot support a false PROVED) | SymCert (FMCAD 2026): proofs caught encoder bugs [dl §2] | a state in which an untouched account changes, refused by the interpreter's replay | {{run:RUN-z3-missing-frame}} |
| AUD-4.2 | S4 | none: sound | "Z3 proved it" over a query without the guard (sound: dropping a guard strengthens the obligation) | flawed case: the query drops a conjunct of `Inv′` (G1) | Erdős problem #124, "= 1" written for "≥ 1" (2025-11) | sound: a restatement; flawed: a scenario | [X RUN-z3-conservation-noguard]; flawed case {{run:RUN-check-fragment}} |
| AUD-4.3 | S4 | G13 (G8d accepted) | strengthen the invariant after a CTI | an agent "fixes" a correct command after a CTI | Spec-Harness: agents changed code in 5.6% of tasks (arXiv 2604.00280, v1 posted 2026-03-31) | a strengthening, proved inductive, that excludes the CTI's pre-state, plus the diff | {{run:RUN-z3-cti-pair}} |
| AUD-5.1 | S5 | G3 | liveness checked under stated fairness | "deadlock-free, so it terminates", filed as an invariant | SysMoBench: model-written specs violated 41.9% of liveness properties vs 8.3% of safety (arXiv 2509.23130) | a lasso | [X RUN-tlc-hold-lasso] |
| AUD-5.2 | S5 | G7 | fairness only on the system's actions | liveness "proved" under fairness of an action the environment controls | SysMoBench: fairness choices "overly technical or random" | the fairness conjunct and the lasso when it is removed | [X RUN-tlc-hold-lasso]; {{run:RUN-tlc-hold-fairness}} |
| AUD-5.3 | S5 | G5 | the `-deadlock` run that reports the violation | "TLC found no invariant violation" after a run that stopped at a deadlock [X RUN-tlc-doublespend] | this course's own v1 mock-ups printed un-run TLC numbers (2026-10-20); the executed run (2026-10-21) | the argv and the stop line | [X RUN-tlc-doublespend] |
| AUD-5.4 | S5 | G9 | one conditional UPDATE matching the atomic action | one atomic action implemented as three SQL statements | the gift-card race (2015-05-21) [starbucks15] | the code lines set against the action | [X RUN-tlc-rtw3] |
| AUD-6.1 | S6 | G11 | [T] with n and generator statistics | n differential runs stamped PROVED | CIDR 2026: about 32% of LLM SQL rewrites changed results [cidr26] | the stamp set against the method | {{run:RUN-drt-transfers}} |
| AUD-6.2 | S6 | G10 | the harness compares outcome classes (success, zero rows, SQLSTATE) | the harness compares balances only | Cedar: differential random testing found 21 bugs to the proofs' 4 (arXiv 2407.01688, 2024) [cedar24] | two runs equal on balances and different in outcome class | {{run:RUN-drt-transfers}} |
| AUD-6.3 | S6 | G6e (pool variant: G7 or G8 accepted) | the claim on 18.6 with the upstream `update-conflict-out` spec passing | the claim rests on SERIALIZABLE in an affected version, or a pool sets READ COMMITTED | Jepsen PostgreSQL 12.3: SERIALIZABLE exhibited G2-item (2020-06-12) [jepsenpg] | the version string or configuration read back, plus the history | {{run:RUN-history-g2item}}, {{run:RUN-isorun-upstream}} |
| AUD-7.1 | S7 | G10 | an observer that includes counts and sizes | an observer that sees the JSON body only | PostgreSQL 18 row-security documentation on integrity checks as a covert channel (read 2026-10-23) | paired states the observer equates and an attacker distinguishes | {{run:RUN-pg-rls-covert}} |
| AUD-7.2 | S7 | G12 | noninterference modulo the declassified share | "no tenant can ever observe any change in another tenant" | AuthV2 (ICSE 2025): all seven shadow-test mismatches came from the specification, and "no issues were found with tools or proofs" [authv2] | a legitimate feature, sharing, that the blanket claim forbids | {{run:RUN-z3-selfcomp}} |
| AUD-8.1 | S8 | G7 | at-least-once delivery with the provider's idempotency stated as [A] | "exactly once via the outbox" | Stripe's API v1 idempotency keys may be pruned after at least 24 h (read 2026-10-21) [stripeidem] | a trace with a duplicate effect | {{run:RUN-tlc-double-charge}} |
| AUD-8.2 | S8 | G8 | implementation traces validated against the spec | the code acknowledges before the durable write; the spec does not | CCF (NSDI 2025): checking the implementation against its TLA+ spec, trace validation included, found six consensus bugs (arXiv 2406.17455, §7) | the trace and its first non-conforming step | {{run:RUN-tlc-trace-validation}} |
| AUD-9.1 | S9 | G10 (G1 accepted) | aborts observable | preservation proved with an observer that ignores aborts | Csmith found CompCert's wrong-code bugs only in the unverified front end and one specification gap (PLDI 2011) [dl §2] | a pair of runs, source aborting and target committing, with equal observations | {{run:RUN-lean-abort-blind}} |
| AUD-9.2 | S9 | G11 (G10 accepted) | a validator that replays counterexamples through both semantics | a validator that checks shape, not meaning | LLM judges favor "equivalent" (arXiv 2412.05561) and about 32% of rewrites changed results [cidr26] | a distinguishing database instance | {{run:RUN-sql-shape-validator}} |

**Variants.** Each class grows to at least six exemplars, once its anchors have shipped, by seeded mutation operators whose keys are recomputed by the checker: drop parentheses, swap ∀ and ∃, ℤ → ℕ or BitVec 64, add a contradictory hypothesis, move the conclusion into a premise, insert `native_decide` or `sorry`, weaken a postcondition, drop a frame conjunct, drop or misplace fairness, split an atomic action, widen or narrow the observer, change an isolation level, replace a proof by a single-database test, stamp a bounded inductive check as proof; and, so that every class can grow, report an inconclusive result as a verdict (G5), drop a verification step and keep the claim (G6d), redefine a definition the statement uses or point the theorem at a stricter copy (G8a, G8), edit the code so that a proof goes through (G8d; G13 when the edit answers a CTI), restate an "eventually" property as an invariant or a pair property as a single-trace property (G3, G3a), pin an affected engine version (G6e), drop a declassification (G12), drop an environment assumption other than fairness (G7), reorder two effects in the implementation (G8), drop a non-functional requirement (G1a), and edit a pinned statement file or `comparator.json` (G8c). AUD-5.3 carries the G5 variant "TLC inductive check at N = 3 stamped PROVED for all N", keyed by RUN-tlc-inductive and RUN-z3-inductive-param, and a second G5 variant, liveness checked with symmetry declared, keyed by TLC's own warning [X RUN-tlc-sym-liveness]. GEN-spot-the-gap serves variants to Today (0–1 per session), the Clearinghouse and the Defence.

---

## 7. Mechanics catalog

Grades follow the pedagogy digest; "Ev" marks a mechanic with outcome evidence for its principle, "Prec" one with precedent only (V2-32). Expect tenths of an SD at most; no copy promises more.

| ID | Purpose | Evidence | One-line UX | Data touched |
|---|---|---|---|---|
| M-prequestion | prime attention before a segment | A for prequestions; C for the per-segment placement · Ev [sthilaire23] | 1–2 questions open each core segment; the answer follows in the segment | events |
| M-call-it | commit a verdict and confidence before a first run | A · Ev (retrieval); C for CBM as feedback | three taps (guess · think so · sure) with bands and chance printed; payoffs shown as feedback only; the first call is final: only it counts, and it cannot be edited | events (`call`) |
| M-which-is-it | discriminate confusables | A · Ev [brunmair19] | mixed sets within one confusable set (§4), after the exit item, ≤50% of a session | events |
| M-layered-feedback | explain, not just mark | A · Ev [vdkleij15] | witness, bound and basis always; a misconception note open by default only in novice KCs | item revisions |
| M-class-hint | stop special-case patching | B/C · Ev [dantoni15] | practice shows a witness plus its class; probes are one-shot; a fix must also kill a non-minimal witness | events |
| M-goal-replay-fading | worked examples, then backward fading | A/B · Ev [barbieri23][renkl02] | generated goal strips; blanks without prompts; one principle prompt per revealed step; six families only | Goal Replay assets |
| M-self-explanation | read proofs actively before writing them | A/B · Ev [bisra18][hodds14] | the S2.L0 unit | none credited, except the unit's closing GEN-proof-structure item |
| M-proof-blocks | ordering practice after reading | B · Ev [poulsen23] | drag or keyboard-order steps with 1–2 distractors, graded as a DAG | events |
| M-manual-mode | keep automation off the taught step | C · Ev [keenan26] | manual variants disable `grind` and `omega`, or only `grind` where arithmetic is not the taught step (LAB-3.4–LAB-3.5, §12); automated closes are flagged on the receipt | receipts |
| M-twins | contrasting cases | A · Ev [alfieri13] | sound and flawed pairs side by side before the principle | audit pool, specimens |
| M-hint-ladder | help at the point of error, gated | A−/C · Ev [bastani25][sankar26] | an explanation gate (at least 12 words, never graded), then rungs R0–R4 as §3.0 defines them; past R2 the work is assisted until an unseen variant passes | events (`assisted`) |
| M-stuck-protocol | make stuck time productive | D · Prec | offered, never timed on screen, at about 25 min (`statespace stuck`: a forum-ready example), 45 min (post it) and 90 min (a parked goal, carried as [A] in the claim, with a re-find in 7 days) | claims, events |
| M-prove-it | no-AI predictions about your own artifact | C/D · Prec | agent closed; `statespace defend` seeds and lists the mutations, the learner enters predictions in the tab, then the CLI runs each mutant and the tab grades its receipt against the recorded predictions | events (`prove-it`) |
| M-defence | sign-off without self- or LLM-grading | B− · Ev (parts) | four parts, untimed, over two or more sessions (§8.6) | events (`probe`) |
| M-audit-desk | train end-state (g) | A (small) · Ev [alemdag25] | the five-step flow of §6 with a seeded sound share | events (`audit`) |
| M-spec-duel | distinguishing scenarios by URL | B−/C · Ev [wrenn19] | a spec rides in the URL fragment; the instrument origin's own page (SCR-instrument) returns a distinguishing state; first used in S7.L3 | URL fragment only |
| M-specimen-cabinet | keep broken examples beside fixes | A/B · Ev [keith08] | mount, minimize, generalize; "kept" after a re-find at ≥7 days | specimens |
| M-re-find | same move, new specimen | A · Ev [rowland14][pan18] | a fresh generated variant of a specimen's class, under Call It | events |
| M-sure-wrong-returns | correct confident errors | B · Ev [butterfield01] | sure-and-wrong items return at about 1 day and 1 week | events, schedule |
| M-refutation-card | repeated misses on one misconception | A (science) · Ev [danielson24] | after two misses on a tag, a card that names and refutes the misconception | events |
| M-claim-card | state every guarantee in six parts | D · Prec | prefilled from a receipt, then learner-written; GATE-claims checks the "if weakened" witness | claims (repo) |
| M-assurance-strip | separate model, correspondence and requirement | D · Prec | three segments; requirement-fit never [P] | claims |
| M-seam-erosion | guarantees are relative | D · Prec | dashed seams; a vermilion crack propagates along rests-on edges | claim graph |
| M-erosion-forecast | turn erosion into prediction | D · Prec | restate the claim from memory, then call the segment that cracks | events |
| M-today | daily spaced practice | A · Ev [latimier21][cepeda08] | 10–12 min, 3–5 times a week inside the Keep block: due items on fresh seeds (FSRS at 0.85–0.90), 0–1 audit case, re-finds, sure-and-wrong returns, the resume card, change cards, erosion forecasts; the Lean keep-alive is a separate Keep session, never part of Today | events, derived FSRS state |
| M-welcome-back | resumption, never debt | B · Ev [silverman23] | after ≥7 idle days a welcome-back set; after ≥14 a 20–30-min "Back at the bench"; after ≥6 weeks a landmark restart; no overdue counts | events |
| M-set-your-week | plan at the pessimistic end | B · Ev [buehler94] | a range target, two Bench blocks ("study blocks" until LAB-1), a Keep block; "met in k of the last 12 weeks" (target ≥ 8) with 7-day repair and two reserve weeks | settings |
| M-weekly-review | recorded monitoring | A · Ev [harkin16] | 5 minutes over Claims: "what can I now reason about?"; an optional human reviewer (OD-9) | events (uncredited) |
| M-monthly-retro | 1–2 if-then plans | A (small) · Ev [sheeran25] | 15 minutes, re-prompted at stage start and re-entry | settings |
| M-notes | write to learn | A (small) · Ev [bangertdrowns04] | 600–1,000 words after S2, S5, S7, S9, prompted in roadmap rule 5's three parts (the model, the surprising failure, what changed your understanding), from memory first; specimens and receipt hashes attach afterwards; published by the learner, for example in their public lab repo, which is optional and never required | notes (repo) |
| M-explain-back | explanation as practice | A/B (small) · Ev [kobayashi19] | the Defence's Part D; required, uncredited | none credited |
| M-test-out | skip what you can show | A · Ev [tetzlaff25] | 3 fresh items per KC, passed at two of three with the constructed answer right, confirmed by one more 7–14 days later (§8.6); a "From kernelspace" placement pre-credits only evidenced KCs | events |
| M-mirror | private calibration and VRK₃₀ | B/C · Ev [stone00] | bias (band midpoint minus accuracy, with accuracy's Wilson interval) and hit rate per band with Wilson intervals; a band is diagnosed only with at least 20 calls and an interval wholly outside it (§8.5) | derived |
| M-change-cards | the field or a tool moved | D · Prec | "N things you learned have changed": struck line, new line, source, two retrieval items | facts registry, runs diff |
| M-feels-harder | set expectations | B · Ev [deslauriers19] | a card at Boot and at the start of S2 | none |
| M-lean-keep-alive | slow proof-skill decay | A (decay) · Ev [tatel25]; dose D | 20–30 min every 2–3 weeks while Lean is idle (S5–S8 on the default path), as its own Keep session, on the learner's own definitions; it starts only once S2 is signed off | events |
| M-cti-workbench | a satisfiable step is not yet a bug | A (contrast) · Prec | a `sat` inductive step → bounded reachability → "strengthen" or "fix" | events |
| M-telescope | see the state space | D · Prec | the Spectacle view's minimap, up to about 5k states (internal name: telescope); TLC counts precomputed in CI | runs |
| M-pocket-checkers | grade witnesses offline on phones | D · Prec | build-time predicates, property-tested against Z3 in CI (internal name; learners see only "checked offline") | bundle |
| M-docket | the Clearinghouse, a persistent world (internal name: docket, the weekly incident queue) | D · Prec | a seeded Mini-Plinth world run by INS-interp, with the learner's components plugged in (checker, compiler, outbox machine and validator, BRIEF §7.4); 1–3 incidents a week, an erosion taking one of the slots: mutation-generated agent proposals, each sound with a seeded probability of 30–60%; gap-class incidents whose thresholds are proven against a naive and a reference baseline (RUN-docket-baselines, re-executed nightly by GATE-audit); erosions from the oldest open erodible seam | derived docket state, events |
| M-hall-of-records | dated incidents as toy models | D · Prec [newcombe14] | a "dated incidents" filter in the specimen cabinet (internal name: Hall of Records); cards with sources; models re-run in CI (SP-1.9, SP-1.10, SP-4.5, SP-5.7, SP-6.11, SP-8.5) | runs |
| M-production-twin | meet the real system | D · Prec | tracing questions on an upstream counterpart pinned at a SHA, or by content hash and read date for a documentation page; 60-day TTL | facts registry |
| M-sibling-bridge | link, do not re-teach | D · Prec | a bridge card plus a self-contained prerequisite card; sibling completions count as test-out evidence | events |
| M-public-counterexample | an optional final rung | D · Prec | an upstream issue or PR plus a witness any browser replays | claims |
| M-overlay | your system, privately | D · Prec | local-only re-stamping of "your system"'s guarantees; nothing leaves the device or enters the repo | local storage |
| M-consent | respect bandwidth and storage | D (OD-6) | downloads above 5 MB, counted as one engine's compressed first load, ask first; content-hashed caching with a kill switch | settings |

---

## 8. Assessment

### 8.1 Principles

- **Checkers decide, about the learner too:** Z3, TLC, Spectacle, the interpreter, `lake comparator`, cargo, and keys computed by engines at grade time. Lean's manual treats un-reviewed AI-generated proofs as potentially malicious and prescribes the comparator [leanvp].
- **Language models only propose** reading prequestions, adversarial cases and hint wording at authoring time; a witness certifies each flaw. No model grades, and no item is generated by a model at run time.
- **The course stamps its own assessments.** A passed Defence is [T] (n unseen items), never PROVED competence; a self-grade is [A].
- **Claims are not Evidence.** Claims record what artifacts establish, and agents may produce them, so claims never move "signed off"; an agent's claim goes to `proposals/`, renders as quoted UNREVIEWED text and is never stamped (I8). Evidence credits only unassisted, checker-graded work on unseen seeds.

### 8.2 Evidence events and provenance

Each event records `{id, v, kind, ref, itemRev, engine@version, seed, ok, conf, resp, mis, provenance: own | assisted | agent, seen | unseen, at, tz, day, dev, ms}`: `v` is the per-kind shape version; `resp` the response and `mis` the misconception tag it matched, which M-refutation-card reads; `at` carries the local UTC offset, and `tz` and `day` freeze the local date at write time for sessions, spacing and "met in k of the last 12 weeks"; `dev` names the device for multi-device merges (W1-T03). Kinds: `call`, `item`, `probe`, `audit`, `prove-it`, `lab-check`, `receipt-import`, `explain-back`, `note`, and an uncredited `view` (a drawer opened, logged as help-seeking); an `item` event's `ref` marks a placement, test-out or confirmation context. The learner model is derived from events at read time (I2). Provenance is self-declared and calibrates rather than polices; the copy says so (OD-8).

| Provenance and exposure | Weight | Counts toward |
|---|---|---|
| own · unseen · generated (fresh) | 1.0 | sign-off, settled, VRK₃₀, Judgment |
| own · unseen, authored (a first exposure to a fixed cell or anchor) | 1.0 | Judgment; scheduling |
| own · seen (practice) | 0.3 | scheduling only |
| assisted (past rung R2, or a context packet used) | 0.3 | scheduling only, until an unseen variant passes unassisted |
| automated (a tactic closed a step taught in manual mode) | — | a flag on receipts and claims only, which never count as evidence, so it never weighs an evidence event |
| agent | 0 | may produce claims; never evidence |

Lab checks and imported receipts produce claims and specimens; probes, Prove-it items, audit findings and generated items produce evidence.

### 8.3 Generator families

Seeds are drawn at grade time; each family has 2–4 structurally different templates banded by operator count, quantifier alternation, trace length and process count; distractors are misconception mutants (pedagogy digest §2), each tool-checked as distinct from the key and tagged with a misconception ID (a `dp:` key, §0; S4's proposed split of dp:O4 and dp:O5 into one entry per error, and its entries for "a dropped premise yields a false proof" and "agreeing solvers certify the encoding", take the next free O numbers, and D-drawers' proposed dp:G10 (a precedence or scope misread) and dp:G11 (quantifier order swapped) join the proposed entries, all under `docs/EVIDENCE.md` §6.11). `unknown` instances are discarded. Oracles are "unseen, not secret": a static site cannot hide them.

| ID | Learner produces | Grader (key at grade time) | Templates | Stages | Ships |
|---|---|---|---|---|---|
| GEN-negate-it | a negation or violation query | Z3 checks P⇒R and R⇒P over a decidable fragment; returns a distinguishing state; non-vacuity mandatory | 4: single guard · two-state · quantified over accounts · English "only if"/"unless" | S1, S4 | W1 |
| GEN-spec-it | a property or policy | as above, against a reference; requirement fit via multiple true/false scenarios | 3: property · policy · postcondition with frame | S4, S7 | W2 |
| GEN-wp-it | a weakest precondition | Z3 equivalence with the reference | 3: assignment · sequence · guarded command | S4 | W3 |
| GEN-find-the-witness | a model, state, trace, history or state pair | the engine itself; no stored key; then name the class | 4: model · trace · history · state pair | S1–S9 | W1 |
| GEN-cti-or-bug | a verdict on an invariant | Init⇒Inv, Inv∧Next⇒Inv′, Inv⇒Safe; a "CTI" key is certified by a strengthening proved inductive at grade time, a "reachable" key by a trace that replays, and a seed that yields neither is discarded (bounds printed) | 3: inductive · CTI · reachable | S4, S5, interleaved to S9 | W3 |
| GEN-trace-allowed | one satisfying and one violating trace | TLC state graph; in S7, bounded trace enumeration over INS-interp, bound printed | 3: safety prefix · enabled actions · stuttering | S5, S7, S8 | W3 |
| GEN-lasso-or-not | a lasso, or "none" | lasso validator over TLC graphs | 2: starving · fair cycle | S5, S8 | W3 |
| GEN-anomaly-id | a history class | history checker on Bench-recorded PostgreSQL 18.6 histories, drawn from RUN-pg-catalog's seeded grid, with each template's unseen supply reported by GATE-generators | 4: read-modify-write · write skew · read skew · serialization failure or deadlock | S6 | W4 |
| GEN-leaks-to-observer | a state pair the observer tells apart, or "none" | paired-state evaluator | 3: field leak · count channel · size or abort observer | S7, S9 | W4 |
| GEN-call-it | a verdict and confidence; true/false over about 5 scenarios | keys computed at grade time | 4: three-way verdict · trace length as an interval · which anomaly · multiple true/false | all | W1 |
| GEN-which-stamp | the stamp and qualifier for a raw output | the verdict→stamp table (§8.8) | 3: raw output → stamp · complete the qualifier · which strip segment | all | W1 |
| GEN-proof-structure | the next goal, a Proof Blocks order, or the needed hypothesis | goals from real elaboration; DAG grading; hypothesis deletion in CI | 3: next goal · Proof Blocks with 1–2 distractors · needed hypothesis | S2, S3, S9 | W2 |
| GEN-defend | predictions about seeded mutations of the learner's own artifact | comparator, TLC, Z3, cargo | 4: change a hypothesis or the statement · weaken a guard or check · change the encoding or the trusted base (the checking route, such as `native_decide`) · change concurrency, the environment or the observer | S1–S10 | W2 |
| GEN-spot-the-gap | a gap class and typed evidence for an audit variant | keys from the checker run on the mutated pair member | 4: rebutting · undermining · undercutting · sound | all | W1 |

Fourteen families, 47 templates. GATE-generators enforces purity and template variety; GATE-items and GATE-audit-blind enforce validity. The Stages column is generated from the lesson rows' Generators column, as §9.1's "Used in" is, and GATE-links fails on any mismatch. Cells that are not lesson-derived are exempt: "all", GEN-defend's S1–S10 (Part B of every Defence) and the "interleaved to S9" tail of GEN-cti-or-bug; Defence Part A sampling (S10's Defence draws GEN-find-the-witness items, for example) adds no stage.

### 8.4 Modes and item rules

*Practice* shows witnesses and class hints. A *probe* is one shot, with feedback only after submission, because counterexamples invite patching the special case [dantoni15]. Graded items stay in decidable fragments, with labeled bounded checks as the fallback. A `sat` answer is graded by checking the witness, never by matching a model, because model values are not canonical: the native and Pyodide wrap runs posed different queries and returned different witnesses [X RUN-z3-bv64, RUN-z3-bv64-pyodide], and GATE-conformance records a same-query pair. At least 30% of calls are genuine surprises (a call is one when the narrative-blind strategy, violated or `sat` on a scene's first run and holds or `unsat` after an edit framed as a fix, predicts the wrong verdict), no verdict exceeds 60% of a stage's calls, and every option carries a "why" and a misconception ID (GATE-items).

*Formalize progression* (V2-26). GEN-negate-it and GEN-spec-it items are served per KC as **pick** (choose the right formalization among misconception mutants), then **fix** (repair a near-miss, graded by Z3 equivalence), then **write** (from scratch); the item moves to the next mode after two unseen successes and back after two misses. *Interpretation tap* (BRIEF §5.1). After a solver run in S1–S2 the learner taps "so P holds", "so P is violated" or "can't tell" before the stamp appears; the tap fades once the KC's fresh items are solid.

### 8.5 Call It

- Asked only on first runs of authored cells and on generated items; free runs stay ungated, with an expert skip once a KC is solid. Only the first call counts.
- Confidence is three taps with printed bands taken from certainty-based marking's switch points: *guess* (below 67%), *think so* (67–80%), *sure* (above 80%) [cbm]. The item shows its chance level, 1/k. A multiple true/false set (GEN-call-it template 4) takes one confidence for the whole set, is right only when every statement is, prints its chance as 1 in 2^m for m statements and sits in its own Mirror bin; a trace-length interval item prints 1/k over its k offered intervals [D]. The payoffs (+1/0, +2/−2, +3/−6) are shown before choosing and used as feedback only, never as credit [baldiga14].
- The Mirror leads with bias (stated confidence minus accuracy) and hit rate per band with Wilson intervals; only post-instruction, unassisted calls count. Stated confidence is imputed from band midpoints, one constant set [D]: for *guess*, midway between the item's chance and 2/3; 0.73 for *think so*; 0.90 for *sure*; bias's interval is that mean minus accuracy's Wilson interval. A band is diagnosed only when it holds at least 20 calls and its Wilson interval lies wholly outside the printed band.
- Sure-and-wrong calls return at about 1 day and 1 week (M-sure-wrong-returns).

### 8.6 The Defence, sign-off and settled

The Defence has the four parts of §3.0 (A probes, B defend, C audit, D explain-back), untimed, over at least two sessions within a week of the lab [serth22].

- **Signed off:** Parts A–C taken over at least two sessions, at least 75% overall and each part at least 60%, with the Wilson interval shown (for example, 10 of 12 gives 0.55–0.95 [D]); every credited part has at least four items, so a single miss never fails a part; Part C has four cases, at least one sound; plus fresh items on the stage's KCs answered correctly in at least three spaced sessions (successive relearning [higham22]). "Signed off" is a learner state drawn in ink; it never borrows a stamp's color and never locks anything.
- **Settled:** one fresh probe per KC correct at least 30 days after the stage's sign-off date; settled KCs feed VRK₃₀.
- **Retake:** a failed part is retaken on fresh seeds at least 3 days later; only the failed part or parts are re-sampled; nothing locks in the meantime; every attempt stays in the event log as evidence.
- **Test-out:** three fresh items per KC, passed at two of three with the constructed answer right, the items composed so that a blind guesser passes at most 1 time in 20; one attempt per KC per day; confirmed by one more fresh item 7–14 days later [D]. Credit from placement or test-out reaches a KC only once its hard `requires` are credited.
- **Grade:** B− overall. Retrieval (A), case sampling and explanation support Parts A, C and D; Part B has face validity only.

### 8.7 Stamps

| Stamp | Code | Required qualifier | Shape cue |
|---|---|---|---|
| PROVED | [P] | checker@version, for example "Lean 4.35.0 kernel" or "Z3 5.3.1 unsat · uncertified · rlimit N" | solid |
| MODEL-CHECKED | [M] | constants; complete or partial | dotted |
| TESTED | [T] | n and generator statistics | outline |
| ENFORCED | [E] | where | double rule |
| CONFIGURED | [C] | source, read back when | thin rule |
| ASSUMED | [A] | why | dashed |
| UNKNOWN | [?] | reason | hatched |
| NOT COVERED | [N] | what is outside the model | bare |
| REFUTED | [R] | witness length (actions, steps or rows) | solid vermilion with a ring, so it separates from [P] in grayscale at night |

EROSION is an event drawn as a crack, not a stamp. Stamps arrive with the stages that need them. GATE-codes keeps codes bracketed and IDs unbracketed; GATE-stamps derives every stamp from a receipt.

### 8.8 Verdict → stamp

| Raw output | Stamp |
|---|---|
| `unsat` of ¬P on the learner's encoding | [P] of the encoding, with an open defeater "encoding unverified" and the qualifier "uncertified"; a cvc5 cross-check adds "Z3 and cvc5 agree" and keeps "uncertified", because agreement is not a checked certificate (D-32) |
| `sat` plus a model | [R], after the witness replays |
| `sat` plus a model that does not replay in the interpreter | no stamp; a defeater against the VC generator |
| `unknown`, a timeout or an `rlimit` stop | [?] with its reason; fails closed when it guards enforcement [bpa] |
| TLC "no error", complete exploration | [M] · constants · complete |
| TLC or Spectacle stopped by a bound or state constraint | [M] · bound · partial |
| TLC's `-simulate` mode [X RUN-tlc-help], or Lamport's random-subset inductive check | [T] · n traces (or n sampled states) · constants |
| TLC stopped at "Deadlock reached" before exploring all reachable states (the invariant was checked only on the states explored) | [?] · stopped at deadlock, n distinct states (or [R] if the property was deadlock freedom) |
| TLC's inductive check (`Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` over the states `TypeOK` enumerates) at fixed constants, and Apalache's, treated as bounded the same way until a run shows otherwise [D] | [M] · constants · "inductive at N = k"; never [P] |
| Z3 `unsat` of `Init ⇒ Inv` and of the inductive step with the parameter as an uninterpreted sort | [P] · Z3 5.3.1 unsat · uncertified, for every N, with a premise witness and the open defeater "encoding unverified" (the SMT translation of the spec) |
| Lean: comparator accepts, axioms standard | [P] · Lean 4.35.0 kernel · axioms listed (+ "6 checkers" after `--paranoid` [X RUN-lean-comparator]) |
| Lean: `sorryAx` present | no [P]; the claim reads "PROVED modulo k assumed lemmas", each lemma [A] |
| Lean: a custom axiom present | no [P]; treated like `sorryAx`, the axiom carried as [A] |
| Lean: a `_native` axiom | [P] · kernel + compiler |
| Lean: comparator reports a statement or constant mismatch | the claim voids to [?] · statement mismatch |
| Differential testing, no divergence | [T] · n, generator statistics |
| Shadow or gold mismatch | no stamp; a defeater against both sides |
| "Results match" on one database | [T] · 1 instance |
| Trace validation over n seeds | [T] · n seeds, composed with the spec's [M], for safety-shaped claims only: finite traces cannot test eventuality, so a liveness claim (CL-8.4, CL-8.5) keeps its correspondence [A] |
| A setting read back from the system | [C] · source |
| A runtime check or constraint in place | [E] · where |
| A language model says "equivalent" or "proved" | no stamp; quoted UNREVIEWED text |
| A Clearinghouse rule stays quiet over n world calls | at most [T] · n calls; never [P] or [M] |
| A Clearinghouse rule fires | [R] · witness length, once the witness replays |
| A course-authored claim under audit in the Clearinghouse | quoted text, no stamp |

### 8.9 What this cannot establish

Printed on the course's own assurance page (SCR-assurance): unassisted work is self-declared; oracles are visible to a determined learner; Defence Part B has no outcome data; the measurements describe one learner (n = 1) and support no causal claim.

---

## 9. Instruments, lanes, receipts, runs and the Bench CLI

### 9.1 Tab instruments (instrument origin unless the origin note names another)

"Used in" is generated from the lesson rows (and, for Lane A, the lab stages that name it); GATE-links fails on any mismatch. Origins: INS-pocket runs on the main origin, so Today grades offline; INS-goal-replay and INS-theater render build-time course data on the main origin; INS-interp, INS-history and INS-receipt parse untrusted input on the instrument origin and render course data on the main origin; every other row runs on the instrument origin.

| ID | Engine and pin | Used in | Honest limits |
|---|---|---|---|
| INS-z3 | Z3 5.3.1 via the `z3_solver` pyemscripten wheel on Pyodide 314.0.7, in a module worker on the instrument origin; no cross-origin isolation needed [X RUN-z3-starter-pyodide, RUN-browser-origin] | S1–S7, S10 | budgets are `rlimit`, because `timeout` never returned under Pyodide in a Node harness [X RUN-z3-budget-pyodide] (browser timing is {{run:RUN-phone-pyodide}}); `worker.terminate()` is the hard stop; model values are not canonical, so witnesses are checked, never matched; the first load needs consent (OD-6) |
| INS-goal-replay | goal strips generated at build time from real Lean 4.35.0 elaboration via `$/lean/plainGoal` {{run:RUN-lean-plaingoal}}; recorded `#guard_msgs` outputs | S2, S3, S9 | not live Lean; regenerated on every toolchain bump (GATE-replay); no embedded WASM Lean, reported at 137.5 MB and needing isolation {{run:RUN-lean-wasm}} |
| INS-interp | the Mini-Plinth reference interpreter and the S9 target IR, a TypeScript port | S2–S4, S6, S7, S9, S10 | a port: the Lean semantics is the reference; [T] against kernel-checked goldens for the S3 fragment and the S9 target IR (GATE-interp); its S7 access extension has no Lean reference |
| INS-derivation | the Derivation Board; each step is one Z3 validity query | S4 | the supported fragment only; follow-on errors are not double-counted |
| INS-theater | authored scenes as TLC state graphs (`-workers 1`, explicit deadlock flag), enabled-action controls, branching history | S5, S8 | monitors report observations, not stamps; only TLC or Spectacle results earn [M] |
| INS-spectacle | Spectacle at commit 5827c22, vendored (MIT); counts equal TLC's on the double-spend family [X RUN-spectacle, RUN-tlc-full] | S5, S8 | learner edits capped at about 5k states [D]; no PlusCal (translated at build time) and no fairness or liveness; a conformance gate guards every bump |
| INS-lasso | a lasso validator over TLC graphs and imported traces | S5, S8 | exact on finite graphs; tested against TLC fixtures; TLC 1.8.0's JSON closes a lasso with a final action whose target is state 1 [X RUN-tlc-hold-lasso], which W0-S05 documents |
| INS-pglite | PGlite reporting PostgreSQL 18.6, one connection, measured under Node [X RUN-pglite]; the browser run is W0-S08's {{run:RUN-pglite-0511}} | S6–S9 | two "concurrent" sessions serialize, so concurrency is replayed from Bench histories; RLS awaits W0-S08 |
| INS-history | viewer and replayer for Bench-recorded multi-session histories, plus the abstract-serializability checker | S6–S8 | bounded search (n ≤ 6–8 transactions, pruned), so results are [T]; shows anomalies present, never absent |
| INS-datalog | Z3 `Fixedpoint` in the Z3 worker (measured under Pyodide in a Node harness [X RUN-z3-fixedpoint]), or a TypeScript evaluator differential-tested against Soufflé | S7 | decided by W0-S03; equal relations and derivation heights to Soufflé are gated |
| INS-pairs | a paired-state evaluator over the reference interpreter | S7, S9 | finite domains; bounds printed |
| INS-sim | the learner's wasm outbox machine under recorded fault seeds | S8, S10 | not authoritative; TLC trace validation on the Bench is |
| INS-lane-a | host for the learner's Rust compiled to wasm with the family's zero-import ABI; per-check results, each check in a fresh instance of one compiled module, the worker replaced after a timeout | S3 (LAB-3), S4, S6, S8–S10 | time-limited per check; reference modules earn nothing |
| INS-receipt | importer for Lane B receipts by file or URL fragment, parsed on the instrument origin and shown on its page (SCR-instrument) | all labs | schema-validated and size-capped (a URL fragment carries at most 32 KiB encoded [D]; a larger receipt imports as a file), never rendered as HTML; shows its lane, and only the tab assigns *re-checked here* |
| INS-pocket | build-time TypeScript predicates that check witnesses offline on phones | S1; Today items whose witnesses it covers | a second semantics, so CI property-tests it against Z3 (GATE-conformance) |

Disclosed, uncredited link-outs (OD-4): live.lean-lang.org, the Natural Number Game, TLA+ By Example (which runs TLC through a vendor CDN), Alloy4Fun and TigerBeetle's simulator. No embedded CheerpJ. No page requests a third-party origin unless the learner follows a link-out (GATE-bundle's route tests).

### 9.2 Bench engines (Lane B, authoritative)

| ID | Engine and pin | Notes |
|---|---|---|
| INS-bench-lean | Lean 4.35.0, core plus Std, `autoImplicit false` {{run:RUN-lean-template}}; `lake check`, and `lake comparator` with `--paranoid` [X RUN-lean-comparator]; the toolchain unpacks to 3.0 GB [X RUN-lean-toolchain] | the sandbox is Linux-only (bubblewrap) and recorded as on, off or failed, never required [X RUN-lean-bwrap-docker]; macOS and Windows learners use the devcontainer; no `lake check --paranoid` has passed on disk (the one attempt failed at the sandbox [X RUN-lean-toolchain]), so nothing depends on it until W0-S06 records one |
| INS-bench-tlc | `tla2tools` 1.8.0 (build 2026.10.20.183001), vendored with its license and pinned by SHA-256, pre-release, writes JSON traces; 1.7.4 as text-trace fallback in CI [X RUN-tlc-jars, RUN-tlc-doublespend]; Java 21 | minimal traces only with `-workers 1`; argv always recorded |
| INS-bench-pg | PostgreSQL 18.6 in Docker [X RUN-pg-anomalies], multi-session through `statespace isorun` {{run:RUN-isorun-upstream}} | re-record the catalog after PostgreSQL 19 GA (OD-12); link `/docs/18/` |
| INS-bench-smt | Z3 5.3.1 [X RUN-z3-starter] and cvc5 1.4.2 (the executed run used the pip wheel, whose version string reads `1.4.2-modified` [X RUN-cvc5-alethe]; the Bench binary is recorded in {{run:RUN-scaffold}}) | authored `unsat`s are cross-checked; certificate replay is a deferred drawer (D-32) |
| INS-bench-souffle | Soufflé {{run:RUN-souffle-version}}, with the CPU architecture recorded | the Datalog reference for S7 |
| INS-bench-cargo | the Rust toolchain with `tokio-postgres`, `testcontainers`, `pg_query` and `proptest` at versions pinned in the devcontainer {{run:RUN-scaffold}} | Lane A crates build to wasm here first |
| INS-bench-apalache | Apalache {{run:RUN-apalache-version}}, optional | inductive-invariant checks in S5.L9, treated as bounded by the constants and types it instantiates until a run shows otherwise [D]: [M], never [P] alone (D-18) |
| INS-bench-alloy | Alloy {{run:RUN-alloy-version}}, optional | the D-16 drawer only |

### 9.3 Lanes

- **Lane A:** the learner's Rust compiled to wasm and graded in the tab on seeds drawn at grade time; one JSON IR, emitted by `lake exe`, links S3, S6 and S9. Mismatches are triaged as spec, implementation, tool or proof errors.
- **Lane B:** receipts from Lean, TLC and multi-session PostgreSQL, imported into the tab. Every stamp names its lane: *re-checked here*, *reported from your machine*, or *self-assessed*; a CLI receipt can carry only the last two, and only the tab assigns *re-checked here*. Learner copy shows only these badge words; "Lane A" and "Lane B" are internal names. A course-recorded run, shown on a phone or while a worker is cold, carries the label *recorded run* with its run id (*recorded result* in Boot, §0) and mints no learner stamp, claim or evidence.
- **Phones:** predict, see a recorded run with its run id, then leave the hands-on work for the laptop; with no server, the phone's list stays on the phone, and only export and merge-import (W1-T20) carry it to another device.

### 9.4 Receipt v1 (outline; one JSON Schema generates TypeScript and Python types)

`schema: "statespace/receipt@1"`; `lab`, `stage`, `lane` (a CLI receipt carries only `reported from your machine` or `self-assessed`), `createdAt`; `environment` (devcontainer digest, OS, CPU architecture, sandbox `on | off | failed`); `tools[]` (name, version, binary SHA-256); `statements[]` (path, SHA-256 over the text with trailing whitespace removed (`trimRight`, whose code-point set, ECMAScript's, the schema writes out once, so the Python CLI does not use `str.rstrip()`; shared test vectors run under GATE-schema) plus one newline, matching Comparator Live's challenge hash `sha256(challenge.trimRight() + "\n")` [dl §2]); `runs[]` (engine, version, argv, input SHA-256, budget as `rlimit | workers | seed`, exit code, verdict lines parsed verbatim); `lean` (toolchain, `checkers[{name, version, verdict}]`, `challengeSha`, axioms per theorem, `nativeAxioms`, `sorryCount`, automation flags, `lints[]` such as a flagged `declare_syntax_cat`); `goldens` (`poolSha`, n, passed, failed, `noVerdict`); `tlc` (spec and config hashes, constants, flags, distinct states, depth, result, trace file); `z3` (SMT-LIB hash, entry path `cli | api`, `rlimit`, verdict, `reason_unknown`); `pg` (server version, isolation level, history hash, SQLSTATE classes; `rls`: role mode, policy hash, read-backs, disagreements); `traces` (n, seed-list hash, per-trace verdicts, first non-conforming lines); `datalog` (engine, relation hashes, derivation checks, generator statistics); `pairs` (witness, relation and observer hashes, bound); `checks[{id, pass}]`; `provenance` (`assisted: none | explain | code`, self-reported; `agent: bool`; `guard: on | off`, off when the agent-guardrail hook was switched off with `STATESPACE_GUARD=off` [D]); `claims[]` (CL IDs to mint or update); `tcb[]`. A receipt never trusts an exit code alone; it parses every verdict. A changed statement hash voids the claim to [?]. Sigstore attestation stays off by default (OD-13).

### 9.5 Runs registry

`runs/<RUN-id>.json` records `{id, engine, version, binarySha256, image, argv, input, inputSha256, budget, outputs, recordedAt}`, and a run with several configurations repeats `argv`, `input`, `budget` and `outputs` as `configs[]`, one entry each. Copy cites `{{run:RUN-id}}`; GATE-numbers fails on any untagged tool number, verdict, flag or version; GATE-runs fails a release, and fails the fast lane for any content not labeled draft, on a `{{run:ID}}` that does not resolve to `runs/ID.json` (the format placeholders `{{run:RUN-id}}` and `{{run:ID}}` in code spans are exempt); a tool bump re-runs everything and opens a reviewable diff (GATE-runs). W0-S11 imports the executed runs below from `research/`.

**Executed (37).** A run is listed here only when its output log is on disk; runs whose evidence is a script plus report prose wait under "To record". `RESULTS.md` counts as an executed record (precedence item 2) but holds no argv, so W0-S11 re-runs RUN-lean-selftransfer, RUN-tlc-atomic, RUN-tlc-unsafe-3w and RUN-tlc-full's two-worker figure with argv recorded before copy cites their counts; RUN-tlc-atomic's "no error" suggests the deadlock check was off, since its final state enables no action.

| Run | Records | Source |
|---|---|---|
| RUN-z3-starter | Z3 5.3.1: the roadmap starter gives `sat [b = 0, amount = 1, a = 0]`, then `unsat` | `research/spikes/RESULTS.md`; `research/evidence/a2r3/out/z3_5.3.1.txt` |
| RUN-z3-starter-pyodide | the same starter on Pyodide 314.0.7 with the 5.3.1.0 wheel in Chromium 153, Firefox 155 and WebKit 26.6, not cross-origin isolated, ready in 1.46–1.71 s (the first-load size is recorded on real devices in {{run:RUN-phone-pyodide}}) | `evidence/A5r3/browser-runs.log` §1 |
| RUN-z3-optimize-min | minimal overdraft amount 1 under an Optimize objective | `evidence/a2r3/out/z3_5.3.1.txt` |
| RUN-z3-conservation-noguard | conservation over Int proved with no guard | same |
| RUN-z3-bv64 | signed BitVec 64: guarded sender `unsat`; recipient wrap `sat` (B = 9223372036850581504, X = 4194304); conservation modulo 2⁶⁴ proved; unsigned guard with a signed check `sat` | `RESULTS.md`; `a2r3/out/z3_5.3.1.txt` |
| RUN-z3-bv64-pyodide | under Pyodide in a Node harness, a recipient-wrap witness for `B ≥ 0, M > 0, B + M < 0`, a different query from RUN-z3-bv64's guarded one, so no same-query comparison exists yet | `evidence/A5r3/z3-pyodide.log`; `A5r3/scripts/z3unk.mjs` |
| RUN-z3-unknown-pow | `x**y == 8, y > 1` → `unknown`, "incomplete (theory arithmetic)", on 5.3.1 and 4.15.4 natively and under Pyodide in a Node harness; the native log also records `∀k. f(k) > f(k+1), f(0) = 0` → `unknown`, "incomplete quantifiers", and `∀k. k·k ≠ y` → `sat [y = 2]` | `a2r3/out/z3_unknown.txt`; `A5r3/z3-pyodide.log` |
| RUN-z3-budget-pyodide | under Pyodide in a Node harness, `s.set('timeout', 2000)` never returned (stopped at 25 s); `rlimit` 5e6 → `unknown (canceled)` in 1.1 s | `A5r3/z3-pyodide.log` |
| RUN-z3-11179 | issue #11179 inputs through the command line: 5.3.0 → `unsat` on both satisfiable inputs; 5.3.1 → `unknown`; through the Python API, `unknown` on 5.3.1, 5.3.0, 5.1.0 and 4.15.4 | `a2r3/out/z3_11179_cli.txt`, `z3_11179.txt` |
| RUN-z3-refund-a21 | refund theorem (customer ≥ 0) `unsat` with a modify-style update, `sat` with a value update; merchant ≥ 0 after refund `sat` | `a2r3/out/z3_5.3.1.txt` |
| RUN-z3-selftransfer | buggy-update self-transfer changes the balance: `sat [n = 1, t = 0, f = 0]` | same |
| RUN-z3-fixedpoint | under Pyodide in a Node harness, `Fixedpoint` with stratified negation: `canread(1,3)` sat, revoked `canread(1,4)` unsat | `A5r3/z3-pyodide.log` |
| RUN-cvc5-alethe | cvc5 from the pip wheel, version string `1.4.2-modified` recorded verbatim: `unsat` on the guard query with a 19-line Alethe proof containing a `hole` step (only the proof's first lines are on disk, so copy cites a `hole` step, never a count; W0-S11 commits the full proof) | `a2r3/out/cvc5_alethe.txt`; `a2r3/scripts/cvc5_alethe.py` |
| RUN-lean-ledger | core Lean 4.35.0 proves the four ledger theorems; conservation uses `[propext, Quot.sound]` | `RESULTS.md`; `research/spikes/lean/Ledger.lean` |
| RUN-lean-selftransfer | `xferBuggy (fun _ => 10) 0 0 5 0 = 15` by `decide`; the fixed version gives 10 | `RESULTS.md` |
| RUN-lean-axioms | axiom probe: `grind` adds `Classical.choice`, `omega` does not; `_native`, `sorryAx` and a custom axiom listed; `lake check` errors while logging "Lean default kernel accepts the solution"; a `sorry` file exits 0 | `evidence/lean-measure/proj/check-bad.out`; `lean-measure/run.out`; `a2r3/out/lean_trust.txt` |
| RUN-lean-skipkernel | a `debug.skipKernelTC` proof of `False` builds with exit 0; `leanchecker` rejects it | `a2r3/out/lean_trust.txt` |
| RUN-lean-comparator | honest "Your solution is okay!" (exit 0); weakened statement "theorem statement do not match" and redefined `transfer` "Const does not match" (exit 1); `--paranoid` runs six checkers in about 3 s | `A5r3/comp-run2.log`, `comp-run5.log`; `lean-measure/proj/judge/*.out` |
| RUN-lean-bwrap-docker | no bubblewrap exits 2; bubblewrap under default Docker exits 1, the code of a rejection (the relaxed container options of the later passing runs are not on disk; RUN-bwrap-lanes records their `docker run` argv) | `A5r3/comp-run2.log` |
| RUN-lean-mathlib | a Mathlib `Finmap` project's packages: 7.3 GB | `A5v2/mathlib-measure/measure.out` |
| RUN-lean-toolchain | the 4.35.0 toolchain unpacks to 3.0 GB and bundles the extra checkers; the `lake check` and `lake comparator` help texts (exit codes 0, 1 and 2; `bubblewrap` required; `lake check` errors on any non-standard axiom in the default targets; `permitted_axioms` "deliberately not defaulted"); `lake check` and `lake check --paranoid` fail at the sandbox on the measuring host | `lean-measure/run.out`; `lean-measure/measure.log` |
| RUN-lean-refund-a21 | Lean renderings of AUD-2.1: as written, the `.update` chain does not elaborate, and with the syntax repaired the shown proof fails in `omega`; with the proof repaired, `refund_nonneg` (customer ≥ 0) is proved with `[propext, Quot.sound]` and `refund_breaks_inv` (the merchant can go negative) with `[propext]`; under a value update the statement is false (`refund_nonneg_false`, `[propext]`) | `a2r3/out/lean_audit.txt`; `a2r3/lean/Audit*.lean` |
| RUN-tlc-doublespend | DoubleSpend (Init 100, Amount 80, two workers) on 1.7.4 and 1.8.0: default flags stop at "Deadlock reached" with 10 distinct states; `-deadlock` reports the violation at 11 distinct states with a 5-state, 4-action trace; 1.8.0 writes JSON traces, 1.7.4 rejects `-dumpTrace` | `A5r3/tla/run.log`; `A5spike/tla174/*.log`; `RESULTS.md` |
| RUN-tlc-atomic | the atomic variant: no error, 4 distinct states; three workers at Amount 40: 8 distinct | `RESULTS.md` |
| RUN-tlc-full | full reachable space for 2–5 workers: 11, 45, 191, 813 distinct states | `RESULTS.md`; `A5r3/tla/run-full.log` |
| RUN-tlc-unsafe-3w | the unsafe spec with three workers at Amount 40: violated, 69 distinct when found | `RESULTS.md` |
| RUN-tlc-rtw3 | read/check/write split: a 7-state, 6-action trace; 20 distinct states | `a2r3/out/tlc_runs.txt` |
| RUN-tlc-hold-lasso | the Hold spec with fairness on Try and Busy only: EventuallyResolves violated by the lasso Try, Busy, Try, then Busy back to state 1; the 1.8.0 JSON trace closes the loop with that final action targeting state 1 | same; `a2r3/tla/live/Hold.trace.json` |
| RUN-tlc-sym-liveness | the Sym spec, with `SYMMETRY` and a liveness `PROPERTY`: TLC warns that declaring symmetry during liveness checking "might cause TLC to miss violations of the stated liveness properties" | `a2r3/out/tlc_runs.txt` ("Sym"); `a2r3/tla/sym/Sym.tla`, `Sym.cfg` |
| RUN-tlc-fingerprint | TLC 1.8.0 prints fingerprint-collision estimates on a complete run | `evidence/exp/tla/inc-native.log` |
| RUN-tlc-jars | SHA-256 of the 1.8.0 and 1.7.4 `tla2tools.jar`; the 1.8.0 build that ran is 2026.10.20.183001 (rev d2e1472) | `a2r3/out/tlc_runs.txt` |
| RUN-tlc-help | the 1.8.0 and 1.7.4 help text: `-deadlock` "if specified DO NOT CHECK FOR DEADLOCK"; `-workers` "defaults to 1" | `a2r3/out/tlc-help-tla180.txt`, `tlc-help-tla174.txt` |
| RUN-spectacle | Spectacle at 5827c22 matches TLC's 11/45/191/813 in three engines at 524–1,125 states/s | `A5r3/browser-runs.log` §4 |
| RUN-pg-anomalies | PostgreSQL 18.6: the isolation table in RESULTS.md (conditional UPDATE, read-modify-write, write skew, NULL, 22003) | `research/spikes/pg_anomalies.py`; `RESULTS.md` |
| RUN-pg-claims | PostgreSQL 18.6 and 17.11: the same, plus holds write skew, 40P01, NULL amount, unknown account, `sum(bigint)` as `numeric`, and the CASE self-transfer (100 → 70) | `a2r3/scripts/pg_claims.py`; `a2r3/out/pg_claims.txt` |
| RUN-pglite | under Node, PGlite 0.5.10 reports PostgreSQL 18.6; overflow 22003; NULL-amount update affects 0 rows; two workers serialize | `A5r3/pglite.log`; `a2r3/out/pglite.txt` |
| RUN-browser-origin | an opaque-origin sandbox fails in Chromium; a separate origin with a module worker runs Z3 in three engines and cannot read the parent's storage | `A5r3/browser-runs.log` §2–3 |

**To record**, with the task that records each run (§13):

- *Spikes (W0):* RUN-origin-subdomain (W0-S01), RUN-phone-pyodide (W0-S02), RUN-fixedpoint-equal (W0-S03), RUN-spectacle-s5s8 (W0-S04), RUN-tlc-lasso-json and RUN-trace-validate-spike (W0-S05), RUN-bwrap-lanes (W0-S06), RUN-vcgen-cmd (W0-S07), RUN-pglite-rls and RUN-pglite-0511 (W0-S08), RUN-pg-catalog (W0-S09), RUN-replay-gen (W0-S10), RUN-scaffold, RUN-souffle-version, RUN-apalache-version, RUN-alloy-version and RUN-juliamono-glyphs (W0-S12); RUN-lean-wasm and RUN-lean-plaingoal, re-run from `lean-measure/scripts/probe-wasm*.cjs` and `A5r3/scripts/lean-plaingoal.mjs` with their outputs committed (W0-S11; `lean-measure/out/caul*.json` holds partial probe outputs, ready times and the isolation flag but not the payload size); RUN-lean-bv-decide and RUN-lean-vcgen, re-run from `lean-measure/proj/ledger/Ledger/Bits*.lean` and `Contract*.lean` with their outputs committed (W0-S11; the sources are on disk, but their outputs exist only as prose in the R1 verification report); RUN-lean-asset, the toolchain's release-asset byte counts and download URL (W0-S11); RUN-ci-fastlane (W0-T04), RUN-doctor-devcontainer (W0-T05) and RUN-keepkill-rules (W0-T07).
- *Learner-zero and testers (W1–W2):* RUN-lz-boot-w1 (W1-T09), RUN-lz-today-w1 (W1-T08), RUN-lz-signoff-w2 (W2-T15), and RUN-boot-firstsuccess (at least five naive testers, before the "external learners" label; W1-T09). These record event-log exports, not tool runs.
- *S1 (W1-T12):* RUN-z3-bv64-negamt, RUN-z3-double-capture, RUN-z3-refund-mint, RUN-z3-vacuous-unsat, RUN-z3-btc2010, RUN-z3-bloch06, RUN-z3-boot-variant, RUN-z3-demorgan, RUN-z3-smtlib-tour (D-13), RUN-pg-numeric-bound, RUN-rust-i64 (source exists; its output was never committed).
- *S2–S3 (W2-T10):* RUN-lean-noguard (three guard weakenings: no guard, no `n ≤ s.a`, no `0 ≤ n`), RUN-lean-ih-ungeneralised, RUN-lean-intent, RUN-lean-finmap, RUN-lean-s2-cells, RUN-lean-stuck, RUN-lean-unsafe-cmd, RUN-lean-nat-trunc, RUN-lean-bigsmall, RUN-lean-golden-redef, RUN-lean-step-invariant, RUN-lean-postings-refine, RUN-interp-goldens, RUN-lean-progress, RUN-lean-preservation, RUN-lean-golden-harness, RUN-lean-implemented-by, RUN-z3-nat-trunc; recorded by other tasks: RUN-lean-template (W2-T01), RUN-lean-checker-drift and RUN-lean-refund-both (W2-T13).
- *S4–S5 (W3-T07):* RUN-check-fragment, RUN-z3-wp-transfer (with S4.L2–S4.L3's authored cells), RUN-z3-missing-frame, RUN-z3-capture, RUN-z3-cti-pair, RUN-z3-vacuity-trap (with the non-vacuous miscompile), RUN-z3-inductive, RUN-z3-inductive-param, RUN-lean-vcgen-soundness; RUN-tlc-resolved-twice, RUN-tlc-n3-only, RUN-tlc-starbucks15, RUN-tlc-never-twice, RUN-tlc-eventually, RUN-tlc-inductive, RUN-tlc-lifecycle, RUN-tlc-hold-fairness, RUN-tlc-bare-property, RUN-pcal-doublespend; RUN-docket-baselines (W3-T14).
- *S6–S7 (W4-T10):* RUN-pg-sum-null, RUN-pg-read-skew, RUN-pg-mixed-levels, RUN-history-g2item, RUN-drt-transfers, RUN-pg-conditional-concurrent, RUN-serializability-fixtures, RUN-pg-enforce-commit, RUN-pg-sql-semantics; RUN-z3-leaky-field, RUN-z3-count-channel, RUN-interp-revocation, RUN-pg-rls-owner, RUN-pg-rls-covert, RUN-interp-new-enemy, RUN-z3-hierarchy-unknown, RUN-datalog-matrix, RUN-z3-cross-tenant, RUN-z3-selfcomp, RUN-pg-rls-differential, RUN-pg-rls-semantics, RUN-pairs-reference; RUN-isorun-upstream (W4-T01).
- *S8–S9 (W5-T03) and S10 (W5-T07):* RUN-tlc-double-charge, RUN-tlc-lost-effect, RUN-tlc-fresh-key, RUN-tlc-trace-validation, RUN-tlc-key-ttl, RUN-tlc-crash-liveness, RUN-tlc-outbox-safety, RUN-tlc-recovery, RUN-sim-determinism, RUN-pglite-inbound-key; RUN-tv-reference, RUN-lean-stack-machine, RUN-lean-preservation-frag, RUN-lean-hoist, RUN-lean-abort-blind, RUN-lean-leaky-compile, RUN-sql-shape-validator, RUN-sql-validation, RUN-pg-one-db; RUN-core-demo, whose record lists its outputs: LAB-10.c1's report skeleton, SP-10.1, CL-10.1's status and "if weakened" witness, and an S10.L7 cell.
- *Every wave:* RUN-twin-pins (production-twin SHAs, or a content hash and read date for a twin that is not a repository, such as a documentation page; 60-day TTL), refreshed by the wave that authors each stage.

### 9.6 The Bench CLI

Python, managed by `uv`, shipped in `statespace-lab`; it keeps the course's name. The brief's shorthand `bench <command>` means `statespace <command>`.

| Command | Does |
|---|---|
| `statespace doctor` | checks the devcontainer pins and the sandbox; prints a receipt-ready environment block |
| `statespace check <lab>[.<stage>]` | runs a stage's checks (`<lab>` is the short form: `lab1` for LAB-1, `lab2.2` for LAB-2.2): for Lean, build → `#print axioms` → `lake comparator` on the stage's theorems, because `lake check` errors on any non-standard axiom in the default targets [X RUN-lean-toolchain], where later stages' `sorry`s still sit; `lake check` on the whole project once no `sorry` remains (LAB-2.7) and at the Defence, with `lake comparator --paranoid` in CI and at the Defence; TLC with recorded argv; Z3 and cvc5; cargo; writes `receipts/` |
| `statespace receipt verify <file>` | validates a receipt against `receipt@1` and recomputes statement hashes |
| `statespace hash <file>` | the comparator-style statement hash |
| `statespace run <RUN-id>` | re-executes a registry run and diffs its outputs (course repo) |
| `statespace isorun <history>` | drives two sessions on PostgreSQL 18.6 by detecting lock waits, never by sleeping; emits a history file |
| `statespace trace validate <spec> <traces>` | validates NDJSON traces against a TLA+ spec with TLC by the trace-module method (Cirstea et al.; CCF), through TLC's bundled JSON module {{run:RUN-trace-validate-spike}}; reports n seeds, each trace's verdict and its first non-conforming line |
| `statespace sim <seed>` | runs the learner's simulator under a seeded fault schedule |
| `statespace defend` | seeds mutations of the learner's own artifact and lists them; the learner enters predictions in the tab first; the CLI then runs each mutant with the right checker and writes a receipt that the tab grades against the recorded predictions |
| `statespace audit gen \| harvest` | mutates the learner's repo with gap-class operators, harvests agent commits that touched statements, computes keys locally, bundles for the tab |
| `statespace stuck` | captures the failing goal or check, the statement and a required hypothesis; emits a forum-ready minimal example with private paths stripped, a short packet for the learner's own agent, and a park option (a parked goal, carried as [A] in the claim; re-find in 7 days) |
| `statespace export` | bundles claims, specimens and receipts; exports the report as Markdown and JSON |
| `statespace overlay` | the private, local-only overlay for "your system"; never committed |
| `statespace demo` | runs the reference pipeline on the provided agent proposal (LAB-10.c1) |
| `statespace demo record` | records the demonstration end to end, citing run ids and statement hashes (LAB-10.c7) |
| `statespace proposal draw` | draws a mutation-generated agent proposal for intake (LAB-10.c4) |

---

## 10. Interface

### 10.1 Screens

The phone column says whether a screen works on a phone; §0 names the four flagship phone surfaces.

| ID | Purpose | Phone | Key components |
|---|---|---|---|
| SCR-boot | the ≤8-minute first session | yes | prompt card, Call It, instrument cell with a fallback labeled "recorded result", a dated-incident card, "this will feel harder", *Set your week* with "study blocks", an optional placement walk; at most five new glossary terms (1–5) |
| SCR-today | the home for return visits | yes | session plan, due items, 0–1 audit case, re-finds, resume card, change cards, erosion forecasts, welcome-back set |
| SCR-week | the weekly rhythm | yes | range target, Bench and Keep blocks (the Keep figure computed, §3.0), "k of 12", reserve weeks, weekly review, monthly retro, each stage's plan range beside the roadmap's range |
| SCR-stages | the ordered path S1–S10 | yes | path drawing with list mirror, computed status in ink, rests-on edges on focus, test-out entry |
| SCR-stage | one stage | yes | title block, lessons, lab stages, Defence, seams, anchors, drawers, twins, budget |
| SCR-lesson | a lesson | yes | 680-px prose column, a rail of segment titles only (never answers or verdicts, V2-05), sidenotes, prequestions, instrument cells, Call It as a sticky sheet, Goal Replay strip, exit items, "Build this" and twin cards |
| SCR-theater | concurrency by hand | no (vertical lanes on phones) | enabled-action bar, branching history, trace table with narration, monitors, minimap (M-telescope), lasso tool, constants |
| SCR-derivation | the Derivation Board | no (read on phones) | predicate, keyboard stepper (WCAG 2.5.7), per-step Z3 result |
| SCR-bench | labs and lanes | no (labeled laptop-only) | lab list, `statespace doctor` output, receipt import by file or fragment, lane badges |
| SCR-lab | a staged lab | no (resume card on phones) | ≤25-min stages, per-check results, hint ladder, Prove-it, stuck protocol, fading claim cards |
| SCR-receipt | a receipt as a title block | yes | verdict lines, statement hashes, TCB, checks, claims to mint, lane |
| SCR-audit | the Audit Desk | yes | statement-first card, diff reveal, "This proves: ___", class radios with no default, line-anchored evidence, counts after |
| SCR-specimens | the cabinet | yes | drawers by stage, labels generated from runs, minimize and generalize status, re-find schedule, a "dated incidents" filter with sources and re-run status |
| SCR-claims | the claim graph and report | yes (cards); table at ≥900 px | claim cards with strips, rests-on blast radius, erosion log, filters, export |
| SCR-defence | the Defence | no (Part D on phones) | Parts A–D across sessions, untimed, Wilson interval display |
| SCR-mirror | private calibration and VRK₃₀ | yes | bias, hit rate per band with intervals, VRK₃₀ count and rate, settled KCs |
| SCR-notes | technical notes | no | from-memory draft first, then attached specimens and receipt hashes, Markdown export |
| SCR-drawer | drawers | yes | drawer text; deferred drawers show the "deferred" tag and a card naming the topic, why it is deferred and its trigger |
| SCR-clearinghouse | the Clearinghouse | yes for incidents; plug-in management is laptop-only | the week's incidents, plug-in status for the learner's components, proposal cards |
| SCR-assurance | the course's own claims | yes | gates as stamped claims, the course's erosion log, "what this cannot establish" |
| SCR-changes | errata and freshness | yes | struck and new lines, sources, "stale since" badges, retrieval items |
| SCR-search | search | yes | a build-time index of IDs, lessons, KCs and specimens |
| SCR-settings | data and consent | yes | export and merge-import with undo, 7-day backup nudge, download consent, the provenance honesty statement |
| SCR-instrument | the instrument origin's own page, where untrusted input renders (I6) | yes | a spec duel's distinguishing state, a receipt imported by link with its lane badge; no access to the main origin's storage |

### 10.2 Design-system direction

- **Tokens.** Light: vellum ground, sheet surfaces, graphite ink, verdigris only for links and "you are here" (v1 tokens, kept), except that v1's `--rule` becomes a decorative hairline and control boundaries take a component rule at 3:1 or more against the sheet (WCAG 1.4.11; DESIGN.md §2.2). Dark: graphite night (ground `#121412`, sheet `#1A1D1A`, ink `#E9ECE6`, pencil `#B4BCB2`), per the design review's validated table (A7-20), with links and the location pointer in ink; contrast re-verified by GATE-a11y. Stamp hues: UNKNOWN is a neutral gray hatch in both themes, not A7-20's night yellow, which clashed with TESTED as A7-06 found in light mode; CONFIGURED takes a hue in both themes and NOT COVERED a night value (DESIGN.md §2.4).
- **Type.** Archivo for structure, Source Serif 4 for reading, JuliaMono for code and logic {{run:RUN-juliamono-glyphs}}; all self-hosted subsets; 12-px minimum labels on phones; ASCII TLA+ by default with a speech map for notation; logic symbols such as ℤ, ∀, ∃ and ⇒ are set in JuliaMono, because Source Serif 4 lacks them (A7-15; GATE-glyphs checks each code point against its role's face).
- **Stamp grammar.** `WORD [code] · qualifier`, qualifier as large as the word, bound first for [M] and [T]; shapes separable in grayscale and under color-vision simulation; stamp hues allowed only inside stamps and strips and in two line classes of the line language below, the witnessed-violation line and the erosion crack (GATE-stamps).
- **Line language.** Solid structure, dashed assumed, dotted bounded, heavy vermilion violation, vermilion zig-zag erosion; nothing else may be dashed or dotted.
- **Motion and access.** Motion only for change, static under reduced motion; native radios for Call It; traces as tables; 44-px targets; WCAG 2.2 AA at 360, 320 and 1280 px.
- **Artboards.** The v1 canvas in `design/canvas/` is history: W0-T03 labels every sheet "illustrative, v1 history", and `design/canvas/` and `docs/history/` are exempt from GATE-numbers and GATE-links, because they keep v1's ID formats and sentences the corrections ledger retracts. Edition 1 redraws no v1 sheet; a new artboard is drawn from runs and falls under both gates.

---

## 11. Architecture and CI gates

### 11.1 Repository layout

```
apps/site/            React static site (main origin)
apps/instruments/     instrument origin: Pyodide-Z3 worker, Spectacle, PGlite, Datalog, lasso validator, Lane A host, receipt and bundle parsers, history checker, paired-state evaluator, simulator host, SCR-instrument, and the origin's own service worker and engine cache
content/stages/       S{n}.L{k} lesson data and per-lesson Markdown; KC graph; generators; audit pool; specimens; claim templates; seams
curriculum/           one authoring spec per stage, S{nn}-{name}.md (S01-counterexample.md to S10-assembly.md), and D-drawers.md
runs/                 RUN-*.json registry
schemas/              one JSON Schema source for receipt@1, claim@1, run@1, event@1, IR@1, plan@1 (the Lane A plan value), report@1, specimen@1, trace@1 (LAB-8's NDJSON), history@1 (`isorun`), bundle@1 (export and audit bundles) and lasso@1 (W0-S05) → TypeScript and Python types
labs/                 statespace-lab template, one folder per lab (labs/LAB-{n}/; each lab's zip unpacks into the root of the learner's one statespace-lab repository), with the agent kit, whose AGENTS.md ships as AGENTS.template.md so it never binds the course's own agents; never solutions (labs/_solutions/ is gitignored, and GATE-labs reads solutions from a private companion repository through a read-only deploy key)
bench/                the Python CLI (statespace)
scripts/verify-*      gates
vendor/kernelspace/   vendored infrastructure at a pinned SHA
vendor/tla2tools/     the pinned 1.8.0 and 1.7.4 tla2tools jars with their MIT license (RUN-tlc-jars)
docs/                 spine, specs, assurance copy; docs/history/v1/ (history only)
design/canvas/        the v1 artboards, history only (§10.2)
research/             roadmap, spikes, evidence, digests, reports and reviews, published redacted (OD-11; GATE-privacy)
tracker/              tasks.yaml: the task list built from §13, with each task's status; docs/TRACKER.md is its human view
README.md             the course's front page; GATE-links, GATE-numbers and GATE-runs scan it, with docs/, curriculum/ and tracker/, from W0
```

**Content blocks.** W1–W2 content uses at most six content block types (V2-18); W1-T10 names the six in §12, GATE-lessons counts them, and a seventh needs a logged decision. **Data.** The browser's only record is practice events, in an append-only IndexedDB log with export bundles, merge-import with undo, and a 7-day backup nudge, because WebKit may clear script-written storage after seven days without interaction [webkit7d]; beside it the browser may hold a disposable, read-only mirror of the lab repo, so phones can show claims, receipts and specimens. Claims, specimens and receipts live in the learner's lab repo (`claims/*.yaml`, `specimens/`, `receipts/`, `broken/` beside `fixed/`); an agent's proposed claims go to `proposals/`, and `.statespace/protected.txt` lists the paths the guardrail hook protects. **Instrument origin.** A separate custom subdomain (OD-5), named only in deployment configuration (committed files write `<course-domain>`) and reached through one message-only bus: `{engine, version, input, budget} → {verdict, witness, stats, provenance}`; it alone parses untrusted input, every byte from outside the page (I6). **Site stack.** React 19, Vite 7, TypeScript 5.9, Playwright and axe, pinned in W0-S12 {{run:RUN-scaffold}}. **Vendored from kernelspace** at a pinned SHA: the verify-script framework and item lints, `a11y.mjs`, the agent kit (AGENTS.md and CLAUDE.md, kept as templates in the course repo so they never bind its own agents, and the fail-closed PreToolUse hook), `sw.js` with its kill switch, `fsrs.ts`, the seeded RNG, the zero-import wasm ABI host and the lab packer. Not vendored: the ledger engine (its envelope ideas only), the Fleet world, the look.

### 11.2 Gates

Fast lane: under 5 minutes, blocks merges. Nightly: blocks releases; a red night downgrades the claims it touches to "unverified since <date>". Release: the Cedar-style gate.

| ID | Checks | Lane |
|---|---|---|
| GATE-numbers | every tool number, verdict, flag and version in copy, keys and artboards carries a run reference; a deny-list of known-false sentences (BRIEF §2.2); `design/canvas/` and `docs/history/` are exempt as history (§10.2) | fast |
| GATE-facts | sentences tagged as tool behavior match their runs; a warn-only date check on the facts registry flags a dated fact past its TTL: 60–90 days for tool claims (BRIEF §2.3), 60 days for production-twin pins, and none for dated incidents, papers and quotations, which state their own dates | fast |
| GATE-calls | every authored Call It answer reproduces on its engine (Pyodide-in-Node and native Z3, Spectacle, interpreter); witness properties, not model values; every authored `unsat` is cross-checked with cvc5, the Bench binary's version being {{run:RUN-scaffold}} (V2-12), from W1 on | fast (Lean calls nightly) |
| GATE-interp | the TypeScript interpreter matches the kernel-checked goldens of the S3 fragment and the S9 target IR; n reported | fast |
| GATE-items | option "why"s and misconception IDs (`dp:` keys), length and convergence lints, the surprise share under §8.4's narrative-blind definition, blind strategies ≤ chance + 2 SD; at least four CTI items interleaved through S9 | fast |
| GATE-audit-blind | blind audit strategies ≤ chance + 2 SD, chance being §6's permutation null (across the stream for decision figures, within each stage for class figures), Clearinghouse incidents included | fast |
| GATE-generators | purity, determinism across three engines, 2–4 templates, `unknown` discarded, distractors distinct from keys | fast |
| GATE-kc | DAG; 80–110 KCs; every item tagged; every threshold KC with a generator or ≥4 isomorphs; every KC carries a prequestion, a call and an exit item in its first lesson or step briefing; every `requires` edge's target is first taught no later than its dependent in roadmap order (first-contact tags exempt); every published path is a linear extension of the hard `requires` edges and of the lab-artifact dependencies, and every soft edge it crosses names its substitute | fast |
| GATE-stamps | each stamp derived from a receipt via §8.8; qualifiers present, with checker and version; requirement-fit never [P]; hue scope (stamps, strips, the witnessed-violation line and the erosion crack); grayscale separability in both themes | fast |
| GATE-codes | codes bracketed, IDs not; one allow-list of bracketed capital codes, in two sets with no code in both: the stamp codes of §8.7 and the tags of the Tags paragraph (`[X RUN-id]`, `[V]`, `[D]`, `[U]`, `[KS]`), so a tag is never read as a stamp and any other capital code fails; status vocabulary ("signed off" is never a stamp; no bare "verified", "correct" or "safe") | fast |
| GATE-claims | six fields; the "if weakened" witness refutes the claim's own proposition; statement hashes | fast |
| GATE-links | every ID resolves against the registry generated from this spine, in docs/, curriculum/, tracker/, README.md and new artboards (`design/canvas/` and `docs/history/` exempt; a "[redacted: private design detail]" marker is an intentional gap); every catalog ID in §7, §9.1 and §10.1, and every drawer in §3.12, is owned by at least one task's "Implements" cell (§13); §9.1's "Used in", §8.3's "Stages" and §3.12's "Used in" match their sources (§8.3's exempt cells excepted); `[step]` IDs are excluded from lesson counts | fast |
| GATE-coverage | parses `docs/COVERAGE.md` and fails when a row's lesson, LAB, CL or SP ID no longer resolves, or was cut without a receiving ID that names the roadmap clause | fast |
| GATE-budget | each stage's high estimate ≤ the roadmap's upper bound in weeks × 4.75 h; a warning, cleared only by a justification logged in §12, when it falls below half of the lower bound × 4.75 h; each stage's implied Keep load within the planned Keep block (§3.0); the claim cadence of §4.1 on both published paths at 6 h/week; at most one new tool per stage; the cut list against the §14 rule; additions name their displacement | fast |
| GATE-glyphs | every glyph in the JuliaMono subset and the speech map; every code point checked against the face assigned to its role, failing on a logic symbol set in the serif or sans | fast |
| GATE-bundle | bundle budgets; downloads above 5 MB, counted as one engine's compressed first load, behind consent; Playwright route tests, which also fail on a request to any third-party origin the learner did not reach through a link-out, and service-worker kill-switch tests; Boot interactive, with the recorded-run fallback, at 360 px within the time budget set from {{run:RUN-phone-pyodide}}; a spec-duel fragment never leaves the device and is parsed only on the instrument origin | fast |
| GATE-guardrails | every lab zip carries the agent kit; a scripted agent edit to `TODO(you)`, challenge, claim or receipt files, or to any path in `.statespace/protected.txt`, is blocked, and an agent's claim lands in `proposals/`; switching the hook off with `STATESPACE_GUARD=off` is recorded in the receipt's provenance; no `_solutions`; the pinned reference evaluator is a dependency that learner semantics modules may not import (a lint; honor system, OD-8) | fast |
| GATE-privacy | scans every published path, `research/` and `docs/history/` included, for private-design terms, personal and account identifiers, personal domains, emails and private paths; the term list lives as hashed tokens in CI configuration, so the public repo never spells it out; allowed: the generic phrase "private design", the redaction marker, the roadmap's own wording, and v1's wording inside `docs/history/` and `design/canvas/`; the course domain appears only in deployment configuration (OD-5); review JSONs absent; every vendored directory carries its license | fast |
| GATE-schema | all records validate; TypeScript and Python types in sync; the statement-hash trim passes shared test vectors in both languages; the keep/kill rules file's SHA-256 equals the one recorded in RUN-keepkill-rules | fast |
| GATE-lessons | lesson anatomy (§3.0); every graded item names its GEN family and template; the rail shows segment titles only; at most six content block types in W1–W2; no lock copy; learner copy, `labs/README.md` and SCR-drawer included, uses only glossary terms (§0), plain English and roadmap names, and no internal names; SCR-drawer gets the copy, block-type and no-lock rules but not the lesson anatomy | fast |
| GATE-erosions | every shipped ER has both endpoints, a forecast item and a remedy card; a replay of both published paths fires every shipped ER, Clearinghouse erosions by the oldest-open-erodible-seam rule | fast |
| GATE-replay | Goal Replay regenerated on the pinned toolchain equals the committed strips | nightly |
| GATE-conformance | Spectacle = TLC; Pyodide Z3 = native Z3 on the same queries, the recipient wrap included; PGlite = PostgreSQL 18.6 on single-session specimens; tab Datalog = Soufflé on relations and derivation heights {{run:RUN-fixedpoint-equal}}; pocket checkers = Z3; the lasso validator = TLC on the fixtures; the Clearinghouse provider simulator's traces validate against S8's reference spec with TLC | nightly |
| GATE-specimens | every specimen reproduces, including 22003, 40001, 40P01 and write skew at REPEATABLE READ, and the upstream isolationtester specs `isorun` replays (RUN-isorun-upstream) | nightly |
| GATE-labs | templates fail, private solutions pass (read from a private companion repository through a read-only deploy key), weakening mutants fail; every check has hint rungs R0–R4; every Defence mutant elaborates or builds, or its key predicts that it fails to; monthly also on the newest stable Lean | nightly |
| GATE-audit | every anchor and variant builds or runs with its key, key run, class (primary and acceptable), typed evidence and "based on" card; at least six exemplars in each class whose anchors have shipped; every shipped Clearinghouse family re-executed on its recorded seeds, failing if its naive baseline meets the family's bar or its reference misses it | nightly |
| GATE-a11y | axe with 0 serious issues at 360, 320 and 1280 px on every screen | nightly |
| GATE-runs | registry integrity; every `{{run:ID}}` resolves to `runs/ID.json` (format placeholders in code spans exempt); a tool bump re-runs all and opens a diff | nightly and release; the resolution check also runs in the fast lane on content not labeled draft |
| GATE-release | models, proofs, differential tests and runs up to date; the nightly lane green | release |

---

## 12. Decisions log (beyond the brief)

1. **Lesson numbering follows the brief.** S2's self-explanation unit is S2.L0 (the brief's "2.0"); only S1.L0 is Boot. The landscape digest's "9.9" and "9.10" map to S9.L8 and S9.L9. S1.L1 and S1.L2 are swapped against the brief's order (item 33), so the brief's "Lesson 1.2" (V2-05) is S1.L1 here.
2. **Capstone steps are S10.L1–S10.L7, tier `[step]`,** outside the 76 and excluded from every lesson count; steps 1–5 are built as tagged stages inside LAB-3, LAB-4, LAB-6 and LAB-8, and LAB-10 is the final assembly.
3. **Core-lesson choice.** S2.L10 (every checker agrees; none read the requirement) is core and S2.L2 a bridge, because TPIL covers propositions-as-types well and the flagship needs full authoring. Its title avoids the brief's "four checkers": `--paranoid` runs six [X RUN-lean-comparator]. Three swaps keep 26 core and 50 bridge while putting authoring effort where the roadmap's projects are: S3.L6 (the step-invariant proof, LAB-3.4–LAB-3.5, CL-3.3, SEAM-3) is core and S3.L5 (progress and preservation, stretch under BRIEF §7.2) a bridge, with fading family F2 retargeted to step-invariant case analysis; S9.L6 (semantic preservation, CL-9.2) is core and S9.L2 (translation validation, still the first win) a bridge; S7.L4 (RLS) is core as V2-23 requires, and S7.L2 (policy as Datalog, covered by the Soufflé tutorial) a bridge.
4. **Lab size** is proposed to the owner as OD-15: 74 planned stages in LAB-1–LAB-9 against the brief's "~45", because stages are pinned per lemma, Lean proof stages that prove whole theorems are 45-minute weekend stages (BRIEF §7.3), the roadmap's three hands-on acts that were lesson-only now have lab stages (LAB-3.6 `force move`, LAB-4.7 the miscompiler, LAB-7.6 revocation), S8's progress guarantees have a liveness stage (LAB-8.3), and capstone steps add seven. GATE-budget confirms the total fits.
5. **Course-supplied harnesses.** `statespace isorun`, the abstract-serializability checker, `statespace trace validate`, the reference translation validator (LAB-9.1) and, on the builder's path only, the reference compiler are course tools; learners write compilers, generators, retry policies, R(S, D), machines, specs and validators. The isorun gate on upstream isolationtester outputs therefore applies to the course (W4-T01).
6. **KCs.** 105 KCs with 26 threshold KCs (KC-1.claim-anatomy added, item 43); the old Course 00 KCs live in S1 and are taught by drawers D-01–D-06. KC-2.induction-principle requires KC-2.proof-reading (taught in S2.L0), not KC-2.goal-state-reading (taught later, in S2.L3).
7. **Seams and erosions** extend the brief's five to twelve erosions with both endpoints, plus three held seams so that erosion is not universal. SEAM-7 is planted in S1 so the solver-bug replay is a long-range erosion. SEAM-13 is planted on the course's own assurance claim about INS-interp, not on a learner claim.
8. **Builder's path.** The brief's path (S1 → S5 → S6.6–6.7 → S8.1–8.4 → S7 → S2–S4) is not a topological order of the `requires` DAG or of the labs: S7.L6 and LAB-7.5 run self-composition through the learner's own VC generator (LAB-4), KC-7.observer-equivalence requires KC-4.vc-shape, S7.L4 needs KC-6.sql-not-algebra, and S6.L6 needs KC-6.rowcount-as-guard. The pedagogy digest asked to validate dependencies first [dp §4.5], so this spine publishes the repaired order in §3.0, with one soft edge (covered by D-23), two reference-compiler substitutes and S5.L9 moved after S4; GATE-kc checks every published path. An erosion fires when both endpoints exist in the learner's record; if the specimen came first, the claim mints already cracked.
9. **Audit anchors.** 25 anchors, at least two per stage for S1–S9 (S10 audits the learner's own repo through `statespace audit`) and all thirteen classes covered; AUD-5.3 is based on this course's own corrected mock-ups. Subclass IDs (G1a, G3a, G6a–G6e, G8a–G8d) follow the brief's subclass lists. The five W1 anchors from later stages ship keyed by executed runs only, with variants after the Lean and TLC lanes exist.
10. **Provenance weights** of 1.0 and 0.3 follow kernelspace's weights; an automated close in manual mode is flagged on receipts and claims, which never count as evidence.
11. **Budget method:** 3× for Lean proof stages (the stuck protocol's 90-minute park), 2× elsewhere, weekend stages at 45 nominal minutes, the Keep block computed and taken off the top (4.75 h of stage work in a 6 h week), and S1's "session" read as at most 2.5 h.
12. **Six fading families** were chosen by difficulty: five come from the review's ten, and F4 (invariant strengthening after a CTI) stands in for the review's nearest family, VC construction. The other five of the ten (Z3 encoding, VC construction, SQL history to anomaly, Datalog policy and self-composition) get worked examples without fading.
13. **Generators:** 14 families and 47 templates; GEN-which-stamp and GEN-spot-the-gap are added to the brief's family list because confusable set A and audit variants need them. GEN-which-stamp ships in W1 because S1 uses it.
14. **Instruments.** Bench engines are named `INS-bench-*` so lesson tables can cite them; the CTI workbench and the minimap (internally, the telescope) are mechanics over existing instruments, not new engines.
15. **The CLI is `statespace`;** the brief's `bench <cmd>` is shorthand for it.
16. **Hall of Records items are specimens** inside stages (SP-1.9, SP-1.10, SP-4.5, SP-5.7, SP-6.11, SP-8.5), shown through a "dated incidents" filter in the specimen cabinet rather than a screen of their own; the Lean kernel-bug story stays a story card in S2.L9 with no exploit code.
17. **The capstone artifact is "the Core"**; "plinth" survives only in the roadmap's toy-language names (OD-2).
18. **Every production-twin SHA is recorded** in RUN-twin-pins with a 60-day TTL; none is written into copy by hand.
19. **Unexecuted facts are placeholders.** The Rust `i64` overflow behavior was reported by a review, but its output was never committed, so it is {{run:RUN-rust-i64}}; PGlite 0.5.11 is likewise {{run:RUN-pglite-0511}}. RUN-lean-wasm and RUN-lean-plaingoal moved from "executed" to "to record" because only their scripts and report prose are on disk; the Pyodide payload figure moved to RUN-phone-pyodide for the same reason.
20. **VRK₃₀** is the north star's name (the brief's), not VRC₃₀.
21. **"The Defence"** keeps its brief and task spelling as a proper noun; all other copy is US English.
22. **Deferred topics** are one drawer each (D-30–D-40), tagged "deferred", always openable, with a short card and a neutral trigger that surfaces the drawer in Today and unlocks nothing.
23. **W6 is launch hardening:** accessibility, performance, docs, publication hygiene, a final adversarial review, and the release gate. The keep/kill rules moved to W0 (W0-T07), because rules fixed after five waves of data are not fixed in advance.
24. **Model assignment:** opus for architecture, hard content, proofs, correctness-critical checkers and adversarial review; sonnet for scaffolding, well-specified UI, transforms and tests from specs. Every grader, untrusted-input parser, stamp deriver, verdict parser, reference checker and release gate is opus (W1-T01, W1-T13, W1-T14, W2-T08, W3-T04, W3-T05, W4-T06, W5-T09).
25. **The Keep block is computed and larger than the brief's 30–40 min/week.** The brief's own basis (KCs × about 10 reviews × about 2 min) gives about 35 h over the arc for 105 KCs, before audit cases, Clearinghouse incidents, reviews and the keep-alive; the plan is 45–75 min/week at 6 h/week and 60–105 min/week at 10 h/week, recomputed from logged item times after each wave.
26. **Today excludes the Lean keep-alive.** BRIEF §7.6 lists the keep-alive inside Today, but a 20–30-minute session cannot fit a 10–12-minute Today; it is its own Keep session, and Today only shows a card when one is due.
27. **The Defence's Part C has four cases** (BRIEF §4.7: 2–4), and every credited part has at least four items, so the 60% floor never makes one miss fatal; the earlier small-part clause (at most one miss in a part of five or fewer items) changed no result at four or more items and is dropped. A failed part is retaken on fresh seeds after at least 3 days.
28. **Roadmap S8's "prove safety properties over the model"** is met as [M] · constants · complete over the model, the stamp the course's own rules give a complete TLC run. The optional [P] lift once offered here is dropped, because no stage, claim template or run hosts it; S5.L9's parametric proof stays the course's lift to [P].
29. **Inductive invariants.** TLC's inductive-invariant technique checks `Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` only over states enumerated for fixed, finite constants, so it earns [M] · constants; Apalache's check is treated the same way until a run shows otherwise [D]. [P] for every N needs a parametric proof of the step: Z3 with the parameter as an uninterpreted sort, or Lean. CL-5.4, S5.L9, KC-5.inductive-invariant-tla, §8.8 and AUD-5.3's G5 variant follow this.
30. **Safety and liveness are separate claims in S8.** "No committed intent is lost before acknowledgement" (CL-8.1) is safety; "every committed effect is eventually dispatched" (CL-8.5) is liveness, minted beside CL-8.4 under weak fairness on Worker and eventual recovery as [A]. SEAM-12 rides on CL-8.2.
31. **Cut eligibility** (§14) excludes bridges that carry a threshold KC, a seam or erosion endpoint, an outcome-core KC (§2.2) or the only lesson of a roadmap completion test, and requires every KC and claim of a cut bridge to move, with one added graded item, to a named receiving lesson that is not cut.
32. **Fewer nouns** (OD-14): a capped glossary of 25 learner-facing terms (§0); internal names are linted out of learner copy; the Hall of Records screen became the "dated incidents" filter in SCR-specimens; the docket screen became SCR-clearinghouse.
33. **Boot and the first hour.** Boot's call is on `Int` and is a pre-instruction call (first contact, counted toward no KC state), and the BitVec 64 wrap is an uncredited reveal, so Boot requires no untaught KC. S1.L1 is now the hands-on core lesson "Negate, then search" and S1.L2 the bridge "Three answers", which follows the `requires` DAG.
34. **LAB-1 runs without the devcontainer,** with `uv run --with z3-solver==5.3.1` or in the tab, because a first install was kernelspace's top drop-off risk [dp §6] and Project 00 needs only Z3Py; the devcontainer arrives at S2 (D-15).
35. **Learner-zero numbers are descriptive.** Learner-zero is the author, so a learner-zero median measures no first-time learner: Boot's 4-minute target is checked by a Playwright timing gate and by at least five naive testers (RUN-boot-firstsuccess) before the "external learners" label; Today's 12 minutes stays a learner-zero event-log metric.
36. **Owner time is planned.** Every task carries an estimate of owner review hours, every wave a total and an implied duration at 2.5 h/week, and the learner-zero study commitment is on the critical path (§13).
37. **S9's halves** follow the lessons: half A is S9.L1–S9.L4 with LAB-9.1–LAB-9.3, and the SQL validator (LAB-9.11) runs in half B after the preservation stages, so no mini-Defence tests work whose lesson comes later. LAB-9.1's 2-minute win is the reference translation validator (V2-29).
38. **Rust and cvc5 are not new tools.** The roadmap pairs Rust with Postgres at Stage 6, but the learner is Rust-fluent (§2.1), so Rust counts as the learner's existing language and appears from S3 (LAB-3.8–LAB-3.11, Lane A) and S4 (`miniplinth check`); cvc5 in S4 is a second engine on the SMT-LIB the learner already writes. Neither counts against GATE-budget's one new tool per stage.
39. **OD-4's link-outs.** The brief's "CheerpJ TLC" option is offered as the link-out to TLA+ By Example, which runs TLC through CheerpJ from the vendor's CDN, so nothing CheerpJ-based is embedded; the Natural Number Game joins the list for S2.L1, and GATE-bundle's route tests enforce the rule.
40. **Misconception IDs use the `dp:` prefix** (§0), chosen over the proposed `MC-` and `MIS-{n}.{kebab}` forms because every curriculum spec and `docs/EVIDENCE.md` §6 already write it and it keeps the pedagogy digest's own keys; EVIDENCE.md §6 is the catalog, and its §6.11 governs proposed entries.
41. **Manual-mode variants.** LAB-3.4–LAB-3.5 turn off `grind` but keep `omega`, because case analysis is the taught step and `omega` adds no `Classical.choice` [X RUN-lean-axioms]. Further per-lab variants are logged here.
42. **S10's briefings, passes and mutations; S9's Defences.** S10.L6 and S10.L7 open with step briefings outside the lesson counts, which carry the KC-10.* KCs' first-lesson dose. LAB-10.8 is one write stage run as nine passes (325 nominal minutes), counted as one stage so that OD-15's shape is unchanged. S10's Defence Part B has seven mutations, one per learner-owned component, the one exception to four to six. With S9's two mini-Defences at 2.3–2.8 h by the §3.0 pattern, the arc becomes 107–197 h, and its 6 h/week projection, about 43–80 weeks, runs just past the roadmap's 18 months at the high end.
43. **A KC for the six fields.** KC-1.claim-anatomy holds roadmap rule 3, the course's thesis, so the six-field skill is spaced in Today and sampled in Defences as the learner's own; it is first taught in S1.L3 with D-06, and the graph holds 105 KCs, inside the cap of 110.
44. **An ID exception.** RUN-lean-ih-ungeneralised keeps its British spelling: IDs are exact, six companion files cite it, and renaming it here alone would break them. W0-T03 may rename it everywhere at once when it generates the registry.
45. **`research/` is published redacted** (OD-11). W0-T01 removes the personal domains, account identifiers and private paths the companion documents found there; GATE-privacy scans every published path with its term list kept as hashed tokens in CI configuration; redaction markers are intentional gaps for GATE-links.
46. **Twins and pairs.** "Twin" means a production twin only. Matched sound and flawed audit cases are pairs, and a specimen or lab statement that sets a sound form beside a flawed one calls it a counterpart; the mechanic ID M-twins keeps its name.
47. **Anchors in time.** Settled is anchored at the stage's sign-off date; VRK₃₀ counts from first learning, which for a KC credited at placement or test-out is the confirmation date.

### 12.1 V2 coverage

One row per brief change, so adherence can be audited.

| Change | Where it lands in this spine |
|---|---|
| V2-01 Statement pins, challenge packs, agent kit | I7; LAB-2 challenge pack; §9.4; `statespace check` (§9.6); GATE-claims, GATE-guardrails; W1-T18, W2-T01, W2-T02 |
| V2-02 Credit only from machine-graded, unassisted work; the Defence | I1; §8.1, §8.2, §8.6; M-defence; W2-T12 |
| V2-03 Every tool fact a recorded run; false content fixed | I4; §9.5; GATE-numbers, GATE-facts, GATE-runs; SP-2.2, SP-5.2, SP-6.4, S6.L6's executed outcomes; W0-S11 |
| V2-04 A valid Audit Desk | §6; GATE-audit, GATE-audit-blind; AUD-4.2 kept sound; the vacuity trap SP-4.4 and AUD-1.1; W1-T17 |
| V2-05 Valid calibration; the rail shows titles only | §8.4, §8.5; GATE-items; S1.L1's fresh first scored call; the lesson-rail rule (§3.0, SCR-lesson, GATE-lessons); W1-T07 |
| V2-06 Retention: KC graph, generators, FSRS Today, re-find, VRK₃₀, a Lean thread | §4, §4.1; §8.3; M-today, M-re-find, M-lean-keep-alive; §2.3; W1-T04, W1-T05, W1-T08, W3-T13 |
| V2-07 Stage 6 on measured PostgreSQL | §3.6 (S6.L2, S6.L6, S6.L7, S6.L8); INS-bench-pg; W4-T01–W4-T06 |
| V2-08 A truthful 64-bit story | S1.L5 and its six-row table; CL-1.5; ER-1; D-30 |
| V2-09 A budget that governs additions | §3.0 budget method; §3.11; GATE-budget; OD-7; §13 rules and review hours |
| V2-10 Stamps that mean what they say | §8.7, §8.8; GATE-stamps, GATE-codes |
| V2-11 Invariant ≠ inductive invariant | S4.L4, S4.L6; M-cti-workbench; LAB-4.6; CL-4.4, CL-4.5; S5.L9 ("MODEL-CHECKED ≤ N → PROVED for every N", with the parametric proof of item 29) |
| V2-12 Z3 through Pyodide on its own origin; cvc5 cross-checks | INS-z3; OD-5; SP-1.7; S1.L3; GATE-calls' cvc5 cross-check from W1 (W1-T05) |
| V2-13 One TLA+ semantics | INS-theater, INS-spectacle, INS-lasso; S5.L2, S5.L8; GATE-conformance |
| V2-14 Lean: core-only, generated, staged, with help | S2; INS-goal-replay; GATE-replay; D-07, D-08; hint ladders (W2-T06); fading families (§4) |
| V2-15 Two grading lanes, one IR | §9.3; INS-lane-a, INS-receipt; `IR@1` |
| V2-16 ResourceOps as postings | S3.L2; KC-3.resource-postings; LAB-3.2 |
| V2-17 One home for evidence | §11.1 Data; §0; SCR-settings (W1-T20) |
| V2-18 Gate pipeline; ≤ 6 block types at first | §11.2; GATE-conformance; vendored infrastructure (W0-S12); the six-block-type rule (§3.0, §11.1, GATE-lessons) |
| V2-19 Isolation and phones | OD-5; I6; M-consent; §9.3 phones; W0-S01, W0-S02 |
| V2-20 Project 00 first; nothing locks | Boot (S1.L0); D-01–D-06; M-test-out and the "From kernelspace" placement (W2-T16); navigation (§0) |
| V2-21 Accessibility and notation | §10.2; GATE-a11y, GATE-glyphs; SCR-derivation; screen-reader passes at every wave exit (§13) |
| V2-22 The Bench as the roadmap names it | §9.2; `statespace doctor`; W0-T05; D-15; D-10 |
| V2-23 Stage 7 within budget; RLS as a core lesson | §3.7: the Datalog pair, S7.L6 self-composition, S7.L4 core, D-16 for Alloy, S7.L3's small-scope hypothesis |
| V2-24 Stage 8 | S8.L4, S8.L7; SEAM-12; S8.L6; LAB-8.3 |
| V2-25 A thin persistent world | M-docket; SCR-clearinghouse; W3-T14, W4-T14, W5-T13; RUN-docket-baselines |
| V2-26 Practice that produces | the formalize progression pick → fix → write (§8.4); M-claim-card; M-specimen-cabinet; M-erosion-forecast; M-notes; M-class-hint |
| V2-27 Hall of Records | M-hall-of-records; the "dated incidents" filter in SCR-specimens (W4-T11) |
| V2-28 Your own design in a private overlay | M-overlay; §3.10; W5-T12 |
| V2-29 Stage 9 restructured | S9.L1 warm-up; LAB-9.1 translation validation as the first win; S9.L5; S9.L4 (aborts observable); LAB-9.3 (determinism proved) |
| V2-30 Shelf triggers match real obligations | D-30 surfaced at ER-1; D-32 surfaced at ER-7 |
| V2-31 Siblings: link, don't re-teach | M-sibling-bridge; D-11, D-12, D-21 |
| V2-32 Evidence-tagged mechanics; n = 1 keep/kill rules | §7 (Ev and Prec); W0-T07 |
| V2-33 Visual cleanup | §0 Look; §10.2 |

---

## 13. Waves W0–W6

**Rules.** A wave starts when the previous wave's gates are green and the owner's review queue is under 10 h (OD-7); the queue is the sum of the "Review h" of finished tasks not yet reviewed. Sizes: S ≤ 3 agent-days, M ≤ 2 weeks, L ≤ 6 weeks. Acceptance is always a CI gate or a recorded run. Every task names what it implements: GATE-links fails if any catalog ID in §7, §9.1 or §10.1, or any drawer in §3.12, is owned by no task; a stage's lesson task owns the drawers that stage introduces, and W5-T07 owns the deferred drawers' cards D-31–D-40. Every task cites IDs from this spine (GATE-links) and run references for every tool fact (GATE-numbers), and every content task depends on the task that records its runs (GATE-runs). Learner-zero: agents draft stage N+1 while the owner studies stage N, and unreviewed material is labeled "draft: first-learner pass pending". Each spike leaves a decision record with a fallback. Every wave exit from W1 to W5 includes a manual screen-reader pass on the wave's new screens, with notes filed (BRIEF §1.3).

**Owner time.** The owner's week holds 6–10 h of study as learner-zero plus 2–3 h of review (OD-7). Review hours, not agent time, set the calendar (BRIEF §1.2). "Review h" is an owner-review estimate [D]: about 1.5 h per core lesson, 0.5 h per bridge, 2–3 h per lab, 0.3 h per audit anchor, 0.25 h per drawer, and 0.5–1.5 h per spike or infrastructure decision; logged review time replaces it after each wave. The calendar table after W6 gives each wave's implied duration.

### W0 Spikes and foundations

Goal: retire the tool risks, lay the evidence substrate, and fix the keep/kill rules before any data exists. **Exit:** every spike has a recorded run and a decision record; the fast lane runs under 5 minutes (RUN-ci-fastlane); GATE-numbers fails on a planted untagged number and GATE-runs on an unresolved run reference; GATE-privacy is green; the keep/kill rules are committed and hashed before the first learner-zero event (RUN-keepkill-rules).

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W0-S01 | Instrument origin on a custom subdomain | S | opus | — | the instrument origin (I6) | RUN-origin-subdomain: Z3 runs cross-origin in three engines; parent storage unreadable; the framed origin's Cache API and service worker persist across sessions in three desktop engines under storage partitioning | 0.5 |
| W0-S02 | Pyodide-Z3 on real phones | S | sonnet | W0-S01 | INS-z3 on phones | RUN-phone-pyodide: load time, first-load size, memory, `rlimit` timing, cache persistence, and in browsers the `timeout` case, the `unknown` case and `Fixedpoint` | 0.5 |
| W0-S03 | Z3 `Fixedpoint` for Stage 7 | S | sonnet | — | the INS-datalog decision | RUN-fixedpoint-equal: equal relations and derivation heights to Soufflé, or the TypeScript fallback chosen | 0.5 |
| W0-S04 | Spectacle on Stage 5/8 specs and state pairs | M | opus | — | the INS-spectacle decision | RUN-spectacle-s5s8: operator coverage, local EXTENDS, speed, state-pair check | 1 |
| W0-S05 | TLC lasso JSON and trace validation | M | sonnet | — | the INS-lasso input format; the `statespace trace validate` method | RUN-tlc-lasso-json: the 1.8.0 lasso format, whose loop closes on state 1, documented on the Hold spec; RUN-trace-validate-spike: one accepted, one rejected and one partial NDJSON trace under the trace-module method | 1 |
| W0-S06 | Sandbox lanes and `--paranoid` timing | M | sonnet | — | the INS-bench-lean sandbox record | RUN-bwrap-lanes: verdicts and each lane's `docker run` argv on CI runners, Docker Desktop and Codespaces, including a passing `lake check --paranoid` | 1 |
| W0-S07 | `vcgen` on a custom `Cmd` | S | opus | — | the S4.L9 production twin | RUN-vcgen-cmd recorded; the twin stays dated and experimental | 0.5 |
| W0-S08 | PGlite RLS and first-load size | S | sonnet | — | the INS-pglite decision | RUN-pglite-rls and RUN-pglite-0511 recorded in a browser; S7.L4's lane decided | 0.5 |
| W0-S09 | PostgreSQL 18.6 isolation catalog rows | M | sonnet | — | the INS-bench-pg catalog | RUN-pg-catalog: unrun rows recorded in isolationtester format, rows H22–H24 included (catalog rows H01–H24 resolve as rows of this run), and a seeded grid of amounts, balances and interleavings with a target count per GEN-anomaly-id template | 1 |
| W0-S10 | Goal Replay via `$/lean/plainGoal` | S | sonnet | — | the INS-goal-replay decision | RUN-replay-gen: deterministic strips; a simulated bump produces a diff | 0.5 |
| W0-S11 | Receipt schema, `runs/`, lints | M | opus | W0-T02 | INS-receipt's schema; the runs registry (§9.5); GATE-numbers, GATE-runs | receipt@1 published; the 37 executed runs imported; RUN-lean-wasm, RUN-lean-plaingoal, RUN-lean-bv-decide and RUN-lean-vcgen re-run with their outputs committed; RUN-lean-selftransfer, RUN-tlc-atomic, RUN-tlc-unsafe-3w and RUN-tlc-full's two-worker figure re-run with argv; RUN-cvc5-alethe's full proof and RUN-lean-asset recorded; GATE-numbers trips on a planted number and GATE-runs on an unresolved `{{run:}}` | 1.5 |
| W0-S12 | Vendoring and a React 19 / Vite 7 scaffold | M | sonnet | — | `apps/site`, `apps/instruments`; the vendored kernelspace infrastructure | infrastructure vendored at a SHA; RUN-scaffold, RUN-souffle-version (with the CPU architecture), RUN-apalache-version, RUN-alloy-version and RUN-juliamono-glyphs recorded | 1 |
| W0-T01 | Publication hygiene | S | opus | — | GATE-privacy | GATE-privacy green over every published path, `research/` included, once the personal domains, account identifiers and private paths found there are removed; review JSONs absent; the content and code LICENSE files in place (OD-16) | 0.5 |
| W0-T02 | One JSON Schema with TypeScript and Python codegen | S | sonnet | — | `schemas/`; GATE-schema | GATE-schema green | 0.5 |
| W0-T03 | ID registry generated from this spine | M | sonnet | — | GATE-links, GATE-coverage; the `dp:` misconception registry | every v1 artboard labeled "illustrative, v1 history"; GATE-links resolves every ID in docs/, curriculum/, tracker/ and README.md (`design/canvas/` and `docs/history/` exempt), `dp:` keys included against the registry generated from `docs/EVIDENCE.md` §6, fails on an unowned catalog ID or drawer and on a §9.1 "Used in", §8.3 "Stages" or §3.12 "Used in" mismatch, and excludes `[step]` IDs from lesson counts; GATE-coverage passes over `docs/COVERAGE.md` | 0.5 |
| W0-T04 | CI lanes: fast, nightly, release stub | S | sonnet | W0-S12 | the three lanes of §11.2 | RUN-ci-fastlane records the fast lane under 5 minutes (GATE-runs); nightly scheduled | 0.25 |
| W0-T05 | Devcontainer, `statespace doctor`, Codespaces prebuild | M | sonnet | W0-S06 | INS-bench-lean, INS-bench-tlc, INS-bench-pg, INS-bench-smt, INS-bench-souffle, INS-bench-cargo; `statespace doctor` | RUN-doctor-devcontainer: `statespace doctor` green in the devcontainer (GATE-runs) | 0.5 |
| W0-T06 | GATE-budget over the stage plans | S | sonnet | W0-T03 | GATE-budget | GATE-budget green: all ten stages pass, and the lower-bound warning, the Keep-load check and the claim-cadence check run on both published paths | 0.5 |
| W0-T07 | Keep/kill rules fixed in advance (n = 1) | S | opus | — | the n = 1 decision rules (V2-32; BRIEF §3.5) | the rules file (the four BRIEF §3.5 comparisons, each with its arms, eligible units, the 30-day fresh-seed outcome, minimum n, thresholds and read points, as `docs/EVIDENCE.md` §7.2–§7.3 propose; neither arm of "counterexample vs class hint" is counterexample-only feedback, which BRIEF §3.3 rules out; the misconception-note comparison admits novice KCs once they are solid, because expert-treated KCs alone could never reach its minimum) committed with its SHA-256 in RUN-keepkill-rules before the first W1 learner-zero event; GATE-schema checks the hash is unchanged | 1.5 |

**W0 review total:** 13.75 h.

### W1 Project 00 slice

Goal: Boot, S1 and LAB-1 on the full loop. Scope: Boot, S1, LAB-1 (with `uv run`, no devcontainer), the grader core (GEN-negate-it, GEN-find-the-witness, GEN-call-it, GEN-spot-the-gap, GEN-which-stamp), KC graph v0, Today and the Keep block, the event log, settings and export, claims, stamps, specimens, pocket checkers, eight audit anchors with their pairs, the agent kit, `llms.txt`, phone layouts. **Exit:** learner-zero finishes Project 00, without the hint ladders and Prove-it that ship in W2 (W2-T06, W2-T11), with at least two claims and two kept specimens; the Boot timing gate passes and learner-zero's Boot time is recorded, labeled "descriptive, learner-zero only" (RUN-lz-boot-w1); blind strategies stay within chance + 2 SD; learner-zero's median Today is at most 12 minutes (RUN-lz-today-w1, descriptive); axe shows 0 serious issues and the screen-reader pass is filed; every S1 tool number is a run reference that resolves; every S1 authored `unsat` is cross-checked with cvc5; the hook blocks a scripted agent edit.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W1-T01 | Stamps, strip and tokens | M | opus | W0-S12 | M-assurance-strip; stamp derivation (§8.7, §8.8); the §10.2 tokens; GATE-stamps, GATE-codes | GATE-stamps and GATE-codes green | 1 |
| W1-T02 | App shell, navigation, service worker | M | sonnet | W0-S12 | SCR-stages, SCR-stage, SCR-lesson, SCR-search; `sw.js` | GATE-bundle: Playwright route tests for the five destinations plus search, and the kill-switch test | 0.5 |
| W1-T03 | Event log and provenance | M | opus | W0-T02 | the §8.2 events and weights | GATE-schema plus property tests: double import, merge and a stale tab give identical logs | 1 |
| W1-T04 | KC graph v0 (105 KCs) | M | opus | W0-T03 | §4; GATE-kc | GATE-kc green, its order and path checks included | 3 |
| W1-T05 | Generator framework and the first five families | L | opus | W1-T04, W0-S01 | GEN-negate-it, GEN-find-the-witness, GEN-call-it, GEN-spot-the-gap, GEN-which-stamp; M-layered-feedback, M-class-hint, M-which-is-it; GATE-generators, GATE-calls | GATE-generators and GATE-calls green, with every authored `unsat` cross-checked by cvc5 ({{run:RUN-scaffold}}); native = Pyodide on the same queries | 2.5 |
| W1-T06 | INS-z3 cell with consent and recorded fallback | M | sonnet | W0-S01, W0-S02 | INS-z3; M-consent | GATE-bundle; a labeled recorded run while cold | 0.5 |
| W1-T07 | Call It and Mirror v0 | M | sonnet | W1-T03 | M-call-it, M-mirror, SCR-mirror | GATE-items green; the first call is final and cannot be edited | 1 |
| W1-T08 | Today, the Keep block and *Set your week* | M | sonnet | W1-T05 | M-today, M-set-your-week, M-weekly-review, M-monthly-retro; SCR-today, SCR-week | the scheduler's property test gives every KC ≥ 8 graded opportunities in 60 days at the four windows on a simulated calendar (KCs credited at placement or test-out excluded) and computes the Keep load; RUN-lz-today-w1 records learner-zero's median Today (descriptive) | 1 |
| W1-T09 | Boot | M | opus | W1-T05, W1-T06, W1-T07, W1-T12 | SCR-boot; M-feels-harder; the S1 slice of the placement walk | GATE-lessons; GATE-kc (the walk credits a KC only once its hard `requires` are credited); the GATE-bundle timing gate at 360 px; RUN-lz-boot-w1 (descriptive); RUN-boot-firstsuccess, at least five naive testers with voluntary event-log exports, before the "external learners" label (OD-9) | 1.5 |
| W1-T10 | S1 lessons S1.L1–S1.L5 | L | opus | W1-T05, W1-T06, W1-T12 | the S1 lessons; M-prequestion, M-production-twin; the formalize progression and the interpretation tap (§8.4) | GATE-lessons, GATE-numbers, GATE-calls and GATE-runs green; the six content block types named and logged in §12 | 4.5 |
| W1-T11 | Drawers D-01–D-06 and D-13 | M | opus | W1-T04, W1-T12 | SCR-drawer; D-01–D-06, D-13 | GATE-links, GATE-items, GATE-generators and GATE-kc on drawer items (D-05's GEN-proof-structure items follow with W2-T11); GATE-numbers, GATE-runs and GATE-codes on drawer copy; GATE-lessons' copy, block-type and no-lock rules on SCR-drawer | 1.75 |
| W1-T12 | Record the S1 runs | S | sonnet | W0-S11 | the S1 runs | the eleven S1 runs of §9.5 recorded (GATE-runs) | 0.5 |
| W1-T13 | LAB-1 and `statespace check` for Z3 | M | opus | W0-S11 | LAB-1; SCR-lab, SCR-bench; INS-bench-smt (Z3); `statespace check` | GATE-labs: the template fails and the solution passes under `uv run`, with no devcontainer | 2 |
| W1-T14 | Receipt import and claim minting | M | opus | W0-S11 | INS-receipt, SCR-receipt, SCR-instrument | GATE-schema; a fuzzed import never renders as HTML; a fragment above the size cap is refused in favor of a file; a CLI receipt claiming *re-checked here* is rejected | 1 |
| W1-T15 | Claim cards and GATE-claims | M | opus | W1-T14, W1-T12 | M-claim-card, SCR-claims; GATE-claims | GATE-claims green on CL-1.1–CL-1.5 | 1 |
| W1-T16 | Specimen cabinet | M | sonnet | W1-T03, W1-T12 | M-specimen-cabinet, M-re-find, SCR-specimens | GATE-specimens: SP-1.1–SP-1.10 mounted with run ids | 1.5 |
| W1-T17 | Audit Desk v1 with eight anchors | L | opus | W1-T05, W1-T12 | M-audit-desk, M-twins, SCR-audit | AUD-1.1–AUD-1.3 with variants pass GATE-audit and GATE-audit-blind; AUD-2.1–AUD-2.4 and AUD-5.3 keyed only by executed runs, without variants, and scheduled after LAB-2 and LAB-5 | 2.5 |
| W1-T18 | Agent kit, `llms.txt`, phone layouts | M | sonnet | W1-T13 | the agent kit; GATE-guardrails | GATE-guardrails; GATE-a11y at 360 and 320 px | 1 |
| W1-T19 | Pocket checkers | M | opus | W1-T05 | INS-pocket, M-pocket-checkers | GATE-conformance: pocket checkers = Z3 on property tests, so offline Today items need no Z3 download | 0.5 |
| W1-T20 | Settings: export, merge-import with undo, 7-day backup nudge | M | sonnet | W1-T03 | SCR-settings | GATE-schema plus property tests: export then merge-import round-trips, and undo restores the log | 0.5 |

**W1 review total:** 28.75 h, plus about 1 h for the screen-reader pass.

### W2 Proof

Goal: S2–S3 with statement integrity. Scope: the Lean lane, challenge packs, generated Goal Replay, ladders, the self-explanation unit, LAB-2, LAB-3 with goldens, the IR and the Lane A interpreter, three more generator families, Proof Blocks, the Defence engine with its retake rule, welcome-back and test-out. **Exit:** CI shows comparator rejecting a weakened statement and a redefined function, and kernel replay rejecting `skipKernelTC`; GATE-replay passes on a toolchain bump; learner-zero signs off S1–S2 (RUN-lz-signoff-w2); ER-6 ships (GATE-erosions); the screen-reader pass is filed.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W2-T01 | Lean lane in `statespace check` | L | opus | W0-S06 | INS-bench-lean; M-manual-mode | GATE-labs reproduces the SP-2.4–SP-2.8 verdicts; RUN-lean-template records the template build with Std and `autoImplicit false` | 1.5 |
| W2-T02 | LAB-2 challenge pack and template | M | opus | W2-T01 | LAB-2 | GATE-labs with weakening mutants; every Defence mutant elaborates or is predicted not to | 2 |
| W2-T03 | Goal Replay generator and UI | M | sonnet | W0-S10 | INS-goal-replay, M-goal-replay-fading; GATE-replay | GATE-replay green on a simulated bump | 0.5 |
| W2-T04 | S2 lessons S2.L0–S2.L10 | L | opus | W2-T03, W2-T08, W2-T10 | the S2 lessons; D-07, D-08, D-15 | GATE-lessons, GATE-numbers and GATE-runs green | 10.25 |
| W2-T05 | Self-explanation unit (OD-10) | S | opus | — | M-self-explanation | the authors' reply logged and the license file in place, the text adapted and the booklet's three rights-reserved images left out; or, after 4 weeks without a reply, an original 15–20-minute unit under the course license passes GATE-lessons | 1 |
| W2-T06 | Hint ladders and the explanation gate | M | opus | W2-T02 | M-hint-ladder | GATE-labs: every check of LAB-1, LAB-2 and LAB-3 has rungs R0–R4 | 2 |
| W2-T07 | Mini-Plinth reference semantics and goldens | L | opus | W2-T01 | the Lean reference semantics; kernel-checked goldens | GATE-labs: the semantics lint is clean and the goldens are kernel-checked, over a finite state with decidable equality, a derived `DecidableEq` for `Except` and a structurally recursive, fueled evaluator {{run:RUN-lean-golden-harness}} | 2 |
| W2-T08 | IR schema, TypeScript interpreter, Lane A host | M | opus | W2-T07 | INS-interp, INS-lane-a; `IR@1`; GATE-interp | GATE-interp and GATE-schema green | 1 |
| W2-T09 | S3 lessons and LAB-3 with capstone stages | L | opus | W2-T08, W2-T10 | the S3 lessons; LAB-3; D-14, D-22 | GATE-labs (rungs included), GATE-lessons and GATE-runs green; GATE-erosions passes for ER-6 | 10.5 |
| W2-T10 | Record the S2–S3 runs | S | sonnet | W2-T01 | the S2–S3 runs | the eighteen S2–S3 runs of §9.5 recorded (GATE-runs) | 0.5 |
| W2-T11 | GEN-spec-it, GEN-proof-structure, GEN-defend | M | opus | W1-T05 | GEN-spec-it, GEN-proof-structure, GEN-defend; M-prove-it | GATE-generators green | 1.5 |
| W2-T12 | Defence engine, sign-off and retake | M | opus | W2-T11 | M-defence, M-explain-back, SCR-defence | GATE-schema plus ledger property tests: sign-off derived, never stored; the Wilson display; the minimum part size, two-session and retake rules of §8.6 | 1.5 |
| W2-T13 | Anchors AUD-3.1–AUD-3.2; variants of AUD-2.1–AUD-2.4 | M | opus | W1-T17, W2-T01, W2-T10 | the S2–S3 audit pool | GATE-audit green, with AUD-2.1's both-parties member keyed by RUN-lean-refund-both and AUD-3.1 by RUN-lean-checker-drift | 1.5 |
| W2-T14 | Stuck protocol and parked goals | S | sonnet | W2-T01 | M-stuck-protocol; `statespace stuck` | GATE-privacy on a stuck-output fixture finds no private path | 0.5 |
| W2-T15 | Notes composer; learner-zero sign-off | S | sonnet | W2-T12 | M-notes, SCR-notes | GATE-schema on note exports; RUN-lz-signoff-w2 shows S1–S2 signed off, derived from learner-zero's events | 0.5 |
| W2-T16 | Welcome-back, re-entry, test-out and placement | M | sonnet | W1-T08, W2-T12 | M-welcome-back ("Back at the bench", the landmark restart), M-test-out and the "From kernelspace" placement | GATE-lessons (no overdue counts, no lock copy); property tests: placement pre-credits only evidenced KCs, never the §2.1 deny list, and credits a KC only once its hard `requires` are credited; test-out passes at two of three with the constructed answer right | 1 |
| W2-T17 | Refutation cards and sure-and-wrong returns | S | sonnet | W1-T07 | M-refutation-card, M-sure-wrong-returns | GATE-items | 0.5 |
| W2-T18 | Proof Blocks | M | sonnet | W2-T11 | M-proof-blocks | GATE-a11y (keyboard ordering) and GATE-items | 0.5 |

**W2 review total:** 38.75 h, plus about 1 h for the screen-reader pass.

### W3 Obligations and Time

Goal: S4–S5. Scope: the Derivation Board, GEN-wp-it, GEN-cti-or-bug, the CTI workbench, LAB-4 with its miscompile stage, the TLC lane, the Theater on TLC graphs, Spectacle, the lasso validator, GEN-trace-allowed, GEN-lasso-or-not, LAB-5, the claim graph with seams, the Lean keep-alive, Clearinghouse v0, change cards. **Exit:** Spectacle = TLC on every authored spec; the lasso validator agrees with TLC on fixtures; ER-2 and ER-7 ship (GATE-erosions); the Derivation Board works keyboard-only; the Clearinghouse's first incidents pass GATE-audit-blind with baselines recorded; the screen-reader pass is filed.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W3-T01 | Derivation Board | M | sonnet | W1-T06 | INS-derivation, SCR-derivation | GATE-a11y: the keyboard-only path passes | 0.5 |
| W3-T02 | GEN-wp-it, GEN-cti-or-bug, CTI workbench | M | opus | W3-T01 | GEN-wp-it, GEN-cti-or-bug, M-cti-workbench | GATE-generators; bounds printed (GATE-stamps) | 1.5 |
| W3-T03 | S4 lessons | L | opus | W3-T02, W3-T07 | the S4 lessons; D-10, D-18 | GATE-lessons, GATE-numbers and GATE-runs green | 8 |
| W3-T04 | LAB-4 with the cvc5 cross-check | L | opus | W2-T08 | LAB-4; INS-bench-smt (cvc5) | GATE-labs, every check with rungs R0–R4 and LAB-4.c7's broken and fixed builds; the template's `seq`, `if` and integer scalars in `IR@1` with reference semantics, on v0's escrow encoding of holds; LAB-4's ABI (its SMT-LIB vocabulary and named conjuncts) written into D-14; GATE-calls cross-checks authored `unsat`s | 2.5 |
| W3-T05 | TLC lane with pinned jars | M | opus | W0-S05 | INS-bench-tlc | GATE-labs: argv on every receipt; the vendored jars match RUN-tlc-jars's SHA-256; the 1.7.4 fallback runs in CI | 1 |
| W3-T06 | Theater on TLC state graphs | L | sonnet | W3-T05 | INS-theater, SCR-theater | GATE-a11y: trace tables and phone lanes pass | 1 |
| W3-T07 | Record the S4–S5 runs | S | sonnet | W3-T05 | the S4–S5 runs | the nineteen S4–S5 runs of §9.5 recorded (GATE-runs) | 0.5 |
| W3-T08 | Spectacle instrument and its minimap | M | sonnet | W0-S04 | INS-spectacle, M-telescope | GATE-conformance: Spectacle = TLC | 0.5 |
| W3-T09 | Lasso validator | M | opus | W0-S05 | INS-lasso | GATE-conformance: the lasso validator = TLC on the fixtures | 0.5 |
| W3-T10 | GEN-trace-allowed and GEN-lasso-or-not | M | opus | W3-T09 | GEN-trace-allowed, GEN-lasso-or-not | GATE-generators green | 1 |
| W3-T11 | S5 lessons and LAB-5 | L | opus | W3-T06, W3-T07 | the S5 lessons; LAB-5; INS-bench-apalache (optional); D-09 | GATE-labs (every check with rungs R0–R4), GATE-lessons, GATE-numbers and GATE-runs green | 9.75 |
| W3-T12 | Claim graph, seams and erosion forecasts | M | opus | W1-T15 | M-seam-erosion, M-erosion-forecast; GATE-erosions | GATE-erosions passes for ER-2 and ER-7; a property test replays the default and builder's paths and every shipped ER fires on each | 1.5 |
| W3-T13 | Anchors AUD-4.1–4.3, 5.1, 5.2, 5.4; AUD-5.3 variants; Lean keep-alive | M | opus | W1-T17, W3-T05, W3-T07 | M-lean-keep-alive | GATE-audit green, AUD-5.3's G5 variant included; keep-alive sessions scheduled in the Keep block only after S2 sign-off (scheduler property test) | 2 |
| W3-T14 | Clearinghouse v0 | M | opus | W2-T08, W1-T17, W3-T04 | M-docket, SCR-clearinghouse; the checker plug-in | a seeded Mini-Plinth world on INS-interp with accounts, postings and holds; the learner's checker gates proposals (a GATE-labs smoke test); 1–3 incidents a week from mutation-generated proposals (each sound with a seeded probability of 30–60%) and GEN-spot-the-gap; GATE-audit-blind extended to the incidents; naive and reference baselines recorded as RUN-docket-baselines | 1.5 |
| W3-T15 | Change cards | S | sonnet | W0-S11 | M-change-cards, SCR-changes | GATE-runs: a runs diff renders a change card with two retrieval items | 0.5 |

**W3 review total:** 32.25 h, plus about 1 h for the screen-reader pass.

### W4 Correspondence and Secrecy

Goal: S6–S7 on measured PostgreSQL. Scope: `isorun`, nightly PostgreSQL specimens, the history checker, PGlite, GEN-anomaly-id, LAB-6, the Datalog pair, the paired-state evaluator, GEN-leaks-to-observer, the RLS differential, LAB-7 with revocation, the dated-incidents filter, Clearinghouse plug-ins, spec duels. **Exit:** nightly PostgreSQL 18.6 asserts 22003, 40001, 40P01 and write skew at REPEATABLE READ; the checker classifies the history fixture set; tab Datalog = Soufflé; ER-1, ER-3 and ER-9 ship (GATE-erosions); the screen-reader pass is filed.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W4-T01 | `statespace isorun` | L | opus | W0-S09 | `statespace isorun` | GATE-specimens, including the upstream isolationtester specs (RUN-isorun-upstream) | 1.5 |
| W4-T02 | Nightly PostgreSQL specimens | M | sonnet | W4-T01 | GATE-specimens' PostgreSQL rows | GATE-specimens asserts 22003, 40001, 40P01 and write skew | 0.5 |
| W4-T03 | History viewer and serializability checker | L | opus | W4-T01 | INS-history | GATE-specimens: the history fixture set classified as recorded; the search bound printed (GATE-stamps) | 1 |
| W4-T04 | PGlite instrument | M | sonnet | W0-S08 | INS-pglite | GATE-conformance: PGlite = PostgreSQL 18.6 | 0.5 |
| W4-T05 | GEN-anomaly-id and S6 lessons | L | opus | W4-T03, W4-T10 | GEN-anomaly-id; the S6 lessons; D-23 | GATE-generators, GATE-lessons and GATE-runs green | 8.25 |
| W4-T06 | LAB-6 with its capstone stage | L | opus | W4-T04 | LAB-6; the reference compiler and reference R(S, D) | GATE-labs, every check with rungs R0–R4, with the differential suite on PostgreSQL 18.6 and on PGlite; `plan@1` validates the plan value crossing the Lane A ABI (GATE-schema) | 2.5 |
| W4-T07 | Datalog pair | M | sonnet | W0-S03 | INS-datalog, INS-bench-souffle | GATE-conformance: equal relations | 0.5 |
| W4-T08 | Paired-state evaluator and GEN-leaks-to-observer | M | opus | W2-T08 | INS-pairs, GEN-leaks-to-observer | GATE-generators green | 1 |
| W4-T09 | S7 lessons and LAB-7 with the RLS differential | L | opus | W4-T07, W4-T08, W4-T10 | the S7 lessons; LAB-7; INS-bench-alloy (D-16); D-17, D-20 | GATE-labs (every check with rungs R0–R4), GATE-lessons, GATE-numbers and GATE-runs green | 10 |
| W4-T10 | Record the S6–S7 runs | M | sonnet | W4-T01 | the S6–S7 runs | the twenty-two S6–S7 runs of §9.5 recorded (GATE-runs) | 1 |
| W4-T11 | Dated incidents in the specimen cabinet | M | opus | W4-T10 | M-hall-of-records | GATE-specimens: every dated-incident card cites a run re-run in CI | 1 |
| W4-T12 | Erosions ER-1, ER-3, ER-9; drawer D-30 | S | opus | W3-T12, W4-T10 | ER-1, ER-3, ER-9 | GATE-erosions | 0.5 |
| W4-T13 | Anchors AUD-6.1–6.3, 7.1, 7.2; sibling bridge cards | M | opus | W1-T17, W4-T01, W4-T10 | M-sibling-bridge | GATE-audit; the prerequisite cards D-11 and D-21 resolve (GATE-links) | 1.5 |
| W4-T14 | Clearinghouse plug-ins: compiler, concurrent traffic, users, teams and documents | M | opus | W3-T14, W4-T03, W4-T04, W4-T06, W4-T07, W4-T08 | M-docket's plug-ins | the learner's compiler runs on PGlite inside the world, against the reference compiler as its baseline; concurrent command traffic replays recorded histories; the world gains users, teams, roles, documents and sharing; GATE-audit-blind on the new incidents; plug-in smoke tests in GATE-labs; RUN-docket-baselines re-recorded with the new families | 1 |
| W4-T15 | Spec duels by URL | M | opus | W0-S01 | M-spec-duel | GATE-bundle: the fragment never leaves the device and only the instrument origin parses it; the distinguishing state is keyed by Z3 (GATE-calls) | 0.5 |

**W4 review total:** 31.25 h, plus about 1 h for the screen-reader pass.

### W5 Effects, Preservation and Assembly

Goal: S8–S10 and the published report. Scope: the simulator, trace validation, LAB-8 with its liveness stage, S9 with the HOL-IMP warm-up, LAB-9, LAB-10, report export, `/assurance`, the release gate, `statespace audit`, the private overlay, the Clearinghouse's provider. **Exit:** trace validation rejects the ack-before-durable mutant; learner-zero publishes a report; GATE-release is green; ER-4, ER-5, ER-8, ER-10, ER-11 and ER-12 ship (GATE-erosions); the screen-reader pass is filed.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W5-T01 | Sim instrument and `statespace trace validate` | L | opus | W3-T05 | INS-sim; `statespace trace validate`, `statespace sim` | GATE-labs on LAB-8.c6: the ack-before-durable mutant is rejected, and the run is recorded as RUN-tlc-trace-validation | 1.5 |
| W5-T02 | S8 lessons and LAB-8 | L | opus | W5-T01, W5-T03 | the S8 lessons; LAB-8; D-12, D-19 | GATE-labs (every check with rungs R0–R4), GATE-lessons, GATE-numbers and GATE-runs green | 8.5 |
| W5-T03 | Record the S8–S9 runs | M | sonnet | W5-T01, W5-T04 | the S8–S9 runs | the seventeen S8–S9 runs of §9.5 not recorded by W5-T01 or W5-T04 (GATE-runs) | 1 |
| W5-T04 | Stack-machine warm-up, S9 challenge packs, reference translation validator | M | opus | W2-T01 | the S9 challenge packs; the reference translation validator | GATE-labs: comparator accepts the reference proofs; the S9 target IR's goldens are kernel-checked for GATE-interp; the reference validator's verdicts recorded as RUN-tv-reference, which keys the honest and wrong-account outputs and the swapped-writes, read-both-first, re-evaluated-amount, rollback, step-count and `maybeFail` cells | 1.5 |
| W5-T05 | S9 lessons and LAB-9 | L | opus | W5-T04, W5-T03 | the S9 lessons; LAB-9 | GATE-labs (every check with rungs R0–R4), GATE-lessons and GATE-runs green; two mini-Defences configured, each sampling only its half | 10.5 |
| W5-T06 | Report export from the claim graph | M | opus | W3-T12 | `report@1`; the SCR-claims export; `statespace export` | GATE-schema (`report@1`); the defeater log as m of n | 1 |
| W5-T07 | LAB-10 and the demonstration recorder | L | opus | W5-T06 | LAB-10; M-public-counterexample (stretch); `statespace demo`, `statespace demo record` and `statespace proposal draw`; the deferred drawers' cards D-31–D-40 | RUN-core-demo recorded with its outputs listed; GATE-labs, every check with rungs R0–R4 | 5 |
| W5-T08 | `/assurance` and the course erosion log | M | sonnet | W0-S11 | SCR-assurance; the SEAM-13 course claim | GATE-runs: a simulated tool bump renders an EROSION entry | 1 |
| W5-T09 | Release gate | S | opus | W5-T08 | GATE-release | GATE-release green | 0.5 |
| W5-T10 | Erosions ER-4, ER-5, ER-8, ER-10, ER-11 | M | opus | W3-T12, W5-T03 | ER-4, ER-5, ER-8, ER-10, ER-11 | GATE-erosions | 1 |
| W5-T11 | Anchors AUD-8.1–AUD-9.2 and `statespace audit` | L | opus | W1-T17, W5-T01, W5-T03 | `statespace audit` | GATE-audit; keys computed locally | 2 |
| W5-T12 | Private overlay and learner-zero report | M | opus | W5-T06 | M-overlay; `statespace overlay` | GATE-privacy finds nothing from the overlay in the repo | 1 |
| W5-T13 | Clearinghouse provider and validator plug-ins; ER-12 | M | opus | W4-T14, W5-T01, W3-T12, W5-T04, W5-T05 | M-docket's external provider, with the learner's outbox machine under seeded faults; the validator plug-in (LAB-9.11), which checks the world's plans; ER-12 | GATE-erosions: ER-12 fires by the oldest-open-erodible-seam rule on both published paths; GATE-conformance validates the provider simulator's traces against S8's reference spec; RUN-docket-baselines re-recorded with the new families | 1 |

**W5 review total:** 35.5 h, plus about 1 h for the screen-reader pass.

### W6 Launch hardening

Goal: edition 1. **Exit:** GATE-release green from a clean clone; axe with 0 serious issues on every screen plus full NVDA and VoiceOver passes; GATE-privacy green; edition pins recorded.

| Task | Title | Size | Model | Depends on | Implements | Acceptance | Review h |
|---|---|---|---|---|---|---|---|
| W6-T01 | Accessibility pass | M | sonnet | W5-T09 | GATE-a11y across every screen | GATE-a11y green; full NVDA and VoiceOver notes filed | 2 |
| W6-T02 | Performance budgets | M | sonnet | W5-T09 | GATE-bundle budgets | GATE-bundle green on Today and Boot | 0.25 |
| W6-T03 | Glyphs and fonts | S | sonnet | W5-T09 | GATE-glyphs | GATE-glyphs green | 0.25 |
| W6-T04 | Publication hygiene audit | S | opus | W5-T12 | GATE-privacy's license lint | GATE-privacy green, every vendored directory carrying its license | 1 |
| W6-T05 | Docs and edition notes | M | sonnet | W6-T04 | README, CONTRIBUTING, assurance copy | GATE-numbers and GATE-links green on them | 1.5 |
| W6-T06 | Cue-ablation and blind-strategy sweep | M | opus | W5-T11 | GATE-items, GATE-audit-blind | GATE-items and GATE-audit-blind green on every item | 1 |
| W6-T07 | Runs re-record and the PostgreSQL 19 check (OD-12) | M | sonnet | W5-T03 | GATE-runs | the GATE-runs diff reviewed and recorded | 1 |
| W6-T08 | Final adversarial review against I1–I10 | M | opus | W6-T01–W6-T07 | — | every finding closed by a gate or content change, or logged as an erratum on SCR-changes whose ID GATE-links resolves | 3 |

**W6 review total:** 10 h.

### Calendar [D]

| Wave | Owner review (h) | Weeks at 2.5 h/week | Learner-zero study the exit needs | Implied duration |
|---|---|---|---|---|
| W0 | 13.75 | 5.5 | none | about 5.5 weeks |
| W1 | 29.75 | 11.9 | S1: 5.3–9.4 h (1.1–2.0 weeks) | about 12 weeks |
| W2 | 39.75 | 15.9 | S1–S2 signed off: 20.9–37.8 h (4.4–8.0 weeks) | about 16 weeks |
| W3 | 33.25 | 13.3 | none at the exit; learner-zero studies S3–S4 meanwhile | about 13 weeks |
| W4 | 32.25 | 12.9 | none at the exit | about 13 weeks |
| W5 | 36.5 | 14.6 | the arc through S10: 107–197 h of stage work, about 43–80 weeks from W1's start at 6 h/week (§3.11) | review needs about 15 weeks, but the exit waits for learner-zero: about 69–80 weeks after W1 starts |
| W6 | 10 | 4.0 | none | about 4 weeks |
| **Total** | **≈ 195** | **≈ 78** | | **about 18–21 months from W0's start** |

Review hours, not agent time, set this calendar. If a wave's review total outruns its window, the cut order (§14) applies before the queue gate is relaxed.

---

## 14. Risks and cut order

| Risk | Mitigation |
|---|---|
| Owner review hours saturate | the queue gate (OD-7) over the tasks' "Review h", the §13 calendar, learner-zero, the cut order below |
| Plans prove optimistic | logged times replace estimates each wave; GATE-budget recomputes, warns on implausibly low stages and checks the Keep load; arcs shown as ranges |
| The Lean valley (S2–S3, S9) | per-lemma stages, 45-minute weekend proof stages, ladders, the stuck protocol with parked goals, fading, the keep-alive |
| The builder's path breaks a dependency | GATE-kc checks every published path against the hard `requires` edges and the lab artifacts; substitutes declared in §3.0 |
| Tool churn: TLC pre-release, Spectacle HEAD, Lean 4.36, PostgreSQL 19 | pins by SHA, GATE-runs diffs, conformance gates, edition pins (OD-12) |
| Phones run Pyodide poorly | W0-S02; recorded runs with ids; pocket checkers |
| No sandbox outside Linux | sandbox state recorded, never required; the devcontainer |
| Browser storage eviction | the lab repo is the record; exports; the 7-day backup nudge |
| Invented numbers return | GATE-numbers, GATE-facts, GATE-runs' resolution check, a deny-list of known-false sentences |
| Private-design leakage | GATE-privacy; review JSONs excluded; "your system" |
| Agents do the work | provenance, unseen seeds, Prove-it, the Defence; the honor system stated (OD-8) |
| Sibling courses unfinished | self-contained prerequisite cards (D-11, D-12, D-21) |
| One learner | descriptive keep/kill rules fixed in advance (W0-T07); learner-zero numbers labeled descriptive; naive testers for Boot (RUN-boot-firstsuccess) |

**Cut order** (BRIEF §7.10): Derivation Board polish → Judgment breakdowns → the Alloy lab → path drawing → deferred-drawer UI (the Shelf) → bridge lessons beyond 30 → erosions lacking both endpoints → audit anchors beyond two per stage.

**Cut eligibility.** A bridge is cut-eligible only if (1) it carries no threshold KC; (2) it is not named as a seam's planting lesson or an erosion's cashing lesson; (3) it carries no outcome-core KC (§2.2); (4) it is not the only lesson of a roadmap completion test or of a mechanic, and its receiving lesson names any roadmap clause (a theory term, project sentence or named resource in `docs/COVERAGE.md`) whose only home was the cut bridge, which GATE-coverage checks; and (5) every KC and claim template it carries moves, with one added graded item, to a named receiving lesson that is itself not cut, so no KC loses its in-lesson items. GATE-budget lints the list against (1)–(4) and checks (5) from the receiving-lesson column. Twenty-one bridges qualify, so "bridge lessons beyond 30" can fold exactly twenty into reading cards, in this order:

| # | Bridge | Its KCs move to |
|---|---|---|
| 1 | S4.L5 | S4.L8, which already teaches KC-4.frame-condition |
| 2 | S2.L1 | S2.L4 (S2.L7 once S2.L4 is cut); the Natural Number Game stays as the card's link-out |
| 3 | S5.L9 | S5.L8; CL-5.4 stays stretch-backed in LAB-5.7 |
| 4 | S5.L2 | S5.L3, with SP-5.2 |
| 5 | S3.L8 | S3.L7 |
| 6 | S9.L3 | S9.L4 |
| 7 | S5.L1 | S5.L3 |
| 8 | S4.L1 | S4.L2 |
| 9 | S8.L2 | S8.L3 |
| 10 | S5.L4 | S5.L5 |
| 11 | S2.L3 | S2.L5 |
| 12 | S7.L2 | S7.L3, with CL-7.1 (still minted in LAB-7.2) |
| 13 | S2.L6 | S2.L5; CL-2.2 and CL-2.3 are still minted in LAB-2.3 and LAB-2.4 |
| 14 | S3.L3 | S3.L4 |
| 15 | S2.L8 | S2.L7, with SP-2.1; CL-2.5 is still minted in LAB-2.6 |
| 16 | S8.L4 | S8.L7, with SP-8.3; CL-8.2 is still minted in LAB-8.5 |
| 17 | S6.L5 | S6.L2, with SP-6.8 and CL-6.4 |
| 18 | S2.L4 | S2.L7 |
| 19 | S9.L1 | S9.L6; CL-9.1 is still minted in LAB-9.2 |
| 20 | S9.L2 | S9.L8 |

S7.L1 (its KC to S7.L3) is the one spare. Cutting both S8.L2 (row 9) and S8.L4 (row 16) would take S8's low estimate below half the roadmap's lower bound, so the second of the two needs a §12 justification before GATE-budget's warning clears. Six bridges left the earlier list: S3.L1 plants SEAM-6, S6.L7 is the only lesson for the roadmap's SERIALIZABLE-with-retries work, S6.L9 plants SEAM-9, S7.L3 carries outcome (a)'s KC-7.policy-checking, S8.L1 carries threshold KC-8.commit-not-send, and S9.L9 carries threshold KC-9.tcb and cashes ER-10. S4.L3 (the only lesson for conditionals in S4's completion test), S6.L1 (the only lesson for NULL and bag semantics in S6's) and S2.L0 (the self-explanation unit itself) are not eligible either.

---

## 15. Revision log

**Revision 2, 2026-10-23.** Applies two critic passes (25 findings: C1, M1–M9, m1–m15; 28 findings: P-01–P-28). Overlapping findings were applied once: M1 with P-08, M2 with P-01, M5 with P-25, M6 with P-09, M7 with P-06, M9 with P-15, and m15 with P-27. No finding was rejected outright. Seven were adapted where the literal fix would have broken another rule; the reasons are given in their rows and marked "adapted".

| Finding | Severity | What changed |
|---|---|---|
| C1 TLC's inductive check stamped [P] | critical | S5.L9 now earns [M] · constants from TLC's technique and [P] only from a parametric proof of the step in Z3 (workers as an uninterpreted sort) or Lean. LAB-5.7, KC-5.inductive-invariant-tla (renamed), CL-5.4 (stamp, run RUN-z3-inductive-param, translation defeater), D-18, INS-bench-apalache and two new §8.8 rows follow; AUD-5.3 gains the G5 variant "TLC inductive check at N = 3 stamped PROVED for all N"; §12 item 29. |
| M1 · P-08 Builder's path not topological | major | OD-3 and §3.0 publish a repaired order (S5.L9 after S4, S7 after S4, S6.L1–L2 before S6.L6–L7), one declared soft edge covered by the new drawer D-23, and reference-compiler substitutes labeled "reference module, earns nothing". GATE-kc checks every published path against hard edges and lab artifacts; the keep-alive starts after S2 sign-off. Verified by script: no hard-edge violation on either path. |
| M2 ER-12 could never fire | major | "Oldest open erodible seam" excludes held seams SEAM-13–SEAM-15; ER-12 fires after S9 on both paths (§3.8, §3.10, §5.4, M-docket). W3-T12 property-tests that every ER fires on both paths; the new GATE-erosions checks endpoints, forecasts and remedies. |
| M3 CL-8.1 was a liveness claim in a safety stage | major | CL-8.1 is now safety (intent never lost before acknowledgement); the new CL-8.5 is liveness under weak fairness on Worker and eventual recovery as [A], minted beside CL-8.4. *Adapted:* the fix named LAB-8.5, which is trace validation, so a new LAB-8.3 checks liveness; it also gives Defence Part B's "switch crash actions off in the liveness check" an artifact to mutate. SEAM-12 rides on CL-8.2. |
| M4 Three roadmap acts lacked lab stages | major | LAB-3.6 (`force move`, refuted by a kernel-checked counterexample golden), LAB-4.7 (miscompile your own checker: broken reports [P], fixed reports [R] with a replayed witness) and LAB-7.6 (revocation stated temporally, with its refuted twin). Later stages renumbered; budgets recomputed. |
| M5 · P-25 V2 coverage not auditable | major | New §12.1 maps V2-01–V2-33. Written in: the lesson-rail rule (V2-05), the ResourceOps as postings in S3.L2 and KC-3.resource-postings (V2-16), at most six block types in W1–W2 (V2-18), the pick → fix → write formalize progression (V2-26), translation validation as LAB-9.1's first win (V2-29), the faded interpretation tap (BRIEF §5.1) and the claims cadence (§4.1, GATE-budget). |
| M6 · P-09 Tiers on the wrong lessons | major | S3.L6 core and S3.L5 bridge (F2 retargeted to step-invariant case analysis); S9.L6 core and S9.L2 bridge; S7.L4 core (V2-23) and S7.L2 bridge. Still 26 core and 50 bridge. Outcome (d) gains KC-3.step-invariant. |
| M7 · P-06 Dosage targets missing; Keep unverified | major | New §4.1 copies BRIEF §3.4 with sources and the gate or test holding each row. Every KC gets ≥ 8 graded opportunities in 60 days; threshold KCs add more. The Keep block is computed (§3.0) and planned at 45–75 min/week at 6 h/week and 60–105 at 10 h/week, so stage work is 4.75 h and 8.25 h a week. Today runs 3–5 times a week inside it; the keep-alive is its own session (M-today, M-lean-keep-alive). Bridges gain one prequestion so every KC has the in-lesson dose. §12 items 25–26. |
| M8 `native_decide` mutants would not elaborate | major | S2 and S9 Part B mutate closed, decidable goals (SP-2.1's `xferBuggy … = 15`; an IR golden), with the prediction grounded in RUN-lean-axioms (`…._native.native_decide.ax_1_1`, rejected as not permitted). GATE-labs checks that every mutant elaborates or is predicted not to. |
| M9 · P-15 Budget implausibly low; wrong 20/65/15 sentence | major | Lean proof stages that prove whole theorems are 45-minute weekend stages (BRIEF §7.3); LAB-3.4 is split in two; S9 preservation is six per-lemma or per-case stages; templates state what they pre-supply. GATE-budget warns below half the roadmap's lower bound (no stage triggers it now). The ratio sentence is replaced. Totals move from 98–173 h to 105–194 h; the 6 h/week projection becomes 42–78 weeks, inside the roadmap's 9–18 months. The 10-lab, 91-stage shape is proposed to the owner as OD-15. SCR-week shows the roadmap range beside the plan range. |
| m1 CL-4.4's bounded alternative stamp | minor | CL-4.4 is [P] · Z3 5.3.1 unsat · uncertified (the inductive step); the new CL-4.5 states "holds on traces ≤ N" as [M] · bound N with inductiveness [?] · CTI found. |
| m2 Unversioned stamps | minor | Every Lean template reads "Lean 4.35.0 kernel · axioms listed"; Z3 and cvc5 templates carry versions; §8.8's Lean row matches. |
| m3 TLC deadlock row misdescribed TLC | minor | §8.8 row reworded: stopped before exploring all reachable states; [?] · stopped at deadlock, n distinct states. |
| m4 AUD-1.1 cited the wrong issue key | minor | Cites PutnamBench #361 directly by URL; [putnam366] stays for the precedence drill. |
| m5 Statement hash differed from comparator's | minor | Receipt v1 hashes `trimRight` text plus one newline, matching Comparator Live. |
| m6 D-36's trigger reworded | minor | D-36's trigger was reworded to be neutral: "surfaced when a claim names it". |
| m7 No cvc5 cross-check in GATE-calls from W1 | minor | GATE-calls cross-checks every authored `unsat` with cvc5 1.4.2; W1-T05 and W1-T10 acceptance include it. |
| m8 Screen-reader passes only in W6 | minor | Every W1–W5 exit files a manual screen-reader pass on the wave's new screens (§13 rules and exits). |
| m9 Two roadmap items paraphrased away | minor | LAB-1.1 runs the Z3Py introductory example first; M-notes prompts rule 5's three parts and allows optional publication. |
| m10 SEAM-13 planted on the wrong claim | minor | SEAM-13 is planted on the course's own SCR-assurance claim about INS-interp; CL-3.5 notes that it rests on the pinned Lean reference. |
| m11 Runs without logs listed as executed | minor | RUN-lean-wasm, RUN-lean-plaingoal, RUN-lean-bv-decide and RUN-lean-vcgen moved to "to record" (W0-S11 re-runs them; `lean-measure/out/caul*.json` holds only partial probe output, and the `bv_decide` and `vcgen` outputs exist only as report prose); the executed list is 34. RUN-cvc5-alethe records `1.4.2-modified` verbatim from the pip wheel. |
| m12 S9 halves disagreed with the labs | minor | Half A is S9.L1–S9.L4 with LAB-9.1–LAB-9.3; the SQL validator is LAB-9.11 in half B, after the preservation stages; each mini-Defence samples only its half. |
| m13 S8's "prove safety" reinterpretation unlogged | minor | §12 item 28; S8's budget line points to it. |
| m14 Differential suite never ran on PostgreSQL 18.6 | minor | LAB-6.c4 runs on PostgreSQL 18.6 on the Bench and on PGlite, naming both engines; CL-6.1's qualifier names the engines. |
| m15 · P-27 Lock copy and an untagged SQLSTATE rule; loss framing | minor | "The first call is final: only it counts, and it cannot be edited" (M-call-it, W1-T07). The 23505/23P01 rule is a [D] policy tagged {{run:RUN-pg-catalog}}. "Proof debt" becomes "parked goal" in learner copy. Lab checks say "claim@1 validation" instead of citing GATE-claims. |
| P-01 No task built the Clearinghouse | critical | New W3-T14 (Clearinghouse v0, with naive and reference baselines in RUN-docket-baselines), W4-T14 (plug-ins: compiler; users, teams, documents) and W5-T13 (provider plug-in and ER-12, accepted by GATE-erosions). ER-12 redefined as under M2. |
| P-02 Unowned catalog components | major | Every task table has an "Implements" column; GATE-links fails on an unowned ID in §7, §9.1 or §10.1 (verified: all 46 mechanics, 23 instruments and 23 screens owned). New W1-T19 pocket checkers, W1-T20 settings, W2-T16 welcome-back and test-out, W2-T17 refutation and sure-and-wrong, W2-T18 Proof Blocks, W3-T15 change cards, W4-T15 spec duels. Hint rungs R0–R4 are in the acceptance of W2-T06 (LAB-1–LAB-3) and of every later lab task. |
| P-03 Prose acceptance | major | Every acceptance cell names a gate or a recorded run (verified by script). New GATE-erosions. Remaps as proposed, plus RUN-ci-fastlane (W0-T04) and RUN-doctor-devcontainer (W0-T05). |
| P-04 Learner-zero metrics gated W1 | major | A Playwright timing gate (GATE-bundle) checks Boot mechanically; learner-zero's Boot and Today figures are recorded as descriptive runs (RUN-lz-boot-w1, RUN-lz-today-w1). *Adapted:* RUN-boot-firstsuccess (at least five naive testers) gates the "external learners" label rather than W1's exit, because testers are optional under OD-9 and a third-party dependency must not stall a wave (the reasoning of P-28). |
| P-05 Keep/kill rules scheduled after the data | major | Moved to W0-T07 with its hash in RUN-keepkill-rules, checked by GATE-schema; W6-T08 deleted and the final review renumbered W6-T08. |
| P-06 Dosage weakened; Keep unsized | major | Applied with M7. |
| P-07 Cut list held load-bearing bridges | major | §14 states a cut-eligibility rule; S3.L1, S6.L7, S6.L9, S7.L3, S8.L1 and S9.L9 leave the list; 21 bridges qualify and 20 are listed in cut order with receiving lessons, so no shortfall. *Adapted:* the literal criterion "no KC taught nowhere else" would leave only two eligible bridges, because nearly every bridge introduces its own KC, and it contradicts the finding's own examples (S5.L9, S2.L6 and S5.L2 each carry a unique KC). It is implemented as criterion (5): every KC moves, with one added graded item, to a named receiving lesson that is not cut, plus criterion (4) protecting the only lesson of a completion test. |
| P-08 Builder's path | major | Applied with M1. |
| P-09 Tiers | major | Applied with M6. |
| P-10 First weekend depended on the devcontainer | major | LAB-1 and `statespace check lab1` run with `uv run --with z3-solver==5.3.1` or in the tab; W1-T13 depends on W0-S11; §3.1 defines the first-weekend slice (about 3–6 h at the multipliers); "verbatim" removed. The slice includes S1.L2 because S1.L3's KC requires KC-1.three-answers. |
| P-11 Boot overloaded and out of KC order | major | Boot's call is on `Int`, and the BitVec 64 wrap is an uncredited reveal; S1.L1 ("Negate, then search", core) and S1.L2 ("Three answers", bridge) are swapped, with D-01, D-03, SP-1.1, SP-1.7 and SP-1.8 updated. *Adapted:* Boot's call is a pre-instruction first-contact call that counts toward no KC state, because crediting KC-1.violation-as-sat at Boot would itself break the requires order (it needs KC-1.quantifier-negation, taught in S1.L1). |
| P-12 W1 lessons used W2 generators | major | GEN-which-stamp ships in W1 (W1-T05); S1.L4 uses GEN-negate-it's two-state template; W1-T10 depends on W1-T06 and W1-T09 on W1-T05. |
| P-13 Lean and TLC anchors keyed before their lanes | major | The five anchors ship keyed by executed runs only, without variants, scheduled after LAB-2 and LAB-5 (§6); variants move to W2-T13 and W3-T13, which depend on W2-T01 and W3-T05. |
| P-14 Placeholders could ship unrecorded | major | GATE-runs resolves every `{{run:ID}}` (release lane, and fast lane for non-draft content); the nine missing content-to-recording dependencies are added. |
| P-15 Lab shape and stage sizes | major | Applied with M9; OD-15 records the shape for the owner. |
| P-16 Too many nouns; Judgment undefined | major | A 25-term learner glossary in §0, five new terms at most in Boot, internal names linted out of learner copy. the Hall of Records screen becomes a "dated incidents" filter in SCR-specimens; the docket screen becomes SCR-clearinghouse; the Shelf becomes drawers tagged "deferred"; the telescope becomes the Spectacle view's minimap. Judgment is defined in §2.2. *Adapted:* the filter is named "dated incidents" rather than "Hall", to avoid adding a noun. |
| P-17 Ungradable objectives | major | The six objectives (S2.L1, S2.L4, S3.L1, S3.L5, S8.L1, S9.L9), plus S2.L5 and S1.L2, now name a GEN family and template; prose goes to uncredited explain-back; a §3.0 rule and GATE-lessons cover every other "explain" or "name". |
| P-18 Noisy per-part floor; no retake rule | major | Part C has four cases (S1 included); a part with five or fewer items passes with at most one miss; a retake rule (fresh seeds, at least 3 days, failed parts only, nothing locked, every attempt kept). §12 item 27 logs the change from BRIEF §4.7. |
| P-19 Review load unplanned | major | Every task has a "Review h" estimate [D] with a stated rubric; wave totals; a calendar at 2.5 h/week (about 189 h, about 17–20 months from W0, with W5's exit bound by learner-zero's arc); the queue gate counts these estimates. |
| P-20 Shelf copy read as locks | minor | Deferred drawers are always openable with a card; triggers surface them in Today; "opens at" became "surfaced at" throughout. |
| P-21 Sonnet on correctness-critical checkers | minor | W1-T01, W1-T13, W1-T14, W3-T04, W3-T05, W4-T06 and W5-T09 are opus (§12 item 24). |
| P-22 Third requires-before-taught violation | minor | KC-2.induction-principle requires KC-2.proof-reading; GATE-kc checks first-taught order (verified by script: no violation on the default path). |
| P-23 Cross-reference drift | minor | SEAM-1 planted S1.L3 and S1.L4; SEAM-14 planted S6.L6; §9.1 "Used in" regenerated from the lesson rows (INS-z3, INS-interp, INS-pglite, INS-lane-a, INS-pocket), with GATE-links failing on mismatch. |
| P-24 ID conventions drifted | minor | "threshold" replaces "thr"; `[step]` IDs are declared outside lesson counts, GATE-links included. |
| P-25 Dropped brief requirements | minor | Applied with M5. |
| P-26 Payload figure cited to a review | minor | Removed from RUN-z3-starter-pyodide; the first-load size is {{run:RUN-phone-pyodide}}. |
| P-27 Wording against the course's principles | minor | Applied with m15. |
| P-28 W2-T05 could stall on a third party | minor | After 4 weeks without a reply, an original 15–20-minute unit under the course license passes GATE-lessons. |

**Consistency fixes made along the way.** Bridges carry one prequestion (the per-KC dose); LAB-9.1 rejects a wrong-account write rather than a hoisted write, so ER-5's specimen stays unseen until S9.L7; S3's Defence samples step-invariant cases rather than stretch preservation; D-22's trigger reads "surfaced"; GATE-privacy gains a license lint for W6-T04; GATE-items counts CTI items.

**Verification run on this revision.** Scripts confirmed: all 61 tables are well-formed; every LAB stage and check reference resolves (91 stages); no `requires` edge is first taught after its dependent on the default path, and only the declared soft edge on the builder's path; every SEAM, ER, CL, SP, AUD, GEN, M, INS, SCR, GATE, D, W and OD reference resolves; every catalog ID in §7, §9.1 and §10.1 has an owning task; every task acceptance names a gate or a run; the 108-task dependency graph has no cycle, no dangling reference and no dependency on a later wave.

**Curriculum run IDs, 2026-10-24.** The stage specs in `curriculum/` cited nineteen run IDs that §9.5 lacked. Three have output logs on disk and join the executed list: RUN-tlc-help, RUN-tlc-sym-liveness and RUN-lean-refund-a21. Sixteen join "To record": three under W1-T12, four under W2-T10, four under W3-T07, three under W4-T10 and two under W5-T03; the §13 acceptance counts follow.

**Revision 3, 2026-10-24.** Applies the spine issues raised by the companion documents: the curriculum specs (S01–S10 and D-drawers), ARCHITECTURE, ASSESSMENT, AUDIT-DESK, COVERAGE, DECISIONS, DESIGN, EVIDENCE, LANDSCAPE, PLAN and WORLD in `docs/`, `labs/README.md`, `labs/TOOLS.md`, the root README, and the publication-privacy scrub. Many issues repeat across documents and were applied once. The curriculum run-ID pass above had already applied several of them (the `dp:` misconception row, RUN-lean-bv-decide and RUN-lean-vcgen moved to "to record", the three executed and sixteen to-record runs, §8.3's generated Stages column, `curriculum/` and `tracker/` in §11.1, and "pairs" in §6 and M-twins); this revision builds on them.

| Theme | Raised by | What changed |
|---|---|---|
| Evidence measured under Node | S01, LANDSCAPE, DECISIONS, labs/TOOLS, README | SP-1.8, INS-z3, INS-datalog, INS-pglite, §3.6, §3.7 and five run rows now say "under Pyodide in a Node harness" or "under Node"; W0-S02 and W0-S08 record the browser runs |
| Witnesses from different queries | S01, LANDSCAPE, labs/TOOLS | SP-1.4, §8.4, INS-z3 and RUN-z3-bv64-pyodide say model values are not canonical; GATE-conformance records a same-query pair |
| Runs and evidence | S01–S10, D-drawers, AUDIT-DESK, LANDSCAPE, labs/TOOLS | Boot's variant run; RUN-lean-template, RUN-lean-checker-drift, RUN-lean-refund-both, RUN-trace-validate-spike and RUN-lean-asset join "to record" (125 in all); `measure.log`, `z3_11179.txt` and `Hold.trace.json` registered with their runs; argv re-runs for the runs that rest on `RESULTS.md`; multi-configuration run records; the cvc5 proof, `isorun`, the vendored TLC jars and the Docker argv tracked; RUN-tlc-hold-lasso's description matches its log |
| Misconception IDs | S01–S10, D-drawers, ASSESSMENT, EVIDENCE | the `dp:` row stands (§12 item 40 says why not `MC-` or `MIS-`); S4's O-family split and dp:G10–dp:G11 join the proposed entries |
| Seams and erosions | S01–S04, S06–S08, WORLD | SEAM-1 and SEAM-2 list every carrier; SEAM-9 is carried per clause and ER-9 cracks its replica clause only; SEAM-14 rides on CL-6.3; SEAM-10 is defined; SEAM-12 covers copies in flight; ER-12's second endpoint is the Clearinghouse week; the oldest-seam order and the learner's week are defined |
| Labs and checks | S02–S07, S09, S10 | LAB-4.7 needs over-constraint; LAB-2.1 ships one proof; `lake check` runs once no `sorry` remains; LAB-3's template pins `Inv` and `Policy`; the goldens' prerequisites and pools; LAB-4's template, encoding and ABI; LAB-4.9 is a weekend stage; LAB-5 states crash settings; LAB-9.c3 and LAB-9.c4 are reworded; LAB-10.8 is multi-pass, with unknown and specimen sections |
| Lessons, generators and twins | S02–S10, ASSESSMENT | lesson rows name every family and instrument they use; S4.L5 and S7.L6 add GEN-spec-it; GEN-defend's names cover every Part B operator; new twin cards are pinned by RUN-twin-pins, documentation pages by content hash |
| Drawers | S04, S05, S07, S09, D-drawers, PLAN | §3.12's "Used in" is generated and complete; D-01 covers reading a counterexample; lesson tasks own their drawers and W5-T07 owns D-31–D-40 (5.75 more review hours); triggers read claim@1's `topics[]`; drawers sit outside planned hours |
| KCs and dose | COVERAGE, D-drawers, S04–S06, S08, S10, DECISIONS, EVIDENCE | KC-1.claim-anatomy (105 KCs); soft edges marked; set H added and set G opened at S8; step briefings; placement and test-out rules; the tool primer restored |
| Assessment rules | ASSESSMENT, AUDIT-DESK, PLAN, DESIGN | event fields; "fresh" means generated; `automated` marks receipts and claims only; Call It for multi-statement items; bias and the Mirror's diagnosis rule; two sessions and a minimum part size in sign-off; settled anchored at sign-off; balanced accuracy's interval; multi-label keys; the blind-strategy null; the sound share per sitting and per block |
| Audit Desk | AUDIT-DESK, S02, S04, S06, S07, S08, S09 | a key-run column; AUD-2.1's W1 sound member; acceptable classes; new "based on" cards for AUD-7.2 and AUD-8.2; AUD-2.4 cites its incident for its lesson; operators for every class; S9's Part C draws per half; "kind of gap" in learner copy |
| Stamps | S02, S04, S05, S08, WORLD, ARCHITECTURE, LANDSCAPE, DESIGN | §8.8 rows for custom axioms, models that do not replay, simulation, safety-only trace validation and world results; solver agreement stays "uncertified"; Apalache's bound is tagged [D]; CL-7.4 carries [C]; [R] gains a ring; the hue scope admits the two vermilion lines; night tokens fixed |
| Architecture | ARCHITECTURE, labs/TOOLS, README | I6 covers every outside byte; each instrument's origin; the layout names every directory and schema; `proposals/` and the protected-paths manifest; the receipt's lane authority, trim specification, guard state, CPU architecture and new blocks; OD-6's unit; a TTL check in GATE-facts; "facts registry"; the fragment cap; cache persistence in W0-S01; legend tokens exempt from GATE-runs |
| Publication | DECISIONS, README, the privacy scrub, DESIGN | GATE-privacy's scope and hashed term list; `research/` published redacted (OD-11); OD-16 for the course's licenses; the v1 canvas labeled and exempt; two internal notes reworded so they no longer point at a private referent |
| Plan, budget and waves | S01, S08–S10, PLAN, WORLD, DECISIONS, EVIDENCE, COVERAGE | S9's Defences and S10's briefings and passes recounted: 107–197 h, about 43–80 weeks at 6 h/week, the high end just past 18 months; the Keep block's assumed counts stated; every Clearinghouse plug-in owned; GATE-audit re-runs the baselines; W2-T08 is opus; W0-T07 defines its arms; GATE-coverage added; Rust and cvc5 logged as no new tool; owner review about 195 h, about 18–21 months |

**Left unchanged, with reasons.** S01 issue 14 (let ER-2 crack CL-1.3, optional): SEAM-2 is planted in S2.L7, so an S1 carrier would plant it a stage early and change ER-2's forecast. S06 issue 15 (consider a `[stretch]` LAB-6 stage): stretch stages sit outside the budget, so one would not change S6's position below the roadmap's lower bound, which §3.11 already accepts. S07 SI-19 (tablespace T4 at S7.L8): its own spec does not adopt it, and byzantine's bridge serves S7.L8. S07 SI-8 (a W4 task extending the Lean reference to S7): resolved instead by scoping SEAM-13 to the fragments its goldens cover, with INS-interp's S7 extension stated as having no Lean reference. S10 issue 3 (AUD-10.1–AUD-10.3): §12 item 9 now scopes the two-per-stage rule to S1–S9, because S10 audits the learner's own repo; SP-10.1 is added. S10 issue 9, its cadence clause: GATE-budget plans the cadence from templates before any learner writes, so it cannot count claims without a template; claim@1 validation now accepts them. DECISIONS issue 3 (`.gitignore` ignores `*.log`): `.gitignore` re-includes `research/**/*.log`, so a clone keeps the logs. DECISIONS issue 11 (a British spelling in an ID): kept as a logged ID exception (§12 item 44), because six companion files cite the ID. DECISIONS issue 12 (an ID kind for decision records): conditional on the owner wanting addressable records; numbered positions serve today. AUDIT-DESK issue 12, VERINA's date: the anchor already names the event its date marks ("merged 2026-04-17"); Spec-Harness's date is fixed. labs/TOOLS on `lake check --paranoid`: the spine applied `--paranoid` only to `lake comparator`; the wording is now explicit, and INS-bench-lean records that no `lake check --paranoid` has passed yet. Privacy-scrub issue 3: the stamp words and codes are BRIEF §1.4's generic vocabulary, so no change is needed.

**Verification run on this revision.** Scripts confirmed: all 63 tables are well-formed; every SEAM, ER, CL, SP, AUD, GEN, M, INS, SCR, GATE, D, KC, LAB stage, lesson, task and OD reference resolves; every `[X RUN-id]` names one of the 37 executed runs and every `{{run:RUN-id}}` one of the 125 to record; each wave's review total equals the sum of its tasks; the task graph has no cycle and no dependency on a later wave.

**Counts after revision.** 76 lessons (26 core, 50 bridge) plus Boot; 7 capstone steps, two opening with step briefings; 10 labs with 91 stages (83 planned, 8 `[stretch]`); 105 KCs (26 threshold); 69 specimens; 43 claim templates; 15 seams; 12 erosion events; 25 audit anchors; 14 generator families (47 templates); 46 mechanics; 23 instruments (15 in the tab, 8 on the Bench); 24 screens (SCR-instrument added); 29 gates (GATE-coverage added); 34 drawers (23 just-in-time; 11 deferred); 8 confusable sets; 37 executed runs and 125 run IDs to record; 108 tasks (W0 19, W1 20, W2 18, W3 15, W4 15, W5 13, W6 8); 16 owner decisions (OD-15 proposed, OD-16 open); planned hours 107–197; owner review about 195 h.
