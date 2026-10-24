#!/usr/bin/env bash
# COMPARATOR_BWRAP shim for W0-S06.
#
# Lake runs its sandbox through the program that COMPARATOR_BWRAP names (default: bwrap on PATH),
# and gives that program a clean environment, so this shim reads its settings from a file:
#   ${W0S06_SHIM_CONF:-/tmp/w0s06-shim.conf}, lines "key=value":
#     log=<path>         append one record per call: argv, wall time, exit status (default /tmp/bwrap-shim.log)
#     real=<path>        the real bubblewrap (default /usr/bin/bwrap)
#     fail_call=<N>      fault injection: on the N-th call (1-based), add a bind mount whose source does
#                        not exist, so that the real bwrap fails at setup with its own diagnostic
# With no file the shim only passes calls through to the real bwrap and logs them. The sandbox's own
# behavior is never altered except by fail_call. Measurement runs that give timings do not use the shim.
conf="${W0S06_SHIM_CONF:-/tmp/w0s06-shim.conf}"
log=/tmp/bwrap-shim.log; real=/usr/bin/bwrap; fail_call=0
if [ -r "$conf" ]; then
  while IFS='=' read -r k v; do
    case "$k" in log) log="$v";; real) real="$v";; fail_call) fail_call="$v";; esac
  done < "$conf"
fi
us() { local t="${EPOCHREALTIME//[^0-9]/}"; echo "$t"; }
counter="${log}.count"
n=$(( $(cat "$counter" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$counter"
extra=()
if [ "$fail_call" -gt 0 ] && [ "$n" -eq "$fail_call" ]; then
  extra=(--ro-bind /nonexistent-w0s06 /nonexistent-w0s06)
fi
start="$(us)"
{
  printf 'CALL\t%s\tn=%s\n' "$start" "$n"
  for a in "$@"; do printf 'ARG\t%s\n' "$a"; done
  if [ "${#extra[@]}" -gt 0 ]; then printf 'INJECT\t%s\n' "${extra[*]}"; fi
} >> "$log"
"$real" "${extra[@]}" "$@"
rc=$?
end="$(us)"
printf 'END\t%s\trc=%s\tus=%s\n' "$end" "$rc" "$((end - start))" >> "$log"
exit "$rc"
