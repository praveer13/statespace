#!/usr/bin/env node
// Add W1-T21's run ID to packages/ids/proposals.json, or take it out (spine section 9.5 registers no run for W1-T05 or
// W1-T21).
//
//   flock <gen.lock> node scripts/spikes/W1-T21/propose-ids.mjs            add it
//   flock <gen.lock> node scripts/spikes/W1-T21/propose-ids.mjs --remove   take it out
//
// GATE-links fails a proposal that no scanned document (README.md, docs/, curriculum/, labs/, content/, tracker/,
// design/) uses, and RUN-generators-gate is cited only in packages/generators/src/core/README.md and in its run record,
// neither of which GATE-links scans, so it is NOT proposed while the work stands as it is. The task that first cites it
// in a scanned document (W1-T47's docs/waves/W1-exit.md, for one) adds it with this script, in the same change.
// Idempotent. Run it under the generated-outputs lock, because other tasks write the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FILE = path.join(REPO, 'packages', 'ids', 'proposals.json');
const REGISTRY = path.join(REPO, 'packages', 'ids', 'src', 'registry.json');

const WANTED = [
  {
    id: 'RUN-generators-gate',
    proposedBy: 'W1-T21',
    note: 'The executions behind GATE-generators: the fixture family\'s determinism digest computed in Chromium, Firefox and WebKit and recorded in its determinism.json, the fast lane on the host, the determinism lint, the planted-fault self-check and the tests of packages/generators and packages/rng. Spine section 9.5 registers no run for W1-T05 or W1-T21; the next spine revision registers or declines it.',
  },
];

const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (process.argv.includes('--remove')) {
  const ids = new Set(WANTED.map((w) => w.id));
  const before = doc.proposals.length;
  doc.proposals = doc.proposals.filter((p) => !(ids.has(p.id) && p.proposedBy === 'W1-T21'));
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
