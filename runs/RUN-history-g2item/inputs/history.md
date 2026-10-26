# The three histories of RUN-history-g2item

Each folder holds one history as facts: `committed.facts` (the transactions that committed), `read.facts`
(transaction, key, the version it read) and `write.facts` (transaction, key, the version it wrote). Version 0 is a
key's initial value.

## h1: the toy G2-item history (SP-6.11)

The shape of the anomaly Jepsen reported for PostgreSQL 12.3 under SERIALIZABLE (https://jepsen.io/analyses/postgresql-12.3,
2020-06-12): two transactions each read both keys at their initial versions, each writes one of them, and both
commit. A toy written for this course; Jepsen's own histories were list-append histories with many more operations.

| Fact | Why |
|---|---|
| T1 and T2 committed | both commits succeed in the anomaly |
| T1 and T2 read x and y at version 0 | neither saw the other's write |
| T1 wrote x version 1; T2 wrote y version 1 | each wrote the key the other read |

## h2: RUN-pg-pool-levels, q2-p1 (session b's pool at read committed)

| Fact | Log line it comes from (runs/RUN-pg-pool-levels/q2-p1.log) |
|---|---|
| a and b committed | `step a_commit: COMMIT`, `step b_commit: COMMIT` |
| a read acct1 and acct2 at version 0 | `step a_debit: UPDATE 1`: its guard summed both rows before any debit committed |
| b read acct1 and acct2 at version 0 | `step b_debit: UPDATE 1`: at read committed its guard saw the rows committed when the statement began, and a had not committed (`a_commit` comes after `b_debit`) |
| a wrote acct1 version 1; b wrote acct2 version 1 | the two `UPDATE 1` lines; the check line `[[1, -50], [2, -50]]` |

## h3: RUN-pg-pool-levels, q1-p1 (both pools serializable)

The same reads and writes as h2, but only a committed: `step b_commit:  ERROR 40001: could not serialize access due
to read/write dependencies among transactions`, and the check line `[[1, -50], [2, 100]]`.
