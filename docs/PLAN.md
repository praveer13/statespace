# statespace: the master plan

**Status:** the master plan for v2, written from the spine. Every ID in this file comes from [the spine](spine/SPINE.md); where this plan and the spine differ, the spine wins, and the difference is listed under "Spine issues" at the end. **Date:** 2026-10-23. **Review:** the owner reviewed the owner decisions on 2026-10-25: OD-6 and OD-10 changed, OD-16 decided, the rest accepted, OD-15 among them (DECISIONS.md, section 1).

**What this file is for.** The spine is the index: it names every stage, lesson, KC, specimen, gate and task. This plan explains why the course has that shape, how its parts work together, how it gets built and reviewed, and how anyone can tell whether it works. The task-level list lives in [TRACKER.md](TRACKER.md) and [tracker/tasks.yaml](../tracker/tasks.yaml).

**Companion documents.**

| Document | Holds |
|---|---|
| [spine/SPINE.md](spine/SPINE.md) | every ID, catalog and count; the canonical index |
| [curriculum/](../curriculum/) | one file per stage: lessons, labs, Defences, seams, budgets |
| [ASSESSMENT.md](ASSESSMENT.md) | evidence events, provenance, generators, Call It, the Defence, stamps |
| [AUDIT-DESK.md](AUDIT-DESK.md) | the gap taxonomy, anchors, variants and scoring |
| [WORLD.md](WORLD.md) | the Clearinghouse, its plug-ins and its incidents |
| [DESIGN.md](DESIGN.md) | screens, navigation, the look, accessibility |
| [ARCHITECTURE.md](ARCHITECTURE.md) | repository layout, origins, data homes, schemas, gates |
| [EVIDENCE.md](EVIDENCE.md) | the learning-science basis: graded evidence, doses, misconceptions, the keep/kill rules |
| [LANDSCAPE.md](LANDSCAPE.md) | the landscape and version pins: the dated state of the field, the tab and the Bench, volatility rules |
| [TRACKER.md](TRACKER.md), [tracker/tasks.yaml](../tracker/tasks.yaml) | the 109 tasks of spine §13, refined and extended into agent-sized tasks, with sizes, dependencies, acceptance and review hours |
| [DECISIONS.md](DECISIONS.md) | owner decisions and the decision log |

**Precedence of sources.** (1) The roadmap, [research/context/roadmap.md](../research/context/roadmap.md), sets scope. (2) Executed runs, [research/spikes/RESULTS.md](../research/spikes/RESULTS.md) and `research/evidence/`, beat any report. (3) The v2 redesign brief, [research/synthesis/BRIEF.md](../research/synthesis/BRIEF.md). (4) The four digests in `research/synthesis/`. (5) The research reports and adversarial reviews. (6) kernelspace, the predecessor, for its learning engine only. (7) The v1 design in [docs/history/v1/](history/v1/PLAN-v1.md), for history only.

**Tags.** `[X RUN-id]` marks an executed run whose output log is on disk; `{{run:RUN-id}}` marks a run that must be recorded before the sentence ships; `[D]` marks design rationale, an estimate or a derived figure; `[V]` marks a fact re-checked against a primary source on the date its sentence or row states, or on 2026-10-23 where none is stated. Evidence grades follow the pedagogy digest: **A** a meta-analysis or several consistent RCTs; **B** one good experiment on a similar task; **C** a small, correlational or preprint study; **D** theory, consensus or design rationale. Citation keys in brackets, such as [kraft20], resolve in BRIEF §9, except [bangertdrowns04], which BRIEF §9 lacks: Bangert-Drowns, Hurley & Wilkinson 2004, https://doi.org/10.3102/00346543074001029. Learner-facing copy refers to the learner's own product only as "your system".

---

## In plain words

- **What it is.** statespace is an interactive, zero-server course that teaches formal methods the way the roadmap asks: by building Mini-Plinth, a tiny checked application language, through ten stages that run from Z3 counterexamples to a verified compiler step. It ends with a published report that separates what was proved, model-checked, tested, enforced, configured, assumed and not covered.
- **Who it is for.** A working backend engineer, fluent in Rust and new to formal notation, studying alone for 6–10 hours a week while building their own system with coding agents. The plan is 107–197 hours of stage work, which projects to about 43–80 weeks at 6 hours a week [D]. The course shows that as a range and never says "behind".
- **The one skill.** Deciding which claims are justified before trusting agent-written code, the roadmap's end-state (g). Every result is a six-part claim with a stamp that says exactly what a check established: PROVED [P] names its checker and version, MODEL-CHECKED [M] its constants, TESTED [T] its n.
- **What changed from v1.** v1's thesis survived two adversarial review rounds: eight lenses and 170 findings. Its machinery did not. v1 would have stamped work it could not check, signed learners off on self-graded vivas, and printed tool numbers that no tool had produced. v2 keeps the thesis, rebuilds the machinery on kernelspace's learning engine, and makes every tool number a recorded run that anyone can re-execute.
- **The loop.** Predict → Play → Build → Defend → Keep. The learner calls a verdict before a first run, plays the idea by hand on a real engine in the browser, builds it on their own machine, defends it in a checker-graded Defence, and keeps it through a 10–12-minute Today session that serves fresh seeds. Nothing locks, and nothing pays for clicks.
- **Checkers decide.** Z3, Lean's comparator, TLC, the reference interpreter and cargo grade the learner, with keys computed at grade time. No language model grades work or writes items at run time. Agents may prove, but the learner states. An agent's claim appears as quoted, unreviewed text and is never stamped.
- **Real tools, honestly split.** The tab runs real engines: Z3 on Pyodide, Spectacle for TLA+, PGlite for SQL. The Bench, the learner's own machine, runs the authoritative ones: Lean 4.35.0 [X RUN-lean-ledger], TLC, and multi-session PostgreSQL 18.6 [X RUN-pg-anomalies]. Every stamp says whether it was re-checked here, reported from your machine, or self-assessed.
- **The course holds itself to its own rules.** A runs registry, 28 CI gates and a Cedar-style release gate enforce them. When a tool changes, the course re-runs everything, and the resulting erosions appear on a public assurance page.
- **How it gets built.** Seven waves, from W0 (spikes) to W6 (launch hardening), 109 tasks in all. Agents draft; the owner reviews in a 2–3-hour weekly envelope and studies each stage as learner-zero. Review hours, about 193 in all, set the calendar: about 18–21 months from the start of W0 [D].
- **How we will know.** The north star is VRK₃₀: knowledge components answered correctly, unassisted, on unseen seeds, at least 30 days after first learning, counted on the learner's own device. One learner supports no causal claim, so every keep-or-kill decision follows rules that are fixed and hashed before the first learner event.

---

## 1. The thesis, and what changed from v1

### 1.1 The thesis

In formal methods the dangerous failure is not a slow system. It is a true theorem about the wrong thing. A green check feels like a guarantee, but it is a guarantee only about a proposition, under assumptions, of a model, by a method, with some correspondence to a running system. The roadmap names the goal in exactly these terms: "acquire the judgment to define application semantics, derive proof obligations, inspect counterexamples, evaluate agent-produced implementations, and determine what a proof does and does not establish." So statespace is built around one object and one skill.

**The object is the claim.** Every result the learner produces is a claim card with the six fields of roadmap rule 3 (proposition, assumptions, model, checking method, implementation correspondence, counterexample when an assumption is weakened), plus a requirement row. Each card carries a three-segment strip (proposition-of-model, correspondence, requirement-fit) and a stamp from a closed vocabulary of nine words, each with a required qualifier: PROVED [P], MODEL-CHECKED [M], TESTED [T], ENFORCED [E], CONFIGURED [C], ASSUMED [A], UNKNOWN [?], NOT COVERED [N] and REFUTED [R]. Requirement-fit is never [P], because no checker reads a requirement. Claims live in the learner's own lab repository, not in the browser.

**The skill is judgment.** Before a first run of any solver, prover or model checker, the learner calls the verdict and a confidence (Call It). Counterexamples are kept as specimens beside their fixes. Assumptions are planted on purpose as seams, and later stages erode some of them, which is how the course teaches that guarantees are relative. At the Audit Desk the learner judges plausible claims, about half of them sound across the pool, and anchors typed evidence to lines. The capstone is the roadmap's own demonstration: an agent proposes a plausible command, the learner's checker exhibits a violation or proves a restricted obligation, and the corrected command runs on PostgreSQL.

**The promise, in one line** (spine §0): learn formal methods by building a tiny checked application language, and learn to say exactly what each proof, model check and test establishes.

**Successor framing.** statespace inherits kernelspace's learning engine and nothing of its look. It keeps evidence-not-clicks, an append-only event log with provenance weights, a KC graph, seeded generators, the Today session, *Set your week*, VRK₃₀, staged labs, hint ladders, agent guardrails, a facts registry with errata, validity CI and production twins. It changes the currency from performance under a service-level objective to the justified claim, and it changes the look from a terminal to a drafting table (spine §0).

### 1.2 What v1 got right, and v2 keeps

Every review lens kept v1's core [dr1 §1][dr2 §1]: the six-field claim with a qualified stamp; specimens kept beside fixes; seams that later stages erode; Call It before a run; an Audit Desk scored on precision and recall. The roadmap-faithful ten-stage arc, the Bench of real tools, build-time checking of authored answers and the drafting-table voice also survive. The landscape digest found no other courseware that measures calibration, schedules erosion, or grades the review of agent work on both precision and recall [dl §5]. Those are the parts statespace exists to deliver.

### 1.3 How v1 was reviewed

v1 went through two adversarial review rounds of four lenses each, run on 2026-10-21. Two skeptics re-examined every finding, and two digests reconciled the findings with the executed spikes, which won every conflict ([digest-review-1.md](../research/synthesis/digest-review-1.md), [digest-review-2.md](../research/synthesis/digest-review-2.md)).

| Round | Lenses (findings) | Severity as filed | Skeptic verdicts | Changes produced |
|---|---|---|---|---|
| 1 | fidelity (21), correctness (21), pedagogy (23), journey (19): **84** | 13 critical, 47 major, 24 minor | 28 both uphold, 38 split, 18 both modify; none refuted; 56 recommendations modified; 6 downgrades proposed, none raised | 26 changes: 7 critical, 17 major, 2 minor |
| 2 | feasibility (20), world-class (21), design (24), successor (21): **86** | 16 critical, 51 major, 19 minor | 28 both uphold, 33 split, 24 both modify, 1 contested (motion, largely refuted); 57 modified; 17 downgrades proposed, none raised | 22 changes: 6 blocking, 11 major, 5 scoped down |
| Merged by the brief | **170** | 29 critical, 98 major, 43 minor | — | 33 changes, V2-01–V2-33: 10 critical, 19 major, 4 minor |

Both rounds reached the same verdict independently: keep the thesis, because v1's machinery commits the very errors it teaches. The spine then applied two critic passes of its own (revision 2, 2026-10-23): findings C1, M1–M9 and m1–m15, and findings P-01–P-28. Seven overlapping pairs were applied once, seven findings were adapted where the literal fix would have broken another rule, and none was rejected (spine §15).

### 1.4 What v1 got wrong, and what replaces it

| v1 failure | What showed it | v2 replacement | Change |
|---|---|---|---|
| **Receipts trusted exit codes and agent work.** A receipt would mint PROVED for a kernel-bypassed proof and for any agent's work | A `debug.skipKernelTC` proof of `False` builds with exit code 0, and only kernel replay rejects it [X RUN-lean-skipkernel]; a `sorry` file exits 0, and `lake check` errors while its log says the default kernel accepts [X RUN-lean-axioms] | Challenge packs with pinned, hashed statements; `lake comparator` (six checkers under `--paranoid` [X RUN-lean-comparator]); receipts that parse every verdict and never trust an exit code; agent claims never stamped | V2-01 (I7, I8) |
| **Sign-off by a self-graded or LLM-graded viva** | Low performers inflate self-grades [hacker00]; LLM proof scores inflated up to about 20× [petrov25] | The Defence: four parts, untimed, checker-graded; explain-back required and uncredited | V2-02 (I1) |
| **An Audit Desk that rewards rejecting everything** | With 4 sound cases in 32, "reject everything" scores 87.5% precision and 100% recall, beating v1's own mock learner (71% and 64%) [D, review computation] | Matched sound and flawed pairs; a seeded 30–60% sound share per session; typed evidence; a blind-strategy gate in CI | V2-04 |
| **Invented and false tool numbers** | Mock-ups printed state counts no tool had produced; TLC finds 11 distinct states with `-deadlock` [X RUN-tlc-doublespend]. The flagship concurrency specimen stamped REFUTED without naming its compilation pattern; only application read-modify-write loses an update at READ COMMITTED [X RUN-pg-anomalies]. A narrated overflow is refused by PostgreSQL with SQLSTATE 22003 [X RUN-pg-anomalies] | A runs registry (`runs/`); every tool number, verdict, flag and version cites a run; GATE-numbers, GATE-facts and GATE-runs; the corrected specimens SP-5.1, SP-6.2, SP-6.4 and SP-6.6 | V2-03, V2-07, V2-08 (I4) |
| **Calibration that could not measure judgment** | The lesson rail leaked answers; a 55/75/95 scale forced overconfidence on three-way verdicts; a headline built on about 12 calls per bucket has a 95% interval of 0.32–0.81 [D] | Certainty-based bands with the chance level printed; only the first call counts; bias and hit rate per band, diagnosing a band only once it holds at least 20 calls and its interval lies wholly outside the printed band (spine §8.5); the rail shows segment titles only | V2-05 |
| **No learning loop, and locks** | No KC graph, no generator and no review; drawers and audits unlocked by performance | 105 KCs, 14 generator families with 47 templates, FSRS-scheduled Today, re-find, VRK₃₀; nothing locks | V2-06, V2-20 (I5) |
| **No plan against one person's week** | v1's 80 lessons come to about 133k words at kernelspace density; its 31.5–61 weeks become about 12–23 months at Buehler's ×1.64 [buehler94]; the feasibility lens's own ≈250–345 h estimate would take 83–173 weeks at a 2–3-hour review cap [D] | Tiered lessons (26 core, 50 bridge), a budget gate that governs every addition, a computed Keep block, and review hours that set the calendar | V2-09 |
| **Tools on their hardest lanes** | npm Z3 needs cross-origin isolation [X RESULTS.md]; a home-made TLA+ explorer; hand-authored goal slides | Z3Py on Pyodide without isolation in three browser engines [X RUN-z3-starter-pyodide]; Spectacle, whose counts equal TLC's [X RUN-spectacle]; Goal Replay generated from real elaboration [X RUN-lean-plaingoal] | V2-12, V2-13, V2-14 |
| **Stamps that collided with their subject** | CHECKED collided with PostgreSQL's CHECK; logic glyphs collided with Lean and TLA+ notation | Words plus bracketed codes; MODEL-CHECKED; CONFIGURED and NOT COVERED added; shapes separable in grayscale; GATE-stamps derives each stamp from a receipt | V2-10 |

### 1.5 What the spine's own critic passes changed

The spine's revision 2 fixed defects that would have shipped otherwise (spine §15). The ones that shape this plan:

- **Inductive invariants are bounded.** TLC's inductive-invariant technique checks only the states it enumerates for fixed constants, so it earns [M] · constants. [P] for every N needs a parametric proof of the step, in Z3 with the parameter as an uninterpreted sort, or in Lean (S5.L9, CL-5.4, decision 29).
- **The builder's path is topological.** The brief's alternative order broke the `requires` DAG and the lab dependencies. The spine publishes a repaired order with one declared soft edge, covered by drawer D-23, and GATE-kc checks every published path (§4.5 below).
- **Every erosion can fire.** ER-12 fires from the learner's oldest open erodible seam, held seams excluded, and a property test replays both paths (W3-T12).
- **Three roadmap acts have lab stages:** the unsafe command (LAB-3.6), the miscompiled checker (LAB-4.7) and revocation stated temporally (LAB-7.6). S8 separates safety (CL-8.1) from liveness (CL-8.5) and gains a liveness stage (LAB-8.3).
- **The world is built.** No task built the Clearinghouse until W3-T14, W4-T14 and W5-T13 were added.
- **Every acceptance is a gate or a run,** every catalog component has an owning task, and the keep/kill rules move to W0 (W0-T07), because rules fixed after five waves of data are not fixed in advance.
- **Learner-zero numbers are descriptive.** The author's own Boot time measures no first-time learner, so a Playwright timing gate and at least five naive testers (RUN-boot-firstsuccess) stand in.

### 1.6 What did not change

The roadmap's scope and order; its ten stages and their projects; Mini-Plinth and `miniplinth check` (OD-2); Project 00 as the first weekend; the six-field claim; Call It; specimens; seams and erosion; the Audit Desk scored on precision and recall; the 20/65/15 working approach as an aim; zero servers.

---

## 2. Non-negotiables

### 2.1 The roadmap is the scope

The roadmap is the source of truth for scope [roadmap]. An addition beyond the roadmap's text survives only where a roadmap line asks for it: row-level security for Stage 7's enforcement, and the provider horizon for Stage 8's idempotency (BRIEF §1.1).

| Stage | Tool | Project (abridged) | Completion test (abridged) | Roadmap time |
|---|---|---|---|---|
| 1 | Z3Py | Transfer counterexample; guard → `unsat`; conservation, double capture, buggy refund | Searching for a violation asserts the negation; sat, unsat and unknown precisely; dependence on the encoding | 2–4 sessions |
| 2 | Lean 4 | Pure credit ledger: conservation, non-negativity, unchanged on rejection, finite sequences; then finite maps | No `sorry`; explain the induction without tactics; kernel acceptance is not business intent | 3–6 weeks |
| 3 | Lean 4 | Mini-Plinth as a typed AST; evaluator with explicit errors; invariant preservation; an unsafe command | A semantics independent of SQL, Rust and UI; zero, self-transfer, failed guard, overflow | 4–8 weeks |
| 4 | Lean, Z3 | `miniplinth check`: Inv ∧ Guard ∧ Step ∧ ¬Inv′; a planted miscompilation | Derive obligations by hand for assignments and conditionals | 3–6 weeks |
| 5 | TLA+ | Double-spend trace; atomic fix; holds with timeouts, duplicate replies, crashes, restarts, competing resolution | Safety versus liveness; the fairness needed; bounded exploration is not proof | 3–6 weeks |
| 6 | PostgreSQL, Rust | Compile transfers; differential tests against the interpreter; write skew and read-modify-write races; SERIALIZABLE with retries; R(S, D) | What differential tests establish; NULL, bags, overflow, serialization failures | 4–8 weeks |
| 7 | Soufflé or Alloy | Users, teams, roles, documents, sharing; access matrix; paired states; a leaky field; revocation | Observer and equivalence relation; declassification; why the blanket claim is false | 4–8 weeks |
| 8 | TLA+ | Outbox chain with a crash between every two steps, duplicates and delays; a deterministic simulator | Every crash window; at-least-once duplication; the provider's idempotency as trusted | 3–6 weeks |
| 9 | Lean, Rust | Translate a subset to an IR; semantic preservation; a bad optimization; SQL translation validation | The refinement relation, its boundaries, and what remains unverified | 6–10 weeks |
| 10 | All | Parser and typechecker, interpreter, SMT obligations, counterexamples, PostgreSQL compiler, runtime; the demonstration; publication | A report separating proved, model-checked, runtime-enforced and assumed properties | open |

**Also from the roadmap, and binding.**

- **The working approach:** 20% reading, 65% building and proving, 15% documenting, in one evolving lab repository (here `statespace-lab`, OD-2). Keep broken examples, and study only what the next artifact needs.
- **The six learning rules:** read only enough theory; preserve broken examples beside fixes; explain every guarantee in six parts; never equate Lean's proof checking with the business requirement; publish a short technical note every 2–3 stages; track what you can independently reason about.
- **Project 00,** the first weekend (3–5 hours): run the Z3Py introduction, find a negative-balance transfer, add the guard, find the buggy refund's counterexample, and write a README with the property, assumptions, solver answer, example model and limitations. It becomes LAB-1.1–LAB-1.4 plus LAB-1.6 (§5.2).
- **The end-state,** outcomes (a)–(g), which §3 turns into measurable outcome families.
- **What not to study prematurely.** Each deferred topic is one always-open drawer tagged "deferred" (D-30–D-40), with a neutral trigger that surfaces it in Today when a real obligation demands it. A trigger unlocks nothing.

### 2.2 The family formula and the owner's constraints

These come from kernelspace's family and the owner's standing constraints (BRIEF §1.2).

- **Zero always-on servers.** Static hosting; no accounts, no telemetry and no grading server. Progress is local-first and exportable, and git backs up lab work.
- **The formula.** Browser instruments run real engines. Local labs are graded in the browser. The learner's components plug into one persistent world. Adversarial thresholds are proven against baselines, never guessed. The capstone executes claims.
- **Agent-native tutoring.** The site ships `llms.txt` and per-lesson Markdown; every lab zip ships AGENTS.md, CLAUDE.md and a fail-closed PreToolUse hook. The learner's own agent tutors, and the site sees nothing.
- **Sourced numbers.** Every number is a dated, sourced claim with a time to live; every tool number is also a recorded run.
- **Capacity.** One maintainer plus agents; review hours are the binding constraint (OD-7).

### 2.3 Implementation invariants

Every task, review and gate is held to the ten invariants of BRIEF §7.10, restated with their enforcement in spine §1.1.

| # | Invariant | What it forbids | Enforced by |
|---|---|---|---|
| I1 | Evidence, not clicks | Status moving on reading, viewing or agent work; completion without a graded item | GATE-lessons; the Defence rules |
| I2 | Derived, never stored | A stored "status" field for KC state, sign-off, VRK₃₀, audit accuracy or stamps | GATE-stamps, GATE-schema, ledger property tests |
| I3 | Generators are pure and deterministic, with keys from checkers | Stored keys; seeds that render differently across browsers | GATE-generators, GATE-calls |
| I4 | Every tool number is a run reference | An untagged tool number, verdict, flag or version anywhere in copy, keys or artboards | GATE-numbers, GATE-facts, GATE-runs |
| I5 | Nothing locks | Lock copy; gated drawers, cases, lessons or labs; Call It beyond first runs and generated items | GATE-lessons; the review checklist |
| I6 | Zero servers; untrusted input only on the instrument origin | Parsing any byte from outside the page on the main origin | GATE-bundle; the W0-S01 decision record |
| I7 | Statements are pinned and hashed | Grading against a statement the learner (or an agent) can edit; a changed hash that keeps its stamp | GATE-claims; the receipt schema |
| I8 | Agent claims are never stamped | Any stamp on an agent's assertion | GATE-stamps |
| I9 | No private-design content | Anything from a non-public document in course copy; personal identifiers | GATE-privacy |
| I10 | Bounded checks print their bound, the course's own graders included | An [M], [T] or grader verdict without its states, constants, n, scope or `rlimit`; a Defence result without its interval | GATE-stamps, GATE-items |

### 2.4 Publication constraints

The repository is public. Four rules follow (BRIEF §1.5; OD-11).

1. **No private content.** Course copy contains nothing from any non-public document and no personal identifiers. Where the learner's own product appears, copy says "your system". GATE-privacy keeps any category-level deny-list in its own fixture file outside the repo. The optional private overlay (M-overlay) re-stamps the learner's own guarantees locally, and nothing from it leaves the device or enters the repo.
2. **Review JSONs stay out.** The merged review JSONs quote a non-public document, so they are excluded; the digests and the brief, which are generic, are committed instead.
3. **No identifiers.** No personal domains, account names, emails or private paths in copy or tooling output. `statespace stuck` strips private paths from its forum-ready example.
4. **Licenses travel with vendored code.** Every vendored directory carries its license (GATE-privacy's license lint, W6-T04). The self-explanation booklet's text, not its three rights-reserved images, is adapted under the CC BY-SA 4.0 its PDF states, with credit and a change note, and lives in its own directory under that license; no request goes to its authors (OD-10).

### 2.5 Facts and evidence

- **Tool facts come from runs.** A tool number, verdict, flag or version appears only with `[X RUN-id]` or `{{run:RUN-id}}`. A placeholder must resolve to `runs/<RUN-id>.json` before the content leaves "draft" (GATE-runs). GATE-numbers also carries a deny-list of the known-false sentences in BRIEF §2.2, so they cannot return.
- **Pedagogy claims carry grades.** Every mechanic is tagged "Ev" (outcome evidence for its principle) or "Prec" (precedent only) with an A–D grade (spine §7). Expect tenths of a standard deviation at most: across 1,942 effects in 747 education RCTs the median is 0.10 SD [kraft20]. No learner-facing copy promises multiples.
- **The course stamps itself.** A passed Defence is [T] (n unseen items), never PROVED competence. A self-grade is [A]. The assurance page prints what the course cannot establish (spine §8.9).

### 2.6 Anti-patterns we will not build

From BRIEF §3.3, with the evidence that rules each out.

| Anti-pattern | Evidence against it | Instead |
|---|---|---|
| Locks: drawers opened by misses, audits unlocked by sign-off, Run gated on every call | Self-paced mastery gating often reduces completion [kulik90] (A) | Computed status in ink; calls only on first runs |
| Self-graded or LLM-graded sign-off | Low performers inflate self-grades [hacker00] (B); LLM proof scores inflated up to about 20× [petrov25] (B/C) | The Defence |
| Progress measured in claims | Substitution harms learning: unguarded AI raised practice 48% and lowered exams 17% [bastani25] (A−/B) | Credit only for unassisted evidence |
| XP for clicks, leaderboards, daily counters, loss framing | Expected rewards −0.28 to −0.40 [deci99] (A); repair softens broken streaks [silverman23] (B) | Competence statements; a repairable weekly rhythm |
| A Brier headline from a few dozen calls | 7 of 12 right has a 95% interval of 0.32–0.81 [D]; content teaching raised overconfidence [stone00] (B/C) | Bias, hit rate per band, intervals, a minimum n |
| An audit pool that is mostly flawed | "Reject everything" wins [D] | A seeded 30–60% sound share |
| Completion blanks with self-explanation prompts | Blanks plus prompts impaired proof learning [hilbert08] (B); prompts on worked examples were negative [barbieri23] (A) | Principle prompts on revealed steps only |
| Automation closing the step being taught | 48% finished "without thinking, just clicking randomly" [keenan26] (C) | Manual mode (`grind` and `omega` off) |
| Teaching "invariant" as "inductive invariant", so `sat` means "bug" | Misconception O3 [dp §2] (D) | A three-way verdict and the CTI workbench |
| Counterexample-only or minimal-only feedback | Binary right/wrong feedback had the most give-ups (44%, against 27% with counterexamples and 33% with hints) and learning was equal; the authors warn that learners may "treat the counterexample as a special case" [dantoni15] (B); minimal-only or maximal-only witnesses led learners to abandon them or patch the shown case [danas17] (C) | Class hints; generalize after minimizing |
| Answer-giving chat, LLM graders, runtime LLM items | An LLM "randomizer" picked one case in 6 of 7 exams [ipeirotis26] (C) | An explanation gate; checkers |
| Parameter-only generators; longest-option keys | One generator leaks 13 points versus 2–3 with pools [chen18] (B/C); "pick the longest" passed 58 of 68 kernelspace quizzes [ks100x] | Structural variety; blind-strategy CI |
| Deadlines and "due" notes | Self-set deadlines did not help [bisin20]; the classic study was retracted on 2026-09-02 [retraction26] | Windows and a cadence |
| Timed Defences | Harm appeared under speed pressure [shen26] (C) | Untimed, over two or more sessions |
| Validating items on simulated learners | LLM "students" correct themselves after any feedback [do26] (C) | Learner-zero plus logged item data |
| Learning styles, mindset messaging, immersive 3D | Mindset messaging d = 0.05 [macnamara23] (A); immersive effect size 0.24 [wu20] | Not built |

---

## 3. The learner and the outcomes

### 3.1 Who the course is for

**The reference learner** (spine §2.1) is a working backend engineer, Rust-fluent and systems-literate, novice in formal notation, studying alone for 6–10 hours a week over many months while building their own system with coding agents. A kernelspace graduate is the reference case.

**Scaffolding is set per KC, not per learner.** Assistance helps at low prior knowledge and hurts at high prior knowledge (d = +0.505 versus −0.428 [tetzlaff25], grade A), and the reversal is asymmetric: when unsure, help. So the course gives expert treatment for Rust, PostgreSQL practice and concurrency failures, and novice treatment for proof, semantics, weakest preconditions, temporal notation, information flow and simulation. Novice KCs open their misconception note by default; expert KCs keep it collapsed (M-layered-feedback).

**Placement, not prerequisites.** A "From kernelspace" placement pre-credits only KCs that a kernelspace Evidence Pack actually evidences, and never logic, induction, TLA+ or isolation (V2-20; W2-T16). Every stage offers test-out: three fresh items per KC, confirmed by one more after 7 days (M-test-out, grade A [tetzlaff25]). Drawers D-01–D-06 teach v1's old "Course 00" ground skills just in time instead of as a gate.

**Design for resumption, not completion.** A 9–18-month solo arc meets three phases with different risks [dp §4.1]:

| Phase | Main risk | The course's response |
|---|---|---|
| Ignition (months 0–3) | Quitting before two wins; the first install; Lean syntax | Project 00 on day one with no devcontainer; two claims by about week 4; tools met first in the browser; a "this will feel harder" card [deslauriers19] |
| The long middle (months 3–9) | Novelty gone; a first hiatus; competing work on your system; decay | A range target with reserve weeks; welcome-back and re-entry sets; a monthly retro; the Lean keep-alive; twin labs that count once for both |
| Assembly (months 9–18+) | Sprawl and perfectionism | The final assembly is capped at six weeks; the Stage 10 report doubles as the learner's own published record |

Among learners who intended to finish a HarvardX course, 19.5% did [dp §4.1], and in one online master's program a hiatus delayed graduation without raising dropout [dp row 41] (grade B). The course therefore never counts overdue items, never shows "behind", and treats every return as success (M-welcome-back, grade B [silverman23]).

### 3.2 The north star: VRK₃₀

A KC counts toward **VRK₃₀** when the learner answers fresh generated items on it correctly, with provenance `own` and `unseen`, at least 30 days after first learning it (spine §2.3). The private Mirror shows the count, its rate per active study-month, and intervals. There is no population target and no comparison across learners. The number exists to answer roadmap rule 6: track what you can now independently reason about, not chapters read.

**Why this measure.** Retrieval with application items beats restudy (g = 0.50 [rowland14], grade A) and transfers only when items are applications (d = 0.40 [pan18], grade A); spacing beats massing (g = 0.74 [latimier21], grade A); successive relearning beats time-matched restudy [higham22] (grade B). The 30-day delay matters because unused procedural gains decay, with about half gone by roughly 6.5 months [tatel25] (grade A). VRK₃₀ is derived at read time from events (I2), so it cannot be edited into existence.

**A scheduler check, not a target** [D]. Today schedules reviews with FSRS at a target retention of 0.85–0.90 (M-today). If 30-day fresh-probe accuracy sits persistently outside the interval that target implies, the scheduler is re-tuned. This is a descriptive check on one learner, never a claim about learners in general.

### 3.3 The end-state as measurable outcomes

The roadmap's end-state (a)–(g) becomes seven outcome families (spine §2.2). Each family is a generated task set re-sampled at 30 days or more (the end-state matrix), and every Defence samples from it. The criterion is per learner and computed on the device; the course reports it descriptively, with an interval, and makes no population claim.

| Outcome (roadmap) | Target, per learner | Measured by | How it is measured on the device | Trained in |
|---|---|---|---|---|
| (a) State a property precisely | ≥75% on ≥12 fresh items across ≥2 sessions, then a fresh probe correct at ≥30 days | GEN-negate-it and GEN-spec-it, graded by Z3 equivalence in both directions (P⇒R and R⇒P) with a distinguishing state and a mandatory non-vacuity witness | `item` and `probe` events with provenance `own · unseen`, each carrying `engine@version`, seed and verdict; the proportion with a Wilson interval; the 30-day probe also feeds VRK₃₀ | S1, S4, S7 |
| (b) Distinguish safety, liveness and information flow | Same rule; interleaved only within confusable set B | GEN-call-it (property kind), GEN-lasso-or-not, GEN-leaks-to-observer | The same events; the lasso validator and the paired-state evaluator compute keys at grade time | S5, S7, S8 |
| (c) Derive and audit proof obligations | Same rule; plus per-class audit recall once n ≥ 10 | GEN-wp-it, GEN-cti-or-bug, Derivation Board items; Audit Desk classes G1, G2, G4, G13 | `item`, `probe` and `audit` events; each Derivation Board step is one Z3 validity query; audit recall per class with a Wilson interval | S4, S5, S9 |
| (d) Understand proofs over language semantics | Same rule | GEN-proof-structure on goals generated from real elaboration (S3, S9); statement-reading items on CL-3.3 and CL-9.2 | `item` and `probe` events; goal strips regenerated on every toolchain bump (GATE-replay) | S2, S3, S9 |
| (e) Model adversarial concurrent executions | Same rule | GEN-find-the-witness (traces), GEN-trace-allowed, GEN-anomaly-id | Witnesses graded by the engine, never by matching a stored model; histories replayed from Bench recordings | S5, S6, S8 |
| (f) Establish or test a refinement to PostgreSQL | Same rule | R(S, D) items, GEN-anomaly-id, history classification on Bench-recorded histories | `item` and `probe` events | S6, S9 |
| (g) Decide which claims are justified before trusting agent-written code | Balanced accuracy with an interval assembled from the two class rates' 97.5% Wilson intervals (spine §6); per-class precision and recall once n ≥ 10 | Audit Desk cases, GEN-spot-the-gap, GEN-which-stamp | `audit` events scored as balanced accuracy over `own · unseen` cases (internally "Judgment", in learner copy "audit accuracy") | all stages; S10 |

**Artifact lines.** Two outcomes also carry an artifact line, beside the criterion and outside it (spine §2.2). For (f), LAB-6.c7 passes on the learner's own R(S, D); the check arrives as a `receipt-import` event that mints CL-6.3. For (g), the demonstration is recorded end to end (CL-10.1), with run ids and statement hashes (LAB-10.c7). Neither line is part of a criterion.

### 3.4 Operating targets

These targets govern the course's own behavior for each learner. Every one is computed on the device from events or from the lab repo, and none needs a server.

| Target | Value | Basis | How it is measured on the device | Held by |
|---|---|---|---|---|
| Boot | ≤8 minutes on a phone; a first success within 4 minutes | kernelspace's drop-off evidence [ks100x] (D) | A Playwright timing gate at 360 px in CI; learner-zero's time recorded as descriptive (RUN-lz-boot-w1); at least five naive testers (RUN-boot-firstsuccess) before the "external learners" label | GATE-bundle; W1-T09 |
| Today | 10–12 minutes, 3–5 times a week | [dp] (D) | Session length summed from event `ms`; learner-zero's median, descriptive (RUN-lz-today-w1) | M-today; W1 exit |
| Per-KC dose | In the lesson: a prequestion, 1–2 calls and an exit item. Then ≥8 graded opportunities in the first 60 days, at about 1–3, 7, 21 and 45–60 days | [koedinger23], an analogy (B/D) | Attempts per KC from events | GATE-kc; the scheduler's property test on a simulated 60-day calendar (W1-T08) |
| Maintenance | FSRS at 0.85–0.90 target retention | [latimier21][cepeda08] (A) | 30-day fresh-probe accuracy against the scheduler's predicted recall [D] | M-today |
| Signed off | Defence Parts A–C ≥75% overall and each part ≥60%, every credited part with at least four items, plus fresh items correct in ≥3 spaced sessions | [higham22] (B) | Derived from `probe`, `prove-it` and `audit` events; the Wilson interval shown | §8.6 of the spine; ledger property tests |
| Settled | One fresh probe per KC correct ≥30 days after the stage's sign-off | [higham22] (B) | `probe` events | Feeds VRK₃₀ |
| Claim cadence | Two claims by about week 4; never more than two weeks without a new claim or specimen | [dp] (C/D) | Claim and specimen dates in the lab repo, read from imported receipts | GATE-budget, on both published paths at 6 h/week |
| Audit dose | 2–3 cases a week; ≥6 exemplars per gap class | (D) | `audit` events, 0–1 per Today session | The Keep block; GATE-audit |
| Interleaving | After the exit item; ≤50% of a session; confusable sets only | [brunmair19] (A) | Session composition from events | M-which-is-it; GATE-items |
| Calibration display | Bias and hit rate per confidence band; a band is diagnosed only when it holds at least 20 calls and its interval lies wholly outside the printed band (spine §8.5); bias's interval is accuracy's Wilson interval with the imputed confidence held constant | [stone00] (B/C) | Post-instruction, unassisted `call` events only | M-mirror |
| Weekly rhythm | The learner's own weekly target met in ≥8 of the last 12 weeks, with 7-day repair and two reserve weeks in every 12 | [silverman23] (B); [buehler94] (B) | Week records in settings and graded or Bench events | M-set-your-week |
| Writing | A 600–1,000-word note after S2, S5, S7 and S9 | [bangertdrowns04] (A, small) | Note exports in the lab repo | M-notes |
| Lean keep-alive | 20–30 minutes every 2–3 weeks while Lean is idle, once S2 is signed off | [tatel25] (A for decay; D for the dose) | Keep-alive session events | M-lean-keep-alive; W3-T13 |

### 3.5 What is and is not promised

| Promised | Not promised |
|---|---|
| Every tool number, verdict, flag and version in the course is a recorded run you can re-execute | Effect multiples; the median education effect is about 0.10 SD [kraft20], and nothing here adds up to more |
| Stamps that say what a check established, with its checker, bound or n | Far transfer; the course trains near transfer to your system through twin labs and the private overlay [sala19] (A/B) |
| Nothing locks; your data stays on your device and in your lab repo | Anti-cheat: provenance is self-declared and calibrates rather than polices (OD-8) |
| A published report that separates proved, model-checked, tested, enforced, configured, assumed and not covered | That "signed off" means PROVED competence; a passed Defence is [T] (n unseen items) |
| Errata that flag "re-check" and never deduct | A fixed duration; the arc is shown as a range, never as "behind" |

---

## 4. The curriculum at a glance

### 4.1 Shape

| Element | Count | Where defined |
|---|---|---|
| Stages | 10 (S1–S10) | spine §3 |
| Lessons | 76 (26 core, 50 bridge), plus Boot (S1.L0) | spine §3.11 |
| Capstone steps | 7 (S10.L1–S10.L7, tier `[step]`, outside every lesson count) | spine §3.10 |
| Labs | 10 (LAB-1–LAB-10) with 91 stages: 83 planned and 8 `[stretch]` (OD-15) | spine §3.11 |
| Knowledge components | 105, of which 26 are threshold KCs that spiral | spine §4 |
| Generator families | 14, with 47 templates | spine §8.3 |
| Specimens · claim templates | 69 · 43 | spine §5.1, §5.2 |
| Seams · erosion events | 15 (three of them held) · 12 | spine §5.3, §5.4 |
| Audit anchors · gap classes | 25 · 13 (G1–G13, with subclasses) | spine §6 |
| Drawers | 34: 23 just in time (D-01–D-23) and 11 deferred (D-30–D-40) | spine §3.12 |

The lesson count answers the owner's brief to match kernelspace's scope (about 68–69 lessons in 9 tracks) with 76 tiered lessons in the roadmap's 10 stages. Tiering, not trimming, keeps the authoring load near 100–110k words against v1's projected 133k [D] (BRIEF §7.2).

### 4.2 The ten stages

Planned hours are stage work only, excluding the Keep block (§4.4). Weeks assume 4.75 hours of stage work in a 6-hour week. Each stage's file in [curriculum/](../curriculum/) holds its lessons, lab, Defence, seams, anchors, drawers and budget.

| Stage | Roadmap project | New tool, pinned | Lessons (core + bridge) | Lab: planned + stretch stages | Capstone steps built | Planned h | Weeks at 6 h | Roadmap time | Curriculum |
|---|---|---|---|---|---|---|---|---|---|
| S1 Counterexample | Project 00, the counterexample lab | Z3Py, Z3 5.3.1 [X RUN-z3-starter] | Boot + 5 (2 + 3) | LAB-1: 6 + 0 | — | 5.3–9.4 | 1.1–2.0 | 2–4 sessions (≤10 h) | [S1](../curriculum/S01-counterexample.md) |
| S2 Proof | The verified ledger | Lean 4, toolchain 4.35.0 [X RUN-lean-ledger] | 11 (4 + 7) | LAB-2: 7 + 1 | — | 15.6–28.4 | 3.3–6.0 | 3–6 weeks | [S2](../curriculum/S02-proof.md) |
| S3 Semantics | mini-plinth-core, goldens and the JSON IR | — | 9 (3 + 6) | LAB-3: 11 + 2 | S10.L1, S10.L2 | 11.9–23.7 | 2.5–5.0 | 4–8 weeks | [S3](../curriculum/S03-semantics.md) |
| S4 Obligations | `miniplinth check` | — | 9 (3 + 6) | LAB-4: 8 + 1 | S10.L3 | 8.8–15.6 | 1.9–3.3 | 3–6 weeks | [S4](../curriculum/S04-obligations.md) |
| S5 Time | The holds spec | TLA+, `tla2tools` 1.8.0, pre-release [X RUN-tlc-jars] | 9 (3 + 6) | LAB-5: 6 + 1 | — | 10.5–17.6 | 2.2–3.7 | 3–6 weeks | [S5](../curriculum/S05-time.md) |
| S6 Correspondence | pg-refinement | PostgreSQL 18.6 [X RUN-pg-anomalies] | 9 (3 + 6) | LAB-6: 9 + 0 | S10.L4 | 9.2–15.9 | 1.9–3.3 | 4–8 weeks | [S6](../curriculum/S06-correspondence.md) |
| S7 Secrecy | authz-flow | Soufflé 2.5 [X RUN-souffle-version] | 8 (3 + 5) | LAB-7: 7 + 1 | — | 9.7–17.0 | 2.0–3.6 | 4–8 weeks | [S7](../curriculum/S07-secrecy.md) |
| S8 Effects | effects-sim | — | 7 (2 + 5) | LAB-8: 8 + 1 | S10.L5 | 7.4–13.2 | 1.6–2.8 | 3–6 weeks | [S8](../curriculum/S08-effects.md) |
| S9 Preservation | Compiler, preservation proof and SQL validator | — | 9 (3 + 6) | LAB-9: 12 + 0 | — | 16.1–33.8 | 3.4–7.1 | 6–10 weeks | [S9](../curriculum/S09-preservation.md) |
| S10 Assembly | The Core | — | 7 capstone steps | LAB-10: 9 + 1 | S10.L6, S10.L7 | 12.2–22.7 | 2.6–4.8 | open; final assembly ≤6 weeks | [S10](../curriculum/S10-assembly.md) |
| **Total** | | 5 new tools, at most one per stage | 76 (26 + 50) + Boot | 83 + 8 | 7 | **107–197** | **22.5–41.5** | 9–18 months | |

**One new tool per stage, met first in the browser.** The dose comes from kernelspace's drop-off data, where a first install was the top risk [ks100x] (D). S1's Z3Py runs with `uv run` or entirely in the tab, with no devcontainer; the devcontainer arrives at S2 (D-15). Lean is met first as generated Goal Replay; TLA+ first in the Theater and Spectacle; PostgreSQL first in PGlite; Datalog first in the tab engine that W0-S03 selects.

**Signature moments,** one per stage, in the order a learner meets them:

- **S1.** Boot's call on an agent's "safe, 200 tests green" transfer; Z3 returns an overdraft witness, mounted as SP-1.1 [X RUN-z3-starter], and the corrected guard makes the violation `unsat`. S1.L5 then shows that under signed 64-bit bit-vectors the guard protects the sender, not the recipient [X RUN-z3-bv64].
- **S2.** "Every checker agrees; none read the requirement": `lake comparator --paranoid` runs six checkers [X RUN-lean-comparator] on a true theorem that misses the intent, and the learner exhibits in the tab a scenario the theorem permits and the requirement forbids (S2.L10).
- **S3.** The unsafe command `force move` makes the step-invariant obligation fail, shown by a kernel-checked counterexample golden (LAB-3.6).
- **S4.** The miscompiled checker: the learner breaks their own VC generator so a known-false obligation reports [P], then finds the faulty translation (LAB-4.7).
- **S5.** The double spend found by hand, then confirmed by TLC: with `-deadlock`, 11 distinct states and a 4-action trace; the atomic version has 4 distinct states [X RUN-tlc-doublespend, RUN-tlc-atomic].
- **S6.** Same transfer, three verdicts: on PostgreSQL 18.6 the compilation pattern decides. Application read-modify-write spends 160 from 100 at READ COMMITTED; a conditional UPDATE loses nothing; opposite-order moves deadlock with 40P01 [X RUN-pg-anomalies, RUN-pg-claims].
- **S7.** The roadmap's leaky shared document, and the blanket "no tenant ever observes any change" claim refuted by a legitimate feature (S7.L7).
- **S8.** Trace validation catches an ack-before-durable drift that every test missed (S8.L6, {{run:RUN-tlc-trace-validation}}).
- **S9.** A write hoisted above its guard breaks the preservation proof, and the counterexample is extracted (S9.L7, {{run:RUN-lean-hoist}}).
- **S10.** The roadmap's demonstration, recorded end to end, and a report exported from the claim graph.

### 4.3 Lesson tiers

The tiers put authoring effort where the roadmap's projects are (spine §3.0; BRIEF §7.2).

| | Core (26) | Bridge (50) |
|---|---|---|
| Length | 2–4 segments of 12–15 minutes; planned at 40–60 minutes | At most 1,000 words; planned at 15–25 minutes |
| Opening | A hook and 1–2 prequestions (at most 2 minutes) | One prequestion |
| Body | Each segment built around one instrument run, with Call It on the first run, and ending in a graded item | Instrument cells with Call It on first runs; one graded item |
| Close | Exit items that create Today cards; a "Build this" card for the next lab stage; a production-twin card where one exists | An exit item; a dated, section-level pointer into the roadmap's reading |

**Generator families feed Today; they are not lessons.** A lesson introduces a KC once; the families then re-serve it on fresh seeds for months.

**Graded objectives only.** Every objective verb that asks the learner to explain, say or name resolves to a checker-graded form named by its generator family and template, usually GEN-call-it template 4 (multiple true/false over about five scenarios), GEN-proof-structure's "needed hypothesis", Proof Blocks, or a witness. Free prose is an uncredited explain-back (I1). GATE-lessons fails a lesson whose graded item names no family and template.

**Two layout rules.** The lesson rail shows segment titles only, never answers, verdicts or option text (V2-05). W1–W2 content uses at most six content block types (V2-18); a seventh needs a logged decision.

### 4.4 Hours, weeks and the Keep block

**The budget method** [D] (spine §3.0). Planned hours are reading, plus lessons (core 40–60 minutes, bridge 15–25, Boot 8), plus building (lab stages at nominal minutes, up to 3× for Lean proof stages and 2× for others), plus writing (write stages, claim cards and the technical notes), plus the Defence. Weekday stages are at most 25 minutes and weekend stages at most 45; every Lean stage that proves a whole theorem is a weekend stage.

**The Keep block comes off the top, and it is computed.** It is introduced KCs × about 10 graded reviews × the logged seconds per item, plus 2–3 audit cases, 1–3 Clearinghouse incidents, the 5-minute weekly review, the monthly retro and, while Lean is idle, the keep-alive session. At about 2 minutes per review, 105 KCs × 10 × 2 minutes is about 35 hours over the arc. The plan sets the Keep block at 45–75 minutes a week at 6 h/week and 60–105 minutes at 10 h/week, so a 6-hour week leaves at least 4.75 hours of stage work and a 10-hour week at least 8.25. The brief's figure was 30–40 minutes; the spine's larger figure follows the brief's own basis once audits, incidents and reviews are included (decision 25). At 6 h/week the plan assumes three Today sessions and one Clearinghouse incident a week (about 56–75 minutes with the review, the retro's share and the keep-alive's share). SCR-week computes the Keep block from the learner's chosen counts and, when it exceeds the planned upper figure (75 minutes at 6 h/week, 105 at 10 h/week), lowers the week's stage-work figure instead of the Keep block.

**The arc.** 107–197 hours of stage work is 22.5–41.5 weeks at 6 h/week and 12.9–23.9 weeks at 10 h/week. Students study 5–8 hours a week less than they plan [oreo19], and only 48.7% finish by their pessimistic estimate [buehler94] (grade B), so the projection applies a 1.6 planning factor and two reserve weeks in every twelve: about 43–80 weeks at 6 h/week (roughly 10–18.4 months, so the high end runs just past the roadmap's 9–18) and about 25–46 weeks at 10 h/week. SCR-week shows each stage's planned range beside the roadmap's range, and never says "behind".

**The ratio.** Reading is about 15% of planned hours and writing about 14%. Lessons (instrument-driven, each segment ending in a graded item), building and the Defence together are about 71%. That is close to the roadmap's 20/65/15 only when graded lesson work counts as building and proving; counted as reading, reading would be about 40–44%.

**The largest estimating risk.** Every stage plans below the roadmap's upper bound. S6, S7 and S8 plan wholly below its lower bound, as do the low estimates of S3–S9. No stage falls below half the lower bound, so GATE-budget raises no warning, but these are the figures most likely to move. Learner-zero's logged item and stage times replace them after each wave.

**GATE-budget holds the plan.** It fails a stage whose high estimate exceeds the roadmap's upper bound in weeks × 4.75 hours; warns, until a justification is logged, when a stage's high estimate falls below half the lower bound × 4.75 hours; checks each stage's implied Keep load; checks the claim cadence on both published paths at 6 h/week; allows at most one new tool per stage; and requires every addition to name what it displaces (V2-09).

### 4.5 Paths

**Roadmap order is the default** (OD-3). The optional builder's path serves a learner who wants concurrency and effect models early. It is a topological order of the hard `requires` edges and of the lab-artifact dependencies, and GATE-kc checks every published path:

S1 → S5.L1–S5.L8 → S6.L1, S6.L2, S6.L6, S6.L7 → S8.L1–S8.L4 → S2 → S3 → S4 → S5.L9 → S7 → S6.L3–S6.L5, S6.L8, S6.L9 → S8.L5–S8.L7 → S9 → S10.

| Jump on the builder's path | What it crosses | Substitute |
|---|---|---|
| S6.L2 before S3 | the soft edge KC-6.rowcount-as-guard → KC-3.big-step-errors | Drawer D-23, a self-contained card on explicit error outcomes |
| LAB-6 before LAB-3 and LAB-4 | The early block runs LAB-6.1, LAB-6.5 and LAB-6.6 only; LAB-6.6's retry policy wraps the course's reference compiler | The reference compiler is labeled "reference module, earns nothing"; the other LAB-6 stages run in the later S6 block |
| S8.L1–S8.L4 before LAB-3 and LAB-6.2 | LAB-8.1, LAB-8.2, LAB-8.4 and LAB-8.5 only; LAB-8.4 is the learner's first Lane A work | Drawer D-14 (the Lane A wasm ABI) is read first; the reference compiler carries the same label |
| S5.L9 after S4 | the hard edge KC-5.inductive-invariant-tla → KC-4.invariant-vs-inductive | None needed: S5.L9 and LAB-5.7 move after S4 |

Erosions are keyed to seams, not stage numbers. On either path an erosion fires when both endpoints exist in the learner's record; if the cracking specimen came first, as on the builder's path, the claim mints with its seam already cracked and the forecast asks which segment it hits. The Lean keep-alive starts only once S2 is signed off and runs while Lean is idle: S5–S8 on the default path; S7 and the later S6 and S8 blocks on the builder's path.

### 4.6 Seams and erosions across the arc

A seam is an ASSUMED field planted on purpose. Twelve seams erode later; three are held, so the learner meets assumptions that are tested and survive (SEAM-13 on the course's own interpreter, SEAM-14 on PostgreSQL's SERIALIZABLE, SEAM-15 on the Lean kernel). Each erosion opens with a forecast: the learner restates the claim from memory and calls which segment cracks (M-erosion-forecast).

| Erosion | Seam (assumption) | Planted | Cashed (lesson · specimen) | What cracks | Ships in |
|---|---|---|---|---|---|
| ER-1 | SEAM-1: balances are unbounded integers | S1.L3, S1.L4; carried by CL-2.1–CL-2.4 | S6.L4 · SP-6.4 | correspondence: the model takes a step the database refuses with 22003 [X RUN-pg-anomalies]; conservation untouched; surfaces D-30 | W4 |
| ER-2 | SEAM-2: transfers run one at a time | S2.L7 | S5.L3 · SP-5.1 | correspondence: a sequential proof of a concurrent system | W3 |
| ER-3 | SEAM-3: a correct step needs no observer | S3.L6 | S7.L7 · SP-7.1 | requirement-fit: confidentiality becomes [N] | W4 |
| ER-4 | SEAM-4: effect dispatch is atomic with the hold's commit | S5.L5 | S8.L3 · SP-8.1 | assumption record | W5 |
| ER-5 | SEAM-5: obligations checked on the source carry to the running code | S4.L7 | S9.L7 · SP-9.1 | correspondence | W5 |
| ER-6 | SEAM-6: `Nat` balances cannot go negative | S3.L1 | S3.L7 · SP-3.3 | correspondence: `Nat` is not the intended arithmetic | W2 |
| ER-7 | SEAM-7: the solver is sound | S1.L3 | S4.L9 · SP-4.5 | assumption record; surfaces D-32 | W3 |
| ER-8 | SEAM-8: the worker keeps running under weak fairness | S5.L7 | S8.L5 · SP-8.6 | assumption record: progress needs recovery | W5 |
| ER-9 | SEAM-9: no replica reads; PostgreSQL as documented; every writer SERIALIZABLE | S6.L9 | S7.L8 · SP-7.6 | assumption record | W4 |
| ER-10 | SEAM-10: the observer sees only the response body | S7.L6 | S9.L9 · SP-9.6 | assumption record: size and timing | W5 |
| ER-11 | SEAM-11: one database's agreement stands for the compiler | S6.L3 | S9.L8 · SP-9.4 | correspondence: [T] (1 instance) | W5 |
| ER-12 | SEAM-12: retries finish before the provider forgets the key | S8.L7 (LAB-8.8) | the Clearinghouse, once SEAM-12 is the oldest open erodible seam (after S9 on both paths) · SP-8.5 | assumption record | W5 |

ER-7 is deliberately long-range: a seam planted in the first week cracks in S4.L9, when the learner replays a real solver bug in which Z3 5.3.0 answers `unsat` on satisfiable inputs and 5.3.1 answers `unknown` [X RUN-z3-11179].

### 4.7 Drawers and siblings

**Drawers are always open** (I5). Opening one is logged, never required. The 23 just-in-time drawers replace v1's on-ramp course: D-01–D-06 hold the ground skills (a proof is not a test; implication and vacuity; quantifiers and negation; state as functions; induction, informally; the six fields of a guarantee), and the rest support single lessons, such as D-07 (the Lean error museum), D-08 (a pinned fallback for the Natural Number Game), D-13 (SMT-LIB in one page) and D-15 (the devcontainer and `statespace doctor`). The 11 deferred drawers, D-30–D-40, hold the roadmap's deferred topics. Each shows what the topic is, why the roadmap defers it, and what surfaces it: D-30 (Kani) at ER-1, D-32 (proof certificates) at ER-7, and D-31 (Verus and Aeneas) once, at the first claim whose structured correspondence reference names Rust code (V2-30; S9.L9 links it as well). D-33–D-40 surface when a claim or a parked goal carries their topic (spine §3.12).

**Siblings are linked, not re-taught** (V2-31). tablespace T4 bridges at S6.L5–S6.L7 with prerequisite card D-11; tablespace T3 at S8.L3 with D-12; byzantine at S7.L8 and S8.L6 with D-21; a light kernelspace strand at S6.L9 re-stamps kernelspace pool conformance as [T] (n). Because the siblings are unfinished, every bridge carries a self-contained prerequisite card, and a sibling completion counts as test-out evidence (M-sibling-bridge).

**Production twins** are upstream systems that met the same problem, shown after the learner's own attempt: TigerBeetle's two-phase transfers for holds, `lake comparator` for statement pinning, Lean's experimental `vcgen` after the learner's own VC generator [X RUN-lean-vcgen], Cedar for semantics, enforcement and differential testing, CCF's trace validation, CompCert's preservation theorem. Every twin's SHA is recorded in {{run:RUN-twin-pins}} with a 60-day time to live; none is written into copy by hand (M-production-twin).

### 4.8 The capstone, grown as you go

The roadmap's Stage 10 is open-ended, so five of its seven steps are built inside earlier labs, and the final assembly is capped at six weeks (spine §3.10).

| Step | What it is | Built in | Gate | Claim |
|---|---|---|---|---|
| S10.L1 | Parser and typechecker for the roadmap's toy syntax, into the JSON IR | LAB-3.8–LAB-3.9, after S3 | golden tests against the S3 IR | — |
| S10.L2 | Reference interpreter as oracle | LAB-3.10–LAB-3.11, after S3 | [T] (n goldens) | CL-3.5 |
| S10.L3 | SMT obligations with counterexample replay | LAB-4.5, after S4 | every [R] replays in the interpreter | CL-4.2 |
| S10.L4 | PostgreSQL compiler and runtime with whole-command retries | LAB-6.8, after S6 | the S6 differential suite passes | CL-6.1, CL-6.2 |
| S10.L5 | Systematic testing: seeded differential and fault-injection suites | LAB-8.7, after S8 | seeds recorded; failures become specimens | CL-8.3 |
| S10.L6 | The demonstration: a mutation-generated agent proposal refuted, or a restricted obligation proved, then the corrected command run on PostgreSQL | LAB-10.4–LAB-10.7 | recorded end to end | CL-10.1 |
| S10.L7 | Publish the semantics, theorem statements, specimens, tool versions and known limitations, with the report exported from the claim graph | LAB-10.8–LAB-10.9 | the Defence over the report | CL-10.2 |

Agent proposals in the capstone come from the mutation generator, sound in a seeded 30–60% share; no language model runs at grade time. The report lists every open seam as [A] and every crack in its erosion log, with a defeater log written as doubts eliminated out of doubts identified, never summed [sridefeat]. An optional private overlay runs the same checks on your system locally, and nothing from it enters the repo (V2-28).

---

## 5. The learning loop and the weekly rhythm

### 5.1 Predict → Play → Build → Defend → Keep

Every KC runs the same loop. It is kernelspace's loop with one rename: "Prove" becomes **Defend**, because PROVED is an artifact stamp here and must not describe a learner (BRIEF §1.3).

| Step | What the learner does | Mechanics (evidence) | What is recorded | What it can move |
|---|---|---|---|---|
| **Predict** | Answers 1–2 prequestions before a segment; calls the verdict and a confidence before every first run of an authored cell; taps "so P holds", "so P is violated" or "can't tell" before a stamp appears (S1–S2, fading); forecasts which segment an erosion will crack | M-prequestion (A for prequestions; C for the per-segment placement, Ev [sthilaire23]); M-call-it (A for retrieval; C for certainty-based marking as feedback); M-erosion-forecast (D, Prec) | `call` events; only the first call counts, and it cannot be edited | Scheduling and the Mirror's calibration; Boot's pre-instruction call counts toward no KC state |
| **Play** | Runs the idea by hand on a real engine in the tab: Z3, Goal Replay, the Theater and Spectacle, the Derivation Board, PGlite | M-goal-replay-fading (A/B [barbieri23][renkl02]); M-twins (A [alfieri13]); M-class-hint (B/C [dantoni15]); M-layered-feedback (A [vdkleij15]); M-proof-blocks after reading (B [poulsen23]) | Practice `item` events, provenance `own · seen` (weight 0.3) | Scheduling only |
| **Build** | Works staged lab stages on the Bench or in Lane A; reads per-check results; climbs a hint ladder only after explaining the stuck point; mounts specimens; writes claim cards that fade from prefilled to learner-written | M-hint-ladder (A−/C [bastani25][sankar26]); M-manual-mode (C [keenan26]); M-stuck-protocol (D, Prec); M-specimen-cabinet (A/B [keith08]); M-claim-card (D, Prec) | `lab-check` and `receipt-import` events; claims, specimens and receipts in the lab repo | Claims and specimens, never sign-off |
| **Defend** | Predicts the outcome of seeded mutations of their own artifact (Prove-it); takes the four-part Defence; judges audit cases with typed evidence | M-prove-it (C/D, Prec); M-defence (B−); M-audit-desk (A small [alemdag25]); M-explain-back (A/B small, uncredited) | `prove-it`, `probe`, `audit` and `explain-back` events | Sign-off |
| **Keep** | Returns 3–5 times a week for a 10–12-minute Today on fresh seeds; re-finds old moves on new specimens; meets the Clearinghouse's incidents; keeps Lean alive while it is idle | M-today (A [latimier21][cepeda08]); M-re-find (A [rowland14][pan18]); M-sure-wrong-returns (B [butterfield01]); M-refutation-card (A in science [danielson24]); M-which-is-it (A [brunmair19]); M-lean-keep-alive (A for decay, D for dose) | `item`, `probe`, `audit` and `note` events | Settled; VRK₃₀ |

**Claims are not evidence** (spine §8.1). Claims record what artifacts establish, and agents may produce them, so claims never move "signed off". Evidence credits only unassisted, checker-graded work on unseen seeds. The weights follow kernelspace's:

| Provenance and exposure | Weight | Counts toward |
|---|---|---|
| own · unseen · generated (fresh) | 1.0 | sign-off, settled, VRK₃₀, audit accuracy |
| own · unseen, authored (a first exposure to a fixed cell or anchor) | 1.0 | audit accuracy; scheduling |
| own · seen (practice) | 0.3 | scheduling only |
| assisted (past hint rung R2, or a context packet used) | 0.3 | scheduling only, until an unseen variant passes unassisted |
| agent | 0 | may produce claims; never evidence |

The flag `automated` (a tactic closed a step taught in manual mode) belongs to receipts and claims only. It is never an event provenance, and it weighs no evidence event (spine §8.2).

Provenance is self-declared. Nothing local can verify "unassisted", so it calibrates rather than polices, and the assurance page says so in plain words (OD-8).

### 5.2 Two walks through the loop

**The first weekend** (spine §3.1). On a phone, Boot opens with an agent's pull request that says "safe, 200 tests green". The learner makes a pre-instruction call on a guarded transfer over `Int`, a variant whose answer the roadmap does not print. Z3 returns an overdraft witness, mounted as SP-1.1 [X RUN-z3-starter], and then the corrected guard's `unsat`; a labeled recorded run covers the seconds while the worker loads [X RUN-z3-starter-pyodide]. Boot closes on the 64-bit recipient wrap as an uncredited reveal [X RUN-z3-bv64], the "this will feel harder" card, *Set your week* and an optional placement walk. Boot introduces at most five glossary terms and takes at most 8 minutes.

The rest of the weekend, on a laptop, is S1.L1–S1.L3, the Z3Py introduction, and LAB-1.1–LAB-1.4 plus LAB-1.6: the roadmap's Project 00 checklist, about 3–6 hours at the planning multipliers against the roadmap's 3–5. LAB-1 runs with `uv run --with z3-solver==5.3.1` [X RUN-z3-starter] or entirely in the tab, never in the devcontainer. The weekend ends with a README carrying the roadmap's five fields and two claim cards prefilled from the receipt. S1.L4, S1.L5 and LAB-1.5 follow in week 2.

**A week in the long middle** (illustrative, S5 at 6 h/week) [D].

| When | Where | What happens |
|---|---|---|
| Sunday, 2 minutes | phone | *Set your week*: a 5–7-hour range, two Bench blocks, the Keep block |
| Monday, 11 minutes | phone, offline | Today: due items on fresh seeds from S1, S2 and S4 families; one audit case; the resume card for LAB-5.3 |
| Tuesday, 135 minutes | laptop | S5.L6 "Safety or liveness?" (core, three segments, a call before the first lasso), the matching *Learn TLA+* reading, then LAB-5.3 (25 minutes) |
| Thursday, 10 minutes | phone | Today, including a sure-and-wrong return from last week and a re-find of the double-spend move on a fresh variant |
| Saturday, 150 minutes | laptop | S5.L7 on fairness (core), LAB-5.4 and LAB-5.5 (25 minutes each), a faded claim card for CL-5.2 |
| Saturday, 11 minutes | phone | Today |
| Sunday, about 40 minutes | either | One Clearinghouse incident, the 5-minute weekly review over Claims, and the Lean keep-alive if one is due |

That is 4.75 hours of stage work in two Bench blocks and about 1.25 hours of Keep, matching the plan's 6-hour week (§4.4).

### 5.3 Today

Today is the home for return visits (M-today, spine §7): 10–12 minutes, phone-first and offline, 3–5 times a week inside the Keep block. It holds due items on fresh seeds scheduled by FSRS at 0.85–0.90 target retention; 0–1 audit case; re-finds ("same move, new specimen"); sure-and-wrong returns at about 1 day and 1 week; the resume card for the current lab stage; change cards when a tool or the field moved; and erosion forecasts. Interleaving happens only after a KC's exit item, only within one confusable set, and for at most half a session.

Two things are deliberately not in Today. The Lean keep-alive is its own 20–30-minute Keep session, because it cannot fit a 10–12-minute session; Today shows only a card when one is due (decision 26). And overdue counts never appear anywhere: after 7 or more idle days, Today opens a welcome-back set instead.

Offline works because pocket checkers, small build-time predicates, check witnesses on the phone without loading Z3, and CI property-tests each predicate against Z3 (M-pocket-checkers, GATE-conformance).

### 5.4 The week

**Set your week** (M-set-your-week, grade B [buehler94]). The learner sets a range target, two Bench blocks on self-chosen days, and a Keep block whose size the course computes. The rhythm reads "met in k of the last 12 weeks", counting graded or Bench work only, with a target of 8 or more (BRIEF §7.6). A missed week can be made up within 7 days, declared breaks pause the window, and every 12 weeks include two reserve weeks. The copy is gain-framed (grade B [silverman23]).

**The weekly review** takes 5 minutes over Claims and asks one question, roadmap rule 6's: what can I now reason about? Recorded monitoring has d+ = 0.40 across 138 RCTs, larger when recorded and reported [harkin16] (grade A). An optional human reviewer of claim cards can join it (OD-9).

**The monthly retro** takes 15 minutes and sets 1–2 if-then plans, re-prompted at stage start and at re-entry. The bias-corrected effect is small, d = 0.15 [sheeran25] (grade A, small), and the course says so.

**Technical notes** follow S2, S5, S7 and S9: 600–1,000 words in roadmap rule 5's three parts (the model, the surprising failure, what changed your understanding), written from memory first, with specimens and receipt hashes attached afterwards (M-notes, grade A small [bangertdrowns04]). Publishing a note, for example in the learner's public lab repo, is optional.

### 5.5 Re-entry

Long arcs have gaps, and a gap is not a failure (M-welcome-back, grade B [silverman23]). After 7 or more idle days, a welcome-back set. After 14 or more, "Back at the bench", 20–30 minutes: the last claim card, three re-finds, one call, and the next artifact restated [dp §4.2]. After 6 weeks or more, a landmark restart with a lighter target for two weeks. None of these shows a count of what was missed.

### 5.6 Phones and laptops

Phone-first surfaces are Today, Lesson, Audit and Claims. On a phone the flow is predict, see a recorded run with its run id, then queue the hands-on work for the laptop. The Bench is labeled laptop-only, and the Theater and Derivation Board degrade to reading views on narrow screens (spine §9.3, §10.1).

---

## 6. Mechanics

The full rules live in three companion documents: [ASSESSMENT.md](ASSESSMENT.md) (evidence, generators, Call It, the Defence, stamps), [AUDIT-DESK.md](AUDIT-DESK.md) (taxonomy, anchors, scoring) and [WORLD.md](WORLD.md) (the Clearinghouse). This section summarizes them.

### 6.1 The catalog

The spine lists 46 mechanics (spine §7), each tagged "Ev" when its principle has outcome evidence or "Prec" when it has precedent only (V2-32). Grouped by job:

| Family | Mechanics | Strongest evidence |
|---|---|---|
| Prediction and retrieval | M-prequestion, M-call-it, M-which-is-it, M-today, M-re-find, M-sure-wrong-returns, M-refutation-card, M-test-out | A: retrieval with application items, spacing, prequestions, interleaving of confusables; C: the per-segment placement of prequestions |
| Examples and explanation | M-goal-replay-fading, M-self-explanation, M-proof-blocks, M-twins, M-explain-back, M-notes, M-feels-harder | A: worked examples first, contrasting cases; B: backward fading, Proof Blocks |
| Feedback and help | M-layered-feedback, M-class-hint, M-hint-ladder, M-manual-mode, M-stuck-protocol | A: elaborated feedback; A−/C: gated help; C: manual mode; D: the stuck protocol |
| Assessment | M-prove-it, M-defence, M-audit-desk, M-spec-duel, M-mirror | B−: the Defence's parts; A small: erroneous examples |
| Claims and assurance | M-claim-card, M-assurance-strip, M-seam-erosion, M-erosion-forecast, M-specimen-cabinet, M-change-cards, M-cti-workbench | A/B: keeping errors (error management); the rest D, Prec |
| Rhythm and persistence | M-set-your-week, M-weekly-review, M-monthly-retro, M-welcome-back, M-lean-keep-alive | A: recorded monitoring, decay; B: repairable rhythm, planning |
| World and field | M-docket, M-hall-of-records, M-production-twin, M-sibling-bridge, M-public-counterexample, M-overlay | D, Prec |
| Infrastructure that learners feel | M-telescope, M-pocket-checkers, M-consent | D, Prec |

Outcome evidence for formal-methods courseware itself is thin; the best is a novice RCT with n = 332 [poulsen23], and Forge states that it does not claim to measure learning efficacy [forge]. statespace imports designs, not effect sizes, and measures VRK₃₀ (BRIEF §2.1).

### 6.2 Assessment

**Principles** (spine §8.1). Checkers decide, about the learner too: Z3, TLC, Spectacle, the interpreter, `lake comparator`, cargo, and keys computed by engines at grade time. Lean's own manual treats un-reviewed AI-generated proofs as potentially malicious and prescribes the comparator [leanvp]. Language models only propose reading prequestions, adversarial cases and hint wording at authoring time, and a witness certifies each flaw. No model grades, and no item is generated by a model at run time.

**Events.** Each event records `{id, kind, ref, itemRev, engine@version, seed, ok, conf, provenance, seen | unseen, at, ms}` in an append-only on-device log. Kinds are `call`, `item`, `probe`, `audit`, `prove-it`, `lab-check`, `receipt-import`, `explain-back` and `note`. The learner model is derived from events at read time.

**Generators.** Fourteen families with 47 templates. Seeds are drawn at grade time, and each family has 2–4 structurally different templates banded by operator count, quantifier alternation, trace length and process count. Distractors are misconception mutants from the catalog [dp §2], each tool-checked as distinct from the key and tagged with a misconception ID. `unknown` instances are discarded. A `sat` answer is graded by checking the witness, never by matching a model, because native and Pyodide witnesses differ [X RUN-z3-bv64-pyodide]. Oracles are "unseen, not secret": a static site cannot hide them, and the course says so.

| Family | Learner produces | Grader | Stages | Ships |
|---|---|---|---|---|
| GEN-negate-it | a negation or violation query | Z3, both directions, with a distinguishing state; non-vacuity mandatory | S1, S4 | W1 |
| GEN-find-the-witness | a model, trace, history or state pair | the engine itself; then name the class | S1–S9 | W1 |
| GEN-call-it | a verdict and confidence; true/false over about five scenarios | keys computed at grade time | all | W1 |
| GEN-which-stamp | the stamp and qualifier for a raw output | the verdict → stamp table | all | W1 |
| GEN-spot-the-gap | a gap class and typed evidence | keys from the checker run on the mutated twin | all | W1 |
| GEN-spec-it | a property or policy | Z3 equivalence with a reference; requirement fit by multiple true/false | S7 | W2 |
| GEN-proof-structure | the next goal, a Proof Blocks order, the needed hypothesis | goals from real elaboration; DAG grading | S2, S3, S9 | W2 |
| GEN-defend | predictions about seeded mutations of your own artifact | comparator, TLC, Z3, cargo | S1–S10 | W2 |
| GEN-wp-it | a weakest precondition | Z3 equivalence | S4 | W3 |
| GEN-cti-or-bug | inductive, CTI or reachable | the inductive checks, then bounded reachability with the bound printed | S4, S5, interleaved to S9 | W3 |
| GEN-trace-allowed | one satisfying and one violating trace | TLC state graph | S5, S7, S8 | W3 |
| GEN-lasso-or-not | a lasso, or "none" | the lasso validator over TLC graphs | S5, S8 | W3 |
| GEN-anomaly-id | a history class | the history checker on Bench-recorded PostgreSQL 18.6 histories [X RUN-pg-anomalies] | S6 | W4 |
| GEN-leaks-to-observer | a state pair the observer tells apart, or "none" | the paired-state evaluator | S7, S9 | W4 |

**Formalizing progresses** pick → fix → write (V2-26). A GEN-negate-it or GEN-spec-it item starts as "pick the right formalization among misconception mutants", moves to "repair a near-miss", then to "write from scratch", advancing after two unseen successes and stepping back after two misses.

**Call It.** Confidence is three taps with bands from certainty-based marking's switch points: *guess* (below 67%), *think so* (67–80%), *sure* (above 80%) [cbm]. The item prints its chance level, 1/k. The payoffs (+1/0, +2/−2, +3/−6) are shown before choosing and used as feedback only, never as credit, because penalties mix risk attitude into the score [baldiga14] (grade B). At least 30% of calls are genuine surprises, no verdict exceeds 60% of a stage's calls, and every option carries a "why" and a misconception ID (GATE-items).

**The Defence** closes every stage (spine §8.6). It is untimed and taken over at least two sessions within a week of the lab, because a gap before a separate exam loses learners [serth22].

| Part | Content | Graded by | About |
|---|---|---|---|
| A. Probes | 10–12 unseen-seed items from ≥3 families, including the roadmap's completion tests turned into items; agent closed; a call on each | checkers | 35 min |
| B. Defend | 4–6 seeded mutations of the learner's own lab artifact, predicted first; every mutant elaborates or builds, or its key predicts that it fails to | Lean, TLC, Z3, cargo | 20 min |
| C. Audit | 4 cases, at least one sound, with typed evidence | the audit evaluator and keys | 20 min |
| D. Explain-back | a 2-minute oral and a 3-idea self-check compared with Part A; required and uncredited | — | 10 min |

Signed off means Parts A–C at least 75% overall and each part at least 60%, every credited part with at least four items, with the interval shown (10 of 12 gives 0.55–0.95 [D]); plus fresh items on the stage's KCs correct in at least three spaced sessions [higham22]. A failed part is retaken on fresh seeds at least 3 days later; only the failed part is re-sampled, nothing locks in the meantime, and every attempt stays in the log. The Defence's overall grade is B−: retrieval, case sampling and explanation support Parts A, C and D; Part B has face validity only. S9 runs two mini-Defences, one per half.

**Stamps and the verdict → stamp table** (spine §8.7–§8.8). Each stamp is a word plus a bracketed code plus a required qualifier, rendered with a shape that survives grayscale. A few rows show the discipline:

| Raw output | Stamp |
|---|---|
| `unsat` of ¬P on the learner's encoding | [P] of the encoding, with the open defeater "encoding unverified"; "uncertified" unless cross-checked |
| `sat` plus a model | [R], after the witness replays |
| `unknown`, a timeout or an `rlimit` stop | [?] with its reason; fails closed when it guards enforcement [bpa] |
| TLC "no error", complete exploration | [M] · constants · complete |
| TLC stopped at "Deadlock reached" before exploring every reachable state [X RUN-tlc-doublespend] | [?] · stopped at deadlock, n distinct states |
| A TLC or Apalache inductive check at fixed constants | [M] · constants · "inductive at N = k"; never [P] |
| Lean: comparator accepts, axioms standard | [P] · Lean 4.35.0 kernel · axioms listed [X RUN-lean-ledger] |
| Lean: a `_native` axiom | [P] · kernel + compiler [X RUN-lean-axioms] |
| "Results match" on one database | [T] · 1 instance |
| A language model says "equivalent" or "proved" | no stamp; quoted UNREVIEWED text |

**What this cannot establish**, printed on SCR-assurance: unassisted work is self-declared; oracles are visible to a determined learner; Defence Part B has no outcome data; the measurements describe one learner and support no causal claim.

### 6.3 The Audit Desk

The Audit Desk trains outcome (g) on erroneous examples, which help once learners have prior knowledge (g = 0.136 [alemdag25]; d = 0.33 at one week [mclaren15]; grade A, small). Details are in [AUDIT-DESK.md](AUDIT-DESK.md).

- **The pool.** Matched sound and flawed pairs, about half sound across the pool, and each session draws its sound share from a seed in the 30–60% range, so the rate cannot be learned. Twenty-five anchors, at least two per stage, cover all thirteen classes; seeded mutation operators grow each class to at least six exemplars, and every key is set by a real tool run (GATE-audit). Each case carries a "based on" card citing a dated incident and its source, and never exploit code.
- **The flow, in five steps.** Call the statement alone; reveal the diff; write "This proves: ___"; pick a gap class with no default ("none: sound" is an option); anchor typed evidence to lines: a witness or trace, the offending declaration, the mismatched identifiers, paired states, or a scenario the theorem permits and the requirement forbids. Agent claims render as quoted UNREVIEWED text. Scores appear afterwards, as counts.
- **Scoring.** Per-class precision and recall with Wilson intervals, shown only once a class has n ≥ 10, plus balanced accuracy with an interval assembled from the two class rates' 97.5% Wilson intervals (spine §6). GATE-audit-blind fails CI if always-reject, always-accept, last-is-sound or topic-is-class beats chance by more than 2 SD.
- **The taxonomy.** Thirteen classes in three kinds. Rebutting: G1 statement too weak, G2 vacuous premise, G3 wrong property kind, G12 requirement mismatch. Undermining: G4 encoding and type-semantics slip, G5 bounded or inconclusive presented as proof, G6 hidden trust, G7 unstated environment assumption, G11 test presented as proof. Undercutting: G8 model–implementation drift, G9 granularity, G10 observer too weak, G13 induction failure confused with a bug.
- **Late stages harvest your own repo.** `statespace audit` mutates the learner's lab repo with gap-class operators and harvests agent commits that touched statements, computing keys locally (W5-T11). S10's Defence includes one case harvested this way.
- **Scheduling.** Cases are always browsable and never locked; each is scheduled after its lab and re-checked a week later. The five W1 anchors from later stages (AUD-2.1–AUD-2.4, AUD-5.3) ship keyed by executed runs and are scheduled after LAB-2 and LAB-5, because erroneous examples need prior knowledge.

### 6.4 The Clearinghouse

The persistent world, working name "the Clearinghouse" (OD-14), is thin by design: a seeded, deterministic Mini-Plinth world run by the reference interpreter in the tab, in the roadmap's nouns only (M-docket; [WORLD.md](WORLD.md)). It is kernelspace's persistent-world pattern at a fraction of the build cost, and it runs with no server.

- **It grows with the stages:** accounts with postings and holds (W3-T14); then the learner's compiler running on PGlite, plus users, teams, roles, documents and sharing (W4-T14); then an external provider with crashes, duplicates and delays, driven by the learner's own outbox machine under seeded faults (W5-T13).
- **The learner's components plug in:** their checker gates proposals, their compiler runs on PGlite, their outbox machine runs under seeded faults, and their validator checks plans.
- **Each week brings 1–3 incidents:** agent proposals generated by mutation, sound in a seeded 30–60% share; gap-class incidents whose thresholds are proven against a naive and a reference baseline ({{run:RUN-docket-baselines}}); and erosions fired from the learner's oldest open erodible seam, never by the calendar. ER-12 is the world's own erosion.
- **It stays thin on purpose.** A richer simulated product would be the largest build with no outcome evidence (BRIEF §5.1).

---

## 7. Labs, the Bench, receipts and agents

### 7.1 Lab anatomy

Every lab follows one shape (spine §3.0): predict, then run the reference; 3–5 investigation items; stages of at most 25 minutes on weekdays and 45 at weekends, the first a 2-minute win; per-check results; a hint ladder R0–R4 behind an explanation gate on every check, where anything past R2 is credited as assisted until an unseen variant passes; Prove-it predictions about seeded mutations of the learner's own artifact; a receipt; and claim cards that fade from receipt-prefilled to learner-written. A stuck protocol fires at 25, 45 and 90 minutes. Each Lean lab's template states what it pre-supplies, so a stage's minutes cover only what the learner writes.

### 7.2 The ten labs

| Lab | Builds | Lane | First win (2 minutes) | Capstone |
|---|---|---|---|---|
| LAB-1 | Project 00, the counterexample lab | `uv run` or the tab | Run the Z3Py introduction, then the starter: `sat`, then `unsat` [X RUN-z3-starter] | — |
| LAB-2 | The verified ledger, with a challenge pack | Bench (Lean) | `statespace check` on the reference proof: kernel acceptance and the axiom list [X RUN-lean-ledger] | — |
| LAB-3 | mini-plinth-core, kernel-checked goldens and the JSON IR | Bench + Lane A | One golden passes | S10.L1, S10.L2 |
| LAB-4 | `miniplinth check` | Lane A + Bench (cvc5) | The reference checker proves the guarded Transfer for the fragment, with a premise witness {{run:RUN-check-fragment}} | S10.L3 |
| LAB-5 | The holds spec | Bench (TLC) | The provided double-spend configuration reports its violation and 4-action trace [X RUN-tlc-doublespend] | — |
| LAB-6 | pg-refinement | Bench (`isorun`) + Lane A on PGlite | Replay the read-modify-write history on PostgreSQL 18.6 [X RUN-pg-anomalies] | S10.L4 |
| LAB-7 | authz-flow | Bench (Soufflé, row-level security) + the tab | The reference policy gives equal relations in both engines [X RUN-fixedpoint-equal] | — |
| LAB-8 | effects-sim | Lane A + Bench (TLC trace validation) | The reference simulator's seed-1 trace is accepted {{run:RUN-tlc-trace-validation}} | S10.L5 |
| LAB-9 | Compiler, preservation proof and SQL validator | Bench (Lean) + Lane A | The reference translation validator accepts an honest output and rejects a wrong-account write {{run:RUN-tv-reference}} | — |
| LAB-10 | Core assembly | all | The reference pipeline reproduces the report skeleton {{run:RUN-core-demo}} | S10.L6, S10.L7 |

**The lab shape is OD-15,** accepted on 2026-10-25. The brief sketched 9 labs and about 45 stages; the spine proposed 10 labs with 83 planned stages, because stages are pinned per lemma, whole-theorem Lean proofs are 45-minute weekend stages, three roadmap acts that were lesson-only now have stages (LAB-3.6, LAB-4.7, LAB-7.6), S8's progress guarantees have a liveness stage (LAB-8.3), and capstone steps add seven (decision 4). GATE-budget confirms the total fits.

### 7.3 Two grading lanes

- **Lane A:** the learner's Rust compiled to wasm and graded in the tab, on seeds drawn at grade time; each check runs in a fresh instance of your module, and the worker is replaced only after a timeout (INS-lane-a). One JSON IR, emitted by `lake exe`, links S3, S6 and S9. Mismatches are triaged as spec, implementation, tool or proof errors. Reference modules earn nothing.
- **Lane B:** receipts from Lean, TLC and multi-session PostgreSQL, run on the Bench and imported into the tab.

Learners never see "Lane A" or "Lane B". Every stamp instead names where its verdict came from, in one of three badge words: *re-checked here*, *reported from your machine*, or *self-assessed*.

### 7.4 The Bench

The Bench is the learner's own machine with the real tools, in a digest-pinned devcontainer from S2 onward, with a Codespaces prebuild and `statespace doctor` (V2-22; W0-T05). It pins Lean 4.35.0 with core and Std only and `autoImplicit false` [X RUN-lean-ledger]; `tla2tools` 1.8.0 pinned by SHA-256 with 1.7.4 as the text-trace fallback [X RUN-tlc-jars]; PostgreSQL 18.6 [X RUN-pg-anomalies]; Z3 5.3.1 [X RUN-z3-starter] and cvc5 1.4.2, the Bench binary [X RUN-scaffold]; Soufflé 2.5 [X RUN-souffle-version]; the Rust toolchain [X RUN-scaffold]; and, optionally, Apalache 0.62.4 [X RUN-apalache-version] and Alloy 6.2.0 [X RUN-alloy-version]. No Mathlib: a Mathlib `Finmap` project's packages take 7.3 GB [X RUN-lean-mathlib], while core Lean proves the ledger. Lean's sandbox is Linux-only and is recorded as on, off or failed, never required, because under default Docker it fails with the same exit code as a rejection [X RUN-lean-bwrap-docker].

**The CLI** is Python, managed by `uv`, shipped in `statespace-lab`, and keeps the course's name (spine §9.6).

| Command | Does |
|---|---|
| `statespace doctor` | checks the devcontainer pins and the sandbox; prints a receipt-ready environment block |
| `statespace check <lab>[.<stage>]` | runs a stage's checks; for Lean: build, `#print axioms`, `lake check`, `lake comparator` (with `--paranoid` in CI and at the Defence); writes `receipts/` |
| `statespace receipt verify`, `statespace hash` | validates a receipt and recomputes statement hashes |
| `statespace run <RUN-id>` | re-executes a registry run and diffs its outputs |
| `statespace isorun <history>` | drives two PostgreSQL sessions by detecting lock waits, never by sleeping |
| `statespace trace validate`, `statespace sim <seed>` | validates NDJSON traces against a TLA+ spec with TLC; runs the learner's simulator under a seeded fault schedule |
| `statespace defend` | seeds mutations of the learner's own artifact, takes predictions first, grades with the right checker |
| `statespace audit gen \| harvest` | turns the learner's repo into audit cases with locally computed keys |
| `statespace stuck` | captures the failing goal, emits a forum-ready minimal example with private paths stripped, and offers to park the goal |
| `statespace export`, `statespace overlay` | bundles claims, specimens and receipts into the report; runs the private overlay for your system, never committed |

### 7.5 Receipts

A receipt is a run's verdict lines, versions and statement hashes, imported from the Bench (spine §9.4). Its schema, `statespace/receipt@1`, is one JSON Schema that generates TypeScript and Python types. It records the environment (devcontainer digest, OS, sandbox state); every tool with its version and binary hash; every statement with a hash computed the way Comparator Live hashes a challenge (text with trailing whitespace removed, plus one newline); every run's engine, version, argv, input hash, budget, exit code and verdict lines parsed verbatim; Lean's checkers and axioms per theorem, `_native` axioms, `sorry` count and automation flags; TLC's constants, flags, distinct states and depth; Z3's `rlimit` and `reason_unknown`; PostgreSQL's version, isolation level and SQLSTATE classes; per-check results; self-reported provenance; and the claims to mint.

Three rules make receipts trustworthy. **A receipt never trusts an exit code alone**; it parses every verdict, because a `sorry` build exits 0 [X RUN-lean-axioms] and a sandbox failure exits like a rejection [X RUN-lean-bwrap-docker]. **A changed statement hash voids the claim to [?]** (I7). **Imports are untrusted input**, so the tab parses them only on the instrument origin, schema-validated, size-capped and never rendered as HTML (I6). Sigstore attestation stays off by default (OD-13).

### 7.6 The lab repository is the record

Claims, specimens and receipts live in the learner's lab repository, not in the browser (V2-17): `claims/*.yaml`, `specimens/`, `receipts/`, and `broken/` beside `fixed/` (roadmap rule 2). The browser's only record is practice events, beside a disposable, read-only copy of your lab repository; the events sit in an append-only IndexedDB log with export bundles, merge-import with undo, and a 7-day backup nudge, because WebKit may clear script-written storage after seven days without interaction [webkit7d]. The repo doubles as the Stage 10 publication.

### 7.7 Agents

The learner builds their own system with coding agents, so the course does not pretend agents away. It draws one line: **agents may prove; the learner states.**

- **Statements are pinned.** Every Lean lab ships a read-only `Challenge` module with definitions and statements, plus a `comparator.json` listing the permitted axioms, which S2.L9 teaches. Non-Lean statements live in `claims/*.tla`, `*.smt2` and `*.yaml`, hashed on every receipt. In measured runs, comparator accepted an honest proof and rejected a weakened statement and a redefined `transfer` [X RUN-lean-comparator].
- **The agent kit ships in every lab zip:** AGENTS.md, CLAUDE.md and a fail-closed PreToolUse hook that blocks agent edits to `TODO(you)` bodies, challenge files, claim statements and receipts (GATE-guardrails). The site ships `llms.txt` and per-lesson Markdown, so the learner's own agent can tutor while the site sees nothing.
- **The policy is per item.** Agents are welcome everywhere except Prove-it items and the Defence. Help is a hint ladder, R0 (teach-back) to R4 (informal proof), behind an explanation gate: unguarded help raised practice scores and lowered exams, while gated help cut failure on unaided work [bastani25][sankar26] (A−/C).
- **Agent claims are never stamped** (I8). An agent's "proved" or "equivalent" renders as quoted UNREVIEWED text. An agent's proof of a pinned statement still earns its artifact stamp, because the checker, not the author, establishes it; it simply never counts as the learner's evidence.
- **Stuck is a protocol, not a failure.** At 25, 45 and 90 minutes `statespace stuck` captures the failing goal, emits a forum-ready minimal example and a short packet for the learner's own agent, and offers to park the goal. A parked goal is carried as [A] in the claim, so the claim reads "PROVED modulo k assumed lemmas", with a re-find in 7 days.

---

## 8. Instruments and the honest tab/Bench split

### 8.1 The rule

Real engines run in the tab wherever they can run honestly; the Bench is authoritative wherever they cannot; and every stamp says which one produced it. An instrument never presents a recording as live, a bounded check as complete, or a port as the reference. Each one states its limit beside its output (spine §9.1).

### 8.2 Tab instruments

All run on the instrument origin unless noted. "Honest limit" is what the learner is told.

| Instrument | Engine and pin | Honest limit |
|---|---|---|
| INS-z3 | Z3 5.3.1 via the `z3_solver` wheel on Pyodide 314.0.7, in a module worker; no cross-origin isolation needed [X RUN-z3-starter-pyodide, RUN-browser-origin] | Budgets are `rlimit`, because `timeout` never returned while `rlimit` stopped with `unknown (canceled)` in 1.1 s [X RUN-z3-budget-pyodide]; `worker.terminate()` is the hard stop; witnesses differ from native Z3; the loader shows the first load's size while it downloads, and nothing asks first (OD-6) |
| INS-goal-replay | Goal strips generated at build time from real Lean 4.35.0 elaboration [X RUN-lean-plaingoal] | Not live Lean; regenerated on every toolchain bump (GATE-replay) |
| INS-interp | The Mini-Plinth reference interpreter, a TypeScript port | A port: the Lean semantics is the reference; [T] against kernel-checked goldens (GATE-interp; held seam SEAM-13) |
| INS-derivation | The Derivation Board; each step is one Z3 validity query | The supported fragment only |
| INS-theater | Authored scenes exported from TLC state graphs, with enabled-action controls and branching history | Monitors report observations, not stamps; only TLC or Spectacle results earn [M] |
| INS-spectacle | Spectacle at commit 5827c22, vendored; its counts equal TLC's 11, 45, 191 and 813 distinct states for 2–5 workers [X RUN-spectacle, RUN-tlc-full] | Learner edits run under a 10 s wall-clock budget [D], with no separate state cap; no PlusCal and no fairness or liveness; a conformance gate guards every bump |
| INS-lasso | A lasso validator over TLC graphs and imported traces | Exact on finite graphs; its input format awaits W0-S05 |
| INS-pglite | PGlite reporting PostgreSQL 18.6, one connection [X RUN-pglite] | Two "concurrent" sessions serialize [X RUN-pglite], so concurrency is replayed from Bench histories; row-level security awaits W0-S08 |
| INS-history | Viewer and replayer for Bench-recorded histories, plus the abstract-serializability checker | Bounded search over a few transactions, so results are [T]; it shows anomalies present, never absent |
| INS-datalog | Z3 `Fixedpoint` in the Z3 worker, with stratified negation measured [X RUN-z3-fixedpoint], or a TypeScript evaluator differential-tested against Soufflé | Decided by W0-S03; equal relations to Soufflé are gated |
| INS-pairs | A paired-state evaluator over the reference interpreter | Finite domains; bounds printed |
| INS-sim | The learner's wasm outbox machine under recorded fault seeds | Not authoritative; TLC trace validation on the Bench is |
| INS-lane-a | Host for the learner's Rust compiled to wasm with the family's zero-import ABI | Time-limited per check; reference modules earn nothing |
| INS-receipt | Importer for Bench receipts, by file or URL fragment | Schema-validated, size-capped, never rendered as HTML; shows its source |
| INS-pocket | Build-time TypeScript predicates that check witnesses offline on phones | A second semantics, so CI property-tests it against Z3 (GATE-conformance) |

The eight Bench engines (INS-bench-lean, INS-bench-tlc, INS-bench-pg, INS-bench-smt, INS-bench-souffle, INS-bench-cargo, and the optional INS-bench-apalache and INS-bench-alloy) are listed with their pins in §7.4.

### 8.3 The split, capability by capability

| Capability | In the tab | On the Bench (authoritative) | On a phone |
|---|---|---|---|
| SMT | Z3Py on Pyodide; pocket checkers for offline witnesses | Z3 and cvc5; every authored `unsat` cross-checked | Recorded runs with ids; pocket checkers |
| Lean | Generated Goal Replay; recorded `#guard_msgs` outputs | `lake check`, `lake comparator`, `--paranoid` [X RUN-lean-comparator] | Goal Replay reading and next-goal items |
| TLA+ safety | Spectacle within its 10 s wall-clock budget [D]; Theater scenes from TLC graphs | TLC, argv on every receipt | Predict-then-reveal Theater, vertical lanes |
| TLA+ liveness | The lasso validator over imported TLC traces | TLC with stated fairness | Lasso reading |
| SQL | PGlite on one connection [X RUN-pglite]; replayed Bench histories | PostgreSQL 18.6, multi-session through `isorun` [X RUN-pg-anomalies] | Recorded histories |
| Datalog | Z3 `Fixedpoint` or the TypeScript fallback | Soufflé | Recorded derivations |
| Simulation | The learner's wasm machine on recorded seeds | The learner's simulator plus TLC trace validation | Recorded traces |
| The learner's Rust | Lane A: each check in a fresh instance of your module, the worker replaced only after a timeout | cargo, with Lane A crates built here first | Queued for the laptop |

### 8.4 What is linked out, and what is not embedded

Five third-party tools are disclosed, uncredited link-outs (OD-4): live.lean-lang.org, the Natural Number Game, TLA+ By Example (which runs TLC through a vendor CDN), Alloy4Fun and TigerBeetle's simulator. A link-out never earns credit, and the copy says it leaves the course's zero-server boundary. Three things are deliberately not embedded: CheerpJ (self-hosting needs a commercial license, and the vendor-CDN lane breaks zero servers); in-browser WASM Lean (it downloads 137,362,599 B decoded and needs cross-origin isolation [X RUN-lean-wasm], and it lags the pinned toolchain); and the npm Z3 build, which needs cross-origin isolation [X RESULTS.md].

### 8.5 The instrument origin and downloads

The instruments live on a separate origin on its own custom subdomain (OD-5), because a same-origin worker can still reach the main origin's IndexedDB, and an opaque-origin sandbox fails for Pyodide in Chromium, while a separate origin runs Z3 in three engines and cannot read the parent's storage [X RUN-browser-origin]. Project sites on a shared hosting account share one origin, so the subdomain is required, and W0-S01 records it as RUN-origin-subdomain. The two origins talk through one message-only bus: `{engine, version, input, budget} → {verdict, witness, stats, provenance}`. Only the instrument origin parses any byte from outside the page (I6). No download asks first or warns, and while an engine downloads the loader shows its size; assets use content-hashed caching, and the service worker has a kill switch (OD-6, M-consent); the first-load size on real phones is {{run:RUN-phone-pyodide}}.

---

## 9. Interface summary

The full specification is [DESIGN.md](DESIGN.md); the screen catalog is spine §10.

**Navigation.** Today · Stages · Bench · Audit · Claims, plus search. The private Mirror (calibration and VRK₃₀) is reached from Today and never appears on Claims. Phone-first surfaces are Today, Lesson, Audit and Claims; the Bench is labeled laptop-only. Home is an ordered path of stages with a list mirror; nothing on it is locked, and status is drawn in ink.

**The look: a drafting table.** Vellum sheets and graphite line work, title blocks filled from runs, and stamps that are words plus bracketed codes, separable in grayscale. Structure is drawn, not boxed: hairline rules, no shadows, no gradients, corners of at most 2 px. Each line style carries one meaning: solid graphite is structure, dashed is assumed, dotted is bounded, heavy vermilion is a witnessed violation, and a vermilion zig-zag is an erosion crack. The night theme is a neutral graphite night, replacing v1's navy and mint, which echoed kernelspace (V2-33). v1's stone metaphor and elevation drawing are retired. Motion is spent only on change (goal diffs, trace scrubs, crack propagation) and becomes static +/− marks under reduced motion.

**Twenty-three screens** (spine §10.1), in four groups:

| Group | Screens |
|---|---|
| Daily and weekly | SCR-boot, SCR-today, SCR-week, SCR-mirror, SCR-changes |
| Learning | SCR-stages, SCR-stage, SCR-lesson, SCR-theater, SCR-derivation, SCR-drawer, SCR-search |
| Building and judging | SCR-bench, SCR-lab, SCR-receipt, SCR-audit, SCR-defence, SCR-specimens, SCR-clearinghouse |
| Record and trust | SCR-claims, SCR-notes, SCR-assurance, SCR-settings |

**Words.** Learner copy uses at most 25 coined terms plus plain English, and Boot introduces at most five (OD-14; spine §0). Internal names stay out of learner copy, and GATE-lessons lints for them: learners see the badge words rather than "lanes", a "dated incidents" filter rather than a "Hall of Records", "parked goal" rather than "proof debt", and "audit accuracy" rather than "Judgment".

**Access.** WCAG 2.2 AA at 360, 320 and 1280 px (GATE-a11y); native radios for Call It; a keyboard-first Derivation Board stepper (success criterion 2.5.7); traces as real tables with narration; 44-px targets; JuliaMono v0.63.2 for code and logic [X RUN-juliamono-glyphs]; ASCII TLA+ by default with a speech map (GATE-glyphs); and a manual screen-reader pass at every wave exit from W1 to W5, with full NVDA and VoiceOver passes in W6.

---

## 10. Architecture summary

The full specification is [ARCHITECTURE.md](ARCHITECTURE.md); the repository layout and gates are spine §11.

**Two static origins, no server.** `apps/site/` is the React static site on the main origin; `apps/instruments/` is the instrument origin with the Pyodide-Z3 worker, Spectacle, PGlite, the Datalog engine, the lasso validator and the Lane A host. Content lives in `content/stages/`; the runs registry in `runs/`; one JSON Schema source for `receipt@1`, `claim@1`, `run@1`, `event@1` and `IR@1` in `schemas/`, generating TypeScript and Python types; the `statespace-lab` template with its agent kit in `labs/` (never solutions; `labs/_solutions/` is ignored); the Python CLI in `bench/`; gate scripts in `scripts/verify-*`.

**Three homes for data.** The browser's only record is practice events, in an append-only log, beside a disposable, read-only copy of your lab repository; the learner's lab repo keeps claims, specimens and receipts; the course repo keeps content, runs and schemas. Nothing is stored that can be derived (I2).

**The stack** is React 19.3.1, Vite 7.3.7, TypeScript 5.9.3, Playwright and axe, pinned in W0-S12 [X RUN-scaffold]. **Vendored from kernelspace** at a pinned SHA: the verify-script framework and item lints, the accessibility harness, the agent kit with its fail-closed hook, the service worker with its kill switch, the FSRS scheduler, the seeded RNG, the zero-import wasm ABI host and the lab packer. Not vendored: the ledger engine (only its envelope ideas), kernelspace's persistent world, and its look.

**Gates.** 28 gates in three lanes (spine §11.2). The fast lane runs in under 5 minutes and blocks merges. The nightly lane blocks releases, and a red night downgrades the claims it touches to "unverified since <date>". The release lane is the Cedar-style gate: no release unless models, proofs, differential tests and runs are up to date [cedarblog].

| Lane | Gates |
|---|---|
| Fast: facts and runs | GATE-numbers, GATE-facts, GATE-runs (resolution check on content not labeled draft) |
| Fast: items and generators | GATE-calls, GATE-items, GATE-audit-blind, GATE-generators, GATE-kc, GATE-interp |
| Fast: claims, stamps and copy | GATE-stamps, GATE-codes, GATE-claims, GATE-lessons, GATE-erosions, GATE-links |
| Fast: plan and platform | GATE-budget, GATE-glyphs, GATE-bundle, GATE-guardrails, GATE-privacy, GATE-schema |
| Nightly | GATE-replay, GATE-conformance, GATE-specimens, GATE-labs, GATE-audit, GATE-a11y, GATE-runs (full) |
| Release | GATE-release, with GATE-runs |

---

## 11. The content production process

### 11.1 The authoring contract

Every artifact ships with the fields below, and a gate rejects it otherwise. The contract borrows TLA+ By Example's discipline: every authored cell declares its expected outcome, runs in CI, and labels its counts as first-counterexample or complete [tlabyex].

| Artifact | Must carry | Checked by |
|---|---|---|
| Lesson | ID, tier, title; an observable objective; KC tags, with each KC's prequestion, call and exit item in its first lesson; instruments; for every graded item, its generator family and template; specimens and claims; segment titles for the rail; at most six block types in W1–W2; glossary terms only; no lock copy | GATE-lessons, GATE-kc, GATE-links |
| Instrument cell | Engine and version, input hash, budget, the expected verdict, and the run ID that produced it; witness properties, never model values | GATE-calls, GATE-numbers, GATE-runs |
| Lab stage | ID, title, nominal minutes (≤25 weekday, ≤45 weekend), what the template pre-supplies, the check and its acceptance, hint rungs R0–R4, Prove-it mutants that elaborate or build (or are predicted not to), receipt fields, claims to mint | GATE-labs, GATE-budget |
| Generator family | A pure `make(seed, level)`; 2–4 banded templates; distractors as misconception mutants, tool-checked as distinct from the key; `unknown` discarded; determinism across three engines | GATE-generators, GATE-items |
| Specimen | A label generated from its run (violates, because, minimal?, cured by, found in, tool version); `[X RUN-id]` or `{{run:RUN-id}}` | GATE-specimens |
| Claim template | Six fields plus a requirement row; the expected stamp and qualifier with checker and version; an "if weakened" witness that refutes its own proposition; statement hashes; seams | GATE-claims, GATE-stamps |
| Audit anchor | Class, sound twin, flawed variant, typed evidence, a key from a real tool run, a dated and sourced "based on" card, no exploit code | GATE-audit, GATE-audit-blind |
| Erosion | Both endpoints, a forecast item and a remedy card | GATE-erosions |
| Drawer | Always open; deferred drawers carry the "deferred" tag, the reason and a neutral trigger | GATE-lessons, GATE-links |

### 11.2 Learner-zero

The owner is the course's first learner. Agents draft stage N+1 while the owner studies stage N, and nothing unreviewed is hidden: it is labeled "draft: first-learner pass pending" until learner-zero has studied it and the owner has reviewed it (BRIEF §5.1). An embargo was rejected because it would block the owner exactly when the course is needed. Learner-zero's logged item times, stage times and stuck-protocol fires replace the plan's estimates after each wave, and GATE-budget recomputes from them. Learner-zero's numbers are labeled "descriptive, learner-zero only", because the author is not a first-time learner (decision 35).

### 11.3 Agents draft, the owner reviews

**Model assignment** (decision 24). Opus drafts architecture, hard content, proofs, correctness-critical checkers and adversarial reviews; Sonnet drafts scaffolding, well-specified UI, transforms and tests from specs. Every grader, untrusted-input parser, stamp deriver, verdict parser, reference checker and release gate is an Opus task. Of the 109 tasks, 65 are Opus and 44 Sonnet.

**Review is the scarce resource.** Every task carries an estimate of owner review hours [D]: about 1.5 h per core lesson, 0.5 h per bridge, 2–3 h per lab, 0.3 h per audit anchor, 0.25 h per drawer, and 0.5–1.5 h per spike or infrastructure decision. Logged review time replaces the rubric after each wave.

**The review checklist** is short and the same for every artifact: the invariants I1–I10; every tool number tagged; every pedagogical claim graded; glossary terms only and no internal names; no lock copy, no loss framing, no counters; "your system" wherever the learner's product appears; no private-design content. Agents cannot approve their own drafts, and an agent's assertion inside a draft is treated like any other agent claim: quoted, unstamped, and checked.

### 11.4 The runs registry

A tool fact moves through five steps (spine §9.5):

1. **Record.** A task runs the tool and writes `runs/<RUN-id>.json` with engine, version, binary SHA-256, image, argv, input, input SHA-256, budget, outputs and the recording time. W0-S11 imported 37 executed runs from `research/`, and the W0 tasks and the W0 integration recorded 37 more; 101 run IDs remain to record, one of them superseded, and each of the others is owned by a named task (for example W1-T12 for S1, W2-T10 for S2–S3).
2. **Cite.** Copy, keys and artboards cite `{{run:RUN-id}}`. GATE-numbers fails on any untagged tool number, verdict, flag or version.
3. **Resolve.** GATE-runs fails a release, and fails the fast lane for any content not labeled draft, on a reference that does not resolve. Every content task depends on the task that records its runs.
4. **Re-run.** A tool bump re-runs everything and opens a reviewable diff.
5. **Publish the change.** A diff becomes a change card in Today ("N things you learned have changed", with the struck line, the new line, the source and two retrieval items) and an EROSION entry on the course's own assurance page. Errata flag "re-check" and never deduct.

Production twins follow the same path: their SHAs live in {{run:RUN-twin-pins}} with a 60-day time to live, refreshed by the wave that authors each stage.

### 11.5 Verify gates in the authoring pipeline

A content change moves through the gates in a fixed order (spine §11.2). **On every merge,** the fast lane runs in under 5 minutes and blocks: GATE-numbers, GATE-facts and GATE-links on every sentence and ID; GATE-lessons, GATE-kc, GATE-items and GATE-calls on lessons, items and authored cells; GATE-claims, GATE-stamps and GATE-codes on claim templates; GATE-erosions on seams and erosions; GATE-privacy and GATE-guardrails on everything that ships. A draft may merge with unresolved `{{run:}}` references; content not labeled draft may not (GATE-runs' fast resolution check). **Every night,** the heavy lane re-runs specimens on their engines, labs against their templates and solutions, conformance between each instrument and its authoritative engine, Goal Replay against the pinned toolchain, and accessibility; a red night downgrades the claims it touches to "unverified since <date>" until it is green again. **At release,** GATE-release checks that models, proofs, differential tests and runs are up to date. The owner reviews only content that is already green, so review hours are spent on judgment, not on mechanics.

### 11.6 Editions and the release gate

An edition pins its toolchains: edition 1 pins Lean 4.35.x [X RUN-lean-ledger] and PostgreSQL 18.6 [X RUN-pg-anomalies], and re-records the isolation catalog after PostgreSQL 19 reaches general availability (OD-12; W6-T07). GATE-labs also runs monthly against the newest stable Lean, so a toolchain change arrives as a reviewed diff, not a surprise. A release requires GATE-release: models, proofs, differential tests and runs up to date, and the nightly lane green, from a clean clone (W6 exit).

---

## 12. Waves W0–W6

The task-level list, with sizes, models, dependencies, acceptance and review hours, lives in [TRACKER.md](TRACKER.md) and [tracker/tasks.yaml](../tracker/tasks.yaml). Spine §13 is its source: the tracker keeps all 109 tasks under their IDs, splits the largest into agent-sized children, adds the work no §13 task owns, and reconciles its review hours with §13's. This section gives each wave's goal, scope, deliverables, exit criteria, risks and owner review load.

**Rules for every wave** (spine §13).

- **Start.** A wave starts when the previous wave's gates are green and the owner's review queue is under 10 hours (OD-7). The queue is the sum of the review estimates of finished tasks not yet reviewed.
- **Size.** S is at most 3 agent-days, M at most 2 weeks, L at most 6 weeks.
- **Acceptance** is always a CI gate or a recorded run, never prose. Every task names what it implements, and GATE-links fails if any mechanic, instrument or screen in the spine's catalogs is owned by no task.
- **Facts.** Every content task depends on the task that records its runs (GATE-runs).
- **Spikes** each leave a decision record with a fallback.
- **Access.** Every wave exit from W1 to W5 includes a manual screen-reader pass on the wave's new screens, with notes filed.
- **Drafts** carry "draft: first-learner pass pending" until learner-zero has studied them and the owner has reviewed them.

| Wave | Goal | Tasks (S/M/L · opus/sonnet) | Owner review | Weeks at 2.5 h/week | Learner-zero study the exit needs | Erosions shipped |
|---|---|---|---|---|---|---|
| W0 | Spikes and foundations | 20 (13/7/0 · 7/13) | 13.75 h | 5.5 | none | — |
| W1 | Project 00 slice | 20 (1/16/3 · 12/8) | 29.75 h | 11.9 | S1: 5.3–9.4 h | — |
| W2 | Proof | 18 (5/9/4 · 11/7) | 39.75 h | 15.9 | S1–S2 signed off: 20.9–37.8 h | ER-6 |
| W3 | Obligations and Time | 15 (2/9/4 · 10/5) | 33.25 h | 13.3 | none at the exit (S3–S4 studied meanwhile) | ER-2, ER-7 |
| W4 | Correspondence and Secrecy | 15 (1/9/5 · 11/4) | 32.25 h | 12.9 | none at the exit | ER-1, ER-3, ER-9 |
| W5 | Effects, Preservation and Assembly | 13 (1/7/5 · 11/2) | 34 h | 13.6 | the whole arc through S10 | ER-4, ER-5, ER-8, ER-10, ER-11, ER-12 |
| W6 | Launch hardening | 8 (2/6/0 · 3/5) | 10 h | 4.0 | none | — |

Review hours include about 1 hour per wave for the screen-reader pass in W1–W5.

### W0 — Spikes and foundations

**Goal.** Retire the tool risks, lay the evidence substrate, and fix the keep/kill rules before any learner data exists.

**Scope.** Thirteen spikes and seven foundation tasks. No learner-facing content.

**Deliverables.**

| Spike | Question | Run | Fallback if it fails |
|---|---|---|---|
| W0-S01 | Does the instrument origin work on its own custom subdomain? | RUN-origin-subdomain | Another static host for the instrument origin [D]; I6 is never relaxed, and features that parse untrusted input wait |
| W0-S02 | How does Pyodide-Z3 behave on real phones: load time, first-load size, memory, `rlimit` timing, cache persistence? | RUN-phone-pyodide | Recorded runs with ids and pocket checkers carry phone sessions |
| W0-S03 | Does Z3 `Fixedpoint` give relations equal to Soufflé's? | RUN-fixedpoint-equal | A TypeScript evaluator differential-tested against Soufflé |
| W0-S04 | Does Spectacle cover the S5 and S8 specs, local `EXTENDS` and state pairs, fast enough? | RUN-spectacle-s5s8 | Authored TLC graphs in the Theater carry any spec Spectacle cannot [D] |
| W0-S05 | How does TLC's JSON represent a liveness lasso? | RUN-tlc-lasso-json | Import from TLC's text trace, the 1.7.4 path [X RUN-tlc-doublespend] [D] |
| W0-S06 | What do the sandbox and `--paranoid` do on CI runners, Docker Desktop and Codespaces? | RUN-bwrap-lanes | The sandbox is recorded as on, off or failed and never required; macOS and Windows learners use the devcontainer |
| W0-S07 | Does Lean's experimental `vcgen` work on a custom `Cmd`? | RUN-vcgen-cmd | The production twin stays dated and experimental, shown on the transfer contract [X RUN-lean-vcgen] |
| W0-S08 | Does row-level security work in PGlite, and how large is the first load? | RUN-pglite-rls, RUN-pglite-0511 | S7.L4's row-level security runs on PostgreSQL 18.6 [X RUN-pg-anomalies] on the Bench only |
| W0-S09 | Which isolation-catalog rows still need PostgreSQL 18.6 runs? | RUN-pg-catalog | Unrun rows stay out of copy; the 23505 and 23P01 retry rule stays a [D] policy [X RUN-pg-catalog] |
| W0-S10 | Can Goal Replay be generated deterministically from `$/lean/plainGoal`, with a diff on a simulated bump? | RUN-replay-gen | Strips limited to recorded `#guard_msgs` outputs, still regenerated by GATE-replay [D] |
| W0-S13 | Does TLC's trace-module method validate an implementation's NDJSON trace on the pinned 1.8.0 jar's own modules, and what does it report for an accepted, a rejected and a partial trace? | RUN-tlc-tracemodule | If a piece of the rolling build breaks: the highest line counter from TLC's state listing, or a pinned CommunityModules jar for `Json` [D] |

- **The evidence substrate:** W0-S11 publishes `receipt@1`, creates `runs/`, imports the 37 executed runs, and re-runs RUN-lean-wasm, RUN-lean-plaingoal, RUN-lean-bv-decide and RUN-lean-vcgen with their outputs committed; W0-T02 creates the single JSON Schema with TypeScript and Python generation; W0-T03 generates the ID registry from the spine for GATE-links.
- **The platform:** W0-S12 vendors kernelspace's infrastructure at a pinned SHA and scaffolds the site, recording RUN-scaffold and the tool-version runs; W0-T04 sets up the fast, nightly and release lanes (RUN-ci-fastlane); W0-T05 ships the devcontainer, `statespace doctor` and a Codespaces prebuild (RUN-doctor-devcontainer).
- **Governance:** W0-T01 makes GATE-privacy green with the review JSONs absent; W0-T06 builds GATE-budget over the stage plans; W0-T07 commits the keep/kill rules with their SHA-256 in RUN-keepkill-rules (§14).

**Exit.** Every spike has a recorded run and a decision record. The fast lane runs in under 5 minutes (RUN-ci-fastlane). GATE-numbers fails on a planted untagged number, and GATE-runs on an unresolved run reference. GATE-privacy is green. The keep/kill rules are committed and hashed before the first learner-zero event (RUN-keepkill-rules).

**Risks.** A spike fails with no fallback that keeps an invariant: the invariant wins and the feature waits. W0 drifts into content: nothing learner-facing ships in W0. The keep/kill rules slip: W1 cannot record learner-zero events until the hash exists.

**Owner review.** 13.75 h, about 5.5 weeks at 2.5 h/week. Spike and infrastructure decisions are the heaviest items (W0-S04, W0-S06, W0-S09 and W0-S12 at 1 h; W0-S11 and W0-T07 at 1.5 h).

### W1 — Project 00 slice

**Goal.** Boot, S1 and LAB-1 on the full loop, so that the first weekend works end to end.

**Scope.** Boot; S1.L1–S1.L5; LAB-1 with `uv run` and no devcontainer; the grader core (GEN-negate-it, GEN-find-the-witness, GEN-call-it, GEN-spot-the-gap, GEN-which-stamp); KC graph v0 with all 105 KCs; Today, the Keep block and *Set your week*; the event log; settings and export; claims, stamps and specimens; pocket checkers; eight audit anchors with twins; the agent kit, `llms.txt` and phone layouts.

**Deliverables.**

- **Learner surfaces:** the app shell, navigation and service worker (W1-T02); Boot (W1-T09); the S1 lessons (W1-T10); drawers D-01–D-06 and D-13 (W1-T11); Today, the Keep block and *Set your week* (W1-T08); Call It and Mirror v0 (W1-T07); settings with export, merge-import and undo (W1-T20).
- **Grading:** the KC graph (W1-T04); the generator framework and first five families, with every authored `unsat` cross-checked by cvc5 (W1-T05); the INS-z3 cell with the download loader and a recorded fallback (W1-T06); pocket checkers (W1-T19).
- **Evidence and claims:** stamps, strip and tokens (W1-T01); the event log and provenance (W1-T03); receipt import and claim minting (W1-T14); claim cards and GATE-claims (W1-T15); the specimen cabinet (W1-T16); the eleven S1 runs (W1-T12).
- **Labs, agents and judgment:** LAB-1 and `statespace check` for Z3 (W1-T13); the agent kit, `llms.txt` and phone layouts (W1-T18); Audit Desk v1 with AUD-1.1–AUD-1.3 and variants, plus AUD-2.1–AUD-2.4 and AUD-5.3 keyed only by executed runs (W1-T17).

**Exit.** Learner-zero finishes Project 00, without the hint ladders and Prove-it, which ship in W2 (W2-T06, W2-T11), with at least two claims and two kept specimens. The Boot timing gate passes, and learner-zero's Boot time is recorded as descriptive (RUN-lz-boot-w1). Blind strategies stay within chance + 2 SD. Learner-zero's median Today is at most 12 minutes (RUN-lz-today-w1, descriptive). Axe shows 0 serious issues and the screen-reader pass is filed. Every S1 tool number is a run reference that resolves. Every S1 authored `unsat` is cross-checked with cvc5. The hook blocks a scripted agent edit.

**Risks.**
- The grader core is the most correctness-critical code in the course. All graders are Opus tasks, and GATE-calls compares native and Pyodide Z3 on every authored call.
- Generators can leak keys through structure. Blind-strategy CI runs from the first item.
- "Kept" needs a re-find at least 7 days after mounting, so the exit cannot close in the week LAB-1 finishes [D].
- Boot's 4-minute target meets real phone load times; W0-S02 sets the timing budget that GATE-bundle enforces.

**Owner review.** 29.75 h, about 12 weeks. The S1 lessons (4.5 h), the KC graph (3 h), the generator framework (2.5 h) and the Audit Desk (2.5 h) dominate. Learner-zero studies S1, 5.3–9.4 hours.

### W2 — Proof

**Goal.** S2 and S3 with statement integrity: nothing an agent writes can change what is being proved.

**Scope.** The Lean lane; challenge packs; generated Goal Replay; hint ladders; the self-explanation unit; LAB-2; LAB-3 with goldens, the IR and the Lane A interpreter; GEN-spec-it, GEN-proof-structure and GEN-defend; Proof Blocks; the Defence engine with its retake rule; welcome-back, test-out and placement.

**Deliverables.**

- **The Lean lane:** `statespace check` for Lean, reproducing the SP-2.4–SP-2.8 verdicts (W2-T01); the LAB-2 challenge pack and template (W2-T02); the Goal Replay generator and UI (W2-T03); the stuck protocol and parked goals (W2-T14).
- **Semantics:** the Mini-Plinth reference semantics with kernel-checked goldens (W2-T07); the IR schema, TypeScript interpreter and Lane A host (W2-T08).
- **Content:** the S2 lessons (W2-T04); the self-explanation unit, adapted from the booklet's text without a request to its authors (W2-T05, OD-10); the S3 lessons and LAB-3 with its capstone stages, shipping ER-6 (W2-T09); the eighteen S2–S3 runs (W2-T10); anchors AUD-3.1–AUD-3.2 and variants of AUD-2.1–AUD-2.4 (W2-T13).
- **The learning engine:** hint ladders on every check of LAB-1–LAB-3 (W2-T06); three generator families and Prove-it (W2-T11); the Defence engine, sign-off and retake (W2-T12); the notes composer and learner-zero's sign-off record (W2-T15); welcome-back, re-entry, test-out and placement (W2-T16); refutation cards and sure-and-wrong returns (W2-T17); Proof Blocks (W2-T18).

**Exit.** CI shows comparator rejecting a weakened statement and a redefined function, and kernel replay rejecting `skipKernelTC`. GATE-replay passes on a toolchain bump. Learner-zero signs off S1–S2 (RUN-lz-signoff-w2). ER-6 ships (GATE-erosions). The screen-reader pass is filed.

**Risks.**
- **The Lean valley.** The exit needs learner-zero's S2 sign-off: 20.9–37.8 hours of S1–S2 study, plus three spaced sessions. Order the wave so S2's content (W2-T01–W2-T04, W2-T10–W2-T12) lands first [D].
- A Lean release mid-wave. The edition pin holds; GATE-replay and the monthly newest-stable run turn the change into a reviewed diff.
- Learner-owned semantics that cannot be checked by kernel-checked goldens fall back to a statement check stamped "statement check: weak" (BRIEF §4.3).
- This is the heaviest review wave, at 39.75 h.

**Owner review.** 39.75 h, about 16 weeks. The S2 lessons (10.25 h) and the S3 lessons with LAB-3 (10.5 h) are over half of it.

### W3 — Obligations and Time

**Goal.** S4 and S5: obligations derived by hand and checked by machine, then concurrency and liveness played by hand on real state graphs.

**Scope.** The Derivation Board; GEN-wp-it, GEN-cti-or-bug and the CTI workbench; LAB-4 with its miscompile stage and the cvc5 cross-check; the TLC lane; the Theater on TLC state graphs; Spectacle with its minimap; the lasso validator; GEN-trace-allowed and GEN-lasso-or-not; LAB-5; the claim graph with seams and erosion forecasts; the Lean keep-alive; Clearinghouse v0; change cards.

**Deliverables.**

- **S4:** the Derivation Board (W3-T01); GEN-wp-it, GEN-cti-or-bug and the CTI workbench (W3-T02); the S4 lessons (W3-T03); LAB-4, including LAB-4.c7's broken and fixed builds (W3-T04).
- **S5:** the TLC lane with pinned jars and argv on every receipt (W3-T05); the Theater (W3-T06); Spectacle and its minimap (W3-T08); the lasso validator (W3-T09); GEN-trace-allowed and GEN-lasso-or-not (W3-T10); the S5 lessons and LAB-5 (W3-T11).
- **Cross-cutting:** the nineteen S4–S5 runs (W3-T07); the claim graph, seams and erosion forecasts, shipping ER-2 and ER-7 with a replay of both paths (W3-T12); anchors AUD-4.1–AUD-4.3, AUD-5.1, AUD-5.2, AUD-5.4 and AUD-5.3's variants, plus the Lean keep-alive (W3-T13); Clearinghouse v0 with naive and reference baselines (W3-T14); change cards (W3-T15).

**Exit.** Spectacle equals TLC on every authored spec. The lasso validator agrees with TLC on its fixtures. ER-2 and ER-7 ship. The Derivation Board works keyboard-only. The Clearinghouse's first incidents pass GATE-audit-blind, with baselines recorded. The screen-reader pass is filed.

**Risks.**
- TLC 1.8.0 is a rolling pre-release. The jar is pinned by SHA-256, and CI also runs 1.7.4 [X RUN-tlc-jars].
- Spectacle may not cover every operator (W0-S04); authored TLC graphs carry what it cannot.
- CTI-versus-bug items are the subtlest graded content: Opus authors them, and GATE-items requires at least four CTI items interleaved through S9.
- The world must stay thin; [WORLD.md](WORLD.md) fixes its scope before W3-T14 starts.

**Owner review.** 33.25 h, about 13 weeks. Learner-zero studies S3 and S4 during the wave.

### W4 — Correspondence and Secrecy

**Goal.** S6 and S7 on measured PostgreSQL: compiled commands compared with the semantics, and access-control and information-flow claims checked.

**Scope.** `statespace isorun`; nightly PostgreSQL specimens; the history checker; PGlite; GEN-anomaly-id; LAB-6; the Datalog engine pair; the paired-state evaluator; GEN-leaks-to-observer; the row-level-security differential; LAB-7 with revocation; the dated-incidents filter; Clearinghouse plug-ins; spec duels.

**Deliverables.**

- **S6:** `statespace isorun`, gated on upstream isolationtester specs (W4-T01, RUN-isorun-upstream); nightly PostgreSQL specimens (W4-T02); the history viewer and serializability checker (W4-T03); the PGlite instrument (W4-T04); GEN-anomaly-id and the S6 lessons (W4-T05); LAB-6 with the reference compiler and reference R(S, D) (W4-T06).
- **S7:** the Datalog pair (W4-T07); the paired-state evaluator and GEN-leaks-to-observer (W4-T08); the S7 lessons and LAB-7 (W4-T09).
- **Cross-cutting:** the twenty-two S6–S7 runs (W4-T10); dated incidents in the specimen cabinet (W4-T11); ER-1, ER-3 and ER-9 with drawer D-30 (W4-T12); anchors AUD-6.1–AUD-6.3, AUD-7.1 and AUD-7.2, with the sibling prerequisite cards D-11 and D-21 (W4-T13); Clearinghouse plug-ins for the learner's compiler and for users, teams and documents (W4-T14); spec duels by URL (W4-T15).

**Exit.** Nightly PostgreSQL 18.6 asserts 22003, 40001, 40P01 and write skew at REPEATABLE READ [X RUN-pg-anomalies, RUN-pg-claims]. The checker classifies the history fixture set. Tab Datalog equals Soufflé. ER-1, ER-3 and ER-9 ship. The screen-reader pass is filed.

**Risks.**
- Concurrency tests that sleep are flaky; `isorun` detects lock waits instead, and must reproduce upstream outputs.
- The history checker's search is bounded, so its results are [T] and it can show anomalies present, never absent; copy and stamps say so.
- PGlite's row-level security (W0-S08) decides S7.L4's lane; the Bench path works either way.
- Spec duels take untrusted input through URL fragments: only the instrument origin parses them, and the fragment never leaves the device (GATE-bundle).

**Owner review.** 32.25 h, about 13 weeks. The S6 lessons (8.25 h) and the S7 lessons with LAB-7 (10 h) dominate.

### W5 — Effects, Preservation and Assembly

**Goal.** S8–S10 and the published report: effects modeled and simulated, a compiler step proved, and the Core assembled.

**Scope.** The simulator and trace validation; LAB-8 with its liveness stage; S9 with the HOL-IMP warm-up; LAB-9; LAB-10; report export; the assurance page; the release gate; `statespace audit`; the private overlay; the Clearinghouse's external provider.

**Deliverables.**

- **S8:** the sim instrument, `statespace trace validate` and `statespace sim` (W5-T01); the S8 lessons and LAB-8 (W5-T02).
- **S9:** the stack-machine warm-up, S9 challenge packs and the reference translation validator (W5-T04); the S9 lessons and LAB-9 with two mini-Defences (W5-T05).
- **S10 and the record:** report export from the claim graph, `report@1` (W5-T06); LAB-10 and the demonstration recorder (W5-T07); the assurance page with the course's own erosion log and the SEAM-13 claim (W5-T08); the release gate (W5-T09).
- **Cross-cutting:** the S8–S9 runs (W5-T03); ER-4, ER-5, ER-8, ER-10 and ER-11 (W5-T10); anchors AUD-8.1–AUD-9.2 and `statespace audit` (W5-T11); the private overlay and learner-zero's report (W5-T12); the Clearinghouse provider plug-in and ER-12 (W5-T13).

**Exit.** Trace validation rejects the ack-before-durable mutant. Learner-zero publishes a report. GATE-release is green. ER-4, ER-5, ER-8, ER-10, ER-11 and ER-12 ship. The screen-reader pass is filed.

**Risks.**
- **S9 is the second Lean valley:** six weekend proof stages. Mitigations are per-lemma stages, ladders, parked goals, and CL-9.2 minted after LAB-9.6 as "PROVED modulo the remaining cases", so claims keep flowing.
- **The exit waits for learner-zero's whole arc.** Review alone needs about 14 weeks, but the exit lands about 69–80 weeks after W1 starts (§13).
- The private overlay must leak nothing; GATE-privacy checks that nothing from it reaches the repo.
- ER-12 depends on the oldest-open-seam rule across both paths; W5-T13's acceptance replays both.

**Owner review.** 34 h, about 14 weeks. The S9 lessons with LAB-9 (10.5 h) and the S8 lessons with LAB-8 (8.5 h) dominate.

### W6 — Launch hardening

**Goal.** Edition 1.

**Scope and deliverables.** A full accessibility pass with NVDA and VoiceOver notes (W6-T01); performance budgets on Today and Boot (W6-T02); glyphs and fonts (W6-T03); a publication-hygiene audit with every vendored directory licensed (W6-T04); README, CONTRIBUTING and edition notes (W6-T05); a cue-ablation and blind-strategy sweep over every item (W6-T06); a re-record of all runs and the PostgreSQL 19 check (W6-T07, OD-12); and a final adversarial review against I1–I10, whose every finding closes by a gate or content change or is logged as an erratum on SCR-changes (W6-T08).

**Exit.** GATE-release green from a clean clone; axe with 0 serious issues on every screen, plus full NVDA and VoiceOver passes; GATE-privacy green; edition pins recorded.

**Risks.** The final review finds an invariant breach late; errata are the honest outlet, never a silent fix. The PostgreSQL re-record depends on an external release date, so W6-T07 records whatever it finds.

**Owner review.** 10 h, about 4 weeks.

---

## 13. Capacity plan and cut order

### 13.1 Two clocks

The owner's week holds 6–10 hours of study as learner-zero plus 2–3 hours of review (OD-7). The course therefore runs on two clocks. The **review clock** paces the build: about 193 hours of owner review at 2.5 hours a week. The **study clock** paces the exits that need a learner: W1 needs S1 studied, W2 needs S1–S2 signed off, and W5 needs the whole arc. Agent time is not the constraint: 109 tasks (25 S, 63 M, 21 L) can be drafted far faster than they can be reviewed or studied (BRIEF §1.2).

| Wave | Owner review (h) | Weeks at 2.5 h/week | Learner-zero study the exit needs | Implied duration [D] |
|---|---|---|---|---|
| W0 | 13.75 | 5.5 | none | about 5.5 weeks |
| W1 | 29.75 | 11.9 | S1: 5.3–9.4 h (1.1–2.0 weeks) | about 12 weeks |
| W2 | 39.75 | 15.9 | S1–S2 signed off: 20.9–37.8 h (4.4–8.0 weeks) | about 16 weeks |
| W3 | 33.25 | 13.3 | none at the exit | about 13 weeks |
| W4 | 32.25 | 12.9 | none at the exit | about 13 weeks |
| W5 | 34 | 13.6 | the arc through S10: 107–197 h, about 43–80 weeks from W1's start at 6 h/week | review needs about 14 weeks; the exit waits for learner-zero, about 69–80 weeks after W1 starts |
| W6 | 10 | 4.0 | none | about 4 weeks |
| **Total** | **about 193** | **about 77** | | **about 18–21 months from W0's start** |

### 13.2 The queue gate and overruns

A wave starts only when the owner's review queue is under 10 hours. When review runs behind, the order of response is fixed: first stop starting new tasks; then, if a wave's review total outruns its window, apply the cut order below before the queue gate is ever relaxed (spine §13). Two consecutive weeks over the review envelope are the early signal to look at the cut list [dr2 §3.2]. After each wave, logged review time replaces the rubric's estimates, and OD-7's envelope is revisited at W1's exit (BRIEF §8).

### 13.3 The cut order

When scope must give, it gives in this order (BRIEF §7.10; spine §14):

1. Derivation Board polish (the board itself stays; outcome (c) needs it).
2. Audit-accuracy breakdowns by class and type (the overall score stays).
3. The Alloy lab (LAB-7.8 and the D-16 drawer's lab work).
4. The drawn home path (the list mirror stays).
5. The deferred-drawer interface (the drawers stay as plain cards).
6. Bridge lessons beyond 30, folded into reading cards in a fixed order. At 0.5 hours of review per bridge, the twenty folds save about 10 hours [D].
7. Erosions lacking both endpoints.
8. Audit anchors beyond two per stage.

**Cut eligibility** (spine §14; decision 31). A bridge may be folded only if it carries no threshold KC; is not a seam's planting lesson or an erosion's cashing lesson; carries no outcome-core KC; is not the only lesson of a roadmap completion test or of a mechanic; and every KC and claim template it carries moves, with one added graded item, to a named receiving lesson that is itself not cut. Twenty-one bridges qualify. The fold order is S4.L5, S2.L1, S7.L1, S5.L2, S3.L8, S9.L3, S5.L1, S4.L1, S8.L2, S5.L4, S2.L3, S7.L2, S2.L6, S3.L3, S2.L8, S8.L4, S6.L5, S2.L4, S9.L1, S9.L2, with S5.L9 as the spare; the receiving lessons are listed in spine §14.

**Never cut:** any invariant I1–I10; a core lesson; a threshold KC's teaching; a seam or erosion endpoint that has its partner; the only lesson of a completion test; the Defence; the runs registry and its gates.

---

## 14. Measurement and n-of-1 decision rules

### 14.1 What is measured, and where

Everything is measured on the learner's device and derived at read time from the event log and the lab repo (I2). Nothing is sent anywhere unless the learner exports it.

- **Learning:** VRK₃₀, with its rate per active study-month; signed-off and settled KCs; each outcome family's criterion status (§3.3); audit accuracy, with per-class precision and recall once n ≥ 10; calibration bias and hit rate per band, with bias's interval taken from accuracy's Wilson interval with the imputed confidence held constant (spine §8.5).
- **Dose and rhythm:** graded opportunities per KC against the ≥8-in-60-days target; Today session lengths; the Keep block's actual minutes against the plan; "met in k of the last 12 weeks".
- **Effort and friction:** logged seconds per item and minutes per lab stage; stuck-protocol fires and parked goals; the share of work credited as assisted; hint rungs used.
- **Production:** claims and specimens per week from the lab repo, against the cadence target.

### 14.2 How results are reported

Proportions carry Wilson intervals; balanced accuracy carries an interval assembled from the two class rates' 97.5% Wilson intervals (spine §6); nothing is diagnosed below its minimum n: at least 20 calls in a band, with an interval wholly outside the printed band (spine §8.5), and n ≥ 10 per audit class. There is no Brier headline, no population figure and no comparison across learners. Learner-zero's figures are labeled "descriptive, learner-zero only". Boot's first-success time for first-time learners comes from at least five naive testers who export their event logs voluntarily (RUN-boot-firstsuccess); design partners are optional and gate only an "external learners" label (OD-9). The assurance page states that the measurements describe one learner and support no causal claim.

### 14.3 What the course measures about itself

The course's own validity is measured in CI, not on learners: blind strategies (always reject, always accept, always pick the longest, last-is-sound, topic-is-class) must stay within chance + 2 SD (GATE-items, GATE-audit-blind); at least 30% of calls must be genuine surprises; generators must render identically in three engines (GATE-generators); every instrument must conform to its authoritative engine (GATE-conformance); and a cue-ablation sweep runs over every item before launch (W6-T06). A red nightly run downgrades the claims it touches to "unverified since <date>".

### 14.4 Keep/kill rules, fixed in advance

One learner cannot power a randomized trial, so mechanics are kept or killed by rules written before any data exists (V2-32; BRIEF §3.5). W0-T07 commits the rules file, with its SHA-256 recorded in RUN-keepkill-rules before the first W1 learner-zero event; GATE-schema fails if the file's hash changes. Each rule states its comparison, its arms, how KCs or weeks are allocated, the outcome, the minimum n before reading, the threshold, the decision date and the default.

| Comparison (BRIEF §3.5) | Allocation | Outcome | Default if underpowered or inconclusive |
|---|---|---|---|
| Feedback layer open versus collapsed, in expert KCs | Within-learner: eligible KCs randomized to an arm by seed | 30-day fresh-seed accuracy, `own · unseen` | Collapsed in expert KCs, as M-layered-feedback ships [tetzlaff25] |
| Proof Blocks with distractors versus none | Within-learner, over S2, S3 and S9 proof-structure KCs | the same | 1–2 distractors, as M-proof-blocks ships [poulsen23] |
| Counterexample versus class hint | Within-learner, over witness-producing KCs; arms defined so that neither is counterexample-only feedback, which BRIEF §3.3 rules out | the same | The class hint, as M-class-hint ships [dantoni15] |
| Reserve weeks versus none | Alternating 12-week windows, declared in advance | the weekly rhythm and 30-day accuracy | Two reserve weeks in every 12, as M-set-your-week ships |

The allocations and defaults above are this plan's proposal to W0-T07 [D]; the minimum n, thresholds and decision dates are W0-T07's to fix, and they are fixed before the first event. The rules are read descriptively. When a comparison cannot reach its minimum n by its decision date, the shipped default stands, and the file says so.

### 14.5 Recalibration after every wave

After each wave: logged item and stage times replace the budget estimates, and GATE-budget recomputes every stage; the Keep block is recomputed from logged seconds per item; the review rubric is recalibrated from logged review time; and the calendar in §13 is re-projected. A stage whose logged times break its roadmap bound triggers the displacement rule (V2-09): an addition names what it displaces, or the cut order applies.

---

## 15. Risks

| Risk | Early signal | Mitigation |
|---|---|---|
| Owner review hours saturate | the queue passes 10 h, or two weeks run over the envelope | The queue gate (OD-7); review estimates on every task; learner-zero; the cut order before any relaxation |
| Plans prove optimistic | logged stage times exceed their ranges | Logged times replace estimates each wave; GATE-budget recomputes and checks the Keep load; arcs shown as ranges |
| The Lean valleys (S2–S3, S9) | stuck-protocol fires and parked goals cluster | Per-lemma stages; 45-minute weekend proof stages; ladders; parked goals as [A]; fading; the keep-alive |
| The builder's path breaks a dependency | GATE-kc fails a path | GATE-kc checks every published path against the hard edges and lab artifacts; declared substitutes (§4.5) |
| Tool churn (pre-release TLC, Spectacle's moving head, the next Lean and PostgreSQL releases) | a nightly diff or a conformance failure | Pins by SHA; GATE-runs diffs; conformance gates; edition pins (OD-12) |
| Phones run Pyodide poorly | W0-S02's measurements | Recorded runs with ids; pocket checkers |
| No sandbox outside Linux | W0-S06's verdicts | The sandbox is recorded, never required; the devcontainer |
| Browser storage eviction | the 7-day backup nudge goes unanswered | The lab repo is the record; export bundles; merge-import with undo |
| Invented numbers return | GATE-numbers or GATE-facts fails | The runs registry; GATE-runs' resolution check; the deny-list of known-false sentences |
| Private-content leakage | GATE-privacy fails | Review JSONs excluded; "your system"; the overlay stays local |
| Agents do the work | a gap between practice and unseen-seed results | Provenance; unseen seeds; Prove-it; the Defence; the honor system stated openly (OD-8) |
| Sibling courses unfinished | a bridge link does not resolve | Self-contained prerequisite cards (D-11, D-12, D-21) |
| One learner | — | Keep/kill rules fixed in advance (W0-T07); descriptive labels; naive testers for Boot |
| A pinned third-party host disappears | a link-out fails | Pinned fallbacks, such as D-08 for the Natural Number Game; link-outs never carry credit |
| The companion documents drift from the spine | GATE-links fails on a document | One registry generated from the spine (W0-T03); this plan defers to the spine |

---

## 16. Decisions

The owner decisions and the spine's decision log are kept in [DECISIONS.md](DECISIONS.md). The brief's recommendations were adopted as defaults, and the owner reviewed them on 2026-10-25.

| # | Decision | Where it lands |
|---|---|---|
| OD-1 | The course is named statespace | §0 of the spine |
| OD-2 | Keep "Mini-Plinth" and `miniplinth check`; the lab template is `statespace-lab` | S3, S4; the Bench CLI |
| OD-3 | Roadmap order by default; an optional, topologically repaired builder's path | §4.5 |
| OD-4 | Third-party tools only as disclosed, uncredited link-outs; no embedded CheerpJ | §8.4 |
| OD-5 | A separate instrument origin on its own custom subdomain | §8.5; W0-S01 |
| OD-6 | No download asks first or warns; the loader shows each engine's size (changed 2026-10-25) | M-consent; GATE-bundle |
| OD-7 | Owner review envelope of 2–3 h/week; a wave starts only when the queue is under 10 h | §12, §13 |
| OD-8 | Honor-system provenance, stated openly on the assurance page | §5.1; SCR-assurance |
| OD-9 | An optional human reviewer; design partners gate only an "external learners" label | §5.4, §14.2 |
| OD-10 | Adapt the booklet's text under the CC BY-SA 4.0 its PDF states, without asking its authors (changed 2026-10-25) | S2.L0; W2-T05 |
| OD-11 | No private-design content; the review JSONs are excluded | §2.4; GATE-privacy |
| OD-12 | Edition 1 pins Lean 4.35.x [X RUN-lean-ledger] and PostgreSQL 18.6 [X RUN-pg-anomalies]; re-record after PostgreSQL 19 is generally available | §11.6; W6-T07 |
| OD-13 | Sigstore attestations off by default | §7.5 |
| OD-14 | The world's working name is "the Clearinghouse"; prefer fewer nouns | §6.4, §9 |
| OD-15 | 10 labs with 83 planned and 8 stretch stages (proposed by the spine; accepted 2026-10-25) | §7.2 |
| OD-16 | Code under MIT and content under CC BY 4.0, for statespace and kernelspace (decided 2026-10-25) | §2.4; GATE-privacy |

**The spine's decisions that shape this plan most** (spine §12): lessons numbered as the brief numbers them, with S1.L1 and S1.L2 swapped to follow the `requires` DAG (items 1, 33); capstone steps as `[step]` IDs outside lesson counts (2); three tier swaps that keep 26 core and 50 bridge while putting authoring effort on the roadmap's projects (3); the computed Keep block (25) and the keep-alive outside Today (26); the Defence's four-case Part C and its minimum part size, each part at least 60% with at least four items in every credited part (27); inductive invariants as [M] unless a parametric proof earns [P] (29); explicit cut eligibility (31); fewer nouns (32); LAB-1 without the devcontainer (34); learner-zero numbers as descriptive (35); and owner time planned per task (36).

---

## Appendix A. The change list, V2-01–V2-33, mapped to where each is implemented

Severity follows BRIEF §5: C critical, M major, m minor. "Spine" names sections and catalog IDs in [the spine](spine/SPINE.md); tasks are in [TRACKER.md](TRACKER.md).

| Change | Sev | What changes | Spine | Tasks | Documents |
|---|---|---|---|---|---|
| V2-01 Statement pins, challenge packs, agent kit | C | Agents prove, the learner states; receipts parse every verdict | I7; LAB-2; §9.4, §9.6; GATE-claims, GATE-guardrails | W1-T18, W2-T01, W2-T02 | §7.5, §7.7; ASSESSMENT.md |
| V2-02 Credit only from machine-graded, unassisted work | C | The Defence replaces the viva | I1; §8.1, §8.2, §8.6; M-defence | W2-T12 | §5.1, §6.2; ASSESSMENT.md |
| V2-03 Every tool fact a recorded run | C | `runs/`; corrected specimens | I4; §9.5; GATE-numbers, GATE-facts, GATE-runs; SP-2.2, SP-5.2, SP-6.4 | W0-S11 and every run-recording task | §11.4 |
| V2-04 A valid Audit Desk | C | Twins, seeded share, typed evidence, blind gate | §6; GATE-audit, GATE-audit-blind; AUD-4.2 sound; SP-4.4, AUD-1.1 | W1-T17 | §6.3; AUDIT-DESK.md |
| V2-05 Valid calibration; titles-only rail | C | CBM bands, chance printed, first call final | §8.4, §8.5; GATE-items; S1.L1's fresh first call | W1-T07 | §6.2; DESIGN.md |
| V2-06 Retention: KC graph, generators, Today, re-find, VRK₃₀, a Lean thread | C | The learning loop | §4, §4.1, §8.3; M-today, M-re-find, M-lean-keep-alive; §2.3 | W1-T04, W1-T05, W1-T08, W3-T13 | §3.2, §5 |
| V2-07 Stage 6 on measured PostgreSQL | C | The compilation pattern as the lesson variable | §3.6; INS-bench-pg | W4-T01–W4-T06 | curriculum S6 |
| V2-08 A truthful 64-bit story | C | The six-row encoding table; ER-1 as a refusal | S1.L5; CL-1.5; ER-1; D-30 | W1-T10, W4-T12 | curriculum S1, S6 |
| V2-09 A budget that governs additions | C | Computed budgets; displacement; review hours | §3.0, §3.11; GATE-budget; §13 | W0-T06 | §4.4, §13 |
| V2-10 Stamps that mean what they say | C | Words plus codes; verdict → stamp table | §8.7, §8.8; GATE-stamps, GATE-codes | W1-T01 | §6.2; ASSESSMENT.md, DESIGN.md |
| V2-11 Invariant versus inductive invariant | M | A three-way verdict; [M] versus [P] for inductive checks | S4.L4, S4.L6, S5.L9; M-cti-workbench; CL-4.4, CL-4.5, CL-5.4 | W3-T02, W3-T03, W3-T11 | curriculum S4, S5 |
| V2-12 Z3 on Pyodide on its own origin; cvc5 cross-checks | M | No npm shim; `rlimit` budgets | INS-z3; OD-5; GATE-calls | W0-S01, W0-S02, W1-T05, W1-T06 | §8 |
| V2-13 One TLA+ semantics | M | TLC graphs, Spectacle, the lasso validator | INS-theater, INS-spectacle, INS-lasso; GATE-conformance | W3-T06, W3-T08, W3-T09 | §8; curriculum S5 |
| V2-14 Lean core-only, generated, staged, with help | M | Goal Replay; ladders; fading; error museum | S2; INS-goal-replay; GATE-replay; D-07, D-08 | W2-T03, W2-T06 | curriculum S2 |
| V2-15 Two grading lanes, one IR | M | Lane A wasm; Lane B receipts; `IR@1` | §9.3; INS-lane-a, INS-receipt | W1-T14, W2-T08 | §7.3; ARCHITECTURE.md |
| V2-16 Resource operations in the AST | M | The roadmap's move, hold, capture and release as typed operations | S3.L2; KC-3.resource-postings; LAB-3.2 | W2-T09 | curriculum S3 |
| V2-17 One home for evidence | M | The lab repo is the record | §11.1; SCR-settings | W1-T20 | §7.6; ARCHITECTURE.md |
| V2-18 Gate pipeline; at most six block types at first | M | Fast, nightly and release lanes; vendoring | §11.2; GATE-conformance; GATE-lessons | W0-S12, W0-T04 | §10 |
| V2-19 Isolation and phones | M | Instrument origin; downloads; phone flow | OD-5; I6; M-consent; §9.3 | W0-S01, W0-S02 | §5.6, §8.5 |
| V2-20 Project 00 first; nothing locks | M | Boot; drawers; test-out; navigation | S1.L0; D-01–D-06; M-test-out | W1-T09, W1-T11, W2-T16 | §3.1, §5.2 |
| V2-21 Accessibility and notation | M | WCAG gate; keyboard board; JuliaMono | §10.2; GATE-a11y, GATE-glyphs; SCR-derivation | W3-T01, W6-T01, W6-T03 | §9; DESIGN.md |
| V2-22 The Bench as the roadmap names it | M | Devcontainer; `statespace doctor`; Rocq notation named | §9.2; D-15, D-10 | W0-T05 | §7.4 |
| V2-23 Stage 7 within budget; RLS core | M | Datalog pair; self-composition; Alloy as a drawer | §3.7; S7.L4; D-16 | W4-T07–W4-T09 | curriculum S7 |
| V2-24 Stage 8 | M | Untrusted replies; provider horizon; trace validation | S8.L4, S8.L6, S8.L7; SEAM-12; LAB-8.3 | W5-T01, W5-T02 | curriculum S8 |
| V2-25 A thin persistent world | M | The Clearinghouse | M-docket; SCR-clearinghouse; RUN-docket-baselines | W3-T14, W4-T14, W5-T13 | §6.4; WORLD.md |
| V2-26 Practice that produces | M | Pick → fix → write; fading claim cards; forecasts; notes | §8.4; M-claim-card, M-specimen-cabinet, M-erosion-forecast, M-notes, M-class-hint | W1-T15, W1-T16, W2-T15, W3-T12 | §5, §6.2 |
| V2-27 Dated incidents ("Hall of Records") | M | A filter in the specimen cabinet | M-hall-of-records; SCR-specimens | W4-T11 | §9; DESIGN.md |
| V2-28 Your own design in a private overlay | M | Local-only re-stamping of your system | M-overlay; §3.10 | W5-T12 | §2.4, §4.8 |
| V2-29 Stage 9 restructured | M | Stack-machine warm-up; translation validation first; aborts observable | S9.L1, S9.L4, S9.L5; LAB-9.1, LAB-9.3 | W5-T04, W5-T05 | curriculum S9 |
| V2-30 Deferred triggers match real obligations | m | D-30 at ER-1; D-32 at ER-7 | §3.12; ER-1, ER-7 | W3-T12, W4-T12 | §4.7 |
| V2-31 Siblings: link, don't re-teach | m | Bridge cards with prerequisite cards | M-sibling-bridge; D-11, D-12, D-21 | W4-T13 | §4.7 |
| V2-32 Evidence-tagged mechanics; n = 1 rules | m | Ev and Prec tags; keep/kill rules in W0 | §7; W0-T07 | W0-T07 | §6.1, §14.4 |
| V2-33 Visual cleanup | m | Graphite night; motion only for change | §0 Look; §10.2 | W1-T01 | §9; DESIGN.md |

---

## Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item below ends with its outcome.*

Things in [the spine](spine/SPINE.md) that this plan believes are wrong or underspecified. The plan follows the spine where they conflict; each item needs a spine revision or an owner call.

1. **Revision-log count.** §15 says the first critic pass had "21 findings: C1, M1–M9, m1–m15", but those IDs number 25 (1 + 9 + 15), and the table that follows has 25 rows for that pass. *Revision 3: already resolved in revision 2 (§15 revision 2 paragraph).*
2. **Rounding in §3.11.** The Write column's low total reads 16, but the stage rows sum to 15.45, so the printed column totals (16 + 30 + 33 + 16 + 11 = 106) no longer add up to the printed total of 105. Cosmetic, but GATE-budget recomputes these figures and should match the table. *Revision 3: already resolved (§3.11; GATE-budget); this plan's totals are refreshed from §3.11 and §13.*
3. **Boot's tier is undeclared.** §3.1 gives S1.L0 the tier "boot", while the ID conventions list only `[core]`, `[bridge]` and `[step]`. GATE-lessons and GATE-links need "boot" declared, or Boot needs one of the declared tiers with an exclusion like `[step]`'s. *Revision 3: already resolved (ID conventions, Lesson row).*
4. **An untagged cvc5 version.** GATE-calls, W1-T05 and CL-4.2's qualifier state "cvc5 1.4.2" as a fact, while §9.2 records that the executed run's wheel reported `1.4.2-modified` and that the Bench binary is recorded in [X RUN-scaffold]. By the spine's own tag rule, those mentions should cite [X RUN-scaffold]. *Revision 3: applied (§5.2 CL-4.2, §9.2 INS-bench-smt, §11.2 GATE-calls, §13 W1-T05).*
5. **Intervals for balanced accuracy and bias.** §2.2 and §6 attach "Wilson intervals" to balanced accuracy, and §8.5 and M-mirror can be read as attaching them to bias too. A Wilson interval is defined for one binomial proportion; balanced accuracy averages two rates, and bias is a difference. The spine should name the interval method for both (per-class precision, recall and hit rates can keep Wilson intervals). This plan wrote "an interval" for both. *Revision 3: already resolved (§2.2, §6 Scoring, §8.5, M-mirror); this plan now takes the spine's wording.*
6. **One keep/kill comparison collides with an anti-pattern.** W0-T07 takes BRIEF §3.5's "counterexample vs class hint". If one arm is counterexample-only feedback, it is an anti-pattern under BRIEF §3.3 and contradicts M-class-hint. W0-T07 should define both arms so that neither is counterexample-only; §14.4 states that constraint. *Revision 3: already resolved (§13 W0-T07; `content/governance/keepkill-rules.yaml`).*
7. **The 6 h/week Keep block versus its contents.** Today alone at 3–5 sessions of 10–12 minutes is 30–60 minutes; with 1–3 Clearinghouse incidents, the weekly review, the retro's share and the keep-alive's share, the upper ends exceed the planned 45–75 minutes. The figure implicitly assumes about three Today sessions and one incident a week at 6 h/week; the spine should state the assumed counts, or let SCR-week compute them from the learner's settings. This plan's §4.4 states the assumed counts, and SCR-week computes the Keep block from the learner's chosen counts, lowering the week's stage-work figure instead of the Keep block when it runs over. *Revision 3: applied (§3.0 Budget method).*
8. **Drawers without owners.** Twenty-three drawers (D-07–D-10, D-12, D-14, D-15, D-17–D-20, D-22, D-23 and D-31–D-40) are named by no task in §13, so their review time, about 0.25 h each and roughly 5.75 h in all, sits outside the wave totals. GATE-links' ownership rule covers §7, §9.1 and §10.1 only; it should cover §3.12 too, or each stage's lesson task should list its drawers. *Revision 3: applied (§13 rules, W4-T09, W4-T12, W4-T13).*
9. **Layout and file names.** §11.1's layout lacked `curriculum/` and `tracker/`, which this documentation set uses; it now names both, with the zero-padded per-stage file names this plan links, `curriculum/S{nn}-{name}.md` (for example `curriculum/S01-counterexample.md`). *Revision 3: applied (§11.1 layout).*
10. **"Settled" needs an anchor date.** §8.6 defines settled as a fresh probe correct "at least 30 days later" without saying later than what. VRK₃₀ (spine §2.3) anchors to first learning; the settled derivation should name its anchor (sign-off or first learning) so that the read-time derivation is deterministic. *Revision 3: already resolved (§8.6, §4.1, §0 term 15, §12 item 47); this plan now takes the wording.*
11. **M-notes cites the wrong study.** §4.1's writing row and §7's M-notes row cite [kobayashi19], which measures learning by teaching (preparing g = 0.35, teaching after preparing g = 0.56) and supports M-explain-back. The writing-to-learn evidence is [bangertdrowns04]: 0.22 in a random-effects re-analysis, larger with metacognitive prompts (EVIDENCE.md, row 47 and its spine issue 3). This plan cites [bangertdrowns04] in its own §3.4 and §5.4 and keeps the grade, A (small); the spine should change the key. *Revision 3: already resolved (§4.1 Writing row, §7 M-notes).*

