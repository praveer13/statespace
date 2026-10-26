#!/usr/bin/env node
// Record the runs that key the S9 anchors, AUD-9.1 and AUD-9.2 (content/audit/README.md section 5; runs/README.md
// section 3). The Lean run executes in the pinned Bench image, the PostgreSQL run in the postgres:18 image that
// RUN-pg-one-db pins; both with no network and a 6 GB cap, on a scratch copy of the run's inputs/. Logs go to
// runs/<RUN-id>/<config>.log and the record's verdict lines are filtered from them, never typed.
//
//   node content/audit/tools/record-aud9.mjs                        record both runs
//   node content/audit/tools/record-aud9.mjs RUN-lean-abort-blind
//
// Afterwards: node scripts/runs/build-index.mjs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BENCH = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const PG = 'postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336';
const LEAN_BIN = '/opt/elan/toolchains/leanprover--lean4---v4.35.0/bin/lean';
const PG_BIN = '/usr/lib/postgresql/18/bin/postgres';

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

const inputsOf = (dir, role) =>
  filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: role(p) };
  });

function docker(args) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}

const imageFact = (image, cmd) => docker(['run', '--rm', '--network', 'none', image, 'sh', '-c', cmd]).stdout.trim();

function environment(image) {
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  return {
    os: spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim(),
    cpu_count: Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim()),
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(),
    container: { runtime: 'docker', image, network: 'none' },
  };
}

function finish(run, cfg, argv, started, duration, status, log, keep) {
  const logPath = join(REPO, 'runs', run.id, `${cfg.id}.log`);
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, log);
  return {
    id: cfg.id,
    origin: 'recorded',
    purpose: cfg.purpose,
    engine: run.engine,
    version: run.version,
    version_string: run.versionString,
    binary_sha256: run.binarySha,
    image: run.image,
    started_at: started.toISOString(),
    duration_s: Math.round(duration * 1000) / 1000,
    argv,
    inputs: cfg.inputs,
    budget: { container_memory: '6g', network: 'none' },
    exit_code: status,
    verdict_lines: log.split('\n').filter(keep),
    outputs: [posix(relative(REPO, logPath))],
    _log: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log) },
  };
}

function scratchOf(dir) {
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-'));
  cpSync(dir, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rwX', scratch]);
  return scratch;
}

/** One Bench configuration: `docker run --rm` with the scratch copy at /w. */
function benchConfig(run, cfg, keep) {
  const scratch = scratchOf(run.inputs);
  const name = `ssrec-aud9-${run.id.slice(4).toLowerCase()}-${cfg.id}`.replace(/[^a-z0-9-]/g, '-');
  const argv = ['docker', 'run', '--rm', '--name', name, '--memory=6g', '--network', 'none', '-v', '<sandbox>/work:/w:ro', '-w', '/w', BENCH, ...cfg.cmd];
  const real = argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch));
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(real);
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  rmSync(scratch, { recursive: true, force: true });
  return finish(run, cfg, argv, started, duration, r.status, `${r.stdout}${r.stderr}`, keep);
}

/** One PostgreSQL configuration: start a server, wait for it, run psql on the script, remove the container. */
function pgConfig(run, cfg, keep) {
  const scratch = scratchOf(run.inputs);
  const name = `ssrec-aud9-${run.id.slice(4).toLowerCase()}-${cfg.id}`.replace(/[^a-z0-9-]/g, '-');
  const argv = [
    ['docker', 'run', '-d', '--name', name, '--memory=6g', '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-v', '<sandbox>/work:/q:ro', PG],
    ['docker', 'exec', name, 'sh', '-c', 'until pg_isready -U postgres -q && psql -X -U postgres -c "select 1" >/dev/null 2>&1; do sleep 0.5; done'],
    ['docker', 'exec', name, 'sh', '-c', `psql -X -U postgres -q -f /q/${cfg.script} 2>&1`],
    ['docker', 'rm', '-f', name],
  ];
  const real = (a) => a.slice(1).map((x) => x.replace('<sandbox>/work', scratch));
  docker(['rm', '-f', name]);
  const up = docker(real(argv[0]));
  if (up.status !== 0) throw new Error(`could not start ${name}: ${up.stderr}`);
  docker(real(argv[1]));
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(real(argv[2]));
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  docker(real(argv[3]));
  rmSync(scratch, { recursive: true, force: true });
  // A configuration's argv is one command (run@1); the record's top level keeps the whole sequence.
  return { ...finish(run, cfg, argv[2], started, duration, r.status, `${r.stdout}${r.stderr}`, keep), _argvAll: argv };
}

function write(run, configs, values, notes) {
  const primary = configs.find((c) => c.id === run.primary) ?? configs[0];
  const inputs = [];
  for (const c of configs) for (const i of c.inputs) if (!inputs.some((x) => x.path === i.path)) inputs.push(i);
  const record = {
    id: run.id,
    title: run.title,
    task: 'W5-T33',
    origin: 'recorded',
    records: run.records,
    engine: run.engine,
    version: run.version,
    version_string: run.versionString,
    binary: run.binary,
    binary_sha256: run.binarySha,
    image: run.image,
    recorded_at: new Date().toISOString(),
    started_at: primary.started_at,
    duration_s: primary.duration_s,
    argv: primary._argvAll ?? primary.argv,
    inputs,
    budget: { container_memory: '6g', network: 'none' },
    exit_code: primary.exit_code,
    verdict_lines: primary.verdict_lines,
    outputs: configs.map((c) => ({ ...c._log, kind: 'log' })),
    values,
    environment: environment(run.image),
    primary_config: primary.id,
    configs: configs.map(({ _log, _argvAll, ...c }) => c),
    notes: [
      "<sandbox>/work in argv stands for a scratch copy of the run's inputs/ folder, which holds the files as they ran.",
      "Each log is the container's output. verdict_lines are the lines of the log the recorder keeps (content/audit/tools/record-aud9.mjs), copied in log order.",
      ...notes,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${run.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${run.id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

// ------------------------------------------------------------------ RUN-lean-abort-blind

function recordLean() {
  const id = 'RUN-lean-abort-blind';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title:
      'Preservation with an observer blind to aborts: the conditional-write compiler satisfies it, and the run pair from (0, 0) with amount 1 (source aborts, compiled code commits) has equal balances and different outcomes',
    records:
      "S9.L4 cell 1 (SP-9.3) and AUD-9.1 (content/audit/AUD-9.1.yaml): the eight cases' preservation theorems, each elaborated with #print axioms, and the probe that evaluates each case's run pair and step-3 scenarios",
    engine: 'lean',
    version: '4.35.0',
    versionString: imageFact(BENCH, 'lean --version'),
    binary: `bin/lean of the Lean 4.35.0 toolchain in the statespace-bench image (${LEAN_BIN}, which elan resolves lean to)`,
    binarySha: imageFact(BENCH, `sha256sum ${LEAN_BIN} | cut -d' ' -f1`),
    image: BENCH,
    inputs: dir,
    primary: 'probe',
  };
  const keep = (l) => /depends on axioms|does not depend on any axioms|^lean exit=\d+$|^\[[pq]\d |error:/.test(l);
  const role = (p) => (p.endsWith('.sh') ? 'script' : 'source');
  const all = inputsOf(dir, role);
  const pick = (names) => all.filter((i) => names.some((n) => i.path.endsWith(`/${n}`)));
  const configs = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'probe'].map((c) =>
    benchConfig(
      run,
      {
        id: c,
        purpose:
          c === 'probe'
            ? "run.sh probe: each case's compiled code and observer; the run pair of each case under its own observer and under the outcome itself; the step-3 scenarios"
            : `run.sh ${c}: Defs.lean then ${c}.lean, the case's compile, obs and preservation, with #print axioms preservation`,
        cmd: ['sh', 'run.sh', c],
        inputs: pick(['Defs.lean', 'run.sh', `${c}.lean`]),
      },
      keep,
    ),
  );
  const values = { builds: {}, axioms: {}, pairs: {}, scenarios: {} };
  for (const c of configs) {
    if (c.id === 'probe') continue;
    values.builds[c.id] = Number(c.verdict_lines.find((l) => l.startsWith('lean exit='))?.split('=')[1] ?? NaN);
    values.axioms[c.id] = c.verdict_lines.find((l) => l.includes("'preservation'")) ?? null;
  }
  for (const l of configs.find((c) => c.id === 'probe').verdict_lines) {
    const p = /^\[(p\d) [^\]]*\] (the statement's obs equal|outcomes equal): (true|false)$/.exec(l);
    if (p) (values.pairs[p[1]] ??= {})[p[2] === 'outcomes equal' ? 'outcomes_equal' : 'obs_equal'] = p[3] === 'true';
    const s = /^\[(q\d) (s\d)\] (ruled out|not ruled out)$/.exec(l);
    if (s) (values.scenarios[s[1]] ??= {})[s[2]] = s[3] === 'ruled out';
  }
  write(run, configs, values, [
    'Every case file is appended to Defs.lean (run.sh), so the eight theorems share one source semantics, one IR and one view of the store. q1, q4, q5 and q8 observe the outcome (the error code, if any, and the balances); q2 observes the balances only, q3 whether the command aborted but not its code, q6 the sender\'s balance only, and q7 the total of the two balances.',
    "The probe evaluates, for each case, a run pair from one store: the source and the case's compiled code, under the case's own observer and under the outcome itself. p2 is S9.L4 cell 1: from (0, 0) with amount 1 the source aborts and the conditional-write code commits, with equal balances.",
    'A scenario line says whether the case\'s theorem, as written, rules out a given pair (the source run on a store, and a stated outcome for the compiled run): it does when the two observations differ.',
    'The S9.L4 listing leaves the positivity check out; the cases keep it (assertPos), unchanged in every case but q3 and q4.',
  ]);
}

// ------------------------------------------------------------------ RUN-pg-validator-pairs

function recordPg() {
  const id = 'RUN-pg-validator-pairs';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title:
      "AUD-9.2's validation methods on PostgreSQL 18.6: the shape checks accept both non-equivalent rewrites, a bounded replay finds 3 and 6 differing databases where the honest rewrite and plan differ on none of 9, and three more rewrites agree on the databases their reports tried and differ on others",
    records:
      "AUD-9.2 (content/audit/AUD-9.2.yaml): each case's validation method (template shape check, the fixture database, or a replay over a bounded family of databases), its first distinguishing database, and the step-3 scenarios",
    engine: 'postgresql',
    version: '18.6',
    versionString: null,
    binary: `postgres, the server binary of ${PG}`,
    binarySha: imageFact(PG, `sha256sum ${PG_BIN} | cut -d' ' -f1`),
    image: PG,
    inputs: dir,
    primary: 'validate',
  };
  const keep = (l) => /^PostgreSQL \d|^\[q\d+ |ERROR/.test(l);
  const cfg = pgConfig(
    run,
    {
      id: 'validate',
      purpose: 'validate.sql: the twelve cases tagged q1 to q12, their replays, shape checks, tried databases and scenarios',
      script: 'validate.sql',
      inputs: inputsOf(dir, () => 'script'),
    },
    keep,
  );
  run.versionString = cfg.verdict_lines.find((l) => l.startsWith('PostgreSQL ')) ?? null;
  cfg.version_string = run.versionString;
  const values = { replay: {}, shape: {}, scenarios: {} };
  for (const l of cfg.verdict_lines) {
    const r = /^\[(q\d+) (?:replay|tried)\] (\d+) databases, (\d+) differ$/.exec(l);
    if (r) values.replay[r[1]] = { databases: Number(r[2]), differ: Number(r[3]) };
    const s = /^\[(q\d+) shape\] .* \| (accepted|rejected)$/.exec(l);
    if (s) values.shape[s[1]] = s[2];
    const c = /^\[(q\d+) (s\d|fixture)\] (same|differ):/.exec(l);
    if (c) (values.scenarios[c[1]] ??= {})[c[2]] = c[3] === 'same';
  }
  write(run, [cfg], values, [
    "A plan's outcome is a commit with the table after it, or an abort when a statement touches other than one row (the plan's rowcount check, S9.L8), which rolls back; aborts compare by class. Every database is loaded, run and rolled back inside one function call.",
    "source() is the source command transfer 30 1 2, transcribed by hand into PL/pgSQL from S9's runS for this run, because the reference interpreter is not built yet (LAB-9.11). When it is, RUN-sql-shape-validator re-records q5 and q6 with the interpreter as the source side.",
    'shape() is the agent\'s template check: it reads a write\'s table, key literal and increment from the statement text with regular expressions, and never runs the statement.',
    'q7 to q12 are three rewrites checked only on the databases their reports name (the fixture, or three databases), and then on the step-3 scenarios: a hold guard (NOT IN rewritten as NOT EXISTS, with holds.acct_id nullable), a funds guard (bal >= 30 rewritten as bal - 30 > 0) and a balance report (coalesce(sum(bal), 0) rewritten as sum(bal)).',
    'The credit family is every database with ids in {1, 2}, each absent, at 0 or at 50 (9 databases); the plan family has accounts 1 and 2, each at 0, 30 or 50 (9 databases).',
  ]);
}

const want = process.argv.slice(2);
if (want.length === 0 || want.includes('RUN-lean-abort-blind')) recordLean();
if (want.length === 0 || want.includes('RUN-pg-validator-pairs')) recordPg();
