"""Tests of the Bench CLI core (W1-T29): the Z3 lane, `check`, `receipt verify`, `hash`, `run`, `export`.

Run from the repository root with the pinned engine:

    uv run --project bench --locked --group image python -I -m unittest discover -s bench/statespace/check/tests -t bench

Tests that need Z3 skip when it is not installed, and the re-execution of RUN-z3-starter skips without uv.
"""
