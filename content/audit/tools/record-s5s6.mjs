#!/usr/bin/env node
// Record the runs that key the S5 and S6 audit anchors (AUD-5.1 to AUD-6.3; content/audit/README.md section 5;
// runs/README.md section 3). Every engine runs in the pinned Bench image with --memory=6g on a scratch copy of the
// run's inputs; PostgreSQL 18.6 runs in the pinned postgres:18 image on a user network of its own, with unique
// container and network names. A record's verdict lines are filtered from the logs the run wrote, never typed.
//
//   node content/audit/tools/record-s5s6.mjs                 record every run below
//   node content/audit/tools/record-s5s6.mjs RUN-tlc-hold-kind
//
// Afterwards: node scripts/runs/build-index.mjs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TLC_SCRIPT, tlcRuns } from './s5s6-inputs.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const PG_IMAGE = 'postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336';
const TLC_JAR = '/opt/tla2tools/tla2tools-1.8.0.jar';
const SOUFFLE = '/usr/bin/souffle';
const LIBPQ_NOTE = 'psycopg 3.3.6 on the Bench image\'s Python 3.13';

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

const roleOf = (p) => (/\.(sh|py|dl)$/.test(p) ? 'script' : /\.(cfg|txt|toml|json)$/.test(p) ? 'config' : /\.facts$/.test(p) ? 'data' : 'source');
function inputsOf(dir) {
  return filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: roleOf(p) };
  });
}

function docker(args, opts = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  return r;
}

function imageFact(cmd, image = IMAGE) {
  return docker(['run', '--rm', '--network', 'none', image, 'sh', '-c', cmd]).stdout.trim();
}

function environment(container) {
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  return {
    os: spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim(),
    cpu_count: Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim()),
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(),
    container,
  };
}

function writeInputs(id, files) {
  const dir = join(REPO, 'runs', id, 'inputs');
  rmSync(dir, { recursive: true, force: true });
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  return dir;
}

function scratchOf(dir) {
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-s5s6-'));
  cpSync(dir, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rwX', scratch]);
  return scratch;
}

function saveLog(id, cfg, log) {
  const logPath = join(REPO, 'runs', id, `${cfg}.log`);
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, log);
  return { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log), kind: 'log' };
}

function writeRecord(rec) {
  const record = {
    id: rec.id,
    title: rec.title,
    task: 'W3-T13',
    task_label: rec.taskLabel,
    origin: 'recorded',
    records: rec.records,
    engine: rec.engine,
    version: rec.version,
    version_string: rec.versionString,
    binary: rec.binary,
    binary_sha256: rec.binarySha,
    image: rec.image,
    recorded_at: new Date().toISOString(),
    started_at: rec.started_at,
    duration_s: rec.duration_s,
    argv: rec.argv,
    inputs: rec.inputs,
    budget: rec.budget,
    exit_code: rec.exit_code,
    verdict_lines: rec.verdict_lines,
    outputs: rec.outputs,
    values: rec.values ?? {},
    environment: environment(rec.container),
    ...(rec.configs ? { primary_config: rec.configs[0].id, configs: rec.configs } : {}),
    notes: rec.notes,
  };
  writeFileSync(join(REPO, 'runs', `${rec.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${rec.id}: exit ${rec.exit_code}, ${rec.verdict_lines.length} verdict lines\n`);
}

// ------------------------------------------------------------------ TLC

const TLC_TITLES = {
  'RUN-tlc-hold-kind': ["AUD-5.1's cases: one hold lifecycle checked for EventuallyResolves (q1) and for TypeOK (q2), the Payout variant (q3, q4), and each case's check run on the spec with each scenario's edit", 'AUD-5.1 (content/audit/AUD-5.1.yaml): the pair, variant pair v1, and every step-3 scenario'],
  'RUN-tlc-hold-env': ["AUD-5.2's cases: EventuallyResolves under fairness on Timeout (q1) and on Try and the provider's Capture (q2), the Payout variant (q3, q4), each re-checked with environment actions removed", 'AUD-5.2 (content/audit/AUD-5.2.yaml): the pair, variant pair v1, the removed-assumption check x1, and every step-3 scenario'],
  'RUN-tlc-deadlock-stop': ["AUD-5.3's cases: the Withdraw model at Amount 40 (q1) and 80 (q2) under TLC's default flags, q2 with -deadlock (q3), and Sym's liveness check with SYMMETRY (q4) and without (q5)", 'AUD-5.3 (content/audit/AUD-5.3.yaml): the pair, variant pair v2, and the -deadlock re-run'],
  'RUN-tlc-split-guard': ["AUD-5.4's variant pair: the Transfer action split into Read and Write, with the guard kept in the write (q1) or the write of the value read (q2), under three sets of constants", 'AUD-5.4 (content/audit/AUD-5.4.yaml): variant pair v1 and its step-3 scenarios'],
};

function recordTlc(id) {
  const { files, jobs } = tlcRuns()[id];
  const jobsTxt = jobs.map((j) => j.join('|')).join('\n') + '\n';
  const dir = writeInputs(id, { ...files, 'jobs.txt': jobsTxt, 'run.sh': TLC_SCRIPT });
  const scratch = scratchOf(dir);
  const name = `ssrec-s5s6-${id.slice(4).toLowerCase()}`;
  const argv = ['docker', 'run', '--rm', '--name', name, '--memory=6g', '--network', 'none', '-v', '<sandbox>/work:/w', '-w', '/w', IMAGE, 'sh', 'run.sh'];
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch)));
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  rmSync(scratch, { recursive: true, force: true });
  const log = `${r.stdout}${r.stderr}`;
  const out = saveLog(id, 'tlc', log);
  const keep = (l) => /^\[[a-z0-9 ]+\] (Error:|Warning: Declaring|State \d+:|Back to state|Model checking completed|\d+ states generated|exit=|TLC2 Version)/.test(l);
  const verdict = log.split('\n').filter(keep);
  const values = {};
  for (const l of verdict) {
    const m = /^\[([a-z0-9 ]+)\] (.*)$/.exec(l);
    const v = (values[m[1]] ??= {});
    if (/^Model checking completed/.test(m[2])) v.result = 'no error';
    else if (/^Error: Deadlock reached/.test(m[2])) v.result ??= 'deadlock';
    else if (/^Error: (Invariant|Temporal property) (\S+) (is|was) violated/.test(m[2])) v.result ??= `violated: ${/^Error: (?:Invariant|Temporal property) (\S+)/.exec(m[2])[1]}`;
    else if (/^\d+ states generated/.test(m[2])) v.distinct = Number(/(\d+) distinct/.exec(m[2])[1]);
  }
  const [title, records] = TLC_TITLES[id];
  writeRecord({
    id, title, records, taskLabel: 'W3-T13 (AUD-5.x anchors)',
    engine: 'tlc', version: '1.8.0', versionString: verdict.find((l) => l.includes('TLC2 Version'))?.replace(/^\[[^\]]*\] /, '') ?? null,
    binary: `tla2tools-1.8.0.jar in the statespace-bench image (${TLC_JAR})`, binarySha: imageFact(`sha256sum ${TLC_JAR} | cut -d' ' -f1`),
    image: IMAGE, started_at: started.toISOString(), duration_s: Math.round(duration * 1000) / 1000, argv,
    inputs: inputsOf(dir), budget: { container_memory: '6g', network: 'none', workers: 1 },
    exit_code: r.status, verdict_lines: verdict, outputs: [out], values,
    container: { image: IMAGE, user: 'uid 1000 (learner)' },
    notes: [
      '<sandbox>/work in argv stands for a scratch copy of this run\'s inputs/ folder, mounted read-write at /w (TLC writes trace files beside the specs).',
      'run.sh runs TLC once per line of jobs.txt (tag|dir|module|cfg|flags) and prefixes every line TLC prints with "[tag] ", then the exit status as "[tag] exit=N". verdict_lines are the log lines content/audit/tools/record-s5s6.mjs keeps, in log order.',
      'Tags are neutral: q1, q2, ... name a case\'s check; a second word (s1, t1, c1, x1) names a scenario\'s edit of that case\'s module, which content/audit/tools/s5s6-inputs.mjs applies and the inputs folder holds as it ran.',
    ],
  });
}

// ------------------------------------------------------------------ PostgreSQL

function waitReady(name) {
  for (let i = 0; i < 120; i++) {
    const logs = docker(['logs', name]);
    const ready = (`${logs.stdout}${logs.stderr}`.match(/database system is ready to accept connections/g) ?? []).length;
    if (ready >= 2 && docker(['exec', name, 'pg_isready', '-h', '127.0.0.1']).status === 0) return;
    spawnSync('sleep', ['0.5']);
  }
  throw new Error(`${name} never became ready`);
}

/** Start a fresh server on its own network, run the driver configurations in the Bench image, tear down. */
function recordPg(id, spec) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const net = `ssrec-net-${spec.short}`;
  const pg = `ssrec-pg-${spec.short}`;
  docker(['rm', '-f', pg]);
  docker(['network', 'rm', net]);
  const argvAll = [['docker', 'network', 'create', net], ['docker', 'run', '-d', '--rm', '--name', pg, '--network', net, '--memory=6g', '-e', 'POSTGRES_PASSWORD=x', PG_IMAGE]];
  docker(argvAll[0].slice(1));
  docker(argvAll[1].slice(1));
  const configs = [];
  const outputs = [];
  try {
    waitReady(pg);
    for (const cfg of spec.configs) {
      const scratch = scratchOf(dir);
      const argv = ['docker', 'run', '--rm', '--name', `ssrec-${spec.short}-${cfg.id}`, '--memory=6g', '--network', net, '-v', '<sandbox>/work:/w', '-w', '/w', '-e', `PGHOST=${pg}`, '-e', 'PGUSER=postgres', '-e', 'PGPASSWORD=x', IMAGE, ...cfg.cmd];
      argvAll.push(argv);
      const started = new Date();
      const t0 = process.hrtime.bigint();
      const r = docker(argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch)));
      const duration = Number(process.hrtime.bigint() - t0) / 1e9;
      rmSync(scratch, { recursive: true, force: true });
      const log = `${r.stdout}${r.stderr}`;
      const out = saveLog(id, cfg.id, log);
      outputs.push(out);
      configs.push({
        id: cfg.id, origin: 'recorded', purpose: cfg.purpose, engine: 'postgresql', version: '18.6', image: PG_IMAGE,
        started_at: started.toISOString(), duration_s: Math.round(duration * 1000) / 1000, argv,
        inputs: inputsOf(dir), budget: { container_memory: '6g', network: net }, exit_code: r.status,
        verdict_lines: log.split('\n').filter(spec.keep), outputs: [out.path],
      });
    }
  } finally {
    argvAll.push(['docker', 'stop', pg], ['docker', 'network', 'rm', net]);
    docker(['stop', pg]);
    docker(['network', 'rm', net]);
  }
  const primary = configs[0];
  const versionString = imageFact('postgres --version', PG_IMAGE);
  writeRecord({
    id, title: spec.title, records: spec.records, taskLabel: spec.taskLabel,
    engine: 'postgresql', version: '18.6', versionString,
    binary: `the postgres server of ${PG_IMAGE}`, binarySha: imageFact('sha256sum "$(command -v postgres)" | cut -d" " -f1', PG_IMAGE),
    image: PG_IMAGE, started_at: primary.started_at, duration_s: primary.duration_s, argv: argvAll,
    inputs: inputsOf(dir), budget: { container_memory: '6g', network: net },
    exit_code: primary.exit_code, verdict_lines: primary.verdict_lines, outputs, values: spec.values?.(configs) ?? {},
    container: { server: PG_IMAGE, client: IMAGE, client_user: 'uid 1000 (learner)', driver: LIBPQ_NOTE },
    configs,
    notes: [
      `The server ran in ${PG_IMAGE} on the user network ${net} with --memory=6g; before the first driver started, the recorder waited until docker logs showed "database system is ready to accept connections" twice and pg_isready -h 127.0.0.1 exited 0 (at most 120 polls, 0.5 s apart). argv lists the commands in order; each configuration's argv, started_at, duration_s and exit_code are its driver's.`,
      '<sandbox>/work in argv stands for a fresh scratch copy of this run\'s inputs/ folder, mounted read-write at /w.',
      ...spec.notes,
    ],
  });
}

const PG_RUNS = {
  'RUN-pg-withdraw-split': {
    short: 'wsplit',
    title: "AUD-5.4's pair on PostgreSQL 18.6 at READ COMMITTED: withdraw as one conditional UPDATE (q1) and as SELECT, check, UPDATE (q2), each run by two sessions interleaved (p1) and one after the other (p2)",
    records: 'AUD-5.4 (content/audit/AUD-5.4.yaml): the pair members\' receipts, keys and step-3 scenarios',
    taskLabel: 'W3-T13 (AUD-5.4)',
    configs: [
      { id: 'q1', purpose: 'withdraw_q1.py: the conditional UPDATE, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'withdraw_q1', 'q1'] },
      { id: 'q2', purpose: 'withdraw_q2.py: SELECT, check in Python, UPDATE, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'withdraw_q2', 'q2'] },
    ],
    keep: (l) => /^\[q\d( p\d)?\] /.test(l),
    notes: ['gated.py runs the module\'s withdraw(conn, acct, amount) unchanged in two threads, a and b, each with its own connection at READ COMMITTED, and gates every statement and every commit on a schedule: p1 interleaves the two sessions statement by statement, p2 runs a to its commit and then b. A step still running after 1 s is reported as waiting and the schedule moves on, as isolationtester does. spent is the sum of the amounts whose withdraw returned True.'],
  },
  'RUN-drt-transfers': {
    short: 'drt',
    title: 'Differential random testing of the compiled transfer on PostgreSQL 18.6 against the reference semantics in reference.py: 200 seeded commands under the outcome-class observer and the balance-only observer, for the shipped compiler and five mutants, and the one-command fixture test',
    records: 'AUD-6.1 and AUD-6.2 (content/audit/AUD-6.1.yaml, AUD-6.2.yaml): the pair members\' receipts, keys and step-3 scenarios, and their variant pairs',
    taskLabel: 'W4-T13 (AUD-6.1, AUD-6.2)',
    configs: [{ id: 'drt', purpose: 'drt.py: every observer against every compiler, n = 200, seed 7; then the fixture test', cmd: ['python3', '-I', 'drt.py'] }],
    keep: (l) => /^\[(q\d|m\d|fixture)[^\]]*\] /.test(l) || /^server: /.test(l) || /^generator /.test(l),
    notes: [
      'reference.py stands in for the course\'s reference interpreter, which is not built yet: a transfer of amt from src to dst is refused (bad-amount, no-such-account, self-transfer, insufficient) or moves amt; the harness maps a refusal to the outcome class zero-rows, the class the compiled statement gives a refused transfer.',
      'The compiled transfer is one UPDATE (compiled.py, shipped) whose rowcount is 2 for a transfer it applies and 0 for one it refuses; m1 to m5 are mutants of the compiler, named in compiled.py, used to show what each observer can see. Commands run in one sequence, each on the state the previous left, in both the reference and the database.',
    ],
  },
  'RUN-pg-pool-levels': {
    short: 'pool',
    title: "AUD-6.3's pair on PostgreSQL 18.6: the guarded team debit with both writer pools at serializable (q1) and with the team-limits pool at read committed (q2), interleaved (p1) and one after the other (p2), with each session's transaction_isolation read back",
    records: 'AUD-6.3 (content/audit/AUD-6.3.yaml): the pair members\' receipts and step-3 scenarios; the histories RUN-history-g2item checks',
    taskLabel: 'W4-T13 (AUD-6.3)',
    configs: ['q1', 'q2'].flatMap((q) => ['p1', 'p2'].map((p) => ({
      id: `${q}-${p}`,
      purpose: `iso_driver.py on pool.spec, ${q === 'q1' ? 'both pools serializable' : 'session b\'s pool at read committed'}, permutation ${p}`,
      cmd: ['sh', '-c', `python3 -I iso_driver.py --spec pool.spec --setup setup.sql --check "SELECT id, bal FROM acct ORDER BY id; SELECT sum(bal) AS team_total FROM acct WHERE team = 1" --perm "$(sed -n 's/^# ${p}: //p' pool.spec)"${q === 'q2' ? ` --subst "b_pool:'serializable'=>'read committed'"` : ''} --label ${q}-${p} --out ${q}-${p}.json 2>&1 | sed "s/^/[${q} ${p}] /"`],
    }))),
    keep: (l) => /^\[q\d p\d\] /.test(l),
    notes: ['iso_driver.py is RUN-pg-mixed-levels\'s driver, copied unchanged: it replays an isolationtester-format cell with psycopg, one connection per session in autocommit mode, BEGIN and COMMIT as steps, a step reported as waiting once pg_isolation_test_session_is_blocked says so, and the check query on a separate connection after both sessions finish. isolationtester itself was not run. The q2 configurations change b_pool\'s level with the driver\'s --subst, the one line the pair differs in.'],
  },
};

// ------------------------------------------------------------------ Souffle

function recordHistory() {
  const id = 'RUN-history-g2item';
  const dir = join(REPO, 'runs', id, 'inputs');
  const scratch = scratchOf(dir);
  const argv = ['docker', 'run', '--rm', '--name', 'ssrec-s5s6-history-g2item', '--memory=6g', '--network', 'none', '-v', '<sandbox>/work:/w', '-w', '/w', IMAGE, 'sh', 'run.sh'];
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch)));
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  rmSync(scratch, { recursive: true, force: true });
  const log = `${r.stdout}${r.stderr}`;
  const out = saveLog(id, 'souffle', log);
  const verdict = log.split('\n').filter((l) => /^\[h\d\] /.test(l) || /^souffle /.test(l));
  writeRecord({
    id,
    title: 'Souffle 2.5 reads three transaction histories as dependency graphs: the toy G2-item history of Jepsen\'s PostgreSQL 12.3 report (h1) and AUD-6.3\'s two recorded PostgreSQL 18.6 histories, read committed (h2) and serializable (h3); it finds a cycle of anti-dependencies in h1 and h2 and none in h3',
    records: 'SP-6.11 (the dated-incident toy history) and AUD-6.3 (content/audit/AUD-6.3.yaml): the history checks behind the flawed member\'s key',
    taskLabel: 'W4-T13 (AUD-6.3)',
    engine: 'souffle', version: '2.5', versionString: imageFact(`${SOUFFLE} --version | sed -n 's/^Version: //p'`),
    binary: `souffle in the statespace-bench image (${SOUFFLE})`, binarySha: imageFact(`sha256sum ${SOUFFLE} | cut -d' ' -f1`),
    image: IMAGE, started_at: started.toISOString(), duration_s: Math.round(duration * 1000) / 1000, argv,
    inputs: inputsOf(dir), budget: { container_memory: '6g', network: 'none' },
    exit_code: r.status, verdict_lines: verdict, outputs: [out], values: {},
    container: { image: IMAGE, user: 'uid 1000 (learner)' },
    notes: [
      'The facts are written by hand, one file per history (inputs/hN/), each line traced in a comment of history.md to the run log it comes from: h1 to the shape of the G2-item anomaly Jepsen reported (https://jepsen.io/analyses/postgresql-12.3), not to Jepsen\'s own history files; h2 and h3 to RUN-pg-pool-levels q2-p1 and q1-p1.',
      'g2.dl derives write-read, write-write and read-write (anti-dependency) edges between committed transactions from the reads and the version order of the writes (Adya\'s direct serialization graph), and reports a cycle that contains a read-write edge as g2item. run.sh runs souffle once per history and prefixes each output line with "[hN] ".',
    ],
  });
}

const want = process.argv.slice(2);
const on = (id) => want.length === 0 || want.includes(id);
for (const id of Object.keys(TLC_TITLES)) if (on(id)) recordTlc(id);
for (const [id, spec] of Object.entries(PG_RUNS)) if (on(id)) {
  if (!existsSync(join(REPO, 'runs', id, 'inputs'))) throw new Error(`${id}: runs/${id}/inputs/ is missing`);
  recordPg(id, spec);
}
if (on('RUN-history-g2item')) recordHistory();
