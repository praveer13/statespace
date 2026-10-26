#!/bin/sh
# RUN-tv-reference: every cell the reference translation validator keys (curriculum S9 section 13)
for c in transfer-30-1-2 transfer-30-1-2.reuse self-transfer.swapped self-transfer.read-both-first move-whole-balance move-whole-balance.reevaluated transfer-5-1-2 transfer-5-1-2.redundant-read transfer-5-1-2.maybefail; do
  echo "== validate $c"; python3 -I tv.py validate cases/$c.tv; echo "exit=$?"
done
for p in rollback-1 rollback-2 rollback-3; do
  echo "== run $p"; python3 -I tv.py run cases/$p.ir --store a0=5,a1=0; echo "exit=$?"
done
for c in transfer-5-1-2 transfer-5-1-2.redundant-read transfer-5-1-2.maybefail; do
  echo "== run $c"; python3 -I tv.py run cases/$c.tv --store a1=10,a2=0; echo "exit=$?"
done
echo "== run move-whole-balance.reevaluated"; python3 -I tv.py run cases/move-whole-balance.reevaluated.tv --store a1=5,a2=0; echo "exit=$?"
