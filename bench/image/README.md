# The Bench image

**Status:** built by W0-T05; the recorded run is [X RUN-doctor-devcontainer]. **Date:** 2026-10-24 (machine clock).

One image holds every tool the labs run, each at its pin, and the `statespace` command line (spine section 9.2; ARCHITECTURE.md section 11.1). The devcontainer ([`.devcontainer/`](../../.devcontainer/devcontainer.json)) runs it beside a PostgreSQL 18.6 service container, and a Codespaces prebuild builds it. LAB-1 needs none of this: it runs with `uv run`, or in the tab (spine section 12, item 34).

## What is in it

| Tool | Pin | Where it comes from, and how the build checks it | Evidence |
|---|---|---|---|
| Lean, Lake and the six bundled checkers | Lean 4.35.0 | the release archive, against its SHA-256; unpacked where elan 4.2.4 keeps toolchains | [X RUN-lean-asset, RUN-bwrap-lanes] |
| TLC | `tla2tools` 1.8.0 and 1.7.4 | the jars of [`tla2tools/`](tla2tools/README.md), against their SHA-256 | [X RUN-tlc-jars] |
| Java | Temurin 21.0.12.1 | copied from `eclipse-temurin:21-jre`, named by digest | [X RUN-apalache-version] |
| Z3 | 5.3.1 (wheel 5.3.1.0), API and command line | the wheel, against `bench/uv.lock` | [X RUN-z3-starter] |
| cvc5 | 1.4.2, the static build without GPL parts | the release archive, against its SHA-256 | [X RUN-scaffold] |
| Soufflé | 2.5, the Ubuntu 24.04 package | the package, against its SHA-256 | [X RUN-souffle-version] |
| Rust | 1.96.0, the `wasm32-unknown-unknown` target, and the four crates of [`rust/Cargo.lock`](rust/Cargo.lock), fetched | rustup checks each component, cargo each crate | [X RUN-scaffold] |
| uv, Python, psycopg | 0.10.2, 3.13.12, 3.3.6 | uv's archive against its SHA-256; the wheels against `bench/uv.lock` | [X RUN-scaffold] |
| bubblewrap, git, a C toolchain, libclang | the Ubuntu 24.04 archive of the day | not pinned by version; the image's digest pins them | [X RUN-scaffold] |

The base is `ubuntu:24.04` by digest, for `linux/amd64`, the platform of every hash. PostgreSQL is not in the image: `postgres:18` runs beside it, by digest, from `.devcontainer/docker-compose.yml`.

**Size.** The unpacked root file system is 5,799,502,321 bytes, 3,197,829,120 of them the Lean toolchain's layer. `docker image inspect` and `docker images` report other figures for the same image (its stored content, and its disk use); the run keeps all three, with how each was measured. Which of them a learner downloads was not measured, because no registry was involved. The build without the layer cache took under three minutes on a 20-CPU machine with a fast connection, a data point and not a promise [X RUN-doctor-devcontainer].

## Build and check

From the repository root:

```
docker build --file bench/image/Dockerfile --tag statespace-bench .
docker run --rm statespace-bench statespace doctor --skip postgres
```

The last step of the Dockerfile is `statespace doctor --skip postgres --sandbox off`, so a build fails when any tool differs from the pins in `bench/statespace/doctor.py`. In the devcontainer, `statespace doctor` does the whole check: it compares each tool with its pin, runs the sandbox canary, reads PostgreSQL, and prints the `environment` and `tools` of a receipt. The recorder, `node scripts/spikes/W0-T05/record.mjs`, builds the image the way a devcontainer builds it, runs doctor in it, and writes the run.

## The devcontainer, the sandbox and Codespaces

- **The devcontainer** names its image by `build`, so a clone builds it. Pass the image's digest to the container in `STATESPACE_BENCH_IMAGE` (`name@sha256:...`) and doctor records it as the receipt's `devcontainer`; a container cannot read its own digest, so without the variable the receipt says `null` and doctor says why. A lab template names the published image by digest instead, and sets the same variable to the same reference.
- **Lean's sandbox** does not start in a default container, and doctor reports `failed` with bubblewrap's own line and what changes it; the run is still green, because the sandbox is recorded and never required. `.devcontainer/docker-compose.sandbox.yml` is an opt-in profile that starts it, and its comments say what it relaxes. On the machine of the recorded run, a Docker Engine without AppArmor, the profile starts it [X RUN-doctor-devcontainer]; on Ubuntu 24.04 it does not [X RUN-bwrap-lanes].
- **Codespaces prebuild.** In the repository's settings choose Codespaces, then Prebuilds, then set up a prebuild for the default branch with the trigger "on configuration change". It builds the Dockerfile. It was not run: it needs the repository on GitHub (an owner action).

## Publishing the image

The nightly and monthly lanes run in the image named by the repository variable `BENCH_IMAGE`, by digest (W0-T04). Nothing publishes it yet:

1. Build it in CI or on a machine you trust, tag it for a registry the lanes can pull without credentials (a public GHCR package), and push it.
2. Read the digest the registry gives it, `name@sha256:...`, and set `BENCH_IMAGE` to that.
3. Run `statespace doctor` inside the pushed image by its digest, and record the result next to [X RUN-doctor-devcontainer], whose digest is that of a local build.

## Moving a pin

A pin lives in three places. The Dockerfile has the download and its SHA-256 (or the tag or digest of a base image), `bench/statespace/doctor.py` has the version string and the hash the tool must show, and a run records where the value came from. Change them together, rebuild, re-record with `node scripts/spikes/W0-T05/record.mjs`, and rebuild the runs index with `node scripts/runs/build-index.mjs`; the build itself stops on any difference between the first two (labs/TOOLS.md section 6.2). `bench/uv.lock` moves with `uv lock` in `bench/`.

## What this does not cover

- Only `linux/amd64` was built and run. On arm64 doctor reports every hash as unpinned, and Soufflé has no arm64 package; Apple silicon, Docker Desktop and Codespaces are unmeasured (W0-S06 owner actions 3 and 4).
- The Ubuntu packages are not pinned by version, so two builds differ in them even from the same Dockerfile.
- The TLC jars are vendored here and the spine lists `vendor/tla2tools/` for them (section 11.1); see [`tla2tools/README.md`](tla2tools/README.md).
