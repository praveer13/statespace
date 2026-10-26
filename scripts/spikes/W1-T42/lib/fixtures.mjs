// Planted trees and stand-in engines for the self-checks and the tests of GATE-specimens and GATE-conformance (W1-T42).
// A stand-in engine does not run Z3: it answers from the program text, so that a gate can be shown to trip on a fault
// in milliseconds and with no network. The real engines are exercised by the gates themselves and by the integration
// tests (test/*.integration.test.mjs).

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { QUERIES } from './z3-corpus.mjs';

export const sha256Text = (text) => crypto.createHash('sha256').update(text).digest('hex');

export function scratchDir(prefix = 'w1t42-') {
  return fs.mkdtempSync(path.join(process.env.W1T42_SCRATCH ?? os.tmpdir(), prefix));
}

/** Call `fn` with the process's working directory set to `dir`, and set it back afterwards, however `fn` ends. */
export async function inDirectory(dir, fn) {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(before);
  }
}

/**
 * A scratch directory that this user cannot write to, as a read-only checkout is: `{ dir, dispose }`, where `dispose()`
 * puts the permissions back and removes it. Null when the user can write to it anyway (root can), because a test that
 * needs a read-only directory would then prove nothing.
 */
export function readOnlyScratchDir(prefix = 'w1t42-ro-') {
  const dir = scratchDir(prefix);
  fs.chmodSync(dir, 0o555);
  const dispose = () => {
    fs.chmodSync(dir, 0o755);
    fs.rmSync(dir, { recursive: true, force: true });
  };
  try {
    fs.writeFileSync(path.join(dir, 'probe'), '');
  } catch {
    return { dir, dispose };
  }
  dispose();
  return null;
}

/** Write { 'relative/path': text } under root. */
export function writeTree(root, files) {
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof text === 'string' ? text : `${JSON.stringify(text, null, 2)}\n`);
  }
  return root;
}

/** The registry a planted tree needs: the gates, the seams and some runs, in the shape of packages/ids/src/registry.json. */
export function miniRegistry(extraRuns = []) {
  const entry = (id, kind, extra = {}) => ({ id, kind, section: 'x', src: 'spine', ...extra });
  return {
    schema: 'statespace/id-registry@1',
    entries: [
      entry('GATE-interp', 'gate'),
      entry('GATE-conformance', 'gate'),
      entry('GATE-specimens', 'gate'),
      entry('SEAM-13', 'seam'),
      entry('SEAM-14', 'seam'),
      ...extraRuns.map((id) => entry(id, 'run', { status: 'to-record' })),
    ],
  };
}

export const REAL_CLAIMS = { 'GATE-conformance': ['SEAM-13'], 'GATE-interp': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] };

// ------------------------------------------------------------------ conformance: stand-in engines
/** A valid answer for each query of the corpus: the answers the real engines give. */
export const FAITHFUL = {
  'starter-overdraft': { verdict: 'sat', model: { a: '0', b: '0', amount: '1' } },
  'starter-guarded': { verdict: 'unsat' },
  'optimize-min': { verdict: 'sat', model: { a: '0', b: '0', amount: '1' } },
  'int-conservation-noguard': { verdict: 'unsat' },
  'bv64-sender-guarded': { verdict: 'unsat' },
  'bv64-recipient-wrap': { verdict: 'sat', model: { A: '9223372036854775806', B: '9223372036850581504', X: '4194304' } },
  'bv64-conservation': { verdict: 'unsat' },
  'bv64-unsigned-guard-signed-check': { verdict: 'sat', model: { A: '13835060254305419776', X: '4611686018427387904' } },
  'vacuous-premises': { verdict: 'unsat' },
  'unknown-pow': { verdict: 'unknown', reason: 'smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))' },
  'rlimit-cubes': { verdict: 'unknown', reason: 'canceled' },
};

/** What an engine prints for the corpus: one RESULT line per query. `edit(id, result)` may change or drop (null) a result. */
export function resultsText(edit = (id, r) => r, queries = QUERIES) {
  const lines = [];
  for (const q of queries) {
    const base = FAITHFUL[q.id];
    const r = edit(q.id, base ? JSON.parse(JSON.stringify(base)) : { verdict: q.expect.verdict });
    if (r !== null) lines.push(`RESULT ${JSON.stringify({ id: q.id, ...r })}`);
  }
  return `${lines.join('\n')}\n`;
}

const probe = (z3 = '5.3.1') => ({ z3, python: '3.13.12', platform: 'linux' });

/** An engine that prints a fixed text for any program. */
export function standInEngine(id, { text = resultsText(), z3 = '5.3.1', exitCode = 0, timedOut = false, stderr = '' } = {}) {
  return {
    id,
    probe: probe(z3),
    wheelSha256: null,
    describe: `stand-in ${id} (z3 ${z3})`,
    run: async () => ({ stdout: text, stderr, exitCode, timedOut, spawnError: null, truncated: false, durationMs: 5 }),
  };
}

// ------------------------------------------------------------------ specimens: stand-in engines and planted trees
/** An engine that "runs" a script by printing its lines that start with "#> ": the script is its own expected output. */
export function echoEngine(id, { z3 = '5.3.1' } = {}) {
  return {
    id,
    probe: probe(z3),
    wheelSha256: null,
    describe: `stand-in ${id} (z3 ${z3})`,
    run: async ({ file, source }) => {
      const text = source ?? fs.readFileSync(file, 'utf8');
      const out = text.split('\n').filter((l) => l.startsWith('#> ')).map((l) => l.slice(3));
      return { stdout: `${out.join('\n')}\n`, stderr: '', exitCode: 0, timedOut: false, spawnError: null, truncated: false, durationMs: 5 };
    },
  };
}

const SPINE_HEAD = ['# fixture spine', '', '| ID | Specimen | Lesson | Status |', '|---|---|---|---|'];

/**
 * A planted tree for GATE-specimens. Two stages: SP-1.1 (two runs on disk, one to record) and SP-1.2 (one run), and SP-2.1
 * (a run still to record). Options plant one fault each.
 */
export function specimenTree({ tamper = false, ghost = false, noRecipe = false, cabinet = null, claims = REAL_CLAIMS, version = '5.3.1', scriptChanged = false, missingScript = false } = {}) {
  const script = (name, lines) => `# ${name}\n${lines.map((l) => `#> ${l}`).join('\n')}\nprint("never run: the stand-in echoes the #> lines")\n`;
  const aText = script('a', ['[q1] sat (0.00s) [x = 1]', '[q2] unsat (0.00s) ']);
  const bText = script('b', ['[q3] unknown (0.01s) incomplete']);
  const cText = script('c', ['[q4] unsat']);
  const record = (id, task, scriptPath, sha, lines, extra = {}) => ({
    id,
    title: `fixture ${id}`,
    task,
    engine: 'z3',
    version,
    binary: 'fixture',
    binary_sha256: null,
    image: null,
    recorded_at: '2026-10-25T00:00:00Z',
    started_at: null,
    duration_s: null,
    argv: null,
    inputs: [{ path: scriptPath, sha256: sha, bytes: 1, role: 'script' }],
    budget: {},
    exit_code: null,
    verdict_lines: lines,
    outputs: [],
    environment: {},
    notes: [],
    ...extra,
  });
  const spineRows = [
    `| SP-1.1 | the first | S1.L1 | [X RUN-fx-a, RUN-fx-b]; later {{run:RUN-fx-later}} |`,
    `| SP-1.2 | the second | S1.L2 | [X ${ghost ? 'RUN-fx-ghost' : 'RUN-fx-c'}] |`,
    `| SP-2.1 | the third | S2.L1 | {{run:RUN-fx-later2}} |`,
  ];
  const files = {
    'docs/spine/SPINE.md': [...SPINE_HEAD, ...spineRows, ''].join('\n'),
    'packages/ids/src/registry.json': miniRegistry(['RUN-fx-later', 'RUN-fx-later2']),
    'runs/inputs/fx/a.py': scriptChanged ? `${aText}# a comment that changes the hash\n` : aText,
    'runs/inputs/fx/b.py': bText,
    ...(missingScript ? {} : { 'runs/inputs/fx/c.py': cText }),
    'runs/RUN-fx-a.json': record('RUN-fx-a', 'W1-T42', 'runs/inputs/fx/a.py', sha256Text(aText), ['# a header the harness printed', tamper ? '[q1] unsat (0.00s) [x = 1]' : '[q1] sat (0.00s) [x = 1]', '[q2] unsat (0.00s) ']),
    'runs/RUN-fx-b.json': record('RUN-fx-b', 'W1-T42', 'runs/inputs/fx/b.py', sha256Text(bText), ['[q3] unknown (0.02s) incomplete']),
    'runs/RUN-fx-c.json': noRecipe
      ? record('RUN-fx-c', 'W1-T42', 'runs/inputs/fx/c.py', sha256Text(cText), ['[q4] unsat'], { engine: 'lean' })
      : record('RUN-fx-c', 'W1-T42', 'runs/inputs/fx/c.py', sha256Text(cText), ['[q4] unsat']),
  };
  if (claims !== null) files['content/assurance/gate-claims.json'] = claims;
  if (cabinet) for (const [rel, doc] of Object.entries(cabinet)) files[`content/specimens/${rel}`] = doc;
  return files;
}

/** A planted tree for GATE-conformance: the registry, the claims, and stub pair scripts under scripts/conformance/. */
export function conformanceTree({ claims = REAL_CLAIMS, pairs = {} } = {}) {
  const files = { 'packages/ids/src/registry.json': miniRegistry() };
  if (claims !== null) files['content/assurance/gate-claims.json'] = claims;
  for (const [id, source] of Object.entries(pairs)) files[`scripts/conformance/${id}.mjs`] = source;
  return files;
}

/** A pair script that prints a report and exits as told. */
export const stubPair = (report, exitCode = 0, { text = false } = {}) =>
  text ? `console.log(${JSON.stringify(typeof report === 'string' ? report : 'a pair that prints text')}); process.exit(${exitCode});\n` : `console.log(JSON.stringify(${JSON.stringify(report)})); process.exit(${exitCode});\n`;
