# TOOLS: the pinned stack for edition 1

**Status:** draft: first-learner pass pending. **Date:** 2026-10-24 (machine clock).

This file lists the tools the labs use, the exact version of each, how to install and verify it, what it costs in disk and download, and how a pin is allowed to move. The lab system itself is in [README.md](README.md). The rules for your coding agent are in [AGENTS.md](AGENTS.md).

**Why pins matter.** A receipt records every tool's version string verbatim, with a hash of its binary, jar or wheel. A claim is only as good as the tool that stamped it, and tools have bugs: Z3 5.3.0 answered `unsat` on two satisfiable inputs where 5.3.1 answers `unknown` [X RUN-z3-11179]. So the course names what it ran.

**Reading the tags.** `[X RUN-id]` names an executed run on file; `[X RESULTS.md]` names the spike results file. `{{run:RUN-id}}` marks a run that will be recorded before the sentence ships. `[V]` marks a fact re-checked against a primary source that is not a run (a release date, a license, an upstream issue), on the date its sentence or row states, or on 2026-10-23 where none is stated. `[D]` marks design rationale. Where an executed fact and a report disagree, the executed fact wins. Section 8 lists where each executed run lives on disk.

---

## 1. The pins at a glance

Edition 1 pins Lean 4.35.x and PostgreSQL 18.6, and re-records the isolation catalog after PostgreSQL 19 reaches general availability. A container runtime (Docker or a compatible one) is yours to install; it is not a pinned tool.

| Tool | Pin | Runs on | Backed by | First needed |
|---|---|---|---|---|
| Lean | 4.35.0, commit `eb6cafb7290e8bd5f2937522d8d804f58f02bafc`; core plus Std; `autoImplicit false`; no Mathlib | Bench | [X RUN-lean-ledger, RUN-lean-toolchain] | S2 (LAB-2) |
| Lake | 5.0.0-src+eb6cafb, bundled with the toolchain | Bench | [X RUN-lean-toolchain] | S2 |
| elan | 4.2.4 | Bench | [X RUN-lean-toolchain] | S2 |
| Z3, Bench | 5.3.1: `z3.get_version_string()` prints `5.3.1`; the wheel's own version is 5.3.1.0 [V] | Bench; LAB-1 with `uv run` | [X RUN-z3-starter] | S1 (LAB-1) |
| Z3, tab | 5.3.1 through the `z3_solver` 5.3.1.0 pyemscripten wheel on Pyodide | tab | [X RUN-z3-starter-pyodide] | Boot |
| Pyodide | 314.0.7 | tab | [X RUN-z3-starter-pyodide] | Boot |
| cvc5 | 1.4.2; the pip wheel's version string reads `1.4.2-modified`, and the Bench binary's reads `1.4.2` | Bench | [X RUN-cvc5-alethe]; the Bench binary [X RUN-scaffold] | S4 (LAB-4.8) |
| Java | 21; the executed runs used Eclipse Temurin 21, and TLC's banner printed `Eclipse Adoptium 21.0.12.1` | Bench | [X RUN-tlc-doublespend] | S5 (LAB-5) |
| tla2tools 1.8.0 | a rolling pre-release, pinned by SHA-256 `5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2`; prints `TLC2 Version 2026.10.20.183001 (rev: d2e1472)` | Bench | [X RUN-tlc-jars, RUN-tlc-doublespend] | S5 |
| tla2tools 1.7.4 | the last stable tag, the text-trace fallback; SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`; prints `TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)` | Bench, CI | [X RUN-tlc-jars] | S5 |
| PostgreSQL | 18.6; the executed image `postgres:18` reported `PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)` | Bench | [X RUN-pg-anomalies, RUN-pg-claims] | S6 (LAB-6) |
| PGlite | 0.5.11 [X RUN-pglite-0511] | tab | [X RUN-pglite] | S6 |
| Spectacle | commit `5827c22` (dated 2026-09-30 [V]), vendored under MIT [V] | tab | [X RUN-spectacle] | S5 |
| Soufflé | 2.5 | Bench | [X RUN-souffle-version] | S7 (LAB-7) |
| Alloy | 6.2.0, optional | Bench | [X RUN-alloy-version] | S7 (drawer D-16) |
| Apalache | 0.62.4, optional | Bench | [X RUN-apalache-version] | S5.L9 (drawer D-18) |
| Rust | 1.96.0: `rustc --version` prints `rustc 1.96.0 (ac68faa20 2026-05-25)`; the `wasm32-unknown-unknown` target is installed | Bench | [X RUN-scaffold] | S3 (LAB-3) |
| Rust crates | `tokio-postgres` 0.7.18, `testcontainers` 0.28.0, `pg_query` 6.2.1, `proptest` 1.12.0: read from the crates.io API on 2026-10-23 [V], pinned with `=` and resolved into a committed `Cargo.lock` | Bench | [X RUN-scaffold] | S6 |
| `uv`, `psycopg` | `uv` 0.10.2; `psycopg` 3.3.6, with its binary package | Bench | [X RUN-scaffold] | S1; S6 |
| Browsers tested for the tab | Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6 | tab | [X RUN-z3-starter-pyodide] | all |

---

## 2. Install and verify, tool by tool

In the devcontainer every tool below is already in the image, and `statespace doctor` compares each with its pin. The native instructions are for learners who set up the Bench themselves (README §4.2). Run Python that reads files you did not write with `python -I`.

### 2.1 `uv`, Python and Z3 (LAB-1)

- **Install.** `uv` from [its documentation](https://docs.astral.sh/uv/). The Bench has version 0.10.2 [X RUN-scaffold].
- **Run.** The pinned form the spikes ran [X RUN-z3-starter]:

  ```
  uv run --with z3-solver==5.3.1 python -I <script>
  ```

- **Verify.** In Python, `import z3` then `print(z3.get_version_string())` prints `5.3.1` [X RUN-z3-starter]. The roadmap's starter prints `sat [b = 0, amount = 1, a = 0]`, then `unsat` [X RUN-z3-starter].

### 2.2 Lean 4.35.0

- **Install.** With elan. These are the commands the measurement ran on Linux x86_64 [X RUN-lean-toolchain]:

  ```
  curl -sSL -o elan.tar.gz https://github.com/leanprover/elan/releases/download/v4.2.4/elan-x86_64-unknown-linux-gnu.tar.gz
  tar xzf elan.tar.gz
  ./elan-init -y --default-toolchain none --no-modify-path
  elan toolchain install leanprover/lean4:v4.35.0
  ```

  `--no-modify-path` leaves your shell startup files alone, so put elan's `bin` directory on your path yourself, or drop the flag. The measurement also redirected elan's home directory to keep the install isolated; you do not need to. On other platforms use elan's own installer. In the measured project, `lean-toolchain` read `leanprover/lean4:v4.35.0` [X RUN-lean-toolchain]; a lab's file names the same toolchain, and elan picks it up.
- **Verify.**

  ```
  lean --version
  Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)
  lake --version
  Lake version 5.0.0-src+eb6cafb (Lean version 4.35.0)
  ```

  The platform triple differs on other platforms. Both outputs are from [X RUN-lean-toolchain]. LAB-2.1's reference proof lists `[propext, Quot.sound]` for `transfer_conserves` [X RUN-lean-ledger].
- **What the toolchain bundles.** Its `bin/` holds `lean`, `lake`, `leanc`, `leanexport`, `leanir`, `leanmake`, `leantar`, `cadical`, `clang`, `ld.lld` and `llvm-ar`, and the checkers `leanchecker`, `leanchecker-paranoid`, `lean4lean`, `nanoda_bin`, `con-leche` and `con-ron` [X RUN-lean-toolchain].
- **Settings the template sets.** `autoImplicit` is false, so a misspelled variable is an error and not a new implicit argument. The template uses core Lean and Std and no Mathlib: a Mathlib `Finmap` project's packages took 7.3 GB [X RUN-lean-mathlib], and core Lean proves the ledger [X RUN-lean-ledger].
- **The two commands.** `lake check` builds the default targets, exports them, and replays the export through the kernel, erroring on any use of a non-standard axiom. `lake comparator` establishes that every named theorem in the solution proves the same statement as the challenge, uses no axiom outside the permitted list, and is accepted by the kernel. Both need a `lake-manifest.json`, which one `lake build` writes. Exit codes, from the 4.35.0 binary's own help text [X RUN-lean-toolchain]: 0 accepted; 1 rejected (a checker rejects, an axiom is not permitted, or the build failed); 2 could not start (no `bwrap`, no manifest, no default targets, or for `lake comparator` a missing or malformed `comparator.json`). `--paranoid` adds `leanchecker-paranoid`, `lean4lean`, `nanoda`, `con-leche` and `con-ron` to Lean's own kernel, six checkers in all. On a small project each verdict of `lake comparator` took 1 to 2 s and `lake comparator --paranoid` about 3 s [X RUN-lean-comparator]; on the LAB-2 pack the medians were 1.44 s and 2.92 s [X RUN-bwrap-lanes]. `lake check` replays Lean's whole environment, 57,966 declarations: on that pack it took 53.6 s, and `lake check --paranoid`, which replays it through six checkers one after another, took 172.6 s [X RUN-bwrap-lanes]. A project that imports `Std` did not finish `lake check --paranoid` in 6 GiB, and a slower machine takes longer [X RUN-bwrap-lanes]. Six checkers are not six separate designs: lean4lean ports the reference logic for inductives [V].

### 2.3 cvc5 1.4.2

- **Install.** The executed run used the pip wheel [X RUN-cvc5-alethe]; the Bench binary is a static build that prints `cvc5 1.4.2 [git 282d5e0 on branch HEAD]`, and its SHA-256 is `6aecddf466552b83bb5883756c7955e0c9d5ddcc6d7f45b48c2f6e06a741b102` [X RUN-scaffold].
- **Verify.** The wheel's `Solver.getVersion()` returned `1.4.2-modified` [X RUN-cvc5-alethe]. Receipts record the string verbatim, so accept the `-modified` suffix and do not "fix" it; the Bench binary carries no suffix, and the two are different builds of the same release [X RUN-scaffold].
- **What it is for.** Authored `unsat` answers are cross-checked with cvc5, and two solvers agreeing is still "uncertified": the executed Alethe proof for the guard query has 19 lines and contains a `hole` step for an untranslated rewrite [X RUN-cvc5-alethe].

### 2.4 Java 21 and TLC

- **Java.** A JRE 21 from any distribution. The executed runs used Eclipse Temurin 21 in a container [X RUN-tlc-doublespend]. The minimum Java version TLC 1.8.0 supports has not been established [V], so the course pins the one it ran on.
- **The jars.** The `v1.8.0` release is a rolling pre-release: its asset is re-published under the same tag (published 2026-10-20 and re-published since [V]), so a download of the tag can differ from the jar the course ran. The SHA-256 is the pin. The landscape digest recommends shipping that exact jar rather than fetching the tag, and this file adopts that as a design choice [D]: the jar is MIT-licensed [V], and it ships in the Bench image at `/opt/tla2tools/`, copied from `bench/image/tla2tools/` in the repository and checked against the pinned SHA-256 before the build goes on [X RUN-doctor-devcontainer]. 1.7.4 is the last stable tag.

  | Jar | SHA-256 | First line TLC prints | Trace output |
  |---|---|---|---|
  | 1.8.0 (pre-release) | `5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2` | `TLC2 Version 2026.10.20.183001 (rev: d2e1472)` | `-dumpTrace json <file>` writes a JSON trace |
  | 1.7.4 (stable) | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` | `TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)` | rejects `-dumpTrace` as an unrecognized option |

  The hashes and the rejection are from [X RUN-tlc-jars, RUN-tlc-doublespend].
- **Verify.** `sha256sum tla2tools.jar` (on macOS, `shasum -a 256 tla2tools.jar`) must print one of the two hashes above. A jar that differs is unpinned, whatever its name says.
- **Flags the course relies on**, from the 1.8.0 jar's own help text (`research/evidence/a2r3/out/tlc-help-tla180.txt`): `-workers num` (defaults to 1; minimal traces need one worker), `-deadlock` ("DO NOT CHECK FOR DEADLOCK"), `-continue`, `-config file` and `-dumpTrace format file`. Receipts record the full argv.
- **A check that both jars pass.** On the DoubleSpend spec of LAB-5.1, default flags stop with `Error: Deadlock reached.` after `11 states generated, 10 distinct states found` at depth 4. With `-deadlock`, TLC reports `Error: Invariant NoOverspend is violated.` after `12 states generated, 11 distinct states found, 2 states left on queue.` at depth 5, a 5-state trace of 4 actions. Both jars gave these counts [X RUN-tlc-doublespend]. The full reachable space for 2 to 5 workers is 11, 45, 191 and 813 distinct states [X RUN-tlc-full].

### 2.5 PostgreSQL 18.6

- **Install.** In the devcontainer, a PostgreSQL 18.6 service container runs beside the image, pinned by digest: `postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336` [X RUN-scaffold]. The executed runs used the container image `postgres:18`, which reported 18.6 [X RUN-pg-anomalies]. Natively, install PostgreSQL 18 from your platform, or run that image, and confirm the version below.
- **Verify.**

  ```
  select version();
  ```

  begins `PostgreSQL 18.6` [X RUN-pg-claims]. The same experiments gave the same outcomes on 17.11 [X RUN-pg-claims]. The pin to 18.6 is for the recorded isolation catalog and for matching PGlite, which reports 18.6 [X RUN-pglite] [D].
- **Python driver.** `psycopg` 3, with its binary package, drives `statespace isorun`; the Bench has 3.3.6 [X RUN-scaffold].
- **Documentation.** Link `/docs/18/`, not `/docs/current/`, because `current` moves to PostgreSQL 19 when it is released [D].

### 2.6 Rust and the crates

- **Install.** Rust through `rustup`, with the wasm target added: `rustup target add wasm32-unknown-unknown` on an existing install, or `-t wasm32-unknown-unknown` to `rustup-init`, which the recorded install used [X RUN-scaffold]. The toolchain version is 1.96.0 [X RUN-scaffold].
- **Crates.** `tokio-postgres`, `testcontainers`, `pg_query` and `proptest`, at the versions in the template's lockfile [X RUN-scaffold], which section 1 lists.
- **Verify.** `rustc --version`, and the lockfile's versions against section 1.

### 2.7 Soufflé, Alloy and Apalache

- **Soufflé 2.5** is the Datalog reference for S7 [X RUN-souffle-version]. An upstream issue (#2476, "sporadic crashes on ARM") was open when last read on 2026-10-21 [V], so a receipt records the CPU architecture [D]; the 2.5 release has no arm64 package [X RUN-souffle-version]. Verify with `souffle --version`, whose banner reads `Version: 2.5 (2.5)` [X RUN-souffle-version].
- **Alloy 6.2.0** is optional and only used by drawer D-16 [X RUN-alloy-version]. It needs Java 17 or later [V]. Its release notes add a command line, documented with `java -jar alloy.jar help` [V].
- **Apalache 0.62.4** is optional and only used by S5.L9 and drawer D-18 [X RUN-apalache-version]. Its inductive-invariant check is bounded by the constants and types it instantiates, so it earns [M], never [P] alone.

### 2.8 Pins that live in the tab

You install nothing for these. Each instrument reply names its engine and version, and imported receipts show theirs.

- **Z3 on Pyodide.** Z3 5.3.1 through the `z3_solver` 5.3.1.0 pyemscripten wheel on Pyodide 314.0.7, in a module worker on the instrument origin, which needs no cross-origin isolation [X RUN-z3-starter-pyodide, RUN-browser-origin]. The starter was ready in 1.46 to 1.71 s in Chromium, Firefox and WebKit [X RUN-z3-starter-pyodide]. Budgets are `rlimit`: `timeout` never returned under Pyodide in a Node harness [X RUN-z3-budget-pyodide] or in Chromium, Firefox and WebKit on a desktop, while `rlimit` stopped with `unknown (canceled)`; no phone has been measured. The first load is 12,893,420 B as gzip level 5, and the loader shows that size while it downloads [X RUN-phone-pyodide].
- **PGlite.** One connection, so two "concurrent" sessions run one after the other [X RUN-pglite]. Version 0.5.11 reports `PostgreSQL 18.6 (PGlite 0.5.11)`, and its first load is 5,580,851 B as gzip level 5, which the loader shows while it downloads [X RUN-pglite-0511].
- **Spectacle** at commit `5827c22`, vendored under its MIT license [V]. It found 11, 45, 191 and 813 distinct states for 2 to 5 workers, the same as TLC [X RUN-spectacle]. It has no PlusCal and no fairness or liveness checking [V], so liveness stays with TLC on the Bench.
- **The Datalog engine** is Z3 `Fixedpoint` in the same Pyodide worker, behind an adapter (stratified negation was first measured [X RUN-z3-fixedpoint]). It equals Soufflé on relations and derivation heights [X RUN-fixedpoint-equal]. A TypeScript evaluator differential-tested against Soufflé is the logged fallback.

---

## 3. Measured sizes

| Item | Size | Source |
|---|---|---|
| Lean 4.35.0 Linux toolchain, download (the `tar.zst` release asset) | 594.5 MB (594,481,375 bytes) | [X RUN-lean-toolchain]; the asset's byte count is read from the release API [V] |
| the same toolchain, unpacked | 3.0 GB (`du -sh` printed `3.0G`) | [X RUN-lean-toolchain] |
| other Lean 4.35.0 downloads | macOS aarch64 570.4 MB; Windows 622.7 MB | the same release API read [V] |
| `elan toolchain install` | 15.0 s, download and unpack, on a 20-CPU, 31 GiB machine with a fast connection; a data point, not a promise | [X RUN-lean-toolchain] |
| a core-only ledger project's `.lake` after one build | 244K (`du -sh` printed `244K`) | [X RUN-lean-toolchain] |
| a Mathlib project importing one `Finmap` module, packages | 7.3 GB | [X RUN-lean-mathlib] |
| npm `z3-solver` 5.3.1 (not used), unpacked and its `z3-built.wasm` | 35.5 MB and 34.6 MB | [X RESULTS.md] |
| Pyodide with the Z3 wheel, first load | 12,893,420 B as gzip level 5, 20,056,541 B unpacked; the real instrument host sent 12,935,856 B in all, every file gzip-encoded except `python_stdlib.zip` | [X RUN-phone-pyodide, RUN-pages-wire-check] |
| PGlite, first load | 5,580,851 B as gzip level 5 in 11 files, 17,424,328 B raw, as the harness's server sent it; the real host's compression of its `.wasm` and `.data` files is not yet measured | [X RUN-pglite-0511] |
| the community WebAssembly build of Lean (not used) | 137,362,599 B decoded in a cold load, 17,179,888 B of response bodies as received | [X RUN-lean-wasm] |
| the devcontainer image | `docker image inspect` reports 1,663,129,890 B and `docker images` 7.63GB; its unpacked root file system is 5,799,502,321 B; linux/amd64 only. Which of these is a download size was not measured, because no registry was involved | [X RUN-doctor-devcontainer] |

In the tab, nothing asks before an engine downloads, and the loader shows its size while it downloads. The command line tool has no accounts and no telemetry; what it downloads, if anything, is what your own tool installers download, and the sizes above are those downloads.

---

## 4. The sandbox

Lean's `lake check` and `lake comparator` build and export the project inside bubblewrap on Linux, and never load its `.olean` files into Lake's own process. `bubblewrap` needs either unprivileged user namespaces or a setuid install [X RUN-lean-toolchain]. The sandbox bounds writes and the network: only `.lake` is writable, and only dependency resolution has a network [X RUN-lean-toolchain].

It exists because Lean runs code while it builds. The advisory for the 2026 kernel soundness bug (#14576) says exploitation "requires execution of a metaprogram within the Lean process (e.g., as part of building a project or importing a dependency)" (2026-08-02) [V]. The course's threat model is mostly self-deception, not attack, so it records the sandbox and never requires it [D].

| State on a receipt | Meaning | How it arises |
|---|---|---|
| `on` | the project was built, exported and checked inside bubblewrap | Linux with bubblewrap and user namespaces, or a setuid install |
| `off` | the check ran without the sandbox | `--inadvisably-no-sandbox`, which `statespace check` passes only on your recorded choice (`--sandbox=off`) or in CI, never on an agent's or a script's [D]; Lean then prints "WARNING: Sandbox disabled, this run is not trustworthy" [X RUN-lean-axioms] |
| `failed` | the sandbox was wanted and could not start | a line that starts `bwrap:`, such as, under default Docker, "No permissions to create new namespace" with exit code 1, the code of a rejection [X RUN-lean-bwrap-docker]; `statespace check` goes by that line and never by the exit code, so a check in this state carries no verdict [X RUN-bwrap-lanes] |

Without bubblewrap the commands exit 2 [X RUN-lean-bwrap-docker]. A failed sandbox can also print `<name> kernel rejected the solution` for a checker, so a `bwrap:` line outranks any rejection line, and a checker killed for memory (exit 137 or 143) is no verdict either [X RUN-bwrap-lanes]. Statement matching still works with the sandbox off: an honest solution is accepted and a weakened statement and a redefined function are rejected [X RUN-lean-comparator]. macOS and Windows learners use the devcontainer, because the sandbox is Linux-only [D].

**Making the sandbox start inside a container.** The first feasibility run found that bubblewrap started with `seccomp=unconfined`, `apparmor=unconfined` and `systempaths=unconfined` and an existing `/run/user/0` (`research/evidence/A5r3/comp-run3.log` to `comp-run5.log` show the failures that led there). W0-S06 then measured which of these the sandbox needs [X RUN-bwrap-lanes]. Three things have to hold together:

- the container's seccomp profile allows `clone`, `mount`, `pivot_root`, `umount2` and `unshare`: Docker's default profile plus one rule that names them, each of the five being needed (`--cap-add SYS_ADMIN` alone does not help, because Docker's default profile blocks `pivot_root` whatever the capabilities are);
- `/proc` is not masked, which is what `systempaths=unconfined` does;
- the image has a `/run/user` directory, because Lake covers that path with a tmpfs and bubblewrap cannot create the mount point in a read-only root.

`apparmor=unconfined` changed nothing on the recording host, which has no AppArmor, and is needed where Docker's AppArmor profile applies. With those three, the sandbox started as root and as a non-root user, and none of the options adds a capability. On a host without AppArmor, `seccomp=unconfined` with `systempaths=unconfined` also starts it, and relaxes more. On a stock Ubuntu 24.04 host, AppArmor's restriction on unprivileged user namespaces stops the sandbox as shipped, and no container option lifts it: it starts after `sysctl kernel.apparmor_restrict_unprivileged_userns=0`, or with an AppArmor profile that gives `/usr/bin/bwrap` the `userns` permission [X RUN-bwrap-lanes]. Each relaxation lowers the container's confinement, so the template offers them only as an opt-in, documented profile and never as the default. Verdicts on CI runners, Docker Desktop and Codespaces are {{run:RUN-bwrap-lanes}}.

---

## 5. What the course does not use, and why

| Tool | Why not | Source |
|---|---|---|
| Mathlib | one `Finmap` project's packages took 7.3 GB, and core Lean proves the ledger | [X RUN-lean-mathlib, RUN-lean-ledger] |
| the npm `z3-solver` build, in the tab | it needs threads, SharedArrayBuffer and COOP/COEP headers, which static hosting here does not send; the Pyodide wheel runs without them | [X RESULTS.md, RUN-z3-starter-pyodide] |
| a WebAssembly build of Lean in the tab | a cold load decoded 137,362,599 B, the build needs cross-origin isolation, and it reports `Lean 4.33.0-pre`, older than the 4.35.0 the course pins; the course generates Goal Replay from real elaboration instead and links to live.lean-lang.org, uncredited | [X RUN-lean-wasm], [V] |
| CheerpJ, embedded | free only when served from the vendor's CDN; self-hosting needs a commercial license | [V] |
| Alloy4Fun, embedded | it stores learners' models on a third-party server | [V] |
| Stateright, madsim | dormant: Stateright has had no push since 2025-07-27, and madsim's last commit was a dependency bump | [V] |
| jsCoq | its last stable release is v0.16.0, 2022-09-22 | [V] |
| a home-made TLA+ explorer | a second language that would drift from TLC; Spectacle, tested against TLC, replaces it | [V] |

---

## 6. Re-pin policy

A pin is a version string, plus a hash or a commit where one exists, recorded verbatim. A pin moves only through a reviewed change, never by editing a number in place.

### 6.1 When a pin moves

- **At an edition boundary.** Edition 1 pins Lean 4.35.x and PostgreSQL 18.6. A new edition may move any pin.
- **On a schedule.** Tool claims in the course carry a 60 to 90 day time to live, and production-twin pins carry 60 days. The course's lab tests also run monthly against the newest stable Lean, so a bump never arrives unseen. Lean 4.36 is expected to be the next release [D].
- **Out of schedule.** An advisory against a pinned checker or solver (a kernel soundness bug, a wrong `unsat`); an upstream release replaced under its tag (TLC 1.8.0); a tool that stops building.

### 6.2 How a pin moves

1. **Propose it.** Name the new pin and the reason in the decisions log.
2. **Re-run everything.** Every recorded run is executed again against the new tool (`statespace run <RUN-id>` in the course repository), and the outputs are diffed.
3. **Regenerate what was generated.** A Lean bump regenerates Goal Replay from real elaboration and compares it with the committed strips.
4. **Run the conformance pairs.** Spectacle against TLC, Pyodide Z3 against native Z3, PGlite against PostgreSQL 18.6 on single-session specimens, the tab Datalog against Soufflé, and the lasso validator against TLC on the fixtures. The first pin to move this way was PGlite's, from 0.5.10 to 0.5.11: the same specimens gave the same answers on both [X RUN-pglite-0511].
5. **Read the diff.** If every verdict is unchanged, the pin moves and the new binary hashes are recorded. If one changed, that is not a quiet edit: it becomes an erosion entry on the course's own assurance page and a change card for learners ("N things you learned have changed"), and the affected records get a "re-check" flag, never a deduction.
6. **Update every place the pin lives.** This file, the devcontainer image digest, the command line tool's pin table, and the pins receipts are compared with.

A learner's older receipts stay valid records and show the version they were made with. A tool that differs from its pin does not stop a check: the receipt records the version found, and flags the jar or binary as unpinned when its hash differs [D].

### 6.3 Per tool

| Tool | Rule |
|---|---|
| Lean | Edition 1 stays on 4.35.x. A point release is taken at once when it fixes a soundness bug in the kernel or a bundled checker; the bug of 2026 was fixed in a point release, 4.32.2 [V]. Advisories become change cards (SEAM-15). The next release is first run only as a monthly check, never as a silent bump |
| PostgreSQL | Pin 18.6. A minor release is a re-pin like any other: the isolation catalog is re-run on it before the pin moves [D]. PostgreSQL 19 release candidate 1 appeared on 2026-10-15 and general availability is planned for 2026-11-19, with no isolation or row-level-security changes in its notes [V]; the isolation catalog is re-recorded after general availability, and docs links stay on `/docs/18/` |
| TLC | Never pin by tag: 1.8.0 is rolling. The SHA-256 is the pin. A new nightly is a re-pin: new hash, every TLC run repeated, the distinct-state counts of the DoubleSpend family compared (11, 45, 191 and 813), and the JSON trace shape compared. When a stable release at or above 1.8.0 exists, move to it, drop the "pre-release" label and retire the 1.7.4 fallback |
| Z3, cvc5 | Solver bumps can regress [X RUN-z3-11179]. A bump re-runs the corpus of authored queries, which must stay solved, and every authored `unsat` is cross-checked with the other solver |
| Pyodide and the Z3 wheel | Bumped together. `rlimit` budgets are measured again, because `timeout` never returned in the Node or the browser measurements [X RUN-z3-budget-pyodide, RUN-phone-pyodide] |
| PGlite | A patch release re-runs the single-session specimens against PostgreSQL 18.6 |
| Spectacle | Pinned by commit. The upstream head moved to `8193eb0` on 2026-10-23 [V]; it is adopted only after Spectacle equals TLC on every authored spec |
| Soufflé, Alloy, Apalache | Pinned when their runs are recorded; optional ones move only with the lessons that use them |
| Rust and the crates | The lockfile pins them; they move per edition, not per week |

### 6.4 What never changes silently

The statement-hash rule (text with trailing whitespace removed, plus one newline), the receipt schema version (`receipt@1`), and the rule that receipts record version strings verbatim. A change to any of them is a new schema version and a logged decision.

---

## 7. Runs still to record

Every `{{run:RUN-id}}` in this file waits for a recorded run. When the run exists, the placeholder becomes `[X RUN-id]`.

| Run | Recorded by | What this file waits for |
|---|---|---|
| RUN-bwrap-lanes | W0-S06 | sandbox verdicts on CI runners, Docker Desktop and Codespaces: the record holds labeled stand-ins for the three lanes, and the owner records the real ones |

---

## 8. Where the executed runs live

Paths are relative to `research/`.

| Run | On disk |
|---|---|
| RUN-z3-starter | `spikes/RESULTS.md`; `evidence/a2r3/out/z3_5.3.1.txt` |
| RUN-z3-starter-pyodide | `evidence/A5r3/browser-runs.log` §1 |
| RUN-z3-budget-pyodide | `evidence/A5r3/z3-pyodide.log` |
| RUN-z3-11179 | `evidence/a2r3/out/z3_11179_cli.txt` |
| RUN-z3-fixedpoint | `evidence/A5r3/z3-pyodide.log` |
| RUN-browser-origin | `evidence/A5r3/browser-runs.log` §2 and §3 |
| RUN-cvc5-alethe | `evidence/a2r3/out/cvc5_alethe.txt`; `evidence/a2r3/scripts/cvc5_alethe.py` |
| RUN-lean-ledger | `spikes/RESULTS.md`; `spikes/lean/Ledger.lean` |
| RUN-lean-toolchain | `evidence/lean-measure/run.out`; the full log `evidence/lean-measure/measure.log` |
| RUN-lean-axioms | `evidence/lean-measure/proj/check-bad.out`; `evidence/lean-measure/run.out`; `evidence/a2r3/out/lean_trust.txt` |
| RUN-lean-skipkernel | `evidence/a2r3/out/lean_trust.txt` |
| RUN-lean-comparator | `evidence/A5r3/comp-run2.log`; `evidence/A5r3/comp-run5.log`; `evidence/lean-measure/proj/judge/` |
| RUN-lean-bwrap-docker | `evidence/A5r3/comp-run2.log` |
| RUN-lean-mathlib | `evidence/A5v2/mathlib-measure/measure.out` |
| RUN-tlc-doublespend | `evidence/A5r3/tla/run.log`; `evidence/A5spike/tla174/`; `spikes/RESULTS.md` |
| RUN-tlc-full | `spikes/RESULTS.md`; `evidence/A5r3/tla/run-full.log` |
| RUN-tlc-jars | `evidence/a2r3/out/tlc_runs.txt` |
| RUN-spectacle | `evidence/A5r3/browser-runs.log` §4 |
| RUN-pg-anomalies | `spikes/pg_anomalies.py`; `spikes/RESULTS.md` |
| RUN-pg-claims | `evidence/a2r3/scripts/pg_claims.py`; `evidence/a2r3/out/pg_claims.txt` |
| RUN-pglite | `evidence/A5r3/pglite.log`; `evidence/a2r3/out/pglite.txt` |

Runs recorded from W0 on keep their record at `runs/<RUN-id>.json` (`runs/README.md`) and their outputs in `runs/<RUN-id>/`. This file cites RUN-scaffold, RUN-souffle-version, RUN-alloy-version, RUN-apalache-version, RUN-pglite-0511, RUN-phone-pyodide, RUN-pages-wire-check, RUN-bwrap-lanes, RUN-doctor-devcontainer, RUN-lean-wasm and RUN-fixedpoint-equal from there. The runs of the table above were imported from `research/` in W0 and have records too; the table gives where their original outputs are.
