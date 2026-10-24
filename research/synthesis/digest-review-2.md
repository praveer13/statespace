# Review round 2 digest: lenses A5–A8

*For the v2 lead course architect. Prepared 2026-10-24 UTC (machine clock; the brief's date is 2026-10-20, the lens runs 2026-10-21). Inputs: `review-merged-2.json` (not published), the lens reports in `research/reviews/`, and `research/spikes/RESULTS.md`, whose executed facts win over any lens. Finding-level evidence and URLs are in the JSON; §8 lists what I re-checked.*

**JSON provenance.** I re-transcribed the brief's JSON independently in 12 validated parts. All 86 findings and 32 bold ideas match the copy an earlier run saved, byte for byte (309,739 bytes, sha256 `ca46d4fa…02f79`), so it was re-saved unchanged.

## 0. At a glance

- **86 findings:** A5 feasibility 20, A6 world-class 21, A7 design 24, A8 successor 21. As filed: 16 critical, 51 major, 19 minor.
- **Skeptic verdicts** (u = uphold, m = modify, r = refute, in JSON order): 28 uu, 33 split m/u, 24 mm, 1 ru. Only A7-22 is formally contested; nothing was refuted outright; 57 findings carry a modified recommendation.
- **Severity:** skeptics proposed lowering 17 findings and raising none: A5-F1, A5-F3, A5-F6, A6-F3, A6-F4, A6-F8, A6-F14, A7-01 to A7-05, the guardrail half of A8-02, A8-03, A8-10, A8-12, A8-14.
- **Result:** 22 changes: 6 blocking (A1–A6), 11 major (B1–B11), 5 scoped down (C1–C5). Every finding maps to a change. A6's IDs are bare in the JSON (`F1`…) and written `A6-F1` here.

## 1. Bottom line

1. **Keep the thesis.** All four lenses call v1's core rare and right: six-field claims, qualified stamps, kept specimens, planted seams, Call It, and an Audit Desk scored on precision and recall.
2. **But v1's machinery commits the errors it teaches.** It would mint PROVED from a weakened theorem with the same name, sign off courses on self- or LLM-graded vivas, print invented tool numbers, score "reject everything" above its own mock learner, and measure memory of fixed items rather than judgment. Changes A1–A6 fix exactly this.
3. **Runs have de-risked the architecture.** Z3Py runs in the tab via Pyodide without cross-origin isolation in three engines. Spectacle reproduces TLC's state counts. Core Lean 4.35.0 proves the Stage 2 ledger. `lake comparator` rejects a weakened statement and a redefined `transfer`.
4. **The skeptics' corrections are adopted.** Keep the roadmap's tools (Soufflé, optional Alloy, PLF). Reject embedded WASM Lean, logic-glyph stamps, the masonry-bond map and a full application simulation. Use learner-zero, not author-lag. Never relax container security silently. Partners and experiments stay optional.
5. **The binding constraint is one person's week,** shared by study, course review and work on the learner's own system, so the cut order (B6) is part of the plan.

## 2. Reconciliation with RESULTS.md

| Topic | RESULTS.md (executed 2026-10-20) | Lenses add | Resolution |
|---|---|---|---|
| TLC double spend | Violated: 5 states (4 actions), 11 distinct when found; full space 11 distinct, depth 5 | Default flags stop at "Deadlock reached" (10 distinct, depth 4) in 1.7.4 and 1.8.0; the 11 needs `-deadlock`, which turns deadlock checking off | No conflict. RESULTS.md omits argv, so every TLC number must carry its argv. "212" and "48,112" were invented |
| Z3 in the browser | npm `z3-solver` 5.3.1 needs threads, SharedArrayBuffer and COOP/COEP; its implication says the instrument "needs cross-origin isolation" | Pyodide 314.0.7 with the official 5.3.1 wheel ran the roadmap starter with `crossOriginIsolated=false` in three engines | The executed fact stands. The implication binds only the npm lane, which v2 drops (B1) |
| PostgreSQL 18.6 | A conditional UPDATE at READ COMMITTED loses nothing; read-modify-write spends 160 of 100; write skew commits at REPEATABLE READ; CHECK accepts NULL; WHERE skips NULL rows; overflow raises 22003 | The lenses agree. I ran PGlite 0.5.11 today: PostgreSQL 18.6, overflow raises 22003 | E1 becomes a refusal, not a wrap. C6.2 names its compilation pattern. Both NULL results become Course 06 specimens. The Bench pins PostgreSQL 18.6 |
| Lean | Core Lean 4.35.0 proves the four Stage 2 theorems (`[propext, Quot.sound]`); a buggy pointwise transfer mints on self-transfer (10 → 15, by `decide`) | A Mathlib `Finmap` project measured 7.3 GB | Core Lean only for Courses 02–03. The self-transfer mint is a ready specimen and an unspoiled first Call It |
| Lean size | An implication line estimates "~200 MB" | Measured: a 566 MiB download (3.0 GB unpacked); GitHub's API lists `lean-4.35.0-linux.tar.zst` at 594,481,375 B | **Erratum to an estimate.** State no size that does not come from a run |
| BitVec wrap | Guarded witness B = 9223372036850581504, M = 4194304 | A5's probe used another query and got another witness | Both are valid. Specimens cite their run; grading checks witnesses |

## 3. Changes for v2, ranked

### 3.1 Blocking: settle before authoring content

**A1 · Pin statements: agents prove, the learner states.** Critical. Sources: A5-F3 mm, A6-F1 mm, A8-02 mm, A5-F11 uu, A8-07 um.
- **Challenge packs.** Each Lean lab ships a read-only `Challenge` module (course-owned definitions and statements) and a `comparator.json` whose permitted axioms are taught. `plinth bench check` runs `lake build`, then `lake comparator` (Lean ≥ 4.35.0). In the measured run, comparator accepted the honest proof and rejected a weakened statement and a redefined `transfer`.
- **Sandbox.** Bubblewrap is Linux-only and, under default Docker, failed with the same exit code as a rejection. Receipts therefore record `sandbox: on | off | failed` and are never blocked by it. Relaxed confinement is an opt-in, documented profile, and macOS or Windows users run checks in the Linux Dev Container.
- **Learner-owned semantics** (L3, L9) get a pinned reference evaluator plus kernel-checked goldens, because statement matching cannot catch a redefined evaluator. The fallback, `example : T := Learner.thm` plus `#print axioms`, is stamped "statement-check: weak".
- **Receipt v1** is a published JSON Schema covering statement hashes, argv, exit codes, the comparator verdict, the sandbox state, tool hashes, TLC flags, the Z3 rlimit, and spec hashes. Every stamp names its lane: re-checked here, reported from your machine, or self-assessed.
- **Agents.** Lab zips fork kernelspace's agent kit, with a fail-closed PreToolUse hook that guards challenge files, claim statements, specs and receipts; the site generates `llms.txt`. Agents are welcome except on Prove-it items. Provenance (authored, learner, assisted, agent, unseen) governs credit only, so an agent's proof of a pinned statement is still PROVED. Authored demos never enter the proof-report export.

**A2 · Credit only from machine-graded, unassisted work.** Critical. Sources: A8-01 mu, A6-F5 uu, the examiner halves of A5-F11 and A6-F1, A7-02 um.
- **No BYOK examiner.** Delete it; kernelspace already rejects in-page BYOK and LLM-graded credentials.
- **Signing off.** A stage is signed off when both kinds of item pass in two sessions, reported with Wilson intervals:
  - Prove-it items, unassisted, on unseen seeds;
  - Spec Bench items: the learner writes P, and Z3 checks P⇒R and R⇒P against a reference, returning a distinguishing state. Non-vacuity is mandatory. Oracles are "unseen, not secret", since a static site cannot hide them.
- **Explain-back** is required but uncredited, because the roadmap's completion tests are explanations. An interviewer packet for the learner's own agent counts as assisted.
- **Status.** "Signed off" is a learner state, separate from publication status (B6), and never borrows PROVED's colour.

**A3 · Every tool fact comes from a recorded run; fix the false content now.** Critical as a process. Sources: A5-F2 mu, A6-F3 mm, A8-14 mu, A6-F17 uu, A7-24 uu, A7-07 um, A6-F20 mu.
- **Registry.** `runs/` records engine, version, hash, argv, input hash, budget and outputs; content cites run ids. A tool bump re-runs everything as a drift PR, and affected learner records get a "re-check" flag.
- **Lints.** `verify:numbers` fails on untagged tool numbers, verdicts, flags and versions. `verify:facts` asserts only sentences tagged as tool behaviour. Sat answers are graded by checking witnesses.
- **Fix now:**
  - E1 becomes a refusal: the model takes a step that the database rejects with 22003, an error that must not be retried like 40001. It is reachable only through minting or huge seeded balances; silent wrap stays the BitVec story, with the supply-bound twist in lesson 1.5.
  - C6.2 names read-modify-write versus a conditional UPDATE.
  - Theater numbers come from runs, there is one S1.2 witness, and "minimal" means an Optimize objective.
  - A new Course 05 specimen shows TLC reporting termination as deadlock in hand-written TLA+ (PlusCal adds `Terminating`).
- **Rendering.** One typed registry, with a learner-state fixture, renders lessons and artboards; artboards stay "illustrative" until promoted, and `verify:links` covers the canvas. Tool versions are dated claims with TTLs on a public `/assurance` page.

**A4 · Make the judgment instruments valid.** Critical. Sources: A6-F4 mm, A8-04 um, A7-08 uu, A7-09 mm, A8-05 uu, A7-07 um, A7-10 mu, A7-11 uu, A8-17 um, A6-F18 uu.
- **Base rate.** Only 4 of v1's 32 cases are sound, so "reject everything" scores precision 28/32 and recall 28/28. Draw each session's sound share from a seed (30–60%), and score per-class precision and recall plus balanced accuracy, with Wilson intervals.
- **Evidence.** A rejection needs an acceptable class (keys are multi-label) and typed, checkable evidence: a witness or trace, the offending declaration (hidden trust), the mismatched identifiers (drift), paired states (observer), or a scenario the theorem permits and the requirement forbids. Statement substitution becomes a subclass of class 8, and trusted-base bugs a subclass of class 6.
- **Flow.** The learner calls the statement alone, reveals the diff, writes "This proves: ___", picks a gap class (no default; "none: sound" is an option), and anchors the evidence to lines. Re-run witnesses are optional. Scores appear afterwards, as counts.
- **Honesty.** Agent claims appear as quoted UNREVIEWED text, never stamped. No teasers, no unlocking. CI proves each case's surface claims. `verify:audit-blind` scores the always-reject, always-accept, last-is-sound and topic-is-class strategies, and blocks once the mutation-fed pool nears 100 cases.
- **Call It.** The rail shows titles only, and specimen drawers stay unlabelled until earned. At least 30% of calls are genuine surprises, no verdict exceeds 60% per course, and every option carries a "why" and a misconception id. Lesson 1.2's first scored call must be a fresh variant: the roadmap's starter annotates the answer, and the learner wrote the roadmap.
- **Confidence.** Certainty-based marking has three levels (guess, think so, sure), printed probability bands, and payoffs of +1/0, +2/−2 and +3/−6. Honest reporting is optimal. The first call locks, and the copy never says "Correct". Judgment shows the hit rate per band with n and Wilson intervals, and diagnoses nothing below n ≈ 20. Sure-and-wrong items return first.

**A5 · Fresh, checker-graded practice and a retention loop.** Critical in design, small in the first build. Sources: A6-F2 mm, A8-06 mu, A8-03 mu, A7-13 uu, A8-18 mu.
- **P0 grader core.** A Pyodide-Z3 worker with rlimit budgets and a seed → instance → checker contract runs three families: negate-it (an equivalence check returning a distinguishing state), find-the-witness (no stored key) and call-it (keyed at grade time). Unknown instances are discarded. Native-versus-Pyodide agreement is a CI property test.
- **Later families** arrive with their course: WP-it (04), CTI-or-bug (04–05), lasso items (05), anomaly-ID (06), leaks-to-observer (07), spot-the-gap (from the A4 generator).
- **Today** is the home for returning visits and phones: ts-fsrs, 10–12 minutes, a welcome-back set after 7 idle days, never an overdue count, plus where you left off, new erosions and a park note.
- **KC graph.** Start with about 60–100 KCs with confusable edges, such as safety/liveness, WF/SF and SI/serializable.
- **North star VRC₃₀:** reasoning moves re-derived unassisted on unseen seeds at least 30 days later. Re-find becomes "same move, new specimen", and a thin Lean thread runs through Courses 05–08.

**A6 · Make the stamps mean what they say.** Major; it blocks freezing the design system. Sources: A7-01 mm, A7-02 um, A7-03 mm, A7-04 um, A7-05 uu, A7-06 um, A7-16 uu, A6-F14 mu.
- **Words** and their required qualifiers: PROVED; MODEL-CHECKED (bound), renamed from CHECKED, which collided with enforced checks such as Postgres CHECK; TESTED (n); ENFORCED (where); CONFIGURED (source); ASSUMED (why); UNKNOWN (reason); NOT COVERED; REFUTED (witness). EROSION is an event, not a stamp. Words arrive with the stages that need them. The export maps onto Stage 10's categories. `verify:vocabulary` checks status positions only, so "verification condition" stays legal in prose.
- **Codes.** Each stamp is a word plus a code ([P] [M] [T] [E] [C] [A] [?] [N] [R]), not a logic glyph. Lean prints ⊢ before open goals, and □, ≜ and ~ are TLA+ notation. **New catch:** [C], [A] and [E] share letters with v1's ID prefixes for claims, audit cases and erosions. Codes are always bracketed and IDs never are, and a lint enforces this.
- **Trust in the qualifier.** For example, "PROVED · Lean 4.35.0 kernel" against "PROVED · Z3 5.3.1 unsat · uncertified · rlimit N". Certificate replay stays deferred.
- **Three-segment strip:** proposition-of-model, correspondence, requirement-fit (never [P]). Erosion cracks segment 2 or an assumption record.
- **Instruments** declare the query direction, print the raw answer neutrally, then derive the status. A fading "so P holds / is violated / can't tell" tap is its own Call It type. Theater monitors report observations; only explorer or TLC results earn [M].
- **Colour and shape.** Stamp hues stay inside an allowlist of semantic classes, and progress is drawn in ink. Shapes separate PROVED from ENFORCED (luminance ratio 1.07:1 today), PROVED from MODEL-CHECKED, and TESTED from UNKNOWN, in greyscale, with a colour-vision-simulation check in CI. Each line style carries one meaning.

### 3.2 Major: architecture and product

**B1 · Z3 through Pyodide, on GitHub Pages.** Sources: A5-F5 uu, A6-F12 mu, A8-15 um.
- Self-host Pyodide 314.0.7 with the official, pinned z3_solver 5.3.1.0 wheel, and delete the Python-to-JS shim.
- Budgets are `rlimit`; `worker.terminate()` is the hard stop. `s.set('timeout', …)` never returned in the measured build, so A8-15's "timeout gives UNKNOWN" must be built this way. Teach UNKNOWN with `x**y == 8`.
- The ~13 MB gzipped payload loads behind consent. Phase A exits only after a test on real phones.

**B2 · One TLA+ semantics.** Sources: A5-F7 mu, A6-F11 uu, A8-13 mm, A7-19 mu.
- **Authored scenes.** Drop the home-made DSL. Scenes become TLC 1.7.4 state graphs (`-dump dot,actionlabels`, `-workers 1`, explicit deadlock setting) exported to JSON. The Theater, the lasso validator and the phone view all navigate that one graph.
- **Learner edits** run on Spectacle at a pinned commit, up to about 5k states. Spectacle matched TLC's 11/45/191/813 distinct states, and a CI gate keeps the two equal. PlusCal is translated at build time. TLC itself runs in the tab only through an opt-in CheerpJ CDN lane, because self-hosting CheerpJ needs a commercial licence.
- **Liveness and controls.** A small lasso validator is tested against TLC. Controls show enabled actions, disabled ones with reasons, and per-scenario faults drawn in ink, with branching history.
- **Counterexamples** are imported via `-tool` or a pinned, labelled 1.8.0 pre-release.

**B3 · Lean: core-only, generated, staged, with help.** Sources: A5-F8 mu, A6-F13 mm, A8-10 mu, A8-09 uu, A8-19 mu.
- **Core only.** Courses 02–03 use `Acct → Int` with pointwise update, `List.sum`, `omega` and `decide`. Drop Finmap. Mathlib waits for a Course 09 spike.
- **Generated Goal Replay.** Strips come from real elaboration at build time, are stamped with the Lean version, and are re-checked on every toolchain bump. Each edition freezes one Lean version.
- **No embedded WASM Lean.** The zero-install lanes are the Natural Number Game and an official-playground link that is never credited.
- **Staging.** Labs are staged per pinned lemma, with no stage over 25 minutes. Lessons are 12–15-minute segments.
- **Help.** Each pinned theorem gets a hint ladder: teach-back, concept, stuck goal, a `sorry` skeleton, then the informal proof. Using it counts as assisted until an unseen variant is proved. "Manual" variants disable `grind` and `omega` rather than locking them.
- **Readings.** PLF stays, with HGLV alongside. `vcgen`, which is experimental, is Course 04's production twin.

**B4 · One home for evidence; claims as a graph.** Sources: A5-F4 uu, A6-F19 uu, A8-13 mm, A8-07 um.
- **Repo of record.** The `plinth-lab` repo is the system of record: `claims/*.yaml`, `specimens/`, `receipts/`, and `broken/` beside `fixed/`, all schema-validated. It doubles as Stage 10's published artifact.
- **Browser log.** The browser keeps only practice events, each with an id, provenance, item revision and engine version.
- **Backup.** WebKit deletes script-writable storage after seven days without interaction. The answer is export bundles, a backup nudge at 7 days and an iOS Home Screen prompt.
- **Claim graph.** Claims, assumptions and specimens are linked by typed rests-on edges. Erosion propagates along them; "fully proved" differs from "proved, resting on seams"; and the proof report is a traversal of the graph.

**B5 · A two-lane gate pipeline on the current stack.** Sources: A5-F9 mm, A5-F10 mu, A5-F15 uu.
- **Fast lane** (under 5 min, blocking): the A3 and A6 lints, Z3 and Spectacle calls, bundle, guardrails, glyphs, links and generators.
- **Heavy lane** (nightly): Lean and Postgres calls; conformance (Spectacle = TLC, Pyodide = native Z3, PGlite = PostgreSQL, Fixedpoint = Soufflé); labs with weakening mutants; accessibility.
- **Release blocking.** The heavy lane blocks release events. A red night downgrades the claims it touches to "unverified since <date>". "Minimal" is defined per engine: TLC only with `-workers 1`, Z3 only under an explicit objective.
- **Stack.** Move to React 19, Vite 7, router 7, TypeScript 5.9, Playwright and axe.
- **Vendoring.** Vendor kernelspace's stateless infrastructure (verify scripts, `a11y.mjs`, agent kit, `sw.js`, `fsrs.ts`) at a pinned SHA. Take the ledger's envelope ideas, not its engine.
- **Block types.** At most six in Phase A.

**B6 · Plan by gates and owner attention; tier the content.** Major: with no deadline, the risk is waste, not harm. Sources: A5-F1 mm, A5-F19 mm, A8-21 uu, A5-F12 mu.
- **Phases.** S spikes → A Project 00 → B Proof → C Obligations + Time → D Correspondence + Secrecy → E Effects + Preservation + Assembly.
  - A phase starts when the previous gates are green and the owner's queue is under about 10 h.
  - It exits on outcomes the owner can show, plus a 360 px smoke test.
  - An erosion ships only with both its endpoints.
- **Learner-zero.** Agents draft stage N+1 while the owner studies stage N; unreviewed material is labelled "draft: first-learner pass pending".
- **One weekly envelope.** Study, review and work on the learner's own system share it. Review is capped at about 2–3 h, and two weeks over the cap trigger the cut order. Owner minutes are logged; no hour totals are published. [derived] A5's self-labelled ≈250–345 h would take 83–173 weeks at that cap, against a 39–78-week arc.
- **Cut order:** Derivation Board polish → Judgment per-type breakdown → Alloy lab → Elevation drawing → Shelf UI → bridge lessons beyond 30 → erosions lacking both endpoints → audit cases beyond two per course.
- **Tiers.** Keep 80 slots: about 25 core lessons, 40 bridge lessons (≤1,000 words, each pointing at the exact external section) and 15 generated drills. Load-bearing statements stay ASSUMED until externally reviewed.
- **Partners** are optional. They gate only a public "signed off by external learners" label.

**B7 · Bench and engines as the roadmap names them; check correspondence.** Sources: A5-F13 mm, A5-F17 mm, A5-F16 mu, A5-F20 mu, A6-F7 mm, A8-20 uu.
- **Dev Container** (digest-pinned): Lean 4.35, JRE 21 with pinned `tla2tools`, PostgreSQL 18.6, z3-solver 5.3.1, Rust and Soufflé, with Alloy optional. Add a Codespaces prebuild and `plinth doctor`.
- **CLI.** It stays in Python, using schemas generated from one JSON Schema.
- **Datalog.** Z3 Fixedpoint in the tab, Soufflé on the Bench, with an equal-relations gate. `ascent` appears only in Course 10.
- **PGlite** serialises transactions, so it runs single-session lessons and views histories recorded on the Bench.
- **Interpreter.** The oracle is kernel-checked goldens (`theorem golden_k : run c s0 = r := by decide`, with no `implemented_by` or `native_decide`), with n reported. The TS port stays.
- **Correspondence.** L8 uses Bench TLC trace validation over N seeded fault schedules, stamped "TESTED (n seeds)". In-tab step checks wait for a Spectacle spike. Course 06 adds Cedar-style differential testing, and Cedar is the production twin for Courses 03, 06, 07 and 09.

**B8 · Isolation, phones, payloads, offline.** Sources: A5-F6 mu, A5-F14 uu, A7-21 mu, A7-23 uu.
- **Instrument bus.** One message-only bus, {engine, version, input, budget} → {verdict, witness, stats, provenance}. Replies are data; imports are schema-validated, size-capped and never rendered as HTML.
- **Separate origin.** A separate instrument origin is the only isolation measured to work: a same-origin worker can still open the ledger's IndexedDB. Decide it in Phase S; it is mandatory before specs load from URLs.
  - **New gotcha:** a GitHub account's project sites share one origin (`<owner>.github.io`, or the owner's inherited custom domain), so the instrument site needs its own custom subdomain.
- **Phones.** The phone flow is predict, see a recorded run with its id, then queue hands-on work for the laptop. Today, Lesson, Audit and Claims get phone-first layouts.
- **Payloads.** Downloads over 5 MB need consent. Assets use content-hashed caching under a `verify:bundle` budget; the service worker has a kill switch; fonts are self-hosted subsets.

**B9 · Nothing locks; fewer nouns; an honest home.** Sources: A6-F16 uu, A8-08 mu, A7-14 mm, A7-12 mm, A8-18 mu.
- **No locks.** Drawers always open (logged), and audit cases are never locked. Call It is required only on first runs of authored cells and on generated items, with an expert skip once a KC is solid. Notes follow a cadence, not due dates.
- **Navigation:** Today · Stages · Bench · Audit · Claims, plus search.
  - "Stage" is the roadmap's word.
  - "Signed off" replaces "set", which collides with Lean's `Set`.
  - Claims replaces Ledger, which collides with the subject matter. Its export is the proof report.
- **Home drawing.** An ordered path with no lock copy. Rests-on edges appear on focus, and a list mirrors the drawing.

**B10 · Accessibility and notation.** Sources: A5-F18 uu, A7-15 uu, A7-17 uu, A7-18 uu.
- **Gate.** WCAG 2.2 AA: axe at 360, 320 and 1280 px, plus screen-reader passes.
- **Controls.** Call It uses native radios. The Derivation Board gets a keyboard-first stepper (SC 2.5.7).
- **Traces.** Traces render as real tables with narrated steps, and shortcuts are scoped to the focused widget.
- **Notation.** JuliaMono v0.63.2 misses none of 49 measured symbols; IBM Plex Mono misses 36. Add `verify:glyphs`, a speech map, and ASCII TLA+ by default.

**B11 · Curriculum additions that close conceptual holes.** Sources: A6-F6 uu, A6-F10 uu, A6-F15 mm, A8-11 um, A6-F20 mu.
- **CTI Workbench,** plus lessons 4.5b ("The counterexample that can't happen") and 5.8b ("From MODEL-CHECKED ≤ N to PROVED for every N"). A sat inductive step is a bug only if its pre-state is reachable; otherwise, strengthen the invariant. Lamport's TLC technique is the Bench default, with Apalache optional.
- **Hall of Records:** dated toy models, re-run in CI, of Bitcoin CVE-2010-5139, Bloch 2006, Starbucks 2015, Jepsen PostgreSQL 12.3 and Stripe idempotency keys. Z3 #11179 and Lean #14576 join after re-verification.
- **Boot** (≤ 8 minutes):
  1. An agent PR claims "safe, 200 tests green".
  2. The learner calls a variant the roadmap does not answer.
  3. Z3 finds the bug; the guard makes it unsat.
  4. BitVec(64) shows the recipient wrap.
  5. One Hall card closes.
  A cold worker shows a labelled recorded run.
- **Placement.** Keep a broad audience line and add a "From kernelspace" path. Course 00 becomes drawers plus adaptive KC placement. Pre-credit only KCs that a kernelspace Evidence Pack actually evidences; never logic, induction, TLA+ or isolation.
- **Generalise after Minimise.** A fix must also kill a non-minimal witness. The cited Danas et al. 2017 figures are unverified.

### 3.3 Scoped down

**C1 · Evidence-tagged mechanics** (A8-16 mm). Tag each mechanic as Ev or Prec, with expectations near 0.1 SD and never "100×". Add a "this will feel harder" card. Keep/kill rules are n=1 decision rules drawn from the evidence log.

**C2 · A thin world** (A6-F8 mm). A seeded event stream over the reference interpreter grows with the stages. The mutation generator plays the agent. Erosions fire from the learner's oldest ASSUMED seam, not from a calendar.

**C3 · Alignment with the learner's own system: optional, private, generic** (A6-F9 mm). An optional private overlay runs the same checks on the learner's own repo, and receipts stay local. Mini-Plinth keeps the roadmap's syntax and uses only the roadmap's own concepts. A generic self-audit kit closes Course 10.

**C4 · Cross-link, don't re-teach** (A6-F21 um, A8-12 mm, A8-11 um). Bridge cards at 6.5–6.7 (tablespace T4) and 8.3/8.6 (tablespace T3, byzantine) each carry a self-contained prerequisite card, because the siblings are unfinished. A light kernelspace strand re-stamps pool conformance as TESTED (n). Notes auto-attach specimens and receipt hashes.

**C5 · Visual cleanup** (A7-20 mu, A7-24 uu, A7-22 ru). Replace the navy-and-mint night theme, which echoes kernelspace, with a validated graphite theme that keeps the stamp shapes. Title blocks are filled from runs. Motion: see R1.

## 4. Contested and split items: resolutions

| # | Item | Positions | Resolution and reason |
|---|---|---|---|
| R1 | Motion (A7-22, formally contested) | Already handled, vs spend motion on diffs | **Refute largely wins.** DESIGN.md §7 already lands every stamp the same way and honours reduced motion. Add goal diffs, crack propagation and static +/− marks |
| R2 | Author-lag (A5-F1) | Embargo, vs learner-zero | **Learner-zero.** The owner is the main learner; an embargo blocks him when he needs the course |
| R3 | Comparator sandbox (A5-F3, A8-02) | Require it, vs record it | **Record, never require.** Matching works without it; the threat is self-deception through one's own agent |
| R4 | Instrument origin (A5-F6) | Worker only, vs second origin | **Second origin, decided in Phase S.** A same-origin worker still reaches IndexedDB |
| R5 | Heavy lane (A5-F9) | Never blocks, vs blocks | **Blocks releases.** The load-bearing Lean and TLC claims live there |
| R6 | Substrate (A5-F10) | Ledger engine, infrastructure, or byzantine | **Kernelspace infrastructure plus `fsrs.ts`; a native claim graph.** Its gates are tested; byzantine is less finished |
| R7 | Stage 7 engines (A5-F13, A5-F17, A6-F12) | `ascent`, TS evaluator, Fixedpoint | **Fixedpoint in the tab, Soufflé on the Bench, Alloy optional.** The roadmap names Soufflé and Alloy |
| R8 | Interpreter (A5-F20, A8-13) | Rust reference, vs TS port | **Kernel-checked goldens; keep TS.** A Rust interpreter is still a port |
| R9 | AI policy (A6-F1) | Per-course bans, vs per item | **Per item.** Bans are unenforceable for someone who builds with agents daily |
| R10 | Audit design (A6-F4, A8-04, A7-09) | Fixed 40–50% share, a witness for every rejection, seven steps, new classes | **A seeded 30–60% share, typed evidence, five steps, subclasses.** A fixed share can be learned; some classes lack counterexample states |
| R11 | Stamp icons (A7-01, A7-06) | Glyphs, vs codes | **Codes.** The glyphs collide with Lean and TLA+ notation |
| R12 | Strip (A7-03) | Five segments, three, or table | **Three.** A model is not itself proved |
| R13 | Interpretation tap (A7-04) | Every run, vs faded | **Faded,** returning for each new "sat is good" query |
| R14 | Confidence (A7-10, A8 §3) | CBM, vs 55/75/95 | **CBM with printed bands:** both the incentive and calibration |
| R15 | Judgment score (A7-11, A8-17) | Multi-class, vs binary | **Binary, led by the CBM mean.** Confidence covers only the chosen verdict |
| R16 | Names (A7-12, A8-18) | Map/Record, Ledger, or Claims | **Stages/Audit/Claims.** The other names collide with domain terms |
| R17 | Home drawing (A7-14) | Masonry bond, vs ordered path | **Ordered path.** Contiguous spans cannot draw 06-on-03+05 alongside 09-on-03+04 |
| R18 | World (A6-F8) | A full application world, vs thin | **Thin.** The largest build, with no outcome evidence |
| R19 | Alignment with the learner's own system (A6-F9) | Strict coupling, vs generic | **Generic.** A public course must not couple to a private design |
| R20 | WASM Lean (A6-F13) | Opt-in cell, vs none | **None.** About 137 MB, needs isolation, lags the pinned toolchain |
| R21 | Explain-back (A8-01) | Practice, vs required | **Required, uncredited.** The completion tests are explanations |
| R22 | Hosting (A8-15) | New host, service-worker trick, single-thread build | **Pages plus Pyodide.** The isolation requirement concerns only the npm build |
| R23 | Experiments (A8-16) | Pre-registered, vs n=1 | **n=1 rules.** One learner cannot power randomisation |
| R24 | Transfer (A8-12, A8-11) | Full track and broad pre-credit, vs light | **Light, evidenced KCs only.** Study only what the next artifact needs |

## 5. Bold ideas worth keeping

Scores are estimates. Impact (I) and wow (W) run 1–5. Effort (E): 1 = up to 3 agent-days, 2 = up to two weeks, 3 = up to six weeks. Score = I×W/E.

| # | Idea (source) | I | W | E | Score | Zero-server mechanism |
|---|---|---|---|---|---|---|
| 1 | Four checkers agree; none read the requirement (A6 bold 4, no toy kernel) | 4 | 5 | 1 | 20 | Bench lab: a true theorem that misses the intent. `lake comparator --paranoid` (six checkers, 3 s measured) accepts it; the learner shows the violating scenario in the tab |
| 2 | Tool-trust specimens (A5 bold 8) | 4 | 4 | 1 | 16 | Runs already on disk become static Audit cases, re-run nightly: a never-firing timeout, deadlock before the bug, one exit code for two failures |
| 3 | Public upstream counterexample (A6 bold 6) | 3 | 5 | 1 | 15 | Optional final rung; the receipt is a merged upstream PR plus witness |
| 4 | Spec duels by URL (A6 bold 1) | 4 | 5 | 1.5 | 13.3 | Specs ride in the URL fragment, never sent to a server; only the isolated instrument origin parses them |
| 5 | Your repo is the Audit Desk (A8 bold 1, A5 bold 4) | 5 | 5 | 2 | 12.5 | `plinth audit` mutates the learner's repo with gap-class operators and harvests agent commits that touched statements; local checkers compute ground truth; the tab imports the bundle |
| 6 | The course erodes in public (A5 bold 1) | 4 | 4 | 1.5 | 10.7 | A tool bump re-runs `runs/` in CI; the diff becomes an EROSION entry on the static `/assurance` page |
| 7 | Pocket checkers (A5 bold 6) | 4 | 3 | 1.5 | 8 | Build-time TS predicates check witnesses offline on phones; CI property-tests each against Z3, since it is a new semantics |
| 8 | State-space telescope with minimap (A6 bold 3, A7 bold 6) | 4 | 5 | 2.5 | 8 | Spectacle explores up to ~5k states in the tab; TLC counts are precomputed in CI |
| 9 | Kernelspace in the dock (A8 bold 4, optional) | 4 | 5 | 2.5 | 8 | Bench side quests on the learner's own kernelspace code |
| 10 | Proof-report diff (A7 bold 1) | 4 | 3 | 1.5 | 8 | The claim graph exports Markdown and JSON; diff two local exports |
| 11 | Verified-in-your-CI receipts (A5 bold 3) | 3 | 4 | 1.5 | 8 | The learner's own public repo signs attestations into Sigstore's public log; never on the private overlay |
| 12 | Verifiable belts (A6 bold 8) | 3 | 4 | 1.5 | 8 | A file of witnesses and receipt hashes any browser re-verifies offline |
| 13 | Proof-carrying notes (A6 bold 2) | 3 | 4 | 1.5 | 8 | Notes embed fragment permalinks that readers' browsers re-run |

**Folded into changes:** the instrument bus (B8), one state graph (B2), statement-first cards and witness-backed findings (A4), the notation layer (B10), Goal Replay movies (B3), agents prove (A1), equivalence-graded specs (A2), VRC₃₀ (A5), Evidence Pack interop (B11), the Cedar room (B7). **Rejected:** the masonry-bond map, glyph stamps, the quarterly agents museum (idea 5 covers it) and the Shake Table re-skin. **Deferred:** family convergence and a shared family kit.

## 6. What this digest adds

1. **Same-origin trap.** GitHub Pages serves project sites at `<owner>.github.io/<repo>`, and they inherit the owner's custom domain unless set otherwise. The instrument site needs its own hostname.
2. **Code collision.** The stamp codes [C], [A] and [E] share letters with v1's ID prefixes (A6).
3. **New surfaces.** Spec duels take untrusted input, which belongs only in the instrument origin. Pocket checkers add a semantics, so they need a differential gate.
4. **Unspoiled first call.** RESULTS.md's self-transfer mint (Lean-proved, 10 → 15) answers Stage 3's self-transfer question. Its Z3 encoding is unexecuted, so build it as a run.
5. **Public attestations** from public repositories land in a publicly readable transparency log. Keep them off the private overlay.
6. **Errata.** A8-15's timeout plan contradicts the measured Z3 build. The release API refutes RESULTS.md's ~200 MB Lean estimate. PGlite 0.5.11 reports PostgreSQL 18.6 (executed).

## 7. Publication hygiene and open items

- **Publication note.** The review JSON files are not published; the digest contains no content from them beyond what it states.
- **Open spikes:**
  - phone load time and memory;
  - a custom-subdomain second origin;
  - whether Codespaces honours runArgs;
  - Spectacle checking a supplied state pair, and its speed on Course 05/08 specs;
  - kernelspace Fleet traces under TLC trace validation;
  - details of Z3 #11179 and Lean #14576;
  - the Danas 2017 figures;
  - how screen readers speak glyphs;
  - logged owner hours.

## 8. Verification log and sources

**Executed or read (2026-10-23/24):**
- the JSON re-transcription and byte comparison;
- RESULTS.md, `spikes/tla/DoubleSpend.{tla,cfg}`, `spikes/lean/Ledger.lean`, `A5r3/{tla/run,browser-runs,z3-pyodide,pglite,comp-run1..5}.log`, `A5v2/mathlib-measure/measure.out`, PLAN.md and DESIGN.md;
- PGlite 0.5.11 under Node 22.

**Re-checked online:**
- PGlite 0.5.11 (2026-10-21): https://registry.npmjs.org/@electric-sql/pglite
- Pyodide 314.0.7 (2026-09-14): https://registry.npmjs.org/pyodide
- z3-solver 5.3.1: https://registry.npmjs.org/z3-solver ; wheel 6,525,334 B (2026-10-15): https://pypi.org/pypi/z3-solver/json
- Lean v4.35.0 assets: https://api.github.com/repos/leanprover/lean4/releases/tags/v4.35.0 ; notes (comparator, `--paranoid`, Linux-only sandbox, experimental `vcgen`): https://lean-lang.org/doc/reference/latest/releases/v4.35.0/
- Pages and domains: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages ; https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- Origins: https://developer.mozilla.org/en-US/docs/Glossary/Origin
- Attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations
- WebKit storage cap (2020-03-24): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/

**Carried from the lenses:**
- Z3 JS README: https://raw.githubusercontent.com/Z3Prover/z3/master/src/api/js/PUBLISHED_README.md
- TLA+ tools: https://github.com/tlaplus/tlaplus/releases
- Spectacle: https://github.com/will62794/spectacle
- CheerpJ licensing: https://cheerpj.com/docs/licensing
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Certainty-based marking: https://www.ucl.ac.uk/lapt/REAP_CBM.htm
- Trace validation: https://arxiv.org/abs/2404.16075
- Cedar: https://arxiv.org/abs/2407.01688
- Hall of Records sources: A6-F10
