# LAB-7, authz-flow

Your read policy goes from Datalog to a solver to the database, and then you check what enforcement
leaves open. Stage text, minutes and check ids are on the lab's page; `uv run statespace check` lists the
stages and checks here. Each stage ends in `uv run statespace check lab7.<k>`, which writes a receipt under
`receipts/LAB-7.<k>/` that you import on the lab's page.

| Stage | You write | The course supplies |
|---|---|---|
| LAB-7.1 | your call, `predict/lab7.1.txt` | `reference/toy.dl` and its facts; `reference/ss_datalog.py`, the tab engine's adapter |
| LAB-7.2 | `policy/read.dl` | the declarations; the world generator and the reference matrix (in the check) |
| LAB-7.3 | `policy/read.smt2` | `claims/no-cross-tenant.smt2`, pinned: the vocabulary, WF1 to WF3 and the policy |
| LAB-7.4 | `rls/policies.sql` | `rls/schema.sql`: tables, `app.user_teams()`, the UPDATE and INSERT policies; the harness |
| LAB-7.5 | `checker/src/noninterference.rs`, `claims/observer.yaml` | `checker/src/lib.rs` and `main.rs`: the view reader and `encode_view_body`; `views/open.view` |
| LAB-7.6 | `monitors/src/s_new.rs`, `monitors/src/s_past.rs` | `monitors/src/lib.rs` and `main.rs`: the trace reader; `claims/revocation.yaml`, pinned |
| LAB-7.7 | `claims/declassify.yaml`, `broken/open.view`, `fixed/open.view`, the four cards `claims/cl-7-*.yaml` | the card templates |
| LAB-7.8 | optional: an Alloy model (drawer D-16) or query containment (drawer D-17); no check | — |

**Where it runs.** Every stage runs on the Bench: Soufflé, Z3, cvc5, cargo and the PostgreSQL service of
the devcontainer. LAB-7.4 connects through `STATESPACE_PG_DSN`, which the devcontainer sets, and needs
psycopg, which the repository's `pyproject.toml` pins at the Bench's version {{run:RUN-scaffold}}, so `uv run statespace check lab7.4` has it. LAB-7.5 and LAB-7.6 are
also graded in the tab, where your Rust runs as wasm on fresh seeds.

**Course modules earn nothing.** `reference/`, `rls/schema.sql`, `checker/src/lib.rs`, `checker/src/main.rs`,
`monitors/src/lib.rs` and `monitors/src/main.rs` are the course's. A check refuses a changed copy of the
adapter or of a pinned statement; restore it from this zip.

**Broken beside fixed.** LAB-7.7 keeps the leaky view in `broken/` beside its cure in `fixed/`. Nothing in
`broken/` is ever deleted.
