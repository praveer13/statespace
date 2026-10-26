# labs/reference/mini-plinth: the course side of LAB-3

The Lean reference semantics itself ships to learners, read-only, as `labs/LAB-3/reference/MiniPlinthRef/`
(curriculum/S03-semantics.md section 1.1, item 8: a pinned module that learner semantics may not import). This
folder holds what the course runs on it and does not ship:

| File | What |
|---|---|
| `build_goldens.py` | draws the golden pool from a seed, computes every right-hand side with the reference in the Bench image, kernel-checks every golden against it, and writes `labs/LAB-3/challenge/goldens.json`; it prints the pool's hash, which `bench/statespace/labs/lab3.py` pins (`POOL_SHA256`). `scripts/build-goldens.mjs` runs it |
| `build_corpus.mjs` | writes the expected IR of the parser corpus (`labs/LAB-3/corpus/pos/*.json`) with the course's front end (`packages/interp`), and checks every negative file is rejected at its line |
| `PostingsRefine.lean` | CL-3.4: the reference's postings refine Stage 2's ledger, and the self-transfer outside the square |
| `record_runs.py` | records LAB-3's runs (`runs/RUN-lean-bigsmall.json` and the rest) from the Bench image and Node |

The pool is IR@1 (`schemas/ir.schema.json`): one golden per input and policy, 16 policies, with strata (command,
outcome class, boundary) and, for each, the statement hash of the learner-side theorem. The renderer that turns
a golden into Lean is the one the learner's check uses, so the text the course kernel-checked is the text the
learner's repository builds.

Reference solutions never enter this repository. `record_runs.py --private DIR` reads them from the private
companion and records them by name and SHA-256 only; the full proof of the lab against them is
`node scripts/labs/prove-labs.mjs LAB-3 --solutions DIR` inside the Bench image (LAB-3 needs Lean and cargo).

Rebuild after a change to the reference or the template's core:

```
python3 labs/reference/mini-plinth/build_goldens.py      # then paste the printed hash into lab3.py's POOL_SHA256
node labs/reference/mini-plinth/build_corpus.mjs
node --test packages/interp/test/*.test.ts               # GATE-interp
```
