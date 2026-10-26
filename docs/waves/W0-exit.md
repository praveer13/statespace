# W0 exit review: the record

**Status:** the exit record of wave W0, filed by W0-T11; it awaits the owner's review (0.25 h). **Date:** 2026-10-25 (UTC). **Evidence:** [X RUN-w0-exit], the checks run at the commit W1 starts from, with [X RUN-ci-fastlane] and [X RUN-keepkill-rules]. Spine section 13 lists W0's exit criteria and `tracker/tasks.yaml` repeats them; [the W0 report](W0-report.md), section 10.8, says what this task checks.

## 1. Verdict

**All five exit criteria hold, and W1 may start.** The review queue is 0 h before this record [X RUN-w0-exit#values.queue_h_now] and 0.25 h with it [X RUN-w0-exit#values.queue_h_with_w0_t11], against the gate of 10 h. W1 began before this record was reviewed, on the owner's instruction (section 4). Two inputs are still the owner's, and neither blocks W1: the hashed term list that GATE-privacy needs (section 2.4), and the real-device runs, the Bench image and the other owner actions of the W0 report (section 5).

| # | Exit criterion (`tracker/tasks.yaml`, `waves[].exit`) | W0-T11 acceptance | Result | Section |
|---|---|---|---|---|
| 1 | Every spike has a recorded run and a decision record | the description | Holds; some runs are labeled emulations or stand-ins | 2.1 |
| 2 | The fast lane runs under 5 minutes (RUN-ci-fastlane) | RUN-ci-fastlane under 5 minutes | Holds: three GitHub-hosted runs, two green | 2.2 |
| 3 | GATE-numbers fails on a planted untagged number, and GATE-runs on an unresolved run reference | GATE-numbers and GATE-runs trip on their planted fixtures | Holds: 14 of 14 and 15 of 15 fixtures held | 2.3 |
| 4 | GATE-privacy is green | GATE-privacy green | Holds, without its private-term check, which needs the owner's term list | 2.4 |
| 5 | The keep/kill rules are committed and hashed before the first learner-zero event (RUN-keepkill-rules) | RUN-keepkill-rules recorded | Holds; no learner-zero event exists | 2.5 |
| | | the review queue is under 10 h when the record is filed | Holds: 0 h before this record, 0.25 h with it | 3 |

## 2. The exit criteria and their evidence

### 2.1 Every spike has a recorded run and a decision record [X RUN-w0-exit]

A spike is a task of the tracker's workstream "Spikes": W0-S01 to W0-S10 and W0-S13, 11 tasks [X RUN-w0-exit#values.spikes_with_decision_record]. Each names a decision record in `docs/spikes/`, and each record has a Decision section and a Fallback section with a paragraph in each. The runs that W0's tasks name in their deliverables or acceptance number 30 [X RUN-w0-exit#values.named_runs_resolved]; each has a record that parses, carries its own ID and matches `runs/index.json`. All 74 run IDs that spine section 9.5 lists as executed [X RUN-w0-exit#values.executed_runs_registered] have a record on disk, and GATE-runs resolves every run reference in the documents (2,109 in the GitHub-hosted run of c5f14c5 [X RUN-ci-fastlane]).

W0-S11 and W0-S12 carry the S prefix but belong to the workstreams "Evidence and claims" and "Platform", and their acceptance names runs and files, not decision records. Their ten and five runs are among the 30 (RUN-lean-wasm to RUN-lean-asset for W0-S11, RUN-scaffold to RUN-juliamono-glyphs for W0-S12), so what W0-S12's acceptance leaves to this review, that the exit "confirms they resolve once W0-S11 lands", holds.

The table gives what stands behind each spike's run, as its own record labels it. A run on emulated or stand-in conditions is a recorded run, so the criterion holds; the owner action that completes it stays open (the W0 report, section 5), and none of those actions blocks W1.

| Task | Decision record | Runs | Basis |
|---|---|---|---|
| W0-S01 | [W0-S01.md](../spikes/W0-S01.md) | RUN-origin-subdomain, RUN-origin-subdomain-live | stand-in origins first, then the real subdomains, where 36 of 36 checks held in three engines; the offline session and the hostile embedder ran on the stand-in only |
| W0-S02 | [W0-S02.md](../spikes/W0-S02.md) | RUN-phone-pyodide | emulated: CPU-quota tiers in desktop engines, no phone; the byte counts are exact |
| W0-S03 | [W0-S03.md](../spikes/W0-S03.md) | RUN-fixedpoint-equal | native Z3 and Pyodide under Node and three desktop engines; no phone, not the custom origin |
| W0-S04 | [W0-S04.md](../spikes/W0-S04.md) | RUN-spectacle-s5s8 | headless desktop engines on one shared host; no phone; single timings |
| W0-S05 | [W0-S05.md](../spikes/W0-S05.md) | RUN-tlc-lasso-json | the pinned TLC jar; nothing emulated |
| W0-S06 | [W0-S06.md](../spikes/W0-S06.md) | RUN-bwrap-lanes | a local Docker Engine and an Ubuntu virtual machine stand in for the CI-runner, Docker Desktop and Codespaces lanes |
| W0-S07 | [W0-S07.md](../spikes/W0-S07.md) | RUN-vcgen-cmd | the pinned toolchain from a locally built image, not the Bench image |
| W0-S08 | [W0-S08.md](../spikes/W0-S08.md) | RUN-pglite-rls, RUN-pglite-0511 | Node and three desktop engines against PostgreSQL 18.6; CPU quotas stand in for slow phones |
| W0-S09 | [W0-S09.md](../spikes/W0-S09.md) | RUN-pg-catalog | PostgreSQL's own isolation tester; nothing emulated |
| W0-S10 | [W0-S10.md](../spikes/W0-S10.md) | RUN-replay-gen | one image on Linux x86_64; the simulated toolchain bump is a pretty-printer option, not another release |
| W0-S13 | [W0-S13.md](../spikes/W0-S13.md) | RUN-tlc-tracemodule | the pinned TLC jar; nothing emulated |

The stand-in that sets a number in W1 is W0-S02's: the Boot timing budget that W1-T41 enforces is provisional until real-phone sessions are recorded (decision record, section 7).

### 2.2 The fast lane runs under 5 minutes [X RUN-ci-fastlane]

RUN-ci-fastlane holds three runs of the committed `fast.yml` on a GitHub-hosted runner. The lane's clock runs from the first lane step to the last, so checkout, Node and uv set-up and `npm ci` are inside it, and its budget is 300 s. The first run was red on GATE-privacy alone, before the licenses of OD-16; the two after it are green.

| GitHub run | Commit | Result | Lane clock |
|---|---|---|---|
| 40120435413 | 5f7192c | fail: GATE-privacy only, pending OD-16 | 79.6 s [X RUN-ci-fastlane#values.github_hosted_lane_clock_s] |
| 40181640744 | e309b50 | pass: 13 passed, 0 failed, 15 absent | 79.3 s [X RUN-ci-fastlane#values.github_hosted_e309b50_lane_clock_s] |
| 40215386056 | c5f14c5 | pass: 13 passed, 0 failed, 15 absent | 78.7 s [X RUN-ci-fastlane#values.github_hosted_c5f14c5_lane_clock_s] |

The slowest took about a quarter of the budget. c5f14c5 is the commit W1 starts from, and its run is green. The whole job, with GitHub's own set-up and clean-up steps, took 83 s [X RUN-ci-fastlane#values.github_hosted_c5f14c5_job_s]. The container emulations W0-T04 recorded first (33.3 s for the slowest of three) remain configurations of the record; the GitHub-hosted runs replace them as the basis.

The figure covers 13 of the lane's 28 steps, because 15 gates are absent, not built yet. W1 builds 12 of the 15 (GATE-calls, GATE-items, GATE-audit-blind, GATE-generators, GATE-kc, GATE-stamps, GATE-codes, GATE-claims, GATE-coverage, GATE-bundle, GATE-guardrails and GATE-lessons), so the lane lengthens during W1. GATE-bundle needs Playwright's browsers, which no lane installs yet, and is the likeliest to push the lane toward its budget; W0-T04's README (section 6) says that when GATE-bundle arrives (W1-T41) the job should run in the pinned Playwright image or cache the browsers, and RUN-ci-fastlane should be re-recorded. The same lane passes on the working tree here [X RUN-w0-exit].

### 2.3 GATE-numbers fails on a planted untagged number, and GATE-runs on an unresolved run reference [X RUN-w0-exit]

Each gate copies the tree it reads into a scratch directory, plants one fault at a time and requires the gate to fail on it, and runs controls that the gate must pass. The fixtures are in `scripts/runs/gate-self-check.mjs`, and the nightly and release lanes run both self-checks (`numbers-self-check` and `runs-self-check` in `scripts/spikes/W0-T04/gates.json`), so the fixtures stay in the suite and the gates cannot weaken silently. Run here at the commit W1 starts from:

| Gate | Fixtures held | The fault the exit names | The rest |
|---|---|---|---|
| GATE-numbers | 14 of 14 [X RUN-w0-exit#values.numbers_self_check_held] | a TLC count and timing with no tag, planted as a new paragraph of README.md: the gate fails on it | six more planted faults (an untagged sentence after a tag, a TLC flag, a SQLSTATE code, a solver verdict, a deny-list sentence even with a run reference, learner copy that repeats a tagged number), a listed sentence that is edited, the release lane's failure on known debt, four controls that must pass, and the untouched copy |
| GATE-runs | 15 of 15 [X RUN-w0-exit#values.runs_self_check_held] | an `[X RUN-id]` tag that names a run with no record, and a `{{run:}}` in learner copy that is not labeled draft: the gate fails on both | seven more planted faults (a malformed ID, a value path the record lacks, a tampered output, an id that is not the file name, an unexplained null in an imported record, a record that breaks run@1, a `primary_config` that names nothing), the release lane's two failures, three controls and the untouched copy |

### 2.4 GATE-privacy is green [X RUN-w0-exit]

GATE-privacy passes in the mode the fast lane runs it, on GitHub's runner at e309b50 and at c5f14c5 [X RUN-ci-fastlane], and here in two modes; its release mode fails on one problem.

| Mode | How | Result |
|---|---|---|
| The fast lane's | `CI` set, no hashed term list | ok |
| A developer's | `CI` unset, which adds a check of the local account and git identity (three terms) | ok; nothing found |
| The release lane's | `--strict` | fails on one problem, which is that no hashed term list is set (exit 1) |

Green therefore means that no published file holds an email address, a private path, a shell prompt that names an account, a credential, a course domain or a raw review JSON, that no learner-facing copy names the learner's product where "your system" belongs, and that every vendored directory carries its license. It does not mean the private-design terms were checked: the hashed term list is a CI secret the owner has not set (owner action 15, W0 report section 5), and the gate says so in a warning. The release lane always runs `--strict`, so it fails on exactly this until the list is set.

### 2.5 The keep/kill rules are committed and hashed before the first learner-zero event [X RUN-keepkill-rules]

| | |
|---|---|
| The rules | `content/governance/keepkill-rules.yaml` |
| SHA-256 | 67d1cba9cdab3247ca8425f7bfa5e1821c6823ac8ea613648cde73211f94e589 [X RUN-w0-exit#values.rules_sha256] |
| Hashed | 2026-10-24 14:02 UTC, in RUN-keepkill-rules |
| Committed | 5f7192c at 18:22 UTC the same day; the first GitHub-hosted run of that commit started at 18:22:57 [X RUN-ci-fastlane], so the rules were public by then |
| Changed since | never: the file has 1 commit [X RUN-w0-exit#values.rules_commits], and the working tree and the last commit both hash to the recorded value |
| Guarded by | GATE-schema, which compares the file with the record in every lane and passed on GitHub at e309b50 and at c5f14c5; and `.gitattributes`, which marks the file `-text` so that no checkout converts its line endings [X RUN-w0-exit] |
| Learner-zero events | none recorded: there is no RUN-lz-* or RUN-boot-firstsuccess record, and W1-T08 and W1-T09, which record them, are not finished; the event log is W1-T03's |

The criterion's order, hashed and committed before the first event, holds as far as a repository can show it: nothing is recorded yet, and the rules have been public since 2026-10-24. The first event happens on a device, so W1 confirms the order when it records its first learner-zero run. Two things stay with the owner and with W1: turn the comparisons on in SCR-settings before that event, and keep the file byte-identical (owner action 28, W0 report section 5). GATE-schema has one known limit, shown by RUN-keepkill-rules: a change that edits the rules and re-hashes the record in the same commit passes it. The commit history is the remaining guard, and it shows one commit.

## 3. The review queue [X RUN-w0-exit]

The queue is the sum of `review_h` over tasks with status `review` and `owner_review: true` in `tracker/tasks.yaml` (tracker/README.md, section 5). At filing:

| | Tasks in review | Hours |
|---|---|---|
| Before this record | 0 | 0 |
| With W0-T11 in review | 1 | 0.25 |
| The gate (OD-7) | | under 10 |

The other 23 W0 tasks are `done`: the owner accepted the twenty results on 2026-10-25 on the review page, and W0-T09, W0-T10, W0-S13 and the three OD-6 addenda in conversation (W0 report, sections 9 and 10). No `review_log` entry exists yet, so the 17 h that the tracker plans for W0 was never replaced by logged hours; logging the hours spent lets the next wave's planning use them (tracker/README.md, section 7).

**What the gate means for W1.** W1 plans 33.25 h of owner review across 44 tasks (`waves[].review_h`) [X RUN-w0-exit#values.w1_planned_review_h], more than three times the gate. The gate counts only tasks in `review`, so it does not stop a batch from starting: it pauses the next owner-review task once the queue reaches 10 h (`rules.queue_pause`). At OD-7's 2 to 3 hours of review a week, 33.25 h is about 11 to 17 weeks [D].

## 4. May W1 start?

**Yes.** Both parts of the wave rule hold at filing: W0's gates are green (the fast lane on GitHub's runner at the commit W1 starts from, section 2.2, and the checks above), and the queue is under 10 h (section 3).

**W1 began on the owner's instruction, while this record awaits review.** After accepting every other W0 task on 2026-10-25, the owner asked in conversation for implementation to start, and W1's first batch was launched from c5f14c5; W0-T11 is one of its tasks. W1 therefore opened on the owner's instruction, not by the tracker's rule that a wave opens when the previous exit task is `done` (tracker/README.md, section 9): that task is this one, and it is not done until the owner has reviewed it. The exit criteria were verified at c5f14c5, so the instruction and the rule agree on the facts. If the owner's review finds a criterion wrong, the work to re-examine is W1's tasks begun since.

The GitHub-hosted runs are of committed trees. The local checks (the fast lane here, GATE-privacy in developer mode) ran on the working tree with uncommitted files in it, this task's own and any that W1's first batch had written by then; the lane summary in RUN-w0-exit says whether the tree was dirty.

## 5. What W1 inherits

- **The nightly lane is red until the Bench image is published.** The first scheduled nightly, on 2026-10-25 at 07:40 UTC, stopped at its first check, that the Bench image is named by digest, because the repository variable `BENCH_IMAGE` is unset [X RUN-w0-exit]. Until it is set, every night is published blocked (owner action 11, W0 report section 5), and the heavy gates (GATE-calls' Lean calls, GATE-labs) have no night that runs them.
- **GATE-privacy's term list** (owner action 15) turns its private-term check on and lets the release lane pass.
- **Runs to re-record before release.** GATE-runs warns, in every lane, about the inputs that changed since eight records were made, and its release mode fails on each [X RUN-w0-exit]. Re-recording them is a release task (W6-T07), not an exit criterion. W1's own work will add to the list, and RUN-links-gate and RUN-w0-integration read the tracker, so they are the two to re-record last (W0 report, section 10.8).
- **GATE-numbers' known debt.** 63 listed tokens fail only `--strict`, the release lane [X RUN-ci-fastlane]. The owner of each document that holds one clears it by tagging its sentence (runs/README.md, section 6).
- **RUN-w0-exit is a pending ID.** Spine section 9.5 registers no run for W0-T11, so the ID waits in `packages/ids/proposals.json`; `node scripts/verify-links.mjs --strict`, the release lane's mode, fails until a spine revision registers or declines it.
- **The owner actions of the W0 report, section 5,** that need the owner's devices, accounts or private material still stand: real phones (which also settle the Boot timing budget), Docker Desktop, Codespaces and the CI secrets. None blocks W1.

| Record | Inputs that changed since it was recorded |
|---|---|
| RUN-budget-gate | `content/stages/budget.yaml`, `docs/spine/SPINE.md`, `curriculum/S02-proof.md`, `curriculum/S10-assembly.md` |
| RUN-ci-fastlane | `scripts/spikes/W0-T04/gates.json`, `package-lock.json` |
| RUN-facts-gate | `package-lock.json`, `packages/runs/test/check.test.ts` |
| RUN-links-gate | `packages/ids/src/index.ts`, `packages/ids/src/registry.json`, `packages/ids/proposals.json`, `docs/spine/SPINE.md`, `docs/EVIDENCE.md`, `tracker/tasks.yaml`, `docs/TRACKER.md` |
| RUN-privacy-gate | `scripts/verify-privacy.mjs`, `.gitignore` |
| RUN-scaffold | `package-lock.json`, `vendor/kernelspace/VENDOR.md` |
| RUN-schema-self-check | `schemas/codegen/self-check.mjs` |
| RUN-w0-integration | `scripts/spikes/W0-T04/gates.json`, `packages/ids/proposals.json`, `scripts/verify-privacy.mjs`, `tracker/tasks.yaml`, `docs/TRACKER.md` |

## 6. What this task wrote

| Path | What |
|---|---|
| `docs/waves/W0-exit.md` | this record |
| `runs/RUN-w0-exit.json`, `runs/RUN-w0-exit/` | the executions behind it: the queue, the spikes, the keep/kill rules, the two self-checks, GATE-privacy in three modes, GATE-runs, the latest scheduled nightly and the fast lane here |
| `runs/RUN-ci-fastlane.json`, `runs/RUN-ci-fastlane/github-hosted-e309b50/`, `runs/RUN-ci-fastlane/github-hosted-c5f14c5/` | two GitHub-hosted runs added as configurations, each with its job log and its run metadata; the primary configuration, the title and `recorded_at` still describe the first GitHub run |
| `runs/index.json` | regenerated |
| `packages/ids/proposals.json` | RUN-w0-exit proposed |
| `scripts/spikes/W0-T11/` | the checks (`exit-check.mjs`), the recorder, the reader of GitHub runs and their tests |

To repeat the checks: `node scripts/spikes/W0-T11/exit-check.mjs all --with W0-T11`, and `node --test scripts/spikes/W0-T11/*.test.mjs` for their tests. W1-T47 can reuse both for the W1 exit record. The tracker's status change for W0-T11, and its evidence lines, are the orchestrator's.
