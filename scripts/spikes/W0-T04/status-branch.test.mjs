// Tests of status-branch.mjs against a scratch origin: the first publish creates the branch, later ones replace the file,
// the same content pushes nothing, a lost race is retried, and a reader sees what was published.
// Run: node --test scripts/spikes/W0-T04/status-branch.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkStatusDocument, fetchStatus, publishStatus } from './status-branch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'status-branch.mjs');
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' };

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: ENV });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A bare origin and a clone of it that has one commit on its main branch, like a CI checkout. */
function repos() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-branch-test-'));
  const origin = path.join(dir, 'origin.git');
  git(dir, ['init', '-q', '--bare', '-b', 'main', origin]);
  const work = path.join(dir, 'work');
  git(dir, ['clone', '-q', origin, work]);
  fs.writeFileSync(path.join(work, 'README.md'), 'x\n');
  git(work, ['add', 'README.md']);
  git(work, ['commit', '-q', '-m', 'init']);
  git(work, ['push', '-q', 'origin', 'HEAD:refs/heads/main']);
  return { dir, origin, work, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const doc = (date, result = 'green', extra = {}) => JSON.stringify({ schema: 'statespace/nightly-status@1', date, result, commit: 'a'.repeat(40), failed: [], ...extra }, null, 2) + '\n';

function withFile(dir, text) {
  const f = path.join(dir, `status-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, text);
  return f;
}

const run = (cwd, args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: ENV });
  return { status: r.status, out: r.stdout, err: r.stderr };
};

test('the first publish creates the branch with one commit that holds only status/nightly.json', () => {
  const r = repos();
  try {
    const result = publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-20')) });
    assert.equal(result.state, 'created');
    assert.equal(git(r.origin, ['ls-tree', '-r', '--name-only', 'nightly-status']), 'status/nightly.json');
    assert.equal(git(r.origin, ['rev-list', '--count', 'nightly-status']), '1');
    assert.equal(git(r.origin, ['log', '-1', '--format=%s', 'nightly-status']), 'nightly status 2026-10-20: green');
    assert.equal(git(r.origin, ['log', '-1', '--format=%an <%ae>', 'nightly-status']), 'github-actions[bot] <>');
    // The default branch and the clone's working tree are untouched.
    assert.equal(git(r.origin, ['rev-list', '--count', 'main']), '1');
    assert.equal(git(r.work, ['status', '--porcelain']), '');
    assert.equal(git(r.work, ['branch', '--show-current']), 'main');
  } finally {
    r.cleanup();
  }
});

test('a later publish replaces the file in a new commit, and the same content pushes nothing', () => {
  const r = repos();
  try {
    publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-20')) });
    const second = publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-21', 'red', { blocked: 'x' })) });
    assert.equal(second.state, 'updated');
    assert.equal(git(r.origin, ['rev-list', '--count', 'nightly-status']), '2');
    assert.equal(git(r.origin, ['log', '-1', '--format=%s', 'nightly-status']), 'nightly status 2026-10-21: red (blocked)');
    const again = publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-21', 'red', { blocked: 'x' })) });
    assert.equal(again.state, 'unchanged');
    assert.equal(git(r.origin, ['rev-list', '--count', 'nightly-status']), '2');
  } finally {
    r.cleanup();
  }
});

test('a publish that loses a race fetches the new tip and tries again', () => {
  const r = repos();
  try {
    publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-20')) });
    // Another job pushes between this job's fetch and its push.
    const other = path.join(r.dir, 'other');
    git(r.dir, ['clone', '-q', r.origin, other]);
    let raced = false;
    const result = publishStatus({
      repo: r.work,
      file: withFile(r.dir, doc('2026-10-21')),
      hooks: {
        beforePush: () => {
          if (raced) return;
          raced = true;
          publishStatus({ repo: other, file: withFile(r.dir, doc('2026-10-21', 'red')) });
        },
      },
    });
    assert.equal(raced, true);
    assert.equal(result.state, 'updated');
    // The race winner's commit is the parent of ours: nothing was lost or rewritten.
    assert.equal(git(r.origin, ['rev-list', '--count', 'nightly-status']), '3');
    const shown = JSON.parse(git(r.origin, ['show', 'nightly-status:status/nightly.json']));
    assert.equal(shown.result, 'green');
  } finally {
    r.cleanup();
  }
});

test('a publish that cannot win gives up with the push error', () => {
  const r = repos();
  try {
    publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-20')) });
    git(r.origin, ['config', 'receive.denyNonFastForwards', 'true']);
    // A hook on the origin refuses every update of the branch.
    fs.mkdirSync(path.join(r.origin, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(r.origin, 'hooks', 'pre-receive'), '#!/bin/sh\necho refused >&2\nexit 1\n', { mode: 0o755 });
    assert.throws(() => publishStatus({ repo: r.work, file: withFile(r.dir, doc('2026-10-21', 'red')), attempts: 2 }), /failed 2 times/);
  } finally {
    r.cleanup();
  }
});

test('fetch returns what was published, and null before the branch exists', () => {
  const r = repos();
  try {
    assert.equal(fetchStatus({ repo: r.work }), null);
    const text = doc('2026-10-20', 'red', { red_since: '2026-10-20' });
    publishStatus({ repo: r.work, file: withFile(r.dir, text) });
    assert.equal(fetchStatus({ repo: r.work }), text);
  } finally {
    r.cleanup();
  }
});

test('the command line: publish, then fetch from another clone; fetch exits 3 while nothing is published', () => {
  const r = repos();
  try {
    const out = path.join(r.dir, 'got', 'nightly.json');
    const none = run(r.work, ['fetch', '--out', out]);
    assert.equal(none.status, 3);
    assert.ok(!fs.existsSync(out), 'nothing is written when there is nothing to read');
    const text = doc('2026-10-20');
    const file = withFile(r.dir, text);
    const pub = run(r.work, ['publish', '--file', file]);
    assert.equal(pub.status, 0, pub.err);
    assert.match(pub.out, /nightly-status created at [0-9a-f]{12}/);
    const other = path.join(r.dir, 'other');
    git(r.dir, ['clone', '-q', r.origin, other]);
    const got = run(other, ['fetch', '--out', out]);
    assert.equal(got.status, 0, got.err);
    assert.equal(fs.readFileSync(out, 'utf8'), text);
    assert.equal(run(r.work, ['publish']).status, 2);
    assert.equal(run(r.work, ['frobnicate']).status, 2);
    assert.equal(run(r.work, ['publish', '--file', file, '--bogus', 'x']).status, 2);
  } finally {
    r.cleanup();
  }
});

test('a file that is not a nightly status is refused before anything is pushed', () => {
  const r = repos();
  try {
    for (const bad of ['{ not json', JSON.stringify({ schema: 'other', date: '2026-10-20', result: 'green' }), JSON.stringify({ schema: 'statespace/nightly-status@1', date: 'yesterday', result: 'green' }), JSON.stringify({ schema: 'statespace/nightly-status@1', date: '2026-10-20', result: 'amber' })]) {
      assert.throws(() => publishStatus({ repo: r.work, file: withFile(r.dir, bad) }), /status file/);
      assert.equal(run(r.work, ['publish', '--file', withFile(r.dir, bad)]).status, 2);
    }
    assert.equal(git(r.origin, ['branch', '--list', 'nightly-status']), '');
    assert.doesNotThrow(() => checkStatusDocument(doc('2026-10-20')));
  } finally {
    r.cleanup();
  }
});

test('two nights through the branch: what the lane writes is accepted, and the next night reads the since date back', () => {
  const r = repos();
  try {
    const root = path.join(r.dir, 'lane-root');
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'scripts', 'bad.mjs'), "console.log('GATE-x: FAIL'); process.exit(1);\n");
    const manifest = path.join(root, 'gates.json');
    const lanes = { fast: { step_timeout_s: 30 }, nightly: { step_timeout_s: 30 }, release: { step_timeout_s: 30 }, monthly: { step_timeout_s: 30 } };
    fs.writeFileSync(manifest, JSON.stringify({ format: 'lane-manifest/1', lanes, steps: [{ id: 'GATE-interp', kind: 'gate', script: 'scripts/bad.mjs', built_by: 'W2-T08', lanes: { nightly: {} } }] }));
    const night = (date, previous) => {
      const args = [path.join(HERE, 'lane.mjs'), 'nightly', '--root', root, '--manifest', manifest, '--now', `${date}T02:23:00Z`, '--quiet', ...(previous ? ['--previous', previous] : [])];
      const res = spawnSync(process.execPath, args, { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME } });
      assert.equal(res.status, 1, res.stdout + res.stderr);
      return path.join(root, 'status', 'nightly.json');
    };
    // Night 1: written, published, read back by the next night's job from another clone.
    assert.equal(publishStatus({ repo: r.work, file: night('2026-10-20') }).state, 'created');
    const other = path.join(r.dir, 'other');
    git(r.dir, ['clone', '-q', r.origin, other]);
    const previous = path.join(r.dir, 'previous.json');
    assert.equal(run(other, ['fetch', '--out', previous]).status, 0);
    // Night 2: the same gate is still red, and keeps the date of night 1.
    const second = JSON.parse(fs.readFileSync(night('2026-10-21', previous), 'utf8'));
    assert.deepEqual(second.failed.map((f) => [f.gate, f.since]), [['GATE-interp', '2026-10-20']]);
    assert.equal(second.red_since, '2026-10-20');
    assert.equal(publishStatus({ repo: other, file: path.join(root, 'status', 'nightly.json') }).state, 'updated');
    assert.equal(JSON.parse(git(r.origin, ['show', 'nightly-status:status/nightly.json'])).date, '2026-10-21');
  } finally {
    r.cleanup();
  }
});
