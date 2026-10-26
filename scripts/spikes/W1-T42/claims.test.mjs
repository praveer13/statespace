// Tests of content/assurance/gate-claims.json and of what a red night does with it (lib/gate-claims.mjs; the lane runner
// scripts/spikes/W0-T04/lane.mjs). The last test is the acceptance item "a planted red night downgrades its claim in
// status/nightly.json": the real lane, the real gate scripts and the real claims file, on a scratch tree in which
// GATE-specimens and GATE-conformance go red on a planted fault, stay red, and turn green again.
// Run: node --test scripts/spikes/W1-T42/claims.test.mjs
//
// The red-night test runs the native engine once per night (well under a second once it is cached); W1T42_NO_ENGINES=1 skips it.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REPO } from './lib/engines.mjs';
import { miniRegistry, scratchDir, stubPair, writeTree } from './lib/fixtures.mjs';
import { GATE_CLAIMS_FILE, SPINE_NAMED, loadGateClaims, readIdKinds } from './lib/gate-claims.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LANE = path.join(HERE, '..', 'W0-T04', 'lane.mjs');
const skipEngines = process.env.W1T42_NO_ENGINES === '1' ? 'W1T42_NO_ENGINES=1' : false;
const realClaims = () => fs.readFileSync(path.join(REPO, GATE_CLAIMS_FILE), 'utf8');

test('the claims file of this repository is valid, and backs what the spine names', () => {
  const { map, problems } = loadGateClaims(REPO);
  assert.deepEqual(problems, []);
  assert.deepEqual(map['GATE-interp'], ['SEAM-13'], 'ARCHITECTURE.md 13.4: GATE-interp backs SEAM-13');
  for (const [gate, claims] of Object.entries(SPINE_NAMED)) for (const claim of claims) assert.ok(map[gate].includes(claim), `${gate} backs ${claim}`);
});

test('the file has the one shape the nightly lane reads: an object of lists of strings', () => {
  const map = JSON.parse(realClaims());
  assert.ok(map && typeof map === 'object' && !Array.isArray(map));
  for (const [gate, claims] of Object.entries(map)) {
    assert.match(gate, /^GATE-[a-z0-9-]+$/);
    assert.ok(Array.isArray(claims) && claims.length > 0 && claims.every((c) => typeof c === 'string'), gate);
  }
});

test('every gate in the file is a registered gate and every claim a registered ID', () => {
  const { kinds, readable } = readIdKinds(REPO);
  assert.ok(readable);
  const map = JSON.parse(realClaims());
  for (const [gate, claims] of Object.entries(map)) {
    assert.equal(kinds.get(gate), 'gate', `${gate} is a gate`);
    for (const claim of claims) assert.equal(kinds.get(claim), 'seam', `${claim} is a seam of spine 5.3`);
  }
});

test('the checks refuse a malformed file, an unregistered gate or claim, a repeated claim, and a missing spine mapping', () => {
  const check = (claims) => loadGateClaims(writeTree(scratchDir('claims-'), { 'packages/ids/src/registry.json': miniRegistry(), [GATE_CLAIMS_FILE]: claims })).problems;
  assert.deepEqual(check({ 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] }), []);
  assert.deepEqual(check({ 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'], 'GATE-nonsense': ['SEAM-13'] }).length, 1);
  assert.match(check({ 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14', 'SEAM-77'] })[0], /SEAM-77.*does not register/);
  assert.match(check({ 'GATE-interp': ['SEAM-13', 'SEAM-13'], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] })[0], /twice/);
  assert.match(check({ 'GATE-interp': [], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] }).join('\n'), /lists no claim/);
  assert.match(check({ 'GATE-interp': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] })[0], /GATE-conformance must back SEAM-13/);
  assert.match(check(['SEAM-13'])[0], /must be one object/);
  assert.match(check({ 'GATE-interp': 'SEAM-13' })[0], /must be one object/);
  const root = writeTree(scratchDir('claims-bad-'), { 'packages/ids/src/registry.json': miniRegistry(), [GATE_CLAIMS_FILE]: '{ not json' });
  assert.match(loadGateClaims(root).problems[0], /is not JSON/);
  assert.match(loadGateClaims(scratchDir('claims-none-')).problems[0], /does not exist/);
});

test('an ID that packages/ids/proposals.json holds counts as registered, so a new course claim can be backed before the spine registers it', () => {
  const root = writeTree(scratchDir('claims-proposed-'), {
    'packages/ids/src/registry.json': miniRegistry(),
    'packages/ids/proposals.json': { proposals: [{ id: 'SEAM-99', proposedBy: 'W5-T08' }] },
    [GATE_CLAIMS_FILE]: { 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13', 'SEAM-99'], 'GATE-specimens': ['SEAM-14'] },
  });
  assert.deepEqual(loadGateClaims(root).problems, []);
});

// ---------------------------------------------------------------- the planted red night
const REAL_PY = ['import z3', 'x = z3.Int("x")', 's = z3.Solver()', 's.add(x * x == 49, x > 0)', 'print("[q1]", s.check(), s.model())', ''].join('\n');
const record = (lines) => ({
  id: 'RUN-fx-real',
  title: 'a planted run',
  engine: 'z3',
  version: '5.3.1',
  binary: 'fixture',
  binary_sha256: null,
  image: null,
  recorded_at: '2026-10-25T00:00:00Z',
  started_at: null,
  duration_s: null,
  argv: null,
  inputs: [{ path: 'runs/inputs/fx/a.py', sha256: 'x', bytes: 1, role: 'script' }],
  budget: {},
  exit_code: null,
  verdict_lines: lines,
  outputs: [],
  environment: {},
  notes: [],
});

function plantedRoot() {
  const root = writeTree(scratchDir('red-night-'), {
    'docs/spine/SPINE.md': ['| ID | Specimen | Lesson | Status |', '|---|---|---|---|', '| SP-1.1 | a planted specimen | S1.L1 | [X RUN-fx-real] |', ''].join('\n'),
    'packages/ids/src/registry.json': miniRegistry(),
    [GATE_CLAIMS_FILE]: realClaims(),
    'runs/inputs/fx/a.py': REAL_PY,
    'runs/RUN-fx-real.json': record(['[q1] unsat']),
    'scripts/conformance/pocket-z3.mjs': stubPair({ pair: 'pocket-z3', ok: false, compared: 40, equal: 39, differences: [{ fixture: 'p17', expected: 'sat', got: 'unsat' }] }, 1),
  });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  for (const name of ['verify-specimens.mjs', 'verify-conformance.mjs']) fs.symlinkSync(path.join(REPO, 'scripts', name), path.join(root, 'scripts', name));
  const gate = (id, script, args) => ({ id, kind: 'gate', script, built_by: 'W1-T42', lanes: { nightly: { args: ['--root', root, ...args] } } });
  fs.writeFileSync(
    path.join(root, 'gates.json'),
    JSON.stringify({
      format: 'lane-manifest/1',
      lanes: { fast: { step_timeout_s: 60, budget_s: 300 }, nightly: { step_timeout_s: 120 }, release: { step_timeout_s: 60 }, monthly: { step_timeout_s: 60 } },
      steps: [gate('GATE-conformance', 'scripts/verify-conformance.mjs', ['--only', 'pocket-z3']), gate('GATE-specimens', 'scripts/verify-specimens.mjs', [])],
    }),
  );
  return root;
}

function night(root, date, previous) {
  const status = path.join(root, 'status', `${date}.json`);
  const args = [LANE, 'nightly', '--root', root, '--manifest', path.join(root, 'gates.json'), '--status', status, '--now', `${date}T02:23:00Z`, ...(previous ? ['--previous', previous] : [])];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: process.env, timeout: 240000 });
  return { code: r.status, out: r.stdout + r.stderr, status: JSON.parse(fs.readFileSync(status, 'utf8')), file: status };
}

/** A claim is unverified from the earliest night any gate that backs it went red: what the site renders from the status. */
const unverified = (status) => {
  const claims = {};
  for (const f of status.failed) for (const c of f.claims) if (!claims[c] || f.since < claims[c].since) claims[c] = { since: f.since, gate: f.gate };
  return claims;
};

test('a planted red night downgrades the claims it touches in status/nightly.json, keeps them downgraded since the first red night, and a green night clears them', { skip: skipEngines }, () => {
  const root = plantedRoot();
  try {
    // Night 1: a recorded line no longer reproduces, and a pair differs.
    const one = night(root, '2026-10-26');
    assert.equal(one.code, 1, one.out);
    assert.equal(one.status.schema, 'statespace/nightly-status@1');
    assert.equal(one.status.result, 'red');
    assert.deepEqual(one.status.failed.map((f) => [f.gate, f.result, f.since, f.claims]), [
      ['GATE-conformance', 'fail', '2026-10-26', ['SEAM-13']],
      ['GATE-specimens', 'fail', '2026-10-26', ['SEAM-14']],
    ]);
    assert.equal(one.status.claims_source, 'content/assurance/gate-claims.json');
    assert.deepEqual(unverified(one.status), { 'SEAM-13': { since: '2026-10-26', gate: 'GATE-conformance' }, 'SEAM-14': { since: '2026-10-26', gate: 'GATE-specimens' } });
    assert.match(one.status.gates.find((g) => g.id === 'GATE-specimens').verdict, /^GATE-specimens: FAIL/);
    assert.match(one.status.gates.find((g) => g.id === 'GATE-conformance').verdict, /^GATE-conformance: FAIL/);

    // Night 2: still red, so the claims keep the date of the first red night.
    const two = night(root, '2026-10-27', one.file);
    assert.deepEqual(unverified(two.status), { 'SEAM-13': { since: '2026-10-26', gate: 'GATE-conformance' }, 'SEAM-14': { since: '2026-10-26', gate: 'GATE-specimens' } });
    assert.equal(two.status.red_since, '2026-10-26');

    // Night 3: the pair is repaired; only the claim that GATE-specimens backs stays unverified.
    fs.writeFileSync(path.join(root, 'scripts/conformance/pocket-z3.mjs'), stubPair({ pair: 'pocket-z3', ok: true, compared: 40, equal: 40 }));
    const three = night(root, '2026-10-28', two.file);
    assert.deepEqual(unverified(three.status), { 'SEAM-14': { since: '2026-10-26', gate: 'GATE-specimens' } });

    // Night 4: the run is re-recorded as the engine prints it; nothing is red and no claim is downgraded.
    fs.writeFileSync(path.join(root, 'runs/RUN-fx-real.json'), `${JSON.stringify(record(['[q1] sat [x = 7]']), null, 2)}\n`);
    const four = night(root, '2026-10-29', three.file);
    assert.equal(four.code, 0, four.out);
    assert.equal(four.status.result, 'green');
    assert.deepEqual(four.status.failed, []);
    assert.deepEqual(unverified(four.status), {});
    assert.equal(four.status.red_since, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a claims file with a mistyped gate ID turns the gates that back claims red, naming the file (the lane alone would accept it and downgrade nothing for the typo)', { skip: skipEngines }, () => {
  const root = plantedRoot();
  try {
    fs.writeFileSync(path.join(root, 'scripts/conformance/pocket-z3.mjs'), stubPair({ pair: 'pocket-z3', ok: true, compared: 1, equal: 1 }));
    fs.writeFileSync(path.join(root, 'runs/RUN-fx-real.json'), `${JSON.stringify(record(['[q1] sat [x = 7]']), null, 2)}\n`);
    assert.equal(night(root, '2026-10-26').code, 0);
    // A claims file that names a gate the spine does not register: both gates go red, naming the file.
    fs.writeFileSync(path.join(root, GATE_CLAIMS_FILE), JSON.stringify({ 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'], 'GATE-specimen': ['SEAM-14'] }));
    const bad = night(root, '2026-10-27');
    assert.equal(bad.code, 1);
    assert.deepEqual(bad.status.failed.map((f) => f.gate), ['GATE-conformance', 'GATE-specimens']);
    assert.match(bad.out, /"GATE-specimen" is not a registered gate ID/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
