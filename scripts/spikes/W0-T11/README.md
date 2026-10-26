# W0-T11: the W0 exit checks

**Status:** built by W0-T11. **Date:** 2026-10-25 (UTC).

The exit record, [docs/waves/W0-exit.md](../../../docs/waves/W0-exit.md), cites runs, not hand counts. This folder holds the code that made them. Nothing here is a gate: no lane runs it, and a later wave's exit task can copy the pattern.

## Files

| File | What it does |
|---|---|
| `exit-check.mjs` | three checks that no gate of the fast lane makes: `queue` (the owner's review queue, OD-7), `spikes` (decision records, and the runs W0's tasks name and spine section 9.5 lists as executed) and `keepkill` (the keep/kill rules: hashed, committed, no learner-zero export yet) |
| `exit-check.test.mjs` | the tests: each plants one fault in a scratch repository and requires the check to fail on it, with controls that must pass |
| `record.mjs` | runs the three checks and the other commands the record rests on, and writes `runs/RUN-w0-exit.json` with its outputs under `runs/RUN-w0-exit/` |
| `github-run.mjs` | reads GitHub-hosted runs of the fast lane with `gh` and adds each to `runs/RUN-ci-fastlane.json` as a configuration, with its job log and run metadata as outputs |
| `github-run.test.mjs` | the tests of its pure parts, on a small synthetic log |

## Commands

```
node scripts/spikes/W0-T11/exit-check.mjs all --with W0-T11     the three checks; --with counts a task that is not in review yet
node scripts/spikes/W0-T11/exit-check.mjs queue --json          one check, as JSON
node --test scripts/spikes/W0-T11/*.test.mjs                    the tests
node scripts/spikes/W0-T11/record.mjs                           record RUN-w0-exit (about a minute; see below)
node scripts/spikes/W0-T11/github-run.mjs <run-id>...           add GitHub runs to RUN-ci-fastlane (network and a logged-in gh)
flock <gen.lock> node scripts/runs/build-index.mjs              regenerate runs/index.json after either of the last two
```

Set `W0T11_SCRATCH` to keep the recorder's and the tests' scratch directories out of the system temporary directory.

## What `exit-check.mjs` decides

| Check | Fails when |
|---|---|
| `queue` | the queue, the sum of `review_h` over tasks with status `review` and `owner_review` true, is 10 h or more, now or with the task named by `--with`; or the planned review of W1 differs from `waves[].review_h` |
| `spikes` | a task of the workstream "Spikes" is not `done`, names no decision record, or has a record without a Decision section or a Fallback section of at least 20 words each; a run a W0 task names has no record, a record that does not parse, carries another ID or says `pass` false, or is missing from `runs/index.json` or listed there with another hash; or a run ID that spine section 9.5 lists as executed has no record |
| `keepkill` | the rules file, in the working tree or in the last commit, does not hash to the SHA-256 that `runs/RUN-keepkill-rules.json` records; it is not committed; `.gitattributes` does not mark it `-text` or `eol=lf`, so a checkout could change its bytes; a `RUN-lz-*` or `RUN-boot-firstsuccess` record exists; or W1-T08 or W1-T09, which record learner-zero's runs, is in review or done |

Exit status 0 when every check holds, 1 when one does not, 2 when a file cannot be read or the arguments are wrong.

## What `record.mjs` records

One configuration per command, each with its argv, exit code, verdict lines and an output file: the three checks above; GATE-numbers and GATE-runs against their planted faults (`--self-check`); GATE-privacy as the fast lane runs it, as a developer runs it and as the release lane runs it (`--strict`, which is expected to fail on the missing term list); GATE-runs on the tree, and its warnings as data; the latest scheduled nightly on GitHub, read with `gh` (left out when `gh` cannot read it); and the fast lane on this working tree. The record's `checks` apply the exit criteria to those outputs, and its `values` are what the exit record cites.

Three choices, so that a gate that another task runs meanwhile never sees a broken state: outputs are staged and moved into `runs/RUN-w0-exit/` together with the record that lists them; an interim record with everything but the lane is published before the lane runs, because the lane's GATE-facts reads the values the exit record cites; and the tracker, the run index, the ID registry, `RUN-ci-fastlane`, the lane manifest and the lockfile are `sources_at_recording` (hashed for provenance), not `inputs`, because they change with every task that lands and a gate warns on a stale input.

Outputs are normalised: the repository is `<repo>`, the scratch directory `<scratch>`, the temporary directory `<tmp>`, the home directory `<home>`, store paths `<nix-store>`, and the local account and git identity `<user>`.

## Limits

- The recorder's fast lane runs on a shared working tree. While other tasks write into it, a red lane may belong to another task's work in progress; the record's lane summary names the commit and whether the tree was dirty, and the record says which gate failed.
- `keepkill` cannot show that the first learner-zero event comes later than the hash. It shows that nothing is recorded yet; W1 confirms the order when it records its first learner-zero run.
- `github-run.mjs` trusts `gh`: the committed outputs (the job log and the run metadata, hashed) are the evidence, and the script is how they were made.
