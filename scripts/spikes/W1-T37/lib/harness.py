# GATE-calls' Python side (W1-T37): one file that both Z3 engines load, native CPython with the z3-solver wheel and
# Pyodide's CPython with the pyemscripten wheel, so the two run the same code on the same input.
#
# It answers one request per line of JSON and replies with one line of JSON (lib/engines.mjs is the other end):
#
#   {"op": "probe"}                                        the engine's versions
#   {"op": "cell", "id": ..., "lang": "python"|"smt2", "code": ..., "rlimit": N}
#                                                          run an authored cell and report every solver check it made
#   {"op": "request", "id": ..., "input": {...}, "rlimit": N}
#                                                          one engine-port request (scripts/conformance/z3-pyodide-native.mjs)
#
# A cell runs in a fresh Python namespace and a fresh Z3 context, so what it prints, declares and checks never depends on
# the cells before it; its own output is captured and never reaches the protocol. Every `check()` of a Solver or an
# Optimize is intercepted and recorded: the verdict, the reason of an `unknown`, the rlimit it ran under (the cell's own,
# else the gate's), and for the gate's second opinion the query as SMT-LIB text. A `sat` check also records its model as
# strings, whether that model satisfies every assertion of the query (the witness's property; its values are never
# compared with another engine's), and the query with the model's values asserted, which cvc5 must not refute. Whether
# the model satisfies an assertion is Z3's own evaluation with model completion, on a copy of the model so that the
# cell's own model stays as Z3 gave it: an assertion fails only when it evaluates to false. The evaluator leaves a
# quantifier unreduced (with y = 2, `ForAll(k, k*k != y)` evaluates to `ForAll(k, Not(k*k == 2))`), and a fresh solver
# settles what it leaves, under the check's rlimit: its negation unsatisfiable, it holds; it unsatisfiable, it fails;
# neither, it is recorded as unsettled, and the judge asks cvc5. An Optimize records its objectives, their values and,
# for one minimize or maximize objective, two queries that cvc5 settles: nothing beyond the optimum, and the optimum
# attained (Z3 reports a bit-vector objective's optimum as an Int numeral, its unsigned value, which the queries turn
# back into a bit-vector). The recording is the gate's own bookkeeping and never raises into the cell: what it cannot
# record, it says it could not, and the judge reports that.
#
# An SMT-LIB cell runs through Z3's own command interpreter, one command at a time in one context, so that every line
# of output is known to answer its command; the output is the one the whole script prints, save the positions its error
# lines name (harness.test.mjs compares them). Its checks are the verdicts of its check-sat commands, in order: an `(echo "unsat")` prints a verdict line and
# is no check. Z3 goes on past a command it rejects with an `(error ...)` line, and the rejected command has no effect;
# the pinned cvc5 stops at a parse error (an undeclared symbol, an unknown command). So each check carries its own
# query for cvc5: the commands Z3 ran without an error before it, less the ones that only print (get-model, get-value,
# get-info, echo and the like), the other checks and Z3's rlimit option, then the check itself. A script the gate cannot
# split into commands (an unbalanced parenthesis, a string that never ends) runs whole, and its checks carry no query.
#
# Run as `python -I -B harness.py --serve` for the native engine; the Pyodide host (pyodide-server.mjs) loads the file
# and calls handle() once per line.

import contextlib
import gc
import io
import json
import os
import re
import sys
import time
import traceback

import z3

STDOUT_CAP = 4000         # characters of a cell's own output kept for the report
TEXT_CAP = 200            # characters of a formula kept in a failure message
SETTLE_RLIMIT = 5000000   # [D] the settle step's budget when its check ran with none (the gate's default rlimit)

_orig = {
    'solver_check': z3.Solver.check,
    'solver_set': z3.Solver.set,
    'opt_check': z3.Optimize.check,
    'opt_set': z3.Optimize.set,
    'opt_min': z3.Optimize.minimize,
    'opt_max': z3.Optimize.maximize,
    'opt_soft': z3.Optimize.add_soft,
    'solver_track': z3.Solver.assert_and_track,
    'opt_track': z3.Optimize.assert_and_track,
    'set_param': z3.set_param,
}

_state = {'records': None, 'default_rlimit': None, 'global_rlimit': None}


def _clip(text, n=TEXT_CAP):
    text = str(text)
    return text if len(text) <= n else text[: n - 1] + '…'


def reset_context():
    """A fresh Z3 context and Z3's global parameters at their defaults: the next Int('x') of a cell's code builds its terms
    in a new context, and nothing an earlier cell set reaches it (an SMT-LIB cell's (set-option :rlimit N) sets a global
    parameter, which a fresh context alone does not clear)."""
    z3.z3._main_ctx = None
    z3.reset_params()
    gc.collect()


def _rlimit_from(args, keys):
    value = keys.get('rlimit')
    for k, v in zip(args[0::2], args[1::2]):
        if k == 'rlimit':
            value = v
    return value


# ------------------------------------------------------------------ interception
def _solver_set(self, *args, **keys):
    r = _rlimit_from(args, keys)
    if r is not None:
        self.__dict__['_gc_rlimit'] = int(r)
    return _orig['solver_set'](self, *args, **keys)


def _opt_set(self, *args, **keys):
    r = _rlimit_from(args, keys)
    if r is not None:
        self.__dict__['_gc_rlimit'] = int(r)
    return _orig['opt_set'](self, *args, **keys)


def _set_param(*args, **keys):
    r = _rlimit_from(args, keys)
    if r is not None:
        _state['global_rlimit'] = int(r)
    return _orig['set_param'](*args, **keys)


def _opt_min(self, arg):
    h = _orig['opt_min'](self, arg)
    self.__dict__.setdefault('_gc_objectives', []).append((arg, 'min', h))
    return h


def _opt_max(self, arg):
    h = _orig['opt_max'](self, arg)
    self.__dict__.setdefault('_gc_objectives', []).append((arg, 'max', h))
    return h


def _opt_soft(self, *args, **keys):
    self.__dict__['_gc_soft'] = self.__dict__.get('_gc_soft', 0) + 1
    return _orig['opt_soft'](self, *args, **keys)


def _tracker(orig):
    # assert_and_track(a, p) asserts Implies(p, a) and checks with p assumed; assertions() lists only the implication,
    # so the export asserts each tracking literal too, or a second solver would find the query satisfiable.
    def track(self, a, p):
        r = orig(self, a, p)
        lit = z3.Bool(p, self.ctx) if isinstance(p, str) else p
        self.__dict__.setdefault('_gc_tracked', []).append(lit)
        return r
    return track


def _budget(obj, setter):
    """The rlimit a check runs under: the cell's own (on the solver or global), else the gate's, which is set here."""
    own = obj.__dict__.get('_gc_rlimit')
    if own is not None:
        return own, 'cell'
    if _state['global_rlimit'] is not None:
        return _state['global_rlimit'], 'cell'
    default = _state['default_rlimit']
    if default is None:
        return None, None
    setter(obj, 'rlimit', default)
    obj.__dict__['_gc_rlimit'] = default
    return default, 'gate'


def _export(ctx, formulas):
    t = z3.Solver(ctx=ctx)
    t.add(*formulas)
    return t.to_smt2()


_PLAIN_SORTS = None


def _model_facts(m):
    """The model's constants as strings, the equalities that pin them, the names no equality can pin, and the ids of the
    declarations the equalities pin."""
    global _PLAIN_SORTS
    if _PLAIN_SORTS is None:
        _PLAIN_SORTS = {z3.Z3_INT_SORT, z3.Z3_REAL_SORT, z3.Z3_BV_SORT, z3.Z3_BOOL_SORT, z3.Z3_DATATYPE_SORT}
    values, eqs, free, pinned = {}, [], [], set()
    for d in m.decls():
        name = d.name()
        if d.arity() != 0:
            free.append(name)
            continue
        v = m[d]
        values[name] = str(v)
        if d.range().kind() in _PLAIN_SORTS and not z3.is_algebraic_value(v):
            eqs.append(d() == v)
            pinned.add(d.get_id())
        else:
            free.append(name)
    return values, eqs, free, pinned


def _uninterpreted(formulas):
    """The ids and arities of the uninterpreted declarations the formulas mention, inside quantifiers too."""
    found, seen, todo = set(), set(), list(formulas)
    while todo:
        t = todo.pop()
        if t.get_id() in seen:
            continue
        seen.add(t.get_id())
        if z3.is_quantifier(t):
            todo.append(t.body())
        elif z3.is_app(t):
            d = t.decl()
            if d.kind() == z3.Z3_OP_UNINTERPRETED:
                found.add((d.get_id(), d.arity()))
            todo.extend(t.children())
    return found


def _decide(ctx, formula, rlimit):
    """A fresh solver's verdict on one formula, unrecorded (it is the gate's own question, not the cell's)."""
    t = z3.Solver(ctx=ctx)
    _orig['solver_set'](t, 'rlimit', int(rlimit))
    t.add(formula)
    return _orig['solver_check'](t)


def _witness(m, formulas, rlimit):
    """Whether the model satisfies each formula: `(failed, unsettled)`, the texts of the formulas it does not satisfy and
    the formulas whose truth Z3 could not settle. Z3 evaluates each formula with model completion, on a copy of the
    model, so the cell's own model stays as Z3 gave it: a formula fails only when it evaluates to false (or cannot be
    evaluated at all). What the evaluator leaves unreduced, a quantifier above all, is closed over the model's values,
    and a fresh solver settles it within the budget: its negation unsatisfiable, it holds; it unsatisfiable, it fails."""
    copy = m.translate(m.ctx)
    budget = rlimit or _state['default_rlimit'] or SETTLE_RLIMIT
    failed, residues, unsettled = [], [], []
    for f in formulas:
        try:
            v = copy.eval(f, model_completion=True)
        except Exception as e:
            failed.append(_clip(f'{f} (could not be evaluated: {e})'))
            continue
        if z3.is_false(v):
            failed.append(_clip(f))
        elif not z3.is_true(v):
            residues.append((f, v))
    if failed:  # the witness fails already: nothing left to settle
        return failed, []
    for f, v in residues:
        try:
            if _decide(f.ctx, z3.Not(v), budget) == z3.unsat:
                continue
            if _decide(f.ctx, v, budget) == z3.unsat:
                failed.append(_clip(f))
                continue
        except z3.Z3Exception:
            pass  # a residue Z3 cannot take back is unsettled, and so cvc5's to settle
        unsettled.append(f)
    return failed, unsettled


def _blank_record(kind, verdict, ms, rlimit, rlimit_from, n_assumptions):
    return {
        'i': len(_state['records']) + 1 if _state['records'] is not None else 1,
        'kind': kind,
        'verdict': str(verdict),
        'reason': None,
        'rlimit': rlimit,
        'rlimit_from': rlimit_from,
        'assumptions': n_assumptions,
        'model': None,
        'witness': None,
        'smt2': None,
        'witness_smt2': None,
        'objectives': None,
        'optimum_smt2': None,
        'ms': round(ms, 2),
    }


def _optimum_queries(ctx, asserts, e, d, h):
    """The two queries that settle one objective's optimum, a value beyond it and the optimum attained; None when the
    optimum is no number (unbounded, or off by an epsilon). Z3 reports a bit-vector objective's optimum as an Int
    numeral, its unsigned value, so it becomes a bit-vector of the objective's width before it is compared."""
    v = h.value()
    if not (z3.is_int_value(v) or z3.is_rational_value(v) or z3.is_bv_value(v)):
        return None
    if z3.is_bv(e):
        v = z3.BitVecVal(v.as_long(), e.size(), ctx)
        beyond = z3.ULT(e, v) if d == 'min' else z3.UGT(e, v)
    else:
        beyond = e < v if d == 'min' else e > v
    return {'beyond': _export(ctx, asserts + [beyond]), 'at': _export(ctx, asserts + [e == v])}


def _record_check(obj, kind, assumptions, verdict, ms, rlimit, rlimit_from):
    ctx = obj.ctx
    asserts = list(obj.assertions()) + list(obj.__dict__.get('_gc_tracked', [])) + list(assumptions)
    rec = _blank_record(kind, verdict, ms, rlimit, rlimit_from, len(assumptions))
    try:
        rec['smt2'] = _export(ctx, asserts)
    except Exception as e:  # an export failure is reported, never hidden
        rec['smt2_error'] = _clip(f'{type(e).__name__}: {e}')
    if verdict == z3.unknown:
        rec['reason'] = obj.reason_unknown()
    if kind == 'optimize':
        objs = obj.__dict__.get('_gc_objectives', [])
        rec['objectives'] = [{'expr': _clip(e), 'dir': d, 'value': None} for (e, d, _h) in objs]
        rec['soft'] = obj.__dict__.get('_gc_soft', 0)
    if verdict == z3.sat:
        m = obj.model()
        values, eqs, free, pinned = _model_facts(m)
        rec['model'] = values
        failed, unsettled = _witness(m, asserts, rlimit)
        # holds: True, False, or None while an assertion is unsettled; cvc5's sat on the witness query settles those only
        # when every symbol they mention is a constant the query pins
        rec['witness'] = {
            'holds': False if failed else (None if unsettled else True),
            'failed': failed[:3],
            'free': free,
            'unsettled': [_clip(f) for f in unsettled[:3]],
            'unsettled_pinned': all(arity == 0 and i in pinned for (i, arity) in _uninterpreted(unsettled)),
        }
        try:
            rec['witness_smt2'] = _export(ctx, asserts + eqs)
        except Exception as e:
            rec['witness_smt2_error'] = _clip(f'{type(e).__name__}: {e}')
        if kind == 'optimize':
            objs = obj.__dict__.get('_gc_objectives', [])
            for o, (e, d, h) in zip(rec['objectives'], objs):
                try:
                    o['value'] = str(h.value())
                except Exception as ex:
                    o['value'] = None
                    o['error'] = _clip(str(ex))
            if len(objs) == 1 and not rec['soft']:
                try:
                    rec['optimum_smt2'] = _optimum_queries(ctx, asserts, *objs[0])
                except Exception as ex:  # reported (the judge fails a value key it leaves unsettled), never raised
                    rec['optimum_smt2_error'] = _clip(f'{type(ex).__name__}: {ex}')
    return rec


def _checked(obj, kind, assumptions, verdict, ms, rlimit, rlimit_from):
    """The record of one check. The gate's bookkeeping never raises into the cell, where the cell's own code could
    catch it and hide the check: a record it could not complete keeps the verdict, says why, and the judge reports it."""
    try:
        return _record_check(obj, kind, assumptions, verdict, ms, rlimit, rlimit_from)
    except Exception as e:
        why = _clip(f'{type(e).__name__}: {e}')
        rec = _blank_record(kind, verdict, ms, rlimit, rlimit_from, len(assumptions))
        rec['record_error'] = why
        rec['smt2_error'] = f'the gate could not record this check: {why}'
        return rec


def _solver_check(self, *assumptions):
    if _state['records'] is None:
        return _orig['solver_check'](self, *assumptions)
    rlimit, source = _budget(self, _orig['solver_set'])
    t = time.perf_counter()
    r = _orig['solver_check'](self, *assumptions)
    ms = (time.perf_counter() - t) * 1000
    _state['records'].append(_checked(self, 'solver', z3.z3._get_args(assumptions), r, ms, rlimit, source))
    return r


def _opt_check(self, *assumptions):
    if _state['records'] is None:
        return _orig['opt_check'](self, *assumptions)
    rlimit, source = _budget(self, _orig['opt_set'])
    t = time.perf_counter()
    r = _orig['opt_check'](self, *assumptions)
    ms = (time.perf_counter() - t) * 1000
    _state['records'].append(_checked(self, 'optimize', z3.z3._get_args(assumptions), r, ms, rlimit, source))
    return r


z3.Solver.set = _solver_set
z3.Solver.check = _solver_check
z3.Optimize.set = _opt_set
z3.Optimize.check = _opt_check
z3.Optimize.minimize = _opt_min
z3.Optimize.maximize = _opt_max
z3.Optimize.add_soft = _opt_soft
z3.Solver.assert_and_track = _tracker(_orig['solver_track'])
z3.Optimize.assert_and_track = _tracker(_orig['opt_track'])
z3.set_param = _set_param
z3.z3.set_param = _set_param


# ------------------------------------------------------------------ cells
def _error_text(e):
    line = None
    for frame in traceback.extract_tb(e.__traceback__):
        if frame.filename == '<cell>':
            line = frame.lineno
    where = f' (line {line} of the cell)' if line else ''
    return _clip(f'{type(e).__name__}: {e}{where}', 400)


def run_python_cell(code, default_rlimit):
    reset_context()
    _state.update(records=[], default_rlimit=default_rlimit, global_rlimit=None)
    ns = {'__name__': '__cell__', '__builtins__': __builtins__}
    out = io.StringIO()
    error = None
    t = time.perf_counter()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            exec(compile(code, '<cell>', 'exec'), ns)
    except BaseException as e:  # SystemExit and KeyboardInterrupt are a cell's fault too
        error = _error_text(e)
    ms = (time.perf_counter() - t) * 1000
    records = _state['records']
    _state.update(records=None, default_rlimit=None, global_rlimit=None)
    ns.clear()
    del ns
    reset_context()
    text = out.getvalue()
    return {'checks': records, 'stdout': text[:STDOUT_CAP], 'stdout_truncated': len(text) > STDOUT_CAP, 'error': error, 'ms': round(ms, 2)}


_RLIMIT_OPTION = re.compile(r'\(\s*set-option\s+:rlimit\b')
_REASON = re.compile(r'^\(:reason-unknown\s+"(.*)"\)$')
_VERDICTS = ('sat', 'unsat', 'unknown')
_HEAD = re.compile(r'\(\s*([^\s()";|]+)')
_CHECK_COMMANDS = frozenset({'check-sat', 'check-sat-assuming', 'check-sat-using'})
# commands that only print: a check's query for cvc5 leaves them out, as they change nothing that is asserted and some
# of them fail out of place (a get-model with no check before it)
_PRINT_COMMANDS = frozenset({'get-model', 'get-value', 'get-assignment', 'get-proof', 'get-unsat-core',
                             'get-unsat-assumptions', 'get-info', 'get-option', 'get-assertions', 'get-objectives',
                             'echo', 'eval', 'simplify', 'display', 'help'})


def _line_of(text, i):
    return text.count('\n', 0, i) + 1


def smt2_commands(text):
    """The top-level commands of an SMT-LIB script, each as written, split the way Z3's parser reads them: a comment
    runs from ; to the end of its line, a string literal ends at a lone " ("" stands for a quote, and a backslash
    escapes nothing, as in Z3), a quoted symbol runs from | to |. Raises ValueError, saying where, on text that is not
    a sequence of whole commands."""
    cmds, depth, start, i, n = [], 0, 0, 0, len(text)
    while i < n:
        ch = text[i]
        if ch == ';':
            j = text.find('\n', i)
            i = n if j < 0 else j + 1
            continue
        if depth == 0 and ch != '(' and not ch.isspace():
            raise ValueError(f'a ) on line {_line_of(text, i)} closes nothing' if ch == ')' else f'line {_line_of(text, i)} has text outside a command')
        if ch == '"':
            j = i + 1
            while True:
                k = text.find('"', j)
                if k < 0:
                    raise ValueError(f'the string on line {_line_of(text, i)} never ends')
                if not text.startswith('"', k + 1):
                    break
                j = k + 2
            i = k + 1
            continue
        if ch == '|':
            k = text.find('|', i + 1)
            if k < 0:
                raise ValueError(f'the quoted symbol on line {_line_of(text, i)} never ends')
            i = k + 1
            continue
        if ch == '(':
            if depth == 0:
                start = i
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                cmds.append(text[start:i + 1])
        i += 1
    if depth:
        raise ValueError(f'the command on line {_line_of(text, start)} is never closed')
    return cmds


def _eval(ctx, text):
    """Z3's command interpreter on some text: its output, and whether it raised. It raises on an (error ...) line and
    carries the output so far, which is what a learner sees (RUN-z3-smtlib-tour reads it the same way)."""
    try:
        return z3.Z3_eval_smtlib2_string(ctx.ref(), text), False
    except z3.Z3Exception as e:
        arg = e.args[0] if e.args else b''
        return (arg.decode('utf-8', 'replace') if isinstance(arg, bytes) else str(arg)), True


def run_smt2_cell(text, default_rlimit):
    """An SMT-LIB cell through Z3's command interpreter, one command at a time in one context, the gate's rlimit first
    unless the text sets its own. Each check carries the query cvc5 is to answer for it (the header says which)."""
    reset_context()
    ctx = z3.main_ctx()
    try:
        commands, split_error = smt2_commands(text), None
    except ValueError as e:
        commands, split_error = None, f'the gate could not split the SMT-LIB text into commands, so no query can be cut from it: {e}'
    own = any(_RLIMIT_OPTION.match(c) for c in commands) if commands is not None else bool(_RLIMIT_OPTION.search(text))
    rlimit = None if own else default_rlimit
    checks, errors, outputs = [], [], []
    error = None

    def record(verdict, query):
        checks.append({'i': len(checks) + 1, 'kind': 'smt2', 'verdict': verdict, 'reason': None, 'rlimit': rlimit,
                       'rlimit_from': 'cell' if own else 'gate', 'assumptions': 0, 'model': None, 'witness': None,
                       'smt2': query, 'witness_smt2': None, 'objectives': None, 'optimum_smt2': None, 'ms': None,
                       **({} if query is not None else {'smt2_error': split_error})})

    def other(line):
        reason = _REASON.match(line)
        if reason and checks and checks[-1]['verdict'] == 'unknown':
            checks[-1]['reason'] = reason.group(1)
        elif line.startswith('(error'):
            errors.append(_clip(line, 400))

    t = time.perf_counter()
    try:
        if rlimit is not None:
            _eval(ctx, f'(set-option :rlimit {int(rlimit)})')
        if commands is None:
            # the whole script at once: every verdict line is taken for a check, and none carries a query
            output, _raised = _eval(ctx, text)
            outputs.append(output)
            for line in (raw.strip() for raw in output.splitlines()):
                if line in _VERDICTS:
                    record(line, None)
                else:
                    other(line)
        else:
            kept = []  # the commands Z3 ran without an error that may change what is asserted, in order
            for cmd in commands:
                head = (_HEAD.match(cmd) or [None, ''])[1]
                output, raised = _eval(ctx, cmd)
                outputs.append(output)
                lines = [raw.strip() for raw in output.splitlines()]
                verdict = next((x for x in lines if x in _VERDICTS), None) if head in _CHECK_COMMANDS else None
                if verdict is not None:
                    record(verdict, '\n'.join(kept + [cmd]) + '\n')
                for line in lines:
                    other(line)
                rejected = raised or any(x.startswith('(error') for x in lines)
                if not rejected and head not in _CHECK_COMMANDS and head not in _PRINT_COMMANDS and not _RLIMIT_OPTION.match(cmd):
                    kept.append(cmd)
                if head == 'exit':
                    break
    except BaseException as e:
        error = _clip(f'{type(e).__name__}: {e}', 400)
    ms = (time.perf_counter() - t) * 1000
    # An "(error ...)" line is output the learner reads (D-13 shows one), so it is reported, not a failure; a failure is
    # the interpreter giving up with an exception.
    output = ''.join(outputs)
    reset_context()
    return {'checks': checks, 'stdout': output[:STDOUT_CAP], 'stdout_truncated': len(output) > STDOUT_CAP, 'error': error,
            'smt2_errors': errors, 'ms': round(ms, 2)}


# ------------------------------------------------------------------ engine-port requests
def run_request(inp, rlimit):
    """One request of the engine port: SMT-LIB declarations and assertions, or z3py whose first check is the answer."""
    if not isinstance(inp, dict):
        return {'ok': False, 'code': 'invalid-input', 'detail': 'the input is an object with "smtlib" or "python"'}
    if isinstance(inp.get('smtlib'), str):
        text = inp['smtlib']
        if _RLIMIT_OPTION.search(text) or re.search(r'\(\s*set-option\b', text):
            return {'ok': False, 'code': 'invalid-input', 'detail': 'the input sets an option; the budget comes from the request (I10)'}
        reset_context()
        t = time.perf_counter()
        try:
            formulas = z3.parse_smt2_string(text)
        except Exception as e:
            reset_context()
            return {'ok': False, 'code': 'invalid-input', 'detail': _clip(f'Z3 could not parse the SMT-LIB text: {e}', 400)}
        s = z3.Solver()
        if rlimit is not None:
            _orig['solver_set'](s, 'rlimit', int(rlimit))
        s.add(formulas)
        r = _orig['solver_check'](s)
        reply = {'ok': True, 'verdict': str(r), 'reason': s.reason_unknown() if r == z3.unknown else None, 'model': None,
                 'witness_holds': None, 'rlimit': rlimit}
        if r == z3.sat:
            m = s.model()
            values, _eqs, _free, _pinned = _model_facts(m)
            reply['model'] = values
            failed, unsettled = _witness(m, list(formulas), rlimit)
            reply['witness_holds'] = False if failed else (None if unsettled else True)
        reply['ms'] = round((time.perf_counter() - t) * 1000, 2)
        reset_context()
        return reply
    if isinstance(inp.get('python'), str):
        res = run_python_cell(inp['python'], rlimit)
        if res['error'] is not None:
            return {'ok': False, 'code': 'invalid-input', 'detail': res['error']}
        if not res['checks']:
            return {'ok': False, 'code': 'invalid-input', 'detail': 'the program made no solver check'}
        c = res['checks'][0]
        return {'ok': True, 'verdict': c['verdict'], 'reason': c['reason'], 'model': c['model'],
                'witness_holds': c['witness']['holds'] if c['witness'] else None, 'rlimit': c['rlimit'], 'ms': res['ms']}
    return {'ok': False, 'code': 'invalid-input', 'detail': 'the input is an object with "smtlib" or "python"'}


# ------------------------------------------------------------------ the protocol
def probe():
    return {'z3': z3.get_version_string(), 'python': sys.version.split()[0], 'platform': sys.platform}


def handle(line):
    rid = None
    try:
        req = json.loads(line)
        rid = req.get('id')
        op = req.get('op')
        if op == 'probe':
            out = {'ok': True, 'probe': probe()}
        elif op == 'cell':
            lang = req.get('lang', 'python')
            if lang == 'python':
                out = {'ok': True, **run_python_cell(req['code'], req.get('rlimit'))}
            elif lang == 'smt2':
                out = {'ok': True, **run_smt2_cell(req['code'], req.get('rlimit'))}
            else:
                out = {'ok': False, 'code': 'invalid-input', 'detail': f'a cell in {lang!r} cannot run on Z3'}
        elif op == 'request':
            out = run_request(req.get('input'), req.get('rlimit'))
        else:
            out = {'ok': False, 'code': 'bad-message', 'detail': f'unknown op {op!r}'}
    except BaseException as e:
        out = {'ok': False, 'code': 'engine-crashed', 'detail': _clip(f'{type(e).__name__}: {e}', 400)}
    out['id'] = rid
    return json.dumps(out, ensure_ascii=True, sort_keys=True)


def serve():
    proto = os.fdopen(os.dup(1), 'w', encoding='utf-8', buffering=1)
    os.dup2(2, 1)  # anything else written to standard output goes to standard error, never into the protocol
    proto.write(json.dumps({'ready': True, 'probe': probe()}, sort_keys=True) + '\n')
    proto.flush()
    for line in sys.stdin:
        if line.strip():
            proto.write(handle(line) + '\n')
            proto.flush()


if __name__ == '__main__' and '--serve' in sys.argv[1:]:
    serve()
