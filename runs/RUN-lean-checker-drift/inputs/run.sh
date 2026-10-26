#!/bin/sh
# run.sh <project>: build the project's Ledger.lean, check its theorem against the pinned statement, then evaluate the
# step-3 scenarios. Every step prints its exit code, so the log carries the verdicts.
p="$1"
lean "$p/Ledger.lean"; echo "lean exit=$?"
cat "$p/Ledger.lean" Pin.lean > /tmp/Pinned.lean
lean /tmp/Pinned.lean; echo "pin exit=$?"
cat "$p/Ledger.lean" "$p/Scen.lean" > /tmp/Scen.lean
lean /tmp/Scen.lean; echo "scenarios exit=$?"
