// Properties of the four workflows that no linter checks: what each one triggers on, what it may write, how its actions are
// pinned, and that the scripts it calls exist. (actionlint 1.7.12 with shellcheck is recorded in RUN-ci-fastlane.)
// Run: node --test scripts/spikes/W0-T04/workflows.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadWorkflow } from './emulate-runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const FILES = ['fast', 'nightly', 'release', 'monthly'];
const text = Object.fromEntries(FILES.map((n) => [n, fs.readFileSync(path.join(REPO, '.github', 'workflows', `${n}.yml`), 'utf8')]));
const wf = Object.fromEntries(FILES.map((n) => [n, loadWorkflow(path.join(REPO, '.github', 'workflows', `${n}.yml`))]));
const steps = (n) => Object.values(wf[n].jobs).flatMap((j) => j.steps ?? []);

test('every action is pinned by a full commit SHA with its release in a comment', () => {
  let count = 0;
  for (const n of FILES) {
    for (const line of text[n].split('\n')) {
      const m = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/.exec(line);
      if (!m) continue;
      count += 1;
      assert.match(m[1], /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/, `${n}.yml: ${line.trim()} is not pinned by a commit`);
      assert.match(m[2], /^\s+# v\d+\.\d+\.\d+\s*$/, `${n}.yml: ${line.trim()} lacks its release comment`);
    }
  }
  assert.ok(count >= 12, `found ${count} uses: lines`);
});

test('each workflow declares read-only permissions at the top, and only the jobs that need more ask for more', () => {
  for (const n of FILES) assert.deepEqual(wf[n].permissions, { contents: 'read' }, `${n}.yml`);
  assert.deepEqual(wf.nightly.jobs.publish.permissions, { contents: 'write', actions: 'write' });
  assert.deepEqual(wf.monthly.jobs.report.permissions, { contents: 'read', issues: 'write' });
  for (const [n, jobs] of Object.entries(wf)) for (const [id, job] of Object.entries(jobs.jobs)) if (job.permissions) assert.ok(['nightly.publish', 'monthly.report'].includes(`${n}.${id}`), `${n}.${id} widens its permissions`);
});

test('the jobs that run repository code never keep the token; the one that pushes does', () => {
  for (const n of FILES) {
    for (const [id, job] of Object.entries(wf[n].jobs)) {
      for (const s of job.steps ?? []) {
        if (!s.uses?.startsWith('actions/checkout')) continue;
        if (`${n}.${id}` === 'nightly.publish') assert.equal(s.with?.['persist-credentials'], undefined, 'publish needs the token to push');
        else assert.equal(s.with?.['persist-credentials'], 'false', `${n}.${id}`);
      }
    }
  }
});

test('nobody uses pull_request_target, ubuntu-slim or an unpinned runner label', () => {
  for (const n of FILES) {
    assert.ok(!/pull_request_target/.test(text[n]), n);
    for (const [id, job] of Object.entries(wf[n].jobs)) assert.equal(job['runs-on'], 'ubuntu-24.04', `${n}.${id}: ubuntu-slim cannot mount file systems, and -latest moves`);
  }
});

test('fast: every pull request and push to the default branch, by hand too; a 300 s lane inside a short job timeout', () => {
  const w = wf.fast;
  assert.deepEqual(Object.keys(w.on), ['pull_request', 'push', 'workflow_dispatch']);
  assert.ok(w.on.push.branches.includes('master'));
  const pr = typeof w.on.pull_request === 'object' ? w.on.pull_request : {};
  assert.ok(!('paths' in pr) && !('paths-ignore' in pr), 'a path filter would leave a required check pending');
  const job = w.jobs.lane;
  assert.equal(job.name, 'fast lane');
  assert.ok(Number(job['timeout-minutes']) <= 6 && Number(job['timeout-minutes']) >= 5);
  assert.match(job.steps[0].run, /STATESPACE_LANE_START=\$\(date \+%s\)/);
  assert.equal(job.steps.at(-1).run.trim(), 'node scripts/spikes/W0-T04/lane.mjs fast');
  assert.match(w.concurrency['cancel-in-progress'], /pull_request/);
});

test('nightly: a daily schedule off the hour, on demand, the Bench image by digest, and a publish job that runs after any outcome', () => {
  const w = wf.nightly;
  assert.deepEqual(Object.keys(w.on), ['schedule', 'workflow_dispatch']);
  const cron = w.on.schedule[0].cron;
  assert.match(cron, /^\d+ \d+ \* \* \*$/, 'daily');
  assert.notEqual(cron.split(' ')[0], '0', 'not at the top of the hour');
  assert.equal(w.jobs.gates.container.image, '${{ vars.BENCH_IMAGE }}');
  assert.match(w.jobs.gates.steps[0].run, /@sha256:\[0-9a-f\]\{64\}/, 'the first step refuses an image that is not pinned by digest');
  assert.equal(w.jobs.publish.needs, 'gates');
  assert.match(w.jobs.publish.if, /always\(\)/);
  assert.ok(steps('nightly').some((s) => /lane\.mjs nightly --previous/.test(s.run ?? '')), 'it runs the nightly lane with the previous status');
  assert.ok(steps('nightly').some((s) => /status-branch\.mjs publish --file/.test(s.run ?? '')), 'it publishes the status');
  assert.ok(steps('nightly').some((s) => /lane\.mjs nightly --blocked/.test(s.run ?? '')), 'a night with no status is published as blocked');
  assert.match(text.nightly, /status\/nightly\.json/);
});

test('release: an edition tag starts it, and it runs the release lane, whose GATE-release is required', () => {
  const w = wf.release;
  assert.deepEqual(Object.keys(w.on), ['push', 'workflow_dispatch']);
  assert.ok(w.on.push.tags.includes('edition-*'));
  assert.ok(steps('release').some((s) => s.run?.trim() === 'node scripts/spikes/W0-T04/lane.mjs release'));
  const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'gates.json'), 'utf8'));
  assert.equal(manifest.steps.find((s) => s.id === 'GATE-release').lanes.release.required, true);
});

test('monthly: the 1st of each month, on demand, and an issue job that may write issues and nothing else', () => {
  const w = wf.monthly;
  assert.deepEqual(Object.keys(w.on), ['schedule', 'workflow_dispatch']);
  const [minute, hour, dom, month, dow] = w.on.schedule[0].cron.split(' ');
  assert.deepEqual([dom, month, dow], ['1', '*', '*']);
  assert.notEqual(minute, '0');
  assert.ok(Number(hour) >= 0);
  assert.ok(steps('monthly').some((s) => /lane\.mjs monthly --lean "\$LEAN_TAG"/.test(s.run ?? '')));
  assert.ok(steps('monthly').some((s) => /file-issue\.mjs --summary/.test(s.run ?? '')));
  assert.match(text.monthly, /releases\/latest/, 'the newest stable release, which excludes pre-releases');
});

test('every script a workflow runs exists, and every lane it names is a lane', () => {
  for (const n of FILES) {
    for (const s of steps(n)) {
      for (const m of (s.run ?? '').matchAll(/node (scripts\/spikes\/W0-T04\/[a-z-]+\.mjs)/g)) assert.ok(fs.existsSync(path.join(REPO, m[1])), `${n}.yml runs ${m[1]}`);
      for (const m of (s.run ?? '').matchAll(/lane\.mjs (\w+)/g)) assert.ok(['fast', 'nightly', 'release', 'monthly'].includes(m[1]), `${n}.yml names the lane ${m[1]}`);
    }
  }
});

test('the workflows write no email address or private path', () => {
  for (const n of FILES) {
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(text[n].replace(/@[0-9a-f]{40}/g, '')), `${n}.yml holds something that looks like an email address`);
    assert.ok(!/\/home\/|\/Users\/|\/tmp\/claude/.test(text[n]), `${n}.yml holds a private path`);
  }
});
