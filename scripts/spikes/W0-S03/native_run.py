"""W0-S03: run the corpus through the adapter with native Z3 (the conformance pair's other half).

    python -I native_run.py <corpus.json> <out.json> [--plant drop-negation]

Same cases, same adapter, same replies as the Pyodide runners, so the comparison script treats
them alike. --plant drop-negation removes the negated premise `!revoked(d, u)` from every program
before it reaches the engines: a deliberate fault that the comparison must catch.
"""

import datetime
import json
import os
import platform
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ss_datalog as dl  # noqa: E402
import z3  # noqa: E402


def main(corpus_path, out_path, plant=None):
    with open(corpus_path) as f:
        corpus = json.load(f)
    replies = []
    started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    t0 = time.perf_counter()
    for c in corpus['cases']:
        program = corpus['programs'][c['program']]
        if plant == 'drop-negation':
            program = re.sub(r',\s*!revoked\(d,\s*u\)', '', program)
        case = {
            'id': c['id'],
            'program': program,
            'facts': corpus['worlds'][c['world']],
            'engines': ['fixedpoint', 'reference'],
            'derive': ['fixedpoint'] if c['derive'] else [],
        }
        replies.append(json.loads(dl.run_case(json.dumps(case))))
    total = time.perf_counter() - t0
    meta = {
        'runtime': 'native CPython %s, %s%s' % (platform.python_version(), platform.machine(), ', PLANTED FAULT ' + plant if plant else ''),
        'z3': z3.get_version_string(),
        'total_s': total,
        'started_at': started,
    }
    with open(out_path, 'w') as f:
        json.dump({'meta': meta, 'replies': replies}, f)
    print('native: %d cases in %.1f s, z3 %s' % (len(replies), total, meta['z3']))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == '--plant' else None)
