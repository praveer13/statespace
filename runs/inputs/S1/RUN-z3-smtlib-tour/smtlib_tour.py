# RUN-z3-smtlib-tour. Drawer D-13, "SMT-LIB in one page": the examples the page shows, as .smt2 text, run
# through Z3's SMT-LIB command interpreter, which is what the `z3` command line is. Each file is read from
# smtlib/ and evaluated in a fresh context (Z3_eval_smtlib2_string); the output is printed exactly as the
# interpreter returns it, under a "== file" header. An interpreter error raises an exception that carries
# the output so far, which is printed the same way. The "@@" line per file carries the same facts as JSON.
# The Z3 command line itself runs the same files in tour_cli.sh; its log has the same sections.
import hashlib, json, time
from z3 import *

FILES = ['starter', 'starter_guarded', 'starter_guarded_get_model', 'unknown_theory', 'unknown_canceled']

print('z3', get_version_string())
for name in FILES:
    text = open(f'smtlib/{name}.smt2').read()
    ctx = Context()                 # kept alive while the interpreter runs: it is freed with its Python object
    t = time.perf_counter()
    try:
        out, failed = Z3_eval_smtlib2_string(ctx.ref(), text), False
    except Z3Exception as e:
        out, failed = (e.args[0].decode() if isinstance(e.args[0], bytes) else str(e.args[0])), True
    ms = round((time.perf_counter() - t) * 1000, 2)
    print(f'== {name}.smt2')
    print(out, end='')
    print('@@', json.dumps({'q': name, 'input_sha256': hashlib.sha256(text.encode()).hexdigest(), 'output': out,
                            'error': failed, 'ms': ms}, sort_keys=True))
