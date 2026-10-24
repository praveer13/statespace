# lean-sandbox.json

The seccomp profile of the devcontainer's opt-in sandbox (`../docker-compose.sandbox.yml`).

It is Docker's own default seccomp profile for Docker Engine 29.1.3 plus one allow rule, and nothing else:

| | |
|---|---|
| base | `default.json` of `github.com/moby/profiles` as vendored by `github.com/moby/moby` at tag `docker-v29.1.3`, SHA-256 `01536f1d1df938ae611eba20d6349e0de7a99b6ecdee1549427a0b01b8301e28`, 31 rules |
| added rule | `clone`, `mount`, `pivot_root`, `umount2`, `unshare`: `SCMP_ACT_ALLOW`, the five system calls that bubblewrap needs to set up Lean's sandbox in a container that does not hold `CAP_SYS_ADMIN` (W0-S06; each of the five is needed) |
| this file | SHA-256 `80d8b92cd073ec206f4806e50b3348c144d06173a165724b1a615fd3ebf0fe1b`, 32 rules |
| license | Apache License 2.0, in `LICENSE` beside this file; copyright The Moby authors. This file is a modified copy: the rule above is the modification |

Regenerate it for another engine version with `node scripts/spikes/W0-S06/make-seccomp-profile.mjs --out lean-sandbox.json --engine-version <x.y.z>`. A profile built from one engine's default is not the default of a newer engine, which may allow or block other calls; if a container fails to start with this profile after an engine upgrade, regenerate it, or use `seccomp=unconfined`, which relaxes more.
