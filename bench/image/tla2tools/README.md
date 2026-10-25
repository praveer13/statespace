# tla2tools, vendored

The two TLC jars that the Bench image ships (`bench/image/Dockerfile` copies this folder to `/opt/tla2tools/` and checks both hashes before the build goes on). The license is in [LICENSE](LICENSE): MIT, copied from the upstream repository's default branch on 2026-10-24.

| File | First line TLC prints | SHA-256 | Bytes |
|---|---|---|---|
| `tla2tools-1.8.0.jar` | `TLC2 Version 2026.10.20.183001 (rev: d2e1472)` | `5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2` | 4,502,227 |
| `tla2tools-1.7.4.jar` | `TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)` | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` | 2,274,532 |

Both are the jars of [X RUN-tlc-jars]. **Why they are here and not fetched.** The v1.8.0 release is a rolling pre-release, re-published under its tag. The GitHub API listed its asset on 2026-10-24 with 4,502,259 bytes and SHA-256 `d15655eeaff4b3f7b3d65c46b838bc0f35d131b2ef4b1e473689b62c98d4726f`, which is not the jar the course ran [X RUN-doctor-devcontainer]: a build that fetched the tag would fail its hash check, or worse, run another TLC. The v1.7.4 asset, the last stable tag, hashes to the value above today. The SHA-256 is the pin, not the tag and not the file name.

**Where they live.** Here, beside the image that ships them, and they stay here: spine sections 3.5 and 11.1 name `bench/image/tla2tools/`. Moving them would change the `COPY` line of the Dockerfile and the recorded inputs of [X RUN-doctor-devcontainer]. [VENDOR.md](VENDOR.md) records where they came from and brings the folder under GATE-privacy's check that a vendored directory carries its license file.
