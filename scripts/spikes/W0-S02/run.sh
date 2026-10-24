#!/usr/bin/env bash
# W0-S02: end-to-end runner for the emulated part of RUN-phone-pyodide.
#
#   scripts/spikes/W0-S02/run.sh <work-dir> [--record]
#
# Environment: TIERS (default "20,1,0.5,0.25": CPUs the container may use; 20 means no quota), ENGINES
# (default chromium,firefox,webkit), REPEAT (default 3), PLAN_MATRIX=1, PLAN_EXTRAS=1, PLAN_LINK=1 and PLAN_UI=1 (all default
# on), SMOKE_PLAN=quick|full1|matrix|extras|link|ui with SMOKE_CPUS (one container, one plan, to test the setup).
#
# Steps: install playwright-core 1.63.0 into <work-dir>/node (from this folder's package.json); fetch and verify
# Pyodide 314.0.7 and the z3_solver 5.3.1.0 wheel; build the two sites; for each CPU tier run the harness in a
# container from the pinned Playwright image, capped to that many CPUs by a CFS quota with a 10 ms period (the
# quota reaches every browser thread and the worker, which DevTools CPU throttling does not); with --record, write
# runs/RUN-phone-pyodide.json and runs/RUN-phone-pyodide/. Needs Node 22+, npm and Docker on the host.
#
# For the real-device part, see docs/spikes/W0-S02.md section 7: `node scripts/spikes/W0-S02/server.mjs --phone`
# after a build, or the real origins with build.mjs --main <origin> --inst <origin>.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
WORK=${1:?usage: run.sh <work-dir> [--record]}
MODE=${2:-}
IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
TIERS=${TIERS:-20,1,0.5,0.25}
ENGINES=${ENGINES:-chromium,firefox,webkit}
REPEAT=${REPEAT:-3}
mkdir -p "$WORK/node"
WORK=$(cd "$WORK" && pwd)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_REL="out/$STAMP"

cp "$HERE/package.json" "$WORK/node/package.json"
(cd "$WORK/node" && npm install --no-audit --no-fund --loglevel=error > /dev/null)
node "$HERE/fetch-engines.mjs" "$WORK/engines" > /dev/null
node "$HERE/build.mjs" "$WORK/engines" "$WORK/build" > "$WORK/build.txt"
cat "$WORK/build.txt"
mkdir -p "$WORK/$OUT_REL"
echo "$OUT_REL" > "$WORK/last-out.txt"
# what is inside the two zip-like engine files, read from their directories only (nothing is extracted)
python3 -I "$HERE/inspect-zips.py" "$WORK/$OUT_REL/zip-contents.json" \
  "$WORK/engines/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl" "$WORK/engines/pyodide/python_stdlib.zip"

run_tier() { # run_tier <cpus> <label> <plan> <engines>
  local cpus=$1 label=$2 plan=$3 engines=$4 quota=()
  if [ "$cpus" != 20 ]; then
    quota=(--cpu-period=10000 "--cpu-quota=$(awk -v c="$cpus" 'BEGIN { printf "%d", c * 10000 }')")
  fi
  docker run --rm --init --name "w0s02-$label-$plan" --memory=6g --shm-size=1g "${quota[@]}" \
    -e OUT="/work/$OUT_REL" -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" -e LABEL="$label" -e PLAN="$plan" \
    -e ENGINES="$engines" -e REPEAT="$REPEAT" -e VERBOSE="${VERBOSE:-}" \
    -v "$HERE:/s:ro" -v "$WORK:/work" "$IMAGE" bash /s/container.sh
}

if [ -n "${SMOKE_PLAN:-}" ]; then
  # one container, one plan, at the CPU count in SMOKE_CPUS (default: no quota): to test the setup
  run_tier "${SMOKE_CPUS:-20}" "smoke${SMOKE_CPUS:-20}" "$SMOKE_PLAN" "$ENGINES"
  echo "outputs: $WORK/$OUT_REL"
  exit 0
fi

IFS=, read -ra TIER_LIST <<< "$TIERS"
[ "${PLAN_MATRIX:-1}" = 1 ] && for t in "${TIER_LIST[@]}"; do run_tier "$t" "cpu$t" matrix "$ENGINES"; done
[ "${PLAN_EXTRAS:-1}" = 1 ] && run_tier 20 cpu20 extras "$ENGINES"
[ "${PLAN_LINK:-1}" = 1 ] && run_tier 20 cpu20 link "$ENGINES"
[ "${PLAN_UI:-1}" = 1 ] && run_tier 20 cpu20 ui "$ENGINES"

docker image inspect --format '{{index .RepoDigests 0}}' "$IMAGE" > "$WORK/$OUT_REL/image-digest.txt"
echo "outputs: $WORK/$OUT_REL"
if [ "$MODE" = "--record" ]; then
  node "$HERE/record.mjs" "$WORK" "$WORK/$OUT_REL" "$REPO/runs"
fi
