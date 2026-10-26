// Tests of the specimen@1 fixtures (W1-T16): that the committed files are what make-schema-fixtures.mjs writes, that every
// valid one passes and every invalid one fails on the keyword and the instance path its index gives, and that the faults
// that matter most (a label typed by hand) are among them. GATE-schema runs the same files through the generated validators
// in TypeScript and Python; this is the fast check of the files beside the generator.
//
//   node --test scripts/spikes/W1-T16/fixtures.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validate } from '../../../packages/schema/src/index.ts';
import { REPO } from '../../runs/registry.mjs';

const DIR = path.join(REPO, 'schemas', 'fixtures', 'specimen');
const SCRIPT = path.join(REPO, 'scripts', 'spikes', 'W1-T16', 'make-schema-fixtures.mjs');
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const list = (dir) => fs.readdirSync(dir).sort();

test('the committed fixtures are what make-schema-fixtures.mjs writes, and the generator refuses what it does not know', () => {
  const ok = spawnSync(process.execPath, [SCRIPT, '--check'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  const bad = spawnSync(process.execPath, [SCRIPT, '--frobnicate'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown argument --frobnicate/);
  const both = spawnSync(process.execPath, [SCRIPT, '--check', '--out', '.'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(both.status, 2, '--check writes nothing, so --out does not go with it');
});

test('every valid fixture is specimen@1, and the valid ones cover a course specimen, a verdict, a premise query, a dated incident and a learner\'s lab specimen', () => {
  const files = list(path.join(DIR, 'valid')).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 6);
  for (const f of files) {
    const result = validate('specimen', json(path.join(DIR, 'valid', f)));
    assert.deepEqual(result, { ok: true }, `${f}: ${JSON.stringify(result)}`);
  }
  const records = files.map((f) => json(path.join(DIR, 'valid', f)));
  assert.ok(records.some((r) => r.incident !== undefined), 'a dated incident');
  assert.ok(records.some((r) => r.evidence.main.direction === 'premise'), 'a premise query');
  assert.ok(records.some((r) => r.evidence.minimal.kind === 'core'), 'an unsat core');
  assert.ok(records.some((r) => r.evidence.minimal.kind === 'optimize'), 'an Optimize minimum');
  assert.ok(records.some((r) => r.evidence.minimal.kind === 'not-applicable'), 'a verdict');
  assert.ok(records.some((r) => r.found_in.lab_stage !== undefined && r.mount === undefined), 'a learner\'s lab specimen, which has no mount rule');
  assert.ok(fs.existsSync(path.join(DIR, 'valid', 'learner-lab-specimen.yaml')), 'the lab repository holds specimens as YAML');
});

test('every invalid fixture is listed in the index, and fails on the keyword and at the instance path the index gives', () => {
  const index = json(path.join(DIR, 'invalid', 'index.json'));
  const files = list(path.join(DIR, 'invalid')).filter((f) => f !== 'index.json');
  assert.deepEqual(index.map((e) => e.file).sort(), files, 'the index lists every file and nothing else');
  assert.equal(new Set(index.map((e) => e.file)).size, index.length);
  assert.ok(index.length >= 50, 'a fault for each constraint of the schema, not a handful');
  for (const { file, keyword, instancePath } of index) {
    const result = validate('specimen', json(path.join(DIR, 'invalid', file)));
    assert.equal(result.ok, false, `${file} is valid`);
    assert.ok(result.issues.some((i) => i.keyword === keyword && i.instancePath === instancePath), `${file}: expected ${keyword} at ${JSON.stringify(instancePath)}, got ${result.issues.map((i) => `${i.keyword} at ${JSON.stringify(i.instancePath)}`).join('; ')}`);
  }
});

test('a label typed by hand is refused: a stamp, a tool version, a witness, a date or a status in a record, and a model or an engine in a query pointer', () => {
  const index = json(path.join(DIR, 'invalid', 'index.json'));
  const by = new Map(index.map((e) => [e.file, e]));
  for (const file of ['stamp-typed-into-record', 'tool-version-typed-into-record', 'witness-typed-into-record', 'date-typed-into-record', 'status-stored-in-record', 'model-typed-into-main', 'engine-typed-into-main', 'incident-with-exploit-field']) {
    assert.equal(by.get(`${file}.json`)?.keyword, 'additionalProperties', file);
  }
  // a source that is not https, and a text with a line break, are refused by pattern
  assert.equal(by.get('incident-source-not-https.json')?.keyword, 'pattern');
  assert.equal(by.get('title-with-a-line-break.json')?.keyword, 'pattern');
  assert.equal(by.get('id-trailing-newline.json')?.keyword, 'pattern');
});

test('the records of content/specimens/ are specimen@1', () => {
  const dir = path.join(REPO, 'content', 'specimens');
  const files = list(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 10);
  for (const f of files) {
    const result = validate('specimen', json(path.join(dir, f)));
    assert.deepEqual(result, { ok: true }, `${f}: ${JSON.stringify(result)}`);
  }
});
