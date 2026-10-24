#!/usr/bin/env node
// Records RUN-facts-gate (W0-T08): GATE-facts on the tree, on its fixtures (the task's two acceptance criteria) and
// in its self-check, the tests, typecheck and purity lint of packages/runs, and the npm ci check behind the request
// to add packages/runs to the root lockfile. Writes runs/RUN-facts-gate.json and runs/RUN-facts-gate/*.txt, then
// validates the record against run@1. Dependency-free.
//
//   node scripts/spikes/W0-T08/record-run.mjs [--scratch DIR]
//
// The scratch directory (default: W0T08_SCRATCH, else the system's temporary directory) holds the self-check's copy
// of the tree and the npm ci copy; both are removed afterwards, and their path is written as <scratch>.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const ID = 'RUN-facts-gate';
const OUT = path.join(REPO, 'runs', ID);
const reg = await import(pathToFileURL(path.join(REPO, 'scripts', 'runs', 'registry.mjs')).href);
const argv = process.argv.slice(2);
const scratchRoot = argv.includes('--scratch') ? argv[argv.indexOf('--scratch') + 1] : (process.env.W0T08_SCRATCH ?? os.tmpdir());
const scratch = fs.mkdtempSync(path.join(scratchRoot, 'w0t08-record-'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const FIX = 'packages/runs/test/fixtures/facts';

/** Output text as committed: no private path, the scratch directory as <scratch>. */
const clean = (text) => reg.normalizePaths(String(text).split(scratch).join('<scratch>'), { root: REPO });

// ------------------------------------------------------------------ the npm ci copy: package.json files only
const npmCopy = path.join(scratch, 'npm');
fs.mkdirSync(npmCopy, { recursive: true });
fs.copyFileSync(path.join(REPO, 'package.json'), path.join(npmCopy, 'package.json'));
fs.copyFileSync(path.join(REPO, 'package-lock.json'), path.join(npmCopy, 'package-lock.json'));
for (const top of ['apps', 'packages']) {
  for (const d of fs.readdirSync(path.join(REPO, top))) {
    const pj = path.join(REPO, top, d, 'package.json');
    if (!fs.existsSync(pj)) continue;
    fs.mkdirSync(path.join(npmCopy, top, d), { recursive: true });
    fs.copyFileSync(pj, path.join(npmCopy, top, d, 'package.json'));
  }
}

// ------------------------------------------------------------------ configurations
const NPM_CI = ['npm', 'ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund', '--offline'];
const configs = [
  { id: 'gate', purpose: 'GATE-facts on the tree, as the fast lane runs it (TTLs judged on the machine date)', argv: ['node', 'scripts/verify-facts.mjs'], expect: 0 },
  { id: 'gate-json', purpose: 'the same report as JSON', argv: ['node', 'scripts/verify-facts.mjs', '--json'], expect: 0 },
  { id: 'fixture-disagree', purpose: 'acceptance 1: a fixture sentence states 212 distinct states against RUN-tlc-doublespend, which records 11; the gate must fail on it', argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/disagree`, '--today', '2026-10-24'], expect: 1 },
  { id: 'fixture-agree', purpose: 'the control: the same sentence stating 11 passes', argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/agree`, '--today', '2026-10-24'], expect: 0 },
  { id: 'fixture-ttl-fresh', purpose: 'the TTL fixture on day 59 of its tool fact: no warning', argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/ttl`, '--today', '2026-12-21'], expect: 0 },
  { id: 'fixture-ttl-expired', purpose: "acceptance 2: the TTL fixture on day 60 of the fixture RUN-twin-pins: a tool fact, a twin and two runs past their TTLs warn, and the gate does not fail", argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/ttl`, '--today', '2026-12-23'], expect: 0 },
  { id: 'fixture-forms', purpose: 'every reference form in a document and in learner copy: the planted findings and their controls', argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/forms`, '--today', '2026-10-24'], expect: 1 },
  { id: 'fixture-registry-bad', purpose: 'one planted fault per registry entry', argv: ['node', 'scripts/verify-facts.mjs', '--root', `${FIX}/registry-bad`, '--today', '2026-10-24'], expect: 1 },
  { id: 'registry-day-60', purpose: "the tree judged on 2026-12-22, day 60 of the registry seed's check: every tool fact warns, nothing fails", argv: ['node', 'scripts/verify-facts.mjs', '--today', '2026-12-22'], expect: 0 },
  { id: 'self-check', purpose: 'the fixtures on every date their expected.json gives, then planted faults in a scratch copy of the tree', argv: ['node', 'scripts/verify-facts.mjs', '--self-check'], env: { FACTS_SCRATCH: scratch }, expect: 0 },
  { id: 'tests', purpose: 'the tests of packages/runs, the acceptance criteria among them', argv: ['node', '--test', 'packages/runs/test/*.test.ts'], expect: 0 },
  { id: 'typecheck', purpose: 'the sources with no DOM or Node types, then the tests with Node types', argv: [['node_modules/.bin/tsc', '-p', 'packages/runs'], ['node_modules/.bin/tsc', '-p', 'packages/runs/test']], expect: 0 },
  { id: 'purity-lint', purpose: 'packages/runs/src imports no Node module and names no platform global', argv: ['node', 'packages/purity-lint/check.mjs'], expect: 0 },
  { id: 'heuristic-probe', purpose: 'the design probe: how often a plain citation in a document sits beside a typed output token that no cited run holds in its version or values; the reason GATE-facts checks only explicit value tags', argv: ['node', 'scripts/spikes/W0-T08/heuristic-probe.mjs'], expect: 0 },
  { id: 'npm-ci-without-entries', purpose: "npm ci in a scratch copy of the package.json files and the root lockfile, with packages/runs added: it fails until the lockfile lists the package (W0-S12 owns the lockfile)", argv: NPM_CI, cwd: npmCopy, expect: 1 },
  { id: 'npm-ci-with-entries', purpose: 'the same after npm install --package-lock-only in the scratch copy: the two entries of scripts/spikes/W0-T08/lockfile-entries.diff, and npm ci passes', argv: [['npm', 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--offline'], NPM_CI], cwd: npmCopy, expect: 0 },
];

/** The verdict lines of a configuration's output. */
function verdictLines(id, out) {
  const lines = out.split('\n');
  if (id === 'tests') return lines.filter((l) => /^# (tests|pass|fail) /.test(l));
  if (id === 'typecheck') return [out.trim() === '' ? 'tsc printed nothing: no errors' : out.trim().split('\n')[0]];
  if (id === 'purity-lint') return lines.filter((l) => /^purity-lint:/.test(l));
  if (id.startsWith('npm-ci')) return lines.filter((l) => /Missing:|can only install|^add @statespace\/runs|^up to date|^added/.test(l)).slice(0, 4);
  if (id === 'self-check') return lines.filter((l) => /^GATE-facts self-check: /.test(l) || /^ {2}FAIL/.test(l));
  if (id === 'heuristic-probe') return lines.filter((l) => /^ {2}tokens /.test(l));
  if (id === 'gate-json') {
    const r = JSON.parse(out);
    return [`findings ${r.findings.length}, warnings ${r.warnings.length}, value tags ${r.counts.valueTags}, value references ${r.counts.valueRefs}, facts ${r.counts.facts}, run records ${r.counts.runs}, TTLs judged on ${r.today}`];
  }
  return lines.filter((l) => /^ {2}(FAIL|warn) |^GATE-facts: /.test(l));
}

const results = [];
const startedAll = new Date();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const c of configs) {
  const commands = Array.isArray(c.argv[0]) ? c.argv : [c.argv];
  const started = new Date();
  let out = '';
  let status = 0;
  for (const cmd of commands) {
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: c.cwd ?? REPO, encoding: 'utf8', env: { ...process.env, ...(c.env ?? {}) }, timeout: 600_000, maxBuffer: 1 << 28, shell: false });
    out += `${r.stdout ?? ''}${r.stderr ?? ''}`;
    status = r.status ?? 1;
    if (status !== 0) break;
  }
  const seconds = (Date.now() - started.getTime()) / 1000;
  const text = clean(out);
  const file = path.join(OUT, `${c.id}.txt`);
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
  results.push({ ...c, started, seconds, status, text, file, verdict: verdictLines(c.id, text) });
  console.log(`${status === c.expect ? 'ok  ' : 'FAIL'}  ${c.id}: exit ${status} (expected ${c.expect}), ${seconds.toFixed(1)} s`);
}
fs.rmSync(scratch, { recursive: true, force: true });

// ------------------------------------------------------------------ values and checks, parsed from the outputs
const by = Object.fromEntries(results.map((r) => [r.id, r]));
const count = (text, re) => (text.match(re) ?? []).length;
const num = (text, re) => {
  const m = re.exec(text);
  return m ? Number(m[1]) : null;
};
const disagreeLine = by['fixture-disagree'].text.split('\n').find((l) => /^ {2}FAIL {2}values/.test(l))?.trim() ?? null;
const gateJson = JSON.parse(by['gate-json'].text);
const values = {
  gate_exit: by.gate.status,
  gate_findings: gateJson.findings.length,
  gate_warnings: gateJson.warnings.length,
  gate_judged_on: gateJson.today,
  gate_value_tags: gateJson.counts.valueTags,
  gate_value_references: gateJson.counts.valueRefs,
  gate_citations: gateJson.counts.citations,
  gate_files: gateJson.counts.files,
  registry_facts: gateJson.counts.facts,
  registry_facts_with_ttl: gateJson.counts.factsWithTtl,
  registry_errata: gateJson.counts.errata,
  disagree_exit: by['fixture-disagree'].status,
  disagree_finding: disagreeLine,
  agree_exit: by['fixture-agree'].status,
  ttl_fresh_exit: by['fixture-ttl-fresh'].status,
  ttl_fresh_warnings: count(by['fixture-ttl-fresh'].text, /^ {2}warn {2}ttl/gm),
  ttl_expired_exit: by['fixture-ttl-expired'].status,
  ttl_expired_warnings: count(by['fixture-ttl-expired'].text, /^ {2}warn {2}ttl/gm),
  ttl_expired_findings: count(by['fixture-ttl-expired'].text, /^ {2}FAIL/gm),
  forms_findings: count(by['fixture-forms'].text, /^ {2}FAIL/gm),
  registry_bad_findings: count(by['fixture-registry-bad'].text, /^ {2}FAIL/gm),
  registry_day_60_warnings: count(by['registry-day-60'].text, /^ {2}warn {2}ttl/gm),
  registry_day_60_exit: by['registry-day-60'].status,
  self_check_held: num(by['self-check'].text, /self-check: PASS \((\d+) of \d+ held\)/) ?? num(by['self-check'].text, /\((\d+) of \d+ held\)/),
  self_check_total: num(by['self-check'].text, /\(\d+ of (\d+) held\)/),
  tests: num(by.tests.text, /^# tests (\d+)/m),
  tests_pass: num(by.tests.text, /^# pass (\d+)/m),
  tests_fail: num(by.tests.text, /^# fail (\d+)/m),
  heuristic_tokens: num(by['heuristic-probe'].text, /^ {2}tokens (\d+);/m),
  heuristic_held: num(by['heuristic-probe'].text, /held by a cited run's version or values (\d+);/),
  heuristic_not_held: num(by['heuristic-probe'].text, /not held (\d+)$/m),
  npm_ci_without_entries_exit: by['npm-ci-without-entries'].status,
  npm_ci_with_entries_exit: by['npm-ci-with-entries'].status,
};
const checks = [
  { id: 'acceptance: GATE-facts fails on a fixture sentence whose tagged value disagrees with its run', pass: values.disagree_exit === 1 && /docs\/fixture\.md:5: .*which is 11; it states "212 distinct states"/.test(disagreeLine ?? '') && count(by['fixture-disagree'].text, /^ {2}FAIL/gm) === 1 },
  { id: 'acceptance: GATE-facts warns on an expired-TTL fixture without failing', pass: values.ttl_expired_exit === 0 && values.ttl_expired_warnings === 4 && values.ttl_expired_findings === 0 && /runs\/RUN-twin-pins\.json: ran 2026-10-24, TTL 60 days: stale since 2026-12-23/.test(by['fixture-ttl-expired'].text) },
  { id: 'control: the agreeing sentence passes', pass: values.agree_exit === 0 },
  { id: 'control: the TTL fixture on day 59 has no warning', pass: values.ttl_fresh_exit === 0 && values.ttl_fresh_warnings === 0 },
  { id: 'the gate is green on the tree', pass: values.gate_exit === 0 && values.gate_findings === 0 },
  { id: 'every configuration exited as expected', pass: results.every((r) => r.status === r.expect) },
  { id: 'the self-check held every test', pass: values.self_check_held !== null && values.self_check_held === values.self_check_total },
  { id: 'the tests pass', pass: values.tests_fail === 0 && values.tests_pass === values.tests },
];

// ------------------------------------------------------------------ the record
const INPUTS = [
  'scripts/verify-facts.mjs',
  'scripts/runs/registry.mjs',
  'scripts/runs/numbers-rules.mjs',
  'scripts/spikes/W0-T08/record-run.mjs',
  'scripts/spikes/W0-T08/lockfile-entries.diff',
  'packages/purity-lint/check.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'content/registry/facts.json',
  'content/registry/errata.json',
  'research/evidence/A5v2/npm-pyodide.json',
  'research/evidence/A5v2/z3pypi.json',
];
const walk = (dir) => fs.readdirSync(path.join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
for (const f of walk('packages/runs').filter((p) => !p.endsWith('README.md')).sort()) INPUTS.push(f);
const role = (p) => (p.includes('/fixtures/') ? 'fixture' : p.startsWith('packages/runs/test/') ? 'test' : p.startsWith('content/registry/') || p.startsWith('research/') ? 'data' : p.endsWith('.diff') || p.endsWith('package-lock.json') || p.endsWith('package.json') || p.endsWith('.json') ? 'config' : 'script');
const inputs = [...new Set(INPUTS)].map((p) => reg.fileRecord(REPO, p, { role: role(p) }));
const outputs = results.map((r) => reg.fileRecord(REPO, rel(r.file), { kind: 'log' }));
const nodeBinary = fs.readFileSync(process.execPath);
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim();
const primary = by.gate;
const record = {
  id: ID,
  title: 'GATE-facts on the tree, on its fixtures (the two acceptance criteria of W0-T08) and in its self-check, with the tests of packages/runs and the npm ci check for its lockfile entries',
  task: 'W0-T08',
  origin: 'recorded',
  records: 'GATE-facts fails on a fixture sentence whose tagged value disagrees with its run, and warns on an expired-TTL fixture without failing',
  engine: 'node',
  version: process.versions.node,
  version_string: process.version,
  binary: 'node (the host binary; no container)',
  binary_sha256: sha256(nodeBinary),
  image: null,
  argv: primary.argv,
  inputs,
  budget: { timeout_s: 600, timeout_scope: 'each command', network: 'none: npm ran with --offline from its cache' },
  started_at: startedAll.toISOString(),
  duration_s: Math.round(((Date.now() - startedAll.getTime()) / 1000) * 1000) / 1000,
  recorded_at: new Date().toISOString(),
  exit_code: primary.status,
  verdict_lines: results.flatMap((r) => r.verdict.map((l) => `${r.id}: ${l.trim()}`)),
  outputs,
  values,
  environment: { ...reg.hostEnvironment(), node: process.version, npm: npmVersion, container: null },
  primary_config: 'gate',
  configs: results.map((r) => ({
    id: r.id,
    purpose: r.purpose,
    argv: Array.isArray(r.argv[0]) ? r.argv.flat() : r.argv,
    ...(Array.isArray(r.argv[0]) ? { commands: r.argv } : {}),
    ...(r.cwd ? { cwd: '<scratch>/npm' } : {}),
    ...(r.env ? { env: Object.fromEntries(Object.keys(r.env).map((k) => [k, '<scratch>'])) } : {}),
    started_at: r.started.toISOString(),
    duration_s: Math.round(r.seconds * 1000) / 1000,
    exit_code: r.status,
    expected_exit_code: r.expect,
    verdict_lines: r.verdict.map((l) => l.trim()),
    outputs: [rel(r.file)],
  })),
  checks,
  pass: checks.every((c) => c.pass),
  notes: [
    'The gate is the course\'s own script, so engine and version name the Node runtime that ran it, on the host; no container was involved.',
    'gate, gate-json and self-check judge TTLs on the machine\'s UTC date, which was the day of started_at; every other GATE-facts configuration passes --today, so its outcome does not depend on the day it is re-run.',
    'fixture-ttl-fresh and fixture-ttl-expired are two dates of the same fixture: its tool fact was checked on 2026-10-23 and its RUN-twin-pins and RUN-lean-asset ran on 2026-10-24, all with 60-day TTLs. The fixture\'s RUN-twin-pins is a fixture, not a recorded run: RUN-twin-pins is recorded by each wave that authors a stage (spine section 9.5); its pin is the commit that RUN-lean-toolchain\'s version string reports.',
    'Substitute for CI: no GitHub Actions run here. scripts/spikes/W0-T04/gates.json already lists GATE-facts in the fast, nightly and release lanes; RUN-ci-fastlane (W0-T04) records the lane.',
    'npm-ci-without-entries and npm-ci-with-entries ran on a scratch copy holding only package.json, package-lock.json and the workspaces\' package.json files, with --dry-run and --offline. The repository\'s lockfile was not edited: W0-S12 owns it, and scripts/spikes/W0-T08/lockfile-entries.diff holds the two entries it needs.',
    'Each output under runs/RUN-facts-gate/ is the command\'s stdout and stderr, with the repository path written as . and the scratch directory as <scratch>.',
  ],
};
const recordFile = path.join(REPO, 'runs', `${ID}.json`);
fs.writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`);

// ------------------------------------------------------------------ validate against run@1, when the schema package is there
let verdict = 'not validated: packages/schema is missing';
if (fs.existsSync(path.join(REPO, 'packages', 'schema', 'src', 'index.ts'))) {
  const v = spawnSync(process.execPath, ['--input-type=module', '-e', `import { validate } from ${JSON.stringify(pathToFileURL(path.join(REPO, 'packages', 'schema', 'src', 'index.ts')).href)}; import fs from 'node:fs'; const r = validate('run', JSON.parse(fs.readFileSync(${JSON.stringify(recordFile)}, 'utf8'))); console.log(JSON.stringify(r.ok ? { ok: true } : { ok: false, issues: r.issues.slice(0, 5) }));`], { encoding: 'utf8' });
  verdict = v.status === 0 ? v.stdout.trim() : `validator failed to run: ${v.stderr.slice(0, 300)}`;
}
console.log(`wrote runs/${ID}.json (${results.length} configurations, pass ${record.pass}); run@1: ${verdict}`);
for (const c of checks) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.id}`);
process.exitCode = record.pass && verdict.includes('"ok":true') ? 0 : 1;
