#!/usr/bin/env node
// Record RUN-specimens-gate and RUN-conformance-gate (W1-T42): each gate on this repository with the real engines,
// its planted-fault self-check, the mode that is meant to fail today, and the tests (the planted red night included),
// with every log under runs/<RUN-id>/ and the verdict lines copied from them.
//
//   node scripts/spikes/W1-T42/record.mjs            about four minutes: the gates re-execute runs on both engines
//
// The first run downloads the pinned engines into the engine cache (lib/engines.mjs); the record says so in its budget.
// Spine section 9.5 registers no run for W1-T42. The two IDs are not in packages/ids/proposals.json, because GATE-links fails
// a proposal that no scanned document uses; the first document that cites one adds both (propose-ids.mjs).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO, fileRecord, hostEnvironment, normalizePaths, sha256, sha256File } from '../../runs/registry.mjs';
import { PINS } from './lib/engines.mjs';

if (!process.features.typescript && !process.env.W1T42_RECORD_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, W1T42_RECORD_STRIP: '1' } });
  process.exit(again.status ?? 1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;
const nodeSha = sha256File(node);
const TASK = 'W1-T42';

function step(runId, id, args, purpose, { expectExit = 0, keep, cmd = node, argv = null, extra = {} } = {}) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = normalizePaths(`${r.stdout}${r.stderr}`, { sandbox: [process.env.TMPDIR].filter(Boolean) });
  const dir = path.join(REPO, 'runs', runId);
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, `${id}.log`);
  fs.writeFileSync(logFile, text);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const verdict = lines.filter(keep).slice(0, 120);
  console.log(`${runId} ${id}: exit ${r.status} (expected ${expectExit}), ${duration_s} s`);
  return { id, origin: 'recorded', purpose, started_at: started.toISOString(), duration_s, argv: argv ?? ['node', ...args], exit_code: r.status, expected_exit_code: expectExit, verdict_lines: verdict, outputs: [path.relative(REPO, logFile).split(path.sep).join('/')], text, ...extra };
}

/** SHA-256 of the sorted "sha256  path" lines of some files: a directory's manifest hash. */
function manifest(files) {
  const lines = files.map((f) => `${sha256File(path.join(REPO, f))}  ${f}`).sort();
  return { sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), files: files.length };
}

/**
 * The two gates inside the Bench image, which is where the nightly lane runs them: the image's own Python and Z3 are the
 * native engine, and Node comes from the host (the workflow installs it with actions/setup-node inside the image). Skipped,
 * with no step, when Docker or the image is missing. The image's ID stands for its digest, as W1-T12 records it.
 */
function benchSteps(runId, scriptArgs, id, purpose) {
  const image = 'statespace-bench:w0t05';
  const inspect = spawnSync('docker', ['image', 'inspect', '--format', '{{.Id}}', image], { encoding: 'utf8' });
  if (inspect.status !== 0) {
    console.log(`${runId} ${id}: skipped (no Docker image ${image} on this host)`);
    return null;
  }
  const digest = inspect.stdout.trim();
  const cache = process.env.STATESPACE_ENGINE_CACHE ?? path.join(REPO, '.cache', 'statespace-engines');
  fs.mkdirSync(cache, { recursive: true });
  const name = `w1t42-${runId.replace('RUN-', '')}-${id}`;
  // The read-only repository is also the working directory (-w /repo), as a checkout is where the workflow runs the gate: a
  // gate that wrote into its working directory would fail here.
  const args = ['run', '--rm', '--memory=6g', '--name', name, '-v', `${REPO}:/repo:ro`, '-v', '/nix:/nix:ro', '-v', `${cache}:/cache`, '-e', 'STATESPACE_ENGINE_CACHE=/cache', '-e', 'HOME=/tmp', '-w', '/repo', '--entrypoint', node, image, ...scriptArgs];
  const shown = ['docker', 'run', '--rm', '--memory=6g', '--name', name, '-v', '<repo>:/repo:ro', '-v', '/nix:/nix:ro', '-v', '<sandbox>/engine-cache:/cache', '-e', 'STATESPACE_ENGINE_CACHE=/cache', '-e', 'HOME=/tmp', '-w', '/repo', '--entrypoint', '<host-node>', `${image}@${digest}`, ...scriptArgs];
  return step(runId, id, args, purpose, { cmd: 'docker', argv: shown, keep: scriptArgs[0].includes('specimens') ? keepSpecimens : keepConformance, extra: { image: `${image}@${digest}` } });
}

const pins = [
  { url: PINS.nativeWheel.url, file: PINS.nativeWheel.file, sha256: PINS.nativeWheel.sha256, role: 'wheel (native z3)' },
  { url: PINS.wasmWheel.url, file: PINS.wasmWheel.file, sha256: PINS.wasmWheel.sha256, role: 'wheel (z3 under Pyodide)' },
  { url: PINS.pyodide.url, file: PINS.pyodide.file, sha256: PINS.pyodide.sha256, role: 'engine (Pyodide)' },
];
const libs = fs.readdirSync(path.join(HERE, 'lib')).filter((f) => f.endsWith('.mjs')).sort().map((f) => `scripts/spikes/W1-T42/lib/${f}`);
const tests = fs.readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => `scripts/spikes/W1-T42/${f}`);

function write(id, title, steps, primary, inputs, values, checks, notes) {
  const p = steps.find((s) => s.id === primary);
  const doc = {
    id,
    title,
    task: TASK,
    origin: 'recorded',
    engine: 'node',
    version: process.versions.node,
    binary: 'node (the host binary; no container)',
    binary_sha256: nodeSha,
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: steps[0].started_at,
    duration_s: Math.round(steps.reduce((n, s) => n + s.duration_s, 0) * 1000) / 1000,
    argv: p.argv,
    inputs,
    budget: { network: 'the pinned engine files are downloaded into the engine cache on the first run, each checked against its SHA-256', step_timeout_s: 1800 },
    exit_code: p.exit_code,
    verdict_lines: p.verdict_lines,
    outputs: steps.map((s) => fileRecord(REPO, s.outputs[0], { kind: 'log' })),
    values,
    checks,
    environment: { ...hostEnvironment(), node: process.version, container: null },
    primary_config: primary,
    configs: steps.map(({ text: _text, ...rest }) => rest),
    notes,
  };
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
  return doc;
}

const json = (step) => JSON.parse(step.text);
const keepSpecimens = (l) => /^(GATE-specimens|  (claims|catalog)|    (native|pyodide) |    SP-|  run )/.test(l) || /^FAIL|^  FAIL/.test(l);
const keepConformance = (l) => /^(GATE-conformance|  (held|absent|DIFFERS|ERROR|claims|FAIL))|^           (\d+ of \d+|native z3|pyodide |query|[a-z0-9-]+ +SP-)/.test(l);
const keepTap = (l) => /^# (tests|pass|fail|skipped)\b/.test(l) || /^not ok/.test(l);
const keepSelf = (l) => /^(  ok  |  FAIL  |GATE-)/.test(l);

// ------------------------------------------------------------------ GATE-specimens
{
  const id = 'RUN-specimens-gate';
  const steps = [
    step(id, 'nightly', ['scripts/verify-specimens.mjs'], 'the nightly lane on this repository: every run behind a specimen of spine 5.1 that a recipe re-executes, on native Z3 and on Pyodide', { keep: keepSpecimens }),
    step(id, 'nightly-json', ['scripts/verify-specimens.mjs', '--json'], 'the same, as JSON, for the counts', { keep: () => false }),
    step(id, 'strict', ['scripts/verify-specimens.mjs', '--only', 'SP-1.8', '--strict'], 'the release-side mode on SP-1.8, whose second run is a browser matrix no recipe re-executes: it must fail', { expectExit: 1, keep: keepSpecimens }),
    step(id, 'self-check', ['scripts/verify-specimens.mjs', '--self-check'], 'plant one fault at a time in a scratch tree, with stand-in engines: the gate must fail on each and pass the controls', { keep: keepSelf }),
    step(id, 'tests', ['--test', ...tests], 'the tests of both gates, the engine layer and the claims map, with the real engines, the planted red night through the real lane runner included', { keep: keepTap }),
    benchSteps(id, ['/repo/scripts/verify-specimens.mjs'], 'bench-nightly', "the nightly lane's environment: the gate inside the Bench image, where the image's own Python and Z3 re-execute the native runs and Pyodide the others"),
  ].filter(Boolean);
  const doc = json(steps[1]);
  // A run behind two specimens (RUN-z3-bv64 behind SP-1.4 and SP-1.5) is one run: each counts once, as the gate's own count does.
  const reexecuted = [...new Set(doc.specimens.flatMap((s) => s.runs).filter((r) => r.state === 'reproduced').map((r) => r.id))].sort();
  if (reexecuted.length !== doc.runs.reproduced) throw new Error(`${reexecuted.length} distinct runs re-executed here, ${doc.runs.reproduced} by the gate's own count`);
  const recordFiles = reexecuted.map((r) => `runs/${r}.json`);
  const scriptFiles = new Set();
  for (const f of recordFiles) for (const i of JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8')).inputs ?? []) if (i.path && /\.(py|mjs)$/.test(i.path) && fs.existsSync(path.join(REPO, i.path))) scriptFiles.add(i.path);
  const m = manifest([...recordFiles, ...scriptFiles]);
  const inputs = [
    ...['scripts/verify-specimens.mjs', ...libs, 'content/assurance/gate-claims.json', 'docs/spine/SPINE.md', 'scripts/spikes/W0-T04/lane.mjs', ...tests].map((f) => fileRecord(REPO, f, { role: f.startsWith('scripts/spikes/W1-T42/') && f.endsWith('.test.mjs') ? 'test' : 'gate' })),
    ...pins,
    { path: 'runs/', sha256: m.sha256, sha256_method: 'SHA-256 of the sorted "sha256  path" lines of the run records the gate re-executed and the scripts they name', files: m.files, role: 'the runs the gate re-executed' },
  ];
  const tap = (name) => Number(new RegExp(`^# ${name} (\\d+)`, 'm').exec(steps[4].text)?.[1] ?? Number.NaN);
  write(
    id,
    'GATE-specimens on this repository: the runs behind the specimens re-executed on native Z3 and Pyodide, its release-side mode, its planted-fault self-check and its tests',
    steps,
    'nightly',
    inputs,
    { specimens: doc.counts.specimens, specimens_reproduced: doc.counts.reproduced, specimens_recorded_only: doc.counts['recorded-only'], specimens_pending: doc.counts.pending, specimens_not_reproduced: doc.counts.diverged + doc.counts.missing, runs_matched: doc.runs.reproduced, runs_recorded_only: doc.runs['recorded-only'], runs_pending: doc.runs.pending, runs_not_reproduced: doc.runs['not reproduced'], tests: tap('tests'), tests_passed: tap('pass'), tests_failed: tap('fail'), claims_backed: doc.claims },
    [
      { id: 'nightly-passes', pass: steps[0].exit_code === 0 },
      { id: 'strict-fails-while-a-run-is-not-re-executed', pass: steps[2].exit_code === 1 },
      { id: 'self-check-holds', pass: steps[3].exit_code === 0 },
      { id: 'tests-pass', pass: steps[4].exit_code === 0 },
      { id: 'every-specimen-of-s1-reproduces', pass: doc.specimens.filter((s) => s.stage === 'S1').every((s) => s.status === 'reproduced') },
      ...(steps.some((s) => s.id === 'bench-nightly') ? [{ id: 'bench-nightly-passes', pass: steps.find((s) => s.id === 'bench-nightly').exit_code === 0 }] : []),
    ],
    [
      `The nightly configuration re-executed ${reexecuted.length} distinct runs (the value runs_matched; a run behind two specimens counts once); the input "runs/" is the manifest hash of their records and scripts.`,
      'A run is reproduced when each verdict line the record states comes back, in order, with times masked, on the engine and version the record names (scripts/spikes/W1-T42/lib/reproduce.mjs). Runs that no recipe re-executes are listed in the log with the reason; they are not counted as reproduced.',
      'The strict configuration is expected to exit 1: SP-1.8 cites RUN-phone-pyodide, a browser matrix that its own harness runs in the Playwright image.',
      'The native engine is the pinned manylinux wheel in a virtual environment built from the cache; Pyodide loads the pinned wasm wheel as the tab does.',
      "The bench-nightly configuration is a local substitute for the nightly lane on GitHub, which has not run: the Bench image runs the gate with the image's own python3 and Z3 as the native engine, and Node comes from the host's /nix store, mounted read-only, because the image has none (the workflow installs it with actions/setup-node). The repository is mounted read-only and is the working directory; only the engine cache is writable, so a gate that wrote into its working directory would fail here. The z3py scripts run in a scratch directory made for each run.",
    ],
  );
}

// ------------------------------------------------------------------ GATE-conformance
{
  const id = 'RUN-conformance-gate';
  const steps = [
    step(id, 'nightly', ['scripts/verify-conformance.mjs'], 'the nightly lane on this repository: Pyodide Z3 = native Z3 on the same queries, the recipient wrap included; the other pairs reported absent with their builders', { keep: keepConformance }),
    step(id, 'nightly-json', ['scripts/verify-conformance.mjs', '--json'], 'the same, as JSON, for the counts', { keep: () => false }),
    step(id, 'require-all', ['scripts/verify-conformance.mjs', '--require-all'], 'every pair required, as a release asks: it must fail while a pair script is absent', { expectExit: 1, keep: keepConformance }),
    step(id, 'self-check', ['scripts/verify-conformance.mjs', '--self-check'], 'plant one fault at a time, with stand-in engines and stub pair scripts: the gate must fail on each and pass the controls', { keep: keepSelf }),
    benchSteps(id, ['/repo/scripts/verify-conformance.mjs'], 'bench-nightly', "the nightly lane's environment: the gate inside the Bench image, whose own Python and Z3 are the native engine"),
  ].filter(Boolean);
  const doc = json(steps[1]);
  const pair = doc.pairs.find((p) => p.id === 'z3-same-query');
  const inputs = [
    ...['scripts/verify-conformance.mjs', ...libs, 'content/assurance/gate-claims.json'].map((f) => fileRecord(REPO, f, { role: 'gate' })),
    ...pins,
  ];
  write(
    id,
    'GATE-conformance on this repository: Pyodide Z3 = native Z3 on the same queries, its require-all mode and its planted-fault self-check',
    steps,
    'nightly',
    inputs,
    { pairs_held: doc.pairs.filter((p) => p.state === 'held').length, pairs_absent: doc.pairs.filter((p) => p.state === 'absent').length, queries_compared: pair.compared, queries_equal: pair.equal, witnesses_equal: pair.witnessesEqual, native: pair.engines[0], pyodide: pair.engines[1], verdicts: Object.fromEntries(pair.rows.map((r) => [r.id, { native: r.native, pyodide: r.pyodide }])), claims_backed: doc.claims },
    [
      { id: 'nightly-passes', pass: steps[0].exit_code === 0 },
      { id: 'require-all-fails-while-a-pair-is-absent', pass: steps[2].exit_code === 1 },
      { id: 'self-check-holds', pass: steps[3].exit_code === 0 },
      { id: 'every-query-agrees', pass: pair.compared === pair.equal },
      ...(steps.some((s) => s.id === 'bench-nightly') ? [{ id: 'bench-nightly-passes', pass: steps.find((s) => s.id === 'bench-nightly').exit_code === 0 }] : []),
    ],
    [
      'This is the same-query pair that spine 9.5 and 11.2 say GATE-conformance records: each query is one z3py program run on native Z3 and on Pyodide, so no two engines were asked different questions as RUN-z3-bv64 and RUN-z3-bv64-pyodide were.',
      'Verdicts and the reasons for unknown are compared exactly; a witness is checked against the query\'s property on each engine and never compared by value. The witnesses_equal value counts the sat queries whose two witnesses happened to be equal here; the gate never requires it.',
      'The pair scripts of the other rows (scripts/conformance/<pair>.mjs) did not exist when this was recorded; the log lists each with the task that builds it.',
      "The bench-nightly configuration is a local substitute for the nightly lane on GitHub, which has not run: the Bench image runs the gate with the image's own python3 and Z3 as the native engine, and Node comes from the host's /nix store, mounted read-only, because the image has none (the workflow installs it with actions/setup-node). The repository is mounted read-only and is the working directory.",
    ],
  );
}

console.log('recorded RUN-specimens-gate and RUN-conformance-gate; next: rebuild runs/index.json (node scripts/runs/build-index.mjs, under the generated-outputs lock)');
