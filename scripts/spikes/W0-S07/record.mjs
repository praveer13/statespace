#!/usr/bin/env node
/*
 * W0-S07 · records RUN-vcgen-cmd: Lean's experimental `vcgen` on a Mini-Plinth-style command type.
 *
 * Runs the Lean probe project in scripts/spikes/W0-S07/lean/ on three toolchains. Every step runs
 * in a fresh `docker run --rm --memory=6g` container from the ss-lean:4.35.0 image:
 *   v4.35.0             the pinned toolchain, installed in the image by elan
 *   v4.36.0-rc1         the release archive, checked against GitHub's published SHA-256 digest
 *   nightly-2026-10-24  the newest nightly archive on the recording date, checked the same way
 * The two archives are mounted read-only and run directly, bypassing elan.
 *
 * Writes the raw output of every step to runs/RUN-vcgen-cmd/<toolchain>/<step>.out, with paths
 * normalized, and the record to runs/RUN-vcgen-cmd.json.
 *
 * Usage: node scripts/spikes/W0-S07/record.mjs [--cache DIR] [--image NAME]
 *   --cache DIR   where the release archives are downloaded and unpacked; default
 *                 <os tmpdir>/w0s07-cache. It stays outside the repository.
 *   --image NAME  the container image; default ss-lean:4.35.0. It must provide elan with Lean
 *                 4.35.0 installed (the pinned toolchain), bash and coreutils; the two archive
 *                 toolchains run inside it as well.
 * Needs: Node 22, Docker, curl, and tar with zstd support. No npm dependencies.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const PROJECT = path.join(HERE, 'lean');
const RUN_ID = 'RUN-vcgen-cmd';
const OUT_DIR = path.join(REPO, 'runs', RUN_ID);
const RECORD = path.join(REPO, 'runs', `${RUN_ID}.json`);
const IMAGE = arg('--image', 'ss-lean:4.35.0');
const LOCAL_IMAGE = IMAGE === 'ss-lean:4.35.0';
const MEMORY = '6g';
const STEP_TIMEOUT_S = 600;
const PINNED = 'v4.35.0';

const TOOLCHAINS = [
  {
    id: 'v4.35.0',
    role: 'pinned (edition 1)',
    toolchainFile: 'leanprover/lean4:v4.35.0',
    source: 'image',
    asset: {
      name: 'lean-4.35.0-linux.tar.zst',
      url: 'https://github.com/leanprover/lean4/releases/download/v4.35.0/lean-4.35.0-linux.tar.zst',
      size: 594481375,
      sha256: '7289597a44543246c9227b8cae501767e095ce17f6d448b95fc4a8dc97268f6d',
      publishedAt: '2026-10-12T18:13:12Z',
    },
  },
  {
    id: 'v4.36.0-rc1',
    role: 'next release candidate',
    toolchainFile: 'leanprover/lean4:v4.36.0-rc1',
    source: 'archive',
    asset: {
      name: 'lean-4.36.0-rc1-linux.tar.zst',
      url: 'https://github.com/leanprover/lean4/releases/download/v4.36.0-rc1/lean-4.36.0-rc1-linux.tar.zst',
      size: 605563669,
      sha256: '26b3cea1a006ad419215520b8668dcd3f6a9eeba1a123756563a739f9c6274b2',
      publishedAt: '2026-10-14T18:30:03Z',
    },
  },
  {
    id: 'nightly-2026-10-24',
    role: 'newest nightly on the recording date (4.37.0 development)',
    toolchainFile: 'leanprover/lean4-nightly:nightly-2026-10-24',
    source: 'archive',
    asset: {
      name: 'lean-4.37.0-nightly-2026-10-24-linux.tar.zst',
      url: 'https://github.com/leanprover/lean4-nightly/releases/download/nightly-2026-10-24/lean-4.37.0-nightly-2026-10-24-linux.tar.zst',
      size: 621866598,
      sha256: 'b134449abef8c25ec1f1654216267b8e4af054fb43488cd25c822bfa10ab89f0',
      publishedAt: '2026-10-24T10:36:11Z',
    },
  },
];

/* `expect` is the exit code each probe is designed to show, as its file header states; exploratory
   runs during the spike informed it. `asExpected` compares it with the observed code, so a toolchain
   bump that changes an outcome shows up as asExpected: false. */
const STEPS = [
  { id: 'build', argv: ['lake', 'build'], expect: 0,
    what: 'builds W0S07.Cmd: the command type, its semantics, its WP instances and spec lemmas' },
  { id: 'Proved', file: 'W0S07/Proved.lean', expect: 0,
    what: 'P1-P5: the triples vcgen proves, the VCs it leaves (trace_state), three refutations, axioms' },
  { id: 'Residual', file: 'W0S07/Residual.lean', expect: 1,
    what: 'R1-R3: the obligations vcgen leaves on the weakened guard and on PayTwo (unsolved goals)' },
  { id: 'StyleIf', file: 'W0S07/StyleIf.lean', expect: 0,
    what: 'the upstream example\'s spec style (an if in the precondition): the VC keeps wp of the body' },
  { id: 'ContractOk', file: 'W0S07/ContractOk.lean', expect: 0,
    what: 'a def ... requires ... ensures contract on a Cmd-valued definition' },
  { id: 'ContractFail', file: 'W0S07/ContractFail.lean', expect: 1,
    what: 'F1-F4: where contracts stop (weakened guard, reachable rejection, a constant, a wrapper)' },
  { id: 'ContractThrows', file: 'W0S07/ContractThrows.lean', expect: { [PINNED]: 1, default: 0 },
    what: 'a throws (e : Err) => R clause: expected not to parse on 4.35.0, and to elaborate where contracts have throws' },
  { id: 'ContractThrowsBare', file: 'W0S07/ContractThrowsBare.lean', expect: 1,
    what: 'the same throws clause without the exception type ascribed: throws e => R' },
  { id: 'Interface', file: 'W0S07/Interface.lean', expect: 0,
    what: 'the vcgen docstring, the experimental options and warnings, maxHeartbeats, declaring modules, WP/Triple signatures' },
];

/* ---------- small helpers ---------- */

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function sha256File(file) {
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return hash.digest('hex');
}

const sha256Text = (text) => createHash('sha256').update(text).digest('hex');

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.lake' || entry.name === 'lake-manifest.json') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (res.error) throw res.error;
  return res;
}

function must(cmd, args, opts) {
  const res = run(cmd, args, opts);
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${res.status}: ${res.stderr}`);
  return res.stdout;
}

const repoRel = (p) => path.relative(REPO, p).split(path.sep).join('/');

/* ---------- toolchains ---------- */

function ensureArchive(tc, cache) {
  fs.mkdirSync(cache, { recursive: true });
  const archive = path.join(cache, tc.asset.name);
  let downloaded = false;
  if (!fs.existsSync(archive)) {
    console.log(`downloading ${tc.asset.url}`);
    must('curl', ['-sSfL', '-o', archive, tc.asset.url]);
    downloaded = true;
  }
  const sha = sha256File(archive);
  if (sha !== tc.asset.sha256) {
    throw new Error(`${tc.asset.name}: SHA-256 ${sha} does not match the published ${tc.asset.sha256}`);
  }
  const dir = path.join(cache, tc.asset.name.replace(/\.tar\.zst$/, ''));
  if (!fs.existsSync(path.join(dir, 'bin', 'lean'))) must('tar', ['--zstd', '-xf', archive, '-C', cache]);
  return { dir, archiveSha256: sha, downloadedThisRun: downloaded };
}

/* ---------- docker ---------- */

const UID_GID = `${process.getuid()}:${process.getgid()}`;

function dockerArgs(tc, work, tcDir, name, inner) {
  const args = ['run', '--rm', '--name', name, `--memory=${MEMORY}`, '--network=none', '--user', UID_GID, '-e', 'HOME=/tmp'];
  if (tc.source === 'archive') args.push('-e', 'PATH=/tc/bin:/usr/bin:/bin', '-v', `${tcDir}:/tc:ro`);
  args.push('-v', `${work}:/work`, '-w', '/work', IMAGE, ...inner);
  return args;
}

function makeNormalizer(work, cache) {
  const pairs = [[work, '<sandbox>'], [cache, '<cache>'], [REPO, '<repo>']];
  return (s) => {
    let out = s;
    for (const [from, to] of pairs) out = out.split(from).join(to);
    return out.split(UID_GID).join('<uid>:<gid>').replaceAll('/work/', '');
  };
}

function dockerStep(tc, work, tcDir, name, inner, normalize) {
  run('docker', ['rm', '-f', name]); // a container left by an interrupted run, if any
  const args = dockerArgs(tc, work, tcDir, name, inner);
  const startedAt = new Date().toISOString();
  const t0 = process.hrtime.bigint();
  const res = run('docker', args, { timeout: STEP_TIMEOUT_S * 1000 });
  const durationS = Math.round(Number(process.hrtime.bigint() - t0) / 1e7) / 100;
  return {
    argv: ['docker', ...args].map(normalize),
    startedAt,
    durationS,
    exitCode: res.status,
    signal: res.signal ?? null,
    output: normalize((res.stdout ?? '') + (res.stderr ?? '')),
  };
}

/* ---------- output parsing ---------- */

const DIAG = /^W0S07\/[^:]+\.lean:\d+:\d+: (error|warning)(\([^)]*\))?: /;
const AXIOMS = /^'W0S07\.[^']+' depends on axioms: /;
const SPEC = /^[\w.]+\.spec : /;

function goalBlocks(output) {
  const lines = output.split('\n');
  const blocks = [];
  let cur = null;
  const close = () => {
    if (cur) {
      while (cur.length && cur[cur.length - 1].trim() === '') cur.pop();
      blocks.push(cur.join('\n'));
    }
    cur = null;
  };
  for (const line of lines) {
    if (/^case \S+$/.test(line)) { close(); cur = [line]; continue; }
    if (DIAG.test(line) || AXIOMS.test(line) || SPEC.test(line) || line.startsWith('docstring of ')) { close(); continue; }
    if (cur) cur.push(line);
  }
  close();
  return blocks;
}

function specChecks(output) {
  const lines = output.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!SPEC.test(lines[i])) continue;
    const block = [lines[i]];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i]);
    out.push(block.join('\n'));
  }
  return out;
}

function verdictLines(output) {
  return output.split('\n').filter((l) =>
    DIAG.test(l) || AXIOMS.test(l) || SPEC.test(l) || /^⊢ /.test(l) || /^Build completed/.test(l)
    || /^option \S+: /.test(l) || /^Lean \(version/.test(l));
}

function interfaceValues(output) {
  const lines = output.split('\n');
  const start = lines.findIndex((l) => l.startsWith('docstring of '));
  const end = lines.findIndex((l) => l.startsWith('option '));
  const options = {};
  for (const l of lines) {
    const m = /^option (\S+): default (\S+?)(?:; (.*))?$/.exec(l);
    if (m) options[m[1]] = { default: m[2], descr: m[3] ?? null };
  }
  return {
    vcgenDocstringOpening: start >= 0 && end > start ? lines.slice(start + 1, end).join('\n').trim() : null,
    options,
    warningsWithOptionsOff: lines.filter((l) => DIAG.test(l) && l.includes('warning')).map((l) => l.replace(DIAG, '')),
  };
}

/* Source lines per `/-! ## … -/` section of a Lean file, comments and blank lines included. */
function sectionLines(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const total = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  const marks = [];
  lines.forEach((l, i) => {
    const m = /^\/-! ## (.*?)(?: -\/)?$/.exec(l);
    if (m) marks.push({ section: m[1], start: i });
  });
  const out = marks.length ? [{ section: '(header and imports)', lines: marks[0].start }] : [];
  marks.forEach((m, k) => out.push({ section: m.section, lines: (k + 1 < marks.length ? marks[k + 1].start : total) - m.start }));
  return { file: repoRel(file), total, sections: out };
}

/* Output with Lake's timings and step counters removed, for comparison across toolchains. */
const comparable = (s) => s.replace(/\(\d+(?:\.\d+)?m?s\)/g, '(<t>)').replace(/\[\d+\/\d+\]/g, '[<n>]');

/* Lines present in only one of two outputs, in order of appearance. */
function lineDiff(pinnedOut, here) {
  const a = comparable(pinnedOut).split('\n');
  const b = comparable(here).split('\n');
  const inA = new Set(a);
  const inB = new Set(b);
  return { onlyOnPinned: a.filter((l) => !inB.has(l)), onlyHere: b.filter((l) => !inA.has(l)) };
}

/* ---------- main ---------- */

function main() {
  const cache = path.resolve(arg('--cache', path.join(os.tmpdir(), 'w0s07-cache')));
  const startedAt = new Date().toISOString();
  const t0 = process.hrtime.bigint();

  const inputs = listFiles(PROJECT).map((f) => ({
    path: repoRel(path.join(PROJECT, f)),
    sha256: sha256File(path.join(PROJECT, f)),
  }));
  const manifest = inputs.map((i) => `${i.sha256}  ${i.path}\n`).join('');
  const inputSha = (p) => inputs.find((i) => i.path === p)?.sha256 ?? null;
  const cmdPath = repoRel(path.join(PROJECT, 'W0S07/Cmd.lean'));

  const imageId = must('docker', ['image', 'inspect', IMAGE, '--format', '{{.Id}}']).trim();
  const dockerServer = must('docker', ['version', '--format', '{{.Server.Version}}']).trim();
  const hostOs = must('uname', ['-srm']).trim();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const toolchains = [];
  const configs = [];
  const outputsByKey = new Map();

  for (const tc of TOOLCHAINS) {
    const archive = tc.source === 'archive' ? ensureArchive(tc, cache) : null;
    const tcDir = archive ? archive.dir : null;
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'w0s07-'));
    fs.cpSync(PROJECT, work, { recursive: true, filter: (src) => !/\.lake$|lake-manifest\.json$/.test(src) });
    fs.writeFileSync(path.join(work, 'lean-toolchain'), `${tc.toolchainFile}\n`);
    const normalize = makeNormalizer(work, cache);
    const tcOut = path.join(OUT_DIR, tc.id);
    fs.mkdirSync(tcOut, { recursive: true });

    const locate = tc.source === 'image' ? '"$(elan which lean)"' : '"$(command -v lean)"';
    const env = dockerStep(tc, work, tcDir, `w0s07-${tc.id}-env`, ['bash', '-c', [
      `R="$(dirname "$(dirname "$(readlink -f ${locate})")")"`, 'echo "root=$R"',
      'lean --version', 'lake --version',
      'sha256sum "$R/bin/lean" "$R/bin/lake" "$R/lib/lean/libleanshared.so" "$R/lib/lean/libLake_shared.so"',
      'grep PRETTY_NAME /etc/os-release', 'uname -m', 'nproc',
    ].join(' && ')], normalize);
    if (env.exitCode !== 0) throw new Error(`environment probe failed on ${tc.id}:\n${env.output}`);
    const envLines = env.output.trim().split('\n');
    const root = (envLines.find((l) => l.startsWith('root=')) ?? 'root=').slice(5);
    const binaries = {};
    for (const l of envLines) {
      const m = /^([0-9a-f]{64})\s+(\S+)$/.exec(l);
      if (m) binaries[m[2].replace(`${root}/`, '')] = m[1];
    }
    const leanVersion = envLines.find((l) => l.startsWith('Lean (version')) ?? null;
    toolchains.push({
      id: tc.id,
      role: tc.role,
      toolchain_file: tc.toolchainFile,
      version_string: leanVersion,
      lake_version_string: envLines.find((l) => l.startsWith('Lake version')) ?? null,
      source: tc.source === 'image'
        ? `installed by elan in ${IMAGE} at ${root}; the release asset digest below is GitHub's, not re-hashed here`
        : 'release archive downloaded, hashed and matched against the published digest, mounted read-only at /tc',
      release_asset: {
        name: tc.asset.name, url: tc.asset.url, bytes: tc.asset.size, sha256: tc.asset.sha256,
        published_at: tc.asset.publishedAt, verified_here: tc.source === 'archive',
      },
      binaries,
      container: {
        os: (envLines.find((l) => l.startsWith('PRETTY_NAME')) ?? '').replace(/^PRETTY_NAME="?|"$/g, ''),
        arch: envLines.find((l) => /^(x86_64|aarch64)$/.test(l)) ?? null,
        cpu_count: Number(envLines[envLines.length - 1]),
      },
    });

    for (const step of STEPS) {
      const inner = step.argv ?? ['lake', 'env', 'lean', step.file];
      const r = dockerStep(tc, work, tcDir, `w0s07-${tc.id}-${step.id}`, inner, normalize);
      const outFile = path.join(tcOut, `${step.id}.out`);
      fs.writeFileSync(outFile, r.output);
      outputsByKey.set(`${tc.id}/${step.id}`, r.output);
      const expectExit = typeof step.expect === 'number' ? step.expect : (step.expect[tc.id] ?? step.expect.default);
      const pinnedOut = outputsByKey.get(`${PINNED}/${step.id}`) ?? '';
      const compared = tc.id !== PINNED && step.id !== 'build';
      const same = compared ? comparable(r.output) === comparable(pinnedOut) : null;
      const stepInputs = step.file
        ? [repoRel(path.join(PROJECT, step.file)), cmdPath]
        : inputs.filter((i) => !/\/W0S07\/(?!Cmd\.lean)[^/]+$/.test(i.path)).map((i) => i.path);
      configs.push({
        id: `${tc.id}/${step.id}`,
        toolchain: tc.id,
        step: step.id,
        purpose: step.what,
        engine: 'lean',
        version: leanVersion,
        binary_sha256: binaries['bin/lean'] ?? null,
        argv: r.argv,
        inputs: stepInputs.map((p) => ({ path: p, sha256: inputSha(p) })),
        budget: { container_memory: MEMORY, network: 'none', timeout_s: STEP_TIMEOUT_S, max_heartbeats: 'Lean default, not overridden' },
        started_at: r.startedAt,
        duration_s: r.durationS,
        exit_code: r.exitCode,
        expect_exit: expectExit,
        as_expected: r.exitCode === expectExit,
        same_output_as_pinned: same,
        changed_lines: same === false ? lineDiff(pinnedOut, r.output) : null,
        verdict_lines: verdictLines(r.output),
        outputs: [{
          path: repoRel(outFile),
          sha256: sha256Text(r.output),
          bytes: Buffer.byteLength(r.output),
          kind: 'lean and lake stdout and stderr, paths normalized',
        }],
      });
      console.log(`${tc.id.padEnd(20)} ${step.id.padEnd(18)} exit ${r.exitCode} (expected ${expectExit}) ${r.durationS}s`);
    }
    fs.rmSync(work, { recursive: true, force: true });
  }

  /* Named values, parsed from the outputs (the pinned toolchain unless a key says otherwise). */
  const pinned = (step) => outputsByKey.get(`${PINNED}/${step}`) ?? '';
  const provedGoals = goalBlocks(pinned('Proved'));
  const residualGoals = goalBlocks(pinned('Residual'));
  const contractGoals = goalBlocks(pinned('ContractFail'));
  const iface = interfaceValues(pinned('Interface'));
  const values = {
    transfer_vc: provedGoals[0] ?? null,
    fee_transfer_vcs: provedGoals.slice(1),
    axioms: pinned('Proved').split('\n').filter((l) => AXIOMS.test(l)),
    weak_guard_residual: residualGoals[0] ?? null,
    weak_guard_invariant_residual: residualGoals[1] ?? null,
    pay_two_residual: residualGoals[2] ?? null,
    if_style_vc: goalBlocks(pinned('StyleIf'))[0] ?? null,
    contract_spec: specChecks(pinned('ContractOk'))[0] ?? null,
    contract_axioms: pinned('ContractOk').split('\n').filter((l) => AXIOMS.test(l)),
    weak_guard_contract_residual: contractGoals[0] ?? null,
    rejection_contract_residual: contractGoals[1] ?? null,
    contract_failures: pinned('ContractFail').split('\n').filter((l) => DIAG.test(l)),
    throws_on_pinned: pinned('ContractThrows').split('\n').filter((l) => DIAG.test(l)),
    throws_spec_on_later: TOOLCHAINS.filter((t) => t.id !== PINNED)
      .map((t) => ({ toolchain: t.id, spec: specChecks(outputsByKey.get(`${t.id}/ContractThrows`) ?? '')[0] ?? null })),
    throws_bare_errors: TOOLCHAINS.map((t) => ({
      toolchain: t.id,
      errors: (outputsByKey.get(`${t.id}/ContractThrowsBare`) ?? '').split('\n').filter((l) => DIAG.test(l) && l.includes('error')),
    })),
    declaring_modules: TOOLCHAINS.map((t) => ({
      toolchain: t.id,
      lines: (outputsByKey.get(`${t.id}/Interface`) ?? '').split('\n').filter((l) => / is (not )?declared in /.test(l)),
    })),
    interface: {
      vcgen_docstring_opening: iface.vcgenDocstringOpening,
      options: iface.options,
      warnings_with_options_off: iface.warningsWithOptionsOff,
    },
    cmd_module_lines: sectionLines(path.join(PROJECT, 'W0S07/Cmd.lean')),
  };

  const summary = configs.map((c) => ({
    id: c.id, exit_code: c.exit_code, expect_exit: c.expect_exit, as_expected: c.as_expected,
    same_output_as_pinned: c.same_output_as_pinned, duration_s: c.duration_s,
  }));
  const pinnedTc = toolchains.find((t) => t.id === PINNED);
  const scriptPath = fileURLToPath(import.meta.url);

  const record = {
    id: RUN_ID,
    title: "Lean's experimental vcgen on a Mini-Plinth-style command type (W0-S07)",
    engine: 'lean',
    version: '4.35.0',
    version_string: pinnedTc.version_string,
    binary_sha256: pinnedTc.binaries['bin/lean'] ?? null,
    binary: 'bin/lean of the 4.35.0 toolchain; libleanshared.so and the other toolchains are hashed under toolchains[].binaries',
    image: `${IMAGE}@${imageId}`,
    recorded_at: new Date().toISOString(),
    started_at: startedAt,
    argv: ['node', 'scripts/spikes/W0-S07/record.mjs', ...process.argv.slice(2).map(makeNormalizer('\u0000', cache))],
    inputs,
    input_sha256: sha256Text(manifest),
    input_sha256_method: 'SHA-256 of the sha256sum-style manifest of inputs[], one "<sha256>  <path>\\n" line per file, sorted by path',
    recipe: { path: repoRel(scriptPath), sha256: sha256File(scriptPath) },
    budget: {
      container_memory: MEMORY,
      network: 'none',
      timeout_s: STEP_TIMEOUT_S,
      max_heartbeats: Number(iface.options.maxHeartbeats?.default ?? NaN),
      max_heartbeats_note: 'the Lean default, printed by Interface.lean; no probe overrides it',
      steps: 'one docker run at a time',
    },
    exit_code: configs.every((c) => c.as_expected) ? 0 : 1,
    exit_code_note: '0 when every step exited with its expected code; each step\'s own code is in configs[]',
    duration_s: Math.round(Number(process.hrtime.bigint() - t0) / 1e7) / 100,
    verdict_lines: summary.map((s) => `${s.id}: exit ${s.exit_code} (expected ${s.expect_exit})`
      + (s.same_output_as_pinned === null ? '' : s.same_output_as_pinned ? '; output identical to 4.35.0' : '; output differs from 4.35.0')),
    outputs: configs.flatMap((c) => c.outputs),
    environment: {
      os: hostOs,
      cpu_count: os.cpus().length,
      ram_gib: Math.round(os.totalmem() / 2 ** 30),
      container: {
        runtime: 'docker',
        server_version: dockerServer,
        image: IMAGE,
        digest: imageId,
        digest_note: LOCAL_IMAGE ? 'a locally built image with no registry digest: this is its image id' : 'the image id',
        os: pinnedTc.container.os,
        run_flags: ['--rm', `--memory=${MEMORY}`, '--network=none', '--user <uid>:<gid>', '-e HOME=/tmp',
          '-v <sandbox>:/work', '-w /work', 'archives only: -e PATH=/tc/bin:/usr/bin:/bin -v <cache>/<toolchain>:/tc:ro'],
      },
      host_tools: { node: process.version },
      emulated: false,
    },
    toolchains,
    summary,
    values,
    notes: [
      LOCAL_IMAGE
        ? 'Local substitute, labeled: the pinned toolchain ran from ss-lean:4.35.0, a locally built image (Ubuntu 24.04, elan 4.2.4, Lean 4.35.0) with no registry digest; its image id stands in until the devcontainer digest exists (W0-T05).'
        : `The pinned toolchain ran from ${IMAGE}.`,
      'The 4.36.0-rc1 and nightly toolchains ran in the same image with the release archive mounted read-only and its bin/ first on PATH; elan was not involved.',
      'duration_s is the wall-clock time of one docker run, container start included; one step at a time; not a performance measurement.',
      'The command type is a spike, not the course reference: balances are a function Acct -> Int, and move is the only resource operation modelled.',
      'Expected exit codes are the outcomes each probe is designed to show (see each file header), informed by exploratory runs during the spike; as_expected compares them with the observed codes.',
      'Field names follow the snake_case keys of the W0 task rules and the sibling W0 run records; spine section 9.5 writes the same fields in camelCase, which run@1 (W0-S11) will settle.',
    ],
    configs,
  };

  fs.writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
  console.log(`wrote ${repoRel(RECORD)} and ${repoRel(OUT_DIR)}/`);
  if (record.exit_code !== 0) {
    console.log('some steps did not exit with their expected code; see verdict_lines');
  }
}

main();
