// The lane manifest (gates.json) against the documents it implements: the spine's gate table, its ID registry and the tracker.
// Run: node --test scripts/spikes/W0-T04/lane-manifest.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './lane.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'gates.json'), 'utf8'));
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const gates = manifest.steps.filter((s) => s.kind === 'gate');

test('the manifest is valid', () => {
  assert.deepEqual(validateManifest(manifest), []);
});

test('it lists exactly the gates of the spine, as the generated ID registry has them', () => {
  const registry = JSON.parse(read('packages/ids/src/registry.json'));
  const spine = registry.entries.filter((e) => e.kind === 'gate').map((e) => e.id).sort();
  assert.ok(spine.length >= 29, 'the registry should hold the 29 gates of spine section 11.2');
  assert.deepEqual(gates.map((g) => g.id).sort(), spine, 'a gate added to or removed from the spine needs its row here');
});

test('every lane the spine names for a gate runs it', () => {
  const rows = new Map();
  for (const line of read('docs/spine/SPINE.md').split('\n')) {
    const m = /^\| (GATE-[a-z0-9-]+) \| .* \| ([^|]*) \|$/.exec(line);
    if (m) rows.set(m[1], m[2]);
  }
  assert.ok(rows.size >= 29, `read ${rows.size} rows of the gate table`);
  for (const g of gates) {
    const named = rows.get(g.id);
    assert.ok(named !== undefined, `${g.id} has a row in spine section 11.2`);
    for (const lane of ['fast', 'nightly', 'release']) {
      if (named.includes(lane)) assert.ok(g.lanes[lane], `${g.id}: the spine names the ${lane} lane, and the manifest does not run it there`);
    }
  }
});

test('the spine says GATE-labs also runs monthly, and the manifest runs it there', () => {
  assert.match(read('docs/spine/SPINE.md'), /\| GATE-labs \|[^\n]*monthly also on the newest stable Lean/);
  assert.ok(gates.find((g) => g.id === 'GATE-labs').lanes.monthly);
});

test('every gate that runs in the fast lane also runs in the nightly lane, so a green night means every gate was green', () => {
  for (const g of gates) if (g.lanes.fast) assert.ok(g.lanes.nightly, `${g.id} runs in the fast lane and not in the nightly one`);
});

test('GATE-release is the one step the release lane requires, and nothing else is required anywhere', () => {
  const required = [];
  for (const s of manifest.steps) for (const [lane, cfg] of Object.entries(s.lanes)) if (cfg.required) required.push(`${s.id}@${lane}`);
  assert.deepEqual(required, ['GATE-release@release']);
});

test('each gate script names a task that the tracker has, and that task lists the script as a deliverable', () => {
  const tracker = read('tracker/tasks.yaml');
  const blocks = new Map();
  const starts = [...tracker.matchAll(/^ {2}- id: (W[0-9]-[ST][0-9]+)$/gm)];
  for (const [i, m] of starts.entries()) blocks.set(m[1], tracker.slice(m.index, starts[i + 1]?.index ?? tracker.length));
  for (const g of gates) {
    if (g.built_by === null) continue;
    assert.ok(blocks.has(g.built_by), `${g.id}: ${g.built_by} is not a task in tracker/tasks.yaml`);
    assert.ok(blocks.get(g.built_by).includes(`"${g.script}"`), `${g.id}: ${g.built_by} does not list ${g.script} among its deliverables`);
  }
});

test('every gate names the task that builds it, and a gate without one would say so in its note', () => {
  const unowned = gates.filter((g) => g.built_by === null);
  assert.deepEqual(unowned.map((g) => g.id), [], 'since spine revision 3 every gate has a builder (GATE-coverage: W1-T04)');
  for (const g of unowned) assert.match(g.note ?? '', /tracker names no task/);
});

test('the privacy gate turns strict where the CI secrets exist, and always in the release lane', () => {
  const privacy = gates.find((g) => g.id === 'GATE-privacy');
  assert.deepEqual(privacy.lanes.fast.args_if_env, { STATESPACE_PRIVACY_TERMS: ['--strict'] });
  assert.deepEqual(privacy.lanes.nightly.args_if_env, { STATESPACE_PRIVACY_TERMS: ['--strict'] });
  assert.deepEqual(privacy.lanes.release.args, ['--strict']);
});

test('the fast lane has a budget of 300 seconds, as spine section 11.2 says', () => {
  assert.equal(manifest.lanes.fast.budget_s, 300);
  assert.match(read('docs/spine/SPINE.md'), /Fast lane: under 5 minutes, blocks merges/);
});

test('lane-tests names every test file of this folder, so a deleted or renamed file cannot pass unseen', () => {
  const step = manifest.steps.find((s) => s.id === 'lane-tests');
  const listed = step.argv.filter((a) => a.endsWith('.test.mjs')).map((a) => path.basename(a)).sort();
  const onDisk = fs.readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();
  assert.deepEqual(listed, onDisk);
});
