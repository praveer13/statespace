#!/usr/bin/env bash
# guest-run.sh: runs INSIDE the Ubuntu 24.04 virtual machine that vm/run-vm.sh boots, as the user "runner".
# It records the sandbox on the VM itself (the way a GitHub-hosted runner runs steps) and, through Docker, in
# containers on the VM. When it is done it prints the results to the serial console between markers and powers
# the machine off; vm/run-vm.sh reads them back from the console log.
#
# Scenarios (SCENARIOS, comma-separated, default host,docker):
#   host    lane-probe.sh on the VM, three times: with the AppArmor restriction on unprivileged user namespaces as
#           the image ships it; after `sysctl kernel.apparmor_restrict_unprivileged_userns=0`; and with the
#           restriction back on and an AppArmor profile that gives /usr/bin/bwrap the `userns` permission, the
#           narrower fix the Ubuntu 24.04 release notes describe
#   docker  run-matrix.sh on the VM's Docker (docker.io from Ubuntu's archive) for a few container profiles, first with
#           the AppArmor restriction as shipped and then, as lane vm-ubuntu-24.04-docker-open, with the sysctl at 0
#
# W0S06_SOLUTIONS names the directory with the private LAB-2 fixture solutions on the guest (run-vm.sh unpacks them
# there and sets it); every probe and every run-matrix.sh call below is given it.

set -u
export PATH="$HOME/.elan/bin:$PATH"
SCENARIOS="${SCENARIOS:-host,docker}"
QUICK=""; [ "${QUICK_RUN:-0}" = 1 ] && QUICK="--comparator-only"
LANE="vm-ubuntu-24.04"
cd "$HOME/scripts/spikes/W0-S06" || exit 1
OUT="$HOME/runs/RUN-bwrap-lanes"
mkdir -p "$OUT"
tty=/dev/ttyS0
say() { echo "[w0s06] $*" | sudo tee "$tty" >/dev/null; }
# the guest's home directory is not part of any recorded text
nh() { sed "s|$HOME|<home>|g"; }

say "guest up: $(uname -r) $(. /etc/os-release; echo "$PRETTY_NAME")"
if [ -z "${W0S06_SOLUTIONS:-}" ] || [ ! -r "$W0S06_SOLUTIONS/Solution.lean" ]; then
  say "W0S06_SOLUTIONS does not name the private fixture solutions; stopping"
  sudo poweroff
  exit 1
fi

case ",$SCENARIOS," in *,host,*)
  mkdir -p "$OUT/$LANE-host-default"
  {
    echo "== sysctl"; sysctl kernel.apparmor_restrict_unprivileged_userns user.max_user_namespaces 2>&1
    echo "== aa-status (summary)"; sudo aa-status 2>&1 | head -8
    echo "== apparmor.d entries naming bwrap, bubblewrap or userns"
    ls /etc/apparmor.d 2>/dev/null | grep -i -E 'bwrap|bubblewrap|userns|unprivileged' || echo "(none)"
    echo "== dpkg: apparmor"; dpkg -l apparmor 2>/dev/null | tail -1
  } > "$OUT/$LANE-host-default.apparmor.txt" 2>&1
  say "host scenario, restriction as shipped"
  ./lane-probe.sh --config "$LANE-host-default" --lane "$LANE" --label host-default \
    --out "$OUT/$LANE-host-default" --solutions "$W0S06_SOLUTIONS" --install --profile standard --off-controls $QUICK 2>&1 | nh > "$OUT/$LANE-host-default.log"
  tail -n 2 "$OUT/$LANE-host-default.log" | sudo tee "$tty" >/dev/null
  if [ -e /proc/sys/kernel/apparmor_restrict_unprivileged_userns ]; then
    sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 > "$OUT/$LANE-host-open.sysctl.txt" 2>&1
    say "host scenario, restriction switched off"
    ./lane-probe.sh --config "$LANE-host-open" --lane "$LANE" --label host-open \
      --out "$OUT/$LANE-host-open" --solutions "$W0S06_SOLUTIONS" --install --profile standard --off-controls $QUICK 2>&1 | nh > "$OUT/$LANE-host-open.log"
    tail -n 2 "$OUT/$LANE-host-open.log" | sudo tee "$tty" >/dev/null
    sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=1 >> "$OUT/$LANE-host-open.sysctl.txt" 2>&1
    # the restriction is back on; give bwrap alone the permission
    sudo tee /etc/apparmor.d/w0s06-bwrap >/dev/null <<'PROFILE'
abi <abi/4.0>,
include <tunables/global>

profile w0s06-bwrap /usr/bin/bwrap flags=(unconfined) {
  userns,
}
PROFILE
    { sudo apparmor_parser -r /etc/apparmor.d/w0s06-bwrap; echo "apparmor_parser exit $?"; sysctl kernel.apparmor_restrict_unprivileged_userns; } > "$OUT/$LANE-host-profile.apparmor.txt" 2>&1
    say "host scenario, restriction on, bwrap profile loaded"
    ./lane-probe.sh --config "$LANE-host-profile" --lane "$LANE" --label host-profile \
      --out "$OUT/$LANE-host-profile" --solutions "$W0S06_SOLUTIONS" --install --profile standard --comparator-only 2>&1 | nh > "$OUT/$LANE-host-profile.log"
    tail -n 2 "$OUT/$LANE-host-profile.log" | sudo tee "$tty" >/dev/null
    sudo apparmor_parser -R /etc/apparmor.d/w0s06-bwrap >/dev/null 2>&1; sudo rm -f /etc/apparmor.d/w0s06-bwrap
  fi
  ;;
esac

case ",$SCENARIOS," in *,docker,*)
  say "docker scenario"
  sudo apt-get update -y >/dev/null 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io nodejs ca-certificates curl git >/dev/null 2>&1
  { sudo docker version 2>&1 | head -20; sudo docker info 2>&1 | grep -i -E 'security|apparmor|seccomp|cgroup|runtime' ; } > "$OUT/$LANE-docker.docker-info.txt" 2>&1
  # run-matrix.sh runs docker; the folders it writes are root-owned and are handed back at the end
  sudo env W0S06_OUT_ROOT="$OUT" W0S06_SOLUTIONS="$W0S06_SOLUTIONS" ./run-matrix.sh --lane "$LANE-docker" \
    --only "${DOCKER_PROFILES:-default,narrow,narrow-no-apparmor,unconfined-both,privileged}" --comparator-only \
    2>&1 | nh > "$OUT/$LANE-docker.log"
  tail -n 4 "$OUT/$LANE-docker.log" | sudo tee "$tty" >/dev/null
  if [ -e /proc/sys/kernel/apparmor_restrict_unprivileged_userns ]; then
    say "docker scenario, restriction switched off"
    sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 > "$OUT/$LANE-docker-open.sysctl.txt" 2>&1
    sudo env W0S06_OUT_ROOT="$OUT" W0S06_SOLUTIONS="$W0S06_SOLUTIONS" ./run-matrix.sh --lane "$LANE-docker-open" \
      --only "${DOCKER_PROFILES:-default,narrow,narrow-no-apparmor,unconfined-both,privileged}" --comparator-only \
      2>&1 | nh > "$OUT/$LANE-docker-open.log"
    tail -n 4 "$OUT/$LANE-docker-open.log" | sudo tee "$tty" >/dev/null
    sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=1 >> "$OUT/$LANE-docker-open.sysctl.txt" 2>&1
  fi
  sudo chown -R "$(id -u):$(id -g)" "$OUT"
  ;;
esac

tar -czf /tmp/w0s06-out.tgz -C "$HOME" runs
say "result bytes: $(stat -c %s /tmp/w0s06-out.tgz)"
{
  echo "W0S06-RESULT-BEGIN"
  base64 -w0 /tmp/w0s06-out.tgz
  echo
  echo "W0S06-RESULT-END"
} | sudo tee "$tty" >/dev/null
sync
sudo poweroff
