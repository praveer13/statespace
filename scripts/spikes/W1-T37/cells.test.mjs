// W1-T37: how GATE-calls finds authored cells and reads what a call's key claims.
//   node --test scripts/spikes/W1-T37/cells.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonicalNumber, cellsOfRecord, collectCells, expectationOf, INSTRUMENTS } from './lib/cells.mjs';
import { S1_FIXTURES } from './lib/planted.mjs';
import { contentReader, itemsOfPage, pageFiles, verdictOf } from '../../verify-items.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const call = (key, options) => ({ key, options: options.map(([id, text, extra = {}]) => ({ id, text, ...extra })) });

test('a key option that names one verdict is read as that verdict, the way GATE-items reads it', () => {
  const cases = [
    ['`sat`', 'sat'],
    ['`unsat`', 'unsat'],
    ['`unknown`', 'unknown'],
    ['proved: `unsat`', 'unsat'],
    ['no verdict: `unknown`', 'unknown'],
    ['proved', 'unsat'],
    ['counterexample', 'sat'],
    ['conservation fails (`sat`)', 'sat'],
    ['conservation holds (`unsat`)', 'unsat'],
    ['Yes: some inputs get past the guard, so a counterexample exists.', 'sat'],
    ["Can't tell", 'unknown'],
  ];
  for (const [text, verdict] of cases) {
    const e = expectationOf(call('A', [['A', text], ['B', 'x']]));
    assert.equal(e.kind, 'verdict', text);
    assert.equal(e.verdict, verdict, text);
    const cls = verdictOf(text);
    assert.equal({ violated: 'sat', holds: 'unsat', unknown: 'unknown' }[cls], verdict, `GATE-items reads "${text}" as ${cls}`);
  }
});

test('a key option that is a number and nothing else is a value', () => {
  assert.deepEqual(expectationOf(call('A', [['A', '`1`'], ['B', '`0`']])), { kind: 'value', value: '1', from: "option A's text", keyText: '`1`' });
  assert.equal(expectationOf(call('B', [['A', '`1`'], ['B', '`-3`']])).value, '-3');
  assert.equal(canonicalNumber('`9,223,372,036,854,775,806`'), '9223372036854775806');
  assert.equal(canonicalNumber('2/4'), '1/2');
  assert.equal(canonicalNumber('0.50'), '1/2');
  assert.equal(canonicalNumber('`1`.'), '1');
  for (const t of ['one', '`1`, the smallest', '1e3', '2⁶³', '1/0', '']) assert.equal(canonicalNumber(t), null, t);
});

test('a key nothing can read is unreadable, and says why', () => {
  const none = expectationOf(call('B', [['A', '`sat`'], ['B', 'a balance that covers it']]));
  assert.equal(none.kind, 'unreadable');
  assert.match(none.why, /names no verdict GATE-calls reads/);
  const two = expectationOf(call('B', [['A', '`unknown`'], ['B', '`sat`, then `unsat`']]));
  assert.equal(two.kind, 'unreadable');
  assert.match(two.why, /more than one verdict \(sat, unsat\)/);
  const missing = expectationOf(call('D', [['A', '`sat`'], ['B', '`unsat`']]));
  assert.equal(missing.kind, 'unreadable');
  assert.match(missing.why, /names no option/);
});

test("an option's verdict field, once lesson@1 carries it, wins over its text, as in GATE-items", () => {
  const e = expectationOf(call('B', [['A', 'No: the guard checks funds.'], ['B', 'Yes: some inputs get past the guard.', { verdict: 'violated' }]]));
  assert.equal(e.kind, 'verdict');
  assert.equal(e.verdict, 'sat');
  assert.equal(e.from, "option B's verdict field");
  const v = expectationOf(call('A', [['A', '`1`', { verdict: 'value' }], ['B', '`0`']]));
  assert.deepEqual([v.kind, v.value], ['value', '1']);
  const bad = expectationOf(call('A', [['A', 'the smallest', { verdict: 'value' }], ['B', '`0`']]));
  assert.equal(bad.kind, 'unreadable');
  assert.match(bad.why, /verdict field says it is a value/);
  const unknownField = expectationOf(call('A', [['A', '`sat`', { verdict: 'nonsense' }], ['B', '`0`']]));
  assert.equal(unknownField.verdict, 'sat', 'a field outside the four classes is ignored, as GATE-items ignores it');
});

test('the S1 fixtures hold the twelve authored calls of the curriculum, read by the content build\'s reader', async () => {
  const { cells, problems, pages } = await collectCells(S1_FIXTURES);
  assert.deepEqual(problems, []);
  assert.equal(pages.length, 7);
  assert.equal(cells.length, 15);
  const calls = cells.filter((c) => c.call);
  assert.equal(calls.length, 12);
  const keys = Object.fromEntries(calls.map((c) => [c.ref, c.call.expect.kind === 'value' ? `value ${c.call.expect.value}` : c.call.expect.verdict]));
  assert.deepEqual(keys, {
    'cell:S1.L0#1': 'sat',
    'cell:S1.L1#1': 'unsat',
    'cell:S1.L1#2': 'value 1',
    'cell:S1.L2#1': 'unknown',
    'cell:S1.L2#2': 'unknown',
    'cell:S1.L3#1': 'sat',
    'cell:S1.L3#2': 'unsat',
    'cell:S1.L4#1': 'unsat',
    'cell:S1.L4#2': 'unsat',
    'cell:S1.L5#1': 'sat',
    'cell:S1.L5#2': 'unsat',
    'cell:S1.L5#3': 'sat',
  });
  // the curriculum's tally (section 2.7) over the eleven calls after Boot: 5 unsat, 3 sat, 2 unknown, 1 value
  const after = calls.filter((c) => c.page !== 'S1.L0').map((c) => keys[c.ref]);
  assert.equal(after.filter((k) => k === 'unsat').length, 5);
  assert.equal(after.filter((k) => k === 'sat').length, 3);
  assert.equal(after.filter((k) => k === 'unknown').length, 2);
  assert.equal(after.filter((k) => k.startsWith('value')).length, 1);
  for (const c of cells) assert.equal(c.instrument, INSTRUMENTS['INS-z3']);
});

test('GATE-calls and GATE-items read the same verdict from every call of the S1 fixtures', async () => {
  const parse = await contentReader();
  for (const file of pageFiles(S1_FIXTURES)) {
    const record = parse(fs.readFileSync(file, 'utf8')).record;
    const items = itemsOfPage(record, file).calls ?? itemsOfPage(record, file).items.filter((i) => i.call);
    const mine = cellsOfRecord(record, file).filter((c) => c.call);
    assert.equal(items.length, mine.length, file);
    for (const c of mine) {
      const theirs = items.find((i) => i.ref === c.ref);
      assert.ok(theirs, `GATE-items sees ${c.ref}`);
      const expected = c.call.expect.kind === 'value' ? 'value' : { sat: 'violated', unsat: 'holds', unknown: 'unknown' }[c.call.expect.verdict];
      assert.equal(theirs.keyVerdict, expected, c.ref);
    }
  }
});

test('discovery reads the page files GATE-items reads, marks other trees with a prefix, and reports a page it cannot read', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-cells-'));
  try {
    fs.mkdirSync(path.join(root, 'content', 'stages', 'S2'), { recursive: true });
    fs.mkdirSync(path.join(root, 'content', 'drawers'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content', 'stages', 'S2', 'S2.L1.md'), ['---', 'id: S2.L1', 'tier: core', 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', '', ':::instrument ins=INS-z3 cell=4 recorded=RUN-z3-starter call=false', '```python', 'print(1)', '```', ':::', ''].join('\n'));
    fs.writeFileSync(path.join(root, 'content', 'stages', 'S2', 'notes.md'), 'not a page');
    fs.writeFileSync(path.join(root, 'content', 'drawers', 'D-07.md'), 'no front matter here\n');
    fs.mkdirSync(path.join(root, 'content', 'stages', 'S2', 'S2.L2.md')); // a page name that is a folder, which cannot be read
    const { cells, problems } = await collectCells(root, { prefix: 'x:' });
    assert.deepEqual(cells.map((c) => [c.ref, c.file, c.call, c.lang, c.code]), [['x:cell:S2.L1#4', 'x:content/stages/S2/S2.L1.md', null, 'python', 'print(1)']]);
    assert.deepEqual(problems.map((p) => p.file), ['x:content/stages/S2/S2.L2.md', 'x:content/drawers/D-07.md']);
    assert.match(problems[0].detail, /^the page file could not be read \(EISDIR\)/);
    assert.ok(!problems[0].detail.includes(root), 'the reason names no machine path');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('two cells with one number are reported and left out, since their refs cannot be told apart; the rest of the page is read', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-dup-'));
  try {
    fs.mkdirSync(path.join(root, 'content', 'stages', 'S2'), { recursive: true });
    const block = (n, code) => [`:::instrument ins=INS-z3 cell=${n} recorded=RUN-z3-starter call=false`, '```python', code, '```', ':::', ''];
    fs.writeFileSync(path.join(root, 'content', 'stages', 'S2', 'S2.L1.md'), ['---', 'id: S2.L1', 'tier: core', 'title: T', 'draft: true', 'kcs: []', '---', '', '## A {minutes=5}', '', ...block(1, 'print(1)'), ...block(2, 'print(2)'), ...block(1, 'print(3)')].join('\n'));
    const { cells, problems, pages } = await collectCells(root);
    assert.deepEqual(cells.map((c) => [c.ref, c.code]), [['cell:S2.L1#2', 'print(2)']]);
    assert.deepEqual(pages, ['content/stages/S2/S2.L1.md']);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].file, 'content/stages/S2/S2.L1.md');
    assert.match(problems[0].detail, /more than one cell is numbered 1/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the instruments table names the engines of spine section 11.2 and the tasks that bring the missing ones', () => {
  assert.equal(INSTRUMENTS['INS-z3'].engine, 'z3');
  assert.equal(INSTRUMENTS['INS-goal-replay'].lane, 'nightly');
  const tasks = fs.readFileSync(path.join(HERE, '..', '..', '..', 'tracker', 'tasks.yaml'), 'utf8');
  for (const [ins, row] of Object.entries(INSTRUMENTS)) {
    if (!row.lands) continue;
    const at = tasks.indexOf(`  - id: ${row.lands}\n`);
    assert.ok(at >= 0, `${row.lands} is a tracker task`);
    const entry = tasks.slice(at, tasks.indexOf('\n  - id: ', at + 10));
    assert.match(entry, new RegExp(`implements:.*"${ins}"`), `${row.lands} implements ${ins}`);
  }
});
