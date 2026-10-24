#!/usr/bin/env node
// The CI lane runner (spine section 11.2; ARCHITECTURE.md section 13; W0-T04). Dependency-free; Node 22.
//
//   node scripts/spikes/W0-T04/lane.mjs fast                 the fast lane: every pull request and push; under 5 minutes
//   node scripts/spikes/W0-T04/lane.mjs nightly              the nightly lane; writes status/nightly.json
//   node scripts/spikes/W0-T04/lane.mjs release              the release lane: strict gates, then GATE-release (a stub: fails closed)
//   node scripts/spikes/W0-T04/lane.mjs monthly --lean TAG   GATE-labs on the newest stable Lean
//
//   --list              print the lane's steps and whether each script exists, then stop
//   --summary FILE      write the lane summary (JSON); STATESPACE_LANE_SUMMARY names a default
//   --status FILE       nightly: where to write the status document (default status/nightly.json)
//   --previous FILE     nightly: the previous status document; a gate that stays red keeps its "since" date
//   --claims FILE       nightly: JSON object, gate ID -> course claim IDs it backs (default content/assurance/gate-claims.json when present)
//   --blocked REASON    nightly: run nothing and write a red status; the previous failures stay listed
//   --budget-s N        fail when the lane takes longer than N seconds (default: the manifest's budget for the lane)
//   --timeout-s N       the longest a single step may run (default: the manifest's step timeout, and never past the budget)
//   --only A,B          run only these step IDs
//   --lean TAG          monthly: the Lean release under test; steps see it as STATESPACE_LEAN_TOOLCHAIN=leanprover/lean4:TAG
//   --root DIR          the repository to run in (default: this repository)
//   --manifest FILE     the step table (default: gates.json beside this file)
//   --now ISO           the clock for the status document (tests)
//
// The steps are in gates.json. A step whose script does not exist yet is reported as "absent", with the task that
// builds it; it is neither a pass nor a failure, except in a lane where the manifest marks it required (GATE-release
// in the release lane), where it fails the lane. The lane clock starts when STATESPACE_LANE_START (epoch seconds) says
// the job started, so the budget counts the job's setup steps too; without it the clock starts here.
//
// Exit status: 0 every step that ran passed; 1 a step failed, timed out or was missing where required, or the lane
// went over budget or was blocked; 2 a usage or manifest problem.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.resolve(HERE, '..', '..', '..');
export const LANES = ['fast', 'nightly', 'release', 'monthly'];
export const STATUS_SCHEMA = 'statespace/nightly-status@1';
export const DEFAULT_CLAIMS = 'content/assurance/gate-claims.json';

export class UsageError extends Error {}

// ------------------------------------------------------------------ the manifest
const STEP_ID = /^(?:GATE-[a-z0-9]+(?:-[a-z0-9]+)*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;
const TASK_ID = /^W[0-9]-[ST][0-9]{2}$/;

export function validateManifest(doc) {
  const problems = [];
  if (doc?.format !== 'lane-manifest/1') problems.push('format must be "lane-manifest/1"');
  for (const lane of LANES) {
    const cfg = doc?.lanes?.[lane];
    if (!cfg || typeof cfg.step_timeout_s !== 'number' || !(cfg.step_timeout_s > 0)) problems.push(`lanes.${lane}.step_timeout_s must be a positive number`);
    if (cfg && 'budget_s' in cfg && !(typeof cfg.budget_s === 'number' && cfg.budget_s > 0)) problems.push(`lanes.${lane}.budget_s must be a positive number`);
  }
  if (!Array.isArray(doc?.steps) || doc.steps.length === 0) {
    problems.push('steps must be a non-empty array');
    return problems;
  }
  const seen = new Set();
  for (const [i, s] of doc.steps.entries()) {
    const at = `steps[${i}]${s?.id ? ` (${s.id})` : ''}`;
    if (typeof s?.id !== 'string' || !STEP_ID.test(s.id)) problems.push(`${at}: id is missing or malformed`);
    else if (seen.has(s.id)) problems.push(`${at}: the id is used twice`);
    else seen.add(s.id);
    if (s?.kind !== 'gate' && s?.kind !== 'check') problems.push(`${at}: kind must be "gate" or "check"`);
    if (s?.kind === 'gate' && !/^GATE-/.test(s.id ?? '')) problems.push(`${at}: a gate's id starts with GATE-`);
    if (s?.kind === 'check' && /^GATE-/.test(s.id ?? '')) problems.push(`${at}: only a gate's id starts with GATE-`);
    const hasScript = typeof s?.script === 'string';
    const hasArgv = Array.isArray(s?.argv) && s.argv.length > 0 && s.argv.every((a) => typeof a === 'string');
    if (hasScript === hasArgv) problems.push(`${at}: give exactly one of script (a Node script) and argv (a command)`);
    if (!hasScript && s?.needs !== undefined && typeof s.needs !== 'string') problems.push(`${at}: needs must be a path`);
    if (!hasScript && s?.kind === 'check' && typeof s?.needs !== 'string') problems.push(`${at}: a command needs "needs", the file whose absence means the step does not exist yet`);
    if (s?.built_by !== null && !(typeof s?.built_by === 'string' && TASK_ID.test(s.built_by))) problems.push(`${at}: built_by is a task ID such as W0-T04, or null`);
    const lanes = s?.lanes;
    if (typeof lanes !== 'object' || lanes === null || Object.keys(lanes).length === 0) problems.push(`${at}: lanes must name at least one lane`);
    else {
      for (const [lane, cfg] of Object.entries(lanes)) {
        if (!LANES.includes(lane)) problems.push(`${at}: unknown lane ${lane}`);
        if (typeof cfg !== 'object' || cfg === null) problems.push(`${at}: lanes.${lane} must be an object`);
        else {
          if (cfg.args !== undefined && !(Array.isArray(cfg.args) && cfg.args.every((a) => typeof a === 'string'))) problems.push(`${at}: lanes.${lane}.args must be a list of strings`);
          for (const [name, args] of Object.entries(cfg.args_if_env ?? {})) {
            if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !(Array.isArray(args) && args.every((a) => typeof a === 'string'))) problems.push(`${at}: lanes.${lane}.args_if_env.${name} must map an environment variable to a list of strings`);
          }
          if (cfg.required !== undefined && typeof cfg.required !== 'boolean') problems.push(`${at}: lanes.${lane}.required must be true or false`);
        }
      }
    }
  }
  return problems;
}

export function loadManifest(file) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new UsageError(`cannot read the manifest ${file}: ${e.message}`);
  }
  const problems = validateManifest(doc);
  if (problems.length > 0) throw new UsageError(`the manifest ${file} is not valid:\n  ${problems.join('\n  ')}`);
  return doc;
}

/** The steps of one lane, in manifest order, with their argv for this lane and whether their script exists. */
export function resolveSteps(manifest, lane, root, env = process.env) {
  const out = [];
  for (const s of manifest.steps) {
    const cfg = s.lanes[lane];
    if (!cfg) continue;
    const extra = [];
    for (const [name, args] of Object.entries(cfg.args_if_env ?? {})) if (env[name]) extra.push(...args);
    const args = [...(cfg.args ?? []), ...extra];
    const needs = s.script ?? s.needs ?? null;
    out.push({
      id: s.id,
      kind: s.kind,
      argv: s.script ? ['node', s.script, ...args] : [...s.argv, ...args],
      needs,
      present: needs === null ? true : fs.existsSync(path.join(root, needs)),
      required: cfg.required === true,
      builtBy: s.built_by,
    });
  }
  return out;
}

// ------------------------------------------------------------------ text hygiene
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/** Paths of this machine never enter a record or a status document: the repository is <repo>, a home directory <home>. */
export function redactor(root, env = process.env) {
  const roots = new Set();
  for (const p of [root, safeRealpath(root), env.GITHUB_WORKSPACE]) if (p && p.length > 1) roots.add(p.replace(/\/+$/, ''));
  const homes = new Set([os.homedir(), env.HOME].filter((p) => p && p.length > 1 && p !== '/'));
  const tmps = new Set([os.tmpdir(), env.RUNNER_TEMP, env.TMPDIR].filter((p) => p && p.length > 1 && p !== '/'));
  const ordered = (set, label) => [...set].sort((a, b) => b.length - a.length).map((p) => [p.replace(/\/+$/, ''), label]);
  const fixed = [...ordered(roots, '<repo>'), ...ordered(tmps, '<tmp>'), ...ordered(homes, '<home>')];
  return (text) => {
    let t = String(text).replace(ANSI, '');
    for (const [from, to] of fixed) t = t.split(from).join(to);
    return t.replace(/(?<![\w.~-])\/(?:home|Users)\/[A-Za-z0-9._-]+/g, '<home>').replace(/(?<![\w.~-])\/tmp\/claude-[\w.-]*/g, '<tmp>');
  };
}

function safeRealpath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

/** npm's own lines (the script echo and its error trailer) say nothing about the verdict. */
const NPM_NOISE = /^(?:>\s|npm (?:error|notice|warn)\b)/;

/** Node's test runner ends each run with `# tests N`, `# pass N`, `# fail N`; npm test prints one block per workspace. */
function tapTotals(text) {
  const sums = {};
  for (const m of String(text).matchAll(/^# (tests|pass|fail|skipped) (\d+)\s*$/gm)) sums[m[1]] = (sums[m[1]] ?? 0) + Number(m[2]);
  if (sums.tests === undefined) return null;
  return `${sums.tests} tests, ${sums.pass ?? 0} passed, ${sums.fail ?? 0} failed${sums.skipped ? `, ${sums.skipped} skipped` : ''}`;
}

/**
 * The line that carries a step's verdict: the totals of a TAP report when the step printed one, else its last line that is
 * not npm's own, else "no output".
 */
export function verdictOf(text) {
  const tap = tapTotals(text);
  if (tap) return tap;
  const lines = String(text).split('\n').map((l) => l.trim()).filter((l) => l !== '' && !NPM_NOISE.test(l));
  return (lines.at(-1) ?? 'no output').slice(0, 240);
}

export function tailOf(text, n = 12) {
  return String(text).split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '').slice(-n).map((l) => l.slice(0, 240));
}

// ------------------------------------------------------------------ running a step
function killTree(child) {
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

const active = new Set();
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const child of active) killTree(child);
    process.exit(130);
  });
}

/** Run one step; resolves with {exit_code, signal, timed_out, spawn_error, output, duration_s}. Never rejects. */
export function runStep(step, { root, timeoutMs, env, onText }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const argv = step.argv[0] === 'node' ? [process.execPath, ...step.argv.slice(1)] : step.argv;
    let output = '';
    let timedOut = false;
    let done = false;
    let child;
    const finish = (extra) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (child) active.delete(child);
      resolve({ exit_code: null, signal: null, timed_out: timedOut, spawn_error: null, output, duration_s: round((Date.now() - started) / 1000), ...extra });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      if (child) killTree(child);
    }, timeoutMs);
    try {
      child = spawn(argv[0], argv.slice(1), { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    } catch (e) {
      finish({ spawn_error: e.message });
      return;
    }
    active.add(child);
    const take = (buf) => {
      const text = buf.toString('utf8');
      output += text;
      onText?.(text);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (e) => finish({ spawn_error: e.message }));
    child.on('close', (code, signal) => finish({ exit_code: code, signal }));
  });
}

const round = (n) => Math.round(n * 1000) / 1000;

// ------------------------------------------------------------------ one lane
/**
 * Run the steps of a lane and collect the summary. `emit` receives the lines the runner prints; `redact` cleans every
 * text that is stored.
 */
export async function runLane({ lane, steps, root, env, budgetS, stepTimeoutS, laneStartMs, redact, emit, stream, annotate }) {
  const started = laneStartMs;
  const deadline = budgetS ? started + budgetS * 1000 : null;
  const results = [];
  let overBudget = false;
  const todo = steps.length;
  let i = 0;
  for (const step of steps) {
    i += 1;
    const label = `[${String(i).padStart(2)}/${todo}] ${step.id}`;
    const base = { id: step.id, kind: step.kind, built_by: step.builtBy, argv: step.argv };
    if (!step.present) {
      const required = step.required;
      results.push({
        ...base,
        result: required ? 'error' : 'absent',
        exit_code: null,
        duration_s: 0,
        verdict: required ? `${step.needs} does not exist: a step this lane requires is missing${step.builtBy ? ` (built by ${step.builtBy})` : ''}` : `${step.needs} does not exist yet${step.builtBy ? ` (built by ${step.builtBy})` : ''}`,
        required,
      });
      if (required) {
        emit.line(`${label.padEnd(30)} ${'ERROR'.padEnd(7)} ${'0.0'.padStart(6)} s  ${results.at(-1).verdict}`);
        annotate?.('error', step.id, `${step.needs} does not exist: ${step.id} is required in the ${lane} lane, so the lane fails closed`);
      }
      continue;
    }
    const now = Date.now();
    if (deadline !== null && now >= deadline) {
      overBudget = true;
      results.push({ ...base, result: 'skipped', exit_code: null, duration_s: 0, verdict: `not run: the lane budget of ${budgetS} s was used up` });
      continue;
    }
    const remainingMs = deadline === null ? Infinity : deadline - now;
    const timeoutMs = Math.max(1000, Math.min(stepTimeoutS * 1000, remainingMs));
    emit.group?.(`${label}  (${redact(step.argv.join(' '))})`);
    const lineBuffer = makeLineBuffer((line) => stream(redact(line)));
    const r = await runStep(step, { root, timeoutMs, env, onText: lineBuffer.push });
    lineBuffer.flush();
    emit.endgroup?.();
    const clean = redact(r.output);
    let result;
    if (r.timed_out) result = 'timeout';
    else if (r.spawn_error) result = 'error';
    else if (r.exit_code === 0) result = 'pass';
    else if (r.exit_code === 1) result = 'fail';
    else result = 'error';
    const entry = {
      ...base,
      result,
      exit_code: r.exit_code,
      ...(r.signal ? { signal: r.signal } : {}),
      duration_s: r.duration_s,
      verdict: r.timed_out ? `stopped after ${round(timeoutMs / 1000)} s (the step timeout)` : r.spawn_error ? redact(`could not start: ${r.spawn_error}`) : verdictOf(clean),
    };
    if (result !== 'pass') entry.output_tail = tailOf(clean);
    results.push(entry);
    const line = `${label.padEnd(30)} ${result.toUpperCase().padEnd(7)} ${String(r.duration_s.toFixed(1)).padStart(6)} s  ${entry.verdict}`;
    emit.line(line);
    if (result !== 'pass') annotate?.('error', step.id, `${step.id} ${result}: ${entry.verdict}`);
  }
  const ended = Date.now();
  const durationS = round((ended - started) / 1000);
  if (budgetS && durationS > budgetS) overBudget = true;
  return { results, durationS, overBudget, startedMs: started, endedMs: ended };
}

function makeLineBuffer(sink) {
  let pending = '';
  return {
    push(text) {
      pending += text;
      const parts = pending.split('\n');
      pending = parts.pop();
      for (const p of parts) sink(p);
    },
    flush() {
      if (pending !== '') sink(pending);
      pending = '';
    },
  };
}

// ------------------------------------------------------------------ documents
export const counts = (results) => {
  const c = { pass: 0, fail: 0, error: 0, timeout: 0, absent: 0, skipped: 0 };
  for (const r of results) c[r.result] += 1;
  return c;
};

const FAILING = new Set(['fail', 'error', 'timeout']);
export const isFailing = (r) => FAILING.has(r.result);

export function laneSummary({ lane, run, budgetS, commit, dirty, source, runner, redact }) {
  const c = counts(run.results);
  const failed = run.results.some(isFailing) || run.overBudget;
  return {
    format: 'lane-summary/1',
    lane,
    result: failed ? 'fail' : 'pass',
    started_at: new Date(run.startedMs).toISOString(),
    ended_at: new Date(run.endedMs).toISOString(),
    duration_s: run.durationS,
    budget_s: budgetS ?? null,
    over_budget: run.overBudget,
    commit,
    ...(dirty === null || dirty === undefined ? {} : { dirty }),
    source,
    runner,
    counts: c,
    steps: run.results.map((r) => ({ ...r, argv: r.argv.map((a) => redact(a)) })),
  };
}

/** The status document of a nightly run (ARCHITECTURE.md section 13.4). `previous` may be null. */
export function buildStatus({ summary, previous, claimsMap, claimsSource, now, imageDigest, blocked }) {
  const date = now.toISOString().slice(0, 10);
  const prev = previous && previous.schema === STATUS_SCHEMA ? previous : null;
  const prevFailed = new Map((prev?.failed ?? []).map((f) => [f.gate, f]));
  const gates = summary.steps.filter((s) => s.kind === 'gate' && s.result !== 'absent' && s.result !== 'skipped');
  const checks = summary.steps.filter((s) => s.kind === 'check' && s.result !== 'absent' && s.result !== 'skipped');
  const slim = (s) => ({ id: s.id, result: s.result, exit_code: s.exit_code, duration_s: s.duration_s, verdict: s.verdict });

  let failed;
  if (blocked) {
    // Nothing ran tonight, so nothing was verified: what was red stays red, with its old date.
    failed = (prev?.failed ?? []).map((f) => ({ ...f, claims: claimsMap[f.gate] ?? f.claims ?? [] }));
  } else {
    failed = gates.filter(isFailing).map((g) => ({
      gate: g.id,
      result: g.result,
      since: prevFailed.get(g.id)?.since ?? date,
      claims: claimsMap[g.id] ?? [],
    }));
  }
  const red = Boolean(blocked) || failed.length > 0 || checks.some(isFailing) || summary.over_budget || summary.steps.some((s) => s.result === 'error' && s.required);
  const prevRed = prev?.result === 'red';
  return {
    schema: STATUS_SCHEMA,
    date,
    commit: summary.commit,
    ...(summary.dirty === undefined ? {} : { dirty: summary.dirty }),
    result: red ? 'red' : 'green',
    blocked: blocked ?? null,
    red_since: red ? (prevRed && prev.red_since ? prev.red_since : date) : null,
    source: summary.source,
    runner: summary.runner,
    image_digest: imageDigest ?? null,
    started_at: summary.started_at,
    duration_s: summary.duration_s,
    gates: gates.map(slim),
    checks: checks.map(slim),
    failed,
    absent: summary.steps.filter((s) => s.kind === 'gate' && s.result === 'absent').map((s) => ({ gate: s.id, built_by: s.built_by })),
    claims_source: claimsSource ?? null,
  };
}

export function markdownSummary(summary) {
  const rows = summary.steps.filter((s) => s.result !== 'absent');
  const absent = summary.steps.filter((s) => s.result === 'absent');
  const out = [];
  out.push(`### ${summary.lane} lane: ${summary.result.toUpperCase()} in ${summary.duration_s.toFixed(1)} s${summary.budget_s ? ` (budget ${summary.budget_s} s${summary.over_budget ? ', over' : ''})` : ''}`);
  out.push('');
  out.push('| Step | Result | Seconds | Verdict |');
  out.push('|---|---|---:|---|');
  for (const s of rows) out.push(`| ${s.id} | ${s.result} | ${s.duration_s.toFixed(1)} | ${String(s.verdict).replace(/\|/g, '\\|')} |`);
  if (absent.length > 0) {
    out.push('');
    out.push(`Not built yet (${absent.length}): ${absent.map((s) => `${s.id}${s.built_by ? ` (${s.built_by})` : ''}`).join(', ')}.`);
  }
  out.push('');
  return out.join('\n');
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// ------------------------------------------------------------------ the environment of a run
function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function describeRun({ root, env, sourceOverride }) {
  const inActions = env.GITHUB_ACTIONS === 'true';
  const kind = sourceOverride ?? (inActions ? 'github-actions' : 'local');
  const source = { kind };
  if (inActions && kind === 'github-actions') {
    source.workflow = env.GITHUB_WORKFLOW ?? null;
    source.event = env.GITHUB_EVENT_NAME ?? null;
    source.run_id = env.GITHUB_RUN_ID ?? null;
    source.run_attempt = env.GITHUB_RUN_ATTEMPT ? Number(env.GITHUB_RUN_ATTEMPT) : null;
  }
  const commit = env.GITHUB_SHA || git(root, ['rev-parse', 'HEAD']);
  const dirty = kind === 'github-actions' ? undefined : (() => {
    const s = git(root, ['status', '--porcelain']);
    return s === null ? undefined : s !== '';
  })();
  const runner = { os: `${os.type()} ${os.release()}`, arch: os.arch(), cpus: os.availableParallelism(), node: process.version };
  return { source, commit: commit ?? null, dirty, runner };
}

// ------------------------------------------------------------------ the command line
const VALUE_OPTIONS = new Set(['--root', '--manifest', '--summary', '--status', '--previous', '--claims', '--blocked', '--budget-s', '--timeout-s', '--only', '--lean', '--now', '--source']);
const FLAG_OPTIONS = new Set(['--list', '--help', '--quiet']);

export function parseArgs(argv) {
  const opts = { lane: null, flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAG_OPTIONS.has(a)) opts.flags.add(a);
    else if (VALUE_OPTIONS.has(a)) {
      if (i + 1 >= argv.length) throw new UsageError(`${a} needs a value`);
      opts.values[a] = argv[++i];
    } else if (a.startsWith('--')) throw new UsageError(`unknown option ${a}`);
    else if (opts.lane === null) opts.lane = a;
    else throw new UsageError(`unexpected argument ${a}`);
  }
  return opts;
}

/** Workflow commands escape their data and properties (GitHub Actions toolkit rules). */
const escapeData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (s) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

const positive = (name, text) => {
  const n = Number(text);
  if (!(Number.isFinite(n) && n > 0)) throw new UsageError(`${name} needs a positive number, not ${JSON.stringify(text)}`);
  return n;
};

function readJsonOrNull(file, what, warn) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    warn(`${what} ${file} is not JSON (${e.message}); ignored`);
    return null;
  }
}

function loadClaims(file, root, explicit) {
  const abs = file ? path.resolve(file) : path.join(root, DEFAULT_CLAIMS);
  if (!fs.existsSync(abs)) {
    if (explicit) throw new UsageError(`--claims ${file} does not exist`);
    return { map: {}, source: null };
  }
  let map;
  try {
    map = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    throw new UsageError(`${abs} is not JSON: ${e.message}`);
  }
  const ok = map && typeof map === 'object' && !Array.isArray(map) && Object.values(map).every((v) => Array.isArray(v) && v.every((x) => typeof x === 'string'));
  if (!ok) throw new UsageError(`${abs} must be an object mapping a gate ID to a list of claim IDs`);
  return { map, source: file ? path.relative(root, abs).split(path.sep).join('/') : DEFAULT_CLAIMS };
}

export async function main(argv, env = process.env) {
  const out = (s) => process.stdout.write(`${s}\n`);
  const err = (s) => process.stderr.write(`${s}\n`);
  let opts;
  try {
    opts = parseArgs(argv);
    if (opts.flags.has('--help') || opts.lane === null) {
      const header = [];
      for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) {
        if (!l.startsWith('//')) break;
        header.push(l.replace(/^\/\/ ?/, ''));
      }
      out(header.join('\n'));
      return opts.lane === null && !opts.flags.has('--help') ? 2 : 0;
    }
    if (!LANES.includes(opts.lane)) throw new UsageError(`the lane is one of ${LANES.join(', ')}, not ${opts.lane}`);
    const v = opts.values;
    const root = path.resolve(v['--root'] ?? DEFAULT_ROOT);
    const manifest = loadManifest(path.resolve(v['--manifest'] ?? path.join(HERE, 'gates.json')));
    const laneCfg = manifest.lanes[opts.lane];
    const inActions = env.GITHUB_ACTIONS === 'true';
    const redact = redactor(root, env);

    const only = v['--only'] ? new Set(v['--only'].split(',').map((s) => s.trim()).filter(Boolean)) : null;
    let steps = resolveSteps(manifest, opts.lane, root, env);
    if (only) {
      const unknown = [...only].filter((id) => !steps.some((s) => s.id === id));
      if (unknown.length > 0) throw new UsageError(`--only names steps that the ${opts.lane} lane does not have: ${unknown.join(', ')}`);
      steps = steps.filter((s) => only.has(s.id));
    }

    if (opts.flags.has('--list')) {
      out(`${opts.lane} lane (${steps.length} steps; root ${redact(root)})`);
      for (const s of steps) out(`  ${s.present ? 'present' : 'absent '}  ${s.kind.padEnd(5)}  ${s.id.padEnd(20)} ${s.required ? 'required  ' : '          '}${redact(s.argv.join(' '))}${s.present ? '' : `   (built by ${s.builtBy ?? 'no task'})`}`);
      return 0;
    }

    const stepEnv = { ...env };
    if (v['--lean']) {
      if (opts.lane !== 'monthly') throw new UsageError('--lean belongs to the monthly lane');
      if (!/^v?[0-9]+\.[0-9]+\.[0-9]+$/.test(v['--lean'])) throw new UsageError(`--lean needs a release tag such as v4.35.0, not ${v['--lean']}`);
      stepEnv.STATESPACE_LEAN_TOOLCHAIN = `leanprover/lean4:${v['--lean'].startsWith('v') ? v['--lean'] : `v${v['--lean']}`}`;
    } else if (opts.lane === 'monthly') {
      throw new UsageError('the monthly lane needs --lean TAG, the newest stable Lean release');
    }
    if ((v['--status'] || v['--previous'] || v['--claims'] || v['--blocked']) && opts.lane !== 'nightly') throw new UsageError('--status, --previous, --claims and --blocked belong to the nightly lane');
    if (only && opts.lane === 'nightly' && !v['--status']) throw new UsageError('--only with the nightly lane would write a status that covers some steps only; name another file with --status');

    const now = v['--now'] ? new Date(v['--now']) : new Date();
    if (Number.isNaN(now.getTime())) throw new UsageError(`--now needs an ISO date-time, not ${v['--now']}`);
    const budgetS = v['--budget-s'] ? positive('--budget-s', v['--budget-s']) : (laneCfg.budget_s ?? null);
    const stepTimeoutS = v['--timeout-s'] ? positive('--timeout-s', v['--timeout-s']) : laneCfg.step_timeout_s;
    let laneStartMs = Date.now();
    if (env.STATESPACE_LANE_START) {
      const s = Number(env.STATESPACE_LANE_START) * 1000;
      if (Number.isFinite(s) && s <= Date.now() && Date.now() - s < 24 * 3600 * 1000) laneStartMs = s;
    }

    const where = describeRun({ root, env, sourceOverride: v['--source'] ?? env.STATESPACE_LANE_SOURCE });
    const quiet = opts.flags.has('--quiet');
    const emit = {
      line: (s) => out(s),
      group: inActions ? (s) => out(`::group::${s}`) : (s) => out(`--- ${s}`),
      endgroup: inActions ? () => out('::endgroup::') : null,
    };
    const annotate = inActions ? (level, title, message) => out(`::${level} title=${escapeProperty(title)}::${escapeData(message)}`) : null;
    const stream = quiet ? () => {} : (line) => out(line);
    const summaryFile = v['--summary'] ?? env.STATESPACE_LANE_SUMMARY;
    const finish = (summary) => {
      if (summaryFile) writeAtomic(path.resolve(summaryFile), `${JSON.stringify(summary, null, 2)}\n`);
      if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${markdownSummary(summary)}\n`);
    };
    const claims = opts.lane === 'nightly' ? loadClaims(v['--claims'], root, Boolean(v['--claims'])) : null;
    const previous = opts.lane === 'nightly' ? readJsonOrNull(v['--previous'] ? path.resolve(v['--previous']) : null, 'the previous status', (m) => err(`warning: ${m}`)) : null;
    const imageDigest = (env.STATESPACE_BENCH_IMAGE ?? '').match(/@(sha256:[0-9a-f]{64})$/)?.[1] ?? null;
    const statusFile = path.resolve(v['--status'] ?? path.join(root, 'status', 'nightly.json'));

    if (v['--blocked']) {
      const reason = redact(v['--blocked']);
      const emptyRun = { results: [], durationS: 0, overBudget: false, startedMs: laneStartMs, endedMs: laneStartMs };
      const summary = laneSummary({ lane: opts.lane, run: emptyRun, budgetS: null, ...where, redact });
      const status = buildStatus({ summary, previous, claimsMap: claims.map, claimsSource: claims.source, now, imageDigest, blocked: reason });
      writeAtomic(statusFile, `${JSON.stringify(status, null, 2)}\n`);
      finish({ ...summary, result: 'fail', blocked: reason });
      out(`nightly lane BLOCKED: ${reason}`);
      out(`wrote ${redact(statusFile)} (red since ${status.red_since}; ${status.failed.length} earlier failure(s) stay listed)`);
      return 1;
    }

    out(`${opts.lane} lane: ${steps.length} step(s), root ${redact(root)}${budgetS ? `, budget ${budgetS} s` : ''}`);
    const run = await runLane({ lane: opts.lane, steps, root, env: stepEnv, budgetS, stepTimeoutS, laneStartMs, redact, emit, stream, annotate });
    const summary = laneSummary({ lane: opts.lane, run, budgetS, ...where, redact });
    const c = summary.counts;
    const absent = summary.steps.filter((s) => s.result === 'absent');
    if (absent.length > 0) out(`absent, not built yet (${absent.length}): ${absent.map((s) => `${s.id}${s.built_by ? ` (${s.built_by})` : ''}`).join(', ')}`);
    if (opts.lane === 'nightly') {
      const status = buildStatus({ summary, previous, claimsMap: claims.map, claimsSource: claims.source, now, imageDigest, blocked: null });
      writeAtomic(statusFile, `${JSON.stringify(status, null, 2)}\n`);
      out(`wrote ${redact(statusFile)}: ${status.result}${status.failed.length ? `, ${status.failed.length} gate(s) failed` : ''}`);
    }
    finish(summary);
    if (run.overBudget) {
      out(`${opts.lane} lane is over its budget: ${summary.duration_s.toFixed(1)} s against ${budgetS} s. A slow gate moves to the nightly lane by a logged decision (ARCHITECTURE.md section 19).`);
      annotate?.('error', `${opts.lane} lane`, `over budget: ${summary.duration_s.toFixed(1)} s against ${budgetS} s`);
    }
    const ran = c.pass + c.fail + c.error + c.timeout;
    out(`${opts.lane} lane: ${ran === 0 && summary.result === 'pass' ? 'NO STEP RAN' : summary.result.toUpperCase()} in ${summary.duration_s.toFixed(1)} s (${c.pass} passed, ${c.fail + c.error + c.timeout} failed, ${c.skipped} skipped, ${c.absent} absent)`);
    return summary.result === 'pass' ? 0 : 1;
  } catch (e) {
    if (e instanceof UsageError) {
      err(`lane.mjs: ${e.message}`);
      return 2;
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(safeRealpath(process.argv[1]) ?? process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    console.error(e);
    process.exit(2);
  });
}
