#!/bin/sh
# One project, as the Bench runs it: build, read the axioms, replay every declaration in the kernel, then the
# step-3 scenarios against the project's own theorem statement.
cd "$1"
lake build 2>&1; echo "lake exit=$?"
lake env lean Report.lean 2>&1; echo "report exit=$?"
echo "--- leanchecker Refunds"
lake env leanchecker Refunds 2>&1; echo "leanchecker exit=$?"
echo "--- scenarios"
lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"
