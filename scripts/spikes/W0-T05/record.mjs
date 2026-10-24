#!/usr/bin/env node
// W0-T05 recorder: builds the Bench image the way the devcontainer builds it, brings the devcontainer up with the
// devcontainer CLI, runs `statespace doctor` in it, and writes runs/RUN-doctor-devcontainer.json with its outputs
// under runs/RUN-doctor-devcontainer/. Dependency-free Node 22. It needs Docker with Compose, npx and the network
// (the image downloads its pinned tools; npx fetches the devcontainer CLI), and takes about ten minutes, because the
// recorded build runs without the layer cache.
//
//   node scripts/spikes/W0-T05/record.mjs
//   node scripts/spikes/W0-T05/record.mjs --reuse-build   development: build with the layer cache, and write the
//                                                         record to the scratch directory, not to runs/
//
// Everything runs in a clean copy of the working tree (the tracked files and the untracked files that .gitignore lets
// through, which is what a checkout holds), so that nothing a test left behind, such as a __pycache__ directory, is in
// the build context. What it runs, in order: `devcontainer build --no-cache`, the cold build of the image through the
// devcontainer's own compose file; the devcontainer as shipped (default Docker confinement), with its postCreateCommand
// run after the memory cap is in place; `statespace doctor` in it, three ways; the sandbox hint table against the canary
// lines that W0-S06 recorded; doctor as root, as the nightly lane runs the image; two planted faults; then the same
// devcontainer with the opt-in sandbox profile, which is a change of the one line of devcontainer.json that its comment
// names. Every container is capped at 6 GiB with `docker update` before anything runs in it, and every container is
// removed at the end. The image stays.
//
// Set TMPDIR to a scratch directory first: the clean copy, the devcontainer CLI's npm cache and the override file live
// there.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ID = 'RUN-doctor-devcontainer';
const REUSE = process.argv.includes('--reuse-build');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'w0t05-'));
const WORK = path.join(scratch, 'statespace'); // the clean copy; its name is the repository's, which names the compose project
const OUT = REUSE ? path.join(scratch, 'out', ID) : path.join(REPO, 'runs', ID);
const RECORD = REUSE ? path.join(scratch, 'out', `${ID}.json`) : path.join(REPO, 'runs', `${ID}.json`);
const CLI_PACKAGE = '@devcontainers/cli@0.89.0';
const IMAGE_TAG = 'statespace-bench:w0t05';
const MEMORY = '6g';
const MEMORY_BYTES = 6 * 2 ** 30;
const user = os.userInfo().username;

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sha256File = (file) => sha256(fs.readFileSync(file));
const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const lines = (text) => text.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.length > 0);

/** Replace host paths and the account name in captured text, so that no record names a private location. */
function scrub(text) {
  let out = String(text);
  for (const [from, to] of [[scratch, '<sandbox>'], [os.tmpdir(), '<sandbox>'], [REPO, '<repo>'], [os.homedir(), '<home>'], [user, '<user>']]) {
    if (from && from.length > 2) out = out.split(from).join(to);
  }
  return out;
}

/** Run a command, timed. Never throws on a non-zero exit. */
function exec(cmd, args, opts = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 29, cwd: WORK, ...opts });
  return { cmd, args, status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', started_at: new Date(t0).toISOString(), duration_s: round((Date.now() - t0) / 1000) };
}
function must(cmd, args, opts) {
  const r = exec(cmd, args, opts);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}\n${scrub(r.stderr.slice(-2000))}`);
  return r;
}

/** A checkout: the tracked files and the untracked files that .gitignore lets through. */
function copyWorkingTree() {
  const list = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (list.status !== 0) throw new Error('git ls-files failed');
  const files = list.stdout.split('\0').filter(Boolean);
  for (const rel of files) {
    const from = path.join(REPO, rel);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) continue;
    fs.mkdirSync(path.dirname(path.join(WORK, rel)), { recursive: true });
    fs.copyFileSync(from, path.join(WORK, rel));
    fs.chmodSync(path.join(WORK, rel), fs.statSync(from).mode);
  }
  return files.length;
}
const copiedFiles = copyWorkingTree();

const outputs = [];
function writeOutput(rel, content, kind, compare) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = scrub(typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  fs.writeFileSync(file, text);
  outputs.push({ path: `runs/${ID}/${rel}`, sha256: sha256(Buffer.from(text)), bytes: Buffer.byteLength(text), kind, compare });
}
const treeDigest = (dir) => {
  const entries = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__pycache__') walk(f);
      } else entries.push(`${path.relative(REPO, f)} ${sha256File(f)}`);
    }
  };
  walk(path.join(REPO, dir));
  return { path: `${dir}/`, sha256: sha256(entries.join('\n')), files: entries.length, sha256_method: 'SHA-256 of the lines "<path> <SHA-256>" for every file, sorted by name, joined by newlines' };
};
const fileInput = (file, role) => ({ path: file, sha256: sha256File(path.join(REPO, file)), bytes: fs.statSync(path.join(REPO, file)).size, role });

// -------------------------------------------------------------------------------------------- the commands
const cliEnv = (extra = {}) => ({ ...process.env, npm_config_cache: path.join(scratch, 'npm-cache'), npm_config_update_notifier: 'false', BUILDX_NO_DEFAULT_ATTESTATIONS: '1', ...extra });
const cli = (args, env) => exec('npx', ['--yes', CLI_PACKAGE, ...args], { env: cliEnv(env) });
const configs = [];
function config(id, purpose, r, extra = {}) {
  const c = { id, purpose, argv: [r.cmd, ...r.args].map(scrub), exit_code: r.status, started_at: r.started_at, duration_s: r.duration_s, ...extra };
  configs.push(c);
  return c;
}
const out = (r) => scrub(r.stdout + r.stderr);

// -------------------------------------------------------------------------------------------- 1. the image
// The cold build, through the devcontainer's own compose file, as a Codespaces prebuild runs it: no container starts.
const build = cli(['build', '--workspace-folder', '.', ...(REUSE ? [] : ['--no-cache'])], { STATESPACE_BENCH_IMAGE: '' });
if (build.status !== 0) {
  console.error(scrub(build.stderr.slice(-3000)));
  throw new Error('the image did not build');
}
const baseName = JSON.parse(lines(build.stdout).pop() ?? '{}').imageName;
const imageInfo = (name) => JSON.parse(must('docker', ['image', 'inspect', name]).stdout)[0];
const imageId = (name) => imageInfo(name).Id;
const coldDigest = imageId(baseName);
const coldLayers = imageInfo(baseName).RootFS.Layers;
// A build that reuses the cache has another manifest digest than the cold build, with the same layers (the devcontainer
// CLI builds with BUILDKIT_INLINE_CACHE=1, which puts cache metadata into the image config). A second build, with the
// cache, gives the digest that every later build of this checkout reproduces; that is the image of record.
const warm = cli(['build', '--workspace-folder', '.'], { STATESPACE_BENCH_IMAGE: '' });
if (warm.status !== 0) throw new Error(`the second build failed: ${scrub(warm.stderr.slice(-2000))}`);
const imageDigest = imageId(baseName);
const imageRef = `statespace-bench@${imageDigest}`;
must('docker', ['tag', baseName, IMAGE_TAG]);
const inspect = JSON.parse(must('docker', ['image', 'inspect', IMAGE_TAG]).stdout)[0];
// A RUN step's CreatedBy starts with the build arguments; what identifies the step is the command after `/bin/sh -c`.
const history = must('docker', ['history', '--human=false', '--no-trunc', '--format', '{{.Size}}\t{{.CreatedBy}}', IMAGE_TAG]).stdout.split('\n').filter(Boolean).map((h) => { const [size, by] = h.split('\t'); const at = by.indexOf('/bin/sh -c '); return { bytes: Number(size), step: (at >= 0 ? `RUN ${by.slice(at + 11)}` : by).replace(/\s+/g, ' ') }; });
const unpacked = Number(must('docker', ['run', '--rm', `--memory=${MEMORY}`, '--user', 'root', '--entrypoint', 'du', IMAGE_TAG, '-sxb', '/']).stdout.trim().split(/\s+/)[0]);
const imageFacts = {
  id: imageDigest,
  built_as: baseName,
  media_type: inspect.Descriptor?.mediaType ?? null,
  architecture: inspect.Architecture,
  os: inspect.Os,
  created: inspect.Created,
  inspect_size_bytes: inspect.Size,
  images_disk_usage: must('docker', ['images', '--format', '{{.Size}}', IMAGE_TAG]).stdout.trim(),
  unpacked_rootfs_bytes: unpacked,
  sum_of_layer_sizes_bytes: history.reduce((a, h) => a + h.bytes, 0),
  layers: inspect.RootFS.Layers.length,
  layer_diff_ids: inspect.RootFS.Layers,
  user: inspect.Config.User,
  env: inspect.Config.Env,
  steps_over_50_MB: history.filter((h) => h.bytes > 50e6).sort((a, b) => b.bytes - a.bytes).map((h) => ({ bytes: h.bytes, step: h.step.slice(0, 120) })),
};
writeOutput('image-facts.json', imageFacts, 'what docker image inspect, docker history and du say about the image', 'informational: digests and sizes vary with every build');

// The build log, cut to what a reader needs: each step, its time, the export lines and the last step's output.
{
  const all = scrub(`${build.stdout}${build.stderr}`).split('\n').map((l) => l.replace(/^\[[0-9T:.Z-]+\] /, ''));
  const doctorStep = all.find((l) => /^#\d+ \[[^\]]+ \d+\/\d+\] RUN statespace doctor/.test(l)) ?? '';
  const n = (doctorStep.match(/^#(\d+) /) ?? [])[1];
  const keep = all.filter((l) => /^#\d+ \[[^\]]+\] /.test(l) || /^#\d+ (DONE|CACHED)/.test(l) || /^#\d+ exporting (manifest|config|layers)/.test(l) || (n && /^#\d+ \d+\.\d+ /.test(l) && l.startsWith(`#${n} `)));
  const text = keep.map((l) => (n && l.startsWith(`#${n} `) && /^#\d+ \d+\.\d+ /.test(l) ? `    ${l.replace(/^#\d+ \d+\.\d+ /, '')}` : l)).join('\n') + '\n';
  writeOutput('image-build.txt', text, 'the image build: its steps and times, the export lines, and the output of the last step (statespace doctor)', 'informational: times and digests vary');
  config('image-build', `the Bench image built through the devcontainer's compose file ${REUSE ? 'with the layer cache (a development run)' : 'without the layer cache'}: the last step of the Dockerfile is \`statespace doctor --skip postgres --sandbox off\`, which compares every tool with its pin and fails the build on any difference`, build, {
    verdict_lines: lines(text).filter((l) => /^ {4}(green|NOT green|block:)/.test(l)).map((l) => l.trim()),
    outputs: [`runs/${ID}/image-build.txt`, `runs/${ID}/image-facts.json`],
  });
  config('image-rebuild', 'the same build again with the layer cache: the image of record; its layers are those of the cold build, and every later build of this checkout reproduces its digest', warm, { verdict_lines: [`image: ${imageDigest}`], outputs: [] });
}

// -------------------------------------------------------------------------------------- 2. the devcontainer
const containerEnv = { STATESPACE_BENCH_IMAGE: imageRef };
const projectContainers = (project) => must('docker', ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`]).stdout.split('\n').filter(Boolean);
const benchContainer = (project) => must('docker', ['ps', '-q', '--filter', `label=com.docker.compose.project=${project}`, '--filter', 'label=com.docker.compose.service=bench']).stdout.trim();
const outcomeOf = (stdout) => { try { return JSON.parse(lines(stdout).pop() ?? '{}'); } catch { return {}; } };
let project = null;
let projectName = null;

function bringUp(label, extraArgs) {
  const up = cli(['up', '--workspace-folder', '.', '--skip-post-create', ...extraArgs], containerEnv);
  if (up.status !== 0) throw new Error(`devcontainer up (${label}) failed: ${scrub(up.stderr.slice(-2000))}`);
  const outcome = outcomeOf(up.stdout);
  project = projectName = outcome.composeProjectName;
  for (const id of projectContainers(project)) must('docker', ['update', `--memory=${MEMORY}`, `--memory-swap=${MEMORY}`, id]);
  const post = cli(['run-user-commands', '--workspace-folder', '.', ...extraArgs], containerEnv);
  return { up, outcome, post };
}
function tearDown() {
  if (!project) return;
  exec('docker', ['compose', '-p', project, '-f', '.devcontainer/docker-compose.yml', 'down', '-v', '--timeout', '5']);
  project = null;
}
process.on('exit', () => { try { tearDown(); } catch { /* a normal run has torn down already */ } });

function containerFacts(id) {
  const c = JSON.parse(must('docker', ['inspect', id]).stdout)[0];
  const img = JSON.parse(must('docker', ['image', 'inspect', c.Image]).stdout)[0];
  return {
    image_id: c.Image,
    image_layers: img.RootFS.Layers.length,
    user: c.Config.User,
    memory_bytes: c.HostConfig.Memory,
    memory_swap_bytes: c.HostConfig.MemorySwap,
    security_opt: (c.HostConfig.SecurityOpt ?? []).map((s) => (s.startsWith('seccomp=') ? `seccomp=<the profile, ${s.length - 8} characters>` : s)),
    masked_paths: (c.HostConfig.MaskedPaths ?? []).length,
    readonly_paths: (c.HostConfig.ReadonlyPaths ?? []).length,
    privileged: c.HostConfig.Privileged,
    cap_add: c.HostConfig.CapAdd ?? [],
    layer_prefix_equals_built_image: JSON.stringify(img.RootFS.Layers.slice(0, imageFacts.layers)) === JSON.stringify(imageFacts.layer_diff_ids),
    env_image: (c.Config.Env.find((e) => e.startsWith('STATESPACE_BENCH_IMAGE=')) ?? '').split('=').slice(1).join('='),
  };
}
const doctorIn = (args, extraCli = []) => cli(['exec', '--workspace-folder', '.', ...extraCli, 'statespace', 'doctor', ...args], containerEnv);
/** The lines of a doctor report that carry the verdict: everything before the environment block, and the closing lines. */
const verdictOf = (text) => {
  const ls = lines(text);
  const cut = ls.findIndex((l) => l.startsWith('Environment block'));
  return [...ls.slice(0, cut < 0 ? ls.length : cut), ...ls.slice(-3).filter((l) => /^(block:|green:|NOT green:|note:)/.test(l))];
};
const inContainer = (id, args, opts = {}) => exec('docker', ['exec', ...(opts.input !== undefined ? ['-i'] : []), ...(opts.user ? ['--user', opts.user] : []), id, ...args], opts.input !== undefined ? { input: opts.input } : {});

const up1 = bringUp('default confinement', []);
const bench = benchContainer(project);
const rebuiltDigest = imageId(baseName); // the devcontainer CLI builds the image again on `up`; with a warm cache it is the same image
const defaultFacts = containerFacts(bench);
writeOutput('devcontainer-up.txt', `${JSON.stringify({ outcome: up1.outcome.outcome, composeProjectName: up1.outcome.composeProjectName, remoteUser: up1.outcome.remoteUser, remoteWorkspaceFolder: up1.outcome.remoteWorkspaceFolder }, null, 2)}\n\n# postCreateCommand (statespace doctor || true), run by devcontainer run-user-commands after the memory cap\n${out(up1.post)}`, 'devcontainer up, then the lifecycle commands: the outcome, and what postCreateCommand printed', 'informational: times vary');
config('devcontainer-up', 'the devcontainer as shipped, brought up by the devcontainer CLI: the Bench image beside the PostgreSQL service container, under default Docker confinement', up1.up, { verdict_lines: [`outcome: ${up1.outcome.outcome}`], outputs: [`runs/${ID}/devcontainer-up.txt`] });

const dText = doctorIn([]);
const dJson = doctorIn(['--json']);
const dBlock = doctorIn(['--block']);
const report = JSON.parse(dJson.stdout);
writeOutput('doctor.txt', dText.stdout, '`statespace doctor` in the devcontainer, as printed', 'informational: the digest and the times differ with every build');
writeOutput('doctor.json', report, '`statespace doctor --json` in the devcontainer', 'informational');
writeOutput('doctor-block.json', JSON.parse(dBlock.stdout), '`statespace doctor --block`: the environment and tools of a receipt', 'informational');
const primary = config('doctor', 'statespace doctor in the devcontainer as shipped: every tool compared with its pin, the sandbox canary under default Docker confinement, and the receipt-ready block', dText, { verdict_lines: verdictOf(dText.stdout), outputs: [`runs/${ID}/doctor.txt`, `runs/${ID}/doctor.json`, `runs/${ID}/doctor-block.json`] });
config('doctor-json', 'the same report as JSON', dJson, { verdict_lines: [`green: ${report.green}`, `image: ${report.image}`], outputs: [`runs/${ID}/doctor.json`] });
config('doctor-block', 'only the environment block, as a receipt takes it', dBlock, { verdict_lines: [], outputs: [`runs/${ID}/doctor-block.json`] });

const installedDoctorSha = inContainer(bench, ['sh', '-c', 'sha256sum "$(python -c "import statespace.doctor as d; print(d.__file__)")" | cut -d" " -f1']).stdout.trim();

// the hint table against every canary line that W0-S06 recorded
const hintCode = [
  'import json, pathlib',
  'from statespace import doctor',
  "root = pathlib.Path('/workspaces/statespace/runs/RUN-bwrap-lanes')",
  'rows = []',
  "for path in sorted(root.glob('*/steps/0[12]-canary-*.out')):",
  "    meta = path.with_suffix('.meta').read_text()",
  "    rc = next((l.split('=', 1)[1] for l in meta.splitlines() if l.startswith('rc=')), None)",
  "    line = next((l for l in path.read_text().splitlines() if l.startswith('bwrap: ')), None)",
  '    step = path.parent.parent.name + "/" + path.stem',
  '    if rc == "0" or line is None:',
  '        rows.append({"step": step, "rc": rc, "line": None, "meaning": None})',
  '        continue',
  '    s = doctor.sandbox_failed(line, "recorded")',
  '    rows.append({"step": step, "rc": rc, "line": line, "meaning": s.meaning, "change": s.change})',
  'print(json.dumps(rows))',
].join('\n');
const hint = inContainer(bench, ['python', '-I', '-'], { input: hintCode });
const hintRows = JSON.parse(hint.stdout || '[]');
const failing = hintRows.filter((r) => r.line !== null);
const unmatched = failing.filter((r) => !r.meaning);
const byMeaning = new Map();
for (const r of failing) byMeaning.set(r.meaning ?? 'NO HINT', new Set([...(byMeaning.get(r.meaning ?? 'NO HINT') ?? []), r.line.replace(/, likely because.*/, ', likely because ...')]));
const hintReport = { canary_outputs_read: hintRows.length, failing_with_a_bwrap_line: failing.length, without_a_hint: unmatched.length, hints: Object.fromEntries([...byMeaning].map(([k, v]) => [k, [...v]])) };
writeOutput('hint-table.json', hintReport, 'every canary output that W0-S06 recorded, run through the sandbox hint table of statespace doctor', 'informational');
config('hint-table', 'the sandbox hint table against every canary output of RUN-bwrap-lanes', hint, { verdict_lines: [`${failing.length} failing canary lines, ${unmatched.length} without a hint`], outputs: [`runs/${ID}/hint-table.json`] });

// as root, the way the nightly and monthly lanes run the image (container options --user root)
const asRoot = inContainer(bench, ['sh', '-c', 'command -v git elan; git --version; statespace doctor'], { user: 'root' });
writeOutput('doctor-as-root.txt', asRoot.stdout + asRoot.stderr, 'git and elan on PATH, then `statespace doctor`, as root', 'informational');
config('doctor-as-root', 'the nightly and monthly lanes run the image with --user root, and need git and elan on PATH', asRoot, { verdict_lines: lines(asRoot.stdout).filter((l) => /^(green:|NOT green:)/.test(l)), outputs: [`runs/${ID}/doctor-as-root.txt`] });

// planted faults: each must turn the run red, on the check that names it
const tamper = [
  'set -e', 'd=$(mktemp -d)',
  'cp --no-preserve=mode /opt/tla2tools/tla2tools-1.8.0.jar /opt/tla2tools/tla2tools-1.7.4.jar "$d"/',
  'cp --no-preserve=mode /opt/tla2tools/tla2tools-1.7.4.jar "$d"/tla2tools-1.8.0.jar',
  `python -I -c "import sys, zipfile; z = zipfile.ZipFile(sys.argv[1], 'a'); z.comment = b'planted'; z.close()" "$d"/tla2tools-1.7.4.jar`,
  'set +e', 'STATESPACE_TLA2TOOLS_DIR="$d" statespace doctor --skip postgres --sandbox off --json', 'echo "exit=$?" >&2', 'rm -rf "$d"',
].join('\n');
const tamperRun = inContainer(bench, ['sh', '-c', tamper]);
const tamperExit = Number((tamperRun.stderr.match(/exit=(\d+)/) ?? [])[1] ?? NaN);
const tamperReport = JSON.parse(tamperRun.stdout);
const statusOf = (rep, id) => rep.checks.find((c) => c.id === id)?.status;
writeOutput('control-tampered-jars.json', { exit_code: tamperExit, 'tlc-1.8.0': tamperReport.checks.find((c) => c.id === 'tlc-1.8.0'), 'tlc-1.7.4': tamperReport.checks.find((c) => c.id === 'tlc-1.7.4'), tlc_in_block: tamperReport.block.tools.filter((t) => t.name === 'tlc') }, 'the 1.7.4 jar under the 1.8.0 name, and the 1.7.4 jar with a zip comment added', 'informational');
config('control-tampered-jars', 'planted fault: STATESPACE_TLA2TOOLS_DIR holds the 1.7.4 jar under the 1.8.0 name (the version and the hash differ) and a 1.7.4 jar with a zip comment added (the jar runs and prints its banner; only its hash differs)', tamperRun, { exit_code: tamperExit, verdict_lines: [`tlc-1.8.0: ${statusOf(tamperReport, 'tlc-1.8.0')}`, `tlc-1.7.4: ${statusOf(tamperReport, 'tlc-1.7.4')}`, `green: ${tamperReport.green}`], outputs: [`runs/${ID}/control-tampered-jars.json`] });

const pgRun = inContainer(bench, ['statespace', 'doctor', '--sandbox', 'off', '--json', '--pg-dsn', 'postgresql://postgres@127.0.0.1:1/postgres']);
const pgReport = JSON.parse(pgRun.stdout);
writeOutput('control-postgres-unreachable.json', { exit_code: pgRun.status, postgres: pgReport.checks.find((c) => c.id === 'postgres'), other_checks_not_ok: pgReport.checks.filter((c) => c.id !== 'postgres' && c.status !== 'ok').map((c) => c.id) }, 'doctor pointed at a PostgreSQL port with nothing behind it', 'informational');
config('control-postgres-unreachable', 'planted fault: --pg-dsn names a port with no server', pgRun, { verdict_lines: [`postgres: ${statusOf(pgReport, 'postgres')}`, `green: ${pgReport.green}`], outputs: [`runs/${ID}/control-postgres-unreachable.json`] });
tearDown();

// ------------------------------------------------------------------------------------ 3. the opt-in profile
// The change a learner makes: the one line of devcontainer.json that names the compose files (its comment says so).
const shipped = fs.readFileSync(path.join(WORK, '.devcontainer', 'devcontainer.json'), 'utf8');
const sandboxJson = shipped.replace('"dockerComposeFile": ["docker-compose.yml"]', `"dockerComposeFile": ["${path.join(WORK, '.devcontainer', 'docker-compose.yml')}", "${path.join(WORK, '.devcontainer', 'docker-compose.sandbox.yml')}"]`);
if (sandboxJson === shipped) throw new Error('devcontainer.json no longer has the line that the opt-in comment names');
const overrideFile = path.join(scratch, 'devcontainer.sandbox.json');
fs.writeFileSync(overrideFile, sandboxJson);
const overrideArgs = ['--override-config', overrideFile];
const up2 = bringUp('opt-in sandbox profile', overrideArgs);
const optinRebuiltDigest = imageId(baseName);
const optinFacts = containerFacts(benchContainer(project));
const oText = doctorIn([], overrideArgs);
const oReport = JSON.parse(doctorIn(['--json'], overrideArgs).stdout);
writeOutput('doctor-sandbox-opt-in.txt', oText.stdout, '`statespace doctor` in the devcontainer with docker-compose.sandbox.yml named in devcontainer.json', 'informational');
writeOutput('devcontainer.sandbox.json', sandboxJson, 'devcontainer.json with the opt-in compose file named; the paths are absolute for the CLI (the checkout is shown under <sandbox>)', 'informational');
config('devcontainer-up-opt-in', 'the same devcontainer with the opt-in profile: the line of devcontainer.json that names the compose files lists docker-compose.sandbox.yml too', up2.up, { verdict_lines: [`outcome: ${up2.outcome.outcome}`], outputs: [`runs/${ID}/devcontainer.sandbox.json`] });
config('doctor-opt-in', 'statespace doctor with the narrow seccomp profile, systempaths=unconfined and apparmor=unconfined', oText, { verdict_lines: verdictOf(oText.stdout), outputs: [`runs/${ID}/doctor-sandbox-opt-in.txt`] });
tearDown();

// ------------------------------------------------------------------------------------------- the record
// The tag of tla2tools 1.8.0 as GitHub lists it today: not the jar the course ran.
const github = exec('curl', ['-fsSL', '--max-time', '60', 'https://api.github.com/repos/tlaplus/tlaplus/releases/tags/v1.8.0']);
let release = null;
if (github.status === 0) {
  const r = JSON.parse(github.stdout);
  const asset = r.assets.find((a) => a.name === 'tla2tools.jar');
  release = { read_at: github.started_at, url: 'https://api.github.com/repos/tlaplus/tlaplus/releases/tags/v1.8.0', tag: r.tag_name, prerelease: r.prerelease, published_at: r.published_at, asset: { name: asset.name, bytes: asset.size, sha256: String(asset.digest).replace(/^sha256:/, ''), updated_at: asset.updated_at } };
  writeOutput('tla2tools-release-asset.json', release, 'the v1.8.0 release asset of tlaplus/tlaplus as the GitHub API listed it when this run was recorded', 'informational: the tag is re-published');
}

const checkById = (id) => report.checks.find((c) => c.id === id);
const tlc = { '1.8.0': checkById('tlc-1.8.0'), '1.7.4': checkById('tlc-1.7.4') };
const scaffoldLock = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', 'RUN-scaffold.json'), 'utf8')).outputs.find((o) => o.path.endsWith('Cargo.lock'));
const tlcJarsRun = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', 'RUN-tlc-jars.json'), 'utf8'));
const dockerfile = fs.readFileSync(path.join(REPO, 'bench/image/Dockerfile'), 'utf8');
const pin = (name) => (dockerfile.match(new RegExp(`ARG ${name}=([0-9a-f]{64})`)) ?? [])[1];
const baseImages = [...dockerfile.matchAll(/ARG (?:UBUNTU|TEMURIN)_IMAGE=(\S+)/g)].map((m) => m[1]);
const composePg = (fs.readFileSync(path.join(REPO, '.devcontainer/docker-compose.yml'), 'utf8').match(/postgres:18@sha256:[0-9a-f]{64}/) ?? [])[0];
const manifestKinds = ['application/vnd.docker.distribution.manifest.v2+json', 'application/vnd.oci.image.manifest.v1+json'];
const nonSkipped = report.checks.filter((c) => c.status !== 'skipped');

const checks = [
  { id: 'image-built-cold', pass: build.status === 0 && (REUSE || build.args.includes('--no-cache')), detail: 'devcontainer build --no-cache through .devcontainer/docker-compose.yml, whose Dockerfile ends with statespace doctor' },
  { id: 'cold-and-cached-builds-have-the-same-layers', pass: JSON.stringify(coldLayers) === JSON.stringify(imageFacts.layer_diff_ids), detail: `the ${coldLayers.length} layers of the cold build (manifest ${coldDigest}) equal those of the cached build (manifest ${imageDigest})` },
  { id: 'devcontainer-up-reproduces-the-image-digest', pass: rebuiltDigest === imageDigest && optinRebuiltDigest === imageDigest, detail: `devcontainer up built the image again, twice, and got ${rebuiltDigest} and ${optinRebuiltDigest}; the cached build gave ${imageDigest}` },
  { id: 'image-digest-is-an-image-manifest', pass: /^sha256:[0-9a-f]{64}$/.test(imageDigest) && manifestKinds.includes(imageFacts.media_type), detail: `the image ID is ${imageDigest}, and its descriptor is ${imageFacts.media_type}` },
  { id: 'doctor-green-in-devcontainer', pass: dText.status === 0 && report.green === true, detail: 'exit code 0 and green: true' },
  { id: 'doctor-names-the-image-digest', pass: report.image === imageDigest, detail: 'the image line of the report is the digest recorded here' },
  { id: 'every-tool-in-the-block-is-pinned', pass: report.block.tools.length === 11 && report.block.tools.every((t) => t.pinned === true), detail: `${report.block.tools.length} tools, ${report.block.tools.filter((t) => t.pinned).length} pinned` },
  { id: 'block-valid-against-receipt', pass: Array.isArray(report.block_problems) && report.block_problems.length === 0, detail: 'environment and tools validate as part of a receipt@1' },
  { id: 'devcontainer-runs-the-built-layers', pass: defaultFacts.layer_prefix_equals_built_image === true && defaultFacts.env_image === imageRef, detail: `the container's image has ${defaultFacts.image_layers} layers, the first ${imageFacts.layers} equal to the built image's; STATESPACE_BENCH_IMAGE is ${imageRef}` },
  { id: 'default-confinement-kept', pass: defaultFacts.security_opt.length === 0 && defaultFacts.masked_paths > 0 && defaultFacts.privileged === false && defaultFacts.cap_add.length === 0, detail: 'no security options, masked paths in place, not privileged, no added capability' },
  { id: 'default-sandbox-failed-with-the-recorded-line', pass: report.sandbox.state === 'failed' && /^bwrap: No permissions to create new namespace/.test(report.sandbox.detail ?? '') && Boolean(report.sandbox.meaning), detail: 'the line W0-S06 recorded for default Docker, with its hint' },
  { id: 'hint-table-covers-recorded-lines', pass: failing.length > 0 && unmatched.length === 0, detail: `${failing.length} failing canary lines of RUN-bwrap-lanes, ${unmatched.length} without a hint` },
  { id: 'opt-in-sandbox-on', pass: oReport.sandbox.state === 'on' && oText.status === 0 && oReport.image === imageDigest && optinFacts.layer_prefix_equals_built_image === true && optinFacts.masked_paths === 0 && optinFacts.privileged === false && optinFacts.cap_add.length === 0, detail: 'the narrow seccomp profile, systempaths=unconfined and apparmor=unconfined: the canary starts; not privileged, no added capability' },
  { id: 'doctor-green-as-root', pass: asRoot.status === 0, detail: 'the nightly and monthly lanes run the image as root' },
  { id: 'tampered-jars-turn-the-run-red', pass: tamperExit === 1 && statusOf(tamperReport, 'tlc-1.8.0') === 'mismatch' && statusOf(tamperReport, 'tlc-1.7.4') === 'unpinned' && tamperReport.block.tools.filter((t) => t.name === 'tlc').every((t) => t.pinned === false), detail: 'exit 1; a wrong version is a mismatch, a changed hash is unpinned, and the block flags both as not pinned' },
  { id: 'unreachable-postgres-turns-the-run-red', pass: pgRun.status === 1 && statusOf(pgReport, 'postgres') === 'missing' && pgReport.checks.filter((c) => c.id !== 'postgres' && c.status !== 'ok').length === 0, detail: 'only the PostgreSQL check fails' },
  { id: 'installed-doctor-is-the-repository-copy', pass: installedDoctorSha === sha256File(path.join(REPO, 'bench/statespace/doctor.py')), detail: 'the doctor.py in the image has the SHA-256 of bench/statespace/doctor.py' },
  { id: 'tlc-jars-are-those-of-RUN-tlc-jars', pass: tlc['1.8.0']?.found.sha256 === tlcJarsRun.values['tla2tools-1.8.0.jar'] && tlc['1.7.4']?.found.sha256 === tlcJarsRun.values['tla2tools-1.7.4.jar'], detail: 'the SHA-256 of both jars in the image equal the values of RUN-tlc-jars' },
  { id: 'rust-lock-is-the-scaffolds', pass: sha256File(path.join(REPO, 'bench/image/rust/Cargo.lock')) === scaffoldLock.sha256, detail: 'bench/image/rust/Cargo.lock has the SHA-256 that RUN-scaffold records for its Cargo.lock' },
  { id: 'every-container-capped-and-removed', pass: defaultFacts.memory_bytes === MEMORY_BYTES && optinFacts.memory_bytes === MEMORY_BYTES && projectContainers(projectName).length === 0, detail: 'capped at 6 GiB before anything ran in it; none left' },
];

const dockerVersion = must('docker', ['version', '--format', '{{.Server.Version}}']).stdout.trim();
const composeVersion = must('docker', ['compose', 'version', '--short']).stdout.trim();
const cliVersion = cli(['--version']).stdout.trim();
const cliIntegrity = (() => { const r = exec('npm', ['view', CLI_PACKAGE, 'dist.integrity', 'dist.shasum'], { env: cliEnv() }); return r.status === 0 ? lines(r.stdout).join(' ') : null; })();
const download = (name, url, sha, bytes) => ({ name, url, sha256: sha, ...(bytes ? { bytes } : {}), committed: false });
const pgCheck = checkById('postgres');
const arch = os.arch() === 'x64' ? 'x86_64' : os.arch();

const values = {
  image: imageRef,
  image_digest: imageDigest,
  image_digest_kind: 'the manifest digest of a local build (with the containerd image store and no attestation, the image ID); a registry digest exists once CI pushes the image',
  image_digest_of_the_cold_build: coldDigest,
  image_architecture: imageFacts.architecture,
  image_os: imageFacts.os,
  image_created: imageFacts.created,
  image_layers: imageFacts.layers,
  image_size_inspect_bytes: imageFacts.inspect_size_bytes,
  image_size_unpacked_bytes: imageFacts.unpacked_rootfs_bytes,
  image_size_sum_of_layers_bytes: imageFacts.sum_of_layer_sizes_bytes,
  image_size_docker_images: imageFacts.images_disk_usage,
  base_ubuntu: baseImages[0],
  base_temurin: baseImages[1],
  postgres_service_image: composePg,
  postgres_version: pgCheck?.found.version,
  tlc_jars_shipped_in: '/opt/tla2tools/ in the image, copied by the Dockerfile from bench/image/tla2tools/ in the repository and checked against the pinned SHA-256 before the build goes on',
  tlc_jar_1_8_0_path: tlc['1.8.0']?.found.path,
  tlc_jar_1_8_0_sha256: tlc['1.8.0']?.found.sha256,
  tlc_jar_1_7_4_path: tlc['1.7.4']?.found.path,
  tlc_jar_1_7_4_sha256: tlc['1.7.4']?.found.sha256,
  tlc_1_8_0_tag_asset_when_recorded: release?.asset ?? null,
  doctor_version: report.doctor.version,
  doctor_exit_code: dText.status,
  doctor_green: report.green,
  doctor_checks: report.checks.length,
  doctor_checks_ok: nonSkipped.filter((c) => c.status === 'ok').length,
  doctor_seconds: primary.duration_s,
  tools_in_block: report.block.tools.map((t) => ({ name: t.name, version: t.version, sha256: t.sha256, pinned: t.pinned })),
  sandbox_default_confinement: { state: report.sandbox.state, detail: report.sandbox.detail, meaning: report.sandbox.meaning, change: report.sandbox.change, facts: report.sandbox.context },
  sandbox_opt_in: { state: oReport.sandbox.state, security_opt: optinFacts.security_opt, masked_paths: optinFacts.masked_paths, privileged: optinFacts.privileged },
  devcontainer_cli: { version: cliVersion, package: CLI_PACKAGE, npm_integrity: cliIntegrity },
  container_image_layers: { built_image: imageFacts.layers, devcontainer_container: defaultFacts.image_layers },
  hint_table: { canary_lines_failing: failing.length, without_a_hint: unmatched.length },
  working_tree_files: copiedFiles,
  tlc_smoke_model: 'three states, one worker, -deadlock: 3 states generated, 3 distinct states found, no error, on both jars',
};

const record = {
  id: ID,
  title: '`statespace doctor` green in the Bench devcontainer: the image built from bench/image/Dockerfile, its digest, size and architecture, and where the pinned TLC jars ship',
  task: 'W0-T05',
  origin: 'recorded',
  engine: 'statespace',
  version: report.doctor.version,
  version_string: `statespace doctor ${report.doctor.version}`,
  binary: "statespace/doctor.py as installed in the Bench image by `uv sync` from bench/; the record checks that its SHA-256 is the repository copy's",
  binary_sha256: installedDoctorSha,
  image: imageRef,
  recorded_at: new Date().toISOString(),
  started_at: build.started_at,
  duration_s: round(configs.reduce((a, c) => a + (c.duration_s ?? 0), 0)),
  primary_config: 'doctor',
  argv: primary.argv,
  inputs: [
    fileInput('bench/image/Dockerfile', 'the image recipe'),
    fileInput('bench/image/Dockerfile.dockerignore', 'what the build context lets through'),
    fileInput('bench/pyproject.toml', "the command line's project file"),
    fileInput('bench/uv.lock', 'every Python wheel the image installs, with hashes'),
    treeDigest('bench/statespace'),
    fileInput('bench/image/rust/Cargo.toml', "the pinned crates: RUN-scaffold's manifest"),
    fileInput('bench/image/rust/Cargo.lock', "the pinned crates: RUN-scaffold's lock"),
    fileInput('bench/image/tla2tools/tla2tools-1.8.0.jar', 'TLC 1.8.0, the jar of RUN-tlc-jars, vendored'),
    fileInput('bench/image/tla2tools/tla2tools-1.7.4.jar', 'TLC 1.7.4, the jar of RUN-tlc-jars, vendored'),
    fileInput('bench/image/tla2tools/LICENSE', 'the MIT license of tla2tools'),
    fileInput('.devcontainer/devcontainer.json', 'the devcontainer'),
    fileInput('.devcontainer/docker-compose.yml', 'its services'),
    fileInput('.devcontainer/docker-compose.sandbox.yml', 'the opt-in sandbox profile'),
    fileInput('.devcontainer/seccomp/lean-sandbox.json', 'the opt-in seccomp profile'),
    fileInput('scripts/spikes/W0-T05/record.mjs', 'this recorder'),
    { name: baseImages[0], sha256: baseImages[0].split('sha256:')[1], kind: 'base image, by index digest', committed: false },
    { name: baseImages[1], sha256: baseImages[1].split('sha256:')[1], kind: 'Java 21 as the Temurin image has it, by index digest', committed: false },
    { name: composePg, sha256: composePg.split('sha256:')[1], kind: 'the PostgreSQL service image, by index digest', committed: false },
    download('elan 4.2.4', 'https://github.com/leanprover/elan/releases/download/v4.2.4/elan-x86_64-unknown-linux-gnu.tar.gz', pin('ELAN_SHA256')),
    download('rustup-init 1.29.2', 'https://static.rust-lang.org/rustup/archive/1.29.2/x86_64-unknown-linux-gnu/rustup-init', pin('RUSTUP_INIT_SHA256')),
    download('uv 0.10.2', 'https://github.com/astral-sh/uv/releases/download/0.10.2/uv-x86_64-unknown-linux-gnu.tar.gz', pin('UV_SHA256')),
    download('cvc5 1.4.2, the static build without GPL parts', 'https://github.com/cvc5/cvc5/releases/download/cvc5-1.4.2/cvc5-Linux-x86_64-static.zip', pin('CVC5_ZIP_SHA256'), 43693999),
    download('Soufflé 2.5 for Ubuntu 24.04', 'https://github.com/souffle-lang/souffle/releases/download/2.5/x86_64-ubuntu-2404-souffle-2.5-Linux.deb', pin('SOUFFLE_DEB_SHA256'), 4759908),
  ],
  budget: { container_memory: MEMORY, memory_swap: MEMORY, network: 'the build downloads the pinned tools and the Ubuntu packages; the containers run on the compose project network', timeout_s: 1800 },
  exit_code: dText.status,
  verdict_lines: verdictOf(dText.stdout),
  outputs,
  values,
  checks,
  pass: checks.every((c) => c.pass),
  environment: {
    os: `Linux ${os.release().split('-')[0]} ${arch}`,
    cpu_count: os.cpus().length,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    cpu_architecture: arch,
    container: {
      runtime: 'docker',
      server_version: dockerVersion,
      compose_version: composeVersion,
      image: IMAGE_TAG,
      digest: imageDigest,
      architecture: imageFacts.architecture,
      run_flags: ['devcontainer up --skip-post-create', `docker update --memory=${MEMORY} --memory-swap=${MEMORY} on each container before anything ran in it`, 'devcontainer run-user-commands'],
      network: 'the compose project network',
    },
    host_tools: { node: process.version, uv: must('uv', ['--version']).stdout.trim(), devcontainer_cli: cliVersion },
    emulated: false,
    not_run: ['a Codespace or a Codespaces prebuild (GitHub-hosted)', 'Docker Desktop on macOS or Windows', 'linux/arm64 or Apple silicon', 'a GitHub-hosted runner', 'a push of the image to a registry'],
  },
  configs,
  notes: [
    `The image is a local build, made by the devcontainer CLI from bench/image/Dockerfile as ${baseName} and tagged ${IMAGE_TAG} here. Its digest is the image manifest's (with Docker's containerd image store and no attestation, the image ID); a registry digest exists only once CI pushes the image, and the nightly and monthly lanes read it from the repository variable BENCH_IMAGE (W0-T04). The devcontainer was brought up with STATESPACE_BENCH_IMAGE set to ${imageRef}, so the doctor report and its receipt block carry that digest. The cold build's manifest digest was ${coldDigest}, and the cached build's, the digest of record, is ${imageDigest}: they hold the same ${coldLayers.length} layers and differ in the image config (checks cold-and-cached-builds-have-the-same-layers and devcontainer-up-reproduces-the-image-digest). The cause was not isolated in this run; in a scratch trial that is not recorded here, an image built with the argument BUILDKIT_INLINE_CACHE=1, which the devcontainer CLI passes, carried a moby.buildkit.cache.v0 entry in its config, and a cold and a cached build of a two-line Dockerfile differed in their IDs. A build in another place or at another time will have other layers, because they hold file times and the Ubuntu packages of the day.`,
    `The devcontainer CLI does not run the image byte for byte: it adds the labels of devcontainer.json to the built image (already part of ${imageRef}) and, because this host's user and the image's user differ in group id, one layer that sets the user ids. The container's image has ${defaultFacts.image_layers} layers, and its first ${imageFacts.layers} are the built image's (check devcontainer-runs-the-built-layers).`,
    `The recorded build ran without the layer cache (devcontainer build --no-cache), in a clean copy of the working tree (${copiedFiles} files: the tracked files and the untracked files that .gitignore lets through), so every download was checked against its pinned SHA-256 again and the last step of the Dockerfile, statespace doctor, ran on the fresh image. With the cache warm the same build takes seconds.`,
    `Sizes, each as its command reports it: docker image inspect Size ${imageFacts.inspect_size_bytes} bytes; docker images ${imageFacts.images_disk_usage}; du of the unpacked root file system ${imageFacts.unpacked_rootfs_bytes} bytes (a root-owned container reading its own tree); the sum of the layer sizes in docker history ${imageFacts.sum_of_layer_sizes_bytes} bytes. Which of them is a download size was not measured: no registry was involved.`,
    'Where the TLC jars ship: in the image at /opt/tla2tools/, copied by the Dockerfile from bench/image/tla2tools/ in the repository and checked against the SHA-256 values of RUN-tlc-jars. They are vendored because the v1.8.0 release is re-published under its tag: tla2tools-release-asset.json is the asset as the GitHub API listed it when this run was recorded, and it is not the jar the course ran (its SHA-256 differs from the pinned one).',
    'The memory cap is applied with docker update after devcontainer up --skip-post-create and before devcontainer run-user-commands, so the postCreateCommand (statespace doctor) and every later command ran under the 6 GiB cap, on the devcontainer.json as shipped. The opt-in run uses a copy of devcontainer.json in which the one line named by its comment lists docker-compose.sandbox.yml too, with absolute paths.',
    'The default devcontainer reports the sandbox as failed with the line W0-S06 recorded for default Docker, and the run is still green: the sandbox is recorded and never required. The opt-in profile starts it on this host, which has no AppArmor (RUN-bwrap-lanes). On an Ubuntu 24.04 host the profile is not enough; Codespaces and Docker Desktop were not run.',
    "The pins of the Rust toolchain's binaries, of Java and of the Z3 wheel's files were first hashed by this run; every other hash is one that an earlier run recorded (the Lean toolchain's eight binaries by RUN-bwrap-lanes, the jars by RUN-tlc-jars, cvc5 and uv by RUN-scaffold, Soufflé by RUN-souffle-version).",
    "Ubuntu packages (bubblewrap, git, build-essential, libclang-dev, openssh-client, unzip, less, and what Soufflé's package depends on) come from the Ubuntu 24.04 archive of the day and are not pinned by version; the image digest is what pins them.",
    "Only linux/amd64 was built and run. The Dockerfile and the compose file force that platform, because every hash is the x86_64 build's; on Apple silicon Docker Desktop would run the image under emulation, which was not measured (W0-S06 owner action 3).",
    'The build-time check leaves PostgreSQL out (a service container) and records the sandbox as off by choice, because the sandbox cannot start during a build.',
    'The devcontainer CLI is run through npx at the version in the argv; its npm integrity value is in values.devcontainer_cli.',
  ],
};

fs.mkdirSync(path.dirname(RECORD), { recursive: true });
fs.writeFileSync(RECORD, `${JSON.stringify(record, null, 2)}\n`);
console.log(`${ID}: ${record.pass ? 'pass' : 'FAIL'} (${checks.filter((c) => c.pass).length} of ${checks.length} checks) -> ${REUSE ? 'scratch (development run)' : 'runs/'}`);
for (const c of checks.filter((x) => !x.pass)) console.log(`  FAIL ${c.id}: ${c.detail}`);
console.log(`image ${imageRef}`);
tearDown();
if (REUSE) console.log(`development run: the record and its outputs are in ${scratch}/out`);
else fs.rmSync(scratch, { recursive: true, force: true });
process.exit(record.pass ? 0 : 1);
