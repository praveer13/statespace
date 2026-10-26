# LAB-3 · mini-plinth-core

You give the roadmap's toy language a meaning in Lean, prove that every successful step keeps the state
invariant, keep the unsafe command that breaks it in `broken/`, record your edge-case decisions, export your
semantics as JSON, and write a Rust front end and interpreter that agree with the course's kernel-checked
goldens. The stages, their minutes and their checks are on the lab's page; this file says where things are and
how the checks read your work.

## What is where

| Path | Who writes it | What |
|---|---|---|
| `MiniPlinth/Core.lean`, `MiniPlinth/IR.lean` | the template (read-only) | accounts, values, the state and its lemmas, `Inv`, errors, effects, types, expressions with `evalExpr` and two guard lemmas, resolved operations (`Op`), calls, the policy, and JSON for all of them |
| `reference/MiniPlinthRef/` | the course (read-only) | the reference semantics: syntax, type checker, evaluator, the reference program (`refProgram`, `transferCall`, `s0`, `s1`) and the small-step relation (`Step.lean`). Reference module, earns nothing; `Lab3/` may not import it |
| `challenge/` | the course (read-only) | the signature file, the pinned statements, the golden pool (`goldens.json`) and `comparator.json` |
| `Start.lean` | you | LAB-3.1: your prediction of one golden |
| `Lab3/Syntax.lean`, `Lab3/Typing.lean`, `Lab3/Eval.lean` | you | LAB-3.2 and LAB-3.3: `ResourceOp`, `Stmt`, `Cmd`, `covers`, `typecheck`, `post`, `applyOp`, `exec`, `policy` |
| `Lab3/Proofs.lean` | you | LAB-3.4 and LAB-3.5: the step invariant, against the statements in `challenge/Lab3Challenge/Statements.lean` |
| `broken/Lab3Broken/` | you | LAB-3.6: your semantics with `force move`, and the counterexample. Nothing here is deleted |
| `Lab3/Export.lean`, `../../decisions/*.md` | you | LAB-3.7: your syntax as IR@1, and four decision records |
| `rust/` | you, from the template's `json.rs`, `ir.rs` and `main.rs` | LAB-3.8 to LAB-3.11: `parser.rs`, `typecheck.rs`, `interp.rs` |
| `corpus/` | the course | the parser corpus: `pos/*.mp` with the IR each must give, `neg/*.mp` with the line each must be rejected at |
| `stretch/Lab3Stretch/` | you | LAB-3.12 and LAB-3.13 (stretch): progress and preservation for the template's small-step relation |
| `../../claims/cl-3-*.yaml` | you | LAB-3.11: the claim cards CL-3.3, CL-3.4 and CL-3.5 |
| `Lab3Gen/` | the checks | the goldens the checks write in a scratch copy; the copy here is empty |
| `HINTS.md`, `prove-it/mutants.yaml` | the course | the hint ladder for every check, and the Prove-it mutations |

Every file you write carries a `TODO(you)` marker where your part goes. Your coding agent may not edit those
files (the guard hook); it may read them, and it may help with proofs once you have written the statements'
definitions.

## Goldens

A golden is a theorem about one call, `exec p c s = r` or `typecheck c = r`, closed by `decide`: the kernel
computes both sides. The course drew the pool's inputs from a seed, stratified by command, outcome class and
policy, with balances at the 64-bit boundary; computed every right-hand side with the reference; and
kernel-checked every golden against it with no axioms before the pool shipped
[X RUN-interp-goldens]. The pool's hash is pinned in the command line, so a changed pool is refused.

`statespace check lab3.3` writes one literal and one theorem per golden of your policy into a scratch copy
(`Lab3Gen/Goldens.lean`), builds it against your `exec`, and reads Lean's own lines: a golden that fails to
reduce gives no verdict, which is not a pass, and a golden that depends on an axiom fails. Keep your evaluator
structurally recursive, with no `partial`, `implemented_by`, `extern`, `unsafe` or `native_decide`: the lint
finds them. The lakefile keeps `backward.match.sparseCases = false`, without which a `match` with a wildcard
compiles with `propext` and every golden over it would depend on an axiom [X RUN-interp-goldens].

## The checks

Run `uv run statespace check lab3.<k>` from anywhere in your repository (inside the devcontainer,
`statespace check lab3.<k>`). Each check prints `pass` or `FAIL`, what it found, and what it suspects; every
stage that reaches a verdict writes a receipt under `receipts/LAB-3.<k>/`, which you import on the Bench page.

| Stage | What the check runs |
|---|---|
| LAB-3.1 | builds the reference, then `Start.lean`, and reads `#print axioms golden_transfer_ok` |
| LAB-3.2 | builds `Lab3/`, the signature file, and every typing golden |
| LAB-3.3 | the lint, then every evaluator golden under `Lab3.policy` |
| LAB-3.4 | builds `Lab3/Proofs.lean`, prints the axioms of the six lemmas, and runs `lake comparator` against the pinned statements; no `grind` in those six proofs |
| LAB-3.5 | `lake comparator` on `covers_sound` and `step_preserves_inv`, then LAB-3.3's goldens again on the same receipt |
| LAB-3.6 | builds `broken/`, matches `force_typechecks` and `cex_force` with their pinned statements, then LAB-3.5's comparator on `Lab3/` |
| LAB-3.7 | your four decision records against `Lab3.policy`, then `lake exe export-ir`, validated against IR@1 and compared with the pool |
| LAB-3.8 | `cargo build --release --offline` of `rust/`, then the `mp3` driver on the corpus |
| LAB-3.9 | `mp3` on typing goldens sampled by a seed drawn when you run it |
| LAB-3.10 | `mp3` on evaluator goldens of your policy, sampled by a fresh seed, at least one per stratum |
| LAB-3.11 | your three claim cards (claim@1), then fresh programs through your interpreter and the course's reference |
| LAB-3.12, LAB-3.13 | `lake comparator` on `progress` and `preservation` (stretch) |

**The sandbox.** `lake comparator` builds and exports inside bubblewrap, which a default container cannot
start [X RUN-lean-bwrap-docker]. When it cannot, the check writes no receipt and says why. Running without it
is your decision, made once and recorded: `STATESPACE_SANDBOX=off statespace check lab3.4`, and every receipt
then says `sandbox: off` (labs/README.md section 4.4).

**LAB-3.6 and comparator.** The export replay that `lake comparator` runs cannot reduce `decide` over `String`
equality, so it rejects a kernel-checked `cex_force` [X RUN-lean-unsafe-cmd]. LAB-3.c6 therefore matches your
two theorems with their pinned statements in Lean itself (`theorem pinned_cex_force : <pinned text> :=
Lab3.cex_force`), and the receipt records the statement check as weak.

## The toy syntax

The roadmap's text reads verbatim:

```
entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.
```

```
program := ("entity" Account ";"? | command)*
command := "command" Name "(" [param ("," param)*] ")" ";"? ["requires" expr ";"?] "do" stmt "."? ";"?
param   := name [":" type]                      type: account | amount | hold | int | bool
stmt    := "move" e "from" e "to" e | "deposit" e "to" e | "hold" e "on" e | "capture" e "to" e
         | "release" e | "set" field "(" e ")" ":=" e
expr    := neg ("&&" neg)*        neg := "!" neg | cmp        cmp := sum [(">=" | "=") sum]
sum     := atom (("+" | "-") atom)*
atom    := int | "-" int | "(" expr ")" | "balance" "(" expr ")" | "frozen" "(" expr ")" | name
```

`--` starts a comment. A command with no `requires` has the guard `0 >= 0`. `from`, `to` and `on` are keywords
only where an operation expects them. An untyped parameter takes its type from its uses; uses that disagree, a
parameter nothing types, or a second command of one name is an error that names its line and column.

## IR@1 and the driver

`lake exe export-ir` and the Rust crate speak IR@1 (`schemas/ir.schema.json` in the course repository). Every
sum type is an object with a `tag`; every balance or amount is a decimal string, because the boundary goldens
pass 2^63 and a JSON number loses precision above 2^53 [D]. The template's `rust/src/ir.rs` reads and writes all
of it with `i128` balances. `rust/src/main.rs` is the driver the checks run: one JSON request per line in, one
answer per line out (`parse`, `typecheck`, `exec`), described at the top of the file.
