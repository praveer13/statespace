#!/usr/bin/env bash
# W0-S02: the owner's measurement on a real phone. Two routes (docs/spikes/W0-S02.md section 7):
#
#   1. The real origins, over HTTPS (needed for the service worker and the Cache API on an iPhone):
#        scripts/spikes/W0-S02/phone.sh <work-dir> --main https://<main-origin> --inst https://instruments.<course-domain>
#      builds the two sites for those origins and says where each goes; publish <work-dir>/build/main at the root of the
#      main origin and <work-dir>/build/instruments at the root of the instrument origin. The names stay in <work-dir>;
#      no committed file holds them (OD-5).
#
#   2. This machine on the local network, or on Android through USB:
#        scripts/spikes/W0-S02/phone.sh <work-dir>
#      builds the sites for "auto" origins (each page derives the other origin from its own host name and a fixed port) and
#      serves them on ports 8097 (main) and 8098 (instrument), bound to every interface. Over plain HTTP the phone gives the
#      page no service worker and no Cache API, so the cache cannot be tested; on Android run
#        adb reverse tcp:8097 tcp:8097 && adb reverse tcp:8098 tcp:8098
#      and open http://localhost:8097/ on the phone, where localhost is a secure context.
#
# Needs Node 22+. The engines are fetched from npm and PyPI and checked against their pinned hashes.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${1:?usage: phone.sh <work-dir> [--main <origin> --inst <origin>]}
shift
mkdir -p "$WORK"
WORK=$(cd "$WORK" && pwd)
node "$HERE/fetch-engines.mjs" "$WORK/engines" > /dev/null
node "$HERE/build.mjs" "$WORK/engines" "$WORK/build" "$@"
if [ "$#" -gt 0 ]; then
  echo "built for the origins you gave. Publish:"
  echo "  $WORK/build/main         at the root of the main origin"
  echo "  $WORK/build/instruments  at the root of the instrument origin"
  echo "Then open the main origin on the phone. To check what the host sends for the large files:"
  echo "  node $HERE/wire-check.mjs <instrument origin> <build id from $WORK/build/build.json>"
  exit 0
fi
exec node "$HERE/server.mjs" --build "$WORK/build" --phone
