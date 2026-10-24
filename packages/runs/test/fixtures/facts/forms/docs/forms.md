# A fixture of GATE-facts: every reference form

Fixture for `node scripts/verify-facts.mjs --self-check`; not course content. The records under `runs/` are verbatim copies of the registry's. Each paragraph below is one case; `expected.json` lists the findings the gate must report, by line.

## Value tags that their sentences state

Z3 5.3.1 answers `sat` on the roadmap's starter [X RUN-z3-starter#values.starter].

Its model is `[b = 0, amount = 1, a = 0]` [X RUN-z3-starter#values.model].

The starter gives `sat`, and the guarded query `unsat` [X RUN-z3-starter#values.starter, RUN-z3-starter#values.guarded].

The Alethe proof has 19 lines, 3 of them `hole` steps [X RUN-cvc5-alethe#values.proof_lines, RUN-cvc5-alethe#values.hole_steps].

The pip wheel prints its version as 1.4.2-modified [X RUN-cvc5-alethe#values.version_printed].

Z3 v5.3.1 ran the starter [X RUN-z3-starter#values.version].

Spectacle's two-worker counterexample is a 5-state trace [X RUN-spectacle#values.trace_length_w2].

## Value tags that their sentences do not state

The pip wheel prints its version as 1.4.2 [X RUN-cvc5-alethe#values.version_printed].

On the guarded query Z3 answers `sat` [X RUN-z3-starter#values.guarded].

On the starter Z3 answers `unsat` [X RUN-z3-starter#values.starter].

Spectacle's two-worker counterexample is a 15-state trace [X RUN-spectacle#values.trace_length_w2].

The first-load size on a phone is 5 MB [X RUN-phone-pyodide#values.first_load_bytes].

## Value references

The two-worker trace has {{run:RUN-spectacle#values.trace_length_w2}} states.

The two-worker trace has {{run:RUN-spectacle#values.trace_length_w2}} states, as the tag says [X RUN-spectacle#values.trace_length_w2].

Spectacle's counts are {{run:RUN-spectacle#values.distinct_states}}.

Chromium's rates are {{run:RUN-spectacle#values.states_per_s.chromium}}.

The trace has {{run:RUN-spectacle#outputs.values.trace_length_w2}} states.

The record has {{run:RUN-spectacle#values.no_such_value}}.

A phone loads {{run:RUN-phone-pyodide#values.first_load_bytes}} bytes on its first visit.

## Citations, placeholders and fact references

Spectacle matches TLC on the double-spend family [X RUN-spectacle].

The forms are `[X RUN-id#values.<name>]` in documents and `{{run:RUN-id#values.<name>}}` in copy, and `{{fact:<id>}}` for a fact.

The tab loads Pyodide {{fact:tool.pyodide.latest}}.

The tab loads Pyodide {{fact:tool.no-such.fact}}.

## A value tag after its sentence's full stop

Spectacle's two-worker trace has 5 states. [X RUN-spectacle#values.trace_length_w2]
