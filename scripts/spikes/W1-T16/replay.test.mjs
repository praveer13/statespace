// Tests of RUN-specimens-replay (W1-T16): the replay of the witnesses of SP-1.1, SP-1.4 and SP-1.5 in plain integers. The
// record is valid run@1 and holds what it says; the script prints the very lines the record holds when it is run again; and
// a witness that does not satisfy its query's premises, or does not violate its property, is printed as FAILED and fails the
// script. The replay needs Python 3 and no solver; a machine without it skips the two tests that run it, and says so.
//
//   node --test scripts/spikes/W1-T16/replay.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validate } from '../../../packages/schema/src/index.ts';
import { REPO, sha256File } from '../../runs/registry.mjs';

const ID = 'RUN-specimens-replay';
const SCRIPT = 'scripts/spikes/W1-T16/replay_witnesses.py';
const SCRATCH = process.env.W1T16_SCRATCH ?? os.tmpdir();
const doc = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${ID}.json`), 'utf8'));
const python = spawnSync('python3', ['-I', '-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8' });
const hasPython = python.status === 0 && python.stdout.trim() === '3';
const NAMES = ['sp_1_1_starter', 'sp_1_4_recipient_wrap', 'sp_1_4_pyodide_related_query', 'sp_1_5_mixed_signedness'];

test('the record is run@1, recorded for this task, and passes', () => {
  assert.deepEqual(validate('run', doc), { ok: true });
  assert.equal(doc.id, ID);
  assert.equal(doc.task, 'W1-T16');
  assert.equal(doc.origin, 'recorded');
  assert.equal(doc.exit_code, 0);
  assert.equal(doc.pass, true);
  assert.equal(doc.engine, 'python');
  assert.deepEqual(doc.checks.map((c) => c.id), NAMES);
  assert.ok(doc.checks.every((c) => c.pass === true));
  assert.deepEqual(doc.verdict_lines.map((l) => /^\[([a-z0-9_]+)\] replay ok: /.exec(l)?.[1]), NAMES, 'one "replay ok" line per witness, in order');
});

test('the record holds what it says: the hashes of its script, of the three runs its witnesses are read from, and of its log', () => {
  const roles = doc.inputs.map((i) => i.role.split(':')[0]);
  assert.deepEqual(roles, ['script', 'witness source', 'witness source', 'witness source']);
  assert.deepEqual(doc.inputs.map((i) => i.path), [SCRIPT, 'runs/RUN-z3-starter.json', 'runs/RUN-z3-bv64.json', 'runs/RUN-z3-bv64-pyodide.json']);
  for (const file of [...doc.inputs, ...doc.outputs]) {
    assert.equal(sha256File(path.join(REPO, file.path)), file.sha256, `${file.path} changed since ${ID} was recorded: run node scripts/spikes/W1-T16/record-replay.mjs record, then build-cabinet.mjs`);
  }
  assert.equal(fs.readFileSync(path.join(REPO, doc.outputs[0].path), 'utf8'), `${doc.verdict_lines.join('\n')}\n`, 'the log is the lines');
});

test('the witness each line replays is the one the run it is read from printed', () => {
  const model = (runId, label) => {
    const lines = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${runId}.json`), 'utf8')).verdict_lines;
    const at = lines.findIndex((l) => l.startsWith(`[${label}] `) || l.startsWith(`${label} `));
    assert.ok(at >= 0, `${label} in ${runId}`);
    const block = [lines[at], ...lines.slice(at + 1).filter((_, i, rest) => rest.slice(0, i + 1).every((l) => /^\s/.test(l)))].join(' ');
    return Object.fromEntries([...(/\[(.*)\]/s.exec(block)?.[1] ?? '').matchAll(/([A-Za-z_]+)\s*=\s*(-?[0-9]+)/g)].map((m) => [m[1], m[2]]));
  };
  const sources = {
    sp_1_1_starter: model('RUN-z3-starter', '1.2 starter: overdraft search'),
    sp_1_4_recipient_wrap: model('RUN-z3-bv64', '1.5 BitVec64 signed: guarded DESTINATION wrap'),
    sp_1_4_pyodide_related_query: model('RUN-z3-bv64-pyodide', 'recipient-wrap'),
    sp_1_5_mixed_signedness: model('RUN-z3-bv64', '1.5 BitVec64 unsigned guard, signed check'),
  };
  for (const line of doc.verdict_lines) {
    const name = /^\[([a-z0-9_]+)\]/.exec(line)?.[1];
    const header = /replay ok: ([^:]*):/.exec(line)?.[1] ?? '';
    const replayed = Object.fromEntries([...header.matchAll(/\b([A-Za-z]+)=(-?[0-9]+)/g)].map((m) => [m[1], m[2]]));
    assert.deepEqual(replayed, sources[name], `${name}: the values on the replay line are the witness's own`);
  }
});

test('run again, the script prints the lines the record holds', { skip: hasPython ? false : 'python3 is not available here' }, () => {
  const r = spawnSync('python3', ['-I', path.join(REPO, SCRIPT)], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.split('\n').filter((l) => l !== ''), doc.verdict_lines);
});

test('a witness that is not one is printed FAILED and the script exits 1', { skip: hasPython ? false : 'python3 is not available here' }, (t) => {
  const root = fs.mkdtempSync(path.join(SCRATCH, 'w1t16-replay-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts', 'spikes', 'W1-T16'), { recursive: true });
  fs.copyFileSync(path.join(REPO, SCRIPT), path.join(root, SCRIPT));
  fs.mkdirSync(path.join(root, 'runs'));
  for (const id of ['RUN-z3-starter', 'RUN-z3-bv64', 'RUN-z3-bv64-pyodide']) fs.copyFileSync(path.join(REPO, 'runs', `${id}.json`), path.join(root, 'runs', `${id}.json`));
  const run = (cwd) => spawnSync('python3', ['-I', path.join(root, SCRIPT)], { cwd, encoding: 'utf8' });
  assert.equal(run(root).status, 0, 'the copies replay');

  // the starter's witness with an amount of zero: it breaks the query's premise "amount > 0", so it is no witness of that query
  const starter = JSON.parse(fs.readFileSync(path.join(root, 'runs', 'RUN-z3-starter.json'), 'utf8'));
  starter.verdict_lines = starter.verdict_lines.map((l) => l.replace('amount = 1', 'amount = 0'));
  fs.writeFileSync(path.join(root, 'runs', 'RUN-z3-starter.json'), JSON.stringify(starter));
  const failed = run(root);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /^\[sp_1_1_starter\] replay FAILED: .*amount > 0 FAILED/m);
  assert.match(failed.stdout, /^\[sp_1_4_recipient_wrap\] replay ok: /m, 'the other witnesses still replay');
});
