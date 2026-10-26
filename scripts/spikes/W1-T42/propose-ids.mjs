#!/usr/bin/env node
// Add the two run IDs of W1-T42 to packages/ids/proposals.json, or take them out (spine section 9.5 registers no run for this task).
//
//   flock <gen.lock> node scripts/spikes/W1-T42/propose-ids.mjs            add them
//   flock <gen.lock> node scripts/spikes/W1-T42/propose-ids.mjs --remove   take them out
//
// GATE-links fails a proposal that no scanned document (docs/, curriculum/, tracker/, README.md) uses, and the two runs
// are cited only in this folder's README and in the run records, so they are NOT proposed while the work stands as it
// is. The task that first cites either ID in a scanned document (W1-T47's docs/waves/W1-exit.md, for one) adds them
// with this script, in the same change. Idempotent. Run it under the generated-outputs lock, because other tasks write
// the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FILE = path.join(REPO, 'packages', 'ids', 'proposals.json');
const REGISTRY = path.join(REPO, 'packages', 'ids', 'src', 'registry.json');

const WANTED = [
  {
    id: 'RUN-specimens-gate',
    proposedBy: 'W1-T42',
    note: 'The executions behind GATE-specimens: the runs behind the specimens of spine 5.1 re-executed on native Z3 and on Pyodide, the release-side mode, the planted-fault self-check and the tests, with the planted red night through the lane. Spine section 9.5 registers no run for W1-T42; the next spine revision registers or declines it.',
  },
  {
    id: 'RUN-conformance-gate',
    proposedBy: 'W1-T42',
    note: 'The executions behind GATE-conformance: Pyodide Z3 = native Z3 on the same queries, the recipient wrap included, which spine 9.5 and 11.2 say GATE-conformance records; its require-all mode and its planted-fault self-check. Spine section 9.5 registers no run for W1-T42; the next spine revision registers or declines it.',
  },
];

const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (process.argv.includes('--remove')) {
  const ids = new Set(WANTED.map((w) => w.id));
  const before = doc.proposals.length;
  doc.proposals = doc.proposals.filter((p) => !(ids.has(p.id) && p.proposedBy === 'W1-T42'));
  if (doc.proposals.length !== before) fs.writeFileSync(FILE, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`${before - doc.proposals.length} proposal(s) removed from packages/ids/proposals.json (${doc.proposals.length} left)`);
  process.exit(0);
}
const registered = new Set((JSON.parse(fs.readFileSync(REGISTRY, 'utf8')).entries ?? []).map((e) => e.id));
const present = new Set((doc.proposals ?? []).map((p) => p.id));
let added = 0;
for (const entry of WANTED) {
  if (present.has(entry.id) || registered.has(entry.id)) continue;
  doc.proposals.push(entry);
  added += 1;
}
if (added > 0) fs.writeFileSync(FILE, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${added} proposal${added === 1 ? '' : 's'} added to packages/ids/proposals.json (${doc.proposals.length} in all)`);
