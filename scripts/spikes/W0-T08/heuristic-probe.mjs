#!/usr/bin/env node
// The design probe behind GATE-facts' value tags (W0-T08), recorded in RUN-facts-gate as heuristic-probe.
//
// The alternative to explicit value tags is a heuristic: in every document sentence that cites a run with a
// plain citation ([X RUN-id] or {{run:RUN-id}}), take each tool-shaped output token (GATE-numbers' tokensOf) and
// ask whether any cited run holds that value in its version or values (packages/runs' findValue). This probe
// counts how often the answer is no on the tree as it stands. A token the runs do not hold is not necessarily
// wrong (the record may keep it in a configuration, a note or an output file, or the sentence may round or name a
// range), so a high count means the heuristic would mostly raise false alarms, and GATE-facts checks only explicit
// value tags. Read-only; prints a summary and the first examples. Dependency-free.
//
//   node scripts/spikes/W0-T08/heuristic-probe.mjs [--examples N]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const shown = argv.includes('--examples') ? Number(argv[argv.indexOf('--examples') + 1]) : 15;
const reg = await import(pathToFileURL(path.join(REPO, 'scripts', 'runs', 'registry.mjs')).href);
const rules = await import(pathToFileURL(path.join(REPO, 'scripts', 'runs', 'numbers-rules.mjs')).href);
const facts = await import(pathToFileURL(path.join(REPO, 'packages', 'runs', 'src', 'index.ts')).href);

const runs = new Map(reg.loadRegistry(REPO).filter((r) => r.doc !== null).map((r) => [r.id, r.doc]));
const OUTPUT_KINDS = facts.OUTPUT_KINDS;

/** The printable leaves of a record's version and values. */
function leaves(record) {
  const out = [];
  if (facts.isPrintable(record?.version)) out.push(record.version);
  const walk = (v) => {
    if (facts.isPrintable(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v !== null && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(record?.values);
  return out;
}

const byKind = new Map();
let tokens = 0;
let held = 0;
const examples = [];
for (const file of rules.listFiles(REPO)) {
  if (rules.isCopy(file)) continue;
  for (const u of rules.unitsOf(fs.readFileSync(path.join(REPO, file), 'utf8'), file, new Set())) {
    const cited = [...new Set(facts.referencesIn(u.text).filter((r) => r.form !== 'fact' && r.path === null && !facts.isPlaceholder(r) && runs.has(r.id)).map((r) => r.id))];
    if (cited.length === 0) continue;
    for (const t of rules.tokensOf(u.text)) {
      if (!OUTPUT_KINDS.has(t.kind)) continue;
      tokens += 1;
      const k = byKind.get(t.kind) ?? { tokens: 0, notHeld: 0 };
      k.tokens += 1;
      if (cited.some((id) => leaves(runs.get(id)).some((v) => facts.findValue(t.text, v) !== null))) held += 1;
      else {
        k.notHeld += 1;
        if (examples.length < shown) examples.push(`${file}:${u.lineOf(t.index)}  ${t.kind} ${JSON.stringify(t.text)}  cites ${cited.join(', ')}`);
      }
      byKind.set(t.kind, k);
    }
  }
}
console.log('heuristic probe: typed output tokens in document sentences with a plain citation of a run on disk');
console.log(`  tokens ${tokens}; held by a cited run's version or values ${held}; not held ${tokens - held}`);
for (const [kind, k] of [...byKind].sort()) console.log(`  ${kind.padEnd(8)} ${k.tokens} tokens, ${k.notHeld} not held`);
console.log('  first examples of tokens not held:');
for (const e of examples) console.log(`    ${e}`);
