#!/usr/bin/env bash
# lane-probe.sh: record what Lean's bubblewrap sandbox does in the Linux environment this script runs in.
#
# It runs inside a container, on a CI runner or in a Codespace. It writes raw tool output and small
# key=value metadata under --out; it does not classify anything. assemble-run.mjs classifies the
# outputs afterwards and builds runs/RUN-bwrap-lanes.json, so the classifier can be re-run on the same
# outputs when its rules change.
#
# What it runs, on a fresh copy of the LAB-2 challenge pack (pack/lab2) with the three private solution files laid
# over it. Those files, Solution.lean, broken/Broken.lean and fixed/Fixed.lean, are not in this repository (they are
# complete proofs of the lab's theorems); --solutions DIR or W0S06_SOLUTIONS=DIR names the directory that holds them,
# and the script stops at once when neither is given. See scripts/spikes/W0-S06/README.md, "The private fixtures".
#   canaries   bwrap alone (minimal flags), and bwrap with Lake's flag set around `lean --version`
#   lake build
#   timed      lake comparator, lake comparator --paranoid, lake check, lake check --paranoid
#   controls   the same with --inadvisably-no-sandbox (the sandbox "off" state)
#   fixtures   rejected solutions, exit-2 starts, injected sandbox faults, and Lake's bwrap argv
#
# Profiles:   paranoid   canaries, build, then lake comparator --paranoid and lake check --paranoid once each, with the
#                        memory high-water mark after every step (used under memory and CPU caps)
#             detect     the four commands once each (for an environment where the sandbox cannot start)
#             standard   canaries, build, the four commands once, and the comparator off controls
#                        (the lake check off controls only in full, or with --off-controls)
#             full       the repeats, the rejected solutions, the exit-2 starts, the injected faults,
#                        and the argv and per-phase timing of Lake's bwrap calls
# The profile drops to `detect` by itself when the Lake-shaped canary fails.

set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG=""
LANE=""
LABEL=""
OUT=""
PACK="$HERE/pack/lab2"
SOLUTIONS="${W0S06_SOLUTIONS:-}"
VARIANTS=""
SHIM="$HERE/bwrap-shim.sh"
FIXTURES="Solution.lean broken/Broken.lean fixed/Fixed.lean"
PROFILE="standard"
REPEAT_FAST=5
REPEAT_SLOW=3
REPEAT_OFF_SLOW=1
OFF_CONTROLS=0
INSTALL=0
COMPARATOR_ONLY=0
IMPORT_STD=0

usage() {
  cat <<'EOF'
usage: lane-probe.sh --config <id> --out <dir> [options]
  --config <id>         a unique id for this environment, for example local-narrow or codespaces-host
  --lane <name>         the lane it belongs to: local, ci-ubuntu-24.04, docker-desktop, codespaces, ...
  --label <profile>     the profile within the lane: default, narrow, host, ...
  --out <dir>           where outputs go (created)
  --pack <dir>          the pack to copy (default: pack/lab2 beside this script)
  --solutions <dir>     the private LAB-2 fixture solutions: Solution.lean, broken/Broken.lean and fixed/Fixed.lean
                        (default: $W0S06_SOLUTIONS; required, because they are not part of this repository)
  --variants <dir>      the rejected-solution variants, Solution.<name>.lean, for the full profile (default: made
                        from Solution.lean by mutate.mjs when node is installed; a container without node needs them
                        made outside, as run-matrix.sh does)
  --profile <p>         detect | standard | full | paranoid (default standard)
  --repeats-fast <n>    repeats of the comparator commands in the full profile (default 5)
  --repeats-slow <n>    repeats of the lake check commands in the full profile (default 3)
  --off-controls        also run the sandbox-off controls in the detect profile
  --install             apt-get install bubblewrap, create /run/user when it is missing, and install elan and Lean
                        4.35.0 when missing
  --import-std          put `import Std` at the top of Solution.lean, to see what a larger import costs lake check
  --comparator-only     skip every lake check step (they replay the whole environment and take minutes); for
                        environments where only the sandbox's state is wanted, since lake comparator starts the
                        same sandbox
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2;;
    --lane) LANE="$2"; shift 2;;
    --label) LABEL="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --pack) PACK="$2"; shift 2;;
    --solutions) SOLUTIONS="$2"; shift 2;;
    --variants) VARIANTS="$2"; shift 2;;
    --profile) PROFILE="$2"; shift 2;;
    --repeats-fast) REPEAT_FAST="$2"; shift 2;;
    --repeats-slow) REPEAT_SLOW="$2"; shift 2;;
    --off-controls) OFF_CONTROLS=1; shift;;
    --install) INSTALL=1; shift;;
    --comparator-only) COMPARATOR_ONLY=1; shift;;
    --import-std) IMPORT_STD=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 64;;
  esac
done
[ -n "$CONFIG" ] && [ -n "$OUT" ] || { usage >&2; exit 64; }

# The solution files are private (complete proofs are reference solutions: spine section 11.1). Stop before anything
# is installed or run when they are not there, with a message that says what to pass.
if [ -z "$SOLUTIONS" ]; then
  cat >&2 <<EOF
lane-probe.sh: the LAB-2 fixture solutions are not part of this repository, and none was given.
Pass the directory that holds them with --solutions DIR, or set W0S06_SOLUTIONS=DIR. It needs
  Solution.lean   broken/Broken.lean   fixed/Fixed.lean
They belong in the private companion repository; see scripts/spikes/W0-S06/README.md, "The private fixtures".
EOF
  exit 64
fi
for f in $FIXTURES; do
  [ -r "$SOLUTIONS/$f" ] || { echo "lane-probe.sh: $f is missing from the solutions directory (it needs: $FIXTURES)" >&2; exit 64; }
done
if [ "$PROFILE" = full ] && [ -z "$VARIANTS" ] && ! command -v node >/dev/null 2>&1; then
  echo "lane-probe.sh: the full profile needs the rejected-solution variants: pass --variants DIR (made by mutate.mjs --solutions DIR --out DIR on a machine with node) or install node" >&2
  exit 64
fi

now_us() {
  if [ -n "${EPOCHREALTIME:-}" ]; then echo "${EPOCHREALTIME//[^0-9]/}"; else echo $(( $(date +%s%N) / 1000 )); fi
}

# What the platform ships, before --install adds anything.
BEFORE_RUN_USER="$([ -d /run/user ] && echo present || echo absent)"
BEFORE_BWRAP="$(command -v bwrap || echo none)"
BEFORE_LAKE="$(command -v lake || echo none)"

if [ "$INSTALL" = 1 ]; then
  SUDO=""; [ "$(id -u)" != 0 ] && SUDO="sudo"
  if ! command -v bwrap >/dev/null 2>&1; then
    $SUDO apt-get update -y && $SUDO apt-get install -y --no-install-recommends bubblewrap curl ca-certificates git
  fi
  # Lake covers /run/user with a tmpfs, so the directory has to exist; a host with systemd has it, a container often has not
  [ -d /run/user ] || $SUDO mkdir -p /run/user
  if ! command -v lake >/dev/null 2>&1; then
    # the commands of labs/TOOLS.md section 2.2
    arch="$(uname -m)"
    tmp="$(mktemp -d)"
    curl -sSfL -o "$tmp/elan.tar.gz" "https://github.com/leanprover/elan/releases/download/v4.2.4/elan-${arch}-unknown-linux-gnu.tar.gz"
    tar -xzf "$tmp/elan.tar.gz" -C "$tmp"
    "$tmp/elan-init" -y --default-toolchain none --no-modify-path
    export PATH="$HOME/.elan/bin:$PATH"
    elan toolchain install leanprover/lean4:v4.35.0
    elan default leanprover/lean4:v4.35.0
  fi
fi

mkdir -p "$OUT/steps" "$OUT/shim"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cp -R "$PACK" "$WORKDIR/lab2"
PROJ="$WORKDIR/lab2"
# the private solution files over the public pack
mkdir -p "$PROJ/broken" "$PROJ/fixed"
for f in $FIXTURES; do cp "$SOLUTIONS/$f" "$PROJ/$f"; done
# Which fixture files this run used, as hashes only (the files are private, the hashes are not): assemble-run.mjs
# compares them with scripts/spikes/W0-S06/private-fixtures.json and says when a run used other files.
for f in $FIXTURES; do printf '%s  %s\n' "$(sha256sum "$SOLUTIONS/$f" | cut -d' ' -f1)" "$f"; done > "$OUT/fixtures.sha256"
if [ "$IMPORT_STD" = 1 ]; then
  { echo 'import Std'; cat "$PROJ/Solution.lean"; } > "$PROJ/Solution.lean.new" && mv "$PROJ/Solution.lean.new" "$PROJ/Solution.lean"
fi
STEP_N=0

# Recorded text names no machine-specific path: the project copy, the elan directory and a home directory
# under /home become <work>, <elan> and <home>, and mktemp names become /tmp/tmp.XXXXXX. (A container's
# /root or /var/lab is not machine-specific and stays, because Lake's own argv mentions /root.)
esc() { printf '%s' "$1" | sed -e 's/[][\.*^$+?(){}|\/]/\\&/g'; }
E_WORK="$(esc "$WORKDIR")"
E_ELAN="$(esc "${ELAN_HOME:-$HOME/.elan}")"
E_HOME="$(esc "$HOME")"
NORM_HOME=0
case "$HOME" in /home/*) NORM_HOME=1;; esac
norm() {
  if [ "$NORM_HOME" = 1 ]; then
    sed -E -e "s|$E_ELAN|<elan>|g" -e "s|$E_WORK|<work>|g" -e "s|$E_HOME|<home>|g" -e 's|/tmp/tmp\.[A-Za-z0-9]+|/tmp/tmp.XXXXXX|g'
  else
    sed -E -e "s|$E_ELAN|<elan>|g" -e "s|$E_WORK|<work>|g" -e 's|/tmp/tmp\.[A-Za-z0-9]+|/tmp/tmp.XXXXXX|g'
  fi
}

# step <name> [K=V ...] -- <command...>: run in the project copy, keep merged output, exit code and wall time.
step() {
  local name="$1"; shift
  local envs=()
  while [ "$1" != "--" ]; do envs+=("$1"); shift; done
  shift
  STEP_N=$((STEP_N + 1))
  local base; base="$OUT/steps/$(printf '%02d' "$STEP_N")-$name"
  local la; la="$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || echo '-')"
  local s e rc c0 c1
  c0="$(cpu_children)"
  s="$(now_us)"
  ( cd "$PROJ" && env "${envs[@]}" "$@" ) > "$base.out" 2>&1
  rc=$?
  e="$(now_us)"
  c1="$(cpu_children)"
  norm < "$base.out" > "$base.out.n" && mv "$base.out.n" "$base.out"
  {
    printf 'name=%s\n' "$name"
    printf 'argv=%s\n' "$*"
    printf 'env=%s\n' "${envs[*]:-}"
    printf 'rc=%s\n' "$rc"
    printf 'ms=%s\n' "$(( (e - s) / 1000 ))"
    printf 'cpu_user_ms=%s\ncpu_sys_ms=%s\n' "$(( ${c1% *} - ${c0% *} ))" "$(( ${c1#* } - ${c0#* } ))"
    printf 'start_us=%s\n' "$s"
    printf 'loadavg=%s\n' "$la"
    printf 'out_sha256=%s\n' "$(sha256sum "$base.out" | cut -d' ' -f1)"
    printf 'mem_peak_bytes=%s\n' "$(mem_peak)"
  } | norm > "$base.meta"
  LAST_RC=$rc
}

# repeat <name> <n> [K=V ...] -- <command...>: n runs of one command, each a step of its own (every run keeps its output,
# so every run is classified, not only the first).
repeat() {
  local name="$1" n="$2"; shift 2
  local i=1
  while [ "$i" -le "$n" ]; do
    step "$name-r$i" "$@"
    i=$((i + 1))
  done
}

sha() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1; }

# CPU time, in milliseconds, of the children this shell has waited for so far: "user sys", read from this shell's own
# /proc entry (cutime and cstime, in clock ticks) because `times` inside $( ) would report the subshell's. Wall time moves
# with the load other jobs put on a shared machine; CPU time moves much less.
CLK_TCK="$(getconf CLK_TCK 2>/dev/null || echo 100)"
cpu_children() { awk -v hz="$CLK_TCK" '{ printf "%d %d", $16 * 1000 / hz, $17 * 1000 / hz }' "/proc/$$/stat"; }

# The memory high-water mark of the cgroup the probe runs in (cgroup v2, then v1), in bytes; it counts page cache.
mem_peak() { cat /sys/fs/cgroup/memory.peak 2>/dev/null || cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null || echo unknown; }
mem_limit() { cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo unknown; }

# The CPUs this process may use (a --cpuset-cpus list shows here), and their maximum clock in MHz, as "count x MHz".
allowed_cpus() { awk '/^Cpus_allowed_list:/ {print $2}' /proc/self/status | tr ',' '\n' | while IFS=- read -r a b; do seq "$a" "${b:-$a}"; done; }
cpu_max_mhz() {
  for c in $(allowed_cpus | head -64); do
    f="/sys/devices/system/cpu/cpu$c/cpufreq/cpuinfo_max_freq"
    [ -r "$f" ] && echo $(( $(cat "$f") / 1000 ))
  done | sort -n | uniq -c | awk '{printf "%sx%s ", $1, $2}'
}

# The shim reads its settings from a file, because Lake gives the sandbox program a clean environment.
shim_conf() { printf 'log=%s\nreal=%s\nfail_call=%s\n' "$1" "$(command -v bwrap)" "${2:-0}" > /tmp/w0s06-shim.conf; }

# ----- facts about the environment
{
  echo "config=$CONFIG"
  echo "started_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "kernel=$(uname -r)"
  echo "arch=$(uname -m)"
  echo "os=$( . /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")"
  echo "nproc=$(nproc)"
  echo "cpus_allowed=$(awk '/^Cpus_allowed_list:/ {print $2}' /proc/self/status)"
  echo "cpu_max_mhz=$(cpu_max_mhz)"
  echo "mem_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
  echo "cpu_model=$(awk -F: '/model name|Model name/ {sub(/^ +/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null)"
  echo "uid=$(id -u)"
  echo "seccomp_mode=$(awk '/^Seccomp:/ {print $2}' /proc/self/status)"
  echo "no_new_privs=$(awk '/^NoNewPrivs:/ {print $2}' /proc/self/status)"
  echo "cap_eff=$(awk '/^CapEff:/ {print $2}' /proc/self/status)"
  echo "cap_bnd=$(awk '/^CapBnd:/ {print $2}' /proc/self/status)"
  echo "lsm_process_label=$(cat /proc/self/attr/current 2>/dev/null || echo none)"
  echo "lsm_list=$(cat /sys/kernel/security/lsm 2>/dev/null || echo unknown)"
  echo "max_user_namespaces=$(cat /proc/sys/user/max_user_namespaces 2>/dev/null || echo absent)"
  echo "unprivileged_userns_clone=$(cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null || echo absent)"
  echo "apparmor_restrict_unprivileged_userns=$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null || echo absent)"
  if [ -e /.dockerenv ]; then echo "dockerenv=yes"; else echo "dockerenv=no"; fi
  echo "run_user_dir=$([ -d /run/user ] && echo present || echo absent)"
  echo "before_install_run_user_dir=$BEFORE_RUN_USER"
  echo "before_install_bwrap=$BEFORE_BWRAP"
  echo "before_install_lake=$BEFORE_LAKE"
  echo "bwrap_path=$(command -v bwrap || echo none)"
  echo "bwrap_version=$(bwrap --version 2>/dev/null || echo none)"
  echo "bwrap_sha256=$(sha "$(command -v bwrap 2>/dev/null)")"
  echo "bwrap_mode=$(stat -c %A "$(command -v bwrap 2>/dev/null)" 2>/dev/null || echo none)"
  echo "loadavg_start=$(cut -d' ' -f1-3 /proc/loadavg)"
  echo "memory_limit_bytes=$(mem_limit)"
} | norm > "$OUT/facts.env"

( cd "$PROJ" && {
  echo "lean_version=$(lean --version 2>&1 | head -1)"
  echo "lake_version=$(lake --version 2>&1 | head -1)"
  echo "toolchain_file=$(cat lean-toolchain)"
  tc="$(dirname "$(dirname "$(elan which lean 2>/dev/null)")")"
  echo "toolchain_dir=$tc"
  for b in lake lean leanchecker leanchecker-paranoid lean4lean nanoda_bin con-leche con-ron; do
    echo "sha256_$b=$(sha "$tc/bin/$b")"
  done
} ) | norm >> "$OUT/facts.env"

TC="$(dirname "$(dirname "$(cd "$PROJ" && elan which lean 2>/dev/null)")")"

# ----- canaries
step canary-minimal -- bwrap --unshare-all --ro-bind / / --dev /dev --proc /proc -- true
CANARY_MIN_RC=$LAST_RC
# Lake's flag set for 4.35.0, as logged by bwrap-shim.sh (see the discovery steps), around `lean --version`. Lake covers
# /home, /root and /run/user with tmpfs and binds the toolchain back, which matters when elan lives under /home.
step canary-lake -- bwrap --ro-bind / / --tmpfs /home --tmpfs /root --tmpfs /run/user --tmpfs /tmp --dir /tmp/home \
  --dev /dev --proc /proc --clearenv --tmpfs /run --tmpfs /var --ro-bind "$TC" "$TC" \
  --setenv PATH "$PATH" --setenv HOME /tmp/home --unshare-all --die-with-parent --new-session -- "$TC/bin/lean" --version
CANARY_LAKE_RC=$LAST_RC

USED_PROFILE="$PROFILE"
if [ "$CANARY_LAKE_RC" != 0 ] && [ "$PROFILE" != detect ]; then
  USED_PROFILE=detect
  echo "note: the Lake-shaped canary failed, so the profile drops to detect" >&2
fi

case "$USED_PROFILE" in
  detect) NF=1; NS=1;;
  standard) NF=1; NS=1;;
  paranoid) NF=1; NS=1;;
  full) NF=$REPEAT_FAST; NS=$REPEAT_SLOW;;
  *) echo "unknown profile $USED_PROFILE" >&2; exit 64;;
esac

# ----- build once outside the sandbox, as the lab's flow does
step lake-build -- lake build

# ----- the sandboxed commands
if [ "$USED_PROFILE" = paranoid ]; then
  step comparator-paranoid -- lake comparator --paranoid
  if [ "$COMPARATOR_ONLY" = 0 ]; then step check-paranoid -- lake check --paranoid; fi
elif [ "$USED_PROFILE" = detect ]; then
  step comparator -- lake comparator
  step comparator-paranoid -- lake comparator --paranoid
  if [ "$COMPARATOR_ONLY" = 0 ]; then
    step check -- lake check
    step check-paranoid -- lake check --paranoid
  fi
  if [ "$OFF_CONTROLS" = 1 ]; then
    step comparator-off -- lake comparator --inadvisably-no-sandbox
    if [ "$COMPARATOR_ONLY" = 0 ]; then step check-off -- lake check --inadvisably-no-sandbox; fi
  fi
else
  repeat comparator "$NF" -- lake comparator
  repeat comparator-paranoid "$NF" -- lake comparator --paranoid
  if [ "$COMPARATOR_ONLY" = 0 ]; then
    repeat check "$NS" -- lake check
    repeat check-paranoid "$NS" -- lake check --paranoid
  fi
  # the sandbox-off controls
  repeat comparator-off "$NF" -- lake comparator --inadvisably-no-sandbox
  repeat comparator-paranoid-off "$NF" -- lake comparator --paranoid --inadvisably-no-sandbox
  if [ "$COMPARATOR_ONLY" = 0 ] && { [ "$USED_PROFILE" = full ] || [ "$OFF_CONTROLS" = 1 ]; }; then
    repeat check-off "$REPEAT_OFF_SLOW" -- lake check --inadvisably-no-sandbox
    repeat check-paranoid-off "$REPEAT_OFF_SLOW" -- lake check --paranoid --inadvisably-no-sandbox
  fi
fi

# ----- fixtures that need a working sandbox
if [ "$USED_PROFILE" = full ]; then
  # the rejected solutions are not stored: each is the private Solution.lean with one edit, made by mutate.mjs (a
  # container without node gets them from run-matrix.sh through --variants)
  if [ -z "$VARIANTS" ]; then
    VARIANTS="$WORKDIR/variants"
    node "$HERE/mutate.mjs" --solutions "$SOLUTIONS" --out "$VARIANTS" || { echo "lane-probe.sh: mutate.mjs could not make the variants" >&2; exit 1; }
  fi
  for v in "$VARIANTS"/Solution.*.lean; do
    printf '%s  variants/%s\n' "$(sha256sum "$v" | cut -d' ' -f1)" "$(basename "$v")" >> "$OUT/fixtures.sha256"
  done
  # rejected solutions through lake comparator
  for v in "$VARIANTS"/Solution.*.lean; do
    vn="$(basename "$v" .lean)"; vn="${vn#Solution.}"
    cp "$v" "$PROJ/Solution.lean"
    step "variant-$vn" -- lake comparator
    cp "$SOLUTIONS/Solution.lean" "$PROJ/Solution.lean"
  done
  # rejected solutions through lake check: a sorry and a build error
  if [ "$COMPARATOR_ONLY" = 0 ]; then
    for vn in sorry builderror; do
      cp "$VARIANTS/Solution.$vn.lean" "$PROJ/Solution.lean"
      step "variant-$vn-check" -- lake check
      cp "$SOLUTIONS/Solution.lean" "$PROJ/Solution.lean"
    done
  fi
  # exit-2 starts that are not sandbox failures
  mv "$PROJ/lake-manifest.json" "$PROJ/lake-manifest.json.off"
  step start-no-manifest -- lake comparator
  step start-no-manifest-check -- lake check
  mv "$PROJ/lake-manifest.json.off" "$PROJ/lake-manifest.json"
  cp "$PROJ/comparator.json" "$WORKDIR/comparator.json.keep"
  echo '{ not json' > "$PROJ/comparator.json"
  step start-bad-config -- lake comparator
  rm "$PROJ/comparator.json"
  step start-missing-config -- lake comparator
  cp "$WORKDIR/comparator.json.keep" "$PROJ/comparator.json"
  # no bubblewrap at the path Lake is told to use
  step start-no-bwrap COMPARATOR_BWRAP=/nonexistent/bwrap -- lake comparator
  step start-no-bwrap-check COMPARATOR_BWRAP=/nonexistent/bwrap -- lake check
  # faults injected into a working sandbox: the shim adds a bind mount whose source does not exist to the
  # N-th bwrap call, so the real bwrap fails at setup with its own diagnostic
  # (calls 1 to 5 of lake comparator are the environment, two builds and two exports; call 6 is the first checker,
  # which Lake reports as "kernel rejected the solution" when its exit code is not 0, so a bubblewrap failure there
  # prints the same two lines as a real kernel rejection)
  for n in 1 3 5 6; do
    rm -f "$OUT/shim/inject.log" "$OUT/shim/inject.log.count"
    shim_conf "$OUT/shim/inject.log" "$n"
    step "inject-comparator-call$n" COMPARATOR_BWRAP="$SHIM" -- lake comparator
  done
  # the third of the six checkers under --paranoid: two checkers have accepted before it and three run after it
  rm -f "$OUT/shim/inject.log" "$OUT/shim/inject.log.count"
  shim_conf "$OUT/shim/inject.log" 8
  step inject-comparator-paranoid-call8 COMPARATOR_BWRAP="$SHIM" -- lake comparator --paranoid
  rm -f "$OUT/shim/inject.log" "$OUT/shim/inject.log.count"
  shim_conf "$OUT/shim/inject.log" 3
  if [ "$COMPARATOR_ONLY" = 0 ]; then step inject-check-call3 COMPARATOR_BWRAP="$SHIM" -- lake check; fi
  rm -f "$OUT/shim/inject.log" "$OUT/shim/inject.log.count" /tmp/w0s06-shim.conf
  # a real kernel rejection under --paranoid, with the shim logging each checker's exit code
  cp "$VARIANTS/Solution.kernelskip.lean" "$PROJ/Solution.lean"
  rm -f "$OUT/shim/discover-kernelskip.log" "$OUT/shim/discover-kernelskip.log.count"
  shim_conf "$OUT/shim/discover-kernelskip.log" 0
  step discover-kernelskip-paranoid COMPARATOR_BWRAP="$SHIM" -- lake comparator --paranoid
  rm -f "$OUT/shim/discover-kernelskip.log.count" /tmp/w0s06-shim.conf
  cp "$SOLUTIONS/Solution.lean" "$PROJ/Solution.lean"
  # Lake's bwrap argv and the time of each phase, with the shim logging
  for c in comparator check; do
    if [ "$c" = check ] && [ "$COMPARATOR_ONLY" = 1 ]; then continue; fi
    rm -f "$OUT/shim/discover-$c.log" "$OUT/shim/discover-$c.log.count"
    shim_conf "$OUT/shim/discover-$c.log" 0
    step "discover-$c-paranoid" COMPARATOR_BWRAP="$SHIM" -- lake "$c" --paranoid
    rm -f "$OUT/shim/discover-$c.log.count"
  done
  rm -f /tmp/w0s06-shim.conf
fi

for f in "$OUT"/shim/*.log; do
  [ -e "$f" ] && { norm < "$f" > "$f.n" && mv "$f.n" "$f"; }
done
{
  echo "lane=${LANE:-$CONFIG}"
  echo "profile=${LABEL:-$CONFIG}"
} > "$OUT/profile.env"
{
  echo "finished_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "profile_requested=$PROFILE"
  echo "profile_used=$USED_PROFILE"
  echo "canary_minimal_rc=$CANARY_MIN_RC"
  echo "canary_lake_rc=$CANARY_LAKE_RC"
  echo "steps=$STEP_N"
  echo "loadavg_end=$(cut -d' ' -f1-3 /proc/loadavg)"
  echo "memory_peak_bytes=$(mem_peak)"
} > "$OUT/done.env"
echo "probe $CONFIG: profile=$USED_PROFILE steps=$STEP_N canary-minimal=$CANARY_MIN_RC canary-lake=$CANARY_LAKE_RC"
