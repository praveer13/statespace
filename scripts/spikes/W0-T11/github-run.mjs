#!/usr/bin/env node
// W0-T11: adds GitHub-hosted runs of the fast lane to RUN-ci-fastlane as configurations, each with its job log and
// the run's metadata as hashed outputs. It reads a run with the gh CLI, so it needs network access and a logged-in gh;
// the committed record is the evidence, and this script is how it was made.
//
//   node scripts/spikes/W0-T11/github-run.mjs <run-id>... [--record runs/RUN-ci-fastlane.json] [--dry-run]
//
// For each run it writes, under runs/RUN-ci-fastlane/github-hosted-<commit>/,
//   run.json   what `gh run view <id> --json ...` returned: the run, its job and every step with its times
//   job.log    what `gh run view <id> --log` printed, with the checkout directory written as <repo>, the runner's home
//              directory as <runner-home> and the byte-order marks removed; nothing else is changed
// and merges into the record: a configuration github-hosted-<commit> (the commit, the run, the runner image, the lane's
// own verdict lines, the lane's duration by the rule of scripts/spikes/W0-T04/README.md section 5), the two files as
// outputs, a value per run for documents to cite, a check and a dated note. The primary configuration, the title and
// recorded_at are left as they are: those describe the first GitHub run. Running it again for the same run replaces
// what it wrote.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const RECORD = 'runs/RUN-ci-fastlane.json';
export const NOTE_MARKER = 'Added by W0-T11 on';
const JSON_FIELDS = 'databaseId,headSha,headBranch,event,status,conclusion,createdAt,startedAt,updatedAt,url,workflowName,displayTitle,attempt,jobs';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const r1 = (x) => Math.round(x * 10) / 10;

// ------------------------------------------------------------------ the log
/**
 * The log as the record stores it: no byte-order marks, the checkout directory as <repo> and the runner's home as
 * <runner-home>. Throws when a home directory or a scratch directory of anyone else is left in it.
 */
export function normalizeLog(text) {
  const work = /Working directory is '([^']+)'/.exec(text)?.[1] ?? null;
  let out = text.replaceAll('﻿', '');
  if (work !== null) out = out.replaceAll(work, '<repo>');
  out = out.replaceAll('/home/runner', '<runner-home>');
  const left = /\/home\/[A-Za-z0-9._-]+|\/Users\/[A-Za-z0-9._-]+|\/tmp\/claude-[\w.-]*/.exec(out);
  if (left !== null) throw new Error(`a private path is left in the log after normalising: ${left[0]}`);
  return out;
}

/** The lines of a `gh run view --log`: job, step, timestamp and text. A line that does not parse is kept as text. */
export function parseLog(text) {
  return text
    .split('\n')
    .filter((l) => l !== '')
    .map((raw) => {
      const [job, step, ...rest] = raw.split('\t');
      const body = rest.join('\t');
      const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z) ?([\s\S]*)$/.exec(body);
      return m === null ? { job, step, ts: null, text: body } : { job, step, ts: m[1], text: m[2] };
    });
}

/** The lane runner's own lines: each step's verdict, the absent gates and the lane's total. */
export function verdictLines(lines) {
  return lines.filter((l) => l.step === 'Run the fast lane' && /^(?:\[ ?\d+\/\d+\] |absent, not built yet|fast lane: )/.test(l.text)).map((l) => l.text);
}

/** `fast lane: PASS in 78.7 s (13 passed, 0 failed, 0 skipped, 15 absent)` as numbers. */
export function laneResult(verdicts) {
  const last = [...verdicts].reverse().find((l) => /^fast lane: (?:PASS|FAIL) in /.test(l));
  const m = /^fast lane: (PASS|FAIL) in ([\d.]+) s \((\d+) passed, (\d+) failed, (\d+) skipped, (\d+) absent\)$/.exec(last ?? '');
  if (m === null) throw new Error('the log has no line "fast lane: PASS|FAIL in N s (...)"');
  const head = /^fast lane: (\d+) step\(s\), root \S+, budget (\d+) s$/.exec(verdicts.find((l) => /^fast lane: \d+ step/.test(l)) ?? '');
  return { result: m[1], clock_s: Number(m[2]), passed: Number(m[3]), failed: Number(m[4]), skipped: Number(m[5]), absent: Number(m[6]), steps: head === null ? null : Number(head[1]), budget_s: head === null ? null : Number(head[2]) };
}

/** The runner image and the tool versions the log prints. */
export function toolsOf(lines) {
  const texts = lines.map((l) => l.text);
  const group = texts.findIndex((t) => /^##\[group\]Runner Image$/.test(t));
  const image = group < 0 ? null : texts.slice(group + 1, texts.indexOf('##[endgroup]', group)).map((t) => t.split(': ')).filter((p) => p.length === 2);
  const get = (name) => image?.find(([k]) => k === name)?.[1] ?? null;
  const pick = (re) => texts.map((t) => re.exec(t)).find((m) => m !== null)?.[1] ?? null;
  return {
    runner_image: get('Image') !== null && get('Version') !== null ? `${get('Image')}, image version ${get('Version')}` : null,
    tools: { node: pick(/^node: v(\S+)$/), npm: pick(/^npm: (\S+)$/), uv: pick(/^Successfully installed uv version (\S+)$/), git: pick(/^git version (\S+)$/) },
  };
}

// ------------------------------------------------------------------ the run
/** The job's steps that belong to the lane: not GitHub's own Set up job, Post and Complete job. */
export const laneSteps = (job) => job.steps.filter((s) => s.name !== 'Set up job' && s.name !== 'Complete job' && !s.name.startsWith('Post '));

const seconds = (a, b) => (Date.parse(b) - Date.parse(a)) / 1000;

/** The lane's window by the rule of scripts/spikes/W0-T04/README.md section 5: first lane step start to last lane step end. */
export function laneWindow(job) {
  const steps = laneSteps(job);
  if (steps.length === 0) throw new Error('the job has no lane steps');
  return { started_at: steps[0].startedAt, ended_at: steps.at(-1).completedAt, duration_s: seconds(steps[0].startedAt, steps.at(-1).completedAt) };
}

/** The configuration for one run: `run` is `gh run view --json`, `log` the normalised log, `subject` the commit's first line. */
export function buildConfig({ run, log, subject, outputs, inputs = [] }) {
  const job = run.jobs.find((j) => j.name === 'fast lane') ?? run.jobs[0];
  if (job === undefined) throw new Error('the run has no job');
  const lines = parseLog(log);
  const verdicts = verdictLines(lines);
  const lane = laneResult(verdicts);
  const window = laneWindow(job);
  const { runner_image, tools } = toolsOf(lines);
  const sha7 = run.headSha.slice(0, 7);
  const green = run.conclusion === 'success';
  return {
    id: `github-hosted-${sha7}`,
    label: `the committed fast.yml on a GitHub-hosted runner, triggered by the push of ${JSON.stringify(subject ?? run.displayTitle)}: ${green ? 'green' : run.conclusion}`,
    run_id: run.databaseId,
    url: run.url,
    event: run.event,
    workflow: run.workflowName,
    branch: run.headBranch,
    commit: run.headSha,
    attempt: run.attempt,
    runner_image,
    tools,
    run_created_at: run.createdAt,
    started_at: window.started_at,
    ended_at: window.ended_at,
    duration_s: window.duration_s,
    lane_clock_s: lane.clock_s,
    job_started_at: job.startedAt,
    job_completed_at: job.completedAt,
    job_duration_s: seconds(job.startedAt, job.completedAt),
    conclusion: run.conclusion,
    exit_code: green ? 0 : 1,
    lane,
    verdict_lines: verdicts,
    steps: job.steps.map((s) => ({ number: s.number, name: s.name, conclusion: s.conclusion, started_at: s.startedAt, completed_at: s.completedAt })),
    inputs,
    outputs,
    note: `Read by scripts/spikes/W0-T11/github-run.mjs from gh run view ${run.databaseId}. duration_s is GitHub's whole-second step times, the first lane step's start to the last lane step's end (scripts/spikes/W0-T04/README.md section 5); lane_clock_s is the lane runner's own clock from the same step, and job_duration_s the whole job with its set-up and clean-up. ${lane.absent} gates are absent, not built yet, so the figure covers ${lane.passed + lane.failed + lane.skipped} of ${lane.steps ?? 'the'} steps and grows as W1 builds them.`,
  };
}

// ------------------------------------------------------------------ the record
/** Merge configurations and their files into the record; returns a new record. Idempotent for the same run. */
export function mergeInto(record, additions, { today }) {
  const next = structuredClone(record);
  const configs = next.configs ?? [];
  for (const c of additions.configs) {
    const i = configs.findIndex((x) => x.id === c.id);
    if (i >= 0) configs[i] = c;
    else configs.push(c);
  }
  next.configs = configs;
  const outputs = next.outputs ?? [];
  for (const o of additions.outputs) {
    const i = outputs.findIndex((x) => x.path === o.path);
    if (i >= 0) outputs[i] = o;
    else outputs.push(o);
  }
  next.outputs = outputs;
  next.values = { ...(next.values ?? {}), ...additions.values };
  const checks = next.checks ?? [];
  const k = checks.findIndex((x) => x.id === additions.check.id);
  if (k >= 0) checks[k] = additions.check;
  else checks.push(additions.check);
  next.checks = checks;
  next.pass = checks.every((c) => c.pass === true);
  const notes = (next.notes ?? []).filter((n) => !n.startsWith(NOTE_MARKER));
  notes.push(`${NOTE_MARKER} ${today}: ${additions.note}`);
  next.notes = notes;
  return next;
}

/** The values, the check and the note for a set of configurations. */
export function summarize(configs, budgetS) {
  const green = configs.filter((c) => c.conclusion === 'success');
  const values = { github_hosted_green_runs: green.length };
  for (const c of configs) {
    const sha7 = c.commit.slice(0, 7);
    values[`github_hosted_${sha7}_lane_clock_s`] = c.lane_clock_s;
    values[`github_hosted_${sha7}_job_s`] = c.job_duration_s;
  }
  const slowest = Math.max(...configs.map((c) => c.lane_clock_s));
  const pass = configs.every((c) => c.conclusion === 'success' && c.lane_clock_s < budgetS);
  const check = {
    id: 'fast-lane-green-on-github-hosted-runners',
    pass,
    detail: `${configs.length} further GitHub-hosted runs of the committed fast.yml (${configs.map((c) => `${c.commit.slice(0, 7)}: ${c.lane.result} in ${c.lane_clock_s} s with ${c.lane.passed} passed, ${c.lane.failed} failed, ${c.lane.absent} absent`).join('; ')}); the slowest took ${r1(slowest)} s against the ${budgetS} s budget`,
  };
  const note = `configurations ${configs.map((c) => c.id).join(' and ')} are further GitHub-hosted runs of the committed fast.yml, read from the Actions pages with scripts/spikes/W0-T11/github-run.mjs, each with its job log and run metadata as outputs. They are green where the primary configuration (the first GitHub run, before OD-16) was red on GATE-privacy only. The primary configuration, the title and recorded_at still describe that first run.`;
  return { values, check, note };
}

// ------------------------------------------------------------------ gh
function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1 << 27, env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' } });
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 3).join(' ')} failed (exit ${r.status}): ${(r.stderr ?? '').trim().split('\n')[0]}`);
  return r.stdout;
}

function commitSubject(sha) {
  const r = spawnSync('git', ['-C', ROOT, 'show', '-s', '--format=%s', sha], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

const fileRecord = (rel, kind) => {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, sha256: sha256(bytes), bytes: bytes.length, kind };
};

function main(argv) {
  const ids = [];
  let record = RECORD;
  let dry = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--record') record = argv[(i += 1)];
    else if (argv[i] === '--dry-run') dry = true;
    else if (/^\d+$/.test(argv[i])) ids.push(argv[i]);
    else throw new Error(`unexpected argument ${argv[i]}`);
  }
  if (ids.length === 0) throw new Error('usage: github-run.mjs <run-id>... [--record runs/RUN-ci-fastlane.json] [--dry-run]');
  const recordPath = path.join(ROOT, record);
  const current = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const budgetS = current.budget?.timeout_s ?? 300;
  const additions = { configs: [], outputs: [], values: {}, check: null, note: '' };
  for (const id of ids) {
    const run = JSON.parse(gh(['run', 'view', id, '--json', JSON_FIELDS]));
    const log = normalizeLog(gh(['run', 'view', id, '--log']));
    const dir = `runs/RUN-ci-fastlane/github-hosted-${run.headSha.slice(0, 7)}`;
    const files = { json: `${dir}/run.json`, log: `${dir}/job.log` };
    const config = buildConfig({ run, log, subject: commitSubject(run.headSha), outputs: [files.json, files.log], inputs: [{ path: 'scripts/spikes/W0-T11/github-run.mjs', sha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))), role: 'reads the run with gh and writes this configuration' }] });
    if (!dry) {
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      fs.writeFileSync(path.join(ROOT, files.json), `${JSON.stringify(run, null, 2)}\n`);
      fs.writeFileSync(path.join(ROOT, files.log), log);
      additions.outputs.push(fileRecord(files.json, 'what gh run view --json returned: the run, its job and every step with its times'), fileRecord(files.log, 'the whole job log, paths normalised'));
    }
    additions.configs.push(config);
    console.log(`${config.id}: ${run.conclusion}, lane ${config.lane.result} in ${config.lane_clock_s} s (${config.lane.passed} passed, ${config.lane.failed} failed, ${config.lane.absent} absent), window ${config.duration_s} s, job ${config.job_duration_s} s`);
  }
  // Configurations already in the record that this call did not read keep their place and count in the summary.
  const all = [...(current.configs ?? []).filter((c) => /^github-hosted-[0-9a-f]{7}$/.test(c.id) && !additions.configs.some((a) => a.id === c.id)), ...additions.configs];
  const { values, check, note } = summarize(all, budgetS);
  additions.values = values;
  additions.check = check;
  additions.note = note;
  if (dry) return console.log(JSON.stringify(additions.configs.map((c) => ({ ...c, steps: undefined, verdict_lines: c.verdict_lines.length })), null, 2));
  const merged = mergeInto(current, additions, { today: new Date().toISOString().slice(0, 10) });
  fs.writeFileSync(recordPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`merged ${additions.configs.length} configurations into ${record}; pass ${merged.pass}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`github-run: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
