#!/bin/sh
# One project, as the Bench runs it: build, read the axioms, replay every declaration in the kernel.
cd "$1"
lake build 2>&1; echo "lake exit=$?"
lake env lean Report.lean 2>&1; echo "report exit=$?"
echo "--- leanchecker Ledger"
lake env leanchecker Ledger 2>&1; echo "leanchecker exit=$?"
if [ -f Scenarios.lean ]; then echo "--- scenarios"; lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"; fi
