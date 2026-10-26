#!/usr/bin/env node
// W1-T16: record RUN-specimens-replay, the replay of the witnesses of SP-1.1, SP-1.4 and SP-1.5 in plain integers.
//
//   node scripts/spikes/W1-T16/record-replay.mjs record     run replay_witnesses.py and write runs/RUN-specimens-replay.json
//   node scripts/spikes/W1-T16/record-replay.mjs check      run it again and compare with the committed record
//
// The specimen label's stamp for a witness is REFUTED only once the witness replays (spine section 8.8). W1's own Z3
// runs print a replay line for every sat query; the three W0 runs behind SP-1.1, SP-1.4 and SP-1.5 do not, so this
// run gives their models the same evidence. It uses no solver. Needs Node 22 and uv.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, fileRecord, hostEnvironment, normalizePaths, sha256, sha256File } from '../../runs/registry.mjs';

const ID = 'RUN-specimens-replay';
const SCRIPT = 'scripts/spikes/W1-T16/replay_witnesses.py';
const SOURCES = [
  { path: 'runs/RUN-z3-starter.json', role: 'witness source: the model of SP-1.1, from its verdict line' },
  { path: 'runs/RUN-z3-bv64.json', role: 'witness source: the models of SP-1.4 and SP-1.5, from their verdict lines' },
  { path: 'runs/RUN-z3-bv64-pyodide.json', role: "witness source: the model Pyodide found for SP-1.4's related query, from its verdict line" },
];
const ARGV = ['uv', 'run', '--no-project', '--quiet', 'python', '-I', SCRIPT];
const WITNESSES = [
  { name: 'sp_1_1_starter', specimen: 'SP-1.1', source: 'RUN-z3-starter' },
  { name: 'sp_1_4_recipient_wrap', specimen: 'SP-1.4', source: 'RUN-z3-bv64' },
  { name: 'sp_1_4_pyodide_related_query', specimen: 'SP-1.4', source: 'RUN-z3-bv64-pyodide' },
  { name: 'sp_1_5_mixed_signedness', specimen: 'SP-1.5', source: 'RUN-z3-bv64' },
];

const mode = process.argv[2];
if (mode !== 'record' && mode !== 'check') {
  console.error('usage: record-replay.mjs record | check');
  process.exit(2);
}

const sh = (argv, options = {}) => spawnSync(argv[0], argv.slice(1), { cwd: REPO, encoding: 'utf8', ...options });

/** The interpreter uv ran, its version and the SHA-256 of its file. */
function interpreter() {
  const probe = sh(['uv', 'run', '--no-project', '--quiet', 'python', '-I', '-c', 'import sys, platform; print(sys.executable); print(platform.python_version()); print(platform.python_implementation())']);
  if (probe.status !== 0) throw new Error(`uv could not run python: ${probe.stderr}`);
  const [exe, version, implementation] = probe.stdout.trim().split('\n');
  return { version, implementation, sha256: sha256File(fs.realpathSync(exe)) };
}

function execute() {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = sh(ARGV);
  const duration_s = Number(process.hrtime.bigint() - t0) / 1e9;
  const out = normalizePaths(r.stdout);
  if (r.stderr.trim() !== '') console.error(r.stderr.trim());
  return { out, exit: r.status, started, duration_s };
}

const linesOf = (out) => out.split('\n').filter((l) => l !== '');
const parsed = (lines) =>
  WITNESSES.map((w) => {
    const line = lines.find((l) => l.startsWith(`[${w.name}] `));
    const values = {};
    if (line) for (const m of line.matchAll(/\b([A-Za-z]+)=(-?[0-9]+)\b/g)) if (!(m[1] in values)) values[m[1]] = m[2];
    return { ...w, line, ok: line !== undefined && line.startsWith(`[${w.name}] replay ok: `), values };
  });

function record() {
  const run = execute();
  const lines = linesOf(run.out);
  const results = parsed(lines);
  const py = interpreter();
  const logPath = `runs/${ID}/replay.log`;
  fs.mkdirSync(path.join(REPO, 'runs', ID), { recursive: true });
  fs.writeFileSync(path.join(REPO, logPath), run.out);
  const checks = results.map((r) => ({ id: r.name, pass: r.ok, specimen: r.specimen, witness_from: r.source }));
  const env = hostEnvironment();
  const doc = {
    id: ID,
    title: 'The witnesses of SP-1.1, SP-1.4 and SP-1.5 replay in plain integers: each satisfies the premises of its query and violates the property',
    task: 'W1-T16',
    origin: 'recorded',
    records: 'SP-1.1, SP-1.4 and SP-1.5: the model each W0 Z3 run printed (RUN-z3-starter, RUN-z3-bv64, RUN-z3-bv64-pyodide), read from that run record\'s verdict lines, checked against the premises and the violated property of the query that produced it, in Python integers with two\'s complement for 64 bits; no solver',
    engine: 'python',
    version: py.version,
    version_string: `${py.implementation} ${py.version}`,
    binary: `${py.implementation} ${py.version}, the interpreter uv ran (the file is hashed)`,
    binary_sha256: py.sha256,
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: run.started.toISOString(),
    duration_s: Math.round(run.duration_s * 1000) / 1000,
    argv: ARGV,
    inputs: [fileRecord(REPO, SCRIPT, { role: 'script' }), ...SOURCES.map((s) => fileRecord(REPO, s.path, { role: s.role }))],
    budget: {},
    exit_code: run.exit,
    verdict_lines: lines,
    outputs: [fileRecord(REPO, logPath, { kind: 'log' })],
    values: { replays: Object.fromEntries(results.map((r) => [r.name, { specimen: r.specimen, witness_from: r.source, replays: r.ok, witness: r.values }])) },
    environment: { ...env, python: `${py.implementation} ${py.version}`, uv: sh(['uv', '--version']).stdout.trim() },
    checks,
    pass: checks.every((c) => c.pass) && run.exit === 0,
    notes: [
      'A replay is not a re-execution of Z3. GATE-specimens re-executes the Z3 queries behind SP-1.1, SP-1.4 and SP-1.5 from their own records (RUN-z3-starter, RUN-z3-bv64); this record adds the check those two runs never printed: that each model, as the run printed it, satisfies the premises and violates the property.',
      'The premises and the property are those of the Z3 query that printed the model (research/evidence/a2r3/scripts/z3_claims.py, sections 1 and 4, and research/evidence/A5r3/scripts/z3unk.mjs for the Pyodide query), written again in plain integers in scripts/spikes/W1-T16/replay_witnesses.py; a 64-bit value is read as the signed or the unsigned integer the query compares it as.',
      'Each witness is read from the verdict lines of the run record that holds it (the three inputs of role witness source), so the model replayed is the model the specimen label prints; the label builder compares the values on each replay line with the label\'s witness.',
    ],
  };
  const text = `${JSON.stringify(doc, null, 2)}\n`;
  fs.writeFileSync(path.join(REPO, 'runs', `${ID}.json`), text);
  console.log(`${ID}: ${results.filter((r) => r.ok).length} of ${results.length} witnesses replay; wrote runs/${ID}.json (${sha256(text).slice(0, 12)})`);
  if (!doc.pass) process.exit(1);
}

function check() {
  const file = path.join(REPO, 'runs', `${ID}.json`);
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const run = execute();
  const lines = linesOf(run.out);
  const problems = [];
  if (run.exit !== 0) problems.push(`the script exits ${run.exit}`);
  if (JSON.stringify(lines) !== JSON.stringify(doc.verdict_lines)) problems.push('the script prints other lines than the record holds');
  for (const input of doc.inputs) if (sha256File(path.join(REPO, input.path)) !== input.sha256) problems.push(`input ${input.path} changed since the run`);
  for (const o of doc.outputs) if (sha256File(path.join(REPO, o.path)) !== o.sha256) problems.push(`output ${o.path} changed`);
  for (const w of parsed(lines)) if (!w.ok) problems.push(`${w.name} does not replay`);
  if (problems.length > 0) {
    console.error(`${ID}: ${problems.join('; ')}`);
    process.exit(1);
  }
  console.log(`${ID}: the record equals a fresh run (${lines.length} lines, ${doc.inputs.length} inputs)`);
}

if (mode === 'record') record();
else check();
