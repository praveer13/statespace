#!/usr/bin/env node
// Builds the specimen cabinet's data (W1-T16): content/specimens/*.json and runs/ in, the site's
// apps/site/src/screens/specimens/data/cabinet.generated.json out.
//
//   node scripts/spikes/W1-T16/build-cabinet.mjs            write the file (after any finding, nothing is written)
//   node scripts/spikes/W1-T16/build-cabinet.mjs --check    fail when the committed file differs from what this builds
//   node scripts/spikes/W1-T16/build-cabinet.mjs --json     print the cabinet, and write nothing
//   node scripts/spikes/W1-T16/build-cabinet.mjs --root DIR build from the tree under DIR (the tests do)
//
// A record that points at a verdict line its run does not hold, a sat that does not replay, a witness whose length the
// record states wrongly, a minimal claim with no Optimize query behind it (or one that minimized another objective), a
// title that is not the spine's words, a dated-incident mark that disagrees with the spine, a run the spine names behind
// the specimen that the record never cites, an internal name (the glossary's) in the record's words, a lesson, a lab stage
// or a claim the registry does not hold, a mount rule that leaves out the lesson that finds the specimen, or a file in
// content/specimens/ that is not a JSON record, is a finding. Exit 0 built (or fresh), 1 findings or a stale file, 2 the
// build could not run (an unknown argument, a file it needs that cannot be read).

import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../../runs/registry.mjs';
import { CABINET_PATH, buildCabinet, cabinetText } from './lib/cabinet.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const rootIdx = args.indexOf('--root');
const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1] ?? '') : REPO;
const known = new Set(['--check', '--json', '--root']);
for (const a of args) {
  if (a.startsWith('--') && !known.has(a)) {
    console.error(`build-cabinet: unknown argument ${a}`);
    process.exit(2);
  }
}
if (rootIdx >= 0 && (args[rootIdx + 1] === undefined || args[rootIdx + 1].startsWith('--'))) {
  console.error('build-cabinet: --root needs a directory');
  process.exit(2);
}

let built;
try {
  built = buildCabinet(root);
} catch (e) {
  console.error(`build-cabinet: could not run under ${rootIdx >= 0 ? 'the given root' : 'this repository'}: ${e.message}`);
  process.exit(2);
}
const { cabinet, problems, warnings } = built;
for (const w of warnings) console.log(`  note  ${w}`);
if (problems.length > 0) {
  for (const p of problems) console.error(`  FAIL  ${p}`);
  console.error(`build-cabinet: ${problems.length} finding${problems.length === 1 ? '' : 's'}; nothing written`);
  process.exit(1);
}
const text = cabinetText(cabinet);
const file = path.join(root, CABINET_PATH);
if (flag('--json')) {
  process.stdout.write(text);
  process.exit(0);
}
if (flag('--check')) {
  const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (have !== text) {
    console.error(`build-cabinet: ${CABINET_PATH} ${have === null ? 'is missing' : 'differs from what content/specimens/ and runs/ build'}; run node scripts/spikes/W1-T16/build-cabinet.mjs and review the diff (a run that was recorded again changes its lines here)`);
    process.exit(1);
  }
  console.log(`build-cabinet: ${CABINET_PATH} is what ${cabinet.specimens.length} records and their runs build`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, text);
console.log(`build-cabinet: wrote ${CABINET_PATH}: ${cabinet.specimens.length} specimens, ${cabinet.stages.length} stages, ${Object.keys(Object.assign({}, ...cabinet.specimens.map((s) => s.evidence.runs))).length} runs cited`);
