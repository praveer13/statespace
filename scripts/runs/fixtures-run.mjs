#!/usr/bin/env node
// Write the run@1 fixtures, schemas/fixtures/run/valid/ and invalid/ with invalid/index.json (W0-S11).
//
//   node scripts/runs/fixtures-run.mjs
//
// GATE-schema reads them (schemas/README.md section 5). Each invalid fixture is a valid one with one fault,
// and index.json names the keyword and path both validators must report. The hashes of files in research/
// and of the pinned jars are real; the fixtures' own output files under runs/ are fictional, and their
// hashes (LOG_SHA) are placeholders, since schema validation reads no file.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const dir = path.join(root, 'schemas', 'fixtures', 'run');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.join(dir, 'valid'), { recursive: true });
fs.mkdirSync(path.join(dir, 'invalid'), { recursive: true });
const write = (sub, name, doc) => fs.writeFileSync(path.join(dir, sub, name), JSON.stringify(doc, null, 2) + '\n');
const TLA180 = '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2';
const TLA174 = '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88';
const DS_TLA = '2dd02b13ef0381398044662e06ab3dd74083a2bdfd5d4eb32722721339c3bc97';
const DS_CFG = '8f509a37e9582f12b8097df139697600c35b7ddab2a904990bb5c166b4babc69';
const TEMURIN = 'eclipse-temurin:21-jre@sha256:227118764cccd3c3294617061aaa93a08309c63a395eefa83e6b35032992ea99';
const LOG_SHA = 'c0b5b1a6d5a3a0a8f4b3a7d76c1d0b6a2b0e8c5f9e1d2c3b4a5968778695a4b3';

// A recorded run with two configurations, in the shape every W0 record uses.
const recorded = {
  id: 'RUN-tlc-doublespend-fixture',
  title: 'DoubleSpend with default flags and with -deadlock, on the 1.8.0 jar',
  task: 'W0-S11',
  origin: 'recorded',
  engine: 'tlc',
  version: '2026.10.20.183001',
  version_string: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
  binary: 'tla2tools.jar of the 1.8.0 pre-release',
  binary_sha256: TLA180,
  image: TEMURIN,
  recorded_at: '2026-10-24T14:00:05.120Z',
  started_at: '2026-10-24T14:00:00.000Z',
  duration_s: 2.5,
  argv: ['docker', 'run', '--rm', '--memory=6g', '--network', 'none', TEMURIN, 'java', '-jar', '/t/tla2tools.jar', '-workers', '1', '-config', 'DoubleSpend.cfg', 'DoubleSpend.tla'],
  inputs: [
    { path: 'research/spikes/tla/DoubleSpend.tla', sha256: DS_TLA, bytes: 1105, role: 'spec' },
    { path: 'research/spikes/tla/DoubleSpend.cfg', sha256: DS_CFG, bytes: 97, role: 'config' },
    { url: 'https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar', file: 'tla2tools.jar', sha256: TLA180 },
  ],
  budget: { workers: 1, container_memory: '6g', network: 'none' },
  exit_code: 11,
  verdict_lines: ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.', 'The depth of the complete state graph search is 4.'],
  outputs: [{ path: 'runs/RUN-tlc-doublespend-fixture/default.log', sha256: LOG_SHA, bytes: 1581, kind: 'log' }],
  values: { distinct_states: 10, depth: 4 },
  environment: { os: 'Linux 6.12.63', cpu_count: 20, ram_gib: 31, cpu_architecture: 'x86_64', container: { memory: '6g' } },
  primary_config: 'default',
  configs: [
    { id: 'default', purpose: 'default flags: deadlock checking on', argv: ['-workers', '1'], exit_code: 11, verdict_lines: ['Error: Deadlock reached.'], outputs: ['runs/RUN-tlc-doublespend-fixture/default.log'] },
    { id: 'deadlock-off', purpose: '-deadlock turns deadlock checking off', argv: ['-workers', '1', '-deadlock'], exit_code: 12, started_at: '2026-10-24T14:00:02.000Z', duration_s: 1.1, verdict_lines: ['Error: Invariant NoOverspend is violated.'], outputs: [{ path: 'runs/RUN-tlc-doublespend-fixture/deadlock-off.log', sha256: LOG_SHA, bytes: 1786 }] },
    { id: 'jar-1.7.4-hashed', purpose: 'the fallback jar, hashed and not run', argv: [], binary_sha256: TLA174 },
  ],
  checks: [{ id: 'counts-match-1.7.4', pass: true }],
  pass: true,
  notes: ['A fixture in the shape of a recorded run; its counts follow RUN-tlc-doublespend and its exit codes RUN-tlc-atomic and RUN-tlc-unsafe-3w (11 at a deadlock, 12 at a violated invariant).'],
};
write('valid', 'recorded-with-configs.json', recorded);

// An imported run: executed earlier, registered from a log in research/, with every null field explained.
const imported = {
  id: 'RUN-z3-starter-fixture',
  title: 'The roadmap starter on Z3 5.3.1: sat, then unsat once the guard is added',
  task: 'W0-S11',
  origin: 'imported',
  records: 'Z3 5.3.1: the roadmap starter gives sat [b = 0, amount = 1, a = 0], then unsat',
  engine: 'z3',
  version: '5.3.1',
  binary: 'z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl',
  binary_sha256: null,
  image: null,
  recorded_at: '2026-10-24T14:30:00Z',
  started_at: '2026-10-20',
  duration_s: null,
  argv: null,
  inputs: [{ path: 'research/evidence/a2r3/scripts/z3_claims.py', sha256: 'a558596e31782a8d3f0dc3a2062cb7cb713d71a93417d453b0818b6434cc592d', bytes: 3651, role: 'script' }],
  budget: {},
  exit_code: null,
  verdict_lines: ['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]', '[1.3 guard added] unsat (0.00s) '],
  outputs: [{ path: 'research/evidence/a2r3/out/z3_5.3.1.txt', sha256: '21b93295b35ad28621cf6f28f87ded8bb64a20b4182cb7696b6e00d7d01aa4be', bytes: 1257, kind: 'log' }],
  environment: { os: null, cpu_count: null },
  unrecorded: [
    { field: 'argv', reason: 'the log records the script output only; the script header gives the usage line' },
    { field: 'binary_sha256', reason: 'uv installed the wheel without logging its hash' },
    { field: 'image', reason: 'the run used no container' },
    { field: 'duration_s', reason: 'not logged' },
    { field: 'exit_code', reason: 'not logged' },
    { field: 'environment.os', reason: 'not logged' },
    { field: 'environment.cpu_count', reason: 'not logged' },
  ],
  notes: ['A fixture in the shape of an imported run.'],
};
write('valid', 'imported-with-unrecorded.json', imported);

// A browser run: image is the pinned Playwright image, with checks, a TTL and a placeholder path.
const browser = {
  id: 'RUN-browser-fixture',
  title: 'A module worker on a separate origin runs Z3 in three engines',
  engine: 'chromium',
  version: '153.0.8010.12',
  binary: null,
  binary_sha256: null,
  image: 'mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27',
  recorded_at: '2026-10-24T15:00:00+01:00',
  started_at: '2026-10-24T13:59:00Z',
  duration_s: 40,
  argv: ['node', 'harness.mjs'],
  inputs: [{ path: '<sandbox>/site/index.html', sha256: DS_CFG }, { path: 'scripts/runs/', sha256: DS_TLA, sha256_method: 'manifest of sorted file hashes' }, { name: 'pyodide.mjs', sha256: DS_TLA }],
  budget: { timeout_s: 120, rlimit: 5000000 },
  exit_code: 0,
  verdict_lines: ['chromium {"readyMs":1458,"z3":"5.3.1 sat [b = 0, amount = 1, a = 0]"}'],
  outputs: [{ path: 'runs/RUN-browser-fixture/report.json', sha256: LOG_SHA, bytes: 3574, kind: 'report', compare: 'exact' }],
  environment: { os: 'Linux 6.12.63', cpu_count: 20, ram_gib: 31, container: null, emulated: 'no' },
  checks: [{ id: 'parent-storage-blocked', pass: true, detail: 'SecurityError' }],
  pass: true,
  ttl_days: 60,
  notes: ['A fixture in the shape of a browser run.'],
};
write('valid', 'browser-with-checks.json', browser);

const index = [];
const bad = (file, base, mutate, instancePath, keyword) => {
  const doc = structuredClone(base);
  mutate(doc);
  write('invalid', file, doc);
  index.push({ file, instancePath, keyword });
};
bad('id-not-kebab.json', recorded, (d) => { d.id = 'RUN_tlc_doublespend'; }, '/id', 'pattern');
bad('id-trailing-newline.json', recorded, (d) => { d.id = 'RUN-tlc-doublespend\n'; }, '/id', 'pattern');
bad('missing-outputs.json', recorded, (d) => { delete d.outputs; }, '', 'required');
bad('missing-recorded-at.json', recorded, (d) => { delete d.recorded_at; }, '', 'required');
bad('argv-empty.json', recorded, (d) => { d.argv = []; }, '/argv', 'anyOf');
bad('argv-string.json', recorded, (d) => { d.argv = 'java -jar tla2tools.jar'; }, '/argv', 'anyOf');
bad('binary-sha-short.json', recorded, (d) => { d.binary_sha256 = 'abc123'; }, '/binary_sha256', 'anyOf');
bad('started-at-words.json', recorded, (d) => { d.started_at = 'yesterday'; }, '/started_at', 'anyOf');
bad('recorded-at-date-only.json', recorded, (d) => { d.recorded_at = '2026-10-24'; }, '/recorded_at', 'pattern');
bad('duration-negative.json', recorded, (d) => { d.duration_s = -1; }, '/duration_s', 'minimum');
bad('exit-code-fraction.json', recorded, (d) => { d.exit_code = 1.5; }, '/exit_code', 'type');
bad('verdict-line-number.json', recorded, (d) => { d.verdict_lines = [10]; }, '/verdict_lines/0', 'type');
bad('input-without-locator.json', recorded, (d) => { d.inputs = [{ sha256: DS_TLA, role: 'spec' }]; }, '/inputs/0', 'anyOf');
bad('input-without-sha.json', recorded, (d) => { delete d.inputs[0].sha256; }, '/inputs/0', 'required');
bad('input-absolute-path.json', recorded, (d) => { d.inputs[0].path = '/srv/lab/DoubleSpend.tla'; }, '/inputs/0/path', 'pattern');
bad('input-parent-path.json', recorded, (d) => { d.inputs[0].path = 'research/../DoubleSpend.tla'; }, '/inputs/0/path', 'pattern');
bad('input-url-with-space.json', recorded, (d) => { d.inputs[2].url = 'https://example.org/a b.jar'; }, '/inputs/2/url', 'pattern');
bad('output-without-bytes.json', recorded, (d) => { delete d.outputs[0].bytes; }, '/outputs/0', 'required');
bad('output-backslash-path.json', recorded, (d) => { d.outputs[0].path = 'runs\\RUN-x\\default.log'; }, '/outputs/0/path', 'pattern');
bad('budget-workers-zero.json', recorded, (d) => { d.budget.workers = 0; }, '/budget/workers', 'minimum');
bad('budget-not-object.json', recorded, (d) => { d.budget = ['-workers', '1']; }, '/budget', 'type');
bad('environment-without-os.json', recorded, (d) => { delete d.environment.os; }, '/environment', 'required');
bad('environment-cpu-zero.json', recorded, (d) => { d.environment.cpu_count = 0; }, '/environment/cpu_count', 'minimum');
bad('config-without-id.json', recorded, (d) => { delete d.configs[1].id; }, '/configs/1', 'required');
bad('config-output-absolute.json', recorded, (d) => { d.configs[0].outputs = ['/tmp/default.log']; }, '/configs/0/outputs/0', 'anyOf');
bad('origin-unknown.json', imported, (d) => { d.origin = 'remembered'; }, '/origin', 'enum');
bad('unrecorded-extra-key.json', imported, (d) => { d.unrecorded[0].guess = 'java -jar'; }, '/unrecorded/0', 'additionalProperties');
bad('unrecorded-empty-reason.json', imported, (d) => { d.unrecorded[0].reason = ''; }, '/unrecorded/0/reason', 'minLength');
bad('task-not-an-id.json', recorded, (d) => { d.task = 'spike 11'; }, '/task', 'pattern');
bad('notes-empty-line.json', recorded, (d) => { d.notes = ['']; }, '/notes/0', 'minLength');
bad('ttl-zero.json', browser, (d) => { d.ttl_days = 0; }, '/ttl_days', 'minimum');
bad('check-without-pass.json', browser, (d) => { delete d.checks[0].pass; }, '/checks/0', 'required');
bad('title-empty.json', browser, (d) => { d.title = ''; }, '/title', 'minLength');
fs.writeFileSync(path.join(dir, 'invalid', 'index.json'), '[\n' + index.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n]\n');
console.log('run fixtures:', fs.readdirSync(path.join(dir, 'valid')).length, 'valid,', index.length, 'invalid');
