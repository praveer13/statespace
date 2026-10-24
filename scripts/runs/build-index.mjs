#!/usr/bin/env node
// Write runs/index.json, the index of the runs registry (W0-S11).
//
//   node scripts/runs/build-index.mjs           write it
//   node scripts/runs/build-index.mjs --check   write nothing; exit 1 when it is stale
//
// One entry per runs/RUN-*.json: id, title, engine, version, task, origin, started_at, recorded_at and the
// SHA-256 of the record file. GATE-runs reports a stale index; its release lane fails on one.

import fs from 'node:fs';
import path from 'node:path';
import { REPO, indexText } from './registry.mjs';

const file = path.join(REPO, 'runs', 'index.json');
const fresh = indexText(REPO);
if (process.argv.includes('--check')) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === fresh) {
    console.log('runs/index.json is current');
    process.exit(0);
  }
  console.log('runs/index.json is stale; run node scripts/runs/build-index.mjs');
  process.exit(1);
}
fs.writeFileSync(file, fresh);
console.log(`wrote runs/index.json (${JSON.parse(fresh).count} records)`);
