#!/usr/bin/env bash
# W0-S03: the full recorded run of RUN-fixedpoint-equal.
#
#   scripts/spikes/W0-S03/run-all.sh [work-dir]
#
# Needs Docker with the image mcr.microsoft.com/playwright:v1.63.0-noble, Node 22, uv and network access
# (npm, PyPI, GitHub). Fetches and verifies the pinned binaries into $W0S03_CACHE, builds the corpus,
# runs Souffle and the browsers in one container, runs native Z3 and Pyodide under Node on the host,
# compares everything, and writes runs/RUN-fixedpoint-equal.json and runs/RUN-fixedpoint-equal/.
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
WORK=$(realpath -m "${1:-${TMPDIR:-/tmp}/w0-s03-work}")
CACHE=$(realpath -m "${W0S03_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/statespace-w0-s03}")
IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
WASM_WHEEL=z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl
NATIVE_WHEEL=z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl

export W0S03_PATHMAP="[[\"$HERE\",\"scripts/spikes/W0-S03\"],[\"$REPO\",\"<repo>\"],[\"$WORK\",\"<work>\"],[\"$CACHE\",\"<cache>\"],[\"HOST_UID=$(id -u)\",\"HOST_UID=<uid>\"],[\"HOST_GID=$(id -g)\",\"HOST_GID=<gid>\"]]"
STEP=(node "$HERE/step.mjs" "$WORK/steps.jsonl")

case "$WORK" in
  */w0-s03*) ;;
  *) echo "refusing to clear $WORK: the work directory's name must contain w0-s03" >&2; exit 2 ;;
esac
rm -rf "$WORK"
mkdir -p "$WORK" "$CACHE"
cd "$HERE"

"${STEP[@]}" fetch-deps -- node fetch-deps.mjs "$CACHE"
"${STEP[@]}" npm-ci -- npm ci --no-audit --no-fund
"${STEP[@]}" worldgen -- node worldgen.mjs --out "$WORK/corpus"

# Souffle and the three browsers: one container, as root for apt, outputs handed back to this user
"${STEP[@]}" container -- docker run --rm --memory=6g --cpus=4 \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -e W0S03_PATHMAP='[["/spike","scripts/spikes/W0-S03"],["/work","<work>"],["/cache","<cache>"]]' \
  -v "$HERE":/spike:ro -v "$WORK":/work -v "$CACHE":/cache:ro \
  "$IMAGE" bash /spike/container.sh

# native Z3 5.3.1 (the Bench's wheel), the adapter unchanged
UVRUN=(uv run --no-project --python 3.13 --with "$CACHE/$NATIVE_WHEEL" python -I -B)
"${STEP[@]}" native -- "${UVRUN[@]}" native_run.py "$WORK/corpus/corpus.json" "$WORK/native.json"
"${STEP[@]}" native-planted -- "${UVRUN[@]}" native_run.py "$WORK/corpus/corpus.json" "$WORK/planted-replies.json" --plant drop-negation
"${STEP[@]}" native-probes -- "${UVRUN[@]}" probes.py --all "$WORK/corpus/corpus.json" "$WORK/native-probes.json"

# Pyodide 314.0.7 and the Z3 wasm wheel under Node, the continuation of RUN-z3-fixedpoint's harness
"${STEP[@]}" pyodide-node -- node pyodide-node.mjs --corpus "$WORK/corpus/corpus.json" --wheel "$CACHE/$WASM_WHEEL" \
  --out "$WORK/pyodide-node.json" --probes "$WORK/pyodide-node-probes.json"

# the comparison. A difference is recorded, not fatal here; the planted fault must make its comparison
# fail, so that exit status is recorded too.
set +e
"${STEP[@]}" compare -- node compare.mjs --corpus "$WORK/corpus" --souffle "$WORK/souffle-out" --out "$WORK/comparison" \
  --z3 native="$WORK/native.json" --z3 pyodide-node22="$WORK/pyodide-node.json" \
  --z3 chromium="$WORK/browsers/chromium.json" --z3 firefox="$WORK/browsers/firefox.json" --z3 webkit="$WORK/browsers/webkit.json"
COMPARE_EXIT=$?
"${STEP[@]}" compare-planted -- node compare.mjs --corpus "$WORK/corpus" --souffle "$WORK/souffle-out" --out "$WORK/planted" \
  --z3 planted="$WORK/planted-replies.json"
set -e

node record.mjs --repo "$REPO" --work "$WORK" --cache "$CACHE" --image "$IMAGE"
exit "$COMPARE_EXIT"
