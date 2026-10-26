# W1-T42: GATE-specimens, GATE-conformance and the claims map

**Status:** built by W1-T42. **Date:** 2026-10-25 (machine clock). **Runs:** [X RUN-specimens-gate] and [X RUN-conformance-gate]. Spine section 9.5 registers no run for this task, and the two IDs are not in `packages/ids/proposals.json`, because GATE-links fails a proposal that no scanned document uses; the first document that cites one (the W1 exit record, say) adds both with `flock <gen.lock> node scripts/spikes/W1-T42/propose-ids.mjs`, and the next spine revision registers or declines them.

Two nightly gates and one data file (spine section 11.2; ARCHITECTURE.md section 13). **GATE-specimens** re-executes the run behind each specimen from its record and requires every verdict line the record states to come back. **GATE-conformance** puts the engine pairs of ARCHITECTURE.md section 13.3 side by side and requires them to agree. **`content/assurance/gate-claims.json`** says which course claims each gate backs, so that a red night can mark them "unverified since the date it turned red" in `status/nightly.json` with no code change (section 13.4).

## 1. What is here

| Path | What it is |
|---|---|
| `scripts/verify-specimens.mjs` | GATE-specimens: the catalog, the cabinet checks, the re-execution, the report |
| `scripts/verify-conformance.mjs` | GATE-conformance: the table of pairs, the built-in Z3 pair, the protocol for a pair script, the report |
| `content/assurance/gate-claims.json` | the gate-to-claim map the nightly lane reads |
| `lib/engines.mjs`, `lib/pyodide-host.mjs` | native Z3 and Pyodide's Z3 under Node, each fetched against a SHA-256 pin and kept in a cache |
| `lib/reproduce.mjs` | how a run record is re-executed and compared (the recipes) |
| `lib/specimens.mjs` | the specimens of spine 5.1 with the runs behind each, the cabinet's records, the run registry |
| `lib/z3-corpus.mjs`, `lib/pair.mjs` | the same-query corpus and the comparison of the built-in pair |
| `lib/gate-claims.mjs` | reading and checking the claims map |
| `lib/fixtures.mjs`, `lib/self-check.mjs` | planted trees and stand-in engines, and the planted-fault self-checks behind `--self-check` |
| `*.test.mjs` | the tests; `record.mjs` records the two runs |

The helpers live here because W1 gives a task its own `scripts/spikes/<task>/` folder and CI depends on them, the way it depends on `scripts/spikes/W0-T04/`; a later task may move them.

## 2. Running them

```
node scripts/verify-specimens.mjs                       the nightly lane
node scripts/verify-specimens.mjs --list                the specimens with the runs behind each; nothing runs
node scripts/verify-specimens.mjs --only SP-1.1,SP-1.4  re-execute only the runs behind these specimens
node scripts/verify-specimens.mjs --strict              a run that is pending, or that no recipe re-executes, fails too
node scripts/verify-specimens.mjs --self-check          plant faults; the gate must fail on each

node scripts/verify-conformance.mjs                     the nightly lane
node scripts/verify-conformance.mjs --list              the pairs and whether each script exists
node scripts/verify-conformance.mjs --require-all       every pair must exist (what a release asks)
node scripts/verify-conformance.mjs --self-check

node --test scripts/spikes/W1-T42/*.test.mjs            the tests (the real engines; W1T42_NO_ENGINES=1 skips those)
node scripts/spikes/W1-T42/record.mjs                   record the two runs (a few minutes)
```

Both exit 0 when green, 1 on a finding and 2 when they could not run: an engine that cannot be set up is never a green night. `--json` prints the report as one object; `--root DIR` points a gate at another tree (the tests and self-checks do).

## 3. GATE-specimens

**The catalog** is the table of spine section 5.1, which names the runs behind each specimen: `[X RUN-id]` for a run on disk, `{{run:RUN-id}}` for one still to record. **A specimen is reproduced** when at least one of its runs was re-executed and every re-executed run matched its record.

**A run matches** when its own input is run again on the engine and version the record names, and each verdict line the record states comes back, in order, with times masked, a harness log prefix (`<n>ms py: `) removed, and header lines (`# ...`, `=== ...`) set aside. A witness is compared by value here, because the engine, the version and the query are the same; this is not the cross-engine rule, which is GATE-conformance's. A tool bump therefore turns a specimen red until its run is re-recorded, which is what "a tool bump re-runs everything and opens a diff" asks of the nightly lane. One line is compared up to its verdict only, because its reason depends on how fast the machine is (the quantifier query of `z3_unknown.py` reads "incomplete quantifiers" at the recording speed and "timeout" on a slower machine); it is the single entry of `SPEED_DEPENDENT` in `lib/reproduce.mjs`.

**Where a script runs.** Each script runs in an empty scratch directory made for that run and removed after it, never in the directory the gate was started in. The W1-T12 scripts save every query under `smt2/` beside themselves; a gate that ran them where it stands would fill the tree it is checking, and go red on a read-only checkout, which is how a nightly container may mount it. Pyodide's file system is in memory, so what a script writes under Pyodide never reaches the host. A script that reads files beside itself would fail here, and the error names the file; none that a recipe re-executes reads such files (the one script that does, `smtlib_tour.py`, belongs to a record whose argv runs a shell script, which no recipe covers). The native engine does the same for any program it is given without a `cwd`, so GATE-conformance's programs, and those of a later pair script that imports `lib/engines.mjs`, are covered too.

| Status | Meaning | The gate |
|---|---|---|
| reproduced | a run was re-executed and all that were re-executed matched | passes |
| diverged | a re-executed run came back with other lines, was recorded on another Z3 than the pin, or could not be re-executed (an error) | fails |
| missing | the spine cites `[X RUN-id]` and `runs/RUN-id.json` is not there, or a cabinet record cites a run that is neither on disk nor registered | fails |
| recorded-only | its runs are on disk and no recipe re-executes them yet; the log says why for each | passes; `--strict` fails |
| pending | every run behind it is still to record | passes; `--strict` fails |

**The recipes.** One recipe exists, `z3-inputs`, for a record whose engine is `z3` and whose script inputs a recipe understands. It handles the two shapes the registry holds:

| Shape of the record | Re-executed as |
|---|---|
| a z3py script (role `script`, `.py`), the shape W1-T12 records: argv `python -I <script>`, configurations `native` and `pyodide-node` | the script on native Z3, compared with the record's lines; the script on Pyodide, compared with the `pyodide-node` configuration's lines |
| an imported record with no argv whose inputs are `.py` scripts (W0-S11), the usage line of which its `unrecorded` entry quotes | each script on native Z3, in order |
| an imported record whose script is a Node harness, `z3unk.mjs` or `z3py.mjs` | the Python inside the harness, read out of the script itself so that its hash guards it, on Pyodide; the `timeout` case of `z3py.mjs` is stopped at the record's own limit and must not return (Z3's `timeout` never returns under Pyodide [X RUN-z3-budget-pyodide]) |

Browser matrices (RUN-phone-pyodide, RUN-z3-starter-pyodide) are excused by name in `NOT_RE_EXECUTABLE`: their harness runs in the Playwright image on three engines. Lean, TLC, cvc5, PostgreSQL and PGlite runs have no recipe yet and read recorded-only with that reason. A record whose argv runs something else (a shell script that drives the z3 command line) is not forced into the z3py recipe. The other configurations of a record (three browsers, the cvc5 cross-check) are listed in the log as not compared; GATE-calls (W1-T37) cross-checks every authored `unsat` with cvc5.

`--json` prints the status of every specimen and run, which is what the "re-run status" of a dated-incident card (SP-1.9 and SP-1.10 today; DESIGN.md section 6.5, W4-T11) can be read from.

**Adding a row.** W4-T02's PostgreSQL rows (through `statespace isorun` on the pinned PostgreSQL in the Bench image) and the Lean and TLC rows are recipes: add an object to `RECIPES` in `lib/reproduce.mjs` with `applies(run)`, `execute(run, ctx)` returning `{ checks: [{ label, recorded, fresh }], notes, engines }` or `{ error }`, and its tests. The statuses, the report and `--strict` follow. When `statespace run <RUN-id>` (W1-T29) lands, a recipe may delegate to it; the recipes here do not wait for it, because the nightly lane needs a re-execution today.

**The cabinet** (`content/specimens/`, W1-T16). A record is found by the name of its file (`SP-1.4.json`, `SP-1.4.yaml`) or by an `id` field, in any `.json`, `.yaml` or `.yml` file under the folder except an index, a manifest, a file whose name starts with an underscore and a schema (a JSON file may hold an array, or a `specimens` array); every `RUN-...` in it is a run it cites. Once any specimen of a stage is mounted, every specimen of that stage must be, each citing the runs the spine names behind it: this is "SP-1.1 to SP-1.10 mounted with run ids" (W1-T16's acceptance). A record that names no specimen, one the spine does not list, one mounted twice, and a cited run that is neither on disk nor registered are findings. While the folder is absent the gate only says so.

## 4. GATE-conformance

The table `PAIRS` in `scripts/verify-conformance.mjs` has one row for each pair of ARCHITECTURE.md section 13.3, the Clearinghouse row of spine 11.2, and the built-in row.

| Pair | Script | Built by |
|---|---|---|
| Pyodide Z3 = native Z3, on the same queries (the recipient wrap included) | built in | W1-T42 |
| Pyodide Z3 = native Z3, on every authored cell and generator template | `scripts/conformance/z3-pyodide-native.mjs` | W1-T37 |
| Pocket checkers = Z3 | `scripts/conformance/pocket-z3.mjs` | W1-T19 |
| Spectacle = TLC | `scripts/conformance/spectacle-tlc.mjs` | W3-T08 |
| Lasso validator = TLC | `scripts/conformance/lasso-tlc.mjs` | W3-T09 |
| PGlite = PostgreSQL 18.6 | `scripts/conformance/pglite-pg.mjs` | W4-T04 |
| Tab Datalog = Soufflé | `scripts/conformance/datalog-souffle.mjs` | W4-T07 |
| The provider simulator's traces validate against S8's reference spec, with TLC | `scripts/conformance/provider-tlc.mjs` | W5-T35 (no task names a script path for it; this follows the convention) |

**The built-in row** runs the queries of `lib/z3-corpus.mjs` as one z3py program on native Z3 and on Pyodide's Z3: the specimens' own queries (the overdraft over `Int` with and without its guard and under an `Optimize` objective, the signed BitVec 64 sender, the recipient wrap, conservation modulo 2^64, the mixed unsigned and signed guard, premises that cannot hold together, `x**y == 8` and the cubes query under an `rlimit`). Verdicts are exact, and so is the reason of an `unknown` (SP-1.7 is a reason-stable `unknown`). A witness is never compared by value; each engine's witness must satisfy the query's property, which the gate checks in JavaScript with BigInt, independently of the engine. Equal witnesses are counted and never required. This is the same-query pair that spine 9.5 and 11.2 say GATE-conformance records [X RUN-conformance-gate], where RUN-z3-bv64 and RUN-z3-bv64-pyodide asked two different questions.

**A pair script** joins the gate by existing at its path, as a gate script joins its lane. The protocol, so that the script and the runner agree:

```
node scripts/conformance/<pair>.mjs --json     run from the root of the tree, with the gate's environment
stdout   one JSON object: { "pair": "<id>", "ok": true|false, "compared": n, "equal": n,
         "differences": [ { "fixture": "...", "expected": "...", "got": "...", "detail": "..." } ], "notes": ["..."] }
exit     0 the pair holds, 1 it differs, 2 it could not run (a tool is missing)
```

A script that ignores `--json` and prints text is judged by its exit status and its last line; one whose report says `ok` and whose exit status says otherwise fails, because a pair that cannot agree with itself does not hold. An absent pair is reported with the task that builds it and is neither a pass nor a failure, as the lane treats an absent gate; `--require a,b` and `--require-all` make it a failure, for the release (GATE-release, W5-T09). A pair script may import the engine layer, `lib/engines.mjs`, which runs a z3py program on either engine.

## 5. `content/assurance/gate-claims.json`

**The rule.** One JSON object mapping a gate ID to the IDs of the course claims the gate backs: `{ "GATE-interp": ["SEAM-13"] }`. It is the shape the nightly lane reads (`scripts/spikes/W0-T04/lane.mjs`): when a gate is red, the claims under it are written to `status/nightly.json` in that gate's entry of `failed`, with the date the gate first went red in this run of red nights (`since`); the site (SCR-assurance, W5-T08) renders each of them as "unverified since" that date until a green night clears it (ARCHITECTURE.md section 13.4; `status/README.md` section 3). A claim that two gates back is unverified from the earliest date.

**The seed** is every mapping the spine names, each from the Tested-by cell of a held seam (spine 5.3) and ARCHITECTURE.md section 13.4:

| Gate | Backs | Named by |
|---|---|---|
| GATE-interp | SEAM-13 | ARCHITECTURE.md 13.4: "GATE-interp backs SEAM-13's course claim"; spine 5.3 |
| GATE-conformance | SEAM-13 | spine 5.3: SEAM-13 is tested by "the pocket-checker differential (GATE-conformance)"; curriculum S03 |
| GATE-specimens | SEAM-14 | spine 5.3: SEAM-14 is tested by "GATE-specimens nightly, including the upstream `update-conflict-out` spec" |

The mapping is by gate, so a red row of GATE-specimens (a Z3 specimen today) marks SEAM-14 unverified although the claim is about PostgreSQL: the downgrade is conservative, which is the safe direction. W5-T08 extends the file as course claims ship. SEAM-15 is tested by `lake comparator --paranoid` at every Lean Defence, which is not a gate, so it has no row.

**The checks** (`lib/gate-claims.mjs`, run by both gates and the tests): the file exists and has the lane's shape; every key is a registered gate; every claim is a registered ID (or one that `packages/ids/proposals.json` holds); no list is empty or repeats a claim; and each mapping above is present (the file may hold more, never less). The lane itself checks only the shape, so a mistyped ID would otherwise downgrade nothing.

**The planted red night** (`claims.test.mjs`) is the acceptance item "a planted red night downgrades its claim in status/nightly.json": the real lane runner, the real gate scripts and the real claims file run on a scratch tree in which a recorded line no longer reproduces and a pair differs. Night one lists SEAM-13 and SEAM-14 under their gates, dated that night; night two, still red, keeps the date; night three, with the pair repaired, leaves only SEAM-14; night four, with the run re-recorded, is green and lists no claim [X RUN-specimens-gate].

## 6. The engines and their pins

| Engine | What | Pin | Source of the pin |
|---|---|---|---|
| native Z3 | the manylinux wheel in a virtual environment `uv` builds from the cached wheel; or `python3` on PATH when it already carries the pinned Z3 (the Bench image does), or `STATESPACE_Z3_PYTHON` | SHA-256 `3e2e00bc...` | `bench/uv.lock`, `scripts/spikes/W0-S03/deps.json`, [X RUN-fixedpoint-equal] |
| Pyodide | the npm tarball, extracted into the cache, or `node_modules/pyodide` when it holds the pinned version, or `STATESPACE_PYODIDE_DIR` | SHA-256 `66b7949e...` and the registry's SHA-512 | `scripts/spikes/W0-S02/fetch-engines.mjs` |
| Z3 under Pyodide | the pyemscripten wheel, loaded by `loadPackage` as the tab loads it (not through micropip, which the npm package does not carry), or `STATESPACE_Z3_WASM_WHEEL` | SHA-256 `62143abf...` | the same, [X RUN-phone-pyodide] |

Each file is downloaded once into the cache (`STATESPACE_ENGINE_CACHE`, default `.cache/statespace-engines`, ignored by git) and checked against its pin before anything of it runs; a download that does not match is refused. Nothing of Pyodide (MPL-2.0) or of the Z3 wheels (MIT) is committed, so no license file belongs beside this folder (OD-16: third-party assets keep their own license beside them where they are kept). The two engines' versions are read back from the engines themselves, and a gate fails when one is not the pin or when a record was made on another Z3 than the pin. `engines.test.mjs` fails when the pins stop agreeing with `scripts/spikes/W0-S02`, `scripts/spikes/W0-S03`, `bench/uv.lock` and the recorded runs. A run of these gates needs the network once, or a cache that already holds the three files.

| Variable | Effect |
|---|---|
| `STATESPACE_ENGINE_CACHE` | the directory that holds the downloaded engine files, the virtual environment and the extracted Pyodide |
| `STATESPACE_Z3_PYTHON` | an interpreter that carries the pinned Z3; used as the native engine, and an error when it carries another version |
| `STATESPACE_PYODIDE_DIR`, `STATESPACE_Z3_WASM_WHEEL` | a Pyodide directory and the pinned wasm wheel to use instead of the cached ones |
| `TMPDIR` | where the scratch directory of each run is made (the system's default otherwise); a gate exits 2 when it cannot make one |
| `W1T42_NO_ENGINES=1` | the tests skip the cases that start a real engine |
| `W1T42_SCRATCH` | where the tests and self-checks make scratch trees (default: the system temporary directory) |

## 7. Tests and self-checks

| Check | What it shows |
|---|---|
| `verify-specimens.mjs --self-check` | each planted fault trips the gate (a changed recorded line, a ghost run, a moved pin, a missing script, a tool bump, a half-mounted stage, a record that leaves out a run, a bad claims file, an engine that cannot start) and each control passes; stand-in engines, no network |
| `verify-conformance.mjs --self-check` | the same for the pair: a flipped verdict, a witness that breaks its property, a changed reason, a missing or raising query, a failing or late program, a moved pin, an authored answer both engines miss, a pair script that differs or disagrees with itself, a required pair that is absent, a bad claims map |
| `engines.test.mjs` | the pins agree with their sources; both real engines run a program; a program that hangs is stopped; a program runs in a scratch directory that goes with it, and a program under Pyodide writes into memory |
| `reproduce.test.mjs` | normalization and matching; the executed runs behind SP-1.1 to SP-1.10 each have a recipe or a reason; each run's scratch directory is its own and is removed, even when the engine throws; real re-executions, one of them from an empty and one from a read-only working directory |
| `pair.test.mjs`, `conformance.test.mjs` | the corpus and comparison; the table matches ARCHITECTURE.md section 13.3 and the deliverables of the tasks that build the pairs; the built-in pair on the real engines |
| `specimens.test.mjs` | the catalog, the cabinet reader, the report; every S1 specimen on the real engines; the gate started from an empty directory leaves it empty, and started from a read-only directory it passes |
| `claims.test.mjs` | the claims file; the planted red night through the lane |

## 8. What the rest of the repository needs

- **`scripts/spikes/W0-T04/gates.json`** (W0-T04's table, not edited here): rows for `node scripts/verify-specimens.mjs --self-check`, `node scripts/verify-conformance.mjs --self-check` and `node --test scripts/spikes/W1-T42/*.test.mjs` in the nightly lane, beside the other gates' self-checks. The gates themselves are already in the nightly lane by their script paths.
- **The nightly workflow** (W1-T43's `nightly.yml`) needs the network for the first run, and may cache `.cache/statespace-engines` keyed on the pins.
- **W1-T16** reads the cabinet contract of section 3. **W1-T37 and W1-T19** put their scripts at the paths of section 4 and follow its protocol. **W4-T02** adds a recipe, section 3.
- **GATE-release** (W5-T09) should run `verify-conformance.mjs --require-all` and `verify-specimens.mjs --strict`: a green nightly says nothing about the pairs whose scripts do not exist yet, or the specimens no recipe re-executes, and both modes fail on them.

## 9. Limits

- A specimen whose runs no recipe re-executes passes as recorded-only, in the log and in the counts of the last line. W1 holds Z3 recipes; each later engine arrives with its stage.
- Reproduction compares lines the record states. A record that states few lines is checked on few.
- The nightly lane on GitHub has not run. The closest local substitute is recorded: both gates run inside the Bench image, with the image's own `python3` and Z3 as the native engine and Node mounted from the host (the image has none; the workflow installs it with `actions/setup-node`), and both passed [X RUN-specimens-gate] [X RUN-conformance-gate]. Inside the image the version is checked and the wheel's bytes are not.
- The planted red night proves the gates go red and the lane downgrades the claims the file names. That the site renders them (SCR-assurance) is W5-T08's.
