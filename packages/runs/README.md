# @statespace/runs

**Status:** built by W0-T08. **Date:** 2026-10-24 (machine clock).

The runs registry and the facts registry as data (ARCHITECTURE.md section 17.1: the registry loader, the `{{run:}}` resolver and the run-sheet data). Pure TypeScript, so the site, the instrument origin and GATE-facts run the same code: run and fact references, resolving and printing a value, the run chip and run sheet, TTLs and "stale since" dates, errata and their "re-check" flags, and the checks of GATE-facts on one sentence. `scripts/verify-facts.mjs` does the reading of files.

## 1. Modules

| File | Exports |
|---|---|
| `src/refs.ts` | `referencesIn`, `isPlaceholder`, `maskReferences`, `codeSpans`, the ID grammars `RUN_ID` and `FACT_ID` |
| `src/values.ts` | `resolvePath`, `isPrintable`, `renderValue`, `renderings`, `findValue`, `describe` |
| `src/sheet.ts` | `runChip`, `runSheet` (ARCHITECTURE.md section 9.2) |
| `src/facts.ts` | the registry's types and rules: `checkFacts`, `checkErrata`, `staleness`, `staleSince`, `runStaleness`, `factStaleness`, `recheckFlags` |
| `src/check.ts` | `checkUnit`: GATE-facts on one sentence, list item, table row or heading |
| `src/index.ts` | all of the above, and `expiredTtls`, every TTL that has passed on a given day |

Nothing here reads a clock: every function that needs today takes it as an argument.

## 2. Reference forms

| Form | Where | Means | What GATE-facts checks |
|---|---|---|---|
| `[X RUN-id]` | documents | a citation: an executed run on disk | nothing to compare; GATE-numbers requires a citation and GATE-runs resolves it |
| `{{run:RUN-id}}` | copy | a citation, rendered as a run chip | the same |
| `[X RUN-id#values.<name>]` | documents and copy | a value tag: its sentence states the value at that path | the run is on disk, the path names one value, and the sentence states it |
| `{{run:RUN-id#values.<name>}}` | copy and documents | a value reference: prints the value, so it is generated, not typed | the path names one value; a reference to a run not recorded yet waits for it (GATE-runs says when that fails) |
| `{{fact:<id>}}` | copy and documents | prints a fact from `content/registry/facts.json`, with "stale since" once its TTL has passed | the id is in the registry |

A tag may hold several items, and a path is dotted, with numbers indexing lists (`configs.0.argv`). A value tag sits inside the sentence it checks, before the full stop; after it, the tag is a sentence of its own and states nothing. For example, RUN-tlc-doublespend records 11 distinct states with `-deadlock` [X RUN-tlc-doublespend#values.deadlock_off.distinct_states].

**Why a citation is not checked.** GATE-facts could guess which typed value a plain citation vouches for and look for it among the cited run's values. On the tree of 2026-10-26 (the probe re-run with RUN-facts-gate), that guess finds no matching value for 551 of the 1,411 output tokens in documents beside a citation of a run on disk [X RUN-facts-gate#values.heuristic_not_held, RUN-facts-gate#values.heuristic_tokens]. Most of them are not wrong: the record keeps the value in a configuration, a note or an output file, or the sentence names a range or a rounded figure. So the gate checks only what a sentence binds explicitly, and a document opts in with a value tag (`scripts/spikes/W0-T08/heuristic-probe.mjs` is the measurement).

**The value path.** run@1 keeps named values at the top level of a record, beside `outputs`, which lists the output files (runs/README.md section 2). So the value form is `{{run:RUN-id#values.<name>}}`, as runs/README.md section 4 writes it. ARCHITECTURE.md sections 9.2 and 18 (item 14) write `{{run:RUN-id#outputs.values.<name>}}`, the spine's camelCase shape, which names nothing in a run@1 record; GATE-facts fails on it with the run@1 spelling, and GATE-runs fails on it as a path the record lacks.

**Placeholders.** As in GATE-runs, `RUN-id` and `ID` name the format anywhere, and the other placeholders (`RUN-<id>`, `RUN-{kebab}`, ...) in code spans; a fact reference with a malformed id in a code span is a placeholder too.

## 3. When a sentence states a value

A value is a non-empty string, a finite number or a boolean; a list or an object names no one value and is never printed. A sentence states a value when one of its renderings occurs in the sentence as a whole token, with the sentence's own references masked out:

| Value | Renderings | States it | Does not |
|---|---|---|---|
| `11` | `11` | "finds 11 distinct states", "an 11-state trace" | "12", "111", "1.11", "11.5", "11,000", "H11" |
| `594481375` | `594481375`, `594,481,375` | "594,481,375 bytes" | "59,448,137" |
| `"1.4.2-modified"` | the string | "prints 1.4.2-modified" | "prints 1.4.2" |
| `"4.35.0"` | the string | "Lean v4.35.0" | "4.35.0-rc1" |
| `"sat"` | the string | "answers `sat`" | "answers `unsat`" |
| `"[b = 0, amount = 1, a = 0]"` | the string, any run of white space matching any run | the model in a code span | another model |

A negative number also matches with the minus sign U+2212, and a string of four or more digits also matches grouped in thousands. Copy prints a value with `renderValue`: numbers grouped in thousands, strings as they are.

## 4. Learner copy prints values

In learner copy (`content/stages/`, `labs/LAB-*/`, GATE-numbers' definition), a sentence that a run reference covers (its own, a later sentence's in its paragraph, or its section's) may not type a run's output: a count, a measure, a model value, an exit code, a SQLSTATE, a verdict or a version, as GATE-numbers' `tokensOf` finds them. It prints the value with a value reference instead, or a value tag of the same sentence states it. Flags and budgets are inputs and stay typed. A finding names the value reference that would print the typed value from a cited run, or says that no value of the cited runs equals it, which usually means the copy disagrees with its run. Documents may type values beside a citation; a value tag is how a document has one checked.

## 5. The gate

```
node scripts/verify-facts.mjs                 the fast lane
node scripts/verify-facts.mjs --today DATE    judge TTLs on DATE (YYYY-MM-DD)
node scripts/verify-facts.mjs --json          the report as JSON
node scripts/verify-facts.mjs --root DIR      the tree under DIR
node scripts/verify-facts.mjs --self-check    the fixtures, then planted faults in a scratch copy
```

It reads what GATE-numbers reads, plus all of `content/`, `schemas/README.md` and the READMEs under `packages/`, `apps/`, `bench/` and `scripts/`, cut into units by GATE-numbers' rules (`scripts/runs/numbers-rules.mjs`); `docs/history/`, `design/canvas/` and `fixtures/` directories are skipped. It fails on the checks of sections 2 to 4 and on a malformed registry (`content/registry/README.md`), and it warns, never failing, on every TTL that has passed. Exit 0 is green with warnings allowed, 1 is findings, 2 is a gate that could not run. `--self-check` uses `FACTS_SCRATCH`, or the system's temporary directory, for its scratch copy.

## 6. Fixtures and tests

`test/fixtures/facts/<case>/` are small trees the gate runs on with `--root`; each `expected.json` gives the dates to judge on, the exit code, and every finding and warning, which `--self-check` compares one to one. The run records in them are verbatim copies of the registry's, except the `ttl` fixture's RUN-twin-pins, which is not recorded yet; its pin is the commit that RUN-lean-toolchain's version string reports.

| Fixture | Shows |
|---|---|
| `disagree` | a sentence stating 212 distinct states against a run that records 11 (BRIEF section 2.2's known-false count) fails |
| `agree` | the same sentence stating 11 passes |
| `forms` | every reference form in a document and in learner copy: 15 planted findings and the controls beside them |
| `ttl` | a tool fact, a twin and two runs with 60-day TTLs: fresh on day 59, stale on day 60, warnings only on every date, never a failure |
| `registry-bad` | one planted fault per registry entry: 22 findings, and three controls |

`npm test` here runs the tests under `test/` with Node's test runner (`node --test "test/*.test.ts"`), and `npm run typecheck` compiles the sources with no DOM or Node types and the tests with Node's. The recorded evidence for the gate, its fixtures, its self-check and these tests is RUN-facts-gate [X RUN-facts-gate], written by `scripts/spikes/W0-T08/record-run.mjs`.
