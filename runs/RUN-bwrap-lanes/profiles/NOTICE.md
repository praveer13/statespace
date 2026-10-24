# Notice

The seccomp profiles in this folder (`<lane>/seccomp-bwrap.json` and `<lane>/ablation/*.json`) are modified copies
of Docker's default seccomp profile, which is part of the Moby project
([github.com/moby/profiles](https://github.com/moby/profiles), `seccomp/default.json`; Apache License 2.0,
Copyright The Moby authors; the license text is in `LICENSE` beside this file).

Each profile was made by `scripts/spikes/W0-S06/make-seccomp-profile.mjs` from the upstream file named in its
`.info.json` (with that file's SHA-256), by adding one rule: the system calls `clone`, `mount`, `pivot_root`,
`umount2` and `unshare` with the action `SCMP_ACT_ALLOW`, or the same rule with one of the five left out
(`ablation/`). No other line of the upstream profile was changed.
