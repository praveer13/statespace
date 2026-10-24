#!/usr/bin/env bash
# list-bundle.sh: record what the Lean 4.35.0 toolchain archive for one Linux architecture bundles in bin/,
# so a learner's architecture can be checked for the six `--paranoid` checkers without installing anything.
# Docker Desktop on Apple silicon runs linux/arm64 containers, which take the aarch64 archive.
#
#   scripts/spikes/W0-S06/list-bundle.sh aarch64      # or x86_64
#
# Writes runs/RUN-bwrap-lanes/bundle-<arch>/{bundle.env,bin.tsv}: the archive's URL, byte count and SHA-256,
# then one line per file in bin/ with its size and SHA-256. Downloads about 595 MB and extracts only bin/.
# Needs curl, zstd and tar.

set -eu
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
ARCH="${1:?usage: list-bundle.sh aarch64|x86_64}"
case "$ARCH" in
  aarch64) SUFFIX="_aarch64";;
  x86_64) SUFFIX="";;
  *) echo "architecture must be aarch64 or x86_64" >&2; exit 64;;
esac
URL="https://releases.lean-lang.org/lean4/v4.35.0/lean-4.35.0-linux${SUFFIX}.tar.zst"
OUT="${W0S06_OUT_ROOT:-$ROOT/runs/RUN-bwrap-lanes}/bundle-$ARCH"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

if command -v sha256sum >/dev/null 2>&1; then sha() { sha256sum "$1" | cut -d' ' -f1; }; else sha() { shasum -a 256 "$1" | cut -d' ' -f1; }; fi
if stat -c %s "$0" >/dev/null 2>&1; then size() { stat -c %s "$1"; }; else size() { stat -f %z "$1"; }; fi

curl -sSfL -o "$TMP/archive.tar.zst" "$URL"
{
  echo "arch=$ARCH"
  echo "url=$URL"
  echo "archive_bytes=$(size "$TMP/archive.tar.zst")"
  echo "archive_sha256=$(sha "$TMP/archive.tar.zst")"
  echo "recorded_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/bundle.env"

mkdir -p "$TMP/x"
zstd -dc "$TMP/archive.tar.zst" | tar -xf - -C "$TMP/x" --wildcards '*/bin/*'
{
  for f in "$TMP"/x/*/bin/*; do
    printf '%s\t%s\t%s\n' "$(basename "$f")" "$(size "$f")" "$(sha "$f")"
  done
} | sort > "$OUT/bin.tsv"
echo "wrote $OUT ($(wc -l < "$OUT/bin.tsv") files in bin/)"
