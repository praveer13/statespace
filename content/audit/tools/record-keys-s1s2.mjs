#!/usr/bin/env node
// Record the runs that key the Audit Desk's S1 and S2 anchors beyond the two examples (AUD-1.2, AUD-1.3, AUD-2.1,
// AUD-2.2, AUD-2.4; content/audit/README.md section 5; runs/README.md section 3). Each configuration runs in the
// pinned Bench image with no network and a 6 GB cap, on a scratch copy of runs/<RUN-id>/inputs/; its log is written
// to runs/<RUN-id>/<config>.log and the record's verdict lines are filtered from that log, never typed.
//
//   node content/audit/tools/record-keys-s1s2.mjs                 record every run below
//   node content/audit/tools/record-keys-s1s2.mjs RUN-lean-refund-both
//
// Afterwards: node scripts/runs/build-index.mjs, so the registry's index names the new records. The helpers are
// those of record-keys.mjs (the example anchors' recorder), kept in this file so the two recorders stay independent.

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

function inputsOf(dir, role) {
  return filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: role(p) };
  });
}

function docker(args, opts = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  return r;
}

function imageFact(cmd) {
  return docker(['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', cmd]).stdout.trim();
}

function environment() {
  const os = spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim();
  const cpus = Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim());
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  return {
    os,
    cpu_count: cpus,
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: docker(['version', '--format', '{{.Server.Version}}']).stdout.trim(),
    container: { image: IMAGE, user: 'uid 1000 (learner)' },
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
  const r = docker(real, { timeout: 600000 });
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  docker(['rm', '-f', name]);
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
    budget: { container_memory: '6g', network: 'none', ...(run.budget ?? {}) },
    exit_code: r.status,
    verdict_lines: log.split('\n').filter(keep),
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
    budget: { container_memory: '6g', network: 'none', ...(run.budget ?? {}) },
    exit_code: primary.exit_code,
    verdict_lines: primary.verdict_lines,
    outputs: configs.map((c) => ({ ...c._log, kind: 'log' })),
    values,
    environment: environment(),
    primary_config: primary.id,
    configs: configs.map(({ _log, ...c }) => c),
    notes: [
      "<sandbox>/work in argv stands for a scratch copy of the files listed in the configuration's inputs, mounted at /w; the inputs are kept under this run's inputs/ folder as they ran.",
      "Each log is the container's stdout followed by its stderr. verdict_lines are the lines of the log the recorder keeps (content/audit/tools/record-keys-s1s2.mjs), copied in log order.",
      ...extra,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${run.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${run.id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

const role = (p) => (p.endsWith('.sh') || p.endsWith('.py') ? 'script' : p.endsWith('.toml') || p.endsWith('.json') ? 'config' : 'source');

// ------------------------------------------------------------------ Z3

function z3Run(id, title, records, extra, task) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    task,
    title,
    records,
    engine: 'z3',
    version: '5.3.1',
    versionString: imageFact('python3 -c "import z3; print(z3.get_full_version())"'),
    binary: `libz3.so of the z3-solver 5.3.1 wheel in the statespace-bench image (${LIBZ3}); the command-line lines come from /opt/venv/bin/z3 of the same wheel`,
    binarySha: imageFact(`sha256sum ${LIBZ3} | cut -d' ' -f1`),
    inputs: dir,
    primary: 'bench',
  };
  const keep = (l) => /^\[q[0-9]+ [^\]]*\] /.test(l) || /^z3 \d/.test(l);
  const cfg = runConfig(run, { id: 'bench', purpose: 'run.sh: the Z3Py queries (pairs.py), then the SMT-LIB files through the z3 command line', cmd: ['sh', 'run.sh'], inputs: inputsOf(dir, role) }, keep);
  const values = {};
  for (const l of cfg.verdict_lines) {
    const m = /^\[(q[0-9]+) (violation|violation i64|premises|cli)\] (\S+)/.exec(l);
    if (m) {
      values[m[1]] ??= {};
      values[m[1]][m[2].replace(' ', '_')] = m[3];
    }
  }
  write(run, [cfg], values, extra);
}

function recordBv64() {
  z3Run(
    'RUN-z3-bv64-pairs',
    "AUD-1.2's cases: each Int query answers unsat, and its rendering over signed 64-bit bit-vectors, the arithmetic of the int64 code it stands for, is unsat for the sound forms and sat with a wrapping witness for the flawed ones",
    'AUD-1.2 (content/audit/AUD-1.2.yaml): the Int violation query of the pair and its three variant pairs, the same premises and violation over 64-bit bit-vectors with a witness, and each step-3 scenario with the int64 results it computes',
    [
      'A scenario is covered when the Int premises plus its values are sat: the statement speaks about that transfer. The int64 results are the same expressions evaluated over 64-bit two\'s complement, the arithmetic of ledger.go\'s int64 (Go integer overflow wraps).',
      'Witness values are printed as signed 64-bit integers. Every Z3Py query runs under rlimit 5000000.',
      'q5 and q6 are the SMT-LIB files v2-q5.smt2 and v2-q6.smt2: their Int verdicts are read with Solver.from_file and again through the z3 command line ([q5 cli], [q6 cli]).',
    ],
    'W1-T33',
  );
}

function recordInconclusive() {
  z3Run(
    'RUN-z3-inconclusive-pairs',
    "AUD-1.3's cases: the same kind of query answers unsat for the sound forms and unknown, with its reason, for the flawed ones (an rlimit budget cancelled, incomplete theory arithmetic, a quantified rule cancelled); an unknown establishes no scenario",
    'AUD-1.3 (content/audit/AUD-1.3.yaml): the violation query of the pair and its three variant pairs, with its reason when unknown, and each step-3 scenario: established only when the check answered unsat and the values meet every premise',
    [
      'Each query runs under the rlimit its case states (5000000, or 20000 for the budget-cut forms). A scenario\'s premise check runs under rlimit 5000000.',
      'q7 and q8 are the SMT-LIB files v3-q7.smt2 and v3-q8.smt2, read with Solver.from_file under their own rlimit and again through the z3 command line ([q7 cli], [q8 cli]), where (get-info :reason-unknown) prints the reason.',
    ],
    'W1-T33',
  );
}

// ------------------------------------------------------------------ Lean

function leanRun(id, title, records, extra, mainLib, extraKeep = null) {
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    task: 'W1-T34',
    title,
    records,
    engine: 'lean',
    version: '4.35.0',
    versionString: imageFact('lean --version'),
    binary: `bin/lean of the Lean 4.35.0 toolchain in the statespace-bench image (${LEAN_BIN}, which elan resolves lean to)`,
    binarySha: imageFact(`sha256sum ${LEAN_BIN} | cut -d' ' -f1`),
    inputs: dir,
    primary: 'flawed',
  };
  const keep = (l) =>
    /^✔ |^⚠ |^✖ |^Build completed|^[a-z]+ exit=\d+$|depends on axioms|does not depend on any axioms|^warning: |^error: |^\("s\d"/.test(l) || (extraKeep !== null && extraKeep.test(l));
  const inputsFor = (sub) => [...inputsOf(join(dir, sub), role), ...inputsOf(dir, role).filter((i) => i.path.endsWith('run.sh'))];
  const configs = ['sound', 'flawed'].map((p) =>
    runConfig(run, { id: p, purpose: `run.sh ${p}: the ${p} project, built and read as the Bench reads it`, cmd: ['sh', 'run.sh', p], writable: true, inputs: inputsFor(p) }, keep),
  );
  const values = {};
  for (const c of configs) {
    const lines = c.verdict_lines;
    const exit = (what) => {
      const l = lines.find((x) => x.startsWith(`${what} exit=`));
      return l === undefined ? null : Number(l.split('=')[1]);
    };
    values[c.id] = {
      build_exit: exit('lake'),
      axioms: lines.find((l) => l.includes('depends on axioms') || l.includes('does not depend on any axioms')) ?? null,
      ...(lines.some((l) => l.startsWith('leanchecker exit=')) ? { leanchecker_exit: exit('leanchecker') } : {}),
      ...(lines.some((l) => l.startsWith('comparator exit=')) ? { comparator_exit: exit('comparator') } : {}),
      scenarios: Object.fromEntries(lines.filter((l) => l.startsWith('("s')).map((l) => [l.slice(2, 4), l.includes('", true,')])),
    };
  }
  write(run, configs, values, extra);
  void mainLib;
}

function recordRefund() {
  leanRun(
    'RUN-lean-refund-both',
    "AUD-2.1's pair: one guarded refund, two theorems named refund_nonneg; both build with [propext, Quot.sound] and replay in the kernel, but only the sound one's statement covers every account, so only it rules out a refund that leaves the merchant negative",
    'AUD-2.1 (content/audit/AUD-2.1.yaml): lake build, #print axioms refund_nonneg and leanchecker on the both-parties project (sound) and the customer-only project (flawed), and the step-3 scenarios against each statement',
    [
      'Both projects share Refunds/Refund.lean, a refund that does nothing unless the merchant holds amt. The sound theorem concludes NonNeg (refund s p amt); the flawed one concludes only 0 ≤ (refund s p amt).balance (s.payments p).customer.',
      'A scenario line prints the scenario, whether the project\'s theorem as written rules out that outcome (its premises hold and its conclusion fails on the outcome, over the customer, account 1, and the merchant, account 2; every other balance is 0 and unchanged), and what refund returns for the two accounts.',
      'This is the both-parties member spine section 6.2 names for W2-T13; it is recorded here with the W1 anchor so that the pair carries one claim.',
    ],
    'Refunds',
  );
}

function recordAxioms() {
  leanRun(
    'RUN-lean-axioms-pair',
    "AUD-2.2's pair: one conservation theorem built twice, its helper declared once as a theorem proved by omega and once as an axiom; both builds exit 0 and replay in the kernel, and #print axioms lists [propext, Quot.sound] for the first and [rebalance] for the second",
    'AUD-2.2 (content/audit/AUD-2.2.yaml): lake build, #print axioms transfer_conserves and leanchecker on the sound and the flawed project, and the step-3 scenarios',
    [
      'The two projects differ in one line, Ledger/Arith.lean: theorem rebalance ... := by omega in the sound project, axiom rebalance ... in the flawed one. leanchecker accepts both, because the kernel checks the proof against the declared axiom; only #print axioms shows the difference.',
      'A scenario line prints the scenario, whether transfer_conserves as written rules out that result (its two balances do not sum to l.a + l.b), and what transfer actually returns.',
      'The imported RUN-lean-axioms records sorryAx, a custom axiom and a native axiom on separate specimen declarations, without argv; this run is recorded with argv on the anchor\'s own statement.',
    ],
    'Ledger',
  );
}

function recordComparator() {
  leanRun(
    'RUN-lean-comparator-pair',
    "AUD-2.4's pair: one pinned challenge and two solutions; both build green with [propext, Quot.sound], and lake comparator accepts the solution that proves the pinned statement and rejects the one that adds a hypothesis under the same name",
    'AUD-2.4 (content/audit/AUD-2.4.yaml): lake build, #print axioms conserves and lake comparator against Challenge.lean for the sound and the flawed solution, and the step-3 scenarios against each solution\'s statement',
    [
      'Challenge.lean, comparator.json, lakefile.toml, lake-manifest.json and the sound Solution.lean are copies of research/evidence/lean-measure/proj/judge, the project behind the imported RUN-lean-comparator. The flawed Solution.lean adds the hypothesis h : 0 < amt ∧ amt ≤ a to conserves.',
      'The container has no network and cannot start bwrap, so lake comparator runs with --inadvisably-no-sandbox and prints that the run is not trustworthy; the verdicts are comparator\'s statement and axiom checks and the Lean kernel\'s replay, without the sandbox.',
      'A scenario line prints the scenario, whether the solution\'s conserves as written rules out that result (its premises hold and the result\'s balances do not sum to a + b), and what transfer actually returns.',
    ],
    'Solution',
    /^Lean default kernel|^Your solution is okay|^WARNING: Sandbox/,
  );
}

const want = process.argv.slice(2);
const all = {
  'RUN-z3-bv64-pairs': recordBv64,
  'RUN-z3-inconclusive-pairs': recordInconclusive,
  'RUN-lean-refund-both': recordRefund,
  'RUN-lean-axioms-pair': recordAxioms,
  'RUN-lean-comparator-pair': recordComparator,
};
for (const [id, fn] of Object.entries(all)) if (want.length === 0 || want.includes(id)) fn();
