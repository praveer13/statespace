#!/usr/bin/env node
// GEN-fixture with the t3 cue it shipped with (scripts/verify-items.mjs's shippedCueFixture: the dp:Z5 mutant "drop a
// conjunct" put back where the family now offers dp:G5 "flip the connective only"), served by the fixture's own box
// engine at the gate's 200 seeds per template and band, as GATE-items sampled the family before W1-T39 changed it, and
// judged by every rule of the gate. Prints the findings and the always-longest row as JSON, for RUN-items-gate.
//
//   node scripts/spikes/W1-T39/shipped-cue.mjs

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const gate = await import(pathToFileURL(path.join(REPO, 'scripts', 'verify-items.mjs')).href);
const fx = await import(pathToFileURL(path.join(REPO, 'packages', 'generators', 'src', 'core', 'fixture', 'index.ts')).href);
const raw = (await import(pathToFileURL(path.join(REPO, 'scripts', 'verify-generators.mjs')).href)).loadRegistry(REPO);

const { generator } = await gate.shippedCueFixture();
const family = await gate.sampleFamily(generator, fx.ports, {});
const result = gate.checkModel({ families: [family], pages: [], registry: raw ? { misconceptions: raw.misconceptions, generators: raw.generators } : null, ctiActive: false, sources: [], runs: new Map() });
const row = result.rows.find((r) => r.pool === 'family:GEN-fixture' && r.strategy === 'always-longest');
const round = (x) => Math.round(x * 10) / 10;
console.log(JSON.stringify({
  family: family.id,
  mode: family.mode,
  seedsPerCell: family.seedsPerCell,
  items: family.items.length,
  replicate: family.replicate.length,
  alwaysLongest: row ? { score: round(row.primary.x), chance: round(row.primary.mu), bar: round(row.primary.bar), n: row.primary.n, replicateScore: row.replicate ? round(row.replicate.x) : null, replicateBar: row.replicate ? round(row.replicate.bar) : null, fail: row.fail } : null,
  findings: result.findings.map((f) => ({ rule: f.rule, check: f.check, message: f.message })),
}, null, 2));
