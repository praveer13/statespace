#!/usr/bin/env node
// Record the runs that key the Audit Desk's S3 and S4 anchors, AUD-3.1 to AUD-4.3 (content/audit/README.md section 5;
// runs/README.md section 3). The same method as record-keys.mjs: each configuration runs in the pinned Bench image
// with no network and a 6 GB cap, on a scratch copy of runs/<RUN-id>/inputs/, writes its log to
// runs/<RUN-id>/<config>.log, and the record's verdict lines are the log's non-blank lines, copied, never typed.
//
//   node content/audit/tools/record-keys-s3s4.mjs                    record every run below
//   node content/audit/tools/record-keys-s3s4.mjs RUN-z3-frame-pair  record one
//
// Afterwards: node scripts/runs/build-index.mjs, so the registry's index names the new records.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const LEAN_BIN = '/opt/elan/toolchains/leanprover--lean4---v4.35.0/bin/lean';
const LIBZ3 = '/opt/venv/lib/python3.13/site-packages/z3/lib/libz3.so';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const posix = (p) => p.split('\\').join('/');

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else out.push(p);
  }
  return out;
}

const roleOf = (p) => (p.endsWith('.sh') || p.endsWith('.py') ? 'script' : 'source');

function inputsOf(files) {
  return files.map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: roleOf(p) };
  });
}

function docker(args) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}

const imageFact = (cmd) => docker(['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', cmd]).stdout.trim();

function environment() {
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  return {
    os: spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim(),
    cpu_count: Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim()),
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(),
    container: { image: IMAGE, user: 'uid 1000 (learner)' },
  };
}

function runConfig(run, cfg) {
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-'));
  cpSync(run.inputs, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rwX', scratch]);
  const name = `ssrec-audit-${run.id.slice(4).toLowerCase()}-${cfg.id}`.replace(/[^a-z0-9-]/g, '-');
  const argv = ['docker', 'run', '--rm', '--name', name, '--memory=6g', '--network', 'none', '-v', '<sandbox>/work:/w:ro', '-w', '/w', IMAGE, ...cfg.cmd];
  const real = argv.slice(1).map((a) => (a.startsWith('<sandbox>/work') ? a.replace('<sandbox>/work', scratch) : a));
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(real);
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  rmSync(scratch, { recursive: true, force: true });
  const log = `${r.stdout}${r.stderr}`;
  const logPath = join(REPO, 'runs', run.id, `${cfg.id}.log`);
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, log);
  return {
    id: cfg.id,
    origin: 'recorded',
    purpose: cfg.purpose,
    engine: run.engine,
    version: run.version,
    binary_sha256: run.binarySha,
    image: IMAGE,
    started_at: started.toISOString(),
    duration_s: Math.round(duration * 1000) / 1000,
    argv,
    inputs: inputsOf(cfg.files),
    budget: { container_memory: '6g', network: 'none' },
    exit_code: r.status,
    verdict_lines: log.split('\n').filter((l) => l.trim() !== ''),
    outputs: [posix(relative(REPO, logPath))],
    _log: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log) },
  };
}

function write(run, configs, values, extra) {
  const primary = configs.find((c) => c.id === run.primary) ?? configs[0];
  const inputs = [];
  for (const c of configs) for (const i of c.inputs) if (!inputs.some((x) => x.path === i.path)) inputs.push(i);
  const record = {
    id: run.id,
    title: run.title,
    task: run.task,
    origin: 'recorded',
    records: run.records,
    engine: run.engine,
    version: run.version,
    version_string: run.versionString,
    binary: run.binary,
    binary_sha256: run.binarySha,
    image: IMAGE,
    recorded_at: new Date().toISOString(),
    started_at: primary.started_at,
    duration_s: primary.duration_s,
    argv: primary.argv,
    inputs,
    budget: { container_memory: '6g', network: 'none' },
    exit_code: primary.exit_code,
    verdict_lines: primary.verdict_lines,
    outputs: configs.map((c) => ({ ...c._log, kind: 'log' })),
    values,
    environment: environment(),
    primary_config: primary.id,
    configs: configs.map(({ _log, ...c }) => c),
    notes: [
      "<sandbox>/work in argv stands for a scratch copy of this run's inputs/ folder, mounted read-only at /w; the inputs are kept there as they ran.",
      "Each log is the container's stdout followed by its stderr. verdict_lines are the log's non-blank lines, copied in log order (content/audit/tools/record-keys-s3s4.mjs); a run with several configurations keeps them on each configuration, and the top level repeats the primary one's.",
      ...extra,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${run.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${run.id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

const lean = () => ({
  engine: 'lean',
  version: '4.35.0',
  versionString: imageFact('lean --version'),
  binary: `bin/lean of the Lean 4.35.0 toolchain in the statespace-bench image (${LEAN_BIN}, which elan resolves lean to)`,
  binarySha: imageFact(`sha256sum ${LEAN_BIN} | cut -d' ' -f1`),
});
const z3 = () => ({
  engine: 'z3',
  version: '5.3.1',
  versionString: imageFact('python3 -c "import z3; print(z3.get_full_version())"'),
  binary: `libz3.so of the z3-solver 5.3.1 wheel in the statespace-bench image (${LIBZ3})`,
  binarySha: imageFact(`sha256sum ${LIBZ3} | cut -d' ' -f1`),
});

/** A Lean run of four projects: sound, flawed and one variant pair, each `sh run.sh <project>`. */
function leanProjects(id, meta, purpose, values, extra) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = { id, ...meta, ...lean(), inputs: dir, primary: 'flawed' };
  const shared = filesUnder(dir).filter((p) => !/\/(sound|flawed|v1-sound|v1-flawed)\//.test(p));
  const configs = ['sound', 'flawed', 'v1-sound', 'v1-flawed'].map((p) =>
    runConfig(run, { id: p, purpose: purpose(p), cmd: ['sh', 'run.sh', p], files: [...filesUnder(join(dir, p)), ...shared] }),
  );
  write(run, configs, values(configs), extra);
}

/** A Z3 run of one script over the run's inputs. */
function z3Script(id, meta, script, purpose, values, extra) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = { id, ...meta, ...z3(), inputs: dir, primary: 'bench' };
  const cfg = runConfig(run, { id: 'bench', purpose, cmd: ['python3', '-I', script], files: filesUnder(dir) });
  write(run, [cfg], values(cfg.verdict_lines), extra);
}

const exitOf = (lines, what) => Number(lines.find((l) => l.startsWith(`${what} exit=`))?.split('=')[1] ?? NaN);
const tagged = (lines) => {
  const out = {};
  for (const l of lines) {
    const m = /^\[(q\d)(?: (s\d))?([^\]]*)\] (.*)$/.exec(l);
    if (!m) continue;
    out[m[1]] ??= {};
    out[m[1]][m[2] ?? m[3].trim()] = m[4];
  }
  return out;
};

// ------------------------------------------------------------------ the runs

const RUNS = {
  'RUN-lean-checker-drift': () =>
    leanProjects(
      'RUN-lean-checker-drift',
      {
        title: "AUD-3.1's cases: the step-invariant theorem builds on four projects with standard axioms; the two stated over a stricter copy (HasType', execStrict) fail the pinned statement, and the step-3 scenarios say which steps each theorem covers",
        task: 'W2-T13',
        records: 'AUD-3.1 (content/audit/AUD-3.1.yaml): lean on each project, the project checked against the pinned statement (Pin.lean), and the step-3 scenarios',
      },
      (p) => `run.sh ${p}: lean ${p}/Ledger.lean, then the same file with Pin.lean appended, then with ${p}/Scen.lean appended`,
      (configs) =>
        Object.fromEntries(
          configs.map((c) => [c.id, { build_exit: exitOf(c.verdict_lines, 'lean'), pin_exit: exitOf(c.verdict_lines, 'pin'), pinned: exitOf(c.verdict_lines, 'pin') === 0 ? 'matches' : 'mismatch', scenarios: tagged(c.verdict_lines) }]),
        ),
      [
        'Pin.lean states the challenge pinned statement over the shipped HasType and exec, and closes it with the solution theorem. Comparator is not in the Bench image; this elaboration check is the same comparison done by Lean, and its type mismatch names the identifiers that differ.',
        'A scenario line prints whether the shipped checker accepts the command, whether the shipped evaluator returns ok, and whether the command and its result meet every hypothesis of that project theorem (covered).',
      ],
    ),
  'RUN-lean-nat-pair': () =>
    leanProjects(
      'RUN-lean-nat-pair',
      {
        title: "AUD-3.2's cases: four non-negativity theorems build with the same axioms; on the Nat models without a guard an overdraft truncates to 0 and the total changes",
        task: 'W2-T13',
        records: 'AUD-3.2 (content/audit/AUD-3.2.yaml): lean on each project and the step-3 scenarios evaluated on the same model',
      },
      (p) => `run.sh ${p}: lean ${p}/Pay.lean, then the same file with ${p}/Scen.lean appended`,
      (configs) => Object.fromEntries(configs.map((c) => [c.id, { build_exit: exitOf(c.verdict_lines, 'lean'), scenarios: tagged(c.verdict_lines) }])),
      ['A scenario line prints what the model returns and whether every unit of money is kept (kept). RUN-lean-nat-trunc records the same truncation on draft 0 (30 - 50 is 0, and the total goes from 30 to 50).'],
    ),
  'RUN-z3-frame-pair': () =>
    z3Script(
      'RUN-z3-frame-pair',
      {
        title: "AUD-4.1's cases: four generated obligations are sat with an account below zero; replayed in the interpreter, the models of the two queries generated from commands that write that account are runs that break Inv, and the other two are no runs of their commands",
        task: 'W3-T13',
        records: 'AUD-4.1 (content/audit/AUD-4.1.yaml): each query file, its model, the model replayed in the interpreter of the command it was generated from, and the step-3 scenarios',
      },
      'check.py',
      'check.py: q1.smt2 and q2.smt2, then the Z3Py queries q3 and q4, each model replayed, then the scenarios',
      (lines) => tagged(lines),
      ['q1.smt2 is the query RUN-z3-missing-frame prints for S4.L5 cell 1, copied from its log. The interpreter functions in check.py are the commands each query was generated from, in miniature, as in S10.L3 cell 1.'],
    ),
  'RUN-z3-noguard-pair': () =>
    z3Script(
      'RUN-z3-noguard-pair',
      {
        title: "AUD-4.2's cases: four obligations are unsat as checked; with every conjunct of the declared Inv, the unguarded transfer over the two-conjunct Inv is sat at amount 1, and of the two conjuncts dropped from Capture's obligation only one follows from the others",
        task: 'W3-T13',
        records: 'AUD-4.2 (content/audit/AUD-4.2.yaml): each obligation as checked, the same obligation with the full Inv after the step, the implication check for a dropped conjunct, and the step-3 scenarios',
      },
      'check.py',
      'check.py: q1.smt2 to q4.smt2 as checked and with the full Inv, then the scenarios',
      (lines) => tagged(lines),
      ['The full check replaces the last assertion of each file by the negation of every conjunct of Inv after the step; the replacement is done in check.py, on the file as it ran. RUN-z3-conservation-noguard and RUN-z3-optimize-min record the same two facts on the W0 query.'],
    ),
  'RUN-z3-cti-variants': () =>
    z3Script(
      'RUN-z3-cti-variants',
      {
        title: "AUD-4.3's scenarios and variant pair: bounded searches from Init (N = 6) on the holds model and its twin, and the merchant model of S4.L6 with its twin, before and after the agent's edit",
        task: 'W3-T13',
        records: "AUD-4.3 (content/audit/AUD-4.3.yaml): the pair's step-3 scenarios, and the variant pair's inductive step, pre-state, bounded search, strengthened invariant and edited command",
      },
      'cti.py',
      'cti.py: reachability of each scenario state, the merchant model and its twin, and both models after the edit',
      (lines) => tagged(lines),
      ["The holds model and its twin are RUN-z3-cti-pair's S10.L6 cell 2 models, copied into cti.py; that run keys the pair itself."],
    ),
};

const want = process.argv.slice(2);
for (const [id, fn] of Object.entries(RUNS)) if (want.length === 0 || want.includes(id)) fn();
