#!/usr/bin/env node
// The nightly status on its own branch (ARCHITECTURE.md section 13.4; W0-T04). Dependency-free; Node 22 and git.
//
// The nightly lane writes status/nightly.json (lane.mjs). To reach the site build and the release gate without a commit
// on the default branch (which may be protected, and whose tip a nightly commit would move away from the commit the
// release gate checks), the nightly job publishes the file on the branch nightly-status, at the same path.
//
//   node scripts/spikes/W0-T04/status-branch.mjs publish --file FILE   write FILE as status/nightly.json on the branch and push it
//   node scripts/spikes/W0-T04/status-branch.mjs fetch --out FILE      read status/nightly.json from the branch into FILE
//
//   --remote NAME   the remote (default origin)          --branch NAME   the branch (default nightly-status)
//   --repo DIR      the clone to work in (default the current directory)
//
// publish builds the commit with git's plumbing and a scratch index, so it touches neither the working tree nor the
// current branch. It fetches the branch tip first and retries when the push loses a race. The branch holds one file;
// each commit replaces it, and nothing is pushed when the content is the same.
// Exit status: 0 done; 3 (fetch only) the branch or the file does not exist yet; 1 a failure; 2 a usage problem.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STATUS_SCHEMA } from './lane.mjs';

export const DEFAULT_BRANCH = 'nightly-status';
export const STATUS_PATH = 'status/nightly.json';
const BOT_NAME = 'github-actions[bot]';

class Failure extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function git(repo, args, { input, env, allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', input, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Failure(`git could not run: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) throw new Failure(`git ${args.join(' ')} failed (${r.status}): ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' | ')}`);
  return r;
}

export function checkStatusDocument(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new Failure(`the status file is not JSON: ${e.message}`, 2);
  }
  if (doc?.schema !== STATUS_SCHEMA) throw new Failure(`the status file does not declare ${STATUS_SCHEMA}`, 2);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date ?? '') || (doc.result !== 'green' && doc.result !== 'red')) throw new Failure('the status file lacks a date or a green/red result', 2);
  return doc;
}

/** Read status/nightly.json from the branch; returns the text, or null when the branch or the file is not there. */
export function fetchStatus({ repo = process.cwd(), remote = 'origin', branch = DEFAULT_BRANCH } = {}) {
  const heads = git(repo, ['ls-remote', '--heads', remote, `refs/heads/${branch}`]);
  if (heads.stdout.trim() === '') return null;
  git(repo, ['fetch', '--quiet', '--depth=1', remote, `refs/heads/${branch}`]);
  const shown = git(repo, ['show', `FETCH_HEAD:${STATUS_PATH}`], { allowFail: true });
  return shown.status === 0 ? shown.stdout : null;
}

/**
 * Commit the file on the branch and push. Returns {state: 'created' | 'updated' | 'unchanged', commit}. `hooks.beforePush`
 * exists for the tests, to lose a race on purpose.
 */
export function publishStatus({ repo = process.cwd(), remote = 'origin', branch = DEFAULT_BRANCH, file, attempts = 5, hooks = {} }) {
  const text = fs.readFileSync(file, 'utf8');
  const doc = checkStatusDocument(text);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'status-branch-'));
  try {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const heads = git(repo, ['ls-remote', '--heads', remote, `refs/heads/${branch}`]);
      let parent = null;
      let parentTree = null;
      if (heads.stdout.trim() !== '') {
        git(repo, ['fetch', '--quiet', '--depth=1', remote, `refs/heads/${branch}`]);
        parent = git(repo, ['rev-parse', 'FETCH_HEAD']).stdout.trim();
        parentTree = git(repo, ['rev-parse', 'FETCH_HEAD^{tree}']).stdout.trim();
      }
      const blob = git(repo, ['hash-object', '-w', '--stdin'], { input: text }).stdout.trim();
      const index = path.join(scratch, `index-${attempt}`);
      git(repo, ['update-index', '--add', '--cacheinfo', `100644,${blob},${STATUS_PATH}`], { env: { GIT_INDEX_FILE: index } });
      const tree = git(repo, ['write-tree'], { env: { GIT_INDEX_FILE: index } }).stdout.trim();
      if (parentTree === tree) return { state: 'unchanged', commit: parent };
      const message = `nightly status ${doc.date}: ${doc.result}${doc.blocked ? ' (blocked)' : ''}`;
      const commit = git(repo, ['-c', `user.name=${BOT_NAME}`, '-c', 'user.email=', 'commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message]).stdout.trim();
      hooks.beforePush?.(attempt);
      const pushed = git(repo, ['push', '--quiet', remote, `${commit}:refs/heads/${branch}`], { allowFail: true });
      if (pushed.status === 0) return { state: parent ? 'updated' : 'created', commit };
      if (attempt === attempts) throw new Failure(`the push to ${remote}/${branch} failed ${attempts} times: ${(pushed.stderr || '').trim().split('\n').slice(-2).join(' | ')}`);
    }
    throw new Failure('unreachable');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function parse(argv) {
  const [command, ...rest] = argv;
  const opts = { command, remote: 'origin', branch: DEFAULT_BRANCH, repo: process.cwd(), file: null, out: null };
  const names = { '--remote': 'remote', '--branch': 'branch', '--repo': 'repo', '--file': 'file', '--out': 'out' };
  for (let i = 0; i < rest.length; i++) {
    const key = names[rest[i]];
    if (!key) throw new Failure(`unknown argument ${rest[i]}`, 2);
    if (i + 1 >= rest.length) throw new Failure(`${rest[i]} needs a value`, 2);
    opts[key] = rest[++i];
  }
  return opts;
}

export function main(argv) {
  try {
    const o = parse(argv);
    const repo = path.resolve(o.repo);
    if (o.command === 'publish') {
      if (!o.file) throw new Failure('publish needs --file', 2);
      const r = publishStatus({ repo, remote: o.remote, branch: o.branch, file: path.resolve(o.file) });
      console.log(`status-branch: ${o.branch} ${r.state}${r.commit ? ` at ${r.commit.slice(0, 12)}` : ''}`);
      return 0;
    }
    if (o.command === 'fetch') {
      if (!o.out) throw new Failure('fetch needs --out', 2);
      const text = fetchStatus({ repo, remote: o.remote, branch: o.branch });
      if (text === null) {
        console.log(`status-branch: no ${STATUS_PATH} on ${o.remote}/${o.branch} yet`);
        return 3;
      }
      checkStatusDocument(text);
      fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      fs.writeFileSync(path.resolve(o.out), text);
      console.log(`status-branch: read ${STATUS_PATH} from ${o.remote}/${o.branch}`);
      return 0;
    }
    throw new Failure('the command is publish or fetch', 2);
  } catch (e) {
    if (e instanceof Failure) {
      console.error(`status-branch: ${e.message}`);
      return e.code;
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
