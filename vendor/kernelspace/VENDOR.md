# vendor/kernelspace

Infrastructure copied from kernelspace, the predecessor course, at one pinned commit (ARCHITECTURE.md section 4.1). statespace inherits kernelspace's learning engine and none of its look (spine section 0): the files here are the stateless, tested parts, and everything coupled to kernelspace's own product stays behind.

| Field | Value |
|---|---|
| Pinned commit | `5ab8883e84318cba7199b137583797ef2907d134` |
| Commit date | 2026-10-20T23:58:30Z |
| Branch | `master`, the tip when pinned |
| Vendored by | W0-S12 |
| Last updated | 2026-10-24 |
| Files | 34 |
| License | no license file upstream; the Rust kit crate declares MIT; an owner action remains (see License and provenance) |

The upstream location is not written in this public repository. `scripts/vendor-drift.mjs` takes it as `--repo <path|url>` or from `KERNELSPACE_REPO`.

## Rules

1. **Never edited in place.** `node scripts/vendor-drift.mjs verify` recomputes every SHA-256 below and fails on any difference. statespace's changes live in wrapper modules (ARCHITECTURE.md section 17.2); the lint in `packages/purity-lint` fails any import of `vendor/` from outside the wrapper homes.
2. **One exception: a redaction.** A mechanical substitution, listed under Redactions, is allowed where the privacy rules (I9, GATE-privacy) forbid a string from entering the public repository. The tool applies it to the upstream bytes before every comparison, so a drift report shows upstream changes only. The manifest records both hashes for such a file.
3. **No file named `AGENTS.md` or `CLAUDE.md`.** Agents that read them would be bound by them (spine section 11.1). The agent kit's templates keep other names, and `verify` fails on either name.
4. **Bytes stay bytes.** The `.gitattributes` beside this file turns off line-ending conversion, so the SHA-256 values hold on every platform.
5. **Updates go through the tool.** `diff` prints a reviewable report against a newer commit; `update --write` applies it as an ordinary working-tree change. Run GATE-privacy and the fast lane before merging one.

## Modules, their homes and what the wrapper supplies

A "home" is where statespace's wrapper lives (ARCHITECTURE.md sections 4.2 and 17.1). W0-S12 builds the two that need no later design; the rest are built by the task named.

| Module | Files | Home | Built by | The wrapper supplies |
|---|---|---|---|---|
| fsrs | `fsrs.ts`, its reference vectors and test, the vector generator | `packages/learner/src/schedule/` | W0-S12 | the two types `fsrs.ts` imports from kernelspace's learner types (`MemoryState`, `Rating`), declared beside the wrapper and mapped by `paths`; statespace's target retention (0.85 to 0.90, spine section 4.1) is set by callers |
| rng | `rng.ts`, `verify-determinism.ts` | `packages/rng/`; GATE-generators | W0-S12; W1 | `freshSeed()` is not re-exported: it reads the entropy pool, and seeds are drawn on the main origin and recorded before a run (ARCHITECTURE.md section 6.6). The lint's scope list names kernelspace paths; the wrapper sets statespace's seeded paths (`packages/generators`, `packages/pocket`, the Clearinghouse world) |
| sw | `sw.js`, `build-sw-manifest.ts`, `sw-smoke.ts`, two tests | `apps/site/src/sw/`, `apps/instruments/src/sw/` | W1-T02; W1-T06 | `SCHEMA_VERSION`, which the build script imports from kernelspace's ledger. The vendored worker names kernelspace in its offline page and its cache prefix and lists its capstone page as a static route: the build step that derives `dist/sw.js` rewrites those (as upstream's script already fills the `BUILD` placeholder), and the vendored source stays as it is |
| a11y | `a11y.mjs`, its failing fixture | `scripts/a11y.mjs` as GATE-a11y | the GATE-bundle task | the route list (kernelspace's routes are replaced); Playwright and axe at the versions pinned in `RUN-scaffold` |
| verify | `verify-items.ts`, `item-cues.ts`, `item-pools.ts` | `scripts/verify-items.mjs` as GATE-items | W1-T39 | statespace's item and lesson data model in place of kernelspace's `QuizQuestion` and `Lesson`; the rules of ASSESSMENT.md section 7 on top of the blind-strategy checks |
| agent-kit | the hook, settings, AGENTS template and output style; `verify-guardrails.ts`; `dump-labs.ts` | `labs/agent-kit/`, `scripts/verify-guardrails.mjs` | W1-T18 | the one-line CLAUDE.md template, the protected-paths manifest, `STATESPACE_GUARD` in place of `KS_SOLO` (ARCHITECTURE.md section 12.3), lab definitions from content |
| packer | `pack-labs.py` | `labs/pack/` | W1-T18 | lab definitions from content in place of `dump-labs.ts`; the course domain in `LAB_URL`, read from deployment configuration |
| wasm-abi | the host, worker, driver and types; the Rust kit crate; the ABI test; `verify-wasm-lab.ts` | `apps/instruments/src/lane-a/`, `labs/kit-rs/` | the Lane A task | host-side oracles (ARCHITECTURE.md section 6.6); ABI v2 stays unchanged |

## Manifest

SHA-256 of the bytes in this repository, and of the upstream blob they came from. The two differ only for a redacted file. Mode is the git mode: 644 or 755.

<!-- vendor-manifest:begin -->
| Path | Module | SHA-256 (this repository) | SHA-256 (upstream blob) | Mode | Note |
|---|---|---|---|---|---|
| `src/lib/learner/fsrs.ts` | fsrs | `1e9707550bcee605acf0b6e1afc80f20db0a991fd2447129460aa2a6ae5918f4` | `1e9707550bcee605acf0b6e1afc80f20db0a991fd2447129460aa2a6ae5918f4` | 644 | FSRS-6 memory model, pure |
| `tests/fixtures/fsrs/reference-vectors.json` | fsrs | `67761a28cf8ab22609dabc92743bc31ea1e0f148663e8d9413d26f8d13c9efd3` | `67761a28cf8ab22609dabc92743bc31ea1e0f148663e8d9413d26f8d13c9efd3` | 644 | ts-fsrs 5.4.2 output, 2000 replays |
| `tests/learner/fsrs.test.ts` | fsrs | `9c8a88e664a581893e43b6db6bec86e73595091200a1f9c40d8bff5746425df4` | `9c8a88e664a581893e43b6db6bec86e73595091200a1f9c40d8bff5746425df4` | 644 | bun test, 1e-8 tolerance |
| `scripts/gen-fsrs-vectors.ts` | fsrs | `4d56d98dbdf12c322dd9f762e959ec4c5ae04c1dc40ccf02567b1566509a3204` | `4d56d98dbdf12c322dd9f762e959ec4c5ae04c1dc40ccf02567b1566509a3204` | 644 | regenerates the vectors; needs ts-fsrs 5.4.2 in a scratch directory |
| `src/lib/rng.ts` | rng | `078ef989d77ca4c88f8b2fe55cc130bd7561770780b397ae2511ef1404da6817` | `078ef989d77ca4c88f8b2fe55cc130bd7561770780b397ae2511ef1404da6817` | 644 | splitmix32, FNV-1a, shuffles; integer-only |
| `scripts/verify-determinism.ts` | rng | `cbf69560eb825c733081d76a89192b81f07ef0c8f522d472ccf173b96c8b61ee` | `cbf69560eb825c733081d76a89192b81f07ef0c8f522d472ccf173b96c8b61ee` | 644 | AST lint; its scope list names kernelspace paths |
| `public/sw.js` | sw | `5c138021a33267697a9fe7254aae49c2dfcd1738c966074aa3f70b4cdbee9729` | `5c138021a33267697a9fe7254aae49c2dfcd1738c966074aa3f70b4cdbee9729` | 644 | kill switch, network-first shell, schema handshake |
| `scripts/build-sw-manifest.ts` | sw | `bb016ca07f92d3520934d6ec8bab0cf095d7af4b953ac6f8dc615a5966e376a3` | `bb016ca07f92d3520934d6ec8bab0cf095d7af4b953ac6f8dc615a5966e376a3` | 644 | fills the BUILD placeholder after the build |
| `scripts/sw-smoke.ts` | sw | `b864990a3ae169ccdc3f12114cad261a8a44a35b780d7e615b72f33fd0a3c088` | `b864990a3ae169ccdc3f12114cad261a8a44a35b780d7e615b72f33fd0a3c088` | 644 | smoke test of the built worker |
| `tests/sw/manifest.test.ts` | sw | `a30ab2ada9ceef292d627fe9d24e1e37848368a8581a036ea0477248dcdba60e` | `a30ab2ada9ceef292d627fe9d24e1e37848368a8581a036ea0477248dcdba60e` | 644 | bun test; holds the kill-switch and nosw cases |
| `tests/sw/fallback.test.ts` | sw | `93408ca10264efc9856297ff0639ef593ee01464e126090b64bac7728033007e` | `93408ca10264efc9856297ff0639ef593ee01464e126090b64bac7728033007e` | 644 | bun test; navigation fallback |
| `scripts/a11y.mjs` | a11y | `65412fd9eff0c83faf74d0d4eaddaff463e575cb1cbb0ae32777e3c886ef2ab1` | `65412fd9eff0c83faf74d0d4eaddaff463e575cb1cbb0ae32777e3c886ef2ab1` | 644 | axe at 360, 320 and 1280 px, plus a reflow check |
| `e2e/fixtures/bad-contrast.html` | a11y | `d350029d0eed993f1362c6309e3af508f4debc592f747c64460b8cd8989eb694` | `d350029d0eed993f1362c6309e3af508f4debc592f747c64460b8cd8989eb694` | 644 | the harness's own failing fixture |
| `scripts/verify-items.ts` | verify | `295d214e9e2032dd5f299200f367e6047168df3c3908f836f4d9a2b2e2d1478b` | `295d214e9e2032dd5f299200f367e6047168df3c3908f836f4d9a2b2e2d1478b` | 644 | item lints and blind-strategy gates |
| `scripts/item-cues.ts` | verify | `6eac86137d783fec3ef4123ceeeb0fb692e68955f98b03110e33de134cb29c9c` | `6eac86137d783fec3ef4123ceeeb0fb692e68955f98b03110e33de134cb29c9c` | 644 | blind strategies and cue features |
| `scripts/item-pools.ts` | verify | `c15b030000417d05c01a244a6eceab8688bb51f3a06ac79b7daaf9eb66b06572` | `c15b030000417d05c01a244a6eceab8688bb51f3a06ac79b7daaf9eb66b06572` | 644 | pools, pseudo-lessons, the Wave 2 bar |
| `labs/agent-kit/hooks/ks-guard.sh` | agent-kit | `6bc17427a21957ab1b07ee11a6aa39cc9c62844f9b2abc862d9b43b7cbb38a11` | `6bc17427a21957ab1b07ee11a6aa39cc9c62844f9b2abc862d9b43b7cbb38a11` | 644 | the fail-closed PreToolUse hook, POSIX sh |
| `labs/agent-kit/settings.template.json` | agent-kit | `8e4ca462e15e2be2d1702b5dd56e4ef5bb20fba7267c1de5fd1a16c10b74aff0` | `8e4ca462e15e2be2d1702b5dd56e4ef5bb20fba7267c1de5fd1a16c10b74aff0` | 644 | deny rule, hook entry, output style |
| `labs/agent-kit/AGENTS.template.md` | agent-kit | `56e50a16b813093427d3bd2a357135b00da15cd4f672ad21f6adb296e0c520e8` | `56e50a16b813093427d3bd2a357135b00da15cd4f672ad21f6adb296e0c520e8` | 644 | per-lab agent instructions template |
| `labs/agent-kit/output-styles/kernelspace-socratic.md` | agent-kit | `ef9e7a2db736b614a2f9a515e2b6d6541a08bf3f7826c7c9e638624a1f615e04` | `ef9e7a2db736b614a2f9a515e2b6d6541a08bf3f7826c7c9e638624a1f615e04` | 644 | the Socratic output style |
| `scripts/verify-guardrails.ts` | agent-kit | `9815b4f2b7d0411aa0554cae48023aa6ecd4f2f10c1769d204165f5802417b16` | `9815b4f2b7d0411aa0554cae48023aa6ecd4f2f10c1769d204165f5802417b16` | 644 | hook fixture matrix and zip audit |
| `scripts/dump-labs.ts` | agent-kit | `9e2171de6c264a66d6041fe3230391dd248d9f7738c42a1f6839b475b9b0eb95` | `9e2171de6c264a66d6041fe3230391dd248d9f7738c42a1f6839b475b9b0eb95` | 644 | the lab data contract the packer reads |
| `scripts/pack-labs.py` | packer | `3638f4455b3141eef905b025584bf3131ed121ebc75b8cdbb8723fdf1f195d72` | `8dd615906d80ed094225e6bf3a2e6facdb85a7dabd1b6c72c8cb5ff8e6fe6ec8` | 755 | deterministic zip and tar.gz packer with an audit |
| `src/lib/wasm-lab.ts` | wasm-abi | `64044b2fc7c3e9a775a0e44fe8d9ca456415291312ef7f30cb9a4d3815b31c53` | `64044b2fc7c3e9a775a0e44fe8d9ca456415291312ef7f30cb9a4d3815b31c53` | 644 | the host: no imports, ks_run, ks_invoke |
| `src/lib/forge/abi.ts` | wasm-abi | `3f695f16d757fc0fd8510c5494e23576bd0621e89b25a45278756de87973d4e6` | `3f695f16d757fc0fd8510c5494e23576bd0621e89b25a45278756de87973d4e6` | 644 | ABI v2 table and reply parsers, pure |
| `src/lib/forge/types.ts` | wasm-abi | `71267e21c23d076ce8dd02d7b9362f358d4eaf8c9d86b9d40fbe1b9bc69434d5` | `71267e21c23d076ce8dd02d7b9362f358d4eaf8c9d86b9d40fbe1b9bc69434d5` | 644 | host types |
| `src/lib/forge/run.ts` | wasm-abi | `fafb5f5f1de914c270da2a7401e3eca5ffcf1b321b369fe2832e2efebafe5aa3` | `fafb5f5f1de914c270da2a7401e3eca5ffcf1b321b369fe2832e2efebafe5aa3` | 644 | per-check driver, a fresh instance per check |
| `src/lib/lab-worker.ts` | wasm-abi | `11794d144c025be04a49b88ff9641732ce84a4b735d5ccf142d36fbb5a47e30b` | `11794d144c025be04a49b88ff9641732ce84a4b735d5ccf142d36fbb5a47e30b` | 644 | main-thread pool: timeouts, worker replacement |
| `src/workers/lab.worker.ts` | wasm-abi | `da80ac4d9a2f0dc8e5d2eac16acda586c497895e06c490cdac1e578bab235889` | `da80ac4d9a2f0dc8e5d2eac16acda586c497895e06c490cdac1e578bab235889` | 644 | the worker that runs untrusted modules |
| `src/workers/lab-protocol.ts` | wasm-abi | `fcaedb8e56e259709604646605cd5e30d779b848adc0e3704a3304e7288e99de` | `fcaedb8e56e259709604646605cd5e30d779b848adc0e3704a3304e7288e99de` | 644 | worker messages and size caps |
| `tests/forge/abi.test.ts` | wasm-abi | `67164a2222848f36e1b510d004814024a5b7dffdaa9ef01d01d5c83bd3602c61` | `67164a2222848f36e1b510d004814024a5b7dffdaa9ef01d01d5c83bd3602c61` | 644 | bun test for abi.ts |
| `scripts/verify-wasm-lab.ts` | wasm-abi | `6a11241f391c1b3f73092274b7779227b4c3c47c84b4b9c1b27e96574507a99d` | `6a11241f391c1b3f73092274b7779227b4c3c47c84b4b9c1b27e96574507a99d` | 644 | headless run of a built module |
| `labs/kit/Cargo.toml` | wasm-abi | `af7d3d7e8d90a6198e1f9d31046cafac3217cb958b3a3a0574bbd6fb81b81b3d` | `af7d3d7e8d90a6198e1f9d31046cafac3217cb958b3a3a0574bbd6fb81b81b3d` | 644 | the kit crate manifest, no dependencies |
| `labs/kit/src/lib.rs` | wasm-abi | `faf92453c85299f0eb62e1e04c4a002d92f4da821e6dbeb4318b15ecfe0cbe69` | `faf92453c85299f0eb62e1e04c4a002d92f4da821e6dbeb4318b15ecfe0cbe69` | 644 | the kit crate: the exports every lab module has |
<!-- vendor-manifest:end -->

## Redactions

<!-- vendor-redactions:begin -->
| Path | Find (regular expression) | Replace | Why |
|---|---|---|---|
| `scripts/pack-labs.py` | `("LAB_URL": f"https://)[^/"]+(/forge/)` | `$1<course-domain>$2` | the host of upstream's deployment is a personal domain; the public repository writes `<course-domain>` and takes the real one from deployment configuration (OD-5, GATE-privacy) |
<!-- vendor-redactions:end -->

## Imports that leave the vendored set

Generated by `vendor-drift.mjs`; `verify` fails when it is stale. Most rows are kernelspace product modules (lesson data, labs data, the ledger, Fleet Week) that statespace does not inherit; the wrapper or the later task named above supplies each in statespace's own form. Type-only rows cost nothing at run time. `bun:` rows are tests that run under bun, which statespace does not use: statespace's wrappers port them to Node's test runner.

<!-- vendor-imports:begin -->
| Importer | Imports | Kind | Target |
|---|---|---|---|
| `scripts/a11y.mjs` | `@axe-core/playwright` | runtime | package @axe-core/playwright |
| `scripts/a11y.mjs` | `@playwright/test` | runtime | package @playwright/test |
| `scripts/build-sw-manifest.ts` | `../src/lib/ledger/constants` | runtime | src/lib/ledger/constants (not vendored) |
| `scripts/dump-labs.ts` | `../src/data/labs` | runtime | src/data/labs (not vendored) |
| `scripts/item-cues.ts` | `../src/components/QuizBlock` | type | src/components/QuizBlock (not vendored) |
| `scripts/item-cues.ts` | `../src/data/lessons/types` | type | src/data/lessons/types (not vendored) |
| `scripts/item-pools.ts` | `../src/components/QuizBlock` | type | src/components/QuizBlock (not vendored) |
| `scripts/item-pools.ts` | `../src/data/lessons/types` | type | src/data/lessons/types (not vendored) |
| `scripts/item-pools.ts` | `../src/lib/learner/protege` | runtime | src/lib/learner/protege (not vendored) |
| `scripts/verify-determinism.ts` | `typescript` | runtime | package typescript |
| `scripts/verify-items.ts` | `../src/components/QuizBlock` | type | src/components/QuizBlock (not vendored) |
| `scripts/verify-items.ts` | `../src/data/lessons` | runtime | src/data/lessons (not vendored) |
| `scripts/verify-items.ts` | `../src/data/lessons/types` | type | src/data/lessons/types (not vendored) |
| `scripts/verify-items.ts` | `../src/lib/fleet-week` | runtime | src/lib/fleet-week (not vendored) |
| `scripts/verify-wasm-lab.ts` | `../src/data/labs` | runtime | src/data/labs (not vendored) |
| `src/lib/forge/run.ts` | `../ledger/types` | type | src/lib/ledger/types (not vendored) |
| `src/lib/learner/fsrs.ts` | `@/lib/learner/types` | type | src/lib/learner/types (not vendored) |
| `tests/forge/abi.test.ts` | `bun:test` | runtime | bun:test (bun only) |
| `tests/learner/fsrs.test.ts` | `bun:test` | runtime | bun:test (bun only) |
| `tests/learner/fsrs.test.ts` | `../../src/lib/learner/types` | type | src/lib/learner/types (not vendored) |
| `tests/sw/fallback.test.ts` | `bun:test` | runtime | bun:test (bun only) |
| `tests/sw/manifest.test.ts` | `bun:test` | runtime | bun:test (bun only) |
| `tests/sw/manifest.test.ts` | `../../src/lib/ledger/constants` | runtime | src/lib/ledger/constants (not vendored) |
<!-- vendor-imports:end -->

## Considered and not vendored

| What | Why |
|---|---|
| `labs/AGENTS.md`, `labs/CLAUDE.md` | files with these names bind the agents that work beside them (rule 3), and the first one names the deployment host. The packer reads `CLAUDE.md` as one line, `@AGENTS.md`; the wrapper supplies it as a template |
| `src/lib/graded-seed.ts` | Fleet Week's seed hygiene: product logic over kernelspace's persistent world |
| `scripts/baselines/verify-items.json` | kernelspace's own item counts; statespace's ratchet starts empty |
| `tests/guardrails/hook.test.ts`, `tests/items/verify-items.test.ts` | their subjects need kernelspace's lab and lesson data to run. The hook itself is vendored, and GATE-guardrails (W1-T18) writes statespace's fixture matrix; read these two at the pinned commit when extending it |
| ledger v3, KC graph, claims registry, the Fleet world, the look | ARCHITECTURE.md sections 4.2 and 4.3: re-implemented, adapted or not inherited |
| `.github/workflows/`, `.devcontainer/` | statespace's lanes and devcontainer are new (W0-T04, W0-T05) |

## License and provenance

- **kernelspace's own license.** There is no `LICENSE` file at the pinned commit, no `license` field in kernelspace's `package.json`, no license section in its README and no license in its repository metadata. The only statement is `license = "MIT"` in the manifest of each of its Rust crates, the vendored kit crate (`labs/kit/Cargo.toml`) included. So the Rust files are declared MIT by their author, and the TypeScript, Python and shell files carry no declaration. The vendored code is the course owner's own, so nothing here is a third party's work, but a public file without a license grants a reader no rights, and ARCHITECTURE.md section 4.1 expects "kernelspace's license file" beside these files. **TODO (owner, OD-16):** choose the code license, add its file beside `VENDOR.md`, and add the same to kernelspace so the next pin carries it. GATE-privacy's license lint stays red for this directory until then, which is the honest state.
- **ts-fsrs.** `fsrs.ts` transcribes the memory model of ts-fsrs 5.4.2, and `reference-vectors.json` is that library's output. ts-fsrs is MIT licensed; its notice is in `NOTICE` beside this file, because the transcription carries it.
- **Nothing else** in the set states a third-party origin.

## Updating

```
node scripts/vendor-drift.mjs verify
node scripts/vendor-drift.mjs diff   --repo <path|url> --ref <commit-ish>
node scripts/vendor-drift.mjs update --repo <path|url> --ref <commit-ish> --write
```

To add a file, add a row to the manifest with empty hash cells and run `update --write`. To drop or rename one, edit the row first: `update` stops at a path the new commit does not have.
