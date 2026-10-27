#!/bin/sh
# run.sh: runs TLC 1.8.0 once per line of jobs.txt (tag|dir|module|cfg|flags) and prints every line TLC writes,
# prefixed with "[tag] ". TLC's state queue goes under /tmp; the trace files it writes stay in the scratch copy.
n=0
while IFS='|' read -r tag dir mod cfg flags; do
  [ -z "$tag" ] && continue
  n=$((n + 1))
  ( cd "$dir" && java -XX:+UseParallelGC -cp /opt/tla2tools/tla2tools-1.8.0.jar tlc2.TLC -workers 1 $flags -metadir /tmp/tlc-states-$n -config "$cfg" "$mod" 2>&1; echo "exit=$?" ) | sed "s/^/[$tag] /"
done < jobs.txt
