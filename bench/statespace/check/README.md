# The Bench CLI core: check, receipt verify, hash, run, export

**Status:** built by W1-T29; the lab frame (discovery, the listing, the Z3Py capture, the lab package) added 2026-10-26. **Date:** 2026-10-25 (machine clock).

This directory is the core of the `statespace` command line (spine section 9.6; ARCHITECTURE.md sections 10 and 11): the runner behind `statespace check`, the lane protocol that engines plug into, `statespace run` and `statespace export`. Beside it, `statespace/cli.py` holds the command table, `statespace/receipt.py` writes and verifies receipts, `statespace/hash.py` prints statement hashes, and `statespace/lanes/z3.py` is the first lane. LAB-1's checks are W1-T30's (`statespace/labs/lab1.py`); the Lean (W2-T32, W2-T33), TLC (W3-T05), cvc5 (W3-T22), PostgreSQL (W4-T16) and trace (W5-T14) lanes are added beside the Z3 lane.

## 1. What is here

| Path | What |
|---|---|
| `../cli.py` | the command table: `doctor`, `check`, `receipt`, `hash`, `run`, `export`, and the course harnesses `isorun` (LAB-6), `trace` and `sim` (LAB-8), `demo` and `proposal` (LAB-10); each command's module loads only when it is named |
| `__init__.py`, `model.py`, `context.py` | what a lab module imports: `Lab`, `Stage`, `CheckSpec`, `CheckResult`, `CheckContext` |
| `labs.py` | the short names (`lab1`, `lab1.3`), the lookup of `statespace/labs/lab<n>.py`, and discovery by directory: `available()` (the lab modules in `statespace/labs/`) and `repo_labs(root)` (the folders `labs/LAB-<n>/` of a lab repository) |
| `z3py.py` | `ctx.z3py(script)`: runs a learner's Z3Py script once and captures each question it asks as SMT-LIB, for the Z3 lane to answer |
| `../labs/` | the lab modules, `lab<n>.py`, one per lab; `__init__.py` lists them by directory. Each lab's module is its task's (LAB-1's is W1-T30's) |
| `runner.py` | `statespace check`: runs a stage's checks and writes its receipt |
| `lanes.py` | the lane protocol and its discovery; `ToolUnavailable`, `InputRefused` |
| `proc.py` | one engine process: merged output, a wall-clock backstop that kills the process group, timing |
| `runs.py` | `statespace run`: re-executes a registry run and compares its verdict lines |
| `export.py` | `statespace export`: the lab bundle (labbundle@1) |
| `../receipt.py` | assembling receipt@1, its integrity digest, `statespace receipt verify` |
| `../hash.py` | `statespace hash` |
| `../lanes/z3.py` | the Z3 lane |
| `fixtures/z3-verdict-lines.json` | Z3's own output for 40 queries through both entries, captured from the pinned engine and recorded as RUN-z3-verdict-lines, with the verdict lines and verdicts the grammar gives and the constants of the model each output holds, plus 12 synthetic edge cases; for this reader and the tab's (W1-T14) |
| `fixtures/lab-repo/` | a lab repository holding two receipts that `statespace check` wrote for the test lab LAB-90, with their statements and run inputs |
| `tests/` | the tests (section 8) |

LAB-90 and CL-90.x are test identifiers of `tests/support.py`, not course IDs.

## 2. Commands

| Command | Does | Exit status |
|---|---|---|
| `statespace check` | with no target: lists the labs of the repository, found by their folders `labs/LAB-<n>/`, with each stage's short name, id and title and each check's id and label | 0 |
| `statespace check <lab>[.<stage>]` | runs every check of the stage, or of every stage of the lab, and writes one receipt per stage to `receipts/LAB-<n>.<k>/<UTC time>.json`, with each run's input and output in the folder of the same name; `--assisted none\|explain\|code` and `--agent yes\|no` declare provenance (OD-8); `--json` for harnesses | 0 every check passed, 1 a check failed, 2 usage, 3 a stage could not run (no receipt) |
| `statespace receipt verify <file>...` | section 6; `--root` names the lab repository when the file is not under `receipts/LAB-<n>.<k>/`; `--json` | 0 verified, 1 rejected, 2 usage or unreadable |
| `statespace hash <file>...` | the comparator-style statement hash, `sha256(trimRight(text) + "\n")`, one `<hash>  <file>` line per file (`-` reads standard input); `--json` | 0 hashed, 1 a file could not be (missing, not UTF-8) |
| `statespace run <RUN-id>...` | section 7; `--all [--engine E]`, `--config ID`, `--engine-version V`, `--save DIR`, `--json` | 0 reproduced, 1 differs, 2 usage, 3 not re-executable |
| `statespace export` | the lab bundle: `claims/*.yaml` as text, every statement (`claims/*.smt2`, `*.tla`, `*.sql`, `labs/LAB-*/challenge/*.lean`, and each statement a receipt pins) as text with its statement hash, `specimens/**` as text, every receipt, and the commit; `--out FILE` or `-` | 0 written, 2 usage, 3 invalid against labbundle@1 |
| `statespace isorun <spec>` | runs an isolationtester-format spec on PostgreSQL, advancing a step only when it finishes or the server reports it waiting on a lock, and writes history@1 (`../isorun.py`, LAB-6) | see `--help` |
| `statespace trace validate <spec> <traces>` | checks NDJSON traces as behaviors of a TLA+ spec with TLC, after the trace@1 lint (`../trace.py`, LAB-8) | see `--help` |
| `statespace sim <seed> [--reference]` | runs the outbox simulator under a seeded fault schedule; `--reference` runs the course's machine (`../sim.py`, LAB-8) | see `--help` |
| `statespace demo`, `statespace demo record` | the reference pipeline on the provided agent proposal (LAB-10.1), and the demonstration record (LAB-10.7) (`../demo/`) | see `--help` |
| `statespace proposal draw` | draws an unseen agent proposal for LAB-10.4 (`../demo/proposal_cli.py`) | see `--help` |

The lab bundle `statespace export` writes, which W1-T14's labbundle@1 is to describe (ARCHITECTURE.md section 8.3):

```
{ "schema": "statespace/labbundle@1", "createdAt": "<instant>", "cli": { "name": "statespace", "version": "..." },
  "commit": "<git HEAD, 40 or 64 hex digits>" | null,
  "claims":     [ { "path": "claims/x.yaml", "text": "..." } ],
  "statements": [ { "path": "claims/x.smt2", "kind": "smt2" | "tla" | "sql" | "yaml" | "lean-challenge", "sha256": "<statement hash>", "text": "..." } ],
  "specimens":  [ { "path": "specimens/...", "text": "..." } ],
  "receipts":   [ { "path": "receipts/LAB-1.3/<file>.json", "receipt": { ...receipt@1... } } ] }
```

`statespace check` looks for the lab repository upward from the current directory: the first directory that holds the lab's own directory, `labs/LAB-<n>/`. When provenance is not declared, the receipt records the most help, `assisted: code` and `agent: yes`, and the command says so: an unsure declaration should declare more help, not less (labs/README.md section 14). `STATESPACE_GUARD=off` is recorded as `guard: off`.

A stage writes a receipt only when every check reached a result. An engine that is not installed (`ToolUnavailable`), or a check that breaks, means nothing was judged: the stage prints why and writes nothing, and a broken check says that the fault is in statespace, not in the learner's work. Input the learner wrote that cannot run as given (`InputRefused`, such as an SMT-LIB script with two `(check-sat)`s) fails that check and names the learner's spec. Before a receipt is written it is verified the way `statespace receipt verify` verifies it.

## 3. Writing a lab module

A lab is `statespace/labs/lab<n>.py` and defines `LAB`. Nothing runs at import time: `statespace receipt verify` imports the module to compare a receipt with the lab.

```python
from statespace.check import CheckContext, CheckResult, CheckSpec, Lab, Stage

def c3(ctx: CheckContext) -> CheckResult:
    query = ctx.statement("claims/cl-1-1.smt2", "smt2")     # pinned (I7), and read as Z3 reads it
    z3 = ctx.z3()
    violation = z3.run(query, step="violation", rlimit=5_000_000)               # entry "cli" by default
    premises = z3.run(premise_text, step="premises", rlimit=5_000_000, entry="api")
    z3.headline(violation)                                   # the receipt's z3 section
    if violation.verdict == "unsat" and premises.verdict == "sat":
        ctx.claim("CL-1.1")                                  # kept only if this check passes
        return CheckResult(True, "the guarded violation query is unsat, and the premises have a model")
    return CheckResult(False, f"violation {violation.verdict}, premises {premises.verdict}", "spec", ("a distinguishing state ...",))

LAB = Lab("LAB-1", "Project 00", stages=(
    Stage("LAB-1.3", "Add the sufficient-funds guard", (CheckSpec("LAB-1.c3", "guard", c3),), claims=("CL-1.1",)),
))
```

The context gives a check:

- `ctx.root`, `ctx.lab_dir`, `ctx.path(rel)`: the lab repository; a path that leaves it raises `ValueError`.
- `ctx.statement(path, kind)` pins a statement and returns its text, and `ctx.text(path)` returns any file's text: both read the file's bytes as UTF-8 with no line-ending translation, and refuse (`InputRefused`) a file that is missing, cannot be read or is not UTF-8. Give a lane text read this way, never with `Path.read_text`, which turns a bare carriage return and `\r\n` into `\n` where Z3 does not (section 4): a guard after `; guard` and a carriage return is part of the comment for Z3 (case `cli-cr-in-comment`) [X RUN-z3-verdict-lines], and `Path.read_text` would make the check pass on a guard Z3 never reads. A statement run as it is then is the pinned file, so the run's `inputSha256` and `z3.smtlibSha256` equal the statement's hash.
- `ctx.seed` and `ctx.rng`: a seed drawn when the stage starts, for parameters drawn at grade time; pass it to a run as `seed=` and it is recorded in that run's budget.
- `ctx.z3()`: the stage's Z3 session (section 4). Every run is recorded in the receipt in the order it ran, with argv, input hash, budget, exit code and verdict lines; a check never writes a run itself.
- `ctx.claim(template, id=...)`, `ctx.tcb(component, status)`, `ctx.ext[...]`, `ctx.note(text)`.

`CheckResult(passed, message, suspect, details)`: `suspect` names what a failing check suspects, one of `spec`, `implementation`, `tool` and `proof`, printed as "suspects: your spec" (labs/README.md section 6).

- `ctx.z3py(path)` runs a Z3Py script (`python -I -m statespace.check.z3py`, under the Python that runs statespace, with the script's folder first on its path) and returns a `Capture`: each `Solver.check()` call as a `Query` (its SMT-LIB from `Solver.to_smt2()`, with `(check-sat-assuming ...)` for assumptions, a step name `<script>-q<k>`, and the answer Z3Py gave inside the script, which is data and never graded), the version the script's z3 reports, the printed lines, and the last line of a traceback when it raised. Put each query through `ctx.z3()`: the receipt then records every question the script asked, with its hash, its `rlimit` and Z3's own verdict lines.

What `statespace check` prints for a stage, one block per check:

```
LAB-1.1 · <stage title>
  FAIL  LAB-1.c1  <check label>
                  <message>
                  suspects: your spec
                  <details, then the notes the check printed>
  receipt  receipts/LAB-1.1/<UTC time>.json (reported from your machine; <n> runs; <engine version>)
```

A check id is `LAB-<n>.c<k>`, by convention `<k>` the stage it closes (`model.py` refuses another form); a stage is `LAB-<n>.<k>`; a claim template `CL-<n>.<m>`. A check that is not built yet raises `ToolUnavailable`, so its stage writes no receipt and says why.

## 4. Lanes, and the Z3 lane

A lane is a module under `statespace/lanes/` that declares `ENGINES`, the `runs[].engine` values it reads, and `derive_verdict(lines)`; it may add `verify_receipt(receipt, root)`, `rerun_plan(...)` and `compare_output(...)` (`lanes.py` documents each). The CLI finds lanes by importing every module there, so adding one needs no edit elsewhere. The verdict of every run is derived from its verdict lines by the same function the receipt verifier uses, so the two cannot drift, and no exit code is an input.

**The Z3 lane** (`lanes/z3.py`; INS-bench-smt) runs one query per run under an `rlimit` from 1 to 2³² − 1, because Z3 reads the parameter as an unsigned 32-bit number and refuses a larger one on a line of its own, exiting 110 (case `cli-rlimit-too-large`) [X RUN-z3-verdict-lines]. The lane never runs unbounded, and its default of 5000000 is a design value [D]. Two entries, recorded as the receipt's `z3.entry`, because the command line and the Python API can answer differently [X RUN-z3-11179]:

| Entry | Command, as the receipt records it | Tool in `tools[]` |
|---|---|---|
| `cli` | `z3 -smt2 -model rlimit=<n> <input>` | `z3-cli`: the binary's SHA-256 and its `--version` line |
| `api` | `python -P -m statespace.lanes.z3 --rlimit <n> --model <input>`: the input's bytes as UTF-8 with no line-ending translation; the script up to its question, read into a `Solver` under `Solver.set("rlimit", n)` with `Solver.from_string`; then `check(*assumptions)` under the question's assumptions, and the answer printed in the command line's format | `z3`: the SHA-256 of the native library the package loads |

The names and the pins are `statespace doctor`'s (W0-T05), so `pinned` is true exactly when the hash is the course's pin [X RUN-doctor-devcontainer]. The engine is named by its name in argv, and paths are relative to the lab repository, so no path of the machine enters a receipt. The input of every run is the query's text with trailing whitespace removed plus one newline, written beside the receipt: the SHA-256 of what the engine read is then the query's statement hash, and `z3.smtlibSha256` names it in both senses. `query_script(assertions)` adds `(check-sat)` and `(get-info :reason-unknown)`. A wall-clock backstop of 120 s [D] kills a run the `rlimit` did not stop, and the run then has no verdict.

**One question per run.** Both entries must answer the question the script asks, so `check_script` refuses (`ScriptRefused`, which fails the check and names the learner's spec) any script that is not exactly one question:

- one `(check-sat)` or `(check-sat-assuming (<literal> ...))`, and no `(check-sat-using ...)`, which picks Z3's own tactic;
- no annotation, `(! ...)`, anywhere in the question's terms, spelled `!` or `|!|`, which Z3 reads as the same keyword: it answers `unsat` to `(check-sat-assuming ((|!| p :named q)))` after `(assert (not p))`, with no error (case `cli-quoted-annotation-assumption`) [X RUN-z3-verdict-lines]. The api entry reads each assumption with `parse_smt2_string`, which, with unsat cores on, returns a named assumption as an implication from its name, `(=> under-max (<= amount 0))`, that the name's being false satisfies. So premises that contradict each other, `amount > 0` asserted and `amount <= MAX_TRANSFER` with `MAX_TRANSFER = 0` assumed under the name `under-max`, are `unsat` through the command line (case `cli-named-assumption`) and were `sat` read that way (`values.parse_smt2_string_assumption_reading`) [X RUN-z3-verdict-lines], and a vacuous claim looked non-vacuous. The rule does not depend on the script's options. What the refusal suggests instead reads the same through both entries: a named assertion before the question (cases `cli-named-premises`, `api-named-premises`), or an assumed Boolean constant that an assertion ties to the formula, `(declare-const under-max Bool)(assert (=> under-max (<= amount MAX_TRANSFER)))(check-sat-assuming (under-max))`, `unsat` through both for the same premises (cases `cli-assumed-constant`, `api-assumed-constant`) [X RUN-z3-verdict-lines];
- before the question, only what sets it up: `set-logic`, `set-option`, `set-info`, declarations, definitions, `assert`, `push`, `pop`, `reset`, `reset-assertions`. A `get-` command there reads an answer not asked for yet, `exit` leaves before the question, and `simplify`, `eval` and `display` print terms that can read as an answer: `(simplify sat)`, for a constant named `sat`, prints `sat` before a question that then fails (case `cli-printed-word-before-question`) [X RUN-z3-verdict-lines];
- after the question, only what reads the answer: the `get-` commands, `eval`, `set-info` and `exit`. Z3 prints its answer before it reads a later `(assert false)` (case `cli-assert-after-question`) [X RUN-z3-verdict-lines], so a later assertion changes nothing and only misleads the reader;
- no `echo`, and no `set-option` of an rlimit, a timeout or a memory limit (`:rlimit`, `:opt.rlimit`, `:timeout`, `:solver.timeout`, `:combined_solver.solver2_timeout`, `:memory_max_size`, `:sat.max_memory` and the like), in any case or spelling. A script's own `:rlimit` replaces the one on the command line: under `(set-option :rlimit 0)` the cubes query, which `rlimit=5000000` stops with `unknown`, gave no answer within 3 s (cases `cli-script-rlimit-overrides` and `cli-unknown-rlimit`) [X RUN-z3-verdict-lines]. Nor an option that sends Z3's output elsewhere;
- no `set-option` that turns models off or prints them as text: `:produce-models` or `:model` set to anything but `true`, or `:model.v1` or `:model.v2` set to anything but `false`, in any case and spelled as Z3 reads them (`|false|` is `false`). A check reads its witness from the model a run prints: under `(set-option :produce-models false)` or `(set-option :model false)` the command line answers `sat` and prints no model (cases `cli-produce-models-off`, `cli-model-off`), and under `(set-option :model.v1 true)` it prints the model as a quoted string of `name -> value` lines (case `cli-model-v1-text`) [X RUN-z3-verdict-lines]. The api entry prints its solver's model itself: read its way, the first and the last of those scripts give a model of `define-fun` items that defines `a`, `b` and `amount` (`values.from_string_produce_models_off_reading`, `values.from_string_model_v1_reading`) [X RUN-z3-verdict-lines], so the two entries would hand a check different models;
- every top-level form is a command, a list headed by its name (`not a command`), because `Solver.from_string` reads a text that starts `p c` as DIMACS: it answered `unsat` to the clauses `p cnf 1 2`, `1 0`, `-1 0`, where the command line reports `p` as an invalid command and answers `sat` to the `(check-sat)` after them (case `cli-dimacs-prefix` and `values.from_string_dimacs_reading`) [X RUN-z3-verdict-lines]. The refusal names a character that prints as nothing, such as a form feed or a byte order mark, by its code point;
- no NUL character (U+0000), because `Solver.from_string` takes a C string and reads a script only up to its first NUL, where the command line reads past it: premises whose second assertion follows a NUL in a `;` comment are `unsat` through the command line (case `cli-nul-in-comment`) and were `sat` through `from_string` (`values.from_string_nul_reading`) [X RUN-z3-verdict-lines], so a vacuous claim looked non-vacuous;
- and the script must be one the lane can read (`the script cannot be read as SMT-LIB`), because Z3 runs every command it read before a fault, so a fault would hide the commands after it from these rules: `(echo "unsat")(exit)` followed by a stray `)` asks no question, yet Z3 prints `unsat` and exits 0 (case `cli-stray-paren-after-echo`) [X RUN-z3-verdict-lines]. The lane reads SMT-LIB 2.6 as Z3 does and refuses the two things Z3 reads its own way: a `#|` block comment, which Z3 ends at the first `|#` and which hid `(echo "unsat")` from a reader that took the `|` for a quoted symbol, so that Z3 printed `unsat` to a script that asks no question (case `cli-block-comment-hides-echo`), and a backslash in a `|quoted symbol|`, where Z3 reports an error and reads on from the backslash (case `cli-backslash-in-quoted-symbol`) [X RUN-z3-verdict-lines].

The rules apply to the bytes Z3 reads, the input file as written, and a refused script is never written for Z3 to read, through either entry. The api entry reads the input's bytes with no line-ending translation, so both entries read the same script: Z3 ends a `;` comment only at a line feed, so the guard after `; guard` and a bare carriage return is part of the comment and the guarded query is `sat` through both entries (cases `cli-cr-in-comment`, `api-cr-in-comment`), and a string literal in a CRLF file keeps its `\r\n` through both (cases `cli-crlf-string`, `api-crlf-string`) [X RUN-z3-verdict-lines]. Read with `Path.read_text`, which turns the carriage return into a line feed, the guarded query answered `unsat` (`values.read_text_cr_reading`) [X RUN-z3-verdict-lines]. It reads the script up to its question with `Solver.from_string` and checks under the question's assumptions, each read with `parse_smt2_string` as the last formula of the text before the question plus `(assert <assumption>)`, which reads a term with no annotation as the command line assumes it (the annotation rule above covers the rest), so it answers as the command line does: through both entries `(check-sat-assuming (p))` after `(assert (not p))` is `unsat` (cases `cli-check-sat-assuming`, `api-check-sat-assuming`), and so are named premises that contradict each other, SP-1.6's shape with `MAX_TRANSFER = 0` (cases `cli-named-premises`, `api-named-premises`) [X RUN-z3-verdict-lines]. The reading it used before, `parse_smt2_string`, returns each named assertion as `(=> name formula)` with nothing assuming the name, and answered `sat` to those premises (`values.parse_smt2_string_reading`) [X RUN-z3-verdict-lines], so a vacuous claim looked non-vacuous. `set-logic` is read the same way through both entries: under `QF_LIA` a nonlinear assertion is an error before the answer, so the verdict is `error` through both (cases `cli-nonlinear-in-qf-lia-then-sat`, `api-nonlinear-in-qf-lia`) [X RUN-z3-verdict-lines]. The two entries remain different front ends of Z3, and an option the API cannot apply after the start, such as `:global-declarations`, is an error there, so they can still answer differently [X RUN-z3-11179]; the receipt records which one answered (`z3.entry`).

**Verdict lines.** For engine `z3`, `runs[].verdictLines` holds:

- an answer: exactly `sat`, `unsat` or `unknown`;
- a reason: `(:reason-unknown "<text>")`, kept only when the text is not empty;
- an error: a line that starts `(error "`, continued on later lines until one ends `")`;
- a note from the CLI: a line that starts `statespace: `, when the backstop stopped the engine, it printed nothing, or the api runner could not ask the script's question.

Any other line is not a Z3 verdict line, and a receipt that holds one is rejected. The verdict is `error` when a note is present, when an error line comes before the answer, or when there is not exactly one answer; otherwise it is the answer. An error before the answer means Z3 dropped part of the script and answered another question: in case `cli-error-then-sat` it prints an error for an undeclared constant, answers `sat` and exits 1 [X RUN-z3-verdict-lines]. An error after the answer does not change it: in case `cli-model-asked-after-unsat`, asking for a model after `unsat` exits 1 and the verdict stays `unsat` [X RUN-z3-verdict-lines]. Models are not verdict lines; a run keeps its model (`run.model.value("amount")`) for the check to replay, because model values are not canonical and witnesses are checked, never matched (spine section 9.1). The model is the block that `-model` prints last: the last block after `sat` that reads as a model, a list of `define-fun` items, with the `declare-fun` and `forall` items of an uninterpreted sort's universe. `-model` prints it after the output of every other command, `(exit)` included, so what `(get-info :reason-unknown)`, `(get-model)`, `(get-value (a b amount))`, `(eval (- a amount))` and `(get-assignment)` print after the question comes before it, the last of them an empty list, since nothing is named (case `cli-get-value-after-sat`), while the api entry prints only the answer and the model (case `api-get-value-after-sat`) [X RUN-z3-verdict-lines]; through both entries the model defines `a`, `b` and `amount`. Besides the model that `(get-model)` prints, none of those reads as a model: values are `(term value)` pairs, `(eval ...)` prints a term, `(get-info ...)` a keyword and its value, and an empty list holds no item, so an empty block is the model only when no block with an item reads as one. That matters only for a run made with `model=False`, where the model is the one `(get-model)` prints. `fixtures/z3-verdict-lines.json` holds every case, with the constants of the model each one prints. `scripts/spikes/W1-T29/capture-z3-lines.py` captured it from the pinned engine and recorded the execution as RUN-z3-verdict-lines, whose outputs are the fixture and the transcript `runs/RUN-z3-verdict-lines/capture.log`; the expectations are stated by hand in the script rather than computed by the lane. The api cases run this repository's runner, which the record lists as an input: after a change to `lanes/z3.py`, capture again, or GATE-runs reports the input as changed.

## 5. Receipts that `statespace check` writes

`receipts/LAB-<n>.<k>/<YYYYMMDDTHHMMSSZ>.json`, receipt@1, `lane: reported`, with the stage's runs, tools, pinned statements, checks, the claims of passing checks, the trusted base, the engine sections (`z3`), provenance and the environment of `statespace doctor` (devcontainer digest or null, operating system, architecture; the sandbox is `off` for every stage that runs no Lean). The folder of the same name holds each run's input (`<step>.smt2`) and output (`<step>.out`).

**The integrity digest**, `ext.integrity = {"scheme": "statespace-receipt-integrity@1", "sha256": ...}`: the SHA-256 of the receipt's canonical JSON without `ext.integrity` (and without `ext` when nothing else is in it). Canonical JSON sorts keys by code point, writes no white space, escapes every non-ASCII character as `\uXXXX` with lowercase hexadecimal, and writes integers in decimal. A receipt is not signed, and anyone can recompute the digest, so it catches an edit made after the CLI wrote the file without recomputing it, and nothing more (labs/README.md section 8).

## 6. `statespace receipt verify`

It accepts W0-S11's seven valid receipt fixtures and the two receipts in `fixtures/lab-repo/`, and rejects a copy with a failing check flipped to pass and one with a flipped verdict and a recomputed digest [X RUN-bench-cli-acceptance]. In the order of the tab's importer (ARCHITECTURE.md section 10.3), it rejects:

1. bytes the tab would read differently: not UTF-8, a byte order mark, a duplicate key, `NaN` or `Infinity`, more than 16 MiB [D];
2. anything receipt@1 refuses, such as a lane of `re-checked here` or a typed-in stamp;
3. a stage or a check of another lab, a check listed twice, and, where this CLI holds the lab's definition, a stage, check or claim template that is not the lab's;
4. a run whose stored verdict its verdict lines do not carry, re-derived by the lane of its engine; runs of an engine with no lane yet are shown as reported, with a note. A lane module that cannot load (`lanes.broken()`) rejects every receipt, since nothing can tell which engines it would have read: a fault in statespace never passes as a receipt that verified;
5. a z3 run whose command line ran under another `rlimit` than its budget says, or whose input file on disk has changed; a z3 section that no z3 run with that input, verdict and `rlimit` backs, whose `entry` the command lines of those runs contradict (`z3 ...` is `cli`, `python -P -m statespace.lanes.z3 ...` is `api`; a command that names neither is taken as reported), or a `reason_unknown` without `unknown`;
6. a statement whose file now has another statement hash: its claim voids to [?]; a statement or input that is not on disk is shown as reported, with a note;
7. a tool whose `pinned` flag disagrees with this CLI's pins, when this version of the CLI wrote the receipt;
8. an integrity digest that does not match; a receipt without one is accepted with a note.

## 7. `statespace run`

In the course repository it reads `runs/<RUN-id>.json` (run@1), checks that each input on disk still has the recorded SHA-256, asks the engine's lane for the command, runs it, and compares the output with the recorded verdict lines. A record with configurations is re-executed as its `primary_config` unless `--config` names another: the top level repeats that configuration's argv and verdict lines, while its inputs are every configuration's.

The Z3 lane runs the recorded argv; for an imported run whose argv was not recorded and whose input is one Z3Py script, it runs the form the spikes ran, `uv run --with z3-solver==<version> python -I <script>` (labs/TOOLS.md section 2.1). A command that names its inputs relative to where it runs (`sh tour_cli.sh`, which reads `smtlib/starter.smt2`) runs in a scratch directory that holds them laid out as it expects (`runs.layout`): the first input the command names, by its file name or the end of its path, anchors the layout; every input under the anchor's directory keeps its place beside it; an input elsewhere is staged under the name the command gives it; and inputs the command does not name, which belong to other configurations, are not staged. Two inputs that would land in one place refuse the run.

It reads each line in the context of the lines before it (`script_lines`). A verdict line is compared by its label and its verdict words, and an `unknown` line also by the reason after its verdict word, with timings removed. A witness replay, the indented `  replay ok: ...` or `  replay FAILED: ...` line that W1-T12's scripts print under each `sat`, is compared by whether it held, against the replay that follows the same verdict line in the new output, because the values it names are a model's; a core check (`  core check: ...`) and every other line are compared verbatim. Only model lines are skipped, since model values are not canonical: an indented line that continues a model its verdict line left open (`[q] sat [A = 1,` then ` B = 2]`), or a line inside a model block that opens with `(`. Each recorded line is matched to its own line of the new output, and a line the new output prints and the record does not is a difference when it carries a verdict: an answer, an `(error ...)` line, a reason that is not empty, a replay that FAILED, a check that does NOT hold, or a second verdict line for a label the record has. When the record gives an exit code, a re-run that exits with another one differs as well. So a tool bump that starts dropping an assertion, turns an incompleteness into a budget stop or leaves a witness that no longer replays does not pass as reproduced. A version banner that the recording harness printed, and the re-run does not, is skipped with a note.

`statespace run RUN-z3-starter` reproduces `sat`, then `unsat` [X RUN-z3-starter, RUN-bench-cli-acceptance], and `statespace run RUN-z3-smtlib-tour` reproduces its 16 verdict lines [X RUN-bench-cli-acceptance]. A run is refused, with the reason, when no lane reads its engine yet, when it ran in a container image or with placeholders such as `<sandbox>` in argv, when an input changed, when the record names several scripts and no argv or its argv holds several commands, when the command is the api entry's runner, or when `--engine-version` is asked of a command that pins no `z3-solver`. `--engine-version` re-runs under another Z3 for a tool bump, and `--all --engine z3` re-runs every Z3 record: on this registry it reproduces the 16 it can re-execute, with W1-T12's replay and core-check lines compared (RUN-z3-vacuous-unsat: 25 of 25 verdict lines), and gives the reason for each of the 9 it does not [X RUN-bench-cli-acceptance]. One of the 16 depends on the machine's load: the script of RUN-z3-unknown-pow gives its queries wall-clock timeouts of their own, 5000 ms for the quantified query that gave up as incomplete after 4.44 s [X RUN-z3-unknown-pow], so on a loaded machine that query can reach the timeout first, and `statespace run` then reports the changed reason as a difference, as it reports any. With `--all` a refusal does not change the exit status, except that a lane module that cannot load refuses every run and exits 3, statespace's own exit status for a run it could not re-execute [D].

## 8. Tests

From the repository root, with the pinned engine:

```
uv run --project bench --locked --group image python -I -m unittest discover -s bench/statespace/check/tests -t bench
```

`test_z3_lane.py` (the grammar and the model each captured output holds against every fixture case, the fixture against its run record, the one-question rules, scripts the lane cannot read, models and values, the model read as the last block after what other commands print, the context in which script lines are read and the comparison of re-run output, replays and core checks included, live runs through both entries that must answer the script's question alike and hand a check a model that holds the witness whatever the script prints after its question, named assertions, `set-logic`, carriage returns in comments and CRLF strings included, the api runner reading its input file as bytes, scripts that must never reach Z3 through either entry (a NUL, a form outside any command, a script the lane cannot read, an annotation in the question in each spelling and form, with what the refusal suggests instead answering alike, and an option that turns models off or prints them as text), refusals that name nothing internal and show a command's name as it is spelled, the `rlimit`, the backstop, and a drift check that the pinned engine still prints what the fixture captured), `test_receipt.py` (W0-S11's valid and invalid receipt fixtures, the receipts in `fixtures/lab-repo/`, one test per tampering, and a lane that cannot load, named without internal words), `test_check.py` (the runner end to end, statements run as the bytes of the learner's files: CRLF, a guard after a carriage return in a comment, a premise after a NUL, a premise assumed under a name; a witness read from a starter that asks for values after its question; and a stage whose receipt would not verify, which writes nothing), `test_hash.py` (every shared vector of `schemas/vectors/statement-hash.json` through the `statespace hash` process), `test_runs.py` (RUN-z3-starter, RUN-z3-smtlib-tour and RUN-z3-bv64-negamt re-executed, the layout of staged inputs, the primary configuration, a witness that stops replaying, a core check that stops holding, a label answered twice and a changed exit code, each through `statespace run`, the refusals on synthetic records, and a lane that cannot load), `test_export.py` and `test_cli.py`. Tests that need Z3 skip without it, and the re-executions of registry runs skip without `uv`. A re-execution of another task's record (RUN-z3-smtlib-tour, RUN-z3-bv64-negamt) also skips when `statespace run` refuses it because an input changed since it was recorded, which GATE-runs reports while that task re-records it; any other refusal or difference fails. The fixtures are regenerated with `scripts/spikes/W1-T29/capture-z3-lines.py` (then `node scripts/runs/build-index.mjs`) and `scripts/spikes/W1-T29/make-fixture-receipts.py`. Until a CI lane runs these tests and `statespace run`, `scripts/spikes/W1-T29/record-acceptance.py` records the acceptance commands and this suite as RUN-bench-cli-acceptance: `receipt verify` on the fixtures and on two tampered receipts, `run RUN-z3-starter`, `run RUN-z3-smtlib-tour`, `run --all --engine z3` and the tests, each with its whole output under `runs/RUN-bench-cli-acceptance/`.

## 9. Not here yet

- `statespace check` does not yet apply the claim rules to `claims/*.yaml` itself; LAB-1.c6 validates the two cards (W1-T30), and the claim rules are W1-T15's.
- `statespace run --record`, which records a new run (ARCHITECTURE.md section 9.4), and re-execution inside a container image.
- labbundle@1 validation: `statespace export` validates against it once W1-T14 publishes `schemas/labbundle.schema.json` and the schema package is regenerated; until then it notes that the bundle was not validated.
