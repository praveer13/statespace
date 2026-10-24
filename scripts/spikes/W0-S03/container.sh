#!/usr/bin/env bash
# W0-S03: the container half of the recorded run. Runs as root inside the pinned Playwright image
# (Ubuntu 24.04), with the spike folder at /spike (read-only), the work folder at /work and the
# dependency cache at /cache (read-only):
#   * installs the upstream Souffle 2.5 package for Ubuntu 24.04 and runs the corpus through it;
#   * runs the corpus through Pyodide + Z3 in Chromium, Firefox and WebKit module workers.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
STEP="node /spike/step.mjs /work/steps.jsonl"
# hand the outputs back to the host user even when a step fails, so the work directory can be cleared
trap 'chown -R "${HOST_UID}:${HOST_GID}" /work 2> /dev/null || true' EXIT

apt-get update -qq > /dev/null
apt-get install -y -qq /cache/x86_64-ubuntu-2404-souffle-2.5-Linux.deb > /work/apt-install.txt 2>&1
{
  echo "image_os: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "arch: $(uname -m)"
  echo "kernel: $(uname -r)"
  echo "node: $(node --version)"
  echo "souffle_binary_sha256: $(sha256sum "$(command -v souffle)" | cut -d' ' -f1)"
  echo "souffle_packages: $(dpkg-query -W -f='${Package}=${Version} ' souffle mcpp libffi8 libsqlite3-0 g++-13)"
} > /work/container-environment.txt
souffle --version > /work/souffle-version.txt

$STEP souffle -- node /spike/souffle-run.mjs --corpus /work/corpus --out /work/souffle-out
$STEP browsers -- node /spike/browser-run.mjs --corpus /work/corpus/corpus.json \
  --wheel /cache/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl --out /work/browsers --probes
