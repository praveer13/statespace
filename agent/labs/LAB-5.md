# LAB-5 · the holds spec

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-5](../../labs/LAB-5). The repository: [LAB-5.zip](../../labs/LAB-5.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S5

The holds spec. You model a transfer and then a hold in TLA+ and check them with TLC on the Bench. TLC runs on your machine, and each stage imports a receipt that carries the exact command line. The tab re-checks a safety stage from your spec text when the whole exploration is small enough, and then shows the badge re-checked here. Liveness results stay reported from your machine. The template gives you the DoubleSpend module and its configuration, a read-only environment module, stubs for the properties, folders for broken and fixed variants, and the command `statespace check lab5`. On a phone you predict, read the recorded run, and queue the stage for your machine.

## The explanation gate

Before the first hint on any check, you write at least 12 words on the failing check, the property it protects and your hypothesis. It is compared with three authored ideas, self-assessed, and never credited. A check passed after the second hint counts as assisted until an unseen variant passes: other constants or another number of workers, drawn when it is graded.

Ask for it before you give any hint on a failing check.

## Stages

### LAB-5.1 · Run the provided DoubleSpend configuration on the Bench; read the receipt and its argv

*about 2 min*

Run the provided DoubleSpend configuration on the Bench and read the receipt. Find the command line, the result line and the counts, and note which flags the run used.

- **LAB-5.c1** · The receipt is the deadlock-off run of the provided configuration.
  Passes when: The receipt is valid. Its result line says the invariant `NoOverspend` was violated, with 11 distinct states at depth 5 and a trace of 4 actions in which both reads come before both writes. Its command line has `-deadlock` and one worker (run RUN-tlc-help). The jar's SHA-256 equals the pin (run RUN-tlc-jars), and the spec and configuration hashes equal the template's (run RUN-tlc-doublespend).

### LAB-5.2 · Make the critical step atomic; complete check

*about 25 min*

Make the critical step atomic: merge the guard and the write into one action, then run a complete check.

- **LAB-5.c2** · Your atomic spec passes a complete check, and a spend is reachable.
  Passes when: On your spec, whose hash differs from the provided one, TLC finishes with no error and nothing left on its queue, `NoOverspend` is among the checked invariants, and the constants are printed. To rule out a vacuous pass, a witness operator `NoSpend == spent = 0`, checked as an invariant, is violated, so a spend is reachable (the newer jar can also take an invariant on the command line with `-inv` (run RUN-tlc-help)). The reference fix is the atomic spec (run RUN-tlc-atomic). Your own variables need not give the same state count.

### LAB-5.3 · Holds lifecycle with NeverTwice

*about 25 min*

Write the one-hold lifecycle, Place and then Capture or Release, with a counter for resolutions, and state that a hold never resolves twice.

- **LAB-5.c3** · NeverTwice and TypeOK hold, and both outcomes are reachable.
  Passes when: `NeverTwice` and `TypeOK` hold, and the exploration is complete. To rule out a vacuous pass, two witness operators, `hst # "captured"` and `hst # "released"`, each checked as an invariant, are both violated, so both outcomes are reachable. The reference is (run RUN-tlc-lifecycle).

### LAB-5.4 · Environment actions; find resolved-twice; fix it

*about 25 min*

Add the environment as actions: replies delivered at least once, expiry, crash and restart. Find the hold that resolves twice in the unsafe variant, then fix it.

- **LAB-5.c4** · The unsafe variant breaks NeverTwice, and the fix holds with crashes on.
  Passes when: (a) On the unsafe variant, kept in `broken/`, TLC reports `NeverTwice` violated, and the trace has an expiry step. The reference is (run RUN-tlc-resolved-twice). (b) On the fix, kept in `fixed/`, TLC finishes with no error and nothing left on its queue, with `CrashesOn = TRUE`, and every action of the environment module is taken at least once in the explored graph, as TLC's coverage output shows. The witness operators of the previous check are still violated. The reference is (run RUN-tlc-never-twice).

### LAB-5.5 · Liveness under stated fairness; validate the starving lasso

*about 25 min*

State that a hold eventually resolves, under the fairness your own actions justify, and check it. Then validate the starving lasso that appears when the fairness is removed.

- **LAB-5.c5** · EventuallyResolves holds under your fairness, and the starving lasso is valid.
  Passes when: (a) `EventuallyResolves` holds under your `SysFairness`, and the exploration is complete. TLA+'s parser (SANY) reads `SysFairness` and finds no action defined in the environment module. `CrashesOn = FALSE` is recorded, with no `SYMMETRY`, no `CONSTRAINT` and the deadlock check off, since a resolved hold has no successor. The reference is (run RUN-tlc-eventually). (b) The starving variant's JSON trace is accepted by the lasso checker: it is a path of the graph, it closes, `EventuallyResolves` is false at every state of the cycle, and every conjunct of `SysFairness` holds on it.

### LAB-5.6 · Bound statement and claim cards (write stage)

*about 20 min*

Write the bound statement and the claim cards for CL-5.1, CL-5.2 and CL-5.3. This is a write stage.

- **LAB-5.c6** · The three claim cards are complete, and each stamp prints its bound.
  Passes when: CL-5.1, CL-5.2 and CL-5.3 pass claim validation: six fields and a requirement row. Every model-checked stamp prints its constants, "complete" or "partial", the version line, the jar hash, the command line, symmetry, any constraint and any fingerprint line. CL-5.2 lists SEAM-4 as assumed. CL-5.3 lists every fairness conjunct as assumed and records that crash actions are off (SEAM-8). Each "if weakened" field names a witness that refutes its own claim's proposition: SP-5.1, SP-5.4 and SP-5.3, or your own. A bound statement names the constants and links SP-5.6.

### LAB-5.7 · `[stretch]` an inductive invariant: TLC's inductive check at fixed constants ([M] · constants), then the inductive step for arbitrary N in Z3 with workers as an uninterpreted sort ([P]); Apalache optional

*about 25 min · stretch*

Optional. Check with TLC that your invariant is inductive at fixed constants, which earns a model-checked stamp at those constants and nothing more. Then discharge the inductive step in Z3 with the workers as an uninterpreted sort, which covers every number of workers, with the translation from your spec as an open defeater. Apalache is an optional second check, bounded the same way.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `undefined` on LAB-5.2: undefined
- `undefined` on LAB-5.5: undefined
- `undefined` on LAB-5.4: undefined
- `undefined` on LAB-5.2: undefined
- `undefined` on LAB-5.5: undefined
- `undefined` on LAB-5.5: undefined

## Runs cited

- RUN-tlc-atomic (tlc 2026.10.20.183001)
- RUN-tlc-doublespend (tlc 2026.10.20.183001)
- RUN-tlc-eventually (tlc 2026.10.20.183001)
- RUN-tlc-help (tlc 2026.10.20.183001)
- RUN-tlc-jars (tlc 2026.10.20.183001)
- RUN-tlc-lifecycle (tlc 2026.10.20.183001)
- RUN-tlc-never-twice (tlc 2026.10.20.183001)
- RUN-tlc-resolved-twice (tlc 2026.10.20.183001)
