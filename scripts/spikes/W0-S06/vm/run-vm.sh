#!/usr/bin/env bash
# vm/run-vm.sh: boot a stock Ubuntu 24.04 cloud image under QEMU/KVM and run the W0-S06 probe inside it.
#
# Why: GitHub-hosted runners are stock Ubuntu virtual machines, and Ubuntu 24.04 restricts unprivileged user
# namespaces through AppArmor [V], which a container on a host without AppArmor cannot show. This is the closest
# local stand-in for the CI-runner lane: Ubuntu 24.04's userland, kernel and AppArmor, on the machine's KVM.
# It is NOT the runner image (the runner's kernel is a different build, its Docker is Docker CE, its tools differ)
# and its results are labeled "emulation" in RUN-bwrap-lanes; the real runners are the owner's to record with
# lanes/ci-runners.workflow.yml.
#
# Needs: Docker, /dev/kvm, curl, Node 18 or later, network. QEMU runs inside an ubuntu:24.04 container (apt-installed), so nothing
# is installed on the host. The base image is cached in $W0S06_VM_CACHE (default /tmp/w0s06-vm) and checked
# against Canonical's SHA256SUMS. The guest's results come back on the serial console and are unpacked into
# runs/RUN-bwrap-lanes/ (configs vm-ubuntu-24.04-*).
#
#   scripts/spikes/W0-S06/vm/run-vm.sh --solutions DIR [--scenarios host,docker] [--profiles default,narrow,...] [--quick]
#   --solutions DIR  the private LAB-2 fixture solutions (Solution.lean, broken/Broken.lean, fixed/Fixed.lean), which
#                    are not in this repository: they travel into the virtual machine in the cloud-init data, in a
#                    file of their own that is removed from the cache when the run ends (default $W0S06_SOLUTIONS; required)
#   --quick runs only the lake comparator commands in the host scenarios (for debugging this harness)
#
# Environment: W0S06_SOLUTIONS, W0S06_VM_CACHE, W0S06_VM_MEM (default 5G; the container is capped at 6g),
#              W0S06_VM_CPUS (default 4), W0S06_VM_TIMEOUT (seconds before the virtual machine is stopped, default 7200),
#              W0S06_OUT_ROOT.

set -eu
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
W0="$(cd "$HERE/.." && pwd)"
ROOT="$(cd "$W0/../../.." && pwd)"
OUT_ROOT="${W0S06_OUT_ROOT:-$ROOT/runs/RUN-bwrap-lanes}"
CACHE="${W0S06_VM_CACHE:-${TMPDIR:-/tmp}/w0s06-vm}"
VM_MEM="${W0S06_VM_MEM:-5G}"
VM_CPUS="${W0S06_VM_CPUS:-4}"
VM_TIMEOUT="${W0S06_VM_TIMEOUT:-7200}"
SOLUTIONS="${W0S06_SOLUTIONS:-}"
SCENARIOS="host,docker"
PROFILES="default,narrow,narrow-no-apparmor,unconfined-both,privileged"
QUICK=0
BASE_URL="https://cloud-images.ubuntu.com/noble/current"
IMG="noble-server-cloudimg-amd64.img"

while [ $# -gt 0 ]; do
  case "$1" in
    --solutions) SOLUTIONS="$2"; shift 2;;
    --scenarios) SCENARIOS="$2"; shift 2;;
    --profiles) PROFILES="$2"; shift 2;;
    --quick) QUICK=1; shift;;
    -h|--help) sed -n '2,24p' "$0"; exit 0;;
    *) echo "unknown argument: $1" >&2; exit 64;;
  esac
done

if [ -z "$SOLUTIONS" ]; then
  cat >&2 <<MSG
run-vm.sh: the LAB-2 fixture solutions are not part of this repository, and none was given.
Pass the directory that holds them with --solutions DIR, or set W0S06_SOLUTIONS=DIR. It needs
  Solution.lean   broken/Broken.lean   fixed/Fixed.lean
They belong in the private companion repository; see scripts/spikes/W0-S06/README.md, "The private fixtures".
MSG
  exit 64
fi
for f in Solution.lean broken/Broken.lean fixed/Fixed.lean; do
  [ -r "$SOLUTIONS/$f" ] || { echo "run-vm.sh: $f is missing from the solutions directory" >&2; exit 64; }
done
[ -e /dev/kvm ] || { echo "/dev/kvm is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
mkdir -p "$CACHE/work" "$OUT_ROOT"

# the base image, checked against Canonical's checksum list
curl -sSfL -o "$CACHE/SHA256SUMS" "$BASE_URL/SHA256SUMS"
WANT="$(grep " \*$IMG\$" "$CACHE/SHA256SUMS" | cut -d' ' -f1)"
have_sha() { sha256sum "$CACHE/$IMG" 2>/dev/null | cut -d' ' -f1; }
if [ ! -e "$CACHE/$IMG" ] || [ "$(have_sha)" != "$WANT" ]; then
  echo "downloading $IMG" >&2
  curl -sSfL -o "$CACHE/$IMG" "$BASE_URL/$IMG"
fi
[ "$(have_sha)" = "$WANT" ] || { echo "checksum mismatch for $IMG" >&2; exit 1; }

# what the guest gets: this folder, without any recorded runs, and the private solutions as a second file. The guest
# user is in group adm so that journalctl shows it the kernel log, which collect-oom.mjs reads after each container run.
# user-data and the seed image made from it hold the solutions (base64), and the guest's disk holds them too, so all of
# those are removed from the cache when the script ends; the console log, which holds none, stays.
WORK="$CACHE/work"
rm -f "$WORK/overlay.qcow2" "$WORK/seed.iso" "$WORK/console.log"
trap 'rm -f "$WORK/user-data" "$WORK/solutions.tgz" "$WORK/seed.iso" "$WORK/overlay.qcow2"' EXIT
tar -czf "$WORK/w0s06.tgz" -C "$ROOT" scripts/spikes/W0-S06
tar -czf "$WORK/solutions.tgz" -C "$SOLUTIONS" Solution.lean broken/Broken.lean fixed/Fixed.lean
B64="$(base64 -w0 "$WORK/w0s06.tgz")"
B64S="$(base64 -w0 "$WORK/solutions.tgz")"
cat > "$WORK/user-data" <<EOF
#cloud-config
users:
  - name: runner
    uid: 1001
    groups: adm
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: true
write_files:
  - path: /opt/w0s06.tgz
    encoding: b64
    content: $B64
  - path: /opt/w0s06-solutions.tgz
    encoding: b64
    content: $B64S
runcmd:
  - [ bash, -c, "mkdir -p /home/runner/solutions && tar -xzf /opt/w0s06.tgz -C /home/runner && tar -xzf /opt/w0s06-solutions.tgz -C /home/runner/solutions && chown -R runner:runner /home/runner" ]
  - [ sudo, -u, runner, -H, env, "SCENARIOS=$SCENARIOS", "DOCKER_PROFILES=$PROFILES", "QUICK_RUN=$QUICK", "W0S06_SOLUTIONS=/home/runner/solutions", bash, /home/runner/scripts/spikes/W0-S06/vm/guest-run.sh ]
EOF
printf 'instance-id: w0s06-%s\nlocal-hostname: w0s06-vm\n' "$(date +%s)" > "$WORK/meta-data"

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "booting the VM (scenarios $SCENARIOS)" >&2
docker rm -f w0s06-vm >/dev/null 2>&1 || true
docker run --rm --name w0s06-vm --memory=6g --device /dev/kvm \
  -v "$CACHE:/vm" ubuntu:24.04 bash -c '
    set -eu
    export DEBIAN_FRONTEND=noninteractive
    apt-get update >/dev/null && apt-get install -y --no-install-recommends qemu-system-x86 qemu-utils cloud-image-utils >/dev/null
    qemu-system-x86_64 --version | head -1 > /vm/work/qemu.txt
    qemu-img create -q -f qcow2 -F qcow2 -b /vm/'"$IMG"' /vm/work/overlay.qcow2 24G
    cloud-localds /vm/work/seed.iso /vm/work/user-data /vm/work/meta-data
    timeout '"$VM_TIMEOUT"' qemu-system-x86_64 -enable-kvm -cpu host -machine q35 -smp '"$VM_CPUS"' -m '"$VM_MEM"' \
      -display none -monitor none -serial file:/vm/work/console.log \
      -drive file=/vm/work/overlay.qcow2,if=virtio,format=qcow2 \
      -drive file=/vm/work/seed.iso,if=virtio,format=raw,readonly=on \
      -netdev user,id=n0 -device virtio-net-pci,netdev=n0
  '
FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# the guest's results, from the serial console
node -e '
const fs = require("fs");
const text = fs.readFileSync(process.argv[1], "utf8");
const m = /W0S06-RESULT-BEGIN\s*([A-Za-z0-9+\/=\s]+?)\s*W0S06-RESULT-END/.exec(text);
if (!m) { console.error("no result block in the console log"); process.exit(1); }
fs.writeFileSync(process.argv[2], Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
' "$WORK/console.log" "$WORK/result.tgz"
tar -xzf "$WORK/result.tgz" -C "$OUT_ROOT" --strip-components=2 runs/RUN-bwrap-lanes
{
  echo "lane=vm-ubuntu-24.04"
  echo "vm_image_url=$BASE_URL/$IMG"
  echo "vm_image_sha256=$WANT"
  echo "vm_image_bytes=$(stat -c %s "$CACHE/$IMG")"
  echo "qemu=$(cat "$WORK/qemu.txt")"
  echo "vm_cpus=$VM_CPUS"
  echo "vm_mem=$VM_MEM"
  echo "scenarios=$SCENARIOS"
  echo "docker_profiles=$PROFILES"
  echo "run_started_utc=$STARTED"
  echo "run_finished_utc=$FINISHED"
} > "$OUT_ROOT/vm.env"
# the parts of the console log that matter: the guest's own progress lines and the kernel's AppArmor lines
tr -d '\r' < "$WORK/console.log" | grep -a -i -E '^\[w0s06\]|apparmor' | grep -a -v 'W0S06-RESULT' | cut -c1-300 > "$OUT_ROOT/vm-console.log" || true
echo "done: $(ls "$OUT_ROOT" | grep -c '^vm-ubuntu-24.04') VM configuration folders under $OUT_ROOT" >&2
