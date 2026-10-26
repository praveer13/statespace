#!/usr/bin/env node
// W1-T12: record the eleven S1 runs of spine section 9.5 under runs/, with argv, input hashes, budgets and
// outputs.
//
//   node scripts/spikes/W1-T12/record.mjs record [--only RUN-id,RUN-id] [--skip-browsers]
//   node scripts/spikes/W1-T12/record.mjs check [--root DIR]
//
// `record` executes everything: each Z3 script natively under uv (`uv run --with z3-solver==5.3.1`, the
// LAB-1 way), on Pyodide 314.0.7 with the Z3 5.3.1.0 wheel under Node and in Chromium, Firefox and WebKit
// (the pinned Playwright container, the INS-z3 way), and every sat or unsat query that has an SMT-LIB export
// again on cvc5 1.4.2 (the Bench binary; a query without one, an Optimize answer or an unsat core, is checked
// through a plain query that has one, lib.mjs's PLAIN_CHECKS); the PostgreSQL case in postgres:18; the Rust
// case in the Bench image. It writes
// runs/<RUN-id>.json and runs/<RUN-id>/. `check` re-derives every record's values and checks from its
// committed logs and compares them with the record, builds every Z3 record's generated notes again from the
// record's own configurations, values and logs and compares them too, checks that each browser configuration's
// session lies inside its docker run, and checks the sources (the shared helper block, the two verbatim copies
// from research/). Needs Node 22, uv, Docker and network access for the pinned packages.
//
// Scratch space: W1T12_SCRATCH when set (outside the repository), else the system temp directory. Every
// container runs with --memory=6g and --network none and is removed when it exits. Host paths in recorded argv
// and logs are replaced by <sandbox>; the record says what each placeholder stands for.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO, fileRecord, hostEnvironment, normalizePaths, sha256, sha256File } from '../../runs/registry.mjs';
import * as lib from './lib.mjs';

const INPUTS = path.join(REPO, 'runs', 'inputs', 'S1');
const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
const HARNESS_REL = 'scripts/spikes/W1-T12';
const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt('--only')?.split(',');
const wanted = (id) => !only || only.includes(id);

const Z3_RUNS = [
  { id: 'RUN-z3-boot-variant', script: 'boot_variant.py' },
  { id: 'RUN-z3-demorgan', script: 'demorgan.py' },
  { id: 'RUN-z3-vacuous-unsat', script: 'vacuous_unsat.py' },
  { id: 'RUN-z3-double-capture', script: 'double_capture.py' },
  { id: 'RUN-z3-refund-mint', script: 'refund_mint.py' },
  { id: 'RUN-z3-bv64-negamt', script: 'bv64_negamt.py', original: { script: 'original/z3_negamt.py', research: 'research/evidence/a2r3/scripts/z3_negamt.py' } },
  { id: 'RUN-z3-btc2010', script: 'btc2010.py' },
  { id: 'RUN-z3-bloch06', script: 'bloch06.py' },
  { id: 'RUN-z3-smtlib-tour', script: 'smtlib_tour.py', tour: true },
];
export { Z3_RUNS };
const ALL_IDS = [...Z3_RUNS.map((r) => r.id), 'RUN-pg-numeric-bound', 'RUN-rust-i64'];
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const RLIMIT = 5000000;
const HARNESS_TIMEOUT_S = 600; // a command the recording script runs is stopped after this long
const BROWSER_TIMEOUT_S = 900; // a browser's docker run, which holds every Z3 script, after this long
const CVC5_FILE_TIMEOUT_S = 60; // cvc5-check.sh stops cvc5 on one file after this long
const PINS = {
  z3: '5.3.1',
  wheelNative: 'z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl',
  cvc5Binary: '6aecddf466552b83bb5883756c7955e0c9d5ddcc6d7f45b48c2f6e06a741b102', // RUN-scaffold, the Bench binary
};

/** The budget of a Z3 configuration: every script call has rlimit; the tour's one budget is set in a file. */
const z3Budget = (run, extra = {}) => ({
  ...(run.tour ? { rlimit: RLIMIT, set_in: 'smtlib/unknown_canceled.smt2, by (set-option :rlimit 5000000); the other four files run without a budget' } : { rlimit: RLIMIT }),
  harness_timeout_s: HARNESS_TIMEOUT_S,
  ...extra,
});

const TITLES = {
  'RUN-z3-boot-variant': "Boot's variant, a guard that reads the recipient's balance, lets a transfer overdraw the sender; the corrected guard gives unsat",
  'RUN-z3-demorgan': "The mis-negation a' < 0 and b' < 0 is unsat on the unguarded transfer; the correct negation a' < 0 or b' < 0 is sat with a witness",
  'RUN-z3-vacuous-unsat': "Contradictory premises make every violation query unsat, and the premise query is the tell: CL-1.1's premise witness and the MAX_TRANSFER = 0 config with its unsat core",
  'RUN-z3-double-capture': 'A capture applied twice to one hold conserves money and breaks at-most-once; the held >= h patch fixes the instance and not the class; the status guard is unsat',
  'RUN-z3-refund-mint': "The clamp refund rule mints money, and a witness-sized patch leaves a larger witness; rejecting a refund above the merchant's balance is unsat and not vacuous",
  'RUN-z3-bv64-negamt': 'Over signed BitVec 64 the guard without amount > 0 lets the sender wrap negative; over Int a negative amount drains the recipient and never the sender',
  'RUN-z3-btc2010': 'A toy model of CVE-2010-5139: outputs summed in 64-bit arithmetic pass the check while creating value, and range checks make it unsat',
  'RUN-z3-bloch06': "A toy model of Bloch's 2006 binary-search midpoint: (low + high) / 2 leaves low..high in signed 32-bit arithmetic, and the two cures do not",
  'RUN-z3-smtlib-tour': "D-13's SMT-LIB examples through the Z3 command line, its API interpreter and Pyodide: sat with a model, unsat, unknown with its reason, and a budget set with (set-option :rlimit)",
  'RUN-pg-numeric-bound': 'PostgreSQL 18.6: a numeric column with a declared bound raises 22003 at that bound, bigint raises 22003 at its own, and an unbounded numeric commits',
  'RUN-rust-i64': 'Rust 1.96.0 i64: the dev profile panics on overflow, the release profile wraps, and checked_add returns None',
};
const RECORDS = {
  'RUN-z3-boot-variant': "S1.L0 and SP-1.1: the variant's violation is sat with a witness that replays (the cold-start fallback for Boot's cell); the corrected guard, the roadmap's starter, is unsat; an amount above both balances fails the guard; the violating inputs are those with amount > a; with equal balances the variant guard cannot overdraw",
  'RUN-z3-demorgan': "S1.L1 segment 1 and D-03: on the unguarded transfer the mis-negation is unsat, the correct negation is sat with a witness, and De Morgan's identity holds: not (a' >= 0 and b' >= 0) is the same formula as a' < 0 or b' < 0",
  'RUN-z3-vacuous-unsat': "S1.L3, D-02, SP-1.6, CL-1.1 and AUD-1.1: the guarded violation is unsat beside a sat premise query (the premise witness); with MAX_TRANSFER = 0 the violation, the absurd property and the premises alone are all unsat, with the two-constraint core amount > 0 and amount <= MAX_TRANSFER; MAX_TRANSFER = 100 is the control",
  'RUN-z3-double-capture': "S1.L4 cell 2 (queries i to v), SP-1.2 and CL-1.3: conservation holds under a double capture, at-most-once fails by a gain of 2h, the held >= h patch refuses the single-hold instance and lets pooled holds through, the status guard is unsat and one fixed capture succeeds; Optimize on the hold amount and on the pooled balance, each checked by a plain query",
  'RUN-z3-refund-mint': "S1.L4's refund variant, LAB-1.4, SP-1.3 and CL-1.4: the clamp mints and still keeps the merchant non-negative; Optimize finds a mint of 1; two special-case patches leave witnesses, the second with a smallest mint of 2; each minimum is checked by a plain query; the fixed rule is unsat, accepts some refund and leaves a rejected refund unchanged",
  'RUN-z3-bv64-negamt': "S1.L5 segment 1 and the Defence's zero-or-negative item: signed BitVec 64 without amount > 0 lets A - X wrap below zero, and with it the same violation is unsat; the Int twin of z3_negamt.py gives sat for the recipient's drain, unsat for the sender, unsat for a change under a zero amount",
  'RUN-z3-btc2010': 'SP-1.9, a dated incident as a toy model: the buggy check passes a transaction whose outputs sum to more than its inputs; a range check on each output, and the 2010 fix, make that unsat; the fixed check still accepts some transaction',
  'RUN-z3-bloch06': 'SP-1.10, a dated incident as a toy model: the buggy midpoint leaves low..high; low + (high - low) / 2 and the logical shift keep it inside; the premises are satisfiable',
  'RUN-z3-smtlib-tour': "D-13: the starter as SMT-LIB gives sat with a model, the guard added gives unsat, `(get-model)` after unsat is an interpreter error, an exponent query gives unknown with Z3's reason, and a cubes query under (set-option :rlimit 5000000) gives unknown with the reason canceled",
  'RUN-pg-numeric-bound': "S1.L5's six-row table and S6.L4's remedy 3: crediting 1 at the edge of bigint, of numeric(19,0) and of an unbounded numeric",
  'RUN-rust-i64': "S1.L5's six-row table, CL-1.5's assumption and the D-30 card: an i64 sum that overflows, in the dev and release profiles, and checked_add",
};

// ------------------------------------------------------------------------------------------ helpers
const scratchRoot = process.env.W1T12_SCRATCH ?? os.tmpdir();
let WORK = null;
const clean = (text) => normalizePaths(text, { sandbox: WORK ? [WORK] : [] });

function exec(argv, { cwd, timeoutMs = HARNESS_TIMEOUT_S * 1000 } = {}) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 1 << 28 });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  return { code: r.status, signal: r.signal, stdout: r.stdout ?? '', stderr: r.stderr ?? '', started_at: started.toISOString(), duration_s };
}
const must =(r, what) => {
  if (r.code !== 0) throw new Error(`${what} failed (exit ${r.code}${r.signal ? `, ${r.signal}` : ''}): ${clean(r.stderr || r.stdout).split('\n').slice(0, 6).join(' | ')}`);
  return r;
};

function imageRef(tag) {
  const dig = spawnSync('docker', ['image', 'inspect', tag, '--format', '{{json .RepoDigests}}'], { encoding: 'utf8' });
  if (dig.status !== 0) throw new Error(`docker image ${tag} is not here`);
  const repo = JSON.parse(dig.stdout.trim() || '[]');
  const name = tag.includes(':') ? tag : `${tag}:latest`;
  if (repo.length) return `${name}@${repo[0].split('@')[1]}`;
  const id = spawnSync('docker', ['image', 'inspect', tag, '--format', '{{.Id}}'], { encoding: 'utf8' }).stdout.trim();
  return `${tag.split(':')[0]}@${id}`;
}
const dockerServer = () => spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8' }).stdout.trim() || null;
const IMAGES = { bench: 'statespace-bench:w0t05', playwright: 'mcr.microsoft.com/playwright:v1.63.0-noble', postgres: 'postgres:18' };

const mkdir = (...p) => fs.mkdirSync(path.join(...p), { recursive: true });
const runDir = (id) => path.join(REPO, 'runs', id);
const writeLog = (id, name, text) => {
  mkdir(runDir(id));
  const file = path.join(runDir(id), name);
  fs.writeFileSync(file, text);
  return rel(file);
};
const out = (relPath, kind) => fileRecord(REPO, relPath, { kind });
const posixCopy = (from, to) => {
  mkdir(path.dirname(to));
  fs.copyFileSync(from, to);
};
const recordArgv = (argv, placeholders) => argv.map((a) => {
  let o = a;
  for (const [real, shown] of placeholders) o = o.split(real).join(shown);
  return normalizePaths(o, { sandbox: [WORK] });
});
const inputFile = (relPath, role) => fileRecord(REPO, relPath, { role });
const uniq = (items) => [...new Map(items.map((i) => [i.path ?? i.url ?? i.name, i])).values()];

// ---------------------------------------------------------------------------------- the pinned engines
async function engines() {
  const { fetchEngines } = await import(pathToFileURL(path.join(REPO, 'scripts', 'spikes', 'W0-S02', 'fetch-engines.mjs')).href);
  const dir = path.join(scratchRoot, 'w1t12-engines');
  const report = await fetchEngines(dir);
  return { dir, report };
}

// ------------------------------------------------------------------------------------ the native host
let nativeFacts = null;
function probeNative() {
  if (nativeFacts) return nativeFacts;
  const uvArgs = ['uv', 'run', '--no-project', '--quiet', '--with', `z3-solver==${PINS.z3}`];
  const py = must(exec([...uvArgs, 'python', '-I', '-c', 'import sys, os, hashlib, importlib.metadata as m, z3; lib = os.path.join(os.path.dirname(z3.__file__), "lib", "libz3.so"); print(sys.version.split()[0]); print(m.version("z3-solver")); print(z3.get_version_string()); print(hashlib.sha256(open(lib, "rb").read()).hexdigest()); print(os.path.getsize(lib))']), 'the native probe');
  const [python, wheelVersion, printed, libSha, libBytes] = py.stdout.trim().split('\n');
  const cli = must(exec([...uvArgs, 'sh', '-c', 'sha256sum "$(command -v z3)"; wc -c < "$(command -v z3)"; z3 --version']), 'the z3 command probe');
  const [cliShaLine, cliBytes, cliVersion] = cli.stdout.trim().split('\n');
  const uv = exec(['uv', '--version']).stdout.trim();
  const pypi = exec(['curl', '-sS', '--max-time', '60', 'https://pypi.org/pypi/z3-solver/5.3.1.0/json']);
  const wheel = (JSON.parse(pypi.stdout).urls ?? []).find((f) => f.filename === PINS.wheelNative);
  if (!wheel) throw new Error(`PyPI lists no ${PINS.wheelNative}`);
  nativeFacts = {
    uvArgs,
    python,
    wheelVersion,
    printed,
    libSha,
    libBytes: Number(libBytes),
    cliSha: cliShaLine.split(' ')[0],
    cliBytes: Number(cliBytes),
    cliVersion: cliVersion.trim(),
    uv,
    wheelInput: { url: wheel.url, file: wheel.filename, sha256: wheel.digests.sha256, bytes: wheel.size, role: 'wheel' },
  };
  return nativeFacts;
}

// -------------------------------------------------------------------------- one Z3 script, five ways
const stage = (id, tag, files) => {
  const dir = path.join(WORK, tag, id);
  mkdir(dir);
  for (const f of files) posixCopy(path.join(INPUTS, id, f), path.join(dir, f));
  return dir;
};
const supportFiles = (run) => (run.tour ? fs.readdirSync(path.join(INPUTS, run.id, 'smtlib')).sort().map((f) => `smtlib/${f}`) : []);
const scriptInputs = (run) => [inputFile(`runs/inputs/S1/${run.id}/${run.script}`, 'script'), ...supportFiles(run).map((f) => inputFile(`runs/inputs/S1/${run.id}/${f}`, 'fixture'))];

function runNative(run, { configId = 'native', logName = 'native.log', purpose } = {}) {
  const n = probeNative();
  const dir = stage(run.id, `native-${configId}`, [run.script, ...supportFiles(run)]);
  const argv = [...n.uvArgs, 'python', '-I', run.script];
  const r = exec(argv, { cwd: dir });
  const log = clean(r.stdout);
  const logPath = writeLog(run.id, logName, log);
  const exports = [];
  if (fs.existsSync(path.join(dir, 'smt2'))) {
    for (const f of fs.readdirSync(path.join(dir, 'smt2')).sort()) {
      posixCopy(path.join(dir, 'smt2', f), path.join(runDir(run.id), 'smt2', f));
      exports.push(`runs/${run.id}/smt2/${f}`);
    }
  }
  return {
    r,
    log,
    exports,
    config: {
      id: configId,
      purpose: purpose ?? 'the script under uv with the z3-solver 5.3.1.0 wheel on CPython, the LAB-1 way (labs/TOOLS.md section 2.1); the primary configuration',
      origin: 'recorded',
      engine: 'z3',
      version: n.printed,
      binary_sha256: n.libSha,
      image: null,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv,
      inputs: [...scriptInputs(run), n.wheelInput],
      budget: z3Budget(run),
      exit_code: r.code,
      verdict_lines: lib.humanLines(log),
      outputs: [logPath, ...exports],
      environment: { python: `CPython ${n.python}`, uv: n.uv, library: `libz3.so ${n.libBytes} bytes` },
    },
  };
}

function runNativeCli(run) {
  const n = probeNative();
  const dir = stage(run.id, 'native-cli', [...supportFiles(run), 'tour_cli.sh']);
  const argv = [...n.uvArgs, 'sh', 'tour_cli.sh'];
  const r = exec(argv, { cwd: dir });
  const log = clean(r.stdout);
  const logPath = writeLog(run.id, 'cli-native.log', log);
  return {
    r,
    log,
    config: {
      id: 'cli-native',
      purpose: 'the Z3 command line, `z3 file.smt2`, on each file; the executable the z3-solver wheel installs; the primary configuration',
      origin: 'recorded',
      engine: 'z3',
      version: n.printed,
      binary_sha256: n.cliSha,
      image: null,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv,
      inputs: [inputFile(`runs/inputs/S1/${run.id}/tour_cli.sh`, 'script'), ...supportFiles(run).map((f) => inputFile(`runs/inputs/S1/${run.id}/${f}`, 'fixture')), n.wheelInput],
      budget: z3Budget(run),
      exit_code: r.code,
      verdict_lines: lib.humanLines(log),
      outputs: [logPath],
      environment: { uv: n.uv, executable: `bin/z3 ${n.cliBytes} bytes`, version_line: n.cliVersion },
    },
  };
}

function pyodideInputs(enginesInfo) {
  const { report } = enginesInfo;
  return [
    { url: report.pyodide.url, file: 'pyodide-314.0.7.tgz', sha256: report.pyodide.tarballSha256, bytes: report.pyodide.tarballBytes, role: 'engine' },
    { url: report.z3.url, file: report.z3.file, sha256: report.z3.sha256, bytes: report.z3.bytes, role: 'wheel' },
  ];
}

function runPyodideNode(run, enginesInfo) {
  const dir = stage(run.id, 'pyodide-node', [run.script, ...supportFiles(run)]);
  const wheel = path.join(enginesInfo.dir, enginesInfo.report.z3.file);
  const argv = ['node', path.join(REPO, HARNESS_REL, 'pyodide-node.mjs'), '--pyodide', path.join(enginesInfo.dir, 'pyodide'), '--wheel', wheel, '--script', run.script, ...supportFiles(run).flatMap((f) => ['--file', `${f}=${f}`])];
  const r = exec(argv, { cwd: dir });
  const log = clean(r.stdout);
  const logPath = writeLog(run.id, 'pyodide-node.log', log);
  const meta = Object.fromEntries([...r.stderr.matchAll(/^# (\w+): (.*)$/gm)].map((m) => [m[1], m[2]]));
  const pyodideVersion = (/^# pyodide: (\d[\d.]*)$/m.exec(r.stderr) ?? [])[1] ?? null;
  const shown = recordArgv(argv, [[path.join(REPO, HARNESS_REL), HARNESS_REL], [path.join(enginesInfo.dir, 'pyodide'), '<sandbox>/engines/pyodide'], [wheel, `<sandbox>/engines/${enginesInfo.report.z3.file}`]]);
  return {
    r,
    log,
    config: {
      id: 'pyodide-node',
      purpose: "the script in Pyodide under Node with this task's harness, pyodide-node.mjs: the setting in which RUN-z3-bv64-pyodide ran (with a harness of its own) and in which the spine's GATE-calls reproduces a Call It answer; Pyodide 314.0.7 and the Z3 5.3.1.0 wheel, a fresh engine and a fresh Python namespace for the script",
      origin: 'recorded',
      engine: 'z3',
      version: (/^z3 (\S+)/m.exec(log) ?? [])[1] ?? null,
      binary_sha256: enginesInfo.report.z3.sha256,
      image: null,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv: shown,
      inputs: [...scriptInputs(run), inputFile(`${HARNESS_REL}/pyodide-node.mjs`, 'harness'), ...pyodideInputs(enginesInfo)],
      budget: z3Budget(run),
      exit_code: r.code,
      verdict_lines: lib.humanLines(log),
      outputs: [logPath],
      environment: { pyodide: pyodideVersion, python: `CPython ${meta.python ?? '?'}`, node: meta.node ?? null, load_pyodide_ms: Number(meta.load_pyodide_ms ?? NaN), load_wheel_ms: Number(meta.load_wheel_ms ?? NaN), script_ms: Number(meta.script_ms ?? NaN) },
    },
  };
}

// ---------------------------------------------------------------------------- Pyodide in three browsers
function runBrowsers(enginesInfo) {
  const image = imageRef(IMAGES.playwright);
  const pw = path.join(REPO, 'node_modules', 'playwright-core');
  const pwVersion = JSON.parse(fs.readFileSync(path.join(pw, 'package.json'), 'utf8')).version;
  const result = {};
  for (const b of BROWSERS) {
    const outDir = path.join(WORK, 'browsers', b);
    mkdir(outDir);
    const container = `w1t12-${b}`;
    const argv = [
      'docker', 'run', '--rm', '--init', '--name', container, '--memory=6g', '--shm-size=1g', '--network', 'none',
      '-v', `${path.join(REPO, HARNESS_REL)}:/s:ro`, '-v', `${enginesInfo.dir}:/engines:ro`, '-v', `${INPUTS}:/inputs:ro`, '-v', `${pw}:/pw:ro`, '-v', `${outDir}:/out`,
      '-e', `HOST_UID=${process.getuid()}`, '-e', `HOST_GID=${process.getgid()}`,
      image, 'sh', '-c',
      `node /s/pyodide-browser.mjs --engines /engines --inputs /inputs --out /out --playwright /pw/index.mjs --browsers ${b}; code=$?; chown -R $HOST_UID:$HOST_GID /out; exit $code`,
    ];
    spawnSync('docker', ['rm', '-f', container], { encoding: 'utf8' });
    const r = exec(argv, { timeoutMs: BROWSER_TIMEOUT_S * 1000 });
    const metaFile = path.join(outDir, b, 'meta.json');
    if (!fs.existsSync(metaFile)) throw new Error(`the ${b} container wrote no meta.json: ${clean(r.stderr || r.stdout).slice(0, 400)}`);
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    const shown = recordArgv(argv, [[path.join(REPO, HARNESS_REL), HARNESS_REL], [enginesInfo.dir, '<sandbox>/engines'], [INPUTS, 'runs/inputs/S1'], [pw, 'node_modules/playwright-core'], [outDir, '<sandbox>/out']]);
    result[b] = { r, meta, outDir, argv: shown, image, pwVersion };
  }
  return result;
}

/**
 * One browser configuration of a run, from the browser's docker run (`info`). The session inside it (meta.json's
 * started_at to finished_at: after the browser launched, until the last script finished) and the docker run around
 * it (from the moment this script started the command to its exit) are two different spans, recorded under two
 * names; the note that reads them says which is which.
 */
function browserConfig(run, b, info, enginesInfo) {
  const m = info.meta;
  const logFile = path.join(info.outDir, b, `${run.id}.log`);
  const log = clean(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '');
  const logPath = writeLog(run.id, `pyodide-${b}.log`, log);
  const per = m.runs?.[run.id] ?? {};
  const sessionMs = Date.parse(m.finished_at ?? '') - Date.parse(m.started_at ?? '');
  return {
    log,
    config: {
      id: `pyodide-${b}`,
      purpose: `the script in Pyodide in a module worker in ${b} ${m.version} (a desktop build, headless, not a phone; a page from a local static server without COOP or COEP, so not cross-origin isolated, as static hosting serves it), a fresh Python namespace: the tab's engine as INS-z3 will start it`,
      origin: 'recorded',
      engine: 'z3',
      version: (/^z3 (\S+)/m.exec(log) ?? [])[1] ?? null,
      binary_sha256: enginesInfo.report.z3.sha256,
      image: info.image,
      started_at: m.started_at,
      duration_s: per.script_ms != null ? per.script_ms / 1000 : null,
      argv: info.argv,
      inputs: [...scriptInputs(run), inputFile(`${HARNESS_REL}/pyodide-browser.mjs`, 'harness'), inputFile(`${HARNESS_REL}/browser/index.html`, 'harness'), inputFile(`${HARNESS_REL}/browser/worker.mjs`, 'harness'), ...pyodideInputs(enginesInfo), { name: 'node_modules/playwright-core/package.json', sha256: sha256File(path.join(REPO, 'node_modules', 'playwright-core', 'package.json')), role: `harness dependency, playwright-core ${info.pwVersion}` }],
      budget: z3Budget(run, { harness_timeout_s: BROWSER_TIMEOUT_S, container_memory: '6g', network: 'none', shm_size: '1g' }),
      exit_code: info.r.code,
      verdict_lines: lib.humanLines(log),
      outputs: [logPath],
      environment: {
        browser: `${b} ${m.version}`,
        pyodide: m.engine?.pyodide ?? null,
        python: `CPython ${m.engine?.python ?? '?'}`,
        load_pyodide_ms: m.engine?.load_pyodide_ms ?? null,
        load_wheel_ms: m.engine?.load_wheel_ms ?? null,
        script_ms: per.script_ms ?? null,
        session_wall_ms: Number.isFinite(sessionMs) ? sessionMs : null,
        docker_run_started_at: info.r.started_at,
        docker_run_wall_ms: Math.round(info.r.duration_s * 1000),
      },
    },
  };
}

// ------------------------------------------------------------------------------------------ cvc5 cross-check
let cvc5Facts = null;
function runCvc5(run, nativeRes) {
  const image = imageRef(IMAGES.bench);
  const dir = path.join(WORK, 'cvc5', run.id);
  mkdir(dir);
  let fed;
  if (run.tour) {
    fed = ['starter', 'starter_guarded'].map((f) => [path.join(INPUTS, run.id, 'smtlib', `${f}.smt2`), `${f}.smt2`]);
  } else {
    fed = nativeRes.exports.map((e) => [path.join(REPO, e), path.basename(e)]);
  }
  for (const [from, name] of fed) posixCopy(from, path.join(dir, name));
  if (!cvc5Facts) {
    // the per-file limit the budget states is the one the driver applies
    if (!fs.readFileSync(path.join(REPO, HARNESS_REL, 'cvc5-check.sh'), 'utf8').includes(`timeout ${CVC5_FILE_TIMEOUT_S} cvc5 `)) throw new Error(`cvc5-check.sh does not stop cvc5 after ${CVC5_FILE_TIMEOUT_S} s, as the budget would say`);
    const probe = must(exec(['docker', 'run', '--rm', '--memory=6g', '--network', 'none', image, 'sh', '-c', 'sha256sum /usr/local/bin/cvc5; cvc5 --version | head -1']), 'the cvc5 probe');
    const [shaLine, versionLine] = probe.stdout.trim().split('\n');
    cvc5Facts = { sha: shaLine.split(' ')[0], version: versionLine.trim() };
    if (cvc5Facts.sha !== PINS.cvc5Binary) throw new Error(`the Bench's cvc5 hashes to ${cvc5Facts.sha}, not the pin ${PINS.cvc5Binary}`);
  }
  const container = `w1t12-cvc5-${run.id.slice(4, 30)}`;
  const argv = ['docker', 'run', '--rm', '--name', container, '--memory=6g', '--network', 'none', '-v', `${path.join(REPO, HARNESS_REL)}:/s:ro`, '-v', `${dir}:/q:ro`, image, 'sh', '/s/cvc5-check.sh', '/q'];
  spawnSync('docker', ['rm', '-f', container], { encoding: 'utf8' });
  const r = exec(argv);
  const log = clean(r.stdout);
  const logPath = writeLog(run.id, 'cvc5-bench.log', log);
  const shown = recordArgv(argv, [[path.join(REPO, HARNESS_REL), HARNESS_REL], [dir, '<sandbox>/smt2']]);
  const fedInputs = run.tour
    ? fed.map(([, name]) => inputFile(`runs/inputs/S1/${run.id}/smtlib/${name}`, 'query'))
    : nativeRes.exports.map((e) => inputFile(e, 'query'));
  return {
    log,
    config: {
      id: lib.CVC5_CONFIG,
      purpose: `a second solver on the queries: ${run.tour ? 'the tour\'s starter and its guarded form, as SMT-LIB text' : 'every sat or unsat query of the run that has an SMT-LIB export, as that text'}, on ${cvc5Facts.version}, the Bench binary (the spine\'s "authored unsat cross-checked on cvc5")`,
      origin: 'recorded',
      engine: 'cvc5',
      version: (/^cvc5 (\d[\w.]*)/.exec(cvc5Facts.version) ?? [])[1] ?? cvc5Facts.version,
      version_string: cvc5Facts.version,
      binary_sha256: cvc5Facts.sha,
      image,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv: shown,
      inputs: [inputFile(`${HARNESS_REL}/cvc5-check.sh`, 'harness'), ...fedInputs],
      budget: { per_file_timeout_s: CVC5_FILE_TIMEOUT_S, harness_timeout_s: HARNESS_TIMEOUT_S, container_memory: '6g', network: 'none' },
      exit_code: r.code,
      verdict_lines: lib.humanLines(log),
      outputs: [logPath],
      environment: { container_image: image },
    },
  };
}

// --------------------------------------------------------------------------------------- record assembly
function assemble({ id, primary, configs, values, checks, notes, unrecorded = [], environment, extra = {} }) {
  const p = configs.find((c) => c.id === primary);
  const allOutputs = [...new Set(configs.flatMap((c) => c.outputs))];
  const kindOf = (f) => (f.endsWith('.smt2') ? 'SMT-LIB export of a query' : f.endsWith('.log') ? 'log' : 'output');
  const record = {
    id,
    title: TITLES[id],
    task: 'W1-T12',
    origin: 'recorded',
    records: RECORDS[id],
    engine: p.engine,
    version: p.version,
    ...(p.version_string ? { version_string: p.version_string } : {}),
    binary: extra.binary ?? null,
    binary_sha256: p.binary_sha256,
    image: p.image,
    recorded_at: new Date().toISOString(),
    started_at: p.started_at,
    duration_s: p.duration_s,
    argv: extra.argv ?? p.argv,
    inputs: uniq(configs.flatMap((c) => c.inputs)),
    budget: p.budget,
    exit_code: p.exit_code,
    verdict_lines: p.verdict_lines,
    outputs: allOutputs.map((f) => out(f, kindOf(f))),
    values,
    checks,
    pass: checks.every((c) => c.pass),
    environment,
    primary_config: primary,
    configs: configs.map((c) => ({ ...c })),
    unrecorded,
    notes,
  };
  if (!record.unrecorded.length) delete record.unrecorded;
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

const hostEnv = (extra = {}) => ({ ...hostEnvironment(), docker: dockerServer(), node: process.version, ...extra });

// ------------------------------------------------------------------------------------------- the notes
// A sentence that states a fact about this recording is worked out from the configurations, values and logs it
// describes, so that it holds for the record it is written into (an Optimize answer has no export; a browser's
// figures are as coarse as its logs show). A fixed sentence says only what a recording cannot change: the scripts
// and their encodings, what the curriculum asks of them, and how the recording script runs them.
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const minorOf = (v) => (/(\d+\.\d+)/.exec(v ?? '') ?? [])[1] ?? 'unknown';
const majorOfNode = (v) => (/^v?(\d+)\./.exec(v ?? '') ?? [])[1] ?? 'unknown';
const isBrowser = (id) => /^pyodide-(chromium|firefox|webkit)$/.test(id);

/** Where each configuration ran, read from the configurations themselves. */
export function whereNote(configs) {
  const by = Object.fromEntries(configs.map((c) => [c.id, c]));
  const browsers = configs.filter((c) => isBrowser(c.id)).map((c) => c.id);
  const parts = [];
  if (by.native) parts.push(`native is the host under uv (CPython ${minorOf(by.native.environment?.python)}, the wheel ${PINS.wheelNative} from PyPI, no container)`);
  if (by['cli-native']) parts.push(`cli-native is the z3 command line that the wheel ${PINS.wheelNative} installs, on the host under uv`);
  if (by['api-native']) parts.push(`api-native is the Python API of the same wheel, on the host under uv (CPython ${minorOf(by['api-native'].environment?.python)})`);
  if (by['pyodide-node']) {
    const e = by['pyodide-node'].environment ?? {};
    parts.push(`pyodide-node is Pyodide ${e.pyodide} with the z3_solver 5.3.1.0 pyemscripten wheel under Node ${majorOfNode(e.node)} on the host (CPython ${minorOf(e.python)} inside Pyodide)`);
  }
  if (browsers.length) parts.push(`the ${list(browsers)} configurations are the same engine in a module worker of each browser inside the pinned Playwright container (desktop builds, headless, not phones)`);
  if (by['int-twin-original']) parts.push('int-twin-original is research/evidence/a2r3/scripts/z3_negamt.py run as it is (its byte-identical copy original/z3_negamt.py), on the host under uv as native is');
  if (by[lib.CVC5_CONFIG]) parts.push(`${lib.CVC5_CONFIG} is cvc5 ${by[lib.CVC5_CONFIG].version}, the Bench binary, in the Bench image with the network off`);
  return `Where each configuration ran: ${configs.map((c) => c.id).join(', ')}. ${parts.join('; ')}.`;
}

/** What values.queries.<query> (values.files.<name> for the tour) holds, in this record. */
export function shapeNote(run, values) {
  if (run.tour) {
    const count = Object.keys(values.files).length;
    const ran = values.cvc5?.files_checked;
    return `Recorded by W1-T12. values.files.<name> holds each tour file's verdict, the first line the interpreter printed; its reason_unknown, error or model where the interpreter printed one, and for a file with a model whether every configuration's model for it replayed (witness_replays); the command line's exit code (command_line_exit_code); and the verdict of each configuration that ran the file (engines${ran !== undefined ? `; cvc5 ran ${ran} of the ${count}` : ''}). Cite one as {{run:${run.id}#values.files.<name>.verdict}}. ${count} files in all.`;
  }
  const entries = Object.entries(values.queries);
  const none = entries.filter(([, q]) => q.smt2_sha256 === null).map(([k]) => k);
  const signed = entries.some(([, q]) => q.witness_signed !== undefined);
  const cvc5Ran = entries.filter(([, q]) => Object.hasOwn(q.engines, lib.CVC5_CONFIG)).length;
  return `Recorded by W1-T12. values.queries.<query> holds each query's verdict and rlimit; for a sat query, its witness (the primary configuration's model, as strings${signed ? '; witness_signed reads its bit-vector values as signed integers' : ''}), the text of the primary configuration's replay (replay) and whether every configuration's model for it replayed (witness_replays); its unsat_core or minimum where it has one; the SHA-256 of its SMT-LIB export${none.length ? ` (null for the ${none.length} ${none.length === 1 ? 'query' : 'queries'} without one: ${list(none)})` : ''}; and the verdict of each configuration that ran it (engines${values.cvc5 ? `, cvc5's on the ${cvc5Ran} queries it ran` : ''}). Cite one as {{run:${run.id}#values.queries.<name>.verdict}}. ${entries.length} queries in all.`;
}

/** How witnesses are checked, and, from the values, whether and where the models differed. */
export function witnessNote(run, configs, values) {
  const [one, many] = run.tour ? ['file', 'files'] : ['query', 'queries'];
  const entries = Object.entries(run.tour ? values.files : values.queries);
  const hasCvc5 = configs.some((c) => c.id === lib.CVC5_CONFIG);
  const gave = `${list(values.engines)}${hasCvc5 ? `; ${lib.CVC5_CONFIG} gives verdicts only` : ''}`;
  const how = run.tour
    ? `the model each configuration gave (${gave}) is replayed in BigInt by the recording script (replayStarter in lib.mjs)`
    : `every sat query's model is replayed in plain Python integers by the script itself, in each configuration that gave one (${gave})`;
  const parts = [`Witnesses are recorded by property and never compared by value across engines [X RUN-z3-bv64-pyodide]: ${run.tour ? `for every sat file, ${how}` : how}, and the check is that every one of them replays.`];
  if (values.int_twin_original) parts.push("int-twin-original's witness is replayed in BigInt by the recording script (values.int_twin_original.witness_replays).");
  const differ = entries.filter(([, q]) => q.witnesses_differ_across_engines);
  if (!differ.length) {
    parts.push(`In this run the configurations in values.engines returned the same model for every sat ${one}, which is a fact about this run and no promise.`);
    return parts.join(' ');
  }
  const primaryModel = (q) => (run.tour ? q.model : q.witness);
  const off = [...new Set(differ.flatMap(([, q]) => Object.entries(q.witnesses_by_engine ?? {}).filter(([, m]) => !lib.sameModel(m, primaryModel(q))).map(([id]) => id)))];
  const replay = differ.every(([, q]) => q.witness_replays === true);
  const agree = differ.every(([, q]) => q.engines_agree === true);
  parts.push(`The models differed between configurations on ${differ.length} sat ${differ.length === 1 ? one : many} (${differ.map(([k]) => k).join(', ')}; each lists every configuration's model under witnesses_by_engine)${replay ? ', every model replaying' : ''}${agree ? `, with the same verdicts${run.tour ? '' : ' and exports'} in every configuration` : ''}; the models that differ from the primary configuration's are those of ${list(off)}.`);
  parts.push(off.length && off.every(isBrowser)
    ? `Each browser's worker ran the ${Z3_RUNS.length} Z3 scripts of runs/inputs/S1 one after another in one Pyodide instance, as INS-z3 will serve requests, while the other configurations started a fresh engine for each script; a model can depend on what the instance solved before it. That is the likely reason, and this record does not establish it.`
    : 'This record does not establish why the models differ.');
  return parts.join(' ');
}

/** The rlimit and the exports, from the values: never an export for a query that has none. */
export function exportNote(configs, values) {
  const entries = Object.entries(values.queries);
  const exported = entries.filter(([, q]) => q.smt2_sha256 !== null);
  const none = entries.filter(([, q]) => q.smt2_sha256 === null).map(([k]) => k);
  const rawDiffer = exported.filter(([, q]) => q.smt2_raw_sha256_by_engine).length;
  const limits = [...new Set(entries.map(([, q]) => q.rlimit))];
  const twin = configs.some((c) => c.id === 'int-twin-original');
  const budget = limits.length === 1 && limits[0] === RLIMIT ? `Every query ran with rlimit ${RLIMIT} (spine section 9.1; values.queries.<query>.rlimit)` : `The queries ran with rlimit ${limits.join(' or ')} (values.queries.<query>.rlimit)`;
  return [
    `${budget}${twin ? '; z3_negamt.py, which int-twin-original runs as it is, sets none' : ''}.`,
    `The SMT-LIB exports are Z3's to_smt2() text with its let names (?x60, $x34) renamed in order of appearance, because Z3 names them after AST ids and the ids are not the same in every process: ${values.raw_exports_identical ? 'in this record the raw text of every export happened to be identical in every Z3 configuration' : `the raw text differed between Z3 configurations on ${rawDiffer} of the ${exported.length} queries that have an export (smt2_raw_sha256_by_engine)`}.`,
    values.exports_identical
      ? `The renamed text is the same in every Z3 configuration, and its SHA-256 is values.queries.<query>.smt2_sha256${none.length ? ` (null for ${list(none)}, which ${none.length === 1 ? 'has' : 'have'} no export)` : ''}.`
      : "The renamed text is not the same in every Z3 configuration (the check exports-identical names the queries), and values.queries.<query>.smt2_sha256 is the primary configuration's.",
  ].join(' ');
}

/** The granularity of the browsers' "ms" figures, from their logs (lib.msGranularity). */
export function clockSentence(run, logs, browserIds) {
  const [one, many, what] = run.tour ? ['file', 'files', "file's evaluation"] : ['query', 'queries', "query's solver call"];
  const g = browserIds.map((id) => ({ id, ...lib.msGranularity(logs[id] ?? '') })).filter((x) => x.kind !== null);
  if (!g.length) return '';
  const words = { whole: 'whole milliseconds', tenths: 'multiples of 0.1 ms', finer: 'figures finer than 0.1 ms' };
  const said = ['whole', 'tenths', 'finer'].map((k) => [k, g.filter((x) => x.kind === k).map((x) => x.id)]).filter(([, ids]) => ids.length).map(([k, ids]) => `${list(ids)} gave ${words[k]}`);
  const counts = new Set(g.map((x) => `${x.with_ms}/${x.lines}`));
  const { with_ms: n, lines: total } = g[0];
  const on = counts.size > 1 ? `on every ${one} that carries one` : n === total ? `on all ${total} ${total === 1 ? one : many}` : `on the ${n} of its ${total} ${many} that carry one`;
  const coarse = g.some((x) => x.kind !== 'finer');
  return `The ms figure on an @@ line is the script's own measurement of that ${what}, rounded to hundredths of a millisecond; in this record's browser logs ${said.join(', and ')}, ${on}${coarse ? ', so a browser figure of a few milliseconds is a rough one' : ''}.`;
}

/**
 * What started_at, duration_s, the browsers' two spans and harness_timeout_s measure. A browser configuration is
 * one docker run in which one browser session ran every Z3 script in turn: its started_at is the session's start,
 * its duration_s the one script's time, and its environment holds the session's span and the docker run's apart.
 */
export function timingNote(run, configs, logs, together) {
  const ids = configs.map((c) => c.id);
  const browserIds = ids.filter(isBrowser);
  const own = ids.filter((id) => !browserIds.includes(id));
  const out = [`started_at and duration_s of a configuration that ran its own command (${list(own)}) are when that command started and how long it took, start-up included.`];
  if (browserIds.length) {
    const sharedBy = together.length === Z3_RUNS.length ? `the ${Z3_RUNS.length} Z3 records of runs/inputs/S1` : `the Z3 records made in the same recording (${together.join(', ')})`;
    out.push(`Each browser configuration (${list(browserIds)}) comes from one docker run, in which one browser session ran every Z3 script of runs/inputs/S1 in turn; that session is shared by ${sharedBy}, and the configuration's argv and exit_code are its docker run's.`);
    out.push("A browser configuration's started_at is when its session began, after the browser had launched and before its page opened, and its duration_s is this script's own time in the worker, measured around the call without the engine's start-up and rounded to whole milliseconds by the harness.");
    out.push("Its environment holds two spans that cover every script: session_wall_ms, from started_at to when the last script had finished (the page's and the engine's load and every script, not the browser's close), and docker_run_wall_ms, the docker run from docker_run_started_at, when the recording script started it, to its exit (adding the container's start and the launch of Node and the browser before started_at, and the browser's close and the output's chown after the last script).");
  }
  out.push(`budget.harness_timeout_s is the wall time after which the recording script would have stopped a configuration's command${browserIds.length ? ' (for a browser configuration, the docker run)' : ''}.`);
  const clock = clockSentence(run, logs, browserIds);
  if (clock) out.push(clock);
  return out.join(' ');
}

/** Which queries cvc5 ran, and how each query without an SMT-LIB export is checked instead (lib.PLAIN_CHECKS). */
export function cvc5Note(run, values) {
  if (!values.cvc5) return 'cvc5 did not run.';
  const limit = `each file under a ${CVC5_FILE_TIMEOUT_S} s limit (budget.per_file_timeout_s)`;
  if (run.tour) return `${values.cvc5.version} ran ${values.cvc5.files_checked} of the ${Object.keys(values.files).length} files, ${limit}: the starter and its guarded form. The checks require its verdict to equal Z3's on each one it ran (values.cvc5, and engines in each entry).`;
  const count = Object.keys(values.queries).length;
  const ran = values.cvc5.queries_checked;
  const without = Object.entries(values.queries).filter(([, q]) => q.smt2_sha256 === null && (q.verdict === 'sat' || q.verdict === 'unsat'));
  const by = (k) => lib.PLAIN_CHECKS[run.id]?.[k]?.checked_by ?? 'no plain query';
  const optimize = without.filter(([, q]) => q.minimum !== undefined).map(([k]) => k);
  const cores = without.filter(([, q]) => q.unsat_core !== undefined).map(([k]) => k);
  const parts = [`${values.cvc5.version} ran ${ran} of the ${count} queries, ${limit}: every sat or unsat query that has an SMT-LIB export, as that text${ran === count ? ', which here is every query' : ''}.`];
  if (optimize.length) parts.push(`The ${optimize.length} Optimize ${optimize.length === 1 ? 'answer has' : 'answers have'} no export, and each is checked by a plain query that cvc5 ran and that asks for anything below the minimum (${optimize.map((k) => `${k} by ${by(k)}`).join(', ')}).`);
  if (cores.length) parts.push(`The ${cores.length} unsat ${cores.length === 1 ? 'core has' : 'cores have'} no export (the script's core() writes none), and the premise set of each is a premises query that cvc5 ran (${cores.map((k) => `${k}'s is ${by(k)}`).join(', ')}).`);
  parts.push(`The checks require its verdict to equal Z3's on each one it ran (values.cvc5, and engines in each entry)${without.length ? ", and the plain query named for each query without an export to be unsat (checked_by in that query's check)" : ''}.`);
  return parts.join(' ');
}

/** Where argv's relative paths point, for the configurations that ran on the host. */
export function argvNote(run, configs) {
  const host = configs.filter((c) => c.image === null).map((c) => c.id);
  const node = host.includes('pyodide-node') ? 'pyodide-node.mjs is named by its path from the repository root, and ' : '';
  return `In ${list(host)}, which ran on the host, argv's paths to the script${run.tour ? ' and to the tour files' : ''} are relative to a scratch folder that held copies of the configuration's inputs from runs/inputs/S1/${run.id}/ at the same relative paths, and the command ran in that folder; ${node}the <sandbox> paths are placeholders (next note).`;
}

/** The tour's interpreter note, from its logs: whether the API configurations printed the command line's text. */
export function tourNote(values, logs) {
  const ids = Object.keys(logs);
  const apiIds = ids.slice(1);
  const diffs = lib.tourTextDiffs(logs);
  const errors = Object.entries(values.files).filter(([, f]) => f.error !== undefined).map(([k]) => k);
  const raised = errors.filter((file) => apiIds.every((id) => lib.atRecords(logs[id]).find((r) => r.q === file)?.error === true));
  const codes = [...new Set(errors.map((k) => values.files[k].command_line_exit_code))];
  const parts = [`The Z3 command line is bin/z3 from the z3-solver wheel (hashed as ${ids[0]}'s binary_sha256); the API configurations (${list(apiIds)}) call Z3_eval_smtlib2_string, the API entry to Z3's SMT-LIB command interpreter, in a fresh Context per file, and ${diffs.length ? `printed text that differs from the command line's on ${diffs.map((d) => `${d.file} in ${d.config}`).join(', ')}` : 'printed the same text as the command line on every file'}.`];
  parts.push("The API configurations print the interpreter's output as it returns it, and each log is the output as printed, except that the recording script would replace a host path in it with a placeholder.");
  if (errors.length) {
    const how = raised.length === errors.length ? 'an interpreter error raised an exception under the API whose message carries the output so far (error is true on its @@ line in every API configuration), and the script printed that output' : "the API reported an interpreter error (each API configuration's @@ line for the file says how)";
    const same = diffs.every((d) => !errors.includes(d.file));
    parts.push(`On ${list(errors)} ${how}; the command line ${same ? 'printed the same text and ' : ''}exited ${codes.join(' or ')} (values.files.<name>.command_line_exit_code).`);
  }
  return parts.join(' ');
}

const PLACEHOLDERS = "Placeholders in argv: <sandbox>/engines is a scratch directory with Pyodide's npm package unpacked in pyodide/ and the Z3 wheel, both fetched and checked against their published digests (the inputs list them); <sandbox>/out is the browser container's output directory; <sandbox>/smt2 is a scratch copy of the SMT-LIB files the cvc5 configuration reads (the inputs list them). Repository paths are relative to the repository root.";

/**
 * The notes of a Z3 record, in a fixed order (notes[0] says how to cite the record; argvNote's "next note" is
 * PLACEHOLDERS). Everything before `extra` is worked out from `configs`, `values` and `logs` (the Z3 configurations'
 * logs, the primary's first), so `record.mjs check` builds it again from the committed record and its logs and
 * compares. `together` is the Z3 records whose browser configurations share one session.
 */
export function z3Notes(run, configs, values, logs, extra = [], together = Z3_RUNS.filter((r) => wanted(r.id)).map((r) => r.id)) {
  return [
    shapeNote(run, values),
    whereNote(configs),
    witnessNote(run, configs, values),
    ...(run.tour ? [] : [exportNote(configs, values)]),
    timingNote(run, configs, logs, together),
    cvc5Note(run, values),
    argvNote(run, configs),
    PLACEHOLDERS,
    ...(run.tour ? [tourNote(values, logs)] : []),
    ...extra,
  ];
}

// ----------------------------------------------------------------------------------------- the Z3 runs
async function recordZ3(run, enginesInfo, browsers) {
  fs.rmSync(runDir(run.id), { recursive: true, force: true });
  const nat = run.tour ? runNativeCli(run) : runNative(run);
  const configs = [nat.config];
  const logs = { [nat.config.id]: nat.log };
  if (run.tour) {
    // the same files through the Z3Py interpreter, natively: the call Pyodide makes
    const api = runNative(run, { configId: 'api-native', logName: 'api-native.log', purpose: 'the same files through the Z3Py interpreter, Z3_eval_smtlib2_string, natively: the call Pyodide makes' });
    configs.push(api.config);
    logs['api-native'] = api.log;
  }
  const pn = runPyodideNode(run, enginesInfo);
  configs.push(pn.config);
  logs['pyodide-node'] = pn.log;
  if (browsers) {
    for (const b of BROWSERS) {
      const bc = browserConfig(run, b, browsers[b], enginesInfo);
      configs.push(bc.config);
      logs[`pyodide-${b}`] = bc.log;
    }
  }
  let twin = null;
  if (run.original) twin = runOriginal(run, logs, configs);
  const cvc5 = runCvc5(run, run.tour ? null : nat);
  configs.push(cvc5.config);
  const derived = run.tour ? lib.deriveTour(logs, cvc5.log) : lib.deriveZ3(run.id, { ...logs, ...(twin ? { 'int-twin-original': twin.log } : {}) }, cvc5.log);
  const n = probeNative();
  const twinLines = twin ? twin.log.split('\n').filter((l) => l !== '').length : 0;
  const notes = z3Notes(run, configs, derived.values, logs, [
    ...(run.tour ? [
      'cvc5 runs only the starter and its guarded form. The other three files test Z3\'s own interpreter and its reasons for unknown: `unknown_theory` and `unknown_canceled` are the two unknown rows of D-13\'s table as SMT-LIB text, and `starter_guarded_get_model` is the starter with the guard added and `(get-model)` kept, which is what a learner who edits the page\'s text gets; it is not on the page.',
    ] : []),
    ...(run.original ? [`The configuration int-twin-original runs research/evidence/a2r3/scripts/z3_negamt.py, whose output was never committed (spine section 9.5), byte-identical to runs/inputs/S1/RUN-z3-bv64-negamt/original/z3_negamt.py; it printed ${twinLines === 1 ? 'one line' : `${twinLines} lines`}.`] : []),
    ...(run.id === 'RUN-z3-vacuous-unsat' ? ['MAX_TRANSFER is a Python constant of the encoding, the config\'s default, so the contradictory premises are amount > 0 and amount <= 0 and the unsat core has two members. "range" is the premise set a >= 0, b >= 0, amount > 0, amount <= MAX_TRANSFER; "guarded" adds the sufficient-funds guard amount <= a. The unsat cores come from assert_and_track with core.minimize, and each core is checked: alone it is unsat, and dropping any member leaves it sat. core() writes no SMT-LIB export, so smt2_sha256 is null for max0_range_core and max0_guarded_core; each tracks the same formulas as the premises query of its scenario (max0_range_premises, max0_guarded_premises), whose export cvc5 ran to unsat. The core\'s members, and its minimality, are checked by Z3 in each configuration, not by cvc5.'] : []),
    ...(run.id === 'RUN-z3-double-capture' ? ['Optimize (minimize_hold, minimize_pool_patched) answers are checked by a plain query that cvc5 also runs (no_smaller_hold, no_smaller_pool_patched), which asks for anything below the minimum: h < 1 and held < 2. Optimize has no SMT-LIB export, so smt2_sha256 is null for those two. no_smaller_hold is unsat by the premise h > 0 alone, h being an integer; no_smaller_pool_patched depends on the patch, which needs held >= h before each capture, so that held starts at 2h or more, which is at least 2.'] : []),
    ...(run.id === 'RUN-z3-refund-mint' ? ['Optimize (minimize_minted, minimize_minted_patch_exact) answers are checked by a plain query that cvc5 also runs (no_smaller_mint, no_smaller_mint_patch_exact), which asks for a mint below the minimum: minted < 1 and minted < 2. Optimize has no SMT-LIB export, so smt2_sha256 is null for those two. no_smaller_mint is unsat over the integers whatever the rule, since no integer lies strictly between 0 and 1; no_smaller_mint_patch_exact depends on the patch, which rejects r = m + 1, the one refund the clamp turns into a mint of 1. The two patches are written without reference to any model: one rejects a refund when the merchant has nothing, the other rejects r = m + 1, the smallest overdrawing refund.'] : []),
    ...(run.id === 'RUN-z3-btc2010' ? ['A toy model, not Bitcoin\'s code, and nothing here checks it against Bitcoin. MAX_MONEY is 21 million coins of 100,000,000 units each, the bound that S1\'s specimen table (SP-1.9, [btc2010, V]) gives for the 2010 fix.'] : []),
    ...(run.id === 'RUN-z3-bloch06' ? ['A toy model of the midpoint line in Java: int is signed 32-bit, / is signed division truncating toward zero, and LShR is Java\'s >>>. The line and its cures are the ones S1\'s specimen table (SP-1.10, [bloch06, V]) cites; nothing here checks them against Bloch\'s text.'] : []),
  ]);
  const unrecorded = [{ field: 'image', reason: 'the primary configuration ran on the host under uv, in no container; the container configurations name their images' }];
  const record = assemble({
    id: run.id,
    primary: nat.config.id,
    configs,
    values: derived.values,
    checks: derived.checks,
    notes,
    unrecorded,
    environment: hostEnv({ python: `CPython ${n.python}`, uv: n.uv, containers: { playwright: imageRef(IMAGES.playwright), bench: imageRef(IMAGES.bench) } }),
    extra: { binary: run.tour ? `bin/z3, the command-line executable installed by the z3-solver 5.3.1.0 wheel (${PINS.wheelNative}); the API configurations use libz3.so from the same wheel (sha256 ${n.libSha}); the Pyodide configurations use the pyemscripten wheel (sha256 ${enginesInfo.report.z3.sha256})` : `libz3.so from the z3-solver 5.3.1.0 wheel (${PINS.wheelNative}) installed by uv; the Pyodide configurations use the pyemscripten wheel (sha256 ${enginesInfo.report.z3.sha256})` },
  });
  return record;
}

function runOriginal(run, logs, configs) {
  const n = probeNative();
  const dir = stage(run.id, 'native-original', [run.original.script]);
  const name = path.basename(run.original.script);
  const argv = [...n.uvArgs, 'python', '-I', `original/${name}`];
  const r = exec(argv, { cwd: dir });
  const log = clean(r.stdout);
  const logPath = writeLog(run.id, 'int-twin-original.log', log);
  configs.push({
    id: 'int-twin-original',
    purpose: 'z3_negamt.py as it is on disk in research/, the Int twin whose output was never committed, run as it is under uv (it sets no rlimit)',
    origin: 'recorded',
    engine: 'z3',
    version: n.printed,
    binary_sha256: n.libSha,
    image: null,
    started_at: r.started_at,
    duration_s: r.duration_s,
    argv,
    inputs: [inputFile(`runs/inputs/S1/${run.id}/${run.original.script}`, 'script'), inputFile(run.original.research, 'script (the original, same bytes)'), n.wheelInput],
    budget: { harness_timeout_s: HARNESS_TIMEOUT_S },
    exit_code: r.code,
    verdict_lines: lib.humanLines(log),
    outputs: [logPath],
    environment: { python: `CPython ${n.python}`, uv: n.uv },
  });
  return { log };
}

// ------------------------------------------------------------------------------------------- PostgreSQL
function recordPg() {
  const id = 'RUN-pg-numeric-bound';
  fs.rmSync(runDir(id), { recursive: true, force: true });
  const image = imageRef(IMAGES.postgres);
  const dir = stage(id, 'pg', ['numeric_bound.sql']);
  const name = 'w1t12-pg';
  spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8' });
  const startArgv = ['docker', 'run', '-d', '--name', name, '--memory=6g', '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-v', `${dir}:/q:ro`, image];
  const startShown = recordArgv(startArgv, [[dir, '<sandbox>/pg']]);
  try {
    must(exec(startArgv), 'starting postgres');
    let ready = false;
    for (let i = 0; i < 120 && !ready; i += 1) {
      const logs = spawnSync('docker', ['logs', name], { encoding: 'utf8' });
      const text = `${logs.stdout}${logs.stderr}`;
      if (/PostgreSQL init process complete/.test(text) && spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' }).status === 0 && (text.match(/database system is ready to accept connections/g) ?? []).length >= 2) ready = true;
      else spawnSync('sleep', ['0.5']);
    }
    if (!ready) throw new Error('postgres did not become ready');
    // `docker exec` without a terminal carries the container's stdout and stderr as two streams, and its CLI
    // prints them in no fixed order, so psql's ERROR lines would land anywhere in the log. The merge is done
    // inside the container, by `2>&1`, where psql's writes to the two streams reach one pipe in the order psql
    // made them.
    const psqlArgv = ['docker', 'exec', name, 'sh', '-c', 'psql -X -q -U postgres -f /q/numeric_bound.sql 2>&1'];
    const r = exec(psqlArgv);
    if (r.stderr !== '') throw new Error(`docker exec printed to stderr, so the log would lack lines: ${clean(r.stderr).split('\n').slice(0, 3).join(' | ')}`);
    const log = clean(r.stdout);
    const logPath = writeLog(id, 'postgres-18.log', log);
    const bin = must(exec(['docker', 'exec', name, 'sh', '-c', 'sha256sum "$(which postgres)"; postgres --version']), 'the postgres probe');
    const [shaLine, versionLine] = bin.stdout.trim().split('\n');
    const derived = lib.derivePg(log);
    const versionString = lib.parsePg(log).version;
    const imageDigest = image;
    const sqlPath = `runs/inputs/S1/${id}/numeric_bound.sql`;
    const cfg = {
      id: 'postgres-18',
      purpose: 'the script in one psql session against a PostgreSQL 18.6 server, autocommit; the primary configuration',
      origin: 'recorded',
      engine: 'postgresql',
      version: (/^PostgreSQL (\S+)/.exec(versionString ?? '') ?? [])[1] ?? null,
      version_string: versionString,
      binary_sha256: shaLine.split(' ')[0],
      image: imageDigest,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv: [],
      inputs: [inputFile(sqlPath, 'script')],
      budget: { container_memory: '6g', network: 'none', harness_timeout_s: HARNESS_TIMEOUT_S },
      exit_code: r.code,
      verdict_lines: log.split('\n').filter((l) => l !== ''),
      outputs: [logPath],
      environment: { server_binary: versionLine.trim(), container_image: imageDigest },
    };
    const record = assemble({
      id,
      primary: 'postgres-18',
      configs: [{ ...cfg, argv: psqlArgv, commands: [startShown, psqlArgv, ['docker', 'rm', '-f', name]] }],
      values: derived.values,
      checks: derived.checks,
      notes: [
        'Recorded by W1-T12. values.cases.<case> holds, for each of the four cases, the statement, the error psql printed (null when the statement committed), the SQLSTATE the script echoed after a failed statement, the DETAIL line, and the balance after. Cite one as {{run:RUN-pg-numeric-bound#values.cases.<case>.sqlstate}}. Balances are strings: they exceed the integers JSON readers keep exact.',
        `The server ran in ${image} (the digest RUN-scaffold pins) with --network none and --memory=6g and trust authentication, and was removed when the script finished. argv lists the three commands in order: the server's start, psql through docker exec and sh, and the removal; the exit code is psql's. Between the start and psql the recorder waited until docker logs ${name} showed "PostgreSQL init process complete" and "database system is ready to accept connections" at least twice (the image's entrypoint first runs a temporary server for its initialization, which prints the first of them) and docker exec ${name} pg_isready -U postgres exited 0, polling at most 120 times with a 0.5 s pause between polls; a psql started straight after the start finds no server socket and exits 2. psql's stdout and stderr were merged inside the container by 2>&1, so the log's lines are in the order psql wrote them (docker exec without a terminal carries the two streams apart, and its CLI prints them in no fixed order); the check psql-order fails a log in which an ERROR line comes after the sqlstate or balance echo that follows its statement.`,
        'Each case credits 1 at the edge of a type, S6.L4\'s boundary command: bigint at its largest value raises 22003 "bigint out of range" and keeps its balance [X RUN-pg-claims]; numeric(19,0) holds the same balance and the next one (its bound is 10^19, not bigint\'s); at 9999999999999999999 it raises 22003 "numeric field overflow" and keeps its balance; an unbounded numeric commits. The bound a column raises on is the one declared in its type.',
        'LAST_ERROR_SQLSTATE keeps its value after a later success in psql, so the script echoes it only after a statement that failed.',
        'Placeholder in argv: <sandbox>/pg is a scratch copy of numeric_bound.sql (the input lists it).',
        `budget.harness_timeout_s is the wall time after which the recording script would have stopped each of the three commands in argv (${HARNESS_TIMEOUT_S} s); started_at and duration_s are those of the psql command, the second.`,
        'The script ran on the PostgreSQL server of the Bench\'s service container image only. PGlite, the tab\'s engine, was not run on it: S1\'s six-row table is prose, and S6.L4 can add a PGlite configuration to this run if its cell shows remedy 3 in the tab.',
      ],
      environment: hostEnv({ container: { runtime: 'docker', image: imageDigest, network: 'none' } }),
      extra: { binary: `postgres, the server binary of ${image}`, argv: [startShown, psqlArgv, ['docker', 'rm', '-f', name]] },
    });
    return record;
  } finally {
    spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8' });
  }
}

// ----------------------------------------------------------------------------------------------- Rust
function recordRust() {
  const id = 'RUN-rust-i64';
  fs.rmSync(runDir(id), { recursive: true, force: true });
  const image = imageRef(IMAGES.bench);
  const dir = path.join(WORK, 'rust', id);
  mkdir(dir, 'src');
  posixCopy(path.join(INPUTS, id, 'ovf', 'Cargo.toml'), path.join(dir, 'Cargo.toml'));
  posixCopy(path.join(INPUTS, id, 'ovf', 'src', 'main.rs'), path.join(dir, 'src', 'main.rs'));
  posixCopy(path.join(INPUTS, id, 'rust_i64.sh'), path.join(dir, 'rust_i64.sh'));
  fs.chmodSync(dir, 0o777);
  for (const sub of ['src']) fs.chmodSync(path.join(dir, sub), 0o777);
  const container = 'w1t12-rust';
  const argv = ['docker', 'run', '--rm', '--name', container, '--memory=6g', '--network', 'none', '-v', `${dir}:/w`, '-w', '/w', image, 'sh', 'rust_i64.sh'];
  spawnSync('docker', ['rm', '-f', container], { encoding: 'utf8' });
  const r = exec(argv);
  const log = clean(r.stdout);
  const logPath = writeLog(id, 'bench.log', log);
  const probe = must(exec(['docker', 'run', '--rm', '--memory=6g', '--network', 'none', image, 'sh', '-c', 'sha256sum "$(rustup which rustc)"; rustup which rustc']), 'the rustc probe');
  const [shaLine, whichLine] = probe.stdout.trim().split('\n');
  const derived = lib.deriveRust(log);
  const srcMain = path.join('runs', 'inputs', 'S1', id, 'ovf', 'src', 'main.rs');
  // The panic line carries the panicking thread's id, which for the main thread is the process id the container
  // gave the binary; the note quotes the id the log shows and says it is no part of the result.
  const threadId = (/thread 'main' \((\d+)\) panicked/.exec(log) ?? [])[1];
  const threadNote = threadId ? ` The log keeps the panic's thread id verbatim (${threadId} in this recording): it is the id of the main thread in the container's process numbering and not part of the result, and no check reads it.` : '';
  const cfg = {
    id: 'bench',
    purpose: 'the crate built and run in the Bench image, offline, in the dev and release profiles; the primary configuration',
    origin: 'recorded',
    engine: 'rustc',
    version: (/^rustc (\S+)/.exec(derived.values.rustc ?? '') ?? [])[1] ?? null,
    version_string: derived.values.rustc,
    binary_sha256: shaLine.split(' ')[0],
    image,
    started_at: r.started_at,
    duration_s: r.duration_s,
    argv: recordArgv(argv, [[dir, '<sandbox>/crate']]),
    inputs: [inputFile(rel(path.join(REPO, 'runs', 'inputs', 'S1', id, 'rust_i64.sh')), 'script'), inputFile(rel(path.join(REPO, srcMain)), 'source'), inputFile(`runs/inputs/S1/${id}/ovf/Cargo.toml`, 'manifest'), inputFile('research/evidence/a2r3/rust/src/main.rs', 'source (the original, same bytes)'), inputFile('research/evidence/a2r3/rust/Cargo.toml', 'manifest (the original, same bytes)')],
    budget: { container_memory: '6g', network: 'none', harness_timeout_s: HARNESS_TIMEOUT_S },
    exit_code: r.code,
    verdict_lines: log.split('\n').filter((l) => l !== '' && !/^\s*(Compiling|Running)/.test(l)),
    outputs: [logPath],
    environment: { container_image: image, rustc_path: whichLine.replace(/^.*toolchains\//, 'toolchains/'), user: 'the image\'s learner user, uid 1000' },
  };
  return assemble({
    id,
    primary: 'bench',
    configs: [cfg],
    values: derived.values,
    checks: derived.checks,
    notes: [
      'Recorded by W1-T12. values.debug and values.release hold what each binary did: debug.panicked and debug.panic_message (the dev profile\'s overflow check fired inside the source\'s catch_unwind), release.wrapped and release.b_plus_x (the release profile wrapped), and checked_add in both. Cite one as {{run:RUN-rust-i64#values.release.b_plus_x}}.',
      'The crate is byte-identical to research/evidence/a2r3/rust (spine section 9.5: its source existed and its output was never committed); `record.mjs check` compares the copies. The program catches its own panic, so both binaries exit 0: the debug build\'s panic is the message on stderr and the line "b + x panicked (overflow check)" on stdout.',
      'The two `Running` lines in the log show the exact rustc arguments: the dev profile (cargo\'s default) passes no -C opt-level, and the release profile passes -C opt-level=3. That the dev build checks overflow and the release build wraps is what the two binaries printed; the profile defaults that explain it are cargo\'s and rustc\'s documented ones [D].' + threadNote + ' The two `Finished` lines carry cargo\'s own elapsed time, which differs between runs of the same command, so a replay can differ from this log on those lines.',
      'stdout and stderr of each binary are printed in separate sections by rust_i64.sh, so the order of the two streams is never in question.',
      'Placeholder in argv: <sandbox>/crate is a scratch copy of the crate (Cargo.toml and src/main.rs) with rust_i64.sh beside it (the inputs list them); the container sees it as /w.',
      `budget.harness_timeout_s is the wall time after which the recording script would have stopped the docker run (${HARNESS_TIMEOUT_S} s); started_at and duration_s are that docker run's, the container's start and both builds included.`,
    ],
    environment: hostEnv({ container: { runtime: 'docker', image, network: 'none' } }),
    extra: { binary: 'rustc 1.96.0 from the Bench image\'s toolchain (the compiler that built both binaries)' },
  });
}

// --------------------------------------------------------------------------------------------- check
function check() {
  const ROOT = path.resolve(opt('--root') ?? REPO);
  const IN = path.join(ROOT, 'runs', 'inputs', 'S1');
  let bad = 0;
  const fail = (msg) => {
    bad += 1;
    console.log(`  FAIL  ${msg}`);
  };
  // 1. the sources
  const blocks = new Map();
  for (const run of Z3_RUNS) {
    if (run.tour) continue;
    const src = fs.readFileSync(path.join(IN, run.id, run.script), 'utf8');
    const block = lib.helperBlock(src);
    if (!block) fail(`${run.id}/${run.script} has no helper block`);
    else blocks.set(run.id, sha256(block));
  }
  if (new Set(blocks.values()).size > 1) fail(`the helper blocks differ: ${[...blocks].map(([k, v]) => `${k} ${v.slice(0, 8)}`).join(', ')}`);
  for (const [copy, orig] of [['RUN-z3-bv64-negamt/original/z3_negamt.py', 'research/evidence/a2r3/scripts/z3_negamt.py'], ['RUN-rust-i64/ovf/Cargo.toml', 'research/evidence/a2r3/rust/Cargo.toml'], ['RUN-rust-i64/ovf/src/main.rs', 'research/evidence/a2r3/rust/src/main.rs']]) {
    if (sha256File(path.join(IN, copy)) !== sha256File(path.join(ROOT, orig))) fail(`${copy} is not byte-identical to ${orig}`);
  }
  // 2. the records against their logs. The Z3 records whose browser configurations began their session at the
  // same moment were recorded together; their timing notes say so, and the notes are built again below.
  const sessionOf = (rec) => rec?.configs?.find((c) => isBrowser(c.id))?.started_at ?? null;
  const z3Records = Object.fromEntries(Z3_RUNS.map((r) => {
    const f = path.join(ROOT, 'runs', `${r.id}.json`);
    return [r.id, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null];
  }));
  const togetherOf = (id) => Z3_RUNS.map((r) => r.id).filter((other) => sessionOf(z3Records[other]) !== null && sessionOf(z3Records[other]) === sessionOf(z3Records[id]));
  for (const id of ALL_IDS) {
    const file = path.join(ROOT, 'runs', `${id}.json`);
    if (!fs.existsSync(file)) {
      fail(`runs/${id}.json is missing`);
      continue;
    }
    const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
    const read = (c) => fs.readFileSync(path.join(ROOT, c.outputs.find((o) => o.endsWith('.log'))), 'utf8');
    const byId = Object.fromEntries(rec.configs.map((c) => [c.id, c]));
    let derived;
    if (id === 'RUN-pg-numeric-bound') derived = lib.derivePg(read(byId['postgres-18']));
    else if (id === 'RUN-rust-i64') derived = lib.deriveRust(read(byId.bench));
    else {
      const zIds = rec.configs.map((c) => c.id).filter((c) => c !== lib.CVC5_CONFIG && c !== 'int-twin-original');
      const logs = Object.fromEntries(zIds.map((c) => [c, read(byId[c])]));
      if (byId['int-twin-original']) logs['int-twin-original'] = read(byId['int-twin-original']);
      const cvc = byId[lib.CVC5_CONFIG] ? read(byId[lib.CVC5_CONFIG]) : null;
      derived = id === 'RUN-z3-smtlib-tour' ? lib.deriveTour(logs, cvc) : lib.deriveZ3(id, logs, cvc);
      // every note sentence that states a fact about the recording, built again from this record's own
      // configurations, values and logs: a note that says what the data do not is a failure, like a wrong value
      const z3Logs = Object.fromEntries(zIds.map((c) => [c, logs[c]]));
      const want = z3Notes(Z3_RUNS.find((r) => r.id === id), rec.configs, rec.values, z3Logs, [], togetherOf(id));
      want.forEach((text, i) => {
        if ((rec.notes ?? [])[i] !== text) fail(`${id}: notes[${i}] is not what its configurations, values and logs say`);
      });
      // the two spans the timing note explains are there, and the session lies inside its docker run (one clock,
      // the host's; 2 ms of slack for the rounding of the two millisecond figures)
      for (const c of rec.configs.filter((x) => isBrowser(x.id))) {
        const e = c.environment ?? {};
        const dockerStart = Date.parse(e.docker_run_started_at ?? '');
        const sessionStart = Date.parse(c.started_at ?? '');
        if (![e.session_wall_ms, e.docker_run_wall_ms, dockerStart, sessionStart].every((v) => typeof v === 'number' && Number.isFinite(v))) fail(`${id}/${c.id}: the environment lacks the session's or the docker run's span, which the timing note explains`);
        else if (dockerStart > sessionStart || sessionStart + e.session_wall_ms > dockerStart + e.docker_run_wall_ms + 2) fail(`${id}/${c.id}: the session's span does not lie inside the docker run's`);
      }
    }
    if (JSON.stringify(derived.values) !== JSON.stringify(rec.values)) fail(`${id}: values are not what its logs say`);
    if (JSON.stringify(derived.checks) !== JSON.stringify(rec.checks)) fail(`${id}: checks are not what its logs say`);
    if (rec.pass !== rec.checks.every((c) => c.pass)) fail(`${id}: pass does not follow the checks`);
    for (const c of rec.configs) {
      if (id === 'RUN-rust-i64' || id === 'RUN-pg-numeric-bound') continue;
      if (JSON.stringify(c.verdict_lines) !== JSON.stringify(lib.humanLines(read(c)))) fail(`${id}/${c.id}: verdict_lines are not the log's lines`);
    }
    // the committed SMT-LIB exports are the texts the logs hash, and cvc5 was given exactly the sat and unsat ones
    if (rec.values.queries) {
      const exported = fs.existsSync(path.join(ROOT, 'runs', id, 'smt2')) ? fs.readdirSync(path.join(ROOT, 'runs', id, 'smt2')).map((f) => f.replace(/\.smt2$/, '')).sort() : [];
      const withExport = Object.entries(rec.values.queries).filter(([, q]) => q.smt2_sha256 !== null).map(([k]) => k).sort();
      if (JSON.stringify(exported) !== JSON.stringify(withExport)) fail(`${id}: runs/${id}/smt2 holds ${exported.length} exports, the queries name ${withExport.length}`);
      for (const [q, v] of Object.entries(rec.values.queries)) {
        if (v.smt2_sha256 !== null && fs.existsSync(path.join(ROOT, 'runs', id, 'smt2', `${q}.smt2`)) && sha256File(path.join(ROOT, 'runs', id, 'smt2', `${q}.smt2`)) !== v.smt2_sha256) fail(`${id}: smt2/${q}.smt2 is not the text its log hashes`);
      }
      const fed = Object.entries(rec.values.queries).filter(([, q]) => q.smt2_sha256 !== null && (q.verdict === 'sat' || q.verdict === 'unsat')).map(([k]) => k).sort();
      const cvc = byId[lib.CVC5_CONFIG] ? Object.keys(lib.cvc5Log(read(byId[lib.CVC5_CONFIG])).verdicts).sort() : [];
      if (JSON.stringify(fed) !== JSON.stringify(cvc)) fail(`${id}: cvc5 was not given exactly the sat and unsat exports`);
    }
    console.log(`  ${rec.pass ? 'ok  ' : 'FAIL'}  ${id}: ${rec.checks.filter((c) => c.pass).length} of ${rec.checks.length} checks, ${rec.configs.length} configurations`);
    if (!rec.pass) bad += 1;
  }
  console.log(bad === 0 ? 'W1-T12 check: PASS' : `W1-T12 check: FAIL (${bad})`);
  process.exit(bad === 0 ? 0 : 1);
}

// --------------------------------------------------------------------------------------------- record
async function record() {
  WORK = fs.mkdtempSync(path.join(scratchRoot, 'w1t12-'));
  const anyZ3 = Z3_RUNS.some((r) => wanted(r.id)); // the PostgreSQL and Rust runs need no Pyodide and no wheel
  const info = anyZ3 ? await engines() : null;
  const browsers = args.includes('--skip-browsers') || !anyZ3 ? null : runBrowsers(info);
  const failures = [];
  for (const run of Z3_RUNS) {
    if (!wanted(run.id)) continue;
    const rec = await recordZ3(run, info, browsers);
    const bad = rec.checks.filter((c) => !c.pass);
    console.log(`${run.id}: ${rec.checks.length - bad.length} of ${rec.checks.length} checks, ${rec.configs.length} configurations${bad.length ? ` FAILED ${bad.map((b) => `${b.id} (${b.detail})`).join('; ')}` : ''}`);
    if (bad.length) failures.push(run.id);
  }
  for (const [id, fn] of [['RUN-pg-numeric-bound', recordPg], ['RUN-rust-i64', recordRust]]) {
    if (!wanted(id)) continue;
    const rec = fn();
    const bad = rec.checks.filter((c) => !c.pass);
    console.log(`${id}: ${rec.checks.length - bad.length} of ${rec.checks.length} checks${bad.length ? ` FAILED ${bad.map((b) => b.id).join(', ')}` : ''}`);
    if (bad.length) failures.push(id);
  }
  fs.rmSync(WORK, { recursive: true, force: true });
  process.exit(failures.length ? 1 : 0);
}

// Run as a command; imported (by notes.test.mjs), the module only defines what it exports.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (mode === 'record') await record();
  else if (mode === 'check') check();
  else {
    console.error('usage: node scripts/spikes/W1-T12/record.mjs record [--only RUN-id,...] [--skip-browsers] | check');
    process.exit(2);
  }
}
