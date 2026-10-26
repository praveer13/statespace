#!/bin/sh
# The site's smoke tests (apps/site/e2e/routes.spec.ts, and pages.spec.ts, which opens every stage, lesson, lab and
# drawer page) in the pinned Playwright image, against the built site.
#
#   scripts/site/smoke.sh                serve apps/site/dist (npm run build -w apps/site first)
#   scripts/site/smoke.sh CONTENT_DIR    serve a copy of dist whose content/, md/ and schemas/ come from CONTENT_DIR,
#                                        the --out of a content build (node scripts/build-content.mjs --root TREE --out DIR)
#
# Extra arguments after CONTENT_DIR go to Playwright. Chromium only; PW_PROJECT names another engine.
set -eu
REPO=$(cd "$(dirname "$0")/../.." && pwd)
IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
OUTDIR=dist
if [ "$#" -ge 1 ]; then
  CONTENT=$(cd "$1" && pwd)
  shift
  OUT="$REPO/node_modules/.cache/site-smoke/dist"
  rm -rf "$OUT"
  mkdir -p "$(dirname "$OUT")"
  cp -R "$REPO/apps/site/dist" "$OUT"
  rm -rf "$OUT/content" "$OUT/md" "$OUT/schemas"
  cp -R "$CONTENT/content" "$CONTENT/md" "$CONTENT/schemas" "$OUT/"
  OUTDIR="$OUT"
fi
[ -f "$REPO/apps/site/dist/index.html" ] || { echo "smoke: apps/site/dist is missing; run npm run build -w apps/site" >&2; exit 2; }
exec docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 -e PW_OUTDIR="$OUTDIR" \
  -v "$REPO:$REPO" -w "$REPO/apps/site" "$IMAGE" \
  node "$REPO/node_modules/@playwright/test/cli.js" test -c e2e/playwright.config.ts routes.spec.ts pages.spec.ts --project="${PW_PROJECT:-chromium}" "$@"
