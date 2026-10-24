#!/usr/bin/env node
// Record RUN-numbers-gate and RUN-runs-gate (W0-S11): each gate on this repository in the fast lane, in
// its release lane, and its planted-fault self-check, with outputs under runs/<RUN-id>/.
//
//   node scripts/runs/record-gates.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, fileRecord, hostEnvironment, normalizePaths, sha256, sha256File } from './registry.mjs';
import { listFiles } from './numbers-rules.mjs';

const node = process.execPath;
const nodeSha = sha256File(node);

function step(id, cfgId, args, purpose) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(node, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = normalizePaths(`${r.stdout}${r.stderr}`, { sandbox: [process.env.W0S11_SCRATCH].filter(Boolean) });
  const dir = path.join(REPO, 'runs', id);
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, `${cfgId}.log`);
  fs.writeFileSync(logFile, text);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const verdict = lines.filter((l) => /^GATE-|^ {2}(ok|FAIL|known|warn|read|pass)\b/.test(l)).slice(0, 60);
  return {
    id: cfgId,
    origin: 'recorded',
    purpose,
    started_at: started.toISOString(),
    duration_s,
    argv: ['node', ...args],
    exit_code: r.status,
    verdict_lines: verdict,
    outputs: [path.relative(REPO, logFile).split(path.sep).join('/')],
  };
}

/** A manifest hash over files: SHA-256 of the sorted lines "sha256  path". */
function manifest(files) {
  const lines = files.map((f) => `${sha256File(path.join(REPO, f))}  ${f}`).sort();
  return { sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), files: files.length };
}

function record(id, title, gate, steps, primary, extraInputs, notes) {
  const p = steps.find((s) => s.id === primary);
  const doc = {
    id,
    title,
    task: 'W0-S11',
    origin: 'recorded',
    engine: 'node',
    version: process.versions.node,
    binary: 'node (the host binary; no container)',
    binary_sha256: nodeSha,
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: steps[0].started_at,
    duration_s: Math.round(steps.reduce((s, x) => s + x.duration_s, 0) * 1000) / 1000,
    argv: p.argv,
    inputs: [...[gate, ...extraInputs].map((f) => fileRecord(REPO, f, { role: 'gate' })), ...[]],
    budget: { network: 'none used' },
    exit_code: p.exit_code,
    verdict_lines: p.verdict_lines,
    outputs: steps.map((s) => fileRecord(REPO, s.outputs[0], { kind: 'log' })),
    environment: { ...hostEnvironment(), node: process.version, container: null },
    primary_config: primary,
    configs: steps,
    notes,
  };
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`${id}: ${steps.map((s) => `${s.id} exit ${s.exit_code} (${s.duration_s} s)`).join(', ')}`);
  return doc;
}

// GATE-numbers
{
  const id = 'RUN-numbers-gate';
  const scanned = listFiles(REPO);
  const m = manifest(scanned);
  const steps = [
    step(id, 'fast', ['scripts/verify-numbers.mjs'], 'the fast lane on this repository'),
    step(id, 'self-check', ['scripts/verify-numbers.mjs', '--self-check'], 'plant faults one at a time in a scratch copy; the gate must fail on each and pass the controls'),
    step(id, 'strict', ['scripts/verify-numbers.mjs', '--strict'], 'the release lane: the known debt listed in numbers-baseline.json fails too'),
  ];
  const doc = record(id, 'GATE-numbers on this repository: the fast lane, the release lane and the planted-fault self-check', 'scripts/verify-numbers.mjs', steps, 'self-check', ['scripts/runs/numbers-rules.mjs', 'scripts/runs/numbers-deny-list.json', 'scripts/runs/numbers-baseline.json', 'scripts/runs/gate-self-check.mjs'], [
    `The fast lane read ${m.files} files; the input "." is their manifest hash (SHA-256 of the sorted "sha256  path" lines).`,
    'The self-check is the acceptance evidence that GATE-numbers trips on a planted untagged number (spine section 13, the W0 exit).',
  ]);
  doc.inputs.push({ path: '.', sha256: m.sha256, sha256_method: 'SHA-256 of the sorted "sha256  path" lines of the files the gate read', files: m.files, role: 'the documents and copy the gate read' });
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
}

// GATE-runs
{
  const id = 'RUN-runs-gate';
  const registry = fs.readdirSync(path.join(REPO, 'runs')).filter((f) => /^RUN-.*\.json$/.test(f) && f !== 'RUN-runs-gate.json').map((f) => `runs/${f}`);
  const m = manifest(registry);
  const steps = [
    step(id, 'fast', ['scripts/verify-runs.mjs'], 'the fast lane on this repository'),
    step(id, 'self-check', ['scripts/verify-runs.mjs', '--self-check'], 'plant faults one at a time in a scratch copy; the gate must fail on each and pass the controls'),
    step(id, 'release', ['scripts/verify-runs.mjs', '--release'], 'the release lane: every {{run:}} resolves, inputs unchanged, the index current'),
  ];
  const doc = record(id, 'GATE-runs on this repository: the fast lane, the release lane and the planted-fault self-check', 'scripts/verify-runs.mjs', steps, 'self-check', ['scripts/runs/registry.mjs', 'scripts/runs/gate-self-check.mjs', 'schemas/run.schema.json'], [
    `The registry held ${m.files} records besides this one; the input "runs/" is their manifest hash.`,
    'The self-check is the acceptance evidence that GATE-runs trips on an unresolved run reference (spine section 13, the W0 exit).',
    'The fast and release lanes report the tree as it was at recording, including findings that belong to tasks still recording their runs; the configurations name them in their logs.',
  ]);
  doc.inputs.push({ path: 'runs/', sha256: m.sha256, sha256_method: 'SHA-256 of the sorted "sha256  path" lines of the run records', files: m.files, role: 'the registry the gate read' });
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
}
