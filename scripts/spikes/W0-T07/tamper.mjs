#!/usr/bin/env node
// W0-T07: GATE-schema's keep/kill check against the real rules file, in scratch copies.
//
//   node scripts/spikes/W0-T07/tamper.mjs
//
// Copies what GATE-schema reads (as its own self-check does: schemas/, packages/schema/,
// bench/statespace/schema/, scripts/verify-schema.mjs) plus content/governance/keepkill-rules.yaml
// and runs/RUN-keepkill-rules.json into a fresh directory under the system temp directory, plants
// one change per scenario, runs the copy's gate and reports its keep/kill line and exit status.
// The repository itself is never modified. Prints one JSON object; exit 0 when every scenario ends
// as expected.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RULES = 'content/governance/keepkill-rules.yaml';
const RECORD = 'runs/RUN-keepkill-rules.json';
const COPY = ['schemas', 'packages/schema', 'bench/statespace/schema', 'scripts/verify-schema.mjs', RULES, RECORD];
const KEEP = (relative) => !/(^|\/)(__pycache__|node_modules|test)(\/|$)/.test(relative);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const edit = (root, file, fn) => {
  const p = path.join(root, file);
  const before = fs.readFileSync(p);
  const after = fn(before);
  if (Buffer.compare(before, after) === 0) throw new Error(`the planted change did not change ${file}`);
  fs.writeFileSync(p, after);
  return sha(after);
};
const text = (fn) => (buf) => Buffer.from(fn(buf.toString('utf8')), 'utf8');

/** [name, plant(root) -> hash of the planted file or null, expected status, expected keep/kill verdict] */
const SCENARIOS = [
  ['the rules and the record as written (control)', () => null, 0, 'ok'],
  ['one parameter changed after the fact (min_outcomes_per_arm 20 to 19)', (r) => edit(r, RULES, text((t) => t.replace('min_outcomes_per_arm: 20', 'min_outcomes_per_arm: 19'))), 1, 'FAIL'],
  ['a trailing newline added (whitespace only)', (r) => edit(r, RULES, (b) => Buffer.concat([b, Buffer.from('\n')])), 1, 'FAIL'],
  ['line endings converted to CRLF (a checkout with core.autocrlf)', (r) => edit(r, RULES, text((t) => t.replace(/\n/g, '\r\n'))), 1, 'FAIL'],
  ['the rules file removed, the record kept', (r) => {
    fs.rmSync(path.join(r, RULES));
    return null;
  }, 1, 'FAIL'],
  ['the rules changed and the record re-hashed in the same change (a limit of this check)', (r) => {
    const h = edit(r, RULES, text((t) => t.replace('min_outcomes_per_arm: 20', 'min_outcomes_per_arm: 19')));
    const before = JSON.parse(fs.readFileSync(path.join(r, RECORD), 'utf8'));
    const old = before.inputs.find((i) => i.path === RULES).sha256;
    edit(r, RECORD, text((t) => t.split(old).join(h)));
    return h;
  }, 0, 'ok'],
];

const results = [];
for (const [name, plant, wantStatus, wantVerdict] of SCENARIOS) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keepkill-tamper-'));
  try {
    for (const rel of COPY) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.cpSync(path.join(ROOT, rel), path.join(root, rel), { recursive: true, filter: (src) => KEEP(path.relative(ROOT, src).split(path.sep).join('/')) });
    }
    const planted = plant(root);
    const run = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-schema.mjs')], { cwd: root, encoding: 'utf8', timeout: 300000 });
    const line = (run.stdout.split('\n').find((l) => /^\s+(ok|FAIL|todo)\s+keep\/kill rules/.test(l)) ?? '').trim();
    const verdict = /^(ok|FAIL|todo)/.exec(line)?.[1] ?? 'none';
    const summary = (run.stdout.split('\n').find((l) => l.startsWith('GATE-schema:')) ?? '').trim();
    results.push({
      scenario: name,
      planted_rules_sha256: planted,
      exit_code: run.status,
      keepkill_line: line.split(root).join('<sandbox>'),
      gate_summary: summary.replace(/; [0-9.]+ s\)/, ')'),
      expected: { exit_code: wantStatus, keepkill: wantVerdict },
      as_expected: run.status === wantStatus && verdict === wantVerdict,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const ok = results.every((r) => r.as_expected);
console.log(JSON.stringify({ ok, rules_sha256: sha(fs.readFileSync(path.join(ROOT, RULES))), scenarios: results }, null, 2));
process.exit(ok ? 0 : 1);
