#!/usr/bin/env node
// assemble-run.mjs: build runs/RUN-bwrap-lanes.json from the outputs that lane-probe.sh, run-matrix.sh,
// vm/run-vm.sh and list-bundle.sh wrote under runs/RUN-bwrap-lanes/. It classifies every Lake run with
// classify.mjs, compares the classification with expectations.mjs, and computes the timing tables.
//
//   node scripts/spikes/W0-S06/assemble-run.mjs             write runs/RUN-bwrap-lanes.json, print a summary
//   node scripts/spikes/W0-S06/assemble-run.mjs --markdown  also print the tables used in docs/spikes/W0-S06.md
//   node scripts/spikes/W0-S06/assemble-run.mjs --check     write nothing; exit 1 on any mismatch or failed check
//   node scripts/spikes/W0-S06/assemble-run.mjs --solutions DIR   also verify the private fixtures in DIR (see below)
//
// The pack's three solution files and the eight rejected solutions are private and are not in this repository
// (complete proofs are reference solutions: spine section 11.1). inputs[] lists them by SHA-256, with the role
// "private fixture, not published", from private-fixtures.json, which `mutate.mjs --solutions DIR --write-manifest`
// writes from the files themselves. This script needs no private file to run; given --solutions DIR (or
// W0S06_SOLUTIONS) it also checks that DIR holds the files of the manifest, which changes nothing in the record.
//
// Environment: W0S06_OUT_ROOT and W0S06_RUN_JSON override the two paths (for tests).
// Field names follow the other W0 run records (snake_case; see spine section 9.5 and the runs/ folder).
//
// Dependency-free Node 22.

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, classifyCanary, lines } from './classify.mjs';
import { PROFILE_SANDBOX, expectedFor, missedFor, isLakeCheck, stepBase } from './expectations.mjs';
import { readManifest, verifyDir } from './mutate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const RUNS = process.env.W0S06_OUT_ROOT ?? join(ROOT, 'runs', 'RUN-bwrap-lanes');
const OUT_JSON = process.env.W0S06_RUN_JSON ?? join(ROOT, 'runs', 'RUN-bwrap-lanes.json');
const argv = process.argv.slice(2);
const args = new Set(argv);
const solutionsDir = argv.includes('--solutions') ? argv[argv.indexOf('--solutions') + 1] : process.env.W0S06_SOLUTIONS || null;
const MANIFEST = readManifest();

const read = (p) => readFileSync(p, 'utf8');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => relative(ROOT, p).split('\\').join('/');
const round3 = (x) => Math.round(x * 1000) / 1000;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function parseEnv(text) {
  const o = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) o[line.slice(0, i)] = line.slice(i + 1);
  }
  return o;
}
const readEnv = (p) => (existsSync(p) ? parseEnv(read(p)) : {});
const hasCap = (hex, bit) => (hex ? ((BigInt('0x' + hex) >> BigInt(bit)) & 1n) === 1n : null);

function listFiles(dir) {
  const acc = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) acc.push(...listFiles(p));
    else acc.push(p);
  }
  return acc.sort();
}

const COMPARE_STEPS =
  'informational: Lake prints build times such as "Built Solution (200ms)" and merges two streams, so those numbers and the order of lines vary; the verdict lines, exit codes and bubblewrap diagnostics are what a re-run compares';

// A folder of outputs as one record: the number of files and a digest over the sorted "sha256  path" lines.
function folderOutput(dir, kind, compare) {
  const files = listFiles(dir);
  const manifest = files.map((p) => `${sha256(readFileSync(p))}  ${rel(p)}`).join('\n') + '\n';
  return {
    path: rel(dir) + '/',
    kind,
    files: files.length,
    bytes: files.reduce((n, p) => n + statSync(p).size, 0),
    sha256: sha256(manifest),
    sha256_method: 'SHA-256 over the sorted "sha256  path" lines of the folder\'s files',
    compare,
  };
}

// ---------- read one config directory
function readConfig(dir) {
  const id = basename(dir);
  const facts = readEnv(join(dir, 'facts.env'));
  const profileEnv = readEnv(join(dir, 'profile.env'));
  const done = readEnv(join(dir, 'done.env'));
  const argvFile = join(dir, 'docker-run.argv');
  const dockerArgv = existsSync(argvFile) ? read(argvFile).split('\n').filter((l) => l.length > 0) : null;
  const exitFile = join(dir, 'docker-run.exit');
  const dockerExit = existsSync(exitFile) ? Number(read(exitFile).trim()) : null;

  const stepsDir = join(dir, 'steps');
  const steps = [];
  for (const f of readdirSync(stepsDir).filter((f) => f.endsWith('.meta')).sort()) {
    const meta = readEnv(join(stepsDir, f));
    const outFile = join(stepsDir, f.replace(/\.meta$/, '.out'));
    steps.push({
      n: Number(f.slice(0, 2)),
      name: meta.name,
      argv: meta.argv.split(' ').filter((w) => w.length > 0),
      env: meta.env ? meta.env.split(' ').filter((w) => w.length > 0) : [],
      exitCode: Number(meta.rc),
      ms: Number(meta.ms),
      loadavg: meta.loadavg,
      outSha256: meta.out_sha256,
      memPeak: meta.mem_peak_bytes && /^\d+$/.test(meta.mem_peak_bytes) ? Number(meta.mem_peak_bytes) : null,
      cpuMs: meta.cpu_user_ms !== undefined ? Number(meta.cpu_user_ms) + Number(meta.cpu_sys_ms) : null,
      outputPath: existsSync(outFile) ? rel(outFile) : null,
      output: existsSync(outFile) ? read(outFile) : null,
    });
  }
  // a step whose output exists without its metadata was cut off: the probe writes the metadata when a command ends,
  // so only the container being killed leaves this behind
  const metas = new Set(readdirSync(stepsDir).filter((f) => f.endsWith('.meta')).map((f) => f.replace(/\.meta$/, '')));
  for (const f of readdirSync(stepsDir).filter((f) => f.endsWith('.out')).sort()) {
    const base = f.replace(/\.out$/, '');
    if (metas.has(base)) continue;
    steps.push({ n: Number(f.slice(0, 2)), name: base.slice(3), argv: [], env: [], exitCode: null, ms: 0, loadavg: '-', outSha256: null, memPeak: null, cpuMs: null, outputPath: rel(join(stepsDir, f)), output: read(join(stepsDir, f)), interrupted: true });
  }
  steps.sort((a, b) => a.n - b.n);
  const oomFile = join(dir, 'kernel-oom.txt');
  const noteFile = join(dir, 'note.txt');
  const fixturesFile = join(dir, 'fixtures.sha256');
  return {
    fixtures: existsSync(fixturesFile) ? read(fixturesFile).split('\n').filter(Boolean).map((l) => ({ sha256: l.slice(0, 64), name: l.slice(66) })) : null,
    id, dir, facts, profile: profileEnv.profile ?? id, lane: profileEnv.lane ?? id.split('-')[0], done, dockerArgv, dockerExit, steps,
    kernelOom: existsSync(oomFile) ? parseOom(read(oomFile)) : null,
    note: existsSync(noteFile) ? read(noteFile).trim() : null,
  };
}

// collect-oom.mjs writes the kernel's out-of-memory report for the container: comment lines, then the report's lines
function parseOom(text) {
  const ls = text.split('\n').filter((l) => l.length > 0);
  const body = ls.filter((l) => !l.startsWith('#'));
  const comments = ls.filter((l) => l.startsWith('#'));
  const unreadable = comments.find((l) => l.startsWith('# not readable'));
  const killed = body
    .map((l) => /Killed process (\d+) \((.+?)\) total-vm:(\d+)kB, anon-rss:(\d+)kB/.exec(l))
    .filter(Boolean)
    .map((m) => ({ process: m[2], total_vm_kb: Number(m[3]), anon_rss_kb: Number(m[4]) }));
  const mem = body.map((l) => /^memory: usage (\d+)kB, limit (\d+)kB, failcnt (\d+)/.exec(l)).find(Boolean);
  return {
    readable: !unreadable && !comments.some((l) => l.startsWith('# no container id')),
    note: comments.find((l) => !l.startsWith('# kernel log,')) ?? null,
    events: killed.length,
    killed,
    cgroup: mem ? { usage_kb: Number(mem[1]), limit_kb: Number(mem[2]), failcnt: Number(mem[3]) } : null,
    lines: body,
  };
}

// ---------- the shim's discovery logs: Lake's bwrap calls and the time of each
function parseShim(path) {
  if (!existsSync(path)) return null;
  const calls = [];
  let cur = null;
  for (const line of read(path).split('\n')) {
    const parts = line.split('\t');
    if (parts[0] === 'CALL') cur = { n: Number(parts[2].replace('n=', '')), args: [] };
    else if (parts[0] === 'ARG' && cur) cur.args.push(parts.slice(1).join('\t'));
    else if (parts[0] === 'END' && cur) {
      cur.rc = Number(parts[2].replace('rc=', ''));
      cur.us = Number(parts[3].replace('us=', ''));
      calls.push(cur);
      cur = null;
    }
  }
  return calls;
}

function readShim(dir, cmd) {
  const calls = parseShim(join(dir, 'shim', `discover-${cmd}.log`));
  if (!calls) return null;
  return calls.map((c) => {
    const dd = c.args.indexOf('--');
    const flags = dd >= 0 ? c.args.slice(0, dd) : c.args;
    const command = dd >= 0 ? c.args.slice(dd + 1) : [];
    const prog = command.length ? basename(command[0]) : '';
    const sub = prog === 'lake' ? command[1] : null;
    const phase = sub ? `lake ${sub}${command[2] && !command[2].startsWith('-') ? ' ' + command[2] : ''}` : prog;
    return { n: c.n, phase, exit_code: c.rc, seconds: round3(c.us / 1e6), network: flags.includes('--share-net') ? 'shared' : 'none' };
  });
}

// the flags and mounts of the first logged call: Lake's whole sandbox, as the words before "--"
function lakeBwrapArgv(dir) {
  const calls = parseShim(join(dir, 'shim', 'discover-comparator.log'));
  if (!calls || calls.length === 0) return null;
  const a = calls[0].args;
  const dd = a.indexOf('--');
  return dd >= 0 ? a.slice(0, dd) : a;
}

// ---------- classify and check one config
function analyze(cfg) {
  const canaryStep = cfg.steps.find((s) => s.name === 'canary-lake');
  const minimalStep = cfg.steps.find((s) => s.name === 'canary-minimal');
  const canary = canaryStep ? classifyCanary(canaryStep) : null;
  const minimal = minimalStep ? classifyCanary(minimalStep) : null;
  const mismatches = [];
  const missed = []; // predictions the recording refuted, with the classifier's reading as listed in expectations.mjs
  let checked = 0;

  const steps = cfg.steps.map((s) => {
    const out = {
      n: s.n,
      name: s.name,
      argv: s.argv,
      env: s.env,
      exit_code: s.exitCode,
      ...(s.interrupted ? { interrupted: true } : {}),
      seconds: round3(s.ms / 1000),
      cpu_seconds: s.cpuMs === null ? null : round3(s.cpuMs / 1000),
      load_average_at_start: s.loadavg,
      memory_peak_bytes_so_far: s.memPeak,
      output: s.outputPath,
      output_sha256: s.outSha256,
    };
    if (s.name.startsWith('canary-')) {
      out.canary = classifyCanary(s);
      return out;
    }
    if (isLakeCheck(s.argv) && s.output !== null) {
      const c = classify({ argv: s.argv, exitCode: s.exitCode, output: s.output });
      out.classification = { sandbox: c.sandbox, verdict: c.verdict, reason: c.reason, evidence: c.evidence, detail: c.detail, checkers: c.checkers, warnings: c.warnings };
      if (canary) {
        const exp = expectedFor(cfg.profile, canary.sandbox, s.name);
        if (exp) {
          checked += 1;
          const matches = (e) => c.verdict === e.verdict && c.sandbox === e.sandbox && (!e.reason || new RegExp('^' + e.reason + '$').test(c.reason));
          const ok = exp.anyOf ? exp.anyOf.some(matches) : matches(exp);
          const got = { verdict: c.verdict, sandbox: c.sandbox, reason: c.reason };
          const miss = ok ? null : missedFor(cfg.profile, s.name, got);
          out.expected = { ...exp, ok, ...(miss ? { prediction_missed: miss.note } : {}) };
          if (miss) missed.push({ step: s.name, expected: exp, got, note: miss.note });
          else if (!ok) mismatches.push({ step: s.name, expected: exp, got });
        }
      }
    }
    return out;
  });

  // the profile table (predictions written before the recorded run) against the recorded canary; local only
  let predictionHeld = null;
  if (canary && cfg.lane === 'local' && PROFILE_SANDBOX[cfg.profile]) {
    predictionHeld = PROFILE_SANDBOX[cfg.profile] === canary.sandbox;
    if (!predictionHeld) mismatches.push({ step: 'canary-lake', expected: { sandbox: PROFILE_SANDBOX[cfg.profile] }, got: { sandbox: canary.sandbox } });
  }

  // two independent observations of the sandbox must agree: the canary and every sandboxed Lake run
  let agree = true;
  for (const s of steps) {
    if (!s.classification || s.argv.includes('--inadvisably-no-sandbox') || !canary) continue;
    const exempt = s.name.startsWith('start-') || s.name.startsWith('inject-');
    const onByRun = s.classification.sandbox === 'on';
    const failedByRun = s.classification.sandbox === 'failed';
    if ((canary.sandbox === 'failed' && onByRun) || (canary.sandbox === 'on' && failedByRun && !exempt)) {
      agree = false;
      mismatches.push({ step: s.name, expected: { sandbox: canary.sandbox }, got: { sandbox: s.classification.sandbox } });
    }
  }

  // timings: runs that reached 'accepted', grouped by step name without the repeat suffix
  const groups = new Map();
  for (const s of steps) {
    if (!s.classification || s.classification.verdict !== 'accepted' || s.name.startsWith('discover-')) continue;
    const key = stepBase(s.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ seconds: s.seconds, cpu_seconds: s.cpu_seconds, load_1min: Number(String(s.load_average_at_start).split(' ')[0]) });
  }
  const timings = {};
  for (const [k, xs] of groups) {
    const secs = xs.map((x) => x.seconds);
    const cpu = xs.map((x) => x.cpu_seconds).filter((x) => x !== null);
    timings[k] = {
      n: xs.length, min_s: round3(Math.min(...secs)), median_s: round3(median(secs)), max_s: round3(Math.max(...secs)),
      ...(cpu.length ? { cpu_min_s: round3(Math.min(...cpu)), cpu_median_s: round3(median(cpu)), cpu_max_s: round3(Math.max(...cpu)) } : {}),
      samples: xs,
    };
  }

  return { canary, minimal, steps, mismatches, missed, checked, timings, predictionHeld, agree };
}

// ---------- what each local profile stands in for, and what the three lanes still need
const EMULATES = {
  default: ['docker-desktop: a default container', 'codespaces: a dev container with no extra options', 'ci-runner: a job container with no extra options'],
  'unconfined-both': ['docker-desktop: seccomp and system paths unconfined', 'codespaces: a devcontainer securityOpt of seccomp and systempaths unconfined', 'ci-runner: a job container started with those two options'],
  narrow: ['docker-desktop: the opt-in profile', 'codespaces: the opt-in profile through devcontainer securityOpt', 'ci-runner: a job container with the opt-in profile'],
  privileged: ['ci-runner: steps on the runner VM with user namespaces permitted (Ubuntu 24.04 userland; this host\'s kernel, with no AppArmor)'],
};
const LANES = {
  'ci-runner': {
    what: 'GitHub-hosted runners: steps on the VM, and job containers',
    not_tested_locally: ['the runner image and its kernel', 'ubuntu-24.04-arm', 'the AppArmor restriction on unprivileged user namespaces, unless a vm-ubuntu-24.04 configuration is present (this host has no AppArmor)'],
    owner_action: 'Set the repository variable W0S06_SOLUTIONS_REPO and the secret W0S06_SOLUTIONS_DEPLOY_KEY (the private fixtures belong in the private companion repository), copy scripts/spikes/W0-S06/lanes/ci-runners.workflow.yml to .github/workflows/, dispatch it, download each job\'s artifact into runs/RUN-bwrap-lanes/ and run node scripts/spikes/W0-S06/assemble-run.mjs.',
  },
  'docker-desktop': {
    what: 'Docker Desktop on macOS (Apple silicon and Intel) and Windows (WSL 2)',
    not_tested_locally: ['Docker Desktop\'s VM kernel', 'Enhanced Container Isolation', 'Apple silicon (linux/arm64 images and the arm64 toolchain run)', 'the Windows WSL 2 backend', 'the VM\'s memory limit'],
    owner_action: 'On each machine, with the private fixtures copied there, run scripts/spikes/W0-S06/run-matrix.sh --solutions DIR --lane docker-desktop --only default,narrow,unconfined-both, commit runs/RUN-bwrap-lanes/docker-desktop-* with its engine-docker-desktop.env, and run assemble-run.mjs.',
  },
  codespaces: {
    what: 'GitHub Codespaces, first in the default dev container and then in the course devcontainer',
    not_tested_locally: ['the Codespaces VM and the container options it passes', 'whether devcontainer.json securityOpt takes effect in Codespaces and in a prebuild'],
    owner_action: 'In a Codespace, with the private fixtures copied or cloned in, run scripts/spikes/W0-S06/lane-probe.sh --solutions DIR --config codespaces-host --lane codespaces --label host --out runs/RUN-bwrap-lanes/codespaces-host --install --profile standard --off-controls, commit the folder, and run assemble-run.mjs; repeat in the course devcontainer once W0-T05 builds it.',
  },
};
const laneOf = (cfg) => (cfg.lane.startsWith('ci-') ? 'ci-runner' : cfg.lane.startsWith('docker-desktop') ? 'docker-desktop' : cfg.lane.startsWith('codespaces') ? 'codespaces' : null);

function laneStatus(configs) {
  const out = {};
  for (const [lane, info] of Object.entries(LANES)) {
    const real = configs.filter((c) => c.kind === 'measured' && laneOf(c) === lane);
    const emulatedBy = configs
      .filter((c) => c.kind === 'emulation')
      .map((c) => {
        const own = c.lane.startsWith('vm-') && lane === 'ci-runner' ? [`steps and containers on a stock Ubuntu 24.04 virtual machine (${c.profile})`] : [];
        const mapped = c.lane === 'local' ? (EMULATES[c.profile] ?? []).filter((e) => e.startsWith(lane + ':')).map((e) => e.slice(lane.length + 2)) : [];
        return { config: c.id, stands_in_for: [...own, ...mapped], sandbox: c.sandbox };
      })
      .filter((e) => e.stands_in_for.length > 0);
    out[lane] = {
      what: info.what,
      status: real.length > 0 ? 'measured on the real lane' : 'not run on the real lane: emulated locally, see emulated_by and not_tested_locally',
      measured: real.map((c) => ({ config: c.id, sandbox: c.sandbox })),
      emulated_by: emulatedBy,
      not_tested_locally: info.not_tested_locally,
      owner_action: info.owner_action,
    };
  }
  return out;
}

// ---------- inputs and hashes
// The private fixtures have no path in this repository: each is listed by name, as <solutions>/<file> for the three that
// the harness mounts and <variants>/<file> for the eight that mutate.mjs makes from Solution.lean.
const privateName = (n) => (n.startsWith('variants/') ? `<variants>/${n.slice('variants/'.length)}` : `<solutions>/${n}`);
const inputKey = (i) => i.path ?? i.name;

function inputsList() {
  const picks = [
    ...listFiles(join(HERE, 'pack')).map((p) => [p, 'challenge pack, public part: the challenge, the comparator configuration and the lakefile']),
    [join(HERE, 'image', 'Dockerfile'), 'probe image'],
    ...['lane-probe.sh', 'run-matrix.sh', 'bwrap-shim.sh', 'make-seccomp-profile.mjs', 'list-bundle.sh', 'classify.mjs', 'expectations.mjs', 'assemble-run.mjs', 'classify.test.mjs', 'collision-trial.sh', 'collect-oom.mjs', 'mutate.mjs', 'mutate.test.mjs'].map((f) => [join(HERE, f), 'harness']),
    [join(HERE, 'private-fixtures.json'), 'harness: the hashes of the private fixtures'],
    ...(existsSync(join(HERE, 'vm')) ? listFiles(join(HERE, 'vm')).map((p) => [p, 'harness (virtual machine)']) : []),
    ...(existsSync(join(HERE, 'lanes')) ? listFiles(join(HERE, 'lanes')).map((p) => [p, 'template for the real lanes (not run)']) : []),
  ].filter(([p]) => existsSync(p));
  const published = picks.map(([p, role]) => ({ path: rel(p), sha256: sha256(readFileSync(p)), role }));
  const hidden = [...MANIFEST.fixtures, ...MANIFEST.variants].map((f) => ({
    name: privateName(f.name),
    sha256: f.sha256,
    bytes: f.bytes,
    role: f.role,
    ...(f.made_by ? { made_by: f.made_by } : {}),
  }));
  const inputs = [...published, ...hidden].sort((a, b) => inputKey(a).localeCompare(inputKey(b)));
  const digest = sha256(inputs.map((i) => `${i.sha256}  ${inputKey(i)}`).join('\n') + '\n');
  return { inputs, digest };
}

// What of the private fixtures is in the published tree: a whole fixture or variant (the same bytes) in the files this task
// publishes, or a Lean file in the pack other than the challenge. A partial copy is not found this way; review catches that.
function publishedFixtureProblems() {
  const known = new Map([...MANIFEST.fixtures, ...MANIFEST.variants].map((f) => [f.sha256, f.name]));
  const problems = [];
  for (const root of [HERE, RUNS, join(ROOT, 'docs', 'spikes')]) {
    if (!existsSync(root)) continue;
    for (const p of listFiles(root)) {
      const hit = known.get(sha256(readFileSync(p)));
      if (hit) problems.push(`${rel(p)} is ${hit}`);
    }
  }
  for (const p of listFiles(join(HERE, 'pack'))) if (p.endsWith('.lean') && !p.endsWith('/challenge/Challenge.lean')) problems.push(`${rel(p)} is a Lean file in the pack that is not the challenge`);
  return problems;
}

// What a configuration says about the fixtures it used (the probe writes fixtures.sha256: hashes only), against the manifest.
function fixtureStatus(listed) {
  if (!listed) return { recorded: false, note: 'recorded before the probe wrote fixtures.sha256; it ran with the files that inputs[] lists' };
  const want = new Map([...MANIFEST.fixtures, ...MANIFEST.variants].map((f) => [f.name, f.sha256]));
  const differs = listed.filter((f) => want.get(f.name) !== f.sha256).map((f) => f.name);
  return { recorded: true, files: listed.length, match: differs.length === 0, differs };
}

const statementSha = (text) => sha256(text.replace(/\s+$/, '') + '\n');
const utcSeconds = (a, b) => (a && b ? (Date.parse(b) - Date.parse(a)) / 1000 : null);

// ---------- main
const configDirs = readdirSync(RUNS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(RUNS, e.name, 'facts.env')))
  .map((e) => join(RUNS, e.name))
  .sort();
if (configDirs.length === 0) {
  console.error(`no config directories under ${RUNS}`);
  process.exit(2);
}

const engineEnvs = readdirSync(RUNS).filter((n) => /^engine-.*\.env$/.test(n)).map((n) => ({ file: n, ...readEnv(join(RUNS, n)) }));
const engineOf = (lane) => engineEnvs.find((e) => e.lane === lane);
const vmEnv = readEnv(join(RUNS, 'vm.env'));

const configs = [];
const allMismatches = [];
const allMissed = [];
let allAgree = true;
for (const dir of configDirs) {
  const cfg = readConfig(dir);
  const a = analyze(cfg);
  allAgree = allAgree && a.agree;
  const kind = cfg.lane === 'local' || cfg.lane.startsWith('vm-') ? 'emulation' : 'measured';
  const f = cfg.facts;
  const headlineStep = ['check-paranoid-r1', 'comparator-paranoid-r1', 'comparator', 'comparator-r1'].map((n) => a.steps.find((s) => s.name === n)).find(Boolean);
  const verdictLines = headlineStep?.output
    ? lines(read(join(ROOT, headlineStep.output))).filter((l) => l.length > 0 && !l.startsWith('Exporting ') && !l.includes('declaration uses `sorry`'))
    : [];
  configs.push({
    id: cfg.id,
    purpose: `${kind === 'emulation' ? 'emulation' : 'measurement'} of the sandbox: lane ${cfg.lane}, profile ${cfg.profile}`,
    lane: cfg.lane,
    profile: cfg.profile,
    kind,
    emulates: kind === 'emulation' && cfg.lane === 'local' ? EMULATES[cfg.profile] ?? [] : cfg.lane.startsWith('vm-') ? ['ci-runner: a stock Ubuntu 24.04 virtual machine'] : [],
    argv: cfg.dockerArgv,
    budget: { container_memory: cfg.dockerArgv?.find((w) => w.startsWith('--memory=')) ?? 'not a container', probe_profile: cfg.done.profile_used },
    started_at: f.started_utc,
    duration_s: utcSeconds(f.started_utc, cfg.done.finished_utc),
    exit_code: cfg.dockerExit,
    sandbox: a.canary ? a.canary.sandbox : 'unknown',
    sandbox_detail: a.canary ? a.canary.detail : null,
    canary: { minimal: a.minimal, lake_shaped: a.canary },
    predicted_sandbox: cfg.lane === 'local' ? PROFILE_SANDBOX[cfg.profile] ?? null : null,
    prediction_held: a.predictionHeld,
    fixtures: fixtureStatus(cfg.fixtures),
    probe: {
      profile_requested: cfg.done.profile_requested,
      profile_used: cfg.done.profile_used,
      steps: Number(cfg.done.steps ?? cfg.steps.length),
      load_average_at_start: f.loadavg_start,
      load_average_at_end: cfg.done.loadavg_end,
      memory_peak_bytes: cfg.done.memory_peak_bytes ? Number(cfg.done.memory_peak_bytes) : null,
    },
    facts: {
      os: f.os, kernel: f.kernel, arch: f.arch, cpu_count: Number(f.nproc), mem_kib: Number(f.mem_kib), cpu_model: f.cpu_model, uid: Number(f.uid),
      seccomp_mode: Number(f.seccomp_mode), no_new_privs: Number(f.no_new_privs),
      cap_eff: f.cap_eff, cap_bnd: f.cap_bnd, cap_sys_admin_in_bounding_set: hasCap(f.cap_bnd, 21), cap_sys_admin_effective: hasCap(f.cap_eff, 21),
      lsm_process_label: f.lsm_process_label, lsm_list: f.lsm_list,
      max_user_namespaces: f.max_user_namespaces, unprivileged_userns_clone: f.unprivileged_userns_clone, apparmor_restrict_unprivileged_userns: f.apparmor_restrict_unprivileged_userns,
      dockerenv: f.dockerenv, run_user_dir: f.run_user_dir,
      before_install: { run_user_dir: f.before_install_run_user_dir ?? null, bwrap: f.before_install_bwrap ?? null, lake: f.before_install_lake ?? null },
      cpus_allowed: f.cpus_allowed ?? null, cpu_max_mhz: f.cpu_max_mhz ? f.cpu_max_mhz.trim() : null, memory_limit_bytes: f.memory_limit_bytes ?? null,
      bwrap: { path: f.bwrap_path, version: f.bwrap_version, sha256: f.bwrap_sha256, mode: f.bwrap_mode },
      lean: f.lean_version, lake: f.lake_version, toolchain_file: f.toolchain_file,
      tool_binary_sha256: Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('sha256_')).map(([k, v]) => [k.slice(7), v])),
    },
    timings: a.timings,
    bwrap_calls: { comparator_paranoid: readShim(cfg.dir, 'comparator'), check_paranoid: readShim(cfg.dir, 'check'), kernelskip_paranoid: readShim(cfg.dir, 'kernelskip') },
    steps: a.steps,
    verdict_lines: verdictLines,
    outputs: [folderOutput(cfg.dir, 'raw output of every step, the facts, the docker run argv and the bubblewrap logs; paths normalized to <work>, <elan> and <home>', COMPARE_STEPS)],
    expectations: { checked: a.checked, mismatches: a.mismatches, missed: a.missed },
    kernel_oom: cfg.kernelOom,
    ...(cfg.note ? { notes: [cfg.note] } : {}),
  });
  for (const m of a.mismatches) allMismatches.push({ config: cfg.id, ...m });
  for (const m of a.missed) allMissed.push({ config: cfg.id, ...m });
}

const primary = configs.find((c) => c.id === 'local-narrow') ?? configs.find((c) => c.sandbox === 'on') ?? configs[0];
const engine = engineOf('local') ?? engineEnvs[0] ?? {};
const f0 = primary.facts;
const { inputs, digest } = inputsList();
const challenge = join(HERE, 'pack', 'lab2', 'challenge', 'Challenge.lean');

// declarations replayed, from the recorded output of the primary configuration
function declarationCounts(stepName) {
  const s = primary.steps.find((x) => x.name === stepName);
  if (!s?.output) return null;
  const text = read(join(ROOT, s.output));
  const m = (re) => (text.match(re) ? Number(text.match(re)[1]) : null);
  return { lean4lean: m(/checked (\d+) declarations/), con_leche: m(/con-leche: accepted (\d+) declarations/), con_ron: m(/con-ron: accepted (\d+) declarations/) };
}

// static toolchain bundle listings
const bundles = {};
for (const arch of ['x86_64', 'aarch64']) {
  const d = join(RUNS, `bundle-${arch}`);
  if (!existsSync(d)) continue;
  const env = readEnv(join(d, 'bundle.env'));
  const bins = read(join(d, 'bin.tsv')).split('\n').filter(Boolean).map((l) => l.split('\t')).map(([name, bytes, sha]) => ({ name, bytes: Number(bytes), sha256: sha }));
  const six = ['leanchecker', 'leanchecker-paranoid', 'lean4lean', 'nanoda_bin', 'con-leche', 'con-ron'];
  bundles[arch] = { url: env.url, archive_bytes: Number(env.archive_bytes), archive_sha256: env.archive_sha256, six_checkers_present: six.every((n) => bins.some((b) => b.name === n)), bin: bins };
}

// the CI-runner workflow template, checked with actionlint by lanes/lint.sh (the output is kept beside the run)
function readWorkflowLint() {
  const f = join(RUNS, 'workflow-lint.txt');
  if (!existsSync(f)) return null;
  const t = read(f);
  const get = (k) => (t.match(new RegExp(`^${k}: (.*)$`, 'm')) ?? [])[1] ?? null;
  const exit = (t.match(/^--- exit: (\d+)$/m) ?? [])[1];
  const body = t.split('--- output\n')[1]?.split('--- exit:')[0] ?? '';
  const wf = join(HERE, 'lanes', 'ci-runners.workflow.yml');
  return {
    argv: get('argv'),
    version: get('version'),
    binary_sha256: get('binary_sha256'),
    input_sha256: get('input_sha256'),
    exit_code: exit === undefined ? null : Number(exit),
    findings: body.split('\n').filter((l) => l.trim().length > 0),
    input_is_current: existsSync(wf) && get('input_sha256') === sha256(readFileSync(wf)),
  };
}
const workflowLint = readWorkflowLint();

const checks = [];
const predicted = configs.filter((c) => c.prediction_held !== null);
checks.push({ id: 'predictions', pass: predicted.every((c) => c.prediction_held), detail: `${predicted.filter((c) => c.prediction_held).length} of ${predicted.length} local container profiles started or failed the sandbox as predicted before the recorded run (the Lake-shaped canary is the observation)` });
const classified = configs.reduce((n, c) => n + c.steps.filter((s) => s.classification).length, 0);
const checkedN = configs.reduce((n, c) => n + c.expectations.checked, 0);
checks.push({ id: 'classifier', pass: allMismatches.length === 0, detail: `${checkedN} of ${classified} classified Lake runs have an expectation written from how the step was built; ${checkedN - allMismatches.length - allMissed.length} match, ${allMissed.length} was a prediction the recording refuted (the classifier read the output as expectations.mjs records; see summary.predictions_missed), ${allMismatches.length} classifier mismatches` });
checks.push({ id: 'canary agrees with the runs', pass: allAgree, detail: 'in every configuration, the Lake-shaped canary and the classification of the sandboxed Lake runs agree on whether the sandbox started' });
const paranoidPass = configs.find((c) => c.sandbox === 'on' && c.steps.some((s) => s.name.startsWith('check-paranoid') && s.classification?.verdict === 'accepted' && s.classification.sandbox === 'on' && s.classification.checkers.length === 6));
checks.push({ id: 'a passing lake check --paranoid is on disk', pass: Boolean(paranoidPass), detail: paranoidPass ? `${paranoidPass.id}: six checkers accept, sandbox on` : 'none' });
const stepsWith = (pred) => configs.reduce((n, c) => n + c.steps.filter(pred).length, 0);
const confusions = stepsWith((s) => s.classification && s.expected && ((s.expected.verdict === 'rejected' && s.classification.sandbox === 'failed') || (s.expected.sandbox === 'failed' && s.classification.verdict === 'rejected')));
checks.push({ id: 'no confusion between rejection and sandbox failure', pass: confusions === 0, detail: `${stepsWith((s) => s.expected?.verdict === 'rejected')} runs built to be rejected and ${stepsWith((s) => s.expected?.sandbox === 'failed')} runs built to fail in the sandbox: ${confusions} read as the other` });

const leaked = publishedFixtureProblems();
checks.push({
  id: 'the private fixtures are not published',
  pass: leaked.length === 0,
  detail: leaked.length === 0
    ? `none of the ${MANIFEST.fixtures.length} private fixtures or ${MANIFEST.variants.length} variants made from them (inputs[], role "private fixture, not published") is a file of this task's scripts, outputs or decision record, and the pack holds no Lean file but the challenge`
    : leaked.join('; '),
});
const withFixtures = configs.filter((c) => c.fixtures.recorded);
if (withFixtures.length > 0) {
  checks.push({
    id: 'configurations that recorded their fixtures used the recorded ones',
    pass: withFixtures.every((c) => c.fixtures.match),
    detail: `${withFixtures.filter((c) => c.fixtures.match).length} of ${withFixtures.length} configurations with a fixtures.sha256 used the files of private-fixtures.json; a configuration that did not is listed in open[] (its timings are not comparable)`,
  });
}

if (workflowLint) {
  checks.push({
    id: 'the CI-runner workflow template passes actionlint',
    pass: workflowLint.exit_code === 0 && workflowLint.findings.length === 0 && workflowLint.input_is_current,
    detail: `actionlint ${workflowLint.version} (SHA-256 ${workflowLint.binary_sha256}) over lanes/ci-runners.workflow.yml (SHA-256 ${workflowLint.input_sha256}, ${workflowLint.input_is_current ? 'the file as it is now' : 'NOT the file as it is now: lint it again'}): exit ${workflowLint.exit_code}, ${workflowLint.findings.length} findings; this checks the syntax and the runner labels, it does not run the workflow`,
  });
}
if (bundles.x86_64) {
  const names = ['lake', 'lean', 'leanchecker', 'leanchecker-paranoid', 'lean4lean', 'nanoda_bin', 'con-leche', 'con-ron'];
  const same = names.filter((n) => bundles.x86_64.bin.find((b) => b.name === n)?.sha256 === f0.tool_binary_sha256[n]);
  checks.push({ id: 'the image\'s toolchain is the release archive\'s', pass: same.length === names.length, detail: `${same.length} of ${names.length} binaries (lake, lean and the six checkers) in the probe image have the SHA-256 of the same file in the x86_64 release archive of Lean 4.35.0 (SHA-256 ${bundles.x86_64.archive_sha256})` });
}
if (bundles.aarch64) {
  checks.push({ id: 'the aarch64 archive bundles the six checkers', pass: bundles.aarch64.six_checkers_present, detail: `the linux_aarch64 archive of Lean 4.35.0 (${bundles.aarch64.archive_bytes} bytes, SHA-256 ${bundles.aarch64.archive_sha256}) holds leanchecker, leanchecker-paranoid, lean4lean, nanoda_bin, con-leche and con-ron in bin/; none was run (no arm64 machine here)` });
}

const emulation = [
  'emulated: no run on a GitHub-hosted runner. The CI-runner lane is stood in for by container profiles on this machine\'s Docker Engine (default confinement, the opt-in profile, --privileged) and, where present, by a stock Ubuntu 24.04 virtual machine (vm-ubuntu-24.04-*); the runner image, its kernel and ubuntu-24.04-arm are not exercised',
  'emulated: no run on Docker Desktop. The Docker Desktop lane is stood in for by the same Docker Engine on Linux; Docker Desktop\'s VM, its Enhanced Container Isolation setting, Apple silicon and the Windows backend are not exercised',
  'emulated: no run in a Codespace. The Codespaces lane is stood in for by the same container profiles; whether a devcontainer.json securityOpt takes effect in Codespaces is not exercised',
  'emulated: this host runs no AppArmor (its Linux security modules are capability, landlock, yama and bpf), so the local configurations do not measure Docker\'s docker-default AppArmor profile or Ubuntu\'s AppArmor restriction on unprivileged user namespaces',
];
if (configs.some((c) => c.lane.startsWith('vm-'))) {
  emulation.push(`emulated: the vm-ubuntu-24.04 configurations ran in ${vmEnv.qemu ?? 'QEMU'} with KVM (${vmEnv.vm_cpus ?? '?'} vCPUs, ${vmEnv.vm_mem ?? '?'} of memory) from Canonical's Ubuntu 24.04 cloud image (SHA-256 ${vmEnv.vm_image_sha256 ?? '?'}), with Ubuntu's docker.io; this is stock Ubuntu 24.04, not the GitHub runner image`);
}

const record = {
  id: 'RUN-bwrap-lanes',
  title: 'Lean\'s bubblewrap sandbox and --paranoid mode on the LAB-2 challenge pack, in container profiles and virtual machines standing in for CI runners, Docker Desktop and Codespaces (W0-S06)',
  task: 'W0-S06',
  engine: 'lean (lake check and lake comparator, with and without --paranoid) inside bubblewrap',
  version: '4.35.0',
  version_string: `${f0.lean}; ${f0.lake}; ${f0.bwrap.version}`,
  binary: 'bin/lake of the 4.35.0 toolchain; the other binaries, bubblewrap included, are hashed under tools[]',
  binary_sha256: f0.tool_binary_sha256.lake,
  image: engine.image_id ? `${engine.image}@${engine.image_id}` : null,
  recorded_at: [engine.run_finished_utc, vmEnv.run_finished_utc].filter(Boolean).sort().pop() ?? new Date().toISOString(),
  started_at: [engine.run_started_utc, vmEnv.run_started_utc].filter(Boolean).sort()[0] ?? null,
  // the local matrix and the virtual-machine run, which ran one after the other; the VM's own docker passes are inside its time
  duration_s: engineEnvs.filter((e) => e.lane === 'local').concat(vmEnv.run_started_utc ? [vmEnv] : []).map((e) => utcSeconds(e.run_started_utc, e.run_finished_utc)).filter((x) => x !== null).reduce((a, b) => a + b, 0),
  exit_code: allMismatches.length === 0 && configs.every((c) => c.exit_code === 0 || c.exit_code === null) ? 0 : 1,
  primary_config: primary.id,
  pass: checks.every((c) => c.pass),
  argv: [
    'scripts/spikes/W0-S06/run-matrix.sh', '--full', 'narrow', '--cpuset', '12-13',
    '(CPUs 12 and 13 are two of this host\'s E-cores; pass the indices of slower cores on another host)',
    'then scripts/spikes/W0-S06/run-matrix.sh --only narrow-std (that profile again, alone, with the container tagged for collect-oom.mjs; local-narrow-std/note.txt says why), scripts/spikes/W0-S06/vm/run-vm.sh, scripts/spikes/W0-S06/list-bundle.sh aarch64, scripts/spikes/W0-S06/list-bundle.sh x86_64, scripts/spikes/W0-S06/lanes/lint.sh, and node scripts/spikes/W0-S06/assemble-run.mjs',
  ],
  inputs,
  input_sha256: digest,
  input_sha256_method: 'SHA-256 over the sorted "sha256  path" lines of inputs[], where an input without a path (a private fixture) is named by its name',
  challenge_statement_sha256: existsSync(challenge) ? statementSha(read(challenge)) : null,
  challenge_statement_sha256_method: 'sha256(trimRight(challenge/Challenge.lean) + "\\n"), the rule of spine section 9.4',
  budget: {
    container_memory: '6g per container (a run with a smaller cap says so in its argv)',
    cpus: 'no cap, except in the narrow-cpus2 and narrow-cpuset profiles (their argv says so)',
    timeouts: 'none',
    containers_at_once: 1,
    repeats: 'in the primary configuration: the comparator commands 5, the lake check commands 3, the sandbox-off lake check commands 1; once in the others',
  },
  environment: {
    os: `Linux ${engine.docker_kernel} ${String(engine.docker_os_arch ?? '').split('/')[1] === 'amd64' ? 'x86_64' : engine.docker_os_arch}`,
    host_distribution: engine.docker_operating_system,
    cpu_count: Number(engine.docker_ncpu),
    ram_gib: Math.round(Number(engine.docker_memtotal) / 2 ** 30),
    cpu_model: f0.cpu_model,
    container: {
      runtime: 'docker',
      server_version: engine.docker_server,
      image: engine.image,
      digest: engine.image_id,
      digest_note: 'a locally built image with no registry digest: this is its image id',
      os: f0.os,
      security_options: engine.docker_security_options,
      run_flags: primary.argv ? primary.argv.slice(primary.argv.indexOf('--rm'), primary.argv.indexOf(engine.image)) : [],
      network: 'Docker default bridge; the checks need none',
    },
    host_tools: { node: process.version },
    cpu_architecture: 'x86_64',
    load_average_at_start: primary.probe.load_average_at_start,
    load_average_at_end: primary.probe.load_average_at_end,
    emulated: true,
    emulation,
  },
  verdict_lines: primary.verdict_lines,
  outputs: [
    folderOutput(
      RUNS,
      'every configuration folder (facts.env, steps/*.out and *.meta, docker-run.argv, shim/*.log), the toolchain bundle listings, the engine and virtual-machine facts, and the seccomp profiles with their notice',
      COMPARE_STEPS,
    ),
  ],
  values: {
    timings_config: primary.id,
    timings_s: Object.fromEntries(Object.entries(primary.timings).map(([k, t]) => [k, { n: t.n, min: t.min_s, median: t.median_s, max: t.max_s, ...(t.cpu_median_s !== undefined ? { cpu_median: t.cpu_median_s } : {}) }])),
    declarations_replayed: { lake_comparator_paranoid: declarationCounts('comparator-paranoid-r1'), lake_check_paranoid: declarationCounts('check-paranoid-r1') },
    lake_bwrap_argv_before_the_command: lakeBwrapArgv(join(RUNS, primary.id)),
    bwrap_calls: primary.bwrap_calls,
    sandbox_by_config: Object.fromEntries(configs.map((c) => [c.id, c.sandbox])),
    memory_peak_bytes_by_config: Object.fromEntries(configs.filter((c) => c.probe.memory_peak_bytes).map((c) => [c.id, c.probe.memory_peak_bytes])),
    toolchain_bundles: bundles,
    workflow_lint: workflowLint,
  },
  checks,
  tools: [
    ...['lake', 'lean', 'leanchecker', 'leanchecker-paranoid', 'lean4lean', 'nanoda_bin', 'con-leche', 'con-ron'].map((n) => ({ name: n, version: `bundled with Lean ${f0.lean.match(/version ([\d.]+)/)?.[1] ?? ''}`, sha256: f0.tool_binary_sha256[n] })),
    { name: 'bwrap', version: f0.bwrap.version, sha256: f0.bwrap.sha256 },
    ...(workflowLint ? [{ name: 'actionlint', version: workflowLint.version, sha256: workflowLint.binary_sha256 }] : []),
  ],
  lanes: laneStatus(configs),
  open: [
    ...Object.entries(LANES).filter(([lane]) => !configs.some((c) => c.kind === 'measured' && laneOf(c) === lane)).map(([lane, i]) => `${lane}: no record from the real lane. ${i.owner_action}`),
    ...configs.filter((c) => c.fixtures.recorded && !c.fixtures.match).map((c) => `${c.id}: ran with fixture files other than those of private-fixtures.json (${c.fixtures.differs.join(', ')}); its timings are not comparable with the local matrix`),
  ],
  notes: [
    'Question: what do the sandbox and --paranoid mode do on CI runners, Docker Desktop and Codespaces, how long does --paranoid take on the LAB-2 challenge pack, and how does statespace check tell a sandbox failure from a rejection? The decision record is docs/spikes/W0-S06.md.',
    'The real lanes could not be run on this machine. configs[] holds local emulations, each labeled; lanes{} lists, for each lane, what stands in for it, what was not tested and the owner action that completes it.',
    'The pack is the whole-lab configuration of curriculum/S02-proof.md section 3. Its statements are copied verbatim from the S02 spec (pack/lab2/challenge/Challenge.lean, public). Its three solution files, Solution.lean (proofs of the seven whole-lab theorems), broken/Broken.lean and fixed/Fixed.lean, are complete proofs and are not published: they are reference solutions, which stay in a private place (spine section 11.1). inputs[] lists them by SHA-256 with the role "private fixture, not published", as it lists the eight rejected solutions that mutate.mjs makes from Solution.lean; private-fixtures.json holds the same values. Broken and Fixed import Solution, because lake check loads every default target into one environment and fails with "environment already contains" when two of them define the same name.',
    'The recorded configurations ran while the three files and eight rejected solutions were still inside the pack folder: each docker-run.argv mounts scripts/spikes/W0-S06/pack at /pack and names /pack/lab2 and /pack/variants. They have since been moved out of the public tree. The harness now takes the three from --solutions DIR (mounted at /solutions) and has mutate.mjs make the rejected solutions from Solution.lean (mounted at /variants); mutate.mjs --solutions DIR --verify shows that the files the harness is given have the SHA-256 values in inputs[] and that the eight it makes are byte for byte the ones that ran. The files were last modified at 2026-10-24T12:52:41Z, before the first configuration started (2026-10-24T13:41:34Z), and the hashes in inputs[] are theirs: runs/RUN-bwrap-lanes/private-fixtures-provenance.txt lists each file\'s hash and modification time, read from the copies kept outside the repository, and the result of comparing the eight rejected solutions that mutate.mjs makes with the files that ran. The probe wrote no fixtures.sha256 then; a configuration recorded with the present harness carries one (hashes only), and open[] names any that used other files.',
    'A side trial, scripts/spikes/W0-S06/collision-trial.sh, is kept in runs/RUN-bwrap-lanes/trial-module-collision/: two libraries whose root modules are both named SelfTransfer, as the S02 layout sketch has. Lake built one SelfTransfer.olean, from the first library, never built the second, and lake build and lake check both exited 0.',
    'Every step records the 1-, 5- and 15-minute load average at its start. This is a shared host: its timings were taken under whatever load other jobs put on it, and they are not promises.',
    'inputs[] holds the hashes of the harness files as they were when this record was assembled. run-matrix.sh gained the container tagging (--cidfile) and the call to collect-oom.mjs after the first pass of the matrix had run, so the local configurations other than local-narrow-std carry no kernel-oom.txt, and local-narrow-std was recorded a second time, alone, for that reason (see its note.txt); the Docker configurations on the virtual machine, recorded later, carry a kernel-oom.txt that says whether the guest could read its kernel log.',
    'classify.mjs is the reference rule. expectations.mjs holds what each step was built to show, written from how the step is constructed and from exploratory runs made before this recorded run, and not from the classifier\'s output.',
  ],
  summary: { configs: configs.length, classified_lake_runs: classified, expectations_checked: checkedN, mismatches: allMismatches, predictions_missed: allMissed },
  configs,
};

// ---------- markdown tables for the decision record
function markdown() {
  const out = [];
  const t3 = (t) => (t ? `${t.min_s} / ${t.median_s} / ${t.max_s} (n=${t.n})${t.cpu_median_s !== undefined ? `; CPU median ${t.cpu_median_s}` : ''}` : '');
  out.push('### Container profiles');
  out.push('| config | docker run options | canary | sandbox | first bubblewrap line |');
  out.push('|---|---|---|---|---|');
  for (const c of configs) {
    const argv = c.argv ?? [];
    const from = argv.indexOf('--name') + 2;
    const to = argv.indexOf('-v');
    const opts = from > 1 && to > from ? argv.slice(from, to).join(' ') : '';
    out.push(`| ${c.id} | ${opts || (argv.length ? '(none)' : 'not a container')} | ${c.canary.lake_shaped?.sandbox ?? ''} | ${c.sandbox} | ${(c.sandbox_detail ?? '').replace(/\|/g, '\\|').replace(/, likely because.*$/, ', likely because ...')} |`);
  }
  out.push('');
  out.push(`### Timings, seconds (min / median / max), config ${primary.id}`);
  out.push('| command | sandbox on | sandbox off |');
  out.push('|---|---|---|');
  for (const k of ['comparator', 'comparator-paranoid', 'check', 'check-paranoid']) {
    out.push(`| lake ${k.replace('-paranoid', ' --paranoid')} | ${t3(primary.timings[k])} | ${t3(primary.timings[k + '-off'])} |`);
  }
  out.push('');
  for (const [cmd, label] of [['comparator_paranoid', 'lake comparator --paranoid'], ['check_paranoid', 'lake check --paranoid'], ['kernelskip_paranoid', 'lake comparator --paranoid on the kernel-skip solution']]) {
    const calls = primary.bwrap_calls[cmd];
    if (!calls) continue;
    out.push(`### Phases of ${label} (one run with the shim, config ${primary.id})`);
    out.push('| call | phase | seconds | network |');
    out.push('|---|---|---|---|');
    for (const c of calls) out.push(`| ${c.n} | ${c.phase} | ${c.seconds} | ${c.network} |`);
    out.push(`| | total | ${round3(calls.reduce((a, c) => a + c.seconds, 0))} | |`);
    out.push('');
  }
  // the classified Lake runs, grouped by what the rule read them as
  const groups = new Map();
  for (const c of configs) {
    for (const st of c.steps) {
      if (!st.classification) continue;
      const k = `${st.classification.sandbox} | ${st.classification.verdict} | ${st.classification.reason.replace(/\d+$/, 'N')}`;
      if (!groups.has(k)) groups.set(k, { n: 0, codes: new Set(), example: st.classification.evidence[0] ?? '', configs: new Set() });
      const g = groups.get(k);
      g.n += 1;
      g.codes.add(st.exit_code);
      g.configs.add(c.id);
    }
  }
  out.push('### Classified Lake runs');
  out.push('| sandbox | verdict | reason | runs | exit codes | first evidence line |');
  out.push('|---|---|---|---|---|---|');
  for (const [k, g] of [...groups.entries()].sort()) {
    const [a, b, r] = k.split(' | ');
    out.push(`| ${a} | ${b} | ${r} | ${g.n} | ${[...g.codes].sort().join(', ')} | ${g.example.replace(/\|/g, '\\|').slice(0, 110)} |`);
  }
  out.push('');
  return out.join('\n');
}

if (args.has('--markdown')) console.log(markdown());

console.log(`configs: ${configs.length}; classified Lake runs: ${classified}; with an expectation: ${checkedN}; mismatches: ${allMismatches.length}; predictions missed: ${allMissed.length}; pass: ${record.pass}`);
for (const c of configs) console.log(`  ${c.id.padEnd(40)} sandbox=${c.sandbox.padEnd(7)} predicted=${String(c.predicted_sandbox).padEnd(7)} steps=${c.steps.length}`);
for (const m of allMismatches) console.log(`  MISMATCH ${m.config} ${m.step}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.got)}`);
for (const m of allMissed) console.log(`  MISSED PREDICTION ${m.config} ${m.step}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.got)}`);

for (const c of checks.filter((x) => !x.pass)) console.log(`  CHECK FAILED ${c.id}: ${c.detail}`);

// the private fixtures, when a directory was given: its files and the variants made from them against the manifest
let fixturesOk = true;
if (solutionsDir) {
  const v = verifyDir(solutionsDir);
  fixturesOk = v.problems.length === 0;
  for (const m of v.problems) console.log(`  PRIVATE FIXTURE MISMATCH ${m}`);
  console.log(`private fixtures in --solutions: ${v.checked - v.problems.length} of ${v.checked} files and variants match private-fixtures.json`);
} else {
  console.log('private fixtures: not verified here (no --solutions DIR); inputs[] takes their hashes from private-fixtures.json');
}

if (!args.has('--check')) {
  writeFileSync(OUT_JSON, JSON.stringify(record, null, 2) + '\n');
  console.log(`wrote ${rel(OUT_JSON)}`);
}
process.exit(allMismatches.length === 0 && record.pass && fixturesOk ? 0 : 1);
