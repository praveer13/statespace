# LAB-1 · Project 00, the counterexample lab

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-1](../../labs/LAB-1). The repository: [LAB-1.zip](../../labs/LAB-1.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S1

Project 00 is the roadmap's first-weekend checklist plus conservation and a double capture. It runs on your machine with `uv run`, pinned to the same solver version as the tab (5.3.1), or entirely in the tab. It never needs a devcontainer. Each stage ends in a check that reads the solver's answer, and a model is graded by replaying it, never by matching its values. Every stage opens with a call: predict, then run the reference.

## The explanation gate

Before the first hint on any check, you write at least 12 words: the failing check, the property it protects and your hypothesis. Nothing grades what you write. A check passed after the second hint counts as assisted until an unseen variant passes without help: other parameter sets and seeds, drawn when it is graded.

Ask for it before you give any hint on a failing check.

## Stages

### LAB-1.1 · Run the Z3Py introductory example, then the roadmap's starter; see `sat`, then `unsat`

*about 2 min*

Run the Z3Py introductory example, then the roadmap's starter, and see the answer change when the guard arrives. Call the two answers first. The starter prints its own answer, so this call is practice and is never scored.

- **LAB-1.c1** · The answer pair reproduces.
  Passes when: `z3.get_version_string()` reports the pinned version, and `starter.py` prints a model and then `unsat` (run RUN-z3-starter). Model values are not compared. The introductory example is run and logged, not graded.

### LAB-1.2 · Find a transfer that makes the source balance negative

*about 20 min*

Find a transfer that makes the source balance negative. Then minimize your witness's amount with Optimize, and say what "minimal" covers.

- **LAB-1.c2** · Your violation query finds a real overdraft.
  Passes when: Your violation query has a model, and that model satisfies `a >= 0`, `b >= 0` and `amount > 0` and leaves the sender below zero under your encoding. Reported but not required: whether your query is equivalent to the premises plus the negated property. A narrower query gets a distinguishing state, "your query would miss this violation".

### LAB-1.3 · Add the sufficient-funds guard: `unsat`, plus a satisfiable premise witness

*about 15 min*

Add the sufficient-funds guard. The violation query should then have no model, and a premise query beside it should have one. Then drop `amount > 0` and predict the sender's answer over `Int`.

- **LAB-1.c3** · The guard works, and its answer is not empty.
  Passes when: The guarded violation query has no model. The premise query, with the premises and the guard and no negated property, has a model that satisfies every premise. The guard is equivalent to `amount <= a` under the premises, so a guard that also rejects a full-balance transfer fails with the state that shows it. The violation query is equivalent to the premises plus the guard plus the negated property, so extra constraints cannot make "no model" cheap.

### LAB-1.4 · Introduce the buggy refund rule, find the second counterexample, fix it so a non-minimal witness also dies

*about 25 min*

Introduce the buggy refund rule and find the second counterexample. Fix it so that a witness you have not seen dies too. Then find which conjunct of your fixed refund is load-bearing by deleting each in turn.

- **LAB-1.c4** · The fix kills the whole class.
  Passes when: Your mint query on `broken/refund.py` has a model that replays, and the witness is written to your specimens. Your mint query on `fixed/refund.py` has no model for the base parameters, and for two parameter sets drawn at grade time from the bug's family: a non-zero floor, a prior partial refund, a fee. The fixed rule's premise query has a model, so some refund with `r > 0` is accepted, because rejecting every refund is not a fix. A non-minimal witness of the clamp class, drawn at grade time, is rejected or conserves under your fixed rule, and a rejected refund leaves both balances as they were.

### LAB-1.5 · Conservation and double capture as two-state properties

*about 25 min*

Write conservation and the double capture as two-state properties, with primed variables. Then ask whether conservation catches your double capture.

- **LAB-1.c5** · Both properties give the expected answers on fresh seeds.
  Passes when: On the base model and on three seeds drawn at grade time (hold amounts, other holds pooled in `held`, initial status): the transfer step, written with primed variables, conserves the total (the negation has no model) and the step relation itself has a model. The buggy capture applied twice has a model for the at-most-once query, with a witness that replays. The fixed capture has none. One fixed capture succeeds.

### LAB-1.6 · README with the property, assumptions, solver answer, example model and limitations; two claim cards prefilled from the receipt

*about 25 min*

Write the README with the property, assumptions, solver answer, example model and limitations. Two claim cards are prefilled from your receipt.

- **LAB-1.c6** · The README matches the receipt, and the cards hold.
  Passes when: The README has the headings Property, Assumptions, Solver answer, Example model and Limitations, each non-empty. Every answer line under Solver answer matches a receipt line word for word, with the solver version and the budget. The example model replays as a violation of the stated property. Both cards (CL-1.1 and CL-1.4) pass the claim check: six fields present, method, tool and version equal to the receipt's, the statement hash equal to the hash of your `claims/*.smt2` file, the "if weakened" witness refuting the claim's own proposition on replay, and requirement-fit never marked [P]. Prose quality is not graded, and nothing here is graded by a language model.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `drop-amount-positive` on LAB-1.3: `premises()` in `transfer.py` drops `amount > 0`; the encoding stays `Int`.
- `weaken-guard` on LAB-1.3: The guard becomes `amount <= a + 1`.
- `strict-guard` on LAB-1.3: The guard becomes `amount < a`.
- `bitvec64` on LAB-1.3: Every `Int` in `transfer.py` and `holds.py` becomes a signed BitVec 64.
- `refund-credit-unguarded` on LAB-1.4: One conjunct of the fixed refund is dropped, drawn by seed. Here the credit no longer depends on acceptance.
- `refund-debit-unguarded` on LAB-1.4: One conjunct of the fixed refund is dropped, drawn by seed. Here the debit no longer depends on acceptance.
- `drop-status-check` on LAB-1.5: The fixed capture drops its status check.

## Runs cited

- RUN-z3-starter (z3 5.3.1)
