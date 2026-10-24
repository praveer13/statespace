#!/bin/sh
# Runs inside ubuntu:24.04 (record-scaffold.mjs starts it): installs what the Rust crates need (a C toolchain and
# libclang for pg_query's bindgen; curl and ca-certificates are only for rustup), installs the pinned
# toolchain with rustup, compiles the pinned crate set, and builds the one-check lab against the vendored kit to wasm.
# Sections are marked @@name; the recorder splits on them. Nothing is written to a mounted directory: the wasm module
# comes back on standard output as base64.
set -eu
export DEBIAN_FRONTEND=noninteractive
now() { date +%s%N; }
RUST_TOOLCHAIN=1.96.0

echo "@@apt"; t0=$(now)
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq --no-install-recommends ca-certificates curl build-essential libclang-dev >/dev/null 2>&1
echo "ns=$(( $(now) - t0 ))"
dpkg-query -W -f='${Package} ${Version}\n' build-essential gcc libclang-dev 'libclang-*-dev' 'libclang1-*' | sort -u

echo "@@rustup"; t0=$(now)
export RUSTUP_HOME=/opt/rustup CARGO_HOME=/opt/cargo
base=https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu
cd /tmp
curl -sSfO "$base/rustup-init"
curl -sSf "$base/rustup-init.sha256" -o rustup-init.sha256
echo "$(cut -d' ' -f1 rustup-init.sha256)  rustup-init" | sha256sum -c - >/dev/null
echo "rustup-init sha256 $(sha256sum rustup-init | cut -d' ' -f1)"
chmod +x rustup-init
./rustup-init -y --no-modify-path --default-toolchain "$RUST_TOOLCHAIN" --profile minimal -t wasm32-unknown-unknown >/dev/null 2>&1
. /opt/cargo/env
echo "ns=$(( $(now) - t0 ))"
rustup --version 2>/dev/null | head -1
rustc --version --verbose
cargo --version
rustup target list --installed

echo "@@check"; t0=$(now)
cp -r /work/bench-pins /build-pins
cd /build-pins
export CARGO_TARGET_DIR=/target
set +e
cargo check --locked >/tmp/check.log 2>&1
code=$?
set -e
echo "exit=$code"
echo "ns=$(( $(now) - t0 ))"
tail -n 4 /tmp/check.log
grep -c '^ *Checking ' /tmp/check.log | sed 's/^/crates_checked=/'
grep -c '^ *Compiling ' /tmp/check.log | sed 's/^/crates_compiled=/'

echo "@@wasm"; t0=$(now)
mkdir /build-lab
cp -r /work/kit /build-lab/kit
cp -r /work/smoke-lab /build-lab/smoke-lab
cd /build-lab/smoke-lab
export CARGO_TARGET_DIR=/target-lab
set +e
cargo build --release --target wasm32-unknown-unknown >/tmp/wasm.log 2>&1
code=$?
set -e
echo "exit=$code"
echo "ns=$(( $(now) - t0 ))"
tail -n 3 /tmp/wasm.log
echo "@@wasm-base64"
base64 -w0 /target-lab/wasm32-unknown-unknown/release/smoke_lab.wasm
echo
