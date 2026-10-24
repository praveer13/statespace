# W0-T04: the CI lanes

**Status:** built by W0-T04. **Date:** 2026-10-24 (machine clock).

Four workflows in `.github/workflows/` run the course's gates in the lanes of spine section 11.2 and ARCHITECTURE.md section 13.1. They are thin: each sets up its tools and calls `lane.mjs` with a lane name. What a lane runs is a table, `gates.json`, so a gate that a later task builds joins its lane without an edit to any workflow. This folder holds that code because W0 gives a task only its own `scripts/spikes/<task>/` folder; CI depends on it, and a later task may move it to `scripts/ci/` by changing the four workflows, the `lane-tests` row of `gates.json` and the paths in the tests.

## 1. The lanes

| Workflow | Starts on | Runs | Blocks | Where |
|---|---|---|---|---|
| `fast.yml` | every pull request, every push to `master` or `main`, by hand | the fast column of `gates.json`: the checks (vendor integrity, purity lint, type check, unit tests, build, this folder's tests) and every fast gate | merges, once the owner requires the check `fast lane`; 300 s budget from the first step, 6 minutes as the job's backstop | a hosted `ubuntu-24.04` runner with Node 22.22.2 and uv 0.10.2 |
| `nightly.yml` | 02:23 UTC daily, by hand | the nightly column: the fast gates again, the gates' planted-fault self-checks, and the heavy gates; writes `status/nightly.json` and publishes it ([status/README.md](../../../status/README.md)) | releases, and the claims a red night touches | the digest-pinned Bench image (`BENCH_IMAGE`) |
| `release.yml` | a tag `edition-*`, by hand | the release column: the strict form of the gates, the self-checks and GATE-release, which is a stub that fails closed until W5-T09 builds `scripts/verify-release.mjs` | the edition's deploy, which does not exist yet | a hosted runner |
| `monthly.yml` | the 1st of each month at 04:41 UTC, by hand | GATE-labs on the newest stable Lean; files, updates or closes one issue | nothing | the Bench image |

A step whose script does not exist yet is reported as **absent**, with the task that builds it (`node scripts/spikes/W0-T04/lane.mjs fast --list` shows all of them). It is neither a pass nor a failure. The release lane marks GATE-release **required**, so there its absence fails the lane. Today most of the 29 gates of section 11.2 are absent; each arrives with its own task.

Decisions made here, each reversible by editing `gates.json` or a workflow [D]:

| Decision | Why |
|---|---|
| The nightly lane runs the fast gates again | GATE-release needs "the nightly lane green" to mean every gate was green on that commit |
| GATE-runs runs without `--release` in the nightly lane and with it in the release lane | `--release` also fails on a `{{run:}}` in a draft whose run is not recorded yet, on inputs that changed since their run and on a stale index. Drafts wait for runs for most of the project (ARCHITECTURE.md section 9.2), so the nightly would be red for months; the release is where "any unresolved reference at all" fails. The nightly therefore does not catch drifted inputs or a stale index; a `--integrity` flag on `verify-runs.mjs` that failed on those two but not on forward references would close that (a request to W0-S11) |
| GATE-privacy gets `--strict` where the CI secrets exist, and always in the release lane | its own header says so; a fork's pull request has no secrets and runs without the term list |
| The status goes to the branch `nightly-status`, not to the default branch | status/README.md section 1 |
| A tag `edition-*` starts the release lane | the spine says "an edition tag" and gives no pattern |
| Actions are pinned by commit, with the release in a comment | `workflows.test.mjs` fails on a tag or a branch |
| The nightly and monthly jobs use no `setup-uv` | the Bench image carries uv, and the pin must be the learner's |

## 2. Files

| File | What it is |
|---|---|
| `gates.json` | the step table: 29 gates and the checks, each with its script, the task that builds it and the arguments it takes in each lane |
| `lane.mjs` | runs a lane: times each step, kills one that outlives its timeout, redacts paths, writes the summary, the job summary and, for the nightly lane, the status document |
| `status-branch.mjs` | `publish` and `fetch` of `status/nightly.json` on the branch `nightly-status`, with git plumbing and a scratch index; retries a lost push |
| `file-issue.mjs` | the monthly lane's issue: create, comment or close, found by the label `monthly-lean` |
| `emulate-runner.mjs` | runs a workflow's job in a container that resembles a hosted runner; how RUN-ci-fastlane was measured |
| `record.mjs` | runs the emulation, actionlint and the tests, runs the nightly lane here, and writes `runs/RUN-ci-fastlane.json` and `runs/RUN-ci-fastlane/` |
| `*.test.mjs` | the tests of all of the above, and of the workflows and the manifest against the spine, the registry and the tracker |

## 3. Running a lane here

```
node scripts/spikes/W0-T04/lane.mjs fast --list                  the steps, and which scripts exist
node scripts/spikes/W0-T04/lane.mjs fast                         the fast lane on this working tree
node scripts/spikes/W0-T04/lane.mjs fast --only GATE-numbers     one step
node scripts/spikes/W0-T04/lane.mjs nightly                      writes status/nightly.json (generated; do not commit it)
node --test scripts/spikes/W0-T04/*.test.mjs                     the tests (the container test needs STATESPACE_EMULATOR_TESTS=1)
```

To add a gate: write `scripts/verify-<name>.mjs` as the tracker says; it joins its lane by itself. If it needs other arguments in a lane, or must run in another lane, edit its row in `gates.json`. `lane-manifest.test.mjs` checks the gate rows against the spine, so a gate added to or removed from section 11.2 fails it until the table follows.

If the fast lane approaches 5 minutes, the order of relief is: run independent gates in parallel (not built; `lane.mjs` runs steps one after another), then move a slow gate to the nightly lane by a logged decision (ARCHITECTURE.md section 19).

## 4. What RUN-ci-fastlane is, and is not

It is **emulated**. The workflows have not been pushed and a GitHub Actions run cannot be made from here, so the fast lane's own steps ran in a Docker container made to resemble a hosted runner: Ubuntu 24.04, 4 CPUs (what GitHub lists for a public repository; 2 for a private one), cold caches, Node and uv installed by the emulated setup steps, a copy of the working tree as the checkout. The record lists what that leaves out: queue time, GitHub's cache service and network, the runner's tool cache and the speed of its CPUs. This host's cores are probably faster than a hosted runner's, so read the figure with the headroom factor in the record's values, which is how much slower a hosted run could be and still meet the budget.

## 5. Owner actions

1. Push the workflows; in the repository settings require the check **fast lane** for merges. Set `STATESPACE_PRIVACY_TERMS` and `STATESPACE_PRIVACY_KEY` (secrets) and `STATESPACE_COURSE_DOMAIN` (variable) for GATE-privacy.
2. Dispatch `fast` once (Actions > fast > Run workflow), and complete RUN-ci-fastlane with its real duration. The lane's duration is the first step's start to the last step's end, without GitHub's own "Set up job", "Post" and "Complete job" steps:

   ```
   gh run view <run-id> --json jobs --jq '.jobs[] | select(.name == "fast lane") | .steps | map(select(.name != "Set up job" and .name != "Complete job" and (.name | startswith("Post ") | not))) | {start: first.startedAt, end: last.completedAt}'
   ```

   (The field names and the jq filter were tried on a public repository's run with gh 2.93.0 (a read-only call); the command has not been run on this repository's runs.) Add a configuration `github-hosted` with those two times, the run's ID and its commit, make it `primary_config`, copy its start and duration to the record's top level, and set `environment.emulated` to false and the title to say so. The same run shows what the emulation missed.
3. Publish W0-T05's Bench image to a registry the runner can pull without credentials, and set the variable `BENCH_IMAGE` to its digest. Until then every night is published as red and blocked, with the reason that BENCH_IMAGE is not set, and every monthly check files an issue saying the same.
4. Optional: dispatch `nightly` and `monthly` once. Let GitHub's notification reach you (it goes to whoever last edited the cron line), and re-enable the schedule from the Actions tab if the repository goes 60 days without activity.
5. Optional: turn on Dependabot for the `github-actions` ecosystem, so that a new release of a pinned action arrives as a reviewable pull request that moves the commit and its comment together.

## 6. Open risks

- **Never run on GitHub.** actionlint 1.7.12 with shellcheck 0.11.0 finds nothing in the four workflows, and the lane runner, the status branch and the issue filer are tested against a scratch origin and a stub `gh`; but no workflow has run on a hosted runner. In particular the `container:` job, `--user root`, `actions/setup-node` inside the Bench image, the `publish` job's push and `gh workflow run` under the token permissions each job declares, and the monthly job's `gh issue create`, have not been seen to work.
- **The Bench image does not exist yet.** The nightly and monthly lanes cannot start until it is published and pinned.
- **The emulated runner is faster than a hosted one** (section 4).
- **The lane is sequential, and Playwright is the threat to its budget.** With about 25 fast gates to come, the budget is a real constraint. A hosted runner has no Playwright browsers or their system packages, and installing three engines takes time that the 300 s must cover; when GATE-bundle (W1-T41) arrives, run the fast job in the pinned Playwright image (`mcr.microsoft.com/playwright:v1.63.0-noble`, recorded in RUN-scaffold) or cache the browsers, and re-record RUN-ci-fastlane. The lane adds no such setup now, because nothing needs it.
- **`GATE-coverage` has no script and no task**; the lane lists it as absent for good until someone owns it.
- **W0-S06's requests about the lab checks are not wired**: `--sandbox=auto`, `lake comparator --paranoid` in the fast lane and `lake check --paranoid` in the nightly lane. No lab check exists to run them yet; they belong to GATE-labs (W1-T43) and `statespace check` (W2-T01). What does apply is done: no job uses `ubuntu-slim` (a test fails on it), and the nightly and monthly lanes give GATE-labs its place. The owner's promotion of W0-S06's runner template to `.github/workflows/w0-s06-sandbox-lanes.yml` is that task's owner action 2 and is untouched here.
- **The site's deploy workflow has no task.** The nightly `publish` job redeploys by dispatching `deploy.yml` when that file exists; nothing builds it yet (ARCHITECTURE.md section 13.5 says a green fast lane on the default branch deploys).
- **Failures that are not this task's.** While RUN-ci-fastlane was recorded the lane was red for reasons in other tasks' files (its verdict lines say which), and the committed `package-lock.json` did not install under `npm ci` (configuration `fast-committed-lockfile`). The result file lists the requests.
