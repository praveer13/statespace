# bench/image/tla2tools

The two TLC jars that the Bench image ships, copied from the TLA+ tools project at pinned hashes. This file marks the folder as vendored: GATE-privacy checks that every directory holding a `VENDOR.md` carries a license file of its own, and this one does.

| Field | Value |
|---|---|
| Upstream | the TLA+ tools releases, `https://github.com/tlaplus/tlaplus/releases`: the tag `v1.8.0`, a rolling pre-release, and the tag `v1.7.4`, the last stable tag |
| Vendored by | W0-T05 |
| Last updated | 2026-10-24 |
| Files | `tla2tools-1.8.0.jar`, `tla2tools-1.7.4.jar` and `LICENSE` |
| License | MIT: [`LICENSE`](LICENSE) beside this file is upstream's, copied from its default branch on 2026-10-24 |

## Pins

| File | First line TLC prints | SHA-256 |
|---|---|---|
| `tla2tools-1.8.0.jar` | `TLC2 Version 2026.10.20.183001 (rev: d2e1472)` | `5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2` |
| `tla2tools-1.7.4.jar` | `TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)` | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` |

Both version strings and both hashes are those of [X RUN-tlc-jars]. [README.md](README.md) says why the jars are here and not fetched, and what each one is for.

## Rules

1. **The SHA-256 is the pin, not the tag and not the file name.** The `v1.8.0` release is re-published under its tag, and the asset at the tag on 2026-10-24 was not the jar the course ran [X RUN-doctor-devcontainer].
2. **Never edited in place.** `bench/image/Dockerfile` checks both hashes before the build goes on, and `statespace doctor` compares each jar in the image with its pin.
3. **A new jar is a re-pin.** It follows the re-pin policy of `labs/TOOLS.md` section 6, and the Dockerfile, `bench/statespace/doctor.py` and the recorded run change together (`bench/image/README.md`, "Moving a pin").
4. **The folder stays here.** Spine sections 3.5 and 11.1 name `bench/image/tla2tools/`. Moving it would change the Dockerfile's `COPY` line and the recorded inputs of [X RUN-doctor-devcontainer].
