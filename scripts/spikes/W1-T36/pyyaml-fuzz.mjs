#!/usr/bin/env node
// Checks packages/content/src/yaml11.ts against PyYAML itself.
//
//   node scripts/spikes/W1-T36/pyyaml-fuzz.mjs
//
// GATE-schema reads a content file with PyYAML (YAML 1.1) and the content build reads it as YAML 1.2, so the build
// reports an unquoted scalar the two read differently (the `pyyaml` problem). This script is the evidence that the
// rule is right: it builds a corpus of unquoted scalars (hand-picked edge cases, then every string of up to four
// characters over digits, signs, dots, underscores, colons, spaces and the letters that start numbers and words),
// asks PyYAML 6.0.3 (the version GATE-schema pins) what each is, asks the build's YAML reader, and requires:
//   - no hole: whenever `divergence` says the readers agree, they do (a value and a type);
//   - the reading `pyyamlReading` names is the type PyYAML produced.
// It also counts the scalars `divergence` reports although the readers agree (a leading zero that happens to be
// the same number in octal and in decimal), which is the safe direction. Needs uv. Exit status 1 on a hole.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');

if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}

const { parseDocument } = await import('yaml');
const { divergence, pyyamlReading } = await import(pathToFileURL(join(ROOT, 'packages', 'content', 'src', 'yaml11.ts')).href);

const picked = ['yes', 'Yes', 'YES', 'no', 'No', 'NO', 'on', 'On', 'ON', 'off', 'Off', 'OFF', 'y', 'n', 'true', 'True', 'TRUE', 'tRue', 'false', 'False', 'FALSE', 'null', 'Null', 'NULL', 'nULL', '~', '', '0', '00', '07', '0777', '08', '0o17', '0b11', '0x1F', '-0x10', '+0x10', '1_000', '1__0', '12:30', '1:30:15', '1:30:15.5', '190:20:30', '1e3', '1E3', '1e+3', '1.0e+3', '1.5e-2', '1.5', '.5', '5.', '-.5', '.inf', '.Inf', '.INF', '-.inf', '+.inf', '.nan', '.NaN', '2026-10-25', '2026-1-5', '2026-10-25 10:30:00', '2026-10-25T10:30:00Z', '2026-10-25 10:30:00 +01:00', '<<', '=', 'S1', 'AUD-1.1', 'D-01', 'SEAM-7', 'LAB-1.2', 'R0', '1.2.3', '1.', '1.0', '-1', '+1', '0.0', '1,000', '0x', '0b', '12:60', '1:2', 'NaN', 'Inf', 'Infinity'];
const alphabet = ['0', '1', '7', '8', '9', '-', '+', '.', '_', ':', 'e', 'E', 'x', 'b', 'o', 'y', 'n', ' ', 'a'];
const corpus = new Set(picked);
const walk = (prefix, depth) => {
  if (depth === 0) return;
  for (const c of alphabet) {
    corpus.add(prefix + c);
    walk(prefix + c, depth - 1);
  }
};
walk('', 4);
const list = [...corpus].filter((s) => s === s.trim());

const dir = mkdtempSync(join(tmpdir(), 'pyyaml-fuzz-'));
try {
  writeFileSync(join(dir, 'corpus.json'), JSON.stringify(list));
  const py = spawnSync('uv', ['run', '--no-project', '--quiet', '--with', 'pyyaml==6.0.3', 'python', '-I', '-B', join(HERE, 'pyyaml-read.py'), join(dir, 'corpus.json')], { encoding: 'utf8', maxBuffer: 1 << 30 });
  if (py.status !== 0) {
    console.error(`pyyaml-fuzz: PyYAML could not be run (needs uv): ${(py.stderr || py.error?.message || '').trim().split('\n').slice(-3).join(' | ')}`);
    process.exit(2);
  }
  const readings = JSON.parse(py.stdout);
  const norm = (n) => (Number.isNaN(n) ? 'nan' : n === Infinity ? 'inf' : n === -Infinity ? '-inf' : n);
  let compared = 0;
  let flagged = 0;
  const holes = [];
  const over = [];
  const wrong = [];
  list.forEach((text, i) => {
    const p = readings[i];
    if (p === null) return; // PyYAML cannot read it, or it is not one scalar
    const doc = parseDocument(`x: ${text}\n`, { uniqueKeys: true, strict: true });
    if (doc.errors.length > 0) return;
    const node = doc.contents?.items?.[0]?.value;
    if (!node || node.type !== 'PLAIN') return;
    compared += 1;
    const value = doc.toJS().x;
    const [kind, pv] = p;
    const agree =
      kind === 'null' ? value === null : kind === 'bool' ? value === pv : kind === 'str' ? value === pv : kind === 'number' ? typeof value === 'number' && norm(value) === pv : false;
    const why = divergence(node.source, value);
    if (why !== null) flagged += 1;
    if (why === null && !agree) holes.push(`${JSON.stringify(text)}: PyYAML ${JSON.stringify(p)}, here ${JSON.stringify(value)}`);
    if (why !== null && agree) over.push(JSON.stringify(text));
    const reading = pyyamlReading(node.source);
    const named = kind === 'null' ? 'null' : kind === 'bool' ? 'bool' : kind === 'str' ? 'str' : kind === 'number' ? ['int', 'float'] : 'timestamp';
    if (!(Array.isArray(named) ? named.includes(reading) : named === reading)) wrong.push(`${JSON.stringify(text)}: named ${reading}, PyYAML made ${kind}`);
  });
  console.log(`pyyaml-fuzz: ${list.length} scalars, ${compared} read by both; ${flagged} reported; ${over.length} reported although the readers agree (leading zeros that name one number in octal and in decimal); ${holes.length} holes; ${wrong.length} wrong readings`);
  for (const h of holes.slice(0, 20)) console.log(`  hole: ${h}`);
  for (const w of wrong.slice(0, 20)) console.log(`  wrong: ${w}`);
  process.exit(holes.length === 0 && wrong.length === 0 ? 0 : 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
