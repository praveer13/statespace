# @statespace/ids

The course's ID registry, generated from the spine, and GATE-links, the gate that reads it. Spine section 11.2 defines the gate; W0-T03 builds both. The package is pure (no I/O); `scripts/build-ids.mjs` and `scripts/verify-links.mjs` do the reading and writing.

## What is here

| Path | What |
|---|---|
| `src/registry.json` | One entry per catalog ID with its kind and section, and the fields its table gives it (a lesson's tier, stage, instruments; a KC's stage and threshold flag; a drawer's "Used in" text). **Generated.** |
| `src/index.ts` | Literal-union types (`LessonId`, `KcId`, `RunId`, ...), the ID lists, `kindOf` and `isId`. **Generated.** |
| `src/grammar.ts` | The ID formats of the spine's "ID conventions" table, and the scanner (`scanLine`, `scanText`) that finds IDs in prose, tables, YAML and JSON. Later gates that must tell an ID from a number can import it. |
| `src/spine.ts`, `evidence.ts`, `registry.ts` | The generator: the tables of `docs/spine/SPINE.md` and the misconception tables of `docs/EVIDENCE.md` in, entries and counts out. |
| `src/check.ts`, `tracker.ts`, `yaml-subset.ts` | The checks, and the readers of `tracker/tasks.yaml` (a dependency-free YAML subset that throws on anything else) and of the checklist in `docs/TRACKER.md`. |
| `proposals.json` | IDs that a companion spec proposes and the spine does not register yet (see below). |
| `test/` | Unit tests, and the planted-fixture tests: each plants one defect in the real files and shows that the gate fails on it. |

## Commands

```
node scripts/build-ids.mjs                 regenerate src/registry.json and src/index.ts
node scripts/build-ids.mjs --check         fail if the committed files are out of date
node scripts/build-ids.mjs --against FILE  also fail if an ID of an earlier registry is gone or names another kind
node scripts/verify-links.mjs              GATE-links (--strict, --json, --root DIR)
npm run test -w @statespace/ids            the tests (IDS_TEST_PYYAML=1 adds a cross-check against PyYAML, through uv)
npm run typecheck -w @statespace/ids
```

The scripts run the package's TypeScript directly, so they need Node 22.18 or later (22.6 and later with the flag, which they pass themselves). Regenerate after every change to the spine or to `docs/EVIDENCE.md` §6. The generated files are committed, and the gate fails when they are stale.

RUN-links-gate (`runs/RUN-links-gate.json`) records the gate on the real tree, one planted defect per check, the tests and the YAML parser against PyYAML; `scripts/spikes/W0-T03/record-run.mjs` re-records it.

## What GATE-links checks

| Check | Fails when |
|---|---|
| `registry` | a table of the spine no longer matches an extraction rule (a missing table, a ragged row, a duplicate ID), so the registry would be silently shorter |
| `registry-stale` | `src/registry.json` or `src/index.ts` differs from what the sources generate |
| `unresolved` | an ID in `README.md`, `docs/`, `curriculum/`, `labs/`, `content/`, `tracker/` or `design/` is not in the registry or in `tracker/tasks.yaml`. `docs/history/` and `design/canvas/` are exempt (v1 history). `dp:` keys resolve against EVIDENCE.md §6, its proposed entries included |
| `owner` | a mechanic (§7), an instrument (§9.1, §9.2), a screen (§10.1) or a drawer (§3.12) is in no task's `implements` in `tracker/tasks.yaml`. A gate that no task builds is only a note |
| `used-in` | §9.1 "Used in", §8.3 "Stages" or §3.12 "Used in" differs from its source: the lesson rows' Instruments and Generators columns, or the stage specs' Drawers and Sibling bridges paragraphs. The exempt cells are "all", "all labs", GEN-defend's S1–S10 and the "interleaved to S9" tail |
| `counts` | the counts that the spine states in §3.11 and in the revision log differ from its tables. Boot (`[boot]`) and the capstone steps (`[step]`, S10.L1–S10.L7) are lesson-shaped IDs but are not lessons: they are excluded from every lesson count |
| `tracker` | `docs/TRACKER.md` lists a task twice, lists a task that `tasks.yaml` lacks, omits one, or shows a status marker (`[ ]`, `[~]`, `[=]`, `[x]`) that differs from the task's `status` |
| `tasks` | `tasks.yaml` does not parse, a spine §13 task has no record, a status is not allowed, or an `implements` entry is not exactly one ID |
| `proposal` | an entry of `proposals.json` is registered now, or is used nowhere |

Instruments take their derived stages from the lesson rows, capstone steps included. For INS-lane-a the labs that a step names under "Built in" count too (spine §9.1: "for Lane A, the lab stages that name it"), which is why S3 appears for it.

## Proposals

A companion spec may propose an ID that the spine does not register. GATE-links reports it as pending, not as a failure, when it is a run ID in a task's `proposed_ids` or an entry of `proposals.json`. `node scripts/verify-links.mjs --strict` fails on every pending ID. W0-T10 (spine revision 3) registers or declines each one and deletes its entry; once the file lists none, the default run and the strict run agree.

## Limits

- The gate checks that an ID exists, not that it is the right one.
- Ranges written with an ASCII hyphen (`S1-S4`) are not read as two IDs; the house style is the en dash (`S1–S4`).
- `registry.json` holds the spine's tasks; the tasks that only `tracker/tasks.yaml` has are resolved from that file on each run.
- Lab stages that name Lane A in their title but sit in a stage that no lesson row or capstone step lists for INS-lane-a are reported as a note, not a failure.
