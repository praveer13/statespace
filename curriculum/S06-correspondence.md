# S6 Correspondence (PostgreSQL, Rust): curriculum spec

**Status:** authoring spec for W4 (W4-T01 `isorun`, W4-T03 INS-history, W4-T04 INS-pglite, W4-T05 GEN-anomaly-id and lessons, W4-T06 LAB-6, W4-T10 runs, W4-T12 ER-1 and D-30, W4-T13 anchors and bridge cards, W4-T14 Clearinghouse plug-in); draft, first-learner pass pending. **Date:** 2026-10-24 (machine clock; sources read 2026-10-23 unless noted). **IDs:** every ID comes from `docs/spine/SPINE.md` (revision 2). Anything the spine lacks is marked "proposed" and listed in §14 rather than invented silently.

**Sources, in precedence order.** The roadmap's Stage 6. Executed runs: RUN-pg-anomalies (`research/spikes/pg_anomalies.py`, `RESULTS.md`), RUN-pg-claims (`research/evidence/a2r3/scripts/pg_claims.py`, `a2r3/out/pg_claims.txt`; PostgreSQL 18.6 and 17.11, identical rows), RUN-pglite (`evidence/A5r3/pglite.log`, `a2r3/out/pglite.txt`). The brief (V2-07, V2-16, V2-30, V2-31). The pedagogy digest (§2, misconceptions Q1–Q7). Report R4 and its verification log. Reviews A1-F2, A2-F1, A2-F9. The spine.

**Tags.** `[X RUN-id]` executed, on disk; `{{run:RUN-id}}` recorded before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design default or estimate. Documentation quotes carry section and read date. Learner copy follows "Copy:"; everything else is for authors. Misconception tags are written `dp:Q4` (pedagogy digest §2), because the catalog's G-codes collide with gap classes. Learner copy uses only the spine's glossary terms plus plain English, and lane badges as learners see them: *re-checked here*, *reported from your machine*.

**Roadmap scope (abridged).** Compile Mini-Plinth transfers into transactions; run the same random commands in the interpreter and in PostgreSQL and compare; reproduce write skew or read-modify-write races with concurrent connections; use SERIALIZABLE and retries; formulate R(S, D), and for each successful D → D′ ask whether a legal S → S′ exists with R(S′, D′). Completion test: what differential tests establish and what they cannot; SQL mismatches such as NULL, bags, numeric overflow and serialization failures. Roadmap time: 4–8 weeks.

---

## 0. The stage at a glance

**New tool.** PostgreSQL 18.6. On the Bench (INS-bench-pg), Docker runs it and `statespace isorun` drives two sessions by detecting lock waits, never by sleeping (W4-T01; {{run:RUN-isorun-upstream}}). The executed rows came from psycopg scripts; copy cites RUN-pg-claims, which polls for lock waits, wherever the interleaving matters (§14, issue 4). In the tab, INS-pglite runs PGlite reporting PostgreSQL 18.6 on one connection, where two "concurrent" transactions serialize [X RUN-pglite] (0.5.11 pin {{run:RUN-pglite-0511}}), so every concurrency cell replays a Bench-recorded history in INS-history and says so.

**Division of labor.** The course supplies `isorun`, the isolation catalog in isolationtester format (`setup` / `session` / `step` / `permutation`; rows H01–H21 as in R4 §3.1, proposed rows in §12), the abstract-serializability checker (bounded, so its verdicts are [T]) and the reference semantics; the learner writes everything listed in §3, ending with the runtime (capstone S10.L4).

**The lesson variable is the compilation pattern** (V2-07). Copy never attaches an anomaly to an isolation level alone; every specimen names its pattern.

| ID | Tier | Title | Minutes | KCs introduced | Calls | Specimens · claims |
|---|---|---|---|---|---|---|
| S6.L1 | bridge | SQL is not relational algebra | 15–25 | KC-6.sql-not-algebra, KC-6.null-guards | 1 | SP-6.1 |
| S6.L2 | core | Compile a transfer: the rowcount is the guard | 45–55 | KC-6.rowcount-as-guard | 3 | SP-6.7 |
| S6.L3 | bridge | Differential testing: what it establishes | 20–25 | KC-6.differential-testing | 1 | CL-6.1 (plants SEAM-11) |
| S6.L4 | bridge | Numbers: the step the database refuses | 20–25 | KC-6.overflow-refusal | 1 | SP-6.4 (cashes ER-1) |
| S6.L5 | bridge | Enforced at commit | 20–25 | KC-6.enforce-at-commit | 1 | SP-6.8 · CL-6.4 |
| S6.L6 | core | Same transfer, three verdicts: the compilation pattern decides | 50–60 | KC-6.compilation-pattern, KC-6.anomaly-isolation | 3 | SP-6.2, SP-6.3, SP-6.5, SP-6.6 · CL-6.2 |
| S6.L7 | bridge | SERIALIZABLE and retries | 15–25 | KC-6.serializable-retries | 1 | CL-6.5 |
| S6.L8 | core | The refinement relation R(S, D) | 50–60 | KC-6.refinement-relation, KC-6.abstract-serializability | 3 | CL-6.3 |
| S6.L9 | bridge | Postgres semantics is an assumption | 15–25 | KC-6.db-as-assumption | 1 | SP-6.9, SP-6.10, SP-6.11 (plants SEAM-9) |

**Paths.** Default: S6.L1–S6.L9 in order, each LAB-6 stage after the lesson whose "Build this" card names it. Builder's path (OD-3): S6.L1, S6.L2, S6.L6, S6.L7 and LAB-6.1, LAB-6.5, LAB-6.6 right after S5.L1–S5.L8 (D-23 covers S6.L2's soft edge to KC-3.big-step-errors); the rest after S7.

**Flagship moments.** "Same transfer, three verdicts" (S6.L6); "the step the database refuses", ER-1 firing from the learner's own seam (S6.L4); "commit order is not the serial order" (S6.L8).

**Glossary.** S6 introduces no new glossary terms. "History", "isolation level", "serial order" and "refinement" are plain technical English, each defined in the lesson that first uses it.

---

## 1. Conventions and knowledge components

**Call It** follows M-call-it and spine §8.5: three confidence taps, chance 1/k printed, payoffs as feedback only, the first call final. Keys for recorded-history cells are computed by INS-history at grade time, never stored.

**Graded items** name a family and template from spine §8.3 (GEN-find-the-witness t1 model, t3 history; GEN-call-it t1 three-way, t3 which anomaly, t4 multiple true/false; GEN-which-stamp t1–t3; GEN-anomaly-id t1–t4). Practice shows the witness and its class; probes are one-shot (M-class-hint). GEN-anomaly-id draws from recorded histories: every permutation of each catalog spec over a grid of three balances, three amount pairs and three levels [D], recorded on PostgreSQL 18.6 by {{run:RUN-pg-catalog}} (§14, issue 5); the seed picks the history, and the key is computed from it.

**Surprise forecast.** Each call carries one; §2.10 tallies them for GATE-items.

**Knowledge components** (spine §4; three threshold KCs, each with spiral returns and a later Defence):

| KC | Threshold | Requires | Confusable with | First taught | Returns |
|---|---|---|---|---|---|
| KC-6.sql-not-algebra | | KC-1.encoding-is-the-claim | — | S6.L1 | S6.L2; KC-7.rls-semantics (S7.L4); KC-9.sql-equivalence (S9.L8) |
| KC-6.null-guards | | KC-6.sql-not-algebra | — | S6.L1 | S6.L2, S6.L5; RLS `USING` (S7.L4) |
| KC-6.rowcount-as-guard | | KC-6.null-guards, KC-3.big-step-errors | — | S6.L2 | LAB-6.2–6.3; S8.L4 inbound keys |
| KC-6.differential-testing | threshold | KC-6.rowcount-as-guard | KC-3.goldens-as-theorems | S6.L3 | sets A and G (S8.L6, S9.L2, S9.L8); Defences S6, S9, S10 |
| KC-6.overflow-refusal | | KC-1.encoding-is-the-claim, KC-6.rowcount-as-guard | — | S6.L4 | set F; S8.L4 reply validation |
| KC-6.enforce-at-commit | | KC-4.prove-or-enforce, KC-6.null-guards | KC-4.prove-or-enforce | S6.L5 | S10 report |
| KC-6.compilation-pattern | | KC-6.rowcount-as-guard, KC-5.interleaving-granularity | KC-6.anomaly-isolation | S6.L6 | set D; S9.L7 |
| KC-6.anomaly-isolation | threshold | KC-6.compilation-pattern | KC-6.compilation-pattern | S6.L6 | set D; S7.L4 (H17); S8.L4; Defences S6, S8, S10 |
| KC-6.serializable-retries | | KC-6.anomaly-isolation | — | S6.L7 | KC-8.idempotency-keys (S8.L4) |
| KC-6.refinement-relation | threshold | KC-6.differential-testing, KC-3.step-invariant | KC-9.forward-simulation | S6.L8 | sets B and G (S9.L5); Defences S6, S9, S10 |
| KC-6.abstract-serializability | | KC-6.refinement-relation, KC-6.anomaly-isolation | — | S6.L8 | S7.L8 |
| KC-6.db-as-assumption | | KC-6.serializable-retries | KC-4.trust-stack | S6.L9 | KC-9.tcb (S9.L9); S10 report |

Confusable set D opens in S6.L6; S6 KCs join the open sets A, B and F (M-which-is-it, only after exit items).

**Misconception tags used.** From the catalog: dp:Q1–dp:Q7, dp:G8, dp:X1, dp:X4, dp:C1, dp:C2, dp:L7, dp:S1, dp:Z4, dp:T5, dp:P1. **Proposed** (evidence "—": log through Call It and keep only if they draw errors; §14, issue 7): **dp:Q8** results as sets; **dp:Q9** NULL as 0 or as false; **dp:Q10** matching no row fails visibly; **dp:Q11** anomalies as timing accidents, not interleavings; **dp:Q12** retry the statement, or read 40001 as a bug; **dp:Q13** commit order as the serial order; **dp:Q14** refinement checked on balances or totals only; **dp:Q15** agreeing engines as independent witnesses.

---

## 2. Lessons

### S6.L1 · bridge · SQL is not relational algebra

**Objective.** Predict, before each run, the rowcount and stored values of PGlite cells involving NULL and duplicate rows, and produce a one-row witness that a guard and its negation both skip.
**KCs.** KC-6.sql-not-algebra, KC-6.null-guards. **Prerequisites.** KC-1.encoding-is-the-claim. **Instruments.** INS-pglite. **Generators.** GEN-call-it, GEN-find-the-witness. **Specimen.** SP-6.1. **Drawer.** D-15 (for LAB-6.1). **Minutes.** 15–25.

**Prequestion** (one item tagged with both KCs, as a bridge has one prequestion; four true/false statements). Copy: "A table `t(id int, team int, bal bigint CHECK (bal >= 0))`. True or false?"
1. "Inserting a row whose `bal` is NULL is rejected." **False** [X RUN-pg-anomalies, RUN-pg-claims]. Why: "a check constraint is satisfied if the check expression evaluates to true or the null value" (PostgreSQL 18 §5.5.1, read 2026-10-23) (dp:Q2).
2. "`SELECT team FROM t` can return the same value twice." **True** {{run:RUN-pg-sql-semantics}}. Why: tables and results are bags; a plain SELECT keeps duplicates (dp:Q8).
3. "`SELECT count(bal) FROM t` counts rows whose `bal` is NULL." **False** {{run:RUN-pg-sql-semantics}}. Why: `count(expr)` counts non-null values; `count(*)` counts rows (dp:Q9).
4. "`WHERE NOT (bal >= 10)` selects exactly the rows `WHERE bal >= 10` skips." **False** {{run:RUN-pg-sql-semantics}}. Why: a NULL row makes both predicates unknown, and WHERE keeps only true rows, so it lands in neither (dp:Q9, dp:Q1).

**Cells** (PGlite reporting PostgreSQL 18.6 [X RUN-pglite]). C1 the NULL insert. C2 the guarded UPDATE over rows {1: NULL, 2: 50}. C3 `count(*)` under `p`, `NOT p` and `p IS NULL`, which together account for every row {{run:RUN-pg-sql-semantics}} (SQLancer's TLP idea). C4 a NULL amount in the guard: 0 rows [X RUN-pglite, RUN-pg-claims].

**Call It** on C2 (k = 4, chance 1/4). Copy: "`UPDATE t SET bal = bal - 10 WHERE bal >= 10` over row 1 (bal NULL) and row 2 (bal 50). What happens?" A "0 rows: the NULL row stops the statement" · B "1 row: row 2 becomes 40; row 1 is untouched" · C "2 rows: row 1 stays NULL; row 2 becomes 40" · D "an error: NULL cannot be compared". **Key:** B [X RUN-pg-anomalies]. **Why** A: WHERE filters row by row; one unknown row does not fail the statement (dp:Q10). B: `NULL >= 10` is unknown, WHERE keeps only true rows, and nothing reports the skip. C: an unknown predicate is not true, so row 1 is never selected (dp:Q9). D: comparing with NULL yields unknown, never an error (dp:Q3). **Surprise forecast:** yes.

Copy after the run: "SQL has three truth values. A constraint lets unknown through; a filter throws it away. Neither tells you."

**Graded item.** GEN-find-the-witness template 1 (model). Copy: "Give one row, NULLs allowed, that neither `WHERE p` nor `WHERE NOT p` selects." The seed draws p from a pool banded by operator count (`bal >= amt`; `id = 1 AND bal >= amt`; `NOT (bal < amt)`; `bal >= amt OR frozen`). PGlite runs both SELECTs on the witness, which passes when both return no rows; no stored key. The OR band discriminates, because `unknown OR true` is true. Class hint: "an operand of p is unknown and nothing else decides p".

**Exit item.** GEN-call-it template 4: five statements from a pool (CHECK, WHERE and `NOT IN` with NULL; `count(*)` against `count(col)`; `UNION` against `UNION ALL`; `sum` over no rows), keyed by [X RUN-pg-claims] or {{run:RUN-pg-sql-semantics}}.

**Today.** KC-6.sql-not-algebra: GEN-call-it t4. KC-6.null-guards: GEN-find-the-witness t1. **Twin.** None. **Sibling.** None. **Reading.** PostgreSQL 18 §5.5.1 "Check Constraints" and the note in §9.21 "Aggregate Functions" (read 2026-10-23). **Build this:** LAB-6.1, the 2-minute win (D-15 if the devcontainer is new).

### S6.L2 · core · Compile a transfer: the rowcount is the guard

**Objective.** Write a compile plan for `Transfer(from, to, amount)` in which every UPDATE declares exactly one expected row, every zero maps to a named outcome (`Insufficient`, `NoSuchAccount(from)`, `NoSuchAccount(to)`), the schema declares `bal bigint NOT NULL CHECK (bal >= 0)`, and a self-transfer follows the LAB-3.7 decision record; shown by witnesses that break mutant plans.
**KCs.** KC-6.rowcount-as-guard; KC-6.null-guards (spiral). **Prerequisites.** KC-6.null-guards, KC-3.big-step-errors (builder's path: D-23). **Instruments.** INS-pglite, INS-lane-a. **Generators.** GEN-find-the-witness, GEN-call-it. **Specimen.** SP-6.7. **Minutes.** 2 + 3 × 12–15 + 5.

**Prequestions.**
PQ1 (k = 4, chance 1/4; KC-6.rowcount-as-guard). Copy: "Your debit `UPDATE acct SET bal = bal - $2 WHERE id = $1 AND bal >= $2` reports 0 rows on a table where `bal` may be NULL. What could have happened?" A "only insufficient funds; the others raise errors" · B "a serialization failure from a concurrent writer" · C "any of four: low funds, missing account, NULL balance, NULL amount" · D "nothing: an UPDATE matching no row raises an error". **Key:** C [X RUN-pg-claims]. **Why** A: three other causes give the same zero (dp:Q3). B: a serialization failure raises 40001; it never returns 0 rows (—). C: all four returned 0 rows, with no error, in the recorded run. D: matching no row is a success with count 0 (dp:Q10).
PQ2 (k = 4, chance 1/4; KC-6.null-guards). Copy: "Now declare `bal NOT NULL`. Which causes remain?" A "three: all but the NULL balance" · B "all four" · C "two: insufficient funds and no such account" · D "only insufficient funds". **Key:** A [X RUN-pg-claims] (its NULL-amount and unknown-account rows ran on a `NOT NULL` table). **Why** A: `NOT NULL` constrains stored rows, not parameters or missing rows. B: a NULL balance can no longer be stored (dp:Q2). C: a NULL parameter still makes the guard unknown (dp:Q9). D: a missing account still matches nothing (dp:Q10).

**Segment 1 · Four ways to get zero** (12–15 min; KC-6.rowcount-as-guard)

*Cells*: the four zero-row debits on a NULL-permitting table, then a credit to a missing account [X RUN-pg-claims].

**Call It** on the credit (k = 4, chance 1/4). Copy: "`UPDATE acct SET bal = bal + 30 WHERE id = 999`, and no row 999 exists. PostgreSQL returns:" A "a new row 999 with balance 30" · B "success, 1 row" · C "an error naming the missing row" · D "success, 0 rows". **Key:** D [X RUN-pg-claims]. **Why** A: UPDATE never inserts (—). B: no row matches (dp:Q10). C: SQL reports a count, not a missing key (dp:Q10). D: the statement succeeds and changes nothing. **Surprise forecast:** yes. Copy: "If the plan ignores that 0, the debit commits and 30 leaves the system."

*Worked example* (correct first, A [barbieri23]): the reference plan, a Rust `Plan` value serialized over the zero-import ABI (D-14).

```
schema  acct(id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0))
plan Transfer(from, to, amt: Amount)            -- Amount: 0 < n by type (KC-3.refined-types)
  if from = to: apply the LAB-3.7 decision      -- Err SelfTransfer, or Ok with no SQL
  BEGIN
  s1  UPDATE acct SET bal = bal - $amt WHERE id = $from AND bal >= $amt
      RETURNING old.bal, new.bal                -- expect exactly 1 row
      0 rows: SELECT 1 FROM acct WHERE id = $from
              none → Err NoSuchAccount(from); some → Err Insufficient; ROLLBACK
  s2  UPDATE acct SET bal = bal + $amt WHERE id = $to
      RETURNING old.bal, new.bal                -- expect exactly 1 row
      0 rows → Err NoSuchAccount(to); ROLLBACK
  SQLSTATE 22003 → S6.L4's decision; ROLLBACK
  COMMIT → Ok(the two old/new pairs)
```

`RETURNING old.…, new.…` is new in PostgreSQL 18 (§6.4, read 2026-10-23; {{run:RUN-pg-sql-semantics}}): each pair is one row's concrete transition D → D′, which S6.L8 consumes. Expectations are equalities, never "at least one".

**Graded item.** GEN-find-the-witness template 1 (model). Copy: "This plan differs from the reference in one place. Give an initial state and a Transfer on which its outcome differs from the reference semantics." Mutant pool by seed: the credit's expectation dropped (witness: `to` missing, so the debit commits); guard `bal > $amt` (witness: a balance equal to the amount); no existence query (witness: `from` missing, reported as `Insufficient`); guard removed with CHECK kept (witness: an overdraft). The host runs the plan on PGlite and the command on INS-interp; the witness passes when the outcome classes differ. No stored key; distractor classes tagged dp:Q10, dp:Q3, dp:Q2.

**Segment 2 · The schema is part of the compile** (12–15 min; KC-6.rowcount-as-guard, KC-6.null-guards)

*Cell*: the plan with the guard removed and `CHECK (bal >= 0)` kept, debiting 80 from 50.

**Call It** (k = 4, chance 1/4). Copy: "No guard; the schema keeps `CHECK (bal >= 0)`. Debit 80 from a balance of 50. PostgreSQL:" A "fails with 23514, a check violation" · B "commits, leaving a balance of −30" · C "skips the row and updates 0 rows" · D "commits, clamping the balance at 0". **Key:** A {{run:RUN-pg-sql-semantics}}. **Why** A: the new row makes the constraint false, so the statement errors. B: a false result is rejected; only NULL slips through (dp:Q2). C: a constraint does not filter rows the way WHERE does (dp:Q3). D: nothing clamps (—). **Surprise forecast:** no.

Copy: "The final balances match a guarded refusal. The outcome does not: the semantics says `Insufficient`, the database says 23514. A harness that compares balances alone calls them equal." (AUD-6.2 in miniature.)

**Graded item.** GEN-call-it template 4, five statements over schema and plan variants: "with `NOT NULL` and the guard, a NULL amount still yields 0 rows" (true [X RUN-pg-claims]); "with CHECK alone, an overdraft's outcome equals the semantics' `Insufficient`" (false); "`CHECK (bal >= 0)` without `NOT NULL` admits a NULL balance" (true [X RUN-pg-claims]); "a 0-row debit says which account was missing" (false); "`RETURNING old.bal, new.bal` reports the row's transition" (true {{run:RUN-pg-sql-semantics}}).

**Segment 3 · One row, two roles** (12–15 min; KC-6.rowcount-as-guard)

*Cells*: a self-transfer of 30 from account 1 (balance 100), first as one CASE UPDATE, then as two UPDATEs [X RUN-pg-claims].

**Call It** (k = 4, chance 1/4). Copy: "One statement: `SET bal = CASE WHEN id = $from THEN bal - $amt WHEN id = $to THEN bal + $amt END WHERE id IN ($from, $to)`, with from = to = 1 and amount 30. Afterwards:" A "balance 100, 2 rows updated" · B "an error: one row updated twice" · C "balance 70, 1 row updated" · D "balance 130, 1 row updated". **Key:** C [X RUN-pg-claims]. **Why** A: one row matches, and only the first true CASE arm applies (dp:L7). B: the single matching row is updated once (—). C: the debit arm wins and 30 disappears; the two-UPDATE plan leaves 100. D: CASE takes the first true arm, not the last (dp:S1). **Surprise forecast:** yes.

Copy: "This is S2's self-transfer bug (SP-2.1) in SQL. Your S3 decision record already says what a self-transfer means; the compiler must say it before any SQL runs." With exact expectations, a CASE plan expects 2 rows, receives 1 and rolls back: the rowcount check would have caught it.

**Graded item.** GEN-find-the-witness template 1 (model), self-transfers included: on the learner's own plan (once LAB-6.2 exists) or a seeded mutant, find a command whose outcome class differs from the reference's, or answer "none" (a seeded sound share stops "always find one" from scoring).

**Exit items.** (1) GEN-call-it t4, fresh statements → KC-6.rowcount-as-guard, KC-6.null-guards. (2) GEN-find-the-witness t1, a fresh mutant → KC-6.rowcount-as-guard.
**Today.** Both exit families; a re-find of SP-6.7 at 7 days or more.
**Twin.** TigerBeetle's `create_transfers` results (docs.tigerbeetle.com/reference/requests/create_transfers/, read 2026-10-23; pin {{run:RUN-twin-pins}}) name every refusal, among them `accounts_must_be_different`, `debit_account_not_found` and `exceeds_credits`. Tracing question: "Map your typed outcomes to its results. Which of your zero-row causes can its interface not produce?"
**Sibling.** None. **Build this:** LAB-6.2, then LAB-6.3.

### S6.L3 · bridge · Differential testing: what it establishes

**Objective.** Predict from a generator's statistics alone whether a differential suite detects a planted bug, then stamp a passing run with its full qualifier.
**KC.** KC-6.differential-testing (threshold). **Prerequisites.** KC-6.rowcount-as-guard. **Instruments.** INS-lane-a, INS-pglite; oracle INS-interp (§14, issue 9). **Generators.** GEN-call-it, GEN-which-stamp. **Claim.** CL-6.1; plants SEAM-11. **Minutes.** 20–25.

**Prequestion** (k = 4, chance 1/4). Copy: "A suite ran n generated transfers through the interpreter and PostgreSQL 18.6 and found no divergence. Which stamp fits?" A "PROVED [P] · n runs · no divergence" · B "MODEL-CHECKED [M] · bound n · complete" · C "ENFORCED [E] · in PostgreSQL, at commit" · D "TESTED [T] · n · generator statistics". **Key:** D (spine §8.8). **Why** A: many passing runs are still runs (dp:Q7, dp:X1). B: no bounded space was explored exhaustively (dp:T5). C: nothing checks production at run time (—). D: the qualifier says how many commands and of what kind.

**Cell.** The reference harness: the default generator (accounts 1–3, `from ≠ to` drawn without replacement, amounts 1–200, balances 0–1,000 [D]) feeds the reference compiler on PGlite and INS-interp, against a planted CASE-compile mutant (SP-6.7).

**Call It** (k = 3, chance 1/3). Copy: "Before you run it: will this suite report a divergence from the CASE-compile mutant within its n commands?" A "yes, within a few hundred commands" · B "no: the suite passes" · C "the run cannot finish". **Key:** B, computed by the run at grade time {{run:RUN-drt-transfers}}. **Why** A: the generator never draws `from = to`, so the bug is unreachable however many commands run (dp:G8). B: the statistics panel shows a 0% self-transfer share; a test finds only what its generator reaches. C: nothing in the mutant stops execution (—). **Surprise forecast:** yes.

With a self-transfer quota (5% [D]) the first divergence appears, with its seed and both outcome classes. Copy: "Generator statistics are part of the stamp: every outcome class's share, the self-transfer share, the largest balance reached" (the last returns in S6.L4). Copy, on engines: "PGlite reports PostgreSQL 18.6. Agreement there and on the Bench is one semantics checked twice." [X RUN-pglite] (dp:Q15; common mode, G11). SEAM-11 is drawn dashed on CL-6.1's correspondence, "one database's agreement stands for the compiler", ASSUMED [A]; ER-11 cracks it in S9.L8.

**Graded item.** GEN-which-stamp template 2 (complete the qualifier) on a receipt excerpt (n, zero divergences, engines and versions, class shares): the learner completes `TESTED [T] · …`. Distractors: [P] (dp:X1); a qualifier without statistics (dp:G8); "1 instance" (wrong count); "two independent engines" (dp:Q15).
**Exit item.** GEN-call-it template 4: "the compiler is correct for every command" (false); "on these n commands the outcome classes matched" (true); "a class the generator never drew is untested" (true); "agreement on PGlite and on the Bench is independent evidence" (false); "comparing final balances alone would have caught the CHECK-only plan" (false).
**Today.** GEN-which-stamp t2 and GEN-call-it t4, plus an extra call in the first week (threshold KC); returns in S8.L6, S9.L2 and S9.L8.
**Twin.** Cedar's differential random testing (arXiv 2407.01688, §4, read 2026-10-23; cedar-spec pin {{run:RUN-twin-pins}}); §4.3 notes that full line coverage still sent many inputs only through error handling. Tracing question: "What does Cedar compare, and where would you read its generator's statistics?"
**Reading.** The same section. **Build this:** LAB-6.4.

### S6.L4 · bridge · Numbers: the step the database refuses

**Objective.** Show with one boundary command that the reference semantics commits a transfer PostgreSQL 18.6 refuses with 22003, forecast which segment of CL-2.1's strip cracks, and record one remedy with the artifact it changes.
**KC.** KC-6.overflow-refusal. **Prerequisites.** KC-1.encoding-is-the-claim, KC-6.rowcount-as-guard. **Instruments.** INS-pglite, INS-z3. **Generators.** GEN-call-it. **Specimen.** SP-6.4; cashes ER-1; surfaces D-30. **Minutes.** 20–25.

**Prequestion** (k = 4, chance 1/4). Copy: "Recall S1.L5's table of what 64 bits mean. Which row does PostgreSQL's `bigint` take when a credit would pass 9223372036854775807?" A "never overflows; it keeps counting, like ℤ" · B "raises 22003; the statement fails" · C "wraps, like Z3's signed BitVec 64" · D "saturates at the maximum, then commits". **Key:** B [X RUN-pg-claims, RUN-pglite]. **Why** A: `bigint` is 8 bytes with that maximum (§8.1.1, read 2026-10-23) (dp:Z4). B: "attempts to store values outside of the allowed range will result in an error" (§8.1.1); the recorded run raised 22003, "bigint out of range". C: BitVec 64 wraps [X RUN-z3-bv64]; PostgreSQL is a different row of the table (dp:Q6). D: the manual's rule is an error, not a clamp (—).

**Cells.** C1 (INS-pglite): credit 1 to an account holding 9223372036854775807: 22003, balance unchanged [X RUN-pg-claims, RUN-pglite]. C2 (INS-interp): the same Transfer under the pinned ℤ semantics commits. C3: `sum(bal)` over that account and one holding 5 is `numeric` 9223372036854775812 [X RUN-pg-claims]: the total fits although no balance could hold it.

**Call It** on the differential of C1 and C2 (k = 4, chance 1/4). Copy: "What outcome classes do the interpreter and PostgreSQL report?" A "both committed" · B "both refused" · C "interpreter refused (`Insufficient`); PostgreSQL committed" · D "interpreter committed; PostgreSQL error 22003". **Key:** D [X RUN-pg-claims; reference semantics]. **Why** A: the database cannot store the result (dp:Z4). B: the ℤ model has no bound, so nothing refuses on its side (dp:Q6). C: reverses the direction of the failure (dp:P1). D: the model takes a step the database refuses. **Surprise forecast:** no (S1.L5 foreshadowed it).

**ER-1**, forecast first (M-erosion-forecast). Copy: "Restate CL-2.1 from memory. Which segment of its strip cracks: the proposition of the model, the correspondence, or the requirement fit?" **Key:** correspondence. The model's conservation theorem is untouched; "allowed ⇒ succeeds" fails between model and database. CL-6.1 gains a defeater, because its statistics show the largest balance reached was far from the boundary. The step is refused, not wrapped, and it is not retryable like 40001.

**Remedies** (record one as a decision, LAB-3.7 style; each changes a different artifact):
1. *Bounded semantics.* The guard adds `bal(to) + amt ≤ 9223372036854775807`; the S2 and S3 lemmas are re-proved (a fitting Lean keep-alive session), and INS-z3 checks the bounded guard against an over-maximum credit, keyed at grade time. Changes the model.
2. *`Except Overflow`*, observable in R: S6.L8's square maps 22003 to `Err Overflow`, and both sides of the differential report "refused: overflow". Changes the outcome type and R.
3. *`numeric` with a stated bound* {{run:RUN-pg-numeric-bound}}: the database then raises on its declared bound, so the bound must still appear in the semantics or as [A]. Changes the schema.

**Graded item.** GEN-call-it template 1 (three-way verdict). Copy: "Under semantics V and this boundary command, does the square hold, fail because the model takes a step the database refuses, or fail because the database takes a step the model forbids?" V is drawn from ℤ, bounded and `Except Overflow`; the key is computed at grade time by INS-interp under V and by PGlite (dp:P1, dp:Q6).
**Exit item.** GEN-call-it t1, fresh variant, followed by a confusable-set F block (ℤ, BitVec 64, `Nat`, `bigint`, `numeric`; M-which-is-it).
**Today.** GEN-call-it t1. D-30 (Kani, deferred) surfaces in Today for the learner's Rust `i64` path, where `checked_add` returns `None` {{run:RUN-rust-i64}}; it unlocks nothing.
**Twin.** TigerBeetle's overflow results (`overflows_credits_posted` and siblings; same page and pin): overflow as a named refusal, remedies 1 and 2 shipped. Tracing question: "Which of your remedies does its interface match?"
**Build this:** add a boundary class to the LAB-6.4 generator and re-run; record the remedy; under remedy 2, LAB-6.3's error map gains `Overflow`.

### S6.L5 · bridge · Enforced at commit

**Objective.** Write a deferred reconciliation check whose predicate equals the S4 invariant it enforces, find the state on which a naive `<>` version passes vacuously, and stamp the corrected check ENFORCED [E] with where it runs.
**KC.** KC-6.enforce-at-commit. **Prerequisites.** KC-4.prove-or-enforce, KC-6.null-guards. **Instruments.** INS-pglite. **Generators.** GEN-find-the-witness. **Specimen.** SP-6.8. **Claim.** CL-6.4. **Minutes.** 20–25.

**Prequestion** (k = 4, chance 1/4). Copy: "`SELECT sum(amt) FROM postings WHERE acct = 3`, and account 3 has no postings. The result is:" A "0" · B "no row at all" · C "NULL" · D "an error". **Key:** C {{run:RUN-pg-sum-null}}. **Why** A: "sum of no rows returns null, not zero as one might expect" (§9.21, read 2026-10-23) (dp:Q9). B: without GROUP BY an aggregate returns one row (—). C: as quoted. D: an empty input is not an error (dp:Q10).

**Setting.** The compiled Transfer also writes two legs to `postings(cmd uuid, acct int, amt bigint NOT NULL)`, and `acct.bal` is a cached balance. Inv(D): each `bal` equals its postings' sum, and each command's postings sum to zero. Transfer's S4-style obligation is discharged per command; an agent-proposed "adjust balance" has no proof, so it is enforced at commit (KC-4.prove-or-enforce).

**Cell.** A constraint trigger on `acct`, `AFTER UPDATE … DEFERRABLE INITIALLY DEFERRED … FOR EACH ROW`, raising when `NEW.bal <> (SELECT sum(amt) FROM postings WHERE acct = NEW.id)`. Constraint triggers "must be AFTER ROW triggers" and can fire "at the end of the containing transaction" (CREATE TRIGGER, PostgreSQL 18, read 2026-10-23).

**Call It** (k = 4, chance 1/4). Copy: "An adjust command sets account 3's balance to 500 and writes no postings; account 3 never had any. At COMMIT the check:" A "passes, and 500 is minted" · B "raises; the transaction rolls back" · C "does not fire, because no posting was inserted" · D "raises 22003". **Key:** A {{run:RUN-pg-sum-null}}. **Why** A: the subquery is NULL, `500 <> NULL` is unknown, and an unknown IF condition does not raise. B: treats a missing sum as a mismatch (dp:Q9). C: the trigger sits on `acct`, which was updated (—). D: nothing overflows (—). **Surprise forecast:** yes.

**The fix and its meaning.** `NEW.bal IS DISTINCT FROM coalesce((SELECT sum(amt) …), 0)`, plus a per-command zero-sum test with `coalesce`. Copy: "A delta check is the inductive step run at commit: it checks only what this transaction changed, so it is sound only if the invariant held before" (KC-4.invariant-vs-inductive returns). CL-6.4 stamps both checks ENFORCED [E] · deferred constraint triggers on `acct` and `postings`, at commit {{run:RUN-pg-enforce-commit}}. A non-negativity check over rows other transactions write has S6.L6's check-then-write shape ([X RUN-pg-claims]), so it stays NOT COVERED [N] until SERIALIZABLE (S6.L6–S6.L7).

**Graded item.** GEN-find-the-witness template 1 (model): the seed draws a check from a pool (`<>`; `IS DISTINCT FROM`; with or without `coalesce`; `NOT (x = y)`; per-command zero-sum), and the learner gives a pre-state and a command for which the check passes and Inv(D′) fails, or "none" when the check is correct (seeded sound share). PGlite runs it; the reference evaluates Inv on D′.
**Exit item.** GEN-find-the-witness t1, fresh seed.
**Test-out card** (tablespace bridge; M-test-out, M-sibling-bridge). Copy: "Anomaly basics: read the one-page drawer, or show you know them." Three GEN-anomaly-id items (t1–t3), confirmed by one more after 7 days; a tablespace T4 completion counts. Passing skips S6.L6's opening recap; nothing locks. On the builder's path the card opens S6.L6 (§14, issue 10). Drawer D-11.
**Today.** GEN-find-the-witness t1. **Sibling.** tablespace T4 (concurrency) with prerequisite card D-11. **Reading.** §9.21's note and CREATE TRIGGER (read 2026-10-23). **Build this:** nothing new; the check joins the runtime's schema in LAB-6.8, whose receipt re-stamps CL-6.4 from the Bench.

### S6.L6 · core · Same transfer, three verdicts: the compilation pattern decides

**Objective.** For four compilations of a debit (read-modify-write, conditional UPDATE, predicate read then insert, opposite-order moves), predict the outcome under READ COMMITTED, REPEATABLE READ and SERIALIZABLE, confirm it on recorded PostgreSQL 18.6 histories, and classify unseen recorded histories by anomaly.
**KCs.** KC-6.compilation-pattern; KC-6.anomaly-isolation (threshold). **Prerequisites.** KC-6.rowcount-as-guard, KC-5.interleaving-granularity. **Instruments.** INS-history, INS-pglite. **Generators.** GEN-anomaly-id, GEN-call-it. **Specimens.** SP-6.2, SP-6.3, SP-6.5, SP-6.6. **Claim.** CL-6.2. **Minutes.** 2 + 15 + 15 + 12 + 6.

**Prequestions.**
PQ1 (k = 4, chance 1/4; KC-6.compilation-pattern). Copy: "Two sessions each withdraw 80 from a balance of 100 under READ COMMITTED. What decides whether 160 can be spent?" A "how each withdrawal is compiled" · B "the isolation level alone" · C "whether the sessions share a connection" · D "how far apart in time they run". **Key:** A [X RUN-pg-claims]. **Why** A: at one level, read-modify-write spends 160 and a conditional UPDATE loses nothing. B: same level, different results (dp:Q4). C: both runs use separate connections (dp:C1). D: the order of steps decides, at any speed (dp:Q11).
PQ2 (k = 4, chance 1/4; KC-6.anomaly-isolation). Copy: "Under REPEATABLE READ, two transactions each read 'available = 100' and insert a hold of 80. Can both commit?" A "no: one fails with 40001" · B "no: they deadlock" · C "only if the holds are on different accounts" · D "yes". **Key:** D [X RUN-pg-claims]. **Why** A: REPEATABLE READ aborts conflicting writes to one row; these inserts are different rows (dp:Q5). B: nobody waits on a lock (—). C: both holds were on account 1 (—). D: both committed, 160 held against 100.

**Segment 1 · Two withdrawals, two compilations** (15 min; KC-6.compilation-pattern)
Copy opener: "S5.L3 split a transfer into a read and a write and found 160 spent from 100 [X RUN-tlc-doublespend]; one atomic step removed it [X RUN-tlc-atomic]. SQL offers the same two shapes."
*Cells* (INS-history replays): read-modify-write at READ COMMITTED: B's UPDATE waits on A's row lock, then writes its constant; 160 spent, final balance 20 [X RUN-pg-claims]. Then the conditional UPDATE `… WHERE id = 1 AND bal >= 80`.
**Call It** on the conditional cell (k = 4, chance 1/4). Copy: "B's conditional UPDATE waits on A's row lock. A commits. B then:" A "fails with 40001: could not serialize access" · B "deadlocks with A; one of them aborts" · C "re-checks `bal >= 80` on the new row; 0 rows" · D "applies its debit to the value it first saw". **Key:** C [X RUN-pg-claims, RUN-pg-anomalies]. **Why** A: that is REPEATABLE READ's behavior (—). B: one lock, no cycle (—). C: "The search condition of the command (the WHERE clause) is re-evaluated to see if the updated version of the row still matches" (§13.2.1, read 2026-10-23); the 0 maps to `Insufficient`. D: the statement computes from the current row (dp:Q4). **Surprise forecast:** yes.
Copy: "Same level, two verdicts. The single statement is S5's atomic action; read-then-write is the split." Under REPEATABLE READ and SERIALIZABLE, B's conditional UPDATE fails with 40001 instead [X RUN-pg-claims], and a whole-command retry then updates 0 rows ({{run:RUN-pg-catalog}}, row H24): a stricter level needs S6.L7's retries.
**Graded item.** GEN-anomaly-id template 1 (read-modify-write family): a recorded history from the pool; options lost update · no anomaly · serialization failure (40001) · deadlock (40P01) · write skew · read skew (k = 6); key from INS-history at grade time.

**Segment 2 · The predicate nobody locks** (15 min; KC-6.anomaly-isolation)
*Cells*: holds check-then-insert (available = `bal − coalesce(sum(holds), 0)`, then a hold of 80) at the three levels [X RUN-pg-claims]; the team-sum variant (each reads the team total of 200 and debits 150 from a different account) at REPEATABLE READ and SERIALIZABLE [X RUN-pg-anomalies].
**Call It** at REPEATABLE READ (k = 4, chance 1/4). Copy: "A and B each read available = 100 and insert a hold of 80. Outcome?" A "A commits; B fails with 40001" · B "both commit: 160 held against 100" · C "B waits for A, then sees 20 available" · D "one fails with 40P01". **Key:** B [X RUN-pg-claims]. **Why** A: no row is written twice, so snapshot isolation sees no conflict (dp:Q5). B: each read a snapshot without the other's hold. C: row locks do not cover a predicate (dp:C2). D: nothing waits (—). **Surprise forecast:** yes.
At SERIALIZABLE, B fails at COMMIT with 40001, "could not serialize access due to read/write dependencies among transactions" [X RUN-pg-claims]; the team-sum variant ends at −100 under REPEATABLE READ and loses one transaction under SERIALIZABLE [X RUN-pg-anomalies]. Copy: "A read what B wrote, and B read what A wrote: a cycle of read-write dependencies on different rows, which snapshot isolation does not check." Hermitage's PostgreSQL rows agree, from tests on Postgres 9.3.5 (`postgres.md`, read 2026-10-23); the course re-records on 18.6.
**Graded item.** GEN-anomaly-id template 2 (write skew family).

**Segment 3 · Opposite directions** (12 min; KC-6.anomaly-isolation)
*Cells*: A moves 10 from 1 to 2 while B moves 10 from 2 to 1, debits first, interleaved after both debits, at READ COMMITTED [X RUN-pg-claims]; then both issuing statements in ascending account order ({{run:RUN-pg-catalog}}, row H22).
**Call It** (k = 4, chance 1/4). Copy: "Each holds its debit row and wants the other's. Outcome?" A "one fails with 40P01; the other commits" · B "both commit" · C "both fail with 40001" · D "both wait forever". **Key:** A [X RUN-pg-claims]. **Why** A: the deadlock detector aborts one (A, in the recorded run). B: each waits for a lock the other holds (dp:C1). C: 40001 reports a serialization conflict, not a lock cycle (—). D: lock cycles are detected (—). **Surprise forecast:** no.
Copy: "A deadlock costs availability, not money. Take locks in one order, and retry what remains."
**Graded item.** GEN-anomaly-id template 4 (serialization failure or deadlock).

**Wrap** (6 min). The verdict table; CL-6.2 minted, TESTED [T] · n histories {{run:RUN-pg-conditional-concurrent}}, with ASSUMED [A] "PostgreSQL 18.6 behaves as §13.2.1 documents" and NOT COVERED [N] "guards over several rows". SEAM-14 is planted on the SERIALIZABLE row, trusting that cure beyond the recorded histories; CL-6.3 carries it (§14, issue 1). ER-2's second remedy, isolation, links here.

| Compilation | READ COMMITTED | REPEATABLE READ | SERIALIZABLE |
|---|---|---|---|
| read-modify-write | both commit; 160 spent from 100 [X RUN-pg-claims] | B: 40001 [X RUN-pg-claims] | {{run:RUN-pg-catalog}} (H01) |
| conditional UPDATE `… AND bal >= $amt` | B waits, updates 0 rows [X RUN-pg-claims] | B: 40001 [X RUN-pg-claims] | B: 40001 [X RUN-pg-claims] |
| predicate read, then insert (holds) | both commit; 160 held [X RUN-pg-claims] | both commit [X RUN-pg-claims] | B: 40001 at COMMIT [X RUN-pg-claims] |
| opposite-order moves | one fails with 40P01 [X RUN-pg-claims] | {{run:RUN-pg-catalog}} | {{run:RUN-pg-catalog}} |

**Exit items.** (1) GEN-call-it template 3 (which anomaly) on a narrated history → KC-6.anomaly-isolation. (2) GEN-anomaly-id, template by seed → KC-6.compilation-pattern. Confusable set D then opens (M-which-is-it).
**Today.** Both families, extra calls for the threshold KC, re-finds of SP-6.2 and SP-6.3.
**Twin.** PostgreSQL's isolationtester specs on REL_18_STABLE (pin {{run:RUN-twin-pins}}): `eval-plan-qual.spec` tests the WHERE re-check; `simple-write-skew.spec` has no permutation lines, so all six interleavings run, four aborting under SERIALIZABLE {{run:RUN-isorun-upstream}}. Tracing question: "Which interleavings commit both, and why are they exactly the serial orders?"
**Sibling.** tablespace T4 with card D-11. **Build this:** LAB-6.5.

### S6.L7 · bridge · SERIALIZABLE and retries

**Objective.** Specify a retry classifier that re-runs whole commands on 40001 and 40P01, never on 22003 or a typed refusal, bounds and logs attempts by SQLSTATE; stamp "retries terminate" ASSUMED [A] with its reason.
**KC.** KC-6.serializable-retries. **Prerequisites.** KC-6.anomaly-isolation. **Instruments.** INS-history. **Generators.** GEN-anomaly-id; GEN-which-stamp (§14, issue 6). **Claim.** CL-6.5. **Minutes.** 15–25.

**Prequestion** (k = 4, chance 1/4). Copy: "B's hold insert failed at COMMIT with 40001. What should the runtime retry?" A "the COMMIT, where the failure was raised" · B "the whole command from BEGIN, deciding again" · C "the INSERT alone, keeping the earlier reads" · D "nothing: 40001 means the command is wrong". **Key:** B. **Why** A, C: B's decision rests on reads that are now stale; "It is important to retry the complete transaction, including all logic that decides which SQL to issue and/or which values to use" (§13.5, read 2026-10-23) (dp:Q12). B: as quoted. D: 40001 reports a conflict, not a bug (dp:Q12).

*Cell* (INS-history): S6.L6's SERIALIZABLE holds history with B retried from BEGIN.
**Call It** (k = 4, chance 1/4). Copy: "B retries the whole command. It now returns:" A "committed: a second hold of 80" · B "40001 again" · C "40P01" · D "refused by its own guard; nothing written". **Key:** D ({{run:RUN-pg-catalog}}, row H23). **Why** A: the retry reads again and sees 20 available (dp:Q12). B: A has committed, so the retry is not concurrent with it; Ports and Grittner's "safe retry" rule targets this case (PVLDB 5(12), 2012, §5.4, read 2026-10-23) (—). C: no lock cycle (—). D: 20 < 80, so the guard refuses: the retry produced the serial answer. **Surprise forecast:** no.

**Policy** (copy as a table). 40001 and 40P01: retry the whole command. 23505 and 23P01: only when transient, a [D] policy, as §13.5 warns they "might represent persistent error conditions rather than transient failures" (under SERIALIZABLE: {{run:RUN-pg-catalog}}, H12). 22003: never; the same input fails again. Typed refusals: never; they are outcomes. Attempts are bounded by k with jittered backoff [D]; then the runtime returns `GaveUp`, an outcome the semantics lacks, which S6.L8's R must place. Outputs leave only after COMMIT, since data read is not valid "until the transaction which read it has successfully committed" (§13.2.3); S8's outbox starts here.
**Termination.** "Transaction retry does not guarantee that the retried transaction will complete; multiple retries may be needed" (§13.5); safe retry promises only no repeat of "the same serialization failure". CL-6.5: ASSUMED [A] · why: contention assumed finite and below the budget; attempt logs support it on the runs they saw.
**Graded item.** GEN-anomaly-id template 4 on a recorded attempt log (SQLSTATE per attempt, from the pool): classify each failure and give the policy's action; keyed by the reference classifier at grade time.
**Exit item.** GEN-which-stamp template 1. Copy: "Attempt log over n commands: at most m attempts, below the budget, no `GaveUp`. Claim: retries terminate. Stamp?" **Key:** ASSUMED [A] · contention assumed finite. Distractors: [P] (dp:X1); [T] · n, which fits "terminated on these n runs", a different proposition (dp:G8); [M] (dp:T5).
**Today.** GEN-anomaly-id t4; GEN-which-stamp t1. **Sibling.** tablespace T4 (D-11). **Build this:** LAB-6.6.

### S6.L8 · core · The refinement relation R(S, D)

**Objective.** Write α and wf for the transfer schema; check the simulation square for each committed transaction of a sequential history; for recorded concurrent histories, give a serial order that reproduces every committed output, or answer "none".
**KCs.** KC-6.refinement-relation (threshold); KC-6.abstract-serializability. **Prerequisites.** KC-6.differential-testing, KC-3.step-invariant, KC-6.anomaly-isolation. **Instruments.** INS-history, INS-interp. **Generators.** GEN-anomaly-id, GEN-find-the-witness; GEN-call-it (exit). **Claim.** CL-6.3. **Minutes.** 2 + 15 + 15 + 12 + 6.

**Prequestions.**
PQ1 (k = 4, chance 1/4; KC-6.refinement-relation). Copy: "For a committed transaction D → D′, which question does Stage 6 ask?" A "is D′ equal to S′, row for row, after commit?" · B "did every statement report one row?" · C "is there a legal abstract step S → S′ with R(S′, D′)?" · D "does D′ satisfy every CHECK constraint?" **Key:** C (the roadmap's Stage 6). **Why** A: R relates states of different shape: rows, ids, NULLs, postings (dp:Q14). B: rowcounts feed the square; they are not the relation (—). C: the roadmap's question. D: constraints restrict D and say nothing about S (—).
PQ2 (k = 4, chance 1/4; KC-6.abstract-serializability). Copy: "Two SERIALIZABLE transactions committed, T2 first, then T1. Replay them through the reference semantics in:" A "commit order, since commits are serialized" · B "start order, since snapshots begin there" · C "both orders, which must agree" · D "any order reproducing every committed output". **Key:** D. **Why** A: two-phase locking makes commit order match the apparent serial order; under SSI it need not (Ports and Grittner 2012, §7.2, read 2026-10-23) (dp:Q13). B: no better (dp:Q13). C: one order suffices; the guarantee is the "same effect as if they were run one at a time" (§13.2.3) (—). D: that guarantee, checked.

*Worked example* (correct first, no blanks; fading family F6 waits for S9.L5):

```
α(D)    = { a ↦ D.acct[a].bal | a ∈ ids(D.acct) }
wf(D)   = every bal non-null and ≥ 0  (and reconciled with postings, S6.L5)
R(S, D) = wf(D) ∧ S = α(D)
square for each finished t running c, given R(S, D) and D →t D′:
  interp(c, S) = Ok(S′, out) ⇒ S′ = α(D′) and out = t's old/new pairs   (commit)
  interp(c, S) = Err e       ⇒ D′ = D and e = t's typed outcome          (refusal)
  t aborted (40001, 40P01) or GaveUp ⇒ D′ = D, no abstract step         (stutter)
```

The worked table takes three recorded transactions (a commit, a refusal, a 22003 credit) through the square: α(D), the interpreter's result, α(D′), the verdict. A state with a NULL balance has no S: wf fails, which is why S6.L2's `NOT NULL` keeps every reachable D inside R.

**Segment 1 · One square at a time** (15 min; KC-6.refinement-relation)
*Cell*: the three-transaction history through the square checker (INS-interp under the pinned ℤ semantics; INS-history).
**Call It** on transaction 3, the 22003 credit (k = 4, chance 1/4). Copy: "Which verdict does the square give?" A "holds: an abort matches a stutter" · B "fails: the model takes a step the database refused" · C "fails: the database took a step the model forbids" · D "skipped: aborted transactions are not checked". **Key:** B [X RUN-pg-claims; reference semantics]. **Why** A: under ℤ the model commits, so no abstract stutter exists to match (dp:P1). B: ER-1's direction. C: the database took no step (dp:P1). D: aborts are checked as stutters (dp:P1). **Surprise forecast:** no.
Copy: "Two directions. (i) Every committed database step has a legal abstract step with matching outputs: the roadmap's question, the implementation's safety. (ii) Every abstract step that commits has a database step that commits, up to retryable aborts: availability. Overflow breaks (ii); `GaveUp` breaks (ii) on purpose and says so."
**Graded item.** GEN-find-the-witness template 3 (history). Copy: "This R compares only totals [or ignores wf, or ignores refusals]. Give a sequential history it accepts and R rejects." The grader replays under both relations; no stored key (dp:Q14).

**Segment 2 · Some serial order** (15 min; KC-6.abstract-serializability)
*Cell*: the abstract-serializability checker over S6.L6's histories. It searches orders of up to 8 transactions [D], pruned by the write order that old/new values reveal and by reads-from; aborted attempts are stutters; every verdict prints its bound (I10).
**Call It** on the read-modify-write history (k = 4, chance 1/4). Copy: "A and B each read 100 and debited 80; both committed. Does a serial order reproduce both outputs?" A "yes: A first, then B, as committed" · B "yes: B first, then A" · C "cannot tell without commit timestamps" · D "no: either way the second debit is refused". **Key:** D (INS-history on the history of [X RUN-pg-claims]). **Why** A, B: whichever runs second meets a balance of 20 and is refused, yet both committed (dp:Q13). C: outputs decide, not clocks (dp:Q11). D: rejected, so the anomaly is present. **Surprise forecast:** no.
Copy: "Rejection shows an anomaly in this history. Acceptance shows only that this history had a serial explanation."
**Graded item.** GEN-find-the-witness template 3: "Give a serial order that reproduces every committed output, or answer 'none'." The grader replays the learner's order; on a wrong "none" it shows an order.

**Segment 3 · Commit order is not the serial order** (12 min; KC-6.abstract-serializability)
*Cell*: the report-before-transfer fixture at SERIALIZABLE {{run:RUN-serializability-fixtures}}: T1 reads accounts 1 and 2 and inserts a report row; T2 moves 50 from 1 to 2 and commits after T1's reads; T1 commits last. Expected: both commit, because one read-write dependency (T1 before T2) forms no cycle; the run decides.
**Call It** (k = 4, chance 1/4). Copy: "Replayed in commit order, T2 then T1, does the checker accept?" A "yes: commit order is the serial order" · B "no: the history has a lost update" · C "no: T1's report fits only an order with T1 first" · D "no: PostgreSQL must have aborted T1". **Key:** C (computed on the recorded fixture at grade time). **Why** A: T1 read before T2 wrote, so T1 serializes first though it committed last (dp:Q13). B: nothing was overwritten (—). C: T1 reported (100, 100); a replay after T2 gives (50, 150); the order T1, T2 reproduces it. D: one read-write dependency is not a dangerous structure (—). **Surprise forecast:** yes.
**Graded item.** GEN-anomaly-id template 3 (read-skew family), including SERIALIZABLE instances accepted only under an order that differs from commit order.

**Wrap.** CL-6.3, minted in LAB-6.7: TESTED [T] · n histories · search bound. For histories nobody checked it rests on SEAM-14 and SEAM-9, which S6.L9 writes out.
**Exit items.** (1) GEN-call-it template 1 (holds · fails (i) · fails (ii)) → KC-6.refinement-relation. (2) GEN-find-the-witness t3 → KC-6.abstract-serializability.
**Today.** Both families; extra calls for the threshold KC; returns at S9.L5 (set G) and in the S9 and S10 Defences.
**Twin.** Elle (github.com/jepsen-io/elle, pin {{run:RUN-twin-pins}}; PVLDB 14(3), 2020, §3 and §4.3, read 2026-10-23) infers an Adya-style dependency graph from client observations; any anomaly it reports is present in every history consistent with them. Tracing question: "Which of Elle's inference rules matches your pruning by old/new values?"
**Sibling.** byzantine's linearizability checker, the model for the serial-order search (D-21 optional). **Build this:** LAB-6.7.

### S6.L9 · bridge · Postgres semantics is an assumption

**Objective.** Complete CL-6.3's assumptions field from three histories, naming each ASSUMED clause and converting what can be converted to CONFIGURED [C] or ENFORCED [E].
**KC.** KC-6.db-as-assumption. **Prerequisites.** KC-6.serializable-retries. **Instruments.** INS-history. **Generators.** GEN-which-stamp, GEN-call-it. **Specimens.** SP-6.9, SP-6.10, SP-6.11; plants SEAM-9. **Minutes.** 15–25.

**Prequestion** (k = 4, chance 1/4). Copy: "Your checker accepted all n recorded SERIALIZABLE histories. What does that establish about production?" A "only that these n histories were serializable" · B "that production is serializable" · C "that PostgreSQL has no isolation bugs" · D "nothing about any history at all". **Key:** A. **Why** A: a [T] over n histories; production rests on [A] clauses. B: generalizes from tests (dp:X1, dp:G8). C: Jepsen found one in 2020 (dp:G8). D: checked histories are evidence about themselves (—).

*Cells* (INS-history): C1 read skew at READ COMMITTED: a reader totals 250 across a committed transfer where every committed state totals 200 {{run:RUN-pg-read-skew}} (SP-6.9). C2 mixed levels: the holds check-then-insert with A at SERIALIZABLE and B at READ COMMITTED {{run:RUN-pg-mixed-levels}} (SP-6.10). C3 a toy G2-item history in the shape of Jepsen's report, which the checker rejects {{run:RUN-history-g2item}} (SP-6.11).
**Call It** on C2 (k = 4, chance 1/4). Copy: "A runs SERIALIZABLE, B runs READ COMMITTED. Does SERIALIZABLE abort either?" A "yes: B fails with 40001" · B "yes: A fails with 40001" · C "no: both commit" · D "they deadlock". **Key:** C, as §13.2.3's scope predicts ("any set of successfully committed concurrent Serializable transactions"), recorded by {{run:RUN-pg-mixed-levels}}. **Why** A, B: the guarantee covers only the SERIALIZABLE transactions in the mix (—). C: it did not apply here. D: nothing waits (—). **Surprise forecast:** yes.

**The three clauses**, from the manual (§13.4.1, read 2026-10-23), each with its best available stamp:
1. "If the Serializable transaction isolation level is used for all writes and for all reads which need a consistent view of the data": CONFIGURED [C] by `default_transaction_isolation = serializable`, read back per session; ENFORCED [E] by a per-transaction level check (the manual suggests "checks of the transaction isolation level in triggers").
2. PostgreSQL behaves as documented: ASSUMED [A], tested nightly with `update-conflict-out.spec`, the regression test for the bug Jepsen found {{run:RUN-isorun-upstream}} (SEAM-14, held).
3. Nothing reads a replica: ASSUMED [A]. This protection "does not yet extend to hot standby mode … or logical replicas" (§13.4.1), and SERIALIZABLE "is not yet available in hot standby" (§26.4.5). SEAM-9 carries it; ER-9 cracks it in S7.L8.

**Dated incident.** PostgreSQL 12.3's SERIALIZABLE "exhibited G2-item under normal operation", confirmed in 9.5.22, 10.13, 11.8, 12.3 and 13 (Jepsen, 2020-06-12, §3.2, read 2026-10-23).
**Kernelspace strand** (light). The learner's kernelspace pool-conformance result, lockstep with a reference over one deterministic traffic script, is re-stamped TESTED [T] · n ticks · 1 script.
**Graded item.** GEN-which-stamp template 3 (which strip segment): place CL-6.3's evidence on proposition-of-model ([T] · n · bound), correspondence ([A] clauses, [C] read back) and requirement fit ([A], never [P]).
**Exit item.** GEN-call-it template 4: "mixed levels void the guarantee for the READ COMMITTED writer" (true); "Jepsen's 2020 bug makes 18.6's SERIALIZABLE unsafe" (false: fixed, its spec runs nightly); "a [T] over n histories says nothing about history n + 1" (true); "setting `default_transaction_isolation` proves every writer is SERIALIZABLE" (false: that is [C]); "a claim assuming no replica reads covers reports served from a standby" (false).
**Today.** GEN-which-stamp t3; GEN-call-it t4. **Twin.** Jepsen's analysis with `update-conflict-out.spec` (pin {{run:RUN-twin-pins}}); tracing question: "What did the regression test pin, and which line of your claim depends on it?" **Build this:** LAB-6.8, then LAB-6.9.

### 2.10 Call tally (GATE-items)

Fifteen authored calls and eleven single-answer prequestions. Key positions across the 26: A 6, B 6, C 7, D 7; option lengths are balanced for the length lint. Surprise forecast: 9 of 15 calls (60%), above the 30% floor; no verdict recurs. Every option carries a "why" and a tag, "—" where no catalog entry fits.

---

## 3. LAB-6 · pg-refinement; capstone S10.L4

**The template supplies** `statespace isorun`, the catalog specs with their recorded `.out` files (hashed), the abstract-serializability checker (INS-history in the tab, a crate on the Bench), INS-interp, the `IR@1` types, the Rust `Plan` and `Outcome` types, the LAB-6.6 attempt-log fixtures, the LAB-6.7 fixture manifest and the mutation operators. **The learner writes** the schema, `compile(IR) -> Plan`, the typed-error map, the generator and comparison, isolationtester-format specs, the retry classifier and loop, `alpha`, `wf` and R, the runtime and the claim cards.

**No Lean challenge pack.** LAB-6 has no Lean proof stage, so it has no `Challenge` module and no `comparator.json`. Statements are pinned instead (I7): `claims/refinement.yaml` (α, wf, the square's outcome table, the search bound), `claims/schema.sql`, the catalog specs and the fixture manifest, all hashed on receipts; a changed hash voids the dependent claim to [?]. A Lean statement of the square over the reference `State` is optional keep-alive material, never a check.

| Stage | Title | Min | Lane | Check: exact pass condition |
|---|---|---|---|---|
| LAB-6.1 | `statespace doctor`, then `isorun` replays the provided read-modify-write history | 2 | B | LAB-6.c1: server version begins "PostgreSQL 18.6"; B blocked, then committed; final balance 20; 160 spent from 100, as recorded [X RUN-pg-claims] |
| LAB-6.2 | Compiler: Transfer → Plan with exact expectations, on PGlite | 25 | A | LAB-6.c2: on a grade-time sample (n ≥ 200 [D]; at least 10% guard refusals, 5% missing `from`, 5% missing `to` [D]), every outcome class on PGlite equals INS-interp's and every committed command has α(D′) = S′; the first divergence prints its seed |
| LAB-6.3 | Typed errors; the self-transfer decision in SQL | 25 | A | LAB-6.c3: (i) fresh self-transfers return the LAB-3.7 decision's outcome and leave α(D) unchanged; (ii) `Insufficient`, `NoSuchAccount(from)` and `NoSuchAccount(to)` are distinct on fresh seeds; (iii) the course's case-merge mutation of the learner's plan (SP-6.7) fails on a fresh self-transfer seed, because the declared expectations reject the merged statement's single row |
| LAB-6.4 | Differential harness: your generator, classes and statistics | 25 | A, B | LAB-6.c4: the suite runs on PostgreSQL 18.6 on the Bench and on PGlite in the tab; the receipt names both engines and versions, n and the statistics (share per outcome class, self-transfer share, largest balance); with the learner's own generator and comparison it kills the three course mutants (CHECK-only guard, unchecked credit, case-merge) |
| LAB-6.5 | Specs for the lost update, write skew, 40P01 and the conditional twin, run with `isorun` | 25 | B | LAB-6.c5: every permutation of each learner spec, at the stated level, yields the commit, abort and SQLSTATE classes of the matching catalog row's recorded `.out` ([X RUN-pg-claims] rows; {{run:RUN-pg-catalog}} for the rest); spec hashes on the receipt |
| LAB-6.6 | Retry policy for 40001 and 40P01 with attempt logs | 25 | A, B | LAB-6.c6: on the attempt fixtures the classifier re-runs the command from BEGIN on 40001 and 40P01, never retries 22003 or a typed refusal, retries 23505 or 23P01 only if the declared policy marks them transient, and stops at its declared k with `GaveUp`; the Bench log records each attempt's SQLSTATE |
| LAB-6.7 | Your R(S, D) with the abstract-serializability check | 25 | A | LAB-6.c7: with the learner's α and wf, the checker classifies every fixture in the pinned manifest as the reference does (accept or reject; for accepts, an order the replay confirms) and rejects the two R-mutant fixtures |
| LAB-6.8 | Capstone S10.L4: a transaction runtime wired to your compiler | 25 | B | LAB-6.c8: on PostgreSQL 18.6 the LAB-6.4 suite passes through the runtime with no outcome-class divergence; every session reads back `serializable` ([C]); an `isorun`-driven concurrent run of compiled commands yields histories the LAB-6.7 checker accepts; attempts logged by SQLSTATE; the S6.L5 check is in the schema |
| LAB-6.9 | Claim cards and their [A] clauses (write stage) | 15 | — | LAB-6.c9: CL-6.1–CL-6.5 pass claim@1 validation: six fields, an "if weakened" witness that refutes the card's own proposition, matching statement hashes |

**Fixture manifest** (LAB-6.7; reference classifications {{run:RUN-serializability-fixtures}}): read-modify-write at READ COMMITTED (reject); conditional UPDATE at READ COMMITTED (accept); conditional UPDATE at SERIALIZABLE with 40001 and a retry (accept); holds at REPEATABLE READ (reject); holds at SERIALIZABLE with a retry (accept); opposite-order moves with 40P01 and a retry (accept); read skew at READ COMMITTED (reject); report-before-transfer at SERIALIZABLE (accept, order ≠ commit order); a 22003 history (accept only under remedy 2; under ℤ, reject in direction (ii)); mixed levels (reject); the toy G2-item history (reject); R-mutant fixtures: a NULL balance outside wf, and equal totals with money on the wrong account.

**Receipt** (receipt@1). `pg`: server version, isolation level read back per session, history hash, SQLSTATE classes with counts, attempts by SQLSTATE. `runs[]`: `isorun` argv, spec and input hashes. `tools[]`: PostgreSQL image digest, PGlite version, rustc and the devcontainer pins of `tokio-postgres`, `testcontainers` and `proptest` {{run:RUN-scaffold}}. `statements[]`: the pinned files above. `checks[]`; `claims[]`: CL-6.1–CL-6.5; `tcb[]`: PostgreSQL 18.6, PGlite, `isorun`, the checker, INS-interp, the learner's R.

**Hint ladder** (M-hint-ladder). The explanation gate on every check: state the failing check, the property it protects and your hypothesis. R0 on every check: write a teach-back, reveal three authored ideas, tick those covered (self-assessment, never credit). Past R2, work is credited as assisted until an unseen variant passes. After R4 and two more red runs: a walkthrough to the first divergence, then re-implementation after at least 24 hours.

| Check | R1 concept | R2 where to look | R3 fragment (≤ 3 lines) | R4 design in prose |
|---|---|---|---|---|
| c1 | a history is an order of steps, not a clock | the receipt's `pg` block | `statespace doctor`, then `statespace isorun <spec>` | check the image pin, then the interleaving |
| c2 | 0 rows is an outcome four causes share | the first divergence; s2's expectation | `if rows(s2) != 1 { rollback; Err(NoSuchAccount(to)) }` | every statement expects exactly one row; classify zeros inside the transaction |
| c3 | one row can play both roles | your LAB-3.7 decision record | `if from == to { return decision() }` | decide before SQL; exact expectations make a merged statement fail loudly |
| c4 | a test reaches only what its generator draws | the statistics panel; the mutant you missed | `quota(SelfTransfer, 0.05); quota(MissingTo, 0.05)` | compare outcome classes, not balances; report shares per class |
| c5 | a spec fixes interleavings; blocking is detected | the permutation that differs | `permutation "r1" "r2" "w1" "c1" "w2" "c2"` | one session per transaction; let `isorun` enumerate |
| c6 | retry the decision, not the statement | the attempt you retried wrongly | `match code { "40001" \| "40P01" => retry_whole(), _ => stop }` | classify, bound, back off, log; 22003 and refusals are final |
| c7 | some serial order, not the commit order | the fixture you misclassify | `wf(d) && alpha(d) == s` | R = wf ∧ S = α(D); outputs include old/new pairs |
| c8 | runtime = compiler + isolation + retries | the session's read-back level | `SHOW transaction_isolation` must read `serializable` | one connection per session; assert the level per transaction |
| c9 | the "if weakened" witness refutes your own card | the claim@1 message | — | write the proposition first, then what no receipt can show |

**Prove-it** (M-prove-it; `statespace defend`; agent closed; predict, then the checker grades), on the learner's own artifacts (GEN-defend template in brackets):
1. *rmw-compile* [t4, split the atomic action]: the debit becomes SELECT plus UPDATE-to-constant. Key: at READ COMMITTED the H01 permutation commits both and the checker rejects it; at SERIALIZABLE B gets 40001. Graded on `isorun` histories on PostgreSQL 18.6.
2. *drop-credit-check* [t1]: commands with a missing `to` commit the debit; classes diverge. Lane A.
3. *retry-40001-only* [t2]: the opposite-order fixture surfaces 40P01 as a failure outcome. Attempt fixtures.
4. *rc-pool* [t3]: sessions default to READ COMMITTED; the holds spec commits both and the checker rejects. `isorun`.
5. *strict-guard* [t2]: `bal > $amt` refuses a debit equal to the balance. Lane A.
6. *r-totals-only* [t4, observer narrowed]: the wrong-account fixture is accepted. Fixture manifest.
Every mutant builds, or its key says it does not (GATE-labs).

**Lanes.** Lane A (*re-checked here*, seeds drawn at grade time): LAB-6.2, LAB-6.3, the tab half of LAB-6.4, the LAB-6.6 classifier, LAB-6.7. Lane B (*reported from your machine*, imported receipts): LAB-6.1, the Bench half of LAB-6.4, LAB-6.5, the LAB-6.6 loop, LAB-6.8. Disagreements between halves are triaged as spec, implementation or tool errors. **Builder's path:** LAB-6.1, LAB-6.5 and LAB-6.6 early (LAB-6.6 wraps the reference compiler, "reference module, earns nothing"); the rest later.

**Clearinghouse plug-in** (W4-T14, after LAB-6.3): the learner's compiler runs on PGlite inside the world. S6 incidents are mutation-generated agent proposals, sound in a seeded 30–60% share, keyed by the reference pipeline on the world's traffic; the learner's compiler drives only the personal part. Example proposals: "compile Transfer as one CASE statement to save a round trip" (flawed, SP-6.7); "drop the guard, the CHECK covers it" (flawed, AUD-6.2's shape); "retry 22003 too" (flawed); "set the pool to READ COMMITTED for throughput" (flawed, AUD-6.3's shape); "issue debit and credit in ascending account order" (sound); "log `RETURNING old.bal, new.bal`" (sound).

---

## 4. Specimens

Each moves from "mounted" to "kept" after a re-find on a fresh variant at 7 days or more (M-specimen-cabinet). SP-6.11 is the stage's dated incident, re-run in CI.

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-6.1 | NULL inserted under `CHECK (bal >= 0)`; `WHERE bal >= 10` over {NULL, 50} updates row 2 only; a NULL amount updates nothing | "bad balances are impossible; a refused debit is visible" | CHECK passes on NULL (§5.5.1); WHERE keeps true rows only | yes, one row | `NOT NULL CHECK (bal >= 0)`; typed `Amount`; exact expectations | [X RUN-pg-anomalies, RUN-pg-claims, RUN-pglite] |
| SP-6.2 | read-modify-write at READ COMMITTED: both read 100, both write 20, both commit | serial semantics: the second debit is refused | the write is a constant from a stale read; the re-check sees only `id = 1` | yes, 2 transactions | SP-6.6's compile; or REPEATABLE READ or SERIALIZABLE (B: 40001) plus retry | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.3 | holds: 160 held against 100 at READ COMMITTED and REPEATABLE READ; team sum: −100 at REPEATABLE READ | the multi-row invariant | a read-write cycle on different rows (G2-item); snapshot isolation checks same-row writes only | yes, 2 transactions | SERIALIZABLE (B: 40001) plus whole-command retry | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.4 | credit 1 at 9223372036854775807: ℤ commits; PostgreSQL raises 22003; balance unchanged | direction (ii): allowed ⇒ succeeds | `bigint` errors outside its range (§8.1.1); ℤ is unbounded (SEAM-1) | yes, one credit | bounded semantics; `Except Overflow`; bounded `numeric` | [X RUN-pg-anomalies, RUN-pg-claims, RUN-pglite] |
| SP-6.5 | opposite-order moves: one fails with 40P01 | availability, not safety | opposite lock orders form a cycle | yes, 2 × 2 statements | ascending lock order (H22, {{run:RUN-pg-catalog}}); retry | [X RUN-pg-claims] |
| SP-6.6 | sound twin: B's conditional UPDATE waits, re-evaluates, updates 0 rows; final 20 | nothing | §13.2.1's re-check; 0 maps to `Insufficient` | — | — | [X RUN-pg-anomalies, RUN-pg-claims] |
| SP-6.7 | self-transfer of 30 as one CASE UPDATE: 1 row, 100 → 70; two UPDATEs keep 100 | conservation | first true arm only; the compile assumed `from ≠ to` (SP-2.1 in SQL) | yes, one row | the LAB-3.7 decision before SQL; exact expectations | [X RUN-pg-claims] |
| SP-6.8 | adjust sets a never-posted account to 500; the `<>` check passes | Inv: balance = sum of postings | `sum` of no rows is NULL (§9.21); an unknown IF does not raise | yes | `IS DISTINCT FROM coalesce(sum, 0)` | {{run:RUN-pg-sum-null}} |
| SP-6.9 | a READ COMMITTED reader totals 250 where every committed state totals 200 | observations correspond to reachable states | a new snapshot per statement | yes | one snapshot, or one statement | {{run:RUN-pg-read-skew}} |
| SP-6.10 | holds pair with A SERIALIZABLE, B READ COMMITTED: both commit (expected) | the unqualified "SERIALIZABLE prevents write skew" | the guarantee covers committed SERIALIZABLE transactions only (§13.2.3) | yes | `default_transaction_isolation` [C] plus a per-transaction check [E] | {{run:RUN-pg-mixed-levels}} |
| SP-6.11 | toy history shaped like Jepsen's G2-item: no serial order | SERIALIZABLE, in affected versions | a conflict-detection bug fixed in 2020 (Jepsen §3.2) | yes, toy | 18.6 with `update-conflict-out.spec` nightly (SEAM-14) | {{run:RUN-history-g2item}}, {{run:RUN-isorun-upstream}} |

## 5. Claim templates

Six fields (proposition; assumptions; model; method; correspondence; counterexample when weakened), a requirement row, a stamp and the strip proposition-of-model · correspondence · requirement fit. Requirement fit is never [P]. Cards fade: method, tool and version are prefilled from receipts; proposition, assumptions and "if weakened" are learner-written.

**CL-6.1 · Compiled transfers match the interpreter on outcome classes** (S6.L3, LAB-6.4). *Proposition:* on every command of the run's n seeds, the plan's outcome class on each named engine equals the reference's, and committed commands give α(D′) = S′. *Assumptions:* [A] SEAM-11; the reported class shares; the oracle (INS-interp, SEAM-13 held). *Model:* the reference semantics; `claims/schema.sql`. *Method:* differential testing of outcome classes. *Correspondence:* the compiler at the receipt's wasm hash; PostgreSQL 18.6 and PGlite reporting 18.6, one server code base. *If weakened:* compare balances only and the CHECK-only plan passes (AUD-6.2); drop the self-transfer quota and the case-merge plan passes. *Requirement:* "a compiled command does what the command means", [A]. *Stamp:* TESTED [T] · n · generator statistics · engines. *Strip:* [T] · [A] · [A]; ER-1 adds a defeater until a boundary class is drawn. {{run:RUN-drt-transfers}}

**CL-6.2 · The conditional-UPDATE compilation never overspends under concurrent READ COMMITTED** (S6.L6; the learner's card from LAB-6.5). *Proposition:* in every recorded history of two concurrent conditional debits (all permutations over the amount grid), the final balance is non-negative, committed debits total at most the initial balance, and each refusal returned 0 rows mapped to `Insufficient`. *Assumptions:* [A] PostgreSQL 18.6 behaves as §13.2.1 documents (SEAM-9's documented-behavior clause); [A] every writer of `acct.bal` uses this compile; [N] multi-row guards. *Model:* two-session `isorun` histories. *Method:* permutation enumeration. *Correspondence:* the hashed statement text. *If weakened:* compile as read-modify-write and SP-6.2 spends 160 from 100. *Stamp:* TESTED [T] · n histories, permutations complete, plus [A]. *Strip:* [T] · [A] · [A]. {{run:RUN-pg-conditional-concurrent}}

**CL-6.3 · R(S, D) holds on every checked history** (S6.L8, LAB-6.7). *Proposition:* for each history in the pinned manifest, some serial order of its committed transactions, replayed from α(D₀), reproduces every committed output and ends at α(D_final); aborts and `GaveUp` are stutters. *Assumptions* (written in S6.L9): [C] sessions read back `serializable`; [E] the runtime's per-transaction level check; [A] documented behavior and SERIALIZABLE's guarantee (SEAM-14, held); [A] no replica reads (SEAM-9). *Model:* recorded histories with outputs and initial and final states. *Method:* bounded serial-order search, at most 8 transactions [D], pruned by observed dependencies. *Correspondence:* the learner's α, wf and R at the receipt's hash. *If weakened:* replay in commit order and the report-before-transfer fixture is falsely rejected; compare totals and the wrong-account fixture is falsely accepted. *Stamp:* TESTED [T] · n histories · search bound. *Strip:* [T] · [A] with [C] · [A]. {{run:RUN-serializability-fixtures}}

**CL-6.4 · Postings conserve at commit** (S6.L5; re-stamped from LAB-6.8). *Proposition:* no transaction commits unless each command's postings sum to zero and each touched balance equals its postings' sum. *Assumptions:* [C] the trigger is present, enabled and `DEFERRABLE INITIALLY DEFERRED`, read back from the catalog; [A] nothing disables triggers; [A] the invariant held before the first checked transaction (the delta check's base case). *Model:* the S4 invariant over `acct` and `postings`. *Method:* deferred constraint triggers. *Correspondence:* their predicate is the S4 invariant, written null-safe. *If weakened:* use `<>` and SP-6.8 mints 500. *Stamp:* ENFORCED [E] · deferred constraint triggers on `acct` and `postings`, at commit. *Strip:* [E] · [C] · [A]. {{run:RUN-pg-enforce-commit}}

**CL-6.5 · Retries terminate** (S6.L7). *Proposition:* every submitted command eventually commits or is refused by its guard without exhausting its retry budget (§14, issue 8). *Assumptions:* [A] contention is finite and below the budget; [A] no conflicting prepared transaction blocks progress (§13.5). *Model:* the runtime's retry loop. *Method:* none establishes it; attempt logs support it. *Correspondence:* the classifier and k at the receipt's hash. *If weakened:* sustained conflicting traffic on one account yields `GaveUp`, which R maps to a stutter and the report shows as unavailability. *Stamp:* ASSUMED [A] · why: contention assumed finite. *Strip:* [A] · [A] · [A]. Assumed by design.

## 6. Seams and erosions

| Item | Endpoint 1: planted | Endpoint 2: cashed | Segment | Remedy cards | Ships |
|---|---|---|---|---|---|
| ER-1 · SEAM-1 | S1.L3, S1.L4 (CL-1.1, CL-1.2); carried by CL-2.1–CL-2.4 | S6.L4 · SP-6.4 | correspondence; CL-6.1 gains a defeater; conservation untouched | bounded semantics; `Except Overflow`; bounded `numeric`; D-30 | W4-T12 |
| SEAM-11 | S6.L3 · CL-6.1 | S9.L8 · SP-9.4 (ER-11) | correspondence | per-command validation; provers or refutation | W5 |
| SEAM-9 | S6.L9 · CL-6.2 (documented-behavior clause), CL-6.3 | S7.L8 · SP-7.6 (ER-9) | assumption record | read-your-writes routing or tokens, as [A] or [E] | W4 |
| SEAM-14 (held) | S6.L6 · carried by CL-6.3 (§14, issue 1) | never cracks | — | — | tested nightly by GATE-specimens with `update-conflict-out.spec` |

ER-1's forecast item and remedy cards are in S6.L4 (GATE-erosions). On the builder's path S6.L4 runs after S2, so both endpoints exist; S7.L8 precedes S6.L9, so CL-6.3 mints with SEAM-9 already cracked and the forecast asks which segment the crack hits.

## 7. Audit anchors

**AUD-6.1 · G11** (GEN-spot-the-gap t2). Sound twin: CL-6.1 stamped [T] · n · statistics · engines, SEAM-11 listed. Flawed variant: the same receipt under "PROVED [P]: compiled transfers are correct (n runs, no divergence)". Evidence: the stamp line set against the method line. Generated variants: "PGlite and PostgreSQL agree, so independently confirmed" (evidence: two version strings both reading 18.6); "n runs on one database stamped for every database". Based on: Narasayya and Chaudhuri, CIDR 2026, §1 and §4.2: about 32% of LLM-generated rewrites returned different results on the given database, and even matching ones stayed "candidates" until an equivalence check (https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf, read 2026-10-23). Keys: {{run:RUN-drt-transfers}}.

**AUD-6.2 · G10** (t3). Sound: the harness compares outcome classes (committed with α(D′) = S′; typed refusal; SQLSTATE class). Flawed: it compares final balances. Evidence: two runs equal on balances and different in class, the CHECK-only plan's overdraft (`Insufficient` against 23514). Variants: `NoSuchAccount` and `Insufficient` merged; old/new pairs ignored. Based on: Disselkoen et al., "How We Built Cedar" (https://arxiv.org/abs/2407.01688, 2024-07-01): proofs found 4 bugs, differential random testing and property-based testing 21 more; §4.3 on coverage that exercises only error handling (read 2026-10-23). Keys: {{run:RUN-drt-transfers}}, {{run:RUN-pg-sql-semantics}}.

**AUD-6.3 · G6e** (t2). Sound: CL-6.3 on PostgreSQL 18.6, version read back, the upstream `update-conflict-out.spec` passing nightly. Flawed: the same claim resting on SERIALIZABLE in an affected version (12.3). Evidence: the version string read back, plus the history the checker rejects (SP-6.11). Proposed G8 variant (§14, issue 3): the claim says SERIALIZABLE while the pool sets READ COMMITTED; evidence: `SHOW transaction_isolation` read back, plus the holds history with no serial order. Based on: Jepsen, "PostgreSQL 12.3" (2020-06-12), §3.2, G2-item under SERIALIZABLE in 9.5.22, 10.13, 11.8, 12.3 and 13 (https://jepsen.io/analyses/postgresql-12.3, read 2026-10-23). Keys: {{run:RUN-history-g2item}}, {{run:RUN-isorun-upstream}}.

Cases follow LAB-6, are re-checked a week later, appear as Clearinghouse incidents, and reach Today at 0–1 per session.

## 8. The Defence (S6)

Untimed, at least two sessions within a week of LAB-6 (spine §8.6).
- **Part A** (12 unseen probes, agent closed, a call on each, about 35 min): GEN-anomaly-id ×3 (t1, t2, t4); GEN-call-it ×3 (t4 "what differential tests establish and what they cannot", t1 square verdict, t3 which anomaly); GEN-which-stamp ×3 (t1–t3); GEN-find-the-witness ×3 (t1 a NULL or zero-row witness, t1 an overflow boundary, t3 a serial order or "none"). The four SQL mismatches (NULL, bags, numeric overflow, serialization failures) each appear at least once; each threshold KC at least twice.
- **Part B** (about 20 min): rmw-compile, drop-credit-check, retry-40001-only and rc-pool on the learner's own artifacts, predicted first, graded on recorded PostgreSQL 18.6 histories and Lane A runs.
- **Part C** (about 20 min): four cases from AUD-6.1–AUD-6.3 and their variants, at least one sound, the sound share seeded at 30–60%, typed evidence.
- **Part D** (about 10 min, required, uncredited): two minutes on R(S, D) and what one simulation step checks; a 3-idea self-check (the two directions; aborts as stutters; some serial order rather than commit order) compared with Part A.

## 9. Drawers, siblings, twins

Drawers: D-11 (S6.L5–S6.L7), D-14 (LAB-6), D-15 (LAB-6.1), D-23 (S6.L2, builder's path), D-30 (deferred, surfaced at ER-1). Siblings: tablespace T4 (S6.L5–S6.L7), byzantine's checker (S6.L8), the kernelspace strand (S6.L9). Twins, pinned in {{run:RUN-twin-pins}} (60-day TTL), are named in each lesson.

## 10. Reading list

1. **Core, before S6.L6.** PostgreSQL 18, Chapter 13: §13.2 "Transaction Isolation" (13.2.1–13.2.3; `docs/18/transaction-iso.html`), §13.4.1 "Enforcing Consistency with Serializable Transactions" with its replication warning (`applevel-consistency.html`), §13.5 "Serialization Failure Handling" (`mvcc-serialization-failure-handling.html`), all at https://www.postgresql.org, read 2026-10-23. The roadmap links `/docs/current/`; the course pins `/docs/18/`, because `current` moves at PostgreSQL 19's GA (BRIEF §2.5).
2. **By lesson.** PostgreSQL 18 §5.5.1 (S6.L1), §6.4 (S6.L2), §8.1.1 (S6.L4), §9.21's null note and CREATE TRIGGER (S6.L5), §26.4.5 "Caveats" (S6.L9), read 2026-10-23.
3. Hermitage (Kleppmann, 2014, CC BY 4.0; https://github.com/ept/hermitage): README summary table; `postgres.md` sections "Lost Update (P4)", "Read Skew (G-single)", "Write Skew (G2-item)", run on Postgres 9.3.5 (read 2026-10-23).
4. Jepsen, "PostgreSQL 12.3" (2020-06-12; https://jepsen.io/analyses/postgresql-12.3): §3.1, §3.2, §4.1 (read 2026-10-23).
5. Disselkoen et al., "How We Built Cedar" (2024; https://arxiv.org/abs/2407.01688): §4 (read 2026-10-23).
6. **Optional.** Ports and Grittner, PVLDB 5(12), 2012: §2.1.1 "Simple Write Skew", §5.4 "Resolving Conflicts: Safe Retry", §7.2 "Streaming Replication". Kingsbury and Alvaro, "Elle", PVLDB 14(3), 2020: §2 "The Adya Formalism", §3 "Deducing Dependencies". Narasayya and Chaudhuri, CIDR 2026: §1, §4.2. All read 2026-10-23. PostgreSQL's `src/test/isolation/README` on REL_18_STABLE (read 2026-10-21, via R4).

## 11. Runs this stage needs

Executed: RUN-pg-anomalies, RUN-pg-claims, RUN-pglite; callbacks RUN-tlc-doublespend, RUN-tlc-atomic, RUN-z3-bv64. To record:

| Run | Records | Task |
|---|---|---|
| RUN-pglite-0511 | the 0.5.11 pin | W0-S08 |
| RUN-pg-catalog | unrun rows; every permutation over the parameter grid (the GEN-anomaly-id pool); H22–H24; S6.L6's open cells | W0-S09 |
| RUN-isorun-upstream | `isorun` on upstream specs: simple-write-skew's six permutations with four aborts; `update-conflict-out` passing | W4-T01 |
| RUN-drt-transfers | reference differential on 18.6 and PGlite (n, statistics); the three mutants' first divergences; the default generator missing the case-merge mutant | W4-T10 |
| RUN-pg-conditional-concurrent | every permutation of two conditional debits over the amount grid at READ COMMITTED | W4-T10 |
| RUN-serializability-fixtures | the LAB-6.7 manifest with reference classifications and orders | W4-T10 |
| RUN-pg-sum-null, RUN-pg-enforce-commit | SP-6.8; the fixed trigger rolling back the mint and a one-legged command | W4-T10 |
| RUN-pg-read-skew, RUN-pg-mixed-levels, RUN-history-g2item | SP-6.9, SP-6.10, SP-6.11 | W4-T10 |
| RUN-pg-sql-semantics (proposed) | single-session cells on 18.6 and PGlite (bags, `count`, `NOT IN`, `UNION`, the partition, 23514, `RETURNING old/new`) | W4-T10 |
| RUN-pg-numeric-bound, RUN-rust-i64 | remedy 3; the D-30 card | W1-T12 |
| RUN-scaffold, RUN-twin-pins | crate pins; twin SHAs | W0-S12; W4 |

## 12. Catalog rows this stage adds (proposed, isolationtester format)

H22: opposite-order moves issuing statements in ascending account order (expected: both commit). H23: SERIALIZABLE holds, B retried from BEGIN after 40001 (expected: B's guard refuses; nothing written). H24: conditional UPDATE at REPEATABLE READ and SERIALIZABLE, B's 40001 followed by a whole-command retry (expected: 0 rows). Every "expected" is replaced by its recorded outcome before copy ships.

## 13. Time budget

| Component | Plan [D] | Basis |
|---|---|---|
| Reading | 1.5–2.5 h | §10 items 1–5 |
| Lessons | 3.5–5.5 h | 3 core × 40–60 min; 6 bridge × 15–25 min |
| Build | 3.0–5.9 h | LAB-6.1–6.8: 177 nominal minutes, up to 2× |
| Write | 0.25–0.5 h | LAB-6.9 |
| Defence | 1.0–1.5 h | §8 |
| **Total** | **9.2–15.9 h** | 1.9–3.3 weeks at 6 h/week; 1.1–1.9 at 10 h/week |

This matches spine §3.11 and passes GATE-budget against the roadmap's 4–8 weeks (19–38 h at 4.75 h/week): under 38 h, above the 9.5 h warning line. It sits wholly below the roadmap's lower bound, the spine's largest estimating risk; Docker and lock-wait debugging are the likely overruns, absorbed by the 2× multiplier and the stuck protocol. Keep load: 12 KCs × about 10 reviews × about 2 minutes ≈ 4 h over their first 60 days [D]. Claim cadence: five claims and eleven specimens in two to three weeks.

## 14. Spine issues

- **Issue 1.** SEAM-14 (SERIALIZABLE's guarantee) is listed as carried by CL-6.2, a READ COMMITTED claim that never relies on it. This spec plants it in S6.L6 and carries it on CL-6.3; amend §5.3.
- **Issue 2.** SEAM-9 bundles three clauses, and CL-6.2 rests only on "PostgreSQL behaves as documented". Record carriers per clause, so ER-9 (a replica read) cracks CL-6.3 and leaves CL-6.2 intact.
- **Issue 3.** AUD-6.3's second flawed variant (a pool that sets READ COMMITTED) is configuration drift, G8 (G7 if unstated), not G6e. Split it so each anchor has one class key.
- **Issue 4.** §3.6 tags "multi-session through `statespace isorun`" with [X RUN-pg-anomalies], but the executed rows came from psycopg scripts, and `pg_anomalies.py` synchronizes its first experiment with a 0.5 s sleep. Cite RUN-pg-claims for interleaving-sensitive rows (LAB-6.c1 included) and {{run:RUN-isorun-upstream}} for `isorun`.
- **Issue 5.** Missing registry entries: RUN-pg-sql-semantics (proposed); the GEN-anomaly-id pool and rows H22–H24 within RUN-pg-catalog's scope; the catalog row IDs H01–H21 (R4 §3.1), which GATE-links cannot resolve today.
- **Issue 6.** S6.L7's generator cell lists only GEN-anomaly-id, but "stamp termination [A]" needs a checker-graded form (§3.0); add GEN-which-stamp.
- **Issue 7.** Misconception IDs live outside the registry. This spec proposes dp:Q8–dp:Q15 (S1's spec proposes dp:Z6–dp:Z7); GATE-items needs one shared, `dp:`-prefixed list.
- **Issue 8.** CL-6.5's "Retries terminate" is true by construction once attempts are bounded; reword to "every command commits or is refused without exhausting its retry budget".
- **Issue 9.** S6.L2 and S6.L3 grade against INS-interp; add it to their instrument cells. Grading against the pinned reference, not the learner's own interpreter, avoids common-mode agreement (dp:X4).
- **Issue 10.** S6.L5's tablespace test-out is moot on the builder's path, where S6.L5 follows S6.L6; attach it to S6.L6's opening on both paths.
- **Issue 11.** KC-6.db-as-assumption requires only KC-6.serializable-retries, yet S6.L9 completes CL-6.3 from S6.L8; add a requires edge to KC-6.abstract-serializability (both published paths already satisfy it).
- **Issue 12.** Twins beyond §3.6's list: TigerBeetle's `create_transfers` results (S6.L2, S6.L4) and Elle (S6.L8); add them to §3.6 and RUN-twin-pins.
- **Issue 13.** CL-6.4 has no lab stage; this spec re-stamps it from LAB-6.8, so LAB-6.c8 should name the reconciliation triggers.
- **Issue 14.** The `Plan` value crossing the Lane A ABI has no schema in `schemas/`; add `plan@1` or fold it into `IR@1`.
- **Issue 15.** S6 plans wholly below the roadmap's lower bound; consider one `[stretch]` LAB-6 stage outside the budget (elle-cli over recorded histories, or a partition oracle).
