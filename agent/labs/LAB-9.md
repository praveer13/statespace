# LAB-9 · compiler, preservation proof and SQL validator.

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-9](../../labs/LAB-9). The repository: [LAB-9.zip](../../labs/LAB-9.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S9

Compile a subset of Mini-Plinth into a small IR, prove that the compiler preserves what a client observes, and validate generated SQL one command at a time. The template supplies the source semantics with its adapter, the IR's syntax, the `skip`, `seq` and `abort` clauses of `compile`, and named register-index lemmas, so manual mode keeps `omega` and `grind` off. You write the IR's semantics, `compE`, the `move` and `require` clauses, `InFragment`, `obs`, the matching relation R, every proof and the Rust SQL validator. The first stage is a two-minute win with a reference validator. Seven stages are weekend proof stages of 45 minutes, and a goal you park at the stuck protocol's last step enters CL-9.2 as one more assumed case.

## Stages

### LAB-9.1 · Run the reference translation validator on one compiled command: it accepts the honest output and rejects one that writes to the wrong account (half A; the first win, V2-29; the hoisted write stays unseen until ER-5)

*about 2 min*

Run the reference translation validator on `transfer 30 1 2`, compiled two ways: the compiler's output, and one an agent edited "to reuse a register", which writes the credit to the source account. The validator is a reference module and earns no credit.

- **LAB-9.c1** · Both verdicts reproduce
  Passes when: The validator accepts the compiler's output and prints its bound: the accounts, the balance range and the number of stores enumerated. It rejects the wrong-account output with a store that the interpreter replays as different observations (run RUN-tv-reference).

### LAB-9.2 · Stack-machine compiler correctness, yourself (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove `exec_append` and `exec_comp` for the stack machine yourself, against the pinned statements. The induction generalizes the stack.

- **LAB-9.c2** · The comparator accepts both theorems
  Passes when: The comparator accepts `exec_append` and `exec_comp` against the pinned statement pack. The axioms stay within the allowed list, with no `sorryAx` and no native-computation axiom, and the receipt records that manual mode was on. The proofs from S9.L1 elaborate in plain Lean, without the comparator: (run RUN-lean-stack-machine).

### LAB-9.3 · IR and compiler for the subset (half A)

*about 25 min*

Write the IR's semantics, the `move` and `require` clauses of the compiler, and the lemma that the IR is deterministic. The amount is saved before the first write, and the credit reads the debited store.

- **LAB-9.c3** · The goldens pass and the determinism lemma is accepted
  Passes when: The comparator accepts every golden of the IR pack by `decide`, and accepts `exec_deterministic`. The lint finds no `native_decide`, `implemented_by`, `extern`, `partial` or `unsafe` in `S9/Defs.lean`. The receipt freezes `S9/Defs.lean` by SHA-256.

### LAB-9.4 · Observations and the simulation relation, frozen as learner modules (half B)

*about 25 min*

Choose the observations and the matching relation R, and freeze them as your statement module. Aborts, error codes and every balance must be observable, and R must imply equal observations.

- **LAB-9.c4** · The adequacy theorems are accepted
  Passes when: The comparator accepts `obs_sees_aborts`, `obs_sees_errors`, `obs_sees_balances`, `R_init` and `R_obs` against the course's adequacy module, which imports your frozen `S9/Defs.lean` and `S9/Statement.lean`. The receipt freezes `S9/Statement.lean`. An observer that cannot see aborts cannot pass (SP-9.3).

### LAB-9.5 · Preservation lemma: compiled expressions evaluate as the source does (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the expression lemma: compiled expressions evaluate as the source does, leave the store alone, and change only registers at or above the one that holds the value.

- **LAB-9.c5** · The comparator accepts the expression lemma
  Passes when: The comparator accepts `compE_correct`.

### LAB-9.6 · Preservation: the posting case, postings compiled to writes (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the posting case: a posting pair compiled to IR writes keeps the matching relation. Your first case also mints the claim for the whole theorem.

- **LAB-9.c6** · The posting case is accepted and CL-9.2 is minted
  Passes when: The comparator accepts `move_sim`. CL-9.2 is minted as "PROVED modulo the remaining pinned lemmas", and each remaining lemma is carried as [A].

### LAB-9.7 · Preservation: the guard case, a failing guard included (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the guard case, a failing guard included: the compiled assert aborts with the source's error.

- **LAB-9.c7** · The guard case is accepted
  Passes when: The comparator accepts `require_sim`.

### LAB-9.8 · Preservation: the sequence case (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the sequence case: the second command's code starts from the registers and the store that the first command's code left behind.

- **LAB-9.c8** · The append law and the commit branch are accepted
  Passes when: The comparator accepts `exec_append`, the IR's append law, and `seq_commit`.

### LAB-9.9 · Preservation: the abort case, with aborts observable (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove the abort case, with aborts observable: a command that aborts propagates its error, and the code after it never runs.

- **LAB-9.c9** · The abort cases are accepted
  Passes when: The comparator accepts `seq_abort`, `abort_sim` and `skip_sim`.

### LAB-9.10 · Preservation: the assembled theorem (proof stage, `[weekend]`)

*about 45 min · weekend*

Assemble the theorem: induction on the command with the case lemmas, then equal observations from the matching relation. Close with `#print axioms`, the comparator and manual mode.

- **LAB-9.c10** · The assembled theorem is accepted
  Passes when: The comparator accepts `seq_sim`, `compile_correct`, `compile_complete` and `preservation`, and `#print axioms preservation` stays within the allowed list. CL-9.2 becomes PROVED [P] · Lean 4.35.0 kernel · axioms listed (run RUN-lean-preservation-frag). The paranoid run, with every checker, happens at the Defence.

### LAB-9.11 · A SQL validator (Lane A) on generated plans

*about 25 min*

Write a SQL validator in Rust that compiles to wasm and runs in the tab. It checks each generated plan against its source command and replays every rejection on PGlite and in the interpreter.

- **LAB-9.c11** · Wrong plans are rejected, honest plans are accepted, and every rejection replays
  Passes when: On seeds drawn at grade time: (1) every semantically wrong mutant is rejected, the shape-only mutant included, a plan with the right statement shapes whose credit names `$from`; (2) no honest plan is rejected; (3) every rejection carries a schema-valid instance and parameters that give different outcome classes when replayed on PGlite for the SQL and in the interpreter for the source, and an instance that cannot be inserted, or does not replay as a divergence, fails the check; (4) every verdict prints its bound or n. Reference: (run RUN-sql-validation).

### LAB-9.12 · The bad optimization kept as a specimen; the TCB drawn; claim cards (write stage)

*about 20 min*

Keep the bad optimization as a specimen, draw the trusted base of your own system, and write the claim cards for the three claims.

- **LAB-9.c12** · The specimen replays and the cards pass
  Passes when: `broken/hoist/` sits beside `fixed/`. Two `decide` goldens replay SP-9.1: the minimal witness and a non-minimal member of its class. The trusted-base table gives every component a status. CL-9.1 to CL-9.3 pass the claim validation of `statespace check`, each "if weakened" witness refuting its own proposition.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `undefined` on undefined: undefined
- `undefined` on undefined: undefined
- `undefined` on undefined: undefined
- `undefined` on undefined: undefined
- `undefined` on undefined: undefined
- `undefined` on undefined: undefined
- `undefined` on undefined: undefined

## Runs cited

- RUN-lean-preservation-frag (lean 4.35.0)
- RUN-lean-stack-machine (lean 4.35.0)
- RUN-lean-toolchain (lean 4.35.0)
- RUN-sql-validation (postgres 18.6)
- RUN-tv-reference (statespace-tv 1)
