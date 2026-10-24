# W0-S06 harness: the sandbox lanes and `--paranoid` timing

The decision record is [docs/spikes/W0-S06.md](../../../docs/spikes/W0-S06.md); the run is
`runs/RUN-bwrap-lanes.json` with its outputs in `runs/RUN-bwrap-lanes/`. This folder holds what produced them. It does
not hold the pack's solution files: they are private (see "The private fixtures"), and every script that needs them
asks for their directory.

| Path | What it is |
|---|---|
| `pack/lab2/` | the public part of the LAB-2 whole-lab challenge pack: `challenge/Challenge.lean` copied verbatim from `curriculum/S02-proof.md` section 3, `comparator.json`, `lakefile.toml`, `lake-manifest.json` and `lean-toolchain`. The solution files are not here, so `lake build` in this folder alone fails |
| `private-fixtures.json` | the SHA-256 values and sizes of the files that are not here: the pack's three solution files and the eight rejected solutions made from them. Hashes only |
| `mutate.mjs`, `mutate.test.mjs` | makes the eight rejected solutions (`weak`, `redef`, `sorry`, `axiom`, `native`, `kernelskip`, `missing`, `builderror`) from the private `Solution.lean`, one edit each, and checks a private directory against `private-fixtures.json`; its tests (`node --test scripts/spikes/W0-S06/mutate.test.mjs`) run on an invented solution |
| `image/Dockerfile` | Ubuntu 24.04, bubblewrap, and Lean 4.35.0 through elan 4.2.4 as a non-root user, as `labs/TOOLS.md` section 2.2 installs it, with a `/run/user` directory |
| `lane-probe.sh` | runs in any Linux environment (a container, a CI runner, a Codespace) and records raw outputs, exit codes, wall and CPU times, the memory high-water mark and facts; it never classifies. It needs `--solutions DIR` |
| `run-matrix.sh` | runs the probe in a set of `docker run` profiles (`--list` names them) and records each run's full argv. It needs `--solutions DIR` |
| `collect-oom.mjs` | reads the host's kernel log after a container run and keeps the out-of-memory report for that container, if a memory cap killed a process in it (`run-matrix.sh` calls it) |
| `make-seccomp-profile.mjs` | builds the narrow seccomp profile: Docker's default profile for the engine in use plus one allow rule, or the same with one of its five calls left out |
| `bwrap-shim.sh` | a `COMPARATOR_BWRAP` program that logs Lake's bubblewrap calls and times them, and can inject a fault at the N-th call |
| `classify.mjs`, `classify.test.mjs` | the reference rule that tells a sandbox failure from a rejection, with its tests (`node --test scripts/spikes/W0-S06/classify.test.mjs`) |
| `expectations.mjs` | what each recorded step was built to show, written before the classifier is run over it |
| `assemble-run.mjs` | classifies every recorded Lake run, checks it against the expectations and writes `runs/RUN-bwrap-lanes.json`; `--markdown` prints the record's tables, `--check` writes nothing, `--solutions DIR` also verifies the private fixtures |
| `list-bundle.sh` | lists what the Lean toolchain archive of one architecture bundles in `bin/` |
| `vm/` | boots a stock Ubuntu 24.04 cloud image under QEMU/KVM and runs the probe on it and in Docker on it (the closest local stand-in for a CI runner); `vm/run-vm.sh` needs `--solutions DIR` |
| `collision-trial.sh` | a side trial: two libraries whose root modules share a name, as the S02 layout sketch has, and what Lake builds and checks |
| `lanes/ci-runners.workflow.yml` | a template, never run, for recording the CI-runner lane on GitHub's runners; it fetches the private fixtures from the private companion repository |
| `lanes/lint.sh` | runs `actionlint` over that template and keeps the output in `runs/RUN-bwrap-lanes/workflow-lint.txt` (a syntax and runner-label check; it does not run the workflow) |

## The private fixtures

The pack's three solution files, `Solution.lean` (proofs of the seven whole-lab theorems), `broken/Broken.lean` and
`fixed/Fixed.lean`, are complete proofs of the lab's theorems. They are reference solutions, so they are not in this
repository (spine section 11.1; `docs/ARCHITECTURE.md` section 13.5): they belong in the private companion repository,
under `spikes/W0-S06/`, and until the owner has moved them there the only copy is the one on the machine that recorded the
run. A script that needs them takes their directory from `--solutions DIR` or from
`W0S06_SOLUTIONS=DIR`, and stops with a message that says so when neither is given: `lane-probe.sh`, `run-matrix.sh` and
`vm/run-vm.sh` to run, `mutate.mjs` and `assemble-run.mjs` to check a directory. The directory has the pack's layout:

```
Solution.lean
broken/Broken.lean
fixed/Fixed.lean
```

The eight rejected solutions of the full probe are stored nowhere. `mutate.mjs` makes each from `Solution.lean` by one
edit that finds a theorem by name and replaces its proof lines or edits its statement line, so it holds none of the lab's
proofs; the one variant that writes proofs, `redef`, redefines `transfer` as the identity and proves three statements for
that definition only (`mutate.mjs --list` says what each variant breaks). `run-matrix.sh` runs it for `--full`, and
`lane-probe.sh` for the full profile when `node` is installed; a bare container without `node` is given the variants
with `--variants DIR`, which is how `run-matrix.sh` does it. `mutate.mjs` refuses an `--out` inside the repository.

What the repository keeps of the private files is their SHA-256 values: in `private-fixtures.json`, and in the run's
`inputs[]` with the role "private fixture, not published". To confirm that a directory holds the files the recorded run
used, and that `mutate.mjs` makes the recorded rejected solutions from it:

```
node scripts/spikes/W0-S06/mutate.mjs --solutions DIR --verify
node scripts/spikes/W0-S06/assemble-run.mjs --check --solutions DIR
```

A configuration recorded with the present probe also holds `fixtures.sha256`, the hashes of the fixture files it used
(never their text). `assemble-run.mjs` lists in `open[]` any configuration whose hashes differ from the manifest, as a run
on the lab's own reference solution would: its timings then do not compare with the local matrix. `assemble-run.mjs`
also fails its `--check` when a file under this folder, under `runs/RUN-bwrap-lanes/` or under `docs/spikes/` is one of the
private files, or when the pack holds a Lean file other than the challenge.

In CI, `lanes/ci-runners.workflow.yml` checks the private companion repository out with a read-only deploy key, as
GATE-labs does (`docs/ARCHITECTURE.md` section 13.5); it needs the repository variable `W0S06_SOLUTIONS_REPO` and the
secret `W0S06_SOLUTIONS_DEPLOY_KEY`, and stops with a message that names them when they are missing.

## Re-recording the local matrix

```
export W0S06_SOLUTIONS=DIR                                         # the private fixtures, once per shell
scripts/spikes/W0-S06/run-matrix.sh --full narrow --cpuset 12-13   # about an hour: every container profile
scripts/spikes/W0-S06/vm/run-vm.sh                                 # the Ubuntu 24.04 virtual machine (needs /dev/kvm; about a quarter of an hour)
scripts/spikes/W0-S06/list-bundle.sh aarch64                       # and x86_64
node scripts/spikes/W0-S06/assemble-run.mjs --markdown
node --test scripts/spikes/W0-S06/classify.test.mjs scripts/spikes/W0-S06/mutate.test.mjs
```

`run-matrix.sh` needs Docker and Node 18 or later. It writes into `runs/RUN-bwrap-lanes/`, one folder per
configuration, and builds the probe image when it is missing. One container runs at a time. It copies the private
fixtures to a temporary directory, mounts that read-only at `/solutions`, and removes it when it exits. `--cpuset` names
the CPUs of the profile `narrow-cpuset`; give it the indices of slower cores (12 and 13 are E-cores on the machine of the
record) or leave it out and the profile is skipped. Timings move with the load other jobs put on the host, so run it
when the machine is quiet; every step records the load average at its start.

The configurations of the record were run before the private files left this folder: their `docker-run.argv` files mount
`pack` at `/pack` and name `/pack/lab2` and `/pack/variants`, where the files then were. The commands above are the
present ones; they differ from the recorded argv in the two added mounts and the `--solutions` and `--variants` flags
that name them, and nothing else.

## Recording a real lane

- **Docker Desktop:** `scripts/spikes/W0-S06/run-matrix.sh --solutions DIR --lane docker-desktop --only default,narrow,unconfined-both`
- **Codespaces, or any Linux host:** `scripts/spikes/W0-S06/lane-probe.sh --solutions DIR --config codespaces-host --lane codespaces --label host --out runs/RUN-bwrap-lanes/codespaces-host --install --profile standard --off-controls`
  (a codespace of this repository does not hold the private fixtures: copy the directory in, or clone the private companion repository there, and name it)
- **CI runners:** copy `lanes/ci-runners.workflow.yml` to `.github/workflows/`, set the variable and the secret above, and dispatch it.

Then run `node scripts/spikes/W0-S06/assemble-run.mjs`; it reads every folder under `runs/RUN-bwrap-lanes/`.
`--install` installs bubblewrap with `apt-get`, creates `/run/user` when it is missing, and installs elan and Lean
4.35.0; a probe run without it records what the environment already has.
