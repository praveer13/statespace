#!/usr/bin/env node
// W0-T11: records RUN-w0-exit, the executions behind docs/waves/W0-exit.md, at the commit W1 starts from.
//
//   node scripts/spikes/W0-T11/record.mjs
//
// One configuration per command, from the repository root, in this order:
//   queue, spikes, keepkill   exit-check.mjs: the review queue, the decision records and runs, the keep/kill rules
//   numbers-self-check        GATE-numbers against its planted faults (nightly and release lanes run it too)
//   runs-self-check           GATE-runs against its planted faults
//   privacy                   GATE-privacy as the fast lane runs it (CI set, no hashed term list)
//   privacy-local             GATE-privacy as a developer runs it (CI unset: the local identity is checked as well)
//   privacy-strict            GATE-privacy as the release lane runs it; it is expected to fail on the missing term list
//   runs-gate, runs-gate-json GATE-runs on the tree, and its warnings as data: the runs whose inputs changed
//   github-nightly-list, github-nightly, github-nightly-failed-log   the scheduled nightly on GitHub, read with gh
//                             (network and a logged-in gh); left out when gh cannot read it
//   fast-lane                 the fast lane on this working tree (the committed one is on GitHub: RUN-ci-fastlane)
// The record also reads RUN-ci-fastlane for the GitHub-hosted lane times, and cites them; it does not repeat them.
//
// GATE-facts, GATE-schema and GATE-runs read this record while the fast lane runs, and the record's own page cites its
// values. So the recorder stages every output, publishes an interim record with everything but the lane before the lane
// runs, and publishes the final record last; where no record exists yet it writes a provisional one first. Regenerate
// the index afterwards:
//   flock <gen.lock> node scripts/runs/build-index.mjs
//
// Outputs are normalised: the repository is <repo>, the scratch directory <scratch>, the temporary directory <tmp>,
// the home directory <home>, store paths <nix-store>, and the local account and git identity <user>.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ID = 'RUN-w0-exit';
const RECORD = `runs/${ID}.json`;
const OUTDIR = `runs/${ID}`;
const HERE = 'scripts/spikes/W0-T11';
const BUDGET_S = 300;

const at = (...p) => path.join(ROOT, ...p);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const nowIso = () => new Date().toISOString();
const first = (cmd, args) => (spawnSync(cmd, args, { encoding: 'utf8' }).stdout ?? '').split('\n')[0].trim();
const scratch = fs.mkdtempSync(path.join(process.env.W0T11_SCRATCH ?? os.tmpdir(), 'w0t11-record-'));

/** Paths and names that must not reach a committed file; each is read at run time and written nowhere. */
const identity = [os.userInfo().username, first('git', ['config', 'user.name']), first('git', ['config', 'user.email']).split('@')[0]].filter((s) => s.length > 2);
const scrub = (text) => {
  let out = String(text);
  for (const [from, to] of [[scratch, '<scratch>'], [ROOT, '<repo>'], [os.tmpdir(), '<tmp>'], [os.homedir(), '<home>']]) out = out.split(from).join(to);
  out = out.replace(/\/nix\/store\/[a-z0-9]{32}-/g, '<nix-store>/');
  for (const name of identity) out = out.split(name).join('<user>');
  return out;
};
// Outputs are written to a staging directory and moved into runs/RUN-w0-exit/ together with the record that lists
// them, so that a gate another task runs meanwhile never sees a record and files that disagree.
const stage = path.join(scratch, 'stage');
const writeOut = (name, content) => {
  const file = path.join(stage, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return `${OUTDIR}/${name}`;
};
const outputEntry = (rel, kind) => {
  const buf = fs.readFileSync(path.join(stage, path.relative(OUTDIR, rel)));
  return { path: rel, sha256: sha(buf), bytes: buf.length, kind };
};
function publish(record) {
  fs.rmSync(at(OUTDIR), { recursive: true, force: true });
  fs.cpSync(stage, at(OUTDIR), { recursive: true });
  fs.writeFileSync(at(RECORD), `${JSON.stringify(record, null, 2)}\n`);
}
const fileInput = (rel, role) => ({ path: rel, sha256: sha(fs.readFileSync(at(rel))), bytes: fs.statSync(at(rel)).size, role });

function execute(id, purpose, argv, { env = {}, unset = [], timeout = 900000 } = {}) {
  const started = Date.now();
  const startedAt = nowIso();
  const childEnv = { ...process.env, ...env };
  for (const k of unset) delete childEnv[k];
  const r = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout, env: childEnv });
  const text = scrub(`${r.stdout ?? ''}${r.stderr ? `${r.stdout?.endsWith('\n') ? '' : '\n'}${r.stderr}` : ''}`);
  return {
    id,
    purpose,
    argv: argv.map(scrub),
    env: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, scrub(v)])),
    ...(unset.length > 0 ? { env_unset: unset } : {}),
    started_at: startedAt,
    duration_s: Number(((Date.now() - started) / 1000).toFixed(3)),
    exit_code: r.status,
    text,
  };
}
const lines = (text) => text.split('\n').map((l) => l.trimEnd());
const matching = (text, re) => lines(text).filter((l) => re.test(l)).map((l) => l.trim());
const lastLine = (text) => lines(text).filter((l) => l.trim() !== '').at(-1)?.trim() ?? '';

const recordingStarted = nowIso();
const t0 = Date.now();

// ------------------------------------------------------------------ the inputs: what ran, and the rules the record is about
const RULES = 'content/governance/keepkill-rules.yaml';
const inputs = [
  fileInput(RULES, 'the keep/kill rules, whose hash the keepkill configuration compares'),
  fileInput('runs/RUN-keepkill-rules.json', 'the record that holds their SHA-256'),
  fileInput(`${HERE}/exit-check.mjs`, 'the queue, spikes and keepkill checks'),
  fileInput(`${HERE}/record.mjs`, 'this recorder'),
  fileInput('scripts/verify-numbers.mjs', 'GATE-numbers'),
  fileInput('scripts/runs/numbers-rules.mjs', "GATE-numbers' rules"),
  fileInput('scripts/verify-runs.mjs', 'GATE-runs'),
  fileInput('scripts/runs/registry.mjs', "GATE-runs' registry code"),
  fileInput('scripts/runs/gate-self-check.mjs', 'the planted faults of GATE-numbers and GATE-runs'),
  fileInput('scripts/verify-privacy.mjs', 'GATE-privacy'),
  fileInput('scripts/spikes/W0-T04/lane.mjs', 'the lane runner'),
];
// Living files that the checks read. They change with every task that lands, so they are listed with their hashes at
// recording and are not inputs: a later edit to them must not make this record stale (a gate warns on a stale input).
const sourcesAtRecording = [
  'tracker/tasks.yaml',
  'docs/TRACKER.md',
  'runs/index.json',
  'runs/RUN-ci-fastlane.json',
  'packages/ids/src/registry.json',
  'packages/ids/proposals.json',
  'scripts/spikes/W0-T04/gates.json',
  'package-lock.json',
].map((p) => fileInput(p, 'read by a check; a living file'));

const environment = {
  os: `${first('uname', ['-s'])} ${first('uname', ['-r'])} ${first('uname', ['-m'])}`,
  cpu_count: os.cpus().length,
  ram_gib: Math.round(os.totalmem() / 2 ** 30),
  cpu_architecture: first('uname', ['-m']),
  node: process.version,
  git: first('git', ['--version']),
  container: null,
  host: 'a developer machine shared with other agents while this ran; its load was not measured',
};

const baseRecord = {
  id: ID,
  task: 'W0-T11',
  engine: 'node',
  version: process.version.replace(/^v/, ''),
  version_string: `Node.js ${process.version}, running the gate scripts of this repository`,
  binary: 'node (the host binary; no container)',
  binary_sha256: sha(fs.readFileSync(process.execPath)),
  image: null,
  budget: { fast_lane_budget_s: BUDGET_S, queue_gate_h: 10, timeout_s: 900, network: "gh reads GitHub's Actions pages for the two github-nightly configurations; nothing else uses the network" },
  environment,
};

// ------------------------------------------------------------------ provisional record (valid against run@1), so that gates can read it
if (!fs.existsSync(at(RECORD))) {
  fs.mkdirSync(at(OUTDIR), { recursive: true });
  fs.writeFileSync(
    at(RECORD),
    `${JSON.stringify({ ...baseRecord, title: 'Provisional: the W0 exit checks, written while scripts/spikes/W0-T11/record.mjs records the full run, which replaces this record', recorded_at: nowIso(), started_at: recordingStarted, duration_s: 0, argv: ['node', `${HERE}/record.mjs`], inputs: [], exit_code: null, verdict_lines: [], outputs: [], notes: ['Provisional. The full record replaces this one when the recording ends.'] }, null, 2)}\n`,
  );
}

// ------------------------------------------------------------------ the commands
const configs = [];
const outputs = [];
const keep = (cfg, files, verdict_lines, extra = {}) => {
  const { text, ...rest } = cfg;
  configs.push({ ...rest, engine: 'node', version: process.version.replace(/^v/, ''), verdict_lines, outputs: files, ...extra });
};
const save = (name, text, kind) => {
  const rel = writeOut(name, text);
  outputs.push(outputEntry(rel, kind));
  return rel;
};
const asJson = (text) => JSON.parse(text);

// queue, spikes, keepkill
const exitCheck = (sub, extra = []) => execute(sub, '', ['node', `${HERE}/exit-check.mjs`, sub, ...extra, '--json']);
const q = exitCheck('queue', ['--with', 'W0-T11']);
q.purpose = 'the owner review queue from tracker/tasks.yaml: tasks in review with owner review, and with this task counted as in review (OD-7: under 10 h)';
const qJson = asJson(q.text).checks[0];
keep(q, [save('queue.json', `${JSON.stringify(asJson(q.text), null, 2)}\n`, 'the check as JSON')], [qJson.summary, ...qJson.lines.filter((l) => l.startsWith('  FAIL'))]);

const s = exitCheck('spikes');
s.purpose = 'every spike has a decision record with a Decision and a Fallback section; every run a W0 task names, and every run spine section 9.5 lists as executed, has a record that matches runs/index.json';
const sJson = asJson(s.text).checks[0];
keep(s, [save('spikes.json', `${JSON.stringify(asJson(s.text), null, 2)}\n`, 'the check as JSON')], [sJson.summary, ...sJson.lines.filter((l) => l.startsWith('  FAIL'))]);

const k = exitCheck('keepkill');
k.purpose = 'the keep/kill rules hash to the SHA-256 recorded for them, in the working tree and in the last commit; their history; no learner-zero record exists';
const kJson = asJson(k.text).checks[0];
keep(k, [save('keepkill.json', `${JSON.stringify(asJson(k.text), null, 2)}\n`, 'the check as JSON')], [kJson.summary, ...kJson.lines.filter((l) => l.startsWith('  FAIL'))]);

// the planted-fault self-checks
const selfEnv = { CI: 'true', W0S11_SCRATCH: scratch };
const ns = execute('numbers-self-check', 'GATE-numbers must fail on each planted fault, among them an untagged number (spine section 13, W0 exit)', ['node', 'scripts/verify-numbers.mjs', '--self-check'], { env: selfEnv });
keep(ns, [save('numbers-self-check.txt', ns.text, 'log')], [lastLine(ns.text)]);
const rs = execute('runs-self-check', 'GATE-runs must fail on each planted fault, among them an unresolved run reference (spine section 13, W0 exit)', ['node', 'scripts/verify-runs.mjs', '--self-check'], { env: selfEnv });
keep(rs, [save('runs-self-check.txt', rs.text, 'log')], [lastLine(rs.text)]);

// GATE-privacy in the three modes
const privacy = execute('privacy', 'GATE-privacy as the fast lane runs it: CI set, no hashed term list', ['node', 'scripts/verify-privacy.mjs'], { env: { CI: 'true' } });
keep(privacy, [save('privacy.txt', privacy.text, 'log')], matching(privacy.text, /^(verify-privacy|warning)/));
const local = execute('privacy-local', 'GATE-privacy as a developer runs it: CI unset, so the local identity is checked as well; no identity text reaches the output', ['node', 'scripts/verify-privacy.mjs'], { unset: ['CI'] });
keep(local, [save('privacy-local.txt', local.text, 'log')], matching(local.text, /^(verify-privacy|warning)/));
const strict = execute('privacy-strict', 'GATE-privacy as the release lane runs it (--strict): a missing hashed term list is a failure, so a failure here is expected until the owner sets the term list', ['node', 'scripts/verify-privacy.mjs', '--strict'], { env: { CI: 'true' } });
keep(strict, [save('privacy-strict.txt', strict.text, 'log')], matching(strict.text, /^(verify-privacy|\s+private-term|warning)/));

// GATE-runs on the tree, and its warnings as data
const runsGate = execute('runs-gate', 'GATE-runs on the tree: every reference resolves, the registry is intact; the warnings list the inputs that changed since their runs', ['node', 'scripts/verify-runs.mjs'], { env: { CI: 'true' } });
keep(runsGate, [save('runs-gate.txt', runsGate.text, 'log')], matching(runsGate.text, /^(GATE-runs:|\s+(read|pass|warn)\s)/));
const runsJson = execute('runs-gate-json', 'the same run as data: each warning, and so each record whose inputs changed since it was recorded (re-recording them is a release task, not an exit criterion)', ['node', 'scripts/verify-runs.mjs', '--json'], { env: { CI: 'true' } });
const runsData = asJson(runsJson.text);
// This record's own inputs are hashed afresh when it is written, so a warning about the copy on disk (the one a
// previous run left) says nothing about the record being written.
const runsWarnings = (runsData.warnings ?? []).filter((w) => w.where !== RECORD);
const changed = {};
for (const w of runsWarnings) {
  const m = /^input (\S+) changed since the run/.exec(w.detail);
  if (w.check === 'inputs' && m) (changed[w.where.replace(/^runs\//, '').replace(/\.json$/, '')] ??= []).push(m[1]);
}
keep(runsJson, [save('runs-gate.json', `${JSON.stringify(runsData, null, 2)}\n`, 'the report as JSON')], [`${runsWarnings.length} warnings, ${Object.keys(changed).length} records with inputs that changed since their run; ${(runsData.findings ?? []).length} findings (this record's own warning is left out)`]);

// the scheduled nightly on GitHub: the lane runs in the Bench image, which is not published yet, so it is expected to stop at its first check
const ghEnv = { GH_PROMPT_DISABLED: '1', NO_COLOR: '1' };
let nightly = null;
const nightlyList = execute('github-nightly-list', 'the nightly workflow\'s recent runs on GitHub', ['gh', 'run', 'list', '--workflow', 'nightly', '--limit', '10', '--json', 'databaseId,conclusion,createdAt,event,headSha,status,displayTitle,url'], { env: ghEnv });
if (nightlyList.exit_code === 0) {
  const list = asJson(nightlyList.text);
  keep(nightlyList, [save('github-nightly-list.json', `${JSON.stringify(list, null, 2)}\n`, 'what gh run list returned')], [`${list.length === 1 ? '1 run' : `${list.length} runs`} of the nightly workflow, ${list.filter((r) => r.event === 'schedule').length} of them scheduled`]);
  const last = list.find((r) => r.event === 'schedule' && r.status === 'completed');
  if (last !== undefined) {
    const view = execute('github-nightly', 'the latest scheduled nightly: its conclusion, the step that failed and the error it printed', ['gh', 'run', 'view', String(last.databaseId), '--json', 'databaseId,conclusion,createdAt,event,headSha,url,jobs'], { env: ghEnv });
    const failedLog = execute('github-nightly-failed-log', 'the error lines of the failed step', ['gh', 'run', 'view', String(last.databaseId), '--log-failed'], { env: ghEnv });
    if (view.exit_code === 0 && failedLog.exit_code === 0) {
      const detail = asJson(view.text);
      const failedStep = detail.jobs.flatMap((j) => j.steps.map((st) => ({ job: j.name, ...st }))).find((st) => st.conclusion === 'failure') ?? null;
      const errors = lines(failedLog.text).filter((l) => l.includes('##[error]')).map((l) => l.split('\t').at(-1).replace(/^\S+Z /, '').replace('##[error]', 'error: '));
      nightly = { id: last.databaseId, created_at: last.createdAt, event: last.event, conclusion: detail.conclusion, failed_step: failedStep?.name ?? null, errors };
      keep(view, [save('github-nightly.json', `${JSON.stringify(detail, null, 2)}\n`, 'what gh run view --json returned: the run, its jobs and every step')], [`nightly run ${last.databaseId} (${last.event}, ${last.createdAt}): ${detail.conclusion}${failedStep ? `; failed step "${failedStep.name}"` : ''}`]);
      keep(failedLog, [save('github-nightly-errors.txt', `${errors.join('\n')}\n`, 'the error lines of the failed step')], errors);
    }
  }
}

// ------------------------------------------------------------------ values and checks
const ci = JSON.parse(fs.readFileSync(at('runs/RUN-ci-fastlane.json'), 'utf8'));
const github = ci.configs.filter((c) => /^github-hosted/.test(c.id)).map((c) => ({ id: c.id, commit: c.commit?.slice(0, 7), conclusion: c.conclusion ?? (c.exit_code === 0 ? 'success' : 'failure'), lane_clock_s: c.lane_clock_s ?? null, run_id: c.run_id }));
const heldOf = (text) => /\((\d+) of (\d+) held\)/.exec(lastLine(text))?.slice(1, 3).map(Number) ?? null;
const privacyLine = matching(privacy.text, /^verify-privacy: /)[0] ?? '';
const q0 = qJson.data;
const lines2 = (r) => lines(r.text);
const strictCount = Number(/^verify-privacy: (\d+) problem\(s\)/m.exec(strict.text)?.[1] ?? -1);
const strictProblems = lines2(strict).filter((l) => /^\s+[a-z-]+\s+\S/.test(l) && !/^\s*warning/.test(l));
const heldN = heldOf(ns.text);
const heldR = heldOf(rs.text);

function assemble(laneRun, laneSummary) {
  const values = {
    queue_tasks_in_review: q0.in_review.length,
    queue_h_now: q0.hours,
    queue_h_with_w0_t11: q0.hours_with_assumed,
    queue_gate_h: q0.gate_h,
    w1_planned_review_h: q0.plan_w1.hours,
    w1_owner_review_tasks: q0.plan_w1.tasks,
    tasks_done: q0.statuses.done ?? 0,
    tasks_todo: q0.statuses.todo ?? 0,
    spikes_with_decision_record: sJson.data.spikes,
    named_runs_resolved: sJson.data.runs_checked,
    executed_runs_registered: sJson.data.executed_runs,
    executed_runs_missing: sJson.data.executed_runs_missing.length,
    numbers_self_check_held: heldN === null ? null : `${heldN[0]} of ${heldN[1]}`,
    runs_self_check_held: heldR === null ? null : `${heldR[0]} of ${heldR[1]}`,
    privacy_ok: privacy.exit_code === 0 && /^verify-privacy: ok,/.test(privacyLine),
    privacy_local_ok: local.exit_code === 0,
    privacy_term_list_checked: !/no term list checked/.test(privacyLine),
    privacy_strict_exit: strict.exit_code,
    rules_sha256: kJson.data.sha256,
    rules_commits: kJson.data.history?.length ?? null,
    rules_first_commit: kJson.data.history?.at(-1)?.hash.slice(0, 7) ?? null,
    rules_first_committed_at: kJson.data.history?.at(-1)?.committed_at ?? null,
    rules_hashed_at: kJson.data.recorded_at,
    learner_zero_records: kJson.data.learner_zero_records.length,
    runs_gate_warnings: runsWarnings.length,
    runs_with_changed_inputs: changed,
    github_hosted_lane_clock_s: github,
    local_fast_lane_s: laneSummary?.duration_s ?? null,
    local_fast_lane_result: laneSummary?.result ?? null,
    local_fast_lane_counts: laneSummary?.counts ?? null,
    local_fast_lane_commit: laneSummary?.commit ?? null,
    local_fast_lane_tree_dirty: laneSummary?.dirty ?? null,
    nightly_run_id: nightly?.id ?? null,
    nightly_created_at: nightly?.created_at ?? null,
    nightly_conclusion: nightly?.conclusion ?? null,
    nightly_failed_step: nightly?.failed_step ?? null,
    nightly_bench_image_unset: nightly === null ? null : nightly.errors.some((e) => /BENCH_IMAGE/.test(e) && /'unset'/.test(e)),
    tasks_yaml_sha256: sourcesAtRecording.find((x) => x.path === 'tracker/tasks.yaml').sha256,
  };

  const slowest = Math.max(...github.map((g) => g.lane_clock_s ?? Infinity));
  const greenGithub = github.filter((g) => g.conclusion === 'success');
  const checks = [
    { id: 'ci-fastlane-under-300-s', pass: github.length > 0 && slowest < BUDGET_S, detail: `RUN-ci-fastlane holds ${github.length} GitHub-hosted configurations; the slowest lane clock is ${slowest} s against ${BUDGET_S} s: ${github.map((g) => `${g.commit} ${g.conclusion} ${g.lane_clock_s} s`).join('; ')}` },
    { id: 'ci-fastlane-green-on-the-commit-w1-starts-from', pass: greenGithub.length >= 1, detail: `${greenGithub.length} of ${github.length} GitHub-hosted configurations are green` },
    { id: 'numbers-gate-trips-on-planted-faults', pass: ns.exit_code === 0 && heldN !== null && heldN[0] === heldN[1], detail: lastLine(ns.text) },
    { id: 'runs-gate-trips-on-planted-faults', pass: rs.exit_code === 0 && heldR !== null && heldR[0] === heldR[1], detail: lastLine(rs.text) },
    { id: 'privacy-green', pass: values.privacy_ok && values.privacy_local_ok, detail: `${privacyLine}; developer mode: exit ${local.exit_code}` },
    { id: 'privacy-strict-fails-only-on-the-missing-term-list', pass: strict.exit_code === 1 && strictCount === 1 && strictProblems.length === 1 && /^\s+private-term/.test(strictProblems[0]), detail: strictProblems.map((l) => l.trim()).join(' | ') || `exit ${strict.exit_code}` },
    { id: 'keepkill-rules-recorded-and-unchanged', pass: kJson.ok, detail: kJson.summary },
    { id: 'spikes-have-a-run-and-a-decision-record', pass: sJson.ok, detail: sJson.summary },
    { id: 'review-queue-under-10-h', pass: qJson.ok, detail: qJson.summary },
    ...(laneRun === null ? [] : [{ id: 'fast-lane-green-on-this-working-tree', pass: laneRun.exit_code === 0 && laneSummary?.result === 'pass', detail: laneSummary === null ? 'no lane summary' : `${laneSummary.result} in ${laneSummary.duration_s} s on commit ${laneSummary.commit.slice(0, 7)}${laneSummary.dirty ? ' with uncommitted changes' : ''}; counts ${JSON.stringify(laneSummary.counts)}` }]),
  ];

  const notes = [
    'Local, on the host: not a GitHub-hosted runner. The GitHub-hosted fast-lane runs are configurations of RUN-ci-fastlane, which the check ci-fastlane-under-300-s reads; this record cites their lane clocks and does not repeat them.',
    `Recorded at the commit W1 starts from (${laneSummary?.commit?.slice(0, 7) ?? 'unknown'}), in a working tree that holds uncommitted files: this task's own and any that other tasks of W1's first batch had written by then. The fast-lane configuration says in its summary whether the tree was dirty, and a red lane would be named with the task whose work in progress caused it.`,
    'inputs holds the gate scripts, the rules and this task\'s scripts. sources_at_recording holds the hashes of the living files the checks read (the tracker, the run index, the ID registry, RUN-ci-fastlane, the lane manifest and the lockfile); they change with every task that lands, so they are not inputs, and a later edit to them does not make this record stale.',
    'The privacy and privacy-local configurations are green with no hashed term list: GATE-privacy then does not check the private-design terms (and in CI not the local identity). privacy-strict is the release lane\'s mode and fails on exactly that until the owner sets the term list (owner action 15 of docs/waves/W0-report.md).',
    'The github-nightly configurations are read with gh from GitHub\'s Actions pages, so they need network access and a logged-in gh; a recorder run without them leaves them out. The nightly lane runs in the digest-pinned Bench image, which is not published, so every night stops at its first check until the repository variable BENCH_IMAGE is set (owner action 11 of docs/waves/W0-report.md).',
    'runs-gate-json lists, per record, the inputs that changed since it was recorded; re-recording them is a release task (the release lane fails on each), not an exit criterion.',
    'Outputs are normalised: the repository is <repo>, the scratch directory <scratch>, the temporary directory <tmp>, the home directory <home>, store paths <nix-store>, and the local account and git identity <user>.',
    'The ID RUN-w0-exit is proposed in packages/ids/proposals.json: spine section 9.5 does not register it, and a revision of the spine registers or declines it.',
  ];

  return {
    ...baseRecord,
    title: 'The W0 exit checks at the commit W1 starts from: the review queue, the spikes\' decision records and runs, the keep/kill rules, the two planted-fault self-checks, GATE-privacy in three modes, GATE-runs and the fast lane here',
    recorded_at: nowIso(),
    started_at: recordingStarted,
    duration_s: Number(((Date.now() - t0) / 1000).toFixed(3)),
    argv: configs.map((c) => c.argv),
    inputs,
    sources_at_recording: sourcesAtRecording,
    exit_code: laneRun === null ? null : checks.every((c) => c.pass) ? 0 : 1,
    verdict_lines: configs.flatMap((c) => (c.id === 'github-nightly-failed-log' ? c.verdict_lines.slice(0, 1) : c.verdict_lines.slice(-1))),
    outputs: [...outputs],
    values,
    configs: [...configs],
    checks,
    pass: checks.every((c) => c.pass),
    notes,
  };
}

// An interim record with everything but the lane, so that the values the exit record cites resolve while the lane
// runs: GATE-facts, which the lane runs, reads them from this file.
publish(assemble(null, null));

// the fast lane here
const laneSummaryFile = path.join(scratch, 'lane-summary.json');
const lane = execute('fast-lane', 'the fast lane on this working tree, as .github/workflows/fast.yml runs it (CI set, no secrets); the committed one ran on GitHub-hosted runners (RUN-ci-fastlane)', ['node', 'scripts/spikes/W0-T04/lane.mjs', 'fast', '--summary', laneSummaryFile], { env: { CI: 'true' } });
const laneFiles = [save('fast-lane.txt', lane.text, 'log')];
let laneSummary = null;
if (fs.existsSync(laneSummaryFile)) {
  laneSummary = JSON.parse(scrub(fs.readFileSync(laneSummaryFile, 'utf8')));
  laneFiles.push(save('fast-lane-summary.json', `${JSON.stringify(laneSummary, null, 2)}\n`, 'the lane summary: each gate, its result, duration and verdict'));
}
keep(lane, laneFiles, matching(lane.text, /^(fast lane: |absent, not built yet|\[ ?\d+\/\d+\] )/));

const finalRecord = assemble(lane, laneSummary);
publish(finalRecord);

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`wrote ${RECORD}: pass ${finalRecord.pass}`);
for (const c of finalRecord.checks) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'} ${c.id}: ${c.detail}`);
console.log('regenerate the index: flock <gen.lock> node scripts/runs/build-index.mjs');
process.exit(finalRecord.pass ? 0 : 1);
