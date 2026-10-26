#!/bin/sh
# W1-T12: a second solver on SMT-LIB files. Run inside the Bench image with the files mounted read-only:
#   sh cvc5-check.sh <dir of .smt2 files>
# Prints cvc5's version line, then "<file name without .smt2>: <first line cvc5 printed on stdout>" for each
# file in name order; a file on which cvc5 printed nothing (or was stopped at 60 s) gets an empty verdict.
# cvc5 warns on stderr that no logic was set; stderr is dropped. The script exits 0.
set -u
cvc5 --version | head -1
for f in "$1"/*.smt2; do
  name=$(basename "$f" .smt2)
  verdict=$(timeout 60 cvc5 --lang smt2 "$f" 2>/dev/null | head -1)
  echo "$name: $verdict"
done
