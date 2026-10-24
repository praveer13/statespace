# PostgreSQL 18.6 isolation catalog

**Status:** recorded by W0-S09 as RUN-pg-catalog; the decision record is [docs/spikes/W0-S09.md](../../docs/spikes/W0-S09.md). **Not learner copy:** nothing here ships to a learner until the lesson that cites a row cites its run.

The catalog is the set of rows H01 to H24: small concurrent programs, each written as a PostgreSQL `isolationtester` spec, run on PostgreSQL 18.6, with the tester's own output kept beside the spec. Rows H01 to H21 are the rows of research report R4 (section 3.1); H22 to H24 are the three rows that `curriculum/S06-correspondence.md` (section 12) proposes. Every row was run; none is "unrun".

## What is here

| Path | What it is |
|---|---|
| `HNN-name.spec` | an isolationtester spec: `setup`, `teardown`, `session` with `step`s, `permutation` lines. Rows with two specs have a letter (`H06a`, `H06b`, `H12a`, `H12b`, `H22a`, `H22b`). H07, H08 and H21 have no spec of their own: they are PostgreSQL's own specs, run from the source tree. |
| `HNN-name.out` | what isolationtester printed for that spec, unedited, byte for byte |
| `catalog.json` | the index: the server and tester that produced it, for each row its files and their SHA-256, the outcome of every permutation at every level, the research report's expectation and whether it held, the upstream baseline, and the SQLSTATE of every message the server logged |
| `grid/` | the seeded pool behind GEN-anomaly-id: recorded histories by template, and the grid's definition and counts (`grid/grid.json`) |

## Reading a spec and its output

Each session is one connection. A `step` is the SQL that session sends at that point; a `permutation` line is an interleaving. A step named `s1b_ser` is `BEGIN ISOLATION LEVEL SERIALIZABLE`, so the level of a permutation is in its begin steps and in the output. What a session read is kept in a temporary table named `seen`, the client's memory: a session writes a value computed from its own earlier read, as an application would. The session `obs` reads the committed state last.

In an output, `step X: <sql> <waiting ...>` means the step blocked on a lock held by another session, `step X: <... completed>` is its later completion, and `ERROR:  <message>` is an error the step raised. isolationtester does not print the SQLSTATE. The SQLSTATE of each error is in `catalog.json` and in `grid/*.ndjson`, read from the server's own log; every printed error has one, and the run stops if the tester and the log disagree. NULL prints as an empty cell.

A transaction that met an error is an abort, because PostgreSQL ends it there. The `COMMIT` that follows only rolls back, and a later statement in the same transaction fails with 25P02 ("current transaction is aborted"). Those follow-on errors are kept in the outputs and listed apart as `after_abort`.

## Status labels

Research report R4 labelled each row `SPIKE` (run on 2026-10-20), `UPSTREAM` (in PostgreSQL's source tree with an expected output), `DOC` (stated in the manual) or `PROPOSED` (first principles). All 24 are now run here. `catalog.json` keeps R4's label and expectation next to the recorded outcome, with `r4_check` saying whether the expectation held.

## The grid

`grid/grid.json` holds the seed, the generator's specification with test vectors, the three balances, the cell list (each with the SHA-256 of the spec it renders to), and the counts per GEN-anomaly-id template. Each `grid/tN-*.ndjson` has one JSON object per recorded history: its cell, levels, permutation, outcome per session, lock waits, errors with SQLSTATE, the verbatim isolationtester block, and that block's SHA-256. The rows H01, H02, H04, H05, H06b and H22 are the pool's patterns at their canonical numbers.

A history is recorded, never keyed: the class of a history (lost update, write skew, read skew, serialization failure, deadlock, none) is computed at grade time by the history checker. The `observed` and outcome fields only read the recorded values.

## Re-running

`scripts/spikes/W0-S09/` holds the scripts; the decision record lists the commands and the container flags. The tester is built from the PostgreSQL 18.6 source tarball, and the row and grid runners need a PostgreSQL 18.6 server that logs errors as csv. After PostgreSQL 19 reaches general availability (OD-12), run both again and review the diff of every `.out` and every count.
