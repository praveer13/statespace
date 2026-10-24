# A5 — Product architecture and build feasibility: adversarial review of Plinth v1 (round 3)

**Lens.** Can one maintainer plus coding agents, with about 10 h/week of review, build v1 and keep it *true* for a 9–18-month learner? Scope: the local-first data model, receipts, in-browser instruments, build gates, content cost, reuse of kernelspace, agent-native surfaces, accessibility and phones. Output: ranked findings, an architecture, a phase plan, and cheap spikes for the riskiest assumptions.

**Date.** 2026-10-21 (task date 2026-10-20).

**Reviewed.** `docs/history/v1/PLAN-v1.md` (643 lines), `docs/history/v1/DESIGN-v1.md` (130 lines), `package.json`, and the six artboards in `design/canvas/`. Line numbers are `cat -n` numbers of those files.

**Measured against.**
- The roadmap (`research/context/roadmap.md`), which is the source of truth.
- Kernelspace: `PLAN-100X.md`, the ledger-v3 spec, and the repository (clone at `5ab8883`; history via the GitHub API).
- The sibling plans.
- This round's A1–A4 and A6–A8 reviews, cited where they own a point.

**Supersedes** the earlier A5 at this path (2026-10-20 23:10). §9 lists what changed and why.

**Evidence.** I re-ran every load-bearing tool claim myself in this session. Scripts and raw logs are in `research/evidence/A5r3/`, written `A5r3/` below.

**Tags.** **[measured]** = run by me today. **[verified]** = primary source read by me today. **[estimated]**. **[inference]**. **[unverified]** = never load-bearing.

---

## 0. Verdict in plain words

- **Keep the product idea.** Stamped claims, specimens, Call It and the Audit Desk can all be built with zero servers. The plan to build them is not sound, and the main reason differs from the one the earlier A5 gave.

- **Code is not the constraint. Verification and the person are.**
  - Kernelspace's 100X plan was costed at 511 review hours over 52 weeks.
  - In fact its Waves 0a–3, plus an item the plan had gated to "not before 2027-10", merged in 17 days: 17 PRs and +337,296 lines. Most merged within four hours of opening; one +33,068-line PR merged after 8 minutes. Every commit I sampled carries a Claude co-author trailer [measured].
  - Agents will outrun any hours-based plan for Plinth within weeks. Three things do not compress:
    - checking that formal content is true;
    - the maintainer's own progress through the stages, since he appears to be the course's first learner [inference];
    - learner evidence that needs calendar time.

- **The failure to fear is a false statement that looks verified,** which is the course's own thesis.
  - v1's artboards already show an invented state count: the Theater shows "212 distinct states", and the real figure is 11.
  - The Ledger shows a READ COMMITTED "lost update" that the course's own compiled SQL cannot produce (A2 F1, F7).
  - Drafting at agent speed, without facts generated from runs, will produce more of these.

- **Receipts.** v1 stamps PROVED from pasted JSON.
  - Stock Lean 4.35.0 ships `lake comparator`. In my runs it rejected a weakened statement and a redefined `transfer`, and `--paranoid` ran six independent kernels in 3 s.
  - But its `bwrap` sandbox fails in a default Docker container, and the failure exits **1**, the same code as a rejected proof. Receipts have to be designed around that [measured].

- **Instruments.** I measured a replacement for four of v1's six engine choices:
  - the official Z3 Pyodide wheel, which needs no COOP/COEP and was ready in 1.5–1.7 s in Chromium, Firefox and WebKit, instead of npm Z3 plus a service worker plus a Python shim;
  - Spectacle plus TLC state graphs built at build time, instead of an own DSL explorer (Spectacle's state counts match TLC's for 2–5 workers);
  - Z3 `Fixedpoint`, instead of a TypeScript Datalog evaluator;
  - goal states generated from the Lean server, instead of hand-recorded ones.

  Two v1 assumptions are false:
  - Z3's wall-clock `timeout` never fires in the browser build;
  - TLC's JSON trace dump exists only in a pre-release that is rebuilt every day.

- **Isolation (new this round).** Kernelspace's sandbox pattern, a blob worker inside a `sandbox="allow-scripts"` iframe, cannot host Pyodide 314 in Chromium. A separate instrument origin works in all three engines and cannot read the app's storage [measured].

- **Data.**
  - v1 keeps the learner's evidence twice, in IndexedDB and in the lab repo, and versions neither.
  - Safari deletes script-writable storage after 7 days of browsing without a visit [verified].
  - Make the repo the system of record. Vendor kernelspace's ledger v3 event model for practice events.

- **Reuse.** v1 scaffolds an older stack (React 18.3, Vite 5, router 6). It also rebuilds things kernelspace already has and tests:
  - the ledger engine (≈3.95k lines, self-contained);
  - FSRS-6 (100 lines, matched to ts-fsrs);
  - the KC graph;
  - 19 `verify-*` scripts;
  - the lab packer with its agent guardrail kit;
  - the accessibility sweep;
  - the lessons-md and llms.txt export.

- **Realistic plan.** Gate-driven and author-lagged.
  - The owner reviews statements, answer keys, rubrics and gate reports, never code diffs.
  - That comes to about **250–345 owner hours** over the arc [estimated], paced by his own progress through the stages.
  - A one-week spike phase comes first (§5–§7).

---

## 1. What I ran

| # | What | Result | Raw output |
|---|---|---|---|
| E1 | Kernelspace history (GitHub API) | See note E1 below | `A5r3/ks-history.log` |
| E2 | Lean toolchain | Official v4.35.0 (tag `eb6cafb`, 2026-10-12); v4.36.0-rc1 followed on 2026-10-14. Unpacked size 3.0 GB; `lean-4.35.0-linux.tar.zst` is 566 MiB. Ships `lake comparator`, `lake check` and `leanchecker` | GitHub API; image `ss-lean:4.35.0` (elan install, commit matches tag) |
| E3 | `lake comparator` | See note E3 below | `A5r3/comp-run2.log` … `comp-run5.log` |
| E4 | Mathlib cost | A project importing `Mathlib.Data.Finmap` at `v4.35.0` has a 7.3 GB `.lake` (6.9 GB of it Mathlib). That spike was run earlier in this session; I re-checked the sizes on disk. The same ledger proofs compile on core Lean in under 1 s, with axioms `[propext, Quot.sound]` | `A5v2/mathlib-measure/measure.out`; `A5r3/lean/Ledger.lean` |
| E5 | Z3Py in the browser | See note E5 below | `A5r3/browser-runs.log` §1 |
| E6 | Z3 budgets | See note E6 below | `A5r3/z3-pyodide.log` |
| E7 | Instrument isolation | See note E7 below | `A5r3/browser-runs.log` §2–3; harnesses `A5r3/sbx/`, `A5r3/xorigin/` |
| E8 | GitHub Pages delivery | See note E8 below | `curl -I` |
| E9 | TLC | See note E9 below | `A5r3/tla/run.log`, `run-full.log` |
| E10 | Spectacle vs TLC | Spectacle @ `5827c22` (MIT) finds 11 / 45 / 191 / 813 distinct states for 2 / 3 / 4 / 5 workers, identical to TLC 1.7.4, with a 5-state violation trace. Throughput is **524–1,125 states/s** in all three engines | `A5r3/browser-runs.log` §4 |
| E11 | Lean goal extraction | `$/lean/plainGoal` from stock `lean --server` 4.35.0 returns the goal before every tactic, including the generalised `ih`, in about 0.3 s for the file | `A5r3/scripts/lean-plaingoal.mjs` |
| E12 | PGlite | See note E12 below | `A5r3/pglite.log` |
| E13 | Registries | PyPI z3-solver 5.3.1.0 (2026-10-15) includes the pyemscripten wheel (6,525,334 B). npm z3-solver 5.3.1 (2026-10-16): `z3-built.wasm` is 34.6 MB, 7.85 MB gzipped. pyodide 314.0.7 (2026-09-14). ts-fsrs 5.4.2 (2026-09-01) | registry JSON |
| E14 | Kernelspace substrate | See note E14 below | clone at `5ab8883` |
| E15 | Browser storage | WebKit deletes all script-writable storage after "seven days of Safari use without user interaction on the site"; Home Screen web apps are exempt. `persist()` is granted "based on heuristics". `showDirectoryPicker` works only in Chromium | webkit.org; MDN compat data |
| E16 | Lean in the browser | `lean4web` (live.lean-lang.org) runs Lean "server-side". It accepts `#code=`, `#codez=`, `#url=` and `#project=`, and has a `mobile` setting | lean4web `doc/Usage.md` |

**E1 · Kernelspace history.**
- The repo was created on 2026-07-19, and its first commit already held 42 lesson files.
- PRs #3–#25 (2026-10-04 → 2026-10-20) added +337,296 lines.
- PR #10 added +47,817 lines and merged 3 h 17 min after opening. PR #15 added +33,068 lines and merged 8 min after opening.
- Commits with a Claude co-author trailer: 79 of 79 in #10 and 81 of 81 in #15.

**E3 · `lake comparator`.**
- Verdicts: an honest proof exits 0 ("Your solution is okay!"); an extra hypothesis exits 1 ("theorem statement do not match"); a redefined `transfer` exits 1 ("Const does not match").
- Sandbox:
  - with no `bwrap` it exits 2;
  - with `bwrap` under default Docker it exits **1** ("No permissions to create new namespace");
  - it works only with `seccomp=unconfined`, `apparmor=unconfined`, `systempaths=unconfined` and an existing `/run/user/0`. Then each verdict takes 1–2 s, and `--paranoid` (six kernels) takes 3 s.

**E5 · Z3Py in the browser.**
- Setup: Pyodide 314.0.7 plus `z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl`.
- Engines: Chromium 153, Firefox 155 and WebKit 26.6, all with `crossOriginIsolated=false` and no SharedArrayBuffer.
- Ready in 1.46–1.71 s. The roadmap's starter prints `sat [b = 0, amount = 1, a = 0]`, then `unsat`.
- Payload: 12.96 MB gzipped. The wheel contains `libz3.so` twice, at 8.88 MB each.

**E6 · Z3 budgets.**
- `s.set('timeout', 2000)` never returned; I killed it at 25 s.
- `rlimit` 5e6 returned `unknown (canceled)` in 1.1 s.
- `x**y == 8, y > 1` returned `unknown (incomplete (theory arithmetic))` in 14 ms.
- A 64-bit recipient wrap is `sat`.
- `Fixedpoint` handles stratified negation: `canread(1,3)` is sat and the revoked `canread(1,4)` is unsat.

**E7 · Instrument isolation.**
- An opaque-origin iframe plus a module blob worker runs Z3 in Firefox and WebKit, but **fails in Chromium** ("worker error").
- Pyodide 314 refuses classic workers in both its ESM and UMD builds.
- A separate origin in a plain iframe, plus a same-origin module worker, runs Z3 in all three engines (1.46–1.69 s). Reading the parent's `localStorage` throws SecurityError, and the Cache API is available.

**E8 · GitHub Pages delivery.**
- Live Pages sites return `access-control-allow-origin: *`, `cache-control: max-age=600`, gzip encoding, and `application/wasm` for `.wasm`. They send no COOP or COEP.
- The request to allow COOP/COEP headers (community discussion #13309, opened 2022-03-23) is still unanswered.
- COEP `credentialless` is unsupported in Safari (MDN compat data).

**E9 · TLC.**
- The latest stable release is v1.7.4 (2024-08-05). It rejects `-dumpTrace` as an "unrecognized option".
- v1.8.0 is a pre-release, re-published on 2026-10-20 (`TLC2 Version 2026.10.20.183001`), and it does have `-dumpTrace`.
- On the double-spend spec, default flags report **"Deadlock reached"** first (11 states generated, 10 distinct, depth 4). With `-deadlock`, the invariant fails (12 generated, 11 distinct, depth 5).
- `-dump dot,actionlabels` works on the stable release.

**E12 · PGlite.**
- 0.5.10 reports PostgreSQL 18.6, and the first query takes 1.0 s.
- `bigint` overflow raises 22003. A NULL amount in a guarded UPDATE matches 0 rows.
- **Transactions are serialized:** W2's read waited 300 ms for W1's commit.
- The wasm and data files are 5.67 MB gzipped, against the README's "only 3mb gzipped".
- 0.5.11 was published on 2026-10-21, during this review.

**E14 · Kernelspace substrate.**
- The ledger engine is ≈3,950 lines; only `types.ts` (1,357 lines) is coupled to kernelspace's domain.
- `fsrs.ts` is 100 lines, matched to ts-fsrs 5.4.2 to 1e-8. `kc/graph.ts` is 142 lines.
- 19 `verify-*` scripts.
- `pack-labs.py` builds deterministic zips that include the agent guardrail kit.
- `a11y.mjs` runs axe at 360, 320 and 1280 px.
- `export-lessons-md.ts`, plus a 140-line `llms.txt`.
- 69 lessons-md files hold 114,959 words, about 1,666 per lesson.

**Not run.** I did not time anything on a real iPhone or Android phone. My CDP CPU throttling did not reach the cross-origin worker (1×, 4× and 6× all gave ≈1.46 s), so I discarded those numbers.

---

## 2. Capacity: planned versus observed

### 2.1 v1 has no capacity model

- PLAN.md §5 (L621–633) lists seven phases with no durations, hours, queue gate or cut order. Neither PLAN.md nor DESIGN.md contains "hours", "budget", "maintainer" or "capacity".
- The scope (L63–64) is "80 lessons + 7 capstone steps, 9 bench labs, 32 audit cases, ~40 specimens to collect, 11 vivas, 4 technical notes". On top of that come six instruments (L177–184), 13 block types (L596–600) and six gates (L606–617).

### 2.2 The family's own data point

| | Kernelspace PLAN-100X (2026-10-03) | What happened (`A5r3/ks-history.log`) |
|---|---|---|
| Capacity | "10 h/week, plus ≤2 h of triage" (L675) | not recorded |
| Calendar | Waves 0a–3 over 52 weeks, 2026-10-05 → 2027-10-17 (L673, §8). S5 physics v2 "not before 2027-10" (L706) | Waves 0a–3 merged 2026-10-04 → 10-15; Wave 3 stretch on 10-18; S5 on 10-19/20 |
| Review | 511 h (§8.1, L725) | 12 of 17 PRs merged within 4 h of opening (fastest 8 min, slowest 19 h); 79/79 and 81/81 commits co-authored by Claude in #10 and #15 |
| Outcome exits | Wave 2: "30-day recall within the SLO's CI on ≥140 pooled checks, ≥35 days after K2 reached partners" (L694) | could not be met in 16 days. PR #18 says Wave 3c ships "the build gates the agents can prove; the instruments for the field gates they cannot" |

**What this means.**
1. **Review-hour unit costs did not predict the calendar.** The plan costed work at S = 4 h, M = 8 h and L = 20 h (L674). The earlier A5's estimate ("≈950 h, about two years") used the same unit costs, so it is wrong in the same way.
2. **Exits that need time became instruments, not verdicts.**
3. **Quality came from gates and from later campaigns.** Kernelspace's first fast draft (42 lesson files in its very first commit) shipped two kinds of error that a later campaign had to fix:
   - one wrong quiz key repeated in four places: prose, a code comment, a sim task and the quiz (`audit/content.md` L49);
   - quizzes where "always pick the longest" passed 58 of 68 (100X L11).

### 2.3 What actually binds Plinth

1. **The truth of formal content.** Tool facts can be machine-checked; whether a statement is faithful to intent (gap class 12) needs a human.
2. **The maintainer's own stages.** He cannot vouch for Course 09's simulation relation before he has done Stage 9 [inference: the roadmap is "the user's plan"].
3. **Evidence that needs calendar time:** partners, and 30-day retention.
4. **Drift.** Lean ships monthly (4.34.1 on 09-24, 4.35.0 on 10-12, 4.36.0-rc1 on 10-14). Z3 5.3.1 shipped on 10-15. PGlite went from 0.5.10 to 0.5.11 during this review. TLC 1.8.0 is re-published daily.
5. **Person-hours.** The learner's 6–10 h/week, plus any other projects, plus reviewing the course.

### 2.4 Owner-attention budget [estimated]

The owner reviews specs, statements, keys, rubrics and gate reports, never code diffs.

| Item | Count | Owner h each | Total h |
|---|---|---|---|
| Spikes, decision records, kit vendoring | — | — | 15–20 |
| Instrument and gate specs, and gate-failure reports | — | — | 15–20 |
| Claim-template statements | ≈31 (C0.1–C9.2) | 0.5–1 | 15–30 |
| Lab challenge packs (statements, `comparator.json`, mutants, rubric) | 9 | 4–6 | 36–54 |
| Core lessons, after the gates pass | ≈25 | 2–3 | 50–75 |
| Bridge lessons | ≈40 | 0.75–1 | 30–40 |
| Generator families | ≈8 | 2–3 | 16–24 |
| Audit cases (as code, demonstrated in CI) | 32 | 0.75–1 | 24–32 |
| Viva rubrics | 11 | 1 | 11 |
| Drift reviews on tool bumps | ≈18 (monthly) | 1 | 18 |
| Partner sessions and screen-reader passes | 5 phases | 4 | 20 |
| **Total** | | | **≈250–345** |

**How this fits the week.**
- Spread over 52–78 weeks, this is about 3–7 h/week, which fits the 10 h/week cap [derived].
- The person's total is the risk. The learner's 6–10 h/week, plus any other projects, plus reviewing the course can come to well above the 10 h/week cap.
- The mitigation is an overlap: author-lag turns the owner's own lab work into reference solutions, specimens and distractors.

---

## 3. Findings, ranked (3 critical, 11 major, 6 minor)

### A5-F1 · CRITICAL — v1 has no capacity or verification model, and the obvious one (review hours) is the wrong one: agents will outrun verification

**Where.**
- PLAN.md §5 L621–633 and L63–64.
- PLAN.md L12 ("9–18 months at 6–10 h/week").

**Evidence.**
- §2.2 (E1).
- 100X L673–675 (calendar and cap) and L694 (an exit that needs ≥35 days).
- PR #18 body.

**Problem.**
- The course could have "80 lessons" within weeks, long before its author has done Stages 4–9.
- Agent review rounds do not reliably catch domain errors. Kernelspace's fast first draft shipped one wrong key in four places, and v1's artboards already contain invented tool numbers (A5-F2).
- The risk is therefore not that the course never ships. It is that **the course ships ahead of anyone able to vouch for it,** in a course whose thesis is exactly that failure.

**Recommendation.**
1. **Plan by gates and attention, not code hours.**
   - A phase starts only when its spikes are retired and the previous phase's owner queue is under 10 h.
   - Capacity means owner attention (§2.4), logged per PR.
2. **Author-lag.**
   - Course N is published as *set* only after the maintainer has finished stage N, using the roadmap's external resources and producing his own receipts.
   - Agents may pre-build instruments and drafts. Drafts carry a banner: "draft, not yet reviewed by a stage-N finisher".
3. **Two kinds of exit.**
   - Gate exits: machine-checked, and met now.
   - Learner exits: they need calendar time, so instruments ship now and the verdicts are dated later. Kernelspace ended up here; Plinth should start here.
4. **The owner reviews statements, keys, rubrics and gate reports, never diffs.**
5. **Use the cut order in §5.**

### A5-F2 · CRITICAL — Tool facts are typed by hand rather than generated by runs; the gates check only a sample, so invented numbers and false mechanisms will ship

**Where.**
- PLAN.md L131–133 (`verify:calls`), L606–617 (the gates), L186–187 ("pin exact versions at implementation time") and L643.
- Theater.dc.html L99–101: "6 your steps", "4 TLC shortest", "212 distinct states".
- Ledger.dc.html L69 ("TLC, 48,112 states") and L72 ("2 connections, 9 ms window").
- Lesson.dc.html L68 and Main.dc.html L138: "Z3 4.15".
- Main.dc.html L73: "Unknown timeout 10 s".

**Evidence.**
- The real double-spend space has 11 distinct states (E9, E10; A2 F7).
- Z3 is at 5.3.1 (E13), and a wall-clock timeout cannot fire in the browser build (E6).
- The READ COMMITTED "lost update" (Ledger L72) does not happen to the course's own compiled `UPDATE … WHERE balance >= $1` (A2 F1; `research/spikes/RESULTS.md`).
- TLC's counts depend on the invocation: default flags report a deadlock before the violation (E9). A number without its argv cannot be reproduced.
- The two artboards' Z3 models disagree (`amount = 40` on Main L138–141, `amount = 1` on the Lesson sheet), and Z3 models are not stable across versions.

**Problem.**
- v1's gates verify Call It verdicts and specimens.
- Prose numbers, mockup numbers, model values, trace lengths, axiom lists and TCB sentences are all typed by hand. At agent speed, that is where the errors will live.

**Recommendation: compile facts from runs.**
1. **A `runs/` registry.** Each entry records `{id, engine, version, binarySha256, image, argv, input, inputSha256, budget (rlimit | workers | seed), outputs}`.
2. **CI executes the runs and writes their outputs to `generated/`.**
   - Fast lane: Pyodide-Z3 under Node, Spectacle headless, kslab wasm.
   - Heavy lane: TLC, Lean, Postgres.
3. **Content cites runs, and `verify:facts` enforces it.**
   - Content refers to a value as `{{run:tlc/double-spend.distinct}}`.
   - `verify:facts` fails on any tool-shaped number, verdict or version in prose, stamps or artboards that is not a run reference.
   - Artboards become generated pages. A6 proposes `verify:facts`; this is the mechanism.
4. **Tool bumps produce a signed diff.**
   - A bump re-runs everything and produces a semantic diff, for example "7 facts changed, 1 verdict flipped", which the owner signs.
   - The learner's affected records get kernelspace's `rev` "re-check" flag (ledger-v3 §4.5).
5. **For `sat`, check the witness, not the exact model.** Substitute the model into the constraints and check that they hold.

### A5-F3 · CRITICAL — PROVED is minted from pasted JSON, and the honest checker fails as "rejected" in the environments v1 proposes

**Where.**
- PLAN.md L160–168: "The site imports receipts (drag-drop or paste) and mints/updates claims"; "The grader is honest that it is not tamper-proof".
- L169–170 (three setup lanes) and L602–604 (the schema).
- Audit.dc.html L44.

**Evidence.**
- `lake build` plus `#print axioms` accept a kernel-bypassed proof of `1 = 2` (A2 F2). A same-named but weaker theorem builds green (A6 F1).
- **E3:** stock `lake comparator` rejects a weakened statement and a redefined `transfer`, and runs six kernels in 3 s.
  - Under default Docker, `bwrap` cannot create namespaces, so comparator exits **1**.
  - Its own help text defines exit 1 as "rejected: statement mismatch, forbidden axiom, kernel rejection, or a build that did not succeed".
  - It works only with three relaxed security options plus `/run/user/0`.
- Ubuntu 24.04 restricts unprivileged user namespaces through AppArmor [verified, release notes]. Native Ubuntu lanes and CI runners may hit the same wall; GitHub's runners are [unverified].
- macOS has no `bwrap` [inference].
- The learner builds with agents, so the realistic threat is drift (a weaker statement, a redefined function), not tampering (A6 F1, A8 F2).

**Problem.**
- The schema `{lab, version, tools, checks, lean?: {theorem, axioms[], sorry}[] …}` cannot say which statement was checked, by which invocation, or in what sandbox.
- A learner whose sandbox fails sees "rejected" for a correct proof.

**Recommendation.**
1. **Print the provenance lane on every stamp:**
   - *re-checked here*: the tab re-executed it;
   - *reported from your machine*: a receipt;
   - *self-assessed*: viva and notes;
   - later, *verified in your CI* (bold idea 3).
2. **A Lean PROVED requires a comparator receipt that records the sandbox state.**
   - `plinth doctor` tells a `bwrap` failure apart from a real rejection, using stderr.
   - It refuses to emit a receipt when the sandbox failed.
3. **Lab challenge packs.**
   - Each pack is `challenge/` plus `comparator.json` (theorem names, `definition_names` holes, permitted axioms).
   - Golden-behaviour theorems are pinned as extra challenge theorems, so `transfer := id` is caught even when `transfer` is a hole.
   - `verify:labs` must show three things: the template is rejected, the solution is accepted, and at least two mutants are rejected.
4. **Receipt v1 is a published JSON Schema** with these fields:
   - `schema`, `lab`, `labCommit`, `image` (digest), `os`;
   - `tools[{name, version, sha256}]`;
   - `runs[{argv, cwd, inputSha256, exit, stdoutSha256, outputs}]`;
   - `lean[{theorem, challengeSha256, comparator{exit, kernels[], sandbox}}]`;
   - `tlc[{specSha256, cfgSha256, argv, workers, checkDeadlock, distinct, depth, verdict, traceRef}]`;
   - `z3[{smtlibSha256, rlimit, verdict, reason}]`;
   - `provenance`, `tcb[]` (generated from the run, never typed), `at`.
5. **The Dev Container sets the three `runArgs` and installs `bubblewrap`.** Document Codespaces and CI after spike R6.
6. **Re-validate imported TLC counterexamples in the tab.** Each step must be a `Next` successor, and the last state must violate the invariant. A REFUTED from TLC then becomes *re-checked here*.

### A5-F4 · MAJOR — The learner's evidence has two homes, no versions, and a 7-day eviction risk

**Where.**
- PLAN.md L575–578: "progress lives in IndexedDB and is exportable … the Bench … is authoritative; the browser holds instruments, the Ledger and the Cabinet".
- L91–93: a claim is "a typed record".
- L129: "the first call is the one recorded".
- L305–307: the L1 README is "written as six-field claim cards".
- Roadmap L8: "Keep one evolving 'plinth-lab' repository".

**Evidence.**
- E15: Safari's 7-day deletion and heuristic `persist()`; `showDirectoryPicker` is Chromium-only.
- Kernelspace already solved multi-device sync and versioning in ledger v3 (ledger-v3 §4.1, §4.5, §4.8):
  - the envelope `{id, v, at, tz, day, kind, ref, rev?, dev}`;
  - a merge that is a join-semilattice;
  - `rev` content fingerprints, which flag "re-check" and never deduct.

**Problem.**
- Claims and specimens exist both as repo files and as browser records, with no sync rule. This is the course's own gap class 8 (model–implementation drift), applied to itself.
- Claims have no version, no provenance and no dependency edges. The Ledger's "Rests on" column is free text (Ledger.dc.html L66–74), so erosions cannot propagate (A6 F19).
- A Safari learner who takes a two-week break can lose months of calls.

**Recommendation.**
1. **The repo is the system of record** for durable evidence: `claims/*.yaml`, `specimens/`, `receipts/*.json`, and `broken/` beside `fixed/`. The CLI validates all of them against published schemas.
2. **The browser ledger holds practice events.**
   - It runs on the vendored ledger v3, with Plinth kinds: `call`, `run`, `specimen-mount`, `finding`, `viva` and `erosion-decision`.
   - Every graded event carries the item's `rev` and the engine version.
3. **Sync.**
   - Chromium writes straight into the repo folder.
   - Other browsers export and import a bundle, and `plinth ledger import` dedupes by event id.
   - Nudge for a backup after 7 idle days, and show an install prompt on iOS.
4. **A claim graph.**
   - Claim slots have stable template IDs, and the learner's versions hang off them.
   - Assumptions are first-class nodes, specimens crack assumptions, and an erosion propagates along the edges.
   - The assurance report is a traversal of this graph. Its JSON should be a stable, documented schema; A7-01 owns the vocabulary.

### A5-F5 · MAJOR — The Z3 instrument is specified on the harder lane: npm Z3 needs cross-origin isolation and a Python shim, and the 10 s timeout cannot work in the better lane

**Where.**
- PLAN.md L179: "official `z3-solver` npm (WASM) … Python syntax shimmed to the JS API; long queries time out at 10 s".
- DESIGN.md L100, Lesson.dc.html L68, Main.dc.html L73.
- PLAN.md L299 (lesson 1.1: "force an `unknown` with nonlinear arithmetic").

**Evidence.**
- Z3's JS README says "The package requires threads … `SharedArrayBuffer` … serve your page with special headers", and says of the coi-serviceworker trick that "you shouldn't use that trick in more complex applications" [verified].
- Pages cannot set headers, and Safari lacks COEP `credentialless`, so the service worker has to fall back to `require-corp` there (E8).
- E5: the Pyodide wheel runs real Z3Py in three engines with no isolation.
- E6: the timeout never fires. Z3's `scoped_timer` runs on a `std::thread` (`src/util/scoped_timer.cpp`) [source verified; that this is the cause is my inference]. `rlimit` works, and a reason-stable `unknown` exists.
- **Reconciliation.** A2 F11 says Pyodide "ship[s] no z3 package". That is true of Pyodide's own distribution, but the official PEP 783 wheel on PyPI installs with micropip (E5, E13). A6 F12 picks the same lane I do.

**Recommendation.**
- **Use Pyodide 314.0.7 with the z3 5.3.1 wheel.**
  - Self-host it and pin it by sha256.
  - Repack it without the duplicate `libz3.so` and the headers. This saves about 3.2 MB gzipped [estimated from the zip entry sizes].
  - Delete the shim.
- **Budgets are `rlimit`, never seconds.**
  - The UNKNOWN qualifier becomes "rlimit 5M · canceled".
  - `worker.terminate()` is the hard stop; a restart costs about 1.5 s.
- **Lesson 1.1 uses a reason-stable `unknown`,** `x**y == 8` (A2 F12).
- **Call It items are keyed to `(query, Z3 version, rlimit)`.** `verify:calls` runs the same wheel under Node and native z3 5.3.1, and fails if they disagree.
- **Correct the version strings on the artboards.**

### A5-F6 · MAJOR — Instruments share an origin with the learner's data, and kernelspace's sandbox pattern does not carry over to Pyodide

**Where.**
- PLAN.md L177–186: only Z3 is "in a worker".
- L586 (`instruments/`).
- PLAN.md and DESIGN.md contain no "sandbox" and no "iframe".

**Evidence.**
- E7: Python reached `js.indexedDB` from inside the worker [measured]. In a same-origin worker, that is the app's own database [inference from the same-origin policy].
- Kernelspace isolates untrusted Capstone code in `<iframe sandbox="allow-scripts">` with a blob worker (100X L643–645; `public/capstone-sandbox.html`).
- That pattern fails for Pyodide 314 in Chromium, because Pyodide needs a module worker and refuses classic workers (E7).
- A separate origin works in all three engines, blocks the parent's storage, and has a Cache API to keep the 13 MB of assets.

**Recommendation.**
- **Two Pages sites, still zero servers:** the app, for example `app.example.org`, and an instrument host, for example `instruments.example.org`.
- **One `postMessage` protocol:** `{engine, version, input, budget} → {verdict, witness, stats, provenance}`. The app treats every reply as data.
- **The instrument host sets CSP `connect-src 'self'`.**
- **Vendor everything Spectacle loads.** The earlier A5 reports that Spectacle fetches community modules for `EXTENDS` from `raw.githubusercontent.com`; I did not re-verify this.
- **Treat imported receipts and traces as untrusted:** validate the schema, cap the size, and never render them as HTML.

### A5-F7 · MAJOR — The Theater's own DSL explorer is a second semantics; use Spectacle for learner edits and TLC-built state graphs for authored scenes

**Where.**
- PLAN.md L181: "own explicit-state BFS for a small PlusCal-like DSL; plus TLC trace import (`-dumpTrace json`)".
- L141–143 (shortest witness).
- L194–200 (lassos; split/merge granularity).
- Theater.dc.html L92 and L99–105.

**Evidence.**
- E9 and E10.
- Spectacle is MIT-licensed; its author made 1,469 of its commits and the next contributor 22. Last push 2026-09-30 [verified].
- At 0.5–1.1k states/s, a 10⁴-state model takes about 10–20 s on a desktop and longer on a phone [derived].
- A2 F10: Spectacle's lasso transitions are disabled, and liveness needs fair-cycle checks.
- Stable TLC's `-dump dot,actionlabels` writes the whole graph with state labels (E9).

**Recommendation.**
- **Authored scenes run on TLC graphs built at build time.**
  - TLC is stable 1.7.4, sha256-pinned, run with `-workers 1` and an explicit `CHECK_DEADLOCK`.
  - The Theater navigates the precomputed graph: playing the scheduler means choosing an edge.
  - Monitors read invariant values computed at build time.
  - One semantics, no interpreter download, and it works on phones.
- **Learner-edited specs run in Spectacle** in the instrument origin, capped at about 5k states, with a "send to the Bench" prompt beyond that.
- **Liveness uses a small lasso validator** over the graph: the cycle is reachable, the property is false along it, and WF/SF are evaluated on the cycle (A2 F10's rule).
- **Counterexample import:** parse `-tool` output from 1.7.4, or pin the 1.8.0 jar by sha256 for `-dumpTrace json`.
- **Gate:** for every authored spec, Spectacle's verdict and distinct-state count must equal TLC's.
- **Split/merge granularity scenes** are two authored specs, each with its own graph.

### A5-F8 · MAJOR — The Lean lane is heavier than v1 assumes, and Goal Replay should be generated, not hand-recorded

**Where.**
- PLAN.md L184: Goal Replay "authored, recorded goal states".
- L209–211.
- L334: lesson 2.8, "Finmap/function update and a finite sum".
- L158: "`lake build` + `#print axioms`".

**Evidence.**
- E2: a 3.0 GB toolchain and a 566 MiB download.
- E4: Finmap needs Mathlib, at 7.3 GB, while core Lean compiles the ledger proofs.
- E11: goal extraction takes 0.3 s. For example, the extracted goal for the cons case reads `ih : ∀ (s : Ledger), total (run s ns) = total s ⊢ total (run s (n :: ns)) = total s`.
- E16: lean4web's URL parameters.
- Lean ships monthly (E2).

**Recommendation.**
- **Use core Lean only** for Courses 02–03, and for Course 09 too unless spike R8 shows otherwise: `AccountId → Int`, `List.sum`, `omega`, `decide`.
- **Generate the goal strips.**
  - `scripts/extract-goals.ts`, a small LSP client, writes JSON for each proof.
  - `verify:goals` regenerates the strips on every toolchain bump and fails on any diff until it is reviewed.
  - Each strip shows its Lean version.
- **Lint the authored proofs: one tactic per line.** `split <;> simp <;> omega` replays as a single opaque step.
- **Zero-install lane:** "Open in the Lean playground" links using `#codez=` and `mobile=true`. The playground is a third-party server, so label it and never credit work done there.
- **Freeze one Lean version per edition,** and upgrade through a drift PR.

### A5-F9 · MAJOR — The gates are an inventory, not a pipeline: no lanes, no cross-engine conformance, and several cannot do what they claim

**Where.** PLAN.md L606–617, L131–133, L141–143 and L613.

**Problems.**
- **`verify:calls`** spans five engines with no fast/heavy split.
- **`verify:specimens`** never defines "minimal" per engine:
  - Z3 has no shortest witness without an objective;
  - TLC gives the shortest only with `-workers 1` (A2 F10).
- **`verify:interp`** trusts `#eval`, which can disagree with the kernel (A2 F13).
- **`verify:audit`** checks only that a key and "a demonstrating specimen or a soundness argument" exist. It does not check that the case compiles, and A2 F4 shows the flagship case does not compile.
- **`verify:labs`** ("template fails, private solution passes") is satisfied by any `sorry` template. It never checks that the challenge pins its statements.
- **Missing gates:** bundle budgets, accessibility, dated external claims, lessons-md freshness, agent-kit compliance and receipt schemas.

**Recommendation.**

| Gate | Lane | Proves | Reuse |
|---|---|---|---|
| `verify:facts` | fast | every tool number, verdict and trace is a run reference (A5-F2) | new |
| `verify:calls` | fast (Z3, Spectacle); heavy (Lean, PG) | authored verdicts reproduce; witnesses are valid | new |
| `verify:conformance` | heavy | Spectacle = TLC; Pyodide-Z3 = native Z3; PGlite = PG 18.x on single sessions; Z3 Datalog = `ascent` | new |
| `verify:labs` | heavy | template rejected, solution accepted, ≥2 mutants rejected (comparator for Lean, kslab for Rust) | kernelspace `verify-labs`, `verify-wasm-lab` |
| `verify:audit` | heavy | each case compiles, its specimen reproduces, and sound cases pass | new |
| `verify:goals` | heavy | goal strips regenerate unchanged | new |
| `verify:claims` | fast | external facts are dated and sourced; expiry warns but never fails | kernelspace `verify-claims` |
| `verify:bundle` | fast | main chunk ≤250 KB gzipped; instruments lazy; >5 MB needs consent | kernelspace `verify-bundle` |
| `a11y` | heavy | axe at 360, 320 and 1280 px | kernelspace `a11y.mjs` |
| `verify:md`, `verify:guardrails` | fast | lessons-md is fresh; lab zips carry the agent kit | kernelspace |

- The fast lane blocks the PR and takes under 5 minutes.
- The heavy lane runs nightly and on matching paths. It files issues and never blocks a deploy (100X L653–655).

### A5-F10 · MAJOR — v1 rebuilds the substrate kernelspace has already built and tested, on an older stack

**Where.**
- PLAN.md L580–600; L596 ("Lesson blocks (new union; not kernelspace's)").
- L148–151 (Re-find as "a simple expanding-interval queue").
- `package.json`: `react ^18.3.1`, `vite ^5.4.11`, `react-router ^6.28.0`, `marked ^14.1.4`, `typescript ~5.6.3`, and `"test": "echo 'no tests yet'"`.

**Evidence.**
- Kernelspace runs `react ^19.2.0`, `vite ^7.2.4`, `react-router ^7.6.1`, `marked ^18.0.6`, `typescript ~5.9.3`, `zustand ^5.0.14`, `zod ^4.3.5`, `@playwright/test 1.63.0` and `@axe-core/playwright 4.13.0`. E14 lists its reusable modules.
- The family already reuses its own substrate. byzantine forked kernelspace's engine and wasm grader. tablespace "fork[s] byzantine … same lesson engine, same wasm lab grader, same pack pipeline" (tablespace-PLAN L17–19).
- The user's "do not copy kernelspace" covers "UI/UX, style, entire feel and mechanics" (roadmap L141–142), not persistence or CI.

**Recommendation.**
- **Vendor a `kit/` at a pinned SHA, with a drift script.** It contains:
  - the ledger engine (without `types.ts`) plus a Plinth event schema;
  - `fsrs.ts` and calibration, replacing the "simple expanding-interval queue";
  - `kc/graph`;
  - items core and grade, for generators;
  - `verify-claims`, `-bundle`, `-labs`, `-wasm-lab`, `-guardrails` and `-kc`;
  - `pack-labs.py` with the agent kit;
  - `a11y.mjs`, `export-lessons-md.ts`, `prepare-pages.mjs`;
  - `sw.js` with its kill switch;
  - the store-conformance tests.
- **Align the stack** to React 19, Vite 7 and router 7.
- **Keep every UI component and mechanic new.**
- **Cost:** vendoring is S–M in kernelspace's units; rebuilding is about three L items [estimated].

### A5-F11 · MAJOR — No agent-native surfaces, and the in-page BYOK examiner reverses a family decision

**Where.**
- PLAN.md and DESIGN.md never mention llms.txt or AGENTS.md.
- PLAN.md L244–247: a bring-your-own-key (BYOK) examiner, and "A course is set on passing its viva".

**Evidence.**
- Kernelspace ships:
  - `public/llms.txt` (140 lines);
  - 69 lessons-md files;
  - a `pack-labs.py` agent kit (a deny rule, a PreToolUse hook, a Socratic output style, and AGENTS.md and CLAUDE.md).
- 100X rejects an "In-page BYOK drawer" over "key custody, CORS fragility … and zero-server" (L802), and defers BYOK in L609 and OD8 (L824).
- llmstxt.org specifies a markdown version at the same URL as each page [verified].

**Recommendation.**
- **Generate `llms.txt` and the per-lesson `.md` pages** from the content source, and keep them fresh with `verify:md`.
- **Lab zips ship AGENTS.md and CLAUDE.md,** with deny rules that protect *statements* rather than proofs:
  - `challenge/**`, `comparator.json`, the statement fields in `claims/*`, and `receipts/**`;
  - per-course AI policy files (A6 U1: "agents may write proofs; you own statements").
- **Publish JSON Schemas** for receipts, claims and specimens at stable URLs.
- **Run the viva as a copy-paste agent packet** (kernelspace H2). It never credits *set*; A8 F1 owns that credential question.

### A5-F12 · MAJOR — 80 lessons at kernelspace's density, written by someone still learning the material

**Where.**
- PLAN.md §1 (L63–78) and §3.
- Roadmap L8: "20% reading … Study only the material needed".

**Evidence.**
- Kernelspace's lessons-md averages 1,666 words per lesson (E14), so 80 lessons would be about 133k words. On top come about 40 specimens, 32 audit cases, 11 vivas and 9 labs.
- v1's flagship audit case does not compile (A2 F4).
- The roadmap names a canonical external resource for each stage (L25, L43, L50, L59, L68, L75, L84, L93, L102).

**Recommendation.** Tier the 80 slots.

| Tier | Count | Content | Owner review |
|---|---|---|---|
| Core | ≈25 | Only where no external text exists: claims and assurance; Mini-Plinth semantics and decision records; the VCGen trust stack; refinement to Postgres; effects; application-level noninterference; compiler-preservation framing | 2–3 h each |
| Bridge | ≈40 | ≤1,000 words, plus an instrument, Call It items and the exact external chapter | 0.75–1 h each |
| Drill | ≈15 | Generated families: negate it, find the witness, which stamp, safety or liveness | per family |

- Agents draft, runs supply the facts (A5-F2), and the owner owns the statements.
- About 10–15 load-bearing theorem statements (C2.3, C3.1–C3.3, C4.3, C6.3, C9.1 …) get external review, for example on the Lean Zulip or the TLA+ group, before their course is *set*. Until then the course's own assurance page marks them ASSUMED.
- Use author-lag (A5-F1).

### A5-F13 · MAJOR — The Bench is seven toolchains in three lanes, behind a Python CLI that duplicates the site's schemas

**Where.**
- PLAN.md L155–159: Python and `uv`; `pytest`, `lake`, TLC, Docker Postgres, Soufflé, Alloy, `cargo`.
- L169–170: three setup lanes.
- L592.

**Evidence.**
- E2 (3.0 GB for Lean), E3 (what `bwrap` needs), E9 (TLC needs Java and a sha256 pin).
- Soufflé ships only x86-64 Linux packages, and Alloy needs Java 17+ (A4-06).
- The learner works in Rust (the roadmap lists "Postgres/Rust" and "Lean/Rust"), so a Rust Datalog engine fits.
- The kslab ABI has zero imports, and the host drives labs through `ks_invoke` (`src/lib/wasm-lab.ts`). So a pure Rust module can emit SQL or SMT-LIB, and the host runs the engines (A1 F8, Lane A).

**Recommendation.**
- **One digest-pinned Dev Container image** containing:
  - Lean 4.35.0 with `bubblewrap` and the three security options;
  - JRE 21 and `tla2tools`, pinned by sha256;
  - Postgres 18.x;
  - `uv` with z3-solver 5.3.1;
  - Rust with the wasm32 target;
  - `ascent`.

  Add a Codespaces prebuild, label the native lanes "best effort", and ship `plinth doctor`.
- **One schema source.** Write the CLI in TypeScript on bun so receipts, claims and specimens share zod schemas with the site and the gates. Alternatively, generate JSON Schema from the site and validate with it in Python. Never hand-maintain two schemas.
- **Rust labs graded on kslab:**
  - VCGen emits SMT-LIB, and the host runs Z3;
  - the SQL compiler emits SQL, and the host runs it on PGlite, one session at a time;
  - the deterministic simulator is pure, and its traces are checked against the TLA+ graph;
  - the translation validator.

  Lean, TLC and multi-connection Postgres stay receipt-based.
- **Soufflé or Alloy becomes one engine.** `ascent` fits a Rust learner (A4-06).

### A5-F14 · MAJOR — No phone contract, no payload budget, no offline story

**Where.**
- DESIGN.md L116–124: only gutters, 44 px targets and keyboard support.
- `canvas.json`: all six boards are 1280 px wide.
- Theater.dc.html L55 (`min-width:900px`) and Ledger.dc.html L19 (`min-width:880px`).
- PLAN.md and DESIGN.md never mention offline, cache or consent.

**Evidence.**
- Payloads on the wire:
  - Z3: 13 MB gzipped (E5);
  - PGlite: 5.7 MB (E12);
  - Spectacle: about 0.4 MB (tree-sitter wasm 76 KB, grammar 258 KB and `eval.js` 50 KB, from E8's `curl`).
- Lean cannot run on a phone (E2), and Pages sends `max-age=600` (E8).
- At 10 Mbit/s, 13 MB takes about 10 s [derived].
- Kernelspace has a mobile contract (100X L629–633). A7-21 designs the per-screen phone layouts.

**Recommendation.**
- **Phone mode:** predict, then see the build-verified recorded run with its run ID shown, then queue the hands-on part for the laptop. Label the Bench "laptop only".
- **Live on phones:**
  - the Theater on precomputed graphs (A5-F7);
  - Today and Re-find, using tiny witness checkers (bold idea 6);
  - lean4web links.
- **Z3 and PGlite on phones only after consent** (they exceed 5 MB). Cache them in the instrument origin's Cache API under content-hashed URLs. Use a service worker with a kill switch (kernelspace `sw.js`).
- **Gates:** `verify:bundle` budgets, a 360 px smoke test at every phase exit, and the real-device spike (R1).

### A5-F15 · MINOR — Thirteen new block types at once

**Where.** PLAN.md L596–600.

**Evidence.** Kernelspace capped new block types at four per wave (100X L601). Each type needs a schema, a renderer, a markdown export, accessibility work, tests and generator hooks.

**Recommendation.**
- Ship at most six in Phase A: `prose`, `instrument`, `callit`, `claim`, `specimen`, `margin`.
- Add `goal-replay`, `theater` and `audit-ref` in their own phases.
- `derivation` is a stretch item; `drawer` is a variant of prose.

### A5-F16 · MINOR — PGlite cannot show concurrency, and its README understates its size

**Where.** PLAN.md L182, L456, and L629 (the P4 exit "E1 fires from a real Postgres run").

**Evidence.**
- E12.
- The README says "PGlite is single user/connection" and "only 3mb gzipped" [verified].
- A2 F9.
- tablespace teaches MVCC and write skew (tablespace-PLAN L93–94), and its lab 04 runs "under a deterministic interleaving scheduler" (L113).

**Recommendation.**
- Call the browser piece a **history viewer** for Bench recordings.
- Pin Bench Postgres to PGlite's server version (18.6 for 0.5.10; re-check for 0.5.11), and record both versions on receipts.
- Cross-link tablespace T4.
- Budget 5.7 MB for PGlite.

### A5-F17 · MINOR — A TypeScript Datalog evaluator is unnecessary

**Where.** PLAN.md L183.

**Evidence.**
- E6: `Fixedpoint`, with stratified negation, ships in the same wheel.
- `ascent` runs on the Bench (A4-06).

**Recommendation.**
- Run Z3 `Fixedpoint` in the tab and `ascent` on the Bench.
- Gate that both produce equal relations.
- Teach the gap between their surface syntaxes.

### A5-F18 · MINOR — No accessibility gate, and the Derivation Board is drag-only

**Where.**
- DESIGN.md L122–124.
- PLAN.md L204–205: "dragging substitutions".
- Neither file mentions WCAG or axe.

**Evidence.**
- WCAG 2.2 SC 2.5.7 (AA): "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging" [verified].
- Kernelspace's gate: 100X L635–641 and `a11y.mjs`.
- A7-17 and A7-18 cover controls, traces and how glyphs are spoken.

**Recommendation.**
- Reuse `a11y.mjs` on Plinth's routes.
- Rebuild the Derivation Board as a keyboard-first substitution stepper, with no dragging.
- Render the Theater as a real table with a live region.
- Give the Elevation drawing a DOM mirror.
- Run an NVDA and VoiceOver pass at every phase exit.

### A5-F19 · MINOR — Phase exits are features, not outcomes, and two phases are overloaded

**Where.** PLAN.md L625–631.
- P0 bundles the design system, the lesson engine, Z3, Call It, the Cabinet, the Ledger, Courses 00–01, the Bench and receipts.
- P3 bundles Courses 05 and 08 with three instruments.
- Exits read like features: "Precision/recall scoring live", "Erosions E2, E4 fire".

**Recommendation.** Use the plan in §5. A phase exits only when all of these hold:
- the gates are green;
- the owner and at least 2 partners complete the loop;
- a 360 px smoke test passes;
- the owner-hours log is within ±25% of the estimate, or the plan is re-costed.

Each erosion ships with both of its endpoints, or it is deferred.

### A5-F20 · MINOR — The TypeScript Mini-Plinth interpreter is a third semantics

**Where.** PLAN.md L180, L373–375, L564 and L613.

**Evidence.**
- `#eval` can disagree with the kernel through `implemented_by` (A2 F13).
- Differential testing of a Rust runtime against a Lean reference is the approach AWS published for Cedar (A1 F8).

**Recommendation.**
- Replace the TypeScript port with a Rust reference interpreter compiled to wasm on the kslab ABI.
- Differential-test it against kernel-checked Lean goldens, reporting n.
- Course 10 grades the learner's own interpreter with the same harness.

---

## 4. Recommended architecture

```
learner's lab repo (system of record)                    app origin: app.example.org (GitHub Pages, static)
  claims/*.yaml  specimens/  receipts/*.json               UI, all new: Elevation · Lesson · Theater · Audit · Cabinet · Ledger · Today
  broken/  fixed/  ledger/*.jsonl (exported events)        kit/ (kernelspace @ pinned SHA): ledger v3 + Plinth kinds · FSRS-6 ·
  challenge/  comparator.json   (read-only to agents)        calibration · KC graph · items/generators · claims registry · verify-* ·
  AGENTS.md  CLAUDE.md  .claude/ (deny rules + hooks)        pack-labs + agent kit · a11y sweep · sw.js · lessons-md + llms.txt
  plinth CLI (bun/TS; zod schemas shared with the site):   generated/  <- runs/  (facts compiled in CI; content cites run ids)
    doctor · bench check -> receipt v1 · export · report       | postMessage {engine, version, input, budget}
                                                               v             -> {verdict, witness, stats, provenance}
Bench: one digest-pinned Dev Container                   instrument origin: instruments.example.org (second Pages site)
  Lean 4.35 + bubblewrap (3 security opts)                 Pyodide 314.0.7 + z3 5.3.1 wheel (rlimit) · Z3 Fixedpoint (Datalog)
  JRE 21 + tla2tools 1.7.4 (sha256) · Postgres 18.x        Spectacle @ pinned SHA (learner-edited specs, <= ~5k states)
  uv + z3-solver 5.3.1 · Rust + wasm32 · ascent            PGlite (one session) · kslab wasm runner (Rust labs)
                                                           Cache API for content-hashed assets; no access to app storage
CI: fast lane (< 5 min, blocks) · heavy lane (nightly + path-filtered, files issues) · drift PR on every tool bump
Authored Theater scenes: TLC state graphs built in CI -> JSON -> navigated in the tab and on phones
```

**Principles.**
1. Each kind of evidence has one home: artifacts in the repo, practice events in the browser ledger.
2. Every tool-derived fact is a run.
3. Re-execute in the tab whatever can be re-executed, and label everything else with its lane.
4. Instruments never share an origin with learner data.
5. Phones get recorded runs and precomputed graphs; anything over 5 MB needs consent.
6. Reuse kernelspace below the UI line; everything above it is new.

| Need | v1 | Recommended | Evidence |
|---|---|---|---|
| SMT in the tab | npm Z3 + COOP/COEP + Python shim + 10 s timeout | Pyodide wheel, `rlimit`, separate origin | E5–E8 |
| Model checking in the tab | own DSL BFS + `-dumpTrace json` | TLC graphs built in CI for authored scenes; Spectacle for edits; lasso validator | E9, E10 |
| Lean | hand-recorded Goal Replay; `lake build` + axioms | goal strips extracted by LSP; comparator challenge packs; core Lean; playground links | E2–E4, E11, E16 |
| Datalog | TS semi-naive evaluator | Z3 `Fixedpoint` + `ascent` | E6 |
| SQL | PGlite, "replayed here" | PGlite as a single-session history viewer; PG 18.x permutations on the Bench | E12 |
| Interpreter | TS port vs `#eval` | Rust→wasm reference, tested against kernel-checked goldens | A2 F13 |
| Data | IndexedDB + repo | repo as record + vendored ledger v3 + claim graph | E14, E15 |

---

## 5. Recommended phase plan

Each phase is paced by the maintainer's own stage (author-lag). Hours are owner attention [estimated].

| Phase | Paced by | Owner h | Scope | Exit |
|---|---|---|---|---|
| **S · Spikes and kit** | 1–2 weeks | 15–20 | the §6 spikes; vendor the kit; the two-origin skeleton; the `runs/` registry; CI lanes; decision records | every open spike has a dated result or a decision |
| **A · Project 00 in the tab** | owner's Stage 1 (2–4 sessions) | 45–65 | see note A below | owner + ≥2 partners finish Project 00 end to end; every Course 01 number is a run; fast lane < 5 min |
| **B · Proof** | Stages 2–3 (7–14 wk) | 60–80 | a Lean Dev Container with comparator challenge packs; goal extraction and Goal Replay; playground links; Courses 02–03; L2–L3; Audit Desk v0; the heavy lane | receipts come from comparator and record the sandbox; a Lean bump produces a drift PR that the owner reviews |
| **C · Obligations + Time** | Stages 4–5 (6–12 wk) | 45–60 | VCGen lab (kslab Rust or Lean); Course 04 (the Derivation stepper is stretch); TLC graphs, Theater, Spectacle and the lasso validator; Course 05; L4–L5; conformance gates | Spectacle = TLC on every authored spec; one TLC counterexample imported and re-checked in the tab |
| **D · Correspondence + Secrecy** | Stages 6–7 (8–16 wk) | 40–55 | the PGlite viewer; the PG permutation lane; the SQL compiler on kslab; Courses 06–07; Z3 Datalog + `ascent` | PGlite = PG on single-session cases; the Datalog engines agree |
| **E · Effects + Preservation + Assembly** | Stages 8–10 (9–16+ wk) | 45–65 | the deterministic simulator on kslab, with its traces checked against the TLA+ graph; Courses 08–09; Course 10; an assurance report generated by the CLI | a Plinth Core report reproducible in CI from the learner's repo |
| **Total** | ≈ the learner's 9–18 months | **≈250–345** | | |

**Phase A scope:**
- the shell and design system;
- Call It (recorded, never locked);
- the Z3 instrument and the facts compiler;
- repo schemas for claims and specimens;
- CLI v0 (a `pytest` lane and receipt v1);
- Course 00 (placement plus drawers) and Course 01; L1;
- 3 audit cases written as code;
- Today v0 on FSRS;
- llms.txt and lessons-md;
- phone lessons with recorded runs;
- the accessibility gate.

**Cut order.** Apply it whenever the owner queue exceeds 10 h at a gate:
1. the Derivation Board;
2. Judgment's per-type breakdown (keep calibration, with n shown);
3. Alloy (keep `ascent` only);
4. the Elevation drawing (render it as a list from the same data);
5. the Deferred Shelf UI (it becomes a markdown page);
6. bridge lessons beyond 30 (they become curated readings with Call It sets);
7. erosions whose two endpoints have not both shipped.

---

## 6. Riskiest assumptions and cheap spikes

| # | Assumption | Status after this session | Spike | Cost |
|---|---|---|---|---|
| R1 | Z3Py runs in the tab on Pages without isolation | **Retired** on desktop engines (E5, E7) | Real iPhone (Safari) and mid-range Android: load time, memory, `rlimit` timing, Cache API persistence | 2 h |
| R2 | "Long queries time out at 10 s" | **Falsified** (E6) | Calibrate one `rlimit` per Call It item; gate wasm = native verdicts | 3 h |
| R3 | Instruments can be isolated cheaply | Kernelspace's pattern **fails in Chromium**; a separate origin **works** (E7) | Deploy a scratch second Pages site on a subdomain; check caching, CORS and Safari storage partitioning | 1–2 h |
| R4 | An own explorer is needed | **Retired** (E10) | Build the TLC graph for the holds lifecycle with crash and duplicate actions; measure states and JSON size; check Spectacle's operator coverage on it | 3 h |
| R5 | TLC JSON trace import works on a pinned stable release | **Falsified** (E9) | Choose `-tool` parsing or a sha256-pinned 1.8.0 jar; import one lasso | 2 h |
| R6 | Comparator runs where the learner works | **Partly retired**: works with three options (E3) | Codespaces; GitHub Actions `ubuntu-24.04` (AppArmor user namespaces); macOS native (no `bwrap`) | 3 h |
| R7 | Goal Replay must be recorded by hand | **Retired** (E11) | Render 3 strips; add the one-tactic lint; regenerate across 4.35 → 4.36 | 2 h |
| R8 | Mathlib is needed | **Falsified** for Courses 02–03 (E4); open for Course 09 | A forward-simulation proof for a two-instruction IR in core Lean | 3 h |
| R9 | PGlite shows concurrency | **Falsified** (E12) | Run the single-session case catalogue on PGlite 0.5.11 vs PG 18.x | 1 h |
| R10 | A TS Datalog evaluator is needed | **Retired** (E6) | Diff Z3 `Fixedpoint` against `ascent` on the L7 policy | 2 h |
| R11 | The kernelspace kit vendors cleanly | **Partly**: coupling mapped (E14) | Compile the ledger engine, FSRS and the KC graph in the Plinth repo with Plinth kinds; run store-conformance | 4 h |
| R12 | The owner can author a correct core lesson right after a stage | **Open** | Author lesson 1.5 ("The encoding is the claim") on the facts compiler right after Stage 1; log hours and errors caught by gates | 4 h |
| R13 | A 9–18-month ledger survives Safari | **Open** (E15) | iOS Home Screen install, the `persist()` result, an 8-day idle test, an export/import round trip | 1 h + wait |
| R14 | Owner attention suffices | Not retirable by a spike | Log minutes per PR from Phase A; re-plan at every gate | — |

---

## 7. Bold ideas

1. **The course compiles itself from runs, and erodes in public.**
   - Every number, verdict, trace and goal strip is the build output of a pinned run.
   - A tool bump re-runs the course and produces a semantic diff, for example "Z3 5.3.1 → 5.4.0: 2 verdicts changed, 9 models changed".
   - The diff appears as an EROSION banner on the course's own `/assurance` ledger, and learners' affected calls get "re-check" flags.
   - The first ledger a learner reads is the course's own.
2. **Two origins, one instrument bus, three consumers.**
   - The same worker protocol serves the learner's tab, CI (where Playwright drives the same instrument host to run `verify:calls`), and later the learner's own tooling.
   - One implementation serves three trust surfaces.
3. **"Verified in your CI" receipts.**
   - The plinth-lab template ships a GitHub Actions workflow. On every push it runs `lake comparator --paranoid`, TLC with pinned argv, and the Postgres permutation suite.
   - For public repos it publishes Sigstore-backed artifact attestations, which go to a public transparency log.
   - The result is a dated, public assurance trail with zero course servers.
4. **Your agent's commits become the Audit Desk.**
   - `plinth audit-harvest` scans the learner's history for agent-co-authored commits that touched `challenge/`, `claims/` or proofs.
   - Each one becomes a case: the statement diff, comparator's verdict before and after, and the claim the agent made in its commit message.
   - By Course 06 the Desk is auditing the learner's own code.
5. **One state graph, three views.**
   - TLC builds each authored scene's full graph in CI. The Theater, the lasso validator and the phone view all navigate it.
   - Spectacle runs only on learner edits.
   - Any disagreement between Spectacle and TLC is mounted as a tool-trust specimen.
6. **Pocket checkers.**
   - Each specimen compiles to a TypeScript predicate of a few KB that evaluates its constraints on ground values.
   - A witness typed on a phone at a bus stop is checked instantly and offline, with no solver download, and Re-find works on phones.
7. **The family course kit.**
   - Once Plinth adopts the kit, extract it as `course-kit`: ledger v3, FSRS-6, the KC graph, the claims registry, the facts compiler, the verify gates, pack-labs with the agent kit, the two-origin instrument host and the accessibility sweep.
   - Kernelspace, byzantine, tablespace and Plinth stop drifting apart, and each fix lands once.
8. **Tool-trust specimens from this review.** Dated, run-backed Audit Desk cases from this session:
   - Z3's `timeout` silently never fires in the single-threaded build;
   - TLC reports a deadlock before the bug unless you pass `-deadlock`;
   - comparator reports a failed sandbox with the same exit code as a rejected proof;
   - a README claims 3 MB for a 5.7 MB payload;
   - a flag exists only in a rolling pre-release.

   Each case asks: what was the invocation, and what does this result establish?

---

## 8. Sources (accessed 2026-10-21 unless dated)

**Tools and registries**
- Lean v4.35.0 release (tag `eb6cafb`, 2026-10-12): https://github.com/leanprover/lean4/releases/tag/v4.35.0 ; release list (v4.36.0-rc1, 2026-10-14): https://github.com/leanprover/lean4/releases
- Mathlib4: https://github.com/leanprover-community/mathlib4
- lean4web URL arguments: https://github.com/leanprover-community/lean4web/blob/main/doc/Usage.md ; README ("server-side"): https://github.com/leanprover-community/lean4web
- z3-solver on PyPI (5.3.1.0, 2026-10-15): https://pypi.org/project/z3-solver/5.3.1.0/#files ; JSON API: https://pypi.org/pypi/z3-solver/json
- z3-solver on npm (5.3.1, 2026-10-16): https://www.npmjs.com/package/z3-solver
- Z3 JS README: https://github.com/Z3Prover/z3/blob/master/src/api/js/PUBLISHED_README.md
- Z3 `scoped_timer`: https://github.com/Z3Prover/z3/blob/master/src/util/scoped_timer.cpp
- Pyodide on npm (314.0.7, 2026-09-14): https://www.npmjs.com/package/pyodide
- PGlite on npm (0.5.11, 2026-10-21): https://www.npmjs.com/package/@electric-sql/pglite ; README: https://github.com/electric-sql/pglite
- ts-fsrs on npm (5.4.2, 2026-09-01): https://www.npmjs.com/package/ts-fsrs
- TLA+ tools releases (v1.7.4 "Latest", 2024-08-05; v1.8.0 pre-release, 2026-10-20): https://github.com/tlaplus/tlaplus/releases
- Spectacle (MIT, pushed 2026-09-30): https://github.com/will62794/spectacle
- coi-serviceworker: https://github.com/gzuidhof/coi-serviceworker

**Platforms and standards**
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub community discussion #13309 (COOP/COEP on Pages): https://github.com/orgs/community/discussions/13309
- MDN compat data, COEP: https://github.com/mdn/browser-compat-data/blob/main/http/headers/Cross-Origin-Embedder-Policy.json
- MDN compat data, `showDirectoryPicker`: https://github.com/mdn/browser-compat-data/blob/main/api/Window.json
- WebKit, "Updates to Storage Policy" (2023-08-10): https://webkit.org/blog/14403/updates-to-storage-policy/
- WebKit, "Full Third-Party Cookie Blocking and More" (7-day cap, 2020-03-24): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- Ubuntu 24.04 release notes (AppArmor user-namespace restriction): https://documentation.ubuntu.com/release-notes/24.04/
- GitHub artifact attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations
- llms.txt: https://llmstxt.org/
- WCAG 2.2 SC 2.5.7: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html

**Family**
- Kernelspace repo and PRs #3–#25: https://github.com/praveer13/kernelspace ; PR #18: https://github.com/praveer13/kernelspace/pull/18
- Local (session working files, not published): `kernelspace-PLAN-100X.md`, `kernelspace-specs/ledger-v3.md`, `kernelspace-100x-evidence/audit/content.md` and the sibling plans.

**This session's runs**
- `A5r3/` (all scripts and logs listed in §1).
- Earlier spikes reused, with re-checks noted: `research/evidence/A5v2/` and `research/spikes/RESULTS.md`.

---

## 9. Changes from the earlier A5, and reconciliation with other lenses

**Changes from the earlier A5.**
- **Capacity.** The "≈950 h, about two years" estimate used planned unit costs. It is replaced by observed throughput (E1) and an owner-attention budget (§2.4).
- **Isolation.** The earlier A5 recommended an opaque-origin sandboxed iframe for every instrument. That fails for Pyodide 314 in Chromium (E7), so the recommendation is now a separate origin.
- **Comparator.** The earlier A5 noted that the sandbox needs `bwrap`. I have now measured three things: it exits 1 under default Docker; it works with three options; and Ubuntu 24.04 restricts user namespaces.
- **New measurements:** Spectacle's throughput and its 3–5-worker conformance with TLC; the TLC graph approach; payload figures for Pages delivery; the separate-origin Cache API.
- **Corrections:** kernelspace has 19 `verify-*` scripts, and its generic ledger engine is ≈3,950 lines. PGlite has moved to 0.5.11. The earlier R10 (Pages CORS and compression) is retired by E8.

**Reconciliation with other lenses.**
- **A2 F11** suggests SMT-LIB or the TS API in the browser. The Pyodide wheel exists and works in three engines, and A6 F12 concurs.
- **A2 F10 and A6 F11** concur on Spectacle. This review adds the TLC graph approach and the throughput limits.
- **A7-21** owns the phone layouts; **A7-17 and A7-18** own visual accessibility; **A1 F8** owns the mapping of labs to languages; **A8 F1 and A3 C2** own the *set* credential.

---

## 10. Unverified or open

- **Real devices.** I did not measure phone timing or memory (R1). My CDP throttling run was invalid and discarded.
- **Comparator outside Docker.** I did not test the sandbox on GitHub Actions `ubuntu-24.04`, in Codespaces, or on macOS (R6).
- **Attestations.** Plan availability of artifact attestations for private repos is not stated on the docs page.
- **Spectacle.** Its behaviour beyond 813 states and its operator coverage on the holds and outbox specs are untested. That it fetches `EXTENDS` modules from GitHub comes from the earlier A5's code reading, not from me.
- **Mathlib download time.** The earlier spike's 3 s `cache get` probably hit a warm cache.
- **One person, two roles.** That the maintainer and the first learner are one person is an inference.
- **Kernelspace review hours.** The hours its owner actually spent are not public. §2.2 shows only that the calendar was not bound by the 10 h/week plan.
- **Estimates.** Every effort figure is [estimated], from the stated assumptions.
