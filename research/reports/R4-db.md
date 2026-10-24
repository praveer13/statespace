# R4: PostgreSQL semantics, isolation testing and refinement to databases

Prepared 2026-10-21 for Plinth course v2, Course 06 "Correspondence" (PostgreSQL + Rust). Some of it also feeds Course 07 (RLS as the enforcement layer) and Course 08 (outbox, SKIP LOCKED).

The PostgreSQL 18.6 isolation facts come from executed spikes and were not re-tested here. Sources: `spikes/RESULTS.md` and `spikes/pg_anomalies.py`, run on docker `postgres:18` with psycopg 3 on 2026-10-20. Everything else was checked against primary sources on 2026-10-21 unless a finding says otherwise.

**Confidence levels**
- **High:** read verbatim in the primary source this session, or executed.
- **Medium:** seen only through a search-engine summary or a page paraphrase.
- **Low / unverified:** from memory or secondary sources. Flagged inline.

---

## 1. Summary

1. **Every spike result has a matching sentence in the PG 18 manual** (Chapter 13.2 plus the constraint and error-code pages), so lessons can quote the docs word for word (§2.1). The nuance to teach: under READ COMMITTED (RC), Postgres re-evaluates the `WHERE` clause on the updated row version (EvalPlanQual). That prevents lost updates only for a single conditional statement. An application-level read-modify-write still loses updates.
2. **PostgreSQL already ships a reproducible anomaly catalog.** `src/test/isolation` in REL_18_STABLE holds **127 isolationtester spec files** with expected outputs: `simple-write-skew`, `read-only-anomaly{,-2,-3}`, `receipt-report`, `classroom-scheduling`, `eval-plan-qual`, `skip-locked{,-2,-3,-4}`, `insert-conflict-*`, `update-conflict-out`, `temporal-range-integrity` and more. Its `setup / session / step / permutation` format should become the course's canonical catalog format.
3. **Bench and browser can run the same server version.** PG 18.6 is the current minor release. PGlite 0.5.9 (2026-10-12) upgraded to PostgreSQL 18.6, and npm latest is 0.5.10. PG 19 reached RC1 on 2026-10-15, with GA planned for 2026-11-19. Its RC1 notes list no isolation, SSI or RLS changes.
4. **PGlite cannot show multi-session anomalies.** It runs Postgres single-user mode, "which means a single connection". PGliteWorker elects one leader tab that "handles all queries", and pglite-socket multiplexes clients over that one connection. True multi-connection support is on the roadmap with no timeline. In-browser concurrency has to be a replay of histories recorded on the Bench, or a clearly labelled model.
5. **Taxonomy and fact sheet.** Adya's classes give the vocabulary: G0, G1a/b/c, G-single, G2-item and G2. Hermitage's PostgreSQL row is the fact sheet:
   - "read committed" behaves as monotonic atomic view.
   - "repeatable read" is snapshot isolation and allows G2-item and G2.
   - "serializable" prevents all of the listed anomalies.

   Jepsen's PostgreSQL 12.3 analysis (2020-06-12) is the cautionary tale. Elle found G2-item under SERIALIZABLE in 9.5.22 through 13. The fix's regression test (`update-conflict-out.spec`) is still in the 18 suite.
6. **elle-cli is the practical checker for learners' histories.** It needs Java 21, accepts EDN or JSON histories, and has `list-append` and `rw-register` models. Plume (OOPSLA 2024), PolySI (PVLDB 2023) and IsoVista (PVLDB 2024) are research tools. Use them as reading or stretch goals, not as dependencies.
7. **All of RLS's sharp edges are documented:**
   - Owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set; superusers and `BYPASSRLS` roles always bypass.
   - `USING` filters silently, while `WITH CHECK` errors.
   - A `USING` clause doubles as `WITH CHECK` when the latter is omitted.
   - Permissive policies combine with OR, restrictive ones with AND.
   - Views run with the owner's rights and policies unless `security_invoker` is set.
   - `LEAKPROOF` functions may run before policy quals.
   - Referential-integrity checks bypass RLS, which creates a covert channel.
   - The docs describe a READ COMMITTED race in policies that use subqueries.
8. **NULL means something different in each kind of predicate.** A CHECK constraint passes on NULL (spike and docs). A WHERE or RLS `USING` clause filters the row out (spike and docs). An RLS `WITH CHECK` raises an error (docs). This is the sharpest available specimen for "SQL is not relational algebra".
9. **The docs say `SKIP LOCKED` gives "an inconsistent view of the data".** It is a contention tool for "a queue-like table", not a delivery guarantee. An outbox built on it delivers at least once. `nextval` values are "not reclaimed" on abort, and ids do not appear in commit order. Polling by high-water mark loses rows.
10. **Rust stack:**
    - Labs: `tokio-postgres` 0.7.18 and `postgres` 0.19.14, which give explicit control of each connection.
    - Setup: `testcontainers` 0.28.0, or `postgresql_embedded` 0.22.0 for learners without Docker.
    - Stage 9 translation validation: `pg_query` 6.2.1, the real Postgres parser.
    - Avoid connection pools in isolation labs, except to stage audit A6.3.

---

## 2. Findings

### 2.1 What the official docs say about the spike results

Primary source: <https://www.postgresql.org/docs/18/transaction-iso.html>, fetched 2026-10-21 (PG 18 manual). Confidence **High** unless stated.

**F1. READ COMMITTED re-checks the `WHERE` clause.** §13.2.1 says the would-be updater "will wait for the first updating transaction to commit or roll back". After that:

> "If the first updater commits, the second updater will ignore the row if the first updater deleted it, otherwise it will attempt to apply its operation to the updated version of the row. The search condition of the command (the WHERE clause) is re-evaluated to see if the updated version of the row still matches the search condition."

- **Spike row 1:** two concurrent `UPDATE acct SET bal = bal - 80 WHERE id=1 AND bal >= 80` from 100. The second updates 0 rows and the final balance is 20, so no update is lost.
- **Spike row 2:** client-side read-modify-write. Both transactions commit, 160 is spent from 100, and the final balance is 20.
- **The caveat to teach:** "it is possible for an updating command to see an inconsistent snapshot". The docs' example is `DELETE FROM website WHERE hits = 10`, which "will have no effect even though there is a `website.hits = 10` row before and after the `UPDATE`".
- **Other commands:** the same section says `INSERT … ON CONFLICT DO UPDATE` will update a row "even though possibly *no* version of that row is conventionally visible to the command". It also says `MERGE` "does not guarantee that either `INSERT` or `UPDATE` will occur".

**F2. REPEATABLE READ: the first updater wins.** §13.2.2:

> "ERROR: could not serialize access due to concurrent update … because a repeatable read transaction cannot modify or lock rows changed by other transactions after the repeatable read transaction began."

and

> "Applications using this level must be prepared to retry transactions due to serialization failures."

- This matches spike row 3 (40001).
- The docs also say "only updating transactions might need to be retried".
- Even a read-only RR transaction "may see a control record updated to show that a batch has been completed but *not* see one of the detail records". So read-only transactions cannot fail, but they can observe states that no serial order produces.

**F3. SERIALIZABLE.** §13.2.3 gives the `mytab` class 1/class 2 example. Under RR both transactions commit. Under SERIALIZABLE one is rolled back with:

> "ERROR: could not serialize access due to read/write dependencies among transactions"

- **Error code:** serialization failures "always return with an SQLSTATE value of '40001'".
- **Predicate locks:** `SIReadLock` entries in `pg_locks` "do not cause any blocking".
- **Data validity:** data read "not be considered valid until the transaction which read it has successfully committed". The exception is `SERIALIZABLE READ ONLY DEFERRABLE`, the only case where Serializable blocks and Repeatable Read doesn't.
- **Unique-key surprise:** unique-constraint violations can occur "even after explicitly checking that the key isn't present". They are avoided only if *all* inserting Serializable transactions check first.
- **Scope of the guarantee:** "any set of successfully committed concurrent Serializable transactions". The guarantee says nothing about RC or RR transactions running alongside, which is the basis for audit A6.3.
- **False positives:** "A sequential scan will always necessitate a relation-level predicate lock". Promotion from page-level to relation-level locks "may" also raise the failure rate.
- This matches spike row 5.

**F4. How the standard levels map onto Postgres.** Table 13.1 and the surrounding text:
- "PostgreSQL's Read Uncommitted mode behaves like Read Committed".
- "PostgreSQL's Repeatable Read implementation does not allow phantom reads".

**F5. CHECK passes on NULL.** Source: <https://www.postgresql.org/docs/18/ddl-constraints.html>.

> "a check constraint is satisfied if the check expression evaluates to true or the null value. Since most expressions will evaluate to the null value if any operand is null, they will not prevent null values in the constrained columns."

This matches spike rows 6 and 7.

**F6. Error codes.** Source: <https://www.postgresql.org/docs/18/errcodes-appendix.html>.

| Code | Name |
|---|---|
| `22003` | numeric_value_out_of_range |
| `40001` | serialization_failure |
| `40P01` | deadlock_detected |
| `23505` | unique_violation |
| `23514` | check_violation |

This matches spike row 8 (`bigint` + 1 → 22003). Postgres refuses the step; it does not wrap around.

**F7. Upstream write-skew counts.** `src/test/isolation/specs/simple-write-skew.spec` (REL_18_STABLE) has two SERIALIZABLE sessions that each `UPDATE test SET t = …` and has no permutation lines. The tester therefore runs all **6** interleavings. In `expected/simple-write-skew.out`, **4 of 6** end in "could not serialize access due to read/write dependencies among transactions". I counted this from the file myself. Only the two serial orders commit both transactions.

### 2.2 PostgreSQL 18 and 19 changes that matter for the course

**F8. Versions.** Source: <https://www.postgresql.org/support/versioning/>, fetched 2026-10-21. Confidence High.
- PG 18 is at minor **18.6**. It was first released 2025-09-25 and reaches EOL on 2030-11-14.
- PG 14 reaches EOL on 2026-11-12.
- The page banner reads "October 15, 2026: PostgreSQL 19 RC 1 Released!".
- RC2 and GA are planned for **2026-11-12** and **2026-11-19**. This comes from a search summary of the pgsql "Updated PostgreSQL RC / GA dates" post, so confidence is Medium.

**F9. PG 18.0 release notes** (<https://www.postgresql.org/docs/18/release-18.html>, release date 2025-09-25). Confidence High. Items relevant to the course:
- **`OLD`/`NEW` in `RETURNING`** for INSERT/UPDATE/DELETE/MERGE. With it, `UPDATE … RETURNING old.bal, new.bal` reports the concrete transition D→D′ for each row in one statement, which is ideal for checking R(S,D).
- **Generated columns are virtual by default**, computed on read. `STORED` must now be explicit.
- **`uuidv7()`** generates temporally sortable UUIDs. Useful for outbox and idempotency keys.
- **Temporal constraints:** `WITHOUT OVERLAPS` for PK/UNIQUE and `PERIOD` for foreign keys. A natural fit for "hold" intervals.
- **`NOT ENFORCED` CHECK and FK constraints** (new column `pg_constraint.conenforced`). The constraint is declared but not checked.
- **`NOT VALID` on NOT NULL constraints.**
- **Role of AFTER triggers:** they now "Execute … as the role that was active when trigger events were queued".
- **`pg_dump --no-policies`.**
- **MD5 passwords deprecated.**
- **initdb enables data checksums by default.**
- **Nothing on isolation, SSI, predicate locks, SKIP LOCKED, ON CONFLICT or EvalPlanQual.** That absence matters: the course's isolation content rests on behaviour that has been stable for a long time.

**F10. PG 19 RC1 release notes** (<https://www.postgresql.org/docs/19/release-19.html>, "AS OF 2026-10-09"). Confidence High for the RC1 text; GA may differ.
- **New:**
  - `INSERT … ON CONFLICT DO SELECT … RETURNING`, which "allows conflicting rows to be returned, and optionally locked with FOR UPDATE/SHARE". This is a get-or-create primitive for idempotency keys.
  - `ALTER TABLE ALTER CONSTRAINT … [NOT] ENFORCED` for CHECK constraints.
  - A `WAIT` command for read-your-writes on standbys.
  - `READ ONLY`/`DEFERRABLE` passed through to postgres_fdw.
- **Changed defaults:**
  - JIT is disabled by default.
  - `log_lock_waits` is on by default.
  - `max_locks_per_transaction` goes from 64 to 128.
  - Default TOAST compression is lz4.
  - `json_array()` over zero rows now returns `[]` instead of NULL.
  - `standard_conforming_strings` is forced on.
- **No items on isolation, predicate locks, SKIP LOCKED, RLS, leakproof or security_invoker.**

### 2.3 Anomaly taxonomy: Adya, Elle, Jepsen and Hermitage

**F11. Hermitage's PostgreSQL rows** (<https://github.com/ept/hermitage>; © Martin Kleppmann 2014, CC BY 4.0). Confidence High for the cells. The page does not state which PG version was tested.

Legend: ✓ = prevented, — = can occur.

| Level (PG name) | Actual level | G0 | G1a | G1b | G1c | OTV | PMP | P4 | G-single | G2-item | G2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| "read committed" (default) | monotonic atomic view | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| "repeatable read" | snapshot isolation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| "serializable" | serializable | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

The glosses Hermitage gives:
- P4 = "Lost Update"
- G-single = "Single Anti-dependency Cycles (read skew)"
- G2-item = "Item Anti-dependency Cycles (write skew on disjoint read)"
- OTV = "Observed Transaction Vanishes"
- PMP = "Predicate-Many-Preceders"

The README says it doesn't describe *how* an anomaly is prevented, "usually by blocking or aborting".

**F12. Elle** (<https://github.com/jepsen-io/elle>, EPL-2.0). Confidence High.
- "Elle is a transactional consistency checker for black-box databases… Based purely on client observations of transactions…"
- **Workloads:** `elle.rw-register` ("Weaker inference rules, but applicable to basically all systems") and `elle.list-append` ("Elle's most powerful inference rules … writes append unique elements").
- **Anomalies with the README's glosses:**
  - G0 = write cycle
  - G1a = aborted read
  - G1b = intermediate read
  - G1c = cyclic information flow
  - G-Single = read skew
  - G2 = anti-dependency cycle
- **Further anomalies:** internal inconsistency, dirty updates, duplicate writes and garbage reads.
- **Scaling:** "~linear in history length, and ~constant … with respect to concurrency".
- **Paper:** Kingsbury & Alvaro, "Elle: Inferring Isolation Anomalies from Experimental Observations", arXiv:2003.10554. The title and arXiv id appear in search results. Venue PVLDB 14(3), 2020 is from memory: **unverified**.

**F13. Jepsen, PostgreSQL 12.3** (<https://jepsen.io/analyses/postgresql-12.3>, 2020-06-12). Confidence High.
- **Finding:** SERIALIZABLE "exhibited G2-item under normal operation". The bug was "present in PostgreSQL 9.5.22, 10.13, 11.8, 12.3, and 13".
- **Cause:** conflict detection flagged the updating transaction's XID instead of "the transaction ID which originally created the tuple".
- **Fix:** commit `5940ffb221316ab73e6fdc780dfe9a07d4221ebb`, with regression test `src/test/isolation/specs/update-conflict-out.spec`. I confirmed that spec is still in the REL_18_STABLE listing. Jepsen says the fix was due in "the next minor release, on August 13th". That this was 12.4 is my inference from the date.
- **Method:** Elle list-append over JDBC; Elle "infers a transaction dependency graph … and searches for cycles".
- **On REPEATABLE READ:** "PostgreSQL's 'repeatable read' isolation level is actually snapshot isolation". SI "is *not comparable*" with repeatable read under the broad reading. Elle "cannot yet detect predicate anomalies in general".

**F14. Adya's definitions.** Source: Adya, MIT PhD thesis 1999, <https://pmg.csail.mit.edu/papers/adya-phd.pdf>. **Not fetched this session; from memory, so Medium/Low.**
- **Dependency graph:** each history has a direct serialization graph with three edge types:
  - `ww`: a transaction installs the next version.
  - `wr`: a transaction reads a version.
  - `rw` (anti-dependency): a transaction overwrites a version that another transaction read.
- **Anomaly classes:**
  - G0: a cycle of `ww` edges only.
  - G1a: an aborted read.
  - G1b: an intermediate read.
  - G1c: a cycle of `ww`/`wr` edges.
  - G-single: a cycle with exactly one `rw` edge.
  - G2-item: a cycle with `rw` edges on items.
  - G2: also counts predicate `rw` edges.
- **Isolation levels:**
  - PL-1 rules out G0.
  - PL-2 rules out G1.
  - PL-2.99 rules out G1 and G2-item.
  - PL-3 rules out G1 and G2.
- **SSI's "dangerous structure":** two consecutive `rw` edges (Fekete et al. 2005; Ports & Grittner, PVLDB 5(12) 2012). Not re-fetched.

### 2.4 Checkers that could check histories learners record

**F15. elle-cli** (<https://github.com/ligurio/elle-cli>, EPL, © 2021–2026 Sergey Bronnikov). Confidence High.
- "a command-line frontend to transactional consistency checkers for black-box databases".
- **Models:** `rw-register`, `list-append`, `bank`, `counter`, `long-fork`, `set`, `set-full`, `cas-register`, `mutex` and `sequential`.
- **Consistency models:** the default is `strict-serializable`; others include `consistent-view`, `conflict-serializable` and `cursor-stability`.
- **Input:** histories in EDN or JSON.
- **Build and run:** `lein uberjar` produces `elle-cli-0.1.11-standalone.jar`; it needs Java 21 or later.
- **Output:** `true`, `false` or `unknown`.
- **Fit:** this is the realistic Bench checker for a learner's Rust harness. Record histories in Elle's list-append shape (`{:type :ok, :value [[:append :x 1] [:r :y [1]]]}`, as JSON) and let elle-cli name the anomaly.

**F16. Research checkers.** These are reading or stretch material, not course dependencies.

| Checker | Venue / id | What it covers | Source | Confidence |
|---|---|---|---|---|
| **Plume** | OOPSLA 2024, DOI 10.1145/3689742 | Efficient and complete black-box checking of weak levels: read committed, read atomicity, transactional causal consistency. Artifact on Zenodo (repo `dracoooooo/Plume-Artifacts`, Docker image). | <https://2024.splashcon.org/details/splash-2024-oopsla/85/Plume-Efficient-and-Complete-Black-box-Checking-of-Weak-Isolation-Levels> | Medium (search summary) |
| **PolySI** | PVLDB 16, DOI 10.14778/3583140.3583145 | Snapshot isolation via generalized polygraphs and an SMT solver, with "understandable counterexamples". | vldb.org paper page | Medium |
| **IsoVista** | PVLDB 17, p. 4325, 2024 (Gu, Liu, Xing, Wei, Chen, Basin) | Black-box checking across several isolation levels, aiming at no false positives or missed bugs; visualises violation scenarios. | <https://vldb.org/pvldb/vol17/p4325-liu.pdf> | Medium (summary) |
| **AWDIT** | PLDI 2025 | Claimed optimal: RC and Read Atomic in O(n^1.5), causal consistency in O(n·k). | Secondary blog only | **Unverified** |
| **Troubadour** | OOPSLA 2025, "Checking Observational Correctness of Database Systems" | SMT-based, applied to PostgreSQL. | Conference listing only | **Unverified** |

None of these is a browser library as far as I could see (unverified). The visualisations in IsoVista and PolySI are good models for the course's history Theater.

**F17. Postgres's own isolationtester** (`src/test/isolation/README`, REL_18_STABLE, read directly). Confidence High.
- **How a spec runs:**
  - Each session "is executed in its own connection".
  - `permutation` lines fix the step order. With none, the tester runs "all possible permutations of the steps from each session".
  - Main setup and teardown run in a separate "control" session.
- **Blocking:** "isolationtester recognizes that a command has blocked by looking to see if it is shown as waiting in the pg_locks view; therefore, only blocks on heavyweight locks will be detected".
- **Markers:** `step(*)`, `step(other_step)` and `step(other notices n)` keep output deterministic.
- **Suite size:** 127 spec files in REL_18_STABLE, counted through the GitHub contents API.

### 2.5 Row-level security: semantics and pitfalls

Sources:
- <https://www.postgresql.org/docs/18/ddl-rowsecurity.html>
- <https://www.postgresql.org/docs/18/sql-createpolicy.html>
- <https://www.postgresql.org/docs/18/sql-createview.html>
- <https://www.postgresql.org/docs/18/sql-createfunction.html>

All fetched 2026-10-21. Confidence High.

**F18. Who is subject to RLS, and where it doesn't apply.**
1. **Default deny:** "If no policy exists for the table, a default-deny policy is used".
2. **Owner bypass:** "Table owners normally bypass row security as well, though a table owner can choose to be subject to row security with ALTER TABLE … FORCE ROW LEVEL SECURITY".
3. **Superusers:** "Superusers and roles with the BYPASSRLS attribute always bypass the row security system". The classic deployment bug is an app that connects as the owner or migration role: its policies exist and are never applied.
4. **Integrity checks:** "Referential integrity checks, such as unique or primary key constraints and foreign key references, always bypass row security … avoid 'covert channel' leaks". Probing a unique key reveals that the key exists, which is the database form of S7.2.
5. **Whole-table operations:** "Operations that apply to the whole table, such as TRUNCATE and REFERENCES, are not subject to row security."
6. **`row_security = off`:** this "does not in itself bypass row security; what it does is throw an error if any query's results would get filtered". It is meant for backups. PG 18 adds `pg_dump --no-policies`.
7. **Race under READ COMMITTED:** the docs' `information`/`users` example. If mallory runs `SELECT … FOR UPDATE` under READ COMMITTED while a policy subquery reads a group mapping that is changing, she can see "secret from mallory". The documented fixes are "`SELECT … FOR SHARE` in sub-SELECTs in row security policies" or an `ACCESS EXCLUSIVE` lock on the referenced table. **This is the one place where isolation and authorization meet, which makes it a good cross-course specimen.**

**F19. `USING`, `WITH CHECK` and combining policies.**
- **Which rows each clause checks:** "Existing table rows are checked against the expression specified in USING, while new rows that would be created via INSERT or UPDATE are checked against the expression specified in WITH CHECK."
- **Failure behaviour:** a `USING` that is false or null hides the row, and "Typically, no error occurs". A `WITH CHECK` that is false or null means "an error occurs".
- **Omitted `WITH CHECK`:** for `ALL` and `UPDATE` policies, "if no WITH CHECK expression is defined, then the USING expression will be used both".
- **Combining policies:** permissive policies are OR'd and restrictive ones AND'd. "If only restrictive policies exist, then no records will be accessible."
- **UPDATE also needs SELECT:** an UPDATE that reads columns, whether in `WHERE`, `RETURNING` or the right-hand side of `SET`, also needs SELECT policies.
- **ON CONFLICT never silently skips:** for `ON CONFLICT DO UPDATE`, if the existing row fails `USING`, "an error will be thrown (the UPDATE path will *never* be silently avoided)". `MERGE … UPDATE` behaves the same way.
- **Whose rights:** policies "will be run with the rights of the user running the overall query".
- **Policies through views:** "permission checks and policies for the tables which are referenced by a view will use the view owner's rights and any policies which apply to the view owner, except if the view is defined using the security_invoker option."

**F20. Views and LEAKPROOF.**
- **`security_invoker`:** this view option makes Postgres check "the underlying base relations … against the privileges of the user of the view". Without it, "the row-level security policies of the view owner are applied". A plain view owned by the table owner therefore exposes every row, because owners bypass RLS. This is the most common RLS hole in multi-tenant apps.
- **`security_barrier`:** the option to use "if the view is intended to provide row-level security".
- **`LEAKPROOF`:** "indicates that the function has no side effects. It reveals no information about its arguments other than by its return value". The optimiser may run LEAKPROOF functions before row-security quals. Whether only superusers can mark a function LEAKPROOF was not confirmed in the text I grepped: **unverified**.

**F21. Tenant context.** `set_config(name, value, is_local)` applies "only during the current transaction" when `is_local` is true (<https://www.postgresql.org/docs/18/functions-admin.html>, High). The pooling pitfall follows from this: with a transaction-level pooler, a session-level `SET app.tenant` can leak to the next client. That is common practitioner knowledge, not something I verified from a primary source.

### 2.6 `FOR UPDATE SKIP LOCKED` queues and the outbox

**F22. What the locking clause does** (<https://www.postgresql.org/docs/18/sql-select.html>, The Locking Clause). Confidence High.
- **The core caveat:** "With SKIP LOCKED, any selected rows that cannot be immediately locked are skipped. Skipping locked rows provides an inconsistent view of the data, so this is not suitable for general purpose work, but can be used to avoid lock contention with multiple consumers accessing a queue-like table."
- **Table-level lock:** NOWAIT and SKIP LOCKED "apply only to the row-level lock(s) — the required ROW SHARE table-level lock is still taken in the ordinary way".
- **LIMIT and OFFSET:** with LIMIT, "locking stops once enough rows have been returned … (but note that rows skipped over by OFFSET will get locked)".
- **ORDER BY under READ COMMITTED:** combining `ORDER BY` with a locking clause can "return rows out of order". At REPEATABLE READ and SERIALIZABLE the same situation raises a serialization failure (40001) instead.
- **Where locking clauses are disallowed:** they cannot be used with aggregation, GROUP BY, DISTINCT, UNION/INTERSECT/EXCEPT and similar.
- **Upstream specs:** `skip-locked.spec` through `skip-locked-4.spec`.

**F23. Sequences don't follow commit order.** "the value obtained by nextval is not reclaimed for re-use if the calling transaction later aborts", and gaps can occur "without a transaction abort, too" (<https://www.postgresql.org/docs/18/functions-sequence.html>, High).
- **Consequence:** ids are allocated at INSERT time but become visible at COMMIT time, so visibility order differs from id order. A poller that advances a `last_seen_id` high-water mark can permanently skip a row that commits late. This is first-principles reasoning; catalog entry H20 is proposed to confirm it.

**Outbox caveats.** These follow from F22, F23 and the roadmap's Stage 8, not from a single document:
1. **At least once:** a worker that holds the row lock across the external call and crashes before COMMIT releases the lock, and another worker re-sends the message.
2. **Claim-then-send is no better:** committing a claim first and sending second leaves a stuck "claimed" row until a lease expires, and then a re-send.
3. **No fairness or FIFO:** SKIP LOCKED gives neither. Per-key ordering needs an extra mechanism, such as one consumer per key, advisory locks or partitioning.
4. **Long transactions block cleanup:** holding a transaction open across network I/O holds back the cleanup horizon (bloat). This is general PG knowledge; I did not re-fetch a source.
5. **Queue depth:** `count(*)` under SKIP LOCKED is not a meaningful queue-depth metric.

### 2.7 PGlite 0.5.x

**F24. Versions and changes** (npm registry and `packages/pglite/CHANGELOG.md` on GitHub main, both read directly 2026-10-21). Confidence High.
- **npm:** `@electric-sql/pglite` latest is **0.5.10** (2026-10-14). Its `unpackedSize` is 35,415,422 bytes. The README says "only 3mb gzipped", which presumably refers to the core download and is unverified.
- **0.5.9** (2026-10-12): "upgrade to PostgreSQL 18.6".
- **0.5.0** (2026-06-02): "Upgrade to Postgres 18.3; move other extensions to their own npm packages".
- **0.5.2:** adds `pg_stat_statements` to the main package.
- **0.5.5:** exposes `command` and `rowCount` from the CommandComplete tag, which is useful for "rowcount as guard result" in lesson 6.2.
- **0.4.x:** new architecture with a separate initdb (0.4.0, 2026-03-17); background workers disabled (0.4.3); checkpointer disabled (0.4.4); ICU support (0.4.6).
- **Package exports:** `.`, `./live`, `./worker`, `./opfs-ahp`, `./nodefs`, `./basefs`, `./template`, `./contrib/*`.

**F25. Connections and concurrency.** Confidence High for the quotes.
- **Single connection:** README "How it works" says Emscripten "cannot fork new processes", so PGlite uses Postgres's "single user mode". The v0.4 announcement (Zaharia & Willis, URL dated 2026-03-25, <https://electric.ax/blog/2026/03/25/announcing-pglite-v04>) says: "PGlite runs in Postgres single-user mode, which means a single connection."
- **Multiplexing:** a community PR "multiplexes concurrent connections over PGlite's single connection".
- **Roadmap:** "true multi-connection support, exploring both cooperative and multi-threaded (WebWorker) approaches". No timeline is given.
- **PGliteWorker** (<https://pglite.dev/docs/multi-tab-worker>): "Only the leader then starts PGlite … and handles all queries"; "PGlite is single connection only".
- **`@electric-sql/pglite-socket` 0.2.13** (2026-10-14): `-m, --max-connections` defaults to "no concurrency: 1". Its README says: "This is different from a normal Postgres installation, so not all use cases are guaranteed to work."
- **Why this rules out real anomalies:** one backend means at most one open transaction and one snapshot. No MVCC anomaly between sessions can occur, whatever the multiplexer does. The multiplexer's exact policy while a transaction is open is **unverified**; my grep of the bundled JS found nothing conclusive.
- **What PGlite can do:** single-session SQL semantics on the same 18.6 server code: NULL, bags, CHECK, 22003, `RETURNING old/new`, `NOT ENFORCED`.
- **RLS in PGlite is unverified.** The single-user session is a superuser and so bypasses RLS. It should be possible to test policies after `CREATE ROLE` and `SET ROLE`, but this needs a spike.

### 2.8 SQLancer, TLP, NoREC and transaction-bug oracles

**F26. SQLancer** (<https://github.com/sqlancer/sqlancer>, MIT). Confidence High.
- **Oracles:**
  - PQS (OSDI 2020, "currently unmaintained").
  - NoREC (ESEC/FSE 2020), which "aims to find optimization bugs".
  - TLP (OOPSLA 2020), which "partitions a query into three partitioning queries".
  - DQE (ICSE 2023), CERT (ICSE 2024), DQP (SIGMOD 2024) and CODDTest (SIGMOD 2025).
- **PostgreSQL:** listed as supported "as of January 2025", at a level that is not stated.
- **No transaction testing.**
- **Track record:** "hundreds of bugs".
- **How TLP's three partitions work:** `p`, `NOT p` and `p IS NULL` must together reproduce the unpartitioned result. This is three-valued logic made executable, so it maps directly onto lesson 6.1. The partition detail is my own summary of TLP.

**F27. Transaction-bug oracles.**
- **TxCheck** (OSDI 2023; Jiang, Liu, Rigger, Su; <https://www.usenix.org/conference/osdi23/presentation/jiang>; code at github.com/JZuming/TxCheck, built on SQLsmith). Its oracle uses statement-dependency graphs and found "56 unique bugs, 52 … confirmed" in TiDB, MySQL and MariaDB. These numbers come from a search summary, so confidence is Medium. PostgreSQL was not among the targets in that summary.
- **Troc** (ICSE 2023, "Detecting Isolation Bugs via Transaction Oracle Construction"): Medium/Low. A 2025 arXiv paper says it has a high false-positive rate (secondary source).
- **Fit:** these are good reading for lesson 6.9, which is about the oracle problem. They are not tools the course needs.

### 2.9 Rust crates for the labs

**F28.** Versions are the `max_stable_version` reported by the crates.io API on 2026-10-21; the date column is the crate's `updated_at`. Confidence High for the versions. Role notes are my assessment.

| Crate | Version | Updated | Role |
|---|---|---|---|
| `tokio-postgres` | 0.7.18 | 2026-06-12 | **Default for labs.** One client per session gives deterministic interleavings and SQLSTATE matching. The `SqlState::T_R_SERIALIZATION_FAILURE` constant name is from memory: verify on docs.rs. |
| `postgres` (sync) | 0.19.14 | 2026-06-12 | Simpler first labs that use threads. |
| `postgres-types` | 0.2.14 | 2026-06-12 | Mapping between `numeric`/`bigint` and Rust types. |
| `sqlx` | 0.9.0 | 2026-05-21 | Application code. Its pool hides which connection you are on, which is a hazard for isolation experiments. |
| `deadpool-postgres` | 0.14.2 | 2026-08-26 | Only for audit A6.3: the pool sets READ COMMITTED while the claim says SERIALIZABLE. |
| `bb8-postgres` | 0.9.0 | 2024-12-09 | Older; skip. |
| `diesel` | 2.3.14 | 2026-10-07 | Out of scope; mention only. |
| `testcontainers` / `-modules` | 0.28.0 / 0.15.0 | 2026-08-06 / 2026-02-21 | Pinned `postgres:18.6` image per test. |
| `postgresql_embedded` | 0.22.0 | 2026-10-21 | Real PG binaries without Docker. Whether it can pin 18.6 is unverified. |
| `pgtemp` | 0.7.1 | 2025-11-10 | Temporary clusters; needs local PG binaries. |
| `pg_query` | 6.2.1 | 2026-09-30 | libpg_query, the real PG parser, for Stage 9 translation validation of generated SQL. Which PG grammar version it bundles is unverified. |
| `sqlparser` | 0.63.0 | 2026-09-13 | Not PG's grammar; don't use it for validation. |
| `proptest` | 1.12.0 | 2026-10-10 | Differential harness (already in PLAN). |

---

## 3. What this means for the course

### 3.1 The anomaly catalog: reproducible on PG 18.6

**Format.** Every entry is an isolationtester-style spec plus an expected outcome for each level, stored in `catalog/HNN-name.spec` together with a recorded `.out`, the server version (`SELECT version()`) and a hash.

**Status labels**
- **SPIKE:** executed 2026-10-20 on 18.6.
- **UPSTREAM:** in REL_18_STABLE with expected output.
- **DOC:** stated in the manual; spike pending.
- **PROPOSED:** first-principles; spike pending.

**Levels:** RC = READ COMMITTED, RR = REPEATABLE READ, SER = SERIALIZABLE.

**Base fixture** (the same as the spikes):

```
setup { CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL, team int);
        INSERT INTO acct VALUES (1,100,1),(2,100,1); }
teardown { DROP TABLE acct; }
```

**Encoding client-side reads.** Spec steps are static SQL. To reproduce application read-modify-write, save the value read into a per-session temp table: `CREATE TEMP TABLE seen1 ON COMMIT DROP AS SELECT bal FROM acct WHERE id=1`, then `UPDATE acct SET bal = (SELECT bal FROM seen1) - 80 WHERE id=1`. The SET expression doesn't reference the target row, so the RC re-check cannot repair it. This encoding is **PROPOSED** (not yet run). Check it against the psycopg spike.

| ID | Name (Adya / Hermitage) | Steps (permutation) | RC | RR | SER | Status · source | Course hook |
|---|---|---|---|---|---|---|---|
| H01 | Lost update via app read-modify-write (P4) | s1 read, s2 read, s1 write 20, s1 commit, s2 write 20, s2 commit | both commit; final 20; 160 spent from 100 | s2: 40001 "could not serialize access due to concurrent update" | 40001 (expected) | SPIKE (RC, RR); SER is DOC · F2 | S6.2: name the compilation pattern |
| H02 | Conditional single-statement UPDATE under RC (not an anomaly) | s1 `UPDATE … WHERE id=1 AND bal>=80`, s2 same (blocks), s1 commit, s2 resumes, s2 commit | s2 updates 0 rows; final 20 | s2: 40001 (expected) | 40001 (expected) | SPIKE (RC) · F1 · upstream `eval-plan-qual.spec` | 6.2: rowcount = guard result; fixes the v1 C6.2 claim |
| H03 | RC re-check misses a matching row | `website(hits)` = {9, 10}; s1 `UPDATE website SET hits=hits+1`; s2 `DELETE … WHERE hits=10` (blocks); s1 commit | DELETE removes 0 rows; a hits=10 row exists before and after | s2 40001 (expected) | 40001 (expected) | DOC · F1 | 6.6: a non-serializable result without any "lost" write |
| H04 | Read skew (G-single) | s1 reads id1 (100); s2 moves 50 from 1 to 2 and commits; s1 reads id2 (150) | s1 sees a total of 250, so conservation looks broken | s1 sees 200 | s1 sees 200 | DOC/Hermitage · F11 | Course 02 tie-in: a conserving system can still be *observed* violating conservation |
| H05 | Write skew on existing rows (G2-item) | both sum team (200); s1 debits id1 150; s2 debits id2 150; both commit | both commit; total −100 | both commit; total −100 | s2: 40001; total 50 | SPIKE (RR, SER) · F3; upstream `simple-write-skew.spec` (6 interleavings, 4 abort under SER) | S6.3 |
| H06 | Predicate write skew via INSERT (G2) | the docs' `mytab` class sums, each inserting into the other class | both commit | both commit | one fails, read/write dependencies | DOC · F3; upstream `classroom-scheduling.spec` | Double-booked holds in Course 05/08 |
| H07 | Read-only anomaly (Fekete–O'Neil) | upstream `read-only-anomaly.spec`: s2rx s2ry s1ry s1wy s1c s3r s2wx s2c s3c | (not tested) | s3 sees a state inconsistent with every serial order | `-2.spec`: error; `-3.spec`: DEFERRABLE s3 waits | UPSTREAM · F2/F3 | 6.7: "read-only ≠ safe" |
| H08 | Receipt report, false positives | upstream `receipt-report.spec` | n/a | n/a | READ ONLY s3: exactly 6 permutations must fail; as READ WRITE: "42 false positives" (spec comment) | UPSTREAM | 6.7: declare READ ONLY |
| H09 | Phantom | s1 counts team=1 (2); s2 inserts (3,0,1) and commits; s1 counts again | 3 | 2 | 2 | DOC · F4 | 6.5: ANSI vs PG |
| H10 | Mixed levels void the guarantee | H05 with s1 at SER and s2 at RC | — | — | both commit (expected) | DOC (scope quote, F3); outcome PROPOSED | A6.3 drift audit |
| H11 | SER false positive from relation-level predicate lock | two SER transactions on disjoint ids in a tiny table (seq scan), or with `SET enable_indexscan=off` | — | — | 40001 possible without a real conflict | DOC (F3 bullets); PROPOSED | 6.7: an abort is a stutter, not an anomaly |
| H12 | 23505 instead of 40001 | two SER transactions insert the same key; one checks first, one doesn't | — | — | unique violation possible | DOC · F3 | 6.7: the retry classifier is part of the trusted base |
| H13 | ON CONFLICT DO UPDATE on an invisible row | upstream `insert-conflict-do-update*.spec` | updates even though "no version … conventionally visible" | — | — | DOC + UPSTREAM · F1 | 8.4 idempotency keys |
| H14 | MERGE gives no insert-or-update guarantee | upstream `merge-*.spec` | neither action guaranteed; duplicate insert gives 23505 | — | — | DOC + UPSTREAM | 6.2: compiling to MERGE is risky |
| H15 | SKIP LOCKED view inconsistency | upstream `skip-locked*.spec`; two workers claim batches | disjoint claims; aggregate reads are meaningless | — | — | DOC + UPSTREAM · F22 | 8.2 outbox |
| H16 | ORDER BY + FOR UPDATE out of order | sort, block on a lock, the ordering column changes, resume | rows out of order | 40001 | 40001 | DOC · F22 | 8.2 "FIFO" claims |
| H17 | RLS policy-subquery race | the docs' `information`/`users` example, mallory using FOR UPDATE | mallory can see "secret from mallory" | (expected prevented) | (expected prevented) | DOC · F18 | Course 07: enforcement ≠ noninterference under concurrency |
| H18 | NULL in three kinds of predicate | `CHECK (bal>=0)` with NULL; `UPDATE … WHERE bal>=10` over {NULL, 50}; RLS `WITH CHECK (bal>=0)` with NULL | accepted / NULL row skipped / error | same | same | SPIKE (CHECK, WHERE) + DOC (WITH CHECK) · F5, F19 | S6.1 |
| H19 | `bigint` overflow refused | `SELECT 9223372036854775807::bigint + 1` | 22003 "bigint out of range" | same | same | SPIKE · F6 | S6.4 / E1 (corrected) |
| H20 | High-water-mark poller skips a late commit | s1 `nextval`/INSERT id 1 (uncommitted); s2 INSERT id 2 and commit; poller reads `id > 0`, sees 2, advances to 2; s1 commits | row 1 never delivered | (same for poller) | (same) | PROPOSED · F23 | S8.x lost effect |
| H21 | Historical: SER allowed G2-item (9.5.22–13, 2020) | upstream `update-conflict-out.spec` (the fix's test) | — | — | fixed; spec must pass | UPSTREAM · F13 | 6.9: the DB is in the trusted computing base |

**How the course verifies the catalog**
1. **Build the runner.** Write `isorun`, the Bench L6 lab component, in Rust on `tokio-postgres`. It parses the spec format, opens one connection per session, runs each permutation, and detects blocking the same way isolationtester does (waiting in `pg_locks`). It writes a `.out` file plus an Elle-format JSON history.
2. **Check the runner against upstream.** Run it on vendored upstream specs: `simple-write-skew` must give 6 permutations with 4 aborts, and `read-only-anomaly{,-2,-3}` and `receipt-report` must match their expected outputs. This is itself a small refinement exercise: the learner's runner against the reference tester.
3. **Re-record when PostgreSQL changes.** Re-run the whole catalog on every minor upgrade, and on PG 19 GA, and record the version in each receipt.

### 3.2 Changes to each lesson

**Course 06 (Correspondence)**
- **6.1:** teach H18, the three meanings of NULL. Add a mini-TLP exercise: partition a guard into `p`, `NOT p` and `p IS NULL` in PGlite, where the server is 18.6, the same as the Bench.
- **6.2:** compile a transfer as `UPDATE … WHERE guard RETURNING old.bal, new.bal` (PG 18). The returned before/after pair is the concrete step D→D′ for checking R. Use H02 to show why the conditional single-statement form is safe under RC.
- **6.3:** the differential test must compare outcome *classes*: success, guard-fail (0 rows), and errors by SQLSTATE (22003, 23514, 40001, 23505). Comparing balances alone is what audit A6.2 catches. TLP and NoREC are references for "oracles that don't need a reference interpreter".
- **6.4:** replace the v1 E1 mechanism. The abstract step exists but Postgres refuses it with 22003 (H19), so this is a simulation failure in the direction "the database can't match S→S′", not a wraparound. Add PG 18's `NOT ENFORCED` CHECK as a declared-but-unenforced specimen for the Audit desk.
- **6.5:** teach Adya's dependency graph and classes. Use the Hermitage PG row (F11) as the fact sheet, with the Jepsen quote "repeatable read … is actually snapshot isolation".
- **6.6:** run H01–H09 on the Bench through `isorun`, then replay the recorded `.out` and history in the browser Theater. Remove any claim that PGlite runs these anomalies.
- **6.7:** cover H08, H10, H11 and H12, plus a retry policy. Retry 40001 and 40P01, bound the number of attempts, add backoff, and log every abort as a stutter step.
  - "Does retrying terminate?" is a liveness question with no general guarantee. Ports & Grittner (2012) describe a "safe retry" property, but I recall that from memory and it is **unverified**.
- **6.8:** state R(S,D) so that aborted transactions map to abstract stutters. Treat refusals like 22003 as visible divergences in availability.
- **6.9:** Elle-style checking can show that an anomaly is present, never that anomalies are absent. Jepsen's 2020 bug (H21) shows that "Postgres semantics" is itself an assumption.

**Course 07 (Secrecy)**
- Add an RLS lesson: Datalog policy → RLS policies → a differential check. For each user, run `SET ROLE u; SELECT …` on the Bench and compare with the Datalog access matrix.
- Specimens: owner bypass, a view without `security_invoker`, the unique-key covert channel (S7.2), and H17.
- Cross-link R5 (authz/compilers), which does not cover RLS.

**Course 08 (Effects)**
- Build the outbox on SKIP LOCKED. Catalog entries H15, H16 and H20, plus the crash windows in §2.6.
- Use idempotency keys with `ON CONFLICT` (H13). PG 19's `ON CONFLICT DO SELECT … RETURNING` is a later enhancement. Use `uuidv7()` for keys.

**Course 09 (Preservation)**
- Validate generated SQL with `pg_query`, the real parser, and use the isolationtester spec format as the target for generated transaction plans.

**Sibling courses**
- **tablespace:** owns the MVCC internals (xmin/xmax, visibility, SIRead lock structures). Link to it rather than re-teaching.
- **byzantine:** owns Jepsen-style distributed checking and linearizability. Link to it, and share the elle-cli setup.

---

## 4. Recommendations (ranked)

1. **Make the catalog executable and canonical.**
   - Adopt the isolationtester spec format.
   - Vendor about 10 upstream specs with notice: PostgreSQL License, which I did not re-fetch.
   - Author H01–H20 in the same format.
   - Store the recorded `.out` file, version and hash for each spec.
2. **Build `isorun` in Rust as part of Bench lab L6.**
   - Run the specs, detect blocking through `pg_locks`, and emit Elle JSON.
   - Gate `isorun` on reproducing upstream expected outputs (simple-write-skew: 6 permutations, 4 aborts).
3. **Pin PostgreSQL 18.6 everywhere.**
   - Bench: Docker `postgres:18.6` or `postgresql_embedded`. Browser: PGlite ≥ 0.5.9.
   - Hold off on PG 19 until after GA (planned 2026-11-19), then re-run the catalog.
4. **Be honest about concurrency in the browser.**
   - PGlite is labelled "single session".
   - Concurrency lessons replay recorded 18.6 histories.
   - Any TypeScript MVCC or SSI simulator is labelled as a model and checked differentially against the catalog.
5. **Correct the v1 claims:**
   - E1: 22003 is a refusal, not a wraparound.
   - C6.2: name the compilation pattern.
   - SERIALIZABLE covers "committed concurrent Serializable transactions" only.
   - Use the Hermitage-based fact sheet in place of any hand-written anomaly table.
6. **Use elle-cli** as the optional Bench checker for histories learners record (Java 21). Plume, PolySI and IsoVista go on the reading list only.
7. **Add the RLS module to Course 07**, covering all ten pitfalls, H17, and the `SET ROLE` differential check. Spike RLS in PGlite first.
8. **Build the outbox lab in Course 08** from SKIP LOCKED, idempotency keys, crash injection, H15/H16/H20, and the five caveats in §2.6.
9. **Standardise the crate set:**
   - `tokio-postgres` / `postgres`, `proptest`, and `testcontainers` or `postgresql_embedded`.
   - `deadpool-postgres` only to stage A6.3.
   - `pg_query` for Stage 9.
10. **Use metamorphic oracles** (TLP and NoREC style) as a 6.3/6.9 exercise. SQLancer itself is optional reading: it is Java, does no transaction testing, and doesn't state its level of PG support.

---

## 5. Open questions

1. **Is `isolationtester` in any packaged distribution?** It is built inside the source tree; whether the Debian `postgresql-18` packages or Docker images include it is unverified. If none do, `isorun` is mandatory rather than optional.
2. **PGlite:**
   - Does RLS under `SET ROLE` behave the same as on the Bench?
   - What does a first load of 0.5.10 actually transfer (the README says "3mb gzipped"; npm unpacked is 35.4 MB)?
   - What does the pglite-socket multiplexer do while a client has a transaction open?
3. **Which catalog outcomes still need spikes?** H03, H04, H06, H09–H12, H16, H17 and H20 are DOC or PROPOSED. Each needs a recorded 18.6 run before any number or claim appears in course copy.
4. **Is "safe retry" in Ports & Grittner (PVLDB 2012) as I remember it?** Check the text, and whether PG 18 still has the property.
5. **Can Plume, PolySI or IsoVista consume Elle-format histories directly, or would they need converters?** Is any of them light enough for learners to run?
6. **Primary sources still needed:**
   - The AWDIT (PLDI 2025) and Troubadour (OOPSLA 2025) claims.
   - Elle's venue (PVLDB 14(3)).
   - Whether marking a function `LEAKPROOF` needs superuser.
   - The `SqlState` constant names in `tokio-postgres`.
   - Which PG grammar `pg_query` bundles.
7. **Does PG 19 GA change anything?** The RC1 notes list no isolation or RLS changes; re-check at GA.

---

## 6. Verification log

**Checked directly this session (2026-10-21)**
- **PG 18 manual pages:**
  - `transaction-iso.html` (sections 13.2–13.2.3, quotes in F1–F4).
  - `release-18.html` (F9).
  - `ddl-rowsecurity.html`, `sql-createpolicy.html` and `sql-createview.html` (F18–F20).
  - `sql-select.html`, locking clause (F22).
- **Grepped verbatim with curl:** `ddl-constraints.html` (CHECK NULL), `errcodes-appendix.html` (22003/40001/40P01/23505/23514), `functions-sequence.html` (nextval not reclaimed), `sql-createfunction.html` (LEAKPROOF) and `functions-admin.html` (`set_config` `is_local`).
- **Other PostgreSQL sources:**
  - `release-19.html` (RC1 notes, F10).
  - The versioning page (F8).
  - `src/test/isolation/README` (REL_18_STABLE).
  - The spec listing (127 files) via the GitHub API.
  - `simple-write-skew.spec` and `.out` (4/6 aborts counted), `read-only-anomaly.spec` and `.out`, and the header comment of `receipt-report.spec`.
- **Jepsen and isolation tools:** the Jepsen PostgreSQL 12.3 analysis, and the READMEs for Elle, elle-cli, Hermitage and SQLancer.
- **PGlite and Rust:**
  - The npm registry metadata for `@electric-sql/pglite` (versions, dates, unpackedSize, exports, README) and `@electric-sql/pglite-socket`.
  - PGlite's `CHANGELOG.md`, the v0.4 announcement and the multi-tab-worker docs.
  - The crates.io API for 14 crates.

**Second-hand (search summaries only)**
- PG 19 RC2 and GA dates.
- Plume, PolySI and IsoVista descriptions and identifiers.
- TxCheck bug counts.
- Troc.
- AWDIT and Troubadour.
- The Elle arXiv id: the title and id came from a search result, the venue from memory.

**From memory, not re-fetched**
- Adya's definitions and PL levels.
- SSI's dangerous structure and the Fekete and Ports & Grittner papers.
- The "safe retry" property.
- The PostgreSQL License terms.
- The `tokio-postgres` `SqlState` constant names.
- The general MVCC point that long transactions hold back vacuum.

**Not re-tested, by instruction**
- All PG 18.6 spike rows (cited from `spikes/RESULTS.md` and `spikes/pg_anomalies.py`).
