# W0-S12 helpers

Recipes for the five runs this task records, and the tests of `scripts/vendor-drift.mjs`. Each recorder re-executes one run and rewrites `runs/<RUN-id>.json` and its `runs/<RUN-id>/` folder. They download pinned release assets (each checked against a recorded SHA-256), run the tools in containers, and never write outside `runs/`. Versions, digests and hashes are in the records, not here.

| File | What it does |
|---|---|
| `record-scaffold.mjs` | RUN-scaffold: the site stack with its typecheck, purity lint, tests and build; the browser smoke tests in the Playwright image; uv and psycopg; the PostgreSQL service image by digest; the Rust toolchain, the four crates and a wasm round trip through the vendored ABI; the cvc5 Bench binary |
| `record-souffle.mjs` | RUN-souffle-version: Soufflé with the CPU architecture, and a smoke program |
| `record-apalache.mjs` | RUN-apalache-version: Apalache on the Bench's Java base, and a bounded check |
| `record-alloy.mjs` | RUN-alloy-version: Alloy on the same base, and a headless `exec` |
| `record-juliamono.mjs`, `glyph-coverage.py` | RUN-juliamono-glyphs: JuliaMono against the course's own committed content |
| `lib.mjs` | shared helpers: hashing, timed commands, container facts, output files |
| `bench-rust-container.sh` | what runs inside the Ubuntu base for the Rust configurations of RUN-scaffold |
| `kit-roundtrip.ts` | drives a wasm module built against the vendored kit with the vendored host code, under Node |
| `extract-zip.py` | unpacks a zip into an empty directory, keeping modes, refusing paths that escape |
| `vendor-drift.test.mjs` | tests of `scripts/vendor-drift.mjs` on a throwaway upstream (`npm run test:vendor`) |

## Re-running

```
npm install
TMPDIR=<a scratch directory> node scripts/spikes/W0-S12/record-<name>.mjs
```

They need network, Docker with the images each record's environment names, `uv`, and for RUN-scaffold the pinned Rust toolchain with the wasm target. Containers run with `--rm` and a memory cap. `record-scaffold.mjs` runs the build and the unit tests of the repository it sits in, so run it on a tree you mean to record, and again after any change to `package.json`, a workspace manifest or the lockfile.

A re-run is compared with the committed record on `verdict_lines` and the named `values`; outputs marked informational carry clocks or durations.
