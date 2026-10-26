# LAB-2, the verified ledger

You prove a two-account credit ledger's theorems in Lean, against statements you did not write. This folder is
a Lean project: run every Lean command from here, and `statespace check` from anywhere in your repository.

## Before the first stage

Open your repository in the devcontainer and run `uv run statespace doctor` until it is green (drawer D-15).
The toolchain is the one `lean-toolchain` names [X RUN-lean-toolchain].

Lean's sandbox does not start in a default container, and `statespace check` then writes no receipt and says
why [X RUN-lean-bwrap-docker]. You have two ways on: the devcontainer's opt-in sandbox profile (labs/README.md
section 4.4 in the course), or running without the sandbox, which is your decision to make and record:

```
STATESPACE_SANDBOX=off uv run statespace check lab2.2
```

Every receipt made that way records `sandbox: off`, and Lake prints its own warning that the run is not
trustworthy [X RUN-lean-axioms]. Your agent never makes this choice for you.

## The stages

| Stage | You write | Check |
|---|---|---|
| LAB-2.1 | your three calls in `calls/LAB-2.1.txt`, then run the reference | `uv run statespace check lab2.1` |
| LAB-2.2 | the proof of `transfer_conserves` in `Solution.lean`, manual mode | `uv run statespace check lab2.2` |
| LAB-2.3 | the proof of `transfer_rejected`, manual mode | `uv run statespace check lab2.3` |
| LAB-2.4 | the proof of `transfer_nonneg`, manual mode | `uv run statespace check lab2.4` |
| LAB-2.5 | the proof of `run_conserves`, a weekend stage | `uv run statespace check lab2.5` |
| LAB-2.6 | the three `xfer_*` proofs, then the specimens in `broken/Broken.lean` and `fixed/Fixed.lean` | `uv run statespace check lab2.6` |
| LAB-2.7 | the fields marked by hand in `claims/CL-2.1.yaml` to `claims/CL-2.5.yaml` | `uv run statespace check lab2.7` |
| LAB-2.8 | optional: the transfer as zero-sum postings, in a file of your own | none |

LAB-2.7 also runs `lake check --paranoid` over the whole environment, which took a median of 172.552 s on the
recording host [X RUN-bwrap-lanes#values.timings_s.check-paranoid.median]; a slower machine takes longer.

Each check prints `pass` or `FAIL`, what it suspects when it fails, and the receipt it wrote under
`receipts/LAB-2.<k>/`. Import that receipt on the course's Bench page.

To iterate without writing receipts, use the tools themselves: `lake build`, then
`lake comparator --config stages/LAB-2.2/comparator.json` (add `--inadvisably-no-sandbox` only if you made the
choice above) [X RUN-lean-comparator]. Each stage's configuration names only that stage's theorems, so later theorems may stay `sorry`
while you work.

## What is pinned

`challenge/Challenge.lean` and every `comparator.json` are the course's: read them, never edit them. The
challenge's statement hash, `sha256(trimRight(text) + "\n")`, is

```
c46098c4ddd44e8040abbad342665424e76c6bacecaa9c6082c11e36cd0428d0
```

and `uv run statespace hash challenge/Challenge.lean` prints it. Every check compares the file with it, and a
changed challenge voids every LAB-2 claim. `Solution.lean` carries the challenge's definitions once, so that the
two specimen files can import them: comparator rejects a definition that differs from the challenge's
[X RUN-lean-comparator].

`Reference.lean` is LAB-2.1's reference module, the only proof this pack ships. It earns nothing.
