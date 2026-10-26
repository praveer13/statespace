#!/usr/bin/env node
// Record the runs that key the Audit Desk's example anchors (content/audit/README.md section 5; runs/README.md
// section 3). Each run executes in the pinned Bench image with no network and a 6 GB cap, on a scratch copy of its
// inputs; the record's verdict lines are copied from the logs the run wrote, never typed.
//
//   node content/audit/tools/record-keys.mjs                      record every run below
//   node content/audit/tools/record-keys.mjs RUN-lean-skipkernel-pair
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

/** One line per fact, read from the image itself. */
function imageFact(cmd) {
  const r = docker(['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', cmd]);
  return r.stdout.trim();
}

function environment() {
  const os = spawnSync('uname', ['-sr'], { encoding: 'utf8' }).stdout.trim();
  const cpus = Number(spawnSync('nproc', [], { encoding: 'utf8' }).stdout.trim());
  const mem = readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+) kB/);
  const dockerVersion = docker(['version', '--format', '{{.Server.Version}}']).stdout.trim();
  return {
    os,
    cpu_count: cpus,
    ram_gib: mem ? Math.round((Number(mem[1]) / 1024 / 1024) * 10) / 10 : null,
    cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch,
    docker: dockerVersion,
    container: { image: IMAGE, user: 'uid 1000 (learner)' },
  };
}

/**
 * Run one configuration: a scratch copy of `inputs` mounted at /w, the command, the log written to
 * runs/<id>/<config>.log, and the configuration's record with the verdict lines the filter keeps, in log order.
 */
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
  const verdict = log.split('\n').filter(keep);
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
    verdict_lines: verdict,
    outputs: [posix(relative(REPO, logPath))],
    _log: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log) },
  };
}

function write(run, configs, values, extra) {
  const primary = configs.find((c) => c.id === run.primary) ?? configs[0];
  const outputs = configs.map((c) => ({ ...c._log, kind: 'log' }));
  const inputs = [];
  for (const c of configs) for (const i of c.inputs) if (!inputs.some((x) => x.path === i.path)) inputs.push(i);
  const record = {
    id: run.id,
    title: run.title,
    task: 'W1-T32',
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
    outputs,
    values,
    environment: environment(),
    primary_config: primary.id,
    configs: configs.map(({ _log, ...c }) => c),
    notes: [
      '<sandbox>/work in argv stands for a scratch copy of the files listed in the configuration\'s inputs, mounted at /w; the inputs are kept under this run\'s inputs/ folder as they ran.',
      'Each log is the container\'s stdout followed by its stderr. verdict_lines are the lines of the log the recorder keeps (content/audit/tools/record-keys.mjs), copied in log order.',
      ...extra,
    ],
  };
  writeFileSync(join(REPO, 'runs', `${run.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${run.id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

// ------------------------------------------------------------------ the runs

function recordZ3() {
  const id = 'RUN-z3-vacuous-variants';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title: "AUD-1.1's cases keyed by premise queries: every violation query is unsat, the flawed cases' premises are unsat with their cores, and each step-3 scenario is covered or not",
    records: "AUD-1.1 (content/audit/AUD-1.1.yaml): the violation, premise and core queries of the pair and its two variant pairs, and the premise-plus-values query of each step-3 scenario",
    engine: 'z3',
    version: '5.3.1',
    versionString: imageFact('python3 -c "import z3; print(z3.get_full_version())"'),
    binary: `libz3.so of the z3-solver 5.3.1 wheel in the statespace-bench image (${LIBZ3})`,
    binarySha: imageFact(`sha256sum ${LIBZ3} | cut -d' ' -f1`),
    inputs: dir,
    primary: 'bench',
  };
  const keep = (l) => /^\[[a-z0-9-]+ [^\]]*\] /.test(l) || /^z3 \d/.test(l);
  const cfg = runConfig(
    run,
    { id: 'bench', purpose: 'variants.py: the queries of AUD-1.1\'s six cases', cmd: ['python3', '-I', 'variants.py'], inputs: inputsOf(dir, () => 'script') },
    keep,
  );
  const values = {};
  for (const l of cfg.verdict_lines) {
    const m = /^\[([a-z0-9-]+) (violation|premises|core)\] (.*)$/.exec(l);
    if (m) {
      values[m[1]] ??= {};
      values[m[1]][m[2]] = m[3].split(' ')[0].startsWith('unsat_core') ? m[3] : m[3].split(' ')[0];
    }
    const s = /^\[([a-z0-9-]+) (s\d) [^\]]*\] (sat|unsat) /.exec(l);
    if (s) {
      values[s[1]] ??= {};
      values[s[1]].covered ??= {};
      values[s[1]].covered[s[2]] = s[3] === 'sat';
    }
  }
  write(run, [cfg], values, ['A scenario is covered when the premises plus its values are sat: the statement speaks about that transfer. Every query runs under rlimit 5000000.']);
}

function recordLean() {
  const id = 'RUN-lean-skipkernel-pair';
  const dir = join(REPO, 'runs', id, 'inputs');
  const run = {
    id,
    title: "AUD-2.3's pair: one conservation theorem built twice; both builds exit 0 with no non-standard axiom, and only the kernel replay rejects the member built under debug.skipKernelTC",
    records: 'AUD-2.3 (content/audit/AUD-2.3.yaml): lake build, #print axioms and leanchecker on the sound and the flawed project, and the step-3 scenarios evaluated in Lean',
    engine: 'lean',
    version: '4.35.0',
    versionString: imageFact('lean --version'),
    binary: `bin/lean of the Lean 4.35.0 toolchain in the statespace-bench image (${LEAN_BIN}, which elan resolves lean to)`,
    binarySha: imageFact(`sha256sum ${LEAN_BIN} | cut -d' ' -f1`),
    inputs: dir,
    primary: 'flawed',
  };
  const keep = (l) =>
    /^✔ |^Build completed|^[a-z]+ exit=\d+$|depends on axioms|does not depend on any axioms|^leanchecker found|^uncaught exception|^\(kernel\)|^\("s\d"/.test(l);
  const role = (p) => (p.endsWith('.sh') ? 'script' : p.endsWith('.toml') ? 'config' : 'source');
  const inputsFor = (sub) => [...inputsOf(join(dir, sub), role), ...inputsOf(dir, role).filter((i) => i.path.endsWith('run.sh'))];
  const configs = ['sound', 'flawed'].map((p) =>
    runConfig(
      run,
      {
        id: p,
        purpose: `run.sh ${p}: lake build, #print axioms conserves, leanchecker Ledger${p === 'sound' ? ', then the step-3 scenarios' : ''}`,
        cmd: ['sh', 'run.sh', p],
        writable: true,
        inputs: inputsFor(p),
      },
      keep,
    ),
  );
  const values = {};
  for (const c of configs) {
    const lines = c.verdict_lines;
    const exit = (what) => Number(lines.find((l) => l.startsWith(`${what} exit=`))?.split('=')[1] ?? NaN);
    values[c.id] = {
      build_exit: exit('lake'),
      axioms: lines.find((l) => l.includes("'conserves'")) ?? null,
      leanchecker_exit: exit('leanchecker'),
      leanchecker: exit('leanchecker') === 0 ? 'accepts' : 'rejects',
    };
    const scen = lines.filter((l) => l.startsWith('("s'));
    if (scen.length > 0) values.scenarios = Object.fromEntries(scen.map((l) => [l.slice(2, 4), l.includes('", true,')]));
  }
  write(run, configs, values, [
    'Each project is the same transfer and the same theorem statement, conserves. The sound project proves it with unfold, split, simp and omega; the flawed one closes it with a declaration added while debug.skipKernelTC was set (inputs/flawed/Ledger/Fast.lean). The Audit Desk shows the option line and these verdict lines, never that construction (docs/AUDIT-DESK.md section 3.2).',
    'A scenario line prints the scenario, whether the theorem as written rules out that result (its balances do not sum to a + b), and what transfer actually returns.',
    'The imported RUN-lean-skipkernel records the same behaviour on a proof of False, without argv; this run is recorded with argv and keys AUD-2.3 on its own statement.',
  ]);
}

const want = process.argv.slice(2);
if (want.length === 0 || want.includes('RUN-z3-vacuous-variants')) recordZ3();
if (want.length === 0 || want.includes('RUN-lean-skipkernel-pair')) recordLean();
