#!/usr/bin/env bash
# W0-S02: runs inside mcr.microsoft.com/playwright:v1.63.0-noble (started by run.sh).
# Mounts: /s = this folder (read-only); /work = the work directory (node, build, out).
# Environment: OUT, LABEL, PLAN, ENGINES, REPEAT, HOST_UID, HOST_GID.
set -euo pipefail
: "${OUT:?OUT must be set}"
mkdir -p "$OUT"
trap 'chown -R "${HOST_UID:-0}:${HOST_GID:-0}" "$OUT" 2>/dev/null || true' EXIT

{
  echo "uname: $(uname -srm)"
  echo "os: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "cpus visible: $(nproc)"
  echo "cgroup cpu.max: $(cat /sys/fs/cgroup/cpu.max 2>/dev/null || echo unknown)"
  echo "cgroup memory.max: $(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo unknown)"
  echo "node: $(node --version)"
  echo "browsers: $(ls /ms-playwright | tr '\n' ' ')"
} > "$OUT/environment-${LABEL:-tier}-${PLAN:-plan}.txt"

VERBOSE="${VERBOSE:-}" \
PW_MODULE=/work/node/node_modules/playwright-core/index.mjs \
BUILD_DIR=/work/build \
SERVER_JS=/s/server.mjs \
OUT_DIR="$OUT" \
PROFILE_DIR=/tmp/w0s02-profiles \
node /s/harness.mjs 2>&1 | tee "$OUT/harness-${LABEL:-tier}-${PLAN:-plan}.txt"
