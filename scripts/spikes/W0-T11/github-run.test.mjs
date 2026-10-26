// Tests of github-run.mjs (W0-T11): the pure parts, on a small synthetic log and job in the shape gh prints. Run:
//   node --test scripts/spikes/W0-T11/github-run.test.mjs

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConfig, laneResult, laneWindow, mergeInto, normalizeLog, parseLog, summarize, toolsOf, verdictLines } from './github-run.mjs';

const BOM = '﻿';
const row = (step, ts, text) => `fast lane\t${step}\t${ts} ${text}`;
const T = (s) => `2026-10-25T17:13:${s}Z`;

const LOG = [
  row('Set up job', `${BOM}${T('07.1000000')}`, "Current runner version: '2.338.0'"),
  row('Set up job', T('07.2000000'), '##[group]Runner Image Provisioner'),
  row('Set up job', T('07.2000000'), 'Version: 20261021.618'),
  row('Set up job', T('07.2000000'), '##[endgroup]'),
  row('Set up job', T('07.3000000'), '##[group]Runner Image'),
  row('Set up job', T('07.3000000'), 'Image: ubuntu-24.04'),
  row('Set up job', T('07.3000000'), 'Version: 20261012.334.1'),
  row('Set up job', T('07.3000000'), '##[endgroup]'),
  row('Check out the repository', `${BOM}${T('08.1000000')}`, "Working directory is '/home/runner/work/statespace/statespace'"),
  row('Check out the repository', T('08.2000000'), 'git version 2.55.0'),
  row('Check out the repository', T('08.3000000'), 'Temporarily overriding HOME=\'/home/runner/work/_temp/abc\' before making global git config changes'),
  row('Set up Node', T('10.0000000'), 'node: v22.22.2'),
  row('Set up Node', T('10.0000001'), 'npm: 10.9.7'),
  row('Set up Node', T('10.0000002'), '/home/runner/.npm'),
  row('Set up uv', T('15.0000000'), 'Successfully installed uv version 0.10.2'),
  row('Run the fast lane', `${BOM}${T('17.0000000')}`, '##[group]Run node scripts/spikes/W0-T04/lane.mjs fast'),
  row('Run the fast lane', T('17.8000000'), 'fast lane: 28 step(s), root <repo>, budget 300 s'),
  row('Run the fast lane', T('17.9000000'), '##[group][ 1/28] vendor-verify  (npm run vendor:verify)'),
  row('Run the fast lane', T('18.6000000'), '[ 1/28] vendor-verify          PASS       0.8 s  vendor-drift: ok (34 files match VENDOR.md at 80c8537e4048)'),
  row('Run the fast lane', T('26.7000000'), 'absent, not built yet (15): GATE-calls (W1-T05), GATE-kc (W1-T04)'),
  row('Run the fast lane', T('26.7100000'), 'fast lane: PASS in 78.7 s (13 passed, 0 failed, 0 skipped, 15 absent)'),
].join('\n');

const step = (number, name, start, end) => ({ number, name, status: 'completed', conclusion: 'success', startedAt: start, completedAt: end });
const JOB = {
  name: 'fast lane',
  startedAt: '2026-10-25T17:13:06Z',
  completedAt: '2026-10-25T17:14:29Z',
  steps: [
    step(1, 'Set up job', '2026-10-25T17:13:07Z', '2026-10-25T17:13:07Z'),
    step(2, 'Start the lane clock', '2026-10-25T17:13:07Z', '2026-10-25T17:13:08Z'),
    step(7, 'Run the fast lane', '2026-10-25T17:13:17Z', '2026-10-25T17:14:26Z'),
    step(12, 'Post Set up uv', '2026-10-25T17:14:26Z', '2026-10-25T17:14:26Z'),
    step(15, 'Complete job', '2026-10-25T17:14:27Z', '2026-10-25T17:14:27Z'),
  ],
};
const RUN = { databaseId: 40215386056, headSha: 'c5f14c55d1166fd72fd7560d8156b9dd274ad817', headBranch: 'master', event: 'push', conclusion: 'success', createdAt: '2026-10-25T17:13:04Z', url: 'https://github.com/example/statespace/actions/runs/40215386056', workflowName: 'fast', displayTitle: 'a commit', attempt: 1, jobs: [JOB] };

test('normalizeLog removes byte-order marks and writes the checkout and the runner home as placeholders', () => {
  const out = normalizeLog(LOG);
  assert.equal(out.includes(BOM), false);
  assert.match(out, /Working directory is '<repo>'/);
  assert.match(out, /HOME='<runner-home>\/work\/_temp\/abc'/);
  assert.match(out, /^fast lane\tSet up Node\t.*<runner-home>\/\.npm$/m);
  assert.equal(out.includes('/home/'), false);
  assert.equal(out.split('\n').length, LOG.split('\n').length, 'no line is added or dropped');
});

test("normalizeLog refuses a log that still holds someone else's home directory or a scratch path", () => {
  const stray = (p) => `${LOG}\n${row('Run the fast lane', T('27.0'), `reading ${p}`)}`;
  assert.throws(() => normalizeLog(stray('/home/someone/project')), /private path/);
  assert.throws(() => normalizeLog(stray('/Users/someone/project')), /private path/);
  // built from parts, so that this file itself holds no agent session path (GATE-privacy scans it)
  assert.throws(() => normalizeLog(stray(['', 'tmp', `claude-${1000}`, 'x'].join('/'))), /private path/);
});

test('parseLog splits job, step, timestamp and text, and keeps a line it cannot split', () => {
  const lines = parseLog(normalizeLog(LOG));
  assert.deepEqual(lines[0], { job: 'fast lane', step: 'Set up job', ts: '2026-10-25T17:13:07.1000000Z', text: "Current runner version: '2.338.0'" });
  assert.deepEqual(parseLog('odd\tstep\tno timestamp here')[0], { job: 'odd', step: 'step', ts: null, text: 'no timestamp here' });
});

test("verdictLines keeps the lane runner's own lines of the lane step, and nothing from the groups", () => {
  const v = verdictLines(parseLog(normalizeLog(LOG)));
  assert.deepEqual(v, [
    'fast lane: 28 step(s), root <repo>, budget 300 s',
    '[ 1/28] vendor-verify          PASS       0.8 s  vendor-drift: ok (34 files match VENDOR.md at 80c8537e4048)',
    'absent, not built yet (15): GATE-calls (W1-T05), GATE-kc (W1-T04)',
    'fast lane: PASS in 78.7 s (13 passed, 0 failed, 0 skipped, 15 absent)',
  ]);
});

test('laneResult reads the total line, and refuses a log without one', () => {
  const v = verdictLines(parseLog(normalizeLog(LOG)));
  assert.deepEqual(laneResult(v), { result: 'PASS', clock_s: 78.7, passed: 13, failed: 0, skipped: 0, absent: 15, steps: 28, budget_s: 300 });
  assert.equal(laneResult(['fast lane: FAIL in 79.6 s (12 passed, 1 failed, 0 skipped, 15 absent)']).failed, 1);
  assert.throws(() => laneResult(['fast lane: 28 step(s), root <repo>, budget 300 s']), /no line/);
});

test('toolsOf reads the runner image, not the provisioner, and the tool versions', () => {
  const t = toolsOf(parseLog(normalizeLog(LOG)));
  assert.equal(t.runner_image, 'ubuntu-24.04, image version 20261012.334.1');
  assert.deepEqual(t.tools, { node: '22.22.2', npm: '10.9.7', uv: '0.10.2', git: '2.55.0' });
  assert.deepEqual(toolsOf([]).tools, { node: null, npm: null, uv: null, git: null });
});

test("laneWindow is the first lane step's start to the last lane step's end, without GitHub's own steps", () => {
  assert.deepEqual(laneWindow(JOB), { started_at: '2026-10-25T17:13:07Z', ended_at: '2026-10-25T17:14:26Z', duration_s: 79 });
  assert.throws(() => laneWindow({ steps: [step(1, 'Set up job', 'a', 'b')] }), /no lane steps/);
});

test('buildConfig names the configuration by commit and carries the lane, the job and the files', () => {
  const input = { path: 'scripts/x.mjs', sha256: 'c'.repeat(64), role: 'reader' };
  const c = buildConfig({ run: RUN, log: normalizeLog(LOG), subject: 'W0 round 2 accepted', outputs: ['runs/x/run.json', 'runs/x/job.log'], inputs: [input] });
  assert.equal(c.id, 'github-hosted-c5f14c5');
  assert.equal(c.commit, RUN.headSha);
  assert.equal(c.duration_s, 79);
  assert.equal(c.lane_clock_s, 78.7);
  assert.equal(c.job_duration_s, 83);
  assert.equal(c.exit_code, 0);
  assert.equal(c.conclusion, 'success');
  assert.deepEqual(c.outputs, ['runs/x/run.json', 'runs/x/job.log']);
  assert.deepEqual(c.inputs, [input]);
  assert.match(c.label, /"W0 round 2 accepted": green/);
  assert.equal(c.steps.length, 5);
  assert.match(c.note, /15 gates are absent/);
  assert.match(c.note, /covers 13 of 28 steps/);
  const red = buildConfig({ run: { ...RUN, conclusion: 'failure' }, log: normalizeLog(LOG), subject: null, outputs: [] });
  assert.equal(red.exit_code, 1);
  assert.match(red.label, /failure$/);
});

const RECORD = {
  id: 'RUN-ci-fastlane',
  title: 'the first run',
  recorded_at: '2026-10-24T18:25:24.098Z',
  primary_config: 'github-hosted',
  configs: [{ id: 'github-hosted', conclusion: 'failure' }, { id: 'fast-4cpu-1' }],
  outputs: [{ path: 'runs/RUN-ci-fastlane/fast-4cpu-1/emulation.json', sha256: 'a'.repeat(64), bytes: 1 }],
  values: { fast_lane_duration_s: 79 },
  checks: [{ id: 'fast-lane-under-300-s', pass: true, detail: 'emulated' }],
  pass: true,
  notes: ['an older note'],
};

test('mergeInto adds configurations, files, values, a check and a note, and leaves the primary configuration alone', () => {
  const c = buildConfig({ run: RUN, log: normalizeLog(LOG), subject: 's', outputs: ['runs/x/job.log'] });
  const { values, check, note } = summarize([c], 300);
  const out = mergeInto(RECORD, { configs: [c], outputs: [{ path: 'runs/x/job.log', sha256: 'b'.repeat(64), bytes: 2, kind: 'log' }], values, check, note }, { today: '2026-10-25' });
  assert.equal(out.primary_config, 'github-hosted');
  assert.equal(out.title, RECORD.title);
  assert.equal(out.recorded_at, RECORD.recorded_at);
  assert.deepEqual(out.configs.map((x) => x.id), ['github-hosted', 'fast-4cpu-1', 'github-hosted-c5f14c5']);
  assert.equal(out.outputs.length, 2);
  assert.equal(out.values.fast_lane_duration_s, 79, 'earlier values stay');
  assert.equal(out.values.github_hosted_c5f14c5_lane_clock_s, 78.7);
  assert.equal(out.values.github_hosted_c5f14c5_job_s, 83);
  assert.equal(out.values.github_hosted_green_runs, 1);
  assert.equal(out.checks.length, 2);
  assert.equal(out.pass, true);
  assert.match(out.notes.at(-1), /^Added by W0-T11 on 2026-10-25: configurations github-hosted-c5f14c5 /);
  assert.equal(RECORD.configs.length, 2, 'the input record is not changed');
});

test('mergeInto is idempotent: the same run twice leaves one configuration, one file entry, one check and one note', () => {
  const c = buildConfig({ run: RUN, log: normalizeLog(LOG), subject: 's', outputs: ['runs/x/job.log'] });
  const s = summarize([c], 300);
  const additions = { configs: [c], outputs: [{ path: 'runs/x/job.log', sha256: 'b'.repeat(64), bytes: 2, kind: 'log' }], ...s };
  const once = mergeInto(RECORD, additions, { today: '2026-10-25' });
  const twice = mergeInto(once, additions, { today: '2026-10-25' });
  assert.deepEqual(twice, once);
});

test('summarize fails the check for a run that is not green or not under the budget', () => {
  const ok = buildConfig({ run: RUN, log: normalizeLog(LOG), subject: 's', outputs: [] });
  assert.equal(summarize([ok], 300).check.pass, true);
  assert.equal(summarize([ok], 78).check.pass, false, 'a lane clock of 78.7 s is over a budget of 78 s');
  const red = buildConfig({ run: { ...RUN, conclusion: 'failure' }, log: normalizeLog(LOG), subject: 's', outputs: [] });
  assert.equal(summarize([ok, red], 300).check.pass, false);
  assert.equal(summarize([ok, red], 300).values.github_hosted_green_runs, 1);
  const withRed = mergeInto(RECORD, { configs: [red], outputs: [], ...summarize([red], 300) }, { today: '2026-10-25' });
  assert.equal(withRed.pass, false, 'a failed check makes the record fail');
});
