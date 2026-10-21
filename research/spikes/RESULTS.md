# Spike results — verified on this machine, 2026-10-20

These are executed facts, not recollections. Content writers: cite these and reuse the scripts.

## Z3 (Python wheel via `uv run --with z3-solver`)
- `z3.get_version_string()` = **5.3.1**. npm `z3-solver` latest = **5.3.1** (modified 2026-10-16), unpacked 35.5 MB, `z3-built.wasm` 34.6 MB.
- Roadmap starter code reproduces exactly: `sat [b = 0, amount = 1, a = 0]`, then `unsat` after `amount <= a`.
- 64-bit bit-vector re-encoding (signed comparisons): the guarded *sender* cannot go negative (`unsat`), but the *recipient* can wrap: `sat` with B = 9223372036850581504, M = 4194304 → B + M exceeds 2^63−1 and wraps negative. → Specimen: "the guard protects the sender, not the recipient" (Int encoding hid it).
- npm `z3-solver` README: "The package requires threads … SharedArrayBuffer … serve your page with special headers (COOP/COEP) … coi-serviceworker trick on GitHub Pages". `z3-built.js` references PTHREAD (41×) and SharedArrayBuffer. → Browser instrument needs cross-origin isolation (coi-serviceworker on GitHub Pages), lazy load + Cache API, and a Bench fallback.

## PGlite
- npm `@electric-sql/pglite` latest = **0.5.10** (modified 2026-10-14).

## PostgreSQL 18.6 (docker `postgres:18`), script: `spikes/pg_anomalies.py` (psycopg 3)
| Experiment | Isolation | Result |
|---|---|---|
| Two concurrent `UPDATE acct SET bal = bal - 80 WHERE id=1 AND bal >= 80` from bal=100 | READ COMMITTED | both statements "ok"; second re-evaluates WHERE on the new row version (EvalPlanQual), updates 0 rows; final bal **20** — **no lost update** |
| App-level read-modify-write: both `SELECT bal` (100), both `UPDATE … SET bal = <read>-80` | READ COMMITTED | final bal **20**, but **160 spent from 100** — lost update / double spend |
| Same read-modify-write | REPEATABLE READ | second writer: **SerializationFailure, SQLSTATE 40001**; final 20 |
| Write skew: invariant sum(team) ≥ 0, each txn checks sum (200) then withdraws 150 from a *different* account | REPEATABLE READ | **both commit; team total −100** |
| Same write skew | SERIALIZABLE | t1 commits, t2 **40001**; total 50 |
| `CHECK (bal >= 0)` with `INSERT … (NULL)` | — | **accepted** (CHECK passes on NULL/unknown) |
| `UPDATE … SET bal = bal - 10 WHERE bal >= 10` over rows {NULL, 50} | — | only the non-NULL row updated; the NULL row is **silently skipped** |
| `9223372036854775807::bigint + 1` | — | **error 22003 "bigint out of range"** — Postgres raises, it does not wrap |

Implications (corrections to v1):
- v1 Ledger mockup "C6.2 concurrent transfers serialise at READ COMMITTED — REFUTED, S6.2 lost update" is only true for the read-modify-write compilation; a single-statement conditional UPDATE does not lose updates under RC. The specimen must name the compilation pattern.
- v1 erosion E1 ("bigint overflowing at 2^63−1 where Lean's ℤ keeps counting") is wrong in mechanism: Postgres aborts with 22003. The correct divergence: the abstract model takes a successful step that the database refuses — a refinement failure in the "DB cannot match S → S′" direction (and a liveness/availability effect), not silent wraparound. Silent wraparound is a Rust-release-mode / BitVec story, not a Postgres one.

## TLA+ / TLC (tla2tools v1.8.0 nightly 2026-10-20, Java 21 via docker eclipse-temurin:21-jre). Specs: `spikes/tla/`
- Latest stable tagged release is v1.7.4 (2024-08-05); v1.8.0 is a rolling prerelease (published 2026-10-20). `-dumpTrace json <file>` works in 1.8.0 and writes `{"counterexample":{"action":[[[i,{state}],{"name","location","context","parameters"},[j,{state}]],...]}}` — directly importable by a browser trace viewer.
- `DoubleSpend.tla` (read step and write step separate; Init=100, Amount=80, Workers={w1,w2}; INVARIANT spent <= Init): **violated**. Counterexample = 5 states / 4 actions: Read(w1), Read(w2), Write(w1), Write(w2) → spent = 160, bal = 20. When the violation was found: 12 states generated, 11 distinct. Full reachable space without the invariant: 13 generated, **11 distinct**, depth 5.
- `DoubleSpendAtomic.tla` (guard + write in one action): **no error**; 5 generated, **4 distinct**, depth 3. With 3 workers, Amount=40: no error, 8 distinct, depth 4.
- Unsafe with 3 workers, Amount=40: violated; 89 generated, 69 distinct when found, depth 7.
- Correction to v1 Theater mockup: "TLC shortest: 4" is right only if counting actions (it is 5 states); "212 distinct states" was invented — the real number is 11. Any number in course copy must come from a run like this, recorded with the tool version.

## Lean
- `ss-lean:4.35.0` docker image built (elan, Lean v4.35.0 stable, released 2026-10-12; v4.36.0-rc1 2026-10-14). Use `docker run --rm -v <dir>:/work ss-lean:4.35.0 lake build` to verify Lean content.
- `spikes/lean/Ledger.lean` compiles on **core Lean 4.35.0 with no Mathlib**: two-account `transfer` over `Int`; `transfer_conserves`, `transfer_nonneg`, `transfer_rejected`, `run_conserves` (list induction, `generalizing s`) all proved with `unfold/split/simp/omega/induction`. `#print axioms` → `[propext, Quot.sound]` for both conservation theorems.
- Finite-map generalisation as `Acct → Int` with a pointwise `upd`: the BUGGY transfer that computes both new balances from the old state **mints money on self-transfer** — `xferBuggy (fun _ => 10) 0 0 5 0 = 15` is proved by `decide`; the fixed version (read the destination after the debit) gives 10, also by `decide`.
- Implication: Course 2 needs no Mathlib (one ~200 MB toolchain instead of multi-GB Mathlib caches), which removes most of the install wall. Mathlib only if/when a later lab needs Finset sums etc. (prefer Std/Batteries or own definitions).
