# content/specimens/

The specimen records of the course: one `statespace/specimen@1` JSON file per specimen, named for its ID (`SP-1.1.json`). They are the words and the pointers behind SCR-specimens, the specimen cabinet (`apps/site/src/screens/specimens/README.md`). Content is CC BY 4.0 (OD-16).

A record is short because a label is generated from the runs, never typed (DESIGN.md section 6.5). It holds:

- **pointers**: for each piece of evidence, the run (`RUN-…`) and the query in it, by the label that begins the query's verdict line in the run record (`[1.2 starter: overdraft search] sat [...]` is pointed at as `1.2 starter: overdraft search`). A sat that a label shows replays: its own lines say `replay ok:` (the W1 Z3 harnesses print one under every sat), or the record names the query of a run that replays its witness (`replay`);
- **words**: `violates`, `because`, `class`, `cured_by`, each a line or two; `title`, the specimen's name in the spine's words; `kcs`, the ideas the specimen teaches; `found_in`, the lesson (or, for a learner's own specimen, the lab stage); `mount.lessons`, the lessons whose first call mounts it, the one that finds it among them;
- **for a dated incident**, `incident`: the date, a public source (an https address and its title) and `toy_model: true`. The specimen is a toy model of the mechanism and never the incident's code.

It never holds a stamp, a tool version, a witness, a date of a run, or a status: the schema refuses each of them as an unknown field (`schemas/fixtures/specimen/invalid/`), because each is something a run, or the learner's own events, can say. A record that wants to say one of them points at the run instead.

The one number a record may state is `evidence.main.steps`, the length of the witness when it is more than one step. A run prints a model and never its length, so the record says it and the build holds the statement to the model: the length is read from the witness's own primed variables (`x_p` is x′, one step after x, and `x_pp` is x″, two steps; D-04), and the label takes it from there and never from the record. A length that is not the witness's, or one left out over a witness of several steps, is a finding. Absent means one transfer. A run whose model names its chain another way reads as one step, so a record that states more is refused until the run names its primes this way.

## The ten of S1

| ID | Name | Found in | Mounted by the first call in | Runs behind it |
|---|---|---|---|---|
| SP-1.1 | The overdraft | S1.L1 | S1.L0, S1.L1 | RUN-z3-starter, RUN-z3-optimize-min, RUN-z3-boot-variant, and RUN-specimens-replay for the replay |
| SP-1.2 | Double capture | S1.L4 | S1.L4 | RUN-z3-double-capture |
| SP-1.3 | A refund rule that mints money | S1.L4 | S1.L4 | RUN-z3-refund-mint |
| SP-1.4 | The guard protects the sender, not the recipient | S1.L5 | S1.L5 | RUN-z3-bv64, RUN-z3-bv64-pyodide, and RUN-specimens-replay |
| SP-1.5 | A guard mixing unsigned and signed comparisons readmits the overdraft | S1.L5 | S1.L5 | RUN-z3-bv64, and RUN-specimens-replay |
| SP-1.6 | "unsat, therefore safe" over contradictory premises | S1.L3 | S1.L3 | RUN-z3-vacuous-unsat |
| SP-1.7 | A reason-stable unknown | S1.L2 | S1.L2 | RUN-z3-unknown-pow |
| SP-1.8 | Tool trust | S1.L2 | S1.L2 | RUN-z3-budget-pyodide, RUN-phone-pyodide |
| SP-1.9 | Bitcoin CVE-2010-5139, values that overflowed when summed (dated incident) | S1.L5 | S1.L5 | RUN-z3-btc2010 |
| SP-1.10 | Bloch 2006, the binary-search midpoint overflow (dated incident) | S1.L5 | S1.L5 | RUN-z3-bloch06 |

The IDs, names, lessons and runs are the spine's (section 5.1, table of specimens); the builder checks each record against that table. GATE-specimens (W1-T42, nightly) re-executes the run record behind each specimen on the engine it names and requires every verdict line to come back, and requires that once any specimen of a stage is mounted every one of that stage is, each citing the runs the spine names.

## Adding or changing a specimen

1. Record the run, if it does not exist, so that each query the label needs has its own verdict line. A sat needs a witness that replays: the W1 Z3 harnesses print a `replay ok:` line under every sat; a run that prints none gets its replay recorded in a run of its own (`scripts/spikes/W1-T16/README.md`, RUN-specimens-replay).
2. Write the record. Keep the words short and in the learner's terms: "your system", the glossary's terms, and no tool number or version stated as a fact: those are on the label, drawn from the run. Words that say what a result means ("has no witness") sit beside the block that shows it, and keeping them true is the reviewer's work in step 4: the build checks a sentence's run chips and its internal names, and not what it says about a result. No internal name either: the builder refuses the ones `content/glossary.yaml` lists under `internal` (learners see "Start here", never the tier name; "idea", never the knowledge-component term) and the ID of a knowledge component, a gate, a generator or a task. A sentence that cites a run writes it as `{{run:RUN-id}}`; a value of a run is never written into a record.
3. `node scripts/spikes/W1-T16/build-cabinet.mjs` resolves the pointers and writes the cabinet the site loads. It names every pointer that does not say what the label needs, and writes nothing while it has a finding. A file here that is not a JSON record is a finding too.
4. Review the diff of `apps/site/src/screens/specimens/data/cabinet.generated.json`. When a run is recorded again its lines change, and the diff shows what the label will now say; a tool bump that changes a verdict reaches the label only through this review.
5. Leave `draft: true` until the owner and learner-zero have been through the label; the screen says "Draft: first-learner pass pending." while any listed specimen is a draft.

A record whose id is not in the spine's table is a learner's own specimen (the lab repository holds those) and has no `mount`: its lab check mounts it.

## What checks these files

| Check | What it holds the records to |
|---|---|
| GATE-schema | every record is specimen@1, by the TypeScript validator and by Python's (it reads every file that declares the schema) |
| GATE-specimens (W1-T42) | the files and the runs they cite, as above |
| GATE-kc | each `kcs` entry is a KC of the graph (it reads `content/specimens/`) |
| GATE-links | each ID a record spells (a run, a KC, a lesson, a claim) is a registered one; a run that is registered and not recorded is not its concern |
| GATE-runs | each `{{run:RUN-id}}` in the words resolves to a recorded run, which the release lane requires; it reads that form and `[X RUN-id]`, and never the `run` pointers of the evidence |
| `scripts/spikes/W1-T16/build-cabinet.mjs --check` and its tests | each run a record cites is recorded and each pointer says what the label needs; the words hold no internal name; the cabinet is what these records and the runs build; the planted faults it refuses. Run it before committing a record; which lane runs it is the integrator's call (`scripts/spikes/W1-T16/README.md`) |
