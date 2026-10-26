#!/usr/bin/env node
// GATE-conformance's pair "Pyodide Z3 = native Z3, on every authored cell and generator template" (ARCHITECTURE.md
// section 13.3; spine section 11.2; W1-T37), and the Z3 engine port that GATE-generators borrows.
//
// As a pair script (scripts/verify-conformance.mjs runs it in the nightly lane):
//
//   node scripts/conformance/z3-pyodide-native.mjs --json        from the root of the tree
//   stdout   one JSON object { "pair": "z3-pyodide-native", "ok": true|false, "compared": n, "equal": n,
//            "differences": [ { "fixture", "expected", "got", "detail" } ], "notes": [...] }
//   exit     0 the pair holds, 1 it differs, 2 it could not run (an engine that cannot be set up, a usage error such
//            as a --root that names no directory)
//   --root DIR    the tree to read; --seeds N    seeds per live template and band (default 8); without --json, text
//
// What it compares, on the same input to both engines (verdicts exact; witnesses never compared by value, each checked
// against its own query by Z3's evaluation on its own engine [X RUN-z3-bv64-pyodide], a quantifier the evaluation
// leaves unreduced settled by a fresh solver under the model, and one it cannot settle left to GATE-calls' cvc5):
//   authored cells       every Z3 cell of every lesson and drawer, through GATE-calls' reader and judge in its pair
//                        mode: the same checks, verdicts, reasons for unknown and optima, a valid witness on each engine,
//                        and the call's key reproduced on both (cvc5 is GATE-calls' business, in the fast lane)
//   generator templates  every live template of every family that consults z3, keyed at N seeds per band through a
//                        port that sends each request to both engines and records any difference
// Every run also plants disagreements in a cell's reply (a verdict flipped, and a decided check turned unknown on
// either engine) and in a port request, and the S1 authored cells as controls (scripts/spikes/W1-T37/fixtures/s1/); the
// pair fails unless the plants are caught and the controls agree.
//
// As a port provider: `createPorts()` returns `{ z3: EnginePort }` over Pyodide's Z3 under Node, the tab's engine, in
// the shapes of packages/generators/src/core/port.ts; scripts/spikes/W1-T37/lib/port.mjs documents the request and the
// reply. GATE-generators (scripts/verify-generators.mjs) loads this module by default when a family needs z3. Importing
// the module starts nothing; the engine starts on the first request and holds no reference on the event loop while
// idle, so the borrowing process exits when its own work is done.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.join(HERE, '..', 'spikes', 'W1-T37', 'lib');
const lib = (name) => import(pathToFileURL(path.join(LIB, name)).href);

export const PAIR = 'z3-pyodide-native';
export const DEFAULT_SEEDS = 8;

// ------------------------------------------------------------------ the port provider
let shared = null;

/** `{ z3: EnginePort }` over Pyodide's Z3 under Node, started on its first request (GATE-generators' provider protocol). */
export async function createPorts(options = {}) {
  const { createZ3Engines } = await lib('engines.mjs');
  const { enginePort } = await lib('port.mjs');
  if (!shared || options.fresh) shared = createZ3Engines(options);
  const engines = shared;
  return { z3: enginePort(() => engines.pyodide()) };
}

// ------------------------------------------------------------------ the pair
function parseArgs(argv) {
  const o = { json: false, root: null, seeds: DEFAULT_SEEDS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--json') o.json = true;
    else if (a === '--root') {
      o.root = path.resolve(value());
      // a tree that is not there would read as a tree with no cells, and hold
      if (!fs.statSync(o.root, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`--root names no directory: ${argv[i]}`);
    } else if (a === '--seeds') {
      o.seeds = Number(value());
      if (!Number.isInteger(o.seeds) || o.seeds < 1) throw new Error('--seeds needs a positive integer');
    } else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

/** A port that routes z3 to `z3port` and every other engine to the family's own ports. */
const composite = (z3port, own = {}) => ({
  run(req) {
    if (req?.engine === 'z3') return z3port.run(req);
    const port = own[req?.engine];
    if (port) return port.run(req);
    return Promise.reject(Object.assign(new Error(`unknown-engine: no port for ${req?.engine}`), { code: 'unknown-engine' }));
  },
});

/** Key every live z3 template of every family at `seeds` seeds per band through a port over both engines. */
async function pairTemplates({ root, engines, seeds, notes }) {
  const { pairPort } = await lib('port.mjs');
  const repo = (await lib('engines.mjs')).REPO;
  const gate = await import(pathToFileURL(path.join(repo, 'scripts', 'verify-generators.mjs')).href);
  const core = await import(pathToFileURL(path.join(repo, 'packages', 'generators', 'src', 'core', 'index.ts')).href);
  const z3families = (await gate.loadFamilies(root)).filter((f) => f.generator && (f.generator.engines ?? []).includes('z3'));
  // A family that also consults an engine neither the pair nor the family itself runs is GATE-generators' to key.
  const runnable = (f) => (f.generator.engines ?? []).every((e) => e === 'z3' || e in (f.ports ?? {}));
  const families = z3families.filter(runnable);
  for (const f of z3families.filter((x) => !runnable(x))) notes.push(`generator templates: ${f.generator.id} also consults ${(f.generator.engines ?? []).filter((e) => e !== 'z3' && !(e in (f.ports ?? {}))).join(', ')}, which the pair does not run; GATE-generators keys it`);
  const differences = [];
  let label = '';
  const port = pairPort(() => engines.native(), () => engines.pyodide(), () => label);
  let templates = 0;
  for (const f of families) {
    const gen = f.generator;
    for (const t of core.liveTemplates(gen)) {
      templates += 1;
      for (const band of core.BANDS) {
        for (const seed of core.seedSequence(1, seeds)) {
          label = `${gen.id}/${t.id}/b${band}/${core.formatSeed(seed)}`;
          try {
            await core.drawInstance(gen, composite(port, f.ports), { seed, band, template: t.id, maxDraws: 4 });
          } catch (e) {
            differences.push({ fixture: label, expected: 'the instance keyed on both engines', got: `${e?.code ?? 'error'}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300), detail: 'the family could not be keyed through the pair' });
          }
        }
      }
    }
  }
  if (z3families.length === 0) notes.push('generator templates: no family consults z3 yet (the Z3 families land with W1-T22 to W1-T26), so none was compared');
  else notes.push(`generator templates: ${templates} live template(s) of ${families.length} famil${families.length === 1 ? 'y' : 'ies'} keyed at ${seeds} seed(s) per band: ${port.compared} request(s) sent to both engines`);
  return { compared: port.compared, differences: [...port.differences, ...differences] };
}

/** The pair's own plants: a disagreement in a cell's reply and in a port request must be caught; the S1 cells agree. */
async function plants({ engines, fixtureCells, replies, judge }) {
  const out = [];
  const control = judge.judgeCells({ cells: fixtureCells, replies, mode: 'pair' });
  out.push({ name: 'the S1 authored cells (fixtures/s1) agree on both engines', pass: control.findings.length === 0 && control.counts.calls === 12, detail: control.findings.map((f) => `${f.ref} ${f.check}: ${f.detail}`).join(' | ') || `${control.counts.cells} cells, ${control.counts.calls} calls` });
  const target = fixtureCells.find((c) => c.call && c.lang === 'python');
  const lied = { native: new Map(replies.native), pyodide: new Map(replies.pyodide) };
  const flipped = JSON.parse(JSON.stringify(replies.pyodide.get(target.ref)));
  flipped.checks[0].verdict = flipped.checks[0].verdict === 'sat' ? 'unsat' : 'sat';
  lied.pyodide.set(target.ref, flipped);
  const caught = judge.judgeCells({ cells: [target], replies: lied, mode: 'pair' }).findings.some((f) => f.check === 'divergence');
  out.push({ name: `a verdict flipped in Pyodide's reply to ${target.ref} is caught`, pass: caught, detail: caught ? 'caught' : 'NOT caught' });
  // unknown is a verdict too: a decided check that Pyodide's reply turns unknown, and one that native's does
  const decided = fixtureCells.find((c) => c.lang === 'python' && ['sat', 'unsat'].includes(replies.native.get(c.ref)?.checks?.[0]?.verdict));
  for (const side of ['pyodide', 'native']) {
    const told = { native: new Map(replies.native), pyodide: new Map(replies.pyodide) };
    const turned = JSON.parse(JSON.stringify(replies[side].get(decided.ref)));
    Object.assign(turned.checks[0], { verdict: 'unknown', reason: 'canceled' });
    told[side].set(decided.ref, turned);
    const seen = judge.judgeCells({ cells: [decided], replies: told, mode: 'pair' }).findings.some((f) => f.check === 'divergence');
    out.push({ name: `a decided check turned unknown in ${side === 'native' ? "native's" : "Pyodide's"} reply to ${decided.ref} is caught`, pass: seen, detail: seen ? 'caught' : 'NOT caught' });
  }
  const { pairPort } = await lib('port.mjs');
  const pyodide = await engines.pyodide();
  const liar = { ...pyodide, server: { call: async (req, opts) => ({ ...(await pyodide.server.call(req, opts)), verdict: 'unsat' }) } };
  const port = pairPort(() => engines.native(), () => Promise.resolve(liar), () => 'planted request');
  await port.run({ engine: 'z3', version: '5.3.1', input: { smtlib: '(declare-const a Int)\n(assert (> a 0))' }, budget: { wallMs: 30000, rlimit: 5000000 } });
  const portCaught = port.differences.length > 0;
  out.push({ name: 'a request Pyodide answers unsat and native sat is caught by the pair port', pass: portCaught, detail: portCaught ? 'caught' : 'NOT caught' });
  return out;
}

export async function runPair(o) {
  const { collectCells } = await lib('cells.mjs');
  const { createZ3Engines, EngineUnavailable, REPO } = await lib('engines.mjs');
  const judge = await lib('judge.mjs');
  const { runCells } = await lib('run.mjs');
  const { S1_FIXTURES } = await lib('planted.mjs');
  const root = o.root ?? REPO;
  const notes = [];
  const engines = createZ3Engines();
  try {
    const content = await collectCells(root);
    const fixtures = await collectCells(S1_FIXTURES, { prefix: 'fixture:' });
    const z3cells = content.cells.filter((c) => c.instrument?.engine === 'z3');
    let run;
    try {
      run = await runCells({ engines, cells: [...z3cells, ...fixtures.cells] });
    } catch (e) {
      if (e instanceof EngineUnavailable) return { exit: 2, error: e.message };
      throw e;
    }
    notes.push(`engines: ${run.describe.native}; ${run.describe.pyodide}`);
    const judged = judge.judgeCells({ cells: z3cells, replies: run.replies, mode: 'pair' });
    const differences = [
      ...judge.pageFindings(content.problems).map((f) => ({ fixture: f.ref, expected: 'a page whose cells can be read', got: f.detail, detail: f.check })),
      ...judge.judgeEngines(run.probes).map((f) => ({ fixture: f.ref, expected: 'the pinned engine', got: f.detail, detail: f.check })),
      ...judged.findings.map((f) => ({ fixture: f.ref, expected: judge.CHECKS[f.check] ? `not: ${judge.CHECKS[f.check]}` : 'agreement', got: f.detail, detail: f.check })),
    ];
    const cellsEqual = judged.rows.filter((r) => r.status === 'ok' || r.status === 'not-run').length;
    notes.push(`authored cells: ${judged.counts.cells} Z3 cell(s) in ${content.pages.length} page(s), ${judged.counts.calls} call(s)`);
    let templates;
    try {
      templates = await pairTemplates({ root, engines, seeds: o.seeds, notes });
    } catch (e) {
      if (e instanceof EngineUnavailable) return { exit: 2, error: e.message };
      throw e;
    }
    differences.push(...templates.differences);
    const planted = await plants({ engines, fixtureCells: fixtures.cells, replies: run.replies, judge });
    for (const p of planted) {
      notes.push(`${p.pass ? 'held' : 'FAILED'}: ${p.name} (${p.detail})`);
      if (!p.pass) differences.push({ fixture: 'planted', expected: p.name, got: p.detail, detail: 'a planted fixture of the pair did not hold' });
    }
    const compared = judged.counts.cells + templates.compared;
    const templateDiffs = new Set(templates.differences.map((d) => d.fixture)).size;
    const equal = cellsEqual + Math.max(0, templates.compared - templateDiffs);
    const ok = differences.length === 0;
    return { exit: ok ? 0 : 1, report: { pair: PAIR, ok, compared, equal, differences, notes } };
  } finally {
    await engines.close();
  }
}

export async function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${PAIR}: ${e.message}\nusage: node scripts/conformance/z3-pyodide-native.mjs [--json] [--root DIR] [--seeds N]\n`);
    return 2;
  }
  let result;
  try {
    result = await runPair(o);
  } catch (e) {
    process.stderr.write(`${PAIR}: could not run: ${e instanceof Error ? e.stack : String(e)}\n`);
    return 2;
  }
  if (result.exit === 2) {
    if (o.json) process.stdout.write(`${JSON.stringify({ pair: PAIR, ok: false, compared: 0, equal: 0, differences: [], notes: [`could not run: ${result.error}`] })}\n`);
    process.stderr.write(`${PAIR}: an engine could not be set up: ${result.error}\n`);
    return 2;
  }
  const r = result.report;
  if (o.json) process.stdout.write(`${JSON.stringify(r)}\n`);
  else {
    for (const n of r.notes) process.stdout.write(`  ${n}\n`);
    for (const d of r.differences) process.stdout.write(`  DIFFERS ${d.fixture}: ${d.got} (${d.detail})\n`);
    process.stdout.write(`${PAIR}: ${r.ok ? 'holds' : 'differs'} (${r.equal} of ${r.compared} equal)\n`);
  }
  return result.exit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // A reader that stops early (| head) closes the pipe; the gate still finishes and exits with its own status.
  process.stdout.on('error', (e) => {
    if (e.code !== 'EPIPE') throw e;
  });
  process.exitCode = await main(process.argv.slice(2));
}
