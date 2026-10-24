#!/usr/bin/env bash
# W0-S04: re-execute RUN-spectacle-s5s8 end to end.
#
#   W0S04_TLA_JAR=/path/to/tla2tools-1.8.0.jar scripts/spikes/W0-S04/run-all.sh
#
# Needs Node 22, git, Docker with eclipse-temurin:21-jre and
# mcr.microsoft.com/playwright:v1.63.0-noble, and network access for the first
# fetch of Spectacle and playwright-core. Everything fetched or generated lives
# in W0S04_CACHE (default: <tmpdir>/statespace-w0s04), outside the repository;
# only runs/RUN-spectacle-s5s8* is written in the repository.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
export W0S04_CACHE="${W0S04_CACHE:-$(node -e 'console.log(require("os").tmpdir())')/statespace-w0s04}"
mkdir -p "$W0S04_CACHE"
if [ -z "${W0S04_TLA_JAR:-}" ]; then export W0S04_TLA_JAR="$W0S04_CACHE/tla2tools-1.8.0.jar"; fi

# 1. Spectacle at the pinned commit, verified file by file.
node "$HERE/fetch-spectacle.mjs"

# 2. TLC 1.8.0 (one container, one worker per run) and the harness jobs.
node "$HERE/tlc.mjs"

# 3. Spectacle under Node.
node "$HERE/node-run.mjs" 2> "$W0S04_CACHE/node-run.log"

# 4. Spectacle in Chromium, Firefox and WebKit (one engine at a time).
if [ ! -d "$W0S04_CACHE/pw/node_modules/playwright-core" ]; then
  (mkdir -p "$W0S04_CACHE/pw" && cd "$W0S04_CACHE/pw" && npm init -y >/dev/null && npm install --no-audit --no-fund --save-exact playwright-core@1.63.0)
fi
docker run --rm --memory=6g --shm-size=2g --name w0s04-pw \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -v "$REPO:/repo" -v "$W0S04_CACHE:/cache" \
  mcr.microsoft.com/playwright:v1.63.0-noble node /repo/scripts/spikes/W0-S04/browsers.mjs

# 5. The run record.
W0S04_PW_DIGEST="$(docker image inspect mcr.microsoft.com/playwright:v1.63.0-noble --format '{{index .RepoDigests 0}}')" \
  node "$HERE/record.mjs"
