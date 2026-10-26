# W1-T16: the specimen cabinet's scripts

Everything outside the screen that W1-T16 needs: the builder that turns `content/specimens/` and `runs/` into the cabinet the site loads, the schema fixtures, the replay run that gives the witnesses of the W0 runs (four of them, behind SP-1.1, SP-1.4 and SP-1.5) the evidence their labels need, and the browser harness that checks the screen at phone width. The screen is `apps/site/src/screens/specimens/`; the records are `content/specimens/`.

| File | What it does |
|---|---|
| `build-cabinet.mjs` | Reads every record, validates it against specimen@1, checks it against the ID registry, the spine's table and the glossary's internal names, resolves its pointers against the run records with the code the site shares (`model/evidence.ts`) and writes `apps/site/src/screens/specimens/data/cabinet.generated.json`. `--check` fails when the committed file is not what it builds, `--json` prints the cabinet, `--root DIR` builds a tree under DIR. Exit 0 built or fresh, 1 findings or a stale file, 2 the build could not run (an unknown argument, a file it needs that it cannot read) [D]. |
| `lib/cabinet.mjs` | The builder's code (`buildCabinet`, `spineSpecimens`, `cabinetText`). Run through Node's type stripping, because the shared model is TypeScript. |
| `lib/learner-words.mjs` | The internal-name guard: it reads `content/glossary.yaml` (the `internal` names with their forms, and the `internalIds` kinds; a tree under `--root` that has none reads this repository's, as GATE-lessons' `--root` does) and finds them in a string of learner copy, with the glossary's own matching. The builder holds the words of every record to it; the render tests hold every word the screen gives a reader to it. It holds no list of names of its own. GATE-lessons (W1-T38) does not read `content/specimens/` or the screen's strings, so this guard is the check of them until it does. |
| `make-schema-fixtures.mjs` | Writes `schemas/fixtures/specimen/`: valid records (a course specimen with every optional part, a verdict, a premise query with its core, a dated incident, a learner's lab specimen in JSON and YAML) and invalid ones, each with the keyword and instance path it should fail on, in `invalid/index.json`. `--check` writes nothing and fails when the committed files differ; `--out DIR` writes elsewhere. |
| `replay_witnesses.py`, `record-replay.mjs` | Record `RUN-specimens-replay`: four witnesses read from the verdict lines of RUN-z3-starter, RUN-z3-bv64 and RUN-z3-bv64-pyodide, replayed in plain Python integers against the premises and the property of the query that produced each (64 bits as two's complement). No solver runs. `record` runs it and writes `runs/RUN-specimens-replay.json` and its log; `check` runs it again and compares. Needs Node 22 and uv. |
| `propose-ids.mjs` | Adds `RUN-specimens-replay` to the ID proposals. The spine registers no run for this task; run it under the generator lock. |
| `record-screen.mjs` | Records `RUN-specimens-screen`: the screen's tests, the scripts' tests, the two freshness checks and the browser harness in the Playwright image, with the verdict lines, the browser versions and the counts. Needs Docker and the pinned image; a few minutes. The record hashes the screen, this directory (the builder, the guard, the tests and the harness), the records, the schema, the glossary and the script, so record it again after changing any of them. |
| `cabinet.test.mjs`, `words.test.mjs`, `fixtures.test.mjs`, `replay.test.mjs` | Tests of the above (below). |
| `harness/` | The browser harness (below). |

## Why a replay run

A specimen label's stamp for a sat is REFUTED only once the witness replays (spine section 8.8; DESIGN.md section 5.4). W1's Z3 harnesses print a `replay ok:` line under every sat query. The W0 runs behind SP-1.1, SP-1.4 and SP-1.5 print the model and no check of it, so `RUN-specimens-replay` gives their models the same evidence. It is not a re-execution of Z3: GATE-specimens re-executes the runs from their records; this adds the check those runs never printed, that each model, as printed, satisfies the premises and violates the property. The builder compares the values on each replay line with the witness the label prints, so a replay of another model is a finding.

When a source run is recorded again, the hashes in `RUN-specimens-replay`'s inputs stop matching and `replay.test.mjs` says so: run `node scripts/spikes/W1-T16/record-replay.mjs record`, then `node scripts/spikes/W1-T16/build-cabinet.mjs`, review the diff, and rebuild the runs index (`node scripts/runs/build-index.mjs`, under the generator lock).

## Tests

```
node --test scripts/spikes/W1-T16/cabinet.test.mjs scripts/spikes/W1-T16/words.test.mjs scripts/spikes/W1-T16/fixtures.test.mjs scripts/spikes/W1-T16/replay.test.mjs
node --test "apps/site/src/screens/specimens/test/*.test.mjs"
```

- `cabinet.test.mjs`: the committed cabinet is what the records and runs build; the ten records of SP-1.1 to SP-1.10 are in it with lines that are verbatim lines of their runs; and each fault planted in a copy of the tree is a finding about that record alone: a query no line begins with, a label typed by hand, a title that is not the spine's words, a dated-incident mark that differs from the spine's, a spine-named run never cited, a lesson that differs from the spine's, a mount rule naming no lesson, a KC not in the graph, a file named for another record, the same id twice, a record that is not JSON, a run that is not recorded, a witness that does not replay or a replay of another witness, a minimum with no Optimize query behind it or one that minimized another objective, a value reference, an internal name in any line a label shows, a witness length the record states wrongly or leaves out over a witness of several steps, a mount rule that leaves out the lesson that finds the specimen (or none), a lab stage or a claim the registry lacks, a dated incident that is not a toy model, and a file that is not a JSON record. A lesson that mounts a specimen the record does not name is a note and never a finding, because the lessons are other tasks'. The command's `--check`, `--json`, refusal to write on a finding and exit 2 when it cannot run [D] are tested too.
- `words.test.mjs`: the guard plants every name and every form the glossary lists, and every ID kind it lists, so that a name the glossary gains is covered the day it lands; its matching (whole words, case, a hyphen for a space); that a glossary with no internal list, or none at all, is a problem and never a pass; and that the ten records hold no internal name.
- `fixtures.test.mjs`: the committed fixtures are what the generator writes; each valid one passes and each invalid one fails on its keyword and path.
- `replay.test.mjs`: the replay record is valid run@1, its hashes match, its values are the witnesses' own, the script prints the lines the record holds when run again, and a witness that is no witness prints FAILED and exits 1 [D]. The two tests that run Python skip, and say so, on a machine without it.
- The screen's tests (`apps/site/src/screens/specimens/test/`) cover the model, the evidence resolver with planted faults, the status rules (mounted, kept, the seven-day boundary in local days, order independence), the labels' stamps (the witness length is read from the model, and the evidence holds none) and the render, which holds every word a reader is given, over every specimen met and every label open, to the glossary's internal names.

## The browser harness

`harness/` builds the real screen, and the real route over the real IndexedDB adapter, with the site's fonts and a project base path, and drives it in Chromium, Firefox and WebKit inside the pinned Playwright image. `check.mjs` runs axe (WCAG 2.2 AA tags), requires that the page never scrolls sideways at 320, 360 and 1280 px in both themes, that the site's three faces (Archivo, Source Serif 4 and JuliaMono) loaded and that every control is at least 44 px in both directions, walks the screen by keyboard, follows a fragment to its label, and mounts the route over a real database whose log a second tab then writes. `shots.mjs` writes element screenshots for a person to look at.

```
HARNESS_OUT=<scratch>/dist npx vite build -c scripts/spikes/W1-T16/harness/vite.config.mjs
docker run --rm --memory=4g --network none \
  -v "$PWD":/repo:ro -v <scratch>/dist:/dist:ro -v <scratch>/out:/out \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  node /repo/scripts/spikes/W1-T16/harness/check.mjs /dist /out /statespace/
```

`check.mjs` exits 0 when nothing fails [D]. The harness is a verification aid and is not wired into a lane: the Playwright image is a nightly-or-release cost, and the integrator decides where it runs.

## What this does not do

- It does not read `runs/` in the browser: the cabinet carries the lines a label is drawn from.
- It does not write a status anywhere: a specimen's status is derived from the learner's events when the page is read.
- It does not check the lessons' `::specimen` blocks against the records beyond a note, because the lessons are other tasks'; GATE-lessons and GATE-specimens own that check.
