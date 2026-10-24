// Tests of file-issue.mjs with a stub gh: what a red, a green and an empty monthly run each do to the issue.
// Run: node --test scripts/spikes/W0-T04/file-issue.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { decide } from './file-issue.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'file-issue.mjs');

const STUB = `#!/usr/bin/env node
import fs from 'node:fs';
const a = process.argv.slice(2);
const entry = { args: a };
const bf = a.indexOf('--body-file');
if (bf >= 0) entry.body = fs.readFileSync(a[bf + 1], 'utf8');
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify(entry) + '\\n');
if (a[0] === 'issue' && a[1] === 'list') process.stdout.write((process.env.STUB_OPEN ?? '') + '\\n');
if (process.env.STUB_FAIL && process.env.STUB_FAIL === a.slice(0, 2).join(' ')) { process.stderr.write('HTTP 403: Resource not accessible by integration\\n'); process.exit(1); }
`;

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-issue-test-'));
  const gh = path.join(dir, 'gh');
  fs.writeFileSync(gh, STUB, { mode: 0o755 });
  const log = path.join(dir, 'calls.jsonl');
  return {
    dir,
    log,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    run: (args, env = {}) => {
      const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, GH: gh, STUB_LOG: log, ...env } });
      return { status: r.status, out: r.stdout, err: r.stderr };
    },
    summary: (steps) => {
      const f = path.join(dir, 'summary.json');
      fs.writeFileSync(f, JSON.stringify({ lane: 'monthly', steps }));
      return f;
    },
  };
}

const pass = { id: 'GATE-labs', kind: 'gate', result: 'pass', verdict: 'GATE-labs: PASS (n = 12)' };
const fail = { id: 'GATE-labs', kind: 'gate', result: 'fail', verdict: 'GATE-labs: FAIL | 2 templates passed', output_tail: ['error: unknown constant', 'GATE-labs: FAIL'] };
const absent = { id: 'GATE-labs', kind: 'gate', result: 'absent', built_by: 'W1-T43', verdict: 'scripts/verify-labs.mjs does not exist yet (built by W1-T43)' };
const verbs = (calls) => calls.map((c) => c.args.slice(0, 2).join(' '));
const issueCreate = (calls) => calls.find((c) => c.args[0] === 'issue' && c.args[1] === 'create');

test('red with no open issue creates one, labelled, with the table and the tail of the failing output', () => {
  const sb = sandbox();
  try {
    const r = sb.run(['--summary', sb.summary([fail]), '--lean', 'v4.36.0']);
    assert.equal(r.status, 0, r.err);
    const calls = sb.calls();
    assert.deepEqual(verbs(calls), ['label create', 'issue list', 'issue create']);
    const create = calls[2];
    assert.ok(create.args.includes('Monthly check: GATE-labs is red on Lean v4.36.0'));
    assert.equal(create.args[create.args.indexOf('--label') + 1], 'monthly-lean');
    assert.match(create.body, /newest stable Lean release, v4\.36\.0/);
    assert.match(create.body, /\| GATE-labs \| fail \| GATE-labs: FAIL \\\| 2 templates passed \|/);
    assert.match(create.body, /error: unknown constant/);
    assert.match(create.body, /blocks nothing/);
  } finally {
    sb.cleanup();
  }
});

test('red with an open issue comments on it and creates nothing', () => {
  const sb = sandbox();
  try {
    const r = sb.run(['--summary', sb.summary([fail]), '--lean', '4.36.0'], { STUB_OPEN: '12' });
    assert.equal(r.status, 0, r.err);
    const calls = sb.calls();
    assert.deepEqual(verbs(calls), ['label create', 'issue list', 'issue comment']);
    assert.equal(calls[2].args[2], '12');
    assert.match(r.out, /commented on issue #12/);
  } finally {
    sb.cleanup();
  }
});

test('green closes the open issue, and does nothing when none is open', () => {
  const sb = sandbox();
  try {
    assert.equal(sb.run(['--summary', sb.summary([pass]), '--lean', 'v4.36.0'], { STUB_OPEN: '12' }).status, 0);
    const closed = sb.calls();
    assert.deepEqual(verbs(closed), ['label create', 'issue list', 'issue close']);
    assert.equal(closed[2].args[2], '12');
    assert.match(closed[2].args[closed[2].args.indexOf('--comment') + 1], /GATE-labs is green on Lean v4\.36\.0/);
    fs.rmSync(sb.log);
    assert.equal(sb.run(['--summary', sb.summary([pass]), '--lean', 'v4.36.0']).status, 0);
    assert.deepEqual(verbs(sb.calls()), ['label create', 'issue list']);
  } finally {
    sb.cleanup();
  }
});

test('when no step ran (GATE-labs is not built yet) nothing is filed and gh is not called', () => {
  const sb = sandbox();
  try {
    const r = sb.run(['--summary', sb.summary([absent]), '--lean', 'v4.35.0']);
    assert.equal(r.status, 0, r.err);
    assert.deepEqual(sb.calls(), []);
    assert.match(r.out, /no step ran \(GATE-labs not built yet\); nothing to file/);
  } finally {
    sb.cleanup();
  }
});

test('a lane that could not run, or left no summary, is red and says why', () => {
  const sb = sandbox();
  try {
    assert.equal(sb.run(['--unavailable', 'the Bench image could not be pulled', '--lean', 'v4.35.0']).status, 0);
    const created = issueCreate(sb.calls());
    assert.ok(created.args.includes('Monthly check: the labs could not be checked on Lean v4.35.0'));
    assert.match(created.body, /The check could not run: the Bench image could not be pulled\./);
    fs.rmSync(sb.log);
    assert.equal(sb.run(['--summary', path.join(sb.dir, 'missing.json'), '--lean', 'v4.35.0']).status, 0);
    assert.match(issueCreate(sb.calls()).body, /the lane summary missing\.json is missing/);
  } finally {
    sb.cleanup();
  }
});

test('the link to the run is added when the environment names it', () => {
  const sb = sandbox();
  try {
    sb.run(['--summary', sb.summary([fail]), '--lean', 'v4.35.0'], { GITHUB_SERVER_URL: 'https://github.example', GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '99' });
    assert.match(issueCreate(sb.calls()).body, /Run: https:\/\/github\.example\/o\/r\/actions\/runs\/99/);
  } finally {
    sb.cleanup();
  }
});

test('a gh failure is exit 1 with its message; usage problems are exit 2', () => {
  const sb = sandbox();
  try {
    const r = sb.run(['--summary', sb.summary([fail]), '--lean', 'v4.36.0'], { STUB_FAIL: 'issue create' });
    assert.equal(r.status, 1);
    assert.match(r.err, /creating the issue failed \(1\): HTTP 403/);
    assert.equal(sb.run(['--lean', 'v4.36.0']).status, 2);
    assert.equal(sb.run(['--summary', sb.summary([pass])]).status, 2);
    assert.equal(sb.run(['--summary', sb.summary([pass]), '--lean', '4.36.0-rc1']).status, 2);
    assert.equal(sb.run(['--summary', sb.summary([pass]), '--lean', 'v4.36.0', '--nope']).status, 2);
  } finally {
    sb.cleanup();
  }
});

test('--dry-run prints the plan and calls nothing', () => {
  const sb = sandbox();
  try {
    const r = sb.run(['--summary', sb.summary([fail]), '--lean', 'v4.36.0', '--dry-run']);
    assert.equal(r.status, 0, r.err);
    assert.deepEqual(sb.calls(), []);
    assert.match(r.out, /dry run: red/);
    assert.match(r.out, /dry run: .*gh issue create --title Monthly check: GATE-labs is red on Lean v4\.36\.0/);
  } finally {
    sb.cleanup();
  }
});

test('decide: only steps that ran are tabled, and a timeout counts as red', () => {
  const d = decide({ summary: { steps: [pass, { id: 'GATE-x', result: 'timeout', verdict: 'stopped after 3600 s', output_tail: [] }, absent] }, unavailable: null, lean: 'v4.36.0', date: '2026-11-01', runUrl: null });
  assert.equal(d.state, 'red');
  assert.match(d.body, /\| GATE-x \| timeout \|/);
  assert.ok(!d.body.includes('does not exist yet'));
  assert.match(d.body, /Monthly check, 2026-11-01/);
});
