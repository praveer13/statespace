#!/usr/bin/env node
// W0-T07: records RUN-keepkill-rules (spine section 9.5): the SHA-256 of
// content/governance/keepkill-rules.yaml, fixed before the first learner-zero event, with the checks
// that the file says what its sources say and that GATE-schema holds it.
//
//   node scripts/spikes/W0-T07/record.mjs
//
// One configuration at a time, from the repository root:
//   hash                 sha256sum (GNU coreutils) and node:crypto over the file; they must agree
//   pyyaml               PyYAML 6.0.3 reads the file (its JSON feeds the next step)
//   check                scripts/spikes/W0-T07/check.mjs: the subset parser agrees with PyYAML, IDs resolve,
//                        units equal their sources, hashing and allocation rules hold; writes the vectors
//   crosscheck           scripts/spikes/W0-T07/crosscheck.py: statsmodels, mpmath and a Python allocation
//   gate-links           node scripts/verify-links.mjs --json, findings in the rules file
//   before-learner-zero  no learner-zero record or event exists yet
//   gate-schema          node scripts/verify-schema.mjs on the repository (its keep/kill line must be ok)
//   tamper               scripts/spikes/W0-T07/tamper.mjs: planted changes in scratch copies
// GATE-schema reads the record it checks and validates it against run@1, so the recorder writes a
// provisional record first, an interim full record before the two gate configurations, and the final
// record last. All three give the rules file the same SHA-256.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.features.typescript && !process.env.W0T07_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, W0T07_STRIP: '1' } });
  process.exit(again.status ?? 1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ID = 'RUN-keepkill-rules';
const RULES = 'content/governance/keepkill-rules.yaml';
const RECORD = `runs/${ID}.json`;
const OUTDIR = `runs/${ID}`;
const HERE = 'scripts/spikes/W0-T07';
const PY_STATS = ['--with', 'statsmodels==0.14.4', '--with', 'mpmath==1.3.0', '--with', 'pyyaml==6.0.3'];
const SEEDS = [0, 1, 2654435769, 4294967295];

const at = (...p) => path.join(ROOT, ...p);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const nowIso = () => new Date().toISOString();
const scrub = (t) => String(t).split(ROOT).join('<repo>').split(os.tmpdir()).join('<sandbox>').split(os.homedir()).join('<home>');
const first = (cmd, args) => (spawnSync(cmd, args, { encoding: 'utf8' }).stdout ?? '').split('\n')[0].trim();
const resolveBin = (name) => {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return fs.realpathSync(p);
  }
  return null;
};
const binHash = (name) => {
  const p = resolveBin(name);
  return p ? sha(fs.readFileSync(p)) : null;
};
const fileInput = (file, role) => ({ path: file, sha256: sha(fs.readFileSync(at(file))), role });
const writeOut = (name, content) => {
  const file = at(OUTDIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return `${OUTDIR}/${name}`;
};
const outputEntry = (rel) => {
  const buf = fs.readFileSync(at(rel));
  return { path: rel, sha256: sha(buf), bytes: buf.length };
};
const osLine = () => `${first('uname', ['-s'])} ${first('uname', ['-r'])} ${first('uname', ['-m'])}`;

function run(id, purpose, argv, { timeout = 600000, env = {} } = {}) {
  const started = Date.now();
  const startedAt = nowIso();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout, env: { ...process.env, ...env } });
  return { id, purpose, argv: argv.map(scrub), started_at: startedAt, duration_s: Number(((Date.now() - started) / 1000).toFixed(3)), exit_code: r.status, stdout: scrub(r.stdout ?? ''), stderr: scrub(r.stderr ?? '') };
}
const tidy = (c) => {
  const { stdout, ...rest } = c;
  const err = (rest.stderr ?? '').split('\n').filter((l) => l.trim() && !/^(Downloading|Downloaded|Installed|Resolved|Prepared|Audited|Uninstalled) /.test(l.trim()));
  if (err.length > 0) rest.stderr = err.slice(0, 20).join('\n');
  else delete rest.stderr;
  return rest;
};

const recordingStarted = nowIso();
const t0 = Date.now();
const rulesBuf = fs.readFileSync(at(RULES));
const H = sha(rulesBuf);

// ------------------------------------------------------------------ provisional record (satisfies run@1), so GATE-schema can read the hash
const provisional = {
  id: ID,
  title: 'Provisional: the SHA-256 of the keep/kill rules, written while scripts/spikes/W0-T07/record.mjs records the full run, which replaces this record',
  task: 'W0-T07',
  engine: 'node:crypto',
  version: process.version,
  binary: 'node (the host binary; no container)',
  binary_sha256: sha(fs.readFileSync(process.execPath)),
  image: null,
  recorded_at: nowIso(),
  started_at: recordingStarted,
  duration_s: 0,
  argv: ['node', `${HERE}/record.mjs`],
  inputs: [{ path: RULES, sha256: H, bytes: rulesBuf.length, role: 'the keep/kill rules' }],
  budget: {},
  exit_code: null,
  verdict_lines: [`${H}  ${RULES}`],
  outputs: [],
  environment: { os: osLine(), cpu_count: os.cpus().length },
  notes: ['Provisional. The full record replaces this one when the recording ends; both give the same SHA-256.'],
};
fs.writeFileSync(at(RECORD), `${JSON.stringify(provisional, null, 2)}\n`);
fs.rmSync(at(OUTDIR), { recursive: true, force: true });
fs.mkdirSync(at(OUTDIR), { recursive: true });

const configs = [];
const outputs = [];

// ------------------------------------------------------------------ hash
const hashRun = run('hash', 'the SHA-256 of the rules file by GNU coreutils sha256sum; node:crypto computes it again and must agree', ['sha256sum', RULES]);
const sumLine = hashRun.stdout.trim();
const sumHash = sumLine.split(/\s+/)[0];
outputs.push(writeOut('hash.txt', `${sumLine}\nnode:crypto sha256 ${H}\nbytes ${rulesBuf.length}\nlines ${rulesBuf.toString('utf8').split('\n').length - 1}\n`));
configs.push({ ...hashRun, engine: 'sha256sum', version: first('sha256sum', ['--version']), binary_sha256: binHash('sha256sum'), verdict_lines: [sumLine, `node:crypto: ${H}`, `agree: ${sumHash === H}`], outputs: [outputs.at(-1)] });

// ------------------------------------------------------------------ pyyaml
const pyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepkill-record-'));
const pyJson = path.join(pyDir, 'pyyaml.json');
const pyRun = run('pyyaml', 'PyYAML reads the rules file; its JSON is compared with the subset parser in the next configuration', ['uv', 'run', '--no-project', '--with', 'pyyaml==6.0.3', 'python', '-I', '-c', 'import json, sys, yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1], encoding="utf-8")), ensure_ascii=False, sort_keys=True))', RULES]);
fs.writeFileSync(pyJson, pyRun.stdout);
configs.push({ ...pyRun, engine: 'uv', version: first('uv', ['--version']), binary_sha256: binHash('uv'), verdict_lines: [`exit ${pyRun.exit_code}; ${Buffer.byteLength(pyRun.stdout)} bytes of JSON, compared in the check configuration`], outputs: [] });

// ------------------------------------------------------------------ check
const checkRun = run('check', 'the file against its sources: parsers agree, IDs resolve, units equal the spine and ASSESSMENT.md, hashing and allocation rules hold; writes the vectors', ['node', `${HERE}/check.mjs`, '--out', OUTDIR, '--pyyaml', pyJson]);
const check = JSON.parse(checkRun.stdout);
outputs.push(writeOut('check.json', `${JSON.stringify(check, null, 2)}\n`), `${OUTDIR}/allocation-vectors.json`, `${OUTDIR}/interval-vectors.json`);
configs.push({ ...checkRun, engine: 'node', version: process.version, verdict_lines: check.checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.detail}`), outputs: [`${OUTDIR}/check.json`, `${OUTDIR}/allocation-vectors.json`, `${OUTDIR}/interval-vectors.json`] });
fs.rmSync(pyDir, { recursive: true, force: true });

// ------------------------------------------------------------------ crosscheck
const crossRun = run('crosscheck', 'an independent check: statsmodels intervals, mpmath for z, the allocation implemented again in Python', ['uv', 'run', '--no-project', ...PY_STATS, 'python', '-I', `${HERE}/crosscheck.py`, RULES, `${OUTDIR}/allocation-vectors.json`, `${OUTDIR}/interval-vectors.json`]);
const cross = JSON.parse(crossRun.stdout);
outputs.push(writeOut('crosscheck.json', `${JSON.stringify(cross, null, 2)}\n`));
configs.push({ ...crossRun, engine: 'python', version: cross.versions.python, verdict_lines: cross.checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.detail}`), outputs: [outputs.at(-1)] });

// ------------------------------------------------------------------ gate-links
const linksRun = run('gate-links', 'GATE-links over the repository; the findings that name the rules file', ['node', 'scripts/verify-links.mjs', '--json']);
const links = JSON.parse(linksRun.stdout);
const inRules = [...(links.failures ?? []), ...(links.pending ?? []), ...(links.advisories ?? [])].filter((f) => f.file === RULES);
const linksSummary = { overall_ok: links.ok, failures_elsewhere: (links.failures ?? []).filter((f) => f.file !== RULES).map((f) => `${f.file}: ${f.message}`), findings_in_rules_file: inRules, stats: links.stats };
outputs.push(writeOut('gate-links.json', `${JSON.stringify(linksSummary, null, 2)}\n`));
configs.push({ ...linksRun, engine: 'node', version: process.version, verdict_lines: [`findings in ${RULES}: ${inRules.length}`, `overall: ${links.ok ? 'PASS' : `FAIL on ${(links.failures ?? []).length} finding(s), none in ${RULES}`}`], outputs: [outputs.at(-1)] });

// ------------------------------------------------------------------ before-learner-zero
const { parseYaml } = await import(pathToFileURL(at('packages', 'ids', 'src', 'yaml-subset.ts')).href);
const lzStarted = nowIso();
const lzT = Date.now();
const lzRecords = fs.readdirSync(at('runs')).filter((f) => /^RUN-lz-/.test(f));
const tracker = parseYaml(fs.readFileSync(at('tracker', 'tasks.yaml'), 'utf8'));
const w1 = (tracker.tasks ?? []).filter((t) => /^W1-/.test(t.id));
const w1Started = w1.filter((t) => t.status !== 'todo').map((t) => `${t.id} ${t.status}`);
const eventFiles = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir ? at(dir) : ROOT, { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!['.git', 'node_modules', 'fixtures', '.venv', '__pycache__'].includes(e.name)) walk(rel);
    } else if (e.isFile() && /\.(json|ndjson|yaml|yml)$/.test(e.name) && fs.statSync(at(rel)).size < 8 << 20) {
      const t = fs.readFileSync(at(rel), 'utf8');
      if (/"schema"\s*:\s*"statespace\/(event|bundle)@/.test(t) || /^schema:\s*["']?statespace\/(event|bundle)@/m.test(t)) eventFiles.push(rel);
    }
  }
};
walk('');
const lzClear = lzRecords.length === 0 && w1Started.length === 0 && eventFiles.length === 0;
const lz = {
  learner_zero_run_records: lzRecords,
  w1_tasks: w1.length,
  w1_tasks_not_todo: w1Started,
  files_declaring_event_or_bundle_records: eventFiles,
  verdict: lzClear ? 'no learner-zero event exists: no RUN-lz-* record, no W1 task started, no event or bundle record in the repository' : 'CHECK: something learner-zero-shaped exists',
};
outputs.push(writeOut('before-learner-zero.json', `${JSON.stringify(lz, null, 2)}\n`));
configs.push({ id: 'before-learner-zero', purpose: 'the hash is recorded before any learner-zero event: no learner-zero record, no started W1 task, no event@1 or bundle@1 record outside the schema fixtures', engine: 'node', version: process.version, argv: ['node', `${HERE}/record.mjs`], started_at: lzStarted, duration_s: Number(((Date.now() - lzT) / 1000).toFixed(3)), exit_code: lzClear ? 0 : 1, verdict_lines: [lz.verdict, `W1 tasks in tracker/tasks.yaml: ${w1.length}, started: ${w1Started.length}`], outputs: [outputs.at(-1)] });

// ------------------------------------------------------------------ the record (written interim before the gates, final after)
const inputs = [
  { path: RULES, sha256: H, bytes: rulesBuf.length, role: "the keep/kill rules, W0-T07's deliverable; GATE-schema fails if the file stops hashing to this value" },
  fileInput(`${HERE}/keepkill.mjs`, "the reference implementation of the rules' allocation, intervals and decisions"),
  fileInput(`${HERE}/check.mjs`, 'checks the rules against their sources and writes the vectors'),
  fileInput(`${HERE}/crosscheck.py`, 'the independent check in Python'),
  fileInput(`${HERE}/tamper.mjs`, 'planted changes in scratch copies'),
  fileInput(`${HERE}/record.mjs`, 'this recorder'),
];
// Living documents other tasks own: their hashes at recording, for provenance. They are not inputs, so a later
// edit to them does not make this record stale; re-running check.mjs then compares the rules with the new text.
const sourcesAtRecording = [
  fileInput('docs/spine/SPINE.md', "source of comparison 1's units (section 4) and of W0-T07 (section 13)"),
  fileInput('docs/ASSESSMENT.md', "source of comparison 2's and 3's units (section 4) and of fresh, solid, sign-off and VRK₃₀"),
  fileInput('docs/EVIDENCE.md', 'section 7, the proposal the rules are cut from'),
  fileInput('docs/PLAN.md', 'section 14.4'),
  fileInput('research/synthesis/BRIEF.md', 'sections 3.3 and 3.5'),
  fileInput('packages/ids/src/registry.json', 'the ID registry GATE-links resolves against'),
  fileInput('packages/ids/src/yaml-subset.ts', 'the dependency-free YAML parser the gates use'),
  fileInput('packages/ids/src/grammar.ts', "the ID grammar GATE-links scans with"),
  fileInput('packages/rng/src/index.ts', 'hash32, re-exported from the vendored kernelspace module'),
  fileInput('vendor/kernelspace/src/lib/rng.ts', 'the vendored hash32'),
  fileInput('scripts/verify-schema.mjs', 'GATE-schema'),
  fileInput('schemas/run.schema.json', 'run@1, which GATE-schema validates this record against'),
  fileInput('scripts/verify-links.mjs', 'GATE-links'),
  fileInput('tracker/tasks.yaml', 'task statuses for the before-learner-zero check'),
];
const environment = {
  os: osLine(),
  cpu_architecture: first('uname', ['-m']),
  cpu_count: os.cpus().length,
  ram_gib: Math.round(os.totalmem() / 2 ** 30),
  node: process.version,
  node_binary_sha256: sha(fs.readFileSync(process.execPath)),
  uv: first('uv', ['--version']),
  uv_binary_sha256: binHash('uv'),
  python_default: first('python3', ['--version']),
  python_packages: cross.versions,
  coreutils: first('sha256sum', ['--version']),
  container: null,
};
const precision = check.precision.map((p) => `${p.per_arm} per arm: ±${p.half_width_points} points`);

function buildRecord(gate, tamper) {
  const keepkillLine = gate ? gate.keepkillLine : null;
  const checks = [
    { id: 'sha256sum and node:crypto agree', pass: sumHash === H },
    { id: 'the rules match their sources (check.mjs)', pass: check.ok },
    { id: 'the independent check agrees (crosscheck.py)', pass: cross.ok },
    { id: 'no GATE-links finding in the rules file', pass: inRules.length === 0 },
    { id: 'no learner-zero event exists yet', pass: lzClear },
  ];
  if (gate) {
    checks.push({ id: 'GATE-schema: keep/kill rules ok', pass: /^ok\s+keep\/kill rules/.test(keepkillLine) });
    checks.push({ id: 'GATE-schema: this record validates against run@1', pass: !gate.failLines.some((l) => l.includes(RECORD)) });
  }
  if (tamper) checks.push({ id: 'GATE-schema fails on every planted change to the rules, and passes the control', pass: tamper.ok });
  return {
    id: ID,
    title: 'The SHA-256 of the keep/kill rules (content/governance/keepkill-rules.yaml), fixed before the first learner-zero event, with the checks that the rules match their sources and that GATE-schema holds the hash',
    task: 'W0-T07',
    engine: 'sha256sum',
    version: first('sha256sum', ['--version']),
    binary: 'sha256sum (GNU coreutils, the host binary; no container)',
    binary_sha256: binHash('sha256sum'),
    image: null,
    recorded_at: nowIso(),
    started_at: recordingStarted,
    duration_s: Number(((Date.now() - t0) / 1000).toFixed(3)),
    primary_config: 'hash',
    argv: ['sha256sum', RULES],
    inputs,
    sources_at_recording: sourcesAtRecording,
    budget: { timeout_s: 600, network: 'uv fetches the pinned Python wheels when its cache is cold', memory: 'host', containers: 'none', example_seeds: SEEDS },
    exit_code: hashRun.exit_code,
    verdict_lines: [
      sumLine,
      `node:crypto agrees: ${sumHash === H}`,
      ...(gate ? [keepkillLine] : []),
      ...(tamper ? tamper.scenarios.map((s) => `tamper, ${s.scenario}: exit ${s.exit_code}, keep/kill ${/^(ok|FAIL)/.exec(s.keepkill_line)?.[1] ?? 'none'}${s.as_expected ? '' : ' (UNEXPECTED)'}`) : []),
      `check: ${check.checks.filter((c) => c.ok).length} of ${check.checks.length} checks hold`,
      `crosscheck: ${cross.checks.filter((c) => c.ok).length} of ${cross.checks.length} checks hold`,
      `gate-links: ${inRules.length} findings in ${RULES}`,
      lz.verdict,
    ],
    outputs: outputs.map(outputEntry),
    values: {
      rules_sha256: H,
      rules_bytes: rulesBuf.length,
      units: { misconception_note: check.units[1].units, proof_blocks_distractors: check.units[2].units, witness_generalization: check.units[3].units },
      arms_under_example_seeds: check.allocation_counts,
      first_window_under_example_seeds: check.first_window.map((w) => ({ seed: w.seed, window_1: w.window_1 })),
      z: cross.z,
      library_quantiles: cross.checks.find((c) => c.name === 'libraries differ in the last digits').detail,
      interval_agreement: cross.checks.find((c) => c.name === 'intervals agree with statsmodels').detail,
      precision_near_0_8: precision,
      evidence_examples: check.evidence_examples,
      wilson_examples: check.wilson_examples,
      floating_point_trap: check.floating_point_trap,
      window_ordering_chance: check.window_ordering_chance.map((c) => `${c.a} no-reserve against ${c.d} reserve windows: 1 in ${c.oneIn}`),
    },
    environment,
    configs: configs.map(tidy),
    checks,
    pass: checks.every((c) => c.pass),
    learner_zero: {
      first_event_before_this_record: false,
      evidence: lz.verdict,
      later_check: "W1 confirms that learner-zero's first event is later than recorded_at (an owner action and a cross-task request of W0-T07)",
    },
    notes: [
      'This record fixes the rules: GATE-schema compares content/governance/keepkill-rules.yaml with the one sha256 this record gives for it (inputs[0]); the sha256sum line in configs[0] repeats the same value.',
      'inputs holds the rules file and this task\'s scripts. sources_at_recording holds the hashes of the living documents the checks read (the spine, ASSESSMENT.md, the gates); they will change, and a later run of check.mjs compares the rules with their new text. The rules freeze their unit lists, so a check that fails only because the KC graph moved on does not change the rules (common.units).',
      'Nothing here was emulated. The one thing this machine cannot show is the future: that the first learner-zero event comes after recorded_at. At recording no learner-zero record, started W1 task or event record existed (configuration before-learner-zero); W1 confirms the ordering when it records its first learner-zero run.',
      'Limit of the gate, shown by the last tamper scenario: a change that edits the rules and re-hashes this record together passes GATE-schema. The rules therefore also store their SHA-256 beside expSeed on the device and every read checks it (common.experiment_seed), and review of this record\'s history is the remaining guard.',
      'A checkout that converts line endings changes the hash (tamper scenario: CRLF). The file needs a -text or eol=lf rule in .gitattributes, which no W0 task owns; W0-T07 asks for it in its result.',
      "The z the rules fix is the double nearest to the 0.975 normal quantile (mpmath at 50 digits); Python's statistics module and scipy return three other doubles, so implementations must use the literal (configuration crosscheck).",
      "The allocation vectors use four example seeds. They are not learner-zero's expSeed, which the device draws when the comparisons are turned on.",
      'docs/EVIDENCE.md section 7.1 gives approximate 95% half-widths of ±35, ±25, ±20 and ±16 points for 10, 20, 30 and 50 units per arm near 0.8 [D]; Newcombe\'s interval gives the values in values.precision_near_0_8, within a point of each.',
      ...(gate && gate.exit !== 0 ? [`GATE-schema exited ${gate.exit} on the repository because of records other tasks own (${gate.failLines.map((l) => l.trim()).join('; ')}); its keep/kill line and this record's validation pass.`] : []),
    ],
  };
}
const writeRecord = (rec) => fs.writeFileSync(at(RECORD), `${JSON.stringify(rec, null, 2)}\n`);

writeRecord(buildRecord(null, null)); // interim: full, valid against run@1, same hash

// ------------------------------------------------------------------ gate-schema
const gateRun = run('gate-schema', 'GATE-schema on the repository, which compares the rules file with the hash this record holds and validates this record against run@1', ['node', 'scripts/verify-schema.mjs']);
outputs.push(writeOut('gate-schema.txt', `${gateRun.stdout}${gateRun.stderr ? `\n--- stderr ---\n${gateRun.stderr}` : ''}`));
const gateLines = gateRun.stdout.split('\n').map((l) => l.trimEnd());
const keepkillLine = (gateLines.find((l) => /^\s+(ok|FAIL|todo)\s+keep\/kill rules/.test(l)) ?? '').trim();
const failLines = gateLines.filter((l, i) => /^\s+record runs\/.*expected valid/.test(l) || (/^\s+FAIL\s/.test(l) && !/^\s+FAIL\s+validators agree:\s*$/.test(l)) || false);
const summaryLine = gateLines.find((l) => l.startsWith('GATE-schema:')) ?? '';
const gate = { keepkillLine, failLines, exit: gateRun.exit_code };
configs.push({ ...gateRun, engine: 'node', version: process.version, verdict_lines: [keepkillLine, ...failLines.map((l) => l.trim()), summaryLine.replace(/; [0-9.]+ s\)/, ')')], outputs: [outputs.at(-1)] });

// ------------------------------------------------------------------ tamper
const tamperRun = run('tamper', 'planted changes to the rules file in scratch copies of what GATE-schema reads; the repository is not modified', ['node', `${HERE}/tamper.mjs`]);
const tamper = JSON.parse(tamperRun.stdout);
outputs.push(writeOut('tamper.json', `${JSON.stringify(tamper, null, 2)}\n`));
configs.push({ ...tamperRun, engine: 'node', version: process.version, verdict_lines: tamper.scenarios.map((s) => `${s.as_expected ? 'as expected' : 'UNEXPECTED'}: ${s.scenario}: exit ${s.exit_code}; ${s.keepkill_line}`), outputs: [outputs.at(-1)] });

const final = buildRecord(gate, tamper);
writeRecord(final);
console.log(`wrote ${RECORD}: pass ${final.pass}; rules sha256 ${H}`);
for (const c of final.checks) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'} ${c.id}`);
process.exit(final.pass ? 0 : 1);
