"""INS-datalog in the tab: one cell's program through the W0-S03 adapter (ss_datalog.py, a verbatim copy of
scripts/spikes/W0-S03/ss_datalog.py) and Z3's Fixedpoint.

The adapter checks the program the way Souffle's front end does, Fixedpoint computes the relations, and the
adapter rebuilds a minimal-height derivation for every derived tuple from those relations. This module prints
each .output relation the way `souffle -D-` does (a rule of dashes, the name, the column names, a rule of
equals signs, the tuples, a closing rule), in Souffle's order (symbols by first appearance, numbers by value),
and returns a JSON witness the site renders as ruled tables.

Facts live in the program text: a cell has no facts files, so an .input relation is refused.
"""

import hashlib
import json

import ss_datalog as D

# Section 5.6's witness cap is 64 KiB; past this the witness keeps no per-tuple derivations, then none at all.
_WITNESS_CAP = 60_000

# The adapter's fragment (W0-S03 decision 3): anything else is "run this on the Bench".
_BENCH = 'The tab runs the adapter\'s fragment only (W0-S03 decision 3); run this program on the Bench, where Souffle runs.'


def _symbol_order(text):
    order = {}
    for kind, tok, _ in D._tokens(text):
        if kind == 'string':
            s = D.re.sub(r'\\(.)', lambda m: D._ESCAPES.get(m.group(1), m.group(1)), tok[1:-1])
            order.setdefault(s, len(order))
    return order


def _key(order):
    return lambda t: tuple((0, v, 0) if isinstance(v, int) else (1, order.get(v, len(order)), v) for v in t)


def _digest(tuples):
    return hashlib.sha256(''.join(l + '\n' for l in D.lines(tuples)).encode('utf-8')).hexdigest()


def run(text):
    try:
        prog = D.parse(text)
        D.check(prog)
        if prog.inputs:
            raise D.DatalogError('facts', 'a cell has no .facts files; write the facts of %s in the program' % ', '.join(prog.inputs))
        if not prog.outputs:
            raise D.DatalogError('syntax', 'the program has no .output relation, so there is nothing to print')
        edb = D.load_facts(prog, {})
        rels = D.eval_fixedpoint(prog, edb)
        height, best, _ = D.derive(prog, edb, rels)
        _, failures = D.validate(prog, rels, height, best)
    except D.DatalogError as e:
        msg = '%s: %s' % (e.kind, e.message)
        if e.kind == 'unsupported':
            msg += '\n' + _BENCH
        return json.dumps({'ok': False, 'error': msg})

    order = _symbol_order(text)
    out = []
    for rel in prog.outputs:
        cols = prog.decls[rel]
        rows = sorted(rels[rel], key=_key(order))
        print('-' * 15)
        print(rel)
        print('\t'.join(c for c, _ in cols))
        print('=' * 15)
        for t in rows:
            print('\t'.join(str(v) for v in t))
        print('=' * 15)
        why = []
        for t in rows:
            b = best.get((rel, t))
            # rule numbers as the program counts them: the k-th rule whose head is this relation, from 1
            if b is None:
                why.append(None)
            else:
                k = b[0]
                n = sum(1 for r in prog.rules[: k + 1] if r.head[0] == rel)
                why.append([n, prog.rules[k].line, height[(rel, t)]])
        out.append({
            'name': rel,
            'cols': [[c, ty] for c, ty in cols],
            'rows': [list(t) for t in rows],
            'why': why,
            'tuples': len(rows),
            'sha256': _digest(rows),
        })
    res = {'ok': True, 'relations': out, 'checked': len(best), 'failures': failures}
    if len(json.dumps(res)) > _WITNESS_CAP:
        for r in out:
            r['why'] = None
        res['cut'] = 'derivations'
    if len(json.dumps(res)) > _WITNESS_CAP:
        res = {'ok': True, 'relations': [{k: r[k] for k in ('name', 'cols', 'tuples', 'sha256')} for r in out], 'cut': 'rows'}
    return json.dumps(res)
