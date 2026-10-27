#!/usr/bin/env node
// Record RUN-ci-fastlane (W0-T04): run what can be run here, write its outputs under runs/RUN-ci-fastlane/ and the record
// runs/RUN-ci-fastlane.json. Dependency-free; Node 22, Docker (with ubuntu:24.04 on the host), uv, git, and the network.
//
//   node scripts/spikes/W0-T04/record.mjs
//
// A GitHub Actions run cannot be made from here, so every number in the record is from a local substitute, and the record
// says so (environment.emulated, the notes, the title). It holds these configurations:
//
//   fast-4cpu-1, -2, -3   the committed fast.yml run step by step in a 4-CPU Ubuntu 24.04 container with cold caches
//                         (emulate-runner.mjs); the primary configuration is the slowest of the three
//   fast-2cpu             the same on 2 CPUs, the size GitHub lists for a private repository's runner
//   actionlint            actionlint 1.7.12 with shellcheck 0.11.0 over the four workflows
//   lane-tests            the lane-tests step: the tests of this folder
//   emulator-container    the emulator's own container test, which the lane-tests step skips
//   nightly-local         the nightly lane run on this host, with the status document it wrote
//
// Owner action that completes it: dispatch fast.yml on GitHub and replace the emulated duration with the run's (README.md).
// Exit status: 0 recorded; 1 a prerequisite or a run failed to produce its output (a red lane is recorded, not an error).

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStatusDocument } from './status-branch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const RUN_ID = 'RUN-ci-fastlane';
const OUT = path.join(REPO, 'runs', RUN_ID);
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const log = (s) => process.stderr.write(`${s}\n`);

const ACTIONLINT = { version: '1.7.12', base: 'https://github.com/rhysd/actionlint/releases/download/v1.7.12', asset: 'actionlint_1.7.12_linux_amd64.tar.gz' };
const SHELLCHECK_PY = 'shellcheck-py==0.11.0.1';
const WORKFLOWS = ['fast', 'nightly', 'release', 'monthly'].map((n) => `.github/workflows/${n}.yml`);

function sh(cmd, args, { cwd = REPO, env, input } = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: env ?? process.env, input, maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', startedAt: new Date(t0).toISOString(), durationS: round((Date.now() - t0) / 1000), error: r.error };
}

function must(r, what) {
  if (r.status !== 0) throw new Error(`${what} failed (${r.status}): ${(r.stderr || r.stdout).trim().split('\n').slice(-4).join(' | ')}`);
  return r;
}

/** Paths of this machine never reach the record: the scratch directory is <scratch>, the repository <repo>, a home directory <home>. */
function placeholder(scratch) {
  return (s) => String(s).split(scratch).join('<scratch>').split(REPO).join('<repo>').replace(/(?<![\w.~-])\/(?:home|Users)\/[A-Za-z0-9._-]+/g, '<home>');
}

function outputRecord(file, kind) {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, kind };
}

function inputRecord(relPath, role) {
  return { path: relPath, sha256: sha(path.join(REPO, relPath)), bytes: fs.statSync(path.join(REPO, relPath)).size, role };
}

// ------------------------------------------------------------------ the lockfile
/** The committed lockfile must install under `npm ci`; when it does not, the emulation overlays the one npm would write. */
function lockfileOverlay(scratch) {
  const dir = path.join(scratch, 'lock');
  const manifests = ['package.json', 'package-lock.json'];
  for (const group of ['apps', 'packages']) {
    for (const d of fs.readdirSync(path.join(REPO, group), { withFileTypes: true })) {
      if (d.isDirectory() && fs.existsSync(path.join(REPO, group, d.name, 'package.json'))) manifests.push(`${group}/${d.name}/package.json`);
    }
  }
  for (const m of manifests) {
    fs.mkdirSync(path.dirname(path.join(dir, m)), { recursive: true });
    fs.copyFileSync(path.join(REPO, m), path.join(dir, m));
  }
  must(sh('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir }), 'npm install --package-lock-only in a scratch copy');
  const fresh = path.join(dir, 'package-lock.json');
  if (sha(fresh) === sha(path.join(REPO, 'package-lock.json'))) return null;
  return { from: fresh, to: 'package-lock.json', sha256: sha(fresh), replaced_sha256: sha(path.join(REPO, 'package-lock.json')) };
}

// ------------------------------------------------------------------ the emulations
function emulate(id, cpus, overlay, scratch) {
  const out = path.join(OUT, id);
  const argv = ['node', 'scripts/spikes/W0-T04/emulate-runner.mjs', '.github/workflows/fast.yml', '--job', 'lane', '--out', rel(out), '--cpus', String(cpus)];
  const actual = [...argv];
  if (overlay) {
    const flags = ['--overlay', `${overlay.from}=${overlay.to}`, '--overlay-reason', overlay.reason];
    actual.push(...flags);
    argv.push('--overlay', `<scratch>/package-lock.json=${overlay.to}`, '--overlay-reason', overlay.reason);
  }
  log(`emulating the fast lane: ${id} (${cpus} CPUs)`);
  const r = sh(process.execPath, actual.slice(1));
  if (!fs.existsSync(path.join(out, 'emulation.json'))) throw new Error(`${id} wrote no emulation.json: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' | ')}`);
  const e = JSON.parse(fs.readFileSync(path.join(out, 'emulation.json'), 'utf8'));
  const lane = fs.existsSync(path.join(out, 'lane-summary.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'lane-summary.json'), 'utf8')) : null;
  return { id, cpus, argv, exit: r.status, stdout: placeholder(scratch)(r.stdout), e, lane, out, startedAt: r.startedAt, durationS: r.durationS };
}

/** Lines of the job log that the lane runner printed as its results, verbatim. */
function laneLines(logFile) {
  return fs
    .readFileSync(logFile, 'utf8')
    .split('\n')
    .filter((l) => /^\[\s*\d+\/\d+\] \S+ +(?:PASS|FAIL|ERROR|TIMEOUT)\b/.test(l) || /^(?:fast|nightly) lane: /.test(l) || /^absent, not built yet/.test(l) || /^fast lane is over/.test(l));
}

// ------------------------------------------------------------------ actionlint
async function runActionlint(scratch) {
  const dl = path.join(scratch, 'actionlint-dl');
  const bin = path.join(scratch, 'actionlint-bin');
  fs.mkdirSync(dl, { recursive: true });
  fs.mkdirSync(bin, { recursive: true });
  const get = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  };
  const tarball = await get(`${ACTIONLINT.base}/${ACTIONLINT.asset}`);
  const sums = (await get(`${ACTIONLINT.base}/actionlint_${ACTIONLINT.version}_checksums.txt`)).toString('utf8');
  const want = sums.split('\n').find((l) => l.endsWith(ACTIONLINT.asset))?.split(/\s+/)[0];
  const got = crypto.createHash('sha256').update(tarball).digest('hex');
  if (!want || want !== got) throw new Error(`the actionlint archive hash ${got} is not the published ${want}`);
  fs.writeFileSync(path.join(dl, ACTIONLINT.asset), tarball);
  must(sh('tar', ['-xzf', path.join(dl, ACTIONLINT.asset), '-C', bin]), 'unpacking actionlint');
  const exe = path.join(bin, 'actionlint');
  const binarySha = sha(exe);
  const script = `"${exe}" -version | head -1; shellcheck --version | sed -n 2p; "${exe}" -no-color -shellcheck "$(command -v shellcheck)" ${WORKFLOWS.join(' ')}; echo "actionlint exit $?"; sha256sum "$(command -v shellcheck)" | cut -d' ' -f1`;
  const r = sh('uv', ['run', '--no-project', '--quiet', '--with', SHELLCHECK_PY, 'sh', '-c', script]);
  const lines = r.stdout.trim().split('\n');
  const shellcheckSha = lines.at(-1);
  const body = lines.slice(0, -1);
  const text = `${placeholder(scratch)(body.join('\n'))}\n`;
  const file = path.join(OUT, 'actionlint', 'actionlint.txt');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  // The same command on a workflow with two planted faults must find both, or a clean result above means nothing.
  const planted = path.join(scratch, 'planted');
  fs.mkdirSync(path.join(planted, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(planted, '.github', 'workflows', 'planted.yml'), 'name: planted\non: push\njobs:\n  j:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: echo $UNQUOTED\n      - run: echo ${{ github.evnt.name }}\n');
  const pr = sh('uv', ['run', '--no-project', '--quiet', '--with', SHELLCHECK_PY, 'sh', '-c', `"${exe}" -no-color -shellcheck "$(command -v shellcheck)" .github/workflows/planted.yml; echo "actionlint exit $?"`], { cwd: planted });
  const plantedFile = path.join(OUT, 'actionlint', 'planted.txt');
  fs.writeFileSync(plantedFile, `${placeholder(scratch)(pr.stdout)}`);
  const plantedCaught = /actionlint exit 1\s*$/.test(pr.stdout) && /SC2086/.test(pr.stdout) && /property "evnt" is not defined/.test(pr.stdout);
  return { r, file, text, body, binarySha, archiveSha: got, shellcheckSha, plantedFile, plantedCaught, plantedLines: pr.stdout.split('\n').filter((l) => /SC2086|property "evnt"|actionlint exit/.test(l)).map((l) => l.replace(/\s*\{action:.*$/, ' ...')), argv: ['uv', 'run', '--no-project', '--quiet', '--with', SHELLCHECK_PY, 'sh', '-c', '<scratch>/actionlint-bin/actionlint -no-color -shellcheck "$(command -v shellcheck)" ' + WORKFLOWS.join(' ')] };
}

// ------------------------------------------------------------------ tests of this folder
function runLaneTests(scratch) {
  const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'gates.json'), 'utf8'));
  const argv = manifest.steps.find((s) => s.id === 'lane-tests').argv;
  const run = (env) => sh(process.execPath, argv.slice(1), { env: { ...process.env, ...env } });
  log('running the tests of this folder');
  const plain = run({});
  const container = sh(process.execPath, ['--test', '--test-name-pattern=in a container', 'scripts/spikes/W0-T04/emulate-runner.test.mjs'], { env: { ...process.env, STATESPACE_EMULATOR_TESTS: '1' } });
  const dir = path.join(OUT, 'lane-tests');
  fs.mkdirSync(dir, { recursive: true });
  const f1 = path.join(dir, 'lane-tests.log');
  const f2 = path.join(dir, 'emulator-container.log');
  fs.writeFileSync(f1, `${placeholder(scratch)(plain.stdout + plain.stderr).replace(/duration_ms: [0-9.]+/g, 'duration_ms: N')}`);
  fs.writeFileSync(f2, `${placeholder(scratch)(container.stdout + container.stderr).replace(/duration_ms: [0-9.]+/g, 'duration_ms: N')}`);
  const totals = (t) => Object.fromEntries(['tests', 'pass', 'fail', 'skipped'].map((k) => [k, Number(new RegExp(`^# ${k} (\\d+)`, 'm').exec(t)?.[1] ?? NaN)]));
  return { argv, plain, container, f1, f2, plainTotals: totals(plain.stdout), containerTotals: totals(container.stdout) };
}

// ------------------------------------------------------------------ the nightly lane here
function runNightly() {
  const dir = path.join(OUT, 'nightly-local');
  fs.mkdirSync(dir, { recursive: true });
  const live = path.join(REPO, 'status', 'nightly.json');
  const argv = ['node', 'scripts/spikes/W0-T04/lane.mjs', 'nightly', '--quiet', '--summary', rel(path.join(dir, 'lane-summary.json'))];
  log('running the nightly lane on this host');
  const r = sh(process.execPath, argv.slice(1));
  if (!fs.existsSync(live)) throw new Error('the nightly lane wrote no status/nightly.json');
  const text = fs.readFileSync(live, 'utf8');
  checkStatusDocument(text); // the format a reader of the status branch accepts
  fs.writeFileSync(path.join(dir, 'nightly.json'), text);
  fs.rmSync(live); // generated, never committed on the default branch (status/README.md)
  fs.writeFileSync(path.join(dir, 'nightly.log'), r.stdout.replace(/^(?:---|::group::).*\n/gm, '').trimEnd() + '\n');
  return { argv, r, status: JSON.parse(text), dir };
}

// ------------------------------------------------------------------ the record
function hostFacts() {
  const cpu = /model name\s*:\s*(.+)/.exec(fs.readFileSync('/proc/cpuinfo', 'utf8'))?.[1]?.trim() ?? null;
  const v = (cmd, args) => sh(cmd, args).stdout.trim().split('\n')[0];
  return { os: `${os.type()} ${os.release()} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`, cpu_count: os.availableParallelism(), ram_gib: Math.round(os.totalmem() / 2 ** 30), cpu_model: cpu, node: process.version, uv: v('uv', ['--version']), docker: v('docker', ['--version']), git: v('git', ['--version']) };
}

const mib = (b) => (b ? Math.round(b / 2 ** 20) : null);

/** The GitHub-hosted part of the existing record, if any, with its output files read into memory. */
function carryGithubHosted() {
  const file = path.join(REPO, 'runs', `${RUN_ID}.json`);
  const none = { configs: [], outputs: [], values: {}, checks: [], notes: [], files: [] };
  if (!fs.existsSync(file)) return none;
  const old = JSON.parse(fs.readFileSync(file, 'utf8'));
  const configs = (old.configs ?? []).filter((c) => /^github-hosted/.test(c.id));
  if (configs.length === 0) return none;
  const paths = new Set(configs.flatMap((c) => (c.outputs ?? []).map((o) => (typeof o === 'string' ? o : o.path))));
  const outputs = (old.outputs ?? []).filter((o) => paths.has(o.path) || /\/github-hosted/.test(o.path));
  for (const o of outputs) paths.add(o.path);
  return {
    configs,
    outputs,
    values: Object.fromEntries(Object.entries(old.values ?? {}).filter(([k]) => k.startsWith('github_hosted'))),
    checks: (old.checks ?? []).filter((c) => /github-hosted/.test(c.id)),
    notes: (old.notes ?? []).filter((n) => /github-hosted/.test(n) && !n.startsWith('GitHub-hosted runs: configurations')),
    files: [...paths].filter((p) => fs.existsSync(path.join(REPO, p))).map((p) => [p, fs.readFileSync(path.join(REPO, p))]),
  };
}

async function main() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'record-ci-'));
  const recordedStart = Date.now();
  // The previous record and its outputs go first: a record whose outputs are half replaced would fail GATE-runs inside the very
  // lane this script is timing.
  // GitHub-hosted runs (configurations github-hosted*, added by scripts/spikes/W0-T11/github-run.mjs) are not this script's
  // to remake: they are carried into the new record as they were, with their files, values, check and notes.
  const carried = carryGithubHosted();
  fs.rmSync(path.join(REPO, 'runs', `${RUN_ID}.json`), { force: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [rel, bytes] of carried.files) {
    fs.mkdirSync(path.dirname(path.join(REPO, rel)), { recursive: true });
    fs.writeFileSync(path.join(REPO, rel), bytes);
  }
  try {
    must(sh('docker', ['image', 'inspect', 'ubuntu:24.04']), 'the image ubuntu:24.04 is needed on this host');
    const host = hostFacts();
    const commit = sh('git', ['rev-parse', 'HEAD']).stdout.trim();
    const dirty = sh('git', ['status', '--porcelain']).stdout.trim() !== '';

    const overlay = lockfileOverlay(scratch);
    if (overlay) overlay.reason = "the committed package-lock.json lacks a workspace package that a later task added (npm ci fails: Missing: @statespace/runs from lock file); the overlay is the lockfile that npm install --package-lock-only writes from the same manifests";
    const four = ['fast-4cpu-1', 'fast-4cpu-2', 'fast-4cpu-3'].map((id) => emulate(id, 4, overlay, scratch));
    const two = emulate('fast-2cpu', 2, overlay, scratch);
    const committed = overlay ? emulate('fast-committed-lockfile', 4, null, scratch) : null; // what the real lane does today
    const primary = four.reduce((a, b) => (b.e.duration_s > a.e.duration_s ? b : a));
    for (const r of [...four.filter((x) => x !== primary), two]) fs.rmSync(path.join(r.out, 'job.log'), { force: true }); // the full log is kept for the primary run only

    const lint = await runActionlint(scratch);
    const tests = runLaneTests(scratch);
    const nightly = runNightly();

    // ---- facts from the outputs
    const lane = primary.lane;
    const failing = lane.steps.filter((s) => ['fail', 'error', 'timeout'].includes(s.result));
    const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'gates.json'), 'utf8'));
    const owner = (id) => manifest.steps.find((s) => s.id === id)?.built_by ?? null;
    const stepOf = (e, name) => e.steps.find((s) => s.name === name);
    const stepLog = fs.readFileSync(path.join(primary.out, 'job.log'), 'utf8');
    const hashLine = (re) => re.exec(stepLog)?.[1] ?? null;
    const nodeTarballSha = hashLine(/^sha256 ([0-9a-f]{64}) node-v/m);
    const uvTarballSha = hashLine(/^sha256 ([0-9a-f]{64}) uv-/m);
    const nodeVersion = /^v(\d+\.\d+\.\d+)$/m.exec(stepLog)?.[1];
    const uvVersion = /^uv (\d+\.\d+\.\d+)$/m.exec(stepLog)?.[1];
    if (!nodeTarballSha || !nodeVersion || !uvVersion) throw new Error('the job log lacks the Node or uv version lines');
    const durations = four.map((x) => x.e.duration_s);
    const headroom = round(300 / primary.e.duration_s, 1);
    const lintOk = lint.body.at(-1) === 'actionlint exit 0' && lint.body.length === 3;
    const nightlyGates = nightly.status.gates.map((g) => `${g.id} ${g.result}`);

    // ---- configurations
    const laneVerdicts = (x) => laneLines(path.join(x.out, 'job.log')).filter(Boolean);
    const emuLines = (x) => x.stdout.split('\n').filter((l) => /^(?:emulated |\s+\d+\s+(?:pass|fail|skipped))/.test(l));
    const files = [];
    const keep = (file, kind) => {
      files.push(outputRecord(file, kind));
      return rel(file);
    };
    const emuConfig = (x, purpose) => ({
      id: x.id,
      purpose,
      engine: 'node',
      version: nodeVersion,
      image: `ubuntu:24.04@${x.e.container.image_digest.replace(/^ubuntu@/, '')}`,
      argv: x.argv,
      started_at: x.e.started_at,
      duration_s: x.e.duration_s,
      exit_code: x.exit,
      budget: { cpus: x.cpus, memory: '6g', timeout_s: 300 },
      environment: { cpu_count: x.cpus, cpus_are: `a quota (--cpus=${x.cpus}) on this host's ${host.cpu_count} logical CPUs`, peak_memory_mib: mib(x.e.peak_memory_bytes) },
      verdict_lines: x.id === primary.id ? [...emuLines(x), ...laneVerdicts(x)] : emuLines(x),
      steps: x.e.steps.map((s) => ({ index: s.index, name: s.name, result: s.result, duration_s: s.duration_s, emulated: s.emulated ?? false })),
      outputs: [
        keep(path.join(x.out, 'emulation.json'), 'emulation: each step, its duration and the container'),
        ...(x.lane ? [keep(path.join(x.out, 'lane-summary.json'), 'lane summary: each gate, its result, duration and verdict')] : []),
        ...(x.lane ? [keep(path.join(x.out, 'step-summary.md'), 'the job summary the lane wrote')] : []),
        ...(fs.existsSync(path.join(x.out, 'job.log')) ? [keep(path.join(x.out, 'job.log'), 'the whole job log, paths normalised')] : []),
      ],
    });
    const configs = [
      emuConfig(four[0], 'the committed fast.yml in a 4-CPU Ubuntu 24.04 container, cold caches: first run'),
      emuConfig(four[1], 'the same: second run'),
      emuConfig(four[2], 'the same: third run'),
      emuConfig(two, 'the same on 2 CPUs, the size GitHub lists for a private repository\'s runner'),
      ...(committed ? [emuConfig(committed, 'the same without the overlay: the committed lockfile, which npm ci refuses, so the real lane stops at its fifth step today')] : []),
      {
        id: 'actionlint',
        purpose: 'actionlint with shellcheck over the four workflows: no finding',
        engine: 'actionlint',
        version: ACTIONLINT.version,
        binary_sha256: lint.binarySha,
        argv: lint.argv,
        started_at: lint.r.startedAt,
        duration_s: lint.r.durationS,
        exit_code: Number(/^actionlint exit (\d+)$/.exec(lint.body.at(-1))?.[1] ?? NaN),
        verdict_lines: [...lint.body, ...lint.plantedLines.map((l) => `planted fault: ${l.trim()}`)],
        outputs: [keep(lint.file, 'actionlint and shellcheck versions, its findings (none) and exit code'), keep(lint.plantedFile, 'the same command on a workflow with two planted faults: both are found')],
      },
      {
        id: 'lane-tests',
        purpose: 'the lane-tests step of gates.json: the tests of the lane runner, its manifest, the status branch, the issue filer, the emulator and the workflows',
        engine: 'node',
        version: nodeVersion,
        argv: ['node', ...tests.argv.slice(1)],
        started_at: tests.plain.startedAt,
        duration_s: tests.plain.durationS,
        exit_code: tests.plain.status,
        verdict_lines: [`# tests ${tests.plainTotals.tests}`, `# pass ${tests.plainTotals.pass}`, `# fail ${tests.plainTotals.fail}`, `# skipped ${tests.plainTotals.skipped}`],
        outputs: [keep(tests.f1, 'TAP report')],
      },
      {
        id: 'emulator-container',
        purpose: 'the emulator\'s own container test (opt-in, so the lane-tests step skips it): env files, a failed step, always(), the clock',
        engine: 'node',
        version: nodeVersion,
        argv: ['node', '--test', '--test-name-pattern=in a container', 'scripts/spikes/W0-T04/emulate-runner.test.mjs'],
        env: { STATESPACE_EMULATOR_TESTS: '1' },
        started_at: tests.container.startedAt,
        duration_s: tests.container.durationS,
        exit_code: tests.container.status,
        verdict_lines: [`# tests ${tests.containerTotals.tests}`, `# pass ${tests.containerTotals.pass}`, `# fail ${tests.containerTotals.fail}`],
        outputs: [keep(tests.f2, 'TAP report')],
      },
      {
        id: 'nightly-local',
        purpose: 'the nightly lane run on this host, outside the Bench image and outside GitHub: it writes status/nightly.json, copied here',
        engine: 'node',
        version: host.node.replace(/^v/, ''),
        argv: nightly.argv,
        started_at: nightly.r.startedAt,
        duration_s: nightly.r.durationS,
        exit_code: nightly.r.status,
        verdict_lines: nightly.r.stdout.split('\n').filter((l) => /^(?:wrote .*status\/nightly\.json|nightly lane: |absent, not built yet)/.test(l)).map((l) => l.replace('<repo>/', '')),
        outputs: [keep(path.join(nightly.dir, 'nightly.json'), 'the status document the nightly lane wrote (status/nightly.json)'), keep(path.join(nightly.dir, 'lane-summary.json'), 'lane summary'), keep(path.join(nightly.dir, 'nightly.log'), 'the lane output without the step output groups')],
      },
    ];

    const topOutputs = files;
    const checks = [
      { id: 'fast-lane-under-300-s', pass: primary.e.duration_s < 300, detail: `emulated: ${primary.e.duration_s} s, the slowest of ${durations.join(', ')}` },
      { id: 'workflows-lint', pass: lintOk, detail: `actionlint ${ACTIONLINT.version} with shellcheck: ${lint.body.at(-1)}` },
      { id: 'actionlint-catches-planted-faults', pass: lint.plantedCaught, detail: 'an unquoted variable (SC2086) and a misspelled context property, both found by the command that found nothing in the four workflows' },
      { id: 'lane-tests', pass: tests.plain.status === 0 && tests.plainTotals.fail === 0, detail: `${tests.plainTotals.tests} tests, ${tests.plainTotals.pass} passed, ${tests.plainTotals.skipped} skipped` },
      { id: 'emulator-container-test', pass: tests.container.status === 0 && tests.containerTotals.pass === 1, detail: `${tests.containerTotals.pass} of ${tests.containerTotals.tests} passed` },
      { id: 'nightly-writes-status-json', pass: nightly.status.schema === 'statespace/nightly-status@1' && nightly.status.commit === commit, detail: `${nightly.status.result}; ${nightly.status.gates.length} gates and ${nightly.status.checks.length} checks run` },
    ];
    // A lane that its own clock or a step timeout stopped is not a lane that finished under budget: the duration of a
    // stopped lane is the budget, not the work.
    const stopped = [...four, two].filter((x) => x.lane && (x.lane.over_budget || (x.lane.counts?.timeout ?? 0) > 0 || (x.lane.counts?.skipped ?? 0) > 0))
      .map((x) => `${x.id} stopped: ${x.lane.counts?.timeout ?? 0} step(s) timed out and ${x.lane.counts?.skipped ?? 0} skipped${x.lane.over_budget ? ', over budget' : ''}`);
    const underBudget = primary.e.duration_s < 300 && stopped.length === 0;
    const verdicts = [
      ...emuLines(primary),
      ...laneVerdicts(primary),
      `RESULT fast-lane-under-5-minutes: ${underBudget ? 'PASS' : 'FAIL'} (emulated: the slowest of 3 cold runs on 4 CPUs took ${primary.e.duration_s} s against a 300 s budget; the runs took ${durations.join(', ')} s; on 2 CPUs ${two.e.duration_s} s${stopped.length > 0 ? `; ${stopped.join('; ')}` : ''})`,
      `RESULT workflows-lint: ${lintOk ? 'PASS' : 'FAIL'} (actionlint ${ACTIONLINT.version} with shellcheck: ${lint.body.at(-1)})`,
      `RESULT actionlint-catches-planted-faults: ${lint.plantedCaught ? 'PASS' : 'FAIL'} (a planted unquoted variable and a planted misspelled property are both reported by the same command)`,
      `RESULT nightly-writes-status: ${nightly.status.schema === 'statespace/nightly-status@1' ? 'PASS' : 'FAIL'} (status/nightly.json written by the nightly lane here: ${nightly.status.result}, ${nightly.status.gates.length} gates and ${nightly.status.checks.length} checks run, ${nightly.status.absent.length} gates not built yet)`,
    ];
    const record = {
      id: RUN_ID,
      title: `The fast lane's own workflow, run step by step in a 4-CPU Ubuntu 24.04 container with cold caches, ${underBudget ? `finishes in ${primary.e.duration_s} s against a 300 s budget (slowest of three runs)` : `does not finish inside its 300 s budget: the lane stopped itself at ${primary.e.duration_s} s with steps timed out and skipped`}; emulated, not a GitHub Actions run`,
      task: 'W0-T04',
      engine: 'node',
      version: nodeVersion,
      version_string: `Node.js v${nodeVersion} (the lane runner's runtime, installed by the emulated setup-node step); uv ${uvVersion}`,
      binary: `node-v${nodeVersion}-linux-x64.tar.xz from nodejs.org, as the emulated setup-node step installed it in the container`,
      binary_sha256: nodeTarballSha,
      image: `ubuntu:24.04@${primary.e.container.image_digest.replace(/^ubuntu@/, '')}`,
      recorded_at: new Date().toISOString(),
      started_at: primary.e.started_at,
      duration_s: primary.e.duration_s,
      argv: primary.argv,
      inputs: [
        ...WORKFLOWS.map((w) => inputRecord(w, 'the workflow')),
        inputRecord('scripts/spikes/W0-T04/gates.json', 'the lane manifest: which steps each lane runs'),
        inputRecord('scripts/spikes/W0-T04/lane.mjs', 'the lane runner'),
        inputRecord('scripts/spikes/W0-T04/emulate-runner.mjs', 'the runner emulator'),
        inputRecord('scripts/spikes/W0-T04/status-branch.mjs', 'publishes and reads the nightly status on its branch'),
        inputRecord('scripts/spikes/W0-T04/file-issue.mjs', 'files, updates or closes the monthly issue'),
        inputRecord('scripts/spikes/W0-T04/record.mjs', 'the script that wrote this record'),
        inputRecord('package-lock.json', 'the committed lockfile (the emulation used the overlay below when the two differ)'),
        ...(overlay ? [{ name: 'package-lock.json (regenerated by npm install --package-lock-only)', sha256: overlay.sha256, role: 'overlay: the lockfile the emulated runs installed from' }] : []),
        { url: 'https://hub.docker.com/_/ubuntu', name: 'ubuntu:24.04', sha256: primary.e.container.image_id.replace(/^sha256:/, ''), role: 'the base image of the emulated runner: its image ID' },
        { url: `https://github.com/astral-sh/uv/releases/download/${uvVersion}/uv-x86_64-unknown-linux-gnu.tar.gz`, sha256: uvTarballSha, role: 'uv as the emulated setup-uv step installed it' },
        { url: `${ACTIONLINT.base}/${ACTIONLINT.asset}`, name: ACTIONLINT.asset, sha256: lint.archiveSha, role: 'actionlint archive, checked against its published checksums' },
      ],
      budget: { timeout_s: 300, job_timeout_minutes: 6, cpus: 4, memory: '6g', network: 'nodejs.org, GitHub releases, the npm registry, PyPI and the Ubuntu archive (bootstrap only)' },
      exit_code: primary.exit,
      verdict_lines: verdicts,
      outputs: topOutputs,
      values: {
        basis: 'emulated: the committed fast.yml run in a container resembling a hosted ubuntu-24.04 runner; not a GitHub Actions run',
        fast_lane_duration_s: primary.e.duration_s,
        fast_lane_budget_s: 300,
        fast_lane_runs_s: durations,
        fast_lane_2cpu_s: two.e.duration_s,
        fast_lane_job_timeout_minutes: 6,
        budget_headroom_factor: headroom,
        steps_run: lane.counts.pass + lane.counts.fail + lane.counts.error + lane.counts.timeout,
        steps_absent: lane.counts.absent,
        steps_failed: failing.map((s) => s.id),
        peak_memory_mib: mib(primary.e.peak_memory_bytes),
        setup_seconds: { node: stepOf(primary.e, 'Set up Node')?.duration_s, uv: stepOf(primary.e, 'Set up uv')?.duration_s, npm_ci: stepOf(primary.e, 'Install the pinned packages')?.duration_s, lane: stepOf(primary.e, 'Run the fast lane')?.duration_s },
        actionlint: ACTIONLINT.version,
        shellcheck: '0.11.0',
        workflows_linted: WORKFLOWS.length,
        lockfile_overlay_used: overlay !== null,
        committed_lockfile_npm_ci: committed ? (committed.e.steps.find((x) => x.name === 'Install the pinned packages')?.result ?? null) : 'not run: the committed lockfile installs, no overlay was needed',
        nightly_local: { result: nightly.status.result, gates_run: nightlyGates.length, gates_absent: nightly.status.absent.length, duration_s: nightly.r.durationS },
      },
      environment: {
        os: `${primary.e.container.os} in a Docker container on ${host.os}`,
        cpu_count: 4,
        ram_gib: host.ram_gib,
        cpu_architecture: 'x86_64',
        container: { runtime: 'docker', server_version: primary.e.container.server_version, image: `ubuntu:24.04@${primary.e.container.image_digest.replace(/^ubuntu@/, '')}`, os: primary.e.container.os, run_flags: primary.e.container.run_flags, bootstrap: primary.e.container.bootstrap },
        host: { os: host.os, cpu_count: host.cpu_count, ram_gib: host.ram_gib, cpu_model: host.cpu_model },
        host_tools: { node: host.node, uv: host.uv, docker: host.docker, git: host.git },
        emulated: true,
        emulation: 'a container with a 4-CPU quota and a 6 GB cap, Ubuntu 24.04, a copy of this working tree as its checkout, cold npm and uv caches, Node and uv installed by the emulated setup steps; not a GitHub-hosted runner',
      },
      configs,
      primary_config: primary.id,
      checks,
      pass: checks.every((c) => c.pass),
      notes: [
        'EMULATED. No GitHub Actions run was made: the workflows have not been pushed. The duration is that of the committed fast.yml\'s own steps, run one after another in a Docker container made to resemble a GitHub-hosted ubuntu-24.04 runner (4 CPUs, the size GitHub lists for a public repository [V, GitHub documentation read 2026-10-24]; Ubuntu 24.04; git, curl, Python 3 and xz installed before the clock starts because the hosted image carries them). The clock runs from the first step\'s start to the last step\'s end.',
        'What the emulation leaves out: queue time and runner start-up; GitHub\'s Actions cache, which setup-node would use for the npm cache (here every cache is cold, which is the slower case); the runner\'s tool cache, which holds Node (here it is downloaded and unpacked); GitHub\'s network; and the speed of a hosted runner\'s CPU. This host\'s cores are faster than a hosted runner\'s (not measured here), so a hosted run can take longer than these numbers; the headroom factor in values is the slowdown a hosted run could have before it exceeded the budget.',
        'The container\'s 4 CPUs are a quota on this host\'s 20 logical CPUs, not 4 pinned cores, and the host was shared with other Docker jobs and agents while this was recorded; its load was not measured. The three runs and the 2-CPU run show how much the figure moved.',
        `The checkout step copies this working tree (tracked files and untracked files that .gitignore lets through) and its .git, not a pushed commit: HEAD was ${commit}${dirty ? ' and the tree had uncommitted changes, which include the other W0 tasks\' deliverables' : ''}. The lane therefore ran over whatever those tasks had written at the time; a step that failed is listed in values.steps_failed (with the task that builds it: ${failing.map((s) => `${s.id}: ${owner(s.id) ?? 'no task'}`).join('; ') || 'none failed'}), and its verdict line in the primary configuration says what it found. Those failures are those tasks' work in progress or an owner action, not a property of the lane; a red lane is recorded as it was. A step that fails early shortens the run (npm test, for one, skips the vendored-code tests once a workspace's tests fail), so a green lane would run a little longer than these runs; the difference is small against the headroom.`,
        ...(overlay ? [`Overlay: ${overlay.reason}. The committed file hashes to ${overlay.replaced_sha256} and the overlay to ${overlay.sha256}; the difference is the new workspace's entries only. Until package-lock.json is regenerated (it is W0-S12's file), npm ci fails in the real fast lane: configuration fast-committed-lockfile is the same emulation on the committed file, and it stops at that step.`] : []),
        `The 300 s budget is the lane runner's own (lane.mjs fast, counted from the first step, so the setup steps are inside it); the job's timeout of 6 minutes is only a backstop. In these runs the slowest step was ${(() => { const s = [...primary.e.steps].sort((a, b) => b.duration_s - a.duration_s)[0]; return `"${s.name}" at ${s.duration_s} s`; })()}.`,
        `The fast lane ran ${lane.counts.pass + lane.counts.fail + lane.counts.error + lane.counts.timeout} steps and listed ${lane.counts.absent} gates as absent, because their scripts do not exist yet (each names the task that builds it); an absent gate is neither a pass nor a failure, and the lane gets slower as they arrive, which is what the budget watches.`,
        'The nightly configuration is the nightly lane run on this host with the host\'s Node and no container: it is not the digest-pinned Bench image (W0-T05\'s image is not published, so the BENCH_IMAGE variable cannot be set) and not GitHub. It shows that the lane writes status/nightly.json in the documented format; the generated file was moved under runs/ because status/nightly.json is a generated file that is never committed on the default branch (status/README.md).',
        'actionlint 1.7.12 (archive checked against its published SHA-256) ran with shellcheck 0.11.0 from the shellcheck-py wheel; both exited without a finding on the four workflows. The same command on a scratch workflow with a planted shell fault and a planted misspelled expression found both (actionlint/planted.txt), so a clean exit means something. shellcheck came from a PyPI wheel run with `uv run --with`, which is not how a hosted runner would get it; it checks the scripts, not the runner.',
        'Owner action that completes this record: push, require the check "fast lane" in the branch rules, dispatch fast.yml once (Actions > fast > Run workflow), read the run\'s duration from its page (first step start to last step end, as above) and add it as a configuration named github-hosted, then make it the primary configuration and set environment.emulated to false. The same run shows what the emulation missed.',
      ],
    };
    if (carried.configs.length > 0) {
      record.configs.push(...carried.configs);
      record.outputs.push(...carried.outputs);
      Object.assign(record.values, carried.values);
      record.checks.push(...carried.checks);
      record.pass = record.checks.every((c) => c.pass);
      record.notes = [
        `GitHub-hosted runs: configurations ${carried.configs.map((c) => c.id).join(', ')} are runs of the committed fast.yml on GitHub's runners, at earlier commits; they are carried from the previous record unchanged, with their files. The emulated configurations below are of this working tree.`,
        ...record.notes.filter((n) => !n.startsWith('EMULATED. No GitHub Actions run was made') && !n.startsWith('Owner action that completes this record')),
        ...carried.notes,
      ];
    }
    fs.writeFileSync(path.join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
    log(`wrote runs/${RUN_ID}.json: fast lane ${primary.e.duration_s} s (slowest of ${durations.join(', ')}), ${record.pass ? 'pass' : 'NOT PASS'}; recorded in ${round((Date.now() - recordedStart) / 1000, 0)} s`);
    // GATE-runs on the new record: a finding that names it is this script's fault; a finding about another record is not.
    const gate = sh(process.execPath, ['scripts/verify-runs.mjs']);
    const own = gate.stdout.split('\n').filter((l) => l.includes(RUN_ID));
    log(`GATE-runs: ${gate.stdout.trim().split('\n').at(-1)}${own.length ? `; ${own.length} line(s) name ${RUN_ID}` : ''}`);
    return own.length ? 1 : 0;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`record: ${e.stack ?? e.message}`);
    process.exit(1);
  },
);
