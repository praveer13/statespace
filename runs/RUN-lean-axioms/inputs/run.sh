#!/bin/sh
# run.sh <config>. lean-bad and check-bad re-run the imported lean-measure project (research/evidence/lean-measure/
# proj/ledger): lean on Bad.lean, and lake check with Bad.lean imported (the container cannot start bwrap, so lake
# check runs with --inadvisably-no-sandbox, as the imported log's "Sandbox disabled" line shows the original did).
# trust-probe re-runs the imported a2r3 probe project. sound and flawed are AUD-2.2's pair: build, read the axioms,
# replay every declaration in the kernel, then the step-3 scenarios.
case "$1" in
  lean-bad)
    cd ledger
    lake env lean Ledger/Bad.lean 2>&1; echo "lean-bad exit=$?" ;;
  check-bad)
    cd ledger
    printf 'import Ledger.Basic\nimport Ledger.Bad\n' > Ledger.lean
    lake check --inadvisably-no-sandbox 2>&1; echo "check exit=$?" ;;
  trust-probe)
    cd probe
    lake build 2>&1; echo "lake exit=$?"
    lake env lean Report.lean 2>&1; echo "report exit=$?" ;;
  *)
    cd "$1"
    lake build 2>&1; echo "lake exit=$?"
    lake env lean Report.lean 2>&1; echo "report exit=$?"
    echo "--- leanchecker Ledger"
    lake env leanchecker Ledger 2>&1; echo "leanchecker exit=$?"
    if [ -f Scenarios.lean ]; then echo "--- scenarios"; lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"; fi ;;
esac
