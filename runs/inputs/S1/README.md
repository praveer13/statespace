# runs/inputs/S1: the inputs of the S1 runs

**Task:** W1-T12. **What this is:** everything the eleven S1 runs of spine section 9.5 executed, one folder per run. Each run's record is `runs/<RUN-id>.json`, and its logs and SMT-LIB exports are in `runs/<RUN-id>/`. Nothing here is learner copy: lessons, drawers and claim cards cite the records.

## 1. The runs

| Run | Inputs in `RUN-…/` | What it runs | Cited by |
|---|---|---|---|
| RUN-z3-boot-variant | `boot_variant.py` | Boot's variant (the guard reads the recipient's balance): its violation, the corrected guard, and the three facts behind the call's wrong options | S1.L0, SP-1.1 |
| RUN-z3-demorgan | `demorgan.py` | the mis-negation `a' < 0 and b' < 0`, the correct negation, and De Morgan's identity behind the correct one | S1.L1 segment 1, D-03 |
| RUN-z3-vacuous-unsat | `vacuous_unsat.py` | CL-1.1's violation and premise queries; the `MAX_TRANSFER = 0` config's violation, absurd property and premises with their unsat core; `MAX_TRANSFER = 100` as the control | S1.L3, D-02, SP-1.6, CL-1.1, AUD-1.1 |
| RUN-z3-double-capture | `double_capture.py` | queries (i) to (v) of S1.L4 cell 2, Optimize on the hold and on the pooled balance with a plain query under each answer, and the prequestion's two wrong options | S1.L4, SP-1.2, CL-1.3 |
| RUN-z3-refund-mint | `refund_mint.py` | the clamp rule's mint, Optimize on the minted amount, two special-case patches, a plain query under each Optimize answer, the fixed rule and its premise query | S1.L4, LAB-1.4, SP-1.3, CL-1.4 |
| RUN-z3-bv64-negamt | `bv64_negamt.py`, `original/z3_negamt.py` | signed BitVec 64 without `amount > 0`, and its `Int` twin; the research script as it is | S1.L5 segment 1, the S1 Defence, CL-1.5, AUD-1.2 |
| RUN-z3-btc2010 | `btc2010.py` | a toy model of CVE-2010-5139, buggy and fixed | SP-1.9 |
| RUN-z3-bloch06 | `bloch06.py` | a toy model of Bloch's binary-search midpoint, buggy and fixed | SP-1.10 |
| RUN-z3-smtlib-tour | `smtlib_tour.py`, `smtlib/*.smt2`, `tour_cli.sh` | D-13's examples as SMT-LIB text: the Z3 command line, its API interpreter, and Pyodide | D-13 |
| RUN-pg-numeric-bound | `numeric_bound.sql` | a credit of 1 at the edge of `bigint`, of `numeric(19,0)` and of an unbounded `numeric` | S1.L5's six-row table, S6.L4 remedy 3 |
| RUN-rust-i64 | `rust_i64.sh`, `ovf/` | an `i64` sum that overflows, in the dev and release profiles, and `checked_add` | S1.L5's six-row table, CL-1.5, D-30 |

`original/z3_negamt.py` and `ovf/` are byte-identical copies of `research/evidence/a2r3/scripts/z3_negamt.py` and `research/evidence/a2r3/rust/` (the spine says their output was never committed); `record.mjs check` compares them.

## 2. A Z3 script

Each of the eight Python scripts is self-contained, because `python -I` does not put the script's folder on the path, and `python -I` is the pinned form: `uv run --with z3-solver==5.3.1 python -I <script>` [X RUN-z3-starter]. They share one helper block, identical text between two marker lines at the top of each file; `record.mjs check` fails if the blocks differ. Every query goes through `run()`, or `optimize()` for an Optimize query, except the two unsat cores of RUN-z3-vacuous-unsat, which `vacuous_unsat.py`'s own `core()` computes with the same `rlimit` and an `@@` line, and no export. Each query gets:

- a fresh `Solver` (an `Optimize` in `optimize()`) with `rlimit` 5000000, so that every verdict has a budget (spine section 9.1);
- the verdict and the model or the reason, as Z3 prints them, in one line per query;
- a replay of every `sat` witness in plain Python integers, `wrap()` for two's complement, so that a witness is checked by its property and never compared by value across engines;
- from `run()` only, the query's SMT-LIB text under `smt2/<query>.smt2`: Z3's `to_smt2()` with the let names (`?x60`) renamed in order of appearance, because Z3 names them after AST ids and the ids are not the same in every process (each record says whether the raw text agreed across its configurations). `optimize()` and `core()` write none, and the record checks each of their answers through a plain query that has one (section 4);
- one `@@ {json}` line per query with the same facts, which the recording script reads. The other lines are what a person reads, and they are the record's verdict lines.

The tour is the one script without the block: it reads `smtlib/*.smt2` and evaluates each in a fresh context with `Z3_eval_smtlib2_string`, which is Z3's SMT-LIB command interpreter, and prints the output as the interpreter returns it. `tour_cli.sh` runs the same files through the `z3` executable the wheel installs.

## 3. Where each run ran

Configurations are named in each record (`configs[]`, `primary_config` first). A Z3 run has:

- `native`: the script under `uv`, on CPython, with the 5.3.1.0 wheel (the lab's way [X RUN-z3-starter]); for the tour, `cli-native` (the `z3` command line) and `api-native`;
- `pyodide-node`: Pyodide 314.0.7 with the Z3 wheel [X RUN-z3-starter-pyodide] under Node 22 [X RUN-scaffold], a fresh engine for the script;
- `pyodide-chromium`, `pyodide-firefox`, `pyodide-webkit`: the same engine in a module worker of each browser, in the pinned Playwright container (desktop builds, headless, not phones); one worker ran every Z3 script in turn, each in a fresh Python namespace, the way INS-z3 will serve requests;
- `cvc5-bench`: the SMT-LIB text of every `sat` or `unsat` query that has one, on the Bench's cvc5 (for the tour, its starter and the guarded form); the Optimize answers and unsat cores, which have none, are checked through the plain queries named for them (section 4).

RUN-z3-bv64-negamt adds `int-twin-original`. RUN-pg-numeric-bound runs in `postgres:18`, and RUN-rust-i64 in the Bench image. Containers run with `--memory=6g` and no network, and are removed afterwards.

## 4. Reading a record

`values` is parsed from the logs, never typed (`record.mjs check` re-derives it). For a Z3 run, `values.queries.<query>` has the verdict, for a `sat` query the witness (the primary configuration's model, as strings, because values such as 9223372036854775809 exceed what JSON readers keep exact; `witness_signed` reads the bit-vector values as the signed integers they stand for), and whether every configuration's model for it replayed, the unsat core or the Optimize minimum where the query has one, the SHA-256 of its export (null for an Optimize answer or an unsat core, which have none), its `rlimit`, and the verdict of each configuration that ran it (`engines`; cvc5's only where cvc5 ran the query). Cite one as `{{run:RUN-z3-boot-variant#values.queries.variant_violation.verdict}}`. The tour has `values.files.<name>`; PostgreSQL has `values.cases.<case>`; Rust has `values.debug` and `values.release`. `checks[]` has one entry per query, with what the curriculum expects and what was observed, then the checks that hold for the whole run (no unexpected or stray query; the same exports in every configuration, over the queries that have one; for RUN-z3-bv64-negamt, the research script's own line), and `pass` is true only when every check passed. A query without an export names the plain query, with an export, that cvc5 ran in its place (`checked_by` in its check), and that query must be `unsat`: for an Optimize answer, a `no_smaller_…` query that asks for anything below the minimum (the check also compares the minimum with the value in `lib.mjs`'s `PLAIN_CHECKS`, worked out by hand from the encoding, since SP-1.2's and SP-1.3's "Minimal?" column leaves it to these runs); for an unsat core, the premises query of the same scenario, built from the same formulas.

Witnesses are not canonical: in the browser configurations a few `sat` queries returned a different model from native, each replaying, and the record lists the models by engine (`witnesses_by_engine`). A lesson shows one witness; an item checks the property.

## 5. Re-recording and checking

```
node scripts/spikes/W1-T12/record.mjs record     # runs everything; needs Node 22, uv, Docker, network for the pinned packages
node scripts/spikes/W1-T12/record.mjs check      # re-derives every record's values and checks from its committed logs
node --test "scripts/spikes/W1-T12/*.test.mjs"   # the recording script's own tests
```

Changing a script here changes its hash, and GATE-runs then asks for the run to be recorded again. The recording script and its harnesses are in `scripts/spikes/W1-T12/`.
