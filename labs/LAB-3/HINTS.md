# LAB-3 hint ladders

Written in advance (labs/README.md section 11; curriculum/S03-semantics.md section 4.3). Before any rung, the
explanation gate: name the failing check, the property it protects and your hypothesis, in at least 12 words.
Open the rungs in order. Past R2, the check counts as assisted until an unseen variant passes without help; after
R4 and two more failing runs, ask for the worked solution, and redo it after 24 hours. Your coding agent gives
these rungs and nothing beyond them (AGENTS.md).

## LAB-3.c1 · One golden passes

- **R0** Write what a golden asserts, and what `decide` does with it. Compare: a golden is a theorem about one call; `decide` makes the kernel compute both sides; a false golden is an error, not a warning.
- **R1** S3.L9, "goldens as theorems": a golden that elaborates is a fact the kernel checked, and `#eval` is not one.
- **R2** The failing line of the receipt is `Tactic decide proved that the proposition ... is false`: your right-hand side is not the reference's outcome.
- **R3** Read `transferCall` and `s0` in `reference/MiniPlinthRef/Programs.lean`, then step through `execWith` in `Eval.lean`: which of its eight steps returns?
- **R4** None: the stage is a prediction. Run `statespace check lab3.1` again after each change.

## LAB-3.c2 · Typing goldens build

- **R0** Name the rule the failing golden expects, and what that rule protects.
- **R1** S3.L2 segment 1 and the rule table in `Lab3/Typing.lean`: a rejection names the first rule that fails, in the order R-param, guard, statement.
- **R2** The receipt names the golden, its command and the verdict it expects; the generated command is `c_<golden>` in `Lab3Gen/Typing.lean` beside the receipt.
- **R3** A skeleton: `def typecheck (c : Cmd) : Except TypeErr Unit := do` / `if !distinct (c.params.map Prod.fst) then .error .dupParam` / `expect c.params c.guard .bool; checkStmt c.params c.guard c.body`.
- **R4** In prose: infer each expression's type from the parameters (unknown variable: `unknownParam`; a mismatch: `wrongType`); an operation's amount must be an `amount` parameter or a positive literal (`nonPositive`); a move or hold needs a top-level conjunct `balance(x) >= n` naming the debited account and the same amount (`unguardedDebit`); `set` assigns only `frozen` (`balance` is `assignsResource`).

## LAB-3.c3 · Evaluator goldens build

- **R0** Name the outcome-order step the failing golden tests.
- **R1** S3.L3 (errors as values) and the order in `Lab3/Eval.lean`; S3.L8 for a golden with no verdict: `decide` needs definitions the kernel can reduce.
- **R2** The first failing golden, both sides: the receipt prints the expected outcome, and `Lab3Gen/Goldens.lean` beside it holds the call and the pre-state.
- **R3** The branch to change is the step the expected outcome names: `badArgument` is step 2, `unknownAccount` step 3, `selfTransfer` step 4, `guardFailed` step 5, `unknownHold` and `holdNotOpen` step 6, `overflow` step 7.
- **R4** The outcome order for that call, step by step, from the command lookup to the effects, under your policy.

## LAB-3.c4 · The operation lemmas are accepted

- **R0** For each lemma, name which conjunct of `Inv` needs which hypothesis.
- **R1** S3.L6 segments 1 and 2; drawer D-07 for the Lean errors you are likely to meet.
- **R2** The unsolved goal: `lake build Lab3.Proofs` prints it, under the theorem's name.
- **R3** The case split and the template lemma: `unfold applyOp at h` (or `simp only [applyOp] at h`), `split at h`, then `exact inv_of_bals_eq rfl (post_inv ...)`.
- **R4** An informal proof of `post_inv`: unique keys survive `setBal`; the total is unchanged because the debit and the credit cancel (`total_setBal` twice); the debited account stays non-negative by the coverage hypothesis; the credited one by positivity.

## LAB-3.c5 · The step-invariant theorem is accepted

- **R0** Say where the coverage of a move comes from when `exec` succeeds.
- **R1** S3.L6 segment 3: the guard covers the debit because the type checker said so.
- **R2** The unsolved branch: usually the move or hold case of the statement, after the guard returned `true`.
- **R3** `covers_sound` by induction on the guard: `induction g with | ge l r => cases l ... | and l r ihl ihr => ... | _ => simp [covers] at hc`.
- **R4** An informal proof of the assembly: unfold `exec`; every error branch is impossible because the call succeeded; the zero no-op and a silent guard return `s`; otherwise the command is in the program, so it type-checks; its guard evaluated to `true`, so `covers_sound` gives the coverage `move_inv` and `hold_inv` need; the other operations need none, and `set` leaves the balances alone.

## LAB-3.c6 · The counterexample is kernel-checked

- **R0** What does a counterexample golden prove that a failed proof attempt does not?
- **R1** S3.L9 cell 1: a kernel-checked counterexample settles the question; no cleverer proof exists.
- **R2** The witness state's shape: three accounts, all at zero, and a call that moves more than the sender has.
- **R3** `intro h; have := h [forcePay] ⟨"ForcePay", [...]⟩ s₀ s₁ [] [...] (by decide) (by decide) (by decide); exact absurd this (by decide)`.
- **R4** The witness written out: from mint 0 · a 0 · b 0, `ForcePay(a, b, 1)` commits with a at -1, so `Inv` fails after a successful step of a well-typed program.

## LAB-3.c7 · Four records and a valid export

- **R0** Say what each record must contain, and why the choice must match `Lab3.policy`.
- **R1** S3.L7 segment 3: decisions travel to the compiler, the interpreter and every observer.
- **R2** The receipt names the missing section, the `choice:` that disagrees, or the first command your export encodes differently.
- **R3** A record: a `choice:` line, then the headings `## Decision`, `## Alternative considered`, `## Consequence`, `## Downstream`, each with a paragraph.
- **R4** None: the records are yours.

## LAB-3.c8 to LAB-3.c10 · Your Rust

- **R0** Name the IR field or the outcome that differs, and the rule or step that should have produced it.
- **R1** Drawer D-14; curriculum/S03-semantics.md section 2.7; the IR shapes in `rust/src/ir.rs`.
- **R2** The first mismatching sample: the receipt prints the golden's outcome beside yours, and the folder beside it holds every request and answer (`*.requests.jsonl`, `*.answers.jsonl`).
- **R3** The AST, the rule or the branch to change: for a parser, the production of the failing line; for the type checker, the rule the golden names; for the interpreter, the outcome-order step.
- **R4** An outline of the function: a lexer with line and column, recursive descent in the grammar's order, then inference from uses (c8); your Lean `typecheck`, line for line (c9); your Lean `exec`, line for line, with `i128` balances (c10).

## LAB-3.c11 · Claim cards and a differential run

- **R0** Say what n samples establish, and what they do not.
- **R1** S3.L9: a passing comparator run is about the pinned statement; goldens tie the definitions to the reference; samples say nothing about other inputs.
- **R2** The failing claim@1 field, or the first fresh program that disagrees, with both outcomes.
- **R3** The six fields: `proposition`, `assumptions`, `model`, `method`, `correspondence`, `if_weakened`, and the `requirement` row; no stamp anywhere.
- **R4** None: the cards are yours.

## LAB-3.c12 and LAB-3.c13 · Progress and preservation (stretch)

- **R0** Say what progress and preservation buy, and which business invariant they do not.
- **R1** S3.L5, and PFPL sections 6.1 and 6.2.
- **R2** The unsolved case: for progress, the guard configuration; for preservation, the step from `bind` to `guard`.
- **R3** For progress, a lemma first: a well-typed expression, in an environment that agrees with its parameters, evaluates to a value of its type (`∀ e t, inferTy Γ e = .ok t → ∃ v, evalExpr env s e = some v ∧ HasTy v t`, by induction on `e`).
- **R4** Progress: `bind` and `run` always step, because `bindArgs` and `runStmt` are total; `guard` steps because the guard is a `bool` by the lemma. Preservation: the only step that needs work is `bind → guard`, where `bindArgs` builds an environment that agrees with the parameters (induction on the parameters).
