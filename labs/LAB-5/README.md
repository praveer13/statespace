# LAB-5 · The holds spec

You model a transfer and then a hold in TLA+, and check them with TLC on the Bench, your machine with the real tools. Each stage ends in `statespace check lab5.<k>`, which runs TLC, prints a result per check and writes a receipt under `receipts/LAB-5.<k>/` that you import on the lab's page. The lab's page has each stage's minutes, its check and your call to make before you run.

## Before you start

TLC needs Java (the devcontainer's JDK) and the pinned TLC jar (labs/TOOLS.md section 2.4) [X RUN-tlc-doublespend, RUN-tlc-jars]. Open this repository in the devcontainer, where both are installed, and run `statespace doctor` once. Outside the devcontainer, run every command below as `uv run statespace ...`, and set `STATESPACE_TLA2TOOLS_DIR` to the folder that holds `tla2tools-1.8.0.jar`.

## What is here

| Path | What | Who writes it |
|---|---|---|
| `challenge/DoubleSpend.tla`, `challenge/DoubleSpend.cfg` | the provided DoubleSpend spec and its configuration | the course: read-only |
| `challenge/HoldsEnv.tla` | the environment of a hold: Reply and Crash | the course: read-only |
| `challenge/HoldLiveEnv.tla` | the provider in the liveness model: Busy and Capture | the course: read-only |
| `reading.yaml` | LAB-5.1: what you read off the run | you |
| `atomic/DoubleSpendAtomic.tla` | LAB-5.2: the atomic spec | you |
| `lifecycle/HoldsLifecycle.tla` | LAB-5.3: the one-hold lifecycle | you |
| `broken/HoldsUnsafe.tla`, `fixed/Holds.tla` | LAB-5.4: the unsafe variant and its fix, side by side | you; nothing in `broken/` is deleted |
| `live/HoldLive.tla`, `live/HoldStarve.tla` | LAB-5.5: liveness under your fairness, and the starving variant | you |
| `prove-it/predictions.yaml` | Prove-it: your predictions, written first | you, with your agent closed |
| `HINTS.md` | the hint ladder for every check, behind the explanation gate | the course |
| `../../claims/s5-props.tla` | the statements every check pins: NoOverspend, NeverTwice, EventuallyResolves and the witnesses | the course: read-only |
| `../../claims/cl-5-1.yaml`, `cl-5-2.yaml`, `cl-5-3.yaml`, `s5-bound.md` | LAB-5.6: your claim cards and the bound statement | you |

Every file you write carries a TODO marker, addressed to you, that says what to do. Your agent is asked not to write those parts (AGENTS.md).

## How a check runs TLC

A check does not run your module on its own configuration. It writes a small module, `MC.tla`, that EXTENDS yours and copies each property it checks from `claims/s5-props.tla` as `Pin_<name>`, and a configuration, `MC.cfg`, with the course's constants. It builds the spec from your `Init` (`Init_` in DoubleSpend), your `Next` and your `vars`, plus your `SysFairness` in LAB-5.5. So the property is the stated one, the bound is the course's, and the fairness is exactly yours. Keep the names the starters use.

Each run gets a folder beside the receipt, `receipts/LAB-5.<k>/<time>/<step>/`, with `MC.tla`, `MC.cfg`, the modules as TLC read them, TLC's whole output in `tlc.out` and, where the check asked for one, the JSON trace. To iterate without writing a receipt, run TLC in that folder with the command line the receipt records under `argv`.

## The stages

1. **LAB-5.1 · Run the provided configuration and read the receipt.** `statespace check lab5.1` runs `challenge/DoubleSpend.tla` unchanged, with the deadlock check off. Fill in `reading.yaml` from what TLC printed, then run it again.
2. **LAB-5.2 · Make the critical step atomic.** Merge the guard and the write into one action. `NoOverspend` must hold over the whole reachable state space, and the witness `NoSpend` must be violated.
3. **LAB-5.3 · The holds lifecycle.** Write Capture and Release, count resolutions in `res`, and state `TypeOK`. `NeverTwice` and `TypeOK` must hold, and both outcomes must be reachable.
4. **LAB-5.4 · The environment.** Write the unsafe variant in `broken/` and find the hold that resolves twice, then the fix in `fixed/`, with crashes on.
5. **LAB-5.5 · Liveness.** State `SysFairness` on your own actions, so that `EventuallyResolves` holds, and write the starving variant whose lasso goes round a cycle.
6. **LAB-5.6 · Claim cards.** Write CL-5.1 to CL-5.3 and the bound statement. Each card names its passing receipt, or the stage's receipt folder for the newest one.
7. **LAB-5.7 · `[stretch]`** The inductive check is not built in this version of statespace yet; `statespace check lab5.7` says so and writes no receipt.

`statespace check lab5` runs every stage in order. A failing check prints `suspects: your spec` and what it found, and the receipt is still written: a failing receipt is a record too.

## Prove-it

After the lab, write your predictions in `prove-it/predictions.yaml` with your agent closed, then run `python -m statespace.labs.lab5 defend` (`uv run python -m statespace.labs.lab5 defend` outside the devcontainer). It seeds six mutations into copies of your modules (split the atomic action, drop fairness on expiry, add a duplicate-reply handler, raise Workers to three, restrict expiry to the held state, add SYMMETRY to the liveness check) and prints what TLC says beside what you predicted. TLC grades; nothing else does. It writes under `.statespace/defend/` and never under `receipts/`.

## What a passing check does not say

A check here is model checking at the constants it ran with: complete for that bound, and nothing more. A passing run is about the model and the pinned statement, not about your code, and the seams each card names (SEAM-4, SEAM-8) are assumptions no run checks.
