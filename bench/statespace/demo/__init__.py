"""The LAB-10 course tools: `statespace demo` (the reference pipeline), `statespace demo record` (the
demonstration recorder) and `statespace proposal draw` (the agent-proposal generator).

curriculum/S10-assembly.md section 3.1 lists them among what the template supplies; spine section 9.6 names
the commands. Every module here is a reference module and earns nothing: the Core a learner wires in
LAB-10.2 and LAB-10.3 is their own, and LAB-10's checks refuse a Core that runs these modules.

| Module | What |
|---|---|
| `lang.py` | the toy syntax, its IR (the program part of IR@1) and the typechecker with the named rules |
| `semantics.py` | the reference interpreter, Inv, and the outcome classes |
| `obligations.py` | the checker: verification conditions in SMT-LIB over a fixed vocabulary, witness decoding, minimization |
| `sqlplan.py` | the compiler to a SQL plan, and the runtime on PostgreSQL at SERIALIZABLE |
| `sim.py` | the simulator under a seeded crash schedule, and the trace lint |
| `proposals.py` | the proposal generator: twins, operators, evidence drawn independently of soundness |
| `corpus.py` | the fixture corpus |
| `pipeline.py` | the pipeline end to end, the key of a proposal, and the report skeleton |
| `adapter.py` | the NDJSON wire to the learner's Core |
| `record.py` | the demonstration recorder (`statespace demo record`) and the replay LAB-10.c7 runs |
| `mutants.py` | LAB-10's Prove-it mutants on the reference components, each with the check rule that kills it |
| `cli.py`, `proposal_cli.py` | the commands |

Importing this package loads no engine; psycopg loads only when a command reaches PostgreSQL.
"""
