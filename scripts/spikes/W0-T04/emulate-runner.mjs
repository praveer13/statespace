#!/usr/bin/env node
// A local stand-in for a GitHub-hosted runner (W0-T04). Dependency-free; Node 22, Docker, and uv for the YAML.
//
// A GitHub Actions run cannot be made from here, so the fast lane's duration (RUN-ci-fastlane) is measured by running the
// committed workflow's own steps in a container that resembles the hosted runner: Ubuntu 24.04, 4 CPUs (the size GitHub lists
// for a public repository), a clean checkout of this working tree, cold caches, and the setup steps done for real. This is an
// emulation, labelled as one wherever its numbers are used; it is not a GitHub run and it proves nothing about GitHub's queue,
// its cache service or its network.
//
//   node scripts/spikes/W0-T04/emulate-runner.mjs .github/workflows/fast.yml --job lane --out DIR [--cpus 4] [--memory 6g]
//
//   --job ID        the job to run (default: the only job)
//   --out DIR       where emulation.json, job.log and step-summary.md are written (default: a scratch directory)
//   --cpus N        the container's CPU quota (default 4)       --memory SIZE   its memory cap (default 6g, the cap of this host's rules)
//   --image NAME    the base image (default ubuntu:24.04)
//   --keep          leave the container in place (default: it is removed)
//   --overlay SRC=DEST   after the checkout step, put the host file SRC at DEST in the workspace (repeatable); each overlay is
//                        recorded in emulation.json with the hashes of both files and the --overlay-reason text
//   --overlay-reason TEXT   why the overlays are needed (required with --overlay)
//
// What is emulated, step by step:
//   run                 executed in the container with bash, as the runner does, under the job's env and defaults
//   actions/checkout    this working tree (tracked files and untracked files that .gitignore lets through) and its .git are
//                       copied in; the repository is a copy of what a checkout of the next commit would hold
//   actions/setup-node  Node of the requested version, downloaded from nodejs.org and checked against its SHASUMS256.txt
//                       (the real action takes it from GitHub's tool cache and restores the npm cache; here the cache is cold)
//   astral-sh/setup-uv  uv of the requested version, downloaded from its GitHub release and checked against the release's .sha256
//   other `uses:`       not run; the step is listed as skipped (artifact upload, caches)
// Before the clock starts, the container gets what the hosted image has preinstalled and this base image lacks: git, curl,
// Python 3, xz and the CA certificates. The clock runs from the start of the first step to the end of the last.
//
// Expressions in env values, `with` inputs and `if:` are evaluated for the subset the workflows use (contexts, ||, &&, ==, !=,
// !, always(), success(), failure()); anything else stops the run, so a workflow cannot quietly leave the emulated subset.
// secrets and vars are empty, as for a pull request from a fork.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { redactor } from './lane.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
export const WORKSPACE = '/work/statespace';
const TEMP = '/work/_temp';
const TOOLS = '/opt/hostedtoolcache';

export class EmulationError extends Error {}

// ------------------------------------------------------------------ workflow files
/** The workflow as plain strings (PyYAML's BaseLoader: no YAML 1.1 booleans, so the key `on` stays `on`). */
export function loadWorkflow(file) {
  const py = 'import sys, json, yaml; print(json.dumps(yaml.load(open(sys.argv[1], encoding="utf-8").read(), Loader=yaml.BaseLoader)))';
  const r = spawnSync('uv', ['run', '--no-project', '--quiet', '--with', 'pyyaml==6.0.3', 'python', '-I', '-B', '-c', py, file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new EmulationError(`could not read ${file} as YAML: ${(r.stderr || r.error?.message || '').trim().split('\n').slice(-2).join(' | ')}`);
  return JSON.parse(r.stdout);
}

export function pickJob(workflow, id) {
  const jobs = workflow.jobs ?? {};
  const ids = Object.keys(jobs);
  const key = id ?? (ids.length === 1 ? ids[0] : null);
  if (!key || !jobs[key]) throw new EmulationError(`name the job with --job (${ids.join(', ')})`);
  return { id: key, job: jobs[key] };
}

// ------------------------------------------------------------------ expressions
function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:('(?:[^']|'')*')|(\d+(?:\.\d+)?)|(\|\||&&|==|!=|!|\(|\)|,)|([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_*][A-Za-z0-9_-]*)*))/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) {
      if (src.slice(i).trim() === '') break;
      throw new EmulationError(`cannot read the expression near "${src.slice(i)}"`);
    }
    i = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'str', v: m[1].slice(1, -1).replace(/''/g, "'") });
    else if (m[2] !== undefined) tokens.push({ t: 'num', v: Number(m[2]) });
    else if (m[3] !== undefined) tokens.push({ t: 'op', v: m[3] });
    else tokens.push({ t: 'name', v: m[4] });
  }
  return tokens;
}

const truthy = (v) => !(v === undefined || v === null || v === '' || v === 0 || v === false || Number.isNaN(v));
const lookup = (ctx, dotted) => dotted.split('.').reduce((o, k) => (o !== null && typeof o === 'object' ? o[k] : undefined), ctx);

/** Evaluate one `${{ }}` expression against `ctx` (an object of contexts and a `status` for the job-status functions). */
export function evaluate(src, ctx) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (v) => {
    if (peek()?.t === 'op' && peek().v === v) {
      p += 1;
      return true;
    }
    return false;
  };
  const primary = () => {
    const t = toks[p++];
    if (!t) throw new EmulationError(`the expression "${src}" ends too early`);
    if (t.t === 'str' || t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '(') {
      const v = orExpr();
      if (!eat(')')) throw new EmulationError(`unclosed ( in "${src}"`);
      return v;
    }
    if (t.t === 'op' && t.v === '!') return !truthy(primary());
    if (t.t === 'name') {
      if (eat('(')) {
        if (!eat(')')) throw new EmulationError(`the emulator supports only functions without arguments: ${t.v}() in "${src}"`);
        switch (t.v) {
          case 'always':
            return true;
          case 'success':
            return ctx.status === 'success';
          case 'failure':
            return ctx.status === 'failure';
          case 'cancelled':
            return false;
          default:
            throw new EmulationError(`the emulator does not know ${t.v}() in "${src}"`);
        }
      }
      if (t.v === 'true') return true;
      if (t.v === 'false') return false;
      if (t.v === 'null') return null;
      const root = t.v.split('.')[0];
      if (!['github', 'env', 'vars', 'secrets', 'runner', 'inputs', 'needs', 'matrix', 'job', 'steps', 'strategy'].includes(root)) throw new EmulationError(`the emulator does not know the context ${root} in "${src}"`);
      return lookup(ctx, t.v);
    }
    throw new EmulationError(`unexpected ${t.v} in "${src}"`);
  };
  const eqExpr = () => {
    let l = primary();
    while (peek()?.t === 'op' && (peek().v === '==' || peek().v === '!=')) {
      const op = toks[p++].v;
      const r = primary();
      const same = typeof l === 'string' && typeof r === 'string' ? l.toLowerCase() === r.toLowerCase() : l === r || (l == null && r == null);
      l = op === '==' ? same : !same;
    }
    return l;
  };
  const andExpr = () => {
    let l = eqExpr();
    while (eat('&&')) {
      const r = eqExpr();
      l = truthy(l) ? r : l;
    }
    return l;
  };
  function orExpr() {
    let l = andExpr();
    while (eat('||')) {
      const r = andExpr();
      l = truthy(l) ? l : r;
    }
    return l;
  }
  const v = orExpr();
  if (p < toks.length) throw new EmulationError(`cannot read the expression "${src}" past "${toks[p].v}"`);
  return v;
}

const asText = (v) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Replace every ${{ expr }} in a string. */
export function interpolate(text, ctx) {
  if (typeof text !== 'string') return text;
  return text.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expr) => asText(evaluate(expr.trim(), ctx)));
}

/** `if:` of a step: no condition means success(); a bare expression may or may not be wrapped in ${{ }}. */
export function shouldRun(step, ctx) {
  if (step.if === undefined) return ctx.status === 'success';
  const raw = step.if.trim();
  const m = /^\$\{\{([\s\S]*)\}\}$/.exec(raw);
  const expr = (m ? m[1] : raw).trim();
  // A condition that does not call a status function gets success() in front of it.
  const mentionsStatus = /\b(always|success|failure|cancelled)\s*\(/.test(expr);
  const v = truthy(evaluate(expr, ctx));
  return mentionsStatus ? v : ctx.status === 'success' && v;
}

// ------------------------------------------------------------------ runner files
/** KEY=value lines and KEY<<DELIMITER blocks of a GITHUB_ENV file. */
export function parseEnvFile(text) {
  const out = {};
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') continue;
    const heredoc = /^([A-Za-z_][A-Za-z0-9_]*)<<(.+)$/.exec(line);
    if (heredoc) {
      const body = [];
      for (i += 1; i < lines.length && lines[i] !== heredoc[2]; i++) body.push(lines[i]);
      out[heredoc[1]] = body.join('\n');
      continue;
    }
    const eq = line.indexOf('=');
    if (eq > 0) out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

// ------------------------------------------------------------------ docker
function docker(args, opts = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.error) throw new EmulationError(`docker could not run: ${r.error.message}`);
  return r;
}

class Container {
  constructor({ name, image, cpus, memory, env }) {
    this.name = name;
    this.image = image;
    const args = ['run', '-d', '--name', name, `--cpus=${cpus}`, `--memory=${memory}`, `--memory-swap=${memory}`, '--pids-limit=4096', '-e', 'DEBIAN_FRONTEND=noninteractive'];
    for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
    args.push(image, 'sleep', 'infinity');
    const r = docker(args);
    if (r.status !== 0) throw new EmulationError(`could not start the container: ${r.stderr.trim()}`);
    this.basePath = this.exec('printenv PATH', { env: {} }).stdout.trim();
  }

  /** Run `script` under bash in the container; returns {status, stdout, stderr, output}. */
  exec(script, { env = {}, cwd = '/', shell = ['bash', '--noprofile', '--norc', '-eo', 'pipefail'] } = {}) {
    const args = ['exec', '-w', cwd];
    for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
    args.push(this.name, ...shell, '-c', script);
    const r = docker(args);
    return { status: r.status, stdout: r.stdout, stderr: r.stderr, output: r.stdout + r.stderr };
  }

  copyIn(hostFile, containerPath) {
    const r = docker(['cp', hostFile, `${this.name}:${containerPath}`]);
    if (r.status !== 0) throw new EmulationError(`docker cp failed: ${r.stderr.trim()}`);
  }

  copyOut(containerPath, hostFile) {
    const r = docker(['cp', `${this.name}:${containerPath}`, hostFile]);
    return r.status === 0;
  }

  remove() {
    docker(['rm', '-f', this.name]);
  }
}

// ------------------------------------------------------------------ the emulation
function hostInfo() {
  const cpu = (() => {
    try {
      return /model name\s*:\s*(.+)/.exec(fs.readFileSync('/proc/cpuinfo', 'utf8'))?.[1]?.trim() ?? null;
    } catch {
      return null;
    }
  })();
  return { os: `${os.type()} ${os.release()}`, arch: os.arch(), cpus: os.availableParallelism(), ram_gib: Math.round(os.totalmem() / 2 ** 30), cpu_model: cpu };
}

function gitOut(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

const round = (n) => Math.round(n * 1000) / 1000;
const fileSha = (file) => (fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null);

export async function emulate({ workflowFile, jobId, outDir, cpus = 4, memory = '6g', image = 'ubuntu:24.04', keep = false, overlays = [], overlayReason = null, log = (s) => process.stderr.write(`${s}\n`) }) {
  const workflow = loadWorkflow(workflowFile);
  const { id, job } = pickJob(workflow, jobId);
  if (job['runs-on'] !== 'ubuntu-24.04') throw new EmulationError(`the emulator stands in for ubuntu-24.04, not ${job['runs-on']}`);
  if (job.container) throw new EmulationError('the job runs in a container; the emulator does not');
  const shellDefault = job.defaults?.run?.shell ?? workflow.defaults?.run?.shell ?? null;

  const sha = gitOut(['rev-parse', 'HEAD']);
  const branch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']) ?? 'master';
  fs.mkdirSync(outDir, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'emulate-runner-'));
  const inspect = docker(['image', 'inspect', image, '--format', '{{json .RepoDigests}}|{{.Id}}|{{.Os}}/{{.Architecture}}']);
  if (inspect.status !== 0) throw new EmulationError(`the image ${image} is not on this host: ${inspect.stderr.trim()}`);
  const [repoDigests, imageId, platform] = inspect.stdout.trim().split('|');
  const digest = JSON.parse(repoDigests)[0] ?? null;

  const runnerEnv = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_WORKSPACE: WORKSPACE,
    GITHUB_SHA: sha ?? '',
    GITHUB_REF: `refs/heads/${branch}`,
    GITHUB_REF_NAME: branch,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_WORKFLOW: workflow.name ?? path.basename(workflowFile),
    GITHUB_JOB: id,
    RUNNER_OS: 'Linux',
    RUNNER_ARCH: 'X64',
    RUNNER_TEMP: TEMP,
    RUNNER_TOOL_CACHE: TOOLS,
    GITHUB_ENV: `${TEMP}/_runner_file_commands/set_env`,
    GITHUB_PATH: `${TEMP}/_runner_file_commands/add_path`,
    GITHUB_OUTPUT: `${TEMP}/_runner_file_commands/set_output`,
    GITHUB_STEP_SUMMARY: `${TEMP}/_runner_file_commands/step_summary`,
    STATESPACE_LANE_SOURCE: 'emulated-runner',
    STATESPACE_LANE_SUMMARY: `${TEMP}/lane-summary.json`,
  };
  const container = new Container({ name: `ss-emulate-${process.pid}-${Date.now()}`, image, cpus, memory, env: {} });
  const redact = (() => {
    const base = redactor(REPO);
    return (t) => base(t).split(WORKSPACE).join('<repo>').split(TEMP).join('<tmp>').replace(/(?<![\w.~-])\/root(?![\w.-])/g, '<home>');
  })();
  const jobLog = [];
  const steps = [];
  try {
    // What the hosted image has and this base image lacks, installed before the clock starts.
    log(`bootstrap: ${image} (${digest ?? imageId}); installing the tools the hosted image carries`);
    const bootstrap = container.exec(`apt-get update -qq && apt-get install -y -qq --no-install-recommends git curl ca-certificates xz-utils python3 > /dev/null && mkdir -p ${WORKSPACE} ${TEMP}/_runner_file_commands ${TOOLS} && : > ${runnerEnv.GITHUB_ENV} && : > ${runnerEnv.GITHUB_PATH} && : > ${runnerEnv.GITHUB_OUTPUT} && : > ${runnerEnv.GITHUB_STEP_SUMMARY} && git --version && python3 --version && curl --version | head -1 && . /etc/os-release && echo "$PRETTY_NAME"`);
    if (bootstrap.status !== 0) throw new EmulationError(`bootstrap failed: ${bootstrap.output.trim().split('\n').slice(-5).join(' | ')}`);
    const bootLines = bootstrap.stdout.trim().split('\n');
    const bootVersions = bootLines.slice(-4, -1);
    const containerOs = bootLines.at(-1);

    const workflowEnv = {};
    const dynamicEnv = {}; // GITHUB_ENV additions
    const addPaths = [];
    const ctx = {
      github: { sha: sha ?? '', ref: `refs/heads/${branch}`, ref_name: branch, event_name: 'workflow_dispatch', workspace: WORKSPACE, repository: '', event: {} },
      runner: { os: 'Linux', arch: 'X64', temp: TEMP, tool_cache: TOOLS },
      secrets: {},
      vars: {},
      env: {},
      status: 'success',
    };
    const evalEnv = (block) => {
      for (const [k, v] of Object.entries(block ?? {})) {
        const value = interpolate(v, { ...ctx, env: { ...workflowEnv, ...dynamicEnv } });
        workflowEnv[k] = value;
      }
    };
    evalEnv(workflow.env);
    evalEnv(job.env);

    const laneStart = Date.now();
    const list = job.steps ?? [];
    for (const [i, step] of list.entries()) {
      const name = interpolate(step.name ?? step.uses ?? step.run?.split('\n')[0] ?? `step ${i + 1}`, ctx);
      const label = `${i + 1}/${list.length} ${name}`;
      ctx.env = { ...workflowEnv, ...dynamicEnv };
      const entry = { index: i + 1, name, kind: step.uses ? 'uses' : 'run', ...(step.uses ? { uses: step.uses.replace(/@.*$/, '') } : {}) };
      if (!shouldRun(step, ctx)) {
        steps.push({ ...entry, result: 'skipped', duration_s: 0, note: `its condition (${step.if ?? 'success()'}) was false` });
        jobLog.push(`=== ${label}: skipped (condition false)`);
        continue;
      }
      const stepEnv = {};
      for (const [k, v] of Object.entries(step.env ?? {})) stepEnv[k] = interpolate(v, ctx);
      const t0 = Date.now();
      let res;
      let note = null;
      let emulated = true;
      if (step.uses) {
        const action = step.uses.replace(/@.*$/, '');
        const inputs = Object.fromEntries(Object.entries(step.with ?? {}).map(([k, v]) => [k, interpolate(v, ctx)]));
        res = runAction(action, inputs, { container, scratch, overlays });
        note = res.note;
        if (res.skipped) {
          steps.push({ ...entry, result: 'skipped', duration_s: 0, note });
          jobLog.push(`=== ${label}: skipped (${note})`);
          continue;
        }
        if (res.path) addPaths.push(res.path);
      } else {
        const shell = step.shell ?? shellDefault ?? null;
        const flags = shell === 'bash' ? ['bash', '--noprofile', '--norc', '-eo', 'pipefail'] : ['bash', '--noprofile', '--norc', '-e'];
        const env = {
          ...runnerEnv,
          ...workflowEnv,
          ...dynamicEnv,
          ...stepEnv,
          PATH: [...addPaths.slice().reverse(), container.basePath].join(':'),
        };
        res = container.exec(interpolate(step.run, ctx), { env, cwd: WORKSPACE, shell: flags });
        emulated = false;
        // GITHUB_ENV and GITHUB_PATH of this step apply to the next ones.
        const fileCmds = container.exec(`cat ${runnerEnv.GITHUB_ENV}; echo '---PATH---'; cat ${runnerEnv.GITHUB_PATH}; : > ${runnerEnv.GITHUB_ENV}; : > ${runnerEnv.GITHUB_PATH}`, { env: {} });
        const [envText, pathText = ''] = fileCmds.stdout.split('---PATH---\n');
        Object.assign(dynamicEnv, parseEnvFile(envText));
        for (const line of pathText.split('\n').filter(Boolean)) addPaths.push(line);
      }
      const t1 = Date.now();
      const ok = res.status === 0;
      steps.push({ ...entry, result: ok ? 'pass' : 'fail', exit_code: res.status, started_at: new Date(t0).toISOString(), duration_s: round((t1 - t0) / 1000), emulated, ...(note ? { note } : {}) });
      jobLog.push(`=== ${label}${emulated ? ' (emulated)' : ''}`, redact(res.output).trimEnd(), `--- exit ${res.status} in ${round((t1 - t0) / 1000)} s`);
      log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${round((t1 - t0) / 1000)} s`);
      if (!ok) ctx.status = 'failure';
    }
    const laneEnd = Date.now();

    const summaryOut = path.join(scratch, 'step-summary.md');
    const hasSummary = container.copyOut(runnerEnv.GITHUB_STEP_SUMMARY, summaryOut);
    const laneSummaryOut = path.join(scratch, 'lane-summary.json');
    const hasLane = container.copyOut(runnerEnv.STATESPACE_LANE_SUMMARY, laneSummaryOut);
    const peak = container.exec(`cat /sys/fs/cgroup/memory.peak 2>/dev/null || echo 0`, { env: {} }).stdout.trim();
    const emulation = {
      format: 'emulation/1',
      emulated: true,
      what: 'a container resembling a GitHub-hosted ubuntu-24.04 runner; not a GitHub Actions run',
      workflow: path.relative(REPO, path.resolve(workflowFile)).split(path.sep).join('/'),
      job: id,
      timeout_minutes: job['timeout-minutes'] ? Number(job['timeout-minutes']) : null,
      result: steps.some((s) => s.result === 'fail') ? 'fail' : 'pass',
      started_at: new Date(laneStart).toISOString(),
      duration_s: round((laneEnd - laneStart) / 1000),
      container: { runtime: 'docker', server_version: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(), image, image_digest: digest, image_id: imageId, platform, os: containerOs, cpus, memory, run_flags: ['-d', `--cpus=${cpus}`, `--memory=${memory}`, `--memory-swap=${memory}`, '--pids-limit=4096'], bootstrap: bootVersions },
      host: hostInfo(),
      overlays: overlays.map((o) => ({ path: o.to, replaced_sha256: fileSha(path.join(REPO, o.to)), sha256: fileSha(o.from), reason: overlayReason })),
      peak_memory_bytes: Number(peak) || null,
      has_lane_summary: hasLane,
      steps,
    };
    fs.writeFileSync(path.join(outDir, 'emulation.json'), `${JSON.stringify(emulation, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'job.log'), `${jobLog.join('\n')}\n`);
    if (hasSummary && fs.statSync(summaryOut).size > 0) fs.writeFileSync(path.join(outDir, 'step-summary.md'), redact(fs.readFileSync(summaryOut, 'utf8')));
    if (hasLane) fs.writeFileSync(path.join(outDir, 'lane-summary.json'), redact(fs.readFileSync(laneSummaryOut, 'utf8')));
    return emulation;
  } finally {
    if (!keep) container.remove();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ the actions
function runAction(action, inputs, { container, scratch, overlays }) {
  switch (action) {
    case 'actions/checkout': {
      const list = path.join(scratch, 'files.list');
      const files = spawnSync('git', ['ls-files', '-z', '-c', '-o', '--exclude-standard'], { cwd: REPO, maxBuffer: 256 * 1024 * 1024 });
      if (files.status !== 0) throw new EmulationError('git ls-files failed');
      // The working tree as it is: a tracked file deleted from it (a recorder clearing its own outputs) is not copied.
      const present = files.stdout.toString('utf8').split('\0').filter((f) => f !== '' && fs.existsSync(path.join(REPO, f)));
      fs.writeFileSync(list, present.map((f) => `${f}\0`).join(''));
      const tarFile = path.join(scratch, 'tree.tar');
      const pack = spawnSync('tar', ['-C', REPO, '--null', '-T', list, '-cf', tarFile], { encoding: 'utf8' });
      if (pack.status !== 0) throw new EmulationError(`tar failed: ${pack.stderr}`);
      const gitTar = path.join(scratch, 'git.tar');
      if (inputs['fetch-depth'] === '0') {
        const g = spawnSync('tar', ['-cf', gitTar, '-C', REPO, '.git'], { encoding: 'utf8' });
        if (g.status !== 0) throw new EmulationError(`tar of .git failed: ${g.stderr}`);
      }
      container.copyIn(tarFile, '/tmp/tree.tar');
      let script = `tar -xf /tmp/tree.tar -C ${WORKSPACE} --no-same-owner`;
      if (fs.existsSync(gitTar)) {
        container.copyIn(gitTar, '/tmp/git.tar');
        script += ` && tar -xf /tmp/git.tar -C ${WORKSPACE} --no-same-owner`;
      } else {
        script += ` && git -C ${WORKSPACE} init -q`;
      }
      script += ` && git config --global --add safe.directory ${WORKSPACE} && rm -f /tmp/tree.tar /tmp/git.tar`;
      const r = container.exec(script);
      for (const o of overlays) container.copyIn(o.from, `${WORKSPACE}/${o.to}`);
      return { ...r, note: `copies this working tree and its .git instead of fetching a commit${overlays.length ? `; ${overlays.length} file(s) overlaid, see overlays` : ''}` };
    }
    case 'actions/setup-node': {
      const v = inputs['node-version'];
      if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw new EmulationError(`the emulator installs an exact Node version, not "${v}"`);
      const dir = `${TOOLS}/node/${v}/x64`;
      const base = `https://nodejs.org/dist/v${v}`;
      const script = [
        'set -e; cd /tmp',
        `curl -fsSL -o node.tar.xz ${base}/node-v${v}-linux-x64.tar.xz`,
        `curl -fsSL -o SHASUMS256.txt ${base}/SHASUMS256.txt`,
        `want=$(grep " node-v${v}-linux-x64.tar.xz$" SHASUMS256.txt | cut -d' ' -f1)`,
        'echo "$want  node.tar.xz" | sha256sum -c -',
        `echo "sha256 $want node-v${v}-linux-x64.tar.xz"`,
        `mkdir -p ${dir}`,
        `tar -xJf node.tar.xz -C ${dir} --strip-components=1 --no-same-owner`,
        `export PATH=${dir}/bin:$PATH; node --version; npm --version`,
      ].join('\n');
      const r = container.exec(script);
      return { ...r, path: `${dir}/bin`, note: `Node ${v} from nodejs.org, SHA-256 checked; the real action uses GitHub's tool cache${inputs.cache ? ` and restores the ${inputs.cache} cache, which is cold here` : ''}` };
    }
    case 'astral-sh/setup-uv': {
      const v = inputs.version;
      if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw new EmulationError(`the emulator installs an exact uv version, not "${v}"`);
      const asset = 'uv-x86_64-unknown-linux-gnu.tar.gz';
      const base = `https://github.com/astral-sh/uv/releases/download/${v}`;
      const script = `set -e; cd /tmp; curl -fsSL -o ${asset} ${base}/${asset}; curl -fsSL -o ${asset}.sha256 ${base}/${asset}.sha256; want=$(cut -d' ' -f1 ${asset}.sha256); echo "$want  ${asset}" | sha256sum -c -; echo "sha256 $want ${asset}"; mkdir -p /opt/uv; tar -xzf ${asset} -C /opt/uv --strip-components=1 --no-same-owner; /opt/uv/uv --version`;
      const r = container.exec(script);
      return { ...r, path: '/opt/uv', note: `uv ${v} from its GitHub release, SHA-256 checked; the cache is off in the workflow` };
    }
    default:
      return { status: 0, stdout: '', stderr: '', output: '', skipped: true, note: `${action} is not emulated (no artifact or cache service here)` };
  }
}

// ------------------------------------------------------------------ the command line
export async function main(argv) {
  const o = { workflow: null, job: null, out: null, cpus: 4, memory: '6g', image: 'ubuntu:24.04', keep: false, overlays: [], overlayReason: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--keep') o.keep = true;
    else if (a === '--overlay') {
      const [from, to] = (argv[++i] ?? '').split('=');
      if (!from || !to || to.startsWith('/') || to.includes('..')) throw new EmulationError('--overlay needs SRC=DEST, with DEST relative to the workspace');
      if (!fs.existsSync(from)) throw new EmulationError(`--overlay: ${from} does not exist`);
      o.overlays.push({ from: path.resolve(from), to });
    } else if (a === '--overlay-reason') o.overlayReason = argv[++i] ?? null;
    else if (['--job', '--out', '--cpus', '--memory', '--image'].includes(a)) {
      if (i + 1 >= argv.length) throw new EmulationError(`${a} needs a value`);
      o[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) throw new EmulationError(`unknown option ${a}`);
    else if (!o.workflow) o.workflow = a;
    else throw new EmulationError(`unexpected argument ${a}`);
  }
  if (!o.workflow) throw new EmulationError('give the workflow file');
  const cpus = Number(o.cpus);
  if (!(cpus > 0)) throw new EmulationError('--cpus needs a positive number');
  if (o.overlays.length > 0 && !o.overlayReason) throw new EmulationError('--overlay needs --overlay-reason: an overlay changes what is measured, so it says why');
  const outDir = path.resolve(o.out ?? fs.mkdtempSync(path.join(os.tmpdir(), 'emulation-')));
  const e = await emulate({ workflowFile: path.resolve(o.workflow), jobId: o.job, outDir, cpus, memory: o.memory, image: o.image, keep: o.keep, overlays: o.overlays, overlayReason: o.overlayReason });
  console.log(`emulated ${e.workflow} job ${e.job} on ${e.container.cpus} CPUs: ${e.result} in ${e.duration_s.toFixed(1)} s (peak memory ${e.peak_memory_bytes ? `${(e.peak_memory_bytes / 2 ** 20).toFixed(0)} MiB` : 'unknown'}); outputs in ${path.relative(process.cwd(), outDir) || '.'}`);
  for (const s of e.steps) console.log(`  ${String(s.index).padStart(2)}  ${s.result.padEnd(7)} ${String(s.duration_s.toFixed(1)).padStart(7)} s  ${s.name}${s.emulated ? '  (emulated)' : ''}`);
  return e.result === 'pass' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(`emulate-runner: ${e.message}`);
      process.exit(e instanceof EmulationError ? 2 : 1);
    },
  );
}
