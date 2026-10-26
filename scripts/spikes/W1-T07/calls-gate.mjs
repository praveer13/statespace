#!/usr/bin/env node
// GATE-calls on the Call It fixtures: every authored call of the three fixture lesson pages of
// apps/site/src/components/call-it/fixtures/ is run by the gate's own engines (native Z3 and Pyodide's Z3, both 5.3.1), the two must
// agree, every unsat is cross-checked with cvc5, and the answer each call keys must be what its first solver check gives. This is
// what makes the fixtures' keys verdicts of real checker runs and not only text that matches a recorded verdict line. The pages are
// copied into a scratch root beside what the gate reads with pages (the ID registry and the run records the pages cite), and
// `node scripts/verify-calls.mjs --root <the root>` runs on it, planted self-check included; the gate's exit status is this script's.
// It needs the pinned engines of scripts/spikes/W1-T42/lib/engines.mjs (a cache fetched once) and the pinned cvc5, as the gate does.
//
//   node scripts/spikes/W1-T07/calls-gate.mjs             about twenty seconds
//   node scripts/spikes/W1-T07/calls-gate.mjs --verbose   the gate's per-cell report

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { cleanup, REPO, scratchRoot } from './lib/items-gate.mjs';

const root = scratchRoot();
try {
  const args = ['scripts/verify-calls.mjs', '--root', root, ...process.argv.slice(2)];
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
  const scrub = (t) => t.split(root).join('<sandbox>').split(path.resolve(REPO)).join('<repo>');
  process.stdout.write(scrub(r.stdout ?? ''));
  process.stderr.write(scrub(r.stderr ?? ''));
  process.exitCode = r.status ?? 2;
} finally {
  cleanup(root);
}
