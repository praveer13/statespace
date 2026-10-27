#!/usr/bin/env node
// Re-run, in place, the two imported Lean runs that spine section 6.2's Key run cells name for AUD-2.2 and AUD-2.3
// (RUN-lean-axioms and RUN-lean-skipkernel; runs/README.md section 3: "A run with no argv is re-run before copy cites
// it. The re-run record keeps the original execution as configurations named original and original-*").
//
// Each record keeps its imported top level as it was (the lines the course quotes are the original execution's,
// and its primary_config is `original`), and gains configurations executed with argv in the pinned Bench image,
// --network none, --memory=6g, on a scratch copy of runs/<RUN-id>/inputs/:
//   - the original probe again: the research/ project the import read, copied verbatim into inputs/;
//   - the anchor's pair (inputs/sound, inputs/flawed), the projects RUN-lean-axioms-pair and
//     RUN-lean-skipkernel-pair hold, so that the case is keyed by the run the spine names.
// Verdict lines are filtered from the logs each configuration writes, never typed.
//
//   node content/audit/tools/rerun-lean-imported.mjs                    both runs
//   node content/audit/tools/rerun-lean-imported.mjs RUN-lean-skipkernel
//
// Afterwards: node scripts/runs/build-index.mjs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a';
const LEAN_BIN = '/opt/elan/toolchains/leanprover--lean4---v4.35.0/bin/lean';
const { importedRecord } = await import(pathToFileURL(join(REPO, 'scripts', 'runs', 'import-research.mjs')).href);

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
const role = (p) => (p.endsWith('.sh') ? 'script' : /\.(toml|json)$/.test(p) ? 'config' : 'source');
const inputsOf = (dir) =>
  filesUnder(dir).map((p) => {
    const buf = readFileSync(p);
    return { path: posix(relative(REPO, p)), sha256: sha(buf), bytes: buf.length, role: role(p) };
  });

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

/** Copy files into runs/<id>/inputs/<sub>/, verbatim, from a folder of the repository (only the listed names). */
function stage(id, sub, fromDir, names) {
  const to = join(REPO, 'runs', id, 'inputs', sub);
  rmSync(to, { recursive: true, force: true });
  for (const n of names) {
    mkdirSync(dirname(join(to, n)), { recursive: true });
    cpSync(join(REPO, fromDir, n), join(to, n));
  }
}

const KEEP = (l) =>
  /^✔ |^⚠ |^✖ |^ℹ |^Build completed|^[a-z-]+ exit=\d+$|depends on axioms|does not depend on any axioms|^warning: |: warning: |^error: |^Axiom '|^Lean default kernel|^Uses axioms|^WARNING: Sandbox|^leanchecker found|^uncaught exception|^\(kernel\)|^\("s\d"/.test(l);

function runConfig(id, versionInfo, cfg) {
  const inputsDir = join(REPO, 'runs', id, 'inputs');
  const scratch = mkdtempSync(join(tmpdir(), 'ssrec-'));
  cpSync(inputsDir, scratch, { recursive: true });
  spawnSync('chmod', ['-R', 'a+rwX', scratch]);
  const name = `ssrec-rerun-${id.slice(4).toLowerCase()}-${cfg.id}`.replace(/[^a-z0-9-]/g, '-');
  const argv = ['docker', 'run', '--rm', '--name', name, '--memory=6g', '--network', 'none', '-v', '<sandbox>/work:/w', '-w', '/w', IMAGE, 'sh', 'run.sh', cfg.id];
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = docker(argv.slice(1).map((a) => a.replace('<sandbox>/work', scratch)));
  const duration = Number(process.hrtime.bigint() - t0) / 1e9;
  rmSync(scratch, { recursive: true, force: true });
  const log = `${r.stdout}${r.stderr}`;
  const logPath = join(REPO, 'runs', id, `${cfg.id}.log`);
  writeFileSync(logPath, log);
  const inputs = [...inputsOf(join(inputsDir, cfg.dir)), ...inputsOf(inputsDir).filter((i) => i.path.endsWith('/run.sh'))];
  return {
    config: {
      id: cfg.id,
      origin: 'recorded',
      purpose: cfg.purpose,
      engine: 'lean',
      version: '4.35.0',
      binary_sha256: versionInfo.binarySha,
      image: IMAGE,
      started_at: started.toISOString(),
      duration_s: Math.round(duration * 1000) / 1000,
      argv,
      inputs,
      budget: { container_memory: '6g', network: 'none' },
      exit_code: r.status,
      verdict_lines: log.split('\n').filter(KEEP),
      outputs: [posix(relative(REPO, logPath))],
    },
    output: { path: posix(relative(REPO, logPath)), sha256: sha(Buffer.from(log)), bytes: Buffer.byteLength(log), kind: 'log' },
  };
}

/** The imported execution as configurations: `original` (the whole imported top level) and `original-<id>` for each imported configuration. */
function originals(imp) {
  const { id: _id, title: _t, task: _k, records: _r, recorded_at: _ra, configs = [], notes: _n, environment, version_string: _vs, binary: _b, ...core } = imp;
  const top = {
    id: 'original',
    origin: 'imported',
    purpose: `the execution W0-S11 imported from research/ (${imp.outputs.map((o) => o.path).join('; ')}), as the record's top level states it`,
    engine: core.engine,
    version: core.version,
    binary_sha256: core.binary_sha256,
    image: core.image,
    started_at: core.started_at,
    duration_s: core.duration_s,
    argv: core.argv,
    inputs: core.inputs,
    budget: core.budget,
    exit_code: core.exit_code,
    verdict_lines: core.verdict_lines,
    outputs: core.outputs.map((o) => o.path),
    values: core.values,
    environment,
    unrecorded: core.unrecorded,
  };
  return [top, ...configs.map((c) => ({ ...c, id: `original-${c.id}`, origin: c.origin ?? 'imported' }))];
}

function write(imp, recorded, outputs, notes, values) {
  const record = {
    ...imp,
    recorded_at: new Date().toISOString(),
    outputs: [...imp.outputs, ...outputs],
    values: { ...imp.values, ...values },
    rerun: {
      task: 'W1-T32',
      recorded_at: new Date().toISOString(),
      environment: environment(),
      recorder: 'content/audit/tools/rerun-lean-imported.mjs',
    },
    primary_config: 'original',
    configs: [...originals(imp), ...recorded],
    notes: [...(imp.notes ?? []), ...notes],
  };
  delete record.configs[0].values; // the top level already states them
  writeFileSync(join(REPO, 'runs', `${imp.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`recorded ${imp.id}: ${recorded.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}\n`);
}

const PAIR_SH = `if [ -f Scenarios.lean ]; then echo "--- scenarios"; lake env lean Scenarios.lean 2>&1; echo "scenarios exit=$?"; fi`;

function versionInfo() {
  return { binarySha: imageFact(`sha256sum ${LEAN_BIN} | cut -d' ' -f1`) };
}

// ------------------------------------------------------------------ RUN-lean-skipkernel

function rerunSkipkernel() {
  const id = 'RUN-lean-skipkernel';
  const imp = importedRecord(id);
  stage(id, 'probe', 'research/evidence/a2r3/lean/proj', ['lakefile.toml', 'lake-manifest.json', 'Probe.lean', 'Probe/Bypass.lean', 'Probe/Conserve.lean', 'Probe/Trust.lean', 'Report.lean']);
  for (const p of ['sound', 'flawed']) {
    const from = `runs/RUN-lean-skipkernel-pair/inputs/${p}`;
    stage(id, p, from, filesUnder(join(REPO, from)).map((f) => posix(relative(join(REPO, from), f))));
  }
  writeFileSync(
    join(REPO, 'runs', id, 'inputs', 'run.sh'),
    `#!/bin/sh
# run.sh <config>: one project as the Bench runs it. probe is the research/ project RUN-lean-skipkernel imported
# (research/evidence/a2r3/lean/proj); sound and flawed are AUD-2.3's pair. Build, read the axioms, replay every
# declaration in the kernel.
cd "$1"
lib=Ledger; [ "$1" = probe ] && lib=Probe
lake build 2>&1; echo "lake exit=$?"
lake env lean Report.lean 2>&1; echo "report exit=$?"
echo "--- leanchecker $lib"
lake env leanchecker $lib 2>&1; echo "leanchecker exit=$?"
${PAIR_SH}
`,
  );
  const v = versionInfo();
  const runs = [
    runConfig(id, v, { id: 'probe', dir: 'probe', purpose: 'run.sh probe: the imported probe project again, with argv: lake build, #print axioms (Report.lean), leanchecker Probe' }),
    runConfig(id, v, { id: 'sound', dir: 'sound', purpose: "run.sh sound: AUD-2.3's sound member (RUN-lean-skipkernel-pair's sound project): lake build, #print axioms conserves, leanchecker Ledger, then the step-3 scenarios" }),
    runConfig(id, v, { id: 'flawed', dir: 'flawed', purpose: "run.sh flawed: AUD-2.3's flawed member (RUN-lean-skipkernel-pair's flawed project), its conserves closed by a declaration added under debug.skipKernelTC: lake build, #print axioms conserves, leanchecker Ledger" }),
  ];
  const exit = (c, what) => Number(c.verdict_lines.find((l) => l.startsWith(`${what} exit=`))?.split('=')[1] ?? NaN);
  const values = {
    rerun: Object.fromEntries(runs.map(({ config: c }) => [c.id, { build_exit: exit(c, 'lake'), leanchecker_exit: exit(c, 'leanchecker'), leanchecker: exit(c, 'leanchecker') === 0 ? 'accepts' : 'rejects' }])),
  };
  write(imp, runs.map((r) => r.config), runs.map((r) => r.output), [
    "Re-run in place by W1-T32 (runs/README.md section 3). The top level is the imported execution, unchanged, and is also configuration original (primary_config): the course quotes its lines. Configurations probe, sound and flawed were executed with argv in the pinned Bench image by content/audit/tools/rerun-lean-imported.mjs.",
    "probe re-runs the imported project, research/evidence/a2r3/lean/proj, copied verbatim into inputs/probe (its BV.lean, which the library does not import, is left out): the proof of False built under debug.skipKernelTC builds, #print axioms lists no axiom for oops, and leanchecker rejects it.",
    "sound and flawed are AUD-2.3's pair (content/audit/AUD-2.3.yaml), the projects of RUN-lean-skipkernel-pair copied verbatim. The Audit Desk shows the option line and these verdict lines, never the construction in inputs/flawed/Ledger/Fast.lean (docs/AUDIT-DESK.md section 3.2).",
  ], values);
}

// ------------------------------------------------------------------ RUN-lean-axioms

function rerunAxioms() {
  const id = 'RUN-lean-axioms';
  const imp = importedRecord(id);
  stage(id, 'ledger', 'research/evidence/lean-measure/proj/ledger', ['lakefile.toml', 'lake-manifest.json', 'Ledger.lean', 'Ledger/Basic.lean', 'Ledger/Bad.lean']);
  stage(id, 'probe', 'research/evidence/a2r3/lean/proj', ['lakefile.toml', 'lake-manifest.json', 'Probe.lean', 'Probe/Bypass.lean', 'Probe/Conserve.lean', 'Probe/Trust.lean', 'Report.lean']);
  for (const p of ['sound', 'flawed']) {
    const from = `runs/RUN-lean-axioms-pair/inputs/${p}`;
    stage(id, p, from, filesUnder(join(REPO, from)).map((f) => posix(relative(join(REPO, from), f))));
  }
  writeFileSync(
    join(REPO, 'runs', id, 'inputs', 'run.sh'),
    `#!/bin/sh
# run.sh <config>. lean-bad and check-bad re-run the imported lean-measure project (research/evidence/lean-measure/
# proj/ledger): lean on Bad.lean, and lake check with Bad.lean imported (the container cannot start bwrap, so lake
# check runs with --inadvisably-no-sandbox, as the imported log's "Sandbox disabled" line shows the original did).
# trust-probe re-runs the imported a2r3 probe project. sound and flawed are AUD-2.2's pair: build, read the axioms,
# replay every declaration in the kernel, then the step-3 scenarios.
case "$1" in
  lean-bad)
    cd ledger
    lake env lean Ledger/Bad.lean 2>&1; echo "lean-bad exit=$?" ;;
  check-bad)
    cd ledger
    printf 'import Ledger.Basic\\nimport Ledger.Bad\\n' > Ledger.lean
    lake check --inadvisably-no-sandbox 2>&1; echo "check exit=$?" ;;
  trust-probe)
    cd probe
    lake build 2>&1; echo "lake exit=$?"
    lake env lean Report.lean 2>&1; echo "report exit=$?" ;;
  *)
    cd "$1"
    lake build 2>&1; echo "lake exit=$?"
    lake env lean Report.lean 2>&1; echo "report exit=$?"
    echo "--- leanchecker Ledger"
    lake env leanchecker Ledger 2>&1; echo "leanchecker exit=$?"
    ${PAIR_SH} ;;
esac
`,
  );
  const v = versionInfo();
  const runs = [
    runConfig(id, v, { id: 'check-bad', dir: 'ledger', purpose: 'run.sh check-bad: lake check --inadvisably-no-sandbox on the imported lean-measure project with Ledger/Bad.lean imported (the original check-bad, with argv)' }),
    runConfig(id, v, { id: 'lean-bad', dir: 'ledger', purpose: 'run.sh lean-bad: lean Ledger/Bad.lean, which uses sorry, a native axiom and a custom axiom (the original lean-bad, with argv)' }),
    runConfig(id, v, { id: 'trust-probe', dir: 'probe', purpose: 'run.sh trust-probe: lake build and #print axioms on the imported a2r3 probe project (the original trust-probe, with argv)' }),
    runConfig(id, v, { id: 'sound', dir: 'sound', purpose: "run.sh sound: AUD-2.2's sound member (RUN-lean-axioms-pair's sound project, rebalance proved by omega): lake build, #print axioms transfer_conserves, leanchecker Ledger, then the step-3 scenarios" }),
    runConfig(id, v, { id: 'flawed', dir: 'flawed', purpose: "run.sh flawed: AUD-2.2's flawed member (RUN-lean-axioms-pair's flawed project, rebalance declared as an axiom): lake build, #print axioms transfer_conserves, leanchecker Ledger, then the step-3 scenarios" }),
  ];
  const exitOf = (c, what) => {
    const l = c.verdict_lines.find((x) => x.startsWith(`${what} exit=`));
    return l === undefined ? null : Number(l.split('=')[1]);
  };
  const byId = Object.fromEntries(runs.map(({ config: c }) => [c.id, c]));
  const values = {
    rerun: {
      sorry_file_exit: exitOf(byId['lean-bad'], 'lean-bad'),
      lake_check_exit: exitOf(byId['check-bad'], 'check'),
      lake_check_kernel_line: byId['check-bad'].verdict_lines.find((l) => l.startsWith('Lean default kernel')) ?? null,
      sound: { build_exit: exitOf(byId.sound, 'lake'), leanchecker_exit: exitOf(byId.sound, 'leanchecker'), axioms: byId.sound.verdict_lines.find((l) => l.includes("'transfer_conserves'")) ?? null },
      flawed: { build_exit: exitOf(byId.flawed, 'lake'), leanchecker_exit: exitOf(byId.flawed, 'leanchecker'), axioms: byId.flawed.verdict_lines.find((l) => l.includes("'transfer_conserves'")) ?? null },
    },
  };
  write(imp, runs.map((r) => r.config), runs.map((r) => r.output), [
    "Re-run in place by W1-T32 (runs/README.md section 3). The top level is the imported execution, unchanged, and is also configuration original (primary_config); the imported configurations are kept as original-check-bad, original-lean-bad and original-trust-probe. The course quotes the top level's lines. Configurations check-bad, lean-bad, trust-probe, sound and flawed were executed with argv in the pinned Bench image by content/audit/tools/rerun-lean-imported.mjs.",
    "check-bad, lean-bad and trust-probe re-run the imported projects, copied verbatim into inputs/ledger (lakefile, manifest, Ledger.lean, Basic.lean and Bad.lean of research/evidence/lean-measure/proj/ledger) and inputs/probe (research/evidence/a2r3/lean/proj without BV.lean, which the library does not import). The lean-measure log's timed line ([01:23:24] ... rc=0) came from measure-local.sh's own timer; the re-run prints lean-bad exit=N instead.",
    "sound and flawed are AUD-2.2's pair (content/audit/AUD-2.2.yaml), the projects of RUN-lean-axioms-pair copied verbatim: the helper rebalance is a theorem proved by omega in one and an axiom in the other.",
  ], values);
}

const want = process.argv.slice(2);
if (want.length === 0 || want.includes('RUN-lean-skipkernel')) rerunSkipkernel();
if (want.length === 0 || want.includes('RUN-lean-axioms')) rerunAxioms();
void existsSync;
