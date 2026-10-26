// W1-T37: GATE-calls' judge on replies built by hand, one rule at a time (no engine runs here).
//   node --test scripts/spikes/W1-T37/judge.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { expectationOf, INSTRUMENTS } from './lib/cells.mjs';
import { CHECKS, judgeCells, judgeEngines, pageFindings, planCvc5 } from './lib/judge.mjs';

const check = (verdict, extra = {}) => ({
  i: 1,
  kind: 'solver',
  verdict,
  reason: verdict === 'unknown' ? 'incomplete (theory arithmetic)' : null,
  rlimit: 5000000,
  rlimit_from: 'gate',
  model: verdict === 'sat' ? { a: '0' } : null,
  witness: verdict === 'sat' ? { holds: true, failed: [], free: [] } : null,
  smt2: verdict === 'unknown' ? '(check-sat)' : `(assert ${verdict})\n(check-sat)`,
  witness_smt2: verdict === 'sat' ? '(assert sat-with-model)\n(check-sat)' : null,
  objectives: null,
  optimum_smt2: null,
  ...extra,
});
const reply = (...checks) => ({ ok: true, checks: checks.map((c, i) => ({ ...c, i: i + 1 })), error: null, stdout: '' });
const opt = (value, extra = {}) => check('sat', { kind: 'optimize', objectives: [{ expr: 'amount', dir: 'min', value }], soft: 0, optimum_smt2: { beyond: '(beyond)', at: '(at)' }, ...extra });

function cell(n, { key = null, options = [['A', '`sat`'], ['B', '`unsat`'], ['C', '`unknown`']], ins = 'INS-z3', lang = 'python', code = 'pass' } = {}) {
  const c = { ref: `cell:S9.L1#${n}`, page: 'S9.L1', file: 'content/stages/S9/S9.L1.md', ins, instrument: INSTRUMENTS[ins] ?? null, lang, code, call: null };
  if (key) {
    c.call = { key, options: options.map(([id, text]) => ({ id, text })) };
    c.call.expect = expectationOf(c.call);
  }
  return c;
}

/** cvc5 answering every task the way a sound second solver would, unless told otherwise (by task kind, or a function). */
function honestCvc5(tasks, lie = {}) {
  const m = new Map();
  for (const t of tasks) {
    const told = typeof lie === 'function' ? lie(t) : lie[t.kind];
    if (told) m.set(t.key, told);
    else if (t.text == null) m.set(t.key, { verdicts: [], errors: [], detail: `the query has no SMT-LIB export${t.missing ? `: ${t.missing}` : ''}` }); // as runCvc5Tasks answers
    else if (t.kind === 'unsat' || t.kind === 'beyond') m.set(t.key, { verdicts: ['unsat'], errors: [] });
    else m.set(t.key, { verdicts: ['sat'], errors: [] });
  }
  return m;
}

function judge(cells, native, pyodide = native, { lie = {}, lane = 'fast', mode = 'gate' } = {}) {
  const replies = { native: new Map(cells.map((c, i) => [c.ref, native[i]])), pyodide: new Map(cells.map((c, i) => [c.ref, pyodide[i]])) };
  const tasks = planCvc5(cells, replies);
  return judgeCells({ cells, replies, cvc5: honestCvc5(tasks, lie), lane, mode });
}
const checksOf = (r) => [...new Set(r.findings.map((f) => f.check))].sort();

test('a call whose first check gives the key is green, and every unsat is confirmed', () => {
  const r = judge([cell(1, { key: 'B' })], [reply(check('unsat'), check('sat'))]);
  assert.deepEqual(r.findings, []);
  assert.equal(r.counts.unsatChecked, 1);
  assert.equal(r.counts.unsatConfirmed, 1);
  assert.equal(r.counts.witnessesConfirmed, 2, "the second check's witness, once per engine");
});

test('key: a wrong expected verdict trips, naming what each engine returned', () => {
  const r = judge([cell(1, { key: 'A' })], [reply(check('unsat'))]);
  assert.deepEqual(checksOf(r), ['key']);
  assert.match(r.findings[0].detail, /unsat on both engines; key A \("`sat`"\) claims sat/);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'B' })], [reply(check('unknown'))])), ['key']);
  // a key that claims unknown on a query Z3 decides (dp:Z6), each way
  const unsatKeyedUnknown = judge([cell(3, { key: 'C' })], [reply(check('unsat'))]);
  assert.deepEqual(checksOf(unsatKeyedUnknown), ['key']);
  assert.match(unsatKeyedUnknown.findings[0].detail, /unsat on both engines; key C \("`unknown`"\) claims unknown/);
  assert.deepEqual(checksOf(judge([cell(4, { key: 'C' })], [reply(check('sat'))])), ['key']);
  assert.deepEqual(judge([cell(5, { key: 'C' })], [reply(check('unknown'))]).findings, [], 'an unknown keyed unknown');
});

test('the call is about the first check: a later check with the key verdict does not save it', () => {
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A' })], [reply(check('unsat'), check('sat'))])), ['key']);
});

test('value keys: the optimum of one objective, compared as a number', () => {
  const values = [['A', '`1`'], ['B', '`0`'], ['C', '`3`']];
  assert.deepEqual(judge([cell(1, { key: 'A', options: values })], [reply(opt('1'))]).findings, []);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'B', options: values })], [reply(opt('1'))])), ['key']);
  assert.deepEqual(checksOf(judge([cell(3, { key: 'A', options: values })], [reply(check('sat'))])), ['value-query']);
  assert.deepEqual(checksOf(judge([cell(4, { key: 'A', options: values })], [reply(opt('1', { objectives: [{ value: '1' }, { value: '0' }] }))])), ['value-query']);
  assert.deepEqual(checksOf(judge([cell(5, { key: 'A', options: values })], [reply(opt('1', { soft: 1 }))])), ['value-query']);
  const unsatOpt = { ...check('unsat'), kind: 'optimize', objectives: [{ expr: 'amount', dir: 'min', value: null }], soft: 0 };
  assert.deepEqual(checksOf(judge([cell(6, { key: 'A', options: values })], [reply(unsatOpt)])), ['key']);
  // an Optimize its own rlimit stops reaches no optimum, whatever the key claims
  const unknownOpt = { ...check('unknown', { reason: 'unknown' }), kind: 'optimize', objectives: [{ expr: 'amount', dir: 'min', value: null }], soft: 0 };
  const stopped = judge([cell(7, { key: 'A', options: values })], [reply(unknownOpt)]);
  assert.deepEqual(checksOf(stopped), ['key']);
  assert.match(stopped.findings[0].detail, /the optimum is unknown \(no optimum\) on both engines; key A \("`1`"\) claims 1/);
});

test('key-read and no-check', () => {
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A', options: [['A', 'maybe'], ['B', '`unsat`']] })], [reply(check('sat'))])), ['key-read']);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'A' })], [reply()])), ['no-check']);
});

test('divergence: native = Pyodide on checks, verdicts, reasons and optima, never on model values', () => {
  const c = cell(1);
  assert.deepEqual(checksOf(judge([c], [reply(check('unsat'))], [reply(check('sat'))])), ['divergence']);
  assert.deepEqual(checksOf(judge([c], [reply(check('unsat'))], [reply(check('unknown', { reason: 'canceled' }))])), ['divergence']);
  // every ordered pair of distinct verdicts, unknown among them
  for (const a of ['sat', 'unsat', 'unknown']) {
    for (const b of ['sat', 'unsat', 'unknown']) {
      if (a === b) continue;
      const r = judge([c], [reply(check(a))], [reply(check(b))]);
      assert.deepEqual(checksOf(r), ['divergence'], `${a} on native, ${b} on Pyodide`);
      assert.match(r.findings[0].detail, new RegExp(`check 1: native says ${a}, Pyodide says ${b}`));
    }
  }
  assert.deepEqual(checksOf(judge([c], [reply(check('unknown'))], [reply(check('unknown', { reason: 'canceled' }))])), ['divergence']);
  assert.deepEqual(checksOf(judge([c], [reply(check('sat'), check('unsat'))], [reply(check('sat'))])), ['divergence']);
  assert.deepEqual(checksOf(judge([c], [reply(opt('1'))], [reply(opt('2'))])), ['divergence']);
  assert.deepEqual(judge([c], [reply(check('sat', { model: { a: '0' } }))], [reply(check('sat', { model: { a: '7' } }))]).findings, [], 'models differ, and that is fine');
});

test('witness: a model that fails its query, by either engine or by cvc5', () => {
  const bad = check('sat', { witness: { holds: false, failed: ['a < 0'], free: [] } });
  assert.deepEqual(checksOf(judge([cell(1)], [reply(bad)], [reply(check('sat'))])), ['witness']);
  assert.deepEqual(checksOf(judge([cell(2)], [reply(check('sat'))], [reply(bad)])), ['witness']);
  assert.deepEqual(checksOf(judge([cell(3)], [reply(check('sat'))], undefined, { lie: { witness: { verdicts: ['unsat'], errors: [] } } })), ['witness']);
  const unsettled = judge([cell(4)], [reply(check('sat'))], undefined, { lie: { witness: { verdicts: ['unknown'], errors: [] } } });
  assert.deepEqual(unsettled.findings, [], "cvc5 not settling a witness is a note: Z3's evaluation on each engine holds it");
  assert.ok(unsettled.rows[0].notes.some((n) => /did not settle/.test(n)));
  // a model Z3's own evaluation refutes is not asked of cvc5, and is never counted as confirmed
  const refuted = judge([cell(5)], [reply(bad)], [reply(check('sat'))], { lie: { witness: { verdicts: ['sat'], errors: [] } } });
  assert.deepEqual(checksOf(refuted), ['witness']);
  assert.equal(refuted.counts.witnessesConfirmed, 1, "only Pyodide's witness, which Z3's evaluation holds");
  assert.match(refuted.findings[0].detail, /check 1 on native: the model does not satisfy a < 0/);
});

test("witness: an assertion Z3's evaluation leaves unsettled passes only when cvc5 settles it, over symbols the model pins", () => {
  const open = (pinned) => check('sat', { witness: { holds: null, failed: [], free: [], unsettled: ['ForAll(k, k*k != y)'], unsettled_pinned: pinned } });
  const settled = judge([cell(1)], [reply(open(true))]);
  assert.deepEqual(settled.findings, [], 'cvc5 finds the query with the model asserted satisfiable, and the model pins every symbol');
  assert.equal(settled.counts.witnessesConfirmed, 2);
  assert.ok(settled.rows[0].cvc5.some((n) => /native witness: confirmed \(Z3's evaluation left ForAll\(k, k\*k != y\) unsettled\)/.test(n)));
  for (const verdicts of [['unknown'], [], ['sat', 'sat']]) {
    const r = judge([cell(2)], [reply(open(true))], undefined, { lie: { witness: { verdicts, errors: [] } } });
    assert.deepEqual(checksOf(r), ['witness'], JSON.stringify(verdicts));
    assert.match(r.findings[0].detail, /neither Z3's evaluation nor cvc5 settles whether the model satisfies ForAll\(k, k\*k != y\)/);
  }
  const unpinned = judge([cell(3)], [reply(open(false))]);
  assert.deepEqual(checksOf(unpinned), ['witness'], "cvc5's sat leaves free what the model does not pin, so it settles nothing");
  assert.match(unpinned.findings[0].detail, /a symbol the model does not pin/);
  assert.deepEqual(checksOf(judge([cell(4)], [reply(open(true))], undefined, { lie: { witness: { verdicts: ['unsat'], errors: [] } } })), ['witness']);
  const noExport = judge([cell(5)], [reply(check('sat', { witness: open(true).witness, witness_smt2: null, witness_smt2_error: 'Z3Exception: x' }))]);
  assert.deepEqual(checksOf(noExport), ['witness'], 'with no witness query, nothing settles it');
  // the pair compares the two Z3 engines only: an unsettled assertion is a note there
  const pair = judge([cell(6)], [reply(open(true))], undefined, { mode: 'pair' });
  assert.deepEqual(pair.findings, []);
  assert.ok(pair.rows[0].notes.some((n) => /leaves ForAll\(k, k\*k != y\) unsettled/.test(n)));
});

test("cvc5's answer counts only as a single verdict with no error line", () => {
  for (const lie of [{ verdicts: ['unsat'], errors: ['(error "planted")'] }, { verdicts: ['unsat', 'unsat'], errors: [] }, { verdicts: ['unsat', 'sat'], errors: [] }]) {
    const r = judge([cell(1)], [reply(check('unsat'))], undefined, { lie: { unsat: lie } });
    assert.deepEqual(checksOf(r), ['cvc5'], JSON.stringify(lie));
    assert.match(r.findings[0].detail, /was not cross-checked/);
    assert.equal(r.counts.unsatConfirmed, 0);
  }
  const witness = judge([cell(2)], [reply(check('sat'))], undefined, { lie: { witness: { verdicts: ['unsat'], errors: ['(error "x")'] } } });
  assert.deepEqual(witness.findings, [], 'an unsat printed beside an error line refutes nothing');
});

test('cvc5: every unsat confirmed, or the cell fails', () => {
  for (const lie of [{ verdicts: ['sat'], errors: [] }, { verdicts: ['unknown'], errors: [] }, { verdicts: [], errors: ['(error "x")'], detail: '(error "x")' }]) {
    assert.deepEqual(checksOf(judge([cell(1)], [reply(check('unsat'))], undefined, { lie: { unsat: lie } })), ['cvc5'], JSON.stringify(lie));
  }
  const noExport = check('unsat', { smt2: null, smt2_error: 'export failed' });
  assert.deepEqual(checksOf(judge([cell(2)], [reply(noExport)], [reply(check('unsat'))])), ['cvc5']);
  // a task cvc5 was never asked about is not a confirmation
  const c = cell(3);
  const replies = { native: new Map([[c.ref, reply(check('unsat'))]]), pyodide: new Map([[c.ref, reply(check('unsat'))]]) };
  assert.deepEqual(checksOf(judgeCells({ cells: [c], replies, cvc5: new Map() })), ['cvc5']);
});

test('optimum: cvc5 confirms nothing lies beyond a value key and that it is attained', () => {
  const values = [['A', '`1`'], ['B', '`0`']];
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A', options: values })], [reply(opt('1'))], undefined, { lie: { beyond: { verdicts: ['sat'], errors: [] } } })), ['optimum']);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'A', options: values })], [reply(opt('1'))], undefined, { lie: { beyond: { verdicts: ['unknown'], errors: [] } } })), ['optimum']);
  assert.deepEqual(checksOf(judge([cell(3, { key: 'A', options: values })], [reply(opt('1'))], undefined, { lie: { at: { verdicts: ['unsat'], errors: [] } } })), ['optimum']);
  assert.deepEqual(checksOf(judge([cell(4, { key: 'A', options: values })], [reply(opt('1', { optimum_smt2: null }))])), ['optimum']);
  const unwritten = judge([cell(5, { key: 'A', options: values })], [reply(opt('1', { optimum_smt2: null, optimum_smt2_error: 'Z3Exception: sort mismatch' }))]);
  assert.deepEqual(checksOf(unwritten), ['optimum']);
  assert.match(unwritten.findings[0].detail, /could not be written for cvc5: Z3Exception: sort mismatch/, 'the reason the queries are missing is named');
  const confirmed = judge([cell(6, { key: 'A', options: values })], [reply(opt('1'))]);
  assert.deepEqual(confirmed.findings, []);
  assert.equal(confirmed.counts.optimaConfirmed, 1, 'nothing below the optimum and the optimum attained, both confirmed');
  const unread = judge([cell(8, { key: 'A', options: values })], [reply(opt('1'))], undefined, { lie: { beyond: { verdicts: [], errors: ['(error "x")'], detail: '(error "x")' } } });
  assert.deepEqual(checksOf(unread), ['optimum'], 'a bound cvc5 cannot read is not confirmed');
  const unsettled = judge([cell(7, { key: 'A', options: values })], [reply(opt('1'))], undefined, { lie: { at: { verdicts: ['unknown'], errors: [] } } });
  assert.deepEqual(unsettled.findings, [], 'cvc5 not settling that the optimum is attained is a note: both Z3 engines attain it');
  assert.equal(unsettled.counts.optimaConfirmed, 0);
});

test('SMT-LIB cells: each check is judged by cvc5 on its own query', () => {
  // the harness cuts each check's query: the commands Z3 ran without an error before it, then the check
  const smt = (verdicts) => reply(...verdicts.map((v, i) => ({ ...check(v), kind: 'smt2', smt2: `(declare-const a Int)\n; query ${i + 1}\n(check-sat)\n`, witness: null, witness_smt2: null })));
  const c = cell(1, { lang: 'smt2', code: '(check-sat)\n(check-sat)' });
  const replies = { native: new Map([[c.ref, smt(['sat', 'unsat'])]]), pyodide: new Map([[c.ref, smt(['sat', 'unsat'])]]) };
  const tasks = planCvc5([c], replies);
  assert.deepEqual(tasks.map((t) => [t.kind, t.check, /query (\d)/.exec(t.text)[1]]), [['query', 1, '1'], ['unsat', 2, '2']], 'one task per check, each on its own query');
  const both = judge([c], [smt(['sat', 'unsat'])]);
  assert.deepEqual([both.findings, both.counts.unsatChecked, both.counts.unsatConfirmed, both.counts.witnessesConfirmed], [[], 1, 1, 1]);
  assert.deepEqual(checksOf(judge([c], [smt(['sat', 'unsat'])], undefined, { lie: { unsat: { verdicts: ['sat'], errors: [] } } })), ['cvc5']);
  assert.deepEqual(checksOf(judge([c], [smt(['sat', 'unsat'])], undefined, { lie: { unsat: { verdicts: [], errors: ['(error "stop")'], detail: '(error "stop")' } } })), ['cvc5']);
  assert.deepEqual(checksOf(judge([c], [smt(['sat', 'unsat'])], undefined, { lie: { query: { verdicts: ['unsat'], errors: [] } } })), ['witness'], 'an SMT-LIB sat whose query cvc5 finds unsatisfiable');
  const unsettled = judge([c], [smt(['sat', 'unsat'])], undefined, { lie: { query: { verdicts: ['unknown'], errors: [] } } });
  assert.deepEqual(unsettled.findings, [], 'an SMT-LIB sat cvc5 does not settle is a note: both Z3 engines agree');
  const keyed = cell(2, { key: 'A', lang: 'smt2', code: '(check-sat)' });
  assert.deepEqual(checksOf(judge([keyed], [smt(['unsat'])])), ['key']);
  // a script the harness could not split into commands: its checks carry no query
  const unsplit = reply({ ...check('unsat'), kind: 'smt2', smt2: null, smt2_error: 'the gate could not split the SMT-LIB text into commands, so no query can be cut from it: a ) on line 2 closes nothing', witness: null, witness_smt2: null }, { ...check('sat'), kind: 'smt2', smt2: null, smt2_error: 'x', witness: null, witness_smt2: null });
  const r = judge([cell(3, { lang: 'smt2', code: '(check-sat)' })], [unsplit]);
  assert.deepEqual(r.findings.map((f) => f.check), ['cvc5']);
  assert.match(r.findings[0].detail, /check 1 is unsat and has no SMT-LIB export for cvc5: the gate could not split the SMT-LIB text into commands/);
  assert.ok(r.rows[0].notes.some((n) => /check 2 sat: cvc5 did not settle it/.test(n)), 'and its sat is a note');
});

test('run: a cell that was stopped, died or was refused fails, and is judged no further', () => {
  for (const bad of [{ terminated: true, detail: 'no reply' }, { crashed: true, detail: 'exited' }, { ok: false, code: 'invalid-input', detail: 'x' }, undefined]) {
    const r = judge([cell(1, { key: 'A' })], [bad], [reply(check('sat'))]);
    assert.deepEqual(checksOf(r), ['run'], JSON.stringify(bad));
  }
});

test('run: a cell that raised fails, and the checks it made before raising are judged all the same', () => {
  const raisedEarly = { ok: true, checks: [], error: 'NameError: x' };
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A' })], [raisedEarly])), ['run'], 'no check, explained by the exception: no no-check finding');
  const raisedLate = { ...reply(check('unsat')), error: 'Z3Exception: model is not available' };
  const r = judge([cell(2, { key: 'A' })], [raisedLate]);
  assert.deepEqual(checksOf(r), ['key', 'run'], 'the wrong key is reported beside the exception');
  assert.equal(r.counts.unsatConfirmed, 1, 'and the unsat it made is still cross-checked');
  assert.match(r.rows[0].native, /unsat, then raised/);
  assert.deepEqual(checksOf(judge([cell(3)], [raisedLate], [reply(check('unsat'), check('sat'))])), ['divergence', 'run'], 'one engine raising and the other not is a divergence too');
});

test('instruments: no engine here fails a call; a Lean call waits for the nightly lane, and fails there', () => {
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A', ins: 'INS-spectacle', lang: 'tla' })], [undefined])), ['instrument']);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'A', ins: 'INS-interp', lang: 'json' })], [undefined])), ['instrument']);
  assert.deepEqual(checksOf(judge([cell(3, { key: 'A', ins: 'INS-nowhere', lang: 'text' })], [undefined])), ['instrument']);
  const lean = cell(4, { key: 'A', ins: 'INS-goal-replay', lang: 'lean' });
  const fast = judge([lean], [undefined]);
  assert.deepEqual(fast.findings, []);
  assert.equal(fast.rows[0].status, 'deferred');
  assert.deepEqual(checksOf(judge([lean], [undefined], undefined, { lane: 'nightly' })), ['instrument']);
  const free = judge([cell(5, { ins: 'INS-spectacle', lang: 'tla' })], [undefined]);
  assert.deepEqual(free.findings, [], 'a free run on another instrument has nothing to reproduce');
});

test('cell-code: a call, or a free run on INS-z3, needs code that Z3 runs', () => {
  assert.deepEqual(checksOf(judge([cell(1, { key: 'A', code: null })], [undefined])), ['cell-code']);
  assert.deepEqual(checksOf(judge([cell(2, { key: 'A', lang: 'text' })], [undefined])), ['cell-code']);
  const py = judge([cell(3, { lang: 'py' })], [undefined]);
  assert.deepEqual(checksOf(py), ['cell-code'], 'a ```py free run would never be reproduced or cross-checked');
  assert.match(py.findings[0].detail, /a free run on INS-z3 in py, which Z3 does not run/);
  const empty = judge([cell(4, { code: null })], [undefined]);
  assert.deepEqual(empty.findings, [], 'a cell with no code at all has nothing to run');
  assert.equal(empty.rows[0].status, 'not-run');
});

test('run: a check the gate could not record fails, whatever its verdict', () => {
  for (const verdict of ['sat', 'unsat', 'unknown']) {
    const unrecorded = check(verdict, { record_error: 'RuntimeError: boom', smt2: null, smt2_error: 'the gate could not record this check: RuntimeError: boom', witness: null, witness_smt2: null });
    const r = judge([cell(1)], [reply(unrecorded)], [reply(check(verdict))]);
    assert.ok(checksOf(r).includes('run'), verdict);
    assert.match(r.findings.find((f) => f.check === 'run').detail, /native: the gate could not record check 1 \((sat|unsat|unknown)\): RuntimeError: boom/);
  }
});

test('the pair mode compares the two Z3 engines only', () => {
  const r = judge([cell(1), cell(2, { key: 'A', ins: 'INS-spectacle', lang: 'tla' })], [reply(check('unsat')), undefined], undefined, { mode: 'pair', lie: { unsat: { verdicts: ['sat'], errors: [] } } });
  assert.deepEqual(r.findings, [], 'no cvc5 and no other instrument in the pair');
  assert.equal(r.counts.cells, 1);
});

test('pins and unreadable pages', () => {
  assert.deepEqual(judgeEngines({ native: { z3: '5.3.1' }, pyodide: { z3: '5.3.1', pyodide: '314.0.7' } }), []);
  assert.deepEqual(judgeEngines({ native: { z3: '5.3.0' } }).map((f) => f.check), ['pin']);
  assert.deepEqual(judgeEngines({ pyodide: { z3: '5.3.1', pyodide: '0.27.0' } }).map((f) => f.check), ['pin']);
  assert.deepEqual(pageFindings([{ file: 'content/drawers/D-07.md', detail: 'x' }]).map((f) => f.check), ['page']);
  assert.ok(Object.keys(CHECKS).length >= 13);
});
