#!/usr/bin/env bash
# W0-S01: end-to-end runner for RUN-origin-subdomain.
#
# Local stand-in (what this task recorded):
#   scripts/spikes/W0-S01/run.sh <work-dir> [--record]
#   ENGINES=chromium,firefox,webkit CONFIGS=A,B,C may narrow a debugging run.
#
# Against the real hosting plan (the owner action in docs/spikes/W0-S01.md). The real names are
# passed in the environment and never written to a committed file (OD-5):
#   REMOTE=1 MAIN=https://<main> INST=https://instruments.<course-domain> COURSE_DOMAIN=<course-domain> \
#     scripts/spikes/W0-S01/run.sh <work-dir> --build-only
#   then publish <work-dir>/build/main at the root of the main origin and
#   <work-dir>/build/instruments at the root of the instrument origin, and run
#   REMOTE=1 MAIN=... INST=... COURSE_DOMAIN=... scripts/spikes/W0-S01/run.sh <work-dir> --record
#   (optional: XSITE=https://<an instrument origin on another registrable domain> adds configuration C)
#
# Steps: install playwright-core 1.63.0 into <work-dir>/node (from this folder's package.json);
# fetch and verify Pyodide 314.0.7 and the z3_solver 5.3.1.0 wheel; build the sites; locally, make
# a throwaway CA and NSS trust stores in a prep container; run the harness in a container from the
# pinned Playwright image; with --record, write runs/RUN-origin-subdomain.json and
# runs/RUN-origin-subdomain/. Needs Node 22+, npm and Docker on the host.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
WORK=${1:?usage: run.sh <work-dir> [--record|--build-only]}
MODE=${2:-}
REMOTE=${REMOTE:-0}
IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
mkdir -p "$WORK/node"
WORK=$(cd "$WORK" && pwd)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_REL="out/$STAMP"

cp "$HERE/package.json" "$WORK/node/package.json"
(cd "$WORK/node" && npm install --no-audit --no-fund --loglevel=error > /dev/null)

node "$HERE/fetch-engines.mjs" "$WORK/engines" > /dev/null
if [ "$REMOTE" = 1 ]; then
  : "${MAIN:?MAIN must be set in remote mode}" "${INST:?INST must be set in remote mode}"
  node "$HERE/build.mjs" "$WORK/engines" "$WORK/build" --main "$MAIN" --inst "$INST" --xsite "${XSITE:-none}" --attacker none
  DEFAULT_CONFIGS=$([ -n "${XSITE:-}" ] && echo A,B,C || echo A,B)
else
  node "$HERE/build.mjs" "$WORK/engines" "$WORK/build"
  DEFAULT_CONFIGS=A,B,C
fi
[ "$MODE" = "--build-only" ] && { echo "built: $WORK/build"; exit 0; }

DOCKER_NET=()
if [ "$REMOTE" != 1 ]; then
  docker run --rm --name w0s01-prep --memory=2g \
    -v "$HERE:/s:ro" -v "$WORK:/work" "$IMAGE" \
    bash -c 'bash /s/certs.sh /work/certs && chown -R "$0:$1" /work/certs' "$(id -u)" "$(id -g)"
  DOCKER_NET=(--add-host course-domain.test:127.0.0.1 --add-host instruments.course-domain.test:127.0.0.1
              --add-host instruments.other-host.test:127.0.0.1 --add-host attacker.test:127.0.0.1)
fi

docker run --rm --name w0s01-harness --memory=6g "${DOCKER_NET[@]}" \
  -e OUT="/work/$OUT_REL" -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" -e REMOTE="$REMOTE" \
  -e ENGINES="${ENGINES:-chromium,firefox,webkit}" -e CONFIGS="${CONFIGS:-$DEFAULT_CONFIGS}" \
  -v "$HERE:/s:ro" -v "$WORK:/work" "$IMAGE" bash /s/container.sh

docker image inspect --format '{{index .RepoDigests 0}}' "$IMAGE" > "$WORK/$OUT_REL/image-digest.txt"
echo "outputs: $WORK/$OUT_REL"

if [ "$MODE" = "--record" ]; then
  COURSE_DOMAIN="${COURSE_DOMAIN:-}" node "$HERE/record.mjs" "$WORK" "$WORK/$OUT_REL" "$REPO/runs"
fi
