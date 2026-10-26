#!/usr/bin/env node
// Record the runs that key the Audit Desk's S7 and S8 anchors, AUD-7.1, AUD-7.2, AUD-8.1 and AUD-8.2
// (content/audit/README.md section 5; runs/README.md section 3). Each configuration runs in the pinned Bench image
// with no network and a 6 GB cap, on a scratch copy of runs/<RUN-id>/inputs/; its log goes to
// runs/<RUN-id>/<config>.log and the record's verdict lines are filtered from that log, never typed.
//
//   node content/audit/tools/record-keys-s7-s8.mjs                       record every run below
//   node content/audit/tools/record-keys-s7-s8.mjs RUN-tlc-trace-drift
//
// Afterwards: node scripts/runs/build-index.mjs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const LIBZ3 = '/opt/venv/lib/python3.13/site-packages/z3/lib/libz3.so';
const TLA_JAR = '/opt/tla2tools/tla2tools-1.8.0.jar';

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

function inputsOf(dir, role) {
  return filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: role(p) };
  });
}

function docker(args) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}

const imageFact = (cmd) => docker(['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', cmd]).stdout.trim();

function environment(image = IMAGE, user = 'uid 1000 (learner)') {
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  return {
    os: spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim(),
    cpu_count: Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim()),
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(),
    container: { image, user },
  };
}

function runConfig(run, cfg, keep) {
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-'));
  cpSync(run.inputs, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rwX', scratch]);
  const name = `ssrec-audit-${run.id.slice(4).toLowerCase()}-${cfg.id}`.replace(/[^a-z0-9-]/g, '-');
  const argv = ['docker', 'run', '--rm', '--name', name, '--memory=6g', '--network', 'none', '-v', `<sandbox>/work:/w${cfg.writable ? '' : ':ro'}`, '-w', '/w', IMAGE, ...cfg.cmd];
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
    inputs: cfg.inputs,
    budget: { container_memory: '6g', network: 'none' },
    exit_code: r.status,
    verdict_lines: log.split('\n').filter(keep),
    outputs: [posix(relative(REPO, logPath))],
    _log: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log) },
  };
}

function write(run, configs, values, extra) {
  if (run.engine === 'tlc') {
    // the version as TLC printed it, from the banner line of the first log that has one
    const banner = configs.flatMap((c) => c.verdict_lines).map((l) => l.replace(/^\[[a-z]\d\] /, '')).find((l) => l.startsWith('TLC2 Version'));
    run.versionString = banner ?? null;
    run.version = (/TLC2 Version (\S+)/.exec(banner ?? '') ?? [])[1] ?? null;
    for (const c of configs) c.version = run.version;
  }
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
    image: run.envImage ?? IMAGE,
    recorded_at: new Date().toISOString(),
    started_at: primary.started_at,
    duration_s: primary.duration_s,
    argv: run.argv ?? primary.argv,
    inputs,
    budget: { container_memory: '6g', network: 'none' },
    exit_code: primary.exit_code,
    verdict_lines: primary.verdict_lines,
    outputs: configs.map((c) => ({ ...c._log, kind: 'log' })),
    values,
    environment: run.envImage ? environment(run.envImage, run.envUser) : environment(),
    primary_config: primary.id,
    configs: configs.map(({ _log, ...c }) => c),
    notes: [
      "<sandbox>/work in argv stands for a scratch copy of the files listed in the configuration's inputs, mounted at /w; the inputs are kept under this run's inputs/ folder as they ran.",
      "Each log is the container's stdout followed by its stderr. verdict_lines are the lines of the log the recorder keeps (content/audit/tools/record-keys-s7-s8.mjs), copied in log order.",
      ...extra,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${run.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${run.id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

const z3Facts = () => ({
  engine: 'z3',
  version: '5.3.1',
  versionString: imageFact('python3 -c "import z3; print(z3.get_full_version())"'),
  binary: `libz3.so of the z3-solver 5.3.1 wheel in the statespace-bench image (${LIBZ3})`,
  binarySha: imageFact(`sha256sum ${LIBZ3} | cut -d' ' -f1`),
});

const tlcFacts = () => {
  return {
    engine: 'tlc',
    version: null, // set by write() from the banner TLC printed in the run's own logs
    versionString: null,
    binary: `tla2tools-1.8.0.jar in the statespace-bench image (${TLA_JAR})`,
    binarySha: imageFact(`sha256sum ${TLA_JAR} | cut -d' ' -f1`),
  };
};

/** Values for a Z3 script whose lines read "[tag what] verdict ...". */
function z3Values(lines) {
  const values = {};
  for (const l of lines) {
    const m = /^\[(q\d) ([a-z0-9]+)[^\]]*\] (\S+)/.exec(l);
    if (!m) continue;
    values[m[1]] ??= {};
    values[m[1]][m[2]] = m[3];
  }
  return values;
}

// ------------------------------------------------------------------ the runs

function recordZ3(id, script, title, records, task, extra) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = { id, title, records, task, ...z3Facts(), inputs: dir, primary: 'bench' };
  const keep = (l) => /^\[q\d[^\]]*\] /.test(l) || /^z3 \d/.test(l);
  const cfg = runConfig(run, { id: 'bench', purpose: `${script}: the queries of ${records.split(' ')[0]}'s cases`, cmd: ['python3', '-I', script], inputs: inputsOf(dir, () => 'script') }, keep);
  write(run, [cfg], z3Values(cfg.verdict_lines), [`Every query runs under rlimit 5000000. Tags q1 to q4 are neutral: the anchor file says which case each tag is (${records.split(' ')[0]}).`, ...extra]);
}

function recordObserver() {
  recordZ3(
    'RUN-z3-observer-pairs',
    'observer.py',
    "AUD-7.1's cases: each self-composition query is unsat under the case's own observer; under the whole response a client reads, q2 and q3 are sat with a distinguishing pair and q1 and q4 stay unsat",
    'AUD-7.1 (content/audit/AUD-7.1.yaml): the self-composition, premise and client-observer queries of the pair and variant pair v1, and each step-3 scenario evaluated under the case\'s observer',
    'W4-T13',
    ['The Search model is RUN-z3-count-channel\'s (three document slots, the same Rel); the Open model is S7.L6 cell 2\'s (RUN-z3-selfcomp). A scenario line evaluates the case\'s observer on two concrete responses.'],
  );
}

function recordDeclassify() {
  recordZ3(
    'RUN-z3-declassify-pairs',
    'declassify.py',
    "AUD-7.2's cases: every isolation query is unsat with its premises sat; on concrete changes Acme's view shows, the relations with a declassification allow the share and the count, and the blanket relations forbid them",
    'AUD-7.2 (content/audit/AUD-7.2.yaml): the proof and premise queries of the pair and variant pair v1, and each step-3 change judged by the case\'s relation',
    'W4-T13',
    ['A change is "allows" when the two worlds are not related, so the statement lets Acme see the difference, and "forbids" when they are related, so the statement requires Acme\'s view to stay the same.'],
  );
}

function recordEnv() {
  const id = 'RUN-tlc-env-assumption';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title: "AUD-8.1's cases: the outbox model passes TLC with the provider's idempotency and horizon set in the configuration, whether or not the claim states them; the same model double-charges under a provider that prunes a key at ack or does not dedup, and the crash-free model double-charges once a crash or a timer re-send is allowed",
    records: "AUD-8.1 (content/audit/AUD-8.1.yaml): TLC on each case's own configuration (q1 to q4) and on the step-3 scenarios' environments (e1 to e4 for the pair, f1 to f4 for variant pair v1)",
    task: 'W5-T11',
    ...tlcFacts(),
    inputs: dir,
    primary: 'q1',
  };
  const keep = (l) => /^\[[a-z]\d\] (TLC2 Version|Model checking completed|Error: |State \d+: |\d+ states generated|The depth of)/.test(l);
  const role = (p) => (p.endsWith('.sh') ? 'script' : p.endsWith('.cfg') ? 'config' : 'spec');
  const base = inputsOf(dir, role).filter((i) => !i.path.endsWith('.cfg'));
  const tags = ['q1', 'q2', 'q3', 'q4', 'e1', 'e2', 'e3', 'e4', 'f1', 'f2', 'f3', 'f4'];
  const configs = tags.map((t) =>
    runConfig(run, { id: t, purpose: `run.sh ${t}: TLC on ${t}.cfg`, cmd: ['sh', 'run.sh', t], writable: true, inputs: [...base, ...inputsOf(dir, role).filter((i) => i.path.endsWith(`/${t}.cfg`))] }, keep),
  );
  const values = Object.fromEntries(configs.map((c) => [c.id, c.verdict_lines.some((l) => l.includes('No error has been found')) ? 'no error' : c.verdict_lines.some((l) => l.includes('Invariant NoDoubleCharge is violated')) ? 'NoDoubleCharge violated' : 'other']));
  write(run, configs, values, [
    'Outbox.tla is S8.L2 cell 1 verbatim (as in RUN-tlc-double-charge); OutboxIface.tla is the W0-S04 spike module those runs use. Each configuration is a TLC .cfg file whose leading \\* comment lines are the case\'s claim text; TLC ignores them.',
    'run.sh runs TLC 1.8.0 with one worker and -deadlock (the deadlock check off), as S8.L3 does, and prefixes each output line with the configuration\'s tag.',
  ]);
}

function recordTrace() {
  const id = 'RUN-tlc-trace-drift';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title: "AUD-8.2's cases: four versions of a minimal Rust outbox simulator all pass their end-state suite; TLC's trace validation accepts the seed-1 traces of the two that reorder steps the spec allows in either order, and rejects ack-before-persist at line 5 and dispatch-before-commit at line 1",
    records: "AUD-8.2 (content/audit/AUD-8.2.yaml): per case, rustc --test and the suite, the simulator's seed-1 NDJSON trace, and TLC trace validation of that trace against the Outbox spec",
    task: 'W5-T11',
    ...tlcFacts(),
    inputs: dir,
    primary: 'q2',
  };
  run.binary = `${run.binary}; the simulator is built by rustc in the same image (${imageFact('rustc --version')})`;
  const keep = (l) =>
    /^\[q\d\] (TLC2 Version|Model checking completed|Error: |\d+ states generated|test |running \d+ tests|seed \d+:|<<"trace-validation")/.test(l) || /^\[q\d\]\s+\d+\t\{/.test(l);
  const role = (p) => (p.endsWith('.sh') ? 'script' : p.endsWith('.cfg') ? 'config' : p.endsWith('.rs') ? 'simulator source' : 'spec');
  const all = inputsOf(dir, role);
  const shared = all.filter((i) => !/\/(q\d\.cfg|worker_\w+\.rs)$/.test(i.path));
  const configs = ['q1', 'q2', 'q3', 'q4'].map((q) =>
    runConfig(
      run,
      { id: q, purpose: `run.sh ${q}: build with worker_${q}.rs, run the suite, write the seed-1 trace, validate it with TLC`, cmd: ['sh', 'run.sh', q], writable: true, inputs: [...shared, ...all.filter((i) => i.path.endsWith(`/${q}.cfg`) || i.path.endsWith(`/worker_${q}.rs`))] },
      keep,
    ),
  );
  const values = {};
  for (const c of configs) {
    const v = c.verdict_lines.find((l) => l.includes('"trace-validation"')) ?? '';
    values[c.id] = {
      suite: c.verdict_lines.find((l) => l.includes('test result:'))?.replace(/^\[q\d\] /, '') ?? null,
      verdict: (/verdict \|-> "(\w+)"/.exec(v) ?? [])[1] ?? null,
      first_unmatched: Number((/first_unmatched \|-> (\d+)/.exec(v) ?? [])[1] ?? NaN),
    };
  }
  write(run, configs, values, [
    'sim.rs is a minimal simulator written for this record: one command, a fault-free schedule (seed 1), the provider\'s step unlogged, and the NDJSON event shape of S8.L6. It is not the course\'s reference simulator (LAB-8), which RUN-tlc-trace-validation will record; worker_base.rs is the worker before the agent\'s change, and worker_q1.rs to worker_q4.rs are the four cases\' workers, each one swap of two adjacent lines of it.',
    'OutboxTrace.tla is S8.L6 cell 2 without its "\\* run:" comment line; TraceValidation.tla is the W0-S13 spike module (scripts/spikes/W0-S13/specs/), whose verdict comes from the highest line any behavior reached. Outbox.tla and OutboxIface.tla are as in RUN-tlc-double-charge. Cmds is {"c1"}, a string, because the trace\'s JSON carries strings.',
    'run.sh prefixes every output line with the case\'s tag; the trace is printed with cat -n, so a trace line in the log is the tag, its line number, a tab and the JSON object.',
  ]);
}

const PG_IMAGE = 'postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336';

function recordPg() {
  const id = 'RUN-pg-observer-pairs';
  const dir = join(REPO, 'runs', id, 'inputs');
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-'));
  cpSync(dir, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rX', scratch]);
  const name = `ssrec-audit-pg-observer-pairs-${process.pid}`;
  const start = ['docker', 'run', '-d', '--name', name, '--memory=6g', '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-v', '<sandbox>/work:/q:ro', PG_IMAGE];
  const exec = ['docker', 'exec', name, 'sh', '/q/run.sh'];
  const remove = ['docker', 'rm', '-f', name];
  const real = (a) => a.slice(1).map((x) => (x.startsWith('<sandbox>/work') ? x.replace('<sandbox>/work', scratch) : x));
  docker(['rm', '-f', name]);
  const up = docker(real(start));
  if (up.status !== 0) throw new Error(`postgres did not start: ${up.stderr}`);
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    const logs = docker(['logs', name]);
    const n = (`${logs.stdout}${logs.stderr}`.match(/database system is ready to accept connections/g) ?? []).length;
    ready = n >= 2 && docker(['exec', name, 'pg_isready', '-U', 'postgres']).status === 0;
    if (!ready) spawnSync('sleep', ['0.5']);
  }
  if (!ready) throw new Error('postgres never became ready');
  const versionString = docker(['exec', name, 'postgres', '--version']).stdout.trim();
  const binarySha = docker(['exec', name, 'sh', '-c', 'sha256sum "$(command -v postgres)" | cut -d" " -f1']).stdout.trim();
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(real(exec));
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  docker(real(remove));
  rmSync(scratch, { recursive: true, force: true });
  const log = `${r.stdout}${r.stderr}`;
  const logPath = join(REPO, 'runs', id, 'pairs.log');
  writeFileSync(logPath, log);
  const keep = (l) => /^\[q\d [a-z0-9]+\] /.test(l);
  const role = (p) => (p.endsWith('.sh') ? 'script' : p.includes('/scenarios/') ? 'scenario response' : 'sql');
  const verdict = log.split('\n').filter(keep);
  const cfg = {
    id: 'pairs',
    origin: 'recorded',
    purpose: "run.sh: each case's schema in two worlds, frank's two commands, the pair check under the case's observer, and the step-3 scenarios",
    engine: 'postgresql',
    version: (/PostgreSQL\) (\S+)/.exec(versionString) ?? [])[1] ?? null,
    binary_sha256: binarySha,
    image: PG_IMAGE,
    started_at: started.toISOString(),
    duration_s: Math.round(duration * 1000) / 1000,
    argv: exec,
    inputs: inputsOf(dir, role),
    budget: { container_memory: '6g', network: 'none' },
    exit_code: r.status,
    verdict_lines: verdict,
    outputs: [posix(relative(REPO, logPath))],
    _log: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log) },
  };
  const values = {};
  for (const l of verdict) {
    const m = /^\[(q\d) (pair|s\d)\] (?:w1 and w2 observations )?(\w+)$/.exec(l);
    if (m) (values[m[1]] ??= {})[m[2]] = m[3];
  }
  const run = {
    id,
    title: "AUD-7.1's SQL variant pair: under a rows-only observer frank's two worlds look equal while his insert fails with 23505 in one and succeeds in the other; with a per-tenant unique key both inserts succeed and the whole-response observer sees equal worlds",
    records: "AUD-7.1 (content/audit/AUD-7.1.yaml) variant pair v2: the pair check of q5 and q6 in PostgreSQL 18.6 with row security, and the step-3 scenarios under each case's observer",
    task: 'W4-T13',
    engine: 'postgresql',
    version: cfg.version,
    versionString,
    binary: `the postgres server binary in ${PG_IMAGE}`,
    binarySha,
    primary: 'pairs',
    argv: [start, exec, remove],
    envImage: PG_IMAGE,
    envUser: 'postgres (the image\'s superuser), via docker exec',
  };
  const rec = { ...run };
  write({ ...rec, inputs: dir }, [cfg], values, [
    `One fresh server: docker run -d of ${PG_IMAGE} with --network none, --memory=6g and trust authentication, the inputs mounted read-only at /q; the recorder waited until docker logs showed "database system is ready to accept connections" twice and pg_isready exited 0, ran run.sh through docker exec as the superuser postgres, and removed the container. argv lists the three commands (the configuration's argv is the docker exec); started_at, duration_s and exit_code are run.sh's.`,
    'run.sh creates one database per case and world, runs frank.sql as the role frank with app.tenant = acme and psql -v VERBOSITY=verbose (so an error carries its SQLSTATE), and prefixes each output line with the case and world. The pair check and the scenarios compare the case\'s observation of two responses: q5 keeps the rows only, q6 every line.',
    'The worlds follow RUN-pg-rls-covert\'s specimen (SP-7.5): Birch\'s private layoffs-memo exists in world 1 only. The schema is written for this record, smaller than scripts/spikes/W0-S08/rls-spec.mjs\'s.',
  ]);
}

const want = process.argv.slice(2);
const pick = (id) => want.length === 0 || want.includes(id);
if (pick('RUN-z3-observer-pairs')) recordObserver();
if (pick('RUN-z3-declassify-pairs')) recordDeclassify();
if (pick('RUN-tlc-env-assumption')) recordEnv();
if (pick('RUN-tlc-trace-drift')) recordTrace();
if (pick('RUN-pg-observer-pairs')) recordPg();
