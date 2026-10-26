# LAB-2 · the verified ledger

> For the learner's own agent. Hints and Prove-it keys are left out on purpose: the learner meets them on the lab page. The lab page: [labs/LAB-2](../../labs/LAB-2). The repository: [LAB-2.zip](../../labs/LAB-2.zip), with AGENTS.md, CLAUDE.md and the guard hook inside.

**Stage.** S2

The ledger lab. On the Bench you prove the two-account ledger's theorems in Lean, against statements you did not write, keep a specimen of the self-transfer bug beside its fix, and then write the claim cards that say what the proofs establish and what they leave out. Every stage runs a check, and each check reads comparator's verdict lines rather than an exit code.

## The explanation gate

Before the first hint on any check, you write at least 12 words on the failing check, the goal or line it shows, and your hypothesis. It is compared with three authored ideas, self-assessed, and never credited. A check passed after the second hint counts as assisted until an unseen variant passes without help.

Ask for it before you give any hint on a failing check.

## Stages

### LAB-2.1 · `statespace check` on the reference proof of `transfer_conserves`, the only proof the pack ships (copied into LAB-2.2, it fails LAB-2.c2's manual-mode scan); read the receipt's verdict lines

*about 2 min*

Make three calls first: does the reference proof use any axioms, which ones, and what does the check return? Write them in `labs/LAB-2/calls/LAB-2.1.txt`, where the check prints them beside the receipt. Then run `statespace check lab2.1` on the reference module and read the receipt's verdict lines. The reference module is the only proof the pack ships and it earns nothing: copied into the next stage, it fails that stage's manual-mode scan.

- **LAB-2.c1** · The receipt shows acceptance and the axiom list
  Passes when: The receipt validates against receipt@1. The comparator's acceptance line and the kernel's acceptance line are both present. `transfer_conserves` lists exactly `propext` and `Quot.sound` as its axioms (run RUN-lean-ledger). `challengeSha` equals the published hash.

### LAB-2.2 · `transfer_conserves`, manual mode (proof stage)

*about 25 min*

Prove `transfer_conserves` in manual mode, without the automation tactics the check scans for. The allowed branch is arithmetic you can rewrite yourself, and the rejected branch is the untouched state.

- **LAB-2.c2** · Comparator accepts a manual proof
  Passes when: Comparator accepts your proof against the pinned statement, and the axioms stay within the permitted list in `comparator.json`. In manual mode, the automation scan finds none of `grind`, `omega`, `lia`, `simp_arith`, `decide`, `native_decide`, `bv_decide` or `try?` in the proof. A proof that uses one fails this check, and its claim may still be minted.

### LAB-2.3 · `transfer_rejected` (proof stage)

*about 20 min*

Prove `transfer_rejected` in manual mode: when the guard fails, the transfer returns its input unchanged.

- **LAB-2.c3** · Comparator accepts a manual proof
  Passes when: Comparator accepts, the axioms stay within `comparator.json`, and the automation scan finds none of the tactics listed for the previous check.

### LAB-2.4 · `transfer_nonneg` (proof stage)

*about 25 min*

Prove `transfer_nonneg` in manual mode: after an allowed transfer, both balances are at zero or above. Each balance needs a different fact.

- **LAB-2.c4** · Comparator accepts a manual proof
  Passes when: Comparator accepts, the axioms stay within `comparator.json`, and the automation scan finds none of the tactics listed for the second check.

### LAB-2.5 · `run_conserves`, generalizing first (proof stage, `[weekend]`)

*about 45 min · weekend*

Prove `run_conserves`, generalizing the induction hypothesis over the state first. Make one call before you start: which state does your hypothesis mention? This is the hardest move in the stage, so it is planned as a weekend stage.

- **LAB-2.c5** · Comparator accepts the sequence theorem
  Passes when: Comparator accepts `run_conserves` against the pinned statement.

### LAB-2.6 · `Acct → Int`: the fixed transfer conserves; the buggy one mints, by `decide` (proof stage; the template supplies `upd` and the two transfer definitions)

*about 25 min*

Prove the three `xfer_*` theorems about transfers over `Acct → Int`. Then keep the specimen: in the buggy transfer a self-transfer turns a balance of 10 into 15, and in the fixed one the balance stays at 10 (run RUN-lean-selftransfer). Each is closed by `decide`, in its own file. The template supplies `upd`, `xfer` and `xferBuggy`.

- **LAB-2.c6** · The three theorems are accepted and both specimens build
  Passes when: Comparator accepts the three theorems. Both specimen files build and close by `decide` (run RUN-lean-selftransfer). Their axiom lists hold no `sorryAx`, no `_native` axiom and no custom axiom.

### LAB-2.7 · Receipt and claim cards, faded: method, tool and version prefilled; proposition and "if weakened" written by the learner

*about 15 min*

Read your receipt, then write the claim cards for CL-2.1 to CL-2.5. Method, tool and version are prefilled from the receipt. You write each card's proposition in words, its "if weakened" witness and its requirement row.

- **LAB-2.c7** · The whole lab is accepted and every card passes validation
  Passes when: `lake check --paranoid` and the whole-lab comparator both accept (run RUN-lean-comparator). Every card passes claim@1 validation: six fields; method, tool and version equal the receipt's; the statement hash matches; the "if weakened" witness refutes the card's own proposition under its weakened assumption; and requirement-fit is not [P].

### LAB-2.8 · `[stretch]` the transfer as zero-sum postings

*about 25 min · stretch*

Optional: write the transfer as zero-sum postings, minus n and plus n. It points ahead to S3, and nothing depends on it.

## Prove-it

Each Prove-it item mutates a file and asks the learner to predict what the tools answer. The prediction is the learner's, and an agent does not answer it. The items:

- `undefined` on LAB-2.5: undefined
- `undefined` on LAB-2.2: undefined
- `undefined` on LAB-2.4: undefined
- `undefined` on LAB-2.6: undefined
- `undefined` on LAB-2.3: undefined

## Runs cited

- RUN-lean-comparator (lean 4.35.0)
- RUN-lean-ledger (lean 4.35.0)
- RUN-lean-selftransfer (lean 4.35.0)
