#!/bin/sh
# One project, as the Bench runs it: build, read the axioms, then judge the solution against the pinned challenge
# with lake comparator, then the step-3 scenarios against the solution's own statement. The container has no
# network and cannot start bwrap, so comparator runs with --inadvisably-no-sandbox, which it reports.
cd "$1"
lake build 2>&1; echo "lake exit=$?"
lake env lean Report.lean 2>&1; echo "report exit=$?"
echo "--- lake comparator"
lake comparator --inadvisably-no-sandbox 2>&1; echo "comparator exit=$?"
echo "--- scenarios"
lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"
