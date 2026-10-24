# status: the nightly lane's published result

**Status:** built by W0-T04. **Date:** 2026-10-24 (machine clock).

The nightly lane (`.github/workflows/nightly.yml`) writes `status/nightly.json` once a night: the commit it checked, the date, and for each failed gate the course claims that gate backs (ARCHITECTURE.md section 13.4). The site renders those claims, and any course-authored stamp resting on them, as "unverified since <date>" until a green night clears them, with no code change and no server. This page says where the file lives, what it holds and who reads it.

## 1. Where it lives

`status/nightly.json` is a generated file. It is written in the nightly job's workspace, uploaded as that run's artifact, and then pushed by the `publish` job to the branch **`nightly-status`**, which holds that one file at that path. It is never committed on the default branch, for two reasons: the default branch may be protected, so a bot could not push to it; and a commit after each nightly would move the default branch's tip away from the commit the night checked, and GATE-release reads "the latest green nightly on the same commit".

| Who | What it does with the file |
|---|---|
| the nightly `gates` job | reads the previous night's file, so that a gate that stays red keeps its date |
| the nightly `publish` job | pushes the new file to the branch, then asks the site to redeploy |
| the site build (SCR-assurance, W5-T08) | fetches the file into `status/nightly.json` before it builds |
| the release lane, GATE-release (W5-T09) | fetches the file and requires its `commit` to be the tagged commit and its `result` to be `green` |

To read it, from a clone: `node scripts/spikes/W0-T04/status-branch.mjs fetch --out status/nightly.json` (exit 3 means no night has been published yet). A local run of the nightly lane writes the same file in the same place: `node scripts/spikes/W0-T04/lane.mjs nightly`. The file is for generated use, so it should be listed in `.gitignore` (a request to W0-T01, who owns that file).

## 2. What it holds

| Field | Holds |
|---|---|
| `schema` | `statespace/nightly-status@1` |
| `date` | the UTC date of the run, `YYYY-MM-DD` |
| `commit` | the commit the night checked, 40 hex digits; `null` when git could not say |
| `dirty` | local runs only: whether the working tree had uncommitted changes |
| `result` | `green` when every step that ran passed within the lane's time; `red` when a gate or check failed, timed out or was missing where the lane requires it, or the night was blocked |
| `blocked` | `null`, or why nothing ran: the gates job produced no status |
| `red_since` | `null` when green; otherwise the date this run of red nights began |
| `source` | `{kind, workflow, event, run_id, run_attempt}`; `kind` is `github-actions`, `local` or `emulated-runner`. No URL and no repository name, so the file can be published anywhere |
| `runner` | the OS, architecture, CPU count and Node version of the machine that ran the lane |
| `image_digest` | the Bench image's `sha256:` digest, from `STATESPACE_BENCH_IMAGE`; `null` outside the image |
| `started_at`, `duration_s` | when the lane started and how long it took |
| `gates` | each gate that ran: `id`, `result`, `exit_code`, `duration_s`, `verdict` (its last line of output) |
| `checks` | the same for what is not a gate: the type check, the unit tests, the builds, the gates' own planted-fault self-checks |
| `failed` | each failed gate: `gate`, `result`, `since` (the date it first went red in this run of red nights) and `claims` |
| `absent` | each gate whose script does not exist yet, with the task that builds it |
| `claims_source` | the file that mapped gates to claims, or `null` |

A step's `result` is `pass`, `fail` (exit 1), `error` (any other exit code, or it did not start), `timeout`, or, in `absent` only, a gate that is not built. **Green means every gate that exists passed; it says nothing about the gates in `absent`.** A reader that needs all of them, such as GATE-release, must look at that list.

An example, abbreviated:

```json
{
  "schema": "statespace/nightly-status@1",
  "date": "2026-11-03",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "result": "red",
  "blocked": null,
  "red_since": "2026-11-02",
  "source": { "kind": "github-actions", "workflow": "nightly", "event": "schedule", "run_id": "1000000000", "run_attempt": 1 },
  "image_digest": "sha256:<64 hex digits>",
  "gates": [{ "id": "GATE-interp", "result": "fail", "exit_code": 1, "duration_s": 12.4, "verdict": "GATE-interp: FAIL (2 findings)" }],
  "failed": [{ "gate": "GATE-interp", "result": "fail", "since": "2026-11-02", "claims": ["SEAM-13"] }],
  "absent": [{ "gate": "GATE-labs", "built_by": "W1-T43" }]
}
```

## 3. The rules

- **`since`.** A gate that failed last night and fails again keeps last night's `since`; a gate that fails for the first time gets today's date; a gate that passes leaves `failed`. The lane reads the previous file from the branch (`--previous`); a missing or unreadable one restarts every date.
- **`claims`.** The lane maps a failed gate to course claims through `content/assurance/gate-claims.json`, an object from a gate ID to a list of claim IDs, when that file exists (`--claims` names another). The content index that holds the mapping does not exist yet (W1-T42 asks for a red night to downgrade its claim; W5-T08 builds SCR-assurance), so until then `claims` is empty and a red night lists gates only.
- **A night that cannot run.** If the gates job produces no status (the Bench image cannot be pulled or is not pinned by digest), the `publish` job runs `lane.mjs nightly --blocked <reason>`: the status is red, `blocked` says why, and the failures of the last night that did run stay in `failed` with their old dates. Silence is never a green night.
- **A late or missing night.** GitHub may delay a scheduled run, and disables scheduled workflows in a public repository after 60 days without repository activity [V, GitHub documentation read 2026-10-24]. A reader should treat a `date` more than two days old as stale, not as green.
- **A hand-started run on another branch** is a trial: `publish` runs only on the default branch.

## 4. Settings the lane reads

| Setting | Where | Used for |
|---|---|---|
| `BENCH_IMAGE` | repository variable | the Bench image by digest, `name@sha256:<64 hex digits>` (W0-T05's image, once it is published); a tag is refused |
| `STATESPACE_PRIVACY_TERMS`, `STATESPACE_PRIVACY_KEY` | repository secrets | GATE-privacy's hashed term list; with them the fast and nightly lanes run it with `--strict` |
| `STATESPACE_COURSE_DOMAIN` | repository variable | GATE-privacy's check that the course domain stays out of the repository |

The branch `nightly-status` needs no setting: the first night creates it.
