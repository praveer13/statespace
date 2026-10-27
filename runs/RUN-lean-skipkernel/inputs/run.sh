#!/bin/sh
# run.sh <config>: one project as the Bench runs it. probe is the research/ project RUN-lean-skipkernel imported
# (research/evidence/a2r3/lean/proj); sound and flawed are AUD-2.3's pair. Build, read the axioms, replay every
# declaration in the kernel.
cd "$1"
lib=Ledger; [ "$1" = probe ] && lib=Probe
lake build 2>&1; echo "lake exit=$?"
lake env lean Report.lean 2>&1; echo "report exit=$?"
echo "--- leanchecker $lib"
lake env leanchecker $lib 2>&1; echo "leanchecker exit=$?"
if [ -f Scenarios.lean ]; then echo "--- scenarios"; lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"; fi
