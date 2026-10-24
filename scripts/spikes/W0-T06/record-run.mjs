#!/usr/bin/env node
/**
 * Records RUN-budget-gate (W0-T06): GATE-budget on the real files, its tests, a sweep of plan changes, and one planted
 * defect per check, in the configurations that the acceptance criterion names.
 *
 *   gate                    scripts/verify-budget.mjs on the real files, as the fast lane runs it
 *   gate-verbose            the same with --verbose: the stage table, each path's Keep-load table and longest gaps
 *   gate-json               the same with --json
 *   gate-strict             the same with --strict, where a warning fails: the pending owner decisions show as a failure
 *   tests                  node --test over scripts/spikes/W0-T06/verify-budget.test.mjs
 *   mutation-sweep          scripts/spikes/W0-T06/mutation-sweep.mjs: which plan changes the gate sees
 *   crosscheck              scripts/spikes/W0-T06/crosscheck.py: an independent re-computation of the timelines (needs uv)
 *   links-check             GATE-links over the tree: no finding may name content/stages/budget.yaml
 *   privacy-check           GATE-privacy over the tree: no finding may name a file of this task
 *   baseline                the gate on a scratch copy of the spine, the budget file and the files it cites
 *   planted-*               the scratch copy with one defect planted in the spine or the budget file
 *
 * Usage: node scripts/spikes/W0-T06/record-run.mjs --scratch <empty-dir-outside-the-repository>
 * Every configuration runs before anything is written, so the scans see the tree without this run's own files. Paths
 * outside the repository are written as <scratch>; the recorder refuses to write a file that holds the local account
 * name or a private path.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const RUN_ID = 'RUN-budget-gate';
const OUT = join(REPO, 'runs', RUN_ID);
const RECORDER = 'scripts/spikes/W0-T06/record-run.mjs';
const TIMEOUT_S = 300;
const SPINE = 'docs/spine/SPINE.md';
const BUDGET = 'content/stages/budget.yaml';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fileSha = (p) => sha256(readFileSync(p));

const at = process.argv.indexOf('--scratch');
if (at < 0 || !process.argv[at + 1]) {
  console.error('usage: record-run.mjs --scratch <empty-dir-outside-the-repository>');
  process.exit(2);
}
const SCRATCH = resolve(process.argv[at + 1]);
if (!relative(REPO, SCRATCH).startsWith('..')) {
  console.error('the scratch directory must be outside the repository');
  process.exit(2);
}
mkdirSync(SCRATCH, { recursive: true });
const SCRATCH_REAL = realpathSync(SCRATCH);
const ROOT = join(SCRATCH, 'root');
const scrub = (s) => s.split(SCRATCH_REAL).join('<scratch>').split(SCRATCH).join('<scratch>').split(REPO).join('<repo>');

const gate = await import('../../verify-budget.mjs');
const { parseYaml } = await import('../../../packages/ids/src/yaml-subset.ts');
const CITED = gate.citedFiles(parseYaml(readFileSync(join(REPO, BUDGET), 'utf8')));

function run(cmd, args, { cwd = REPO, env = {} } = {}) {
  const t0 = performance.now();
  const started = new Date().toISOString();
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: TIMEOUT_S * 1000, maxBuffer: 1 << 28 });
  return { started_at: started, duration_s: Number(((performance.now() - t0) / 1000).toFixed(3)), exit_code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const configs = [];
const outputs = new Map(); // file under runs/RUN-budget-gate -> text

function record(id, purpose, argv, result, extra = {}) {
  const file = `${id}.txt`;
  outputs.set(file, scrub(result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : '')));
  configs.push({ id, purpose, argv: argv.map(scrub), started_at: result.started_at, duration_s: result.duration_s, exit_code: result.exit_code, ...extra, outputs: [{ path: `runs/${RUN_ID}/${file}` }] });
  return scrub(result.stdout).split('\n').filter(Boolean);
}
const GATE = ['scripts/verify-budget.mjs'];

// ------------------------------------------------------------------ the real files
const base = run('node', GATE);
record('gate', 'GATE-budget over the real spine and budget file, as the fast lane runs it', ['node', ...GATE], base, {
  verdict_lines: base.stdout.split('\n').filter((l) => /^(GATE-budget:|PATH|WARN|FAIL|\s+(OK|WARN|FAIL|NOTE)\s|NOTE|OK)/.test(l)),
});
const verbose = run('node', [...GATE, '--verbose']);
record('gate-verbose', 'the same with --verbose: the stage table, each path\'s Keep-load table by block and its five longest gaps', ['node', ...GATE, '--verbose'], verbose, {
  verdict_lines: [verbose.stdout.split('\n').filter(Boolean).at(-1)],
});
const json = run('node', [...GATE, '--json']);
const parsed = JSON.parse(json.stdout);
record('gate-json', 'the same with --json', ['node', ...GATE, '--json'], json, {
  verdict_lines: [`ok ${parsed.ok}; ${parsed.stages.length} stages, ${parsed.paths.length} paths (${parsed.paths.map((p) => p.id).join(', ')}); ${parsed.findings.filter((f) => f.severity === 'warn').length} warnings, ${parsed.findings.filter((f) => f.severity === 'fail').length} failures`],
});
// the conditional green: what each path says about the planned records, from the gate's own figures
const warnings = parsed.findings.filter((f) => f.severity === 'warn');
const cadenceWarnings = warnings.filter((f) => f.check === 'cadence');
const recordsOf = parsed.paths.map((p) => ({ id: p.id, ...p.cadence.plannedRecords }));
// the figures that the owner action and the notes quote are read from the warning that the gate printed
const conditional = cadenceWarnings.length > 0;
let withoutText = '';
if (conditional) {
  const m = /without (?:it|them), (.+?) is ([0-9.]+) h of stage work = [0-9.]+ weeks at 6 h\/week, above the [0-9]+-week limit \(([0-9.]+) h; ([0-9.]+) h at the low estimate\)/.exec(cadenceWarnings[0].message);
  if (!m) throw new Error('the cadence warning no longer has the shape that this recorder reads');
  withoutText = `${m[1]} is ${m[2]} h at the high estimate (${m[4]} h at the low), against the ${m[3]} h limit`;
}
const strict = run('node', [...GATE, '--strict']);
record('gate-strict', 'the same with --strict, where a warning fails: the cut-list warnings and the cadence warning of each path each fail the strict lane', ['node', ...GATE, '--strict'], strict, {
  verdict_lines: [
    `exit ${strict.exit_code} (a warning fails under --strict): ${plural(warnings.length, 'warning')}, ${plural(cadenceWarnings.length, 'of them cadence warning')} (${cadenceWarnings.map((f) => f.scope).join(', ')})`,
    ...strict.stdout.split('\n').filter((l) => /^\s*WARN /.test(l) || /^GATE-budget:/.test(l)).map((l) => (l.length > 170 ? `${l.slice(0, 170)} ...` : l)),
  ],
});

// ------------------------------------------------------------------ the tests and the sweep
const tests = run('node', ['--test', 'scripts/spikes/W0-T06/verify-budget.test.mjs']);
const tap = tests.stdout.split('\n');
const total = (k) => Number(tap.find((l) => l.startsWith(`# ${k} `))?.split(' ')[2]);
record('tests', 'the unit and planted-defect tests of GATE-budget', ['node', '--test', 'scripts/spikes/W0-T06/verify-budget.test.mjs'], {
  ...tests,
  stdout: `${tap.filter((l) => /^(not )?ok \d+ - /.test(l)).join('\n')}\n${tap.filter((l) => /^# (tests|suites|pass|fail|cancelled|skipped|todo) /.test(l)).join('\n')}\n`,
}, {
  verdict_lines: [`tests ${total('tests')}, pass ${total('pass')}, fail ${total('fail')}, skipped ${total('skipped')}`],
  counts: { tests: total('tests'), pass: total('pass'), fail: total('fail'), skipped: total('skipped') },
});
const sweep = run('node', ['scripts/spikes/W0-T06/mutation-sweep.mjs']);
const sw = JSON.parse(sweep.stdout);
record('mutation-sweep', 'one change at a time in a copy of the spine: lab minutes raised by 1, 5 and 15, stretch stages raised by 100, lesson tiers flipped', ['node', 'scripts/spikes/W0-T06/mutation-sweep.mjs'], sweep, {
  verdict_lines: [
    ...Object.entries(sw.labStages).map(([k, v]) => `lab stage ${k}: seen ${v.seen} of ${v.planted}`),
    `stretch stages +100 min: ${sw.stretch.planted} planted, ${sw.stretch['+100 min that changed the verdict'].length} changed the verdict`,
    `lesson tier flips: seen ${sw.tiers.seen} of ${sw.tiers.planted}`,
  ],
  counts: sw,
});

const cross = run('uv', ['run', '--quiet', '--with', 'pyyaml', 'python', '-I', 'scripts/spikes/W0-T06/crosscheck.py']);
const pyVersion = run('uv', ['run', '--quiet', '--with', 'pyyaml', 'python', '-I', '-c', 'import yaml; print(yaml.__version__)']);
record('crosscheck', 'an independent re-computation of the two paths (its own parser for the spine\'s tables, PyYAML for the budget file): events, hours and the five longest gaps against the gate\'s --json', ['uv', 'run', '--quiet', '--with', 'pyyaml', 'python', '-I', 'scripts/spikes/W0-T06/crosscheck.py'], cross, {
  verdict_lines: cross.stdout.split('\n').filter(Boolean),
  tool_versions: { pyyaml: pyVersion.stdout.trim() },
});

// ------------------------------------------------------------------ the other gates over the tree
const links = run('node', ['scripts/verify-links.mjs', '--json']);
const linkFindings = JSON.parse(links.stdout).failures ?? [];
const linkMine = linkFindings.filter((f) => /content\/stages\/budget\.yaml|verify-budget|spikes\/W0-T06/.test(`${f.file ?? ''} ${f.message ?? ''}`));
record('links-check', 'GATE-links over the tree with content/stages/budget.yaml present: no finding may name the budget file (the IDs it writes resolve; LAB-2.9 is a pending proposal there)', ['node', 'scripts/verify-links.mjs', '--json'], { ...links, stdout: `${linkFindings.map((f) => `${f.check}  ${f.file}  ${String(f.message).slice(0, 160)}`).join('\n')}\n` }, {
  verdict_lines: [`${linkMine.length === 0 ? 'PASS' : 'FAIL'}: ${linkMine.length} of ${linkFindings.length} GATE-links finding(s) name this task's files`, ...linkFindings.map((f) => `other finding: ${f.check} ${f.file}`)],
});
const priv = run('node', ['scripts/verify-privacy.mjs', '--json']);
let privFindings = [];
try {
  privFindings = JSON.parse(priv.stdout).findings ?? JSON.parse(priv.stdout).problems ?? [];
} catch {
  privFindings = [];
}
const privMine = privFindings.filter((f) => /budget\.yaml|verify-budget|W0-T06/.test(JSON.stringify(f)));
record('privacy-check', 'GATE-privacy over the tree: no finding may name a file of this task', ['node', 'scripts/verify-privacy.mjs', '--json'], { ...priv, stdout: `${privFindings.map((f) => `${f.check ?? f.kind ?? 'finding'}  ${f.file ?? f.path ?? ''}`).join('\n')}\n` }, {
  verdict_lines: [`${privMine.length} of ${privFindings.length} GATE-privacy finding(s) name this task's files: ${privMine.length === 0 ? 'PASS' : 'FAIL'}`, ...privFindings.map((f) => `other finding: ${f.check ?? f.kind ?? 'finding'} ${f.file ?? f.path ?? ''}`)],
});

// ------------------------------------------------------------------ scratch copies, and the planted defects
function freshRoot() {
  rmSync(ROOT, { recursive: true, force: true });
  for (const p of new Set([SPINE, BUDGET, ...CITED])) {
    mkdirSync(dirname(join(ROOT, p)), { recursive: true });
    cpSync(join(REPO, p), join(ROOT, p));
  }
}
const edit = (path, fn) => {
  const before = readFileSync(join(ROOT, path), 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`a planted edit changed nothing in ${path}`);
  writeFileSync(join(ROOT, path), after);
};
const replaceOnce = (from, to) => (t) => {
  if (!t.includes(from)) throw new Error(`no "${from.slice(0, 50)}" to replace`);
  return t.replace(from, to);
};
const item48 = (text) => `48. **${text}**`;
const afterItem47 = (lines) => (t) => t.replace(/^(47\. .*)$/m, `$1\n${lines.join('\n')}`);
const minutes = (labStage, to) => (t) => t.replace(new RegExp(`^(\\| ${labStage.replace('.', '\\.')} \\|.*\\| )[0-9]+( \\| LAB-)`, 'm'), `$1${to}$2`);
const S8_CELL = [`| 1.6–2.8 | 0.9–1.6 | 3–6 wk |`, `| 1.6–2.8 | 0.9–1.6 | 30–60 wk |`];
const S8_BUDGET = [`roadmap: "3–6 wk"\n      gate: pass\n    new_tools: []\n    # The default order of curriculum/S08`, `roadmap: "30–60 wk"\n      gate: pass\n    new_tools: []\n    # The default order of curriculum/S08`];
const lowerBound = { spine: [replaceOnce(...S8_CELL)], budget: [replaceOnce(...S8_BUDGET)] };
// the two cut-list folds of the builder path, accepted by two section 12 items that name the bridge and the path
const acceptFolds = {
  spine: [afterItem47([item48('Cut row 3 on the builder\'s path.') + ' S5.L9 stays a lesson on the builder\'s path.', '49. **Cut row 17 on the builder\'s path.** S6.L5 stays a lesson on the builder\'s path.'])],
  budget: [replaceOnce('  accepted: []', '  accepted:\n    - {bridge: S5.L9, path: builder, item: 48}\n    - {bridge: S6.L5, path: builder, item: 49}')],
};

const planted = [
  { id: 'planted-footing', purpose: 'the shape of PLAN.md spine issue 2: the Write column\'s low total reads 16.0 while its ten rows add to 14.95, so the column totals add to 107.7 and not to the printed 106.7', check: 'rows', needle: 'rounding issue, PLAN.md spine issue 2', exit: 1,
    spine: [replaceOnce('**15.0–28.0**', '**16.0–28.0**')], budget: [replaceOnce('  write: "15.0–28.0"', '  write: "16.0–28.0"')] },
  { id: 'planted-lab-minutes', purpose: 'LAB-3.2 planned at 90 minutes instead of 45 with S3\'s row unchanged: the lab table and the printed Build cell disagree', check: 'rows', needle: 'S3 build, low', exit: 1, spine: [minutes('LAB-3.2', 90)] },
  { id: 'planted-over-bound', purpose: 'LAB-2.4 planned at 55 minutes instead of 25: S2\'s high estimate passes the roadmap\'s upper bound', check: 'upper', needle: 'S2: the high estimate', exit: 1, spine: [minutes('LAB-2.4', 55)] },
  { id: 'planted-lower-bound', purpose: 'S8\'s roadmap cell read as 30 to 60 weeks: its high estimate falls below half of the lower bound, a warning on both paths, exit 0', check: 'lower', needle: 'S8: the high estimate', exit: 0, severity: 'WARN', ...lowerBound },
  { id: 'planted-lower-bound-strict', purpose: 'the same under --strict, where a warning fails', check: 'lower', needle: 'S8: the high estimate', exit: 1, severity: 'WARN', args: ['--strict'], ...lowerBound },
  { id: 'planted-lower-justified', purpose: 'the same with a section 12 item that names S8 and its lower bound and a justification that cites it: no warning is left', check: 'lower', exit: 0, cleared: true,
    spine: [replaceOnce(...S8_CELL), afterItem47([item48('S8 plans below its lower bound.') + ' S8 stays under half of the roadmap\'s lower bound because the roadmap\'s weeks assume another scope.'])],
    budget: [replaceOnce(...S8_BUDGET), replaceOnce('justifications: []', 'justifications:\n  - {stage: S8, item: 48}')] },
  { id: 'planted-keep', purpose: 'forty reviews per KC instead of ten: the blocks\' review minutes pass the planned Keep block', check: 'keep', needle: 'the implied Keep load', exit: 1, budget: [replaceOnce('    reviews_per_kc: 10', '    reviews_per_kc: 40')] },
  { id: 'planted-cadence-gap', purpose: 'SP-2.2, S2\'s first specimen, taken out of the specimen table: S1\'s last claim to S2\'s next claim passes two weeks', check: 'cadence', needle: 'CL-1.3 (LAB-1.5) to CL-2.1 (LAB-2.2)', exit: 1, spine: [(t) => t.replace(/^\| SP-2\.2 \|.*\n/m, '')] },
  { id: 'planted-no-records', purpose: 'the two scheduled records of LAB-10.8 taken out: CL-10.1 to CL-10.2 passes two weeks at the high estimate', check: 'cadence', needle: 'CL-10.1 (LAB-10.7) to CL-10.2 (LAB-10.8)', exit: 1, budget: [(t) => t.replace(/planned_records:\n(?: {2,}.*\n)+/, 'planned_records: []\n')] },
  { id: 'planted-two-tools', purpose: 'a second new tool in S1', check: 'tools', needle: 'S1 introduces 2 new tools', exit: 1, budget: [replaceOnce('new_tools: [Z3Py]', 'new_tools: [Z3Py, Lean 4]')] },
  { id: 'planted-cut-seam', purpose: 'row 1 of the cut list replaced by S3.L1, which plants SEAM-6', check: 'cutlist', needle: 'plants SEAM-6', exit: 1, spine: [replaceOnce('| 1 | S4.L5 |', '| 1 | S3.L1 |')] },
  { id: 'planted-no-displacement', purpose: 'S2.L0\'s addition naming no displacement', check: 'additions', needle: 'S2.L0 names no displacement', exit: 1, budget: [replaceOnce('    displaces: "the C3.1–C3.2 and C4.3 proofs, now stretch"', '    displaces: null')] },
  { id: 'planted-builder-path', purpose: 'the S2 and S3 blocks of the builder\'s path swapped', check: 'paths', needle: 'differ from spine section 3.0', exit: 1, budget: [(t) => t.replace('      - {id: S2, stage: S2}\n      - {id: S3, stage: S3}', '      - {id: S3, stage: S3}\n      - {id: S2, stage: S2}')] },
  { id: 'planted-quote', purpose: 'the spine\'s "about 2 minutes per review" changed: a sentence the budget file quotes is gone', check: 'table', needle: 'no longer says', exit: 1, spine: [replaceOnce('about 2 minutes per review', 'about 3 minutes per review')] },
  { id: 'planted-arc', purpose: 'the spine\'s arc projection changed from 43–80 to 43–81 weeks', check: 'rows', needle: 'projects the arc', exit: 1, spine: [replaceOnce('about 43–80 weeks at 6 h/week', 'about 43–81 weeks at 6 h/week')] },
  { id: 'planted-order-accepted', purpose: 'the two cut-list warnings of the builder path accepted by two section 12 items that name the bridge and the path: no warning is left', check: 'cutlist', exit: 0, cleared: true, ...acceptFolds },
  { id: 'planted-records-alone', purpose: 'the two cut-list warnings accepted as above, so that the cadence warning of each path is the only warning left; under --strict the strict lane fails on it alone', check: 'cadence', needle: 'the cadence holds only by counting 2 planned records of LAB-10.8 that no claim template covers', exit: 1, severity: 'WARN', alone: true, args: ['--strict'], ...acceptFolds },
  { id: 'planted-records-alone-green', purpose: 'the same without --strict: the cadence warnings are the only warnings left and the gate exits 0', check: 'cadence', needle: 'the cadence holds only by counting 2 planned records of LAB-10.8 that no claim template covers', exit: 0, severity: 'WARN', alone: true, ...acceptFolds },
  { id: 'planted-ruling-quote', purpose: 'the spine\'s ruling that the planned records go against reworded: the sentence that the budget file quotes is gone, so the gate fails until the budget file is revisited', check: 'table', needle: 'no longer says', exit: 1, spine: [replaceOnce('so it cannot count claims without a template', 'so it counts the records that a stage spec schedules')] },
];

freshRoot();
const rootArgs = (extra = []) => [...GATE, '--root', ROOT, ...extra];
const clean = run('node', rootArgs());
record('baseline', 'the gate on a scratch copy of the spine, the budget file and the files it cites (nothing planted): the same report as on the real files', ['node', ...rootArgs()], clean, {
  verdict_lines: [`${clean.exit_code === base.exit_code && scrub(clean.stdout) === scrub(base.stdout) ? 'PASS' : 'FAIL'}: exit ${clean.exit_code}, ${scrub(clean.stdout) === scrub(base.stdout) ? 'the same report' : 'a different report'} as the real files`],
});
let failedPlants = 0;
for (const p of planted) {
  freshRoot();
  for (const fn of p.spine ?? []) edit(SPINE, fn);
  for (const fn of p.budget ?? []) edit(BUDGET, fn);
  const r = run('node', rootArgs(p.args));
  const lines = scrub(r.stdout).split('\n');
  const marked = lines.filter((l) => new RegExp(`^\\s*(FAIL|WARN)  ${p.check}  `).test(l));
  const found = p.needle ? marked.filter((l) => l.includes(p.needle) && (!p.severity || l.trim().startsWith(p.severity))) : [];
  const clearing = lines.filter((l) => /NOTE/.test(l) && /(justifies it|accepts it)/.test(l));
  const left = lines.filter((l) => new RegExp(`^\\s*WARN  ${p.check}  `).test(l));
  const others = lines.filter((l) => /^\s*(FAIL|WARN)  /.test(l) && !found.includes(l));
  const ok = r.exit_code === p.exit && (p.cleared ? left.length === 0 && clearing.length > 0 : found.length > 0 && (!p.alone || others.length === 0));
  if (!ok) failedPlants++;
  record(p.id, `${p.purpose} (planted in the scratch copy)`, ['node', ...rootArgs(p.args)], r, {
    verdict_lines: [
      p.cleared
        ? `${ok ? 'PASS' : 'FAIL'}: the gate exits ${r.exit_code} (expected ${p.exit}) and no ${p.check} warning is left; the notes say what cleared them`
        : `${ok ? 'PASS' : 'FAIL'}: the gate exits ${r.exit_code} (expected ${p.exit}) and reports ${found.length} "${p.check}" line(s) naming "${p.needle}"${p.alone ? `, with ${others.length} other warning(s) or failure(s)` : ''}`,
      ...(p.cleared ? clearing.slice(0, 3) : found.slice(0, 2)),
    ],
    planted_check: p.check,
  });
}
rmSync(ROOT, { recursive: true, force: true });

// ------------------------------------------------------------------ write the record
const inputFiles = [
  'scripts/verify-budget.mjs',
  RECORDER,
  'scripts/spikes/W0-T06/verify-budget.test.mjs',
  'scripts/spikes/W0-T06/mutation-sweep.mjs',
  'scripts/spikes/W0-T06/crosscheck.py',
  BUDGET,
  SPINE,
  ...CITED,
  'packages/ids/src/yaml-subset.ts',
  'packages/ids/src/markdown.ts',
  'packages/ids/src/spine.ts',
  'packages/ids/src/grammar.ts',
].filter((p, i, a) => a.indexOf(p) === i && existsSync(join(REPO, p)) && statSync(join(REPO, p)).isFile());
const inputs = inputFiles.map((path) => ({ path, sha256: fileSha(join(REPO, path)) }));

const failedConfigs = configs.filter((c) => c.verdict_lines?.some((l) => String(l).startsWith('FAIL:')));
const record_ = {
  id: RUN_ID,
  title: 'GATE-budget over the real stage plans, with its tests, a sweep of plan changes and one planted defect per check (W0-T06)',
  primary_config: 'gate',
  engine: 'node',
  version: process.versions.node,
  binary: 'node (the host binary; no container)',
  binary_sha256: fileSha(process.execPath),
  image: null,
  argv: ['node', ...GATE],
  env: {},
  inputs,
  budget: { timeout_s: TIMEOUT_S, timeout_scope: 'each configuration', network: 'none' },
  environment: {
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? null,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    container: null,
    image_digest: null,
  },
  started_at: configs[0].started_at,
  duration_s: Number(configs.reduce((n, c) => n + c.duration_s, 0).toFixed(3)),
  exit_code: configs[0].exit_code,
  verdict_lines: configs.flatMap((c) => (c.verdict_lines ?? []).map((l) => `${c.id}: ${l}`)),
  outputs: [...outputs.keys()].map((f) => ({ path: `runs/${RUN_ID}/${f}` })),
  configs,
  owner_actions: [
    'Decide the two cut-list warnings of the builder path: spine section 14 rows 3 (S5.L9 into S5.L8) and 17 (S6.L5 into S6.L2) would teach a KC before its hard prerequisite on the builder path. Either name another receiving lesson, or log a section 12 item that names the bridge and the path and list it under cut_list.accepted in content/stages/budget.yaml.',
    ...(conditional ? [`Decide the S10 claim cadence, which is green only conditionally: the plan counts two records that no claim template covers (planned_records in content/stages/budget.yaml: LAB-10.8 passes 4 and 6). The S10 spec (curriculum/S10-assembly.md section 13, issue 9) asks the gate to count them; the spine ("Left unchanged, with reasons", S10 issue 9, its cadence clause) says GATE-budget cannot count claims without a template. Without the records ${withoutText}. Either add claim templates for the [C] and [N] records to spine section 5.2 and delete planned_records and planned_records_ruling from the budget file, or rule in the spine that the gate counts scheduled records (the sentence that the budget file quotes then changes, the gate reports it, and the warning is revised with the ruling). Until then each path prints a cadence warning, which fails under --strict.`] : []),
  ],
  recorded_at: new Date().toISOString(),
  notes: [
    'The gate is the course\'s own script, so engine and version name the Node runtime that ran it.',
    `The real tree is green with ${plural(warnings.length, 'warning')}: ${plural(warnings.filter((f) => f.check === 'cutlist').length, 'cut-list warning')} on the builder path (folding S5.L9 into S5.L8 and S6.L5 into S6.L2, spine section 14 rows 3 and 17, would put a KC before its hard prerequisite) and ${plural(cadenceWarnings.length, 'cadence warning')} (one per path, below). Under --strict every one of them fails (the gate-strict configuration). The owner actions say what clears them.`,
    ...(conditional ? [`The claim-cadence check is green on both paths only conditionally. The plan counts two records that no claim template covers (planned_records in content/stages/budget.yaml: LAB-10.8 passes 4 and 6) because the S10 spec (curriculum/S10-assembly.md section 13, issue 9) asks the gate to count them, while the spine (its "Left unchanged, with reasons" paragraph, S10 issue 9, its cadence clause) says GATE-budget plans the cadence from templates and cannot count claims without one. Without the records ${withoutText}, so the check fails on both paths (planted-no-records). The gate therefore prints a warning on each path for as long as the cadence holds only with the records, with the spine's sentence and the gap without them, and the criterion's green is green pending the owner's decision on the S10 cadence. The crosscheck configuration recomputes that gap independently and agrees.`] : []),
    'The rule for the lower-bound warning is the written one (spine 3.0 and 11.2): the high estimate against half of the roadmap\'s lower bound. Spine sections 3.8 and 14 and the S8 spec read it on the low estimate; on that reading S6 (9.2 h against 9.5 h) is below the line today and S7 and S8 would cross it after the cut list. The gate prints that as a note and does not warn on it.',
    'Margins are thin by the plan\'s own figures and the gate prints them: the longest claim-or-specimen gap is 9.42 h of 9.50 h (CL-9.2 to SP-9.1, at the high estimate); S1 to S2 is 9.32 h; S2\'s high estimate is 28.40 h of 28.50 h; the Keep block of S5 to S8 at 6 h/week reaches 74.5 of the planned 75 min/week (three Today sessions of 12 minutes, the weekly review, the retro, an incident and the keep-alive, all at their high figures).',
    'Reading (the Read column, up to 29.5 h) is placed on no unit of the timeline, because the spine gives it per stage only; spread evenly over each stage\'s lessons it would put four gaps past two weeks on each path (the gate prints that as a note). For comparison, the S9 stage spec puts its longest gap, SP-9.3 to CL-9.2, at about 8.6 h; the gate gets 8.73 h for that span, without reading.',
    'The technical notes carry no hours in the spine. The budget file gives each 90 to 150 minutes, the one range that reproduces the Write cells of S2, S5, S7 and S9; S10\'s card hours (30 to 45 minutes) reproduce its Write cell the same way. The gate checks all of them.',
    'The planted configurations plant one defect each in a scratch copy of the spine, the budget file and the files the budget file cites; each PASS says the gate exits with the expected code and reports the expected finding, and the baseline copy reports the same as the real files.',
    'The crosscheck configuration shares no code with the gate: it parses the spine\'s tables itself, reads the budget file with PyYAML, rebuilds both paths in integer units and agrees with the gate on the event counts, the hours and the five longest gaps of each path.',
    'RUN-budget-gate is not among the run ids of spine section 9.5, which lists no run for W0-T06; it records this task\'s acceptance evidence. The run hashes the spine, the budget file and the files the budget file cites as inputs: re-record it with node scripts/spikes/W0-T06/record-run.mjs --scratch <dir> after a change to any of them.',
    'The checks of other gates (links-check, privacy-check) read other tasks\' files as they stood at the run time; GATE-links is red on the tree for a finding outside this task, and the configuration records only that none of its findings names this task\'s files.',
    ...(failedConfigs.length ? [`A configuration did not pass: ${failedConfigs.map((c) => c.id).join(', ')}.`] : []),
  ],
};

// ------------------------------------------------------------------ refuse to write private paths or names
const account = os.userInfo().username;
const bodies = [JSON.stringify(record_), ...outputs.values()];
for (const b of bodies) {
  if (/\/home\/|\/Users\/|\/tmp\/|\/var\/folders\//.test(b) || (account.length > 2 && b.includes(account))) {
    console.error('refusing to write: a record holds a private path or the local account name');
    process.exit(1);
  }
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [f, text] of outputs) writeFileSync(join(OUT, f), text.endsWith('\n') ? text : `${text}\n`);
record_.outputs = [...outputs.keys()].map((f) => ({ path: `runs/${RUN_ID}/${f}`, sha256: fileSha(join(OUT, f)), bytes: statSync(join(OUT, f)).size }));
for (const c of record_.configs) c.outputs = c.outputs.map((o) => record_.outputs.find((x) => x.path === o.path) ?? o);
// validate against run@1 with the schema package's validator, as GATE-runs does
let validation = 'The record was not validated against run@1: packages/schema is not present.';
let invalid = false;
if (existsSync(join(REPO, 'packages/schema/src/index.ts'))) {
  const schema = await import('../../../packages/schema/src/index.ts');
  const v = schema.validate('run', record_);
  invalid = !v.ok;
  validation = v.ok
    ? 'Validated against run@1 (schemas/run.schema.json) with the validator of packages/schema before writing: ok.'
    : `NOT valid against run@1: ${(v.issues ?? []).slice(0, 4).map((i) => `${i.instancePath || '/'} ${i.keyword}`).join('; ')}`;
}
record_.notes.push(validation);
writeFileSync(join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record_, null, 2)}\n`);
if (invalid) console.error(validation);
console.log(`recorded ${RUN_ID}: ${configs.length} configurations${failedConfigs.length ? `, ${failedConfigs.length} did not pass: ${failedConfigs.map((c) => c.id).join(', ')}` : ''}${failedPlants ? ` (${failedPlants} planted)` : ''}`);
process.exitCode = invalid || failedPlants ? 1 : 0;
