# R4-db verification log (light mode, 2026-10-21)

Method: fetched primary sources directly with curl (postgresql.org, GitHub raw/API, npm registry, crates.io API, jepsen.io, usenix.org, doi.org/Crossref metadata). Spike results (§2.1 rows executed on 18.6) were NOT re-executed.

| # | Claim | Verdict | Correction / note | Source |
|---|---|---|---|---|
| 1 | PG 18 current minor 18.6; first release 2025-09-25; EOL 2030-11-14; PG 14 EOL 2026-11-12 | confirmed | - | https://www.postgresql.org/support/versioning/ |
| 2 | PG 19 RC1 released 2026-10-15; RC2 2026-11-12; GA planned 2026-11-19 | confirmed | Report marked GA/RC2 "Medium"; it is stated verbatim in the official RC1 announcement, so upgrade to High | https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/ |
| 3 | PGlite npm latest 0.5.10 (2026-10-14); 0.5.9 (2026-10-12) "upgrade to PostgreSQL 18.6"; 0.5.0 (2026-06-02) "Upgrade to Postgres 18.3" | confirmed | - | https://registry.npmjs.org/@electric-sql/pglite ; packages/pglite/CHANGELOG.md (main) |
| 4 | PGlite single connection: "PGlite runs in Postgres single-user mode, which means a single connection"; PGliteWorker leader "handles all queries"; "PGlite is single connection only" | confirmed | Exact wording verified | https://electric.ax/blog/2026/03/25/announcing-pglite-v04 ; https://pglite.dev/docs/multi-tab-worker |
| 5 | REL_18_STABLE src/test/isolation/specs has 127 .spec files incl. simple-write-skew, read-only-anomaly{,-2,-3}, receipt-report, update-conflict-out, temporal-range-integrity | confirmed | - | GitHub contents API, postgres/postgres ref REL_18_STABLE |
| 6 | expected/simple-write-skew.out: 6 permutations, 4 with "could not serialize access" | confirmed | 6 "starting permutation", 4 serialization errors | raw.githubusercontent.com/postgres/postgres/REL_18_STABLE/src/test/isolation/expected/simple-write-skew.out |
| 7 | Hermitage PostgreSQL rows (RC=monotonic atomic view; RR=snapshot isolation allowing G2-item/G2; SER prevents all) | confirmed | Cells match README table exactly | https://github.com/ept/hermitage (README) |
| 8 | Jepsen PostgreSQL 12.3 analysis dated 2020-06-12; SER "exhibited G2-item under normal operation"; bug present in 9.5.22, 10.13, 11.8, 12.3, and 13; fix due "next minor release, on August 13th"; RR "is actually snapshot isolation"; SI "not comparable" with RR (broad) | confirmed | - | https://jepsen.io/analyses/postgresql-12.3 |
| 9 | Fix commit 5940ffb221316ab73e6fdc780dfe9a07d4221ebb | confirmed | Commit exists: "Avoid update conflict out serialization anomalies.", 2020-06-11; hash linked from Jepsen page | https://github.com/postgres/postgres/commit/5940ffb221316ab73e6fdc780dfe9a07d4221ebb |
| 10 | Elle paper: Kingsbury & Alvaro, PVLDB 14(3), 2020 (report: "unverified, from memory") | confirmed | DOI 10.14778/3430915.3430918, PVLDB 14(3), Nov 2020. Can be upgraded from unverified | https://doi.org/10.14778/3430915.3430918 |
| 11 | Plume, OOPSLA 2024, DOI 10.1145/3689742 | confirmed | PACMPL 8(OOPSLA2):876-904, Liu, Gu, Wei, Basin | https://doi.org/10.1145/3689742 |
| 12 | PolySI, PVLDB 16, DOI 10.14778/3583140.3583145 | confirmed | PVLDB 16(6), 2023; title "Efficient Black-Box Checking of Snapshot Isolation in Databases" (PolySI is the tool name) | https://doi.org/10.14778/3583140.3583145 |
| 13 | IsoVista PVLDB 17 p.4325 2024 (Gu, Liu, Xing, Wei, Chen, Basin) | confirmed | Note: a 4-page DEMO paper, PVLDB 17(12):4325-4328, DOI 10.14778/3685800.3685866. "No false positives or missed bugs" goal not checked against the text | Crossref |
| 14 | AWDIT PLDI 2025 (report: unverified) | confirmed (existence/venue) | "AWDIT: An Optimal Weak Database Isolation Tester", Møldrup & Pavlogiannis, PACMPL 9(PLDI), 2025, DOI 10.1145/3742465. Complexity bounds O(n^1.5)/O(n·k) still unverified | https://doi.org/10.1145/3742465 |
| 15 | "Troubadour", OOPSLA 2025, "Checking Observational Correctness of Database Systems" (unverified) | partially confirmed | Paper exists: PACMPL 9(OOPSLA1), 2025, Pick, Xu, Desai, Seshia, Albarghouthi, DOI 10.1145/3720504. Tool name "Troubadour" and "applied to PostgreSQL" remain unverified | https://doi.org/10.1145/3720504 |
| 16 | Ports & Grittner, PVLDB 5(12) 2012 | confirmed | "Serializable snapshot isolation in PostgreSQL", PVLDB 5(12):1850-1861, DOI 10.14778/2367502.2367523 | Crossref |
| 17 | TxCheck OSDI 2023 (Jiang, Liu, Rigger, Su): 56 unique bugs, 52 confirmed, in TiDB, MySQL, MariaDB (Medium) | confirmed | Also "18 already fixed". Upgrade to High | https://www.usenix.org/conference/osdi23/presentation/jiang |
| 18 | PG 18.0 notes: release 2025-09-25; OLD/NEW in RETURNING; virtual generated columns default; uuidv7(); WITHOUT OVERLAPS/PERIOD; NOT ENFORCED CHECK/FK + conenforced; AFTER triggers as queued role; pg_dump --no-policies; initdb checksums default | confirmed | All items found verbatim | https://www.postgresql.org/docs/18/release-18.html |
| 19 | PG 19 RC notes "AS OF 2026-10-09": ON CONFLICT DO SELECT ... RETURNING; JIT off by default; max_locks_per_transaction 64->128; default TOAST lz4 | confirmed | - | https://www.postgresql.org/docs/19/release-19.html |
| 20 | LEAKPROOF: only superusers can mark it (report: "unverified") | confirmed | CREATE FUNCTION docs: "This option can only be set by the superuser." Report should drop the unverified flag | https://www.postgresql.org/docs/18/sql-createfunction.html |
| 21 | SKIP LOCKED quote: "provides an inconsistent view of the data ... queue-like table" | confirmed | Verbatim | https://www.postgresql.org/docs/18/sql-select.html |
| 22 | elle-cli accepts EDN and JSON; needs Java 21 or later | confirmed | README: "Java 21 or later" (bundled Jepsen 0.3.11) | https://github.com/ligurio/elle-cli README |
| 23 | Crates: tokio-postgres 0.7.18, postgres 0.19.14, sqlx 0.9.0, pg_query 6.2.1, testcontainers 0.28.0, postgresql_embedded 0.22.0, deadpool-postgres 0.14.2 (with dates) | confirmed | max_stable_version and updated_at match | https://crates.io/api/v1/crates/<name> |

## Not checked (light mode)
- Spike results (executed by the report author on 18.6; not re-run).
- RLS doc quotes F18/F19 other than LEAKPROOF (not re-fetched; plausible, standard doc text).
- SQLancer oracle list/venues; elle-cli model list; pglite-socket 0.2.13 defaults; Adya definitions (report already flags as from memory; content matches standard Adya 1999 definitions as far as known, but unverified here).
- Remainder of report after §3.2 (course-application text, mostly design reasoning).

## Overall
No false claims found. Several claims the report flagged as "unverified/Medium" are actually verifiable and correct (Elle venue, LEAKPROOF superuser-only, PG 19 GA date, TxCheck numbers, AWDIT venue). One precision fix: IsoVista is a demo paper (4 pages), so it should not be presented as a full research paper.
