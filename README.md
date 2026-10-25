# statespace

Learn formal methods by building a tiny checked application language, and learn to say exactly what each proof, model check and test establishes.

**Status, as of 2026-10-24: design complete; implementation starts at wave W0.** Nothing here runs yet. This page describes the design. The [master plan](docs/PLAN.md) explains it, the [tracker](docs/TRACKER.md) lists the work, and the [curriculum](curriculum/) specifies each stage. Tool facts on this page carry run tags, explained under [How decisions are made](#how-decisions-are-made).

## What it is

statespace is an interactive course in formal methods with no servers behind it. It follows a public, project-first roadmap, [research/context/roadmap.md](research/context/roadmap.md), whose method fits in one line: learn the theory by building a tiny checked application language. Over ten stages you go from a counterexample found with Z3 to a small ledger proved in Lean, then invent that language, Mini-Plinth, and build its tools: its semantics in Lean, a verification-condition generator (`miniplinth check`) that emits SMT obligations, TLA+ models of its concurrency and its external effects, a compiler to PostgreSQL with a refinement relation, access-control and information-flow checks, and a compiler transformation with a preservation proof. The capstone assembles them into the Core. Mini-Plinth and the Core organize the learning; they set no deadline and commit you to no fixed architecture.

The roadmap sets the scope, and its end-state is the course's list of outcomes. In the roadmap's words, by completion you should be able to:

> (a) state a property precisely, (b) distinguish safety, liveness, and information flow, (c) derive and audit proof obligations, (d) understand proofs over language semantics, (e) model adversarial concurrent executions, (f) establish or test a refinement relation to Postgres, and (g) decide which correctness claims are justified before trusting agent-written code.

Outcome (g) runs through every stage. A green check guarantees something only about a proposition, under assumptions, of a model, and the costly failure is a true theorem about the wrong thing. So every result you produce is a claim that says what was checked, under which assumptions, by which tool at which version, and what was left unchecked.

The name pairs with kernelspace and tablespace, and it names the object every claim here is about: the set of states S and the step S → S′.

### Who it is for

A working backend engineer: fluent in Rust, at home with systems, new to formal notation, and studying alone for 6–10 hours a week over many months while building their own system with coding agents. kernelspace graduates are the reference learner. A "From kernelspace" placement credits only what a kernelspace Evidence Pack actually evidences, and never logic, induction, TLA+ or isolation. Help is set per topic: expert treatment where you already know the ground (Rust, PostgreSQL practice, concurrency failures) and novice treatment where you do not (proof, semantics, weakest preconditions, temporal notation, information flow, simulation), because the help that serves a novice gets in an expert's way (expertise reversal, evidence grade A).

The plan is 105–194 hours of stage work [D]. With a 1.6 planning factor, two reserve weeks in every twelve, and the weekly Keep block taken off the top (4.75 h of stage work in a 6 h week, 8.25 h in a 10 h week; spine §3.11), that is about 42–78 weeks at 6 hours a week, or 25–45 weeks at 10 [D], inside the roadmap's 9–18 months. The course shows the arc as a range and never says "behind". Today sessions, lessons, the Audit Desk and claim cards work on a phone; the Bench needs a laptop.

### The successor to kernelspace

statespace inherits kernelspace's learning engine and none of its look.

| Kept from kernelspace | Different in statespace |
|---|---|
| Only graded evidence moves status, recorded in an append-only evidence log with provenance weights | The currency is a justified claim, not performance under a service-level objective |
| A knowledge-component graph, seeded generators, the Today session, *Set your week*, and VRK₃₀ as the north star | Answer keys come from real checkers at grade time: Z3, TLC, Spectacle, the reference interpreter, Lean's `lake comparator` |
| Staged labs with a 2-minute first win, hint ladders behind an explanation gate, agent guardrails in every lab zip | Agents may prove; you state. Statements are pinned, and an agent's claim is never stamped |
| Errata that flag "re-check" and never deduct; validity checks in CI, including blind-strategy gates | Every tool number is a recorded run, and the course erodes in public when a tool changes |
| Nothing locks; no points for clicks | A drafting-table look: vellum and graphite, title blocks filled from runs, stamps as words plus codes |

Siblings are linked, not re-taught: tablespace's concurrency and durability material at S6 and S8, byzantine's consistency material and deterministic harness at S7 and S8, and a light kernelspace strand at S6. Each bridge carries a self-contained prerequisite card, so no sibling is required.

## What makes it different

Among the courseware the landscape review examined, none measures calibration, schedules erosion, or scores the review of agent work on both precision and recall ([digest-landscape.md](research/synthesis/digest-landscape.md) §5). statespace is designed around all three, and it applies its rules to itself: its graders print their bounds, its assessments carry stamps, and its own claims sit on a public assurance page that records when they erode.

### Checkers grade fresh items

Every graded answer is checked by a real engine, or against a key that one computed: Z3, TLC, Spectacle, `lake comparator`, the reference interpreter or cargo. Items come from generators (14 families, 47 templates) that draw a fresh seed each time, so review means the same move on a new instance, not a remembered answer, and the key is computed by an engine at grade time. A witness is graded by checking it, never by matching a stored model. Objectives that ask you to explain or name something resolve to checker-graded forms; free prose is practice, never credit.

No language model grades work or writes items at run time. Language models help only at authoring time, proposing prequestions, adversarial cases and hint wording, and a checker's witness certifies every flaw they propose. Oracles are "unseen, not secret": a static site cannot hide them, and the course says so.

On the first run of an authored cell, and on every generated item, you make a call first: a verdict and a confidence (*guess*, *think so* or *sure*), with the item's chance level printed. Only the first call counts. Calibration appears privately in the Mirror, with intervals, and nothing is diagnosed below about 20–30 calls per band.

### Claims with honest stamps

Every guarantee you produce is a claim card in the roadmap's six parts (proposition, assumptions, model, checking method, implementation correspondence, and the counterexample when an assumption is weakened), plus a requirement row. Its stamp is a word, a bracketed code and a qualifier that must be present:

| Stamp | Code | The qualifier states |
|---|---|---|
| PROVED | [P] | the checker and its version |
| MODEL-CHECKED | [M] | the constants, and whether exploration was complete or partial |
| TESTED | [T] | n and the generator's statistics |
| ENFORCED | [E] | where the check runs |
| CONFIGURED | [C] | the source, and when it was read back |
| ASSUMED | [A] | why |
| UNKNOWN | [?] | the reason |
| NOT COVERED | [N] | what lies outside the model |
| REFUTED | [R] | the witness length |

So "the guarded transfer never overdraws the sender" (CL-1.1) is stamped PROVED [P] · Z3 5.3.1 unsat [X RUN-z3-starter] · uncertified · rlimit ‹N› (recorded on the learner's receipt), with the open defeater "encoding unverified": `unsat` speaks for every input of exactly that encoding, if the solver is sound. Each card draws a three-segment strip (proposition-of-model, correspondence, requirement-fit), and requirement-fit is never [P], because no checker reads a requirement. S2.L10, "Every checker agrees; none read the requirement", makes the point by hand: `lake comparator --paranoid` runs six checkers [X RUN-lean-comparator] over a true theorem that misses the intent, and you exhibit a scenario the theorem permits and the requirement forbids.

Agents may prove; you state. Lean labs ship challenge packs whose statements are pinned and hashed, and `lake comparator` rejects a weakened statement or a redefined function [X RUN-lean-comparator]. Receipts parse every verdict and never trust an exit code alone: a `debug.skipKernelTC` proof of `False` builds with exit code 0, and only kernel replay rejects it [X RUN-lean-skipkernel]. An agent's claim appears as quoted, unreviewed text and is never stamped. Claims live in your own lab repository.

Some assumptions are planted on purpose as seams. Later stages crack twelve of them; each erosion opens with a forecast, in which you restate the claim from memory and call which segment cracks. Three seams are tested and hold, because not every assumption breaks.

### Specimens

A specimen is a counterexample kept beside its fix, labeled from its run: what it violates, why, whether it is minimal, what cures it, where it was found, and the tool version. It counts as kept once you re-find the same move on a fresh variant at least 7 days later. The course has 68, among them:

- **SP-1.4, the guard protects the sender, not the recipient.** Under signed 64-bit bit-vectors with a positive amount, the guarded sender stays non-negative while the recipient's balance wraps [X RUN-z3-bv64].
- **SP-5.1, the double spend.** Two reads, then two writes, and 160 is spent from 100 [X RUN-tlc-doublespend].
- **SP-6.4, the step the database refuses.** PostgreSQL 18.6 rejects with SQLSTATE 22003 a step the model takes [X RUN-pg-anomalies].
- **SP-4.5, the solver was wrong.** On the two inputs of Z3 issue #11179, both satisfiable, Z3 5.3.0 answers `unsat` and 5.3.1 answers `unknown` [X RUN-z3-11179].

Several specimens are toy models of dated incidents, re-run in CI and cited to their sources.

### The Audit Desk

The Audit Desk trains outcome (g) directly. You judge whether a claim is justified in five steps: call the statement alone; reveal the diff; write "This proves: ___"; choose the kind of gap from thirteen classes, with "none: sound" always available and nothing preselected; and anchor typed evidence to lines, such as a witness or trace, the offending declaration, mismatched identifiers, a pair of states, or a scenario the theorem permits and the requirement forbids.

Cases come in matched sound and flawed pairs. Each session draws its share of sound cases from a seed between 30% and 60%, so rejecting everything cannot win, and CI fails if a blind strategy beats chance by more than two standard deviations. Scores are per-class precision and recall plus balanced accuracy, with intervals; per-class figures appear only once a class has n ≥ 10. Every key is set by a real tool run, and every case cites the dated incident it is based on, without exploit code. Many are failures of AI-assisted verification:

| Case | Kind of gap | The flawed claim | Based on |
|---|---|---|---|
| AUD-1.1 | G2, vacuous premise | "unsat, therefore safe", over contradictory premises | PutnamBench issue #361: a refactor made premises inconsistent (2026-10-12) |
| AUD-2.2 | G6a, hidden trust: an escape hatch | a lemma closed by `sorry` or a custom axiom, with a green build [X RUN-lean-axioms] | AlphaVerus agents used `assume(false)` (arXiv 2412.06176) |
| AUD-2.3 | G6c, hidden trust: a kernel bypass | a proof built under `debug.skipKernelTC` [X RUN-lean-skipkernel] | an old Lean REPL skipped the kernel and passed 12 wrong miniF2F proofs (arXiv 2507.14722) |
| AUD-5.1 | G3, wrong property kind | "deadlock-free, so it terminates", filed as an invariant | SysMoBench: model-written specs violated 41.9% of liveness properties and 8.3% of safety properties (arXiv 2509.23130) |
| AUD-6.1 | G11, test presented as proof | n differential runs stamped PROVED | CIDR 2026: about 32% of LLM SQL rewrites changed results |

Late in the course, `statespace audit` turns your own lab repository into cases.

### The Defence

A stage is signed off through the Defence, a four-part assessment taken untimed over at least two sessions within a week of the lab.

| Part | What you do | Graded by |
|---|---|---|
| A. Probes | 10–12 items on unseen seeds from at least three generator families, with the agent closed and a call on each | the checkers |
| B. Defend | predict what 4–6 seeded mutations do to your own lab artifact, then run them | Lean, TLC, Z3 or cargo |
| C. Audit | four cases, at least one of them sound, each with typed evidence | the Audit Desk's keys |
| D. Explain-back | a two-minute spoken explanation and a three-idea self-check | required, never credited |

Signed off means at least 75% across Parts A–C and at least 60% in each (or at most one miss in a part of five or fewer items), shown with a Wilson interval, plus fresh items answered correctly in at least three spaced sessions. Settled means a fresh probe answered correctly at least 30 days later. A failed part is retaken on fresh seeds after at least three days, and nothing locks in the meantime. Nobody grades their own work, and no language model grades anyone's. The course stamps its own assessment too: a passed Defence is [T] (n unseen items), never PROVED competence.

### Nothing locks

Lessons, labs, drawers and audit cases are always open. Status is computed from graded evidence and never used as a gate. There are no points for clicks, no leaderboards, no daily counters, no overdue counts and no loss framing. Today is a 10–12-minute session, 3–5 times a week, inside a weekly Keep block: due items on fresh seeds, at most one audit case, re-finds, and cards for anything that has changed. After a week away it opens with a welcome-back set, not a backlog. *Set your week* plans at the pessimistic end, with a range target, two Bench blocks and the Keep block, and reads "met in k of the last 12 weeks", with a 7-day repair and two reserve weeks. Errata flag "re-check" and never deduct.

### Zero servers

The site is static: no accounts, no telemetry and no grading server. Real engines run in the browser, on a separate instrument origin with its own subdomain. The spikes already ran Z3 on Pyodide without cross-origin isolation in Chromium, Firefox and WebKit, including from a separate origin that cannot read the main site's storage [X RUN-z3-starter-pyodide, RUN-browser-origin]. Spectacle, for TLA+, matched TLC's state counts on the double-spend models in the same three engines [X RUN-spectacle]. PGlite, a WebAssembly build that reports PostgreSQL 18.6, runs its sessions one at a time on a single connection [X RUN-pglite], so concurrency is replayed from histories recorded on the Bench. Downloads above 5 MB ask first. The authoritative tools run on your own machine, the Bench, and return receipts that the browser imports: Lean 4.35.0 [X RUN-lean-ledger], TLC from `tla2tools` 1.8.0 [X RUN-tlc-jars], and PostgreSQL 18.6 with real concurrent sessions [X RUN-pg-anomalies]. Every stamp says whether it was re-checked here, reported from your machine, or self-assessed.

The browser keeps only practice events, with export and a backup reminder. Claims, specimens and receipts live in your lab repository. Your own agent can tutor you through `llms.txt`, per-lesson Markdown and the agent kit in every lab zip, and the site sees nothing. An optional private overlay re-checks your system's guarantees locally; nothing from it leaves your machine or enters a repository.

### What it does not promise

| Promised | Not promised |
|---|---|
| Every tool number, verdict, flag and version is a recorded run you can re-execute | Effect multiples: the median effect in education trials is about 0.10 SD ([Kraft, 2020](https://doi.org/10.3102/0013189X20912798)), and nothing here adds up to more |
| Stamps that say what a check established, with its checker, bound or n | Far transfer: the course trains near transfer to your system |
| Nothing locks; your data stays on your device and in your lab repository | Anti-cheat: provenance is self-declared and calibrates rather than polices, and the course says so (OD-8) |
| A published report that separates proved, model-checked, tested, enforced, configured, assumed and not covered | That "signed off" means proved competence: a passed Defence is [T] |
| Errata that flag "re-check" and never deduct | A fixed duration: the arc is a range |

The course's own measurements describe one learner (n = 1) and support no causal claim.

## The ten stages

| Stage | The roadmap's question | New tool | Lessons (core + bridge) | Lab | Roadmap time | Planned hours [D] |
|---|---|---|---|---|---|---|
| [S1 Counterexample](curriculum/S01-counterexample.md) | Find a bug mathematically | Z3Py: Z3 5.3.1 [X RUN-z3-starter] | Boot + 5 (2 + 3) | LAB-1, Project 00: the counterexample lab | 2–4 focused sessions | 5.3–9.4 |
| [S2 Proof](curriculum/S02-proof.md) | Prove a small program correct | Lean 4: toolchain 4.35.0 [X RUN-lean-ledger] | 11 (4 + 7) | LAB-2, the verified ledger | 3–6 weeks | 15.6–28.4 |
| [S3 Semantics](curriculum/S03-semantics.md) | Invent Mini-Plinth as a language | — | 9 (3 + 6) | LAB-3, mini-plinth-core, goldens and the JSON IR | 4–8 weeks | 11.9–23.7 |
| [S4 Obligations](curriculum/S04-obligations.md) | Build a verification-condition generator | — | 9 (3 + 6) | LAB-4, `miniplinth check` | 3–6 weeks | 8.8–15.6 |
| [S5 Time](curriculum/S05-time.md) | Explore concurrency and liveness | TLA+ with TLC: `tla2tools` 1.8.0, a pre-release pinned by SHA-256 [X RUN-tlc-jars] | 9 (3 + 6) | LAB-5, the holds spec | 3–6 weeks | 10.5–17.6 |
| [S6 Correspondence](curriculum/S06-correspondence.md) | Connect semantics to PostgreSQL | PostgreSQL 18.6 [X RUN-pg-anomalies] | 9 (3 + 6) | LAB-6, pg-refinement | 4–8 weeks | 9.2–15.9 |
| [S7 Secrecy](curriculum/S07-secrecy.md) | Prove access-control and information-flow claims | Soufflé {{run:RUN-souffle-version}} | 8 (3 + 5) | LAB-7, authz-flow | 4–8 weeks | 9.7–17.0 |
| [S8 Effects](curriculum/S08-effects.md) | Model external effects and crash recovery | — | 7 (2 + 5) | LAB-8, effects-sim | 3–6 weeks | 7.4–13.2 |
| [S9 Preservation](curriculum/S09-preservation.md) | Verify a compiler transformation | — | 9 (3 + 6) | LAB-9, compiler, preservation proof and SQL validator | 6–10 weeks | 15.3–33.0 |
| [S10 Assembly](curriculum/S10-assembly.md) | Assemble the Core | — | 7 capstone steps, 5 of them built in earlier labs | LAB-10, Core assembly | open; final assembly at most 6 weeks | 11.4–19.7 |
| **All ten** | | 5 new tools, at most one per stage | 76 (26 + 50) plus Boot | 10 labs: 83 planned stages plus 8 optional (OD-15, proposed) | 9–18 months | 105–194 |

Planned hours cover stage work: reading, lessons, lab stages, writing and the Defence. The weekly Keep block is planned separately. Core lessons are fully authored, with 2–4 segments of 12–15 minutes, each built around one instrument run and ending in a graded item. Bridge lessons run to at most 1,000 words, with instrument cells, a graded item and a dated pointer into the roadmap's reading. Lab stages take at most 25 minutes on weekdays and 45 at weekends, starting with a 2-minute win, and every check has a hint ladder behind an explanation gate.

**Each new tool is met first in the browser.** Z3 runs in the tab. Lean arrives as Goal Replay, goal strips generated from real Lean elaboration. TLA+ arrives in the Theater, where you play concurrency by hand on real TLC state graphs. PostgreSQL arrives in PGlite, and Datalog in a browser engine that W0 selects. Weakest preconditions get an instrument of their own, the Derivation Board, where Z3 checks each step. The devcontainer arrives only at S2.

**The first eight minutes.** Boot (S1.L0) runs on a phone. An agent's transfer arrives labeled "safe, 200 tests green". You call whether it is safe for the sender before Z3 runs, read the overdraft witness Z3 returns, watch the corrected guard turn the search `unsat`, and close on the 64-bit recipient wrap of SP-1.4.

**The first weekend** is the roadmap's Project 00: run the Z3Py introduction and the roadmap's starter, find a transfer that drives a balance negative, add the sufficient-funds guard and show the violation becomes `unsat` beside a satisfiable premise witness, break and fix a refund rule, and write a README with the property, assumptions, solver answer, example model and limitations, plus two claim cards prefilled from your receipt. It runs with `uv run` or entirely in the browser.

**The middle.** From S3 on, your components plug into the Clearinghouse, a small persistent world in the roadmap's nouns, run in the browser. Each week it brings 1–3 incidents: agent proposals produced by mutation, sound in a seeded 30–60% share, cases from the gap classes, and erosions fired by your oldest open erodible seam.

**The end** is the roadmap's demonstration. An agent proposes a plausible transfer or authorization command; your checker exhibits a violation or proves a restricted obligation; the corrected command runs on PostgreSQL with systematic tests; and you publish a report, exported from your claim graph, that separates what was proved, model-checked, tested, enforced, configured, assumed and not covered, with tool versions, statement hashes and known limitations. The agent's proposals come from a mutation generator; no language model runs at grade time.

Roadmap order is the default. An optional builder's path takes concurrency first, in an order that keeps every hard prerequisite and lab dependency (spine §3.0). The topics the roadmap defers, such as category theory, advanced dependent types, proof certificates, Kani and Verus, are drawers tagged "deferred": always openable, and surfaced when a real obligation calls for them.

## Status

**Design complete; implementation starts at W0.** A first design, v1, went through two adversarial review rounds, eight lenses in all, which filed 170 findings: its thesis survived and its machinery did not. The v2 design rebuilds that machinery through a redesign brief, four digests, a spine that took two critic passes of its own, and the companion documents listed below. Owner decisions OD-1–OD-14 are adopted as defaults awaiting the owner's review; OD-15, the lab shape, is proposed. Edition 1 pins Lean 4.35.x [X RUN-lean-ledger] and PostgreSQL 18.6 [X RUN-pg-anomalies] (OD-12).

Nothing is built yet: there is no site, no runnable lab and no runs registry. What exists is the design and the research behind it, including the logs of the runs executed so far.

| Wave | Builds | Exit, in brief |
|---|---|---|
| **W0 Spikes and foundations** (next) | twelve spikes that retire tool risks (W0-S01–W0-S12); the receipt schema and the runs registry; the ID registry; CI lanes; the devcontainer; keep/kill rules fixed before any data exists | every spike leaves a recorded run and a decision record; the fast lane runs in under 5 minutes; GATE-numbers trips on a planted untagged number |
| W1 Project 00 slice | Boot, S1 and LAB-1 on the full loop | learner-zero finishes Project 00 with at least two claims and two kept specimens |
| W2 Proof | S2–S3, challenge packs, Goal Replay, the Defence | CI shows comparator rejecting a weakened statement and kernel replay rejecting a bypassed proof; learner-zero signs off S1–S2 |
| W3 Obligations and Time | S4–S5, the Derivation Board, the Theater, a first Clearinghouse | Spectacle agrees with TLC on every authored spec |
| W4 Correspondence and Secrecy | S6–S7 on measured PostgreSQL | nightly runs reproduce the PostgreSQL specimens; the browser's Datalog agrees with Soufflé |
| W5 Effects, Preservation and Assembly | S8–S10, the report export, the assurance page, the release gate | learner-zero publishes a report; GATE-release is green |
| W6 Launch hardening | accessibility, performance, docs, a final adversarial review | edition 1, with GATE-release green from a clean clone |

The waves hold 108 tasks. Owner review hours, not agent time, set the calendar: about 189 hours, or about 17–20 months from the start of W0 [D]. There is no contribution process yet; CONTRIBUTING arrives with W6-T05.

**Read next.**

- [docs/PLAN.md](docs/PLAN.md): the master plan. Why the course has this shape, how it is built and reviewed, and how anyone can tell whether it works.
- [docs/TRACKER.md](docs/TRACKER.md): every task, with its size, dependencies, acceptance and review hours.
- [curriculum/](curriculum/): one authoring spec per stage, covering lessons, labs, the Defence, seams, budgets and the runs each stage needs.
- [labs/README.md](labs/README.md): how the labs work, from setting up your machine to where each check is graded and what to do when you are stuck.
- [docs/spine/SPINE.md](docs/spine/SPINE.md): the canonical index. Every ID used anywhere in the repository comes from it.
- The companion specs: [ASSESSMENT.md](docs/ASSESSMENT.md), [AUDIT-DESK.md](docs/AUDIT-DESK.md), [WORLD.md](docs/WORLD.md), [DESIGN.md](docs/DESIGN.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [DECISIONS.md](docs/DECISIONS.md). Two reference pages: [EVIDENCE.md](docs/EVIDENCE.md) (the learning-science basis) and [LANDSCAPE.md](docs/LANDSCAPE.md) (the landscape and version pins).
- [research/](research/): the roadmap, the executed spikes and run logs, the research reports, the adversarial reviews, the brief and the digests.

## Repository layout

What is here now:

```
README.md              this page
curriculum/            one authoring spec per stage, S01-counterexample.md to S10-assembly.md
docs/
  spine/SPINE.md       the canonical index: every ID, catalog and count
  PLAN.md              the master plan
  TRACKER.md           the task checklist: spine §13's 108 tasks, refined and extended
  ASSESSMENT.md        evidence, provenance, generators, calls, the Defence, stamps
  AUDIT-DESK.md        the gap classes, cases, variants and scoring
  WORLD.md             the Clearinghouse, its plug-ins and its incidents
  DESIGN.md            the design system and screen specs
  ARCHITECTURE.md      origins, data, receipts, the Bench, CI gates, security
  EVIDENCE.md          the learning-science basis: graded evidence, doses, keep/kill rules
  LANDSCAPE.md         the landscape and version pins: the dated state of the field
  DECISIONS.md         owner decisions and the decision log
  history/v1/          the v1 plan and design, kept as history
tracker/tasks.yaml     the same tasks, as data
labs/                  the statespace-lab manual and agent-kit template, in draft; the lab
                       templates arrive from W1 on, and solutions never enter the repository
design/canvas/         v1 artboards, kept as history; illustrative only, and some
                       figures in them were never produced by any tool
research/
  context/roadmap.md   the roadmap: the course's scope
  spikes/              the first executed spikes: RESULTS.md, scripts and specs
  evidence/            run logs and scripts behind the executed runs
  reports/             ten research reports, each with a verification log
  reviews/             eight adversarial reviews of v1, A1–A8
  synthesis/           the v2 redesign brief and four digests
```

Planned in spine §11.1 and ARCHITECTURE §17.1, and created from W0 on:

```
apps/site/             the static site
apps/instruments/      the instrument origin: the Z3 worker, Spectacle, PGlite, the Datalog
                       engine, the lasso validator, and the host for your Rust compiled to wasm
packages/              pure TypeScript shared by the two apps: no DOM, storage or network
content/stages/        lesson data and per-lesson Markdown; the knowledge-component graph,
                       generators, audit pool, specimens, claim templates and seams
runs/                  the runs registry: one RUN-*.json per recorded run
schemas/               one JSON Schema source for receipts, claims, runs, events and the IR
bench/                 the statespace command-line tool (Python, managed by uv)
scripts/               the CI gates (verify-*)
vendor/kernelspace/    infrastructure vendored from kernelspace at a pinned SHA, with its license
status/                nightly.json: the last nightly run's failed gates and the claims they touch
```

## How decisions are made

### Sources, in order of precedence

1. The roadmap sets scope.
2. Executed runs beat any report.
3. The v2 redesign brief, [research/synthesis/BRIEF.md](research/synthesis/BRIEF.md).
4. The four digests beside it.
5. The research reports and the adversarial reviews.
6. kernelspace, for its learning engine only.
7. The v1 design, for history only.

Where the brief is silent, the spine decides and logs its reason (spine §12). Each companion document lists what it believes the spine gets wrong under "Spine issues", and the spine governs until it changes.

### Every tool fact is a recorded run

v1's mock-ups printed tool numbers that no tool had produced, and executing the first spikes falsified three of v1's claims. So nothing is said about a tool unless a run says it. Copy carries one of these tags:

| Tag | Meaning |
|---|---|
| `[X RUN-id]` | an executed run whose output log is on disk under `research/` |
| `{{run:RUN-id}}` | a run that must be recorded before that sentence ships |
| `[D]` | a design estimate or rationale, never a tool fact |

Figures quoted from the literature, such as those behind the audit cases, carry their source instead.

From W0, `runs/<RUN-id>.json` records each run's engine, version, binary SHA-256, image, argv, input and input hash, budget, outputs and date, and `statespace run <RUN-id>` re-executes a run and diffs its outputs. GATE-numbers fails CI on any untagged tool number, verdict, flag or version, and keeps a deny-list of known-false sentences. GATE-facts checks sentences about tool behavior against their runs. GATE-runs fails a release on any run reference that does not resolve. A tool upgrade re-runs everything and opens a reviewable diff, and when one of the course's own claims erodes, the erosion appears on its public assurance page.

### Teaching methods carry evidence grades

Every learning mechanic is tagged with the strength of its evidence, following the [pedagogy digest](research/synthesis/digest-pedagogy.md):

| Grade | Means |
|---|---|
| A | a meta-analysis or several consistent randomized trials |
| B | one good experiment on a similar task, or a meta-analysis of a distant population |
| C | a small study, a quasi-experiment, correlational or prevalence data, or a preprint |
| D | theory, consensus, design rationale or tool precedent |

For example: spaced retrieval in Today (A), prequestions before a segment (A), interleaving only topics that are easily confused (A), successive relearning behind "signed off" and "settled" (B), Proof Blocks (B), erroneous examples at the Audit Desk (A, with small effects), and the Defence (B− overall; its Part B has face validity only). A mechanic whose principle has outcome evidence is marked "Ev", and one resting on precedent alone is marked "Prec". What the evidence argues against is not built: locks, points for clicks, self-graded or LLM-graded sign-off, items written by a language model at run time, daily counters and loss framing (BRIEF §3.3). The course expects effects of a few tenths of a standard deviation at most, and no copy promises more. One learner cannot power a trial, so the rules for keeping or killing a mechanic are fixed and hashed before the first learner event (W0-T07), and their results are read descriptively.

### Gates and the release gate

Twenty-eight CI gates run in three lanes.

| Lane | What runs | What it blocks |
|---|---|---|
| Fast | every change, in under 5 minutes: run tags, items, generators, the knowledge-component graph, stamps, claims, links, budgets, privacy, lessons, erosions | merges |
| Nightly | the heavy checks: each browser engine against its authoritative engine (Spectacle and TLC, Pyodide Z3 and native Z3, PGlite and PostgreSQL), every specimen, every lab, Goal Replay, accessibility | releases; a red night marks the claims it touches "unverified since" that date |
| Release | GATE-release: models, proofs, differential tests and runs up to date, and the nightly lane green | the release |

The release gate follows [Cedar's practice](https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/) of releasing only when the model, the proofs and the differential tests are up to date.

### Who decides

The owner decides; agents draft. Owner decisions OD-1–OD-15 are recorded with their reasons in [docs/DECISIONS.md](docs/DECISIONS.md). A wave starts only when the previous wave's gates are green and the owner's review queue is under 10 hours (OD-7), and every task's acceptance is a CI gate or a recorded run. The owner also studies each stage as its first learner, learner-zero, while agents draft the next one; unreviewed material is labeled "draft: first-learner pass pending". When review time runs short, the cut order in spine §14 applies before the queue gate is relaxed.

## Credits

- **Scope:** the roadmap in [research/context/roadmap.md](research/context/roadmap.md), including the readings it names, which the course links and never copies.
- **Learning engine:** kernelspace. Its infrastructure is vendored at a pinned SHA under `vendor/kernelspace/`, with its license.
- **Engines and tools:** Z3, cvc5, Lean 4 and `lake comparator` with the checkers it runs, the TLA+ tools and TLC, Spectacle (vendored under its MIT license), Pyodide, PGlite, PostgreSQL and Soufflé; Apalache and Alloy are optional. The runs registry names each by version and hash.
- **Disclosed link-outs**, which never earn credit (OD-4): live.lean-lang.org, the Natural Number Game, TLA+ By Example, Alloy4Fun and TigerBeetle's simulator. Hosted third-party tools appear only as links and are never embedded.
- **Production twins**, upstream systems that met the same problems, shown after your own attempt: TigerBeetle's two-phase transfers, `lake comparator`, Cedar, CCF's trace validation, CompCert, PostgreSQL's isolation tests and Hermitage, among others. Their SHAs are recorded in {{run:RUN-twin-pins}}, with a 60-day time to live.
- **Research:** the studies cited in the brief's source index (§9) and in the digests, and the dated incidents behind every audit case, each cited to its source.
- **Fonts:** Archivo, Source Serif 4 and JuliaMono, self-hosted under the SIL Open Font License, with their license files beside them.

statespace is built by one person, the owner, working with coding agents.

## License

- **Code** is under the [MIT License](LICENSE): the apps, the packages, the scripts and gates, the schemas, the lab templates and checkers, the Bench image, the CI workflows and the configuration.
- **Course content** is under [Creative Commons Attribution 4.0 International](LICENSE-CONTENT) (CC BY 4.0): the stage and lesson text, exercises, items, audit cases, figures, the docs, the curriculum and the research write-ups. Where a file holds both, as lesson data written as code does, its prose and figures are content and the rest is code.
- The owner chose both licenses for statespace and for kernelspace (OD-16).

Third-party material keeps its own terms, and every vendored directory carries its license file, which GATE-privacy checks: `vendor/kernelspace/` (MIT, with the ts-fsrs notice beside it), the TLA+ tools in `bench/image/tla2tools/` (MIT) and Docker's seccomp profiles in `.devcontainer/seccomp/` and `runs/RUN-bwrap-lanes/profiles/` (Apache-2.0). The upstream copies the research spikes ran against are not committed; [research/evidence/THIRD-PARTY.md](research/evidence/THIRD-PARTY.md) lists them with their licenses. If the self-explanation unit in S2.L0 adapts the CC BY-SA self-explanation booklet, the adaptation lives in its own directory under that license (OD-10). The reviewers' raw JSON files stay out of the repository (OD-11); the digests summarize them.
