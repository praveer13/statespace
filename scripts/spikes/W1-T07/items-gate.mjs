#!/usr/bin/env node
// GATE-items on the Call It fixtures, through the gate's command line (W1-T07's acceptance): the fixture lesson pages of
// apps/site/src/components/call-it/fixtures/ are copied into a scratch root beside what the gate reads with pages (the ID
// registry and the run records the pages cite), and `node scripts/verify-items.mjs --root <the root>` runs on it, planted self-check
// included. The gate's exit status is this script's. The generated fixtures have no command line: no family module serves them
// (GEN-call-it is W1-T24's); apps/site/src/components/call-it/test/items-gate.test.mjs reads them through the gate's own instance
// reader and rules.
//
//   node scripts/spikes/W1-T07/items-gate.mjs            a few seconds more than the gate's own run
//   node scripts/spikes/W1-T07/items-gate.mjs --verbose  the gate's per-call report

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { cleanup, REPO, scratchRoot } from './lib/items-gate.mjs';

const root = scratchRoot();
try {
  const args = ['scripts/verify-items.mjs', '--root', root, ...process.argv.slice(2)];
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
  const scrub = (t) => t.split(root).join('<sandbox>').split(path.resolve(REPO)).join('<repo>');
  process.stdout.write(scrub(r.stdout ?? ''));
  process.stderr.write(scrub(r.stderr ?? ''));
  process.exitCode = r.status ?? 2;
} finally {
  cleanup(root);
}
