#!/usr/bin/env node
// The browser harness of W1-T07 as one command, so that a lane can run it: build the harness (the real Call It sheet, the real
// Mirror screen and the Mirror's real route, over the real IndexedDB adapter) with Vite, then run harness/check.mjs in Chromium,
// Firefox and WebKit inside the pinned Playwright image, with no network and 4 GB of memory. It checks that the first call is final
// (a reload, a second tab, a stale tab, tabs that commit at the same moment, a forced click, a hostile re-enable), the layout at 320,
// 360 and 1280 px in both themes with axe, target sizes, the keyboard, the docked bar and the Mirror's route.
//
//   node scripts/spikes/W1-T07/browsers.mjs                                   everything, all three engines (about four minutes)
//   ONLY=final,keyboard ENGINES=chromium node scripts/spikes/W1-T07/browsers.mjs   chosen parts and engines (see README.md)
//
// Needs Docker and mcr.microsoft.com/playwright:v1.63.0-noble, the image RUN-call-it-mirror names. It writes nothing in the
// repository: the build and the report go to a scratch directory that is removed at the end (W1T07_SCRATCH picks where).
//
// Exit status: 0 when no check failed, 1 when one failed or the harness could not be built or run, 2 when Docker or the image is missing.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';
const HARNESS = 'scripts/spikes/W1-T07/harness';
const NAME = 'w1t07-browsers';

const have = spawnSync('docker', ['image', 'inspect', IMAGE], { encoding: 'utf8' });
if (have.status !== 0) {
  console.error(`browsers: Docker and the image ${IMAGE} are needed, and this host has not got them`);
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-browsers-'));
const dist = path.join(scratch, 'dist');
const out = path.join(scratch, 'out');
fs.mkdirSync(out);
let code = 1;
try {
  const build = spawnSync('npx', ['vite', 'build', '-c', `${HARNESS}/vite.config.mjs`], { cwd: REPO, env: { ...process.env, HARNESS_OUT: dist }, stdio: ['ignore', 'ignore', 'inherit'] });
  if (build.status !== 0) {
    console.error('browsers: the harness did not build');
  } else {
    const env = ['ONLY', 'ENGINES'].flatMap((k) => (process.env[k] ? ['-e', `${k}=${process.env[k]}`] : []));
    const run = spawnSync(
      'docker',
      ['run', '--rm', '--memory=4g', '--network', 'none', '--name', NAME, ...env, '-v', `${REPO}:/repo:ro`, '-v', `${dist}:/dist:ro`, '-v', `${out}:/out`, IMAGE, 'node', `/repo/${HARNESS}/check.mjs`, '/dist', '/out', '/statespace/'],
      { stdio: 'inherit' },
    );
    const reportFile = path.join(out, 'report.json');
    const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
    if (report === null) console.error('browsers: the harness wrote no report');
    else console.log(`browsers: ${report.layout.length} layout and axe runs, ${report.final.length} first-call checks, ${report.failures.length} failures`);
    code = run.status === 0 && report !== null && report.failures.length === 0 ? 0 : 1;
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
process.exit(code);
