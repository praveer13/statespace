#!/usr/bin/env bash
# collision-trial.sh: two libraries whose root modules have the same name, as the S02 layout sketch has
# (broken/SelfTransfer.lean and fixed/SelfTransfer.lean). Lake gives both one .olean, so what does it check?
#
# A side trial of the W0-S06 record, kept in runs/RUN-bwrap-lanes/trial-module-collision/. It does not need the
# sandbox, so `lake check` runs with --inadvisably-no-sandbox. Needs Docker and the probe image
# (run-matrix.sh builds it); one container, --memory=2g.
#
#   scripts/spikes/W0-S06/collision-trial.sh

set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="${W0S06_OUT_ROOT:-$ROOT/runs/RUN-bwrap-lanes}/trial-module-collision"
IMAGE="statespace-w0s06-lean"
rm -rf "$OUT"; mkdir -p "$OUT"; chmod 777 "$OUT"

cat > "$OUT/argv.txt" <<EOF
docker run --rm --memory=2g $IMAGE bash -c '<the script below>'
EOF

docker run --rm --memory=2g --name w0s06-collision "$IMAGE" bash -c '
set -u
mkdir -p /work/t && cd /work/t && mkdir broken fixed
echo "leanprover/lean4:v4.35.0" > lean-toolchain
cat > lakefile.toml <<TOML
name = "t"
defaultTargets = ["Broken", "Fixed"]

[[lean_lib]]
name = "Broken"
srcDir = "broken"
roots = ["SelfTransfer"]

[[lean_lib]]
name = "Fixed"
srcDir = "fixed"
roots = ["SelfTransfer"]
TOML
echo "theorem selftransfer_mints : 1 = 1 := rfl" > broken/SelfTransfer.lean
echo "theorem selftransfer_fixed : 2 = 2 := rfl" > fixed/SelfTransfer.lean
echo "== lakefile.toml"; cat lakefile.toml
echo "== lake build"; lake build 2>&1; echo "exit $?"
echo "== the compiled modules"; ls .lake/build/lib/lean
echo "== which theorems the one SelfTransfer.olean holds"
printf "import SelfTransfer\n#check @selftransfer_mints\n#check @selftransfer_fixed\n" > /tmp/probe.lean
lake env lean /tmp/probe.lean 2>&1
echo "== lake check --inadvisably-no-sandbox"; lake check --inadvisably-no-sandbox 2>&1; echo "exit $?"
' > "$OUT/output.txt" 2>&1
echo "wrote $OUT/output.txt"
