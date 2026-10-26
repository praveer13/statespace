#!/bin/sh
# Runs inside the postgres:18 container (docker exec), as the superuser postgres. For each case (q5, q6) and each
# world (w1, w2): a fresh database, the case's schema, the world's rows, then frank's two commands. Every output
# line is prefixed with "[case world] ". Then the pair check with the case's observer, and the step-3 scenarios
# judged by the same observer:
#   q5's observer: the rows frank's SELECT returns (not a command's outcome: its tag, or an error and its fields)
#   q6's observer: the rows and the outcome of every command (every line)
set -u
cd /q
psql -X -q -U postgres -c 'CREATE ROLE frank' >/dev/null
obs() {  # obs <case> <file>: the case's observation of a response
  if [ "$1" = q5 ]; then grep -v -E '^(INSERT |ERROR: |SCHEMA NAME: |TABLE NAME: |CONSTRAINT NAME: |LOCATION: )' "$2"; else cat "$2"; fi
}
for q in q5 q6; do
  for w in w1 w2; do
    db="${q}_${w}"
    createdb -U postgres "$db"
    psql -X -q -v ON_ERROR_STOP=1 -U postgres -d "$db" -f "schema_$q.sql" -f "world_$w.sql"
    psql -X -At -U postgres -d "$db" -v VERBOSITY=verbose -f frank.sql 2>&1 \
      | sed -E 's/^psql:[^ ]+ //' | grep -v -E '^(SET)$' > "/tmp/$db.out"
    sed "s/^/[$q $w] /" "/tmp/$db.out"
  done
  if [ "$(obs $q /tmp/${q}_w1.out)" = "$(obs $q /tmp/${q}_w2.out)" ]; then v=equal; else v=apart; fi
  echo "[$q pair] w1 and w2 observations $v"
  for s in s1 s2 s3; do
    if [ "$(obs $q scenarios/$s-L.txt)" = "$(obs $q scenarios/$s-R.txt)" ]; then v=equal; else v=apart; fi
    echo "[$q $s] $v"
  done
done
