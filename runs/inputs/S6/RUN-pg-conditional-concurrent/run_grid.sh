#!/bin/sh
# run_grid.sh: every interleaving of sessions a and b of the S6.L6 cell, at each cell of grid.json
set -e
mkdir -p out
python - <<'PY'
import json, subprocess
for c in json.load(open('grid.json')):
    b, (a1, a2) = c['balance'], c['amounts']
    open(f"out/setup-{c['key']}.sql", 'w').write(f"CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL); INSERT INTO acct VALUES (1, {b});\n")
    args = ['python', 'iso_driver.py', '--spec', 'S6.L6-cell1.spec', '--setup', f"out/setup-{c['key']}.sql", '--check', 'SELECT id, bal FROM acct ORDER BY id',
            '--sessions', 'a,b', '--all-interleavings', '--label', c['key'], '--out', f"out/{c['key']}.json"]
    for st, amt in (('a_debit', a1), ('b_debit', a2)):
        args += ['--subst', f'{st}:- 80=>- {amt}', '--subst', f'{st}:>= 80=>>= {amt}']
    with open(f"out/{c['key']}.log", 'w') as fh:
        subprocess.run(args, check=True, stdout=fh)
    print(c['key'], 'done')
PY
