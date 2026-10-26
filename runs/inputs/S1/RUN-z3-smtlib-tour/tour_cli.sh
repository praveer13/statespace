#!/bin/sh
# RUN-z3-smtlib-tour: the Z3 command line on each tour file, in the order of smtlib_tour.py. Run from the
# folder that holds smtlib/, with `z3` on the path (it is installed with the z3-solver wheel):
#   uv run --no-project --quiet --with z3-solver==5.3.1 sh tour_cli.sh
# Each section is "== file", Z3's own output, then "-- exit <code> in <ms> ms" (the exit code is the
# command's, and Z3 exits 1 when the script has an error). The script itself exits 0.
z3 --version
for name in starter starter_guarded starter_guarded_get_model unknown_theory unknown_canceled; do
  echo "== $name.smt2"
  start=$(date +%s%N)
  z3 "smtlib/$name.smt2"
  code=$?
  end=$(date +%s%N)
  echo "-- exit $code in $(( (end - start) / 1000000 )) ms"
done
