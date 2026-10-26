#!/bin/sh
# RUN-z3-bv64-pairs: the Z3Py queries, then the two SMT-LIB files through the z3 command line, as the agent ran them.
python3 -I pairs.py
for q in q5 q6; do printf '[%s cli] ' "$q"; z3 -smt2 "v2-$q.smt2"; done
