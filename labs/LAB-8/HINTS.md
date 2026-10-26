# LAB-8 hints: the explanation gate and the ladder

Help comes in order (labs/README.md section 11). Before the first rung on any check, write at least 12 words of your own: the failing check, the property it protects, and your hypothesis. Nothing grades what you write; it only asks you to commit to something before you look.

You can open any rung at any time. Opening one is recorded, never blocked. Past R2 the check reads "assisted" until an unseen variant passes without help: other constants or another fault schedule, drawn when it is graded. The rungs were written in advance; nothing here is generated while you work.

**R0 on every check** is a teach-back: write what you think the check verifies, then compare it with the three ideas listed for that check and tick the ones you covered. It is self-assessed and never credit. Read the ideas only after you have written yours.

---

## LAB-8.c1 · The reference trace for seed 1 is accepted

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. Accepted means some behavior of the spec consumed every line of the log, and the last line is the End record.
2. The trace's hash ties the receipt to the exact bytes the reference simulator wrote for seed 1, so the same seed gives the same trace.
3. The provider's steps are not in the log: TLC searches for them between the lines.
</details>

<details><summary>R1 · the concept</summary>Accepted means one behavior of the spec consumed every line.</details>
<details><summary>R2 · where to look</summary>Read the verdict line, not the exit code.</details>
<details><summary>R3 · a fragment</summary><code>statespace trace validate labs/LAB-8/reference/OutboxRef.tla labs/LAB-8/traces/seed-1.ndjson</code></details>
<details><summary>R4 · the design in prose</summary>Run it, import the receipt, and compare the hash.</details>

## LAB-8.c2 · The unsafe variant double-charges, and the full design passes all three invariants

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. A crash loses the worker's memory and keeps the database, so recovery can act only on what is durable.
2. Without the provider's idempotency, a request sent again after the provider already accepted the first copy charges twice: CW3.
3. The full design's "no error" counts only over a complete exploration, at the configuration's constants, and only because an acknowledgement is reachable at all.
</details>

<details><summary>R1 · the concept</summary>A crash loses the worker's memory, not the database.</details>
<details><summary>R2 · where to look</summary>Look at what Crash empties, and at what Recover does with stored results.</details>
<details><summary>R3 · a fragment</summary>On recover: inflight and not stored goes to pending; stored goes to Ack.</details>
<details><summary>R4 · the design in prose</summary>Walk CW1 to CW4, one guard for each window.</details>

## LAB-8.c3 · Both properties hold under the stated assumptions, and a lasso appears without recovery

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. Weak fairness forces a step only when the action stays enabled; a crashed worker has no enabled action, so recovery needs fairness of its own.
2. "The worker recovers" must mean it eventually stays up: a finite crash budget with fair Recover.
3. Dropping one assumption at a time and reading TLC's answer is how the table in claims/progress.yaml is checked.
</details>

<details><summary>R1 · the concept</summary>Weak fairness needs an action continuously enabled, and a crashed worker has none.</details>
<details><summary>R2 · where to look</summary>Look at Recover's fairness and at the crash budget.</details>
<details><summary>R3 · a fragment</summary>Weak fairness on each worker action, on Accept and on Recover, with <code>MaxCrashes</code> finite.</details>
<details><summary>R4 · the design in prose</summary>Use the two forms of recovery from S8.L5.</details>

## LAB-8.c4 · The machine keeps its safety properties on fresh fault schedules

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. The machine is sans-I/O: every output comes from its inputs, so a seed replays exactly.
2. After a restart the machine knows only the durable rows: stored intents are acknowledged, the others are sent again with the same key.
3. One key per intent, minted at commit, is what lets a deduplicating provider absorb every retry.
</details>

<details><summary>R1 · the concept</summary>Recovery acts on what is durable.</details>
<details><summary>R2 · where to look</summary>Look at the <code>Restarted</code> arm of <code>step</code>.</details>
<details><summary>R3 · a fragment</summary>On Restarted: stored goes to Ack; otherwise Send(intent.key).</details>
<details><summary>R4 · the design in prose</summary>One key for each intent, and outputs from inputs alone.</details>

## LAB-8.c5 · At most one capture per intent, and bad replies rejected

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. A reply is untrusted input: its key, its status, its timing and its cost are each checked before anything is captured.
2. The key row and the capture commit together, so a duplicate copy, or a re-run after a dropped COMMIT, finds the key and does nothing.
3. A late reply is rejected and recorded for reconciliation, because the provider may have acted after your system gave up.
</details>

<details><summary>R1 · the concept</summary>The key row and the capture commit together.</details>
<details><summary>R2 · where to look</summary>Look at the rowcount after the key insert.</details>
<details><summary>R3 · a fragment</summary>Insert the key with ON CONFLICT DO NOTHING; 0 rows means AlreadyApplied; validate; guarded UPDATE, 1 row.</details>
<details><summary>R4 · the design in prose</summary>Apply the five checks of S8.L4 in order.</details>

## LAB-8.c6 · Traces over n seeds are accepted, and the mutant is rejected

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. Each trace is checked as a behavior of your spec, line by line; an accepted trace says nothing about the seeds that were not run.
2. A rejection names the first line no behavior consumes: that is where the drift shows, not always where it happened.
3. A disjunct that leaves a logged field unconstrained can accept a trace it should reject, so the lint requires the fields each event carries.
</details>

<details><summary>R1 · the concept</summary>The first unmatched line marks the drift.</details>
<details><summary>R2 · where to look</summary>Look at the fields your Ack disjunct constrains.</details>
<details><summary>R3 · a fragment</summary><code>IsEvent("Ack") /\ Ack(Line.cmd)</code></details>
<details><summary>R4 · the design in prose</summary>Log at the spec's grain, and constrain every required field.</details>

## LAB-8.c7 · Seeds are recorded, and every failure is mounted as a specimen

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. A failing seed is a bug report: the same seed replays the same failure at the same step.
2. A specimen's label comes from its run (the property, the step, the trace's hash), never from typing.
3. The receipt keeps the seeds, so anyone can replay what the check drew.
</details>

<details><summary>R1 · the concept</summary>A seed is a bug report.</details>
<details><summary>R2 · where to look</summary>Look at the seed lists in the receipt.</details>
<details><summary>R3 · a fragment</summary>On failure: mount(seed, first violation).</details>
<details><summary>R4 · the design in prose</summary>Replay, shrink, mount, and label the specimen from its run.</details>

## LAB-8.c8 · The five claim cards are complete, and the horizon is stated

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. "Exactly once" is a pair: your at-least-once dispatch with one key per intent, and the provider's deduplication within its retention.
2. An assumption is stamped too, ASSUMED [A], and the horizon names the provider, the API version, the retention and the date it was read.
3. Each "if weakened" witness must refute its own card's proposition.
</details>

<details><summary>R1 · the concept</summary>An assumption is stamped too: ASSUMED [A], with its reason.</details>
<details><summary>R2 · where to look</summary>Look at the assumptions of CL-8.2.</details>
<details><summary>R3 · a fragment</summary>If weakened: prune after ack gives the in-flight trace.</details>
<details><summary>R4 · the design in prose</summary>Write the pair from S8.L7: yours, and the provider's.</details>
