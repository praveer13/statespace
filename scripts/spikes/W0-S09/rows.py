"""W0-S09: the catalog rows H01-H24 as the research report states them (R4, section
3.1), the spec files that record each here, the upstream isolationtester specs that
corroborate it, and what was run before. The recorded outcomes are not here: they
are read from the outputs by run_catalog.py. `r4_check` is filled in by hand after
reading them, and says whether the report's expectation held."""

# status labels as R4 defines them: SPIKE executed 2026-10-20, UPSTREAM in
# REL_18_STABLE with an expected output, DOC stated in the manual, PROPOSED first
# principles.

ROWS = [
    {
        "id": "H01", "title": "Lost update through application read-modify-write",
        "adya": "P4 (lost update)", "r4_status": "SPIKE (RC, RR); SER was DOC",
        "files": ["H01-lost-update-rmw"], "upstream": [],
        "executed_before": ["RUN-pg-anomalies", "RUN-pg-claims"],
        "r4": {"READ COMMITTED": "both commit; final 20; 160 spent from 100",
               "REPEATABLE READ": "s2: 40001 'could not serialize access due to concurrent update'",
               "SERIALIZABLE": "40001 (expected)"},
        "r4_check": {"verdict": 'agrees', "note": "READ COMMITTED: both commit, final 20, the second debit's write returns 20 -> 20. SERIALIZABLE, only expected before, is recorded: 40001."},
    },
    {
        "id": "H02", "title": "Conditional single-statement UPDATE",
        "adya": "not an anomaly at READ COMMITTED", "r4_status": "SPIKE (RC); RR and SER were expected",
        "files": ["H02-conditional-update"], "upstream": ["eval-plan-qual"],
        "executed_before": ["RUN-pg-anomalies", "RUN-pg-claims"],
        "r4": {"READ COMMITTED": "s2 updates 0 rows; final 20",
               "REPEATABLE READ": "s2: 40001 (expected)", "SERIALIZABLE": "40001 (expected)"},
        "r4_check": {"verdict": 'agrees', "note": 'READ COMMITTED: the waiting statement updates 0 rows. REPEATABLE READ and SERIALIZABLE, only expected before, are recorded: 40001.'},
    },
    {
        "id": "H03", "title": "READ COMMITTED re-check misses a matching row",
        "adya": "a non-serializable result without a lost write", "r4_status": "DOC",
        "files": ["H03-recheck-misses-a-row"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "DELETE removes 0 rows; a hits=10 row exists before and after",
               "REPEATABLE READ": "s2 40001 (expected)", "SERIALIZABLE": "40001 (expected)"},
        "r4_check": {"verdict": 'agrees', "note": 'READ COMMITTED: the DELETE removes 0 rows and a hits = 10 row exists before and after. REPEATABLE READ and SERIALIZABLE: 40001.'},
    },
    {
        "id": "H04", "title": "Read skew",
        "adya": "G-single", "r4_status": "DOC (Hermitage)",
        "files": ["H04-read-skew"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "the reader sees a total of 250",
               "REPEATABLE READ": "the reader sees 200", "SERIALIZABLE": "the reader sees 200"},
        "r4_check": {"verdict": 'agrees', "note": "The reader's two reads total 250 at READ COMMITTED and 200 at REPEATABLE READ and SERIALIZABLE."},
    },
    {
        "id": "H05", "title": "Write skew on existing rows",
        "adya": "G2-item", "r4_status": "SPIKE (RR, SER)",
        "files": ["H05-write-skew-team-sum"], "upstream": ["simple-write-skew"],
        "executed_before": ["RUN-pg-anomalies"],
        "r4": {"READ COMMITTED": "both commit; total -100", "REPEATABLE READ": "both commit; total -100",
               "SERIALIZABLE": "s2: 40001; total 50"},
        "r4_check": {"verdict": 'agrees', "note": 'Both commit at READ COMMITTED and REPEATABLE READ with a team total of -100; at SERIALIZABLE the second committer fails with 40001 and the total is 50.'},
    },
    {
        "id": "H06", "title": "Predicate write skew through INSERT",
        "adya": "G2", "r4_status": "DOC",
        "files": ["H06a-predicate-write-skew-mytab", "H06b-predicate-write-skew-holds"],
        "upstream": ["classroom-scheduling"], "executed_before": ["RUN-pg-claims (holds, one interleaving)"],
        "r4": {"READ COMMITTED": "both commit", "REPEATABLE READ": "both commit",
               "SERIALIZABLE": "one fails, read/write dependencies"},
        "r4_check": {"verdict": 'agrees', "note": 'Both commit at READ COMMITTED and REPEATABLE READ (160 held against 100); at SERIALIZABLE one fails with 40001 and 80 stays held.'},
    },
    {
        "id": "H07", "title": "Read-only anomaly (Fekete, O'Neil)",
        "adya": "read-only transaction anomaly", "r4_status": "UPSTREAM",
        "files": [], "upstream": ["read-only-anomaly", "read-only-anomaly-2", "read-only-anomaly-3"],
        "executed_before": [],
        "r4": {"READ COMMITTED": "(not tested)",
               "REPEATABLE READ": "s3 sees a state inconsistent with every serial order",
               "SERIALIZABLE": "-2.spec: error; -3.spec: DEFERRABLE s3 waits"},
        "r4_check": {"verdict": 'agrees', "note": 'Run from the upstream specs: REPEATABLE READ gives s3 a state no serial order shows; SERIALIZABLE aborts s2 with 40001 (-2); DEFERRABLE makes s3 wait (-3).'},
    },
    {
        "id": "H08", "title": "Receipt report and its false positives",
        "adya": "SSI false positives", "r4_status": "UPSTREAM",
        "files": [], "upstream": ["receipt-report"], "executed_before": [],
        "r4": {"SERIALIZABLE": "READ ONLY s3: exactly 6 permutations must fail; as READ WRITE: '42 false positives' (spec comment)"},
        "r4_check": {"verdict": 'agrees', "note": '6 of 210 permutations fail with s3 READ ONLY; the READ WRITE variant is measured here, not read from the spec comment.'},
    },
    {
        "id": "H09", "title": "Phantom",
        "adya": "P3", "r4_status": "DOC",
        "files": ["H09-phantom"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "3", "REPEATABLE READ": "2", "SERIALIZABLE": "2"},
        "r4_check": {"verdict": 'agrees', "note": 'The second count is 3 at READ COMMITTED, 2 at REPEATABLE READ and SERIALIZABLE.'},
    },
    {
        "id": "H10", "title": "Mixed levels void the guarantee",
        "adya": "scope of the SERIALIZABLE guarantee", "r4_status": "DOC (scope quote); outcome PROPOSED",
        "files": ["H10-mixed-levels"], "upstream": [], "executed_before": [],
        "r4": {"SERIALIZABLE": "both commit (expected)"},
        "r4_check": {"verdict": 'agrees', "note": 'With one session SERIALIZABLE and the other READ COMMITTED both commit, in both assignments and both commit orders; with both SERIALIZABLE one fails with 40001.'},
    },
    {
        "id": "H11", "title": "SERIALIZABLE false positive from a relation-level predicate lock",
        "adya": "SSI false positive", "r4_status": "DOC; PROPOSED",
        "files": ["H11-false-positive-predicate-lock"], "upstream": [], "executed_before": [],
        "r4": {"SERIALIZABLE": "40001 possible without a real conflict"},
        "r4_check": {"verdict": 'agrees', "note": 'A sequential scan aborts a SERIALIZABLE transaction that shares no row with the other; the same transactions on an index scan over distant keys both commit.'},
    },
    {
        "id": "H12", "title": "23505 and 23P01 under SERIALIZABLE",
        "adya": "constraint violation in place of a serialization failure", "r4_status": "DOC",
        "files": ["H12a-unique-violation-under-serializable", "H12b-exclusion-violation-under-serializable"],
        "upstream": ["read-write-unique", "read-write-unique-2", "read-write-unique-3", "read-write-unique-4"],
        "executed_before": [],
        "r4": {"SERIALIZABLE": "unique violation possible"},
        "r4_check": {"verdict": 'agrees, with additions', "note": '23505 and 23P01 appear under SERIALIZABLE; which of 40001 and 23505 appears depends on whether the failing session checked first and on the order, and a whole-command retry with a re-check ends without error where a blind retry fails again.'},
    },
    {
        "id": "H13", "title": "ON CONFLICT DO UPDATE on an invisible row",
        "adya": "statement acts on a row its snapshot cannot see", "r4_status": "DOC + UPSTREAM",
        "files": ["H13-on-conflict-do-update-invisible-row"],
        "upstream": ["insert-conflict-do-update", "insert-conflict-do-update-2", "insert-conflict-do-update-3",
                     "insert-conflict-do-update-4", "insert-conflict-do-nothing", "insert-conflict-do-nothing-2"],
        "executed_before": [],
        "r4": {"READ COMMITTED": "updates even though 'no version ... conventionally visible'"},
        "r4_check": {"verdict": 'agrees', "note": 'READ COMMITTED: the statement waits, then updates the row it could not see. REPEATABLE READ and SERIALIZABLE: 40001.'},
    },
    {
        "id": "H14", "title": "MERGE gives no insert-or-update guarantee",
        "adya": "MERGE and concurrent inserts", "r4_status": "DOC + UPSTREAM",
        "files": ["H14-merge-no-insert-or-update-guarantee"],
        "upstream": ["merge-insert-update", "merge-update"], "executed_before": [],
        "r4": {"READ COMMITTED": "neither action guaranteed; duplicate insert gives 23505"},
        "r4_check": {"verdict": 'agrees', "note": 'READ COMMITTED: 23505, no restart. REPEATABLE READ: 23505. SERIALIZABLE: 40001.'},
    },
    {
        "id": "H15", "title": "SKIP LOCKED gives an inconsistent view",
        "adya": "queue claims", "r4_status": "DOC + UPSTREAM",
        "files": ["H15-skip-locked-inconsistent-view"],
        "upstream": ["skip-locked", "skip-locked-2", "skip-locked-3", "skip-locked-4"], "executed_before": [],
        "r4": {"READ COMMITTED": "disjoint claims; aggregate reads are meaningless"},
        "r4_check": {"verdict": 'agrees', "note": 'Disjoint claims at all three levels; the count through SKIP LOCKED is 0 while 4 jobs are pending.'},
    },
    {
        "id": "H16", "title": "ORDER BY with FOR UPDATE returns rows out of order",
        "adya": "locking read after the sort", "r4_status": "DOC",
        "files": ["H16-order-by-for-update-out-of-order"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "rows out of order", "REPEATABLE READ": "40001", "SERIALIZABLE": "40001"},
        "r4_check": {"verdict": 'agrees', "note": 'READ COMMITTED returns the rows out of order; REPEATABLE READ and SERIALIZABLE raise 40001; FOR UPDATE in a subquery returns them in order.'},
    },
    {
        "id": "H17", "title": "Row-level security policy-subquery race",
        "adya": "enforcement is not noninterference under concurrency", "r4_status": "DOC",
        "files": ["H17-rls-policy-subquery-race"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "mallory can see 'secret from mallory'",
               "REPEATABLE READ": "(expected prevented)", "SERIALIZABLE": "(expected prevented)"},
        "r4_check": {"verdict": 'agrees', "note": "READ COMMITTED: mallory sees 'secret from mallory'. REPEATABLE READ and SERIALIZABLE: her locking read fails with 40001, so it is prevented by failure."},
    },
    {
        "id": "H18", "title": "NULL in three kinds of predicate",
        "adya": "three-valued logic", "r4_status": "SPIKE (CHECK, WHERE) + DOC (WITH CHECK)",
        "files": ["H18-null-in-three-predicates"], "upstream": [],
        "executed_before": ["RUN-pg-anomalies", "RUN-pg-claims"],
        "r4": {"READ COMMITTED": "accepted / NULL row skipped / error", "REPEATABLE READ": "same",
               "SERIALIZABLE": "same"},
        "r4_check": {"verdict": 'agrees', "note": 'CHECK accepts NULL, the guarded UPDATE skips the NULL row, USING hides it, WITH CHECK raises 42501; the same at all three levels.'},
    },
    {
        "id": "H19", "title": "bigint overflow refused",
        "adya": "numeric range", "r4_status": "SPIKE",
        "files": ["H19-bigint-overflow-refused"], "upstream": [],
        "executed_before": ["RUN-pg-anomalies", "RUN-pg-claims"],
        "r4": {"READ COMMITTED": "22003 'bigint out of range'", "REPEATABLE READ": "same", "SERIALIZABLE": "same"},
        "r4_check": {"verdict": 'agrees', "note": "22003 'bigint out of range' at all three levels; the balance is unchanged; sum(bigint) is numeric."},
    },
    {
        "id": "H20", "title": "High-water-mark poller skips a late commit",
        "adya": "visibility order differs from id order", "r4_status": "PROPOSED",
        "files": ["H20-high-water-mark-skips-late-commit"], "upstream": [], "executed_before": [],
        "r4": {"READ COMMITTED": "row 1 never delivered", "REPEATABLE READ": "(same for poller)",
               "SERIALIZABLE": "(same)"},
        "r4_check": {"verdict": 'agrees', "note": 'Row 1 is never delivered: the mark is 2, both ids exist, the next poll returns nothing; the same at all three levels.'},
    },
    {
        "id": "H21", "title": "SERIALIZABLE once allowed G2-item (9.5.22 to 13, 2020)",
        "adya": "historical bug and its regression test", "r4_status": "UPSTREAM",
        "files": [], "upstream": ["update-conflict-out"], "executed_before": [],
        "r4": {"SERIALIZABLE": "fixed; spec must pass"},
        "r4_check": {"verdict": 'agrees', "note": "Both permutations of the regression test end with bar's 40001, the output the upstream file expects."},
    },
    {
        "id": "H22", "title": "Opposite-order moves, and the ascending-order fix",
        "adya": "deadlock (lock-order cycle)", "r4_status": "proposed by S6 (spec section 12)",
        "files": ["H22a-opposite-order-moves", "H22b-ascending-order-moves"], "upstream": ["deadlock-simple"],
        "executed_before": ["RUN-pg-claims (opposite order at READ COMMITTED)"],
        "r4": {"READ COMMITTED": "ascending order: both commit (expected)"},
        "r4_check": {"verdict": 'differs', "note": 'Ascending order removes the deadlock and both commit at READ COMMITTED. At REPEATABLE READ and SERIALIZABLE, 4 of the 6 ascending-order permutations still fail with 40001 (first updater wins), so ordering is no substitute for the retry.'},
    },
    {
        "id": "H23", "title": "SERIALIZABLE holds, B retried from BEGIN after 40001",
        "adya": "whole-command retry", "r4_status": "proposed by S6 (spec section 12)",
        "files": ["H23-serializable-holds-retry"], "upstream": [], "executed_before": [],
        "r4": {"SERIALIZABLE": "B's guard refuses; nothing written (expected)"},
        "r4_check": {"verdict": 'agrees', "note": "B's COMMIT fails with 40001; its retry reads 20 available, the guard refuses (0 rows) and nothing is written."},
    },
    {
        "id": "H24", "title": "Conditional UPDATE at REPEATABLE READ and SERIALIZABLE, 40001 then a whole-command retry",
        "adya": "whole-command retry", "r4_status": "proposed by S6 (spec section 12)",
        "files": ["H24-conditional-update-retry"], "upstream": [], "executed_before": [],
        "r4": {"REPEATABLE READ": "0 rows on the retry (expected)", "SERIALIZABLE": "0 rows on the retry (expected)"},
        "r4_check": {"verdict": 'agrees', "note": 'REPEATABLE READ and SERIALIZABLE: B fails with 40001 and its retry updates 0 rows. READ COMMITTED: no error, 0 rows.'},
    },
]

# Upstream specs (PostgreSQL 18.6 source tree, src/test/isolation/specs) that are run
# as the baseline. receipt-report's expected output assumes pg_regress's DateStyle.
UPSTREAM_DATESTYLE = {"receipt-report": "Postgres, MDY"}


# A variant is an upstream spec with a literal edit, made at run time and never
# written to the repository (so no upstream text is copied).
UPSTREAM_VARIANTS = {
    "receipt-report-s3-read-write": {
        "of": "receipt-report",
        "edits": [("BEGIN ISOLATION LEVEL SERIALIZABLE, READ ONLY;", "BEGIN ISOLATION LEVEL SERIALIZABLE;")],
        "what": "session s3 declared READ WRITE instead of READ ONLY",
    },
}


def upstream_names():
    seen = []
    for r in ROWS:
        for u in r["upstream"]:
            if u not in seen:
                seen.append(u)
    # the receipt-report variant needs no extra upstream name; it is derived at run time
    return seen
