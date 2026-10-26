// W1-T37: every weakened copy of GATE-calls (weakenings.mjs) must fail its own self-check, so no rule of the gate can
// be removed or loosened while the planted fixtures stay green.
//   node --test scripts/spikes/W1-T37/weakenings.test.mjs      (several minutes: each copy starts both engines)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildMirror, runAll, WEAKENINGS } from './weakenings.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('each weakening changes exactly one place of the gate it names', () => {
  for (const w of WEAKENINGS) {
    const { root } = buildMirror(w);
    fs.rmSync(root, { recursive: true, force: true });
  }
  const names = new Set(WEAKENINGS.map((w) => w.name));
  assert.equal(names.size, WEAKENINGS.length, 'names are unique');
  for (const w of WEAKENINGS) assert.ok(fs.existsSync(path.join(HERE, w.file)), w.file);
});

test('the self-check of every weakened copy fails', { timeout: 30 * 60 * 1000 }, async () => {
  const results = await runAll(WEAKENINGS, 3);
  const missed = results.filter((r) => !r.caught);
  assert.deepEqual(missed.map((r) => `${r.name} (exit ${r.status}): ${r.tail}`), []);
  assert.equal(results.length, WEAKENINGS.length);
});
