#!/bin/sh
# For each case tag: build the simulator with that case's worker, run its end-state suite (rustc --test), write
# the seed-1 trace, and validate the trace against the Outbox spec with TLC (S8.L6's trace module). Every output
# line is prefixed with the case's tag.
set -u
for q in "$@"; do
  (
    cp worker_$q.rs worker.rs
    rustc --edition 2021 --test -o /tmp/suite-$q sim.rs 2>&1 && /tmp/suite-$q --test-threads 1 2>&1
    rustc --edition 2021 -o /tmp/sim-$q sim.rs 2>&1 && /tmp/sim-$q $q-seed-1.ndjson 2>&1
    echo "trace $q-seed-1.ndjson:"; cat -n $q-seed-1.ndjson
    mkdir -p /tmp/tlc-$q
    java -XX:+UseParallelGC -cp /opt/tla2tools/tla2tools-1.8.0.jar tlc2.TLC -workers 1 -metadir /tmp/tlc-$q \
      -config $q.cfg OutboxTrace 2>&1
  ) | sed "s/^/[$q] /"
done
