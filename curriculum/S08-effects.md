# S8 Effects (TLA+, Rust): curriculum spec

**Status:** authoring spec for W5 (W5-T01 the simulator instrument and `statespace trace validate`; W5-T02 the S8 lessons and LAB-8; W5-T03 the S8 runs; W5-T10 erosions ER-4 and ER-8; W5-T11 anchors AUD-8.1 and AUD-8.2; W5-T13 the Clearinghouse provider and ER-12). **Date:** 2026-10-24. **IDs:** every ID comes from `docs/spine/SPINE.md`; the run IDs, misconception tags and one lab stage this spec needs and the spine lacks are marked "proposed" and listed in §13, never used silently.

**Sources, in precedence order:** the roadmap (Stage 8); executed runs (none for S8; nearest [X RUN-tlc-jars], [X RUN-tlc-doublespend], [X RUN-tlc-hold-lasso]); the brief (V2-24, §7.4, §7.9); the digests; R3 F10–F11, F20–F21; R4 §2.6 (row H20); A1-F7, F9, F10; A2-F15 and A2's `-loadTrace` note; the spine; S1's and S5's conventions.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships (GATE-runs); `[V]` re-read at a primary source on 2026-10-23; `[D]` design rationale; grades A–D follow the pedagogy digest. A **key** is the checker verdict an item expects; GATE-calls confirms it against the cited run, and if they disagree the item changes. Learner copy follows "Copy:", says "your system", uses only the spine's glossary and no internal names.

---

## 0. The stage at a glance

**Promise.** Model what happens after the commit: find every crash window between your database and an external service, say which guarantee needs which assumption, and check that your code behaves like your model.

**New tool.** None: TLA+ returns (TLC 1.8.0, SHA-256 `5bd7b64d…52b1e2` [X RUN-tlc-jars]; Java 21), and so does Rust (Lane A, D-14). Roadmap time: 3–6 weeks.

| ID | Tier | Title | Minutes | KCs introduced | Calls | Specimens · claims |
|---|---|---|---|---|---|---|
| S8.L1 | bridge | Commits are not sends | 15–25 | KC-8.commit-not-send | 1 | — |
| S8.L2 | bridge | The outbox, modeled | 15–25 | KC-8.outbox-chain | 1 | — |
| S8.L3 | core | Every crash window | 40–60 | KC-8.crash-windows, KC-8.at-least-once | 3 | SP-8.1, SP-8.2 · CL-8.1 |
| S8.L4 | bridge | Replies are untrusted input | 15–25 | KC-8.untrusted-replies, KC-8.idempotency-keys | 3 | SP-8.3 · CL-8.2 |
| S8.L5 | bridge | Progress needs recovery | 15–25 | KC-8.progress-needs-recovery | 3 | SP-8.6 · CL-8.4, CL-8.5 |
| S8.L6 | core | Deterministic simulation and trace validation | 40–60 | KC-8.deterministic-simulation, KC-8.trace-validation | 3 | SP-8.4 · CL-8.3 |
| S8.L7 | bridge | Exactly-once is a pair; the provider's horizon | 15–25 | KC-8.provider-horizon (KC-8.at-least-once spirals) | 2 | SP-8.5 · CL-8.2's horizon clause |

**KCs.** Ten, as in spine §4; the threshold KCs KC-8.commit-not-send and KC-8.at-least-once get extra calls, spiral returns in S8.L7 and places in the S8 and S10 Defences (§13, issue 12). Lessons list prerequisites. Scaffolding follows expertise reversal (A [dp row 9]): novice treatment everywhere except KC-8.untrusted-replies, which rests on the learner's Rust and Postgres practice.

**Lab, claims and seams.** LAB-8, effects-sim: eight planned stages plus two `[stretch]` stages, LAB-8.9 and LAB-8.10 (proposed, §13 issue 10); LAB-8.7 builds S10.L5. Cashes ER-4 (S8.L3) and ER-8 (S8.L5); plants SEAM-12, cashed by ER-12 after S9. Anchors AUD-8.1 (G7), AUD-8.2 (G8). Outcome (e) (spine §2.2). No technical note follows S8.

**Paths.** Default order: S8.L1 → LAB-8.1 → S8.L2 → LAB-8.2 → S8.L3 → LAB-8.4 → S8.L4 → LAB-8.5 → S8.L5 → LAB-8.3 → S8.L6 → LAB-8.6 → LAB-8.7 → S8.L7 → LAB-8.8 → the Defence; LAB-8.3 needs S8.L5 (§13, issue 3). Builder's path (spine §3.0): S8.L1–S8.L4 with LAB-8.1, 8.2, 8.4 and 8.5 after S6.L7, D-14 first, LAB-8.5 against the labeled reference compiler; the rest after S6.L9. TLA+ has idled since S5, so S8.L2 opens with S5 re-finds (A4 review).

---

## 1. Conventions in this file

**Call It and surprise forecasts** follow S1's conventions: three confidence taps with printed bands, chance 1/k printed, payoffs as feedback only, the first call final; §2.8 tallies keys and forecasts for GATE-items.

**Misconception tags** are the pedagogy digest's catalog IDs, written `dp:E1` (S1's convention; the catalog's G-tags collide with gap classes): Stage 8's **dp:E1** "the outbox gives exactly once", **dp:E2** a fresh key on every retry, **dp:E3** the ack always arrives, or liveness checked with crashes off, **dp:E4** the provider's idempotency outside the trusted base; cross-stage dp:C5, dp:X1 and dp:X4; and S5's proposed dp:T9 (TLC flags misread), dp:T13 (volatile deduplication survives a crash), dp:T14 (weak and strong fairness confused) and dp:T15 (the environment assumed well behaved). Seven more are proposed, each "—" (no learner study), kept only if they draw errors (§13, issue 9).

| Tag (proposed) | Misconception |
|---|---|
| dp:E5 | Recording intent and sending the effect treated as one step: the transaction covers the call, or the intent dies with the send |
| dp:E6 | A retry duplicates only after a crash, and only if the first attempt was accepted |
| dp:E7 | A reply can be trusted because your worker sent the request |
| dp:E8 | "Deterministic" means the simulator uses no randomness |
| dp:E9 | Trace validation compares outputs with a reference, or an accepted trace proves the implementation correct |
| dp:E10 | The provider's key retention only needs to outlast your retry loop |
| dp:E11 | A poller sees rows in id order, so a high-water mark misses nothing |

**Graded items** name a family and template (spine §8.3). Keys come from checkers at grade time: TLC graphs precomputed per template seed, Spectacle, INS-lasso, PGlite or the trace module; a submitted trace is replayed, never matched. Practice shows the witness and its class; probes are one-shot (M-class-hint). Every [M] verdict prints its constants (I10).

**Worked examples.** S8 has no proofs, hence no Goal Replay; correct worked examples come first in S8.L3 (window CW1), S8.L5 (fading family F5) and S8.L6 (the Dispatch disjunct), with no prompts on completion blanks.

### 1.1 The reference model

One model, `Outbox`, carries the stage: Theater scenes are its TLC graphs, Spectacle explores it, TLC checks it, generators mutate it, and LAB-8's spec implements its pinned interface [D]. It takes apart S5's holds model, whose `Dispatch` sent the request in the step that changed the hold (SEAM-4; S5's model M5): here the commit, the send, the provider's effect and the acknowledgement are separate steps, and the provider's ledger is modeled.

| Part | Variables | Survives a worker crash? |
|---|---|---|
| Database (your system) | `committed` (commands whose transaction committed; the outbox intent commits in the same transaction), `status[c]` in {none, pending, inflight, acked} (the outbox row), `durable` (commands whose provider result is stored) | yes |
| Worker memory | `got` (replies received, not yet stored) | no: `Crash` empties it |
| Network (environment) | `reqs` (in-flight requests, one message per attempt: command, key, attempt number), `replies` (replies the provider sent; any of them can be delivered again) | not the worker's to lose |
| Provider (environment) | `charges[c]` (effects performed), `seen` (its idempotency table) | not the worker's to lose |
| Environment | `up`, `crashes` | — |

**Actions.** `Commit(c)` writes the command and its intent in one transaction; `Dispatch(c)` sends a request with the intent's key; `Timeout(c)` returns an unanswered intent to pending (a timer, D-19); `Accept(r)` is the provider performing the effect unless its idempotency table holds the key, then replying; `Receive(c)` buffers a reply; `Persist(c)` stores the result; `Ack(c)` marks the intent done and needs a stored result; `Crash` stops the worker and empties its memory; `Recover` restarts it and returns every inflight intent *without* a stored result to pending; `Forget(k)` prunes a key under a stated policy. **Constants:** `Cmds`, `MaxCrashes`, `MaxAttempts`, `CrashWindows`, `Dedup`, `FreshKey`, `Forgets`, `Timeouts`. **Properties:** `NoLostIntent` (a committed intent stays pending, inflight or acked), `AckedIsDurable`, `NoDoubleCharge` (at most one charge per command), `EventuallyDispatched` and `EventuallyAcked` (a committed command leads to a request, and to acked). S8.L1's no-outbox contrast keeps the intent in memory, so a crash can lose it.

### 1.2 The crash-window table

Windows lie along one command's chain; "permits" is what one crash there allows. Keys are TLC verdicts on window configurations of `Outbox` (one command, one crash, `-workers 1`, deadlock check off: a finished command is not a deadlock).

| Window | Between | One crash here permits | No provider idempotency | Idempotency, one stable key | Run |
|---|---|---|---|---|---|
| CW0 | the client's COMMIT and its outcome reaching the client | an ambiguous commit: a retry of a committed command | applied twice unless an inbound key dedupes it | applied once | S8.L4 |
| CW1 | Commit and Dispatch | delay only: the intent waits in the outbox | holds | holds | {{run:RUN-tlc-double-charge}} (CW1) |
| CW2 | Dispatch and Accept | a second attempt while the first copy is still in flight | double charge | holds | {{run:RUN-tlc-double-charge}} (CW2) |
| CW3 | Accept and Persist | a re-send of an effect that already happened (SP-8.1) | double charge | holds; a fresh key per attempt double-charges (SP-8.3) | {{run:RUN-tlc-double-charge}} (CW3); {{run:RUN-tlc-fresh-key}} |
| CW4 | Persist and Ack | nothing, if recovery acknowledges stored results; re-sending them turns CW4 into CW3 | holds | holds | {{run:RUN-tlc-double-charge}} (CW4) |
| CW5 | after Ack | late or duplicate replies (S8.L4), and an old copy that outlives the provider's key retention (S8.L7) | — | holds only within the horizon | {{run:RUN-tlc-key-ttl}} |

Two rows surprise most learners [D]: CW2, where the provider has accepted nothing yet a retry double-charges because the first copy is still on its way, and CW4, safe or unsafe depending only on recovery. Duplicates need no crash: with `Timeouts` on, a timer firing before a slow reply arrives does the same {{run:RUN-tlc-double-charge}} (timeouts configuration).

### 1.3 The guarantee table

The roadmap asks which progress guarantees need eventual service recovery or external idempotency; the lessons build this answer and LAB-8.3 checks it.

| Property | Kind | Needs the worker to recover | Needs the provider to recover | Needs provider idempotency | Claim | Run |
|---|---|---|---|---|---|---|
| NoLostIntent | safety | no | no | no (the intent commits with the command) | CL-8.1 | {{run:RUN-tlc-outbox-safety}} |
| NoDoubleCharge | safety | no | no | yes, with one key per intent, within the horizon | CL-8.2 | {{run:RUN-tlc-outbox-safety}}, {{run:RUN-tlc-key-ttl}} |
| EventuallyDispatched | liveness | yes | no | no | CL-8.5 | {{run:RUN-tlc-recovery}} |
| EventuallyAcked | liveness | yes | yes: the provider eventually accepts and replies | no | CL-8.4 | {{run:RUN-tlc-recovery}} |

"The worker recovers" must mean it eventually stays up: a finite crash budget with weak fairness on `Recover`, or strong fairness on the worker's actions. Weak fairness on `Recover` alone, with endless crashes, admits a crash–recover cycle in which `Dispatch` is never continuously enabled {{run:RUN-tlc-recovery}} (unbounded configurations). Safety needs no fairness (dp:C5).

---

## 2. Lessons

### S8.L1 · bridge · Commits are not sends

**Objective.** Judge about five scenarios true or false: which guarantees hold at the external service and which hold only in your database, for send-then-commit, commit-then-send and an outbox, each crashed at a marked point (GEN-call-it template 4).
**KCs.** KC-8.commit-not-send (threshold). **Prerequisites.** KC-5.hostile-environment. **Instruments.** INS-theater. **Generators.** GEN-call-it. **Minutes.** 15–25.

**Hook.** Copy: "An agent's pull request: 'We call the provider right after COMMIT returns, so every charge happens exactly once. All tests green.'" The claim renders as quoted UNREVIEWED text (I8).

**Prequestion** (k = 3, chance 1/3). Copy: "Your handler commits a capture, then calls the provider. The process dies between the two. After restart, what is true?" A "The database shows the capture; the provider was never called." · B "The provider will be called on restart, because the capture committed." · C "Neither happened: the transaction covers the call, so both roll back." **Key:** A. **Why** A: commit-then-send leaves a record without an effect, and nothing durable remembers that a call is owed. B: without an outbox, no durable row says a call is owed; a committed record is not a promise of an effect (dp:E1). C: a transaction spans the database only; the provider is outside it (dp:E5).

**Instrument cell.** Copy: "Three designs, one crash each. Place the crash at the marked point and watch the monitors." Each scene is an authored TLC graph of the `Outbox` family; monitors label each end state "effect without record", "record without effect" or "intent waiting".

**Call It** (first run, the outbox scene, a crash right after COMMIT; k = 3, chance 1/3). Copy: "After restart, what does the outbox guarantee?" A "The intent survives, and a worker sends it at least once if it recovers." · B "The effect will happen exactly once." · C "The effect is lost unless the client retries." **Key:** A; `NoLostIntent` holds on the outbox scene and fails on the no-outbox scene {{run:RUN-tlc-outbox-safety}}; the scene claims nothing about duplicates. **Why** A: the intent committed with the command; delivery is at-least-once and needs the worker to recover. B: the outbox makes the intent durable, not the effect single; sending can repeat after later crashes (dp:E1). C: that is commit-then-send, where the intent lived in memory; here it committed with the command (dp:E5). **Surprise forecast:** yes (dp:E1 predicts B).

**Graded item.** GEN-call-it template 4 (multiple true/false). Seed space: design × crash point × provider idempotency. Five statements from a pool (for example "the provider performed the effect at most once", "a durable record of the intent exists", "the effect happened exactly once"), keyed at grade time by reachability in the variant's precomputed TLC graph and tagged dp:E1, dp:E3 or dp:E5. Bound printed.
**Exit item.** GEN-call-it template 1 (three-way verdict) on a fresh variant. Copy: "Can this design end with an effect and no record, with a record and no effect, or neither?"
**Today cards created.** Both items, for KC-8.commit-not-send (threshold: two extra calls in its first week; spiral returns in S8.L7 and AUD-8.1). **Twin.** None. **Sibling bridge.** None.
**Reading:** Learn TLA+ (read 2026-10-23) [V], Core › Temporal Properties §"Anything can crash" (`core/temporal-logic.html`); the site's latest dated change is 2023-08-02.
**Build this:** LAB-8.1, "Run the reference simulator on seed 1; see its NDJSON trace accepted by TLC" (2 min).

---

### S8.L2 · bridge · The outbox, modeled

**Objective.** Write the chain Command → Outbox → Worker → External → Ack as TLA+ actions over durable and volatile variables, then, for a seeded variant, give one trace the spec allows and one it forbids (GEN-trace-allowed templates 1 and 2).
**KCs.** KC-8.outbox-chain. **Prerequisites.** KC-8.commit-not-send, KC-5.behaviors-stuttering, KC-5.holds-lifecycle. **Instruments.** INS-spectacle; INS-theater stands in until W0-S04 records Spectacle's coverage of the S8 specs {{run:RUN-spectacle-s5s8}}. **Generators.** GEN-trace-allowed. **Minutes.** 15–25.

**Re-entry.** Two S5 re-finds (about four minutes) open the lesson, on KC-5.behaviors-stuttering and KC-5.hostile-environment; they credit S5's KCs.

**Prequestion** (k = 3, chance 1/3). Copy: "Which variables must survive a crash of the worker?" A "All of them, including replies the worker has received." · B "None: the worker can rebuild its state from the provider." · C "The committed commands, the outbox rows and the stored results." **Key:** C. **Why** A: a crash is not a pause; a reply held in memory is gone (dp:T13). B: the provider is outside your trust boundary and may have pruned what it knew (dp:E7). C: they live in the database; only the worker's memory is lost.

**Instrument cell.** Copy: "Here is the chain as actions. Step through it with crashes off." Spectacle's panel groups the variables by part (§1.1).

**Call It** (first run; k = 2, chance 1/2). Copy: "Is Commit → Dispatch → Receive a behavior of this model?" A "No." · B "Yes: the worker sent the request, so it can receive." **Key:** A, by membership in the TLC state graph exported with {{run:RUN-tlc-outbox-safety}}. **Why** A: `Receive` is enabled only when a reply for the command is in flight, and a reply exists only after the provider's `Accept`. B: the provider's step belongs in the trace; sending creates no reply (dp:E7). **Surprise forecast:** yes (dp:E7 predicts B).

**Graded item.** GEN-trace-allowed template 1 (safety prefix). Seed space: crash windows, `Dedup`, `Timeouts`, one or two commands, a target state. The learner submits one trace that reaches the target and one the spec forbids; every step of the first must be an edge of the precomputed TLC graph, and the grader names the second's first non-edge. Template 2 (enabled actions) follows on the same seed.
**Exit item.** GEN-trace-allowed template 3 (stuttering). Copy: "A log shows an implementation-only step, a timer being armed, between Dispatch and Accept. Is that a behavior of the spec?" Key: yes, a stuttering step. It sets up S8.L6.
**Today cards created.** Both items, for KC-8.outbox-chain. **Twin.** None. **Sibling bridge.** None. **Drawer.** D-09, for learners who want PlusCal beside TLA+ (Spectacle reads TLA+ only).
**Reading:** Learn TLA+ (read 2026-10-23) [V], Topics › Message Queues (`topics/message-queues.html`, §"The Queue" and §"The Messages"; added 2023-01-13) and Topics › Finite State Machines (`topics/state-machines.html`). Copy: "That page models a perfect queue: no loss, no duplicates, no reordering. This stage drops all three."
**Build this:** LAB-8.2, "The outbox spec with crash, duplicate and delay actions; safety" (25 min).

---

### S8.L3 · core · Every crash window

**Objective.** For each window CW1–CW4, with and without provider idempotency, produce the shortest trace to a double charge or lost intent, or "none", confirm it with TLC and name its class; show a duplicate with no crash (GEN-find-the-witness template 2; GEN-trace-allowed templates 1–2).
**KCs.** KC-8.crash-windows, KC-8.at-least-once (threshold). **Prerequisites.** KC-8.outbox-chain, KC-5.hostile-environment. **Instruments.** INS-theater, INS-spectacle, INS-bench-tlc (phones see the recorded run with its id). **Generators.** GEN-find-the-witness, GEN-trace-allowed. **Specimens.** SP-8.1, SP-8.2. **Claim.** CL-8.1. **Erosion.** ER-4. **Minutes.** 40–60, three segments.

**Forecast** (M-erosion-forecast, ER-4). Copy: "Restate CL-5.2 from memory. Its model sent the provider request in the same step that changed the hold. Which part of the card cracks when that step comes apart: the proposition of the model, the correspondence, the requirement fit, or an assumption record?" **Key:** an assumption record, SEAM-4: `res <= 1` still holds on S5's model, and what fails is the assumption that the effect left with the commit.

**Prequestions.**
P1 (KC-8.at-least-once; k = 3, chance 1/3). Copy: "No crash happens. Your worker's timer fires before the provider's reply arrives, and it sends again. The provider ignores keys. Can the charge happen twice?" A "No: without a crash there is nothing to retry." · B "Yes." · C "Only if the network duplicates the message." **Key:** B {{run:RUN-tlc-double-charge}} (timeouts configuration). **Why** A: timers retry too, and a slow reply looks exactly like a lost one (dp:E6). B: both copies can be accepted; at-least-once delivery duplicates by design. C: your re-send creates the duplicate; the network need not (dp:E6).
P2 (KC-8.crash-windows; k = 3, chance 1/3). Copy: "Your worker stored the provider's result, then crashed before marking the intent done. On restart, what should it do?" A "Send again: the intent is not acknowledged." · B "Drop it: the provider already has it." · C "Acknowledge it from the stored result." **Key:** C. **Why** A: the stored result proves the effect happened, and re-sending turns CW4 into CW3 (dp:E1). B: the intent would stay inflight forever, and nothing would record completion (dp:E3). C: recovery reads what is durable before it acts.

**Segment 1 · Place the crash** (13 min). INS-theater on `Outbox`, one window enabled at a time, provider idempotency off. The learner crashes, recovers and continues by hand; the monitors count charges per command. CW1 is a worked example played in full (crash, recover, one send, one charge: "none"); the learner completes CW2–CW4, and the crash-window table of §1.2 fills in, with no prompts on the blanks.

**Call It** (first run, window CW2; k = 3, chance 1/3). Copy: "The crash lands after your worker sent the request and before the provider accepted it. Can a double charge follow?" A "No: the provider never saw the first request." · B "Only if the provider crashes too." · C "Yes: both copies can be accepted." **Key:** C; `NoDoubleCharge` fails, with the witness's length in actions printed from {{run:RUN-tlc-double-charge}} (CW2). **Why** A: it has not seen the first request *yet*; that copy is still in flight and can arrive after the re-send (dp:E6). B: the provider stays up in this scene; delay alone suffices (dp:T15). C: recovery re-sends, and the old copy is still deliverable. **Surprise forecast:** yes (dp:E6 predicts A).

**Graded item.** GEN-find-the-witness template 2 (trace). Seed space: window ∈ {CW1, CW2, CW3, CW4} × provider idempotency ∈ {off, on} × key policy ∈ {stable, fresh per attempt} × commands ∈ {1, 2}, banded by the length of the shortest witness. The learner submits the shortest trace to a `NoDoubleCharge` or `NoLostIntent` violation, or "none", then names the class: duplicate in flight, duplicate after acceptance, lost intent, or none. Grader: Spectacle (or the precomputed TLC graph) replays the trace and checks its last state; "none" is graded against the configuration's complete TLC verdict; the class key comes from the generator. Bound printed.

**Segment 2 · TLC agrees, and a seam cracks** (13 min). INS-bench-tlc runs, argv recorded (`-workers 1`, deadlock check off): CW3 with idempotency off, mounting SP-8.1 {{run:RUN-tlc-double-charge}} (CW3), then the full design.

**Call It** (first run, the full design: every window, two crashes, provider idempotency with one stable key that is never pruned; k = 3, chance 1/3). Copy: "`NoLostIntent`, `AckedIsDurable` and `NoDoubleCharge`: what does TLC report?" A "A violation: some window still double-charges." · B "No error, exploration complete." · C "It stops at 'Deadlock reached'." **Key:** B {{run:RUN-tlc-outbox-safety}}; stamp [M] · constants · complete. **Why** A: one stable key plus the provider's idempotency closes CW2 and CW3, and recovery closes CW4; the provider's idempotency is part of the model here (dp:E4). B: every reachable state satisfies all three, at these constants. C: the configuration turns the deadlock check off on purpose (dp:T9). **Surprise forecast:** no.

**ER-4 fires.** SP-8.1 cracks SEAM-4; the forecast is scored; the remedy cards offer an outbox (built), inbound keys (S8.L4) and the provider's idempotency as [A] (CL-8.2). CL-8.1 is drafted from the receipt, crash actions on.

**Graded item.** GEN-trace-allowed template 2 (enabled actions). Seed space: a post-recovery state of a seeded variant (stored result present or absent; a reply in memory or not; worker up or down). The learner marks which of Dispatch, Receive, Persist, Ack and Recover are enabled. Grader: the state's successors in the TLC graph. The item drills CW4's rule: with a stored result, Ack is enabled and Dispatch is not.

**Segment 3 · The effect that never leaves** (13 min). An INS-theater scene of a high-water-mark poller: two writers take sequence ids at INSERT and commit in either order; the poller delivers committed rows above its mark and raises the mark to the highest id read.

**Call It** (first run; k = 3, chance 1/3). Copy: "Writer 1 takes id 1. Writer 2 takes id 2 and commits first. The poller delivers row 2 and sets its mark to 2. Then writer 1 commits. Will row 1 be delivered?" A "No, never." · B "Yes, on the next poll." · C "Yes, after the worker restarts." **Key:** A {{run:RUN-tlc-lost-effect}}: the mark invariant fails, and with weak fairness on the poller, eventual delivery is refuted by a stuttering lasso. **Why** A: ids are allocated at INSERT and become visible at COMMIT, so id order is not commit order. B: the next poll reads ids above 2, and row 1 is below the mark (dp:E11). C: the mark is stored, and a restart reads it back (dp:E11). **Surprise forecast:** yes (dp:E11 predicts B).

SP-8.2 mounts; on PostgreSQL 18.6 the late commit is catalog row H20 {{run:RUN-pg-catalog}}. Copy: "Poll by status, not by id: claim pending rows with `FOR UPDATE SKIP LOCKED`; delivery stays at-least-once." PostgreSQL documents that skipping locked rows "provides an inconsistent view of the data" (SELECT, The Locking Clause; R4 F22): it claims rows and never promises completeness.

**Graded item.** GEN-find-the-witness template 2 (trace), poller family. Seed space: writers ∈ {2, 3}, commit orders, poll timings, design ∈ {by mark, by status}. The learner submits a trace in which a committed row is never delivered, or "none" (the by-status design). Grader: TLC-graph replay against the mark invariant.

**Exit items.** (1) GEN-find-the-witness template 2, timeouts family: a double charge with no crash, on a fresh seed (KC-8.at-least-once). (2) GEN-trace-allowed template 1 on a fresh two-command crash-window variant (KC-8.crash-windows).
**Today cards created.** KC-8.crash-windows (GEN-find-the-witness template 2, crash-window and poller families; GEN-trace-allowed templates 1–2); KC-8.at-least-once (timeouts family, plus the threshold KC's extra calls).
**Production twin.** TigerBeetle, "Reliable Transaction Submission" (read 2026-10-23) [V], §"Handling Network Failures" and §"Handling Client Software Restarts": the client generates the id, persists it "before submitting the transfer", resends with the same id, and a duplicate returns `exists`. Tracing questions at the pin in {{run:RUN-twin-pins}}: which of CW1–CW3 persisting first closes; what a resend after a client restart looks like in your table; which result says an earlier attempt was accepted.
**Sibling bridge.** tablespace T3 (durability), with prerequisite card D-12: the same reasoning one layer down, where a write-ahead log decides what survives and the harness, not timing, enumerates crash points.
**Reading:** PostgreSQL 18 documentation (R4, read 2026-10-21): SELECT › The Locking Clause; Sequence Manipulation Functions (values "not reclaimed" on abort).
**Build this:** LAB-8.4, "A sans-I/O outbox machine under seeded faults" (25 min), once LAB-8.2's crash actions are in.

---

### S8.L4 · bridge · Replies are untrusted input

**Objective.** For a reply handler missing one check (status, charge within the hold, matching key, lateness, key row in the capture's transaction), produce the reply sequence that breaks it, or "none"; give the two states a dropped COMMIT leaves and a query that tells them apart (GEN-find-the-witness templates 2 and 4).
**KCs.** KC-8.untrusted-replies, KC-8.idempotency-keys. **Prerequisites.** KC-8.outbox-chain, KC-8.at-least-once, KC-6.serializable-retries; helpful: KC-6.rowcount-as-guard. **Instruments.** INS-pglite (one connection), INS-spectacle. **Generators.** GEN-find-the-witness. **Specimen.** SP-8.3. **Claim.** CL-8.2. **Minutes.** 15–25.

**Prequestion** (both KCs; k = 3, chance 1/3). Copy: "Two copies of a reply arrive for one intent and key: `ok`, cost 80, against a hold of 100; then `ok`, cost 120. What should your handler do?" A "Capture 80 once; discard the second copy as a duplicate by key, and record its mismatch for reconciliation." · B "Capture 80, then raise it to 120: the latest reply wins." · C "Capture both: they are two replies." **Key:** A. **Why** A: the key makes the second copy a no-op, validation keeps the bad value out, and the mismatch is evidence worth keeping. B: a reply is input from outside your trust boundary; a cost above the hold is invalid however it arrives (dp:E7). C: one intent, one key, one effect (dp:E2).

**Cell 1 · the inbound key** (INS-pglite). One transaction: insert the reply's key into `inbound_keys` with `ON CONFLICT DO NOTHING` and require one affected row (S6.L2's rowcount guard); then capture with a guarded UPDATE that must also touch one row. **Call It** (first run; k = 2, chance 1/2). Copy: "The same valid reply is delivered twice, one after the other. How many captures?" A "One." · B "Two." **Key:** A {{run:RUN-pglite-inbound-key}} (proposed): the second key insert affects no row, so the handler stops before the capture. **Why** A: the key row commits with the capture, so a duplicate cannot pass the guard. B: a second delivery acts twice only if nothing durable remembers the first (dp:E2). **Surprise forecast:** no.
Copy: "PGlite has one connection, so deliveries cannot race here." A same-key race between two SERIALIZABLE transactions on PostgreSQL 18.6 is a catalog row to record {{run:RUN-pg-catalog}}; LAB-6.6's retry policy handles whichever SQLSTATE it records (its 23505 rule stays [D], spine §3.6).

**Cell 2 · the late reply** (INS-spectacle). A timer released the hold; then a valid `ok` reply arrives. **Call It** (first run; k = 3, chance 1/3). Copy: "Your handler checks status and cost only. What happens?" A "Nothing: the hold is already released." · B "The provider undoes the charge on its own." · C "It captures a released hold." **Key:** C {{run:RUN-tlc-outbox-safety}} (reply-validation configuration): "no capture after release" fails. **Why** A: a handler that never reads the hold's state captures it anyway (dp:E7). B: the provider performed what you asked; undoing it is your reconciliation, not its default (dp:T15). C: lateness is a check of its own. **Surprise forecast:** yes (dp:E7 predicts A).
Copy: "Reject the late reply, keep the release, and record a reconciliation: the provider may have charged after you gave up, and the record makes that loss visible." D-19 frames the timer as a durable obligation.

**Cell 3 · the fresh key** (INS-spectacle; SP-8.3). Your worker re-sends after a crash in CW3 and mints a new key for each attempt. **Call It** (first run; k = 2, chance 1/2). Copy: "The provider honors keys. Can the charge happen twice?" A "No: the provider deduplicates." · B "Yes." **Key:** B {{run:RUN-tlc-fresh-key}}. **Why** A: deduplication is per key, and the second attempt carries a new one; the key must name the intent, not the attempt (dp:E2). B: two keys, two effects. **Surprise forecast:** yes (dp:E2 predicts A).
Copy: "Mint the key once, with the intent, in the command's transaction, and send it on every attempt." PostgreSQL 18's `uuidv7()` "Generates a version 7 (time-ordered) UUID" (§9.14, read 2026-10-23) [V]; PGlite's support is part of {{run:RUN-pglite-inbound-key}} (proposed).

**The ambiguous commit.** Copy: "If the connection drops during COMMIT, re-run the handler with the same key: one inserted row means the first attempt did not commit; zero rows means it did." PostgreSQL also documents `pg_xact_status` for use "after the application and database server become disconnected while a COMMIT is in progress", returning NULL once the status is no longer retained (§9.27.8, read 2026-10-23) [V]; the key needs no retention window.

**Graded item.** GEN-find-the-witness template 2 (trace). Seed space: a handler with exactly one check removed (status, cost, key, lateness, or the key row written in a separate transaction) or none removed, over reply sequences with duplicates, reorderings, late arrivals and invalid values. The learner submits the sequence that breaks an invariant (charge within the hold, one capture per intent, no capture after release) or "none". Grader: Spectacle replays it on the model, or the precomputed TLC graph does.
**Exit item.** GEN-find-the-witness template 4 (state pair): the two database states a dropped COMMIT leaves (key row and capture present; both absent) and a query that tells them apart. Grader: PGlite evaluates the query on both states.
**Today cards created.** KC-8.untrusted-replies (template 2, reply family) and KC-8.idempotency-keys (template 2, key family; template 4). **Twin.** None (S8.L3's TigerBeetle card covers outbound keys). **Sibling bridge.** None.
**Reading:** PostgreSQL 18 documentation (read 2026-10-23) [V]: INSERT › "ON CONFLICT Clause"; §9.14; §9.27.8; §13.5 Serialization Failure Handling. Stripe's "Idempotent requests" on requests that conflict "with another request that's executing concurrently" (read 2026-10-21; re-read 2026-10-23) [V].
**Build this:** LAB-8.5, "Inbound keys (`ON CONFLICT` with `uuidv7()`) and reply validation" (25 min).

---

### S8.L5 · bridge · Progress needs recovery

**Objective.** For EventuallyDispatched and EventuallyAcked under a stated fairness and crash assumption, give the lasso that refutes the property or answer "none", and say which assumption each property needs (GEN-lasso-or-not templates 1–2).
**KCs.** KC-8.progress-needs-recovery. **Prerequisites.** KC-5.fairness, KC-5.lasso-reading, KC-8.crash-windows. **Instruments.** INS-lasso over TLC graphs and lassos (format per {{run:RUN-tlc-lasso-json}}); INS-bench-tlc. **Generators.** GEN-lasso-or-not. **Specimen.** SP-8.6. **Claims.** CL-8.4, CL-8.5. **Erosion.** ER-8. **Minutes.** 15–25.

**Forecast** (M-erosion-forecast, ER-8). Copy: "Restate CL-5.3 from memory. Crashes now join its model. Which part of the card cracks?" **Key:** an assumption record, SEAM-8: CL-5.3's [M] still holds on its own model; the assumption that the worker keeps running does not.

**Prequestion** (k = 3, chance 1/3). Copy: "A check of 'every committed command is eventually acknowledged' passes. Its configuration has no Crash action. What did it establish about your system with crashes?" A "The property holds with crashes too." · B "It holds if crashes are rare." · C "Nothing about crashes: the stamp is [M] · constants, with crashes [N]." **Key:** C. **Why** A: crashes were outside the model, so the check is silent about them (dp:E3). B: the model has no notion of rare; one crash at the wrong moment is a behavior (dp:E3). C: a model without an action cannot speak about behaviors that need it.

**Cell 1** (crashes on, at most two; weak fairness on the worker's actions and the provider's; none on Recover). **Call It** (first run; k = 2, chance 1/2). Copy: "EventuallyAcked?" A "Holds: weak fairness keeps the worker going." · B "Violated by a lasso." **Key:** B {{run:RUN-tlc-crash-liveness}}: a lasso ending with the worker down and stuttering, which INS-lasso accepts as fair. **Why** A: fairness applies to enabled actions, a crashed worker has none, and nothing obliges Recover (dp:E3). B: stuttering after a crash is a behavior. **Surprise forecast:** no. SP-8.6 mounts: with crash actions switched off, the same property passes {{run:RUN-tlc-crash-liveness}}. ER-8 fires.

**Cell 2** (crashes unlimited; Recover weakly fair). **Call It** (first run; k = 3, chance 1/3). Copy: "EventuallyAcked?" A "Holds: the worker always comes back." · B "It would hold with strong fairness on Recover." · C "Violated by a crash–recover cycle." **Key:** C {{run:RUN-tlc-recovery}} (unbounded configuration). **Why** A: it comes back and crashes again before acting; weak fairness needs an action continuously enabled, and each crash disables Dispatch (dp:T14). B: Recover is already continuously enabled while the worker is down, so strong fairness on it changes nothing; Dispatch is the starved action (dp:T14). C: the cycle is fair to every action, yet Dispatch never fires. **Surprise forecast:** yes (dp:T14 predicts A).

**Cell 3** (crashes unlimited; strong fairness on Dispatch, Receive, Persist and Ack; weak fairness on Recover and the provider). **Call It** (first run; k = 2, chance 1/2). Copy: "EventuallyAcked?" A "Holds." · B "Violated by a crash–recover cycle." **Key:** A {{run:RUN-tlc-recovery}} (strong-fairness configuration). **Why** A: strong fairness promises that an action enabled infinitely often is eventually taken, so some window between a recovery and the next crash is eventually used (S5.L7). B: the cycle starved weak fairness only (dp:T14). **Surprise forecast:** yes.

Copy: "Two honest ways to say 'the worker recovers': crashes eventually stop (a finite budget, Recover fair), or the worker's actions get strong fairness. Write yours as [A]. The provider's recovery is a separate [A], needed for EventuallyAcked only; provider idempotency serves safety, not progress." CL-8.4 and CL-8.5 are drafted from the receipts.

**Graded item.** GEN-lasso-or-not template 1 (starving). Seed space: property ∈ {EventuallyDispatched, EventuallyAcked} × assumption dropped ∈ {none, worker fairness, provider fairness, Recover fairness, the crash budget} × fairness strength on the worker ∈ {weak, strong}. The learner submits a lasso or "none". Grader: INS-lasso checks that the lasso is a graph path, violates the property and satisfies every stated fairness conjunct; "none" is graded against TLC's verdict. Bound printed.
**Exit item.** GEN-lasso-or-not template 2 (fair cycle) on a fresh configuration.
**Worked example.** Fading family F5 at a spiral rung: EventuallyDispatched's fairness formula shown complete and correct first; the learner writes EventuallyAcked's, adding the provider's fairness, as a completion blank without prompts; one principle prompt follows each revealed step.
**Today cards created.** Both items, for KC-8.progress-needs-recovery, interleaved within confusable set E (KC-5.fairness, KC-5.lasso-reading) after the exit item. **Twin.** None. **Sibling bridge.** None.
**Reading:** Learn TLA+ (read 2026-10-23) [V], Core › Temporal Properties: §"~> (leads-to)", §"When to use Liveness" and the strong-fairness passage. Optional: TigerBeetle, "Simulation testing for liveness" (2023-07-06).
**Build this:** LAB-8.3, "Liveness under stated fairness and recovery" (25 min).

---

### S8.L6 · core · Deterministic simulation and trace validation

**Objective.** Find and name the first divergence between two runs of one seed; mark each log line as a spec action, a stuttering step or the first line no behavior matches; find a suite-passing mutant's first non-conforming line and name the drift (GEN-find-the-witness template 2; GEN-trace-allowed template 3).
**KCs.** KC-8.deterministic-simulation, KC-8.trace-validation. **Prerequisites.** KC-8.outbox-chain, KC-5.behaviors-stuttering; contrast: KC-6.differential-testing. **Instruments.** INS-sim (recorded fault seeds; the learner's machine once LAB-8.4 exists), INS-lane-a, INS-bench-tlc (`statespace trace validate`). **Generators.** GEN-find-the-witness, GEN-trace-allowed. **Specimen.** SP-8.4. **Claim.** CL-8.3. **Minutes.** 40–60, three segments. The flagship moment (BRIEF §7.9 item 5), stated precisely: every test *in the suite*, n from the run.

**Prequestions.**
P1 (KC-8.deterministic-simulation; k = 3, chance 1/3). Copy: "Two runs of your simulator with the same seed produce different traces. Where do you look first?" A "At anything not derived from the seed: a clock, an unseeded random source, an order the host decides." · B "At the seed: it is too small." · C "Nowhere: faults are random, so traces must differ." **Key:** A. **Why** A: determinism means every choice comes from the seed and the inputs. B: any seed replays exactly if every random choice derives from it (dp:E8). C: seeded randomness is reproducible; that is what a seed is for (dp:E8).
P2 (KC-8.trace-validation; k = 4, chance 1/4). Copy: "Trace validation accepts the traces of n seeds. What does that establish?" A "Your implementation is correct." · B "Your implementation agrees with a reference implementation." · C "Each of those n traces is a behavior of your spec, at the detail the log records." · D "Your spec is right." **Key:** C. **Why** A: it covers these n traces, at the logged detail, against the spec you wrote (dp:E9). B: that is differential testing; here the oracle is a spec that allows many behaviors (dp:E9). C: membership, trace by trace, and nothing about traces never run. D: the spec and the code can share one misreading (dp:X4).

**Segment 1 · One seed, one behavior** (13 min). INS-sim runs the reference machine on recorded seed 1 twice and prints both trace hashes {{run:RUN-sim-determinism}} (proposed). Copy: "The machine is sans-I/O, `step(&mut self, input) -> Vec<Output>`: no clock, randomness or network, and the zero-import ABI gives it no way to reach them. The harness owns time, faults, the simulated world and the log." A planted harness variant then draws faults from an unseeded host source.

**Call It** (first run; k = 3, chance 1/3). Copy: "With the planted variant, which component can make two runs of seed 1 differ?" A "The machine." · B "TLC." · C "The harness's fault plan." **Key:** C {{run:RUN-sim-determinism}}: the variant's traces differ at a reported line, and the reference traces are byte-identical. **Why** A: with no imports, the same inputs give the same outputs, step after step (dp:E8). B: TLC reads traces; it does not produce them (dp:E9). C: it chose faults from a source the seed does not control. **Surprise forecast:** no.
Copy: "A failing seed is now a bug report: replay it exactly, then shrink the fault schedule until every remaining fault matters." Wasm's residual nondeterminism (NaN bit patterns, resource exhaustion) is outside this lab's integer-only machine [D].

**Graded item.** GEN-find-the-witness template 2 (trace), divergence family. Seed space: a pair of traces from one seed with one planted divergence source (an unseeded fault choice, a wall-clock timer input, a host-ordered delivery of a reply batch) at a seeded depth. The learner gives the first diverging line and names its source. Grader: the computed diff and the generator's class key.

**Segment 2 · Trace validation is model checking with the log as a constraint** (14 min). `statespace trace validate` runs on the reference spec and one recorded trace. The method is Cirstea, Kuppe, Loillier and Merz's: "The problem is reduced to a constrained model checking problem, realized using the TLC model checker" (arXiv 2404.16075 v2, 2024-09-17; venue unverified) [V]; a trace is accepted when some behavior of the spec consumes every line (§4.2). The course supplies the trace module's skeleton (a line counter `l`, `IsEvent`, a stuttering disjunct for implementation-only events, the acceptance check). Logs record spec-variable updates only (§3); steps a log omits, such as a provider's `Accept`, are searched for by TLC. Worked example, correct first: the Dispatch disjunct applies `Dispatch(c)` and requires the logged key and attempt to match the request it adds; the learner then writes the Ack disjunct as a completion blank, without prompts.

**Call It** (first run; k = 3, chance 1/3). Copy: "A log line records a timer being armed between Dispatch and Accept. Is the trace accepted?" A "Accepted: the line is a stuttering step." · B "Rejected: every line must be a spec action." · C "Accepted only with `-deadlock`." **Key:** A {{run:RUN-tlc-trace-validation}}. **Why** A: specs allow stuttering so that steps the spec cannot see are permitted (S5.L1). B: the stuttering disjunct matches the line with every spec variable unchanged (dp:E9). C: the deadlock flag decides whether a stuck state is reported; acceptance means every line was consumed (dp:T9). **Surprise forecast:** yes.

Two cautions from the paper: too little logged information causes state explosion or *wrongly accepted* traces (§4.5), and a rejection yields no counterexample, only a maximal matching behavior (§4.2), so the tool reports the highest line any behavior reached; TLC's search depth equals it only when every step consumes a line [D]. No `-loadTrace` is needed: the pinned jar's `Json` module declares `ndJsonDeserialize` (read from the jar of [X RUN-tlc-jars], 2026-10-23; §13, issue 1).

**Graded item.** GEN-trace-allowed template 3 (stuttering). Seed space: a log of k lines with implementation-only events and at most one non-conforming line (an Ack before its Persist, a Dispatch with a new key, a Receive with no earlier Accept), with or without logged provider steps. The learner marks each line "spec action", "stuttering step" or "first line no behavior matches". Grader: the precomputed TLC graph of the trace module for the seed.

**Segment 3 · The drift every test in the suite missed** (13 min). A mutant of the reference simulator marks the intent done before it stores the provider's result. The course's end-state suite (every committed intent acknowledged; no double charge against an idempotent provider) passes on the recorded seeds; then `statespace trace validate` reads the same seeds' traces {{run:RUN-tlc-trace-validation}}.

**Call It** (first run; k = 3, chance 1/3). Copy: "The mutant passes the suite on every recorded seed. Will trace validation accept its fault-free traces?" A "Accepted: no crash, no harm." · B "Rejected at the first Ack line." · C "Rejected only on seeds that crash between Ack and Persist." **Key:** B {{run:RUN-tlc-trace-validation}}; SP-8.4 mounts. **Why** A: the spec orders Persist before Ack, and the order is wrong on every trace, crash or no crash (dp:X1). B: Ack is not enabled before the result is stored, so no behavior matches that line. C: that is how a test would find it; trace validation checks the steps, not their consequences (dp:E9). **Surprise forecast:** yes.
Copy: "The suite checks outcomes, which agree whenever no crash lands between the two steps. Trace validation checks the order of steps on every trace, so it sees the drift before a crash makes it costly." CL-8.3 is minted: [T] · n seeds, composed with the spec's [M] (spine §8.8); the simulated environment stays [A].

**Graded item.** GEN-find-the-witness template 2 (trace), drift family. Seed space: a mutant machine (ack before store, a new key per attempt, re-sending stored intents on restart, applying replies unvalidated) and a seed. The learner gives the first non-conforming line and names the drift. Grader: TLC on the trace module; the drift class is the generator's key.

**Exit items.** (1) GEN-trace-allowed template 3 on a fresh log (KC-8.trace-validation). (2) GEN-find-the-witness template 2, divergence family, on a fresh pair (KC-8.deterministic-simulation).
**Today cards created.** KC-8.deterministic-simulation (divergence family); KC-8.trace-validation (GEN-trace-allowed template 3; drift family). From S9, KC-8.trace-validation joins confusable set G (§13, issue 13).
**Production twins.** (1) CCF's smart casual verification (Howard et al., NSDI 2025; arXiv 2406.17455 v2, 2024-10-16) [V]: §6 Trace Validation (§6.1, §6.2.1 Aligning Grains Of Atomicity, §6.3), §7 Results (six consensus bugs, five safety and one liveness), run in CCF's CI. Tracing questions at the commit in {{run:RUN-twin-pins}}: the trace module's line counter; where it aligns a coarser grain of atomicity; how CI decides a trace failed. (2) TigerBeetle's VOPR (Safety page, read 2026-10-23) [V], where a cluster "running real code" meets "network, storage and process faults, at 1000x speed": where a seed fixes the fault schedule; how a failing seed replays; where invariants are checked. sim.tigerbeetle.com is a disclosed, uncredited link-out (OD-4).
**Sibling bridge.** byzantine's deterministic network harness, with the self-contained prerequisite card D-21: seeded random streams and harness-driven timers, the same discipline applied to a cluster. Raft and partitions stay in byzantine.
**Reading:** Cirstea et al. [V]: §3 Instrumenting Distributed Programs; §4.2 Realizing trace validation using the TLC model checker; §4.3 Analyzing discrepancies; §4.5 Implementation aspects. Davis, Hirschhorn and Schvimer, "eXtreme Modelling in Practice", PVLDB 13(9):1346–1358, 2020 (arXiv 2006.00915) [V], whose abstract reports "We found MBTC to be impractical for testing that the Server conformed to a highly abstract specification." Copy: "Log at your spec's grain."
**Build this:** LAB-8.6, "NDJSON traces validated by TLC over n seeds" (25 min); then LAB-8.7, capstone S10.L5 (25 min).

---

### S8.L7 · bridge · Exactly-once is a pair; the provider's horizon

**Objective.** Write the effect claim as two parts, yours (at-least-once dispatch with one key per intent, and no lost intent) and the provider's (deduplication by key within its retention); state the horizon so that it covers every copy of every attempt; and stamp each part (GEN-call-it template 4; GEN-which-stamp templates 2–3).
**KCs.** KC-8.provider-horizon; KC-8.at-least-once spirals. **Prerequisites.** KC-8.idempotency-keys. **Instruments.** INS-spectacle. **Generators.** GEN-call-it, GEN-which-stamp. **Specimen.** SP-8.5. **Claim.** CL-8.2's horizon clause, written in LAB-8.8, which plants SEAM-12. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "Your worker's first attempt was charged, but its reply was lost. Then the worker was down for two days. Your provider documents that keys may be pruned once at least 24 hours old. On restart, the worker re-sends with the same key. What happens?" A "The provider returns the saved result." · B "A second charge: a reused key after pruning is a new request." · C "The provider rejects the reused key." **Key:** B (the provider's documentation, below; the model's "anytime" configuration {{run:RUN-tlc-key-ttl}}). **Why** A: the retention did not cover the outage (dp:E10). B: the key is gone, so the provider treats the request as new. C: the provider fails open here, not safe (dp:T15).

**Instrument cell.** The full design under four pruning policies: never; once acknowledged and no copy in flight ("after drain"); once acknowledged ("after ack"); at any time ("anytime", an outage longer than the retention).
**Call It 1** (first run, "after ack"; k = 2, chance 1/2). Copy: "The provider prunes a key as soon as your worker has acknowledged its intent. Is a double charge possible?" A "Yes." · B "No: an acknowledged intent is never sent again." **Key:** A {{run:RUN-tlc-key-ttl}}. **Why** A: a copy of an earlier attempt can still be in flight; when it arrives the key is gone, and the provider performs the effect again. B: your worker stops; its earlier copies do not (dp:E10). **Surprise forecast:** yes (dp:E10 predicts B).
**Call It 2** (first run, "after drain"; k = 2, chance 1/2). Copy: "Now the provider prunes only once the intent is acknowledged and no copy is in flight. Is a double charge possible?" A "Yes." · B "No." **Key:** B {{run:RUN-tlc-key-ttl}}. **Why** A: once no copy remains, no request can carry the key again; over-correcting after the last call is the trap (dp:E10). B: every copy that could reuse the key has been delivered or dropped. **Surprise forecast:** no.
"Never" holds; "anytime" mounts SP-8.5 {{run:RUN-tlc-key-ttl}}.

**The dated card** (the "dated incidents" filter; M-hall-of-records). Copy: "Stripe's API reference, 'Idempotent requests' (read 2026-10-21; re-read 2026-10-23): for API v1, keys can be removed 'after they're at least 24 hours old', and 'We generate a new request if a key is reused after the original is pruned.' Retries with the same key 'return the saved response, including 500 errors.' A request that conflicts with another 'executing concurrently' is not saved and can be retried. API v2 behaves differently." [stripeidem, V] So the horizon clause names provider, API version, retention, source and date read, under a TTL. TigerBeetle's id, the object's own identity, is a different contract (read 2026-10-23) [V]: never assume one provider's horizon for another.

**Writing the pair.** Copy: "Yours: every committed intent is dispatched at least once, carrying the key minted at commit (CL-8.1, CL-8.5). The provider's: a reused key within its retention returns the saved result ([A], in your trusted base). Together: no double charge (CL-8.2), while every copy of every attempt is delivered or dropped before the key can be pruned." That clause is SEAM-12, whose spine wording must count copies in flight as retries (§13, issue 5).

**Graded item.** GEN-which-stamp template 3 (which strip segment): for each clause (NoDoubleCharge on the model; provider deduplication; the horizon; trace validation over n seeds; "charge at most once" as the requirement), choose the strip segment it informs, or the assumptions field, and its stamp. Grader: spine §8.8 and the claim template. Template 2 (complete the qualifier) follows on the same claim.
**Exit item.** GEN-call-it template 4: five statements about "exactly once", tagged dp:E1, dp:E4 and dp:E10, keyed from the four policy runs.
**Today cards created.** KC-8.provider-horizon (GEN-which-stamp templates 2–3; GEN-call-it template 4); spiral items for KC-8.at-least-once. **Production twin.** Stripe's documentation, dated: tracing questions on the page as read (API v1's retention; a retry after a saved `500`; a concurrent same-key request), with read date and TTL in {{run:RUN-twin-pins}}. **Sibling bridge.** None.
**Reading:** the Stripe page above, and TigerBeetle's Reliable Transaction Submission for the contrast (both read 2026-10-23) [V].
**Build this:** LAB-8.8, "Claim cards with the provider horizon" (15 min); LAB-8.9 `[stretch]`, the key TTL and replayed `500`s in the spec (25 min); LAB-8.10 `[stretch]` (proposed), NoLostIntent's inductive step for arbitrary `Cmds`, which can lift CL-8.1 to [P] (25 min).

---

### 2.8 Call tally

Sixteen authored calls (prequestions and forecasts excluded).

| Key | Calls | Share |
|---|---|---|
| violated, forbidden or refuted | S8.L2; S8.L3 segs 1 and 3; S8.L4 cells 2 and 3; S8.L5 cells 1 and 2; S8.L6 seg 3; S8.L7 call 1 | 9 of 16 (56%) |
| holds, accepted or "once" | S8.L1; S8.L3 seg 2; S8.L4 cell 1; S8.L5 cell 3; S8.L6 seg 2; S8.L7 call 2 | 6 of 16 (38%) |
| a component | S8.L6 seg 1 | 1 of 16 (6%) |

No verdict exceeds 60%; key positions are A 7, B 5, C 4. Forecast surprises: 11 of 16 (69%), above the 30% floor; learner-zero's calls test the forecasts.

---

## 3. LAB-8 · effects-sim (capstone S10.L5)

The course supplies `statespace sim`, `statespace trace validate`, the trace schema and a harness; the learner writes the machine, the fault plan, the spec and the reply handler (spine §12 item 5).

### 3.1 Template, pins, lanes and the world

**Supplied:** `spec/OutboxIface.tla` (variables, `TypeOK`, provider and network actions), `claims/OutboxProps.tla` (§1.1's properties and the reply invariants), each check's `.cfg`, the trace module's skeleton, and a Rust harness (clock, provider, network with delay and duplication, disk, crash injector, NDJSON emitter, ABI glue). **Written by the learner:** the worker's actions, `Crash`, `Recover` and fairness; one trace disjunct per worker action; `machine.rs` and `faults.rs`; the reply handler; and claim cards that fade from prefilled to written.

**Statement pins.** LAB-8 is not a Lean lab (no `comparator.json`); its challenge pack is the pinned interface, property and configuration files (I7), hashed on every receipt, so a weakened statement voids the claim to [?] (G8a). The agent kit's hook denies edits to `TODO(you)` markers, pinned files, `claims/` and `receipts/`. The stuck protocol fires at 25, 45 and 90 minutes.

**Lanes.** LAB-8.1–8.3, 8.6 and 8.8 are Lane B (*reported from your machine*); LAB-8.4 and 8.5 are Lane A (*re-checked here*), with LAB-8.5's race replayed from a recorded Bench history; LAB-8.7 has both. INS-sim is never authoritative; TLC on the Bench is (spine §9.1).

**The Clearinghouse.** After LAB-8.4 the machine plugs into the world's provider (W5-T13): 1–3 incidents a week (duplicate replies, outages, late replies, mutation-generated proposals sound in a seeded 30–60% share), thresholds proven against baselines (M-docket). ER-12 fires here later.

### 3.2 Stages and exact checks

| Stage | Min | Check: exact pass condition |
|---|---|---|
| LAB-8.1 Run the reference simulator on seed 1; see its NDJSON trace accepted by TLC | 2 | LAB-8.c1: the receipt's verdict line reads "accepted" for `traces/seed-1.ndjson` {{run:RUN-tlc-trace-validation}}; the trace's SHA-256 equals the recorded seed-1 hash {{run:RUN-sim-determinism}} (proposed); the jar matches [X RUN-tlc-jars] |
| LAB-8.2 The outbox spec with crash, duplicate and delay actions; safety | 25 | LAB-8.c2: `Dedup = FALSE`, `CrashWindows = {"CW3"}`: `NoDoubleCharge` violated by a trace with a Crash between Accept and Persist; the full design: no error, complete, for all three invariants, constants printed; pinned hashes match {{run:RUN-tlc-outbox-safety}} |
| LAB-8.3 Liveness under stated fairness and recovery | 25 | LAB-8.c3: both properties hold under the stated fairness, `MaxCrashes` finite; without fair Recover, a lasso INS-lasso accepts; `claims/progress.yaml` (the learner's §1.3) matches TLC on every drop-one configuration; the receipt lists the fairness conjuncts and the crash budget {{run:RUN-tlc-recovery}} |
| LAB-8.4 A sans-I/O outbox machine under seeded faults | 25 | LAB-8.c4 (in the tab): on n schedules drawn at grade time (n, step cap, fault rate printed), with a deduplicating provider: no double charge, no lost intent, acknowledged implies stored, identical traces for a seed run twice, and the systematic mode (a crash in each of CW1–CW4) passes; failures print seed and first violating step |
| LAB-8.5 Inbound keys (`ON CONFLICT` with `uuidv7()`) and reply validation | 25 | LAB-8.c5: on fresh reply sequences (duplicates, reorderings, late, over-cost, invalid, unknown key) on PGlite: at most one capture per intent via the key row and rowcount guard; late and invalid replies rejected, the late one reconciled; a re-run after a dropped COMMIT reports "already applied"; the recorded same-key race is handled per LAB-6.6 {{run:RUN-pglite-inbound-key}} (proposed), {{run:RUN-pg-catalog}} |
| LAB-8.6 NDJSON traces validated by TLC over n seeds | 25 | LAB-8.c6: n seeds' traces accepted (n at least the minimum; seed list hashed); the seeded ack-before-store mutant rejected, its first non-conforming line named; the schema lint finds the required fields constrained {{run:RUN-tlc-trace-validation}}; stamp [T] · n seeds |
| LAB-8.7 Capstone S10.L5: the differential plus simulation suite; failures become specimens | 25 | LAB-8.c7: the receipt records the differential and fault seeds; a planted failure mounts as a specimen labeled from its run and replays from its seed, as does every other failure |
| LAB-8.8 Claim cards with the provider horizon (write stage) | 15 | LAB-8.c8: CL-8.1–CL-8.5 pass claim@1 validation; CL-8.2 carries both [A] clauses (provider, API version, retention, date read); each "if weakened" witness refutes its own proposition |
| LAB-8.9 `[stretch]` The key TTL and replayed 500s in the spec | 25 | — |
| LAB-8.10 `[stretch]` NoLostIntent's inductive step for arbitrary `Cmds`: TLC's check at fixed constants {{run:RUN-tlc-outbox-inductive}}, then Z3 with commands as an uninterpreted sort {{run:RUN-z3-outbox-inductive-param}} (the stage and both runs are proposed, §13 issue 10) | 25 | — |

**LAB-8.10** is the optional lift of spine §12 item 28, built as S5.L9 builds its lift and applied to CL-8.1 only. It needs KC-5.inductive-invariant-tla (S5.L9) and LAB-8.2's spec, so on the builder's path it belongs to the later S8 block. First TLC checks an `Inv` that implies `NoLostIntent`, led by `TypeOK`, for inductiveness at fixed constants; a pass earns [M] · constants · inductive at those constants, never [P]. Then Z3 (INS-z3 in the tab, or INS-bench-smt on the Bench; Z3 5.3.1 [X RUN-z3-starter]) discharges `Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` with commands as an uninterpreted sort, beside a premise witness (`Inv ∧ Next` is `sat`). `unsat` on both earns [P] · Z3 5.3.1 unsat · uncertified, for every `Cmds`, with the open defeater "translation from the TLA+ spec unverified"; `unknown` earns [?] (spine §8.8). Like LAB-5.7 and LAB-8.9, the stage has no check and no hint ladder; its receipt adds Z3 to `tools[]` and fills the `z3` block (spine §9.4).

### 3.3 Receipt (receipt@1)

`tools[]`: `tla2tools` 1.8.0 and SHA-256 [X RUN-tlc-jars], Java 21, rustc and cargo {{run:RUN-scaffold}}, PGlite {{run:RUN-pglite-0511}}. `statements[]`: pinned-file hashes, schema version. `runs[]`: argv (always `-workers 1`), input hash, budget (`workers` or `seed`), exit code and verdict lines parsed verbatim. `tlc`: hashes, constants, flags, distinct states, depth, complete or partial, trace or lasso file. Trace validation: n, the seed-list hash, verdicts and first non-conforming lines (§13, issue 7). Then `checks[]`, self-reported `provenance` (OD-8), `claims[]`, and `tcb[]` (TLC, the trace mapping, the harness and its provider model, PGlite or PostgreSQL 18.6, the provider's idempotency).

### 3.4 Hint ladders

Every check has R0–R4 behind the explanation gate: R0 prompt-and-compare (never credit); R1 after a 12-word teach-back; past R2, credit is assisted until an unseen variant passes.

- **c1.** R1 accepted = one behavior consumed every line. R2 the verdict line, not the exit code. R3 `statespace trace validate spec/Outbox.tla traces/seed-1.ndjson`. R4 run, import, compare the hash.
- **c2.** R1 a crash loses memory, not the database. R2 what `Crash` empties; what `Recover` does with stored results. R3 "on recover: inflight, not stored → pending; stored → Ack". R4 walk CW1–CW4, one guard per window.
- **c3.** R1 weak fairness needs continuous enabling; a crashed worker has none. R2 Recover's fairness and the crash budget. R3 "WF(each worker action) ∧ WF(Accept) ∧ WF(Recover), MaxCrashes finite". R4 S8.L5's two forms of recovery.
- **c4.** R1 recovery acts on what is durable. R2 the `Restarted` arm of `step`. R3 "on Restarted: stored → Ack; else → Send(intent.key)". R4 one key per intent; outputs from inputs alone.
- **c5.** R1 the key row and the capture commit together. R2 the rowcount after the key insert. R3 "insert key on conflict do nothing; 0 rows → AlreadyApplied; validate; guarded UPDATE, 1 row". R4 S8.L4's five checks in order.
- **c6.** R1 the first unmatched line marks the drift. R2 the Ack disjunct's constrained fields. R3 `Is("Ack") /\ Ack(E.cmd) /\ l' = l + 1`. R4 log at the spec's grain; constrain every required field.
- **c7.** R1 a seed is a bug report. R2 the receipt's seed lists. R3 "on failure: mount(seed, first violation)". R4 replay, shrink, mount, label from the run.
- **c8.** R1 an assumption is stamped too: [A] with its why. R2 CL-8.2's assumptions. R3 "if weakened: prune after ack → the in-flight trace". R4 S8.L7's pair.

### 3.5 Prove-it

`statespace defend` seeds mutations of the learner's own artifact, agent closed; predict, then the checker grades (M-prove-it, C/D · Prec).

| After | Mutation | Prediction key | Graded by |
|---|---|---|---|
| LAB-8.2 | provider ignores keys | `NoDoubleCharge` fails in CW2 and CW3 | TLC {{run:RUN-tlc-double-charge}} |
| LAB-8.2 | intent written after the commit | `NoLostIntent` fails | TLC {{run:RUN-tlc-outbox-safety}} |
| LAB-8.3 | `MaxCrashes = 0` | passes; the stamp must say crashes [N] | TLC {{run:RUN-tlc-crash-liveness}} |
| LAB-8.3 | provider fairness removed | EventuallyAcked refuted; EventuallyDispatched holds | TLC {{run:RUN-tlc-recovery}} |
| LAB-8.4 | key minted at send time | fails on a seed with a CW2 or CW3 crash | the Lane A suite |
| LAB-8.4 | restart re-sends stored intents | passes against a deduplicating provider; LAB-8.6 rejects its traces | the suite, then TLC |
| LAB-8.5 | key row written in its own transaction after the capture | a re-delivery after a crash between the commits captures twice | the Lane A suite |
| LAB-8.6 | key dropped from Dispatch log lines | the fresh-key mutant is now accepted, a wrongly accepted trace; the schema lint flags it | TLC {{run:RUN-tlc-trace-validation}} |

---

## 4. Specimens SP-8.1–SP-8.6

Labels are generated from runs (violates, because, minimal?, cured by); a specimen is "kept" after a re-find on a fresh variant at least 7 days later (M-re-find).

| ID · lesson | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-8.1 · S8.L3 | Commit, Dispatch (key k), Accept, Crash (CW3), Recover, Dispatch (key k), Accept | NoDoubleCharge | a lost attempt may have been accepted; this provider ignores keys | shortest at one command, one crash | provider idempotency, one stable key, within the horizon | {{run:RUN-tlc-double-charge}} |
| SP-8.2 · S8.L3 | id 1 taken; id 2 taken and committed; poll sets mark 2; id 1 commits; stuttering | mark invariant; eventual delivery | ids allocated at INSERT, visible at COMMIT | two writers, one poll | poll by status | {{run:RUN-tlc-lost-effect}}; row H20 {{run:RUN-pg-catalog}} |
| SP-8.3 · S8.L4 | as SP-8.1, the second Dispatch with a new key | NoDoubleCharge, idempotency on | the key named the attempt | one crash | mint the key with the intent | {{run:RUN-tlc-fresh-key}} |
| SP-8.4 · S8.L6 | a fault-free mutant trace: … Receive, Ack, Persist | CL-8.3; latent AckedIsDurable | two steps reordered; outcomes still agree | shortest trace with an Ack | store, then acknowledge; validate in CI | {{run:RUN-tlc-trace-validation}} |
| SP-8.5 · S8.L7 | as SP-8.1 with Forget(k) before Recover | NoDoubleCharge under idempotency | the outage outlived the retention (dated: documented pruning [stripeidem]) | one crash, one prune | bound the horizon; reconcile by key; state the loss | {{run:RUN-tlc-key-ttl}} |
| SP-8.6 · S8.L5 | crashes off: holds; crashes on, Recover unfair: Crash, stuttering | EventuallyAcked | the model left crashes out | one crash | recovery as [A]; crashes on | {{run:RUN-tlc-crash-liveness}} |

SP-8.1 cracks SEAM-4 (ER-4), SP-8.6 cracks SEAM-8 (ER-8), and SP-8.5's class cashes ER-12.

## 5. Claim templates CL-8.1–CL-8.5

| Field | CL-8.1 | CL-8.2 | CL-8.3 | CL-8.4 | CL-8.5 |
|---|---|---|---|---|---|
| Proposition | NoLostIntent | NoDoubleCharge | each of n seeds' traces is a behavior of the spec | committed leads to acknowledged | committed leads to dispatched |
| Assumptions | [A] command and intent commit together (PostgreSQL as documented); a crash loses memory only | [A] provider deduplicates by key (trusted base); [A] one key per intent; [A] (LAB-8.8) every copy of every attempt is delivered or dropped before the key can be pruned: provider, API version, retention, date read | [A] every worker step logged at the spec's grain; [A] the simulated environment covers the real one | [A] weak fairness on the worker; [A] it eventually stays up; [A] the provider eventually replies | CL-8.4's first two |
| Model | `Outbox`, crashes on in every window | `Outbox`, `Dedup`, stable key, `Forgets` ∈ {never, after drain} | spec plus trace mapping | `Outbox` with the stated fairness | the same |
| Method · stamp | TLC: [M] · constants · complete; optionally lifted to [P] for every `Cmds` (LAB-8.10, §3.2) | [M] · constants · complete, plus the [A] clauses | [T] · n seeds, composed with the spec's [M] | [M] · constants; fairness and recovery [A] | the same |
| Correspondence | [T] · n seeds (CL-8.3) | [T] · n seeds, key logged | it is the evidence; other code [N] | [A]: traces cannot test eventuality (§13, issue 8) | [A] |
| If weakened | intent after commit: Commit, Crash, lost | prune after ack: the in-flight trace; fresh key: SP-8.3 | key unlogged: fresh-key mutant accepted | Recover unfair: crash, stutter | mark poller: SP-8.2 |
| Run | {{run:RUN-tlc-outbox-safety}}; the lift adds {{run:RUN-tlc-outbox-inductive}} and {{run:RUN-z3-outbox-inductive-param}} (both proposed) | {{run:RUN-tlc-outbox-safety}}, {{run:RUN-tlc-key-ttl}} | {{run:RUN-tlc-trace-validation}} | {{run:RUN-tlc-recovery}} | {{run:RUN-tlc-recovery}} |

**Requirement fit** (never [P]): CL-8.1's "an accepted effect is not forgotten" is safety only, [A] until paired with CL-8.5; CL-8.2's "charge at most once" is [A] within the horizon, [N] beyond it; CL-8.3 has none ([N]). GATE-claims checks each "if weakened" witness against its own proposition. Spine §12 item 28's optional [P] lift of CL-8.1 is hosted in LAB-8.10 (§3.2; §13, issue 10): it stamps the proposition in its encoding only, and the requirement fit stays [A].

## 6. Seams and erosions

| Event | Seam | Planted | Cashed | Cracks | Remedies | Ships |
|---|---|---|---|---|---|---|
| ER-4 | SEAM-4, "effect dispatch is atomic with the hold's commit" | S5.L5 · CL-5.2 | S8.L3 · SP-8.1 | assumption record | outbox; inbound keys; provider idempotency [A] | W5-T10 |
| ER-8 | SEAM-8, "the worker keeps running under weak fairness" | S5.L7 · CL-5.3 | S8.L5 · SP-8.6 | assumption record | recovery as [A]; check with crashes on | W5-T10 |
| ER-12 | SEAM-12, "retries finish before the provider forgets the key" | S8.L7 · CL-8.2's horizon clause (LAB-8.8) | the Clearinghouse, the first week SEAM-12 is the oldest open erodible seam (after S9 on both paths) · SP-8.5 | assumption record: the provider's horizon | bound the horizon, in-flight copies included; reconcile by key; state the loss | W5-T13 |

ER-4's and ER-8's endpoints exist on both published paths (W3-T12's replay test); each opens with its forecast (§2) and ships a remedy card (GATE-erosions).

## 7. Audit anchors AUD-8.1–AUD-8.2

| | AUD-8.1 · G7 unstated environment assumption | AUD-8.2 · G8 model–implementation drift |
|---|---|---|
| Sound twin | "No double charge": at-least-once dispatch with one key per intent [M] · constants · complete; provider idempotency [A] with provider, API version and date; the horizon [A] | implementation traces validated against the spec over n seeds, key and attempt logged: [T] · n seeds composed with [M] |
| Flawed variant | "Exactly once via the outbox" | the code acknowledges before the durable write; the spec does not; the claim cites the spec's [M] for the code |
| Based on | Stripe API reference, "Idempotent requests": API v1 keys can be removed once at least 24 hours old; a key reused after pruning makes a new request (read 2026-10-21; re-read 2026-10-23), https://docs.stripe.com/api/idempotent_requests | Davis, Hirschhorn and Schvimer, PVLDB 13(9), 2020 (arXiv 2006.00915, 2020-05-28): trace-checking against a highly abstract spec was impractical; model-based test generation succeeded, https://arxiv.org/abs/2006.00915 |
| Evidence required | a trace with a duplicate effect, anchored to the missing [A] line | the trace and its first non-conforming step |
| Keys | {{run:RUN-tlc-double-charge}}, {{run:RUN-tlc-key-ttl}} | {{run:RUN-tlc-trace-validation}} |
| Variants (each with a sound twin) | drop provider idempotency; drop the horizon; drop recovery from a liveness claim; drop provider fairness; "every row delivered" without "ids commit in order" | a fresh key per attempt in code only; restart re-sends stored intents; mark polling in code only; replies unvalidated; an under-logged mapping |

Both are scheduled after LAB-8 (erroneous examples need prior knowledge [alemdag25]), re-checked a week later and always browsable; GEN-spot-the-gap serves the variants to Today, the Clearinghouse and the Defence.

## 8. The S8 Defence

Untimed, at least two sessions within a week of LAB-8 (spine §8.6).
- **A · probes** (12, about 35 min, agent closed, a call on each). "Every crash window": four GEN-find-the-witness template 2 items, one per window class. "Why at-least-once delivery can duplicate calls": two template 2 items (timeouts and poller families). Two GEN-trace-allowed items (templates 2–3), two GEN-lasso-or-not items (templates 1–2), and, for "when a provider's idempotency is part of the trusted assumptions", two GEN-which-stamp items (templates 2–3 on CL-8.2).
- **B · defend** (4 mutations, about 20 min, predicted first). A fresh key per retry: TLC refutes CL-8.2 {{run:RUN-tlc-fresh-key}}; trace validation rejects the first re-send. Ack before the durable write: the spec's [M] is unchanged; trace validation rejects the first Ack {{run:RUN-tlc-trace-validation}}. Drop reply validation: TLC refutes the reply invariants. Crash actions off in the liveness check: TLC passes {{run:RUN-tlc-crash-liveness}}, and a correct prediction includes crashes [N]. Every mutant builds, or its key says it does not (GATE-labs).
- **C · audit** (4 cases, about 20 min): AUD-8.1–AUD-8.2 and variants, at least one sound, sound share seeded at 30–60%, typed evidence.
- **D · explain-back** (about 10 min; required, uncredited): every crash window, in a 2-minute oral and a 3-idea self-check compared with Part A.

Sign-off, settling and retakes follow spine §8.6.

## 9. Drawers used

D-12 (S8.L3, tablespace T3's card), D-19 (S8.L4), D-21 (S8.L6), D-09 (S8.L2, optional), D-14 (before LAB-8.4 on the builder's path). No deferred drawer surfaces. Twin pins: {{run:RUN-twin-pins}}, 60-day TTL.

## 10. Reading list (dated, section-level)

| Reading | Sections | Date | Where | Min |
|---|---|---|---|---|
| Learn TLA+ | Core › Temporal Properties; Topics › Message Queues, Finite State Machines | updated 2023-08-02; read 2026-10-23 | S8.L1, L2, L5 | 25 |
| Cirstea, Kuppe, Loillier, Merz, arXiv 2404.16075 v2 | §3, §4.2, §4.3, §4.5 | 2024-09-17 | S8.L6 | 50 |
| Howard et al., NSDI 2025, arXiv 2406.17455 v2 | §6 (required); §7–§8 (optional) | 2024-10-16 | S8.L6 | 25 |
| Stripe API reference, "Idempotent requests" | API v1 paragraphs | read 2026-10-21; re-read 2026-10-23 | S8.L4, S8.L7 | 5 |
| TigerBeetle documentation | Reliable Transaction Submission; Safety (the VOPR) | read 2026-10-23 | S8.L3, S8.L6 | 10 |
| PostgreSQL 18 docs | SELECT › The Locking Clause; sequence functions; INSERT › ON CONFLICT; §9.14; §9.27.8; §13.5 | read 2026-10-21, 2026-10-23 | S8.L3, L4 | 15 |
| Davis, Hirschhorn, Schvimer, PVLDB 13(9) | abstract | 2020 | S8.L6, AUD-8.2 | 5 |
| Hillel Wayne, "List of TLA+ Examples" (the roadmap's list) | "Thread Pool", "Batch Installer" | 2018-03-08, updated 2024-06-25 | optional | 10 |

## 11. Runs this stage needs

**Executed and cited:** RUN-tlc-jars; RUN-z3-starter (LAB-8.10 only). **To record** in W5-T03 (RUN-tlc-trace-validation in W5-T01), with argv, constants and the deadlock setting:

| Run | Must record |
|---|---|
| RUN-tlc-double-charge | windows CW1–CW4 without deduplication; the timeouts configuration (§13, issue 6) |
| RUN-tlc-fresh-key | a fresh key per attempt, deduplication on |
| RUN-tlc-lost-effect | the mark poller (invariant, lasso) and the by-status poller |
| RUN-tlc-outbox-safety | full design; no-outbox contrast; reply validation; S8.L2's graph |
| RUN-tlc-key-ttl | the four pruning policies |
| RUN-tlc-crash-liveness | crashes off with Recover unfair; crashes on with Recover unfair |
| RUN-tlc-recovery | stated fairness; no provider fairness; unbounded crashes, weak then strong |
| RUN-tlc-trace-validation | seed 1; the stuttering line; the mutant's first line; n seeds |
| RUN-sim-determinism (proposed) | seed 1's trace hash on two runs; the planted variant's divergence |
| RUN-pglite-inbound-key (proposed) | duplicate delivery; dropped-COMMIT re-run; `uuidv7()` |
| RUN-tlc-outbox-inductive (proposed) | TLC's inductive check of an `Inv` implying `NoLostIntent`, at fixed constants (LAB-8.10) |
| RUN-z3-outbox-inductive-param (proposed) | Z3: `Init ⇒ Inv` and the inductive step over an uninterpreted `Cmds`, each with its verdict, and the premise witness (LAB-8.10) |
| RUN-pg-catalog | row H20 and the same-key SERIALIZABLE race (W0-S09) |
| RUN-tlc-lasso-json, RUN-spectacle-s5s8 | the lasso format; Spectacle on S8 specs (W0) |
| RUN-scaffold, RUN-pglite-0511, RUN-twin-pins | toolchain and engine pins; twin SHAs |

## 12. Time budget against the roadmap

Reading 1.0–2.0 h; lessons 2.6–4.1 h (two core at 40–60 min, five bridges at 15–25 min); build 2.5–5.1 h (LAB-8.1–LAB-8.7, 152 nominal minutes, up to 2×); write 0.25–0.5 h (LAB-8.8); Defence 1.0–1.5 h: **7.4–13.2 h** [D] (spine §3.11). Against 3–6 weeks (14.25–28.5 h at 4.75 h a week) the high estimate is under the upper bound and the low estimate 0.27 h above half the lower bound: GATE-budget passes (§13, issue 11). The Keep block, LAB-8.9, LAB-8.10 and Clearinghouse incidents are outside the totals. The largest risks are LAB-8.4, LAB-8.6 and the TLA+ re-entry after S6–S7; learner-zero's logged times replace these figures after W5.

## 13. Spine issues

Nothing here is applied silently.

1. **Trace validation is unspiked.** `statespace trace validate` first appears in W5-T01, yet the A2 review reported that TLC's `-loadTrace` did not round-trip and asked for a spike. This file specifies the trace-module method (Cirstea et al. §4.2; CCF §6), which needs only the bundled `Json` module: name it in §9.6 and record one accepted, one rejected and one partial trace in a W0 spike. An authoring smoke test is not cited.
2. **Spectacle on S8.** S8.L2–S8.L4 and S8.L7 depend on W0-S04 (RUN-spectacle-s5s8); the fallback is INS-theater.
3. **LAB-8.3's number.** It runs after LAB-8.4 and LAB-8.5 on both paths; document the run order in §3.8 or renumber.
4. **Two run IDs.** Add RUN-sim-determinism and RUN-pglite-inbound-key to §9.5; LAB-8.5's title cites `uuidv7()` with no run (GATE-numbers).
5. **SEAM-12's wording.** "Retries finish before the provider forgets the key" holds only if retries include copies in flight: pruning once the worker has acknowledged still double-charges when an earlier copy arrives late ("after ack" in {{run:RUN-tlc-key-ttl}}). Reword to "every copy of every attempt is delivered or dropped before the provider can forget the key"; align S10's ER-12 remedy.
6. **Multi-configuration runs.** A §9.5 run record has one argv; four S8 runs need several configurations. Allow multi-configuration records or split the IDs.
7. **Receipt field.** receipt@1 has no place for per-trace verdicts and first non-conforming lines; add a trace-validation block.
8. **§8.8 and liveness.** "Trace validation over n seeds → [T] · n seeds, composed with the spec's [M]" fits safety-shaped claims only; CL-8.4 and CL-8.5 keep correspondence [A]. Add the qualifier.
9. **Misconception tags.** Register dp:E5–dp:E11 and S5's dp:T9, dp:T13–dp:T15 in the catalog, under the namespace S1's issue 4 requests.
10. **The [P] lift.** §12 item 28's optional inductive step is hosted in LAB-8.10 `[stretch]` (§3.2), because LAB-8.9 is the key TTL. The spine lacks the stage and its runs: add LAB-8.10 to §3.8, to the builder's-path row of §3.0 (which lists LAB-8.6–LAB-8.9 in the later S8 block) and to the stage and `[stretch]` counts of §3.11 and OD-15; add RUN-tlc-outbox-inductive and RUN-z3-outbox-inductive-param to §9.5, to be recorded in W5-T03; name LAB-8.10 in item 28; and give CL-8.1 the optional [P] stamp (§5). Dropping the promise from item 28 instead removes LAB-8.10 and both runs.
11. **Budget margin.** Cutting both S8.L2 and S8.L4 (cut rows 9 and 16) would trip GATE-budget's lower-bound warning.
12. **Threshold KCs.** KC-8.commit-not-send and KC-8.at-least-once need a place in a later Defence; S10's Part A should sample one item on each.
13. **Confusable set G** opens at S9, though its S6 and S8 members are both taught by S8.L6; open it at S8 or accept the delay.
14. **Twin and anchor sources.** Add TigerBeetle's Reliable Transaction Submission page to RUN-twin-pins. AUD-8.2's MongoDB card records a limit of trace checking, not a drift incident; add CCF's §7 (six bugs) as the dated drift card.
15. **INS-history.** LAB-8.5's recorded race adds S8 to INS-history's "Used in" (§9.1).
16. **ER-12's endpoint.** SP-8.5 is mounted in S8.L7, so the Clearinghouse incident should be a fresh re-find of its class on the learner's own machine, keeping the forecast a prediction.
