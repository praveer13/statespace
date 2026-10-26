#!/bin/sh
# RUN-rust-i64: build research/evidence/a2r3/rust (the crate "ovf") in the dev profile, which is cargo's
# default, and in the release profile, run both binaries, and print what each did. Run from a copy of that
# crate (Cargo.toml and src/main.rs), with no network:
#   sh rust_i64.sh
# Sections are "== name". Output and exit codes of each binary are printed separately, so that the order of
# stdout and stderr is never in question. The script itself exits 0.
set -u
echo "== toolchain"
rustc --version
cargo --version
for profile in dev release; do
  if [ "$profile" = dev ]; then flag=""; dir=debug; else flag="--release"; dir=release; fi
  echo "== build: cargo build $flag (the $profile profile)"
  cargo build --offline -v $flag 2>&1 | grep -E '^ *(Compiling|Running|Finished)'
  echo "== run: target/$dir/ovf, stdout"
  "./target/$dir/ovf" > "$dir.stdout" 2> "$dir.stderr"
  code=$?
  cat "$dir.stdout"
  echo "== run: target/$dir/ovf, stderr"
  cat "$dir.stderr"
  echo "== run: target/$dir/ovf, exit code"
  echo "$code"
done
