#!/bin/sh
# RUN-z3-inconclusive-pairs: the Z3Py queries, then the two SMT-LIB files through the z3 command line.
python3 -I pairs.py
for q in q7 q8; do printf '[%s cli] ' "$q"; z3 -smt2 "v3-$q.smt2" | tr '\n' ' '; echo; done
