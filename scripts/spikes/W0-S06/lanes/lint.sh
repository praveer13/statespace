#!/usr/bin/env bash
# lint.sh: check the CI-runner workflow template with actionlint and keep the output beside the run.
#
#   scripts/spikes/W0-S06/lanes/lint.sh [path-to-actionlint]      (default: actionlint on PATH)
#
# actionlint is rhysd/actionlint (a release binary; the recording used 1.7.12). It reads the workflow and
# reports syntax, expression and runner-label errors; it does not run anything and says nothing about what a
# GitHub runner will do. The output goes to runs/RUN-bwrap-lanes/workflow-lint.txt, which assemble-run.mjs reads.

set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
AL="${1:-actionlint}"
OUT="${W0S06_OUT_ROOT:-$ROOT/runs/RUN-bwrap-lanes}/workflow-lint.txt"
WF="scripts/spikes/W0-S06/lanes/ci-runners.workflow.yml"

BIN="$(command -v "$AL" 2>/dev/null || true)"
[ -n "$BIN" ] || { echo "actionlint not found: pass its path as the first argument" >&2; exit 1; }
cd "$ROOT" || exit 1
mkdir -p "$(dirname "$OUT")"
{
  echo "argv: actionlint $WF"
  echo "version: $("$BIN" -version 2>&1 | head -1)"
  echo "binary_sha256: $(sha256sum "$BIN" | cut -d' ' -f1)"
  echo "input_sha256: $(sha256sum "$WF" | cut -d' ' -f1)"
  echo "--- output"
  "$BIN" "$WF" 2>&1
  echo "--- exit: $?"
} > "$OUT"
cat "$OUT"
