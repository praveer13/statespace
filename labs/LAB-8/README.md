# LAB-8, effects-sim

You model what happens after the commit, build the outbox worker as a sans-I/O machine, run it under seeded faults, and check that its traces are behaviors of your spec. The stage text, minutes and calls are on the lab's page; this file says what is here and how to run each check. The lab system is in [labs/README.md](../README.md) of the course, and the pins in its TOOLS.md.

**Before you start.** LAB-8 runs on the Bench: Java (the devcontainer's JDK) and the pinned tla2tools jar [X RUN-tlc-jars] for the spec and the traces, Rust and cargo for the machine, and PostgreSQL for LAB-8.5. Inside the devcontainer all of them are there. Run `uv run statespace doctor` first.

## What is here

| Path | Who writes it | What |
|---|---|---|
| `challenge/OutboxIface.tla` | the course (pinned) | the variables and who owns them, the windows, the provider's Accept and Forget |
| `challenge/TraceValidation.tla` | the course (pinned) | the line counter, `IsEvent`, `Unlogged` and the verdict of a trace module |
| `challenge/*.cfg` | the course (pinned) | each check's TLC configuration, and the trace constants |
| `../../claims/OutboxProps.tla` | the course (pinned) | the properties and the fairness compositions |
| `reference/` | the course | the reference spec and trace module for LAB-8.1 (reference module, earns nothing) |
| `spec/Outbox.tla` | you | the worker's actions, Crash, Recover and the fairness conjuncts (LAB-8.2, LAB-8.3) |
| `spec/OutboxTrace.tla` | you | one trace disjunct for each worker event (LAB-8.6) |
| `sim/src/world.rs`, `sim/src/main.rs` | the course | the harness: database, network, provider, timers, crashes, the NDJSON log |
| `sim/src/machine.rs`, `sim/src/faults.rs` | you | the machine and the fault plan (LAB-8.4) |
| `sim/src/specimen.rs` | you | a failing run mounted as a specimen (LAB-8.7) |
| `challenge/schema.sql` | the course (pinned) | the tables of the reply handler |
| `sql/inbound.sql` | you | the reply handler (LAB-8.5) |
| `../../claims/progress.yaml`, `../../claims/cl-8-*.yaml` | you | what each progress property needs (LAB-8.3), and the five claim cards (LAB-8.8) |
| `prove-it/predictions.yaml` | you | your Prove-it predictions, agent closed |
| `traces/` | you, from runs | the NDJSON traces you write |
| `HINTS.md` | the course | the hint ladder of every check |

## The stages

| Stage | You run | The check |
|---|---|---|
| LAB-8.1 | `uv run statespace sim 1 --reference --out labs/LAB-8/traces/seed-1.ndjson`, then `uv run statespace trace validate labs/LAB-8/reference/OutboxRef.tla labs/LAB-8/traces/seed-1.ndjson` | `uv run statespace check lab8.1` |
| LAB-8.2 | write `spec/Outbox.tla` | `uv run statespace check lab8.2` |
| LAB-8.3 | write the fairness conjuncts and `claims/progress.yaml` | `uv run statespace check lab8.3` |
| LAB-8.4 | write `sim/src/machine.rs` and `sim/src/faults.rs`; `cargo run --release -- suite --seeds 1,2,3` in `sim/` | `uv run statespace check lab8.4` |
| LAB-8.5 | write `sql/inbound.sql` | `uv run statespace check lab8.5` |
| LAB-8.6 | write `spec/OutboxTrace.tla`; `cargo run --release -- trace --seed 7 --out ../traces/seed-7.ndjson` in `sim/`, then `uv run statespace trace validate labs/LAB-8/spec/Outbox.tla labs/LAB-8/traces/seed-7.ndjson` | `uv run statespace check lab8.6` |
| LAB-8.7 | write `sim/src/specimen.rs` | `uv run statespace check lab8.7` |
| LAB-8.8 | complete the five claim cards | `uv run statespace check lab8.8` |
| LAB-8.9 `[stretch]` | add the key TTL and replayed 500 responses to your spec | no check |

Each check draws its seeds when it starts and prints them; the receipt keeps them. A failure names its seed and its first violating step, and the same seed replays it.

## trace@1

One JSON object per line, at the grain of the spec's actions, written by the harness from what it did to your database and the network. Every line has a string `event`; `Dispatch` carries `cmd`, `key` and `att`; `Commit`, `Timeout`, `TimerArmed`, `Receive`, `Persist` and `Ack` carry `cmd`; `Crash` and `Recover` carry nothing more; the last line of a complete log is `{"event":"End"}`. The provider's steps are not logged: TLC searches for them. `statespace trace validate` lints a trace before TLC reads it and names the line of a problem.

## Prove-it

After the lab, write your predictions in `prove-it/predictions.yaml` with your agent closed, then run `uv run python -m statespace.labs.lab8 defend`. It seeds each mutation into a copy of your own artifacts and lets TLC, your suite or the trace check grade it. It writes nothing under `receipts/`.
