# A2 — Technical and formal correctness review of Plinth v1 (rev 3)

**Lens:** technical and formal correctness of every claim in `PLAN.md`, `DESIGN.md` and the six canvas sheets.
**Reviewed:** `docs/history/v1/PLAN-v1.md` (643 lines), `docs/history/v1/DESIGN-v1.md` (130 lines), `design/canvas/{Main,Elevation,Lesson,Theater,Audit,Ledger}.dc.html`.
**Runs and reading:** 2026-10-21 (task date 2026-10-20). **Scope source of truth:** `context/roadmap.md`.
**About this revision:** this replaces the earlier draft at this path. Every claim below was re-run from scratch at pinned versions. Compared with the earlier draft, it adds the following:

- Z3 gives a wrong `unsat` on the mockup's own version line (issue #11179).
- cvc5's "certificate" for C1.1 contains `hole` steps.
- TLC's answer for the model the Theater actually plays is 6 steps, not 4.
- PGlite serializes whole transactions.
- TLC's JSON trace dump encodes lassos.
- Spectacle is safety-only.
- `-loadTrace` did not round-trip.

---

## Verdict

The design's core idea is sound and worth keeping. A claim has six fields, a stamp that always names its bound, and specimens, and later courses erode earlier claims.

However, the design's own worked examples commit the error the course exists to teach: a confident claim about the wrong thing. They do so in four critical places:

1. **Course 06's headline anomaly.** A lost update at READ COMMITTED cannot happen to the SQL that the course itself compiles in lesson 6.2. The Ledger still stamps it REFUTED.
2. **The Bench's Lean receipt** (`lake build` + `#print axioms`) certifies a kernel-bypassed proof of `1 = 2` as having "no axioms".
3. **The "64-bit" seam** (S1.4 → E1 → S6.4) mixes up three different semantics. It says a proved guard "wraps", but the guard does not wrap. It blames the wrong claim for the erosion, and it offers a remedy that cannot work.
4. **The Audit Desk's flagship case** says "the kernel accepted the proof", but it does not compile. Under one plausible reading of `update`, the theorem is false.

Below these sit twelve major problems. The Theater's numbers are invented and compare two different models. The stamp grammar is misused. The course teaches `unsat` as ground truth when Z3 4.15.4 returns a wrong `unsat`. Several in-browser engine claims are unpinned, and five of them are a second semantics of the real tool.

Everything is fixable, and most of the fixes are build gates the plan already names. The gates just have to run the real tools on the real artifacts, as this review did.

## How claims were checked

All raw outputs, scripts and specs are under `research/evidence/a2r3/`. Below, `out/` and `scripts/` are relative to that directory.

| Tool | Exact version (date) | How | Raw output |
|---|---|---|---|
| Z3 (Python) | z3-solver 5.3.1.0 (PyPI 2026-10-15); also 5.3.0.0, 5.1.0.0, 4.15.4.0 | `uv run --with z3-solver==…` | `out/z3_5.3.1.txt`, `out/z3_unknown.txt`, `out/z3_11179_cli.txt` |
| Z3 (wasm) | npm z3-solver 5.3.1 (2026-10-16) = `5.3.1.0 ac9156f9…`, Node 22.22.2 | high-level API + `Z3.eval_smtlib2_string` | `out/z3_wasm.txt`, `out/z3-solver-npm-README.md` |
| cvc5 | 1.4.2 (PyPI 2026-10-08) | Python API, `proof-format-mode=alethe` | `out/cvc5_alethe.txt`, `out/cvc5_guard.alethe` |
| Lean | 4.35.0 (commit eb6cafb7, released 2026-10-12), core + Std, toolchain `leanchecker` | docker image (elan-installed official toolchain), `--network none` | `out/lean_trust.txt`, `out/lean_bv.txt`, `out/lean_audit.txt`, sources `lean/` |
| TLC | v1.8.0 rolling pre-release, `TLC2 Version 2026.10.20.183001 (rev: d2e1472)`, jar sha256 `5bd7b64d…52b1e2`; stable v1.7.4 (`2.19 of 08 August 2024`) for comparison | `eclipse-temurin:21-jre`, `-workers 1` | `out/tlc_runs.txt`, specs `tla/` |
| PostgreSQL | 18.6 and 17.11 (official Docker images) | two sessions; lock waits detected via `pg_stat_activity.wait_event_type = 'Lock'`, never sleeps | `out/pg_claims.txt`, `scripts/pg_claims.py` |
| PGlite | 0.5.10 (2026-10-14), reporting "PostgreSQL 18.6 (PGlite 0.5.10) on wasm32-unknown-emscripten" | Node | `out/pglite.txt` |
| Rust | rustc 1.96.0 | `cargo run` in debug and in release | `rust/` |
| Spectacle | master as of 2026-10-21 (repository last pushed 2026-09-30) | source read and grep | `dl/spectacle/src` |

---

## Findings, ranked: 4 critical, 12 major, 5 minor

### F1 · CRITICAL — Course 06's headline anomaly cannot happen to the SQL the course compiles

**Where:**
- PLAN.md l.452 (6.2 compiles a transfer to `UPDATE … WHERE balance >= $1 RETURNING`).
- PLAN.md l.455–457 (6.5–6.7: "S6.2 lost update, S6.3 write skew at REPEATABLE READ … does retrying terminate?").
- Ledger.dc.html l.72: "C6.2 Concurrent transfers serialise at READ COMMITTED — REFUTED — 2 connections, 9 ms window — S6.2 lost update".

**Evidence:** identical results on PostgreSQL 18.6 and 17.11. Balance 100, two transactions each spending 80, interleavings driven deterministically.

| Experiment | READ COMMITTED | REPEATABLE READ | SERIALIZABLE |
|---|---|---|---|
| E1: the course's own conditional `UPDATE … WHERE bal >= 80` in both sessions | B waits on the row lock, then updates **0 rows**; final balance 20 | B fails with 40001 "could not serialize access due to concurrent update" | B fails with 40001 |
| E2: application read-modify-write (`SELECT`, compute in app, `UPDATE SET bal = <constant>`) | **lost update: 160 spent from 100** | B fails with 40001 | — |
| E3: multi-row invariant (holds): check `bal − Σholds ≥ 80`, then insert a hold | both commit; 160 held against 100 (**write skew**) | both commit; 160 held against 100 (**write skew**) | B fails with 40001 at COMMIT; 80 held |
| E4: transfers 1→2 and 2→1 at the same time (two statements each) | A fails with **40P01 deadlock detected** | | |

PostgreSQL 18 documentation, §13.2.1, on the second updater at READ COMMITTED: "The search condition of the command (the WHERE clause) is re-evaluated to see if the updated version of the row still matches the search condition." The same page uses a balance transfer as the case where READ COMMITTED is fine: "Because each command is affecting only a predetermined row, letting it see the updated version of the row does not create any troublesome inconsistency."

**What is false:**
- The Ledger's C6.2, as worded, is refuted by nothing. Concurrent transfers that use the course's compile behave serially at READ COMMITTED (E1).
- S6.3 cannot come from a single-row guard. At REPEATABLE READ the second writer gets 40001 (E1). Write skew needs an invariant that spans several rows (E3).
- The "9 ms window" describes a timing-dependent repro. That is the opposite of a replayable specimen.
- Opposite-direction transfers deadlock (40P01) whatever the isolation level, and no lesson mentions this.
- 6.7 asks "does retrying terminate?" but never answers it. PostgreSQL 18 docs §13.5: "Transaction retry does not guarantee that the retried transaction will complete; multiple retries may be needed … In cases involving a conflicting prepared transaction, it may not be possible to make progress." So termination is a liveness **assumption**, and it should be stamped ASSUMED.

**Corrected curriculum:**
- **6.2:** keep the conditional UPDATE. It is the correct production compile. Teach why it is safe at READ COMMITTED: the row lock plus the WHERE re-check. Draw the bridge explicitly: one guarded statement is the atomic TLA+ action of lesson 5.3, and an app RMW is the read/write split.
- **6.6:**
  - S6.2 (lost update) comes from an app RMW at READ COMMITTED; REPEATABLE READ turns it into 40001.
  - S6.3 (write skew) comes from a holds table or joint-account invariant. It commits at READ COMMITTED and REPEATABLE READ and fails with 40001 at SERIALIZABLE.
  - Add S6.5 (deadlock, 40P01), cured by locking rows in id order.
- **Ledger C6.2:** reword to "App-level read-modify-write transfers are safe at READ COMMITTED — REFUTED — deterministic 2-session script, PG 18.6 — S6.2". Add a TESTED claim that the guarded single-statement compile is safe under the enumerated interleavings.
- **Specimen scripts:** drive every interleaving by detecting lock waits (`pg_stat_activity`), never by timing. Outcomes are then byte-identical across versions (verified on 17.11 and 18.6).
- **Avoid duplication:** cross-link the sibling `tablespace` course for MVCC and SSI internals instead of re-teaching them.

---

### F2 · CRITICAL — The Bench's Lean receipt certifies a kernel-bypassed proof of `1 = 2`

**Where:**
- PLAN.md l.158 ("`lake build` + `#print axioms` for Lean") and l.160–168 (the receipt and its printed trusted computing base, or TCB).
- PLAN.md l.230 (gap class 6) and l.335 (lesson 2.9).
- PLAN.md l.602–604 (receipt schema `lean?: {theorem, axioms[], sorry}[]`).
- Audit.dc.html l.44 ("lake build ✓ · 0 sorry · axioms: propext, Quot.sound").

**Evidence:** Lean 4.35.0, project `lean/proj`, output in `out/lean_trust.txt`.
- A module adds `theorem oops : False` with the kernel switched off: `set_option debug.skipKernelTC true in run_cmd … addDecl …`. It then derives `theorem anything : 1 = 2`.
- `lake build` prints "Build completed successfully".
- `#print axioms anything` prints "'anything' does not depend on any axioms".
- `leanchecker Probe` catches it: "leanchecker found a problem in Probe.Bypass … (kernel) declaration type mismatch, 'oops' has type True but it is expected to have type False".
- The official Lean reference, "Validating a Lean Proof", says this directly:
  - `lake build` gives the same guarantees as the editor's blue ticks, "but not for code that clearly only serves to circumvent the system (such as using the `debug.skipKernelTC`)";
  - re-check with `lean4checker`;
  - `comparator` is the "gold standard". It builds in a sandbox, replays with the Lean kernel and/or `nanoda`, and "ensures that the proved theorem statements match those in the trusted challenge file".

**The printed TCB is also wrong.** It is a fixed sentence ("Lean's kernel, `propext`, `Quot.sound` …"), but the real axiom sets vary (Lean 4.35.0):

| Proof | `#print axioms` |
|---|---|
| `decide` | none |
| `omega` | `[propext, Quot.sound]` |
| `Classical.em` | `[propext, Classical.choice, Quot.sound]` |
| `native_decide` | `[by_native._native.native_decide.ax_1_1]` |
| SAT-backed `bv_decide` | `[propext, Classical.choice, Quot.sound, bv_sat._native.bv_decide.ax_1_5]` |
| `admit` | `[sorryAx]` |

Since Lean 4.29, `decide +native` and `bv_decide` introduce one dedicated `_native` axiom per native computation, and 4.35.0 removed the old `Lean.trustCompiler` machinery (Lean reference, same page).

**Why critical:** the course's purpose is auditing agent-written "verified" code. Its own grader would accept the oldest trick in that genre.

**Recommendation:**
- **Receipt contents:** `lake build`, then `#print axioms` per theorem, then `leanchecker --fresh <Module>` (pass/fail), then the toolchain hash.
- **Hidden trust:** stamp as hidden trust any axiom outside `{propext, Classical.choice, Quot.sound}`, including `_native.*` and `sorryAx`. This follows the Lean reference.
- **TCB sentence:** generate it from the receipt rather than authoring it. List the axioms actually used, "the compiler" whenever a `_native` axiom appears, the honesty of imported libraries, and the human reading of the statement.
- **Audit Desk and capstone:** grade with `comparator` (github.com/leanprover/comparator, Apache-2.0, tagged v4.35.0).
- **Gap class 6:** add `bv_decide`, `debug.skipKernelTC`, and "builds but `leanchecker` fails".
- **New audit case:** add A2.6 "kernel bypass", whose specimen is the `1 = 2` above.

---

### F3 · CRITICAL — The "64-bit" seam (S1.4 → E1 → S6.4) mixes up three semantics and erodes the wrong claim

**Where:**
- PLAN.md l.303 (1.5: "Re-encode with `BitVec(64)`; watch a 'proved' guard wrap").
- PLAN.md l.108 (E1: "C1/C2 balance claims over ℤ | Course 06 bigint overflow (foreshadowed by S1.4)").
- PLAN.md l.454 (6.4).
- Ledger.dc.html l.48–49 and l.66: "balance bigint overflowing at 2⁶³−1 … C2.3 still holds of the model. Its correspondence to the running system does not", with the remedies "Re-state C2.3 with a bound" and "Add a CHECK constraint and re-test".

**Evidence, Z3 5.3.1:**
- With signed comparisons, `a ≥ 0, b ≥ 0, X > 0, X ≤ a, a − X < 0` over `BitVec 64` is **unsat**. The guard claim C1.1 survives the re-encoding.
- What wraps is the *destination*: `b + X < 0` is **sat** (b = 9223372036850581504, X = 4194304).
- Conservation `(a − X) + (b + X) = a + b` is **proved** over `BitVec 64`, because modular arithmetic conserves.
- Mixing an unsigned guard (`ULE`) with a signed check is **sat**. That is the real encoding trap.

**Evidence, PostgreSQL 18.6, 17.11 and PGlite 0.5.10:**
- Crediting past 2⁶³−1 raises `22003 bigint out of range`. The transaction aborts and the balance is unchanged. Nothing wraps.
- `sum(bigint)` returns `numeric`, so totals do not overflow either.
- PostgreSQL 18 docs §8.1.1: "Attempts to store values outside of the allowed range will result in an error."

**Evidence, Rust 1.96.0 `i64`** (the Course 06 lab language):
- A debug build panics with "attempt to add with overflow".
- A release build wraps to −9223372036854775808.
- `checked_add` returns `None`.

**What is false:**
1. "Watch a proved guard wrap": the guard does not wrap.
2. E1 erodes **C2.3** (conservation), but the Postgres abort *conserves*. What actually fails is the **success condition**: the model commits a transfer that the database rejects. That is a failure of the refinement claim C6.1, and of the "allowed ⇒ succeeds" reading of C2.2.
3. "Add a CHECK constraint" cannot prevent 22003, which is raised while the expression is evaluated. A `CHECK (bal ≤ B)` only adds another rejection, which must then be mirrored in the abstract guard.

**Corrected text:**
- **1.5:** "Re-encode with `BitVec(64)`. C1.1 survives under signed comparisons. The destination credit wraps; conservation still holds modulo 2⁶⁴; and a mixed signed/unsigned guard lets the overdraft back in."
- **E1 row:** "Cracked: the success condition (C2.2) and refinement (C6.1). By: Postgres `22003` aborts a transfer that the ℤ model commits. S6.4: abstract = success, concrete = error, total unchanged."
- **Ledger remedies:**
  - "Strengthen the abstract guard: `bal(to) + amt ≤ 2⁶³−1`, and re-prove."
  - "Model the error as `Except Overflow`."
  - "Use `numeric` and state its bound."
- **Teaching aid:** add a three-row table, "64-bit means three things": Z3 BitVec wraps (and signedness is per operator); Postgres bigint errors and aborts; Rust i64 panics in debug, wraps in release, and returns `None` from `checked_add`.

---

### F4 · CRITICAL — The Audit Desk's flagship case (A2.1) does not compile, and its answer key depends on an undefined `update`

**Where:** Audit.dc.html l.50–58 (the diff), l.61 ("The kernel accepted the proof"), l.79 (the model evidence); PLAN.md l.341 (A2.1).

**Evidence:** Lean 4.35.0, output in `out/lean_audit.txt`.

1. **The code is not core Lean.** In core Lean, `ℤ` and `ℕ` are unknown identifiers ("Unknown identifier `ℤ` … Perhaps you meant `Int`"). They are Mathlib notation, so the snippet presupposes Mathlib.
2. **The method chain does not parse as a chain.** The continuation line begins with `.update`, and Lean parses it as a *dotted identifier* argument, not as a call on the previous line:
   - With a Mathlib-style `Function.update` (exact signature, value-taking), the result is "Application type mismatch" plus "Invalid dotted identifier notation: The expected type of `.update` could not be determined".
   - With a modify-style `update` (taking a function), the result is "Unknown constant `AccountId.update` / `Nat.update`".
3. **With the syntax repaired (`|>.update`), the shown proof still fails.** `simp [refund]` does not unfold `update`, and `omega` reports: "omega could not prove the goal: a possible counterexample may satisfy the constraints c ≤ −1 …".
4. **A repaired proof works** (`split <;> split <;> simp_all <;> omega`). `refund_nonneg` then depends on `[propext, Quot.sound]`, so the mockup's axiom line is right for the repaired artifact. The gap is real: `refund_breaks_inv`, with merchant 0 and refund 50, gives −50.
5. **Under value-style update** (what Mathlib's `Function.update` means), the audited theorem is **false**. A self-refund (customer = merchant) debits without crediting: I proved `¬ refund_nonneg` with a witness of balance 0 and amount 5, giving −5. Z3 agrees (`sat`, c = m = 3). In that reading, the honest finding is "this does not build", not "statement too weak".

**Recommendation:** ship A2.1 as a compiled artifact with the pinned toolchain, and define the update explicitly. This version compiles on 4.35.0 (`lean/AuditD.lean`):

```lean
def Function.update (f : AccountId → ℤ) (k : AccountId) (g : ℤ → ℤ) : AccountId → ℤ :=
  fun j => if j = k then g (f j) else f j     -- modify semantics; rename to avoid Mathlib's clash
def refund (s : State) (p : PaymentId) (amt : ℤ) : State :=
  let pay := s.payments p
  { s with balance := s.balance.update pay.customer (· + amt)
                               |>.update pay.merchant (· - amt) }
theorem refund_nonneg … := by
  have h := hInv (s.payments p).customer
  simp only [refund, Function.update]
  split <;> split <;> simp_all <;> omega
```

- `verify:audit` (PLAN l.614) must build every case and assert its stated outcome: builds, axiom list, and that the gap witness exists.
- Add the self-refund variant as A2.5b. Its correct finding is "statement false under the shipped update".

---

### F5 · MAJOR — The stamp grammar is misused in four places

**Where:** PLAN.md l.32–34 and l.196–198 ("CHECKED ≤ N states"); DESIGN.md §3 and l.96; Main.dc.html l.68 ("Checked ≤ 2.1M states"); Theater.dc.html l.105; Ledger.dc.html l.65, l.68, l.69–70.

**Problems and evidence:**

1. **A CHECKED bound is the instance, not a state count.**
   - For a finite instance, TLC explores *all* reachable states. The meaningful bound is the constants (e.g. `Workers = {w1, w2}`, `Holds ≤ 3`), whether symmetry was on, and whether the run completed.
   - The count stopped at a violation is partial. With an initial balance in 0..100, TLC found 1,120 distinct states at the first violation against 1,140 for the complete space (`out/tlc_runs.txt`).
   - "≤ 2.1M states" reads like a depth cutoff, which TLC's default mode does not have.
2. **A refutation carries no bound.** The Theater's comparison panel shows a CHECKED stamp next to a violation (l.105). One witness refutes the property within the model at any bound.
3. **C5.2 "Every hold eventually resolves — ASSUMED — TLC, WF on Timeout"** (Ledger l.70). A liveness property that TLC checked is CHECKED under fairness. The fairness is an *assumption field*, not the claim's stamp.
   - The bound must also say "symmetry off". TLC 1.8.0 itself prints: "Warning: Declaring symmetry during liveness checking is dangerous. It might cause TLC to miss violations of the stated liveness properties." Lesson 5.8 lists symmetry without this caveat.
4. **PROVED conflates three things:**
   - kernel-checked (Lean);
   - solver-trusted (a Z3 `unsat` with no certificate; see F6 for a real wrong `unsat`);
   - certificate-checked. Even this is partial: cvc5 1.4.2's Alethe proof of C1.1 has 12 steps, **3 of which are `:rule hole … "untranslated rewrite"`** (`out/cvc5_guard.alethe`).
5. **The Ledger's C4.1 rests on more than "Z3 trusted".** It also rests on the SMT-LIB printer being faithful to the Lean semantics, which is exactly the bug lesson 4.7 plants.
6. **A DESIGN rule contradicts Course 09.** "Correspondence … can never render PROVED" (DESIGN l.96) conflicts with C9.1, which proves source→IR correspondence.

**Recommendation:**
- The CHECKED qualifier becomes `constants · symmetry on/off · complete/partial · TLC build`; the state count is a statistic.
- REFUTED takes only a witness size, defined as *actions*: TLC prints n+1 states for n actions.
- PROVED must name its checker: `Lean kernel (leanchecker ✓)`, `Z3 5.3.1, uncertified`, or `cvc5 Alethe, k holes`.
- Narrow DESIGN l.96 to "correspondence *to running code*".

---

### F6 · MAJOR — `unsat` is taught as ground truth, but Z3 4.15.4 (the mockup's version line) returns a wrong `unsat`

**Where:** Lesson.dc.html l.59 ("If none exists, the property holds — for exactly the constraints you wrote down"); PLAN.md l.400 (4.8 "Solver correctness vs VCGen correctness"); the Ledger's PROVED stamps that rest on Z3 alone (l.65).

**Evidence:**
- Z3 issue #11179, "[Refutational Soundness Bug] Incorrect UNSAT in Real exponentiation with a base below 1", was closed 2026-10-15 and fixed in 5.3.1. The fix is listed in the release notes as "Fix unsound nonlinear-arithmetic exponentiation bounds".
- I replayed the issue's exact SMT-LIB scripts (`set-logic ALL`, `push 1`) through Z3's SMT-LIB command interpreter (`out/z3_11179_cli.txt`):

| Version | Input 1 (truly sat, y = 2) | Input 2 (truly sat, y = ½) |
|---|---|---|
| 4.15.4 | **unsat** | unknown |
| 5.1.0 | **unsat** | unknown |
| 5.3.0 | **unsat** | **unsat** |
| 5.3.1 | unknown | unknown |

- The *same formulas* through Python's `Solver()` object return `unknown` on all four versions. The answer depends on the API path (incremental vs non-incremental).

**Problem:**
- The lesson's sentence omits "…and if the solver is sound".
- Lesson 4.8 has no concrete, dated solver-soundness specimen, though one now exists.
- The instrument table's "Same solver" (PLAN l.179) is not "same answer". The browser path, the Bench path and the build-gate path must be the same path.

**Recommendation:**
- Amend l.59 to: "…for exactly the constraints you wrote down, *if the solver is sound*."
- Add specimen S4.3 "the solver was wrong": Z3 4.15.4 or 5.3.0 against 5.3.1, with the issue link and the fix date.
- Pin z3-solver 5.3.1 for PyPI and npm, and record the API path in every receipt.
- Have `verify:calls` cross-check authored `unsat` verdicts with a second engine or path where the fragment allows.
- Stamp solver-only results "uncertified" (F5).

---

### F7 · MAJOR — The Theater's numbers are invented, and "your 6 vs TLC's 4" compares two different models

**Where:** Theater.dc.html l.99–106 ("6 your steps · 4 TLC shortest · 212 distinct states"; "TLC needs only four … The checks at t3–t4 aren't separate steps in the model"; the stamp "Checked 2 workers · amounts ∈ {80} · bal ∈ 0..100"); Ledger.dc.html l.69 ("TLC, 48,112 states").

**Evidence:** TLC 1.8.0, `-workers 1`, specs in `tla/`.

| Model | Shortest violation | Distinct states, complete | At first violation |
|---|---|---|---|
| A: read / check / write as separate actions (what the Theater timeline plays) | **6 actions** (7 states) | 20 | 20 |
| B: check merged into write | 4 actions (5 states) | 13 | 12 |
| A with initial balance in 0..100 | 6 | 1,140 | 1,120 |
| B with initial balance in 0..100 | 4 | 993 | 932 |

**Problems:**
- On the model the learner plays, TLC's shortest trace is 6, so the learner *found* a shortest trace. "4" holds only for model B.
- "212" matches no reading of the scene. "48,112" has no spec behind it.
- The Theater also offers "Duplicate reply" and "Delay message" for a model that has no messages.

**Recommendation:**
- Show TLC on the *same* model (6 = 6). Then make granularity a separate exercise (A → B: 6 → 4 actions; 20 → 13 states).
- Generate every number in mockups and lessons from a recorded run (spec hash, TLC build, `-workers 1`, constants), following kernelspace's rule that "every number is a dated, sourced claim".
- Print witness length as actions, with the state count in parentheses.

---

### F8 · MAJOR — The canonical claim card on the Main sheet teaches a false counterexample and an unchecked axiom list

**Where:** Main.dc.html l.109 (theorem specimen), l.127 ("`#print axioms` = propext"), l.129 ("If weakened: Drop 'Allowed' → specimen S1.2, balance −40"), l.138–145 (S1.2: "a = 0 b = 0 amount = 40 … Minimal? Yes").

**Evidence:**
- Conservation does not depend on the guard.
  - Z3 5.3.1 proves `(a − amt) + (b + amt) = a + b` with no premise.
  - Lean 4.35.0 proves `run_conserves : ∀ s, total (run s ops) = total s` with no `Allowed` hypothesis; its axioms are `[propext, Quot.sound]`, not "propext".
- −40 violates non-negativity, not conservation.
- The minimal overdraft witness is `amount = 1`, both by default and under `Optimize.minimize` (Z3 5.3.1). So "amount = 40 · Minimal? Yes" is self-contradictory.
- The theorem specimen `theorem conserve (s : State) : total (transfer s a b n) = total s` elaborates only because `autoImplicit` silently binds `{a b : Nat} {n : Int}`. It fails with `autoImplicit false` ("Unknown identifier `a` … It is not possible to treat `a` as an implicitly bound variable").

**Corrected "If weakened" field:**
> Drop `Allowed` → conservation still holds over ℤ: the premise was unnecessary, which is itself a lesson in statement strength. Only non-negativity fails (S1.1). Use set-style updates with self-transfer → money is minted (S2.1, verified `sat` with n = 1).

**Recommendation:**
- Copy axiom lists from receipts rather than authoring them.
- Show the minimal witness (amount = 1).
- Set `autoImplicit false` in templates and mockups.

---

### F9 · MAJOR — Course 06's compile conflates four failure causes, misses NULL and self-transfer, and assumes PGlite can replay concurrency

**Where:** PLAN.md l.451–454 (6.1, 6.2 "rowcount as the guard result", 6.4 "CHECK constraints"), l.182 (PGlite "replayed here"), l.456; DESIGN.md §3 (ENFORCED "where (runtime, DB constraint)").

**Evidence:** PostgreSQL 18.6 and 17.11.
- **A rowcount of 0 has four different causes:** a guard that is false, a NULL balance, a NULL amount, and an unknown account all return **0 rows**. The abstract semantics distinguishes them (`Except PlinthError`), but the compile does not.
- **CHECK admits NULL.** `CHECK (bal >= 0)` accepts an inserted NULL. PostgreSQL 18 docs §5.5.1: "a check constraint is satisfied if the check expression evaluates to true or the null value."
- **Self-transfer depends on the compile.** As a single `UPDATE … SET bal = CASE WHEN id = from … WHEN id = to …`, a self-transfer of 30 turns 100 into **70**: money destroyed. The two-statement compile nets 100. This is S2.1's aliasing in SQL.
- **PGlite 0.5.10 serializes whole transactions.** A second `transaction()` cannot begin while the first is open (`out/pglite.txt`). It can therefore never show a lock wait, the WHERE re-check, 40001, or SSI aborts. It can replay an autocommit, statement-level RMW interleaving, but that interleaving is plain sequential SQL.

**Recommendation:**
- **Compile spec:** both rowcounts must be exactly 1; map each 0 to a typed error (`NoSuchAccount`, `Insufficient`, `NullAmount`).
- **Schema:** `bal bigint NOT NULL CHECK (bal >= 0)`.
- **ENFORCED-by-CHECK** requires NOT NULL.
- **Self-transfer:** carry the 3.7 decision record into the compiler.
- **Specimens:** add S6.1a–d for these cases.
- **PGlite:** call the browser side a "history viewer". Pin Bench Postgres to 18.6 to match PGlite 0.5.10.

---

### F10 · MAJOR — The in-browser explorer cannot check liveness, is a second semantics, and its TLC import is unpinned

**Where:** PLAN.md l.181 ("own explicit-state BFS for a small PlusCal-like DSL; plus TLC trace import (`-dumpTrace json`)"), l.141–143 ("instrument's shortest witness"), l.191–198, l.426 (S5.3 starving lasso).

**Evidence:**
- **BFS finds safety violations only.** Liveness under WF/SF needs fair-cycle (SCC) analysis.
- **Spectacle** (github.com/will62794/spectacle, MIT) is an existing "full TLA+ interpreter in Javascript". Its README says it is conformance-tested by comparing reachable state graphs with TLC's. But it is **safety-only**:
  - its evaluator has no `WF_`/`SF_`/temporal handling;
  - in `js/app.js` l.1484–1492, lasso transitions are commented out under "DISABLE LASSO TRANSITIONS FOR NOW".
- **`-dumpTrace json` exists only in the rolling v1.8.0 pre-release.** Stable v1.7.4 replies "Error: Error: unrecognized option: -dumpTrace". The v1.8.0 release is re-published continuously (recreated 2026-10-20T18:20Z; asset sha256 `5bd7b64d…52b1e2`).
- **The JSON does encode lassos.** For a liveness violation, the last action's target is state 1 (verified with `Hold.tla`). Import is viable.
- **Shortest witnesses need a single worker.**
  - The TLC options page says breadth-first search gives "a shortest possible behavior that exhibits the error" for safety, but multi-worker runs vary ("For small models, use a single worker").
  - Lamport (discuss.tlapl.us, 2017): "When using multiple worker threads, TLC's state exploration is only approximately breadth-first."
  - docs.tlapl.us: "Liveness Checking by default is not guaranteed to produce the shortest trace."

**Recommendation:**
- Use Spectacle, or your own explorer conformance-tested against TLC state graphs the way Spectacle is, for safety play in real TLA+ rather than a homemade DSL.
- For liveness, build a small **lasso validator**. The learner proposes a cycle, and the validator checks that it is reachable, that the property fails throughout it, and that it is fair. WF holds on a cycle if the action fires or is disabled somewhere in it; SF holds if the action fires or is disabled everywhere in it. TLC on the Bench stays authoritative.
- Pin and mirror the TLC jar by sha256.
- Define "shortest witness" per tool: TLC safety at `-workers 1`; none for liveness; an explicit objective for Z3.

---

### F11 · MAJOR — The in-browser Z3 claims understate real constraints, and the "Python shim" is a homemade transpiler

**Where:** PLAN.md l.179 ("official `z3-solver` npm (WASM) in a worker … Same solver, Python syntax shimmed to the JS API; long queries time out at 10 s"); DESIGN.md l.100 ("Z3 4.x"); Lesson.dc.html l.68 ("Z3 4.15"), l.107; Main.dc.html l.138.

**Evidence:** z3-solver README, npm 5.3.1.
- "The package requires threads … `SharedArrayBuffer` … you'll need to serve your page with special headers" (COOP/COEP).
- The coi-serviceworker trick works on GitHub Pages, "though you shouldn't use that trick in more complex applications".
- "Only one long-running function can run at a time … all other long-running requests will queue up."
- `z3-built.js` must be its own script, because "using a bundler like webpack will prevent it from loading correctly".

**Other evidence:**
- Pyodide 314.0.7 and 0.29.5 ship **no** z3 package (lock files checked). "Python syntax shimmed" therefore means a homemade Python-subset → JS transpiler, which is a second semantics.
- What works (wasm 5.3.1 in Node):
  - the timeout fires ("unknown 3.04 s reason=timeout");
  - `Z3.eval_smtlib2_string` runs;
  - the starter model matches Python's exactly.
- Current is Z3 5.3.1 (PyPI 2026-10-15). It prints `[b = 0, amount = 1, a = 0]`, not the mockup's `[a = 0, b = 0, amount = 1]`.

**Recommendation:**
- Use SMT-LIB or the TypeScript API in the browser and real Z3Py on the Bench. If a shim is kept, gate it with `verify:shim` golden tests.
- Document COOP/COEP hosting and one-call-at-a-time.
- Show tool output verbatim, with the pinned version in the instrument header.

---

### F12 · MAJOR — "Force an `unknown` with nonlinear arithmetic" produces only machine-dependent timeouts, which `verify:calls` cannot reproduce

**Where:** PLAN.md l.299 (1.1), l.129–133 and l.611 (`verify:calls` "every authored Call It answer reproduced").

**Evidence:** Z3 5.3.1 and 4.15.4.
- **Polynomial examples only time out.** The cubic `x³ + y³ = z³` with positive integers returns `unknown` / reason `timeout` at 2 s, 5 s and 20 s, while `x·x = 2` and `x·y = 7` are `unsat` instantly. A timeout verdict depends on the machine, and wasm is slower than native. Calling "unknown" then grades the learner's hardware.
- **A reproducible alternative exists.** `x**y == 8, y > 1` over `Int` returns `unknown` with reason "(incomplete (theory arithmetic))" **instantly**, in both versions and in wasm 5.3.1.

**Recommendation:**
- Teach the reason taxonomy (`incomplete`, `timeout`, `canceled`, `resource`) using `reason_unknown()`, and make the reason part of the Call It answer.
- Author only reason-stable `unknown` items.
- Have `verify:calls` record the version, the API path and the reason.

---

### F13 · MAJOR — The "Lean golden exports" are compiler output, and Goal Replay recordings will go stale

**Where:** PLAN.md l.180 ("golden-tested against Lean `#eval` exports … the Lean evaluator is the reference semantics"), l.184 (Goal Replay "authored, recorded goal states"), l.613 (`verify:interp`).

**Evidence:**
- **`#eval` can disagree with the kernel** (Lean 4.35.0). With `@[implemented_by fastImpl] def spec (n) := n`, the theorem `spec_id : spec n = n := rfl` "does not depend on any axioms", yet `#eval spec 3` prints `4`.
- **Lean releases monthly**: v4.34.0 on 2026-09-14, v4.35.0 on 2026-10-12, v4.36.0-rc1 on 2026-10-14. Hand-authored goal strips will drift.

**Recommendation:**
- Make each golden a kernel-checked theorem (`theorem golden_17 : run c s₀ = r := by decide`) and export from those.
- Lint the semantics modules: no `implemented_by`, `extern`, `partial` or `unsafe`.
- Generate the Goal Replay strips from the pinned toolchain in CI, behind a new `verify:goals` gate.

---

### F14 · MAJOR — Course 04: one audit key is wrong, and two lessons are degenerate or ambiguous

**Where:** PLAN.md l.393 (4.1 "Partial vs total correctness on transfer"), l.395–396 (4.3 "guarded commands", 4.4 obligation), l.405–406 (A4.2 "'Z3 proved it' over a query that never mentions the guard").

**Problems:**
1. **A4.2 is not a gap.** Write Step₀ for the unguarded step. If `Inv ∧ Step₀ ∧ ¬Inv′` is unsat, then the unguarded step preserves Inv, and so does the guarded command, whose reject branch leaves the state unchanged. Omitting the guard makes the result *stronger*. A learner who flags this case loses precision for being right.
2. **4.1 has nothing to show.** Mini-Plinth v0 has no loops (3.8), so partial and total correctness coincide on transfer, unless aborts count as failures of total correctness.
3. **"Guarded command" has several weakest preconditions (WPs):**
   - Dijkstra `if g → S fi`: `g ∧ wp(S,Q)`.
   - `assume g`: `g → wp(S,Q)`.
   - `assert g`: `g ∧ wp(S,Q)`.
   - Mini-Plinth reject: `(g → wp(S,Q)) ∧ (¬g → Q)`.

   4.4's obligation covers only the success path.

**Recommendation:**
- Re-key A4.2 as one of:
  - "the query asserts Inv′ instead of ¬Inv′, and `sat` was read as success";
  - "Step is contradictory (vacuous), so every query is `unsat`".
- Give the four WP rules in 4.3 and say which one `requires` means.
- Pair every `unsat` VC with a vacuity query: `Inv ∧ Guard ∧ Step` must be sat.
- Teach 4.1 with a fuelled settlement loop.

---

### F15 · MAJOR — Course 08's "exactly-once is a pair" omits the provider's idempotency horizon

**Where:** PLAN.md l.514 (8.4), l.517 (8.7), l.522–524 (A8.x).

**Evidence:** Stripe API reference, "Idempotent requests", read 2026-10-21.
- For API v1, keys can be pruned once they are "at least 24 hours old. We generate a new request if a key is reused after the original is pruned."
- Retries with the same key "return the saved response, including `500` errors".
- Mismatched parameters error.
- No result is saved when validation fails "or the request conflicts with another request that's executing concurrently".
- API v2 behaves differently.

**Problem:**
- An outbox that retries after the retention window double-charges even though it reuses the key.
- A replayed 500 is not a retry.
- An in-flight duplicate is rejected, not deduplicated.

**Recommendation:**
- C8.1 gets the ASSUMED seam "retry horizon < provider key retention (Stripe v1: ≥ 24 h, API version stated)", with source and date.
- Model the TTL, in-flight rejection and the replayed 500 in the Course 08 TLA+ spec.
- Add a specimen (a retry after the TTL double-charges) and an audit case.

---

### F16 · MAJOR — Judgment's scoring rule is mis-specified

**Where:** PLAN.md l.124–129 (confidence 55/75/95%; Brier and reliability); Elevation.dc.html l.83–87 ("0.14 … 0.25 is a coin flip"; "At 80% confidence you were right only 58%").

**Problems:**
- **The 55% floor records honest uncertainty as overconfidence.** Verdicts have three or more options. For an uninformed learner on a three-option item, the expected Brier score on "my call is right" is **0.269** at the forced 55%, against **0.222** at an honest ⅓.
- **The mockup's bucket cannot exist.** No 80% level is offered, and five bars are drawn for three levels.
- **The baseline does not apply.** "0.25 is a coin flip" is the score of a constant 50% forecast, which no item allows.

**Recommendation:**
- Set the floor to 1/k for k options, or elicit a distribution and use the multi-class Brier or log score.
- Show one bar per offered level.
- Print a no-skill reference per item type.
- Score trace-length predictions as intervals.

---

### F17 · MINOR — Cross-artifact IDs and counts are inconsistent (`verify:links` would fail)

- **Overdraft specimen:** PLAN l.300 calls it S1.1, but Lesson l.49 and l.110 and Main l.135 call it S1.2, which PLAN reserves for double capture.
- **C1.1:** minted in 1.3 (PLAN l.301), but the 1.2 mockup says it "establishes" C1.1.
- **C2.4:** Elevation l.75–76 says "2.6 — Induction over transfer sequences … Prove C2.4", but PLAN has 2.7 → C2.3. L2 promises C2.1–C2.4, and no lesson defines C2.4.
- **Ledger C4.1** "VC generator is sound" is PLAN's C4.3. **Ledger C3.2** "don't get stuck" differs from PLAN's C3.1/C3.2.
- **Counts:**
  - "~40 specimens" (l.64), but 23 are enumerated.
  - "course 2 of 10" (Elevation l.43), but there are 11 courses (00–10).
  - "7 of 12 claims" for Course 02, which mints 3–4.
- **E4** "C5 holds model without crashes" contradicts 5.5, which models crashes.
- **Lesson 0.1:** "Enumerate a 3-bit transfer space by hand" means 2⁹ = 512 (a, b, amount) triples. Shrink the space.

**Fix:** keep one registry and generate the mockup copy from it.

---

### F18 · MINOR — Lean setup: Finmap, `ℤ`, `Function.update`, a missing reading, autoImplicit

**Where:** PLAN.md l.334 (2.8 "`Finmap`/function update"), l.321–323 (reading), l.335 (2.9); Audit and Main sheets (which use `ℤ`).

**Evidence (core Lean 4.35.0):**
- `Function.update`, `Finmap`, `ℤ` and `ℕ` are all unknown identifiers; they are Mathlib-only.
- Mathlib's `Function.update` takes a *value*; the Audit snippet uses it with a function.
- Core `Std` has `HashMap.modify` and `TreeMap.modify`, which take a function.
- TPIL's chapter 12 is "Axioms and Computation", the exact reading for 2.9, but the reading list stops at chapters 3–5 and 7–8.

**Recommendation:**
- Decide core vs Mathlib in `TOOLS.md`. For core: `Acct → Int`, your own `modifyAt`, your own sum lemma. For Mathlib: pin the revision and accept the build cost.
- Add TPIL chapter 12 to the reading for 2.9.
- Set `autoImplicit false` in the L2 template.

---

### F19 · MINOR — Negative amounts are missing from the decision records

**Where:** PLAN.md l.313–315 (Course 01 viva asks only "what changes if `amount` may be zero"); l.369 (3.7 lists zero, self-transfer, failed guard, overflow).

**Evidence (Z3 5.3.1):** with the guard `amount ≤ a` but no `amount > 0`, the query `b + amount < 0` is **sat** with `amount = −1`. The "transfer" drains the recipient past the guard.

**Recommendation:** add "zero *or negative*" to the 1.5 encoding, the 3.7 decision record and the viva.

---

### F20 · MINOR — Over-general sentences

- **Lesson l.63:** "Every check in this course, from Z3 to TLC, is that move." Search-based checks (Z3, TLC, Alloy) hunt for a witness of ¬P. Lean's kernel checks a proof term, and tests only sample.
- **Lesson l.59:** "A solver doesn't prove 'for all'." An `unsat` of ¬P *is* a proof of ∀, of exactly the encoding and modulo solver soundness (F6).
- **PLAN l.483:** "why small scopes find most bugs." Present this as Jackson's small-scope *hypothesis*. A clean check at scope 4 says nothing about scope 5. (The often-cited empirical evaluation by Andoni et al. could not be located: unverified.)
- **"No error" in TLC** holds modulo fingerprint collisions. TLC prints an optimistic estimate, for example 1.6E-19 on `Sym.tla`. Say this in 5.8.

---

### F21 · MINOR — Course 09's preservation theorem and planted bug need precision

**Where:** PLAN.md l.541–544 (9.5–9.8), l.543 (9.7 "Hoist a write above its guard; the proof breaks").

**Evidence:** Leroy, *CACM* 52(7), 2009, doi:10.1145/1538788.1538814.
- The general property is "S safe ⟹ (∀B, C⇓B ⟹ S⇓B)".
- The forward form "∀B ∉ Wrong, S⇓B ⟹ C⇓B" is equivalent to it only when source, target **and environment** are deterministic ("we focus on source and target languages that are deterministic").

**Problems:**
- Postgres with 40001/40P01 and retries is not deterministic. The obligation "the IR is deterministic" must be stated, and serialization failures and deadlocks must be observable outcomes in 9.8's validator.
- Mini-Plinth errors are explicit outcomes, not "Wrong", so A9.1's abort-blind observer is the right trap.
- 9.7's hoisted write breaks preservation only if the guard reads the written location, or if aborts do not roll back. Specify which, or the proof may go through and confuse the learner.

---

## Claims verified as correct (keep them)

- **Roadmap starter.** It reproduces on Z3 5.3.1, native and wasm: `sat [b = 0, amount = 1, a = 0]`, then `unsat` once the guard is added.
- **S2.1 is real.** A read-both-then-write-both update mints money on a self-transfer (Z3 `sat`, n = 1).
- **A2.1's stated gap is real under modify semantics.** The merchant goes to −50.
- **S3.3/E6.** Lean `Nat` truncates: `(3 : Nat) − 5 = 0` by `rfl`.
- **S6.1 is real.** A NULL guard is a no-op (0 rows).
- **S6.3 is real.** Write skew at REPEATABLE READ occurs given a multi-row invariant (E3).
- **REPEATABLE READ second writers get 40001.**
- **TLC traces.** Single-worker breadth-first search gives the shortest safety trace. Liveness counterexamples are lassos ("Back to state 1"). ◇AllDone needs fairness.
- **"A liveness property can't be refuted by a finite prefix."** Correct: Alpern & Schneider, *IPL* 21(4), 1985, doi:10.1016/0020-0190(85)90056-0.
- **PGlite** is single-connection, at PostgreSQL 18.6.
- **`-dumpTrace json`** exists, but only in the v1.8.0 pre-release.
- **`#print axioms` reveals** `admit` and `sorry` (as `sorryAx`) and `native_decide`/`bv_decide` (as `_native.*`).
- **The mockup's "axioms: propext, Quot.sound"** matches the repaired refund proof.
- **DESIGN's contrast claim.** Every text pair computed passes 4.5:1; the lowest is 4.89:1 (`#C2410C` on `#FFF7F2`). The PROVED and REFUTED fills differ in lightness by only 1.88:1, so hue and printed text do the separating.
- **Viva BYOK.** Calling Claude directly from the browser is feasible: a CORS preflight to `api.anthropic.com/v1/messages` allows the `anthropic-dangerous-direct-browser-access` header with origin `*`.
- **Google Fonts survive COEP.** It sends `cross-origin-resource-policy: cross-origin`.
- **Reading lists.** TPIL chapter numbering, FPIL chapters (ch. 4 Monads, ch. 7 Programming with Dependent Types) and the NNG world names are all correct.

## Bold ideas (beyond fixing)

1. **A "the solver was wrong" specimen and two-engine verdicts.**
   - Ship Z3 issue #11179 as a dated specimen: 4.15.4 and 5.3.0 give `unsat`, 5.3.1 gives `unknown`, and the Python `Solver()` path gives `unknown` on all versions.
   - Every authored `unsat` is replayed on a second engine or path in CI.
   - The stamp shows "uncertified" until a certificate or kernel replay exists.
2. **Certificate X-ray.** Render cvc5 Alethe proofs step by step and highlight `hole` steps: C1.1 has 3 of 12. Learners see exactly which inferences are trusted. Z3 5.3.x release notes also announce Lean reconstruction for QF_LRA/QF_UF refutations, a candidate route from `unsat` to a kernel-checked theorem (not yet tried).
3. **A comparator-graded Audit Desk and statement-pinning drills.**
   - The learner writes the trusted challenge statement.
   - Agent PRs are judged by `comparator`: a sandboxed build, kernel and nanoda replay, and a statement match.
   - The kernel-bypass `1 = 2` (accepted by `lake build` + `#print axioms`) becomes an audit case that only `leanchecker`/comparator catch.
4. **A deterministic two-session Postgres harness.**
   - Lock-wait detection (`pg_stat_activity`) replaces sleeps, so every concurrency specimen is a replayable script.
   - Outcomes are identical on 17.11 and 18.6 (verified), so `verify:specimens` can run them in CI.
   - Each script is paired with its TLA+ granularity: the guarded UPDATE is one atomic action, and an app RMW is a read/write split.
5. **A three-semantics overflow lab.** One transfer, three meanings of "64-bit", shown side by side: Z3 BitVec wraps mod 2⁶⁴ with signedness per operator; Postgres raises 22003 and aborts; Rust panics in debug, wraps in release, and returns `None` from `checked_add`. E1 then fires from evidence rather than narrative.
6. **A lasso validator plus Spectacle.** Real TLA+ semantics in the browser for safety play (Spectacle, conformance-tested against TLC). A small, exact validator checks learner-proposed lassos against the WF/SF conditions and the property. TLC's JSON lasso, verified to encode the back-edge, confirms on the Bench.
7. **Kernel-checked goldens.** The TS interpreter is tested against goldens that are Lean theorems (`run c s₀ = r := by decide`), never `#eval` output. Add an `implemented_by`/`extern` lint, and generate Goal Replay strips in CI from the pinned toolchain.
8. **Every number is a run.** Mockup and lesson numbers (212, 48,112, "9 ms", 20k, 0.14) are emitted by recorded runs with tool build, spec hash and TTL, following kernelspace's evidence-ledger rule. The Theater would have self-corrected to 6 = 6 and 20 states.

## Unverified

- **TLC `-loadTrace json`.** It exists in v1.8.0 ("load a trace … to use as a constraint"). But re-loading TLC's own `-dumpTrace` JSON constrained the search to 0 distinct states, for both a genuine and a tampered trace. Treat learner-trace validation through `-loadTrace` as a spike, not a plan.
- **Carcara on `hole` steps.** Whether it accepts them with a warning or rejects them was not tested.
- **Z3 5.3's Lean reconstruction.** Known from the release notes only; not run.
- **z3-solver in a real browser under COOP/COEP.** Known from the README; only Node was run.
- **Mathlib's own `Function.update` field-notation behaviour.** Emulated with the exact signature; Mathlib was not built. Core's lack of `ℤ` and the newline parse failure were verified directly.
- **Andoni et al.'s small-scope evaluation.** The citation was not located.

## Sources (read 2026-10-21 unless dated)

- PostgreSQL 18 docs:
  - §13.2 Transaction Isolation: https://www.postgresql.org/docs/current/transaction-iso.html
  - §13.5 Serialization Failure Handling: https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html
  - §5.5.1 Check Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
  - §8.1 Numeric Types: https://www.postgresql.org/docs/current/datatype-numeric.html
- Ports & Grittner, "Serializable Snapshot Isolation in PostgreSQL", *PVLDB* 5(12), 2012: https://doi.org/10.14778/2367502.2367523
- Lean reference, "Validating a Lean Proof": https://lean-lang.org/doc/reference/latest/ValidatingProofs/
- Lean releases: https://github.com/leanprover/lean4/releases (v4.35.0, 2026-10-12)
- comparator: https://github.com/leanprover/comparator
- *Theorem Proving in Lean 4*: https://lean-lang.org/theorem_proving_in_lean4/
- *Functional Programming in Lean*: https://lean-lang.org/functional_programming_in_lean/
- Natural Number Game (NNG4): https://github.com/leanprover-community/NNG4
- Z3:
  - npm z3-solver README: https://www.npmjs.com/package/z3-solver
  - Z3 issue #11179: https://github.com/Z3Prover/z3/issues/11179
  - Z3 release notes: https://github.com/Z3Prover/z3/blob/master/RELEASE_NOTES.md
  - PyPI z3-solver: https://pypi.org/project/z3-solver/
- cvc5: https://pypi.org/project/cvc5/ (1.4.2, 2026-10-08)
- Carcara: https://github.com/ufmg-smite/carcara
- Pyodide lock file: https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide-lock.json
- TLA+ tools:
  - Releases: https://github.com/tlaplus/tlaplus/releases (v1.8.0 pre-release; v1.7.4, 2024-08-05)
  - TLC options page: https://nightly.tlapl.us/doc/model/tlc-options-page.html
  - Codebase architecture: https://docs.tlapl.us/codebase:architecture
  - Wishlist (symmetry and liveness): https://docs.tlapl.us/codebase:wishlist
  - Lamport and Kuppe on multi-worker breadth-first search: https://discuss.tlapl.us/msg00204.html
- Spectacle: https://github.com/will62794/spectacle
- PGlite: https://www.npmjs.com/package/@electric-sql/pglite (0.5.10, 2026-10-14)
- Stripe, "Idempotent requests": https://docs.stripe.com/api/idempotent_requests
- Papers:
  - Alpern & Schneider, "Defining liveness", *IPL* 21(4), 1985: https://doi.org/10.1016/0020-0190(85)90056-0
  - Yang, Chen, Eide & Regehr, "Finding and understanding bugs in C compilers", PLDI 2011: https://doi.org/10.1145/1993498.1993532
  - Leroy, "Formal verification of a realistic compiler", *CACM* 52(7), 2009: https://doi.org/10.1145/1538788.1538814 (PDF: https://xavierleroy.org/publi/compcert-CACM.pdf)
- Alloy 6.2.0 (2025-01-09), Soufflé 2.5 (2025-03-24), Apalache 0.62.4 (2026-10-12): their GitHub releases pages.
