#!/usr/bin/env node
// Record the runs that key the exemplar variant pairs added to fill each class to six (content/audit/README.md
// sections 4 and 5; runs/README.md section 3), and the cases keyed by spine section 6.2's own runs for AUD-7.2,
// AUD-8.2 and AUD-9.2. Every engine runs in the pinned Bench image with --memory=6g on a scratch copy of the run's
// inputs (runs/<RUN-id>/inputs/, written by hand and committed); PostgreSQL 18.6 runs in the pinned postgres:18
// image on a user network of its own, with unique container and network names. A record's verdict lines are
// filtered from the logs the run wrote, never typed.
//
//   node content/audit/tools/record-exemplars.mjs                       record every run below
//   node content/audit/tools/record-exemplars.mjs RUN-z3-cti-exemplars
//
// Afterwards: node scripts/runs/build-index.mjs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TLC_SCRIPT } from './s5s6-inputs.mjs';
import { tlcExemplarRuns } from './exemplar-tlc.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const PG_IMAGE = 'postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336';
const LIBZ3 = '/opt/venv/lib/python3.13/site-packages/z3/lib/libz3.so';
const TLC_JAR = '/opt/tla2tools/tla2tools-1.8.0.jar';
const TASK = 'W1-T33';

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
const roleOf = (p) => (/\.(sh|py)$/.test(p) ? 'script' : /\.(cfg|txt|toml|json)$/.test(p) ? 'config' : /\.sql$/.test(p) ? 'data' : 'source');
const inputsOf = (dir) =>
  filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: roleOf(p) };
  });

function docker(args) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}
const imageFact = (cmd, image = IMAGE) => docker(['run', '--rm', '--network', 'none', image, 'sh', '-c', cmd]).stdout.trim();

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

function scratchOf(dir) {
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-ex-'));
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

function waitReady(name) {
  for (let i = 0; i < 120; i++) {
    const logs = docker(['logs', name]);
    const ready = `${logs.stdout}${logs.stderr}`.split('database system is ready to accept connections').length - 1;
    if (ready >= 2 && docker(['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) return;
    spawnSync('sleep', ['0.5']);
  }
  throw new Error(`${name} never became ready`);
}

/** The repository files a run reads through its read-only mount at /r, hashed as they are now. */
function repoInputs(spec) {
  return (spec.repoFiles ?? []).map((p) => {
    const buf = readFileSync(join(REPO, p));
    return { path: p, sha256: sha(buf), bytes: buf.length, role: roleOf(p) === 'data' ? 'source' : roleOf(p) };
  });
}

const ENGINES = {
  z3: () => ({
    engine: 'z3',
    version: '5.3.1',
    versionString: imageFact('python3 -c "import z3; print(z3.get_full_version())"'),
    binary: `libz3.so of the z3-solver 5.3.1 wheel in the statespace-bench image (${LIBZ3})`,
    binarySha: imageFact(`sha256sum ${LIBZ3} | cut -d' ' -f1`),
    image: IMAGE,
  }),
  tlc: () => ({
    engine: 'tlc',
    version: '1.8.0',
    versionString: null,
    binary: `tla2tools-1.8.0.jar in the statespace-bench image (${TLC_JAR})`,
    binarySha: imageFact(`sha256sum ${TLC_JAR} | cut -d' ' -f1`),
    image: IMAGE,
  }),
  postgresql: () => ({
    engine: 'postgresql',
    version: '18.6',
    versionString: imageFact('postgres --version', PG_IMAGE),
    binary: `the postgres server of ${PG_IMAGE}`,
    binarySha: imageFact('sha256sum "$(command -v postgres)" | cut -d" " -f1', PG_IMAGE),
    image: PG_IMAGE,
  }),
};

/** One run: every configuration in the Bench image, with a fresh PostgreSQL server on its own network when the run needs one. */
function record(id, spec) {
  const dir = join(REPO, 'runs', id, 'inputs');
  if (spec.prepare) spec.prepare(dir);
  const eng = ENGINES[spec.engine]();
  const short = id.slice(4).toLowerCase();
  const net = `ssrec-net-${short}`;
  const pg = `ssrec-pg-${short}`;
  const argvAll = [];
  if (spec.pg) {
    docker(['rm', '-f', pg]);
    docker(['network', 'rm', net]);
    argvAll.push(['docker', 'network', 'create', net], ['docker', 'run', '-d', '--rm', '--name', pg, '--network', net, '--memory=6g', '-e', 'POSTGRES_PASSWORD=x', PG_IMAGE]);
    docker(argvAll[0].slice(1));
    docker(argvAll[1].slice(1));
  }
  const configs = [];
  const outputs = [];
  try {
    if (spec.pg) waitReady(pg);
    for (const cfg of spec.configs) {
      const scratch = scratchOf(dir);
      const network = spec.pg ? ['--network', net, '-e', `PGHOST=${pg}`, '-e', 'PGUSER=postgres', '-e', 'PGPASSWORD=x'] : ['--network', 'none'];
      const repo = spec.repo ? ['-v', '<repo>:/r:ro', '-e', 'PYTHONPATH=/r/bench', '-e', 'PYTHONDONTWRITEBYTECODE=1'] : [];
      const argv = ['docker', 'run', '--rm', '--name', `ssrec-ex-${short}-${cfg.id}`, '--memory=6g', ...network, ...repo, '-v', '<sandbox>/work:/w', '-w', '/w', IMAGE, ...cfg.cmd];
      argvAll.push(argv);
      const started = new Date();
      const t0 = process.hrtime.bigint();
      const r = docker(argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch).replace('<repo>', REPO)));
      const duration = Number(process.hrtime.bigint() - t0) / 1e9;
      rmSync(scratch, { recursive: true, force: true });
      const log = `${r.stdout}${r.stderr}`;
      const out = saveLog(id, cfg.id, log);
      outputs.push(out);
      configs.push({
        id: cfg.id,
        origin: 'recorded',
        purpose: cfg.purpose,
        engine: eng.engine,
        version: eng.version,
        binary_sha256: eng.binarySha,
        image: eng.image,
        started_at: started.toISOString(),
        duration_s: Math.round(duration * 1000) / 1000,
        argv,
        inputs: [...inputsOf(dir), ...repoInputs(spec)],
        budget: { container_memory: '6g', network: spec.pg ? net : 'none' },
        exit_code: r.status,
        verdict_lines: log.split('\n').filter(spec.keep),
        outputs: [out.path],
      });
    }
  } finally {
    if (spec.pg) {
      argvAll.push(['docker', 'stop', pg], ['docker', 'network', 'rm', net]);
      docker(['stop', pg]);
      docker(['network', 'rm', net]);
    }
  }
  const primary = configs[0];
  // TLC prints its version when it starts; a run whose TLC is started by another tool reads it from the image.
  const versionString =
    eng.versionString ??
    primary.verdict_lines.find((l) => l.includes('TLC2 Version'))?.replace(/^\[[^\]]*\] /, '') ??
    (spec.engine === 'tlc' ? imageFact(`cd /tmp && printf -- '---- MODULE V ----\\nVARIABLES x\\nInit == x = 0\\nNext == UNCHANGED x\\n====\\n' > V.tla && printf 'INIT Init\\nNEXT Next\\n' > V.cfg && java -cp ${TLC_JAR} tlc2.TLC -workers 1 V 2>&1 | head -1`) : null);
  const record = {
    id,
    title: spec.title,
    task: TASK,
    origin: 'recorded',
    records: spec.records,
    engine: eng.engine,
    version: eng.version,
    version_string: versionString,
    binary: eng.binary,
    binary_sha256: eng.binarySha,
    image: eng.image,
    recorded_at: new Date().toISOString(),
    started_at: primary.started_at,
    duration_s: primary.duration_s,
    argv: configs.length === 1 && !spec.pg ? primary.argv : argvAll,
    inputs: [...inputsOf(dir), ...repoInputs(spec)],
    budget: primary.budget,
    exit_code: primary.exit_code,
    verdict_lines: primary.verdict_lines,
    outputs,
    values: spec.values ? spec.values(configs) : {},
    environment: environment(spec.pg ? { server: PG_IMAGE, client: IMAGE, client_user: 'uid 1000 (learner)', driver: 'psycopg 3.3.6 on the Bench image\'s Python 3.13' } : { image: IMAGE, user: 'uid 1000 (learner)' }),
    ...(configs.length > 1 ? { primary_config: primary.id, configs } : {}),
    notes: [
      '<sandbox>/work in argv stands for a fresh scratch copy of this run\'s inputs/ folder, mounted at /w; the inputs are kept under inputs/ as they ran.',
      `Each log is the container's stdout followed by its stderr. verdict_lines are the lines of the log the recorder keeps (content/audit/tools/record-exemplars.mjs), copied in log order.`,
      ...(spec.repo ? ['<repo> in argv is the course repository at the commit the inputs\' hashes name, mounted read-only at /r with PYTHONPATH=/r/bench, as RUN-sql-shape-validator and RUN-tlc-trace-validation mount it; inputs lists the files of it the run reads.'] : []),
      ...(spec.pg
        ? [`The server ran in ${PG_IMAGE} on the user network ${net} with --memory=6g; before the first driver started, the recorder waited until docker logs showed "database system is ready to accept connections" twice and pg_isready -h 127.0.0.1 exited 0. argv lists the commands in order.`]
        : []),
      ...spec.notes,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${id}: ${configs.map((c) => `${c.id} exit ${c.exit_code} (${c.verdict_lines.length} lines)`).join(', ')}\n`);
}

const TAGGED = (l) => /^\[q\d+[^\]]*\] /.test(l) || /^z3 \d/.test(l);
const TLC_KEEP = (l) => /^\[[a-z0-9 ]+\] (Error:|Warning: |State \d+:|Back to state|Model checking completed|\d+ states generated|exit=|TLC2 Version)/.test(l);

const RUNS = {
  'RUN-z3-vacuous-exemplars': {
    engine: 'z3',
    title: "AUD-1.1's variant pairs v3 to v5: each violation query is unsat; the flawed forms' premises are unsat, with their minimal cores, and the sound forms' premises are sat; each step-3 scenario is covered or not",
    records: 'AUD-1.1 (content/audit/AUD-1.1.yaml): the violation, premise and core queries of variant pairs v3, v4 and v5, and the premise-plus-values query of each step-3 scenario',
    configs: [{ id: 'bench', purpose: 'exemplars.py: the queries of the six cases q7 to q12', cmd: ['python3', '-I', 'exemplars.py'] }],
    keep: TAGGED,
    notes: ['Every query runs under rlimit 5000000. q9 and q10 are q9.smt2 and q10.smt2, read one assertion at a time with parse_smt2_string, so each premise keeps the text the case shows; the last assertion is the violation.'],
  },
  'RUN-z3-noguard-exemplars': {
    engine: 'z3',
    title: "AUD-4.2's variant pairs v2 to v4: every checked query is unsat; the flawed forms' conclusions cover less than Inv after the step (an existential over the accounts, a dropped conjunct the others do not imply, the total moved out of the negation), and each step-3 scenario is ruled out or not",
    records: "AUD-4.2 (content/audit/AUD-4.2.yaml): each obligation as checked, the same step against every conjunct of the declared Inv, one probe per pair of what the checked conclusion still catches, and every step-3 scenario",
    configs: [{ id: 'bench', purpose: 'check.py: the queries of the six cases q5 to q10 (q5 to q8 are SMT-LIB files, q9 and q10 Z3Py)', cmd: ['python3', '-I', 'check.py'] }],
    keep: TAGGED,
    notes: ["A scenario's result is ruled out when it meets the query's own assertions about the post-state (for an SMT-LIB file, its last assertion, with the result's values asserted): it is then one of the violations the unsat excludes. A result the query never considers, one whose total is not 100 when the total is assumed, is not ruled out."],
  },
  'RUN-z3-cti-exemplars': {
    engine: 'z3',
    title: "AUD-4.3's variant pairs v2 to v5: four models, each in a form where a command breaks the fact the invariant needs (the violation is reachable within 6 steps) and a form where nothing does (the inductive step is sat on an unreachable pre-state); the agent's edit, and every step-3 scenario searched from Init",
    records: "AUD-4.3 (content/audit/AUD-4.3.yaml): for the eight cases q5 to q12, the inductive step and its pre-state, the bounded search, the strengthened step, the edited step and search, and each step-3 scenario",
    configs: [{ id: 'bench', purpose: 'cti.py: the checks of the eight cases q5 to q12 (q11 and q12 are SMT-LIB files, with the search in Z3Py)', cmd: ['python3', '-I', 'cti.py'] }],
    keep: TAGGED,
    notes: ["Each Z3Py case's statement is the block between its '--- qN' markers in inputs/cti.py, verbatim; q11 and q12 are inputs/q11.smt2 and inputs/q12.smt2, and q11e.smt2, q12e.smt2 the files after the agent's edit. A search runs the case's commands from Init for k = 0 to 6 steps and reports the first k at which the goal holds."],
  },
  'RUN-z3-declassify-exemplars': {
    engine: 'z3',
    title: "AUD-7.2's variant pairs v2 to v5: every self-composition query is unsat and every relation is satisfiable with Birch's data differing; the flawed relations forbid a release the requirement wants or allow one it forbids, as each step-3 scenario shows",
    records: "AUD-7.2 (content/audit/AUD-7.2.yaml): the proof and premise queries of the eight cases q5 to q12 and each step-3 scenario's relation check",
    configs: [{ id: 'bench', purpose: 'declassify.py: the queries of the eight cases q5 to q12 (q7, q8, q11 and q12 are SMT-LIB files)', cmd: ['python3', '-I', 'declassify.py'] }],
    keep: TAGGED,
    notes: [
      "q5's statement is S7.L6 cell 2's Open v1 model (runs/RUN-z3-selfcomp/cells/s7l6_cell2.py: open_v1 renamed open_doc, related() as written), and q7.smt2 is S7.L6 cell 3 (runs/RUN-z3-selfcomp/cells/s7l6_cell3.smt2) copied verbatim; RUN-z3-selfcomp keys those two sound cases, and this run re-checks them with the case's own scenarios.",
      "For an SMT-LIB case, the relation is every assertion but the last, and a scenario fixes every constant of both worlds with (assert (= name value)); sat means the two worlds are related, so the statement forbids Acme's view from changing between them.",
    ],
  },
};

/** Write a TLC run's inputs: its modules and configurations, jobs.txt (tag|dir|module|cfg|flags) and run.sh. */
function writeTlc(id) {
  return (dir) => {
    const { files, jobs } = tlcExemplarRuns(REPO)[id];
    rmSync(dir, { recursive: true, force: true });
    const all = { ...files, 'jobs.txt': jobs.map((j) => j.join('|')).join('\n') + '\n', 'run.sh': TLC_SCRIPT };
    for (const [p, text] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), text);
    }
  };
}
const TLC_NOTE = 'run.sh (the S5 recorder\'s, content/audit/tools/s5s6-inputs.mjs) runs TLC 1.8.0 with one worker once per line of jobs.txt (tag|dir|module|cfg|flags) and prefixes every output line with "[tag] "; the modules and configurations are written by content/audit/tools/exemplar-tlc.mjs, a scenario\'s module being the case\'s module with one edit.';
const tlcValues = (configs) => {
  const values = {};
  for (const l of configs[0].verdict_lines) {
    const m = /^\[([a-z0-9 ]+)\] (.*)$/.exec(l);
    if (!m) continue;
    const v = (values[m[1]] ??= {});
    if (/^Model checking completed/.test(m[2])) v.result = 'no error';
    else if (/^Error: Deadlock reached/.test(m[2])) v.result ??= 'deadlock';
    else if (/^Error: (Invariant|Temporal property) (\S+) (is|was) violated/.test(m[2])) v.result ??= `violated: ${/^Error: (?:Invariant|Temporal property) (\S+)/.exec(m[2])[1]}`;
    else if (/^\d+ states generated/.test(m[2])) v.distinct = Number(/(\d+) distinct/.exec(m[2])[1]);
  }
  return values;
};
const TLC_RUN = { engine: 'tlc', configs: [{ id: 'tlc', purpose: 'run.sh: every job of jobs.txt', cmd: ['sh', 'run.sh'] }], keep: TLC_KEEP, values: tlcValues };

Object.assign(RUNS, {
  'RUN-tlc-kind-exemplars': {
    ...TLC_RUN,
    prepare: writeTlc('RUN-tlc-kind-exemplars'),
    title: "AUD-5.1's variant pairs v2 to v5: four models, each checked once for its liveness property and once for an invariant or for deadlock alone, and each check run again on the module with each step-3 scenario's edit",
    records: 'AUD-5.1 (content/audit/AUD-5.1.yaml): variant pairs v2 to v5 and every step-3 scenario',
    notes: [TLC_NOTE, "TLC's default flags: deadlock is checked. q5/q6 Approval (v2), q7/q8 Batch (v3), q9/q10 Webhooks with Hooks = {h1, h2} (v4), q11/q12 RefundAsk (v5); in each pair the first checks the temporal property and the second the invariant (q12: SPECIFICATION with CHECK_DEADLOCK TRUE, so deadlock only)."],
  },
  'RUN-tlc-budget-fairness': {
    ...TLC_RUN,
    prepare: writeTlc('RUN-tlc-budget-fairness'),
    title: "AUD-5.2's variant pair v2: EventuallyResolves on a hold model whose provider answers busy at most twice, under fairness on Timeout (q5) and on Try and the provider's Capture (q6), each re-checked with environment actions switched off",
    records: 'AUD-5.2 (content/audit/AUD-5.2.yaml): variant pair v2 and its step-3 scenarios',
    notes: [TLC_NOTE, 'Every job runs with -deadlock, as RUN-tlc-hold-env does. An environment switches actions off by defining them as FALSE, so they are never enabled and a fairness condition on them asks for nothing.'],
  },
  'RUN-tlc-outbox-timers': {
    ...TLC_RUN,
    prepare: writeTlc('RUN-tlc-outbox-timers'),
    title: "AUD-8.1's variant pair v2: the outbox model with one crash before the send and timer re-sends switched off passes TLC whether or not the claim states the assumption; with timer re-sends on, a provider without dedup charges twice",
    records: 'AUD-8.1 (content/audit/AUD-8.1.yaml): variant pair v2 (q5, q6) and its step-3 scenarios (g1 to g4)',
    notes: [TLC_NOTE, 'Outbox.tla and OutboxIface.tla are copied verbatim from runs/RUN-tlc-env-assumption/inputs/ (S8.L2 cell 1 and the W0-S04 spike module). Every job runs with -deadlock, as S8.L3 does. Each configuration\'s leading \\* comment lines are the case\'s claim text; TLC ignores them.'],
  },
  'RUN-tlc-split-exemplars': {
    ...TLC_RUN,
    prepare: writeTlc('RUN-tlc-split-exemplars'),
    title: "AUD-5.4's variant pairs v2 and v3: a hold placement and an idempotent charge, each split into a check and a write, with the check repeated in the write (q5, q7) or not (q6, q8), under three sets of constants",
    records: 'AUD-5.4 (content/audit/AUD-5.4.yaml): variant pairs v2 and v3 and their step-3 scenarios',
    notes: [TLC_NOTE, "TLC's default flags. a5 and a7 are the atomic models the splits replace (Holds with PlaceHold, Charges with ChargeOnce), what the agent checked before splitting. Holds runs with Bal = 100 and Amt 80 or 40, Charges with one, two or three workers."],
  },
});

Object.assign(RUNS, {
  'RUN-pg-split-exemplars': {
    engine: 'postgresql',
    pg: true,
    title: "AUD-5.4's variant pairs v4 and v5 on PostgreSQL 18.6: a hold placed after reading the balance with FOR UPDATE (q9) and without it (q10), and a daily-limit counter read and written at REPEATABLE READ (q11) and at READ COMMITTED (q12), each run by two sessions interleaved (p1) and one after the other (p2)",
    records: 'AUD-5.4 (content/audit/AUD-5.4.yaml): variant pairs v4 and v5, their receipts, keys and step-3 scenarios',
    configs: [
      { id: 'q9', purpose: 'hold_q9.py: place_hold with the balance read FOR UPDATE, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'hold_q9', 'q9'] },
      { id: 'q10', purpose: 'hold_q10.py: place_hold with a plain read of the balance, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'hold_q10', 'q10'] },
      { id: 'q11', purpose: 'limit_q11.py: spend at REPEATABLE READ, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'limit_q11', 'q11'] },
      { id: 'q12', purpose: 'limit_q12.py: spend at READ COMMITTED, under p1 and p2', cmd: ['python3', '-I', 'gated.py', 'limit_q12', 'q12'] },
    ],
    keep: (l) => /^\[q\d+( p\d)?\] /.test(l),
    notes: ["gated.py is runs/RUN-pg-withdraw-split/inputs/gated.py with the action, its setup file and its final check read from the case's module, and with a session whose step waits giving up its turns until the step completes (its docstring says why). It runs the module's function unchanged in two threads, a and b, each with its own connection, and gates every statement and every commit on a schedule: p1 interleaves the two sessions statement by statement, p2 runs a to its commit and then b. A step still running after 1 s is reported as waiting and the schedule moves on, as isolationtester does. Each case's statement is the block between its '--- qN' markers in its module, verbatim."],
  },
  'RUN-pg-isolation-exemplars': {
    engine: 'postgresql',
    pg: true,
    title: "AUD-6.3's variant pairs v2 and v3 on PostgreSQL 18.6: ALTER DATABASE ... SET default_transaction_isolation reaches only connections opened after it (q3, q4), and SET LOCAL in an autocommit on_connect hook is a warning with no effect where SET applies (q5, q6); the team debit run by both pools interleaved (p1) and one after the other (p2)",
    records: 'AUD-6.3 (content/audit/AUD-6.3.yaml): variant pairs v2 and v3, their receipts, keys and step-3 scenarios',
    configs: ['q3', 'q4', 'q5', 'q6'].map((q) => ({ id: q, purpose: `pools.py ${q}: the case's ${q}.sql, its pools opened and its debits run under p1 and p2`, cmd: ['python3', '-I', 'pools.py', q] })),
    keep: (l) => /^\[q\d+( p\d)?\] /.test(l),
    notes: ["pools.py reads the case's statement, inputs/qN.sql, and runs its SQL lines as written: the ALTER DATABASE line by an admin connection, before or after the two pool connections open as its '-- deploy:' line says, any other line before the debit as the pools' on_connect hook on each new connection in autocommit, and the debit as each pool's transaction. Notices are printed with their severity and SQLSTATE."],
  },
});

Object.assign(RUNS, {
  'RUN-pg-shape-pair': {
    engine: 'postgresql',
    pg: true,
    repo: true,
    repoFiles: ['bench/statespace/labs/lab9.py', 'labs/reference/sql-validator/validators.py'],
    title: "AUD-9.2's variant pair v6: the shape check accepts both the wrong-account plan (q13) and the credit-first plan (q14); the semantic validator rejects q13 at instance 63 of 1125 and accepts q14, and the step-3 instances replayed on PostgreSQL 18.6 and in the interpreter differ for q13 only",
    records: 'AUD-9.2 (content/audit/AUD-9.2.yaml): variant pair v6, its receipts and step-3 scenarios',
    configs: [{ id: 'q13-q14', purpose: 'shape9.py: both plans, both validators, and four replayed instances each', cmd: ['python3', '-B', 'shape9.py'] }],
    keep: (l) => /^\[q\d+[^\]]*\] /.test(l),
    notes: ["shape9.py runs labs/reference/sql-validator/validators.py's shape() and semantic() on two plans of statespace.labs.lab9's PLANS, with the roles of RUN-sql-shape-validator ($1 from, $2 to, $3 amount), and replays each scenario's instance with replay_plan (PostgreSQL) and source_transfer (the interpreter), as that run's record.py does. It runs with python3 -B, not -I, so that PYTHONPATH reaches the mounted bench package; [q0] lines are the server and the bound, shared by both cases."],
  },
});

Object.assign(RUNS, {
  'RUN-tlc-reply-order': {
    engine: 'tlc',
    repo: true,
    repoFiles: ['bench/statespace/sim.py', 'bench/statespace/trace.py'],
    title: "AUD-8.2's variant pair v2: the course's reference simulator on seed 1, with its reference machine as it stands (q5) and with the reply branch returning the ack before the store (q6); both pass the end-state suite, and trace validation against OutboxRef.tla accepts q5's trace and rejects q6's at its first Ack",
    records: 'AUD-8.2 (content/audit/AUD-8.2.yaml): variant pair v2, its receipts and step-3 scenarios',
    configs: ['q5', 'q6'].map((q) => ({ id: q, purpose: `reply.py ${q}: seed 1, its trace, the end-state suite, the harness monitor, and statespace trace validate`, cmd: ['python3', '-B', 'reply.py', q] })),
    keep: (l) => /^\[q\d+\] /.test(l),
    notes: ["reply.py imports the course's reference simulator, bench/statespace/sim.py, from the read-only mount; for q6 it replaces ReferenceMachine with a subclass whose step answers a reply with the block between the '--- q6' markers in reply.py, and leaves every other branch to the reference. labs/LAB-8/reference/ and labs/LAB-8/challenge/ under inputs/ are the files of RUN-tlc-trace-validation's inputs, copied verbatim, which statespace trace validate reads.", "The end-state suite is the agent's: after the run, c1 is acked, its result stored, and the provider charged it once. The monitor line is the harness's own describe() of the run, which checks NoDoubleCharge and AckedIsDurable while the run goes."],
  },
});

export { RUNS, record, TAGGED, TLC_KEEP };

const want = process.argv.slice(2);
for (const [id, spec] of Object.entries(RUNS)) if (want.length === 0 || want.includes(id)) record(id, spec);
