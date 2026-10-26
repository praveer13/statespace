# LAB-10 · Core assembly

You wire the Core you built in LAB-3, LAB-4, LAB-6 and LAB-8 into one pipeline, take an agent's proposal through it, record the demonstration, and publish a report. The course supplies the reference pipeline (`statespace demo`), the fixture corpus, the proposal generator (`statespace proposal draw`) and the recorder (`statespace demo record`). Reference modules earn nothing. You write the wiring, every triage decision, every fix, each claim's proposition and "if weakened" witness, and the report.

Run the stages from the root of your lab repository, inside the devcontainer, which sets `STATESPACE_PG_DSN` to its PostgreSQL service. The PostgreSQL stages need psycopg, which the repository's `pyproject.toml` pins at the Bench's version [X RUN-scaffold]. Each stage ends in `uv run statespace check lab10.<k>`, which prints one line per check and writes a receipt under `receipts/LAB-10.<k>/` once every check reached a result. Import the receipt on the lab's page.

## 1. The stages

| Stage | You do | Then run |
|---|---|---|
| LAB-10.1 | Predict the reference's verdicts on `TransferWithFee` (challenge/TransferWithFee.mp), then run `uv run statespace demo` and read the report skeleton it writes to `report/skeleton.md` | `statespace check lab10.1` |
| LAB-10.2 | Name your Core's command in `core.toml`; its parser, typechecker, checker and interpreter answer the requests of section 3 | `statespace check lab10.2` |
| LAB-10.3 | Add your compiler, runtime and simulator behind the same command | `statespace check lab10.3` |
| LAB-10.4 | `uv run statespace proposal draw`, then store the agent's claim in `claims/cl-10-intake.yaml` and write `intake/triage.yaml` | `statespace check lab10.4` |
| LAB-10.5 | Write `intake/verdict.yaml`: the violation with a minimal witness, its class and its specimen (`specimens/sp-10-intake.yaml`), or "sound", or the typing rule that rejects it | `statespace check lab10.5` |
| LAB-10.6 | Write the corrected command in `fix/corrected.mp` (for a sound proposal, the proposal itself) | `statespace check lab10.6` |
| LAB-10.7 | Write CL-10.1 in `claims/cl-10-1.yaml`, then `uv run statespace demo record` (add `--explain` to see what it gathers) | `statespace check lab10.7` |
| LAB-10.8 | Write `report/report.md` in nine passes (section 2) | `statespace check lab10.8` |
| LAB-10.9 | Build `bundle/`: the report, the receipts and statements it cites, a LICENSE and REPRODUCE.md | `statespace check lab10.9` |
| LAB-10.10 | Stretch: report a counterexample upstream, with a witness any browser replays | no local check |

A check that fails says what it suspects (your spec, your implementation, the tool) and the first thing that disagreed. If you are stuck, the lab page has the explanation gate and the hint ladder for every check, rungs R0 to R4, and `statespace stuck` writes your failing check as a minimal example.

## 2. The report in nine passes (LAB-10.8)

Each pass fits a weekday window of about 25 minutes or a weekend window of about 45 [D]. Pass 1 is the skeleton and the re-check of every stale receipt; pass 2 PROVED, with statements and hashes; pass 3 MODEL-CHECKED and TESTED, each with its bound or n; pass 4 ENFORCED and CONFIGURED, from read-backs of `transaction_isolation`, the server version and the row-security settings; pass 5 the doubt hunt, with m|n per claim; pass 6 ASSUMED, NOT COVERED and the erosion log; pass 7 the demonstration, the specimens and the agent incident ledger; pass 8 the semantics, the edge-case decisions and the known limitations; pass 9 "What this report establishes and what it does not", written last. If a pass runs past its window, stop at the next section boundary and write what is missing as a dated NOT COVERED line.

A stamp line starts `- [P]`, `- [M]`, `- [T]`, `- [E]`, `- [C]`, `- [A]`, `- [N]` or `- [?]`, sits under its stamp's section, and cites the receipt its stamp re-derives from as `receipt: <path>`. A statement is cited as its statement hash in backticks followed by its path in backticks. `statespace hash <file>` prints the hash.

## 3. Your Core on the wire

`core.toml` names one command. The checks start it once per stage and send one JSON request per line; it replies with one JSON line per request. The full contract, with every field, is the docstring of `.statespace/cli/statespace/demo/adapter.py`.

| Request `op` | Your Core replies |
|---|---|
| `hello` | `{"components": {"parse": "<source path>", ...}}` |
| `parse` | `{"ok": true, "program": <IR>}` or `{"ok": false, "error": "..."}` |
| `typecheck` | `{"ok": true, "types": {...}}` or `{"ok": false, "rule": "unguardedDebit"}` |
| `check` | `{"obligations": [{"name": "nonneg", "query": "<SMT-LIB>", "premise": "<SMT-LIB>"}, {"name": "conserve", ...}]}` |
| `interp` | `{"ok": true, "state": {...}}` or `{"ok": false, "err": "guardFailed"}` |
| `compile` | `{"plan": <your plan>}` |
| `run` | `{"outcome": {...}, "isolation": "serializable", "attempts": [{"attempt": 1, "sqlstate": null, "result": "commit"}]}` |
| `sim` | `{"trace": [<NDJSON records>]}` |

The IR is the program part of IR@1, as `.statespace/cli/statespace/demo/lang.py` documents it. Your checker's queries use the fixed vocabulary of `.statespace/cli/statespace/demo/obligations.py` (`bal`, `p_<param>`, `pre_<term>`, `post_<term>`); the check runs them through the Z3 lane itself, so every query is in your receipt. The checks compare your answers with the reference pipeline's on the fixture corpus (`.statespace/cli/statespace/demo/corpus.py`) and on cases drawn when the check runs.

## 4. Prove-it

After LAB-10.3 and again after LAB-10.8, `statespace defend lab10` seeds mutations of your Core and your report, and you predict each verdict first, with your agent closed: the checker skips the premise-witness query; the compiler drops the rowcount check; the runtime's pool runs READ COMMITTED; the runtime retries a value-out-of-range failure; one TESTED line is restamped PROVED; a pinned statement is edited after its receipt. A surviving mutant is a gap in coverage, and it enters the report as an active doubt.

## 5. What these checks do not do yet

- The tab's re-check of LAB-10.2, LAB-10.4 and LAB-10.5 ("re-checked here"): these stages run the same comparisons on your machine and report them.
- TLC trace validation: the simulation suites run the trace lint and a replay through the reference interpreter until LAB-8's `statespace trace validate` ships.
- report@1 validation and `statespace export --section`: LAB-10.c8 reads the rules it can from Markdown.
- The clean-clone build of the bundle in the devcontainer (LAB-10.c9).
- `statespace defend lab10`.
