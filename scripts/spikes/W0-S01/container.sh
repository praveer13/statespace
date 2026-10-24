#!/usr/bin/env bash
# W0-S01: runs inside mcr.microsoft.com/playwright:v1.63.0-noble (started by run.sh).
# Mounts: /s = this folder (read-only); /work = the work directory (certs, build, node, out).
# Environment: OUT (output dir under /work), HOST_UID, HOST_GID, ENGINES and CONFIGS (optional).
set -euo pipefail
: "${OUT:?OUT must be set}"
mkdir -p "$OUT"

REMOTE=${REMOTE:-0}

# 1. Trust the throwaway test CA the way a learner's machine trusts a public CA:
#    the system store (WebKit reads it), the NSS database Chromium reads ($HOME/.pki/nssdb), and a
#    Firefox profile template (the harness copies its cert9.db into each fresh profile).
#    Skipped in remote mode, where the deployed sites carry public certificates.
if [ "$REMOTE" != 1 ]; then
  cp /work/certs/ca.pem /usr/local/share/ca-certificates/ss-w0s01-test-ca.crt
  update-ca-certificates > /dev/null 2>&1
  mkdir -p "$HOME/.pki"
  cp -r /work/certs/nssdb "$HOME/.pki/nssdb"
fi

# 2. Undo one Playwright override so Firefox runs with its build's own cookie policy:
#    the build's defaults/preferences/firefox.js sets network.cookie.cookieBehavior 5 (state
#    partitioning); Playwright's playwright.cfg sets 4. Recorded in firefox-pref.txt.
CFG=$(ls /ms-playwright/firefox-*/firefox/playwright.cfg)
sed -i 's/^pref("network.cookie.cookieBehavior", 4);/pref("network.cookie.cookieBehavior", 5);/' "$CFG"
grep -n 'network.cookie.cookieBehavior' "$CFG" | sed 's|^|playwright.cfg:|' > "$OUT/firefox-pref.txt"

# 3. Environment facts for the run record.
{
  echo "uname: $(uname -srm)"
  echo "os: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "cpus: $(nproc)"
  echo "node: $(node --version)"
  echo "ca-certificates: $(dpkg-query -W -f='${Version}' ca-certificates)"
  echo "browsers: $(ls /ms-playwright | tr '\n' ' ')"
} > "$OUT/environment.txt"

# 4. Serve the stand-in hostnames, then run the harness.
SERVER_PID=
if [ "$REMOTE" != 1 ]; then
  node /s/server.mjs /work/build /work/certs/leaf.pem /work/certs/leaf.key 443 9000 > "$OUT/server.txt" 2>&1 &
  SERVER_PID=$!
else
  echo "remote mode: no local server" > "$OUT/server.txt"
fi
trap '[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; chown -R "${HOST_UID:-0}:${HOST_GID:-0}" "$OUT" 2>/dev/null || true' EXIT

PW_MODULE=/work/node/node_modules/playwright-core/index.mjs \
BUILD_JSON=/work/build/build.json \
OUT_DIR="$OUT" \
FF_TEMPLATE=$([ "$REMOTE" != 1 ] && echo /work/certs/ff-profile-template) \
REMOTE="$REMOTE" \
PROFILE_DIR=/tmp/w0s01-profiles \
node "${HARNESS:-/s/harness.mjs}" 2>&1 | tee "$OUT/harness.txt"
