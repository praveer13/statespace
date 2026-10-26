#!/bin/sh
# run.sh <project>: build the project's Pay.lean, then evaluate the step-3 scenarios on the same model.
p="$1"
lean "$p/Pay.lean"; echo "lean exit=$?"
cat "$p/Pay.lean" "$p/Scen.lean" > /tmp/Scen.lean
lean /tmp/Scen.lean; echo "scenarios exit=$?"
