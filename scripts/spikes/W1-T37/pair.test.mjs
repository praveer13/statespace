// W1-T37: GATE-conformance's pair "Pyodide Z3 = native Z3" (scripts/conformance/z3-pyodide-native.mjs) on trees with
// authored cells and with a Z3 family, and through GATE-conformance's own runner.
//   node --test scripts/spikes/W1-T37/pair.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { REPO } from './lib/engines.mjs';
import { S1_FIXTURES } from './lib/planted.mjs';

const PAIR = path.join(REPO, 'scripts', 'conformance', 'z3-pyodide-native.mjs');
const { runPair } = await import(pathToFileURL(PAIR).href);

const scratch = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-pair-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

/** A family in the tree that keys a bound through z3 ({smtlib} requests), and one whose key throws. */
function writeFamily(root, slug, body) {
  const dir = path.join(root, 'packages', 'generators', 'src', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
  fs.writeFileSync(path.join(dir, 'index.ts'), body);
}
const family = (id, key) => `export const generator = {
  id: '${id}',
  templates: [{ id: 't1', name: 'bound', kcs: { primary: 'KC-1.violation-as-sat' }, bands: { 1: {}, 2: {}, 3: {} } }],
  engines: ['z3'],
  make: (seed: number, band: number, template: string) => ({ family: '${id}', template, band, seed, kcs: { primary: 'KC-1.violation-as-sat' }, item: { stem: '', parts: [] }, data: { k: seed % 5 } }),
  key: ${key},
};
`;

test('the S1 authored cells as content: every cell compared, all equal', async () => {
  const r = await runPair({ root: S1_FIXTURES, seeds: 1 });
  assert.equal(r.exit, 0, JSON.stringify(r.report?.differences));
  assert.equal(r.report.pair, 'z3-pyodide-native');
  assert.equal(r.report.compared, 15);
  assert.equal(r.report.equal, 15);
  assert.ok(r.report.notes.some((n) => /12 call\(s\)/.test(n)));
});

test("the verification rounds' probes (fixtures/probes): several queries in an SMT-LIB cell, bit-vector optima, quantified models and error lines agree on both engines", async () => {
  const r = await runPair({ root: path.join(path.dirname(S1_FIXTURES), 'probes'), seeds: 1 });
  assert.equal(r.exit, 0, JSON.stringify(r.report?.differences));
  assert.equal(r.report.compared, 17);
  assert.equal(r.report.equal, 17);
});

test('a --root that names no directory is a usage error (exit 2), not a tree with nothing to compare', () => {
  const r = spawnSync(process.execPath, [PAIR, '--root', path.join(os.tmpdir(), 'no-such-tree-w1t37'), '--json'], { cwd: REPO, encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--root names no directory/);
  assert.equal(r.stdout, '');
});

test('a Z3 family is keyed through both engines, request by request; a family that cannot be keyed is a difference', async (t) => {
  const root = scratch(t);
  writeFamily(root, 'port-ok', family('GEN-port-ok', `async (inst: any, port: any) => {
    const r = await port.run({ engine: 'z3', version: '5.3.1', input: { smtlib: '(declare-const x Int)(assert (> x ' + inst.data.k + '))(assert (< x ' + (2 * inst.data.k) + '))' }, budget: { wallMs: 30000, rlimit: 5000000 } });
    return { verdict: r.verdict.kind };
  }`));
  const ok = await runPair({ root, seeds: 2 });
  assert.equal(ok.exit, 0, JSON.stringify(ok.report?.differences));
  assert.equal(ok.report.compared, 6, 'one request per instance: 2 seeds in each of 3 bands');
  assert.equal(ok.report.equal, 6);
  writeFamily(root, 'port-bad', family('GEN-port-bad', `async (inst: any, port: any) => port.run({ engine: 'z3', version: '5.3.1', input: { smtlib: '(assert (> undeclared 1))' }, budget: { wallMs: 30000 } })`));
  const bad = await runPair({ root, seeds: 1 });
  assert.equal(bad.exit, 1);
  assert.ok(bad.report.differences.some((d) => /^GEN-port-bad\/t1\/b1\//.test(d.fixture) && /invalid-input/.test(d.got)), JSON.stringify(bad.report.differences));
});

test('a family that also consults an engine the pair does not run is left to GATE-generators, and said so', async (t) => {
  const root = scratch(t);
  writeFamily(root, 'mixed', family('GEN-mixed', 'async () => ({ verdict: "sat" })').replace("engines: ['z3']", "engines: ['z3', 'pglite']"));
  const r = await runPair({ root, seeds: 1 });
  assert.equal(r.exit, 0);
  assert.ok(r.report.notes.some((n) => /GEN-mixed also consults pglite/.test(n)));
});

test("GATE-conformance runs the pair by its protocol and reads it as held", () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'verify-conformance.mjs'), '--only', 'z3-pyodide-native', '--json'], { cwd: REPO, encoding: 'utf8', timeout: 300000 });
  assert.equal(r.status, 0, r.stderr || r.stdout.slice(-1500));
  const report = JSON.parse(r.stdout);
  const pair = report.pairs.find((p) => p.id === 'z3-pyodide-native');
  assert.equal(pair.state, 'held');
});
