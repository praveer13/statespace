#!/usr/bin/env node
// File, update or close the monthly issue (W0-T04). Dependency-free; Node 22 and the gh CLI.
//
// The monthly lane runs GATE-labs on the newest stable Lean (monthly.yml) and blocks nothing; its only output is an
// issue. This script reads the lane summary that lane.mjs wrote and keeps at most one open issue, found by its label:
//
//   red       open issue: add a comment; none open: create one
//   green     open issue: close it with a comment; none open: do nothing
//   no gate ran (GATE-labs is not built yet): do nothing, and say so
//
//   node scripts/spikes/W0-T04/file-issue.mjs --summary FILE --lean TAG [--label NAME] [--dry-run]
//   node scripts/spikes/W0-T04/file-issue.mjs --unavailable REASON --lean TAG       the lane could not run at all: red
//
// gh is the GH environment variable when set (the tests set it), else `gh`; it needs GH_TOKEN and the permission
// issues: write. --dry-run prints what would be sent. The issue text names no repository path, only gates, their
// verdict lines and the link to the run.
//
// Exit status: 0 done (or nothing to do); 1 gh failed; 2 a usage problem.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_LABEL = 'monthly-lean';
const LABEL_COLOR = 'd93f0b';
const LABEL_TEXT = 'The monthly check of the labs on the newest stable Lean (blocks nothing)';

class Usage extends Error {}

/** Decide what the summary calls for. `summary` may be null when the lane could not run (`unavailable` says why). */
export function decide({ summary, unavailable, lean, date, runUrl }) {
  const tag = lean.startsWith('v') ? lean : `v${lean}`;
  const head = `**Monthly check, ${date}.** GATE-labs against the newest stable Lean release, ${tag} (\`leanprover/lean4:${tag}\`). This lane blocks nothing; the course stays on its pin until a reviewed change moves it.`;
  const link = runUrl ? `\nRun: ${runUrl}\n` : '\n';
  if (unavailable || !summary) {
    return {
      state: 'red',
      title: `Monthly check: the labs could not be checked on Lean ${tag}`,
      body: `${head}\n\nThe check could not run: ${unavailable ?? 'no lane summary was produced'}.${link}`,
    };
  }
  const steps = summary.steps ?? [];
  const failing = steps.filter((s) => ['fail', 'error', 'timeout'].includes(s.result));
  const ran = steps.filter((s) => ['pass', 'fail', 'error', 'timeout'].includes(s.result));
  const rows = ['| Step | Result | Verdict |', '|---|---|---|', ...ran.map((s) => `| ${s.id} | ${s.result} | ${String(s.verdict ?? '').replace(/\|/g, '\\|')} |`)];
  const tails = failing.filter((s) => Array.isArray(s.output_tail) && s.output_tail.length > 0).map((s) => `<details><summary>${s.id}: the last lines of its output</summary>\n\n\`\`\`\n${s.output_tail.join('\n')}\n\`\`\`\n\n</details>`);
  if (failing.length > 0) {
    return { state: 'red', title: `Monthly check: GATE-labs is red on Lean ${tag}`, body: `${head}\n\n${rows.join('\n')}\n\n${tails.join('\n\n')}${link}` };
  }
  if (ran.length > 0) {
    return { state: 'green', title: `Monthly check: GATE-labs is green on Lean ${tag}`, body: `${head}\n\n${rows.join('\n')}${link}` };
  }
  const absent = steps.filter((s) => s.result === 'absent').map((s) => s.id);
  return { state: 'nothing-ran', title: '', body: `no step ran (${absent.join(', ') || 'none in the lane'} not built yet)` };
}

function gh(args, { dryRun, log }) {
  const cmd = process.env.GH || 'gh';
  if (dryRun) {
    log(`dry run: ${cmd} ${args.join(' ')}`);
    return { status: 0, stdout: '' };
  }
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) throw new Error(`could not run ${cmd}: ${r.error.message}`);
  return r;
}

function must(r, what) {
  if (r.status !== 0) throw new Error(`${what} failed (${r.status}): ${(r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' | ')}`);
  return r;
}

export function apply({ decision, label, dryRun = false, log = (s) => console.log(s) }) {
  if (decision.state === 'nothing-ran') {
    log(`monthly: ${decision.body}; nothing to file`);
    return { action: 'none' };
  }
  const io = { dryRun, log };
  must(gh(['label', 'create', label, '--color', LABEL_COLOR, '--description', LABEL_TEXT, '--force'], io), 'creating the label');
  const listed = must(gh(['issue', 'list', '--label', label, '--state', 'open', '--limit', '1', '--json', 'number', '--jq', '.[0].number // empty'], io), 'listing the open issue');
  const open = listed.stdout.trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-issue-'));
  try {
    const bodyFile = path.join(dir, 'body.md');
    fs.writeFileSync(bodyFile, `${decision.body}\n`);
    if (decision.state === 'red') {
      if (open) {
        must(gh(['issue', 'comment', open, '--body-file', bodyFile], io), 'commenting on the issue');
        log(`monthly: red; commented on issue #${open}`);
        return { action: 'commented', issue: open };
      }
      must(gh(['issue', 'create', '--title', decision.title, '--label', label, '--body-file', bodyFile], io), 'creating the issue');
      log('monthly: red; created an issue');
      return { action: 'created' };
    }
    if (open) {
      must(gh(['issue', 'close', open, '--comment', `${decision.title}\n\n${decision.body}`], io), 'closing the issue');
      log(`monthly: green; closed issue #${open}`);
      return { action: 'closed', issue: open };
    }
    log('monthly: green; no open issue to close');
    return { action: 'none' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parse(argv) {
  const o = { summary: null, unavailable: null, lean: null, label: DEFAULT_LABEL, dryRun: false };
  const names = { '--summary': 'summary', '--unavailable': 'unavailable', '--lean': 'lean', '--label': 'label' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (names[a]) {
      if (i + 1 >= argv.length) throw new Usage(`${a} needs a value`);
      o[names[a]] = argv[++i];
    } else throw new Usage(`unknown argument ${a}`);
  }
  if (!o.lean || !/^v?[0-9]+\.[0-9]+\.[0-9]+$/.test(o.lean)) throw new Usage('--lean needs a release tag such as v4.35.0');
  if (!o.summary && !o.unavailable) throw new Usage('give --summary FILE, or --unavailable REASON');
  return o;
}

export function main(argv, env = process.env) {
  try {
    const o = parse(argv);
    let summary = null;
    if (o.summary && fs.existsSync(o.summary)) summary = JSON.parse(fs.readFileSync(o.summary, 'utf8'));
    const unavailable = o.unavailable ?? (summary ? null : `the lane summary ${path.basename(o.summary)} is missing`);
    const runUrl = env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null;
    const decision = decide({ summary, unavailable, lean: o.lean, date: new Date().toISOString().slice(0, 10), runUrl });
    if (o.dryRun) console.log(`dry run: ${decision.state}\n${decision.title ? `${decision.title}\n` : ''}${decision.body}`);
    apply({ decision, label: o.label, dryRun: o.dryRun });
    return 0;
  } catch (e) {
    if (e instanceof Usage) {
      console.error(`file-issue: ${e.message}`);
      return 2;
    }
    console.error(`file-issue: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
