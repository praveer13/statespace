#!/usr/bin/env node
// Add W1-T16's run IDs to packages/ids/proposals.json, or take them out (spine section 9.5 registers no run for this task).
//
//   flock <gen.lock> node scripts/spikes/W1-T16/propose-ids.mjs            add them
//   flock <gen.lock> node scripts/spikes/W1-T16/propose-ids.mjs --remove   take them out
//
// RUN-specimens-replay is cited by the specimen records of content/specimens/ (SP-1.1, SP-1.4 and SP-1.5 point at
// its replay lines), which GATE-links scans, so the proposal is used and stands until the next spine revision registers
// or declines the ID. Idempotent. Run it under the generated-outputs lock, because other tasks write the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FILE = path.join(REPO, 'packages', 'ids', 'proposals.json');
const REGISTRY = path.join(REPO, 'packages', 'ids', 'src', 'registry.json');

const WANTED = [
  {
    id: 'RUN-specimens-replay',
    proposedBy: 'W1-T16',
    note: 'The replay of the witnesses of SP-1.1, SP-1.4 and SP-1.5 in plain integers, which the specimen label needs before it may show REFUTED: the three W0 Z3 runs behind them print a model and no replay. Spine section 9.5 registers no run for W1-T16; the next spine revision registers or declines it.',
  },
];

const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (process.argv.includes('--remove')) {
  const ids = new Set(WANTED.map((w) => w.id));
  const before = doc.proposals.length;
  doc.proposals = doc.proposals.filter((p) => !(ids.has(p.id) && p.proposedBy === 'W1-T16'));
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
