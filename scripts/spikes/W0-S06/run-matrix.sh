#!/usr/bin/env bash
# run-matrix.sh: run lane-probe.sh in a set of Docker container profiles and keep what it records.
#
# On the course machine it produces the local matrix of RUN-bwrap-lanes (lane prefix "local"). On
# Docker Desktop (macOS, or Windows through WSL 2) the same script, run with --lane docker-desktop,
# produces that lane's record. Each profile is a `docker run` option set; the full argv of every run
# is written beside its output. Needs bash, Docker and, for the profiles that use the narrow seccomp
# profile, Node 18 or later. Nothing here changes the host or the engine.
#
# The LAB-2 fixture solutions are private (complete proofs are reference solutions; spine section 11.1) and are not in
# this repository: --solutions DIR or W0S06_SOLUTIONS=DIR names the directory that holds Solution.lean,
# broken/Broken.lean and fixed/Fixed.lean, and the script stops at once when neither is given. It copies them to a
# temporary directory that it removes on exit, mounts that read-only at /solutions, and, for --full, has mutate.mjs
# make the eight rejected solutions there (mounted at /variants). See README.md, "The private fixtures".
#
#   scripts/spikes/W0-S06/run-matrix.sh --solutions DIR                      # the whole local matrix
#   scripts/spikes/W0-S06/run-matrix.sh --solutions DIR --lane docker-desktop --only default,narrow
#
# Options: --solutions <dir> the private fixture solutions (default $W0S06_SOLUTIONS; required)
#          --lane <prefix>   prefix of every config id (default local)
#          --only <a,b,..>   run only these profiles
#          --full <id>       run this profile with the full probe (repeats, fixtures); default none
#          --list            print the profile names and stop
#          --repeats-fast N, --repeats-slow N   passed to the full probe
#          --comparator-only skip the lake check steps (where only the sandbox's state is wanted)
#          --cpuset <list>   CPUs for the narrow-cpuset profile (for example 12-13); the profile is skipped without it

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT_ROOT="${W0S06_OUT_ROOT:-$ROOT/runs/RUN-bwrap-lanes}"
IMAGE="statespace-w0s06-lean"
LANE="local"
ONLY=""
FULL=""
RF=5
RS=3
PROBE_EXTRA=()
MEM=6g
CPUSET=""
SOLUTIONS="${W0S06_SOLUTIONS:-}"
STAGE=""
CLEAN_CONTAINER=""

ALL_PROFILES="default seccomp-unconfined systempaths-unconfined cap-sys-admin cap-sys-admin-systempaths unconfined-both narrow narrow-no-systempaths narrow-no-run-user narrow-no-apparmor narrow-without-clone narrow-without-unshare narrow-without-mount narrow-without-umount2 narrow-without-pivot_root narrow-root privileged narrow-cpus2 narrow-cpuset narrow-std narrow-mem4g narrow-mem3g narrow-mem2g narrow-mem1g"

while [ $# -gt 0 ]; do
  case "$1" in
    --solutions) SOLUTIONS="$2"; shift 2;;
    --lane) LANE="$2"; shift 2;;
    --only) ONLY="$2"; shift 2;;
    --full) FULL="$2"; shift 2;;
    --repeats-fast) RF="$2"; shift 2;;
    --repeats-slow) RS="$2"; shift 2;;
    --comparator-only) PROBE_EXTRA=(--comparator-only); shift;;
    --cpuset) CPUSET="$2"; shift 2;;
    --list) echo "$ALL_PROFILES" | tr ' ' '\n'; exit 0;;
    -h|--help) sed -n '2,26p' "$0"; exit 0;;
    *) echo "unknown argument: $1" >&2; exit 64;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 1; }

# The private solutions: stop before anything is built or run when they are not there.
if [ -z "$SOLUTIONS" ]; then
  cat >&2 <<EOF
run-matrix.sh: the LAB-2 fixture solutions are not part of this repository, and none was given.
Pass the directory that holds them with --solutions DIR, or set W0S06_SOLUTIONS=DIR. It needs
  Solution.lean   broken/Broken.lean   fixed/Fixed.lean
They belong in the private companion repository; see scripts/spikes/W0-S06/README.md, "The private fixtures".
EOF
  exit 64
fi
for f in Solution.lean broken/Broken.lean fixed/Fixed.lean; do
  [ -r "$SOLUTIONS/$f" ] || { echo "run-matrix.sh: $f is missing from the solutions directory" >&2; exit 64; }
done

# A copy the container's user can read whoever owns the originals, removed on exit together with a running container.
cleanup() {
  if [ -n "$CLEAN_CONTAINER" ]; then docker rm -f "$CLEAN_CONTAINER" >/dev/null 2>&1; fi
  if [ -n "$STAGE" ]; then rm -rf "$STAGE"; fi
  return 0
}
STAGE="$(mktemp -d)" || exit 1
trap cleanup EXIT
mkdir -p "$STAGE/solutions/broken" "$STAGE/solutions/fixed" "$STAGE/variants"
for f in Solution.lean broken/Broken.lean fixed/Fixed.lean; do cp "$SOLUTIONS/$f" "$STAGE/solutions/$f" || exit 1; done
if [ -n "$FULL" ]; then
  command -v node >/dev/null 2>&1 || { echo "node is required to make the rejected solutions of the full probe (mutate.mjs)" >&2; exit 1; }
  node "$HERE/mutate.mjs" --solutions "$STAGE/solutions" --out "$STAGE/variants" >/dev/null || exit 1
fi
chmod -R a+rX "$STAGE"

mkdir -p "$OUT_ROOT/profiles/$LANE"

# the image: built from image/Dockerfile when absent
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "building $IMAGE" >&2
  docker build -t "$IMAGE" "$HERE/image" || exit 1
fi

ENGINE_VERSION="$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
SECCOMP="$OUT_ROOT/profiles/$LANE/seccomp-bwrap.json"
if [ -n "$ONLY" ]; then PROFILES="$(echo "$ONLY" | tr ',' ' ')"; else PROFILES="$ALL_PROFILES"; fi
need_narrow=0
for p in $PROFILES; do case "$p" in narrow*) need_narrow=1;; esac; done
if [ "$need_narrow" = 1 ]; then
  if command -v node >/dev/null 2>&1; then
    node "$HERE/make-seccomp-profile.mjs" --engine-version "$ENGINE_VERSION" --out "$SECCOMP" \
      > "$OUT_ROOT/profiles/$LANE/seccomp-bwrap.info.json" || exit 1
  else
    echo "node is required to build the narrow seccomp profile" >&2; exit 1
  fi
fi

# Writes the global arrays FLAGS and EXTRA (probe arguments) for a profile; returns 1 for an unknown name.
set_profile() {
  FLAGS=(); EXTRA=(); MEM=6g; PROBE_PROFILE=""
  local narrow=(--security-opt "seccomp=$SECCOMP" --security-opt systempaths=unconfined --security-opt apparmor=unconfined)
  case "$1" in
    default) EXTRA=(--off-controls);;
    seccomp-unconfined) FLAGS=(--security-opt seccomp=unconfined);;
    systempaths-unconfined) FLAGS=(--security-opt systempaths=unconfined);;
    cap-sys-admin) FLAGS=(--cap-add SYS_ADMIN);;
    cap-sys-admin-systempaths) FLAGS=(--cap-add SYS_ADMIN --security-opt systempaths=unconfined);;
    unconfined-both) FLAGS=(--security-opt seccomp=unconfined --security-opt systempaths=unconfined);;
    narrow) FLAGS=("${narrow[@]}");;
    narrow-no-systempaths) FLAGS=(--security-opt "seccomp=$SECCOMP" --security-opt apparmor=unconfined);;
    narrow-no-run-user) FLAGS=("${narrow[@]}" --tmpfs /run);;
    narrow-no-apparmor) FLAGS=(--security-opt "seccomp=$SECCOMP" --security-opt systempaths=unconfined);;
    narrow-without-*)
      # one of the five added syscalls left out, to show that each is needed; the profile files are kept beside the run
      local omit="${1#narrow-without-}"
      local f="$OUT_ROOT/profiles/$LANE/ablation/seccomp-bwrap-without-$omit.json"
      mkdir -p "$(dirname "$f")"
      node "$HERE/make-seccomp-profile.mjs" --engine-version "$ENGINE_VERSION" --omit "$omit" --out "$f" \
        > "$OUT_ROOT/profiles/$LANE/ablation/without-$omit.info.json" || return 1
      FLAGS=(--security-opt "seccomp=$f" --security-opt systempaths=unconfined --security-opt apparmor=unconfined);;
    narrow-std) FLAGS=("${narrow[@]}"); PROBE_PROFILE=paranoid; EXTRA=(--import-std);;
    narrow-cpus2) FLAGS=("${narrow[@]}" --cpus=2); PROBE_PROFILE=paranoid;;
    narrow-cpuset) [ -n "$CPUSET" ] || return 2; FLAGS=("${narrow[@]}" --cpuset-cpus="$CPUSET"); PROBE_PROFILE=paranoid;;
    narrow-mem[1-9]g) FLAGS=("${narrow[@]}"); MEM="${1#narrow-mem}"; PROBE_PROFILE=paranoid;;
    narrow-root) FLAGS=("${narrow[@]}" --user 0);;
    privileged) FLAGS=(--privileged);;
    *) return 1;;
  esac
}

# Repository-relative form of an argv word, for the recorded argv.
rel() { local w="$1"; w="${w//$STAGE/<staging>}"; w="${w//$OUT_ROOT/runs/RUN-bwrap-lanes}"; w="${w//$HERE/scripts/spikes/W0-S06}"; w="${w//$ROOT/.}"; printf '%s\n' "$w"; }

run_one() {
  local id="$1"
  set_profile "$id"
  case $? in 0) ;; 2) echo "== skipping $id (needs --cpuset)" >&2; return 0;; *) echo "unknown profile $id" >&2; return 1;; esac
  local cid="$LANE-$id"
  local outdir="$OUT_ROOT/$cid"
  rm -rf "$outdir"; mkdir -p "$outdir"; chmod 777 "$outdir"
  # written here as well as by the probe, so that a container the kernel kills still says which profile it ran
  printf 'lane=%s\nprofile=%s\n' "$LANE" "$id" > "$outdir/profile.env"; chmod 666 "$outdir/profile.env"
  local probe_profile="standard"
  [ "$FULL" = "$id" ] && probe_profile="full"
  [ -n "$PROBE_PROFILE" ] && probe_profile="$PROBE_PROFILE"
  local memflags=(--memory="$MEM")
  [ "$MEM" != 6g ] && memflags=(--memory="$MEM" --memory-swap="$MEM")
  # --cidfile names the container to collect-oom.mjs, which reads the kernel's report if a memory cap killed a process
  local cmd=(docker run --rm "${memflags[@]}" --cidfile "$outdir/container.id" --name "w0s06-$cid" ${FLAGS[@]+"${FLAGS[@]}"}
    -v "$HERE/pack:/pack:ro" -v "$STAGE/solutions:/solutions:ro" -v "$STAGE/variants:/variants:ro" -v "$HERE:/probe:ro" -v "$outdir:/out"
    "$IMAGE" bash /probe/lane-probe.sh --config "$cid" --lane "$LANE" --label "$id" --out /out --pack /pack/lab2 --solutions /solutions --variants /variants
    --profile "$probe_profile" --repeats-fast "$RF" --repeats-slow "$RS" ${EXTRA[@]+"${EXTRA[@]}"}
    ${PROBE_EXTRA[@]+"${PROBE_EXTRA[@]}"})
  { for w in "${cmd[@]}"; do rel "$w"; done; } > "$outdir/docker-run.argv"
  echo "== $cid ($probe_profile)" >&2
  docker rm -f "w0s06-$cid" >/dev/null 2>&1
  CLEAN_CONTAINER="w0s06-$cid"
  local t0 t1
  t0=$(date +%s)
  "${cmd[@]}" > "$outdir/probe.log" 2>&1
  local rc=$?
  t1=$(date +%s)
  CLEAN_CONTAINER=""
  echo "$rc" > "$outdir/docker-run.exit"
  if command -v node >/dev/null 2>&1; then
    node "$HERE/collect-oom.mjs" "$outdir/kernel-oom.txt" "$outdir/container.id" "$t0" "$t1" || true
  fi
  rm -f "$outdir/container.id"
  tail -n 2 "$outdir/probe.log" >&2
  return 0
}

# Engine and image facts, once per invocation.
{
  echo "lane=$LANE"
  echo "docker_client=$(docker version --format '{{.Client.Version}}' 2>/dev/null)"
  echo "docker_server=$ENGINE_VERSION"
  echo "docker_api=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null)"
  echo "docker_os_arch=$(docker version --format '{{.Server.Os}}/{{.Server.Arch}}' 2>/dev/null)"
  echo "docker_security_options=$(docker info --format '{{json .SecurityOptions}}' 2>/dev/null)"
  echo "docker_kernel=$(docker info --format '{{.KernelVersion}}' 2>/dev/null)"
  echo "docker_operating_system=$(docker info --format '{{.OperatingSystem}}' 2>/dev/null)"
  echo "docker_ncpu=$(docker info --format '{{.NCPU}}' 2>/dev/null)"
  echo "docker_memtotal=$(docker info --format '{{.MemTotal}}' 2>/dev/null)"
  echo "docker_cgroup=$(docker info --format '{{.CgroupDriver}}/{{.CgroupVersion}}' 2>/dev/null)"
  echo "docker_runtime=$(docker info --format '{{.DefaultRuntime}}' 2>/dev/null)"
  echo "image=$IMAGE"
  echo "image_id=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null)"
  echo "image_arch=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$IMAGE" 2>/dev/null)"
  echo "image_created=$(docker image inspect --format '{{.Created}}' "$IMAGE" 2>/dev/null)"
  echo "image_size_bytes=$(docker image inspect --format '{{.Size}}' "$IMAGE" 2>/dev/null)"
  echo "run_started_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT_ROOT/engine-$LANE.env"

for p in $PROFILES; do
  run_one "$p"
done
echo "run_finished_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUT_ROOT/engine-$LANE.env"
echo "done. Next: node scripts/spikes/W0-S06/assemble-run.mjs" >&2
