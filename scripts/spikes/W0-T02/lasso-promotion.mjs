// W0-T02: does a schema that another task drafted land in this pipeline unchanged?
//
// W0-S05 drafts lasso@1 in schemas/drafts/lasso.schema.json, outside the published set. This script promotes a
// copy of it in a scratch directory (it is moved to schemas/lasso.schema.json there), regenerates the TypeScript
// and Python types, runs GATE-schema, and checks the TLC trace that W0-S05 recorded for the Hold spec in both
// languages: both must accept it, and both must reject two tampered copies. Nothing in the repository changes.
//
//   node scripts/spikes/W0-T02/lasso-promotion.mjs
//
// It prints one JSON object and exits 1 if the draft does not land or the two languages disagree.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TRACE = 'research/evidence/a2r3/tla/live/Hold.trace.json';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-w0t02-lasso-'));
const report = {};
let failed = false;

try {
  for (const rel of ['schemas', 'packages/schema', 'bench/statespace/schema', 'scripts/verify-schema.mjs']) {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.cpSync(path.join(root, rel), path.join(scratch, rel), { recursive: true, filter: (src) => !/(^|\/)(__pycache__|node_modules|test)(\/|$)/.test(path.relative(root, src).split(path.sep).join('/')) });
  }
  fs.copyFileSync(path.join(scratch, 'schemas', 'drafts', 'lasso.schema.json'), path.join(scratch, 'schemas', 'lasso.schema.json'));

  const generated = spawnSync('node', [path.join(scratch, 'schemas', 'codegen', 'generate.mjs')], { encoding: 'utf8' });
  report.generate = { exit: generated.status, firstLine: generated.stdout.split('\n')[0].replace(scratch, '<sandbox>') };

  const gate = spawnSync('node', [path.join(scratch, 'scripts', 'verify-schema.mjs')], { encoding: 'utf8', cwd: scratch });
  const lines = gate.stdout.split('\n');
  report.gate = {
    exit: gate.status,
    summary: lines.find((l) => l.startsWith('GATE-schema:')),
    schemas: lines.find((l) => l.includes(' schemas:'))?.trim(),
    typesInSync: lines.find((l) => l.includes('types in sync'))?.trim().slice(0, 140),
    waiting: lines.filter((l) => l.includes('fixtures:') && l.includes('todo')).map((l) => l.trim()),
  };
  if (generated.status !== 0 || gate.status !== 0) failed = true;

  const trace = JSON.parse(fs.readFileSync(path.join(root, TRACE), 'utf8'));
  const short = structuredClone(trace);
  short.counterexample.action[0] = short.counterexample.action[0].slice(0, 2);
  const extra = structuredClone(trace);
  extra.counterexample.unexpected = 1;
  const variants = { recorded: trace, 'a step with one item too few': short, 'an unknown key': extra };

  // TypeScript: the package as generated in the scratch copy
  const pkg = await import(pathToFileURL(path.join(scratch, 'packages', 'schema', 'src', 'index.ts')).href);
  const ts = Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, pkg.validate('lasso', v).ok]));

  // Python: jsonschema through the package as generated in the scratch copy
  const script = `
import json, sys
sys.path.insert(0, sys.argv[1] + "/bench")
import statespace.schema as s
variants = json.load(sys.stdin)
print(json.dumps({k: not s.validate("lasso", v) for k, v in variants.items()}))
`;
  const python = spawnSync('uv', ['run', '--no-project', '--quiet', '--with', 'jsonschema==4.26.0', 'python', '-I', '-B', '-c', script, scratch], { input: JSON.stringify(variants), encoding: 'utf8' });
  const py = python.status === 0 ? JSON.parse(python.stdout) : { error: python.stderr.trim().slice(-300) };
  report.verdicts = Object.keys(variants).map((k) => ({ document: k, typescript: ts[k], python: py[k] }));
  report.trace = { path: TRACE, steps: trace.counterexample.action.length, states: trace.counterexample.state.length };
  const expected = { recorded: true, 'a step with one item too few': false, 'an unknown key': false };
  for (const [k, want] of Object.entries(expected)) if (ts[k] !== want || py[k] !== want) failed = true;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
