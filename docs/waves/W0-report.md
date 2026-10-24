# W0 wave report: spikes and foundations

**Status:** the integration record of wave W0, written after the wave workflow's twenty W0 tasks had finished and been verified. W0-T11 files the exit record (`docs/waves/W0-exit.md`); this page is one of its inputs. **Date:** 2026-10-24 (machine clock). **Gate run:** [X RUN-w0-integration].

## 1. Summary

- **Twenty tasks ran and all twenty passed verification.** The workflow ran W0-S01 to W0-S12 and W0-T01 to W0-T08: one implementer per task on the tracker's model, then an independent adversarial verifier (opus) that re-ran the acceptance checks, and up to two fix rounds. Sixteen passed at the first verification; W0-S04, W0-S06, W0-T01 and W0-T06 passed after one fix round each. All twenty have owner review, so each is now `review` in `tracker/tasks.yaml` and `[=]` in `docs/TRACKER.md`, with a note on what remains.
- **Four W0 tasks did not run and stay `todo`:** W0-T09, W0-T10, W0-S13 (proposed, not adopted) and W0-T11 (section 6).
- **Gates after integration** (section 4): GATE-numbers, GATE-facts, GATE-schema and GATE-runs pass; GATE-budget passes with four warnings that wait on owner rulings. GATE-links fails on one finding, SCR-instrument implemented by no task, and GATE-privacy on one, the missing license beside `vendor/kernelspace/` (OD-16). The fast lane is red until both are fixed; neither is a defect in the W0 work.
- **Several results stand on labeled local substitutes**, because this machine has no custom subdomain, no phones, no Docker Desktop, no Codespaces and no GitHub Actions run. Each run record and decision record says so, and section 5 lists the owner action that completes each one.
- **The owner's review queue is 13.75 hours** (section 7), above the 10-hour gate (OD-7), so no further task with owner review starts until the owner has reviewed some of the twenty.

## 2. Tasks

Verdict is the final adversarial verifier's verdict. A task the implementer marked partial passed because its owner-blocked part was done as a labeled local substitute with the owner action listed, as the wave's rules allow; the verdict cell says so.

| Task | Title | Model | Verdict | Fix rounds | Runs recorded | Decision |
|---|---|---|---|---|---|---|
| W0-S01 | Instrument origin on a custom subdomain | opus | pass | 0 | RUN-origin-subdomain (emulated: `.test` origins with a per-run test CA, three engines in the Playwright image) | OD-5 stands: the instruments live on their own same-site subdomain behind the handshake; the framed cache persists across desktop sessions; adopt `sandbox="allow-scripts allow-same-origin"`; fallback another static host, I6 never relaxed |
| W0-S02 | Pyodide-Z3 on real phones | sonnet | pass; real devices are the owner's | 0 | RUN-phone-pyodide (emulated: CPU-quota tiers in the Playwright image; no phone) | INS-z3 stays in the tab behind consent and no lesson waits for it; consent is counted from the build manifest; the Boot timing budget for W1-T41 is provisional until phone sessions are recorded |
| W0-S03 | Z3 `Fixedpoint` for Stage 7 | sonnet | pass | 0 | RUN-fixedpoint-equal | INS-datalog is `Fixedpoint` in the Pyodide worker, behind an adapter that owns the checks, the translation, derivations and the budget; whether the faster naive evaluator becomes the tab engine is left to the owner |
| W0-S04 | Spectacle on Stage 5/8 specs and state pairs | opus | pass | 1 | RUN-spectacle-s5s8 (re-recorded in the fix round from unchanged engine outputs) | a configuration is Spectacle's only when it equals TLC in every engine within the interactive budget [D]; liveness, action properties, symmetry and trace validation are Theater-only; the spec-by-spec list is in the record's section 5.2 |
| W0-S05 | TLC lasso JSON | sonnet | pass | 0 | RUN-tlc-lasso-json | `lasso@1` is TLC's JSON trace as written, read by six rules and a strict draft schema; the property is named from the receipt; fallback the older jar's text trace |
| W0-S06 | Sandbox lanes and `--paranoid` timing | sonnet | pass; the three lanes are labeled substitutes | 1 | RUN-bwrap-lanes | the sandbox is recorded as on, off or failed and never required; a sandbox failure is told from a rejection by a `bwrap:` line, never by exit code; each `--paranoid` mode goes where its cost buys something |
| W0-S07 | `vcgen` on a custom `Cmd` | opus | pass | 0 | RUN-vcgen-cmd | `vcgen` works on a Mini-Plinth-style command type; the S4.L9 twin stays dated and experimental; the course ships the glue and the learner does not write it |
| W0-S08 | PGlite RLS and first-load size | sonnet | pass | 0 | RUN-pglite-rls, RUN-pglite-0511 | S7.L4 runs in the tab on PGlite on laptops, with the Bench authoritative; PGlite asks for consent first; one instance per worker, reset between items; every RLS statement follows a `SET ROLE` |
| W0-S09 | PostgreSQL 18.6 isolation catalog rows | sonnet | pass | 0 | RUN-pg-catalog | rows H01 to H24 recorded in isolationtester format; the retry rule stays a [D] policy with its basis recorded; the seeded grid is GEN-anomaly-id's pool |
| W0-S10 | Goal Replay via `$/lean/plainGoal` | sonnet | pass | 0 | RUN-replay-gen | strips are generated through `$/lean/plainGoal` in the pinned image, read at the start of each tactic and at the end of the proof; GATE-replay requires byte equality |
| W0-S11 | Receipt schema, `runs/`, lints | opus | pass | 0 | 44 records: 31 imported from `research/`, 13 recorded or re-run here, among them RUN-lean-wasm, RUN-lean-plaingoal, RUN-numbers-gate and RUN-runs-gate | `receipt@1` and `run@1` published, `run@1` with the snake_case fields the W0 records share; GATE-numbers and GATE-runs built |
| W0-S12 | Vendoring and a React 19 / Vite 7 scaffold | sonnet | pass | 0 | RUN-scaffold, RUN-souffle-version, RUN-apalache-version, RUN-alloy-version, RUN-juliamono-glyphs | kernelspace vendored at one commit with per-file SHA-256; it has no license upstream, so VENDOR.md carries a TODO and no invented grant; the site and instrument apps scaffolded on the pinned stack |
| W0-T01 | Publication hygiene | opus | pass; the license blocker is the owner's | 1 | RUN-privacy-gate | GATE-privacy built, with the private term list kept as keyed hashes in CI secrets; it fails only on the missing kernelspace license, and a labeled placeholder-license copy shows it green |
| W0-T02 | One JSON Schema with TypeScript and Python codegen | sonnet | pass | 0 | RUN-schema-gate, RUN-schema-self-check, RUN-trimright-engines | `schemas/` is the single source for both languages' types; the statement hash is written once and agrees across TypeScript and Python; patterns use only constructs both validators read alike |
| W0-T03 | ID registry generated from this spine | sonnet | pass | 0 | RUN-links-gate | `packages/ids` is generated from the spine; GATE-links resolves IDs, checks ownership and "Used in" cells, and compares `docs/TRACKER.md` with `tracker/tasks.yaml` |
| W0-T04 | CI lanes: fast, nightly, release stub | sonnet | pass | 0 | RUN-ci-fastlane (emulated: a 4-CPU container on this host; not a GitHub run) | four thin workflows over one lane runner and `gates.json`; the nightly status goes to the `nightly-status` branch; GATE-runs' release mode runs only in the release lane |
| W0-T05 | Devcontainer, `statespace doctor`, Codespaces prebuild | sonnet | pass | 0 | RUN-doctor-devcontainer | the digest-pinned Bench image ends its build with `statespace doctor`; the sandbox is recorded on, off or failed; Codespaces, Docker Desktop and arm64 were not run |
| W0-T06 | GATE-budget over the stage plans | sonnet | pass | 1 | RUN-budget-gate | GATE-budget is green with warnings; the S10 cadence holds only by counting two planned records, which the gate now reports as a warning pending the owner's ruling |
| W0-T07 | Keep/kill rules fixed in advance (n = 1) | opus | pass | 0 | RUN-keepkill-rules | the four comparisons are fixed with arms, allocation by seed, thresholds, read points and defaults; the file's SHA-256 is recorded and GATE-schema checks it |
| W0-T08 | GATE-facts and the facts registry | opus | pass | 0 | RUN-facts-gate | GATE-facts checks value tags and value references, not plain citations; the facts registry's TTLs warn and never fail |

The four fix rounds: W0-S04 corrected two figures in its decision record; W0-S06 took the LAB-2 solutions out of the public tree and made the harness read them from a private directory; W0-T01 recorded its placeholder-license substitute and an account-identifier check; W0-T06 made GATE-budget say that the S10 cadence passes only with two planned records.

## 3. Integration changes

Changed, at another task's request or because the integration's own gate run found the problem:

| File | Change | Asked by |
|---|---|---|
| `package-lock.json` | the two link entries for `packages/runs`, written by `npm install --package-lock-only` and identical to the patch W0-T08 left; without them `npm ci`, the fast lane's install step, fails | W0-T04, W0-T08 |
| `packages/schema/test/validate.test.ts` | the list of embedded schemas includes `receipt` and `run`, which W0-S11 published | W0-S11, W0-T04 |
| `packages/runs/test/check.test.ts` | two tests that need a run which is not on disk name one that is never recorded; they used RUN-phone-pyodide, which W0-S02 recorded during the wave | the integration's `npm test` |
| `schemas/codegen/self-check.mjs` | the planted keep/kill run record carries the `run@1` core fields, and the `--strict` scenario removes `receipt.schema.json` from its scratch copy, so both scenarios test what they did before `run@1` landed | W0-S11, W0-T04 |
| `schemas/README.md` | the status line and two table rows say that `receipt@1` and `run@1` are published | W0-S11 |
| `runs/README.md` | the value-tag form `[X RUN-id#values.name]` in the citation table | W0-T08 |
| `scripts/spikes/W0-T04/gates.json` | a `facts-self-check` step in the nightly and release lanes, beside the other gates' self-checks | W0-T08 |
| `.gitignore` | `status/nightly.json`, a generated file, and the three paths of W0-S06's private LAB-2 fixtures | W0-T04, W0-S06 |
| `.gitattributes` (new) | no line-ending conversion for the hashed keep/kill rules; LF for Lean sources and the Goal Replay strips | W0-T07, W0-S10 |
| `packages/ids/proposals.json` | ten run IDs pending registration: RUN-privacy-gate, RUN-schema-gate, RUN-schema-self-check, RUN-trimright-engines, RUN-links-gate, RUN-budget-gate, RUN-facts-gate, RUN-numbers-gate, RUN-runs-gate and RUN-w0-integration; W0-T10 registers or declines each | W0-T02, W0-T03 |
| `tracker/tasks.yaml`, `docs/TRACKER.md` | the twenty statuses and notes (section 7), the status line of `docs/TRACKER.md`, and the tag [X RUN-bwrap-lanes] on W0-S06's line, whose new marker took its `--paranoid` flag out of GATE-numbers' known-debt list | the wave workflow |
| `runs/index.json` | regenerated with `node scripts/runs/build-index.mjs`, before the gate run and again after its record was written | W0-S02, W0-S04, W0-S06, W0-T04, W0-T05, W0-T06, W0-T08 |

Checked, with nothing to change:

- Every record in `runs/` validates against `run@1` in both validators (GATE-schema), including the records written before the schema existed.
- The root and workspace `package.json` scripts, the four workflows, `gates.json` and the devcontainer files name only files that exist. The exceptions are by design: gate scripts that later tasks build (the lane lists each as absent, with its builder), outputs written at run time (lane summaries, `status/nightly.json`), and `.github/workflows/deploy.yml`, which the nightly lane dispatches only when the file exists.
- W0-S05's report that the schema subset excludes `prefixItems` predates W0-T02's tuple support: the subset now accepts a tuple whose `minItems` equals its length, and the current lasso draft passes the subset lint.
- W0-S10's request for a `localtime` file in the Bench image: the image RUN-doctor-devcontainer recorded has `/etc/localtime` linked to `Etc/UTC`, although the Dockerfile does not name the package that provides it.
- Problems reported while the wave ran are gone: RUN-doctor-devcontainer and RUN-bwrap-lanes exist, RUN-pg-catalog's outputs match their recorded hashes, and W0-S05's script no longer holds an account name.

Left for their owners, because they are not small, not clearly right, or outside what this step may change:

- **SCR-instrument** belongs in W1-T14's `implements` (spine section 13 gives it there); `tracker/tasks.yaml` changes here only in W0 statuses and notes, so W0-T10 adds it. It is GATE-links' only failure.
- **Re-record before release** the runs whose inputs the integration changed: RUN-scaffold (the lockfile), RUN-ci-fastlane (the lockfile and `gates.json`), RUN-facts-gate (the lockfile and its package test), RUN-links-gate (the tracker, its view and the proposals), RUN-privacy-gate (`.gitignore`) and RUN-schema-self-check (its scenarios). GATE-runs warns on each and its release mode fails on them. RUN-ci-fastlane is re-recorded anyway after the first GitHub Actions run.
- **The fence control** in `scripts/runs/gate-self-check.mjs` says fenced tool output is GATE-facts' to check, but neither gate reads fenced blocks (W0-T08). Rewording it would also stale RUN-numbers-gate and RUN-runs-gate, so it waits for a follow-up that decides whether to check run-named fences.
- **Document edits** the tasks asked for in files W0 did not own: the spine, ARCHITECTURE.md, `labs/TOOLS.md`, `labs/README.md` and the curriculum (section 6, W0-T10).
- **GATE-bundle lints** for the instrument frame's `sandbox` attribute and for `document.cookie` (W0-S01) belong to W1-T41.
- **A fragile GATE-links test.** `packages/ids/test/links.test.ts` checks that an unparsable `tasks.yaml` gives one finding, but it reads the real documents, so any scanned document that names a run ID proposed only in `tasks.yaml` adds a second finding; this page avoids naming one. W0-T03's owner or W0-T10 can make the gate skip such IDs while `tasks.yaml` does not parse.

## 4. Gates after integration [X RUN-w0-integration]

All gates ran on this host after the changes above, with `CI=true` as the fast lane sets it; GATE-privacy also ran once without it, as a developer runs it, which adds the local account and git identity to its terms and found nothing. The fast lane ran as `.github/workflows/fast.yml` runs it: `npm ci --no-audit --no-fund`, then `node scripts/spikes/W0-T04/lane.mjs fast`. This is a local run on the host, not a GitHub-hosted runner.

| Step | Result | Findings and warnings |
|---|---|---|
| `npm ci` | pass | before the lockfile change it stopped with a missing workspace package, as RUN-ci-fastlane's `fast-committed-lockfile` configuration recorded |
| vendor-verify, lint-purity, typecheck, build, lane-tests | pass | |
| unit-tests | pass | before the integration changes it failed on the stale schema list and on the two tests that took RUN-phone-pyodide for an unrecorded run |
| GATE-numbers | pass | the known debt in `scripts/runs/numbers-baseline.json` passes here and fails `--strict` |
| GATE-facts | pass | |
| GATE-links | **fail** | one finding: SCR-instrument is implemented by no task; ten proposed IDs pending, failures only under `--strict` |
| GATE-budget | pass | four warnings: the S10 cadence on each published path, and two builder-path cut-list rows |
| GATE-privacy | **fail** | one finding: `vendor/kernelspace/` has no license file (OD-16); warnings: no course license, and no hashed term list |
| GATE-schema | pass | |
| GATE-runs | pass | warnings: the inputs listed in section 3 changed since their runs |
| the fast lane | **fail** | GATE-links and GATE-privacy; fifteen gates are absent until later tasks build them |

The planted-fault self-checks of the nightly and release lanes all held: GATE-numbers fails on a planted untagged number and GATE-runs on an unresolved run reference, which is W0's third exit criterion, and the self-checks of GATE-schema, GATE-facts and GATE-privacy held every case. The same run also records each gate's release-lane mode, for W0-T11. GATE-schema passes there too; the others fail on what this page already lists: GATE-numbers' known debt, the pending ID proposals, GATE-budget's warnings, forward run references and the inputs changed since their runs, and the missing course licenses and term list.

**Fast-lane time.** W0-T04 recorded the committed workflow at 33.342 s against the 300 s budget, the slowest of three cold runs in a 4-CPU container on this host, emulated and not a GitHub Actions run [X RUN-ci-fastlane]. On the host itself, after the integration, the two steps above took 35.1 s from the start of `npm ci`, which took 0.689 s from a warm package cache; this is a local figure, not a runner's [X RUN-w0-integration]. The first GitHub Actions run, after the push, replaces both figures.

## 5. Owner actions

Consolidated from the twenty results; each task's decision record or run record has the exact commands.

**The custom subdomain**

1. Choose the course domain and set up the instrument origin on its own subdomain: a second GitHub Pages repository with a CNAME file, the DNS record, domain verification and enforced HTTPS; keep the domain only in deployment configuration (OD-5; W0-S01).
2. Set `COURSE_DOMAIN` for the production build of `apps/site`, whose CSP blocks the instrument frame until it names the instrument host (W0-S12), and the Actions variable `STATESPACE_COURSE_DOMAIN` for GATE-privacy (W0-T04).
3. Re-record RUN-origin-subdomain on the real origins and check desktop browsers by hand, Safari above all, after a restart and again after a week away (W0-S01).
4. On the first deployment, check whether the host compresses the large engine files, for Pyodide with `scripts/spikes/W0-S02/wire-check.mjs` and for PGlite's `.wasm` and `.data` files, since the consent figures assume compression (W0-S02, W0-S04, W0-S08).

**Real phones**

5. Run W0-S02's five sessions on at least an iPhone with Safari and an Android phone with Chrome, merge the device reports and derive the Boot timing budget again (W0-S02, decision record section 7).
6. In the same sitting, press the three buttons of W0-S08's `phone.html`, and run W0-S03's `Fixedpoint` corpus in the phone browsers (W0-S08, W0-S03).

**Docker Desktop**

7. Run W0-S06's sandbox matrix on macOS (Apple silicon, and Intel if available) and on Windows with WSL 2, with the private fixtures copied there (W0-S06).
8. Run `statespace doctor` on Docker Desktop with and without the opt-in profile (W0-T05), W0-S10's `run-spike.mjs verify` on an Apple-silicon Mac, and optionally W0-S08's harness there.

**Codespaces**

9. Enable the Codespaces prebuild, then run `statespace doctor` and W0-S06's lane probe in a codespace, and the course devcontainer variant once it is published (W0-T05, W0-S06).

**CI runs after the push**

10. Push, require the `fast lane` check in the branch rules, dispatch `fast.yml` once and complete RUN-ci-fastlane with the GitHub-hosted configuration (W0-T04).
11. Build and publish the Bench image to a registry the runners can pull without credentials, set the repository variable `BENCH_IMAGE` to its digest, and run `statespace doctor` in it by digest; until then every nightly is published red and blocked (W0-T05, W0-T04).
12. Set the repository variable `W0S06_SOLUTIONS_REPO` and the secret `W0S06_SOLUTIONS_DEPLOY_KEY`, promote W0-S06's runner template and record the CI-runner lane (W0-S06).
13. Re-run in the devcontainer or a runner: W0-S05's `record.mjs`, W0-S07's `record.mjs` with the Bench image, W0-S10's verify step and W0-S03's `run-all.sh`; optionally dispatch the nightly and monthly lanes once (W0-S05, W0-S07, W0-S10, W0-S03, W0-T04).

**Licenses, privacy and private material**

14. Decide OD-16: add the code and content licenses at the root, and add the code license to kernelspace so W0-S12 vendors it beside `vendor/kernelspace/VENDOR.md`; this turns GATE-privacy green (W0-T01, W0-S12).
15. Write the private term list outside the repository, hash it with `node scripts/verify-privacy.mjs --hash-terms`, and store the result and its key as the CI secrets `STATESPACE_PRIVACY_TERMS` and `STATESPACE_PRIVACY_KEY`; decide whether the code-hosting handle counts as private (W0-T01).
16. Move W0-S06's private LAB-2 fixtures from the copy kept outside the repository into the private companion repository, and decide whether the complete LAB-2 proofs already committed under `research/`, and repeated in W0-S10's corpus, stay public (W0-S06).

**Decisions in the twenty reviews** (the queue of section 7)

17. W0-S03: whether the naive evaluator, about 35 to 45 times faster per case, replaces `Fixedpoint` as the tab engine [X RUN-fixedpoint-equal]; adopt SI-6 in GATE-conformance.
18. W0-S04: the interactive budget and learner-edit cap that replace "about 5k states", and whether INS-spectacle may patch Spectacle.
19. W0-S05: lasso@1 as TLC's raw JSON with no wrapper, and a schema that rejects unknown keys; and whether W0-S13 is adopted.
20. W0-S07: whether the SP-4.7 card shows the command-type demonstration beside the shallow contract.
21. W0-S08: how S7.L4 names the per-request setting, since the lesson's `SET` form is a syntax error, before W4-T09 and W4-T29.
22. W0-S09: who amends the S6, D-drawers and S8 cells; the grid's [D] defaults and the S6.L7 retry wording; whether the four pool files stay in the repository; a rerun when OD-12's release is out.
23. W0-S10: how goals wrap on a phone; confirm that the monthly newest-Lean run reports and never blocks.
24. W0-S11: settle `run@1`'s field naming against the spine's camelCase, and the receipt `lane` values; review GATE-numbers' rules and its known-debt list.
25. W0-T02: the statement-hash rule and the schema naming conventions; the first versions of `claim@1`, `event@1` and `IR@1`.
26. W0-T05: arm64 support, the TLC jars' location, and the opt-in sandbox profile, the same choice as W0-S06's.
27. W0-T06: the S10 cadence ruling, the two builder-path cut-list warnings, the reading of the lower-bound rule and a displacement for LAB-2.9.
28. W0-T07: the rules' judgment calls, reviewed before the first W1 learner-zero event; turn the comparisons on in SCR-settings before that event; commit the rules file byte-identical.
29. W0-T08: the design decisions of GATE-facts, and a re-check of the seed tool facts when their TTLs run out.

**The owner decisions**

30. Review OD-1 to OD-15 through W0-T09, OD-15 and OD-7 first. Several W0 results bear on them: W0-S01 confirms OD-5 on the stand-in; W0-S02 and W0-S08 put both in-tab engines' first loads above OD-6's threshold, so both ask for consent; W0-S09 waits on OD-12.

## 6. What remains for W0-T09, W0-T10, W0-S13 and W0-T11

- **W0-T09** (owner review of OD-1 to OD-15): prepare the packets and record each decision in `docs/DECISIONS.md`; a changed decision reopens the tasks it touches. It has owner review, so it starts once the queue is under 10 hours.
- **W0-T10** (spine revision 3) collects the companion specifications' spine issues and, from this wave: SCR-instrument in W1-T14; the ten pending run IDs of section 3, the run ID W0-S13 proposes, and the decision on RUN-trace-validate-spike; the registered `proposed_ids` entries GATE-links lists; the four task titles that differ from the spine (W0-S05, W1-T04, W4-T14, W5-T13); W0-S11's description, which counts 36 executed runs where spine section 9.5 lists 37; the value path `values.<name>` where ARCHITECTURE.md writes `outputs.values.<name>`, and the value-tag and fact-reference forms; `run@1`'s naming; owners for GATE-coverage, the site deploy workflow, `content/assurance/gate-claims.json` and the keep/kill comparisons' implementation (W0-T07); and the document edits the decision records list, among them the `{{run:}}` placeholders that now resolve, ARCHITECTURE.md sections 5.3 and 5.5 (W0-S01), the S06 cells (W0-S09), the S07 comment syntax and `SET` form (W0-S03, W0-S08) and S08's H20 (W0-S09).
- **W0-S13** (trace validation, proposed): waits for the owner to set `adopted: true`. W0-S05 notes that the spine's RUN-trace-validate-spike has no adopted owner, and W5-T14 builds on this spike's fallback.
- **W0-T11** (exit review): it depends on every other W0 task. Against the exit criteria today: each of W0-S01 to W0-S10 has a recorded run and a decision record; the fast-lane time is recorded only as an emulation [X RUN-ci-fastlane] until the GitHub run; GATE-numbers and GATE-runs trip on their planted faults; GATE-privacy is red until OD-16; the keep/kill rules are hashed [X RUN-keepkill-rules] and must be committed byte-identical before the first learner-zero event; and the review queue must be under 10 hours when the record is filed.

## 7. Review queue

The queue is the sum of `review_h` over tasks with status `review` and `owner_review: true`, computed from `tracker/tasks.yaml`: **13.75 hours**, all from the twenty W0 tasks.

| Hours each | Tasks | Subtotal (h) |
|---|---|---|
| 1.5 | W0-S11, W0-T07 | 3 |
| 1 | W0-S04, W0-S06, W0-S09, W0-S12 | 4 |
| 0.5 | W0-S01, W0-S02, W0-S03, W0-S05, W0-S07, W0-S08, W0-S10, W0-T01, W0-T02, W0-T03, W0-T05, W0-T06, W0-T08 | 6.5 |
| 0.25 | W0-T04 | 0.25 |
| | **20 tasks** | **13.75** |

The queue is at or above the 10-hour gate (OD-7; `queue_pause` in `tracker/tasks.yaml`), so W0-T09, W0-T10, W0-S13 and W0-T11, which all have owner review, wait until the owner has logged reviews worth more than 3.75 hours; reviewing W0-S11, W0-T07 and W0-S04 first, for example, brings the queue to 9.75 hours. Those four remaining tasks add 3.25 hours, which completes W0's planned 17 hours.

## 8. After integration (2026-10-24)

Changes made by the orchestrator after the integration step, before the W0 commit:

- **GATE-links is green.** SCR-instrument was added to W1-T14's `implements` in `tracker/tasks.yaml`, as spine section 13 assigns it.
- **The instrument origin runs on the real hosts.** The owner's domain serves GitHub Pages for any subdomain, so the site origin is published from `praveer13/statespace` (branch `gh-pages`) and the instrument origin from `praveer13/statespace-instruments`, each with HTTPS enforced. W0-S01's harness ran against them in remote mode: 36 of 36 checks in Chromium, Firefox and WebKit, configurations A and B, sessions s1 and s2 [X RUN-origin-subdomain-live]. The offline session, the hostile embedder and configuration C stay on the local run. Still open for the owner: verify the domain in the GitHub account.
- **The phone page is live.** W0-S02's build `96137b0f594f` is the site's front page, so the owner's real-device sessions (W0-S02 section 7) can start. The wire check on the first deployment measured the OD-6 first load at 12,935,856 bytes, every engine file gzip-encoded except `python_stdlib.zip` [X RUN-pages-wire-check].
- **Two new runs pending registration** in `packages/ids/proposals.json`: RUN-origin-subdomain-live and RUN-pages-wire-check, for W0-T10.
- **The fast lane ran on GitHub Actions.** The push of the W0 commit ran `fast.yml` on a GitHub-hosted runner (ubuntu-24.04): the lane took 79 s against its 300 s budget and failed only on GATE-privacy, pending OD-16. RUN-ci-fastlane now carries that run as its primary configuration, `github-hosted`, beside the emulated ones [X RUN-ci-fastlane].
- **Gates after these changes:** GATE-links, GATE-numbers, GATE-facts, GATE-schema and GATE-runs pass. GATE-privacy fails on its one finding, the missing license beside `vendor/kernelspace/` (OD-16).
