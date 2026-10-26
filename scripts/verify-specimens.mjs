#!/usr/bin/env node
// GATE-specimens (spine section 11.2; ARCHITECTURE.md sections 13.2 and 13.4; W1-T42). Nightly.
//
// Every specimen reproduces: the run record behind it is re-executed from the record, on the engine it names, and
// every verdict line it states comes back. A specimen's label is generated from its run (DESIGN.md 6.5), so a run
// that no longer reproduces makes the label false; a red night then marks the claims this gate backs "unverified
// since <date>" (content/assurance/gate-claims.json: GATE-specimens backs SEAM-14).
//
//   node scripts/verify-specimens.mjs                 the nightly lane
//   node scripts/verify-specimens.mjs --list          the specimens with the runs behind each, and run nothing
//   node scripts/verify-specimens.mjs --only SP-1.1,SP-1.4   re-execute only the runs behind these specimens
//   node scripts/verify-specimens.mjs --strict        a run that is pending, or that no recipe re-executes, fails too
//   node scripts/verify-specimens.mjs --json          print the report as JSON
//   node scripts/verify-specimens.mjs --root DIR      check the tree under DIR (the fixtures use this)
//   node scripts/verify-specimens.mjs --self-check    plant faults in a scratch tree; the gate must fail on each
//
// The catalog is the table of spine section 5.1, which names the runs behind each specimen: `[X RUN-id]` for a run
// on disk and `{{run:RUN-id}}` for one still to record. The cabinet (content/specimens/, W1-T16) adds the specimens
// as mounted: a record is found by the name of its file (SP-1.4.json, SP-1.4.yaml) or by an `id` field, and every
// RUN-id in it is a run it cites. A specimen's status is
//   reproduced     at least one of its runs was re-executed and every re-executed run matched its record
//   diverged       a re-executed run came back with other lines, or could not be re-executed (an error)
//   missing        the spine cites [X RUN-id] and runs/RUN-id.json is not there
//   recorded-only  it has runs on disk and no recipe re-executes any of them yet (reason printed per run)
//   pending        every run behind it is still to record
// The gate fails on diverged and missing. It also fails on:
//   mounting   once any specimen of a stage is mounted in the cabinet, every specimen of that stage must be, each
//              citing the runs the spine names ("SP-1.1 to SP-1.10 mounted with run ids", W1-T16); a record with no
//              specimen, or one the spine does not list; a cabinet run that is neither on disk nor registered
//   claims     content/assurance/gate-claims.json missing, malformed, naming an unregistered gate or claim, or
//              not backing what the spine names (scripts/spikes/W1-T42/lib/gate-claims.mjs)
// `--strict` (a release check) fails on recorded-only and pending as well. Exit 0 green, 1 findings, 2 the gate could
// not run (an engine could not be set up: a missing tool is never a green night).
//
// How a run is re-executed, and what "comes back" means: scripts/spikes/W1-T42/lib/reproduce.mjs. The engines, with
// the SHA-256 pins they are fetched against: scripts/spikes/W1-T42/lib/engines.mjs. Later tasks add rows: the
// PostgreSQL specimens through `statespace isorun` (W4-T02), Lean and TLC as their stages ship.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EngineUnavailable, REPO, createEngines } from './spikes/W1-T42/lib/engines.mjs';
import { loadGateClaims } from './spikes/W1-T42/lib/gate-claims.mjs';
import { reproduceRun } from './spikes/W1-T42/lib/reproduce.mjs';
import { SPECIMEN_ID, readCabinet, readRuns, readSpineSpecimens } from './spikes/W1-T42/lib/specimens.mjs';

const GATE = 'GATE-specimens';
const SCRIPT = fileURLToPath(import.meta.url);

/** Paths of this machine never enter the output: the tree is <repo>, the engine cache <cache>. */
const scrubber = (root, cacheDir) => (text) => {
  let t = String(text);
  for (const [from, to] of [[cacheDir, '<cache>'], [root, '<repo>'], [REPO, '<repo>']]) if (from && from.length > 1) t = t.split(from).join(to);
  return t.replace(/(?<![\w.~-])\/(?:home|Users)\/[A-Za-z0-9._-]+/g, '<home>').replace(/(?<![\w.~-])\/tmp\/claude-[\w.-]*/g, '<tmp>');
};

function parseArgs(argv) {
  const opts = { flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--list', '--strict', '--json', '--self-check', '--help', '-h'].includes(a)) opts.flags.add(a === '-h' ? '--help' : a);
    else if (['--only', '--root'].includes(a)) {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      opts.values[a] = argv[++i];
    } else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

const statusOf = (runs) => {
  if (runs.some((r) => r.state === 'diverged' || r.state === 'error')) return 'diverged';
  if (runs.some((r) => r.state === 'missing')) return 'missing';
  if (runs.some((r) => r.state === 'reproduced')) return 'reproduced';
  if (runs.some((r) => r.state === 'recorded-only')) return 'recorded-only';
  return 'pending';
};

/**
 * The gate. `deps` replaces the engines and the output (tests and the self-check).
 * @returns {Promise<number>} the exit status
 */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const say = (s) => (deps.out ?? ((x) => process.stdout.write(`${x}\n`)))(s);
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${GATE}: ${e.message}\n`);
    return 2;
  }
  if (opts.flags.has('--help')) {
    for (const l of fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1)) {
      if (!l.startsWith('//')) break;
      say(l.replace(/^\/\/ ?/, ''));
    }
    return 0;
  }
  if (opts.flags.has('--self-check')) {
    const { selfCheckSpecimens } = await import(pathToFileURL(path.join(path.dirname(SCRIPT), 'spikes', 'W1-T42', 'lib', 'self-check.mjs')).href);
    return selfCheckSpecimens({ say });
  }

  const started = Date.now();
  const root = path.resolve(opts.values['--root'] ?? REPO);
  const strict = opts.flags.has('--strict');
  const asJson = opts.flags.has('--json');
  const engines = deps.engines ?? createEngines({ env });
  const scrub = scrubber(root, engines.cacheDir);
  const findings = [];
  const warnings = [];
  const fail = (check, where, detail) => findings.push({ check, where, detail: scrub(detail) });
  const warn = (check, where, detail) => warnings.push({ check, where, detail: scrub(detail) });
  const progress = asJson ? () => {} : say;

  // ---------------------------------------------------------------- the catalog
  const spine = readSpineSpecimens(root);
  for (const p of spine.problems) fail('catalog', 'docs/spine/SPINE.md', p);
  const { records, status: registered } = readRuns(root);
  const cabinet = readCabinet(root);
  const claims = loadGateClaims(root);
  for (const p of claims.problems) fail('claims', claims.file, p);

  const only = opts.values['--only'] ? new Set(opts.values['--only'].split(',').map((s) => s.trim()).filter(Boolean)) : null;
  if (only) for (const id of only) if (!spine.specimens.some((s) => s.id === id)) fail('catalog', id, `${id} is not a specimen of the spine's table`);

  // The cabinet: the specimens as mounted.
  const mounted = new Map();
  for (const rec of cabinet.records) {
    if (!rec.id) {
      fail('mounting', rec.file, 'cannot tell which specimen this record mounts (name the file SP-n.m.json or give the record an id)');
      continue;
    }
    if (!spine.specimens.some((s) => s.id === rec.id)) {
      fail('mounting', rec.file, `${rec.id} is not a specimen of the spine's table`);
      continue;
    }
    if (mounted.has(rec.id)) fail('mounting', rec.file, `${rec.id} is mounted twice (also in ${mounted.get(rec.id).file})`);
    else mounted.set(rec.id, rec);
  }
  const mountedStages = new Set([...mounted.keys()].map((id) => `S${SPECIMEN_ID.exec(id)[1]}`));
  for (const s of spine.specimens) {
    if (!mountedStages.has(s.stage)) continue;
    const rec = mounted.get(s.id);
    if (!rec) {
      fail('mounting', s.id, `${s.id} is not mounted, though other specimens of ${s.stage} are (every specimen of a stage mounts with its run ids)`);
      continue;
    }
    for (const run of [...s.executed, ...s.pending]) if (!rec.runs.includes(run)) fail('mounting', s.id, `${rec.file} does not cite ${run}, which the spine names behind ${s.id}`);
  }

  // The runs behind each specimen, from the spine and the cabinet.
  const runIds = new Set();
  const plan = spine.specimens.map((s) => {
    const cited = mounted.get(s.id)?.runs ?? [];
    const ids = [...new Set([...s.executed, ...s.pending, ...cited])];
    for (const id of ids) runIds.add(id);
    return { ...s, ids, cited };
  });
  const state = new Map();
  for (const id of runIds) {
    const rec = records.get(id);
    if (rec && !rec.error) continue;
    if (rec?.error) {
      state.set(id, { id, state: 'error', detail: `runs/${id}.json does not parse: ${rec.error}`, recipe: null, notes: [] });
      continue;
    }
    const claimedExecuted = spine.specimens.some((s) => s.executed.includes(id));
    const cabinetOnly = !spine.specimens.some((s) => s.executed.includes(id) || s.pending.includes(id));
    if (claimedExecuted) state.set(id, { id, state: 'missing', detail: `the spine cites [X ${id}] and runs/${id}.json is not on disk`, recipe: null, notes: [] });
    else if (cabinetOnly && !registered.has(id)) state.set(id, { id, state: 'missing', detail: `a cabinet record cites ${id}, which is neither on disk nor a run the spine registers`, recipe: null, notes: [] });
    else state.set(id, { id, state: 'pending', detail: 'not recorded yet', recipe: null, notes: [] });
  }

  if (opts.flags.has('--list')) {
    for (const s of plan) {
      const marks = s.ids.map((id) => `${id}${state.get(id)?.state === 'pending' ? ' (to record)' : state.get(id)?.state === 'missing' ? ' (MISSING)' : ''}`);
      say(`${s.id.padEnd(8)} ${(s.lesson ?? '').padEnd(7)} ${mounted.has(s.id) ? 'mounted ' : '        '} ${marks.join(', ') || 'no run named'}`);
    }
    say(`${GATE}: ${plan.length} specimens, ${runIds.size} runs (nothing was re-executed)`);
    return 0;
  }

  // ---------------------------------------------------------------- re-execute
  const wanted = plan.filter((s) => !only || only.has(s.id));
  const toRun = [...new Set(wanted.flatMap((s) => s.ids))].filter((id) => !state.has(id));
  if (!asJson) {
    say(GATE);
    say(`  catalog  ${plan.length} specimens in the spine's table; ${runIds.size} runs behind them, ${toRun.length} on disk to re-execute${only ? ` (--only ${[...only].join(', ')})` : ''}; the cabinet ${cabinet.present ? `holds ${cabinet.records.length} record${cabinet.records.length === 1 ? '' : 's'}` : 'is not there yet (content/specimens/, W1-T16)'}`);
  }
  const memo = new Map();
  const used = new Map();
  const tracked = {
    cacheDir: engines.cacheDir,
    native: async () => used.get('native') ?? used.set('native', await engines.native()).get('native'),
    pyodide: async () => used.get('pyodide') ?? used.set('pyodide', await engines.pyodide()).get('pyodide'),
  };
  try {
    for (const id of toRun) {
      const t0 = Date.now();
      const r = await reproduceRun(id, records.get(id).doc, { root, engines: tracked, memo });
      state.set(id, { id, ...r, detail: scrub(r.detail), notes: r.notes.map(scrub) });
      progress(`  run      ${id.padEnd(34)} ${r.state.padEnd(13)} ${r.recipe ?? '-'}${r.recipe ? ` (${((Date.now() - t0) / 1000).toFixed(1)} s)` : ''}`);
    }
  } catch (e) {
    if (e instanceof EngineUnavailable) {
      say(`${GATE}: ERROR (cannot run: ${scrub(e.message)})`);
      return 2;
    }
    throw e;
  }

  // ---------------------------------------------------------------- judge
  const specimens = wanted.map((s) => {
    const runs = s.ids.map((id) => state.get(id) ?? { id, state: 'pending', detail: 'not re-executed (--only)', recipe: null, notes: [] });
    return { id: s.id, stage: s.stage, lesson: s.lesson, mounted: mounted.has(s.id), status: statusOf(runs), runs };
  });
  for (const s of specimens) {
    for (const r of s.runs) {
      if (r.state === 'diverged' || r.state === 'error' || r.state === 'missing') fail('specimen', `${s.id} ${r.id}`, `${r.state}: ${r.detail}`);
      else if (strict && (r.state === 'pending' || r.state === 'recorded-only')) fail('strict', `${s.id} ${r.id}`, `${r.state}: ${r.detail}`);
      for (const n of r.notes ?? []) warn('note', `${s.id} ${r.id}`, n);
    }
    if (s.runs.length === 0) (strict ? fail : warn)('pending', s.id, 'the spine names no run behind this specimen');
  }

  const counts = { specimens: specimens.length, reproduced: 0, diverged: 0, missing: 0, 'recorded-only': 0, pending: 0 };
  for (const s of specimens) counts[s.status] += 1;
  const runCounts = { runs: 0, reproduced: 0, 'recorded-only': 0, pending: 0, 'not reproduced': 0 };
  for (const r of new Map(specimens.flatMap((s) => s.runs).map((r) => [r.id, r])).values()) {
    runCounts.runs += 1;
    runCounts[r.state === 'diverged' || r.state === 'error' || r.state === 'missing' ? 'not reproduced' : r.state] += 1;
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = findings.length === 0;

  if (asJson) {
    say(JSON.stringify({ gate: GATE, result: ok ? 'pass' : 'fail', strict, seconds: Number(seconds), counts, runs: runCounts, claims: claims.map?.[GATE] ?? [], specimens, findings, warnings: warnings.filter((w) => w.check !== 'note') }, null, 2));
    return ok ? 0 : 1;
  }

  if (used.size > 0) {
    say('  engines');
    for (const e of used.values()) say(`    ${scrub(e.describe)}`);
  }
  say(`  claims   ${GATE} backs ${(claims.map?.[GATE] ?? []).join(', ') || 'no course claim'} (${claims.file}): a red night marks ${(claims.map?.[GATE] ?? []).length === 1 ? 'it' : 'them'} unverified since the date it turned red`);
  say('  specimens');
  for (const s of specimens) {
    const detail = s.runs.map((r) => {
      const how = r.state === 'reproduced' ? `${r.matched} of ${r.expected} lines` : r.state === 'pending' ? 'to record' : r.state;
      return `${r.id} (${how})`;
    });
    say(`    ${s.id.padEnd(8)} ${s.status.padEnd(13)} ${detail.join(', ') || 'no run named'}`);
  }
  const details = [];
  for (const s of specimens) for (const r of s.runs) if (r.state === 'recorded-only' || r.state === 'diverged' || r.state === 'error' || r.state === 'missing') details.push(`${s.id} ${r.id}: ${r.detail}`);
  const shown = new Set();
  if (details.length > 0) {
    say('  why not reproduced');
    for (const d of details) {
      const key = d.slice(d.indexOf(' ') + 1);
      if (shown.has(key)) continue;
      shown.add(key);
      say(`    ${d}`);
    }
  }
  for (const n of warnings.filter((w) => w.check === 'note')) say(`  note     ${n.where}: ${n.detail}`);
  for (const w of warnings.filter((x) => x.check !== 'note')) say(`  warn     ${w.check}  ${w.where}: ${w.detail}`);
  for (const f of findings) say(`  FAIL     ${f.check}  ${f.where}: ${f.detail}`);
  const bad = counts.diverged + counts.missing;
  const summary = `specimens: ${counts.reproduced} reproduced, ${counts['recorded-only']} recorded only, ${counts.pending} pending${bad > 0 ? `, ${bad} not reproduced` : ''} of ${counts.specimens}; runs: ${runCounts.reproduced} matched, ${runCounts['recorded-only']} recorded only, ${runCounts.pending} pending${runCounts['not reproduced'] > 0 ? `, ${runCounts['not reproduced']} not reproduced` : ''}`;
  if (!ok) {
    say(`${GATE}: FAIL (${findings.length} finding${findings.length === 1 ? '' : 's'}; ${summary}; ${seconds} s)`);
    return 1;
  }
  say(`${GATE}: PASS (${summary}; ${seconds} s)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  // `| head` closes the pipe early: that is not a failure of the gate.
  process.stdout.on('error', (e) => {
    if (e.code === 'EPIPE') process.exit(process.exitCode ?? 0);
    throw e;
  });
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      process.stderr.write(`${GATE}: ${e instanceof Error ? e.stack : e}\n`);
      process.exitCode = 2;
    },
  );
}
