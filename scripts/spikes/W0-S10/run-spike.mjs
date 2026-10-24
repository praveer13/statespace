#!/usr/bin/env node
// Acceptance driver for W0-S10: RUN-replay-gen.
//
//   node scripts/spikes/W0-S10/run-spike.mjs record [--bump-toolchain-dir <dir>]... [--soak <n>]
//       Runs the whole protocol and writes runs/RUN-replay-gen.json and runs/RUN-replay-gen/.
//   node scripts/spikes/W0-S10/run-spike.mjs verify [--bump-toolchain-dir <dir>]...
//       Re-executes the generator and compares with the committed outputs, the way
//       `statespace run RUN-replay-gen` will. Exit 0 only if everything is identical.
//
// The protocol that `record` runs:
//   1. generate the strips twice; every output file must be byte-identical          (acceptance)
//   2. generate once with the container pinned to one CPU, and `--soak` more times
//   3. simulated bump: the same toolchain with a pretty-printer default flipped;
//      the comparison must report a difference                                      (acceptance)
//   4. real probes: other Lean releases from toolchain directories, if given; reported, not asserted
//   5. a layout probe (format.width), a position scan of every proof and a scale probe (100 theorems)
//   6. fail-closed checks: a drifted tactic, a broken proof, a `sorry`, a CRLF source: none may produce strips
//   7. the server's start-up failure without /etc/localtime
//   8. fallback probe: a goal recorded as a #guard_msgs docstring passes now and fails under the simulated bump
//
// `--bump-toolchain-dir` is a directory used as ELAN_HOME, holding exactly one toolchain:
//   docker run --rm -e ELAN_HOME=/elanx -v <dir>:/elanx ss-lean:4.35.0 elan toolchain install leanprover/lean4:v4.36.0-rc1
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UTC_TZIF } from './lib/lean-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const GEN = 'scripts/spikes/W0-S10/gen-strips.mjs';
const DIFF = 'scripts/spikes/W0-S10/diff-strips.mjs';
const SCAN = 'scripts/spikes/W0-S10/scan-positions.mjs';
const SELF = 'scripts/spikes/W0-S10/run-spike.mjs';
const CORPUS = path.join(HERE, 'corpus');
const OUT = path.join(REPO, 'runs/RUN-replay-gen');
const IMAGE = 'ss-lean:4.35.0';
const SIM_OPTION = 'pp.fieldNotation=false';
const WIDTH_OPTION = 'format.width=40';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const round = (n) => Math.round(n * 1000) / 1000;
const lines = (s) => s.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));

function run(argv, input) {
  const t0 = process.hrtime.bigint();
  const startedAt = new Date().toISOString();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, encoding: 'utf8', input, timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '', durationS: Number(process.hrtime.bigint() - t0) / 1e9, startedAt };
}

function parseArgs(argv) {
  const o = { mode: argv[0], toolchainDirs: [], soak: 3 };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--bump-toolchain-dir') o.toolchainDirs.push(path.resolve(argv[++i]));
    else if (argv[i] === '--soak') o.soak = Number(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!['record', 'verify'].includes(o.mode)) throw new Error('usage: run-spike.mjs record|verify [--bump-toolchain-dir <dir>]... [--soak <n>]');
  return o;
}

/** A real-probe toolchain: the mount, the lean binary inside it, and the version in its name. */
function probe(dir) {
  const names = fs.readdirSync(path.join(dir, 'toolchains'));
  if (names.length !== 1) throw new Error(`expected exactly one toolchain in ${dir}, found ${names.length}`);
  const version = names[0].replace(/^.*---v/, '');
  return { dir, version, args: ['--mount', `${dir}:/elanx`, '--lean-bin', `/elanx/toolchains/${names[0]}/bin/lean`] };
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  o.probes = o.toolchainDirs.map(probe);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-s10-run-'));
  const shown = (argv) => argv.map((a) => {
    let r = a.replace(work, '<work>').replace(REPO, '<repo>');
    for (const p of o.probes) r = r.replace(p.dir, `<toolchain-dir:${p.version}>`);
    return r;
  });
  const gen = (name, extra = []) => {
    const argv = ['node', GEN, '--out', path.join(work, name), ...extra];
    return { argv, ...run(argv), dir: path.join(work, name) };
  };
  const diff = (a, b) => {
    const argv = ['node', DIFF, a, b];
    return { argv, ...run(argv) };
  };
  const scan = (stripsDir) => {
    const argv = ['node', SCAN, '--strips', stripsDir];
    return { argv, ...run(argv) };
  };
  try {
    return o.mode === 'record' ? record(o, work, { gen, diff, scan, shown }) : verify(o, { gen, diff, scan });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

function verify(o, { gen, diff, scan }) {
  let ok = true;
  const check = (label, pass, detail) => { console.log(`VERIFY ${label}: ${pass ? 'PASS' : 'FAIL'}${detail ? ` (${detail})` : ''}`); ok &&= pass; };
  const lastLine = (r) => lines(r.stdout).at(-1) ?? lines(r.stderr).at(-1) ?? '';
  const committed = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');

  const base = gen('base');
  const same = diff(path.join(OUT, 'strips'), base.dir);
  check('regenerated strips equal the committed strips', base.code === 0 && same.code === 0, lastLine(same));

  const sim = gen('sim', ['--lean-opt', SIM_OPTION]);
  const simSame = diff(path.join(OUT, 'bump-simulated'), sim.dir);
  const simDiff = diff(path.join(OUT, 'strips'), sim.dir);
  check('the simulated bump regenerates its committed strips', sim.code === 0 && simSame.code === 0, lastLine(simSame));
  check('the simulated-bump diff equals the committed diff', simDiff.code === 1 && simDiff.stdout === committed('bump-simulated.diff.txt'), lastLine(simDiff));

  for (const p of o.probes) {
    const real = gen(`real-${p.version}`, p.args);
    const realDiff = diff(path.join(OUT, 'strips'), real.dir);
    check(`the ${p.version} diff equals the committed diff`, real.code === 0 && realDiff.stdout === committed(`probe-${p.version}.diff.txt`), lastLine(realDiff));
  }

  const positions = scan(path.join(OUT, 'strips'));
  check('the position scan equals the committed scan', positions.code === 0 && positions.stdout === committed('position-scan.txt'), lastLine(positions));
  console.log(`VERIFY ${ok ? 'PASS' : 'FAIL'}`);
  return ok ? 0 : 1;
}

function record(o, work, { gen, diff, scan, shown }) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const configs = [];
  const verdictLines = [];
  const verdict = (line) => { verdictLines.push(line); console.log(line); };
  const lastLine = (r) => lines(r.stdout).at(-1) ?? '';
  const tzFile = path.join(work, 'localtime');
  fs.writeFileSync(tzFile, UTC_TZIF);

  /** One executed command as one entry of `configs`. */
  const entry = (id, group, purpose, r, extra = {}) => {
    const out = lines(r.stdout).map((l) => l.replace(work, '<work>'));
    const toolchain = /^gen: toolchain (Lean .*)$/m.exec(r.stdout);
    const binary = /^gen: toolchain bin\/lean sha256 ([0-9a-f]{64})$/m.exec(r.stdout);
    const e = {
      id,
      group,
      purpose,
      ...(toolchain ? { engine: 'lean', version: /version (\S+?),/.exec(toolchain[1])[1], version_string: toolchain[1], binary_sha256: binary[1] } : {}),
      argv: shown(r.argv),
      started_at: r.startedAt,
      duration_s: round(r.durationS),
      exit_code: r.code,
      verdict_lines: out,
      ...(r.stderr.trim() === '' ? {} : { stderr: lines(r.stderr) }),
      ...extra,
    };
    configs.push(e);
    return e;
  };

  // Environment.
  const dockerVersion = run(['docker', 'version', '--format', '{{.Server.Version}}']).stdout.trim();
  const imageId = run(['docker', 'image', 'inspect', '--format', '{{.Id}}', IMAGE]).stdout.trim();
  if (!/^sha256:[0-9a-f]{64}$/.test(imageId)) throw new Error(`image ${IMAGE} not found`);
  const imageOs = run(['docker', 'run', '--rm', '--network', 'none', '--memory=6g', IMAGE, 'sh', '-c', '. /etc/os-release && echo "$PRETTY_NAME"']).stdout.trim();

  // 1. Two runs: identical.
  const g1 = gen('pass-1');
  const g2 = gen('pass-2');
  const c12 = diff(g1.dir, g2.dir);
  if (g1.code !== 0) throw new Error(`baseline generation failed (exit ${g1.code}): ${g1.stderr}`);
  entry('generate-1', 'identical-runs', 'first cold run of the generator; its output is the committed baseline', g1);
  entry('generate-2', 'identical-runs', 'second cold run, a new container', g2);
  entry('compare-1-2', 'identical-runs', 'diff-strips on the two output directories: byte equality of every file', c12);
  const identical12 = g2.code === 0 && c12.code === 0;
  verdict(`RESULT identical-strips-across-two-runs: ${identical12 ? 'PASS' : 'FAIL'} (${lastLine(c12)})`);

  // 2. One CPU and a soak.
  const g3 = gen('pass-1cpu', ['--cpuset-cpus', '0']);
  const c13 = diff(g1.dir, g3.dir);
  entry('generate-1cpu', 'identical-under-other-scheduling', 'the container pinned to CPU 0', g3);
  entry('compare-1-1cpu', 'identical-under-other-scheduling', 'diff-strips against run 1', c13);
  let soakOk = true;
  for (let k = 1; k <= o.soak; k++) {
    const g = gen(`soak-${k}`);
    const c = diff(g1.dir, g.dir);
    entry(`generate-soak-${k}`, 'identical-under-other-scheduling', 'a further cold run', g);
    entry(`compare-1-soak-${k}`, 'identical-under-other-scheduling', 'diff-strips against run 1', c);
    soakOk &&= g.code === 0 && c.code === 0;
  }
  const identicalMore = g3.code === 0 && c13.code === 0 && soakOk;
  verdict(`RESULT identical-strips-under-one-cpu-and-further-runs: ${identicalMore ? 'PASS' : 'FAIL'} (one run pinned to CPU 0 and ${o.soak} further cold runs, each byte-equal to run 1)`);

  // 3. Simulated bump.
  const gs = gen('bump-simulated', ['--lean-opt', SIM_OPTION]);
  const cs = diff(g1.dir, gs.dir);
  entry('generate-bump-simulated', 'bump-simulated', `simulated bump: the same Lean 4.35.0 with the pretty-printer option ${SIM_OPTION} passed to the server (emulated: not a different toolchain)`, gs);
  entry('compare-baseline-bump-simulated', 'bump-simulated', 'the reviewable diff against run 1, saved in full as bump-simulated.diff.txt', cs, { verdict_lines: [lastLine(cs)], stdout_file: 'runs/RUN-replay-gen/bump-simulated.diff.txt' });
  const simulatedDiffers = gs.code === 0 && cs.code === 1 && /^DIFF: .* [1-9]\d* of \d+ states changed/.test(lastLine(cs));
  verdict(`RESULT simulated-bump-produces-a-diff: ${simulatedDiffers ? 'PASS' : 'FAIL'} (${lastLine(cs)})`);

  // 4. Real probes on other releases.
  const probes = [];
  for (const p of o.probes) {
    const gr = gen(`probe-${p.version}`, p.args);
    const cr = diff(g1.dir, gr.dir);
    probes.push({ ...p, gr, cr });
    entry(`generate-probe-${p.version}`, 'probe-releases', `real probe: Lean ${p.version} (installed with elan into a directory mounted read-only), not the pinned toolchain`, gr);
    entry(`compare-baseline-probe-${p.version}`, 'probe-releases', 'diff against run 1, saved in full', cr, { verdict_lines: [lastLine(cr)], stdout_file: `runs/RUN-replay-gen/probe-${p.version}.diff.txt` });
    verdict(`RESULT probe-release-${p.version}: ${gr.code === 0 ? 'INFO' : 'FAIL'} (generation exit ${gr.code}; ${lastLine(cr)})`);
  }

  // 5. Layout probe and position scan.
  const gw = gen('width', ['--lean-opt', WIDTH_OPTION]);
  const cw = diff(g1.dir, gw.dir);
  entry('generate-width-40', 'layout-and-positions', `layout probe: the option ${WIDTH_OPTION} passed to the server`, gw);
  entry('compare-baseline-width-40', 'layout-and-positions', 'diff against run 1', cw);
  verdict(`RESULT layout-probe-${WIDTH_OPTION}: ${gw.code === 0 ? 'INFO' : 'FAIL'} (${lastLine(cw)})`);
  const sc = scan(g1.dir);
  entry('scan-positions', 'layout-and-positions', 'the state plainGoal reports at every character of every proof, saved in full as position-scan.txt', sc, { verdict_lines: [lastLine(sc)], stdout_file: 'runs/RUN-replay-gen/position-scan.txt' });
  verdict(`RESULT position-scan: ${sc.code === 0 ? 'INFO' : 'FAIL'} (${lastLine(sc)})`);

  // Scale probe: 100 copies of the transfer_conserves shape in one source file, to see the cost of a bank.
  const scaleDir = path.join(work, 'scale');
  fs.mkdirSync(scaleDir);
  const ledger = fs.readFileSync(path.join(CORPUS, 'Ledger.lean'), 'utf8').split('\n');
  const header = ledger.slice(0, ledger.findIndex((l) => l.startsWith('theorem transfer_conserves'))).join('\n');
  const names = Array.from({ length: 100 }, (_, k) => `transfer_conserves_${String(k + 1).padStart(3, '0')}`);
  const tactics = ['unfold transfer total', 'split', 'simp', 'omega'];
  fs.writeFileSync(path.join(scaleDir, 'Scale.lean'), `${header}\n${names.map((n) => `theorem ${n} (s : Ledger) (n : Int) : total (transfer s n) = total s := by\n  unfold transfer total\n  split <;> simp <;> omega\n`).join('\n')}`);
  fs.writeFileSync(path.join(scaleDir, 'strips.json'), `${JSON.stringify({ sources: { 'Scale.lean': Object.fromEntries(names.map((n) => [n, tactics])) } })}\n`);
  const scaleArgv = ['node', GEN, '--out', path.join(work, 'scale-out'), '--corpus', scaleDir, '--spec', path.join(scaleDir, 'strips.json')];
  const gsc = { argv: scaleArgv, ...run(scaleArgv) };
  entry('generate-scale-100', 'scale', 'scale probe: one source with 100 copies of the transfer_conserves proof under different names, four tactics each', gsc);
  verdict(`RESULT scale-probe-100-theorems: ${gsc.code === 0 ? 'INFO' : 'FAIL'} (${lastLine(gsc)})`);

  // 6. Fail-closed checks.
  const read = (f) => fs.readFileSync(path.join(CORPUS, f), 'utf8');
  const replaceOnce = (text, from, to) => { if (text.split(from).length !== 2) throw new Error(`expected exactly one ${JSON.stringify(from)}`); return text.replace(from, to); };
  const neg = (id, purpose, edit, expect) => {
    const dir = path.join(work, `neg-${id}`);
    fs.mkdirSync(dir, { recursive: true });
    const files = { 'Ledger.lean': read('Ledger.lean'), 'Shapes.lean': read('Shapes.lean'), 'strips.json': read('strips.json') };
    edit(files);
    for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
    const argv = ['node', GEN, '--out', path.join(work, `neg-out-${id}`), '--corpus', dir, '--spec', path.join(dir, 'strips.json')];
    const r = { argv, ...run(argv) };
    const message = lines(r.stderr).filter((l) => l.startsWith('gen:') || l.startsWith('  ')).join(' | ');
    const passed = r.code === 1 && !fs.existsSync(path.join(work, `neg-out-${id}`)) && expect.test(message);
    entry(`fail-closed-${id}`, 'fail-closed', purpose, r, { expected_exit_code: 1, passed, verdict_lines: lines(r.stderr) });
    return passed;
  };
  const negatives = [
    neg('drifted-tactic', 'the spec names a tactic the source does not contain', (f) => { f['strips.json'] = replaceOnce(f['strips.json'], '"simp", "omega"]', '"simp", "linarith"]'); }, /not found after the previous one/),
    neg('broken-proof', 'a theorem statement edited so the proof no longer elaborates', (f) => { f['Ledger.lean'] = replaceOnce(f['Ledger.lean'], 'total (transfer s n) = total s := by', 'total (transfer s n) = total s + 1 := by'); }, /does not elaborate cleanly[\s\S]*error/),
    neg('sorry', 'a declaration that uses sorry elsewhere in a source file', (f) => { f['Shapes.lean'] += '\ntheorem unfinished : 1 = 2 := by\n  sorry\n'; }, /does not elaborate cleanly[\s\S]*sorry/),
    neg('crlf-source', 'a source file with CRLF line endings', (f) => { f['Shapes.lean'] = f['Shapes.lean'].replace(/\n/g, '\r\n'); }, /carriage return/),
  ];
  const failClosed = negatives.every(Boolean);
  verdict(`RESULT fail-closed: ${failClosed ? 'PASS' : 'FAIL'} (${negatives.filter(Boolean).length} of ${negatives.length} corpus variants refused with exit 1 and no output written)`);

  // 7. The server without /etc/localtime.
  const frame = (m) => { const b = JSON.stringify({ jsonrpc: '2.0', ...m }); return `Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`; };
  const input = frame({ id: 1, method: 'initialize', params: { processId: null, rootUri: 'file:///w', capabilities: {} } })
    + frame({ method: 'initialized', params: {} })
    + frame({ method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///w/Ledger.lean', languageId: 'lean4', version: 1, text: 'def x := 1\n' } } });
  const nl = run(['docker', 'run', '--rm', '-i', '--network', 'none', '--memory=6g', '-v', `${CORPUS}:/w:ro`, '-w', '/w', IMAGE, 'lean', '--server'], input);
  nl.argv = ['docker', 'run', '--rm', '-i', '--network', 'none', '--memory=6g', '-v', '<corpus>:/w:ro', '-w', '/w', IMAGE, 'lean', '--server'];
  const noLocaltime = nl.code === 1 && /Watchdog error: no such file or directory[\s\S]*\/etc\/localtime/.test(nl.stderr);
  // The initialize reply on stdout is not a verdict line; keep stdout out of the entry.
  entry('server-without-localtime', 'server-start-up', 'the server started without a /etc/localtime file, given initialize, initialized and didOpen on stdin; the generator mounts a UTC file so this does not happen', { ...nl, stdout: '' }, { expected_exit_code: 1, passed: noLocaltime, verdict_lines: lines(nl.stderr) });
  verdict(`RESULT server-needs-localtime: ${noLocaltime ? 'PASS' : 'FAIL'} (without the file the server exits ${nl.code} with: ${lines(nl.stderr).join(' ')})`);

  // 8. Fallback probe: a #guard_msgs docstring is the recorded goal and Lean itself compares.
  const fallback = (option) => {
    const argv = ['docker', 'run', '--rm', '--network', 'none', '--memory=6g', '-v', `${CORPUS}:/w:ro`, '-v', `${tzFile}:/etc/localtime:ro`, '-w', '/w', IMAGE, 'lean', ...(option ? [`-D${option}`] : []), 'Fallback.lean'];
    const r = { argv, ...run(argv) };
    r.argv = argv.map((a) => a.replace(CORPUS, '<corpus>').replace(tzFile, '<utc-localtime>'));
    return r;
  };
  const f1 = fallback(null);
  const f2 = fallback(SIM_OPTION);
  entry('fallback-pinned', 'fallback-guard-msgs', 'the fallback: the goal recorded as a #guard_msgs docstring (trace_state) and checked by lean itself, on the pinned toolchain; must exit 0 and print nothing', f1);
  entry('fallback-simulated-bump', 'fallback-guard-msgs', `the same file under the simulated bump (-D${SIM_OPTION}); must exit 1 with a docstring mismatch`, f2);
  const mismatch = /does not match generated message/.test(f2.stdout);
  const fallbackOk = f1.code === 0 && f1.stdout === '' && f2.code === 1 && mismatch;
  verdict(`RESULT fallback-guard-msgs: ${fallbackOk ? 'PASS' : 'FAIL'} (pinned: exit ${f1.code}${f1.stdout === '' ? ', no output' : ', output'}; simulated bump: exit ${f2.code}${mismatch ? ', docstring mismatch reported' : ', no mismatch reported'})`);

  const accepted = identical12 && simulatedDiffers;
  verdict(`RESULT acceptance (identical strips across two runs; a simulated bump produces a diff): ${accepted ? 'PASS' : 'FAIL'}`);

  // Outputs: the committed baseline, the simulated bump set, the probes' manifests, the diffs and the scan.
  fs.rmSync(OUT, { recursive: true, force: true });
  const copy = (from, to, only = null) => {
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) if (!only || only.includes(f)) fs.copyFileSync(path.join(from, f), path.join(to, f));
  };
  copy(g1.dir, path.join(OUT, 'strips'));
  copy(gs.dir, path.join(OUT, 'bump-simulated'));
  fs.writeFileSync(path.join(OUT, 'bump-simulated.diff.txt'), cs.stdout);
  for (const p of probes) {
    copy(p.gr.dir, path.join(OUT, `probe-${p.version}`), ['manifest.json']);
    fs.writeFileSync(path.join(OUT, `probe-${p.version}.diff.txt`), p.cr.stdout);
  }
  fs.writeFileSync(path.join(OUT, 'position-scan.txt'), sc.stdout);
  const outputs = [];
  const kind = (rel) => (rel.startsWith('runs/RUN-replay-gen/strips/') ? 'committed baseline strips (run 1)'
    : rel.startsWith('runs/RUN-replay-gen/bump-simulated/') ? 'strips regenerated under the simulated bump'
      : rel.endsWith('position-scan.txt') ? 'the state plainGoal reports at each character of each proof'
        : rel.endsWith('.diff.txt') ? 'reviewable diff against the baseline'
          : 'manifest of a probe regeneration (its strips equal the baseline)');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const rel = path.relative(REPO, p).split(path.sep).join('/');
      outputs.push({ path: rel, sha256: sha256(fs.readFileSync(p)), bytes: fs.statSync(p).size, kind: kind(rel), compare: 'byte-equal on re-run (verify mode)' });
    }
  };
  walk(OUT);

  const inputs = [];
  for (const [dir, role] of [[CORPUS, 'corpus'], [HERE, 'script'], [path.join(HERE, 'lib'), 'script']]) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!e.isFile()) continue;
      const p = path.join(dir, e.name);
      inputs.push({ path: path.relative(REPO, p).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(p)), role: e.name === 'strips.json' ? 'spec' : role });
    }
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(g1.dir, 'manifest.json'), 'utf8'));
  const exitCode = accepted && identicalMore && failClosed && noLocaltime && fallbackOk ? 0 : 1;
  const record = {
    id: 'RUN-replay-gen',
    title: 'Goal Replay strips generated through $/lean/plainGoal: identical across runs, and a simulated toolchain bump produces a diff (W0-S10)',
    engine: 'lean',
    version: /version (\S+?),/.exec(manifest.toolchain.banner)[1],
    version_string: manifest.toolchain.banner,
    binary_sha256: manifest.toolchain.binarySha256,
    binary: 'bin/lean of the 4.35.0 toolchain inside the image (the elan proxy at /opt/elan/bin/lean resolves to it)',
    image: IMAGE,
    recorded_at: new Date().toISOString(),
    started_at: startedAt,
    argv: shown(['node', SELF, ...process.argv.slice(2)]),
    inputs,
    budget: {
      container_memory: '6g',
      network: 'none',
      timeout_s: 300,
      request_timeout_s: 120,
      cpuset_cpus: 'all, except 0 in the one-CPU configuration',
      lean_options: 'Lean defaults; the only option changed is the -D flag a configuration lists',
    },
    exit_code: exitCode,
    duration_s: round((Date.now() - t0) / 1000),
    verdict_lines: verdictLines,
    outputs,
    environment: {
      os: `Linux ${os.release()} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`,
      cpu_count: os.cpus().length,
      ram_gib: Math.round(os.totalmem() / 2 ** 30),
      container: {
        runtime: 'docker',
        server_version: dockerVersion,
        image: IMAGE,
        id: imageId,
        digest: null,
        os: imageOs,
        run_flags: ['--rm', '--network none', '--memory=6g', '-v <corpus>:/w:ro', '-v <utc-localtime>:/etc/localtime:ro', '-w /w'],
      },
      host_tools: { node: process.version },
      emulated: true,
      emulation: 'the toolchain bump in the bump-simulated configurations is emulated by flipping a pretty-printer option on the pinned toolchain; the probe-releases configurations run actual other releases',
    },
    notes: [
      'Simulated bump: Lean 4.35.0 with the pretty-printer option pp.fieldNotation set to false through `lean --server -D`. It is the same toolchain, not a different release.',
      'The image is built locally and has no registry digest; environment.container.id is its content id and digest is null.',
      'Strips were generated and compared on this image only (Linux x86_64). No other platform was run.',
      'The one-CPU configuration pins the container with --cpuset-cpus=0.',
      'The probe-releases configurations are reported, not asserted: they use other releases (one a pre-release) installed with elan into directories outside the repository and mounted read-only, and are not pins.',
      'Positions in strips are 0-based LSP lines and UTF-16 characters.',
      'This record was not validated against run@1: schemas/run.schema.json did not exist when it was recorded (W0-S11 owns it). Field names follow the task rules for run records.',
    ],
    configs,
  };
  const text = `${JSON.stringify(record, null, 2)}\n`;
  const leak = /\/home\/|\/tmp\/|scratchpad|\/Users\//.exec(text);
  if (leak) throw new Error(`private path ${JSON.stringify(leak[0])} would be written to the run record`);
  fs.writeFileSync(path.join(REPO, 'runs/RUN-replay-gen.json'), text);
  console.log(`recorded runs/RUN-replay-gen.json (${outputs.length} output files, ${configs.length} configs, ${record.duration_s} s)`);
  return exitCode;
}

try {
  process.exit(main());
} catch (error) {
  console.error(`run-spike: ${error.message}`);
  process.exit(2);
}
