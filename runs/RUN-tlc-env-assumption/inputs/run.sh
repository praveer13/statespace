#!/bin/sh
# One TLC run per configuration, in the order given; each output line is prefixed with the configuration's tag,
# so a line names the run it came from. q1..q4 are the cases' own configurations; e1..e4 and f1..f4 are the
# step-3 scenarios (the case's model under one environment each).
for cfg in "$@"; do
  mkdir -p /tmp/tlc-$cfg
  java -XX:+UseParallelGC -cp /opt/tla2tools/tla2tools-1.8.0.jar tlc2.TLC -workers 1 -deadlock \
    -metadir /tmp/tlc-$cfg -config $cfg.cfg Outbox 2>&1 | sed "s/^/[$cfg] /"
done
