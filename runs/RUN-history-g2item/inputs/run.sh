#!/bin/sh
# run.sh: souffle once per history; every line it prints, prefixed with "[hN] ".
souffle --version | sed -n 's/^Version: /souffle /p'
for h in h1 h2 h3; do
  souffle -F "$h" -D- g2.dl 2>&1 | sed "s/^/[$h] /"
done
