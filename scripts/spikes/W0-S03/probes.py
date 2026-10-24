"""W0-S03 probes of Z3's datalog engine outside the adapter's normal path.

    python -I probes.py <scenario> [corpus.json]     native: prints one JSON line
    python -I probes.py --all <corpus.json> <out.json>
                                                     native: every scenario in its own process, so a
                                                     crash inside Z3 is recorded, not fatal

Under Pyodide, the runners import this module and call run(scenario), one fresh instance per
scenario, because a crash inside Z3 leaves the runtime unusable.

Scenarios:
  explain-unused-relation   datalog.generate_explanations on, one relation no rule or fact mentions
  explain-arity3            datalog.generate_explanations on, a three-column copy rule, K = 3
  explain-fixture:<case>    the adapter on a fixture with datalog.generate_explanations on
  control-unused-relation, control-arity3
                            the same programs with explanations off
  budget:<params>           one large join (50 values, 125,000 tuples) under rlimit and timeout settings
  unsafe-head, naive-wildcard-negation, unstratified
                            programs Souffle rejects or reads differently, given to Fixedpoint as they stand
  defaults                  the help text of the Fixedpoint parameters the record cites
"""

import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


PROBES = [
    'control-unused-relation',
    'explain-unused-relation',
    'control-arity3',
    'explain-arity3',
    'explain-fixture:toy@toy',
    'explain-fixture:read-ref@w0',
    'explain-fixture:read-ref@w0-overlap',
    'explain-fixture:closure@graph-cycle6',
    'budget:{}',
    'budget:{"rlimit":1000}',
    'budget:{"rlimit":1}',
    'budget:{"timeout":1}',
    'budget:{"datalog.timeout":1}',
    'budget:{"timeout":50}',
    'budget:{"datalog.timeout":50}',
    'unsafe-head',
    'naive-wildcard-negation',
    'unstratified',
    'defaults',
]


def _small(explanations, unused, arity, k):
    import z3

    dom = z3.BitVecSort(k)
    boolean = z3.BoolSort()
    val = lambda n: z3.BitVecVal(n, k)  # noqa: E731
    fp = z3.Fixedpoint()
    fp.set(engine='datalog')
    if explanations:
        fp.set('datalog.generate_explanations', True)
    a = z3.Function('a', *([dom] * arity), boolean)
    p = z3.Function('p', *([dom] * arity), boolean)
    fp.register_relation(a)
    fp.register_relation(p)
    if unused:
        fp.register_relation(z3.Function('b', *([dom] * arity), boolean))
    xs = [z3.Const('x%d' % i, dom) for i in range(arity)]
    fp.declare_var(*xs)
    fp.rule(p(*xs), [a(*xs)])
    fp.fact(a(*[val(1)] * arity))
    fp.fact(a(*[val(2)] * arity))
    answers = [str(fp.query(p(*[val(n)] * arity))) for n in (1, 3)]
    return {'asked': ['p(1..)', 'p(3..)'], 'got': answers, 'expected': ['sat', 'unsat']}


def _budget(params):
    import z3

    k, n = 7, 50
    dom = z3.BitVecSort(k)
    boolean = z3.BoolSort()
    d = z3.Function('d', dom, boolean)
    big = z3.Function('big', dom, dom, dom, boolean)
    fp = z3.Fixedpoint()
    fp.set(engine='datalog')
    for key, val in params.items():
        fp.set(key, val)
    fp.register_relation(d)
    fp.register_relation(big)
    a, b, c = z3.BitVecs('a b c', k)
    fp.declare_var(a, b, c)
    fp.rule(big(a, b, c), [d(a), d(b), d(c)])
    for i in range(n):
        fp.fact(d(z3.BitVecVal(i, k)))
    t = time.perf_counter()
    out = {'params': params, 'domain': n, 'full_size': n ** 3}
    try:
        res = fp.query(z3.Exists([a, b, c], big(a, b, c)))
        out['verdict'] = str(res)
        if res == z3.sat:
            ans = fp.get_answer()
            out['tuples'] = len(ans.children()) if z3.is_or(ans) else 1
        out['reason_unknown'] = fp.reason_unknown()
    except z3.Z3Exception as e:
        out['verdict'] = 'exception'
        out['exception'] = str(e)
    out['seconds'] = round(time.perf_counter() - t, 3)
    return out


def _unsafe_head():
    import z3

    k = 4
    dom = z3.BitVecSort(k)
    boolean = z3.BoolSort()
    q = z3.Function('q', dom, boolean)
    p = z3.Function('p', dom, dom, boolean)
    fp = z3.Fixedpoint()
    fp.set(engine='datalog')
    fp.register_relation(q)
    fp.register_relation(p)
    x, y = z3.BitVecs('x y', k)
    fp.declare_var(x, y)
    fp.rule(p(x, y), [q(x)])
    fp.fact(q(z3.BitVecVal(1, k)))
    res = fp.query(z3.Exists([x, y], p(x, y)))
    ans = fp.get_answer()
    return {
        'program': 'p(x, y) :- q(x).   with the fact q(1)',
        'souffle': 'rejects it: Ungrounded variable y',
        'fixedpoint_verdict': str(res),
        'fixedpoint_tuples': len(ans.children()) if z3.is_or(ans) else 1,
        'domain_size': 2 ** k,
    }


def _naive_wildcard_negation():
    import z3

    k = 2
    dom = z3.BitVecSort(k)
    boolean = z3.BoolSort()
    q = z3.Function('q', dom, boolean)
    r = z3.Function('r', dom, dom, boolean)
    p = z3.Function('p', dom, boolean)
    fp = z3.Fixedpoint()
    fp.set(engine='datalog')
    for f in (q, r, p):
        fp.register_relation(f)
    x, w = z3.BitVecs('x w', k)
    fp.declare_var(x, w)
    fp.rule(p(x), [q(x), z3.Not(r(x, w))])  # Souffle's  p(x) :- q(x), !r(x, _).  read with a fresh variable
    names = ['a', 'b', 'c']
    for i in range(3):
        fp.fact(q(z3.BitVecVal(i, k)))
    fp.fact(r(z3.BitVecVal(0, k), z3.BitVecVal(1, k)))
    fp.fact(r(z3.BitVecVal(1, k), z3.BitVecVal(2, k)))
    res = fp.query(z3.Exists([x], p(x)))
    ans = fp.get_answer()
    cubes = ans.children() if z3.is_or(ans) else [ans]
    got = sorted(names[c.children()[1].as_long()] for c in cubes)
    return {
        'program': 'p(x) :- q(x), !r(x, _).   q = {a, b, c}, r = {(a, b), (b, c)}',
        'souffle': 'p = {c}: no tuple of r starts with c',
        'fixedpoint_read_with_a_fresh_variable': got,
    }


def _unstratified():
    import z3

    dom = z3.BitVecSort(2)
    boolean = z3.BoolSort()
    q, p, r = (z3.Function(n, dom, boolean) for n in 'qpr')
    fp = z3.Fixedpoint()
    fp.set(engine='datalog')
    for f in (q, p, r):
        fp.register_relation(f)
    x = z3.BitVec('x', 2)
    fp.declare_var(x)
    fp.rule(p(x), [q(x), z3.Not(r(x))])
    fp.rule(r(x), [q(x), z3.Not(p(x))])
    fp.fact(q(z3.BitVecVal(1, 2)))
    try:
        res = str(fp.query(z3.Exists([x], p(x))))
        return {'souffle': 'rejects it: Unable to stratify relation(s) {p,r}', 'fixedpoint': res}
    except z3.Z3Exception as e:
        return {'souffle': 'rejects it: Unable to stratify relation(s) {p,r}', 'fixedpoint': 'exception', 'message': str(e)}


def _defaults():
    import z3

    fp = z3.Fixedpoint()
    text = z3.Z3_fixedpoint_get_help(fp.ctx.ref(), fp.fixedpoint)
    lines = {l.split(' ', 1)[0]: l for l in text.split('\n') if l}
    wanted = ['datalog.similarity_compressor', 'datalog.similarity_compressor_threshold', 'datalog.generate_explanations', 'datalog.default_relation', 'datalog.timeout', 'rlimit', 'timeout']
    return {'z3': z3.get_version_string(), 'parameters': {k: lines[k] for k in wanted}}


def run(scenario, corpus=None):
    """corpus: the parsed corpus.json, needed only by explain-fixture."""
    if scenario.startswith('explain-fixture:'):
        import ss_datalog as dl

        case_id = scenario.split(':', 1)[1]
        case = next(c for c in corpus['cases'] if c['id'] == case_id)
        reply = json.loads(
            dl.run_case(
                json.dumps(
                    {
                        'id': case_id,
                        'program': corpus['programs'][case['program']],
                        'facts': corpus['worlds'][case['world']],
                        'engines': ['fixedpoint', 'reference'],
                        'params': {'datalog.generate_explanations': True},
                    }
                )
            )
        )
        if not reply['ok']:
            return {'error': reply['error']}
        return {
            'case': case_id,
            'relations_equal_to_reference': {
                rel: reply['fixedpoint'][rel]['sha256'] == reply['reference'][rel]['sha256'] for rel in reply['fixedpoint']
            },
            'tuples_fixedpoint': {rel: reply['fixedpoint'][rel]['tuples'] for rel in reply['fixedpoint']},
            'tuples_reference': {rel: reply['reference'][rel]['tuples'] for rel in reply['reference']},
        }
    if scenario == 'explain-unused-relation':
        return _small(True, True, 1, 3)
    if scenario == 'explain-arity3':
        return _small(True, False, 3, 3)
    if scenario == 'control-unused-relation':
        return _small(False, True, 1, 3)
    if scenario == 'control-arity3':
        return _small(False, False, 3, 3)
    if scenario.startswith('budget:'):
        return _budget(json.loads(scenario.split(':', 1)[1]))
    if scenario == 'unsafe-head':
        return _unsafe_head()
    if scenario == 'naive-wildcard-negation':
        return _naive_wildcard_negation()
    if scenario == 'unstratified':
        return _unstratified()
    if scenario == 'defaults':
        return _defaults()
    raise SystemExit('unknown scenario ' + scenario)


def run_all_native(corpus_path, out_path):
    entries = []
    for scenario in PROBES:
        p = subprocess.run([sys.executable, '-I', '-B', os.path.abspath(__file__), scenario, corpus_path], capture_output=True, text=True)
        entry = {'scenario': scenario}
        if p.returncode == 0:
            entry.update(outcome='returned', result=json.loads(p.stdout.strip().splitlines()[-1]))
        else:
            entry.update(outcome='crashed', detail='killed by signal %d' % -p.returncode if p.returncode < 0 else 'exit code %d' % p.returncode)
        entries.append(entry)
        print(scenario.ljust(42), entry['outcome'], json.dumps(entry.get('result') or entry['detail'])[:140])
    with open(out_path, 'w') as f:
        json.dump(entries, f, indent=1)


if __name__ == '__main__':
    if sys.argv[1] == '--all':
        run_all_native(sys.argv[2], sys.argv[3])
    else:
        corpus = None
        if len(sys.argv) > 2:
            with open(sys.argv[2]) as f:
                corpus = json.load(f)
        print(json.dumps(run(sys.argv[1], corpus)))
