// Weakened copies of GATE-calls (W1-T37): each removes or loosens one rule, and the gate's own self-check must fail on
// every one of them, so a rule cannot be weakened without the planted fixtures noticing. weakenings.test.mjs runs them.
//
// A copy is a scratch mirror of scripts/verify-calls.mjs and scripts/spikes/W1-T37/lib/ with one text replaced; the
// rest (the S1 fixtures, W1-T42's engines, GATE-items' reader) is linked from the repository unchanged.
//
//   node scripts/spikes/W1-T37/weakenings.mjs           run them all, three at a time, and print which were caught

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');

const J = 'lib/judge.mjs';
/**
 * {name, file (under scripts/spikes/W1-T37/), from, to, slow}: one rule removed or loosened each. `slow` marks a copy that is
 * caught only when a control runs into the 30 s watchdog.
 */
export const WEAKENINGS = [
  { name: 'native and Pyodide may disagree on a verdict', file: J, from: "if (a.verdict !== b.verdict) fail('divergence'", to: "if (false) fail('divergence'" },
  { name: 'native and Pyodide may give different reasons for unknown', file: J, from: "else if (a.verdict === 'unknown' && (a.reason ?? null) !== (b.reason ?? null)) fail(", to: 'else if (false) fail(' },
  { name: 'native and Pyodide may make different numbers of checks', file: J, from: "if (n.length !== p.length) fail('divergence'", to: "if (false) fail('divergence'" },
  { name: 'native and Pyodide may disagree on an optimum', file: J, from: "if (va !== vb) fail('divergence'", to: "if (false) fail('divergence'" },
  { name: "a wrong expected verdict passes", file: J, from: "if (off.length) fail('key', `the called check is", to: "if (false) fail('key', `the called check is" },
  { name: 'a wrong expected value passes', file: J, from: "if (off.length) fail('key', `the optimum is", to: "if (false) fail('key', `the optimum is" },
  { name: 'the key is read from the last check, not the first', file: J, from: 'const off = ENGINES.filter((e) => got[e].checks[0].verdict !== expect.verdict);', to: 'const off = ENGINES.filter((e) => got[e].checks.at(-1).verdict !== expect.verdict);' },
  { name: 'an unreadable key passes', file: J, from: "else if (expect.kind === 'unreadable') fail('key-read', expect.why);", to: "else if (expect.kind === 'unreadable') void expect.why;" },
  { name: 'a value key may sit on several objectives', file: J, from: "else if ((c.objectives ?? []).length !== 1 || (c.soft ?? 0) > 0) fail('value-query'", to: "else if (false) fail('value-query'" },
  { name: 'a call may make no check', file: J, from: "if (!raised) fail('no-check'", to: "if (false) fail('no-check'" },
  { name: "Pyodide's failures to run are not reported", file: J, from: 'for (const e of ENGINES) {\n      const why = runProblem(got[e]);', to: "for (const e of ['native']) {\n      const why = runProblem(got[e]);" },
  { name: "a witness that fails Z3's evaluation passes", file: J, from: "if (c.verdict === 'sat' && c.witness && c.witness.holds === false) fail('witness'", to: "if (false) fail('witness'" },
  { name: 'an unsat cvc5 did not settle counts as confirmed', file: J, from: "} else if (verdict === null) fail('cvc5', `check ${i + 1} is unsat and was not cross-checked: ${why}`);", to: '} else if (verdict === null) counts.unsatConfirmed += 1;' },
  { name: 'cvc5 answering unknown confirms an unsat', file: J, from: "else if (verdict === 'unsat') {", to: "else if (verdict === 'unsat' || verdict === 'unknown') {" },
  { name: 'a witness cvc5 refutes passes', file: J, from: "if (verdict === 'unsat') fail('witness', `check ${i + 1}: cvc5 finds", to: "if (false) fail('witness', `check ${i + 1}: cvc5 finds" },
  { name: 'a value beyond the optimum is not looked for', file: J, from: "else fail('optimum', `cvc5 says ${beyond.verdict}", to: "else if (false) fail('optimum', `cvc5 says ${beyond.verdict}" },
  { name: 'an unattainable optimum passes', file: J, from: "else if (at.verdict === 'unsat') fail('optimum'", to: "else if (false) fail('optimum'" },
  { name: 'an unsat that cvc5 contradicts passes', file: J, from: "else fail('cvc5', `check ${i + 1} is unsat on Z3, and cvc5 says ${verdict}`);", to: 'else counts.unsatConfirmed += 1;' },
  { name: 'an SMT-LIB sat that cvc5 refutes passes', file: J, from: "if (verdict === 'unsat') fail('witness', `check ${i + 1} is sat on Z3", to: "if (false) fail('witness', `check ${i + 1} is sat on Z3" },
  { name: 'unsat answers are never sent to cvc5', file: J, from: "if (cn.verdict === 'unsat') tasks.push(", to: 'if (false) tasks.push(' },
  { name: 'witnesses are never sent to cvc5', file: J, from: "if (cn.verdict === 'sat') {\n        for (const [engine, c] of", to: "if (false) {\n        for (const [engine, c] of" },
  { name: 'an optimum is never sent to cvc5', file: J, from: "if (cell.call?.expect?.kind === 'value' && count >= 1 && n.checks[0].optimum_smt2) {", to: 'if (false) {' },
  { name: 'SMT-LIB cells are never sent to cvc5', file: J, from: '    if (!runsOnZ3(cell)) continue;', to: "    if (!runsOnZ3(cell) || cell.lang === 'smt2') continue;" },
  { name: "an SMT-LIB sat's query is never sent to cvc5", file: J, from: "if (cn.verdict === 'sat' && cell.lang === 'smt2') tasks.push(", to: "if (cn.verdict === 'sat' && cell.lang === 'smt2') void (" },
  { name: 'a call on an unknown instrument passes', file: J, from: "if (!cell.instrument) fail('instrument',", to: "if (!cell.instrument) void ('instrument'," },
  { name: 'a Lean call is deferred in the nightly lane too', file: J, from: "cell.instrument.lane === 'nightly' && lane !== 'nightly'", to: "cell.instrument.lane === 'nightly'" },
  { name: 'a call on an instrument whose engine has not landed passes', file: J, from: "else if (!ENGINES_BUILT.has(engine)) fail('instrument'", to: "else if (false) fail('instrument'" },
  { name: 'a call with no code to run passes', file: J, from: "if (cell.call) fail('cell-code'", to: "if (false) fail('cell-code'" },
  { name: 'an engine off its pin passes', file: J, from: 'if (probe.z3 !== PINS.z3.versionString) findings.push(', to: 'if (false) findings.push(' },
  { name: 'an unreadable page passes', file: J, from: 'export const pageFindings = (problems) => problems.map(', to: 'export const pageFindings = (problems) => [].map(' },
  { name: 'unsat keys read as sat', file: 'lib/cells.mjs', from: "Object.freeze({ violated: 'sat', holds: 'unsat', unknown: 'unknown' })", to: "Object.freeze({ violated: 'sat', holds: 'sat', unknown: 'unknown' })" },
  { name: 'every value key reads as 1', file: 'lib/cells.mjs', from: 'const value = canonicalNumber(key.text);', to: "const value = '1';" },
  { name: 'only the native engine runs', file: 'lib/run.mjs', from: "['native', 'pyodide'].map(async (id) => {", to: "['native'].map(async (id) => {" },
  { name: 'tracked assertions are exported without their tracking literals', file: 'lib/harness.py', from: "list(obj.__dict__.get('_gc_tracked', [])) + ", to: '' },
  { name: "a Solver or an Optimize without an rlimit of its own runs without the gate's", file: 'lib/harness.py', from: "    setter(obj, 'rlimit', default)\n", to: '', slow: true },
  { name: 'cvc5 runs without --incremental, so it answers only the first query of an SMT-LIB cell', file: 'lib/cvc5.mjs', from: "'--incremental', ", to: '' },
  { name: "an SMT-LIB check's query keeps the commands Z3 rejected", file: 'lib/harness.py', from: "rejected = raised or any(x.startswith('(error') for x in lines)", to: 'rejected = False' },
  { name: "an SMT-LIB check's query keeps the commands that only print", file: 'lib/harness.py', from: 'and head not in _CHECK_COMMANDS and head not in _PRINT_COMMANDS and', to: 'and head not in _CHECK_COMMANDS and' },
  { name: "an SMT-LIB check's query keeps the checks before it", file: 'lib/harness.py', from: 'if not rejected and head not in _CHECK_COMMANDS and', to: 'if not rejected and' },
  { name: 'every verdict line of an SMT-LIB cell is a check, an echo among them', file: 'lib/harness.py', from: 'None) if head in _CHECK_COMMANDS else None', to: 'None)' },
  { name: 'a verdict cvc5 printed beside an error line counts', file: J, from: 'if (errors.length) return { verdict: null', to: 'if (false) return { verdict: null' },
  { name: 'the first of several verdicts cvc5 printed for one query counts', file: J, from: 'if (verdicts.length === 1) return { verdict: verdicts[0], why: null };', to: 'if (verdicts.length >= 1) return { verdict: verdicts[0], why: null };' },
  { name: "a bit-vector optimum is compared as Z3's Int numeral", file: 'lib/harness.py', from: '        v = z3.BitVecVal(v.as_long(), e.size(), ctx)\n', to: '' },
  { name: "the witness export leaves out the model's values", file: 'lib/harness.py', from: '_export(ctx, asserts + eqs)', to: '_export(ctx, asserts)' },
  { name: 'the attained-optimum export leaves out the optimum', file: 'lib/harness.py', from: "'at': _export(ctx, asserts + [e == v])", to: "'at': _export(ctx, asserts)" },
  { name: "Z3's global parameters are not reset between cells", file: 'lib/harness.py', from: '    z3.reset_params()\n', to: '' },
  { name: 'the export leaves out the assumptions of check(p)', file: 'lib/harness.py', from: ' + list(assumptions)', to: '' },
  { name: 'a check the gate could not record passes', file: J, from: "if (c.record_error) fail('run'", to: "if (false) fail('run'" },
  { name: 'a free run on INS-z3 in a language Z3 does not run passes', file: J, from: "else if (cell.code !== null) fail('cell-code'", to: "else if (false) fail('cell-code'" },
  { name: 'two cells with one number pass', file: 'lib/cells.mjs', from: 'if (shared.length) {', to: 'if (false) {' },
  // the witness rule, from the second verification round
  { name: "Pyodide's witnesses and records are not judged", file: J, from: 'for (const e of ENGINES) {\n      got[e].checks.forEach(', to: "for (const e of ['native']) {\n      got[e].checks.forEach(" },
  { name: 'every witness record holds', file: 'lib/harness.py', from: "'holds': False if failed else (None if unsettled else True),", to: "'holds': True," },
  { name: "no assertion is evaluated under the model", file: 'lib/harness.py', from: '    for f in formulas:\n', to: '    for f in formulas[:0]:\n' },
  { name: 'an assertion whose evaluation is not true fails, a quantifier Z3 leaves unreduced among them', file: 'lib/harness.py', from: '        elif not z3.is_true(v):\n            residues.append((f, v))', to: '        elif not z3.is_true(v):\n            failed.append(_clip(f))' },
  { name: 'what the evaluator leaves is never settled as true', file: 'lib/harness.py', from: '            if _decide(f.ctx, z3.Not(v), budget) == z3.unsat:', to: '            if False:' },
  { name: 'what the evaluator leaves is never settled as false', file: 'lib/harness.py', from: '            if _decide(f.ctx, v, budget) == z3.unsat:', to: '            if False:' },
  { name: 'the settle step runs with no budget', file: 'lib/harness.py', from: "    _orig['solver_set'](t, 'rlimit', int(rlimit))\n", to: '' },
  { name: 'an unsettled assertion is taken as pinned by the model', file: 'lib/harness.py', from: "'unsettled_pinned': all(arity == 0 and i in pinned for (i, arity) in _uninterpreted(unsettled)),", to: "'unsettled_pinned': True," },
  { name: 'the symbols under a quantifier are not looked at', file: 'lib/harness.py', from: '            todo.append(t.body())\n', to: '            pass\n' },
  { name: 'an unsettled witness passes without cvc5', file: J, from: "else if (open.length && !(verdict === 'sat' && w.unsettled_pinned === true)) {", to: 'else if (false) {' },
  { name: "cvc5's sat settles an unsettled witness over a symbol the model does not pin", file: J, from: '&& w.unsettled_pinned === true)) {', to: ')) {' },
  { name: 'an unsettled witness fails even when cvc5 settles it', file: J, from: "!(verdict === 'sat' && w.unsettled_pinned === true)", to: 'true' },
  { name: "the witness is evaluated on the cell's own model, which model completion changes", file: 'lib/harness.py', from: '    copy = m.translate(m.ctx)\n', to: '    copy = m\n' },
  { name: 'an optimum whose bound cvc5 cannot read passes', file: J, from: "else if (beyond.verdict === null) fail('optimum', `that nothing lies", to: 'else if (beyond.verdict === null) row.notes.push(`that nothing lies' },
  { name: 'a value key may sit beside soft constraints', file: J, from: ' || (c.soft ?? 0) > 0', to: '' },
  // unknown among the verdicts, and the budget of every kind of check, from the third verification round
  { name: 'native and Pyodide may disagree when one of them answers unknown', file: J, from: "if (a.verdict !== b.verdict) fail('divergence'", to: "if (a.verdict !== b.verdict && a.verdict !== 'unknown' && b.verdict !== 'unknown') fail('divergence'" },
  { name: 'only a disagreement in which one engine says unsat fails', file: J, from: "if (a.verdict !== b.verdict) fail('divergence'", to: "if (a.verdict !== b.verdict && (a.verdict === 'unsat' || b.verdict === 'unsat')) fail('divergence'" },
  { name: 'native may say sat where Pyodide says something else', file: J, from: "if (a.verdict !== b.verdict) fail('divergence'", to: "if (a.verdict !== b.verdict && a.verdict !== 'sat') fail('divergence'" },
  { name: 'a key that claims unknown passes whatever the engines answer', file: J, from: 'const off = ENGINES.filter((e) => got[e].checks[0].verdict !== expect.verdict);', to: "const off = ENGINES.filter((e) => expect.verdict !== 'unknown' && got[e].checks[0].verdict !== expect.verdict);" },
  { name: 'a value key passes when the called Optimize reaches no optimum', file: J, from: 'if (v !== expect.value) off.push(', to: "if (ce.verdict === 'sat' && v !== expect.value) off.push(" },
  { name: 'a value key passes when its optimum has no queries for cvc5', file: J, from: "      fail('optimum', n[0].optimum_smt2_error ?", to: "      void ('optimum', n[0].optimum_smt2_error ?" },
  { name: "an SMT-LIB cell without an rlimit of its own runs without the gate's", file: 'lib/harness.py', from: '    rlimit = None if own else default_rlimit\n', to: '    rlimit = None\n', slow: true },
  { name: "an Optimize without an rlimit of its own runs without the gate's", file: 'lib/harness.py', from: "rlimit, source = _budget(self, _orig['opt_set'])", to: 'rlimit, source = _budget(self, lambda *args: None)', slow: true },
  { name: "a cell's set_param('rlimit', N) is ignored, so the gate's rlimit wins over it", file: 'lib/harness.py', from: "        _state['global_rlimit'] = int(r)\n", to: '        pass\n' },
  { name: "an Optimize's own o.set('rlimit', N) is ignored, so the gate's rlimit wins over it", file: 'lib/harness.py', from: "def _opt_set(self, *args, **keys):\n    r = _rlimit_from(args, keys)\n    if r is not None:\n        self.__dict__['_gc_rlimit'] = int(r)\n", to: "def _opt_set(self, *args, **keys):\n    r = _rlimit_from(args, keys)\n    if r is not None:\n        pass\n" },
  { name: 'an rlimit given by keyword is not read', file: 'lib/harness.py', from: "    value = keys.get('rlimit')\n", to: '    value = None\n' },
  { name: "a global rlimit the cell set is not its own budget, so the gate's rlimit wins over it", file: 'lib/harness.py', from: "    if _state['global_rlimit'] is not None:\n        return _state['global_rlimit'], 'cell'\n", to: '' },
  { name: "a solver's own rlimit is not its budget, so the gate's rlimit wins over it", file: 'lib/harness.py', from: "    if own is not None:\n        return own, 'cell'\n", to: '' },
  { name: "cvc5's error lines are not read", file: 'lib/cvc5.mjs', from: "    else if (line.startsWith('(error')) errors.push(line.slice(0, 300));\n", to: '' },
  { name: "only cvc5's first verdict line is read", file: 'lib/cvc5.mjs', from: "if (line === 'sat' || line === 'unsat' || line === 'unknown') verdicts.push(line);", to: "if ((line === 'sat' || line === 'unsat' || line === 'unknown') && verdicts.length === 0) verdicts.push(line);" },
  { name: "Pyodide's own version is not held to its pin", file: J, from: "if (id === 'pyodide' && probe.pyodide !== PINS.pyodide.version) findings.push(", to: 'if (false) findings.push(' },
  { name: "only native's z3 is held to its pin", file: J, from: 'if (probe.z3 !== PINS.z3.versionString) findings.push(', to: "if (id === 'native' && probe.z3 !== PINS.z3.versionString) findings.push(" },
  { name: 'a cvc5 named by STATESPACE_CVC5 is used whatever its SHA-256', file: 'lib/cvc5.mjs', from: '    if (got !== pin.binarySha256) throw new EngineUnavailable(`STATESPACE_CVC5 has SHA-256', to: '    if (false) throw new EngineUnavailable(`STATESPACE_CVC5 has SHA-256' },
  { name: 'a cvc5 on PATH is used whatever its SHA-256', file: 'lib/cvc5.mjs', from: 'if (found && sha256File(found) === pin.binarySha256) {', to: 'if (found) {' },
  { name: 'a reply that holds no checks passes', file: J, from: "if (!Array.isArray(reply.checks)) return 'the reply holds no checks';", to: "if (false) return 'the reply holds no checks';" },
  { name: "a negative decimal key's sign is dropped", file: 'lib/cells.mjs', from: "    if (t.startsWith('-')) num = -num;\n", to: '' },
  { name: 'a fraction is no number', file: 'lib/cells.mjs', from: '  else if (/^-?\\d+\\/\\d+$/.test(t)) {', to: '  else if (false) {' },
  { name: 'a number with thousands separators is no number', file: 'lib/cells.mjs', from: "if (/^-?\\d{1,3}(?:[,\u2009\u202f]\\d{3})+$/.test(t)) t = t.replace(/[,\u2009\u202f]/g, '');", to: "if (false && /^-?\\d{1,3}(?:[,\u2009\u202f]\\d{3})+$/.test(t)) t = t.replace(/[,\u2009\u202f]/g, '');" },
  { name: 'any option a cell sets is read as its rlimit', file: 'lib/harness.py', from: "        if k == 'rlimit':\n", to: '        if True:\n', slow: true },
  { name: 'a maximize objective is not recorded', file: 'lib/harness.py', from: "    self.__dict__.setdefault('_gc_objectives', []).append((arg, 'max', h))\n", to: '    pass\n' },
  { name: 'a constant of any sort is pinned by its model value', file: 'lib/harness.py', from: '        if d.range().kind() in _PLAIN_SORTS and not z3.is_algebraic_value(v):\n', to: '        if True:\n' },
  { name: 'a formula Z3 cannot evaluate under the model is passed over', file: 'lib/harness.py', from: "            failed.append(_clip(f'{f} (could not be evaluated: {e})'))\n", to: '            pass\n' },
  { name: 'the reason of an unknown is not recorded', file: 'lib/harness.py', from: "        rec['reason'] = obj.reason_unknown()\n", to: '        pass\n' },
  { name: "the gate's bookkeeping raises into the cell when it cannot record a check", file: 'lib/harness.py', from: "    except Exception as e:\n        why = _clip(f'{type(e).__name__}: {e}')\n", to: "    except Exception as e:\n        raise\n" },
  { name: 'a check the gate could not record is not said to be', file: 'lib/harness.py', from: "        rec['record_error'] = why\n", to: '        pass\n' },
  { name: "the splitter reads a string's characters as code", file: 'lib/harness.py', from: "        if ch == '\"':\n", to: '        if False:\n' },
  { name: "the splitter reads a quoted symbol's characters as code", file: 'lib/harness.py', from: "        if ch == '|':\n", to: '        if False:\n' },
  { name: "an SMT-LIB unknown's reason is not read from its get-info line", file: 'lib/harness.py', from: "        if reason and checks and checks[-1]['verdict'] == 'unknown':\n", to: '        if False:\n' },
  { name: "the lines of an SMT-LIB script run whole are not read for reasons", file: 'lib/harness.py', from: "                if line in _VERDICTS:\n                    record(line, None)\n                else:\n                    other(line)\n", to: "                if line in _VERDICTS:\n                    record(line, None)\n" },
  { name: 'commands after (exit) run', file: 'lib/harness.py', from: "                if head == 'exit':\n                    break\n", to: '' },
  { name: 'a page file that cannot be read passes', file: 'lib/cells.mjs', from: "problems.push({ file: `${prefix}${rel}`, detail: `the page file could not be read", to: "void ({ file: `${prefix}${rel}`, detail: `the page file could not be read" },
];

/** Build the mirror for one weakening; returns its root and the path of its gate. */
export function buildMirror(w) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-weak-'));
  try {
    const scripts = path.join(root, 'scripts');
    const mine = path.join(scripts, 'spikes', 'W1-T37');
    fs.mkdirSync(path.join(mine, 'lib'), { recursive: true });
    fs.copyFileSync(path.join(REPO, 'scripts', 'verify-calls.mjs'), path.join(scripts, 'verify-calls.mjs'));
    fs.symlinkSync(path.join(REPO, 'scripts', 'verify-items.mjs'), path.join(scripts, 'verify-items.mjs'));
    fs.symlinkSync(path.join(REPO, 'scripts', 'spikes', 'W1-T42'), path.join(scripts, 'spikes', 'W1-T42'));
    fs.symlinkSync(path.join(HERE, 'fixtures'), path.join(mine, 'fixtures'));
    // the library's files only: a __pycache__ left by running the harness in place is not part of the gate
    for (const f of fs.readdirSync(path.join(HERE, 'lib'), { withFileTypes: true })) {
      if (f.isFile()) fs.copyFileSync(path.join(HERE, 'lib', f.name), path.join(mine, 'lib', f.name));
    }
    const target = path.join(mine, w.file);
    const text = fs.readFileSync(target, 'utf8');
    const count = text.split(w.from).length - 1;
    if (count !== 1) throw new Error(`the weakening "${w.name}" finds its text ${count} times in ${w.file}; it must find it once`);
    fs.writeFileSync(target, text.replace(w.from, w.to));
    return { root, gate: path.join(scripts, 'verify-calls.mjs') };
  } catch (e) {
    fs.rmSync(root, { recursive: true, force: true });
    throw e;
  }
}

/** Run one weakened gate's self-check: {name, status, caught, tail}. Caught means it failed (exit 1). */
export function runWeakening(w) {
  const { root, gate } = buildMirror(w);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [gate, '--self-check'], { cwd: REPO, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (status) => {
      fs.rmSync(root, { recursive: true, force: true });
      const failed = out.split('\n').filter((l) => /^\s+FAIL /.test(l));
      resolve({ name: w.name, status, caught: status === 1, tail: failed.slice(0, 3).join('\n') || out.trim().split('\n').slice(-2).join('\n') });
    });
  });
}

/** Run them all, `concurrency` at a time. */
export async function runAll(list = WEAKENINGS, concurrency = 3) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const w = list[next++];
      results.push(await runWeakening(w));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = await runAll();
  for (const r of results) process.stdout.write(`${r.caught ? 'caught ' : 'MISSED '} ${r.name}${r.caught ? '' : ` (exit ${r.status})`}\n`);
  const missed = results.filter((r) => !r.caught).length;
  process.stdout.write(`${results.length - missed} of ${results.length} weakenings caught by the self-check\n`);
  process.exitCode = missed === 0 ? 0 : 1;
}
