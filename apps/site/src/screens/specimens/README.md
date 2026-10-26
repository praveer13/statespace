# SCR-specimens: the specimen cabinet

The screen at `/specimens` (ARCHITECTURE.md section 3.2; DESIGN.md SCR-specimens). It implements M-specimen-cabinet and M-re-find (spine section 10.1): counterexamples kept beside their fixes, a section for every stage, a label for every specimen the learner has mounted, each specimen's status, and the schedule of re-finds. W1-T16 builds it, together with `content/specimens/` (the records), `schemas/specimen.schema.json` and `scripts/spikes/W1-T16/` (the builder, the fixtures, the replay run and the browser harness).

## What a learner sees

- A section for every stage, S1 to S10, in order. A stage with no specimen yet keeps its heading and says "none yet"; nothing is hidden and nothing is greyed out (I5: nothing locks).
- A specimen the learner has not met is not listed, not even by name: its label would give away what a lesson asks them to find, and a list of what is still to come would be a teaser (DESIGN.md SCR-audit).
- Filters: Mounted, Kept, Dated incidents (counts beside each chip), a stage, and an idea (a KC). They are native radios and selects.
- On a phone, one column, each label opened by its heading (a button that carries its state); a wider screen sets labels side by side, and from 900 px a filter rail sits beside labels that are laid out open. It works at 320 and 360 px, by keyboard, and under axe (the harness checks this).
- The **Re-finds** section: every mounted specimen that is not yet kept, soonest first, with the day a re-find keeps it. It says "ready now" once that day has come and never says late: no overdue counts, streaks or deadlines (DESIGN.md section 6.11). The first five are listed and the rest sit behind a disclosure, so it reads as a schedule and never as a backlog.

## How a label is made

A specimen record holds pointers and words (`content/specimens/README.md`). The label is generated from the runs the pointers name: what a run can say is read from the run. The one such number a record may state, the witness length, is held to the witness when the cabinet is built, and the label reads the witness and never the record:

| On the label | Where it comes from |
|---|---|
| The stamp (REFUTED, UNKNOWN, or none) | Derived in the browser by `@statespace/stamps` (`parseSolverLines`, `rawFromSolver`, `deriveStamp`) from the verdict lines the record points at, on the `reported` lane (the course's own recorded run mints no learner stamp), with the recorded-run badge beside it. The witness length in a REFUTED stamp is read from the witness's own primed variables (`witnessSteps` in `model/blocks.ts`: `x_p` is one step after `x`, `x_pp` two; no primed name is one transfer). The record's `evidence.main.steps` is the author's statement of it, and the build refuses a statement that is not the witness's. The screen never writes a stamp (GATE-stamps' `hand` check). A premise query that is unsat earns no stamp, and the label says why in words. |
| The witness, the raw answer, the lines under "Lines from the runs" | The lines of the run record, verbatim (`model/blocks.ts` finds the block of a query: the one line that begins with its label, and the indented lines under it). |
| The tool, its version, the date, the rlimit | `engine`, `version`, `started_at` (else `recorded_at`) and `budget.rlimit` of the run record, as the run recorded them. |
| "Replayed" | The `replay ok:` line of the run that replays the witness (`RUN-specimens-replay` for the W0 runs, which print none; W1's own Z3 runs print one under every sat). The resolver compares the replayed values with the witness and refuses a label whose witness was not replayed. |
| Violates, Because, Class, Cured by | The record's words: the author's, kept short and checked by the schema, and by the build against the glossary's internal names (`content/glossary.yaml`: a tier name, the knowledge-component term, a gate or a task ID and the rest are refused). |
| Minimal? | Derived: an Optimize query's value, or an unsat core the harness checked is minimal. The answer sentence is generated from the run; the basis sentence is a template. |
| Status | Derived from the learner's events when the page is read (next section). |
| Dated incident | The record's date and public source; the label says the model is a toy of the mechanism and never the incident's code. |
| Sheet, Rev, Drawn, Checked by (provenance block) | The record's id and content hash, and the run's date, tool and id. |

The build (`scripts/spikes/W1-T16/build-cabinet.mjs`) resolves every pointer against `runs/` and writes `data/cabinet.generated.json`, because the browser cannot read `runs/`. It refuses a record whose query is not a line of its run, whose sat does not replay, whose stated witness length is not the witness's (or is left out over a witness of several steps), whose minimal claim has no Optimize query behind it or names an objective that query did not minimize, whose title is not in the spine's words, whose dated-incident mark differs from the spine's (or whose incident is not a toy model), whose words hold an internal name, whose mount rule leaves out the lesson that finds it, whose lab stage or fix names a stage or a claim the registry lacks, or whose spine-named run it never cites; and a file in `content/specimens/` that is not a JSON record. A test fails when the committed file is not what the records and runs build, so a re-recorded run shows up as a diff to review and never as a stale label.

## Status: derived, never stored

`model/status.ts` folds the learner's event log into each specimen's state at read time (I2: no store holds a status), so two tabs and an import always agree. It is pure and takes the clock as an argument.

- **Mounted** at the learner's first `call` event on a cell of one of the lessons the record names (`mount.lessons`), by an own or assisted learner and never an agent's. The first call is the signal because it is the first run of an authored cell, where the witness appears (DESIGN.md section 6.2). [D] event@1 carries no lesson-completion marker to wait for, so completion is not used.
- **Kept** after a re-find: a fresh item (own, unseen, generated: `isFresh`) answered correctly, whose `data.refind.specimen` names the specimen, on a local day at least 7 days after the local day it was mounted (spine section 5.1). [D] Calendar days, not 168 hours, because the cabinet prints dates: a re-find on the date the cabinet gives is a re-find at least 7 days later. The events' own `day` field is used, frozen when each was written, so travel across time zones never moves it.
- An ungraded item and a miss never keep a specimen, and a miss never undoes a keep.

### What Today writes (W1-T08)

A re-find is an ordinary item event whose open `data` carries the specimen it re-finds. The cabinet owns that contract:

```ts
import { refindData, refindSchedule } from './model/status.ts'
// the item event of a re-find, served on a fresh variant of the specimen's class:
//   { kind: 'item', provenance: 'own', exposure: 'unseen', seed, ok: true, data: refindData('SP-1.1'), … }
```

`refindData` throws on anything that is not an SP id, and `refindOf` reads it back. An exit item met in a lesson on the same generator family is not a re-find of a specimen it never named, so a re-find has no other mark. Today can list what is waiting with `refindSchedule(statesOf(events, specimens), today)`.

## The route (W1-T02)

`route.tsx` exports `routes: RouteObject[]` with one route, `specimens`, loaded lazily, so the screen adds nothing to the entry chunk (it also exports it as the default). `SpecimensRoute.tsx` opens the ledger store, reads the events, subscribes (a call made in another tab mounts its specimen here without a reload) and reads the local date from the clock. The shell may later pass one store to every screen; until then this route opens its own and closes it when the page is left.

## Files

| | |
|---|---|
| `model/` | Pure code: `blocks.ts` (read a run's lines), `evidence.ts` (resolve and check a record's pointers; shared with the builder), `label.ts` (what a label says, with the stamp derived), `status.ts` (mounted, kept, the schedule), `cabinet.ts` (drawers, filters, counts), `text.ts` (a record's words: code spans and run chips), `types.ts`. No DOM, storage, clock or network. |
| `SpecimensScreen.tsx`, `Item.tsx`, `Label.tsx`, `Filters.tsx`, `Rich.tsx` | The screen. Words from a record are text nodes and never markup. |
| `copy.ts`, `statusText.ts` | The screen's fixed words, in one place for review. The sentences a label generates from a run (the headings, the Minimal? answer and its basis, the reason a premise query earns no stamp) are in `model/label.ts` and `Label.tsx`. Only glossary terms; the word "drawer" is the glossary's and is not used for the stage sections. The render tests hold every word a reader is given, and these strings too, to the glossary's internal names. |
| `specimens.css` | Tokens only: no hue of its own, no dashed rules, no gradients; the witness sits under the line language's `line-violation` rule. |
| `data/cabinet.generated.json` | The build's output. Do not edit it by hand. |
| `test/` | Unit and render tests (below). |

## Checking

```
node --test "apps/site/src/screens/specimens/test/*.test.mjs"     # the model, the evidence resolver, the status rules, the render
node scripts/spikes/W1-T16/build-cabinet.mjs --check               # the committed cabinet is what the records and runs build
```

The render tests draw the real components to static markup (esbuild and `react-dom/server`). Layout at 320, 360 and 1280 px, axe, keyboard walks and the route over a real IndexedDB are the browser harness's (`scripts/spikes/W1-T16/README.md`).

`RUN-specimens-screen` records all of these as they stood when it was recorded: the screen's tests and the scripts' tests, the two freshness checks and the browser harness in Chromium, Firefox and WebKit, with the browser versions and the counts under its `values`. It hashes the screen, the task's scripts and harness (`scripts/spikes/W1-T16/`), the records, the schema and the glossary, so record it again after a change to any of them (`node scripts/spikes/W1-T16/record-screen.mjs`; it needs Docker and the pinned Playwright image).

## Not yet, and why

- A learner's own lab specimens (the lab repository holds them as YAML) appear in the cabinet once the lab-bundle mirror (W1-T14) delivers them to the screen; the schema, the resolver and the label already accept a record with no mount rule and a `lab_stage`, and the screen does not read the mirror yet.
- A dated incident's nightly re-run status and a richer card are W4-T11's.
- The labels name a run by its id and carry its lines; a run sheet component that opens a run is not built, so the id is text.
- Every record is `draft: true` and the screen says "Draft: first-learner pass pending." until the owner and learner-zero have been through the labels.
