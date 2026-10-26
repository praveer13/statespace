// Tests of GATE-conformance (scripts/verify-conformance.mjs).
// Run: node --test scripts/spikes/W1-T42/conformance.test.mjs
//
// One test runs the built-in pair on the real engines (a few seconds once they are cached); W1T42_NO_ENGINES=1 skips it.
// The planted-fault checks are lib/self-check.mjs, which `verify-conformance.mjs --self-check` runs.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO } from './lib/engines.mjs';
import { conformanceTree, scratchDir, standInEngine, stubPair, writeTree } from './lib/fixtures.mjs';
import { selfCheckConformance } from './lib/self-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, '..', '..', 'verify-conformance.mjs');
const { main, judgeScript, PAIRS } = await import(pathToFileURL(GATE).href);
const skipEngines = process.env.W1T42_NO_ENGINES === '1' ? 'W1T42_NO_ENGINES=1' : false;

async function gate(args, deps = {}) {
  const lines = [];
  const code = await main(args, { ...deps, out: (s) => lines.push(s) });
  return { code, text: lines.join('\n') };
}

test('the table covers every pair of ARCHITECTURE.md section 13.3 and the Clearinghouse row of spine 11.2', () => {
  const doc = fs.readFileSync(path.join(REPO, 'docs', 'ARCHITECTURE.md'), 'utf8');
  const section = doc.slice(doc.indexOf('### 13.3 Conformance pairs'), doc.indexOf('### 13.4 Red nights'));
  const names = [...section.matchAll(/^\| ([^|]+?) \|/gm)].map((m) => m[1]).filter((n) => n !== 'Pair' && !n.startsWith('---'));
  assert.equal(names.length, 6, 'section 13.3 lists six pairs');
  for (const name of names) assert.ok(PAIRS.some((p) => p.label.toLowerCase().startsWith(name.toLowerCase())), `no row for "${name}"`);
  assert.ok(PAIRS.some((p) => /Clearinghouse provider simulator/.test(p.label)), 'spine 11.2 lists the provider simulator apart');
  assert.equal(new Set(PAIRS.map((p) => p.id)).size, PAIRS.length);
});

test('each pair script path is the deliverable of the task that builds it', () => {
  const tasks = fs.readFileSync(path.join(REPO, 'tracker', 'tasks.yaml'), 'utf8').split(/^  - id: /m);
  const block = (id) => tasks.find((t) => t.startsWith(`${id}\n`)) ?? '';
  for (const p of PAIRS.filter((x) => x.script && x.builtBy !== 'W5-T35')) {
    assert.ok(block(p.builtBy).includes(`"${p.script}"`), `${p.builtBy} does not list ${p.script} among its deliverables`);
  }
  // The one pair no task names a script for: reported as a request, and the path follows the convention.
  const provider = PAIRS.find((p) => p.builtBy === 'W5-T35');
  assert.equal(provider.script, 'scripts/conformance/provider-tlc.mjs');
  assert.ok(!block('W5-T35').includes('scripts/conformance/'), 'if W5-T35 starts naming a script, the table must follow it');
});

test('exactly one pair is built in, and it is the first', () => {
  assert.deepEqual(PAIRS.filter((p) => p.builtin).map((p) => p.id), ['z3-same-query']);
  assert.equal(PAIRS[0].id, 'z3-same-query');
});

test('a pair script is judged by its exit status and its report together', () => {
  const run = (stdout, exitCode, extra = {}) => ({ stdout, stderr: '', exitCode, timedOut: false, durationMs: 1500, ...extra });
  const ok = JSON.stringify({ ok: true, compared: 10, equal: 10 });
  assert.equal(judgeScript({}, run(ok, 0)).state, 'held');
  assert.equal(judgeScript({}, run(ok, 0)).detail, '10 of 10 equal');
  const bad = JSON.stringify({ ok: false, compared: 10, equal: 9, differences: [{ fixture: 'f1', expected: 'sat', got: 'unsat' }] });
  const differs = judgeScript({}, run(bad, 1));
  assert.equal(differs.state, 'differs');
  assert.match(differs.detail, /1 difference; the first: \{"fixture":"f1"/);
  assert.equal(judgeScript({}, run(ok, 1)).state, 'differs', 'ok in the report, 1 in the exit status');
  assert.equal(judgeScript({}, run(bad, 0)).state, 'differs', 'not ok in the report, 0 in the exit status');
  assert.equal(judgeScript({}, run('3 of 40 differ', 1)).state, 'differs');
  assert.equal(judgeScript({}, run('all good', 0)).state, 'held');
  assert.equal(judgeScript({}, run('', 2, { stderr: 'tlc jar missing\n' })).state, 'error');
  assert.equal(judgeScript({}, run('', 137)).state, 'error');
  assert.equal(judgeScript({}, run('', null, { timedOut: true })).state, 'error');
  assert.equal(judgeScript({}, run('', null, { stderr: 'ENOENT' })).state, 'error');
});

test('--list shows every pair with its script, whether it exists and, when it does not, the task that builds it', async () => {
  const r = await gate(['--list']);
  assert.equal(r.code, 0);
  assert.match(r.text, /^present +z3-same-query .*\[built in\]$/m);
  for (const p of PAIRS.filter((x) => x.script)) {
    const line = r.text.split('\n').find((l) => new RegExp(` ${p.id} `).test(l));
    assert.ok(line, `no line for ${p.id}`);
    assert.ok(line.includes(`[${p.script}`), `${p.id}'s line names its script`);
    const exists = fs.existsSync(path.join(REPO, p.script));
    assert.equal(line.startsWith('present'), exists, `${p.id} is ${exists ? 'present' : 'absent'}`);
    if (!exists) assert.ok(line.includes(`built by ${p.builtBy}`), `${p.id} names ${p.builtBy}`);
  }
});

test('an unknown pair or option is exit 2, and --help prints the header', async () => {
  assert.equal((await gate(['--only', 'nonsense'])).code, 2);
  assert.equal((await gate(['--require', 'nonsense'])).code, 2);
  assert.equal((await gate(['--bogus'])).code, 2);
  const help = await gate(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.text, /GATE-conformance/);
  assert.match(help.text, /node scripts\/conformance\/<pair>\.mjs --json/);
});

test('--require-all fails while any pair is absent, and a present pair script is run in the tree it is given', async () => {
  const root = writeTree(scratchDir('require-all-'), conformanceTree({ pairs: { 'pocket-z3': stubPair({ ok: true, compared: 3, equal: 3 }) } }));
  const engines = { cacheDir: root, native: async () => standInEngine('native'), pyodide: async () => standInEngine('pyodide') };
  const ok = await gate(['--root', root, '--only', 'pocket-z3'], { engines });
  assert.equal(ok.code, 0, ok.text);
  assert.match(ok.text, /held +pocket-z3/);
  assert.match(ok.text, /3 of 3 equal/);
  const all = await gate(['--root', root, '--require-all'], { engines });
  assert.equal(all.code, 1);
  assert.match(all.text, /spectacle-tlc: scripts\/conformance\/spectacle-tlc\.mjs does not exist, and this run requires the pair \(built by W3-T08\)/);
  assert.ok(!all.text.includes('pocket-z3: scripts/conformance/pocket-z3.mjs does not exist'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('--json prints one object: the verdict, the claims, a row per pair, the findings', async () => {
  const root = writeTree(scratchDir('json-'), conformanceTree());
  const r = await gate(['--root', root, '--json', '--only', 'pocket-z3,lasso-tlc'], { engines: { cacheDir: root, native: async () => standInEngine('native'), pyodide: async () => standInEngine('pyodide') } });
  assert.equal(r.code, 0);
  const doc = JSON.parse(r.text);
  assert.equal(doc.gate, 'GATE-conformance');
  assert.equal(doc.result, 'pass');
  assert.deepEqual(doc.claims, ['SEAM-13']);
  assert.deepEqual(doc.pairs.map((p) => [p.id, p.state, p.builtBy]), [['pocket-z3', 'absent', 'W1-T19'], ['lasso-tlc', 'absent', 'W3-T09']]);
  fs.rmSync(root, { recursive: true, force: true });
});

test('every planted fault of the self-check trips the gate and every control passes', async () => {
  const lines = [];
  const code = await selfCheckConformance({ say: (l) => lines.push(l) });
  assert.equal(code, 0, lines.filter((l) => l.includes('FAIL')).join('\n'));
  assert.ok(lines.filter((l) => l.includes('planted:')).length >= 14);
  assert.ok(lines.filter((l) => l.includes('control:')).length >= 4);
});

test('Pyodide Z3 = native Z3 on this repository: every query agrees, the recipient wrap included', { skip: skipEngines }, async () => {
  const r = await gate([]);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /held +z3-same-query/);
  assert.match(r.text, /11 of 11 queries equal/);
  assert.match(r.text, /bv64-recipient-wrap +SP-1\.4 +sat +sat +valid on both/);
  assert.match(r.text, /unknown-pow .* +unknown +unknown +reason: smt tactic failed/);
  assert.match(r.text, /GATE-conformance: PASS/);
});
