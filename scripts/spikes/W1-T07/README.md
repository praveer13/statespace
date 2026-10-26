# W1-T07: the checks of the Call It sheet and the Mirror

Everything outside the sheet and the screen that W1-T07 needs: GATE-items run on the sheet's fixtures, the vocabulary guard the render tests use, the browser harness that checks the sheet and the Mirror in three engines, and the weakened copies that prove the tests hold what they claim. The sheet is `apps/site/src/components/call-it/`, the screen `apps/site/src/screens/mirror/`, and the derivations `packages/learner/src/mirror/` (importable as `@statespace/learner/mirror`).

| File | What it does |
|---|---|
| `items-gate.mjs` | Runs `node scripts/verify-items.mjs --root <scratch>` on the three fixture lesson pages of `apps/site/src/components/call-it/fixtures/tree/`, copied into a scratch root beside what the gate reads with pages (the ID registry and the run records the pages cite). The gate's exit status is this script's; `--verbose` prints its per-call report. The planted-fixture self-check runs with it. |
| `calls-gate.mjs` | The same for GATE-calls (W1-T37's gate): `node scripts/verify-calls.mjs --root <scratch>` on the three fixture pages, so that every authored call is run by native Z3 and by Pyodide's Z3, the two must agree, every unsat is cross-checked with cvc5, and each key is what the call's first check gives. It needs the pinned engines and cvc5 the gate itself needs (a cache fetched once); about half a minute. |
| `lib/items-gate.mjs` | The same through the gate's own functions, for the tests: `scratchRoot` (with an `edit` hook that rewrites a page, to plant a fault), `gateOnPages`, and `gateOnInstances`, which reads the generated fixtures (`fixtures/generated/instances.json`) through the gate's instance reader and judges them as GEN-call-it's pool. |
| `lib/words.mjs` | The vocabulary guard: every word the sheet and the screen give a reader is held to `content/glossary.yaml`: no internal name, no ID of the machinery, no bare status word, and no glossary term whose first lesson (the glossary's `from`, never the term's row number) comes after the lesson of the page the text sits on. `copyProblems(text, glossary, { lesson })` takes that lesson: the sheet's own words are a page of S1.L0 (Boot), the Mirror's of S1.L1, an authored fixture item's of its own lesson and a generated item's of S1.L5, the end of S1. It holds no list of names of its own. |
| `test/words.test.mjs` | The guard's own tests: all 25 terms against every lesson of S1 and the first lessons of later stages (with the lessons ordered a second way, so a weakened guard cannot agree with itself), claim and seam (rows 9 and 10, from S1.L3) against drawer (row 11, from S1.L1), the case and whole-word rules, every internal name in each of its forms, each kind of ID the glossary lists, the status words, and the refusal of a text with no lesson. |
| `harness/` | The browser harness (below). |
| `browsers.mjs` | The browser harness as one command, for a lane: it builds the harness with Vite and runs `harness/check.mjs` in Chromium, Firefox and WebKit inside the pinned image, with no network and 4 GB. Exit status 0 when no check fails, 1 when one fails or the harness cannot be built or run, 2 when Docker or the image is missing. It writes nothing in the repository. |
| `mutants.mjs` | The weakened copies (below). |
| `record.mjs` | Records `RUN-call-it-mirror`: the tests, the type checks, GATE-items on the fixtures, the weakened copies and the browser harness in the pinned image, with the verdict lines, the browser versions and the counts. Needs Docker and the pinned image; about ten minutes. The record hashes the sheet, the screen, the derivations, this directory and the files it reads, so record it again after changing any of them. |

## GATE-items and GATE-calls on the fixtures

GATE-items is W1-T39's gate and reads `content/`; the Call It fixtures are a lesson slice of their own, so they sit beside the sheet and the gate is pointed at them:

```
node scripts/spikes/W1-T07/items-gate.mjs
node --test apps/site/src/components/call-it/test/items-gate.test.mjs
```

The first is the gate's command line on the three pages (seven authored calls, five of them genuine surprises, no verdict over 60%, every option with a "why" and a registered misconception key) and exits 0. The second also reads the eight generated instances (the four templates of GEN-call-it) through the gate's instance reader, and then plants each of these faults in a scratch copy and requires the gate to find it on the item it breaks: an option with no why, a distractor with no misconception key, a key the registry does not hold, a key far longer than its distractors, two options that read the same, `unsat` answering most of the calls, every key following the narrative-blind strategy, a set whose statements are all true or mostly true, and verdicts that all key `sat`.

`node scripts/spikes/W1-T07/calls-gate.mjs` runs GATE-calls on the same pages: each of the seven calls keys the verdict (or the optimum) that its cell's own code gives on both engines, which is what makes the fixtures' keys verdicts of real runs.

## The browser harness

`harness/` builds the real sheet, the real Mirror screen and the Mirror's real route over the real IndexedDB adapter, with the site's fonts and a project base path, and `check.mjs` drives it in Chromium, Firefox and WebKit inside the pinned Playwright image. It checks:

- **The first call is final** (the acceptance criterion), on the real adapter: verdict, then confidence, then the action, in turn; the host's run starts once and only after the call is in the log; once recorded the whole fieldset is disabled; a forced click on every other answer and tap, a keyboard, and a hostile re-enable of the fieldset change nothing on screen and write nothing; a reload and a second tab show the same read-only call; an open tab hears the other tab's call and turns read-only without a reload; a stale tab (one that hears no other tab) that commits after another did writes nothing and shows the call that stands; two tabs that commit at the same moment end with one call that counts, the same on both screens; one mounted sheet that is given another question (as a host that steps through questions does, bound to the real adapter and on its own) starts open, never shows the last question's call, and shows a question's own call when it comes round again; a set of statements; the help box; the expert skip; and a store that fails (the call is not recorded and the taps survive).
- **Layout and access**, at 320, 360 and 1280 px in light and night: axe on the WCAG 2.2 AA tags with no serious or critical issue, no sideways scroll, the site's three faces loaded, every control at least 44 px, in every state of the sheet and the screen.
- **The keyboard path** of DESIGN.md section 10.3 at 360 and 1280 px, and that the docked action bar never hides a focused control (WCAG 2.4.11).
- **The Mirror's route**, with the clock fixed: a call written by a second tab reaches the first without a reload.

```
HARNESS_OUT=<scratch>/dist npx vite build -c scripts/spikes/W1-T07/harness/vite.config.mjs
docker run --rm --memory=4g --network none \
  -v "$PWD":/repo:ro -v <scratch>/dist:/dist:ro -v <scratch>/out:/out \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  node /repo/scripts/spikes/W1-T07/harness/check.mjs /dist /out /statespace/
```

`ONLY=final,layout,keyboard,dock,mirror` and `ENGINES=chromium,firefox,webkit` (environment variables of the container, `-e`) pick parts and engines; unset or empty means all. The script exits 0 when nothing fails and writes `report.json` and a few screenshots to `/out`. `node scripts/spikes/W1-T07/browsers.mjs` does the build and the run in one command. No lane runs either yet (the Playwright image is a nightly-or-release cost, and the lane manifest is the integrator's: the task's report asks for the row); `record.mjs` records one full run as `RUN-call-it-mirror`.

## The weakened copies

`node scripts/spikes/W1-T07/mutants.mjs` copies the directory a weakening changes into a scratch tree (everything else is a link to the repository), applies the weakening, and runs the tests that must fail. The unchanged copy runs first and must pass. A weakened copy is **killed** when its tests fail by assertion with the same number of tests as the unchanged copy ran, **broken** when it no longer loads (not a catch), and **survives** when its tests pass. Each weakening is a change a careless edit could make:

| Group | Count | Weakens | Killed by |
|---|---|---|---|
| `learner` (L01–L36) | 36 | which call counts (the last call, a plan that always writes, a call and a called item as two questions, a seed ignored, an event counted twice, two records of one id decided by arrival); which calls the Mirror reads (seen, agent, assisted, ungraded, first-contact, at the instant of first learning, the second call of a question, events at or after `now`, sets pooled); the constants (a minimum of 10, think so at 0.75, sure at 0.95, one chance for every guess, 90% intervals); the diagnosis (touching an edge, no minimum), bias, its interval and the resolution; and VRK30 (29 days, a KC that keeps counting after a miss, three days in a month, help or seen work counted, `now` ignored) | `packages/learner/test/mirror-*.test.ts` |
| `sheet` (S01–S16) | 16 | the session (a tap, a second commit, a failure or an empty read after the call is recorded), the grading of a set (right when one statement is; its misconception key taken from a first wrong statement that has none, or the last key and not the first), the action ready before a confidence, `commitCall` (a question written again, a lost race told its own call stands, a read-only store written to), the ref of a cell's call, the fieldset left open, "Correct!" in the copy, a term Boot has not introduced in the sheet's own words, and a store that is still opening told the record is not kept | `model`, `commit` and `render` tests of the sheet |
| `screen` (M01–M08) | 8 | a sentence below the minimum, bias and sentences for calls made with help, a link to Claims, a band told it is above its range, a literal colour, an idea shown by its ID, the guess band's range drawn from 0, and a term from after S1.L1 in the screen's words | the screen's render tests |
| `guard` (G01–G10) | 10 | the vocabulary guard: a term held by its row number and not its lesson, refused on the page of its own first lesson, lessons ordered by number alone (S2.L0 before S1.L5), no internal name looked for, "proven" passing as a status word, a text with no lesson held to nothing, a term with no lesson read as a term of no page, a case-sensitive term matched in any case, no machinery ID looked for, an exclamation mark passing | `test/words.test.mjs` |
| `browser` (B01–B08, `--browsers`) | 8 | the fieldset left open, a question written again by a stale tab, an open sheet that does not hear another tab, a recorded sheet that shows the learner's taps, no scroll padding for the docked bar, the host's run started before the call is in the log, and a sheet given another question that shows the last question's call or keeps its taps | the harness, built from the weakened copy, in Chromium inside the pinned image (Docker; a minute or so each) |

```
node scripts/spikes/W1-T07/mutants.mjs                    the host groups (70 weakenings), about three minutes
node scripts/spikes/W1-T07/mutants.mjs --group learner    one group
node scripts/spikes/W1-T07/mutants.mjs --only L07,S03     chosen weakenings (--verbose names the first failing test)
node scripts/spikes/W1-T07/mutants.mjs --browsers         also the browser group (Docker and the pinned image)
node scripts/spikes/W1-T07/mutants.mjs --list             every weakening
```

The first run of this script found four weakenings no test failed on (two records of one id decided by arrival, an interval that ends exactly at its band, one that starts exactly at it, and the resolution shown from a handful of calls); each now has a test. The first round of verification found that a set took its misconception key from the first wrong statement even when that statement carries none (a wrong answer on a true statement hid the key of a tagged one after it) and that the vocabulary check cut terms by row number and not by lesson; S14 to S16, M08 and the guard group hold the repairs.

## The tests

```
npm test -w @statespace/learner                             the derivations, with the rest of the package
node --test "apps/site/src/components/call-it/test/*.test.mjs"
node --test "apps/site/src/screens/mirror/test/*.test.mjs"
node --test scripts/spikes/W1-T07/test/words.test.mjs        the vocabulary guard
```

`apps/site` has no `test` script, so `npm test` and the unit-tests lane run only the first; the other three run by hand until a `test` script in `apps/site/package.json`, or a check row of the lane manifest (`scripts/spikes/W0-T04/gates.json`), names them. The task's report asks for that row.
