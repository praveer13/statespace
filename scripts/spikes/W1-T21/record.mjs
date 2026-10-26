#!/usr/bin/env node
// Record RUN-generators-gate (W1-T21): GATE-generators on this repository, with the fixture family's determinism
// digest computed in Chromium, Firefox and WebKit inside the pinned Playwright image and written to its
// determinism.json, the fast lane on the host, the planted-fault self-check, and the tests of the two packages.
// Every log goes under runs/RUN-generators-gate/ and the verdict lines are copied from them.
//
//   node scripts/spikes/W1-T21/record.mjs        about a minute; needs Docker and mcr.microsoft.com/playwright:v1.63.0-noble
//
// The steps, in order: the browsers compute every family's digest (the repository mounted read-only, the digests
// written to a scratch folder), the host writes determinism.json from them, the browsers run the gate again against
// the committed record, the host runs the fast lane, the self-check and the tests.
//
// Spine section 9.5 registers no run for W1-T05 or W1-T21. The ID is not in packages/ids/proposals.json, because
// GATE-links fails a proposal that no scanned document uses; the first document that cites it adds it (propose-ids.mjs).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileRecord, hostEnvironment, normalizePaths, posix, REPO, sha256, sha256File } from '../../runs/registry.mjs';

const RUN_ID = 'RUN-generators-gate';
const TASK = 'W1-T21';
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';
const OUT = path.join(REPO, 'runs', RUN_ID);
const node = process.execPath;
const scratch = fs.mkdtempSync(path.join(process.env.W1T21_SCRATCH ?? os.tmpdir(), 'w1t21-'));

const inspect = spawnSync('docker', ['image', 'inspect', '--format', '{{index .RepoDigests 0}}', IMAGE], { encoding: 'utf8' });
if (inspect.status !== 0) {
  console.error(`record: the image ${IMAGE} is not on this host; pull it first`);
  process.exit(2);
}
const imageDigest = inspect.stdout.trim().replace(/^[^@]*@/, '');
const imageRef = `${IMAGE}@${imageDigest}`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const keep = (l) => /^(GATE-generators|  ok |  FAIL|FAIL |held |  wrote |# (tests|pass|fail) )/.test(l);

/** Run one step, keep its normalized log, and return its configuration entry. */
function step(id, purpose, { cmd = node, args, shown, expect = [0], image = null, env = {} }) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env } });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = normalizePaths(`${r.stdout ?? ''}${r.stderr ?? ''}`, { sandbox: [scratch, os.tmpdir()] });
  const log = path.join(OUT, `${id}.log`);
  fs.writeFileSync(log, text);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  console.log(`${RUN_ID} ${id}: exit ${r.status} (expected ${expect.join(' or ')}), ${duration_s} s`);
  return {
    entry: {
      id,
      origin: 'recorded',
      purpose,
      ...(image ? { image } : {}),
      started_at: started.toISOString(),
      duration_s,
      argv: shown,
      exit_code: r.status,
      expected_exit_codes: expect,
      verdict_lines: lines.filter(keep).slice(0, 80),
      outputs: [fileRecord(REPO, posix(path.relative(REPO, log)), { kind: 'log' })],
    },
    text,
    ok: expect.includes(r.status),
  };
}

const docker = (name, scriptArgs, mounts) => {
  const args = ['run', '--rm', '--memory=6g', '--name', name, '-v', `${REPO}:/repo:ro`, ...mounts.flatMap((m) => ['-v', m]), '-w', '/repo', IMAGE, 'node', 'scripts/verify-generators.mjs', ...scriptArgs];
  const shown = ['docker', 'run', '--rm', '--memory=6g', '--name', name, '-v', '<repo>:/repo:ro', ...mounts.flatMap((m) => ['-v', m.replace(scratch, '<sandbox>')]), '-w', '/repo', imageRef, 'node', 'scripts/verify-generators.mjs', ...scriptArgs];
  return { cmd: 'docker', args, shown, image: imageRef };
};

const steps = [];
// 1. The browsers: every family's digest in Chromium, Firefox and WebKit, and the gate's other checks under the image's Node.
const engines = step('engines', 'every family\'s digest computed by one bundle in Chromium, Firefox and WebKit inside the pinned Playwright image, written for the host to compare; the run fails only on a missing or stale determinism.json before the write', {
  ...docker('w1t21-engines', ['--engines', '--engines-out', '/out/engines.json'], [`${scratch}:/out`]),
  expect: [0, 1],
});
steps.push(engines);
const enginesFile = path.join(OUT, 'engines.json');
fs.copyFileSync(path.join(scratch, 'engines.json'), enginesFile);
// 2. The write: the host's Node computes the digests again and writes determinism.json where all four agree.
steps.push(step('write', 'the host compares its own digests with the three browsers\' and writes each family\'s determinism.json where all four agree', {
  args: ['scripts/verify-generators.mjs', '--engines-in', posix(path.relative(REPO, enginesFile)), '--write'],
  shown: ['node', 'scripts/verify-generators.mjs', '--engines-in', posix(path.relative(REPO, enginesFile)), '--write'],
}));
// 3. The browsers again, against the committed record: the acceptance's "green on a fixture family in three engines".
steps.push(step('engines-check', 'GATE-generators with the browsers, against the committed determinism.json: green in Chromium, Firefox and WebKit', docker('w1t21-engines-check', ['--engines'], [])));
// 4-6. The host: the fast lane as the lane runs it, its JSON report, and the self-check.
const fast = step('fast', 'GATE-generators as the fast lane runs it, on the host', { args: ['scripts/verify-generators.mjs'], shown: ['node', 'scripts/verify-generators.mjs'] });
steps.push(fast);
const json = step('fast-json', 'the same run, as JSON, for the values below', { args: ['scripts/verify-generators.mjs', '--json'], shown: ['node', 'scripts/verify-generators.mjs', '--json'] });
steps.push(json);
steps.push(step('self-check', 'one planted fault per check; the gate must fail on each, and the clean fixture must pass', { args: ['scripts/verify-generators.mjs', '--self-check'], shown: ['node', 'scripts/verify-generators.mjs', '--self-check'] }));
// 7. The tests of the two packages.
steps.push(step('tests-generators', 'the tests of packages/generators: the core, the fixture family, the mechanics and the gate script', { cmd: 'npm', args: ['test', '-w', '@statespace/generators'], shown: ['npm', 'test', '-w', '@statespace/generators'] }));
steps.push(step('tests-rng', 'the tests of packages/rng: the draws against an independent implementation, and the lint against the vendored lint\'s own cases', { cmd: 'npm', args: ['test', '-w', '@statespace/rng'], shown: ['npm', 'test', '-w', '@statespace/rng'] }));

// ------------------------------------------------------------------ values and checks
const browsers = JSON.parse(fs.readFileSync(enginesFile, 'utf8'));
const report = JSON.parse(json.text);
const fixture = report.reports.find((r) => r.family === 'GEN-fixture');
const detPath = 'packages/generators/src/core/fixture/determinism.json';
const det = JSON.parse(fs.readFileSync(path.join(REPO, detPath), 'utf8'));
const detCopy = path.join(OUT, 'determinism.GEN-fixture.json');
fs.copyFileSync(path.join(REPO, detPath), detCopy);
const enginesNode = /digests compared in .*$/m.exec(steps[0].text)?.[0] ?? null;
const containerNode = (() => {
  const r = spawnSync('docker', ['run', '--rm', '--memory=1g', '--name', 'w1t21-node-version', IMAGE, 'node', '--version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
})();
const versionOf = (pkg) => JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', pkg, 'package.json'), 'utf8')).version;
const browserDigests = browsers.engines.map((e) => ({ engine: e.engine, version: e.version, digest: e.digests['GEN-fixture']?.digest ?? null }));
const allAgree = browserDigests.every((b) => b.digest === det.digest) && det.engines.length === 4 && det.engines.every((e) => e.digest === det.digest);

const checks = [
  { id: 'three-browsers-agree-with-node', pass: allAgree },
  { id: 'determinism-recorded', pass: steps[1].ok && /wrote packages\/generators\/src\/core\/fixture\/determinism\.json/.test(steps[1].text) },
  { id: 'green-in-three-engines', pass: steps[2].ok && /^GATE-generators: green/m.test(steps[2].text) },
  { id: 'fast-lane-green', pass: fast.ok && /^GATE-generators: green/m.test(fast.text) },
  { id: 'self-check-holds', pass: steps[5].ok && /self-check: green/.test(steps[5].text) },
  { id: 'tests-pass', pass: steps[6].ok && steps[7].ok },
];

const manifest = (dir) => {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else files.push(child);
    }
  };
  walk(dir);
  const lines = files.map((f) => `${sha256File(path.join(REPO, f))}  ${f}`).sort();
  return { path: dir, sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), sha256_method: 'SHA-256 of the sorted "sha256  path" lines of every file under the path', files: files.length };
};

const record = {
  id: RUN_ID,
  title: 'GATE-generators on this repository: the fixture family green in Chromium, Firefox and WebKit and on the host, with the determinism lint, the planted-fault self-check and the tests',
  task: TASK,
  origin: 'recorded',
  engine: 'node',
  version: process.versions.node,
  binary: 'node (the host binary; no container)',
  binary_sha256: sha256File(node),
  image: null,
  recorded_at: new Date().toISOString(),
  started_at: steps[0].entry.started_at,
  duration_s: Math.round(steps.reduce((s, x) => s + x.entry.duration_s, 0) * 1000) / 1000,
  argv: fast.entry.argv,
  inputs: [
    { ...fileRecord(REPO, 'scripts/verify-generators.mjs'), role: 'gate' },
    { ...manifest('packages/generators/src/core'), role: 'framework, fixture family and its checks' },
    { ...manifest('packages/rng/src'), role: 'seeded draws and the determinism lint' },
    { ...manifest('packages/generators/test'), role: 'tests' },
    { ...manifest('packages/rng/test'), role: 'tests' },
    { ...fileRecord(REPO, 'vendor/kernelspace/src/lib/rng.ts'), role: 'vendored seeded RNG' },
    { ...fileRecord(REPO, 'vendor/kernelspace/scripts/verify-determinism.ts'), role: 'vendored lint, whose self-test cases the port must reproduce' },
    { ...fileRecord(REPO, 'packages/ids/src/registry.json'), role: 'the spine registry (families, misconception keys, KCs)' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T21/record.mjs'), role: 'recording script' },
  ],
  budget: { container_memory: '6g', key_seeds_per_cell: 8, digest_sample: det.sample, browser_wait_s: 180, network: 'none: the image and node_modules are local' },
  exit_code: fast.entry.exit_code,
  verdict_lines: fast.entry.verdict_lines,
  outputs: [...steps.flatMap((s) => s.entry.outputs), fileRecord(REPO, posix(path.relative(REPO, enginesFile)), { kind: 'report' }), fileRecord(REPO, posix(path.relative(REPO, detCopy)), { kind: 'report' })],
  values: {
    family: 'GEN-fixture',
    digest: det.digest,
    determinism_file: { path: detPath, sha256: sha256File(path.join(REPO, detPath)) },
    browsers: Object.fromEntries(browsers.engines.map((e) => [e.engine, e.version])),
    node_host: process.versions.node,
    node_container: containerNode,
    instances: fixture?.stats.instances ?? null,
    keyed: fixture?.stats.keyed ?? null,
    discarded: fixture?.stats.discarded ?? null,
    answers_graded: fixture?.stats.graded ?? null,
    lint_files: report.lint.files,
    lint_findings: report.lint.findings.length,
    self_check_cases: (steps[5].text.match(/^held /gm) ?? []).length,
    bundle_bytes: browsers.bundleBytes,
    tools: { esbuild: versionOf('esbuild'), 'playwright-core': versionOf('playwright-core'), typescript: versionOf('typescript') },
    engines_summary: enginesNode,
  },
  checks,
  pass: checks.every((c) => c.pass),
  environment: { ...hostEnvironment(), node: process.version, container: null },
  primary_config: 'fast',
  configs: steps.map((s) => s.entry),
  unrecorded: [{ field: 'image', reason: 'the primary configuration ran on the host with no container; the engines and engines-check configurations name the Playwright image by digest' }],
  notes: [
    'The fast lane cannot start browsers (no lane installs them yet), so it compares the digest Node computes with the one Chromium, Firefox and WebKit computed and determinism.json records; the browsers ran here, in the pinned Playwright image, from one esbuild bundle of the families and the core.',
    `Five JavaScript engines computed the same digest: the host's Node ${process.versions.node}, the image's Node ${containerNode ?? '(not recorded)'}, and the three browsers.`,
    'Only the framework\'s fixture family existed when this was recorded; the course families (W1-T22 to W1-T26) are checked by the same gate as they land, each with its own determinism.json.',
    'The fixture discards some band-3 seeds by design: its box engine answers unknown past its state budget, which is how the gate shows that unknown instances are discarded and redrawn.',
    'Pending templates (TemplateSpec.pending, for families whose later templates wait for engines of later waves, as W1-T23 and W1-T24 do): the self-check runs the fixture as GEN-find-the-witness\'s W1 slice, one template live and two pending until W3-T27 and W4-T20, and it passes. Five faults around it each fail: drawing a pending template, a live template whose engine has no port, a template still pending once its engine has a port, a landing task the tracker lacks, and a family with every template pending. The gate tests run the same slice end to end through the script.',
    'This ran on the development host, not on a CI runner.',
    'Spine section 9.5 registers no run for this task; the ID is proposed with scripts/spikes/W1-T21/propose-ids.mjs once a scanned document cites it.',
  ],
};
fs.writeFileSync(path.join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
fs.rmSync(scratch, { recursive: true, force: true });
console.log(`${RUN_ID}: ${record.pass ? 'pass' : 'FAIL'} (${checks.filter((c) => !c.pass).map((c) => c.id).join(', ') || 'every check passed'})`);
process.exitCode = record.pass ? 0 : 1;
