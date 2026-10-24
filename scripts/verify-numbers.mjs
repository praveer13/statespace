#!/usr/bin/env node
// GATE-numbers (spine sections 9.5 and 11.2; ARCHITECTURE.md section 9.3; W0-S11).
//
// Every tool number, verdict, flag and version in copy, keys and artboards carries a run reference, and no
// sentence of the deny-list of known-false sentences (BRIEF section 2.2) appears. The rules are in
// scripts/runs/numbers-rules.mjs; the deny-list is the gate's own fixture, scripts/runs/numbers-deny-list.json.
//
//   node scripts/verify-numbers.mjs                  the fast lane
//   node scripts/verify-numbers.mjs --strict         the release lane: the known debt in the baseline fails too
//   node scripts/verify-numbers.mjs --list           also print every token and how it passed
//   node scripts/verify-numbers.mjs --json           print the report as JSON
//   node scripts/verify-numbers.mjs --root DIR       check the tree under DIR
//   node scripts/verify-numbers.mjs --write-baseline list today's untagged tokens in documents as known debt
//                                                    (scripts/runs/numbers-baseline.json); for owner review
//   node scripts/verify-numbers.mjs --self-check     plant faults in a scratch copy; the gate must fail on each
//
// What it reads (spine section 11.1: README.md, docs/, curriculum/ and tracker/ from W0; and copy):
//   documents  README.md, docs/, curriculum/, tracker/, labs/*.md, design/ (new artboards)
//   copy       content/stages/ and labs/LAB-*/: every unit carries its own tag
//   exempt     docs/history/ and design/canvas/ (spine section 10.2); fenced code blocks; HTML comments
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const rules = await import(pathToFileURL(path.join(HERE, 'runs', 'numbers-rules.mjs')).href);

if (flag('--self-check')) {
  const { selfCheckNumbers } = await import(pathToFileURL(path.join(HERE, 'runs', 'gate-self-check.mjs')).href);
  console.log('GATE-numbers self-check: copy the scanned tree to a scratch directory, plant one fault at a time, require the gate to fail on it');
  const results = await selfCheckNumbers({ repo: path.resolve(HERE, '..'), script: fileURLToPath(import.meta.url) });
  for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`GATE-numbers self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
  process.exit(bad === 0 ? 0 : 1);
}

const root = path.resolve(option('--root') ?? path.join(HERE, '..'));
const strict = flag('--strict');
const started = Date.now();
let report;
try {
  report = rules.checkTree(root);
} catch (e) {
  console.error(`GATE-numbers: could not run: ${e instanceof Error ? e.stack : e}`);
  process.exit(2);
}

if (flag('--write-baseline')) {
  const entries = rules.baselineOf(report.all);
  const doc = {
    description:
      'Known debt for GATE-numbers: untagged tool-shaped tokens that documents held when the gate was introduced (W0-S11), each keyed by its document, its token and a hash of its sentence. The fast lane reports them and passes; --strict, the release lane, fails on them. A token leaves this list when its sentence gains a run reference, a [D] or a [V] tag, or is rewritten; a changed sentence no longer matches and fails until it is tagged. Regenerate with node scripts/verify-numbers.mjs --write-baseline, and review the diff: the list may only shrink.',
    entries,
  };
  fs.writeFileSync(rules.BASELINE_FILE, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`GATE-numbers: wrote ${entries.length} baseline entries to ${path.relative(path.join(HERE, '..'), rules.BASELINE_FILE)}`);
  process.exit(0);
}

const failures = strict ? [...report.findings, ...report.known] : report.findings;
if (flag('--json')) {
  const { tokenLog, all, ...rest } = report;
  // process.exitCode, not process.exit: a large report written to a pipe must be flushed before exit.
  process.stdout.write(`${JSON.stringify({ ...rest, strict, failures: failures.length }, null, 2)}\n`);
  process.exitCode = failures.length === 0 ? 0 : 1;
} else {

console.log('GATE-numbers');
console.log(`  read  ${report.files} files (${report.documents} documents, ${report.copy} copy); ${report.tokens} tool-shaped tokens in ${report.units} units; ${report.sourceKeys} source keys defined`);
const p = report.passed;
console.log(`  pass  ${p.reference} under a run reference, ${p.design} tagged [D], ${p.verified} tagged [V], ${p.source} under a source citation, ${p.evidence} under an executed-evidence key, ${p.introduced} introduced with a tag elsewhere in the same document`);
if (flag('--list')) for (const t of report.tokenLog) console.log(`  token ${t.file}:${t.line}  ${t.kind}  ${JSON.stringify(t.text)}  ${t.how}`);
for (const n of report.notes) console.log(`  note  ${n}`);
if (report.known.length > 0) {
  const byFile = new Map();
  for (const f of report.known) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);
  console.log(`  ${strict ? 'FAIL' : 'known'} ${report.known.length} untagged tokens listed as debt in scripts/runs/numbers-baseline.json, in ${byFile.size} documents (${[...byFile].map(([f, n]) => `${f} ${n}`).join(', ')})${strict ? '' : '; --strict fails on them'}`);
}
if (report.stale.length > 0) console.log(`  note  ${report.stale.length} baseline entries match nothing now (tagged or rewritten); shrink the list with --write-baseline`);
for (const f of report.findings) console.log(`  FAIL  ${rules.formatFinding(f)}`);
if (strict) for (const f of report.known) console.log(`  FAIL  ${rules.formatFinding(f)} (listed debt)`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (failures.length > 0) {
  console.log(`GATE-numbers: FAIL (${failures.length} finding${failures.length === 1 ? '' : 's'}: ${report.untagged} untagged, ${report.denied} deny-list${strict ? `, ${report.known.length} listed debt` : ''}; ${seconds} s)`);
  process.exit(1);
}
console.log(`GATE-numbers: PASS (${report.tokens} tokens in ${report.files} files${report.known.length ? `, ${report.known.length} known` : ''}${strict ? ', strict' : ''}; ${seconds} s)`);
}
