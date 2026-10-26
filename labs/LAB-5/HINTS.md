# LAB-5 hints: the explanation gate and the ladder

Help comes in order (labs/README.md section 11). Before the first rung on any check, write at least 12 words of your own: the failing check, the property it protects, and your hypothesis. Nothing grades what you write; it only asks you to commit to something before you look.

You can open any rung at any time. Opening one is recorded, never blocked. Past R2 the check reads "assisted" until an unseen variant passes without help: other constants or another number of workers, drawn when it is graded. The rungs were written in advance; nothing here is generated while you work.

**R0 on every check** is a teach-back: write what you think the check verifies, then compare it with the three ideas listed for that check and tick the ones you covered. It is self-assessed and never credit. Read the ideas only after you have written yours.

---

## LAB-5.c1 · The receipt is the deadlock-off run of the provided configuration

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. With the deadlock check on, TLC stops at the first state with no successor, before it reaches the invariant's violation; `-deadlock` turns that check off [X RUN-tlc-doublespend].
2. The receipt reports what TLC printed (its argv, version line, result line and counts), and the hashes tie it to the exact spec, configuration and jar.
3. The trace shows the race: both workers read the balance before either one writes it.
</details>

<details><summary>R1 · the concept</summary>The deadlock flag turns the deadlock check off.</details>
<details><summary>R2 · where to look</summary>Read the command line and the version lines in the receipt.</details>
<details><summary>R3 · a fragment</summary>`statespace check lab5.1` reruns the provided configuration unchanged.</details>
<details><summary>R4 · the design in prose</summary>Rerun it, and do not edit the template.</details>

## LAB-5.c2 · Your atomic spec passes a complete check, and a spend is reachable

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. The bug is a gap between a test and a write: another worker's step can fall between them, so the guard tests a stale value.
2. "No error" counts only over a complete exploration, with nothing left on the queue, and only at the constants the check used.
3. A property that holds because nothing ever happens says nothing: the NoSpend witness shows a spend is reachable.
</details>

<details><summary>R1 · the concept</summary>The guard and the write must be one step.</details>
<details><summary>R2 · where to look</summary>Look at the action that reads <code>seen</code> and the action that writes <code>bal</code>.</details>
<details><summary>R3 · a fragment</summary>

```
Spend(w) == /\ pc[w] = "go"
            /\ IF bal >= Amount THEN ... ELSE UNCHANGED <<bal, spent>>
```
</details>
<details><summary>R4 · the design in prose</summary>One action tests and writes the balance. Add the witness run.</details>

## LAB-5.c3 · NeverTwice and TypeOK hold, and both outcomes are reachable

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. "Never resolves twice" is about events, not about one state, so a history variable that counts resolutions turns it into an invariant.
2. TypeOK keeps every variable in the set you meant, which catches a typo that would otherwise pass silently.
3. Each outcome must be reachable, or the invariant holds vacuously: the two witnesses are violated only if a captured hold and a released hold both exist.
</details>

<details><summary>R1 · the concept</summary>Events need a history variable.</details>
<details><summary>R2 · where to look</summary>Look at every action that resolves the hold.</details>
<details><summary>R3 · a fragment</summary><code>res' = res + 1</code> in each of them, and <code>NeverTwice == res &lt;= 1</code>.</details>
<details><summary>R4 · the design in prose</summary>Count resolutions, and show that both outcomes are reachable.</details>

## LAB-5.c4 · The unsafe variant breaks NeverTwice, and the fix holds with crashes on

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. Two resolution paths (the reply handler and the expiry job) that each trust a read the other can invalidate will both resolve the same hold.
2. A compare-and-set tests the stored state and writes it in one action, so only one path can win.
3. A check with the environment switched off says nothing about the environment: replies must be delivered, duplicated and late, and the worker must crash, in the explored graph.
</details>

<details><summary>R1 · the concept</summary>Resolve by compare-and-set on the stored state.</details>
<details><summary>R2 · where to look</summary>Look at the two-step handler and the two-step expiry.</details>
<details><summary>R3 · a fragment</summary>

```
Expire == /\ hst = "held" /\ hst' = "released"
          /\ res' = res + 1
```
</details>
<details><summary>R4 · the design in prose</summary>Every resolution tests and writes <code>hst</code> in one action. Keep crashes on.</details>

## LAB-5.c5 · EventuallyResolves holds under your fairness, and the starving lasso is valid

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. Liveness needs fairness: without it, a behavior may simply stop, and "eventually" fails on a stuttering lasso.
2. Weak fairness forces an action only if it stays enabled; an action that is enabled only part of a cycle can be starved for ever.
3. Fairness is a promise about your own system's scheduler. The provider's actions are the environment, and nobody promised anything about them.
</details>

<details><summary>R1 · the concept</summary>Weak fairness forces only an action that stays enabled.</details>
<details><summary>R2 · where to look</summary>Look at the expiry action's enabling condition along the lasso.</details>
<details><summary>R3 · a fragment</summary>

```
Timeout == /\ st \in {"held", "pending"} ...
SysFairness == WF_vars(Timeout)
```
</details>
<details><summary>R4 · the design in prose</summary>Let expiry apply while a request is outstanding, and put fairness on your own actions only.</details>

## LAB-5.c6 · The three claim cards are complete, and each stamp prints its bound

<details><summary>R0 · three ideas to compare with your teach-back</summary>

1. A model-checked result is about the constants it ran with, so the bound belongs to the claim.
2. Each card names the seam it rests on, the assumption the model cannot check, such as the dispatch being atomic with the hold's commit.
3. The "if weakened" witness shows the claim is not vacuous: weaken one assumption and the proposition fails.
</details>

<details><summary>R1 · the concept</summary>A model-checked stamp needs its bound.</details>
<details><summary>R2 · where to look</summary>Look at the receipt's constants, command line and queue line.</details>
<details><summary>R3 · a fragment</summary><code>stamp: "[M] · Workers = {w1, w2}, Init = 100, Amount = 80 · complete"</code>, which the tab derives from your receipt; your card never types it.</details>
<details><summary>R4 · the design in prose</summary>Copy the bound from the receipt, and name the seam each card rests on.</details>

---

## After R4

After R4 and two more failing runs you get a worked solution (labs/README.md section 11). Redo the stage after at least 24 hours; it counts as assisted until a fresh variant passes. If you are stuck for longer, `statespace stuck` (labs/README.md section 12) writes a minimal spec and configuration you can post, with private paths stripped.
