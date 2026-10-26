// Tests of GATE-specimens (scripts/verify-specimens.mjs and lib/specimens.mjs).
// Run: node --test scripts/spikes/W1-T42/specimens.test.mjs
//
// The last test runs the whole gate on this repository with the real engines (about a minute); it is on by default and
// W1T42_NO_ENGINES=1 skips it. The planted-fault checks are lib/self-check.mjs, which `verify-specimens.mjs --self-check` runs.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO, runProcess } from './lib/engines.mjs';
import { echoEngine, readOnlyScratchDir, scratchDir, specimenTree, writeTree } from './lib/fixtures.mjs';
import { selfCheckSpecimens } from './lib/self-check.mjs';
import { readCabinet, readRuns, readSpineSpecimens } from './lib/specimens.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, '..', '..', 'verify-specimens.mjs');
const { main } = await import(pathToFileURL(GATE).href);
const skipEngines = process.env.W1T42_NO_ENGINES === '1' ? 'W1T42_NO_ENGINES=1' : false;

async function gate(args, deps = {}) {
  const lines = [];
  const code = await main(args, { ...deps, out: (s) => lines.push(s) });
  return { code, text: lines.join('\n') };
}

test('the spine names the runs behind SP-1.1 to SP-1.10, with the ones still to record apart', () => {
  const { specimens, problems } = readSpineSpecimens(REPO);
  assert.deepEqual(problems, []);
  const s1 = specimens.filter((s) => s.stage === 'S1');
  assert.deepEqual(s1.map((s) => s.id), ['SP-1.1', 'SP-1.2', 'SP-1.3', 'SP-1.4', 'SP-1.5', 'SP-1.6', 'SP-1.7', 'SP-1.8', 'SP-1.9', 'SP-1.10']);
  for (const s of s1) assert.ok(s.executed.length + s.pending.length > 0, `${s.id} names a run`);
  const byId = Object.fromEntries(s1.map((s) => [s.id, s]));
  const behind = (id) => [...byId[id].executed, ...byId[id].pending];
  for (const run of ['RUN-z3-starter', 'RUN-z3-optimize-min', 'RUN-z3-boot-variant']) assert.ok(behind('SP-1.1').includes(run), `SP-1.1 names ${run}`);
  for (const run of ['RUN-z3-bv64', 'RUN-z3-bv64-pyodide']) assert.ok(byId['SP-1.4'].executed.includes(run), `SP-1.4 names ${run} as executed`);
  assert.equal(byId['SP-1.1'].lesson, 'S1.L1');
});

test('the run registry is read with the spine status of each registered run', () => {
  const { records, status } = readRuns(REPO);
  assert.ok(records.has('RUN-z3-starter'));
  assert.equal(status.get('RUN-z3-starter'), 'executed');
  assert.ok(status.has('RUN-z3-double-capture'));
});

test('a cabinet record is found by its file name or its id, and every RUN id in it counts', () => {
  const root = writeTree(scratchDir('cabinet-'), {
    'content/specimens/SP-1.1.json': { schema: 'specimen@1', runs: ['RUN-a'], found_in: 'RUN-b' },
    'content/specimens/S2/other.json': { id: 'SP-2.1', evidence: [{ run: 'RUN-c' }] },
    'content/specimens/SP-1.4.yaml': 'id: SP-1.4\nruns:\n  - RUN-d\n  - RUN-e\n',
    'content/specimens/stage-3.yml': '- id: SP-3.1\n  run: RUN-f\n',
    'content/specimens/many.json': { specimens: [{ id: 'SP-5.1', runs: ['RUN-g'] }, { id: 'SP-5.2', runs: ['RUN-h'] }] },
    'content/specimens/unnamed.json': { runs: ['RUN-z'] },
    'content/specimens/README.md': 'not a record',
    'content/specimens/index.json': { specimens: ['SP-1.1'], runs: ['RUN-index'] },
    'content/specimens/manifest.yaml': 'runs: [RUN-manifest]\n',
    'content/specimens/_draft.json': { id: 'SP-9.9', runs: [] },
    'content/specimens/specimen.schema.json': { title: 'a schema' },
  });
  const { present, records } = readCabinet(root);
  assert.equal(present, true);
  const by = Object.fromEntries(records.map((r) => [`${r.file.split('/').at(-1)}:${r.id}`, r.runs]));
  assert.deepEqual(by['SP-1.1.json:SP-1.1'], ['RUN-a', 'RUN-b']);
  assert.deepEqual(by['other.json:SP-2.1'], ['RUN-c']);
  assert.deepEqual(by['SP-1.4.yaml:SP-1.4'], ['RUN-d', 'RUN-e']);
  assert.deepEqual(by['stage-3.yml:SP-3.1'], ['RUN-f']);
  assert.deepEqual(by['many.json:SP-5.1'], ['RUN-g']);
  assert.deepEqual(by['many.json:SP-5.2'], ['RUN-h']);
  assert.deepEqual(by['unnamed.json:null'], ['RUN-z']);
  assert.equal(records.length, 7, 'a README, an index, a manifest, a file that starts with an underscore and a schema are not records');
  assert.deepEqual(readCabinet(scratchDir('no-cabinet-')), { present: false, records: [] });
  fs.rmSync(root, { recursive: true, force: true });
});

test('--list shows every specimen with its runs, marks the ones to record, and re-executes nothing', async () => {
  const r = await gate(['--list']);
  assert.equal(r.code, 0);
  assert.match(r.text, /SP-1\.1 +S1\.L1 +RUN-z3-starter, RUN-z3-optimize-min, RUN-z3-boot-variant/);
  assert.match(r.text, /SP-1\.10 +S1\.L5 .*RUN-z3-bloch06/);
  assert.match(r.text, /SP-8\.5 +S8\.L7 +RUN-tlc-key-ttl \(to record\)/, 'a run that is not on disk is marked to record');
  assert.match(r.text, /nothing was re-executed/);
});

test('--only on a specimen the spine does not list is a finding, and a bad option is exit 2', async () => {
  const root = writeTree(scratchDir('only-'), specimenTree());
  const r = await gate(['--root', root, '--only', 'SP-9.9'], { engines: { cacheDir: '/x', native: async () => echoEngine('native'), pyodide: async () => echoEngine('pyodide') } });
  assert.equal(r.code, 1);
  assert.match(r.text, /SP-9\.9 is not a specimen of the spine's table/);
  assert.equal((await gate(['--nonsense'])).code, 2);
  assert.equal((await gate(['--only'])).code, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('--json prints one object with the verdict, the counts and a status for every specimen', async () => {
  const root = writeTree(scratchDir('json-'), specimenTree());
  const r = await gate(['--root', root, '--json'], { engines: { cacheDir: '/x', native: async () => echoEngine('native'), pyodide: async () => echoEngine('pyodide') } });
  assert.equal(r.code, 0);
  const doc = JSON.parse(r.text);
  assert.equal(doc.gate, 'GATE-specimens');
  assert.equal(doc.result, 'pass');
  assert.deepEqual(doc.claims, ['SEAM-14']);
  assert.deepEqual(doc.specimens.map((s) => [s.id, s.status]), [['SP-1.1', 'reproduced'], ['SP-1.2', 'reproduced'], ['SP-2.1', 'pending']]);
  assert.equal(doc.counts.reproduced, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('no path of this machine reaches the output', async () => {
  const root = writeTree(scratchDir('paths-'), specimenTree({ tamper: true }));
  const r = await gate(['--root', root], { engines: { cacheDir: root, native: async () => echoEngine('native'), pyodide: async () => echoEngine('pyodide') } });
  assert.equal(r.code, 1);
  assert.ok(!r.text.includes(root), 'the tree is <repo>, never its path');
  assert.ok(!/\/(home|Users)\//.test(r.text));
  fs.rmSync(root, { recursive: true, force: true });
});

test('every planted fault of the self-check trips the gate and every control passes', async () => {
  const lines = [];
  const code = await selfCheckSpecimens({ say: (l) => lines.push(l) });
  assert.equal(code, 0, lines.filter((l) => l.includes('FAIL')).join('\n'));
  assert.ok(lines.filter((l) => l.includes('planted:')).length >= 14);
  assert.ok(lines.filter((l) => l.includes('control:')).length >= 4);
});

test('on this repository the executed runs behind SP-1.1 to SP-1.10 reproduce on the real engines', { skip: skipEngines }, async () => {
  const r = await gate(['--only', 'SP-1.1,SP-1.2,SP-1.3,SP-1.4,SP-1.5,SP-1.6,SP-1.7,SP-1.8,SP-1.9,SP-1.10']);
  assert.equal(r.code, 0, r.text);
  for (const id of ['SP-1.1', 'SP-1.4', 'SP-1.5', 'SP-1.7', 'SP-1.8']) assert.match(r.text, new RegExp(`${id.replace('.', '\\.')} +reproduced`), `${id} reproduces`);
  assert.match(r.text, /RUN-z3-budget-pyodide \(2 of 2 lines\)/);
  assert.match(r.text, /GATE-specimens: PASS/);
});

// The gate is started from wherever the lane stands: a checkout that may be read-only, or any directory. The z3py scripts
// behind SP-1.2 save each query under smt2/ beside themselves; they must do it in a scratch directory of their own.
test('the gate started from an empty directory leaves it empty (SP-1.2: RUN-z3-double-capture saves smt2/ beside itself)', { skip: skipEngines }, async () => {
  const started = scratchDir('specimens-empty-cwd-');
  try {
    const r = await runProcess({ cmd: process.execPath, args: [GATE, '--only', 'SP-1.2'], cwd: started, timeoutS: 300 });
    assert.equal(r.exitCode, 0, `${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /SP-1\.2 +reproduced/);
    assert.deepEqual(fs.readdirSync(started), [], 'no smt2/ folder, and nothing else');
  } finally {
    fs.rmSync(started, { recursive: true, force: true });
  }
});

test('the gate started from a read-only directory still passes, as it must on a read-only checkout', { skip: skipEngines }, async (t) => {
  const ro = readOnlyScratchDir('specimens-ro-cwd-');
  if (!ro) return t.skip('this user can write to a mode 0555 directory (root can), so no directory is read-only for it');
  try {
    const r = await runProcess({ cmd: process.execPath, args: [GATE, '--only', 'SP-1.2'], cwd: ro.dir, timeoutS: 300 });
    assert.equal(r.exitCode, 0, `${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /SP-1\.2 +reproduced/);
    assert.match(r.stdout, /GATE-specimens: PASS/);
    assert.ok(!/Read-only file system/.test(`${r.stdout}${r.stderr}`));
  } finally {
    ro.dispose();
  }
});
