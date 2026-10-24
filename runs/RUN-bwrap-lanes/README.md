# runs/RUN-bwrap-lanes/

The outputs of RUN-bwrap-lanes ([runs/RUN-bwrap-lanes.json](../RUN-bwrap-lanes.json)); the decision record is
[docs/spikes/W0-S06.md](../../docs/spikes/W0-S06.md) and the harness that wrote this folder is
[scripts/spikes/W0-S06/](../../scripts/spikes/W0-S06/). `node scripts/spikes/W0-S06/assemble-run.mjs` rebuilds the
record from this folder; nothing in the record is typed by hand.

| Path | What it holds |
|---|---|
| `<lane>-<profile>/` | one configuration: `local-*` ran on this machine's Docker Engine, `vm-ubuntu-24.04-*` on a stock Ubuntu 24.04 virtual machine (`host-*` on the machine, `docker-*` in Docker on it); a real lane's folders are named `ci-*`, `docker-desktop-*` or `codespaces-*` |
| `<config>/facts.env` | `key=value` facts of the environment: kernel, CPUs, seccomp mode, capabilities, Linux security modules, the AppArmor sysctl, bubblewrap's version and hash, Lean's and each checker's hash, what the platform shipped before any install |
| `<config>/profile.env`, `done.env` | the lane and profile labels; when the probe finished, which probe profile it used, the canaries' exit codes, the load average and the memory high-water mark at the end |
| `<config>/docker-run.argv`, `docker-run.exit` | the full `docker run` argv, one word per line, with repository-relative paths (a `--cidfile` it names is deleted by `run-matrix.sh` once `collect-oom.mjs` has read the container id from it); its exit code |
| `<config>/probe.log` | what the container printed to the terminal: the probe's closing line |
| `<config>/fixtures.sha256` | `sha256  name` lines for the private fixture files the probe used (the pack's three solution files and, in the full profile, the eight rejected solutions made from them): hashes only, because the files are not published. `assemble-run.mjs` compares them with `scripts/spikes/W0-S06/private-fixtures.json`. A configuration recorded before the probe wrote it has none: it ran with the files that the record's `inputs[]` lists |
| `<config>/steps/NN-name.out` | the merged stdout and stderr of one command, in order, with paths normalized to `<work>`, `<elan>` and `<home>` |
| `<config>/steps/NN-name.meta` | `key=value`: `argv`, `env`, `rc` (exit code), `ms` (wall time), `cpu_user_ms` and `cpu_sys_ms` (the command's CPU time), `loadavg` (1, 5 and 15 minutes at its start), `out_sha256`, `mem_peak_bytes` (the container's memory high-water mark so far) |
| `<config>/shim/*.log` | the `bwrap-shim.sh` logs: `CALL` (start in microseconds, call number), one `ARG` per bubblewrap argument, then `END` (end, exit code, microseconds); `discover-*` are Lake's own calls, `inject.log` the injected faults |
| `<config>/kernel-oom.txt` | the kernel's report when a memory cap killed a process in the container (`collect-oom.mjs`: the killed process, its anonymous memory, the cgroup's limit; attributed by the container's id), or one line saying there was none or that the log could not be read; present for the configurations recorded with it |
| `<config>/note.txt` | a note on how the configuration was recorded, when that differs from the rest |
| `profiles/<lane>/` | the narrow seccomp profile and how it was built (`*.info.json`: the upstream URL and SHA-256), and `ablation/` with each variant that leaves one call out; `profiles/NOTICE.md` and `LICENSE` give their origin (Docker's default profile, Apache License 2.0) |
| `bundle-x86_64/`, `bundle-aarch64/` | what the Lean 4.35.0 toolchain archive of each architecture bundles in `bin/`: sizes and SHA-256 (`bin.tsv`), and the archive's URL, size and SHA-256 (`bundle.env`) |
| `engine-<lane>.env`, `vm.env` | the Docker engine and image facts of a lane's run; the virtual machine's image, QEMU and timings |
| `vm-ubuntu-24.04-*.log`, `*.apparmor.txt`, `*.sysctl.txt`, `*.docker-info.txt`, `vm-console.log` | the virtual machine run's progress, the AppArmor state it started from, the sysctl changes, Docker's security options and the guest's own progress lines |
| `private-fixtures-provenance.txt` | the SHA-256 and modification time (UTC) of each private fixture file the recorded configurations used, read from the copies kept outside the repository after the files left the pack folder (`cp -p` keeps the time); the last was modified before the first configuration started. It also holds the result of comparing the eight rejected solutions that `mutate.mjs` makes with the files that ran |
| `workflow-lint.txt` | `actionlint` over `scripts/spikes/W0-S06/lanes/ci-runners.workflow.yml` (`lanes/lint.sh`): the tool's version and hash, the file's hash, its output (none) and its exit code |
| `trial-module-collision/` | the side trial of `scripts/spikes/W0-S06/collision-trial.sh`: two libraries whose root modules share a name |

A step's output is never edited. The classification of each Lake run (`sandbox`, `verdict`, `reason`, the evidence
lines) is computed from it by `scripts/spikes/W0-S06/classify.mjs` and lives in the record, not here.
